import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL(".", import.meta.url));
const currentFiles = ["before-normal.json", "after-normal-79078fbf.json",
  "before-fixture-54938081.json", "after-fixture-54938081.json"];
const read = async (name) => JSON.parse(await readFile(join(root, name), "utf8"));
const current = await Promise.all(currentFiles.map(read));
const partial = await read("before-fixture.json");
const describe = {
  "first-fence": "普通采木后第一面栅栏落地，原成本2木、缺口4→3",
  "first-night": "自然首夜或明示边界：守火目标、波次、当前攻击提示",
  "night-guide": "原生展开背包：现有守夜步骤、朝墙拆墙与侧移提醒",
  "wall-facing-hold": "原生面对栅栏按住攻击，按原规则拆墙",
  "wall-side-attack": "原生恢复墙、移到墙侧再攻击，墙和建造库存保留",
  "first-wave": "普通新局自然首夜第一批真实敌人出现",
};
const enrich = (row) => ({ ...row, state: describe[row.screen_id], full_page: false,
  build: { ...row.build, source: row.build.source ??
    "Windows working-tree product bytes; description restored from before.log because legacy manifest omitted build.source" },
  native_image_pixels: { width: row.viewport.width, height: row.viewport.height },
  actual_game_viewport: row.data.canvas,
  input: [...new Set(row.inputs.map((i) => i.type))].join(" + "),
});
const screenshots = current.flatMap((m) => m.screenshots.map(enrich));
const history = partial.screenshots.map((row) => ({ ...enrich(row),
  history_reason: "初次夹具在844触屏选角入口失败；前3视口12张原图保留，不计完整当前矩阵；后续修测试可见片段中点与滑动稳定等待" }));
assert.equal(screenshots.length, 68);
assert.equal(history.length, 12);
const rows = [...screenshots, ...history], paths = rows.map((r) => r.relative_image_path);
assert.equal(new Set(paths).size, 80);
for (const row of rows) {
  const png = await readFile(join(root, ...row.relative_image_path.split("/")));
  assert.equal(png.readUInt32BE(16), row.viewport.width);
  assert.equal(png.readUInt32BE(20), row.viewport.height);
}
assert.deepEqual((await readdir(join(root, "images"))).sort(), paths.map((p) => p.split("/").at(-1)).sort());
const records = current.flatMap((m, i) => m.records.map((r) => ({
  manifest: currentFiles[i], ...r,
})));
for (const record of records) {
  assert.equal(record.firstNight.wall, 12);
  assert.equal(record.firstNight.gaps.length, 3);
  assert.equal(record.safe.wall, 12);
  assert.equal(record.safe.gaps.length, 3);
  assert.equal(record.ready.inv.wood, record.firstNight.inv.wood - 1,
    "demolition refunds 1 wood, native rebuilding costs 2");
  assert.deepEqual(record.safe.inv, record.ready.inv);
  assert.equal(record.safe.held, 0);
}
await writeFile(join(root, "screenshots.json"), JSON.stringify({
  issue_ids: ["UI-030"], screenshots, history,
  limitations: ["68张当前同态图、12张初次失败夹具中间图；非全界面重拍",
    "普通首日自然跑320/390/1280；844仅明示首夜边界夹具",
    "Web Chromium模拟原生触控；非实体手机。WebKit闸门按住使用真实键盘回退",
    "未跑完整首夜存活或三夜通关；未发布，视觉审查待协调"],
}, null, 2) + "\n");
await writeFile(join(root, "validation.json"), JSON.stringify({ records }, null, 2) + "\n");
const table = (entries) => [
  "| 来源/阶段 | 状态 | 视口 | 原图 |",
  "|---|---|---|---|",
  ...entries.map((r) => `| ${r.source.startsWith("ordinary") ? "普通新局" : "边界夹具"} / ${r.phase} | ${r.screen_id}：${r.state} | ${r.viewport.width}×${r.viewport.height} | [原图](${r.relative_image_path}) |`),
].join("\n");
const sources = [...new Map(rows.map((r) => [r.build.source_sha256, r.build])).values()];
await writeFile(join(root, "INDEX.md"), [
  "# UI-030 首夜触屏朝墙攻击的误导",
  "",
  "仅改既有触屏首夜toast和守夜步骤文字：面朝怪按住「采集/攻击」；朝墙会拆墙，先移到墙侧再打。桌面原文不变。守篝火与地图边缘来怪目标原已清楚，未改输入优先级、成本、波次、昼夜、胜负、存档、CSS或地图。",
  "",
  "[逐图来源/真实画布矩形/输入](screenshots.json) · [库存、缺口、时间与按压记录](validation.json) · [检查](checks.log)",
  "",
  "普通before/after各3个独立法师新局，320/390真实CDP触屏按住/释放、桌面键盘/鼠标；无位置、时间、库存、世界或存档注入。真实采树→直接扣2木放(22,22)第一墙→原76秒首次入夜→面对墙按攻击拆墙→原退款1木→恢复扣2木→侧移再发术，墙与建造库存不变；再等真实第一批敌人出现。只读CUBE观测。",
  "",
  "边界before/after各4视口夹具：玩家(378,358)左向、木4、墙(22,22)HP80、首日cycle=dayLen−0.01、已采集标记，下一真实帧入夜；不是自然备料或存活证明。复现参数见tests/first-night-guidance.mjs。全部中文、Web/Chromium、DPR1、UI100%，PNG为原视口不缩放，实际游戏CSS矩形逐图记录；展开背包后核心控件被面板覆盖为现有语义，可原生收回。",
  "",
  "## 拍摄源码（不倒填将来提交号）",
  ...sources.map((s) => `- SHA ${s.sha}；产品dirty=${s.dirty}；三文件字节SHA256 ${s.source_sha256}；${s.source}。`),
  "",
  "普通before读取Windows工作树字节；边界before用父提交Git三文件内存响应，LF/CRLF导致字节哈希不同，均明确标识。after产品字节相同。每张图记录捕获时间、原生输入坐标与游戏状态；证据生成脚本不刷图。",
  "",
  "## 当前68张：普通前后36＋边界前后32",
  "",
  table(screenshots),
  "",
  "## 历史12张：初次夹具入口失败，保留不计完整矩阵",
  "",
  table(history),
  "",
  "## 检查与限制",
  "",
  "初次普通命令Tee目标目录未建：无截图写入，精确清理见initial-log-path-cleanup.log。初次844夹具触屏选角不稳：fixtures.log及12张中间图保留；只修测试点击可见片段中点、滑动后8稳定帧，未自动滚入、延长超时或改产品。完整四视口重跑见fixtures-final.log；普通前后见before.log/after.log。",
  "",
  "复用canvas-black-area/environment.ps1及cleanup.ps1：独占D:\\.tmp\\agents\\cube-epoch\\本次GUID目录，TEMP/TMP/TMPDIR/profile/cache均D，既有C浏览器安装只读，无安装。日志输出到D项目并过滤工具回显，关闭本次浏览器后精确清理；旧诊断与PR #25/#26不动。",
  "",
  "只补受影响状态，未覆盖实体iOS/Android、普通844自然首日、完整首夜胜败或三夜。无英文切换。已截不等于布局审查通过，待用户/协调逐图确认；不合并、不发布。",
  "",
].join("\n"));
console.log("FIRST_NIGHT_EVIDENCE_OK current68 history12 inputs/stock/gaps/PNG80");
