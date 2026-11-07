import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve, enterPlay } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const baseline = "a11106c567b668e57ed38d775de243094660ed6b";
const out = join(ROOT, "evidence", "ui-review-2026-11-06", "crop-feedback");
const modes = [
  { width: 320, height: 568, touch: true },
  { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true },
  { width: 1280, height: 800, touch: false },
];

export async function testCropFeedback(browser, origin, { capture = false, before = false } = {}) {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const dirty = !!execFileSync("git", ["status", "--porcelain", "--", "index.html", "style.css", "game.js"],
    { cwd: ROOT, encoding: "utf8" }).trim();
  if (before) {
    assert.equal(sha, baseline);
    assert.equal(dirty, false, "before evidence must use the unchanged delivered product");
  }
  const engine = browser.browserType().name();
  if (capture) assert.equal(engine, "chromium", "touch screenshots require the native Chromium long-hold path");
  const hash = createHash("sha256").update(Buffer.concat(await Promise.all(
    ["index.html", "style.css", "game.js"].map((f) => readFile(join(ROOT, f)))))).digest("hex");
  const version = before ? "before" : "after";
  let existing = [];
  if (capture) {
    try { existing = JSON.parse(await readFile(join(out, "screenshots.json"), "utf8")).screenshots; }
    catch (e) { if (e.code !== "ENOENT") throw e; }
  }
  const previous = existing.filter((s) => s.version !== version || s.build.source_sha256 === hash);
  const screenshots = [], checks = [];
  for (const mode of modes) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, isMobile: mode.touch, hasTouch: mode.touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin);
      await enterPlay(page);
      await page.evaluate(() => {
        const s = window.CUBE.getState();
        s.player.x = 30 * 16 + 8; s.player.y = 25 * 16 + 8;
        s.player.dir = 3; s.player.vx = s.player.vy = 0;
        for (let y = 23; y <= 27; y++) for (let x = 28; x <= 32; x++) s.tiles[y * 48 + x] = 1;
        s.tiles[24 * 48 + 30] = 7;
      });
      const inventory = await page.evaluate(() => ({ ...window.CUBE.getState().inv }));
      if (mode.touch) await page.locator("#touch-interact").tap();
      else await page.keyboard.press("e");
      await page.waitForFunction(() => window.CUBE.getState().crops.get("30,24")?.stage === 0);
      assert.equal(await page.evaluate(() => window.CUBE.getState().inv.seed), inventory.seed - 1);
      const session = engine === "chromium" && mode.touch ? await context.newCDPSession(page) : null;
      const hold = async (harvest = false) => {
        const wait = () => harvest
          ? page.waitForFunction(() => window.CUBE.getState().tiles[24 * 48 + 30] === 7, null, { timeout: 5000 })
          : page.waitForTimeout(300);
        if (session) {
          const r = await page.locator('[data-hold="Space"]').boundingBox();
          await session.send("Input.dispatchTouchEvent", {
            type: "touchStart", touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }],
          });
          try {
            await page.waitForFunction(() => !!document.querySelector('[data-hold="Space"].held'));
            await wait();
          } finally { await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
        } else {
          await page.keyboard.down("Space");
          try { await wait(); } finally { await page.keyboard.up("Space"); }
        }
        await page.waitForFunction(() => !document.querySelector("#touch-controls .held"));
      };
      const expectedInventory = { ...inventory, seed: inventory.seed - 1 };
      const snapshot = async (id) => {
        const metrics = await inspect(page);
        assertFirstScreen(metrics, mode.touch);
        assert.deepEqual(metrics.scroll, { x: 0, y: 0 });
        const state = await page.evaluate(() => {
          const s = window.CUBE.getState();
          return { inv: { ...s.inv }, crop: s.crops.get("30,24") || null, tile: s.tiles[24 * 48 + 30],
            held: document.querySelectorAll("#touch-controls .held").length,
            touchLayout: matchMedia("(any-pointer: coarse), (max-width: 760px)").matches };
        });
        assert.equal(state.held, 0);
        assert.equal(state.touchLayout, mode.touch);
        if (!before && ["sprout", "growing"].includes(id)) {
          const p = metrics.rects.prompt, feed = metrics.rects["notice-feed"];
          assert.ok(p.y >= feed.y && p.bottom <= feed.bottom + 0.5, "growth feedback must fit the bounded feed");
        }
        checks.push({ screen_id: id, version, viewport, metrics, state });
        if (capture && (before ? ["sprout", "growing"].includes(id) : mode.touch || ["sprout", "growing"].includes(id))) {
          const old = existing.find((s) => s.screen_id === id && s.version === version
            && s.viewport.width === viewport.width && s.viewport.height === viewport.height && s.build.source_sha256 === hash);
          if (old) {
            screenshots.push(old);
            return;
          }
          const filename = `${id}--${mode.width}x${mode.height}--${version}--${hash.slice(0, 8)}.png`;
          await mkdir(join(out, "images"), { recursive: true });
          await page.evaluate(() => { window.CUBE.getState().paused = true; });
          try { await page.screenshot({ path: join(out, "images", filename), fullPage: false }); }
          finally { await page.evaluate(() => { window.CUBE.getState().paused = false; }); }
          screenshots.push({
            screen_id: id, state: `${id} / ${version}`, version, viewport, language: "zh-CN",
            build: { sha, dirty, source_sha256: hash }, source: "fixture setup / real planting and natural growth",
            platform: "Web / Chromium", ui_scale: "100%", device_scale_factor: 1, full_page: false,
            input: session ? "native touch E + CDP harvest long hold" : "keyboard E + Space hold",
            relative_image_path: `images/${filename}`, issue_ids: ["UI-012"], status: "已截",
            visual_review: "待协调人逐图审查", captured_at: new Date().toISOString(), metrics, game_state: state,
            repro_steps: [
              "隔离临时上下文，正常选骑士并跳过开场/预演；不接触用户存档",
              "fixture: 玩家(30,25)面向北、附近5×5草地、(30,24)空田；库存保持初始值，不注资源/作物或改时钟",
              "原生交互播种，扣初始种子1；正常等待两个生长阶段，再长按成熟麦收获",
              "sprout/growing为长按后仍未成熟，ripe为自然成熟收获前，harvested为实际收获后；仅截图时冻结模拟，真实首屏原图",
            ],
          });
          await writeFile(join(out, "screenshots.json"), JSON.stringify({ screenshots: [...previous.filter((s) =>
            !screenshots.some((n) => n.screen_id === s.screen_id && n.version === s.version
              && n.viewport.width === s.viewport.width && n.viewport.height === s.viewport.height)), ...screenshots],
            visual_review: "待协调人逐图审查" }, null, 2) + "\n");
        }
      };
      await page.waitForFunction(() => document.getElementById("toast").classList.contains("hidden"));
      for (const [id, stage] of [["sprout", 0], ["growing", 1]]) {
        await page.waitForFunction((stage) => window.CUBE.getState().crops.get("30,24")?.stage === stage, stage);
        await hold();
        assert.deepEqual(await page.evaluate(() => ({ ...window.CUBE.getState().inv })), expectedInventory,
          "immature crop must not yield resources or spend another seed");
        await page.waitForFunction((text) => document.getElementById("prompt").textContent === text,
          before ? "" : "麦苗还在长，成熟后再收。");
        await snapshot(id);
      }
      await page.waitForFunction(() => window.CUBE.getState().crops.get("30,24")?.stage === 2);
      await page.waitForFunction((text) => document.getElementById("prompt").textContent === text,
        mode.touch ? "按住「采集/攻击」收麦" : "按住左键收麦");
      await snapshot("ripe");
      await hold(true);
      await page.waitForFunction((inv) => {
        const s = window.CUBE.getState();
        return s.inv.wheat === inv.wheat + 1 && !s.drops.some((d) => d.kind === "wheat" || d.kind === "seed");
      }, expectedInventory);
      const harvested = await page.evaluate(() => ({
        replanted: window.CUBE.getState().crops.has("30,24"),
        tile: window.CUBE.getState().tiles[24 * 48 + 30], inv: { ...window.CUBE.getState().inv },
      }));
      assert.equal(harvested.tile, harvested.replanted ? 8 : 7);
      assert.deepEqual(harvested.inv,
        { ...inventory, wheat: inventory.wheat + 1, seed: inventory.seed - (harvested.replanted ? 1 : 0) },
        "original harvest yield/seed return and existing held-input replant cost must remain unchanged");
      await snapshot("harvested");
      await page.evaluate(() => {
        const s = window.CUBE.getState();
        s.tiles[24 * 48 + 30] = 8; s.crops.set("30,24", { stage: 1, grow: 0 });
        s.day = false; s.nights = 2;
        s.enemies = [{ kind: "slime", x: s.player.x + 70, y: s.player.y, vx: 0, vy: 0,
          hp: 100, maxHp: 100, spd: 0, dmg: 0, hit: 0, flash: 0, bob: 0 }];
      });
      await page.waitForFunction((text) => document.getElementById("prompt").textContent === text, mode.touch
        ? "守住篝火 · 按住「采集/攻击」 · 点「技能 Q」" : "守住篝火 · 左键攻击 · Q 技能");
      checks.push({ screen_id: "night-priority", version, viewport, result: "existing combat hint preserved" });
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  if (capture) {
    const validation = before ? {} : JSON.parse(await readFile(join(out, "validation.json"), "utf8"));
    validation[before ? "before_checks" : "after_checks"] = checks;
    validation.no_user_save_access = true;
    delete validation.no_clock_or_growth_injection;
    validation.growth_flow_no_clock_or_growth_injection = true;
    validation.night_priority_fixture = "After growth flow only: inject day=false, nights=2, stage1 crop and harmless far enemy; not a natural night";
    await writeFile(join(out, "validation.json"), JSON.stringify(validation, null, 2) + "\n");
  }
  console.log(`CROP_FEEDBACK_OK ${checks.length} ${version} checks; natural growth + unchanged harvest + night priority; ${screenshots.length} actual-viewport originals; ${engine}; harvest=${engine === "chromium" ? "native touch/keyboard" : "keyboard, touch E native"}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve();
  const browser = await chromium.launch({ headless: true });
  try { await testCropFeedback(browser, origin, { capture: process.argv.includes("--capture"), before: process.argv.includes("--before") }); }
  finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
}
