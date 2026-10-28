import { BIOME_FX, CLASSES, COLS, RELIC_FX, ROWS, SKY_FX, T, TILE, VIEW_H, VIEW_W } from "./data.js";
import { isMineable, placeable } from "./build.js";
import { edef } from "./combat.js";
import { campRing, campWalled, clamp, eraName, fenceMax, has, px, rnd, state, tileAt } from "./core.js";
import { aimTile } from "./game.js";
import { camera, canvas, ctx, currentTarget } from "./ui.js";

export const nightFx = document.createElement("canvas");
export const nightCtx = nightFx.getContext("2d");

export function drawDayEvent(c, cam) {
  const ev = state.dayEvent;
  if (!ev || !ev.started || !state.day) return;
  if (ev.id === "migration" && ev.wait <= 0) return;
  const sx = ev.x - cam.x;
  const sy = ev.y - cam.y;
  if (ev.id === "caravan") {
    px(c, sx - 10, sy - 2, 14, 8, "#8b5a2b");
    px(c, sx - 10, sy - 6, 14, 4, "#e8dcc8");
    px(c, sx - 9, sy + 6, 3, 3, "#2a2a32");
    px(c, sx + 0, sy + 6, 3, 3, "#2a2a32");
    px(c, sx + 6, sy - 6, 4, 4, "#f0c8a0");
    px(c, sx + 5, sy - 2, 6, 7, "#4a7ad8");
    px(c, sx + 6, sy - 8, 4, 2, "#c04040");
  }
  const vw = VIEW_W * TILE;
  const vh = VIEW_H * TILE;
  const pulse = 0.5 + 0.5 * Math.sin(state.time * 6);
  if (sx >= 0 && sx <= vw && sy >= 0 && sy <= vh) {
    c.globalAlpha = 0.5 + pulse * 0.5;
    px(c, sx - 2, sy - 22 - pulse * 2, 4, 6, "#ffe27a");
    px(c, sx - 1, sy - 14 - pulse * 2, 2, 2, "#ffe27a");
    c.globalAlpha = 1;
  } else {
    const cx = clamp(sx, 10, vw - 10);
    const cy = clamp(sy, 18, vh - 10);
    c.globalAlpha = 0.6 + pulse * 0.4;
    px(c, cx - 4, cy - 4, 8, 8, ev.id === "migration" ? "#ff6a6a" : "#ffe27a");
    c.globalAlpha = 1;
    c.font = "7px monospace";
    c.textAlign = "center";
    c.fillStyle = "#fff";
    c.fillText(ev.name, clamp(cx, 20, vw - 20), cy + (cy > vh / 2 ? -8 : 14));
  }
}

