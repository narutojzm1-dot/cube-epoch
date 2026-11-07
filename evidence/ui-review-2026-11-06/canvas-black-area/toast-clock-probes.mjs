import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { serve } from "../../../tests/helpers.mjs";
import { testFirstWoodToast } from "../../../tests/touch-title.mjs";

const server = await serve();
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
try {
  await testFirstWoodToast(browser, server.origin);
  console.log("TOAST_CLOCK_NORMAL_OK three original-input viewports");
  const original = browser.newContext.bind(browser);
  browser.newContext = async (options) => {
    const context = await original(options);
    await context.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const el = document.getElementById("toast");
        let work;
        new MutationObserver(() => {
          if (/^木头进包。/.test(el.textContent) && !el.classList.contains("hidden") && !work) {
            work = setInterval(() => {
              const end = performance.now() + 100;
              while (performance.now() < end) {}
            }, 140);
          }
          if (el.classList.contains("hidden") && work) {
            clearInterval(work);
            work = null;
          }
        }).observe(el, { childList: true, attributes: true, attributeFilter: ["class"] });
      });
    });
    return context;
  };
  console.log("TOAST_CLOCK_STRESS_BEGIN isolated render-load fixture; source/world/save unchanged");
  await testFirstWoodToast(browser, server.origin);
  console.log("TOAST_CLOCK_STRESS_OK");
  browser.newContext = async (options) => {
    const context = await original(options);
    await context.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const el = document.getElementById("toast");
        let delayed = false;
        new MutationObserver(() => {
          if (!delayed && /^木头进包。/.test(el.textContent) && el.classList.contains("hidden")) {
            delayed = true;
            el.classList.remove("hidden");
            setTimeout(() => el.classList.add("hidden"), 400);
          }
        }).observe(el, { attributes: true, attributeFilter: ["class"] });
      });
    });
    return context;
  };
  await assert.rejects(() => testFirstWoodToast(browser, server.origin), /natural toast duration changed: frame=/);
  console.log("TOAST_CLOCK_LATE_HIDE_REJECTED isolated DOM +400ms fixture; source/world/save unchanged");
} finally {
  await browser.close();
  await new Promise((resolve) => server.server.close(resolve));
}
