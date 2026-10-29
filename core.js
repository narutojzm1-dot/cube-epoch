import { DEFAULT_DIFFICULTY, DIFFICULTIES, SEEN_KEY, COLS, ERA_NAMES, ERA_NIGHTS_STEP, ERA_SCALING, FENCE_MAX, NEED, PARTICLES, RELIC_FX, ROWS, T, TILE, WIN_NIGHTS } from "./data.js";

export let selectedClass = null;
export let pendingSeed = "";
export let state = null;
export let last = 0;
export let looping = false;
export let toastTimer = 0;
export function setSelectedClass(v) {
  selectedClass = v;
}
export function setPendingSeed(v) {
  pendingSeed = v;
}
export function setLast(v) {
  last = v;
}
export function setLooping(v) {
  looping = v;
}
export function setToastTimer(v) {
  toastTimer = v;
}
export function setRng(v) {
  rng = v;
}
export function setState(v) {
  state = v;
}
export const keys = new Set();
export const mouse = { x: 0, y: 0, down: false, pressed: false, right: false, inside: false };

// 种子化 PRNG：按用途拆成四条独立随机流，互不干扰。
// world: 地图生成 · event: 波次/敌种/掉落判定/黎明三选一 · loot: 局内掉落微调 · fx: 音画表现
export function mulberry32(a) {
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export const RNG_STREAMS = ["world", "event", "loot", "fx"];
export const urlSeed = (new URLSearchParams(location.search).get("seed") || "").replace(/[^\w-]/g, "").slice(0, 32);
export let rng = makeStreams(newSeed());
export function newSeed() {
  return String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
}
export function makeStreams(seed) {
  const s = {};
  for (const name of RNG_STREAMS) s[name] = mulberry32(hashSeed(`${seed}:${name}`));
  return s;
}
export function rnd(stream) {
  return rng[stream]();
}
export function rand(stream, n) {
  return Math.floor(rng[stream]() * n);
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}
export function inBounds(tx, ty) {
  return tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS;
}
export function px(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(x | 0, y | 0, w, h);
}

export function punch(mag, stop) {
  if (!state) return;
  state.shake = Math.max(state.shake || 0, mag);
  if (stop) state.hitstop = Math.max(state.hitstop || 0, stop);
}

export function tileAt(tx, ty) {
  if (!inBounds(tx, ty)) return T.WATER;
  return state.tiles[ty * COLS + tx];
}
export function setTile(tx, ty, v) {
  state.tiles[ty * COLS + tx] = v;
}
export function solid(tx, ty) {
  const t = tileAt(tx, ty);
  return t === T.WATER || t === T.STONE || t === T.GOLD || t === T.TREE
    || t === T.TOWER || t === T.STATUE || t === T.RUBBLE || t === T.WAREHOUSE;
}
export function campTile() {
  return {
    tx: Math.floor(state.camp.x / TILE),
    ty: Math.floor(state.camp.y / TILE),
  };
}
export function campRing() {
  const c = campTile();
  return [[c.tx, c.ty - 1], [c.tx - 1, c.ty], [c.tx + 1, c.ty], [c.tx, c.ty + 1]];
}
export function campWalled() {
  return campRing().every(([tx, ty]) => tileAt(tx, ty) === T.FENCE);
}
export function groundSolid(tx, ty) {
  if (solid(tx, ty) || tileAt(tx, ty) === T.FENCE) return true;
  const c = campTile();
  return tx === c.tx && ty === c.ty;
}
export function flySolid(tx, ty) {
  const t = tileAt(tx, ty);
  return t === T.WATER || t === T.STONE || t === T.GOLD || t === T.TREE;
}
export function walkablePixel(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  return !solid(tx, ty);
}
export function canStand(x, y) {
  const r = 4;
  return walkablePixel(x - r, y) && walkablePixel(x + r, y) && walkablePixel(x, y + 2) && walkablePixel(x, y - 3);
}

export function materialsReady() {
  return Object.entries(NEED).every(([k, n]) => (state.inv[k] || 0) >= n);
}

export function eraNights() {
  return WIN_NIGHTS + (state.era - 1) * ERA_NIGHTS_STEP;
}
export function nightsLeft() {
  return Math.max(0, eraNights() - (state.nights - state.eraStart));
}
export function survivedNights() {
  return nightsLeft() <= 0;
}
export function diff() {
  return DIFFICULTIES[state.difficulty] || DIFFICULTIES[DEFAULT_DIFFICULTY];
}
export function eraMul() {
  return Math.pow(ERA_SCALING, state.era - 1);
}
export function eraName(n) {
  return ERA_NAMES[n - 1] || `第${n}纪元`;
}
export function has(id) {
  return state.relics.includes(id);
}
export function dmgMul() {
  return (has("whetstone") ? RELIC_FX.whetstoneDmg : 1) * (has("glass_cannon") ? RELIC_FX.glassCannonDmg : 1);
}
export function fenceMax() {
  return FENCE_MAX * (has("iron_hoops") ? RELIC_FX.ironHoopsFence : 1);
}

export function addDrop(kind, x, y, n) {
  for (let i = 0; i < (n || 1); i++) {
    state.drops.push({
      kind,
      x: x + rand("fx", 7) - 3,
      y: y + rand("fx", 7) - 3,
      z: 6 + rand("fx", 6),
      vz: -40,
      life: 18,
    });
  }
}
export function burst(x, y, color, n, preset) {
  const P = PARTICLES[preset] || PARTICLES.default;
  for (let i = 0; i < (n || 8); i++) {
    const a = rnd("fx") * Math.PI * 2;
    const s = P.speed + rnd("fx") * P.speedVar;
    state.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: P.life + rnd("fx") * P.lifeVar, color, g: P.gravity, size: P.size,
    });
  }
}
export function floatText(x, y, text, color) {
  state.floats.push({ x, y, text, color, life: 0.9 });
}

export function tryMove(ent, dt) {
  const nx = ent.x + ent.vx * dt;
  const ny = ent.y + ent.vy * dt;
  if (canStand(nx, ent.y)) ent.x = nx;
  if (canStand(ent.x, ny)) ent.y = ny;
  ent.x = clamp(ent.x, 8, COLS * TILE - 8);
  ent.y = clamp(ent.y, 8, ROWS * TILE - 8);
}

export function labelOf(k) {
  return { wood: "木", stone: "石", gold: "金", wheat: "麦", seed: "种", heart: "心", fence: "栏", torch: "火", plot: "田" }[k] || k;
}

export function hasSeenWorld() {
  try { return localStorage.getItem(SEEN_KEY) === "1"; } catch (_) { return false; }
}
export function markSeenWorld() {
  try { localStorage.setItem(SEEN_KEY, "1"); } catch (_) { /* 隐私模式就当没记住 */ }
}
