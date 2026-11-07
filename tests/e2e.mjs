import { serve, launch, enterPlay } from "./helpers.mjs";
import { testNightUI } from "./night-ui.mjs";
import { testCoreLayout, testDeviceHints, testWideTouchLayout } from "./layout-ui.mjs";
import { testMaterialFeedback, testHeartDelivery } from "./material-feedback.mjs";
import { testCropFeedback } from "./crop-feedback.mjs";
import { testFarmerSkillFeedback } from "./farmer-skill-feedback.mjs";
import { testPlantingFeedback } from "./planting-feedback.mjs";
import { testAudioRecovery } from "./audio-recovery.mjs";
import { testManaFeedback } from "./mana-feedback.mjs";
import { testNightNoticeFold } from "./night-notice-fold.mjs";
import { testBuildSuccessFeedback } from "./build-success-feedback.mjs";
import { testMapPlacement } from "./map-placement.mjs";
import { testBuildGuidance } from "./build-guidance.mjs";
import { testBuildCombatFeedback } from "./first-dusk-feedback.mjs";
import { testAltarArrival } from "./altar-arrival.mjs";
import { testVictoryRestart } from "./victory-restart.mjs";
import { testTouchTitle, testFirstWoodToast } from "./touch-title.mjs";

const { server, origin } = await serve();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const logs = [];
page.on("pageerror", (e) => logs.push(e.message));

await page.goto(origin, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.removeItem("cube-epoch-seen"));
await page.locator('.class-card[data-class="knight"]').click();
await page.locator("#btn-start").click();
await page.waitForSelector("#screen-intro:not(.hidden)");
await page.waitForFunction(() => (document.getElementById("intro-text")?.innerText || "").includes("很久"));
const crawl = await page.locator("#intro-text").innerText();
if (!crawl.includes("很久")) throw new Error("intro crawl missing, got " + crawl);
await page.locator("#btn-skip-intro").click();
await page.waitForSelector("#briefing:not(.hidden)");
const briefTitle = await page.locator("#briefing-title").innerText();
if (!briefTitle.includes("保护")) throw new Error("briefing should start at camp, got " + briefTitle);
await page.locator("#btn-skip-brief").click();
await page.waitForSelector("#screen-game:not(.hidden)");
await page.waitForTimeout(200);

const firstAim = await page.evaluate(() => {
  const t = window.CUBE.currentTarget();
  const st = window.CUBE.getState();
  const tx = Math.floor(t.x / 16);
  const ty = Math.floor(t.y / 16);
  return { kind: t && t.kind, tile: st.tiles[ty * 48 + tx] };
});
if (firstAim.kind !== "tree") throw new Error("first target should be tree, got " + firstAim.kind);
if (firstAim.tile !== 6) throw new Error("gold frame should sit on a tree tile, got " + firstAim.tile);

const dayLen = await page.evaluate(() => window.CUBE.getState().dayLen);
if (dayLen < 70) throw new Error("first day should be longer, dayLen=" + dayLen);

const startWood = await page.evaluate(() => window.CUBE.getState().inv.wood);
if (startWood < 2) throw new Error("starter wood should be 2, got " + startWood);

const obj = await page.locator("#objective").innerText();
if (!obj.includes("树")) throw new Error("objective should mention tree, got " + obj);

await page.keyboard.press("Digit1");
await page.waitForTimeout(60);
await page.keyboard.press("1");
const sticky = await page.evaluate(() => window.CUBE.getState().build);
if (sticky !== "fence") throw new Error("key 1 must stay on fence, got " + sticky);

await page.evaluate(() => {
  const st = window.CUBE.getState();
  st.player.x = 40 * 16 + 8;
});
await page.waitForFunction(() => window.CUBE.cam().x >= 400);
const cam = await page.evaluate(() => window.CUBE.cam());
if (cam.x < 400) throw new Error("camera should follow player, cam.x=" + cam.x);
await page.evaluate(() => {
  window.CUBE.getState().player.x = 24 * 16 + 8;
});

const woodBefore = await page.evaluate(() => window.CUBE.getState().inv.wood);
await page.evaluate(() => {
  window.CUBE.getState().flags.gathered = false;
  window.CUBE.gather(25, 22);
});
// Pickup is simulation-driven; a slow headless frame must not race this assertion.
await page.waitForFunction((before) => {
  const st = window.CUBE.getState();
  return st.flags.gathered && st.inv.wood > before;
}, woodBefore, { timeout: 10000 });
const gathered = await page.evaluate(() => {
  const st = window.CUBE.getState();
  return { wood: st.inv.wood, gathered: st.flags.gathered };
});
if (!gathered.gathered) throw new Error("first wood pickup should set gathered");
if (gathered.wood <= woodBefore) throw new Error("gather should add wood, " + woodBefore + " -> " + gathered.wood);

