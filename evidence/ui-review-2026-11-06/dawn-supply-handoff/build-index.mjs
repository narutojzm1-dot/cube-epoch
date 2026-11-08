import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const out = dirname(fileURLToPath(import.meta.url)), root = dirname(out);
const json = async (name) => JSON.parse(await readFile(join(out, name), "utf8"));
const before = await json("before-37c84035.json"), after = await json("after-cebba2e9.json");
const paired = await json("paired-guide.json");
assert.equal(before.records.length, 4); assert.equal(after.records.length, 4);
assert.equal(before.screenshots.length, 20); assert.equal(after.screenshots.length, 20);
assert.equal(paired.screenshots.length, 4);
for (const width of [320, 390]) {
  const rows = paired.screenshots.filter((s) => s.viewport.width === width);
  assert.deepEqual(rows[0].data.inv, rows[1].data.inv);
}
const screenshots = [...paired.screenshots, ...before.screenshots, ...after.screenshots];
for (const s of screenshots) {
  const p = await readFile(join(out, ...s.relative_image_path.split("/")));
  assert.equal(p.subarray(1, 4).toString(), "PNG");
  s.native_image_pixels = { width: p.readUInt32BE(16), height: p.readUInt32BE(20) };
  assert.deepEqual(s.native_image_pixels, s.viewport);
  s.image_sha256 = createHash("sha256").update(p).digest("hex");
}
const summarize = (batch) => batch.records.map((r) => ({
  variant: r.variant, viewport: r.viewport, night_inventory: r.picked.inv, dawn_inventory: r.dawn.inv,
  night_time: r.picked.time, dawn_time: r.dawn.time, night_cycle: r.picked.cycle, dawn_cycle: r.dawn.cycle,
  night_target: r.picked.target, dawn_target: r.dawn.target,
  ...(r.variant === "seed" ? { guide: r.guide.guide, selected_build: r.selected.build,
    growing: r.growing, ripe_time: r.ripe.time, harvested_inventory: r.harvested.inv }
    : { pre_craft_inventory: r.stock.inv, crafted_inventory: r.crafted.inv, final_target: r.crafted.target }),
}));
for (const batch of [before, after]) for (const r of batch.records) {
  assert.equal(r.picked.day, false); assert.equal(r.dawn.day, true); assert.equal(r.dawn.paused, false);
  assert.equal(r.dawn.nights, 3); assert.deepEqual(r.picked.inv, r.dawn.inv);
  assert.equal(r.picked.target.kind, "camp");
}
const full = await readFile(join(out, "e2e.log"), "utf8");
assert.match(full, /^E2E_OK/m);
assert.match(full, /^DAWN_SUPPLY_HANDOFF_OK webkit after 4 routes/m);
await writeFile(join(out, "screenshots.json"), JSON.stringify({ screenshots, visual_review: "待用户/协调逐图审查",
  notes: ["4 exact-inventory paired-guide originals;40 natural unmodified-RNG transition originals.",
    "Natural before/after loot totals may differ; do not edit inventory to fake matched natural drops. The4 paired originals replay the same recorded successful inventory explicitly.",
    "Source SHA/dirty are capture-time1ad39a6 and current product bytes, not a future packaged SHA.",
    "WebKit full regression replays possible seed/wheat drop fixtures with original pickup physics, not guaranteed random loot."] }, null, 2) + "\n");
