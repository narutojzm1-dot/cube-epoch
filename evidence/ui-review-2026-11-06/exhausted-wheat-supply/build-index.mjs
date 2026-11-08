import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const out = dirname(fileURLToPath(import.meta.url)), root = dirname(out);
const read = async (name) => JSON.parse(await readFile(join(out, name), "utf8"));
const [beforeName, afterName] = process.argv.slice(2);
assert.ok(beforeName && afterName, "Provide the two corrected capture manifests explicitly");
const before = await read(beforeName), after = await read(afterName);
assert.equal(before.screenshots.length, 27);
assert.equal(after.screenshots.length, 27);
const historyBefore = await read("before-7cf1cec6.json"), historyAfter = await read("after-72476922.json");
const screenshots = [...before.screenshots, ...after.screenshots];
const historical = [...historyBefore.screenshots, ...historyAfter.screenshots].map((s) => ({
  ...s, historical: true,
  metadata_note: "Initial captures immediately after fresh-game fixture restoration; startup tree toast had not expired. This transient fixture message is not a natural third-dawn defect. Retained, not current review evidence.",
}));
for (const s of [...screenshots, ...historical]) {
  const bytes = await readFile(join(out, s.relative_image_path.split("/").join(sep)));
  assert.equal(bytes.subarray(1, 4).toString(), "PNG");
  const pixels = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  assert.deepEqual(pixels, s.viewport);
  s.native_image_pixels = pixels;
  s.image_sha256 = createHash("sha256").update(bytes).digest("hex");
}
assert.equal(new Set(screenshots.map((s) => `${s.phase}:${s.screen_id}:${s.viewport.width}`)).size, 54);
assert.ok(screenshots.filter((s) => s.phase === "before").every((s) => !s.build.dirty));
assert.ok(screenshots.filter((s) => s.phase === "after").every((s) => s.build.dirty));
assert.ok(screenshots.every((s) => s.build.sha === "a09aaa5de95fc7af473abb156fbb8a4aa9eaf600"));
assert.ok(screenshots.filter((s) => s.phase === "after").every((s) =>
  s.build.source_sha256 === "3d28b5ffe3f4f34e24ca5b51a19a54ad6d6ac02b4d6253dfe9e97452b270691b"));
const proof = await read("reachable-state.json");
const actions = Object.fromEntries(["native canvas mouse hold harvest", "native E plant", "native H consume harvested wheat"]
  .map((key) => [key, proof.records.filter((r) => r.action === key).length]));
