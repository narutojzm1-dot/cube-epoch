import { webkit } from "playwright-core";
import { serve, launch } from "../../../tests/helpers.mjs";
import { testSeedlessCropGuidance } from "../../../tests/seedless-crop-guidance.mjs";

const originalLaunch = webkit.launch.bind(webkit);
webkit.launch = async (options) => {
  const browser = await originalLaunch(options), createContext = browser.newContext.bind(browser);
  browser.newContext = async (options) => {
    const context = await createContext(options);
    await context.addInitScript(() => {
      const record = (event) => {
        const s = window.CUBE?.getState();
        if (!s) return;
        console.log("CROP_INPUT_TRACE", JSON.stringify({ real_ms: performance.now(), type: event.type, code: event.code,
          width: innerWidth, focus: document.activeElement?.id, details: document.getElementById("play-details")?.open,
          time: s.time, paused: s.paused, over: s.over, player: { x: s.player.x, y: s.player.y, dir: s.player.dir, mine: s.player.mine },
          inv: { ...s.inv }, crops: [...s.crops], frontTile: s.tiles[(Math.floor(s.player.y / 16) - 1) * 48 + Math.floor(s.player.x / 16)] }));
      };
      window.addEventListener("keydown", record); window.addEventListener("keyup", record);
      document.addEventListener("toggle", record, true);
    });
    context.on("page", (page) => page.on("console", (message) => {
      if (message.text().startsWith("CROP_INPUT_TRACE")) console.log(message.text());
    }));
    return context;
  };
  return browser;
};
if (process.argv.includes("--full")) {
  await import("../../../tests/e2e.mjs");
} else {
  const { server, origin } = await serve();
  const browser = await launch();
  try { await testSeedlessCropGuidance(browser, origin); }
  finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
  console.log("CROP_INPUT_PROBE_OK original seedless assertions");
}
