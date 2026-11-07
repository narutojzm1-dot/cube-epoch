import assert from "node:assert/strict";
import { mkdir, writeFile, appendFile, rename, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve } from "../../../tests/helpers.mjs";

const OUT = dirname(fileURLToPath(import.meta.url));
const viewport = { width: 390, height: 844 };
const started = Date.now();
const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const dirty = !!execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }).trim();
const productDirty = !!execFileSync("git", ["diff", "HEAD", "--", "index.html", "style.css", "game.js"],
  { cwd: ROOT, encoding: "utf8" }).trim();
const productHash = createHash("sha256").update(Buffer.concat(await Promise.all(
  ["index.html", "style.css", "game.js"].map((p) => readFile(join(ROOT, p)))))).digest("hex");
await mkdir(join(OUT, "images"), { recursive: true });
await mkdir(join(OUT, "video"), { recursive: true });
await writeFile(join(OUT, "events.jsonl"), "", { flag: "wx" });
const shots = [];
const events = [];
const { server, origin } = await serve();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1, locale: "zh-CN",
  recordVideo: { dir: join(OUT, "video"), size: viewport },
});
const page = await context.newPage();
const video = page.video();
const session = await context.newCDPSession(page);
let sampler, sampling = false, previousPhase = "", lastSample = 0, failure;

