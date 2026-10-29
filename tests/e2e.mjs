import { serve, launch, enterPlay } from "./helpers.mjs";

const { server, origin } = await serve();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const logs = [];
page.on("pageerror", (e) => logs.push(e.message));

await page.goto(origin, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.removeItem("cube-epoch-seen"));
await page.locator('.class-card[data-class="knight"]').click();
await page.locator("#btn-start").click();
await page.waitForSelector("#screen-intro:not(.hidden)");
await page.waitForFunction(() => (document.getElementById("intro-text")?.innerText || "").includes("很久"));
const crawl = await page.locator("#intro-text").innerText();
if (!crawl.includes("很久")) throw new Error("intro crawl missing, got " + crawl);
await page.locator("#btn-skip-intro").click();
await page.waitForSelector("#briefing:not(.hidden)");
const briefTitle = await page.locator("#briefing-title").innerText();
if (!briefTitle.includes("保护")) throw new Error("briefing should start at camp, got " + briefTitle);
if (await page.evaluate(() => localStorage.getItem("cube-epoch-seen"))) throw new Error("intro alone must not mark briefing seen");
await page.locator("#btn-skip-brief").click();
await page.waitForSelector("#screen-game:not(.hidden)");
await page.waitForTimeout(200);

if ((await page.evaluate(() => localStorage.getItem("cube-epoch-seen"))) !== "1") throw new Error("completed briefing should mark seen");

const firstAim = await page.evaluate(() => {
  const t = window.CUBE.currentTarget();
  const st = window.CUBE.getState();
  const tx = Math.floor(t.x / 16);
  const ty = Math.floor(t.y / 16);
  return { kind: t && t.kind, tile: st.tiles[ty * 48 + tx] };
});
if (firstAim.kind !== "tree") throw new Error("first target should be tree, got " + firstAim.kind);
if (firstAim.tile !== 6) throw new Error("gold frame should sit on a tree tile, got " + firstAim.tile);

const dayLen = await page.evaluate(() => window.CUBE.getState().dayLen);
if (dayLen < 70) throw new Error("first day should be longer, dayLen=" + dayLen);

const startWood = await page.evaluate(() => window.CUBE.getState().inv.wood);
if (startWood < 2) throw new Error("starter wood should be 2, got " + startWood);

const obj = await page.locator("#objective").innerText();
if (!obj.includes("树")) throw new Error("objective should mention tree, got " + obj);

await page.keyboard.press("Digit1");
await page.waitForTimeout(60);
await page.keyboard.press("1");
const sticky = await page.evaluate(() => window.CUBE.getState().build);
if (sticky !== "fence") throw new Error("key 1 must stay on fence, got " + sticky);

await page.evaluate(() => {
  const st = window.CUBE.getState();
  st.player.x = 40 * 16 + 8;
});
await page.waitForFunction(() => window.CUBE.cam().x >= 400);
const cam = await page.evaluate(() => window.CUBE.cam());
if (cam.x < 400) throw new Error("camera should follow player, cam.x=" + cam.x);
await page.evaluate(() => {
  window.CUBE.getState().player.x = 24 * 16 + 8;
});

const woodBefore = await page.evaluate(() => window.CUBE.getState().inv.wood);
await page.evaluate(() => {
  window.CUBE.getState().flags.gathered = false;
  window.CUBE.gather(25, 22);
});
// Pickup is simulation-driven; a slow headless frame must not race this assertion.
await page.waitForFunction((before) => {
  const st = window.CUBE.getState();
  return st.flags.gathered && st.inv.wood > before;
}, woodBefore, { timeout: 10000 });
const gathered = await page.evaluate(() => {
  const st = window.CUBE.getState();
  return { wood: st.inv.wood, gathered: st.flags.gathered };
});
if (!gathered.gathered) throw new Error("first wood pickup should set gathered");
if (gathered.wood <= woodBefore) throw new Error("gather should add wood, " + woodBefore + " -> " + gathered.wood);

await page.evaluate(() => {
  const st = window.CUBE.getState();
  st.flags.chopped = true;
  st.inv.wood = 8;
});
await page.evaluate(() => {
  const st = window.CUBE.getState();
  Object.assign(st.inv, { stone: 5, gold: 3, wheat: 3 });
});
await page.waitForFunction(() => document.getElementById("objective").textContent.includes("围营"));
const gapAim = await page.evaluate(() => window.CUBE.currentTarget().kind);
if (gapAim !== "gap") throw new Error("after wood, target should be gap, got " + gapAim);

