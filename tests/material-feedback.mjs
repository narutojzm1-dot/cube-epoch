import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, serve, launch, enterPlay } from "./helpers.mjs";

const baseline = "d80f0e8876bf47343da80f88b6a05b7c90447fdd";
const out = join(ROOT, "evidence", "ui-review-2026-11-06", "material-feedback");
const viewports = [{ width: 320, height: 568 }, { width: 390, height: 844 }];
const cases = [
  { id: "fence-partial", role: "mage", kind: "fence", inv: { wood: 1 },
    message: "材料还差：木 1", before: "材料不够：木2", capture: true },
  { id: "fence-zero", role: "mage", kind: "fence", inv: {},
    message: "材料还差：木 2", before: "材料不够：木2", capture: true },
  { id: "fence-enough", role: "mage", kind: "fence", inv: { wood: 2 },
    delta: { wood: -2 }, capture: true },
  { id: "fence-stored", role: "mage", kind: "fence", inv: { fence: 1 }, delta: { fence: -1 } },
  { id: "torch-partial", kind: "torch", inv: { wood: 1 },
    message: "材料还差：石 1", before: "材料不够：石1" },
  { id: "torch-zero", kind: "torch", inv: {},
    message: "材料还差：木 1、石 1", before: "材料不够：木1、石1", capture: true },
  { id: "mage-torch", role: "mage", kind: "torch", inv: { wood: 1 }, delta: { wood: -1 } },
  { id: "farmer-free-plot", role: "farmer", kind: "plot", inv: {}, delta: {} },
  { id: "plot-zero", kind: "plot", inv: {},
    message: "材料还差：木 1", before: "材料不够：木1" },
  { id: "repair-zero", role: "mage", kind: "fence", repair: true, inv: { fence: 1 },
    message: "修墙还差：木 1", before: "修墙需要 1 木。", capture: true },
  { id: "repair-enough", role: "mage", kind: "fence", repair: true, inv: { wood: 1 },
    delta: { wood: -1 }, capture: true },
  { id: "craft-partial", inv: { wood: 2, stone: 3, gold: 3, wheat: 1 },
    message: "还差：木 2、石 2、麦 2", capture: true },
  { id: "craft-zero", inv: {}, message: "还差：木 4、石 5、金 3、麦 3", capture: true },
  { id: "craft-enough", inv: { wood: 4, stone: 5, gold: 3, wheat: 3 },
    delta: { wood: -4, stone: -5, gold: -3, wheat: -3, heart: 1 }, capture: true },
  { id: "craft-stored", inv: { heart: 1, wood: 4, stone: 5, gold: 3, wheat: 3 },
    message: "方块之心已备好，再守 3 夜，天亮再献。" },
];

