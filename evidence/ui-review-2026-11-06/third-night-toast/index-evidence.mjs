import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL(".", import.meta.url));
const names = (await readdir(root)).filter((n) => /^(before|after)-fixture-night3-.+\.json$/.test(n)).sort();
const manifests = await Promise.all(names.map(async (name) => ({
  name, ...JSON.parse(await readFile(join(root, name), "utf8")),
})));
const current = manifests.filter((m) => m.records.length === 4 && m.records.every((r) => r.firstNight.paused === true));
assert.equal(current.length, 2, "one before/after capture of the controlled dusk frame required");
const descriptions = {
  "night-3-toast": "第3夜入夜瞬间：金色立方、4波、当前操作提示",
  "wall-facing-hold": "恢复真实帧后原生面对栅栏按住攻击：原规则拆墙",
  "wall-side-attack": "原生补墙、侧移施放：保墙、库存不变、无残留按压",
};
const enrich = (row) => ({ ...row, state: descriptions[row.screen_id], full_page: false,
  native_image_pixels: { width: row.viewport.width, height: row.viewport.height },
  actual_game_viewport: row.data.canvas, input: [...new Set(row.inputs.map((i) => i.type))].join(" + "),
});
const screenshots = current.flatMap((m) => m.screenshots.map(enrich));
const history = manifests.filter((m) => !current.includes(m)).flatMap((m) => m.screenshots.map((r) => ({
  ...enrich(r), history_reason: "初次读取toast后，下一真实帧波次通知替换了它；图片不作为目标入夜toast前后证据，原数据/原图保留并注明时序错位",
})));
assert.equal(screenshots.length, 24);
assert.equal(history.length, 24);
const paths = [...screenshots, ...history].map((r) => r.relative_image_path);
assert.equal(new Set(paths).size, 48);
for (const row of [...screenshots, ...history]) {
  const png = await readFile(join(root, ...row.relative_image_path.split("/")));
  assert.equal(png.readUInt32BE(16), row.viewport.width);
  assert.equal(png.readUInt32BE(20), row.viewport.height);
}
assert.deepEqual((await readdir(join(root, "images"))).sort(), paths.map((p) => p.split("/").at(-1)).sort());
const records = current.flatMap((m) => m.records.map((r) => ({ manifest: m.name, ...r })));
for (const r of records) {
  assert.equal(r.firstNight.nights, 3); assert.equal(r.firstNight.wavesTotal, 4);
  assert.equal(r.firstNight.nightLen, 32); assert.equal(r.firstNight.paused, true);
  assert.equal(r.dismantled.paused, false); assert.equal(r.safe.paused, false);
  assert.equal(r.dismantled.wall, 1); assert.equal(r.dismantled.gaps.length, 4);
  assert.equal(r.safe.wall, 12); assert.equal(r.safe.gaps.length, 3);
  assert.equal(r.ready.inv.wood, r.firstNight.inv.wood - 1);
  assert.deepEqual(r.safe.inv, r.ready.inv); assert.equal(r.safe.held, 0);
}
await writeFile(join(root, "screenshots.json"), JSON.stringify({
  issue_ids: ["UI-031"], screenshots, history,
  limitations: ["24张当前明示第3夜夹具图，24张读取/截图错帧历史图",
    "入夜toast原会在下一帧被首波通知替换；仅夹具在DOM变更微任务暂停拍摄此帧，原生输入前恢复，不修改游戏时序",
    "旧a342ef0普通三夜390样本只读抽核，不称本源码自然通关或真实手机",
    "全部Web Chromium、DPR1、中文、UI100%；视觉验收待协调"],
}, null, 2) + "\n");
await writeFile(join(root, "validation.json"), JSON.stringify({ records }, null, 2) + "\n");
const table = (rows) => ["| 阶段 | 状态 | 视口 | 原图 |", "|---|---|---|---|",
  ...rows.map((r) => `| ${r.phase} / 明示第3夜夹具 | ${r.state} | ${r.viewport.width}×${r.viewport.height} | [原图](${r.relative_image_path}) |`)].join("\n");
