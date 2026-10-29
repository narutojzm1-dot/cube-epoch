import { BIOME_FX, BIOME_SLOTS, CLASSES, COLS, DAY_EVENTS, DAY_EVENT_CHANCE, DAY_EVENT_FX, ROWS, T, TILE, TRADES } from "./data.js";
import { beep, noise } from "./audio.js";
import { roomFor } from "./build.js";
import { makeEnemy } from "./combat.js";
import { burst, dist, has, hashSeed, inBounds, labelOf, mulberry32, punch, rand, rnd, setTile, solid, state, tileAt } from "./core.js";
import { syncHud, toast } from "./ui.js";

export function genWorld() {
  const tiles = new Uint8Array(COLS * ROWS);
  const crops = new Map();
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      tiles[y * COLS + x] = T.GRASS;
      if ((x * 13 + y * 7) % 17 === 0) tiles[y * COLS + x] = T.DIRT;
    }
  }
  function stamp(x, y, t) {
    if (inBounds(x, y) && tiles[y * COLS + x] !== T.WATER) tiles[y * COLS + x] = t;
  }
  const order = BIOME_SLOTS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = rand("world", i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const biomes = ["lake", "forest", "quarry", "rubble"].map((kind, i) => {
    const slot = BIOME_SLOTS[order[i]];
    let variant = kind;
    if (kind === "forest" && rnd("world") < BIOME_FX.mushroomChance) variant = "mushroom";
    if (kind === "quarry" && rnd("world") < BIOME_FX.crystalChance) variant = "crystal";
    return { kind: variant, x: slot.x, y: slot.y, name: slot.name };
  });
  for (const b of biomes) {
    if (b.kind === "lake") {
      const r = 4 + rand("world", 2);
      for (let y = b.y - r - 2; y <= b.y + r + 2; y++) {
        for (let x = b.x - r - 2; x <= b.x + r + 2; x++) {
          if (!inBounds(x, y)) continue;
          const d = Math.hypot(x - b.x, y - b.y);
          if (d < r) tiles[y * COLS + x] = T.WATER;
          else if (d < r + 1.4) tiles[y * COLS + x] = T.SAND;
        }
      }
    } else if (b.kind === "forest" || b.kind === "mushroom") {
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const roll = rnd("world");
          if (roll < 0.7) stamp(b.x + dx, b.y + dy, T.TREE);
          else if (b.kind === "mushroom" && roll < 0.92) stamp(b.x + dx, b.y + dy, T.MUSHROOM);
        }
      }
      stamp(b.x, b.y, T.GRASS);
      stamp(b.x + 1, b.y + 1, T.GRASS);
    } else if (b.kind === "quarry" || b.kind === "crystal") {
      const cells = [];
      for (let dy = -2; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if (rnd("world") < 0.8) {
            stamp(b.x + dx, b.y + dy, T.STONE);
            cells.push([b.x + dx, b.y + dy]);
          }
        }
      }
      const golds = b.kind === "crystal" ? BIOME_FX.crystalGold : BIOME_FX.quarryGold;
      for (let k = 0; k < golds && cells.length; k++) {
        const [x, y] = cells.splice(rand("world", cells.length), 1)[0];
        stamp(x, y, T.GOLD);
      }
      if (b.kind === "crystal") {
        const ring = [[-5, -1], [5, 0], [0, -4], [-4, 4], [4, 4], [0, 5]];
        for (let k = 0; k < BIOME_FX.statues; k++) {
          const [dx, dy] = ring.splice(rand("world", ring.length), 1)[0];
          stamp(b.x + dx, b.y + dy, T.STATUE);
        }
      }
    } else if (b.kind === "rubble") {
      for (let k = 0; k < BIOME_FX.rubbleCount; k++) {
        const x = b.x - 5 + rand("world", 11);
        const y = b.y - 4 + rand("world", 9);
        if (tiles[y * COLS + x] === T.GRASS || tiles[y * COLS + x] === T.DIRT) stamp(x, y, T.RUBBLE);
      }
      stamp(b.x, b.y, T.STONE);
      stamp(b.x + 2, b.y - 1, T.STONE);
    }
  }
  const nearTrees = [[18, 18], [19, 16], [16, 20], [17, 22], [21, 17], [20, 23], [23, 18], [25, 22], [27, 18], [28, 20]];
  for (const [x, y] of nearTrees) stamp(x, y, T.TREE);
  for (let y = 26; y <= 29; y++) {
    for (let x = 20; x <= 27; x++) stamp(x, y, T.FARM);
  }
  stamp(21, 27, T.CROP);
  stamp(24, 28, T.CROP);
  stamp(26, 27, T.CROP);
  crops.set("21,27", { stage: 2, grow: 0 });
  crops.set("24,28", { stage: 2, grow: 0 });
  crops.set("26,27", { stage: 2, grow: 0 });
  for (let y = 7; y <= 21; y++) stamp(24, y, T.PATH);
  for (let y = 4; y <= 8; y++) {
    for (let x = 21; x <= 27; x++) {
      if (x === 21 || x === 27 || y === 4 || y === 8) stamp(x, y, T.BRICK);
    }
  }
  stamp(24, 6, T.PATH);
  stamp(24, 5, T.PATH);
  stamp(23, 6, T.PATH);
  stamp(25, 6, T.PATH);
  return { tiles, crops, biomes };
}