async function scenario(page, origin, c, version) {
  await page.goto(origin);
  await enterPlay(page, c.role || "knight");
  const before = await page.evaluate(({ inv, kind, repair, delivery }) => {
    const s = window.CUBE.getState();
    for (const key of Object.keys(s.inv)) s.inv[key] = inv[key] || 0;
    s.player.x = kind ? s.camp.x + 32 : s.bench.x;
    s.player.y = kind ? s.camp.y + 16 : s.bench.y + 12;
    s.player.vx = s.player.vy = 0;
    if (delivery) {
      s.day = delivery.day;
      s.nights = delivery.nights;
      s.flags.moved = s.flags.chopped = true;
      const tx = Math.floor(s.camp.x / 16), ty = Math.floor(s.camp.y / 16);
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
        s.tiles[(ty + dy) * 48 + tx + dx] = 12;
        s.fenceHp.set(`${tx + dx},${ty + dy}`, 80);
      }
    }
    if (kind) {
      s.tiles[20 * 48 + 22] = repair ? 12 : 1;
      if (repair) s.fenceHp.set("22,20", 20);
    }
    return { ...s.inv };
  }, c);
  if (c.kind) {
    if (!(await page.locator("#play-details").evaluate((el) => el.open))) {
      await page.locator("#play-details summary").tap();
    }
    await page.locator(`.item[data-build="${c.kind}"]`).tap();
    await page.waitForFunction(() => !document.getElementById("play-details").open);
    // Native details.toggle resets input in a queued task; let that transition finish before aiming.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const point = await page.evaluate(() => {
      const cam = window.CUBE.cam();
      const r = document.getElementById("game").getBoundingClientRect();
      return { x: r.x + (22 * 16 + 8 - cam.x) * r.width / 320,
        y: r.y + (20 * 16 + 8 - cam.y) * r.height / 192 };
    });
    await page.touchscreen.tap(point.x, point.y);
  } else if (c.mouse) {
    await page.keyboard.press("e");
  } else {
    await page.locator("#touch-interact").tap();
  }
  const message = version === "before" ? c.before || c.message : c.message;
  await page.waitForFunction(({ message, kind, repair }) => {
    const s = window.CUBE.getState();
    if (message) return document.getElementById("toast").textContent === message;
    if (!kind) return s.inv.heart === 1;
    if (repair) return s.fenceHp.get("22,20") === 80;
    return s.tiles[20 * 48 + 22] === ({ fence: 12, torch: 13, plot: 7 })[kind];
  }, { message, kind: c.kind, repair: c.repair }, { timeout: 10000 }).catch(async (error) => {
    const debug = await page.evaluate(() => {
      const s = window.CUBE.getState();
      return { inv: s.inv, tile: s.tiles[20 * 48 + 22], build: s.build, paused: s.paused,
        message: document.getElementById("toast").textContent };
    });
    throw new Error(`${c.id} / ${version}: ${JSON.stringify(debug)}`, { cause: error });
  });
  if (c.delivery) await page.evaluate(() => new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const result = await page.evaluate(() => {
    const s = window.CUBE.getState();
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const canvas = document.getElementById("game");
    const feed = document.getElementById("notice-feed");
    const toast = document.getElementById("toast");
    return {
      inv: { ...s.inv }, tile: s.tiles[20 * 48 + 22], fence_hp: s.fenceHp.get("22,20") || null,
      held: document.querySelectorAll("#touch-controls .held").length,
      touch_layout: matchMedia("(any-pointer: coarse), (max-width: 760px)").matches,
      scroll: { x: scrollX, y: scrollY }, details_open: document.getElementById("play-details").open,
      message: toast.textContent, canvas: rect(canvas), canvas_backing: { width: canvas.width, height: canvas.height },
      prompt: document.getElementById("prompt").textContent,
      prompt_rect: rect(document.getElementById("prompt")),
      guide_body: document.getElementById("guide-body").textContent,
      keys_hint: document.getElementById("keys-hint").textContent,
      feed: rect(feed), toast: rect(toast), document_width: document.documentElement.scrollWidth,
      controls: [...document.querySelectorAll("#touch-controls button")].map((el) => {
        const r = rect(el);
        return { ...r, label: el.textContent.trim(),
          hit_target: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest("button") === el };
      }),
    };
  });
  const expected = { ...before };
  for (const [key, amount] of Object.entries(c.delta || {})) expected[key] += amount;
  assert.deepEqual(result.inv, expected, `${c.id}: failure must not consume; success must preserve exact costs/stored priority`);
  if (message) assert.equal(result.message, message);
  if (c.message && c.kind) assert.equal(result.tile, c.repair ? 12 : 1, "shortage must not place a tile");
  if (c.repair && c.message) assert.equal(result.fence_hp, 20, "shortage must not repair");
  assert.equal(result.held, 0, "native tap must release");
  assert.deepEqual(result.scroll, { x: 0, y: 0 }, "native actions must not scroll");
  if (!c.mouse) assert.equal(result.details_open, false, "core controls must be reachable after choosing construction");
  return { before, ...result };
}

