import { webkit } from "playwright-core";

const launch = webkit.launch.bind(webkit);
webkit.launch = async (options) => {
  const browser = await launch(options), createContext = browser.newContext.bind(browser);
  browser.newContext = async (options) => {
    const context = await createContext(options);
    await context.addInitScript(() => {
      const record = (event) => {
        const s = window.CUBE?.getState();
        console.log("INPUT_TRACE", JSON.stringify({
          real_ms: performance.now(), type: event.type, code: event.code,
          target: event.target?.id || event.target?.tagName, focus: document.activeElement?.id,
          pointer: event.pointerType, x: event.clientX, y: event.clientY,
          width: innerWidth, details: document.getElementById("play-details")?.open,
          time: s?.time, day: s?.day, nights: s?.nights, paused: s?.paused,
          build: s?.build, inv: s?.inv, player: s && { x: s.player.x, y: s.player.y, dir: s.player.dir },
          wall: s?.tiles[22 * 48 + 22],
        }));
      };
      for (const type of ["keydown", "keyup", "pointerdown", "pointerup"]) window.addEventListener(type, record);
      document.addEventListener("toggle", record, true);
    });
    context.on("page", (page) => page.on("console", (message) => {
      if (message.text().startsWith("INPUT_TRACE")) console.log(message.text());
    }));
    return context;
  };
  return browser;
};
await import("../../../tests/e2e.mjs");
