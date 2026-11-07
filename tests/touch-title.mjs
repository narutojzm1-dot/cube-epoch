import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const baseline = "61383ce9246a604aacbc05368373ab8ade9e2610";
const out = join(ROOT, "evidence", "ui-review-2026-11-06", "touch-title");

export async function testTouchTitle(browser, origin, { before = false, capture = false } = {}) {
  const engine = browser.browserType().name(), version = before ? "before" : "after";
  const files = ["index.html", "style.css", "game.js"];
  const buffers = await Promise.all(files.map((file) => before
    ? execFileSync("git", ["show", `${baseline}:${file}`]) : readFile(join(ROOT, file))));
  const hash = createHash("sha256").update(Buffer.concat(buffers)).digest("hex");
  const original = buffers[0].toString("utf8");
  const desktopSteps = [...original.matchAll(/<li><b>\d<\/b> (.*?)<\/li>/g)].map((match) => match[1]);
  const desktopHint = original.match(/<p class="hint">(.*?)<\/p>/)[1];
  const build = { sha: before ? baseline : execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    dirty: !before && !!execFileSync("git", ["status", "--porcelain", "--", ...files], { encoding: "utf8" }).trim(),
    source_sha256: hash, source_files: files };
  const manifestFile = join(out, "screenshots.json"), validationFile = join(out, "validation.json");
  const manifest = capture && existsSync(manifestFile)
    ? JSON.parse(await readFile(manifestFile, "utf8")) : { screenshots: [] };
  const records = [];
  for (const mode of [{ width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
    { width: 844, height: 390, touch: true }, { width: 1280, height: 800, touch: false }]) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, hasTouch: mode.touch, isMobile: mode.touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), errors = [], inputs = [];
      page.on("pageerror", (error) => errors.push(error.message));
      if (before) await page.route("**/*", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const i = path === "/" ? 0 : files.findIndex((file) => path === "/" + file);
        if (i < 0) await route.continue();
        else await route.fulfill({ status: 200, body: buffers[i],
          contentType: ["text/html", "text/css", "application/javascript"][i] });
      });
      const cdp = mode.touch && engine === "chromium" ? await context.newCDPSession(page) : null;
      const log = (action, input) => inputs.push({ action, input, at: new Date().toISOString() });
      const scroll = async (down) => {
        if (cdp) {
          const from = down ? viewport.height - 70 : 70, to = down ? 70 : viewport.height - 70;
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart",
            touchPoints: [{ x: viewport.width / 2, y: from, id: 1 }] });
          for (let i = 1; i <= 8; i++) {
            await cdp.send("Input.dispatchTouchEvent", { type: "touchMove",
              touchPoints: [{ x: viewport.width / 2, y: from + (to - from) * i / 8, id: 1 }] });
            await page.waitForTimeout(20);
          }
          await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          log(down ? "swipe up" : "swipe down", "native Chromium touch scroll");
        } else {
          await page.keyboard.press(down ? "End" : "Home");
          log(down ? "End" : "Home", "native keyboard scroll; WebKit has no CDP touch swipe");
        }
        await page.waitForTimeout(120);
      };
      const activate = async (selector, reload = false) => {
        const box = await page.locator(selector).boundingBox();
        assert.ok(box && box.y + box.height / 2 >= 0 && box.y + box.height / 2 < viewport.height,
          `activation must already be in viewport: ${selector}`);
        log(selector, mode.touch ? "native coordinate tap; visible center, no automatic scrolling" : "native coordinate click");
        const navigation = reload ? page.waitForEvent("domcontentloaded") : null;
        const x = box.x + box.width / 2, y = box.y + box.height / 2;
        await (mode.touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
        if (navigation) await navigation;
      };
      const read = () => page.evaluate(() => {
        const s = CUBE.getState();
        return { steps: [...document.querySelectorAll(".how-to li")].map((li) => li.lastChild.textContent.trim()),
          hint: document.querySelector(".title-actions .hint").textContent,
          touchLayout: matchMedia("(any-pointer: coarse), (max-width: 760px)").matches,
          coarse: matchMedia("(any-pointer: coarse)").matches, scroll_y: scrollY,
          title: !document.getElementById("screen-title").classList.contains("hidden"),
          seen: localStorage.getItem("cube-epoch-seen"), start_disabled: document.getElementById("btn-start").disabled,
          game: s ? { cls: s.cls, day: s.day, nights: s.nights, heart: s.inv.heart, wood: s.inv.wood,
            time: s.time, x: s.player.x, y: s.player.y, paused: s.paused, over: s.over } : null,
          held: document.querySelectorAll("#touch-controls .held").length };
      });
      const checkTitle = async () => {
        const data = await read();
        assert.equal(data.title, true);
        assert.equal(data.game, null);
        assert.equal(data.start_disabled, true);
        assert.equal(data.touchLayout, mode.touch);
        if (before || !mode.touch) {
          assert.deepEqual(data.steps, desktopSteps);
          assert.equal(data.hint, desktopHint);
        } else {
          assert.match(data.steps[0], /方向按钮.*按住「采集\/攻击」/);
          assert.match(data.steps[1], /点背包「栏」.*点篝火旁发光格/);
          assert.equal(data.steps[2], desktopSteps[2]);
          assert.match(data.steps[3], /点「交互 E」合成.*北边祭坛/);
          assert.match(data.hint, /第一次.*再玩.*「怎么玩」/);
          assert.doesNotMatch(data.steps.join(" ") + data.hint, /WASD|空格|左键|按 1|按 E|Esc/);
        }
        return data;
      };
      const shot = async (id) => {
        if (!capture || (id === "first-day-controls" && (!mode.touch || before))) return;
        const data = await read(), metrics = data.game ? await inspect(page) : null;
        if (metrics) assertFirstScreen(metrics, mode.touch);
        const filename = `${id}--${viewport.width}x${viewport.height}--${version}--${hash.slice(0, 8)}.png`;
        await mkdir(join(out, "images"), { recursive: true });
        await page.screenshot({ path: join(out, "images", filename), fullPage: false });
        manifest.screenshots.push({ screen_id: id, state: `${id} / ${version}`, version, viewport,
          language: "zh-CN", build, platform: `Web / ${engine}`, ui_scale: "100%", device_scale_factor: 1,
          full_page: false, source: "normal isolated new game and pause/reselect reload; read-only CUBE observation, no fixture",
          relative_image_path: `images/${filename}`, issue_ids: ["UI-026"], status: "已截",
          visual_review: "待协调逐图审查", captured_at: new Date().toISOString(), data, metrics,
          repro_steps: ["隔离上下文正常打开标题，记录现有四步；原生上滑到末尾操作提示",
            "可见骑士卡/开始真实点按，首次实际跳故事/预演；真实方向按钮和按住采集/攻击采树",
            "点怎么玩暂停→回选角真实重载，原生下滑回顶，检查重开四步和末尾提示",
            before ? "内存响应61383ce原Git产品，不改工作区/用户存档" : "当前产品源码；无时间、资源或世界注入"] });
        await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
      };
      await page.goto(origin);
      if (!records.length) {
        const served = await page.evaluate(async (names) => Promise.all(names.map(async (name) =>
          Array.from(new Uint8Array(await (await fetch("/" + name)).arrayBuffer())))), files);
        assert.equal(createHash("sha256").update(Buffer.concat(served.map((bytes) => Buffer.from(bytes)))).digest("hex"), hash);
      }
      const initial = await checkTitle();
      assert.equal(initial.seen, null);
      await shot("title-first");
      for (let i = 0; i < 20; i++) {
        const hint = await page.locator(".title-actions .hint").boundingBox();
        if (hint && hint.y >= 0 && hint.y + hint.height <= viewport.height) break;
        await scroll(true);
      }
      const hintBox = await page.locator(".title-actions .hint").boundingBox();
      assert.ok(hintBox.y >= 0 && hintBox.y + hintBox.height <= viewport.height, "complete footer hint must be visible");
      await shot("title-footer");
      await activate('.class-card[data-class="knight"]');
      await activate("#btn-start"); await activate("#btn-skip-intro"); await activate("#btn-skip-brief");
      await page.waitForSelector("#screen-game:not(.hidden)");
      assertFirstScreen(await inspect(page), mode.touch);
      for (const [code, predicate] of [["ArrowDown", () => CUBE.getState().player.y >= 358],
        ["ArrowRight", () => CUBE.getState().player.dir === 2],
        ["Space", () => CUBE.getState().inv.wood > 2]]) {
        if (cdp) {
          const box = await page.locator(`[data-hold="${code}"]`).boundingBox();
          assert.ok(box.width >= 44 && box.height >= 44 && box.y >= 0 && box.y + box.height <= viewport.height);
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart",
            touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 }] });
          try { await page.waitForFunction(predicate); }
          finally { await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
        } else {
          await page.keyboard.down(code);
          try { await page.waitForFunction(predicate); } finally { await page.keyboard.up(code); }
        }
        log(code, cdp ? "native touch hold/release" : "native keyboard down/up; not a WebKit touch hold");
      }
      const controlled = await read();
      assert.equal(controlled.held, 0); assert.ok(controlled.game.wood > 2);
      assert.equal(controlled.game.day, true); assert.equal(controlled.game.nights, 0);
      await page.waitForTimeout(200);
      const settled = await read();
      assert.ok(Math.hypot(settled.game.x - controlled.game.x, settled.game.y - controlled.game.y) < 0.3);
      await shot("first-day-controls");
      await activate("#btn-help");
      await page.waitForSelector("#overlay:not(.hidden)");
      assert.equal((await read()).game.paused, true);
      await activate("#overlay-actions button:nth-child(2)", true);
      for (let i = 0; i < 20 && await page.evaluate(() => scrollY > 0); i++) await scroll(false);
      const reopened = await checkTitle();
      assert.equal(reopened.seen, "1"); assert.equal(reopened.held, 0);
      await shot("title-reopened");
      assert.deepEqual(reopened.steps, initial.steps); assert.equal(reopened.hint, initial.hint);
      if (!before && !mode.touch) {
        await page.setViewportSize({ width: 320, height: 568 });
        await page.waitForFunction(() => document.querySelector(".how-to li").textContent.includes("方向按钮"));
        const narrow = await read(); assert.equal(narrow.coarse, false);
        assert.doesNotMatch(narrow.hint, /Esc/);
        await page.setViewportSize(viewport);
        await page.waitForFunction(() => document.querySelector(".how-to li").textContent.includes("WASD"));
        await checkTitle();
      }
      records.push({ viewport, initial, controlled, settled, reopened, input_log: inputs });
      assert.deepEqual(errors, []);
      if (cdp) await cdp.detach();
    } finally { await context.close(); }
  }
  if (capture) {
    const validation = existsSync(validationFile) ? JSON.parse(await readFile(validationFile, "utf8")) : {};
    validation[version] = records;
    await writeFile(validationFile, JSON.stringify(validation, null, 2) + "\n");
  }
  console.log(`TOUCH_TITLE_OK ${engine} ${version}: four viewports, ordinary new/reselect titles, actual movement/gather/release, desktop text and reversible media layout`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve();
  const browser = await chromium.launch({ headless: true, args: ["--enable-automation"],
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  try {
    const session = await browser.newBrowserCDPSession();
    const { arguments: args } = await session.send("Browser.getBrowserCommandLine");
    const profile = args.find((arg) => arg.startsWith("--user-data-dir=")).slice("--user-data-dir=".length);
    assert.ok(resolve(profile).startsWith(resolve(tmpdir()) + sep), "browser profile must use configured temporary directory");
    console.log("BROWSER_PROFILE_D_OK " + profile);
    await session.detach();
    await testTouchTitle(browser, origin, { before: process.argv.includes("--before"), capture: process.argv.includes("--capture") });
  } finally { await browser.close(); await new Promise((done) => server.close(done)); }
}
