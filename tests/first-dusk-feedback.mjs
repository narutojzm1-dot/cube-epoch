import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve, enterPlay } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const out = join(ROOT, "evidence", "ui-review-2026-11-06", "first-dusk-feedback");
const baseline = "e1a86b4bf227d4e09be31ac8cc3f7442d22cee2a";

export async function testFirstDusk(browser, origin, { before = false, capture = false } = {}) {
  const natural = true;
  const engine = browser.browserType().name(), version = before ? "before" : "after";
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const dirty = !!execFileSync("git", ["status", "--porcelain", "--", "index.html", "style.css", "game.js"],
    { cwd: ROOT, encoding: "utf8" }).trim();
  if (before) { assert.equal(sha, baseline); assert.equal(dirty, false); }
  const hash = createHash("sha256").update(Buffer.concat(await Promise.all(
    ["index.html", "style.css", "game.js"].map((f) => readFile(join(ROOT, f)))))).digest("hex");
  const file = join(out, "screenshots.json");
  const manifest = existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : { screenshots: [] };
  const records = [];
  const context = await browser.newContext({ viewport: { width: 320, height: 568 },
    isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage(), errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const session = engine === "chromium" ? await context.newCDPSession(page) : null;
    const read = () => page.evaluate(() => {
      const s = CUBE.getState(), p = s.player;
      return { day: s.day, time: s.time, cycle: s.cycle, dayLen: s.dayLen, nightLen: s.nightLen,
        nights: s.nights, wave: s.wave, wavesTotal: s.wavesTotal, toSpawn: s.toSpawn,
        build: s.build, inv: { ...s.inv }, hp: p.hp, campHp: s.campHp, mana: p.mana,
        x: p.x, y: p.y, dir: p.dir, bolts: s.bolts.length,
        near: s.enemies.filter((e) => Math.hypot(e.x - p.x, e.y - p.y) < 42).length,
        enemies: s.enemies.map((e) => ({ kind: e.kind, x: e.x, y: e.y, hp: e.hp })),
        objective: document.getElementById("objective").textContent,
        target: CUBE.currentTarget(), guide: document.getElementById("guide-title").textContent,
        prompt: document.getElementById("prompt").textContent,
        banner: document.getElementById("build-banner").textContent,
        toast: document.getElementById("toast").textContent,
        placed: s.tiles[22 * 48 + 23], storedTile: s.tiles[22 * 48 + 25] };
    });
    const hold = async (key, predicate) => {
      assert.ok(session, "ordinary mobile path requires native Chromium touch holds");
      const r = await page.locator(`[data-hold="${key}"]`).boundingBox();
      await session.send("Input.dispatchTouchEvent", { type: "touchStart",
        touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }] });
      try { await page.waitForFunction(predicate); }
      finally { await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
    };
    const select = async () => {
      await page.locator("#play-details summary").tap();
      await page.locator('.item[data-build="torch"]').tap();
      await page.waitForFunction(() => !document.getElementById("play-details").open);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    };
    const point = (tx, ty) => page.evaluate(({ tx, ty }) => {
      const r = document.getElementById("game").getBoundingClientRect(), c = CUBE.cam();
      return { x: r.x + (tx * 16 + 8 - c.x) * r.width / 320,
        y: r.y + (ty * 16 + 8 - c.y) * r.height / 192 };
    }, { tx, ty });
    const snapshot = async (id) => {
      if (!capture) return;
      const paused = await page.evaluate(() => CUBE.getState().paused);
      await page.evaluate(() => CUBE.getState().paused = true);
      try {
        const viewport = page.viewportSize(), data = await read(), metrics = await inspect(page);
        assertFirstScreen(metrics, true);
        const filename = `${id}--${viewport.width}x${viewport.height}--${version}--${hash.slice(0, 8)}.png`;
        await mkdir(join(out, "images"), { recursive: true });
        await page.screenshot({ path: join(out, "images", filename), fullPage: false });
        const row = { screen_id: id, state: `${id} / ${version}`, version, viewport, language: "zh-CN",
          build: { sha, dirty, source_sha256: hash }, platform: `Web / ${engine}`, ui_scale: "100%",
          device_scale_factor: 1, full_page: false, relative_image_path: `images/${filename}`,
          issue_ids: ["UI-022"], status: "已截", visual_review: "待协调逐图审查",
          source: natural ? `ordinary isolated mage game: native mobile gathering/stored torch placement, natural first${data.dayLen}s day/night/waves; no stock/world/location/time/source injection; screenshot pause only`
            : "explicit independent night fixture; not natural survival",
          input: "native Chromium touch holds/end and backpack/map taps; same natural320 game resized for real390/844 viewports",
          repro_steps: ["普通隔离法师新局，方向移动至树旁，实际长按采集拾木",
            `选火点(25,22)空地，用初始成品；不加快时间，等原${data.dayLen}秒首日自然进入第一夜`,
            "观察目标、教程、保留建造选择及波次；等自然怪贴近，取消再选火",
            "记录选择提示，再原生按住(23,22)空地至法力实际消耗，核对是否放置及库存",
            "390/844是同一普通游戏的实际新视口渲染，不把320原图缩放；截图只暂停，不修改玩家存档"],
          captured_at: new Date().toISOString(), data, metrics };
        manifest.screenshots = manifest.screenshots.filter((r) => !(r.screen_id === id && r.version === version
          && r.viewport.width === viewport.width));
        manifest.screenshots.push(row);
        await writeFile(file, JSON.stringify(manifest, null, 2) + "\n");
      } finally { await page.evaluate((v) => CUBE.getState().paused = v, paused); }
    };
    await page.goto(origin); await enterPlay(page, "mage");
    if (natural) {
      const initial = await read();
      await hold("ArrowDown", () => CUBE.getState().player.y >= 358);
      await hold("ArrowRight", () => CUBE.getState().player.dir === 2);
      await hold("Space", () => CUBE.getState().inv.wood > 2);
      await select();
      await page.waitForFunction(() => CUBE.getState().hitstop <= 0);
      const firstPoint = await point(25, 22);
      await page.touchscreen.tap(firstPoint.x, firstPoint.y);
      await page.waitForFunction(() => CUBE.getState().tiles[22 * 48 + 25] === 13);
      const prepared = await read();
      assert.equal(prepared.inv.torch, initial.inv.torch - 1);
      await snapshot("day-prepared");
      await page.waitForFunction(() => !CUBE.getState().day, null, { timeout: 120000 });
      const dusk = await read();
      assert.equal(dusk.nights, 1); assert.equal(dusk.wavesTotal, 2);
      assert.equal(dusk.build, "torch"); assert.ok(dusk.objective.includes("守住篝火"));
      assert.equal(dusk.target.kind, "camp"); assert.ok(dusk.guide.includes("守住篝火"));
      await snapshot("first-night");
      await page.waitForFunction(() => {
        const s = CUBE.getState(), p = s.player;
        return s.day || s.enemies.some((e) => Math.hypot(e.x - p.x, e.y - p.y) < 40);
      }, null, { timeout: 35000 });
      assert.equal((await read()).day, false, "natural first night must actually reach the close-enemy scenario");
      for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(viewport);
        await select(); await select();
        const selected = await read();
        assert.ok(selected.near > 0); assert.equal(selected.build, "torch");
        if (!before) assert.match(selected.toast, /按住.*攻击/);
        await snapshot("near-enemy-selected");
        const p = await point(23, 22), stock = { ...selected.inv };
        const mana = selected.mana;
        await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...p, id: 1 }] });
        try { await page.waitForFunction((mana) => CUBE.getState().player.mana < mana - 0.5, mana); }
        finally { await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
        const acted = await read();
        assert.deepEqual(acted.inv, stock); assert.notEqual(acted.placed, 13);
        records.push({ viewport, initial, prepared, firstPoint, dusk, selected, p, acted });
      }
    }
    assert.deepEqual(errors, []);
    if (capture) {
      const f = join(out, "validation.json"), v = existsSync(f) ? JSON.parse(await readFile(f, "utf8")) : {};
      v[`${version}-${natural ? "natural" : "fixture"}`] = records;
      await writeFile(f, JSON.stringify(v, null, 2) + "\n");
    }
    console.log("FIRST_DUSK_OK", engine, version, natural ? "normal natural first day/night" : "fixture", JSON.stringify(records));
  } finally { await context.close(); }
}