export function drawTile(c, t, x, y, tx, ty, time) {
  const n = ((tx * 374761393) ^ (ty * 668265263)) >>> 0;
  if (t === T.GRASS) {
    px(c, x, y, 16, 16, "#3d9344");
    px(c, x + 1, y + 1, 14, 14, n % 4 === 0 ? "#36863e" : "#419b48");
    if (n % 3 === 0) px(c, x + (n % 12), y + 4, 2, 3, "#6ad25f");
    if (n % 5 === 0) px(c, x + 9, y + 7, 2, 2, "#d8c45a");
  } else if (t === T.DIRT || t === T.FARM) {
    px(c, x, y, 16, 16, t === T.FARM ? "#6b4424" : "#7a5230");
    px(c, x + (n % 10), y + (n % 8), 2, 2, "#5a3a20");
    if (t === T.FARM) px(c, x, y + 8, 16, 2, "#4a2e16");
  } else if (t === T.SAND) {
    px(c, x, y, 16, 16, "#d2c07a");
    px(c, x + 4, y + 6, 2, 2, "#e8d9a0");
  } else if (t === T.PATH) {
    px(c, x, y, 16, 16, "#c4a06a");
    px(c, x + 1, y + 1, 14, 14, "#b08950");
  } else if (t === T.BRICK) {
    px(c, x, y, 16, 16, "#8a5a48");
    px(c, x, y + 7, 16, 2, "#6e4034");
    px(c, x + 7, y, 2, 16, "#6e4034");
    px(c, x + 2, y + 2, 3, 2, "#c48870");
  } else if (t === T.WATER) {
    const w = 0.5 + 0.5 * Math.sin(time * 2 + tx * 0.4 + ty * 0.3);
    px(c, x, y, 16, 16, w > 0.55 ? "#3aa0c8" : "#2b7eaa");
    px(c, x + 3, y + 4 + ((time * 6 + tx) % 3 | 0), 5, 1, "#b8ecff");
  } else if (t === T.STONE || t === T.GOLD) {
    px(c, x, y, 16, 16, "#8b9098");
    px(c, x + 1, y + 1, 14, 14, "#6d727a");
    px(c, x + 3, y + 3, 4, 3, "#c5c9d0");
    if (t === T.GOLD) {
      px(c, x + 6, y + 6, 4, 4, "#e8c040");
      px(c, x + 9, y + 10, 3, 3, "#ffe27a");
    }
  } else if (t === T.TREE) {
    px(c, x, y, 16, 16, "#3d9344");
    px(c, x + 6, y + 9, 4, 7, "#6b4424");
    px(c, x + 1, y - 2, 14, 13, "#176a2c");
    px(c, x + 3, y, 10, 10, "#1f8a38");
    px(c, x + 5, y + 2, 3, 3, "#7be06a");
  } else if (t === T.FENCE) {
    px(c, x, y, 16, 16, "#3d9344");
    const n = tileAt(tx, ty - 1) === T.FENCE;
    const s = tileAt(tx, ty + 1) === T.FENCE;
    const e = tileAt(tx + 1, ty) === T.FENCE;
    const w = tileAt(tx - 1, ty) === T.FENCE;
    px(c, x + 5, y + 5, 6, 6, "#4a2e16");
    if (n || s || (!e && !w)) {
      px(c, x + 5, y + (n ? 0 : 3), 6, n && s ? 16 : 11, "#6b4424");
      px(c, x + 6, y + (n ? 0 : 3), 4, n && s ? 16 : 11, "#8b5a2b");
    }
    if (e || w || (!n && !s)) {
      px(c, x + (w ? 0 : 3), y + 5, e && w ? 16 : 11, 6, "#6b4424");
      px(c, x + (w ? 0 : 3), y + 6, e && w ? 16 : 11, 4, "#a06a38");
    }
    px(c, x + 5, y + 5, 6, 3, "#c48870");
    const hp = state.fenceHp.get(`${tx},${ty}`) || fenceMax();
    if (hp < fenceMax()) {
      px(c, x + 2, y, 12, 2, "#111");
      px(c, x + 2, y, 12 * clamp(hp / fenceMax(), 0, 1), 2, "#e8c040");
    }
  } else if (t === T.TORCH) {
    px(c, x, y, 16, 16, "#3d9344");
    px(c, x + 7, y + 8, 2, 7, "#6b4424");
    const flick = Math.floor(time * 9 + tx + ty) % 2;
    px(c, x + 6, y + 3 - flick, 4, 6, flick ? "#ffb020" : "#ff6a20");
    px(c, x + 7, y + 2 - flick, 2, 2, "#ffe27a");
  } else if (t === T.CROP) {
    px(c, x, y, 16, 16, "#6b4424");
    const st = state.crops.get(`${tx},${ty}`)?.stage || 0;
    if (st === 0) {
      px(c, x + 7, y + 10, 2, 4, "#7dba4a");
    } else if (st === 1) {
      px(c, x + 5, y + 6, 2, 8, "#5aa33a");
      px(c, x + 9, y + 7, 2, 7, "#5aa33a");
    } else {
      px(c, x + 4, y + 4, 2, 10, "#c6a43a");
      px(c, x + 7, y + 3, 2, 11, "#e8c040");
      px(c, x + 10, y + 5, 2, 9, "#c6a43a");
    }
  } else if (t === T.TOWER) {
    px(c, x, y, 16, 16, "#3d9344");
    px(c, x + 3, y + 4, 10, 12, "#7a7e88");
    px(c, x + 4, y + 5, 8, 10, "#9aa0aa");
    px(c, x + 2, y + 1, 12, 4, "#5a5e68");
    px(c, x + 3, y, 2, 2, "#5a5e68");
    px(c, x + 7, y, 2, 2, "#5a5e68");
    px(c, x + 11, y, 2, 2, "#5a5e68");
    px(c, x + 7, y + 8, 2, 4, "#2a2a32");
    px(c, x + 6, y + 2, 4, 2, "#e8c040");
  } else if (t === T.SPIKE) {
    px(c, x, y, 16, 16, "#7a5230");
    for (let k = 0; k < 4; k++) {
      px(c, x + 1 + k * 4, y + 9, 2, 5, "#8b5a2b");
      px(c, x + 1 + k * 4, y + 5, 2, 4, "#d8d8e0");
      px(c, x + 3 + (k % 3) * 4, y + 2, 2, 3, "#c0c4cc");
    }
  } else if (t === T.SPRING) {
    px(c, x, y, 16, 16, "#3d9344");
    px(c, x + 2, y + 3, 12, 11, "#8a8e98");
    px(c, x + 3, y + 4, 10, 9, "#3a8ad8");
    const ripple = Math.floor(time * 3 + tx) % 3;
    px(c, x + 4 + ripple * 2, y + 7, 3, 1, "#a8e0ff");
    px(c, x + 7, y + 1, 2, 2, "#8dff9a");
  } else if (t === T.MUSHROOM) {
    px(c, x, y, 16, 16, "#2f7a3a");
    px(c, x + 1, y + 1, 14, 14, n % 2 ? "#2a6e36" : "#327e3e");
    px(c, x + 7, y + 8, 2, 6, "#e8dcc8");
    px(c, x + 4, y + 5, 8, 4, n % 3 ? "#b77ad8" : "#4ee8ff");
    px(c, x + 5, y + 6, 2, 1, "#ffffff");
    if (n % 2) {
      px(c, x + 11, y + 11, 1, 3, "#e8dcc8");
      px(c, x + 10, y + 10, 3, 2, "#b77ad8");
    }
  } else if (t === T.STATUE) {
    px(c, x, y, 16, 16, "#5a5e68");
    px(c, x + 3, y + 2, 10, 13, "#8a8ea0");
    px(c, x + 4, y + 3, 8, 6, "#a0a4b8");
    px(c, x + 5, y + 5, 2, 2, "#2a2a40");
    px(c, x + 9, y + 5, 2, 2, "#2a2a40");
    px(c, x + 3, y + 14, 10, 2, "#4a4e58");
  } else if (t === T.RUBBLE) {
    px(c, x, y, 16, 16, "#3d9344");
    px(c, x + 2, y + 8, 5, 4, "#9aa0aa");
    px(c, x + 8, y + 5, 6, 5, "#a8acb4");
    px(c, x + 6, y + 11, 4, 3, "#8a8e98");
    px(c, x + 9, y + 6, 2, 1, "#c8ccd4");
  } else if (t === T.SPORE) {
    px(c, x, y, 16, 16, "#4a2a58");
    px(c, x + 1, y + 1, 14, 14, n % 2 ? "#5a3270" : "#523068");
    px(c, x + (n % 9) + 2, y + 4, 3, 3, "#b77ad8");
    px(c, x + ((n >> 3) % 9) + 3, y + 10, 2, 2, "#d8a8f0");
  }
}

