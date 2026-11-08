import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const load = async (name) => JSON.parse(await readFile(join(dir, name), "utf8"));
const before = await load("before-2c049934.json");
const after = await load("after-bcc0807f.json");
const partial = await load("before-5706d858.json");
assert.equal(before.screenshots.length, 28);
assert.equal(after.screenshots.length, 28);
assert.equal(partial.screenshots.length, 3);
assert.equal(before.records.length, 15);
assert.equal(after.records.length, 15);
const rows = [...before.screenshots, ...after.screenshots, ...partial.screenshots.map((row) => ({
  ...row, historical: true, history_reason: "initial3 UI frames only; runner then followed an incorrect sideways/down route instead of actual north-path workbench392,312; not successful craft/delivery evidence",
}))];
const paths = new Set();
for (const row of rows) {
  assert.ok(!paths.has(row.relative_image_path)); paths.add(row.relative_image_path);
  const png = await readFile(join(dir, row.relative_image_path));
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png.readUInt32BE(16), row.viewport.width);
  assert.equal(png.readUInt32BE(20), row.viewport.height);
  assert.equal(row.data.paused, row.screen_id === "victory");
}
for (const [phase, data] of [["before", before], ["after", after]]) {
  for (const r of data.records.filter((r) => r.id === "active-guide-craft-delivery")) {
    assert.equal(r.dawn.inv.heart, 0);
    assert.equal(r.dawn.skippedGuide, false);
    assert.equal(r.dawn.guideStep, phase === "before" ? "build" : "offer");
    assert.equal(r.dawn.target.kind, phase === "before" ? "gap" : "bench");
    assert.equal(r.dawn.visibleGapPaint.length, phase === "before" ? 1 : 0);
    assert.deepEqual(r.benchReached.inv, r.ready.inv);
    assert.deepEqual(r.crafted.inv, { ...r.ready.inv, wood: 0, stone: 0, gold: 0, wheat: 0, heart: 1 });
    assert.equal(r.crafted.target.kind, "altar");
    assert.deepEqual(r.arrived.inv, r.crafted.inv);
    assert.deepEqual(r.arrived.gaps, r.ready.gaps);
    assert.deepEqual(r.arrived.fenceHp, r.ready.fenceHp);
    assert.deepEqual(r.offered.inv, { ...r.crafted.inv, heart: 0 });
    assert.equal(r.offered.win, true);
    assert.equal(r.inputs.filter((e) => e.action === "#touch-interact" || e.action === "interact").length, 2);
    assert.ok(r.ready.player.y - r.arrived.player.y > 200);
  }
}
const hash = createHash("sha256").update(Buffer.concat(await Promise.all(["index.html", "style.css", "game.js"]
  .map((f) => readFile(join(dir, "..", "..", "..", f)))))).digest("hex");
