import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { ROOT, serve, enterPlay } from "../../../tests/helpers.mjs";
import { join } from "node:path";

const out = join(ROOT, "evidence", "ui-review-2026-11-06", "exhausted-wheat-supply");
const { server, origin } = await serve();
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage(), records = [];
try {
  await page.goto(origin); await enterPlay(page, "knight");
  await page.evaluate(() => {
    const s = CUBE.getState();
    Object.assign(s.inv, { wood: 4, stone: 5, gold: 3 });
    s.player.hp = 10;
    Object.assign(s.flags, { moved: true, chopped: true, gathered: true, built: true });
    for (const [x, y] of [[22, 20], [21, 21], [23, 21], [22, 22]]) {
      s.tiles[y * 48 + x] = 12; s.fenceHp.set(`${x},${y}`, 80);
    }
    for (let y = 23; y <= 31; y++) for (let x = 6; x <= 46; x++) {
      if (s.tiles[y * 48 + x] !== 8) s.tiles[y * 48 + x] = 1;
    }
    for (const x of [10, 18, 26, 34, 42]) s.tiles[24 * 48 + x] = 7;
  });
  const read = () => page.evaluate(() => {
    const s = CUBE.getState();
    return { time: s.time, cycle: s.cycle, day: s.day, nights: s.nights, over: s.over,
      inv: { ...s.inv }, hp: s.player.hp, campHp: s.campHp,
      crops: [...s.crops].map(([key, c]) => ({ key, ...c })),
      drops: s.drops.map((d) => ({ ...d, distance: Math.hypot(d.x - s.player.x, d.y - s.player.y) })),
      player: { x: s.player.x, y: s.player.y, dir: s.player.dir } };
  });
  const initial = await read();
  assert.equal(initial.inv.seed, 2); assert.equal(initial.crops.length, 3); assert.equal(initial.inv.wheat, 0);
  const progress = async () => writeFile(join(out, `reach-progress-${(process.env.CUBE_AGENT_RUN_ROOT || "check").slice(-8)}.json`),
    JSON.stringify({ initial, records, latest: await read() }, null, 2) + "\n");
  const position = async (x, y, dir) => {
    await page.evaluate(({ x, y, dir }) => Object.assign(CUBE.getState().player, { x, y, dir, vx: 0, vy: 0 }), { x, y, dir });
    records.push({ action: "location-only boundary fixture", x, y, dir, data: await read() });
    await progress();
  };
  const harvest = async (key) => {
    const [tx, ty] = key.split(",").map(Number), x = tx * 16 + 8, y = ty * 16 + 8;
    const sign = tx < 24 ? -1 : 1;
    await position(x + sign * 39.98, y + 39.98, 3);
    const point = await page.evaluate(({ x, y }) => {
      const c = CUBE.cam(), r = document.getElementById("game").getBoundingClientRect();
      return { x: r.x + (x - c.x) / 320 * r.width, y: r.y + (y - c.y) / 192 * r.height, canvas: { x: r.x, y: r.y, width: r.width, height: r.height } };
    }, { x, y });
    const start = await read();
    await page.mouse.move(point.x, point.y); await page.mouse.down();
    try { await page.waitForFunction((key) => !CUBE.getState().crops.has(key), key, { timeout: 5000 }); }
    finally { await page.mouse.up(); }
    const dropped = await read();
    await page.waitForTimeout(650);
    const settled = await read();
    records.push({ action: "native canvas mouse hold harvest", key, point, start, dropped, settled });
    await page.mouse.move(0, 0);
    await progress();
    while ((await read()).inv.wheat > 0 && (await read()).hp < 164.8) {
      const before = await read();
      await page.locator("#game").focus(); await page.keyboard.press("h");
      const after = await read(); records.push({ action: "native H consume harvested wheat", before, after });
      assert.equal(after.inv.wheat, before.inv.wheat - 1);
    }
  };
  for (const crop of initial.crops) await harvest(crop.key);
  for (let round = 0; round < 6; round++) {
    assert.equal((await read()).over, false, "bounded reachability sample must not die");
    const before = await read();
    if (before.inv.seed === 0 && before.crops.length === 0) break;
    await page.waitForFunction(() => !CUBE.getState().drops.some((d) => d.kind === "seed" || d.kind === "wheat"), null, { timeout: 22000 });
    const stock = (await read()).inv.seed, fields = [42, 34, 26, 18, 10];
    assert.ok(stock <= fields.length, "sample exhausted field capacity; do not fabricate seed depletion");
    for (let i = 0; i < stock; i++) {
      const x = fields[i] * 16 + 8;
      await position(x, 24 * 16 + 24, 3);
      const beforePlant = await read();
      await page.mouse.move(0, 0);
      await page.locator("#game").focus(); await page.keyboard.press("e");
      await page.waitForFunction((x) => CUBE.getState().crops.has(`${x},24`), fields[i]);
      records.push({ action: "native E plant", round, before: beforePlant, after: await read() });
      await progress();
      assert.equal((await read()).inv.seed, beforePlant.inv.seed - 1);
    }
    await position(360, 344, 0);
    await page.waitForFunction(() => [...CUBE.getState().crops.values()].every((c) => c.stage >= 2), null, { timeout: 20000 });
    for (const crop of (await read()).crops) await harvest(crop.key);
  }
  const expiryStart = await read();
  await page.waitForFunction(() => !CUBE.getState().drops.some((d) => d.kind === "seed" || d.kind === "wheat"), null, { timeout: 22000 });
  const final = await read();
  assert.equal(final.over, false); assert.equal(final.inv.seed, 0); assert.equal(final.crops.length, 0);
  assert.ok(final.inv.wheat < 3); assert.ok(records.some((r) => r.action === "native E plant"));
  assert.ok(records.some((r) => r.action.includes("harvest") && r.settled.drops.some((d) => d.kind === "seed" && d.distance >= 56)));
  const snapshot = await page.evaluate(() => {
    const s = CUBE.getState();
    return { inv: { ...s.inv }, tiles: [...s.tiles], crops: [...s.crops], hp: s.player.hp, fenceHp: [...s.fenceHp] };
  });
  await writeFile(join(out, "reachable-state.json"), JSON.stringify({
    initial, records, expiryStart, final, snapshot,
    source: "isolated fixed materials/wounded-player/field locations; original three mature crops preserved and actually harvested; default two seeds actually planted; no RNG, seed/crop/stage/life/time manipulation after setup",
    limitations: "location-only boundary fixtures between actions, not a continuous natural walking route or full three-night run; native mouse/E/H, original random drops and actual expiry",
  }, null, 2) + "\n");
  console.log(`EXHAUSTED_WHEAT_REACHABLE_OK harvests=${records.filter((r) => r.action === "native canvas mouse hold harvest").length} seed=${final.inv.seed} crops=${final.crops.length} wheat=${final.inv.wheat} time=${final.time}`);
} catch (error) {
  const state = await page.evaluate(() => {
    const s = CUBE.getState();
    return { time: s.time, day: s.day, paused: s.paused, over: s.over, hp: s.player.hp, campHp: s.campHp,
      inv: { ...s.inv }, crops: [...s.crops], enemies: s.enemies.length };
  });
  await writeFile(join(out, `reach-failure-${(process.env.CUBE_AGENT_RUN_ROOT || "check").slice(-8)}.json`),
    JSON.stringify({ error: error.message, state, records }, null, 2) + "\n");
  throw error;
} finally { await context.close(); await browser.close(); await new Promise((resolve) => server.close(resolve)); }