export function drawHuman(c, p, cam, scale) {
  const x = Math.round(p.x - cam.x);
  const y = Math.round(p.y - cam.y);
  const bob = p.frame ? 1 : 0;
  const pal = {
    miner: { hat: "#8b5a2b", cloth: "#3a6b8c", accent: "#7a4e2a", pants: "#6b5344", lamp: "#ffb020" },
    farmer: { hat: "#d4b06a", cloth: "#3d9a4a", accent: "#e8dcc8", pants: "#3d9a4a", lamp: "#d4b06a" },
    mage: { hat: "#3a2a6b", cloth: "#2e6b5e", accent: "#4ee8ff", pants: "#2c3a6b", lamp: "#4ee8ff" },
    knight: { hat: "#8a9aaa", cloth: "#a8b4c0", accent: "#c4303a", pants: "#4a5560", lamp: "#e8c040" },
  }[p.cls];
  c.save();
  c.translate(x, y);
  if (p.dir === 1) c.scale(-1, 1);
  if (p.invuln > 0 && Math.floor(p.invuln * 20) % 2 === 0) c.globalAlpha = 0.45;
  px(c, -5, -1, 10, 3, "rgba(0,0,0,.35)");
  px(c, -3, -8 + bob, 3, 6, pal.pants);
  px(c, 1, -8 + bob, 3, 6, pal.pants);
  px(c, -4, -14 + bob, 8, 7, pal.cloth);
  px(c, -5, -13 + bob, 2, 5, pal.accent);
  px(c, -4, -20 + bob, 8, 7, "#e8b896");
  if (p.cls === "farmer") px(c, -4, -21 + bob, 8, 3, "#e07030");
  if (p.cls === "miner") px(c, -4, -21 + bob, 8, 3, "#6b4423");
  if (p.cls === "mage") px(c, -4, -21 + bob, 8, 3, "#2a2438");
  if (p.cls === "knight") px(c, -4, -21 + bob, 8, 3, "#4a4038");
  if (p.dir !== 3) {
    px(c, -2, -18 + bob, 2, 2, "#1a120c");
    px(c, 1, -18 + bob, 2, 2, "#1a120c");
  }
  if (p.cls === "miner") {
    px(c, -5, -23 + bob, 10, 4, pal.hat);
    px(c, -1, -23 + bob, 3, 3, pal.lamp);
  } else if (p.cls === "farmer") {
    px(c, -6, -23 + bob, 12, 3, pal.hat);
    px(c, -4, -24 + bob, 8, 3, "#c49a58");
  } else if (p.cls === "mage") {
    px(c, -5, -26 + bob, 10, 8, pal.hat);
    px(c, 2, -26 + bob, 2, 2, "#e8c040");
    px(c, 5, -18 + bob, 2, 12, pal.accent);
    px(c, 4, -20 + bob, 4, 4, "#b8f6ff");
  } else {
    px(c, -5, -24 + bob, 10, 5, pal.hat);
    px(c, -6, -16 + bob, 3, 8, pal.accent);
    px(c, -7, -12 + bob, 5, 7, "#8b5a2b");
    px(c, -6, -11 + bob, 3, 3, pal.lamp);
  }
  if (p.attack > 0 && p.cls !== "mage") {
    const ang = Math.atan2(p.slashDy || 1, p.slashDx || 0);
    c.rotate(ang);
    px(c, 8, -2, 10, 2, p.cls === "knight" ? "#e8eef4" : "#c5c9d0");
    px(c, 12, -5, 6, 2, "#fff");
    px(c, 12, 1, 6, 2, "#fff");
  }
  c.restore();
}