assert.equal(hash, after.screenshots[0].build.source_sha256);
await writeFile(join(dir, "screenshots.json"), JSON.stringify({
  current_count: 56, historical_count: 3, visual_review: "待用户/协调逐图审查", screenshots: rows,
}, null, 2) + "\n");
await writeFile(join(dir, "validation.json"), JSON.stringify({
  before: { source: "before-2c049934.json actual native photo/test run", records: before.records },
  after: { source: "after-bcc0807f.json actual native photo/test run", records: after.records },
}, null, 2) + "\n");
const lines = [
  "# UI-034 三夜后备齐配方时优先工作台指引", "",
  "56张当前：第三黎明、营地备齐、展开教程、到工作台、合成成功、到祭坛、胜利 × 320/390/844/1280 × 前后。初次3张部分取证历史另列，视觉待用户/协调审查。", "",
  "[逐图源码/画布/输入](screenshots.json) · [前后各15例](validation.json) · [检查](checks.log) · [独立代码审查](review.log)", "",
  "## 实证与限定修复", "",
  "三夜后白天、尚未持心、木4/石5/金3/麦3齐全、东缺墙1：顶部objective已让去工作台，但旧currentGuide仍是围营、地图目标是缺口且真实黄框缺口可见，黎明toast也要求补墙。旧规则允许不补墙正常到工作台合成再献祭。", "",
  "新增纯指引条件canGuideHeartCraft（白天/三夜已过/无心/原四类配方齐）：在已有心祭坛优先之后，对齐现有教程正文、地图工作台目标、黎明现有工作台文字，取消自动缺口高亮。使用既有第五步及objective文字，不扩教程。主动选栅栏保留高亮/候选与成本；材料不足、前两夜、夜间和已持心照旧。这个条件仅用于指引，不是合成许可，不改变原早期或夜间合成条件。", "",
  "## 明示第三黎明前置与真实操作", "",
  "隔离骑士新档，原生选角/开始/跳过剧情，教程未跳过。time283.85/cycle31.85/nightLen32、nights3、已完成第4/4波/空敌；心0、木4石5金3麦3、原存量栅栏2/种2，三面80HP墙/东缺口(23,21)。玩家原土路x392,y344，工作台原坐标392,312、祭坛392,104；不改原生成地形/土路。不是完整自然三夜通关。", "",
  "准备后引擎正常跨黎明；等原toast消失，真实开关教程，向北按住走到原工作台22px内，第一次真实交互扣木4石5金3麦3，心0→1。继续沿原土路向北到祭坛22px内，第二次真实交互心1→0并原规则胜利。主路径恰好两次交互，未调用动作API。移动段库存、墙/缺口、篝火HP不变；种/现成栅栏等非配方库存全保留。", "",
  "320/390/844为Chromium原生CDP touchStart/end及tap，1280原生键鼠；WebKit闸门方向按住是键盘回退，交互tap，不冒称原生持续触控。图未主动暂停；胜利按原规则paused=true。原PNG不缩放、DPR1/UI100%/中文/Web，真实CSS画布矩形及输入逐图记录。", "",
  "实际黄框由仅观察/原样委托的strokeRect包装记录；不拿逻辑布尔代理代替画布证据。折叠状态核44px核心控件，展开教程正文完整按原面板布局检查，不声称展开时全部控制同屏。", "",
  "## 拍摄版本（不倒填未来提交）", "",
  ...[before, after].map((data) => {
    const b = data.screenshots[0].build;
    return `- ${data === before ? "before" : "after"}：SHA ${b.sha}；产品dirty=${b.dirty}；三文件SHA256 ${b.source_sha256}。`;
  }), "",
  "## 适用正反覆盖", "",
  "前后各15例：四视口完整合成/献祭；逐类缺木/石/金/麦；前两夜/夜间；已有心在工作台不重扣材料且祭坛仍优先；跳过教程语义；主动建墙先用现成、无现成骑士耗木1；余心胜利原样。原祭坛11例在修后及完整闸门继续执行。", "",
  "## 当前56张", "",
  "| 阶段 | 状态 | 视口 | 原图 |", "|---|---|---|---|",
  ...rows.filter((r) => !r.historical).map((r) => `| ${r.phase} | ${r.screen_id} | ${r.viewport.width}×${r.viewport.height} | [原图](${r.relative_image_path}) |`), "",
  "## 初次部分取证历史（不作成功路径）", "",
  "初次执行器未先核实际工作台坐标，误走右/下而超时，见before.log。实际源码/原始data.bench明确392,312；执行器改为原土路向北，没有改产品/地图、加长超时或跳过移动断言。3张初始UI图和失败原日志保留；历史repro_steps的错误预期路线也未伪改。", "",
  ...rows.filter((r) => r.historical).map((r) => `- ${r.screen_id}： [历史图](${r.relative_image_path})`), "",
  "## 限制与保护", "",
  "未实体iOS/Android/系统手势/安全区测试；非自然三夜通关。仅补受影响状态，其余已记录界面复用，不称当前全界面重拍或视觉通过。保留PR25–30及旧诊断/待验收版本；D盘专用临时根自行清理，不合并、不发布Pages或腾讯云。", "",
];
await writeFile(join(dir, "INDEX.md"), lines.join("\n"));
console.log("BENCH_GUIDE_EVIDENCE_OK current56 history3 PNG/native recipe+offer checks");