await page.evaluate(() => {
  const st = window.CUBE.getState();
  st.flags.chopped = true;
  st.inv.wood = 8;
});
const gapAim = await page.evaluate(() => window.CUBE.currentTarget().kind);
if (gapAim !== "gap") throw new Error("after wood, target should be gap, got " + gapAim);

await page.evaluate(() => {
  window.CUBE.setBuild("fence");
  window.CUBE.place(23, 21);
});
await page.evaluate(() => {
  const st = window.CUBE.getState();
  st.fenceHp.set("23,21", 20);
  st.inv.wood = Math.max(2, st.inv.wood);
});
// The preceding harvest can still be in hitstop. Start this independent input
// scenario after it ends, then keep the button down until the action is processed.
await page.waitForFunction(() => window.CUBE.getState().hitstop <= 0);
await page.evaluate(() => {
  const canvas = document.getElementById("game");
  const scale = Number(canvas.dataset.scale || 3);
  const st = window.CUBE.getState();
  const p = st.player;
  const vw = 20 * 16;
  const vh = 12 * 16;
  const camx = Math.max(0, Math.min(p.x - vw / 2, 48 * 16 - vw));
  const camy = Math.max(0, Math.min(p.y - vh / 2, 36 * 16 - vh));
  const mx = (23 * 16 + 8 - camx) * scale;
  const my = (21 * 16 + 8 - camy) * scale;
  const r = canvas.getBoundingClientRect();
  const clientX = r.left + mx * (r.width / canvas.width);
  const clientY = r.top + my * (r.height / canvas.height);
  canvas.dispatchEvent(new MouseEvent("mousemove", { clientX, clientY, bubbles: true }));
  canvas.dispatchEvent(new MouseEvent("mousedown", { clientX, clientY, button: 0, bubbles: true }));
});
try {
  await page.waitForFunction(() => window.CUBE.getState().fenceHp.get("23,21") === 80);
} finally {
  await page.evaluate(() => window.dispatchEvent(new MouseEvent("mouseup", { button: 0, bubbles: true })));
}
const hp = await page.evaluate(() => window.CUBE.getState().fenceHp.get("23,21"));
if (hp !== 80) throw new Error("click repair should fill fence, hp=" + hp);

await page.evaluate(() => {
  const C = window.CUBE;
  const st = C.getState();
  st.inv.wood = 40;
  C.setBuild("fence");
  for (const [tx, ty] of [[22, 20], [21, 21], [23, 21], [22, 22]]) C.place(tx, ty);
});
const afterWall = await page.evaluate(() => window.CUBE.currentTarget().kind);
if (afterWall === "gap" || afterWall === "tree") {
  throw new Error("walled camp should not still aim at gap/tree, got " + afterWall);
}
const wallStart = await page.evaluate(() => {
  const st = window.CUBE.getState();
  st.day = false;
  st.nights = 1;
  st.wavesTotal = 2;
  st.wave = 1;
  st.toSpawn = 0;
  st.enemies = [{
    kind: "slime", x: 22 * 16 + 8, y: 18 * 16 + 8,
    vx: 0, vy: 0, hp: 32, maxHp: 32, spd: 40, dmg: 9, hit: 0, flash: 0, bob: 0,
  }];
  return st.time;
});
// Preserve the full defence observation window in simulation time, not just
// the first hit: a later bypass must still fail the camp-health assertion.
await page.waitForFunction((start) => {
  const st = window.CUBE.getState();
  return st.time - start >= 1.6;
}, wallStart, { timeout: 10000 });
const wall = await page.evaluate(() => {
  const st = window.CUBE.getState();
  return { camp: st.campHp, north: st.fenceHp.get("22,20") };
});
if (wall.camp < 99.5) throw new Error("walled camp should not take damage, " + wall.camp);
if (!(wall.north < 80)) throw new Error("north fence should take damage, " + wall.north);

const cubes = await page.evaluate(() => {
  const C = window.CUBE;
  const st = C.getState();
  st.day = false;
  st.nights = 3;
  st.wave = 2;
  st.enemies = [];
  for (let i = 0; i < 10; i++) C.spawnEnemy();
  return st.enemies.filter((e) => e.kind === "cube").length;
});
if (cubes < 8) throw new Error("night 3 wave 2 should be cubes, got " + cubes);