assert.equal(actions["native canvas mouse hold harvest"], 9);
assert.equal(actions["native E plant"], 6);
assert.equal(actions["native H consume harvested wheat"], 2);
assert.equal(proof.final.inv.seed, 0);
assert.equal(proof.final.crops.length, 0);
assert.equal(proof.final.inv.wheat, 1);
const loot = [];
for (const name of (await readdir(out)).filter((n) => /^night-supply-.+\.json$/.test(n)).sort()) {
  const data = await read(name), samples = data.records.filter((r) => r.id.startsWith("unmodified-rng-"));
  loot.push({ file: name, engine: data.engine || "not in original file; Chromium caller recorded in after.log",
    controlled_cases: data.records.length - samples.length, unmodified_samples: samples.length,
    wheat_events: samples.filter((r) => r.after.inv.wheat > r.start.inv.wheat || r.after.drops.includes("wheat")).length,
    seed_events: samples.filter((r) => r.after.inv.seed > r.start.inv.seed || r.after.drops.includes("seed")).length,
    not_guaranteed: true });
}
assert.ok(loot.some((l) => l.unmodified_samples === 16 && l.wheat_events > 0 && l.seed_events > 0));
const fullLog = await readFile(join(out, "e2e-checked.log"), "utf8");
assert.match(fullLog, /^E2E_OK/m);
assert.match(fullLog, /^EXHAUSTED_WHEAT_SUPPLY_OK webkit after 12 cases/m);
assert.match(fullLog, /^NIGHT_SUPPLY_DROPS_OK 18/m);
await writeFile(join(out, "screenshots.json"), JSON.stringify({
  screenshots, historical_screenshots: historical, visual_review: "待用户/协调逐图审查",
  notes: ["54 current original PNGs, 54 retained fixture-startup historical PNGs; no resized phone substitutes.",
    "Capture-only fixture synchronization waits for startup toast to expire naturally; no product toast changes or QA pause.",
    "Desktop raw held-input labels originally included the generic WebKit-fallback suffix; the captured caller is Chromium fine-pointer/native keyboard, not a WebKit touch run. Raw labels retained; future label now distinguishes desktop correctly.",
    "All raw build SHAs describe actual capture HEAD/dirty, not a future commit SHA."],
}, null, 2) + "\n");
await writeFile(join(out, "validation.json"), JSON.stringify({
  before: before.records, after: after.records, historical_manifests: ["before-7cf1cec6.json", "after-72476922.json"],
  reachable_proof: { file: "reachable-state.json", actions, initial: proof.initial, final: proof.final,
    source: proof.source, limitations: proof.limitations,
    console_count_correction: "reach-safe.log harvests=11 counted two H actions containing 'harvested'; exact raw inputs are 9 mouse harvest holds + 6 E plant + 2 H. Only the future console filter was corrected; successful random sample was not rerun." },
  night_loot: loot,
  checks: { static: "static.log", targeted_webkit: "webkit-controls.log", full_webkit: "e2e-checked.log",
    reviewer: "review.log", linux_ci: "pending same-SHA pull_request checks after topic push" },
  failure_history: [
    "reach.log: original mouse aim affected E-facing; cursor subsequently moved outside canvas before native E.",
    "reach-complete.log / reach-progress-21186443.json: earlier natural growth wait failed, no final state captured; cause not asserted.",
    "e2e.log: old seedless Space harvest wait failed; cause not established from that log.",
    "e2e-final.log: old seedless empty-field interaction demonstrably crossed tile32 to x528.8503/tile33 after key release; corrected only fixture settle/within-cell native alignment, same original budgets and crop/cost assertions.",
    "e2e-complete.log: new growth control's chosen20s wall budget failed, no final state captured. New wait now follows existing crop-feedback default30s and asserts >=14 engine seconds of original growth; no claim of a proven renderer cause.",
    "First54 PNGs retain fixture-restoration startup toast and are classified historical; corrected captures await natural toast expiry.",
  ],
  unchanged: "Original first-night test file, original first-night assertions, gameplay growth, loot probabilities, costs, resources, map, day/night and victory/save rules unchanged.",
  limitations: "Fixed depletion-position/material/injury/field prerequisites plus fixed three-dawn replay; not continuous natural walking, full natural three-night victory, physical iOS/Android, or user-approved visual review.",
}, null, 2) + "\n");
const table = screenshots.map((s) => `| ${s.screen_id} | ${s.phase} | ${s.viewport.width}x${s.viewport.height} | [原图](${s.relative_image_path}) | 已截，待审 |`).join("\n");
const lootTable = loot.map((l) => `| [${l.file}](${l.file}) | ${l.engine} | ${l.unmodified_samples} | ${l.wheat_events} | ${l.seed_events} |`).join("\n");
await writeFile(join(out, "INDEX.md"), `# UI-036 缺麦、无种、无苗时的补给路径

**54张当前原尺寸前后图**：320x568、390x844真实触屏模拟，1280x800键鼠；另保留54张夹具启动瞬态历史图，不作为自然第三黎明问题证据。Web / 中文 / DPR1 / UI100%，各图真实CSS画布矩形、时间、触点与源码见 [screenshots.json](screenshots.json)，实际路线及库存见 [validation.json](validation.json)。视觉待用户/父协调逐图确认，不以测试通过代替。

基线 \`a09aaa5de95fc7af473abb156fbb8a4aa9eaf600\`；before为该提交Git字节、dirty=false，after为同HEAD、dirty=true且产品三文件SHA256 \`3d28b5ffe3f4f34e24ca5b51a19a54ad6d6ac02b4d6253dfe9e97452b270691b\`。后续提交SHA不倒填到原图。

## 问题与最小修复

木4石5金3、麦1、种0、无作物/可拾麦种、营地四墙且白天：原地图指工作台，展开教程让合成，但真实走近交互只会拒绝缺麦。仅在此耗尽补给状态统一当前目标/教程/桌面提示为「缺麦没种：夜守篝火打怪，可能掉麦或种子。」，金框改指篝火。不改任何采收、掉落、配方、建造、时长、胜负或存档。

成熟麦、未熟苗、有种能播、原配方就绪工作台和已有心祭坛控制保留；夜间/缺其他材料/缺墙/可拾补给不进入新谓词。原首夜文件与断言未改。教程阶段进度仍沿原流程，不扩新教程。

## 可达性不是造出“无种无苗”

[reachable-state.json](reachable-state.json) 保留原三株成熟麦并实际采完，骑士默认2种没有注入/清零。**9次原生鼠标长按采收、6次E播种、2次H吃收获麦**；遗落补给按原吸引/18秒寿命自然处理。成功终态time90.7605、首夜、麦1种0作物0、HP165/营火100。位置边界、局部地形/四墙/其他材料/受伤为明示初始夹具；后续不改RNG、种/麦/苗阶段、掉落life或时钟。

该证明不是连续自然走位或自然三夜通关。UI链复用真实耗尽库存/空作物快照，仅固定第三白天/出生点与教程；真实展开/关闭、方向按住走近原工作台、交互拒绝缺麦、走回篝火，库存不变。首次54图中的新局采树toast是恢复夹具的启动瞬态；仅取证模式等其正常过期后补54图，不修改产品toast。

\`reach-safe.log\` 原console的harvests=11把2次H动作的“harvested”也计入；原始JSON实际为9次鼠标采收。只纠正未来console计数，不重跑随机成功样本或抹掉旧记录。

## 夜间补给是机会，不是保证

原击杀代码独立麦45%、种20%保持。明确已结束首夜波/20HP受伤史莱姆/零速零伤害位置夹具，真实Space击杀：随机极值两例仅验证原麦/种存在和可无掉落分支；其他样本不改RNG。表中仅计未改RNG样本，不用极值当自然概率证据：

| 原始记录 | 引擎 | 未改RNG击杀 | 掉麦事件 | 掉种事件 |
|---|---|---|---|---|
${lootTable}

WebKit后续16样本实际见麦与种；初次Chromium8样本只见麦2/种0的旧记录仍保留。样本不是掉落保证，也不是自然三夜通关。

## 检查与边界

静态 [static.log](static.log)，新WebKit控制 [webkit-controls.log](webkit-controls.log)，原完整plain WebKit [e2e-checked.log](e2e-checked.log)，独立审查 [review.log](review.log)；失败/夹具修复明细在validation，原日志不覆盖。旧seedless格内惯性修复只改原生输入夹具，保留5秒预算和原采收/库存断言；本片新成熟等待复用现有默认30秒并增加模拟时间至少14秒断言，不加速生长，不放宽原首夜。

不重拍未变全界面/横屏，复用旧矩阵并只读检查覆盖；本片新320/390/桌面图不冒作横屏证据。未覆盖实体设备、系统安全区、完整自然通关；无中英文切换。#25–32保持开放/原head，旧诊断保留；不合并或部署Pages/腾讯云。各自D盘root关闭浏览器后精确清理，详见cleanup日志。

## 当前逐图清单

| screen_id / state | 阶段 | 视口 | 原图 | status |
|---|---|---|---|---|
${table}

54张历史图在screenshots.json的historical_screenshots逐项列出，原图与启动瞬态说明保留，非当前视觉验收。每张当前图完整language/build/source/repro_steps/issue_ids与原生像素/画布/输入均在同目录JSON。
`);
const indexPath = join(root, "screenshots.json"), originalText = await readFile(indexPath, "utf8");
const current = JSON.parse(originalText);
const original = JSON.parse(execFileSync("git", ["show", "a09aaa5:evidence/ui-review-2026-11-06/screenshots.json"]).toString());
assert.deepEqual(current, original, "Protect prior UI matrix before this one appended batch");
current.supplemental_batches.unshift({ id: "exhausted-wheat-supply",
  base_sha: "a09aaa5de95fc7af473abb156fbb8a4aa9eaf600", index: "exhausted-wheat-supply/INDEX.md",
  screenshots: "exhausted-wheat-supply/screenshots.json", issue_ids: ["UI-036"], status: "已截",
  visual_review: "54张当前320/390/桌面前后及54张启动夹具历史原图待审；9真实采收/6播种/2吃麦与种自然过期形成耗尽，固定第三白天复用，原夜怪可掉麦/种但不保证；非自然三夜通关或实体设备" });
