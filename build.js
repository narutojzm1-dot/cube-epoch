import { AP_BASE, AP_COST, BIOME_FX, BUILDINGS, BUILD_FX, CAP_BASE, WAREHOUSE_CAP, CLASSES, COLS, ENEMY_FX, NEED, RELIC_FX, ROWS, T, TILE } from "./data.js";
import { beep, chopSound } from "./audio.js";
import { isFlying, makeEnemy, nearSpore, targetable } from "./combat.js";
import { addDrop, burst, campWalled, dist, fenceMax, floatText, has, inBounds, labelOf, nightsLeft, punch, rand, rnd, setTile, state, survivedNights, tileAt } from "./core.js";
import { campGaps, syncHud, toast } from "./ui.js";

export function eatWheat() {
  if (!state || state.paused || state.over) return;
  if ((state.inv.wheat || 0) <= 0) {
    toast("没有麦子。去南边农田收，或夜里打怪有时会掉。");
    return;
  }
  if (state.player.hp >= state.player.maxHp - 0.2) {
    toast("生命已满，先留着麦子。");
    return;
  }
  state.inv.wheat -= 1;
  state.heals.wheat = true;
  const heal = (state.cls === "farmer" ? 22 : 14) + (has("harvest_charm") ? RELIC_FX.harvestCharmHeal : 0);
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
  floatText(state.player.x, state.player.y - 18, `+${heal}`, "#8dff9a");
  toast(`吃掉一束麦，回复 ${heal} 生命。`);
  beep(520, 0.06, "triangle", 0.04);
  syncHud();
}

export function apMax() {
  return AP_BASE + (has("sundial_shard") ? RELIC_FX.sundialAp : 0);
}

export function apCostOfTile(t) {
  if (!state.day) return 0;
  if (t === T.TREE) return AP_COST.chop;
  if (t === T.STONE || t === T.GOLD) return AP_COST.mine;
  return 0;
}

export function apShort(n, what) {
  if (!state.day || state.ap >= n) return false;
  if (state.apWarn <= 0) {
    toast(`日晷用尽：今天不能再${what}。收麦、拆除和夜里的行动不耗点。`, 2.6);
    beep(160, 0.08, "square", 0.03);
    state.apWarn = 2.4;
  }
  return true;
}

export function spendAp(n) {
  if (!state.day || n <= 0) return;
  state.ap = Math.max(0, state.ap - n);
  syncHud();
}

export function undoPlace() {
  const u = state.lastPlace;
  state.lastPlace = null;
  if (!u || u.day !== state.nights || !state.day || tileAt(u.tx, u.ty) !== u.tile) {
    toast("没有可以撤销的建造。");
    return false;
  }
  setTile(u.tx, u.ty, u.prev);
  if (u.tile === T.FENCE) state.fenceHp.delete(`${u.tx},${u.ty}`);
  if (u.tile === T.TOWER) state.towersBuilt = Math.max(0, state.towersBuilt - 1);
  if (u.stored) state.inv[u.stored] += 1;
  else for (const [k, n] of Object.entries(u.paid)) state.inv[k] = (state.inv[k] || 0) + n;
  state.ap = Math.min(apMax(), state.ap + u.ap);
  burst(u.tx * TILE + 8, u.ty * TILE + 8, "#c0c4cc", 6);
  toast("撤销了上一次建造，材料和日晷点已退回。");
  beep(300, 0.05, "triangle", 0.03);
  syncHud();
  return true;
}

export function warehouseCount() {
  let n = 0;
  for (const t of state.tiles) if (t === T.WAREHOUSE) n += 1;
  return n;
}
export function capOf(kind) {
  if (!(kind in CAP_BASE)) return Infinity;
  return CAP_BASE[kind] + warehouseCount() * WAREHOUSE_CAP[kind];
}
export function roomFor(kind) {
  return Math.max(0, capOf(kind) - (state.inv[kind] || 0));
}
export function warnFull(kind) {
  if (state.time - (state.fullWarnAt || -99) < 3) return;
  state.fullWarnAt = state.time;
  toast(`仓库满了：${labelOf(kind)}最多 ${capOf(kind)}。按 7 建仓库可以多放。`, 2.6);
}

