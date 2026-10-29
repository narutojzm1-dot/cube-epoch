import { CAMP_MAX, CLASSES, UNLOCKS, ACHIEVEMENTS, DAILY_DIFFICULTY, DAILY_PREFIX, DEFAULT_DIFFICULTY, DIFFICULTIES, DAY_EVENT_FX, ENEMIES, RELICS, RELIC_TYPE_LABEL, STORE_PREFIX } from "./data.js";
import { beep } from "./audio.js";
import { eraName, state, session } from "./core.js";
import { overlay, showOverlay, toast } from "./ui.js";

export function loadStore(key, fallback) {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + key);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === "object" ? { ...fallback, ...v } : fallback;
  } catch {
    return fallback;
  }
}
export function saveStore(key, value) {
  try {
    localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value));
  } catch {
    // 隐私模式或存储已满：静默忽略，游戏照常运行。
  }
}
export const meta = {
  ach: loadStore("ach", {}),
  codex: loadStore("codex", { enemies: [], relics: [] }),
  stats: loadStore("stats", { runs: 0, wins: 0, bestNights: 0, bestEra: 1, kills: 0, daily: {} }),
};
if (!Array.isArray(meta.codex.enemies)) meta.codex.enemies = [];
if (!Array.isArray(meta.codex.relics)) meta.codex.relics = [];
if (!meta.stats.daily || typeof meta.stats.daily !== "object") meta.stats.daily = {};
if (!meta.stats.byDiff || typeof meta.stats.byDiff !== "object") meta.stats.byDiff = {};
meta.prefs = loadStore("prefs", { difficulty: DEFAULT_DIFFICULTY });
if (!meta.prefs || typeof meta.prefs !== "object" || !DIFFICULTIES[meta.prefs.difficulty]) meta.prefs = { difficulty: DEFAULT_DIFFICULTY };

meta.unlocks = loadStore("unlocks", []);
if (!Array.isArray(meta.unlocks)) meta.unlocks = [];

export function unlockMet(u) {
  if (u.need.ach) return !!meta.ach[u.need.ach];
  if (u.need.kills) return (meta.stats.kills || 0) >= u.need.kills;
  return false;
}
export function isUnlocked(id, daily) {
  const u = UNLOCKS.find((x) => x.id === id);
  if (!u) return true;
  return !daily && unlockMet(u);
}
// 新达成的解锁只提示一次；已提示的记在 cube-epoch:v1:unlocks。
export function checkUnlocks() {
  const fresh = UNLOCKS.filter((u) => unlockMet(u) && !meta.unlocks.includes(u.id));
  if (!fresh.length) return [];
  for (const u of fresh) meta.unlocks.push(u.id);
  saveStore("unlocks", meta.unlocks);
  if (state && state.achQueue) {
    for (const u of fresh) {
      const r = RELICS.find((x) => x.id === u.id);
      state.achQueue.push({ name: `解锁遗物·${r.name}`, desc: "以后的三选一里可能出现。" });
    }
  }
  return fresh.map((u) => u.id);
}

export function setDifficulty(id) {
  if (!DIFFICULTIES[id]) return;
  meta.prefs.difficulty = id;
  saveStore("prefs", meta.prefs);
}
export function runDifficulty(seed, wanted) {
  if (isDaily(seed)) return DAILY_DIFFICULTY;
  if (DIFFICULTIES[wanted]) return wanted;
  return meta.prefs.difficulty;
}
function winRate(runs, wins) {
  return runs ? `${Math.round((wins / runs) * 100)}%（${wins}/${runs}）` : "—";
}

