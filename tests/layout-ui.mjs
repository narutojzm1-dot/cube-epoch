import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve, launch, enterPlay } from "./helpers.mjs";
import { prepareNightUI } from "./night-ui.mjs";

const viewports = [
  { width: 1280, height: 800, touch: false },
  { width: 390, height: 844, touch: true },
  { width: 320, height: 568, touch: true },
  { width: 844, height: 390, touch: true },
];
const coreScenarios = ["first-day", "mage-first-day", "third-night", "third-dawn", "no-materials"];
const scenarios = [...coreScenarios, "details-open", "briefing", "pause", "victory", "failure"];
const beforeSha = "9c06379dd6cdc14ea262d8545a4e44d8c28f2796";
const OUT = join(ROOT, "evidence", "ui-review-2026-11-06", "core-layout");

async function prepare(page, origin, scenario) {
  await page.goto(origin);
  if (scenario === "briefing") {
    await page.evaluate(() => localStorage.removeItem("cube-epoch-seen"));
    await page.locator('.class-card[data-class="knight"]').click();
    await page.locator("#btn-start").click();
    await page.locator("#btn-skip-intro").click();
    await page.locator("#briefing-box").click();
    return;
  }
  await enterPlay(page, scenario === "mage-first-day" ? "mage" : "knight");
  if (scenario === "third-night" || scenario === "third-dawn") await prepareNightUI(page, scenario);
  if (scenario === "no-materials") {
    await page.evaluate(() => {
      const s = window.CUBE.getState();
      s.player.x = s.bench.x;
      s.player.y = s.bench.y + 12;
      for (const k of Object.keys(s.inv)) s.inv[k] = 0;
      window.CUBE.interact();
    });
  }
  if (scenario === "details-open" && await page.locator("#play-details").count()) {
    if (await page.locator("#play-details").getAttribute("open") === null) await page.locator("#play-details summary").tap();
  }
  if (scenario === "pause") await page.locator("#btn-pause").click();
  if (scenario === "victory") await page.evaluate(() => {
    const s = window.CUBE.getState(); s.day = true; s.nights = 3; s.inv.heart = 1;
    s.player.x = s.altar.x; s.player.y = s.altar.y + 12; window.CUBE.interact();
  });
  if (scenario === "failure") {
    await page.evaluate(() => {
      const s = window.CUBE.getState(); s.day = false; s.nights = 2; s.player.hp = 1;
      s.enemies = [{ kind: "slime", x: s.player.x, y: s.player.y, vx: 0, vy: 0,
        hp: 100, maxHp: 100, spd: 0, dmg: 100, hit: 0, flash: 0, bob: 0 }];
    });
    await page.waitForSelector("#overlay:not(.hidden)");
  }
}

export async function inspect(page) {
  return page.evaluate(() => {
    const ids = ["game", "wave-banner", "notice-feed", "toast", "prompt", "build-banner", "guide", "play-details"];
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const rects = Object.fromEntries(ids.filter((id) => document.getElementById(id))
      .map((id) => [id, rect(document.getElementById(id))]));
    const buttons = [...document.querySelectorAll("#touch-controls button")].map((el) => ({
      label: el.textContent.trim(), ...rect(el),
      touch_action: getComputedStyle(el).touchAction,
      hit_target: document.elementFromPoint(el.getBoundingClientRect().x + el.getBoundingClientRect().width / 2,
        el.getBoundingClientRect().y + el.getBoundingClientRect().height / 2)?.closest("button") === el,
    }));
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      scroll: { x: scrollX, y: scrollY }, rects, buttons,
      canvas_backing: { width: document.getElementById("game").width, height: document.getElementById("game").height },
      notice_text: ["toast", "prompt", "build-banner", "wave-banner"].map((id) => ({
        id, text: document.getElementById(id).textContent, hidden: document.getElementById(id).classList.contains("hidden"),
      })),
      details_open: document.getElementById("play-details")?.open,
      guide_title: document.getElementById("guide-title").textContent,
    };
  });
}

export function assertFirstScreen(m, touch) {
  assert.equal(m.document.width, m.viewport.width, "no horizontal document overflow");
  const c = m.rects.game;
  assert.ok(Math.abs(c.width / c.height - 5 / 3) < 0.02, "canvas must keep the actual aim-coordinate aspect ratio");
  if (touch) {
    for (const r of [c, ...m.buttons]) {
      assert.ok(r.x >= 0 && r.y >= 0 && r.right <= m.viewport.width + 0.5
        && r.bottom <= m.viewport.height + 0.5, "canvas and all core controls must be inside the actual first viewport");
    }
    for (const b of m.buttons) {
      assert.ok(b.width >= 44 && b.height >= 44, `${b.label}: minimum 44px touch target`);
      assert.ok(b.hit_target, `${b.label}: must not be covered`);
    }
  }
  const boxes = ["game", "notice-feed", "wave-banner", "guide"].map((id) => m.rects[id]).filter((r) => r?.width && r?.height);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    assert.ok(!(a.x < b.right - 0.5 && a.right > b.x + 0.5 && a.y < b.bottom - 0.5 && a.bottom > b.y + 0.5),
      "canvas, guide, wave and bounded feedback feed must not overlap");
  }
}

