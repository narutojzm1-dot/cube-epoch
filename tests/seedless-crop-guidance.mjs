import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve, enterPlay } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const baseline = "f652c884155ef060ce6505c33f41731080d4382b";
const out = join(ROOT, "evidence", "ui-review-2026-11-06", "seedless-crop-guidance");

export async function testSeedlessCropGuidance(browser, origin, { before = false, capture = false } = {}) {
  const files = ["index.html", "style.css", "game.js"];
  const buffers = await Promise.all(files.map((f) => before
    ? execFileSync("git", ["show", `${baseline}:${f}`]) : readFile(join(ROOT, f))));
  const build = {
    sha: before ? baseline : execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
    dirty: !before && !!execFileSync("git", ["status", "--porcelain", "--", ...files]).toString().trim(),
    source_sha256: createHash("sha256").update(Buffer.concat(buffers)).digest("hex"),
  };
  const phase = before ? "before" : "after", screenshots = [], records = [];
  const attempt = basename(process.env.CUBE_AGENT_RUN_ROOT || "check").slice(-8);
  const manifest = join(out, `${phase}-${attempt}.json`);
  for (const mode of [{ width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
    { width: 844, height: 390, touch: true }, { width: 1280, height: 800, touch: false }]) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, hasTouch: mode.touch, isMobile: mode.touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), inputs = [], errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await context.addInitScript(() => {
        window.__targetPaint = [];
        const strokeRect = CanvasRenderingContext2D.prototype.strokeRect;
        CanvasRenderingContext2D.prototype.strokeRect = function (x, y, w, h) {
          if (this.canvas.id === "game" && w === 20 && h === 20 && window.CUBE?.getState()) {
            window.__targetPaint.push({ time: CUBE.getState().time, x, y, color: this.strokeStyle });
            if (window.__targetPaint.length > 100) window.__targetPaint.shift();
          }
          return strokeRect.call(this, x, y, w, h);
        };
      });
      if (before) await page.route("**/*", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const i = path === "/" ? 0 : files.findIndex((f) => path === "/" + f);
        if (i < 0) await route.continue();
        else await route.fulfill({ body: buffers[i], contentType: ["text/html", "text/css", "application/javascript"][i] });
      });
      const cdp = mode.touch && browser.browserType().name() === "chromium" ? await context.newCDPSession(page) : null;
      const read = () => page.evaluate(() => {
        const s = CUBE.getState();
        return { time: s.time, day: s.day, nights: s.nights, paused: s.paused, win: s.win, over: s.over,
          inv: { ...s.inv }, player: { x: s.player.x, y: s.player.y, dir: s.player.dir }, build: s.build,
          crops: [...s.crops].map(([key, crop]) => ({ key, ...crop })), farms: [30, 31, 32].map((x) => s.tiles[24 * 48 + x]),
          target: CUBE.currentTarget(), gaps: CUBE.campGaps(), fenceHp: [...s.fenceHp], campHp: s.campHp,
          prompt: document.getElementById("prompt").textContent, toast: document.getElementById("toast").textContent,
          objective: document.getElementById("objective").textContent, guide: document.getElementById("guide-body").textContent,
          held: document.querySelectorAll("#touch-controls .held").length,
          paint: window.__targetPaint.filter((p) => p.time === s.time) };
      });
      const interact = async () => {
        const start = await read();
        if (mode.touch) await page.locator("#touch-interact").tap();
        else { await page.locator("#game").focus(); await page.keyboard.press("e"); }
        inputs.push({ action: "interact", input: mode.touch ? "native touch tap" : "native E key", time: start.time, player: start.player });
      };
      const hold = async (code, predicate, arg) => {
        const start = await read(), r = await page.locator(`[data-hold="${code}"]`).boundingBox();
        const input = cdp ? "native CDP touchStart/end" : "native keyboard down/up (WebKit touch fallback)";
        inputs.push({ action: `${code}-start`, input, time: start.time, player: start.player, rect: r });
        if (cdp) {
          assert.ok(r.width >= 44 && r.height >= 44);
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }] });
        } else { await page.locator("#game").focus(); await page.keyboard.down(code); }
        try { await page.waitForFunction(predicate, arg, { timeout: 5000 }); }
        finally {
          if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          else await page.keyboard.up(code);
        }
        await page.waitForFunction(() => {
          const p = CUBE.getState().player;
          return Math.abs(p.vx) < 0.1 && Math.abs(p.vy) < 0.1;
        }, null, { timeout: 5000 });
        const released = await read();
        inputs.push({ action: `${code}-release`, input, time: released.time, player: released.player });
        assert.equal(released.held, 0);
      };
      const faceNorth = async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          if ((await read()).player.y < 410) await hold("ArrowDown", () => CUBE.getState().player.y >= 410);
          await hold("ArrowUp", () => CUBE.getState().player.dir === 3 && CUBE.getState().player.y <= 413);
          const p = (await read()).player;
          if (p.y >= 400 && p.y < 414) return;
        }
        assert.fail("native north-facing alignment did not reach the farm approach row");
      };
      const shot = async (id) => {
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const data = await read(), metrics = await inspect(page);
        assert.equal(data.paused, false); assert.equal(data.win, false); assert.equal(data.over, false);
        assertFirstScreen(metrics, mode.touch); assert.deepEqual(metrics.scroll, { x: 0, y: 0 });
        assert.ok(data.paint.length > 0, "observe a real rendered target, not just its logical eligibility");
        if (capture) {
          const filename = `${id}--${mode.width}x${mode.height}--${phase}--${build.source_sha256.slice(0, 8)}--${attempt}.png`;
          await mkdir(join(out, "images"), { recursive: true });
          await page.screenshot({ path: join(out, "images", filename), fullPage: false });
          screenshots.push({ screen_id: id, state: id, phase, viewport, language: "zh-CN", build,
            platform: `Web / ${browser.browserType().name()}`, ui_scale: "100%", device_scale_factor: 1,
            source: "isolated daytime materials/location/prior-harvest fixture; normal starting seeds; real planting/movement and natural growth, no QA pause",
            relative_image_path: `images/${filename}`, issue_ids: ["UI-035"], status: "已截", visual_review: "待用户/协调逐图审查",
            captured_at: new Date().toISOString(), data, metrics, inputs: [...inputs],
            repro_steps: ["隔离新上下文，正常选骑士/开始，保留教程；选角使用既有测试入口，不声称触屏选角证据",
              "固定白天前置：已围四墙/采集标记、木4石5金3麦2心0，初始种子2未注入；玩家(488,408)面北",
              "fixture将既有初始作物替换为空田（模拟此前已收）；局部草地和(30..32,24)三空田；不是完整自然采集或三夜跑",
              "实际交互播种、触屏方向移动，再播一次耗尽2种子；空田交互失败，真实走回麦苗显示现有等待提示",
              "不写作物阶段/生长/时钟，不暂停：自然经过7秒/8秒两阶段，成熟按住采集/攻击（桌面Space）收麦",
              "观察原掉麦1/回种1，配方从差麦1到齐全；拍摄真实首屏、原生像素，保护用户存档"] });
          await writeFile(manifest, JSON.stringify({ screenshots, records }, null, 2) + "\n");
        }
        return data;
      };
      const setup = async () => {
        await page.goto(origin);
        await enterPlay(page, "knight");
        await page.evaluate(() => {
          const s = CUBE.getState();
          Object.assign(s.flags, { moved: true, chopped: true, gathered: true, built: true });
          for (const [x, y] of [[22, 20], [21, 21], [23, 21], [22, 22]]) {
            s.tiles[y * 48 + x] = 12; s.fenceHp.set(`${x},${y}`, 80);
          }
          for (const key of s.crops.keys()) {
            const [x, y] = key.split(",").map(Number); s.tiles[y * 48 + x] = 7;
          }
          s.crops.clear();
          for (let y = 23; y <= 27; y++) for (let x = 28; x <= 34; x++) s.tiles[y * 48 + x] = 1;
          for (let x = 30; x <= 32; x++) s.tiles[24 * 48 + x] = 7;
          Object.assign(s.inv, { wood: 4, stone: 5, gold: 3, wheat: 2, heart: 0 });
          Object.assign(s.player, { x: 488, y: 408, dir: 3, vx: 0, vy: 0 });
          s.nights = 3; s.dayLen = 62; s.cycle = 0; s.build = null;
        });
        await page.waitForFunction(() => CUBE.currentTarget()?.kind === "farm");
      };
      await setup();
      const initial = await read();
      assert.equal(initial.inv.seed, 2);
      await interact();
      await page.waitForFunction(() => CUBE.getState().crops.has("30,24"));
      const seeded = await shot("one-seed-left");
      assert.equal(seeded.inv.seed, 1); assert.equal(seeded.target.kind, "farm");
      await hold("ArrowRight", () => CUBE.getState().player.x >= 498);
      await faceNorth();
      await interact();
      await page.waitForFunction(() => CUBE.getState().crops.has("31,24"));
      const depleted = await shot("seedless-at-sprout");
      assert.deepEqual(depleted.inv, { ...initial.inv, seed: 0 });
      assert.equal(depleted.target.kind, before ? "farm" : "crop");
      assert.equal(depleted.prompt, "麦苗还在长，成熟后再收。");
      await hold("ArrowRight", () => CUBE.getState().player.x >= 514);
      await faceNorth();
      await interact();
      await page.waitForFunction(() => document.getElementById("toast").textContent === "没有种子了。收麦可以再拿到种子。");
      const refused = await shot("empty-field-refusal");
      assert.deepEqual(refused.inv, depleted.inv); assert.equal(refused.farms[2], 7);
      await hold("ArrowLeft", () => CUBE.getState().player.x <= 510);
      await faceNorth();
      await page.waitForFunction(() => CUBE.getState().crops.get("31,24")?.stage === 1);
      await page.waitForFunction(() => document.getElementById("toast").classList.contains("hidden"));
      const growing = await shot("growing-wait");
      assert.equal(growing.prompt, "麦苗还在长，成熟后再收。");
      assert.equal(growing.target.kind, before ? "farm" : "crop");
      assert.deepEqual(growing.inv, depleted.inv);
      await page.waitForFunction(() => CUBE.getState().crops.get("31,24")?.stage === 2, null, { timeout: 20000 });
      await page.waitForFunction(() => document.getElementById("prompt").textContent.endsWith("收麦"));
      const ripe = await shot("ripe-can-harvest");
      assert.equal(ripe.target.kind, "crop"); assert.equal(ripe.inv.seed, 0);
      await hold("Space", () => !CUBE.getState().crops.has("31,24"));
      await page.waitForFunction(() => {
        const s = CUBE.getState();
        return s.inv.wheat === 3 && !s.drops.some((d) => d.kind === "wheat" || d.kind === "seed");
      });
      const harvested = await shot("harvested-recipe-ready");
      const replanted = harvested.crops.some((c) => c.key === "31,24");
      assert.deepEqual(harvested.inv, { ...initial.inv, wheat: 3, seed: replanted ? 0 : 1 },
        "preserve original wheat1/seed1 yield and existing held-input automatic replant cost");
      assert.equal(harvested.target.kind, "bench");
      assert.deepEqual(harvested.fenceHp, initial.fenceHp); assert.equal(harvested.campHp, initial.campHp);
      assert.equal(harvested.day, true); assert.equal(harvested.nights, 3);
      assert.ok(ripe.time - seeded.time >= 14, "natural 7+8-second growth is not accelerated by the fixture");
      records.push({ id: "native-plant-grow-harvest", phase, viewport, initial, seeded, depleted, refused, growing, ripe, harvested, inputs });
      for (const c of [{ id: "night", change: "night", kind: "camp" }, { id: "heart", change: "heart", kind: "altar" },
        { id: "missing-gold", change: "gold", kind: "gold" }, { id: "wall-gap", change: "wall", kind: "gap" }]) {
        await page.evaluate((change) => {
          const s = CUBE.getState();
          s.day = true; s.inv.heart = 0; s.inv.gold = 3; s.inv.wheat = 2;
          s.tiles[21 * 48 + 23] = 12; s.fenceHp.set("23,21", 80);
          if (change === "night") { s.day = false; s.nightLen = 32; s.cycle = 0; s.toSpawn = 0; s.wave = s.wavesTotal = 4; }
          if (change === "heart") s.inv.heart = 1;
          if (change === "gold") s.inv.gold = 2;
          if (change === "wall") { s.tiles[21 * 48 + 23] = 1; s.fenceHp.delete("23,21"); }
        }, c.change);
        await page.waitForFunction((kind) => CUBE.currentTarget().kind === kind, c.kind);
        records.push({ id: c.id, phase, viewport, data: await read(), source: "separate post-growth control fixture, not natural night" });
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  if (capture) await writeFile(manifest, JSON.stringify({ screenshots, records }, null, 2) + "\n");
  console.log(`SEEDLESS_CROP_GUIDANCE_OK ${browser.browserType().name()} ${phase} ${records.length} cases ${screenshots.length} original PNGs`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve();
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  try { await testSeedlessCropGuidance(browser, origin, { capture: process.argv.includes("--capture"), before: process.argv.includes("--before") }); }
  finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
}
