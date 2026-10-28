import { BIOME_FX, BOSSES, CLASSES, COLS, ENEMIES, ENEMY_DROPS, ENEMY_FX, RELIC_FX, ROWS, SKY_FX, SPAWN_TABLE, T, TILE, VIEW_H, VIEW_W, WAVES } from "./data.js";
import { beep, hitSound, noise } from "./audio.js";
import { addDrop, burst, campTile, dist, dmgMul, eraMul, eraNights, fenceMax, floatText, flySolid, groundSolid, has, punch, rand, rnd, setTile, solid, state, tileAt } from "./core.js";
import { aimVec, die, faceVec } from "./game.js";
import { codexAdd } from "./meta.js";
import { camera, toast } from "./ui.js";

export function edef(e) {
  return ENEMIES[e.kind] || ENEMIES.slime;
}
export function isFlying(e) {
  return !!edef(e).flying;
}
export function targetable(e) {
  return !e.under;
}
export function burrowRevealed(e) {
  if (dist(e.x, e.y, state.camp.x, state.camp.y) < ENEMY_FX.burrowCampRadius) return "camp";
  const r = ENEMY_FX.burrowTorchRadius;
  const etx = Math.floor(e.x / TILE);
  const ety = Math.floor(e.y / TILE);
  const span = Math.ceil(r / TILE);
  for (let ty = ety - span; ty <= ety + span; ty++) {
    for (let tx = etx - span; tx <= etx + span; tx++) {
      if (tileAt(tx, ty) === T.TORCH && dist(e.x, e.y, tx * TILE + 8, ty * TILE + 8) < r) return "torch";
    }
  }
  return "";
}
export function canHitCamp(e) {
  const dCamp = dist(e.x, e.y, state.camp.x, state.camp.y);
  if (isFlying(e)) return dCamp < 16;
  if (e.kind === "thrower" || e.under) return false;
  const c = campTile();
  const etx = Math.floor(e.x / TILE);
  const ety = Math.floor(e.y / TILE);
  if (tileAt(etx, ety) === T.FENCE && !edef(e).burrow) return false;
  return Math.abs(etx - c.tx) + Math.abs(ety - c.ty) === 1;
}
export function damageCamp(amount) {
  if (state.campHp <= 0 || state.over) return;
  state.campHp = Math.max(0, state.campHp - amount * (has("ember_core") ? RELIC_FX.emberCoreCamp : 1));
  state.campFlash = 0.4;
  state.nightCampHit = true;
  burst(state.camp.x, state.camp.y - 8, "#ff6a20", 5);
  state.campPull = Math.max(state.campPull || 0, 1.2);
  punch(2.4, 0.03);
  const p = state.player;
  const cam = camera();
  const vw = VIEW_W * TILE;
  const vh = VIEW_H * TILE;
  const campOnScreen = state.camp.x >= cam.x && state.camp.x <= cam.x + vw
    && state.camp.y >= cam.y && state.camp.y <= cam.y + vh;
  if (!state.campHurtWarn) {
    state.campHurtWarn = true;
    toast(campOnScreen ? "篝火在掉血！守住它，灭了就失败。" : "篝火在掉血！镜头拉过去了，快回去。", 2.8);
  } else if (dist(p.x, p.y, state.camp.x, state.camp.y) > 70 && (state.campHurtCd || 0) <= 0) {
    state.campHurtCd = 3.5;
    state.campPull = Math.max(state.campPull || 0, 1.6);
    toast("篝火还在挨打！别追太远。", 2.2);
  }
  if (state.campHp <= 0) die("篝火熄灭");
}

