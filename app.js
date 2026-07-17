const TILE = 48;
const DUNGEON_ZOOM = 1.18;
const MAP_W = 36;
const MAP_H = 24;
const TARGET_FLOOR = 100;
const FLOOR_WIND_WARNING = 240;
const FLOOR_WIND_DANGER = 330;
const FLOOR_WIND_LIMIT = 420;
const ENEMY_RANGED_START_FLOOR = 11;
const VISION_RADIUS = 7;
const BASE_BAG_CAPACITY = 20;
const MAX_BAG_CAPACITY = 40;
const STORAGE_KEY = "stardustRescueBest";
const SAVE_KEY = "stardustRescueSaveV2";
const SOUND_KEY = "stardustRescueSound";
const CONTROL_STORAGE_KEY = "foxboundControlBindingsV1";
const SAVE_SLOT_COUNT = 1;
const SPRITE_TILE = 16;
const SPRITE_MARGIN = 1;
const SPRITE_COLS = 56;
const ACTIVE_FRAME_INTERVAL = 1000 / 30;
const IDLE_FRAME_INTERVAL = 1000 / 18;
const MODAL_FRAME_INTERVAL = 1000 / 6;
const ENTITY_OUTLINE_CACHE_LIMIT = 384;
const DUNGEON_TILE_CACHE_LIMIT = 640;
const DUNGEON_TILE_PADDING = 12;

const canvas = document.querySelector("#gameCanvas");
let ctx = canvas.getContext("2d");
const entityBuffer = document.createElement("canvas");
entityBuffer.width = TILE;
entityBuffer.height = TILE;
const entityBufferCtx = entityBuffer.getContext("2d");
const entityTint = document.createElement("canvas");
entityTint.width = TILE;
entityTint.height = TILE;
const entityTintCtx = entityTint.getContext("2d");
const entityOutlineCache = new Map();
const dungeonTileCache = new Map();
const atlasCellBoundsCache = new WeakMap();
const miniCanvas = document.querySelector("#miniMap");
const miniCtx = miniCanvas.getContext("2d");
const townCanvas = document.querySelector("#townCanvas");
const townCtx = townCanvas.getContext("2d");
const USE_TOWN_BACKDROP = false;
const townBackdrop = new Image();
if (USE_TOWN_BACKDROP) townBackdrop.src = "assets/town/foxbound-spire-hub-v1.jpg?v=pwa11";
const spriteSheet = new Image();
spriteSheet.src = "assets/kenney-roguelike-rpg-pack/Spritesheet/roguelikeSheet_transparent.png";
const mapTokenSheet = new Image();
mapTokenSheet.src = "assets/tokens/foxbound-characters-v3.png?v=pwa11";
const mapTokenCanvas = document.createElement("canvas");
const mapTokenCtx = mapTokenCanvas.getContext("2d", { willReadFrequently: true });
let mapTokenReady = false;
const itemIconSheet = new Image();
itemIconSheet.src = "assets/tokens/foxbound-items-v2.png?v=pwa11";
const enemyArtSheets = Array(4).fill(null);
const FOXBOUND_ASSET_VERSION = "pwa18e";
const FOXBOUND_SPRITE_ROOT = "assets/foxbound-codex-v1";
const FOXBOUND_HERO_SPRITE_IDS = Object.freeze({
  kohaku: "kohaku",
  knight: "regulus",
  magician: "mira",
});
const FOXBOUND_HERO_SAFE_COLUMNS = Object.freeze({
  kohaku: Object.freeze({ idle: 0, walk: 1, action: 1, allowed: Object.freeze([0, 1]) }),
  regulus: Object.freeze({ idle: 1, walk: 1, action: 1, allowed: Object.freeze([1]) }),
  mira: Object.freeze({ idle: 1, walk: 1, action: 3, allowed: Object.freeze([1, 3]) }),
});
const FOXBOUND_ENEMY_SPRITE_IDS = Object.freeze([
  "horn_crown_slime", "purple_wing_demon", "skeleton_soldier", "poison_mushroom", "moss_rock_golem",
  "lava_salamander", "ice_crystal_spider", "mimic_chest", "shadow_lantern_mage", "bomb_imp",
  "moonfang_wolf", "moss_ancient_tree", "sand_poison_scorpion", "crystal_shell_crab", "possessed_armor",
  "frost_armor_turtle", "plague_crow", "poison_frog", "lava_boar", "cursed_lantern",
  "void_eye", "armored_beetle", "snake_priest", "bone_drake_whelp", "stitched_doll",
  "gear_drone", "acid_mud", "storm_harpy", "black_dog_knight", "briar_vine_beast",
  "thunder_horn_ram", "mummy_jackal", "coral_jellyfish", "gear_imp", "shadow_centipede",
  "curse_pumpkin", "frost_owl", "poison_shell_tank", "obsidian_gargoyle", "moonlight_samurai",
]);
const FOXBOUND_BOSS_SPRITE_IDS = Object.freeze([
  "granmos", "nereiya", "varg", "ignibal", "lux_nox",
  "zarga", "aldeon", "selene", "astraios", "void_eater",
]);
const FOXBOUND_RARE_SPRITE_IDS = Object.freeze({
  "rare-stargold": "angelic_treasure_chest",
  "rare-rainbow": "night_moth",
});
const foxboundSpriteEntries = new Map();
const foxboundSpriteImages = new Map();
let foxboundSpriteRefreshQueued = false;
let miniMapRenderKey = "";
let lastCanvasDrawTime = 0;

function foxboundSpriteKey(category, id) {
  return `${category}/${id}`;
}

function scheduleFoxboundSpriteRefresh() {
  if (foxboundSpriteRefreshQueued) return;
  foxboundSpriteRefreshQueued = true;
  requestAnimationFrame(() => {
    foxboundSpriteRefreshQueued = false;
    if (!game) return;
    updateAll();
    if (ui?.townDialog?.open && ui.townDialog.dataset.view === "loadout") {
      renderExpeditionLoadout();
    } else if (ui?.townDialog?.open && game.townView === "characters") {
      renderCharacterSelection();
    } else if (ui?.townDialog?.open && game.townView === "guild") {
      const codexHost = ui.townDialogBody.querySelector(".town-codex-host");
      if (codexHost) renderCodexMenu(codexHost);
    }
    if (ui?.gameMenuDialog?.open && game.menuView === "codex") {
      renderCodexMenu();
    }
  });
}

function requestFoxboundSprite(category, id) {
  if (!id) return null;
  const key = foxboundSpriteKey(category, id);
  const entry = foxboundSpriteEntries.get(key);
  if (!entry) return null;
  let record = foxboundSpriteImages.get(key);
  if (!record) {
    const image = new Image();
    image.decoding = "async";
    record = { image, failed: false };
    foxboundSpriteImages.set(key, record);
    image.addEventListener("load", scheduleFoxboundSpriteRefresh, { once: true });
    image.addEventListener("error", () => { record.failed = true; }, { once: true });
    image.src = `${FOXBOUND_SPRITE_ROOT}/${entry.path}/spritesheet.png?v=${FOXBOUND_ASSET_VERSION}`;
  }
  if (record.failed || !record.image.complete || !record.image.naturalWidth) return null;
  return { entry, image: record.image };
}

function requestEnemyArtSheet(index) {
  if (index < 0 || index >= enemyArtSheets.length) return null;
  let sheet = enemyArtSheets[index];
  if (sheet) return sheet;
  sheet = new Image();
  sheet.decoding = "async";
  sheet.addEventListener("load", scheduleFoxboundSpriteRefresh, { once: true });
  sheet.src = `assets/tokens/foxbound-enemies-${index + 1}-v1.png?v=pwa11`;
  enemyArtSheets[index] = sheet;
  return sheet;
}

function loadFoxboundSpriteManifest() {
  fetch(`${FOXBOUND_SPRITE_ROOT}/runtime-manifest.json?v=${FOXBOUND_ASSET_VERSION}`)
    .then((response) => {
      if (!response.ok) throw new Error(`sprite manifest ${response.status}`);
      return response.json();
    })
    .then((manifest) => {
      for (const entry of manifest.entities || []) {
        foxboundSpriteEntries.set(foxboundSpriteKey(entry.category, entry.id), entry);
      }
      Object.values(FOXBOUND_HERO_SPRITE_IDS).forEach((id) => requestFoxboundSprite("heroes", id));
      scheduleFoxboundSpriteRefresh();
    })
    .catch(() => {
      // The legacy atlas remains available if the optional art pack cannot load.
    });
}
const townFacilities = [
  { key: "characters", name: "継承の鏡", detail: "探索者と進化を選ぶ", x: 286, y: 340, radius: 70, color: "#9de6ed" },
  { key: "board", name: "塔の経路板", detail: "門番と休憩所を確認", x: 446, y: 350, radius: 64, color: "#efc867" },
  { key: "guild", name: "星見観測院", detail: "遠征記録を見る", x: 910, y: 312, radius: 72, color: "#9dcc7c" },
  { key: "storage", name: "風見倉庫", detail: "道具を預ける", x: 224, y: 566, radius: 72, color: "#76cdd4" },
  { key: "shop", name: "星の商店", detail: "道具と星遺物を整える", x: 930, y: 566, radius: 72, color: "#ef8b70" },
  { key: "depart", name: "星喰い塔 出発門", detail: "探索者と初期星遺物を選んで出発", x: 576, y: 616, radius: 72, color: "#f0c862" },
];
const townObstacles = [
  { left: 210, top: 164, right: 362, bottom: 316 },
  { left: 365, top: 188, right: 527, bottom: 326 },
  { left: 78, top: 370, right: 340, bottom: 538 },
  { left: 812, top: 370, right: 1088, bottom: 538 },
  { left: 796, top: 88, right: 1088, bottom: 282 },
];

const ui = {
  floor: document.querySelector("#floorLabel"),
  score: document.querySelector("#scoreLabel"),
  best: document.querySelector("#bestLabel"),
  mission: document.querySelector("#sealLabel"),
  belly: document.querySelector("#bondLabel"),
  bag: document.querySelector("#bellLabel"),
  materials: document.querySelector("#materialLabel"),
  gear: document.querySelector("#gearLabel"),
  battleHud: document.querySelector(".battle-hud"),
  battleLevel: document.querySelector("#battleLevel"),
  battleName: document.querySelector("#battleName"),
  battleType: document.querySelector("#battleType"),
  battleHp: document.querySelector("#battleHp"),
  battleHpFill: document.querySelector("#battleHpFill"),
  battleExpFill: document.querySelector("#battleExpFill"),
  targetHud: document.querySelector("#targetHud"),
  targetHudKicker: document.querySelector("#targetHudKicker"),
  targetHudTitle: document.querySelector("#targetHudTitle"),
  targetHudDetail: document.querySelector("#targetHudDetail"),
  goal: document.querySelector("#goalLabel"),
  rest: document.querySelector("#restLabel"),
  stairs: document.querySelector("#stairsLabel"),
  turn: document.querySelector("#turnLabel"),
  party: document.querySelector("#partyList"),
  moveSummary: document.querySelector("#moveSummary"),
  log: document.querySelector("#logList"),
  toast: document.querySelector("#toast"),
  helpButton: document.querySelector("#helpButton"),
  soundButton: document.querySelector("#soundButton"),
  helpDialog: document.querySelector("#helpDialog"),
  restartButton: document.querySelector("#restartButton"),
  saveButton: document.querySelector("#saveButton"),
  saveDialog: document.querySelector("#saveDialog"),
  saveDialogClose: document.querySelector("#saveDialogClose"),
  saveDialogNote: document.querySelector("#saveDialogNote"),
  saveSlotList: document.querySelector("#saveSlotList"),
  stairsDialog: document.querySelector("#stairsDialog"),
  stairsDialogKicker: document.querySelector("#stairsDialogKicker"),
  stairsDialogTitle: document.querySelector("#stairsDialogTitle"),
  stairsDialogText: document.querySelector("#stairsDialogText"),
  stairsStayButton: document.querySelector("#stairsStayButton"),
  stairsProceedButton: document.querySelector("#stairsProceedButton"),
  restDialog: document.querySelector("#restDialog"),
  restDialogKicker: document.querySelector("#restDialogKicker"),
  restDialogTitle: document.querySelector("#restDialogTitle"),
  restDialogText: document.querySelector("#restDialogText"),
  restDialogChoices: document.querySelector("#restDialogChoices"),
  endOverlay: document.querySelector("#endOverlay"),
  endTitle: document.querySelector("#endTitle"),
  endText: document.querySelector("#endText"),
  endRestartButton: document.querySelector("#endRestartButton"),
  townScreen: document.querySelector("#townScreen"),
  gameLayout: document.querySelector("#gameLayout"),
  touchControls: document.querySelector("#touchControls"),
  townMission: document.querySelector("#townMissionLabel"),
  townRank: document.querySelector("#townRankLabel"),
  townCoin: document.querySelector("#townCoinLabel"),
  townLeaderName: document.querySelector("#townLeaderName"),
  townLeaderType: document.querySelector("#townLeaderType"),
  townLeaderSwatch: document.querySelector("#townLeaderSwatch"),
  townStartFloor: document.querySelector("#townStartFloor"),
  townNextGate: document.querySelector("#townNextGate"),
  townChoiceDepartLabel: document.querySelector("#townChoiceDepartLabel"),
  departButton: document.querySelector("#departButton"),
  townInteraction: document.querySelector("#townInteraction"),
  townInteractionKey: document.querySelector("#townInteractionKey"),
  townInteractionName: document.querySelector("#townInteractionName"),
  townInteractionDetail: document.querySelector("#townInteractionDetail"),
  townDialog: document.querySelector("#townDialog"),
  townDialogTitle: document.querySelector("#townDialogTitle"),
  townDialogBody: document.querySelector("#townDialogBody"),
  gameMenuButton: document.querySelector("#gameMenuButton"),
  gameMenuDialog: document.querySelector("#gameMenuDialog"),
  gameMenuBody: document.querySelector("#gameMenuBody"),
  tacticSummary: document.querySelector("#tacticSummary"),
  karma: document.querySelector("#karmaLabel"),
  chapter: document.querySelector("#chapterLabel"),
  luck: document.querySelector("#luckLabel"),
  eventBanner: document.querySelector("#eventBanner"),
  eventPortrait: document.querySelector("#eventPortrait"),
  eventIcon: document.querySelector("#eventIcon"),
  eventTitle: document.querySelector("#eventTitle"),
  eventDetail: document.querySelector("#eventDetail"),
  levelDialog: document.querySelector("#levelDialog"),
  levelPortrait: document.querySelector("#levelPortrait"),
  levelDialogTitle: document.querySelector("#levelDialogTitle"),
  levelDialogText: document.querySelector("#levelDialogText"),
  levelStatChanges: document.querySelector("#levelStatChanges"),
  levelStatPoints: document.querySelector("#levelStatPoints"),
  levelMoveChoices: document.querySelector("#levelMoveChoices"),
  levelSkillPoints: document.querySelector("#levelSkillPoints"),
  levelLaterButton: document.querySelector("#levelLaterButton"),
  levelSpendButton: document.querySelector("#levelSpendButton"),
  mapLeaderDot: document.querySelector(".map-leader"),
  relicRibbon: document.querySelector("#relicRibbon"),
  touchAButton: document.querySelector("#touchAButton"),
  touchXButton: document.querySelector("#touchXButton"),
  touchYButton: document.querySelector("#touchYButton"),
};

const palette = {
  void: "#070807",
  wall: "#292d29",
  wallDark: "#151816",
  wallLight: "#515846",
  floor: "#4a4034",
  floorAlt: "#554837",
  floorDark: "#302a24",
  moss: "#759a60",
  brass: "#e5ae48",
  teal: "#62c7cf",
  coral: "#ef6b64",
  violet: "#9884dc",
  white: "#fff4df",
  ink: "#171411",
  fog: "rgba(5, 7, 6, 0.68)",
};

const elementCatalog = {
  fire: { name: "炎", symbol: "炎", color: "#ef684f", accent: "#ffd2a6" },
  water: { name: "水", symbol: "水", color: "#52aee8", accent: "#d9f3ff" },
  wood: { name: "木", symbol: "木", color: "#75ad58", accent: "#e2f5ad" },
  light: { name: "光", symbol: "光", color: "#e8c958", accent: "#fff6bd" },
  dark: { name: "闇", symbol: "闇", color: "#9568d8", accent: "#eadfff" },
  divine: { name: "聖神", symbol: "聖", color: "#f4e7a2", accent: "#fffdf0", special: true },
  evil: { name: "邪悪", symbol: "邪", color: "#d8589b", accent: "#ffd5ef", special: true },
};

const elementAdvantages = {
  fire: ["wood"],
  water: ["fire"],
  wood: ["water"],
  light: ["dark"],
  dark: ["light"],
};

const elementResistances = {
  fire: ["water"],
  water: ["wood"],
  wood: ["fire"],
};

function elementInfo(key) {
  return elementCatalog[key] || elementCatalog.light;
}

function elementEffectiveness(attackKey, defenseKey) {
  if (!attackKey || !defenseKey) return 1;
  let multiplier = 1;
  if (elementAdvantages[attackKey]?.includes(defenseKey)) multiplier *= 1.35;
  if (elementResistances[attackKey]?.includes(defenseKey)) multiplier *= 0.75;
  if (defenseKey === "divine" && attackKey !== "divine") multiplier *= 0.8;
  if (attackKey === "evil") multiplier *= 1.2;
  return multiplier;
}

function elementBadgeMarkup(key) {
  const element = elementInfo(key);
  return `<i class="element-badge" style="--element-color:${element.color}">${element.symbol}</i>`;
}

function moveStyleInfo(style) {
  if (style === "physical") {
    return { key: "physical", label: "物理", short: "物", color: "#ff8a68" };
  }
  return { key: "magic", label: "魔法", short: "魔", color: "#8bdcf4" };
}

function moveStyleBadgeMarkup(style) {
  const info = moveStyleInfo(style);
  return `<i class="style-badge ${info.key}" style="--style-color:${info.color}">${info.label}</i>`;
}

function moveAimShape(move) {
  if (!move) return { kind: "melee", range: 1, label: "隣1" };
  if (["heal", "guard", "kingsGuard", "timeLoop"].includes(move.key)) {
    return { kind: "self", range: 0, label: "自分" };
  }
  if (move.key === "gust") return { kind: "burst", range: 1, label: "周囲1" };
  if (move.key === "lionRoar" || move.key === "mirrorCurse") return { kind: "burst", range: 2, label: "周囲2" };
  if (move.key === "shieldCrash") return { kind: "melee", range: 1, label: "正面1" };
  if (move.key === "ironSlash") return { kind: "line", range: 2, label: "前方2" };
  if (move.key === "spark") return { kind: "line", range: 4, label: "前方4" };
  if (move.key === "arcBolt") return { kind: "beam", range: 6, label: "貫通6" };
  if (move.key === "blinkHex") return { kind: "line", range: 4, label: "転位4" };
  if (move.signature === "burst") return { kind: "burst", range: 2, label: "周囲2" };
  if (move.signature === "guard") return { kind: "self", range: 0, label: "自分" };
  if (move.signature === "beam") return { kind: "beam", range: 6, label: "貫通6" };
  if (move.signature === "line") return { kind: "line", range: 4, label: "前方4" };
  if (move.signature === "trick") return { kind: "line", range: 4, label: "前方4" };
  return { kind: "line", range: 4, label: "前方4" };
}

function moveRangeBadgeMarkup(move) {
  return `<i class="range-badge">${moveAimShape(move).label}</i>`;
}

function moveMetaMarkup(move) {
  return `<span class="move-tags">${moveStyleBadgeMarkup(move.style)}${moveRangeBadgeMarkup(move)}</span>`;
}

function characterPassiveInfo(profileKey) {
  return {
    kohaku: {
      name: "狐星調和",
      detail: "異なる属性の技を続けると威力+10%、HPを1回復。",
      icon: "狐",
    },
    knight: {
      name: "王城剣",
      detail: "物理技と通常攻撃の威力が上がり、ガード中はさらに堅い。",
      icon: "剣",
    },
    magician: {
      name: "星術収束",
      detail: "魔法技の威力が上がり、時々PPを1戻す。",
      icon: "術",
    },
  }[profileKey] || { name: "冒険者", detail: "標準的な探索能力。", icon: "星" };
}

function elementLegendMarkup() {
  return Object.entries(elementCatalog)
    .map(([key, element]) => `<span class="${element.special ? "special" : ""}">${elementBadgeMarkup(key)}${element.name}</span>`)
    .join("");
}

const spriteIds = {
  floors: [229, 230, 231, 232, 233, 234],
  moss: [560, 561, 562, 563],
  cracks: [1136, 1137, 1138, 1139],
  walls: [174, 175, 176, 177],
  herb: 640,
  apple: 658,
  badge: 554,
  orb: 1176,
  stairs: 406,
  mission: 554,
  ember: 462,
  sprout: 640,
  crystal: 554,
  totem: 602,
};

const moveCatalog = [
  {
    key: "spark",
    name: "星灯り",
    hint: "前方4マス・魔法",
    maxPp: 12,
    style: "magic",
    element: "light",
  },
  {
    key: "gust",
    name: "狐風の輪",
    hint: "周囲1マス・吹き飛ばし",
    maxPp: 8,
    style: "physical",
    element: "wood",
  },
  {
    key: "heal",
    name: "月雫の手当",
    hint: "自分を大きく回復",
    maxPp: 6,
    style: "magic",
    element: "water",
  },
  {
    key: "guard",
    name: "尾守り",
    hint: "3ターン被害半減",
    maxPp: 5,
    style: "physical",
    element: "wood",
  },
  { key: "ironSlash", name: "亡国の断ち", hint: "前方2マス・高威力", maxPp: 11, style: "physical", element: "fire" },
  { key: "shieldCrash", name: "城壁崩し", hint: "正面・防御低下", maxPp: 7, style: "physical", element: "water" },
  { key: "kingsGuard", name: "王城の構え", hint: "防御・魔防を強化", maxPp: 6, style: "physical", element: "light" },
  { key: "lionRoar", name: "残響の号令", hint: "周囲2マス・威圧", maxPp: 4, style: "physical", element: "fire" },
  { key: "arcBolt", name: "アストラル弾", hint: "前方6マス・貫通", maxPp: 13, style: "magic", element: "water" },
  { key: "blinkHex", name: "転位呪", hint: "前方へ瞬間移動", maxPp: 7, style: "magic", element: "dark" },
  { key: "mirrorCurse", name: "鏡界の呪詛", hint: "周囲・敵を弱体化", maxPp: 6, style: "magic", element: "dark" },
  { key: "timeLoop", name: "時返し", hint: "HPとPPを巻き戻す", maxPp: 3, style: "magic", element: "water" },
];

const characterCatalog = [
  {
    key: "kohaku",
    name: "コハク",
    type: "星巡",
    elementKey: "light",
    color: "#62c7cf",
    accent: "#d7fbff",
    scarf: "#f0b34d",
    maxHp: 34,
    atk: 7,
    magic: 7,
    def: 2,
    res: 2,
    style: "物理・魔法・回復を扱う標準型",
    moves: ["spark", "gust", "heal", "guard"],
    artRow: 0,
  },
  {
    key: "knight",
    name: "レグルス",
    type: "鋼刃",
    elementKey: "fire",
    color: "#d7a45a",
    accent: "#f3e5c7",
    scarf: "#a63f3f",
    maxHp: 42,
    atk: 9,
    magic: 3,
    def: 4,
    res: 2,
    style: "近接火力と防御を両立する物理型",
    moves: ["ironSlash", "shieldCrash", "kingsGuard", "lionRoar"],
    artRow: 1,
  },
  {
    key: "magician",
    name: "ミラ",
    type: "幻星",
    elementKey: "dark",
    color: "#8e83e8",
    accent: "#e7ddff",
    scarf: "#3e65a4",
    maxHp: 28,
    atk: 4,
    magic: 10,
    def: 1,
    res: 4,
    style: "遠距離魔法と位置操作に秀でる奇策型",
    moves: ["arcBolt", "blinkHex", "mirrorCurse", "timeLoop"],
    artRow: 2,
  },
];

const ascensionBranches = {
  kohaku: [
    { key: "fang", label: "紅牙", path: "physical", artColumn: 1, color: "#e45f4c", names: ["火尾", "紅牙", "烈爪", "焔駆", "炎星", "赤天", "獄牙", "劫火", "天狼", "紅蓮狐王"] },
    { key: "lumen", label: "星術", path: "magic", artColumn: 2, color: "#78dbe8", names: ["月芽", "星雫", "光尾", "天詠", "銀河", "星導", "月冠", "天輪", "白星", "星界狐姫"] },
    { key: "shade", label: "月影", path: "trick", artColumn: 3, color: "#9b76df", names: ["宵耳", "影踏", "黒尾", "幻月", "夜渡", "虚狐", "月蝕", "冥路", "無明", "宵界ノクス"] },
  ],
  knight: [
    { key: "warlord", label: "覇道", path: "physical", artColumn: 1, color: "#d45f49", names: ["鉄騎", "破城", "戦鬼", "赤将", "獅王", "覇軍", "断国", "征天", "英雄", "亡国覇王"] },
    { key: "guardian", label: "守護", path: "guard", artColumn: 2, color: "#5b8ed0", names: ["盾徒", "城衛", "碧壁", "聖盾", "王護", "天塞", "不落", "星城", "護国", "永劫城塞"] },
    { key: "revenant", label: "亡霊", path: "trick", artColumn: 3, color: "#6e77d8", names: ["残影", "幽騎", "蒼火", "冥鎧", "夜将", "魂刃", "死王", "無冠", "亡星", "冥府騎皇"] },
  ],
  magician: [
    { key: "archmage", label: "星晶", path: "magic", artColumn: 1, color: "#62c9ed", names: ["晶芽", "蒼杖", "星環", "天晶", "大術", "叡星", "賢界", "真理", "星典", "万象賢者"] },
    { key: "chaos", label: "奇術", path: "trick", artColumn: 2, color: "#e79a4f", names: ["札師", "幻手", "道化", "逆札", "奇星", "運命", "混沌", "戯神", "世界札", "千貌奇術王"] },
    { key: "void", label: "虚空", path: "magic", artColumn: 3, color: "#8d5be1", names: ["影杖", "虚眼", "黒環", "深淵", "冥星", "無音", "虚界", "終夜", "零術", "虚無魔導皇"] },
  ],
};

const asceticNames = ["無印", "裸星", "孤灯", "無垢", "空手", "無欲", "静界", "無冠", "真白", "無窮"];
const karmaNames = ["咎芽", "夜紋", "罪牙", "黒星", "背徳", "禍月", "冥契", "罪冠", "咎王", "断罪星"];

const ascensionStagePlans = {
  kohaku: [
    ["fang", "lumen"],
    ["fang", "shade", "lumen"],
    ["lumen", "shade", "ascetic"],
    ["fang", "lumen", "shade"],
    ["fang", "lumen", "relic"],
    ["shade", "lumen", "ascetic"],
    ["fang", "shade", "relic"],
    ["lumen", "fang", "shade"],
    ["shade", "lumen", "relic", "ascetic"],
    ["fang", "lumen", "shade", "relic", "ascetic"],
  ],
  knight: [
    ["warlord", "guardian"],
    ["warlord", "revenant", "guardian"],
    ["guardian", "revenant", "ascetic"],
    ["warlord", "guardian", "revenant"],
    ["warlord", "guardian", "relic"],
    ["revenant", "guardian", "ascetic"],
    ["warlord", "revenant", "relic"],
    ["guardian", "warlord", "revenant"],
    ["revenant", "guardian", "relic", "ascetic"],
    ["warlord", "guardian", "revenant", "relic", "ascetic"],
  ],
  magician: [
    ["archmage", "chaos"],
    ["archmage", "void", "chaos"],
    ["chaos", "void", "ascetic"],
    ["archmage", "chaos", "void"],
    ["archmage", "chaos", "relic"],
    ["void", "chaos", "ascetic"],
    ["archmage", "void", "relic"],
    ["chaos", "archmage", "void"],
    ["void", "chaos", "relic", "ascetic"],
    ["archmage", "chaos", "void", "relic", "ascetic"],
  ],
};

const ascensionArtTracks = {
  kohaku: {
    fang: [5, 18, 30, 38, 10, 29, 1, 34, 4, 23],
    lumen: [36, 32, 13, 15, 27, 19, 37, 28, 20, 39],
    shade: [1, 8, 20, 22, 24, 34, 28, 35, 21, 14],
    ascetic: [0, 2, 12, 16, 25, 31, 3, 26, 33, 39],
    relic: [7, 14, 18, 23, 33, 4, 27, 38, 11, 39],
    karma: [8, 21, 35, 24, 20, 29, 34, 1, 38, 39],
  },
  knight: {
    warlord: [2, 21, 31, 38, 4, 10, 28, 39, 23, 32],
    guardian: [14, 15, 4, 12, 36, 13, 37, 16, 20, 26],
    revenant: [8, 20, 28, 34, 24, 35, 1, 22, 29, 39],
    ascetic: [0, 16, 12, 3, 25, 2, 36, 27, 14, 39],
    relic: [7, 14, 26, 33, 4, 18, 37, 30, 11, 39],
    karma: [20, 29, 8, 24, 35, 21, 34, 28, 38, 39],
  },
  magician: {
    archmage: [36, 32, 27, 13, 14, 20, 28, 37, 33, 23],
    chaos: [25, 9, 35, 20, 33, 17, 7, 34, 18, 21],
    void: [8, 20, 23, 34, 1, 35, 28, 29, 39, 24],
    ascetic: [0, 12, 16, 2, 31, 36, 26, 3, 14, 39],
    relic: [7, 33, 14, 23, 18, 37, 27, 4, 11, 39],
    karma: [21, 8, 20, 35, 24, 29, 34, 28, 1, 39],
  },
};

const ascensionMovePrefixes = ["芽吹く", "双つ", "走る", "裂ける", "響く", "巡る", "荒ぶる", "冴える", "満ちる", "終の"];

const ascensionMoveThemes = {
  kohaku: {
    fang: { suffix: "紅牙", style: "physical", element: "fire", signature: "line", hint: "前方を裂く物理技" },
    lumen: { suffix: "星燈", style: "magic", element: "light", signature: "beam", hint: "直線を照らす魔法技" },
    shade: { suffix: "宵渡り", style: "magic", element: "dark", signature: "trick", hint: "転位と弱体の奇襲技" },
    ascetic: { suffix: "無印尾", style: "physical", element: "divine", signature: "burst", hint: "周囲を払う均衡技" },
    relic: { suffix: "遺星尾", style: "magic", element: "light", signature: "burst", hint: "星遺物を響かせる範囲技" },
    karma: { suffix: "咎尾", style: "magic", element: "evil", signature: "trick", hint: "カルマを刻む邪悪技" },
  },
  knight: {
    warlord: { suffix: "覇剣", style: "physical", element: "fire", signature: "line", hint: "前方を薙ぐ物理技" },
    guardian: { suffix: "星盾", style: "physical", element: "water", signature: "guard", hint: "守りながら押し返す技" },
    revenant: { suffix: "亡刃", style: "physical", element: "dark", signature: "trick", hint: "影で斬り込み弱らせる技" },
    ascetic: { suffix: "無冠剣", style: "physical", element: "divine", signature: "guard", hint: "耐えて反撃する無印技" },
    relic: { suffix: "遺物剣", style: "physical", element: "fire", signature: "line", hint: "星遺物を込めた斬撃技" },
    karma: { suffix: "咎王剣", style: "physical", element: "evil", signature: "line", hint: "カルマで切り裂く重い斬撃" },
  },
  magician: {
    archmage: { suffix: "星晶術", style: "magic", element: "water", signature: "beam", hint: "長い直線を貫く魔法技" },
    chaos: { suffix: "奇術札", style: "magic", element: "fire", signature: "burst", hint: "周囲を乱す範囲魔法" },
    void: { suffix: "虚空呪", style: "magic", element: "dark", signature: "trick", hint: "位置と能力を崩す呪術" },
    ascetic: { suffix: "無印星", style: "magic", element: "divine", signature: "beam", hint: "素の力で放つ星術" },
    relic: { suffix: "遺星術", style: "magic", element: "light", signature: "burst", hint: "星遺物を核にする範囲術" },
    karma: { suffix: "咎星呪", style: "magic", element: "evil", signature: "burst", hint: "邪気で周囲を崩す術" },
  },
};

function normalizeAscensionBranchKey(branchKey) {
  if (!branchKey) return "ascetic";
  return String(branchKey).startsWith("relic-") ? "relic" : branchKey;
}

function ascensionMoveKey(profileKey, branchKey, stage) {
  return `asc-${profileKey}-${normalizeAscensionBranchKey(branchKey)}-${clamp(stage, 1, 10)}`;
}

function ascensionArtIndex(profileKey, branchKey, stage) {
  const track = ascensionArtTracks[profileKey]?.[normalizeAscensionBranchKey(branchKey)]
    || ascensionArtTracks.kohaku.fang;
  return track[clamp(stage, 1, 10) - 1] ?? track[0] ?? 0;
}

function buildAscensionMoveCatalog() {
  const entries = [];
  for (const [profileKey, themes] of Object.entries(ascensionMoveThemes)) {
    for (const [branchKey, theme] of Object.entries(themes)) {
      for (let stage = 1; stage <= 10; stage += 1) {
        entries.push({
          key: ascensionMoveKey(profileKey, branchKey, stage),
          name: `${ascensionMovePrefixes[stage - 1]}${theme.suffix}`,
          hint: `${theme.hint}・第${stage}段階`,
          maxPp: Math.max(3, 9 - Math.floor(stage / 3)),
          style: theme.style,
          element: theme.element,
          signature: theme.signature,
          range: clamp(2 + Math.floor(stage / 2), 3, 7),
          radius: clamp(1 + Math.floor(stage / 4), 1, 3),
          power: 5 + stage * 2,
          stage,
          branchKey,
        });
      }
    }
  }
  return entries;
}

moveCatalog.push(...buildAscensionMoveCatalog());

const FOXBOUND_MOVE_ELEMENT_KEYS = Object.freeze({
  "火": "fire",
  "水": "water",
  "木": "wood",
  "光": "light",
  "闇": "dark",
  "聖神": "divine",
  "邪悪": "evil",
});

function moveDesignStage(stage, elementKey) {
  if (["divine", "evil"].includes(elementKey)) return "特殊進化";
  if (stage <= 3) return "序盤";
  if (stage <= 6) return "中盤";
  if (stage <= 9) return "終盤";
  return "最終盤";
}

function scoreMoveDesign(move, design) {
  const desiredStage = moveDesignStage(move.stage || 1, move.element);
  const range = String(design.range || "");
  const effect = String(design.effect || "");
  const attackMove = move.signature !== "guard";
  let score = design.stage === desiredStage ? 20 : 0;
  if (move.style === "physical" && design.category === "物理") score += 14;
  if (move.style === "magic" && design.category === "特殊") score += 14;
  if (["guard", "trick"].includes(move.signature) && design.category === "変化") score += 11;
  if (["line", "beam"].includes(move.signature) && /直線|正面|指定/.test(range)) score += 10;
  if (move.signature === "burst" && /周囲|部屋|全体/.test(range)) score += 10;
  if (move.signature === "guard" && /自分|味方/.test(range)) score += 10;
  if (move.signature === "trick" && /転移|移動|位置|入れ替/.test(`${range}${effect}`)) score += 10;
  if (attackMove === (Number(design.power) > 0)) score += 7;
  return score;
}

function syncKnownMoveDesigns() {
  if (!game) return;
  const actors = [
    ...(game.team || []),
    ...Object.values(game.roster || {}),
    game.towerCheckpoint?.leader,
  ].filter(Boolean);
  for (const actor of actors) {
    for (const known of actor.moves || []) {
      const catalogMove = moveCatalog.find((entry) => entry.key === known.key);
      if (!catalogMove?.designId) continue;
      known.name = catalogMove.name;
      known.designId = catalogMove.designId;
      known.designEffect = catalogMove.designEffect;
    }
  }
}

function applyFoxboundMoveDesigns(designs) {
  const normalized = (designs || []).map((design) => ({
    ...design,
    elementKey: FOXBOUND_MOVE_ELEMENT_KEYS[design.element],
  }));
  const used = new Set();
  for (const move of moveCatalog.filter((entry) => String(entry.key).startsWith("asc-"))) {
    const candidates = normalized
      .filter((design) => design.elementKey === move.element && !used.has(design.id))
      .map((design) => ({ design, score: scoreMoveDesign(move, design) }))
      .sort((a, b) => b.score - a.score || a.design.id.localeCompare(b.design.id, "ja"));
    const selected = candidates[0]?.design;
    if (!selected) continue;
    used.add(selected.id);
    move.name = selected.name;
    move.designId = selected.id;
    move.designEffect = selected.effect;
  }
  syncKnownMoveDesigns();
  updateAll();
  if (ui?.townDialog?.open && ui.townDialog.dataset.view === "loadout") renderExpeditionLoadout();
  if (ui?.gameMenuDialog?.open) renderGameMenu(game.menuView);
  if (ui?.levelDialog?.open) renderLevelMoveChoices();
}

function loadFoxboundMoveDesigns() {
  fetch(`assets/data/foxbound-move-designs-v1.json?v=${FOXBOUND_ASSET_VERSION}`)
    .then((response) => {
      if (!response.ok) throw new Error(`move designs ${response.status}`);
      return response.json();
    })
    .then((catalog) => applyFoxboundMoveDesigns(catalog.moves))
    .catch(() => {
      // Generated evolution moves remain available if the optional design catalog cannot load.
    });
}

const itemCatalog = {
  apple: {
    name: "月蜜の実",
    category: "食料",
    detail: "満腹度を45回復する。",
    sprite: spriteIds.apple,
    color: "#f0b34d",
    icon: "食",
  },
  bigApple: {
    name: "大樹の月蜜",
    category: "食料",
    detail: "満腹度を80回復する。",
    sprite: spriteIds.apple,
    color: "#ff9a55",
    icon: "大",
  },
  oran: {
    name: "雫青の実",
    category: "きのみ",
    detail: "リーダーのHPを20回復する。",
    sprite: spriteIds.herb,
    color: "#69aef0",
    icon: "癒",
  },
  elixir: {
    name: "星露のしずく",
    category: "ドリンク",
    detail: "すべての技PPを5回復する。",
    sprite: spriteIds.orb,
    color: "#65d9d7",
    icon: "PP",
  },
  reviver: {
    name: "あかつきの種",
    category: "タネ",
    detail: "倒れた主人公を自動で復活させる。",
    sprite: spriteIds.badge,
    color: "#ffe47b",
    icon: "復",
    automatic: true,
  },
  blastSeed: {
    name: "火走りの種",
    category: "タネ",
    detail: "正面3マスの敵に18ダメージ。",
    sprite: spriteIds.ember,
    color: "#ff795b",
    icon: "爆",
  },
  sleepSeed: {
    name: "夢まどいの種",
    category: "タネ",
    detail: "正面3マスの敵を4ターン眠らせる。",
    sprite: spriteIds.herb,
    color: "#b59af1",
    icon: "眠",
  },
  slumberOrb: {
    name: "静寂の珠",
    category: "ふしぎだま",
    detail: "見えている敵を3ターン眠らせる。",
    sprite: spriteIds.orb,
    color: "#9e85dc",
    icon: "止",
  },
  warpOrb: {
    name: "風渡りの珠",
    category: "ふしぎだま",
    detail: "隊を別の安全な部屋へ移動させる。",
    sprite: spriteIds.orb,
    color: "#6fcce8",
    icon: "跳",
  },
  guidingOrb: {
    name: "導星の珠",
    category: "ふしぎだま",
    detail: "この階の目的地を地図に表示する。",
    sprite: spriteIds.badge,
    color: "#f2c865",
    icon: "導",
  },
  guardBerry: {
    name: "鋼皮の実",
    category: "きのみ",
    detail: "この挑戦中、防御を1上げる。",
    sprite: spriteIds.herb,
    color: "#8db6c4",
    icon: "守",
  },
  powerBerry: {
    name: "牙研ぎの実",
    category: "きのみ",
    detail: "この挑戦中、攻撃を1上げる。",
    sprite: spriteIds.herb,
    color: "#ee8a67",
    icon: "牙",
  },
  fortuneOrb: {
    name: "招福の珠",
    category: "ふしぎだま",
    detail: "この階の運を2上げ、良い落とし物を呼ぶ。",
    sprite: spriteIds.orb,
    color: "#efc75f",
    icon: "運",
  },
  focusMint: {
    name: "澄香ミント",
    category: "きのみ",
    detail: "選択中の技PPを4回復する。",
    sprite: spriteIds.herb,
    color: "#70d8c8",
    icon: "技",
  },
  mindBerry: {
    name: "星詠みの実",
    category: "きのみ",
    detail: "この挑戦中、魔力を1上げる。",
    sprite: spriteIds.herb,
    color: "#8fc6ff",
    icon: "魔",
  },
  wardBerry: {
    name: "薄明の実",
    category: "きのみ",
    detail: "この挑戦中、魔防を1上げる。",
    sprite: spriteIds.herb,
    color: "#c6b7ff",
    icon: "環",
  },
  ironNut: {
    name: "黒鉄ぐるみ",
    category: "きのみ",
    detail: "最大HPを5、防御を1上げる。",
    sprite: spriteIds.badge,
    color: "#9ba8a6",
    icon: "硬",
  },
  pierceSeed: {
    name: "貫きの種",
    category: "タネ",
    detail: "正面4マスを貫き、最初の敵にダメージ。",
    sprite: spriteIds.ember,
    color: "#e3c169",
    icon: "貫",
  },
  stormOrb: {
    name: "雷鳴の珠",
    category: "ふしぎだま",
    detail: "見えている敵すべてに小ダメージ。",
    sprite: spriteIds.orb,
    color: "#f2dd69",
    icon: "雷",
  },
  mapScroll: {
    name: "星図の巻物",
    category: "巻物",
    detail: "訪れていない部屋の形と通常階段を地図へ記す。",
    sprite: spriteIds.badge,
    color: "#dcbf83",
    icon: "図",
  },
  moonShard: {
    name: "月澄の欠片",
    category: "進化素材",
    detail: "星水の敵が落とす、清らかな進化素材。",
    sprite: spriteIds.crystal,
    color: "#7ee9f2",
    icon: "月",
    automatic: true,
  },
  emberCore: {
    name: "緋炉の核",
    category: "進化素材",
    detail: "火晶の敵が落とす、熱を秘めた進化素材。",
    sprite: spriteIds.ember,
    color: "#ff755b",
    icon: "炎",
    automatic: true,
  },
  shadowFang: {
    name: "宵影の牙",
    category: "進化素材",
    detail: "月影の敵や禁じられた行いから得る進化素材。",
    sprite: spriteIds.badge,
    color: "#b58ae8",
    icon: "影",
    automatic: true,
  },
  wisdomSeed: {
    name: "叡樹の種",
    category: "進化素材",
    detail: "森葉の敵が落とす、知恵を宿した進化素材。",
    sprite: spriteIds.herb,
    color: "#83c96c",
    icon: "樹",
    automatic: true,
  },
  bossCore: {
    name: "覇星の核",
    category: "進化素材",
    detail: "ボスやレア敵だけが残す、強大な進化素材。",
    sprite: spriteIds.crystal,
    color: "#ffe36f",
    icon: "冠",
    automatic: true,
  },
};

const evolutionMaterialKeys = ["moonShard", "emberCore", "shadowFang", "wisdomSeed", "bossCore"];
const itemIconCells = {
  apple: [0, 0],
  bigApple: [0, 0],
  oran: [1, 0],
  elixir: [2, 0],
  reviver: [3, 0],
  blastSeed: [4, 0],
  sleepSeed: [0, 1],
  slumberOrb: [1, 1],
  warpOrb: [2, 1],
  guidingOrb: [3, 1],
  guardBerry: [4, 1],
  powerBerry: [0, 2],
  fortuneOrb: [1, 2],
  focusMint: [0, 1],
  mindBerry: [1, 0],
  wardBerry: [4, 1],
  ironNut: [3, 0],
  pierceSeed: [4, 0],
  stormOrb: [2, 0],
  mapScroll: [3, 1],
  moonShard: [2, 2],
  emberCore: [3, 2],
  shadowFang: [4, 2],
  wisdomSeed: [0, 3],
  bossCore: [1, 3],
  relic: [2, 3],
  trap: [3, 3],
  stairs: [4, 3],
};
const evolutionArtCells = {
  lumina: [0, 0],
  seraph: [1, 0],
  agni: [2, 0],
  vajra: [3, 0],
  nox: [0, 1],
  abyss: [1, 1],
  sage: [2, 1],
  astera: [3, 1],
};

const gearSlots = {
  weapon: { name: "武器", color: "#ef9a5b" },
  armor: { name: "防具", color: "#70b8cf" },
  charm: { name: "お守り", color: "#d6b564" },
};

const gearBases = [
  { key: "sword", slot: "weapon", name: "星鉄の剣", atk: 3, def: 0, hp: 0 },
  { key: "wand", slot: "weapon", name: "風紋の杖", atk: 2, def: 0, hp: 4 },
  { key: "claw", slot: "weapon", name: "月牙の爪", atk: 4, def: -1, hp: 0 },
  { key: "cloak", slot: "armor", name: "月絹のマント", atk: 0, def: 2, hp: 3 },
  { key: "plate", slot: "armor", name: "星殻の鎧", atk: 0, def: 3, hp: 0 },
  { key: "vest", slot: "armor", name: "森守の服", atk: 0, def: 1, hp: 8 },
  { key: "bell", slot: "charm", name: "きずなの鈴", atk: 1, def: 1, hp: 4 },
  { key: "feather", slot: "charm", name: "天風の羽根", atk: 2, def: 0, hp: 3 },
  { key: "gem", slot: "charm", name: "星命石", atk: 0, def: 1, hp: 10 },
];

const gearQualities = [
  { name: "コモン", prefix: "使い込まれた", stars: 1, color: "#a9a39a", scale: 0, weight: 28 },
  { name: "アンコモン", prefix: "磨かれた", stars: 2, color: "#77c8d0", scale: 1, weight: 34 },
  { name: "レア", prefix: "輝く", stars: 3, color: "#e9bd58", scale: 2, weight: 24 },
  { name: "エピック", prefix: "伝承の", stars: 4, color: "#c68bed", scale: 3, weight: 10 },
  { name: "レジェンド", prefix: "星王の", stars: 5, color: "#ff8b71", scale: 4, weight: 4 },
];

const relicCatalog = [
  { key: "ironFang", name: "鉄星の牙", icon: "牙", rarity: "COMMON", color: "#d98d62", detail: "物理攻撃 +2。", bonus: { atk: 2 } },
  { key: "moonLens", name: "月読のレンズ", icon: "月", rarity: "COMMON", color: "#7fdde6", detail: "魔力 +2。", bonus: { magic: 2 } },
  { key: "shellSeed", name: "星殻の種", icon: "殻", rarity: "COMMON", color: "#7eb6c7", detail: "防御と魔防 +1。", bonus: { def: 1, res: 1 } },
  { key: "heartMeteor", name: "心星の隕石", icon: "心", rarity: "COMMON", color: "#ef8c91", detail: "最大HP +12。", bonus: { hp: 12 } },
  { key: "emberStep", name: "歩星の灯", icon: "歩", rarity: "UNCOMMON", color: "#f0b85d", detail: "歩行回復が1増える。", effect: "stepHeal" },
  { key: "echoBell", name: "残響の鈴", icon: "響", rarity: "UNCOMMON", color: "#9f8ce0", detail: "敵撃破時、選択中の技PPを1回復。", effect: "ppOnKill" },
  { key: "bossClaw", name: "門番の爪", icon: "門", rarity: "UNCOMMON", color: "#ed7768", detail: "ボスへの与ダメージ +25%。", effect: "bossDamage" },
  { key: "trapEye", name: "罠見の瞳", icon: "眼", rarity: "UNCOMMON", color: "#74d4b4", detail: "2マス以内の隠し罠が見える。", effect: "trapSense" },
  { key: "glassCannon", name: "硝子の彗星", icon: "砲", rarity: "RARE", color: "#ff7d8f", detail: "攻撃・魔力 +5、最大HP -10。", bonus: { atk: 5, magic: 5, hp: -10 } },
  { key: "prismCore", name: "七彩星核", icon: "彩", rarity: "RARE", color: "#d5b4ff", detail: "物理技と魔法技を交互に使うと威力上昇。", effect: "alternating" },
  { key: "secondMoon", name: "二度目の月", icon: "復", rarity: "RARE", color: "#f7da79", detail: "1回だけ、倒れた時にHP40%で復活。", effect: "secondLife" },
  { key: "mutationSeal", name: "変異封じ", icon: "封", rarity: "RARE", color: "#5ed5c7", detail: "変異種への与ダメージ +35%。", effect: "mutantDamage" },
  { key: "starCompass", name: "逆星羅針", icon: "針", rarity: "UNCOMMON", color: "#6fc6e9", detail: "通常階段をミニマップに常時表示する。", effect: "stairSense" },
  { key: "hungryCrown", name: "飢王の冠", icon: "冠", rarity: "RARE", color: "#d76fe1", detail: "満腹度30以下で攻撃・魔力 +6。", effect: "desperation" },
  { key: "luckyAsh", name: "幸運の灰", icon: "運", rarity: "UNCOMMON", color: "#d9ca66", detail: "変異種と珍しい道具の出現率が上がる。", effect: "luck" },
  { key: "arcaneVein", name: "魔脈結晶", icon: "魔", rarity: "RARE", color: "#7dbbf2", detail: "魔法技の消費PPが時々0になる。", effect: "freeMagic" },
  { key: "warDrum", name: "星戦の鼓", icon: "戦", rarity: "RARE", color: "#ef755b", detail: "物理技で敵を倒すとHPを5回復。", effect: "physicalLeech" },
  { key: "firstDawn", name: "初明かりの刃", icon: "初", rarity: "COMMON", color: "#f3b65c", detail: "各階で最初に与えるダメージ +8。", effect: "firstStrike" },
  { key: "starVessel", name: "星杯の器", icon: "杯", rarity: "COMMON", color: "#70d4df", detail: "全技の最大PP +2。", bonus: { pp: 2 } },
  { key: "oakMedal", name: "古樹のメダル", icon: "樹", rarity: "COMMON", color: "#81b760", detail: "最大HP +7、防御 +1。", bonus: { hp: 7, def: 1 } },
  { key: "mageThread", name: "魔糸のリボン", icon: "糸", rarity: "COMMON", color: "#9cccf2", detail: "魔力 +1、魔防 +1。", bonus: { magic: 1, res: 1 } },
  { key: "duelistCoin", name: "決闘者の古貨", icon: "貨", rarity: "UNCOMMON", color: "#e4b45e", detail: "HP満タン時、与ダメージ +3。", effect: "fullHpDamage" },
  { key: "thornMantle", name: "星棘のマント", icon: "棘", rarity: "UNCOMMON", color: "#95c568", detail: "隣接攻撃を受けると小さく反撃する。", effect: "thornMail" },
  { key: "campfireCoal", name: "旅火の炭", icon: "火", rarity: "UNCOMMON", color: "#ee865d", detail: "階段を降りるたびHPを8回復。", effect: "stairHeal" },
  { key: "crackedShield", name: "割れ盾の誓い", icon: "誓", rarity: "UNCOMMON", color: "#8bb5d0", detail: "HP35%以下で受けるダメージを軽減。", effect: "lowHpGuard" },
  { key: "triadCompass", name: "三相の羅針", icon: "三", rarity: "RARE", color: "#8de0bf", detail: "炎→木→水→炎の順で技を使うと威力 +45%、HPを3回復。", effect: "elementCycle" },
  { key: "karmaBrand", name: "咎星の刻印", icon: "咎", rarity: "RARE", color: "#b26ce8", detail: "カルマが高いほど闇・邪悪技の威力上昇。最大 +60%。", effect: "karmaDarkness" },
  { key: "stormKite", name: "避雷の凧", icon: "凧", rarity: "UNCOMMON", color: "#7fd4ed", detail: "敵の遠距離攻撃ダメージを30%軽減。", effect: "rangedGuard" },
  { key: "emptySatchel", name: "空袋の誓い", icon: "袋", rarity: "UNCOMMON", color: "#d9bd78", detail: "バッグ空きが10枠以上なら、技の威力 +20%。拾いすぎないほど強い。", effect: "emptyBagPower" },
  { key: "foxMask", name: "白狐の仮面", icon: "狐", rarity: "RARE", color: "#f0dca2", detail: "物理・魔力 +2、運 +1。", bonus: { atk: 2, magic: 2, luck: 1 } },
  { key: "voidLedger", name: "宵闇の帳簿", icon: "帳", rarity: "RARE", color: "#a575e2", detail: "倒すたび探索ptが少し増えるが、最大HP -6。", bonus: { hp: -6 }, effect: "scoreOnKill" },
  { key: "frostNeedle", name: "霜針の星飾り", icon: "霜", rarity: "RARE", color: "#8bdff2", detail: "水属性の技ダメージ +4。凍結系の技にも有効。", effect: "waterDamage" },
  { key: "venomLamp", name: "毒灯の小瓶", icon: "毒", rarity: "RARE", color: "#a6c943", detail: "木属性の技ダメージ +4。毒系の技にも有効。", effect: "woodDamage" },
  { key: "lineSigil", name: "一直線の星印", icon: "線", rarity: "UNCOMMON", color: "#7fcfe8", detail: "直線・貫通技の威力 +18%。", effect: "linePower" },
  { key: "burstBloom", name: "円花の結晶", icon: "円", rarity: "UNCOMMON", color: "#91d57d", detail: "周囲技の威力 +18%。周囲技を使うとHPを2回復。", effect: "burstPower" },
  { key: "openingCharm", name: "開幕の護符", icon: "開", rarity: "COMMON", color: "#f3c66a", detail: "各階の最初の18ターン、技威力 +20%。", effect: "openingPower" },
  { key: "scarletPearl", name: "緋連の真珠", icon: "連", rarity: "RARE", color: "#ed7185", detail: "敵を3体倒すたび、選択中の技PPを2回復。", effect: "killChainPp" },
  { key: "quietHourglass", name: "静刻の砂時計", icon: "刻", rarity: "RARE", color: "#b9a4ef", detail: "同じ階の150ターン目まで、受けるダメージを少し軽減。", effect: "earlyGuard" },
  { key: "thiefRibbon", name: "盗星のリボン", icon: "盗", rarity: "RARE", color: "#d9b06f", detail: "泥棒後、次の門番まで技威力 +25%。", effect: "theftPower" },
  { key: "zeroFragment", name: "零星の欠片", icon: "零", rarity: "BOSS", color: "#ffdd83", detail: "全能力 +2。最深部へ近づくほどさらに輝く。", bonus: { atk: 2, magic: 2, def: 2, res: 2 } },
  { key: "design-C001", designId: "C001", name: "赤熱の小石", icon: "炎", rarity: "COMMON", color: "#ef684f", detail: "炎属性技の威力 +8%。", elementPower: { element: "fire", value: 0.08 } },
  { key: "design-C002", designId: "C002", name: "潮騒の貝片", icon: "水", rarity: "COMMON", color: "#52aee8", detail: "水属性技の威力 +8%。", elementPower: { element: "water", value: 0.08 } },
  { key: "design-C003", designId: "C003", name: "若葉の護り木", icon: "木", rarity: "COMMON", color: "#75ad58", detail: "木属性技の威力 +8%。", elementPower: { element: "wood", value: 0.08 } },
  { key: "design-C004", designId: "C004", name: "白星の欠片", icon: "光", rarity: "COMMON", color: "#e8c958", detail: "光属性技の威力 +8%。", elementPower: { element: "light", value: 0.08 } },
  { key: "design-C005", designId: "C005", name: "黒月の破片", icon: "闇", rarity: "COMMON", color: "#9568d8", detail: "闇属性技の威力 +8%。", elementPower: { element: "dark", value: 0.08 } },
  { key: "design-C011", designId: "C011", name: "火避けの布", icon: "炎", rarity: "COMMON", color: "#ef684f", detail: "炎属性から受けるダメージ -8%。", elementGuard: { element: "fire", value: 0.08 } },
  { key: "design-C012", designId: "C012", name: "水避けの布", icon: "水", rarity: "COMMON", color: "#52aee8", detail: "水属性から受けるダメージ -8%。", elementGuard: { element: "water", value: 0.08 } },
  { key: "design-C013", designId: "C013", name: "木避けの布", icon: "木", rarity: "COMMON", color: "#75ad58", detail: "木属性から受けるダメージ -8%。", elementGuard: { element: "wood", value: 0.08 } },
  { key: "design-C014", designId: "C014", name: "光避けの布", icon: "光", rarity: "COMMON", color: "#e8c958", detail: "光属性から受けるダメージ -8%。", elementGuard: { element: "light", value: 0.08 } },
  { key: "design-C015", designId: "C015", name: "闇避けの布", icon: "闇", rarity: "COMMON", color: "#9568d8", detail: "闇属性から受けるダメージ -8%。", elementGuard: { element: "dark", value: 0.08 } },
];

function relicElementModifier(field, elementKey) {
  return (game?.relics || []).reduce((total, key) => {
    const relic = relicCatalog.find((entry) => entry.key === key);
    const modifier = relic?.[field];
    return modifier?.element === elementKey ? total + (Number(modifier.value) || 0) : total;
  }, 0);
}

const RELIC_ICON_SHEET_LAYOUTS = Object.freeze({
  C: { file: "common", cols: 10, rows: 5 },
  U: { file: "uncommon", cols: 8, rows: 5 },
  R: { file: "rare", cols: 6, rows: 5 },
  SR: { file: "star", cols: 5, rows: 5 },
  B: { file: "boss", cols: 5, rows: 2 },
});
const RELIC_VISUAL_IDS = Object.freeze({
  ironFang: "C016", moonLens: "U022", shellSeed: "C046", heartMeteor: "SR018",
  emberStep: "U011", echoBell: "U016", bossClaw: "U040", trapEye: "U037",
  glassCannon: "R009", prismCore: "R023", secondMoon: "R004", mutationSeal: "R030",
  starCompass: "U021", hungryCrown: "R001", luckyAsh: "U013", arcaneVein: "U004",
  warDrum: "R003", firstDawn: "C024", starVessel: "R005", oakMedal: "C003",
  mageThread: "C040", duelistCoin: "C050", thornMantle: "U019", campfireCoal: "U012",
  crackedShield: "U033", triadCompass: "SR003", karmaBrand: "R022", stormKite: "C032",
  emptySatchel: "R020", foxMask: "SR020", voidLedger: "R010", frostNeedle: "R008",
  venomLamp: "R007", lineSigil: "U022", burstBloom: "U018", openingCharm: "C030",
  scarletPearl: "R015", quietHourglass: "SR010", thiefRibbon: "C048", zeroFragment: "B010",
});

function relicIconStyle(relic) {
  const designId = relic.designId || RELIC_VISUAL_IDS[relic.key] || "C050";
  const match = /^(SR|C|U|R|B)(\d{3})$/.exec(designId);
  const layout = match ? RELIC_ICON_SHEET_LAYOUTS[match[1]] : null;
  if (!layout) return "";
  const index = clamp(Number(match[2]) - 1, 0, layout.cols * layout.rows - 1);
  const column = index % layout.cols;
  const row = Math.floor(index / layout.cols);
  const x = layout.cols > 1 ? (column / (layout.cols - 1)) * 100 : 0;
  const y = layout.rows > 1 ? (row / (layout.rows - 1)) * 100 : 0;
  return [
    `--relic-sheet:url('assets/relics/foxbound-relic-icons-v1/relic-icons-${layout.file}-v1.png?v=${FOXBOUND_ASSET_VERSION}')`,
    `--relic-size-x:${layout.cols * 100}%`,
    `--relic-size-y:${layout.rows * 100}%`,
    `--relic-x:${x}%`,
    `--relic-y:${y}%`,
  ].join(";");
}

const evolutionCatalog = [
  {
    key: "lumina",
    from: "base",
    stage: 1,
    name: "星護ルミナ",
    path: "magic",
    type: "星光",
    color: "#61d8e6",
    accent: "#f2ffff",
    scarf: "#ffd96d",
    title: "救いを選んだ守護者",
    materials: { moonShard: 4 },
    level: 20,
    requirement: (stats) => stats.magicUses >= 40 && stats.magicUses > stats.physicalUses,
    requirementText: (stats) => `魔法行動 ${stats.magicUses}/40・物理より魔法優勢`,
    bonus: { hp: 12, atk: 1, def: 3 },
  },
  {
    key: "seraph",
    from: "lumina",
    stage: 2,
    name: "星導セラフィ",
    path: "magic",
    type: "聖星",
    color: "#d8f3f2",
    accent: "#ffffff",
    scarf: "#f3c44d",
    title: "救いの軌跡を束ねた導き手",
    materials: { moonShard: 7, bossCore: 3 },
    level: 55,
    requirement: (stats) => stats.magicUses >= 160 && stats.floorsCleared >= 45,
    requirementText: (stats) => `魔法行動 ${stats.magicUses}/160・踏破階 ${stats.floorsCleared}/45`,
    bonus: { hp: 15, atk: 3, def: 4 },
  },
  {
    key: "agni",
    from: "base",
    stage: 1,
    name: "炎牙アグニ",
    path: "physical",
    type: "火晶",
    color: "#ef6658",
    accent: "#ffd29f",
    scarf: "#fff078",
    title: "戦いを重ねた猛き牙",
    materials: { emberCore: 4 },
    level: 20,
    requirement: (stats) => stats.physicalUses >= 55 && stats.physicalUses > stats.magicUses,
    requirementText: (stats) => `物理行動 ${stats.physicalUses}/55・魔法より物理優勢`,
    bonus: { hp: 5, atk: 5, def: 1 },
  },
  {
    key: "vajra",
    from: "agni",
    stage: 2,
    name: "焔王ヴァジュラ",
    path: "physical",
    type: "獄炎",
    color: "#d9413f",
    accent: "#fff0a1",
    scarf: "#f9c953",
    title: "数多の戦いを越えた焔王",
    materials: { emberCore: 7, bossCore: 3 },
    level: 55,
    requirement: (stats) => stats.physicalUses >= 200 && stats.kills >= 180,
    requirementText: (stats) => `物理行動 ${stats.physicalUses}/200・敵撃破 ${stats.kills}/180`,
    bonus: { hp: 9, atk: 7, def: 2 },
  },
  {
    key: "nox",
    from: "base",
    stage: 1,
    name: "宵影ノクス",
    path: "magic",
    type: "月影",
    color: "#9c6bd4",
    accent: "#f0dcff",
    scarf: "#55d0cc",
    title: "禁忌を力に変えた夜影",
    materials: { shadowFang: 4 },
    level: 30,
    requirement: (stats) => stats.mutants >= 8 && stats.trapsTriggered >= 5,
    requirementText: (stats) => `変異種撃破 ${stats.mutants}/8・罠作動 ${stats.trapsTriggered}/5`,
    bonus: { hp: 4, atk: 4, def: 2 },
  },
  {
    key: "abyss",
    from: "nox",
    stage: 2,
    name: "冥王アビス",
    path: "magic",
    type: "冥影",
    color: "#663b92",
    accent: "#e6c6ff",
    scarf: "#e35b78",
    title: "禁忌を喰らい尽くした冥王",
    materials: { shadowFang: 8, bossCore: 4 },
    level: 65,
    requirement: (stats) => stats.mutants >= 28 && stats.magicUses >= 150,
    requirementText: (stats) => `変異種撃破 ${stats.mutants}/28・魔法行動 ${stats.magicUses}/150`,
    bonus: { hp: 8, atk: 6, def: 3 },
  },
  {
    key: "sage",
    from: "base",
    stage: 1,
    name: "智樹セージ",
    path: "magic",
    type: "森葉",
    color: "#70ad62",
    accent: "#e7f7ae",
    scarf: "#edc85e",
    title: "一度の変化で完成する叡智の賢者",
    materials: { wisdomSeed: 6, bossCore: 2 },
    level: 45,
    requirement: (stats) => stats.itemUses >= 25 && game.unlockedSkills.length >= 8 && stats.magicUses >= 90,
    requirementText: (stats) => `道具 ${stats.itemUses}/25・スキル ${game.unlockedSkills.length}/8・魔法 ${stats.magicUses}/90`,
    bonus: { hp: 18, atk: 5, def: 4 },
  },
  {
    key: "astera",
    from: "base",
    stage: 1,
    name: "星王アステラ",
    path: "hybrid",
    type: "天星",
    color: "#e3bb54",
    accent: "#fff7c4",
    scarf: "#ef786f",
    title: "長い未進化期を越え、一度で至る星の王",
    materials: { moonShard: 4, emberCore: 4, wisdomSeed: 4, bossCore: 5 },
    level: 70,
    requirement: (stats) => stats.floorsCleared >= 70 && stats.physicalUses >= 120 && stats.magicUses >= 120,
    requirementText: (stats) => `踏破階 ${stats.floorsCleared}/70・物理 ${stats.physicalUses}/120・魔法 ${stats.magicUses}/120`,
    bonus: { hp: 20, atk: 7, def: 5 },
  },
];

const tacticCatalog = [
  {
    key: "together",
    name: "いっしょに行こう",
    short: "追従",
    detail: "隊列を守り、隣の敵だけを攻撃する。",
  },
  {
    key: "hunt",
    name: "敵を見つけて",
    short: "迎撃",
    detail: "見えている敵を積極的に追いかける。",
  },
  {
    key: "wait",
    name: "その場で待機",
    short: "待機",
    detail: "移動せず、隣に来た敵だけを攻撃する。",
  },
  {
    key: "avoid",
    name: "危険を避けて",
    short: "回避",
    detail: "敵から距離を取りながら隊についてくる。",
  },
  {
    key: "explore",
    name: "別行動で探索",
    short: "探索",
    detail: "未探索の通路や部屋を探しに向かう。",
  },
];

const skillCatalog = [
  { key: "tough", name: "生命の灯", detail: "最大HP +8", cost: 1, branch: "生存", icon: "HP", lane: "core", tier: 0 },
  { key: "ration", name: "星腹", detail: "満腹度の消費を軽減", cost: 1, branch: "生存", icon: "食", lane: "core", tier: 1, requires: ["tough"] },
  { key: "scout", name: "罠見", detail: "近くの罠と道具を察知", cost: 2, branch: "生存", icon: "眼", lane: "core", tier: 2, requires: ["ration"] },
  { key: "fortune", name: "運命偏向", detail: "変異種と珍品が少し増える", cost: 2, branch: "生存", icon: "運", lane: "core", tier: 3, requires: ["scout"] },
  { key: "starcore", name: "星核共鳴", detail: "HP +10、全能力 +1", cost: 3, branch: "生存", icon: "核", lane: "core", tier: 4, requires: ["fortune"] },
  { key: "power", name: "狩牙", detail: "物理攻撃 +2", cost: 1, branch: "物理", icon: "攻", lane: "physical", tier: 0 },
  { key: "shell", name: "破城の構え", detail: "防御 +1、物理技威力上昇", cost: 1, branch: "物理", icon: "砕", lane: "physical", tier: 1, requires: ["power"] },
  { key: "hunter", name: "急所狩り", detail: "通常攻撃が時々強撃になる", cost: 2, branch: "物理", icon: "狩", lane: "physical", tier: 2, requires: ["shell"] },
  { key: "execution", name: "断星", detail: "瀕死の敵への物理ダメージ +4", cost: 2, branch: "物理", icon: "断", lane: "physical", tier: 3, requires: ["hunter"] },
  { key: "sovereign", name: "覇星牙", detail: "物理攻撃 +5、防御 +2", cost: 4, branch: "物理", icon: "覇", lane: "physical", tier: 4, requires: ["execution"] },
  { key: "arcana", name: "魔星脈", detail: "魔力 +2", cost: 1, branch: "魔法", icon: "魔", lane: "magic", tier: 0 },
  { key: "technique", name: "星術循環", detail: "すべての技の最大PP +2", cost: 1, branch: "魔法", icon: "技", lane: "magic", tier: 1, requires: ["arcana"] },
  { key: "flow", name: "魔力奔流", detail: "魔力 +3", cost: 2, branch: "魔法", icon: "流", lane: "magic", tier: 2, requires: ["technique"] },
  { key: "spellEcho", name: "術式残響", detail: "魔法技が時々もう一度響く", cost: 2, branch: "魔法", icon: "響", lane: "magic", tier: 3, requires: ["flow"] },
  { key: "oracle", name: "星界の託宣", detail: "魔力 +5、魔防 +2", cost: 4, branch: "魔法", icon: "星", lane: "magic", tier: 4, requires: ["spellEcho"] },
];

const enemyTypes = [
  { key: "starwater", elementKey: "water", name: "水", prefix: "蒼", color: "#52aee8", accent: "#d9f3ff", hp: 2, atk: 0, def: 1 },
  { key: "firecrystal", elementKey: "fire", name: "炎", prefix: "緋", color: "#ef684f", accent: "#ffd2a6", hp: 0, atk: 2, def: 0 },
  { key: "forestleaf", elementKey: "wood", name: "木", prefix: "翠", color: "#75ad58", accent: "#e2f5ad", hp: 4, atk: 0, def: 0 },
  { key: "moonshade", elementKey: "dark", name: "闇", prefix: "紫", color: "#9568d8", accent: "#eadfff", hp: 0, atk: 1, def: 1 },
  { key: "skywind", elementKey: "light", name: "光", prefix: "輝", color: "#e8c958", accent: "#fff6bd", hp: -1, atk: 2, def: 0 },
];

const enemyTypeBiases = [
  { starwater: 6, forestleaf: 5, skywind: 2, firecrystal: 1, moonshade: 1 },
  { firecrystal: 6, forestleaf: 5, starwater: 2, skywind: 1, moonshade: 1 },
  { starwater: 6, skywind: 4, moonshade: 2, firecrystal: 1, forestleaf: 1 },
  { moonshade: 6, starwater: 3, skywind: 2, forestleaf: 1, firecrystal: 1 },
  { skywind: 6, firecrystal: 4, forestleaf: 2, starwater: 1, moonshade: 1 },
  { forestleaf: 6, moonshade: 4, starwater: 2, firecrystal: 1, skywind: 1 },
  { moonshade: 6, skywind: 4, firecrystal: 2, starwater: 1, forestleaf: 1 },
  { skywind: 6, starwater: 4, forestleaf: 2, moonshade: 1, firecrystal: 1 },
  { firecrystal: 6, moonshade: 5, skywind: 2, starwater: 1, forestleaf: 1 },
  { moonshade: 5, skywind: 5, firecrystal: 3, starwater: 2, forestleaf: 2 },
];

function floorEnemyTypeBias() {
  return enemyTypeBiases[clamp(Math.floor((game.floor - 1) / 10), 0, enemyTypeBiases.length - 1)];
}

function floorElementTrend() {
  const bias = floorEnemyTypeBias();
  return Object.entries(bias)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key]) => enemyTypes.find((type) => type.key === key)?.elementKey)
    .filter(Boolean);
}

function routeSegmentForFloor(floor = game.floor) {
  return clamp(Math.floor((floor - 1) / 10), 0, 9);
}

function currentRoutePlan(floor = game.floor) {
  const key = game.routePlan?.[routeSegmentForFloor(floor)];
  return routeCatalog.find((route) => route.key === key) || null;
}

function routeEffectNumber(field, floor = game.floor) {
  return Number(currentRoutePlan(floor)?.[field]) || 0;
}

function bossThemeForFloor(floor = game.floor) {
  if (floor % 10 !== 9) return null;
  return bossThemeCatalog[Math.floor(floor / 10)] || null;
}

function recordEnemySeen(key) {
  if (!key || game.seenEnemyKeys.includes(key)) return;
  game.seenEnemyKeys.push(key);
}

function recordEnemyDefeated(key) {
  if (!key) return;
  recordEnemySeen(key);
  if (!game.defeatedEnemyKeys.includes(key)) game.defeatedEnemyKeys.push(key);
}

function enemyFamilyProgress(familyKey) {
  const seen = game.seenEnemyKeys.some((key) => key === familyKey || key.startsWith(`${familyKey}-`));
  const defeated = game.defeatedEnemyKeys.some((key) => key === familyKey || key.startsWith(`${familyKey}-`));
  return { seen, defeated };
}

function elementComboBonus(previous, next) {
  if (!previous || !next || previous === next) return null;
  const combos = {
    "fire>wood": { name: "延焼", power: 0.12, color: "#f29d54" },
    "wood>water": { name: "繁茂", power: 0.12, color: "#9edb74", heal: 2 },
    "water>fire": { name: "蒸気", power: 0.1, color: "#9fe5ef" },
    "light>dark": { name: "蝕光", power: 0.15, color: "#d7b6ff" },
    "dark>light": { name: "払暁", power: 0.15, color: "#fff0a1" },
    "divine>evil": { name: "聖断", power: 0.12, color: "#fff4b8", heal: 2 },
    "evil>divine": { name: "冒涜", power: 0.18, color: "#e778b5" },
  };
  return combos[`${previous}>${next}`] || null;
}

const specialEnemyElements = {
  toxicMushroom: "wood",
  toxicToad: "wood",
  acidOoze: "wood",
  toxicSnail: "wood",
  iceSpider: "water",
  frostTurtle: "water",
  frostOwl: "water",
  crystalCrab: "water",
};

function enemyElementKey(catalog) {
  return specialEnemyElements[catalog.familyKey] || catalog.elementKey || {
    starwater: "water",
    firecrystal: "fire",
    forestleaf: "wood",
    moonshade: "dark",
    skywind: "light",
  }[catalog.typeKey] || "dark";
}

const mutationCatalog = [
  { key: "armored", prefix: "甲殻変異", name: "重殻", color: "#8fc7a1", hpScale: 1.45, atk: 0, def: 3 },
  { key: "arcane", prefix: "魔脈変異", name: "魔脈", color: "#a879e5", hpScale: 1.12, atk: 4, def: 0, magic: true },
  { key: "swift", prefix: "疾走変異", name: "疾走", color: "#69c9e8", hpScale: 0.9, atk: 3, def: 0, swift: true },
  { key: "vampiric", prefix: "吸星変異", name: "吸星", color: "#d96382", hpScale: 1.2, atk: 2, def: 1, vampiric: true },
  { key: "volatile", prefix: "爆核変異", name: "爆核", color: "#f0a953", hpScale: 1.05, atk: 3, def: 0, volatile: true },
];

const enemyFamilySeeds = [
  ["hornedSlime", "髑角スライム", "ツノプル"],
  ["purpleBat", "紫翼デーモン", "バティ"],
  ["skeleton", "骸骨剣士", "コツマル"],
  ["toxicMushroom", "毒泡キノコ", "ポイズ"],
  ["mossGolem", "苔岩ゴーレム", "イワモ"],
  ["fireSalamander", "火脈サラマンダー", "ラーヴァ"],
  ["iceSpider", "氷晶グモ", "クリス"],
  ["mimicChest", "牙箱ミミック", "ハコベ"],
  ["shadowMage", "影晶の魔導士", "ノクス"],
  ["goblinBomber", "爆弾ゴブリン", "ボムチ"],
  ["thunderWolf", "雷爪ウルフ", "ライガ"],
  ["mossTreant", "苔樹トレント", "モクド"],
  ["desertScorpion", "砂岩サソリ", "サジン"],
  ["crystalCrab", "晶殻クラブ", "シェル"],
  ["hauntedArmor", "呪鎧の亡霊", "ガイスト"],
  ["frostTurtle", "氷山タートル", "フロスト"],
  ["plagueCrow", "疫風カラス", "ペスト"],
  ["toxicToad", "毒壺ガマ錬金師", "ガマル"],
  ["lavaBoar", "溶岩ボア", "マグマ"],
  ["cursedLantern", "呪火ランタン", "トモシ"],
  ["voidEye", "虚空眼", "オルボ"],
  ["armoredBeetle", "鋼角ビートル", "カブト"],
  ["serpentPriest", "蛇神の祭司", "ナーガ"],
  ["boneDragon", "骨竜の幼体", "コツリュウ"],
  ["stitchedRogue", "継ぎ接ぎ盗賊", "ヌイ"],
  ["clockworkDrone", "歯車剣機", "ギア"],
  ["acidOoze", "酸蝕ウーズ", "アシド"],
  ["stormHarpy", "雷嵐ハーピー", "テンペ"],
  ["darkJackal", "月影ジャッカル", "アヌ"],
  ["thornVine", "茨甲の獣", "ソーン"],
  ["thunderRam", "雷帝ラム", "ボルト"],
  ["mummyJackal", "砂王のジャッカル", "サンド"],
  ["coralJelly", "海晶クラゲ", "コーラル"],
  ["clockworkImp", "爆機インプ", "メカ"],
  ["shadowCentipede", "影鎧ムカデ", "ムカゲ"],
  ["cursedPumpkin", "呪樹パンプキン", "カボ"],
  ["frostOwl", "極星フクロウ", "スノウ"],
  ["toxicSnail", "毒城スネイル", "シェルド"],
  ["obsidianGargoyle", "黒曜ガーゴイル", "オブシ"],
  ["moonSamurai", "月冥の侍霊", "ツキサム"],
];

const enemyBandStarts = [1, 21, 46, 71];
const enemyFamilies = enemyFamilySeeds.map(([key, name, friendName], index) => {
  const band = Math.floor(index / 10);
  const localIndex = index % 10;
  const minFloor = enemyBandStarts[band] + Math.max(0, localIndex - 3) * 3;
  return {
    key,
    name,
    friendName,
    artIndex: index,
    spritePackId: FOXBOUND_ENEMY_SPRITE_IDS[index],
    minFloor,
    maxFloor: band === 3 ? 100 : Math.min(100, minFloor + 38),
    hp: 12 + band * 11 + (localIndex % 5) * 3,
    atk: 4 + band * 4 + (localIndex % 4),
    def: band + (localIndex % 3 === 0 ? 1 : 0),
    exp: 14 + band * 34 + localIndex * 4,
    recruit: 0,
    sprite: 462 + (index % 8),
    tier: band + 1,
  };
});

const enemyCatalog = enemyFamilies.flatMap((family) =>
  enemyTypes.map((type) => ({
    ...family,
    key: `${family.key}-${type.key}`,
    familyKey: family.key,
    typeKey: type.key,
    elementKey: type.elementKey,
    type: type.name,
    name: `${type.prefix}${family.name}`,
    friendName: `${type.prefix}${family.friendName}`,
    hp: Math.max(8, family.hp + type.hp),
    atk: family.atk + type.atk,
    def: family.def + type.def,
    color: type.color,
    accent: type.accent,
  })),
);

const rareEnemyCatalog = [
  {
    key: "rare-stargold", name: "星金ミミック", friendName: "キンボシ", minDungeon: 1,
    hp: 32, atk: 9, def: 3, exp: 110, recruit: 0.004, sprite: 554,
    color: "#e9bd58", accent: "#fff3ae", elementKey: "light", rare: true, artIndex: 7, spritePackId: "angelic_treasure_chest",
  },
  {
    key: "rare-rainbow", name: "虹羽フェニクス", friendName: "ニジハ", minDungeon: 2,
    hp: 38, atk: 12, def: 3, exp: 155, recruit: 0.0035, sprite: 800,
    color: "#ef7b72", accent: "#9de9df", elementKey: "fire", rare: true, artIndex: 27, spritePackId: "night_moth",
  },
  {
    key: "rare-moonwhite", name: "月白ユニコーン", friendName: "ハクギン", minDungeon: 3,
    hp: 46, atk: 14, def: 5, exp: 210, recruit: 0.003, sprite: 690,
    color: "#d9d4f2", accent: "#fffbd6", elementKey: "water", rare: true, artIndex: 36,
  },
  {
    key: "rare-timehare", name: "時渡りウサギ", friendName: "トキノ", minDungeon: 4,
    hp: 42, atk: 18, def: 4, exp: 280, recruit: 0.0025, sprite: 801,
    color: "#79d4d9", accent: "#ffe58d", elementKey: "water", rare: true, artIndex: 33,
  },
  {
    key: "rare-voidling", name: "虚空竜の幼体", friendName: "クウリュウ", minDungeon: 5,
    hp: 58, atk: 21, def: 7, exp: 380, recruit: 0.002, sprite: 857,
    color: "#b978df", accent: "#ffdf8b", elementKey: "dark", rare: true, artIndex: 38,
  },
];

const missionTemplates = [
  {
    client: "星見ギルド",
    target: "迷子のルチル",
    message: "ルチルを見つけて階段まで帰ろう。",
    done: "迷子のルチルを救助した。",
  },
  {
    client: "森の郵便屋",
    target: "落とし物の星鈴",
    message: "星鈴を回収して依頼を達成しよう。",
    done: "星鈴を回収した。",
  },
  {
    client: "月灯り食堂",
    target: "眠ったコメット",
    message: "コメットを起こして安全を確保しよう。",
    done: "コメットを救助した。",
  },
];

const storyChapters = [
  { chapter: 1, title: "ささやきの森", dungeon: "ささやきの森", status: "入口" },
  { chapter: 2, title: "風哭きの塔", dungeon: "風哭きの塔", status: "中級" },
  { chapter: 3, title: "夢根の樹海", dungeon: "夢根の樹海", status: "深層" },
  { chapter: 4, title: "灰冠都市", dungeon: "灰冠都市", status: "難関" },
  { chapter: 5, title: "星喰いの最果て", dungeon: "星喰いの最果て", status: "最終" },
];

const townMissions = [
  {
    chapter: 1,
    title: "ささやきの森",
    dungeon: "ささやきの森",
    theme: "forest",
    client: "観測院長アステル",
    target: "虚ろの獣ノクス",
    description: "木漏れ日の迷路を抜け、森の星明かりを奪う獣を倒す最初の挑戦。",
    floors: 5,
    reward: 320,
    message: "森の奥で星明かりを奪う気配を追おう。",
    done: "森を覆っていた星喰いの気配を退けた。",
    boss: {
      name: "虚ろの獣ノクス",
      title: "星喰いの尖兵",
      sprite: 857,
      color: "#8f72d8",
      accent: "#f1e2ff",
      hp: 112,
      atk: 11,
      def: 3,
      exp: 180,
      special: "虚星衝",
    },
    clue: {
      target: "欠けた星の痕跡",
      message: "地面に残る紫の星屑を調べ、森の奥へ進もう。",
      done: "星を吸い取る痕跡を見つけた。",
    },
  },
  {
    chapter: 2,
    title: "風哭きの塔",
    dungeon: "風哭きの塔",
    theme: "tower",
    client: "風読みミストラ",
    target: "嵐冠ヴァルグ",
    description: "風向きが変わる石塔を登り、町へ嵐を呼ぶ塔主を討つ。",
    floors: 7,
    reward: 480,
    message: "風読みの印を集めながら、塔の頂上を目指そう。",
    done: "風哭きの塔を静め、町へ吹く嵐を止めた。",
    boss: {
      name: "嵐冠ヴァルグ",
      title: "風哭きの塔主",
      sprite: 800,
      color: "#58b8e8",
      accent: "#e5fbff",
      hp: 168,
      atk: 15,
      def: 5,
      exp: 280,
      special: "天嵐陣",
    },
    clue: {
      target: "風読みの印",
      message: "塔に残された風読みの印を探し、上階への封印を解こう。",
      done: "風読みの印が次の階への道を示した。",
    },
  },
  {
    chapter: 3,
    title: "夢根の樹海",
    dungeon: "夢根の樹海",
    theme: "dream",
    client: "薬師ネムリ",
    target: "夢樹母モルフェ",
    description: "眠りを誘う巨大樹の根を進み、夢に囚われた森を目覚めさせる。",
    floors: 10,
    reward: 700,
    message: "夢胞子に惑わされず、樹海の核を目指そう。",
    done: "夢根の樹海に朝の光が戻った。",
    boss: {
      name: "夢樹母モルフェ",
      title: "眠りを編む大樹",
      sprite: 690,
      color: "#78b86d",
      accent: "#e8f6b8",
      hp: 238,
      atk: 18,
      def: 6,
      exp: 380,
      special: "夢花粉",
    },
    clue: {
      target: "目覚めの芽",
      message: "光る芽を調べ、樹海を覆う夢の根をほどこう。",
      done: "目覚めの芽が深層への道を開いた。",
    },
  },
  {
    chapter: 4,
    title: "灰冠都市",
    dungeon: "灰冠都市",
    theme: "ruins",
    client: "鍛冶師グレン",
    target: "灰王ガルド",
    description: "崩れた王都の機関を再起動し、灰の玉座に座す王を打ち破る。",
    floors: 15,
    reward: 920,
    message: "残された炉心を探し、閉ざされた城門を開こう。",
    done: "灰冠都市の炉に火が戻った。",
    boss: {
      name: "灰王ガルド",
      title: "滅びた都の王",
      sprite: 856,
      color: "#d06a57",
      accent: "#ffd29c",
      hp: 340,
      atk: 22,
      def: 8,
      exp: 520,
      special: "灰燼波",
    },
    clue: {
      target: "古炉の火種",
      message: "灰に埋もれた火種を集め、城への道を灯そう。",
      done: "古炉の火が城門を照らした。",
    },
  },
  {
    chapter: 5,
    title: "星喰いの最果て",
    dungeon: "星喰いの最果て",
    theme: "void",
    client: "星見ギルド",
    target: "星喰皇ゼロム",
    description: "五つ目の最終迷宮。消えゆく星の中心で、すべての異変の主を倒す。",
    floors: 20,
    reward: 1300,
    message: "崩れる星路を越え、最果ての玉座へ進もう。",
    done: "星喰いの夜は終わり、空に星が戻った。",
    boss: {
      name: "星喰皇ゼロム",
      title: "最果てに座す皇",
      sprite: 857,
      color: "#b06ce0",
      accent: "#fff0ff",
      hp: 480,
      atk: 27,
      def: 10,
      exp: 760,
      special: "終星落とし",
    },
    clue: {
      target: "砕けた星核",
      message: "星核の欠片をつなぎ、虚空に道を作ろう。",
      done: "星核が最果てへの道を結んだ。",
    },
  },
];

const towerContract = {
  chapter: 1,
  title: "星喰いの塔",
  dungeon: "星喰いの塔",
  theme: "forest",
  client: "星見ギルド",
  target: "百階の星喰皇",
  description: "10の門番と休憩所を越え、100階の星核へ到達する一本勝負。",
  floors: 100,
  reward: 5000,
};

const towerBossCatalog = [
  { name: "樹牢の番獣グランモス", title: "九階の門番", sprite: 690, spritePackId: "granmos", color: "#76a85d", accent: "#e6f4ad", hp: 92, atk: 10, def: 3, exp: 140, special: "樹牢圧壊" },
  { name: "氷潮姫ネレイア", title: "十九階の門番", sprite: 744, spritePackId: "nereiya", color: "#69bfe4", accent: "#e8fbff", hp: 142, atk: 15, def: 4, exp: 230, special: "逆潮氷界" },
  { name: "盲星狩りヴァルグ", title: "二十九階の門番", sprite: 800, spritePackId: "varg", color: "#9568d8", accent: "#eadfff", hp: 205, atk: 20, def: 6, exp: 340, special: "盲星狩り" },
  { name: "炉心王イグニバル", title: "三十九階の門番", sprite: 856, spritePackId: "ignibal", color: "#e56651", accent: "#ffd09b", hp: 270, atk: 25, def: 7, exp: 470, special: "炉心暴走" },
  { name: "双面司祭ルクス＝ノクス", title: "四十九階の門番", sprite: 857, spritePackId: "lux_nox", color: "#e8c958", accent: "#fff6bd", hp: 355, atk: 31, def: 9, exp: 620, special: "双面審判" },
  { name: "千節皇ザルガ", title: "五十九階の門番", sprite: 857, spritePackId: "zarga", color: "#9568d8", accent: "#eadfff", hp: 450, atk: 37, def: 11, exp: 800, special: "千節封陣" },
  { name: "亡国王アルデオン", title: "六十九階の門番", sprite: 556, spritePackId: "aldeon", color: "#9568d8", accent: "#eadfff", hp: 565, atk: 44, def: 13, exp: 1010, special: "王城断罪" },
  { name: "鏡海魔女セレネ", title: "七十九階の門番", sprite: 801, spritePackId: "selene", color: "#52aee8", accent: "#d9f3ff", hp: 700, atk: 51, def: 15, exp: 1280, special: "鏡海反照" },
  { name: "聖神獣アストライオス", title: "八十九階の門番", sprite: 602, spritePackId: "astraios", color: "#f4e7a2", accent: "#fffdf0", hp: 870, atk: 59, def: 18, exp: 1600, special: "第五光輪" },
  { name: "星喰らいヴォイド", title: "九十九階の最後の門番", sprite: 857, spritePackId: "void_eater", color: "#d8589b", accent: "#ffd5ef", hp: 1120, atk: 68, def: 21, exp: 2400, special: "終星捕食" },
];

const bossThemeCatalog = [
  { elementKey: "wood", plan: "召喚型", warning: "蔦で退路を狭め、取り巻きを呼ぶ。範囲技か早期決着が有効。", gimmick: "summon", reward: "wisdomSeed" },
  { elementKey: "water", plan: "逆潮型", warning: "押し流しと氷壁で位置を崩す。壁際に追い込まれないこと。", gimmick: "shield", reward: "moonShard" },
  { elementKey: "dark", plan: "狩猟型", warning: "一直線の射線から獲物を狙う。斜め移動で照準を外そう。", gimmick: "cannon", reward: "shadowFang" },
  { elementKey: "fire", plan: "暴走型", warning: "HPが減るほど炉心火力が上がる。守りを固めて短期決戦。", gimmick: "rage", reward: "emberCore" },
  { elementKey: "light", plan: "双面型", warning: "特殊技のたび光と闇の性質を切り替える。技属性を見て攻める。", gimmick: "mirror", reward: "moonShard" },
  { elementKey: "dark", plan: "増殖型", warning: "千の節から変異種を呼ぶ。囲まれる前に数を減らそう。", gimmick: "mutate", reward: "bossCore" },
  { elementKey: "dark", plan: "吸収型", warning: "与えた痛みを力に変える。大技の連打より回復管理が重要。", gimmick: "drain", reward: "shadowFang" },
  { elementKey: "water", plan: "反照型", warning: "同じ属性の攻撃を鏡海で受け流す。技属性を切り替えよう。", gimmick: "crystal", reward: "moonShard" },
  { elementKey: "divine", plan: "聖域型", warning: "他属性から受けるダメージを2割減らす。弱点だけに頼らず手数を整えよう。", gimmick: "storm", reward: "bossCore" },
  { elementKey: "evil", plan: "捕食型", warning: "すべての与ダメージが2割高い。召喚・吸収・遠距離を混ぜる総力戦。", gimmick: "final", reward: "bossCore" },
];

const routeCatalog = [
  { key: "safeTrail", name: "静かな星路", icon: "安", color: "#8fd7c1", detail: "敵が少ない。報酬も少し控えめ。", enemyBonus: -2, itemBonus: -1, luck: 1 },
  { key: "treasureTrail", name: "宝鳴りの星路", icon: "宝", color: "#f0c862", detail: "道具と商店が増える。敵も少し増える。", enemyBonus: 1, itemBonus: 2, shopBonus: 0.28, luck: 1 },
  { key: "eliteTrail", name: "門番の近道", icon: "強", color: "#ef8b70", detail: "敵が強く多いが、経験値とボス報酬が良くなる。", enemyBonus: 2, expBonus: 0.18, bossReward: 1 },
  { key: "hiddenTrail", name: "星裏の抜け道", icon: "隠", color: "#b783e6", detail: "隠し祭壇と選択イベントが出やすい。運要素が強い。", secretBonus: 0.18, choiceBonus: 0.18, luck: 2 },
  { key: "mutantTrail", name: "変異の深道", icon: "変", color: "#9bd05d", detail: "変異種が出やすい。素材と経験値を狙える危険ルート。", mutationBonus: 0.025, expBonus: 0.1, enemyBonus: 1 },
  { key: "karmaTrail", name: "咎星の裏路", icon: "咎", color: "#a575e2", detail: "カルマ系の選択が増える。闇進化や咎星ビルド向け。", karmaBonus: 1, choiceBonus: 0.12, luck: -1 },
];

const dungeonThemes = {
  forest: {
    unknown: "#07100b", wall: "#365449", wallDark: "#1c302b", wallLight: "#527765",
    floor: "#8b724f", floorDim: "#594b39", moss: "#477957", mossDim: "#385744", crack: "#713b37", crackDim: "#4d3231",
  },
  tower: {
    unknown: "#080d12", wall: "#465766", wallDark: "#26333d", wallLight: "#718493",
    floor: "#747680", floorDim: "#50525b", moss: "#4c7470", mossDim: "#385754", crack: "#76484a", crackDim: "#503536",
  },
  dream: {
    unknown: "#0c0912", wall: "#4e4965", wallDark: "#292638", wallLight: "#746e8a",
    floor: "#765f78", floorDim: "#514553", moss: "#557a5f", mossDim: "#3e5947", crack: "#743f60", crackDim: "#4f3045",
  },
  ruins: {
    unknown: "#100a08", wall: "#63534c", wallDark: "#382d29", wallLight: "#89736a",
    floor: "#80634e", floorDim: "#574538", moss: "#627052", mossDim: "#454f3e", crack: "#823f35", crackDim: "#572e2a",
  },
  void: {
    unknown: "#050408", wall: "#393049", wallDark: "#1c1727", wallLight: "#655478",
    floor: "#54455f", floorDim: "#392f42", moss: "#3f6865", mossDim: "#2e4b4a", crack: "#773657", crackDim: "#50273e",
  },
};

const restSanctuaryThemes = [
  { name: "苔灯の間", subtitle: "若葉の灯が息づく中継室", base: "forest", accent: "#b8df79", glow: "#f4e589", motif: "leaf", floor: "#60745b", floorDim: "#465443", wall: "#3d5848", wallDark: "#24372e", wallLight: "#789070" },
  { name: "水晶の間", subtitle: "青い晶柱が静かに鳴る中継室", base: "tower", accent: "#79dcf0", glow: "#e1fbff", motif: "crystal", floor: "#536f7b", floorDim: "#3d515a", wall: "#405b6b", wallDark: "#263844", wallLight: "#7e9cab" },
  { name: "残火の間", subtitle: "消えない火種を守る中継室", base: "ruins", accent: "#ff9362", glow: "#ffe1a3", motif: "ember", floor: "#79584c", floorDim: "#574039", wall: "#66483f", wallDark: "#3b2b28", wallLight: "#a1715d" },
  { name: "月鏡の間", subtitle: "銀の床が月影を返す中継室", base: "dream", accent: "#b9c8ff", glow: "#f1efff", motif: "moon", floor: "#64647d", floorDim: "#48495c", wall: "#4e536b", wallDark: "#2d3042", wallLight: "#858ba7" },
  { name: "花風の間", subtitle: "星花の香りが巡る中継室", base: "forest", accent: "#ef91b3", glow: "#fff0b5", motif: "bloom", floor: "#68775d", floorDim: "#4b5745", wall: "#4d624d", wallDark: "#2d3b31", wallLight: "#83977a" },
  { name: "機環の間", subtitle: "古い歯車が時を刻む中継室", base: "tower", accent: "#e4b969", glow: "#fff0b8", motif: "gear", floor: "#6e6963", floorDim: "#4f4b48", wall: "#5d5854", wallDark: "#353230", wallLight: "#938982" },
  { name: "雷雲の間", subtitle: "天井の彼方で雷が眠る中継室", base: "tower", accent: "#f3df67", glow: "#d9f6ff", motif: "storm", floor: "#536473", floorDim: "#3c4a56", wall: "#414e62", wallDark: "#27303e", wallLight: "#71839c" },
  { name: "深森の間", subtitle: "古木の根が塔を抱く中継室", base: "forest", accent: "#58d39a", glow: "#d9ffd7", motif: "root", floor: "#496656", floorDim: "#354a40", wall: "#3b5548", wallDark: "#23352d", wallLight: "#6f8978" },
  { name: "虚月の間", subtitle: "影と星明かりが交差する中継室", base: "void", accent: "#bb80ee", glow: "#f2dcff", motif: "void", floor: "#554b68", floorDim: "#3d374c", wall: "#443954", wallDark: "#282131", wallLight: "#746487" },
  { name: "星核の間", subtitle: "百階の鼓動が満ちる最後の中継室", base: "void", accent: "#f0c65c", glow: "#fff7cf", motif: "star", floor: "#60546a", floorDim: "#453d4d", wall: "#50435d", wallDark: "#2d2636", wallLight: "#87739a" },
];

const ranks = [
  { name: "見習い", points: 0 },
  { name: "ブロンズ", points: 120 },
  { name: "シルバー", points: 320 },
  { name: "ゴールド", points: 620 },
  { name: "プラチナ", points: 1050 },
];

const dirs = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
];

const controlActionCatalog = [
  { key: "moveUp", label: "上へ移動", defaultKey: "w", action: { type: "move", dx: 0, dy: -1 } },
  { key: "moveDown", label: "下へ移動", defaultKey: "s", action: { type: "move", dx: 0, dy: 1 } },
  { key: "moveLeft", label: "左へ移動", defaultKey: "a", action: { type: "move", dx: -1, dy: 0 } },
  { key: "moveRight", label: "右へ移動", defaultKey: "d", action: { type: "move", dx: 1, dy: 0 } },
  { key: "moveUpLeft", label: "左上へ移動", defaultKey: "y", action: { type: "move", dx: -1, dy: -1 } },
  { key: "moveUpRight", label: "右上へ移動", defaultKey: "u", action: { type: "move", dx: 1, dy: -1 } },
  { key: "moveDownLeft", label: "左下へ移動", defaultKey: "b", action: { type: "move", dx: -1, dy: 1 } },
  { key: "moveDownRight", label: "右下へ移動", defaultKey: "n", action: { type: "move", dx: 1, dy: 1 } },
  { key: "wait", label: "待機", defaultKey: " ", action: { type: "wait" } },
  { key: "basicAttack", label: "通常攻撃", defaultKey: "f", action: { type: "basicAttack" } },
  { key: "useMove", label: "選択中の技", defaultKey: "j", action: { type: "useMove" } },
  { key: "openMoves", label: "技一覧", defaultKey: "q", action: { type: "openMoves" } },
  { key: "openMenu", label: "冒険メニュー", defaultKey: "x", action: { type: "openMenu" } },
  { key: "ground", label: "足元メニュー", defaultKey: "g", action: { type: "ground" } },
  { key: "eatApple", label: "食料を食べる", defaultKey: "r", action: { type: "eatApple" } },
  { key: "cycleMove", label: "技切替", defaultKey: "e", action: { type: "cycleMove" } },
];

function defaultControlBindings() {
  return Object.fromEntries(controlActionCatalog.map((entry) => [entry.key, entry.defaultKey]));
}

function readControlBindings() {
  const defaults = defaultControlBindings();
  try {
    const saved = JSON.parse(localStorage.getItem(CONTROL_STORAGE_KEY) || "{}");
    if (!saved || typeof saved !== "object") return defaults;
    const next = { ...defaults };
    for (const entry of controlActionCatalog) {
      if (typeof saved[entry.key] === "string") next[entry.key] = saved[entry.key];
    }
    return next;
  } catch {
    return defaults;
  }
}

function saveControlBindings() {
  try {
    localStorage.setItem(CONTROL_STORAGE_KEY, JSON.stringify(controlBindings));
  } catch {
    // Key customization is optional; the game still works with defaults.
  }
}

function normalizeControlKeyFromEvent(event) {
  if (event.key === " ") return " ";
  return String(event.key || "").toLowerCase();
}

function controlKeyLabel(key) {
  const labels = {
    " ": "Space",
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
    escape: "Esc",
  };
  if (!key) return "未設定";
  if (labels[key]) return labels[key];
  if (key.length === 1) return key.toUpperCase();
  return key.replace(/^arrow/, "").replace(/^page/, "Page ");
}

function controlActionKeyForEvent(event) {
  const key = normalizeControlKeyFromEvent(event);
  return controlActionCatalog.find((entry) => controlBindings[entry.key] === key)?.key || null;
}

function actionFromControlActionKey(actionKey) {
  const entry = controlActionCatalog.find((candidate) => candidate.key === actionKey);
  return entry ? { ...entry.action } : null;
}

function setControlBinding(actionKey, key) {
  for (const entry of controlActionCatalog) {
    if (entry.key !== actionKey && controlBindings[entry.key] === key) {
      controlBindings[entry.key] = "";
    }
  }
  controlBindings[actionKey] = key;
  saveControlBindings();
}

let bestScore = readBestScore();
let game;
let audioContext = null;
let soundEnabled = readSoundSetting();
let controlBindings = readControlBindings();
let pendingControlAction = null;
let touchMovePointer = null;
let touchMoveDirection = null;
let touchMoveTimer = null;
let touchDashHeld = false;
let renderCamera = {
  x: 0,
  y: 0,
  width: canvas.width / (TILE * DUNGEON_ZOOM),
  height: canvas.height / (TILE * DUNGEON_ZOOM),
};

function createStarterBag() {
  return {
    apple: 1,
    bigApple: 0,
    oran: 1,
    elixir: 0,
    reviver: 1,
    blastSeed: 0,
    sleepSeed: 0,
    slumberOrb: 0,
    warpOrb: 0,
    guidingOrb: 0,
    guardBerry: 0,
    powerBerry: 0,
    fortuneOrb: 0,
    focusMint: 0,
    mindBerry: 0,
    wardBerry: 0,
    ironNut: 0,
    pierceSeed: 0,
    stormOrb: 0,
    mapScroll: 0,
  };
}

function createGame() {
  const roster = Object.fromEntries(
    characterCatalog.map((character) => [character.key, createLeader(character.key)]),
  );
  game = {
    mode: "town",
    townPlayer: { x: 576, y: 470, dx: 0, dy: 1, movingUntil: 0 },
    floor: 1,
    turn: 1,
    score: 0,
    rescuePoints: 0,
    coins: 160,
    saveSlot: 1,
    completedDungeon: 0,
    highestFloor: 1,
    persistentEvolutionKey: "base",
    persistentEvolutionStage: 0,
    towerCheckpoint: null,
    storage: { apple: 0 },
    selectedTownMission: 0,
    activeTownMission: null,
    targetFloor: TARGET_FLOOR,
    townView: "board",
    menuView: "moves",
    belly: 100,
    bag: createStarterBag(),
    evolutionBag: Object.fromEntries(evolutionMaterialKeys.map((key) => [key, 0])),
    bagCapacity: BASE_BAG_CAPACITY,
    karma: 0,
    runStats: createRunStats(),
    selectedMove: 0,
    focusTurns: 0,
    skillPoints: 1,
    statPoints: 0,
    relicFloorState: {},
    unlockedSkills: [],
    relics: [],
    startingRelicKey: null,
    unlockedAscensions: [],
    persistentLineages: {},
    secondMoonUsed: false,
    lastActionStyle: null,
    lastMoveElement: null,
    currentActionMultiplier: 1,
    currentActionElement: null,
    pendingRelicChoices: [],
    pendingMoveChoices: [],
    pendingMovePicks: 0,
    pendingAscensionChoices: [],
    pendingRouteChoices: [],
    pendingFloorChoice: null,
    milestoneSource: null,
    rewardPending: false,
    routePlan: {},
    codexView: "evolutions",
    seenEnemyKeys: [],
    defeatedEnemyKeys: [],
    lastDamageSource: null,
    lastRunSummary: null,
    gearBag: [],
    equipment: { weapon: null, armor: null, charm: null },
    gearViewSlot: "weapon",
    shopView: "goods",
    forgeSelection: [],
    selectedCharacter: "kohaku",
    loadoutStep: "character",
    roster,
    map: [],
    rooms: [],
    seen: [],
    visible: [],
    mapped: [],
    team: [roster.kohaku],
    enemies: [],
    items: [],
    merchant: null,
    merchantView: "buy",
    casino: null,
    secretStairs: null,
    monsterHouse: null,
    restFacilities: [],
    restNodes: [],
    restTheme: null,
    traps: [],
    stairsRevealed: false,
    restChoiceTaken: false,
    floorKind: "combat",
    mission: null,
    stairs: { x: 0, y: 0 },
    effects: [],
    floating: [],
    logs: [],
    leaderTrail: [],
    nextMoveAt: 0,
    aimDirection: null,
    aimTile: null,
    screenFlash: null,
    screenShake: null,
    guidanceActive: false,
    windWarningShown: false,
    windDangerShown: false,
    pendingLevelUps: [],
    levelDialogScheduled: false,
    floorEvent: { key: "calm", name: "平穏", detail: "特別な兆しはない", luck: 0 },
    luck: 0,
    gameOver: false,
    victory: false,
  };

  updateAll();
}

function startFreshGame(slot = 1) {
  try {
    localStorage.removeItem(saveSlotKey(slot));
  } catch {
    // Local storage can fail in private contexts; the in-memory reset still works.
  }
  createGame();
  game.saveSlot = slot;
  game.persistentEvolutionKey = "base";
  game.persistentEvolutionStage = 0;
  game.persistentLineages = {};
  game.unlockedAscensions = [];
  game.towerCheckpoint = null;
  game.startingRelicKey = null;
  game.selectedCharacter = "kohaku";
  prepareNewTry();
  saveCurrentGame(true);
  updateAll();
}

function openExpeditionLoadout() {
  game.townView = "loadout";
  game.loadoutStep = game.towerCheckpoint ? "checkpoint" : "character";
  ui.townDialog.dataset.view = "loadout";
  renderExpeditionLoadout();
  if (!ui.townDialog.open) ui.townDialog.showModal();
}

function queueLoadoutPrompt(delay = 120) {
  window.setTimeout(() => {
    if (!game || game.mode !== "town") return;
    if (ui.townDialog.open || ui.helpDialog.open || ui.saveDialog.open || ui.gameMenuDialog.open) return;
    openExpeditionLoadout();
  }, delay);
}

function renderExpeditionLoadout() {
  const starterKeys = ["ironFang", "moonLens", "shellSeed", "heartMeteor"];
  const profile = characterCatalog.find((entry) => entry.key === game.selectedCharacter) || characterCatalog[0];
  const selectedActor = createLeader(profile.key);
  applyPersistentLineage(selectedActor);
  const checkpoint = game.towerCheckpoint;
  const inheritedProgress = game.persistentEvolutionKey !== "base"
    || Object.keys(game.persistentLineages || {}).length > 0
    || game.unlockedAscensions.length > 0;

  if (checkpoint) {
    ui.townDialogTitle.textContent = "遠征を再開";
    ui.townDialogBody.innerHTML = `
      <section class="loadout-checkpoint" style="--hero-color:${profile.color}">
        <canvas class="loadout-checkpoint-portrait" width="220" height="220" aria-hidden="true"></canvas>
        <div>
          <span>B${checkpoint.floor}F CHECKPOINT</span>
          <strong>${selectedActor.name}の遠征記録</strong>
          <small>探索者・進化・星遺物・所持品は、休憩所で記録した状態から再開します。</small>
          <b>${elementInfo(selectedActor.elementKey).name}属性　Lv.${checkpoint.leader?.level || selectedActor.level}　進化 ${checkpoint.leader?.evolutionStage || selectedActor.evolutionStage}/10</b>
          <button type="button" class="primary-button loadout-depart">B${checkpoint.floor}Fから塔へ戻る</button>
        </div>
      </section>
    `;
    drawPortrait(ui.townDialogBody.querySelector(".loadout-checkpoint-portrait"), selectedActor);
    ui.townDialogBody.querySelector(".loadout-depart").addEventListener("click", startExpedition);
    return;
  }

  const characterStep = game.loadoutStep !== "relic";
  ui.townDialogTitle.textContent = characterStep ? "探索者を選ぶ" : "初期星遺物を選ぶ";
  if (characterStep) {
    ui.townDialogBody.innerHTML = `
      <div class="loadout-stage-head">
        <div class="loadout-step-track" aria-label="遠征準備">
          <b class="active">1</b><span>探索者</span><i></i><b>2</b><span>星遺物</span>
        </div>
        <strong>この挑戦の主人公を選ぶ</strong>
        <small>三人は初期能力・技・進化分岐が異なります。グラフで得意分野を比べられます。</small>
      </div>
      <div class="loadout-character-grid loadout-character-stage"></div>
      <div class="loadout-actions">
        ${inheritedProgress ? '<button type="button" class="secondary-button loadout-new-game">ニューゲーム</button>' : ""}
        <button type="button" class="primary-button loadout-next">星遺物選択へ</button>
      </div>
    `;
    const characterGrid = ui.townDialogBody.querySelector(".loadout-character-grid");
    characterCatalog.forEach((entry, index) => {
      const selected = entry.key === game.selectedCharacter;
      const actor = createLeader(entry.key);
      applyPersistentLineage(actor);
      const passive = characterPassiveInfo(entry.key);
      const card = document.createElement("button");
      card.type = "button";
      card.className = `loadout-character ${selected ? "selected" : ""}`;
      card.style.setProperty("--hero-color", entry.color);
      card.style.setProperty("--hero-index", index);
      card.innerHTML = `
        <span class="loadout-character-number">0${index + 1}</span>
        <div class="loadout-character-visual">
          <canvas class="loadout-portrait" width="220" height="220" aria-hidden="true"></canvas>
          <div class="loadout-character-title">
            <span>${elementBadgeMarkup(actor.elementKey)}${elementInfo(actor.elementKey).name}属性 / ${entry.type}</span>
            <strong>${entry.name}</strong>
            <small>${entry.style}</small>
          </div>
          <canvas class="loadout-stat-radar" width="230" height="172" aria-label="${entry.name}の能力グラフ"></canvas>
        </div>
        <div class="loadout-character-footer">
          <b>初期技　${actor.moves[0].name}</b>
          <em>${actor.evolutionStage ? `継承進化 ${actor.evolutionStage}/10` : "進化 0/10"}</em>
        </div>
        <p class="loadout-passive"><b>${passive.icon}</b><span><strong>${passive.name}</strong><small>${passive.detail}</small></span></p>
        <i>${selected ? "選択中" : "選ぶ"}</i>
      `;
      card.addEventListener("click", () => {
        game.selectedCharacter = entry.key;
        game.roster[entry.key] = createLeader(entry.key);
        saveCurrentGame(true);
        renderExpeditionLoadout();
        updateAll();
      });
      characterGrid.appendChild(card);
      drawPortrait(card.querySelector(".loadout-portrait"), actor);
      drawStatRadar(card.querySelector(".loadout-stat-radar"), actor);
    });
    ui.townDialogBody.querySelector(".loadout-next").addEventListener("click", () => {
      game.loadoutStep = "relic";
      renderExpeditionLoadout();
    });
    const newGameButton = ui.townDialogBody.querySelector(".loadout-new-game");
    if (newGameButton) {
      newGameButton.addEventListener("click", () => {
        const confirmed = window.confirm("進化データも含めて最初から始めますか？");
        if (!confirmed) return;
        startFreshGame(game.saveSlot || 1);
        game.townView = "loadout";
        game.loadoutStep = "character";
        ui.townDialog.dataset.view = "loadout";
        renderExpeditionLoadout();
      });
    }
    return;
  }

  ui.townDialogBody.innerHTML = `
    <div class="loadout-stage-head">
      <div class="loadout-step-track" aria-label="遠征準備">
        <b>1</b><span>探索者</span><i></i><b class="active">2</b><span>星遺物</span>
      </div>
      <strong>最初の運命をひとつ選ぶ</strong>
      <small>初期星遺物は序盤の戦い方を決めます。あえて持たずに出ると、無印進化が解放されます。</small>
    </div>
    <section class="loadout-relic-stage">
      <div class="loadout-selected-hero" style="--hero-color:${profile.color}">
        <canvas width="150" height="150" aria-hidden="true"></canvas>
        <div><span>SELECTED</span><strong>${profile.name}</strong><small>${profile.style}</small></div>
      </div>
      <div class="loadout-relic-grid"></div>
    </section>
    <div class="loadout-actions loadout-final-actions">
      <button type="button" class="secondary-button loadout-back">探索者を選び直す</button>
      <button type="button" class="primary-button loadout-depart">この運命でB1Fへ</button>
    </div>
  `;
  drawPortrait(ui.townDialogBody.querySelector(".loadout-selected-hero canvas"), selectedActor);
  const relicGrid = ui.townDialogBody.querySelector(".loadout-relic-grid");
  const noRelic = document.createElement("button");
  noRelic.type = "button";
  noRelic.className = `starter-none ${game.startingRelicKey ? "" : "selected"}`;
  noRelic.innerHTML = "<b>無</b><strong>持たずに出る</strong><small>序盤は不利。無印進化の条件を開放する</small>";
  noRelic.addEventListener("click", () => {
    game.startingRelicKey = null;
    saveCurrentGame(true);
    renderExpeditionLoadout();
  });
  relicGrid.appendChild(noRelic);
  for (const key of starterKeys) {
    const relic = relicCatalog.find((entry) => entry.key === key);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `relic-choice ${game.startingRelicKey === key ? "selected" : ""}`;
    button.innerHTML = relicCardMarkup(relic);
    button.addEventListener("click", () => {
      game.startingRelicKey = key;
      saveCurrentGame(true);
      renderExpeditionLoadout();
    });
    relicGrid.appendChild(button);
  }
  ui.townDialogBody.querySelector(".loadout-back").addEventListener("click", () => {
    game.loadoutStep = "character";
    renderExpeditionLoadout();
  });
  ui.townDialogBody.querySelector(".loadout-depart").addEventListener("click", startExpedition);
}

function startExpedition() {
  delete ui.townDialog.dataset.view;
  if (ui.townDialog.open) ui.townDialog.close();
  const checkpoint = game.towerCheckpoint ? structuredClone(game.towerCheckpoint) : null;
  prepareNewTry();
  game.mode = "dungeon";
  game.activeTownMission = towerContract;
  game.targetFloor = 100;
  game.floor = checkpoint?.floor || 1;
  game.turn = 1;
  game.score = 0;
  game.belly = 100;
  game.gameOver = false;
  game.victory = false;
  game.luck = randInt(-1, 1);
  if (checkpoint) restoreTowerCheckpoint(checkpoint);
  buildFloor();
  addLog(checkpoint
    ? `休憩所の記録から、星喰い塔B${game.floor}Fの挑戦を再開した。`
    : `新しい挑戦を開始。${getLeader().name}は星喰い塔の100階を見上げた。`);
  announceEvent(checkpoint ? "TRY RESUME" : "TRY START", `星喰い塔 B${game.floor}F`, "発", "mystic");
  playSfx("depart");
  updateAll();
  queueRouteChoiceIfNeeded(220);
  queueFloorChoiceIfNeeded(720);
}

function prepareNewTry() {
  const leader = createLeader(game.selectedCharacter);
  applyPersistentLineage(leader);
  game.roster[game.selectedCharacter] = leader;
  game.team = [leader];
  game.selectedMove = 0;
  game.skillPoints = 1;
  game.statPoints = 0;
  game.unlockedSkills = [];
  game.relics = [];
  game.pendingRelicChoices = [];
  game.pendingMoveChoices = [];
  game.pendingMovePicks = 0;
  game.pendingAscensionChoices = [];
  game.pendingRouteChoices = [];
  game.pendingFloorChoice = null;
  game.routePlan = {};
  game.milestoneSource = null;
  game.rewardPending = false;
  game.secondMoonUsed = false;
  game.lastActionStyle = null;
  game.lastMoveElement = null;
  game.currentActionMultiplier = 1;
  game.currentActionElement = null;
  game.lastDamageSource = null;
  game.evolutionBag = Object.fromEntries(evolutionMaterialKeys.map((key) => [key, 0]));
  game.runStats = createRunStats();
  game.belly = 100;
  game.logs = [];
  game.screenShake = null;
  game.pendingLevelUps = [];
  game.levelDialogScheduled = false;
  if (game.startingRelicKey) addRelic(game.startingRelicKey, false);
}

function discardRunInventory() {
  game.bag = createStarterBag();
  game.evolutionBag = Object.fromEntries(evolutionMaterialKeys.map((key) => [key, 0]));
  game.gearBag = [];
  game.equipment = { weapon: null, armor: null, charm: null };
  game.forgeSelection = [];
}

function createRunStats() {
  return {
    kills: 0,
    itemUses: 0,
    techniques: 0,
    physicalUses: 0,
    magicUses: 0,
    mutants: 0,
    trapsTriggered: 0,
    floorsCleared: 0,
    elementCombos: 0,
    routeChoices: 0,
    floorChoices: 0,
    thefts: 0,
    clientsKilled: 0,
    helped: 0,
  };
}

function returnToTown() {
  game.mode = "town";
  game.townPlayer = { x: 576, y: 470, dx: 0, dy: 1, movingUntil: 0 };
  game.gameOver = false;
  game.victory = false;
  ui.endOverlay.hidden = true;
  if (ui.gameMenuDialog.open) ui.gameMenuDialog.close();
  if (ui.stairsDialog.open) ui.stairsDialog.close();
  if (ui.restDialog.open) ui.restDialog.close();
  if (ui.levelDialog.open) ui.levelDialog.close();
  ui.eventBanner.hidden = true;
  prepareNewTry();
  updateAll();
}

function createLeader(characterKey = "kohaku") {
  const profile = characterCatalog.find((character) => character.key === characterKey) || characterCatalog[0];
  const firstMove = moveCatalog.find((move) => move.key === profile.moves[0]) || moveCatalog[0];
  return {
    id: "leader",
    kind: "leader",
    profileKey: profile.key,
    name: profile.name,
    type: profile.type,
    role: `${profile.type}タイプ`,
    elementKey: profile.elementKey,
    color: profile.color,
    accent: profile.accent,
    scarf: profile.scarf,
    level: 1,
    exp: 0,
    nextExp: expRequirementForLevel(1),
    hp: profile.maxHp,
    maxHp: profile.maxHp,
    atk: profile.atk,
    magic: profile.magic,
    def: profile.def,
    res: profile.res,
    x: 0,
    y: 0,
    dx: 0,
    dy: 1,
    down: false,
    appliedSkills: [],
    evolutionKey: "base",
    evolutionStage: 0,
    evolutionBranch: "base",
    evolutionName: profile.name,
    ascensionHistory: [],
    timeAnchor: null,
    guardTurns: 0,
    moves: [{ ...firstMove, pp: firstMove.maxPp }],
  };
}

function createKnownMove(move) {
  const ppBonus = game?.relics?.includes("starVessel") ? 2 : 0;
  const maxPp = (move.maxPp || 0) + ppBonus;
  return { ...move, maxPp, pp: maxPp };
}

function expRequirementForLevel(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return Math.floor(70 * (1.35 ** (safeLevel - 1)) + safeLevel * 20);
}

function lineageElementKey(profileKey, branch, fallback = "light") {
  const branches = {
    kohaku: { fang: "fire", lumen: "light", shade: "dark", ascetic: "divine", karma: "evil" },
    knight: { warlord: "fire", guardian: "water", revenant: "dark", ascetic: "divine", karma: "evil" },
    magician: { archmage: "water", chaos: "fire", void: "dark", ascetic: "divine", karma: "evil" },
  };
  return branches[profileKey]?.[branch] || fallback;
}

function applyPersistentLineage(actor) {
  const lineage = game?.persistentLineages?.[actor.profileKey];
  if (!lineage || !lineage.stage) return;
  actor.evolutionStage = clamp(Number(lineage.stage) || 0, 0, 10);
  actor.evolutionBranch = lineage.branch || "base";
  actor.evolutionName = lineage.name || actor.name;
  if (Number.isInteger(lineage.artIndex)) {
    actor.artIndex = lineage.artIndex;
    delete actor.artColumn;
  } else {
    actor.artColumn = Number.isInteger(lineage.artColumn) ? lineage.artColumn : 0;
  }
  actor.color = lineage.color || actor.color;
  actor.elementKey = lineage.elementKey || lineageElementKey(actor.profileKey, lineage.branch, actor.elementKey);
  actor.ascensionHistory = Array.isArray(lineage.history) ? [...lineage.history] : [];
  const bonus = lineage.bonus || {};
  actor.maxHp += Number(bonus.hp) || 0;
  actor.hp = actor.maxHp;
  actor.atk += Number(bonus.atk) || 0;
  actor.magic += Number(bonus.magic) || 0;
  actor.def += Number(bonus.def) || 0;
  actor.res += Number(bonus.res) || 0;
  if (lineage.moveKey) {
    learnEvolutionMove(actor, { moveKey: lineage.moveKey }, false);
  }
}

function applyPersistentEvolution(actor) {
  const key = game?.persistentEvolutionKey || "base";
  if (key === "base") return;
  const chain = [];
  let cursor = evolutionCatalog.find((entry) => entry.key === key);
  while (cursor) {
    chain.unshift(cursor);
    cursor = evolutionCatalog.find((entry) => entry.key === cursor.from);
  }
  for (const evolution of chain) applyEvolutionBonus(actor, evolution);
  const final = chain[chain.length - 1];
  if (!final) return;
  actor.evolutionKey = final.key;
  actor.evolutionStage = final.stage;
  actor.name = final.name;
  actor.type = final.type;
  actor.role = `${final.type}タイプ`;
  actor.color = final.color;
  actor.accent = final.accent;
  actor.scarf = final.scarf;
  actor.hp = actor.maxHp;
}

function applyEvolutionBonus(actor, evolution) {
  actor.maxHp += evolution.bonus.hp;
  if (evolution.path === "magic") {
    actor.magic += evolution.bonus.atk;
    actor.res += evolution.bonus.def;
    actor.atk += Math.floor(evolution.bonus.atk / 3);
    actor.def += Math.floor(evolution.bonus.def / 2);
  } else if (evolution.path === "hybrid") {
    actor.atk += evolution.bonus.atk;
    actor.magic += evolution.bonus.atk;
    actor.def += evolution.bonus.def;
    actor.res += evolution.bonus.def;
  } else {
    actor.atk += evolution.bonus.atk;
    actor.def += evolution.bonus.def;
    actor.magic += Math.floor(evolution.bonus.atk / 3);
    actor.res += Math.floor(evolution.bonus.def / 2);
  }
}

function buildFloor() {
  const restFloor = isRestFloor(game.floor);
  const dungeon = restFloor ? generateRestSanctuary(game.floor) : generateDungeon();
  dungeonTileCache.clear();
  miniMapRenderKey = "";
  game.map = dungeon.map;
  game.rooms = dungeon.rooms;
  game.floorLayoutName = dungeon.layoutName;
  game.seen = makeGrid(false);
  game.visible = makeGrid(false);
  game.mapped = makeGrid(false);
  game.enemies = [];
  game.items = [];
  game.merchant = null;
  game.merchantView = "buy";
  game.casino = null;
  game.secretStairs = null;
  game.monsterHouse = null;
  game.restFacilities = [];
  game.restNodes = [];
  game.restTheme = dungeon.restTheme || null;
  game.traps = [];
  game.effects = [];
  game.floating = [];
  game.focusTurns = 0;
  game.relicFloorState = {};
  game.aimDirection = null;
  game.screenFlash = null;
  game.screenShake = null;
  game.guidanceActive = false;
  game.windWarningShown = false;
  game.windDangerShown = false;
  game.stairsRevealed = true;
  game.restChoiceTaken = false;
  game.pendingFloorChoice = null;
  game.leaderTrail = [];

  const start = centerOf(game.rooms[0]);
  const blockers = [];
  game.team.forEach((actor, index) => {
    actor.down = false;
    actor.hp = Math.max(actor.hp, Math.ceil(actor.maxHp * 0.45));
    const spot = index === 0 ? start : nearestOpen(start.x + index, start.y, blockers);
    actor.x = spot.x;
    actor.y = spot.y;
    actor.dx = 0;
    actor.dy = 1;
    actor.motion = null;
    blockers.push({ x: actor.x, y: actor.y });
  });

  const leader = getLeader();
  leader.timeAnchor = {
    hp: leader.hp,
    moves: leader.moves.map((move) => ({ key: move.key, pp: move.pp })),
  };
  game.leaderTrail = Array.from({ length: Math.max(8, game.team.length + 3) }, () => ({
    x: leader.x,
    y: leader.y,
  }));

  const roomsByDistance = game.rooms
    .slice(1)
    .map((room) => ({ room, distance: manhattan(start.x, start.y, centerOf(room).x, centerOf(room).y) }))
    .sort((a, b) => b.distance - a.distance);

  const farRoom = roomsByDistance[0]?.room || game.rooms[game.rooms.length - 1];
  const secondRoom = roomsByDistance.find((entry) => entry.room !== farRoom)?.room || farRoom;
  const bossPoint = nearestOpen(centerOf(farRoom).x, centerOf(farRoom).y, blockers);
  const stairPoint = nearestOpen(centerOf(secondRoom).x, centerOf(secondRoom).y, [...blockers, bossPoint]);
  const bossProfile = towerBossForFloor(game.floor);
  const bossFloor = !restFloor && Boolean(bossProfile);
  game.floorKind = restFloor ? (isMajorRestFloor(game.floor) ? "major-rest" : "rest") : bossFloor ? "boss" : "combat";
  game.mission = {
    target: bossProfile?.name || "階段",
    x: bossPoint.x,
    y: bossPoint.y,
    complete: !bossFloor,
    reward: 120 + game.floor * 18,
    boss: bossFloor,
  };
  game.stairs = stairPoint;
  game.stairsRevealed = true;
  game.floorEvent = restFloor
    ? { key: "rest", name: isMajorRestFloor(game.floor) ? "大休憩" : "休憩", detail: "敵も罠も現れない", luck: 0 }
    : rollFloorEvent();
  const routePlan = currentRoutePlan();
  game.luck = game.floorEvent.luck
    + (routePlan?.luck || 0)
    + (hasSkill("fortune") ? 1 : 0)
    + (hasRelic("luckyAsh") ? 1 : 0);

  if (restFloor) {
    const major = isMajorRestFloor(game.floor);
    game.stairs = dungeon.stairs;
    game.mission = {
      target: dungeon.restTheme.name,
      x: dungeon.altar.x,
      y: dungeon.altar.y,
      complete: true,
      reward: 0,
      boss: false,
    };
    restoreAllPp();
    if (major) {
      leader.hp = leader.maxHp;
      game.belly = 100;
    }
    spawnDungeonMerchant(false, true, major ? 2 : 1, dungeon.merchantRoom);
    game.restFacilities = createRestFacilities(major);
    game.restNodes = [
      {
        key: "milestone",
        action: "milestone",
        name: "進化の祭壇",
        detail: "進化か強力な星遺物を選ぶ",
        icon: "進",
        color: dungeon.restTheme.accent,
        x: dungeon.altar.x,
        y: dungeon.altar.y,
      },
      ...game.restFacilities.map((facility, index) => ({
        ...facility,
        action: `facility-${facility.key}`,
        color: facility.key === "storage" ? "#8fd7c1" : dungeon.restTheme.glow,
        ...(dungeon.facilitySpots[index] || dungeon.facilitySpots[0]),
      })),
    ];
    revealRestSanctuary();
    addLog(`B${game.floor}F: ${dungeon.restTheme.name}へ到着。技PPが全回復した。施設は歩いて利用できる。`);
    announceEvent(
      major ? "大休憩所" : "休憩所",
      `${dungeon.restTheme.name}　${dungeon.restTheme.subtitle}`,
      "休",
      "good",
    );
    return;
  }

  spawnItems();
  spawnHiddenTraps();
  if (bossFloor) {
    spawnBoss(bossProfile, bossPoint);
  } else {
    spawnEnemies();
    spawnDungeonMerchant(false);
    spawnSecretRewardStairs();
    spawnMonsterHouse();
    spawnCasino();
  }
  applyFloorEvent();
  revealAroundTeam();
  if (bossFloor) {
    const bossTheme = bossThemeForFloor(game.floor);
    addLog(`B${game.floor}F: 休憩所を守る門番 ${bossProfile.name}が現れた。${bossTheme ? `作戦は${bossTheme.plan}。${bossTheme.warning}` : ""}`);
    announceEvent("GATE BOSS", `${bossProfile.title} ${bossProfile.name}${bossTheme ? ` / ${bossTheme.plan}` : ""}`, "冠", "danger");
  } else {
    const trend = floorElementTrend().map((key) => elementInfo(key).name).join("・");
    const routeText = routePlan ? `　ルート: ${routePlan.name}` : "";
    addLog(`B${game.floor}F: ${game.floorLayoutName}。通常階段を目指そう。この区画は${trend}属性の敵が多い。${routeText}`);
  }
  addLog(`階層運勢「${game.floorEvent.name}」: ${game.floorEvent.detail}。`);
}

function isRestFloor(floor) {
  return floor > 0 && floor % 10 === 0;
}

function isMajorRestFloor(floor) {
  return floor > 0 && floor % 20 === 0;
}

function towerBossForFloor(floor) {
  if (floor % 10 !== 9) return null;
  return towerBossCatalog[Math.floor(floor / 10)] || null;
}

function restoreAllPp() {
  for (const actor of game.team) {
    for (const move of actor.moves || []) move.pp = move.maxPp;
  }
}

function rollFloorEvent() {
  const choiceWeight = routeEffectNumber("choiceBonus") > 0 ? 10 : 4;
  return weighted([
    { value: { key: "calm", name: "平穏", detail: "大きな変化はない", luck: 0 }, weight: 28 },
    { value: { key: "starwind", name: "星風", detail: "隊のHPが少し回復する", luck: 2, heal: 6 }, weight: 16 },
    { value: { key: "treasure", name: "宝運", detail: "道具が多く、珍品も出やすい", luck: 3, itemBonus: 3, rare: true }, weight: 10 },
    { value: { key: "quiet", name: "静穏", detail: "敵が少なく探索しやすい", luck: 1, enemyBonus: -3 }, weight: 15 },
    { value: { key: "ambush", name: "敵襲", detail: "敵が増えるが獲得経験も高い", luck: -2, enemyBonus: 3, expBonus: 0.25 }, weight: 16 },
    { value: { key: "wandering", name: "ざわめき", detail: "増援が早く現れる", luck: -1, reinforcement: 12 }, weight: 15 },
    { value: { key: "crossroads", name: "星見の分岐", detail: "小さな選択イベントが起きる", luck: 0, choice: "crossroads" }, weight: choiceWeight },
    { value: { key: "shrine", name: "咎星の祭壇", detail: "リスク付きの選択イベントが起きる", luck: -1, choice: "shrine" }, weight: Math.max(2, choiceWeight - 2) },
  ]);
}

function applyFloorEvent() {
  if (game.floorEvent.heal) {
    for (const actor of livingTeam()) actor.hp = Math.min(actor.maxHp, actor.hp + game.floorEvent.heal);
  }
  if (game.floorEvent.rare) {
    const point = randomOpenTile();
    if (point) {
      const kind = weighted([
        { value: "reviver", weight: 4 },
        { value: "guidingOrb", weight: 4 },
        { value: "bigApple", weight: 3 },
        { value: "elixir", weight: 3 },
        { value: "fortuneOrb", weight: 2 },
      ]);
      game.items.push({
        id: cryptoId(),
        kind,
        x: point.x,
        y: point.y,
      });
    }
  }
}

function restThemeForFloor(floor) {
  const index = clamp(Math.floor(floor / 10) - 1, 0, restSanctuaryThemes.length - 1);
  return { ...restSanctuaryThemes[index], index };
}

function generateRestSanctuary(floor) {
  const restTheme = restThemeForFloor(floor);
  const map = makeGrid("wall");
  const variants = [
    { x: 13, y: 9, w: 10, h: 7 },
    { x: 12, y: 8, w: 12, h: 8 },
    { x: 14, y: 8, w: 8, h: 9 },
  ];
  const centerRoom = { ...variants[restTheme.index % variants.length] };
  const ringRooms = [
    { x: 15, y: 2, w: 6, h: 5 },
    { x: 25, y: 3, w: 7, h: 5 },
    { x: 27, y: 10, w: 7, h: 5 },
    { x: 25, y: 17, w: 7, h: 4 },
    { x: 15, y: 18, w: 6, h: 4 },
    { x: 4, y: 17, w: 7, h: 4 },
    { x: 2, y: 10, w: 7, h: 5 },
    { x: 4, y: 3, w: 7, h: 5 },
  ];
  const rotation = (restTheme.index * 2) % ringRooms.length;
  const ordered = ringRooms.map((_, index) => ringRooms[(index + rotation) % ringRooms.length]);
  const rooms = [centerRoom, ...ringRooms];
  rooms.forEach((room) => carveRoom(map, room));
  ringRooms.forEach((room, index) => {
    carveRestCorridor(map, centerOf(centerRoom), centerOf(room), (index + restTheme.index) % 2 === 0);
  });

  const altarRoom = ordered[0];
  const merchantRoom = ordered[2];
  const exitRoom = ordered[4];
  const facilityRooms = [ordered[6], ordered[1], ordered[3], ordered[5]];
  return {
    map,
    rooms,
    layoutName: restTheme.name,
    restTheme,
    altar: centerOf(altarRoom),
    merchantRoom,
    facilitySpots: facilityRooms.map(centerOf),
    stairs: centerOf(exitRoom),
  };
}

function carveRestCorridor(map, from, to, horizontalFirst) {
  const carveWide = (x, y) => {
    if (inBounds(x, y)) map[y][x] = "floor";
    if (horizontalFirst && inBounds(x, y + 1)) map[y + 1][x] = "floor";
    if (!horizontalFirst && inBounds(x + 1, y)) map[y][x + 1] = "floor";
  };
  if (horizontalFirst) {
    for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x += 1) carveWide(x, from.y);
    for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y += 1) carveWide(to.x, y);
  } else {
    for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y += 1) carveWide(from.x, y);
    for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x += 1) carveWide(x, to.y);
  }
}

function generateDungeon() {
  const layouts = [
    { name: "枝分かれする小部屋群", minRooms: 9, maxRooms: 12, minW: 4, maxW: 7, minH: 4, maxH: 6, loops: 1, branches: 3 },
    { name: "広間が連なる洞窟", minRooms: 6, maxRooms: 8, minW: 7, maxW: 11, minH: 5, maxH: 8, loops: 2, branches: 1 },
    { name: "回廊の多い迷宮", minRooms: 7, maxRooms: 10, minW: 5, maxW: 8, minH: 4, maxH: 6, loops: 4, branches: 2 },
    { name: "疎らな星屑区画", minRooms: 6, maxRooms: 9, minW: 5, maxW: 9, minH: 4, maxH: 7, loops: 1, branches: 4 },
    { name: "大広間を抱く空洞", minRooms: 5, maxRooms: 7, minW: 5, maxW: 8, minH: 4, maxH: 6, loops: 2, branches: 2, greatRoom: true, spacing: 2 },
    { name: "細長い巡礼回廊", minRooms: 5, maxRooms: 7, minW: 4, maxW: 7, minH: 4, maxH: 6, loops: 1, branches: 3, branchMin: 8, branchMax: 17, longCorridors: 3 },
    { name: "十字に裂けた鉱道", minRooms: 6, maxRooms: 9, minW: 4, maxW: 8, minH: 4, maxH: 6, loops: 3, branches: 5, branchMin: 5, branchMax: 12, longCorridors: 2 },
  ];
  const layout = layouts[randInt(0, layouts.length - 1)];
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const map = makeGrid("wall");
    const rooms = [];
    const roomCount = randInt(layout.minRooms, layout.maxRooms);

    for (let i = 0; i < roomCount * 12 && rooms.length < roomCount; i += 1) {
      const greatRoom = layout.greatRoom && rooms.length === 0;
      const w = greatRoom ? randInt(14, 20) : randInt(layout.minW, layout.maxW);
      const h = greatRoom ? randInt(9, 13) : randInt(layout.minH, layout.maxH);
      const x = randInt(1, MAP_W - w - 2);
      const y = randInt(1, MAP_H - h - 2);
      const room = { x, y, w, h };
      if (rooms.some((other) => overlaps(room, other, layout.spacing ?? (layout.name === "疎らな星屑区画" ? 3 : 2)))) continue;
      carveRoom(map, room);
      rooms.push(room);
    }

    if (rooms.length >= layout.minRooms - 1) {
      connectRoomNetwork(map, rooms, layout.loops);
      carveSideBranches(map, rooms, layout.branches, layout.branchMin || 3, layout.branchMax || 7);
      if (layout.longCorridors) carveLongCorridors(map, rooms, layout.longCorridors);
      scatterTerrain(map);
      return { map, rooms, layoutName: layout.name };
    }
  }

  const fallback = makeGrid("floor");
  return {
    map: fallback,
    rooms: [{ x: 1, y: 1, w: MAP_W - 2, h: MAP_H - 2 }],
    layoutName: "一枚岩の大広間",
  };
}

function connectRoomNetwork(map, rooms, extraConnections) {
  const connected = [rooms[randInt(0, rooms.length - 1)]];
  const remaining = rooms.filter((room) => room !== connected[0]);
  const linkedPairs = new Set();

  while (remaining.length) {
    let best = null;
    for (const from of connected) {
      for (const to of remaining) {
        const fromCenter = centerOf(from);
        const toCenter = centerOf(to);
        const score = manhattan(fromCenter.x, fromCenter.y, toCenter.x, toCenter.y) + Math.random() * 5;
        if (!best || score < best.score) best = { from, to, score };
      }
    }
    connectRooms(map, centerOf(best.from), centerOf(best.to));
    linkedPairs.add(roomPairKey(best.from, best.to));
    connected.push(best.to);
    remaining.splice(remaining.indexOf(best.to), 1);
  }

  const candidates = [];
  for (let first = 0; first < rooms.length; first += 1) {
    for (let second = first + 1; second < rooms.length; second += 1) {
      const from = rooms[first];
      const to = rooms[second];
      if (linkedPairs.has(roomPairKey(from, to))) continue;
      const a = centerOf(from);
      const b = centerOf(to);
      candidates.push({ from, to, distance: manhattan(a.x, a.y, b.x, b.y) + Math.random() * 8 });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  for (const connection of candidates.slice(0, extraConnections)) {
    connectRooms(map, centerOf(connection.from), centerOf(connection.to));
  }
}

function roomPairKey(first, second) {
  const a = `${first.x},${first.y}`;
  const b = `${second.x},${second.y}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function carveSideBranches(map, rooms, count, minLength = 3, maxLength = 7) {
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  for (let branch = 0; branch < count; branch += 1) {
    const room = rooms[randInt(0, rooms.length - 1)];
    const center = centerOf(room);
    const direction = directions[randInt(0, directions.length - 1)];
    const length = randInt(minLength, maxLength);
    let x = center.x;
    let y = center.y;
    for (let step = 0; step < length; step += 1) {
      x += direction.x;
      y += direction.y;
      if (!inBounds(x, y) || x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2) break;
      map[y][x] = "floor";
    }
    for (let pocketY = y - 1; pocketY <= y + 1; pocketY += 1) {
      for (let pocketX = x - 1; pocketX <= x + 1; pocketX += 1) {
        if (inBounds(pocketX, pocketY)) map[pocketY][pocketX] = "floor";
      }
    }
  }
}

function carveLongCorridors(map, rooms, count) {
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  for (let index = 0; index < count; index += 1) {
    const room = rooms[randInt(0, rooms.length - 1)];
    const direction = directions[randInt(0, directions.length - 1)];
    let x = clamp(randInt(room.x, room.x + room.w - 1), 2, MAP_W - 3);
    let y = clamp(randInt(room.y, room.y + room.h - 1), 2, MAP_H - 3);
    const length = randInt(10, 22);
    for (let step = 0; step < length; step += 1) {
      x += direction.x;
      y += direction.y;
      if (x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2) break;
      map[y][x] = "floor";
      if (step > 5 && step % 7 === 0 && Math.random() < 0.55) {
        for (let py = y - 1; py <= y + 1; py += 1) {
          for (let px = x - 1; px <= x + 1; px += 1) {
            if (inBounds(px, py) && Math.random() < 0.7) map[py][px] = "floor";
          }
        }
      }
    }
  }
}

function carveRoom(map, room) {
  for (let y = room.y; y < room.y + room.h; y += 1) {
    for (let x = room.x; x < room.x + room.w; x += 1) {
      map[y][x] = "floor";
    }
  }
}

function connectRooms(map, a, b) {
  const route = randInt(0, 2);
  if (route === 0) {
    carveHorizontal(map, a.x, b.x, a.y);
    carveVertical(map, a.y, b.y, b.x);
  } else if (route === 1) {
    carveVertical(map, a.y, b.y, a.x);
    carveHorizontal(map, a.x, b.x, b.y);
  } else {
    const bendX = clamp(Math.round((a.x + b.x) / 2) + randInt(-2, 2), 1, MAP_W - 2);
    carveHorizontal(map, a.x, bendX, a.y);
    carveVertical(map, a.y, b.y, bendX);
    carveHorizontal(map, bendX, b.x, b.y);
  }
}

function carveHorizontal(map, x1, x2, y) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
    if (inBounds(x, y)) map[y][x] = "floor";
    if (inBounds(x, y + 1) && Math.random() < 0.16) map[y + 1][x] = "floor";
  }
}

function carveVertical(map, y1, y2, x) {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
    if (inBounds(x, y)) map[y][x] = "floor";
    if (inBounds(x + 1, y) && Math.random() < 0.16) map[y][x + 1] = "floor";
  }
}

function scatterTerrain(map) {
  return map;
}

function spawnHiddenTraps() {
  const count = clamp(1 + Math.floor(game.floor / 30) + (game.floorEvent?.key === "ambush" ? 1 : 0), 1, 5);
  const trapKinds = ["spike", "sleep", "warp", "silence"];
  for (let index = 0; index < count; index += 1) {
    const point = randomOpenTile();
    if (!point) continue;
    game.traps.push({
      id: cryptoId(),
      kind: trapKinds[randInt(0, trapKinds.length - 1)],
      x: point.x,
      y: point.y,
      revealed: false,
      used: false,
    });
  }
}

function spawnItems() {
  const count = clamp(
    2
      + Math.floor(game.floor / 10)
      + Math.ceil(((game.floorEvent?.itemBonus || 0) + routeEffectNumber("itemBonus")) / 2)
      + (hasSkill("salvage") ? 1 : 0),
    2,
    6,
  );
  for (let i = 0; i < count; i += 1) {
    const kind = weighted([
      { value: "apple", weight: 18 },
      { value: "bigApple", weight: 7 },
      { value: "oran", weight: 18 },
      { value: "elixir", weight: 10 },
      { value: "reviver", weight: 5 },
      { value: "blastSeed", weight: 10 },
      { value: "sleepSeed", weight: 8 },
      { value: "slumberOrb", weight: 5 },
      { value: "warpOrb", weight: 5 },
      { value: "guidingOrb", weight: 5 },
      { value: "guardBerry", weight: 6 },
      { value: "powerBerry", weight: 4 },
      { value: "focusMint", weight: 8 },
      { value: "mindBerry", weight: 3 },
      { value: "wardBerry", weight: 3 },
      { value: "ironNut", weight: 3 },
      { value: "pierceSeed", weight: 7 },
      { value: "stormOrb", weight: 4 },
      { value: "mapScroll", weight: 4 },
      { value: "fortuneOrb", weight: 3 },
      { value: "badge", weight: 2 },
      { value: "stardust", weight: 10 },
    ]);
    const point = randomOpenTile();
    if (!point) continue;
    game.items.push({ id: cryptoId(), kind, x: point.x, y: point.y });
  }
}

function generateGear(qualityBoost = 0, minimumStars = 1, preferredSlot = null, excludedKey = null) {
  let basePool = preferredSlot ? gearBases.filter((entry) => entry.slot === preferredSlot) : gearBases;
  const alternatePool = basePool.filter((entry) => entry.key !== excludedKey);
  if (alternatePool.length) basePool = alternatePool;
  const base = basePool[randInt(0, basePool.length - 1)];
  const depth = game.floor + (game.activeTownMission?.chapter || 1) * 2;
  let quality = weighted(
    gearQualities.map((entry, index) => ({
      value: entry,
      weight: Math.max(1, entry.weight + (index - 1) * (depth + qualityBoost * 5)),
    })),
  );
  if (quality.stars < minimumStars) quality = gearQualities[minimumStars - 1];
  const power = quality.scale + qualityBoost + Math.floor(depth / 4);
  const slotBonus = base.slot === "weapon"
    ? { atk: power, def: 0, hp: 0 }
    : base.slot === "armor"
      ? { atk: 0, def: Math.floor(power / 2), hp: power * 2 }
      : { atk: Math.floor(power / 2), def: Math.floor(power / 3), hp: power * 3 };
  return {
    id: cryptoId(),
    key: base.key,
    slot: base.slot,
    name: `${quality.prefix}${base.name}`,
    quality: quality.name,
    stars: quality.stars,
    color: quality.color,
    atk: base.atk + slotBonus.atk,
    def: base.def + slotBonus.def,
    hp: base.hp + slotBonus.hp,
  };
}

function spawnEnemies() {
  const count = clamp(
    6 + Math.floor(game.floor / 12) + (game.floorEvent?.enemyBonus || 0) + routeEffectNumber("enemyBonus"),
    4,
    16,
  );
  const rareChance =
    0.006 +
    game.floor * 0.00008 +
    Math.max(0, game.luck) * 0.001;
  let rareSpawned = false;
  for (let i = 0; i < count; i += 1) {
    const spawnRare = !rareSpawned && Math.random() < rareChance;
    const catalog = spawnRare ? randomRareEnemyProfile() : randomEnemyProfile();
    rareSpawned ||= spawnRare;
    const point = randomEnemySpawnTile(7);
    if (!point) continue;
    game.enemies.push(createEnemy(catalog, point));
  }
}

function spawnDungeonMerchant(bossFloor = false, forced = false, shopTier = 0, preferredRoom = null) {
  const shopChance = clamp(0.42 + routeEffectNumber("shopBonus"), 0.08, 0.82);
  if (bossFloor || (!forced && game.floor !== 2 && Math.random() > shopChance)) return;
  const leader = getLeader();
  const candidates = game.rooms.filter((room) => (
    room.w >= 5
    && room.h >= 4
    && !pointInRoom(leader.x, leader.y, room)
    && !pointInRoom(game.stairs.x, game.stairs.y, room)
    && !pointInRoom(game.mission.x, game.mission.y, room)
  ));
  const room = preferredRoom
    || candidates[randInt(0, candidates.length - 1)]
    || game.rooms.find((entry) => !pointInRoom(leader.x, leader.y, entry));
  if (!room) return;
  const shopTiles = [];
  for (let y = room.y; y < room.y + room.h; y += 1) {
    for (let x = room.x; x < room.x + room.w; x += 1) shopTiles.push({ x, y });
  }
  const roomCenter = centerOf(room);
  const preferredPoint = preferredRoom && shopTiles.find((tile) => (
    tile.x === roomCenter.x
    && tile.y === roomCenter.y
    && !actorAt(tile.x, tile.y)
  ));
  const point = preferredPoint || shopTiles.find((tile) => (
    !actorAt(tile.x, tile.y)
    && !(tile.x === game.stairs.x && tile.y === game.stairs.y)
    && !(tile.x === game.mission.x && tile.y === game.mission.y)
  ));
  if (!point) return;
  const shopKeys = new Set(shopTiles.map((tile) => `${tile.x},${tile.y}`));
  game.items = game.items.filter((item) => !shopKeys.has(`${item.x},${item.y}`));
  game.traps = game.traps.filter((trap) => !shopKeys.has(`${trap.x},${trap.y}`));
  game.enemies = game.enemies.filter((enemy) => !shopKeys.has(`${enemy.x},${enemy.y}`));
  const materialKind = evolutionMaterialKeys[randInt(0, evolutionMaterialKeys.length - 2)];
  const stock = [
    { id: cryptoId(), kind: "apple", price: 55, sold: false, picked: false },
    { id: cryptoId(), kind: weighted([{ value: "oran", weight: 4 }, { value: "elixir", weight: 3 }, { value: "focusMint", weight: 3 }, { value: "pierceSeed", weight: 2 }]), price: 85, sold: false, picked: false },
    { id: cryptoId(), kind: materialKind, price: 145, sold: false, picked: false, material: true },
    { id: cryptoId(), kind: weighted([{ value: "reviver", weight: 3 }, { value: "fortuneOrb", weight: 3 }, { value: "stormOrb", weight: 2 }, { value: "mapScroll", weight: 2 }]), price: 180 + game.floor * 2, sold: false, picked: false },
  ];
  game.merchant = {
    id: cryptoId(),
    name: "星渡り商ノノ",
    x: point.x,
    y: point.y,
    robbed: false,
    shopTier,
    room: { ...room },
    shopTiles,
    unpaid: [],
    stock,
  };
  const productTiles = shopTiles
    .filter((tile) => (tile.x !== point.x || tile.y !== point.y) && !isShopEntranceTile(tile, shopKeys))
    .sort(() => Math.random() - 0.5);
  stock.forEach((offer, index) => {
    const tile = productTiles[index];
    if (!tile) {
      offer.sold = true;
      return;
    }
    offer.x = tile.x;
    offer.y = tile.y;
    game.items.push({
      id: cryptoId(),
      kind: offer.kind,
      x: tile.x,
      y: tile.y,
      shopItem: true,
      shopOfferId: offer.id,
      price: offer.price,
    });
  });
  addLog("色の違う床に星渡り商ノノの商品が並んだ。拾った品は店内で精算しよう。");
}

function isShopEntranceTile(tile, shopKeys) {
  return dirs.slice(0, 4).some((dir) => {
    const x = tile.x + dir.x;
    const y = tile.y + dir.y;
    return isWalkable(x, y) && !shopKeys.has(`${x},${y}`);
  });
}

function createRestFacilities(major = false) {
  const facilities = [{ key: "storage", name: "風見倉庫", detail: "バッグと倉庫を整理する", icon: "倉" }];
  if (!major) return facilities;
  const randomShops = [
    { key: "healer", name: "月湯屋", detail: "星貨でHPと満腹度を回復", icon: "湯" },
    { key: "mystic", name: "術式露店", detail: "技PPの強化と技の習得", icon: "術" },
    { key: "gambler", name: "流星賭場", detail: "星貨を賭けて珍品を狙う", icon: "賭" },
  ].sort(() => Math.random() - 0.5);
  return [...facilities, ...randomShops.slice(0, randInt(1, 3))];
}

function spawnSecretRewardStairs() {
  const chance = clamp(0.16 + routeEffectNumber("secretBonus"), 0.04, 0.42);
  if (game.floor < 3 || Math.random() > chance) return;
  const point = randomOpenTile();
  if (!point) return;
  game.secretStairs = { x: point.x, y: point.y, revealed: false, used: false };
}

function spawnMonsterHouse() {
  if (game.floor < 4 || Math.random() > 0.2 || game.rooms.length < 3) return;
  const candidates = game.rooms
    .slice(1, -1)
    .filter((room) => !game.merchant || !pointInRoom(game.merchant.x, game.merchant.y, room));
  const room = candidates[randInt(0, candidates.length - 1)];
  if (room) game.monsterHouse = { room: { ...room }, triggered: false, cleared: false };
}

function spawnCasino() {
  if (game.floor < 5 || Math.random() > 0.1) return;
  const point = randomOpenTile();
  if (!point) return;
  game.casino = {
    id: cryptoId(),
    x: point.x,
    y: point.y,
    name: "流星賭場のディーラー",
    plays: 0,
  };
}

function randomRareEnemyProfile() {
  const dungeon = Math.min(5, 1 + Math.floor(game.floor / 20));
  const pool = rareEnemyCatalog.filter((enemy) => enemy.minDungeon <= dungeon);
  return pool[randInt(0, pool.length - 1)] || rareEnemyCatalog[0];
}

function randomEnemyProfile() {
  const families = enemyFamilies.filter(
    (family) => family.minFloor <= game.floor && game.floor <= family.maxFloor,
  );
  const family = families[randInt(0, families.length - 1)];
  const bias = floorEnemyTypeBias();
  const type = weighted(enemyTypes.map((entry) => ({
    value: entry,
    weight: bias[entry.key] || 1,
  })));
  return enemyCatalog.find((enemy) => enemy.familyKey === family.key && enemy.typeKey === type.key);
}

function createEnemy(catalog, point, alerted = false) {
  const scale = Math.floor((game.floor - 1) * 0.32);
  const expMultiplier = 1 + (game.floorEvent?.expBonus || 0) + routeEffectNumber("expBonus");
  const mutationChance = clamp(
    0.005 + game.floor * 0.00018 + Math.max(0, game.luck) * 0.0005 + routeEffectNumber("mutationBonus"),
    0.005,
    0.055,
  );
  const mutation = !catalog.rare && Math.random() < mutationChance
    ? mutationCatalog[randInt(0, mutationCatalog.length - 1)]
    : null;
  const baseHp = Math.ceil((catalog.hp + 3 + scale * 3.2) * 1.08);
  const hp = Math.ceil(baseHp * (mutation?.hpScale || 1));
  const elementKey = enemyElementKey(catalog);
  const element = elementInfo(elementKey);
  const specialFamilyName = specialEnemyElements[catalog.familyKey]
    ? enemyFamilies.find((family) => family.key === catalog.familyKey)?.name
    : null;
  const displayName = specialFamilyName || catalog.name;
  const enemy = {
    id: cryptoId(),
    ...catalog,
    name: mutation ? `${mutation.prefix}${displayName}` : displayName,
    hp,
    maxHp: hp,
    atk: catalog.atk + 1 + Math.floor(scale * 0.9) + (mutation?.atk || 0),
    def: catalog.def + Math.floor(scale / 7) + (mutation?.def || 0),
    res: catalog.def + Math.floor(scale / 8) + (mutation?.magic ? 2 : 0),
    exp: Math.round((catalog.exp + scale * 5) * expMultiplier),
    elementKey,
    type: element.name,
    color: element.color,
    accent: element.accent,
    attackStyle: mutation?.magic || ["starwater", "moonshade", "skywind"].includes(catalog.typeKey) || ["divine", "evil"].includes(elementKey) ? "magic" : "physical",
    mutation,
    mutated: Boolean(mutation),
    x: point.x,
    y: point.y,
    wobble: Math.random() * Math.PI * 2,
    idleAmplitude: 2.4 + Math.random() * 1.8,
    idleSpeed: 250 + Math.random() * 130,
    alerted,
    ability: enemyAbilityForCatalog(catalog, elementKey, mutation),
    abilityCooldown: randInt(1, 4),
  };
  recordEnemySeen(enemy.key);
  return enemy;
}

function enemyAbilityForCatalog(catalog, elementKey, mutation) {
  if (mutation?.volatile || ["goblinBomber", "clockworkImp", "clockworkDrone"].includes(catalog.familyKey)) return "bomb";
  if (["toxicToad", "plagueCrow", "cursedLantern", "frostOwl"].includes(catalog.familyKey)) return "heal";
  if (["stitchedRogue", "mimicChest", "darkJackal"].includes(catalog.familyKey)) return "steal";
  if (["serpentPriest", "mossTreant", "voidEye"].includes(catalog.familyKey)) return "summon";
  if (["toxicMushroom", "toxicSnail", "acidOoze"].includes(catalog.familyKey) && game.floor >= 35) return "heal";
  return null;
}

function spawnBoss(profile, point) {
  const bossIndex = Math.floor(game.floor / 10);
  const bossTheme = bossThemeForFloor(game.floor) || bossThemeCatalog[bossIndex % bossThemeCatalog.length];
  const bossElement = elementInfo(bossTheme.elementKey);
  const bossHp = Math.ceil(profile.hp * 1.18);
  const bossArt = [4, 9, 14, 19, 24, 29, 34, 35, 38, 39][Math.min(9, bossIndex)];
  const boss = {
    id: cryptoId(),
    ...profile,
    key: `boss-${game.floor}`,
    familyKey: "boss",
    type: bossElement.name,
    typeKey: bossTheme.elementKey,
    elementKey: bossTheme.elementKey,
    artIndex: bossArt,
    spritePackId: profile.spritePackId || FOXBOUND_BOSS_SPRITE_IDS[Math.min(9, bossIndex)],
    friendName: profile.name,
    color: bossElement.color,
    accent: bossElement.accent,
    hp: bossHp,
    maxHp: bossHp,
    atk: profile.atk + 2,
    res: profile.def,
    attackStyle: ["mirror", "cannon", "storm", "final"].includes(bossTheme.gimmick) ? "magic" : "physical",
    recruit: 0,
    x: point.x,
    y: point.y,
    wobble: Math.random() * Math.PI * 2,
    idleAmplitude: 4.2,
    idleSpeed: 310,
    alerted: true,
    boss: true,
    bossPlan: bossTheme.plan,
    bossWarning: bossTheme.warning,
    bossGimmick: bossTheme.gimmick,
    bossReward: bossTheme.reward,
    specialCooldown: 2,
  };
  game.enemies.push(boss);
  recordEnemySeen(boss.key);
}

function townFocusedFacility() {
  const player = game.townPlayer || { x: 576, y: 470 };
  let focused = null;
  let closest = Number.POSITIVE_INFINITY;
  for (const facility of townFacilities) {
    const distance = Math.hypot(player.x - facility.x, player.y - facility.y);
    if (distance <= facility.radius && distance < closest) {
      focused = facility;
      closest = distance;
    }
  }
  return focused;
}

function canStandInTown(x, y) {
  const radius = 20;
  if (x < 48 || x > townCanvas.width - 48 || y < 150 || y > townCanvas.height - 42) return false;
  return !townObstacles.some((obstacle) => (
    x + radius > obstacle.left
    && x - radius < obstacle.right
    && y + radius > obstacle.top
    && y - radius < obstacle.bottom
  ));
}

function moveTownPlayer(dx, dy) {
  const player = game.townPlayer || (game.townPlayer = { x: 576, y: 470, dx: 0, dy: 1, movingUntil: 0 });
  const magnitude = Math.hypot(dx, dy) || 1;
  const speed = touchDashHeld ? 29 : 19;
  const stepX = (dx / magnitude) * speed;
  const stepY = (dy / magnitude) * speed;
  let nextX = player.x;
  let nextY = player.y;
  if (canStandInTown(player.x + stepX, player.y + stepY)) {
    nextX += stepX;
    nextY += stepY;
  } else if (canStandInTown(player.x + stepX, player.y)) {
    nextX += stepX;
  } else if (canStandInTown(player.x, player.y + stepY)) {
    nextY += stepY;
  }
  player.dx = Math.sign(dx);
  player.dy = Math.sign(dy);
  const leader = getLeader();
  leader.dx = player.dx;
  leader.dy = player.dy;
  if (nextX === player.x && nextY === player.y) return;
  player.x = nextX;
  player.y = nextY;
  player.movingUntil = performance.now() + 190;
  updateAll();
}

function interactTownFacility() {
  const facility = townFocusedFacility();
  if (!facility) return false;
  if (facility.key === "depart") openExpeditionLoadout();
  else openTownFacility(facility.key);
  playSfx("pickup");
  return true;
}

function performTownAction(action) {
  if (action.type === "openMenu") {
    openGameMenu("controls");
    return;
  }
  if (["basicAttack", "useMove", "wait", "move"].includes(action.type)) openExpeditionLoadout();
}

function performAction(action) {
  if (game.mode === "town") {
    performTownAction(action);
    return;
  }
  if (action.type === "openMenu") {
    toggleGameMenu("moves");
    return;
  }
  if (game.mode !== "dungeon") return;
  if (game.gameOver || game.victory) return;
  const leader = getLeader();
  if (leader.down) return;

  if (action.type === "selectMove") {
    game.selectedMove = clamp(action.index, 0, leader.moves.length - 1);
    const selected = leader.moves[game.selectedMove];
    announceEvent("技を選択", `${selected.name}　右クリック / Jで発動`, "技", "mystic");
    showToast(`${selected.name}をセット`);
    updateAll();
    return;
  }

  if (action.type === "cycleMove") {
    game.selectedMove = (game.selectedMove + 1) % leader.moves.length;
    updateAll();
    return;
  }

  if (action.type === "face") {
    leader.dx = action.dx;
    leader.dy = action.dy;
    addEffect("face", leader.x, leader.y, leader.color, action.dx, action.dy);
    return;
  }

  game.swappedAllyId = null;
  let acted = false;
  if (action.type === "move") acted = tryMoveLeader(action.dx, action.dy);
  if (action.type === "wait") {
    addLog(`${leader.name}は様子を見た。`);
    acted = true;
  }
  if (action.type === "basicAttack") acted = basicAttack(action.dx, action.dy, action.targetX, action.targetY);
  if (action.type === "useMove") acted = useSelectedMove();
  if (action.type === "eatApple") acted = eatApple();
  if (action.type === "useItem") acted = useItem(action.kind);
  if (action.type === "dropItem") acted = dropItemFromBag(action.kind);

  if (!acted) return;
  finishHeroTurn();
}

function eatApple() {
  return useItem("apple");
}

function tryMoveLeader(dx, dy) {
  const leader = getLeader();
  leader.dx = dx;
  leader.dy = dy;
  const tx = leader.x + dx;
  const ty = leader.y + dy;
  if (!inBounds(tx, ty) || !canTakeStep(leader.x, leader.y, dx, dy)) {
    startBumpMotion(leader, dx, dy);
    return false;
  }

  if (merchantAt(tx, ty)) {
    startBumpMotion(leader, dx, dy, 0.08);
    openGameMenu("merchant");
    return false;
  }

  const restNode = restNodeAt(tx, ty);
  if (restNode) {
    startBumpMotion(leader, dx, dy, 0.08);
    interactRestNode(restNode);
    return false;
  }

  if (game.casino && game.casino.x === tx && game.casino.y === ty) {
    startBumpMotion(leader, dx, dy, 0.08);
    openGameMenu("casino");
    return false;
  }

  const enemy = enemyAt(tx, ty);
  if (enemy) {
    startBumpMotion(leader, dx, dy, 0.16);
    showToast("敵がいる。左クリックかFで攻撃");
    return false;
  }

  const ally = allyAt(tx, ty);
  if (ally) {
    const from = { x: leader.x, y: leader.y };
    const allyFrom = { x: ally.x, y: ally.y };
    leader.x = allyFrom.x;
    leader.y = allyFrom.y;
    ally.x = from.x;
    ally.y = from.y;
    ally.dx = -dx;
    ally.dy = -dy;
    startWalkMotion(leader, from.x, from.y, leader.x, leader.y);
    startWalkMotion(ally, allyFrom.x, allyFrom.y, ally.x, ally.y, 35);
    game.swappedAllyId = ally.id;
    game.leaderTrail.unshift(from);
    game.leaderTrail.length = Math.min(game.leaderTrail.length, Math.max(12, game.team.length + 5));
    addEffect("step", leader.x, leader.y, leader.color);
    addEffect("step", ally.x, ally.y, ally.color);
    resolveStepEffects(leader);
    if (!ally.down) resolveStepEffects(ally);
    if (!leader.down) pickUpItem();
    checkMerchantShopExit(from, leader);
    addLog(`${leader.name}と${ally.name}が場所を入れ替えた。`);
    showToast(`${ally.name}と場所を交代`);
    return true;
  }

  const from = { x: leader.x, y: leader.y };
  leader.x = tx;
  leader.y = ty;
  startWalkMotion(leader, from.x, from.y, tx, ty);
  game.leaderTrail.unshift(from);
  game.leaderTrail.length = Math.min(game.leaderTrail.length, Math.max(12, game.team.length + 5));
  addEffect("step", tx, ty, leader.color);
  resolveStepEffects(leader);
  if (!leader.down) pickUpItem();
  checkMerchantShopExit(from, leader);
  return true;
}

function checkMerchantShopExit(from, to) {
  if (!game.merchant || game.merchant.robbed || merchantDebt() <= 0) return;
  if (isMerchantShopTile(from.x, from.y) && !isMerchantShopTile(to.x, to.y)) {
    triggerMerchantTheft();
  }
}

function basicAttack(dx = 0, dy = 0, targetX = null, targetY = null) {
  const leader = getLeader();
  const hasTargetTile = Number.isInteger(targetX) && Number.isInteger(targetY);
  let attackDx = Math.sign(dx || leader.dx);
  let attackDy = Math.sign(dy || leader.dy);
  if (hasTargetTile) {
    const targetDistance = gridDistance(leader, { x: targetX, y: targetY });
    attackDx = Math.sign(targetX - leader.x);
    attackDy = Math.sign(targetY - leader.y);
    if (targetDistance > 1) {
      if (attackDx || attackDy) {
        leader.dx = attackDx;
        leader.dy = attackDy;
        addEffect("face", leader.x, leader.y, leader.color, attackDx, attackDy);
      }
      showToast("通常攻撃は隣のマスだけ届く");
      addLog("通常攻撃の届くマスではない。向きだけ合わせた。");
      return false;
    }
  }
  if (!attackDx && !attackDy) return false;
  leader.dx = attackDx;
  leader.dy = attackDy;
  game.lastActionStyle = "physical";
  game.currentActionMultiplier = 1;
  game.currentActionElement = leader.elementKey;
  game.runStats.physicalUses += 1;

  const tx = leader.x + attackDx;
  const ty = leader.y + attackDy;
  startBumpMotion(leader, attackDx, attackDy, 0.34);
  const enemy = inBounds(tx, ty) ? enemyAt(tx, ty) : null;
  if (enemy && canTakeStep(leader.x, leader.y, attackDx, attackDy)) {
    actorStrikeEnemy(leader, enemy, `${leader.name}の通常攻撃`);
    setScreenFlash("#f7c86b", 160);
    playSfx("attack");
    return true;
  }

  if (
    game.mission &&
    !game.mission.complete &&
    !game.mission.boss &&
    game.mission.x === tx &&
    game.mission.y === ty
    && canTakeStep(leader.x, leader.y, attackDx, attackDy)
  ) {
    attackMissionClient();
    return true;
  }

  if (inBounds(tx, ty)) addEffect("slash", tx, ty, palette.brass, attackDx, attackDy);
  addLog(`${leader.name}の通常攻撃。しかし当たらなかった。`);
  announceEvent("通常攻撃", "しかし、攻撃は空を切った", "斬", "mystic", leader);
  playSfx("miss");
  return true;
}

function attackMissionClient() {
  const mission = game.mission;
  if (!mission.threatened) {
    mission.threatened = true;
    addEffect("hit", mission.x, mission.y, "#ff6d61");
    addLog(`${mission.target}へ刃を向けた。もう一度攻撃すれば、取り返しがつかない。`);
    announceEvent("警告", "依頼人への攻撃はカルマを生む", "!", "danger");
    setScreenFlash("#ff6d61", 380);
    triggerScreenShake(7, 220);
    playSfx("warning");
    return;
  }

  mission.complete = true;
  mission.clientKilled = true;
  game.karma += 3;
  game.runStats.clientsKilled += 1;
  game.score = Math.max(0, game.score - 100);
  addEffect("burst", mission.x, mission.y, "#8f58c7");
  addFloatingText(mission.x, mission.y, "KARMA +3", "#dca2ff");
  addLog(`${mission.target}を倒した。カルマ +3。階段は禍々しい光とともに開いた。`);
  announceEvent("禁じられた選択", `カルマ ${game.karma}　宵影の牙が残った`, "影", "danger");
  dropEvolutionMaterial("shadowFang", mission.x, mission.y, true);
  setScreenFlash("#7b3fac", 650);
  triggerScreenShake(15, 430);
  playSfx("karma");
}

function useSelectedMove() {
  const leader = getLeader();
  const move = leader.moves[game.selectedMove];
  if (!move || move.pp <= 0) {
    showToast("その技はもう使えない");
    return false;
  }

  const previousStyle = game.lastActionStyle;
  const previousElement = game.lastMoveElement;
  const alternated = hasRelic("prismCore") && previousStyle && previousStyle !== move.style;
  const elementCombo = elementComboBonus(previousElement, move.element);
  const previousCycleElement = game.relicFloorState.triadElement || null;
  const cycleNext = { fire: "wood", wood: "water", water: "fire" };
  const triadBoost = hasRelic("triadCompass")
    && previousCycleElement
    && cycleNext[previousCycleElement] === move.element;
  const karmaBoost = hasRelic("karmaBrand") && ["dark", "evil"].includes(move.element)
    ? Math.min(0.6, game.karma * 0.06)
    : 0;
  const emptyBagBoost = hasRelic("emptySatchel") && game.bagCapacity - bagTotal() >= 10;
  const moveShape = moveAimShape(move);
  const linePower = hasRelic("lineSigil") && ["line", "beam"].includes(moveShape.kind);
  const burstPower = hasRelic("burstBloom") && moveShape.kind === "burst";
  const openingPower = hasRelic("openingCharm") && game.turn < 18;
  const theftPower = hasRelic("thiefRibbon") && game.runStats.thefts > 0;
  const relicElementBoost = relicElementModifier("elementPower", move.element);
  const passiveBoost = characterMovePassive(leader, move, previousElement, previousStyle);
  const echoed = move.style === "magic" && hasSkill("spellEcho") && Math.random() < 0.24;
  const freeCast = move.style === "magic" && hasRelic("arcaneVein") && Math.random() < 0.28;
  game.lastActionStyle = move.style;
  game.currentActionMultiplier = (alternated ? 1.35 : 1)
    * (elementCombo ? 1 + elementCombo.power : 1)
    * (triadBoost ? 1.45 : 1)
    * (karmaBoost ? 1 + karmaBoost : 1)
    * (emptyBagBoost ? 1.2 : 1)
    * (linePower ? 1.18 : 1)
    * (burstPower ? 1.18 : 1)
    * (openingPower ? 1.2 : 1)
    * (theftPower ? 1.25 : 1)
    * (1 + relicElementBoost)
    * (passiveBoost.multiplier || 1)
    * (1 + (move.powerBonus || 0))
    * (echoed ? 1.55 : 1)
    * (move.style === "physical" && hasSkill("shell") ? 1.12 : 1);
  game.currentActionElement = move.element;
  game.runStats[move.style === "magic" ? "magicUses" : "physicalUses"] += 1;
  const bonusNotes = [
    alternated ? "七彩共鳴" : "",
    elementCombo ? `${elementCombo.name} +${Math.round(elementCombo.power * 100)}%` : "",
    triadBoost ? "三相連鎖" : "",
    karmaBoost ? `咎星 +${Math.round(karmaBoost * 100)}%` : "",
    emptyBagBoost ? "空袋" : "",
    linePower ? "一直線 +18%" : "",
    burstPower ? "円花 +18%" : "",
    openingPower ? "開幕 +20%" : "",
    theftPower ? "盗星 +25%" : "",
    relicElementBoost ? `属性遺物 +${Math.round(relicElementBoost * 100)}%` : "",
    passiveBoost.note || "",
    move.powerBonus ? `技強化 +${Math.round(move.powerBonus * 100)}%` : "",
    echoed ? "術式残響" : "",
  ].filter(Boolean).join("　");
  announceEvent(
    move.name,
    `【${elementInfo(move.element).name}】${move.hint}　PP ${move.pp - (freeCast ? 0 : 1)}/${move.maxPp}${bonusNotes ? `　${bonusNotes}` : ""}`,
    elementInfo(move.element).symbol,
    "mystic",
  );
  setScreenFlash(leader.color, 220);
  if (!freeCast) move.pp -= 1;
  game.runStats.techniques += 1;
  gainExp(2 + Math.floor(game.floor / 20));
  if (freeCast) addFloatingText(leader.x, leader.y, "PP 0", "#8ee7ff");
  if (passiveBoost.heal) {
    healActor(leader, passiveBoost.heal);
    addFloatingText(leader.x, leader.y, `${passiveBoost.name} +HP`, leader.color);
  }
  if (burstPower) {
    healActor(leader, 2);
    addFloatingText(leader.x, leader.y, "円花 +HP", "#9ee6b9");
  }
  if (!freeCast && passiveBoost.ppRefund && Math.random() < passiveBoost.ppRefund) {
    move.pp = Math.min(move.maxPp, move.pp + 1);
    addFloatingText(leader.x, leader.y, `${passiveBoost.name} PP+1`, "#8ee7ff");
  }
  if (triadBoost) {
    healActor(leader, 3);
    addFloatingText(leader.x, leader.y, "三相 +HP", "#9ee6b9");
  }
  if (elementCombo?.heal) {
    healActor(leader, elementCombo.heal);
    addFloatingText(leader.x, leader.y, `${elementCombo.name} +HP`, elementCombo.color);
  }
  if (elementCombo) game.runStats.elementCombos += 1;
  if (alternated || elementCombo || triadBoost || karmaBoost || emptyBagBoost || linePower || burstPower || openingPower || theftPower || echoed) {
    addEffect("runes", leader.x, leader.y, elementCombo?.color || (triadBoost ? "#9ee6b9" : karmaBoost ? "#c68cff" : alternated ? "#ffe27d" : "#bba4ff"));
    triggerScreenShake(alternated ? 7 : 5, 220);
  }
  game.relicFloorState.triadElement = ["fire", "wood", "water"].includes(move.element) ? move.element : null;
  game.lastMoveElement = move.element;
  markActorAction(leader, 420);
  playSfx("move");
  let used = false;
  if (move.key === "spark") used = useSpark(leader, move);
  if (move.key === "gust") used = useGust(leader, move);
  if (move.key === "heal") used = useHeal(leader, move);
  if (move.key === "guard") used = useGuard(leader, move);
  if (move.key === "ironSlash") used = useIronSlash(leader, move);
  if (move.key === "shieldCrash") used = useShieldCrash(leader, move);
  if (move.key === "kingsGuard") used = useKingsGuard(leader, move);
  if (move.key === "lionRoar") used = useLionRoar(leader, move);
  if (move.key === "arcBolt") used = useArcBolt(leader, move);
  if (move.key === "blinkHex") used = useBlinkHex(leader, move);
  if (move.key === "mirrorCurse") used = useMirrorCurse(leader, move);
  if (move.key === "timeLoop") used = useTimeLoop(leader, move);
  if (!used && String(move.key).startsWith("asc-")) used = useAscensionMove(leader, move);
  game.currentActionMultiplier = 1;
  game.currentActionElement = null;
  return used;
}

function characterMovePassive(actor, move, previousElement, previousStyle) {
  const passive = characterPassiveInfo(actor.profileKey);
  if (actor.profileKey === "kohaku" && previousElement && previousElement !== move.element) {
    return { name: passive.name, multiplier: 1.1, heal: 1, note: `${passive.name} +10%` };
  }
  if (actor.profileKey === "knight" && move.style === "physical") {
    return { name: passive.name, multiplier: actor.guardTurns > 0 ? 1.2 : 1.12, note: `${passive.name} +${actor.guardTurns > 0 ? 20 : 12}%` };
  }
  if (actor.profileKey === "magician" && move.style === "magic") {
    return { name: passive.name, multiplier: 1.12, ppRefund: 0.22, note: `${passive.name} +12%` };
  }
  if (previousStyle && actor.profileKey === "kohaku" && previousStyle !== move.style) {
    return { name: passive.name, multiplier: 1.06, note: `${passive.name} +6%` };
  }
  return { name: passive.name, multiplier: 1 };
}

function useSpark(actor, move) {
  const ray = [];
  for (let i = 1; i <= 4; i += 1) {
    const x = actor.x + actor.dx * i;
    const y = actor.y + actor.dy * i;
    if (!inBounds(x, y) || !isWalkable(x, y)) break;
    ray.push({ x, y });
  }

  const target = ray.map((point) => enemyAt(point.x, point.y)).find(Boolean);
  addEffect("beam", actor.x, actor.y, actor.color, actor.dx, actor.dy);
  addEffect("runes", actor.x, actor.y, "#bcefff");
  for (const point of ray) {
    addEffect("sparkTrail", point.x, point.y, "#69eaff", actor.dx, actor.dy);
  }
  if (!target) {
    addLog(`${move.name}を放ったが、敵には届かなかった。`);
    return true;
  }
  const power = Math.ceil((actor.magic + 8 + actor.level) * game.currentActionMultiplier);
  damageEnemy(target, power, actor, move.name);
  addEffect("nova", target.x, target.y, actor.color);
  addEffect("impact", target.x, target.y, "#ffffff");
  triggerScreenShake(8, 230);
  return true;
}

function useGust(actor, move) {
  const targets = game.enemies.filter((enemy) => gridDistance(actor, enemy) <= 1);
  addEffect("vortex", actor.x, actor.y, actor.color);
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if ((!dx && !dy) || !inBounds(actor.x + dx, actor.y + dy)) continue;
      addEffect("gustTile", actor.x + dx, actor.y + dy, "#8eeaff", dx, dy);
    }
  }
  if (!targets.length) {
    addLog(`${move.name}が周囲のほこりを巻き上げた。`);
    return true;
  }
  for (const enemy of targets) {
    damageEnemy(enemy, Math.ceil((actor.atk + 5) * game.currentActionMultiplier), actor, move.name);
    pushEnemy(enemy, Math.sign(enemy.x - actor.x), Math.sign(enemy.y - actor.y));
  }
  return true;
}

function useHeal(actor, move) {
  const total = healActor(actor, Math.ceil((12 + actor.level * 2 + actor.magic) * game.currentActionMultiplier));
  addEffect("runes", actor.x, actor.y, actor.color);
  addEffect("heal", actor.x, actor.y, "#bffff1");
  addEffect("healBurst", actor.x, actor.y, "#7dffd0");
  addLog(`${move.name}。HPを${total}回復した。`);
  return true;
}

function useGuard(actor, move) {
  actor.guardTurns = 3;
  addEffect("shield", actor.x, actor.y, "#8dcbd9");
  addEffect("guardDome", actor.x, actor.y, "#80dfff");
  addLog(`${move.name}。3ターンの間、受けるダメージを半減する。`);
  return true;
}

function useIronSlash(actor, move) {
  let target = null;
  for (let distance = 1; distance <= 2; distance += 1) {
    const x = actor.x + actor.dx * distance;
    const y = actor.y + actor.dy * distance;
    if (!inBounds(x, y) || !isWalkable(x, y)) break;
    addEffect("slash", x, y, "#ffb061", actor.dx, actor.dy);
    target ||= enemyAt(x, y);
  }
  addEffect("impact", actor.x + actor.dx, actor.y + actor.dy, "#fff1b5");
  triggerScreenShake(10, 260);
  if (target) damageEnemy(target, Math.ceil((actor.atk * 1.75 + actor.level) * game.currentActionMultiplier), actor, move.name);
  else addLog(`${move.name}は石床を深く裂いた。`);
  return true;
}

function useShieldCrash(actor, move) {
  const target = enemyAt(actor.x + actor.dx, actor.y + actor.dy);
  addEffect("guardDome", actor.x, actor.y, "#efc86b");
  addEffect("impact", actor.x + actor.dx, actor.y + actor.dy, "#ffd36b");
  triggerScreenShake(12, 300);
  if (target) {
    damageEnemy(target, Math.ceil((actor.atk + actor.def * 2 + 5) * game.currentActionMultiplier), actor, move.name);
    target.def = Math.max(0, target.def - 2);
    addFloatingText(target.x, target.y, "DEF DOWN", "#ffd17b");
  } else {
    addLog(`${move.name}は空を押し返した。`);
  }
  return true;
}

function useKingsGuard(actor, move) {
  actor.guardTurns = 4;
  healActor(actor, 6 + actor.def * 2);
  addEffect("shield", actor.x, actor.y, "#f0d487");
  addEffect("guardDome", actor.x, actor.y, "#6fa5dd");
  addLog(`${move.name}。4ターン被害を半減し、傷を少し癒やした。`);
  return true;
}

function useLionRoar(actor, move) {
  const targets = game.enemies.filter((enemy) => gridDistance(actor, enemy) <= 2 && hasLineOfSight(actor, enemy));
  addEffect("vortex", actor.x, actor.y, "#efb958");
  addEffect("nova", actor.x, actor.y, "#fff0a4");
  for (const enemy of targets) {
    damageEnemy(enemy, Math.ceil((actor.atk + 4) * game.currentActionMultiplier), actor, move.name);
    enemy.sleepTurns = Math.max(enemy.sleepTurns || 0, 1);
    addFloatingText(enemy.x, enemy.y, "ひるみ", "#ffe08a");
  }
  triggerScreenShake(14, 380);
  if (!targets.length) addLog(`${move.name}が塔じゅうに響いた。`);
  return true;
}

function useArcBolt(actor, move) {
  const targets = [];
  for (let distance = 1; distance <= 6; distance += 1) {
    const x = actor.x + actor.dx * distance;
    const y = actor.y + actor.dy * distance;
    if (!inBounds(x, y) || !isWalkable(x, y)) break;
    addEffect("sparkTrail", x, y, "#78dfff", actor.dx, actor.dy);
    const target = enemyAt(x, y);
    if (target) targets.push(target);
  }
  addEffect("beam", actor.x, actor.y, "#99eaff", actor.dx, actor.dy);
  addEffect("runes", actor.x, actor.y, "#d8f7ff");
  targets.forEach((target, index) => {
    damageEnemy(target, Math.ceil((actor.magic + 8 - index * 2) * game.currentActionMultiplier), actor, move.name);
    addEffect("nova", target.x, target.y, "#6ddfff");
  });
  if (!targets.length) addLog(`${move.name}は塔の闇を一直線に照らした。`);
  return true;
}

function useBlinkHex(actor, move) {
  const from = { x: actor.x, y: actor.y };
  let destination = from;
  for (let distance = 1; distance <= 3; distance += 1) {
    const x = actor.x + actor.dx * distance;
    const y = actor.y + actor.dy * distance;
    if (!inBounds(x, y) || !isWalkable(x, y) || actorAt(x, y) || enemyAt(x, y)) break;
    destination = { x, y };
  }
  addEffect("runes", from.x, from.y, "#a78bff");
  actor.x = destination.x;
  actor.y = destination.y;
  addEffect("runes", actor.x, actor.y, "#7ce9ff");
  addEffect("vortex", actor.x, actor.y, "#b06cff");
  for (const enemy of game.enemies.filter((entry) => gridDistance(actor, entry) <= 1)) {
    damageEnemy(enemy, Math.ceil((actor.magic + 5) * game.currentActionMultiplier), actor, move.name);
  }
  if (actor.id === "leader") checkMerchantShopExit(from, actor);
  addLog(destination === from ? `${move.name}は壁に阻まれた。` : `${move.name}で${destination.x + 1},${destination.y + 1}へ転位した。`);
  revealAroundTeam();
  return true;
}

function useMirrorCurse(actor, move) {
  const targets = game.enemies.filter((enemy) => gridDistance(actor, enemy) <= 2 && hasLineOfSight(actor, enemy));
  addEffect("runes", actor.x, actor.y, "#e0a0ff");
  for (const enemy of targets) {
    enemy.atk = Math.max(1, enemy.atk - 2);
    damageEnemy(enemy, Math.ceil((actor.magic * 0.8 + 4) * game.currentActionMultiplier), actor, move.name);
    addEffect("vortex", enemy.x, enemy.y, "#9d6ae5");
    addFloatingText(enemy.x, enemy.y, "ATK DOWN", "#d7a9ff");
  }
  if (!targets.length) addLog(`${move.name}を展開したが、映す敵はいなかった。`);
  return true;
}

function useTimeLoop(actor, move) {
  const anchor = actor.timeAnchor;
  let restoredPp = 0;
  if (anchor) {
    actor.hp = clamp(anchor.hp, 1, actor.maxHp);
    for (const current of actor.moves) {
      if (current.key === move.key) continue;
      const previous = anchor.moves.find((entry) => entry.key === current.key);
      const before = current.pp;
      const targetPp = previous ? previous.pp : current.maxPp;
      current.pp = Math.max(current.pp, Math.min(current.maxPp, targetPp));
      restoredPp += current.pp - before;
    }
  } else {
    actor.hp = Math.min(actor.maxHp, actor.hp + Math.ceil(actor.maxHp * 0.35));
  }
  addEffect("runes", actor.x, actor.y, "#f8c8ff");
  addEffect("healBurst", actor.x, actor.y, "#90dfff");
  if (restoredPp > 0) addFloatingText(actor.x, actor.y, `PP +${restoredPp}`, "#90dfff");
  setScreenFlash("#a58cff", 320);
  addLog(`${move.name}。フロア開始時の生命と術式を呼び戻し、技PPを${restoredPp}回復した。`);
  return true;
}

function useAscensionMove(actor, move) {
  const color = elementInfo(move.element).color;
  const stat = move.style === "magic" ? actor.magic : actor.atk;
  const power = Math.ceil((stat + actor.level + move.power) * game.currentActionMultiplier);
  if (move.signature === "line" || move.signature === "beam") {
    const targets = [];
    for (let distance = 1; distance <= (move.range || 4); distance += 1) {
      const x = actor.x + actor.dx * distance;
      const y = actor.y + actor.dy * distance;
      if (!inBounds(x, y) || !isWalkable(x, y)) break;
      addEffect(move.signature === "beam" ? "sparkTrail" : "slash", x, y, color, actor.dx, actor.dy);
      const target = enemyAt(x, y);
      if (target && !targets.includes(target)) targets.push(target);
      if (target && move.signature === "line") break;
    }
    addEffect(move.signature === "beam" ? "beam" : "impact", actor.x + actor.dx, actor.y + actor.dy, color, actor.dx, actor.dy);
    targets.forEach((target, index) => {
      damageEnemy(target, Math.max(1, power - index * 3), actor, move.name);
      addEffect("nova", target.x, target.y, color);
    });
    triggerScreenShake(targets.length ? 12 : 6, 260);
    if (!targets.length) addLog(`${move.name}は床に光跡を残した。`);
    return true;
  }

  if (move.signature === "guard") {
    actor.guardTurns = Math.max(actor.guardTurns || 0, 2 + Math.floor((move.stage || 1) / 3));
    healActor(actor, Math.ceil((actor.def + actor.res + move.stage) * 0.8));
    addEffect("shield", actor.x, actor.y, color);
    addEffect("guardDome", actor.x, actor.y, color);
    for (const enemy of game.enemies.filter((entry) => gridDistance(actor, entry) <= 1)) {
      damageEnemy(enemy, Math.ceil(power * 0.65), actor, move.name);
      pushEnemy(enemy, Math.sign(enemy.x - actor.x), Math.sign(enemy.y - actor.y));
    }
    addLog(`${move.name}。守りを固め、近くの敵を押し返した。`);
    triggerScreenShake(10, 260);
    return true;
  }

  if (move.signature === "trick") {
    let destination = { x: actor.x, y: actor.y };
    for (let distance = 1; distance <= Math.min(4, move.range || 4); distance += 1) {
      const x = actor.x + actor.dx * distance;
      const y = actor.y + actor.dy * distance;
      if (!inBounds(x, y) || !isWalkable(x, y) || actorAt(x, y) || enemyAt(x, y)) break;
      destination = { x, y };
    }
    const from = { x: actor.x, y: actor.y };
    actor.x = destination.x;
    actor.y = destination.y;
    addEffect("runes", from.x, from.y, color);
    addEffect("vortex", actor.x, actor.y, color);
    for (const enemy of game.enemies.filter((entry) => gridDistance(actor, entry) <= (move.radius || 2) && hasLineOfSight(actor, entry))) {
      enemy.atk = Math.max(1, enemy.atk - 1);
      damageEnemy(enemy, Math.ceil(power * 0.72), actor, move.name);
      addFloatingText(enemy.x, enemy.y, "乱れ", color);
    }
    if (actor.id === "leader") checkMerchantShopExit(from, actor);
    revealAroundTeam();
    triggerScreenShake(8, 230);
    return true;
  }

  addEffect("nova", actor.x, actor.y, color);
  addEffect("runes", actor.x, actor.y, color);
  for (const enemy of game.enemies.filter((entry) => gridDistance(actor, entry) <= (move.radius || 2) && hasLineOfSight(actor, entry))) {
    damageEnemy(enemy, Math.ceil(power * 0.78), actor, move.name);
    addEffect("impact", enemy.x, enemy.y, color);
  }
  triggerScreenShake(13, 320);
  return true;
}

function hasLineOfSight(from, to) {
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  if (!steps) return true;
  for (let index = 1; index < steps; index += 1) {
    const x = Math.round(from.x + ((to.x - from.x) * index) / steps);
    const y = Math.round(from.y + ((to.y - from.y) * index) / steps);
    if (!isWalkable(x, y)) return false;
  }
  return true;
}

function finishHeroTurn() {
  checkMission();
  if (tryUseStairs()) return;
  resolveWorldTurn();
}

function resolveWorldTurn() {
  if (getLeader().down) {
    checkGameOver();
    updateAll();
    return;
  }
  enemyTurn();
  game.currentActionElement = null;
  tickHunger();
  if (game.focusTurns > 0) game.focusTurns -= 1;
  if (getLeader().guardTurns > 0) getLeader().guardTurns -= 1;
  game.turn += 1;
  if (applyTowerWind()) {
    updateAll();
    return;
  }
  revealAroundTeam();
  checkGameOver();
  updateAll();
  if (game.pendingLevelUps.length && !game.gameOver) {
    scheduleLevelUpDialog();
  } else if (game.pendingMovePicks > 0 && game.pendingMoveChoices.length && !game.gameOver) {
    window.setTimeout(openMoveReward, 80);
  } else if (game.rewardPending && !game.gameOver) {
    window.setTimeout(openRelicReward, 80);
  }
}

function applyTowerWind() {
  if (game.floorKind.includes("rest") || game.gameOver || game.victory) return false;
  if (game.turn >= FLOOR_WIND_WARNING && !game.windWarningShown) {
    game.windWarningShown = true;
    announceEvent("塔風が吹き始めた", `あと${FLOOR_WIND_LIMIT - game.turn}ターンで、この階から弾き出される`, "風", "danger");
    addLog("塔の奥から不吉な風が吹く。長居はできない。");
    setScreenFlash("#d6b7ff", 500);
    playSfx("warning");
  }
  if (game.turn >= FLOOR_WIND_DANGER && !game.windDangerShown) {
    game.windDangerShown = true;
    announceEvent("塔風・侵食", "風がHPを削り、敵を呼び寄せる。すぐに階段へ。", "風", "danger");
    addLog("塔風が侵食へ変わった。3ターンごとにHPを失う。");
    triggerScreenShake(12, 420);
  }
  if (game.turn >= FLOOR_WIND_WARNING && game.turn % 8 === 0 && game.enemies.length < 30) {
    const point = randomEnemySpawnTile(8);
    if (point) {
      const hunter = createEnemy(randomEnemyProfile(), point, true);
      hunter.name = `塔風に追われた${hunter.name}`;
      hunter.atk += 2;
      game.enemies.push(hunter);
      addEffect("vortex", point.x, point.y, "#b99cff");
      addLog("塔風に押され、新たな敵が現れた。");
    }
  }
  if (game.turn >= FLOOR_WIND_DANGER && game.turn % 3 === 0) {
    const leader = getLeader();
    const damage = Math.max(2, Math.ceil(leader.maxHp * 0.06));
    game.lastDamageSource = {
      kind: "wind",
      name: "塔風",
      label: "塔風の侵食",
      detail: `${damage}ダメージ`,
    };
    leader.hp = Math.max(0, leader.hp - damage);
    addEffect("vortex", leader.x, leader.y, "#ad8ae8");
    addFloatingText(leader.x, leader.y, `-${damage}`, "#d6b7ff");
    addLog(`塔風の侵食。${leader.name}は${damage}ダメージを受けた。`);
    triggerScreenShake(8, 260);
    if (leader.hp <= 0 && !tryReviveActor(leader)) leader.down = true;
  }
  if (game.turn < FLOOR_WIND_LIMIT) return false;
  failFromTowerWind();
  return true;
}

function createRunSummary(title, text) {
  const leader = getLeader();
  const source = game.lastDamageSource || {};
  const routeNames = Object.values(game.routePlan || {})
    .map((key) => routeCatalog.find((route) => route.key === key)?.name)
    .filter(Boolean);
  const relicNames = (game.relics || [])
    .map((key) => relicCatalog.find((relic) => relic.key === key)?.name)
    .filter(Boolean);
  const physicalLead = game.runStats.physicalUses - game.runStats.magicUses;
  const buildName = physicalLead >= 8 ? "物理型" : physicalLead <= -8 ? "魔法型" : "均衡型";
  return {
    title,
    text,
    floor: game.floor,
    turn: game.turn,
    score: game.score,
    level: leader.level,
    hp: leader.hp,
    maxHp: leader.maxHp,
    evolutionName: leader.evolutionName || leader.name,
    buildName,
    cause: source.label || source.name || "不明",
    causeDetail: source.detail || "",
    relicNames,
    routeNames,
    stats: { ...game.runStats },
    advice: runAdvice(source, buildName),
  };
}

function runAdvice(source, buildName) {
  if (source?.kind === "wind") return "同じ階に長居しすぎると塔風が強まる。探索を切り上げる基準を早めると安定する。";
  if (source?.kind === "boss") return "門番戦は作戦が固定されている。図鑑で属性と特殊行動を見て、技属性と星遺物を合わせよう。";
  if (source?.kind === "ranged") return "遠距離攻撃は射線を切ると止まる。通路の角、斜め移動、避雷の凧が有効。";
  if (buildName === "物理型") return "物理寄りなら接近前の被弾が課題。防御系の星遺物か回復道具を厚めに持つとよい。";
  if (buildName === "魔法型") return "魔法寄りならPP管理が重要。休憩所までの消費技数と、PP回復道具を意識しよう。";
  return "均衡型は状況対応が強み。属性コンボとレリックの条件を意識すると火力が伸びる。";
}

function runSummaryMarkup(summary, label = "冒険結果") {
  const relicText = summary.relicNames?.length ? summary.relicNames.join(" / ") : "なし";
  const routeText = summary.routeNames?.length ? summary.routeNames.join(" → ") : "未選択";
  return `
    <section class="run-summary-card">
      <span>${label}</span>
      <strong>B${summary.floor}F / Lv.${summary.level} / ${summary.buildName}</strong>
      <small>${summary.cause}${summary.causeDetail ? `　${summary.causeDetail}` : ""}</small>
      <div>
        <b>撃破 ${summary.stats?.kills || 0}</b>
        <b>技 ${summary.stats?.techniques || 0}</b>
        <b>コンボ ${summary.stats?.elementCombos || 0}</b>
        <b>変異 ${summary.stats?.mutants || 0}</b>
      </div>
      <em>星遺物: ${relicText}</em>
      <em>ルート: ${routeText}</em>
      <p>${summary.advice}</p>
    </section>
  `;
}

function resetToNewGameAfterFailure(title, text, buttonText = "ニューゲームへ") {
  const slot = game.saveSlot || 1;
  const summary = createRunSummary(title, text);
  const seenEnemyKeys = [...(game.seenEnemyKeys || [])];
  const defeatedEnemyKeys = [...(game.defeatedEnemyKeys || [])];
  saveBestScore();
  startFreshGame(slot);
  game.lastRunSummary = summary;
  game.seenEnemyKeys = seenEnemyKeys;
  game.defeatedEnemyKeys = defeatedEnemyKeys;
  saveCurrentGame(true);
  game.gameOver = true;
  ui.endTitle.textContent = title;
  ui.endText.innerHTML = `${text}${runSummaryMarkup(summary)}`;
  ui.endRestartButton.textContent = buttonText;
  ui.endOverlay.hidden = false;
}

function failFromTowerWind() {
  const floor = game.floor;
  const leader = getLeader();
  game.lastDamageSource = {
    kind: "wind",
    name: "塔風",
    label: "長居による塔風",
    detail: `${FLOOR_WIND_LIMIT}ターン到達`,
  };
  leader.hp = 0;
  leader.down = true;
  announceEvent("TIME OVER", `同じ階には${FLOOR_WIND_LIMIT}ターンまでしか留まれない`, "風", "danger");
  setScreenFlash("#b48cff", 900);
  triggerScreenShake(20, 700);
  playSfx("karma");
  resetToNewGameAfterFailure(
    "塔風に弾き出された",
    `B${floor}Fに留まりすぎた。死亡扱いとなり、次は完全なニューゲームから始まる。`,
  );
}

function companionTurns() {
  const leader = getLeader();
  for (let index = 1; index < game.team.length; index += 1) {
    const ally = game.team[index];
    if (ally.id === leader.id || ally.down) continue;
    if (ally.id === game.swappedAllyId) continue;
    const tactic = ally.tactic || "together";
    const adjacent = adjacentEnemies(ally)[0];

    if (tactic === "avoid") {
      const threat = nearestEnemy(ally, (enemy) => distance(ally, enemy) <= 5 && isVisible(enemy.x, enemy.y));
      if (threat && moveActorAway(ally, threat, index * 45)) continue;
    }

    if (adjacent && tactic !== "avoid") {
      startBumpMotion(ally, Math.sign(adjacent.x - ally.x), Math.sign(adjacent.y - ally.y), 0.32, index * 45);
      actorStrikeEnemy(ally, adjacent, `${ally.name}の援護`);
      continue;
    }

    if (tactic === "wait") continue;

    if (tactic === "hunt") {
      const target = nearestEnemy(ally, (enemy) => distance(ally, enemy) <= 10 && isVisible(enemy.x, enemy.y));
      if (target && moveActorToward(ally, target, true, index * 45)) continue;
    }

    if (tactic === "explore") {
      const target = nearestUnmappedTile(ally);
      if (target && moveActorToward(ally, target, false, index * 45)) continue;
    }

    if (tactic === "avoid" && nearestEnemy(ally, (enemy) => distance(ally, enemy) <= 5)) {
      continue;
    }

    const trailTarget = game.leaderTrail[Math.min(index - 1, game.leaderTrail.length - 1)];
    if (trailTarget && gridDistance(ally, trailTarget) > 0) {
      moveActorToward(ally, trailTarget, false, index * 45);
      continue;
    }

    if (gridDistance(ally, leader) > 1) {
      moveActorToward(ally, leader, false, index * 45);
    }
  }
  game.swappedAllyId = null;
}

function moveActorAway(actor, threat, delay = 0) {
  const candidates = dirs
    .map((dir) => ({ dir, x: actor.x + dir.x, y: actor.y + dir.y }))
    .filter((point) => (
      canTakeStep(actor.x, actor.y, point.dir.x, point.dir.y) &&
      !actorAt(point.x, point.y) &&
      !enemyAt(point.x, point.y)
    ))
    .sort((a, b) => {
      const aSafety = gridDistance(a, threat) * 5 - gridDistance(a, getLeader());
      const bSafety = gridDistance(b, threat) * 5 - gridDistance(b, getLeader());
      return bSafety - aSafety;
    });
  const next = candidates[0];
  if (!next || gridDistance(next, threat) <= gridDistance(actor, threat)) return false;
  const from = { x: actor.x, y: actor.y };
  actor.dx = next.dir.x;
  actor.dy = next.dir.y;
  actor.x = next.x;
  actor.y = next.y;
  startWalkMotion(actor, from.x, from.y, next.x, next.y, delay);
  applyStepTerrain(actor);
  return true;
}

function nearestUnmappedTile(actor) {
  const queue = [{ x: actor.x, y: actor.y }];
  const visited = makeGrid(false);
  visited[actor.y][actor.x] = true;
  while (queue.length) {
    const current = queue.shift();
    if (!game.mapped[current.y][current.x] && isWalkable(current.x, current.y)) return current;
    for (const dir of dirs) {
      const x = current.x + dir.x;
      const y = current.y + dir.y;
      if (!inBounds(x, y) || visited[y][x] || !canTakeStep(current.x, current.y, dir.x, dir.y)) continue;
      if (merchantAt(x, y)) continue;
      visited[y][x] = true;
      queue.push({ x, y });
    }
  }
  return null;
}

function enemyTurn() {
  const enemies = [...game.enemies];
  for (const enemy of enemies) {
    if (!game.enemies.includes(enemy)) continue;
    if ((enemy.sleepTurns || 0) > 0) {
      enemy.sleepTurns -= 1;
      if (enemy.sleepTurns === 0 && isVisible(enemy.x, enemy.y)) addLog(`${enemy.name}は目を覚ました。`);
      continue;
    }
    const target = nearestLivingAlly(enemy);
    if (!target) continue;

    if (applyEnemyAbility(enemy, target)) continue;

    if (enemy.boss) {
      enemy.specialCooldown = Math.max(0, (enemy.specialCooldown || 0) - 1);
      if (
        enemy.specialCooldown === 0 &&
        gridDistance(enemy, target) <= 5 &&
        hasClearAttackPath(enemy, target)
      ) {
        bossSpecialAttack(enemy, target);
        enemy.specialCooldown = randInt(3, 5);
        continue;
      }
    }

    const seesTarget = enemyCanSeeTarget(enemy, target);
    const rangedRange = enemyRangedRange(enemy);
    if (
      rangedRange > 0 &&
      gridDistance(enemy, target) <= rangedRange &&
      seesTarget
    ) {
      enemyAttack(enemy, target, true);
      continue;
    }

    if (gridDistance(enemy, target) === 1 && hasClearAttackPath(enemy, target)) {
      startBumpMotion(enemy, Math.sign(target.x - enemy.x), Math.sign(target.y - enemy.y), 0.3, 70);
      enemyAttack(enemy, target);
      continue;
    }

    if (seesTarget) enemy.alerted = true;
    if (enemy.alerted) {
      enemy.alerted = true;
      const moved = moveEnemyToward(enemy, target);
      if (moved && enemy.mutation?.swift && Math.random() < 0.45 && gridDistance(enemy, target) > 1) {
        moveEnemyToward(enemy, target);
      }
    } else {
      enemyWander(enemy);
    }
  }

  const reinforcementTurn = game.floorEvent?.reinforcement || 16;
  if (game.turn > 1 && game.turn % reinforcementTurn === 0 && game.enemies.length < 26) {
    const catalog = randomEnemyProfile();
    const point = randomEnemySpawnTile(8);
    if (point) {
      game.enemies.push(createEnemy(catalog, point, false));
      addLog("遠くから敵の気配が近づいてきた。");
    }
  }
}

function applyEnemyAbility(enemy, target) {
  enemy.abilityCooldown = Math.max(0, (enemy.abilityCooldown || 0) - 1);
  if (!enemy.ability || enemy.abilityCooldown > 0) return false;
  const seesTarget = enemyCanSeeTarget(enemy, target);
  if (enemy.ability === "bomb") {
    if (enemy.chargingBomb && gridDistance(enemy, target) <= 2 && hasClearAttackPath(enemy, target)) {
      enemy.chargingBomb = false;
      enemy.abilityCooldown = 5;
      explodeEnemyBomb(enemy, target);
      return true;
    }
    if (seesTarget && gridDistance(enemy, target) <= 3) {
      enemy.chargingBomb = true;
      enemy.abilityCooldown = 1;
      enemy.alerted = true;
      addEffect("runes", enemy.x, enemy.y, "#ff9d5d");
      addFloatingText(enemy.x, enemy.y, "溜め", "#ffcf6e");
      addLog(`${enemy.name}が爆発技を溜めはじめた。離れよう。`);
      return true;
    }
  }
  if (enemy.ability === "heal") {
    const wounded = game.enemies
      .filter((ally) => ally.id !== enemy.id && gridDistance(enemy, ally) <= 3 && ally.hp < ally.maxHp * 0.7)
      .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
    if (wounded && isVisible(enemy.x, enemy.y)) {
      const healed = Math.min(wounded.maxHp - wounded.hp, 7 + Math.floor(game.floor / 12));
      wounded.hp += healed;
      enemy.abilityCooldown = 4;
      addTargetedEffect("beam", enemy.x, enemy.y, wounded.x, wounded.y, "#9ee88c", 540);
      addFloatingText(wounded.x, wounded.y, `+${healed}`, "#9ee88c");
      addLog(`${enemy.name}が${wounded.name}を回復した。`);
      return true;
    }
  }
  if (enemy.ability === "steal" && gridDistance(enemy, target) === 1 && target.id === "leader") {
    const stolen = stealSmallItemOrCoins(enemy);
    if (stolen) {
      enemy.abilityCooldown = 6;
      return true;
    }
  }
  if (enemy.ability === "summon" && seesTarget && game.enemies.length < 24 && Math.random() < 0.35) {
    const point = randomEnemySpawnTile(5);
    if (point) {
      const minion = createEnemy(randomEnemyProfile(), point, true);
      minion.name = `呼ばれた${minion.name}`;
      game.enemies.push(minion);
      enemy.abilityCooldown = 7;
      addEffect("vortex", point.x, point.y, enemy.color);
      addLog(`${enemy.name}が仲間を呼んだ。`);
      return true;
    }
  }
  return false;
}

function explodeEnemyBomb(enemy, target) {
  const targets = livingTeam().filter((actor) => gridDistance(actor, enemy) <= 2);
  addEffect("nova", enemy.x, enemy.y, "#ff9d5d");
  triggerScreenShake(12, 330);
  for (const actor of targets) {
    const defense = actor.res;
    const damage = Math.max(3, 9 + Math.floor(game.floor / 8) - defense);
    actor.hp = Math.max(0, actor.hp - damage);
    addFloatingText(actor.x, actor.y, `-${damage}`, "#ff8c65");
    addEffect("impact", actor.x, actor.y, "#ffffff");
    if (actor.id === "leader") {
      game.lastDamageSource = {
        kind: "enemy",
        name: enemy.name,
        label: `${enemy.name}の爆発技`,
        detail: `${damage}ダメージ`,
      };
      playSfx("hurt");
      if (actor.hp <= 0) {
        if (tryReviveActor(actor)) continue;
        actor.down = true;
        checkGameOver();
      }
    } else if (actor.hp <= 0) {
      actor.down = true;
    }
  }
  addLog(`${enemy.name}の爆発技。周囲へ衝撃が走った。`);
}

function stealSmallItemOrCoins(enemy) {
  const held = Object.entries(game.bag).find(([kind, count]) => count > 0 && itemCatalog[kind] && !itemCatalog[kind].automatic);
  if (held) {
    const [kind] = held;
    game.bag[kind] -= 1;
    enemy.stolenItem = kind;
    addEffect("sparkTrail", enemy.x, enemy.y, "#f1d488");
    addLog(`${enemy.name}に${itemCatalog[kind].name}を盗まれた。倒せば取り返せる。`);
    announceEvent("盗み", `${itemCatalog[kind].name}を奪われた`, "盗", "danger", enemy);
    return true;
  }
  if (game.coins > 0) {
    const amount = Math.min(game.coins, 25 + Math.floor(game.floor / 2));
    game.coins -= amount;
    enemy.stolenCoins = (enemy.stolenCoins || 0) + amount;
    addLog(`${enemy.name}に${amount}星貨を盗まれた。`);
    announceEvent("盗み", `${amount}星貨を奪われた`, "盗", "danger", enemy);
    return true;
  }
  return false;
}

function enemyCanSeeTarget(enemy, target) {
  if (!target || target.down) return false;
  const sightRange = enemy.boss ? 9 : enemy.mutation?.swift ? 8 : 7;
  if (gridDistance(enemy, target) > sightRange) return false;
  return hasClearAttackPath(enemy, target);
}

function enemyRangedRange(enemy) {
  if (enemy.boss) return 5;
  if (enemy.attackStyle !== "magic" || game.floor < ENEMY_RANGED_START_FLOOR) return 0;
  return game.floor < 31 ? 2 : 3;
}

function bossSpecialAttack(enemy, target) {
  const base = 7 + Math.floor(game.floor / 5);
  const defense = enemy.attackStyle === "magic" ? target.res : target.def;
  const effectiveness = elementEffectiveness(enemy.elementKey, target.elementKey);
  const rawDamage = Math.max(2, Math.ceil((base + randInt(-2, 3) - defense) * effectiveness));
  let damage = target.guardTurns > 0 ? Math.max(1, Math.ceil(rawDamage / 2)) : rawDamage;
  const relicGuard = target.id === "leader" ? relicElementModifier("elementGuard", enemy.elementKey) : 0;
  if (relicGuard) damage = Math.max(1, Math.ceil(damage * (1 - relicGuard)));
  markActorAction(enemy, 520);
  if (target.id === "leader") {
    game.lastDamageSource = {
      kind: "boss",
      name: enemy.name,
      label: `${enemy.name}の${enemy.special}`,
      detail: `${damage}ダメージ`,
    };
  }
  target.hp = Math.max(0, target.hp - damage);
  addTargetedEffect("bossWave", enemy.x, enemy.y, target.x, target.y, enemy.color, 760);
  addEffect("runes", enemy.x, enemy.y, enemy.color);
  addEffect("impact", target.x, target.y, "#ffffff");
  addEffect("hit", target.x, target.y, enemy.color);
  addFloatingText(target.x, target.y, `-${damage}`, palette.coral);
  const effectivenessText = effectiveness > 1 ? "　効果抜群" : effectiveness < 1 ? "　いまひとつ" : "";
  addLog(`${enemy.name}の${enemy.special}。${target.name}に${damage}ダメージ${effectivenessText}。`);
  announceEvent(enemy.special, `【${elementInfo(enemy.elementKey).name}】${target.name}に${damage}ダメージ${effectivenessText}`, elementInfo(enemy.elementKey).symbol, "danger", enemy);
  setScreenFlash(enemy.color, 360);
  if (target.id === "leader") triggerScreenShake(18, 420);
  if (target.id === "leader") playSfx("hurt");
  applyBossSpecialGimmick(enemy, target, damage);
  if (target.hp > 0) return;
  if (tryReviveActor(target)) return;
  target.down = true;
  if (target.id === "leader") checkGameOver();
}

function applyBossSpecialGimmick(enemy, target, damage) {
  if (!enemy.boss) return;
  if (enemy.bossGimmick === "mirror") {
    enemy.elementKey = enemy.elementKey === "light" ? "dark" : "light";
    const mirroredElement = elementInfo(enemy.elementKey);
    enemy.color = mirroredElement.color;
    enemy.accent = mirroredElement.accent;
    addEffect("runes", enemy.x, enemy.y, mirroredElement.color);
    addFloatingText(enemy.x, enemy.y, `${mirroredElement.name}相`, mirroredElement.color);
    addLog(`${enemy.name}は双面を返し、${mirroredElement.name}属性へ切り替わった。`);
  }
  if (enemy.bossGimmick === "summon" || enemy.bossGimmick === "mutate" || enemy.bossGimmick === "final") {
    const summonCount = enemy.bossGimmick === "final" ? 2 : 1;
    for (let index = 0; index < summonCount; index += 1) {
      const point = randomEnemySpawnTile(5) || nearestOpen(enemy.x + index + 1, enemy.y, [enemy, target]);
      if (!point) continue;
      const minion = createEnemy(randomEnemyProfile(), point, true);
      minion.name = enemy.bossGimmick === "mutate" ? `門番変異 ${minion.name}` : `門番従者 ${minion.name}`;
      if (enemy.bossGimmick === "mutate") {
        minion.mutated = true;
        minion.hp = Math.ceil(minion.hp * 1.25);
        minion.maxHp = minion.hp;
        minion.atk += 2;
      }
      game.enemies.push(minion);
      addEffect("vortex", point.x, point.y, enemy.color);
    }
    addLog(`${enemy.name}の気配に呼ばれ、取り巻きが現れた。`);
  }
  if (enemy.bossGimmick === "drain" || enemy.bossGimmick === "final") {
    const healed = Math.min(enemy.maxHp - enemy.hp, Math.max(6, Math.floor(damage * 0.55)));
    if (healed > 0) {
      enemy.hp += healed;
      addFloatingText(enemy.x, enemy.y, `+${healed}`, "#dca2ff");
      addEffect("runes", enemy.x, enemy.y, "#b978df");
      addLog(`${enemy.name}は与えた痛みを吸い上げ、HPを${healed}回復した。`);
    }
  }
  if (enemy.bossGimmick === "cannon" || enemy.bossGimmick === "storm") {
    const leader = getLeader();
    if (leader.hp > 0 && gridDistance(enemy, leader) > 1 && hasClearAttackPath(enemy, leader)) {
      addTargetedEffect("enemyProjectile", enemy.x, enemy.y, leader.x, leader.y, enemy.color, 500);
      addFloatingText(leader.x, leader.y, "射線注意", "#ffe08a");
    }
  }
  if (enemy.bossGimmick === "rage" && enemy.hp < enemy.maxHp * 0.5 && !enemy.rageAwake) {
    enemy.rageAwake = true;
    enemy.atk += 5;
    addEffect("burst", enemy.x, enemy.y, "#ff8b5d");
    addLog(`${enemy.name}の炎角が燃え上がり、攻撃が上がった。`);
  }
}

function actorStrikeEnemy(actor, enemy, label) {
  actor.dx = Math.sign(enemy.x - actor.x);
  actor.dy = Math.sign(enemy.y - actor.y);
  const focusBonus = actor.id !== "leader" && game.focusTurns > 0 ? 3 : 0;
  const strongHit = actor.id === "leader" && hasSkill("hunter") && Math.random() < 0.18 ? 5 : 0;
  const executeBonus = actor.id === "leader" && hasSkill("execution") && enemy.hp / enemy.maxHp <= 0.4 ? 3 : 0;
  const knightBonus = actor.profileKey === "knight" ? 2 + (actor.guardTurns > 0 ? 2 : 0) : 0;
  const damage = Math.max(1, actor.atk + focusBonus + strongHit + executeBonus + knightBonus + randInt(-1, 2) - enemy.def);
  if (knightBonus && actor.id === "leader") addFloatingText(actor.x, actor.y, "王城剣", "#ffb078");
  if (strongHit) announceEvent("強撃", `${enemy.name}の急所を捉えた`, "狩", "good");
  return damageEnemy(enemy, damage, actor, label);
}

function damageEnemy(enemy, amount, source, label) {
  if (!game.enemies.includes(enemy)) return 0;
  const attackElement = source.id === "leader"
    ? game.currentActionElement || source.elementKey
    : source.elementKey;
  const effectiveness = elementEffectiveness(attackElement, enemy.elementKey);
  amount = Math.max(1, Math.ceil(amount * effectiveness));
  if (enemy.boss && enemy.bossGimmick === "shield" && enemy.hp > enemy.maxHp * 0.52 && effectiveness <= 1) {
    amount = Math.max(1, Math.ceil(amount * 0.65));
    addFloatingText(enemy.x, enemy.y, "氷鏡", "#a8eaff");
  } else if (enemy.boss && enemy.bossGimmick === "shield" && enemy.hp > enemy.maxHp * 0.52 && effectiveness > 1) {
    addFloatingText(enemy.x, enemy.y, "鏡破り", elementInfo(attackElement).color);
  }
  if (enemy.boss && enemy.bossGimmick === "crystal" && attackElement === enemy.elementKey) {
    amount = Math.max(1, Math.ceil(amount * 0.5));
    addFloatingText(enemy.x, enemy.y, "同調耐性", "#d8e8ff");
  } else if (enemy.boss && enemy.bossGimmick === "crystal" && effectiveness > 1) {
    amount = Math.ceil(amount * 1.18);
    addFloatingText(enemy.x, enemy.y, "晶核破り", elementInfo(attackElement).color);
  }
  if (enemy.boss && hasRelic("bossClaw")) amount = Math.ceil(amount * 1.25);
  if (enemy.mutated && hasRelic("mutationSeal")) amount = Math.ceil(amount * 1.35);
  if (hasRelic("hungryCrown") && game.belly <= 30) amount += 6;
  if (source.id === "leader" && hasRelic("firstDawn") && !game.relicFloorState.firstStrikeUsed) {
    amount += 8;
    game.relicFloorState.firstStrikeUsed = true;
    addFloatingText(source.x, source.y, "FIRST", "#ffe08a");
  }
  if (source.id === "leader" && hasRelic("duelistCoin") && source.hp >= source.maxHp) amount += 3;
  if (source.id === "leader" && hasRelic("frostNeedle") && attackElement === "water") amount += 4;
  if (source.id === "leader" && hasRelic("venomLamp") && attackElement === "wood") amount += 4;
  enemy.hp -= amount;
  enemy.alerted = true;
  addEffect("hit", enemy.x, enemy.y, source.color || palette.brass);
  addFloatingText(enemy.x, enemy.y, `-${amount}`, palette.brass);
  if (effectiveness > 1) {
    addFloatingText(enemy.x, enemy.y, "効果抜群", elementInfo(attackElement).color);
    addEffect("burst", enemy.x, enemy.y, elementInfo(attackElement).color);
  } else if (effectiveness < 1) {
    addFloatingText(enemy.x, enemy.y, "いまひとつ", "#b9c0bc");
  }
  if (source.id === "leader" && label.includes("通常攻撃")) {
    const effectivenessText = effectiveness > 1 ? "　効果ばつぐん" : effectiveness < 1 ? "　いまひとつ" : "";
    announceEvent(
      "通常攻撃",
      `${enemy.name}に ${amount}ダメージ${effectivenessText}`,
      "斬",
      enemy.hp <= 0 ? "good" : "mystic",
      enemy,
    );
  }
  playSfx("hit");

  if (enemy.hp <= 0) {
    game.enemies = game.enemies.filter((target) => target.id !== enemy.id);
    recordEnemyDefeated(enemy.key);
    game.score += enemy.exp;
    game.runStats.kills += 1;
    if (enemy.mutated) game.runStats.mutants += 1;
    if (source.id === "leader" && hasRelic("voidLedger")) {
      const bonusScore = 8 + Math.floor(game.floor / 3);
      game.score += bonusScore;
      addFloatingText(enemy.x, enemy.y, `+${bonusScore}pt`, "#c69dff");
    }
    addLog(`${label}。${enemy.name}を倒した。+${enemy.exp}pt${effectiveness > 1 ? "（効果抜群）" : ""}`);
    gainExp(enemy.exp);
    if (hasRelic("echoBell")) {
      const move = getLeader().moves[game.selectedMove];
      if (move) move.pp = Math.min(move.maxPp, move.pp + 1);
    }
    if (source.id === "leader" && hasRelic("scarletPearl") && game.runStats.kills % 3 === 0) {
      const move = getLeader().moves[game.selectedMove];
      if (move) {
        move.pp = Math.min(move.maxPp, move.pp + 2);
        addFloatingText(source.x, source.y, "緋連 PP+2", "#ff9aaa");
      }
    }
    if (hasRelic("warDrum") && game.lastActionStyle === "physical") healActor(getLeader(), 5);
    if (enemy.mutation?.volatile && gridDistance(enemy, getLeader()) <= 1) triggerMutationExplosion(enemy);
    if (enemy.stolenItem) {
      const point = findDropTile(enemy.x, enemy.y);
      game.items.push({ id: cryptoId(), kind: enemy.stolenItem, x: point.x, y: point.y });
      addLog(`${enemy.name}から盗まれた${itemCatalog[enemy.stolenItem]?.name || "道具"}を取り返した。`);
    }
    if (enemy.stolenCoins) {
      game.coins += enemy.stolenCoins;
      addFloatingText(enemy.x, enemy.y, `+${enemy.stolenCoins}G`, "#f1d488");
      addLog(`${enemy.name}から盗まれた${enemy.stolenCoins}星貨を取り返した。`);
    }
    if (enemy.boss) {
      dropEvolutionMaterial("bossCore", enemy.x, enemy.y, true);
      completeBossMission(enemy);
    } else {
      maybeDropEvolutionMaterial(enemy);
      if (enemy.rare) {
        dropRareEnemyLoot(enemy.x, enemy.y);
        if (Math.random() < 0.55) dropEvolutionMaterial("bossCore", enemy.x, enemy.y);
      } else if (enemy.mutated) {
        dropEvolutionMaterial(materialForEnemy(enemy), enemy.x, enemy.y);
      } else {
        maybeDropItem(enemy.x, enemy.y);
      }
    }
  } else {
    addLog(`${label}。${enemy.name}に${amount}ダメージ${effectiveness > 1 ? "（効果抜群）" : effectiveness < 1 ? "（いまひとつ）" : ""}。`);
  }
  return amount;
}

function dropRareEnemyLoot(x, y) {
  const point = findDropTile(x, y);
  const kind = Math.random() < 0.5 ? "reviver" : "fortuneOrb";
  game.items.push({ id: cryptoId(), kind, x: point.x, y: point.y });
  game.score += 120 + game.floor * 4;
  addLog(`レア敵の戦利品。${itemCatalog[kind].name}と星屑を得た。`);
  announceEvent("RARE REWARD", `${itemCatalog[kind].name}・探索pt獲得`, "★", "good");
}

function completeBossMission(enemy) {
  game.mission.complete = true;
  game.stairsRevealed = true;
  game.score += game.mission.reward;
  game.rescuePoints += game.mission.reward;
  const point = { x: enemy.x, y: enemy.y };
  addEffect("burst", point.x, point.y, palette.brass);
  game.coins += 100 + game.floor * 4;
  if (enemy.bossReward && itemCatalog[enemy.bossReward]) {
    dropEvolutionMaterial(enemy.bossReward, point.x, point.y, true);
  }
  const bossRouteBonus = routeEffectNumber("bossReward") > 0;
  game.pendingRelicChoices = rollRelicChoices(bossRouteBonus ? 4 : 3, bossRouteBonus ? "RARE" : "UNCOMMON");
  game.rewardPending = true;
  addLog(`${enemy.name}を撃破。通常階段の封印が解け、進化核が現れた。`);
  announceEvent("BOSS REWARD", `星遺物候補と${100 + game.floor * 4}星貨を獲得`, "冠", "good");
  setScreenFlash("#ffe08a", 700);
}

function materialForEnemy(enemy) {
  return {
    starwater: "moonShard",
    firecrystal: "emberCore",
    forestleaf: "wisdomSeed",
    moonshade: "shadowFang",
    skywind: Math.random() < 0.5 ? "moonShard" : "wisdomSeed",
  }[enemy.typeKey] || "shadowFang";
}

function triggerMutationExplosion(enemy) {
  const leader = getLeader();
  const damage = Math.max(3, 5 + Math.floor(game.floor / 20) - leader.res);
  leader.hp = Math.max(0, leader.hp - damage);
  addEffect("nova", enemy.x, enemy.y, "#ff9b58");
  addFloatingText(leader.x, leader.y, `-${damage}`, "#ff8c65");
  triggerScreenShake(12, 320);
  addLog(`${enemy.name}の爆核が砕け、${damage}ダメージ。`);
}

function enemyAttack(enemy, actor, ranged = false) {
  const defense = enemy.attackStyle === "magic" ? actor.res : actor.def;
  const attackPower = ranged ? Math.ceil(enemy.atk * 0.72) : enemy.atk;
  const effectiveness = elementEffectiveness(enemy.elementKey, actor.elementKey);
  const rawDamage = Math.max(1, Math.ceil((attackPower + randInt(-1, 2) - defense) * effectiveness));
  let damage = actor.guardTurns > 0 ? Math.max(1, Math.ceil(rawDamage / 2)) : rawDamage;
  if (actor.id === "leader" && hasRelic("crackedShield") && actor.hp <= actor.maxHp * 0.35) {
    damage = Math.max(1, Math.ceil(damage * 0.7));
  }
  if (ranged && actor.id === "leader" && hasRelic("stormKite")) {
    damage = Math.max(1, Math.ceil(damage * 0.7));
    addFloatingText(actor.x, actor.y, "避雷", "#8ee7ff");
  }
  if (actor.id === "leader" && hasRelic("quietHourglass") && game.turn < 150) {
    damage = Math.max(1, Math.ceil(damage * 0.84));
    addFloatingText(actor.x, actor.y, "静刻", "#cab8ff");
  }
  const relicGuard = actor.id === "leader" ? relicElementModifier("elementGuard", enemy.elementKey) : 0;
  if (relicGuard) {
    damage = Math.max(1, Math.ceil(damage * (1 - relicGuard)));
    addFloatingText(actor.x, actor.y, "属性耐性", elementInfo(enemy.elementKey).accent);
  }
  const moveName = enemyMoveName(enemy, ranged);
  markActorAction(enemy, ranged ? 440 : 320);
  if (actor.id === "leader") {
    game.lastDamageSource = {
      kind: ranged ? "ranged" : (enemy.boss ? "boss" : "enemy"),
      name: enemy.name,
      label: `${enemy.name}の${moveName}`,
      detail: `${damage}ダメージ`,
    };
  }
  actor.hp = Math.max(0, actor.hp - damage);
  enemy.alerted = true;
  if (ranged) {
    addTargetedEffect("enemyProjectile", enemy.x, enemy.y, actor.x, actor.y, enemy.color, 620);
    addEffect("runes", enemy.x, enemy.y, enemy.color);
    addEffect("impact", actor.x, actor.y, "#ffffff");
  } else {
    addEffect(
      "enemyClaw",
      actor.x,
      actor.y,
      enemy.color,
      Math.sign(actor.x - enemy.x),
      Math.sign(actor.y - enemy.y),
    );
  }
  addEffect("hit", actor.x, actor.y, enemy.color);
  addFloatingText(actor.x, actor.y, `-${damage}`, palette.coral);
  const effectivenessText = effectiveness > 1 ? "　効果抜群" : effectiveness < 1 ? "　いまひとつ" : "";
  addLog(`${enemy.name}の${moveName}。${actor.name}に${damage}ダメージ${effectivenessText}。`);
  announceEvent(moveName, `【${elementInfo(enemy.elementKey).name}】${enemy.name}から ${actor.name}へ ${damage}ダメージ${effectivenessText}`, elementInfo(enemy.elementKey).symbol, "danger", enemy);
  if (enemy.mutation?.vampiric) {
    const healed = Math.min(enemy.maxHp - enemy.hp, Math.max(1, Math.floor(damage / 2)));
    enemy.hp += healed;
    if (healed) addFloatingText(enemy.x, enemy.y, `+${healed}`, "#e477a1");
  }
  if (!ranged && actor.id === "leader" && hasRelic("thornMantle") && game.enemies.includes(enemy)) {
    damageEnemy(enemy, Math.max(1, Math.ceil(damage / 4)), actor, "星棘の反撃");
  }
  if (actor.id === "leader") {
    setScreenFlash("#ef6b64", 260);
    triggerScreenShake(enemy.boss ? 15 : 9, enemy.boss ? 360 : 240);
    playSfx("hurt");
  }

  if (actor.hp <= 0) {
    if (tryReviveActor(actor)) return;
    if (actor.id === "leader") {
      actor.down = true;
      checkGameOver();
    } else {
      actor.down = true;
      addLog(`${actor.name}は倒れた。次の階で復帰する。`);
    }
  }
}

function enemyMoveName(enemy, ranged) {
  const moveNames = {
    water: ranged ? "流星しぶき" : "水晶牙",
    fire: ranged ? "火炎弾" : "灼熱爪",
    wood: ranged ? "木霊の種砲" : "森角突き",
    dark: ranged ? "月影弾" : "影裂き",
    light: ranged ? "光輪刃" : "閃光斬り",
    divine: ranged ? "聖星光" : "聖獣牙",
    evil: ranged ? "邪星弾" : "邪爪裂き",
  };
  const baseName = moveNames[enemy.elementKey] || (ranged ? "魔力弾" : "強襲");
  if (!enemy.mutation) return baseName;
  return `${enemy.mutation.name}・${baseName}`;
}

function enemyIntent(enemy) {
  if ((enemy.sleepTurns || 0) > 0) {
    return { icon: "Z", label: "眠り", color: "#d8c9ff" };
  }
  const target = nearestLivingAlly(enemy);
  if (!target) return null;
  const seesTarget = enemyCanSeeTarget(enemy, target);
  const range = enemyRangedRange(enemy);
  if (enemy.chargingBomb) {
    return { icon: "爆", label: "爆発準備", color: "#ff9d5d", urgent: true };
  }
  if (enemy.ability === "heal" && (enemy.abilityCooldown || 0) === 0) {
    const wounded = game.enemies.some((ally) => ally.id !== enemy.id && gridDistance(enemy, ally) <= 3 && ally.hp < ally.maxHp * 0.7);
    if (wounded) return { icon: "癒", label: "回復", color: "#9ee88c", urgent: true };
  }
  if (enemy.ability === "steal" && gridDistance(enemy, target) === 1) {
    return { icon: "盗", label: "盗む", color: "#f1d488", urgent: true };
  }
  if (enemy.ability === "summon" && seesTarget && (enemy.abilityCooldown || 0) === 0) {
    return { icon: "呼", label: "呼ぶ", color: "#dca2ff", urgent: true };
  }
  if (
    enemy.boss
    && (enemy.specialCooldown || 0) === 0
    && gridDistance(enemy, target) <= 5
    && hasClearAttackPath(enemy, target)
  ) {
    return { icon: "技", label: enemy.special || "特殊技", color: "#ffcf6e", urgent: true };
  }
  if (range > 0 && gridDistance(enemy, target) <= range && seesTarget) {
    return { icon: "遠", label: enemyMoveName(enemy, true), color: elementInfo(enemy.elementKey).color, urgent: true };
  }
  if (gridDistance(enemy, target) === 1 && hasClearAttackPath(enemy, target)) {
    return { icon: "斬", label: enemyMoveName(enemy, false), color: elementInfo(enemy.elementKey).color, urgent: true };
  }
  if (seesTarget && !enemy.alerted) {
    return { icon: "!", label: "発見", color: "#ffe27d", urgent: true };
  }
  if (enemy.alerted) {
    return { icon: "追", label: "追跡", color: "#ff9a70" };
  }
  return { icon: "巡", label: "巡回", color: "#b8c0bc", dim: true };
}

function gainExp(amount) {
  for (const actor of game.team) {
    if (actor.down || actor.kind === "recruit") continue;
    actor.exp += amount;
    while (actor.exp >= actor.nextExp) {
      const before = {
        level: actor.level,
        maxHp: actor.maxHp,
        atk: actor.atk,
        magic: actor.magic,
        def: actor.def,
        res: actor.res,
        skillPoints: game.skillPoints,
        statPoints: game.statPoints,
      };
      actor.exp -= actor.nextExp;
      actor.level += 1;
      actor.nextExp = expRequirementForLevel(actor.level);
      actor.maxHp += 3;
      actor.hp = actor.maxHp;
      for (const move of actor.moves || []) move.pp = move.maxPp;
      if (actor.id === "leader") {
        game.skillPoints += 1;
        game.statPoints += 1;
      }
      if (actor.id === "leader" && [4, 8, 12].includes(actor.level)) {
        const profile = characterCatalog.find((entry) => entry.key === actor.profileKey) || characterCatalog[0];
        game.pendingMoveChoices = profile.moves.filter(
          (key) => !actor.moves.some((move) => move.key === key),
        );
        game.pendingMovePicks += 1;
      }
      if (actor.id === "leader") {
        game.pendingLevelUps.push({
          fromLevel: before.level,
          level: actor.level,
          hp: actor.maxHp - before.maxHp,
          atk: actor.atk - before.atk,
          magic: actor.magic - before.magic,
          def: actor.def - before.def,
          res: actor.res - before.res,
          skillPoints: game.skillPoints - before.skillPoints,
          statPoints: game.statPoints - before.statPoints,
          ppRecovered: true,
        });
      }
      addEffect("heal", actor.x, actor.y, actor.color);
      addLog(`${actor.name}はLv.${actor.level}になった。`);
      const bonusText = actor.id === "leader" ? "　PP全回復 / スキル+1 / ステータス+1" : "　PP全回復";
      announceEvent("レベルアップ", `${actor.name} Lv.${actor.level}${bonusText}`, "Lv", "good");
      playSfx("level");
    }
  }
}

function scheduleLevelUpDialog() {
  if (game.levelDialogScheduled || ui.levelDialog.open || !game.pendingLevelUps.length) return;
  game.levelDialogScheduled = true;
  window.setTimeout(() => {
    game.levelDialogScheduled = false;
    if (game.gameOver || game.victory || game.mode !== "dungeon") return;
    const blocked = [
      ui.townDialog,
      ui.helpDialog,
      ui.saveDialog,
      ui.stairsDialog,
      ui.restDialog,
      ui.gameMenuDialog,
    ].some((dialog) => dialog.open);
    if (blocked) {
      scheduleLevelUpDialog();
      return;
    }
    openLevelUpDialog();
  }, 140);
}

function openLevelUpDialog() {
  if (!game.pendingLevelUps.length || ui.levelDialog.open) return;
  const changes = game.pendingLevelUps.splice(0);
  const first = changes[0];
  const last = changes[changes.length - 1];
  const total = changes.reduce((sum, entry) => ({
    hp: sum.hp + entry.hp,
    atk: sum.atk + entry.atk,
    magic: sum.magic + entry.magic,
    def: sum.def + entry.def,
    res: sum.res + entry.res,
    skillPoints: sum.skillPoints + entry.skillPoints,
    statPoints: sum.statPoints + entry.statPoints,
  }), { hp: 0, atk: 0, magic: 0, def: 0, res: 0, skillPoints: 0, statPoints: 0 });
  const leader = getLeader();
  ui.levelDialogTitle.textContent = `Lv.${last.level}`;
  ui.levelDialogText.textContent = changes.length > 1
    ? `${leader.name}はLv.${first.fromLevel}からLv.${last.level}へ成長した。`
    : `${leader.name}の新しい力が目覚めた。`;
  const stats = [
    ["HP", total.hp, leader.maxHp, "心"],
    ["物理", total.atk, leader.atk, "牙"],
    ["魔力", total.magic, leader.magic, "魔"],
    ["防御", total.def, leader.def, "盾"],
    ["魔防", total.res, leader.res, "環"],
  ];
  ui.levelStatChanges.innerHTML = stats.map(([label, gain, current, icon]) => `
    <div class="${gain > 0 ? "raised" : ""}">
      <b>${icon}</b><span>${label}</span><em>${gain > 0 ? `+${gain}` : "±0"}</em><strong>${current}</strong>
    </div>
  `).join("");
  ui.levelSkillPoints.textContent = `${game.skillPoints} pt`;
  renderLevelStatPointControls(total.statPoints);
  renderLevelMoveChoices();
  drawPortrait(ui.levelPortrait, leader);
  ui.levelDialog.showModal();
}

function renderLevelStatPointControls(gained = 0) {
  if (!ui.levelStatPoints) return;
  const stats = [
    { key: "hp", label: "HP", icon: "心", detail: "+5" },
    { key: "atk", label: "物理", icon: "牙", detail: "+1" },
    { key: "magic", label: "魔力", icon: "魔", detail: "+1" },
    { key: "def", label: "防御", icon: "盾", detail: "+1" },
    { key: "res", label: "魔防", icon: "環", detail: "+1" },
  ];
  ui.levelStatPoints.innerHTML = `
    <div class="level-stat-points-head">
      <span>振り分けステータス</span>
      <strong>${game.statPoints} pt</strong>
      <small>${gained > 0 ? `今回 +${gained}。` : ""}ここで振らずに後で星網から振ることもできます。</small>
    </div>
    <div class="level-stat-point-buttons">
      ${stats.map((stat) => `
        <button type="button" data-stat-point="${stat.key}" ${game.statPoints <= 0 ? "disabled" : ""}>
          <b>${stat.icon}</b><span>${stat.label}</span><em>${stat.detail}</em>
        </button>
      `).join("")}
    </div>
  `;
  ui.levelStatPoints.querySelectorAll("[data-stat-point]").forEach((button) => {
    button.addEventListener("click", () => spendStatPoint(button.dataset.statPoint));
  });
}

function renderLevelMoveChoices() {
  if (!ui.levelMoveChoices) return;
  const leader = getLeader();
  if (game.pendingMovePicks <= 0 || !game.pendingMoveChoices.length) {
    ui.levelMoveChoices.innerHTML = "";
    return;
  }
  ui.levelMoveChoices.innerHTML = `
    <div class="level-move-head">
      <span>新しい技</span>
      <strong>${game.pendingMovePicks}つ選べる</strong>
    </div>
    <div class="level-move-grid"></div>
  `;
  const grid = ui.levelMoveChoices.querySelector(".level-move-grid");
  for (const key of game.pendingMoveChoices) {
    const move = moveCatalog.find((entry) => entry.key === key);
    if (!move) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `move-choice ${move.style}`;
    button.innerHTML = `
      <b style="color:${elementInfo(move.element).color}">${elementInfo(move.element).symbol}</b>
      <span><strong>${elementBadgeMarkup(move.element)}${move.name}</strong><small>${moveMetaMarkup(move)}${elementInfo(move.element).name}属性　${move.hint}</small><em>PP ${move.maxPp}</em></span>
    `;
    button.addEventListener("click", () => learnMoveChoice(key));
    grid.appendChild(button);
  }
}

function spendStatPoint(key) {
  if (game.statPoints <= 0) {
    showToast("振り分けポイントがない");
    return false;
  }
  const leader = getLeader();
  const labels = { hp: "HP", atk: "物理", magic: "魔力", def: "防御", res: "魔防" };
  if (!labels[key]) return false;
  if (key === "hp") {
    leader.maxHp += 5;
    leader.hp = Math.min(leader.maxHp, leader.hp + 5);
  } else {
    leader[key] += 1;
  }
  game.statPoints -= 1;
  addEffect("runes", leader.x, leader.y, leader.color);
  announceEvent("ステータス強化", `${labels[key]}を伸ばした`, "成", "good");
  playSfx("upgrade");
  renderLevelStatPointControls();
  if (ui.gameMenuDialog.open && game.menuView === "skills") renderSkillBoard();
  updateAll();
  return true;
}

function learnMoveChoice(key) {
  const leader = getLeader();
  const move = moveCatalog.find((entry) => entry.key === key);
  if (!move || game.pendingMovePicks <= 0 || !game.pendingMoveChoices.includes(key)) return false;
  const learnedMove = createKnownMove(move);
  if (leader.moves.length >= 4) {
    leader.moves[game.selectedMove] = learnedMove;
  } else {
    leader.moves.push(learnedMove);
  }
  game.pendingMovePicks = Math.max(0, game.pendingMovePicks - 1);
  game.pendingMoveChoices = game.pendingMoveChoices.filter((entry) => entry !== key);
  announceEvent("技を習得", `${leader.name}は${move.name}を覚えた`, "技", "good");
  playSfx("level");
  renderLevelMoveChoices();
  if (ui.gameMenuDialog.open && game.menuView === "moveReward") {
    if (game.pendingMovePicks > 0 && game.pendingMoveChoices.length) renderMoveReward();
    else ui.gameMenuDialog.close();
  }
  updateAll();
  return true;
}

function closeLevelUpDialog(openSkills = false) {
  if (ui.levelDialog.open) ui.levelDialog.close();
  if (openSkills) {
    openGameMenu("skills");
    return;
  }
  if (game.pendingLevelUps.length) {
    scheduleLevelUpDialog();
  } else if (game.pendingMovePicks > 0 && game.pendingMoveChoices.length) {
    window.setTimeout(openMoveReward, 80);
  } else if (game.rewardPending) {
    window.setTimeout(openRelicReward, 80);
  }
}

function maybeDropEvolutionMaterial(enemy) {
  const materialByType = {
    starwater: "moonShard",
    firecrystal: "emberCore",
    forestleaf: "wisdomSeed",
    moonshade: "shadowFang",
  };
  let kind = materialByType[enemy.typeKey];
  if (!kind && enemy.typeKey === "skywind") {
    kind = ["moonShard", "emberCore", "wisdomSeed", "shadowFang"][randInt(0, 3)];
  }
  const chance = clamp(0.07 + game.luck * 0.01 + (enemy.mutated ? 0.12 : 0), 0.03, 0.24);
  if (kind && Math.random() < chance) dropEvolutionMaterial(kind, enemy.x, enemy.y);
}

function dropEvolutionMaterial(kind, x, y, guaranteed = false) {
  const catalog = itemCatalog[kind];
  if (!catalog) return;
  const point = findDropTile(x, y);
  game.items.push({ id: cryptoId(), kind, x: point.x, y: point.y });
  addLog(`${catalog.name}が${guaranteed ? "強い光とともに" : ""}落ちた。進化に使える。`);
  announceEvent("進化素材ドロップ", catalog.name, catalog.icon, "mystic");
  playSfx("material");
}

function findDropTile(x, y) {
  const candidates = [{ x, y }, ...dirs.map((dir) => ({ x: x + dir.x, y: y + dir.y }))];
  const point = candidates.find((candidate) => (
    isWalkable(candidate.x, candidate.y) &&
    !actorAt(candidate.x, candidate.y) &&
    !enemyAt(candidate.x, candidate.y) &&
    !itemAt(candidate.x, candidate.y)
  ));
  return point || { x, y };
}

function maybeDropItem(x, y) {
  const chance = clamp(0.075 + game.luck * 0.014, 0.03, 0.18);
  if (Math.random() > chance || itemAt(x, y)) return;
  const kind = weighted([
    { value: "oran", weight: 22 },
    { value: "blastSeed", weight: 18 },
    { value: "sleepSeed", weight: 16 },
    { value: "elixir", weight: 14 },
    { value: "apple", weight: 14 },
    { value: "focusMint", weight: 10 },
    { value: "pierceSeed", weight: 7 },
    { value: "stormOrb", weight: 4 },
    { value: "mapScroll", weight: 3 },
    { value: "reviver", weight: 4 },
    { value: "stardust", weight: 12 },
  ]);
  game.items.push({ id: cryptoId(), kind, x, y });
}

function pushEnemy(enemy, dx, dy) {
  if (!game.enemies.includes(enemy)) return;
  const x = enemy.x + dx;
  const y = enemy.y + dy;
  if (!dx && !dy) return;
  if (!canTakeStep(enemy.x, enemy.y, dx, dy) || actorAt(x, y) || enemyAt(x, y)) return;
  const from = { x: enemy.x, y: enemy.y };
  enemy.x = x;
  enemy.y = y;
  startWalkMotion(enemy, from.x, from.y, x, y);
}

function resolveStepEffects(actor) {
  const trap = game.traps.find((entry) => !entry.used && entry.x === actor.x && entry.y === actor.y);
  if (trap) triggerHiddenTrap(actor, trap);
  if (actor.down || actor.hp <= 0) return;
  if (actor.id === "leader") {
    revealSecretRewardStairs(actor);
    triggerMonsterHouse(actor);
  }
  const healed = healActor(actor, 1 + (hasRelic("emberStep") ? 1 : 0));
  if (healed > 0) addFloatingText(actor.x, actor.y, `+${healed}`, "#83e3ad");
}

function revealSecretRewardStairs(actor) {
  const secret = game.secretStairs;
  if (!secret || secret.used) return;
  if (gridDistance(actor, secret) <= 1) secret.revealed = true;
  if (actor.x !== secret.x || actor.y !== secret.y) return;
  secret.revealed = true;
  addEffect("runes", secret.x, secret.y, "#d8a4ff");
  announceEvent("HIDDEN SANCTUM", "進化か、強力な星遺物を選べる", "秘", "mystic");
  addLog("隠し階段の先に、星の祭壇を見つけた。");
  window.setTimeout(() => openMilestoneChoice("secret"), 80);
}

function triggerMonsterHouse(actor) {
  const house = game.monsterHouse;
  if (!house || house.triggered) return;
  const room = house.room;
  const inside = actor.x >= room.x && actor.x < room.x + room.w
    && actor.y >= room.y && actor.y < room.y + room.h;
  if (!inside) return;
  house.triggered = true;
  const count = clamp(5 + Math.floor(game.floor / 22), 5, 9);
  for (let index = 0; index < count; index += 1) {
    const x = randInt(room.x, room.x + room.w - 1);
    const y = randInt(room.y, room.y + room.h - 1);
    if (manhattan(actor.x, actor.y, x, y) < 3 || actorAt(x, y) || enemyAt(x, y) || merchantAt(x, y)) continue;
    game.enemies.push(createEnemy(randomEnemyProfile(), { x, y }, true));
    addEffect("vortex", x, y, "#e35b78");
  }
  announceEvent("MONSTER HOUSE", `${count}体の気配が部屋を包囲した`, "魔", "danger");
  addLog("モンスターハウスだ。退路を確かめて戦おう。");
  setScreenFlash("#d24962", 520);
  triggerScreenShake(16, 480);
  playSfx("warning");
}

function triggerHiddenTrap(actor, trap) {
  trap.revealed = true;
  trap.used = true;
  game.runStats.trapsTriggered += 1;
  let detail = "";
  if (trap.kind === "spike") {
    const damage = Math.max(3, 7 + Math.floor(game.floor / 12) - actor.def);
    if (actor.id === "leader") {
      game.lastDamageSource = {
        kind: "trap",
        name: trapName(trap.kind),
        label: `隠し罠「${trapName(trap.kind)}」`,
        detail: `${damage}ダメージ`,
      };
    }
    actor.hp = Math.max(0, actor.hp - damage);
    addFloatingText(actor.x, actor.y, `-${damage}`, "#ff806c");
    detail = `星針が突き上がり ${damage}ダメージ`;
  } else if (trap.kind === "sleep") {
    actor.guardTurns = 0;
    actor.hp = Math.max(1, actor.hp - 3);
    detail = "眠り粉で無防備になった";
  } else if (trap.kind === "warp") {
    warpTeamToSafeRoom();
    detail = "別の部屋へ飛ばされた";
  } else {
    const move = actor.moves[game.selectedMove];
    if (move) move.pp = Math.max(0, move.pp - 2);
    detail = `${move?.name || "技"}のPPを2失った`;
  }
  addEffect("trap", trap.x, trap.y, "#ff7065");
  addLog(`隠し罠「${trapName(trap.kind)}」が作動。${detail}。`);
  announceEvent("HIDDEN TRAP", `${trapName(trap.kind)}　${detail}`, "罠", "danger");
  setScreenFlash("#ff675c", 360);
  triggerScreenShake(9, 260);
  if (actor.hp > 0) return;
  if (tryReviveActor(actor)) return;
  actor.down = true;
}

function trapName(kind) {
  return { spike: "星針", sleep: "眠り粉", warp: "転移陣", silence: "封技印" }[kind] || "未知の罠";
}

function pickUpMerchantItem(item) {
  const merchant = game.merchant;
  const offer = merchant?.stock.find((entry) => entry.id === item.shopOfferId);
  const catalog = itemCatalog[item.kind];
  if (!merchant || merchant.robbed || !offer || offer.sold || offer.picked || !catalog) return;
  if (!offer.material && bagTotal() >= game.bagCapacity) {
    showToast(`バッグがいっぱい。${catalog.name}を持てない`);
    return;
  }
  game.items = game.items.filter((candidate) => candidate.id !== item.id);
  offer.picked = true;
  if (!merchant.unpaid.includes(offer.id)) merchant.unpaid.push(offer.id);
  if (offer.material) {
    game.evolutionBag[offer.kind] = (game.evolutionBag[offer.kind] || 0) + 1;
  } else {
    game.bag[offer.kind] = (game.bag[offer.kind] || 0) + 1;
  }
  game.merchantView = "buy";
  addLog(`${catalog.name}を売り場から手に取った。未精算 ${merchantDebt()}星貨。`);
  announceEvent("未精算の商品", `${catalog.name}　${offer.price}星貨`, "店", "mystic");
  showToast(`未精算 ${merchantDebt()}星貨。店を出る前に商人へ`);
  playSfx("pickup");
}

function pickUpItem() {
  const leader = getLeader();
  const item = itemAt(leader.x, leader.y);
  if (!item) return;

  if (item.shopItem) {
    pickUpMerchantItem(item);
    return;
  }

  if (item.kind === "gear" && item.gear) {
    if (game.gearBag.length >= 24) {
      const equippedIds = new Set(Object.values(game.equipment));
      const disposable = game.gearBag
        .filter((gear) => !equippedIds.has(gear.id))
        .sort((a, b) => gearPower(a) - gearPower(b))[0];
      if (!disposable) {
        showToast("装備袋がいっぱい");
        return;
      }
      game.gearBag = game.gearBag.filter((gear) => gear.id !== disposable.id);
      addLog(`${disposable.name}を手放し、装備袋を空けた。`);
    }
    game.items = game.items.filter((candidate) => candidate.id !== item.id);
    game.gearBag.push(item.gear);
    const autoEquipped = !game.equipment[item.gear.slot];
    if (autoEquipped) equipGear(item.gear.id, false);
    const detail = `${gearRarityLabel(item.gear)}　${gearSlots[item.gear.slot].name}　${gearStatText(item.gear)}`;
    addLog(`${item.gear.name}を拾った。${autoEquipped ? "そのまま装備した。" : "装備袋に入れた。"}`);
    announceEvent(item.gear.name, detail, "装", "good");
    setScreenFlash(item.gear.color, 260);
    playSfx("gear");
    return;
  }

  if (item.kind === "badge") {
    game.items = game.items.filter((candidate) => candidate.id !== item.id);
    leader.atk += 1;
    leader.def += 1;
    addLog("隊長バッジを拾った。攻撃と防御が上がった。");
    announceEvent("隊長バッジ", "攻撃と防御が1上がった", "徽", "good");
    return;
  }

  if (item.kind === "stardust") {
    game.items = game.items.filter((candidate) => candidate.id !== item.id);
    const points = 45 + game.floor * 8;
    game.score += points;
    addLog(`星屑を集めた。探索pt +${points}。`);
    announceEvent("星屑を発見", `探索pt +${points}`, "星", "mystic");
    return;
  }

  const catalog = itemCatalog[item.kind];
  if (!catalog) return;
  if (catalog.category === "進化素材") {
    game.items = game.items.filter((candidate) => candidate.id !== item.id);
    game.evolutionBag[item.kind] = (game.evolutionBag[item.kind] || 0) + 1;
    addLog(`${catalog.name}を拾った。進化素材袋に保管した。`);
    announceEvent("進化素材を保管", `${catalog.name} × ${game.evolutionBag[item.kind]}`, catalog.icon, "mystic");
    setScreenFlash(catalog.color, 260);
    playSfx("material");
    return;
  }
  if (bagTotal() >= game.bagCapacity) {
    showToast(`バッグがいっぱい。${catalog.name}を拾えない`);
    return;
  }
  game.items = game.items.filter((candidate) => candidate.id !== item.id);
  game.bag[item.kind] = (game.bag[item.kind] || 0) + 1;
  addLog(`${catalog.name}を拾った。バッグ ${bagTotal()}/${game.bagCapacity}。`);
  announceEvent(catalog.name, `${catalog.category}をバッグに入れた`, catalog.icon, "good");
  setScreenFlash(catalog.color, 230);
  playSfx("pickup");
}

function dropItemFromBag(kind) {
  const leader = getLeader();
  const catalog = itemCatalog[kind];
  if (!catalog || (game.bag[kind] || 0) <= 0) return false;
  if (itemAt(leader.x, leader.y)) {
    showToast("足元に別の道具がある");
    return false;
  }
  if (game.stairs && leader.x === game.stairs.x && leader.y === game.stairs.y) {
    showToast("階段の上には置けない");
    return false;
  }
  if (game.secretStairs && leader.x === game.secretStairs.x && leader.y === game.secretStairs.y) {
    showToast("祭壇の上には置けない");
    return false;
  }
  const merchant = game.merchant;
  const unpaidOffer = merchant?.unpaid
    ?.map((offerId) => merchant.stock.find((entry) => entry.id === offerId))
    .find((offer) => offer?.kind === kind);
  if (unpaidOffer) {
    if (!isMerchantShopTile(leader.x, leader.y)) {
      showToast("未精算の商品は売り場で戻せる");
      return false;
    }
    game.bag[kind] -= 1;
    merchant.unpaid = merchant.unpaid.filter((offerId) => offerId !== unpaidOffer.id);
    unpaidOffer.picked = false;
    unpaidOffer.sold = false;
    unpaidOffer.x = leader.x;
    unpaidOffer.y = leader.y;
    game.items.push({
      id: cryptoId(),
      kind,
      x: leader.x,
      y: leader.y,
      shopItem: true,
      shopOfferId: unpaidOffer.id,
      price: unpaidOffer.price,
    });
    addLog(`${catalog.name}を売り場に戻した。未精算 ${merchantDebt()}星貨。`);
    announceEvent("商品を戻した", `${catalog.name}　未精算から外れた`, "店", "good");
    playSfx("pickup");
    updateAll();
    return true;
  }
  game.bag[kind] -= 1;
  game.items.push({ id: cryptoId(), kind, x: leader.x, y: leader.y });
  addLog(`${catalog.name}を足元に置いた。`);
  announceEvent("道具を置いた", `${catalog.name}　足元メニューで拾える`, catalog.icon, "mystic");
  playSfx("pickup");
  updateAll();
  return true;
}

function gearPower(gear) {
  return gear.atk * 3 + gear.def * 3 + gear.hp;
}

function gearRarityLabel(gear) {
  const stars = clamp(gear.stars || 1, 1, 5);
  return `${"★".repeat(stars)}${"☆".repeat(5 - stars)} ${gear.quality || "コモン"}`;
}

function gearStatText(gear) {
  return [
    gear.atk ? `攻撃 ${gear.atk > 0 ? "+" : ""}${gear.atk}` : "",
    gear.def ? `防御 ${gear.def > 0 ? "+" : ""}${gear.def}` : "",
    gear.hp ? `HP +${gear.hp}` : "",
  ].filter(Boolean).join("　") || "補正なし";
}

function applyGearBonus(actor, gear, direction) {
  if (!gear) return;
  actor.atk += gear.atk * direction;
  actor.def += gear.def * direction;
  actor.maxHp += gear.hp * direction;
  if (direction > 0) actor.hp += gear.hp;
  else actor.hp = Math.min(actor.hp, actor.maxHp);
  actor.maxHp = Math.max(1, actor.maxHp);
  actor.hp = clamp(actor.hp, 1, actor.maxHp);
}

function equipGear(gearId, announce = true) {
  const gear = game.gearBag.find((entry) => entry.id === gearId);
  if (!gear) return;
  const currentId = game.equipment[gear.slot];
  if (currentId === gear.id) return;
  const current = game.gearBag.find((entry) => entry.id === currentId);
  const leader = getLeader();
  applyGearBonus(leader, current, -1);
  game.equipment[gear.slot] = gear.id;
  applyGearBonus(leader, gear, 1);
  if (announce) {
    addLog(`${leader.name}は${gear.name}を装備した。`);
    announceEvent("装備変更", `${gearRarityLabel(gear)}　${gearStatText(gear)}`, "装", "mystic");
    updateAll();
    if (game.mode === "dungeon" && ui.gameMenuDialog.open) renderGameMenu("gear");
    if (game.mode === "town" && ui.townDialog.open) renderTownFacility();
  }
}

function bagTotal() {
  return Object.entries(game.bag).reduce(
    (sum, [kind, count]) => sum + (itemCatalog[kind]?.category === "進化素材" ? 0 : count),
    0,
  );
}

function evolutionMaterialTotal() {
  return evolutionMaterialKeys.reduce((sum, kind) => sum + (game.evolutionBag[kind] || 0), 0);
}

function hasRelic(key) {
  return game.relics.includes(key);
}

function addRelic(key, announce = true) {
  const relic = relicCatalog.find((entry) => entry.key === key);
  if (!relic || hasRelic(key)) return false;
  game.relics.push(key);
  const leader = getLeader();
  const bonus = relic.bonus || {};
  leader.maxHp = Math.max(12, leader.maxHp + (bonus.hp || 0));
  leader.hp = clamp(leader.hp + Math.max(0, bonus.hp || 0), 1, leader.maxHp);
  leader.atk += bonus.atk || 0;
  leader.magic += bonus.magic || 0;
  leader.def += bonus.def || 0;
  leader.res += bonus.res || 0;
  game.luck += bonus.luck || 0;
  if (bonus.pp) {
    for (const move of leader.moves || []) {
      move.maxPp += bonus.pp;
      move.pp += bonus.pp;
    }
  }
  if (announce) {
    addLog(`星遺物「${relic.name}」を獲得。${relic.detail}`);
    announceEvent("星遺物獲得", `${relic.name}　${relic.detail}`, relic.icon, "good");
    playSfx("upgrade");
  }
  return true;
}

function rollRelicChoices(count = 3, minimumRarity = "COMMON") {
  const rarityRank = { COMMON: 0, UNCOMMON: 1, RARE: 2, BOSS: 3 };
  const minimum = rarityRank[minimumRarity] ?? 0;
  const pool = relicCatalog.filter(
    (relic) => !hasRelic(relic.key) && rarityRank[relic.rarity] >= minimum && relic.rarity !== "BOSS",
  );
  const choices = [];
  while (choices.length < count && pool.length) {
    const index = randInt(0, pool.length - 1);
    choices.push(pool.splice(index, 1)[0].key);
  }
  if (choices.length < count && !hasRelic("zeroFragment")) choices.push("zeroFragment");
  return choices.slice(0, count);
}

function useItem(kind) {
  const catalog = itemCatalog[kind];
  if (!catalog || (game.bag[kind] || 0) <= 0) {
    showToast("その道具は持っていない");
    return false;
  }
  if (catalog.automatic) {
    showToast("倒れた時に自動で使う道具");
    return false;
  }

  const leader = getLeader();
  let detail = catalog.detail;
  if (kind === "apple" || kind === "bigApple") {
    const amount = kind === "apple" ? 45 : 80;
    const before = game.belly;
    game.belly = clamp(game.belly + amount, 0, 100);
    detail = `満腹度 +${Math.floor(game.belly - before)}`;
    addEffect("heal", leader.x, leader.y, catalog.color);
  } else if (kind === "oran") {
    if (leader.hp >= leader.maxHp) {
      showToast("HPは満タン");
      return false;
    }
    const healed = healActor(leader, 20);
    detail = `${leader.name}のHP +${healed}`;
    addEffect("heal", leader.x, leader.y, catalog.color);
  } else if (kind === "elixir") {
    const needsPp = leader.moves.some((move) => move.pp < move.maxPp);
    if (!needsPp) {
      showToast("技PPは満タン");
      return false;
    }
    for (const move of leader.moves) move.pp = Math.min(move.maxPp, move.pp + 5);
    detail = "すべての技PP +5";
  } else if (kind === "blastSeed") {
    const target = enemyInFacingLine(leader, 3);
    if (!target) {
      showToast("正面3マスに敵がいない");
      return false;
    }
    damageEnemy(target, 18 + leader.level, leader, catalog.name);
    addEffect("burst", target.x, target.y, catalog.color);
    detail = `${target.name}に${18 + leader.level}ダメージ`;
  } else if (kind === "sleepSeed") {
    const target = enemyInFacingLine(leader, 3);
    if (!target) {
      showToast("正面3マスに敵がいない");
      return false;
    }
    target.sleepTurns = Math.max(target.sleepTurns || 0, 4);
    addEffect("sleep", target.x, target.y, catalog.color);
    detail = `${target.name}を4ターン眠らせた`;
  } else if (kind === "slumberOrb") {
    const targets = game.enemies.filter((enemy) => isVisible(enemy.x, enemy.y));
    if (!targets.length) {
      showToast("見えている敵がいない");
      return false;
    }
    for (const target of targets) {
      target.sleepTurns = Math.max(target.sleepTurns || 0, 3);
      addEffect("sleep", target.x, target.y, catalog.color);
    }
    detail = `${targets.length}体の敵を眠らせた`;
  } else if (kind === "warpOrb") {
    warpTeamToSafeRoom();
    detail = "別の安全な部屋へ移動";
  } else if (kind === "guidingOrb") {
    game.guidanceActive = true;
    game.stairsRevealed = true;
    detail = "通常階段の位置がミニマップに表示された";
  } else if (kind === "guardBerry") {
    leader.def += 1;
    detail = "この挑戦中、防御 +1";
    addEffect("heal", leader.x, leader.y, catalog.color);
  } else if (kind === "powerBerry") {
    leader.atk += 1;
    detail = "この挑戦中、攻撃 +1";
    addEffect("burst", leader.x, leader.y, catalog.color);
  } else if (kind === "fortuneOrb") {
    game.luck += 2;
    detail = "この階の運 +2";
    addEffect("burst", leader.x, leader.y, catalog.color);
  } else if (kind === "focusMint") {
    const move = leader.moves[game.selectedMove];
    if (!move || move.pp >= move.maxPp) {
      showToast("選択中の技PPは満タン");
      return false;
    }
    const before = move.pp;
    move.pp = Math.min(move.maxPp, move.pp + 4);
    detail = `${move.name} PP +${move.pp - before}`;
    addEffect("runes", leader.x, leader.y, catalog.color);
  } else if (kind === "mindBerry") {
    leader.magic += 1;
    detail = "この挑戦中、魔力 +1";
    addEffect("heal", leader.x, leader.y, catalog.color);
  } else if (kind === "wardBerry") {
    leader.res += 1;
    detail = "この挑戦中、魔防 +1";
    addEffect("shield", leader.x, leader.y, catalog.color);
  } else if (kind === "ironNut") {
    leader.maxHp += 5;
    leader.hp = Math.min(leader.maxHp, leader.hp + 5);
    leader.def += 1;
    detail = "最大HP +5、防御 +1";
    addEffect("shield", leader.x, leader.y, catalog.color);
  } else if (kind === "pierceSeed") {
    const target = enemyInFacingLine(leader, 4);
    if (!target) {
      showToast("正面4マスに敵がいない");
      return false;
    }
    addEffect("beam", leader.x, leader.y, catalog.color, leader.dx, leader.dy);
    damageEnemy(target, 14 + Math.floor(game.floor / 10), leader, catalog.name);
    detail = `${target.name}へ貫通ダメージ`;
  } else if (kind === "stormOrb") {
    const targets = game.enemies.filter((enemy) => isVisible(enemy.x, enemy.y));
    if (!targets.length) {
      showToast("見えている敵がいない");
      return false;
    }
    for (const target of targets) {
      damageEnemy(target, 7 + Math.floor(game.floor / 12), leader, catalog.name);
      addEffect("sparkTrail", target.x, target.y, catalog.color);
    }
    detail = `${targets.length}体へ雷撃`;
  } else if (kind === "mapScroll") {
    for (const room of game.rooms) {
      for (let y = room.y; y < room.y + room.h; y += 1) {
        for (let x = room.x; x < room.x + room.w; x += 1) {
          if (inBounds(x, y) && game.map[y][x] !== "wall") game.mapped[y][x] = true;
        }
      }
    }
    game.stairsRevealed = true;
    detail = "部屋の形と通常階段を地図へ記した";
    addEffect("runes", leader.x, leader.y, catalog.color);
  }

  game.bag[kind] -= 1;
  game.runStats.itemUses += 1;
  addLog(`${catalog.name}を使った。${detail}。`);
  announceEvent(catalog.name, detail, catalog.icon, "mystic");
  setScreenFlash(catalog.color, 260);
  playSfx("item");
  return true;
}

function enemyInFacingLine(actor, range) {
  for (let step = 1; step <= range; step += 1) {
    const x = actor.x + actor.dx * step;
    const y = actor.y + actor.dy * step;
    if (!inBounds(x, y) || !isWalkable(x, y)) return null;
    const target = enemyAt(x, y);
    if (target) return target;
  }
  return null;
}

function warpTeamToSafeRoom() {
  const leader = getLeader();
  const leaderFrom = { x: leader.x, y: leader.y };
  const choices = game.rooms.filter((room) => !pointInRoom(leader.x, leader.y, room));
  const room = choices[randInt(0, Math.max(0, choices.length - 1))] || game.rooms[0];
  const destination = centerOf(room);
  const blockers = [];
  game.team.forEach((actor, index) => {
    if (actor.down) return;
    const point = index === 0
      ? nearestOpen(destination.x, destination.y, blockers)
      : nearestOpen(destination.x + index, destination.y, blockers);
    actor.x = point.x;
    actor.y = point.y;
    actor.motion = null;
    blockers.push(point);
    addEffect("heal", point.x, point.y, "#6fcce8");
  });
  game.leaderTrail = Array.from({ length: Math.max(8, game.team.length + 3) }, () => ({
    x: leader.x,
    y: leader.y,
  }));
  checkMerchantShopExit(leaderFrom, leader);
  revealAroundTeam();
}

function tickHunger() {
  const hungerCost = hasSkill("feast") ? 0.04 : hasSkill("ration") ? 0.08 : 0.14;
  game.belly = clamp(game.belly - hungerCost, 0, 100);
  if (game.belly === 0) {
    const leader = getLeader();
    leader.hp = Math.max(0, leader.hp - 1);
    addFloatingText(leader.x, leader.y, "-1", palette.coral);
    if (game.turn % 3 === 0) addLog("お腹が空いて力が出ない。");
    if (leader.hp <= 0 && !tryReviveActor(leader)) leader.down = true;
  }
}

function tryReviveActor(actor) {
  if (actor.id === "leader" && hasRelic("secondMoon") && !game.secondMoonUsed) {
    game.secondMoonUsed = true;
    actor.down = false;
    actor.hp = Math.max(1, Math.ceil(actor.maxHp * 0.4));
    addEffect("nova", actor.x, actor.y, "#fff0a2");
    addFloatingText(actor.x, actor.y, "SECOND MOON", "#fff0a2");
    announceEvent("二度目の月", `${actor.name}がHP ${actor.hp}で復活`, "月", "good");
    setScreenFlash("#fff0a2", 520);
    return true;
  }
  if ((game.bag.reviver || 0) <= 0) return false;
  game.bag.reviver -= 1;
  actor.down = false;
  actor.hp = Math.max(1, Math.ceil(actor.maxHp * 0.55));
  addEffect("heal", actor.x, actor.y, "#ffe47b");
  addFloatingText(actor.x, actor.y, "REVIVE", "#ffe47b");
  addLog(`あかつきの種が光り、${actor.name}は立ち上がった。`);
  announceEvent("あかつきの種", `${actor.name}がHP ${actor.hp}で復活`, "復", "good");
  setScreenFlash("#ffe47b", 360);
  return true;
}

function checkMission() {
  if (!game.mission || game.mission.complete) return;
  if (game.mission.boss) return;
  const leader = getLeader();
  if (manhattan(leader.x, leader.y, game.mission.x, game.mission.y) > 0) return;
  game.mission.complete = true;
  game.runStats.helped += 1;
  if (game.karma > 0) game.karma -= 1;
  game.score += game.mission.reward;
  game.rescuePoints += game.mission.reward;
  addEffect("heal", game.mission.x, game.mission.y, palette.brass);
  addLog(`${game.mission.done} 報酬 +${game.mission.reward}pt。善行によりカルマ ${game.karma}。`);
  announceEvent("依頼達成", `${game.mission.done} 階段が開いた`, "印", "good");
  setScreenFlash("#e5ae48", 420);
  playSfx("rescue");
}

function tryUseStairs() {
  const leader = getLeader();
  if (leader.x !== game.stairs.x || leader.y !== game.stairs.y) return false;
  if (!game.mission.complete) {
    addLog("休憩所を守る門番を倒すまで、階段は開かない。");
    return false;
  }
  if (game.rewardPending) {
    openRelicReward();
    return true;
  }
  if (isRestFloor(game.floor) && !game.restChoiceTaken) {
    addLog("次へ進む前に、休憩所の祭壇で進化か星遺物を選ぶ必要がある。");
    announceEvent("祭壇が呼んでいる", "光る祭壇を調べて、この先へ持つ力を決めよう", "進", "mystic");
    showToast("祭壇を調べよう");
    return true;
  }
  if (!ui.stairsDialog.open) openStairsDialog();
  return true;
}

function openStairsDialog() {
  ui.stairsDialogKicker.textContent = game.floorKind === "boss" ? "門番撃破" : `B${game.floor}F 踏破`;
  ui.stairsDialogTitle.textContent = "次の階へ進みますか？";
  ui.stairsDialogText.textContent = isRestFloor(game.floor + 1)
    ? `次はB${game.floor + 1}Fの${isMajorRestFloor(game.floor + 1) ? "大休憩所" : "休憩所"}です。技PPが回復します。`
    : "次へ進むと、この階には戻れません。";
  ui.stairsProceedButton.textContent = `B${game.floor + 1}Fへ進む`;
  ui.stairsDialog.showModal();
}

function stayOnCurrentFloor() {
  if (ui.stairsDialog.open) ui.stairsDialog.close();
  addLog("階段を降りず、この階の探索を続けることにした。");
  resolveWorldTurn();
}

function proceedThroughStairs() {
  if (ui.stairsDialog.open) ui.stairsDialog.close();

  if (game.floor >= game.targetFloor) {
    completeTower();
    return;
  }

  game.runStats.floorsCleared += 1;
  game.floor += 1;
  game.highestFloor = Math.max(game.highestFloor, game.floor);
  game.turn = 1;
  for (const actor of game.team) {
    actor.down = false;
  }
  buildFloor();
  if (hasRelic("campfireCoal")) {
    const healed = healActor(getLeader(), 8);
    if (healed > 0) addFloatingText(getLeader().x, getLeader().y, `+${healed}`, "#f0b85d");
  }
  announceEvent("次の階へ", `B${game.floor}F　${game.floorKind === "boss" ? "門番戦" : game.floorKind.includes("rest") ? "休憩所" : "探索開始"}`, "階", "mystic");
  playSfx("stairs");
  updateAll();
  queueRouteChoiceIfNeeded(220);
  queueFloorChoiceIfNeeded(720);
}

function completeTower() {
  game.victory = true;
  game.completedDungeon = 1;
  game.highestFloor = 100;
  game.towerCheckpoint = null;
  game.score += 5000;
  game.coins += 5000;
  game.rescuePoints += 5000;
  saveBestScore();
  saveCurrentGame(true);
  ui.endTitle.textContent = "星喰い塔 100F踏破";
  ui.endText.textContent = "10の門番を越え、星核へ到達した。報酬 5000星貨。永続進化は次の挑戦にも残る。";
  ui.endRestartButton.textContent = "町へ凱旋";
  ui.endOverlay.hidden = false;
  playSfx("victory");
  updateAll();
}

function openRestSite() {
  if (!isRestFloor(game.floor) || game.restChoiceTaken || ui.restDialog.open) return;
  const major = isMajorRestFloor(game.floor);
  const theme = game.restTheme || restThemeForFloor(game.floor);
  ui.restDialog.style.setProperty("--rest-accent", theme.accent);
  ui.restDialogKicker.textContent = `B${game.floor}F ${major ? "大休憩所" : "休憩所"} / ${theme.name}`;
  ui.restDialogTitle.textContent = game.floor >= 100 ? "百階の星核に応える" : "次の十階へ持つ力";
  ui.restDialogText.textContent = "祭壇の恩恵は一度だけ。進化を進めるか、この挑戦を変える強力な星遺物を選ぼう。倉庫と商店は部屋を歩いて利用できる。";
  const leader = getLeader();
  const choices = [
    {
      key: "milestone-evolution",
      title: leader.evolutionStage >= 10 ? "最終進化済み" : `第${leader.evolutionStage + 1}段階へ進化`,
      detail: leader.evolutionStage >= 10 ? "進化は第10段階で完成している" : "条件で変わる3〜4候補から1つ",
      icon: "進",
      disabled: leader.evolutionStage >= 10,
    },
    { key: "milestone-relic", title: "強力な星遺物を得る", detail: "この挑戦だけ働く3候補から1つ", icon: "遺" },
  ];
  ui.restDialogChoices.innerHTML = choices.map((choice) => `
    <button type="button" data-rest-choice="${choice.key}" ${choice.disabled ? "disabled" : ""}>
      <b>${choice.icon}</b><span><strong>${choice.title}</strong><small>${choice.detail}</small></span>
    </button>
  `).join("");
  ui.restDialogChoices.querySelectorAll("[data-rest-choice]").forEach((button) => {
    button.addEventListener("click", () => chooseRestAction(button.dataset.restChoice));
  });
  ui.restDialog.showModal();
}

function chooseRestAction(action) {
  if (ui.restDialog.open) ui.restDialog.close();
  if (action === "milestone-evolution") {
    game.milestoneSource = "rest";
    game.pendingAscensionChoices = createAscensionChoices(getLeader());
    window.setTimeout(() => openGameMenu("ascensionReward"), 40);
    return;
  }
  if (action === "milestone-relic") {
    game.milestoneSource = "rest";
    game.pendingRelicChoices = rollRelicChoices(3, "RARE");
    game.rewardPending = true;
    window.setTimeout(() => openGameMenu("relicReward"), 40);
    return;
  }
  if (action === "shop") {
    game.merchantView = "buy";
    window.setTimeout(() => openGameMenu("merchant"), 40);
    return;
  }
  if (action === "facility-storage") {
    window.setTimeout(() => openGameMenu("restStorage"), 40);
    return;
  }
  if (action.startsWith("facility-")) {
    game.activeRestService = action.replace("facility-", "");
    window.setTimeout(() => openGameMenu("restService"), 40);
  }
}

function captureTowerCheckpoint(resumeFloor) {
  const leader = getLeader();
  game.towerCheckpoint = {
    floor: clamp(resumeFloor, 1, 100),
    leader: {
      level: leader.level,
      exp: leader.exp,
      nextExp: leader.nextExp,
      hp: leader.hp,
      maxHp: leader.maxHp,
      atk: leader.atk,
      magic: leader.magic,
      def: leader.def,
      res: leader.res,
      moves: leader.moves.map((move) => ({ ...move })),
      evolutionKey: leader.evolutionKey,
      evolutionStage: leader.evolutionStage,
      evolutionBranch: leader.evolutionBranch,
      evolutionName: leader.evolutionName,
      elementKey: leader.elementKey,
      artColumn: leader.artColumn,
      artIndex: leader.artIndex,
      ascensionHistory: [...(leader.ascensionHistory || [])],
      appliedSkills: [...(leader.appliedSkills || [])],
    },
    relics: [...game.relics],
    unlockedSkills: [...game.unlockedSkills],
    skillPoints: game.skillPoints,
    statPoints: game.statPoints,
    runStats: { ...game.runStats },
    evolutionBag: { ...game.evolutionBag },
    belly: game.belly,
    score: game.score,
    selectedMove: game.selectedMove,
    secondMoonUsed: game.secondMoonUsed,
    lastActionStyle: game.lastActionStyle,
    lastMoveElement: game.lastMoveElement,
    routePlan: { ...game.routePlan },
  };
}

function restoreTowerCheckpoint(checkpoint) {
  const leader = getLeader();
  Object.assign(leader, checkpoint.leader || {});
  if (Array.isArray(checkpoint.leader?.moves)) {
    leader.moves = checkpoint.leader.moves.map((move) => {
      const catalogMove = moveCatalog.find((entry) => entry.key === move.key);
      return { ...(catalogMove || {}), ...move, element: move.element || catalogMove?.element || "light" };
    });
  }
  leader.nextExp = Math.max(expRequirementForLevel(leader.level), Number(leader.nextExp) || 0);
  const checkpointEvolutionKey = leader.evolutionKey || "base";
  if (game.persistentEvolutionKey !== checkpointEvolutionKey) {
    const missing = [];
    let cursor = evolutionCatalog.find((entry) => entry.key === game.persistentEvolutionKey);
    while (cursor && cursor.key !== checkpointEvolutionKey) {
      missing.unshift(cursor);
      cursor = evolutionCatalog.find((entry) => entry.key === cursor.from);
    }
    if (cursor?.key === checkpointEvolutionKey || checkpointEvolutionKey === "base") {
      const hpBonus = missing.reduce((sum, entry) => sum + entry.bonus.hp, 0);
      for (const evolution of missing) applyEvolutionBonus(leader, evolution);
      leader.hp = Math.min(leader.maxHp, leader.hp + hpBonus);
      leader.evolutionKey = game.persistentEvolutionKey;
      leader.evolutionStage = game.persistentEvolutionStage;
    }
  }
  const evolution = evolutionCatalog.find((entry) => entry.key === leader.evolutionKey);
  if (evolution) {
    leader.name = evolution.name;
    leader.type = evolution.type;
    leader.role = `${evolution.type}タイプ`;
    leader.color = evolution.color;
    leader.accent = evolution.accent;
    leader.scarf = evolution.scarf;
  }
  game.relics = Array.isArray(checkpoint.relics) ? [...checkpoint.relics] : [];
  game.unlockedSkills = Array.isArray(checkpoint.unlockedSkills) ? [...checkpoint.unlockedSkills] : [];
  game.skillPoints = Math.max(0, Number(checkpoint.skillPoints) || 0);
  game.statPoints = Math.max(0, Number(checkpoint.statPoints) || 0);
  game.runStats = { ...createRunStats(), ...(checkpoint.runStats || {}) };
  game.evolutionBag = {
    ...Object.fromEntries(evolutionMaterialKeys.map((key) => [key, 0])),
    ...(checkpoint.evolutionBag || {}),
  };
  game.belly = clamp(Number(checkpoint.belly) || 100, 0, 100);
  game.score = Math.max(0, Number(checkpoint.score) || 0);
  game.selectedMove = clamp(Number(checkpoint.selectedMove) || 0, 0, leader.moves.length - 1);
  game.secondMoonUsed = Boolean(checkpoint.secondMoonUsed);
  game.lastActionStyle = checkpoint.lastActionStyle === "magic" ? "magic" : checkpoint.lastActionStyle === "physical" ? "physical" : null;
  game.lastMoveElement = checkpoint.lastMoveElement || null;
  game.routePlan = checkpoint.routePlan && typeof checkpoint.routePlan === "object" ? { ...checkpoint.routePlan } : {};
}

function checkGameOver() {
  const leader = getLeader();
  if (!leader.down && leader.hp > 0) return;
  const floor = game.floor;
  const score = game.score;
  resetToNewGameAfterFailure(
    "探索失敗",
    `B${floor}Fで力尽きた。探索pt ${score}。死亡したため、進化素材・進化状態・今回のバッグはリセットされる。`,
  );
}

function updateAll() {
  if (!game) return;
  const rank = currentRank();
  const inTown = game.mode === "town";
  ui.townScreen.hidden = !inTown;
  ui.gameLayout.hidden = inTown;
  ui.touchControls.hidden = inTown;
  ui.touchControls.dataset.mode = inTown ? "town" : "dungeon";
  ui.touchAButton.querySelector("small").textContent = inTown ? "しらべる" : "こうげき";
  ui.touchAButton.setAttribute("aria-label", inTown ? "A 調べる" : "A 通常攻撃");
  ui.touchXButton.disabled = inTown;
  ui.touchYButton.disabled = inTown;
  if (inTown) ui.eventBanner.hidden = true;

  if (inTown) {
    const leader = getLeader();
    const checkpoint = game.towerCheckpoint?.floor;
    const evolution = evolutionCatalog.find((entry) => entry.key === game.persistentEvolutionKey);
    ui.floor.textContent = "町";
    ui.score.textContent = `${game.coins} 星貨`;
    ui.best.textContent = rank.name;
    ui.townMission.textContent = `星喰いの塔 / 最高 B${game.highestFloor}F / 全100階`;
    ui.townRank.textContent = rank.name;
    ui.townCoin.textContent = `${game.coins}`;
    ui.townLeaderName.textContent = leader.evolutionName || leader.name;
    ui.townLeaderType.textContent = `${elementInfo(leader.elementKey).name}属性 / ${leader.type}タイプ${leader.evolutionStage ? ` / 進化 ${leader.evolutionStage}/10` : evolution ? ` / ${evolution.path === "magic" ? "魔法型" : evolution.path === "physical" ? "物理型" : "複合型"}` : ""}`;
    ui.townLeaderSwatch.style.background = elementInfo(leader.elementKey).color;
    const startFloor = checkpoint || 1;
    const nextGate = Math.min(99, Math.floor(startFloor / 10) * 10 + 9);
    ui.townStartFloor.textContent = `B${startFloor}F`;
    ui.townNextGate.textContent = `B${nextGate}F`;
    ui.departButton.querySelector("span").textContent = checkpoint
      ? `B${checkpoint}Fの休憩所から再開`
      : "B1Fから100階踏破へ挑む";
    if (ui.townChoiceDepartLabel) {
      ui.townChoiceDepartLabel.textContent = checkpoint
        ? `B${checkpoint}Fの休憩所から再開`
        : "探索者と星遺物を選ぶ";
    }
    ui.townInteraction.hidden = true;
    return;
  }
  ui.townInteraction.hidden = true;

  const nextRest = Math.min(100, Math.ceil((game.floor + (isRestFloor(game.floor) ? 1 : 0)) / 10) * 10);
  const stairsMapped = Boolean(game.mapped[game.stairs.y]?.[game.stairs.x]);
  const physicalLead = game.runStats.physicalUses - game.runStats.magicUses;
  const buildName = physicalLead >= 8 ? "物理型" : physicalLead <= -8 ? "魔法型" : "均衡型";
  ui.floor.textContent = `B${game.floor}F`;
  ui.score.textContent = `${game.score} pt`;
  ui.best.textContent = `Best ${bestScore}`;
  ui.mission.textContent = game.floorKind.includes("rest")
    ? (game.restChoiceTaken ? "休息済" : "休憩所")
    : game.mission?.boss
      ? (game.mission.complete ? "門番撃破" : "門番戦")
      : stairsMapped ? "階段確認" : "探索中";
  ui.belly.textContent = `${Math.ceil(game.belly)}`;
  ui.bag.textContent = `バッグ ${bagTotal()}/${game.bagCapacity}`;
  ui.materials.textContent = `素材袋 ${evolutionMaterialTotal()}`;
  ui.gear.textContent = `${game.relics.length}個`;
  if (game.floorKind.includes("rest")) {
    ui.turn.textContent = "休憩所";
    ui.turn.dataset.pressure = "rest";
  } else {
    ui.turn.textContent = `${game.turn} / ${FLOOR_WIND_LIMIT}`;
    ui.turn.dataset.pressure = game.turn >= FLOOR_WIND_DANGER
      ? "danger"
      : game.turn >= FLOOR_WIND_WARNING
        ? "warning"
        : "safe";
  }
  ui.stairs.textContent = !game.mission?.complete ? "封印中" : stairsMapped ? "確認済" : "未踏";
  ui.goal.textContent = game.floorKind.includes("rest")
    ? game.restChoiceTaken ? "階段から次の区画へ" : "休憩の恩恵を1つ選ぶ"
    : !game.mission?.complete
      ? `${game.mission.target}を倒す`
      : stairsMapped
        ? "階段へ向かう"
        : "通常階段を探す";
  ui.rest.textContent = game.floor >= 100 ? "最深部" : `次は B${nextRest}F`;
  ui.chapter.textContent = "星喰いの塔";
  const trend = floorElementTrend().map((key) => elementInfo(key).name).join("・");
  const routePlan = currentRoutePlan();
  ui.luck.textContent = `${game.floorEvent?.name || "平穏"} / ${trend}${routePlan ? ` / ${routePlan.name}` : ""}`;
  ui.luck.style.color = game.luck > 0 ? "#9ee88c" : game.luck < 0 ? "#ff9b87" : "";
  ui.mapLeaderDot.style.background = getLeader().color;
  ui.tacticSummary.textContent = `${buildName} / 物${game.runStats.physicalUses} 魔${game.runStats.magicUses}`;
  ui.karma.textContent = buildName;
  ui.karma.style.color = buildName === "物理型" ? "#ff9274" : buildName === "魔法型" ? "#79d7f0" : "#f0cf78";
  renderBattleHud();
  renderRelicRibbon();
  renderParty(rank);
  renderMoves();
  renderLog();
}

function renderBattleHud() {
  const leader = getLeader();
  if (!leader || !ui.battleHud) return;
  const element = elementInfo(leader.elementKey);
  const hpRatio = leader.maxHp ? clamp((leader.hp / leader.maxHp) * 100, 0, 100) : 0;
  const expRatio = leader.nextExp ? clamp((leader.exp / leader.nextExp) * 100, 0, 100) : 0;
  ui.battleLevel.textContent = `${leader.level}`;
  ui.battleName.textContent = leader.evolutionName || leader.name;
  ui.battleType.textContent = `${element.symbol} ${element.name} / ${leader.type}`;
  ui.battleType.style.color = element.color;
  ui.battleHp.textContent = `${leader.hp} / ${leader.maxHp}`;
  ui.battleHpFill.style.width = `${hpRatio}%`;
  ui.battleHpFill.style.background = hpRatio <= 25
    ? "linear-gradient(90deg, #c53f43, #ff7468)"
    : hpRatio <= 50
      ? "linear-gradient(90deg, #d18a34, #f0c35a)"
      : "linear-gradient(90deg, #3ea861, #8ed86e)";
  ui.battleExpFill.style.width = `${expRatio}%`;
  ui.battleHud.dataset.health = hpRatio <= 25 ? "danger" : hpRatio <= 50 ? "warning" : "safe";
}

function renderTargetHud(tile = game.aimTile) {
  if (!ui.targetHud || game.mode !== "dungeon") return;
  const leader = getLeader();
  const move = leader.moves[game.selectedMove];
  const style = moveStyleInfo(move?.style);
  ui.targetHud.dataset.tone = "neutral";

  if (!tile) {
    const direction = game.aimDirection || { x: leader.dx, y: leader.dy };
    const facingTile = direction?.x || direction?.y
      ? { x: leader.x + direction.x, y: leader.y + direction.y }
      : null;
    if (facingTile && enemyAt(facingTile.x, facingTile.y)) tile = facingTile;
  }

  if (!tile || !inBounds(tile.x, tile.y)) {
    ui.targetHudKicker.textContent = "SELECTED MOVE";
    ui.targetHudTitle.textContent = move ? move.name : "技なし";
    ui.targetHudDetail.textContent = move
      ? `${elementInfo(move.element).name} / ${style.label} / ${moveAimShape(move).label} / PP ${move.pp}/${move.maxPp}`
      : "カーソルで攻撃先を選択";
    return;
  }

  const enemy = enemyAt(tile.x, tile.y);
  if (enemy && isVisible(enemy.x, enemy.y)) {
    const intent = enemyIntent(enemy);
    const attackPrediction = gridDistance(leader, enemy) <= 1 ? estimateBasicAttackDamage(leader, enemy) : null;
    const movePrediction = moveCanReachTarget(leader, move, tile) ? estimateMoveDamage(leader, move, enemy) : null;
    ui.targetHud.dataset.tone = "danger";
    ui.targetHudKicker.textContent = `${elementInfo(enemy.elementKey).symbol} ${intent?.label || "ENEMY"}`;
    ui.targetHudTitle.textContent = `${enemy.name}　HP ${enemy.hp}/${enemy.maxHp}`;
    ui.targetHudDetail.textContent = `通常 ${attackPrediction ? `${attackPrediction.damage}${attackPrediction.mark}` : "射程外"}　/　${move.name} ${movePrediction ? `${movePrediction.damage}${movePrediction.mark}` : "射程外"}`;
    return;
  }

  const item = itemAt(tile.x, tile.y);
  if (item && isVisible(item.x, item.y)) {
    const catalog = itemCatalog[item.kind];
    ui.targetHud.dataset.tone = item.shopItem ? "shop" : "item";
    ui.targetHudKicker.textContent = item.shopItem ? `SHOP ${item.price} G` : "ITEM";
    ui.targetHudTitle.textContent = item.gear?.name || catalog?.name || "道具";
    ui.targetHudDetail.textContent = item.shopItem ? "商店の敷物を出る前に精算" : (catalog?.detail || catalog?.category || "足元で拾える");
    return;
  }

  const tileType = game.map[tile.y]?.[tile.x];
  ui.targetHudKicker.textContent = tileType === "wall" ? "BLOCKED" : "AIM";
  ui.targetHudTitle.textContent = tileType === "wall" ? "壁に遮られている" : `${tile.x + 1}, ${tile.y + 1} のマス`;
  ui.targetHudDetail.textContent = `${move.name}　${elementInfo(move.element).name} / ${style.label} / ${moveAimShape(move).label}`;
}

function renderParty(rank) {
  ui.party.innerHTML = "";
  for (const actor of game.team) {
    const card = document.createElement("article");
    card.className = `player-card ${actor.down ? "down" : ""}`;
    card.style.borderLeftColor = actor.color;
    const hpRatio = actor.maxHp ? (actor.hp / actor.maxHp) * 100 : 0;
    const expRatio = actor.kind === "recruit" ? 100 : (actor.exp / actor.nextExp) * 100;
    card.innerHTML = `
      <div class="portrait"><canvas width="48" height="48"></canvas></div>
      <div class="player-info">
        <div class="player-head">
          <strong>${actor.evolutionName || actor.name}</strong>
          <span class="type-label">${elementBadgeMarkup(actor.elementKey)}${elementInfo(actor.elementKey).name} / ${actor.kind === "leader" ? `${actor.type}タイプ` : actor.role}</span>
        </div>
        <div class="bar"><div class="bar-fill" style="width:${hpRatio}%; background:${actor.color}"></div></div>
        <div class="player-meta">
          <span>Lv.${actor.level}</span>
          <span>HP ${actor.hp}/${actor.maxHp}</span>
          <span>${actor.kind === "leader" ? `EXP ${Math.floor(expRatio)}%` : (tacticCatalog.find((entry) => entry.key === actor.tactic)?.short || "追従")}</span>
        </div>
      </div>
    `;
    ui.party.appendChild(card);
    drawPortrait(card.querySelector("canvas"), actor);
  }
}

function renderMoves() {
  const leader = getLeader();
  const selected = leader.moves[game.selectedMove];
  ui.moveSummary.innerHTML = `${elementBadgeMarkup(selected.element)}${moveStyleBadgeMarkup(selected.style)}${selected.name} ${selected.pp}/${selected.maxPp}`;
  renderTargetHud();
  if (ui.gameMenuDialog.open) renderGameMenu(game.menuView);
}

function openGameMenu(view = "moves") {
  if ((game.mode !== "dungeon" && view !== "controls") || game.gameOver || game.victory) return;
  renderGameMenu(view);
  if (!ui.gameMenuDialog.open) ui.gameMenuDialog.showModal();
}

function toggleGameMenu(view = "moves") {
  if (game.mode !== "dungeon" && view !== "controls") return;
  if (ui.gameMenuDialog.open) ui.gameMenuDialog.close();
  else openGameMenu(view);
}

function renderGameMenu(view = "moves") {
  game.menuView = view;
  document.querySelectorAll("[data-menu-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.menuView === view);
  });
  ui.gameMenuBody.innerHTML = "";

  if (view === "moves") {
    const leader = getLeader();
    leader.moves.forEach((move, index) => {
      const button = document.createElement("button");
      button.className = `move-button ${index === game.selectedMove ? "active" : ""}`;
      button.type = "button";
      button.innerHTML = `
        <span class="move-key">${index + 1}</span>
        <span class="move-name"><strong>${elementBadgeMarkup(move.element)}${move.name}</strong><span>${moveMetaMarkup(move)}${elementInfo(move.element).name}属性　${move.hint}</span></span>
        <span class="move-pp">${move.pp}/${move.maxPp}</span>
      `;
      button.addEventListener("click", () => {
        performAction({ type: "selectMove", index });
        ui.gameMenuDialog.close();
      });
      ui.gameMenuBody.appendChild(button);
    });
    return;
  }

  if (view === "bag") {
    ui.gameMenuBody.innerHTML = `
      <div class="menu-stat-grid">
        <div class="menu-stat"><span>満腹度</span><strong>${Math.ceil(game.belly)} / 100</strong></div>
        <div class="menu-stat"><span>バッグ</span><strong>${bagTotal()} / ${game.bagCapacity}</strong></div>
      </div>
    `;
    const owned = Object.entries(itemCatalog).filter(
      ([kind, item]) => item.category !== "進化素材" && (game.bag[kind] || 0) > 0,
    );
    if (!owned.length) {
      ui.gameMenuBody.insertAdjacentHTML("beforeend", '<p class="town-note">バッグは空です。</p>');
      return;
    }
    for (const [kind, item] of owned) {
      const canDropHere = !itemAt(getLeader().x, getLeader().y)
        && !(game.stairs && getLeader().x === game.stairs.x && getLeader().y === game.stairs.y)
        && !(game.secretStairs && getLeader().x === game.secretStairs.x && getLeader().y === game.secretStairs.y);
      appendTownEntry(ui.gameMenuBody, {
        title: `${item.name} × ${game.bag[kind]}`,
        detail: item.detail,
        meta: `${item.category}　${item.category === "進化素材" ? "進化画面で消費" : item.automatic ? "倒れた時に自動使用" : "使用すると1ターン消費"}`,
        iconKind: kind,
        buttonLabel: item.automatic ? "自動" : "使う",
        disabled: item.automatic,
        onClick: () => {
          ui.gameMenuDialog.close();
          performAction({ type: "useItem", kind });
        },
        secondaryButtonLabel: "置く",
        secondaryDisabled: !canDropHere,
        secondaryOnClick: () => {
          ui.gameMenuDialog.close();
          performAction({ type: "dropItem", kind });
        },
      });
    }
    return;
  }

  if (view === "ground") {
    renderGroundMenu();
    return;
  }

  if (view === "materials") {
    renderEvolutionMaterialBag();
    return;
  }

  if (view === "relics") {
    renderRelicMenu();
    return;
  }

  if (view === "relicReward") {
    renderRelicReward();
    return;
  }

  if (view === "moveReward") {
    renderMoveReward();
    return;
  }

  if (view === "milestone") {
    renderMilestoneChoice();
    return;
  }

  if (view === "routeChoice") {
    renderRouteChoice();
    return;
  }

  if (view === "floorChoice") {
    renderFloorChoice();
    return;
  }

  if (view === "ascensionReward") {
    renderAscensionReward();
    return;
  }

  if (view === "evolution") {
    renderEvolutionBoard();
    return;
  }

  if (view === "codex") {
    renderCodexMenu();
    return;
  }

  if (view === "skills") {
    renderSkillBoard();
    return;
  }

  if (view === "controls") {
    renderControlsMenu();
    return;
  }

  if (view === "merchant") {
    renderDungeonMerchant();
    return;
  }

  if (view === "casino") {
    renderCasino();
    return;
  }

  if (view === "restStorage") {
    renderRestStorage();
    return;
  }

  if (view === "restService") {
    renderRestService();
    return;
  }

  const nextGateIndex = Math.min(9, Math.floor(game.floor / 10));
  const nextBoss = towerBossCatalog[nextGateIndex];
  const nextBossTheme = bossThemeCatalog[nextGateIndex];
  const routePlan = currentRoutePlan();
  ui.gameMenuBody.innerHTML = `
    <p class="town-note">10の門番と休憩所を越え、B100Fの星核を目指します。通常階段は床に見えており、隠されているのは罠と星裏の祭壇だけです。</p>
    <div class="menu-stat-grid">
      <div class="menu-stat"><span>現在地</span><strong>B${game.floor}F / B${game.targetFloor}F</strong></div>
      <div class="menu-stat"><span>階の目的</span><strong>${game.mission?.boss && !game.mission.complete ? "門番を倒す" : "通常階段へ進む"}</strong></div>
      <div class="menu-stat"><span>次の門番</span><strong>${nextBoss?.name || "星喰皇ゼロム"}</strong></div>
      <div class="menu-stat"><span>門番作戦</span><strong>${nextBossTheme?.plan || "不明"}</strong></div>
      <div class="menu-stat"><span>次の休憩</span><strong>B${Math.min(100, Math.ceil((game.floor + 1) / 10) * 10)}F</strong></div>
      <div class="menu-stat"><span>ルート</span><strong>${routePlan?.name || "未選択"}</strong></div>
      <div class="menu-stat"><span>フロア運勢</span><strong>${game.floorEvent?.name || "平穏"}</strong></div>
      <div class="menu-stat"><span>運勢の効果</span><strong>${game.floorEvent?.detail || "-"}</strong></div>
    </div>
    ${nextBossTheme ? `<section class="boss-plan-card"><b>${elementBadgeMarkup(nextBossTheme.elementKey)}${elementInfo(nextBossTheme.elementKey).name}</b><strong>${nextBossTheme.plan}</strong><span>${nextBossTheme.warning}</span></section>` : ""}
    ${routeChoiceNeeded() ? '<button type="button" class="primary-button route-open-button">この区画のルートを選ぶ</button>' : ""}
    ${game.pendingFloorChoice ? '<button type="button" class="secondary-button floor-event-open-button">この階の出来事を選ぶ</button>' : ""}
  `;
  ui.gameMenuBody.querySelector(".route-open-button")?.addEventListener("click", () => renderGameMenu("routeChoice"));
  ui.gameMenuBody.querySelector(".floor-event-open-button")?.addEventListener("click", () => renderGameMenu("floorChoice"));
}

function renderControlsMenu() {
  ui.gameMenuBody.innerHTML = `
    <div class="controls-menu-head">
      <div>
        <span>KEY CONFIG</span>
        <strong>操作設定</strong>
        <small>変更を押してから、割り当てたいキーを1つ押してください。方向キーとテンキーは補助操作として常に使えます。</small>
      </div>
      <button type="button" class="secondary-button controls-reset">初期設定に戻す</button>
    </div>
    <div class="control-bind-list"></div>
  `;
  const list = ui.gameMenuBody.querySelector(".control-bind-list");
  for (const entry of controlActionCatalog) {
    const waiting = pendingControlAction === entry.key;
    const row = document.createElement("div");
    row.className = `control-bind-row ${waiting ? "waiting" : ""}`;
    row.innerHTML = `
      <span>${entry.label}</span>
      <kbd>${waiting ? "入力待ち" : controlKeyLabel(controlBindings[entry.key])}</kbd>
      <button type="button">${waiting ? "Escで中止" : "変更"}</button>
    `;
    row.querySelector("button").addEventListener("click", () => {
      pendingControlAction = entry.key;
      renderControlsMenu();
    });
    list.appendChild(row);
  }
  ui.gameMenuBody.querySelector(".controls-reset").addEventListener("click", () => {
    pendingControlAction = null;
    controlBindings = defaultControlBindings();
    saveControlBindings();
    renderControlsMenu();
    showToast("操作設定を初期化した");
  });
}

function renderGroundMenu() {
  const leader = getLeader();
  const footItem = itemAt(leader.x, leader.y);
  const footTrap = game.traps.find((trap) => trap.x === leader.x && trap.y === leader.y);
  const onStairs = leader.x === game.stairs.x && leader.y === game.stairs.y;
  const onSecret = game.secretStairs
    && leader.x === game.secretStairs.x
    && leader.y === game.secretStairs.y;
  const onMission = game.mission
    && !game.mission.complete
    && leader.x === game.mission.x
    && leader.y === game.mission.y;
  let entries = 0;

  ui.gameMenuBody.innerHTML = `
    <div class="menu-stat-grid">
      <div class="menu-stat"><span>現在座標</span><strong>${leader.x + 1}, ${leader.y + 1}</strong></div>
      <div class="menu-stat"><span>地面</span><strong>${game.floorKind.includes("rest") ? "休憩所の床" : "塔の石床"}</strong></div>
    </div>
  `;

  if (footItem) {
    const catalog = itemCatalog[footItem.kind];
    const gear = footItem.kind === "gear" ? footItem.gear : null;
    const bagBlocked = !gear
      && catalog
      && catalog.category !== "進化素材"
      && !["badge", "stardust"].includes(footItem.kind)
      && bagTotal() >= game.bagCapacity;
    appendTownEntry(ui.gameMenuBody, {
      title: gear?.name || catalog?.name || "見知らぬ落とし物",
      detail: gear ? gearStatText(gear) : catalog?.detail || "足元に何か落ちている。",
      meta: bagBlocked
        ? `バッグ ${bagTotal()}/${game.bagCapacity}　空きがない`
        : footItem.shopItem ? `${footItem.price}星貨　拾うと未精算` : "足元に落ちている",
      iconKind: gear ? undefined : footItem.kind,
      iconGear: gear,
      buttonLabel: bagBlocked ? "満杯" : "拾う",
      disabled: bagBlocked,
      onClick: () => {
        ui.gameMenuDialog.close();
        pickUpItem();
        updateAll();
      },
    });
    entries += 1;
  }

  if (onStairs) {
    const sealed = !game.mission?.complete;
    appendTownEntry(ui.gameMenuBody, {
      title: sealed ? "封印された階段" : `B${game.floor + 1}Fへの階段`,
      detail: sealed ? "この階の目的を達成すると封印が解ける。" : "次の階へ進む。現在の階には戻れない。",
      meta: "通常階段",
      iconKind: "stairs",
      buttonLabel: sealed ? "封印中" : "進む",
      disabled: sealed,
      onClick: () => {
        ui.gameMenuDialog.close();
        tryUseStairs();
      },
    });
    entries += 1;
  }

  if (onSecret) {
    appendTownEntry(ui.gameMenuBody, {
      title: game.secretStairs.used ? "静まった隠し祭壇" : "星裏の隠し祭壇",
      detail: game.secretStairs.used ? "祭壇の力はすでに受け取った。" : "進化か、強力な星遺物を追加で選べる。",
      meta: "通常の階段とは別の寄り道",
      iconKind: "stairs",
      buttonLabel: game.secretStairs.used ? "使用済み" : "祈る",
      disabled: game.secretStairs.used,
      onClick: () => {
        openMilestoneChoice("secret");
      },
    });
    entries += 1;
  }

  if (footTrap && (footTrap.revealed || footTrap.used)) {
    appendTownEntry(ui.gameMenuBody, {
      title: `${trapName(footTrap.kind)}${footTrap.used ? "の跡" : ""}`,
      detail: footTrap.used ? "すでに作動し、効力を失っている。" : "踏むと作動する発見済みの罠。",
      meta: footTrap.used ? "使用済み" : "危険",
      iconKind: "trap",
    });
    entries += 1;
  }

  if (onMission) {
    appendTownEntry(ui.gameMenuBody, {
      title: game.mission.target || "この階の目的",
      detail: game.mission.message || "目的の対象がここにいる。",
      meta: "探索目標",
    });
    entries += 1;
  }

  if (!entries) {
    ui.gameMenuBody.insertAdjacentHTML(
      "beforeend",
      '<p class="town-note">足元には拾えるものも、作動する仕掛けもない。</p>',
    );
  }
}

function renderEvolutionMaterialBag() {
  ui.gameMenuBody.innerHTML = `
    <div class="material-bag-head">
      <div class="material-bag-mark">核</div>
      <div>
        <span>容量無制限</span>
        <strong>進化素材袋</strong>
        <small>通常のバッグ枠を使いません。挑戦終了時にすべて失われます。</small>
      </div>
      <b>${evolutionMaterialTotal()}個</b>
    </div>
    <div class="material-bag-list"></div>
  `;
  const list = ui.gameMenuBody.querySelector(".material-bag-list");
  for (const kind of evolutionMaterialKeys) {
    const item = itemCatalog[kind];
    appendTownEntry(list, {
      title: `${item.name} × ${game.evolutionBag[kind] || 0}`,
      detail: item.detail,
      meta: "この挑戦中のみ保持",
      iconKind: kind,
    });
  }
}

function renderRelicMenu() {
  ui.gameMenuBody.innerHTML = `
    <div class="relic-head">
      <div class="relic-head-mark">遺</div>
      <div><span>この挑戦だけの力</span><strong>所持星遺物 ${game.relics.length}</strong><small>装備枠はありません。獲得した効果はすべて同時に働きます。</small></div>
    </div>
    <div class="relic-grid"></div>
  `;
  const grid = ui.gameMenuBody.querySelector(".relic-grid");
  if (!game.relics.length) {
    grid.innerHTML = '<p class="town-note">まだ星遺物はありません。休憩所前の門番を倒すと、3つから1つ選べます。</p>';
    return;
  }
  for (const key of game.relics) {
    const relic = relicCatalog.find((entry) => entry.key === key);
    if (!relic) continue;
    grid.insertAdjacentHTML("beforeend", relicCardMarkup(relic));
  }
}

function renderRelicRibbon() {
  if (!ui.relicRibbon) return;
  if (!game.relics.length) {
    ui.relicRibbon.innerHTML = '<span class="relic-ribbon-empty">星遺物 0</span>';
    return;
  }
  const visible = game.relics.slice(0, 9);
  ui.relicRibbon.innerHTML = visible.map((key) => {
    const relic = relicCatalog.find((entry) => entry.key === key);
    if (!relic) return "";
    return `<button type="button" title="${relic.name}: ${relic.detail}" aria-label="${relic.name}">
      <i style="${relicIconStyle(relic)}"></i>
    </button>`;
  }).join("") + (game.relics.length > visible.length ? `<b>+${game.relics.length - visible.length}</b>` : "");
  ui.relicRibbon.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => openGameMenu("relics"));
  });
}

function renderRelicReward() {
  const sourceLabel = game.milestoneSource === "secret"
    ? "隠し祭壇"
    : game.milestoneSource
      ? "休憩所の選択"
      : "門番撃破報酬";
  ui.gameMenuBody.innerHTML = `
    <div class="relic-reward-head">
      <span>${sourceLabel}</span>
      <strong>星遺物を1つ選ぶ</strong>
      <small>どれを取るかで、この先の物理・魔法・生存戦略が変わります。</small>
    </div>
    <p class="relic-reward-note">左上の星遺物リボンに追加され、効果は装備枠なしで全部同時に働きます。</p>
    <div class="relic-choice-grid"></div>
  `;
  const grid = ui.gameMenuBody.querySelector(".relic-choice-grid");
  for (const key of game.pendingRelicChoices) {
    const relic = relicCatalog.find((entry) => entry.key === key);
    if (!relic) continue;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "relic-choice";
    card.innerHTML = relicCardMarkup(relic);
    card.addEventListener("click", () => {
      addRelic(relic.key);
      if (game.milestoneSource) {
        finalizeMilestoneChoice();
        return;
      }
      game.pendingRelicChoices = [];
      game.rewardPending = false;
      if (isRestFloor(game.floor) && game.restChoiceTaken) {
        captureTowerCheckpoint(Math.min(100, game.floor + 1));
        saveCurrentGame(true);
      }
      if (ui.gameMenuDialog.open) ui.gameMenuDialog.close();
      updateAll();
    });
    grid.appendChild(card);
  }
}

function relicCardMarkup(relic) {
  return `<article class="relic-card" style="--relic-color:${relic.color}">
    <i class="relic-art" style="${relicIconStyle(relic)}"></i>
    <div><span>${relic.rarity}</span><strong>${relic.name}</strong><small>${relic.detail}</small></div>
  </article>`;
}

function openRelicReward() {
  if (!game.rewardPending || !game.pendingRelicChoices.length) return;
  openGameMenu("relicReward");
}

function openMoveReward() {
  if (!game.pendingMovePicks || !game.pendingMoveChoices.length) return;
  openGameMenu("moveReward");
}

function renderMoveReward() {
  const leader = getLeader();
  ui.gameMenuBody.innerHTML = `
    <div class="relic-reward-head move-reward-head">
      <span>NEW TECHNIQUE</span>
      <strong>新しい技を1つ選ぶ</strong>
      <small>技は最大4枠。レベルアップや特別な出来事で習得します。</small>
    </div>
    <div class="move-choice-grid"></div>
  `;
  const grid = ui.gameMenuBody.querySelector(".move-choice-grid");
  for (const key of game.pendingMoveChoices) {
    const move = moveCatalog.find((entry) => entry.key === key);
    if (!move) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `move-choice ${move.style}`;
    button.innerHTML = `
      <b style="color:${elementInfo(move.element).color}">${elementInfo(move.element).symbol}</b>
      <span><strong>${elementBadgeMarkup(move.element)}${move.name}</strong><small>${moveMetaMarkup(move)}${elementInfo(move.element).name}属性　${move.hint}</small><em>PP ${move.maxPp}</em></span>
    `;
    button.addEventListener("click", () => learnMoveChoice(key));
    grid.appendChild(button);
  }
}

function openMilestoneChoice(source = "rest") {
  game.milestoneSource = source;
  openGameMenu("milestone");
}

function renderMilestoneChoice() {
  const leader = getLeader();
  const sourceLabel = game.milestoneSource === "secret" ? "隠し祭壇" : `B${game.floor}F 休憩所`;
  const canEvolve = (leader.evolutionStage || 0) < 10;
  ui.gameMenuBody.innerHTML = `
    <div class="milestone-head">
      <span>${sourceLabel}</span>
      <strong>この先へ持っていく力を選ぶ</strong>
      <small>進化は姿と能力を変え、星遺物は今回の戦略を大きく曲げます。</small>
    </div>
    <div class="milestone-grid">
      <button type="button" data-milestone="evolve" ${canEvolve ? "" : "disabled"}>
        <b>進</b><span><strong>${canEvolve ? `第${leader.evolutionStage + 1}段階へ進化` : "最終進化済み"}</strong><small>${canEvolve ? "段階ごとに変わる候補から選ぶ" : "これ以上は進化できない"}</small></span>
      </button>
      <button type="button" data-milestone="relic">
        <b>遺</b><span><strong>強力な星遺物</strong><small>RARE以上を含む3候補から1つ</small></span>
      </button>
      <button type="button" data-milestone="move">
        <b>技</b><span><strong>選択中の技を強化</strong><small>${leader.moves[game.selectedMove]?.name || "技"}の威力とPPを伸ばす</small></span>
      </button>
      <button type="button" data-milestone="supply">
        <b>袋</b><span><strong>補給とバッグ拡張</strong><small>HP/PP回復、バッグ容量+2、満腹度回復</small></span>
      </button>
    </div>
  `;
  ui.gameMenuBody.querySelector('[data-milestone="evolve"]').addEventListener("click", () => {
    game.pendingAscensionChoices = createAscensionChoices(leader);
    renderGameMenu("ascensionReward");
  });
  ui.gameMenuBody.querySelector('[data-milestone="relic"]').addEventListener("click", () => {
    game.pendingRelicChoices = rollRelicChoices(3, "RARE");
    game.rewardPending = true;
    renderGameMenu("relicReward");
  });
  ui.gameMenuBody.querySelector('[data-milestone="move"]').addEventListener("click", () => chooseMilestoneMoveUpgrade());
  ui.gameMenuBody.querySelector('[data-milestone="supply"]').addEventListener("click", () => chooseMilestoneSupply());
}

function chooseMilestoneMoveUpgrade() {
  const leader = getLeader();
  const move = leader.moves[game.selectedMove];
  if (!move) return;
  move.maxPp += 2;
  move.pp = move.maxPp;
  move.powerBonus = Math.min(0.45, (move.powerBonus || 0) + 0.15);
  if (game.milestoneSource === "rest") game.restChoiceTaken = true;
  addEffect("runes", leader.x, leader.y, elementInfo(move.element).color);
  addLog(`${move.name}を磨いた。威力+15%、最大PP+2。`);
  announceEvent("技強化", `${move.name}　威力+15% / PP+2`, "技", "good");
  playSfx("upgrade");
  finalizeMilestoneChoice();
}

function chooseMilestoneSupply() {
  const leader = getLeader();
  leader.hp = leader.maxHp;
  restoreAllPp();
  game.belly = 100;
  game.bagCapacity = Math.min(MAX_BAG_CAPACITY, game.bagCapacity + 2);
  if (game.milestoneSource === "rest") game.restChoiceTaken = true;
  addEffect("healBurst", leader.x, leader.y, "#9ee88c");
  addLog(`補給を選んだ。HP/PP/満腹度が回復し、バッグ容量が${game.bagCapacity}になった。`);
  announceEvent("補給", `バッグ容量 ${game.bagCapacity}/${MAX_BAG_CAPACITY}`, "袋", "good");
  playSfx("pickup");
  finalizeMilestoneChoice();
}

function routeChoiceNeeded() {
  return game.mode === "dungeon"
    && !game.gameOver
    && !game.victory
    && !game.floorKind.includes("rest")
    && game.floor % 10 === 1
    && !currentRoutePlan();
}

function queueRouteChoiceIfNeeded(delay = 180) {
  if (!routeChoiceNeeded()) return;
  window.setTimeout(() => {
    if (!routeChoiceNeeded() || ui.gameMenuDialog.open || ui.levelDialog.open || ui.restDialog.open) return;
    openGameMenu("routeChoice");
  }, delay);
}

function rollRouteChoices(count = 3) {
  const pool = [...routeCatalog];
  const choices = [];
  while (choices.length < count && pool.length) {
    const index = randInt(0, pool.length - 1);
    choices.push(pool.splice(index, 1)[0].key);
  }
  return choices;
}

function renderRouteChoice() {
  const segment = routeSegmentForFloor();
  if (!game.pendingRouteChoices.length || !routeChoiceNeeded()) {
    game.pendingRouteChoices = currentRoutePlan() ? [currentRoutePlan().key] : rollRouteChoices(3);
  }
  const current = currentRoutePlan();
  ui.gameMenuBody.innerHTML = `
    <div class="route-choice-head">
      <span>ROUTE ${segment + 1}/10</span>
      <strong>${current ? "この区画の道筋" : "次の10階の道筋を選ぶ"}</strong>
      <small>${current ? current.detail : "敵の量、道具、商店、変異種、隠し祭壇の出やすさが変わります。選んだ道はこの区画の門番まで続きます。"}</small>
    </div>
    <div class="route-choice-grid"></div>
  `;
  const grid = ui.gameMenuBody.querySelector(".route-choice-grid");
  const keys = current ? [current.key] : game.pendingRouteChoices;
  for (const key of keys) {
    const route = routeCatalog.find((entry) => entry.key === key);
    if (!route) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `route-card ${current?.key === route.key ? "selected" : ""}`;
    button.style.setProperty("--route-color", route.color);
    button.innerHTML = `
      <b>${route.icon}</b>
      <span><strong>${route.name}</strong><small>${route.detail}</small><em>${routeMetaText(route)}</em></span>
    `;
    button.disabled = Boolean(current);
    button.addEventListener("click", () => chooseRoutePlan(route.key));
    grid.appendChild(button);
  }
}

function routeMetaText(route) {
  return [
    route.enemyBonus ? `敵 ${route.enemyBonus > 0 ? "+" : ""}${route.enemyBonus}` : "",
    route.itemBonus ? `道具 ${route.itemBonus > 0 ? "+" : ""}${route.itemBonus}` : "",
    route.expBonus ? `経験 +${Math.round(route.expBonus * 100)}%` : "",
    route.shopBonus ? "商店増" : "",
    route.secretBonus ? "祭壇増" : "",
    route.mutationBonus ? "変異増" : "",
    route.bossReward ? "ボス報酬強化" : "",
  ].filter(Boolean).join(" / ") || "標準";
}

function chooseRoutePlan(key) {
  const route = routeCatalog.find((entry) => entry.key === key);
  if (!route || !routeChoiceNeeded()) return;
  const segment = routeSegmentForFloor();
  game.routePlan[segment] = route.key;
  game.pendingRouteChoices = [];
  game.runStats.routeChoices += 1;
  if (route.karmaBonus) game.karma += route.karmaBonus;
  applyRouteImmediateEffects(route);
  addLog(`区画${segment + 1}の道筋に「${route.name}」を選んだ。${route.detail}`);
  announceEvent("ROUTE", `${route.name}　${route.detail}`, route.icon, "mystic");
  playSfx("pickup");
  if (ui.gameMenuDialog.open) ui.gameMenuDialog.close();
  updateAll();
  queueFloorChoiceIfNeeded(220);
}

function applyRouteImmediateEffects(route) {
  if (route.itemBonus > 0) {
    for (let index = 0; index < Math.min(2, route.itemBonus); index += 1) {
      const point = randomOpenTile();
      if (!point) continue;
      const kind = weighted([
        { value: "oran", weight: 4 },
        { value: "elixir", weight: 3 },
        { value: "focusMint", weight: 3 },
        { value: "fortuneOrb", weight: 2 },
      ]);
      game.items.push({ id: cryptoId(), kind, x: point.x, y: point.y });
    }
  }
  if (route.enemyBonus > 0) {
    for (let index = 0; index < Math.min(2, route.enemyBonus); index += 1) {
      const point = randomEnemySpawnTile(7);
      if (point) game.enemies.push(createEnemy(randomEnemyProfile(), point, false));
    }
  }
  if (route.secretBonus && !game.secretStairs && game.floor >= 3 && Math.random() < 0.65) {
    const point = randomOpenTile();
    if (point) game.secretStairs = { x: point.x, y: point.y, revealed: false, used: false };
  }
}

function queueFloorChoiceIfNeeded(delay = 360) {
  if (!game.floorEvent?.choice || game.pendingFloorChoice || game.floorKind.includes("rest")) return;
  game.pendingFloorChoice = { key: game.floorEvent.choice };
  window.setTimeout(() => {
    if (!game.pendingFloorChoice || ui.gameMenuDialog.open || ui.levelDialog.open || ui.restDialog.open) return;
    openGameMenu("floorChoice");
  }, delay);
}

function renderFloorChoice() {
  if (!game.pendingFloorChoice) {
    ui.gameMenuBody.innerHTML = '<p class="town-note">この階で選べる出来事はありません。</p>';
    return;
  }
  const shrine = game.pendingFloorChoice.key === "shrine";
  const choices = shrine
    ? [
        { key: "relic", icon: "遺", title: "HPを捧げて星遺物", detail: "最大HPの18%を失い、RARE候補を得る。", danger: true },
        { key: "material", icon: "咎", title: "カルマを受け入れる", detail: "カルマ+3。進化素材を2つ得る。", danger: true },
        { key: "leave", icon: "退", title: "何もしない", detail: "祭壇を無視して探索を続ける。" },
      ]
    : [
        { key: "heal", icon: "休", title: "息を整える", detail: "HPと満腹度を少し回復する。" },
        { key: "item", icon: "拾", title: "落とし物を探す", detail: "バッグに入る道具を1つ得る。" },
        { key: "hunt", icon: "戦", title: "強敵の気配を追う", detail: "敵を呼ぶ代わりに経験値を狙う。", danger: true },
      ];
  ui.gameMenuBody.innerHTML = `
    <div class="route-choice-head">
      <span>FLOOR EVENT</span>
      <strong>${shrine ? "咎星の祭壇" : "星見の分岐"}</strong>
      <small>${shrine ? "強い力には代償がある。取るか退くかを選ぼう。" : "この階だけの小さな選択。状況に合わせて得を取りにいけます。"}</small>
    </div>
    <div class="route-choice-grid floor-choice-grid"></div>
  `;
  const grid = ui.gameMenuBody.querySelector(".floor-choice-grid");
  for (const choice of choices) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `route-card ${choice.danger ? "danger" : ""}`;
    button.innerHTML = `<b>${choice.icon}</b><span><strong>${choice.title}</strong><small>${choice.detail}</small></span>`;
    button.addEventListener("click", () => chooseFloorEvent(choice.key));
    grid.appendChild(button);
  }
}

function chooseFloorEvent(key) {
  if (!game.pendingFloorChoice) return;
  const leader = getLeader();
  if (key === "heal") {
    const healed = healActor(leader, Math.max(10, Math.floor(leader.maxHp * 0.22)));
    game.belly = clamp(game.belly + 16, 0, 100);
    addFloatingText(leader.x, leader.y, `+${healed}`, "#9ee88c");
    addLog("星見の分岐で息を整えた。HPと満腹度が回復した。");
  } else if (key === "item") {
    const kind = weighted([
      { value: "oran", weight: 4 },
      { value: "elixir", weight: 3 },
      { value: "pierceSeed", weight: 3 },
      { value: "mapScroll", weight: 2 },
      { value: "fortuneOrb", weight: 1 },
    ]);
    if (bagTotal() < game.bagCapacity) game.bag[kind] = (game.bag[kind] || 0) + 1;
    else {
      const point = findDropTile(leader.x, leader.y);
      game.items.push({ id: cryptoId(), kind, x: point.x, y: point.y });
    }
    addLog(`星見の分岐で${itemCatalog[kind].name}を見つけた。`);
  } else if (key === "hunt") {
    for (let index = 0; index < 3; index += 1) {
      const point = randomEnemySpawnTile(6);
      if (!point) continue;
      const enemy = createEnemy(randomEnemyProfile(), point, true);
      enemy.exp = Math.ceil(enemy.exp * 1.35);
      game.enemies.push(enemy);
    }
    addLog("強敵の気配を追った。経験値の高い敵が近くに現れた。");
  } else if (key === "relic") {
    const cost = Math.max(1, Math.floor(leader.maxHp * 0.18));
    leader.hp = Math.max(1, leader.hp - cost);
    game.pendingRelicChoices = rollRelicChoices(3, "RARE");
    game.rewardPending = true;
    game.pendingFloorChoice = null;
    game.runStats.floorChoices += 1;
    addLog(`祭壇にHP${cost}を捧げ、星遺物の候補が現れた。`);
    renderGameMenu("relicReward");
    return;
  } else if (key === "material") {
    game.karma += 3;
    for (let index = 0; index < 2; index += 1) {
      const material = evolutionMaterialKeys[randInt(0, evolutionMaterialKeys.length - 1)];
      game.evolutionBag[material] = (game.evolutionBag[material] || 0) + 1;
    }
    addLog("咎星の祭壇を受け入れた。カルマが増え、進化素材を得た。");
  } else {
    addLog("祭壇には触れず、探索を続けることにした。");
  }
  game.pendingFloorChoice = null;
  game.runStats.floorChoices += 1;
  announceEvent("FLOOR EVENT", "選択を終えた", "選", key === "hunt" || key === "material" ? "danger" : "good");
  playSfx(key === "hunt" || key === "material" ? "warning" : "pickup");
  if (ui.gameMenuDialog.open) ui.gameMenuDialog.close();
  updateAll();
}

function createAscensionChoices(actor) {
  const profile = characterCatalog.find((entry) => entry.key === actor.profileKey) || characterCatalog[0];
  const stage = clamp((actor.evolutionStage || 0) + 1, 1, 10);
  const behaviorPlan = behaviorAscensionBranches(profile.key);
  const plan = [
    ...behaviorPlan,
    ...(ascensionStagePlans[profile.key]?.[stage - 1] || ["fang", "lumen", "shade"]),
  ];
  const choices = [...new Set(plan)]
    .map((branchKey) => createAscensionChoice(profile, actor, branchKey, stage))
    .filter(Boolean);
  if (game.karma >= 6 && !choices.some((choice) => choice.branch === "karma")) {
    const karmaChoice = createAscensionChoice(profile, actor, "karma", stage);
    if (karmaChoice) choices.push(karmaChoice);
  }
  if (!choices.length) {
    return (ascensionBranches[profile.key] || ascensionBranches.kohaku)
      .slice(0, 2)
      .map((branch) => createAscensionChoice(profile, actor, branch.key, stage))
      .filter(Boolean);
  }
  return choices.slice(0, 4);
}

function behaviorAscensionBranches(profileKey) {
  const stats = game.runStats || createRunStats();
  const keys = [];
  const physicalLead = stats.physicalUses - stats.magicUses;
  const magicLead = stats.magicUses - stats.physicalUses;
  const physicalBranch = { kohaku: "fang", knight: "warlord", magician: "chaos" }[profileKey] || "fang";
  const magicBranch = { kohaku: "lumen", knight: "guardian", magician: "archmage" }[profileKey] || "lumen";
  const trickBranch = { kohaku: "shade", knight: "revenant", magician: "void" }[profileKey] || "shade";
  if (physicalLead >= 8 || stats.kills >= 18) keys.push(physicalBranch);
  if (magicLead >= 8 || stats.elementCombos >= 3) keys.push(magicBranch);
  if (stats.thefts > 0 || stats.trapsTriggered >= 3 || stats.itemUses >= 8) keys.push(trickBranch);
  if (!game.startingRelicKey && stats.floorsCleared >= 8) keys.push("ascetic");
  if (game.relics.length >= 3) keys.push("relic");
  if (game.karma >= 6) keys.push("karma");
  return keys;
}

function createAscensionChoice(profile, actor, branchKey, stage) {
  if (branchKey === "ascetic") {
    if (game.startingRelicKey) return null;
    return {
      key: `${profile.key}-ascetic-${stage}`,
      branch: "ascetic",
      label: "無印",
      path: "ascetic",
      color: "#f1d487",
      elementKey: "light",
      stage,
      name: `${asceticNames[stage - 1]}${profile.name}`,
      detail: "初期星遺物を持たずに出た者だけの、均衡と幸運の進化。",
      bonus: { hp: 6, atk: 2, magic: 2, def: 1, res: 1, luck: 1 },
      condition: "初期星遺物なし",
      artIndex: ascensionArtIndex(profile.key, "ascetic", stage),
      moveKey: ascensionMoveKey(profile.key, "ascetic", stage),
    };
  }

  if (branchKey === "relic") {
    const relic = relicCatalog.find((entry) => game.relics.includes(entry.key))
      || relicCatalog.find((entry) => entry.key === game.startingRelicKey);
    if (!relic) return null;
    return {
      key: `${profile.key}-relic-${relic.key}-${stage}`,
      branch: `relic-${relic.key}`,
      label: "遺物共鳴",
      path: "relic",
      color: relic.color,
      elementKey: actor.elementKey,
      stage,
      name: `${relic.name}・${stage}環`,
      detail: `${relic.name}を所持している時だけ現れる共鳴進化。`,
      bonus: { hp: 5, atk: 2, magic: 2, def: 1, res: 1 },
      condition: `${relic.name}を所持`,
      artIndex: ascensionArtIndex(profile.key, "relic", stage),
      moveKey: ascensionMoveKey(profile.key, "relic", stage),
    };
  }

  if (branchKey === "karma") {
    if (game.karma < 6) return null;
    return {
      key: `${profile.key}-karma-${stage}`,
      branch: "karma",
      label: "咎星",
      path: "trick",
      color: "#8d55d7",
      elementKey: "dark",
      stage,
      name: `${karmaNames[stage - 1]}${profile.name}`,
      detail: "カルマが深い時だけ現れる、闇と毒の進化。火力は高いが道を選ぶ。",
      bonus: { hp: 4, atk: 2, magic: 3, def: 0, res: 1 },
      condition: `カルマ ${game.karma}/6以上`,
      artIndex: ascensionArtIndex(profile.key, "karma", stage),
      moveKey: ascensionMoveKey(profile.key, "karma", stage),
    };
  }

  const branch = (ascensionBranches[profile.key] || ascensionBranches.kohaku)
    .find((entry) => entry.key === branchKey);
  if (!branch) return null;
  return {
    key: `${profile.key}-${branch.key}-${stage}`,
    branch: branch.key,
    label: branch.label,
    path: branch.path,
    color: branch.color,
    elementKey: lineageElementKey(profile.key, branch.key, profile.elementKey),
    stage,
    name: branch.names[stage - 1],
    detail: ascensionDetail(branch.path),
    bonus: ascensionBonus(branch.path, stage),
    artIndex: ascensionArtIndex(profile.key, branch.key, stage),
    moveKey: ascensionMoveKey(profile.key, branch.key, stage),
  };
}

function ascensionDetail(path) {
  return {
    physical: "物理攻撃と最大HPを大きく伸ばす。",
    magic: "魔力と魔防を伸ばし、術式を強める。",
    guard: "最大HP・防御・魔防をまとめて伸ばす。",
    trick: "物理と魔法を両立し、運を引き寄せる。",
  }[path] || "全能力を少しずつ伸ばす。";
}

function ascensionBonus(path, stage) {
  const scale = stage >= 7 ? 1 : 0;
  if (path === "physical") return { hp: 6 + scale * 2, atk: 3 + scale, magic: 0, def: 1, res: 0 };
  if (path === "magic") return { hp: 4 + scale, atk: 0, magic: 3 + scale, def: 0, res: 1 };
  if (path === "guard") return { hp: 8 + scale * 2, atk: 1, magic: 0, def: 2 + scale, res: 2 };
  return { hp: 5 + scale, atk: 1 + scale, magic: 2, def: 1, res: 1, luck: 1 };
}

function renderAscensionReward() {
  const leader = getLeader();
  ui.gameMenuBody.innerHTML = `
    <div class="milestone-head ascension-head">
      <span>EVOLUTION ${leader.evolutionStage + 1}/10</span>
      <strong>進化先を選ぶ</strong>
      <small>どの段階でも道を変えられます。最後に選んだ系統が姿へ強く表れます。</small>
    </div>
    <div class="ascension-choice-grid"></div>
  `;
  const grid = ui.gameMenuBody.querySelector(".ascension-choice-grid");
  for (const choice of game.pendingAscensionChoices) {
    const learnedMove = moveCatalog.find((move) => move.key === choice.moveKey);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "ascension-choice";
    card.style.setProperty("--ascension-color", choice.color);
    card.innerHTML = `
      <canvas width="160" height="160" aria-hidden="true"></canvas>
      <span>${elementBadgeMarkup(choice.elementKey)}${elementInfo(choice.elementKey).name}属性 / ${choice.label} / 第${choice.stage}段階</span>
      <strong>${choice.name}</strong>
      <small>${choice.detail}</small>
      ${learnedMove ? `<em>${elementBadgeMarkup(learnedMove.element)}${moveStyleBadgeMarkup(learnedMove.style)}新技 ${learnedMove.name} / ${moveAimShape(learnedMove).label} / ${learnedMove.hint}</em>` : ""}
      <b>${formatAscensionBonus(choice.bonus)}</b>
      ${choice.condition ? `<em>${choice.condition}</em>` : ""}
    `;
    const preview = { ...leader, evolutionBranch: choice.branch, evolutionStage: choice.stage, artIndex: choice.artIndex };
    drawPortrait(card.querySelector("canvas"), preview);
    card.addEventListener("click", () => applyAscensionChoice(choice));
    grid.appendChild(card);
  }
}

function formatAscensionBonus(bonus) {
  return [
    bonus.hp ? `HP+${bonus.hp}` : "",
    bonus.atk ? `物+${bonus.atk}` : "",
    bonus.magic ? `魔+${bonus.magic}` : "",
    bonus.def ? `防+${bonus.def}` : "",
    bonus.res ? `魔防+${bonus.res}` : "",
  ].filter(Boolean).join(" ");
}

function learnEvolutionMove(actor, choice, announce = false) {
  const move = moveCatalog.find((entry) => entry.key === choice?.moveKey);
  if (!move) return null;
  const knownIndex = actor.moves.findIndex((entry) => entry.key === move.key);
  if (knownIndex >= 0) {
    actor.moves[knownIndex].pp = actor.moves[knownIndex].maxPp;
    if (actor === getLeader()) game.selectedMove = knownIndex;
    return move;
  }
  const previousEvolutionIndex = actor.moves.findIndex((entry) => String(entry.key).startsWith("asc-"));
  const nextMove = createKnownMove(move);
  let slot = previousEvolutionIndex;
  if (slot < 0 && actor.moves.length < 4) slot = actor.moves.length;
  if (slot < 0) slot = actor.moves.length - 1;
  const replaced = actor.moves[slot];
  actor.moves[slot] = nextMove;
  if (actor === getLeader()) game.selectedMove = slot;
  if (announce) announceEvent("進化技", `${move.name}${replaced ? `を${replaced.name}と入れ替えた` : "を覚えた"}`, "技", "good");
  return move;
}

function applyAscensionChoice(choice) {
  const leader = getLeader();
  leader.evolutionStage = choice.stage;
  leader.evolutionBranch = choice.branch;
  leader.evolutionName = choice.name;
  leader.artIndex = choice.artIndex;
  delete leader.artColumn;
  leader.color = choice.color;
  leader.elementKey = choice.elementKey;
  leader.maxHp += choice.bonus.hp || 0;
  leader.hp = Math.min(leader.maxHp, leader.hp + (choice.bonus.hp || 0) + 8);
  leader.atk += choice.bonus.atk || 0;
  leader.magic += choice.bonus.magic || 0;
  leader.def += choice.bonus.def || 0;
  leader.res += choice.bonus.res || 0;
  game.luck += choice.bonus.luck || 0;
  leader.ascensionHistory = [...(leader.ascensionHistory || []), choice.key];
  const learnedMove = learnEvolutionMove(leader, choice);
  if (!game.unlockedAscensions.includes(choice.key)) game.unlockedAscensions.push(choice.key);
  const previousLineage = game.persistentLineages[leader.profileKey] || { bonus: {} };
  game.persistentLineages[leader.profileKey] = {
    stage: leader.evolutionStage,
    branch: leader.evolutionBranch,
    name: leader.evolutionName,
    artIndex: leader.artIndex,
    color: leader.color,
    elementKey: leader.elementKey,
    moveKey: choice.moveKey,
    history: [...leader.ascensionHistory],
    bonus: {
      hp: (Number(previousLineage.bonus?.hp) || 0) + (choice.bonus.hp || 0),
      atk: (Number(previousLineage.bonus?.atk) || 0) + (choice.bonus.atk || 0),
      magic: (Number(previousLineage.bonus?.magic) || 0) + (choice.bonus.magic || 0),
      def: (Number(previousLineage.bonus?.def) || 0) + (choice.bonus.def || 0),
      res: (Number(previousLineage.bonus?.res) || 0) + (choice.bonus.res || 0),
    },
  };
  game.pendingAscensionChoices = [];
  announceEvent("EVOLUTION", `${leader.name}は${choice.name}へ進化した${learnedMove ? ` / ${learnedMove.name}` : ""}`, "進", "good");
  setScreenFlash(choice.color, 650);
  triggerScreenShake(14, 420);
  playSfx("level");
  finalizeMilestoneChoice();
}

function finalizeMilestoneChoice() {
  const source = game.milestoneSource;
  game.milestoneSource = null;
  game.rewardPending = false;
  game.pendingRelicChoices = [];
  if (source === "rest") {
    game.restChoiceTaken = true;
    captureTowerCheckpoint(Math.min(100, game.floor + 1));
    saveCurrentGame(true);
  }
  if (source === "secret" && game.secretStairs) {
    game.secretStairs.used = true;
    saveCurrentGame(true);
  }
  if (ui.gameMenuDialog.open) ui.gameMenuDialog.close();
  updateAll();
  if (source === "rest" && game.floor >= 100) completeTower();
}

function renderDungeonMerchant() {
  const merchant = game.merchant;
  if (!merchant) {
    ui.gameMenuBody.innerHTML = '<p class="town-note">行商人はもうこの階にいません。</p>';
    return;
  }
  if (merchant.robbed) {
    ui.gameMenuBody.innerHTML = `
      <div class="merchant-furoshiki">
        <div class="merchant-head">
          <div class="merchant-portrait">怒</div>
          <div><span>閉店</span><strong>${merchant.name}</strong><small>「代金を踏み倒したね。番兵から逃げ切れると思うなよ」</small></div>
          <b>泥棒認定</b>
        </div>
      </div>
    `;
    return;
  }
  if (!["buy", "sell"].includes(game.merchantView)) game.merchantView = "buy";
  const debt = merchantDebt();
  ui.gameMenuBody.innerHTML = `
    <div class="merchant-furoshiki">
      <i class="cloth-knot left"></i><i class="cloth-knot right"></i>
    <div class="merchant-head">
      <div class="merchant-portrait">ノ</div>
      <div>
        <span>迷宮の行商人</span>
        <strong>${merchant.name}</strong>
        <small>「色の違う床が売り場だよ。商品を手に取ったら、出る前に払っておくれ」</small>
      </div>
      <b>${debt ? `未精算 ${debt}` : game.coins}星貨</b>
    </div>
    <div class="merchant-tabs">
      <button type="button" data-merchant-view="buy" class="${game.merchantView === "buy" ? "active" : ""}">精算</button>
      <button type="button" data-merchant-view="sell" class="${game.merchantView === "sell" ? "active" : ""}">売る</button>
    </div>
    <div class="merchant-stock"></div>
    </div>
  `;
  ui.gameMenuBody.querySelectorAll("[data-merchant-view]").forEach((button) => {
    button.addEventListener("click", () => {
      game.merchantView = button.dataset.merchantView;
      renderDungeonMerchant();
    });
  });
  const stock = ui.gameMenuBody.querySelector(".merchant-stock");
  if (game.merchantView === "sell") {
    if (debt > 0) {
      stock.innerHTML = `<p class="town-note">未精算 ${debt}星貨。先に手に取った商品の代金を支払ってください。</p>`;
      return;
    }
    const owned = Object.entries(itemCatalog).filter(
      ([kind, item]) => item.category !== "進化素材" && (game.bag[kind] || 0) > 0,
    );
    if (!owned.length) stock.innerHTML = '<p class="town-note">売れる道具を持っていません。</p>';
    for (const [kind, item] of owned) {
      const price = itemSellPrice(kind);
      appendTownEntry(stock, {
        title: `${item.name} × ${game.bag[kind]}`,
        detail: item.detail,
        meta: `売値 ${price}星貨`,
        iconKind: kind,
        buttonLabel: "売る",
        onClick: () => {
          game.bag[kind] -= 1;
          game.coins += price;
          announceEvent("売却", `${item.name}を${price}星貨で売った`, "貨", "good");
          playSfx("pickup");
          updateAll();
        },
      });
    }
    return;
  }

  if (debt > 0) {
    const unpaidNames = merchant.unpaid
      .map((offerId) => merchant.stock.find((offer) => offer.id === offerId))
      .filter(Boolean)
      .map((offer) => itemCatalog[offer.kind]?.name)
      .filter(Boolean)
      .join("・");
    appendTownEntry(stock, {
      title: `未精算 ${debt}星貨`,
      detail: unpaidNames,
      meta: game.coins >= debt ? `所持 ${game.coins}星貨` : `所持 ${game.coins}星貨　不足`,
      buttonLabel: "支払う",
      disabled: game.coins < debt,
      onClick: settleMerchantDebt,
    });
  } else {
    stock.innerHTML = '<p class="town-note">商品は色付きの売り場へ並んでいます。欲しい品を床から拾って、ノノに話しかけて精算します。</p>';
  }

  for (const offer of merchant.stock) {
    const item = itemCatalog[offer.kind];
    const status = offer.sold ? "精算済み" : offer.picked ? "未精算" : "売り場に陳列";
    appendTownEntry(stock, {
      title: item.name,
      detail: item.detail,
      meta: `${offer.price}星貨　${status}`,
      iconKind: offer.kind,
      selected: offer.picked && !offer.sold,
    });
  }
}

function itemSellPrice(kind) {
  const prices = {
    apple: 20, bigApple: 38, oran: 28, elixir: 46, reviver: 80,
    blastSeed: 35, sleepSeed: 30, slumberOrb: 42, warpOrb: 35,
    guidingOrb: 45, guardBerry: 34, powerBerry: 42, fortuneOrb: 65,
    focusMint: 34, mindBerry: 48, wardBerry: 44, ironNut: 52,
    pierceSeed: 38, stormOrb: 58, mapScroll: 46,
  };
  return prices[kind] || 18;
}

function settleMerchantDebt() {
  const merchant = game.merchant;
  if (!merchant) return;
  const debt = merchantDebt();
  if (!debt || game.coins < debt) return;
  game.coins -= debt;
  for (const offerId of merchant.unpaid) {
    const offer = merchant.stock.find((entry) => entry.id === offerId);
    if (offer) offer.sold = true;
  }
  merchant.unpaid = [];
  addLog(`星渡り商ノノへ${debt}星貨を払い、商品を精算した。`);
  announceEvent("精算完了", `${debt}星貨を支払った`, "貨", "good");
  playSfx("pickup");
  updateAll();
  renderDungeonMerchant();
}

function triggerMerchantTheft() {
  const merchant = game.merchant;
  const debt = merchantDebt();
  if (!merchant || merchant.robbed || debt <= 0) return;
  const karmaGain = 4;
  const stolenCount = merchant.unpaid.length;
  game.karma += karmaGain;
  game.runStats.thefts = (game.runStats.thefts || 0) + 1;
  for (const offerId of merchant.unpaid) {
    const offer = merchant.stock.find((entry) => entry.id === offerId);
    if (offer) offer.sold = true;
  }
  merchant.unpaid = [];
  merchant.robbed = true;
  game.items = game.items.filter((item) => !item.shopItem);
  for (const offer of merchant.stock) offer.sold = true;
  addLog(`未精算のまま売り場を出た。${stolenCount}品、${debt}星貨分の泥棒として追われる。カルマ +${karmaGain}。`);
  announceEvent("THIEF!", `${stolenCount}品を持ち逃げ　商隊番兵が出現`, "盗", "danger");
  spawnMerchantGuards(merchant.x, merchant.y);
  triggerScreenShake(16, 480);
  setScreenFlash("#ef625c", 600);
  playSfx("karma");
  updateAll();
}

function spawnMerchantGuards(x, y) {
  const spots = dirs
    .map((dir) => ({ x: x + dir.x, y: y + dir.y }))
    .filter((point) => isWalkable(point.x, point.y) && !actorAt(point.x, point.y) && !enemyAt(point.x, point.y));
  for (const point of spots.slice(0, 4)) {
    const guard = createEnemy(randomEnemyProfile(), point, true);
    guard.name = `商隊番兵 ${guard.name}`;
    guard.atk += 3;
    guard.hp = Math.ceil(guard.hp * 1.25);
    guard.maxHp = guard.hp;
    game.enemies.push(guard);
  }
}

function renderRestStorage() {
  ui.gameMenuBody.innerHTML = `
    <div class="relic-head">
      <div class="relic-head-mark">倉</div>
      <div><span>休憩所の保管庫</span><strong>風見倉庫</strong><small>倉庫の中身は挑戦に失敗しても残ります。</small></div>
    </div>
    <div class="storage-tabs">
      <button type="button" data-storage-view="deposit" class="active">預ける</button>
      <button type="button" data-storage-view="withdraw">取り出す</button>
    </div>
    <div class="storage-list"></div>
  `;
  const renderList = (mode) => {
    ui.gameMenuBody.querySelectorAll("[data-storage-view]").forEach((button) => {
      button.classList.toggle("active", button.dataset.storageView === mode);
    });
    const list = ui.gameMenuBody.querySelector(".storage-list");
    list.innerHTML = "";
    const source = mode === "deposit" ? game.bag : game.storage;
    const entries = Object.entries(source).filter(([kind, count]) => itemCatalog[kind] && count > 0 && itemCatalog[kind].category !== "進化素材");
    if (!entries.length) {
      list.innerHTML = `<p class="town-note">${mode === "deposit" ? "預けられる道具がありません。" : "倉庫は空です。"}</p>`;
      return;
    }
    for (const [kind, count] of entries) {
      const item = itemCatalog[kind];
      const blocked = mode === "withdraw" && bagTotal() >= game.bagCapacity;
      appendTownEntry(list, {
        title: `${item.name} × ${count}`,
        detail: item.detail,
        meta: mode === "deposit" ? "失敗しても残る" : `バッグ ${bagTotal()}/${game.bagCapacity}`,
        iconKind: kind,
        buttonLabel: mode === "deposit" ? "預ける" : "取出す",
        disabled: blocked,
        onClick: () => {
          if (mode === "deposit") {
            game.bag[kind] -= 1;
            game.storage[kind] = (game.storage[kind] || 0) + 1;
          } else {
            game.storage[kind] -= 1;
            game.bag[kind] = (game.bag[kind] || 0) + 1;
          }
          saveCurrentGame(true);
          renderList(mode);
          updateAll();
        },
      });
    }
  };
  ui.gameMenuBody.querySelectorAll("[data-storage-view]").forEach((button) => {
    button.addEventListener("click", () => renderList(button.dataset.storageView));
  });
  renderList("deposit");
}

function renderRestService() {
  const key = game.activeRestService;
  if (key === "gambler") {
    renderCasino(true);
    return;
  }
  const leader = getLeader();
  if (key === "healer") {
    ui.gameMenuBody.innerHTML = `
      <div class="merchant-head"><div class="merchant-portrait">湯</div><div><span>大休憩所の店</span><strong>月湯屋</strong><small>湯気に混じる星砂が傷と空腹を癒やす。</small></div><b>${game.coins}星貨</b></div>
      <div class="merchant-stock"></div>
    `;
    const stock = ui.gameMenuBody.querySelector(".merchant-stock");
    appendTownEntry(stock, {
      title: "月星の全身湯",
      detail: "HPと満腹度を完全回復する。",
      meta: "90星貨",
      buttonLabel: "入る",
      disabled: game.coins < 90,
      onClick: () => {
        game.coins -= 90;
        leader.hp = leader.maxHp;
        game.belly = 100;
        announceEvent("月湯", "HPと満腹度が全回復した", "湯", "good");
        updateAll();
      },
    });
    return;
  }
  ui.gameMenuBody.innerHTML = `
    <div class="merchant-head"><div class="merchant-portrait">術</div><div><span>大休憩所の店</span><strong>術式露店</strong><small>忘れた技も、まだ知らない技も星図に映る。</small></div><b>${game.coins}星貨</b></div>
    <div class="merchant-stock"></div>
  `;
  const stock = ui.gameMenuBody.querySelector(".merchant-stock");
  appendTownEntry(stock, {
    title: "全技の術式補修",
    detail: "すべての技PPを全回復する。",
    meta: "70星貨",
    buttonLabel: "補修",
    disabled: game.coins < 70 || leader.moves.every((move) => move.pp >= move.maxPp),
    onClick: () => {
      game.coins -= 70;
      restoreAllPp();
      updateAll();
    },
  });
  const profile = characterCatalog.find((entry) => entry.key === leader.profileKey) || characterCatalog[0];
  const unknown = profile.moves.filter((keyName) => !leader.moves.some((move) => move.key === keyName));
  appendTownEntry(stock, {
    title: "未知の術式を読む",
    detail: unknown.length ? "未習得技から1つを選んで覚える。" : "すべての技を習得済み。",
    meta: "160星貨",
    buttonLabel: "読む",
    disabled: game.coins < 160 || !unknown.length,
    onClick: () => {
      game.coins -= 160;
      game.pendingMoveChoices = unknown;
      game.pendingMovePicks = 1;
      renderGameMenu("moveReward");
    },
  });
}

function renderCasino(fromRest = false) {
  const casino = game.casino;
  if (!fromRest && !casino) {
    ui.gameMenuBody.innerHTML = '<p class="town-note">賭場の灯りは消えている。</p>';
    return;
  }
  ui.gameMenuBody.innerHTML = `
    <div class="casino-head">
      <b>◆</b><div><span>STAR DICE</span><strong>流星賭場</strong><small>勝てば星貨か珍品。大外れでは敵を呼ぶ。</small></div><em>${game.coins}星貨</em>
    </div>
    <div class="casino-bets">
      ${[30, 80, 180].map((bet, index) => `<button type="button" data-casino-bet="${bet}" ${game.coins < bet ? "disabled" : ""}><b>${["小", "中", "大"][index]}</b><span><strong>${bet}星貨</strong><small>${index === 2 ? "珍品率が高い" : "運試し"}</small></span></button>`).join("")}
    </div>
    <div class="casino-result">星骰子はまだ振られていない。</div>
  `;
  ui.gameMenuBody.querySelectorAll("[data-casino-bet]").forEach((button) => {
    button.addEventListener("click", () => playCasino(Number(button.dataset.casinoBet), fromRest));
  });
}

function playCasino(bet, fromRest = false) {
  if (game.coins < bet) return;
  game.coins -= bet;
  if (game.casino) game.casino.plays += 1;
  const roll = Math.random() + game.luck * 0.015;
  let result = "";
  if (roll >= 0.9) {
    const choices = rollRelicChoices(1, bet >= 180 ? "RARE" : "UNCOMMON");
    const relic = relicCatalog.find((entry) => entry.key === choices[0]);
    if (relic) addRelic(relic.key);
    result = `大当たり。${relic?.name || "珍しい星遺物"}を得た。`;
  } else if (roll >= 0.62) {
    const payout = bet * 2;
    game.coins += payout;
    result = `勝ち。${payout}星貨が戻った。`;
  } else if (roll >= 0.38) {
    const kind = bet >= 80 ? "fortuneOrb" : "oran";
    if (bagTotal() < game.bagCapacity) game.bag[kind] = (game.bag[kind] || 0) + 1;
    result = `${itemCatalog[kind].name}が転がり出た。`;
  } else if (roll < 0.08 && !fromRest) {
    spawnMerchantGuards(game.casino.x, game.casino.y);
    result = "大外れ。賭場の用心棒が現れた。";
    triggerScreenShake(12, 360);
  } else {
    result = `${bet}星貨は星骰子に呑まれた。`;
  }
  announceEvent("STAR DICE", result, "賭", roll >= 0.62 ? "good" : "mystic");
  playSfx(roll >= 0.62 ? "level" : "pickup");
  renderCasino(fromRest);
  const label = ui.gameMenuBody.querySelector(".casino-result");
  if (label) label.textContent = result;
  updateAll();
}

function renderGearMenu(container = ui.gameMenuBody, refresh = () => renderGameMenu("gear")) {
  const equippedCount = Object.values(game.equipment).filter(Boolean).length;
  const activeSlot = gearSlots[game.gearViewSlot] ? game.gearViewSlot : "weapon";
  container.innerHTML = `
    <div class="gear-summary">
      ${Object.entries(gearSlots).map(([slot, info]) => {
        const gear = game.gearBag.find((entry) => entry.id === game.equipment[slot]);
        return `<div style="--gear-color:${gear?.color || info.color}">
          <span>${info.name}</span>
          <strong>${gear?.name || "未装備"}</strong>
          <small>${gear ? gearStatText(gear) : "補正なし"}</small>
        </div>`;
      }).join("")}
    </div>
    <div class="gear-slot-tabs" role="tablist" aria-label="装備部位">
      ${Object.entries(gearSlots).map(([slot, info]) => `
        <button type="button" class="${slot === activeSlot ? "active" : ""}" data-gear-slot="${slot}">
          <span style="--slot-color:${info.color}"></span>${info.name}
          <b>${game.gearBag.filter((gear) => gear.slot === slot).length}</b>
        </button>
      `).join("")}
    </div>
    <div class="gear-rarity-legend">
      ${gearQualities.map((quality) => `<span style="--rarity-color:${quality.color}"><b>${"★".repeat(quality.stars)}</b>${quality.name}</span>`).join("")}
    </div>
    <p class="town-note">${gearSlots[activeSlot].name}だけを表示中。装備は町へ持ち帰り、次の挑戦にも引き継がれます。</p>
    <div class="gear-list"></div>
  `;
  container.querySelectorAll("[data-gear-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      game.gearViewSlot = button.dataset.gearSlot;
      refresh();
    });
  });
  const list = container.querySelector(".gear-list");
  const visibleGear = game.gearBag.filter((gear) => gear.slot === activeSlot);
  if (!visibleGear.length) {
    list.innerHTML = `<p class="town-note">${gearSlots[activeSlot].name}はまだ見つかっていません。</p>`;
    return;
  }
  for (const gear of visibleGear) {
    const equipped = game.equipment[gear.slot] === gear.id;
    appendTownEntry(list, {
      title: gear.name,
      detail: `${gearSlots[gear.slot].name}　${gearStatText(gear)}`,
      meta: `レア度 ${gearRarityLabel(gear)}`,
      iconGear: gear,
      selected: equipped,
      buttonLabel: equipped ? "装備中" : "装備する",
      disabled: equipped,
      onClick: () => {
        equipGear(gear.id);
        refresh();
      },
    });
  }
  if (equippedCount === 3) {
    list.insertAdjacentHTML("beforeend", '<p class="gear-complete">3部位装備中。拾った装備はいつでも付け替えられます。</p>');
  }
}

function renderEvolutionBoard() {
  const leader = getLeader();
  ui.gameMenuBody.innerHTML = `
    <div class="evolution-head" style="--evo-color:${leader.color}">
      <canvas width="128" height="128" aria-hidden="true"></canvas>
      <div>
        <span>${elementBadgeMarkup(leader.elementKey)}現在の姿 / ${elementInfo(leader.elementKey).name}属性</span>
        <strong>${leader.evolutionName || leader.name}</strong>
        <small>第${leader.evolutionStage || 0}段階 / 10　${leader.evolutionBranch === "base" ? "未進化" : "選んだ道は次の段階でも変更できる"}</small>
      </div>
      <div class="evolution-head-stats">
        <b>Lv.${leader.level}</b>
        <b>物理 ${leader.atk}</b>
        <b>魔力 ${leader.magic}</b>
        <b>防御 ${leader.def}</b>
        <b>魔防 ${leader.res}</b>
      </div>
    </div>
    <div class="ascension-track">
      ${Array.from({ length: 10 }, (_, index) => {
        const historyKey = leader.ascensionHistory?.[index];
        const active = index < leader.evolutionStage;
        return `<span class="${active ? "active" : ""}"><b>${index + 1}</b><small>${historyKey ? historyKey.split("-").slice(1, -1).join(" ") : "未到達"}</small></span>`;
      }).join("")}
    </div>
    <p class="town-note">10階ごと、または隠し階段の祭壇で進化できます。初期星遺物なしと、特定星遺物所持には専用の候補があります。</p>
    <div class="evolution-preview">${(ascensionBranches[leader.profileKey] || []).map((branch) => `
      <span><b>${elementInfo(lineageElementKey(leader.profileKey, branch.key, leader.elementKey)).name} / ${branch.label}</b>${branch.names[0]} → ${branch.names[9]}</span>
    `).join("")}<span><b>発見済み</b>${game.unlockedAscensions.length}形態</span></div>
  `;
  drawPortrait(ui.gameMenuBody.querySelector(".evolution-head canvas"), leader);
}

function renderCodexMenu(container = ui.gameMenuBody) {
  const view = ["evolutions", "enemies", "bosses", "routes"].includes(game.codexView)
    ? game.codexView
    : "evolutions";
  game.codexView = view;
  container.innerHTML = `
    <div class="codex-head">
      <div>
        <span>OBSERVATORY CODEX</span>
        <strong>星見図鑑</strong>
        <small>進化先、敵、門番、ルートの情報を確認できます。未開放でも姿や傾向は見えます。</small>
      </div>
      <div class="codex-tabs">
        <button type="button" data-codex-view="evolutions" class="${view === "evolutions" ? "active" : ""}">進化</button>
        <button type="button" data-codex-view="enemies" class="${view === "enemies" ? "active" : ""}">敵</button>
        <button type="button" data-codex-view="bosses" class="${view === "bosses" ? "active" : ""}">門番</button>
        <button type="button" data-codex-view="routes" class="${view === "routes" ? "active" : ""}">ルート</button>
      </div>
    </div>
    <div class="codex-content"></div>
  `;
  container.querySelectorAll("[data-codex-view]").forEach((button) => {
    button.addEventListener("click", () => {
      game.codexView = button.dataset.codexView;
      renderCodexMenu(container);
    });
  });
  const content = container.querySelector(".codex-content");
  if (view === "evolutions") renderEvolutionCodex(content);
  if (view === "enemies") renderEnemyCodex(content);
  if (view === "bosses") renderBossCodex(content);
  if (view === "routes") renderRouteCodex(content);
}

function renderEvolutionCodex(container) {
  const unlocked = new Set(game.unlockedAscensions || []);
  container.innerHTML = `
    <div class="codex-summary">
      <span>開放済み <strong>${unlocked.size}</strong></span>
      <span>カルマ <strong>${game.karma}</strong></span>
      <span>所持星遺物 <strong>${game.relics.length}</strong></span>
    </div>
    <div class="evolution-dex-grid"></div>
  `;
  const grid = container.querySelector(".evolution-dex-grid");
  for (const profile of characterCatalog) {
    for (let stage = 1; stage <= 10; stage += 1) {
      const plan = [...new Set([...(ascensionStagePlans[profile.key]?.[stage - 1] || []), "karma"])];
      for (const branchKey of plan) {
        const entry = evolutionDexEntry(profile, branchKey, stage);
        if (!entry) continue;
        const isUnlocked = ascensionDexUnlocked(profile.key, branchKey, stage);
        const card = document.createElement("article");
        card.className = `evolution-dex-card ${isUnlocked ? "unlocked" : "locked"}`;
        card.style.setProperty("--dex-color", entry.color);
        card.innerHTML = `
          <canvas width="96" height="96" aria-hidden="true"></canvas>
          <div>
            <span>${profile.name} / 第${stage}段階 / ${entry.label}</span>
            <strong>${isUnlocked ? entry.name : "？？？"}</strong>
            <small>${isUnlocked ? entry.detail : entry.condition}</small>
          </div>
        `;
        const preview = {
          ...createLeader(profile.key),
          evolutionBranch: branchKey,
          evolutionStage: stage,
          artIndex: ascensionArtIndex(profile.key, branchKey, stage),
          color: entry.color,
          elementKey: entry.elementKey,
        };
        const previewCanvas = card.querySelector("canvas");
        drawPortrait(previewCanvas, preview);
        if (!isUnlocked) maskCanvasAsSilhouette(previewCanvas, entry.color, "?");
        grid.appendChild(card);
      }
    }
  }
}

function evolutionDexEntry(profile, branchKey, stage) {
  if (branchKey === "ascetic") {
    return {
      label: "無印",
      name: `${asceticNames[stage - 1]}${profile.name}`,
      detail: "初期星遺物を持たない均衡進化。",
      condition: "条件: 初期星遺物なしで節目へ",
      color: "#f1d487",
      elementKey: "light",
    };
  }
  if (branchKey === "relic") {
    return {
      label: "遺物共鳴",
      name: `星遺物共鳴 ${stage}環`,
      detail: "所持星遺物に応じて姿と技が変わる進化。",
      condition: "条件: 星遺物を持った状態で節目へ",
      color: "#d2b0ff",
      elementKey: profile.elementKey,
    };
  }
  if (branchKey === "karma") {
    return {
      label: "咎星",
      name: `${karmaNames[stage - 1]}${profile.name}`,
      detail: "カルマを力に変える闇の進化。",
      condition: "条件: カルマ6以上",
      color: "#8d55d7",
      elementKey: "dark",
    };
  }
  const branch = (ascensionBranches[profile.key] || []).find((entry) => entry.key === branchKey);
  if (!branch) return null;
  return {
    label: branch.label,
    name: branch.names[stage - 1],
    detail: ascensionDetail(branch.path),
    condition: `条件: 第${stage}段階の候補に出現`,
    color: branch.color,
    elementKey: lineageElementKey(profile.key, branch.key, profile.elementKey),
  };
}

function ascensionDexUnlocked(profileKey, branchKey, stage) {
  const normalized = normalizeAscensionBranchKey(branchKey);
  return (game.unlockedAscensions || []).some((key) => {
    if (!key.startsWith(`${profileKey}-`)) return false;
    if (!key.endsWith(`-${stage}`)) return false;
    if (normalized === "relic") return key.startsWith(`${profileKey}-relic-`);
    return key.startsWith(`${profileKey}-${normalized}-`);
  });
}

function renderEnemyCodex(container) {
  const seenFamilies = enemyFamilies.filter((family) => enemyFamilyProgress(family.key).seen).length;
  const defeatedFamilies = enemyFamilies.filter((family) => enemyFamilyProgress(family.key).defeated).length;
  container.innerHTML = `
    <div class="codex-summary">
      <span>発見 <strong>${seenFamilies}/${enemyFamilies.length}</strong></span>
      <span>撃破 <strong>${defeatedFamilies}/${enemyFamilies.length}</strong></span>
      <span>属性型 <strong>${enemyTypes.length}</strong></span>
    </div>
    <div class="enemy-dex-grid"></div>
  `;
  const grid = container.querySelector(".enemy-dex-grid");
  for (const family of enemyFamilies) {
    const progress = enemyFamilyProgress(family.key);
    const sample = enemyCatalog.find((enemy) => enemy.familyKey === family.key) || family;
    const card = document.createElement("article");
    card.className = `enemy-dex-card ${progress.seen ? "seen" : "locked"} ${progress.defeated ? "defeated" : ""}`;
    card.style.setProperty("--dex-color", sample.color || "#9ac7d7");
    card.innerHTML = `
      <canvas width="88" height="88" aria-hidden="true"></canvas>
      <div>
        <span>B${family.minFloor}F - B${family.maxFloor}F / ${family.tier}帯</span>
        <strong>${progress.seen ? family.name : "未確認の気配"}</strong>
        <small>${progress.defeated ? "撃破済み" : progress.seen ? "発見済み" : "この階層帯で出現する"}</small>
      </div>
    `;
    drawEnemyPortrait(card.querySelector("canvas"), { ...sample, hp: sample.hp, maxHp: sample.hp, elementKey: sample.elementKey, color: sample.color, artIndex: sample.artIndex });
    grid.appendChild(card);
  }
  const rareTitle = document.createElement("h3");
  rareTitle.className = "codex-subtitle";
  rareTitle.textContent = "レアエネミー";
  grid.insertAdjacentElement("afterend", rareTitle);
  const rareGrid = document.createElement("div");
  rareGrid.className = "enemy-dex-grid rare";
  rareTitle.insertAdjacentElement("afterend", rareGrid);
  for (const rare of rareEnemyCatalog) {
    const seen = game.seenEnemyKeys.includes(rare.key);
    const defeated = game.defeatedEnemyKeys.includes(rare.key);
    const card = document.createElement("article");
    card.className = `enemy-dex-card ${seen ? "seen" : "locked"} ${defeated ? "defeated" : ""}`;
    card.style.setProperty("--dex-color", rare.color);
    card.innerHTML = `
      <canvas width="88" height="88" aria-hidden="true"></canvas>
      <div><span>レア / 区画${rare.minDungeon}以降</span><strong>${seen ? rare.name : "珍しい影"}</strong><small>${defeated ? "撃破済み" : seen ? "発見済み" : "低確率で出現"}</small></div>
    `;
    drawEnemyPortrait(card.querySelector("canvas"), { ...rare, hp: rare.hp, maxHp: rare.hp });
    rareGrid.appendChild(card);
  }
}

function renderBossCodex(container) {
  container.innerHTML = '<div class="boss-dex-list"></div>';
  const list = container.querySelector(".boss-dex-list");
  towerBossCatalog.forEach((boss, index) => {
    const floor = index * 10 + 9;
    const theme = bossThemeCatalog[index];
    const cleared = game.highestFloor > floor || game.defeatedEnemyKeys.includes(`boss-${floor}`);
    const card = document.createElement("article");
    card.className = `boss-dex-card ${cleared ? "defeated" : ""}`;
    card.style.setProperty("--dex-color", theme.color || elementInfo(theme.elementKey).color);
    card.innerHTML = `
      <canvas class="boss-dex-portrait" width="96" height="96" aria-hidden="true"></canvas>
      <div>
        <span>B${floor}F / ${elementBadgeMarkup(theme.elementKey)}${elementInfo(theme.elementKey).name} / ${theme.plan}</span>
        <strong>${boss.title} ${boss.name}</strong>
        <small>${theme.warning}</small>
        <em>報酬: ${itemCatalog[theme.reward]?.name || "進化素材"} / 星遺物候補</em>
      </div>
    `;
    list.appendChild(card);
    drawEnemyPortrait(card.querySelector("canvas"), {
      ...boss,
      key: `boss-${floor}`,
      familyKey: "boss",
      boss: true,
      hp: boss.hp,
      maxHp: boss.hp,
      elementKey: theme.elementKey,
      bossGimmick: theme.gimmick,
      artIndex: [4, 9, 14, 19, 24, 29, 34, 35, 38, 39][index],
    });
  });
}

function renderRouteCodex(container) {
  container.innerHTML = `
    <div class="route-choice-grid route-guide-grid">
      ${routeCatalog.map((route) => `
        <article class="route-card guide" style="--route-color:${route.color}">
          <b>${route.icon}</b>
          <span><strong>${route.name}</strong><small>${route.detail}</small><em>${routeMetaText(route)}</em></span>
        </article>
      `).join("")}
    </div>
  `;
}

function hasEvolutionMaterials(evolution) {
  return Object.entries(evolution.materials).every(([kind, count]) => (game.evolutionBag[kind] || 0) >= count);
}

function evolveTo(key) {
  const evolution = evolutionCatalog.find((entry) => entry.key === key);
  const leader = getLeader();
  if (!evolution || leader.evolutionKey !== evolution.from) return;
  if (leader.level < evolution.level || !evolution.requirement(game.runStats) || !hasEvolutionMaterials(evolution)) return;
  for (const [kind, count] of Object.entries(evolution.materials)) game.evolutionBag[kind] -= count;
  leader.evolutionKey = evolution.key;
  leader.evolutionStage = evolution.stage;
  leader.name = evolution.name;
  leader.type = evolution.type;
  leader.role = `${evolution.type}タイプ`;
  leader.color = evolution.color;
  leader.accent = evolution.accent;
  leader.scarf = evolution.scarf;
  applyEvolutionBonus(leader, evolution);
  leader.hp = leader.maxHp;
  game.persistentEvolutionKey = evolution.key;
  game.persistentEvolutionStage = evolution.stage;
  addEffect("burst", leader.x, leader.y, evolution.color);
  addLog(`コハクは${evolution.name}へ進化した。${evolution.title}。`);
  announceEvent("進化", `${evolution.name}　${elementInfo(leader.elementKey).name}属性 / ${evolution.type}タイプ`, "進", "good");
  setScreenFlash(evolution.color, 900);
  triggerScreenShake(10, 520);
  playSfx("evolve");
  saveCurrentGame(true);
  updateAll();
  renderGameMenu("evolution");
}

function renderSkillBoard() {
  const laneInfo = {
    physical: { title: "物理の牙", detail: "近接火力と防御", color: "#ef755b" },
    core: { title: "生存の星", detail: "探索と立て直し", color: "#e6bd5d" },
    magic: { title: "魔法の環", detail: "技火力とPP運用", color: "#77cce8" },
  };
  ui.gameMenuBody.innerHTML = `
    <div class="skill-board-head">
      <div><span>使用できるポイント</span><strong>${game.skillPoints}</strong></div>
      <p>この挑戦だけの星網盤です。下から上へつなぎ、物理・生存・魔法のどこへ寄せるかを選びます。</p>
    </div>
    <div class="stat-allocation-panel">
      <div><span>ステータス振り分け</span><strong>${game.statPoints} pt</strong><small>レベルアップで得た分を好きな能力へ入れられます。</small></div>
      <button type="button" data-stat-point="hp" ${game.statPoints <= 0 ? "disabled" : ""}><b>心</b><span>HP</span><em>+5</em></button>
      <button type="button" data-stat-point="atk" ${game.statPoints <= 0 ? "disabled" : ""}><b>牙</b><span>物理</span><em>+1</em></button>
      <button type="button" data-stat-point="magic" ${game.statPoints <= 0 ? "disabled" : ""}><b>魔</b><span>魔力</span><em>+1</em></button>
      <button type="button" data-stat-point="def" ${game.statPoints <= 0 ? "disabled" : ""}><b>盾</b><span>防御</span><em>+1</em></button>
      <button type="button" data-stat-point="res" ${game.statPoints <= 0 ? "disabled" : ""}><b>環</b><span>魔防</span><em>+1</em></button>
    </div>
    <div class="skill-board-compact"></div>
  `;
  ui.gameMenuBody.querySelectorAll("[data-stat-point]").forEach((button) => {
    button.addEventListener("click", () => spendStatPoint(button.dataset.statPoint));
  });
  const board = ui.gameMenuBody.querySelector(".skill-board-compact");
  for (const laneKey of ["physical", "core", "magic"]) {
    const info = laneInfo[laneKey];
    const lane = document.createElement("section");
    lane.className = `skill-lane skill-lane-${laneKey}`;
    lane.style.setProperty("--lane-color", info.color);
    lane.innerHTML = `<header><b>${info.title}</b><small>${info.detail}</small></header><div class="skill-lane-nodes"></div>`;
    const nodes = lane.querySelector(".skill-lane-nodes");
    const skills = skillCatalog.filter((skill) => skill.lane === laneKey).sort((a, b) => a.tier - b.tier);
    for (const skill of skills) {
      const unlocked = hasSkill(skill.key);
      const requirementMet = skillRequirementsMet(skill);
      const affordable = game.skillPoints >= skill.cost;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `skill-node-compact ${unlocked ? "unlocked" : ""} ${requirementMet && affordable && !unlocked ? "available" : ""}`;
      button.disabled = unlocked || !requirementMet || !affordable;
      button.innerHTML = `
        <span class="skill-node-icon">${skill.icon}</span>
        <span class="skill-node-copy"><b>TIER ${skill.tier + 1}</b><strong>${skill.name}</strong><small>${skill.detail}</small></span>
        <span class="skill-cost">${unlocked ? "習得済" : `${skill.cost} pt`}</span>
      `;
      button.addEventListener("click", () => unlockSkill(skill.key));
      nodes.appendChild(button);
    }
    board.appendChild(lane);
  }
}

function unlockSkill(key) {
  const skill = skillCatalog.find((entry) => entry.key === key);
  if (!skill || hasSkill(key)) return;
  if (!skillRequirementsMet(skill)) return;
  if (game.skillPoints < skill.cost) return;
  game.skillPoints -= skill.cost;
  game.unlockedSkills.push(key);

  if (["tough", "power", "shell", "arcana", "technique", "flow", "starcore", "sovereign", "oracle"].includes(key)) {
    applyUnlockedSkillsToLeader(getLeader());
  }

  addLog(`スキル「${skill.name}」を習得した。`);
  announceEvent("スキル習得", `${skill.name}: ${skill.detail}`, skill.icon, "good");
  setScreenFlash("#9f8ae1", 320);
  updateAll();
  renderGameMenu("skills");
}

function hasSkill(key) {
  return game.unlockedSkills.includes(key);
}

function skillRequirementsMet(skill) {
  return (skill.requires || []).every((key) => hasSkill(key));
}

function applyUnlockedSkillsToLeader(leader) {
  leader.appliedSkills ||= [];
  if (hasSkill("tough") && !leader.appliedSkills.includes("tough")) {
    leader.maxHp += 8;
    leader.hp += 8;
    leader.appliedSkills.push("tough");
  }
  if (hasSkill("power") && !leader.appliedSkills.includes("power")) {
    leader.atk += 2;
    leader.appliedSkills.push("power");
  }
  if (hasSkill("shell") && !leader.appliedSkills.includes("shell")) {
    leader.def += 1;
    leader.appliedSkills.push("shell");
  }
  if (hasSkill("technique") && !leader.appliedSkills.includes("technique")) {
    for (const move of leader.moves) {
      move.maxPp += 2;
      move.pp += 2;
    }
    leader.appliedSkills.push("technique");
  }
  if (hasSkill("arcana") && !leader.appliedSkills.includes("arcana")) {
    leader.magic += 2;
    leader.appliedSkills.push("arcana");
  }
  const statSkills = [
    ["flow", { magic: 3 }],
    ["starcore", { hp: 10, atk: 1, magic: 1, def: 1, res: 1 }],
    ["sovereign", { atk: 5, def: 2 }],
    ["oracle", { magic: 5, res: 2 }],
  ];
  for (const [key, bonus] of statSkills) {
    if (!hasSkill(key) || leader.appliedSkills.includes(key)) continue;
    leader.maxHp += bonus.hp || 0;
    leader.hp += bonus.hp || 0;
    leader.atk += bonus.atk || 0;
    leader.magic += bonus.magic || 0;
    leader.def += bonus.def || 0;
    leader.res += bonus.res || 0;
    leader.appliedSkills.push(key);
  }
}

function openTownFacility(view) {
  game.townView = view;
  delete ui.townDialog.dataset.view;
  if (view === "shop" && !["goods", "sell", "starter"].includes(game.shopView)) game.shopView = "goods";
  renderTownFacility();
  if (!ui.townDialog.open) ui.townDialog.showModal();
}

function renderTownShop() {
  ui.townDialogTitle.textContent = "星の商店";
  ui.townDialogBody.innerHTML = `
    <div class="town-shop-tabs" role="tablist" aria-label="商店メニュー">
      <button type="button" data-shop-view="goods" class="${game.shopView === "goods" ? "active" : ""}">道具</button>
      <button type="button" data-shop-view="sell" class="${game.shopView === "sell" ? "active" : ""}">売却</button>
      <button type="button" data-shop-view="starter" class="${game.shopView === "starter" ? "active" : ""}">初期星遺物</button>
    </div>
    <div class="town-shop-content"></div>
  `;
  ui.townDialogBody.querySelectorAll("[data-shop-view]").forEach((button) => {
    button.addEventListener("click", () => {
      game.shopView = button.dataset.shopView;
      renderTownShop();
    });
  });
  const content = ui.townDialogBody.querySelector(".town-shop-content");

  if (game.shopView === "sell") {
    content.innerHTML = `<p class="town-note">バッグの道具を星貨へ換えます。現在 ${game.coins}星貨。</p>`;
    const owned = Object.entries(itemCatalog).filter(
      ([kind, item]) => item.category !== "進化素材" && (game.bag[kind] || 0) > 0,
    );
    if (!owned.length) content.insertAdjacentHTML("beforeend", '<p class="town-note">売れる道具がありません。</p>');
    for (const [kind, item] of owned) {
      const price = itemSellPrice(kind);
      appendTownEntry(content, {
        title: `${item.name} × ${game.bag[kind]}`,
        detail: item.detail,
        meta: `売値 ${price}星貨`,
        iconKind: kind,
        buttonLabel: "売る",
        onClick: () => {
          game.bag[kind] -= 1;
          game.coins += price;
          saveCurrentGame(true);
          updateAll();
          renderTownShop();
        },
      });
    }
    return;
  }

  if (game.shopView === "starter") {
    const starterKeys = ["ironFang", "moonLens", "shellSeed", "heartMeteor"];
    content.innerHTML = `
      <p class="town-note">次にB1Fから始める挑戦へ、1つだけ持ち込めます。休憩所からの再開データには影響しません。</p>
      <div class="relic-choice-grid starter-relic-grid"></div>
    `;
    const grid = content.querySelector(".starter-relic-grid");
    const noRelic = document.createElement("button");
    noRelic.type = "button";
    noRelic.className = `starter-none ${game.startingRelicKey ? "" : "selected"}`;
    noRelic.innerHTML = "<b>無</b><strong>持たずに出る</strong><small>無印進化の条件になる</small>";
    noRelic.addEventListener("click", () => {
      game.startingRelicKey = null;
      if (!game.towerCheckpoint) prepareNewTry();
      saveCurrentGame(true);
      updateAll();
      renderTownShop();
    });
    grid.appendChild(noRelic);
    for (const key of starterKeys) {
      const relic = relicCatalog.find((entry) => entry.key === key);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `relic-choice ${game.startingRelicKey === key ? "selected" : ""}`;
      button.innerHTML = `${relicCardMarkup(relic)}<em>${game.startingRelicKey === key ? "選択中" : "これを持つ"}</em>`;
      button.addEventListener("click", () => {
        game.startingRelicKey = key;
        if (!game.towerCheckpoint) prepareNewTry();
        saveCurrentGame(true);
        updateAll();
        renderTownShop();
      });
      grid.appendChild(button);
    }
    return;
  }

  content.innerHTML = `<p class="town-note">現在の所持金: ${game.coins}星貨。装備品はなく、拾った星遺物がその挑戦中の能力になります。</p>`;
  const offers = [
    { kind: "apple", price: 35 },
    { kind: "oran", price: 45 },
    { kind: "focusMint", price: 55 },
    { kind: "pierceSeed", price: 65 },
    { kind: "reviver", price: 120 },
    { kind: "guidingOrb", price: 75 },
    { kind: "mapScroll", price: 88 },
  ];
  for (const offer of offers) {
    const item = itemCatalog[offer.kind];
    appendTownEntry(content, {
      title: item.name,
      detail: item.detail,
      meta: `${offer.price}星貨`,
      iconKind: offer.kind,
      buttonLabel: "買う",
      disabled: game.coins < offer.price || bagTotal() >= game.bagCapacity,
      onClick: () => {
        game.coins -= offer.price;
        game.bag[offer.kind] = (game.bag[offer.kind] || 0) + 1;
        updateAll();
        renderTownShop();
      },
    });
  }
  appendTownEntry(content, {
    title: `旅袋の拡張 ${game.bagCapacity}枠 → ${Math.min(MAX_BAG_CAPACITY, game.bagCapacity + 2)}枠`,
    detail: "バッグの上限を永久に2枠増やす。",
    meta: `${bagExpansionCost()}星貨`,
    buttonLabel: game.bagCapacity >= MAX_BAG_CAPACITY ? "最大" : "拡張",
    disabled: game.bagCapacity >= MAX_BAG_CAPACITY || game.coins < bagExpansionCost(),
    onClick: () => {
      game.coins -= bagExpansionCost();
      game.bagCapacity = Math.min(MAX_BAG_CAPACITY, game.bagCapacity + 2);
      playSfx("upgrade");
      saveCurrentGame(true);
      updateAll();
      renderTownShop();
    },
  });
}

function renderForgeMenu(container) {
  const equippedIds = new Set(Object.values(game.equipment).filter(Boolean));
  game.forgeSelection = game.forgeSelection.filter(
    (id) => game.gearBag.some((gear) => gear.id === id) && !equippedIds.has(id),
  );
  const selected = game.forgeSelection
    .map((id) => game.gearBag.find((gear) => gear.id === id))
    .filter(Boolean);
  const activeSlot = selected[0]?.slot || (gearSlots[game.gearViewSlot] ? game.gearViewSlot : "armor");
  game.gearViewSlot = activeSlot;
  const targetStars = selected.length === 2 ? Math.min(5, Math.max(...selected.map((gear) => gear.stars || 1)) + 1) : 0;
  const forgeCost = targetStars ? 60 + targetStars * 55 : 0;
  container.innerHTML = `
    <div class="forge-head">
      <div class="forge-flame">星</div>
      <div>
        <strong>星炉合成</strong>
        <span>同じ部位の未装備品を2つ選び、別の上位装備へ作り替えます。</span>
      </div>
      <b>${game.coins}星貨</b>
    </div>
    <div class="gear-slot-tabs" role="tablist" aria-label="合成する部位">
      ${Object.entries(gearSlots).map(([slot, info]) => `
        <button type="button" data-forge-slot="${slot}" class="${slot === activeSlot ? "active" : ""}" ${selected.length ? "disabled" : ""}>
          <span style="--slot-color:${info.color}"></span>${info.name}
        </button>
      `).join("")}
    </div>
    <div class="forge-selection">
      <span>${selected[0]?.name || "素材1を選択"}</span>
      <i>+</i>
      <span>${selected[1]?.name || "素材2を選択"}</span>
      <i>→</i>
      <strong>${targetStars ? `${"★".repeat(targetStars)}装備` : "上位装備"}</strong>
    </div>
    <div class="forge-list"></div>
    <button class="forge-action primary-button" type="button" ${selected.length === 2 && game.coins >= forgeCost ? "" : "disabled"}>
      ${selected.length < 2 ? "素材を2つ選ぶ" : game.coins < forgeCost ? `${forgeCost}星貨が必要` : `${forgeCost}星貨で合成`}
    </button>
  `;
  container.querySelectorAll("[data-forge-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      game.gearViewSlot = button.dataset.forgeSlot;
      renderForgeMenu(container);
    });
  });
  const list = container.querySelector(".forge-list");
  const candidates = game.gearBag.filter((gear) => gear.slot === activeSlot && !equippedIds.has(gear.id));
  if (!candidates.length) {
    list.innerHTML = `<p class="town-note">合成に使える${gearSlots[activeSlot].name}がありません。装備中の品は素材にできません。</p>`;
  }
  for (const gear of candidates) {
    const isSelected = game.forgeSelection.includes(gear.id);
    appendTownEntry(list, {
      title: gear.name,
      detail: gearStatText(gear),
      meta: gearRarityLabel(gear),
      iconGear: gear,
      selected: isSelected,
      buttonLabel: isSelected ? "選択解除" : "素材にする",
      disabled: !isSelected && game.forgeSelection.length >= 2,
      onClick: () => {
        game.forgeSelection = isSelected
          ? game.forgeSelection.filter((id) => id !== gear.id)
          : [...game.forgeSelection, gear.id];
        renderForgeMenu(container);
      },
    });
  }
  container.querySelector(".forge-action").addEventListener("click", () => forgeSelectedGear(container));
}

function forgeSelectedGear(container) {
  const materials = game.forgeSelection
    .map((id) => game.gearBag.find((gear) => gear.id === id))
    .filter(Boolean);
  if (materials.length !== 2 || materials[0].slot !== materials[1].slot) return;
  const targetStars = Math.min(5, Math.max(...materials.map((gear) => gear.stars || 1)) + 1);
  const cost = 60 + targetStars * 55;
  if (game.coins < cost) return;
  game.coins -= cost;
  game.gearBag = game.gearBag.filter((gear) => !game.forgeSelection.includes(gear.id));
  const result = generateGear(targetStars - 1, targetStars, materials[0].slot, materials[0].key);
  game.gearBag.push(result);
  game.forgeSelection = [];
  announceEvent("星炉合成成功", `${result.name}　${gearRarityLabel(result)}`, "星", "good");
  playSfx("upgrade");
  saveCurrentGame(true);
  updateAll();
  renderForgeMenu(container);
}

function renderTownFacility() {
  const view = game.townView;
  ui.townDialogBody.innerHTML = "";

  if (view === "characters") {
    renderCharacterSelection();
    return;
  }

  if (view === "shop") {
    renderTownShop();
    return;
  }

  if (view === "board") {
    ui.townDialogTitle.textContent = "星喰いの塔・百階踏破路";
    ui.townDialogBody.innerHTML = `
      <p class="town-note">マップ・道具・変異種は挑戦ごとに変化します。各区画の9階目に門番、10階目に休憩所。20階ごとの大休憩所ではHPと満腹度も全回復します。</p>
      <div class="tower-route-summary">
        <strong>最高到達 B${game.highestFloor}F</strong>
        <span>${game.towerCheckpoint ? `B${game.towerCheckpoint.floor}Fから再開可能` : "次の挑戦はB1Fから"}</span>
      </div>
    `;
    towerBossCatalog.forEach((boss, index) => {
      const restFloor = (index + 1) * 10;
      const gateFloor = restFloor - 1;
      const cleared = game.highestFloor >= restFloor;
      const reached = game.highestFloor >= gateFloor;
      appendTownEntry(ui.townDialogBody, {
        title: `区画 ${index + 1}/10　B${index * 10 + 1}F - B${restFloor}F`,
        detail: `B${gateFloor}F 門番「${boss.name}」`,
        meta: `${restFloor % 20 === 0 ? "大休憩所" : "休憩所"}　${cleared ? "踏破済み" : reached ? "門番へ到達" : "未踏区画"}`,
        buttonLabel: cleared ? "踏破" : reached ? "現在地" : "未到達",
        selected: reached && !cleared,
        disabled: true,
      });
    });
    return;
  }

  if (view === "shop") {
    ui.townDialogTitle.textContent = "星の商店";
    ui.townDialogBody.innerHTML = `<p class="town-note">現在の所持金: ${game.coins}星貨</p>`;
    appendTownEntry(ui.townDialogBody, {
      title: "月蜜の実",
      detail: "満腹度を45回復する。バッグに入る。",
      meta: "35星貨",
      iconKind: "apple",
      buttonLabel: "買う",
      disabled: game.coins < 35 || bagTotal() >= game.bagCapacity,
      onClick: () => {
        game.coins -= 35;
        game.bag.apple += 1;
        updateAll();
        renderTownFacility();
      },
    });
    appendTownEntry(ui.townDialogBody, {
      title: "雫青の実",
      detail: "リーダーのHPを20回復する。",
      meta: "45星貨",
      iconKind: "oran",
      buttonLabel: "買う",
      disabled: game.coins < 45 || bagTotal() >= game.bagCapacity,
      onClick: () => {
        game.coins -= 45;
        game.bag.oran += 1;
        updateAll();
        renderTownFacility();
      },
    });
    appendTownEntry(ui.townDialogBody, {
      title: "あかつきの種",
      detail: "倒れた主人公をその場で自動復活させる。",
      meta: "120星貨",
      iconKind: "reviver",
      buttonLabel: "買う",
      disabled: game.coins < 120 || bagTotal() >= game.bagCapacity,
      onClick: () => {
        game.coins -= 120;
        game.bag.reviver += 1;
        updateAll();
        renderTownFacility();
      },
    });
    appendTownEntry(ui.townDialogBody, {
      title: "導星の珠",
      detail: "この階の目的地を地図に表示する。",
      meta: "75星貨",
      iconKind: "guidingOrb",
      buttonLabel: "買う",
      disabled: game.coins < 75 || bagTotal() >= game.bagCapacity,
      onClick: () => {
        game.coins -= 75;
        game.bag.guidingOrb += 1;
        updateAll();
        renderTownFacility();
      },
    });
    const leader = getLeader();
    const needsPp = leader.moves.some((move) => move.pp < move.maxPp);
    appendTownEntry(ui.townDialogBody, {
      title: `旅袋の拡張 ${game.bagCapacity}枠 → ${Math.min(MAX_BAG_CAPACITY, game.bagCapacity + 2)}枠`,
      detail: "バッグの上限を永久に2枠増やす。セーブデータごとに引き継がれる。",
      meta: `${bagExpansionCost()}星貨`,
      buttonLabel: game.bagCapacity >= MAX_BAG_CAPACITY ? "最大" : "拡張",
      disabled: game.bagCapacity >= MAX_BAG_CAPACITY || game.coins < bagExpansionCost(),
      onClick: () => {
        game.coins -= bagExpansionCost();
        game.bagCapacity = Math.min(MAX_BAG_CAPACITY, game.bagCapacity + 2);
        playSfx("upgrade");
        saveCurrentGame(true);
        updateAll();
        renderTownFacility();
      },
    });
    appendTownEntry(ui.townDialogBody, {
      title: "星のオーブ",
      detail: "すべての技PPを2ずつ回復する。",
      meta: "60星貨",
      buttonLabel: "使う",
      disabled: game.coins < 60 || !needsPp,
      onClick: () => {
        game.coins -= 60;
        for (const move of leader.moves) move.pp = Math.min(move.maxPp, move.pp + 2);
        updateAll();
        renderTownFacility();
      },
    });
    return;
  }

  if (view === "storage") {
    ui.townDialogTitle.textContent = "風見倉庫";
    ui.townDialogBody.innerHTML = `
      <div class="menu-stat-grid">
        <div class="menu-stat"><span>バッグ</span><strong>月蜜の実 ${game.bag.apple}</strong></div>
        <div class="menu-stat"><span>倉庫</span><strong>月蜜の実 ${game.storage.apple}</strong></div>
      </div>
    `;
    appendTownEntry(ui.townDialogBody, {
      title: "月蜜の実を1個預ける",
      detail: "冒険で失敗しても倉庫の道具は残る。",
      buttonLabel: "預ける",
      disabled: game.bag.apple <= 0,
      onClick: () => {
        game.bag.apple -= 1;
        game.storage.apple += 1;
        renderTownFacility();
      },
    });
    appendTownEntry(ui.townDialogBody, {
      title: "月蜜の実を1個取り出す",
      detail: "次の冒険へ持っていく。",
      buttonLabel: "取出す",
      disabled: game.storage.apple <= 0 || bagTotal() >= game.bagCapacity,
      onClick: () => {
        game.storage.apple -= 1;
        game.bag.apple += 1;
        renderTownFacility();
      },
    });
    return;
  }

  ui.townDialogTitle.textContent = "星見観測院";
  const rank = currentRank();
  const evolution = evolutionCatalog.find((entry) => entry.key === game.persistentEvolutionKey);
  ui.townDialogBody.innerHTML = `
    <div class="menu-stat-grid">
      <div class="menu-stat"><span>探索者ランク</span><strong>${rank.name}</strong></div>
      <div class="menu-stat"><span>累計探索pt</span><strong>${game.rescuePoints}</strong></div>
      <div class="menu-stat"><span>最高到達</span><strong>B${game.highestFloor}F / B100F</strong></div>
      <div class="menu-stat"><span>敵図鑑</span><strong>${enemyCatalog.length + rareEnemyCatalog.length + towerBossCatalog.length}種</strong></div>
      <div class="menu-stat"><span>永続進化</span><strong>${evolution?.name || "未進化 コハク"}</strong></div>
      <div class="menu-stat"><span>今回の進化素材</span><strong>${evolutionMaterialTotal()}個</strong></div>
    </div>
    <p class="town-note">進化素材は挑戦ごとにリセット。炎・水・木・光・闇に加え、聖神は他属性ダメージを2割軽減、邪悪は与ダメージが2割上がります。</p>
    ${game.lastRunSummary ? runSummaryMarkup(game.lastRunSummary, "直近の冒険") : ""}
    <div class="town-codex-host"></div>
  `;
  renderCodexMenu(ui.townDialogBody.querySelector(".town-codex-host"));
}

function renderCharacterSelection() {
  ui.townDialogTitle.textContent = "運命を継ぐ探索者";
  ui.townDialogBody.innerHTML = `
    <p class="town-note">狐は標準型、亡国の騎士は物理型、マジシャンは魔法と奇策型。技は最初の1つから始まり、Lv.4・8・12で増えます。</p>
    <div class="character-grid"></div>
  `;
  const grid = ui.townDialogBody.querySelector(".character-grid");
  for (const profile of characterCatalog) {
    const preview = createLeader(profile.key);
    applyPersistentLineage(preview);
    const selected = profile.key === game.selectedCharacter;
    const card = document.createElement("article");
    card.className = `character-choice ${selected ? "selected" : ""}`;
    card.style.setProperty("--type-color", profile.color);
    card.innerHTML = `
      <div class="character-choice-head">
        <canvas class="character-portrait" width="48" height="48"></canvas>
        <div>
          <span>${elementBadgeMarkup(preview.elementKey)}${elementInfo(preview.elementKey).name}属性 / ${profile.type}タイプ</span>
          <strong>${profile.name}</strong>
          <small>${profile.style}</small>
        </div>
      </div>
      <div class="character-stats">
        <span>HP <b>${preview.maxHp}</b></span>
        <span>攻撃 <b>${preview.atk}</b></span>
        <span>魔力 <b>${preview.magic}</b></span>
        <span>防御 <b>${preview.def}</b></span>
      </div>
      <canvas class="character-stat-radar" width="220" height="154" aria-hidden="true"></canvas>
      <div class="character-moves">${profile.moves.map((key, index) => {
        const move = moveCatalog.find((entry) => entry.key === key);
        return `<span class="${index ? "locked" : ""}">${elementInfo(move.element).symbol} ${index ? "LOCK " : ""}${move.name}</span>`;
      }).join("")}</div>
      <button type="button" ${selected ? "disabled" : ""}>${selected ? "選択中" : "この探索者を選ぶ"}</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      game.selectedCharacter = profile.key;
      game.roster[profile.key] = createLeader(profile.key);
      if (!game.towerCheckpoint) prepareNewTry();
      saveCurrentGame(true);
      updateAll();
      renderCharacterSelection();
    });
    drawPortrait(card.querySelector(".character-portrait"), preview);
    drawStatRadar(card.querySelector(".character-stat-radar"), preview);
    grid.appendChild(card);
  }
  ui.townDialogBody.insertAdjacentHTML(
    "beforeend",
    `<div class="evolution-preview">${(ascensionBranches[game.selectedCharacter] || []).map((branch) => `
      <span><b>${elementInfo(lineageElementKey(game.selectedCharacter, branch.key)).name} / ${branch.label}</b>${branch.names[0]} → ${branch.names[9]}</span>
    `).join("")}<span><b>条件分岐</b>無印進化 / 星遺物共鳴進化</span></div>`,
  );
}

function bagExpansionCost() {
  return 240 + Math.floor((game.bagCapacity - BASE_BAG_CAPACITY) / 2) * 140;
}

function appendTownEntry(container, options) {
  const entry = document.createElement("div");
  const hasIcon = Boolean(options.iconKind || options.iconGear);
  entry.className = `town-entry ${options.selected ? "selected" : ""} ${hasIcon ? "has-icon" : ""}`;
  entry.innerHTML = `
    ${hasIcon ? '<canvas class="item-entry-icon" width="48" height="48" aria-hidden="true"></canvas>' : ""}
    <div class="town-entry-copy">
      <strong>${options.title}</strong>
      ${options.detail ? `<span>${options.detail}</span>` : ""}
      ${options.meta ? `<small>${options.meta}</small>` : ""}
    </div>
  `;
  const buttons = [];
  if (options.buttonLabel) {
    buttons.push({
      label: options.buttonLabel,
      disabled: Boolean(options.disabled),
      onClick: options.onClick,
    });
  }
  if (options.secondaryButtonLabel) {
    buttons.push({
      label: options.secondaryButtonLabel,
      disabled: Boolean(options.secondaryDisabled),
      onClick: options.secondaryOnClick,
    });
  }
  if (buttons.length) {
    const actions = document.createElement("div");
    actions.className = "town-entry-actions";
    for (const action of buttons) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.disabled = action.disabled;
      if (action.onClick) button.addEventListener("click", action.onClick);
      actions.appendChild(button);
    }
    entry.appendChild(actions);
  }
  container.appendChild(entry);
  if (hasIcon) drawItemIcon(entry.querySelector("canvas"), options.iconKind || "gear", options.iconGear);
}

function renderLog() {
  ui.log.innerHTML = "";
  for (const entry of game.logs.slice(-9)) {
    const li = document.createElement("li");
    li.textContent = entry;
    ui.log.appendChild(li);
  }
  ui.log.scrollTop = ui.log.scrollHeight;
}

function currentRank() {
  let rank = ranks[0];
  for (const candidate of ranks) {
    if (game.rescuePoints >= candidate.points) rank = candidate;
  }
  return rank;
}

function sceneHasActiveAnimation(time) {
  if (!game) return false;
  if (game.mode === "town") return (game.townPlayer?.movingUntil || 0) > time;
  if (game.effects.length || game.floating.length || game.screenFlash || game.screenShake) return true;
  return [...game.team, ...game.enemies].some((actor) => {
    const motion = actor.motion;
    return motion && time < motion.started + motion.duration;
  });
}

function canvasFrameInterval(time) {
  if (document.querySelector("dialog[open]")) return MODAL_FRAME_INTERVAL;
  return sceneHasActiveAnimation(time) ? ACTIVE_FRAME_INTERVAL : IDLE_FRAME_INTERVAL;
}

function draw(time = 0) {
  requestAnimationFrame(draw);
  if (!game || document.hidden) return;
  const interval = canvasFrameInterval(time);
  if (lastCanvasDrawTime && time - lastCanvasDrawTime < interval) return;
  lastCanvasDrawTime = time;
  if (game.mode === "town") {
    drawTown(time);
    return;
  }
  renderCamera = getCamera(time);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = currentDungeonTheme().unknown;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const shake = getScreenShakeOffset(time);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  ctx.scale(DUNGEON_ZOOM, DUNGEON_ZOOM);
  drawDungeon(time);
  ctx.restore();
  drawMiniMap();
}

function drawTown(time) {
  const width = townCanvas.width;
  const height = townCanvas.height;
  townCtx.fillStyle = "#080d0d";
  townCtx.fillRect(0, 0, width, height);
  if (USE_TOWN_BACKDROP && townBackdrop.complete && townBackdrop.naturalWidth) {
    const scale = Math.max(width / townBackdrop.naturalWidth, height / townBackdrop.naturalHeight);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const sourceX = (townBackdrop.naturalWidth - sourceWidth) / 2;
    const sourceY = Math.max(0, (townBackdrop.naturalHeight - sourceHeight) * 0.42);
    townCtx.drawImage(
      townBackdrop,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      width,
      height,
    );
  }

  const lowerShade = townCtx.createLinearGradient(0, height * 0.5, 0, height);
  lowerShade.addColorStop(0, "rgba(4, 8, 8, 0)");
  lowerShade.addColorStop(1, "rgba(4, 7, 7, 0.58)");
  townCtx.fillStyle = lowerShade;
  townCtx.fillRect(0, 0, width, height);

  for (let index = 0; index < 22; index += 1) {
    const phase = time / 920 + index * 1.71;
    const x = 250 + ((index * 97) % 650) + Math.sin(phase) * 16;
    const y = 155 + ((index * 43) % 390) + Math.cos(phase * 1.4) * 12;
    const alpha = 0.12 + (Math.sin(phase * 2) + 1) * 0.13;
    townCtx.fillStyle = index % 3 ? `rgba(115, 214, 211, ${alpha})` : `rgba(255, 198, 92, ${alpha})`;
    townCtx.beginPath();
    townCtx.arc(x, y, index % 4 === 0 ? 2 : 1.2, 0, Math.PI * 2);
    townCtx.fill();
  }

  townCtx.save();
  townCtx.globalAlpha = 0.94;
  drawTownPath([[576, 626], [576, 452], [576, 365]], 36);
  drawTownPath([[576, 405], [420, 430], [224, 566]], 30);
  drawTownPath([[576, 405], [730, 430], [930, 566]], 30);
  drawTownPath([[576, 365], [710, 322], [910, 312]], 26);
  drawTownPath([[576, 365], [446, 350], [286, 340]], 24);
  drawTownPlaza(time);
  drawTownBuilding({
    x: 78, y: 370, width: 262, height: 168,
    roof: "#315e67", wall: "#80918a", trim: "#75d0d1", sign: "風見倉庫",
  });
  drawTownBuilding({
    x: 812, y: 370, width: 276, height: 168,
    roof: "#7b3d37", wall: "#958273", trim: "#ef9170", sign: "星の商店",
  });
  drawTownBuilding({
    x: 796, y: 105, width: 292, height: 178,
    roof: "#3e5b43", wall: "#7f8f77", trim: "#a6cd7d", sign: "星見観測院", tower: true,
  });
  drawTownBoard(446, 228);
  drawTownLineageMirror(286, 252, time);
  drawTownGate(time);
  drawTownFacilityMarkers(time);
  townCtx.restore();

  const leader = getLeader();
  const player = game.townPlayer || (game.townPlayer = { x: 576, y: 470, dx: 0, dy: 1, movingUntil: 0 });
  const walking = player.movingUntil > time;
  const townActor = {
    ...leader,
    dx: player.dx,
    dy: player.dy,
    motion: walking
      ? {
          kind: "walk",
          fromX: 0,
          fromY: 0,
          toX: 1,
          toY: 0,
          started: player.movingUntil - 190,
          duration: 190,
        }
      : null,
  };
  const bob = walking ? 0 : Math.sin(time / 330) * 1.5;
  townCtx.save();
  townCtx.shadowColor = "rgba(0, 0, 0, 0.75)";
  townCtx.shadowBlur = 10;
  drawActorBody(townCtx, townActor, player.x - 31, player.y - 51 + bob, 1.3, time);
  townCtx.restore();
}

function drawTownLineageMirror(x, y, time) {
  const glow = 0.54 + Math.sin(time / 380) * 0.12;
  townCtx.fillStyle = "rgba(12, 23, 24, 0.72)";
  townCtx.fillRect(x - 64, y - 62, 128, 78);
  townCtx.strokeStyle = "#87dce2";
  townCtx.lineWidth = 7;
  townCtx.beginPath();
  townCtx.ellipse(x, y - 24, 31, 40, 0, 0, Math.PI * 2);
  townCtx.stroke();
  townCtx.fillStyle = `rgba(116, 221, 229, ${glow})`;
  townCtx.beginPath();
  townCtx.ellipse(x, y - 24, 23, 31, 0, 0, Math.PI * 2);
  townCtx.fill();
  townCtx.fillStyle = "#4f3528";
  townCtx.fillRect(x - 8, y + 13, 16, 43);
  townCtx.fillRect(x - 42, y + 52, 84, 9);
  townCtx.fillStyle = "#efffff";
  townCtx.font = "800 14px sans-serif";
  townCtx.textAlign = "center";
  townCtx.fillText("継承の鏡", x, y - 80);
}

function drawTownFacilityMarkers(time) {
  const focused = townFocusedFacility();
  for (const facility of townFacilities) {
    const active = focused?.key === facility.key;
    const pulse = 1 + Math.sin(time / 330 + facility.x * 0.01) * 0.13;
    townCtx.save();
    townCtx.globalAlpha = active ? 1 : 0.68;
    townCtx.strokeStyle = facility.color;
    townCtx.fillStyle = active ? `${facility.color}38` : "rgba(5, 12, 12, 0.42)";
    townCtx.lineWidth = active ? 4 : 2;
    townCtx.shadowColor = facility.color;
    townCtx.shadowBlur = active ? 22 : 10;
    townCtx.beginPath();
    townCtx.ellipse(facility.x, facility.y, 25 * pulse, 11 * pulse, 0, 0, Math.PI * 2);
    townCtx.fill();
    townCtx.stroke();
    if (active) {
      townCtx.shadowBlur = 0;
      townCtx.fillStyle = facility.color;
      townCtx.beginPath();
      townCtx.arc(facility.x, facility.y - 27, 9, 0, Math.PI * 2);
      townCtx.fill();
      townCtx.fillStyle = "#08100f";
      townCtx.font = "900 10px sans-serif";
      townCtx.textAlign = "center";
      townCtx.fillText("F", facility.x, facility.y - 23);
    }
    townCtx.restore();
  }
}

function drawTownPath(points, width) {
  townCtx.save();
  townCtx.lineCap = "round";
  townCtx.lineJoin = "round";
  townCtx.strokeStyle = "#b99b6d";
  townCtx.lineWidth = width;
  townCtx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) townCtx.moveTo(x, y);
    else townCtx.lineTo(x, y);
  });
  townCtx.stroke();
  townCtx.strokeStyle = "rgba(255, 231, 174, 0.26)";
  townCtx.lineWidth = Math.max(3, width - 12);
  townCtx.stroke();
  townCtx.restore();
}

function drawTownTree(x, y, scale = 1) {
  townCtx.save();
  townCtx.translate(x, y);
  townCtx.scale(scale, scale);
  townCtx.fillStyle = "rgba(22, 39, 25, 0.32)";
  townCtx.beginPath();
  townCtx.ellipse(0, 54, 42, 15, 0, 0, Math.PI * 2);
  townCtx.fill();
  townCtx.fillStyle = "#705237";
  townCtx.fillRect(-8, 20, 16, 42);
  townCtx.fillStyle = "#2f5d41";
  townCtx.beginPath();
  townCtx.arc(-20, 8, 27, 0, Math.PI * 2);
  townCtx.arc(17, 2, 30, 0, Math.PI * 2);
  townCtx.arc(0, -22, 31, 0, Math.PI * 2);
  townCtx.fill();
  townCtx.fillStyle = "#5d8d54";
  townCtx.beginPath();
  townCtx.arc(-12, -13, 19, 0, Math.PI * 2);
  townCtx.arc(18, -16, 17, 0, Math.PI * 2);
  townCtx.fill();
  townCtx.restore();
}

function drawTownBuilding({ x, y, width, height, roof, wall, trim, sign, tower = false }) {
  townCtx.fillStyle = "rgba(21, 31, 23, 0.34)";
  townCtx.fillRect(x + 14, y + height - 4, width, 18);
  townCtx.fillStyle = wall;
  townCtx.fillRect(x + 12, y + 48, width - 24, height - 48);
  townCtx.fillStyle = "rgba(73, 52, 37, 0.18)";
  for (let lineY = y + 66; lineY < y + height; lineY += 18) {
    townCtx.fillRect(x + 16, lineY, width - 32, 2);
  }

  townCtx.fillStyle = roof;
  townCtx.beginPath();
  townCtx.moveTo(x - 8, y + 58);
  townCtx.lineTo(x + width / 2, y);
  townCtx.lineTo(x + width + 8, y + 58);
  townCtx.closePath();
  townCtx.fill();
  townCtx.fillStyle = trim;
  townCtx.fillRect(x - 5, y + 55, width + 10, 8);

  if (tower) {
    townCtx.fillStyle = roof;
    townCtx.fillRect(x + width / 2 - 31, y - 45, 62, 58);
    townCtx.beginPath();
    townCtx.moveTo(x + width / 2 - 43, y - 42);
    townCtx.lineTo(x + width / 2, y - 82);
    townCtx.lineTo(x + width / 2 + 43, y - 42);
    townCtx.closePath();
    townCtx.fill();
    townCtx.fillStyle = trim;
    townCtx.beginPath();
    townCtx.arc(x + width / 2, y - 22, 12, 0, Math.PI * 2);
    townCtx.fill();
    townCtx.fillStyle = roof;
    townCtx.beginPath();
    townCtx.arc(x + width / 2, y - 22, 6, 0, Math.PI * 2);
    townCtx.fill();
  }

  townCtx.fillStyle = "#594737";
  townCtx.fillRect(x + width / 2 - 22, y + height - 57, 44, 57);
  townCtx.fillStyle = "#f0d875";
  townCtx.fillRect(x + width / 2 + 11, y + height - 31, 5, 5);
  townCtx.fillStyle = "#7db0af";
  townCtx.fillRect(x + 30, y + 76, 34, 27);
  townCtx.fillRect(x + width - 64, y + 76, 34, 27);
  townCtx.fillStyle = "#f7df8b";
  townCtx.fillRect(x + 45, y + 76, 4, 27);
  townCtx.fillRect(x + width - 49, y + 76, 4, 27);

  townCtx.fillStyle = "#2e352d";
  townCtx.fillRect(x + width / 2 - 65, y + 29, 130, 30);
  townCtx.strokeStyle = trim;
  townCtx.lineWidth = 2;
  townCtx.strokeRect(x + width / 2 - 65, y + 29, 130, 30);
  townCtx.fillStyle = "#fff3ce";
  townCtx.font = "800 14px sans-serif";
  townCtx.textAlign = "center";
  townCtx.fillText(sign, x + width / 2, y + 49);
}

function drawTownBoard(x, y) {
  townCtx.fillStyle = "rgba(24, 31, 23, 0.3)";
  townCtx.fillRect(x - 70, y + 86, 150, 16);
  townCtx.fillStyle = "#654831";
  townCtx.fillRect(x - 55, y, 12, 94);
  townCtx.fillRect(x + 55, y, 12, 94);
  townCtx.fillStyle = "#bf9659";
  townCtx.fillRect(x - 78, y - 8, 162, 80);
  townCtx.fillStyle = "#e8d9ac";
  for (let i = 0; i < 6; i += 1) {
    const noteX = x - 65 + (i % 3) * 48;
    const noteY = y + 3 + Math.floor(i / 3) * 34;
    townCtx.save();
    townCtx.translate(noteX, noteY);
    townCtx.rotate((i % 2 ? 1 : -1) * 0.05);
    townCtx.fillRect(0, 0, 38, 27);
    townCtx.fillStyle = i % 2 ? "#d46659" : "#5b8f95";
    townCtx.fillRect(17, -2, 5, 5);
    townCtx.restore();
    townCtx.fillStyle = "#e8d9ac";
  }
  townCtx.fillStyle = "#2e352d";
  townCtx.fillRect(x - 50, y - 34, 106, 28);
  townCtx.fillStyle = "#fff0bf";
  townCtx.font = "800 14px sans-serif";
  townCtx.textAlign = "center";
  townCtx.fillText("塔の経路板", x + 3, y - 15);
}

function drawTownPlaza(time) {
  townCtx.fillStyle = "#a8875e";
  townCtx.beginPath();
  townCtx.ellipse(576, 365, 125, 82, 0, 0, Math.PI * 2);
  townCtx.fill();
  townCtx.strokeStyle = "rgba(255, 232, 180, 0.34)";
  townCtx.lineWidth = 5;
  townCtx.stroke();
  townCtx.fillStyle = "#6f7771";
  townCtx.beginPath();
  townCtx.ellipse(576, 346, 58, 31, 0, 0, Math.PI * 2);
  townCtx.fill();
  townCtx.fillStyle = "#68a9ac";
  townCtx.beginPath();
  townCtx.ellipse(576, 341, 46, 21, 0, 0, Math.PI * 2);
  townCtx.fill();
  townCtx.fillStyle = "#d6c778";
  townCtx.beginPath();
  const pulse = 17 + Math.sin(time / 300) * 2;
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 ? pulse * 0.45 : pulse;
    const x = 576 + Math.cos(angle) * radius;
    const y = 315 + Math.sin(angle) * radius;
    if (i === 0) townCtx.moveTo(x, y);
    else townCtx.lineTo(x, y);
  }
  townCtx.closePath();
  townCtx.fill();
}

function drawTownBridge(x, y) {
  townCtx.fillStyle = "#684b33";
  townCtx.fillRect(x - 66, y - 45, 132, 94);
  townCtx.fillStyle = "#b3814a";
  for (let yy = y - 40; yy < y + 45; yy += 13) {
    townCtx.fillRect(x - 60, yy, 120, 9);
  }
  townCtx.fillStyle = "#493724";
  townCtx.fillRect(x - 70, y - 49, 10, 100);
  townCtx.fillRect(x + 60, y - 49, 10, 100);
}

function drawTownGate(time) {
  const glow = 0.36 + (Math.sin(time / 360) + 1) * 0.12;
  townCtx.fillStyle = "#5c4632";
  townCtx.fillRect(500, 638, 18, 52);
  townCtx.fillRect(634, 638, 18, 52);
  townCtx.fillRect(490, 630, 172, 17);
  townCtx.fillStyle = `rgba(255, 210, 105, ${glow})`;
  townCtx.fillRect(521, 648, 110, 42);
  townCtx.fillStyle = "#2e352d";
  townCtx.fillRect(518, 607, 116, 27);
  townCtx.fillStyle = "#fff1bc";
  townCtx.font = "800 14px sans-serif";
  townCtx.textAlign = "center";
  townCtx.fillText("出発門", 576, 625);
}

function drawTownNpc(enemy, x, y, time, bubbleColor) {
  const bob = Math.sin(time / 310 + x) * 2;
  townCtx.fillStyle = "rgba(19, 27, 21, 0.25)";
  townCtx.beginPath();
  townCtx.ellipse(x + 22, y + 44, 22, 7, 0, 0, Math.PI * 2);
  townCtx.fill();
  drawSpriteOnContext(townCtx, enemy.sprite, x, y + bob, 44, 44);
  townCtx.fillStyle = bubbleColor;
  townCtx.beginPath();
  townCtx.arc(x + 48, y - 4 + bob, 6, 0, Math.PI * 2);
  townCtx.fill();
  townCtx.beginPath();
  townCtx.arc(x + 61, y - 13 + bob, 4, 0, Math.PI * 2);
  townCtx.fill();
}

function getCamera(time) {
  const leader = getLeader();
  const visual = getActorVisualPosition(leader, time);
  const viewW = Math.floor(dungeonViewWidth() / TILE);
  const viewH = Math.floor(dungeonViewHeight() / TILE);
  return {
    x: clamp(visual.x - viewW / 2, 0, Math.max(0, MAP_W - viewW)),
    y: clamp(visual.y - viewH / 2, 0, Math.max(0, MAP_H - viewH)),
    width: viewW,
    height: viewH,
  };
}

function dungeonViewWidth() {
  return canvas.width / DUNGEON_ZOOM;
}

function dungeonViewHeight() {
  return canvas.height / DUNGEON_ZOOM;
}

function drawDungeon(time) {
  const startX = Math.max(0, Math.floor(renderCamera.x) - 1);
  const endX = Math.min(MAP_W, Math.ceil(renderCamera.x + renderCamera.width) + 1);
  const startY = Math.max(0, Math.floor(renderCamera.y) - 1);
  const endY = Math.min(MAP_H, Math.ceil(renderCamera.y + renderCamera.height) + 1);

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      if (!game.seen[y][x]) drawUnknownTile(x, y);
      else drawTile(x, y, game.map[y][x], game.visible[y][x]);
    }
  }

  if (game.stairsRevealed && game.seen[game.stairs.y][game.stairs.x] && inCamera(game.stairs.x, game.stairs.y)) drawStairs(time);
  if (
    game.secretStairs?.revealed
    && game.seen[game.secretStairs.y]?.[game.secretStairs.x]
    && inCamera(game.secretStairs.x, game.secretStairs.y)
  ) drawSecretStairs(time);
  if (game.mission && game.seen[game.mission.y][game.mission.x] && inCamera(game.mission.x, game.mission.y)) {
    drawMission(time);
  }
  for (const trap of game.traps) {
    if (trap.revealed && game.seen[trap.y]?.[trap.x] && inCamera(trap.x, trap.y)) drawTrap(trap, time);
  }
  for (const node of game.restNodes || []) {
    if (game.seen[node.y]?.[node.x] && inCamera(node.x, node.y)) drawRestNode(node, time);
  }

  for (const item of game.items) {
    if (isVisible(item.x, item.y) && inCamera(item.x, item.y)) drawItem(item, time);
  }
  if (game.merchant && isVisible(game.merchant.x, game.merchant.y) && inCamera(game.merchant.x, game.merchant.y)) {
    drawMerchant(time);
  }
  if (game.casino && isVisible(game.casino.x, game.casino.y) && inCamera(game.casino.x, game.casino.y)) {
    drawCasino(time);
  }
  for (const enemy of game.enemies) {
    if (isVisible(enemy.x, enemy.y) && inCamera(enemy.x, enemy.y)) drawEnemy(enemy, time);
  }
  for (const actor of game.team.filter((member) => member.id !== "leader")) {
    if (game.seen[actor.y][actor.x] && inCamera(actor.x, actor.y)) drawActor(actor, time);
  }
  const leader = getLeader();
  if (game.seen[leader.y][leader.x] && inCamera(leader.x, leader.y)) drawActor(leader, time);

  for (const effect of game.effects) drawEffect(effect, time);
  for (const text of game.floating) drawFloatingText(text, time);
  drawFog();
  drawObjectivePointer(time);
  drawAimIndicator();
  drawBossHud();
  drawScreenFlash(time);
  game.effects = game.effects.filter((effect) => time - effect.created < effect.life);
  game.floating = game.floating.filter((text) => time - text.created < text.life);
}

function setLimitedCanvasCache(cache, key, value, limit) {
  if (cache.size >= limit) cache.delete(cache.keys().next().value);
  cache.set(key, value);
  return value;
}

function dungeonTileVisualKey(x, y, type, visible, unknown) {
  if (unknown) {
    const variant = Math.floor(noise(x, y, 171) * 8);
    return [currentDungeonThemeKey(), game.floorKind, game.restTheme?.index ?? "-", "unknown", variant].join(":");
  }
  const shopState = isMerchantShopTile(x, y) ? (game.merchant?.robbed ? "robbed" : "shop") : "none";
  return [
    game.floor,
    currentDungeonThemeKey(),
    game.floorKind,
    game.restTheme?.index ?? "-",
    x,
    y,
    unknown ? "unknown" : type,
    visible ? 1 : 0,
    shopState,
  ].join(":");
}

function buildDungeonTileCanvas(x, y, type, visible, unknown) {
  const tileCanvas = document.createElement("canvas");
  const padding = unknown ? 24 : DUNGEON_TILE_PADDING;
  tileCanvas.width = TILE + padding * 2;
  tileCanvas.height = TILE + padding * 2;
  const tileCtx = tileCanvas.getContext("2d");
  const previousCtx = ctx;
  const previousCamera = renderCamera;
  try {
    ctx = tileCtx;
    renderCamera = {
      x: x - padding / TILE,
      y: y - padding / TILE,
      width: 1,
      height: 1,
    };
    if (unknown) renderUnknownTile(x, y);
    else renderDungeonTile(x, y, type, visible);
  } finally {
    ctx = previousCtx;
    renderCamera = previousCamera;
  }
  return { canvas: tileCanvas, padding };
}

function cachedDungeonTile(x, y, type, visible, unknown = false) {
  const key = dungeonTileVisualKey(x, y, type, visible, unknown);
  const cached = dungeonTileCache.get(key);
  if (cached) return cached;
  return setLimitedCanvasCache(
    dungeonTileCache,
    key,
    buildDungeonTileCanvas(x, y, type, visible, unknown),
    DUNGEON_TILE_CACHE_LIMIT,
  );
}

function drawUnknownTile(x, y) {
  const { x: px, y: py } = toScreen(x, y);
  const cached = cachedDungeonTile(x, y, "unknown", false, true);
  ctx.drawImage(cached.canvas, px - cached.padding, py - cached.padding);
}

function drawTile(x, y, type, visible) {
  const { x: px, y: py } = toScreen(x, y);
  const cached = cachedDungeonTile(x, y, type, visible, false);
  ctx.drawImage(cached.canvas, px - cached.padding, py - cached.padding);
}

function renderUnknownTile(x, y) {
  const { x: px, y: py } = toScreen(x, y);
  const theme = currentDungeonTheme();
  const themeKey = currentDungeonThemeKey();
  const grain = noise(x, y, 171);
  ctx.fillStyle = theme.unknown;
  ctx.fillRect(px, py, TILE, TILE);
  ctx.save();
  ctx.globalAlpha = 0.28;
  if (themeKey === "forest") {
    ctx.fillStyle = grain > 0.5 ? "#183420" : "#10271a";
    for (let index = 0; index < 3; index += 1) {
      const ox = px - 5 + noise(x + index, y, 191) * 58;
      const oy = py - 4 + noise(x, y + index, 223) * 56;
      const radius = 8 + noise(x + index, y - index, 257) * 10;
      ctx.beginPath();
      ctx.arc(ox, oy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (grain > 0.63) {
      ctx.strokeStyle = "#34573a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - 2, py + 10 + grain * 18);
      ctx.bezierCurveTo(px + 14, py + 2, px + 27, py + 45, px + 51, py + 31);
      ctx.stroke();
    }
  } else if (themeKey === "tower") {
    ctx.strokeStyle = "#60727d";
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 5, py + 5, TILE - 10, TILE - 10);
    if (grain > 0.58) {
      ctx.beginPath();
      ctx.moveTo(px + 7, py + 24);
      ctx.lineTo(px + 41, py + 24);
      ctx.moveTo(px + 24, py + 7);
      ctx.lineTo(px + 24, py + 41);
      ctx.stroke();
    }
  } else if (themeKey === "dream") {
    ctx.fillStyle = "#624a7a";
    ctx.beginPath();
    ctx.arc(px + 9 + grain * 30, py + 12 + grain * 22, 2 + grain * 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (themeKey === "ruins") {
    ctx.strokeStyle = "#6f5145";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + 8, py + 7);
    ctx.lineTo(px + 18, py + 19);
    ctx.lineTo(px + 12, py + 35);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#70478c";
    ctx.beginPath();
    ctx.arc(px + 7 + grain * 34, py + 9 + grain * 29, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderDungeonTile(x, y, type, visible) {
  const { x: px, y: py } = toScreen(x, y);
  const theme = currentDungeonTheme();
  const themeKey = currentDungeonThemeKey();
  if (type === "wall") {
    drawDungeonWallTile(px, py, x, y, theme, themeKey, visible);
    return;
  }

  drawDungeonFloorTile(px, py, x, y, type, theme, themeKey, visible);
  if (isMerchantShopTile(x, y)) {
    ctx.fillStyle = game.merchant?.robbed ? "rgba(139, 47, 56, 0.5)" : "rgba(43, 139, 116, 0.48)";
    ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
    ctx.strokeStyle = game.merchant?.robbed ? "#e86c70" : "#75e3bf";
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 4, py + 4, TILE - 8, TILE - 8);
    ctx.fillStyle = game.merchant?.robbed ? "rgba(255, 104, 107, 0.2)" : "rgba(201, 255, 230, 0.18)";
    ctx.fillRect(px + 8, py + 8, 6, 6);
    ctx.fillRect(px + TILE - 14, py + TILE - 14, 6, 6);
  }

  if (game.floorKind?.includes("rest")) drawRestTileMotif(px, py, x, y, visible);
}

function currentDungeonThemeKey() {
  if (game.floorKind?.includes("rest") && game.restTheme?.base) return game.restTheme.base;
  if (game.floor <= 20) return "forest";
  if (game.floor <= 40) return "tower";
  if (game.floor <= 60) return "dream";
  if (game.floor <= 80) return "ruins";
  return "void";
}

function drawDungeonWallTile(px, py, x, y, theme, themeKey, visible) {
  const openBelow = game.map[y + 1]?.[x] !== "wall";
  const openLeft = game.map[y]?.[x - 1] !== "wall";
  const openRight = game.map[y]?.[x + 1] !== "wall";
  const dim = visible ? 1 : 0.56;
  ctx.save();
  ctx.globalAlpha = dim;
  ctx.fillStyle = theme.wallDark;
  ctx.fillRect(px, py, TILE, TILE);

  const rockLayout = [
    [-5, -4, 29, 27],
    [20, -6, 34, 28],
    [1, 19, 31, 34],
    [27, 18, 27, 33],
    [14, 10, 27, 28],
  ];
  for (let index = 0; index < rockLayout.length; index += 1) {
    const seed = noise(x * 7 + index, y * 11 - index, 311 + index * 47);
    const [baseLeft, baseTop, baseWidth, baseHeight] = rockLayout[index];
    const left = px + baseLeft + Math.floor((seed - 0.5) * 5);
    const top = py + baseTop + Math.floor((noise(x, y, 401 + index) - 0.5) * 5);
    const width = baseWidth + Math.floor(seed * 4);
    const height = baseHeight + Math.floor(noise(x - index, y + index, 457) * 4);
    const lightRock = index === 0 || (index === 4 && seed > 0.48);
    ctx.fillStyle = lightRock ? theme.wallLight : theme.wall;
    ctx.beginPath();
    ctx.moveTo(left + width * 0.18, top);
    ctx.lineTo(left + width * 0.72, top + 1);
    ctx.lineTo(left + width, top + height * 0.28);
    ctx.lineTo(left + width * 0.88, top + height * 0.82);
    ctx.lineTo(left + width * 0.58, top + height);
    ctx.lineTo(left + width * 0.12, top + height * 0.87);
    ctx.lineTo(left, top + height * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(5, 10, 8, 0.28)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 226, 0.11)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(left + width * 0.2, top + height * 0.16);
    ctx.quadraticCurveTo(left + width * 0.48, top + height * 0.04, left + width * 0.72, top + height * 0.18);
    ctx.stroke();
  }

  if (themeKey === "forest") {
    ctx.fillStyle = visible ? "#3f6f3f" : "#2b4a34";
    for (let index = 0; index < 9; index += 1) {
      const ox = px - 2 + noise(x + index * 2, y, 509) * 52;
      const oy = py - 3 + noise(x, y + index * 2, 541) * 25;
      const radius = 3 + noise(x + index, y - index, 577) * 4;
      ctx.beginPath();
      ctx.arc(ox, oy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = visible ? "rgba(166, 202, 108, 0.34)" : "rgba(94, 126, 79, 0.22)";
    ctx.beginPath();
    ctx.arc(px + 9 + noise(x, y, 611) * 31, py + 5 + noise(x, y, 617) * 12, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (openBelow) {
    const cliff = ctx.createLinearGradient(0, py + 32, 0, py + TILE);
    cliff.addColorStop(0, "rgba(4, 8, 6, 0.12)");
    cliff.addColorStop(1, "rgba(2, 5, 4, 0.72)");
    ctx.fillStyle = cliff;
    ctx.fillRect(px, py + 31, TILE, 17);
    ctx.strokeStyle = themeKey === "forest" ? "#78955a" : theme.wallLight;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, py + 34 + noise(x, y, 643) * 2);
    ctx.lineTo(px + 12, py + 32);
    ctx.lineTo(px + 25, py + 35);
    ctx.lineTo(px + 37, py + 32);
    ctx.lineTo(px + TILE, py + 34);
    ctx.stroke();
    if (themeKey === "forest") {
      ctx.strokeStyle = visible ? "#a2bd72" : "#657a54";
      ctx.lineWidth = 1.3;
      for (let index = 0; index < 6; index += 1) {
        const gx = px + 4 + index * 8 + noise(x + index, y, 661) * 3;
        const gy = py + 34;
        ctx.beginPath();
        ctx.moveTo(gx, gy + 2);
        ctx.lineTo(gx - 2, gy - 5 - (index % 3));
        ctx.moveTo(gx, gy + 2);
        ctx.lineTo(gx + 3, gy - 3 - (index % 2));
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = dim;
  if (openLeft) {
    ctx.strokeStyle = "rgba(232, 240, 216, 0.13)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px + 1, py + 5);
    ctx.lineTo(px + 2, py + 39);
    ctx.stroke();
  }
  if (openRight) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
    ctx.fillRect(px + TILE - 3, py + 5, 3, 38);
  }

  drawDungeonWallMotif(px, py, x, y, theme, themeKey, visible);
  ctx.restore();
}

function drawDungeonWallMotif(px, py, x, y, theme, themeKey, visible) {
  const detail = noise(x, y, 733);
  if (themeKey === "forest") {
    ctx.fillStyle = visible ? "#4f7c4b" : "#34543a";
    for (let index = 0; index < 4; index += 1) {
      const ox = px + 5 + Math.floor(noise(x + index, y, 801) * 38);
      const oy = py + 3 + Math.floor(noise(x, y + index, 823) * 10);
      ctx.beginPath();
      ctx.arc(ox, oy, 4 + (index % 2), 0, Math.PI * 2);
      ctx.fill();
    }
    if (detail > 0.48) {
      ctx.strokeStyle = visible ? "#84aa62" : "#57724c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 9 + detail * 18, py + 4);
      ctx.bezierCurveTo(px + 6, py + 16, px + 30, py + 23, px + 20, py + 39);
      ctx.stroke();
    }
  } else if (themeKey === "tower") {
    ctx.strokeStyle = visible ? "rgba(166, 211, 219, 0.38)" : "rgba(105, 137, 145, 0.24)";
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 8, py + 8, 32, 32);
    ctx.beginPath();
    ctx.moveTo(px + 24, py + 8);
    ctx.lineTo(px + 24, py + 40);
    ctx.moveTo(px + 8, py + 24);
    ctx.lineTo(px + 40, py + 24);
    ctx.stroke();
  } else if (themeKey === "dream") {
    ctx.fillStyle = visible ? "rgba(187, 148, 232, 0.45)" : "rgba(109, 84, 139, 0.3)";
    ctx.beginPath();
    ctx.moveTo(px + 24, py + 5);
    ctx.lineTo(px + 31, py + 20);
    ctx.lineTo(px + 24, py + 29);
    ctx.lineTo(px + 18, py + 20);
    ctx.closePath();
    ctx.fill();
  } else if (themeKey === "ruins") {
    ctx.strokeStyle = visible ? "rgba(255, 184, 125, 0.28)" : "rgba(133, 87, 70, 0.24)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px + 11, py + 7);
    ctx.lineTo(px + 19, py + 17);
    ctx.lineTo(px + 15, py + 29);
    ctx.lineTo(px + 28, py + 39);
    ctx.stroke();
  } else {
    ctx.strokeStyle = visible ? "rgba(195, 111, 239, 0.5)" : "rgba(106, 65, 136, 0.28)";
    ctx.lineWidth = 2;
    ctx.shadowColor = visible ? "#bc67ea" : "transparent";
    ctx.shadowBlur = visible ? 4 : 0;
    ctx.beginPath();
    ctx.moveTo(px + 6, py + 34);
    ctx.lineTo(px + 17, py + 24);
    ctx.lineTo(px + 23, py + 29);
    ctx.lineTo(px + 39, py + 13);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function drawDungeonFloorTile(px, py, x, y, type, theme, themeKey, visible) {
  const floorColors = {
    floor: visible ? theme.floor : theme.floorDim,
    moss: visible ? theme.moss : theme.mossDim,
    crack: visible ? theme.crack : theme.crackDim,
  };
  const grain = noise(x, y, 93);
  ctx.fillStyle = floorColors[type] || floorColors.floor;
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = grain > 0.52 ? "rgba(255, 235, 191, 0.065)" : "rgba(20, 12, 7, 0.055)";
  ctx.beginPath();
  ctx.ellipse(
    px + 9 + noise(x, y, 907) * 32,
    py + 8 + noise(x, y, 911) * 31,
    13 + grain * 12,
    8 + noise(x, y, 919) * 10,
    grain * 2,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  if (game.map[y - 1]?.[x] === "wall") {
    ctx.fillStyle = "rgba(2, 7, 5, 0.22)";
    ctx.fillRect(px, py, TILE, 8);
  }
  if (game.map[y]?.[x - 1] === "wall") {
    ctx.fillStyle = "rgba(2, 7, 5, 0.1)";
    ctx.fillRect(px, py, 5, TILE);
  }

  if (type === "moss") {
    ctx.fillStyle = visible ? "rgba(132, 184, 91, 0.38)" : "rgba(71, 111, 68, 0.3)";
    for (let index = 0; index < 5; index += 1) {
      const ox = px + 5 + Math.floor(noise(x + index, y, 947) * 38);
      const oy = py + 7 + Math.floor(noise(x, y + index, 971) * 34);
      ctx.beginPath();
      ctx.arc(ox, oy, 3 + (index % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = visible ? "rgba(205, 235, 130, 0.64)" : "rgba(128, 157, 96, 0.38)";
    ctx.lineWidth = 1.5;
    for (let index = 0; index < 3; index += 1) {
      const ox = px + 10 + Math.floor(noise(x + index, y, 997) * 28);
      const oy = py + 16 + index * 8;
      ctx.beginPath();
      ctx.moveTo(ox, oy + 5);
      ctx.lineTo(ox - 3, oy);
      ctx.moveTo(ox, oy + 5);
      ctx.lineTo(ox + 3, oy - 2);
      ctx.stroke();
    }
  } else if (type === "crack") {
    ctx.strokeStyle = visible ? "#ffc45a" : "#a86d4e";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = visible ? "#ff7048" : "transparent";
    ctx.shadowBlur = visible ? 6 : 0;
    ctx.beginPath();
    ctx.moveTo(px + 6, py + 10);
    ctx.lineTo(px + 19, py + 19);
    ctx.lineTo(px + 14, py + 29);
    ctx.lineTo(px + 29, py + 35);
    ctx.lineTo(px + 42, py + 43);
    ctx.moveTo(px + 19, py + 19);
    ctx.lineTo(px + 34, py + 12);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else {
    drawDungeonFloorDetails(px, py, x, y, themeKey, visible, grain);
  }
  drawDungeonFloorEdges(px, py, x, y, themeKey, visible);
}

function drawDungeonFloorDetails(px, py, x, y, themeKey, visible, grain) {
  const alpha = visible ? 1 : 0.5;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (themeKey === "forest") {
    ctx.fillStyle = "rgba(255, 226, 164, 0.22)";
    for (let index = 0; index < 3; index += 1) {
      const ox = px + 5 + noise(x + index, y, 1031) * 38;
      const oy = py + 7 + noise(x, y + index, 1049) * 34;
      ctx.beginPath();
      ctx.ellipse(ox, oy, 2.5 + (index % 2), 1.4, grain + index, 0, Math.PI * 2);
      ctx.fill();
    }
    if (noise(x, y, 1061) > 0.58) drawGrassTuft(px + 6 + grain * 30, py + 43, visible);
    if (noise(x, y, 1067) > 0.82) {
      ctx.fillStyle = visible ? "#d67c72" : "#7c5e56";
      ctx.beginPath();
      ctx.arc(px + 12 + grain * 24, py + 16 + grain * 16, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (themeKey === "tower") {
    ctx.strokeStyle = "rgba(211, 226, 226, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 3, py + 24);
    ctx.lineTo(px + 45, py + 24);
    ctx.moveTo(px + 24, py + 3);
    ctx.lineTo(px + 24, py + 45);
    ctx.stroke();
  } else if (themeKey === "dream") {
    ctx.fillStyle = "rgba(232, 195, 255, 0.18)";
    drawPixelStar(ctx, px + 13 + grain * 20, py + 17 + grain * 13, 4, ctx.fillStyle);
  } else if (themeKey === "ruins") {
    ctx.fillStyle = "rgba(245, 205, 157, 0.15)";
    ctx.fillRect(px + 7 + grain * 14, py + 10, 6, 3);
    ctx.fillRect(px + 29 - grain * 8, py + 35, 8, 3);
  } else {
    ctx.fillStyle = "rgba(195, 123, 242, 0.2)";
    ctx.beginPath();
    ctx.arc(px + 12 + grain * 25, py + 12 + grain * 19, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDungeonFloorEdges(px, py, x, y, themeKey, visible) {
  if (themeKey !== "forest") return;
  const wallAbove = game.map[y - 1]?.[x] === "wall";
  const wallBelow = game.map[y + 1]?.[x] === "wall";
  const wallLeft = game.map[y]?.[x - 1] === "wall";
  const wallRight = game.map[y]?.[x + 1] === "wall";
  ctx.save();
  ctx.globalAlpha = visible ? 0.86 : 0.44;
  ctx.fillStyle = visible ? "#547a43" : "#40583b";
  if (wallAbove || wallBelow) {
    const edgeY = wallAbove ? py + 2 : py + TILE - 3;
    for (let index = 0; index < 6; index += 1) {
      const radius = 2.5 + noise(x + index, y, 1129) * 2.5;
      ctx.beginPath();
      ctx.arc(px + 3 + index * 8 + noise(x, y + index, 1151) * 3, edgeY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (wallLeft || wallRight) {
    const edgeX = wallLeft ? px + 2 : px + TILE - 3;
    for (let index = 0; index < 5; index += 1) {
      const radius = 2 + noise(x, y + index, 1171) * 2.5;
      ctx.beginPath();
      ctx.arc(edgeX, py + 4 + index * 10 + noise(x + index, y, 1193) * 3, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawGrassTuft(x, y, visible) {
  ctx.save();
  ctx.strokeStyle = visible ? "#83a85f" : "#566f4c";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 4, y - 8);
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 10);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 5, y - 7);
  ctx.stroke();
  ctx.restore();
}

function currentDungeonTheme() {
  if (game.floorKind?.includes("rest") && game.restTheme) {
    const base = dungeonThemes[game.restTheme.base] || dungeonThemes.forest;
    return {
      ...base,
      unknown: game.restTheme.wallDark,
      wall: game.restTheme.wall,
      wallDark: game.restTheme.wallDark,
      wallLight: game.restTheme.wallLight,
      floor: game.restTheme.floor,
      floorDim: game.restTheme.floorDim,
    };
  }
  if (game.floor <= 20) return dungeonThemes.forest;
  if (game.floor <= 40) return dungeonThemes.tower;
  if (game.floor <= 60) return dungeonThemes.dream;
  if (game.floor <= 80) return dungeonThemes.ruins;
  return dungeonThemes.void;
}

function drawRestTileMotif(px, py, x, y, visible) {
  const theme = game.restTheme;
  if (!theme || noise(x, y, 217 + theme.index) < 0.72) return;
  const ox = px + 10 + Math.floor(noise(x, y, 431) * 27);
  const oy = py + 11 + Math.floor(noise(x, y, 577) * 25);
  ctx.save();
  ctx.globalAlpha = visible ? 0.36 : 0.16;
  ctx.strokeStyle = theme.accent;
  ctx.fillStyle = theme.glow;
  ctx.lineWidth = 2;
  if (theme.motif === "leaf" || theme.motif === "root") {
    ctx.beginPath();
    ctx.ellipse(ox, oy, 5, 2.5, -0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox - 6, oy + 5);
    ctx.quadraticCurveTo(ox, oy, ox + 6, oy - 5);
    ctx.stroke();
  } else if (theme.motif === "crystal") {
    ctx.beginPath();
    ctx.moveTo(ox, oy - 7);
    ctx.lineTo(ox + 5, oy + 5);
    ctx.lineTo(ox, oy + 2);
    ctx.lineTo(ox - 5, oy + 5);
    ctx.closePath();
    ctx.stroke();
  } else if (theme.motif === "ember" || theme.motif === "storm") {
    ctx.beginPath();
    ctx.moveTo(ox + 4, oy - 7);
    ctx.lineTo(ox - 2, oy);
    ctx.lineTo(ox + 3, oy);
    ctx.lineTo(ox - 4, oy + 7);
    ctx.stroke();
  } else if (theme.motif === "moon") {
    ctx.beginPath();
    ctx.arc(ox, oy, 6, 0.35, Math.PI * 1.65);
    ctx.arc(ox + 3, oy, 4, Math.PI * 1.55, 0.45, true);
    ctx.stroke();
  } else if (theme.motif === "gear") {
    ctx.beginPath();
    ctx.arc(ox, oy, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ox, oy, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (theme.motif === "bloom") {
    for (let index = 0; index < 4; index += 1) {
      const angle = (Math.PI * index) / 2;
      ctx.beginPath();
      ctx.arc(ox + Math.cos(angle) * 4, oy + Math.sin(angle) * 4, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    drawPixelStar(ctx, ox, oy, theme.motif === "star" ? 9 : 6, theme.accent);
  }
  ctx.restore();
}

function drawStairs(time) {
  const { x: px, y: py } = toScreen(game.stairs.x, game.stairs.y);
  const open = game.mission?.complete;
  const pulse = Math.sin(time / 190) * 2;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.beginPath();
  ctx.ellipse(px + 24, py + 40, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (open) {
    ctx.fillStyle = "rgba(255, 215, 113, 0.18)";
    ctx.beginPath();
    ctx.arc(px + 24, py + 23, 23 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffe49a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px + 24, py + 23, 17 + pulse * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(240, 179, 77, 0.5)";
    ctx.fillRect(px + 11, py + 8, 26, 31);
    ctx.fillStyle = "#fff7ce";
    for (let y = 0; y < 2; y += 1) {
      const offset = y * 11;
      ctx.beginPath();
      ctx.moveTo(px + 16, py + 25 - offset);
      ctx.lineTo(px + 24, py + 17 - offset);
      ctx.lineTo(px + 32, py + 25 - offset);
      ctx.lineTo(px + 32, py + 30 - offset);
      ctx.lineTo(px + 24, py + 22 - offset);
      ctx.lineTo(px + 16, py + 30 - offset);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#251d12";
    ctx.fillRect(px + 8, py + 39, 32, 8);
    ctx.fillStyle = "#ffe7a6";
    ctx.font = "900 7px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(game.floor >= game.targetFloor ? "TOWN" : "NEXT", px + 24, py + 46);
  } else {
    ctx.fillStyle = "#555b5a";
    ctx.fillRect(px + 8, py + 32, 32, 10);
    ctx.fillStyle = "#707776";
    ctx.fillRect(px + 13, py + 25, 22, 10);
    ctx.strokeStyle = "#a5aaa6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(px + 24, py + 23, 9, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = "#2a2e2d";
    ctx.fillRect(px + 21, py + 30, 6, 7);
  }
  ctx.restore();
}

function drawSecretStairs(time) {
  const secret = game.secretStairs;
  const { x: px, y: py } = toScreen(secret.x, secret.y);
  const pulse = 14 + Math.sin(time / 170) * 3;
  ctx.save();
  ctx.fillStyle = "rgba(128, 71, 181, 0.25)";
  ctx.beginPath();
  ctx.arc(px + 24, py + 24, pulse + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = secret.used ? "#79668a" : "#d7a4ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(px + 24, py + 24, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = secret.used ? "#756a7c" : "#f0d1ff";
  drawPixelStar(ctx, px + 24, py + 24, 14, ctx.fillStyle);
  ctx.fillStyle = "#24162f";
  ctx.font = "900 8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(secret.used ? "EMPTY" : "ALTAR", px + 24, py + 46);
  ctx.restore();
}

function drawMission(time) {
  if (game.mission.complete || game.mission.boss) return;
  const { x: px, y: py } = toScreen(game.mission.x, game.mission.y);
  const bob = Math.sin(time / 240) * 3;
  ctx.fillStyle = game.mission.threatened ? "rgba(255,79,79,0.28)" : "rgba(229,174,72,0.22)";
  ctx.beginPath();
  ctx.arc(px + 24, py + 24 + bob, 18, 0, Math.PI * 2);
  ctx.fill();
  drawSprite(spriteIds.mission, px + 10, py + 8 + bob, 28, 28);
  ctx.fillStyle = game.mission.threatened ? "#ff8a79" : palette.white;
  ctx.font = "700 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(game.mission.threatened ? "WARN" : "HELP", px + 24, py + 43 + bob);
}

function drawRestNode(node, time) {
  const { x: px, y: py } = toScreen(node.x, node.y);
  const bob = Math.sin(time / 270 + node.x * 0.7) * 2;
  const inactive = node.action === "milestone" && game.restChoiceTaken;
  const color = inactive ? "#817a70" : node.color;
  drawOutlinedEntity((targetCtx) => {
    targetCtx.save();
    if (node.action === "milestone") {
      targetCtx.fillStyle = inactive ? "#403b3a" : "#312546";
      targetCtx.fillRect(6, 34, 36, 8);
      targetCtx.fillStyle = color;
      targetCtx.fillRect(12, 28, 24, 7);
      targetCtx.fillStyle = inactive ? "#6f6a63" : "#f2d16e";
      targetCtx.fillRect(18, 17, 12, 12);
      targetCtx.fillStyle = inactive ? "#9b958a" : "#fff7bd";
      targetCtx.fillRect(21, 10, 6, 25);
      targetCtx.fillStyle = inactive ? "#9b958a" : game.restTheme?.glow || "#fff2b1";
      drawPixelStar(targetCtx, 24, 13, 13, targetCtx.fillStyle);
      targetCtx.strokeStyle = color;
      targetCtx.lineWidth = 2;
      targetCtx.beginPath();
      targetCtx.arc(24, 16, 15 + Math.sin(time / 180) * 2, 0, Math.PI * 2);
      targetCtx.stroke();
    } else if (node.key === "storage") {
      targetCtx.fillStyle = "#213244";
      targetCtx.fillRect(5, 22, 38, 19);
      targetCtx.fillStyle = "#3c80a2";
      targetCtx.fillRect(8, 14, 32, 13);
      targetCtx.fillStyle = "#bdefff";
      targetCtx.fillRect(10, 20, 28, 3);
      targetCtx.fillStyle = "#f2d16e";
      targetCtx.fillRect(21, 22, 7, 14);
      targetCtx.fillStyle = "#14212d";
      targetCtx.fillRect(23, 27, 3, 5);
    } else if (node.key === "healer") {
      targetCtx.fillStyle = "#456d7c";
      targetCtx.fillRect(8, 28, 32, 11);
      targetCtx.fillStyle = "#83d9e4";
      targetCtx.fillRect(12, 25, 24, 7);
      targetCtx.strokeStyle = "#e8fbff";
      targetCtx.lineWidth = 2;
      for (let index = 0; index < 3; index += 1) {
        targetCtx.beginPath();
        targetCtx.moveTo(15 + index * 9, 23);
        targetCtx.quadraticCurveTo(11 + index * 9, 15, 16 + index * 9, 9);
        targetCtx.stroke();
      }
    } else if (node.key === "mystic") {
      targetCtx.fillStyle = "#eadcb2";
      targetCtx.fillRect(10, 12, 28, 28);
      targetCtx.fillStyle = "#79588f";
      targetCtx.fillRect(7, 10, 6, 32);
      targetCtx.fillRect(35, 10, 6, 32);
      targetCtx.strokeStyle = "#9a72bc";
      targetCtx.lineWidth = 2;
      targetCtx.beginPath();
      targetCtx.arc(24, 25, 8, 0, Math.PI * 2);
      targetCtx.stroke();
      drawPixelStar(targetCtx, 24, 25, 8, "#8c65ab");
    } else {
      targetCtx.fillStyle = "#302544";
      targetCtx.fillRect(8, 9, 32, 32);
      targetCtx.fillStyle = "#f4e7b3";
      targetCtx.fillRect(13, 14, 22, 22);
      targetCtx.fillStyle = "#8e3f72";
      [[17, 18], [30, 18], [17, 31], [30, 31]].forEach(([x, y]) => {
        targetCtx.beginPath();
        targetCtx.arc(x, y, 2, 0, Math.PI * 2);
        targetCtx.fill();
      });
    }
    targetCtx.restore();
  }, px, py + bob, color, 2);
  const label = node.action === "milestone" ? (inactive ? "祭壇済" : "進化/遺") : node.key === "storage" ? "倉庫" : node.name.slice(0, 6);
  ctx.fillStyle = "rgba(7, 11, 11, 0.9)";
  ctx.fillRect(px + 2, py + 38, 44, 10);
  ctx.fillStyle = inactive ? "#aaa499" : color;
  ctx.font = "900 7px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, px + 24, py + 46);
}

function drawTrap(trap, time) {
  const { x: px, y: py } = toScreen(trap.x, trap.y);
  const pulse = 0.72 + Math.sin(time / 180 + trap.x) * 0.2;
  ctx.save();
  ctx.globalAlpha = trap.used ? 0.55 : pulse;
  ctx.strokeStyle = trap.used ? "#8c6964" : "#ff7669";
  ctx.fillStyle = "rgba(71, 18, 20, 0.56)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(px + 24, py + 24, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6;
    ctx.moveTo(px + 24, py + 24);
    ctx.lineTo(px + 24 + Math.cos(angle) * 12, py + 24 + Math.sin(angle) * 12);
  }
  ctx.stroke();
  ctx.restore();
}

function drawItem(item, time) {
  const { x: px, y: py } = toScreen(item.x, item.y);
  const bob = Math.sin(time / 260 + item.x) * 2;
  drawOutlinedEntity((targetCtx) => {
    drawItemIcon(targetCtx, item.kind, item.gear);
  }, px, py + bob, item.shopItem ? "#75e3bf" : "#ffd84d", item.shopItem ? 3 : 2);
  if (item.shopItem) {
    ctx.fillStyle = "rgba(5, 17, 14, 0.9)";
    ctx.fillRect(px + 5, py + 37, 38, 10);
    ctx.fillStyle = "#a9f4d4";
    ctx.font = "900 7px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${item.price} G`, px + 24, py + 45);
  }
}

function drawMerchant(time) {
  const merchant = game.merchant;
  const { x: px, y: py } = toScreen(merchant.x, merchant.y);
  const bob = Math.sin(time / 280 + merchant.x) * 1.5;
  drawOutlinedEntity((targetCtx) => {
    if (drawMapTokenCell(targetCtx, [0, 1])) return;
    targetCtx.fillStyle = "#365f57";
    targetCtx.fillRect(11, 20, 25, 22);
    targetCtx.fillRect(16, 11, 17, 16);
    targetCtx.fillStyle = "#f1d6a2";
    targetCtx.fillRect(19, 14, 11, 10);
    targetCtx.fillStyle = "#f0bd55";
    targetCtx.fillRect(8, 27, 11, 13);
    targetCtx.fillStyle = "#6e492e";
    targetCtx.fillRect(10, 29, 7, 9);
    drawPixelStar(targetCtx, 35, 10, 10, "#ffe56c");
    targetCtx.fillStyle = "#fff8d8";
    targetCtx.fillRect(21, 17, 3, 3);
    targetCtx.fillRect(27, 17, 3, 3);
  }, px, py + bob, merchant.robbed ? "#ef6768" : "#64e0c2", merchant.robbed ? 3 : 2);
}

function drawCasino(time) {
  const casino = game.casino;
  const { x: px, y: py } = toScreen(casino.x, casino.y);
  const bob = Math.sin(time / 250 + casino.x) * 2;
  drawOutlinedEntity((targetCtx) => {
    targetCtx.fillStyle = "#28203f";
    targetCtx.fillRect(9, 13, 30, 30);
    targetCtx.fillStyle = "#e9b950";
    targetCtx.fillRect(12, 17, 24, 5);
    targetCtx.fillRect(16, 25, 5, 5);
    targetCtx.fillRect(27, 25, 5, 5);
    targetCtx.fillStyle = "#f7e6ad";
    drawPixelStar(targetCtx, 24, 9, 12, "#f7e6ad");
    targetCtx.fillStyle = "#d85c8a";
    targetCtx.font = "900 11px sans-serif";
    targetCtx.textAlign = "center";
    targetCtx.fillText("◆", 24, 40);
  }, px, py + bob, "#f0c75c", 2);
}

function drawItemIcon(target, kind, gear) {
  const iconCtx = target instanceof HTMLCanvasElement ? target.getContext("2d") : target;
  if (target instanceof HTMLCanvasElement) iconCtx.clearRect(0, 0, target.width, target.height);
  iconCtx.save();
  iconCtx.imageSmoothingEnabled = true;
  iconCtx.lineJoin = "miter";
  iconCtx.lineCap = "square";
  const atlasCell = itemIconCells[kind === "gear" ? "relic" : kind];
  if (drawAtlasCell(iconCtx, itemIconSheet, 5, 4, atlasCell, 48, 48)) {
    iconCtx.restore();
    return;
  }
  const dark = "#251b1b";
  const light = "#fff3c4";

  if (kind === "gear" && gear) {
    drawGearIcon(iconCtx, gear);
  } else if (kind === "apple" || kind === "bigApple") {
    const large = kind === "bigApple";
    iconCtx.fillStyle = dark;
    iconCtx.fillRect(22, 7, 5, 10);
    iconCtx.fillStyle = "#78b85f";
    iconCtx.fillRect(26, 7, 10, 5);
    iconCtx.fillRect(29, 11, 5, 4);
    iconCtx.fillStyle = large ? "#ff8c56" : "#e9b34f";
    iconCtx.fillRect(10, 17, 28, 18);
    iconCtx.fillRect(14, 13, 10, 26);
    iconCtx.fillRect(25, 14, 10, 24);
    iconCtx.fillStyle = "#ffd784";
    iconCtx.fillRect(15, 17, 7, 5);
    if (large) {
      iconCtx.fillStyle = light;
      iconCtx.fillRect(35, 8, 3, 10);
      iconCtx.fillRect(31, 12, 11, 3);
    }
  } else if (["oran", "guardBerry", "powerBerry", "focusMint", "mindBerry", "wardBerry"].includes(kind)) {
    const berryColors = {
      oran: ["#5aa5eb", "#bfeaff"],
      guardBerry: ["#729eaa", "#d5f2f4"],
      powerBerry: ["#d85f50", "#ffd0a6"],
      focusMint: ["#56c9ae", "#caffef"],
      mindBerry: ["#6daef1", "#d8edff"],
      wardBerry: ["#9d83df", "#efe6ff"],
    };
    const [berryColor, berryLight] = berryColors[kind];
    iconCtx.fillStyle = "#6faa5d";
    iconCtx.fillRect(21, 7, 6, 11);
    iconCtx.fillRect(13, 10, 10, 5);
    iconCtx.fillStyle = berryColor;
    iconCtx.fillRect(11, 19, 12, 14);
    iconCtx.fillRect(18, 15, 13, 20);
    iconCtx.fillRect(27, 20, 10, 13);
    iconCtx.fillStyle = berryLight;
    iconCtx.fillRect(19, 19, 5, 5);
  } else if (kind === "elixir") {
    iconCtx.fillStyle = "#d7eff0";
    iconCtx.fillRect(19, 6, 11, 5);
    iconCtx.fillStyle = "#53767a";
    iconCtx.fillRect(21, 11, 7, 6);
    iconCtx.fillStyle = "#79e3dc";
    iconCtx.fillRect(13, 17, 22, 21);
    iconCtx.fillRect(10, 23, 28, 12);
    iconCtx.fillStyle = "#d9fffa";
    iconCtx.fillRect(15, 20, 5, 12);
    iconCtx.fillStyle = "#238e9b";
    iconCtx.fillRect(22, 27, 11, 5);
  } else if (["reviver", "blastSeed", "sleepSeed", "pierceSeed", "ironNut"].includes(kind)) {
    const colors = {
      reviver: ["#f5c957", "#fff4a8"],
      blastSeed: ["#ef5d4f", "#ffb34f"],
      sleepSeed: ["#8c70cf", "#d9c9ff"],
      pierceSeed: ["#d6a858", "#fff0a8"],
      ironNut: ["#7d8988", "#d8e1df"],
    };
    const [body, shine] = colors[kind];
    iconCtx.fillStyle = body;
    iconCtx.beginPath();
    iconCtx.moveTo(24, 7);
    iconCtx.lineTo(37, 21);
    iconCtx.lineTo(31, 38);
    iconCtx.lineTo(17, 38);
    iconCtx.lineTo(11, 21);
    iconCtx.closePath();
    iconCtx.fill();
    iconCtx.fillStyle = shine;
    if (kind === "reviver") {
      iconCtx.fillRect(21, 13, 6, 19);
      iconCtx.fillRect(15, 20, 18, 6);
    } else if (kind === "blastSeed" || kind === "pierceSeed") {
      iconCtx.fillRect(22, 14, 6, 18);
      iconCtx.fillRect(17, 20, 5, 8);
      iconCtx.fillRect(27, 10, 4, 10);
    } else {
      iconCtx.beginPath();
      iconCtx.arc(25, 23, 9, 0, Math.PI * 2);
      iconCtx.fill();
      iconCtx.fillStyle = body;
      iconCtx.beginPath();
      iconCtx.arc(29, 19, 9, 0, Math.PI * 2);
      iconCtx.fill();
    }
  } else if (["slumberOrb", "warpOrb", "guidingOrb", "fortuneOrb", "stormOrb"].includes(kind)) {
    const body = itemColor(kind);
    iconCtx.fillStyle = "#d6f7f2";
    iconCtx.beginPath();
    iconCtx.arc(24, 24, 18, 0, Math.PI * 2);
    iconCtx.fill();
    iconCtx.fillStyle = body;
    iconCtx.beginPath();
    iconCtx.arc(24, 24, 14, 0, Math.PI * 2);
    iconCtx.fill();
    iconCtx.fillStyle = light;
    if (kind === "slumberOrb") {
      iconCtx.fillRect(16, 17, 5, 14);
      iconCtx.fillRect(27, 17, 5, 14);
    } else if (kind === "warpOrb") {
      iconCtx.fillRect(13, 21, 22, 6);
      iconCtx.fillRect(13, 17, 6, 14);
      iconCtx.fillRect(29, 17, 6, 14);
    } else if (kind === "guidingOrb") {
      drawPixelStar(iconCtx, 24, 24, 12, light);
    } else if (kind === "stormOrb") {
      iconCtx.fillRect(22, 11, 7, 13);
      iconCtx.fillRect(17, 23, 11, 5);
      iconCtx.fillRect(20, 28, 7, 10);
    } else {
      iconCtx.fillRect(21, 12, 6, 24);
      iconCtx.fillRect(14, 19, 20, 6);
    }
    iconCtx.fillStyle = "rgba(255,255,255,0.55)";
    iconCtx.fillRect(14, 13, 6, 4);
  } else if (evolutionMaterialKeys.includes(kind)) {
    const materialColors = {
      moonShard: "#7ee9f2",
      emberCore: "#ff755b",
      shadowFang: "#b58ae8",
      wisdomSeed: "#83c96c",
      bossCore: "#ffe36f",
    };
    const materialColor = materialColors[kind];
    iconCtx.fillStyle = "#17201f";
    iconCtx.fillRect(6, 6, 36, 36);
    iconCtx.strokeStyle = materialColor;
    iconCtx.lineWidth = 3;
    iconCtx.strokeRect(8, 8, 32, 32);
    iconCtx.fillStyle = materialColor;
    if (kind === "moonShard") {
      iconCtx.beginPath();
      iconCtx.arc(23, 23, 13, 0, Math.PI * 2);
      iconCtx.fill();
      iconCtx.fillStyle = "#17201f";
      iconCtx.beginPath();
      iconCtx.arc(29, 18, 12, 0, Math.PI * 2);
      iconCtx.fill();
    } else if (kind === "emberCore") {
      iconCtx.beginPath();
      iconCtx.moveTo(24, 9);
      iconCtx.lineTo(36, 25);
      iconCtx.lineTo(24, 39);
      iconCtx.lineTo(12, 25);
      iconCtx.closePath();
      iconCtx.fill();
      iconCtx.fillStyle = light;
      iconCtx.fillRect(21, 18, 6, 14);
      iconCtx.fillRect(17, 23, 14, 6);
    } else if (kind === "shadowFang") {
      iconCtx.beginPath();
      iconCtx.moveTo(12, 11);
      iconCtx.lineTo(36, 16);
      iconCtx.lineTo(25, 39);
      iconCtx.lineTo(20, 26);
      iconCtx.closePath();
      iconCtx.fill();
      iconCtx.fillStyle = light;
      iconCtx.fillRect(17, 16, 13, 4);
    } else if (kind === "wisdomSeed") {
      iconCtx.beginPath();
      iconCtx.ellipse(24, 28, 9, 12, 0, 0, Math.PI * 2);
      iconCtx.fill();
      iconCtx.fillRect(22, 12, 5, 12);
      iconCtx.fillRect(12, 13, 11, 6);
      iconCtx.fillStyle = light;
      iconCtx.fillRect(21, 25, 6, 7);
    } else {
      drawPixelStar(iconCtx, 24, 24, 15, materialColor);
      iconCtx.fillStyle = light;
      drawPixelStar(iconCtx, 24, 24, 7, light);
    }
  } else if (kind === "badge" || kind === "mapScroll") {
    if (kind === "mapScroll") {
      iconCtx.fillStyle = "#e7cf9a";
      iconCtx.fillRect(10, 10, 28, 28);
      iconCtx.fillStyle = "#765d35";
      iconCtx.fillRect(13, 14, 22, 3);
      iconCtx.fillRect(13, 22, 16, 3);
      iconCtx.fillRect(13, 30, 20, 3);
      drawPixelStar(iconCtx, 32, 18, 6, "#f4d86b");
      iconCtx.restore();
      return;
    }
    iconCtx.fillStyle = "#7d69c5";
    iconCtx.fillRect(13, 8, 8, 16);
    iconCtx.fillRect(27, 8, 8, 16);
    drawPixelStar(iconCtx, 24, 27, 17, "#f2cb5b");
    drawPixelStar(iconCtx, 24, 27, 8, light);
  } else {
    drawPixelStar(iconCtx, 24, 23, 18, "#f4d86b");
    drawPixelStar(iconCtx, 24, 23, 8, "#fffbe0");
  }
  iconCtx.restore();
}

function atlasCellBounds(sheet, columns, rows, column, row) {
  let sheetCache = atlasCellBoundsCache.get(sheet);
  if (!sheetCache) {
    sheetCache = new Map();
    atlasCellBoundsCache.set(sheet, sheetCache);
  }
  const key = `${columns}:${rows}:${column}:${row}`;
  if (sheetCache.has(key)) return sheetCache.get(key);

  const sourceWidth = Math.floor(sheet.naturalWidth / columns);
  const sourceHeight = Math.floor(sheet.naturalHeight / rows);
  const sample = document.createElement("canvas");
  sample.width = sourceWidth;
  sample.height = sourceHeight;
  const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
  sampleCtx.drawImage(
    sheet,
    column * sourceWidth,
    row * sourceHeight,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight,
  );

  let bounds = { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  try {
    const pixels = sampleCtx.getImageData(0, 0, sourceWidth, sourceHeight).data;
    let left = sourceWidth;
    let top = sourceHeight;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < sourceHeight; y += 1) {
      for (let x = 0; x < sourceWidth; x += 1) {
        if (pixels[(y * sourceWidth + x) * 4 + 3] < 10) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
    if (right >= left && bottom >= top) {
      const inset = Math.max(2, Math.round(Math.min(sourceWidth, sourceHeight) * 0.018));
      bounds = {
        x: Math.max(0, left - inset),
        y: Math.max(0, top - inset),
        width: Math.min(sourceWidth - Math.max(0, left - inset), right - left + 1 + inset * 2),
        height: Math.min(sourceHeight - Math.max(0, top - inset), bottom - top + 1 + inset * 2),
      };
    }
  } catch {
    // The untrimmed cell is still usable if pixel inspection is unavailable.
  }
  sheetCache.set(key, bounds);
  return bounds;
}

function drawAtlasCell(targetCtx, sheet, columns, rows, cell, width = 48, height = 48) {
  if (!cell || !sheet.complete || !sheet.naturalWidth) return false;
  const [column, row] = cell;
  const sourceWidth = Math.floor(sheet.naturalWidth / columns);
  const sourceHeight = Math.floor(sheet.naturalHeight / rows);
  const bounds = atlasCellBounds(sheet, columns, rows, column, row);
  const padding = Math.max(2, Math.min(width, height) * 0.075);
  const scale = Math.min(
    (width - padding * 2) / bounds.width,
    (height - padding * 2) / bounds.height,
  );
  const drawWidth = Math.max(1, bounds.width * scale);
  const drawHeight = Math.max(1, bounds.height * scale);
  targetCtx.drawImage(
    sheet,
    column * sourceWidth + bounds.x,
    row * sourceHeight + bounds.y,
    bounds.width,
    bounds.height,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  return true;
}

function drawGearIcon(targetCtx, gear) {
  const color = gear.color || gearSlots[gear.slot]?.color || "#ddd";
  const bright = "#fff3d0";
  const dark = "#2a2022";
  if (gear.slot === "weapon") {
    targetCtx.fillStyle = color;
    if (gear.key === "wand") {
      targetCtx.fillRect(21, 9, 7, 30);
      drawPixelStar(targetCtx, 24, 10, 13, bright);
      targetCtx.fillStyle = dark;
      targetCtx.fillRect(19, 35, 11, 5);
    } else if (gear.key === "claw") {
      targetCtx.fillRect(10, 12, 7, 27);
      targetCtx.fillRect(21, 8, 7, 30);
      targetCtx.fillRect(32, 12, 7, 27);
      targetCtx.fillStyle = bright;
      targetCtx.fillRect(10, 8, 7, 8);
      targetCtx.fillRect(21, 4, 7, 8);
      targetCtx.fillRect(32, 8, 7, 8);
    } else {
      targetCtx.fillRect(21, 5, 7, 29);
      targetCtx.fillStyle = bright;
      targetCtx.fillRect(23, 7, 3, 23);
      targetCtx.fillStyle = "#8b6547";
      targetCtx.fillRect(21, 33, 7, 11);
      targetCtx.fillStyle = color;
      targetCtx.fillRect(13, 30, 23, 6);
    }
  } else if (gear.slot === "armor") {
    targetCtx.fillStyle = color;
    if (gear.key === "cloak") {
      targetCtx.beginPath();
      targetCtx.moveTo(15, 10);
      targetCtx.lineTo(33, 10);
      targetCtx.lineTo(40, 40);
      targetCtx.lineTo(24, 34);
      targetCtx.lineTo(8, 40);
      targetCtx.closePath();
      targetCtx.fill();
      targetCtx.fillStyle = bright;
      targetCtx.fillRect(21, 9, 6, 24);
      targetCtx.fillRect(14, 13, 20, 5);
    } else if (gear.key === "vest") {
      targetCtx.fillRect(14, 13, 20, 28);
      targetCtx.fillRect(7, 17, 10, 13);
      targetCtx.fillRect(31, 17, 10, 13);
      targetCtx.fillStyle = dark;
      targetCtx.fillRect(21, 13, 6, 13);
      targetCtx.fillStyle = bright;
      targetCtx.fillRect(16, 29, 16, 4);
      targetCtx.fillRect(20, 36, 8, 4);
    } else {
      targetCtx.fillRect(12, 14, 24, 27);
      targetCtx.fillRect(7, 18, 9, 17);
      targetCtx.fillRect(32, 18, 9, 17);
      targetCtx.fillStyle = dark;
      targetCtx.fillRect(20, 14, 8, 8);
      targetCtx.fillStyle = bright;
      targetCtx.fillRect(16, 25, 16, 5);
      targetCtx.fillRect(22, 20, 5, 16);
    }
  } else if (gear.key === "feather") {
    targetCtx.fillStyle = color;
    targetCtx.beginPath();
    targetCtx.ellipse(25, 21, 12, 18, 0.55, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.fillStyle = bright;
    targetCtx.fillRect(21, 12, 4, 28);
    targetCtx.fillRect(14, 22, 10, 3);
    targetCtx.fillRect(22, 17, 12, 3);
  } else if (gear.key === "gem") {
    targetCtx.fillStyle = color;
    targetCtx.beginPath();
    targetCtx.moveTo(24, 6);
    targetCtx.lineTo(39, 19);
    targetCtx.lineTo(32, 39);
    targetCtx.lineTo(16, 39);
    targetCtx.lineTo(9, 19);
    targetCtx.closePath();
    targetCtx.fill();
    targetCtx.fillStyle = bright;
    targetCtx.fillRect(20, 13, 8, 18);
    targetCtx.fillRect(15, 19, 18, 7);
  } else {
    targetCtx.fillStyle = "#8b6547";
    targetCtx.fillRect(22, 5, 5, 12);
    targetCtx.fillStyle = color;
    targetCtx.beginPath();
    targetCtx.arc(24, 26, 14, Math.PI, 0);
    targetCtx.lineTo(38, 34);
    targetCtx.lineTo(10, 34);
    targetCtx.closePath();
    targetCtx.fill();
    targetCtx.fillStyle = bright;
    targetCtx.fillRect(21, 34, 7, 7);
  }
  const stars = clamp(gear.stars || 1, 1, 5);
  targetCtx.fillStyle = "rgba(16, 14, 15, 0.86)";
  targetCtx.fillRect(4, 40, 40, 7);
  for (let index = 0; index < 5; index += 1) {
    targetCtx.fillStyle = index < stars ? color : "#4c4949";
    targetCtx.fillRect(7 + index * 8, 42, 5, 3);
  }
}

function drawPixelStar(targetCtx, x, y, size, color) {
  const arm = Math.max(3, Math.floor(size / 3));
  targetCtx.fillStyle = color;
  targetCtx.fillRect(x - arm, y - Math.floor(size / 2), arm * 2, size);
  targetCtx.fillRect(x - Math.floor(size / 2), y - arm, size, arm * 2);
  targetCtx.fillRect(x - arm - 2, y - arm - 2, (arm + 2) * 2, (arm + 2) * 2);
}

function drawActor(actor, time) {
  const visual = getActorVisualPosition(actor, time);
  const { x: px, y: py } = toScreen(visual.x, visual.y);
  const stepBob = visual.walking ? Math.abs(Math.sin(visual.phase * Math.PI * 2)) * 3 : 0;
  const bob = actor.down ? 5 : Math.sin(time / 330 + actor.x) * 0.8 - stepBob;
  drawOutlinedEntity(
    (targetCtx) => drawActorBody(targetCtx, actor, 0, 0, 1, time),
    px,
    py + bob,
    "#62efff",
    3,
    actorOutlineVisualKey(actor, time),
  );
}

function drawActorBody(targetCtx, actor, px, py, scale, time) {
  const s = scale;
  const visual = getActorVisualPosition(actor, time);
  const walking = visual.walking;
  const footStep = walking ? Math.sin(visual.phase * Math.PI * 4) * 2 : 0;
  const facingBack = actor.dy < 0 && Math.abs(actor.dy) >= Math.abs(actor.dx);
  const facingSide = actor.dx !== 0 && Math.abs(actor.dx) >= Math.abs(actor.dy);
  const faceSign = actor.dx < 0 ? -1 : 1;
  const scarf = actor.kind === "leader" ? (actor.scarf || palette.brass) : actor.kind === "partner" ? palette.teal : palette.white;
  targetCtx.save();
  targetCtx.translate(px, py);
  targetCtx.scale(s, s);
  if (drawLineageArt(targetCtx, actor, time)) {
    targetCtx.restore();
    return;
  }
  if (drawMapTokenCell(targetCtx, actorTokenCell(actor))) {
    targetCtx.restore();
    return;
  }
  targetCtx.fillStyle = "rgba(0,0,0,0.28)";
  targetCtx.beginPath();
  targetCtx.ellipse(24, 39, 16, 6, 0, 0, Math.PI * 2);
  targetCtx.fill();

  if (actor.sprite && drawSpriteOnContext(targetCtx, actor.sprite, 8, 8, 32, 32)) {
    targetCtx.restore();
    return;
  }

  const body = actor.down ? "#777" : actor.color;
  const light = actor.down ? "#aaa" : actor.accent;

  targetCtx.fillStyle = body;
  targetCtx.beginPath();
  const tailX = facingSide ? 24 - faceSign * 12 : 12;
  targetCtx.ellipse(tailX, 29, 9, 5, facingSide ? faceSign * 0.35 : -0.45, 0, Math.PI * 2);
  targetCtx.fill();

  targetCtx.fillStyle = body;
  targetCtx.fillRect(15, 23, 18, 12);
  targetCtx.fillStyle = light;
  targetCtx.fillRect(18, 25, 12, 7);

  targetCtx.fillStyle = body;
  targetCtx.beginPath();
  targetCtx.arc(24, 17, 11, 0, Math.PI * 2);
  targetCtx.fill();

  targetCtx.beginPath();
  targetCtx.moveTo(15, 12);
  targetCtx.lineTo(17, 3);
  targetCtx.lineTo(23, 10);
  targetCtx.moveTo(25, 10);
  targetCtx.lineTo(31, 3);
  targetCtx.lineTo(34, 13);
  targetCtx.fill();

  targetCtx.fillStyle = light;
  targetCtx.beginPath();
  targetCtx.moveTo(18, 10);
  targetCtx.lineTo(19, 6);
  targetCtx.lineTo(22, 11);
  targetCtx.moveTo(27, 11);
  targetCtx.lineTo(30, 6);
  targetCtx.lineTo(31, 11);
  targetCtx.fill();

  targetCtx.fillStyle = scarf;
  targetCtx.fillRect(14, 22, 20, 4);
  targetCtx.fillRect(facingSide && faceSign < 0 ? 30 : 14, 25, 5, 7);
  drawEvolutionAdornment(targetCtx, actor, light);

  if (!facingBack) {
    targetCtx.fillStyle = palette.ink;
    if (facingSide) {
      targetCtx.fillRect(faceSign > 0 ? 27 : 18, 15, 3, 4);
      targetCtx.fillStyle = "#fff8df";
      targetCtx.fillRect(faceSign > 0 ? 28 : 18, 15, 1, 1);
    } else {
      targetCtx.fillRect(19, 15, 3, 4);
      targetCtx.fillRect(27, 15, 3, 4);
      targetCtx.fillStyle = "#fff8df";
      targetCtx.fillRect(19, 15, 1, 1);
      targetCtx.fillRect(27, 15, 1, 1);
    }
    targetCtx.fillStyle = light;
    targetCtx.fillRect(22, 20, 5, 2);
  } else {
    targetCtx.fillStyle = scarf;
    targetCtx.fillRect(29, 24, 6, 5);
  }

  targetCtx.fillStyle = body;
  targetCtx.fillRect(16, 34 + Math.max(0, footStep), 7, 5);
  targetCtx.fillRect(27, 34 + Math.max(0, -footStep), 7, 5);
  targetCtx.fillStyle = light;
  targetCtx.fillRect(16, 38 + Math.max(0, footStep), 7, 2);
  targetCtx.fillRect(27, 38 + Math.max(0, -footStep), 7, 2);

  targetCtx.fillStyle = "#fff1b6";
  targetCtx.fillRect(23, 25, 4, 4);
  targetCtx.restore();
}

function foxboundSpriteDirectionRow(entry, actor) {
  if (entry.rows <= 1) return 0;
  const dx = Number(actor.dx) || 0;
  const dy = Number(actor.dy) || 0;
  if (entry.rows === 2) return dy < 0 ? 0 : 1;
  if (entry.rows === 3) {
    if (dy < 0 && Math.abs(dy) >= Math.abs(dx)) return 2;
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return 1;
    return 0;
  }
  if (dy < 0 && Math.abs(dy) >= Math.abs(dx)) return 3;
  if (dx < 0 && Math.abs(dx) >= Math.abs(dy)) return 1;
  if (dx > 0 && Math.abs(dx) >= Math.abs(dy)) return 2;
  return 0;
}

function foxboundSpriteFrame(entry, actor, time, category) {
  const usable = (entry.frames || []).filter((frame) => frame.usable !== false && frame.w > 0 && frame.h > 0);
  if (!usable.length) return null;
  const maxWidth = Math.max(...usable.map((frame) => frame.w));
  const maxHeight = Math.max(...usable.map((frame) => frame.h));
  const maxInk = Math.max(...usable.map((frame) => frame.ink || 0));
  let candidates = usable.filter((frame) => (
    frame.w >= maxWidth * 0.28
    && frame.h >= maxHeight * 0.55
    && (frame.ink || 0) >= maxInk * 0.18
  ));
  if (!candidates.length) candidates = usable;

  const desiredRow = foxboundSpriteDirectionRow(entry, actor);
  const rowCandidates = candidates.filter((frame) => frame.row === desiredRow);
  if (rowCandidates.length) candidates = rowCandidates;

  const actionActive = time < (actor.actionUntil || 0)
    || (actor.motion?.kind === "bump" && time >= actor.motion.started && time < actor.motion.started + actor.motion.duration);
  const walking = actor.motion?.kind === "walk"
    && time >= actor.motion.started
    && time < actor.motion.started + actor.motion.duration;
  let desiredColumn = 0;
  if (category === "heroes") {
    const safeColumns = FOXBOUND_HERO_SAFE_COLUMNS[entry.id] || FOXBOUND_HERO_SAFE_COLUMNS.kohaku;
    const cleanCandidates = candidates.filter((frame) => safeColumns.allowed.includes(frame.col));
    if (cleanCandidates.length) candidates = cleanCandidates;
    desiredColumn = actionActive ? safeColumns.action : walking ? safeColumns.walk : safeColumns.idle;
  } else if (actionActive) {
    desiredColumn = category === "bosses" || category === "rares"
      ? Math.min(3, entry.cols - 1)
      : Math.min(2, entry.cols - 1);
  } else if (walking) {
    desiredColumn = 1;
  }

  return [...candidates].sort((a, b) => {
    const columnDistance = Math.abs(a.col - desiredColumn) - Math.abs(b.col - desiredColumn);
    if (columnDistance) return columnDistance;
    const rowDistance = Math.abs(a.row - desiredRow) - Math.abs(b.row - desiredRow);
    if (rowDistance) return rowDistance;
    return (b.ink || 0) - (a.ink || 0);
  })[0] || null;
}

function drawFoxboundSprite(targetCtx, category, id, actor, time = performance.now()) {
  const loaded = requestFoxboundSprite(category, id);
  if (!loaded) return false;
  const { entry, image } = loaded;
  const frame = foxboundSpriteFrame(entry, actor, time, category);
  if (!frame) return false;

  const sourceX = frame.col * entry.cellWidth + frame.x;
  const sourceY = frame.row * entry.cellHeight + frame.y;
  const availableSize = category === "bosses" ? 46 : 44;
  const scale = Math.min(availableSize / frame.w, availableSize / frame.h);
  const drawWidth = Math.max(1, frame.w * scale);
  const drawHeight = Math.max(1, frame.h * scale);
  const drawX = (TILE - drawWidth) / 2;
  const drawY = TILE - drawHeight - 1;
  const flipSide = entry.rows === 3 && Math.abs(actor.dx || 0) >= Math.abs(actor.dy || 0) && (actor.dx || 0) < 0;
  const actionPulse = time < (actor.actionUntil || 0) ? 1.035 : 1;

  targetCtx.save();
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.translate(TILE / 2, TILE / 2);
  targetCtx.scale(flipSide ? -actionPulse : actionPulse, actionPulse);
  targetCtx.translate(-TILE / 2, -TILE / 2);
  targetCtx.drawImage(
    image,
    sourceX,
    sourceY,
    frame.w,
    frame.h,
    drawX,
    drawY,
    drawWidth,
    drawHeight,
  );
  targetCtx.restore();
  return true;
}

function foxboundSpriteVisualKey(category, id, actor, time) {
  const loaded = requestFoxboundSprite(category, id);
  if (!loaded) return null;
  const frame = foxboundSpriteFrame(loaded.entry, actor, time, category);
  if (!frame) return null;
  const flipSide = loaded.entry.rows === 3
    && Math.abs(actor.dx || 0) >= Math.abs(actor.dy || 0)
    && (actor.dx || 0) < 0;
  const actionActive = time < (actor.actionUntil || 0)
    || (actor.motion?.kind === "bump" && time < actor.motion.started + actor.motion.duration);
  return [
    category,
    id,
    frame.row,
    frame.col,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    flipSide ? "flip" : "normal",
    actionActive ? "action" : "idle",
  ].join(":");
}

function actorOutlineVisualKey(actor, time) {
  if (actor.kind !== "leader") return null;
  const profile = characterCatalog.find((entry) => entry.key === actor.profileKey) || characterCatalog[0];
  const baseKey = foxboundSpriteVisualKey("heroes", FOXBOUND_HERO_SPRITE_IDS[profile.key], actor, time);
  if (!baseKey) return null;
  return `${baseKey}|evolution:${heroEvolutionBranch(actor)}:${clamp(actor.evolutionStage || 0, 0, 10)}`;
}

function enemyOutlineVisualKey(enemy, time) {
  const category = enemy.boss ? "bosses" : enemy.rare ? "rares" : "enemies";
  const spriteId = enemy.spritePackId
    || (enemy.rare ? FOXBOUND_RARE_SPRITE_IDS[enemy.key] : null)
    || (!enemy.boss && Number.isInteger(enemy.artIndex) ? FOXBOUND_ENEMY_SPRITE_IDS[enemy.artIndex] : null);
  return spriteId ? foxboundSpriteVisualKey(category, spriteId, enemy, time) : null;
}

function drawLineageArt(targetCtx, actor, time = performance.now()) {
  if (actor.kind !== "leader") return false;
  const profile = characterCatalog.find((entry) => entry.key === actor.profileKey) || characterCatalog[0];
  const stage = clamp(actor.evolutionStage || 0, 0, 10);
  if (stage > 0) drawEvolutionAura(targetCtx, actor);
  const spriteId = FOXBOUND_HERO_SPRITE_IDS[profile.key];
  if (!drawFoxboundSprite(targetCtx, "heroes", spriteId, actor, time)) return false;
  if (stage > 0) drawEvolutionAdornment(targetCtx, actor, actor.accent || "#fff1b6");
  return true;
}

function drawArtIndexCell(targetCtx, artIndex, stage = 0, time = performance.now(), ringColor = "#fff0a1") {
  const sheet = requestEnemyArtSheet(Math.floor(artIndex / 10));
  if (!sheet?.complete || !sheet.naturalWidth) return false;
  const localIndex = artIndex % 10;
  const sourceColumn = localIndex % 5;
  const sourceRow = Math.floor(localIndex / 5);
  const cellWidth = sheet.naturalWidth / 5;
  const cellHeight = sheet.naturalHeight / 2;
  const pulse = 1 + Math.sin(time / 420 + stage) * 0.018;
  targetCtx.save();
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.translate(TILE / 2, TILE / 2 + 1);
  targetCtx.scale(pulse, pulse);
  targetCtx.drawImage(
    sheet,
    sourceColumn * cellWidth,
    sourceRow * cellHeight,
    cellWidth,
    cellHeight,
    -TILE / 2,
    -TILE / 2,
    TILE,
    TILE,
  );
  if (stage > 0) {
    targetCtx.strokeStyle = ringColor || "#fff0a1";
    targetCtx.globalAlpha = 0.55;
    targetCtx.lineWidth = 1.5;
    targetCtx.beginPath();
    targetCtx.ellipse(0, 17, 16 + Math.sin(time / 300) * 2, 4, 0, 0, Math.PI * 2);
    targetCtx.stroke();
  }
  targetCtx.restore();
  return true;
}

function heroEvolutionBranch(actor) {
  const branch = normalizeAscensionBranchKey(actor.evolutionBranch || "base");
  if (branch !== "base") return branch;
  return {
    lumina: "lumen",
    seraph: "ascetic",
    agni: "fang",
    vajra: "fang",
    nox: "shade",
    abyss: "karma",
    sage: "archmage",
    astera: "relic",
  }[actor.evolutionKey] || "base";
}

function heroEvolutionVisual(actor) {
  const branch = heroEvolutionBranch(actor);
  const style = {
    fang: "physical",
    warlord: "physical",
    lumen: "radiant",
    archmage: "radiant",
    guardian: "guard",
    shade: "shadow",
    revenant: "shadow",
    void: "shadow",
    chaos: "chaos",
    ascetic: "ascetic",
    relic: "relic",
    karma: "karma",
  }[branch] || "radiant";
  const accents = {
    physical: "#ffbd59",
    radiant: "#d8fbff",
    guard: "#a9ddff",
    shadow: "#d6a4ff",
    chaos: "#ffcf63",
    ascetic: "#fff4bd",
    relic: "#ffe277",
    karma: "#ef76c8",
  };
  return {
    branch,
    style,
    color: actor.color || elementInfo(actor.elementKey).color,
    accent: accents[style],
  };
}

function drawEvolutionDiamond(targetCtx, x, y, size, color) {
  targetCtx.fillStyle = color;
  targetCtx.beginPath();
  targetCtx.moveTo(x, y - size);
  targetCtx.lineTo(x + size, y);
  targetCtx.lineTo(x, y + size);
  targetCtx.lineTo(x - size, y);
  targetCtx.closePath();
  targetCtx.fill();
}

function drawEvolutionSpike(targetCtx, x, y, size, direction, color) {
  targetCtx.fillStyle = color;
  targetCtx.beginPath();
  targetCtx.moveTo(x, y - size * 0.55);
  targetCtx.lineTo(x + direction * size, y);
  targetCtx.lineTo(x, y + size * 0.55);
  targetCtx.closePath();
  targetCtx.fill();
}

function drawEvolutionAura(targetCtx, actor) {
  const stage = clamp(actor.evolutionStage || 0, 0, 10);
  if (!stage) return;
  const visual = heroEvolutionVisual(actor);
  const tier = Math.ceil(stage / 2);
  targetCtx.save();
  targetCtx.lineCap = "round";
  targetCtx.lineJoin = "round";
  targetCtx.globalAlpha = 0.36 + tier * 0.045;
  targetCtx.strokeStyle = visual.color;
  targetCtx.lineWidth = stage >= 7 ? 2 : 1.4;
  targetCtx.beginPath();
  targetCtx.ellipse(24, 39, 12 + tier * 1.5, 3 + tier * 0.25, 0, 0, Math.PI * 2);
  targetCtx.stroke();

  if (visual.style === "physical" || visual.style === "chaos") {
    for (let index = 0; index < tier; index += 1) {
      const y = 34 - index * 5.5;
      const size = 4 + index * 0.55;
      drawEvolutionSpike(targetCtx, 12 - index * 0.7, y, size, -1, index % 2 ? visual.accent : visual.color);
      drawEvolutionSpike(targetCtx, 36 + index * 0.7, y, size, 1, index % 2 ? visual.accent : visual.color);
    }
  } else if (visual.style === "guard") {
    targetCtx.fillStyle = visual.color;
    for (let index = 0; index < tier; index += 1) {
      const y = 17 + index * 4.3;
      targetCtx.fillRect(5 + index * 0.7, y, 4 + index * 0.45, 7);
      targetCtx.fillRect(39 - index * 1.1, y, 4 + index * 0.45, 7);
    }
  } else if (visual.style === "shadow" || visual.style === "karma") {
    for (let index = 0; index < tier; index += 1) {
      targetCtx.strokeStyle = index % 2 ? visual.accent : visual.color;
      targetCtx.lineWidth = 1.5 + index * 0.18;
      targetCtx.beginPath();
      targetCtx.arc(24, 25, 14 + index * 1.6, Math.PI * (0.72 + index * 0.04), Math.PI * (1.28 - index * 0.04));
      targetCtx.stroke();
    }
  } else {
    for (let index = 0; index < tier; index += 1) {
      const y = 30 - index * 4.4;
      targetCtx.strokeStyle = index % 2 ? visual.accent : visual.color;
      targetCtx.lineWidth = 2.2;
      targetCtx.beginPath();
      targetCtx.moveTo(15, 31);
      targetCtx.lineTo(6 - index * 0.7, y - 4);
      targetCtx.moveTo(33, 31);
      targetCtx.lineTo(42 + index * 0.7, y - 4);
      targetCtx.stroke();
    }
  }

  if (stage >= 8) {
    const orbitCount = stage - 6;
    for (let index = 0; index < orbitCount; index += 1) {
      const angle = -Math.PI * 0.82 + (Math.PI * 1.64 * index) / Math.max(1, orbitCount - 1);
      drawEvolutionDiamond(
        targetCtx,
        24 + Math.cos(angle) * 20,
        23 + Math.sin(angle) * 17,
        stage === 10 ? 2.2 : 1.7,
        index % 2 ? visual.accent : visual.color,
      );
    }
  }
  targetCtx.restore();
}

function drawEvolutionAdornment(targetCtx, actor, light) {
  const stage = clamp(actor.evolutionStage || 0, 0, 10);
  if (!stage) return;
  const profile = actor.profileKey || "kohaku";
  const visual = heroEvolutionVisual(actor);
  const tier = Math.ceil(stage / 2);
  targetCtx.save();
  targetCtx.globalAlpha = 0.88;

  if (profile === "kohaku") {
    targetCtx.strokeStyle = visual.color;
    targetCtx.lineWidth = 1.5 + tier * 0.16;
    targetCtx.beginPath();
    targetCtx.arc(24, 26, 13 + tier * 0.6, 0.12 * Math.PI, 0.88 * Math.PI);
    targetCtx.stroke();
    if (stage >= 4) {
      drawEvolutionSpike(targetCtx, 16, 9, 3 + tier * 0.35, -1, visual.accent);
      drawEvolutionSpike(targetCtx, 32, 9, 3 + tier * 0.35, 1, visual.accent);
    }
  } else if (profile === "knight") {
    drawEvolutionDiamond(targetCtx, 13, 24, 2.5 + tier * 0.28, visual.color);
    drawEvolutionDiamond(targetCtx, 35, 24, 2.5 + tier * 0.28, visual.color);
    if (stage >= 5) {
      for (let index = 0; index < Math.min(3, tier - 1); index += 1) {
        drawEvolutionSpike(targetCtx, 20 + index * 4, 6, 3 + index * 0.7, index === 0 ? -1 : 1, visual.accent);
      }
    }
  } else {
    const orbCount = Math.min(5, tier + 1);
    for (let index = 0; index < orbCount; index += 1) {
      const angle = (Math.PI * 2 * index) / orbCount - Math.PI / 2;
      drawEvolutionDiamond(
        targetCtx,
        24 + Math.cos(angle) * (15 + tier * 0.7),
        22 + Math.sin(angle) * (12 + tier * 0.5),
        1.5 + (stage >= 9 ? 0.6 : 0),
        index % 2 ? visual.accent : visual.color,
      );
    }
  }

  const pipRadius = 19;
  for (let index = 0; index < stage; index += 1) {
    const angle = Math.PI + (Math.PI * index) / 9;
    drawEvolutionDiamond(
      targetCtx,
      24 + Math.cos(angle) * pipRadius,
      23 + Math.sin(angle) * pipRadius,
      stage === 10 && index === 9 ? 2.2 : 1.25,
      index % 2 ? visual.accent : visual.color,
    );
  }
  drawEvolutionDiamond(targetCtx, 24, 8, 1.7 + tier * 0.28, stage === 10 ? "#fff7c9" : light || visual.accent);
  if (stage === 10) drawPixelStar(targetCtx, 24, 4, 7, visual.accent);
  targetCtx.restore();
}

function drawEnemy(enemy, time) {
  const visual = getActorVisualPosition(enemy, time);
  const { x: px, y: py } = toScreen(visual.x, visual.y);
  const idleSpeed = enemy.idleSpeed || 310;
  const idleAmplitude = enemy.idleAmplitude || (enemy.boss ? 4.2 : 3);
  const idlePhase = enemy.wobble || 0;
  const wobble = Math.sin(time / idleSpeed + idlePhase) * idleAmplitude;
  drawOutlinedEntity((targetCtx) => {
    if (drawEnemyArt(targetCtx, enemy, time)) return;
    if (drawMapTokenCell(targetCtx, enemyTokenCell(enemy))) return;
    const spriteInset = enemy.boss ? 3 : 8;
    const spriteSize = enemy.boss ? 42 : 32;
    drawSpriteOnContext(targetCtx, enemy.sprite, spriteInset, enemy.boss ? 0 : 5, spriteSize, spriteSize);
    targetCtx.globalAlpha = enemy.boss ? 0.62 : 0.86;
    targetCtx.fillStyle = enemy.color;
    targetCtx.beginPath();
    targetCtx.ellipse(24, enemy.boss ? 25 : 27, enemy.boss ? 18 : 13, enemy.boss ? 16 : 13, 0, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.globalAlpha = 1;
    targetCtx.fillStyle = enemy.accent;
    targetCtx.fillRect(enemy.boss ? 14 : 17, enemy.boss ? 17 : 19, enemy.boss ? 7 : 5, enemy.boss ? 6 : 5);
    targetCtx.fillRect(enemy.boss ? 28 : 27, enemy.boss ? 17 : 19, enemy.boss ? 7 : 5, enemy.boss ? 6 : 5);
    if (enemy.boss) {
      targetCtx.fillStyle = "#f6cf64";
      targetCtx.fillRect(13, 3, 22, 5);
      targetCtx.fillRect(13, 0, 5, 8);
      targetCtx.fillRect(22, 0, 5, 8);
      targetCtx.fillRect(30, 0, 5, 8);
    } else if (enemy.rare) {
      drawPixelStar(targetCtx, 9, 9, 7, "#ffe978");
      drawPixelStar(targetCtx, 39, 12, 6, "#fff7c7");
    }
  }, px, py + wobble, elementInfo(enemy.elementKey).color, enemy.boss || enemy.rare ? 3 : 2, enemyOutlineVisualKey(enemy, time));
  if (enemy.rare) {
    ctx.fillStyle = "rgba(23, 16, 8, 0.9)";
    ctx.fillRect(px + 7, py - 4 + wobble, 34, 9);
    ctx.fillStyle = "#ffe978";
    ctx.font = "900 7px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RARE", px + 24, py + 3 + wobble);
  } else if (enemy.mutated) {
    ctx.fillStyle = "rgba(10, 20, 20, 0.92)";
    ctx.fillRect(px + 3, py - 4 + wobble, 42, 9);
    ctx.fillStyle = enemy.mutation?.color || "#62e1cf";
    ctx.font = "900 7px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`MUTANT ${enemy.mutation?.name || ""}`, px + 24, py + 3 + wobble);
  }
  const element = elementInfo(enemy.elementKey);
  ctx.fillStyle = "rgba(7, 10, 9, 0.9)";
  ctx.fillRect(px + 32, py + 31 + wobble, 15, 15);
  ctx.strokeStyle = element.color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 32, py + 31 + wobble, 15, 15);
  ctx.fillStyle = element.color;
  ctx.font = "900 8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(element.symbol, px + 39.5, py + 42 + wobble);
  if ((enemy.sleepTurns || 0) > 0) {
    ctx.fillStyle = "#d8c9ff";
    ctx.font = "900 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Z", px + 37, py + 10 + wobble);
  }
  drawEnemyIntent(enemy, px, py, wobble);
  drawEnemyHp(enemy, px, py);
}

function drawEnemyIntent(enemy, px, py, wobble) {
  const intent = enemyIntent(enemy);
  if (!intent) return;
  const x = px + 5;
  const y = py - 19 + wobble;
  ctx.save();
  ctx.font = "900 9px sans-serif";
  const labelWidth = Math.ceil(ctx.measureText(intent.label || "").width);
  const width = clamp((intent.urgent ? 24 : 20) + labelWidth, 24, 64);
  ctx.globalAlpha = intent.dim ? 0.72 : 1;
  ctx.fillStyle = intent.urgent ? "rgba(26, 11, 8, 0.94)" : "rgba(7, 10, 9, 0.88)";
  ctx.fillRect(x, y, width, 15);
  ctx.strokeStyle = intent.color;
  ctx.lineWidth = intent.urgent ? 2 : 1.4;
  ctx.strokeRect(x, y, width, 15);
  ctx.fillStyle = intent.color;
  ctx.textAlign = "left";
  ctx.fillText(intent.icon, x + 4, y + 11);
  if (width > 34) {
    ctx.fillStyle = "#fff3cf";
    ctx.font = "800 8px sans-serif";
    ctx.fillText(intent.label, x + 18, y + 11);
  }
  ctx.restore();
}

function prepareMapTokenAtlas() {
  mapTokenCanvas.width = mapTokenSheet.naturalWidth;
  mapTokenCanvas.height = mapTokenSheet.naturalHeight;
  mapTokenCtx.clearRect(0, 0, mapTokenCanvas.width, mapTokenCanvas.height);
  mapTokenCtx.drawImage(mapTokenSheet, 0, 0);
  try {
    const image = mapTokenCtx.getImageData(0, 0, mapTokenCanvas.width, mapTokenCanvas.height);
    const sourceHasAlpha = image.data[3] < 16;
    if (!sourceHasAlpha) {
      for (let index = 0; index < image.data.length; index += 4) {
        const red = image.data[index];
        const green = image.data[index + 1];
        const blue = image.data[index + 2];
        const maximum = Math.max(red, green, blue);
        const minimum = Math.min(red, green, blue);
        if (minimum >= 194 && maximum - minimum <= 24) image.data[index + 3] = 0;
      }
    }
    mapTokenCtx.putImageData(image, 0, 0);
    mapTokenReady = true;
  } catch {
    mapTokenReady = false;
  }
}

function actorTokenCell(actor) {
  if (actor.kind !== "leader") return null;
  const evolution = evolutionCatalog.find((entry) => entry.key === actor.evolutionKey);
  if (evolution?.path === "physical") return [1, 0];
  if (evolution?.path === "magic") return [2, 0];
  if (evolution?.path === "hybrid") return [3, 0];
  return [0, 0];
}

function enemyTokenCell(enemy) {
  if (enemy.boss) return [3, 1];
  if (enemy.mutated) return [3, 1];
  return enemy.attackStyle === "magic" ? [2, 1] : [1, 1];
}

function enemyArtIndex(enemy) {
  if (Number.isInteger(enemy.artIndex)) return clamp(enemy.artIndex, 0, 39);
  const identity = enemy.familyKey || enemy.key || enemy.name || "enemy";
  let hash = 0;
  for (let index = 0; index < identity.length; index += 1) {
    hash = (hash * 31 + identity.charCodeAt(index)) >>> 0;
  }
  return hash % 40;
}

function drawEnemyArt(targetCtx, enemy, time) {
  const category = enemy.boss ? "bosses" : enemy.rare ? "rares" : "enemies";
  const spriteId = enemy.spritePackId
    || (enemy.rare ? FOXBOUND_RARE_SPRITE_IDS[enemy.key] : null)
    || (!enemy.boss && Number.isInteger(enemy.artIndex) ? FOXBOUND_ENEMY_SPRITE_IDS[enemy.artIndex] : null);
  if (spriteId && drawFoxboundSprite(targetCtx, category, spriteId, enemy, time)) return true;
  const artIndex = enemyArtIndex(enemy);
  const sheet = requestEnemyArtSheet(Math.floor(artIndex / 10));
  if (!sheet?.complete || !sheet.naturalWidth) return false;
  const localIndex = artIndex % 10;
  const column = localIndex % 5;
  const row = Math.floor(localIndex / 5);
  const cellWidth = sheet.naturalWidth / 5;
  const cellHeight = sheet.naturalHeight / 2;
  const breath = 1 + Math.sin(time / ((enemy.idleSpeed || 310) * 1.35) + (enemy.wobble || 0)) * 0.025;
  targetCtx.save();
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.translate(TILE / 2, TILE / 2);
  targetCtx.scale(breath, breath);
  targetCtx.drawImage(
    sheet,
    column * cellWidth,
    row * cellHeight,
    cellWidth,
    cellHeight,
    -TILE / 2,
    -TILE / 2,
    TILE,
    TILE,
  );
  targetCtx.restore();
  return true;
}

function drawMapTokenCell(targetCtx, cell) {
  if (!mapTokenReady || !cell) return false;
  const [column, row] = cell;
  const cellWidth = mapTokenCanvas.width / 4;
  const cellHeight = mapTokenCanvas.height / 2;
  const cropX = cellWidth * 0.035;
  const cropY = cellHeight * 0.025;
  targetCtx.drawImage(
    mapTokenCanvas,
    column * cellWidth + cropX,
    row * cellHeight + cropY,
    cellWidth - cropX * 2,
    cellHeight - cropY * 2,
    0,
    0,
    TILE,
    TILE,
  );
  return true;
}

function drawBossHud() {
  const boss = game.enemies.find((enemy) => enemy.boss);
  if (!boss) return;
  const viewWidth = dungeonViewWidth();
  const width = Math.min(430, viewWidth - 240);
  const x = (viewWidth - width) / 2;
  const y = 18;
  ctx.save();
  ctx.fillStyle = "rgba(8, 10, 9, 0.88)";
  ctx.fillRect(x - 10, y - 10, width + 20, 42);
  ctx.strokeStyle = boss.color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 10, y - 10, width + 20, 42);
  ctx.fillStyle = "#fff4df";
  ctx.font = "800 13px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`【${elementInfo(boss.elementKey).name}】${boss.title}  ${boss.name}${boss.bossPlan ? ` / ${boss.bossPlan}` : ""}`, x, y + 4);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x, y + 12, width, 10);
  ctx.fillStyle = boss.color;
  ctx.fillRect(x, y + 12, width * clamp(boss.hp / boss.maxHp, 0, 1), 10);
  ctx.restore();
}

function tintEntityBuffer(color) {
  entityTintCtx.clearRect(0, 0, TILE, TILE);
  entityTintCtx.globalCompositeOperation = "source-over";
  entityTintCtx.drawImage(entityBuffer, 0, 0);
  entityTintCtx.globalCompositeOperation = "source-in";
  entityTintCtx.fillStyle = color;
  entityTintCtx.fillRect(0, 0, TILE, TILE);
  entityTintCtx.globalCompositeOperation = "source-over";
}

function stampEntitySilhouette(targetCtx, x, y, color, radius, exhaustive = false) {
  tintEntityBuffer(color);
  if (!exhaustive) {
    const offsets = new Map();
    for (let index = 0; index < 16; index += 1) {
      const angle = (Math.PI * 2 * index) / 16;
      const dx = Math.round(Math.cos(angle) * radius);
      const dy = Math.round(Math.sin(angle) * radius);
      if (dx || dy) offsets.set(`${dx},${dy}`, { dx, dy });
    }
    for (const offset of offsets.values()) {
      targetCtx.drawImage(entityTint, x + offset.dx, y + offset.dy);
    }
    return;
  }
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      if (dx * dx + dy * dy > radius * radius + 1) continue;
      targetCtx.drawImage(entityTint, x + dx, y + dy);
    }
  }
}

function buildOutlinedEntityCache(color, radius) {
  const padding = radius + 3;
  const outlined = document.createElement("canvas");
  outlined.width = TILE + padding * 2;
  outlined.height = TILE + padding * 2;
  const outlinedCtx = outlined.getContext("2d");
  outlinedCtx.imageSmoothingEnabled = true;
  stampEntitySilhouette(outlinedCtx, padding, padding, "rgba(3, 6, 5, 0.96)", radius + 2, true);
  stampEntitySilhouette(outlinedCtx, padding, padding, color, radius, true);
  outlinedCtx.drawImage(entityBuffer, padding, padding);
  return { canvas: outlined, padding };
}

function drawOutlinedEntity(drawEntity, px, py, color, radius, visualKey = null) {
  const cacheKey = visualKey ? `${visualKey}|${color}|${radius}` : null;
  const cached = cacheKey ? entityOutlineCache.get(cacheKey) : null;
  if (cached) {
    ctx.drawImage(cached.canvas, px - cached.padding, py - cached.padding);
    return;
  }

  entityBufferCtx.clearRect(0, 0, TILE, TILE);
  entityBufferCtx.imageSmoothingEnabled = true;
  drawEntity(entityBufferCtx);

  if (cacheKey) {
    const created = setLimitedCanvasCache(
      entityOutlineCache,
      cacheKey,
      buildOutlinedEntityCache(color, radius),
      ENTITY_OUTLINE_CACHE_LIMIT,
    );
    ctx.drawImage(created.canvas, px - created.padding, py - created.padding);
    return;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  stampEntitySilhouette(ctx, px, py, "rgba(3, 6, 5, 0.96)", radius + 2);
  stampEntitySilhouette(ctx, px, py, color, radius);
  ctx.drawImage(entityBuffer, px, py);
  ctx.restore();
}

function drawEnemyHp(enemy, px, py) {
  if (enemy.hp >= enemy.maxHp) return;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(px + 8, py + 4, 32, 5);
  ctx.fillStyle = palette.coral;
  ctx.fillRect(px + 8, py + 4, Math.max(1, 32 * (enemy.hp / enemy.maxHp)), 5);
}

function drawEffect(effect, time) {
  if (!inCamera(effect.x, effect.y)) return;
  const age = time - effect.created;
  const t = clamp(age / effect.life, 0, 1);
  const { x: px, y: py } = toScreen(effect.x, effect.y);
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = effect.color;
  ctx.fillStyle = effect.color;
  if (effect.type === "hit") {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px + 12, py + 12);
    ctx.lineTo(px + 36, py + 36);
    ctx.moveTo(px + 36, py + 12);
    ctx.lineTo(px + 12, py + 36);
    ctx.stroke();
  } else if (effect.type === "heal") {
    ctx.beginPath();
    ctx.arc(px + 24, py + 24, 8 + t * 26, 0, Math.PI * 2);
    ctx.stroke();
  } else if (effect.type === "burst") {
    ctx.beginPath();
    ctx.arc(px + 24, py + 24, 12 + t * 36, 0, Math.PI * 2);
    ctx.stroke();
  } else if (effect.type === "beam") {
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 9 - t * 4;
    ctx.beginPath();
    ctx.moveTo(px + 24, py + 24);
    ctx.lineTo(px + 24 + effect.dx * TILE * 4, py + 24 + effect.dy * TILE * 4);
    ctx.stroke();
    ctx.globalAlpha = (1 - t) * 0.9;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (effect.type === "enemyProjectile") {
    const destination = toScreen(effect.targetX, effect.targetY);
    const startX = px + 24;
    const startY = py + 24;
    const endX = destination.x + 24;
    const endY = destination.y + 24;
    const travel = Math.min(1, t * 1.45);
    const orbX = startX + (endX - startX) * travel;
    const orbY = startY + (endY - startY) * travel;
    ctx.lineCap = "round";
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 17;
    ctx.globalAlpha = (1 - t) * 0.72;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(orbX, orbY);
    ctx.stroke();
    ctx.globalAlpha = Math.max(0.25, 1 - t);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(orbX, orbY, 5 + Math.sin(t * Math.PI) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(endX, endY, 13 + t * 8, 0, Math.PI * 2);
    ctx.stroke();
  } else if (effect.type === "bossWave") {
    const destination = toScreen(effect.targetX, effect.targetY);
    const startX = px + 24;
    const startY = py + 24;
    const endX = destination.x + 24;
    const endY = destination.y + 24;
    ctx.lineCap = "round";
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 24;
    ctx.globalAlpha = (1 - t) * 0.34;
    ctx.lineWidth = 20 - t * 7;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.globalAlpha = (1 - t) * 0.92;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = effect.color;
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.lineWidth = 5 - ring;
      ctx.beginPath();
      ctx.arc(endX, endY, 12 + ring * 9 + t * 22, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (effect.type === "sparkTrail") {
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 13;
    ctx.globalAlpha = (1 - t) * 0.16;
    ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
    ctx.globalAlpha = (1 - t) * 0.92;
    ctx.lineWidth = 3;
    ctx.strokeRect(px + 5 + t * 3, py + 5 + t * 3, TILE - 10 - t * 6, TILE - 10 - t * 6);
    ctx.translate(px + 24, py + 24);
    ctx.rotate(Math.atan2(effect.dy, effect.dx));
    ctx.beginPath();
    ctx.moveTo(-18 + t * 12, -7);
    ctx.lineTo(15, 0);
    ctx.lineTo(-18 + t * 12, 7);
    ctx.stroke();
  } else if (effect.type === "impact") {
    ctx.translate(px + 24, py + 24);
    ctx.rotate(t * Math.PI * 0.75);
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 4;
    for (let index = 0; index < 8; index += 1) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(5 + t * 8, 0);
      ctx.lineTo(25 + t * 16, 0);
      ctx.stroke();
    }
  } else if (effect.type === "nova") {
    ctx.translate(px + 24, py + 24);
    ctx.rotate(t * Math.PI);
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 4;
    for (let index = 0; index < 10; index += 1) {
      ctx.rotate(Math.PI / 5);
      ctx.beginPath();
      ctx.moveTo(8 + t * 5, 0);
      ctx.lineTo(20 + t * 34, 0);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 7 + t * 30, 0, Math.PI * 2);
    ctx.stroke();
  } else if (effect.type === "vortex") {
    ctx.translate(px + 24, py + 24);
    ctx.rotate(-t * Math.PI * 2);
    ctx.lineWidth = 4;
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, 12 + ring * 9 + t * 12, ring * 1.8, ring * 1.8 + Math.PI * 1.25);
      ctx.stroke();
    }
  } else if (effect.type === "gustTile") {
    ctx.globalAlpha = (1 - t) * 0.13;
    ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
    ctx.globalAlpha = (1 - t) * 0.9;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px + 24, py + 24, 8 + t * 16, -1.2 + t * 2, 3.8 + t * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + 24 - effect.dx * 8, py + 24 - effect.dy * 8);
    ctx.lineTo(px + 24 + effect.dx * (17 + t * 8), py + 24 + effect.dy * (17 + t * 8));
    ctx.stroke();
  } else if (effect.type === "runes") {
    ctx.translate(px + 24, py + 24);
    ctx.rotate(t * Math.PI * 1.5);
    ctx.lineWidth = 3;
    const radius = 14 + t * 24;
    ctx.beginPath();
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      ctx.fillRect(Math.cos(angle) * radius - 2, Math.sin(angle) * radius - 2, 4, 4);
    }
  } else if (effect.type === "shield") {
    ctx.lineWidth = 5;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(px + 24, py + 25, 15 + t * 10, Math.PI * 0.85, Math.PI * 2.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + 14, py + 15);
    ctx.lineTo(px + 24, py + 8 - t * 4);
    ctx.lineTo(px + 34, py + 15);
    ctx.stroke();
  } else if (effect.type === "guardDome") {
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 18;
    ctx.globalAlpha = (1 - t) * 0.18;
    ctx.beginPath();
    ctx.arc(px + 24, py + 26, 21 + t * 5, Math.PI, Math.PI * 2);
    ctx.lineTo(px + 45 + t * 5, py + 37);
    ctx.lineTo(px + 3 - t * 5, py + 37);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = (1 - t) * 0.92;
    ctx.lineWidth = 4;
    ctx.stroke();
  } else if (effect.type === "healBurst") {
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 3;
    for (let index = 0; index < 7; index += 1) {
      const angle = (Math.PI * 2 * index) / 7;
      const radius = 8 + (index % 3) * 5;
      const x = px + 24 + Math.cos(angle) * radius;
      const y = py + 36 + Math.sin(angle) * 6 - t * (28 + index * 3);
      const size = 3 + (index % 2);
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.lineTo(x + size, y);
      ctx.moveTo(x, y - size);
      ctx.lineTo(x, y + size);
      ctx.stroke();
    }
  } else if (effect.type === "comet") {
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(px - 18 + t * 28, py - 12 + t * 28);
    ctx.lineTo(px + 25, py + 25);
    ctx.stroke();
    drawPixelStar(ctx, px + 25, py + 25, Math.max(5, 15 - t * 6), effect.color);
  } else if (effect.type === "trap") {
    ctx.translate(px + 24, py + 24);
    ctx.rotate(t * Math.PI * 0.5);
    ctx.lineWidth = 4;
    for (let index = 0; index < 8; index += 1) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(17 + t * 18, 0);
      ctx.stroke();
    }
  } else if (effect.type === "enemyClaw") {
    ctx.translate(px + 24, py + 24);
    ctx.rotate(Math.atan2(effect.dy, effect.dx));
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 18;
    ctx.lineCap = "round";
    ctx.globalAlpha = (1 - t) * 0.52;
    ctx.fillStyle = effect.color;
    ctx.beginPath();
    ctx.arc(0, 0, 17 + t * 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1 - t;
    for (let slash = -1; slash <= 1; slash += 1) {
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-22 + t * 7, slash * 8 - 14);
      ctx.quadraticCurveTo(0, slash * 8, 22 + t * 9, slash * 8 + 12);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  } else if (effect.type === "slash") {
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px + 10, py + 36);
    ctx.lineTo(px + 38, py + 10);
    ctx.moveTo(px + 19, py + 40);
    ctx.lineTo(px + 41, py + 18);
    ctx.stroke();
  } else if (effect.type === "sleep") {
    ctx.font = "900 19px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Z", px + 31 + t * 6, py + 14 - t * 10);
  } else if (effect.type === "face") {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px + 24, py + 24, 15 + t * 8, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillRect(px + 19, py + 19, 10, 10);
  }
  ctx.restore();
}

function drawFloatingText(text, time) {
  if (!inCamera(text.x, text.y)) return;
  const age = time - text.created;
  const t = clamp(age / text.life, 0, 1);
  const { x: px, y: py } = toScreen(text.x, text.y);
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = text.color;
  ctx.font = "800 15px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text.value, px + 24, py + 12 - t * 18);
  ctx.restore();
}

function drawFog() {
  const startX = Math.max(0, Math.floor(renderCamera.x) - 1);
  const endX = Math.min(MAP_W, Math.ceil(renderCamera.x + renderCamera.width) + 1);
  const startY = Math.max(0, Math.floor(renderCamera.y) - 1);
  const endY = Math.min(MAP_H, Math.ceil(renderCamera.y + renderCamera.height) + 1);
  ctx.fillStyle = palette.fog;
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      if (!game.seen[y][x] || game.visible[y][x]) continue;
      const { x: px, y: py } = toScreen(x, y);
      ctx.fillRect(px, py, TILE, TILE);
    }
  }
}

function drawObjectivePointer(time) {
  const target = game.mission?.boss && !game.mission.complete
    ? game.mission
    : game.guidanceActive || hasRelic("starCompass") || game.mapped[game.stairs.y]?.[game.stairs.x]
      ? game.stairs
      : null;
  if (!target || inCamera(target.x, target.y)) return;
  const leader = getLeader();
  const dx = target.x - leader.x;
  const dy = target.y - leader.y;
  const angle = Math.atan2(dy, dx);
  const viewWidth = dungeonViewWidth();
  const viewHeight = dungeonViewHeight();
  const x = viewWidth / 2 + Math.cos(angle) * (viewWidth / 2 - 42);
  const y = viewHeight / 2 + Math.sin(angle) * (viewHeight / 2 - 42);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = target === game.stairs ? palette.brass : palette.teal;
  ctx.beginPath();
  ctx.moveTo(18 + Math.sin(time / 180) * 2, 0);
  ctx.lineTo(-11, -10);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-11, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawAimIndicator() {
  const leader = getLeader();
  const direction = game.aimDirection || { x: leader.dx, y: leader.dy };
  if (!direction?.x && !direction?.y) return;
  const selectedMove = leader.moves[game.selectedMove];
  const aimTile = game.aimTile || { x: leader.x + direction.x, y: leader.y + direction.y };
  const moveCells = aimPreviewCells(leader, selectedMove, direction);
  const style = moveStyleInfo(selectedMove?.style);

  ctx.save();
  for (const cell of moveCells) {
    if (!inCamera(cell.x, cell.y)) continue;
    drawAimCell(cell.x, cell.y, style.color, cell.hit ? 0.24 : 0.12, cell.hit ? 3 : 2);
  }

  const attackTile = {
    x: leader.x + direction.x,
    y: leader.y + direction.y,
  };
  if (inBounds(attackTile.x, attackTile.y) && inCamera(attackTile.x, attackTile.y)) {
    const attackEnemy = enemyAt(attackTile.x, attackTile.y);
    drawAimCell(attackTile.x, attackTile.y, attackEnemy ? "#ff6f62" : "#ffd982", attackEnemy ? 0.28 : 0.14, 2);
    drawAimCorners(attackTile.x, attackTile.y, attackEnemy ? "#ff6f62" : "#ffd982", 4);
    drawBasicAttackGlyph(attackTile.x, attackTile.y, attackEnemy ? "#ff6f62" : "#ffd982");
  }

  if (inBounds(aimTile.x, aimTile.y) && inCamera(aimTile.x, aimTile.y)) {
    const targetEnemy = enemyAt(aimTile.x, aimTile.y);
    drawAimCorners(aimTile.x, aimTile.y, targetEnemy ? "#ff6f62" : "#f6e7b5", 2);
    if (targetEnemy) drawAimLabel(aimTile, selectedMove, targetEnemy);
  }
  ctx.restore();
}

function drawBasicAttackGlyph(x, y, color) {
  const { x: px, y: py } = toScreen(x, y);
  ctx.save();
  ctx.translate(px + TILE - 11, py + 11);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = "rgba(5, 9, 8, 0.9)";
  ctx.fillRect(-7, -7, 14, 14);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-7, -7, 14, 14);
  ctx.fillStyle = color;
  ctx.fillRect(-1.5, -5, 3, 8);
  ctx.fillRect(-4, 2, 8, 2);
  ctx.fillRect(-1, 4, 2, 4);
  ctx.restore();
}

function aimPreviewCells(actor, move, direction) {
  const shape = moveAimShape(move);
  if (shape.kind === "self") return [{ x: actor.x, y: actor.y, hit: false }];
  if (shape.kind === "burst") {
    const cells = [];
    for (let y = actor.y - shape.range; y <= actor.y + shape.range; y += 1) {
      for (let x = actor.x - shape.range; x <= actor.x + shape.range; x += 1) {
        if (!inBounds(x, y) || gridDistance(actor, { x, y }) > shape.range) continue;
        cells.push({ x, y, hit: Boolean(enemyAt(x, y)) });
      }
    }
    return cells;
  }
  const cells = [];
  const range = shape.range || 1;
  for (let index = 1; index <= range; index += 1) {
    const x = actor.x + direction.x * index;
    const y = actor.y + direction.y * index;
    if (!inBounds(x, y)) break;
    const blocked = !isWalkable(x, y);
    const hit = Boolean(enemyAt(x, y));
    cells.push({ x, y, hit, blocked });
    if (blocked || (hit && shape.kind !== "beam")) break;
  }
  return cells;
}

function drawAimCell(x, y, color, alpha, lineWidth) {
  const { x: px, y: py } = toScreen(x, y);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(px + 7, py + 7, TILE - 14, TILE - 14);
  ctx.globalAlpha = 1;
}

function drawAimCorners(x, y, color, lineWidth) {
  const { x: px, y: py } = toScreen(x, y);
  const edge = 11;
  const inset = 5;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(px + inset, py + inset + edge);
  ctx.lineTo(px + inset, py + inset);
  ctx.lineTo(px + inset + edge, py + inset);
  ctx.moveTo(px + TILE - inset - edge, py + inset);
  ctx.lineTo(px + TILE - inset, py + inset);
  ctx.lineTo(px + TILE - inset, py + inset + edge);
  ctx.moveTo(px + inset, py + TILE - inset - edge);
  ctx.lineTo(px + inset, py + TILE - inset);
  ctx.lineTo(px + inset + edge, py + TILE - inset);
  ctx.moveTo(px + TILE - inset - edge, py + TILE - inset);
  ctx.lineTo(px + TILE - inset, py + TILE - inset);
  ctx.lineTo(px + TILE - inset, py + TILE - inset - edge);
  ctx.stroke();
}

function drawAimLabel(tile, move, targetEnemy) {
  const { x: px, y: py } = toScreen(tile.x, tile.y);
  const style = moveStyleInfo(move?.style);
  const leader = getLeader();
  const attackTarget = enemyAt(leader.x + Math.sign(tile.x - leader.x), leader.y + Math.sign(tile.y - leader.y));
  const attackPrediction = targetEnemy && gridDistance(leader, tile) <= 1
    ? estimateBasicAttackDamage(leader, targetEnemy)
    : attackTarget && gridDistance(leader, tile) > 1
      ? estimateBasicAttackDamage(leader, attackTarget)
      : null;
  const movePrediction = targetEnemy && moveCanReachTarget(leader, move, tile)
    ? estimateMoveDamage(leader, move, targetEnemy)
    : null;
  const attackText = attackPrediction
    ? `左 ${attackPrediction.damage}${attackPrediction.mark}`
    : "左 隣1";
  const moveText = movePrediction
    ? `右 ${movePrediction.damage}${movePrediction.mark}`
    : move ? `右 ${style.short}${moveAimShape(move).label}` : "";
  const text = `${attackText}  ${moveText}`;
  const second = targetEnemy
    ? `${targetEnemy.name} HP${targetEnemy.hp}/${targetEnemy.maxHp}`
    : "カーソル方向へ攻撃";
  ctx.font = "900 10px sans-serif";
  const width = Math.min(184, Math.ceil(Math.max(ctx.measureText(text).width, ctx.measureText(second).width) + 16));
  const x = clamp(px + 24 - width / 2, 4, dungeonViewWidth() - width - 4);
  const y = clamp(py - 28, 6, dungeonViewHeight() - 36);
  ctx.fillStyle = "rgba(5, 9, 9, 0.92)";
  ctx.fillRect(x, y, width, 32);
  ctx.strokeStyle = targetEnemy ? "#ff6f62" : style.color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, 31);
  ctx.fillStyle = targetEnemy ? "#ffd1cc" : "#fff0c0";
  ctx.textAlign = "center";
  ctx.fillText(text, x + width / 2, y + 13);
  ctx.fillStyle = targetEnemy ? "#f6dfcf" : "#cfc8bd";
  ctx.font = "800 9px sans-serif";
  ctx.fillText(second, x + width / 2, y + 26);
}

function moveCanReachTarget(actor, move, tile) {
  if (!move) return false;
  const dx = Math.sign(tile.x - actor.x);
  const dy = Math.sign(tile.y - actor.y);
  return aimPreviewCells(actor, move, { x: dx, y: dy }).some((cell) => cell.x === tile.x && cell.y === tile.y);
}

function estimateBasicAttackDamage(actor, enemy) {
  const knightBonus = actor.profileKey === "knight" ? 2 + (actor.guardTurns > 0 ? 2 : 0) : 0;
  const base = Math.max(1, actor.atk + knightBonus + 1 - enemy.def);
  return addEffectivenessMark(Math.max(1, Math.ceil(base * elementEffectiveness(actor.elementKey, enemy.elementKey))), actor.elementKey, enemy.elementKey);
}

function estimateMoveDamage(actor, move, enemy) {
  if (!move || ["heal", "guard", "kingsGuard", "timeLoop", "blinkHex"].includes(move.key)) {
    return { damage: "-", mark: "", color: "#cfc8bd" };
  }
  const stat = move.style === "magic" ? actor.magic : actor.atk;
  let base = stat + 7 + Math.floor(actor.level / 2);
  if (move.key === "spark") base = actor.magic + 8 + actor.level;
  if (move.key === "gust") base = actor.atk + 5;
  if (move.key === "ironSlash") base = actor.atk * 1.75 + actor.level;
  if (move.key === "shieldCrash") base = actor.atk + actor.def * 2 + 5;
  if (move.key === "lionRoar") base = actor.atk + 5;
  if (move.key === "arcBolt") base = actor.magic + 8;
  if (move.key === "mirrorCurse") base = actor.magic * 0.8 + 4;
  const passive = characterMovePassive(actor, move, game.lastMoveElement, game.lastActionStyle);
  const shape = moveAimShape(move);
  const relicMultiplier = (hasRelic("lineSigil") && ["line", "beam"].includes(shape.kind) ? 1.18 : 1)
    * (hasRelic("burstBloom") && shape.kind === "burst" ? 1.18 : 1)
    * (hasRelic("openingCharm") && game.turn < 18 ? 1.2 : 1)
    * (hasRelic("thiefRibbon") && game.runStats.thefts > 0 ? 1.25 : 1);
  const damage = Math.max(1, Math.ceil((base * relicMultiplier * (passive.multiplier || 1) * (1 + (move.powerBonus || 0))) - (move.style === "magic" ? enemy.res : enemy.def)));
  return addEffectivenessMark(Math.max(1, Math.ceil(damage * elementEffectiveness(move.element, enemy.elementKey))), move.element, enemy.elementKey);
}

function addEffectivenessMark(damage, attackElement, defenseElement) {
  const effectiveness = elementEffectiveness(attackElement, defenseElement);
  return {
    damage,
    mark: effectiveness > 1 ? "◎" : effectiveness < 1 ? "△" : "",
    color: effectiveness > 1 ? elementInfo(attackElement).color : effectiveness < 1 ? "#b9c0bc" : "#fff0c0",
  };
}

function tileFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (((event.clientX - rect.left) / rect.width) * canvas.width) / DUNGEON_ZOOM;
  const y = (((event.clientY - rect.top) / rect.height) * canvas.height) / DUNGEON_ZOOM;
  return {
    x: clamp(Math.floor(x / TILE + renderCamera.x), 0, MAP_W - 1),
    y: clamp(Math.floor(y / TILE + renderCamera.y), 0, MAP_H - 1),
  };
}

function aimFromPointer(event) {
  const tile = tileFromPointer(event);
  const leader = getLeader();
  return {
    x: Math.sign(tile.x - leader.x),
    y: Math.sign(tile.y - leader.y),
    tileX: tile.x,
    tileY: tile.y,
  };
}

function directionFromPointer(event) {
  const aim = aimFromPointer(event);
  return { x: aim.x, y: aim.y };
}

function clearPointerAim() {
  game.aimDirection = null;
  game.aimTile = null;
}

function miniMapStateSignature() {
  const teamState = game.team.map((actor) => `${actor.id}:${actor.x},${actor.y}:${actor.down ? 1 : 0}`).join("|");
  const enemyState = game.enemies.map((enemy) => `${enemy.id}:${enemy.x},${enemy.y}`).join("|");
  const revealedTraps = game.traps.reduce((count, trap) => count + (trap.revealed && !trap.used ? 1 : 0), 0);
  return [
    game.floor,
    game.turn,
    game.items.length,
    game.guidanceActive ? 1 : 0,
    game.stairsRevealed ? 1 : 0,
    game.secretStairs?.revealed ? 1 : 0,
    game.merchant?.robbed ? 1 : 0,
    game.mission?.complete ? 1 : 0,
    revealedTraps,
    teamState,
    enemyState,
  ].join(";");
}

function drawMiniMap() {
  const nextRenderKey = miniMapStateSignature();
  if (nextRenderKey === miniMapRenderKey) return;
  miniMapRenderKey = nextRenderKey;
  const sx = miniCanvas.width / MAP_W;
  const sy = miniCanvas.height / MAP_H;
  const markerRadius = Math.max(2.8, Math.min(4.1, Math.min(sx, sy) * 0.56));
  const mappedFloorAt = (x, y) => (
    x >= 0
    && y >= 0
    && x < MAP_W
    && y < MAP_H
    && game.mapped[y]?.[x]
    && game.map[y]?.[x] !== "wall"
  );
  const markerCenter = (x, y) => ({
    x: (x + 0.5) * sx,
    y: (y + 0.5) * sy,
  });
  const drawDot = (x, y, fill, radius = markerRadius, stroke = "#07100d", lineWidth = 1.5) => {
    const center = markerCenter(x, y);
    miniCtx.save();
    miniCtx.beginPath();
    miniCtx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    miniCtx.fillStyle = fill;
    miniCtx.shadowColor = fill;
    miniCtx.shadowBlur = 4;
    miniCtx.fill();
    miniCtx.shadowBlur = 0;
    miniCtx.strokeStyle = stroke;
    miniCtx.lineWidth = lineWidth;
    miniCtx.stroke();
    miniCtx.restore();
  };
  const drawDiamond = (x, y, fill, radius = markerRadius, stroke = "#07100d", lineWidth = 1.5) => {
    const center = markerCenter(x, y);
    miniCtx.save();
    miniCtx.beginPath();
    miniCtx.moveTo(center.x, center.y - radius);
    miniCtx.lineTo(center.x + radius, center.y);
    miniCtx.lineTo(center.x, center.y + radius);
    miniCtx.lineTo(center.x - radius, center.y);
    miniCtx.closePath();
    miniCtx.fillStyle = fill;
    miniCtx.shadowColor = fill;
    miniCtx.shadowBlur = 4;
    miniCtx.fill();
    miniCtx.shadowBlur = 0;
    miniCtx.strokeStyle = stroke;
    miniCtx.lineWidth = lineWidth;
    miniCtx.stroke();
    miniCtx.restore();
  };

  miniCtx.fillStyle = "#020706";
  miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      if (!mappedFloorAt(x, y)) continue;
      const left = Math.floor(x * sx);
      const top = Math.floor(y * sy);
      const width = Math.ceil((x + 1) * sx) - left;
      const height = Math.ceil((y + 1) * sy) - top;
      miniCtx.fillStyle = isMerchantShopTile(x, y)
        ? (game.merchant?.robbed ? "#b9545b" : "#54c9a4")
        : game.visible[y][x] ? "#acd9bd" : "#477763";
      miniCtx.fillRect(left, top, width, height);
    }
  }

  // Trace only the outside of explored floor so rooms and corridors read as shapes.
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      if (!mappedFloorAt(x, y)) continue;
      const left = x * sx;
      const top = y * sy;
      const right = (x + 1) * sx;
      const bottom = (y + 1) * sy;
      miniCtx.beginPath();
      if (!mappedFloorAt(x, y - 1)) {
        miniCtx.moveTo(left, top);
        miniCtx.lineTo(right, top);
      }
      if (!mappedFloorAt(x + 1, y)) {
        miniCtx.moveTo(right, top);
        miniCtx.lineTo(right, bottom);
      }
      if (!mappedFloorAt(x, y + 1)) {
        miniCtx.moveTo(right, bottom);
        miniCtx.lineTo(left, bottom);
      }
      if (!mappedFloorAt(x - 1, y)) {
        miniCtx.moveTo(left, bottom);
        miniCtx.lineTo(left, top);
      }
      miniCtx.strokeStyle = game.visible[y]?.[x]
        ? "rgba(230, 255, 237, 0.96)"
        : "rgba(126, 184, 158, 0.84)";
      miniCtx.lineWidth = 1.25;
      miniCtx.stroke();
    }
  }

  miniCtx.save();
  miniCtx.strokeStyle = "rgba(255, 250, 222, 0.72)";
  miniCtx.lineWidth = 1.5;
  miniCtx.setLineDash([4, 2]);
  miniCtx.strokeRect(
    renderCamera.x * sx,
    renderCamera.y * sy,
    renderCamera.width * sx,
    renderCamera.height * sy,
  );
  miniCtx.restore();

  for (const item of game.items) {
    const mappedItem = game.mapped[item.y]?.[item.x];
    if (!mappedItem) continue;
    if (!isVisible(item.x, item.y) && !hasSkill("scout")) continue;
    drawDiamond(item.x, item.y, "#ffd45f", markerRadius - 0.2, "#3a2200", 1.4);
  }
  if (game.merchant && game.mapped[game.merchant.y]?.[game.merchant.x]) {
    drawDiamond(game.merchant.x, game.merchant.y, "#61e1bd", markerRadius + 0.8, "#e8fff5", 1.5);
  }
  for (const node of game.restNodes || []) {
    if (!game.mapped[node.y]?.[node.x]) continue;
    drawDot(
      node.x,
      node.y,
      node.action === "milestone" && game.restChoiceTaken ? "#827a72" : node.color,
      markerRadius + 0.35,
      "#f4eddd",
      1.25,
    );
  }
  if (game.casino && game.mapped[game.casino.y]?.[game.casino.x]) {
    drawDot(game.casino.x, game.casino.y, "#f1b94d", markerRadius + 0.35, "#fff2c3", 1.25);
  }
  if (game.secretStairs?.revealed && game.mapped[game.secretStairs.y]?.[game.secretStairs.x]) {
    drawDiamond(
      game.secretStairs.x,
      game.secretStairs.y,
      game.secretStairs.used ? "#73627f" : "#d99bff",
      markerRadius + 0.8,
      "#f9e9ff",
      1.5,
    );
  }

  if (game.stairsRevealed && (game.mapped[game.stairs.y][game.stairs.x] || game.guidanceActive || hasRelic("starCompass"))) {
    drawDiamond(
      game.stairs.x,
      game.stairs.y,
      game.mission.complete ? "#fff8de" : "#9ea8a4",
      markerRadius + 0.8,
      "#163039",
      1.7,
    );
  }
  for (const trap of game.traps) {
    if (!trap.revealed || !game.mapped[trap.y]?.[trap.x]) continue;
    drawDiamond(trap.x, trap.y, "#ff786c", markerRadius - 0.25, "#4c0d0b", 1.3);
  }
  if (
    game.mission &&
    !game.mission.complete &&
    (game.mapped[game.mission.y][game.mission.x] || game.guidanceActive)
  ) {
    drawDot(game.mission.x, game.mission.y, "#df78ff", markerRadius + 0.65, "#fff0ff", 1.5);
  }
  for (const enemy of game.enemies) {
    if (!isVisible(enemy.x, enemy.y) || !game.mapped[enemy.y]?.[enemy.x]) continue;
    drawDot(
      enemy.x,
      enemy.y,
      enemy.rare ? "#ffe45f" : elementInfo(enemy.elementKey).color,
      markerRadius + 0.35,
      enemy.rare ? "#fff7ca" : "#ff625e",
      2,
    );
  }
  for (let index = game.team.length - 1; index >= 0; index -= 1) {
    const actor = game.team[index];
    if (actor.down) continue;
    drawDiamond(
      actor.x,
      actor.y,
      actor.id === "leader" ? "#62efff" : "#8ed96c",
      actor.id === "leader" ? markerRadius + 1.25 : markerRadius + 0.6,
      actor.id === "leader" ? "#ffffff" : "#efffe8",
      actor.id === "leader" ? 2 : 1.4,
    );
  }
}

function drawPortrait(targetCanvas, actor) {
  const pctx = targetCanvas.getContext("2d");
  pctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  const scale = Math.min(targetCanvas.width, targetCanvas.height) / TILE;
  const offsetX = (targetCanvas.width - TILE * scale) / 2;
  const offsetY = (targetCanvas.height - TILE * scale) / 2;
  pctx.save();
  pctx.imageSmoothingEnabled = true;
  pctx.translate(offsetX, offsetY);
  pctx.scale(scale, scale);
  drawActorBody(pctx, actor, 0, 0, 1, performance.now());
  pctx.restore();
}

function maskCanvasAsSilhouette(targetCanvas, glowColor = "#8eeaf1", mark = "?") {
  const sctx = targetCanvas.getContext("2d");
  const copy = document.createElement("canvas");
  copy.width = targetCanvas.width;
  copy.height = targetCanvas.height;
  copy.getContext("2d").drawImage(targetCanvas, 0, 0);
  sctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  sctx.save();
  sctx.shadowColor = glowColor;
  sctx.shadowBlur = 14;
  sctx.globalAlpha = 0.82;
  sctx.drawImage(copy, 0, 0);
  sctx.globalAlpha = 1;
  sctx.globalCompositeOperation = "source-in";
  sctx.fillStyle = "#050606";
  sctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  sctx.restore();
  sctx.save();
  sctx.fillStyle = "rgba(255, 240, 180, 0.92)";
  sctx.strokeStyle = "rgba(0, 0, 0, 0.86)";
  sctx.lineWidth = 4;
  sctx.font = `900 ${Math.max(20, Math.floor(targetCanvas.width * 0.27))}px sans-serif`;
  sctx.textAlign = "center";
  sctx.textBaseline = "middle";
  sctx.strokeText(mark, targetCanvas.width / 2, targetCanvas.height / 2 + 1);
  sctx.fillText(mark, targetCanvas.width / 2, targetCanvas.height / 2 + 1);
  sctx.restore();
}

function drawStatRadar(targetCanvas, actor) {
  if (!targetCanvas) return;
  const radarCtx = targetCanvas.getContext("2d");
  const width = targetCanvas.width;
  const height = targetCanvas.height;
  const centerX = width / 2;
  const centerY = height / 2 + 3;
  const radius = Math.min(width * 0.27, height * 0.34);
  const color = elementInfo(actor.elementKey).color;
  const axes = [
    { label: "HP", value: actor.maxHp, max: 46 },
    { label: "物理", value: actor.atk, max: 11 },
    { label: "防御", value: actor.def, max: 7 },
    { label: "魔防", value: actor.res, max: 7 },
    { label: "魔力", value: actor.magic, max: 11 },
  ];
  const pointAt = (index, amount) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axes.length;
    return {
      x: centerX + Math.cos(angle) * radius * amount,
      y: centerY + Math.sin(angle) * radius * amount,
    };
  };

  radarCtx.clearRect(0, 0, width, height);
  radarCtx.fillStyle = "rgba(4, 10, 11, 0.62)";
  radarCtx.fillRect(0, 0, width, height);
  for (let ring = 1; ring <= 4; ring += 1) {
    radarCtx.beginPath();
    for (let index = 0; index < axes.length; index += 1) {
      const point = pointAt(index, ring / 4);
      if (index === 0) radarCtx.moveTo(point.x, point.y);
      else radarCtx.lineTo(point.x, point.y);
    }
    radarCtx.closePath();
    radarCtx.strokeStyle = ring === 4 ? "rgba(255, 244, 218, 0.34)" : "rgba(255, 255, 255, 0.12)";
    radarCtx.lineWidth = ring === 4 ? 1.5 : 1;
    radarCtx.stroke();
  }
  for (let index = 0; index < axes.length; index += 1) {
    const point = pointAt(index, 1);
    radarCtx.beginPath();
    radarCtx.moveTo(centerX, centerY);
    radarCtx.lineTo(point.x, point.y);
    radarCtx.strokeStyle = "rgba(255, 255, 255, 0.13)";
    radarCtx.lineWidth = 1;
    radarCtx.stroke();
  }

  radarCtx.beginPath();
  axes.forEach((axis, index) => {
    const point = pointAt(index, clamp(axis.value / axis.max, 0.08, 1));
    if (index === 0) radarCtx.moveTo(point.x, point.y);
    else radarCtx.lineTo(point.x, point.y);
  });
  radarCtx.closePath();
  radarCtx.fillStyle = `${color}52`;
  radarCtx.strokeStyle = color;
  radarCtx.lineWidth = 2.5;
  radarCtx.fill();
  radarCtx.stroke();
  axes.forEach((axis, index) => {
    const point = pointAt(index, clamp(axis.value / axis.max, 0.08, 1));
    radarCtx.fillStyle = "#fff7df";
    radarCtx.beginPath();
    radarCtx.arc(point.x, point.y, 2.7, 0, Math.PI * 2);
    radarCtx.fill();

    const labelPoint = pointAt(index, 1.3);
    radarCtx.fillStyle = "#e9dfc5";
    radarCtx.font = "800 10px sans-serif";
    radarCtx.textAlign = Math.abs(labelPoint.x - centerX) < 8
      ? "center"
      : labelPoint.x < centerX ? "right" : "left";
    radarCtx.textBaseline = "middle";
    radarCtx.fillText(`${axis.label} ${axis.value}`, labelPoint.x, labelPoint.y);
  });
}

function drawSprite(index, x, y, width = TILE, height = TILE) {
  return drawSpriteOnContext(ctx, index, x, y, width, height);
}

function drawSpriteOnContext(targetCtx, index, x, y, width, height) {
  if (!spriteSheet.complete || !spriteSheet.naturalWidth) return false;
  const col = index % SPRITE_COLS;
  const row = Math.floor(index / SPRITE_COLS);
  const sx = SPRITE_MARGIN + col * (SPRITE_TILE + SPRITE_MARGIN);
  const sy = SPRITE_MARGIN + row * (SPRITE_TILE + SPRITE_MARGIN);
  targetCtx.drawImage(spriteSheet, sx, sy, SPRITE_TILE, SPRITE_TILE, x, y, width, height);
  return true;
}

function moveActorToward(actor, target, allowEnemyTarget, delay = 0) {
  const next = stepToward(actor, target, allowEnemyTarget);
  if (!next) return false;
  const from = { x: actor.x, y: actor.y };
  actor.dx = Math.sign(next.x - actor.x);
  actor.dy = Math.sign(next.y - actor.y);
  actor.x = next.x;
  actor.y = next.y;
  startWalkMotion(actor, from.x, from.y, next.x, next.y, delay);
  addEffect("step", actor.x, actor.y, actor.color);
  applyStepTerrain(actor);
  return true;
}

function moveEnemyToward(enemy, target) {
  const next = stepToward(enemy, target, false);
  if (!next) return false;
  const from = { x: enemy.x, y: enemy.y };
  enemy.dx = Math.sign(next.x - enemy.x);
  enemy.dy = Math.sign(next.y - enemy.y);
  enemy.x = next.x;
  enemy.y = next.y;
  startWalkMotion(enemy, from.x, from.y, next.x, next.y, 70);
  addEffect("step", enemy.x, enemy.y, enemy.color);
  return true;
}

function stepToward(actor, target, allowEnemyTarget) {
  const queue = [{ x: actor.x, y: actor.y, first: null }];
  const visited = makeGrid(false);
  visited[actor.y][actor.x] = true;
  const occupiedTarget = Boolean(actorAt(target.x, target.y) || enemyAt(target.x, target.y));

  while (queue.length) {
    const current = queue.shift();
    const reached = occupiedTarget
      ? gridDistance(current, target) <= 1
      : current.x === target.x && current.y === target.y;
    if (reached) return current.first;
    for (const dir of dirs) {
      const x = current.x + dir.x;
      const y = current.y + dir.y;
      if (!inBounds(x, y) || visited[y][x] || !canTakeStep(current.x, current.y, dir.x, dir.y)) continue;
      const first = current.first || { x, y };
      if (actor.kind || actor.id === "leader") {
        if (allyAt(x, y) || enemyAt(x, y)) continue;
      } else if (enemyAt(x, y) || allyAt(x, y)) {
        continue;
      }
      visited[y][x] = true;
      queue.push({ x, y, first });
    }
  }
  return null;
}

function enemyWander(enemy) {
  if (Math.random() > 0.45) return;
  const shuffled = [...dirs].sort(() => Math.random() - 0.5);
  for (const dir of shuffled) {
    const x = enemy.x + dir.x;
    const y = enemy.y + dir.y;
    if (canTakeStep(enemy.x, enemy.y, dir.x, dir.y) && !actorAt(x, y) && !enemyAt(x, y) && !merchantAt(x, y)) {
      const from = { x: enemy.x, y: enemy.y };
      enemy.dx = dir.x;
      enemy.dy = dir.y;
      enemy.x = x;
      enemy.y = y;
      startWalkMotion(enemy, from.x, from.y, x, y, 70);
      return;
    }
  }
}

function startWalkMotion(actor, fromX, fromY, toX, toY, delay = 0) {
  actor.motion = {
    kind: "walk",
    fromX,
    fromY,
    toX,
    toY,
    started: performance.now() + delay,
    duration: 145,
  };
}

function startBumpMotion(actor, dx, dy, strength = 0.2, delay = 0) {
  markActorAction(actor, 320 + delay);
  actor.motion = {
    kind: "bump",
    fromX: actor.x,
    fromY: actor.y,
    toX: actor.x + dx * strength,
    toY: actor.y + dy * strength,
    started: performance.now() + delay,
    duration: 170,
  };
}

function markActorAction(actor, duration = 360) {
  if (!actor) return;
  actor.actionUntil = Math.max(actor.actionUntil || 0, performance.now() + duration);
}

function getActorVisualPosition(actor, time) {
  const motion = actor.motion;
  if (!motion) return { x: actor.x, y: actor.y, walking: false, phase: 0 };
  if (time < motion.started) {
    return { x: motion.fromX, y: motion.fromY, walking: motion.kind === "walk", phase: 0 };
  }
  const phase = clamp((time - motion.started) / motion.duration, 0, 1);
  if (phase >= 1) return { x: actor.x, y: actor.y, walking: false, phase: 1 };
  if (motion.kind === "bump") {
    const pulse = Math.sin(phase * Math.PI);
    return {
      x: motion.fromX + (motion.toX - motion.fromX) * pulse,
      y: motion.fromY + (motion.toY - motion.fromY) * pulse,
      walking: false,
      phase,
    };
  }
  const eased = phase * phase * (3 - 2 * phase);
  return {
    x: motion.fromX + (motion.toX - motion.fromX) * eased,
    y: motion.fromY + (motion.toY - motion.fromY) * eased,
    walking: true,
    phase,
  };
}

function revealAroundTeam() {
  if (game.floorKind?.includes("rest")) {
    revealRestSanctuary();
    return;
  }
  game.visible = makeGrid(false);
  for (const actor of livingTeam()) {
    mapVisitedArea(actor);
    for (let y = actor.y - VISION_RADIUS; y <= actor.y + VISION_RADIUS; y += 1) {
      for (let x = actor.x - VISION_RADIUS; x <= actor.x + VISION_RADIUS; x += 1) {
        if (!inBounds(x, y)) continue;
        if (distance(actor, { x, y }) > VISION_RADIUS) continue;
        game.visible[y][x] = true;
        game.seen[y][x] = true;
      }
    }
  }
  const leader = getLeader();
  if (hasRelic("trapEye") || hasSkill("scout")) {
    for (const trap of game.traps) {
      if (!trap.used && manhattan(leader.x, leader.y, trap.x, trap.y) <= 2) trap.revealed = true;
    }
  }
  const rareEnemy = game.enemies.find(
    (enemy) => enemy.rare && !enemy.rareNoticed && isVisible(enemy.x, enemy.y),
  );
  if (rareEnemy) {
    rareEnemy.rareNoticed = true;
    addLog(`珍しい気配を発見。レア敵「${rareEnemy.name}」が現れた。`);
    announceEvent("RARE ENEMY", `${rareEnemy.name}を発見`, "★", "mystic");
    setScreenFlash("#ffe16d", 300);
  }
}

function revealRestSanctuary() {
  game.visible = makeGrid(false);
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      if (!isWalkable(x, y)) continue;
      game.visible[y][x] = true;
      game.seen[y][x] = true;
      game.mapped[y][x] = true;
    }
  }
}

function mapVisitedArea(actor) {
  if (!inBounds(actor.x, actor.y)) return;
  game.mapped[actor.y][actor.x] = true;
  const room = game.rooms.find((candidate) => pointInRoom(actor.x, actor.y, candidate));
  if (!room) return;
  for (let y = room.y; y < room.y + room.h; y += 1) {
    for (let x = room.x; x < room.x + room.w; x += 1) {
      if (isWalkable(x, y)) game.mapped[y][x] = true;
    }
  }
}

function pointInRoom(x, y, room) {
  return x >= room.x && y >= room.y && x < room.x + room.w && y < room.y + room.h;
}

function healActor(actor, amount) {
  if (actor.down) return 0;
  const before = actor.hp;
  actor.hp = Math.min(actor.maxHp, actor.hp + amount);
  if (actor.hp > before) addFloatingText(actor.x, actor.y, `+${actor.hp - before}`, palette.moss);
  return actor.hp - before;
}

function addLog(message) {
  game.logs.push(message);
  if (game.logs.length > 80) game.logs.shift();
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    ui.toast.hidden = true;
  }, 1800);
}

function announceEvent(title, detail, icon = "!", tone = "good", speaker = null) {
  ui.eventTitle.textContent = title;
  ui.eventDetail.textContent = detail;
  ui.eventIcon.textContent = icon;
  ui.eventBanner.dataset.tone = tone;
  ui.eventBanner.hidden = false;
  ui.eventBanner.classList.remove("idle", "dialogue-pop");
  void ui.eventBanner.offsetWidth;
  ui.eventBanner.classList.add("dialogue-pop");
  if (game?.team?.length && ui.eventPortrait) {
    if (speaker && (speaker.familyKey || speaker.boss || speaker.rare)) drawEnemyPortrait(ui.eventPortrait, speaker);
    else drawPortrait(ui.eventPortrait, speaker || getLeader());
  }
  window.clearTimeout(announceEvent.timer);
  announceEvent.timer = window.setTimeout(() => {
    ui.eventBanner.classList.remove("dialogue-pop");
    ui.eventBanner.classList.add("idle");
  }, 3600);
}

function drawEnemyPortrait(targetCanvas, enemy) {
  const pctx = targetCanvas.getContext("2d");
  pctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  const scale = Math.min(targetCanvas.width, targetCanvas.height) / TILE;
  const offsetX = (targetCanvas.width - TILE * scale) / 2;
  const offsetY = (targetCanvas.height - TILE * scale) / 2;
  pctx.save();
  pctx.imageSmoothingEnabled = true;
  pctx.translate(offsetX, offsetY);
  pctx.scale(scale, scale);
  if (!drawEnemyArt(pctx, enemy, performance.now())) {
    drawMapTokenCell(pctx, enemyTokenCell(enemy));
  }
  pctx.restore();
}

function setScreenFlash(color, life = 240) {
  game.screenFlash = { color, created: performance.now(), life };
}

function triggerScreenShake(strength = 9, life = 240) {
  const current = game.screenShake;
  if (current && performance.now() - current.created < current.life && current.strength > strength) return;
  game.screenShake = { strength, life, created: performance.now() };
}

function getScreenShakeOffset(time) {
  if (!game.screenShake) return { x: 0, y: 0 };
  const age = time - game.screenShake.created;
  if (age >= game.screenShake.life) {
    game.screenShake = null;
    return { x: 0, y: 0 };
  }
  const power = game.screenShake.strength * (1 - age / game.screenShake.life);
  return {
    x: (Math.random() * 2 - 1) * power,
    y: (Math.random() * 2 - 1) * power,
  };
}

function drawScreenFlash(time) {
  if (!game.screenFlash) return;
  const age = time - game.screenFlash.created;
  if (age >= game.screenFlash.life) {
    game.screenFlash = null;
    return;
  }
  const alpha = (1 - age / game.screenFlash.life) * 0.28;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = game.screenFlash.color;
  ctx.lineWidth = 18;
  ctx.strokeRect(4, 4, dungeonViewWidth() - 8, dungeonViewHeight() - 8);
  ctx.restore();
}

function addEffect(type, x, y, color, dx = 0, dy = 0) {
  const fastEffects = ["beam", "comet", "slash", "sparkTrail", "impact", "enemyClaw"];
  const longEffects = ["nova", "runes", "vortex", "shield", "gustTile", "healBurst", "guardDome"];
  const life = fastEffects.includes(type) ? 300 : longEffects.includes(type) ? 680 : 520;
  game.effects.push({ type, x, y, color, dx, dy, created: performance.now(), life });
}

function addTargetedEffect(type, x, y, targetX, targetY, color, life = 620) {
  game.effects.push({
    type,
    x,
    y,
    targetX,
    targetY,
    color,
    created: performance.now(),
    life,
  });
}

function addFloatingText(x, y, value, color) {
  game.floating.push({ x, y, value, color, created: performance.now(), life: 820 });
}

function getLeader() {
  return game.team[0];
}

function livingTeam() {
  return game.team.filter((actor) => !actor.down && actor.hp > 0);
}

function adjacentEnemies(actor) {
  return game.enemies.filter((enemy) => gridDistance(actor, enemy) === 1);
}

function nearestEnemy(actor, predicate = () => true) {
  let best = null;
  let bestDistance = Infinity;
  for (const enemy of game.enemies) {
    if (!predicate(enemy)) continue;
    const d = manhattan(actor.x, actor.y, enemy.x, enemy.y);
    if (d < bestDistance) {
      best = enemy;
      bestDistance = d;
    }
  }
  return best;
}

function nearestLivingAlly(enemy) {
  let best = null;
  let bestDistance = Infinity;
  for (const actor of livingTeam()) {
    const d = manhattan(enemy.x, enemy.y, actor.x, actor.y);
    if (d < bestDistance) {
      best = actor;
      bestDistance = d;
    }
  }
  return best;
}

function actorAt(x, y) {
  return allyAt(x, y);
}

function allyAt(x, y) {
  return game.team.find((actor) => !actor.down && actor.x === x && actor.y === y);
}

function enemyAt(x, y) {
  return game.enemies.find((enemy) => enemy.x === x && enemy.y === y);
}

function itemAt(x, y) {
  return game.items.find((item) => item.x === x && item.y === y);
}

function merchantAt(x, y) {
  return game.merchant && game.merchant.x === x && game.merchant.y === y ? game.merchant : null;
}

function restNodeAt(x, y) {
  return game.restNodes?.find((node) => node.x === x && node.y === y) || null;
}

function interactRestNode(node) {
  if (node.action === "milestone") {
    if (game.restChoiceTaken) {
      showToast("祭壇の選択は済んでいる");
      addLog("進化の祭壇は静かな光をたたえている。");
      return;
    }
    openRestSite();
    return;
  }
  chooseRestAction(node.action);
}

function isMerchantShopTile(x, y) {
  return Boolean(game.merchant?.shopTiles?.some((tile) => tile.x === x && tile.y === y));
}

function merchantDebt() {
  const merchant = game.merchant;
  if (!merchant) return 0;
  return (merchant.unpaid || []).reduce((sum, offerId) => {
    const offer = merchant.stock.find((entry) => entry.id === offerId);
    return sum + (offer?.price || 0);
  }, 0);
}

function randomEnemySpawnTile(minDistance = 7) {
  for (let attempt = 0; attempt < 220; attempt += 1) {
    const point = randomOpenTile();
    if (!point) return null;
    if (livingTeam().some((actor) => manhattan(actor.x, actor.y, point.x, point.y) < minDistance)) continue;
    if (game.visible[point.y]?.[point.x]) continue;
    if (isMerchantShopTile(point.x, point.y)) continue;
    return point;
  }
  return null;
}

function randomOpenTile() {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const room = game.rooms[randInt(0, game.rooms.length - 1)];
    const x = randInt(room.x, room.x + room.w - 1);
    const y = randInt(room.y, room.y + room.h - 1);
    if (!isWalkable(x, y)) continue;
    if (actorAt(x, y) || enemyAt(x, y) || itemAt(x, y) || merchantAt(x, y)) continue;
    if (isMerchantShopTile(x, y)) continue;
    if (game.casino && game.casino.x === x && game.casino.y === y) continue;
    if (game.secretStairs && game.secretStairs.x === x && game.secretStairs.y === y) continue;
    if (game.traps?.some((trap) => trap.x === x && trap.y === y)) continue;
    if (game.mission && x === game.mission.x && y === game.mission.y) continue;
    if (game.stairs && x === game.stairs.x && y === game.stairs.y) continue;
    return { x, y };
  }
  return null;
}

function nearestOpen(x, y, blockers = []) {
  for (let radius = 0; radius < 12; radius += 1) {
    for (let yy = y - radius; yy <= y + radius; yy += 1) {
      for (let xx = x - radius; xx <= x + radius; xx += 1) {
        if (!inBounds(xx, yy) || !isWalkable(xx, yy)) continue;
        if (blockers.some((point) => point.x === xx && point.y === yy)) continue;
        if (actorAt(xx, yy) || enemyAt(xx, yy)) continue;
        return { x: xx, y: yy };
      }
    }
  }
  return { x, y };
}

function isWalkable(x, y) {
  return inBounds(x, y) && game.map[y][x] !== "wall";
}

function canTakeStep(fromX, fromY, dx, dy) {
  const x = fromX + dx;
  const y = fromY + dy;
  if (!isWalkable(x, y)) return false;
  if (!dx || !dy) return true;
  return isWalkable(fromX + dx, fromY) && isWalkable(fromX, fromY + dy);
}

function hasClearAttackPath(from, to) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const steps = Math.max(Math.abs(deltaX), Math.abs(deltaY));
  if (!steps) return true;
  let previousX = from.x;
  let previousY = from.y;
  for (let step = 1; step <= steps; step += 1) {
    const x = Math.round(from.x + (deltaX * step) / steps);
    const y = Math.round(from.y + (deltaY * step) / steps);
    if (x === previousX && y === previousY) continue;
    if (
      x !== previousX &&
      y !== previousY &&
      (!isWalkable(x, previousY) || !isWalkable(previousX, y))
    ) {
      return false;
    }
    if (step < steps && !isWalkable(x, y)) return false;
    previousX = x;
    previousY = y;
  }
  return true;
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
}

function inCamera(x, y) {
  return (
    x >= renderCamera.x - 1 &&
    y >= renderCamera.y - 1 &&
    x <= renderCamera.x + renderCamera.width + 1 &&
    y <= renderCamera.y + renderCamera.height + 1
  );
}

function isVisible(x, y) {
  return inBounds(x, y) && game.visible[y][x];
}

function toScreen(x, y) {
  return {
    x: Math.floor((x - renderCamera.x) * TILE),
    y: Math.floor((y - renderCamera.y) * TILE),
  };
}

function centerOf(room) {
  return { x: Math.floor(room.x + room.w / 2), y: Math.floor(room.y + room.h / 2) };
}

function overlaps(a, b, padding = 0) {
  return !(
    a.x + a.w + padding < b.x ||
    b.x + b.w + padding < a.x ||
    a.y + a.h + padding < b.y ||
    b.y + b.h + padding < a.y
  );
}

function makeGrid(value) {
  return Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => value));
}

function pickSprite(list, x, y, salt) {
  return list[Math.floor(noise(x, y, salt) * list.length) % list.length];
}

function itemColor(kind, item) {
  if (kind === "gear") return item?.gear?.color || "#f2c76b";
  if (itemCatalog[kind]) return itemCatalog[kind].color;
  if (kind === "badge") return palette.violet;
  return palette.white;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function gridDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function manhattan(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function weighted(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function noise(x, y, salt) {
  const value = Math.sin((x * 127.1 + y * 311.7 + salt * 74.7) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function cryptoId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random()}`;
}

function readBestScore() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY) || "0");
  } catch {
    return 0;
  }
}

function readSoundSetting() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

function ensureAudio() {
  if (!soundEnabled) return null;
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playTone(frequency, duration, type = "square", volume = 0.035, delay = 0) {
  const audio = ensureAudio();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playSfx(name) {
  if (!soundEnabled) return;
  const patterns = {
    attack: [[210, 0.07, "square", 0.035, 0], [150, 0.08, "square", 0.025, 0.05]],
    miss: [[120, 0.06, "triangle", 0.018, 0]],
    hit: [[95, 0.06, "sawtooth", 0.024, 0]],
    hurt: [[82, 0.14, "sawtooth", 0.045, 0]],
    move: [[360, 0.07, "triangle", 0.025, 0], [520, 0.1, "triangle", 0.02, 0.05]],
    pickup: [[520, 0.07, "square", 0.02, 0], [700, 0.09, "square", 0.02, 0.06]],
    gear: [[330, 0.08, "triangle", 0.025, 0], [495, 0.12, "triangle", 0.028, 0.07]],
    item: [[440, 0.08, "sine", 0.03, 0], [660, 0.12, "sine", 0.025, 0.06]],
    material: [[420, 0.08, "triangle", 0.025, 0], [620, 0.08, "triangle", 0.025, 0.07], [840, 0.14, "sine", 0.03, 0.14]],
    warning: [[170, 0.12, "square", 0.03, 0], [170, 0.12, "square", 0.03, 0.16]],
    karma: [[180, 0.18, "sawtooth", 0.04, 0], [115, 0.26, "sawtooth", 0.045, 0.14]],
    rescue: [[440, 0.1, "triangle", 0.025, 0], [660, 0.1, "triangle", 0.028, 0.08], [880, 0.18, "sine", 0.03, 0.16]],
    level: [[392, 0.08, "square", 0.025, 0], [523, 0.08, "square", 0.025, 0.08], [784, 0.2, "triangle", 0.03, 0.16]],
    stairs: [[260, 0.1, "triangle", 0.025, 0], [390, 0.12, "triangle", 0.025, 0.08]],
    depart: [[294, 0.1, "triangle", 0.025, 0], [440, 0.16, "triangle", 0.03, 0.1]],
    upgrade: [[440, 0.08, "square", 0.02, 0], [554, 0.08, "square", 0.02, 0.07], [659, 0.15, "square", 0.025, 0.14]],
    evolve: [[220, 0.18, "triangle", 0.03, 0], [330, 0.18, "triangle", 0.03, 0.12], [494, 0.22, "triangle", 0.035, 0.24], [740, 0.38, "sine", 0.04, 0.38]],
    victory: [[392, 0.14, "square", 0.025, 0], [523, 0.14, "square", 0.025, 0.12], [659, 0.14, "square", 0.025, 0.24], [784, 0.32, "triangle", 0.035, 0.36]],
  };
  for (const tone of patterns[name] || []) playTone(...tone);
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  try {
    localStorage.setItem(SOUND_KEY, soundEnabled ? "on" : "off");
  } catch {
    // Private browsing can disable storage.
  }
  updateSoundButton();
  if (soundEnabled) playSfx("pickup");
}

function updateSoundButton() {
  if (!ui.soundButton) return;
  ui.soundButton.classList.toggle("muted", !soundEnabled);
  ui.soundButton.title = soundEnabled ? "音を消す" : "音を出す";
  ui.soundButton.setAttribute("aria-label", ui.soundButton.title);
}

function saveBestScore() {
  if (!game || game.score <= bestScore) return;
  bestScore = game.score;
  try {
    localStorage.setItem(STORAGE_KEY, String(bestScore));
  } catch {
    // Private browsing can disable storage.
  }
}

function saveSlotKey(slot) {
  return `${SAVE_KEY}:${slot}`;
}

function readSaveSlot(slot) {
  try {
    const value = localStorage.getItem(saveSlotKey(slot));
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function serializeGame() {
  return {
    version: 8,
    savedAt: new Date().toISOString(),
    completedDungeon: game.completedDungeon,
    highestFloor: game.highestFloor,
    persistentEvolutionKey: game.persistentEvolutionKey,
    persistentEvolutionStage: game.persistentEvolutionStage,
    towerCheckpoint: game.towerCheckpoint ? structuredClone(game.towerCheckpoint) : null,
    startingRelicKey: game.startingRelicKey,
    unlockedAscensions: [...game.unlockedAscensions],
    persistentLineages: structuredClone(game.persistentLineages),
    coins: game.coins,
    rescuePoints: game.rescuePoints,
    storage: { ...game.storage },
    bag: { ...game.bag },
    selectedTownMission: game.selectedTownMission,
    selectedCharacter: game.selectedCharacter,
    bagCapacity: game.bagCapacity,
    karma: game.karma,
    seenEnemyKeys: [...(game.seenEnemyKeys || [])],
    defeatedEnemyKeys: [...(game.defeatedEnemyKeys || [])],
    lastRunSummary: game.lastRunSummary ? structuredClone(game.lastRunSummary) : null,
  };
}

function saveCurrentGame(silent = false) {
  if (!game?.saveSlot) {
    if (!silent) openSaveDialog(false);
    return false;
  }
  if (game.mode !== "town" && !silent) {
    showToast("セーブは町で行える");
    return false;
  }
  try {
    localStorage.setItem(saveSlotKey(game.saveSlot), JSON.stringify(serializeGame()));
    if (!silent) {
      showToast("冒険を記録した");
      renderSaveSlots(false);
    }
    return true;
  } catch {
    if (!silent) showToast("セーブに失敗した");
    return false;
  }
}

function loadSaveSlot(slot) {
  const saved = readSaveSlot(slot);
  if (!saved) return false;
  const saveVersion = Number(saved.version) || 0;
  game.saveSlot = slot;
  game.completedDungeon = saveVersion >= 6
    ? clamp(Number(saved.completedDungeon ?? saved.completedChapter) || 0, 0, 1)
    : 0;
  game.highestFloor = clamp(
    Number(saved.highestFloor) || (saveVersion >= 6 && game.completedDungeon ? 100 : 1),
    1,
    100,
  );
  const savedEvolution = evolutionCatalog.find((entry) => entry.key === saved.persistentEvolutionKey);
  game.persistentEvolutionKey = savedEvolution?.key || "base";
  game.persistentEvolutionStage = savedEvolution?.stage || 0;
  game.towerCheckpoint = saved.towerCheckpoint && Number(saved.towerCheckpoint.floor) >= 1
    ? structuredClone(saved.towerCheckpoint)
    : null;
  game.startingRelicKey = relicCatalog.some((entry) => entry.key === saved.startingRelicKey)
    ? saved.startingRelicKey
    : null;
  game.unlockedAscensions = Array.isArray(saved.unlockedAscensions) ? [...saved.unlockedAscensions] : [];
  game.persistentLineages = saved.persistentLineages && typeof saved.persistentLineages === "object"
    ? structuredClone(saved.persistentLineages)
    : {};
  game.coins = Math.max(0, Number(saved.coins) || 0);
  game.rescuePoints = Math.max(0, Number(saved.rescuePoints) || 0);
  game.storage = { ...game.storage, ...(saved.storage || {}) };
  game.bag = { ...game.bag, ...(saved.bag || {}) };
  game.evolutionBag = {
    ...Object.fromEntries(evolutionMaterialKeys.map((key) => [key, 0])),
    ...(game.towerCheckpoint?.evolutionBag || {}),
  };
  for (const kind of evolutionMaterialKeys) {
    delete game.bag[kind];
  }
  game.bagCapacity = clamp(Number(saved.bagCapacity) || BASE_BAG_CAPACITY, BASE_BAG_CAPACITY, MAX_BAG_CAPACITY);
  game.karma = Math.max(0, Number(saved.karma) || 0);
  game.seenEnemyKeys = Array.isArray(saved.seenEnemyKeys) ? [...saved.seenEnemyKeys] : [];
  game.defeatedEnemyKeys = Array.isArray(saved.defeatedEnemyKeys) ? [...saved.defeatedEnemyKeys] : [];
  game.lastRunSummary = saved.lastRunSummary && typeof saved.lastRunSummary === "object"
    ? structuredClone(saved.lastRunSummary)
    : null;
  game.skillPoints = 1;
  game.statPoints = Math.max(0, Number(game.towerCheckpoint?.statPoints) || 0);
  game.unlockedSkills = [];
  game.runStats = createRunStats();
  game.gearBag = [];
  game.equipment = { weapon: null, armor: null, charm: null };
  game.gearViewSlot = "weapon";
  game.shopView = "goods";
  game.forgeSelection = [];
  const selectedKey = game.roster[saved.selectedCharacter] ? saved.selectedCharacter : "kohaku";
  game.selectedCharacter = selectedKey;
  const leader = createLeader(selectedKey);
  applyPersistentLineage(leader);
  game.roster[selectedKey] = leader;
  game.team = [leader];
  game.relics = [];
  if (game.startingRelicKey && !game.towerCheckpoint) addRelic(game.startingRelicKey, false);
  game.selectedTownMission = 0;
  game.mode = "town";
  game.gameOver = false;
  game.victory = false;
  ui.endOverlay.hidden = true;
  updateAll();
  if ((saved.version || 0) < 8) saveCurrentGame(true);
  return true;
}

function openSaveDialog(initial = false) {
  if (!initial && game.mode !== "town") {
    showToast("セーブは町で行える");
    return;
  }
  ui.saveDialog.dataset.initial = initial ? "true" : "false";
  ui.saveDialogClose.hidden = initial;
  ui.saveDialogNote.textContent = initial
    ? "冒険の記録は1つに保存されます。"
    : "現在の町と休憩所の記録を保存します。";
  renderSaveSlots(initial);
  if (!ui.saveDialog.open) ui.saveDialog.showModal();
}

function renderSaveSlots(initial = ui.saveDialog.dataset.initial === "true") {
  ui.saveSlotList.innerHTML = "";
  for (let slot = 1; slot <= SAVE_SLOT_COUNT; slot += 1) {
    const saved = readSaveSlot(slot);
    const active = game.saveSlot === slot;
    const entry = document.createElement("article");
    entry.className = `save-slot ${active ? "active" : ""}`;
    const date = saved?.savedAt
      ? new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }).format(new Date(saved.savedAt))
      : "";
    const leaderProfile = characterCatalog.find((profile) => profile.key === saved?.selectedCharacter);
    const savedVersion = Number(saved?.version) || 0;
    const highestFloor = clamp(
      Number(saved?.highestFloor) || (savedVersion >= 6 && (saved?.completedDungeon || saved?.completedChapter) ? 100 : 1),
      1,
      100,
    );
    const evolution = evolutionCatalog.find((entry) => entry.key === saved?.persistentEvolutionKey);
    const progressName = highestFloor >= 100 ? "百階踏破" : `最高 B${highestFloor}F`;
    entry.innerHTML = `
      <span class="save-slot-number">${slot}</span>
      <div class="save-slot-copy">
        <strong>${saved ? `${progressName} / ${leaderProfile?.name || "コハク"}` : "新しい冒険"}</strong>
        <span>${saved ? `${evolution?.name || leaderProfile?.name || "コハク"}　${saved.coins || 0}星貨　探索pt ${saved.rescuePoints || 0}` : "まだ記録はありません"}</span>
        <small>${saved ? `${date}${active ? "　使用中" : ""}` : "この枠で迷宮攻略を始める"}</small>
      </div>
    `;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = initial
      ? saved ? "続きから" : "ここで始める"
      : active ? "上書き保存" : saved ? "この記録で遊ぶ" : "新しく始める";
    button.addEventListener("click", () => {
      if (!initial && active) {
        saveCurrentGame(false);
        return;
      }
      if (saved) {
        loadSaveSlot(slot);
      } else {
        startFreshGame(slot);
      }
      ui.saveDialog.close();
      showToast(saved ? `セーブ${slot}を読み込んだ` : `セーブ${slot}で冒険を始める`);
    });
    entry.appendChild(button);
    if (saved) {
      const freshButton = document.createElement("button");
      freshButton.type = "button";
      freshButton.className = "save-slot-reset";
      freshButton.textContent = "ニューゲーム";
      freshButton.addEventListener("click", () => {
        const confirmed = window.confirm("この記録を消して、進化データも含めて最初から始めますか？");
        if (!confirmed) return;
        startFreshGame(slot);
        ui.saveDialog.close();
        showToast("ニューゲームを開始した");
      });
      entry.appendChild(freshButton);
    }
    ui.saveSlotList.appendChild(entry);
  }
}

function handleKey(event) {
  const activeTag = document.activeElement?.tagName;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) return;
  const key = event.key.toLowerCase();
  const code = event.code;

  if (pendingControlAction) {
    if (["shift", "control", "alt", "meta"].includes(key)) return;
    event.preventDefault();
    if (key === "escape") {
      pendingControlAction = null;
      renderGameMenu("controls");
      return;
    }
    const target = controlActionCatalog.find((entry) => entry.key === pendingControlAction);
    setControlBinding(pendingControlAction, normalizeControlKeyFromEvent(event));
    pendingControlAction = null;
    renderGameMenu("controls");
    showToast(`${target?.label || "操作"}を${controlKeyLabel(normalizeControlKeyFromEvent(event))}に設定`);
    return;
  }

  if (
    ui.townDialog.open
    || ui.helpDialog.open
    || ui.saveDialog.open
    || ui.stairsDialog.open
    || ui.restDialog.open
    || ui.levelDialog.open
    || ui.gameMenuDialog.open
  ) return;
  const boundActionKey = controlActionKeyForEvent(event);
  const boundAction = boundActionKey ? actionFromControlActionKey(boundActionKey) : null;

  if (game.mode === "town") {
    if (["enter", "f", " ", "e"].includes(key)) {
      if (event.repeat) return;
      event.preventDefault();
      openExpeditionLoadout();
      return;
    }
    if (key === "c" || boundAction?.type === "openMenu" || boundAction?.type === "openMoves") {
      if (event.repeat) return;
      event.preventDefault();
      openGameMenu("controls");
    }
    return;
  }

  if (boundAction?.type === "openMoves") {
    if (event.repeat) return;
    event.preventDefault();
    toggleGameMenu("moves");
    return;
  }
  if (boundAction?.type === "ground") {
    if (event.repeat) return;
    event.preventDefault();
    toggleGameMenu("ground");
    return;
  }
  if (boundAction?.type === "openMenu") {
    if (event.repeat) return;
    event.preventDefault();
    toggleGameMenu("moves");
    return;
  }
  if (ui.gameMenuDialog.open || game.mode !== "dungeon") return;

  const fallbackActions = {
    arrowup: { type: "move", dx: 0, dy: -1 },
    arrowleft: { type: "move", dx: -1, dy: 0 },
    arrowdown: { type: "move", dx: 0, dy: 1 },
    arrowright: { type: "move", dx: 1, dy: 0 },
    home: { type: "move", dx: -1, dy: -1 },
    pageup: { type: "move", dx: 1, dy: -1 },
    end: { type: "move", dx: -1, dy: 1 },
    pagedown: { type: "move", dx: 1, dy: 1 },
    ".": { type: "wait" },
  };

  const numpadActions = {
    Numpad8: { type: "move", dx: 0, dy: -1 },
    Numpad9: { type: "move", dx: 1, dy: -1 },
    Numpad6: { type: "move", dx: 1, dy: 0 },
    Numpad3: { type: "move", dx: 1, dy: 1 },
    Numpad2: { type: "move", dx: 0, dy: 1 },
    Numpad1: { type: "move", dx: -1, dy: 1 },
    Numpad4: { type: "move", dx: -1, dy: 0 },
    Numpad7: { type: "move", dx: -1, dy: -1 },
    Numpad5: { type: "wait" },
  };

  if (/^[1-4]$/.test(key) && !code.startsWith("Numpad") && !boundAction) {
    if (event.repeat) return;
    event.preventDefault();
    performAction({ type: "selectMove", index: Number(key) - 1 });
    return;
  }

  const action = boundAction || numpadActions[code] || fallbackActions[key];
  if (!action) return;
  if (event.repeat && action.type !== "move") return;
  event.preventDefault();
  if (action.type === "move" && event.shiftKey) {
    clearPointerAim();
    performAction({ ...action, type: "face" });
    renderTargetHud(null);
    return;
  }
  if (action.type === "move") {
    const now = performance.now();
    if (now < game.nextMoveAt) return;
    game.nextMoveAt = now + 125;
  }
  clearPointerAim();
  performAction(action);
  renderTargetHud(null);
}

function getTouchDpadDirection(event, pad) {
  const rect = pad.getBoundingClientRect();
  const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  const absX = Math.abs(normalizedX);
  const absY = Math.abs(normalizedY);
  if (Math.hypot(normalizedX, normalizedY) < 0.24) return null;
  return {
    x: absX >= absY * 0.42 ? Math.sign(normalizedX) : 0,
    y: absY >= absX * 0.42 ? Math.sign(normalizedY) : 0,
  };
}

function performTouchMove() {
  if (!touchMoveDirection || ui.levelDialog.open) return;
  performAction({ type: "move", dx: touchMoveDirection.x, dy: touchMoveDirection.y });
  window.clearTimeout(touchMoveTimer);
  touchMoveTimer = window.setTimeout(performTouchMove, touchDashHeld ? 92 : 158);
}

function stopTouchMove(pad) {
  touchMovePointer = null;
  touchMoveDirection = null;
  window.clearTimeout(touchMoveTimer);
  touchMoveTimer = null;
  pad.classList.remove("pressed");
}

function bindTouchController() {
  const pad = document.querySelector("[data-dpad]");
  const dashButton = document.querySelector("#touchDashButton");
  if (!pad || !dashButton) return;

  pad.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".dpad-center")) return;
    event.preventDefault();
    touchMovePointer = event.pointerId;
    pad.setPointerCapture(event.pointerId);
    touchMoveDirection = getTouchDpadDirection(event, pad);
    pad.classList.add("pressed");
    performTouchMove();
  });
  pad.addEventListener("pointermove", (event) => {
    if (event.pointerId !== touchMovePointer) return;
    event.preventDefault();
    const next = getTouchDpadDirection(event, pad);
    const changed = next?.x !== touchMoveDirection?.x || next?.y !== touchMoveDirection?.y;
    touchMoveDirection = next;
    if (changed && next) performTouchMove();
  });
  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    pad.addEventListener(eventName, () => stopTouchMove(pad));
  }

  const releaseDash = () => {
    touchDashHeld = false;
    dashButton.classList.remove("pressed");
  };
  dashButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    touchDashHeld = true;
    dashButton.classList.add("pressed");
    dashButton.setPointerCapture(event.pointerId);
  });
  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    dashButton.addEventListener(eventName, releaseDash);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopTouchMove(pad);
      releaseDash();
    }
  });
}

function bindEvents() {
  document.addEventListener("keydown", handleKey);
  ui.soundButton.addEventListener("click", toggleSound);
  ui.restartButton.addEventListener("click", () => {
    if (game.mode === "dungeon") returnToTown();
    else openTownFacility("board");
  });
  ui.endRestartButton.addEventListener("click", () => {
    ui.endOverlay.hidden = true;
    returnToTown();
    queueLoadoutPrompt(160);
  });
  ui.helpButton.addEventListener("click", () => ui.helpDialog.showModal());
  ui.saveButton.addEventListener("click", () => saveCurrentGame(false));
  ui.saveDialog.addEventListener("cancel", (event) => {
    if (!game.saveSlot) event.preventDefault();
  });
  ui.stairsStayButton.addEventListener("click", stayOnCurrentFloor);
  ui.stairsProceedButton.addEventListener("click", proceedThroughStairs);
  ui.stairsDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    stayOnCurrentFloor();
  });
  ui.restDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
  });
  ui.levelLaterButton.addEventListener("click", () => closeLevelUpDialog(false));
  ui.levelSpendButton.addEventListener("click", () => closeLevelUpDialog(true));
  ui.levelDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeLevelUpDialog(false);
  });
  ui.gameMenuButton.addEventListener("click", () => toggleGameMenu("moves"));
  ui.departButton.addEventListener("click", openExpeditionLoadout);
  canvas.addEventListener("mousemove", (event) => {
    if (game.mode !== "dungeon") return;
    const aim = aimFromPointer(event);
    game.aimDirection = { x: aim.x, y: aim.y };
    game.aimTile = { x: aim.tileX, y: aim.tileY };
    renderTargetHud(game.aimTile);
  });
  canvas.addEventListener("mouseleave", () => {
    game.aimDirection = null;
    game.aimTile = null;
    renderTargetHud(null);
  });
  canvas.addEventListener("click", (event) => {
    if (event.button !== 0 || game.mode !== "dungeon") return;
    if (ui.gameMenuDialog.open || ui.helpDialog.open || ui.townDialog.open || ui.saveDialog.open || ui.stairsDialog.open || ui.restDialog.open || ui.levelDialog.open) return;
    const aim = aimFromPointer(event);
    game.aimDirection = { x: aim.x, y: aim.y };
    game.aimTile = { x: aim.tileX, y: aim.tileY };
    performAction({ type: "basicAttack", dx: aim.x, dy: aim.y, targetX: aim.tileX, targetY: aim.tileY });
  });
  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    if (game.mode !== "dungeon") return;
    if (ui.gameMenuDialog.open || ui.helpDialog.open || ui.townDialog.open || ui.saveDialog.open || ui.stairsDialog.open || ui.restDialog.open || ui.levelDialog.open) return;
    const aim = aimFromPointer(event);
    const direction = { x: aim.x, y: aim.y };
    game.aimDirection = direction;
    game.aimTile = { x: aim.tileX, y: aim.tileY };
    const leader = getLeader();
    leader.dx = direction.x;
    leader.dy = direction.y;
    performAction({ type: "useMove" });
  });

  document.querySelectorAll("[data-menu-view]").forEach((button) => {
    button.addEventListener("click", () => renderGameMenu(button.dataset.menuView));
  });

  document.querySelectorAll("[data-town-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.townAction === "depart") {
        openExpeditionLoadout();
        return;
      }
      if (button.dataset.townAction === "controls") {
        openGameMenu("controls");
        return;
      }
      openTownFacility(button.dataset.townAction);
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = {
        type: button.dataset.action,
        dx: Number(button.dataset.dx || 0),
        dy: Number(button.dataset.dy || 0),
      };
      performAction(action);
    });
  });
  bindTouchController();
}

bindEvents();
createGame();
loadFoxboundSpriteManifest();
loadFoxboundMoveDesigns();
if (!loadSaveSlot(1)) saveCurrentGame(true);
updateSoundButton();
queueLoadoutPrompt(180);
spriteSheet.addEventListener("load", () => {
  if (game) updateAll();
});
mapTokenSheet.addEventListener("load", () => {
  prepareMapTokenAtlas();
  if (game) updateAll();
});
document.addEventListener("visibilitychange", () => {
  lastCanvasDrawTime = 0;
  if (!document.hidden) miniMapRenderKey = "";
});
requestAnimationFrame(draw);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // The game remains playable online if offline support is unavailable.
    });
  });
}