await writeFile(join(out, "validation.json"), JSON.stringify({
  raw_records: ["before-37c84035.json", "after-cebba2e9.json", "paired-guide.json"],
  before: summarize(before), after: summarize(after),
  unmodified_random_attempts: { before: before.attempts.length, after: after.attempts.length,
    note: "One native kill per isolated attempt; all successful and unsuccessful samples retained. No RNG override or post-pickup stock clearing. Not a probability guarantee." },
  source: "Fixed third-night completed-wave/wounded-zero-damage enemy, original exhausted terrain/empty-crop snapshot and initial wheat1/2 stocks; not full natural three-night play.",
  paired_source: "Exact before successful pickup stocks/position, fixed night-end1.5s then normal dawn and native summary tap; not a second natural loot acquisition.",
  regression: "WebKit/CI deterministic observed seed/wheat drop fixture, native approach then original pickup/dawn/growth/cost; touch long-hold keyboard fallback explicitly logged.",
  checks: { static: "static.log", targeted: "webkit-final.log", full_webkit: "e2e.log", independent_review: "review.log" },
  failures: ["webkit-targeted.log: native return overshot x542/y397, E faced outside farm; native within-cell thresholds/direction-only north turn and assertion added.",
    "webkit-aligned.log: new long left hold exceeded5s wall while only3.76 engine seconds elapsed, x404; split into two native holds with unchanged per-hold5s budget.",
    "No original first-night file/budget/assertion, product speed/timing/map, resource/drop probability, recipe or victory/save changes."],
  uncovered: ["physical devices/safe areas", "full continuous natural three-night win", "new landscape/desktop image batch", "user-approved visual review"],
}, null, 2) + "\n");
const table = screenshots.map((s) => `| ${s.screen_id} | ${s.phase} | ${s.viewport.width}x${s.viewport.height} | [原图](${s.relative_image_path}) | 已截，待审 |`).join("\n");
await writeFile(join(out, "INDEX.md"), `# UI-037 夜间补给到清晨种植指南衔接

**44张Web原尺寸图**：320x568/390x844、中文、DPR1、UI100%。优先看下表前4张库存逐项完全相同的指南前后图；另40张是真实未改RNG击杀/拾种或麦、正常清晨、播种/原15秒成长/采收或工作台实际扣料的链路图。不是实体手机或完整自然三夜通关，视觉待用户/父协调逐图确认。

## 确证问题与唯一产品修复

第3清晨缺麦、有种且无苗，金框已正确指空田、顶部显示缺麦，展开教程却仍写去工作台合成；播种后/成熟后同样与金框下一动作冲突。仅在三夜后白天、其他材料齐/营墙齐/无心/缺麦时，现有指南正文和桌面此刻提示复用当前目标，分别提示金框空田播种、麦苗还在长/成熟再收、金框麦旁收麦。材料就绪工作台与已有心祭坛优先保持；目标逻辑、顶栏、配方、库存、墙、地图、输入、时间/波次、胜负/存档均未改。

基线\`1ad39a6a8d129ae182c98384434b4e020da7252d\`；before是该Git版本，after是该HEAD+dirty，产品字节SHA256\`${after.build.source_sha256}\`。未来提交不倒填原图。每图实际CSS画布/控件/触点/时间/源码与复现见[screenshots.json](screenshots.json)；库存与成本简表见[validation.json](validation.json)，原始输入全量在两个raw_records。

## 自然输入与前置分开

原耗尽快照地形/四墙/空苗、缺麦1或2是明示前置，第三夜末波结束、20HP零速零伤害史莱姆。前${before.attempts.length}、后${after.attempts.length}个隔离样本都用真实CDP触控杀一只、原随机掉落并实际拾取，未得到所需物资的样本同样留存，不改RNG/掉率或成功链库存。成功8条链从夜间正常跨32秒边界，未暂停/改时钟，真实展开/取消栅栏、播种/等成熟/收麦，或沿原路线到工作台扣木4石5金3麦3合成，心1金框祭坛。

自然前后随机麦/木/金可能不同，均缺麦+种1等相同条件，不能假称数值全相同；所以补4张相同库存指南配对图，库存/位置逐项取自真实before拾种记录，明确重放第三夜末1.5秒后正常跨晨/点开，并非再自然打怪。原自然40图不刷掉、不伪造库存。

WebKit稳定回归用已证存在的种/麦掉落前置，真实移动后原吸引拾取、正常清晨；不将固定掉落当自然概率证据，也不把触控视口的键盘长按fallback称原生手机长按。原长按收麦后的自动重播保持，记录实际结果。

## 检查/失败/保留

[静态](static.log)、[新WebKit](webkit-final.log)、[完整原WebKit](e2e.log)、[独立审查](review.log)。两次新夹具失败有实际坐标/时间：格外误朝向、长路超过新输入wall预算；只改格内原生调位和分段原生移动，不改原首夜断言/预算或产品规则，失败日志保留。旧#25–33、旧dirty诊断不混入提交。当前旧全界面矩阵只读复用，未新增横屏/桌面原图/实体安全区；不合并、Pages/CD或腾讯云均不操作。本片独占D根逐次关闭进程/清理，见cleanup日志。

## 逐图清单

| screen_id/state | 阶段 | 视口 | 原图 | status |
|---|---|---|---|---|
${table}
`);
const p = join(root, "screenshots.json"), text = await readFile(p, "utf8");
const current = JSON.parse(text), original = JSON.parse(execFileSync("git", ["show", "1ad39a6:evidence/ui-review-2026-11-06/screenshots.json"]).toString());
assert.deepEqual(current, original);
const batch = { id: "dawn-supply-handoff", base_sha: "1ad39a6a8d129ae182c98384434b4e020da7252d",
  index: "dawn-supply-handoff/INDEX.md", screenshots: "dawn-supply-handoff/screenshots.json", issue_ids: ["UI-037"],
  status: "已截", visual_review: "44张320/390原图待审：40自然随机补给/跨晨/播收合成，4完全相同已拾种库存的指南复放配对；明示第三夜夹具，非自然三夜通关/实体设备" };
const issue = { id: "UI-037", title: "夜间拾种后清晨目标空田，教程仍去工作台；播种/成熟同样不对齐",
  status: "仅三夜后缺麦而其他准备齐时复用当前播种/等待/收麦动作，44图待审", before: "dawn-supply-handoff before", after: "dawn-supply-handoff after" };
const eol = text.includes("\r\n") ? "\r\n" : "\n";
let next = text;
for (const [key, value] of [["supplemental_batches", batch], ["issues", issue]]) {
  const anchor = `  "${key}": [${eol}`;
  assert.ok(next.includes(anchor));
  next = next.replace(anchor, anchor + "    " + JSON.stringify(value, null, 2).split("\n").join(eol + "    ") + "," + eol);
}
await writeFile(p, next);
const check = JSON.parse(next); check.supplemental_batches.shift(); check.issues.shift(); assert.deepEqual(check, original);
console.log("DAWN_EVIDENCE_OK 44 native PNGs exact4 matched inventory, natural40, old matrix unchanged");
