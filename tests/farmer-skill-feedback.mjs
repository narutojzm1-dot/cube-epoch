import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, serve, launch, enterPlay } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const baseline = "557c41e17103c9593789e44ffe2b3a148cb13f34";
const out = join(ROOT, "evidence", "ui-review-2026-11-06", "farmer-skill-feedback");
const cases = [
  { id: "ripe-full", message: "没有待催熟的麦苗，生命已满。", desktop: true },
  { id: "empty-hurt", empty: true, hurt: 10, message: "没有待催熟的麦苗，回复生命。" },
  { id: "growing-full", plants: 1, message: "催熟 1 块麦田，生命已满。" },
  { id: "growing-hurt-night", plants: 1, hurt: 40, night: true, message: "催熟 1 块麦田，回复生命。", desktop: true },
  { id: "growing-two", plants: 2, message: "催熟 2 块麦田，生命已满。", noCapture: true },
];
const modes = [
  { width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true }, { width: 1280, height: 800, touch: false },
];

export async function testFarmerSkillFeedback(browser, origin, { capture = false, before = false } = {}) {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const dirty = !!execFileSync("git", ["status", "--porcelain", "--", "index.html", "style.css", "game.js"],
    { cwd: ROOT, encoding: "utf8" }).trim();
  if (before) {
    assert.equal(sha, baseline);
    assert.equal(dirty, false, "before originals require the unchanged delivered product");
  }
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
        await enterPlay(page, "farmer");
        if (c.empty || c.plants) {
          await page.evaluate(({ empty, plants }) => {
            const s = window.CUBE.getState();
            s.player.x = 30 * 16 + 8; s.player.y = 25 * 16 + 8;
            s.player.dir = 3; s.player.vx = s.player.vy = 0;
            for (let y = 23; y <= 27; y++) for (let x = 28; x <= 32; x++) s.tiles[y * 48 + x] = 1;
            if (empty) {
              for (const key of s.crops.keys()) {
                const [x, y] = key.split(",").map(Number);
                s.tiles[y * 48 + x] = 7;
              }
              s.crops.clear();
            }
            for (let i = 0; i < (plants || 0); i++) s.tiles[24 * 48 + 30 + i] = 7;
          }, c);
        }
        const inventory = await page.evaluate(() => ({ ...window.CUBE.getState().inv }));
        for (let i = 0; i < (c.plants || 0); i++) {
          await page.evaluate((i) => { window.CUBE.getState().player.x = (30 + i) * 16 + 8; }, i);
          if (mode.touch) await page.locator("#touch-interact").tap();
          else await page.keyboard.press("e");
          await page.waitForFunction((i) => !!window.CUBE.getState().crops.get(`${30 + i},24`), i);
        }
        await page.evaluate(({ hurt, night }) => {
          const s = window.CUBE.getState();
          if (hurt) s.player.hp = s.player.maxHp - hurt;
          if (night) {
            s.day = false; s.nights = 2; s.nightLen = 26; s.cycle = 0;
            s.wave = 1; s.wavesTotal = 3; s.toSpawn = 0;
            s.enemies = [{ kind: "slime", x: s.player.x + 70, y: s.player.y, vx: 0, vy: 0,
              hp: 100, maxHp: 100, spd: 0, dmg: 0, hit: 0, flash: 0, bob: 0 }];
          }
        }, c);
        const read = () => page.evaluate(() => {
          const s = window.CUBE.getState();
          return { hp: s.player.hp, maxHp: s.player.maxHp, cd: s.player.skillCd,
            inv: { ...s.inv }, crops: [...s.crops].map(([key, crop]) => ({ key, ...crop })),
            day: s.day, nights: s.nights, over: s.over,
            touchLayout: matchMedia("(any-pointer: coarse), (max-width: 760px)").matches };
        });
        const initial = await read();
        assert.equal(initial.crops.filter((c) => c.stage < 2).length, c.plants || 0);
        assert.deepEqual(initial.inv, { ...inventory, seed: inventory.seed - (c.plants || 0) },
          "planting must use starting seeds, without injected inventory");
        const activate = () => mode.touch ? page.locator("#touch-skill").tap() : page.keyboard.press("q");
        await activate();
        const message = before ? "田里的麦子一下熟了。" : c.message;
        await page.waitForFunction((text) => document.getElementById("toast").textContent === text, message);
        const first = await read();
        assert.equal(first.hp, Math.min(initial.maxHp, initial.hp + 24), "original healing and cap must not change");
        assert.ok(first.cd > 0 && first.cd <= 11, "cast still starts the original cooldown, even with no effect");
        assert.deepEqual(first.inv, initial.inv, "skill must not harvest or consume inventory");
        assert.deepEqual(first.crops, initial.crops.map((c) => ({ ...c, stage: 2, grow: 0 })),
          "original global ripening/grow reset must remain unchanged");
        await activate();
        const repeated = await read();
        assert.equal(repeated.hp, first.hp, "cooldown repeat must not heal again");
        assert.ok(repeated.cd <= first.cd, "cooldown repeat must not restart cooldown");
        assert.deepEqual(repeated.inv, first.inv);
        assert.deepEqual(repeated.crops, first.crops);
        assert.equal(repeated.over, false);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const metrics = await inspect(page);
        assertFirstScreen(metrics, mode.touch);
        assert.deepEqual(metrics.scroll, { x: 0, y: 0 });
        assert.equal(repeated.touchLayout, mode.touch);
        const toast = metrics.rects.toast, feed = metrics.rects["notice-feed"];
        assert.ok(toast.y >= feed.y && toast.bottom <= feed.bottom + 0.5, "skill feedback must fit the bounded feed");
        assert.equal(await page.locator("#touch-controls .held").count(), 0);
        const result = { initial, first, repeated, metrics, message };
        checks.push({ screen_id: c.id, version, viewport, result });
        if (capture && !c.noCapture && (mode.touch || c.desktop)) {
          const filename = `${c.id}--${mode.width}x${mode.height}--${version}--${hash.slice(0, 8)}.png`;
          await mkdir(join(out, "images"), { recursive: true });
          await page.evaluate(() => { window.CUBE.getState().paused = true; });
          try { await page.screenshot({ path: join(out, "images", filename), fullPage: false }); }
          finally { await page.evaluate(() => { window.CUBE.getState().paused = false; }); }
          screenshots.push({
            screen_id: c.id, state: `${c.id} / ${version}`, version, viewport, language: "zh-CN",
            build: { sha, dirty, source_sha256: hash }, source: c.id === "ripe-full" ? "normal player entry" : "isolated fixture / real planting and skill input",
            platform: `Web / ${browser.browserType().name()}`, ui_scale: "100%", device_scale_factor: 1, full_page: false,
            input: mode.touch ? "native touchscreen taps" : "keyboard E/Q",
            relative_image_path: `images/${filename}`, issue_ids: ["UI-013"], status: "已截",
            visual_review: "待协调人逐图审查", captured_at: new Date().toISOString(), result,
            repro_steps: [
              "隔离临时上下文；正常选农夫，跳过开场/预演，不接触用户存档",
              c.id === "ripe-full" ? "正常首局，初始三田成熟、生命100/100，无状态注入"
                : `fixture: 玩家(30,25)面北，附近草地/空田；空作物=${!!c.empty}，伤血=${c.hurt || 0}；不注库存/作物阶段`,
              c.plants ? `真实交互播种${c.plants}块，扣初始种子；不快进生长` : "没有额外播种",
              c.night ? "独立夜间夹具：第二夜26秒/波1/3、远处零伤害静止怪；非自然夜守" : "保持正常白天",
              "真实点技能或按Q，再在冷却中重复一次；仅拍图冻结模拟，100%缩放真实首屏",
            ],
          });
          await writeFile(join(out, "screenshots.json"), JSON.stringify({ screenshots: [...previous, ...screenshots],
            visual_review: "待协调人逐图审查" }, null, 2) + "\n");
        }
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  if (capture) {
    const validation = before ? {} : JSON.parse(await readFile(join(out, "validation.json"), "utf8"));
    validation[before ? "before_checks" : "after_checks"] = checks;
    validation.no_user_save_access = true;
    await writeFile(join(out, "validation.json"), JSON.stringify(validation, null, 2) + "\n");
  }
  console.log(`FARMER_SKILL_FEEDBACK_OK ${checks.length} ${version} cases; actual ripening/heal + cap/cooldown/inventory guards; ${screenshots.length} original PNGs`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve();
  const browser = await launch();
  try { await testFarmerSkillFeedback(browser, origin, { capture: process.argv.includes("--capture"), before: process.argv.includes("--before") }); }
  finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
}