await page.evaluate(() => {
  window.CUBE.setBuild("fence");
  window.CUBE.place(23, 21);
});
await page.evaluate(() => {
  const st = window.CUBE.getState();
  st.fenceHp.set("23,21", 20);
  st.inv.wood = Math.max(2, st.inv.wood);
});
// The preceding harvest can still be in hitstop. Start this independent input
// scenario after it ends, then keep the button down until the action is processed.
await page.waitForFunction(() => window.CUBE.getState().hitstop <= 0);
await page.evaluate(() => {
  const canvas = document.getElementById("game");
  const scale = Number(canvas.dataset.scale || 3);
  const st = window.CUBE.getState();
  const p = st.player;
  const vw = 20 * 16;
  const vh = 12 * 16;
  const camx = Math.max(0, Math.min(p.x - vw / 2, 48 * 16 - vw));
  const camy = Math.max(0, Math.min(p.y - vh / 2, 36 * 16 - vh));
  const mx = (23 * 16 + 8 - camx) * scale;
  const my = (21 * 16 + 8 - camy) * scale;
  const r = canvas.getBoundingClientRect();
  const clientX = r.left + mx * (r.width / canvas.width);
  const clientY = r.top + my * (r.height / canvas.height);
  canvas.dispatchEvent(new MouseEvent("mousemove", { clientX, clientY, bubbles: true }));
  canvas.dispatchEvent(new MouseEvent("mousedown", { clientX, clientY, button: 0, bubbles: true }));
});
try {
  await page.waitForFunction(() => window.CUBE.getState().fenceHp.get("23,21") === 80);
} finally {
  await page.evaluate(() => window.dispatchEvent(new MouseEvent("mouseup", { button: 0, bubbles: true })));
}
const hp = await page.evaluate(() => window.CUBE.getState().fenceHp.get("23,21"));
if (hp !== 80) throw new Error("click repair should fill fence, hp=" + hp);

await page.evaluate(() => {
  const C = window.CUBE;
  const st = C.getState();
  st.inv.wood = 40;
  C.setBuild("fence");
  for (const [tx, ty] of [[22, 20], [21, 21], [23, 21], [22, 22]]) C.place(tx, ty);
});
const afterWall = await page.evaluate(() => window.CUBE.currentTarget().kind);
if (afterWall === "gap" || afterWall === "tree") {
  throw new Error("walled camp should not still aim at gap/tree, got " + afterWall);
}
const wallStart = await page.evaluate(() => {
  const st = window.CUBE.getState();
  st.day = false;
  st.nights = 1;
  st.wavesTotal = 2;
  st.wave = 1;
  st.toSpawn = 0;
  st.enemies = [{
    kind: "slime", x: 22 * 16 + 8, y: 18 * 16 + 8,
    vx: 0, vy: 0, hp: 32, maxHp: 32, spd: 40, dmg: 9, hit: 0, flash: 0, bob: 0,
  }];
  return st.time;
});
// Preserve the full defence observation window in simulation time, not just
// the first hit: a later bypass must still fail the camp-health assertion.
await page.waitForFunction((start) => {
  const st = window.CUBE.getState();
  return st.time - start >= 1.6;
}, wallStart, { timeout: 10000 });
const wall = await page.evaluate(() => {
  const st = window.CUBE.getState();
  return { camp: st.campHp, north: st.fenceHp.get("22,20") };
});
if (wall.camp < 99.5) throw new Error("walled camp should not take damage, " + wall.camp);
if (!(wall.north < 80)) throw new Error("north fence should take damage, " + wall.north);

const cubes = await page.evaluate(() => {
  const C = window.CUBE;
  const st = C.getState();
  st.day = false;
  st.nights = 3;
  st.wave = 2;
  st.enemies = [];
  st.bossPending = false;
  for (let i = 0; i < 10; i++) C.spawnEnemy();
  return st.enemies.filter((e) => e.kind === "cube").length;
});
if (cubes < 8) throw new Error("night 3 wave 2 should be cubes, got " + cubes);

