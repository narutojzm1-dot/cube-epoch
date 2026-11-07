import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve, enterPlay } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const baseline = "2dcb7cdbe4ff286731c6510202f09db39cd11418";
const out = join(ROOT, "evidence", "ui-review-2026-11-06", "altar-arrival");
const generic = "靠近工作台按 E 合成，靠近祭坛按 E 献祭。对着空田按 E 也能播种。";
const approach = "再靠近祭坛，才能献上方块之心";
const refused = "这次没献出：再靠近祭坛。";

export async function testAltarArrival(browser, origin, { before = false, capture = false, refusalRefresh = false } = {}) {
  const sourceBaseline = refusalRefresh ? "aab67feb0d08a999cfe6e849aa4bc4aad7eab31e" : baseline;
  const dir = refusalRefresh ? join(ROOT, "evidence", "ui-review-2026-11-06", "altar-refusal-refresh") : out;
  const legacyBefore = before && !refusalRefresh;
  const engine = browser.browserType().name(), version = before ? "before" : "after";
  const files = ["index.html", "style.css", "game.js"];
  const buffers = await Promise.all(files.map((f) => before
    ? execFileSync("git", ["show", `${sourceBaseline}:${f}`], { cwd: ROOT }) : readFile(join(ROOT, f))));
  const hash = createHash("sha256").update(Buffer.concat(buffers)).digest("hex");
  const build = { sha: before ? sourceBaseline : execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    dirty: !before && !!execFileSync("git", ["status", "--porcelain", "--", ...files], { encoding: "utf8" }).trim(),
    source_sha256: hash };
  const mf = join(dir, "screenshots.json"), vf = join(dir, "validation.json");
  const manifest = capture && existsSync(mf) ? JSON.parse(await readFile(mf, "utf8")) : { screenshots: [] };
  const records = [];
  for (const mode of [{ width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
    { width: 844, height: 390, touch: true }, { width: 1280, height: 800, touch: false }]) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, isMobile: mode.touch, hasTouch: mode.touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      if (before) await page.route("**/*", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const i = path === "/" ? 0 : files.findIndex((f) => path === "/" + f);
        if (i < 0) await route.continue();
        else await route.fulfill({ status: 200, body: buffers[i],
          contentType: ["text/html", "text/css", "application/javascript"][i] });
      });
      const session = engine === "chromium" && mode.touch ? await context.newCDPSession(page) : null;
      const inputLog = [];
      const interact = async () => {
        inputLog.push({ action: "interact", input: mode.touch ? "native UI tap" : "native E key", at: new Date().toISOString() });
        await (mode.touch ? page.locator("#touch-interact").tap() : page.keyboard.press("e"));
      };
      const read = () => page.evaluate(() => {
        const s = CUBE.getState(), p = s.player;
        return { day: s.day, nights: s.nights, time: s.time, cycle: s.cycle, nightLen: s.nightLen,
          distance: Math.hypot(p.x - s.altar.x, p.y - s.altar.y), x: p.x, y: p.y,
          inv: { ...s.inv }, win: s.win, over: s.over, canOffer: CUBE.canOffer(),
          target: CUBE.currentTarget(), objective: document.getElementById("objective").textContent,
          prompt: document.getElementById("prompt").textContent, toast: document.getElementById("toast").textContent,
          toastVisible: !document.getElementById("toast").classList.contains("hidden"),
          farmTile: s.tiles[8 * 48 + 24], held: document.querySelectorAll("#touch-controls .held").length,
          scroll: { x: scrollX, y: scrollY } };
      });
      const setup = async ({ distance = 24, day = true, nights = 3, heart = 1, dawn = false, farm = null } = {}) => {
        inputLog.length = 0;
        await page.goto(origin); await enterPlay(page, "knight");
        await page.evaluate(({ distance, day, nights, heart, dawn, farm }) => {
          const s = CUBE.getState(), p = s.player;
          s.flags.moved = s.flags.chopped = s.flags.gathered = s.flags.built = s.flags.crafted = true;
          for (const [x, y] of [[22, 20], [21, 21], [23, 21], [22, 22]]) {
            s.tiles[y * 48 + x] = 12; s.fenceHp.set(`${x},${y}`, 80);
          }
          s.build = null; s.inv.heart = heart;
          s.day = dawn ? false : day; s.nights = nights; s.time = 284;
          s.nightLen = 32; s.cycle = dawn ? s.nightLen - 0.1 : 0;
          s.wave = s.wavesTotal = 4; s.toSpawn = 0; s.enemies = [];
          p.x = s.altar.x; p.y = s.altar.y + distance; p.vx = p.vy = 0; p.dir = 0;
          if (farm !== null) { s.tiles[8 * 48 + 24] = 7; s.inv.seed = farm; }
        }, { distance, day, nights, heart, dawn, farm });
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      };
      const walkCloser = async () => {
        const r = await page.locator('[data-hold="ArrowUp"]').boundingBox();
        const input = session ? "native touchStart/end" : mode.touch ? "native mouse hold/release" : "native ArrowUp down/up";
        inputLog.push({ action: "move-start", input, rect: r, at: new Date().toISOString(), state: await read() });
        if (session) await session.send("Input.dispatchTouchEvent", { type: "touchStart",
          touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }] });
        else if (mode.touch) {
          await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down();
        } else await page.keyboard.down("ArrowUp");
        try { await page.waitForFunction(() => {
          const s = CUBE.getState(); return Math.hypot(s.player.x - s.altar.x, s.player.y - s.altar.y) < 22;
        }); } finally {
          if (session) await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          else if (mode.touch) { await page.mouse.move(1, 1); await page.mouse.up(); }
          else await page.keyboard.up("ArrowUp");
          inputLog.push({ action: "move-release", input, at: new Date().toISOString() });
        }
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      };
      const shot = async (id) => {
        if (!capture || !mode.touch || (refusalRefresh && id !== "arrived-ready")) return;
        const paused = await page.evaluate(() => CUBE.getState().paused);
        await page.evaluate(() => CUBE.getState().paused = true);
        try {
          const data = await read(), metrics = await inspect(page);
          assertFirstScreen(metrics, true);
          if (!before) for (const key of ["prompt", ...(id === "edge-pressed" ? ["toast"] : [])]) {
            assert.ok(metrics.rects[key].height > 0 && metrics.rects[key].bottom <= metrics.rects["notice-feed"].bottom + 0.5,
              "current approach/action feedback must fit wholly above core controls");
          }
          const filename = `${id}--${viewport.width}x${viewport.height}--${version}--${hash.slice(0, 8)}.png`;
          await mkdir(join(dir, "images"), { recursive: true });
          await page.screenshot({ path: join(dir, "images", filename), fullPage: false });
          manifest.screenshots = manifest.screenshots.filter((r) => !(r.screen_id === id
            && r.version === version && r.viewport.width === viewport.width));
          manifest.screenshots.push({ screen_id: id, state: `${id} / ${version}`, version, viewport,
            language: "zh-CN", build, platform: `Web / ${engine}`, ui_scale: "100%", device_scale_factor: 1,
            full_page: false, source: "explicit isolated third-dawn/altar-distance fixture, not natural three-night survival",
            input: session ? "native Chromium touchStart/end movement and UI taps" : "native WebKit mouse hold movement and mobile UI taps",
            relative_image_path: `images/${filename}`, issue_ids: [refusalRefresh ? "UI-024" : "UI-023"], status: "已截",
            visual_review: "待协调逐图审查", captured_at: new Date().toISOString(), data, metrics,
            repro_steps: ["隔离骑士新局；明示夹具：四面80血墙、心1、夜数3、夜长32/末0.1秒、完成波次/空敌、位置祭坛南24px、时间284",
              "引擎按原规则跨黎明，等待原天亮toast自然结束；读携带、目的地与当前位置提示",
              "真实点交互E（桌面按E），核对心未扣/未胜利及反馈",
              "原生向上按住/释放走到原22px以内，再读提示；真实交互扣一颗心并正常胜利",
              before ? `内存响应${sourceBaseline.slice(0, 7)}原Git字节，不切换/覆盖工作区` : "当前源码dirty；仅拍图冻结，不改用户存档"] });
          await writeFile(mf, JSON.stringify(manifest, null, 2) + "\n");
        } finally { await page.evaluate((v) => CUBE.getState().paused = v, paused); }
      };
      await setup({ dawn: true });
      await page.waitForFunction(() => CUBE.getState().day);
      const dawn = await read();
      assert.equal(dawn.nights, 3); assert.equal(dawn.inv.heart, 1);
      assert.equal(dawn.target.kind, "altar"); assert.ok(dawn.objective.includes("北边祭坛"));
      await page.waitForFunction(() => document.getElementById("toast").classList.contains("hidden"));
      const edge = await read(), action = mode.touch ? "点「交互 E」" : "按 E";
      assert.equal(edge.distance, 24); assert.equal(edge.prompt, legacyBefore ? `${action}献上方块之心` : approach);
      await shot("edge-ready");
      await interact();
      const rejected = await read();
      assert.equal(rejected.win, false); assert.deepEqual(rejected.inv, edge.inv);
      assert.equal(rejected.toast, legacyBefore ? generic : refused);
      assert.equal(rejected.toastVisible, true, "refusal must remain visible while outside the offer range");
      await shot("edge-pressed");
      await walkCloser();
      const arrived = await read();
      assert.equal(arrived.prompt, `${action}献上方块之心`); assert.equal(arrived.held, 0);
      assert.ok(arrived.time - rejected.time < 1, "immediate approach must not wait for the original2.2s toast expiry");
      if (!before || refusalRefresh) assert.equal(arrived.toastVisible, before,
        "only the obsolete approach refusal should disappear upon actual entry into range");
      assert.deepEqual(arrived.inv, edge.inv); assert.deepEqual(arrived.scroll, { x: 0, y: 0 });
      await shot("arrived-ready");
      await interact(); await page.waitForFunction(() => CUBE.getState().win);
      const offered = await read();
      assert.equal(offered.inv.heart, 0);
      assert.deepEqual(offered.inv, { ...edge.inv, heart: 0 });
      records.push({ screen_id: "dawn-arrival-input", viewport, dawn, edge, rejected, arrived, offered, input_log: [...inputLog] });

      for (const c of [{ id: "exact22", distance: 22 }, { id: "inside22", distance: 21.9 },
        { id: "outside-hint26", distance: 26 }, { id: "night", distance: 12, day: false },
        { id: "early", distance: 12, nights: 2 }, { id: "no-heart", distance: 12, heart: 0 },
        { id: "farm-priority", farm: 2 }, { id: "farm-empty", farm: 0 }, { id: "replacement-notice" }]) {
        await setup(c);
        const initial = await read();
        await interact();
        const actual = await read();
        assert.equal(actual.win, c.id === "inside22", `${c.id}: unchanged strict distance/day/night/heart gate`);
        if (c.id === "inside22") assert.deepEqual(actual.inv, { ...initial.inv, heart: 0 });
        else if (c.id === "farm-priority") {
          assert.equal(actual.farmTile, 8); assert.deepEqual(actual.inv, { ...initial.inv, seed: initial.inv.seed - 1 });
        } else assert.deepEqual(actual.inv, initial.inv);
        if (c.id === "exact22") {
          assert.equal(actual.toast, legacyBefore ? generic : refused);
          assert.equal(actual.toastVisible, true, "strict22 boundary must not clear a still-valid refusal");
        }
        if (c.id === "outside-hint26") assert.equal(actual.toast, generic);
        if (c.id === "night") assert.ok(actual.toast.includes("祭坛夜里封着"));
        if (c.id === "early") assert.ok(actual.toast.includes("还要再守 1 夜"));
        if (c.id === "no-heart") assert.ok(actual.toast.includes("先去工作台合成"));
        if (c.id === "farm-empty") assert.ok(actual.toast.includes("没有种子"));
        let continued = null;
        if (["farm-priority", "farm-empty", "replacement-notice"].includes(c.id)) {
          if (c.id === "replacement-notice") {
            assert.equal(actual.toast, legacyBefore ? generic : refused);
            assert.equal(actual.toastVisible, true);
            if (mode.touch) {
              await page.locator("#play-details summary").tap();
              await page.locator('.item[data-build="fence"]').tap();
              await page.waitForFunction(() => !document.getElementById("play-details").open);
            } else await page.keyboard.press("1");
            inputLog.push({ action: "select-fence", input: mode.touch ? "native UI taps" : "native1 key", at: new Date().toISOString() });
          }
          const notice = await read();
          assert.notEqual(notice.toast, refused);
          await walkCloser(); continued = await read();
          assert.equal(continued.toastVisible, true, "new construction/plant/no-seed notifications must survive entering range");
          assert.equal(continued.toast, notice.toast);
          assert.deepEqual(continued.inv, actual.inv);
        }
        records.push({ screen_id: c.id, viewport, initial, actual, continued, input_log: [...inputLog] });
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  if (capture) {
    const validation = existsSync(vf) ? JSON.parse(await readFile(vf, "utf8")) : {};
    validation[version] = records; await writeFile(vf, JSON.stringify(validation, null, 2) + "\n");
  }
  console.log(`ALTAR_ARRIVAL_OK ${engine} ${version} ${records.length} explicit fixture cases; immediate approach/refusal visibility, replacement notices, strict22/gates/farming and actual offer`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve(), browser = await chromium.launch({ headless: true });
  try { await testAltarArrival(browser, origin, { before: process.argv.includes("--before"), capture: process.argv.includes("--capture"),
    refusalRefresh: process.argv.includes("--refusal-refresh") }); }
  finally { await browser.close(); await new Promise((r) => server.close(r)); }
}
