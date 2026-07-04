const TILE = 48;
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
const SAVE_SLOT_COUNT = 1;
const SPRITE_TILE = 16;
const SPRITE_MARGIN = 1;
const SPRITE_COLS = 56;

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const entityBuffer = document.createElement("canvas");
entityBuffer.width = TILE;
entityBuffer.height = TILE;
const entityBufferCtx = entityBuffer.getContext("2d");
const entityTint = document.createElement("canvas");
entityTint.width = TILE;
entityTint.height = TILE;
const entityTintCtx = entityTint.getContext("2d");
const miniCanvas = document.querySelector("#miniMap");
const miniCtx = miniCanvas.getContext("2d");
const townCanvas = document.querySelector("#townCanvas");
const townCtx = townCanvas.getContext("2d");
const townBackdrop = new Image();
townBackdrop.src = "assets/town/foxbound-spire-hub-v1.jpg?v=pwa11";
const spriteSheet = new Image();
spriteSheet.src = "assets/kenney-roguelike-rpg-pack/Spritesheet/roguelikeSheet_transparent.png";
const mapTokenSheet = new Image();
mapTokenSheet.src = "assets/tokens/foxbound-characters-v3.png?v=pwa11";
const mapTokenCanvas = document.createElement("canvas");
const mapTokenCtx = mapTokenCanvas.getContext("2d", { willReadFrequently: true });
let mapTokenReady = false;
const itemIconSheet = new Image();
itemIconSheet.src = "assets/tokens/foxbound-items-v2.png?v=pwa11";
const relicIconSheet = new Image();
relicIconSheet.src = "assets/tokens/foxbound-relics-v1.jpg?v=pwa11";
const enemyArtSheets = Array.from({ length: 4 }, (_, index) => {
  const sheet = new Image();
  sheet.src = `assets/tokens/foxbound-enemies-${index + 1}-v1.png?v=pwa11`;
  return sheet;
});
const townFacilities = [
  { key: "characters", name: "継承の鏡", detail: "探索者と進化を選ぶ", x: 286, y: 340, radius: 70, color: "#9de6ed" },
  { key: "board", name: "塔の経路板", detail: "門番と休憩所を確認", x: 446, y: 350, radius: 64, color: "#efc867" },
  { key: "guild", name: "星見観測院", detail: "遠征記録を見る", x: 910, y: 312, radius: 72, color: "#9dcc7c" },
  { key: "storage", name: "風見倉庫", detail: "道具を預ける", x: 224, y: 566, radius: 72, color: "#76cdd4" },
  { key: "shop", name: "星の商店", detail: "道具とレリックを整える", x: 930, y: 566, radius: 72, color: "#ef8b70" },
  { key: "depart", name: "星喰い塔 出発門", detail: "探索者と初期レリックを選んで出発", x: 576, y: 616, radius: 72, color: "#f0c862" },
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
  ice: { name: "氷", symbol: "氷", color: "#8bdff2", accent: "#e8fbff", special: true },
  poison: { name: "毒", symbol: "毒", color: "#a6c943", accent: "#efffb5", special: true },
};

const elementAdvantages = {
  fire: ["wood", "ice"],
  water: ["fire"],
  wood: ["water"],
  light: ["dark"],
  dark: ["light"],
  ice: ["water", "wood"],
  poison: ["water", "wood"],
};

const elementResistances = {
  fire: ["water"],
  water: ["wood"],
  wood: ["fire", "ice", "poison"],
  light: ["poison"],
  ice: ["fire", "ice"],
  poison: ["light", "poison"],
};

function elementInfo(key) {
  return elementCatalog[key] || elementCatalog.light;
}

function elementEffectiveness(attackKey, defenseKey) {
  if (!attackKey || !defenseKey) return 1;
  if (elementAdvantages[attackKey]?.includes(defenseKey)) return 1.35;
  if (elementResistances[attackKey]?.includes(defenseKey)) return 0.75;
  return 1;
}

function elementBadgeMarkup(key) {
  const element = elementInfo(key);
  return `<i class="element-badge" style="--element-color:${element.color}">${element.symbol}</i>`;
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
  { key: "arcBolt", name: "アストラル弾", hint: "前方6マス・貫通", maxPp: 13, style: "magic", element: "ice" },
  { key: "blinkHex", name: "転位呪", hint: "前方へ瞬間移動", maxPp: 7, style: "magic", element: "dark" },
  { key: "mirrorCurse", name: "鏡界の呪詛", hint: "周囲・敵を弱体化", maxPp: 6, style: "magic", element: "poison" },
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
  { key: "zeroFragment", name: "零星の欠片", icon: "零", rarity: "BOSS", color: "#ffdd83", detail: "全能力 +2。最深部へ近づくほどさらに輝く。", bonus: { atk: 2, magic: 2, def: 2, res: 2 } },
];

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

