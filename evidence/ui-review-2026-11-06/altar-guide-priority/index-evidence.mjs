import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const load = async (name) => JSON.parse(await readFile(join(dir, name), "utf8"));
const before = await load("before-18491efe.json");
const after = await load("after-81347f55.json");
const partial = await load("before-c94a66a0.json");
const baselineChecks = await load("before-validation-6aa4da1d.json");
assert.equal(before.screenshots.length, 20);
assert.equal(after.screenshots.length, 20);
assert.equal(partial.screenshots.length, 4);
assert.equal(baselineChecks.records.length, 11);
assert.equal(after.records.length, 11);
const rows = [...before.screenshots, ...after.screenshots, ...partial.screenshots.map((row) => ({
  ...row, historical: true, history_reason: "initial partial320 reproduction; later runner incorrectly asserted original victory was not paused; valid4 early originals preserved, not current matrix",
}))];
const images = new Set();
for (const row of rows) {
  assert.ok(!images.has(row.relative_image_path));
  images.add(row.relative_image_path);
  const png = await readFile(join(dir, row.relative_image_path));
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png.readUInt32BE(16), row.viewport.width);
  assert.equal(png.readUInt32BE(20), row.viewport.height);
  assert.equal(row.data.paused, row.screen_id === "victory");
}
for (const [phase, records] of [["before", baselineChecks.records], ["after", after.records]]) {
  for (const r of records.filter((r) => r.id === "active-guide-delivery")) {
    assert.equal(r.dawn.skippedGuide, false);
    assert.equal(r.dawn.canOffer, true);
    assert.equal(r.dawn.guideStep, phase === "before" ? "build" : "offer");
    assert.equal(r.dawn.visibleGapPaint.length, phase === "before" ? 1 : 0);
    assert.ok(r.ready.player.y - r.arrived.player.y > 200);
    assert.deepEqual(r.arrived.inv, r.ready.inv);
    assert.deepEqual(r.arrived.gaps, r.ready.gaps);
    assert.deepEqual(r.arrived.fenceHp, r.ready.fenceHp);
    assert.deepEqual(r.offered.inv, { ...r.ready.inv, heart: 0 });
    assert.equal(r.offered.win, true);
  }
}
const source = createHash("sha256").update(Buffer.concat(await Promise.all(["index.html", "style.css", "game.js"]
  .map((f) => readFile(join(dir, "..", "..", "..", f)))))).digest("hex");
assert.equal(source, after.screenshots[0].build.source_sha256);
await writeFile(join(dir, "screenshots.json"), JSON.stringify({ current_count: 40, historical_count: 4,
  visual_review: "待用户/协调逐图审查", screenshots: rows }, null, 2) + "\n");
await writeFile(join(dir, "validation.json"), JSON.stringify({
  before: baselineChecks, after: { source: "after-81347f55.json actual native photo/test run", records: after.records },
  before_photo_note: "Reuse valid20 originals from before-18491efe.json; all4 main offers photographed before later wrong manual-stock assertion failed. Corrected11-case replay separately recorded without recapturing.",
}, null, 2) + "\n");
const lines = [
  "# UI-033 已可交付时不再回退补墙", "",
  "当前40张：第三黎明、营地可交付、展开教程、走到祭坛、胜利 × 320/390/844/1280 × 前后。另保留初次320的4张历史原图，不混作当前完整矩阵。视觉仍待用户/协调审查。", "",
  "[逐图版本/画布/输入](screenshots.json) · [前后11例验证](validation.json) · [检查](checks.log) · [独立代码审查](review.log)", "",
  "## 确证问题与最小修复", "",
  "保留教程、三夜后白天、心1/东缺口1：objective/currentTarget已指祭坛，但旧教程仍是「第三步：围营地」，正文要求补发光格，原画布确实绘制可见黄框缺口（逻辑坐标137,89），第三黎明toast也要求补墙。正常不补墙即可沿土路北行交付。", "",
  "复用canOffer()：已可交付教程提前选现有献祭步；黎明复用现有祭坛文字；只隐藏自动缺口高亮。主动选栅栏仍保留高亮/候选及原放置成本。未持心、前两夜、夜间和跳过教程语义照旧；献祭条件、胜负、时间、墙/经济/地图/输入/存档不变。", "",
  "## 明示前置与原生输入", "",
  "隔离骑士新局，真实点选/开始/跳过剧情，未跳教程。第三夜末time283.85/cycle31.85/nightLen32、nights3、完成第4/4波/空敌；三面80HP墙/东缺口(23,21)，木4、心1，骑士原存量栅栏2。玩家x392,y344，在原生成土路；不改其余地形或土路。此为固定前置，不是完整自然三夜通关。", "",
  "准备后引擎正常跨黎明；等原toast自然结束，真实打开/关闭教程，按住方向控件向北走超过200世界像素，距祭坛<22后真实交互一次，心1→0到原胜利。途中墙/缺口和全部库存不变。没有为截图主动暂停；胜利按原规则paused=true。", "",
  "320/390/844 Chromium原生CDP touchStart/end与tap；1280原生键鼠。完整WebKit按住使用键盘回退、手机交互仍tap，明确不冒称WebKit原生持续触摸。strokeRect测试包装仅记录实际黄框调用再原样绘制，未用布尔代理代替画布证据。折叠教程时核核心控制44px；展开教程仅按原面板布局检查完整正文，不声称所有控制同屏。", "",
  "## 拍摄版本", "",
  ...[before, after].map((data) => {
    const b = data.screenshots[0].build;
    return `- ${data === before ? "before" : "after"}：SHA ${b.sha}；产品dirty=${b.dirty}；三文件SHA256 ${b.source_sha256}。`;
  }), "",
  "全部Web/Chromium、中文、DPR1/UI100%，原PNG不缩放，真实CSS画布矩形逐图记录；不倒填将来提交号。修前20张的采图运行完成全部主路径，随后额外建造断言错误地假定扣2木而失败；图未受影响，全部复用，另一次正确11例回放不重拍，验证输入与拍图输入各自记录、不混称同一运行。", "",
  "初次只拍到320前4状态，执行器错误断言胜利不暂停；之后还纠正骑士优先现成栅栏/耗木1，以及胜利暂停后不再更新底层教程的原行为。原错误日志/4图保留；只修测试期望，不改任何产品规则。", "",
  "## 当前逐图", "",
  "| 阶段 | 状态 | 视口 | 原图 |", "|---|---|---|---|",
  ...rows.filter((r) => !r.historical).map((r) => `| ${r.phase} | ${r.screen_id} | ${r.viewport.width}×${r.viewport.height} | [原图](${r.relative_image_path}) |`), "",
  "## 初次部分取证（历史，不是当前矩阵）", "",
  ...rows.filter((r) => r.historical).map((r) => `- ${r.screen_id}： [原图](${r.relative_image_path})`), "",
  "## 限制", "",
  "不是完整自然三夜跑；未实体iOS/Android/系统手势测试。仅补受影响状态；未变界面复用原记录。保留PR25–29与旧natural诊断；不合并、不发Pages/腾讯云。", "",
];
await writeFile(join(dir, "INDEX.md"), lines.join("\n"));
console.log("ALTAR_GUIDE_EVIDENCE_OK current40 history4 actual PNGs and native11/11 replay");
