import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, serve, launch, enterPlay } from "./helpers.mjs";

const viewports = [
  { width: 1280, height: 800, touch: false },
  { width: 390, height: 844, touch: true },
  { width: 320, height: 568, touch: true },
  { width: 844, height: 390, touch: true },
];
const scenarios = ["third-night", "third-night-broken-wall", "third-dawn", "fourth-night"];
const beforeSha = "63420933af8a79ccdf25c5a2ff5008280334d632";
const OUT = join(ROOT, "evidence", "ui-review-2026-11-06", "night-followup");

async function prepare(page, scenario) {
  await page.evaluate((scenario) => {
    window.CUBE.start("knight");
    const s = window.CUBE.getState();
    s.flags.moved = s.flags.chopped = s.flags.gathered = true;
    s.inv.wood = 20;
    window.CUBE.setBuild("fence");
    for (const [x, y] of [[22, 20], [21, 21], [23, 21], [22, 22]]) window.CUBE.place(x, y);
    if (scenario === "third-night-broken-wall") {
      s.tiles[20 * 48 + 22] = 1;
      s.fenceHp.delete("22,20");
    }
    s.player.x = s.camp.x + 32;
    s.player.y = s.camp.y;
    s.nights = scenario === "fourth-night" ? 4 : 3;
    s.day = scenario === "third-dawn";
    s.wave = 2;
    s.wavesTotal = 3;
    s.toSpawn = 0;
    s.cycle = 10;
    s.enemies = s.day ? [] : [{
      kind: "slime", x: s.player.x + 16, y: s.player.y,
      vx: 0, vy: 0, hp: 100, maxHp: 100, spd: 0, dmg: 0, hit: 0, flash: 0, bob: 0,
    }];
    if (s.day) {
      s.inv.heart = 1;
      s.player.x = s.altar.x;
      s.player.y = s.altar.y + 12;
    }
  }, scenario);
  await page.waitForFunction(() => window.CUBE.getState().time > 0.1);
}

async function inspect(page) {
  return page.evaluate(() => {
    const ids = ["build-banner", "wave-banner", "prompt", "toast", "guide", "keys-hint", "game", "touch-controls", "inv"];
    const rects = Object.fromEntries(ids.map((id) => {
      const el = document.getElementById(id);
      const r = el.getBoundingClientRect();
      return [id, { x: r.x, y: r.y, width: r.width, height: r.height, visible: r.width > 0 && r.height > 0 }];
    }));
    return {
      title: document.getElementById("guide-title").textContent,
      nightDone: document.querySelector('[data-step="night"]').classList.contains("done"),
      currentStep: document.querySelector("#guide-steps .now")?.dataset.step,
      objective: document.getElementById("objective").textContent,
      overflow: document.documentElement.scrollWidth > innerWidth,
      layout_viewport: { width: innerWidth, height: innerHeight },
      canvas_backing: { width: document.getElementById("game").width, height: document.getElementById("game").height },
      rects,
    };
  });
}

function assertLayout(metrics) {
  assert.equal(metrics.overflow, false, "night HUD must not overflow horizontally");
  const visible = Object.entries(metrics.rects).filter(([id, r]) => r.visible && id !== "inv");
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const [a, r] = visible[i];
      const [b, s] = visible[j];
      const overlap = r.x < s.x + s.width - 0.5 && r.x + r.width > s.x + 0.5
        && r.y < s.y + s.height - 0.5 && r.y + r.height > s.y + 0.5;
      assert.equal(overlap, false, `${a} must not cover ${b}`);
    }
  }
}

export async function testNightUI(browser, origin) {
  for (const v of viewports) {
    const context = await browser.newContext({
      viewport: { width: v.width, height: v.height }, isMobile: v.touch, hasTouch: v.touch,
    });
    try {
      const page = await context.newPage();
      await page.goto(origin);
      await enterPlay(page);
      for (const scenario of scenarios) {
        await prepare(page, scenario);
        const metrics = await inspect(page);
        const dawn = scenario === "third-dawn";
        assert.equal(metrics.currentStep, dawn ? "offer" : "night", `${scenario}: current guide`);
        assert.equal(metrics.nightDone, dawn, `${scenario}: night completion`);
        assert.ok(metrics.objective.includes(dawn ? "祭坛" : "守住篝火"), `${scenario}: objective`);
        if (v.touch && !dawn) assertLayout(metrics);
      }
      await prepare(page, "third-night");
      await page.evaluate(() => {
        const s = window.CUBE.getState();
        s.enemies = [];
        s.cycle = s.nightLen - 0.1;
      });
      await page.waitForFunction(() => window.CUBE.getState().day);
      await page.waitForFunction(() => document.querySelector("#guide-steps .now")?.dataset.step === "offer");
      assert.equal((await inspect(page)).nightDone, true, "real dawn completes the guide's night step");
    } finally { await context.close(); }
  }
  console.log("NIGHT_UI_OK four viewports: third/fourth night, broken wall, real dawn transition, non-overlapping touch notices");
}