export function hurt(ent, dmg, src) {
  if (ent === state.player && state.player.invuln > 0) return;
  ent.hp -= dmg;
  burst(ent.x, ent.y - 8, "#f07070", 6);
  floatText(ent.x, ent.y - 16, String(Math.ceil(dmg)), "#ffd0d0");
  beep(180, 0.07, "sawtooth", 0.04);
  if (ent === state.player) {
    state.player.invuln = 0.7;
    const dx = ent.x - (src ? src.x : ent.x);
    const dy = ent.y - (src ? src.y : ent.y);
    if (src && (dx || dy)) state.hurtDir = { a: Math.atan2(-dy, -dx), t: SKY_FX.hurtArrowSecs };
    const l = Math.hypot(dx, dy) || 1;
    ent.vx += (dx / l) * 40;
    ent.vy += (dy / l) * 40;
    if (ent.hp <= 0) die();
  }
}

export function meleeAttack() {
  const p = state.player;
  const f = aimVec();
  faceVec(f);
  const reach = p.cls === "knight" ? 34 : p.cls === "miner" ? 26 : 22;
  const dmg = Math.round(CLASSES[p.cls].melee * dmgMul());
  p.attack = 0.2;
  p.slashDx = f.dx;
  p.slashDy = f.dy;
  beep(240, 0.05, "square", 0.035);
  let hits = 0;
  for (const e of state.enemies) {
    if (!targetable(e)) continue;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < reach + (edef(e).boss ? 14 : 8) && dx * f.dx + dy * f.dy > -4) {
      e.hp -= dmg;
      e.flash = 0.14;
      e.stun = Math.max(e.stun || 0, 0.2);
      e.vx = f.dx * 140;
      e.vy = f.dy * 140;
      burst(e.x, e.y, "#fff4b0", 8);
      floatText(e.x, e.y - 12, String(dmg), "#fff");
      punch(2.4, 0.035);
      hitSound();
      hits += 1;
    }
  }
  if (hits > 1) floatText(p.x, p.y - 22, `连击x${hits}`, "#ffe27a");
}

export function startMine(tx, ty) {
  const p = state.player;
  if (p.mineTx === tx && p.mineTy === ty) return;
  p.mineTx = tx;
  p.mineTy = ty;
  p.mine = 0;
}

export function shoot() {
  const p = state.player;
  if (p.mana < 1) {
    toast("法力不足");
    return;
  }
  p.mana -= 1;
  const f = aimVec();
  faceVec(f);
  state.bolts.push({
    x: p.x, y: p.y - 6, vx: f.dx * 150, vy: f.dy * 150, life: 0.95, dmg: Math.round(CLASSES.mage.ranged * dmgMul()), nova: false, pierce: 2, hit: new Set(),
  });
  beep(720, 0.06, "sine", 0.04);
}

export function useSkill() {
  const p = state.player;
  if (p.skillCd > 0) return;
  p.skillCd = CLASSES[p.cls].skillCd;
  if (p.cls === "miner") {
    p.sense = 6;
    const q = (state.biomes || []).find((b) => b.kind === "quarry" || b.kind === "crystal");
    toast(q ? `矿脉在发亮。去${q.name}的${q.kind === "crystal" ? "晶洞" : "采石场"}看看。` : "矿脉在发亮。");
    beep(480, 0.1, "square", 0.05);
  } else if (p.cls === "farmer") {
    for (const [key, c] of state.crops) {
      c.stage = 2;
      c.grow = 0;
      const [tx, ty] = key.split(",").map(Number);
      burst(tx * TILE + 8, ty * TILE + 8, "#8dff9a", 8);
    }
    p.hp = Math.min(p.maxHp, p.hp + 24);
    toast("田里的麦子一下熟了。");
    beep(560, 0.1, "triangle", 0.05);
  } else if (p.cls === "mage") {
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      state.bolts.push({
        x: p.x, y: p.y - 6, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.6, dmg: Math.round(18 * dmgMul()), nova: true, pierce: 1, hit: new Set(),
      });
    }
    beep(900, 0.12, "sine", 0.05);
  } else if (p.cls === "knight") {
    const f = aimVec();
    faceVec(f);
    p.dash = 0.22;
    p.dashVx = f.dx * 220;
    p.dashVy = f.dy * 220;
    p.invuln = 0.28;
    beep(160, 0.08, "sawtooth", 0.04);
  }
}