const builds = [...new Map(screenshots.map((r) => [r.build.source_sha256, r.build])).values()];
await writeFile(join(root, "INDEX.md"), [
  "# UI-031 第三夜及以后触屏入夜toast",
  "",
  "只改第三夜及以后触屏toast：保留金色立方与波数，短句说明面朝怪打、朝墙会拆墙。第二夜原文仅蝙蝠飞墙，未改；第三夜桌面整句与3.2秒参数、波次/时序/规则/地图/存档均不改。现有守夜引导沿用PR27。",
  "",
  "[逐图来源/实际画布/输入](screenshots.json) · [库存、墙、夜数与暂停边界](validation.json) · [检查](checks.log) · [独立审查](review.log)",
  "",
  "## 明示夹具与真实输入",
  "",
  "四视口320×568、390×844、844×390触控及1280×800桌面，法师隔离新局原生选角/开始。边界注入夜数2、木4、首墙(22,22)HP80、玩家(378,358)左向，cycle=dayLen−0.01，下一真实帧进入第3夜，原4波/32秒。该场景用新局边界准备，不是自然第三天或通关；具体参数见测试源码。",
  "",
  "独立审查发现：startNightWaves把waveWait设2.2，后续updateEnemies在下一帧立即beginWave，替换入夜toast。初次数据读到入夜文字但24张原图已显示首波消息，不能当作目标toast取证。原图/原日志保留在历史。",
  "",
  "仅测试夹具用MutationObserver在入夜文字变更后的微任务暂停该帧，原图明确data.paused=true；拍完立即恢复，原生朝墙按住/拆墙、点图补墙、侧移施放均paused=false。没有延后游戏首波、加长toast、自动滚图或伪装普通存档。恢复后仍按原next-frame规则发首波通知。",
  "",
  "Chromium触屏为原生CDP按住/松手与tap；桌面真实键盘/鼠标。拆墙原退款1木，补墙扣2木，缺口3→4→3；侧移施放保墙且建造库存不变。WebKit闸门持续按压是键盘回退，触屏点击仍原生tap。全部中文、DPR1、UI100%，PNG原尺寸，真实canvas CSS矩形逐图记录；视觉审查仍待用户/协调。",
  "",
  "## 实际拍摄源码（不倒填未来提交号）",
  ...builds.map((b) => `- SHA ${b.sha}；产品dirty=${b.dirty}；三文件SHA256 ${b.source_sha256}；${b.source}。`),
  "",
  "## 当前24张同态前后原图",
  "",
  table(screenshots),
  "",
  "## 历史24张：下一帧通知替换造成读取/截图错位",
  "",
  table(history),
  "",
  "## 普通样本只读抽核与未覆盖",
  "",
  "复看旧 [a342ef0普通第三夜](../natural-loop-a342ef0/images/night-3--390x844.png) 和 [原执行记录](../natural-loop-a342ef0/INDEX.md)：原phase night-3为252.7553秒、第1/4波、篝火100、四墙仍在；finish三夜白天献心胜利。只读复用，不改result/events/图片，不把旧a342ef0称为当前源码自然实玩。其原执行器exit1、录像缺末约9秒的限制仍保留；新局边界测试不是自然通关。",
  "",
  "本片未新跑普通三夜或实体设备；第二夜/第四夜夹具无新增图片，仅同输入/原文回归。只有受影响第3夜状态补图，无未变全界面重拍；现有覆盖清单只读核查。D:\\.tmp\\agents\\cube-epoch\\独占GUID环境/缓存/profile，浏览器关闭后精确清理；既有C浏览器安装只读，无安装。不合并、不发Pages或腾讯云，PR25–27/旧诊断保留。",
  "",
].join("\n"));
console.log("THIRD_NIGHT_EVIDENCE_OK current24 history24 originalPNG48");