await page.evaluate(() => {
  const st = window.CUBE.getState();
  st.day = true;
  st.over = false;
  st.win = false;
  st.paused = false;
  st.enemies = [];
  st.nights = 2;
  st.inv.heart = 1;
  st.player.hp = st.player.maxHp;
  st.player.x = st.altar.x;
  st.player.y = st.altar.y + 12;
});
if (await page.evaluate(() => window.CUBE.canOffer())) {
  throw new Error("two nights should not allow offer");
}
await page.keyboard.press("KeyE");
await page.waitForTimeout(80);
if (await page.evaluate(() => window.CUBE.getState().win)) {
  throw new Error("offering at two nights should not win");
}

await page.evaluate(() => { window.CUBE.getState().nights = 3; });
if (!(await page.evaluate(() => window.CUBE.canOffer()))) {
  throw new Error("three nights should allow offer");
}
await page.keyboard.press("KeyE");
await page.waitForFunction(() => window.CUBE.getState().win);
if (!(await page.evaluate(() => window.CUBE.getState().win))) {
  throw new Error("three nights offer should win");
}

// The integrated first era retains three nights, while later eras keep their
// expanded enemy table and Boss override rather than becoming cube-only.
const progression = await page.evaluate(async () => {
  const { startNightWaves } = await import("/combat.js");
  const st = window.CUBE.getState();
  const waves = [];
  for (const night of [1, 2, 3]) {
    st.nights = night;
    startNightWaves();
    waves.push([st.wavesTotal, st.nightLen]);
  }
  st.bossPending = true;
  st.nights = 3;
  st.wave = st.wavesTotal;
  st.enemies = [];
  window.CUBE.spawnEnemy();
  const boss = st.enemies[0]?.kind;
  st.era = 2;
  st.eraStart = 3;
  st.nights = 6;
  st.inv.heart = 1;
  const early = window.CUBE.canOffer();
  st.nights = 7;
  const ready = window.CUBE.canOffer();
  st.nights = 4;
  startNightWaves();
  const laterWaves = st.wavesTotal;
  st.wave = 2;
  st.bossPending = false;
  st.enemies = [];
  for (let i = 0; i < 100; i++) window.CUBE.spawnEnemy();
  return { waves, boss, early, ready, laterWaves, kinds: [...new Set(st.enemies.map(e => e.kind))] };
});
if (JSON.stringify(progression.waves) !== JSON.stringify([[2,26],[3,26],[4,32]])) throw new Error("first-era wave progression regressed: " + JSON.stringify(progression));
if (progression.boss !== "slime_king") throw new Error("Boss must take precedence over the cube reveal");
if (progression.early || !progression.ready || progression.laterWaves !== 5) throw new Error("later-era progression regressed: " + JSON.stringify(progression));
if (!progression.kinds.includes("thrower") || progression.kinds.length < 2) throw new Error("later-era enemy table must remain active: " + JSON.stringify(progression));

await page.reload({ waitUntil: "domcontentloaded" });
await page.locator('.class-card[data-class="knight"]').click();
await page.locator("#btn-start").click();
await page.waitForSelector("#screen-game:not(.hidden)");
const skipped = await page.evaluate(() => ({
  intro: document.getElementById("screen-intro").classList.contains("hidden"),
  brief: document.getElementById("briefing").classList.contains("hidden"),
}));
if (!skipped.intro) throw new Error("returning player should skip intro");
if (!skipped.brief) throw new Error("returning player should skip briefing");

// Returning daily players also skip the story, without losing the daily seed.
await page.reload({ waitUntil: "domcontentloaded" });
await page.locator('.class-card[data-class="knight"]').click();
await page.locator("#btn-daily").click();
await page.waitForSelector("#screen-game:not(.hidden)");
const returningDaily = await page.evaluate(() => ({seed: window.CUBE.getState().seed, expected: window.CUBE.dailySeed(), briefing: window.CUBE.getState().briefing}));
if (returningDaily.seed !== returningDaily.expected || returningDaily.briefing) throw new Error("returning daily start must preserve daily seed: " + JSON.stringify(returningDaily));

const realLogs = logs.filter((m) => !/audio device/i.test(m));
if (realLogs.length) throw new Error("page errors: " + realLogs.join(" | "));
await browser.close();
server.close();
console.log("E2E_OK");
