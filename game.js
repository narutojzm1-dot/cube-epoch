import { DAY_LEN, FIRST_DAY_LEN, AP_BASE, BUILDINGS, CAMP_MAX, CLASSES, DAWN_CHOICES, DAY_EVENT_FX, ERA_NIGHTS_STEP, ERA_SCALING, RELICS, RELIC_FX, RELIC_TYPE_LABEL, T, TILE, WAVES, WIN_NIGHTS } from "./data.js";
import { beep, cycleAudio, ensureAudio, footstep, playMusicPulse } from "./audio.js";
import { apCostOfTile, apMax, apShort, capOf, costText, craft, eatWheat, gatherTile, isDismantle, isMineable, isResource, placeable, plant, setBuild, tryPlace, undoPlace, updateBuildings, updateCrops, updateDrops } from "./build.js";
import { spawnEnemy, makeEnemy, meleeAttack, shoot, startMine, startNightWaves, targetable, updateBolts, updateEnemies, updateRocks, useSkill } from "./combat.js";
import { hasSeenWorld, markSeenWorld, burst, campWalled, dist, eraName, eraNights, fenceMax, floatText, has, inBounds, keys, last, looping, makeStreams, materialsReady, mouse, newSeed, nightsLeft, pendingSeed, nightRng, selectedClass, setLast, setLooping, setPendingSeed, setRng, setSelectedClass, setState, setToastTimer, state, survivedNights, tileAt, toastTimer, tryMove, urlSeed } from "./core.js";
import { checkAch, codexAdd, codexText, dailySeed, highlights, isDaily, isUnlocked, meta, openCodex, recordRun, runDifficulty, setDifficulty, shareText, titleStatsText, updateAch } from "./meta.js";
import { render, skyTint } from "./render.js";
import { currentTarget, campGaps, canAffordNextFence, canOffer, BRIEF, advanceBrief, advanceIntro, brief, briefingBox, briefingCursor, briefingText, btnCodex, btnDaily, btnHelp, btnMute, btnPause, btnSkipBrief, btnSkipGuide, btnSkipIntro, btnStart, camera, canvas, copyText, endBriefing, finishIntro, intro, introBox, manaWrap, overlay, playIntro, resize, screenGame, screenIntro, screenTitle, setPrompt, showOverlay, skillName, startBriefing, syncGuide, syncHud, titleStats, toast, toastEl, togglePause } from "./ui.js";
import { endDayEvent, genWorld, makePlayer, rollDayEvent, tradeCaravan, updateDayEvent } from "./world.js";

export function startGame(cls, opts) {
  if (intro.active) {
    intro.active = false;
    if (intro.raf) cancelAnimationFrame(intro.raf);
    intro.raf = 0;
    screenIntro.classList.add("hidden");
  }
  const briefOn = !!(opts && opts.brief);
  const seed = String((opts && opts.seed) || pendingSeed || urlSeed || newSeed());
  setPendingSeed("");
  setRng(makeStreams(seed));
  const world = genWorld();
  const def = CLASSES[cls];
  setState({
    cls,
    seed,
    difficulty: runDifficulty(seed, opts && opts.difficulty),
    tiles: world.tiles,
    crops: world.crops,
    player: makePlayer(cls),
    inv: {
      wood: 2,
      stone: 0,
      gold: 0,
      wheat: 0,
      seed: def.seeds || 2,
      fence: cls === "knight" ? 2 : 0,
      torch: cls === "mage" ? 1 : 0,
      plot: cls === "farmer" ? 1 : 0,
      heart: 0,
    },
    build: null,
    campHp: CAMP_MAX,
    fenceHp: new Map(),
    campHurtWarn: false,
    campHurtCd: 0,
    campPull: 0,
    campFlash: 0,
    fenceBreakWarn: false,
    campHint: 6,
    benchHint: 0,
    rLatch: false,
    briefing: false,
    briefStep: 0,
    look: { x: 24 * TILE + 8, y: 21 * TILE + 8 },
    lookTo: { x: 22 * TILE + 8, y: 21 * TILE + 8 },
    enemies: [],
    drops: [],
    bolts: [],
    rocks: [],
    particles: [],
    floats: [],
    bench: { x: 24 * TILE + 8, y: 19 * TILE + 8 },
    altar: { x: 24 * TILE + 8, y: 6 * TILE + 8 },
    camp: { x: 22 * TILE + 8, y: 21 * TILE + 8 },
    day: true,
    cycle: 0,
    dayLen: FIRST_DAY_LEN,
    nightLen: 26,
    nights: 0,
    time: 0,
    paused: false,
    over: false,
    win: false,
    spawnAcc: 0,
    toSpawn: 0,
    wave: 0,
    wavesTotal: 0,
    waveWait: 0,
    shake: 0,
    hitstop: 0,
    footAcc: 0,
    musicAcc: 0,
    musicStep: 0,
    kills: 0,
    era: 1,
    eraStart: 0,
    relics: [],
    picks: [],
    choosing: false,
    howlPending: false,
    howl: 0,
    bossPending: false,
    bossName: "",
    bossKills: 0,
    nightKills: 0,
    nightCampHit: false,
    ap: AP_BASE,
    apWarn: 0,
    lastPlace: null,
    towerCd: new Map(),
    dayEvent: null,
    eventLog: [],
    repairs: 0,
    heals: {},
    towersBuilt: 0,
    statueWoke: false,
    meteorSeen: false,
    recorded: false,
    achQueue: [],
    hl: { campLow: CAMP_MAX, campLowNight: 0, bestKills: 0, bestKillsNight: 0, boss: [] },
    achAcc: 0,
    biomes: world.biomes,
    nightWarned: false,
    skippedGuide: false,
    flags: { moved: false, chopped: false, gathered: false, crafted: false, offered: false, planted: false, sawWheat: false, built: false },
  });
  screenTitle.classList.add("hidden");
  screenGame.classList.remove("hidden");
  skillName.textContent = def.skill;
  manaWrap.classList.toggle("hidden", cls !== "mage");
  resize();
  beep(520, 0.08, "square", 0.05);
  syncGuide();
  setLast(performance.now());
  if (briefOn) startBriefing();
  else {
    markSeenWorld();
    toast("金框指着附近的树。WASD 走过去，空格或按住左键砍。", 3.2);
  }
  if (!looping) {
    setLooping(true);
    requestAnimationFrame(loop);
  }
}

