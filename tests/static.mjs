import { readFile } from "fs/promises";
import { execFileSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const js = await readFile(join(ROOT, "game.js"), "utf8");
const html = await readFile(join(ROOT, "index.html"), "utf8");

execFileSync("node", ["--check", join(ROOT, "game.js")], { stdio: "pipe" });

const must = [
  ["FENCE_MAX = 80", js],
  ["NEED = { wood: 4", js],
  ["function ensureMusicPad", js],
  ["musicOn ? 0.26", js],
  ["if (state.briefing) {", js],
  ["function playIntro", js],
  ["function startBriefing", js],
  ["function endBriefing", js],
  ["id=\"screen-intro\"", html],
  ["id=\"briefing\"", html],
  ["id=\"btn-skip-intro\"", html],
  ["id=\"btn-skip-brief\"", html],
];

for (const [needle, src] of must) {
  if (!src.includes(needle)) throw new Error("missing contract: " + needle);
}

if (js.includes("state.look && Math.hypot(state.look.x - p.x")) {
  throw new Error("camera must not lock to leftover briefing look after play starts");
}

console.log("STATIC_OK");