export function makePlayer(cls) {
  const def = CLASSES[cls];
  return {
    cls,
    x: 24 * TILE + 8,
    y: 21 * TILE + 8,
    vx: 0,
    vy: 0,
    dir: 0,
    frame: 0,
    anim: 0,
    hp: def.hp,
    maxHp: def.hp,
    mana: def.mana || 0,
    maxMana: def.mana || 0,
    invuln: 0,
    atkCd: 0,
    attack: 0,
    skillCd: 0,
    mine: 0,
    mineTx: -1,
    mineTy: -1,
    dash: 0,
    dashVx: 0,
    dashVy: 0,
    sense: 0,
    slashDx: 1,
    slashDy: 0,
    blockMine: false,
  };
}

export function dayRng() {
  return mulberry32(hashSeed(`${state.seed}:day:${state.nights}`));
}

export function dirName(x, y) {
  const a = Math.atan2(y - state.camp.y, x - state.camp.x);
  const names = ["东", "东南", "南", "西南", "西", "西北", "北", "东北"];
  return names[(Math.round(a / (Math.PI / 4)) + 8) % 8];
}

export function rollDayEvent() {
  state.dayEvent = null;
  if (state.nights < 1) return null;
  const r = dayRng();
  if (r() >= (has("star_map") ? 1 : DAY_EVENT_CHANCE)) {
    state.eventLog.push(`${state.nights}:-`);
    return null;
  }
  const total = DAY_EVENTS.reduce((s, e) => s + e.weight, 0);
  let roll = r() * total;
  let def = DAY_EVENTS[0];
  for (const e of DAY_EVENTS) {
    roll -= e.weight;
    if (roll < 0) {
      def = e;
      break;
    }
  }
  const ev = { id: def.id, name: def.name, delay: DAY_EVENT_FX.startDelay, started: false, x: 0, y: 0, tiles: [], trades: 0, trade: null, wait: 0 };
  if (def.id === "caravan") {
    ev.trade = TRADES[Math.floor(r() * TRADES.length)];
    ev.x = state.camp.x + 6 * TILE;
    ev.y = state.camp.y - 2 * TILE;
  } else if (def.id === "meteor") {
    for (let k = 0; k < 60; k++) {
      const tx = 3 + Math.floor(r() * (COLS - 6));
      const ty = 3 + Math.floor(r() * (ROWS - 6));
      if (Math.hypot(tx * TILE + 8 - state.camp.x, ty * TILE + 8 - state.camp.y) < 9 * TILE) continue;
      let ok = true;
      for (let y = ty - 1; y <= ty + 1 && ok; y++) {
        for (let x = tx - 1; x <= tx + 1; x++) {
          const t = tileAt(x, y);
          if (t !== T.GRASS && t !== T.DIRT) ok = false;
        }
      }
      if (!ok) continue;
      ev.x = tx * TILE + 8;
      ev.y = ty * TILE + 8;
      const cells = [];
      for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) cells.push([x, y]);
      const gold = new Set([4]);
      while (gold.size < DAY_EVENT_FX.meteorGold) gold.add(Math.floor(r() * cells.length));
      ev.tiles = cells.map(([x, y], i) => ({ x, y, t: gold.has(i) ? T.GOLD : T.STONE }));
      break;
    }
    if (!ev.tiles.length) return null;
  } else if (def.id === "migration") {
    const side = Math.floor(r() * 4);
    ev.side = side;
    ev.x = side === 0 ? 3 * TILE : side === 1 ? (COLS - 3) * TILE : state.camp.x;
    ev.y = side === 2 ? 3 * TILE : side === 3 ? (ROWS - 3) * TILE : state.camp.y;
    ev.wait = DAY_EVENT_FX.migrationDelay;
  }
  state.dayEvent = ev;
  state.eventLog.push(`${state.nights}:${def.id}`);
  return ev;
}