function mouseWorld() {
  const scale = Number(canvas.dataset.scale || 3);
  const cam = camera();
  return { x: cam.x + mouse.x / scale, y: cam.y + mouse.y / scale };
}

export function aimVec() {
  const p = state.player;
  if (mouse.inside) {
    const m = mouseWorld();
    const dx = m.x - p.x;
    const dy = m.y - p.y;
    const l = Math.hypot(dx, dy);
    if (l > 6) return { dx: dx / l, dy: dy / l };
  }
  const dir = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.dir] || [0, 1];
  return { dx: dir[0], dy: dir[1] };
}

export function faceVec(v) {
  const p = state.player;
  if (Math.abs(v.dx) > Math.abs(v.dy)) p.dir = v.dx < 0 ? 1 : 2;
  else p.dir = v.dy < 0 ? 3 : 0;
}

function facingTile() {
  const p = state.player;
  const m = mouseWorld();
  let dx = m.x - p.x;
  let dy = m.y - p.y;
  if (!mouse.inside || (Math.abs(dx) + Math.abs(dy) < 2)) {
    if (p.dir === 0) dy = 1;
    if (p.dir === 1) dx = -1;
    if (p.dir === 2) dx = 1;
    if (p.dir === 3) dy = -1;
  }
  const len = Math.hypot(dx, dy) || 1;
  const x = p.x + (dx / len) * 14;
  const y = p.y + (dy / len) * 14;
  return { tx: Math.floor(x / TILE), ty: Math.floor(y / TILE), dx: dx / len, dy: dy / len };
}

function frontTile() {
  const p = state.player;
  const dir = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.dir] || [0, 1];
  const ptx = Math.floor(p.x / TILE);
  const pty = Math.floor(p.y / TILE);
  return { tx: ptx + dir[0], ty: pty + dir[1], dx: dir[0], dy: dir[1] };
}

export function aimTile() {
  const p = state.player;
  if (mouse.inside) {
    const m = mouseWorld();
    const tx = Math.floor(m.x / TILE);
    const ty = Math.floor(m.y / TILE);
    const ptx = Math.floor(p.x / TILE);
    const pty = Math.floor(p.y / TILE);
    if (inBounds(tx, ty) && Math.max(Math.abs(tx - ptx), Math.abs(ty - pty)) <= 2) {
      const dx = m.x - p.x;
      const dy = m.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      if (isResource(tx, ty)) return { tx, ty, dx: dx / len, dy: dy / len };
      if (state.build) return { tx, ty, dx: dx / len, dy: dy / len };
      if (isMineable(tx, ty)) return { tx, ty, dx: dx / len, dy: dy / len };
      const toward = facingTile();
      if (isMineable(toward.tx, toward.ty)) return toward;
      return { tx, ty, dx: dx / len, dy: dy / len };
    }
  }
  return facingTile();
}