export function buildCost(kind) {
  const def = BUILDINGS[kind];
  if (!def) return {};
  return { ...def.cost, ...((def.classCost && def.classCost[state.cls]) || {}) };
}

export function canPay(cost) {
  return Object.entries(cost).every(([k, n]) => (state.inv[k] || 0) >= n);
}

export function pay(cost) {
  for (const [k, n] of Object.entries(cost)) state.inv[k] -= n;
}

export function setBuild(kind, opts) {
  if (!state || state.over) return;
  if (!kind) {
    state.build = null;
    syncHud();
    return;
  }
  if (opts && opts.toggle && state.build === kind) {
    state.build = null;
    syncHud();
    return;
  }
  if (!BUILDINGS[kind]) return;
  const changed = state.build !== kind;
  state.build = kind;
  if (changed) {
    const def = BUILDINGS[kind];
    toast(`建造${def.name}（${costText(kind)}）。${def.desc ? def.desc : "点空地放下，点坏墙修好。"}空格拆除。`);
  }
  syncHud();
}

export function costText(kind) {
  const cost = buildCost(kind);
  const bits = Object.entries(cost).filter(([, n]) => n > 0).map(([k, n]) => `${n}${labelOf(k)}`);
  return bits.length ? bits.join("") : "免费";
}

export function placeable(tx, ty) {
  if (!inBounds(tx, ty)) return false;
  const t = tileAt(tx, ty);
  if (!(t === T.GRASS || t === T.DIRT || t === T.PATH || t === T.SAND)) return false;
  const px0 = tx * TILE + 8;
  const py0 = ty * TILE + 8;
  if (dist(px0, py0, state.bench.x, state.bench.y) < 16) return false;
  if (dist(px0, py0, state.altar.x, state.altar.y) < 16) return false;
  if (dist(px0, py0, state.camp.x, state.camp.y) < 16) return false;
  const ptx = Math.floor(state.player.x / TILE);
  const pty = Math.floor(state.player.y / TILE);
  if (tx === ptx && ty === pty) return false;
  return true;
}

export function tryPlace(tx, ty) {
  const kind = state.build;
  if (!kind) return false;
  if (kind === "fence" && tileAt(tx, ty) === T.FENCE) {
    const key = `${tx},${ty}`;
    const hp = state.fenceHp.get(key) || fenceMax();
    if (hp >= fenceMax() - 0.5) {
      return true;
    }
    if ((state.inv.wood || 0) < 1) {
      toast("修墙需要 1 木。");
      return true;
    }
    if (apShort(AP_COST.repair, "修墙")) return true;
    spendAp(AP_COST.repair);
    state.repairs += 1;
    state.inv.wood -= 1;
    state.fenceHp.set(key, fenceMax());
    burst(tx * TILE + 8, ty * TILE + 8, "#c4a06a", 6);
    toast("栅栏修好了。");
    beep(360, 0.05, "triangle", 0.04);
    return true;
  }
  if (!placeable(tx, ty)) {
    toast("这里放不下。对着草地、泥土或土路。");
    return true;
  }
  const cost = buildCost(kind);
  const def = BUILDINGS[kind];
  const stored = def.stored || null;
  const hasStored = !!stored && (state.inv[stored] || 0) > 0;
  if (!hasStored && !canPay(cost)) {
    const miss = Object.entries(cost).filter(([k, n]) => (state.inv[k] || 0) < n).map(([k, n]) => `${labelOf(k)}${n}`);
    toast("材料不够：" + miss.join("、"));
    return true;
  }
  if (apShort(AP_COST.build, "建造")) return true;
  const apPaid = state.day ? AP_COST.build : 0;
  spendAp(apPaid);
  const prev = tileAt(tx, ty);
  if (hasStored) state.inv[stored] -= 1;
  else pay(cost);
  const openBefore = kind === "fence" && !campWalled();
  setTile(tx, ty, T[def.tile]);
  if (kind === "fence") state.fenceHp.set(`${tx},${ty}`, fenceMax());
  if (kind === "tower") state.towersBuilt += 1;
  state.lastPlace = { tx, ty, prev, tile: tileAt(tx, ty), stored: hasStored ? stored : null, paid: hasStored ? {} : cost, ap: apPaid, day: state.nights };
  state.flags.built = true;
  burst(tx * TILE + 8, ty * TILE + 8, "#ffe27a", 8);
  beep(400, 0.05, "square", 0.04);
  if (openBefore && campWalled()) {
    toast("四边围好了。再砍两棵树，木头还要留给方块之心。", 3);
  } else if (kind === "fence" && openBefore) {
    toast(`围上了。还差 ${campGaps().length} 面，点下一个发光格。`, 2.4);
  }
  return true;
}

