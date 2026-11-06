import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, serve, launch, enterPlay } from "./helpers.mjs";

const OUT = join(ROOT, "evidence", "ui-review-2026-11-06");
const touchOnly = process.argv.includes("--touch-only");
const viewports = [
  { key: "desktop-1280x800", width: 1280, height: 800, touch: false },
  { key: "phone-390x844", width: 390, height: 844, touch: true },
  { key: "phone-320x568", width: 320, height: 568, touch: true },
  { key: "landscape-844x390", width: 844, height: 390, touch: true },
];
const states = [
  ["day-before", "触屏修复前的首局 HUD", "baseline"],
  ["title-empty", "首次选角，开始按钮禁用", "normal"],
  ["title-selected", "骑士选中，开始按钮启用", "normal"],
  ...Array.from({ length: 6 }, (_, i) => [`intro-${i + 1}`, `开场故事第 ${i + 1} 页完整长文字`, "normal"]),
  ...["camp", "bench", "altar", "build", "depart"].map((id, i) =>
    [`brief-${id}`, `营地预演第 ${i + 1} 步完整文字`, "normal"]),
  ["day-first", "正常首局 HUD、背包和触屏入口", "normal"],
  ["day-returning", "已完成引导的玩家重新开始，跳过开场", "normal"],
  ...["miner", "farmer", "mage"].map((cls) => [`day-${cls}`, `${cls} 职业 HUD / 技能 / 法力差异`, "fixture"]),
  ["build-selected", "栅栏选中、缺口与取消建造提示", "fixture"],
  ["build-no-resource", "材料不足的建造提示", "fixture"],
  ["build-repair", "坏墙修复后的反馈", "fixture"],
  ["plant-empty", "空田与播种提示", "fixture"],
  ["plant-growing", "播种后的幼苗状态", "fixture"],
  ["plant-ripe", "成熟作物与收麦提示", "fixture"],
  ["inventory-large", "大数字背包与长目标文本", "fixture"],
  ["craft-missing", "合成缺少全部材料的长提示", "fixture"],
  ["craft-heart", "合成成功，背包方块之心就绪", "fixture"],
  ["night-wave", "夜间波次、营火、围墙与敌人", "fixture"],
  ["night-hurt", "玩家与营火低血量、受伤反馈", "fixture"],
  ["skill-cooldown", "技能冷却、法力不足、采集攻击提示", "fixture"],
  ["pause-help", "暂停 / 操作说明 / 继续 / 回选角", "normal"],
  ["pause-actions", "暂停长说明滚动到底部，可见继续 / 回选角按钮", "normal"],
  ["audio-music-off", "音乐关闭，音效保留", "normal"],
  ["audio-all-off", "声音全部关闭", "normal"],
  ["return-title", "暂停菜单返回选角", "normal"],
  ["failure-camp", "篝火熄灭失败结算", "fixture"],
  ["failure-player", "玩家死亡失败结算", "fixture"],
  ["retry-title", "临时注入失败后，通过真实按钮回到选角", "fixture"],
  ["altar-night", "第三夜夜间禁止献祭", "fixture"],
  ["altar-early", "只过两夜禁止献祭", "fixture"],
  ["altar-ready", "第三夜后天亮祭坛交付提示", "fixture"],
  ["victory", "祭坛交付成功结算与再玩一局", "fixture"],
];
const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const baselineSha = "7c22ec5";
const hash = (buffers) => createHash("sha256").update(Buffer.concat(buffers)).digest("hex");
const productFiles = ["index.html", "style.css", "game.js"];
const sourceBuffers = await Promise.all(productFiles.map((file) => readFile(join(ROOT, file))));
const build = {
  sha,
  dirty: !!execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], { cwd: ROOT, encoding: "utf8" }).trim(),
  source_sha256: hash(sourceBuffers),
};
const baselineBuild = {
  sha: execFileSync("git", ["rev-parse", baselineSha], { cwd: ROOT, encoding: "utf8" }).trim(),
  dirty: false,
  source_sha256: hash(productFiles.map((file) => execFileSync("git", ["show", `${baselineSha}:${file}`], { cwd: ROOT }))),
};
let previous;
try { previous = JSON.parse(await readFile(join(OUT, "screenshots.json"), "utf8")); }
catch (e) { if (e.code !== "ENOENT") throw e; }
if (process.argv.includes("--check-coverage")) {
  if (!previous || previous.screenshots.length !== states.length * viewports.length) {
    throw new Error("Recorded baseline matrix is missing or incomplete");
  }
  const checkImages = async (rows) => {
    for (const row of rows) {
      if (row.status !== "已截" || !row.relative_image_path) {
        throw new Error(`Missing screenshot: ${row.screen_id} ${JSON.stringify(row.viewport)}`);
      }
      await stat(join(OUT, ...row.relative_image_path.split("/")));
    }
  };
  await checkImages(previous.screenshots);
  await checkImages(previous.history);
  let supplemental = 0;
  for (const batch of previous.supplemental_batches || []) {
    const data = JSON.parse(await readFile(join(OUT, ...batch.screenshots.split("/")), "utf8"));
    for (const row of data.screenshots) {
      if (row.status !== "已截" || !row.relative_image_path) throw new Error(`Incomplete batch: ${batch.id}`);
      const png = await readFile(join(OUT, batch.id, ...row.relative_image_path.split("/")));
      if (!row.full_page && (png.readUInt32BE(16) !== row.viewport.width || png.readUInt32BE(20) !== row.viewport.height)) {
        throw new Error(`Not an actual viewport PNG: ${batch.id} ${row.relative_image_path}`);
      }
    }
    supplemental += data.screenshots.length;
  }
  console.log(`UI_COVERAGE_OK recorded baseline ${previous.screenshots.length}/${states.length * viewports.length}; `
    + `history ${previous.history.length}; supplemental ${supplemental}; read-only, no images captured; not a new-build full-matrix claim`);
  process.exit(0);
}
await mkdir(join(OUT, "images"), { recursive: true });
const captures = (previous?.history || previous?.screenshots || []).filter((entry) => entry.status === "已截");
// Recover early intermediate images without inventing their lost canvas metrics.
for (const filename of await readdir(join(OUT, "images"))) {
  const relative_image_path = `images/${filename}`;
  if (captures.some((c) => c.relative_image_path === relative_image_path)) continue;
  const [id, viewportId, fingerprint] = filename.replace(/\.png$/, "").split("--");
  const entry = states.find(([key]) => key === id);
  const v = viewports.find((item) => item.key === viewportId);
  if (!entry || !v) throw new Error("Unrecognized archived image: " + filename);
  if (!["0fc9c92a", "b968823a"].includes(fingerprint)) throw new Error("Missing provenance for archived image: " + filename);
  const path = join(OUT, "images", filename);
  const png = await readFile(path);
  captures.push({
    screen_id: id, state: entry[1], viewport: { id: v.key, width: v.width, height: v.height },
    language: "zh-CN", build: { sha: baselineBuild.sha, dirty: true, source_sha256_prefix: fingerprint },
    source: entry[2], relative_image_path,
    repro_steps: [id === "pause-help" ? "正常骑士新局 → 暂停，长操作说明"
      : id.startsWith("title-") ? "正常标题页 → 未选角色 / 点骑士选中"
      : id === "day-first" ? "正常骑士新局 → 开场/营地预演结束 → 首局 HUD"
      : entry[2] === "normal" ? `中间构建归档：${entry[1]}；正常玩家路径的完整点击步骤未在旧索引保留`
      : `中间构建归档：${entry[1]}；fixture 状态曾通过 CUBE 测试接口准备，精确注入参数未在旧索引保留`],
    issue_ids: [
      ...(id === "pause-help" && v.width === 320 ? ["UI-004"] : []),
      ...(id === "day-first" && v.width === 844 ? ["UI-003"] : []),
    ],
    status: "已截", visual_review: "待用户审查",
    captured_at: (await stat(path)).mtime.toISOString(), timestamp_source: "original PNG mtime",
    platform: "Web / WebKit", input: v.touch ? "touch emulation" : "keyboard + mouse",
    ui_scale: "100%", device_scale_factor: 1, full_page: true,
    native_image_pixels: { width: png.readUInt32BE(16), height: png.readUInt32BE(20) },
    metadata_note: "归档元数据由原文件名恢复；基础 SHA/dirty、视口和图像保留，旧 canvas 实测值与部分精确注入步骤未恢复；不计入当前矩阵覆盖。",
  });
}
for (const archived of captures.filter((c) => c.metadata_note && c.source === "normal")) {
  archived.repro_steps = archived.repro_steps.map((step) => step.replace(
    "fixture 状态曾通过 CUBE 测试接口准备，精确注入参数", "正常玩家路径的完整点击步骤"
  ));
}
const notes = [
  "Web / WebKit，中文 zh-CN；项目无英文切换、独立设置页或手动存读档界面，声音开关和暂停操作说明即现有设置入口。",
  "独立临时 browser context；不读写用户浏览器存档。normal 从正常选角/开场进入；fixture 明确使用 window.CUBE 测试接口和临时状态，不代表自然通关或平衡验证。",
  "deviceScaleFactor=1，浏览器缩放 100%，原图未缩放；full_page=true 可能高于视口。viewport 是真实 layout viewport，game_viewport_css 是 canvas 实测尺寸，游戏逻辑视口为 320x192。",
  "已截仅表示证据已保存，不表示视觉审查通过。所有图待用户/父协调会话逐图审查；未变且已覆盖的图复用，不重复刷图。持续会话每 4 小时核对一次覆盖，不创建无人值守定时进程。",
  "修复前 day-before 从 git 7c22ec5 内存服务渲染；未切换、覆盖或暂存当前工作区。修复后 dirty 构建以三个产品源码文件的 SHA-256 区分。",
  "无腾讯云、Pages 上传或部署；只运行本机临时 HTTP 服务。触屏为浏览器模拟，尚未真机验证。",
  "history 保留中间构建；部分早期归档元数据从原文件名恢复并明确标注缺失的旧 canvas 测量/精确注入参数。当前矩阵的 172 张图保留完整真实测量与复现步骤。",
];
const issues = [
  { id: "UI-001", title: "触屏无移动/技能/交互入口", status: "已修复，待用户审查", before: "day-before", after: "day-first" },
  { id: "UI-002", title: "手机引导遮挡画布", status: "已移出画布，待用户审查", before: "day-before", after: "day-first" },
  { id: "UI-003", title: "横屏画布过高，操作时看不到角色/篝火", status: "已改并排布局，待用户审查", before_source: "0fc9c92a", after: "day-first" },
  { id: "UI-004", title: "320x568 暂停长说明使继续按钮在视口外且不可滚动", status: "已增加面板滚动，待用户审查", before_source: "b968823a", after: "pause-actions" },
  { id: "UI-005", title: "320x568 背包与部分触屏入口需要页面滚动", status: "待用户逐图评估", after: "day-first" },
  { id: "UI-006", title: "第三夜仍在夜间时，引导已跳至天亮献祭，和主目标守火不一致", status: "截图发现，待整改；既有引导规则未在本片修改", after: "night-wave" },
  { id: "UI-007", title: "320x568 夜战操作提示遮住部分波次文字", status: "截图发现，待整改；不代表视觉通过", after: "night-wave" },
];
async function manifest() {
  const rows = states.flatMap(([screen_id, state, source]) => viewports.map((v) => {
    const target = source === "baseline" ? baselineBuild : build;
    return captures.findLast((c) => c.screen_id === screen_id && c.viewport.id === v.key
      && c.build.source_sha256 === target.source_sha256) || {
      screen_id, state, viewport: { id: v.key, width: v.width, height: v.height },
      language: "zh-CN", build: target, source, relative_image_path: null,
      repro_steps: [], issue_ids: [], status: "待截",
    };
  }));
  for (const row of rows) {
    if (row.screen_id === "night-wave" || row.screen_id === "night-hurt") {
      row.issue_ids = [...new Set([...row.issue_ids, "UI-006",
        ...(row.viewport.width === 320 ? ["UI-007"] : [])])];
    }
  }
  await writeFile(join(OUT, "screenshots.json"), JSON.stringify({
    updated_at: new Date().toISOString(), visual_review: "待用户逐图审查",
    notes, issues, screenshots: rows, history: captures,
  }, null, 2) + "\n");
  const done = rows.filter((r) => r.status === "已截").length;
  const imageLink = (r) => r ? `[原图](${r.relative_image_path})` : "—";
  const lines = [
    "# Cube Epoch UI review · 2026-11-06", "",
    `覆盖：${done}/${rows.length}。视觉审查：**待用户逐图审查，未通过**。`, "",
    ...notes.map((n) => `- ${n}`), "",
    "复现命令：`node tests\\ui-review.mjs --touch-only`（首批）或 `node tests\\ui-review.mjs`（全量）；`node tests\\ui-review.mjs --check-coverage` 只核查覆盖与文件，不刷图。",
    "截图及生成器在主题分支；截图完整元数据见 screenshots.json。", "",
    "检查与限制：[validation.json](validation.json)；原始结果：[local-checks.log](local-checks.log)、[coverage-check.log](coverage-check.log)。",
    "",
    "## 优先审查：触屏入口 / 主 HUD 前后图", "",
    "| 视口 | 基线 7c22ec5 | 当前触屏 / HUD | 小屏暂停修复前 | 当前暂停按钮 |",
    "|---|---|---|---|---|",
    ...viewports.map((v) => {
      const current = (id) => rows.find((r) => r.screen_id === id && r.viewport.id === v.key && r.status === "已截");
      const oldPause = captures.find((r) => r.screen_id === "pause-help" && r.viewport.id === v.key
        && (r.build.source_sha256 || r.build.source_sha256_prefix || "").startsWith("b968823a"));
      return `| ${v.key} | ${imageLink(current("day-before"))} | ${imageLink(current("day-first"))} | ${imageLink(oldPause)} | ${imageLink(current("pause-actions"))} |`;
    }),
    "",
    "## 界面问题 / 前后图", "",
    ...issues.map((i) => `- **${i.id}** ${i.title}：${i.status}。前图 ${i.before || i.before_source || "见当前图（待整改）"}，当前图 ${i.after}；旧图仍保留在 screenshots.json 的 history。`),
    "",
    "| screen_id | 状态 | 视口 | 来源 | 证据 | 覆盖状态 |",
    "|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.screen_id} | ${r.state} | ${r.viewport.id} | ${r.source} | ${r.relative_image_path ? `[原图](${r.relative_image_path})` : "—"} | ${r.status} |`),
    "",
    "## 不适用 / 未覆盖", "",
    "- 无英文切换、账号/存档页、独立设置面板、空列表界面；不得用伪造界面代替。",
    "- 未覆盖真实 iOS/Android 设备、浏览器工具栏/系统手势、安全区，以及完整自然三夜通关；结算/极端值使用标注的临时注入状态。",
    "- 状态截图是全页原图，横屏/小屏可能需要页面滚动；关键控件是否应固定在同屏由用户逐图审查决定。",
    "- 自动测试与截图均不代表布局审查或产品平衡已通过。",
    "",
  ];
  await writeFile(join(OUT, "INDEX.md"), lines.join("\n"));
  return rows;
}
await manifest();
const { server, origin } = await serve();
const baselineFiles = new Map([...productFiles, "assets/miner.jpg", "assets/farmer.jpg", "assets/mage.jpg", "assets/knight.jpg"]
  .map((file) => ["/" + file, execFileSync("git", ["show", `${baselineSha}:${file}`], { cwd: ROOT })]));