function showResult(title, body) {
  state.over = true;
  state.paused = true;
  state.choosing = false;
  recordRun();
  state.share = shareText();
  const hl = highlights().lines;
  const hlText = hl.length ? `\n\n【本局高光】\n${hl.map((l) => "· " + l).join("\n")}` : "";
  showOverlay(title, `${body}${hlText}\n\n${state.share}`, [
    ["复制战绩", () => copyText(state.share), { id: "btn-copy-share" }],
    ["同种子再来", () => {
      const u = new URL(location.href);
      u.searchParams.set("seed", state.seed);
      location.href = u.toString();
    }],
    ["再玩一局", () => {
      const u = new URL(location.href);
      u.searchParams.delete("seed");
      location.href = u.toString();
    }],
  ]);
}

export function die(reason) {
  if (state.over) return;
  overlay.classList.add("hidden");
  showResult(reason || "营地失守", `${eraName(state.era)}，你撑过了 ${state.nights} 个夜晚，击败 ${state.kills} 只怪物。\n栅栏能挡地面的怪，夜里站在火把旁边打。`);
}

function runTime() {
  const t = Math.floor(state.time);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

function win() {
  state.win = true;
  state.paused = true;
  state.choosing = true;
  const done = eraName(state.era);
  const next = eraName(state.era + 1);
  showOverlay(
    `${done}落幕 · 方块之心已点亮`,
    `${CLASSES[state.cls].name} 把方块之心放上祭坛。\n用时 ${runTime()}，度过 ${state.nights} 个夜晚，击败 ${state.kills} 只怪物。\n\n点亮祭坛进入${next}：要多守 ${ERA_NIGHTS_STEP} 夜，怪物生命与伤害 ×${ERA_SCALING}，每夜多 ${WAVES.perEra} 波。`,
    [
      ["点亮祭坛 · 进入下一纪元", () => nextEra(), { id: "btn-next-era" }],
      ["就此收手 · 结算", () => showResult("纪元传说", `${CLASSES[state.cls].name} 在${done}后放下了火把。\n用时 ${runTime()}，度过 ${state.nights} 个夜晚，击败 ${state.kills} 只怪物。`), { id: "btn-end-run" }],
    ]
  );
  beep(660, 0.12, "square", 0.06);
  setTimeout(() => beep(880, 0.18, "square", 0.05), 120);
}

function nextEra() {
  state.era += 1;
  state.eraStart = state.nights;
  state.choosing = false;
  state.paused = false;
  state.skippedGuide = true;
  overlay.classList.add("hidden");
  setLast(performance.now());
  burst(state.altar.x, state.altar.y, "#ffe27a", 24);
  toast(`${eraName(state.era)}开始。再守 ${eraNights()} 夜，怪物更强了。`, 3.4);
  beep(330, 0.2, "sawtooth", 0.05);
  syncGuide();
  syncHud();
}

function rollDawn() {
  const daily = isDaily(state.seed);
  const pool = RELICS.filter((r) => (r.type === "blessing" || !state.relics.includes(r.id)) && isUnlocked(r.id, daily));
  const roll01 = nightRng("dawn");
  const out = [];
  while (out.length < DAWN_CHOICES && pool.length) {
    const total = pool.reduce((s, r) => s + r.weight, 0);
    let roll = roll01() * total;
    let i = 0;
    while (i < pool.length - 1 && roll >= pool[i].weight) {
      roll -= pool[i].weight;
      i += 1;
    }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

function offerDawn() {
  if (state.over) return;
  const choices = rollDawn();
  if (!choices.length) return;
  for (const r of choices) codexAdd("relics", r.id);
  state.paused = true;
  state.choosing = true;
  keys.clear();
  mouse.down = false;
  showOverlay(
    "黎明的馈赠",
    `撑过了第 ${state.nights} 夜。选一份馈赠带进今天：`,
    choices.map((r) => [
      `【${RELIC_TYPE_LABEL[r.type]}】${r.name} · ${r.desc}`,
      () => pickRelic(r.id),
      { cls: `choice ${r.type}`, data: { relic: r.id } },
    ]),
    { choices: true }
  );
  beep(700, 0.1, "triangle", 0.05);
}

function pickRelic(id) {
  const r = RELICS.find((x) => x.id === id);
  if (!r || !state.choosing) return;
  state.picks.push(id);
  if (r.type !== "blessing") state.relics.push(id);
  const p = state.player;
  if (id === "supply_cache") {
    state.inv.wood += RELIC_FX.supplyWood;
    state.inv.stone += RELIC_FX.supplyStone;
  } else if (id === "hearth_song") {
    if (p.hp < p.maxHp) state.heals.blessing = true;
    state.campHp = CAMP_MAX;
    p.hp = p.maxHp;
  } else if (id === "wolf_howl") {
    state.howlPending = true;
  } else if (id === "sundial_shard" && state.day) {
    state.ap += RELIC_FX.sundialAp;
  } else if (id === "glass_cannon") {
    p.maxHp = Math.round(p.maxHp * RELIC_FX.glassCannonHp);
    p.hp = Math.min(p.hp, p.maxHp);
  }
  state.choosing = false;
  state.paused = false;
  overlay.classList.add("hidden");
  setLast(performance.now());
  toast(`获得${RELIC_TYPE_LABEL[r.type]}「${r.name}」：${r.desc}`, 3);
  beep(880, 0.08, "square", 0.05);
  syncHud();
}

function interact() {
  const p = state.player;
  if (tradeCaravan()) return;
  if (dist(p.x, p.y, state.bench.x, state.bench.y) < 22) {
    craft();
    return;
  }
  if (dist(p.x, p.y, state.altar.x, state.altar.y) < 22) {
    if (!state.day) {
      toast("祭坛夜里封着。先守住篝火，天亮再献。");
    } else if (!survivedNights()) {
      toast(`还要再守 ${nightsLeft()} 夜。天亮后才能献祭。`);
    } else if (state.inv.heart > 0) {
      state.inv.heart -= 1;
      burst(state.altar.x, state.altar.y, "#ffe27a", 24);
      win();
    } else toast("祭坛还空着。先去工作台合成方块之心。");
    return;
  }
  const f = facingTile();
  if (plant(f.tx, f.ty)) return;
  toast("靠近工作台按 E 合成，靠近祭坛按 E 献祭。对着空田按 E 也能播种。");
}

function updatePlayer(dt) {
  const p = state.player;
  const def = CLASSES[p.cls];
  let ix = 0;
  let iy = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) iy -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) iy += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) ix -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) ix += 1;
  const moving = ix || iy;
  if (moving) state.flags.moved = true;
  if (moving) {
    const l = Math.hypot(ix, iy);
    const speed = def.speed * (has("light_boots") ? RELIC_FX.lightBootsSpeed : 1);
    p.vx = (ix / l) * speed;
    p.vy = (iy / l) * speed;
    if (Math.abs(ix) > Math.abs(iy)) p.dir = ix < 0 ? 1 : 2;
    else p.dir = iy < 0 ? 3 : 0;
  } else {
    p.vx *= 0.7;
    p.vy *= 0.7;
  }
  if (p.dash > 0) {
    p.vx = p.dashVx;
    p.vy = p.dashVy;
    p.dash -= dt;
  }
  const ox = p.x;
  const oy = p.y;
  tryMove(p, dt);
  const bumpRes = !!(moving && Math.hypot(p.x - ox, p.y - oy) < 0.5 && isResource(frontTile().tx, frontTile().ty));
  if (moving) {
    state.footAcc += dt;
    if (state.footAcc > 0.27) {
      state.footAcc = 0;
      footstep();
    }
  } else {
    state.footAcc = 0.2;
  }
  p.anim += dt * (moving ? 8 : 3);
  p.frame = Math.floor(p.anim) % 2;
  p.atkCd = Math.max(0, p.atkCd - dt);
  p.skillCd = Math.max(0, p.skillCd - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.attack = Math.max(0, p.attack - dt);
  p.sense = Math.max(0, p.sense - dt);
  if (p.cls === "mage") p.mana = Math.min(p.maxMana, p.mana + dt * 1.35);

  const usingSpace = keys.has("Space") || keys.has("KeyJ");
  const wantAct = mouse.down || usingSpace;
  const f = (usingSpace || bumpRes) ? frontTile() : aimTile();
  const t = tileAt(f.tx, f.ty);
  const resource = isResource(f.tx, f.ty);
  const dismantle = isDismantle(f.tx, f.ty);
  if (!keys.has("KeyR")) state.rLatch = false;
  const rTap = keys.has("KeyR") && !state.rLatch;
  if (rTap) state.rLatch = true;
  const clickPlace = mouse.pressed || rTap;
  if (!mouse.down && !usingSpace) p.blockMine = false;
  const enemyNear = state.enemies.some((e) => targetable(e) && dist(e.x, e.y, p.x, p.y) < 42);
  const doMine = () => {
    const apCost = apCostOfTile(t);
    if (apCost && apShort(apCost, t === T.TREE ? "砍树" : "挖矿")) {
      p.mine = 0;
      p.mineTx = -1;
      return;
    }
    if (p.mineTx !== f.tx || p.mineTy !== f.ty) startMine(f.tx, f.ty);
    const hard = t === T.GOLD ? 1.35 : t === T.STONE ? 1.05 : t === T.TREE ? 0.85 : t === T.TOWER || t === T.WAREHOUSE ? 0.8 : 0.35;
    const axe = t === T.TREE && has("flint_axe") ? RELIC_FX.flintAxeChop : 1;
    p.mine += dt * def.mine * axe / hard;
    if (p.mine >= 1) {
      gatherTile(f.tx, f.ty);
      p.mine = 0;
      p.mineTx = -1;
    }
  };
  if (clickPlace && state.build === "fence" && t === T.FENCE) {
    p.mine = 0;
    p.mineTx = -1;
    tryPlace(f.tx, f.ty);
    p.blockMine = true;
  } else if ((usingSpace || bumpRes) && (resource || (usingSpace && dismantle))) {
    doMine();
  } else if (wantAct && enemyNear && !resource) {
    p.mine = 0;
    p.mineTx = -1;
    if (p.atkCd <= 0) {
      p.atkCd = p.cls === "mage" ? 0.32 : 0.42;
      if (p.cls === "mage") shoot();
      else meleeAttack();
    }
  } else if (clickPlace && state.build && !resource && t !== T.FARM && t !== T.FENCE) {
    p.mine = 0;
    p.mineTx = -1;
    tryPlace(f.tx, f.ty);
  } else if (wantAct && (resource || (dismantle && !p.blockMine))) {
    doMine();
  } else if (wantAct && t === T.FARM) {
    p.mine = 0;
    p.mineTx = -1;
    if (p.atkCd <= 0) {
      p.atkCd = 0.25;
      plant(f.tx, f.ty);
    }
  } else {
    p.mine = 0;
    p.mineTx = -1;
    if (wantAct && p.atkCd <= 0) {
      p.atkCd = p.cls === "mage" ? 0.32 : 0.42;
      if (p.cls === "mage") shoot();
      else meleeAttack();
    }
  }
  if (mouse.right) {
    mouse.right = false;
    useSkill();
  }
  mouse.pressed = false;
}

