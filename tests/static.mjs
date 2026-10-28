import { readFile } from "fs/promises";
import { execFileSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const js = await readFile(join(ROOT, "game.js"), "utf8");
const data = await readFile(join(ROOT, "data.js"), "utf8");
const html = await readFile(join(ROOT, "index.html"), "utf8");

execFileSync("node", ["--check", join(ROOT, "game.js")], { stdio: "pipe" });
execFileSync("node", ["--check", join(ROOT, "data.js")], { stdio: "pipe" });

const must = [
  ["FENCE_MAX = 80", data],
  ["NEED = { wood: 4", data],
  ["from \"./data.js\"", js],
  ["<script type=\"module\" src=\"game.js\">", html],
  ["function mulberry32", js],
  ["const RNG_STREAMS = [\"world\", \"event\", \"loot\", \"fx\"]", js],
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

if (/Math\.random\(\)/.test(js.replace("Math.floor(Math.random() * 1e9)", ""))) {
  throw new Error("gameplay/fx randomness must go through seeded rand(stream, n) / rnd(stream)");
}

if (js.includes("state.look && Math.hypot(state.look.x - p.x")) {
  throw new Error("camera must not lock to leftover briefing look after play starts");
}

console.log("STATIC_OK");
