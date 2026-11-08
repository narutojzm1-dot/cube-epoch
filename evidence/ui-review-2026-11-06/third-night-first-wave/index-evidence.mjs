import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL(".", import.meta.url));
const names = ["before-90abe806.json", "after-a33e4452.json"];
const manifests = await Promise.all(names.map(async (name) => JSON.parse(await readFile(join(root, name), "utf8"))));
const labels = { "first-wave": "正常跨夜后的首波消息", "native-touch": "真实下移/施放后首波消息仍在",
  "late-readable": "首波消息显示至少1.65秒后仍完整", expired: "原2.4秒预算自然隐藏，不延长" };
const screenshots = manifests.flatMap((m) => m.screenshots.map((r) => ({ ...r, state: labels[r.screen_id],
  actual_game_viewport: r.data.canvas, native_image_pixels: { width: r.viewport.width, height: r.viewport.height },
  input: r.viewport.width === 1280 ? "native desktop keyboard/mouse" : "native Chromium touch hold/release and tap",
})));
assert.equal(screenshots.length, 32);
const paths = screenshots.map((r) => r.relative_image_path);
assert.equal(new Set(paths).size, 32);
for (const row of screenshots) {
  const png = await readFile(join(root, ...row.relative_image_path.split("/")));
  assert.equal(png.readUInt32BE(16), row.viewport.width); assert.equal(png.readUInt32BE(20), row.viewport.height);
  assert.equal(row.data.paused, false); assert.equal(row.afterImage.paused, false);
}
assert.deepEqual((await readdir(join(root, "images"))).sort(), paths.map((p) => p.split("/").at(-1)).sort());
const records = manifests.flatMap((m, i) => m.records.map((r) => ({ phase: i ? "after" : "before", ...r })));
const timing = records.filter((r) => r.night === 3 && r.expectedWave === 1).map((r) => {
  const events = r.expired.timeline, dusk = events.find((e) => !e.day && e.nights === 3 && e.wave === 0);
  const wave = events.find((e) => e.wave === 1 && e.visible);
  assert.equal(r.expired.pausedFrames, 0); assert.ok(events.every((e) => !e.paused));
  assert.equal(wave.toSpawn, 7); assert.equal(r.started.nightLen, 32);
  assert.equal(r.touched.wall, 12); assert.deepEqual(r.touched.inv, r.started.inv); assert.equal(r.touched.held, 0);
  assert.ok(r.frameDuration >= 2.3 && r.frameDuration <= 2.5); assert.ok(r.realDuration >= 2.2);
  return { phase: r.phase, viewport: r.viewport, dusk, first_wave: wave,
    dusk_to_wave_game_seconds: wave.time - dusk.time, dusk_to_wave_wall_ms: wave.real_ms - dusk.real_ms,
    first_wave_frame_budget_seconds: r.frameDuration, first_wave_wall_seconds: r.realDuration,
    warning_in_first_wave: /朝墙会拆墙/.test(wave.text), late_readable: r.late,
    native_inputs: r.inputs.filter((i) => i.start), pause_frames: r.expired.pausedFrames };
});
assert.ok(timing.filter((r) => r.phase === "after" && r.viewport.width !== 1280).every((r) => r.warning_in_first_wave));
assert.ok(timing.filter((r) => r.phase === "before" || r.viewport.width === 1280).every((r) => !r.warning_in_first_wave));
await writeFile(join(root, "screenshots.json"), JSON.stringify({ issue_ids: ["UI-032"], screenshots,
  limitations: ["明确已达第三夜前置夹具，从入夜前正常运行；不称整局自然三夜或实体手机",
    "全程不暂停、不冻结帧，前置准备后无游戏状态写入；观察时间戳/截图都不阻塞模拟",
    "原入夜toast仍下一帧替换；短句在第三夜首波现有通知中获得原2.4秒预算",
    "截图和检查不代表用户/协调视觉批准"] }, null, 2) + "\n");
await writeFile(join(root, "validation.json"), JSON.stringify({ records }, null, 2) + "\n");
await writeFile(join(root, "timing.json"), JSON.stringify({ timing }, null, 2) + "\n");
const table = ["| 阶段 | 视口 | 入夜→首波游戏秒 | 首波实际可见秒 | 首波含墙警告 |",
  "|---|---|---|---|---|", ...timing.map((r) => `| ${r.phase} | ${r.viewport.width}×${r.viewport.height} | ${r.dusk_to_wave_game_seconds.toFixed(4)} | ${r.first_wave_wall_seconds.toFixed(4)} | ${r.warning_in_first_wave} |`)].join("\n");
