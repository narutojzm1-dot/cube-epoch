import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve, enterPlay } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const baseline = "b292b989c1aefb2f3e4103aab4d636d04e9e5bfe";
const out = join(ROOT, "evidence", "ui-review-2026-11-06", "audio-recovery");
const modes = [
  { width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true }, { width: 1280, height: 800, touch: false },
];

export async function testAudioRecovery(browser, origin, { before = false, capture = false } = {}) {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const dirty = !!execFileSync("git", ["status", "--porcelain", "--", "index.html", "style.css", "game.js"],
    { cwd: ROOT, encoding: "utf8" }).trim();
  if (before) { assert.equal(sha, baseline); assert.equal(dirty, false); }
  const hash = createHash("sha256").update(Buffer.concat(await Promise.all(
    ["index.html", "style.css", "game.js"].map((f) => readFile(join(ROOT, f)))))).digest("hex");
  const version = before ? "before" : "after";
  const previous = capture && !before
    ? JSON.parse(await readFile(join(out, "screenshots.json"), "utf8")).screenshots.filter((s) => s.version === "before") : [];
  const screenshots = [], checks = [];
  for (const mode of modes) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, isMobile: mode.touch, hasTouch: mode.touch, deviceScaleFactor: 1 });
    try {
      await context.addInitScript(() => {
        const Native = window.AudioContext || window.webkitAudioContext;
        window.__audioReview = { available: !!Native, contexts: [] };
        if (!Native) return;
        window.AudioContext = class extends Native {
          constructor(...args) {
            super(...args);
            this.reviewGains = []; this.reviewOscillators = [];
            window.__audioReview.contexts.push(this);
          }
          createGain() {
            const node = super.createGain();
            this.reviewGains.push(node);
            return node;
          }
          createOscillator() {
            const node = super.createOscillator(), record = { ended: false };
            node.addEventListener("ended", () => { record.ended = true; });
            this.reviewOscillators.push(record);
            return node;
          }
        };
      });
      const page = await context.newPage(), errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin);
      await enterPlay(page);
      const native = await page.evaluate(() => window.__audioReview.available);
      if (capture) assert.equal(native, true, "originals require actual native Web Audio, never a mock");
      const read = () => page.evaluate(() => {
        const r = window.__audioReview, a = r.contexts[0], s = window.CUBE.getState();
        return { native_audio_available: r.available, contexts: r.contexts.length,
          state: a?.state ?? "unavailable", current_time: a?.currentTime ?? null,
          gain_levels: a?.reviewGains.slice(0, 2).map((g) => g.gain.value) ?? [],
          oscillators: a?.reviewOscillators.length ?? 0,
          label: document.getElementById("btn-mute").textContent, inv: { ...s.inv }, hp: s.player.hp, over: s.over };
      });
      const initial = await read();
      if (native) { assert.equal(initial.contexts, 1); assert.equal(initial.state, "running"); }
      const toggle = () => mode.touch ? page.locator("#btn-mute").tap() : page.keyboard.press("m");
      const suspend = async () => {
        if (native) await page.evaluate(() => window.__audioReview.contexts[0].suspend());
      };
      const snapshot = async (id) => {
        const audio = await read(), metrics = await inspect(page);
        assertFirstScreen(metrics, mode.touch);
        assert.deepEqual(metrics.viewport, viewport);
        assert.deepEqual(metrics.scroll, { x: 0, y: 0 });
        assert.deepEqual(audio.inv, initial.inv);
        assert.equal(audio.hp, initial.hp); assert.equal(audio.over, false);
        const button = await page.locator("#btn-mute").boundingBox();
        if (mode.touch) assert.ok(button.width >= 44 && button.height >= 44, "sound control retains 44px target");
        assert.equal(await page.locator("#touch-controls .held").count(), 0);
        const result = { audio, metrics };
        checks.push({ screen_id: id, version, viewport, result });
        if (capture && (mode.touch || id === "all-resume")) {
          const filename = `${id}--${mode.width}x${mode.height}--${version}--${hash.slice(0, 8)}.png`;
          await mkdir(join(out, "images"), { recursive: true });
          await page.evaluate(() => { window.CUBE.getState().paused = true; });
          try { await page.screenshot({ path: join(out, "images", filename), fullPage: false }); }
          finally { await page.evaluate(() => { window.CUBE.getState().paused = false; }); }
          screenshots.push({
            screen_id: id, state: `${id} / ${version}`, version, viewport, language: "zh-CN",
            build: { sha, dirty, source_sha256: hash }, source: "normal knight entry; actual AudioContext.suspend fixture",
            platform: `Web / ${browser.browserType().name()}`, ui_scale: "100%", device_scale_factor: 1,
            input: mode.touch ? "native sound-button taps" : "keyboard M", full_page: false,
            relative_image_path: `images/${filename}`, issue_ids: ["UI-015"], status: "已截",
            visual_review: "待协调人逐图审查；图片不证明听感", captured_at: new Date().toISOString(), result,
            repro_steps: [
              "隔离上下文正常选骑士并跳过开场/预演；保留正常库存，不碰用户存档",
              "只记录原生AudioContext/节点，实际调用原生suspend模拟挂起；不伪造音频API/音源，不改游戏时钟",
              id === "sfx-resume" ? "原生点声音按钮或按M，从声音开切仅音效" : "仅音效后再次挂起；切静音，再切声音开",
              "记录真实上下文状态/音频时钟/原音乐与底音增益；图片仅冻结游戏模拟，100%真实首屏",
            ],
          });
          await writeFile(join(out, "screenshots.json"), JSON.stringify({ screenshots: [...previous, ...screenshots],
            visual_review: "待协调人逐图审查；实际恢复以validation.json的音频行为为证" }, null, 2) + "\n");
        }
        return audio;
      };
      await suspend();
      const suspended = await read();
      await toggle();
      assert.equal((await read()).label, "仅音效");
      if (native) {
        if (before) assert.equal((await read()).state, "suspended");
        else await page.waitForFunction((time) => {
          const a = window.__audioReview.contexts[0]; return a.state === "running" && a.currentTime > time;
        }, suspended.current_time);
        assert.ok((await read()).gain_levels.every((g) => g === 0), "only-SFX must not enable music or pad");
      }
      await snapshot("sfx-resume");
      const oscillator = (await read()).oscillators;
      if (mode.touch) await page.locator("#touch-skill").tap();
      else await page.keyboard.press("q");
      await page.waitForFunction(() => window.CUBE.getState().player.skillCd > 0);
      let beep = { native_audio_available: native };
      if (native) {
        assert.equal((await read()).oscillators, oscillator + 1, "actual knight skill creates one original SFX oscillator");
        if (before) await page.waitForTimeout(150);
        else await page.waitForFunction((i) => window.__audioReview.contexts[0].reviewOscillators[i].ended, oscillator);
        beep = { ...beep, skill_oscillator_ended: await page.evaluate((i) => window.__audioReview.contexts[0].reviewOscillators[i].ended, oscillator) };
        assert.equal(beep.skill_oscillator_ended, !before, "real oscillator must execute after explicit audio recovery");
      }
      checks.push({ screen_id: "skill-sfx-behavior", version, viewport, result: beep });
      await suspend();
      const mutedTime = (await read()).current_time;
      await toggle();
      assert.equal((await read()).label, "静音");
      if (native) {
        assert.equal((await read()).state, "suspended", "mute must not resume the suspended context");
        assert.equal((await read()).current_time, mutedTime);
        assert.ok((await read()).gain_levels.every((g) => g === 0));
      }
      await toggle();
      assert.equal((await read()).label, "声音开");
      if (native) {
        if (before) assert.equal((await read()).state, "suspended");
        else await page.waitForFunction((time) => {
          const a = window.__audioReview.contexts[0]; return a.state === "running" && a.currentTime > time;
        }, mutedTime);
        const audio = await read();
        assert.equal(audio.contexts, 1, "recover the existing context, never create another");
        assert.ok(Math.abs(audio.gain_levels[0] - 0.26) < 0.001 && Math.abs(audio.gain_levels[1] - 0.05) < 0.001,
          "original music/pad levels must remain unchanged");
      }
      await snapshot("all-resume");
      assert.deepEqual(errors, []);
      if (!native) console.log(`AUDIO_NATIVE_UNAVAILABLE ${browser.browserType().name()} ${mode.width}x${mode.height}: no Web Audio API; only labels/gameplay/no-error compatibility checked, NOT native recovery`);
    } finally { await context.close(); }
  }
  if (capture) {
    const validation = before ? {} : JSON.parse(await readFile(join(out, "validation.json"), "utf8"));
    validation[before ? "before_checks" : "after_checks"] = checks;
    validation.fixture = "real native audio suspension, not actual OS background/call interruption";
    validation.no_user_save_access = true;
    await writeFile(join(out, "validation.json"), JSON.stringify(validation, null, 2) + "\n");
  }
  console.log(`AUDIO_CONTROLS_CHECKED ${checks.length} ${version} records; native audio availability per record; ${screenshots.length} viewport originals; physical listening NOT tested`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve();
  const browser = await chromium.launch({ headless: true });
  try { await testAudioRecovery(browser, origin, { capture: process.argv.includes("--capture"), before: process.argv.includes("--before") }); }
  finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
}
