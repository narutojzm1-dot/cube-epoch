import { webkit } from "playwright-core";
import { createServer } from "http";
import { readFile } from "fs/promises";
import { extname, join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function webkitPath() {
  if (process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE) return process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE;
  const home = process.env.HOME || "";
  const candidates = [
    join(home, "Library/Caches/ms-playwright/webkit-2359/pw_run.sh"),
    join(home, "Library/Caches/ms-playwright/webkit-2336/pw_run.sh"),
  ];
  return candidates.find((p) => existsSync(p));
}

export async function serve() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    let p = url.pathname === "/" ? "/index.html" : url.pathname;
    try {
      const buf = await readFile(join(ROOT, decodeURIComponent(p)));
      res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
      res.end(buf);
    } catch {
      res.writeHead(404);
      res.end("no");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, origin: `http://127.0.0.1:${server.address().port}/` };
}

export async function launch() {
  const executablePath = webkitPath();
  const opts = { headless: true };
  if (executablePath) opts.executablePath = executablePath;
  return webkit.launch(opts);
}

export async function enterPlay(page, cls = "knight") {
  await page.locator(`.class-card[data-class="${cls}"]`).click();
  await page.locator("#btn-start").click();
  await page.locator("#btn-skip-intro").click();
  await page.locator("#btn-skip-brief").click();
  await page.waitForSelector("#screen-game:not(.hidden)");
  await page.waitForTimeout(200);
}
