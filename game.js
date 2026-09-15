(() => {
  "use strict";

  const TILE = 16;
  const COLS = 48;
  const ROWS = 36;
  const VIEW_W = 20;
  const VIEW_H = 12;
  const NEED = { wood: 4, stone: 5, gold: 3, wheat: 3 };
  const WIN_NIGHTS = 2;
  const CAMP_MAX = 100;
  const FENCE_MAX = 80;

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
  const btnMute = document.getElementById("btn-mute");
  const btnSkipGuide = document.getElementById("btn-skip-guide");
  const guideEl = document.getElementById("guide");
  const guideTitle = document.getElementById("guide-title");
  const guideBody = document.getElementById("guide-body");
  const promptEl = document.getElementById("prompt");
  const buildBanner = document.getElementById("build-banner");
  const waveBanner = document.getElementById("wave-banner");
  const screenIntro = document.getElementById("screen-intro");
  const introText = document.getElementById("intro-text");
  const introCursor = document.getElementById("intro-cursor");
  const introBox = document.getElementById("intro-box");
  const btnSkipIntro = document.getElementById("btn-skip-intro");
  const briefingEl = document.getElementById("briefing");
  const briefingBox = document.getElementById("briefing-box");
  const briefingTitle = document.getElementById("briefing-title");
  const briefingText = document.getElementById("briefing-text");
  const briefingCursor = document.getElementById("briefing-cursor");
  const btnSkipBrief = document.getElementById("btn-skip-brief");

  const GUIDE = [
    { id: "move", title: "第一步：走起来", body: "用 WASD 移动。先走到附近的树旁边。" },
    { id: "chop", title: "第二步：砍木头", body: "走到树前面按空格，或对准树按住左键。木头用来围栅栏、点火把。" },
    { id: "build", title: "第三步：围营地", body: "按 1 选栅栏，把篝火上下左右四格围上。发光的格子就是缺口。木头还要留给方块之心。" },
    { id: "night", title: "第四步：守住篝火", body: "怪朝篝火走，站在墙后打，缺口要补。第二夜才有蝙蝠飞进来。" },
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

  let musicOn = true;
  let sfxOn = true;
  let musicGain = null;
  let musicPad = null;
  let musicPadGain = null;

  function ensureMusicPad() {
    if (!audioCtx || !musicGain || musicPad) return;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 480;
    musicPad = audioCtx.createOscillator();
    musicPadGain = audioCtx.createGain();
    musicPad.type = "sine";
    musicPad.frequency.value = 131;
    musicPadGain.gain.value = musicOn ? 0.05 : 0;
    musicPad.connect(filter);
    filter.connect(musicPadGain);
    musicPadGain.connect(musicGain);
    musicPad.start();
  }

  function setMusicLevel() {
    if (musicGain) musicGain.gain.value = musicOn ? 0.26 : 0;
    if (musicPadGain) musicPadGain.gain.value = musicOn ? 0.05 : 0;
  }

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    if (!musicGain) {
      musicGain = audioCtx.createGain();
      musicGain.gain.value = musicOn ? 0.26 : 0;
      musicGain.connect(audioCtx.destination);
    }
    ensureMusicPad();
  }

  function beep(freq, dur, type, vol) {
    if (!audioCtx || !sfxOn) return;
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

  function noise(dur, vol, freq) {
    if (!audioCtx || !sfxOn) return;
    const n = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
    const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const f = audioCtx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = freq || 900;
    const g = audioCtx.createGain();
    g.gain.value = vol || 0.08;
    src.connect(f);
    f.connect(g);
    g.connect(audioCtx.destination);
    src.start();
  }

  function footstep() {
    noise(0.05, 0.045, 500);
    beep(90 + rand(30), 0.04, "square", 0.02);
  }

  function chopSound() {
    noise(0.08, 0.1, 1400);
    beep(180, 0.06, "sawtooth", 0.05);
    beep(320, 0.08, "triangle", 0.04);
  }

  function hitSound() {
    noise(0.05, 0.07, 1800);
    beep(140, 0.05, "square", 0.045);
  }

  function playMusicPulse() {
    if (!audioCtx || !musicOn || !state || state.paused || state.over) return;
    ensureMusicPad();
    const day = [262, 330, 392, 330, 392, 523, 494, 392];
    const night = [196, 233, 262, 247, 220, 196, 175, 196];
    const seq = state.day ? day : night;
    const step = (state.musicStep || 0) % seq.length;
    if (musicPad) {
      musicPad.frequency.setTargetAtTime(state.day ? 131 : 98, audioCtx.currentTime, 0.12);
    }
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "triangle";
    o.frequency.value = seq[step];
    g.gain.setValueAtTime(0.12, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.58);
    o.connect(g);
    g.connect(musicGain);
    o.start();
    o.stop(audioCtx.currentTime + 0.58);
    const b = audioCtx.createOscillator();
    const bg = audioCtx.createGain();
    b.type = "square";
    b.frequency.value = (state.day ? 131 : 98) * (step % 4 === 2 ? 0.75 : 1);
    bg.gain.setValueAtTime(0.035, audioCtx.currentTime);
    bg.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.42);
    b.connect(bg);
    bg.connect(musicGain);
    b.start();
    b.stop(audioCtx.currentTime + 0.42);
  }

  function audioLabel() {
    if (musicOn && sfxOn) return "声音开";
    if (sfxOn) return "仅音效";
    return "静音";
  }

  function cycleAudio() {
    if (musicOn && sfxOn) {
      musicOn = false;
      sfxOn = true;
    } else if (!musicOn && sfxOn) {
      musicOn = false;
      sfxOn = false;
    } else {
      musicOn = true;
      sfxOn = true;
    }
    setMusicLevel();
    if (btnMute) btnMute.textContent = audioLabel();
  }

  function punch(mag, stop) {
    if (!state) return;
    state.shake = Math.max(state.shake || 0, mag);
    if (stop) state.hitstop = Math.max(state.hitstop || 0, stop);
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
  function campTile() {
    return {
      tx: Math.floor(state.camp.x / TILE),
      ty: Math.floor(state.camp.y / TILE),
    };
  }
  function campRing() {
    const c = campTile();
    return [[c.tx, c.ty - 1], [c.tx - 1, c.ty], [c.tx + 1, c.ty], [c.tx, c.ty + 1]];
  }
  function campWalled() {
    return campRing().every(([tx, ty]) => tileAt(tx, ty) === T.FENCE);
  }
  function groundSolid(tx, ty) {
    if (solid(tx, ty) || tileAt(tx, ty) === T.FENCE) return true;
    const c = campTile();
    return tx === c.tx && ty === c.ty;
  }
  function canHitCamp(e) {
    const dCamp = dist(e.x, e.y, state.camp.x, state.camp.y);
    if (e.kind === "bat") return dCamp < 16;
    const c = campTile();
    const etx = Math.floor(e.x / TILE);
    const ety = Math.floor(e.y / TILE);
    if (tileAt(etx, ety) === T.FENCE) return false;
    return Math.abs(etx - c.tx) + Math.abs(ety - c.ty) === 1;
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
    const nearTrees = [[18, 18], [19, 16], [16, 20], [17, 22], [21, 17], [20, 23], [23, 18], [25, 22], [27, 18], [28, 20]];
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
      slashDx: 1,
      slashDy: 0,
      blockMine: false,
    };
  }

  const intro = {
    active: false,
    pages: [],
    page: 0,
    shown: 0,
    delay: 38,
    last: 0,
    raf: 0,
    cls: null,
  };

  function introPages(cls) {
    const name = CLASSES[cls].name;
    const flavor = {
      miner: "你的镐还热着。地底的金会轻轻响，像有谁在土里敲门。",
      farmer: "口袋里的种子还活着。麦香能把人从黑里拽回来。",
      mage: "袖管里藏着没熄的星。夜里，光就是路，也是牙。",
      knight: "盾比夜更厚。你站在门口，火就还敢亮。",
    }[cls];
    return [
      "很久很久以前——\n天地还是一块温热的立方。\n日头嵌在顶上，像一颗不肯落的心。",
      "后来缝里钻进了风。\n光一块块剥落，白昼碎成余烬。\n人们这才发现：夜，是会走路的。",
      "最后一堆篝火还在营地中央跳。\n老人说，火在，纪元就在。\n火灭了，名字也会一起冷掉。",
      "北方祭坛沉睡着。\n要有人把「方块之心」捧去，\n黎明才会肯再睁眼。",
      `${name}啊。\n${flavor}\n篝火在等你。别让它先睡着。`,
      "围起栅栏，像给火围一条被子。\n守过两夜。把那颗心，送到北边去。\n\n……出发吧。",
    ];
  }

  function playIntroTheme() {
    if (!audioCtx || !musicOn || !musicGain) return;
    ensureMusicPad();
    const notes = [392, 523, 587, 523, 392, 330, 392, 523, 659, 784, 659, 523];
    notes.forEach((freq, i) => {
      const t0 = audioCtx.currentTime + i * 0.32;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.1, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      o.connect(g);
      g.connect(musicGain);
      o.start(t0);
      o.stop(t0 + 0.5);
    });
  }

  function renderIntroText() {
    const full = intro.pages[intro.page] || "";
    introText.textContent = full.slice(0, intro.shown);
    introCursor.classList.toggle("hidden", intro.shown < full.length);
  }

  function tickIntro(now) {
    if (!intro.active) return;
    const full = intro.pages[intro.page] || "";
    if (intro.shown < full.length && now - intro.last >= intro.delay) {
      intro.shown += 1;
      intro.last = now;
      const ch = full[intro.shown - 1] || "";
      intro.delay = /[。、！？…—\n]/.test(ch) ? 170 : 36;
      renderIntroText();
      if (ch && ch !== " " && ch !== "\n") beep(780, 0.016, "square", 0.016);
    }
    intro.raf = requestAnimationFrame(tickIntro);
  }

  function showIntroPage() {
    intro.shown = 0;
    intro.delay = 80;
    intro.last = performance.now();
    renderIntroText();
  }

  function advanceIntro() {
    if (!intro.active) return;
    const full = intro.pages[intro.page] || "";
    if (intro.shown < full.length) {
      intro.shown = full.length;
      renderIntroText();
      return;
    }
    intro.page += 1;
    if (intro.page >= intro.pages.length) {
      finishIntro();
      return;
    }
    beep(520, 0.05, "square", 0.03);
    showIntroPage();
  }

  function finishIntro() {
    if (!intro.active) return;
    intro.active = false;
    if (intro.raf) cancelAnimationFrame(intro.raf);
    intro.raf = 0;
    screenIntro.classList.add("hidden");
    const cls = intro.cls;
    intro.cls = null;
    startGame(cls, { brief: true });
  }

  function playIntro(cls) {
    intro.cls = cls;
    intro.pages = introPages(cls);
    intro.page = 0;
    intro.active = true;
    screenTitle.classList.add("hidden");
    screenIntro.classList.remove("hidden");
    playIntroTheme();
    showIntroPage();
    intro.raf = requestAnimationFrame(tickIntro);
  }

  const BRIEF = [
    { focus: "camp", title: "要保护的", text: "看见了吗？这簇还在跳的火。\n夜里所有的牙，都会朝它来。它灭了，这一局的太阳也就灭了。" },
    { focus: "bench", title: "合成之心", text: "这张旧台子还温着。\n木、石、金、麦凑齐，按 E。方块之心会在这里醒来。" },
    { focus: "altar", title: "送到这里", text: "顺着土路一直向北。\n那座沉睡的祭坛，才是心要回家的地方。守过两夜，天亮再献。" },
    { focus: "camp", title: "白天先做", text: "先去砍树。把火的上下左右围死。\n记得留木头——心也是要吃木头的。" },
    { focus: "player", title: "出发", text: "预演到此。风已经在等了。\n……正式开始。" },
  ];
  const brief = { shown: 0, acc: 0 };

  function briefFocus(step) {
    if (!state || !step) return { x: 0, y: 0 };
    if (step.focus === "camp") return state.camp;
    if (step.focus === "bench") return state.bench;
    if (step.focus === "altar") return state.altar;
    return state.player;
  }

  function setBriefStep(i) {
    state.briefStep = i;
    brief.shown = 0;
    brief.acc = 0;
    const step = BRIEF[i];
    briefingTitle.textContent = step.title;
    briefingText.textContent = "";
    briefingCursor.classList.add("hidden");
    const target = briefFocus(step);
    state.lookTo.x = target.x;
    state.lookTo.y = target.y;
  }

  function startBriefing() {
    state.briefing = true;
    state.look.x = state.player.x;
    state.look.y = state.player.y;
    briefingEl.classList.remove("hidden");
    guideEl.classList.add("hidden");
    setBriefStep(0);
    syncHud();
  }

  function advanceBrief() {
    if (!state || !state.briefing) return;
    const step = BRIEF[state.briefStep];
    if (brief.shown < step.text.length) {
      brief.shown = step.text.length;
      briefingText.textContent = step.text;
      briefingCursor.classList.remove("hidden");
      return;
    }
    if (state.briefStep + 1 >= BRIEF.length) {
      endBriefing();
      return;
    }
    beep(520, 0.05, "square", 0.03);
    setBriefStep(state.briefStep + 1);
  }

  function endBriefing() {
    if (!state || !state.briefing) return;
    state.briefing = false;
    state.look.x = state.player.x;
    state.look.y = state.player.y;
    state.lookTo.x = state.player.x;
    state.lookTo.y = state.player.y;
    briefingEl.classList.add("hidden");
    guideEl.classList.remove("hidden");
    toast("先走到树旁边，按空格砍木头。", 3.2);
    last = performance.now();
    syncGuide();
    syncHud();
  }

  function startGame(cls, opts) {
    if (intro.active) {
      intro.active = false;
      if (intro.raf) cancelAnimationFrame(intro.raf);
      intro.raf = 0;
      screenIntro.classList.add("hidden");
    }
    const briefOn = !!(opts && opts.brief);
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
      nightWarned: false,
      skippedGuide: false,
      flags: { moved: false, chopped: false, gathered: false, crafted: false, offered: false, planted: false, sawWheat: false, built: false },
    };
    screenTitle.classList.add("hidden");
    screenGame.classList.remove("hidden");
    skillName.textContent = def.skill;
    manaWrap.classList.toggle("hidden", cls !== "mage");
    resize();
    beep(520, 0.08, "square", 0.05);
    syncGuide();
    last = performance.now();
    if (briefOn) startBriefing();
    else toast("先走到树旁边，按空格砍木头。", 3.2);
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
    if (!campWalled()) return GUIDE[2];
    if (state.nights < WIN_NIGHTS) return GUIDE[3];
    if (!state.win) return GUIDE[4];
    return null;
  }

  function syncGuide() {
    if (!state) return;
    const step = currentGuide();
    const done = {
      move: state.flags.moved,
      chop: state.flags.chopped,
      build: campWalled(),
      night: state.nights >= WIN_NIGHTS,
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

  function approachTile(tx, ty) {
    const p = state.player;
    let best = null;
    let bestD = 1e9;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const ax = tx + dx;
      const ay = ty + dy;
      if (!inBounds(ax, ay) || solid(ax, ay)) continue;
      const d = dist(p.x, p.y, ax * TILE + 8, ay * TILE + 8);
      if (d < bestD) {
        bestD = d;
        best = { x: ax * TILE + 8, y: ay * TILE + 8, tx: ax, ty: ay };
      }
    }
    return best;
  }

  function currentTarget() {
    if (!state) return null;
    if (state.briefing) {
      const step = BRIEF[state.briefStep];
      const t = briefFocus(step);
      return { x: t.x, y: t.y, kind: step.focus };
    }
    if (canOffer()) return { x: state.altar.x, y: state.altar.y, kind: "altar" };
    if (!state.day) return { x: state.camp.x, y: state.camp.y, kind: "camp" };
    if (state.inv.heart > 0 && !survivedNights()) return { x: state.camp.x, y: state.camp.y, kind: "camp" };
    if (materialsReady() && !state.inv.heart) return { x: state.bench.x, y: state.bench.y, kind: "bench" };
    if (!campWalled()) return { x: state.camp.x, y: state.camp.y, kind: "camp" };
    if (state.inv.wood < NEED.wood) {
      const t = nearestOf((tile) => tile === T.TREE);
      if (t) return { ...(approachTile(t.tx, t.ty) || t), kind: "tree" };
    }
    if (state.inv.gold < NEED.gold) {
      const t = nearestOf((tile) => tile === T.GOLD);
      if (t) return { ...(approachTile(t.tx, t.ty) || t), kind: "gold" };
    }
    if (state.inv.stone < NEED.stone) {
      const t = nearestOf((tile) => tile === T.STONE);
      if (t) return { ...(approachTile(t.tx, t.ty) || t), kind: "stone" };
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
      "空格  砍/挖/打面前的东西",
      "1 栅栏　2 火把　3 田（按 0 取消）",
      "点空地放下；点坏墙修理。空格拆除。自己能穿过栅栏。",
      "先把篝火四边围上，再留木头合成方块之心。",
      "E  工作台合成 / 祭坛献祭 / 播种",
      "Q 或右键  职业技能",
      "点「麦」或 H  回血",
      "",
      "栅栏挡地面怪，挡不住蝙蝠。火把夜里照明。篝火灭了就失败。祭坛只在天亮后、守过两夜才能献。",
    ].join("\n");
  }

  function buildCost(kind) {
    if (kind === "fence") return { wood: (state.cls === "miner" || state.cls === "knight") ? 1 : 2 };
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

  function setBuild(kind, opts) {
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
    const changed = state.build !== kind;
    state.build = kind;
    if (changed) {
      const names = { fence: "栅栏", torch: "火把", plot: "田" };
      toast(`建造${names[kind]}。点空地放下，点坏墙修好。空格拆除。`);
    }
    syncHud();
  }

  function costText(kind) {
    const cost = buildCost(kind);
    const bits = Object.entries(cost).filter(([, n]) => n > 0).map(([k, n]) => `${n}${labelOf(k)}`);
    return bits.length ? bits.join("") : "免费";
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
    if (kind === "fence" && tileAt(tx, ty) === T.FENCE) {
      const key = `${tx},${ty}`;
      const hp = state.fenceHp.get(key) || FENCE_MAX;
      if (hp >= FENCE_MAX - 0.5) {
        return true;
      }
      if ((state.inv.wood || 0) < 1) {
        toast("修墙需要 1 木。");
        return true;
      }
      state.inv.wood -= 1;
      state.fenceHp.set(key, FENCE_MAX);
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
    const openBefore = kind === "fence" && !campWalled();
    if (kind === "fence") {
      setTile(tx, ty, T.FENCE);
      state.fenceHp.set(`${tx},${ty}`, FENCE_MAX);
    } else if (kind === "torch") {
      setTile(tx, ty, T.TORCH);
    } else {
      setTile(tx, ty, T.FARM);
    }
    state.flags.built = true;
    burst(tx * TILE + 8, ty * TILE + 8, "#ffe27a", 8);
    beep(400, 0.05, "square", 0.04);
    if (openBefore && campWalled()) {
      toast("四边围好了。再砍两棵树，木头还要留给方块之心。", 3);
    }
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
    let fx = p.x;
    let fy = p.y;
    if (state.briefing) {
      fx = state.look.x;
      fy = state.look.y;
    } else if (state.campPull > 0) {
      const k = Math.min(1, state.campPull);
      fx = p.x + (state.camp.x - p.x) * 0.42 * k;
      fy = p.y + (state.camp.y - p.y) * 0.42 * k;
    }
    const vw = VIEW_W * TILE;
    const vh = VIEW_H * TILE;
    return {
      x: clamp(fx - vw / 2, 0, COLS * TILE - vw),
      y: clamp(fy - vh / 2, 0, ROWS * TILE - vh),
    };
  }

  function mouseWorld() {
    const scale = Number(canvas.dataset.scale || 3);
    const cam = camera();
    return { x: cam.x + mouse.x / scale, y: cam.y + mouse.y / scale };
  }

  function aimVec() {
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

  function faceVec(v) {
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

  function isResource(tx, ty) {
    const t = tileAt(tx, ty);
    return t === T.TREE || t === T.STONE || t === T.GOLD
      || (t === T.CROP && (state.crops.get(`${tx},${ty}`)?.stage || 0) >= 2);
  }
  function isDismantle(tx, ty) {
    const t = tileAt(tx, ty);
    return t === T.FENCE || t === T.TORCH;
  }
  function isMineable(tx, ty) {
    return isResource(tx, ty) || isDismantle(tx, ty);
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
      addDrop("wood", cx, cy, 3 + rand(2));
      if (!state.flags.chopped) state.benchHint = 8;
      state.flags.chopped = true;
      burst(cx, cy, "#6bcf6b", 16);
      burst(cx, cy, "#8b5a2b", 8);
      punch(3.2, 0.045);
      chopSound();
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
    const f = aimVec();
    faceVec(f);
    const reach = p.cls === "knight" ? 34 : p.cls === "miner" ? 26 : 22;
    const dmg = CLASSES[p.cls].melee;
    p.attack = 0.2;
    p.slashDx = f.dx;
    p.slashDy = f.dy;
    beep(240, 0.05, "square", 0.035);
    let hits = 0;
    for (const e of state.enemies) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < reach + 8 && dx * f.dx + dy * f.dy > -4) {
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
    const f = aimVec();
    faceVec(f);
    state.bolts.push({
      x: p.x, y: p.y - 6, vx: f.dx * 150, vy: f.dy * 150, life: 0.95, dmg: CLASSES.mage.ranged, nova: false, pierce: 2, hit: new Set(),
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
          x: p.x, y: p.y - 6, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.6, dmg: 18, nova: true, pierce: 1, hit: new Set(),
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
      if (nights >= 2 && state.wave >= 2 && Math.random() < 0.45) kind = "bat";
      if (nights >= 3 && Math.random() < 0.22) kind = "cube";
      const hp = kind === "slime" ? 32 : kind === "bat" ? 22 : 64;
      const spd = kind === "slime" ? 26 : kind === "bat" ? 44 : 30;
      const dmg = kind === "slime" ? 9 : kind === "bat" ? 8 : 16;
      state.enemies.push({ kind, x, y, vx: 0, vy: 0, hp, maxHp: hp, spd, dmg, hit: 0, flash: 0, bob: Math.random() });
      return;
    }
  }

  function hitFence(tx, ty, dmg) {
    const key = `${tx},${ty}`;
    const hp = (state.fenceHp.get(key) || FENCE_MAX) - dmg;
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

  function enemyBlocked(e, x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    return e.kind === "bat" ? flySolid(tx, ty) : groundSolid(tx, ty);
  }

  function startNightWaves() {
    state.wave = 0;
    state.wavesTotal = state.nights === 1 ? 2 : 3;
    state.toSpawn = 0;
    state.waveWait = 2.2;
  }

  function beginWave() {
    state.wave += 1;
    state.toSpawn = 3 + state.nights + state.wave;
    state.spawnAcc = 0;
    state.waveWait = 0;
    toast(`第 ${state.nights} 夜 · 第 ${state.wave}/${state.wavesTotal} 波来了！`, 2.4);
    beep(180, 0.1, "sawtooth", 0.05);
  }

  function updateEnemies(dt) {
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
    for (const e of state.enemies) {
      const dPlayer = dist(e.x, e.y, p.x, p.y);
      if (state.player.dash > 0 && dPlayer < 16 && !e.dashHit) {
        e.dashHit = true;
        e.hp -= 14;
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
          if (e.kind !== "bat" && tileAt(ftx, fty) === T.FENCE) hitFence(ftx, fty, 10 * dt);
        }
        if (!enemyBlocked(e, e.x, ny)) e.y = ny;
        else {
          const ftx = Math.floor(e.x / TILE);
          const fty = Math.floor(ny / TILE);
          if (e.kind !== "bat" && tileAt(ftx, fty) === T.FENCE) hitFence(ftx, fty, 10 * dt);
        }
      }
      if (dPlayer < 14 && e.hit <= 0) {
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
        state.campHp = Math.max(0, state.campHp - e.dmg * 0.85);
        state.campFlash = 0.4;
        burst(state.camp.x, state.camp.y - 8, "#ff6a20", 5);
        state.campPull = Math.max(state.campPull || 0, 1.2);
        punch(2.4, 0.03);
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
        if (state.campHp <= 0) {
          die("篝火熄灭");
        }
      }
    }
    state.enemies = state.enemies.filter((e) => {
      if (e.hp > 0) return true;
      punch(2.6, 0.045);
      burst(e.x, e.y, "#8dff9a", 8);
      state.kills += 1;
      if (Math.random() < 0.45) addDrop("wheat", e.x, e.y, 1);
      if (Math.random() < 0.16) addDrop("gold", e.x, e.y, 1);
      if (Math.random() < 0.22) addDrop("wood", e.x, e.y, 1);
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
      if (dd < 56 && dd > 1) {
        d.x += (p.x - d.x) * 11 * dt;
        d.y += (p.y - d.y) * 11 * dt;
      }
      if (dd < 18) {
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
      if (!b.hit) b.hit = new Set();
      for (const e of state.enemies) {
        if (b.hit.has(e)) continue;
        if (dist(b.x, b.y, e.x, e.y) < 11) {
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
    const enemyNear = state.enemies.some((e) => dist(e.x, e.y, p.x, p.y) < 42);
    const doMine = () => {
      if (p.mineTx !== f.tx || p.mineTy !== f.ty) startMine(f.tx, f.ty);
      const hard = t === T.GOLD ? 1.35 : t === T.STONE ? 1.05 : t === T.TREE ? 0.85 : 0.35;
      p.mine += dt * def.mine / hard;
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
    state.cycle += dt;
    const len = state.day ? state.dayLen : state.nightLen;
    if (state.cycle >= len) {
      state.cycle = 0;
      state.day = !state.day;
      if (!state.day) {
        state.nights += 1;
        startNightWaves();
        toast(state.nights === 1
          ? "第一夜：怪分波朝篝火来。站在墙后打。"
          : `第 ${state.nights} 夜，共 ${state.wavesTotal} 波。蝙蝠会飞过栅栏。`, 3.2);
        beep(140, 0.16, "sawtooth", 0.05);
      } else {
        const extra = !campWalled()
          ? "先把发光的缺口补上，再去凑材料。"
          : survivedNights()
            ? (state.inv.heart ? "可以去北边祭坛献祭了。" : "材料齐了就去工作台合成，再到祭坛。")
            : `还要再守 ${WIN_NIGHTS - state.nights} 夜。白天补墙、凑材料。`;
        toast("天亮了。" + extra, 3);
        beep(620, 0.1, "square", 0.04);
        state.enemies = [];
        state.nightWarned = false;
        state.fenceBreakWarn = false;
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
        toastTimer -= dt;
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
    updateBolts(dt);
    updateCrops(dt);
    updateCycle(dt);
    if (state.day && state.campHp > 0 && dist(state.player.x, state.player.y, state.camp.x, state.camp.y) < 30) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 5 * dt);
      state.campHp = Math.min(CAMP_MAX, state.campHp + 8 * dt);
    }
    const f = aimTile();
    const t = tileAt(f.tx, f.ty);
    const p = state.player;
    let prompt = "";
    if (dist(p.x, p.y, state.bench.x, state.bench.y) < 26 && (state.flags.chopped || materialsReady() || state.inv.heart)) {
      prompt = materialsReady() || state.inv.heart ? "按 E 合成方块之心" : "按 E 查看还差哪些材料";
    } else if (dist(p.x, p.y, state.altar.x, state.altar.y) < 26) {
      if (!state.day) prompt = "祭坛夜里封着，先守篝火";
      else if (!survivedNights()) prompt = `再守 ${WIN_NIGHTS - state.nights} 夜，天亮才能献`;
      else if (state.inv.heart > 0) prompt = "按 E 献上方块之心";
      else prompt = "先去工作台合成方块之心";
    } else if (!state.day && state.enemies.some((e) => dist(e.x, e.y, p.x, p.y) < 42)) {
      prompt = "左键攻击 · Q 技能 · 点坏墙修理";
    } else if (state.build && placeable(f.tx, f.ty)) {
      prompt = state.build === "fence" ? "左键放下栅栏" : state.build === "torch" ? "左键放下火把" : "左键开田";
    } else if (t === T.TREE || tileAt(frontTile().tx, frontTile().ty) === T.TREE) prompt = "空格或按住左键砍树";
    else if (t === T.GOLD) prompt = "按住左键挖金矿";
    else if (t === T.STONE) prompt = "按住左键挖石头";
    else if (t === T.FENCE) {
      const hp = state.fenceHp.get(`${f.tx},${f.ty}`) || FENCE_MAX;
      if (state.build === "fence" && hp < FENCE_MAX - 0.5) prompt = "左键修理栅栏（1木）";
      else if (state.build === "fence" && !campWalled()) prompt = "这段好了。点发光的空地继续围";
      else prompt = "空格拆除栅栏";
    }
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
    if (state.briefing) return "预演：看清要守的火，和最后要送到的祭坛";
    if (!state.day) return "守住篝火！怪从地图边缘朝营地来";
    if (canOffer()) return "天亮了。把方块之心送到北边祭坛（按 E）";
    if (state.inv.heart > 0 && !survivedNights()) return `先再守 ${WIN_NIGHTS - state.nights} 夜，天亮才能献祭`;
    if (materialsReady() && !state.inv.heart) return "去工作台按 E 合成方块之心";
    if (!campWalled()) return "按 1，把篝火上下左右四边的发光格围上";
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
    if (campBar.parentElement) campBar.parentElement.classList.toggle("hurt", (state.campFlash || 0) > 0);
    const remain = Math.max(0, (state.day ? state.dayLen : state.nightLen) - state.cycle);
    const m = Math.floor(remain / 60);
    const s = String(Math.floor(remain % 60)).padStart(2, "0");
    clockEl.textContent = `${state.day ? "白天" : "夜晚"} ${m}:${s}`;
    clockEl.className = "clock " + (state.day ? "day" : "night");
    objectiveEl.textContent = objectiveText();
    skillCdEl.textContent = p.skillCd > 0 ? `${p.skillCd.toFixed(1)}s` : "就绪";
    skillDock.classList.toggle("ready", p.skillCd <= 0);
    if (state.build) {
      const names = { fence: "栅栏", torch: "火把", plot: "田" };
      buildBanner.textContent = `建造${names[state.build]} · ${costText(state.build)} · 点空地放下 / 点坏墙修理 · 按 0 取消`;
      buildBanner.classList.remove("hidden");
    } else {
      buildBanner.classList.add("hidden");
    }
    if (!state.day && state.wavesTotal) {
      if (state.wave === 0) {
        waveBanner.textContent = `第 ${state.nights} 夜  波次准备中`;
      } else if (state.wave >= state.wavesTotal && state.toSpawn <= 0 && state.enemies.length === 0) {
        waveBanner.textContent = "这一夜的波次结束，守到天亮";
      } else {
        waveBanner.textContent = `第 ${state.nights} 夜  波次 ${state.wave}/${state.wavesTotal}  剩余 ${state.toSpawn + state.enemies.length}`;
      }
      waveBanner.classList.remove("hidden");
    } else {
      waveBanner.classList.add("hidden");
    }
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
      const hp = state.fenceHp.get(`${tx},${ty}`) || FENCE_MAX;
      if (hp < FENCE_MAX) {
        px(c, x + 2, y, 12, 2, "#111");
        px(c, x + 2, y, 12 * clamp(hp / FENCE_MAX, 0, 1), 2, "#e8c040");
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
      const ang = Math.atan2(p.slashDy || 1, p.slashDx || 0);
      c.rotate(ang);
      px(c, 8, -2, 10, 2, p.cls === "knight" ? "#e8eef4" : "#c5c9d0");
      px(c, 12, -5, 6, 2, "#fff");
      px(c, 12, 1, 6, 2, "#fff");
    }
    c.restore();
  }

  function drawEnemy(c, e, cam) {
    const x = Math.round(e.x - cam.x);
    const y = Math.round(e.y - cam.y);
    const bob = Math.sin(state.time * 6 + e.bob) * 1;
    if (e.flash > 0) c.globalAlpha = 0.55;
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
    c.globalAlpha = 1;
    if (e.hp < e.maxHp) {
      px(c, x - 6, y - 16 + bob, 12, 2, "#111");
      px(c, x - 6, y - 16 + bob, 12 * clamp(e.hp / e.maxHp, 0, 1), 2, "#d4454a");
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
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
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
        const hp = state.fenceHp.get(`${f.tx},${f.ty}`) || FENCE_MAX;
        if (hp < FENCE_MAX - 0.5) {
          ctx.strokeStyle = "#8dff9a";
          ctx.strokeRect(f.tx * TILE - cam.x + 1, f.ty * TILE - cam.y + 1, 14, 14);
        }
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
    if (!state || state.over || state.briefing) return;
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
    ensureAudio();
    playIntro(selectedClass);
  });
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
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Digit0", "Digit1", "Digit2", "Digit3"].includes(e.code)) e.preventDefault();
    if (!state) return;
    if (e.code === "Escape") togglePause();
    if (e.code === "KeyM") cycleAudio();
    if (state.paused || e.repeat) return;
    if (e.code === "KeyE" || e.code === "KeyF") interact();
    if (e.code === "KeyQ") useSkill();
    if (e.code === "KeyH") eatWheat();
    if (e.key === "0" || e.code === "Digit0" || e.code === "Numpad0") setBuild(null);
    if (e.key === "1" || e.code === "Digit1" || e.code === "Numpad1") setBuild("fence");
    if (e.key === "2" || e.code === "Digit2" || e.code === "Numpad2") setBuild("torch");
    if (e.key === "3" || e.code === "Digit3" || e.code === "Numpad3") setBuild("plot");
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
    start: (cls) => startGame(cls || "miner"),
    playIntro,
    skipIntro: finishIntro,
    skipBrief: endBriefing,
    cam: () => camera(),
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
