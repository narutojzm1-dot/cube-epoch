(() => {
  "use strict";

  const TILE = 16;
  const COLS = 48;
  const ROWS = 36;
  const VIEW_W = 20;
  const VIEW_H = 12;
  const NEED = { wood: 5, stone: 5, gold: 3, wheat: 3 };
  const WIN_NIGHTS = 2;
  const CAMP_MAX = 100;

  const T = {
    GRASS: 1,
    DIRT: 2,
    WATER: 3,
    STONE: 4,
    GOLD: 5,
    TREE: 6,
    FARM: 7,
    CROP: 8,
    SAND: 9,
    PATH: 10,
    BRICK: 11,
    FENCE: 12,
    TORCH: 13,
  };

  const CLASSES = {
    miner: {
      name: "矿工阿石",
      hp: 110,
      speed: 62,
      melee: 18,
      mine: 2.35,
      goldBonus: 1,
      light: 108,
      skill: "矿脉感应",
      skillCd: 9,
    },
    farmer: {
      name: "农夫麦麦",
      hp: 100,
      speed: 60,
      melee: 12,
      mine: 1,
      grow: 2.4,
      light: 82,
      skill: "丰收术",
      skillCd: 11,
      seeds: 6,
    },
    mage: {
      name: "法师星萤",
      hp: 78,
      speed: 58,
      melee: 0,
      ranged: 22,
      mana: 8,
      mine: 0.9,
      light: 100,
      skill: "星爆",
      skillCd: 8,
    },
    knight: {
      name: "骑士方盾",
      hp: 165,
      speed: 64,
      melee: 20,
      dr: 0.35,
      mine: 1.05,
      light: 78,
      skill: "冲锋",
      skillCd: 6,
    },
  };

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const screenTitle = document.getElementById("screen-title");
  const screenGame = document.getElementById("screen-game");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayBody = document.getElementById("overlay-body");
  const overlayActions = document.getElementById("overlay-actions");
  const toastEl = document.getElementById("toast");
  const hpBar = document.getElementById("hp-bar");
  const hpText = document.getElementById("hp-text");
  const manaWrap = document.getElementById("mana-wrap");
  const manaBar = document.getElementById("mana-bar");
  const manaText = document.getElementById("mana-text");
  const campBar = document.getElementById("camp-bar");
  const campText = document.getElementById("camp-text");
  const clockEl = document.getElementById("clock");
  const objectiveEl = document.getElementById("objective");
  const skillName = document.getElementById("skill-name");
  const skillCdEl = document.getElementById("skill-cd");
  const skillDock = document.querySelector(".skill-dock");
  const btnStart = document.getElementById("btn-start");
  const btnPause = document.getElementById("btn-pause");
  const btnHelp = document.getElementById("btn-help");
  const btnSkipGuide = document.getElementById("btn-skip-guide");
  const guideEl = document.getElementById("guide");
  const guideTitle = document.getElementById("guide-title");
  const guideBody = document.getElementById("guide-body");
  const promptEl = document.getElementById("prompt");

  const GUIDE = [
    { id: "move", title: "第一步：走起来", body: "用 WASD 移动。先走到附近的树旁边。" },
    { id: "chop", title: "第二步：砍木头", body: "对准树按住左键。木头会用来围栅栏、点火把，也是合成材料。" },
    { id: "build", title: "第三步：围营地", body: "按 1 选栅栏，再点空地放下。点树仍是砍树。你能穿过自己的栅栏，怪不能。" },
    { id: "night", title: "第四步：守住篝火", body: "怪会朝篝火走。栅栏能挡住它们，蝙蝠会飞过来。别让篝火熄灭。" },
    { id: "offer", title: "第五步：天亮献祭", body: "凑齐材料在工作台按 E 合成方块之心。撑过两夜，天亮后送到北边祭坛。" },
  ];
  const nightFx = document.createElement("canvas");
  const nightCtx = nightFx.getContext("2d");

  let selectedClass = null;
  let audioCtx = null;
  let state = null;
  let last = 0;
  let toastTimer = 0;
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false, pressed: false, right: false, inside: false };

  function rand(n) {
    return Math.floor(Math.random() * n);
  }
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }
  function inBounds(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS;
  }
  function px(c, x, y, w, h, color) {
    c.fillStyle = color;
    c.fillRect(x | 0, y | 0, w, h);
  }

  function beep(freq, dur, type, vol) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.value = vol || 0.04;
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  }

  function toast(text, ms) {
    toastEl.textContent = text;
    toastEl.classList.remove("hidden");
    toastTimer = ms || 2.2;
  }

  function tileAt(tx, ty) {
    if (!inBounds(tx, ty)) return T.WATER;
    return state.tiles[ty * COLS + tx];
  }
  function setTile(tx, ty, v) {
    state.tiles[ty * COLS + tx] = v;
  }
  function solid(tx, ty) {
    const t = tileAt(tx, ty);
    return t === T.WATER || t === T.STONE || t === T.GOLD || t === T.TREE;
  }
  function groundSolid(tx, ty) {
    return solid(tx, ty) || tileAt(tx, ty) === T.FENCE;
  }
  function flySolid(tx, ty) {
    const t = tileAt(tx, ty);
    return t === T.WATER || t === T.STONE || t === T.GOLD || t === T.TREE;
  }
  function walkablePixel(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    return !solid(tx, ty);
  }
  function canStand(x, y) {
    const r = 4;
    return walkablePixel(x - r, y) && walkablePixel(x + r, y) && walkablePixel(x, y + 2) && walkablePixel(x, y - 3);
  }

  function genWorld() {
    const tiles = new Uint8Array(COLS * ROWS);
    const crops = new Map();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        tiles[y * COLS + x] = T.GRASS;
        if ((x * 13 + y * 7) % 17 === 0) tiles[y * COLS + x] = T.DIRT;
      }
    }
    const lake = { x: 10, y: 24, r: 5 };
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const d = Math.hypot(x - lake.x, y - lake.y);
        if (d < lake.r) tiles[y * COLS + x] = T.WATER;
        else if (d < lake.r + 1.4) tiles[y * COLS + x] = T.SAND;
      }
    }
    function stamp(x, y, t) {
      if (inBounds(x, y) && tiles[y * COLS + x] !== T.WATER) tiles[y * COLS + x] = t;
    }
    for (let i = 0; i < 28; i++) stamp(6 + (i % 7), 8 + Math.floor(i / 5), T.TREE);
    stamp(8, 10, T.GRASS);
    stamp(9, 11, T.GRASS);
    const nearTrees = [[18, 18], [19, 16], [16, 20], [17, 22], [21, 17], [20, 23], [27, 18], [28, 20]];
    for (const [x, y] of nearTrees) stamp(x, y, T.TREE);
    for (let i = 0; i < 22; i++) stamp(34 + (i % 6), 10 + Math.floor(i / 6), T.STONE);
    stamp(36, 12, T.GOLD);
    stamp(37, 13, T.GOLD);
    stamp(35, 14, T.GOLD);
    stamp(38, 11, T.GOLD);
    stamp(39, 15, T.GOLD);
    stamp(34, 16, T.STONE);
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
    return { tiles, crops };
  }

  function makePlayer(cls) {
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
    };
  }

  function startGame(cls) {
    const world = genWorld();
    const def = CLASSES[cls];
    state = {
      cls,
      tiles: world.tiles,
      crops: world.crops,
      player: makePlayer(cls),
      inv: {
        wood: cls === "miner" ? 2 : 0,
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
      enemies: [],
      drops: [],
      bolts: [],
      particles: [],
      floats: [],
      bench: { x: 24 * TILE + 8, y: 19 * TILE + 8 },
      altar: { x: 24 * TILE + 8, y: 6 * TILE + 8 },
      camp: { x: 22 * TILE + 8, y: 21 * TILE + 8 },
      day: true,
      cycle: 0,
      dayLen: 62,
      nightLen: 26,
      nights: 0,
      time: 0,
      paused: false,
      over: false,
      win: false,
      spawnAcc: 0,
      kills: 0,
      nightWarned: false,
      labelsUntil: 16,
      skippedGuide: false,
      flags: { moved: false, chopped: false, gathered: false, crafted: false, offered: false, planted: false, sawWheat: false, built: false },
    };
    screenTitle.classList.add("hidden");
    screenGame.classList.remove("hidden");
    skillName.textContent = def.skill;
    manaWrap.classList.toggle("hidden", cls !== "mage");
    resize();
    toast("先砍木头。按 1 选栅栏，对着空地左键围住篝火。", 3.8);
    beep(520, 0.08, "square", 0.05);
    syncGuide();
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function materialsReady() {
    return Object.entries(NEED).every(([k, n]) => (state.inv[k] || 0) >= n);
  }

  function survivedNights() {
    return state.nights >= WIN_NIGHTS;
  }
  function canOffer() {
    return state.day && survivedNights() && state.inv.heart > 0;
  }

  function currentGuide() {
    if (!state || state.skippedGuide) return null;
    if (!state.flags.moved) return GUIDE[0];
    if (!state.flags.chopped) return GUIDE[1];
    if (!state.flags.built) return GUIDE[2];
    if (state.nights < 1) return GUIDE[3];
    if (!state.win) return GUIDE[4];
    return null;
  }

  function syncGuide() {
    if (!state) return;
    const step = currentGuide();
    const done = {
      move: state.flags.moved,
      chop: state.flags.chopped,
      build: state.flags.built,
      night: state.nights >= 1,
      offer: !!state.win,
    };
    for (const li of document.querySelectorAll("#guide-steps li")) {
      const id = li.dataset.step;
      li.classList.toggle("done", !!done[id]);
      li.classList.toggle("now", step && step.id === id);
    }
    if (state.skippedGuide || !step) {
      guideEl.classList.add("compact");
      guideTitle.textContent = state.win ? "方块之心已点亮" : "当前目标";
      guideBody.textContent = objectiveText();
      return;
    }
    guideEl.classList.remove("compact");
    guideTitle.textContent = step.title;
    guideBody.textContent = step.body;
  }

  function setPrompt(text) {
    if (!text) {
      promptEl.classList.add("hidden");
      promptEl.textContent = "";
      return;
    }
    promptEl.textContent = text;
    promptEl.classList.remove("hidden");
  }

  function nearestOf(pred) {
    let best = null;
    let bestD = 1e9;
    const p = state.player;
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        if (!pred(tileAt(tx, ty), tx, ty)) continue;
        const d = dist(p.x, p.y, tx * TILE + 8, ty * TILE + 8);
        if (d < bestD) {
          bestD = d;
          best = { x: tx * TILE + 8, y: ty * TILE + 8, tx, ty };
        }
      }
    }
    return best;
  }

  function currentTarget() {
    if (!state) return null;
    if (canOffer()) return { x: state.altar.x, y: state.altar.y, kind: "altar" };
    if (!state.day) return { x: state.camp.x, y: state.camp.y, kind: "camp" };
    if (state.inv.heart > 0 && !survivedNights()) return { x: state.camp.x, y: state.camp.y, kind: "camp" };
    if (materialsReady() && !state.inv.heart) return { x: state.bench.x, y: state.bench.y, kind: "bench" };
    if (!state.flags.built) return { x: state.camp.x, y: state.camp.y, kind: "camp" };
    if (state.inv.wood < NEED.wood) {
      const t = nearestOf((tile) => tile === T.TREE);
      if (t) return { ...t, kind: "tree" };
    }
    if (state.inv.gold < NEED.gold) {
      const t = nearestOf((tile) => tile === T.GOLD);
      if (t) return { ...t, kind: "gold" };
    }
    if (state.inv.stone < NEED.stone) {
      const t = nearestOf((tile) => tile === T.STONE);
      if (t) return { ...t, kind: "stone" };
    }
    if (state.inv.wheat < NEED.wheat) {
      const crop = nearestOf((tile, tx, ty) => tile === T.CROP && (state.crops.get(`${tx},${ty}`)?.stage || 0) >= 2);
      if (crop) return { ...crop, kind: "crop" };
      const farm = nearestOf((tile) => tile === T.FARM);
      if (farm) return { ...farm, kind: "farm" };
    }
    return { x: state.bench.x, y: state.bench.y, kind: "bench" };
  }

  function eatWheat() {
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
    const heal = state.cls === "farmer" ? 22 : 14;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
    floatText(state.player.x, state.player.y - 18, `+${heal}`, "#8dff9a");
    toast(`吃掉一束麦，回复 ${heal} 生命。`);
    beep(520, 0.06, "triangle", 0.04);
    syncHud();
  }

  function helpText() {
    return [
      "白天围营，夜里守火。撑过两夜，天亮把方块之心送到北边祭坛。",
      "",
      "WASD  移动",
      "1 栅栏　2 火把　3 田；点空地放下，点树仍是砍",
      "按住左键  砍树、挖矿、收麦、攻击（自己能穿过栅栏）",
      "E  工作台合成 / 祭坛献祭 / 播种",
      "Q 或右键  职业技能",
      "点「麦」或 H  回血",
      "",
      "栅栏挡地面怪，挡不住蝙蝠。火把夜里照明。篝火灭了就失败。祭坛只在天亮后、守过两夜才能献。",
    ].join("\n");
  }

  function buildCost(kind) {
    if (kind === "fence") return { wood: state.cls === "miner" ? 1 : 2 };
    if (kind === "torch") return { wood: 1, stone: state.cls === "mage" ? 0 : 1 };
    if (kind === "plot") return { wood: state.cls === "farmer" ? 0 : 1 };
    return {};
  }

  function canPay(cost) {
    return Object.entries(cost).every(([k, n]) => (state.inv[k] || 0) >= n);
  }

  function pay(cost) {
    for (const [k, n] of Object.entries(cost)) state.inv[k] -= n;
  }

  function setBuild(kind) {
    if (!state || state.over) return;
    state.build = state.build === kind ? null : kind;
    const names = { fence: "栅栏", torch: "火把", plot: "田" };
    if (state.build) toast(`已选${names[kind]}。点空地放下；点树仍是砍，不会变成放栅栏。`);
    syncHud();
  }

  function placeable(tx, ty) {
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

  function tryPlace(tx, ty) {
    const kind = state.build;
    if (!kind) return false;
    if (!placeable(tx, ty)) {
      toast("这里放不下。对着草地、泥土或土路。");
      return true;
    }
    const cost = buildCost(kind);
    const stored = kind === "fence" ? "fence" : kind === "torch" ? "torch" : "plot";
    if ((state.inv[stored] || 0) > 0) {
      state.inv[stored] -= 1;
    } else if (canPay(cost)) {
      pay(cost);
    } else {
      const miss = Object.entries(cost).filter(([k, n]) => (state.inv[k] || 0) < n).map(([k, n]) => `${labelOf(k)}${n}`);
      toast("材料不够：" + miss.join("、"));
      return true;
    }
    if (kind === "fence") {
      setTile(tx, ty, T.FENCE);
      state.fenceHp.set(`${tx},${ty}`, 36);
    } else if (kind === "torch") {
      setTile(tx, ty, T.TORCH);
    } else {
      setTile(tx, ty, T.FARM);
    }
    state.flags.built = true;
    burst(tx * TILE + 8, ty * TILE + 8, "#ffe27a", 8);
    beep(400, 0.05, "square", 0.04);
    return true;
  }

  function resize() {
    const scale = Math.max(2, Math.min(4, Math.floor((window.innerWidth - 48) / (VIEW_W * TILE))));
    canvas.width = VIEW_W * TILE * scale;
    canvas.height = VIEW_H * TILE * scale;
    ctx.imageSmoothingEnabled = false;
    canvas.dataset.scale = String(scale);
  }

  function camera() {
    const p = state.player;
    const vw = VIEW_W * TILE;
    const vh = VIEW_H * TILE;
    return {
      x: clamp(p.x - vw / 2, 0, COLS * TILE - vw),
      y: clamp(p.y - vh / 2, 0, ROWS * TILE - vh),
    };
  }

  function mouseWorld() {
    const scale = Number(canvas.dataset.scale || 3);
    const cam = camera();
    return { x: cam.x + mouse.x / scale, y: cam.y + mouse.y / scale };
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

  function isMineable(tx, ty) {
    const t = tileAt(tx, ty);
    return t === T.TREE || t === T.STONE || t === T.GOLD || t === T.FENCE || t === T.TORCH
      || (t === T.CROP && (state.crops.get(`${tx},${ty}`)?.stage || 0) >= 2);
  }

  function aimTile() {
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
        if (isMineable(tx, ty)) return { tx, ty, dx: dx / len, dy: dy / len };
        const toward = facingTile();
        if (isMineable(toward.tx, toward.ty)) return toward;
        return { tx, ty, dx: dx / len, dy: dy / len };
      }
    }
    return facingTile();
  }

  function addDrop(kind, x, y, n) {
    for (let i = 0; i < (n || 1); i++) {
      state.drops.push({
        kind,
        x: x + rand(7) - 3,
        y: y + rand(7) - 3,
        z: 6 + rand(6),
        vz: -40,
        life: 18,
      });
    }
  }
  function burst(x, y, color, n) {
    for (let i = 0; i < (n || 8); i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 18 + rand(40);
      state.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.3, color,
      });
    }
  }
  function floatText(x, y, text, color) {
    state.floats.push({ x, y, text, color, life: 0.9 });
  }

  function tryMove(ent, dt) {
    const nx = ent.x + ent.vx * dt;
    const ny = ent.y + ent.vy * dt;
    if (canStand(nx, ent.y)) ent.x = nx;
    if (canStand(ent.x, ny)) ent.y = ny;
    ent.x = clamp(ent.x, 8, COLS * TILE - 8);
    ent.y = clamp(ent.y, 8, ROWS * TILE - 8);
  }

  function hurt(ent, dmg, src) {
    if (ent === state.player && state.player.invuln > 0) return;
    ent.hp -= dmg;
    burst(ent.x, ent.y - 8, "#f07070", 6);
    floatText(ent.x, ent.y - 16, String(Math.ceil(dmg)), "#ffd0d0");
    beep(180, 0.07, "sawtooth", 0.04);
    if (ent === state.player) {
      state.player.invuln = 0.7;
      const dx = ent.x - (src ? src.x : ent.x);
      const dy = ent.y - (src ? src.y : ent.y);
      const l = Math.hypot(dx, dy) || 1;
      ent.vx += (dx / l) * 40;
      ent.vy += (dy / l) * 40;
      if (ent.hp <= 0) die();
    }
  }

  function die(reason) {
    if (state.over) return;
    state.over = true;
    state.paused = true;
    showOverlay(reason || "营地失守", `你撑过了 ${state.nights} 个夜晚，击败 ${state.kills} 只怪物。\n栅栏能挡地面的怪，夜里站在火把旁边打。`, [
      ["回到选角", () => location.reload()],
    ]);
  }

  function win() {
    state.win = true;
    state.over = true;
    state.paused = true;
    const t = Math.floor(state.time);
    showOverlay(
      "方块之心已点亮",
      `${CLASSES[state.cls].name} 把方块之心放上祭坛。\n用时 ${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}，度过 ${state.nights} 个夜晚，击败 ${state.kills} 只怪物。`,
      [
        ["再玩一局", () => location.reload()],
      ]
    );
    beep(660, 0.12, "square", 0.06);
    setTimeout(() => beep(880, 0.18, "square", 0.05), 120);
  }

  function gatherTile(tx, ty) {
    const t = tileAt(tx, ty);
    const cx = tx * TILE + 8;
    const cy = ty * TILE + 8;
    if (t === T.TREE) {
      setTile(tx, ty, T.DIRT);
      addDrop("wood", cx, cy, 2 + rand(2));
      state.flags.chopped = true;
      burst(cx, cy, "#6bcf6b", 10);
      beep(320, 0.05, "triangle", 0.04);
    } else if (t === T.STONE) {
      setTile(tx, ty, T.DIRT);
      addDrop("stone", cx, cy, 2 + rand(2));
      burst(cx, cy, "#c0c4cc", 10);
      beep(200, 0.05, "square", 0.04);
    } else if (t === T.GOLD) {
      setTile(tx, ty, T.STONE);
      addDrop("gold", cx, cy, 1 + (state.cls === "miner" ? 1 : 0) + rand(2));
      burst(cx, cy, "#e8c040", 12);
      beep(740, 0.08, "square", 0.05);
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
    }
  }

  function plant(tx, ty) {
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

  function interact() {
    const p = state.player;
    if (dist(p.x, p.y, state.bench.x, state.bench.y) < 22) {
      craft();
      return;
    }
    if (dist(p.x, p.y, state.altar.x, state.altar.y) < 22) {
      if (!state.day) {
        toast("祭坛夜里封着。先守住篝火，天亮再献。");
      } else if (!survivedNights()) {
        toast(`还要再守 ${WIN_NIGHTS - state.nights} 夜。天亮后才能献祭。`);
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

  function craft() {
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
      : "合成成功！先守过两夜，天亮再到北边祭坛。", 3.2);
    beep(880, 0.1, "square", 0.06);
  }

  function labelOf(k) {
    return { wood: "木", stone: "石", gold: "金", wheat: "麦", seed: "种", heart: "心", fence: "栏", torch: "火", plot: "田" }[k] || k;
  }

  function meleeAttack() {
    const p = state.player;
    const f = facingTile();
    const reach = p.cls === "knight" ? 26 : 22;
    const dmg = CLASSES[p.cls].melee;
    p.attack = 0.18;
    beep(240, 0.05, "square", 0.03);
    for (const e of state.enemies) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (Math.hypot(dx, dy) < reach + 6 && dx * f.dx + dy * f.dy > 0) {
        e.hp -= dmg;
        e.vx += f.dx * 50;
        e.vy += f.dy * 50;
        burst(e.x, e.y, "#fff", 5);
        floatText(e.x, e.y - 12, String(dmg), "#fff");
      }
    }
    const t = tileAt(f.tx, f.ty);
    if (t === T.TREE || t === T.STONE || t === T.GOLD || t === T.CROP || t === T.FENCE || t === T.TORCH) {
      startMine(f.tx, f.ty);
    }
  }

  function startMine(tx, ty) {
    const p = state.player;
    if (p.mineTx === tx && p.mineTy === ty) return;
    p.mineTx = tx;
    p.mineTy = ty;
    p.mine = 0;
  }

  function shoot() {
    const p = state.player;
    if (p.mana < 1) {
      toast("法力不足");
      return;
    }
    p.mana -= 1;
    const f = facingTile();
    state.bolts.push({
      x: p.x, y: p.y - 6, vx: f.dx * 130, vy: f.dy * 130, life: 0.9, dmg: CLASSES.mage.ranged, nova: false,
    });
    beep(720, 0.06, "sine", 0.04);
  }

  function useSkill() {
    const p = state.player;
    if (p.skillCd > 0) return;
    p.skillCd = CLASSES[p.cls].skillCd;
    if (p.cls === "miner") {
      p.sense = 6;
      toast("矿脉在发亮。去东边看看。");
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
          x: p.x, y: p.y - 6, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, life: 0.55, dmg: 16, nova: true,
        });
      }
      beep(900, 0.12, "sine", 0.05);
    } else if (p.cls === "knight") {
      const f = facingTile();
      p.dash = 0.22;
      p.dashVx = f.dx * 220;
      p.dashVy = f.dy * 220;
      p.invuln = 0.28;
      beep(160, 0.08, "sawtooth", 0.04);
    }
  }

  function spawnEnemy() {
    const edges = [];
    for (let x = 1; x < COLS - 1; x++) {
      edges.push([x, 1], [x, ROWS - 2]);
    }
    for (let y = 2; y < ROWS - 2; y++) {
      edges.push([1, y], [COLS - 2, y]);
    }
    for (let k = 0; k < 24; k++) {
      const [tx, ty] = edges[rand(edges.length)];
      if (solid(tx, ty)) continue;
      const x = tx * TILE + 8;
      const y = ty * TILE + 8;
      if (dist(x, y, state.camp.x, state.camp.y) < 80) continue;
      const nights = state.nights;
      let kind = "slime";
      if (nights >= 2 && Math.random() < 0.5) kind = "bat";
      if (nights >= 3 && Math.random() < 0.22) kind = "cube";
      const hp = kind === "slime" ? 28 : kind === "bat" ? 20 : 58;
      const spd = kind === "slime" ? 24 : kind === "bat" ? 42 : 28;
      const dmg = kind === "slime" ? 9 : kind === "bat" ? 8 : 15;
      state.enemies.push({ kind, x, y, vx: 0, vy: 0, hp, maxHp: hp, spd, dmg, hit: 0, bob: Math.random() });
      return;
    }
  }

  function hitFence(tx, ty, dmg) {
    const key = `${tx},${ty}`;
    const hp = (state.fenceHp.get(key) || 36) - dmg;
    if (hp <= 0) {
      setTile(tx, ty, T.GRASS);
      state.fenceHp.delete(key);
      burst(tx * TILE + 8, ty * TILE + 8, "#8b5a2b", 8);
    } else {
      state.fenceHp.set(key, hp);
    }
  }

  function enemyBlocked(e, x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    return e.kind === "bat" ? flySolid(tx, ty) : groundSolid(tx, ty);
  }

  function updateEnemies(dt) {
    const p = state.player;
    const cap = state.nights <= 1 ? 2 : 3 + state.nights * 2;
    const grace = state.nights === 1 && state.cycle < 6;
    if (!state.day && !grace && state.enemies.length < cap) {
      state.spawnAcc += dt;
      if (state.spawnAcc > Math.max(1.15, 2.5 - state.nights * 0.25)) {
        state.spawnAcc = 0;
        spawnEnemy();
      }
    }
    for (const e of state.enemies) {
      const dPlayer = dist(e.x, e.y, p.x, p.y);
      const dCamp = dist(e.x, e.y, state.camp.x, state.camp.y);
      if (state.player.dash > 0 && dPlayer < 16) {
        e.hp -= 14;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const l = Math.hypot(dx, dy) || 1;
        e.vx += (dx / l) * 80;
        e.vy += (dy / l) * 80;
      }
      const aimPlayer = e.kind === "bat" || dPlayer < 28;
      const tx = aimPlayer ? p.x : state.camp.x;
      const ty = aimPlayer ? p.y : state.camp.y;
      const dx = tx - e.x;
      const dy = ty - e.y;
      const len = Math.hypot(dx, dy) || 1;
      let spd = e.spd;
      const etx = Math.floor(e.x / TILE);
      const ety = Math.floor(e.y / TILE);
      if (tileAt(etx, ety) === T.TORCH) spd *= 0.7;
      e.vx = (dx / len) * spd;
      e.vy = (dy / len) * spd;
      const nx = e.x + e.vx * dt;
      const ny = e.y + e.vy * dt;
      if (!enemyBlocked(e, nx, e.y)) e.x = nx;
      else {
        const ftx = Math.floor(nx / TILE);
        const fty = Math.floor(e.y / TILE);
        if (e.kind !== "bat" && tileAt(ftx, fty) === T.FENCE) hitFence(ftx, fty, 18 * dt);
      }
      if (!enemyBlocked(e, e.x, ny)) e.y = ny;
      else {
        const ftx = Math.floor(e.x / TILE);
        const fty = Math.floor(ny / TILE);
        if (e.kind !== "bat" && tileAt(ftx, fty) === T.FENCE) hitFence(ftx, fty, 18 * dt);
      }
      e.hit = Math.max(0, e.hit - dt);
      if (dPlayer < 12 && e.hit <= 0) {
        e.hit = 0.85;
        let dmg = e.dmg;
        if (p.cls === "knight") dmg *= 1 - CLASSES.knight.dr;
        hurt(p, dmg, e);
      } else if (dCamp < 14 && e.hit <= 0 && state.campHp > 0) {
        e.hit = 0.7;
        state.campHp = Math.max(0, state.campHp - e.dmg * 0.85);
        burst(state.camp.x, state.camp.y - 8, "#ff6a20", 5);
        if (!state.campHurtWarn && state.campHp < 45) {
          state.campHurtWarn = true;
          toast("篝火在掉血！守住它，灭了就失败。", 2.8);
        }
        if (state.campHp <= 0) {
          die("篝火熄灭");
        }
      }
    }
    state.enemies = state.enemies.filter((e) => {
      if (e.hp > 0) return true;
      burst(e.x, e.y, "#8dff9a", 8);
      state.kills += 1;
      if (Math.random() < 0.45) addDrop("wheat", e.x, e.y, 1);
      if (Math.random() < 0.16) addDrop("gold", e.x, e.y, 1);
      if (Math.random() < 0.2) addDrop("seed", e.x, e.y, 1);
      return false;
    });
  }

  function updateDrops(dt) {
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
      if (dd < 40 && dd > 1) {
        d.x += (p.x - d.x) * 6 * dt;
        d.y += (p.y - d.y) * 6 * dt;
      }
      if (dd < 16) {
        state.inv[d.kind] = (state.inv[d.kind] || 0) + 1;
        d.life = 0;
        beep(660, 0.04, "square", 0.03);
        if (d.kind === "wheat" && !state.flags.sawWheat) {
          state.flags.sawWheat = true;
          toast("点背包里的「麦」或按 H，可以吃掉回血。", 2.8);
        }
      }
    }
    state.drops = state.drops.filter((d) => d.life > 0);
  }

  function updateBolts(dt) {
    for (const b of state.bolts) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      for (const e of state.enemies) {
        if (dist(b.x, b.y, e.x, e.y) < 10) {
          e.hp -= b.dmg;
          burst(e.x, e.y, "#4ee8ff", 6);
          b.life = 0;
        }
      }
      const tx = Math.floor(b.x / TILE);
      const ty = Math.floor(b.y / TILE);
      if (solid(tx, ty)) b.life = 0;
    }
    state.bolts = state.bolts.filter((b) => b.life > 0);
  }

  function updateCrops(dt) {
    const growMul = state.cls === "farmer" ? CLASSES.farmer.grow : 1;
    for (const c of state.crops.values()) {
      if (c.stage >= 2) continue;
      c.grow += dt * growMul;
      const need = c.stage === 0 ? 7 : 8;
      if (c.grow >= need) {
        c.grow = 0;
        c.stage += 1;
      }
    }
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
      p.vx = (ix / l) * def.speed;
      p.vy = (iy / l) * def.speed;
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
    tryMove(p, dt);
    p.anim += dt * (moving ? 8 : 3);
    p.frame = Math.floor(p.anim) % 2;
    p.atkCd = Math.max(0, p.atkCd - dt);
    p.skillCd = Math.max(0, p.skillCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.attack = Math.max(0, p.attack - dt);
    p.sense = Math.max(0, p.sense - dt);
    if (p.cls === "mage") p.mana = Math.min(p.maxMana, p.mana + dt * 1.35);

    const wantAct = mouse.down || keys.has("Space") || keys.has("KeyJ");
    const f = aimTile();
    const t = tileAt(f.tx, f.ty);
    const mineable = isMineable(f.tx, f.ty);
    const clickPlace = mouse.pressed || keys.has("KeyR");
    if (clickPlace && state.build && !mineable && t !== T.FARM) {
      p.mine = 0;
      p.mineTx = -1;
      tryPlace(f.tx, f.ty);
    } else if (wantAct && mineable) {
      if (p.mineTx !== f.tx || p.mineTy !== f.ty) startMine(f.tx, f.ty);
      const hard = t === T.GOLD ? 1.35 : t === T.STONE ? 1.05 : t === T.TREE ? 0.85 : 0.35;
      p.mine += dt * def.mine / hard;
      if (p.mine >= 1) {
        gatherTile(f.tx, f.ty);
        p.mine = 0;
        p.mineTx = -1;
      }
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
    state.cycle += dt;
    const len = state.day ? state.dayLen : state.nightLen;
    if (state.cycle >= len) {
      state.cycle = 0;
      state.day = !state.day;
      if (!state.day) {
        state.nights += 1;
        toast(state.nights === 1
          ? "第一夜：怪朝篝火来。站在栅栏后打，蝙蝠会飞进来。"
          : `第 ${state.nights} 夜。守住篝火，灭了就失败。`, 3.2);
        beep(140, 0.16, "sawtooth", 0.05);
      } else {
        const extra = survivedNights()
          ? (state.inv.heart ? "可以去北边祭坛献祭了。" : "材料齐了就去工作台合成，再到祭坛。")
          : `还要再守 ${WIN_NIGHTS - state.nights} 夜。白天补墙、凑材料。`;
        toast("天亮了。" + extra, 3);
        beep(620, 0.1, "square", 0.04);
        state.enemies = [];
        state.nightWarned = false;
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
    updatePlayer(dt);
    updateEnemies(dt);
    updateDrops(dt);
    updateBolts(dt);
    updateCrops(dt);
    updateCycle(dt);
    if (state.day && state.campHp > 0 && dist(state.player.x, state.player.y, state.camp.x, state.camp.y) < 30) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 5 * dt);
      state.campHp = Math.min(CAMP_MAX, state.campHp + 8 * dt);
    }
    state.labelsUntil = Math.max(0, state.labelsUntil - dt);
    const f = aimTile();
    const t = tileAt(f.tx, f.ty);
    const p = state.player;
    let prompt = "";
    if (dist(p.x, p.y, state.bench.x, state.bench.y) < 26) {
      prompt = materialsReady() || state.inv.heart ? "按 E 合成方块之心" : "按 E 查看还差哪些材料";
    } else if (dist(p.x, p.y, state.altar.x, state.altar.y) < 26) {
      if (!state.day) prompt = "祭坛夜里封着，先守篝火";
      else if (!survivedNights()) prompt = `再守 ${WIN_NIGHTS - state.nights} 夜，天亮才能献`;
      else if (state.inv.heart > 0) prompt = "按 E 献上方块之心";
      else prompt = "先去工作台合成方块之心";
    } else if (state.build && placeable(f.tx, f.ty)) {
      prompt = state.build === "fence" ? "左键放下栅栏" : state.build === "torch" ? "左键放下火把" : "左键开田";
    } else if (t === T.TREE) prompt = "按住左键砍树";
    else if (t === T.GOLD) prompt = "按住左键挖金矿";
    else if (t === T.STONE) prompt = "按住左键挖石头";
    else if (t === T.FENCE) prompt = "按住左键拆除栅栏";
    else if (t === T.CROP && (state.crops.get(`${f.tx},${f.ty}`)?.stage || 0) >= 2) prompt = "按住左键收麦";
    else if (t === T.FARM) prompt = "按 E 或左键播种（要有种子）";
    else if (!state.day && state.enemies.length) prompt = "守住篝火 · 左键攻击 · Q 技能";
    setPrompt(prompt);
    syncGuide();
    for (const pt of state.particles) {
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
      toastTimer -= dt;
      if (toastTimer <= 0) toastEl.classList.add("hidden");
    }
    syncHud();
  }

  function objectiveText() {
    if (!state.day) return "守住篝火！怪从地图边缘朝营地来";
    if (canOffer()) return "天亮了。把方块之心送到北边祭坛（按 E）";
    if (state.inv.heart > 0 && !survivedNights()) return `先再守 ${WIN_NIGHTS - state.nights} 夜，天亮才能献祭`;
    if (materialsReady() && !state.inv.heart) return "去工作台按 E 合成方块之心";
    if (!state.flags.built) return "按 1 选栅栏，在篝火旁放下，把缺口围上";
    const miss = [];
    if (state.inv.wood < NEED.wood) miss.push(`木 ${state.inv.wood}/${NEED.wood}`);
    if (state.inv.stone < NEED.stone) miss.push(`石 ${state.inv.stone}/${NEED.stone}`);
    if (state.inv.gold < NEED.gold) miss.push(`金 ${state.inv.gold}/${NEED.gold}`);
    if (state.inv.wheat < NEED.wheat) miss.push(`麦 ${state.inv.wheat}/${NEED.wheat}`);
    if (!miss.length) return "材料齐了。去工作台按 E 合成";
    return "采集 " + miss.join("  ") + "，顺手补墙";
  }

  function syncHud() {
    const p = state.player;
    hpBar.style.width = `${clamp((p.hp / p.maxHp) * 100, 0, 100)}%`;
    hpText.textContent = `${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}`;
    if (p.maxMana) {
      manaBar.style.width = `${(p.mana / p.maxMana) * 100}%`;
      manaText.textContent = `${p.mana.toFixed(0)}/${p.maxMana}`;
    }
    campBar.style.width = `${clamp((state.campHp / CAMP_MAX) * 100, 0, 100)}%`;
    campText.textContent = `${Math.max(0, Math.ceil(state.campHp))}/${CAMP_MAX}`;
    const remain = Math.max(0, (state.day ? state.dayLen : state.nightLen) - state.cycle);
    const m = Math.floor(remain / 60);
    const s = String(Math.floor(remain % 60)).padStart(2, "0");
    clockEl.textContent = `${state.day ? "白天" : "夜晚"} ${m}:${s}`;
    clockEl.className = "clock " + (state.day ? "day" : "night");
    objectiveEl.textContent = objectiveText();
    skillCdEl.textContent = p.skillCd > 0 ? `${p.skillCd.toFixed(1)}s` : "就绪";
    skillDock.classList.toggle("ready", p.skillCd <= 0);
    for (const el of document.querySelectorAll(".item")) {
      const k = el.dataset.k;
      el.querySelector("b").textContent = state.inv[k] || 0;
      el.classList.toggle("ready", k === "heart" && state.inv.heart > 0);
      el.classList.toggle("on", el.dataset.build && state.build === el.dataset.build);
    }
  }

  function drawTile(c, t, x, y, tx, ty, time) {
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
      px(c, x + 2, y + 2, 12, 12, "#6b4424");
      px(c, x + 3, y + 3, 10, 3, "#8b5a2b");
      px(c, x + 6, y + 1, 4, 14, "#5a3a20");
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
    }
  }

  function drawHuman(c, p, cam, scale) {
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
      px(c, 6, -16, 8, 2, p.cls === "miner" ? "#c5c9d0" : "#d0d4dc");
    }
    c.restore();
  }

  function drawEnemy(c, e, cam) {
    const x = Math.round(e.x - cam.x);
    const y = Math.round(e.y - cam.y);
    const bob = Math.sin(state.time * 6 + e.bob) * 1;
    px(c, x - 5, y - 1, 10, 3, "rgba(0,0,0,.3)");
    if (e.kind === "slime") {
      px(c, x - 6, y - 10 + bob, 12, 10, "#5dcf5a");
      px(c, x - 4, y - 8 + bob, 3, 3, "#143318");
      px(c, x + 1, y - 8 + bob, 3, 3, "#143318");
    } else if (e.kind === "bat") {
      px(c, x - 8, y - 10 + bob, 5, 3, "#3a2a58");
      px(c, x + 3, y - 10 + bob, 5, 3, "#3a2a58");
      px(c, x - 3, y - 9 + bob, 6, 5, "#2a1c40");
    } else {
      px(c, x - 6, y - 12 + bob, 12, 12, "#e8c040");
      px(c, x - 6, y - 12 + bob, 12, 3, "#ffe27a");
      px(c, x - 2, y - 8 + bob, 2, 2, "#3a2a10");
      px(c, x + 2, y - 8 + bob, 2, 2, "#3a2a10");
    }
  }

  function drawProp(c, kind, x, y, cam, time) {
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

  function render() {
    if (!state) return;
    const scale = Number(canvas.dataset.scale || 3);
    const cam = camera();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
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
    drawHuman(ctx, state.player, cam, scale);
    for (const b of state.bolts) {
      px(ctx, b.x - cam.x - 2, b.y - cam.y - 2, 4, 4, b.nova ? "#c8f6ff" : "#4ee8ff");
    }
    for (const pt of state.particles) {
      ctx.globalAlpha = clamp(pt.life * 2, 0, 1);
      px(ctx, pt.x - cam.x, pt.y - cam.y, 2, 2, pt.color);
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

    if (state.labelsUntil > 0) {
      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffe27a";
      ctx.fillText("工作台 按E", state.bench.x - cam.x, state.bench.y - cam.y - 16);
      ctx.fillText("篝火回血", state.camp.x - cam.x, state.camp.y - cam.y - 14);
      ctx.fillText("祭坛", state.altar.x - cam.x, state.altar.y - cam.y - 18);
      ctx.fillText("→矿山", VIEW_W * TILE - 24, 20);
      ctx.fillText("↓农田", 80, VIEW_H * TILE - 20);
    }

    if (state.build) {
      const f = aimTile();
      if (placeable(f.tx, f.ty) && !isMineable(f.tx, f.ty)) {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = state.build === "fence" ? "#6b4424" : state.build === "torch" ? "#ffb020" : "#6b4424";
        ctx.fillRect(f.tx * TILE - cam.x + 3, f.ty * TILE - cam.y + 3, 10, 10);
        ctx.globalAlpha = 1;
      }
    }

    if (!state.day) {
      const vw = VIEW_W * TILE;
      const vh = VIEW_H * TILE;
      if (nightFx.width !== vw) nightFx.width = vw;
      if (nightFx.height !== vh) nightFx.height = vh;
      nightCtx.clearRect(0, 0, vw, vh);
      nightCtx.fillStyle = "rgba(6,8,18,0.78)";
      nightCtx.fillRect(0, 0, vw, vh);
      nightCtx.globalCompositeOperation = "destination-out";
      const lights = [
        { x: state.player.x - cam.x, y: state.player.y - cam.y, r: CLASSES[state.player.cls].light },
        { x: state.camp.x - cam.x, y: state.camp.y - cam.y, r: state.campHp > 0 ? 56 : 8 },
      ];
      for (let ty = y0; ty < y1; ty++) {
        for (let tx = x0; tx < x1; tx++) {
          if (tileAt(tx, ty) === T.TORCH) {
            lights.push({ x: tx * TILE + 8 - cam.x, y: ty * TILE + 8 - cam.y, r: 54 });
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
  }

  function loop(now) {
    const dt = (now - last) / 1000;
    last = now;
    if (state && !state.paused && !state.over) update(dt);
    render();
    if (state && !state.over) requestAnimationFrame(loop);
  }

  function showOverlay(title, body, actions) {
    overlayTitle.textContent = title;
    overlayBody.textContent = body;
    overlayActions.innerHTML = "";
    for (const [label, fn] of actions) {
      const b = document.createElement("button");
      b.textContent = label;
      b.addEventListener("click", fn);
      overlayActions.appendChild(b);
    }
    overlay.classList.remove("hidden");
  }

  function togglePause() {
    if (!state || state.over) return;
    state.paused = !state.paused;
    if (state.paused) {
      showOverlay("暂停", helpText(), [
        ["继续", () => {
          overlay.classList.add("hidden");
          state.paused = false;
          last = performance.now();
        }],
        ["回选角", () => location.reload()],
      ]);
    } else {
      overlay.classList.add("hidden");
      last = performance.now();
    }
  }

  document.querySelectorAll(".class-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".class-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedClass = card.dataset.class;
      btnStart.disabled = false;
      btnStart.textContent = `以${CLASSES[selectedClass].name}进入世界`;
    });
  });
  btnStart.addEventListener("click", () => {
    if (!selectedClass) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    startGame(selectedClass);
  });
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
    if (item.dataset.build) setBuild(item.dataset.build);
  });

  window.addEventListener("keydown", (e) => {
    keys.add(e.code);
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    if (!state) return;
    if (e.code === "Escape") togglePause();
    if (state.paused || e.repeat) return;
    if (e.code === "KeyE" || e.code === "KeyF") interact();
    if (e.code === "KeyQ") useSkill();
    if (e.code === "KeyH") eatWheat();
    if (e.code === "Digit1" || e.code === "Numpad1") setBuild("fence");
    if (e.code === "Digit2" || e.code === "Numpad2") setBuild("torch");
    if (e.code === "Digit3" || e.code === "Numpad3") setBuild("plot");
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
    if (e.button === 0) { mouse.down = true; mouse.pressed = true; }
    if (e.button === 2) mouse.right = true;
  });
  window.addEventListener("mouseup", () => { mouse.down = false; });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("resize", () => { if (state) resize(); });

  window.CUBE = {
    getState: () => state,
    start: (cls) => startGame(cls || "miner"),
    gather: (tx, ty) => gatherTile(tx, ty),
    setBuild,
    place: (tx, ty) => tryPlace(tx, ty),
    interact,
  };

  const qa = new URLSearchParams(location.search).get("qa");
  if (qa === "win") {
    selectedClass = "miner";
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
})();