async function observe() {
  return page.evaluate(() => {
    const s = window.CUBE?.getState();
    if (!s) return null;
    return {
      time: s.time, day: s.day, cycle: s.cycle, nights: s.nights, wave: s.wave,
      wavesTotal: s.wavesTotal, campHp: s.campHp, kills: s.kills,
      paused: s.paused, over: s.over, win: s.win, build: s.build,
      player: { x: s.player.x, y: s.player.y, hp: s.player.hp, vx: s.player.vx, vy: s.player.vy,
        skillCd: s.player.skillCd },
      inv: { ...s.inv }, flags: { ...s.flags }, tiles: [...s.tiles],
      crops: [...s.crops].map(([tile, c]) => ({ tile, ...c })), fences: [...s.fenceHp],
      enemies: s.enemies.map((e) => ({ kind: e.kind, x: e.x, y: e.y, hp: e.hp })),
      held: document.querySelectorAll("#touch-controls .held").length,
      detailsOpen: document.getElementById("play-details").open,
      scroll: { x: scrollX, y: scrollY },
      overlay: document.getElementById("overlay-title").textContent,
    };
  });
}
function compact(s) {
  if (!s) return s;
  const { tiles, ...rest } = s;
  return rest;
}
async function log(type, data = {}) {
  const e = { wall_time: new Date().toISOString(), elapsed_seconds: (Date.now() - started) / 1000, type, ...data };
  events.push(e);
  await appendFile(join(OUT, "events.jsonl"), JSON.stringify(e) + "\n");
  if (!["input", "sample"].includes(type)) console.log(type, JSON.stringify(data));
}
async function shot(id, steps) {
  const before = compact(await observe());
  const relative_image_path = `images/${id}--390x844.png`;
  await page.screenshot({ path: join(OUT, relative_image_path), fullPage: false });
  const after = compact(await observe());
  shots.push({
    screen_id: id, state: id, viewport, language: "zh-CN",
    build: { sha, dirty, product_dirty: productDirty, product_source_sha256: productHash },
    source: "normal", input: "automated ordinary native touch input; read-only state telemetry",
    platform: "Web / Chromium", ui_scale: "100%", device_scale_factor: 1, full_page: false,
    relative_image_path, repro_steps: steps, issue_ids: [], status: "已截",
    visual_review: "待协调人实际看图", captured_at: new Date().toISOString(),
    live_state_before: before, live_state_after: after,
    note: "游戏持续运行，截图不冻结时间；没有fixture、状态写入、qa参数或动作API调用",
  });
  await writeFile(join(OUT, "screenshots.json"), JSON.stringify({ screenshots: shots }, null, 2) + "\n");
}
async function touch(type, points) {
  await session.send("Input.dispatchTouchEvent", { type, touchPoints: points });
}
async function center(selector) {
  const r = await page.locator(selector).boundingBox();
  assert.ok(r, selector);
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 };
}
async function tap(selector) {
  await log("input", { action: "tap", selector });
  await page.locator(selector).tap();
}
async function hold(selector, ms) {
  await log("input", { action: "hold", selector, ms });
  await touch("touchStart", [await center(selector)]);
  await page.waitForTimeout(ms);
  await touch("touchEnd", []);
}
async function worldPoint(tx, ty) {
  const cam = await page.evaluate(() => window.CUBE.cam());
  const r = await page.locator("#game").boundingBox();
  return { x: r.x + ((tx * 16 + 8 - cam.x) / 320) * r.width,
    y: r.y + ((ty * 16 + 8 - cam.y) / 192) * r.height, id: 1 };
}
const walkable = (tiles, x, y) => x >= 0 && x < 48 && y >= 0 && y < 36 && ![3, 4, 5, 6].includes(tiles[y * 48 + x]);
function pathTo(s, tx, ty) {
  const start = [Math.floor(s.player.x / 16), Math.floor(s.player.y / 16)];
  const q = [[...start, []]], seen = new Set([start.join(",")]);
  for (let i = 0; i < q.length; i++) {
    const [x, y, route] = q[i];
    if (x === tx && y === ty) return route;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      const key = `${nx},${ny}`;
      if (!seen.has(key) && walkable(s.tiles, nx, ny)) {
        seen.add(key); q.push([nx, ny, [...route, [nx, ny]]]);
      }
    }
  }
  throw new Error(`No ordinary walking route to ${tx},${ty}`);
}
async function moveTo(tx, ty) {
  const s = await observe();
  const route = pathTo(s, tx, ty);
  for (const [x, y] of [...route, [tx, ty]]) {
    const goal = { x: x * 16 + 8, y: y * 16 + 8 };
    for (let count = 0; count < 10; count++) {
      const now = await observe();
      assert.ok(!now.over && !now.paused, "game must keep running");
      const dx = goal.x - now.player.x, dy = goal.y - now.player.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) <= 2.5) break;
      const horizontal = Math.abs(dx) > Math.abs(dy), delta = horizontal ? dx : dy;
      const direction = horizontal ? delta > 0 ? "ArrowRight" : "ArrowLeft" : delta > 0 ? "ArrowDown" : "ArrowUp";
      await hold(`[data-hold="${direction}"]`, Math.max(25, Math.min(180, (Math.abs(delta) - 1) / 64 * 1000)));
      if (count === 9) throw new Error(`Movement blocked at ${now.player.x},${now.player.y}, target ${x},${y}`);
    }
  }
}
async function approach(tx, ty) {
  const s = await observe();
  const choices = [[tx - 1, ty], [tx + 1, ty], [tx, ty - 1], [tx, ty + 1]]
    .filter(([x, y]) => walkable(s.tiles, x, y))
    .map(([x, y]) => ({ x, y, path: pathTo(s, x, y) })).sort((a, b) => a.path.length - b.path.length);
  assert.ok(choices.length, `reachable resource ${tx},${ty}`);
  await moveTo(choices[0].x, choices[0].y);
}
async function gather(tx, ty) {
  await approach(tx, ty);
  const before = await observe(), tile = before.tiles[ty * 48 + tx];
  assert.ok([4, 5, 6, 8].includes(tile), `ordinary resource ${tx},${ty} type ${tile}`);
  await log("gather-start", { tile: [tx, ty], type: tile, state: compact(before) });
  await touch("touchStart", [await worldPoint(tx, ty)]);
  try {
    await page.waitForFunction(({ tx, ty, tile }) => {
      const s = window.CUBE.getState();
      return s.tiles[ty * 48 + tx] !== tile || (tile === 8 && (s.crops.get(`${tx},${ty}`)?.stage || 0) < 2);
    },
      { tx, ty, tile }, { timeout: 6000 });
  } finally { await touch("touchEnd", []); }
  await page.waitForTimeout(300);
  await log("gather-end", { tile: [tx, ty], state: compact(await observe()) });
}
async function details(open) {
  const s = await observe();
  if (s.detailsOpen !== open) await tap("#play-details summary");
  await page.waitForFunction((open) => document.getElementById("play-details").open === open, open);
}
async function choose(kind) {
  await details(true);
  await tap(`.item[data-build="${kind}"]`);
  assert.equal((await observe()).detailsOpen, false, "selecting a build must return to the core touch controls");
}
async function place(tx, ty) {
  await log("input", { action: "canvas-place", tile: [tx, ty] });
  await touch("touchStart", [await worldPoint(tx, ty)]);
  await page.waitForTimeout(65);
  await touch("touchEnd", []);
  await page.waitForTimeout(50);
}
async function cropsForFood() {
  for (const [tx, ty] of [[25, 25], [21, 27], [24, 28], [26, 27]]) {
    const s = await observe();
    if (s.crops.some((c) => c.tile === `${tx},${ty}` && c.stage === 2)) await gather(tx, ty);
  }
}
async function defend() {
  await moveTo(22, 21);
  let recordedCombat = false;
  while (true) {
    const s = await observe();
    if (s.over || s.day) break;
    if (Math.hypot(s.player.x - 360, s.player.y - 344) > 10) await moveTo(22, 21);
    if (s.player.hp < 90 && s.inv.wheat > 0) {
      await details(true); await tap('.item[data-k="wheat"]');
      await log("ate-wheat", { state: compact(await observe()) });
    }
    const targets = s.enemies.map((e) => ({ ...e, d: Math.hypot(e.x - s.player.x, e.y - s.player.y) }))
      .filter((e) => e.d < 40).sort((a, b) => a.d - b.d);
    if (targets.length) {
      const e = targets[0], cam = await page.evaluate(() => window.CUBE.cam());
      const r = await page.locator("#game").boundingBox();
      await log("input", { action: "canvas-attack", target: e });
      await touch("touchStart", [{ x: r.x + (e.x - cam.x) / 320 * r.width,
        y: r.y + (e.y - cam.y) / 192 * r.height, id: 1 }]);
      await page.waitForTimeout(70);
      await touch("touchEnd", []);
      if (!recordedCombat) {
        await shot(`night-${s.nights}-combat`, [`自然等待第${s.nights}夜，站营火旁，触屏瞄准接近的怪物攻击`]);
        recordedCombat = true;
      }
    }
    await page.waitForTimeout(150);
  }
}