export async function testBuildCombatFeedback(browser, origin, { before = false, capture = false } = {}) {
  const engine = browser.browserType().name(), version = before ? "before" : "after";
  const files = ["index.html", "style.css", "game.js"];
  const buffers = await Promise.all(files.map((f) => before
    ? execFileSync("git", ["show", `${baseline}:${f}`], { cwd: ROOT }) : readFile(join(ROOT, f))));
  const hash = createHash("sha256").update(Buffer.concat(buffers)).digest("hex");
  const build = { sha: before ? baseline : execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(),
    dirty: !before && !!execFileSync("git", ["status", "--porcelain", "--", ...files], { cwd: ROOT, encoding: "utf8" }).trim(),
    source_sha256: hash };
  const file = join(out, "screenshots.json");
  const manifest = capture && existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : { screenshots: [] };
  const records = [];
  for (const mode of [{ width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
    { width: 844, height: 390, touch: true }, { width: 1280, height: 800, touch: false }]) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, isMobile: mode.touch, hasTouch: mode.touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      if (before) await page.route("**/*", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const i = path === "/" ? 0 : files.findIndex((f) => path === "/" + f);
        if (i < 0) await route.continue();
        else await route.fulfill({ status: 200, body: buffers[i],
          contentType: ["text/html", "text/css", "application/javascript"][i] });
      });
      const session = engine === "chromium" && mode.touch ? await context.newCDPSession(page) : null;
      const activate = (selector) => mode.touch ? page.locator(selector).tap() : page.locator(selector).click();
      const select = async (kind) => {
        if (mode.touch) {
          await activate("#play-details summary"); await activate(`.item[data-build="${kind}"]`);
          await page.waitForFunction(() => !document.getElementById("play-details").open);
        } else await page.keyboard.press({ fence: "1", torch: "2", plot: "3" }[kind]);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      };
      const read = () => page.evaluate(() => {
        const s = CUBE.getState();
        return { inv: { ...s.inv }, mana: s.player.mana, build: s.build, tile: s.tiles[21 * 48 + 23],
          fenceHp: s.fenceHp.get("23,21"), toast: document.getElementById("toast").textContent,
          banner: document.getElementById("build-banner").textContent, day: s.day, hp: s.player.hp, campHp: s.campHp };
      });
      const point = () => page.evaluate(() => {
        const c = CUBE.cam(), r = document.getElementById("game").getBoundingClientRect();
        return { x: r.x + (376 - c.x) * r.width / 320, y: r.y + (344 - c.y) * r.height / 192 };
      });
      const prepare = async (distance, tile = 1) => {
        await page.goto(origin); await enterPlay(page, "mage");
        await page.evaluate(({ distance, tile }) => {
          const s = CUBE.getState();
          s.day = false; s.nights = 1; s.cycle = 1; s.wave = 1; s.wavesTotal = 2; s.toSpawn = 0;
          s.tiles[21 * 48 + 23] = tile;
          if (tile === 12) s.fenceHp.set("23,21", 20);
          s.enemies = [{ kind: "slime", x: s.player.x + distance, y: s.player.y, vx: 0, vy: 0,
            hp: 1000, maxHp: 1000, spd: 0, dmg: 0, hit: 0, flash: 0, bob: 0 }];
        }, { distance, tile });
        await page.waitForFunction(() => !document.getElementById("wave-banner").classList.contains("hidden"));
      };
      const holdMap = async (predicate) => {
        const p = await point();
        if (session) await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...p, id: 1 }] });
        else { await page.mouse.move(p.x, p.y); await page.mouse.down(); }
        try { await page.waitForFunction(predicate); }
        finally {
          if (session) await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          else await page.mouse.up();
        }
        return p;
      };
      const snapshot = async (id, overlay = false) => {
        if (!capture) return;
        const paused = await page.evaluate(() => CUBE.getState().paused);
        await page.evaluate(() => CUBE.getState().paused = true);
        try {
          const metrics = await inspect(page); if (!overlay) assertFirstScreen(metrics, mode.touch);
          const filename = `${id}--${mode.width}x${mode.height}--${version}--${hash.slice(0, 8)}.png`;
          await mkdir(join(out, "images"), { recursive: true });
          await page.screenshot({ path: join(out, "images", filename), fullPage: false });
          const row = { screen_id: id, state: `${id} / ${version}`, version, viewport, language: "zh-CN", build,
            platform: `Web / ${engine}`, ui_scale: "100%", device_scale_factor: 1, full_page: false,
            source: `isolated night fixture: initial mage stock, slime distance41/speed0/damage0/hp1000, left tilegrass; no natural survival claim; ${before ? "Git e1a86b4 products served in memory, worktree untouched" : "current product bytes"}; screenshot pause only`,
            input: session ? "native Chromium map holds/end and backpack/help taps" : "native mouse map holds, touch-layout backpack taps or desktop keyboard/mouse",
            relative_image_path: `images/${filename}`, issue_ids: ["UI-022"], status: "已截",
            visual_review: "待协调逐图审查", data: await read(), metrics, captured_at: new Date().toISOString(),
            repro_steps: ["隔离法师新局后明确设置首夜波1/2、cycle1、无伤静止怪距41及(23,21)草地",
              "真实选火，查看当前反馈及怎么玩里的原建造说明；不自动滚入",
              "真实按住左侧空地至法力下降，释放；库存不扣、没有火把；42距离另独立真实放置正向回归",
              "另独立选栏修20血墙，以及近怪指向树长按采集，保持原1木修理和采集优先"] };
          manifest.screenshots = manifest.screenshots.filter((r) => !(r.screen_id === id && r.version === version
            && r.viewport.width === viewport.width));
          manifest.screenshots.push(row);
          await writeFile(file, JSON.stringify(manifest, null, 2) + "\n");
        } finally { await page.evaluate((v) => CUBE.getState().paused = v, paused); }
      };
      for (const kind of ["fence", "torch", "plot"]) {
        await prepare(41); await select(kind);
        const selected = await read();
        if (!before) {
          assert.match(selected.toast, /按住.*攻击/); assert.match(selected.banner, /怪远离再/);
          assert.ok(selected.banner.includes(mode.touch ? "按住空地" : "在空地按住左键"));
        }
        if (kind === "torch") {
          await snapshot("fixture-near-torch");
          if (mode.touch) {
            await activate("#btn-help");
            const body = await page.locator("#overlay-body").textContent();
            assert.ok(body.includes(selected.banner));
            if (!before) {
              const visible = await page.evaluate(() => {
                const el = document.getElementById("overlay-body"), r = el.getBoundingClientRect();
                const text = document.getElementById("build-banner").textContent;
                const hint = text.slice(text.indexOf("近怪时"), text.indexOf("；"));
                const i = el.textContent.lastIndexOf(hint), range = document.createRange();
                range.setStart(el.firstChild, i); range.setEnd(el.firstChild, i + hint.length);
                const rects = [...range.getClientRects()];
                return rects.length > 0 && rects.every((s) => s.top >= r.top && s.bottom <= r.bottom);
              });
              assert.equal(visible, true, "existing help must expose the full new held-map caution");
            }
            await snapshot("fixture-near-help", true);
            await activate("#overlay-actions button:first-child");
          }
        }
        const p = await holdMap(() => CUBE.getState().player.mana < 7.5);
        const acted = await read(); assert.deepEqual(acted.inv, selected.inv); assert.equal(acted.tile, 1);
        records.push({ viewport, kind, distance: 41, selected, p, acted });
        await prepare(42); await select(kind);
        const far = await read(); assert.ok(!far.banner.includes("近怪时"));
        await holdMap(() => [12, 13, 7, 8].includes(CUBE.getState().tiles[21 * 48 + 23]));
        const placed = await read();
        if (kind === "plot") {
          assert.ok([7, 8].includes(placed.tile));
          assert.equal(placed.inv.seed, far.inv.seed - (placed.tile === 8 ? 1 : 0),
            "continued hold may sow the newly opened plot under the original rules");
        } else assert.equal(placed.tile, { fence: 12, torch: 13 }[kind]);
        if (kind === "torch") assert.equal(placed.inv.torch, far.inv.torch - 1);
        else assert.equal(placed.inv.wood, far.inv.wood - (kind === "fence" ? 2 : 1));
        records.push({ viewport, kind, distance: 42, selected: far, placed });
      }
      await prepare(41, 12); await select("fence");
      const wall = await read(), p = await point();
      if (mode.touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
      await page.waitForFunction(() => CUBE.getState().fenceHp.get("23,21") === 80);
      const repaired = await read(); assert.equal(repaired.inv.wood, wall.inv.wood - 1);
      records.push({ viewport, repair: true, wall, repaired });
      await prepare(41, 6); await select("torch");
      await holdMap(() => CUBE.getState().tiles[21 * 48 + 23] === 2);
      const gathered = await read(); assert.equal(gathered.mana, 8); assert.equal(gathered.inv.torch, 1);
      records.push({ viewport, resource_priority: true, gathered });
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  if (capture) {
    const f = join(out, "validation.json"), v = existsSync(f) ? JSON.parse(await readFile(f, "utf8")) : {};
    v[`${version}-fixture`] = records; await writeFile(f, JSON.stringify(v, null, 2) + "\n");
  }
  console.log("BUILD_COMBAT_FEEDBACK_OK", engine, version, records.length,
    "fixture cases: actual held attacks/no spending,42 placement,near repair and resource priority");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve(), browser = await chromium.launch({ headless: true });
  try {
    const test = process.argv.includes("--natural") ? testFirstDusk : testBuildCombatFeedback;
    await test(browser, origin, { before: process.argv.includes("--before"), capture: process.argv.includes("--capture") });
  }
  finally { await browser.close(); await new Promise((r) => server.close(r)); }
}
