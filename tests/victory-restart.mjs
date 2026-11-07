import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { ROOT, serve } from "./helpers.mjs";
import { inspect, assertFirstScreen } from "./layout-ui.mjs";

const baseline = "44aa6793a2d29471d80479cd71fb0c57a07036a0";
const out = join(ROOT, "evidence", "ui-review-2026-11-06", "victory-restart");

export async function testVictoryRestart(browser, origin, { before = false, capture = false } = {}) {
  const engine = browser.browserType().name(), version = before ? "before" : "after";
  const files = ["index.html", "style.css", "game.js"];
  const buffers = await Promise.all(files.map((f) => before
    ? execFileSync("git", ["show", `${baseline}:${f}`]) : readFile(join(ROOT, f))));
  const hash = createHash("sha256").update(Buffer.concat(buffers)).digest("hex");
  const build = { sha: before ? baseline : execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    dirty: !before && !!execFileSync("git", ["status", "--porcelain", "--", ...files], { encoding: "utf8" }).trim(),
    source_sha256: hash };
  const mf = join(out, "screenshots.json"), vf = join(out, "validation.json");
  const manifest = capture && existsSync(mf) ? JSON.parse(await readFile(mf, "utf8")) : { screenshots: [] };
  const records = [];
  for (const mode of [{ width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true },
    { width: 844, height: 390, touch: true }, { width: 1280, height: 800, touch: false }]) {
    const viewport = { width: mode.width, height: mode.height };
    const context = await browser.newContext({ viewport, hasTouch: mode.touch, isMobile: mode.touch, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage(), errors = [], inputs = [];
      page.on("pageerror", (e) => errors.push(e.message));
      if (before) await page.route("**/*", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const i = path === "/" ? 0 : files.findIndex((f) => path === "/" + f);
        if (i < 0) await route.continue();
        else await route.fulfill({ status: 200, body: buffers[i],
          contentType: ["text/html", "text/css", "application/javascript"][i] });
      });
      const activate = async (selector) => {
        inputs.push({ action: selector, input: mode.touch ? "native tap; engine may scroll title button into view" : "native click",
          at: new Date().toISOString() });
        await (mode.touch ? page.locator(selector).tap() : page.locator(selector).click());
      };
      const key = async (value, { reload = false } = {}) => {
        inputs.push({ action: value, input: "native keyboard", at: new Date().toISOString() });
        if (reload) await Promise.all([page.waitForEvent("domcontentloaded"), page.keyboard.press(value)]);
        else await page.keyboard.press(value);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      };
      const tabTo = async (selector) => {
        const count = await page.locator("button, summary, [tabindex]").count();
        for (let i = 0; i <= count; i++) {
          if (await page.evaluate((s) => document.activeElement?.matches(s), selector)) return;
          await key("Tab");
        }
        assert.fail(`native Tab did not reach ${selector}`);
      };
      const read = () => page.evaluate(() => {
        const s = CUBE.getState();
        return { title: !document.getElementById("screen-title").classList.contains("hidden"),
          overlay: !document.getElementById("overlay").classList.contains("hidden"),
          selected: document.querySelector(".class-card.selected")?.dataset.class || null,
          focus: document.activeElement?.id || document.activeElement?.dataset.class,
          startDisabled: document.getElementById("btn-start").disabled,
          seen: localStorage.getItem("cube-epoch-seen"), held: document.querySelectorAll("#touch-controls .held").length,
          scroll: { x: scrollX, y: scrollY },
          game: s ? { cls: s.cls, day: s.day, nights: s.nights, kills: s.kills, time: s.time,
            paused: s.paused, over: s.over, win: s.win, heart: s.inv.heart, wood: s.inv.wood,
            x: s.player.x, y: s.player.y, hp: s.player.hp, maxHp: s.player.maxHp, flags: { ...s.flags } } : null };
      });
      const shot = async (id) => {
        if (!capture || !mode.touch) return;
        const data = await read(), metrics = data.title ? null : await inspect(page);
        if (id === "first-day-controls") assertFirstScreen(metrics, true);
        const filename = `${id}--${viewport.width}x${viewport.height}--${version}--${hash.slice(0, 8)}.png`;
        await mkdir(join(out, "images"), { recursive: true });
        await page.screenshot({ path: join(out, "images", filename), fullPage: false });
        manifest.screenshots = manifest.screenshots.filter((r) => !(r.screen_id === id
          && r.version === version && r.viewport.width === viewport.width));
        manifest.screenshots.push({ screen_id: id, state: `${id} / ${version}`, version, viewport, language: "zh-CN",
          build, platform: `Web / ${engine}`, ui_scale: "100%", device_scale_factor: 1, full_page: false,
          source: "isolated normal UI entry, explicit victory boundary fixture, native replay/selection and fresh first day",
          relative_image_path: `images/${filename}`, issue_ids: ["UI-025"], status: "已截",
          visual_review: "待协调逐图审查", captured_at: new Date().toISOString(), data, metrics,
          repro_steps: ["隔离新上下文，正常选骑士/开始并跳过开场/预演",
            "明示胜利边界夹具：三夜后白天、心1、祭坛南12px、时间284、空敌；真实交互献出",
            "原生Tab到再玩一局，按Space；旧版被挡后用Enter作为实测绕行",
            "重载选角页，原生Tab到法师按Space；再Tab到开始按Space，旧版分别用Enter绕行",
            "验证新局无结算/旧按压、初始心0/夜0；真实移动/释放并按Space采树",
            before ? "内存响应44aa679原Git产品，不覆盖工作区" : "拍摄当前dirty源码；无时间加速/用户存档改动"] });
        await writeFile(mf, JSON.stringify(manifest, null, 2) + "\n");
      };
      const fixture = () => page.evaluate(() => {
        const s = CUBE.getState(); s.day = true; s.nights = 3; s.inv.heart = 1;
        s.time = 284; s.cycle = 0; s.enemies = []; s.player.x = s.altar.x; s.player.y = s.altar.y + 12;
        s.player.vx = s.player.vy = 0;
      });
      const fresh = async () => {
        await page.waitForSelector("#screen-game:not(.hidden)");
        const r = await read();
        assert.equal(r.overlay, false); assert.equal(r.held, 0);
        assert.equal(r.game.cls, "mage"); assert.equal(r.game.day, true);
        assert.equal(r.game.nights, 0); assert.equal(r.game.heart, 0); assert.equal(r.game.kills, 0);
        assert.equal(r.game.over, false); assert.equal(r.game.win, false); assert.equal(r.game.paused, false);
        assert.equal(r.game.flags.moved, false); assert.equal(r.game.flags.chopped, false);
        assert.equal(r.game.flags.crafted, false); assert.equal(r.game.flags.offered, false);
        assert.equal(r.game.hp, r.game.maxHp); assert.equal(r.seen, "1");
        assertFirstScreen(await inspect(page), mode.touch);
        return r;
      };
      await page.goto(origin);
      await activate('.class-card[data-class="knight"]'); await activate("#btn-start");
      await activate("#btn-skip-intro"); await activate("#btn-skip-brief");
      await page.waitForSelector("#screen-game:not(.hidden)");
      await fixture();
      await (mode.touch ? activate("#touch-interact") : key("e"));
      await page.waitForSelector("#overlay:not(.hidden)");
      const victory = await read();
      assert.equal(victory.game.win, true); assert.equal(victory.game.heart, 0);
      await tabTo("#overlay-actions button");
      await key("Space", { reload: !before });
      const replaySpace = await read();
      assert.equal(replaySpace.title, !before);
      await shot("replay-space");
      if (before) await key("Enter", { reload: true });
      await page.waitForSelector("#screen-title:not(.hidden)");
      const returned = await read();
      assert.equal(returned.overlay, false); assert.equal(returned.game, null);
      assert.equal(returned.selected, null); assert.equal(returned.startDisabled, true); assert.equal(returned.held, 0);
      await tabTo('.class-card[data-class="mage"]'); await key("Space");
      const roleSpace = await read();
      assert.equal(roleSpace.selected, before ? null : "mage");
      await shot("role-space");
      if (before) await key("Enter");
      await tabTo("#btn-start"); await key("Space");
      const startSpace = await read();
      assert.equal(startSpace.title, before);
      await shot("start-space");
      if (before) await key("Enter");
      const initial = await fresh();
      for (const [button, code, predicate] of [
        ['[data-hold="ArrowDown"]', "ArrowDown", () => CUBE.getState().player.y >= 358],
        ['[data-hold="ArrowRight"]', "ArrowRight", () => CUBE.getState().player.dir === 2],
      ]) {
        if (mode.touch && engine === "chromium") {
          const session = await context.newCDPSession(page), r = await page.locator(button).boundingBox();
          await session.send("Input.dispatchTouchEvent", { type: "touchStart",
            touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }] });
          try { await page.waitForFunction(predicate); }
          finally { await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await session.detach(); }
        } else {
          await page.keyboard.down(code);
          try { await page.waitForFunction(predicate); } finally { await page.keyboard.up(code); }
        }
        inputs.push({ action: code, input: mode.touch && engine === "chromium" ? "native touch hold/release" : "native keyboard down/up",
          at: new Date().toISOString() });
      }
      await page.keyboard.down("Space");
      try { await page.waitForFunction(() => CUBE.getState().inv.wood > 2); }
      finally { await page.keyboard.up("Space"); }
      inputs.push({ action: "gather", input: "native gameplay Space down/up (must not be swallowed by hidden title button)", at: new Date().toISOString() });
      const controlled = await read();
      assert.ok(controlled.game.wood > 2); assert.equal(controlled.held, 0);
      await page.waitForTimeout(200);
      const settled = await read();
      assert.ok(Math.hypot(settled.game.x - controlled.game.x, settled.game.y - controlled.game.y) < 0.3);
      await shot("first-day-controls");

      await fixture(); await page.keyboard.down("Space"); await key("e");
      await page.waitForSelector("#overlay:not(.hidden)");
      const heldVictory = await read();
      assert.equal(heldVictory.held, 0);
      await page.keyboard.up("Space");
      await activate("#overlay-actions button");
      await page.waitForSelector("#screen-title:not(.hidden)");
      await activate('.class-card[data-class="mage"]'); await activate("#btn-start");
      const touchRestart = await fresh();
      records.push({ viewport, victory, replaySpace, returned, roleSpace, startSpace, initial,
        controlled, settled, heldVictory, touchRestart, input_log: inputs });
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  if (capture) {
    const v = existsSync(vf) ? JSON.parse(await readFile(vf, "utf8")) : {};
    v[version] = records; await writeFile(vf, JSON.stringify(v, null, 2) + "\n");
  }
  console.log(`VICTORY_RESTART_OK ${engine} ${version}4 viewports: native replay/role/start Space, Enter fallback only before, fresh controls/gather/release, held-key victory reset and native tap/click restart`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, origin } = await serve(), browser = await chromium.launch({ headless: true });
  try { await testVictoryRestart(browser, origin, { before: process.argv.includes("--before"), capture: process.argv.includes("--capture") }); }
  finally { await browser.close(); await new Promise((r) => server.close(r)); }
}