export function drawEnemy(c, e, cam) {
  const x = Math.round(e.x - cam.x);
  const y = Math.round(e.y - cam.y);
  const bob = Math.sin(state.time * 6 + e.bob) * 1;
  if (e.under) {
    const wob = Math.floor(state.time * 10 + e.bob * 7) % 2;
    px(c, x - 5, y - 2, 10, 4, "#5a3a20");
    px(c, x - 3 + wob, y - 4, 3, 2, "#8b5a2b");
    px(c, x + 1 - wob, y - 3, 2, 2, "#6b4424");
    return;
  }
  if (e.flash > 0) c.globalAlpha = 0.55;
  px(c, x - 5, y - 1, 10, 3, "rgba(0,0,0,.3)");
  if (e.kind === "slime_king") {
    px(c, x - 13, y - 22 + bob, 26, 22, "#3fae3c");
    px(c, x - 13, y - 22 + bob, 26, 4, "#7ae276");
    px(c, x - 8, y - 28 + bob, 16, 5, "#e8c040");
    px(c, x - 8, y - 31 + bob, 3, 3, "#e8c040");
    px(c, x - 1, y - 31 + bob, 3, 3, "#e8c040");
    px(c, x + 5, y - 31 + bob, 3, 3, "#e8c040");
    px(c, x - 7, y - 15 + bob, 4, 4, "#143318");
    px(c, x + 3, y - 15 + bob, 4, 4, "#143318");
  } else if (e.kind === "shadow_knight") {
    px(c, x - 8, y - 24 + bob, 16, 22, e.phase2 ? "#4a1c2c" : "#2a2238");
    px(c, x - 7, y - 26 + bob, 14, 8, "#3c3450");
    px(c, x - 5, y - 22 + bob, 10, 2, e.phase2 ? "#ff4040" : "#b06cff");
    px(c, x + 8, y - 22 + bob, 3, 18, "#c5c9d0");
    px(c, x - 12, y - 18 + bob, 4, 10, "#5a5068");
  } else if (e.kind === "burrower") {
    px(c, x - 6, y - 7 + bob, 12, 7, "#a0703c");
    px(c, x - 6, y - 7 + bob, 12, 2, "#c89058");
    px(c, x - 4, y - 6 + bob, 2, 2, "#1a0f08");
    px(c, x + 2, y - 6 + bob, 2, 2, "#1a0f08");
    px(c, x + 5, y - 4 + bob, 3, 2, "#e8eef4");
  } else if (e.kind === "thrower") {
    px(c, x - 6, y - 14 + bob, 12, 14, "#6d727a");
    px(c, x - 6, y - 14 + bob, 12, 3, "#9aa0a8");
    px(c, x - 4, y - 10 + bob, 2, 2, "#ff6a20");
    px(c, x + 2, y - 10 + bob, 2, 2, "#ff6a20");
    px(c, x + 5, y - 18 + bob, 5, 5, "#8b9098");
  } else if (e.kind === "spore") {
    px(c, x - 1, y - 6 + bob, 2, 6, "#3a6a2a");
    px(c, x - 6, y - 13 + bob, 12, 7, "#9a4ac0");
    px(c, x - 4, y - 12 + bob, 2, 2, "#e8c0ff");
    px(c, x + 2, y - 11 + bob, 2, 2, "#e8c0ff");
  } else if (e.kind === "slime") {
    px(c, x - 6, y - 10 + bob, 12, 10, "#5dcf5a");
    px(c, x - 4, y - 8 + bob, 3, 3, "#143318");
    px(c, x + 1, y - 8 + bob, 3, 3, "#143318");
  } else if (e.kind === "bat") {
    px(c, x - 8, y - 10 + bob, 5, 3, "#3a2a58");
    px(c, x + 3, y - 10 + bob, 5, 3, "#3a2a58");
    px(c, x - 3, y - 9 + bob, 6, 5, "#2a1c40");
  } else if (e.kind === "cube") {
    px(c, x - 6, y - 12 + bob, 12, 12, "#e8c040");
    px(c, x - 6, y - 12 + bob, 12, 3, "#ffe27a");
    px(c, x - 2, y - 8 + bob, 2, 2, "#3a2a10");
    px(c, x + 2, y - 8 + bob, 2, 2, "#3a2a10");
  }
  c.globalAlpha = 1;
  if (e.hp < e.maxHp && !edef(e).boss) {
    px(c, x - 6, y - 16 + bob, 12, 2, "#111");
    px(c, x - 6, y - 16 + bob, 12 * clamp(e.hp / e.maxHp, 0, 1), 2, "#d4454a");
  }
}

