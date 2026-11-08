import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const baseline = "b3cf5f382fec556f8db6e0ce1f01cc449d28984c";
const out = join(ROOT, "evidence", "ui-review-2026-11-06", "altar-guide-priority");

export async function testAltarGuidePriority(browser, origin, { before = false, capture = false } = {}) {
  const files = ["index.html", "style.css", "game.js"];
  const buffers = await Promise.all(files.map((f) => before
    ? execFileSync("git", ["show", `${baseline}:${f}`]) : readFile(join(ROOT, f))));
  const build = { sha: before ? baseline : execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
    dirty: !before && !!execFileSync("git", ["status", "--porcelain", "--", ...files]).toString().trim(),
    source_sha256: createHash("sha256").update(Buffer.concat(buffers)).digest("hex") };
  const phase = before ? "before" : "after", screenshots = [], records = [];
  const attempt = basename(process.env.CUBE_AGENT_RUN_ROOT || "check").slice(-8);
  const manifest = join(out, `${phase}-${attempt}.json`);
  for (const mode of [{ width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
    { width: 844, height: 390, touch: true }, { width: 1280, height: 800, touch: false }]) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, hasTouch: mode.touch, isMobile: mode.touch, deviceScaleFactor: 1 });
    try {
      await context.addInitScript(() => {
        window.__gapPaint = [];
        const strokeRect = CanvasRenderingContext2D.prototype.strokeRect;
        CanvasRenderingContext2D.prototype.strokeRect = function (x, y, w, h) {
          const time = window.CUBE?.getState()?.time;
          if (this.canvas.id === "game" && w === 14 && h === 14
            && this.strokeStyle === "rgba(255, 226, 122, 0.85)" && time !== undefined) {
            window.__gapPaint.push({ time, x, y });
            if (window.__gapPaint.length > 50) window.__gapPaint.shift();
          }
          return strokeRect.call(this, x, y, w, h);
        };
      });
      const page = await context.newPage(), errors = [], inputs = [];
      page.on("pageerror", (e) => errors.push(e.message));
      if (before) await page.route("**/*", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const i = path === "/" ? 0 : files.findIndex((f) => path === "/" + f);
        if (i < 0) await route.continue();
        else await route.fulfill({ body: buffers[i], contentType: ["text/html", "text/css", "application/javascript"][i] });
      });
      const cdp = mode.touch && browser.browserType().name() === "chromium" ? await context.newCDPSession(page) : null;
      const activate = async (selector) => {
        await page.locator(selector).waitFor({ state: "visible" });
        for (let n = 0; n < 20; n++) {
          const r = await page.locator(selector).boundingBox();
          const top = Math.max(8, r.y), bottom = Math.min(viewport.height - 8, r.y + r.height);
          if (bottom - top >= Math.min(44, r.height)) {
            const x = r.x + r.width / 2, y = (top + bottom) / 2;
            assert.equal(await page.evaluate(({ selector, x, y }) =>
              document.querySelector(selector).contains(document.elementFromPoint(x, y)), { selector, x, y }), true);
            if (selector === "#play-details summary") await page.evaluate(() => {
              window.__detailsSettled = new Promise((resolve) =>
                document.getElementById("play-details").addEventListener("toggle", resolve, { once: true }));
            });
            await (mode.touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
            if (selector === "#play-details summary") await page.evaluate(() => window.__detailsSettled);
            inputs.push({ action: selector, type: mode.touch ? "native tap" : "native mouse click", x, y });
            return;
          }
          if (cdp) {
            const x = viewport.width / 2, y = viewport.height - 40;
            await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
            try {
              for (let step = 1; step <= 8; step++) {
                await cdp.send("Input.dispatchTouchEvent", { type: "touchMove",
                  touchPoints: [{ x, y: y + (60 - y) * step / 8, id: 1 }] });
                await page.waitForTimeout(20);
              }
            } finally { await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
          } else await page.keyboard.press("End");
          await page.evaluate(() => new Promise((resolve) => {
            let last = scrollY, stable = 0;
            const tick = () => { stable = last === scrollY ? stable + 1 : 0; last = scrollY;
              if (stable >= 8) resolve(); else requestAnimationFrame(tick); };
            requestAnimationFrame(tick);
          }));
        }
        assert.fail(`native entry not reachable: ${selector}`);
      };
      const read = () => page.evaluate(() => {
        const s = CUBE.getState(), details = document.getElementById("play-details");
        const clip = details.querySelector(".details-content").getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(document.getElementById("guide-body"));
        return { time: s.time, cycle: s.cycle, day: s.day, nights: s.nights, paused: s.paused,
          win: s.win, over: s.over, inv: { ...s.inv }, skippedGuide: s.skippedGuide, build: s.build,
          player: { x: s.player.x, y: s.player.y }, campHp: s.campHp, canOffer: CUBE.canOffer(),
          gaps: CUBE.campGaps(), fenceHp: [...s.fenceHp], target: CUBE.currentTarget(),
          visibleGapPaint: window.__gapPaint.filter((r) => r.time === s.time && r.x >= 0 && r.y >= 0 && r.x + 14 <= 320 && r.y + 14 <= 192),
          guideStep: document.querySelector("#guide-steps .now")?.dataset.step || null,
          guideSummary: document.getElementById("guide-summary").textContent,
          guideBody: document.getElementById("guide-body").textContent,
          guideCompact: document.getElementById("guide").classList.contains("compact"),
          guideComplete: details.open && [...range.getClientRects()].every((r) => r.top >= clip.top && r.bottom <= clip.bottom),
          details: details.open, objective: document.getElementById("objective").textContent,
          prompt: document.getElementById("prompt").textContent, toast: document.getElementById("toast").textContent,
          held: document.querySelectorAll("#touch-controls .held").length };
      });
      const setup = async ({ dawn = false, day = true, nights = 3, heart = 1, skipped = false, complete = false, atAltar = false, storedFences = 2 } = {}) => {
        inputs.length = 0;
        await page.goto(origin);
        await page.evaluate(() => localStorage.removeItem("cube-epoch-seen"));
        for (const selector of ['.class-card[data-class="knight"]', "#btn-start", "#btn-skip-intro", "#btn-skip-brief"]) await activate(selector);
        await page.waitForSelector("#screen-game:not(.hidden)");
        await page.evaluate(({ dawn, day, nights, heart, skipped, complete, atAltar, storedFences }) => {
          const s = CUBE.getState();
          Object.assign(s.flags, { moved: true, chopped: true, gathered: true, built: true, crafted: true });
          for (const [x, y] of [[22, 20], [21, 21], [23, 21], [22, 22]]) {
            s.tiles[y * 48 + x] = 12; s.fenceHp.set(`${x},${y}`, 80);
          }
          if (!complete) { s.tiles[21 * 48 + 23] = 1; s.fenceHp.delete("23,21"); }
          s.build = null; s.skippedGuide = skipped; s.inv.heart = heart; s.inv.wood = 4; s.inv.fence = storedFences;
          s.day = dawn ? false : day; s.nights = nights; s.dayLen = 62; s.nightLen = 32;
          s.time = dawn ? 283.85 : 284; s.cycle = dawn ? 31.85 : 0;
          s.wave = s.wavesTotal = 4; s.toSpawn = 0; s.waveWait = 0; s.enemies = [];
          s.player.x = s.altar.x; s.player.y = atAltar ? s.altar.y + 12 : s.camp.y;
          s.player.vx = s.player.vy = 0; s.player.dir = 0;
        }, { dawn, day, nights, heart, skipped, complete, atAltar, storedFences });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      };
      const shot = async (id, panel = false) => {
        const data = await read();
        assert.equal(data.paused, id === "victory", "only the game's normal victory pause is allowed");
        const metrics = await inspect(page);
        if (id !== "victory" && !panel) assertFirstScreen(metrics, mode.touch);
        if (panel) assert.equal(data.guideComplete, true);
        if (capture) {
          const filename = `${id}--${mode.width}x${mode.height}--${phase}--${build.source_sha256.slice(0, 8)}--${attempt}.png`;
          await mkdir(join(out, "images"), { recursive: true });
          await page.screenshot({ path: join(out, "images", filename), fullPage: false });
          screenshots.push({ screen_id: id, state: id, phase, viewport, language: "zh-CN", ui_scale: "100%", device_scale_factor: 1,
            build, platform: `Web / ${browser.browserType().name()}`, source: "isolated active-tutorial third-dawn fixture with three walls/east gap; original terrain/path, no QA pause; normal victory pause; not natural three-night survival",
            relative_image_path: `images/${filename}`, issue_ids: ["UI-033"], status: "已截", visual_review: "待用户/协调逐图审查",
            captured_at: new Date().toISOString(), data, metrics, inputs: [...inputs],
            repro_steps: ["原生选骑士/开始/跳过开场；保留教程",
              "明确第三黎明前置：time283.85/cycle31.85/nightLen32、三夜已完成波次/空敌、木4/心1/骑士现成栅栏2、三面80HP墙/东缺口；玩家原土路x392,y344，其余生成地形/土路未改",
              "正常跨黎明，等原toast结束；真实展开/关闭背包教程，沿原土路按住向北走到祭坛22px以内",
              "真实触屏交互或桌面E，一次扣心到正常胜利；不为拍图主动暂停（胜利按原规则暂停），隔离上下文不读写用户存档"] });
          await writeFile(manifest, JSON.stringify({ screenshots, records }, null, 2) + "\n");
        }
        return data;
      };
      const interact = async () => {
        if (mode.touch) await activate("#touch-interact");
        else { await page.locator("#game").focus(); await page.keyboard.press("e"); inputs.push({ action: "interact", type: "native E key" }); }
      };
      await setup({ dawn: true });
      await page.waitForFunction(() => CUBE.getState().day);
      const dawn = await shot("third-dawn");
      assert.equal(dawn.canOffer, true); assert.equal(dawn.gaps.length, 1); assert.equal(dawn.skippedGuide, false);
      assert.equal(dawn.target.kind, "altar"); assert.match(dawn.objective, /北边祭坛/);
      assert.equal(dawn.guideStep, before ? "build" : "offer");
      assert.match(dawn.toast, before ? /先把发光的缺口补上/ : /可以去北边祭坛献祭/);
      assert.equal(dawn.visibleGapPaint.length, before ? 1 : 0);
      await page.waitForFunction(() => document.getElementById("toast").classList.contains("hidden"));
      const ready = await shot("ready-at-camp");
      if (!ready.details) await activate("#play-details summary");
      const guide = await shot("guide-expanded", true);
      assert.equal(guide.guideStep, before ? "build" : "offer");
      assert.match(guide.guideBody, before ? /缺口|栅栏/ : /方块之心已备好.*北边祭坛/);
      if (mode.touch) await activate("#play-details summary");
      const start = await read(), r = await page.locator('[data-hold="ArrowUp"]').boundingBox();
      inputs.push({ action: "walk-north-start", type: cdp ? "native touchStart/end" : "native ArrowUp down/up (WebKit touch fallback)", time: start.time, player: start.player });
      if (cdp) {
        assert.ok(r.width >= 44 && r.height >= 44);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }] });
      } else { await page.locator("#game").focus(); await page.keyboard.down("ArrowUp"); }
      try { await page.waitForFunction(() => {
        const s = CUBE.getState(); return Math.hypot(s.player.x - s.altar.x, s.player.y - s.altar.y) < 22;
      }); } finally {
        if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        else await page.keyboard.up("ArrowUp");
      }
      const released = await read();
      inputs.push({ action: "walk-north-release", time: released.time, player: released.player });
      const arrived = await shot("altar-arrived");
      assert.ok(start.player.y - arrived.player.y > 200, "native walk must follow the unchanged world path from camp");
      assert.equal(arrived.held, 0); assert.deepEqual(arrived.inv, ready.inv); assert.deepEqual(arrived.gaps, ready.gaps);
      assert.deepEqual(arrived.fenceHp, ready.fenceHp); assert.equal(arrived.campHp, ready.campHp);
      await interact(); await page.waitForFunction(() => CUBE.getState().win);
      const offered = await shot("victory");
      assert.equal(offered.over, true); assert.deepEqual(offered.inv, { ...ready.inv, heart: 0 });
      records.push({ id: "active-guide-delivery", viewport, dawn, ready, guide, arrived, offered, inputs: [...inputs] });
      if (mode.width === 320) for (const c of [
        { id: "no-heart", heart: 0, step: "build", glow: 1 },
        { id: "early", nights: 2, step: "build", glow: 1 },
        { id: "night", day: false, step: "night", glow: 1 },
        { id: "skipped", skipped: true, step: null, glow: before ? 1 : 0 },
      ]) {
        await setup(c); const actual = await read();
        assert.equal(actual.guideStep, c.step); assert.equal(actual.visibleGapPaint.length, c.glow);
        records.push({ id: c.id, viewport, actual, inputs: [...inputs] });
      }
      if (!mode.touch) {
        await setup(); await page.locator("#game").focus(); await page.keyboard.press("1");
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const selected = await read();
        assert.equal(selected.build, "fence"); assert.equal(selected.visibleGapPaint.length, 1);
        const point = await page.evaluate(() => {
          const r = document.getElementById("game").getBoundingClientRect(), cam = CUBE.cam();
          return { x: r.x + (376 - cam.x) * r.width / 320, y: r.y + (344 - cam.y) * r.height / 192 };
        });
        await page.mouse.click(point.x, point.y); await page.waitForFunction(() => CUBE.campGaps().length === 0);
        const placed = await read();
        assert.deepEqual(placed.inv, { ...selected.inv, fence: selected.inv.fence - 1 });
        records.push({ id: "manual-build", viewport, selected, placed, input: "native1 / native map mouse click", point });
        await setup({ storedFences: 0 }); await page.locator("#game").focus(); await page.keyboard.press("1");
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const fresh = await read();
        await page.mouse.click(point.x, point.y); await page.waitForFunction(() => CUBE.campGaps().length === 0);
        const paid = await read();
        assert.deepEqual(paid.inv, { ...fresh.inv, wood: fresh.inv.wood - 1 });
        records.push({ id: "manual-build-wood", viewport, fresh, paid, input: "native1 / native map mouse click", point });
        await setup({ heart: 2, complete: true, atAltar: true }); await interact();
        await page.waitForFunction(() => CUBE.getState().win);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const won = await read();
        assert.equal(won.inv.heart, 1); assert.equal(won.win, true); assert.equal(won.paused, true);
        assert.equal(await page.locator("#overlay-title").textContent(), "方块之心已点亮");
        records.push({ id: "win-extra-heart", viewport, won, inputs: [...inputs] });
      }
      assert.deepEqual(errors, []);
      if (cdp) await cdp.detach();
    } finally { await context.close(); }
  }
  if (capture) await writeFile(manifest, JSON.stringify({ screenshots, records }, null, 2) + "\n");
  console.log("ALTAR_GUIDE_PRIORITY_OK", browser.browserType().name(), phase, records.length);
  return records;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve(), browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true,
  });
  try { await testAltarGuidePriority(browser, origin, { before: process.argv.includes("--before"), capture: process.argv.includes("--capture") }); }
  finally { await browser.close(); await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}
