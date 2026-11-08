import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve, enterPlay } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const out = join(ROOT, "evidence", "ui-review-2026-11-06", "dawn-supply-handoff");
const baseline = "1ad39a6a8d129ae182c98384434b4e020da7252d";

export async function testDawnSupplyHandoff(browser, origin, { before = false, capture = false } = {}) {
  const proof = JSON.parse(await readFile(join(ROOT, "evidence", "ui-review-2026-11-06", "exhausted-wheat-supply", "reachable-state.json"), "utf8"));
  const files = ["index.html", "style.css", "game.js"];
  const buffers = await Promise.all(files.map((f) => before ? execFileSync("git", ["show", `${baseline}:${f}`]) : readFile(join(ROOT, f))));
  const build = { sha: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(), dirty: !before && !!execFileSync("git", ["status", "--porcelain", "--", ...files]).toString().trim(),
    source_sha256: createHash("sha256").update(Buffer.concat(buffers)).digest("hex") };
  const phase = before ? "before" : "after", screenshots = [], records = [], attempts = [];
  const tag = (process.env.CUBE_AGENT_RUN_ROOT || "check").slice(-8);
  const save = async () => {
    if (!capture) return;
    await mkdir(out, { recursive: true });
    await writeFile(join(out, `${phase}-${tag}.json`), JSON.stringify({ build, phase, screenshots, records, attempts }, null, 2) + "\n");
  };
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
    for (const variant of ["seed", "wheat"]) {
      let matched = false;
      for (let attempt = 1; attempt <= 24 && !matched; attempt++) {
        const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
        let readFailure;
        try {
          const page = await context.newPage(), inputs = [], errors = [];
          page.on("pageerror", (e) => errors.push(e.message));
          if (before) await page.route("**/*", async (route) => {
            const p = new URL(route.request().url()).pathname, i = p === "/" ? 0 : files.findIndex((f) => p === "/" + f);
            if (i < 0) await route.continue();
            else await route.fulfill({ body: buffers[i], contentType: ["text/html", "text/css", "application/javascript"][i] });
          });
          const cdp = browser.browserType().name() === "chromium" ? await context.newCDPSession(page) : null;
          const read = () => page.evaluate(() => {
            const s = CUBE.getState();
            return { time: s.time, cycle: s.cycle, day: s.day, nights: s.nights, paused: s.paused, over: s.over,
              inv: { ...s.inv }, build: s.build, crops: [...s.crops], drops: s.drops.map((d) => ({ kind: d.kind, life: d.life })),
              player: { x: s.player.x, y: s.player.y, dir: s.player.dir }, target: CUBE.currentTarget(),
              objective: document.getElementById("objective").textContent, guide: document.getElementById("guide-body").textContent,
              summary: document.getElementById("guide-summary").textContent, toast: document.getElementById("toast").textContent,
              held: document.querySelectorAll("#touch-controls .held").length, details: document.getElementById("play-details").open };
          });
          readFailure = read;
          const tap = async (selector) => {
            const toggles = selector === "#play-details summary" || selector.includes("data-build");
            if (toggles) await page.evaluate(() => {
              window.__detailsSettled = new Promise((resolve) => document.getElementById("play-details").addEventListener("toggle", resolve, { once: true }));
            });
            const r = await page.locator(selector).boundingBox();
            assert.ok(r && r.y >= 0 && r.y + r.height <= viewport.height);
            await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
            if (toggles) await page.evaluate(() => window.__detailsSettled);
            inputs.push({ action: selector, input: "native touchscreen tap", rect: r, at: await read() });
          };
          const hold = async (code, predicate, arg) => {
            const r = await page.locator(`[data-hold="${code}"]`).boundingBox(), start = await read();
            if (cdp) {
              assert.ok(r && r.width >= 44 && r.height >= 44 && r.y + r.height <= viewport.height);
              await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }] });
            } else { await page.locator("#game").focus(); await page.keyboard.down(code); }
            try { await page.waitForFunction(predicate, arg, { timeout: 5000 }); }
            finally {
              if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
              else await page.keyboard.up(code);
            }
            await page.waitForFunction(() => Math.abs(CUBE.getState().player.vx) < 0.1 && Math.abs(CUBE.getState().player.vy) < 0.1, null, { timeout: 5000 });
            inputs.push({ action: code, input: cdp ? "native CDP touch hold/release" : "WebKit native keyboard hold fallback; taps are touchscreen", rect: r, start, end: await read() });
          };
          const shot = async (id) => {
            await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
            const data = await read(), metrics = await inspect(page);
            assert.equal(data.paused, false); assert.equal(data.over, false); assert.equal(data.held, 0);
            if (!data.details) assertFirstScreen(metrics, true);
            if (capture) {
              await mkdir(join(out, "images"), { recursive: true });
              const image = `images/${variant}-${id}--${viewport.width}x${viewport.height}--${phase}--${tag}.png`;
              await page.screenshot({ path: join(out, ...image.split("/")), fullPage: false });
              screenshots.push({ screen_id: `${variant}-${id}`, state: `${variant}-${id}`, viewport, language: "zh-CN", phase, build,
                platform: `Web / ${browser.browserType().name()}`, ui_scale: "100%", device_scale_factor: 1,
                source: "Fixed third-night completed-wave/wounded-zero-damage enemy and restored authentic empty-crop terrain; one native kill per isolated RNG attempt, no RNG override; normal dawn/growth thereafter",
                relative_image_path: image, issue_ids: ["UI-037"], status: "已截", visual_review: "待用户/协调逐图审查",
                captured_at: new Date().toISOString(), data, metrics, inputs: [...inputs],
                repro_steps: ["隔离第三夜末波结束前置，原耗尽快照地形/四墙/空作物，种0；缺麦库存1或2明确固定",
                  "真实触控杀一只20HP/零速零伤害史莱姆并拾原随机补给；未中所需物资的隔离样本另存，不清成功链库存、不改RNG",
                  "正常无暂停跨32秒清晨边界，展开/取消栅栏、方向与交互播种/自然成熟收麦，或真实走工作台按原成本合成",
                  "不是自然三夜通关或实体手机；CDP触控与WebKit键盘长按限制分开"] });
            }
            return data;
          };
          await page.goto(origin); await enterPlay(page, "knight");
          await page.evaluate(({ snapshot, variant, capture }) => {
            const s = CUBE.getState();
            s.tiles = Uint8Array.from(snapshot.tiles); s.crops = new Map(snapshot.crops); s.fenceHp = new Map(snapshot.fenceHp);
            Object.assign(s.inv, snapshot.inv, { wheat: variant === "seed" ? 1 : 2 });
            Object.assign(s.flags, { moved: true, chopped: true, built: true, gathered: true });
            s.day = false; s.nights = 3; s.cycle = 22; s.nightLen = 32;
            s.wave = s.wavesTotal = 3; s.toSpawn = 0;
            Object.assign(s.player, { x: 552, y: 408, dir: 2, vx: 0, vy: 0 });
            s.enemies = capture ? [{ kind: "slime", x: 574, y: 408, vx: 0, vy: 0, hp: 20, maxHp: 32, spd: 0, dmg: 0, hit: 0, flash: 0, bob: 0 }] : [];
            if (!capture) s.drops = [{ kind: variant, x: 616, y: 408, z: 6, vz: -40, life: 18 }];
          }, { snapshot: proof.snapshot, variant, capture });
          const initial = await read();
          if (capture) await hold("Space", () => CUBE.getState().enemies.length === 0);
          else await hold("ArrowRight", (kind) => CUBE.getState().inv[kind] > (kind === "seed" ? 0 : 2), variant);
          await page.waitForFunction(() => CUBE.getState().drops.length === 0);
          const picked = await read();
          matched = variant === "seed" ? picked.inv.seed > 0 : picked.inv.wheat === 3;
          attempts.push({ variant, viewport, attempt, matched, initial, picked, inputs: [...inputs],
            source: capture ? "native kill, original unmodified RNG" : "recorded possible seed/wheat drop fixture; native approach and original pickup physics, not a probability sample" });
          await save();
          if (!matched) continue;
          assert.equal(picked.day, false); assert.equal(picked.target.kind, "camp");
          await shot("picked-night");
          await page.waitForFunction(() => CUBE.getState().day);
          if (variant === "seed") {
            const dawn = await shot("dawn"); assert.equal(dawn.target.kind, "farm");
            await tap("#play-details summary");
            const guide = await shot("guide");
            assert.match(guide.guide, before ? /工作台/ : /金框.*播种/);
            await tap('[data-build="fence"]');
            await tap("#play-details summary");
            const selected = await shot("build-selected");
            assert.equal(selected.build, "fence"); assert.deepEqual(selected.inv, guide.inv);
            await tap('[data-build="fence"]');
            if ((await read()).player.x >= 560) await hold("ArrowLeft", () => CUBE.getState().player.x <= 558);
            await hold("ArrowUp", () => CUBE.getState().player.dir === 3);
            const positioned = await read();
            assert.ok(positioned.player.x >= 544 && positioned.player.x < 560
              && positioned.player.y >= 400 && positioned.player.y < 416, "native approach must stay below the target farm cell");
            await tap("#touch-interact");
            await page.waitForFunction(() => CUBE.getState().crops.has("34,24"));
            await tap("#play-details summary");
            const growing = await shot("growing");
            assert.equal(growing.inv.seed, picked.inv.seed - 1); assert.equal(growing.target.kind, "crop");
            assert.match(growing.guide, before ? /工作台/ : /麦苗还在长/);
            await page.waitForFunction(() => CUBE.getState().crops.get("34,24")?.stage >= 2);
            const ripe = await shot("ripe");
            assert.ok(ripe.time - growing.time >= 14); assert.match(ripe.guide, before ? /工作台/ : /收麦/);
            await tap("#play-details summary");
            await hold("Space", (w) => CUBE.getState().inv.wheat > w, growing.inv.wheat);
            await tap("#play-details summary");
            const harvested = await shot("harvested");
            assert.equal(harvested.inv.wheat, growing.inv.wheat + 1);
            records.push({ variant, viewport, initial, picked, dawn, guide, selected, growing, ripe, harvested, inputs });
          } else {
            await tap("#play-details summary");
            const dawn = await shot("dawn-ready");
            assert.equal(dawn.target.kind, "bench"); assert.match(dawn.guide, /工作台/);
            await tap("#play-details summary");
            if ((await read()).player.x > 480) await hold("ArrowLeft", () => CUBE.getState().player.x <= 480);
            await hold("ArrowLeft", () => CUBE.getState().player.x <= 392);
            await hold("ArrowUp", () => CUBE.getState().player.y < CUBE.getState().bench.y + 18);
            const stock = await read();
            await tap("#touch-interact");
            await page.waitForFunction(() => CUBE.getState().inv.heart === 1);
            await tap("#play-details summary");
            const crafted = await shot("crafted");
            for (const [key, cost] of Object.entries({ wood: 4, stone: 5, gold: 3, wheat: 3 })) assert.equal(crafted.inv[key], stock.inv[key] - cost);
            assert.equal(crafted.target.kind, "altar");
            records.push({ variant, viewport, initial, picked, dawn, stock, crafted, inputs });
          }
          assert.deepEqual(errors, []);
          await save();
        } catch (error) {
          console.log("DAWN_HANDOFF_FAILURE", JSON.stringify({ variant, viewport, attempt, state: readFailure ? await readFailure() : null }));
          throw error;
        } finally { await context.close(); }
      }
      assert.ok(matched, `No ${variant} observed in24 original-RNG independent samples; do not force loot`);
    }
  }
  await save();
  console.log(`DAWN_SUPPLY_HANDOFF_OK ${browser.browserType().name()} ${phase} ${records.length} routes ${screenshots.length} native PNGs ${attempts.length} ${capture ? "unmodified-RNG samples" : "observed-supply fixture replays"}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve();
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  try { await testDawnSupplyHandoff(browser, origin, { before: process.argv.includes("--before"), capture: process.argv.includes("--capture") }); }
  finally { await browser.close(); await new Promise((r) => server.close(r)); }
}