export function drawProp(c, kind, x, y, cam, time) {
  const px0 = Math.round(x - cam.x);
  const py0 = Math.round(y - cam.y);
  if (kind === "bench") {
    px(c, px0 - 8, py0 - 8, 16, 10, "#6b4424");
    px(c, px0 - 8, py0 - 8, 16, 3, "#8b5a2b");
    px(c, px0 - 7, py0 - 12, 5, 5, "#8b9098");
    px(c, px0 + 1, py0 - 11, 6, 3, "#e8c040");
  } else if (kind === "altar") {
    px(c, px0 - 8, py0 - 6, 16, 8, "#6d727a");
    px(c, px0 - 4, py0 - 14, 8, 10, "#8b9098");
    const glow = 0.5 + 0.5 * Math.sin(time * 3);
    px(c, px0 - 2, py0 - 16, 4, 4, glow > 0.5 ? "#ffe27a" : "#e8c040");
  } else if (kind === "camp") {
    px(c, px0 - 5, py0 - 3, 10, 4, "#5a3a20");
    const f = Math.floor(time * 8) % 2;
    px(c, px0 - 2, py0 - 10 - f, 4, 8, f ? "#ffb020" : "#ff6a20");
  }
}

export function render() {
  if (!state) return;
  const scale = Number(canvas.dataset.scale || 3);
  const cam = camera();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  if (state.shake > 0) {
    ctx.translate((rnd("fx") - 0.5) * state.shake, (rnd("fx") - 0.5) * state.shake);
    state.shake = Math.max(0, state.shake - 0.45);
  }
  ctx.fillStyle = "#16351c";
  ctx.fillRect(0, 0, VIEW_W * TILE, VIEW_H * TILE);

  const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
  const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
  const x1 = Math.min(COLS, x0 + VIEW_W + 3);
  const y1 = Math.min(ROWS, y0 + VIEW_H + 3);
  for (let ty = y0; ty < y1; ty++) {
    for (let tx = x0; tx < x1; tx++) {
      const t = tileAt(tx, ty);
      drawTile(ctx, t, tx * TILE - cam.x, ty * TILE - cam.y, tx, ty, state.time);
      if (state.player.sense > 0 && t === T.GOLD) {
        ctx.strokeStyle = "#ffe27a";
        ctx.strokeRect(tx * TILE - cam.x + 1, ty * TILE - cam.y + 1, 14, 14);
      }
    }
  }

  drawProp(ctx, "bench", state.bench.x, state.bench.y, cam, state.time);
  drawProp(ctx, "altar", state.altar.x, state.altar.y, cam, state.time);
  drawProp(ctx, "camp", state.camp.x, state.camp.y, cam, state.time);

  for (const d of state.drops) {
    const colors = { wood: "#8b5a2b", stone: "#9aa0a8", gold: "#e8c040", wheat: "#e8c040", seed: "#7dba4a", heart: "#ff6a8a" };
    px(ctx, d.x - cam.x - 2, d.y - cam.y - 2 - d.z, 4, 4, colors[d.kind] || "#fff");
  }
  for (const e of state.enemies) drawEnemy(ctx, e, cam);
  for (const r of state.rocks) {
    px(ctx, r.x - cam.x - 3, r.y - cam.y - 3, 6, 6, "#6d727a");
    px(ctx, r.x - cam.x - 3, r.y - cam.y - 3, 6, 2, "#9aa0a8");
  }
  drawDayEvent(ctx, cam);
  drawHuman(ctx, state.player, cam, scale);
  for (const b of state.bolts) {
    if (b.arrow) px(ctx, b.x - cam.x - 1, b.y - cam.y - 1, 3, 3, "#f0d8a0");
    else px(ctx, b.x - cam.x - 2, b.y - cam.y - 2, 4, 4, b.nova ? "#c8f6ff" : "#4ee8ff");
  }
  for (const pt of state.particles) {
    ctx.globalAlpha = clamp(pt.life * 2, 0, 1);
    px(ctx, pt.x - cam.x, pt.y - cam.y, pt.size || 2, pt.size || 2, pt.color);
    ctx.globalAlpha = 1;
  }
  ctx.font = "8px monospace";
  ctx.textAlign = "center";
  for (const f of state.floats) {
    ctx.globalAlpha = clamp(f.life * 1.4, 0, 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x - cam.x, f.y - cam.y);
    ctx.globalAlpha = 1;
  }

  if (state.player.mine > 0) {
    const p = state.player;
    const bx = p.mineTx * TILE - cam.x;
    const by = p.mineTy * TILE - cam.y - 4;
    px(ctx, bx + 2, by, 12, 3, "#111");
    px(ctx, bx + 2, by, 12 * p.mine, 3, "#ffe27a");
  }

  const target = currentTarget();
  if (target) {
    const tx = target.x - cam.x;
    const ty = target.y - cam.y;
    const pulse = 0.5 + 0.5 * Math.sin(state.time * 6);
    ctx.strokeStyle = `rgba(255, 226, 122, ${0.45 + pulse * 0.45})`;
    ctx.strokeRect(tx - 10, ty - 10, 20, 20);
    const vw = VIEW_W * TILE;
    const vh = VIEW_H * TILE;
    const cx = vw / 2;
    const cy = vh / 2;
    let ax = clamp(tx, 10, vw - 10);
    let ay = clamp(ty, 10, vh - 10);
    if (tx < 0 || tx > vw || ty < 0 || ty > vh) {
      const ang = Math.atan2(ty - cy, tx - cx);
      ax = cx + Math.cos(ang) * (Math.min(vw, vh) * 0.42);
      ay = cy + Math.sin(ang) * (Math.min(vw, vh) * 0.38);
      ctx.fillStyle = "#ffe27a";
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - Math.cos(ang) * 8 + Math.sin(ang) * 4, ay - Math.sin(ang) * 8 - Math.cos(ang) * 4);
      ctx.lineTo(ax - Math.cos(ang) * 8 - Math.sin(ang) * 4, ay - Math.sin(ang) * 8 + Math.cos(ang) * 4);
      ctx.fill();
    }
  }

  ctx.font = "8px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffe27a";
  if (state.briefing || state.campHint > 0) {
    ctx.fillText(state.briefing ? "篝火 · 要保护" : "篝火回血", state.camp.x - cam.x, state.camp.y - cam.y - 14);
  }
  if (state.briefing || state.benchHint > 0) {
    ctx.fillText("工作台 按E", state.bench.x - cam.x, state.bench.y - cam.y - 16);
  }
  if (state.briefing) {
    ctx.fillText("祭坛 · 送到这里", state.altar.x - cam.x, state.altar.y - cam.y - 18);
  }

  if (!campWalled() && (state.flags.chopped || state.build === "fence")) {
    const pulse = 0.3 + 0.3 * Math.sin(state.time * 5);
    for (const [tx, ty] of campRing()) {
      if (tileAt(tx, ty) === T.FENCE) continue;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = "#e8c040";
      ctx.fillRect(tx * TILE - cam.x + 3, ty * TILE - cam.y + 3, 10, 10);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(255, 226, 122, 0.85)";
      ctx.strokeRect(tx * TILE - cam.x + 1, ty * TILE - cam.y + 1, 14, 14);
    }
  }
  if (state.build) {
    const f = aimTile();
    if (placeable(f.tx, f.ty) && !isMineable(f.tx, f.ty)) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = state.build === "fence" ? "#6b4424" : state.build === "torch" ? "#ffb020" : "#6b4424";
      ctx.fillRect(f.tx * TILE - cam.x + 3, f.ty * TILE - cam.y + 3, 10, 10);
      ctx.globalAlpha = 1;
    } else if (state.build === "fence" && tileAt(f.tx, f.ty) === T.FENCE) {
      const hp = state.fenceHp.get(`${f.tx},${f.ty}`) || fenceMax();
      if (hp < fenceMax() - 0.5) {
        ctx.strokeStyle = "#8dff9a";
        ctx.strokeRect(f.tx * TILE - cam.x + 1, f.ty * TILE - cam.y + 1, 14, 14);
      }
    }
  }

  const sky = skyTint();
  if (sky.tint) {
    const vw = VIEW_W * TILE;
    const vh = VIEW_H * TILE;
    const grad = ctx.createLinearGradient(0, 0, 0, vh);
    grad.addColorStop(0, sky.tint[0]);
    grad.addColorStop(1, sky.tint[1]);
    ctx.globalAlpha = sky.tintAlpha;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, vh);
    ctx.globalAlpha = 1;
  }
  if (!state.day) {
    const vw = VIEW_W * TILE;
    const vh = VIEW_H * TILE;
    if (nightFx.width !== vw) nightFx.width = vw;
    if (nightFx.height !== vh) nightFx.height = vh;
    nightCtx.clearRect(0, 0, vw, vh);
    nightCtx.fillStyle = `rgba(6,8,18,${sky.dark.toFixed(3)})`;
    nightCtx.fillRect(0, 0, vw, vh);
    nightCtx.globalCompositeOperation = "destination-out";
    const lights = [
      { x: state.player.x - cam.x, y: state.player.y - cam.y, r: CLASSES[state.player.cls].light + (has("miner_lamp") ? RELIC_FX.minerLampLight : 0) },
      { x: state.camp.x - cam.x, y: state.camp.y - cam.y, r: state.campHp > 0 ? 56 : 8 },
    ];
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        const lt = tileAt(tx, ty);
        if (lt === T.TORCH) {
          lights.push({ x: tx * TILE + 8 - cam.x, y: ty * TILE + 8 - cam.y, r: 54 });
        } else if (lt === T.MUSHROOM) {
          lights.push({ x: tx * TILE + 8 - cam.x, y: ty * TILE + 8 - cam.y, r: BIOME_FX.mushroomLight });
        }
      }
    }
    for (const L of lights) {
      const g = nightCtx.createRadialGradient(L.x, L.y, 6, L.x, L.y, L.r);
      g.addColorStop(0, "rgba(0,0,0,0.95)");
      g.addColorStop(0.5, "rgba(0,0,0,0.45)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      nightCtx.fillStyle = g;
      nightCtx.beginPath();
      nightCtx.arc(L.x, L.y, L.r, 0, Math.PI * 2);
      nightCtx.fill();
    }
    nightCtx.globalCompositeOperation = "source-over";
    ctx.drawImage(nightFx, 0, 0);
  }
  const boss = state.enemies.find((e) => edef(e).boss);
  if (boss) {
    const vw = VIEW_W * TILE;
    const w = vw * 0.6;
    const bx = (vw - w) / 2;
    px(ctx, bx - 1, 5, w + 2, 6, "#111");
    px(ctx, bx, 6, w * clamp(boss.hp / boss.maxHp, 0, 1), 4, boss.phase2 ? "#ff4040" : "#d4454a");
    ctx.font = "7px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe27a";
    ctx.fillText(edef(boss).name, vw / 2, 19);
  }
  drawOverlayFx(ctx, cam);
}