export async function testCoreLayout(browser, origin) {
  for (const v of viewports) {
    const context = await browser.newContext({
      viewport: { width: v.width, height: v.height }, isMobile: v.touch, hasTouch: v.touch,
    });
    try {
      const page = await context.newPage();
      for (const scenario of coreScenarios) {
        await prepare(page, origin, scenario);
        assertFirstScreen(await inspect(page), v.touch);
      }
      await prepare(page, origin, "briefing");
      if (v.touch) {
        const skip = await page.locator("#btn-skip-brief").boundingBox();
        assert.ok(skip.y >= 0 && skip.y + skip.height <= v.height, "briefing skip must stay inside the viewport");
      }
      await page.locator("#btn-skip-brief").click();
      if (!v.touch) {
        const summary = page.locator("#play-details summary");
        await summary.focus();
        await page.keyboard.press("Space");
        await page.waitForFunction(() => !document.getElementById("play-details").open);
        await page.keyboard.press("Enter");
        await page.waitForFunction(() => document.getElementById("play-details").open);
      }
      if (v.touch) {
        await prepare(page, origin, "first-day");
        const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
        for (let i = 0; i < 3; i++) {
          await page.locator("#touch-interact").tap();
          await page.locator("#touch-skill").tap();
        }
        assert.deepEqual(await page.evaluate(() => ({ x: scrollX, y: scrollY })), scroll, "native taps must not scroll the page");
        await page.locator("#play-details summary").tap();
        await page.locator("#guide-body").waitFor({ state: "visible" });
        await page.locator('.item[data-build="fence"]').tap();
        await page.waitForFunction(() => !document.getElementById("play-details").open);
        assertFirstScreen(await inspect(page), true);
      }
    } finally { await context.close(); }
  }
  console.log("CORE_LAYOUT_OK four viewports; daytime/nighttime notices, knight/mage core targets in first viewport, tutorial/backpack access, native taps do not scroll");
}

const hintBaseline = "4cf83fdb7b90e38fb7d7a2855dbd9206bb7a9076";
const hintOut = join(ROOT, "evidence", "ui-review-2026-11-06", "device-hints");
const hintModes = [
  { width: 320, height: 568, touch: true, layoutTouch: true, capture: true },
  { width: 390, height: 844, touch: true, layoutTouch: true, capture: true },
  { width: 1280, height: 800, touch: false, layoutTouch: false, capture: true },
  { width: 844, height: 390, touch: true, layoutTouch: true, capture: true },
  { width: 320, height: 568, touch: false, layoutTouch: true, capture: false },
  { width: 1280, height: 800, touch: true, layoutTouch: true, capture: false, verifyLayout: true },
];
const hintCases = ["fence", "torch", "plot", "repair", "cancel", "tree", "gold", "stone",
  "crop", "farm", "dismantle", "bench", "altar", "combat"];
const hintComparisons = ["fence", "torch", "plot", "repair", "cancel"];

export async function prepareHint(page, origin, name, mode, before) {
  await page.goto(origin);
  await enterPlay(page);
  await page.evaluate((name) => {
    const s = window.CUBE.getState();
    s.player.x = 30 * 16 + 8; s.player.y = 25 * 16 + 8;
    s.player.dir = 3; s.player.vx = s.player.vy = 0;
    for (let y = 23; y <= 27; y++) for (let x = 28; x <= 32; x++) s.tiles[y * 48 + x] = 1;
    Object.assign(s.inv, { wood: 10, stone: 10 });
    s.flags.chopped = true;
    const types = { repair: 12, tree: 6, gold: 5, stone: 4, crop: 8, farm: 7, dismantle: 12 };
    if (types[name]) s.tiles[24 * 48 + 30] = types[name];
    if (name === "repair" || name === "dismantle") s.fenceHp.set("30,24", 20);
    if (name === "repair") s.inv.wood = 0;
    if (name === "crop") s.crops.set("30,24", { stage: 2, grow: 0 });
    if (name === "bench") { s.player.x = s.bench.x; s.player.y = s.bench.y + 12; }
    if (name === "altar") {
      s.player.x = s.altar.x; s.player.y = s.altar.y + 12; s.nights = 3; s.day = true; s.inv.heart = 1;
    }
    if (name === "combat") {
      s.day = false; s.nights = 1; s.cycle = 0; s.wave = 1; s.wavesTotal = 2; s.toSpawn = 0;
      s.enemies = [{ kind: "slime", x: s.player.x + 16, y: s.player.y, vx: 0, vy: 0,
        hp: 100, maxHp: 100, spd: 0, dmg: 0, hit: 0, flash: 0, bob: 0 }];
    }
  }, name);
  const click = async (selector) => mode.touch ? page.locator(selector).tap() : page.locator(selector).click();
  if (hintComparisons.includes(name)) {
    if (!await page.locator("#play-details").evaluate((el) => el.open)) await click("#play-details summary");
    await click(`.item[data-build="${["repair", "cancel"].includes(name) ? "fence" : name}"]`);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (name === "cancel") {
      if (mode.layoutTouch) {
        await click("#play-details summary");
        await click('.item[data-build="fence"]');
      } else await page.keyboard.press("Digit0");
      await page.waitForFunction(() => window.CUBE.getState().build === null);
      assert.ok(await page.locator("#build-banner").evaluate((el) => el.classList.contains("hidden")));
      if (!before) assert.equal(await page.locator("#toast").innerText(), "已取消建造。");
    }
  }
  if (!mode.touch) {
    const point = await page.evaluate(() => {
      const cam = window.CUBE.cam(), r = document.getElementById("game").getBoundingClientRect();
      return { x: r.x + (30 * 16 + 8 - cam.x) * r.width / 320,
        y: r.y + (24 * 16 + 8 - cam.y) * r.height / 192 };
    });
    if (!["bench", "altar"].includes(name)) await page.mouse.move(point.x, point.y);
  }
  const touch = mode.layoutTouch;
  const hold = touch ? "按住「采集/攻击」" : "按住左键";
  const interact = touch ? "点「交互 E」" : "按 E";
  const expected = {
    fence: `${touch ? "点地图空地" : "左键点空地"}放下栅栏`,
    torch: `${touch ? "点地图空地" : "左键点空地"}放下火把`,
    plot: `${touch ? "点地图空地" : "左键点空地"}开田`,
    repair: `${touch ? "点坏墙" : "左键"}修理栅栏（1木）`,
    tree: touch ? `${hold}砍树` : "空格或按住左键砍树",
    gold: `${hold}挖金矿`, stone: `${hold}挖石头`, crop: `${hold}收麦`,
    farm: touch ? `${interact}播种（要有种子）` : "按 E 或左键播种（要有种子）",
    dismantle: touch ? "面朝栅栏，按住「采集/攻击」拆除" : "空格拆除栅栏",
    bench: `${interact}查看还差哪些材料`, altar: `${interact}献上方块之心`,
    combat: touch ? "按住「采集/攻击」 · 点「技能 Q」 · 选栏再点坏墙修理"
      : "左键攻击 · Q 技能 · 按 1 后点坏墙修理",
  }[name];
  if (!before && expected) await page.waitForFunction((text) => document.getElementById("prompt").textContent === text, expected);
  else await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const metrics = await inspect(page);
  const media = await page.evaluate(() => ({
    touchLayout: matchMedia("(any-pointer: coarse), (max-width: 760px)").matches,
    coarse: matchMedia("(any-pointer: coarse)").matches,
    narrow: matchMedia("(max-width: 760px)").matches,
    pointer_coarse: matchMedia("(pointer: coarse)").matches,
  }));
  assert.equal(media.touchLayout, mode.layoutTouch);
  assert.equal(media.touchLayout, media.coarse || media.narrow, "keep existing OR media rule");
  if (mode.capture || mode.verifyLayout) {
    assertFirstScreen(metrics, mode.layoutTouch);
    assert.deepEqual(metrics.scroll, { x: 0, y: 0 }, `${name} ${mode.width}x${mode.height}: native selection/cancellation must not scroll`);
  }
  if (!before && ["fence", "torch", "plot"].includes(name)) {
    const toast = metrics.notice_text.find((r) => r.id === "toast").text;
    assert.ok(toast.includes(mode.layoutTouch ? `再点背包「${{ fence: "栏", torch: "火", plot: "田" }[name]}」取消` : "按 0 取消"));
    assert.equal(toast.includes("坏墙"), name === "fence", "torch/plot must not promise fence repair");
    assert.ok(!toast.includes("拆除"), "selection toast must not imply tap-to-dismantle");
    if (mode.capture || mode.verifyLayout) {
      const r = metrics.rects;
      assert.ok(r.toast.bottom <= r["notice-feed"].bottom + 0.5, "selection instructions must fit bounded feedback");
      assert.ok(r.prompt.bottom <= r["notice-feed"].bottom + 0.5, "live placement prompt must also be fully visible");
    }
  }
  return { metrics, media };
}