page.on("pageerror", (e) => { void log("pageerror", { message: e.message }); });
try {
  await page.goto(origin);
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  await log("start", { sha, productHash, role: "knight", viewport, storage: "new empty isolated browser context",
    policy: "ordinary native inputs only; CUBE.getState/cam read-only telemetry; no state writes, qa, clock overrides, game-code modification or game action API calls" });
  await tap('.class-card[data-class="knight"]'); await tap("#btn-start");
  await tap("#btn-skip-intro"); await tap("#btn-skip-brief");
  await shot("first-day", ["独立空浏览器上下文，正常选骑士 → 开始 → UI跳过开场和预演，未修改存储"]);
  sampler = setInterval(async () => {
    if (sampling) return;
    sampling = true;
    try {
      const s = await observe();
      const phase = `${s.day ? "day" : "night"}-${s.nights}`;
      if (phase !== previousPhase) {
        previousPhase = phase;
        await log("phase", { phase, state: compact(s) });
        await shot(phase, ["普通输入持续运行至自然昼夜转换；没有暂停或修改时钟"]);
      }
      if (Date.now() - lastSample > 5000) { lastSample = Date.now(); await log("sample", { state: compact(s) }); }
    } finally { sampling = false; }
  }, 1000);

  await hold('[data-hold="ArrowRight"]', 300);
  await page.waitForTimeout(250);
  const stopped = await observe();
  await page.waitForTimeout(350);
  const released = await observe();
  assert.ok(Math.hypot(released.player.x - stopped.player.x, released.player.y - stopped.player.y) < 0.3);
  assert.equal(released.held, 0); assert.deepEqual(released.scroll, { x: 0, y: 0 });
  await log("touch-release-pass", { before: compact(stopped), after: compact(released) });
  await details(true);
  const reading = await observe();
  await shot("details-live-open", ["正常右移长按并松手，确认停止；点击详情，游戏继续运行"]);
  await page.waitForTimeout(1100);
  const read = await observe();
  assert.ok(!read.paused && read.time > reading.time + 0.7);
  await details(false);
  await log("details-live-pass", { opened: compact(reading), afterReading: compact(read), closed: compact(await observe()) });

  for (const tile of [[23, 18], [21, 17], [25, 22]]) await gather(...tile);
  await shot("wood-gathered", ["移动至营地附近三棵树，真实触屏长按砍树并拾取自然掉落"]);
  await moveTo(22, 21);
  await choose("fence");
  await shot("build-selected-details-closed", ["详情点栏，验证自动收起、建造选中且核心触控可达"]);
  for (const tile of [[22, 20], [21, 21], [23, 21], [22, 22]]) {
    await place(...tile);
    assert.equal((await observe()).tiles[tile[1] * 48 + tile[0]], 12);
  }
  await choose("fence");
  assert.equal((await observe()).build, null);
  await shot("camp-walled", ["普通UI选择栅栏，使用开局已有栏与实采木头，将营火四面围上，再次点栏取消"]);

  await moveTo(24, 25);
  await choose("plot"); await place(25, 25); await choose("plot");
  await hold('[data-hold="ArrowRight"]', 40); await tap("#touch-interact");
  assert.ok((await observe()).flags.planted, "normal interaction must plant seeds");
  await shot("planted", ["实采木头造田，方向键轻移朝向空田，正常交互播种，种子来自角色原有背包"]);
  for (const tile of [[21, 27], [24, 28], [26, 27]]) await gather(...tile);

  for (const tile of [[39, 15], [35, 14], [37, 13]]) {
    await gather(...tile);
    if ((await observe()).inv.stone < 5) await gather(...tile);
  }
  await shot("materials-collected", ["步行到东部矿区，普通长按挖3处金矿及变为石头的原矿；南部农田实收麦"]);
  await moveTo(24, 20);
  await tap("#touch-interact");
  assert.equal((await observe()).inv.heart, 1, "heart must come from normal workbench crafting");
  await shot("heart-crafted", ["实采木4石5金3麦3，返回工作台旁点击交互合成；未注入资源或心"]);
  await moveTo(22, 21);
  while (!(await observe()).over) {
    if (Date.now() - started > 420000) throw new Error("Bounded real-time run exceeded seven minutes");
    const s = await observe();
    if (!s.day) { await defend(); continue; }
    if (s.nights >= 3) {
      await shot("third-dawn-ready", ["连续自然守过三夜，第三夜后自然天亮，背包已实合成方块之心"]);
      await moveTo(24, 7); await tap("#touch-interact");
      break;
    }
    if (s.nights >= 1 && s.cycle < 12) { await cropsForFood(); await moveTo(22, 21); }
    await page.waitForTimeout(250);
  }
  const final = await observe();
  await shot(final.win ? "natural-victory" : "natural-failure", ["仅普通输入持续运行；最终真实胜利/失败，未调用win或qa"]);
  await log("finish", { state: compact(final) });
  if (!final.win) failure = new Error(`Natural run failed: ${final.overlay}`);
} catch (e) {
  failure = e;
  await log("run-failed", { message: e.stack, state: compact(await observe()) });
  await shot("run-stopped", ["普通输入验证遇到真实失败或操作脚本阻塞，未注入状态重试"]);
} finally {
  clearInterval(sampler);
  while (sampling) await page.waitForTimeout(50);
  await touch("touchEnd", []);
  const final = compact(await observe());
  await writeFile(join(OUT, "screenshots.json"), JSON.stringify({ screenshots: shots }, null, 2) + "\n");
  await context.close();
  const videoPath = await video.path();
  await rename(videoPath, join(OUT, "video", "continuous-natural-run.webm"));
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await writeFile(join(OUT, "result.json"), JSON.stringify({
    build: { sha, dirty, product_dirty: productDirty, product_source_sha256: productHash }, role: "knight", viewport,
    source: "normal player inputs, read-only automation telemetry; no fixture",
    wall_elapsed_seconds: (Date.now() - started) / 1000,
    result: failure ? "failed_or_blocked" : "natural_victory", failure: failure?.message || null,
    final, screenshots: shots.length, video: "video/continuous-natural-run.webm",
    visual_review: "待协调人看本批原图；不外推旧批次局部批准",
  }, null, 2) + "\n");
}
if (failure) { console.error(failure); process.exitCode = 1; }