export function skyTint() {
  if (state.day) {
    const toDusk = state.dayLen - state.cycle;
    if (toDusk < SKY_FX.duskSecs) {
      const k = 1 - toDusk / SKY_FX.duskSecs;
      return { dark: 0, tint: ["#ff8a3a", "#5a2a6a"], tintAlpha: 0.38 * k };
    }
    if (state.nights > 0 && state.cycle < SKY_FX.dawnSecs) {
      const k = 1 - state.cycle / SKY_FX.dawnSecs;
      return { dark: 0, tint: ["#ffb0c0", "#ffe27a"], tintAlpha: 0.32 * k };
    }
    return { dark: 0, tint: null, tintAlpha: 0 };
  }
  const k = clamp(state.cycle / SKY_FX.nightFadeSecs, 0, 1);
  const toDawn = state.nightLen - state.cycle;
  const morning = clamp(toDawn / SKY_FX.nightFadeSecs, 0, 1);
  return { dark: SKY_FX.nightDark * (0.45 + 0.55 * Math.min(k, morning)), tint: null, tintAlpha: 0 };
}

export function drawOverlayFx(c, cam) {
  const vw = VIEW_W * TILE;
  const vh = VIEW_H * TILE;
  const hd = state.hurtDir;
  if (hd) {
    const sx = state.player.x - cam.x;
    const sy = state.player.y - cam.y;
    const alpha = clamp(hd.t / SKY_FX.hurtArrowSecs, 0, 1);
    c.globalAlpha = alpha;
    for (let k = 0; k < 5; k++) {
      const r = 22 + k * 3;
      const spread = (2 - Math.abs(k - 2)) * 0.12;
      for (const off of [-spread, spread]) {
        px(c, sx + Math.cos(hd.a + off) * r - 1, sy - 6 + Math.sin(hd.a + off) * r - 1, 3, 3, "#ff4040");
      }
    }
    c.globalAlpha = alpha * 0.35;
    const ex = clamp(vw / 2 + Math.cos(hd.a) * vw, 0, vw);
    const ey = clamp(vh / 2 + Math.sin(hd.a) * vh, 0, vh);
    const g = c.createRadialGradient(ex, ey, 0, ex, ey, 90);
    g.addColorStop(0, "#ff2020");
    g.addColorStop(1, "rgba(255,32,32,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, vw, vh);
    c.globalAlpha = 1;
  }
  const bb = state.bossBanner;
  if (bb) {
    const life = SKY_FX.bossBannerSecs;
    const k = Math.min(1, (life - bb.t) / 0.3, bb.t / 0.5);
    const bar = Math.round(28 * k);
    px(c, 0, 0, vw, bar, "#000");
    px(c, 0, vh - bar, vw, bar, "#000");
    c.globalAlpha = clamp(k, 0, 1);
    px(c, 0, vh / 2 - 20, vw, 40, "rgba(40,0,0,0.75)");
    c.font = "bold 18px monospace";
    c.textAlign = "center";
    c.fillStyle = "#ff5a5a";
    c.fillText(`⚠ ${bb.name} ⚠`, vw / 2, vh / 2 + 2);
    c.font = "8px monospace";
    c.fillStyle = "#ffe27a";
    c.fillText(`${eraName(state.era)} · 纪元 Boss 破夜而来`, vw / 2, vh / 2 + 14);
    c.globalAlpha = 1;
  }
}
