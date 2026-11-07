import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve, enterPlay } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const baseline = "a510ac1200163f88e5579d888df8ea772a38c57b";
const out = join(ROOT, "evidence", "ui-review-2026-11-06", "map-placement");

export async function testMapPlacement(browser, origin, { before = false, capture = false } = {}) {
  const engine = browser.browserType().name();
  const version = before ? "before" : "after", records = [], screenshots = [];
  const sha = before ? baseline : execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const currentGame = await readFile(join(ROOT, "game.js"), "utf8");
  let source = before ? execFileSync("git", ["show", `${baseline}:game.js`], { cwd: ROOT, encoding: "utf8" }) : currentGame;
  if (before && currentGame.includes("\r\n")) source = source.replace(/\r?\n/g, "\r\n");
  const product = await Promise.all(["index.html", "style.css"].map((f) => readFile(join(ROOT, f))));
  const hashOf = (game) => createHash("sha256").update(Buffer.concat([...product, Buffer.from(game)])).digest("hex");
  const productHash = hashOf(source);
  if (before) assert.equal(productHash, "4f1d7f51868a67b11a0003ac5454b9758e62b1c85c72c5b52a46fe5e66430145");
  const diagnostic = source
    .replace("window.CUBE = {", `window.__mapRead = () => ({ mouse: { ...mouse }, touchPending: typeof touchPressed === "undefined" ? false : touchPressed, aim: aimTile(), facing: facingTile(), front: frontTile(), camera: camera() });
  window.CUBE = {`)
    .replace("const clickPlace = mouse.pressed || rTap;", `const clickPlace = mouse.pressed || rTap;
    if (clickPlace) window.__mapConsumed = { ...window.__mapRead(), at: performance.now(), f, usingSpace, bumpRes, dir: p.dir, x: p.x, y: p.y };`)
    .replace(/const f = aimTile\(\);\r?\n      if \(placeable/, "const f = aimTile();\n      window.__mapPreview = { ...f };\n      if (placeable");
  assert.notEqual(diagnostic, source);
  const previous = capture && !before ? JSON.parse(await readFile(join(out, "screenshots.json"), "utf8")).screenshots
    .filter((s) => s.version === "before") : [];
  for (const mode of [
    { width: 844, height: 390, touch: true }, { width: 320, height: 568, touch: true },
    { width: 390, height: 844, touch: true }, { width: 1280, height: 800, touch: false },
  ]) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, isMobile: mode.touch, hasTouch: mode.touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/game.js", (route) => route.fulfill({ body: diagnostic, contentType: "text/javascript" }));
      await page.goto(origin);
      await enterPlay(page, "miner");
      const session = engine === "chromium" && mode.touch ? await context.newCDPSession(page) : null;
      const hold = async (key, predicate) => {
        if (session) {
          const r = await page.locator(`[data-hold="${key}"]`).boundingBox();
          await session.send("Input.dispatchTouchEvent", { type: "touchStart",
            touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }] });
        } else await page.keyboard.down(key);
        try { await page.waitForFunction(predicate); }
        finally {
          if (session) await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          else await page.keyboard.up(key);
        }
      };
      const select = async (kind) => {
        if (await page.evaluate((kind) => CUBE.getState().build === kind, kind)) return;
        if (mode.touch) {
          await page.locator("#play-details summary").tap();
          await page.locator(`.item[data-build="${kind}"]`).tap();
          await page.waitForFunction(() => !document.getElementById("play-details").open);
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        } else await page.keyboard.press({ torch: "2", fence: "1", plot: "3" }[kind]);
      };
      const point = (tx = 32, ty = 16) => page.evaluate(({ tx, ty }) => {
        const c = CUBE.cam(), r = document.getElementById("game").getBoundingClientRect();
        return { x: r.x + (tx * 16 + 8 - c.x) * r.width / 320,
          y: r.y + (ty * 16 + 8 - c.y) * r.height / 192 };
      }, { tx, ty });
      const tap = async (pos) => {
        if (mode.touch) await page.touchscreen.tap(pos.x, pos.y);
        else await page.mouse.click(pos.x, pos.y);
      };
      const read = () => page.evaluate(() => {
        const s = CUBE.getState(), c = document.getElementById("game");
        return { ...window.__mapRead(), preview: window.__mapPreview, dir: s.player.dir,
          x: s.player.x, y: s.player.y, inv: { ...s.inv }, day: s.day, nights: s.nights,
          hp: s.player.hp, campHp: s.campHp, held: document.querySelectorAll("#touch-controls .held").length,
          canvas: { rect: c.getBoundingClientRect().toJSON(), width: c.width, height: c.height, scale: c.dataset.scale } };
      });
      const snapshot = async (id, data) => {
        if (!capture) return;
        await page.evaluate(() => CUBE.getState().paused = true);
        try {
          const metrics = await inspect(page);
          assertFirstScreen(metrics, mode.touch);
          assert.deepEqual(metrics.scroll, { x: 0, y: 0 });
          const filename = `${id}--${mode.width}x${mode.height}--${version}--${productHash.slice(0, 8)}.png`;
          await mkdir(join(out, "images"), { recursive: true });
          await page.screenshot({ path: join(out, "images", filename), fullPage: false });
          screenshots.push({ screen_id: id, state: `${id} / ${version}`, version, viewport, language: "zh-CN",
            build: { sha, dirty: !before && currentGame !== execFileSync("git", ["show", "HEAD:game.js"],
              { cwd: ROOT, encoding: "utf8" }).replace(/\r?\n/g, currentGame.includes("\r\n") ? "\r\n" : "\n"),
              product_byte_sha256: productHash, source_sha256: hashOf(diagnostic) },
            source: "normal isolated miner; Git-memory baseline/current product plus read-only aim/preview/consumer instrumentation; no inventory/location/world/time injection; screenshot pause only",
            platform: `Web / ${engine}`, ui_scale: "100%", device_scale_factor: 1, full_page: false,
            relative_image_path: `images/${filename}`, issue_ids: ["UI-019"], status: "已截",
            visual_review: "待协调人逐图审查", captured_at: new Date().toISOString(), data, metrics,
            input: session ? "native Chromium direction/attack hold/end + build/map taps"
              : mode.touch ? "WebKit keyboard holds + native build/map taps" : "desktop keyboard/mouse",
            repro_steps: ["隔离正常矿工新局，采树，工作台缺料后走到(33,16)矿旁",
              "选火把点(32,16)，缺石拒绝；面朝东挖(34,16)并真实拾取",
              "不先左转，直接点左侧空地(32,16)；记录实际屏幕/画布/世界坐标、候选、面向与消费落点",
              "仅截图暂停模拟；只读观测桥无输入/玩法改写；后续合成事件边界检查不用于正常路径原图"] });
        } finally { await page.evaluate(() => CUBE.getState().paused = false); }
      };
      await hold("ArrowDown", () => CUBE.getState().player.y >= 358);
      await hold("ArrowRight", () => CUBE.getState().player.dir === 2);
      await hold("Space", () => CUBE.getState().inv.wood > 2);
      await hold("ArrowUp", () => CUBE.getState().player.y <= 316);
      if (mode.touch) await page.locator("#touch-interact").tap();
      else await page.keyboard.press("e");
      await page.waitForFunction(() => document.getElementById("toast").textContent === "还差：石 5、金 3、麦 3");
      await hold("ArrowRight", () => CUBE.getState().player.x >= 534);
      await hold("ArrowUp", () => CUBE.getState().player.y <= 266);
      await select("torch");
      let pos = await point();
      await tap(pos);
      await page.waitForFunction(() => document.getElementById("toast").textContent === "材料还差：石 1");
      await hold("ArrowRight", () => CUBE.getState().player.dir === 2);
      await hold("Space", () => CUBE.getState().inv.stone > 0);
      await page.evaluate(() => {
        window.__mapEvents = [];
        for (const type of ["pointerdown", "pointerup", "pointercancel", "lostpointercapture", "pointerout",
          "mousedown", "mouseup", "mousemove", "mouseleave"]) {
          document.getElementById("game").addEventListener(type, (e) => {
            window.__mapEvents.push({ type, at: performance.now(), trusted: e.isTrusted, x: e.clientX, y: e.clientY, pointerType: e.pointerType,
              ...window.__mapRead(), dir: CUBE.getState().player.dir });
          });
        }
        window.__mapConsumed = null;
      });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const prepared = await read();
      await snapshot("map-before-tap", prepared);
      pos = await point();
      await tap(pos);
      await page.waitForFunction(() => window.__mapConsumed !== null);
      const after = await page.evaluate(() => {
        const s = CUBE.getState();
        return { consumed: window.__mapConsumed, events: window.__mapEvents, inv: { ...s.inv },
          expectedTile: s.tiles[16 * 48 + 32], facingTile: s.tiles[16 * 48 + 34],
          message: document.getElementById("toast").textContent };
      });
      assert.equal(prepared.dir, 2);
      const logical = { x: (pos.x - prepared.canvas.rect.x) * 320 / prepared.canvas.rect.width,
        y: (pos.y - prepared.canvas.rect.y) * 192 / prepared.canvas.rect.height };
      const mapped = { tx: Math.floor((prepared.camera.x + logical.x) / 16),
        ty: Math.floor((prepared.camera.y + logical.y) / 16) };
      assert.deepEqual(mapped, { tx: 32, ty: 16 });
      assert.equal(after.inv.wood, prepared.inv.wood - 1);
      assert.equal(after.inv.stone, prepared.inv.stone - 1);
      assert.equal(after.message, "火把放好了。");
      if (!before) {
        assert.equal(after.expectedTile, 13);
        assert.notEqual(after.facingTile, 13);
        assert.deepEqual({ tx: after.consumed.f.tx, ty: after.consumed.f.ty }, mapped);
      } else assert.ok(after.expectedTile === 13 || after.facingTile === 13);
      const record = { engine, viewport, version, pos, logical, mapped, prepared, after,
        native_hold: !!session, source: "normal first-day input; read-only instrumentation, no state injection" };
      records.push(record);
      await snapshot("map-after-tap", record);
      console.log("MAP_PLACEMENT_TRACE", JSON.stringify(record));
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const released = await read();
      assert.equal(released.mouse.pressed, false);
      assert.equal(released.touchPending, false);
      assert.equal(released.held, 0);
      assert.deepEqual(released.inv, after.inv);
      assert.equal(released.hp, prepared.hp);
      assert.equal(released.campHp, prepared.campHp);
      assert.equal(released.day, true);
      assert.equal(released.nights, 0);
      if (!before && mode.width === 320) {
        const edge = async (kind, tx, expectedTile, cost = 1) => {
          await select(kind);
          const stock = (await read()).inv, target = await point(tx, 16);
          await page.evaluate(() => { window.__mapConsumed = null; });
          await tap(target);
          await page.waitForFunction(() => window.__mapConsumed !== null);
          const result = await page.evaluate(() => ({ f: window.__mapConsumed.f, inv: { ...CUBE.getState().inv } }));
          assert.equal(result.f.tx, expectedTile);
          assert.equal(result.f.ty, 16);
          assert.equal(result.inv.wood, stock.wood - cost);
          assert.equal(result.inv.stone, stock.stone);
          console.log("MAP_RANGE_OK", JSON.stringify({ tx, expectedTile, kind, stock, result }));
        };
        await edge("fence", 36, 34);
        await page.evaluate(() => document.getElementById("game").addEventListener("pointerup", () => {
          if (window.__compatLeave) document.getElementById("game").dispatchEvent(new MouseEvent("mouseleave"));
        }));
        await page.evaluate(() => { window.__compatLeave = true; });
        await edge("fence", 29, 32, 0);
        await edge("plot", 31, 31);
        console.log("MAP_COMPAT_LEAVE_OK native two-away tap + synthetic compatibility mouseleave; not normal screenshot evidence");
        await page.evaluate(() => { window.__compatLeave = false; });
        await select("torch");
        await page.evaluate(() => {
          const c = document.getElementById("game");
          c.addEventListener("pointerdown", (e) => {
            if (window.__abort === "blur") window.dispatchEvent(new Event("blur"));
            else if (window.__abort) c.dispatchEvent(new PointerEvent(window.__abort, {
              pointerId: e.pointerId, pointerType: e.pointerType }));
          });
        });
        for (const type of ["pointercancel", "lostpointercapture", "blur"]) {
          const stock = (await read()).inv;
          await page.evaluate((type) => { window.__mapConsumed = null; window.__abort = type; }, type);
          await tap(await point(32, 17));
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
          const result = await read();
          assert.equal(result.mouse.pressed, false);
          assert.equal(result.touchPending, false);
          assert.equal(result.mouse.down, false);
          assert.deepEqual(result.inv, stock);
          assert.equal(await page.evaluate(() => window.__mapConsumed), null);
          console.log("MAP_CANCEL_OK", type, "native tap + explicit synthetic lifecycle event; no world fixture");
        }
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  if (capture) {
    const validation = before ? {} : JSON.parse(await readFile(join(out, "validation.json"), "utf8"));
    validation[version] = records;
    await writeFile(join(out, "validation.json"), JSON.stringify(validation, null, 2) + "\n");
    await writeFile(join(out, "screenshots.json"), JSON.stringify({ screenshots: [...previous, ...screenshots] }, null, 2) + "\n");
  }
  console.log("MAP_PLACEMENT_OK", engine, version, records.length, "normal paths;", screenshots.length, "original PNGs");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve(), browser = await chromium.launch({ headless: true });
  try { await testMapPlacement(browser, origin, { before: process.argv.includes("--before"), capture: process.argv.includes("--capture") }); }
  finally { await browser.close(); await new Promise((r) => server.close(r)); }
}