export async function testDeviceHints(browser, origin, capture = false) {
  const screenshots = [], checks = [];
  let previous;
  if (capture) {
    try { previous = JSON.parse(await readFile(join(hintOut, "screenshots.json"), "utf8")); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const files = ["index.html", "style.css", "game.js"];
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT }).toString().trim();
  const dirty = !!execFileSync("git", ["status", "--porcelain", "--", ...files], { cwd: ROOT }).toString().trim();
  for (const version of capture ? ["before", "after"] : ["after"]) {
    const buffers = version === "before"
      ? files.map((f) => execFileSync("git", ["show", `${hintBaseline}:${f}`], { cwd: ROOT }))
      : await Promise.all(files.map((f) => readFile(join(ROOT, f))));
    const hash = createHash("sha256").update(Buffer.concat(buffers)).digest("hex");
    for (const mode of hintModes.filter((m) => version !== "before" || m.capture)) {
      const viewport = { width: mode.width, height: mode.height };
      const context = await browser.newContext({ viewport, hasTouch: mode.touch, isMobile: mode.touch, deviceScaleFactor: 1 });
      try {
        const page = await context.newPage(), errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        if (version === "before") {
          await page.route(origin, (r) => r.fulfill({ body: buffers[0], contentType: "text/html" }));
          for (let i = 0; i < files.length; i++) await page.route(`**/${files[i]}`, (r) => r.fulfill({
            body: buffers[i], contentType: i === 0 ? "text/html" : i === 1 ? "text/css" : "text/javascript",
          }));
        }
        for (const name of hintCases.filter((n) => version !== "before" || hintComparisons.includes(n))) {
          const cached = version === "before" && previous?.screenshots.find((s) => s.state === `${name} / before`
            && s.viewport.width === mode.width && s.viewport.height === mode.height && s.build.source_sha256 === hash);
          if (cached) {
            screenshots.push(cached);
            checks.push({ screen_id: name, version, viewport, input: cached.input, media: cached.media,
              scroll: cached.metrics.scroll, layout_scope: "reused unchanged baseline PNG/metadata",
              prompt: cached.metrics.notice_text.find((r) => r.id === "prompt").text });
            continue;
          }
          const result = await prepareHint(page, origin, name, mode, version === "before");
          checks.push({ screen_id: name, version, viewport, input: mode.touch ? "native touch" : "mouse/keyboard",
            media: result.media, scroll: result.metrics.scroll,
            layout_scope: mode.capture || mode.verifyLayout ? "first viewport and native action geometry" : "media/input wording only; no first-screen assertion",
            prompt: result.metrics.notice_text.find((r) => r.id === "prompt").text });
          if (capture && mode.capture) {
            await page.evaluate(() => { window.CUBE.getState().paused = true; });
            const filename = `${name}--${mode.width}x${mode.height}--${version}--${hash.slice(0, 8)}.png`;
            await mkdir(join(hintOut, "images"), { recursive: true });
            await page.screenshot({ path: join(hintOut, "images", filename), fullPage: false });
            screenshots.push({
              screen_id: name, state: `${name} / ${version}`, viewport, language: "zh-CN",
              build: { sha: version === "before" ? hintBaseline : sha, dirty: version === "after" && dirty, source_sha256: hash },
              source: "fixture / isolated context, normal class entry and native selection/cancel inputs",
              platform: "Web / WebKit", ui_scale: "100%", device_scale_factor: 1, full_page: false,
              input: mode.touch ? "native touch" : "mouse/keyboard", media: result.media,
              relative_image_path: `images/${filename}`, issue_ids: ["UI-009"], status: "已截",
              visual_review: "待协调人逐图复看", captured_at: new Date().toISOString(), metrics: result.metrics,
              repro_steps: [
                `隔离上下文；${version === "before" ? "内存route提供4cf83fd原HTML/CSS/JS，不覆盖工作区" : "当前源码"}；不接触用户存档`,
                `正常选择骑士并跳过开场/预演；prepareHint("${name}")明确注入地形/库存/角色位置`,
                "一般夹具：玩家(30,25)朝北、(28..32,23..27)草地、木石10；目标(30,24)按场景设资源/田/墙；坏墙HP20且修墙场景木0",
                "工作台/祭坛场景改为设施南12px；祭坛夹具为三夜后白天且心1；夜战为静止0伤害近怪，不代表自然通关",
                `${mode.touch ? "原生触屏" : "真实鼠标/键盘"}选背包项；取消用${mode.layoutTouch ? "再点同一背包项" : "键盘0"}；不直接调用建造/取消API`,
                "目标由朝向或桌面鼠标悬停确定；只在截图时冻结模拟；真实首屏原图，100%缩放，不拼接",
              ],
            });
          }
        }
        assert.deepEqual(errors, [], "no page exceptions");
      } finally { await context.close(); }
    }
  }
  if (capture) {
    const history = [...new Map([...(previous?.history || previous?.screenshots || []), ...screenshots]
      .map((s) => [s.relative_image_path, s])).values()];
    await writeFile(join(hintOut, "screenshots.json"), JSON.stringify({ screenshots, history, visual_review: "待协调人实际看图" }, null, 2) + "\n");
    await writeFile(join(hintOut, "validation.json"), JSON.stringify({ baseline: hintBaseline, checks,
      after_cases: checks.filter((c) => c.version === "after").length,
      first_viewport_cases: checks.filter((c) => c.version === "after" && !c.layout_scope.startsWith("media")).length,
      media_only_cases: checks.filter((c) => c.version === "after" && c.layout_scope.startsWith("media")).length }, null, 2) + "\n");
    const rows = hintComparisons.flatMap((name) => hintModes.filter((m) => m.capture).map((m) => {
      const image = (v) => screenshots.find((s) => s.state === `${name} / ${v}` && s.viewport.width === m.width).relative_image_path;
      return `| ${name} | ${m.width}×${m.height} | [原图](${image("before")}) | [原图](${image("after")}) |`;
    }));
    await writeFile(join(hintOut, "INDEX.md"), [
      "# UI-009 设备相符操作反馈", "",
      "独立片：前图4cf83fd，后图实际源码SHA/dirty/hash逐项记录。保留旧基线、材料缺口及自然三夜证据。",
      "40张建设/修墙/取消同状态前后原图；另36张受影响采集/播种/交互/夜战后图。四视口均为真实首屏，不是全页缩图。",
      "touchLayout沿用(any-pointer: coarse) OR (max-width:760px)，不是最后输入设备检测。另对320鼠标与1280触屏仅验证媒体规则/提示，不追加图片或作边界首屏布局结论；实际scroll见validation。",
      "触控用地图点击、背包同项取消、交互/技能按钮与面朝目标按住采集/攻击；桌面用鼠标/键盘。火把/田不再误称可修墙；取消仅增加确认文案，无玩法数值改动。",
      "所有状态是隔离fixture，源码/库存/目标/输入/真实画布见screenshots.json。不动用户存档，仅截图时冻结模拟。",
      "", "| 状态 | 视口 | 前原图 | 后原图 |", "|---|---|---|---|", ...rows,
      "", "## 其他受影响后图", "",
      ...screenshots.filter((s) => s.state.endsWith("/ after") && !hintComparisons.includes(s.screen_id))
        .map((s) => `- ${s.screen_id} ${s.viewport.width}×${s.viewport.height}：[原图](${s.relative_image_path})`),
      "", "## 检查与限制", "",
      "- [逐图元数据](screenshots.json) · [84个后版本设备/提示场景](validation.json) · [实际检查与独立审查记录](checks.log)。",
      "- 原输入逻辑未改；仅取消选择时增加「已取消建造」反馈。既有触屏/鼠标选项及取消入口有真实输入断言。",
      "- 旧01f批次56主视口/28媒体边界及原scrollY160限制按原记录保留。宽屏布局维护后新增该边界首屏断言，后续执行的实际检查范围以validation的layout_scope与计数为准，不改写旧批次结论。",
      "- 自查320中间版发现选栏确认句过长，重复放置提示底边受限；已缩短确认并增加确认/放置两条都完整可见的断言。旧版本前图复用，中间版原图及元数据保留history，不冒称已获协调人批准。",
      "- 只补本片受影响状态，不重拍开始/暂停/结算等未变界面，不重跑自然三夜/平衡验证。受控夜战/祭坛不代表自然通关。",
      "- 浏览器触控模拟不是实体手机；截图未获本片协调人视觉批准，不以旧材料缺口局部批准代替。",
      "- 无Pages/腾讯云部署；原PR保持未合并。", "",
    ].join("\n"));
  }
  console.log(`DEVICE_HINTS_OK ${checks.filter((c) => c.version === "after").length} cases; ${screenshots.length} actual-viewport PNGs`);
}

