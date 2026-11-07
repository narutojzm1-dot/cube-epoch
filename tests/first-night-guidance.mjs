import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const baseline = "af3a311a40ac5a70d2b65daffe4e36b004ef596c";
const out = join(ROOT, "evidence", "ui-review-2026-11-06", "first-night-wall-guidance");

export async function testFirstNightGuidance(browser, origin, { before = false, capture = false, natural = false } = {}) {
  const files = ["index.html", "style.css", "game.js"];
  const memoryBefore = before && !natural;
  const buffers = await Promise.all(files.map((f) => memoryBefore
    ? execFileSync("git", ["show", `${baseline}:${f}`]) : readFile(join(ROOT, f))));
  const build = {
    sha: memoryBefore ? baseline : execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
    dirty: !memoryBefore && !!execFileSync("git", ["status", "--porcelain", "--", ...files]).toString().trim(),
    source: memoryBefore ? "baseline Git product files served in memory, not current working tree" : "current working-tree product bytes",
    source_sha256: createHash("sha256").update(Buffer.concat(buffers)).digest("hex"),
  };
  if (before && natural) { assert.equal(build.sha, baseline); assert.equal(build.dirty, false); }
  const phase = before ? "before" : "after", records = [], shots = [];
  const attempt = basename(process.env.CUBE_AGENT_RUN_ROOT || "check").slice(-8);
  const manifestPath = join(out, `${phase}-${natural ? "normal" : "fixture"}-${attempt}.json`);
  for (const mode of [{ width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
    { width: 1280, height: 800, touch: false }, ...(!natural ? [{ width: 844, height: 390, touch: true }] : [])]) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, hasTouch: mode.touch, isMobile: mode.touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), inputs = [], errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      if (memoryBefore) await page.route("**/*", async (route) => {
        const name = new URL(route.request().url()).pathname;
        const i = name === "/" ? 0 : files.findIndex((f) => name === "/" + f);
        if (i < 0) await route.continue();
        else await route.fulfill({ body: buffers[i], contentType: ["text/html", "text/css", "application/javascript"][i] });
      });
      const cdp = mode.touch && browser.browserType().name() === "chromium" ? await context.newCDPSession(page) : null;
      const activate = async (selector) => {
        await page.locator(selector).waitFor({ state: "visible" });
        const r = await page.locator(selector).boundingBox();
        const x = r.x + r.width / 2, y = (Math.max(8, r.y) + Math.min(viewport.height - 8, r.y + r.height)) / 2;
        assert.ok(r.y < viewport.height && r.y + r.height > 0);
        assert.equal(await page.evaluate(({ selector, x, y }) =>
          document.querySelector(selector).contains(document.elementFromPoint(x, y)), { selector, x, y }), true);
        await (mode.touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
        inputs.push({ action: selector, type: mode.touch ? "native tap" : "native mouse click", x, y });
      };
      const swipeUp = async () => {
        if (cdp) {
          const x = viewport.width / 2, y = viewport.height - 50;
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
          try {
            for (let n = 1; n <= 8; n++) {
              await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + (60 - y) * n / 8, id: 1 }] });
              await page.waitForTimeout(20);
            }
          } finally { await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
        } else await page.keyboard.press("End");
        await page.evaluate(() => new Promise((done) => {
          let last = scrollY, stable = 0;
          const tick = () => {
            stable = scrollY === last ? stable + 1 : 0; last = scrollY;
            if (stable >= 8) done(); else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }));
        inputs.push({ action: "title scroll", type: cdp ? "native touch swipe" : "native End" });
      };
      const hold = async (code, predicate, argument) => {
        if (cdp) {
          const r = await page.locator(`[data-hold="${code}"]`).boundingBox();
          assert.ok(r.width >= 44 && r.height >= 44 && r.y >= 0 && r.y + r.height <= viewport.height);
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart",
            touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }] });
        } else { await page.locator("#game").focus(); await page.keyboard.down(code); }
        try { await page.waitForFunction(predicate, argument); }
        finally {
          if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          else await page.keyboard.up(code);
        }
        inputs.push({ action: code, type: cdp ? "native touch hold/release" : "native keyboard down/up" });
      };
      const read = () => page.evaluate(() => {
        const s = CUBE.getState(), r = document.getElementById("game").getBoundingClientRect();
        return { day: s.day, nights: s.nights, time: s.time, cycle: s.cycle, dayLen: s.dayLen, wave: s.wave,
          wavesTotal: s.wavesTotal, over: s.over, inv: { ...s.inv }, player: { x: s.player.x, y: s.player.y, dir: s.player.dir, mana: s.player.mana },
          build: s.build, wall: s.tiles[22 * 48 + 22], gaps: CUBE.campGaps(), campHp: s.campHp,
          enemies: s.enemies.map((e) => ({ kind: e.kind, x: e.x, y: e.y })), bolts: s.bolts.length,
          toast: document.getElementById("toast").textContent, toastVisible: !document.getElementById("toast").classList.contains("hidden"),
          objective: document.getElementById("objective").textContent, guide: document.getElementById("guide-body").textContent,
          details: document.getElementById("play-details").open, held: document.querySelectorAll("#touch-controls .held").length,
          canvas: { x: r.x, y: r.y, width: r.width, height: r.height } };
      });
      const shot = async (state, panel = false) => {
        const data = await read(), metrics = await inspect(page);
        if (!panel) assertFirstScreen(metrics, mode.touch);
        if (state === "first-night" && mode.touch) {
          const complete = await page.evaluate(() => {
            const clip = document.getElementById("notice-feed").getBoundingClientRect();
            const range = document.createRange(); range.selectNodeContents(document.getElementById("toast"));
            return [...range.getClientRects()].every((r) => r.top >= clip.top && r.bottom <= clip.bottom);
          });
          assert.ok(complete, "first-night action and wall warning must be complete above core controls");
        }
        if (capture) {
          const filename = `${natural ? "normal" : "fixture"}-${state}--${mode.width}x${mode.height}--${phase}--${build.source_sha256.slice(0, 8)}--${attempt}.png`;
          await mkdir(join(out, "images"), { recursive: true });
          await page.screenshot({ path: join(out, "images", filename), fullPage: false });
          shots.push({ screen_id: state, state, viewport, language: "zh-CN", ui_scale: "100%", device_scale_factor: 1,
            platform: `Web / ${browser.browserType().name()}`, build, phase, data, metrics,
            source: natural ? "ordinary isolated mage new game; native wood gathering/first-fence placement/natural first dusk; no state or save injection"
              : "explicit first-dusk boundary fixture; native demolition/rebuild/side attack, not natural preparation",
            inputs: [...inputs], relative_image_path: `images/${filename}`, issue_ids: ["UI-030"], status: "已截", visual_review: "待协调逐图审查",
            captured_at: new Date().toISOString(), repro_steps: ["原生选法师、开始、跳过开场/预演", "砍木、选栅栏、点(22,22)扣原2木；等原首日自然天黑（夹具单列）",
              "首夜面对首墙按住采集/攻击确实拆墙；恢复墙后走到墙侧，按住同控件发术，不拆墙或扣建造料"] });
          await writeFile(manifestPath, JSON.stringify({ screenshots: shots, records }, null, 2) + "\n");
        }
        return data;
      };
      const tapWall = async () => {
        const point = await page.evaluate(() => {
          const r = document.getElementById("game").getBoundingClientRect(), c = CUBE.cam();
          return { x: r.x + (360 - c.x) * r.width / 320, y: r.y + (360 - c.y) * r.height / 192 };
        });
        await (mode.touch ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y));
        inputs.push({ action: "map22,22", type: mode.touch ? "native tap" : "native mouse click", ...point });
        await page.waitForFunction(() => CUBE.getState().tiles[22 * 48 + 22] === 12);
      };
      await page.goto(origin);
      for (const selector of ['.class-card[data-class="mage"]', "#btn-start"]) {
        for (let i = 0; i < 20; i++) {
          const r = await page.locator(selector).boundingBox();
          if (r && Math.min(viewport.height - 8, r.y + r.height) - Math.max(8, r.y) >= 44) break;
          await swipeUp();
        }
        await activate(selector);
        if (selector !== "#btn-start") await page.waitForFunction(() => !document.getElementById("btn-start").disabled);
      }
      await activate("#btn-skip-intro"); await activate("#btn-skip-brief");
      await page.waitForSelector("#screen-game:not(.hidden)");
      if (natural) {
        await hold("ArrowDown", () => CUBE.getState().player.y >= 358);
        await hold("ArrowRight", () => CUBE.getState().player.x >= 400);
        await hold("Space", () => CUBE.getState().flags.gathered && CUBE.getState().inv.wood > 2);
        await page.waitForFunction(() => CUBE.getState().hitstop <= 0);
        if (mode.touch) await activate("#btn-first-fence");
        else await page.keyboard.press("1");
        await page.waitForFunction(() => CUBE.getState().build === "fence");
        await hold("ArrowLeft", () => CUBE.getState().player.x <= 378);
        const stock = await read(); await tapWall();
        const placed = await shot("first-fence");
        assert.equal(placed.inv.wood, stock.inv.wood - 2); assert.equal(placed.gaps.length, 3);
        await page.waitForFunction(() => !CUBE.getState().day, null, { timeout: 120000 });
      } else {
        await page.evaluate(() => {
          const s = CUBE.getState();
          Object.assign(s.player, { x: 378, y: 358, dir: 1, vx: 0, vy: 0 });
          Object.assign(s.flags, { moved: true, chopped: true, gathered: true });
          s.build = "fence"; s.inv.wood = 4; s.inv.fence = 0;
          s.tiles[22 * 48 + 22] = 12; s.fenceHp.set("22,22", 80);
          s.tiles[23 * 48 + 23] = 1; s.tiles[24 * 48 + 23] = 1;
          s.cycle = s.dayLen - 0.01; s.nightWarned = true;
        });
        await page.waitForFunction(() => !CUBE.getState().day);
      }
      const firstNight = await shot("first-night");
      assert.equal(firstNight.nights, 1); assert.equal(firstNight.wavesTotal, 2); assert.equal(firstNight.wall, 12);
      assert.match(firstNight.objective, /篝火.*地图边缘/);
      if (!before && mode.touch) assert.match(firstNight.toast, /朝墙会拆墙/);
      else assert.equal(firstNight.toast, "第一夜：怪分波朝篝火来。站在墙后打。");
      if (!firstNight.details) await activate("#play-details summary");
      const guide = await shot("night-guide", true);
      if (!before && mode.touch) assert.match(guide.guide, /朝墙会拆墙/);
      else assert.match(guide.guide, /站在墙后打/);
      if (mode.touch) await activate("#play-details summary");
      await hold("Space", () => CUBE.getState().tiles[22 * 48 + 22] !== 12);
      const dismantled = await shot("wall-facing-hold");
      assert.notEqual(dismantled.wall, 12); assert.equal(dismantled.held, 0);
      await page.waitForFunction(() => CUBE.getState().drops.length === 0);
      await tapWall();
      await hold("ArrowDown", () => CUBE.getState().player.y >= 378);
      const ready = await read();
      await hold("Space", (mana) => CUBE.getState().player.mana < mana - 0.5, ready.player.mana);
      const safe = await shot("wall-side-attack");
      assert.equal(safe.wall, 12); assert.deepEqual(safe.inv, ready.inv); assert.equal(safe.held, 0);
      assert.equal(safe.over, false);
      records.push({ viewport, natural, firstNight, guide, dismantled, ready, safe, inputs });
      if (natural) {
        await page.waitForFunction(() => CUBE.getState().enemies.length > 0);
        const threats = await shot("first-wave");
        assert.equal(threats.day, false); assert.equal(threats.nights, 1);
      }
      assert.deepEqual(errors, []);
      console.log("FIRST_NIGHT_CASE_OK", phase, natural ? "normal" : "fixture", mode.width, JSON.stringify({ firstNight, dismantled, safe }));
      if (cdp) await cdp.detach();
    } finally { await context.close(); }
  }
  if (capture) await writeFile(manifestPath, JSON.stringify({ screenshots: shots, records }, null, 2) + "\n");
  console.log("FIRST_NIGHT_GUIDANCE_OK", phase, natural ? "normal" : "fixture", records.length);
  return records;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await serve(), browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  try {
    await testFirstNightGuidance(browser, server.origin, { before: process.argv.includes("--before"),
      capture: process.argv.includes("--capture"), natural: process.argv.includes("--natural") });
  } finally { await browser.close(); await new Promise((r) => server.server.close(r)); }
}