const baselineServer = createServer((req, res) => {
  const path = new URL(req.url, "http://127.0.0.1").pathname;
  const file = path === "/" ? "/index.html" : path;
  const body = baselineFiles.get(file);
  if (!body) { res.writeHead(404); res.end(); return; }
  res.setHeader("content-type", file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : file.endsWith(".jpg") ? "image/jpeg" : "text/html");
  res.end(body);
});
await new Promise((resolve) => baselineServer.listen(0, "127.0.0.1", resolve));
const baselineOrigin = `http://127.0.0.1:${baselineServer.address().port}/`;
const browser = await launch();
try {
  for (const v of viewports) {
    const context = await browser.newContext({
      viewport: { width: v.width, height: v.height }, deviceScaleFactor: 1,
      isMobile: v.touch, hasTouch: v.touch, locale: "zh-CN",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const click = async (selector) => v.touch ? page.locator(selector).tap() : page.locator(selector).click();
    const shot = async (id, steps) => {
      const [, state, source] = states.find(([key]) => key === id);
      const target = source === "baseline" ? baselineBuild : build;
      const old = captures.find((c) => c.screen_id === id && c.viewport.id === v.key
        && c.build.source_sha256 === target.source_sha256
        && JSON.stringify(c.repro_steps) === JSON.stringify(steps));
      if (old) { console.log(`REUSE ${id} ${v.key}`); return; }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(100);
      const metrics = await page.evaluate(() => {
        const canvas = document.getElementById("game");
        const r = canvas.getBoundingClientRect();
        return {
          layout_viewport: { width: innerWidth, height: innerHeight },
          game_viewport_css: { x: r.x, y: r.y, width: r.width, height: r.height },
          canvas_backing: { width: canvas.width, height: canvas.height },
          document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
          scroll: { x: scrollX, y: scrollY },
        };
      });
      const recipe = hash([Buffer.from(JSON.stringify(steps))]).slice(0, 8);
      const relative_image_path = `images/${id}--${v.key}--${target.source_sha256.slice(0, 8)}--${recipe}.png`;
      await page.screenshot({ path: join(OUT, ...relative_image_path.split("/")), fullPage: true, animations: "disabled" });
      captures.push({
        screen_id: id, state, viewport: { id: v.key, width: v.width, height: v.height },
        language: "zh-CN", build: target, source,
        relative_image_path, repro_steps: steps,
        issue_ids: [
          ...(id === "day-before" && v.touch ? ["UI-001", "UI-002"] : []),
          ...(id === "day-first" && v.touch ? ["UI-001", "UI-002"] : []),
          ...(id === "day-first" && v.key === "landscape-844x390" ? ["UI-003"] : []),
          ...(id.startsWith("pause-") && v.key === "phone-320x568" ? ["UI-004"] : []),
          ...(id === "day-first" && v.key === "phone-320x568" ? ["UI-005"] : []),
        ],
        status: "已截", visual_review: "待用户审查", captured_at: new Date().toISOString(),
        platform: "Web / WebKit", input: v.touch ? "touch emulation" : "keyboard + mouse",
        ui_scale: "100%", device_scale_factor: 1, full_page: true, ...metrics,
      });
      await manifest();
      console.log(`CAPTURE ${id} ${v.key}`);
    };
    const fixture = async (fn, arg) => {
      await page.evaluate(fn, arg);
      await page.waitForTimeout(80);
    };
    const fresh = async (cls = "knight") => {
      await page.goto(origin);
      await enterPlay(page, cls);
    };
    await page.goto(baselineOrigin);
    await enterPlay(page);
    await shot("day-before", ["git 7c22ec5 内存服务，独立空存储 context", "选择骑士 → 开始 → 跳过开场 → 跳过预演；无状态注入"]);
    await page.goto(origin);
    await shot("title-empty", ["正常本地页面，独立空存储 context"]);
    await click('.class-card[data-class="knight"]');
    await shot("title-selected", ["标题页 → 点骑士，未开始"]);
    if (touchOnly) {
      await enterPlay(page);
      await shot("day-first", ["正常选骑士 → 开始 → 跳过开场 → 跳过预演；无状态注入"]);
      await context.close();
      continue;
    }
    await click("#btn-start");
    for (let i = 0; i < 6; i++) {
      await page.waitForSelector("#screen-intro:not(.hidden)");
      await click("#intro-box");
      await shot(`intro-${i + 1}`, [`正常首次开始；点击字幕补全第 ${i + 1} 页，未注入状态`]);
      await click("#intro-box");
    }
    for (const id of ["camp", "bench", "altar", "build", "depart"]) {
      await page.waitForSelector("#briefing:not(.hidden)");
      await click("#briefing-box");
      await page.waitForTimeout(800);
      await shot(`brief-${id}`, [`开场全部正常点击继续 → 营地预演 ${id}；点击补全文字，未注入状态`]);
      await click("#briefing-box");
    }
    await page.waitForSelector("#briefing.hidden", { state: "attached" });
    await shot("day-first", ["完整正常首次进入流程 → 白天首局；无状态注入"]);
    await page.reload();
    await click('.class-card[data-class="knight"]');
    await click("#btn-start");
    await page.waitForSelector("#screen-game:not(.hidden)");
    await shot("day-returning", ["同一临时 context 完成开场后刷新 → 选骑士 → 开始；正常跳过开场"]);
    for (const cls of ["miner", "farmer", "mage"]) {
      await fixture((cls) => window.CUBE.start(cls), cls);
      await shot(`day-${cls}`, [`开发测试接口 CUBE.start("${cls}")；临时职业新局，不触及用户存档`]);
    }
    await fresh();
    await fixture(() => { const s = CUBE.getState(); s.flags.moved = s.flags.chopped = true; CUBE.setBuild("fence"); });
    await shot("build-selected", ["正常开始骑士；fixture: moved/chopped=true，CUBE.setBuild('fence')"]);
    await fixture(() => {
      const s = CUBE.getState(); s.inv.wood = s.inv.fence = 0; CUBE.place(23, 21);
    });
    await shot("build-no-resource", ["fixture: wood=fence=0；选择栅栏，在 (23,21) 尝试建造"]);
    await fixture(() => {
      const s = CUBE.getState(); s.inv.wood = 4; CUBE.place(23, 21);
      s.fenceHp.set("23,21", 20); CUBE.place(23, 21);
    });
    await shot("build-repair", ["fixture: 建立 (23,21) 围墙，血量20，备4木；CUBE.place 修复"]);
    await fresh("farmer");
    await fixture(() => {
      const s = CUBE.getState(); s.player.x = 24 * 16 + 8; s.player.y = 25 * 16 + 8;
      s.player.dir = 0; s.tiles[26 * 48 + 24] = 7; s.flags.moved = true;
    });
    await shot("plant-empty", ["正常农夫新局；fixture: 玩家 (24,25) 面南，(24,26) 空田"]);
    await fixture(() => CUBE.interact());
    await shot("plant-growing", ["同上 fixture；调用既有 interact 播种，显示真实幼苗"]);
    await fixture(() => { CUBE.getState().crops.get("24,26").stage = 2; });
    await shot("plant-ripe", ["同上 fixture；临时作物 stage=2，展示成熟提示"]);
    await fixture(() => { for (const k of Object.keys(CUBE.getState().inv)) CUBE.getState().inv[k] = 999999; });
    await shot("inventory-large", ["fixture: 所有背包数字=999999，极端数字溢出检查"]);
    await fresh();
    await fixture(() => {
      const s = CUBE.getState(); s.player.x = s.bench.x; s.player.y = s.bench.y + 12;
      for (const k of Object.keys(s.inv)) s.inv[k] = 0;
      CUBE.interact();
    });
    await shot("craft-missing", ["fixture: 玩家工作台南侧12px，所有材料0；执行既有合成入口"]);
    await fixture(() => { Object.assign(CUBE.getState().inv, { wood: 4, stone: 5, gold: 3, wheat: 3 }); CUBE.interact(); });
    await shot("craft-heart", ["同上 fixture: 补齐现有配方材料；执行既有合成，心=1"]);
    await fresh();
    await fixture(() => {
      const s = CUBE.getState(); s.inv.wood = 10; CUBE.setBuild("fence");
      for (const [x, y] of [[22,20], [21,21], [23,21], [22,22]]) CUBE.place(x,y);
      CUBE.setBuild(null); s.day = false; s.nights = 3; s.wave = 2; s.wavesTotal = 3; s.toSpawn = 3;
      s.flags.moved = s.flags.chopped = s.flags.gathered = true;
      CUBE.spawnEnemy(); CUBE.spawnEnemy();
      s.enemies[0].x = s.camp.x + 48; s.enemies[0].y = s.camp.y;
      s.enemies[1].x = s.camp.x; s.enemies[1].y = s.camp.y - 48;
    });
    await page.waitForTimeout(3300);
    await shot("night-wave", ["fixture: 四面围墙，第三夜第2/3波，已完成前三步引导；调用既有敌人生成并放到营地48px外；等待3.3秒让建造提示消失"]);
    await fixture(() => { const s = CUBE.getState(); s.player.hp = 34; s.campHp = 24; s.campFlash = 0.4; s.player.invuln = 0.7; });
    await shot("night-hurt", ["同上 fixture；玩家34HP、篝火24HP、受伤闪烁"]);
    await fixture(() => { CUBE.start("mage"); const s = CUBE.getState(); s.player.mana = 0; s.player.skillCd = 7.5; });
    await shot("skill-cooldown", ["fixture: 法师新局，法力0，技能冷却7.5秒；非正常玩家存档"]);
    await fresh();
    await click("#btn-pause");
    await shot("pause-help", ["正常骑士新局 → 暂停，既有操作说明和继续/回选角"]);
    await page.locator("#overlay-actions").scrollIntoViewIfNeeded();
    await shot("pause-actions", ["正常暂停 → 说明面板内部滚动至底部，显示继续/回选角；未注入状态"]);
    await click("#overlay-actions button:first-child");
    await click("#btn-mute");
    await shot("audio-music-off", ["正常骑士新局 → 声音开关一次"]);
    await click("#btn-mute");
    await shot("audio-all-off", ["继续点声音开关，音乐与音效均关闭"]);
    await click("#btn-pause");
    await click("#overlay-actions button:last-child");
    await page.waitForSelector("#screen-title:not(.hidden)");
    await shot("return-title", ["正常暂停菜单 → 回选角，页面重新载入"]);
    for (const id of ["failure-camp", "failure-player"]) {
      await fresh();
      await fixture((id) => {
        const s = CUBE.getState(); s.day = false; s.nights = 2;
        s.player.x = id === "failure-camp" ? 600 : s.camp.x + 10;
        s.player.y = s.camp.y; s.player.hp = id === "failure-player" ? 1 : s.player.hp;
        s.campHp = id === "failure-camp" ? 1 : 100;
        s.enemies = [{ kind: "slime", x: id === "failure-camp" ? s.camp.x + 16 : s.player.x, y: s.camp.y,
          vx: 0, vy: 0, hp: 100, maxHp: 100, spd: 0, dmg: 100, hit: 0, flash: 0, bob: 0 }];
      }, id);
      await page.waitForSelector("#overlay:not(.hidden)");
      await shot(id, [`fixture: ${id === "failure-camp" ? "篝火1血，玩家远离；怪在篝火旁" : "玩家1血，怪在玩家旁"}；由既有战斗逻辑触发失败`]);
    }
    await click("#overlay-actions button");
    await page.waitForSelector("#screen-title:not(.hidden)");
    await shot("retry-title", ["临时注入失败结算 → 点真实回到选角按钮，正常重新载入；前置为 fixture，不是自然通关"]);
    await fresh();
    for (const id of ["altar-night", "altar-early", "altar-ready"]) {
      await fixture((id) => {
        const s = CUBE.getState(); s.player.x = s.altar.x; s.player.y = s.altar.y + 12;
        s.inv.heart = 1; s.day = id !== "altar-night"; s.nights = id === "altar-early" ? 2 : 3;
        if (id !== "altar-ready") CUBE.interact();
      }, id);
      await shot(id, [`fixture: 玩家祭坛南侧12px、心1、${id === "altar-night" ? "第三夜夜间" : id === "altar-early" ? "第二夜后白天" : "第三夜后白天"}；${id === "altar-ready" ? "等待真实交付提示" : "执行既有 interact 看拒绝提示"}`]);
    }
    await fixture(() => CUBE.interact());
    await page.waitForFunction(() => CUBE.getState().win);
    await shot("victory", ["同上 fixture: 三夜后白天；既有 interact 完成交付，真实胜利结算"]);
    if (errors.length) throw new Error(`${v.key} page errors: ${errors.join(" | ")}`);
    await context.close();
  }
} finally {
  await browser.close();
  await Promise.all([server, baselineServer].map((s) => new Promise((resolve) => s.close(resolve))));
  await manifest();
}
console.log(`UI_EVIDENCE ${OUT}`);