export function isResource(tx, ty) {
  const t = tileAt(tx, ty);
  return t === T.TREE || t === T.STONE || t === T.GOLD || t === T.RUBBLE
    || (t === T.CROP && (state.crops.get(`${tx},${ty}`)?.stage || 0) >= 2);
}
export function isDismantle(tx, ty) {
  const t = tileAt(tx, ty);
  return t === T.FENCE || t === T.TORCH || t === T.SPORE || t === T.TOWER || t === T.SPIKE || t === T.SPRING || t === T.WAREHOUSE;
}
export function isMineable(tx, ty) {
  return isResource(tx, ty) || isDismantle(tx, ty);
}

export function gatherTile(tx, ty) {
  const t = tileAt(tx, ty);
  const cx = tx * TILE + 8;
  const cy = ty * TILE + 8;
  const apCost = apCostOfTile(t);
  if (apCost && apShort(apCost, t === T.TREE ? "砍树" : "挖矿")) return false;
  spendAp(apCost);
  if (t === T.TREE) {
    setTile(tx, ty, T.DIRT);
    addDrop("wood", cx, cy, 3 + rand("loot", 2));
    if (!state.flags.chopped) state.benchHint = 8;
    state.flags.chopped = true;
    floatText(cx, cy - 14, "+木", "#e8c040");
    burst(cx, cy, "#6bcf6b", 16);
    burst(cx, cy, "#8b5a2b", 8, "debris");
    punch(3.2, 0.045);
    chopSound();
  } else if (t === T.STONE) {
    setTile(tx, ty, T.DIRT);
    addDrop("stone", cx, cy, 2 + rand("loot", 2));
    burst(cx, cy, "#c0c4cc", 10);
    beep(200, 0.05, "square", 0.04);
  } else if (t === T.GOLD) {
    setTile(tx, ty, T.STONE);
    addDrop("gold", cx, cy, 1 + (state.cls === "miner" ? 1 : 0) + rand("loot", 2));
    burst(cx, cy, "#e8c040", 12);
    beep(740, 0.08, "square", 0.05);
    wakeStatue(tx, ty);
  } else if (t === T.RUBBLE) {
    setTile(tx, ty, T.GRASS);
    addDrop("stone", cx, cy, BIOME_FX.rubbleStone);
    burst(cx, cy, "#a8acb4", 6);
    beep(240, 0.04, "square", 0.03);
  } else if (t === T.TOWER || t === T.SPIKE || t === T.SPRING || t === T.WAREHOUSE) {
    setTile(tx, ty, T.GRASS);
    const back = t === T.TOWER ? ["stone", 2] : t === T.SPIKE ? ["wood", 1] : t === T.WAREHOUSE ? ["wood", 2] : ["stone", 1];
    addDrop(back[0], cx, cy, back[1]);
    burst(cx, cy, "#c0c4cc", 8);
    beep(220, 0.05, "square", 0.03);
  } else if (t === T.CROP) {
    const key = `${tx},${ty}`;
    const c = state.crops.get(key);
    if (c && c.stage >= 2) {
      setTile(tx, ty, T.FARM);
      state.crops.delete(key);
      addDrop("wheat", cx, cy, 1 + (state.cls === "farmer" ? 1 : 0));
      addDrop("seed", cx, cy, 1);
      if (state.cls === "farmer") {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 18);
        floatText(cx, cy - 10, "+18", "#8dff9a");
        state.heals.harvest = true;
      }
      burst(cx, cy, "#e8c040", 8);
      beep(500, 0.06, "triangle", 0.04);
    }
  } else if (t === T.FENCE) {
    setTile(tx, ty, T.GRASS);
    state.fenceHp.delete(`${tx},${ty}`);
    addDrop("wood", cx, cy, 1);
    burst(cx, cy, "#8b5a2b", 6);
    beep(220, 0.05, "square", 0.03);
  } else if (t === T.TORCH) {
    setTile(tx, ty, T.GRASS);
    addDrop("wood", cx, cy, 1);
    burst(cx, cy, "#ffb020", 8);
  } else if (t === T.SPORE) {
    setTile(tx, ty, T.DIRT);
    burst(cx, cy, "#b77ad8", 8);
    beep(260, 0.05, "triangle", 0.03);
  }
}

