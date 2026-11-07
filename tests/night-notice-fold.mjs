import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve, enterPlay } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const out = join(ROOT, "evidence", "ui-review-2026-11-06", "night-notice-fold");
const modes = [
  { width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true }, { width: 1280, height: 800, touch: false },
];

export async function testNightNoticeFold(browser, origin, { before = false, capture = false } = {}) {
  const engine = browser.browserType().name(), version = before ? "before" : "after";
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const dirty = !!execFileSync("git", ["status", "--porcelain", "--", "index.html", "style.css", "game.js"],
    { cwd: ROOT, encoding: "utf8" }).trim();
  if (before) {
    assert.equal(sha, "5f451b62d87f37e29bfe4f727057a6066808b00f");
    assert.equal(dirty, false);
  }
  if (capture) assert.equal(engine, "chromium");
  const hash = createHash("sha256").update(Buffer.concat(await Promise.all(
    ["index.html", "style.css", "game.js"].map((f) => readFile(join(ROOT, f)))))).digest("hex");
  const previous = capture && !before
    ? JSON.parse(await readFile(join(out, "screenshots.json"), "utf8")).screenshots.filter((s) => s.version === "before") : [];
  const screenshots = [], checks = [];
  for (const mode of modes) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, isMobile: mode.touch, hasTouch: mode.touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const session = engine === "chromium" && mode.touch ? await context.newCDPSession(page) : null;
      const activate = async (selector) => {
        if (mode.touch) await page.locator(selector).tap();
        else await page.locator(selector).click();
      };
      const hold = async (key, wait) => {
        if (session) {
          const r = await page.locator(`[data-hold="${key}"]`).boundingBox();
          await session.send("Input.dispatchTouchEvent", { type: "touchStart",
            touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }] });
        } else await page.keyboard.down(key);
        try { await wait(); }
        finally {
          if (session) await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          else await page.keyboard.up(key);
        }
      };
      const selectFence = async () => {
        if (mode.touch) {
          if (!await page.locator("#play-details").evaluate((el) => el.open)) await activate("#play-details summary");
          await activate('.item[data-build="fence"]');
          await page.waitForFunction(() => !document.getElementById("play-details").open);
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        } else await page.keyboard.press("1");
      };
      const read = () => page.evaluate(() => {
        const s = CUBE.getState(), f = document.getElementById("notice-feed").getBoundingClientRect();
        return {
          paused: s.paused, day: s.day, inv: { ...s.inv }, hp: s.player.hp, campHp: s.campHp,
          build: s.build, tile: s.tiles[24 * 48 + 31], mana: s.player.mana, skillCd: s.player.skillCd,
          held: document.querySelectorAll("#touch-controls .held").length,
          touchLayout: matchMedia("(any-pointer: coarse), (max-width: 760px)").matches,
          rows: ["wave-banner", "toast", "prompt", "build-banner", "notice-help"].filter((id) => document.getElementById(id))
            .map((id) => {
              const el = document.getElementById(id), r = el.getBoundingClientRect();
              return { id, text: el.textContent, hidden: el.classList.contains("hidden"),
                display: getComputedStyle(el).display, top: r.top, bottom: r.bottom, height: r.height,
                visibleHeight: Math.max(0, Math.min(r.bottom, f.bottom) - Math.max(r.top, f.top)) };
            }),
        };
      });
      const snapshot = async (id, state, overlay = false) => {
        const data = await read(), metrics = await inspect(page);
        assert.equal(data.touchLayout, mode.touch);
        assert.deepEqual(metrics.scroll, { x: 0, y: 0 });
        if (!overlay) {
          assertFirstScreen(metrics, mode.touch);
          if (mode.touch) {
            const r = await page.locator("#btn-help").boundingBox();
            assert.ok(r.width >= 44 && r.height >= 44 && r.y >= 0 && r.y + r.height <= viewport.height);
          }
        }
        if (capture) {
          const filename = `${id}--${mode.width}x${mode.height}--${version}--${hash.slice(0, 8)}.png`;
          await mkdir(join(out, "images"), { recursive: true });
          await page.screenshot({ path: join(out, "images", filename), fullPage: false });
          screenshots.push({
            screen_id: id, state, version, viewport, language: "zh-CN", build: { sha, dirty, source_sha256: hash },
            platform: `Web / ${engine}`, ui_scale: "100%", device_scale_factor: 1, full_page: false,
            source: "isolated second-night/grass/zero-damage target fixture; mana=0.2 or wood=1/fence=0 injected for UI checks",
            input: session ? "native Chromium hold/end, touchscreen map/help/continue/build taps" : "keyboard holds; native taps on touch layouts; desktop mouse/keyboard",
            relative_image_path: `images/${filename}`, issue_ids: ["UI-017"], status: "已截",
            visual_review: "待协调人逐图审查", captured_at: new Date().toISOString(), data, metrics,
            repro_steps: [
              "隔离新上下文正常选法师；fixture玩家(30,25)面东、附近草地、第二夜26秒波1/3及静止零伤害高血靶",
              "法力场景注0.2后真实按住/松开攻击；建设场景注木1/成栏0，真实选栏并点(31,24)空地触发缺木",
              "只截图时冻结模拟；帮助通过现有怎么玩主动暂停、继续恢复；空反馈自然等toast过期",
              "100%真实首屏，不改用户存档；不是自然耗尽法力/采集材料/守夜或平衡验收",
            ],
          });
          await writeFile(join(out, "screenshots.json"), JSON.stringify({ screenshots: [...previous, ...screenshots],
            visual_review: "待协调人逐图审查" }, null, 2) + "\n");
        }
        return { data, metrics };
      };
      for (const kind of ["mana", "build"]) {
        await page.goto(origin);
        await enterPlay(page, "mage");
        const initial = await page.evaluate((kind) => {
          const s = CUBE.getState(), p = s.player;
          p.x = 488; p.y = 408; p.dir = 2;
          for (let y = 23; y <= 27; y++) for (let x = 28; x <= 34; x++) s.tiles[y * 48 + x] = 1;
          s.day = false; s.nights = 2; s.nightLen = 26; s.cycle = 0;
          s.wave = 1; s.wavesTotal = 3; s.toSpawn = 0;
          s.enemies = [{ kind: "slime", x: p.x + (kind === "mana" ? 36 : 70), y: p.y, vx: 0, vy: 0,
            hp: 10000, maxHp: 10000, spd: 0, dmg: 0, hit: 0, flash: 0, bob: 0 }];
          if (kind === "mana") p.mana = 0.2;
          else { s.inv.wood = 1; s.inv.fence = 0; }
          return { inv: { ...s.inv }, hp: p.hp, campHp: s.campHp };
        }, kind);
        const message = kind === "mana" ? "法力不足，会自动恢复。" : "材料还差：木 1";
        if (kind === "mana") {
          await hold("Space", () => page.waitForFunction((text) =>
            document.getElementById("toast").textContent === text, message));
        } else {
          await selectFence();
          const point = await page.evaluate(() => {
            const c = CUBE.cam(), r = document.getElementById("game").getBoundingClientRect();
            return { x: r.x + (31 * 16 + 8 - c.x) * r.width / 320, y: r.y + (24 * 16 + 8 - c.y) * r.height / 192 };
          });
          if (mode.touch) await page.touchscreen.tap(point.x, point.y);
          else await page.mouse.click(point.x, point.y);
          await page.waitForFunction((text) => document.getElementById("toast").textContent === text, message);
        }
        await page.evaluate(() => CUBE.getState().paused = true);
        const current = await snapshot(`${kind}-shortage`, `${kind} shortage + wave + instructions / ${version}`);
        const row = (id) => current.data.rows.find((r) => r.id === id);
        assert.equal(row("toast").text, message);
        assert.equal(current.data.held, 0);
        assert.deepEqual(current.data.inv, initial.inv);
        assert.equal(current.data.hp, initial.hp); assert.equal(current.data.campHp, initial.campHp);
        assert.equal(current.data.tile, 1, "refused placement must not change grass");
        if (mode.touch) {
          assert.equal(row("prompt").display === "none", !before);
          if (kind === "build") assert.equal(row("build-banner").display === "none", !before);
          assert.equal(row("toast").visibleHeight, row("toast").height, "current shortage feedback is completely readable");
          if (before) assert.ok(row("prompt").visibleHeight > 0 && row("prompt").visibleHeight < row("prompt").height,
            "baseline must actually reproduce partial instruction clipping");
          else assert.equal(row("prompt").height, 0, "folded instruction must not leave half a line");
        } else assert.equal(row("prompt").display, "block");
        await page.evaluate(() => CUBE.getState().paused = false);
        await activate("#btn-help");
        await page.waitForSelector("#overlay:not(.hidden)");
        const helpBody = await page.locator("#overlay-body").innerText();
        assert.equal(await page.evaluate(() => CUBE.getState().paused), true);
        if (!before && mode.touch) {
          for (const id of ["toast", "prompt", "build-banner"]) {
            const r = row(id);
            if (!r.hidden && r.text) assert.ok(helpBody.includes(r.text), `${id} must be accessible in full through existing help`);
          }
        }
        if (kind === "mana") await snapshot("night-help", `existing manual help / ${version}`, true);
        await activate("#overlay-actions button:first-child");
        await page.waitForFunction(() => !CUBE.getState().paused);
        assert.equal((await read()).held, 0);
        assertFirstScreen(await inspect(page), mode.touch);
        if (kind === "mana") {
          const x = await page.evaluate(() => CUBE.getState().player.x);
          await hold("ArrowRight", () => page.waitForFunction((x) => CUBE.getState().player.x > x + 1, x));
          await page.waitForFunction(() => Math.abs(CUBE.getState().player.vx) < 0.1);
          const stopped = await page.evaluate(() => ({ x: CUBE.getState().player.x, time: CUBE.getState().time }));
          await page.waitForFunction((t) => CUBE.getState().time > t + 0.2, stopped.time);
          assert.ok(Math.abs(await page.evaluate(() => CUBE.getState().player.x) - stopped.x) < 0.1);
          if (mode.touch) await activate("#touch-skill");
          else await page.keyboard.press("q");
          assert.ok((await read()).skillCd > 0);
          await page.waitForFunction(() => document.getElementById("toast").classList.contains("hidden"));
          await page.evaluate(() => CUBE.getState().paused = true);
          const idle = await snapshot("night-no-toast", `wave / natural toast expiry / ${version}`);
          if (!before && mode.touch) {
            const route = idle.data.rows.find((r) => r.id === "notice-help");
            assert.ok(route.text.includes("怎么玩") && route.height > 0 && route.height === route.visibleHeight);
            assert.equal(idle.data.rows.find((r) => r.id === "prompt").display, "none");
          }
          await page.evaluate(() => CUBE.getState().paused = false);
        }
        await page.evaluate(() => { const s = CUBE.getState(); s.day = true; s.enemies = []; });
        if (kind === "mana") await selectFence();
        await page.waitForFunction(() => document.getElementById("wave-banner").classList.contains("hidden"));
        const day = await read();
        for (const id of ["prompt", "build-banner"]) assert.notEqual(day.rows.find((r) => r.id === id).display, "none");
        await page.locator("#notice-feed").focus();
        const scrollStart = await page.locator("#notice-feed").evaluate((el) => {
          window.__noticeScroll = { ends: [], keys: [] };
          el.addEventListener("scrollend", () => window.__noticeScroll.ends.push(el.scrollTop));
          window.addEventListener("keydown", (e) => {
            if (e.target === el && ["Home", "End"].includes(e.code)) {
              window.__noticeScroll.keys.push({ key: e.key, code: e.code, prevented: e.defaultPrevented });
            }
          });
          return { focused: document.activeElement === el, scrollend: "onscrollend" in el,
            top: el.scrollTop, height: el.clientHeight, full: el.scrollHeight };
        });
        assert.equal(scrollStart.focused, true, "keyboard scrolling must target the notice region");
        assert.equal(scrollStart.scrollend, true, "native scroll completion must be observable");
        assert.equal(scrollStart.top, 0);
        const maximumScroll = Math.max(0, scrollStart.full - scrollStart.height);
        if (mode.touch) assert.ok(maximumScroll > 0, "touch feedback fixture must actually overflow");
        const waitForScrollEnd = async (completed, top) => {
          try {
            await page.waitForFunction(({ completed, top }) => {
              const el = document.getElementById("notice-feed");
              return document.activeElement === el && Math.abs(el.scrollTop - top) <= 1
                && window.__noticeScroll.ends.length > completed;
            }, { completed, top });
          } catch (error) {
            const detail = await page.locator("#notice-feed").evaluate((el) => ({
              focus: document.activeElement.id, top: el.scrollTop, height: el.clientHeight,
              full: el.scrollHeight, ...window.__noticeScroll,
            }));
            throw new Error(`notice scroll ${engine} ${mode.width}x${mode.height} ${kind}: ${JSON.stringify(detail)}`, { cause: error });
          }
        };
        // An opposite key can cancel WebKit's in-flight scroll instead of reversing it.
        await page.keyboard.press("End");
        if (maximumScroll > 0) await waitForScrollEnd(0, maximumScroll);
        const scrollBottom = await page.locator("#notice-feed").evaluate((el) => el.scrollTop);
        const endCount = await page.evaluate(() => window.__noticeScroll.ends.length);
        await page.keyboard.press("Home");
        if (maximumScroll > 0) await waitForScrollEnd(endCount, 0);
        assert.equal(await page.locator("#notice-feed").evaluate((el) => el.scrollTop), 0);
        const keyboardScroll = await page.evaluate(() => window.__noticeScroll);
        assert.deepEqual(keyboardScroll.keys, [
          { key: "End", code: "End", prevented: false }, { key: "Home", code: "Home", prevented: false },
        ]);
        console.log(`NIGHT_NOTICE_SCROLL_OK ${JSON.stringify({ engine, viewport, kind, scrollStart, scrollBottom, keyboardScroll })}`);
        let nativePan = null;
        if (session && !before) {
          const r = await page.locator("#notice-feed").boundingBox(), x = r.x + r.width / 2;
          await session.send("Input.dispatchTouchEvent", { type: "touchStart",
            touchPoints: [{ x, y: r.y + r.height - 8, id: 1 }] });
          try {
            for (let i = 1; i <= 8; i++) {
              await session.send("Input.dispatchTouchEvent", { type: "touchMove",
                touchPoints: [{ x, y: r.y + r.height - 8 - (r.height - 16) * i / 8, id: 1 }] });
              await page.waitForTimeout(16);
            }
          } finally { await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
          await page.waitForFunction(() => document.getElementById("notice-feed").scrollTop > 0);
          nativePan = await page.locator("#notice-feed").evaluate((el) => el.scrollTop);
          console.log(`NIGHT_NOTICE_PAN_OK ${JSON.stringify({ viewport, kind, scrollTop: nativePan })}`);
        }
        if (mode.touch) await selectFence();
        else await page.keyboard.press("0");
        assert.equal((await read()).build, null);
        assert.deepEqual((await inspect(page)).scroll, { x: 0, y: 0 });
        checks.push({ viewport, kind, version, initial, current, helpBody, day, scrollBottom,
          keyboardScroll, native_hold: !!session, native_pan_scroll: nativePan, resume_and_release: true, cancellation_and_day_scroll: true });
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  if (capture) {
    const validation = before ? {} : JSON.parse(await readFile(join(out, "validation.json"), "utf8"));
    validation[`${version}_checks`] = checks;
    validation.fixture_only_not_natural_night = true; validation.no_user_save_access = true;
    await writeFile(join(out, "validation.json"), JSON.stringify(validation, null, 2) + "\n");
  }
  console.log(`NIGHT_NOTICE_FOLD_OK ${checks.length} ${version} sessions; ${screenshots.length} viewport originals; ${engine}; native touch holds=${engine === "chromium"}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve(), browser = await chromium.launch({ headless: true });
  try { await testNightNoticeFold(browser, origin, { before: process.argv.includes("--before"), capture: process.argv.includes("--capture") }); }
  finally { await browser.close(); await new Promise((r) => server.close(r)); }
}
