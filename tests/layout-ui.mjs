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

async function inspect(page) {
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

function assertFirstScreen(m, touch) {
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

async function touchGestures(origin) {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
      try {
        const page = await context.newPage();
        await prepare(page, origin, "first-day");
        await page.evaluate(() => {
          const s = window.CUBE.getState();
          s.player.x = 30 * 16 + 8; s.player.y = 25 * 16 + 8;
          for (let y = 23; y <= 28; y++) for (let x = 28; x <= 34; x++) s.tiles[y * 48 + x] = 1;
        });
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
    console.log("TOUCH_GESTURES_OK Chromium native two-touch hold/drag/end/cancel; 320x568 + 390x844 no document scroll or stuck movement");
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
  if (process.argv.includes("--touch-gestures")) {
    try { await touchGestures(origin); }
    finally { await new Promise((r) => server.close(r)); }
  } else {
    const browser = await launch();
    try {
      await testCoreLayout(browser, origin);
      if (process.argv.includes("--capture")) await capture(browser, origin);
    } finally {
      await browser.close();
      await new Promise((r) => server.close(r));
    }
  }
}