const wideBaseline = "01f5c71835d6e78edeb53ffe8fa01749fd3afd42";
const wideOut = join(ROOT, "evidence", "ui-review-2026-11-06", "wide-touch-layout");
const wideSteps = ["first-day", "selected", "details-open", "cancelled", "third-night"];

export async function testWideTouchLayout(browser, origin, { capture = false, before = false } = {}) {
  const files = ["index.html", "style.css", "game.js"];
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT }).toString().trim();
  const dirty = !!execFileSync("git", ["status", "--porcelain", "--", ...files], { cwd: ROOT }).toString().trim();
  if (before) {
    assert.equal(sha, wideBaseline, "before evidence must use the actual original working product");
    assert.equal(dirty, false, "do not label a modified product as the baseline");
  }
  const hash = createHash("sha256").update(Buffer.concat(await Promise.all(files.map((f) => readFile(join(ROOT, f))))))
    .digest("hex");
  let previous, previousValidation;
  if (capture) {
    try { previous = JSON.parse(await readFile(join(wideOut, "screenshots.json"), "utf8")); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    try { previousValidation = JSON.parse(await readFile(join(wideOut, "validation.json"), "utf8")); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const version = before ? "before" : "after";
  const checks = [], screenshots = (previous?.screenshots || []).filter((s) => !s.state.endsWith(`/ ${version}`));
  const modes = [
    { width: 1280, height: 800, touch: true, wide: true },
    ...viewports.map((v) => ({ ...v, wide: false })),
    ...(!before ? [
      { width: 981, height: 501, touch: true, wide: true, steps: ["selected"], probe: true },
      { width: 1920, height: 1080, touch: true, wide: true, steps: ["selected"], probe: true },
    ] : []),
  ];
  for (const mode of modes) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, isMobile: mode.touch, hasTouch: mode.touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const step of mode.steps || (mode.wide ? wideSteps : ["selected"])) {
        let metrics;
        if (["selected", "cancelled"].includes(step)) {
          metrics = (await prepareHint(page, origin, step === "selected" ? "fence" : "cancel",
            { ...mode, layoutTouch: mode.touch, capture: false }, true)).metrics;
        } else {
          await prepare(page, origin, step === "third-night" ? "third-night" : "first-day");
          if (step === "details-open") {
            await page.locator("#play-details summary").tap();
            await page.waitForFunction(() => document.getElementById("play-details").open);
          }
          metrics = await inspect(page);
        }
        const media = await page.evaluate(() => ({
          coarse: matchMedia("(any-pointer: coarse)").matches,
          narrow: matchMedia("(max-width: 760px)").matches,
          touchLayout: matchMedia("(any-pointer: coarse), (max-width: 760px)").matches,
        }));
        if (before && mode.wide && step === "first-day") {
          assert.ok(metrics.buttons.some((b) => b.bottom > mode.height), "baseline core controls must reproduce below-first-screen boundary");
        }
        if (before && mode.wide && step === "selected") {
          assert.ok(metrics.scroll.y > 0, "baseline native selection must reproduce page scroll");
          console.log(`WIDE_TOUCH_REPRODUCED ${JSON.stringify({ scroll: metrics.scroll, document: metrics.document,
            canvas: metrics.rects.game, controls_bottom: Math.max(...metrics.buttons.map((b) => b.bottom)) })}`);
        }
        if (!before && step !== "details-open") {
          assertFirstScreen(metrics, mode.touch);
          assert.deepEqual(metrics.scroll, { x: 0, y: 0 }, `${mode.width}x${mode.height} ${step}: native actions must not scroll`);
          if (mode.wide) assert.ok(metrics.document.height <= mode.height, "closed wide layout must fit the viewport");
        }
        const record = { screen_id: step, version, viewport, input: mode.touch ? "native touch" : "mouse/keyboard", media, metrics };
        if (!before && !mode.wide && previousValidation) {
          const baseline = previousValidation.before_checks.find((c) => c.screen_id === step
            && c.viewport.width === mode.width && c.viewport.height === mode.height && c.input === record.input);
          assert.ok(baseline, "unchanged-layout comparison requires baseline geometry");
          assert.deepEqual(metrics.rects.game, baseline.metrics.rects.game, "do not change the other viewport canvas");
          assert.deepEqual(metrics.buttons, baseline.metrics.buttons, "do not change other viewport core target geometry");
          record.unchanged_geometry = true;
        }
        if (!before && mode.wide && step === "selected") {
          console.log(`WIDE_TOUCH_FIXED ${JSON.stringify({ scroll: metrics.scroll, document: metrics.document,
            canvas: metrics.rects.game, controls_bottom: Math.max(...metrics.buttons.map((b) => b.bottom)),
            minimum_target: Math.min(...metrics.buttons.map((b) => Math.min(b.width, b.height))) })}`);
        }
        if (capture && !mode.probe && (mode.wide || !before)) {
          await page.evaluate(() => { window.CUBE.getState().paused = true; });
          const filename = `${step}--${mode.width}x${mode.height}--${mode.touch ? "touch" : "mouse"}--${version}--${hash.slice(0, 8)}.png`;
          await mkdir(join(wideOut, "images"), { recursive: true });
          await page.screenshot({ path: join(wideOut, "images", filename), fullPage: false });
          await page.evaluate(() => { window.CUBE.getState().paused = false; });
          screenshots.push({
            screen_id: step, state: `${step} / ${version}`, viewport, language: "zh-CN",
            build: { sha, dirty, source_sha256: hash }, source: ["first-day", "details-open"].includes(step) ? "normal" : "fixture",
            platform: "Web / WebKit", input: record.input, media, ui_scale: "100%", device_scale_factor: 1,
            full_page: false, relative_image_path: `images/${filename}`, issue_ids: ["UI-010"], status: "已截",
            visual_review: "待协调人实际逐图复看", captured_at: new Date().toISOString(), metrics,
            repro_steps: [
              "隔离浏览器上下文，原生触控/鼠标输入；不接触用户存档；实际工作区产品源码，SHA/dirty/hash如上",
              step === "first-day" || step === "details-open" ? "正常选择骑士，跳过开场和营地预演；无库存/玩法注入"
                : step === "third-night" ? "prepareNightUI第三夜fixture；既有真实HUD/波次/通知，但不代表自然三夜"
                : "prepareHint围营fixture：玩家(30,25)朝北，周边草地、木石10，既有库存其余项保留",
              step === "details-open" ? "原生点背包/教程详情；保留主动展开面板，未隐藏物品信息"
                : step === "selected" ? "原生点详情，再点栏；面板自动收起，不调用建造API"
                : step === "cancelled" ? "原生点栏选择；触控再点同项、桌面按0取消，不调用取消API" : "记录实际首屏",
              "不纠正实际页面scroll；仅截图瞬间停止模拟，不弹暂停面板；原图严格等于viewport，无缩放拼接",
            ],
          });
        }
        if (!before && mode.wide && step === "details-open") {
          assert.ok(await page.locator(".item[data-k]").count() >= 9, "preserve all inventory entries");
          assert.ok(await page.locator("#guide-body").innerText(), "preserve tutorial content");
          await page.locator("#play-details summary").tap();
          await page.waitForFunction(() => !document.getElementById("play-details").open);
          const manualClose = await inspect(page);
          assertFirstScreen(manualClose, true);
          assert.deepEqual(manualClose.scroll, { x: 0, y: 0 });
          record.after_manual_close = manualClose;
          await page.locator("#play-details summary").tap();
          await page.waitForFunction(() => document.getElementById("play-details").open);
          await page.locator('.item[data-build="fence"]').tap();
          await page.waitForFunction(() => !document.getElementById("play-details").open);
          const closed = await inspect(page);
          assertFirstScreen(closed, true);
          assert.deepEqual(closed.scroll, { x: 0, y: 0 });
          record.after_detail_selection = closed;
          console.log("WIDE_DETAILS_CLOSE_OK manual collapse + native fence selection return to first viewport without scroll");
        }
        if (!before && mode.wide && step === "selected") {
          const point = await page.evaluate(() => {
            const cam = window.CUBE.cam(), r = document.getElementById("game").getBoundingClientRect();
            return { x: r.x + (30 * 16 + 8 - cam.x) * r.width / 320,
              y: r.y + (24 * 16 + 8 - cam.y) * r.height / 192 };
          });
          await page.touchscreen.tap(point.x, point.y);
          await page.waitForFunction(() => window.CUBE.getState().tiles[24 * 48 + 30] === 12);
          await page.locator("#touch-interact").tap();
          await page.locator("#touch-skill").tap();
          await page.waitForFunction(() => window.CUBE.getState().player.skillCd > 0);
          const after = await inspect(page);
          assert.deepEqual(after.scroll, { x: 0, y: 0 });
          record.native_canvas_place_and_core_actions = true;
        }
        checks.push(record);
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  if (capture) {
    await mkdir(wideOut, { recursive: true });
    await writeFile(join(wideOut, "screenshots.json"), JSON.stringify({ screenshots, visual_review: "待协调人实际看图" }, null, 2) + "\n");
    await writeFile(join(wideOut, "validation.json"), JSON.stringify({
      baseline: wideBaseline, before_checks: before ? checks : previousValidation?.before_checks || [],
      after_checks: before ? previousValidation?.after_checks || [] : checks,
    }, null, 2) + "\n");
    const wideRows = wideSteps.map((step) => {
      const image = (v) => {
        const s = screenshots.find((s) => s.screen_id === step && s.viewport.width === 1280 && s.input === "native touch"
          && s.state.endsWith(`/ ${v}`));
        return s ? `[原图](${s.relative_image_path})` : "待截";
      };
      return `| ${step} | ${image("before")} | ${image("after")} |`;
    });
    await writeFile(join(wideOut, "INDEX.md"), [
      "# UI-010 宽屏粗指针核心首屏", "",
      "原01f5c71宽屏粗指针边界：正常首屏控件低于视口，原生选栏使页面滚动；先在未修改产品上真实截图/量矩形，不将其误称文案片引入。",
      "1280×800五状态前后10图，加320/390/1280鼠标/844横屏4张选栏抽样后图；仅补本片，不重拍旧76或全基线。",
      "实际touchLayout/输入、源码SHA/dirty/hash、scroll和画布/44px控件矩形逐项记录；Web/WebKit100%缩放DPR1真实首屏。",
      "", "| 宽屏触控状态 | 前原图 | 后原图 |", "|---|---|---|", ...wideRows,
      "", "## 未变布局抽样", "",
      ...screenshots.filter((s) => s.state.endsWith("/ after") && (s.viewport.width !== 1280 || s.input === "mouse/keyboard"))
        .map((s) => `- ${s.viewport.width}×${s.viewport.height} ${s.input}：[原图](${s.relative_image_path})`),
      "", "## 验证与限制", "",
      "- [逐图来源/实测](screenshots.json) · [前后矩形及实际输入](validation.json) · [检查/独立审查](checks.log)。",
      "- CSS仅分配宽屏粗指针空间，保留5:3真实画布和44px核心触点；无玩法/成本/输入判定改动。",
      "- 详情仍按需主动展开并可内部滚动，展开时覆盖部分主操作是既有面板行为；选择栏/关闭后回到核心首屏，不新增自动暂停。",
      "- 选栏/同项取消使用原生输入；缩放后实际点地图放栏、交互/技能有针对性验证，其他四视口与原矩形直接对比。",
      "- 普通首日/详情与注入建设/第三夜分开标识；不动用户存档，不重打自然三夜，不代表真机或视觉批准。",
      "- 使用独立子分支/堆叠PR保留原PR6，不因推原分支而主动取消它的CI；不合并、不部署Pages/腾讯云。", "",
    ].join("\n"));
  }
  console.log(`WIDE_TOUCH_${before ? "BASELINE" : "OK"} ${checks.length} measured cases; ${screenshots.length} recorded original PNGs`);
  return checks;
}

async function touchGestures(origin, gestureViewports = [{ width: 320, height: 568 }, { width: 390, height: 844 }], checkGather = false) {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of gestureViewports) {
      const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
      try {
        const page = await context.newPage();
        await prepare(page, origin, "first-day");
        await page.evaluate((checkGather) => {
          const s = window.CUBE.getState();
          s.player.x = 30 * 16 + 8; s.player.y = 25 * 16 + 8;
          for (let y = 23; y <= 28; y++) for (let x = 28; x <= 34; x++) s.tiles[y * 48 + x] = 1;
          if (checkGather) s.tiles[25 * 48 + 32] = 6;
        }, checkGather);
        const woodBefore = await page.evaluate(() => window.CUBE.getState().inv.wood);
        const session = await context.newCDPSession(page);
        const center = async (selector) => {
          const r = await page.locator(selector).boundingBox();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        };
        const start = await center('[data-hold="ArrowRight"]');
        const action = await center('[data-hold="Space"]');
        const x = await page.evaluate(() => window.CUBE.getState().player.x);
        const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
        await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: 1 }] });
        await page.waitForFunction((x) => window.CUBE.getState().player.x > x + 5, x);
        await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: 1 }, { ...action, id: 2 }] });
        await page.waitForFunction(() => document.querySelectorAll("#touch-controls .held").length === 2);
        if (checkGather) {
          await page.waitForFunction((before) => window.CUBE.getState().inv.wood > before, woodBefore);
          console.log(`WIDE_NATIVE_GATHER wood ${woodBefore}->${await page.evaluate(() => window.CUBE.getState().inv.wood)}; native movement + held harvest`);
        }
        for (const offset of [10, 30, 60]) await session.send("Input.dispatchTouchEvent", {
          type: "touchMove", touchPoints: [{ x: start.x, y: start.y - offset, id: 1 }, { x: action.x, y: action.y - offset, id: 2 }],
        });
        await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForFunction(() => !document.querySelector("#touch-controls .held"));
        assert.deepEqual(await page.evaluate(() => ({ x: scrollX, y: scrollY })), scroll, "real two-touch drag must not scroll");
        await page.waitForFunction(() => Math.abs(window.CUBE.getState().player.vx) < 0.1);
        const stopped = await page.evaluate(() => ({ x: window.CUBE.getState().player.x, time: window.CUBE.getState().time }));
        await page.waitForFunction((s) => window.CUBE.getState().time > s.time + 0.25, stopped);
        assert.ok(Math.abs(await page.evaluate(() => window.CUBE.getState().player.x) - stopped.x) < 0.1, "touch release must not stick");
        await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: 1 }] });
        await session.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
        await page.waitForFunction(() => !document.querySelector("#touch-controls .held"));
      } finally { await context.close(); }
    }
    console.log(`TOUCH_GESTURES_OK Chromium native two-touch hold/drag/end/cancel; ${gestureViewports.map((v) => `${v.width}x${v.height}`).join(" + ")} no document scroll or stuck movement`);
  } finally { await browser.close(); }
}