function updateCycle(dt) {
  state.time += dt;
  state.apWarn = Math.max(0, state.apWarn - dt);
  state.cycle += dt;
  const len = state.day ? state.dayLen : state.nightLen;
  if (state.cycle >= len) {
    state.cycle = 0;
    state.day = !state.day;
    if (!state.day) {
      state.nights += 1;
      state.nightKills = 0;
      state.nightCampHit = false;
      endDayEvent();
      startNightWaves();
      if (state.howlPending) {
        state.howlPending = false;
        state.howl = RELIC_FX.wolfHowlSecs;
      }
      toast(state.nights === 1
        ? "第一夜：怪分波朝篝火来。站在墙后打。"
        : `第 ${state.nights} 夜，共 ${state.wavesTotal} 波。蝙蝠会飞过栅栏。`, 3.2);
      beep(140, 0.16, "sawtooth", 0.05);
    } else {
      const extra = !campWalled()
        ? "先把发光的缺口补上，再去凑材料。"
        : survivedNights()
          ? (state.inv.heart ? "可以去北边祭坛献祭了。" : "材料齐了就去工作台合成，再到祭坛。")
          : `还要再守 ${nightsLeft()} 夜。白天补墙、凑材料。`;
      toast("天亮了。" + extra, 3);
      checkAch("dawn");
      beep(620, 0.1, "square", 0.04);
      state.dayLen = DAY_LEN;
      state.enemies = [];
      state.rocks = [];
      state.bossPending = false;
      state.bossName = "";
      state.howl = 0;
      state.nightWarned = false;
      state.fenceBreakWarn = false;
      state.ap = apMax();
      state.lastPlace = null;
      rollDayEvent();
      if (has("greedy_hearth")) {
        state.inv.gold += RELIC_FX.greedyHearthGold;
        floatText(state.camp.x, state.camp.y - 18, `+${RELIC_FX.greedyHearthGold}金`, "#e8c040");
      }
      offerDawn();
    }
  }
  if (state.day && !state.nightWarned && state.cycle > state.dayLen - 8) {
    state.nightWarned = true;
    toast("天快黑了。回篝火旁边，检查栅栏和火把。", 2.8);
  }
}