const builds = [...new Map(screenshots.map((r) => [r.build.source_sha256, r.build])).values()];
await writeFile(join(root, "INDEX.md"), [
  "# UI-032 第三夜首波的真实可读窗口",
  "",
  "只把既有「面朝怪打；朝墙会拆墙」纳入第三夜及以后首波触屏beginWave通知，保留第几夜/第几波/总波数与原2.4秒参数。桌面、第一二夜、后续波文案原样；入夜下一帧首波、出生节奏0.42、昼夜长度、墙/攻击/资源/地图/存档均不改。不加新教程或阻塞游戏。",
  "",
  "[逐图版本/真实画布/输入](screenshots.json) · [时序、持续时间与触摸时间戳](timing.json) · [全部正反案例](validation.json) · [检查](checks.log) · [独立审查](review.log)",
  "",
  "## 明确前置，准备后正常运行且从不暂停",
  "",
  "隔离法师新局原生选角/开始，标注已完成两夜的固定前置：time250.8、dayLen62、cycle60.8（入夜前1.2秒）、nights2、木4/墙(22,22)80HP、玩家(378,358)左向，前方侧移格清空。游戏状态只在这一前置准备写一次，之后没有pause、钟/波计时写入、帧冻结或动作API调用；不是完整自然三夜跑。",
  "",
  "从白天正常进入第三夜，DOM变更与独立RAF只读记录入夜文字、下一帧首波、自然隐藏，带performance.now/游戏秒/原帧预算；pausedFrames=0。首波toSpawn7、nightLen32、原生成节奏保留。首次消息、真实下移/按住攻击施放后、至少1.65秒后、自然隐藏四状态均直接截图，游戏持续运转。截图前后读到同一条可见文字才保留，未暂停假装可读。",
  "",
  "320/390/844为原生Chromium CDP触屏按住/释放、tap；1280键鼠且原桌面整句不变。原墙和建造库存保持，触点≥44px，无残留held。桌面使用和WebKit回退共用键盘路径，原始inputs通用标签不改变platform字段所记录的实际Chromium引擎；WebKit闸门按住为键盘回退，明确不称原生持续触控。",
  "",
  "## 实测窗口（秒）",
  "",
  table,
  "",
  "原入夜短句只到下一帧首波；现在首波触屏消息保留警告，实际约2.385秒、原2.4秒截帧预算，至少1.65秒后及真实施放后仍完整可见。持续时间不靠截图暂停或加长timeout。第一夜5秒宽限、第二夜/第四夜首波、第三夜第二波负覆盖见validation；这些非主状态不新增图片。",
  "",
  "## 拍摄源码（不倒填未来提交号）",
  ...builds.map((b) => `- SHA ${b.sha}；产品dirty=${b.dirty}；三文件SHA256 ${b.source_sha256}；${b.source}。`),
  "",
  "全部Web/Chromium、中文、DPR1、UI100%，原PNG不缩放，真实游戏CSS矩形逐图记录。修前Git5d三文件内存响应；修后当前工作树字节。旧PR28暂停入夜取证完全保留，不混入本片无暂停矩阵。",
  "",
  "## 当前32张原图：四状态×四视口×前后",
  "",
  "| 阶段 | 状态 | 视口 | 原图 |", "|---|---|---|---|",
  ...screenshots.map((r) => `| ${r.phase} | ${r.state} | ${r.viewport.width}×${r.viewport.height} | [原图](${r.relative_image_path}) |`),
  "",
  "## 检查与限制",
  "",
  "初次新执行器错误地要求既有开场跳过按钮可见高度≥44，未进前置也未写图；before.log保留。只改执行器按实际按钮高度定位（核心控制仍≥44），不改变旧开场布局。before-final.log/after.log各8案例通过。不是无辅助玩家盲玩、真机或完整自然通关；视觉仍待用户/协调。",
  "",
  "D:\\.tmp\\agents\\cube-epoch\\独占GUID环境/profile/cache，既有C浏览器安装只读；本次浏览器退出后精确清理，证据直接放D项目。PR25–28/诊断/旧证据不改，现有覆盖清单只读复用；不合并、不发Pages或腾讯云。",
  "",
].join("\n"));
console.log("FIRST_WAVE_EVIDENCE_OK PNG32 unpaused primary8 timestamps/window/native controls");
