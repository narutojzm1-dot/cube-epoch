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
  ["ERA_SCALING = 1.35", data],
  ["ERA_NIGHTS_STEP = 1", data],
  ["DAWN_CHOICES = 3", data],
  ["export const RELICS = [", data],
  ["function offerDawn", js],
  ["export const BOSSES = [", data],
  ["burrow: true", data],
  ["ranged: true", data],
  ["spore: true", data],
  ["function announceBoss", js],
  ["AP_BASE = 14", data],
  ["function undoPlace", js],
  ["id=\"ap\"", html],
  ["export const BUILDINGS = {", data],
  ["function updateBuildings", js],
  ["export const BIOME_SLOTS = [", data],
  ["function wakeStatue", js],
  ["DAY_EVENT_CHANCE = 0.6", data],
  ["function rollDayEvent", js],
  ["function tradeCaravan", js],
  ["export const ACHIEVEMENTS = [", data],
  ["STORE_PREFIX = \"cube-epoch:v1:\"", data],
  ["id=\"btn-daily\"", html],
  ["id=\"btn-codex\"", html],
  ["方块纪元·每日", js],
  ["export const PARTICLES = {", data],
  ["export const SKY_FX = {", data],
  ["export const ERA_MUSIC = [", data],
  ["function skyTint", js],
  ["function nextEra", js],
  ["function shareText", js],
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

const relicCount = (data.match(/\{ id: "[a-z_]+", type: "(relic|blessing|mutation)"/g) || []).length;
if (relicCount < 12) throw new Error("need at least 12 dawn gifts, got " + relicCount);
for (const m of data.matchAll(/\{ id: "([a-z_]+)", type: "(relic|mutation)"/g)) {
  if (!js.includes(`has("${m[1]}")`)) throw new Error("relic has no effect hook: " + m[1]);
}

const achIds = [...data.matchAll(/\{ id: "([a-z_0-9]+)", name: "[^"]+", desc: "[^"]+" \}/g)].map((m) => m[1]);
if (achIds.length < 12 || achIds.length > 16) throw new Error("need 12~16 achievements, got " + achIds.length);
for (const id of achIds) {
  if (!js.includes(`    ${id}: (s`)) throw new Error("achievement has no ACH_CHECK rule: " + id);
}

if (js.includes("state.look && Math.hypot(state.look.x - p.x")) {
  throw new Error("camera must not lock to leftover briefing look after play starts");
}

console.log("STATIC_OK");