async function capture(browser, origin) {
  await mkdir(join(OUT, "images"), { recursive: true });
  let previous;
  try { previous = JSON.parse(await readFile(join(OUT, "screenshots.json"), "utf8")); }
  catch (e) { if (e.code !== "ENOENT") throw e; }
  const history = previous?.history || previous?.screenshots || [];
  const screenshots = [];
  const files = ["index.html", "style.css", "game.js"];
  const currentSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  for (const version of ["before", "after"]) {
    const buffers = await Promise.all(files.map((file) => version === "before"
      ? execFileSync("git", ["show", `${beforeSha}:${file}`], { cwd: ROOT })
      : readFile(join(ROOT, file))));
    const sourceHash = createHash("sha256").update(Buffer.concat(buffers)).digest("hex");
    for (const v of viewports) {
      const context = await browser.newContext({
        viewport: { width: v.width, height: v.height }, isMobile: v.touch,
        hasTouch: v.touch, deviceScaleFactor: 1, locale: "zh-CN",
      });
      try {
        const page = await context.newPage();
        if (version === "before") {
          for (let i = 0; i < files.length; i++) {
            await page.route(`**/${files[i]}`, (route) => route.fulfill({
              body: buffers[i], contentType: files[i].endsWith(".js") ? "text/javascript"
                : files[i].endsWith(".css") ? "text/css" : "text/html",
            }));
          }
        }
        await page.goto(origin);
        await enterPlay(page);
        for (const scenario of scenarios) {
          const old = history.find((s) => s.screen_id === scenario && s.state.endsWith(`/ ${version}`)
            && s.viewport.width === v.width && s.viewport.height === v.height && s.build.source_sha256 === sourceHash);
          if (old) { screenshots.push(old); continue; }
          await prepare(page, scenario);
          await page.evaluate(() => { window.CUBE.getState().paused = true; window.scrollTo(0, 0); });
          const metrics = await inspect(page);
          const relative_image_path = `images/${scenario}--${v.width}x${v.height}--${version}--${sourceHash.slice(0, 8)}.png`;
          await page.screenshot({ path: join(OUT, ...relative_image_path.split("/")), fullPage: true });
          screenshots.push({
            screen_id: scenario, state: `${scenario} / ${version}`, viewport: { width: v.width, height: v.height },
            language: "zh-CN", build: { sha: version === "before" ? beforeSha : currentSha,
              dirty: version === "after", source_sha256: sourceHash },
            source: "fixture", relative_image_path, issue_ids: ["UI-006", ...(v.touch ? ["UI-007"] : [])],
            status: "已截", visual_review: "待协调人复看", platform: "Web / WebKit",
            ui_scale: "100%", device_scale_factor: 1, full_page: true, captured_at: new Date().toISOString(),
            repro_steps: [
              `独立临时 context，${version === "before" ? "route提供6342093产品源码（不切工作区）" : "当前产品源码"}；正常骑士新局后使用 CUBE.start 临时夹具`,
              `tests/night-ui.mjs prepare("${scenario}")：完成移动/砍树；四面围营，broken-wall去北墙；玩家篝火东32px、静止零伤敌人在玩家东16px；夜数3（fourth=4）`,
              "保留栅栏选择与建造toast以检验多提示同时显示；third-dawn设白天/心1/玩家祭坛南12px；其他为夜间第2/3波",
              "运行超过0.1模拟秒后暂停模拟（无暂停弹窗）并回到页面顶部，截图全页原图；不改用户存档，不代表自然通关",
            ],
            ...metrics, game_viewport_css: metrics.rects.game,
          });
        }
      } finally { await context.close(); }
    }
  }
  await writeFile(join(OUT, "screenshots.json"), JSON.stringify({
    visual_review: "待协调人复看；自动断言与开发者看图不代替用户批准", screenshots,
    history: [...new Map([...history, ...screenshots].map((s) => [s.relative_image_path, s])).values()],
    limitations: ["fixture非自然三夜通关", "WebKit触屏模拟，非iOS/Android真机", "UI-005小屏仍需页面滚动"],
  }, null, 2) + "\n");
  const lines = [
    "# 夜战引导与提示整改：UI-006 / UI-007", "",
    "32张原图：4状态 × 4视口 × 前后两版本。中文 Web / WebKit，100%缩放，DPR=1；全页PNG未缩放，真实游戏画布尺寸在 screenshots.json。",
    "所有截图均为隔离的临时 fixture，非用户存档，非自然通关。前图6342093，后图的SHA/dirty和产品源码hash逐图记录。视觉状态：待协调人复看。",
    "修复：夜间优先守火、天亮后才完成第三夜引导；仅在夜间手机提示退出画布，按文档流逐条排列，不遮波次/角色/篝火。白天与桌面提示布局保持原样。",
    "旧172张基线/305原图及其索引保留不动。本轮受影响状态在此追加，未变化页面复用原基线；不声称旧图是新版本重拍。", "",
    "| 状态 | 视口 | 前图 | 后图 |", "|---|---|---|---|",
    ...scenarios.flatMap((s) => viewports.map((v) => {
      const image = (version) => screenshots.find((r) => r.screen_id === s && r.viewport.width === v.width
        && r.viewport.height === v.height && r.state.endsWith(`/ ${version}`)).relative_image_path;
      return `| ${s} | ${v.width}×${v.height} | [原图](${image("before")}) | [原图](${image("after")}) |`;
    })),
    "", "限制：小屏页面仍需滚动（UI-005）；桌面原有浮层布局本轮未重排；真机系统手势/安全区、自然全程通关未覆盖。无发布或服务器变更。",
  ];
  await writeFile(join(OUT, "INDEX.md"), lines.join("\n") + "\n");
  console.log(`NIGHT_UI_EVIDENCE ${OUT} (32 originals)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve();
  const browser = await launch();
  try {
    await testNightUI(browser, origin);
    if (process.argv.includes("--capture")) await capture(browser, origin);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
