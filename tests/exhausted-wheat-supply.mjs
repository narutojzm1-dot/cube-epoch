import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve, enterPlay } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const baseline = "a09aaa5de95fc7af473abb156fbb8a4aa9eaf600";
const out = join(ROOT, "evidence", "ui-review-2026-11-06", "exhausted-wheat-supply");

export async function testExhaustedWheatSupply(browser, origin, { before = false, capture = false } = {}) {
  const proof = JSON.parse(await readFile(join(out, "reachable-state.json"), "utf8"));
  assert.equal(proof.final.inv.seed, 0); assert.equal(proof.final.crops.length, 0); assert.ok(proof.final.inv.wheat < 3);
  const files = ["index.html", "style.css", "game.js"];
  const buffers = await Promise.all(files.map((f) => before
    ? execFileSync("git", ["show", `${baseline}:${f}`]) : readFile(join(ROOT, f))));
  const build = { sha: before ? baseline : execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
    dirty: !before && !!execFileSync("git", ["status", "--porcelain", "--", ...files]).toString().trim(),
    source_sha256: createHash("sha256").update(Buffer.concat(buffers)).digest("hex") };
  const phase = before ? "before" : "after", records = [], screenshots = [];
  const attempt = basename(process.env.CUBE_AGENT_RUN_ROOT || "check").slice(-8);
  const manifest = join(out, `${phase}-${attempt}.json`);
  for (const mode of [{ width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
    { width: 1280, height: 800, touch: false }]) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, isMobile: mode.touch, hasTouch: mode.touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), inputs = [], errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      if (before) await page.route("**/*", async (route) => {
        const path = new URL(route.request().url()).pathname, i = path === "/" ? 0 : files.findIndex((f) => path === "/" + f);
        if (i < 0) await route.continue();
        else await route.fulfill({ body: buffers[i], contentType: ["text/html", "text/css", "application/javascript"][i] });
      });
      const cdp = mode.touch && browser.browserType().name() === "chromium" ? await context.newCDPSession(page) : null;
      const read = () => page.evaluate(() => {
        const s = CUBE.getState();
        return { time: s.time, cycle: s.cycle, day: s.day, nights: s.nights, paused: s.paused, over: s.over, win: s.win,
          inv: { ...s.inv }, crops: [...s.crops].map(([key, c]) => ({ key, ...c })), drops: s.drops.map((d) => ({ kind: d.kind, life: d.life })),
          player: { x: s.player.x, y: s.player.y, dir: s.player.dir }, target: CUBE.currentTarget(), gaps: CUBE.campGaps(),
          objective: document.getElementById("objective").textContent, guide: document.getElementById("guide-body").textContent,
          guideSummary: document.getElementById("guide-summary").textContent, keys: document.getElementById("keys-hint").textContent,
          prompt: document.getElementById("prompt").textContent, toast: document.getElementById("toast").textContent,
          details: document.getElementById("play-details").open, held: document.querySelectorAll("#touch-controls .held").length };
      });
      const activate = async (selector) => {
        if (selector === "#play-details summary") await page.evaluate(() => {
          window.__detailsSettled = new Promise((resolve) => document.getElementById("play-details").addEventListener("toggle", resolve, { once: true }));
        });
        const r = await page.locator(selector).boundingBox(), x = r.x + r.width / 2, y = r.y + r.height / 2;
        assert.ok(y >= 0 && y <= viewport.height);
        await (mode.touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
        if (selector === "#play-details summary") await page.evaluate(() => window.__detailsSettled);
        inputs.push({ action: selector, input: mode.touch ? "native touch tap" : "native mouse click", x, y, time: (await read()).time });
      };
      const hold = async (code, predicate, arg) => {
        const r = await page.locator(`[data-hold="${code}"]`).boundingBox(), start = await read();
        if (cdp) {
          assert.ok(r.width >= 44 && r.height >= 44);
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }] });
        } else { await page.locator("#game").focus(); await page.keyboard.down(code); }
        try { await page.waitForFunction(predicate, arg, { timeout: 5000 }); }
        finally {
          if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          else await page.keyboard.up(code);
        }
        inputs.push({ action: code, input: cdp ? "native CDP touch hold/release"
          : mode.touch ? "native keyboard hold (WebKit touch fallback)" : "native keyboard hold", start, end: await read(), rect: r });
      };
      const interact = async () => {
        if (mode.touch) await activate("#touch-interact");
        else { await page.locator("#game").focus(); await page.keyboard.press("e"); inputs.push({ action: "interact", input: "native E" }); }
      };
      const setup = async () => {
        await page.goto(origin); await enterPlay(page, "knight");
        await page.evaluate((snapshot) => {
          const s = CUBE.getState();
          s.tiles = Uint8Array.from(snapshot.tiles); s.crops = new Map(snapshot.crops); s.fenceHp = new Map(snapshot.fenceHp);
          Object.assign(s.inv, snapshot.inv);
          Object.assign(s.flags, { moved: true, chopped: true, gathered: true, built: true });
          s.day = true; s.nights = 3; s.cycle = 0; s.dayLen = 62; s.build = null;
          Object.assign(s.player, { x: 392, y: 344, dir: 3, vx: 0, vy: 0 });
        }, proof.snapshot);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        if (capture) await page.locator("#toast").waitFor({ state: "hidden" });
      };
      const shot = async (id, panel = false) => {
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const data = await read(), metrics = await inspect(page);
        assert.equal(data.paused, false); assert.equal(data.over, false); assert.equal(data.held, 0);
        if (!panel) assertFirstScreen(metrics, mode.touch);
        if (capture) {
          const filename = `${id}--${mode.width}x${mode.height}--${phase}--${build.source_sha256.slice(0, 8)}--${attempt}.png`;
          await mkdir(join(out, "images"), { recursive: true });
          await page.screenshot({ path: join(out, "images", filename), fullPage: false });
          screenshots.push({ screen_id: id, state: id, phase, viewport, build, language: "zh-CN", ui_scale: "100%", device_scale_factor: 1,
            platform: `Web / ${browser.browserType().name()}`, source: "saved depletion snapshot from logged native harvest/planting and original random seed expiry; fixed daytime/three-night UI prerequisite; controls separately injected",
            relative_image_path: `images/${filename}`, issue_ids: ["UI-036"], status: "已截", visual_review: "待用户/协调逐图审查",
            captured_at: new Date().toISOString(), data, metrics, inputs: [...inputs],
            repro_steps: ["reachable-state.json原始三株成熟麦全部真实采收、默认2种子实际播种，遗落种子按原寿命过期；不冒称连续自然走位/三夜通关",
              "隔离上下文复用真实耗尽存量/空作物快照，仅固定白天三夜前置、玩家原出生点与教程",
              "真实展开/关闭指南、方向长按走近工作台、交互查看缺麦、再走回篝火；核心触控44px不变",
              id.startsWith("control") ? "独立正对照：种1实播/自然生长、配方齐或持心夹具；不是耗尽形成样本" : "主链无再写库存/作物/时钟、无QA暂停；原图不缩放、真实CSS画布与输入单列"] });
          await writeFile(manifest, JSON.stringify({ screenshots, records }, null, 2) + "\n");
        }
        return data;
      };
      await setup();
      const initial = await shot("exhausted-at-camp");
      assert.equal(initial.target.kind, before ? "bench" : "camp");
      await activate("#play-details summary");
      const guide = await shot("exhausted-guide", true);
      if (!before) { assert.match(guide.guide, /夜守篝火.*可能.*麦.*种子/); assert.doesNotMatch(guide.guide, /工作台/); }
      await activate("#play-details summary");
      await hold("ArrowUp", () => CUBE.getState().player.y < CUBE.getState().bench.y + 21);
      await interact();
      await page.waitForFunction(() => document.getElementById("toast").textContent.startsWith("还差："));
      const rejected = await shot("bench-missing-wheat");
      assert.match(rejected.toast, /麦/); assert.deepEqual(rejected.inv, initial.inv);
      await hold("ArrowDown", () => CUBE.getState().player.y >= CUBE.getState().camp.y);
      const returned = await shot("returned-to-camp");
      assert.deepEqual(returned.inv, initial.inv); assert.equal(returned.target.kind, before ? "bench" : "camp");
      records.push({ id: "native-exhausted-route", phase, viewport, initial, guide, rejected, returned, inputs: [...inputs] });
      await setup();
      await page.evaluate(() => {
        const s = CUBE.getState(); s.inv.seed = 1;
        Object.assign(s.player, { x: 552, y: 408, dir: 3, vx: 0, vy: 0 });
      });
      const seeded = await shot("control-seed-available"); assert.equal(seeded.target.kind, "farm");
      await interact();
      await page.waitForFunction(() => CUBE.getState().crops.has("34,24"));
      const growing = await shot("control-growing"); assert.equal(growing.target.kind, "crop");
      try {
        await page.waitForFunction(() => CUBE.getState().crops.get("34,24")?.stage >= 2);
      } catch (error) {
        console.log("EXHAUSTED_GROWTH_FAILURE", JSON.stringify({ viewport, growing, failed: await read() }));
        throw error;
      }
      const ripe = await shot("control-ripe"); assert.equal(ripe.target.kind, "crop");
      assert.ok(ripe.time - growing.time >= 14, "control must use original natural crop growth, not accelerated stages");
      records.push({ id: "seed-and-natural-growth-controls", phase, viewport, seeded, growing, ripe });
      for (const c of [{ id: "control-recipe-ready", kind: "bench", key: "wheat", value: 3 },
        { id: "control-heart-ready", kind: "altar", key: "heart", value: 1 }]) {
        await setup(); await page.evaluate(({ key, value }) => { CUBE.getState().inv[key] = value; }, c);
        const data = await shot(c.id); assert.equal(data.target.kind, c.kind);
        records.push({ id: c.id, phase, viewport, data, source: "separate positive control fixture" });
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  if (capture) await writeFile(manifest, JSON.stringify({ screenshots, records }, null, 2) + "\n");
  console.log(`EXHAUSTED_WHEAT_SUPPLY_OK ${browser.browserType().name()} ${phase} ${records.length} cases ${screenshots.length} original PNGs`);
  await testNightSupplyDrops(browser, origin, { capture });
}

