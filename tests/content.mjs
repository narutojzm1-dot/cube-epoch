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

if (logs.length) throw new Error("page errors: " + logs.join(" | "));
await browser.close();
server.close();
console.log("CONTENT_OK");
