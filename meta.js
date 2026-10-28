import { ACHIEVEMENTS, DAILY_PREFIX, DAY_EVENT_FX, ENEMIES, RELICS, RELIC_TYPE_LABEL, STORE_PREFIX } from "./data.js";
import { beep } from "./audio.js";
import { eraName, state, toastTimer } from "./core.js";
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
}

export function updateAch(dt) {
  state.achAcc += dt;
  if (state.achAcc >= 0.5) {
    state.achAcc = 0;
    checkAch("tick");
  }
  if (state.achQueue.length && toastTimer <= 0) {
    const a = state.achQueue.shift();
    toast(`成就解锁「${a.name}」：${a.desc}`, 2.6);
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
  if (state.win || state.era > 1) st.wins += 1;
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
  return `已玩 ${st.runs} 局 · 最远第${st.bestNights}夜 · 最高${eraName(st.bestEra)} · 累计击杀 ${st.kills} · 成就 ${got}/${ACHIEVEMENTS.length}`
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
    lines.push(meta.codex.relics.includes(r.id) ? `${r.name}（${RELIC_TYPE_LABEL[r.type]}）：${r.desc}` : "？？？");
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

export function shareText() {
  const names = state.picks.map((id) => RELICS.find((r) => r.id === id).name);
  const tail = `第${state.nights}夜 · 击杀${state.kills} · 遗物[${names.join(",")}]`;
  if (isDaily(state.seed)) return `方块纪元·每日 ${state.seed.slice(-4)} · ${eraName(state.era)} · ${tail}`;
  return `方块纪元·种子 ${state.seed} · ${eraName(state.era)} · ${tail}`;
}