export async function testNightSupplyDrops(browser, origin, { capture }) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const records = [];
  try {
    const page = await context.newPage();
    await page.goto(origin); await enterPlay(page, "knight");
    await page.evaluate(() => {
      const s = CUBE.getState();
      s.day = false; s.nights = 1; s.cycle = 8; s.nightLen = 26;
      s.wave = s.wavesTotal = 2; s.toSpawn = 0; s.enemies = [];
      Object.assign(s.player, { x: 520, y: 344, dir: 2, vx: 0, vy: 0 });
      for (let y = 19; y <= 23; y++) for (let x = 31; x <= 35; x++) s.tiles[y * 48 + x] = 1;
    });
    const read = () => page.evaluate(() => {
      const s = CUBE.getState();
      return { time: s.time, kills: s.kills, inv: { ...s.inv }, drops: s.drops.map((d) => d.kind) };
    });
    for (const c of [{ id: "controlled-possible", rng: 0.01 }, { id: "controlled-no-drop", rng: 0.99 },
      ...Array.from({ length: 16 }, (_, i) => ({ id: `unmodified-rng-${i + 1}` }))]) {
      await page.evaluate((rng) => {
        const s = CUBE.getState();
        s.player.atkCd = 0;
        s.enemies.push({ kind: "slime", x: s.player.x + 22, y: s.player.y, vx: 0, vy: 0,
          hp: 20, maxHp: 32, spd: 0, dmg: 0, hit: 0, flash: 0, bob: 0 });
        if (rng !== undefined) { window.__originalRandom = Math.random; Math.random = () => rng; }
      }, c.rng);
      const start = await read();
      await page.locator("#game").focus(); await page.keyboard.down("Space");
      try { await page.waitForFunction((kills) => CUBE.getState().kills > kills, start.kills, { timeout: 5000 }); }
      finally {
        await page.keyboard.up("Space");
        if (c.rng !== undefined) await page.evaluate(() => { Math.random = window.__originalRandom; delete window.__originalRandom; });
      }
      await page.waitForFunction(() => CUBE.getState().drops.length === 0);
      const after = await read();
      if (c.id === "controlled-possible") {
        assert.equal(after.inv.wheat, start.inv.wheat + 1); assert.equal(after.inv.seed, start.inv.seed + 1);
      }
      if (c.id === "controlled-no-drop") assert.deepEqual(after.inv, start.inv);
      records.push({ ...c, start, after, input: "native Space key hold/release", source: c.rng === undefined
        ? "original unmodified random loot sample; no drop guaranteed" : "explicit RNG-extrema loot-branch control, not natural probability evidence" });
    }
  } finally { await context.close(); }
  if (capture) await writeFile(join(out, `night-supply-${(process.env.CUBE_AGENT_RUN_ROOT || "check").slice(-8)}.json`),
    JSON.stringify({ records, engine: browser.browserType().name(), source: "night1 completed-wave, wounded32-maxHP slime at20HP/zero-damage location fixture; native kills; original loot code", not_guaranteed: true }, null, 2) + "\n");
  console.log(`NIGHT_SUPPLY_DROPS_OK ${records.length} native kills; existing possible + no-drop branches and 16 unmodified RNG samples`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve();
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  try { await testExhaustedWheatSupply(browser, origin, { before: process.argv.includes("--before"), capture: process.argv.includes("--capture") }); }
  finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
}
