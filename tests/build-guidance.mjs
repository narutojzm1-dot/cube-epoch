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
const modes = [
  { width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true }, { width: 1280, height: 800, touch: false },
];

export async function testBuildGuidance(browser, origin, { before = false, capture = false, returnHelp = false } = {}) {
  const out = join(ROOT, "evidence", "ui-review-2026-11-06", returnHelp ? "build-help-return" : "build-guidance");
  const guidanceFixed = !before || returnHelp;
  const engine = browser.browserType().name(), version = before ? "before" : "after";
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const dirty = !!execFileSync("git", ["status", "--porcelain", "--", "index.html", "style.css", "game.js"],
    { cwd: ROOT, encoding: "utf8" }).trim();
  if (before) {
    assert.equal(sha, returnHelp ? "920cadffc27330ef37407b260e123b1b45682f0a" : baseline);
    assert.equal(dirty, false);
  }
  const hash = createHash("sha256").update(Buffer.concat(await Promise.all(
    ["index.html", "style.css", "game.js"].map((f) => readFile(join(ROOT, f)))))).digest("hex");
  const previous = capture && !before ? JSON.parse(await readFile(join(out, "screenshots.json"), "utf8")).screenshots
    .filter((s) => s.version === "before") : [];
  const oldManifest = capture && !before ? JSON.parse(await readFile(join(out, "screenshots.json"), "utf8")) : {};
  const history = [...(oldManifest.history || []), ...(oldManifest.screenshots || [])
    .filter((s) => s.version === "after" && s.build.source_sha256 !== hash)];
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
      const helpGeometry = () => page.evaluate(() => {
        const rect = (el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom,
            visible: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };
        };
        const panel = document.getElementById("overlay-panel"), body = document.getElementById("overlay-body");
        const scroll = getComputedStyle(body).overflowY === "auto" ? body : panel;
        const s = CUBE.getState();
        return { panel: rect(panel), body: rect(body), buttons: [...document.querySelectorAll("#overlay-actions button")].map(rect),
          scroll: { id: scroll.id, top: scroll.scrollTop, full: scroll.scrollHeight, height: scroll.clientHeight },
          frozen: { time: s.time, day: s.day, nights: s.nights, hp: s.player.hp, campHp: s.campHp,
            build: s.build, inv: { ...s.inv }, paused: s.paused }, game: rect(document.getElementById("game")) };
      });
      const scrollHelp = async () => {
        const start = await helpGeometry();
        let input = session ? "native upward touch swipes" : "native mouse wheel";
        if (engine === "webkit" && mode.touch && start.scroll.full > start.scroll.height) {
          input = "native End/Home/End after focusing tabindex0 help body; no mobile WebKit wheel API";
          const el = page.locator("#overlay-body");
          await el.focus();
          await el.evaluate((e) => {
            window.__helpScrollEnds = 0;
            e.addEventListener("scrollend", () => window.__helpScrollEnds++);
          });
          let completed = 0;
          for (const [key, top] of [["End", start.scroll.full - start.scroll.height], ["Home", 0],
            ["End", start.scroll.full - start.scroll.height]]) {
            await page.keyboard.press(key);
            await page.waitForFunction(({ top, completed }) => {
              const e = document.getElementById("overlay-body");
              return document.activeElement === e && Math.abs(e.scrollTop - top) <= 1
                && window.__helpScrollEnds > completed;
            }, { top, completed });
            completed = await page.evaluate(() => window.__helpScrollEnds);
          }
        }
        for (let n = 0; n < 12; n++) {
          const g = await helpGeometry();
          if (g.scroll.top >= g.scroll.full - g.scroll.height - 1) break;
          const r = await page.locator(`#${g.scroll.id}`).boundingBox();
          const x = r.x + r.width / 2, y = Math.min(r.y + r.height - 12, mode.height - 30);
          if (session) {
            const distance = Math.min(200, y - r.y - 20);
            await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
            try {
              for (let i = 1; i <= 8; i++) {
                await session.send("Input.dispatchTouchEvent", { type: "touchMove",
                  touchPoints: [{ x, y: y - distance * i / 8, id: 1 }] });
                await page.waitForTimeout(16);
              }
            } finally { await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
          } else {
            await page.mouse.move(x, y);
            await page.mouse.wheel(0, 400);
          }
          await page.waitForFunction(({ id, top, full, height }) => {
            const el = document.getElementById(id);
            return el.scrollTop > top || el.scrollTop >= full - height - 1;
          }, g.scroll);
        }
        const end = await helpGeometry();
        assert.ok(end.scroll.top >= end.scroll.full - end.scroll.height - 1, "real help scroll must reach the end");
        assert.deepEqual(end.frozen, start.frozen, "reading/scrolling help must not resume simulation");
        assert.ok(end.buttons.every((r) => r.visible));
        if (!before) {
          assert.ok(end.buttons.every((r) => r.height >= 44 && r.width >= 44));
          assert.deepEqual(end.buttons, start.buttons, "return controls must not scroll with the text");
        }
        console.log("HELP_RETURN_SCROLL_OK", JSON.stringify({ engine, viewport, input, start: start.scroll,
          end: end.scroll, paused: end.frozen.paused, timeFrozen: end.frozen.time === start.frozen.time,
          buttons: end.buttons }));
        return { input, start, end };
      };
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
            source: id === "night-help-fixture"
              ? "isolated night fixture after normal day path: day=false/time=2/nights=1/enemies=[]; no stock injection; not natural night survival; no source instrumentation"
              : "normal isolated mage first day, actual tree pickup/stored torch placement/help/cancel; no stock/location/world/time injection; screenshot pause only; no source instrumentation",
            ui_scale: "100%", device_scale_factor: 1, full_page: false,
            relative_image_path: `images/${filename}`, issue_ids: [returnHelp ? "UI-021" : "UI-020"], status: "已截",
            visual_review: "待协调人逐图审查", data, metrics,
            captured_at: new Date().toISOString(),
            input: session ? "native Chromium holds/end + upward help swipes + backpack/map/help/continue taps"
              : mode.touch ? "WebKit keyboard holds + native taps" : "desktop keyboard/mouse",
            repro_steps: returnHelp ? [
              "隔离正常法师新局，下移一格并向右，真实砍(25,22)树拾木；选火点该空地，先用初始成品",
              "真实点建造说明进入原暂停帮助；after不滑动即点继续，再打开帮助从顶部显示",
              "Chromium触屏原生向上滑至正文末尾，或桌面原生滚轮；不自动滚入、不修改scrollTop",
              "真实点继续，同项取消不扣料，再选火真实点(25,23)，只扣原木1并落火把",
              "night-help-fixture另标完成波3/3的首夜/cycle0/time2/nights1/toSpawn0/enemies空；上滑不恢复，仅继续恢复",
              "100%原生视口原图；普通日间无库存/位置/世界/时间或源码注入，截图暂停，保护玩家存档",
            ] : ["隔离正常法师新局，下移一格并向右，真实砍(25,22)树并拾取木头",
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
      assert.equal(selected.helpLabel, guidanceFixed && mode.touch ? "建造说明" : "怎么玩");
      if (!returnHelp) await snapshot("build-selected", selected);
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
      if (guidanceFixed && mode.touch) {
        for (const line of selected.banner.split(" · ")) assert.ok(body.startsWith("建造步骤") && body.includes(line));
        steps = await page.evaluate(() => {
          const el = document.getElementById("overlay-body"), panel = document.getElementById("overlay-panel").getBoundingClientRect();
          const body = el.getBoundingClientRect();
          return document.getElementById("build-banner").textContent.split(" · ").map((line) => {
            const i = el.textContent.indexOf(line), range = document.createRange();
            range.setStart(el.firstChild, i); range.setEnd(el.firstChild, i + line.length);
            return { line, rects: [...range.getClientRects()].map((r) => ({ top: r.top, bottom: r.bottom,
              fully_visible: r.top >= Math.max(panel.top, body.top)
                && r.bottom <= Math.min(panel.bottom, body.bottom, innerHeight) })) };
          });
        });
        assert.ok(steps.every((s) => s.rects.length && s.rects.every((r) => r.fully_visible)));
      } else assert.ok(!body.includes("再点背包同一项取消"));
      const opened = await helpGeometry();
      if (!before) assert.ok(opened.buttons.every((r) => r.visible && r.width >= 44 && r.height >= 44));
      if (before && returnHelp && [320, 844].includes(mode.width)) assert.equal(opened.buttons[0].visible, false);
      await snapshot("build-help", { selected, body, steps, opened }, true);
      let immediateReturn = null;
      if (!before) {
        await activate("#overlay-actions button:first-child");
        await page.waitForFunction(() => !CUBE.getState().paused);
        immediateReturn = await read();
        assert.equal(immediateReturn.build, selected.build);
        assert.deepEqual(immediateReturn.inv, selected.inv);
        await activate("#btn-help");
        assert.equal((await helpGeometry()).scroll.top, 0);
      }
      const helpScroll = await scrollHelp();
      if (returnHelp) await snapshot("build-help-scrolled", { body, helpScroll }, true);
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
      let night = null;
      if ([320, 844].includes(mode.width)) {
        await page.evaluate(() => {
          const s = CUBE.getState();
          s.day = false; s.time = 2; s.cycle = 0; s.nights = 1;
          s.wave = 3; s.wavesTotal = 3; s.toSpawn = 0; s.enemies = [];
        });
        await page.waitForFunction(() => !document.getElementById("wave-banner").classList.contains("hidden"));
        await activate("#btn-help");
        const openedNight = await helpGeometry();
        assert.equal(openedNight.frozen.day, false);
        assert.equal(openedNight.frozen.paused, true);
        if (!before) {
          assert.ok(openedNight.buttons.every((r) => r.visible));
          assert.equal(openedNight.scroll.top, 0, "new help must show current feedback, not stale scrolled text");
        }
        if (returnHelp) await snapshot("night-help-fixture", { openedNight,
          fixture: "after normal day path, first night completed wave3/3, cycle=0/time=2/enemies=[]; not natural night survival" }, true);
        const scrolled = await scrollHelp();
        await activate("#overlay-actions button:first-child");
        await page.waitForFunction((t) => !CUBE.getState().paused && CUBE.getState().time > t + 0.2, openedNight.frozen.time);
        assert.equal((await read()).held, 0);
        assert.equal((await read()).day, false);
        night = { fixture: "isolated night state, not natural night", openedNight, scrolled, resumed: await read() };
      }
      if (!mode.touch) {
        await page.keyboard.press("Escape");
        assert.equal((await read()).paused, true);
        await page.keyboard.press("Escape");
        assert.equal((await read()).paused, false);
      }
      records.push({ viewport, version, native_hold: !!session, initial, wood, firstPoint, selected, pan,
        body, steps, opened, immediateReturn, helpScroll, canceled, secondPoint, placed, night });
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  if (capture) {
    const validation = before ? {} : JSON.parse(await readFile(join(out, "validation.json"), "utf8"));
    validation[version] = records;
    await writeFile(join(out, "validation.json"), JSON.stringify(validation, null, 2) + "\n");
    await writeFile(join(out, "screenshots.json"), JSON.stringify({ screenshots: [...previous, ...screenshots], history }, null, 2) + "\n");
  }
  console.log("BUILD_GUIDANCE_OK", engine, version, records.length, "normal gather/place/help/cancel/reselect paths;", screenshots.length, "original PNGs");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve(), browser = await chromium.launch({ headless: true });
  try { await testBuildGuidance(browser, origin, { before: process.argv.includes("--before"),
    capture: process.argv.includes("--capture"), returnHelp: process.argv.includes("--return-help") }); }
  finally { await browser.close(); await new Promise((r) => server.close(r)); }
}
