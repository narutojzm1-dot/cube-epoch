import { serve, launch, enterPlay } from "./helpers.mjs";

const { server, origin } = await serve();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const logs = [];
page.on("pageerror", (e) => logs.push(e.message));

await page.goto(origin + "?seed=content", { waitUntil: "domcontentloaded" });
await enterPlay(page, "knight");

const setNight = () => page.evaluate(() => {
  const st = window.CUBE.getState();
  st.skippedGuide = true;
  st.day = false;
  st.cycle = 1;
  st.nightLen = 999;
  st.nights = 1;
  st.wave = 9;
  st.wavesTotal = 9;
  st.toSpawn = 0;
  st.enemies = [];
  st.rocks = [];
  st.campHp = 100;
  st.player.x = 40 * 16 + 8;
  st.player.y = 30 * 16 + 8;
});
const tileAt = (tx, ty) => page.evaluate(([x, y]) => window.CUBE.getState().tiles[y * 48 + x], [tx, ty]);

// 掘地虫：无视围墙，直取篝火
await setNight();
await page.evaluate(() => {
  const C = window.CUBE;
  const st = C.getState();
  st.inv.wood = 40;
  C.setBuild("fence");
  for (const [tx, ty] of [[22, 20], [21, 21], [23, 21], [22, 22]]) C.place(tx, ty);
  C.setBuild(null);
  C.spawn("burrower", 22, 15);
});
const under0 = await page.evaluate(() => window.CUBE.getState().enemies[0].under);
if (!under0) throw new Error("burrower should start underground");
await page.waitForFunction(() => window.CUBE.getState().campHp < 100, null, { timeout: 8000 });
const fenceN = await page.evaluate(() => window.CUBE.getState().fenceHp.get("22,20"));
if (fenceN !== 80) throw new Error("burrower must dig under fences, fence hp=" + fenceN);

// 火把旁显形
await setNight();
await page.evaluate(() => {
  const C = window.CUBE;
  const st = C.getState();
  st.tiles[10 * 48 + 30] = 13;
  C.spawn("burrower", 31, 10);
});
await page.waitForTimeout(120);
const lit = await page.evaluate(() => window.CUBE.getState().enemies[0]?.under);
if (lit !== false) throw new Error("torch should reveal burrower");

// 孢子花：死后腐蚀农田
await setNight();
await page.evaluate(() => {
  const C = window.CUBE;
  const i = C.spawn("spore", 22, 27);
  C.getState().enemies[i].hp = 0;
});
await page.waitForTimeout(120);
for (const [tx, ty] of [[22, 27], [21, 27], [23, 28]]) {
  const t = await tileAt(tx, ty);
  if (t !== 14) throw new Error(`spore should corrupt ${tx},${ty}, got ${t}`);
}

// 投石魔：远程砸墙
await setNight();
await page.evaluate(() => {
  const C = window.CUBE;
  C.getState().fenceHp.set("22,20", 80);
  C.spawn("thrower", 22, 13);
});
await page.waitForFunction(() => (window.CUBE.getState().fenceHp.get("22,20") ?? 0) < 80, null, { timeout: 9000 });
const throwerPos = await page.evaluate(() => {
  const st = window.CUBE.getState();
  const e = st.enemies[0];
  return Math.hypot(e.x - st.camp.x, e.y - st.camp.y);
});
if (throwerPos < 60) throw new Error("thrower should keep distance, d=" + throwerPos);

// 纪元 Boss：末夜最后一波登场，半血进入二阶段
await setNight();
await page.evaluate(() => {
  const st = window.CUBE.getState();
  st.nights = 2;
  st.eraStart = 0;
  st.wavesTotal = 3;
  st.wave = 2;
  st.waveWait = 3;
});
await page.waitForFunction(() => window.CUBE.getState().enemies.some((e) => e.kind === "slime_king"), null, { timeout: 4000 });
const split = await page.evaluate(async () => {
  const st = window.CUBE.getState();
  const boss = st.enemies.find((e) => e.kind === "slime_king");
  const before = st.enemies.length;
  boss.hp = boss.maxHp * 0.4;
  await new Promise((r) => setTimeout(r, 500));
  return { phase2: boss.phase2, added: st.enemies.length - before };
});
if (!split.phase2 || split.added < 4) throw new Error("boss phase 2 should split slimes: " + JSON.stringify(split));

