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
// 验收：连续 3 局（不同种子）地图、天亮三选一都不完全相同
const runs3 = await page.evaluate(() => ["run-a", "run-b", "run-c"].map((sd) => {
  window.CUBE.start("miner", sd);
  return { tiles: Array.from(window.CUBE.getState().tiles).join(""), dawn: window.CUBE.rollDawn().join() };
}));
if (new Set(runs3.map((r) => r.tiles)).size !== 3) throw new Error("3 seeds must give 3 different maps");
if (new Set(runs3.map((r) => r.dawn)).size < 2) throw new Error("3 seeds should not all roll the same dawn: " + runs3.map((r) => r.dawn));

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

// 职业专属遗物：只出现在本职业的三选一里，并且权重更高
const classRelics = await page.evaluate(() => {
  const C = window.CUBE;
  const own = { miner: ["gold_nose", "deep_pick"], farmer: ["harvest_prayer", "fertile_soil"], mage: ["tower_enchant", "mana_spring"], knight: ["shield_thorns", "war_cry"] };
  const all = Object.values(own).flat();
  const out = {};
  for (const cls of Object.keys(own)) {
    let mine = 0;
    let foreign = 0;
    for (let i = 0; i < 40; i++) {
      C.start(cls, `cls-${i}`);
      for (const id of C.rollDawn()) {
        if (own[cls].includes(id)) mine += 1;
        else if (all.includes(id)) foreign += 1;
      }
    }
    out[cls] = { mine, foreign };
  }
  return out;
});
for (const [cls, r] of Object.entries(classRelics)) {
  if (r.foreign) throw new Error(`${cls} must not roll other classes' relics: ` + JSON.stringify(classRelics));
  if (r.mine < 15) throw new Error(`${cls} class relics should show up often: ` + JSON.stringify(classRelics));
}
const nose = await page.evaluate(() => {
  const C = window.CUBE;
  const dig = (relic) => {
    C.start("miner", "gold-nose");
    const st = C.getState();
    if (relic) st.relics.push(relic);
    st.drops = [];
    st.ap = 99;
    const i = Array.from(st.tiles).indexOf(5);
    C.gather(i % 48, Math.floor(i / 48));
    return st.drops.filter((d) => d.kind === "gold").length;
  };
  return { base: dig(null), nose: dig("gold_nose") };
});
if (nose.nose !== nose.base + 1) throw new Error("gold_nose should add one gold: " + JSON.stringify(nose));
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

// 高光统计随实际击杀和篝火掉血更新
const hlLive = await page.evaluate(async () => {
  const C = window.CUBE;
  const st = C.getState();
  st.day = false;
  st.cycle = 0;
  st.nightKills = 0;
  st.enemies = [];
  C.spawn("slime", 30, 30);
  st.enemies[0].hp = 0;
  await new Promise((r) => setTimeout(r, 300));
  return { kills: st.hl.bestKills, night: st.hl.bestKillsNight, nights: st.nights };
});
if (hlLive.kills < 1 || hlLive.night !== hlLive.nights) throw new Error("night kill highlight not tracked: " + JSON.stringify(hlLive));

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
  st.hl.bestKills = 12;
  st.hl.bestKillsNight = 2;
  st.hl.boss.push({ name: "史莱姆王", secs: 41 });
});
await page.waitForSelector("#btn-copy-share", { timeout: 3000 });
const share = await page.evaluate(() => window.CUBE.getState().share);
for (const bit of ["方块纪元", "种子", "第二纪元", "击杀", "遗物["]) {
  if (!share.includes(bit)) throw new Error("share text missing " + bit + ": " + share);
}
const body = await page.locator("#overlay-body").innerText();
if (!body.includes(share)) throw new Error("result overlay should show share text");
// 结算高光：篝火最低、单夜最多击杀、Boss 用时，并带进分享文本
for (const bit of ["【本局高光】", "篝火一度熄灭", "最猛一夜：第2夜击杀 12 只", "弑王：41 秒击败史莱姆王"]) {
  if (!body.includes(bit)) throw new Error("result highlights missing " + bit + ": " + body);
}
if (!share.includes("高光[篝火曾熄,单夜12杀,史莱姆王41秒]")) throw new Error("share text should carry highlights: " + share);

// 盾刺仅反弹实际受击：贴身和篝火拦截两条路径都遵守无敌帧。
const thorns = await page.evaluate(async () => {
  const { updateEnemies, canHitCamp } = await import("/combat.js");
  const { setTile } = await import("/core.js");
  const { T, TILE } = await import("/data.js");
  const rows = [];
  for (const distance of [5, 20]) {
    for (const invuln of [1, 0]) {
      window.CUBE.start("knight", "thorns-regression");
      const st = window.CUBE.getState();
      st.paused = true;
      st.day = true;
      st.relics = ["shield_thorns"];
      const p = st.player;
      p.x = st.camp.x;
      p.y = st.camp.y;
      p.invuln = invuln;
      const e = { kind: "slime", x: p.x + distance, y: p.y,
        vx: 0, vy: 0, hp: 100, maxHp: 100, spd: 0, dmg: 9, hit: 0, flash: 0, bob: 0 };
      setTile(Math.floor(e.x / TILE), Math.floor(e.y / TILE), T.GRASS);
      st.enemies = [e];
      const hp = p.hp;
      const campHp = st.campHp;
      const intercept = canHitCamp(e);
      updateEnemies(0);
      rows.push({ distance, invuln, intercept, damage: hp - p.hp, reflected: 100 - e.hp,
        campDamage: campHp - st.campHp });
    }
  }
  return rows;
});
for (const row of thorns) {
  if (row.distance === 20 && !row.intercept) throw new Error("thorns test must exercise camp interception");
  if (row.campDamage !== 0 || (row.invuln ? row.damage !== 0 : row.damage <= 0)
      || Math.abs(row.reflected - row.damage) > 1e-9) {
    throw new Error("thorns must reflect only actual damage: " + JSON.stringify(row));
  }
}

if (logs.length) throw new Error("page errors: " + logs.join(" | "));
await browser.close();
server.close();
console.log("ROGUELITE_OK");