await page.evaluate(() => {
  const st = window.CUBE.getState();
  st.day = true;
  st.over = false;
  st.win = false;
  st.paused = false;
  st.enemies = [];
  st.nights = 2;
  st.inv.heart = 1;
  st.player.hp = st.player.maxHp;
  st.player.x = st.altar.x;
  st.player.y = st.altar.y + 12;
});
if (await page.evaluate(() => window.CUBE.canOffer())) {
  throw new Error("two nights should not allow offer");
}
await page.keyboard.press("KeyE");
await page.waitForTimeout(80);
if (await page.evaluate(() => window.CUBE.getState().win)) {
  throw new Error("offering at two nights should not win");
}

await page.evaluate(() => { window.CUBE.getState().nights = 3; });
if (!(await page.evaluate(() => window.CUBE.canOffer()))) {
  throw new Error("three nights should allow offer");
}
await page.keyboard.press("KeyE");
await page.waitForFunction(() => window.CUBE.getState().win);
if (!(await page.evaluate(() => window.CUBE.getState().win))) {
  throw new Error("three nights offer should win");
}

await page.reload({ waitUntil: "domcontentloaded" });
await page.locator('.class-card[data-class="knight"]').click();
await page.locator("#btn-start").click();
await page.waitForSelector("#screen-game:not(.hidden)");
const skipped = await page.evaluate(() => ({
  intro: document.getElementById("screen-intro").classList.contains("hidden"),
  brief: document.getElementById("briefing").classList.contains("hidden"),
}));
if (!skipped.intro) throw new Error("returning player should skip intro");
if (!skipped.brief) throw new Error("returning player should skip briefing");