export async function testHeartDelivery(browser, origin, { capture = false, before = false, only = null } = {}) {
  const dir = join(ROOT, "evidence", "ui-review-2026-11-06", "heart-delivery");
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT }).toString().trim();
  const dirty = !!execFileSync("git", ["status", "--porcelain", "--", "index.html", "style.css", "game.js"], { cwd: ROOT }).toString().trim();
  if (before && !only) {
    assert.equal(sha, "d2bc02e15e112dcd5e247064490e42cd5c3021fe");
    assert.equal(dirty, false, "before originals require the unchanged delivered product");
  }
  const files = ["index.html", "style.css", "game.js"];
  const buffers = before && only
    ? files.map((f) => execFileSync("git", ["show", `d2bc02e15e112dcd5e247064490e42cd5c3021fe:${f}`], { cwd: ROOT }))
    : await Promise.all(files.map((f) => readFile(join(ROOT, f))));
  const hash = createHash("sha256").update(Buffer.concat(buffers)).digest("hex");
  const deliveryCases = [
    { id: "stored-before-nights", delivery: { day: true, nights: 0 }, message: "方块之心已备好，再守 3 夜，天亮再献。" },
    { id: "stored-third-night", delivery: { day: false, nights: 3 }, message: "方块之心已备好，守住篝火，天亮再献。" },
    { id: "stored-ready", delivery: { day: true, nights: 3 }, message: "方块之心已备好，去北边祭坛献祭。" },
    { id: "stored-first-night", delivery: { day: false, nights: 1 }, message: "方块之心已备好，先守满三夜，天亮再献。" },
    { id: "stored-second-night", delivery: { day: false, nights: 2 }, message: "方块之心已备好，先守满三夜，天亮再献。" },
  ];
  const screenshots = [], checks = [];
  const version = before ? "before" : "after";
  for (const viewport of [...viewports, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
    const touch = viewport.width !== 1280;
    const context = await browser.newContext({ viewport, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      if (before && only) {
        await page.route(origin, (r) => r.fulfill({ body: buffers[0], contentType: "text/html" }));
        for (let i = 0; i < files.length; i++) await page.route(`**/${files[i]}`, (r) => r.fulfill({
          body: buffers[i], contentType: i === 0 ? "text/html" : i === 1 ? "text/css" : "text/javascript",
        }));
      }
      for (const c of deliveryCases.filter((c) => !only || only.includes(c.id))) {
        const result = await scenario(page, origin, { ...c,
          mouse: !touch,
          before: "方块之心已经在背包里。送到北边祭坛。",
          inv: { heart: 1, wood: 4, stone: 5, gold: 3, wheat: 3, seed: 2 },
        }, version);
        assert.equal(result.prompt, before ? `${touch ? "点「交互 E」" : "按 E"}合成方块之心` : c.message);
        assert.equal(result.touch_layout, touch, "actual media/input layout must match the recorded context");
        if (!before && c.delivery.day && c.delivery.nights === 3) {
          assert.equal(result.guide_body, c.message);
          if (!touch) assert.equal(result.keys_hint, "此刻：北边祭坛按 E 献祭");
        }
        if (touch && viewport.width < 400) checkLayout(result, viewport);
        if (touch && !before) assert.ok(result.prompt_rect.bottom <= result.feed.bottom + 0.5,
          "stored-heart prompt and toast must both fit the bounded feedback area");
        if (touch && viewport.width === 844) {
          for (const r of [result.canvas, ...result.controls]) {
            assert.ok(r.x >= 0 && r.y >= 0 && r.right <= viewport.width + 0.5 && r.bottom <= viewport.height + 0.5);
          }
          for (const b of result.controls) assert.ok(b.width >= 44 && b.height >= 44 && b.hit_target);
          assert.ok(result.toast.bottom <= result.feed.bottom + 0.5);
        }
        if (touch) await page.locator("#touch-interact").tap();
        else await page.keyboard.press("e");
        const repeated = await page.evaluate(() => ({
          inv: { ...window.CUBE.getState().inv }, held: document.querySelectorAll("#touch-controls .held").length,
          scroll: { x: scrollX, y: scrollY },
        }));
        assert.deepEqual(repeated.inv, result.inv,
          "repeated interaction with stored heart must not recraft or consume");
        assert.equal(repeated.held, 0, "repeat must release the touch button");
        assert.deepEqual(repeated.scroll, { x: 0, y: 0 }, "repeated interaction must not scroll");
        assert.equal(await page.evaluate(() => window.CUBE.getState().over), false, "bench interaction must not win");
        checks.push({ screen_id: c.id, version, viewport, input: touch ? "native touch" : "mouse/keyboard", result });
        if (capture && (touch || c.id === "stored-ready")) {
          await page.evaluate(() => { window.CUBE.getState().paused = true; });
          const filename = `${c.id}--${viewport.width}x${viewport.height}--${version}--${hash.slice(0, 8)}.png`;
          await mkdir(join(dir, "images"), { recursive: true });
          await page.screenshot({ path: join(dir, "images", filename), fullPage: false });
          screenshots.push({
            screen_id: c.id, state: `${c.id} / ${version}`, viewport, language: "zh-CN",
            build: { sha: before ? "d2bc02e15e112dcd5e247064490e42cd5c3021fe" : sha,
              dirty: !before && dirty, source_sha256: hash }, source: "fixture / isolated browser context",
            platform: "Web / WebKit", ui_scale: "100%", device_scale_factor: 1, full_page: false,
            input: touch ? "native touch" : "mouse/keyboard", touchLayout: touch,
            relative_image_path: `images/${filename}`, issue_ids: ["UI-011"], status: "已截",
            visual_review: "待协调人逐图审查", captured_at: new Date().toISOString(), metrics: result,
            repro_steps: [
              "隔离临时上下文；正常选骑士并跳过开场/预演，不接触用户存档",
              before && only ? "内存route提供d2bc02e原HTML/CSS/JS，不切换工作区"
                : "实际工作区源码，产品SHA/dirty/hash见build",
              `fixture: 玩家工作台南12px，库存心1/木4/石5/金3/麦3/种2，其余0；白天=${c.delivery.day}，夜数=${c.delivery.nights}`,
              "fixture: 已移动/砍树，营火四邻栅栏HP80；只设置测试状态，不声称自然三夜",
              touch ? "正常运行中原生点「交互 E」两次" : "正常运行中按 E 两次",
              "仅截图时冻结模拟；真实首屏、100%缩放，不缩放/拼接原图",
            ],
          });
        }
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  if (capture) {
    const previous = before && !only ? [] : JSON.parse(await readFile(join(dir, "screenshots.json"), "utf8")).screenshots
      .filter((s) => !screenshots.some((n) => n.state === s.state && n.viewport.width === s.viewport.width
        && n.viewport.height === s.viewport.height));
    await writeFile(join(dir, "screenshots.json"), JSON.stringify({ screenshots: [...previous, ...screenshots],
      visual_review: "待协调人实际复看" }, null, 2) + "\n");
    const validation = before && !only ? {} : JSON.parse(await readFile(join(dir, "validation.json"), "utf8"));
    const key = before ? "before_checks" : "after_checks";
    validation[key] = [...(validation[key] || []).filter((c) => !checks.some((n) =>
      n.screen_id === c.screen_id && n.viewport.width === c.viewport.width && n.viewport.height === c.viewport.height)), ...checks];
    validation.no_user_save_access = true;
    await writeFile(join(dir, "validation.json"), JSON.stringify(validation, null, 2) + "\n");
  }
  console.log(`HEART_DELIVERY_OK ${checks.length} ${version} cases; ${screenshots.length} original PNGs`);
}

function checkLayout(result, viewport) {
  assert.equal(result.document_width, viewport.width, "no horizontal overflow");
  assert.ok(result.feed.height <= 60.5, "keep existing bounded feedback area");
  assert.ok(result.toast.y >= result.feed.y && result.toast.bottom <= result.feed.bottom + 0.5,
    "shortage text must be readable without scrolling the feedback area");
  assert.ok(result.canvas.bottom <= result.feed.y + 0.5, "feedback must not cover the canvas");
  for (const r of [result.canvas, ...result.controls]) {
    assert.ok(r.x >= 0 && r.y >= 0 && r.right <= viewport.width + 0.5 && r.bottom <= viewport.height + 0.5,
      "canvas and core controls must remain in the real first viewport");
  }
  for (const b of result.controls) {
    assert.ok(b.width >= 44 && b.height >= 44 && b.hit_target, `${b.label}: accessible 44px target`);
    assert.ok(b.y >= result.feed.bottom - 0.5, "feedback must not cover core controls");
  }
}

export async function testMaterialFeedback(browser, origin, capture = false) {
  const screenshots = [];
  const checks = [];
  const files = ["index.html", "style.css", "game.js"];
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT }).toString().trim();
  const dirty = !!execFileSync("git", ["status", "--porcelain", "--", ...files], { cwd: ROOT }).toString().trim();
  for (const version of capture ? ["before", "after"] : ["after"]) {
    const buffers = version === "before"
      ? files.map((file) => execFileSync("git", ["show", `${baseline}:${file}`], { cwd: ROOT }))
      : await Promise.all(files.map((file) => readFile(join(ROOT, file))));
    const hash = createHash("sha256").update(Buffer.concat(buffers)).digest("hex");
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        if (version === "before") {
          await page.route(origin, (r) => r.fulfill({ body: buffers[0], contentType: "text/html" }));
          for (let i = 0; i < files.length; i++) await page.route(`**/${files[i]}`, (r) => r.fulfill({
            body: buffers[i], contentType: i === 0 ? "text/html" : i === 1 ? "text/css" : "text/javascript",
          }));
        }
        for (const c of cases.filter((c) => version !== "before" || c.capture)) {
          const result = await scenario(page, origin, c, version);
          checkLayout(result, viewport);
          checks.push({ screen_id: c.id, version, viewport, result });
          if (capture && c.capture) {
            await page.evaluate(() => { window.CUBE.getState().paused = true; });
            const filename = `${c.id}--${viewport.width}x${viewport.height}--${version}--${hash.slice(0, 8)}.png`;
            const relative_image_path = `images/${filename}`;
            await mkdir(join(out, "images"), { recursive: true });
            await page.screenshot({ path: join(out, "images", filename), fullPage: false });
            screenshots.push({
              screen_id: c.id, state: `${c.id} / ${version}`, viewport, language: "zh-CN",
              build: { sha: version === "before" ? baseline : sha, dirty: version === "after" && dirty, source_sha256: hash },
              source: "fixture / isolated browser context; normal native touch actions after inventory/map setup",
              platform: "Web / WebKit", ui_scale: "100%", device_scale_factor: 1, full_page: false,
              relative_image_path, issue_ids: ["UI-008"], status: "已截", visual_review: "待协调人逐图审查",
              captured_at: new Date().toISOString(), metrics: result,
              repro_steps: [
                `隔离临时上下文；${version === "before" ? "route提供d80f0e8原HTML/CSS/JS，不切换工作区" : "当前工作区源码"}；不接触用户存档`,
                `正常选${c.role || "knight"}并跳过开场/预演；临时库存${JSON.stringify(c.inv)}；其余背包项0`,
                c.kind ? `临时玩家篝火东32px南16px；(22,20)设为${c.repair ? "坏墙HP20" : "草地"}；打开详情，原生点${c.kind}，自动收起后原生点目标格`
                  : "临时玩家工作台南12px；原生点「交互 E」",
                "动作在正常运行中完成；仅截图时冻结模拟，不弹暂停页；真实首屏原图，scroll=0，不缩放、不拼接",
              ],
            });
          }
        }
        assert.deepEqual(errors, [], "no page exceptions");
      } finally { await context.close(); }
    }
  }
  if (capture) {
    await writeFile(join(out, "screenshots.json"), JSON.stringify({ screenshots, visual_review: "待协调人实际复看" }, null, 2) + "\n");
    await writeFile(join(out, "validation.json"), JSON.stringify({ checks, after_cases: checks.filter((c) => c.version === "after").length,
      baseline, no_user_save_access: true, no_gameplay_changes: true }, null, 2) + "\n");
    await writeMaterialIndex(screenshots);
  }
  console.log(`MATERIAL_FEEDBACK_OK ${checks.filter((c) => c.version === "after").length} native-touch cases; ${screenshots.length} original screenshots`);
}

