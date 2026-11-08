import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { serve, enterPlay } from "../../../tests/helpers.mjs";
import { inspect } from "../../../tests/layout-ui.mjs";

const out = dirname(fileURLToPath(import.meta.url)), baseline = "1ad39a6a8d129ae182c98384434b4e020da7252d";
const original = JSON.parse(await readFile(join(out, "before-37c84035.json"), "utf8"));
const proof = JSON.parse(await readFile(join(out, "..", "exhausted-wheat-supply", "reachable-state.json"), "utf8"));
const { server, origin } = await serve();
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const screenshots = [];
try {
  for (const width of [320, 390]) {
    const viewport = { width, height: width === 320 ? 568 : 844 };
    const picked = original.records.find((r) => r.variant === "seed" && r.viewport.width === width).picked;
    for (const phase of ["before", "after"]) {
      const files = ["index.html", "style.css", "game.js"];
      const buffers = await Promise.all(files.map((f) => phase === "before" ? execFileSync("git", ["show", `${baseline}:${f}`]) : readFile(f)));
      const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      try {
        const page = await context.newPage();
        if (phase === "before") await page.route("**/*", async (route) => {
          const p = new URL(route.request().url()).pathname, i = p === "/" ? 0 : files.findIndex((f) => p === "/" + f);
          if (i < 0) await route.continue();
          else await route.fulfill({ body: buffers[i], contentType: ["text/html", "text/css", "application/javascript"][i] });
        });
        await page.goto(origin); await enterPlay(page, "knight");
        await page.evaluate(({ snapshot, picked }) => {
          const s = CUBE.getState();
          s.tiles = Uint8Array.from(snapshot.tiles); s.crops = new Map(snapshot.crops); s.fenceHp = new Map(snapshot.fenceHp);
          Object.assign(s.inv, picked.inv);
          Object.assign(s.player, picked.player, { vx: 0, vy: 0 });
          Object.assign(s.flags, { moved: true, chopped: true, built: true, gathered: true });
          s.day = false; s.nights = 3; s.cycle = 30.5; s.nightLen = 32;
          s.wave = s.wavesTotal = 3; s.toSpawn = 0; s.enemies = []; s.drops = [];
        }, { snapshot: proof.snapshot, picked });
        await page.waitForFunction(() => CUBE.getState().day);
        await page.evaluate(() => {
          window.__settled = new Promise((r) => document.getElementById("play-details").addEventListener("toggle", r, { once: true }));
        });
        const rect = await page.locator("#play-details summary").boundingBox();
        await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2);
        await page.evaluate(() => window.__settled);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const data = await page.evaluate(() => ({ inv: { ...CUBE.getState().inv }, target: CUBE.currentTarget(),
          day: CUBE.getState().day, paused: CUBE.getState().paused, time: CUBE.getState().time, cycle: CUBE.getState().cycle,
          guide: document.getElementById("guide-body").textContent, summary: document.getElementById("guide-summary").textContent }));
        assert.deepEqual(data.inv, picked.inv); assert.equal(data.target.kind, "farm"); assert.equal(data.paused, false);
        assert.match(data.guide, phase === "before" ? /工作台/ : /金框.*播种/);
        const image = `images/paired-guide--${width}x${viewport.height}--${phase}.png`;
        await page.screenshot({ path: join(out, ...image.split("/")), fullPage: false });
        screenshots.push({ screen_id: "paired-guide", state: "third-dawn picked-seed, exact recorded inventory match", viewport, phase,
          language: "zh-CN", platform: "Web / Chromium", device_scale_factor: 1, ui_scale: "100%",
          build: { sha: baseline, dirty: phase === "after", source_sha256: createHash("sha256").update(Buffer.concat(buffers)).digest("hex") },
          source: "Replay of BEFORE successful native random seed pickup inventory/position; original night-to-day tick, not a new natural kill run",
          relative_image_path: image, issue_ids: ["UI-037"], status: "已截", visual_review: "待用户/协调审查",
          data, metrics: await inspect(page), captured_at: new Date().toISOString(), inputs: [{ input: "native touchscreen tap", rect }],
          repro_steps: ["取before-37c84035.json对应视口真实拾种后的库存/位置，逐项原样复用",
            "明确第三夜末1.5秒前置，原耗尽快照地形/四墙/空苗；之后无暂停或时钟/库存写入",
            "正常跨清晨，真实点开指南；本段是相同库存前置复放，不冒称本段又自然打怪拾种"] });
      } finally { await context.close(); }
    }
  }
  await writeFile(join(out, "paired-guide.json"), JSON.stringify({ screenshots }, null, 2) + "\n");
  console.log("PAIRED_GUIDE_OK 4 original PNGs exact inventory pairs native tap normal dawn");
} finally { await browser.close(); await new Promise((r) => server.close(r)); }
