import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, serve, launch, enterPlay } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const baseline = "326e686bc23893b9bfcb8464d45d84e10c4c7595";
const out = join(ROOT, "evidence", "ui-review-2026-11-06", "planting-feedback");
const generic = "靠近工作台按 E 合成，靠近祭坛按 E 献祭。对着空田按 E 也能播种。";
const refusal = "没有种子了。收麦可以再拿到种子。";
const modes = [
  { width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true }, { width: 1280, height: 800, touch: false },
];
const cases = [
  { id: "exhausted-day", capture: true }, { id: "exhausted-night", night: true, capture: true },
  { id: "last-seed", spend: 1 }, { id: "no-target", target: "grass" },
  { id: "bench-priority", target: "bench" }, { id: "altar-priority", target: "altar" },
];

export async function testPlantingFeedback(browser, origin, { before = false, capture = false } = {}) {
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
      const page = await context.newPage(), errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      for (const c of cases) {
        await page.goto(origin);
        await enterPlay(page, "knight");
        const startInv = await page.evaluate(() => ({ ...window.CUBE.getState().inv }));
        await page.evaluate(() => {
          const s = window.CUBE.getState();
          s.player.x = 30 * 16 + 8; s.player.y = 25 * 16 + 8;
          s.player.dir = 3; s.player.vx = s.player.vy = 0;
          for (let y = 23; y <= 27; y++) for (let x = 28; x <= 34; x++) s.tiles[y * 48 + x] = 1;
          for (let x = 30; x <= 32; x++) s.tiles[24 * 48 + x] = 7;
        });
        const interact = () => mode.touch ? page.locator("#touch-interact").tap() : page.keyboard.press("e");
        const spend = c.spend ?? startInv.seed;
        for (let i = 0; i < spend; i++) {
          await page.evaluate((i) => { window.CUBE.getState().player.x = (30 + i) * 16 + 8; }, i);
          await interact();
          await page.waitForFunction((i) => !!window.CUBE.getState().crops.get(`${30 + i},24`), i);
        }
        const front = await page.evaluate(({ spend, target, night }) => {
          const s = window.CUBE.getState(), p = s.player;
          p.x = (30 + spend) * 16 + 8;
          if (target === "bench" || target === "altar") { p.x = s[target].x; p.y = s[target].y + 12; }
          const tx = Math.floor(p.x / 16), ty = Math.floor((p.y - 14) / 16);
          s.tiles[ty * 48 + tx] = target === "grass" ? 1 : 7;
          if (night) {
            s.day = false; s.nights = 2; s.nightLen = 26; s.cycle = 0;
            s.wave = 1; s.wavesTotal = 3; s.toSpawn = 0;
            s.enemies = [{ kind: "slime", x: p.x + 70, y: p.y, vx: 0, vy: 0,
              hp: 100, maxHp: 100, spd: 0, dmg: 0, hit: 0, flash: 0, bob: 0 }];
          }
          return { tx, ty };
        }, { ...c, spend });
        const read = () => page.evaluate(({ tx, ty }) => {
          const s = window.CUBE.getState();
          return { inv: { ...s.inv }, tile: s.tiles[ty * 48 + tx],
            crop: s.crops.get(`${tx},${ty}`) || null, hp: s.player.hp,
            day: s.day, nights: s.nights, over: s.over, win: s.win,
            toast: document.getElementById("toast").textContent,
            touchLayout: matchMedia("(any-pointer: coarse), (max-width: 760px)").matches };
        }, front);
        const initial = await read();
        assert.deepEqual(initial.inv, { ...startInv, seed: startInv.seed - spend }, "only real planting consumes starting seeds");
        await interact();
        const expected = c.id === "last-seed" ? initial.toast
          : c.target === "bench" ? initial.toast
          : c.target === "altar" ? "还要再守 3 夜。天亮后才能献祭。"
          : c.target === "grass" || before ? generic : refusal;
        if (c.target === "bench") await page.waitForFunction(() => document.getElementById("toast").textContent.startsWith("还差："));
        else await page.waitForFunction((text) => document.getElementById("toast").textContent === text, expected);
        const first = await read();
        assert.deepEqual(first.inv, { ...initial.inv, seed: initial.inv.seed - (c.id === "last-seed" ? 1 : 0) });
        assert.equal(first.tile, c.id === "last-seed" ? 8 : initial.tile);
        assert.equal(first.crop?.stage ?? null, c.id === "last-seed" ? 0 : null);
        await interact();
        const repeated = await read();
        assert.deepEqual(repeated.inv, first.inv, "failed/repeated interaction must not spend resources");
        assert.equal(repeated.tile, first.tile);
        assert.equal(repeated.crop?.stage ?? null, first.crop?.stage ?? null);
        assert.equal(repeated.toast, c.id === "last-seed" ? generic : first.toast);
        assert.equal(repeated.hp, initial.hp);
        assert.equal(repeated.over, false); assert.equal(repeated.win, false);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const metrics = await inspect(page);
        assertFirstScreen(metrics, mode.touch);
        assert.deepEqual(metrics.viewport, viewport);
        assert.deepEqual(metrics.scroll, { x: 0, y: 0 });
        assert.equal(repeated.touchLayout, mode.touch);
        assert.equal(await page.locator("#touch-controls .held").count(), 0);
        if (!before && c.capture) {
          const toast = metrics.rects.toast, feed = metrics.rects["notice-feed"];
          assert.ok(toast.y >= feed.y && toast.bottom <= feed.bottom + 0.5, "existing seed refusal must fit bounded feedback");
        }
        const result = { front, startInv, spend, initial, first, repeated, metrics };
        checks.push({ screen_id: c.id, version, viewport, result });
        if (capture && c.capture && (mode.touch || !c.night)) {
          const filename = `${c.id}--${mode.width}x${mode.height}--${version}--${hash.slice(0, 8)}.png`;
          await mkdir(join(out, "images"), { recursive: true });
          await page.evaluate(() => { window.CUBE.getState().paused = true; });
          try { await page.screenshot({ path: join(out, "images", filename), fullPage: false }); }
          finally { await page.evaluate(() => { window.CUBE.getState().paused = false; }); }
          screenshots.push({
            screen_id: c.id, state: `${c.id} / ${version}`, version, viewport, language: "zh-CN",
            build: { sha, dirty, source_sha256: hash }, source: "isolated location/empty-soil fixture; real planting exhausts normal seeds",
            relative_image_path: `images/${filename}`, issue_ids: ["UI-014"], status: "已截",
            platform: `Web / ${browser.browserType().name()}`, ui_scale: "100%", device_scale_factor: 1, full_page: false,
            input: mode.touch ? "native touchscreen interaction taps" : "keyboard E", visual_review: "待协调人逐图审查",
            captured_at: new Date().toISOString(), result,
            repro_steps: [
              "隔离新上下文，正常选骑士，跳过开场/预演；不接触用户存档",
              "fixture仅玩家(30,25)面北与附近草地、三块空田，不注库存或作物阶段",
              "真实点交互或按E播种两次，用完初始两粒种子；移至第三空田，再交互两次",
              c.night ? "独立夜间fixture：第二夜26秒/波1/3，远处静止零伤害怪；非自然夜守" : "保持正常白天",
              "只拍照冻结模拟，真实首屏、100%缩放；保留实际库存/田与原生输入记录",
            ],
          });
          await writeFile(join(out, "screenshots.json"), JSON.stringify({ screenshots: [...previous, ...screenshots],
            visual_review: "待协调人逐图审查" }, null, 2) + "\n");
        }
        if (c.capture) {
          await page.keyboard.press("Space", { delay: 300 });
          assert.equal((await read()).toast, refusal, "unchanged gather/Space planting path already preserves refusal");
          assert.deepEqual((await read()).inv, first.inv);
          result.alternative_input = "keyboard Space hold/release (not a native touch hold)";
          result.alternative_refusal = (await read()).toast;
        }
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  if (capture) {
    const validation = before ? {} : JSON.parse(await readFile(join(out, "validation.json"), "utf8"));
    validation[before ? "before_checks" : "after_checks"] = checks;
    validation.no_inventory_or_crop_stage_injection = true;
    validation.no_user_save_access = true;
    await writeFile(join(out, "validation.json"), JSON.stringify(validation, null, 2) + "\n");
  }
  console.log(`PLANTING_FEEDBACK_OK ${checks.length} ${version} cases; real seed depletion + refusal/repeat/success/target priorities; ${screenshots.length} original PNGs`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve();
  const browser = await launch();
  try { await testPlantingFeedback(browser, origin, { capture: process.argv.includes("--capture"), before: process.argv.includes("--before") }); }
  finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
}