export async function writeMaterialIndex(screenshots) {
    const lines = [
      "# UI-008 材料缺口反馈", "",
      "独立追加批次：保留产品a342ef0、证据d80f0e8及原自然三夜记录。本片只修正缺料文案，不改变成本、资源、节奏或胜负。",
      "36张原图：9状态×320×568/390×844×前后。Web/WebKit，中文，100%缩放、DPR1，均为真实首屏，不是全页缩图。",
      "前图route提供d80f0e8原源码；后图为工作区实际源码，SHA/dirty/产品字节hash逐项记录。",
      "全部为隔离fixture：库存和目标格明确注入；操作走正常选角、详情选择、原生触屏点击和交互。只在截图时冻结模拟，不接触用户存档。",
      "核心修正：法师栅栏需2木，已有1木时，从「材料不够：木2」改为「材料还差：木 1」。",
      "方块之心原缺口算法已正确，抽取成共享格式规则后文案保持不变；修墙仍消耗1木，缺料时明确「修墙还差：木 1」。", "",
      "| 状态 | 视口 | 前原图 | 后原图 |", "|---|---|---|---|",
      ...cases.filter((c) => c.capture).flatMap((c) => viewports.map((v) => {
        const image = (version) => screenshots.find((s) => s.screen_id === c.id && s.state === `${c.id} / ${version}`
          && s.viewport.width === v.width).relative_image_path.replaceAll("\\", "/");
        return `| ${c.id} | ${v.width}×${v.height} | [原图](${image("before")}) | [原图](${image("after")}) |`;
      })),
      "", "## 检查与限制", "",
      "- [逐图复现、构建与实际画布/控件尺寸](screenshots.json) · [30个后版本场景](validation.json) · [真实检查输出](checks.log)。",
      "- 部分/零/足够库存、现成栅栏优先、法师火把免石、农夫免费田、修墙固定1木及已有心不再扣料，均有针对性断言。",
      "- 原生点击不滚页面、无按键保持；反馈区保持60px限高，缺口文本完整可见，画布与≥44px核心控件首屏可达且未被反馈盖住。",
      "- 初次截图执行等待超时；后续记录确认一次立即点画布未被处理，消息仍是建造选择。测试现让原生详情toggle输入重置与渲染完成后再点画布，不修改游戏输入规则；失败记录保留在checks.log及会话输出。",
      "- 36图及场景断言完成后，索引拼接引用缺失的version字段报错。现改用已记录state并从原元数据恢复INDEX，不重拍、不改图；归档错误与游戏检查分开记录。",
      "- 只新增320/390缺料对照；桌面/横屏等未变布局复用原批次，适用e2e覆盖四视口。本片不代表全界面重新截图、真机体验或自然三夜再通关。",
      "- 视觉状态：待用户/协调人实际逐图复看；自动检查不等于视觉通过。未合并或发布腾讯云/Pages。",
    ];
    await writeFile(join(out, "INDEX.md"), lines.join("\n") + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve();
  let browser;
  try {
    browser = await launch();
    await testMaterialFeedback(browser, origin, process.argv.includes("--capture"));
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