export function startDayEvent(ev) {
  ev.started = true;
  const where = dirName(ev.x, ev.y);
  if (ev.id === "caravan") {
    const give = Object.entries(ev.trade.give).map(([k, n]) => `${n}${labelOf(k)}`).join("");
    const get = Object.entries(ev.trade.get).map(([k, n]) => `${n}${labelOf(k)}`).join("");
    toast(`商队路过营地${where}边！走过去按 E：${give} 换 ${get}（限 ${DAY_EVENT_FX.caravanTrades} 次）。`, 4);
    beep(660, 0.08, "triangle", 0.04);
  } else if (ev.id === "meteor") {
    const ptx = Math.floor(state.player.x / TILE);
    const pty = Math.floor(state.player.y / TILE);
    ev.tiles = ev.tiles.filter((c) => !(c.x === ptx && c.y === pty));
    for (const c of ev.tiles) setTile(c.x, c.y, c.t);
    state.meteorSeen = true;
    burst(ev.x, ev.y, "#ffb020", 30, "boss");
    burst(ev.x, ev.y, "#6d727a", 14, "smoke");
    punch(6, 0.08);
    noise(0.3, 0.12, 300);
    toast(`陨石坠落在${where}边！里面有金，天黑前会冷却碎掉。`, 4);
  } else if (ev.id === "migration") {
    toast(`兽群从${where}边迁徙过来，${Math.ceil(ev.wait)} 秒后到。提前守好篝火！`, 4);
    beep(180, 0.14, "sawtooth", 0.05);
  }
}

export function endDayEvent() {
  const ev = state.dayEvent;
  state.dayEvent = null;
  if (!ev || !ev.started) return;
  if (ev.id === "meteor") {
    for (const c of ev.tiles) {
      const t = tileAt(c.x, c.y);
      if (t === T.GOLD || t === T.STONE) setTile(c.x, c.y, T.DIRT);
    }
  }
}

export function updateDayEvent(dt) {
  const ev = state.dayEvent;
  if (!ev || !state.day) return;
  if (!ev.started) {
    ev.delay -= dt;
    if (ev.delay <= 0) startDayEvent(ev);
    return;
  }
  if (ev.id === "migration" && ev.wait > 0) {
    ev.wait -= dt;
    if (ev.wait <= 0) {
      const n = DAY_EVENT_FX.migrationCount + (state.era - 1);
      for (let k = 0; k < n; k++) {
        const off = (k - (n - 1) / 2) * 20;
        const horiz = ev.side === 0 || ev.side === 1;
        let x = ev.x + (horiz ? 0 : off);
        let y = ev.y + (horiz ? off : 0);
        if (solid(Math.floor(x / TILE), Math.floor(y / TILE))) {
          x = ev.x;
          y = ev.y;
        }
        state.enemies.push(makeEnemy(k % 3 === 2 ? "bat" : "slime", x, y));
      }
      toast("兽群到了！", 2);
      punch(3, 0.04);
    }
  }
}

export function tradeCaravan() {
  const ev = state.dayEvent;
  if (!ev || ev.id !== "caravan" || !ev.started) return false;
  if (dist(state.player.x, state.player.y, ev.x, ev.y) > 26) return false;
  if (ev.trades >= DAY_EVENT_FX.caravanTrades) {
    toast("商队：今天的货换完了，下次再见。");
    return true;
  }
  const miss = Object.entries(ev.trade.give).filter(([k, n]) => (state.inv[k] || 0) < n);
  if (miss.length) {
    toast("商队：你的货不够——还差" + miss.map(([k, n]) => `${labelOf(k)}${n - (state.inv[k] || 0)}`).join("、"));
    return true;
  }
  const full = Object.entries(ev.trade.get).find(([k, n]) => roomFor(k) + (ev.trade.give[k] || 0) < n);
  if (full) {
    toast(`仓库满了，放不下${labelOf(full[0])}。先用掉一些或建仓库。`);
    return true;
  }
  for (const [k, n] of Object.entries(ev.trade.give)) state.inv[k] -= n;
  for (const [k, n] of Object.entries(ev.trade.get)) state.inv[k] = (state.inv[k] || 0) + n;
  ev.trades += 1;
  burst(ev.x, ev.y - 6, "#e8c040", 10);
  toast(`成交！（${ev.trades}/${DAY_EVENT_FX.caravanTrades}）`);
  beep(880, 0.06, "square", 0.04);
  syncHud();
  return true;
}