export function makeEnemy(kind, x, y) {
  const def = ENEMIES[kind];
  codexAdd("enemies", kind);
  const hp = Math.round(def.hp * eraMul() * (has("blood_moon") ? RELIC_FX.bloodMoonHp : 1));
  return {
    kind, x, y, vx: 0, vy: 0, hp, maxHp: hp, spd: def.spd, dmg: def.dmg * eraMul(),
    hit: 0, flash: 0, bob: rnd("fx"), under: !!def.burrow, throwT: ENEMY_FX.throwCd * 0.5,
  };
}

export function bossNight() {
  return state.nights - state.eraStart === eraNights();
}

export function spawnEnemy() {
  const edges = [];
  for (let x = 1; x < COLS - 1; x++) {
    edges.push([x, 1], [x, ROWS - 2]);
  }
  for (let y = 2; y < ROWS - 2; y++) {
    edges.push([1, y], [COLS - 2, y]);
  }
  for (let k = 0; k < 24; k++) {
    const [tx, ty] = edges[rand("event", edges.length)];
    if (solid(tx, ty)) continue;
    const x = tx * TILE + 8;
    const y = ty * TILE + 8;
    if (dist(x, y, state.camp.x, state.camp.y) < 80) continue;
    let kind = "slime";
    for (const row of SPAWN_TABLE) {
      if (state.era >= row.minEra && state.nights >= row.minNight && state.wave >= row.minWave && rnd("event") < row.chance) kind = row.kind;
    }
    if (state.bossPending) {
      state.bossPending = false;
      kind = BOSSES[(state.era - 1) % BOSSES.length];
      announceBoss(kind);
    }
    const grove = kind === "spore" && (state.biomes || []).find((b) => b.kind === "mushroom");
    if (grove && rnd("event") < BIOME_FX.sporeNearMushroom) {
      const gx = grove.x - 4 + rand("event", 9);
      const gy = grove.y - 3 + rand("event", 7);
      if (!solid(gx, gy)) {
        const e = makeEnemy(kind, gx * TILE + 8, gy * TILE + 8);
        state.enemies.push(e);
        return e;
      }
    }
    const e = makeEnemy(kind, x, y);
    state.enemies.push(e);
    return e;
  }
}

export function hitFence(tx, ty, dmg, e, dt) {
  if (e && has("thorn_fence")) {
    e.hp -= RELIC_FX.thornFenceDps * dt;
    e.flash = Math.max(e.flash || 0, 0.05);
  }
  const key = `${tx},${ty}`;
  const hp = (state.fenceHp.get(key) || fenceMax()) - dmg;
  if (hp <= 0) {
    setTile(tx, ty, T.GRASS);
    state.fenceHp.delete(key);
    burst(tx * TILE + 8, ty * TILE + 8, "#8b5a2b", 8);
    punch(3, 0.04);
    noise(0.08, 0.09, 700);
    if (!state.fenceBreakWarn) {
      state.fenceBreakWarn = true;
      toast("栅栏破了！按 1 点空地补上。", 2.2);
    }
  } else {
    state.fenceHp.set(key, hp);
  }
}

export function enemyBlocked(e, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (isFlying(e)) return flySolid(tx, ty);
  if (edef(e).burrow) {
    const c = campTile();
    return solid(tx, ty) || (tx === c.tx && ty === c.ty);
  }
  return groundSolid(tx, ty);
}

export function announceBoss(kind) {
  const name = ENEMIES[kind].name;
  state.bossName = name;
  state.bossBanner = { name, t: SKY_FX.bossBannerSecs };
  toast(`⚠ 纪元 Boss · ${name} 破夜而来！`, 3.6);
  punch(6, 0.12);
  beep(90, 0.5, "sawtooth", 0.07);
  setTimeout(() => beep(70, 0.6, "sawtooth", 0.07), 220);
}