const specialEnemyElements = {
  toxicMushroom: "poison",
  toxicToad: "poison",
  acidOoze: "poison",
  toxicSnail: "poison",
  iceSpider: "ice",
  frostTurtle: "ice",
  frostOwl: "ice",
  crystalCrab: "ice",
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
    color: "#e9bd58", accent: "#fff3ae", elementKey: "light", rare: true, artIndex: 7,
  },
  {
    key: "rare-rainbow", name: "虹羽フェニクス", friendName: "ニジハ", minDungeon: 2,
    hp: 38, atk: 12, def: 3, exp: 155, recruit: 0.0035, sprite: 800,
    color: "#ef7b72", accent: "#9de9df", elementKey: "fire", rare: true, artIndex: 27,
  },
  {
    key: "rare-moonwhite", name: "月白ユニコーン", friendName: "ハクギン", minDungeon: 3,
    hp: 46, atk: 14, def: 5, exp: 210, recruit: 0.003, sprite: 690,
    color: "#d9d4f2", accent: "#fffbd6", elementKey: "ice", rare: true, artIndex: 36,
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
  { name: "苔冠ゴルム", title: "九階の門番", sprite: 690, color: "#76a85d", accent: "#e6f4ad", hp: 92, atk: 10, def: 3, exp: 140, special: "岩星崩し" },
  { name: "幻灯ミラージュ", title: "十九階の門番", sprite: 744, color: "#8d73d4", accent: "#f0e2ff", hp: 142, atk: 15, def: 4, exp: 230, special: "幻星波" },
  { name: "炎角グレンガ", title: "二十九階の門番", sprite: 856, color: "#e56651", accent: "#ffd09b", hp: 205, atk: 20, def: 6, exp: 340, special: "灼星突進" },
  { name: "氷鏡セレネ", title: "三十九階の門番", sprite: 801, color: "#69bfe4", accent: "#e8fbff", hp: 270, atk: 25, def: 7, exp: 470, special: "凍星鏡" },
  { name: "変異王ヴェルド", title: "四十九階の門番", sprite: 857, color: "#4fd1b4", accent: "#d8fff6", hp: 355, atk: 31, def: 9, exp: 620, special: "変異連鎖" },
  { name: "灰都機神ガルド", title: "五十九階の門番", sprite: 602, color: "#b87965", accent: "#f5d5b8", hp: 450, atk: 37, def: 11, exp: 800, special: "機星砲" },
  { name: "月蝕ノクティス", title: "六十九階の門番", sprite: 556, color: "#925bc7", accent: "#eed6ff", hp: 565, atk: 44, def: 13, exp: 1010, special: "月蝕断" },
  { name: "天嵐ヴァルグ", title: "七十九階の門番", sprite: 800, color: "#52afe8", accent: "#e2f7ff", hp: 700, atk: 51, def: 15, exp: 1280, special: "天星嵐" },
  { name: "冥晶アビサル", title: "八十九階の門番", sprite: 857, color: "#5f3a91", accent: "#e9c9ff", hp: 870, atk: 59, def: 18, exp: 1600, special: "冥晶界" },
  { name: "星喰皇ゼロム", title: "九十九階の最後の門番", sprite: 857, color: "#d34bc2", accent: "#fff0ff", hp: 1120, atk: 68, def: 21, exp: 2400, special: "終星落とし" },
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

let bestScore = readBestScore();
let game;
let audioContext = null;
let soundEnabled = readSoundSetting();
let touchMovePointer = null;
let touchMoveDirection = null;
let touchMoveTimer = null;
let touchDashHeld = false;
let renderCamera = { x: 0, y: 0, width: canvas.width / TILE, height: canvas.height / TILE };

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
    unlockedSkills: [],
    relics: [],
    startingRelicKey: null,
    unlockedAscensions: [],
    persistentLineages: {},
    secondMoonUsed: false,
    lastActionStyle: null,
    currentActionMultiplier: 1,
    currentActionElement: null,
    pendingRelicChoices: [],
    pendingMoveChoices: [],
    pendingMovePicks: 0,
    pendingAscensionChoices: [],
    milestoneSource: null,
    rewardPending: false,
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

function openExpeditionLoadout() {
  game.townView = "loadout";
  game.loadoutStep = game.towerCheckpoint ? "checkpoint" : "character";
  ui.townDialog.dataset.view = "loadout";
  renderExpeditionLoadout();
  if (!ui.townDialog.open) ui.townDialog.showModal();
}

function renderExpeditionLoadout() {
  const starterKeys = ["ironFang", "moonLens", "shellSeed", "heartMeteor"];
  const profile = characterCatalog.find((entry) => entry.key === game.selectedCharacter) || characterCatalog[0];
  const selectedActor = createLeader(profile.key);
  applyPersistentLineage(selectedActor);
  const checkpoint = game.towerCheckpoint;

  if (checkpoint) {
    ui.townDialogTitle.textContent = "遠征を再開";
    ui.townDialogBody.innerHTML = `
      <section class="loadout-checkpoint" style="--hero-color:${profile.color}">
        <canvas class="loadout-checkpoint-portrait" width="220" height="220" aria-hidden="true"></canvas>
        <div>
          <span>B${checkpoint.floor}F CHECKPOINT</span>
          <strong>${selectedActor.name}の遠征記録</strong>
          <small>探索者・進化・レリック・所持品は、休憩所で記録した状態から再開します。</small>
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
  ui.townDialogTitle.textContent = characterStep ? "探索者を選ぶ" : "初期レリックを選ぶ";
  if (characterStep) {
    ui.townDialogBody.innerHTML = `
      <div class="loadout-stage-head">
        <div class="loadout-step-track" aria-label="遠征準備">
          <b class="active">1</b><span>探索者</span><i></i><b>2</b><span>レリック</span>
        </div>
        <strong>この挑戦の主人公を選ぶ</strong>
        <small>三人は初期能力・技・進化分岐が異なります。グラフで得意分野を比べられます。</small>
      </div>
      <div class="loadout-character-grid loadout-character-stage"></div>
      <div class="loadout-actions">
        <span>${elementLegendMarkup()}</span>
        <button type="button" class="primary-button loadout-next">レリック選択へ</button>
      </div>
    `;
    const characterGrid = ui.townDialogBody.querySelector(".loadout-character-grid");
    characterCatalog.forEach((entry, index) => {
      const selected = entry.key === game.selectedCharacter;
      const actor = createLeader(entry.key);
      applyPersistentLineage(actor);
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
    return;
  }

  ui.townDialogBody.innerHTML = `
    <div class="loadout-stage-head">
      <div class="loadout-step-track" aria-label="遠征準備">
        <b>1</b><span>探索者</span><i></i><b class="active">2</b><span>レリック</span>
      </div>
      <strong>最初の運命をひとつ選ぶ</strong>
      <small>初期レリックは序盤の戦い方を決めます。あえて持たずに出ると、無印進化が解放されます。</small>
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
}

function prepareNewTry() {
  const leader = createLeader(game.selectedCharacter);
  applyPersistentLineage(leader);
  game.roster[game.selectedCharacter] = leader;
  game.team = [leader];
  game.selectedMove = 0;
  game.skillPoints = 1;
  game.unlockedSkills = [];
  game.relics = [];
  game.pendingRelicChoices = [];
  game.pendingMoveChoices = [];
  game.pendingMovePicks = 0;
  game.pendingAscensionChoices = [];
  game.milestoneSource = null;
  game.rewardPending = false;
  game.secondMoonUsed = false;
  game.lastActionStyle = null;
  game.currentActionMultiplier = 1;
  game.currentActionElement = null;
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

function expRequirementForLevel(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return Math.floor(70 * (1.35 ** (safeLevel - 1)) + safeLevel * 20);
}

function lineageElementKey(profileKey, branch, fallback = "light") {
  const branches = {
    kohaku: { fang: "fire", lumen: "light", shade: "dark", ascetic: "light" },
    knight: { warlord: "fire", guardian: "water", revenant: "dark", ascetic: "light" },
    magician: { archmage: "ice", chaos: "poison", void: "dark", ascetic: "light" },
  };
  return branches[profileKey]?.[branch] || fallback;
}

function applyPersistentLineage(actor) {
  const lineage = game?.persistentLineages?.[actor.profileKey];
  if (!lineage || !lineage.stage) return;
  actor.evolutionStage = clamp(Number(lineage.stage) || 0, 0, 10);
  actor.evolutionBranch = lineage.branch || "base";
  actor.evolutionName = lineage.name || actor.name;
  actor.artColumn = Number.isInteger(lineage.artColumn) ? lineage.artColumn : 0;
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
  game.aimDirection = null;
  game.screenFlash = null;
  game.screenShake = null;
  game.guidanceActive = false;
  game.windWarningShown = false;
  game.windDangerShown = false;
  game.stairsRevealed = true;
  game.restChoiceTaken = false;
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
  game.luck = game.floorEvent.luck + (hasSkill("fortune") ? 1 : 0) + (hasRelic("luckyAsh") ? 1 : 0);

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
        detail: "進化か強力なレリックを選ぶ",
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
    addLog(`B${game.floor}F: 休憩所を守る門番 ${bossProfile.name}が現れた。`);
    announceEvent("GATE BOSS", `${bossProfile.title} ${bossProfile.name}`, "冠", "danger");
  } else {
    const trend = floorElementTrend().map((key) => elementInfo(key).name).join("・");
    addLog(`B${game.floor}F: ${game.floorLayoutName}。通常階段を目指そう。この区画は${trend}属性の敵が多い。`);
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
  return weighted([
    { value: { key: "calm", name: "平穏", detail: "大きな変化はない", luck: 0 }, weight: 28 },
    { value: { key: "starwind", name: "星風", detail: "隊のHPが少し回復する", luck: 2, heal: 6 }, weight: 16 },
    { value: { key: "treasure", name: "宝運", detail: "道具が多く、珍品も出やすい", luck: 3, itemBonus: 3, rare: true }, weight: 10 },
    { value: { key: "quiet", name: "静穏", detail: "敵が少なく探索しやすい", luck: 1, enemyBonus: -3 }, weight: 15 },
    { value: { key: "ambush", name: "敵襲", detail: "敵が増えるが獲得経験も高い", luck: -2, enemyBonus: 3, expBonus: 0.25 }, weight: 16 },
    { value: { key: "wandering", name: "ざわめき", detail: "増援が早く現れる", luck: -1, reinforcement: 12 }, weight: 15 },
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
  ];
  const layout = layouts[randInt(0, layouts.length - 1)];
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const map = makeGrid("wall");
    const rooms = [];
    const roomCount = randInt(layout.minRooms, layout.maxRooms);

    for (let i = 0; i < roomCount * 12 && rooms.length < roomCount; i += 1) {
      const w = randInt(layout.minW, layout.maxW);
      const h = randInt(layout.minH, layout.maxH);
      const x = randInt(1, MAP_W - w - 2);
      const y = randInt(1, MAP_H - h - 2);
      const room = { x, y, w, h };
      if (rooms.some((other) => overlaps(room, other, layout.name === "疎らな星屑区画" ? 3 : 2))) continue;
      carveRoom(map, room);
      rooms.push(room);
    }

    if (rooms.length >= layout.minRooms - 1) {
      connectRoomNetwork(map, rooms, layout.loops);
      carveSideBranches(map, rooms, layout.branches);
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

function carveSideBranches(map, rooms, count) {
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
    const length = randInt(3, 7);
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
    4 + Math.floor(game.floor / 4) + (game.floorEvent?.itemBonus || 0) + (hasSkill("salvage") ? 1 : 0),
    4,
    10,
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
  const count = clamp(6 + Math.floor(game.floor / 12) + (game.floorEvent?.enemyBonus || 0), 5, 14);
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
  if (bossFloor || (!forced && game.floor !== 2 && Math.random() > 0.42)) return;
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
    { id: cryptoId(), kind: Math.random() < 0.5 ? "oran" : "elixir", price: 85, sold: false, picked: false },
    { id: cryptoId(), kind: materialKind, price: 145, sold: false, picked: false, material: true },
    { id: cryptoId(), kind: Math.random() < 0.5 ? "reviver" : "fortuneOrb", price: 180 + game.floor * 2, sold: false, picked: false },
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
    .filter((tile) => tile.x !== point.x || tile.y !== point.y)
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
  if (game.floor < 3 || Math.random() > 0.16) return;
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
  const expMultiplier = 1 + (game.floorEvent?.expBonus || 0);
  const mutationChance = clamp(0.005 + game.floor * 0.00018 + Math.max(0, game.luck) * 0.0005, 0.005, 0.025);
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
    attackStyle: mutation?.magic || ["starwater", "moonshade", "skywind"].includes(catalog.typeKey) || ["ice", "poison"].includes(elementKey) ? "magic" : "physical",
    mutation,
    mutated: Boolean(mutation),
    x: point.x,
    y: point.y,
    wobble: Math.random() * Math.PI * 2,
    idleAmplitude: 2.4 + Math.random() * 1.8,
    idleSpeed: 250 + Math.random() * 130,
    alerted,
  };
  return enemy;
}

function spawnBoss(profile, point) {
  const bossIndex = Math.floor(game.floor / 10);
  const bossType = enemyTypes[bossIndex % enemyTypes.length];
  const bossHp = Math.ceil(profile.hp * 1.18);
  const bossArt = [4, 9, 14, 19, 24, 29, 34, 35, 38, 39][Math.min(9, bossIndex)];
  game.enemies.push({
    id: cryptoId(),
    ...profile,
    key: `boss-${game.floor}`,
    familyKey: "boss",
    type: bossType.name,
    typeKey: bossType.key,
    elementKey: bossType.elementKey,
    artIndex: bossArt,
    friendName: profile.name,
    hp: bossHp,
    maxHp: bossHp,
    atk: profile.atk + 2,
    res: profile.def,
    attackStyle: bossIndex % 2 ? "magic" : "physical",
    recruit: 0,
    x: point.x,
    y: point.y,
    wobble: Math.random() * Math.PI * 2,
    idleAmplitude: 4.2,
    idleSpeed: 310,
    alerted: true,
    boss: true,
    specialCooldown: 2,
  });
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
  if (action.type === "move") {
    moveTownPlayer(action.dx, action.dy);
    return;
  }
  if (["basicAttack", "useMove", "wait"].includes(action.type)) interactTownFacility();
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
  if (action.type === "basicAttack") acted = basicAttack(action.dx, action.dy);
  if (action.type === "useMove") acted = useSelectedMove();
  if (action.type === "eatApple") acted = eatApple();
  if (action.type === "useItem") acted = useItem(action.kind);

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

function basicAttack(dx = 0, dy = 0) {
  const leader = getLeader();
  const attackDx = Math.sign(dx || leader.dx);
  const attackDy = Math.sign(dy || leader.dy);
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
  const alternated = hasRelic("prismCore") && previousStyle && previousStyle !== move.style;
  const echoed = move.style === "magic" && hasSkill("spellEcho") && Math.random() < 0.24;
  const freeCast = move.style === "magic" && hasRelic("arcaneVein") && Math.random() < 0.28;
  game.lastActionStyle = move.style;
  game.currentActionMultiplier = (alternated ? 1.35 : 1)
    * (echoed ? 1.55 : 1)
    * (move.style === "physical" && hasSkill("shell") ? 1.12 : 1);
  game.currentActionElement = move.element;
  game.runStats[move.style === "magic" ? "magicUses" : "physicalUses"] += 1;
  announceEvent(
    move.name,
    `【${elementInfo(move.element).name}】${move.hint}　PP ${move.pp - (freeCast ? 0 : 1)}/${move.maxPp}${alternated ? "　七彩共鳴" : ""}${echoed ? "　術式残響" : ""}`,
    elementInfo(move.element).symbol,
    "mystic",
  );
  setScreenFlash(leader.color, 220);
  if (!freeCast) move.pp -= 1;
  game.runStats.techniques += 1;
  gainExp(2 + Math.floor(game.floor / 20));
  if (freeCast) addFloatingText(leader.x, leader.y, "PP 0", "#8ee7ff");
  if (alternated || echoed) {
    addEffect("runes", leader.x, leader.y, alternated ? "#ffe27d" : "#bba4ff");
    triggerScreenShake(alternated ? 7 : 5, 220);
  }
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
  game.currentActionMultiplier = 1;
  game.currentActionElement = null;
  return used;
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

function failFromTowerWind() {
  const leader = getLeader();
  leader.hp = 0;
  leader.down = true;
  game.gameOver = true;
  game.towerCheckpoint = null;
  discardRunInventory();
  saveCurrentGame(true);
  saveBestScore();
  ui.endTitle.textContent = "塔風に弾き出された";
  ui.endText.textContent = `B${game.floor}Fに留まりすぎた。探索中のバッグは失われた。`;
  ui.endRestartButton.textContent = "星見広場へ戻る";
  ui.endOverlay.hidden = false;
  announceEvent("TIME OVER", `同じ階には${FLOOR_WIND_LIMIT}ターンまでしか留まれない`, "風", "danger");
  setScreenFlash("#b48cff", 900);
  triggerScreenShake(20, 700);
  playSfx("karma");
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

    const rangedRange = enemyRangedRange(enemy);
    if (
      rangedRange > 0 &&
      gridDistance(enemy, target) <= rangedRange &&
      isVisible(enemy.x, enemy.y) &&
      hasClearAttackPath(enemy, target)
    ) {
      enemyAttack(enemy, target, true);
      continue;
    }

    if (gridDistance(enemy, target) === 1 && hasClearAttackPath(enemy, target)) {
      startBumpMotion(enemy, Math.sign(target.x - enemy.x), Math.sign(target.y - enemy.y), 0.3, 70);
      enemyAttack(enemy, target);
      continue;
    }

    const aware = enemy.alerted || distance(enemy, target) <= 9 || isVisible(enemy.x, enemy.y);
    if (aware) {
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
      game.enemies.push(createEnemy(catalog, point, true));
      addLog("遠くから敵の気配が近づいてきた。");
    }
  }
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
  const damage = target.guardTurns > 0 ? Math.max(1, Math.ceil(rawDamage / 2)) : rawDamage;
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
  if (target.hp > 0) return;
  if (tryReviveActor(target)) return;
  target.down = true;
  if (target.id === "leader") checkGameOver();
}

function actorStrikeEnemy(actor, enemy, label) {
  actor.dx = Math.sign(enemy.x - actor.x);
  actor.dy = Math.sign(enemy.y - actor.y);
  const focusBonus = actor.id !== "leader" && game.focusTurns > 0 ? 3 : 0;
  const strongHit = actor.id === "leader" && hasSkill("hunter") && Math.random() < 0.18 ? 5 : 0;
  const executeBonus = actor.id === "leader" && hasSkill("execution") && enemy.hp / enemy.maxHp <= 0.4 ? 3 : 0;
  const damage = Math.max(1, actor.atk + focusBonus + strongHit + executeBonus + randInt(-1, 2) - enemy.def);
  if (strongHit) announceEvent("強撃", `${enemy.name}の急所を捉えた`, "狩", "good");
  damageEnemy(enemy, damage, actor, label);
}

function damageEnemy(enemy, amount, source, label) {
  if (!game.enemies.includes(enemy)) return;
  const attackElement = source.id === "leader"
    ? game.currentActionElement || source.elementKey
    : source.elementKey;
  const effectiveness = elementEffectiveness(attackElement, enemy.elementKey);
  amount = Math.max(1, Math.ceil(amount * effectiveness));
  if (enemy.boss && hasRelic("bossClaw")) amount = Math.ceil(amount * 1.25);
  if (enemy.mutated && hasRelic("mutationSeal")) amount = Math.ceil(amount * 1.35);
  if (hasRelic("hungryCrown") && game.belly <= 30) amount += 6;
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
  playSfx("hit");

  if (enemy.hp <= 0) {
    game.enemies = game.enemies.filter((target) => target.id !== enemy.id);
    game.score += enemy.exp;
    game.runStats.kills += 1;
    if (enemy.mutated) game.runStats.mutants += 1;
    addLog(`${label}。${enemy.name}を倒した。+${enemy.exp}pt${effectiveness > 1 ? "（効果抜群）" : ""}`);
    gainExp(enemy.exp);
    if (hasRelic("echoBell")) {
      const move = getLeader().moves[game.selectedMove];
      if (move) move.pp = Math.min(move.maxPp, move.pp + 1);
    }
    if (hasRelic("warDrum") && game.lastActionStyle === "physical") healActor(getLeader(), 5);
    if (enemy.mutation?.volatile && gridDistance(enemy, getLeader()) <= 1) triggerMutationExplosion(enemy);
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
  addLog(`${enemy.name}を撃破。通常階段の封印が解け、進化核が現れた。`);
  announceEvent("BOSS REWARD", `進化核と${100 + game.floor * 4}星貨を獲得`, "冠", "good");
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
  const damage = actor.guardTurns > 0 ? Math.max(1, Math.ceil(rawDamage / 2)) : rawDamage;
  const moveName = enemyMoveName(enemy, ranged);
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
    ice: ranged ? "氷晶弾" : "凍結牙",
    poison: ranged ? "毒泡弾" : "毒蝕爪",
  };
  const baseName = moveNames[enemy.elementKey] || (ranged ? "魔力弾" : "強襲");
  if (!enemy.mutation) return baseName;
  return `${enemy.mutation.name}・${baseName}`;
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
      };
      actor.exp -= actor.nextExp;
      actor.level += 1;
      actor.nextExp = expRequirementForLevel(actor.level);
      actor.maxHp += 4;
      actor.hp = actor.maxHp;
      const magicBuild = actor.id === "leader" && game.runStats.magicUses > game.runStats.physicalUses;
      if (magicBuild) actor.magic += 1;
      else actor.atk += 1;
      if (actor.level % 2 === 0) {
        if (magicBuild) actor.res += 1;
        else actor.def += 1;
      }
      if (actor.id === "leader") game.skillPoints += 1;
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
        });
      }
      addEffect("heal", actor.x, actor.y, actor.color);
      addLog(`${actor.name}はLv.${actor.level}になった。`);
      const bonusText = actor.id === "leader" ? "　スキルポイント +1" : "";
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
  }), { hp: 0, atk: 0, magic: 0, def: 0, res: 0, skillPoints: 0 });
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
  drawPortrait(ui.levelPortrait, leader);
  ui.levelDialog.showModal();
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
  const chance = clamp(0.1 + game.luck * 0.018, 0.04, 0.22);
  if (Math.random() > chance || itemAt(x, y)) return;
  const kind = weighted([
    { value: "oran", weight: 22 },
    { value: "blastSeed", weight: 18 },
    { value: "sleepSeed", weight: 16 },
    { value: "elixir", weight: 14 },
    { value: "apple", weight: 14 },
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
  announceEvent("HIDDEN SANCTUM", "進化か、強力なレリックを選べる", "秘", "mystic");
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
  if (announce) {
    addLog(`レリック「${relic.name}」を獲得。${relic.detail}`);
    announceEvent("RELIC ACQUIRED", `${relic.name}　${relic.detail}`, relic.icon, "good");
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
    addLog("次へ進む前に、休憩所の祭壇で進化かレリックを選ぶ必要がある。");
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
  announceEvent("次の階へ", `B${game.floor}F　${game.floorKind === "boss" ? "門番戦" : game.floorKind.includes("rest") ? "休憩所" : "探索開始"}`, "階", "mystic");
  playSfx("stairs");
  updateAll();
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
  ui.restDialogText.textContent = "祭壇の恩恵は一度だけ。進化を進めるか、この挑戦を変える強力なレリックを選ぼう。倉庫と商店は部屋を歩いて利用できる。";
  const leader = getLeader();
  const choices = [
    {
      key: "milestone-evolution",
      title: leader.evolutionStage >= 10 ? "最終進化済み" : `第${leader.evolutionStage + 1}段階へ進化`,
      detail: leader.evolutionStage >= 10 ? "進化は第10段階で完成している" : "条件で変わる3〜4候補から1つ",
      icon: "進",
      disabled: leader.evolutionStage >= 10,
    },
    { key: "milestone-relic", title: "強力なレリックを得る", detail: "この挑戦だけ働く3候補から1つ", icon: "遺" },
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
      ascensionHistory: [...(leader.ascensionHistory || [])],
      appliedSkills: [...(leader.appliedSkills || [])],
    },
    relics: [...game.relics],
    unlockedSkills: [...game.unlockedSkills],
    skillPoints: game.skillPoints,
    runStats: { ...game.runStats },
    evolutionBag: { ...game.evolutionBag },
    belly: game.belly,
    score: game.score,
    selectedMove: game.selectedMove,
    secondMoonUsed: game.secondMoonUsed,
    lastActionStyle: game.lastActionStyle,
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
}

function checkGameOver() {
  const leader = getLeader();
  if (!leader.down && leader.hp > 0) return;
  game.gameOver = true;
  game.towerCheckpoint = null;
  discardRunInventory();
  saveCurrentGame(true);
  saveBestScore();
  ui.endTitle.textContent = "探索失敗";
  ui.endText.textContent = `B${game.floor}Fで力尽きた。探索中のバッグは失われた。探索pt ${game.score}。`;
  ui.endRestartButton.textContent = "町へ戻る";
  ui.endOverlay.hidden = false;
  updateAll();
}

function updateAll() {
  if (!game) return;
  const rank = currentRank();
  const inTown = game.mode === "town";
  ui.townScreen.hidden = !inTown;
  ui.gameLayout.hidden = inTown;
  ui.touchControls.hidden = false;
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
    const facility = townFocusedFacility();
    ui.townInteraction.hidden = !facility;
    if (facility) {
      ui.townInteractionKey.textContent = window.matchMedia("(pointer: coarse)").matches ? "A" : "F";
      ui.townInteractionName.textContent = facility.name;
      ui.townInteractionDetail.textContent = facility.detail;
      ui.townInteraction.style.setProperty("--facility-color", facility.color);
    }
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
  ui.luck.textContent = `${game.floorEvent?.name || "平穏"} / ${trend}`;
  ui.luck.style.color = game.luck > 0 ? "#9ee88c" : game.luck < 0 ? "#ff9b87" : "";
  ui.mapLeaderDot.style.background = getLeader().color;
  ui.tacticSummary.textContent = `${buildName} / 物${game.runStats.physicalUses} 魔${game.runStats.magicUses}`;
  ui.karma.textContent = buildName;
  ui.karma.style.color = buildName === "物理型" ? "#ff9274" : buildName === "魔法型" ? "#79d7f0" : "#f0cf78";
  renderRelicRibbon();
  renderParty(rank);
  renderMoves();
  renderLog();
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
  ui.moveSummary.textContent = `【${elementInfo(selected.element).name}】${selected.name} ${selected.pp}/${selected.maxPp}`;
  if (ui.gameMenuDialog.open) renderGameMenu(game.menuView);
}

function openGameMenu(view = "moves") {
  if (game.mode !== "dungeon" || game.gameOver || game.victory) return;
  renderGameMenu(view);
  if (!ui.gameMenuDialog.open) ui.gameMenuDialog.showModal();
}

function toggleGameMenu(view = "moves") {
  if (game.mode !== "dungeon") return;
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
        <span class="move-name"><strong>${elementBadgeMarkup(move.element)}${move.name}</strong><span>${elementInfo(move.element).name}属性　${move.hint}</span></span>
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

  if (view === "ascensionReward") {
    renderAscensionReward();
    return;
  }

  if (view === "evolution") {
    renderEvolutionBoard();
    return;
  }

  if (view === "skills") {
    renderSkillBoard();
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
  ui.gameMenuBody.innerHTML = `
    <p class="town-note">10の門番と休憩所を越え、B100Fの星核を目指します。通常階段は床に見えており、隠されているのは罠と星裏の祭壇だけです。</p>
    <div class="menu-stat-grid">
      <div class="menu-stat"><span>現在地</span><strong>B${game.floor}F / B${game.targetFloor}F</strong></div>
      <div class="menu-stat"><span>階の目的</span><strong>${game.mission?.boss && !game.mission.complete ? "門番を倒す" : "通常階段へ進む"}</strong></div>
      <div class="menu-stat"><span>次の門番</span><strong>${nextBoss?.name || "星喰皇ゼロム"}</strong></div>
      <div class="menu-stat"><span>次の休憩</span><strong>B${Math.min(100, Math.ceil((game.floor + 1) / 10) * 10)}F</strong></div>
      <div class="menu-stat"><span>フロア運勢</span><strong>${game.floorEvent?.name || "平穏"}</strong></div>
      <div class="menu-stat"><span>運勢の効果</span><strong>${game.floorEvent?.detail || "-"}</strong></div>
    </div>
  `;
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
      detail: game.secretStairs.used ? "祭壇の力はすでに受け取った。" : "進化か、強力なレリックを追加で選べる。",
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
      <div><span>この挑戦だけの力</span><strong>所持レリック ${game.relics.length}</strong><small>装備枠はありません。獲得した効果はすべて同時に働きます。</small></div>
    </div>
    <div class="relic-grid"></div>
  `;
  const grid = ui.gameMenuBody.querySelector(".relic-grid");
  if (!game.relics.length) {
    grid.innerHTML = '<p class="town-note">まだレリックはありません。休憩所前の門番を倒すと、3つから1つ選べます。</p>';
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
    ui.relicRibbon.innerHTML = '<span class="relic-ribbon-empty">RELICS 0</span>';
    return;
  }
  const visible = game.relics.slice(0, 9);
  ui.relicRibbon.innerHTML = visible.map((key) => {
    const relic = relicCatalog.find((entry) => entry.key === key);
    if (!relic) return "";
    const index = relicCatalog.findIndex((entry) => entry.key === key);
    const column = index % 5;
    const row = Math.floor(index / 5);
    return `<button type="button" title="${relic.name}: ${relic.detail}" aria-label="${relic.name}">
      <i style="--relic-x:${column * 25}%;--relic-y:${row * 33.3333}%"></i>
    </button>`;
  }).join("") + (game.relics.length > visible.length ? `<b>+${game.relics.length - visible.length}</b>` : "");
  ui.relicRibbon.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => openGameMenu("relics"));
  });
}

function renderRelicReward() {
  ui.gameMenuBody.innerHTML = `
    <div class="relic-reward-head">
      <span>門番撃破報酬</span>
      <strong>レリックを1つ選ぶ</strong>
      <small>どれを取るかで、この先の物理・魔法・生存戦略が変わります。</small>
    </div>
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
  const index = Math.max(0, relicCatalog.findIndex((entry) => entry.key === relic.key));
  const column = index % 5;
  const row = Math.floor(index / 5);
  return `<article class="relic-card" style="--relic-color:${relic.color}">
    <i class="relic-art" style="--relic-x:${column * 25}%;--relic-y:${row * 33.3333}%"></i>
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
      <span><strong>${elementBadgeMarkup(move.element)}${move.name}</strong><small>${elementInfo(move.element).name}属性　${move.hint}</small><em>PP ${move.maxPp}</em></span>
    `;
    button.addEventListener("click", () => {
      leader.moves.push({ ...move, pp: move.maxPp });
      game.pendingMovePicks = Math.max(0, game.pendingMovePicks - 1);
      game.pendingMoveChoices = game.pendingMoveChoices.filter((entry) => entry !== key);
      announceEvent("技を習得", `${leader.name}は${move.name}を覚えた`, "技", "good");
      playSfx("level");
      if (game.pendingMovePicks > 0 && game.pendingMoveChoices.length) renderMoveReward();
      else {
        game.pendingMoveChoices = [];
        if (ui.gameMenuDialog.open) ui.gameMenuDialog.close();
      }
      updateAll();
    });
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
      <small>進化は姿と能力を変え、レリックは今回の戦略を大きく曲げます。</small>
    </div>
    <div class="milestone-grid">
      <button type="button" data-milestone="evolve" ${canEvolve ? "" : "disabled"}>
        <b>進</b><span><strong>${canEvolve ? `第${leader.evolutionStage + 1}段階へ進化` : "最終進化済み"}</strong><small>${canEvolve ? "条件で変わる3〜4候補から選ぶ" : "これ以上は進化できない"}</small></span>
      </button>
      <button type="button" data-milestone="relic">
        <b>遺</b><span><strong>強力なレリック</strong><small>RARE以上を含む3候補から1つ</small></span>
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
}

function createAscensionChoices(actor) {
  const profile = characterCatalog.find((entry) => entry.key === actor.profileKey) || characterCatalog[0];
  const stage = clamp((actor.evolutionStage || 0) + 1, 1, 10);
  const choices = (ascensionBranches[profile.key] || ascensionBranches.kohaku).map((branch) => ({
    key: `${profile.key}-${branch.key}-${stage}`,
    branch: branch.key,
    label: branch.label,
    path: branch.path,
    artColumn: branch.artColumn,
    color: branch.color,
    elementKey: lineageElementKey(profile.key, branch.key, profile.elementKey),
    stage,
    name: branch.names[stage - 1],
    detail: ascensionDetail(branch.path),
    bonus: ascensionBonus(branch.path, stage),
  }));
  if (!game.startingRelicKey) {
    choices.push({
      key: `${profile.key}-ascetic-${stage}`,
      branch: "ascetic",
      label: "無印",
      path: "ascetic",
      artColumn: 0,
      color: "#f1d487",
      elementKey: "light",
      stage,
      name: `${asceticNames[stage - 1]}${profile.name}`,
      detail: "初期レリックを持たずに出た者だけの、均衡と幸運の進化。",
      bonus: { hp: 6, atk: 2, magic: 2, def: 1, res: 1, luck: 1 },
      condition: "初期レリックなし",
    });
  } else {
    const relic = relicCatalog.find((entry) => game.relics.includes(entry.key)) || relicCatalog.find((entry) => entry.key === game.startingRelicKey);
    if (relic) {
      const artColumn = relic.bonus?.magic || relic.effect === "freeMagic" ? 2 : relic.bonus?.atk || relic.effect === "physicalLeech" ? 1 : 3;
      choices.push({
        key: `${profile.key}-relic-${relic.key}-${stage}`,
        branch: `relic-${relic.key}`,
        label: "遺物共鳴",
        path: "relic",
        artColumn,
        color: relic.color,
        elementKey: actor.elementKey,
        stage,
        name: `${relic.name}・${stage}環`,
        detail: `${relic.name}を所持している時だけ現れる共鳴進化。`,
        bonus: { hp: 5, atk: 2, magic: 2, def: 1, res: 1 },
        condition: `${relic.name}を所持`,
      });
    }
  }
  return choices.slice(0, 4);
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
    const card = document.createElement("button");
    card.type = "button";
    card.className = "ascension-choice";
    card.style.setProperty("--ascension-color", choice.color);
    card.innerHTML = `
      <canvas width="160" height="160" aria-hidden="true"></canvas>
      <span>${elementBadgeMarkup(choice.elementKey)}${elementInfo(choice.elementKey).name}属性 / ${choice.label} / 第${choice.stage}段階</span>
      <strong>${choice.name}</strong>
      <small>${choice.detail}</small>
      <b>${formatAscensionBonus(choice.bonus)}</b>
      ${choice.condition ? `<em>${choice.condition}</em>` : ""}
    `;
    const preview = { ...leader, evolutionBranch: choice.branch, evolutionStage: choice.stage, artColumn: choice.artColumn };
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

function applyAscensionChoice(choice) {
  const leader = getLeader();
  leader.evolutionStage = choice.stage;
  leader.evolutionBranch = choice.branch;
  leader.evolutionName = choice.name;
  leader.artColumn = choice.artColumn;
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
  if (!game.unlockedAscensions.includes(choice.key)) game.unlockedAscensions.push(choice.key);
  const previousLineage = game.persistentLineages[leader.profileKey] || { bonus: {} };
  game.persistentLineages[leader.profileKey] = {
    stage: leader.evolutionStage,
    branch: leader.evolutionBranch,
    name: leader.evolutionName,
    artColumn: leader.artColumn,
    color: leader.color,
    elementKey: leader.elementKey,
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
  announceEvent("EVOLUTION", `${leader.name}は${choice.name}へ進化した`, "進", "good");
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
    result = `大当たり。${relic?.name || "珍しいレリック"}を得た。`;
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
    <p class="town-note">10階ごと、または隠し階段の祭壇で進化できます。初期レリックなしと、特定レリック所持には専用の候補があります。</p>
    <div class="evolution-preview">${(ascensionBranches[leader.profileKey] || []).map((branch) => `
      <span><b>${elementInfo(lineageElementKey(leader.profileKey, branch.key, leader.elementKey)).name} / ${branch.label}</b>${branch.names[0]} → ${branch.names[9]}</span>
    `).join("")}<span><b>発見済み</b>${game.unlockedAscensions.length}形態</span></div>
  `;
  drawPortrait(ui.gameMenuBody.querySelector(".evolution-head canvas"), leader);
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
    <div class="skill-board-compact"></div>
  `;
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
      <button type="button" data-shop-view="starter" class="${game.shopView === "starter" ? "active" : ""}">初期レリック</button>
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

  content.innerHTML = `<p class="town-note">現在の所持金: ${game.coins}星貨。装備品はなく、拾ったレリックがその挑戦中の能力になります。</p>`;
  const offers = [
    { kind: "apple", price: 35 },
    { kind: "oran", price: 45 },
    { kind: "reviver", price: 120 },
    { kind: "guidingOrb", price: 75 },
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
    <p class="town-note">進化素材は挑戦ごとにリセット。炎・水・木・光・闇と、特殊な氷・毒の相性を読んで100階踏破を目指します。</p>
  `;
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
    `).join("")}<span><b>条件分岐</b>無印進化 / レリック共鳴進化</span></div>`,
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
  if (options.buttonLabel) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = options.buttonLabel;
    button.disabled = Boolean(options.disabled);
    if (options.onClick) button.addEventListener("click", options.onClick);
    entry.appendChild(button);
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

function draw(time = 0) {
  if (!game) {
    requestAnimationFrame(draw);
    return;
  }
  if (game.mode === "town") {
    drawTown(time);
    requestAnimationFrame(draw);
    return;
  }
  renderCamera = getCamera(time);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = currentDungeonTheme().unknown;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const shake = getScreenShakeOffset(time);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawDungeon(time);
  ctx.restore();
  drawMiniMap();
  requestAnimationFrame(draw);
}

function drawTown(time) {
  const width = townCanvas.width;
  const height = townCanvas.height;
  townCtx.fillStyle = "#080d0d";
  townCtx.fillRect(0, 0, width, height);
  if (townBackdrop.complete && townBackdrop.naturalWidth) {
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
  const viewW = Math.floor(canvas.width / TILE);
  const viewH = Math.floor(canvas.height / TILE);
  return {
    x: clamp(visual.x - viewW / 2, 0, Math.max(0, MAP_W - viewW)),
    y: clamp(visual.y - viewH / 2, 0, Math.max(0, MAP_H - viewH)),
    width: viewW,
    height: viewH,
  };
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

function drawUnknownTile(x, y) {
  const { x: px, y: py } = toScreen(x, y);
  ctx.fillStyle = currentDungeonTheme().unknown;
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  if ((x + y) % 2 === 0) ctx.fillRect(px + 12, py + 12, 6, 6);
}

function drawTile(x, y, type, visible) {
  const { x: px, y: py } = toScreen(x, y);
  const theme = currentDungeonTheme();
  if (type === "wall") {
    ctx.fillStyle = visible ? theme.wall : theme.wallDark;
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = visible ? theme.wallLight : theme.wall;
    ctx.fillRect(px + 2, py + 2, TILE - 4, 9);
    ctx.fillStyle = "rgba(5, 12, 14, 0.34)";
    ctx.fillRect(px + 2, py + TILE - 7, TILE - 4, 5);
    ctx.strokeStyle = visible ? "rgba(235, 239, 220, 0.22)" : "rgba(150, 160, 155, 0.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 8);
    ctx.beginPath();
    ctx.moveTo(px + 4, py + 25);
    ctx.lineTo(px + TILE - 4, py + 25);
    ctx.moveTo(px + 24, py + 4);
    ctx.lineTo(px + 24, py + 25);
    ctx.moveTo(px + 15, py + 25);
    ctx.lineTo(px + 15, py + TILE - 8);
    ctx.stroke();
    return;
  }

  const floorColors = {
    floor: visible ? theme.floor : theme.floorDim,
    moss: visible ? theme.moss : theme.mossDim,
    crack: visible ? theme.crack : theme.crackDim,
  };
  ctx.fillStyle = floorColors[type] || floorColors.floor;
  ctx.fillRect(px, py, TILE, TILE);
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
  ctx.strokeStyle = "rgba(255, 239, 200, 0.1)";
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
  ctx.fillStyle = "rgba(20, 15, 12, 0.2)";
  ctx.fillRect(px, py + TILE - 4, TILE, 4);

  if (type === "floor") {
    const grain = noise(x, y, 93);
    ctx.fillStyle = visible ? "rgba(255, 227, 174, 0.16)" : "rgba(255, 227, 174, 0.08)";
    ctx.fillRect(px + 8 + grain * 18, py + 11, 3, 3);
    ctx.fillRect(px + 30 - grain * 12, py + 32, 4, 2);
  }

  if (type === "moss") {
    ctx.fillStyle = visible ? "#70a96a" : "#527a55";
    ctx.beginPath();
    ctx.arc(px + 13, py + 14, 5, 0, Math.PI * 2);
    ctx.arc(px + 33, py + 31, 7, 0, Math.PI * 2);
    ctx.arc(px + 12, py + 36, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = visible ? "#c9ef91" : "#86a873";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px + 24, py + 17);
    ctx.lineTo(px + 24, py + 31);
    ctx.moveTo(px + 17, py + 24);
    ctx.lineTo(px + 31, py + 24);
    ctx.stroke();
  }

  if (type === "crack") {
    ctx.strokeStyle = visible ? "#ffc45a" : "#a86d4e";
    ctx.lineWidth = 3;
    ctx.shadowColor = visible ? "#ff7b48" : "transparent";
    ctx.shadowBlur = visible ? 7 : 0;
    ctx.beginPath();
    ctx.moveTo(px + 7, py + 12);
    ctx.lineTo(px + 20, py + 20);
    ctx.lineTo(px + 15, py + 29);
    ctx.lineTo(px + 29, py + 34);
    ctx.lineTo(px + 39, py + 42);
    ctx.moveTo(px + 20, py + 20);
    ctx.lineTo(px + 33, py + 13);
    ctx.moveTo(px + 15, py + 29);
    ctx.lineTo(px + 7, py + 38);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  if (game.floorKind?.includes("rest")) drawRestTileMotif(px, py, x, y, visible);
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
      targetCtx.fillStyle = "#312c3b";
      targetCtx.fillRect(8, 32, 32, 9);
      targetCtx.fillStyle = color;
      targetCtx.fillRect(12, 27, 24, 7);
      targetCtx.fillStyle = inactive ? "#9b958a" : game.restTheme?.glow || "#fff2b1";
      drawPixelStar(targetCtx, 24, 18, 14, targetCtx.fillStyle);
      targetCtx.strokeStyle = color;
      targetCtx.lineWidth = 2;
      targetCtx.beginPath();
      targetCtx.arc(24, 18, 13 + Math.sin(time / 180) * 2, 0, Math.PI * 2);
      targetCtx.stroke();
    } else if (node.key === "storage") {
      targetCtx.fillStyle = "#6b482f";
      targetCtx.fillRect(7, 20, 34, 21);
      targetCtx.fillStyle = "#a87945";
      targetCtx.fillRect(8, 13, 32, 12);
      targetCtx.fillStyle = "#e4be69";
      targetCtx.fillRect(21, 19, 7, 14);
      targetCtx.fillRect(8, 23, 32, 3);
      targetCtx.fillStyle = "#34271d";
      targetCtx.fillRect(23, 25, 3, 5);
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
  ctx.fillStyle = "rgba(7, 11, 11, 0.88)";
  ctx.fillRect(px + 3, py + 39, 42, 9);
  ctx.fillStyle = inactive ? "#aaa499" : color;
  ctx.font = "900 7px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(node.name.slice(0, 6), px + 24, py + 46);
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
  } else if (["oran", "guardBerry", "powerBerry"].includes(kind)) {
    const berryColors = {
      oran: ["#5aa5eb", "#bfeaff"],
      guardBerry: ["#729eaa", "#d5f2f4"],
      powerBerry: ["#d85f50", "#ffd0a6"],
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
  } else if (["reviver", "blastSeed", "sleepSeed"].includes(kind)) {
    const colors = {
      reviver: ["#f5c957", "#fff4a8"],
      blastSeed: ["#ef5d4f", "#ffb34f"],
      sleepSeed: ["#8c70cf", "#d9c9ff"],
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
    } else if (kind === "blastSeed") {
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
  } else if (["slumberOrb", "warpOrb", "guidingOrb", "fortuneOrb"].includes(kind)) {
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
  } else if (kind === "badge") {
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

function drawAtlasCell(targetCtx, sheet, columns, rows, cell, width = 48, height = 48) {
  if (!cell || !sheet.complete || !sheet.naturalWidth) return false;
  const [column, row] = cell;
  const sourceWidth = sheet.naturalWidth / columns;
  const sourceHeight = sheet.naturalHeight / rows;
  targetCtx.drawImage(
    sheet,
    column * sourceWidth,
    row * sourceHeight,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
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

function drawLineageArt(targetCtx, actor, time = performance.now()) {
  if (actor.kind !== "leader") return false;
  const profile = characterCatalog.find((entry) => entry.key === actor.profileKey) || characterCatalog[0];
  let column = Number.isInteger(actor.artColumn) ? actor.artColumn : 0;
  if (!Number.isInteger(actor.artColumn) && actor.evolutionBranch && actor.evolutionBranch !== "base") {
    const branch = (ascensionBranches[profile.key] || []).find((entry) => entry.key === actor.evolutionBranch);
    column = branch?.artColumn || 0;
  }
  if (profile.key === "kohaku") {
    return drawMapTokenCell(targetCtx, [clamp(column, 0, 3), 0]);
  }
  const artSets = {
    knight: [2, 28, 14, 39],
    magician: [8, 36, 22, 8],
  };
  const artIndex = artSets[profile.key]?.[clamp(column, 0, 3)];
  if (!Number.isInteger(artIndex)) return false;
  const sheet = enemyArtSheets[Math.floor(artIndex / 10)];
  if (!sheet?.complete || !sheet.naturalWidth) return false;
  const localIndex = artIndex % 10;
  const sourceColumn = localIndex % 5;
  const sourceRow = Math.floor(localIndex / 5);
  const cellWidth = sheet.naturalWidth / 5;
  const cellHeight = sheet.naturalHeight / 2;
  const pulse = 1 + Math.sin(time / 420 + (actor.evolutionStage || 0)) * 0.018;
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
  if ((actor.evolutionStage || 0) > 0) {
    targetCtx.strokeStyle = actor.color || "#fff0a1";
    targetCtx.globalAlpha = 0.55;
    targetCtx.lineWidth = 1.5;
    targetCtx.beginPath();
    targetCtx.ellipse(0, 17, 16 + Math.sin(time / 300) * 2, 4, 0, 0, Math.PI * 2);
    targetCtx.stroke();
  }
  targetCtx.restore();
  return true;
}

function drawEvolutionAdornment(targetCtx, actor, light) {
  const key = actor.evolutionKey;
  if (!key || key === "base") return;
  targetCtx.save();
  if (key === "lumina" || key === "seraph") {
    targetCtx.fillStyle = key === "seraph" ? "#ffffff" : "#9ff5ff";
    targetCtx.fillRect(10, 9, 4, 13);
    targetCtx.fillRect(35, 9, 4, 13);
    targetCtx.fillRect(6, 14, 4, 8);
    targetCtx.fillRect(39, 14, 4, 8);
    if (key === "seraph") {
      targetCtx.strokeStyle = "#f5d877";
      targetCtx.lineWidth = 2;
      targetCtx.beginPath();
      targetCtx.ellipse(24, 3, 10, 3, 0, 0, Math.PI * 2);
      targetCtx.stroke();
    }
  } else if (key === "agni" || key === "vajra") {
    targetCtx.fillStyle = "#ffbd43";
    targetCtx.fillRect(11, 7, 5, 12);
    targetCtx.fillRect(33, 7, 5, 12);
    targetCtx.fillRect(19, 2, 4, 8);
    targetCtx.fillRect(27, 1, 4, 9);
    if (key === "vajra") {
      targetCtx.fillStyle = "#f5d36d";
      targetCtx.fillRect(10, 27, 7, 5);
      targetCtx.fillRect(33, 27, 7, 5);
      drawPixelStar(targetCtx, 24, 8, 7, "#fff0a1");
    }
  } else if (key === "nox" || key === "abyss") {
    targetCtx.fillStyle = "#d7a8ff";
    targetCtx.beginPath();
    targetCtx.arc(10, 10, 7, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.fillStyle = actor.color;
    targetCtx.beginPath();
    targetCtx.arc(13, 8, 6, 0, Math.PI * 2);
    targetCtx.fill();
    if (key === "abyss") {
      targetCtx.fillStyle = "#d85b9c";
      targetCtx.fillRect(17, 3, 4, 7);
      targetCtx.fillRect(23, 0, 4, 10);
      targetCtx.fillRect(29, 3, 4, 7);
    }
  } else if (key === "sage") {
    targetCtx.strokeStyle = "#c9a95f";
    targetCtx.lineWidth = 3;
    targetCtx.beginPath();
    targetCtx.moveTo(17, 10);
    targetCtx.lineTo(11, 2);
    targetCtx.moveTo(31, 10);
    targetCtx.lineTo(37, 2);
    targetCtx.stroke();
    targetCtx.fillStyle = "#92d875";
    targetCtx.fillRect(7, 2, 7, 4);
    targetCtx.fillRect(34, 2, 7, 4);
  } else if (key === "astera") {
    targetCtx.fillStyle = "#ffe982";
    drawPixelStar(targetCtx, 24, 4, 10, "#ffe982");
    targetCtx.fillRect(13, 8, 5, 6);
    targetCtx.fillRect(31, 8, 5, 6);
  }
  targetCtx.fillStyle = light;
  targetCtx.fillRect(22, 8, 5, 4);
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
  }, px, py + wobble, elementInfo(enemy.elementKey).color, enemy.boss || enemy.rare ? 3 : 2);
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
  drawEnemyHp(enemy, px, py);
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
  const artIndex = enemyArtIndex(enemy);
  const sheet = enemyArtSheets[Math.floor(artIndex / 10)];
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
  const width = Math.min(430, canvas.width - 240);
  const x = (canvas.width - width) / 2;
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
  ctx.fillText(`【${elementInfo(boss.elementKey).name}】${boss.title}  ${boss.name}`, x, y + 4);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x, y + 12, width, 10);
  ctx.fillStyle = boss.color;
  ctx.fillRect(x, y + 12, width * clamp(boss.hp / boss.maxHp, 0, 1), 10);
  ctx.restore();
}

function drawOutlinedEntity(drawEntity, px, py, color, radius) {
  entityBufferCtx.clearRect(0, 0, TILE, TILE);
  entityBufferCtx.imageSmoothingEnabled = true;
  drawEntity(entityBufferCtx);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  stampEntitySilhouette(px, py, "rgba(3, 6, 5, 0.96)", radius + 2);
  stampEntitySilhouette(px, py, color, radius);
  ctx.drawImage(entityBuffer, px, py);
  ctx.restore();
}

function stampEntitySilhouette(px, py, color, radius) {
  entityTintCtx.clearRect(0, 0, TILE, TILE);
  entityTintCtx.globalCompositeOperation = "source-over";
  entityTintCtx.drawImage(entityBuffer, 0, 0);
  entityTintCtx.globalCompositeOperation = "source-in";
  entityTintCtx.fillStyle = color;
  entityTintCtx.fillRect(0, 0, TILE, TILE);
  entityTintCtx.globalCompositeOperation = "source-over";
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      if (dx * dx + dy * dy > radius * radius + 1) continue;
      ctx.drawImage(entityTint, px + dx, py + dy);
    }
  }
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
  const x = canvas.width / 2 + Math.cos(angle) * (canvas.width / 2 - 42);
  const y = canvas.height / 2 + Math.sin(angle) * (canvas.height / 2 - 42);
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
  if (!game.aimDirection) return;
  const leader = getLeader();
  const x = leader.x + game.aimDirection.x;
  const y = leader.y + game.aimDirection.y;
  if (!inBounds(x, y) || !inCamera(x, y)) return;
  const { x: px, y: py } = toScreen(x, y);
  const hasEnemy = Boolean(enemyAt(x, y));
  ctx.save();
  ctx.strokeStyle = hasEnemy ? "#ff766c" : "rgba(255, 232, 175, 0.72)";
  ctx.lineWidth = 3;
  const edge = 10;
  const inset = 5;
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
  ctx.restore();
}

function directionFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  const leader = getLeader();
  const leaderScreen = toScreen(leader.x, leader.y);
  const angle = Math.atan2(y - (leaderScreen.y + TILE / 2), x - (leaderScreen.x + TILE / 2));
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: Math.abs(cosine) < 0.38 ? 0 : Math.sign(cosine),
    y: Math.abs(sine) < 0.38 ? 0 : Math.sign(sine),
  };
}

function drawMiniMap() {
  const sx = miniCanvas.width / MAP_W;
  const sy = miniCanvas.height / MAP_H;
  miniCtx.fillStyle = "#030708";
  miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      if (!game.mapped[y][x] || game.map[y][x] === "wall") continue;
      miniCtx.fillStyle = isMerchantShopTile(x, y)
        ? (game.merchant?.robbed ? "#b34850" : "#43b995")
        : game.visible[y][x] ? "#69cbd0" : "#346f76";
      miniCtx.fillRect(Math.floor(x * sx), Math.floor(y * sy), Math.ceil(sx), Math.ceil(sy));
    }
  }

  for (const item of game.items) {
    const mappedItem = game.mapped[item.y]?.[item.x];
    if (!mappedItem) continue;
    if (!isVisible(item.x, item.y) && !hasSkill("scout")) continue;
    miniCtx.fillStyle = "#ffd45f";
    miniCtx.fillRect(item.x * sx + 1, item.y * sy + 1, Math.max(3, sx - 2), Math.max(3, sy - 2));
  }
  if (game.merchant && game.mapped[game.merchant.y]?.[game.merchant.x]) {
    miniCtx.fillStyle = "#61e1bd";
    miniCtx.fillRect(
      game.merchant.x * sx,
      game.merchant.y * sy,
      Math.max(4, sx + 1),
      Math.max(4, sy + 1),
    );
  }
  for (const node of game.restNodes || []) {
    if (!game.mapped[node.y]?.[node.x]) continue;
    miniCtx.fillStyle = node.action === "milestone" && game.restChoiceTaken ? "#827a72" : node.color;
    miniCtx.fillRect(node.x * sx, node.y * sy, Math.max(4, sx + 1), Math.max(4, sy + 1));
  }
  if (game.casino && game.mapped[game.casino.y]?.[game.casino.x]) {
    miniCtx.fillStyle = "#f1b94d";
    miniCtx.fillRect(game.casino.x * sx, game.casino.y * sy, Math.max(4, sx + 1), Math.max(4, sy + 1));
  }
  if (game.secretStairs?.revealed && game.mapped[game.secretStairs.y]?.[game.secretStairs.x]) {
    miniCtx.fillStyle = game.secretStairs.used ? "#73627f" : "#d99bff";
    miniCtx.fillRect(game.secretStairs.x * sx, game.secretStairs.y * sy, sx + 1, sy + 1);
  }

  if (game.stairsRevealed && (game.mapped[game.stairs.y][game.stairs.x] || game.guidanceActive || hasRelic("starCompass"))) {
    miniCtx.fillStyle = game.mission.complete ? "#fff8de" : "#8a8e8d";
    miniCtx.fillRect(game.stairs.x * sx, game.stairs.y * sy, sx + 1, sy + 1);
  }
  for (const trap of game.traps) {
    if (!trap.revealed || !game.mapped[trap.y]?.[trap.x]) continue;
    miniCtx.fillStyle = "#ff786c";
    miniCtx.fillRect(trap.x * sx + 1, trap.y * sy + 1, Math.max(3, sx - 2), Math.max(3, sy - 2));
  }
  if (
    game.mission &&
    !game.mission.complete &&
    (game.mapped[game.mission.y][game.mission.x] || game.guidanceActive)
  ) {
    miniCtx.fillStyle = "#df78ff";
    miniCtx.fillRect(game.mission.x * sx, game.mission.y * sy, sx + 1, sy + 1);
  }
  for (const enemy of game.enemies) {
    if (!isVisible(enemy.x, enemy.y) || !game.mapped[enemy.y]?.[enemy.x]) continue;
    miniCtx.fillStyle = enemy.rare ? "#ffe45f" : elementInfo(enemy.elementKey).color;
    miniCtx.fillRect(enemy.x * sx, enemy.y * sy, sx + 1, sy + 1);
  }
  for (let index = game.team.length - 1; index >= 0; index -= 1) {
    const actor = game.team[index];
    if (actor.down) continue;
    miniCtx.fillStyle = actor.id === "leader" ? "#62efff" : "#8ed96c";
    miniCtx.fillRect(actor.x * sx, actor.y * sy, sx + 1, sy + 1);
  }

  miniCtx.strokeStyle = "rgba(255,255,255,0.42)";
  miniCtx.lineWidth = 1;
  miniCtx.strokeRect(
    renderCamera.x * sx,
    renderCamera.y * sy,
    renderCamera.width * sx,
    renderCamera.height * sy,
  );
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
    ui.eventBanner.classList.add("idle");
  }, 4200);
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
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
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
  game.skillPoints = 1;
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
        if (!initial) createGame();
        game.saveSlot = slot;
        saveCurrentGame(true);
        updateAll();
      }
      ui.saveDialog.close();
      showToast(saved ? `セーブ${slot}を読み込んだ` : `セーブ${slot}で冒険を始める`);
    });
    entry.appendChild(button);
    ui.saveSlotList.appendChild(entry);
  }
}

function handleKey(event) {
  const activeTag = document.activeElement?.tagName;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) return;
  const key = event.key.toLowerCase();
  const code = event.code;

  if (ui.townDialog.open || ui.helpDialog.open || ui.saveDialog.open || ui.stairsDialog.open || ui.restDialog.open || ui.levelDialog.open) return;
  if (game.mode === "town") {
    const townMoves = {
      w: { x: 0, y: -1 },
      a: { x: -1, y: 0 },
      s: { x: 0, y: 1 },
      d: { x: 1, y: 0 },
      arrowup: { x: 0, y: -1 },
      arrowleft: { x: -1, y: 0 },
      arrowdown: { x: 0, y: 1 },
      arrowright: { x: 1, y: 0 },
      y: { x: -1, y: -1 },
      u: { x: 1, y: -1 },
      b: { x: -1, y: 1 },
      n: { x: 1, y: 1 },
    };
    const direction = townMoves[key];
    if (direction) {
      event.preventDefault();
      const now = performance.now();
      if (now < game.nextMoveAt) return;
      game.nextMoveAt = now + (event.shiftKey ? 55 : 90);
      const previousDash = touchDashHeld;
      touchDashHeld ||= event.shiftKey;
      moveTownPlayer(direction.x, direction.y);
      touchDashHeld = previousDash;
      return;
    }
    if (["enter", "f", " ", "e"].includes(key)) {
      if (event.repeat) return;
      event.preventDefault();
      interactTownFacility();
    }
    return;
  }
  if (key === "q") {
    if (event.repeat) return;
    event.preventDefault();
    toggleGameMenu("moves");
    return;
  }
  if (key === "g") {
    if (event.repeat) return;
    event.preventDefault();
    toggleGameMenu("ground");
    return;
  }
  if (ui.gameMenuDialog.open || game.mode !== "dungeon") return;

  const actions = {
    w: { type: "move", dx: 0, dy: -1 },
    a: { type: "move", dx: -1, dy: 0 },
    s: { type: "move", dx: 0, dy: 1 },
    d: { type: "move", dx: 1, dy: 0 },
    arrowup: { type: "move", dx: 0, dy: -1 },
    arrowleft: { type: "move", dx: -1, dy: 0 },
    arrowdown: { type: "move", dx: 0, dy: 1 },
    arrowright: { type: "move", dx: 1, dy: 0 },
    y: { type: "move", dx: -1, dy: -1 },
    u: { type: "move", dx: 1, dy: -1 },
    b: { type: "move", dx: -1, dy: 1 },
    n: { type: "move", dx: 1, dy: 1 },
    home: { type: "move", dx: -1, dy: -1 },
    pageup: { type: "move", dx: 1, dy: -1 },
    end: { type: "move", dx: -1, dy: 1 },
    pagedown: { type: "move", dx: 1, dy: 1 },
    " ": { type: "wait" },
    ".": { type: "wait" },
    f: { type: "basicAttack" },
    j: { type: "useMove" },
    r: { type: "eatApple" },
    e: { type: "cycleMove" },
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

  if (/^[1-4]$/.test(key) && !code.startsWith("Numpad")) {
    if (event.repeat) return;
    event.preventDefault();
    performAction({ type: "selectMove", index: Number(key) - 1 });
    return;
  }

  const action = numpadActions[code] || actions[key];
  if (!action) return;
  if (event.repeat && action.type !== "move") return;
  event.preventDefault();
  if (action.type === "move" && event.shiftKey) {
    performAction({ ...action, type: "face" });
    return;
  }
  if (action.type === "move") {
    const now = performance.now();
    if (now < game.nextMoveAt) return;
    game.nextMoveAt = now + 125;
  }
  performAction(action);
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
    game.aimDirection = directionFromPointer(event);
  });
  canvas.addEventListener("mouseleave", () => {
    game.aimDirection = null;
  });
  canvas.addEventListener("click", (event) => {
    if (event.button !== 0 || game.mode !== "dungeon") return;
    if (ui.gameMenuDialog.open || ui.helpDialog.open || ui.townDialog.open || ui.saveDialog.open || ui.stairsDialog.open || ui.restDialog.open || ui.levelDialog.open) return;
    const direction = directionFromPointer(event);
    game.aimDirection = direction;
    performAction({ type: "basicAttack", dx: direction.x, dy: direction.y });
  });
  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    if (game.mode !== "dungeon") return;
    if (ui.gameMenuDialog.open || ui.helpDialog.open || ui.townDialog.open || ui.saveDialog.open || ui.stairsDialog.open || ui.restDialog.open || ui.levelDialog.open) return;
    const direction = directionFromPointer(event);
    game.aimDirection = direction;
    const leader = getLeader();
    leader.dx = direction.x;
    leader.dy = direction.y;
    performAction({ type: "useMove" });
  });

  document.querySelectorAll("[data-menu-view]").forEach((button) => {
    button.addEventListener("click", () => renderGameMenu(button.dataset.menuView));
  });

  document.querySelectorAll("[data-town-action]").forEach((button) => {
    button.addEventListener("click", () => openTownFacility(button.dataset.townAction));
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
if (!loadSaveSlot(1)) saveCurrentGame(true);
window.setTimeout(() => {
  if (game.mode === "town" && !ui.townDialog.open && !ui.saveDialog.open) openExpeditionLoadout();
}, 120);
updateSoundButton();
spriteSheet.addEventListener("load", () => {
  if (game) updateAll();
});
mapTokenSheet.addEventListener("load", () => {
  prepareMapTokenAtlas();
  if (game) updateAll();
});
requestAnimationFrame(draw);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // The game remains playable online if offline support is unavailable.
    });
  });
}
