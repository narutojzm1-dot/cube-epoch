// 方块纪元 · 纯数据配置。所有玩家可见的数值集中在这里，调平衡只改本文件。

export const TILE = 16;
export const COLS = 48;
export const ROWS = 36;
export const VIEW_W = 20;
export const VIEW_H = 12;
export const NEED = { wood: 4, stone: 5, gold: 3, wheat: 3 };
export const WIN_NIGHTS = 2;
export const CAMP_MAX = 100;
export const FENCE_MAX = 80;

export const T = {
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
  SPORE: 14,
  TOWER: 15,
  SPIKE: 16,
  SPRING: 17,
  MUSHROOM: 18,
  STATUE: 19,
  RUBBLE: 20,
};

export const CLASSES = {
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

// 敌人基础属性。纪元越高，hp/dmg 按 ERA_SCALING 指数放大。
// flying: 飞越栅栏 · burrow: 地下穿行栅栏，火把/篝火旁显形 · ranged: 远程投石 · spore: 死后腐蚀地块 · boss: 纪元 Boss
export const ENEMIES = {
  slime: { name: "史莱姆", hp: 32, spd: 26, dmg: 9 },
  bat: { name: "蝙蝠", hp: 22, spd: 44, dmg: 8, flying: true },
  cube: { name: "方块", hp: 64, spd: 30, dmg: 16 },
  burrower: { name: "掘地虫", hp: 26, spd: 30, dmg: 10, burrow: true },
  thrower: { name: "投石魔", hp: 40, spd: 22, dmg: 12, ranged: true },
  spore: { name: "孢子花", hp: 30, spd: 18, dmg: 6, spore: true },
  slime_king: { name: "巨史莱姆王", hp: 420, spd: 18, dmg: 20, boss: true, fenceMul: 3 },
  shadow_knight: { name: "暗影骑士", hp: 360, spd: 30, dmg: 22, boss: true, fenceMul: 3 },
};

// 敌种抽取表：按顺序判定，满足纪元/夜数/波次门槛且掷中概率则覆盖为该敌种；都不中则为 slime。
export const SPAWN_TABLE = [
  { kind: "bat", minEra: 1, minNight: 2, minWave: 2, chance: 0.45 },
  { kind: "burrower", minEra: 1, minNight: 2, minWave: 1, chance: 0.14 },
  { kind: "spore", minEra: 1, minNight: 2, minWave: 3, chance: 0.16 },
  { kind: "thrower", minEra: 2, minNight: 0, minWave: 1, chance: 0.16 },
  { kind: "cube", minEra: 1, minNight: 3, minWave: 0, chance: 0.22 },
];

// 纪元 Boss：每纪元最后一夜的最后一波登场，按纪元轮换。
export const BOSSES = ["slime_king", "shadow_knight"];

// 新敌种机制数值。
export const ENEMY_FX = {
  burrowTorchRadius: 54,
  burrowCampRadius: 26,
  burrowRevealSlow: 0.5,
  throwRange: 72,
  throwCd: 2.2,
  rockSpeed: 90,
  rockFenceDmg: 22,
  rockCampMul: 0.6,
  sporeRadius: 1,
  sporeGrowMul: 0.5,
  bossPhaseAt: 0.5,
  kingSplit: 4,
  knightEnrageSpd: 1.6,
  knightEnrageDmg: 1.2,
  fenceDps: 10,
};

// 怪物死亡掉落概率（每项独立判定）。
export const ENEMY_DROPS = [
  { kind: "wheat", chance: 0.45 },
  { kind: "gold", chance: 0.16 },
  { kind: "wood", chance: 0.22 },
  { kind: "seed", chance: 0.2 },
];

// 波次：第一夜 2 波，之后 3 波；每进入一个新纪元 +1 波。
export const WAVES = {
  firstNight: 2,
  later: 3,
  perEra: 1,
  baseSpawn: 3,
};

// 纪元难度阶梯：每纪元敌人 HP/伤害 ×ERA_SCALING，所需守夜数 +ERA_NIGHTS_STEP。
export const ERA_SCALING = 1.35;
export const ERA_NIGHTS_STEP = 1;
export const ERA_NAMES = ["第一纪元", "第二纪元", "第三纪元", "第四纪元", "第五纪元", "第六纪元", "第七纪元", "第八纪元", "第九纪元", "第十纪元"];

// 黎明的馈赠：每撑过一夜，天亮三选一。
// type: relic（被动，永久）/ blessing（一次性或限时）/ mutation（双刃剑，永久）
// weight: 加权随机抽取权重；relic 与 mutation 不会重复获得。
export const RELICS = [
  { id: "flint_axe", type: "relic", name: "燧石斧", desc: "砍树速度 +50%。", weight: 10 },
  { id: "miner_lamp", type: "relic", name: "矿工头灯", desc: "夜间视野 +1 格。", weight: 10 },
  { id: "wind_chime", type: "relic", name: "风铃", desc: "靠近篝火的敌人减速 30%。", weight: 9 },
  { id: "whetstone", type: "relic", name: "磨刀石", desc: "近战与法术伤害 +25%。", weight: 9 },
  { id: "light_boots", type: "relic", name: "轻靴", desc: "移动速度 +15%。", weight: 9 },
  { id: "iron_hoops", type: "relic", name: "铁箍栅栏", desc: "栅栏耐久 +50%。", weight: 8 },
  { id: "ember_core", type: "relic", name: "余烬之芯", desc: "篝火受到的伤害 -30%。", weight: 8 },
  { id: "thorn_fence", type: "relic", name: "荆棘栅栏", desc: "啃栅栏的怪每秒受到 8 点伤害。", weight: 7 },
  { id: "harvest_charm", type: "relic", name: "丰饶护符", desc: "吃麦额外回复 10 生命。", weight: 7 },
  { id: "sundial_shard", type: "relic", name: "日晷碎片", desc: "白天日晷行动点 +4。", weight: 8 },
  { id: "lucky_coin", type: "relic", name: "幸运币", desc: "怪物掉落概率 ×1.5。", weight: 7 },
  { id: "supply_cache", type: "blessing", name: "补给箱", desc: "立刻获得 6 木、4 石。", weight: 10 },
  { id: "hearth_song", type: "blessing", name: "炉火之歌", desc: "篝火与生命立刻回满。", weight: 9 },
  { id: "wolf_howl", type: "blessing", name: "狼群嚎叫", desc: "下一夜开场 10 秒，敌人互相撕咬：减速一半并持续掉血。", weight: 8 },
  { id: "blood_moon", type: "mutation", name: "血月契约", desc: "敌人 +40% 生命，但掉落双倍。", weight: 6 },
  { id: "glass_cannon", type: "mutation", name: "玻璃大炮", desc: "伤害 +50%，生命上限 -30%。", weight: 5 },
  { id: "greedy_hearth", type: "mutation", name: "贪婪篝火", desc: "篝火白天不再回血，但每次天亮获得 3 金。", weight: 5 },
];

export const RELIC_TYPE_LABEL = { relic: "遗物", blessing: "祝福", mutation: "变异" };
export const DAWN_CHOICES = 3;

// 遗物与变异的具体数值。
export const RELIC_FX = {
  flintAxeChop: 1.5,
  minerLampLight: 16,
  windChimeRadius: 56,
  windChimeSlow: 0.7,
  whetstoneDmg: 1.25,
  lightBootsSpeed: 1.15,
  ironHoopsFence: 1.5,
  emberCoreCamp: 0.7,
  thornFenceDps: 8,
  harvestCharmHeal: 10,
  luckyCoinDrop: 1.5,
  supplyWood: 6,
  supplyStone: 4,
  wolfHowlSecs: 10,
  wolfHowlDps: 4,
  wolfHowlSlow: 0.5,
  bloodMoonHp: 1.4,
  bloodMoonDrop: 2,
  glassCannonDmg: 1.5,
  glassCannonHp: 0.7,
  greedyHearthGold: 3,
  sundialAp: 4,
};

// 日晷行动点：白天砍树、挖矿、建造、修墙各耗 1 点；收麦、拆除与夜里的行动不耗点。天亮回满。
export const AP_BASE = 14;
export const AP_COST = { chop: 1, mine: 1, build: 1, repair: 1 };

// 建筑表：按数字键选择。stored = 背包里预存的成品（开局赠送），classCost = 职业专属折扣。
export const BUILDINGS = {
  fence: { name: "栅栏", key: "1", tile: "FENCE", cost: { wood: 2 }, stored: "fence", classCost: { miner: { wood: 1 }, knight: { wood: 1 } } },
  torch: { name: "火把", key: "2", tile: "TORCH", cost: { wood: 1, stone: 1 }, stored: "torch", classCost: { mage: { wood: 1, stone: 0 } } },
  plot: { name: "田", key: "3", tile: "FARM", cost: { wood: 1 }, stored: "plot", classCost: { farmer: { wood: 0 } } },
  tower: { name: "箭塔", key: "4", tile: "TOWER", cost: { stone: 3, gold: 1 }, desc: "自动射击附近的怪。" },
  spike: { name: "尖刺", key: "5", tile: "SPIKE", cost: { wood: 2 }, desc: "踩上的地面怪持续掉血。" },
  spring: { name: "圣泉", key: "6", tile: "SPRING", cost: { stone: 2, wheat: 1 }, desc: "站在附近缓慢回血。" },
};

export const BUILD_FX = {
  towerRange: 80,
  towerCd: 0.9,
  towerDmg: 12,
  towerBoltSpeed: 170,
  spikeDps: 10,
  springRadius: 40,
  springHeal: 3,
};

// 地图生态：四个分区位置每局随机洗牌；森林/采石场各有一半概率变成蘑菇林/晶洞。
export const BIOME_SLOTS = [
  { name: "西北", x: 9, y: 10 },
  { name: "东北", x: 37, y: 12 },
  { name: "西南", x: 10, y: 26 },
  { name: "东南", x: 38, y: 27 },
];
export const BIOME_FX = {
  mushroomChance: 0.5,
  crystalChance: 0.5,
  crystalGold: 9,
  quarryGold: 5,
  statues: 3,
  statueWakeChance: 0.35,
  statueWakeRadius: 6,
  rubbleCount: 16,
  rubbleStone: 1,
  sporeNearMushroom: 0.6,
  mushroomLight: 28,
};