export function bossPhase(e) {
  if (e.phase2 || e.hp > e.maxHp * ENEMY_FX.bossPhaseAt) return;
  e.phase2 = true;
  punch(4, 0.08);
  if (e.kind === "slime_king") {
    for (let i = 0; i < ENEMY_FX.kingSplit; i++) {
      const a = (Math.PI * 2 * i) / ENEMY_FX.kingSplit;
      const s = makeEnemy("slime", e.x + Math.cos(a) * 12, e.y + Math.sin(a) * 12);
      s.stun = 0.3;
      s.vx = Math.cos(a) * 120;
      s.vy = Math.sin(a) * 120;
      state.enemies.push(s);
    }
    toast("巨史莱姆王裂开了！", 2.4);
  } else {
    e.spd *= ENEMY_FX.knightEnrageSpd;
    e.dmg *= ENEMY_FX.knightEnrageDmg;
    toast("暗影骑士狂暴了！", 2.4);
  }
  burst(e.x, e.y, "#d4454a", 20);
}

export function corrupt(tx, ty) {
  const r = ENEMY_FX.sporeRadius;
  for (let y = ty - r; y <= ty + r; y++) {
    for (let x = tx - r; x <= tx + r; x++) {
      const t = tileAt(x, y);
      const center = x === tx && y === ty;
      if (t === T.FARM || t === T.CROP || (center && (t === T.GRASS || t === T.DIRT || t === T.SAND || t === T.PATH))) {
        const c = campTile();
        if (x === c.tx && y === c.ty) continue;
        state.crops.delete(`${x},${y}`);
        setTile(x, y, T.SPORE);
      }
    }
  }
  burst(tx * TILE + 8, ty * TILE + 8, "#b77ad8", 14);
}

export function nearSpore(tx, ty) {
  for (let y = ty - 1; y <= ty + 1; y++) {
    for (let x = tx - 1; x <= tx + 1; x++) {
      if (tileAt(x, y) === T.SPORE) return true;
    }
  }
  return false;
}

export function throwRock(e) {
  const dx = state.camp.x - e.x;
  const dy = state.camp.y - e.y;
  const l = Math.hypot(dx, dy) || 1;
  state.rocks.push({
    x: e.x, y: e.y - 6, vx: (dx / l) * ENEMY_FX.rockSpeed, vy: (dy / l) * ENEMY_FX.rockSpeed, dmg: e.dmg, life: 2,
  });
  beep(120, 0.05, "square", 0.03);
}

export function updateRocks(dt) {
  const p = state.player;
  for (const r of state.rocks) {
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.life -= dt;
    const tx = Math.floor(r.x / TILE);
    const ty = Math.floor(r.y / TILE);
    const t = tileAt(tx, ty);
    if (t === T.FENCE) {
      hitFence(tx, ty, ENEMY_FX.rockFenceDmg);
      burst(r.x, r.y, "#9aa0a8", 6);
      r.life = 0;
    } else if (solid(tx, ty)) {
      r.life = 0;
    } else if (dist(r.x, r.y, p.x, p.y) < 9) {
      hurt(p, r.dmg * (p.cls === "knight" ? 1 - CLASSES.knight.dr : 1), r);
      r.life = 0;
    } else if (dist(r.x, r.y, state.camp.x, state.camp.y) < 9) {
      damageCamp(r.dmg * ENEMY_FX.rockCampMul);
      r.life = 0;
    }
  }
  state.rocks = state.rocks.filter((r) => r.life > 0);
}

export function startNightWaves() {
  state.wave = 0;
  state.wavesTotal = (state.nights === 1 ? WAVES.firstNight : WAVES.later) + (state.era - 1) * WAVES.perEra;
  state.toSpawn = 0;
  state.waveWait = 2.2;
}

