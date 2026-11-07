import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const baseline = "63182223ae90bf06118ed21639853cdab9be848f";
const out = join(ROOT, "evidence", "ui-review-2026-11-06", "first-fence-onboarding");
const files = ["index.html", "style.css", "game.js"];

export async function testFirstFence(browser, origin, { before = false, capture = false, titleOnly = false, panelsOnly = false } = {}) {
  const engine = browser.browserType().name(), version = before ? "before" : "after";
  const buffers = await Promise.all(files.map((file) => before
    ? execFileSync("git", ["show", `${baseline}:${file}`]) : readFile(join(ROOT, file))));
  const build = { sha: before ? baseline : execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
    dirty: !before && !!execFileSync("git", ["status", "--porcelain", "--", ...files]).toString().trim(),
    source_sha256: createHash("sha256").update(Buffer.concat(buffers)).digest("hex"), source_files: files };
  const manifestFile = join(out, "screenshots.json"), validationFile = join(out, "validation.json");
  const manifest = capture && existsSync(manifestFile)
    ? JSON.parse(await readFile(manifestFile, "utf8")) : { screenshots: [] };
  const latest = new Map(manifest.screenshots.map((s) => [s.relative_image_path, s]));
  const overwritten = manifest.screenshots.filter((s) => latest.get(s.relative_image_path) !== s);
  manifest.metadata_attempts = [...(manifest.metadata_attempts || []), ...overwritten.map((s) => ({
    ...s, image_retained: false, reason: "same-source same-filename recapture overwrote this earlier image; only latest metadata represents the retained PNG",
  }))];
  manifest.screenshots = [...latest.values()];
  const outdated = manifest.screenshots.filter((s) => s.version === version && s.build.source_sha256 !== build.source_sha256);
  manifest.history = [...(manifest.history || []), ...outdated];
  manifest.screenshots = manifest.screenshots.filter((s) => !outdated.includes(s));
  const saveScreenshot = async (record) => {
    const matches = (s) => s.relative_image_path === record.relative_image_path;
    const replaced = [...manifest.screenshots.filter(matches), ...manifest.history.filter(matches)];
    manifest.metadata_attempts.push(...replaced.map((s) => ({ ...s, image_retained: false,
      reason: "same-filename recapture replaced the earlier image; latest record describes the retained PNG" })));
    manifest.screenshots = manifest.screenshots.filter((s) => !matches(s));
    manifest.history = manifest.history.filter((s) => !matches(s));
    manifest.screenshots.push(record);
    await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  };
  const records = [];
  for (const mode of [{ width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
    { width: 1280, height: 800, touch: false }, { width: 844, height: 390, touch: true }]) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, hasTouch: mode.touch, isMobile: mode.touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), errors = [], inputs = [], states = {};
      page.on("pageerror", (error) => errors.push(error.message));
      if (before) await page.route("**/*", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const i = path === "/" ? 0 : files.findIndex((file) => path === "/" + file);
        if (i < 0) await route.continue();
        else await route.fulfill({ body: buffers[i], contentType: ["text/html", "text/css", "application/javascript"][i] });
      });
      const cdp = mode.touch && engine === "chromium" ? await context.newCDPSession(page) : null;
      const activate = async (selector) => {
        await page.locator(selector).waitFor({ state: "visible" });
        const r = await page.locator(selector).boundingBox();
        assert.ok(r && r.y < viewport.height && r.y + r.height > 0, `normal activation must be visible: ${selector}`);
        const x = r.x + r.width / 2, y = Math.max(8, Math.min(viewport.height - 8, r.y + r.height / 2));
        const hit = await page.evaluate(({ x, y, selector }) => {
          const el = document.querySelector(selector);
          return el.contains(document.elementFromPoint(x, y));
        }, { x, y, selector });
        assert.ok(hit, `normal coordinate activation must hit ${selector}`);
        await (mode.touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
        inputs.push({ action: selector, type: mode.touch ? "native coordinate tap" : "native mouse click", x, y });
      };
      const swipeUp = async () => {
        if (cdp) {
          const x = viewport.width / 2, y = viewport.height - 50;
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
          try {
            for (let n = 1; n <= 8; n++) {
              await cdp.send("Input.dispatchTouchEvent", { type: "touchMove",
                touchPoints: [{ x, y: y + (60 - y) * n / 8, id: 1 }] });
              await page.waitForTimeout(20);
            }
          } finally { await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
        } else await page.keyboard.press("End");
        await page.evaluate(() => new Promise((done) => {
          let last = scrollY, stable = 0;
          const tick = () => {
            stable = scrollY === last ? stable + 1 : 0;
            last = scrollY;
            if (stable >= 8) done(); else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }));
        inputs.push({ action: "title scroll", type: cdp ? "native upward touch swipe" : "native End keyboard" });
      };
      const hold = async (code, predicate) => {
        if (cdp) {
          const r = await page.locator(`[data-hold="${code}"]`).boundingBox();
          assert.ok(r.width >= 44 && r.height >= 44 && r.y >= 0 && r.y + r.height <= viewport.height);
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart",
            touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }] });
        } else await page.keyboard.down(code);
        try { await page.waitForFunction(predicate); }
        finally {
          if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          else await page.keyboard.up(code);
        }
        inputs.push({ action: code, type: cdp ? "native touch hold/release" : "native keyboard down/up" });
      };
      const read = () => page.evaluate(() => {
        const s = CUBE.getState();
        const rect = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom };
        };
        return { inv: { ...s.inv }, build: s.build, day: s.day, nights: s.nights, time: s.time, over: s.over,
          x: s.player.x, y: s.player.y, dir: s.player.dir, flags: { ...s.flags }, gaps: CUBE.campGaps(),
          held: document.querySelectorAll("#touch-controls .held").length, paused: s.paused,
          toast: document.getElementById("toast").textContent,
          toastVisible: !document.getElementById("toast").classList.contains("hidden"),
          coach: document.getElementById("fence-step")?.textContent,
          button: document.getElementById("btn-first-fence")?.textContent,
          buttonRect: rect(document.getElementById("btn-first-fence")), stage: rect(document.querySelector(".stage")),
          canvas: rect(document.getElementById("game")), details: document.getElementById("play-details").open,
          fenceEntry: document.querySelector('[data-build="fence"]').textContent,
          ring: [[22, 20], [21, 21], [23, 21], [22, 22]].map(([tx, ty]) => [tx, ty, s.tiles[ty * 48 + tx]]) };
      });
      const select = async (kind, quick = false) => {
        if (quick && !before && !mode.touch) {
          for (let n = 0; n < 20 && !(await page.locator("#btn-first-fence").evaluate((el) => document.activeElement === el)); n++) {
            await page.keyboard.press("Tab");
          }
          assert.equal(await page.locator("#btn-first-fence").evaluate((el) => document.activeElement === el), true);
          await page.keyboard.press("Space");
          assert.equal(await page.evaluate(() => document.activeElement.id), "game");
          inputs.push({ action: "quick fence", type: "native Tab/Space activation; focus returned to canvas" });
        } else if (quick && !before) await activate("#btn-first-fence");
        else if (mode.touch) {
          if (!(await page.locator("#play-details").evaluate((el) => el.open))) await activate("#play-details summary");
          await activate(`.item[data-build="${kind}"]`);
        } else {
          await page.keyboard.press({ fence: "1", torch: "2", plot: "3" }[kind]);
          inputs.push({ action: "select " + kind, type: "native numeric key" });
        }
        await page.waitForFunction((kind) => CUBE.getState().build === kind, kind);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      };
      const tapTile = async (tx, ty) => {
        const point = await page.evaluate(({ tx, ty }) => {
          const c = CUBE.cam(), r = document.getElementById("game").getBoundingClientRect();
          return { x: r.x + (tx * 16 + 8 - c.x) * r.width / 320,
            y: r.y + (ty * 16 + 8 - c.y) * r.height / 192 };
        }, { tx, ty });
        assert.ok(point.x >= 0 && point.x < viewport.width && point.y >= 0 && point.y < viewport.height);
        await (mode.touch ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y));
        inputs.push({ action: `map ${tx},${ty}`, type: mode.touch ? "native tap" : "native mouse click", ...point });
      };
      const shot = async (id, source = "normal isolated mage new game, native gather/build inputs; read-only CUBE observations; no world/position/inventory/time/save injection") => {
        const data = await read(), metrics = await inspect(page);
        const panel = id === "fence-inventory" || id === "fence-help";
        if (!panel) assertFirstScreen(metrics, mode.touch);
        else assert.equal(metrics.document.width, viewport.width);
        assert.deepEqual(metrics.scroll, { x: 0, y: 0 });
        if (!before && !panel) {
          const visible = await page.evaluate(() => {
            const feed = document.getElementById("notice-feed").getBoundingClientRect();
            const button = document.getElementById("btn-first-fence"), r = button.getBoundingClientRect();
            return { hit: button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)),
              lines: ["toast", "prompt", "fence-step"].flatMap((id) => {
                const el = document.getElementById(id);
                if (getComputedStyle(el).display === "none" || !el.textContent) return [];
                const range = document.createRange(); range.selectNodeContents(el);
                return [...range.getClientRects()].map((r) => ({ text: el.textContent, complete: r.top >= feed.top && r.bottom <= feed.bottom }));
              }) };
          });
          assert.ok(visible.hit, "quick fence target must not be covered");
          assert.ok(visible.lines.length && visible.lines.every((line) => line.complete), "current step must be fully readable, no half-line");
          states[id + "-visibility"] = visible;
        }
        if (id === "fence-inventory") {
          const choices = await page.evaluate(() => {
            const clip = document.querySelector(".details-content").getBoundingClientRect();
            return [...document.querySelectorAll(".item.build")].map((el) => {
              const r = el.getBoundingClientRect(), range = document.createRange();
              range.selectNodeContents(el);
              return { text: el.textContent, width: r.width, height: r.height,
                hit: el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)),
                complete: [...range.getClientRects()].every((line) => line.top >= clip.top && line.bottom <= clip.bottom && line.left >= clip.left && line.right <= clip.right) };
            });
          });
          assert.ok(choices.every((c) => c.width >= 44 && c.height >= 44 && c.hit && c.complete), JSON.stringify({ viewport, choices }));
          states[id + "-choices"] = choices;
        }
        states[id] = { data, metrics };
        if (!capture || (panelsOnly && !panel && !id.endsWith("-fixture"))) return;
        await mkdir(join(out, "images"), { recursive: true });
        const filename = `${id}--${mode.width}x${mode.height}--${version}--${build.source_sha256.slice(0, 8)}.png`;
        await page.screenshot({ path: join(out, "images", filename), fullPage: false });
        await saveScreenshot({ screen_id: id, state: `${id} / ${version}`, version, viewport, language: "zh-CN",
          platform: `Web / ${engine}`, build, source,
          ui_scale: "100%", device_scale_factor: 1, full_page: false, relative_image_path: `images/${filename}`,
          issue_ids: ["UI-028"], status: "已截", visual_review: "待协调逐图审查", captured_at: new Date().toISOString(),
          data, metrics, repro_steps: source.startsWith("fixture") ? [
            "完成上述普通新局和第一面栅栏后，将木库存设1，真实点下一个营地缺口(23,21)拒绝",
            "将木库存设2，只等待两帧：before旧拒绝仍在，after即时撤掉本片专用不足提示，当前步骤指向发光缺口",
            "取消建造产生原通知，再做一次库存1→2，验证它不被专用不足提示清理误伤",
            "单独资源边界夹具，不当作普通采集/存档或自然时间；不触及用户存档",
          ] : ["普通新档选法师，真实跳过开场/预演；方向下移、右转",
            "先误选田，在(25,23)开一块田花1木；走近篝火，选栅栏点(22,22)，仅剩1木时明确拒绝",
            "回树旁真实采木拾取，取消后检查够用；误选田/火把，再用栅栏入口纠正",
            "走近篝火，点发光空格(22,22)；正常扣2木，现成栅栏0不变，营地缺口4→3",
            "所有游戏观察只读，主玩法图不人为暂停；帮助由真实按钮主动暂停，不缩放；隔离上下文不接触用户存档"] });
      };
      await page.goto(origin);
      const served = await page.evaluate(async (files) => Promise.all(files.map(async (file) =>
        [...new Uint8Array(await (await fetch("/" + file)).arrayBuffer())])), files);
      assert.equal(createHash("sha256").update(Buffer.concat(served.map((b) => Buffer.from(b)))).digest("hex"), build.source_sha256);
      if (capture && mode.touch && !panelsOnly) {
        await mkdir(join(out, "images"), { recursive: true });
        const filename = `title-fence-instruction--${mode.width}x${mode.height}--${version}--${build.source_sha256.slice(0, 8)}.png`;
        await page.screenshot({ path: join(out, "images", filename), fullPage: false });
        await saveScreenshot({ screen_id: "title-fence-instruction", state: `title-fence-instruction / ${version}`,
          version, viewport, language: "zh-CN", platform: `Web / ${engine}`, build,
          source: "normal isolated title, no game started or save injection", ui_scale: "100%", device_scale_factor: 1,
          full_page: false, relative_image_path: `images/${filename}`, issue_ids: ["UI-028"], status: "已截",
          visual_review: "待协调逐图审查", captured_at: new Date().toISOString(),
          repro_steps: ["普通手机视口打开标题，四步中栅栏入口用语与游戏内完整入口一致；未选角，无游戏状态注入"] });
      }
      if (titleOnly) continue;
      for (const selector of ['.class-card[data-class="mage"]', "#btn-start"]) {
        for (let n = 0; n < 20; n++) {
          const r = await page.locator(selector).boundingBox();
          if (r && (selector === "#btn-start"
            ? r.y >= 8 && r.y + r.height <= mode.height - 8
            : Math.min(mode.height - 8, r.y + r.height) - Math.max(8, r.y) >= 44)) break;
          await swipeUp();
        }
        await activate(selector);
        if (selector !== "#btn-start") await page.waitForFunction(() => !document.getElementById("btn-start").disabled);
      }
      await activate("#btn-skip-intro"); await activate("#btn-skip-brief");
      await page.waitForSelector("#screen-game:not(.hidden)");
      const initial = await read();
      assert.equal(initial.inv.fence, 0); assert.equal(initial.inv.wood, 2); assert.equal(initial.gaps.length, 4);
      await hold("ArrowDown", () => CUBE.getState().player.y >= 358);
      await select("plot"); await tapTile(25, 23);
      await page.waitForFunction(() => CUBE.getState().tiles[23 * 48 + 25] === 7);
      assert.equal((await read()).inv.wood, 1);
      await hold("ArrowLeft", () => CUBE.getState().player.x <= 378);
      await select("fence"); const missing = await read(); await tapTile(22, 22);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      console.log("FIRST_FENCE_REFUSAL_STATE", viewport.width, JSON.stringify(await read()));
      await page.waitForFunction(() => document.getElementById("toast").textContent.includes("还差") || document.getElementById("toast").textContent.includes("差 1 木"));
      assert.deepEqual((await read()).inv, missing.inv); assert.equal((await read()).gaps.length, 4);
      await shot("wood-short");
      await hold("ArrowRight", () => CUBE.getState().player.x >= 400);
      await hold("Space", () => CUBE.getState().flags.gathered && CUBE.getState().inv.wood >= 2);
      await page.waitForFunction(() => CUBE.getState().hitstop <= 0);
      await page.waitForTimeout(200);
      if (mode.touch) {
        if (!before) await activate("#btn-first-fence");
        else { await activate("#play-details summary"); await activate('.item[data-build="fence"]'); }
      } else await page.keyboard.press("0");
      await page.waitForFunction(() => CUBE.getState().build === null);
      await page.waitForFunction(() => document.getElementById("toast").classList.contains("hidden"));
      await shot("wood-ready");
      await select("plot"); await shot("wrong-plot");
      await select("torch"); await shot("wrong-torch");
      await select("fence", true);
      await hold("ArrowLeft", () => CUBE.getState().player.x <= 378);
      await shot("fence-selected");
      const stock = await read(); await tapTile(22, 22);
      await page.waitForFunction(() => CUBE.getState().tiles[22 * 48 + 22] === 12);
      const success = await read();
      assert.equal(success.inv.wood, stock.inv.wood - 2);
      assert.equal(success.inv.fence, 0); assert.equal(success.gaps.length, 3); assert.equal(success.build, "fence");
      assert.equal(success.held, 0); assert.equal(success.day, true); assert.equal(success.nights, 0);
      if (!before) {
        assert.match(states["wood-short"].data.fenceEntry, /差1木/);
        assert.match(states["wood-ready"].data.coach, /不用先合成/);
        assert.match(states["wrong-plot"].data.coach, /已选田地.*栅栏/);
        assert.match(states["wrong-torch"].data.coach, /已选火把.*栅栏/);
        assert.match(states["fence-selected"].data.coach, /发光.*4 面/);
        assert.match(success.toast, /第一面栅栏.*3 面/);
        assert.ok(success.buttonRect.width >= 44 && success.buttonRect.height >= 44);
      }
      await shot("first-fence-placed");
      if (mode.touch) {
        await activate("#play-details summary");
        await shot("fence-inventory");
        await activate("#play-details summary");
      }
      await activate("#btn-help");
      assert.match(await page.locator("#overlay-body").textContent(), /1 栅栏/);
      if (!before) assert.match(await page.locator("#overlay-body").textContent(), /不用先合成/);
      await shot("fence-help");
      await activate("#overlay-actions button:first-child");
      await page.waitForFunction(() => !CUBE.getState().paused);
      let feedbackFixture = null;
      if (mode.width === 320) {
        const source = "fixture: after ordinary first-fence path, wood set1 then2; native next-gap refusal, two-frame feedback check and cancellation negative; no user save access";
        await page.evaluate(() => { CUBE.getState().inv.wood = 1; });
        await tapTile(23, 21);
        await page.waitForFunction((before) => {
          const text = document.getElementById("toast").textContent;
          return before ? text.includes("材料还差") : text.startsWith("差 1 木。");
        }, before);
        const warned = await read();
        assert.equal(warned.inv.wood, 1); assert.equal(warned.gaps.length, 3);
        await shot("fence-shortage-fixture", source);
        await page.evaluate(() => { CUBE.getState().inv.wood = 2; });
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const replenished = await read();
        assert.equal(replenished.toastVisible, before);
        assert.equal(replenished.inv.wood, 2); assert.equal(replenished.gaps.length, 3);
        await shot("fence-replenished-fixture", source);
        await page.keyboard.press("0");
        await page.evaluate(() => { CUBE.getState().inv.wood = 1; });
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        await page.evaluate(() => { CUBE.getState().inv.wood = 2; });
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const other = await read();
        assert.equal(other.toast, "已取消建造。"); assert.equal(other.toastVisible, true);
        feedbackFixture = { source, warned, replenished, other };
        console.log("FIRST_FENCE_FEEDBACK_FIXTURE_OK", JSON.stringify({ source, before, immediatelyHidden: !replenished.toastVisible,
          oldMessage: warned.toast, unknownNoticePreserved: other.toast }));
        await select("fence", !before);
      }
      let boundary = null;
      if (!before && mode.width === 320) {
        const beforeBoundary = await read();
        await page.evaluate(() => { const s = CUBE.getState(); s.cycle = s.dayLen - 0.01; });
        await page.waitForFunction(() => !CUBE.getState().day);
        assert.equal(await page.locator("#screen-game").evaluate((el) => el.classList.contains("first-fence-lesson")), false);
        assert.equal(await page.locator("#btn-first-fence").isVisible(), false);
        assert.equal(await page.locator("#wave-banner").isVisible(), true);
        const afterBoundary = await read();
        assert.equal(afterBoundary.build, beforeBoundary.build);
        assert.deepEqual(afterBoundary.inv, beforeBoundary.inv);
        assert.equal(afterBoundary.held, 0);
        assertFirstScreen(await inspect(page), true);
        boundary = { source: "separate end-of-first-day boundary fixture: cycle set to dayLen-0.01 after the complete ordinary path; real next frame enters night, not natural elapsed first day",
          before: beforeBoundary, after: afterBoundary };
        console.log("FIRST_FENCE_BOUNDARY_OK", JSON.stringify({ source: boundary.source,
          build: afterBoundary.build, inventory: afterBoundary.inv, sameInventory: true, held: afterBoundary.held,
          night: afterBoundary.nights, quickFenceHidden: true, originalWaveVisible: true }));
      }
      assert.deepEqual(errors, []);
      records.push({ viewport, initial, missing, stock, success, states, inputs, boundary, feedbackFixture,
        source: "ordinary first-fence inputs/screenshots have no game-state injection; optional boundary fixture separately identified",
        input_limit: cdp ? "browser native simulated touch, not a physical phone" : mode.touch ? "WebKit keyboard holds, native coordinate taps; no native continuous touch API" : "desktop keyboard/mouse" });
      if (cdp) await cdp.detach();
    } finally { await context.close(); }
  }
  if (capture && !titleOnly && !panelsOnly) {
    const validation = existsSync(validationFile) ? JSON.parse(await readFile(validationFile, "utf8")) : {};
    validation[version] = records;
    await writeFile(validationFile, JSON.stringify(validation, null, 2) + "\n");
  }
  console.log(titleOnly ? `TITLE_FENCE_OK ${engine} ${version}: three native phone-view title originals; no game started`
    : `FIRST_FENCE_OK ${engine} ${version}: four normal mage paths, shortage/no spending, gather, ready/misselection/correction, direct2wood first fence gaps4to3, help/resume; after320 end-of-day boundary fixture separately labeled`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve();
  const browser = await chromium.launch({ headless: true, args: ["--enable-automation"],
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  try {
    const session = await browser.newBrowserCDPSession();
    const { arguments: args } = await session.send("Browser.getBrowserCommandLine");
    const profile = args.find((arg) => arg.startsWith("--user-data-dir=")).slice("--user-data-dir=".length);
    assert.ok(resolve(profile).startsWith(resolve(tmpdir()) + sep));
    console.log("BROWSER_PROFILE_D_OK " + profile); await session.detach();
    await testFirstFence(browser, origin, { before: process.argv.includes("--before"), capture: process.argv.includes("--capture"),
      titleOnly: process.argv.includes("--title-only"), panelsOnly: process.argv.includes("--panels-only") });
  } finally { await browser.close(); await new Promise((r) => server.close(r)); }
}
