import { serve, launch, enterPlay } from "./helpers.mjs";

const { server, origin } = await serve();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const logs = [];
page.on("pageerror", (e) => logs.push(e.message));

// 固定种子 → 事件序列可复现
await page.goto(origin + "?seed=test1027", { waitUntil: "domcontentloaded" });
await enterPlay(page, "miner");
const seedA = await page.evaluate(() => {
  const C = window.CUBE;
  const st = C.getState();
  const tiles = Array.from(st.tiles).join("");
  return { seed: st.seed, tiles, dawn: C.rollDawn() };
});
if (seedA.seed !== "test1027") throw new Error("url seed not applied, got " + seedA.seed);
const seedB = await page.evaluate(() => {
  const C = window.CUBE;
  C.start("miner", "test1027");
  const st = C.getState();
  return { tiles: Array.from(st.tiles).join(""), dawn: C.rollDawn() };
});
if (seedA.tiles !== seedB.tiles) throw new Error("same seed must generate same map");
if (seedA.dawn.join() !== seedB.dawn.join()) throw new Error("same seed must roll same dawn choices: " + seedA.dawn + " vs " + seedB.dawn);
const seedC = await page.evaluate(() => {
  window.CUBE.start("miner", "other-seed");
  return window.CUBE.rollDawn();
});
if (seedC.length !== 3 || new Set(seedC).size !== 3) throw new Error("dawn must offer 3 distinct choices, got " + seedC);

// 每夜独立随机流：同种子下第一夜打法不同（刷怪次数不同），第二夜的三选一和出怪序列仍然相同
const nightStable = await page.evaluate(() => {
  const C = window.CUBE;
  const run = (extraSpawns) => {
    C.start("miner", "night-stream");
    const st = C.getState();
    st.day = false;
    st.nights = 1;
    st.wave = 1;
    for (let i = 0; i < extraSpawns; i++) C.spawnEnemy();
    st.enemies = [];
    st.nights = 2;
    const dawn = C.rollDawn();
    const kinds = [];
    st.wave = 3;
    for (let i = 0; i < 8; i++) {
      const e = C.spawnEnemy();
      kinds.push(e ? `${e.kind}@${Math.round(e.x)},${Math.round(e.y)}` : "-");
    }
    st.enemies = [];
    return { dawn: dawn.join(), kinds: kinds.join(";") };
  };
  return { a: run(0), b: run(17) };
});
if (nightStable.a.dawn !== nightStable.b.dawn) throw new Error("night-2 dawn picks must not depend on night-1 play: " + JSON.stringify(nightStable));
if (nightStable.a.kinds !== nightStable.b.kinds) throw new Error("night-2 spawns must not depend on night-1 play: " + JSON.stringify(nightStable));
await page.evaluate(() => window.CUBE.start("miner", "test1027"));

// 撑过一夜 → 黎明三选一出现并能选
await page.evaluate(() => {
  const st = window.CUBE.getState();
  st.skippedGuide = true;
  st.day = false;
  st.nights = 1;
  st.wavesTotal = 2;
  st.wave = 2;
  st.toSpawn = 0;
  st.enemies = [];
  st.ap = 1;
  st.lastPlace = { fixture: true };
  st.cycle = st.nightLen - 0.05;
});
await page.waitForSelector("#overlay:not(.hidden) button.choice", { timeout: 3000 });
const title = await page.locator("#overlay-title").innerText();
if (!title.includes("黎明")) throw new Error("dawn overlay title wrong: " + title);
const n = await page.locator("#overlay-actions button.choice").count();
if (n !== 3) throw new Error("dawn should show 3 choices, got " + n);
const paused = await page.evaluate(() => window.CUBE.getState().paused);
if (!paused) throw new Error("game must pause while choosing");
const dawnReset = await page.evaluate(() => {const st=window.CUBE.getState(); return {dayLen:st.dayLen, ap:st.ap, lastPlace:st.lastPlace};});
if (dawnReset.dayLen !== 62 || dawnReset.ap !== 14 || dawnReset.lastPlace !== null) throw new Error("dawn must restore normal day/AP and clear undo: " + JSON.stringify(dawnReset));
const picked = await page.locator("#overlay-actions button.choice").first().getAttribute("data-relic");
await page.locator("#overlay-actions button.choice").first().click();
const after = await page.evaluate(() => {
  const st = window.CUBE.getState();
  return { picks: st.picks, paused: st.paused, choosing: st.choosing, hidden: document.getElementById("overlay").classList.contains("hidden") };
});
if (after.picks[0] !== picked || after.paused || after.choosing || !after.hidden) {
  throw new Error("pick should apply and resume: " + JSON.stringify(after));
}

// 献祭 → 进入第二纪元
await page.evaluate(() => {
  const st = window.CUBE.getState();
  st.day = true;
  st.cycle = 0;
  st.nights = 3;
  st.inv.heart = 1;
  st.player.x = st.altar.x;
  st.player.y = st.altar.y + 16;
  window.CUBE.interact();
});
await page.waitForSelector("#btn-next-era", { timeout: 2000 });
await page.locator("#btn-next-era").click();
const era = await page.evaluate(() => {
  const st = window.CUBE.getState();
  return { era: st.era, eraStart: st.eraStart, over: st.over, paused: st.paused, dayLen: st.dayLen };
});
if (era.era !== 2 || era.eraStart !== 3 || era.over || era.paused || era.dayLen !== 62) throw new Error("next era failed: " + JSON.stringify(era));

// 结算页战绩文本
await page.evaluate(() => {
  const st = window.CUBE.getState();
  st.campHp = 0.1;
  st.enemies = [{
    kind: "slime", x: st.camp.x, y: st.camp.y - 16,
    vx: 0, vy: 0, hp: 999, maxHp: 999, spd: 0, dmg: 9, hit: 0, flash: 0, bob: 0,
  }];
  st.player.x = st.camp.x + 120;
  st.player.y = st.camp.y;
});
await page.waitForSelector("#btn-copy-share", { timeout: 3000 });
const share = await page.evaluate(() => window.CUBE.getState().share);
for (const bit of ["方块纪元", "种子", "第二纪元", "击杀", "遗物["]) {
  if (!share.includes(bit)) throw new Error("share text missing " + bit + ": " + share);
}
const body = await page.locator("#overlay-body").innerText();
if (!body.includes(share)) throw new Error("result overlay should show share text");

if (logs.length) throw new Error("page errors: " + logs.join(" | "));
await browser.close();
server.close();
console.log("ROGUELITE_OK");