async function capture(browser, origin) {
  await mkdir(join(OUT, "images"), { recursive: true });
  let previous;
  try { previous = JSON.parse(await readFile(join(OUT, "screenshots.json"), "utf8")); }
  catch (e) { if (e.code !== "ENOENT") throw e; }
  const history = previous?.history || previous?.screenshots || [];
  const screenshots = [];
  const files = ["index.html", "style.css", "game.js"];
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const dirty = !!execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }).trim();
  for (const version of ["before", "after"]) {
    const buffers = await Promise.all(files.map((file) => version === "before"
      ? execFileSync("git", ["show", `${beforeSha}:${file}`], { cwd: ROOT }) : readFile(join(ROOT, file))));
    const hash = createHash("sha256").update(Buffer.concat(buffers)).digest("hex");
    for (const v of viewports) {
      const context = await browser.newContext({
        viewport: { width: v.width, height: v.height }, isMobile: v.touch, hasTouch: v.touch, deviceScaleFactor: 1, locale: "zh-CN",
      });
      try {
        const page = await context.newPage();
        if (version === "before") {
          // Both "/" and index.html must use the old DOM as well as old JS/CSS.
          await page.route(origin, (r) => r.fulfill({ body: buffers[0], contentType: "text/html" }));
          for (let i = 0; i < files.length; i++) await page.route(`**/${files[i]}`, (r) => r.fulfill({
            body: buffers[i], contentType: i === 0 ? "text/html" : i === 1 ? "text/css" : "text/javascript",
          }));
        }
        for (const scenario of scenarios) {
          for (const full_page of [false, ...(v.width === 320 && scenario === "third-night" || v.width === 390 && scenario === "third-dawn" ? [true] : [])]) {
            const old = history.find((s) => s.screen_id === scenario && s.version === version && s.full_page === full_page
              && s.viewport.width === v.width && s.viewport.height === v.height && s.build.source_sha256 === hash);
            if (old) { screenshots.push(old); continue; }
            await prepare(page, origin, scenario);
            await page.evaluate(() => { window.CUBE.getState().paused = true; window.scrollTo(0, 0); });
            const metrics = await inspect(page);
            const relative_image_path = `images/${scenario}--${v.width}x${v.height}--${version}--${full_page ? "full" : "viewport"}--${hash.slice(0, 8)}.png`;
            await page.screenshot({ path: join(OUT, ...relative_image_path.split("/")), fullPage: full_page });
            screenshots.push({
              screen_id: scenario, state: `${scenario} / ${version}`, version, viewport: { width: v.width, height: v.height },
              language: "zh-CN", build: { sha: version === "before" ? beforeSha : sha, dirty: version === "after" && dirty, source_sha256: hash },
              source: ["first-day", "mage-first-day", "details-open", "briefing", "pause"].includes(scenario) ? "normal" : "fixture",
              relative_image_path, issue_ids: ["UI-005", "UI-007"], status: "已截", visual_review: "待协调人实际复看",
              platform: "Web / WebKit", ui_scale: "100%", device_scale_factor: 1, full_page,
              captured_at: new Date().toISOString(), metrics,
              repro_steps: [
                `独立临时 browser context；${version === "before" ? "route提供9c06379的HTML/JS/CSS" : "当前产品HTML/JS/CSS"}；不切工作区，不读写用户存档`,
                `tests/layout-ui.mjs prepare("${scenario}")：正常选角并跳过开场/预演；${scenario === "mage-first-day" ? "法师" : "骑士"}`,
                scenario.startsWith("third-") ? `临时night-ui.prepareNightUI("${scenario}")：四面围营，第三夜/第三夜后天亮；保留多个提示压力状态`
                  : scenario === "no-materials" ? "临时夹具：工作台南12px，所有材料0，调用既有交互查看缺少材料"
                  : scenario === "details-open" ? "点击引导/背包详情入口（旧版无折叠入口，原引导及背包本来展开）"
                  : scenario === "briefing" ? "正常首次选角，跳过开场后点营地预演文字补全；不跳过预演"
                  : scenario === "pause" ? "正常首局点击暂停"
                  : scenario === "victory" ? "临时夹具：第三夜后白天、心1、玩家祭坛南12px，执行既有交付"
                  : scenario === "failure" ? "临时夹具：第二夜夜间玩家1血、静止近身怪伤害100，由既有战斗触发失败"
                  : "无玩法状态注入，正常首局HUD",
                `仅为截图暂停模拟，无暂停弹窗；页面scroll=0；${full_page ? "全页补充图，不是首屏" : "真实viewport首屏原图，不缩放、不拼接"}`,
              ],
            });
          }
        }
      } finally { await context.close(); }
    }
  }
  for (const s of screenshots) {
    s.repro_steps[1] = `tests/layout-ui.mjs prepare("${s.screen_id}")：正常选角；${s.screen_id === "briefing"
      ? "只跳过开场，不跳过营地预演" : "跳过开场和营地预演"}；${s.screen_id === "mage-first-day" ? "法师" : "骑士"}`;
    s.repro_steps[s.repro_steps.length - 1] = `仅为截图停止模拟；${s.screen_id === "pause"
      ? "保留正常玩家暂停弹窗" : "不额外打开暂停弹窗"}；页面scroll=0；${s.full_page
      ? "全页补充图，不是首屏" : "真实viewport首屏原图，不缩放、不拼接"}`;
  }
  await writeFile(join(OUT, "screenshots.json"), JSON.stringify({
    screenshots, history: [...new Map([...history, ...screenshots].map((s) => [s.relative_image_path, s])).values()],
    visual_review: "待协调人实际看图；不等于全局布局或自然三夜实玩通过",
  }, null, 2) + "\n");
  const lines = [
    "# 核心触控首屏与统一提示排版", "",
    "80张真实首屏图：10状态×4视口×前后版本；另4张明确标注的全页补图。PNG原图100%缩放、DPR1、中文 Web/WebKit；首屏尺寸严格等于viewport。",
    "前图9c06379，后图源码SHA/dirty/hash逐项记录。正常首局/法师/展开详情与注入夜战/清晨/缺材料分开标注；不动用户存档。",
    "修复：白天/夜间/桌面统一波次+限高可滚动反馈区；画布无提示浮层。手机核心触控和画布同屏；教程/背包在可展开面板，选建造后自动收起。所有核心按钮≥44px。",
    "旧基线与night-followup图片保持不动。当前批次待协调人逐图审查，不冒称视觉通过。", "",
    "| 状态 | 视口 | 修复前首屏 | 修复后首屏 |", "|---|---|---|---|",
    ...scenarios.flatMap((s) => viewports.map((v) => {
      const path = (version) => screenshots.find((r) => r.screen_id === s && r.version === version && !r.full_page
        && r.viewport.width === v.width && r.viewport.height === v.height).relative_image_path;
      return `| ${s} | ${v.width}×${v.height} | [原图](${path("before")}) | [原图](${path("after")}) |`;
    })),
    "", "## 全页补图（不能当首屏）", "",
    ...screenshots.filter((s) => s.full_page).map((s) => `- ${s.state} ${s.viewport.width}×${s.viewport.height}: [全页原图](${s.relative_image_path})`),
    "", "## 验证与限制", "",
    "- [验证记录与独立审查](validation.json)、[旧记录只读覆盖检查](baseline-coverage.log)、[源码及旧172/305未变证明](provenance.log)。",
    "- [适用检查日志](checks.log)、[触控手势日志](touch-gestures.log)。",
    "- 受控夜战/清晨不代表自然三夜通关；WebKit/Chromium触控模拟不替代iOS/Android真机、浏览器工具栏和安全区检查。",
    "- 详情面板主动展开时会覆盖部分主画面/控件，关闭或选择建造即可返回核心同屏区域；完整长提示需在反馈区上下滚动，波次独立固定可见。",
    "- 未合并或发布，无腾讯云/Pages/服务器变更。",
  ];
  await writeFile(join(OUT, "INDEX.md"), lines.join("\n") + "\n");
  console.log(`CORE_LAYOUT_EVIDENCE ${screenshots.length} current images: ${OUT}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve();
  if (process.argv.includes("--touch-gestures") || process.argv.includes("--wide-touch-gestures")) {
    try { await touchGestures(origin, process.argv.includes("--wide-touch-gestures") ? [{ width: 1280, height: 800 }] : undefined,
      process.argv.includes("--wide-touch-gestures")); }
    finally { await new Promise((r) => server.close(r)); }
  } else {
    const browser = await launch();
    try {
      if (process.argv.includes("--wide-touch")) {
        await testWideTouchLayout(browser, origin, { capture: process.argv.includes("--capture"), before: process.argv.includes("--before") });
      } else if (process.argv.includes("--device-hints")) {
        await testDeviceHints(browser, origin, process.argv.includes("--capture"));
      } else {
        await testCoreLayout(browser, origin);
        if (process.argv.includes("--capture")) await capture(browser, origin);
      }
    } finally {
      await browser.close();
      await new Promise((r) => server.close(r));
    }
  }
}
