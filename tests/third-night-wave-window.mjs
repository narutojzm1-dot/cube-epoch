import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const out = join(ROOT, "evidence", "ui-review-2026-11-06", "third-night-first-wave");
const baseline = "5d9342c783bb5b3020b8f8d67726cb38ae8a447a";

export async function testThirdNightWaveWindow(browser, origin, { before = false, capture = false } = {}) {
  const files = ["index.html", "style.css", "game.js"];
  const buffers = await Promise.all(files.map((f) => before
    ? execFileSync("git", ["show", `${baseline}:${f}`]) : readFile(join(ROOT, f))));
  const build = { sha: before ? baseline : execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
    dirty: !before && !!execFileSync("git", ["status", "--porcelain", "--", ...files]).toString().trim(),
    source: before ? "baseline Git product files served in memory" : "current working-tree product bytes",
    source_sha256: createHash("sha256").update(Buffer.concat(buffers)).digest("hex") };
  const phase = before ? "before" : "after", records = [], screenshots = [];
  const attempt = basename(process.env.CUBE_AGENT_RUN_ROOT || "check").slice(-8);
  const manifest = join(out, `${phase}-${attempt}.json`);
  const cases = [{ width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
    { width: 844, height: 390, touch: true }, { width: 1280, height: 800, touch: false },
    ...[4, 2, 1].map((night) => ({ width: 320, height: 568, touch: true, night })),
    { width: 320, height: 568, touch: true, night: 3, startWave: 1 }];
  for (const mode of cases) {
    const night = mode.night ?? 3, expectedWave = (mode.startWave ?? 0) + 1;
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, hasTouch: mode.touch, isMobile: mode.touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), inputs = [], errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      if (before) await page.route("**/*", async (route) => {
        const name = new URL(route.request().url()).pathname;
        const i = name === "/" ? 0 : files.findIndex((f) => name === "/" + f);
        if (i < 0) await route.continue();
        else await route.fulfill({ body: buffers[i], contentType: ["text/html", "text/css", "application/javascript"][i] });
      });
      const cdp = mode.touch && browser.browserType().name() === "chromium" ? await context.newCDPSession(page) : null;
      const stamp = () => page.evaluate(() => ({ real_ms: performance.now(), game_seconds: CUBE.getState().time }));
      const activate = async (selector) => {
        await page.locator(selector).waitFor({ state: "visible" });
        for (let n = 0; n < 20; n++) {
          const r = await page.locator(selector).boundingBox();
          const top = Math.max(8, r.y), bottom = Math.min(viewport.height - 8, r.y + r.height);
          if (bottom - top >= Math.min(44, r.height)) {
            const x = r.x + r.width / 2, y = (top + bottom) / 2;
            assert.equal(await page.evaluate(({ selector, x, y }) =>
              document.querySelector(selector).contains(document.elementFromPoint(x, y)), { selector, x, y }), true);
            await (mode.touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
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
            const tick = () => { stable = scrollY === last ? stable + 1 : 0; last = scrollY;
              if (stable >= 8) resolve(); else requestAnimationFrame(tick); };
            requestAnimationFrame(tick);
          }));
        }
        assert.fail(`native title activation not reachable: ${selector}`);
      };
      const hold = async (code, predicate, arg) => {
        const start = await stamp();
        if (cdp) {
          const r = await page.locator(`[data-hold="${code}"]`).boundingBox();
          assert.ok(r.width >= 44 && r.height >= 44 && r.y >= 0 && r.y + r.height <= viewport.height);
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart",
            touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }] });
        } else { await page.locator("#game").focus(); await page.keyboard.down(code); }
        try { await page.waitForFunction(predicate, arg); }
        finally {
          if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          else await page.keyboard.up(code);
        }
        inputs.push({ action: code, type: cdp ? "native touch hold/release" : "native keyboard down/up (WebKit hold fallback)",
          start, end: await stamp() });
      };
      const read = () => page.evaluate(() => {
        const s = CUBE.getState(), el = document.getElementById("toast");
        const r = document.getElementById("game").getBoundingClientRect();
        const clip = document.getElementById("notice-feed").getBoundingClientRect(), range = document.createRange();
        range.selectNodeContents(el);
        return { real_ms: performance.now(), time: s.time, cycle: s.cycle, day: s.day, nights: s.nights,
          dayLen: s.dayLen, nightLen: s.nightLen, wave: s.wave, wavesTotal: s.wavesTotal,
          toSpawn: s.toSpawn, enemies: s.enemies.length, paused: s.paused, over: s.over,
          player: { x: s.player.x, y: s.player.y, dir: s.player.dir, mana: s.player.mana },
          inv: { ...s.inv }, wall: s.tiles[22 * 48 + 22], gaps: CUBE.campGaps(),
          toast: el.textContent, visible: !el.classList.contains("hidden"),
          complete: [...range.getClientRects()].every((r) => r.top >= clip.top && r.bottom <= clip.bottom),
          held: document.querySelectorAll("#touch-controls .held").length,
          canvas: { x: r.x, y: r.y, width: r.width, height: r.height },
          timeline: window.__waveWindow.events, pausedFrames: window.__waveWindow.pausedFrames };
      });
      const shot = async (state) => {
        const data = await read(), metrics = await inspect(page);
        assertFirstScreen(metrics, mode.touch); assert.equal(data.paused, false); assert.equal(data.over, false);
        if (state !== "expired") { assert.equal(data.visible, true); if (mode.touch) assert.ok(data.complete); }
        if (capture && night === 3 && expectedWave === 1) {
          const filename = `${state}--${mode.width}x${mode.height}--${phase}--${build.source_sha256.slice(0, 8)}--${attempt}.png`;
          await mkdir(join(out, "images"), { recursive: true });
          await page.screenshot({ path: join(out, "images", filename), fullPage: false });
          const afterImage = await read();
          if (state !== "expired") { assert.equal(afterImage.visible, true); assert.equal(afterImage.toast, data.toast); }
          screenshots.push({ screen_id: state, state, viewport, language: "zh-CN", ui_scale: "100%", device_scale_factor: 1,
            platform: `Web / ${browser.browserType().name()}`, full_page: false, build, phase, data, afterImage, metrics,
            source: "explicit already-completed-two-nights mage pre-dusk fixture; real unpaused clock and native controls after preparation, not natural three-night run",
            capture_setup: "no pause, frame freeze or clock/wave writes after precondition; screenshot while simulation continues",
            relative_image_path: `images/${filename}`, inputs: [...inputs], issue_ids: ["UI-032"], status: "已截",
            visual_review: "待用户/协调逐图审查", captured_at: new Date().toISOString(),
            repro_steps: ["原生选法师、开始、跳过开场/预演", "明确前置：已过2夜，第三日前1.2秒、62秒白天/250.8游戏秒、墙80HP/木4；准备后不再写游戏状态",
              "正常跨入第三夜，下一帧首波照常产生；真实下移和按住攻击施放，记录首波文字到自然隐藏的时间戳"] });
          await writeFile(manifest, JSON.stringify({ screenshots, records }, null, 2) + "\n");
        }
        return data;
      };
      await page.goto(origin);
      await activate('.class-card[data-class="mage"]');
      await page.waitForFunction(() => !document.getElementById("btn-start").disabled);
      await activate("#btn-start"); await activate("#btn-skip-intro"); await activate("#btn-skip-brief");
      await page.waitForSelector("#screen-game:not(.hidden)");
      await page.evaluate(({ night, startWave }) => {
        const s = CUBE.getState(), el = document.getElementById("toast");
        const startTime = 76 + (night - 1) * 88 + Math.max(0, night - 3) * 6;
        Object.assign(s.player, { x: 378, y: 358, dir: 1, vx: 0, vy: 0 });
        Object.assign(s.flags, { moved: true, chopped: true, gathered: true });
        s.build = null; s.inv.wood = 4; s.inv.fence = 0;
        s.tiles[22 * 48 + 22] = 12; s.fenceHp.set("22,22", 80);
        s.tiles[23 * 48 + 23] = 1; s.tiles[24 * 48 + 23] = 1;
        s.dayLen = night === 1 ? 76 : 62; s.nights = night - 1;
        s.cycle = s.dayLen - 1.2; s.time = startTime - 1.2; s.nightWarned = true;
        if (startWave) {
          s.day = false; s.nights = night; s.wave = startWave; s.wavesTotal = 4;
          s.nightLen = 32; s.cycle = 1; s.toSpawn = 0; s.waveWait = 2.2;
        }
        window.__waveWindow = { events: [], pausedFrames: 0 };
        let frameSeconds = 0, previousFrame, frameId;
        const sample = (now) => {
          if (previousFrame !== undefined) frameSeconds += Math.min((now - previousFrame) / 1000, 0.05);
          previousFrame = now;
          if (s.paused) window.__waveWindow.pausedFrames++;
          frameId = requestAnimationFrame(sample);
        };
        frameId = requestAnimationFrame(sample);
        const observer = new MutationObserver((changes) => {
          if (changes.some((c) => c.type === "childList") || changes.some((c) => c.type === "attributes")) {
            window.__waveWindow.events.push({ text: el.textContent, visible: !el.classList.contains("hidden"),
              real_ms: performance.now(), frame_seconds: frameSeconds, time: s.time, cycle: s.cycle,
              day: s.day, nights: s.nights, wave: s.wave, wavesTotal: s.wavesTotal, toSpawn: s.toSpawn, paused: s.paused });
          }
        });
        observer.observe(el, { childList: true, attributes: true, attributeFilter: ["class"] });
        window.__waveWindow.stop = () => { observer.disconnect(); cancelAnimationFrame(frameId); };
      }, { night, startWave: mode.startWave ?? 0 });
      await page.waitForFunction((wave) => CUBE.getState().wave === wave, expectedWave);
      const started = await shot("first-wave");
      const baseText = `第 ${night} 夜 · 第 ${expectedWave}/${started.wavesTotal} 波来了！`;
      const expected = !before && mode.touch && night >= 3 && expectedWave === 1
        ? `第${night}夜·第1/${started.wavesTotal}波来了！面朝怪打；朝墙会拆墙。` : baseText;
      assert.equal(started.toast, expected);
      assert.equal(started.nightLen, night >= 3 ? 32 : 26);
      await hold("ArrowDown", () => CUBE.getState().player.y >= 378);
      const mana = (await read()).player.mana;
      await hold("Space", (mana) => CUBE.getState().player.mana < mana - 0.5, mana);
      const touched = await shot("native-touch");
      assert.equal(touched.toast, expected); assert.equal(touched.wall, 12);
      assert.deepEqual(touched.inv, started.inv); assert.equal(touched.held, 0);
      await page.waitForFunction((text) => {
        const e = window.__waveWindow.events.find((e) => e.text === text && e.visible);
        return e && performance.now() - e.real_ms >= 1650;
      }, expected);
      const late = await shot("late-readable"); assert.equal(late.toast, expected);
      await page.waitForFunction((text) => window.__waveWindow.events.some((e) => e.text === text && !e.visible), expected);
      const expired = await shot("expired"), events = expired.timeline;
      const first = events.find((e) => e.text === expected && e.visible);
      const hidden = events.find((e) => e.text === expected && !e.visible);
      const frameDuration = hidden.frame_seconds - first.frame_seconds, realDuration = (hidden.real_ms - first.real_ms) / 1000;
      assert.ok(frameDuration >= 2.3 && frameDuration <= 2.5, `wave toast budget changed: ${frameDuration}`);
      assert.ok(realDuration >= 2.2, `wave guidance disappeared too soon: ${realDuration}`);
      assert.equal(expired.pausedFrames, 0); assert.ok(events.every((e) => !e.paused));
      assert.equal(first.toSpawn, 3 + night + expectedWave);
      if (!mode.startWave) {
        const dusk = events.find((e) => !e.day && e.nights === night && e.wave === 0);
        assert.ok(dusk, "normal unpaused dusk mutation must be recorded");
        const delta = first.time - dusk.time;
        assert.ok(night === 1 ? delta >= 5 && delta <= 5.15 : delta >= 0 && delta <= 0.1, `first-wave rhythm changed: ${delta}`);
      }
      records.push({ viewport, night, expectedWave, started, touched, late, expired, frameDuration, realDuration, inputs });
      await page.evaluate(() => window.__waveWindow.stop());
      assert.deepEqual(errors, []);
      console.log("WAVE_WINDOW_CASE_OK", phase, mode.width, night, expectedWave, frameDuration, realDuration);
      if (cdp) await cdp.detach();
    } finally { await context.close(); }
  }
  if (capture) await writeFile(manifest, JSON.stringify({ screenshots, records }, null, 2) + "\n");
  console.log("THIRD_NIGHT_WAVE_WINDOW_OK", phase, records.length);
  return records;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await serve(), browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  try { await testThirdNightWaveWindow(browser, server.origin, { before: process.argv.includes("--before"), capture: process.argv.includes("--capture") }); }
  finally { await browser.close(); await new Promise((r) => server.server.close(r)); }
}
