import { webkit } from "playwright-core";
import { serve, launch } from "../../../tests/helpers.mjs";
import { testFirstNightGuidance } from "../../../tests/first-night-guidance.mjs";

const originalLaunch = webkit.launch.bind(webkit);
webkit.launch = async (options) => {
  const browser = await originalLaunch(options), createContext = browser.newContext.bind(browser);
  browser.newContext = async (options) => {
    const context = await createContext(options);
    await context.addInitScript(() => {
      const record = (event) => {
        if (event.type !== "toggle" && event.code !== "Space") return;
        const s = window.CUBE?.getState();
        console.log("TOGGLE_SPACE_TRACE", JSON.stringify({ real_ms: performance.now(), type: event.type,
          code: event.code, width: innerWidth, target: event.target?.id || event.target?.tagName,
          focus: document.activeElement?.id, details: document.getElementById("play-details")?.open,
          time: s?.time, night: s?.nights, paused: s?.paused, wall: s?.tiles[22 * 48 + 22] }));
      };
      window.addEventListener("keydown", record);
      window.addEventListener("keyup", record);
      document.addEventListener("toggle", record, true);
    });
    context.on("page", (page) => page.on("console", (message) => {
      if (message.text().startsWith("TOGGLE_SPACE_TRACE")) console.log(message.text());
    }));
    return context;
  };
  return browser;
};
const { server, origin } = await serve();
const browser = await launch();
try {
  for (const night of [1, 2, 3, 4]) await testFirstNightGuidance(browser, origin, { night });
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
console.log("FIRST_NIGHT_TOGGLE_PROBE_OK original night1/2/3/4 assertions");
