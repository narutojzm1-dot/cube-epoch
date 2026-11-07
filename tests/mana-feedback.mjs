import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve, enterPlay } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const baseline = "32f0ef280efcaf1746343bc074480a5cfb90d289";
const out = join(ROOT, "evidence", "ui-review-2026-11-06", "mana-feedback");
const modes = [
  { width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true }, { width: 1280, height: 800, touch: false },
];

export async function testManaFeedback(browser, origin, { before = false, capture = false } = {}) {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const dirty = !!execFileSync("git", ["status", "--porcelain", "--", "index.html", "style.css", "game.js"],
    { cwd: ROOT, encoding: "utf8" }).trim();
  if (before) { assert.equal(sha, baseline); assert.equal(dirty, false); }
  const engine = browser.browserType().name();
  if (capture) assert.equal(engine, "chromium", "touch originals require the actual native hold/release path");
  const hash = createHash("sha256").update(Buffer.concat(await Promise.all(
    ["index.html", "style.css", "game.js"].map((f) => readFile(join(ROOT, f)))))).digest("hex");
  const version = before ? "before" : "after";
  const previous = capture && !before
    ? JSON.parse(await readFile(join(out, "screenshots.json"), "utf8")).screenshots.filter((s) => s.version === "before") : [];
  const screenshots = [], checks = [];
  const message = before ? "法力不足" : "法力不足，会自动恢复。";
  for (const mode of modes) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, isMobile: mode.touch, hasTouch: mode.touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin);
      await enterPlay(page, "mage");
      const initial = await page.evaluate(() => {
        const s = window.CUBE.getState();
        return { mana: s.player.mana, maxMana: s.player.maxMana, inv: { ...s.inv }, hp: s.player.hp, campHp: s.campHp };
      });
      assert.equal(initial.mana, initial.maxMana);
      await page.evaluate(() => {
        const s = window.CUBE.getState(), p = s.player;
        p.x = 30 * 16 + 8; p.y = 25 * 16 + 8; p.dir = 2;
        for (let y = 23; y <= 27; y++) for (let x = 28; x <= 34; x++) s.tiles[y * 48 + x] = 1;
        s.day = false; s.nights = 2; s.nightLen = 26; s.cycle = 0;
        s.wave = 1; s.wavesTotal = 3; s.toSpawn = 0;
        s.enemies = [{ kind: "slime", x: p.x + 36, y: p.y, vx: 0, vy: 0,
          hp: 10000, maxHp: 10000, spd: 0, dmg: 0, hit: 0, flash: 0, bob: 0 }];
      });
      const session = engine === "chromium" && mode.touch ? await context.newCDPSession(page) : null;
      const hold = async (wait) => {
        if (session) {
          const r = await page.locator('[data-hold="Space"]').boundingBox();
          await session.send("Input.dispatchTouchEvent", {
            type: "touchStart", touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }],
          });
        } else await page.keyboard.down("Space");
        try { await wait(); }
        finally {
          if (session) await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          else await page.keyboard.up("Space");
        }
      };
      const read = () => page.evaluate(() => {
        const s = window.CUBE.getState(), p = s.player;
        return { mana: p.mana, maxMana: p.maxMana, hud: document.getElementById("mana-text").textContent,
          skillCd: p.skillCd, inv: { ...s.inv }, hp: p.hp, campHp: s.campHp, enemyHp: s.enemies[0]?.hp,
          held: document.querySelectorAll("#touch-controls .held").length,
          day: s.day, nights: s.nights, over: s.over, win: s.win, time: s.time,
          touchLayout: matchMedia("(any-pointer: coarse), (max-width: 760px)").matches,
          toast: document.getElementById("toast").textContent };
      });
      await hold(() => page.waitForFunction((text) => {
        const s = window.CUBE.getState();
        return document.getElementById("toast").textContent === text && s.player.mana > 0.5 && s.player.mana < 0.95;
      }, message, { timeout: 20000 }));
      await page.evaluate(() => { window.CUBE.getState().paused = true; });
      let depleted;
      try {
        depleted = await read();
        assert.ok(depleted.mana > 0.5 && depleted.mana < 1, "actual firing, not injected mana, must expose fractional insufficient stock");
        assert.equal(depleted.hud, `${before ? 1 : 0}/${initial.maxMana}`, "HUD must not advertise an unavailable whole shot");
        assert.equal(depleted.toast, message);
        assert.equal(depleted.held, 0);
        assert.equal(depleted.touchLayout, mode.touch);
        const metrics = await inspect(page);
        assertFirstScreen(metrics, mode.touch);
        assert.deepEqual(metrics.viewport, viewport);
        assert.deepEqual(metrics.scroll, { x: 0, y: 0 });
        const toast = metrics.rects.toast, feed = metrics.rects["notice-feed"];
        assert.ok(toast.y >= feed.y && toast.bottom <= feed.bottom + 0.5, "short recovery feedback stays inside bounded notice");
        if (capture) {
          const filename = `depleted-release--${mode.width}x${mode.height}--${version}--${hash.slice(0, 8)}.png`;
          await mkdir(join(out, "images"), { recursive: true });
          await page.screenshot({ path: join(out, "images", filename), fullPage: false });
          screenshots.push({
            screen_id: "depleted-release", state: `night mana below1 / released / ${version}`, version,
            viewport, language: "zh-CN", build: { sha, dirty, source_sha256: hash },
            source: "isolated night/location/target fixture; normal full mana spent by real attacks",
            platform: `Web / ${engine}`, ui_scale: "100%", device_scale_factor: 1, full_page: false,
            input: session ? "native Chromium touchscreen hold/end" : "keyboard Space down/up",
            relative_image_path: `images/${filename}`, issue_ids: ["UI-016"], status: "已截",
            visual_review: "待协调人逐图审查", captured_at: new Date().toISOString(), depleted, metrics,
            repro_steps: [
              "隔离新上下文正常选法师，保留原满法力和库存；不碰用户存档",
              "fixture: 玩家(30,25)面东/附近草地，第二夜26秒/波1/3；36px前方静止零伤害高血量靶，不是自然夜守",
              "真实长按采集/攻击消耗原8点法力；等实际不足提示及0.5至1之间法力，再原生松开",
              "仅截图冻结模拟，100%真实首屏；不注法力、不快进恢复或改攻击规则",
            ],
          });
          await writeFile(join(out, "screenshots.json"), JSON.stringify({ screenshots: [...previous, ...screenshots],
            visual_review: "待协调人逐图审查" }, null, 2) + "\n");
        }
      } finally { await page.evaluate(() => { window.CUBE.getState().paused = false; }); }
      await page.waitForFunction(() => {
        const p = window.CUBE.getState().player; return p.mana >= 1 && p.atkCd <= 0;
      });
      const recovered = await read();
      assert.ok(recovered.mana > depleted.mana && recovered.held === 0, "release leaves regeneration running without stuck input");
      assert.equal(recovered.hud, `${before ? recovered.mana.toFixed(0) : Math.floor(recovered.mana)}/${initial.maxMana}`);
      await hold(() => page.waitForFunction((mana) => window.CUBE.getState().player.mana < mana - 0.5, recovered.mana));
      const firedAgain = await read();
      assert.ok(firedAgain.mana < recovered.mana && firedAgain.held === 0, "recovered mana is actually usable by unchanged attack");
      const manaBeforeSkill = firedAgain.mana;
      if (mode.touch) await page.locator("#touch-skill").tap();
      else await page.keyboard.press("q");
      const skill = await read();
      assert.ok(skill.skillCd > 0 && skill.mana >= manaBeforeSkill, "existing Nova remains independent of normal-shot mana");
      for (const s of [depleted, recovered, firedAgain, skill]) {
        assert.deepEqual(s.inv, initial.inv); assert.equal(s.hp, initial.hp); assert.equal(s.campHp, initial.campHp);
        assert.equal(s.over, false); assert.equal(s.win, false);
      }
      checks.push({ viewport, version, input: session ? "native touch hold/release + native skill tap" : "keyboard Space hold/release; skill native tap on touch layouts",
        initial, depleted, recovered, firedAgain, skill });
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  if (capture) {
    const validation = before ? {} : JSON.parse(await readFile(join(out, "validation.json"), "utf8"));
    validation[before ? "before_checks" : "after_checks"] = checks;
    validation.no_mana_inventory_or_clock_fast_forward = true; validation.no_user_save_access = true;
    await writeFile(join(out, "validation.json"), JSON.stringify(validation, null, 2) + "\n");
  }
  console.log(`MANA_FEEDBACK_OK ${checks.length} ${version} sessions; actual depletion/release/natural recovery/re-attack/Nova; ${screenshots.length} viewport originals; ${engine}; ${engine === "chromium" ? "touch holds native" : "holds keyboard, touch skill native"}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve();
  const browser = await chromium.launch({ headless: true });
  try { await testManaFeedback(browser, origin, { capture: process.argv.includes("--capture"), before: process.argv.includes("--before") }); }
  finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
}