export function wakeStatue(tx, ty) {
  const r = BIOME_FX.statueWakeRadius;
  let best = null;
  for (let y = ty - r; y <= ty + r; y++) {
    for (let x = tx - r; x <= tx + r; x++) {
      if (tileAt(x, y) !== T.STATUE) continue;
      const d = Math.hypot(x - tx, y - ty);
      if (d <= r && (!best || d < best.d)) best = { x, y, d };
    }
  }
  if (!best || rnd("loot") >= BIOME_FX.statueWakeChance) return null;
  setTile(best.x, best.y, T.GRASS);
  state.statueWoke = true;
  const e = makeEnemy("cube", best.x * TILE + 8, best.y * TILE + 8);
  state.enemies.push(e);
  burst(e.x, e.y, "#9aa0ff", 16);
  punch(4, 0.06);
  toast("挖金的声音吵醒了石像！", 2.4);
  beep(110, 0.18, "sawtooth", 0.05);
  return e;
}

export function plant(tx, ty) {
  if (tileAt(tx, ty) !== T.FARM) return false;
  if (state.inv.seed <= 0) {
    toast("没有种子了。收麦可以再拿到种子。");
    return false;
  }
  state.inv.seed -= 1;
  setTile(tx, ty, T.CROP);
  state.crops.set(`${tx},${ty}`, { stage: 0, grow: 0 });
  if (!state.flags.planted) {
    state.flags.planted = true;
    toast(state.cls === "farmer" ? "播下了。你种的麦熟得更快。" : "播下了。长大后按住左键收。");
  }
  beep(400, 0.05, "triangle", 0.04);
  return true;
}

export function craft() {
  const inv = state.inv;
  if (inv.heart > 0) {
    toast("方块之心已经在背包里。送到北边祭坛。");
    return;
  }
  const miss = [];
  for (const [k, n] of Object.entries(NEED)) {
    if (inv[k] < n) miss.push(`${labelOf(k)} ${n - inv[k]}`);
  }
  if (miss.length) {
    toast("还差：" + miss.join("、"));
    return;
  }
  inv.wood -= NEED.wood;
  inv.stone -= NEED.stone;
  inv.gold -= NEED.gold;
  inv.wheat -= NEED.wheat;
  inv.heart += 1;
  state.flags.crafted = true;
  burst(state.bench.x, state.bench.y - 8, "#fff4b0", 16);
  toast(survivedNights() && state.day
    ? "合成成功！沿土路向北，天亮把心放到祭坛。"
    : `合成成功！先再守 ${nightsLeft()} 夜，天亮再到北边祭坛。`, 3.2);
  beep(880, 0.1, "square", 0.06);
}

