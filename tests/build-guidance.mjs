import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve, enterPlay } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const baseline = "62de00aa750d1b2054783fca83354fb2beeec3d8";
const out = join(ROOT, "evidence", "ui-review-2026-11-06", "build-guidance");
const modes = [
  { width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true }, { width: 1280, height: 800, touch: false },
];

export async function testBuildGuidance(browser, origin, { before = false, capture = false } = {}) {
  const engine = browser.browserType().name(), version = before ? "before" : "after";
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const dirty = !!execFileSync("git", ["status", "--porcelain", "--", "index.html", "style.css", "game.js"],
    { cwd: ROOT, encoding: "utf8" }).trim();
  if (before) { assert.equal(sha, baseline); assert.equal(dirty, false); }
  const hash = createHash("sha256").update(Buffer.concat(await Promise.all(
    ["index.html", "style.css", "game.js"].map((f) => readFile(join(ROOT, f)))))).digest("hex");
  const previous = capture && !before ? JSON.parse(await readFile(join(out, "screenshots.json"), "utf8")).screenshots
    .filter((s) => s.version === "before") : [];
  const screenshots = [], records = [];
  for (const mode of modes) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, isMobile: mode.touch, hasTouch: mode.touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const session = engine === "chromium" && mode.touch ? await context.newCDPSession(page) : null;
      const activate = (selector) => mode.touch ? page.locator(selector).tap() : page.locator(selector).click();
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
      const select = async () => {
        if (mode.touch) {
          await activate("#play-details summary");
          await activate('.item[data-build="torch"]');
          await page.waitForFunction(() => !document.getElementById("play-details").open);
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        } else {
          await page.keyboard.press("2");
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        }
      };
      const tapTile = async (tx, ty) => {
        const point = await page.evaluate(({ tx, ty }) => {
          const c = CUBE.cam(), r = document.getElementById("game").getBoundingClientRect();
          return { x: r.x + (tx * 16 + 8 - c.x) * r.width / 320,
            y: r.y + (ty * 16 + 8 - c.y) * r.height / 192 };
        }, { tx, ty });
        if (mode.touch) await page.touchscreen.tap(point.x, point.y);
        else await page.mouse.click(point.x, point.y);
        return point;
      };
      const read = () => page.evaluate(() => {
        const s = CUBE.getState(), feed = document.getElementById("notice-feed"), f = feed.getBoundingClientRect();
        const banner = document.getElementById("build-banner"), text = banner.firstChild;
        const phrase = "再点背包同一项取消", i = banner.textContent.indexOf(phrase);
        let cancelRects = [];
        if (i >= 0 && text) {
          const range = document.createRange();
          range.setStart(text, i); range.setEnd(text, i + phrase.length);
          cancelRects = [...range.getClientRects()].map((r) => ({ top: r.top, bottom: r.bottom,
            fully_visible: r.top >= f.top && r.bottom <= f.bottom }));
        }
        return { inv: { ...s.inv }, build: s.build, day: s.day, nights: s.nights, paused: s.paused,
          hp: s.player.hp, campHp: s.campHp, hitstop: s.hitstop, dir: s.player.dir, x: s.player.x, y: s.player.y,
          held: document.querySelectorAll("#touch-controls .held").length,
          helpLabel: document.getElementById("btn-help").textContent,
          banner: banner.textContent, cancelRects, feed: { height: feed.clientHeight, full: feed.scrollHeight, top: feed.scrollTop },
          toast: document.getElementById("toast").textContent, firstTile: s.tiles[22 * 48 + 25],
          secondTile: s.tiles[23 * 48 + 25] };
      });
      const snapshot = async (id, data, overlay = false) => {
        if (!capture) return;
        const wasPaused = await page.evaluate(() => CUBE.getState().paused);
        await page.evaluate(() => CUBE.getState().paused = true);
        try {
          const metrics = await inspect(page);
          if (!overlay) assertFirstScreen(metrics, mode.touch);
          assert.deepEqual(metrics.scroll, { x: 0, y: 0 });
          const filename = `${id}--${mode.width}x${mode.height}--${version}--${hash.slice(0, 8)}.png`;
          await mkdir(join(out, "images"), { recursive: true });
          await page.screenshot({ path: join(out, "images", filename), fullPage: false });
          screenshots.push({ screen_id: id, state: `${id} / ${version}`, version, viewport, language: "zh-CN",
            build: { sha, dirty, source_sha256: hash }, platform: `Web / ${engine}`,
            source: "normal isolated mage first day, actual tree pickup/stored torch placement/help/cancel; no stock/location/world/time injection; screenshot pause only; no source instrumentation",
            ui_scale: "100%", device_scale_factor: 1, full_page: false,
            relative_image_path: `images/${filename}`, issue_ids: ["UI-020"], status: "已截",
            visual_review: "待协调人逐图审查", data, metrics,
            captured_at: new Date().toISOString(),
            input: session ? "native Chromium holds/end + backpack/map/help/continue taps"
              : mode.touch ? "WebKit keyboard holds + native taps" : "desktop keyboard/mouse",
            repro_steps: ["隔离正常法师新局，下移一格并向右，真实砍(25,22)树并拾取木头",
              "选背包火，点刚砍出的空地(25,22)，优先消费初始成火把；保持建造选中",
              "检查限高说明的取消尾行；320原生滑动原反馈区，验证原滚动及取消可达",
              "点现有帮助按钮查看步骤；继续后再点背包火取消，再选择火点(25,23)，实际扣原木1",
              "不改玩家存档，原图只临时暂停；帮助由真实按钮主动暂停"] });
        } finally { await page.evaluate((paused) => { CUBE.getState().paused = paused; }, wasPaused); }
      };
      await page.goto(origin); await enterPlay(page, "mage");
      const initial = await read();
      await hold("ArrowDown", () => CUBE.getState().player.y >= 358);
      await hold("ArrowRight", () => CUBE.getState().player.dir === 2);
      await hold("Space", () => CUBE.getState().inv.wood > 2);
      const wood = await read();
      await select();
      console.log("BUILD_GUIDANCE_INPUT_READY", JSON.stringify({ viewport, hitstop: (await read()).hitstop }));
      await page.waitForFunction(() => CUBE.getState().hitstop <= 0);
      const firstPoint = await tapTile(25, 22);
      try {
        await page.waitForFunction(() => CUBE.getState().tiles[22 * 48 + 25] === 13);
      } catch (error) {
        const hit = await page.evaluate((p) => ({
          hit: document.elementFromPoint(p.x, p.y)?.outerHTML.slice(0, 200),
          canvas: document.getElementById("game").getBoundingClientRect().toJSON(),
        }), firstPoint);
        throw new Error(`first guidance placement ${engine} ${mode.width}: ${JSON.stringify({ firstPoint, hit, state: await read() })}`, { cause: error });
      }
      const selected = await read();
      assert.equal(selected.inv.torch, initial.inv.torch - 1);
      assert.equal(selected.inv.wood, wood.inv.wood);
      assert.equal(selected.build, "torch");
      assert.equal(selected.helpLabel, !before && mode.touch ? "建造说明" : "怎么玩");
      await snapshot("build-selected", selected);
      let pan = null;
      if (session && mode.width === 320) {
        assert.ok(selected.cancelRects.some((r) => !r.fully_visible));
        const r = await page.locator("#notice-feed").boundingBox(), x = r.x + r.width / 2;
        await session.send("Input.dispatchTouchEvent", { type: "touchStart",
          touchPoints: [{ x, y: r.y + r.height - 8, id: 1 }] });
        try {
          for (let i = 1; i <= 8; i++) {
            await session.send("Input.dispatchTouchEvent", { type: "touchMove",
              touchPoints: [{ x, y: r.y + r.height - 8 - i * 4, id: 1 }] });
            await page.waitForTimeout(16);
          }
        } finally { await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
        await page.waitForFunction(() => {
          const e = document.getElementById("notice-feed");
          return e.scrollTop >= e.scrollHeight - e.clientHeight - 1;
        });
        pan = await read();
        assert.ok(pan.cancelRects.every((r) => r.fully_visible));
        assert.deepEqual(pan.inv, selected.inv);
      }
      await activate("#btn-help");
      await page.waitForFunction(() => CUBE.getState().paused);
      const body = await page.locator("#overlay-body").textContent();
      let steps = null;
      if (!before && mode.touch) {
        for (const line of selected.banner.split(" · ")) assert.ok(body.startsWith("建造步骤") && body.includes(line));
        steps = await page.evaluate(() => {
          const el = document.getElementById("overlay-body"), panel = document.getElementById("overlay-panel").getBoundingClientRect();
          return document.getElementById("build-banner").textContent.split(" · ").map((line) => {
            const i = el.textContent.indexOf(line), range = document.createRange();
            range.setStart(el.firstChild, i); range.setEnd(el.firstChild, i + line.length);
            return { line, rects: [...range.getClientRects()].map((r) => ({ top: r.top, bottom: r.bottom,
              fully_visible: r.top >= panel.top && r.bottom <= Math.min(panel.bottom, innerHeight) })) };
          });
        });
        assert.ok(steps.every((s) => s.rects.length && s.rects.every((r) => r.fully_visible)));
      } else assert.ok(!body.includes("再点背包同一项取消"));
      await snapshot("build-help", { selected, body, steps }, true);
      await page.locator("#overlay-actions button:first-child").scrollIntoViewIfNeeded();
      await activate("#overlay-actions button:first-child");
      await page.waitForFunction(() => !CUBE.getState().paused);
      assert.equal((await read()).build, "torch");
      if (mode.touch) await select();
      else await page.keyboard.press("0");
      const canceled = await read();
      assert.equal(canceled.build, null);
      assert.equal(canceled.helpLabel, "怎么玩");
      assert.deepEqual(canceled.inv, selected.inv);
      await select();
      const secondPoint = await tapTile(25, 23);
      await page.waitForFunction(() => CUBE.getState().tiles[23 * 48 + 25] === 13);
      const placed = await read();
      assert.equal(placed.inv.wood, canceled.inv.wood - 1);
      assert.equal(placed.inv.stone, canceled.inv.stone);
      assert.equal(placed.inv.torch, canceled.inv.torch);
      assert.equal(placed.held, 0);
      assert.equal(placed.hp, initial.hp);
      assert.equal(placed.campHp, initial.campHp);
      assert.equal(placed.day, true);
      assert.equal(placed.nights, 0);
      assertFirstScreen(await inspect(page), mode.touch);
      records.push({ viewport, version, native_hold: !!session, initial, wood, firstPoint, selected, pan, body, steps, canceled, secondPoint, placed });
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  if (capture) {
    const validation = before ? {} : JSON.parse(await readFile(join(out, "validation.json"), "utf8"));
    validation[version] = records;
    await writeFile(join(out, "validation.json"), JSON.stringify(validation, null, 2) + "\n");
    await writeFile(join(out, "screenshots.json"), JSON.stringify({ screenshots: [...previous, ...screenshots] }, null, 2) + "\n");
  }
  console.log("BUILD_GUIDANCE_OK", engine, version, records.length, "normal gather/place/help/cancel/reselect paths;", screenshots.length, "original PNGs");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve(), browser = await chromium.launch({ headless: true });
  try { await testBuildGuidance(browser, origin, { before: process.argv.includes("--before"), capture: process.argv.includes("--capture") }); }
  finally { await browser.close(); await new Promise((r) => server.close(r)); }
}