// Exercise the real responsive page: native pointer holds/capture for movement,
// native touch taps for aiming/building and one-shot actions.
const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
});
try {
  const mobile = await mobileContext.newPage();
  mobile.on("pageerror", (e) => logs.push(e.message));
  await mobile.goto(origin, { waitUntil: "domcontentloaded" });
  await enterPlay(mobile);
  const hold = async (code) => {
    const button = mobile.locator(`#touch-controls [data-hold="${code}"]`);
    await button.scrollIntoViewIfNeeded();
    const r = await button.boundingBox();
    await mobile.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await mobile.mouse.down();
  };
  const release = async () => {
    // Release outside the button: pointer capture must still clear the hold.
    await mobile.mouse.move(1, 1);
    await mobile.mouse.up();
    await mobile.waitForFunction(() => !document.querySelector("#touch-controls .held"));
  };
  const tapTile = async (tx, ty) => {
    await mobile.locator("#game").scrollIntoViewIfNeeded();
    const point = await mobile.evaluate(({ tx, ty }) => {
      const r = document.getElementById("game").getBoundingClientRect();
      const cam = window.CUBE.cam();
      return {
        x: r.left + (tx * 16 + 8 - cam.x) / 320 * r.width,
        y: r.top + (ty * 16 + 8 - cam.y) / 192 * r.height,
      };
    }, { tx, ty });
    await mobile.touchscreen.tap(point.x, point.y);
  };
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await mobile.setViewportSize(viewport);
    const layout = await mobile.evaluate(() => {
      const canvas = document.getElementById("game").getBoundingClientRect();
      const guide = document.getElementById("guide").getBoundingClientRect();
      const controls = document.getElementById("touch-controls").getBoundingClientRect();
      const inv = document.getElementById("inv").getBoundingClientRect();
      const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        obscured: overlaps(guide, canvas) || overlaps(controls, canvas) || overlaps(controls, inv),
        distorted: Math.abs(canvas.width / canvas.height - 5 / 3) > 0.02,
        landscapeOffscreen: innerWidth > innerHeight && (canvas.bottom > innerHeight || controls.bottom > innerHeight),
      };
    });
    if (Object.values(layout).some(Boolean)) throw new Error(`mobile layout ${JSON.stringify(viewport)}: ${JSON.stringify(layout)}`);
  }
  await mobile.setViewportSize({ width: 390, height: 844 });
  if (!(await mobile.locator("#touch-controls").isVisible())) throw new Error("mobile controls missing");
  const mobileStart = await mobile.evaluate(() => window.CUBE.getState().player.x);
  await hold("ArrowRight");
  await mobile.waitForFunction((x) => window.CUBE.getState().player.x >= x + 10, mobileStart);
  await release();
  await hold("ArrowDown");
  await mobile.waitForFunction(() => window.CUBE.getState().player.dir === 0);
  // Two independent pointer IDs can hold movement and action together.
  await mobile.locator('[data-hold="Space"]').evaluate((button) => {
    button.addEventListener("pointerdown", () => {
      button.dataset.simultaneous = String(document.querySelectorAll("#touch-controls .held").length);
    }, { once: true });
  });
  await mobile.locator('[data-hold="Space"]').tap();
  if (await mobile.locator('[data-hold="Space"]').getAttribute("data-simultaneous") !== "2") {
    throw new Error("movement and action must accept independent simultaneous pointers");
  }
  await release();
  await hold("Space");
  try {
    await mobile.waitForFunction(() => {
      const st = window.CUBE.getState();
      return st.flags.chopped && st.flags.gathered && st.inv.wood > 2;
    });
  } finally { await release(); }

  await mobile.locator("#play-details summary").tap();
  await mobile.locator('.item[data-build="fence"]').tap();
  if (await mobile.locator("#play-details").getAttribute("open") !== null) throw new Error("build selection must return to the playfield");
  await tapTile(23, 21);
  await mobile.waitForFunction(() => window.CUBE.getState().fenceHp.get("23,21") === 80);
  await mobile.evaluate(() => { window.CUBE.getState().fenceHp.set("23,21", 20); });
  await tapTile(23, 21);
  await mobile.waitForFunction(() => window.CUBE.getState().fenceHp.get("23,21") === 80);
  await mobile.locator("#play-details summary").tap();
  await mobile.locator('.item[data-build="fence"]').tap();
  if (await mobile.evaluate(() => window.CUBE.getState().build) !== null) throw new Error("touch build toggle must cancel");

  await mobile.locator("#touch-skill").tap();
  if (!(await mobile.evaluate(() => window.CUBE.getState().player.skillCd > 0))) throw new Error("touch skill missing");
  await mobile.waitForFunction(() => window.CUBE.getState().player.dash <= 0);

  // Deterministic fixtures isolate input release, planting, combat and the win gate.
  await mobile.evaluate(() => {
    const st = window.CUBE.getState();
    st.player.x = 30 * 16 + 8;
    st.player.y = 25 * 16 + 8;
    st.player.vx = st.player.vy = 0;
    for (let y = 24; y <= 27; y++) {
      for (let x = 28; x <= 33; x++) st.tiles[y * 48 + x] = 1;
    }
  });
  for (const reason of ["pointercancel", "blur", "pause"]) {
    await mobile.locator('[data-hold="ArrowRight"]').evaluate((button) => {
      button.addEventListener("pointerdown", (e) => {
        button.dataset.pointerId = String(e.pointerId);
      }, { once: true });
    });
    await hold("ArrowRight");
    await mobile.waitForFunction(() => window.CUBE.getState().player.vx > 0);
    if (reason === "pointercancel") {
      await mobile.locator('[data-hold="ArrowRight"]').evaluate((button) => {
        button.dispatchEvent(new PointerEvent("pointercancel", {
          pointerId: Number(button.dataset.pointerId), bubbles: true,
        }));
      });
    } else if (reason === "blur") {
      await mobile.evaluate(() => window.dispatchEvent(new Event("blur")));
    } else {
      // Avoid WebKit's compatibility mouse click retargeting while its mouse
      // is held. The ordinary touchscreen pause/resume path is covered below.
      await mobile.locator("#btn-pause").evaluate((button) => button.click());
    }
    await mobile.waitForFunction(() => !document.querySelector("#touch-controls .held"));
    await release();
    if (reason === "pause") await mobile.locator("#overlay-actions button").first().tap();
    await mobile.waitForFunction(() => Math.abs(window.CUBE.getState().player.vx) < 0.1);
    const stopped = await mobile.evaluate(() => {
      const st = window.CUBE.getState();
      return { x: st.player.x, time: st.time };
    });
    await mobile.waitForFunction(({ time }) => window.CUBE.getState().time >= time + 0.2, stopped);
    const drift = await mobile.evaluate(({ x }) => Math.abs(window.CUBE.getState().player.x - x), stopped);
    if (drift > 0.1) throw new Error("touch movement stuck after " + reason);
  }
  await mobile.locator("#btn-pause").tap();
  await mobile.waitForSelector("#overlay:not(.hidden)");
  await mobile.locator("#overlay-actions button").first().tap();
  await mobile.waitForFunction(() => !window.CUBE.getState().paused);
  await mobile.setViewportSize({ width: 320, height: 568 });
  await mobile.locator("#btn-pause").tap();
  await mobile.locator("#overlay-actions button").first().tap();
  await mobile.waitForFunction(() => !window.CUBE.getState().paused);
  await mobile.setViewportSize({ width: 390, height: 844 });

  // A prior canvas aim must not skew a later facing-based interaction.
  await tapTile(30, 25);
  await mobile.evaluate(() => {
    const st = window.CUBE.getState();
    st.player.x = 30 * 16 + 8;
    st.player.y = 25 * 16 + 8;
    st.player.vx = st.player.vy = 0;
    st.tiles[26 * 48 + 30] = 7;
  });
  await hold("ArrowDown");
  await mobile.waitForFunction(() => window.CUBE.getState().player.dir === 0);
  await release();
  await mobile.locator("#touch-interact").tap();
  await mobile.waitForFunction(() => window.CUBE.getState().crops.has("30,26"));

  await mobile.evaluate(() => {
    const st = window.CUBE.getState();
    st.player.x = st.bench.x;
    st.player.y = st.bench.y + 12;
    st.player.vx = st.player.vy = 0;
    Object.assign(st.inv, { wood: 4, stone: 5, gold: 3, wheat: 3 });
  });
  await mobile.locator("#touch-interact").tap();
  await mobile.waitForFunction(() => window.CUBE.getState().inv.heart === 1);
  await mobile.evaluate(() => {
    const st = window.CUBE.getState();
    st.day = false;
    st.nights = 3;
    st.cycle = 0;
    st.player.x = 30 * 16 + 8;
    st.player.y = 25 * 16 + 8;
    st.player.dir = 2;
    st.player.atkCd = 0;
    st.enemies = [{
      kind: "slime", x: st.player.x + 16, y: st.player.y,
      vx: 0, vy: 0, hp: 1, maxHp: 1, spd: 0, dmg: 0, hit: 0, flash: 0, bob: 0,
    }];
  });
  const kills = await mobile.evaluate(() => window.CUBE.getState().kills);
  await hold("Space");
  try {
    await mobile.waitForFunction((before) => window.CUBE.getState().kills > before, kills);
  } finally { await release(); }
  await mobile.evaluate(() => {
    const st = window.CUBE.getState();
    st.player.x = st.altar.x;
    st.player.y = st.altar.y + 12;
    st.player.vx = st.player.vy = 0;
  });
  await mobile.locator("#touch-interact").tap();
  if (await mobile.evaluate(() => window.CUBE.getState().win)) throw new Error("touch cannot offer at night");
  await mobile.evaluate(() => { const st = window.CUBE.getState(); st.day = true; st.nights = 2; });
  await mobile.locator("#touch-interact").tap();
  if (await mobile.evaluate(() => window.CUBE.getState().win)) throw new Error("touch cannot offer before three nights");
  await mobile.evaluate(() => { window.CUBE.getState().nights = 3; });
  await mobile.locator("#touch-interact").tap();
  await mobile.waitForFunction(() => window.CUBE.getState().win);
  if (!(await mobile.locator("#overlay-title").innerText()).includes("已点亮")) throw new Error("touch win screen missing");
  console.log("MOBILE_OK movement + multitouch + gather + build/repair + release + plant + skill + combat + craft + offer gates");
} finally {
  await mobileContext.close();
}

const realLogs = logs.filter((m) => !/audio device/i.test(m));
if (realLogs.length) throw new Error("page errors: " + realLogs.join(" | "));
await testNightUI(browser, origin);
await testCoreLayout(browser, origin);
await testMaterialFeedback(browser, origin);
await testHeartDelivery(browser, origin);
await testCropFeedback(browser, origin);
await testFarmerSkillFeedback(browser, origin);
await testPlantingFeedback(browser, origin);
await testAudioRecovery(browser, origin);
await testManaFeedback(browser, origin);
await testNightNoticeFold(browser, origin);
await testBuildSuccessFeedback(browser, origin);
await testMapPlacement(browser, origin);
await testBuildGuidance(browser, origin);
await testBuildCombatFeedback(browser, origin);
await testAltarArrival(browser, origin);
await testVictoryRestart(browser, origin);
await testTouchTitle(browser, origin);
await testFirstWoodToast(browser, origin);
await testDeviceHints(browser, origin);
await testWideTouchLayout(browser, origin);
await browser.close();
server.close();
console.log("E2E_OK");
