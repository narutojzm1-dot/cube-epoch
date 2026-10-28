import { BUILDINGS, CAMP_MAX, CLASSES, COLS, NEED, ROWS, T, TILE, VIEW_H, VIEW_W } from "./data.js";
import { audioCtx, beep, ensureMusicPad, musicGain, musicOn } from "./audio.js";
import { buildCost, apMax, costText } from "./build.js";
import { campRing, markSeenWorld, campWalled, clamp, dist, eraName, inBounds, materialsReady, nightsLeft, setLast, setToastTimer, solid, state, survivedNights, tileAt } from "./core.js";
import { startGame } from "./game.js";

export const canvas = document.getElementById("game");
export const ctx = canvas.getContext("2d");
export const screenTitle = document.getElementById("screen-title");
export const screenGame = document.getElementById("screen-game");
export const overlay = document.getElementById("overlay");
export const overlayTitle = document.getElementById("overlay-title");
export const overlayBody = document.getElementById("overlay-body");
export const overlayActions = document.getElementById("overlay-actions");
export const toastEl = document.getElementById("toast");
export const hpBar = document.getElementById("hp-bar");
export const hpText = document.getElementById("hp-text");
export const manaWrap = document.getElementById("mana-wrap");
export const manaBar = document.getElementById("mana-bar");
export const manaText = document.getElementById("mana-text");
export const campBar = document.getElementById("camp-bar");
export const campText = document.getElementById("camp-text");
export const clockEl = document.getElementById("clock");
export const objectiveEl = document.getElementById("objective");
export const apEl = document.getElementById("ap");
export const skillName = document.getElementById("skill-name");
export const skillCdEl = document.getElementById("skill-cd");
export const skillDock = document.querySelector(".skill-dock");
export const btnStart = document.getElementById("btn-start");
export const btnPause = document.getElementById("btn-pause");
export const btnHelp = document.getElementById("btn-help");
export const btnMute = document.getElementById("btn-mute");
export const btnSkipGuide = document.getElementById("btn-skip-guide");
export const guideEl = document.getElementById("guide");
export const guideTitle = document.getElementById("guide-title");
export const guideBody = document.getElementById("guide-body");
export const promptEl = document.getElementById("prompt");
export const buildBanner = document.getElementById("build-banner");
export const waveBanner = document.getElementById("wave-banner");
export const screenIntro = document.getElementById("screen-intro");
export const introText = document.getElementById("intro-text");
export const introCursor = document.getElementById("intro-cursor");
export const introBox = document.getElementById("intro-box");
export const btnSkipIntro = document.getElementById("btn-skip-intro");
export const briefingEl = document.getElementById("briefing");
export const briefingBox = document.getElementById("briefing-box");
export const briefingTitle = document.getElementById("briefing-title");
export const briefingText = document.getElementById("briefing-text");
export const briefingCursor = document.getElementById("briefing-cursor");
export const btnSkipBrief = document.getElementById("btn-skip-brief");
export const btnDaily = document.getElementById("btn-daily");
export const btnCodex = document.getElementById("btn-codex");
export const titleStats = document.getElementById("title-stats");

export const keysHintEl = document.getElementById("keys-hint");

export const GUIDE = [
  { id: "move", title: "第一步：走起来", body: "用 WASD 或方向键移动。金框指着附近的树，先走过去。" },
  { id: "chop", title: "第二步：砍木头", body: "对准金框的树，按空格或按住左键。木头会飞进背包，用来围栅栏。" },
  // 围营正文会按缺口/木料在 wallGuideBody 里重写；原句留下当兜底
  { id: "build", title: "第三步：围营地", body: "按 1 选栅栏，把篝火上下左右四格围上。发光的格子就是缺口。木头还要留给方块之心。" },
  { id: "night", title: "第四步：守住篝火", body: "怪朝篝火走，站在墙后打，缺口要补。第二夜蝙蝠飞墙，第三夜金色立方会来。" },
  { id: "offer", title: "第五步：天亮献祭", body: "凑齐材料在工作台按 E 合成方块之心。撑过三夜，天亮后送到北边祭坛。" },
];

export function toast(text, ms) {
  toastEl.textContent = text;
  toastEl.classList.remove("hidden");
  setToastTimer(ms || 2.2);
}

export const intro = {
  active: false,
  pages: [],
  page: 0,
  shown: 0,
  delay: 38,
  last: 0,
  raf: 0,
  cls: null,
};

export function introPages(cls) {
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
    "围起栅栏，像给火围一条被子。\n守过三夜。把那颗心，送到北边去。\n\n……出发吧。",
  ];
}

export function playIntroTheme() {
  try {
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
  } catch (_) { /* No audio device: keep gameplay running silently. */ }
}