export function dailySeed(date) {
  const d = date || new Date();
  return `${DAILY_PREFIX}${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
export function isDaily(seed) {
  return /^daily-\d{8}$/.test(seed || "");
}

export function codexAdd(kind, id) {
  const list = meta.codex[kind];
  if (list.includes(id)) return;
  list.push(id);
  saveStore("codex", meta.codex);
}

export const ACH_CHECK = {
  first_night: (s, ev) => ev === "dawn" && s.nights >= 1,
  first_heart: (s) => s.flags.crafted,
  era_one: (s) => s.win,
  era_three: (s) => s.era >= 3,
  no_repair: (s) => s.win && s.repairs === 0,
  farm_only: (s) => s.win && (s.heals.wheat || s.heals.harvest) && !s.heals.camp && !s.heals.spring && !s.heals.blessing,
  full_camp: (s, ev) => ev === "dawn" && s.nights >= 1 && !s.nightCampHit,
  night_30: (s) => s.nightKills >= 30,
  boss_slayer: (s) => s.bossKills >= 1,
  tower_three: (s) => s.towersBuilt >= 3,
  trader: (s) => !!(s.dayEvent && s.dayEvent.id === "caravan" && s.dayEvent.trades >= DAY_EVENT_FX.caravanTrades),
  stargazer: (s) => s.meteorSeen,
  statue_wake: (s) => s.statueWoke,
  relic_five: (s) => s.relics.filter((id) => RELICS.find((r) => r.id === id && r.type === "relic")).length >= 5,
  mutant: (s) => s.relics.some((id) => RELICS.find((r) => r.id === id && r.type === "mutation")),
  daily: (s, ev) => ev === "end" && isDaily(s.seed),
};

export function checkAch(ev) {
  if (!state) return;
  for (const a of ACHIEVEMENTS) {
    if (meta.ach[a.id]) continue;
    const fn = ACH_CHECK[a.id];
    if (!fn || !fn(state, ev)) continue;
    meta.ach[a.id] = new Date().toISOString().slice(0, 10);
    saveStore("ach", meta.ach);
    state.achQueue.push(a);
  }
  checkUnlocks();
}

export function updateAch(dt) {
  state.achAcc += dt;
  if (state.achAcc >= 0.5) {
    state.achAcc = 0;
    checkAch("tick");
  }
  if (state.achQueue.length && session.toastTimer <= 0) {
    const a = state.achQueue.shift();
    toast(a.id ? `成就解锁「${a.name}」：${a.desc}` : `${a.name}：${a.desc}`, 2.6);
    beep(990, 0.08, "triangle", 0.05);
  }
}

export function recordRun() {
  if (state.recorded) return;
  state.recorded = true;
  const st = meta.stats;
  st.runs += 1;
  st.kills += state.kills;
  st.bestNights = Math.max(st.bestNights, state.nights);
  st.bestEra = Math.max(st.bestEra, state.era);
  const won = state.win || state.era > 1;
  if (won) st.wins += 1;
  const d = state.difficulty || DEFAULT_DIFFICULTY;
  const row = st.byDiff[d] && typeof st.byDiff[d] === "object" ? st.byDiff[d] : { runs: 0, wins: 0 };
  row.runs = (row.runs || 0) + 1;
  row.wins = (row.wins || 0) + (won ? 1 : 0);
  st.byDiff[d] = row;
  if (isDaily(state.seed)) st.daily[state.seed] = Math.max(st.daily[state.seed] || 0, state.nights);
  const keys = Object.keys(st.daily).sort();
  while (keys.length > 30) delete st.daily[keys.shift()];
  saveStore("stats", st);
  checkAch("end");
}

export function titleStatsText() {
  const st = meta.stats;
  const got = ACHIEVEMENTS.filter((a) => meta.ach[a.id]).length;
  const today = st.daily[dailySeed()];
  if (!st.runs) return `成就 ${got}/${ACHIEVEMENTS.length} · 还没有战绩，先来一局吧`;
  const d = meta.prefs.difficulty;
  const row = st.byDiff[d] || { runs: 0, wins: 0 };
  return `已玩 ${st.runs} 局 · 通关率 ${winRate(st.runs, st.wins || 0)} · ${DIFFICULTIES[d].name}通关率 ${winRate(row.runs || 0, row.wins || 0)}`
    + ` · 最远第${st.bestNights}夜 · 最高${eraName(st.bestEra)} · 累计击杀 ${st.kills} · 成就 ${got}/${ACHIEVEMENTS.length}`
    + (today !== undefined ? ` · 今日挑战最佳第${today}夜` : "");
}

export function codexText() {
  const lines = [];
  const enemies = Object.entries(ENEMIES);
  lines.push(`【敌人图鉴】${meta.codex.enemies.length}/${enemies.length}`);
  lines.push(enemies.map(([id, e]) => (meta.codex.enemies.includes(id) ? e.name : "？？？")).join(" · "));
  lines.push("");
  lines.push(`【遗物图鉴】${RELICS.filter((r) => meta.codex.relics.includes(r.id)).length}/${RELICS.length}`);
  for (const r of RELICS) {
    const tag = r.cls ? `·${CLASSES[r.cls].name}专属` : "";
    lines.push(meta.codex.relics.includes(r.id) ? `${r.name}（${RELIC_TYPE_LABEL[r.type]}${tag}）：${r.desc}` : "？？？");
  }
  lines.push("");
  lines.push(`【局外解锁】${UNLOCKS.filter(unlockMet).length}/${UNLOCKS.length}`);
  for (const u of UNLOCKS) {
    const r = RELICS.find((x) => x.id === u.id);
    if (unlockMet(u)) lines.push(`✔ ${r.name}：${r.desc}`);
    else {
      const prog = u.need.kills ? `（${Math.min(meta.stats.kills || 0, u.need.kills)}/${u.need.kills}）` : "";
      lines.push(`🔒 ？？？ —— 解锁条件：${u.hint}${prog}`);
    }
  }
  lines.push("");
  lines.push(`【成就】${ACHIEVEMENTS.filter((a) => meta.ach[a.id]).length}/${ACHIEVEMENTS.length}`);
  for (const a of ACHIEVEMENTS) {
    lines.push(meta.ach[a.id] ? `★ ${a.name}：${a.desc}` : `☆ ？？？：${a.desc}`);
  }
  return lines.join("\n");
}

export function openCodex() {
  showOverlay("图鉴 / 成就", codexText(), [["关闭", () => overlay.classList.add("hidden")]]);
  overlay.classList.add("codex");
}

// 结算页「本局高光」：最多 3 行；短版拼进分享战绩。
export function highlights() {
  const hl = state.hl;
  if (!hl) return { lines: [], tags: [] };
  const lines = [];
  const tags = [];
  if (hl.campLow <= 0) {
    lines.push(`篝火一度熄灭（第${hl.campLowNight}夜）`);
    tags.push("篝火曾熄");
  } else if (hl.campLow < CAMP_MAX) {
    const hp = Math.ceil(hl.campLow);
    lines.push(`最惊险：第${hl.campLowNight}夜篝火只剩 ${hp} 点`);
    tags.push(`篝火最低${hp}`);
  } else if (state.nights > 0) {
    lines.push("篝火从没掉过一滴血");
    tags.push("篝火无伤");
  }
  if (hl.bestKills > 0) {
    lines.push(`最猛一夜：第${hl.bestKillsNight}夜击杀 ${hl.bestKills} 只`);
    tags.push(`单夜${hl.bestKills}杀`);
  }
  if (hl.boss.length) {
    const fast = hl.boss.reduce((a, b) => (b.secs < a.secs ? b : a));
    lines.push(`弑王：${fast.secs} 秒击败${fast.name}`);
    tags.push(`${fast.name}${fast.secs}秒`);
  }
  return { lines, tags };
}

export function shareText() {
  const names = state.picks.map((id) => RELICS.find((r) => r.id === id).name);
  const d = state.difficulty || DEFAULT_DIFFICULTY;
  const tags = highlights().tags;
  const tail = (d !== DEFAULT_DIFFICULTY ? `${DIFFICULTIES[d].name} · ` : "") + `第${state.nights}夜 · 击杀${state.kills} · 遗物[${names.join(",")}]`
    + (tags.length ? ` · 高光[${tags.join(",")}]` : "");
  if (isDaily(state.seed)) return `方块纪元·每日 ${state.seed.slice(-4)} · ${eraName(state.era)} · ${tail}`;
  return `方块纪元·种子 ${state.seed} · ${eraName(state.era)} · ${tail}`;
}