function update(dt) {
  if (!state || state.paused) return;
  dt = Math.min(dt, 0.05);
  if (state.briefing) {
    state.time += dt;
    state.look.x += (state.lookTo.x - state.look.x) * Math.min(1, 5.5 * dt);
    state.look.y += (state.lookTo.y - state.look.y) * Math.min(1, 5.5 * dt);
    const step = BRIEF[state.briefStep];
    const full = step.text;
    brief.acc += dt;
    const ch = full[brief.shown] || "";
    const wait = /[。、！？…—\n]/.test(ch) ? 0.16 : 0.034;
    if (brief.shown < full.length && brief.acc >= wait) {
      brief.acc = 0;
      brief.shown += 1;
      briefingText.textContent = full.slice(0, brief.shown);
      if (ch && ch !== " " && ch !== "\n") beep(780, 0.016, "square", 0.016);
      if (brief.shown >= full.length) briefingCursor.classList.remove("hidden");
    }
    state.musicAcc += dt;
    if (state.musicAcc > 0.28) {
      state.musicAcc = 0;
      state.musicStep = (state.musicStep || 0) + 1;
      playMusicPulse();
    }
    syncHud();
    return;
  }
  if (state.hitstop > 0) {
    state.hitstop -= dt;
    state.shake = Math.max(0, (state.shake || 0) - dt * 20);
    if (toastTimer > 0) {
      setToastTimer(toastTimer - dt);
      if (toastTimer <= 0) toastEl.classList.add("hidden");
    }
    mouse.pressed = false;
    syncHud();
    return;
  }
  state.campPull = Math.max(0, (state.campPull || 0) - dt);
  state.campFlash = Math.max(0, (state.campFlash || 0) - dt);
  state.campHurtCd = Math.max(0, (state.campHurtCd || 0) - dt);
  state.campHint = Math.max(0, (state.campHint || 0) - dt);
  state.benchHint = Math.max(0, (state.benchHint || 0) - dt);
  state.musicAcc += dt;
  if (state.musicAcc > 0.28) {
    state.musicAcc = 0;
    state.musicStep = (state.musicStep || 0) + 1;
    playMusicPulse();
  }
  updatePlayer(dt);
  updateEnemies(dt);
  updateDrops(dt);
  updateBuildings(dt);
  updateDayEvent(dt);
  updateAch(dt);
  if (state.hurtDir) {
    state.hurtDir.t -= dt;
    if (state.hurtDir.t <= 0) state.hurtDir = null;
  }
  if (state.bossBanner) {
    state.bossBanner.t -= dt;
    if (state.bossBanner.t <= 0) state.bossBanner = null;
  }
  updateBolts(dt);
  updateRocks(dt);
  updateCrops(dt);
  updateCycle(dt);
  if (state.day && state.campHp > 0 && dist(state.player.x, state.player.y, state.camp.x, state.camp.y) < 30) {
    if (state.player.hp < state.player.maxHp) state.heals.camp = true;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 5 * dt);
    if (!has("greedy_hearth")) state.campHp = Math.min(CAMP_MAX, state.campHp + 8 * dt);
  }
  const f = aimTile();
  const t = tileAt(f.tx, f.ty);
  const p = state.player;
  let prompt = "";
  const ev = state.dayEvent;
  if (ev && ev.id === "caravan" && ev.started && state.day && dist(p.x, p.y, ev.x, ev.y) < 26) {
    prompt = ev.trades < DAY_EVENT_FX.caravanTrades ? "按 E 和商队交易" : "商队的货换完了";
  } else if (dist(p.x, p.y, state.bench.x, state.bench.y) < 26 && (state.flags.chopped || materialsReady() || state.inv.heart)) {
    prompt = materialsReady() || state.inv.heart ? "按 E 合成方块之心" : "按 E 查看还差哪些材料";
  } else if (dist(p.x, p.y, state.altar.x, state.altar.y) < 26) {
    if (!state.day) prompt = "祭坛夜里封着，先守篝火";
    else if (!survivedNights()) prompt = `再守 ${nightsLeft()} 夜，天亮才能献`;
    else if (state.inv.heart > 0) prompt = "按 E 献上方块之心";
    else prompt = "先去工作台合成方块之心";
  } else if (!state.day && state.enemies.some((e) => dist(e.x, e.y, p.x, p.y) < 42)) {
    prompt = "左键攻击 · Q 技能 · 点坏墙修理";
  } else if (state.build && placeable(f.tx, f.ty)) {
    prompt = state.build === "plot" ? `左键开田（${costText("plot")}）` : `左键放下${BUILDINGS[state.build].name}（${costText(state.build)}${state.day ? " + 1 日晷" : ""}）`;
  } else if (t === T.TREE || tileAt(frontTile().tx, frontTile().ty) === T.TREE) prompt = "空格或按住左键砍树";
  else if (t === T.GOLD) prompt = "按住左键挖金矿";
  else if (t === T.RUBBLE) prompt = "按住左键捡碎石（不耗日晷）";
  else if (t === T.STATUE) prompt = "沉睡的石像。在它附近挖金会吵醒它";
  else if (t === T.TOWER || t === T.SPIKE || t === T.SPRING || t === T.WAREHOUSE) prompt = "空格拆除，退回部分材料";
  else if (t === T.STONE) prompt = "按住左键挖石头";
  else if (t === T.FENCE) {
    const hp = state.fenceHp.get(`${f.tx},${f.ty}`) || fenceMax();
    if (state.build === "fence" && hp < fenceMax() - 0.5) prompt = "左键修理栅栏（1木）";
    else if (state.build === "fence" && !campWalled()) prompt = "这段好了。点发光的空地继续围";
    else prompt = "空格拆除栅栏";
  }
  else if (t === T.CROP && (state.crops.get(`${f.tx},${f.ty}`)?.stage || 0) >= 2) prompt = "按住左键收麦";
  else if (t === T.FARM) prompt = "按 E 或左键播种（要有种子）";
  else if (!state.day && state.enemies.length) prompt = "守住篝火 · 左键攻击 · Q 技能";
  setPrompt(prompt);
  syncGuide();
  for (const pt of state.particles) {
    pt.vy += (pt.g || 0) * dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const f of state.floats) {
    f.y -= 18 * dt;
    f.life -= dt;
  }
  state.floats = state.floats.filter((f) => f.life > 0);
  if (toastTimer > 0) {
    setToastTimer(toastTimer - dt);
    if (toastTimer <= 0) toastEl.classList.add("hidden");
  }
  syncHud();
}

