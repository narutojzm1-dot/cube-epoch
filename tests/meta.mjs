import { serve, launch } from "./helpers.mjs";

const { server, origin } = await serve();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const logs = [];
page.on("pageerror", (e) => logs.push(e.message));

await page.goto(origin, { waitUntil: "domcontentloaded" });

// 标题页：图鉴/成就入口，未解锁显示剪影
if (!(await page.locator("#btn-daily").isDisabled())) throw new Error("daily button should wait for a class pick");
await page.locator("#btn-codex").click();
const codex = await page.locator("#overlay-body").textContent();
if (!codex.includes("【敌人图鉴】0/") || !codex.includes("？？？") || !codex.includes("【成就】0/")) {
  throw new Error("fresh codex should be all silhouettes: " + codex.slice(0, 80));
}
await page.locator("#overlay-actions button").click();
const stats0 = await page.locator("#title-stats").textContent();
if (!stats0.includes("还没有战绩")) throw new Error("fresh title stats wrong: " + stats0);

// 今日挑战：日期种子，地图与当天所有人一致；分享文本用每日格式
await page.locator('.class-card[data-class="miner"]').click();
await page.locator("#btn-daily").click();
await page.locator("#btn-skip-intro").click();
await page.locator("#btn-skip-brief").click();
await page.waitForSelector("#screen-game:not(.hidden)");
const daily = await page.evaluate(() => {
  const C = window.CUBE;
  const st = C.getState();
  const hash = Array.from(st.tiles).join("");
  const seed = st.seed;
  C.start("miner", seed);
  return { seed, want: C.dailySeed(), same: Array.from(C.getState().tiles).join("") === hash, share: C.shareText() };
});
if (daily.seed !== daily.want || !/^daily-\d{8}$/.test(daily.seed)) throw new Error("daily seed wrong: " + JSON.stringify(daily));
if (!daily.same) throw new Error("daily seed should give the same map");
if (!daily.share.startsWith(`方块纪元·每日 ${daily.seed.slice(-4)} · `)) throw new Error("daily share format wrong: " + daily.share);

// 成就与图鉴写入 localStorage；结算记录战绩
const meta = await page.evaluate(async () => {
  const C = window.CUBE;
  const st = C.getState();
  st.skippedGuide = true;
  C.spawn("slime", 40, 30);
  st.flags.crafted = true;
  await new Promise((r) => setTimeout(r, 900));
  st.campHp = 1;
  st.enemies = [];
  C.spawn("slime", 22, 20);
  st.enemies[0].x = st.camp.x;
  st.enemies[0].y = st.camp.y - 16;
  st.day = false;
  await new Promise((r) => setTimeout(r, 1500));
  return {
    over: st.over,
    ach: JSON.parse(localStorage.getItem("cube-epoch:v1:ach") || "{}"),
    codex: JSON.parse(localStorage.getItem("cube-epoch:v1:codex") || "{}"),
    stats: JSON.parse(localStorage.getItem("cube-epoch:v1:stats") || "{}"),
  };
});
if (!meta.over) throw new Error("run should end when the campfire dies");
if (!meta.ach.first_heart || !meta.ach.daily) throw new Error("achievements not saved: " + JSON.stringify(meta.ach));
if (!meta.codex.enemies.includes("slime")) throw new Error("codex should record seen enemies");
if (meta.stats.runs !== 1 || meta.stats.daily[daily.seed] === undefined) throw new Error("run stats not recorded: " + JSON.stringify(meta.stats));

await page.goto(origin, { waitUntil: "domcontentloaded" });
const stats1 = await page.locator("#title-stats").textContent();
if (!stats1.includes("已玩 1 局") || !stats1.includes("今日挑战最佳")) throw new Error("title stats should show saved runs: " + stats1);
await page.locator("#btn-codex").click();
const codex2 = await page.locator("#overlay-body").textContent();
if (!codex2.includes("史莱姆") || !codex2.includes("★ 心之匠")) throw new Error("codex should reveal unlocked entries");

// 存档损坏不应让游戏崩溃
await page.evaluate(() => localStorage.setItem("cube-epoch:v1:codex", "{bad json"));
await page.goto(origin, { waitUntil: "domcontentloaded" });
await page.locator("#btn-codex").click();

if (logs.length) throw new Error("page errors: " + logs.join(" | "));
await browser.close();
server.close();
console.log("META_OK");