current.issues.unshift({ id: "UI-036", title: "缺麦无种无苗，原地图与教程仍让去工作台合成",
  status: "仅该耗尽补给状态提示夜守篝火打怪可能掉麦/种；54张当前及54张夹具瞬态历史原图待审",
  before: "exhausted-wheat-supply before", after: "exhausted-wheat-supply after" });
let nextText = originalText;
const eol = originalText.includes("\r\n") ? "\r\n" : "\n";
for (const key of ["supplemental_batches", "issues"]) {
  const anchor = `  "${key}": [${eol}`;
  assert.ok(nextText.includes(anchor));
  nextText = nextText.replace(anchor, anchor + "    " + JSON.stringify(current[key][0], null, 2).split("\n").join(eol + "    ") + "," + eol);
}
assert.deepEqual(JSON.parse(nextText), current);
await writeFile(indexPath, nextText);
current.supplemental_batches.shift(); current.issues.shift();
assert.deepEqual(current, original, "Only UI-036 appended; every old record and matrix field preserved");
const prs = await read("protected-prs.json");
await writeFile(join(out, "protected-prs.json"), JSON.stringify(prs.filter((p) => p.number >= 25 && p.number <= 32)
  .map((p) => ({ number: p.number, state: p.state, head: { sha: p.head.sha, ref: p.head.ref },
    base: { ref: p.base.ref }, merged_at: p.merged_at })), null, 2) + "\n");
console.log("EXHAUSTED_EVIDENCE_INDEX_OK current54 historical54 rawPixels108 preservedPriorMatrix exactHarvest9 plant6 eat2");