function loop(now) {
  const dt = (now - last) / 1000;
  setLast(now);
  if (state && !state.paused && !state.over) update(dt);
  render();
  if (state && !state.over) requestAnimationFrame(loop);
  else setLooping(false);
}

document.querySelectorAll(".class-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".class-card").forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    setSelectedClass(card.dataset.class);
    btnStart.disabled = false;
    btnStart.textContent = `以${CLASSES[selectedClass].name}进入世界`;
    if (btnDaily) btnDaily.disabled = false;
  });
});
btnStart.addEventListener("click", () => {
  if (!selectedClass) return;
  ensureAudio();
  if (hasSeenWorld()) startGame(selectedClass, { brief: false });
  else playIntro(selectedClass);
});
if (btnDaily) {
  btnDaily.textContent = `今日挑战 · ${dailySeed().slice(-4, -2)}月${dailySeed().slice(-2)}日`;
  btnDaily.addEventListener("click", () => {
    if (!selectedClass) return;
    setPendingSeed(dailySeed());
    ensureAudio();
    if (hasSeenWorld()) startGame(selectedClass, { brief: false });
    else playIntro(selectedClass);
  });
}
if (btnCodex) btnCodex.addEventListener("click", () => openCodex());
function syncDifficulty() {
  for (const b of document.querySelectorAll("[data-diff]")) b.classList.toggle("on", b.dataset.diff === meta.prefs.difficulty);
  if (titleStats) titleStats.textContent = titleStatsText();
}
for (const b of document.querySelectorAll("[data-diff]")) {
  b.addEventListener("click", () => {
    setDifficulty(b.dataset.diff);
    syncDifficulty();
  });
}
syncDifficulty();
if (titleStats) titleStats.textContent = titleStatsText();
btnSkipIntro.addEventListener("click", (e) => {
  e.stopPropagation();
  finishIntro();
});
introBox.addEventListener("click", () => advanceIntro());
screenIntro.addEventListener("click", (e) => {
  if (e.target === screenIntro) advanceIntro();
});
btnSkipBrief.addEventListener("click", (e) => {
  e.stopPropagation();
  endBriefing();
});
briefingBox.addEventListener("click", () => advanceBrief());
btnMute.addEventListener("click", cycleAudio);
btnPause.addEventListener("click", togglePause);
btnHelp.addEventListener("click", () => {
  if (!state || state.over) return;
  if (!state.paused) togglePause();
});
btnSkipGuide.addEventListener("click", () => {
  if (!state) return;
  state.skippedGuide = true;
  syncGuide();
});
document.getElementById("inv").addEventListener("click", (e) => {
  const item = e.target.closest(".item");
  if (!item) return;
  if (item.dataset.k === "wheat") eatWheat();
  if (item.dataset.build) setBuild(item.dataset.build, { toggle: true });
});