export function beginWave() {
  state.wave += 1;
  state.toSpawn = WAVES.baseSpawn + state.nights + state.wave;
  if (bossNight() && state.wave === state.wavesTotal) {
    state.bossPending = true;
    state.toSpawn += 1;
  }
  state.spawnAcc = 0;
  state.waveWait = 0;
  toast(`第 ${state.nights} 夜 · 第 ${state.wave}/${state.wavesTotal} 波来了！`, 2.4);
  beep(180, 0.1, "sawtooth", 0.05);
}

export function updateEnemies(dt) {
  const p = state.player;
  const grace = state.nights === 1 && state.cycle < 5;
  if (!state.day && !grace) {
    if (state.toSpawn > 0) {
      state.spawnAcc += dt;
      if (state.spawnAcc > 0.42) {
        state.spawnAcc = 0;
        spawnEnemy();
        state.toSpawn -= 1;
      }
    } else if (state.wave < state.wavesTotal && state.enemies.length === 0) {
      state.waveWait += dt;
      if (state.waveWait > 2.2) beginWave();
    }
  }
  if (!state.day && state.howl > 0) state.howl = Math.max(0, state.howl - dt);
  for (const e of state.enemies) {
    const dPlayer = dist(e.x, e.y, p.x, p.y);
    if (state.howl > 0) e.hp -= RELIC_FX.wolfHowlDps * dt;
    const def = edef(e);
    let revealed = "";
    if (def.burrow) {
      revealed = burrowRevealed(e);
      const wasUnder = e.under;
      e.under = !revealed;
      if (wasUnder && !e.under) burst(e.x, e.y, "#8b5a2b", 6);
    }
    if (def.boss) bossPhase(e);
    if (state.player.dash > 0 && dPlayer < 16 && !e.dashHit && targetable(e)) {
      e.dashHit = true;
      e.hp -= 14 * dmgMul();
      e.stun = Math.max(e.stun || 0, 0.18);
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const l = Math.hypot(dx, dy) || 1;
      e.vx = (dx / l) * 160;
      e.vy = (dy / l) * 160;
      e.flash = 0.12;
      burst(e.x, e.y, "#fff4b0", 6);
    }
    if (state.player.dash <= 0) e.dashHit = false;
    e.hit = Math.max(0, e.hit - dt);
    e.flash = Math.max(0, (e.flash || 0) - dt);
    if ((e.stun || 0) > 0) {
      e.stun -= dt;
      const nx = e.x + e.vx * dt;
      const ny = e.y + e.vy * dt;
      if (!enemyBlocked(e, nx, e.y)) e.x = nx;
      if (!enemyBlocked(e, e.x, ny)) e.y = ny;
      e.vx *= Math.pow(0.04, dt);
      e.vy *= Math.pow(0.04, dt);
    } else {
      const aimPlayer = (isFlying(e) || dPlayer < 28) && !e.under && e.kind !== "thrower";
      const tx = aimPlayer ? p.x : state.camp.x;
      const ty = aimPlayer ? p.y : state.camp.y;
      const dx = tx - e.x;
      const dy = ty - e.y;
      const len = Math.hypot(dx, dy) || 1;
      let spd = e.spd;
      const etx = Math.floor(e.x / TILE);
      const ety = Math.floor(e.y / TILE);
      if (tileAt(etx, ety) === T.TORCH) spd *= 0.7;
      if (has("wind_chime") && dist(e.x, e.y, state.camp.x, state.camp.y) < RELIC_FX.windChimeRadius) spd *= RELIC_FX.windChimeSlow;
      if (state.howl > 0) spd *= RELIC_FX.wolfHowlSlow;
      if (revealed === "torch") spd *= ENEMY_FX.burrowRevealSlow;
      if (e.kind === "thrower" && dist(e.x, e.y, state.camp.x, state.camp.y) < ENEMY_FX.throwRange) {
        spd = 0;
        e.throwT -= dt;
        if (e.throwT <= 0) {
          e.throwT = ENEMY_FX.throwCd;
          throwRock(e);
        }
      }
      e.vx = (dx / len) * spd;
      e.vy = (dy / len) * spd;
      const nx = e.x + e.vx * dt;
      const ny = e.y + e.vy * dt;
      if (!enemyBlocked(e, nx, e.y)) e.x = nx;
      else {
        const ftx = Math.floor(nx / TILE);
        const fty = Math.floor(e.y / TILE);
        if (!isFlying(e) && !def.burrow && tileAt(ftx, fty) === T.FENCE) hitFence(ftx, fty, ENEMY_FX.fenceDps * (def.fenceMul || 1) * dt, e, dt);
      }
      if (!enemyBlocked(e, e.x, ny)) e.y = ny;
      else {
        const ftx = Math.floor(e.x / TILE);
        const fty = Math.floor(ny / TILE);
        if (!isFlying(e) && !def.burrow && tileAt(ftx, fty) === T.FENCE) hitFence(ftx, fty, ENEMY_FX.fenceDps * (def.fenceMul || 1) * dt, e, dt);
      }
    }
    if (dPlayer < (def.boss ? 20 : 14) && e.hit <= 0 && !e.under) {
      e.hit = 0.85;
      let dmg = e.dmg;
      if (p.cls === "knight") dmg *= 1 - CLASSES.knight.dr;
      hurt(p, dmg, e);
    } else if (canHitCamp(e) && e.hit <= 0 && state.campHp > 0) {
      const home = dist(p.x, p.y, state.camp.x, state.camp.y) < 28;
      if (home && dPlayer < 24) {
        e.hit = 0.85;
        let dmg = e.dmg;
        if (p.cls === "knight") dmg *= 1 - CLASSES.knight.dr;
        hurt(p, dmg, e);
        continue;
      }
      if (home) continue;
      e.hit = 0.7;
      damageCamp(e.dmg * 0.85);
    }
  }
  state.enemies = state.enemies.filter((e) => {
    if (e.hp > 0) return true;
    punch(2.6, 0.045);
    burst(e.x, e.y, "#8dff9a", 8);
    state.kills += 1;
    state.nightKills = (state.nightKills || 0) + 1;
    const def = edef(e);
    if (def.spore) corrupt(Math.floor(e.x / TILE), Math.floor(e.y / TILE));
    const luck = has("lucky_coin") ? RELIC_FX.luckyCoinDrop : 1;
    const n = (has("blood_moon") ? RELIC_FX.bloodMoonDrop : 1) * (def.boss ? 4 : 1);
    for (const d of ENEMY_DROPS) {
      if (rnd("loot") < d.chance * luck) addDrop(d.kind, e.x, e.y, n);
    }
    if (def.boss) {
      state.bossKills = (state.bossKills || 0) + 1;
      state.bossName = "";
      burst(e.x, e.y, "#ffe27a", 30, "boss");
      burst(e.x, e.y, "#fff4b0", 16, "spark");
      punch(7, 0.14);
      toast(`${def.name} 倒下了！`, 3);
      beep(523, 0.2, "square", 0.06);
    }
    return false;
  });
}

export function updateBolts(dt) {
  for (const b of state.bolts) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (!b.hit) b.hit = new Set();
    for (const e of state.enemies) {
      if (b.hit.has(e) || !targetable(e)) continue;
      if (dist(b.x, b.y, e.x, e.y) < (edef(e).boss ? 17 : 11)) {
        b.hit.add(e);
        e.hp -= b.dmg;
        e.flash = 0.12;
        e.stun = Math.max(e.stun || 0, 0.12);
        burst(e.x, e.y, "#4ee8ff", 7);
        const spd = Math.hypot(b.vx, b.vy) || 1;
        b.x += (b.vx / spd) * 14;
        b.y += (b.vy / spd) * 14;
        b.pierce = (b.pierce || 1) - 1;
        if (b.pierce <= 0) b.life = 0;
      }
    }
    const tx = Math.floor(b.x / TILE);
    const ty = Math.floor(b.y / TILE);
    if (!b.arrow && solid(tx, ty)) b.life = 0;
  }
  state.bolts = state.bolts.filter((b) => b.life > 0);
}