// 日晷行动点：白天砍树/建造耗点，耗尽后被拦下；撤销退回材料与点数；天亮回满
const ap = await page.evaluate(() => {
  const C = window.CUBE;
  const st = C.getState();
  st.enemies = [];
  st.day = true;
  st.cycle = 1;
  st.dayLen = 999;
  st.ap = 2;
  st.inv.wood = 10;
  const trees = [];
  for (let i = 0; i < st.tiles.length; i += 1) if (st.tiles[i] === 6) trees.push([i % 48, Math.floor(i / 48)]);
  const [ax, ay] = trees[0];
  const [bx, by] = trees[1];
  C.gather(ax, ay);
  const afterChop = st.ap;
  C.setBuild("fence");
  const woodBefore = st.inv.wood;
  C.place(30, 24);
  const afterBuild = st.ap;
  const blockedTree = st.tiles[by * 48 + bx];
  C.gather(bx, by);
  const stillTree = st.tiles[by * 48 + bx] === blockedTree;
  const undone = C.undo();
  const refunded = st.inv.wood === woodBefore && st.ap === 1 && st.tiles[24 * 48 + 30] !== 12;
  C.setBuild(null);
  return { afterChop, afterBuild, stillTree, undone, refunded };
});
if (ap.afterChop !== 1 || ap.afterBuild !== 0 || !ap.stillTree || !ap.undone || !ap.refunded) {
  throw new Error("sundial AP economy broken: " + JSON.stringify(ap));
}
await page.evaluate(() => {
  const st = window.CUBE.getState();
  st.day = true;
  st.dayLen = 0.05;
  st.cycle = 0;
  st.nightLen = 0.05;
});
await page.waitForFunction(() => window.CUBE.getState().ap >= 14, null, { timeout: 4000 });
await page.waitForFunction(() => window.CUBE.getState().choosing, null, { timeout: 4000 });
await page.click("button.choice");

// 新建筑：箭塔自动射击、尖刺掉血、圣泉回血；箭塔是实心建筑
await setNight();
const builds = await page.evaluate(async () => {
  const C = window.CUBE;
  const st = C.getState();
  st.inv.stone = 20;
  st.inv.gold = 5;
  st.inv.wood = 20;
  st.inv.wheat = 5;
  st.player.x = 40 * 16 + 8;
  st.player.y = 30 * 16 + 8;
  for (const [x, y] of [[30, 12], [31, 12], [30, 13], [31, 13], [29, 12], [29, 13], [30, 11], [31, 11]]) st.tiles[y * 48 + x] = 1;
  C.setBuild("tower");
  C.place(30, 12);
  C.setBuild("spike");
  C.place(31, 13);
  C.setBuild("spring");
  C.place(38, 30);
  C.setBuild(null);
  const tower = st.tiles[12 * 48 + 30];
  const spike = st.tiles[13 * 48 + 31];
  const spring = st.tiles[30 * 48 + 38];
  C.spawn("slime", 33, 12);
  const slime = st.enemies[st.enemies.length - 1];
  slime.spd = 0;
  const hp0 = slime.hp;
  st.player.hp = 10;
  st.player.x = 38 * 16 + 8;
  st.player.y = 31 * 16 + 8;
  await new Promise((r) => setTimeout(r, 1200));
  return { tower, spike, spring, shot: slime.hp < hp0 || !st.enemies.includes(slime), healed: st.player.hp > 10, stone: st.inv.stone, gold: st.inv.gold };
});
if (builds.tower !== 15 || builds.spike !== 16 || builds.spring !== 17) throw new Error("buildings not placed: " + JSON.stringify(builds));
if (builds.stone !== 15 || builds.gold !== 4) throw new Error("building costs wrong: " + JSON.stringify(builds));
if (!builds.shot) throw new Error("arrow tower should shoot nearby enemies");
if (!builds.healed) throw new Error("holy spring should heal the player");
const spikeHit = await page.evaluate(async () => {
  const C = window.CUBE;
  const st = C.getState();
  st.enemies = [];
  C.spawn("slime", 31, 13);
  const s = st.enemies[0];
  s.spd = 0;
  const hp0 = s.hp;
  await new Promise((r) => setTimeout(r, 400));
  return hp0 - s.hp;
});
if (!(spikeHit > 0)) throw new Error("spikes should hurt ground enemies standing on them");

// 地图生态：同种子同图，不同种子分区不同；四类生态齐全
const worlds = await page.evaluate(() => {
  const C = window.CUBE;
  const sig = () => {
    const st = C.getState();
    return { biomes: st.biomes.map((b) => `${b.kind}@${b.name}`).join(","), hash: Array.from(st.tiles).join("") };
  };
  C.start("miner", "biome-a");
  const a = sig();
  C.start("miner", "biome-a");
  const a2 = sig();
  const seen = new Set();
  const kinds = new Set();
  for (let i = 0; i < 8; i += 1) {
    C.start("miner", "biome-" + i);
    const s = sig();
    seen.add(s.biomes);
    for (const k of C.getState().biomes) kinds.add(k.kind);
  }
  return { same: a.hash === a2.hash, layouts: seen.size, kinds: [...kinds].sort().join(",") };
});
if (!worlds.same) throw new Error("same seed must produce the same map");
if (worlds.layouts < 3) throw new Error("biome layouts should vary by seed: " + JSON.stringify(worlds));
for (const k of ["lake", "rubble"]) if (!worlds.kinds.includes(k)) throw new Error("missing biome " + k);
if (!/forest|mushroom/.test(worlds.kinds) || !/quarry|crystal/.test(worlds.kinds)) throw new Error("missing biome kinds: " + worlds.kinds);

