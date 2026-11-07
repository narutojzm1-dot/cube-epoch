import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve, enterPlay } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const out = join(ROOT, "evidence", "ui-review-2026-11-06", "build-success-feedback");
const modes = [
  { width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true }, { width: 1280, height: 800, touch: false },
];
const cases = [
  { id: "stored-torch", role: "mage", kind: "torch", inv: { torch: 1 }, delta: { torch: -1 }, message: "火把放好了。" },
  { id: "free-plot", role: "farmer", kind: "plot", inv: {}, delta: {}, message: "田开好了。" },
  { id: "stored-plot", role: "farmer", kind: "plot", inv: { plot: 1 }, delta: { plot: -1 }, message: "田开好了。" },
  { id: "surrounded-fence", role: "miner", kind: "fence", inv: { wood: 1 }, delta: { wood: -1 },
    surrounded: true, message: "栅栏放好了。" },
  { id: "fence-progress", role: "knight", kind: "fence", inv: { wood: 1 }, delta: { wood: -1 },
    unchanged: true, message: "围上了。还差 4 面，点下一个发光格。" },
  { id: "torch-shortage", role: "miner", kind: "torch", inv: { wood: 1 }, delta: {},
    refused: true, unchanged: true, message: "材料还差：石 1" },
];

export async function testBuildSuccessFeedback(browser, origin, { before = false, capture = false } = {}) {
  const engine = browser.browserType().name(), version = before ? "before" : "after";
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const dirty = !!execFileSync("git", ["status", "--porcelain", "--", "index.html", "style.css", "game.js"],
    { cwd: ROOT, encoding: "utf8" }).trim();
  if (before) {
    assert.equal(sha, "c6165aed7dc2548986a43150a36b45356349472e");
    assert.equal(dirty, false);
  }
  if (capture) assert.equal(engine, "chromium");
  const hash = createHash("sha256").update(Buffer.concat(await Promise.all(
    ["index.html", "style.css", "game.js"].map((f) => readFile(join(ROOT, f)))))).digest("hex");
  const previous = capture && !before
    ? JSON.parse(await readFile(join(out, "screenshots.json"), "utf8")).screenshots
      .filter((s) => s.version === "before" || !["torch-shortage", "torch-success"].includes(s.screen_id)) : [];
  const screenshots = [], normal = [], fixtures = [];
  for (const mode of modes) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, isMobile: mode.touch, hasTouch: mode.touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const session = engine === "chromium" && mode.touch ? await context.newCDPSession(page) : null;
      const hold = async (key, predicate) => {
        if (session) {
          const r = await page.locator(`[data-hold="${key}"]`).boundingBox();
          await session.send("Input.dispatchTouchEvent", { type: "touchStart",
            touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }] });
        } else await page.keyboard.down(key);
        try { await page.waitForFunction(predicate); }
        finally {
          if (session) await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          else await page.keyboard.up(key);
        }
      };
      const select = async (kind) => {
        if (mode.touch) {
          if (!await page.locator("#play-details").evaluate((el) => el.open)) await page.locator("#play-details summary").tap();
          await page.locator(`.item[data-build="${kind}"]`).tap();
          await page.waitForFunction(() => !document.getElementById("play-details").open);
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        } else await page.keyboard.press({ fence: "1", torch: "2", plot: "3" }[kind]);
      };
      const tapTile = async (tx, ty) => {
        const point = await page.evaluate(({ tx, ty }) => {
          const c = CUBE.cam(), r = document.getElementById("game").getBoundingClientRect();
          return { x: r.x + (tx * 16 + 8 - c.x) * r.width / 320, y: r.y + (ty * 16 + 8 - c.y) * r.height / 192 };
        }, { tx, ty });
        if (mode.touch) await page.touchscreen.tap(point.x, point.y);
        else await page.mouse.click(point.x, point.y);
        return point;
      };
      const read = () => page.evaluate(() => {
        const s = CUBE.getState();
        return { inv: { ...s.inv }, x: s.player.x, y: s.player.y, hp: s.player.hp, campHp: s.campHp,
          time: s.time, day: s.day, nights: s.nights, over: s.over, win: s.win, build: s.build,
          held: document.querySelectorAll("#touch-controls .held").length,
          message: document.getElementById("toast").textContent,
          shown: !document.getElementById("toast").classList.contains("hidden"),
          target: s.tiles[16 * 48 + 32] };
      });
      const snapshot = async (id, data) => {
        await page.evaluate(() => CUBE.getState().paused = true);
        try {
          const metrics = await inspect(page);
          assertFirstScreen(metrics, mode.touch);
          assert.deepEqual(metrics.scroll, { x: 0, y: 0 });
          const t = metrics.rects.toast, f = metrics.rects["notice-feed"];
          assert.ok(t.y >= f.y && t.bottom <= f.bottom, "current feedback must be fully readable");
          if (capture) {
            const filename = `${id}--${mode.width}x${mode.height}--${version}--${hash.slice(0, 8)}.png`;
            await mkdir(join(out, "images"), { recursive: true });
            await page.screenshot({ path: join(out, "images", filename), fullPage: false });
            screenshots.push({
              screen_id: id, state: `${id} / ${version}`, version, viewport, language: "zh-CN",
              build: { sha, dirty, source_sha256: hash }, platform: `Web / ${engine}`,
              ui_scale: "100%", device_scale_factor: 1, full_page: false,
              source: "normal isolated miner first day; no inventory/world/location/time injection; screenshot pause only",
              input: session ? "native Chromium direction/attack hold/end + crafting/build/map taps" : "keyboard holds; touch E/build/map taps on touch layouts or desktop mouse/keyboard",
              relative_image_path: `images/${filename}`, issue_ids: ["UI-018"], status: "已截",
              visual_review: "待协调人逐图审查", captured_at: new Date().toISOString(), data, metrics,
              repro_steps: [
                "隔离新上下文正常选矿工，向下一格后面朝(25,22)树，真实长按采集并拾取木头",
                "正常走到(24,19)工作台，交互验证缺石/金/麦提示；不注资源",
                "正常走到(33,16)矿旁，选火把点(32,16)空地，缺石拒绝不扣料",
                "面朝(34,16)真实挖石并拾取，转向预留空地后点图；成功实际扣1木1石",
                "仅原图时暂停模拟；真实首屏100%，未触用户存档，不是自然夜守或平衡验证",
              ],
            });
            await writeFile(join(out, "screenshots.json"), JSON.stringify({ screenshots: [...previous, ...screenshots],
              visual_review: "待协调人逐图审查" }, null, 2) + "\n");
          }
        } finally { await page.evaluate(() => CUBE.getState().paused = false); }
      };
      await page.goto(origin);
      await enterPlay(page, "miner");
      const initial = await read();
      await hold("ArrowDown", () => CUBE.getState().player.y >= 358);
      await hold("ArrowRight", () => CUBE.getState().player.dir === 2);
      await hold("Space", () => CUBE.getState().inv.wood > 2);
      const wood = await read();
      assert.ok(wood.inv.wood >= 5);
      await hold("ArrowUp", () => CUBE.getState().player.y <= 316);
      if (mode.touch) await page.locator("#touch-interact").tap();
      else await page.keyboard.press("e");
      await page.waitForFunction(() => document.getElementById("toast").textContent === "还差：石 5、金 3、麦 3");
      const bench = await read();
      assert.deepEqual(bench.inv, wood.inv);
      await hold("ArrowRight", () => CUBE.getState().player.x >= 534);
      await hold("ArrowUp", () => CUBE.getState().player.y <= 266);
      await select("torch");
      await tapTile(32, 16);
      await page.waitForFunction(() => document.getElementById("toast").textContent === "材料还差：石 1");
      const shortage = await read();
      assert.deepEqual(shortage.inv, wood.inv);
      assert.notEqual(shortage.target, 13);
      if (capture && before && mode.touch) await snapshot("torch-shortage", shortage);
      await hold("ArrowRight", () => CUBE.getState().player.dir === 2);
      await hold("Space", () => CUBE.getState().inv.stone > 0);
      const supplied = await read();
      assert.ok(supplied.inv.stone >= 2 && supplied.inv.wood === wood.inv.wood);
      assert.equal(supplied.held, 0);
      await hold("ArrowLeft", () => CUBE.getState().player.dir === 1);
      const placementPoint = await tapTile(32, 16);
      try {
        await page.waitForFunction(() => CUBE.getState().tiles[16 * 48 + 32] === 13);
      } catch (error) {
        const nearby = await page.evaluate(() => {
          const s = CUBE.getState(), tiles = [];
          for (let y = 15; y <= 17; y++) for (let x = 31; x <= 34; x++) tiles.push({ x, y, tile: s.tiles[y * 48 + x] });
          return { paused: s.paused, tiles, hit: document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.id };
        });
        throw new Error(`normal placement ${engine} ${mode.width}x${mode.height}: ${JSON.stringify({ supplied, placementPoint, result: await read(), nearby })}`, { cause: error });
      }
      const success = await read();
      assert.equal(success.inv.wood, supplied.inv.wood - 1);
      assert.equal(success.inv.stone, supplied.inv.stone - 1);
      assert.equal(success.message, before ? "材料还差：石 1" : "火把放好了。");
      assert.equal(success.shown, true);
      for (const state of [wood, bench, shortage, supplied, success]) {
        assert.equal(state.hp, initial.hp); assert.equal(state.campHp, initial.campHp);
        assert.equal(state.day, true); assert.equal(state.nights, 0);
        assert.equal(state.over, false); assert.equal(state.win, false); assert.equal(state.held, 0);
      }
      await snapshot("torch-success", success);
      normal.push({ viewport, version, native_hold: !!session, initial, wood, bench, shortage, supplied, success });
      if (mode.width === 320) {
        for (const c of cases) {
          await page.goto(origin); await enterPlay(page, c.role);
          const stock = await page.evaluate((c) => {
            const s = CUBE.getState();
            for (const k of Object.keys(s.inv)) s.inv[k] = c.inv[k] || 0;
            s.player.x = 488; s.player.y = 408;
            s.tiles[24 * 48 + 31] = 1;
            if (c.surrounded) {
              for (const [tx, ty] of [[22, 20], [21, 21], [23, 21], [22, 22]]) {
                s.tiles[ty * 48 + tx] = 12; s.fenceHp.set(`${tx},${ty}`, 80);
              }
            }
            return { ...s.inv };
          }, c);
          await select(c.kind); await tapTile(31, 24);
          await page.waitForFunction(({ refused, kind }) => {
            const s = CUBE.getState();
            return refused ? document.getElementById("toast").textContent === "材料还差：石 1"
              : s.tiles[24 * 48 + 31] === ({ fence: 12, torch: 13, plot: 7 })[kind];
          }, c);
          const result = await read();
          const expected = { ...stock };
          for (const [k, n] of Object.entries(c.delta)) expected[k] += n;
          assert.deepEqual(result.inv, expected);
          if (before && !c.unchanged) assert.notEqual(result.message, c.message);
          else assert.equal(result.message, c.message);
          fixtures.push({ id: c.id, stock, result, source: "explicit inventory/position/grass and optional full-camp fixture; not normal gathering" });
        }
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  if (capture) {
    const validation = before ? {} : JSON.parse(await readFile(join(out, "validation.json"), "utf8"));
    validation[version] = { normal, fixtures };
    validation.no_user_save_access = true;
    await writeFile(join(out, "validation.json"), JSON.stringify(validation, null, 2) + "\n");
  }
  console.log(`BUILD_SUCCESS_FEEDBACK_OK ${normal.length} normal ${version} paths; ${fixtures.length} separate fixture regressions; ${screenshots.length} originals; ${engine}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve(), browser = await chromium.launch({ headless: true });
  try { await testBuildSuccessFeedback(browser, origin, { before: process.argv.includes("--before"), capture: process.argv.includes("--capture") }); }
  finally { await browser.close(); await new Promise((r) => server.close(r)); }
}