window.addEventListener("keydown", (e) => {
  if (intro.active) {
    if (["Space", "Enter", "Escape"].includes(e.code) || e.key === "Enter") e.preventDefault();
    if (e.repeat) return;
    if (e.code === "Escape") finishIntro();
    else if (e.code === "Space" || e.code === "Enter" || e.key === "Enter") advanceIntro();
    return;
  }
  if (state && state.briefing) {
    if (["Space", "Enter", "Escape"].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === "Escape") endBriefing();
    else if (e.code === "Space" || e.code === "Enter" || e.key === "Enter") advanceBrief();
    return;
  }
  keys.add(e.code);
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Digit0", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6"].includes(e.code)) e.preventDefault();
  if (!state) return;
  if (e.code === "Escape") togglePause();
  if (e.code === "KeyM") cycleAudio();
  if (state.paused || e.repeat) return;
  if (e.code === "KeyE" || e.code === "KeyF") interact();
  if (e.code === "KeyQ") useSkill();
  if (e.code === "KeyH") eatWheat();
  if (e.key === "0" || e.code === "Digit0" || e.code === "Numpad0") setBuild(null);
  for (const [kind, def] of Object.entries(BUILDINGS)) {
    if (e.key === def.key || e.code === `Digit${def.key}` || e.code === `Numpad${def.key}`) setBuild(kind);
  }
  if (e.code === "KeyZ" || e.code === "Backspace") {
    e.preventDefault();
    undoPlace();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
canvas.addEventListener("mousemove", (e) => {
  const r = canvas.getBoundingClientRect();
  const scaleX = canvas.width / r.width;
  const scaleY = canvas.height / r.height;
  mouse.x = (e.clientX - r.left) * scaleX;
  mouse.y = (e.clientY - r.top) * scaleY;
  mouse.inside = true;
});
canvas.addEventListener("mouseleave", () => { mouse.inside = false; mouse.down = false; });
canvas.addEventListener("mousedown", (e) => {
  if (state && state.briefing) {
    if (e.button === 0) advanceBrief();
    return;
  }
  if (e.button === 0) { mouse.down = true; mouse.pressed = true; }
  if (e.button === 2) mouse.right = true;
});
window.addEventListener("mouseup", () => { mouse.down = false; });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("resize", () => { if (state) resize(); });

window.CUBE = {
  getState: () => state,
  start: (cls, seed, difficulty) => startGame(cls || "miner", { seed, difficulty }),
  setDifficulty: (id) => { setDifficulty(id); syncDifficulty(); },
  rollDawn: () => rollDawn().map((r) => r.id),
  pickRelic,
  shareText: () => shareText(),
  playIntro,
  skipIntro: finishIntro,
  skipBrief: endBriefing,
  cam: () => camera(),
  gather: (tx, ty) => gatherTile(tx, ty),
  setBuild,
  place: (tx, ty) => tryPlace(tx, ty),
  undo: () => undoPlace(),
  cap: (k) => capOf(k),
  unlocked: (id) => isUnlocked(id, isDaily(state && state.seed)),
  rollDayEvent: () => rollDayEvent(),
  dailySeed: () => dailySeed(),
  meta: () => meta,
  codexText: () => codexText(),
  sky: () => skyTint(),
  spawn: (kind, tx, ty) => {
    const e = makeEnemy(kind, tx * TILE + 8, ty * TILE + 8);
    state.enemies.push(e);
    return state.enemies.length - 1;
  },
  interact,
  currentTarget, campGaps, canAffordNextFence, spawnEnemy, canOffer,
};

const qa = new URLSearchParams(location.search).get("qa");
if (qa === "win") {
  setSelectedClass("miner");
  startGame("miner");
  Object.assign(state.inv, { wood: 5, stone: 5, gold: 3, wheat: 3, heart: 1 });
  state.player.x = state.altar.x;
  state.player.y = state.altar.y + 16;
  state.nights = WIN_NIGHTS;
  state.day = true;
  state.skippedGuide = true;
  syncHud();
  syncGuide();
}