// 晶洞石像：在附近挖金可能吵醒石像，变成敌人
const statue = await page.evaluate(() => {
  const C = window.CUBE;
  const st = C.getState();
  st.enemies = [];
  st.ap = 99;
  for (let k = 0; k < 40 && !st.enemies.length; k += 1) {
    st.tiles[5 * 48 + 30] = 19;
    st.tiles[5 * 48 + 33] = 5;
    C.gather(33, 5);
  }
  return { woke: st.enemies.length, tile: st.tiles[5 * 48 + 30] };
});
if (!statue.woke || statue.tile === 19) throw new Error("mining gold near a statue should eventually wake it: " + JSON.stringify(statue));

// 白天随机事件：同种子同一天抽到同一事件；商队可交易、陨石限时、兽群提前来
const events = await page.evaluate(() => {
  const C = window.CUBE;
  C.start("miner", "events");
  const st = C.getState();
  st.skippedGuide = true;
  const seq = () => {
    const out = [];
    for (let n = 1; n <= 20; n += 1) {
      st.nights = n;
      const ev = C.rollDayEvent();
      out.push(ev ? ev.id : "-");
    }
    return out.join(",");
  };
  const a = seq();
  const b = seq();
  return { a, b };
});
if (events.a !== events.b) throw new Error("day events must be deterministic per seed/day");
for (const id of ["caravan", "meteor", "migration", "-"]) {
  if (!events.a.split(",").includes(id)) throw new Error(`20 days should include ${id}: ${events.a}`);
}
const dayOf = (id) => events.a.split(",").indexOf(id) + 1;
const startEvent = (n) => page.evaluate(async (night) => {
  const C = window.CUBE;
  const st = C.getState();
  st.paused = false;
  st.day = true;
  st.cycle = 1;
  st.dayLen = 999;
  st.enemies = [];
  st.nights = night;
  const ev = C.rollDayEvent();
  ev.delay = 0;
  await new Promise((r) => setTimeout(r, 200));
  return { id: ev.id, started: ev.started, x: ev.x, y: ev.y, trade: ev.trade, tiles: ev.tiles };
}, n);

const caravan = await startEvent(dayOf("caravan"));
const traded = await page.evaluate((ev) => {
  const C = window.CUBE;
  const st = C.getState();
  st.player.x = ev.x;
  st.player.y = ev.y + 8;
  for (const k of Object.keys(st.inv)) st.inv[k] = 20;
  C.interact();
  const want = Object.entries(ev.trade.get).every(([k, n]) => st.inv[k] === 20 + n);
  const paid = Object.entries(ev.trade.give).every(([k, n]) => st.inv[k] === 20 - n);
  C.interact();
  C.interact();
  const capped = st.dayEvent.trades;
  return { want, paid, capped };
}, caravan);
if (!caravan.started || !traded.want || !traded.paid || traded.capped !== 2) throw new Error("caravan trade broken: " + JSON.stringify(traded));

const meteor = await startEvent(dayOf("meteor"));
const meteorTiles = await page.evaluate(async (ev) => {
  const st = window.CUBE.getState();
  const at = (c) => st.tiles[c.y * 48 + c.x];
  const placed = ev.tiles.filter((c) => at(c) === c.t).length;
  const gold = ev.tiles.filter((c) => at(c) === 5).length;
  st.cycle = st.dayLen - 0.02;
  await new Promise((r) => setTimeout(r, 200));
  const left = ev.tiles.filter((c) => at(c) === 4 || at(c) === 5).length;
  return { placed, gold, left, night: !st.day };
}, meteor);
if (meteorTiles.placed < 8 || meteorTiles.gold < 3 || !meteorTiles.night || meteorTiles.left !== 0) {
  throw new Error("meteor event broken: " + JSON.stringify(meteorTiles));
}

const migration = await startEvent(dayOf("migration"));
const herd = await page.evaluate(async () => {
  const st = window.CUBE.getState();
  st.dayEvent.wait = 0.05;
  await new Promise((r) => setTimeout(r, 300));
  return st.enemies.length;
});
if (migration.id !== "migration" || herd < 4) throw new Error("migration should bring a daytime mini-wave, got " + herd);

if (logs.length) throw new Error("page errors: " + logs.join(" | "));
await browser.close();
server.close();
console.log("CONTENT_OK");
