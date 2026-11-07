import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve } from "./helpers.mjs";

const out = join(ROOT, "evidence", "ui-review-2026-11-06", "canvas-black-area");
const files = ["index.html", "style.css", "game.js"];
const publicURL = "https://43.139.171.195/cube-epoch/";

export async function testCanvasBlackArea(browser, origin, { capture = false, remote = false, enforce = false, before = false } = {}) {
  const engine = browser.browserType().name();
  const phase = remote ? "public" : before ? "before" : "after";
  if (before) {
    assert.equal(execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(), "52195fc2e722f78fba754a343eab3a61c1afc72b");
    assert.equal(execFileSync("git", ["status", "--porcelain", "--", ...files]).toString().trim(), "", "before capture requires unchanged parent product");
  }
  const cases = [
    { width: 1484, height: 1040, touch: true, dpr: 1 },
    { width: 1484, height: 1040, touch: true, dpr: 2 },
    { width: 1484, height: 1040, touch: false, dpr: 1 },
    { width: 1280, height: 800, touch: false, dpr: 1 },
    { width: 981, height: 501, touch: true, dpr: 1 },
    { width: 320, height: 568, touch: true, dpr: 1 },
    { width: 390, height: 844, touch: true, dpr: 1 },
    { width: 390, height: 844, touch: true, dpr: 3 },
    { width: 844, height: 390, touch: true, dpr: 1 },
  ];
  const records = [];
  for (const mode of cases) {
    const context = await browser.newContext({ viewport: { width: mode.width, height: mode.height },
      hasTouch: mode.touch, isMobile: mode.touch, deviceScaleFactor: mode.dpr, serviceWorkers: "block",
      ignoreHTTPSErrors: remote });
    try {
      const page = await context.newPage(), responses = [], tasks = [], errors = [], inputs = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("response", (r) => {
        const name = new URL(r.url()).pathname.split("/").pop();
        if (files.includes(name) || ["document", "image"].includes(r.request().resourceType())) {
          tasks.push((async () => {
            const body = await r.body();
            responses.push({ url: r.url(), name: r.request().resourceType() === "document" ? "index.html" : name,
              status: r.status(), bytes: body.length, sha256: createHash("sha256").update(body).digest("hex"),
              headers: Object.fromEntries(Object.entries(r.headers()).filter(([key]) =>
                ["content-type", "content-length", "etag", "last-modified", "cache-control", "server"].includes(key))),
              from_service_worker: r.fromServiceWorker() });
            if (remote && (files.includes(name) || r.request().resourceType() === "document")) {
              await mkdir(join(process.env.CUBE_AGENT_RUN_ROOT, "public-resources"), { recursive: true });
              await writeFile(join(process.env.CUBE_AGENT_RUN_ROOT, "public-resources",
                r.request().resourceType() === "document" ? "index.html" : name), body);
            }
          })());
        }
      });
      const cdp = mode.touch && engine === "chromium" ? await context.newCDPSession(page) : null;
      const activate = async (selector) => {
        const r = await page.locator(selector).boundingBox();
        const height = page.viewportSize().height, card = selector.startsWith(".class-card");
        const top = Math.max(0, r?.y), bottom = Math.min(height, (r?.y || 0) + (r?.height || 0));
        assert.ok(r && (card ? bottom - top >= 44 : r.y >= 0 && r.y + r.height <= height),
          `visible native target: ${selector} ${JSON.stringify(r)}`);
        const p = { x: r.x + r.width / 2, y: card ? (top + bottom) / 2 : r.y + r.height / 2 };
        assert.equal(await page.evaluate(({ selector, p }) => document.querySelector(selector)
          .contains(document.elementFromPoint(p.x, p.y)), { selector, p }), true);
        await (mode.touch ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y));
        inputs.push({ action: selector, kind: mode.touch ? "native coordinate tap" : "native mouse", ...p });
      };
      const swipe = async () => {
        if (cdp) {
          const { width, height } = page.viewportSize(), x = width / 2, y = height - 40;
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
          try {
            for (let n = 1; n <= 8; n++) {
              await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + (50 - y) * n / 8, id: 1 }] });
              await page.waitForTimeout(20);
            }
          } finally { await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
        } else await page.keyboard.press("End");
        await page.evaluate(() => new Promise((done) => {
          let last = scrollY, stable = 0;
          const tick = () => { stable = scrollY === last ? stable + 1 : 0; last = scrollY;
            if (stable === 8) done(); else requestAnimationFrame(tick); };
          requestAnimationFrame(tick);
        }));
        inputs.push({ action: "title scroll", kind: cdp ? "native touch swipe" : "native End" });
      };
      const hold = async (code, predicate, arg) => {
        if (cdp) {
          const r = await page.locator(`[data-hold="${code}"]`).boundingBox();
          assert.ok(r && r.width >= 44 && r.height >= 44 && r.y >= 0 && r.y + r.height <= page.viewportSize().height);
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart",
            touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }] });
        } else {
          await page.locator("#game").focus();
          await page.keyboard.down(code);
        }
        try { await page.waitForFunction(predicate, arg); }
        finally {
          if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          else await page.keyboard.up(code);
        }
        inputs.push({ action: code, kind: cdp ? "native touch hold/release" : "native keyboard down/up" });
      };
      await page.goto(origin);
      await Promise.all(tasks);
      assert.ok(files.every((file) => responses.some((r) => r.name === file && r.status === 200)));
      const versionResponse = remote ? await context.request.get(new URL("version.json", origin).href) : null;
      const version = remote ? { status: versionResponse.status(), body: await versionResponse.text() } : null;
      for (const selector of ['.class-card[data-class="mage"]', "#btn-start"]) {
        for (let n = 0; n < 25; n++) {
          const r = await page.locator(selector).boundingBox();
          if (r && (selector.startsWith(".class-card")
            ? Math.min(mode.height, r.y + r.height) - Math.max(0, r.y) >= 44
            : r.y >= 0 && r.y + r.height <= mode.height)) break;
          await swipe();
        }
        await activate(selector);
      }
      await activate("#btn-skip-intro"); await activate("#btn-skip-brief");
      await page.waitForFunction(() => CUBE.getState() && !CUBE.getState().briefing);
      const build = { sha: remote ? null : execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
        dirty: !remote && !!execFileSync("git", ["status", "--porcelain", "--", ...files]).toString().trim(),
        source: remote ? "public GET only; declared version and actual bytes recorded" : "current local static source",
        resources: responses, version, tls: remote ? "fresh isolated context ignores IP certificate errors only for read-only reproduction" : "local HTTP" };
      if (mode === cases[0]) console.log("STATIC_VERSION", JSON.stringify({ remote, version, resources: responses.filter((r) => files.includes(r.name)) }));
      const snapshot = async (state) => {
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const data = await page.evaluate(() => {
          const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
          const canvas = document.getElementById("game"), stage = canvas.parentElement, s = CUBE.getState();
          const c = canvas.getContext("2d"), t = c.getTransform();
          const samples = [[0, 0], [canvas.width - 1, 0], [0, canvas.height - 1],
            [canvas.width - 1, canvas.height - 1], [canvas.width >> 1, canvas.height >> 1]]
            .map(([x, y]) => ({ x, y, rgba: [...c.getImageData(x, y, 1, 1).data] }));
          return { viewport: { width: innerWidth, height: innerHeight }, dpr: devicePixelRatio,
            visualViewport: { width: visualViewport.width, height: visualViewport.height, scale: visualViewport.scale },
            coarse: matchMedia("(any-pointer: coarse)").matches, landscape: matchMedia("(orientation: landscape)").matches,
            stage: rect(stage), canvas: rect(canvas), app: rect(document.getElementById("app")),
            buffer: { width: canvas.width, height: canvas.height, scale: canvas.dataset.scale },
            transform: { a: t.a, d: t.d, e: t.e, f: t.f }, samples,
            css: { stage: { height: getComputedStyle(stage).height, alignItems: getComputedStyle(stage).alignItems,
              rows: getComputedStyle(stage).gridTemplateRows, background: getComputedStyle(stage).backgroundColor },
            canvas: { width: getComputedStyle(canvas).width, height: getComputedStyle(canvas).height, maxWidth: getComputedStyle(canvas).maxWidth,
              maxHeight: getComputedStyle(canvas).maxHeight },
            main: { height: getComputedStyle(stage.parentElement).height, rows: getComputedStyle(stage.parentElement).gridTemplateRows } },
            details: document.getElementById("play-details").open, day: s.day, nights: s.nights, time: s.time,
            player: { x: s.player.x, y: s.player.y, dir: s.player.dir }, inv: { ...s.inv }, flags: { ...s.flags },
            held: document.querySelectorAll("#touch-controls .held").length,
            scroll: { x: scrollX, y: scrollY } };
        });
        data.blackMargins = { top: Math.max(0, data.canvas.y - data.stage.y),
          bottom: Math.max(0, data.stage.y + data.stage.height - data.canvas.y - data.canvas.height),
          left: Math.max(0, data.canvas.x - data.stage.x),
          right: Math.max(0, data.stage.x + data.stage.width - data.canvas.x - data.canvas.width) };
        if (enforce) {
          assert.ok(data.blackMargins.top < 1 && data.blackMargins.bottom < 1, JSON.stringify({ state, mode, data }));
          assert.ok(data.samples.every((s) => s.rgba[3] === 255), "drawing buffer must be filled, not an unpainted resize");
          assert.deepEqual(data.scroll, { x: 0, y: 0 });
        }
        const prefix = phase;
        const viewport = page.viewportSize(), resource = responses.find((r) => r.name === "style.css").sha256.slice(0, 8);
        const image = `images/${state}--start-${mode.width}x${mode.height}--${viewport.width}x${viewport.height}--touch${mode.touch}--dpr${mode.dpr}--${prefix}--${resource}.png`;
        const entry = { screen_id: "canvas-" + state, state, viewport, language: "zh-CN", ui_scale: "100%", device_scale_factor: mode.dpr,
          build, source: "normal isolated mage new game; no world, position, inventory, time or save injection; native inputs and actual viewport resizing",
          platform: `Web / ${engine}`, data, inputs: [...inputs], relative_image_path: image,
          issue_ids: ["UI-029"], status: "已截", visual_review: "待协调逐图审查", captured_at: new Date().toISOString(),
          repro_steps: ["新隔离浏览器/profile，原生选法师/跳过开场预演", "正常方向走到树边，按住采集/释放；真实开关背包",
            "使用实际 viewport resize 模拟旋转；没有写世界/存档；原生截图不缩放，DPR明确"] };
        if (capture) {
          await mkdir(join(out, "images"), { recursive: true });
          await page.screenshot({ path: join(out, image), fullPage: false });
          records.push(entry);
          await writeFile(join(out, `${prefix}.json`), JSON.stringify({ screenshots: records }, null, 2) + "\n");
        } else records.push(entry);
        console.log("CANVAS_GEOMETRY", JSON.stringify({ prefix, start: mode, state, viewport, stage: data.stage, canvas: data.canvas,
          black: data.blackMargins, buffer: data.buffer, alpha: data.samples.map((s) => s.rgba[3]) }));
      };
      await snapshot("first-play");
      await hold("ArrowDown", () => CUBE.getState().player.y >= 358);
      await hold("ArrowRight", () => CUBE.getState().player.x >= 400);
      await hold("Space", () => CUBE.getState().flags.gathered);
      await page.waitForFunction(() => CUBE.getState().hitstop <= 0);
      await snapshot("first-wood");
      if (mode.touch) {
        await activate("#play-details summary"); await snapshot("inventory-open"); await activate("#play-details summary");
      }
      if (mode.width === 320) {
        for (const viewport of [{ width: 844, height: 390 }, { width: 1484, height: 1040 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
          await page.setViewportSize(viewport); inputs.push({ action: "viewport rotation/resize", viewport });
          const x = await page.evaluate(() => CUBE.getState().player.x);
          await hold("ArrowLeft", (x) => CUBE.getState().player.x <= x - 4, x);
          await snapshot("rotated");
        }
      }
      assert.deepEqual(errors, []);
      if (cdp) await cdp.detach();
    } finally { await context.close(); }
  }
  if (capture) {
    await writeFile(join(out, `${phase}.json`), JSON.stringify({ screenshots: records }, null, 2) + "\n");
  }
  console.log(`CANVAS_PROBE_OK ${engine} ${remote ? "public" : "local"} ${records.length} native states; no saves injected`);
  return records;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const remote = process.argv.includes("--public"), local = remote ? null : await serve();
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    args: ["--enable-automation"] });
  try {
    const session = await browser.newBrowserCDPSession();
    const command = await session.send("Browser.getBrowserCommandLine");
    const profile = command.arguments.find((a) => a.startsWith("--user-data-dir=")).slice("--user-data-dir=".length);
    assert.ok(resolve(profile).startsWith(resolve(tmpdir()) + sep)); console.log("OWNED_PROFILE_OK " + profile);
    await session.detach();
    await testCanvasBlackArea(browser, remote ? publicURL : local.origin,
      { remote, capture: process.argv.includes("--capture"), enforce: process.argv.includes("--enforce"), before: process.argv.includes("--before") });
  } finally {
    await browser.close();
    if (local) await new Promise((r) => local.server.close(r));
  }
}
