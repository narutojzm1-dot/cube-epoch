import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const dir = new URL("./", import.meta.url);
const load = async (name) => JSON.parse(await readFile(new URL(name, dir), "utf8"));
const before = await load("before-8a9d8677.json"), after = await load("after-406465f1.json");
const partial = [await load("before-61485c09.json"), await load("before-cb59c2e8.json")];
const current = [...before.screenshots, ...after.screenshots];
const history = partial.flatMap((m) => m.screenshots.map((s) => ({ ...s, historical: true,
  evidence_note: "部分执行器历史；初次未等UI帧，第二次向北转身走入麦田，非有效等待/完整路径证据" })));
assert.equal(before.records.length, 20); assert.equal(after.records.length, 20);
assert.equal(current.length, 48); assert.equal(history.length, 6);
for (const shot of [...current, ...history]) {
  const png = await readFile(new URL(shot.relative_image_path, dir));
  assert.equal(png.readUInt32BE(16), shot.viewport.width);
  assert.equal(png.readUInt32BE(20), shot.viewport.height);
  assert.equal(shot.device_scale_factor, 1); assert.equal(shot.ui_scale, "100%");
  assert.equal(shot.status, "已截"); assert.equal(shot.data.paused, false);
}
for (const [phase, batch] of [["before", before], ["after", after]]) {
  for (const r of batch.records.filter((r) => r.id === "native-plant-grow-harvest")) {
    assert.equal(r.initial.inv.seed, 2); assert.equal(r.seeded.inv.seed, 1); assert.equal(r.depleted.inv.seed, 0);
    assert.equal(r.growing.target.kind, phase === "before" ? "farm" : "crop");
    assert.equal(r.growing.prompt, "麦苗还在长，成熟后再收。");
    assert.equal(r.ripe.target.kind, "crop"); assert.equal(r.harvested.target.kind, "bench");
    assert.deepEqual(r.refused.inv, r.depleted.inv);
    assert.equal(r.harvested.inv.wheat, 3); assert.deepEqual(r.harvested.fenceHp, r.initial.fenceHp);
    assert.ok(r.ripe.time - r.seeded.time >= 14);
  }
}
await writeFile(new URL("screenshots.json", dir), JSON.stringify({
  screenshots: [...current, ...history], current_count: 48, historical_count: 6, visual_review: "待用户/协调逐图审查",
}, null, 2) + "\n");
await writeFile(new URL("validation.json", dir), JSON.stringify({
  before: before.records, after: after.records,
  prerequisite: "隔离固定白天材料/此前已收初始麦/四墙/局部三空田，保留教程；库存木4石5金3麦2，正常骑士种子2",
  no_user_save_access: true, natural_growth_flow_no_clock_or_stage_injection: true, no_qa_pause: true,
  input: "Chromium触屏原生CDP方向/采收与tap交互；桌面Space/E；WebKit持续移动/采收键盘回退，交互tap",
  historical_attempts: ["before.log: 首次即时拍到了动作后、UI更新前的帧，保留2图",
    "before-final.log: 第二次反复朝北使玩家进入作物格，面前变为草地，保留4图",
    "before-complete.log: 两帧同步及真实向下/向北调位后完成全部断言；未写玩家状态或改产品迁就测试"],
  limitations: "固定前置，不是自然全采集/三夜通关；未实体手机或系统手势验收；视觉待审",
}, null, 2) + "\n");
const rows = current.map((s) => `| ${s.phase} | ${s.screen_id} | ${s.viewport.width}×${s.viewport.height} | [原图](${s.relative_image_path}) |`).join("\n");
const historical = history.map((s) => `- ${s.screen_id}：[历史图](${s.relative_image_path})`).join("\n");
const text = `# UI-035 无种子时的麦苗目标

48张当前原图：有种子、耗尽种子、空田拒绝、等待麦苗、成熟可收、采收后配方齐全 × 320/390/844/1280 × 前后。另6张部分执行器历史原样保留，视觉待用户/协调审查。

[逐图源码/真实画布/输入](screenshots.json) · [前后各20例](validation.json) · [检查](checks.log) · [独立代码审查](review.log)

## 实证与最小修复

白天已围营、木4石5金3麦2、未持心，真实播种耗尽骑士初始2粒种子：未熟麦苗与空田同时存在，原金框仍指空田；走到空田点交互只会收到现有“没有种子”拒绝。走回麦苗时原局部提示已清楚说“麦苗还在长，成熟后再收。”，无需扩教程或新文案。

只改缺麦地图目标：成熟麦仍先；有种子仍指空田；无种子时转向现有未熟麦苗，让走近后的现有等待提示与目标一致。生长/收麦/播种/合成/存档/胜负未改。墙、其他缺料、夜间守火、已有心祭坛优先保持。没有麦苗又没种子时沿原末尾工作台兜底，本轮不新增找种子玩法。

## 固定前置与真实操作

隔离新上下文；既有测试选角入口使用click，不冒称触屏选角取证。保留教程。前置模拟初始麦已收：将初始作物换空田、附近草地和(30..32,24)三空田，四面80HP墙、采集标记/三夜计数、dayLen62/cycle0；库存木4石5金3麦2心0固定，骑士初始种子2未注入，玩家(488,408)面北。不是完整自然采集或三夜通关，产品地图不改。

前置后只用真实输入：点交互播两次→种2到0；实际走到空田、点交互拒绝且库存不变；真实调位回麦苗，正常7/8秒阶段到成熟；按住采集收麦。原掉麦1、回种1保持，包括原长按可能立即重新播种再花这粒种子的行为。缺麦1变为配方齐全，原目标转工作台。未调用动作API/注作物阶段/快进时钟/暂停截图。

320/390/844 Chromium原生CDP方向及采收长按、原生交互tap；1280键鼠。WebKit完整闸门持续移动/采收是明确键盘回退，交互tap。原图DPR1/UI100%/中文/Web，逐图记录CSS画布、状态、时间、输入和原样委托的20×20金框绘制，不用逻辑状态代替真实画布。

## 拍摄版本

- before：${before.screenshots[0].build.sha}，产品dirty=false，Git三文件SHA256 ${before.screenshots[0].build.source_sha256}。
- after：拍摄HEAD ${after.screenshots[0].build.sha}，产品dirty=true，工作树三文件SHA256 ${after.screenshots[0].build.source_sha256}。
- 不倒填后续提交SHA；Git LF与Windows工作树CRLF的字节哈希差异保留。

## 当前48张

| 阶段 | 状态 | 视口 | 原图 |
|---|---|---|---|
${rows}

## 6张历史部分图

第一执行器未等动作后的UI更新，第二执行器反复向北转身使玩家走入麦田、面前变草地。根据真实位置/面朝和图定位，增加两帧同步和真实上下调位；未改产品、第一夜断言、成本或超时。原错误日志/状态/图均留存，不作成功路径。

${historical}

## 检查与未覆盖

前后各20例：四视口真实种植/自然成熟/可收/缺麦到配方齐，以及夜间、已有心、缺金、缺墙控制。原首夜断言不放宽。完整闸门及CI结果见checks与原日志，独立审查不代表视觉批准。

两个完整闸门在旧首夜拆墙等待失败后，只读844日志确证面板关闭toggle晚于Space，既有resetInput清掉新按压。仅旧首夜夹具等待原生点击后的toggle完成（复用既有祭坛夹具模式）；原产品/断言/输入/超时均不改。定向原夜1/2/3/4四视口通过、独立补审无问题，修后plain完整闸门另存e2e-complete.log。原失败与时序证据保留，不拿调大超时或跳过断言换成功。

未实体Android/iOS、系统手势/安全区验收；不称自然三夜。仅补受影响状态，其余既有覆盖复用。保护PR25–31与旧诊断；仅清理本次D盘临时根，不合并、不发布。
`;
await writeFile(new URL("INDEX.md", dir), text);
console.log(`SEEDLESS_CROP_EVIDENCE_OK ${current.length} current + ${history.length} historical PNGs; ${fileURLToPath(dir)}`);