export function updateDrops(dt) {
  const p = state.player;
  for (const d of state.drops) {
    d.vz += 180 * dt;
    d.z -= d.vz * dt;
    if (d.z < 0) {
      d.z = 0;
      d.vz *= -0.3;
    }
    d.life -= dt;
    const dd = dist(d.x, d.y, p.x, p.y);
    if (dd < 56 && roomFor(d.kind) <= 0) {
      if (dd < 18) warnFull(d.kind);
      continue;
    }
    if (dd < 56 && dd > 1) {
      d.x += (p.x - d.x) * 11 * dt;
      d.y += (p.y - d.y) * 11 * dt;
    }
    if (dd < 18) {
      state.inv[d.kind] = (state.inv[d.kind] || 0) + 1;
      d.life = 0;
      beep(660, 0.04, "square", 0.03);
      floatText(d.x, d.y - 12, "+" + labelOf(d.kind), d.kind === "gold" ? "#ffe27a" : "#e8dcc8");
      if (d.kind === "wood" && !state.flags.gathered) {
        state.flags.gathered = true;
        toast("木头进背包了。按 1 选栅栏，料不够再砍一棵，点发光格围上。", 3.4);
      }
      if (d.kind === "wheat" && !state.flags.sawWheat) {
        state.flags.sawWheat = true;
        toast("点背包里的「麦」或按 H，可以吃掉回血。", 2.8);
      }
    }
  }
  state.drops = state.drops.filter((d) => d.life > 0);
}

export function updateBuildings(dt) {
  const p = state.player;
  for (const [key, cd] of state.towerCd) state.towerCd.set(key, cd - dt);
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const t = tileAt(tx, ty);
      if (t !== T.TOWER && t !== T.SPRING) continue;
      const cx = tx * TILE + 8;
      const cy = ty * TILE + 8;
      if (t === T.SPRING) {
        if (dist(p.x, p.y, cx, cy) < BUILD_FX.springRadius && p.hp < p.maxHp) {
          state.heals.spring = true;
          p.hp = Math.min(p.maxHp, p.hp + BUILD_FX.springHeal * dt);
        }
        continue;
      }
      const key = `${tx},${ty}`;
      if ((state.towerCd.get(key) || 0) > 0) continue;
      let target = null;
      let best = BUILD_FX.towerRange;
      for (const e of state.enemies) {
        if (!targetable(e)) continue;
        const d = dist(e.x, e.y, cx, cy);
        if (d < best) {
          best = d;
          target = e;
        }
      }
      if (!target) continue;
      state.towerCd.set(key, BUILD_FX.towerCd);
      const dx = (target.x - cx) / (best || 1);
      const dy = (target.y - cy) / (best || 1);
      state.bolts.push({
        x: cx, y: cy - 6, vx: dx * BUILD_FX.towerBoltSpeed, vy: dy * BUILD_FX.towerBoltSpeed,
        life: BUILD_FX.towerRange / BUILD_FX.towerBoltSpeed + 0.2, dmg: BUILD_FX.towerDmg, arrow: true, pierce: 1, hit: new Set(),
      });
      beep(980, 0.03, "triangle", 0.02);
    }
  }
  for (const e of state.enemies) {
    if (isFlying(e) || e.under) continue;
    if (tileAt(Math.floor(e.x / TILE), Math.floor(e.y / TILE)) === T.SPIKE) {
      e.hp -= BUILD_FX.spikeDps * dt;
      e.flash = Math.max(e.flash || 0, 0.05);
    }
  }
}

export function updateCrops(dt) {
  const growMul = state.cls === "farmer" ? CLASSES.farmer.grow : 1;
  for (const [key, c] of state.crops) {
    if (c.stage >= 2) continue;
    const [tx, ty] = key.split(",").map(Number);
    c.grow += dt * growMul * (nearSpore(tx, ty) ? ENEMY_FX.sporeGrowMul : 1);
    const need = c.stage === 0 ? 7 : 8;
    if (c.grow >= need) {
      c.grow = 0;
      c.stage += 1;
    }
  }
}