export function renderIntroText() {
  const full = intro.pages[intro.page] || "";
  introText.textContent = full.slice(0, intro.shown);
  introCursor.classList.toggle("hidden", intro.shown < full.length);
}

export function tickIntro(now) {
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

export function showIntroPage() {
  intro.shown = 0;
  intro.delay = 80;
  intro.last = performance.now();
  renderIntroText();
}

export function advanceIntro() {
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

export function finishIntro() {
  if (!intro.active) return;
  intro.active = false;
  if (intro.raf) cancelAnimationFrame(intro.raf);
  intro.raf = 0;
  screenIntro.classList.add("hidden");
  const cls = intro.cls;
  intro.cls = null;
  startGame(cls, { brief: true });
}

export function playIntro(cls) {
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

export const BRIEF = [
  { focus: "camp", title: "要保护的", text: "看见了吗？这簇还在跳的火。\n夜里所有的牙，都会朝它来。它灭了，这一局的太阳也就灭了。" },
  { focus: "bench", title: "合成之心", text: "这张旧台子还温着。\n木、石、金、麦凑齐，按 E。方块之心会在这里醒来。" },
  { focus: "altar", title: "送到这里", text: "顺着土路一直向北。\n那座沉睡的祭坛，才是心要回家的地方。守过三夜，天亮再献。" },
  { focus: "camp", title: "白天先做", text: "先去砍树。把火的上下左右围死。\n记得留木头——心也是要吃木头的。" },
  { focus: "player", title: "出发", text: "预演到此。风已经在等了。\n……正式开始。" },
];
export const brief = { shown: 0, acc: 0 };

export function briefFocus(step) {
  if (!state || !step) return { x: 0, y: 0 };
  if (step.focus === "camp") return state.camp;
  if (step.focus === "bench") return state.bench;
  if (step.focus === "altar") return state.altar;
  return state.player;
}

export function setBriefStep(i) {
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

export function startBriefing() {
  state.briefing = true;
  state.look.x = state.player.x;
  state.look.y = state.player.y;
  briefingEl.classList.remove("hidden");
  guideEl.classList.add("hidden");
  setBriefStep(0);
  syncHud();
}

export function advanceBrief() {
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

export function endBriefing() {
  if (!state || !state.briefing) return;
  state.briefing = false;
  state.look.x = state.player.x;
  state.look.y = state.player.y;
  state.lookTo.x = state.player.x;
  state.lookTo.y = state.player.y;
  briefingEl.classList.add("hidden");
  guideEl.classList.remove("hidden");
  markSeenWorld();
  toast("金框指着附近的树。WASD 走过去，空格或按住左键砍。", 3.2);
  setLast(performance.now());
  syncGuide();
  syncHud();
}
export function canOffer() {
  return state.day && survivedNights() && state.inv.heart > 0;
}

export function currentGuide() {
  if (!state || state.skippedGuide) return null;
  if (!state.flags.moved) return GUIDE[0];
  if (!state.flags.chopped) return GUIDE[1];
  if (!campWalled()) return GUIDE[2];
  if (!survivedNights()) return GUIDE[3];
  if (!state.win) return GUIDE[4];
  return null;
}

export function syncGuide() {
  if (!state) return;
  const step = currentGuide();
  const done = {
    move: state.flags.moved,
    chop: state.flags.chopped,
    build: campWalled(),
    night: survivedNights() || !!state.win,
    offer: !!state.win,
  };
  for (const li of document.querySelectorAll("#guide-steps li")) {
    const id = li.dataset.step;
    li.classList.toggle("done", !!done[id]);
    li.classList.toggle("now", step && step.id === id);
  }
  if (state.skippedGuide || !step) {
    guideEl.classList.add("compact");
    guideTitle.textContent = state.era > 1 ? `${eraName(state.era)} · 当前目标` : "当前目标";
    guideBody.textContent = objectiveText();
    syncKeysHint(null);
    return;
  }
  guideEl.classList.remove("compact");
  guideTitle.textContent = step.title;
  guideBody.textContent = step.id === "build" ? wallGuideBody() : step.body;
  syncKeysHint(step);
}

export function setPrompt(text) {
  if (!text) {
    promptEl.classList.add("hidden");
    promptEl.textContent = "";
    return;
  }
  promptEl.textContent = text;
  promptEl.classList.remove("hidden");
}

export function nearestOf(pred) {
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

export function approachTile(tx, ty) {
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

export function currentTarget() {
  if (!state) return null;
  if (state.briefing) {
    const step = BRIEF[state.briefStep];
    const t = briefFocus(step);
    return { x: t.x, y: t.y, kind: step.focus };
  }
  if (canOffer()) return { x: state.altar.x, y: state.altar.y, kind: "altar" };
  if (!state.day) return { x: state.camp.x, y: state.camp.y, kind: "camp" };
  if (state.inv.heart > 0 && !survivedNights()) return { x: state.camp.x, y: state.camp.y, kind: "camp" };
  // 没围营时：先指树，够料再指缺口——别再让新手盯着篝火
  // 围营优先于工作台，免得先挖齐材料的人被拉去合成
  if (!campWalled()) {
    if (!state.flags.chopped || !canAffordNextFence()) {
      const t = nearestOf((tile) => tile === T.TREE);
      if (t) {
        // 第一棵树框树本身，别框旁边的空地（空格会砍错）
        if (!state.flags.chopped) return { x: t.x, y: t.y, kind: "tree" };
        return { ...(approachTile(t.tx, t.ty) || t), kind: "tree" };
      }
    }
    const p = state.player;
    let best = null;
    let bestD = 1e9;
    for (const [tx, ty] of campGaps()) {
      const d = dist(p.x, p.y, tx * TILE + 8, ty * TILE + 8);
      if (d < bestD) {
        bestD = d;
        best = { x: tx * TILE + 8, y: ty * TILE + 8, kind: "gap" };
      }
    }
    if (best) return best;
    return { x: state.camp.x, y: state.camp.y, kind: "camp" };
  }
  if (materialsReady() && !state.inv.heart) return { x: state.bench.x, y: state.bench.y, kind: "bench" };
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

export function helpText() {
  return [
    "白天围营，夜里守火。首纪元撑过三夜，天亮把方块之心送到北边祭坛。",
    "每撑过一夜，天亮可从三份「黎明的馈赠」里挑一份：遗物、祝福或变异。",
    "献祭后可点亮祭坛进入下一纪元：多守一夜，怪更强。随时可以收手结算，复制战绩。",
    "",
    "WASD  移动",
    "空格  砍/挖/打面前的东西",
    "1 栅栏　2 火把　3 田　4 箭塔　5 尖刺　6 圣泉（按 0 取消）",
    "箭塔自动射怪；尖刺让踩上的地面怪掉血；圣泉旁边慢慢回血。",
    "点空地放下；点坏墙修理。空格拆除。Z 撤销上一次建造。自己能穿过栅栏。",
    "白天的日晷有限：砍树、挖矿、建造、修墙各耗 1 点，天亮回满。收麦、拆除和夜里行动不耗点。",
    "先把篝火四边围上，再留木头合成方块之心。",
    "E  工作台合成 / 祭坛献祭 / 播种",
    "Q 或右键  职业技能",
    "点「麦」或 H  回血",
    "",
    "栅栏挡地面怪，挡不住蝙蝠。火把夜里照明。篝火灭了就失败。祭坛只在天亮且完成当前纪元守夜要求后才能献。",
  ].join("\n");
}

export function resize() {
  const scale = Math.max(2, Math.min(4, Math.floor((window.innerWidth - 48) / (VIEW_W * TILE))));
  canvas.width = VIEW_W * TILE * scale;
  canvas.height = VIEW_H * TILE * scale;
  ctx.imageSmoothingEnabled = false;
  canvas.dataset.scale = String(scale);
}

export function camera() {
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

export function copyText(text) {
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    toast(ok ? "战绩已复制，发给朋友吧。" : "复制失败，请手动选中上面的文字。");
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast("战绩已复制，发给朋友吧。"), fallback);
  } else {
    fallback();
  }
}

export function objectiveText() {
  if (state.briefing) return "预演：看清要守的火，和最后要送到的祭坛";
  if (!state.day) return "守住篝火！怪从地图边缘朝营地来";
  if (canOffer()) return "天亮了。把方块之心送到北边祭坛（按 E）";
  if (state.inv.heart > 0 && !survivedNights()) return `先再守 ${nightsLeft()} 夜，天亮才能献祭`;
  if (!campWalled()) {
    const gaps = campGaps().length;
    if (!state.flags.chopped) return "走到金框的树旁，空格或按住左键砍木头";
    if (!canAffordNextFence()) return `再砍树凑木头（还差 ${gaps} 面墙）`;
    return `按 1，点发光格围营（还差 ${gaps} 面）`;
  }
  if (materialsReady() && !state.inv.heart) return "去工作台按 E 合成方块之心";
  const miss = [];
  if (state.inv.wood < NEED.wood) miss.push(`木 ${state.inv.wood}/${NEED.wood}`);
  if (state.inv.stone < NEED.stone) miss.push(`石 ${state.inv.stone}/${NEED.stone}`);
  if (state.inv.gold < NEED.gold) miss.push(`金 ${state.inv.gold}/${NEED.gold}`);
  if (state.inv.wheat < NEED.wheat) miss.push(`麦 ${state.inv.wheat}/${NEED.wheat}`);
  if (!miss.length) return "材料齐了。去工作台按 E 合成";
  return "采集 " + miss.join("  ") + "，顺手补墙";
}

export function syncHud() {
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
  clockEl.textContent = `${state.era > 1 ? eraName(state.era) + " · " : ""}${state.day ? "白天" : "夜晚"} ${m}:${s}`;
  clockEl.className = "clock " + (state.day ? "day" : "night");
  objectiveEl.textContent = objectiveText();
  if (apEl) {
    apEl.textContent = state.day ? `日晷 ${state.ap}/${apMax()}` : "日晷 · 夜里不耗点";
    apEl.classList.toggle("empty", state.day && state.ap <= 0);
  }
  skillCdEl.textContent = p.skillCd > 0 ? `${p.skillCd.toFixed(1)}s` : "就绪";
  skillDock.classList.toggle("ready", p.skillCd <= 0);
  if (state.build) {
    buildBanner.textContent = `建造${BUILDINGS[state.build].name} · ${costText(state.build)}${state.day ? " + 1 日晷" : ""} · 点空地放下 / 点坏墙修理 · Z 撤销 · 按 0 取消`;
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
    const b = el.querySelector("b");
    if (b && k) {
      const n = state.inv[k] || 0;
      const prev = Number(b.textContent);
      b.textContent = n;
      if (n > prev) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
    }
    el.classList.toggle("ready", k === "heart" && state.inv.heart > 0);
    el.classList.toggle("on", el.dataset.build && state.build === el.dataset.build);
  }
}

export function showOverlay(title, body, actions, opts) {
  overlayTitle.textContent = title;
  overlayBody.textContent = body;
  overlayActions.innerHTML = "";
  overlayActions.classList.toggle("choices", !!(opts && opts.choices));
  overlay.classList.remove("codex");
  for (const [label, fn, attrs] of actions) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    if (attrs && attrs.id) b.id = attrs.id;
    if (attrs && attrs.cls) b.className = attrs.cls;
    if (attrs && attrs.data) Object.assign(b.dataset, attrs.data);
    b.addEventListener("click", fn);
    overlayActions.appendChild(b);
  }
  overlay.classList.remove("hidden");
}

export function togglePause() {
  if (!state || state.over || state.briefing || state.choosing) return;
  state.paused = !state.paused;
  if (state.paused) {
    showOverlay("暂停", helpText(), [
      ["继续", () => {
        overlay.classList.add("hidden");
        state.paused = false;
        setLast(performance.now());
      }],
      ["回选角", () => location.reload()],
    ]);
  } else {
    overlay.classList.add("hidden");
    setLast(performance.now());
  }
}

export function campGaps() {
  return campRing().filter(([tx, ty]) => tileAt(tx, ty) !== T.FENCE);
}

export function canAffordNextFence() {
  if (!state) return false;
  if ((state.inv.fence || 0) > 0) return true;
  const cost = buildCost("fence").wood || 0;
  return (state.inv.wood || 0) >= cost;
}

export function woodToFinishWall() {
  const gaps = campGaps().length;
  const stored = state.inv.fence || 0;
  const needPay = Math.max(0, gaps - stored);
  return needPay * (buildCost("fence").wood || 0);
}

export function syncKeysHint(step) {
  if (!keysHintEl) return;
  if (!step) {
    keysHintEl.textContent = "WASD 移动 · 空格砍/挖/打 · 1-6 建造 · 点空地建造 / 点坏墙修理 · Z 撤销 · Q 技能 · H 吃麦";
    return;
  }
  if (step.id === "move") keysHintEl.textContent = "此刻：WASD 或方向键，走到金框的树旁边";
  else if (step.id === "chop") keysHintEl.textContent = "此刻：对准树，按空格或按住左键砍倒";
  else if (step.id === "build") {
    keysHintEl.textContent = canAffordNextFence()
      ? "此刻：按 1 选栅栏，再点篝火旁发光的格子"
      : "此刻：木头不够围营，再砍金框里的树";
  } else if (step.id === "night") keysHintEl.textContent = "此刻：夜里守篝火 · 左键打怪 · 墙破了按 1 补";
  else if (step.id === "offer") keysHintEl.textContent = "此刻：工作台按 E 合成，天亮送到北边祭坛";
}

export function wallGuideBody() {
  const gaps = campGaps().length;
  const needWood = woodToFinishWall();
  if (!canAffordNextFence()) {
    return `围营还差 ${gaps} 面墙、大约 ${needWood} 木。先对着金框的树按空格或按住左键再砍。`;
  }
  return `按 1 选栅栏，再点篝火旁发光格（还差 ${gaps} 面）。自己能穿过栅栏。木头还要留给方块之心。`;
}
