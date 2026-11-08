import { webkit } from "playwright-core";
import { serve } from "../../../tests/helpers.mjs";
import { testFirstNightGuidance } from "../../../tests/first-night-guidance.mjs";

const instrument = (browser) => {
  const createContext = browser.newContext.bind(browser);
  browser.newContext = async (options) => {
  const context = await createContext(options);
  await context.addInitScript(() => {
    const record = (event) => {
      const s = window.CUBE?.getState();
      console.log("INPUT_TRACE", JSON.stringify({
        real_ms: performance.now(), type: event.type, code: event.code,
        target: event.target?.id || event.target?.tagName, focus: document.activeElement?.id,
        width: innerWidth, details: document.getElementById("play-details")?.open,
        time: s?.time, paused: s?.paused, wall: s?.tiles[22 * 48 + 22],
      }));
    };
    window.addEventListener("keydown", record);
    window.addEventListener("keyup", record);
    window.addEventListener("blur", record);
    document.addEventListener("toggle", record, true);
  });
  context.on("page", (page) => page.on("console", (message) => {
    if (message.text().startsWith("INPUT_TRACE")) console.log(message.text());
  }));
  return context;
  };
  return browser;
};
if (process.argv.includes("--full")) {
  const launch = webkit.launch.bind(webkit);
  webkit.launch = async (options) => instrument(await launch(options));
  await import("../../../tests/e2e.mjs");
} else {
  const { server, origin } = await serve();
  const browser = instrument(await webkit.launch({
    executablePath: process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE, headless: true,
  }));
  try {
    await testFirstNightGuidance(browser, origin);
    console.log("LEGACY_INPUT_PROBE_OK");
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}
