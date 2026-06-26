const TILE = 48;
const BASE_TILE = 32;
const ACTOR_SCALE = TILE / BASE_TILE;
const MAP_W = 36;
const MAP_H = 24;
const TARGET_FLOOR = 6;
const VISION_RADIUS = 7;
const STORAGE_KEY = "stardustDungeonBest";
const SPRITE_TILE = 16;
const SPRITE_MARGIN = 1;
const SPRITE_COLS = 56;

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const miniCanvas = document.querySelector("#miniMap");
const miniCtx = miniCanvas.getContext("2d");
const spriteSheet = new Image();
spriteSheet.src = "assets/kenney-roguelike-rpg-pack/Spritesheet/roguelikeSheet_transparent.png";

let renderCamera = { x: 0, y: 0, width: canvas.width / TILE, height: canvas.height / TILE };

const ui = {
  floor: document.querySelector("#floorLabel"),
  score: document.querySelector("#scoreLabel"),
  best: document.querySelector("#bestLabel"),
  bell: document.querySelector("#bellLabel"),
  seal: document.querySelector("#sealLabel"),
  bond: document.querySelector("#bondLabel"),
  goal: document.querySelector("#goalLabel"),
  stairs: document.querySelector("#stairsLabel"),
  turn: document.querySelector("#turnLabel"),
  party: document.querySelector("#partyList"),
  log: document.querySelector("#logList"),
  toast: document.querySelector("#toast"),
  helpButton: document.querySelector("#helpButton"),
  helpDialog: document.querySelector("#helpDialog"),
  restartButton: document.querySelector("#restartButton"),
  endOverlay: document.querySelector("#endOverlay"),
  endTitle: document.querySelector("#endTitle"),
  endText: document.querySelector("#endText"),
  endRestartButton: document.querySelector("#endRestartButton"),
};

const palette = {
  void: "#070807",
  wall: "#2b2e2a",
  wallDark: "#171916",
  wallLight: "#4b5146",
  floor: "#4a4338",
  floorAlt: "#544b3d",
  floorDark: "#332f29",
  moss: "#7f9b61",
  brass: "#e3af4c",
  teal: "#69b9c3",
  coral: "#de6d5e",
  violet: "#9480d4",
  white: "#f7efe3",
  ink: "#171411",
  fog: "rgba(5, 7, 6, 0.66)",
};

const spriteIds = {
  floors: [229, 230, 231, 232, 233, 234],
  moss: [560, 561, 562, 563],
  cracks: [1136, 1137, 1138, 1139],
  walls: [174, 175, 176, 177],
  wallCaps: [677, 678, 679, 680],
  herb: 640,
  stardust: 658,
  guard: 554,
  bell: 1176,
  stairs: 1176,
  lampSeal: 554,
  bladeSeal: 406,
  ember: 462,
  mossEnemy: 640,
  crystalEnemy: 554,
  totemEnemy: 602,
};

const enemyCatalog = [
  {
    key: "ember",
    name: "影火",
    hp: 9,
    atk: 3,
    exp: 16,
    color: "#e17c4d",
    accent: "#ffd66d",
    speed: 1,
  },
  {
    key: "moss",
    name: "苔玉",
    hp: 13,
    atk: 2,
    exp: 18,
    color: "#789c61",
    accent: "#c6df8f",
    speed: 1,
  },
  {
    key: "crystal",
    name: "結晶兵",
    hp: 16,
    atk: 4,
    exp: 24,
    color: "#7bbdd2",
    accent: "#d6f8ff",
    speed: 1,
  },
  {
    key: "totem",
    name: "石像",
    hp: 22,
    atk: 5,
    exp: 32,
    color: "#9b917d",
    accent: "#e3cf9a",
    speed: 1,
  },
];

const dirs = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

let bestScore = readBestScore();
let game;
let lastFrame = 0;

function createGame() {
  const nextGame = {
    floor: 1,
    turn: 1,
    score: 0,
    bells: 1,
    bond: 100,
    map: [],
    rooms: [],
    seen: [],
    visible: [],
    players: [
      {
        id: 0,
        name: "ミナ",
        role: "灯の見習い",
        color: palette.teal,
        accent: "#d7fbff",
        hp: 28,
        maxHp: 28,
        atk: 6,
        defense: 0,
        x: 0,
        y: 0,
        dx: 0,
        dy: 1,
        acted: false,
        down: false,
        cooldown: 0,
        skillName: "癒しの輪",
        skillHint: "E",
        sealName: "灯紋",
      },
      {
        id: 1,
        name: "レン",
        role: "星の剣士",
        color: palette.brass,
        accent: "#fff0b4",
        hp: 34,
        maxHp: 34,
        atk: 7,
        defense: 0,
        x: 0,
        y: 0,
        dx: 0,
        dy: 1,
        acted: false,
        down: false,
        cooldown: 0,
        skillName: "星斬り",
        skillHint: "/",
        sealName: "剣紋",
      },
    ],
    enemies: [],
    items: [],
    stairs: { x: 0, y: 0 },
    seals: [],
    effects: [],
    logs: [],
    gameOver: false,
    victory: false,
    messageTimer: 0,
    lastMessage: "",
    seed: Math.floor(Math.random() * 999999),
  };

  game = nextGame;
  buildFloor();
  addLog("星の扉が開いた。二人で奥へ進もう。");
  updateAll();
}

function buildFloor() {
  const dungeon = generateDungeon();
  game.map = dungeon.map;
  game.rooms = dungeon.rooms;
  game.seen = makeGrid(false);
  game.visible = makeGrid(false);
  game.enemies = [];
  game.items = [];

  const start = centerOf(game.rooms[0]);
  const secondSpot = nearestOpen(start.x + 1, start.y, [{ x: start.x, y: start.y }]);
  game.players[0].x = start.x;
  game.players[0].y = start.y;
  game.players[0].acted = false;
  game.players[1].x = secondSpot.x;
  game.players[1].y = secondSpot.y;
  game.players[1].acted = false;

  const stairRoom = farthestRoomFrom(start);
  const stairCenter = centerOf(stairRoom);
  game.stairs = nearestOpen(stairCenter.x, stairCenter.y, []);
  placeSeals(start);

  spawnItems();
  spawnEnemies();
  revealAroundPlayers();
  addLog("灯紋と剣紋が階段を封じている。二人で分担して解除しよう。");
}

function placeSeals(start) {
  const stairPoint = game.stairs;
  const rankedRooms = game.rooms
    .slice(1)
    .map((room) => {
      const center = centerOf(room);
      return {
        room,
        score: manhattan(start.x, start.y, center.x, center.y) + manhattan(stairPoint.x, stairPoint.y, center.x, center.y) * 0.35,
      };
    })
    .sort((a, b) => b.score - a.score);
  const fallbackRooms = [game.rooms[1] || game.rooms[0], game.rooms[2] || game.rooms[0]];
  const chosen = [
    rankedRooms[0]?.room || fallbackRooms[0],
    rankedRooms.find((entry) => entry.room !== rankedRooms[0]?.room)?.room || fallbackRooms[1],
  ];
  const blocked = [
    ...game.players.map((player) => ({ x: player.x, y: player.y })),
    { x: game.stairs.x, y: game.stairs.y },
  ];

  game.seals = game.players.map((player, index) => {
    const center = centerOf(chosen[index]);
    const offset = index === 0 ? -1 : 1;
    const pos = nearestOpen(center.x + offset, center.y, blocked);
    blocked.push(pos);
    return {
      id: player.id,
      owner: player.id,
      name: player.sealName,
      x: pos.x,
      y: pos.y,
      active: false,
      color: player.color,
    };
  });
}

function generateDungeon() {
  let best = null;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const map = makeGrid("wall");
    const rooms = [];
    const targetRooms = randInt(9, 13);

    for (let i = 0; i < targetRooms; i += 1) {
      const w = randInt(4, 8);
      const h = randInt(4, 7);
      const x = randInt(1, MAP_W - w - 2);
      const y = randInt(1, MAP_H - h - 2);
      const room = { x, y, w, h };

      if (rooms.some((other) => rectsOverlap(room, other, 2))) {
        continue;
      }

      carveRoom(map, room);
      if (rooms.length > 0) {
        connectRooms(map, centerOf(rooms[rooms.length - 1]), centerOf(room));
      }
      rooms.push(room);
    }

    if (!best || rooms.length > best.rooms.length) {
      best = { map, rooms };
    }

    if (rooms.length >= 8) {
      addFloorDetails(map, rooms);
      return { map, rooms };
    }
  }

  addFloorDetails(best.map, best.rooms);
  return best;
}

function carveRoom(map, room) {
  for (let y = room.y; y < room.y + room.h; y += 1) {
    for (let x = room.x; x < room.x + room.w; x += 1) {
      map[y][x] = "floor";
    }
  }
}

function connectRooms(map, a, b) {
  const horizontalFirst = Math.random() > 0.5;
  if (horizontalFirst) {
    carveH(map, a.x, b.x, a.y);
    carveV(map, a.y, b.y, b.x);
  } else {
    carveV(map, a.y, b.y, a.x);
    carveH(map, a.x, b.x, b.y);
  }
}

function carveH(map, x1, x2, y) {
  const start = Math.min(x1, x2);
  const end = Math.max(x1, x2);
  for (let x = start; x <= end; x += 1) {
    if (inBounds(x, y)) {
      map[y][x] = "floor";
      if (inBounds(x, y - 1) && Math.random() < 0.18) map[y - 1][x] = "floor";
      if (inBounds(x, y + 1) && Math.random() < 0.18) map[y + 1][x] = "floor";
    }
  }
}

function carveV(map, y1, y2, x) {
  const start = Math.min(y1, y2);
  const end = Math.max(y1, y2);
  for (let y = start; y <= end; y += 1) {
    if (inBounds(x, y)) {
      map[y][x] = "floor";
      if (inBounds(x - 1, y) && Math.random() < 0.18) map[y][x - 1] = "floor";
      if (inBounds(x + 1, y) && Math.random() < 0.18) map[y][x + 1] = "floor";
    }
  }
}

function addFloorDetails(map, rooms) {
  for (const room of rooms) {
    const details = randInt(2, 5);
    for (let i = 0; i < details; i += 1) {
      const x = randInt(room.x, room.x + room.w - 1);
      const y = randInt(room.y, room.y + room.h - 1);
      if (Math.random() < 0.45) {
        map[y][x] = "moss";
      } else if (Math.random() < 0.34) {
        map[y][x] = "crack";
      }
    }
  }
}

function spawnItems() {
  const count = 7 + game.floor;
  const possible = [
    { kind: "herb", name: "薬草", weight: 5 },
    { kind: "stardust", name: "星くず", weight: 5 },
    { kind: "guard", name: "護符", weight: 2 },
    { kind: "bell", name: "救助ベル", weight: 1 },
  ];

  for (let i = 0; i < count; i += 1) {
    const itemDef = weighted(possible);
    const pos = randomOpenSpot();
    if (!pos) continue;
    game.items.push({
      id: cryptoId(),
      kind: itemDef.kind,
      name: itemDef.name,
      x: pos.x,
      y: pos.y,
      pulse: Math.random() * Math.PI * 2,
    });
  }
}

function spawnEnemies() {
  const count = 5 + game.floor * 2;
  for (let i = 0; i < count; i += 1) {
    const catalog = enemyCatalog[Math.min(enemyCatalog.length - 1, randInt(0, Math.floor(game.floor / 2) + 1))];
    const pos = randomOpenSpot(8);
    if (!pos) continue;
    const scale = game.floor - 1;
    game.enemies.push({
      id: cryptoId(),
      key: catalog.key,
      name: catalog.name,
      x: pos.x,
      y: pos.y,
      hp: catalog.hp + scale * 4,
      maxHp: catalog.hp + scale * 4,
      atk: catalog.atk + Math.floor(scale * 1.4),
      exp: catalog.exp + scale * 5,
      color: catalog.color,
      accent: catalog.accent,
      wobble: Math.random() * Math.PI * 2,
      alerted: false,
    });
  }
}

function performAction(playerIndex, action) {
  if (game.gameOver || game.victory) return;
  const player = game.players[playerIndex];
  if (!player || player.down) return;
  if (player.acted) {
    showToast(`${player.name}は敵の動きを待っている。`);
    return;
  }

  let acted = false;

  if (tryRescue(player)) {
    acted = true;
  } else if (action.type === "move") {
    acted = moveOrAttack(player, action.dx, action.dy);
  } else if (action.type === "skill") {
    acted = useSkill(player);
  } else if (action.type === "wait") {
    addLog(`${player.name}は息を整えた。`);
    healPlayer(player, 1, false);
    acted = true;
  }

  if (!acted) return;

  player.acted = true;
  pickupItems(player);
  checkSeal(player);
  revealAroundPlayers();
  checkStairs();
  updateAll();

  if (game.gameOver || game.victory) return;

  if (everyoneReadyForEnemyTurn()) {
    enemyTurn();
  }
}

function moveOrAttack(player, dx, dy) {
  player.dx = dx;
  player.dy = dy;
  const tx = player.x + dx;
  const ty = player.y + dy;

  if (!inBounds(tx, ty)) return false;

  const enemy = enemyAt(tx, ty);
  if (enemy) {
    strikeEnemy(player, enemy, player.atk, "攻撃");
    tryCoopFollowUp(player, enemy);
    return true;
  }

  const ally = game.players.find((other) => other.id !== player.id && other.x === tx && other.y === ty);
  if (ally) {
    showToast("仲間と場所が重なっている。別の道を探そう。");
    return false;
  }

  if (!isWalkable(tx, ty)) {
    addEffect("bump", tx, ty, palette.wallLight);
    showToast("壁が行く手をふさいでいる。");
    return false;
  }

  player.x = tx;
  player.y = ty;
  addEffect("step", tx, ty, player.color);
  return true;
}

function useSkill(player) {
  if (player.cooldown > 0) {
    showToast(`${player.skillName}はあと${player.cooldown}ターン。`);
    return false;
  }

  if (player.id === 0) {
    const allies = game.players.filter((ally) => distance(player, ally) <= 3 && !ally.down);
    const healed = allies.reduce((total, ally) => total + healPlayer(ally, 8 + game.floor, true), 0);
    const nearbyEnemies = game.enemies.filter((enemy) => distance(player, enemy) <= 1.5);
    for (const enemy of nearbyEnemies) {
      damageEnemy(enemy, 4 + game.floor, player, "灯の波");
    }
    player.cooldown = 5;
    addRingEffect(player.x, player.y, player.color);
    addLog(`${player.name}の癒しの輪。合計${healed}回復した。`);
    return true;
  }

  const line = [];
  for (let i = 1; i <= 3; i += 1) {
    const x = player.x + player.dx * i;
    const y = player.y + player.dy * i;
    if (!inBounds(x, y) || !isWalkable(x, y)) break;
    line.push({ x, y });
  }

  for (const point of line) {
    addEffect("slash", point.x, point.y, player.color);
    const enemy = enemyAt(point.x, point.y);
    if (enemy) {
      damageEnemy(enemy, player.atk + 6 + game.floor, player, "星斬り");
      tryCoopFollowUp(player, enemy);
      player.cooldown = 4;
      addLog(`${player.name}の星斬りが${enemy.name}を貫いた。`);
      return true;
    }
  }

  if (line.length === 0) {
    showToast("その方向には振り抜けない。");
    return false;
  }

  player.cooldown = 4;
  addLog(`${player.name}は星斬りを放った。`);
  return true;
}

function strikeEnemy(player, enemy, amount, label) {
  const variance = randInt(-1, 2);
  damageEnemy(enemy, Math.max(1, amount + variance), player, label);
}

function damageEnemy(enemy, amount, player, label) {
  enemy.hp -= amount;
  enemy.alerted = true;
  addFloatingText(enemy.x, enemy.y, `-${amount}`, palette.brass);
  addEffect("hit", enemy.x, enemy.y, player.color);

  if (enemy.hp <= 0) {
    game.enemies = game.enemies.filter((target) => target.id !== enemy.id);
    game.score += enemy.exp;
    addLog(`${label}で${enemy.name}を倒した。+${enemy.exp}pt`);
    maybeDropItem(enemy.x, enemy.y);
  } else {
    addLog(`${label}。${enemy.name}に${amount}ダメージ。`);
  }
}

function tryCoopFollowUp(player, enemy) {
  if (!game.enemies.includes(enemy)) return false;
  const ally = game.players.find((candidate) => candidate.id !== player.id && !candidate.down);
  if (!ally || distance(player, ally) > 2.2) return false;
  const amount = Math.max(2, Math.floor((ally.atk + player.atk) * 0.42 + game.bond / 28));
  game.bond = clamp(game.bond + 8, 0, 100);
  addEffect("link", player.x, player.y, player.color);
  addEffect("link", ally.x, ally.y, ally.color);
  damageEnemy(enemy, amount, ally, "絆追撃");
  addLog(`${ally.name}が合わせた。近くで戦うと追撃が出る。`);
  return true;
}

function checkSeal(player) {
  const seal = game.seals.find((candidate) => candidate.x === player.x && candidate.y === player.y);
  if (!seal) return false;

  if (seal.owner !== player.id) {
    const owner = game.players[seal.owner];
    showToast(`${seal.name}は${owner.name}が解除する紋章。`);
    return false;
  }

  if (seal.active) {
    showToast(`${seal.name}は解除済み。`);
    return false;
  }

  seal.active = true;
  game.score += 80 + game.floor * 15;
  game.bond = clamp(game.bond + 15, 0, 100);
  addRingEffect(seal.x, seal.y, player.color);
  addFloatingText(seal.x, seal.y, "OPEN", player.color);
  addLog(`${player.name}が${seal.name}を解除した。`);
  if (allSealsActive()) {
    addLog("二つの紋章が響き合い、階段の封印が解けた。");
    showToast("階段が開いた。二人で合流しよう。");
  }
  return true;
}

function allSealsActive() {
  return game.seals.length > 0 && game.seals.every((seal) => seal.active);
}

function enemyTurn() {
  for (const player of game.players) {
    player.acted = false;
    if (player.cooldown > 0) player.cooldown -= 1;
  }
  updateBondAfterTurn();

  const enemies = [...game.enemies];
  for (const enemy of enemies) {
    if (!game.enemies.includes(enemy)) continue;
    const target = nearestLivingPlayer(enemy);
    if (!target) break;

    if (manhattan(enemy.x, enemy.y, target.x, target.y) === 1) {
      enemyAttack(enemy, target);
      continue;
    }

    const aware = enemy.alerted || distance(enemy, target) <= 8 || game.visible[enemy.y][enemy.x];
    if (!aware) {
      enemyWander(enemy);
      continue;
    }

    enemy.alerted = true;
    const next = stepToward(enemy, target);
    if (next && !blockedByActor(next.x, next.y)) {
      enemy.x = next.x;
      enemy.y = next.y;
      addEffect("step", enemy.x, enemy.y, enemy.color);
    }
  }

  game.turn += 1;
  if (game.turn % 12 === 0) {
    const pos = randomOpenSpot(7);
    if (pos) {
      const base = enemyCatalog[Math.min(enemyCatalog.length - 1, Math.floor(game.floor / 2))];
      game.enemies.push({
        id: cryptoId(),
        key: base.key,
        name: base.name,
        x: pos.x,
        y: pos.y,
        hp: base.hp + game.floor * 3,
        maxHp: base.hp + game.floor * 3,
        atk: base.atk + game.floor,
        exp: base.exp + game.floor * 4,
        color: base.color,
        accent: base.accent,
        wobble: Math.random() * Math.PI * 2,
        alerted: true,
      });
      addLog("奥から気配が近づいてくる。");
    }
  }

  revealAroundPlayers();
  checkGameEnd();
  updateAll();
}

function enemyAttack(enemy, player) {
  const fearBonus = game.bond <= 20 ? 1 : 0;
  const damage = Math.max(1, enemy.atk + randInt(-1, 2) + fearBonus - player.defense);
  player.hp -= damage;
  addEffect("hit", player.x, player.y, enemy.color);
  addFloatingText(player.x, player.y, `-${damage}`, palette.coral);
  addLog(`${enemy.name}の攻撃。${player.name}に${damage}ダメージ。`);

  if (player.hp <= 0) {
    player.hp = 0;
    player.down = true;
    player.acted = true;
    addLog(`${player.name}が倒れた。隣で救助ベルを鳴らそう。`);
    showToast(`${player.name}が倒れた。`);
  }
}

function updateBondAfterTurn() {
  const alive = livingPlayers();
  if (alive.length < 2) return;
  const d = manhattan(alive[0].x, alive[0].y, alive[1].x, alive[1].y);
  const before = game.bond;
  if (d <= 2) {
    game.bond = clamp(game.bond + 6, 0, 100);
  } else if (d >= 8) {
    game.bond = clamp(game.bond - 9, 0, 100);
  } else if (d >= 6) {
    game.bond = clamp(game.bond - 4, 0, 100);
  }

  if (before >= 25 && game.bond < 25) {
    addLog("二人が離れすぎて絆が弱まった。敵の攻撃が少し痛くなる。");
    showToast("離れすぎ。合流して絆を戻そう。");
  } else if (before < 80 && game.bond >= 80) {
    addLog("二人の息が合っている。近くで攻撃すると追撃が強くなる。");
  }
}

function enemyWander(enemy) {
  if (Math.random() > 0.45) return;
  const shuffled = [...dirs].sort(() => Math.random() - 0.5);
  for (const dir of shuffled) {
    const x = enemy.x + dir.x;
    const y = enemy.y + dir.y;
    if (isWalkable(x, y) && !blockedByActor(x, y)) {
      enemy.x = x;
      enemy.y = y;
      return;
    }
  }
}

function stepToward(enemy, target) {
  const queue = [{ x: enemy.x, y: enemy.y, first: null }];
  const visited = makeGrid(false);
  visited[enemy.y][enemy.x] = true;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.x === target.x && current.y === target.y) {
      return current.first;
    }

    for (const dir of dirs) {
      const x = current.x + dir.x;
      const y = current.y + dir.y;
      if (!inBounds(x, y) || visited[y][x] || !isWalkable(x, y)) continue;
      if (enemyAt(x, y) && !(x === target.x && y === target.y)) continue;
      visited[y][x] = true;
      queue.push({
        x,
        y,
        first: current.first || { x, y },
      });
    }
  }

  return null;
}

function tryRescue(player) {
  if (game.bells <= 0) return false;
  const ally = game.players.find((target) => target.id !== player.id && target.down && distance(player, target) <= 1.5);
  if (!ally) return false;
  game.bells -= 1;
  ally.down = false;
  ally.hp = Math.ceil(ally.maxHp * 0.45);
  ally.acted = true;
  addRingEffect(ally.x, ally.y, palette.brass);
  addLog(`${player.name}が救助ベルを鳴らした。${ally.name}が立ち上がった。`);
  return true;
}

function pickupItems(player) {
  const item = game.items.find((candidate) => candidate.x === player.x && candidate.y === player.y);
  if (!item) return;

  game.items = game.items.filter((candidate) => candidate.id !== item.id);

  if (item.kind === "herb") {
    const amount = healPlayer(player, 10 + game.floor, true);
    addLog(`${player.name}は薬草で${amount}回復した。`);
  } else if (item.kind === "stardust") {
    const points = 35 + game.floor * 10;
    game.score += points;
    addFloatingText(player.x, player.y, `+${points}`, palette.brass);
    addLog(`${player.name}は星くずを拾った。+${points}pt`);
  } else if (item.kind === "guard") {
    player.defense = Math.min(3, player.defense + 1);
    addLog(`${player.name}の守りが上がった。`);
  } else if (item.kind === "bell") {
    game.bells += 1;
    addLog("救助ベルを見つけた。");
  }

  addEffect("spark", player.x, player.y, itemColor(item.kind));
}

function maybeDropItem(x, y) {
  if (Math.random() > 0.18) return;
  if (game.items.some((item) => item.x === x && item.y === y)) return;
  const kind = Math.random() < 0.6 ? "stardust" : "herb";
  game.items.push({
    id: cryptoId(),
    kind,
    name: kind === "stardust" ? "星くず" : "薬草",
    x,
    y,
    pulse: Math.random() * Math.PI * 2,
  });
}

function healPlayer(player, amount, floating) {
  if (player.down) return 0;
  const before = player.hp;
  player.hp = Math.min(player.maxHp, player.hp + amount);
  const healed = player.hp - before;
  if (healed > 0 && floating) {
    addFloatingText(player.x, player.y, `+${healed}`, palette.teal);
  }
  return healed;
}

function checkStairs() {
  if (game.gameOver || game.victory) return;
  const alive = livingPlayers();
  if (alive.length < 2) return;

  if (!allSealsActive()) {
    const someoneClose = alive.some((player) => manhattan(player.x, player.y, game.stairs.x, game.stairs.y) <= 1);
    if (someoneClose) showToast("階段は封印中。二人で紋章を解除しよう。");
    return;
  }

  const close = alive.every((player) => manhattan(player.x, player.y, game.stairs.x, game.stairs.y) <= 1);
  ui.stairs.textContent = close ? "準備OK" : "探索中";

  if (!close) {
    const someoneClose = alive.some((player) => manhattan(player.x, player.y, game.stairs.x, game.stairs.y) <= 1);
    if (someoneClose) showToast("もう一人も階段のそばへ。");
    return;
  }

  if (game.floor >= TARGET_FLOOR) {
    winGame();
    return;
  }

  game.score += 120 + game.floor * 50;
  game.floor += 1;
  game.turn = 1;
  for (const player of game.players) {
    player.hp = Math.min(player.maxHp, player.hp + 6);
    player.defense = Math.max(0, player.defense - 1);
    player.cooldown = 0;
    player.acted = false;
  }
  addLog(`二人は地下${game.floor}階へ降りた。`);
  showToast(`B${game.floor}F`);
  buildFloor();
  updateAll();
}

function winGame() {
  game.victory = true;
  game.score += 1000;
  saveBestScore();
  ui.endTitle.textContent = "星核を見つけた";
  ui.endText.textContent = `B${TARGET_FLOOR}Fを突破。スコア ${game.score} pt`;
  ui.endOverlay.hidden = false;
  addLog("二人は星核を抱えて帰還した。");
  updateAll();
}

function checkGameEnd() {
  if (game.players.every((player) => player.down)) {
    game.gameOver = true;
    saveBestScore();
    ui.endTitle.textContent = "冒険終了";
    ui.endText.textContent = `B${game.floor}Fで力尽きた。スコア ${game.score} pt`;
    ui.endOverlay.hidden = false;
  }
}

function everyoneReadyForEnemyTurn() {
  return game.players.every((player) => player.down || player.acted);
}

function revealAroundPlayers() {
  game.visible = makeGrid(false);
  for (const player of game.players) {
    if (player.down) continue;
    for (let y = player.y - VISION_RADIUS; y <= player.y + VISION_RADIUS; y += 1) {
      for (let x = player.x - VISION_RADIUS; x <= player.x + VISION_RADIUS; x += 1) {
        if (!inBounds(x, y)) continue;
        if (distance(player, { x, y }) > VISION_RADIUS) continue;
        if (!hasLineOfSight(player.x, player.y, x, y)) continue;
        game.visible[y][x] = true;
        game.seen[y][x] = true;
      }
    }
  }
}

function hasLineOfSight(x1, y1, x2, y2) {
  let x = x1;
  let y = y1;
  const dx = Math.abs(x2 - x1);
  const dy = -Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx + dy;

  while (true) {
    if (!(x === x1 && y === y1) && !(x === x2 && y === y2) && !isWalkable(x, y)) {
      return false;
    }
    if (x === x2 && y === y2) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }

  return true;
}

function updateAll() {
  saveBestScore();
  const activeSeals = game.seals.filter((seal) => seal.active).length;
  ui.floor.textContent = `B${game.floor}F`;
  ui.score.textContent = `${game.score} pt`;
  ui.best.textContent = `Best ${bestScore}`;
  ui.bell.textContent = `${game.bells}`;
  ui.seal.textContent = `${activeSeals}/${game.seals.length || 2}`;
  ui.bond.textContent = `${game.bond}`;
  ui.turn.textContent = `${game.turn}`;
  ui.stairs.textContent = !allSealsActive()
    ? "封印中"
    : livingPlayers().every((player) => manhattan(player.x, player.y, game.stairs.x, game.stairs.y) <= 1)
      ? "準備OK"
      : "集合";
  ui.goal.textContent = getGoalText();
  renderParty();
  renderLogs();
}

function getGoalText() {
  const nextSeal = game.seals.find((seal) => !seal.active);
  if (nextSeal) {
    const owner = game.players[nextSeal.owner];
    return `${owner.name}が${nextSeal.name}へ`;
  }
  return "階段へ二人で集合";
}

function renderParty() {
  ui.party.innerHTML = "";
  for (const player of game.players) {
    const card = document.createElement("article");
    card.className = "player-card";
    if (player.acted && !player.down) card.classList.add("waiting");
    if (player.down) card.classList.add("down");
    card.style.borderLeftColor = player.color;

    const hpRatio = player.maxHp === 0 ? 0 : player.hp / player.maxHp;
    const actionLabel = player.down ? "DOWN" : player.acted ? "待機中" : "行動可";

    card.innerHTML = `
      <div class="portrait">
        <canvas width="64" height="64" aria-hidden="true"></canvas>
      </div>
      <div class="player-info">
        <div class="player-head">
          <strong>${player.name}</strong>
          <span>${actionLabel}</span>
        </div>
        <div class="bar" aria-label="${player.name} HP">
          <div class="bar-fill" style="width:${Math.max(0, hpRatio * 100)}%; background:${player.color}"></div>
        </div>
        <div class="player-meta">
          <span>HP ${player.hp}/${player.maxHp}</span>
          <span>${sealStatusFor(player)}</span>
          <span>${player.skillName} ${player.cooldown || player.skillHint}</span>
        </div>
      </div>
    `;
    ui.party.appendChild(card);
    drawPortrait(card.querySelector("canvas"), player);
  }
}

function sealStatusFor(player) {
  const seal = game.seals.find((candidate) => candidate.owner === player.id);
  if (!seal) return player.sealName;
  return `${player.sealName} ${seal.active ? "済" : "未"}`;
}

function drawPortrait(targetCanvas, player) {
  const pctx = targetCanvas.getContext("2d");
  pctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  pctx.fillStyle = "rgba(0,0,0,0.18)";
  pctx.fillRect(5, 50, 54, 7);
  pctx.save();
  pctx.translate(8, 8);
  pctx.scale(1.5, 1.5);
  drawPlayerBodyOnContext(pctx, 0, 0, player, 1, performance.now());
  pctx.restore();
}

function renderLogs() {
  ui.log.innerHTML = "";
  for (const entry of game.logs.slice(-9)) {
    const item = document.createElement("li");
    item.textContent = entry;
    ui.log.appendChild(item);
  }
}

function addLog(message) {
  game.logs.push(message);
  if (game.logs.length > 80) {
    game.logs = game.logs.slice(-80);
  }
}

function showToast(message) {
  game.lastMessage = message;
  game.messageTimer = 110;
  ui.toast.textContent = message;
  ui.toast.hidden = false;
}

function draw(time) {
  const dt = Math.min(40, time - lastFrame || 16);
  lastFrame = time;

  updateEffects(dt);
  drawDungeon(time);
  drawMiniMap();

  if (game.messageTimer > 0) {
    game.messageTimer -= 1;
    if (game.messageTimer <= 0) ui.toast.hidden = true;
  }

  requestAnimationFrame(draw);
}

function getCamera() {
  const viewW = canvas.width / TILE;
  const viewH = canvas.height / TILE;
  const focus = game.players.reduce(
    (sum, player) => {
      sum.x += player.x;
      sum.y += player.y;
      return sum;
    },
    { x: 0, y: 0 },
  );
  focus.x /= game.players.length;
  focus.y /= game.players.length;
  return {
    x: clamp(Math.floor(focus.x - viewW / 2), 0, Math.max(0, MAP_W - viewW)),
    y: clamp(Math.floor(focus.y - viewH / 2), 0, Math.max(0, MAP_H - viewH)),
    width: viewW,
    height: viewH,
  };
}

function toScreen(x, y) {
  return {
    x: Math.round((x - renderCamera.x) * TILE),
    y: Math.round((y - renderCamera.y) * TILE),
  };
}

function inCamera(x, y) {
  return (
    x >= renderCamera.x - 1 &&
    y >= renderCamera.y - 1 &&
    x <= renderCamera.x + renderCamera.width + 1 &&
    y <= renderCamera.y + renderCamera.height + 1
  );
}

function drawDungeon(time) {
  renderCamera = getCamera();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = palette.void;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startX = Math.max(0, Math.floor(renderCamera.x) - 1);
  const endX = Math.min(MAP_W - 1, Math.ceil(renderCamera.x + renderCamera.width) + 1);
  const startY = Math.max(0, Math.floor(renderCamera.y) - 1);
  const endY = Math.min(MAP_H - 1, Math.ceil(renderCamera.y + renderCamera.height) + 1);

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      if (!game.seen[y][x]) {
        drawUnknownTile(x, y);
        continue;
      }
      drawTile(x, y, game.map[y][x], game.visible[y][x]);
    }
  }

  for (const seal of game.seals) {
    if (game.seen[seal.y][seal.x] && inCamera(seal.x, seal.y)) drawSeal(seal, time);
  }

  if (isVisible(game.stairs.x, game.stairs.y) && inCamera(game.stairs.x, game.stairs.y)) {
    drawStairs(game.stairs.x, game.stairs.y, time);
  }

  for (const item of game.items) {
    if (isVisible(item.x, item.y) && inCamera(item.x, item.y)) drawItem(item, time);
  }

  for (const enemy of game.enemies) {
    if (isVisible(enemy.x, enemy.y) && inCamera(enemy.x, enemy.y)) drawEnemy(enemy, time);
  }

  for (const player of game.players) {
    if (game.seen[player.y][player.x] && inCamera(player.x, player.y)) drawPlayer(player, time);
  }

  for (const effect of game.effects) {
    drawEffect(effect);
  }

  drawFog();
  drawObjectivePointer(time);
}

function drawUnknownTile(x, y) {
  const { x: px, y: py } = toScreen(x, y);
  ctx.fillStyle = "#080a08";
  ctx.fillRect(px, py, TILE, TILE);
  const n = noise(x, y, 17);
  if (n > 0.72) {
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    ctx.fillRect(px + 21, py + 21, 6, 6);
  }
}

function drawTile(x, y, type, visible) {
  const { x: px, y: py } = toScreen(x, y);
  if (type === "wall") {
    const wall = pickSprite(spriteIds.walls, x, y, 31);
    ctx.fillStyle = palette.wallDark;
    ctx.fillRect(px, py, TILE, TILE);
    if (!drawSprite(wall, px, py, TILE, TILE)) {
      ctx.fillStyle = palette.wall;
      ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
    }
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(px, py + TILE - 8, TILE, 8);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    if (noise(x, y, 7) > 0.58) ctx.fillRect(px + 7, py + 8, 19, 4);
    return;
  }

  const floor = pickSprite(spriteIds.floors, x, y, 11);
  ctx.fillStyle = type === "moss" ? "#425332" : type === "crack" ? "#44392f" : palette.floor;
  ctx.fillRect(px, py, TILE, TILE);
  drawSprite(floor, px, py, TILE, TILE);
  ctx.fillStyle = "rgba(255,255,255,0.045)";
  ctx.fillRect(px + 3, py + 3, TILE - 6, 2);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(px + 3, py + TILE - 5, TILE - 6, 2);

  if (type === "moss") {
    drawMoss(px, py, visible, x, y);
  } else if (type === "crack") {
    drawCrack(px, py);
  } else if (noise(x, y, 21) > 0.7) {
    ctx.fillStyle = "rgba(247,239,227,0.08)";
    ctx.fillRect(px + 9, py + 16, 5, 3);
    ctx.fillRect(px + 31, py + 34, 7, 3);
  }
}

function drawMoss(px, py, visible, tileX, tileY) {
  ctx.fillStyle = visible ? "rgba(138,162,109,0.55)" : "rgba(138,162,109,0.25)";
  ctx.fillRect(px + 6, py + 31, 17, 6);
  ctx.fillRect(px + 26, py + 12, 15, 8);
  ctx.fillStyle = "rgba(198,223,143,0.38)";
  ctx.fillRect(px + 12, py + 28, 5, 5);
  ctx.fillRect(px + 34, py + 10, 4, 4);
  drawSprite(pickSprite(spriteIds.moss, tileX, tileY, 9), px + 8, py + 6, 28, 28);
}

function drawCrack(px, py) {
  ctx.strokeStyle = "rgba(18,16,14,0.72)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px + 12, py + 10);
  ctx.lineTo(px + 23, py + 21);
  ctx.lineTo(px + 18, py + 32);
  ctx.lineTo(px + 34, py + 41);
  ctx.stroke();
}

function drawStairs(x, y, time) {
  const { x: px, y: py } = toScreen(x, y);
  const pulse = (Math.sin(time / 360) + 1) / 2;
  ctx.fillStyle = `rgba(240,179,77,${0.2 + pulse * 0.18})`;
  ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
  drawSprite(406, px + 8, py + 4, 32, 32);
  ctx.fillStyle = "#2a2218";
  ctx.fillRect(px + 8, py + 20, 32, 20);
  ctx.fillStyle = "#7a5732";
  ctx.fillRect(px + 14, py + 22, 24, 4);
  ctx.fillRect(px + 11, py + 29, 24, 4);
  ctx.fillRect(px + 8, py + 36, 24, 4);
  ctx.fillStyle = "#fff0b4";
  ctx.fillRect(px + 22, py + 10, 5, 5);
}

function drawSeal(seal, time) {
  const { x: px, y: py } = toScreen(seal.x, seal.y);
  const pulse = (Math.sin(time / 260 + seal.owner) + 1) / 2;
  ctx.fillStyle = seal.active ? "rgba(255,245,223,0.12)" : `rgba(94,201,207,${0.1 + pulse * 0.13})`;
  ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
  ctx.strokeStyle = seal.active ? "#fff5df" : seal.color;
  ctx.lineWidth = 3;
  ctx.strokeRect(px + 8, py + 8, TILE - 16, TILE - 16);
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.fillRect(px + 14, py + 14, TILE - 28, TILE - 28);
  drawSprite(seal.owner === 0 ? spriteIds.lampSeal : spriteIds.bladeSeal, px + 10, py + 10, 28, 28);
  ctx.fillStyle = seal.active ? "#fff5df" : seal.color;
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(seal.active ? "済" : seal.owner === 0 ? "灯" : "剣", px + TILE / 2, py + TILE / 2);
  ctx.textBaseline = "alphabetic";
}

function drawObjectivePointer(time) {
  const target = getObjectivePoint();
  if (!target) return;
  if (inCamera(target.x, target.y)) return;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const targetScreen = {
    x: (target.x + 0.5 - renderCamera.x) * TILE,
    y: (target.y + 0.5 - renderCamera.y) * TILE,
  };
  const dx = targetScreen.x - centerX;
  const dy = targetScreen.y - centerY;
  const scale = Math.min(
    Math.abs(dx) > 0 ? (canvas.width / 2 - 34) / Math.abs(dx) : Infinity,
    Math.abs(dy) > 0 ? (canvas.height / 2 - 34) / Math.abs(dy) : Infinity,
  );
  const x = centerX + dx * scale;
  const y = centerY + dy * scale;
  const pulse = (Math.sin(time / 220) + 1) / 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = target.color || palette.brass;
  ctx.globalAlpha = 0.78 + pulse * 0.22;
  ctx.fillRect(-13, -13, 26, 26);
  ctx.strokeStyle = "#fff5df";
  ctx.lineWidth = 3;
  ctx.strokeRect(-13, -13, 26, 26);
  ctx.restore();

  ctx.fillStyle = "#10110f";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(target.label, x, y);
  ctx.textBaseline = "alphabetic";
}

function getObjectivePoint() {
  const seal = game.seals.find((candidate) => !candidate.active);
  if (seal) {
    return { x: seal.x, y: seal.y, color: seal.color, label: seal.owner === 0 ? "灯" : "剣" };
  }
  return { x: game.stairs.x, y: game.stairs.y, color: palette.brass, label: "階" };
}

function drawItem(item, time) {
  const { x: px, y: py } = toScreen(item.x, item.y);
  const bob = Math.sin(time / 260 + item.pulse) * 3;
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(px + 12, py + 36, 24, 6);

  if (item.kind === "herb") {
    drawSprite(spriteIds.herb, px + 7, py + 4 + bob, 34, 34);
  } else if (item.kind === "stardust") {
    ctx.fillStyle = "rgba(240,179,77,0.2)";
    ctx.fillRect(px + 10, py + 7 + bob, 28, 28);
    drawSprite(spriteIds.stardust, px + 8, py + 4 + bob, 32, 32);
  } else if (item.kind === "guard") {
    drawSprite(spriteIds.guard, px + 7, py + 3 + bob, 34, 34);
  } else {
    drawSprite(spriteIds.bell, px + 8, py + 3 + bob, 32, 32);
  }
}

function drawPlayer(player, time) {
  const { x: px, y: py } = toScreen(player.x, player.y);
  const bob = player.down ? 0 : Math.sin(time / 210 + player.id) * 2;
  const waitingTint = player.acted ? 0.72 : 1;

  ctx.save();
  ctx.globalAlpha = player.down ? 0.66 : 1;
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.fillRect(px + 9, py + 38, 30, 7);

  if (player.down) {
    ctx.translate(px + 24, py + 27);
    ctx.rotate(-0.55);
    ctx.scale(ACTOR_SCALE, ACTOR_SCALE);
    drawPlayerBody(-16, -18, player, waitingTint, 0);
  } else {
    ctx.translate(px, py + bob);
    ctx.scale(ACTOR_SCALE, ACTOR_SCALE);
    drawPlayerBody(0, 0, player, waitingTint, time);
    drawDirectionSpark(0, 0, player);
  }

  ctx.restore();
}

function drawPlayerBody(px, py, player, tint, time) {
  drawPlayerBodyOnContext(ctx, px, py, player, tint, time);
}

function drawPlayerBodyOnContext(targetCtx, px, py, player, tint, time) {
  const robe = shade(player.color, tint);
  targetCtx.fillStyle = robe;
  targetCtx.fillRect(px + 9, py + 13, 14, 13);
  targetCtx.fillRect(px + 7, py + 17, 18, 7);
  targetCtx.fillStyle = player.accent;
  targetCtx.fillRect(px + 11, py + 15, 10, 3);
  targetCtx.fillStyle = "#2a1c16";
  targetCtx.fillRect(px + 10, py + 7, 12, 9);
  targetCtx.fillStyle = "#f1c9a5";
  targetCtx.fillRect(px + 11, py + 9, 10, 8);
  targetCtx.fillStyle = "#201814";
  targetCtx.fillRect(px + 13, py + 12, 2, 2);
  targetCtx.fillRect(px + 18, py + 12, 2, 2);
  targetCtx.fillStyle = robe;
  targetCtx.fillRect(px + 8, py + 5, 16, 4);
  targetCtx.fillRect(px + 12, py + 2, 8, 4);
  targetCtx.fillStyle = "rgba(255,255,255,0.7)";
  targetCtx.fillRect(px + 14, py + 3, 3, 2);

  if (player.id === 1) {
    targetCtx.fillStyle = "#d9dde0";
    targetCtx.fillRect(px + 24, py + 9, 2, 16);
    targetCtx.fillStyle = player.accent;
    targetCtx.fillRect(px + 23, py + 8, 4, 3);
  } else {
    const glow = 0.45 + Math.sin(time / 240) * 0.22;
    targetCtx.fillStyle = `rgba(105,185,195,${glow})`;
    targetCtx.fillRect(px + 4, py + 11, 5, 8);
    targetCtx.fillStyle = "#d7fbff";
    targetCtx.fillRect(px + 5, py + 12, 3, 3);
  }
}

function drawDirectionSpark(px, py, player) {
  const sx = px + 15 + player.dx * 9;
  const sy = py + 17 + player.dy * 9;
  ctx.fillStyle = player.accent;
  ctx.fillRect(sx, sy, 3, 3);
}

function drawEnemy(enemy, time) {
  const { x: px, y: py } = toScreen(enemy.x, enemy.y);
  const wobble = Math.sin(time / 240 + enemy.wobble) * 2.4;
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.fillRect(px + 10, py + 38, 28, 7);

  if (enemy.key === "ember") {
    drawSprite(spriteIds.ember, px + 8, py + 5 + wobble, 32, 32);
    ctx.fillStyle = enemy.color;
    ctx.fillRect(px + 15, py + 19 + wobble, 19, 20);
    ctx.fillRect(px + 20, py + 10 + wobble, 10, 12);
    ctx.fillStyle = enemy.accent;
    ctx.fillRect(px + 21, py + 21 + wobble, 8, 12);
    ctx.fillStyle = "#2d1712";
    ctx.fillRect(px + 20, py + 27 + wobble, 3, 3);
    ctx.fillRect(px + 30, py + 27 + wobble, 3, 3);
  } else if (enemy.key === "moss") {
    drawSprite(spriteIds.mossEnemy, px + 7, py + 5 + wobble, 34, 34);
    ctx.fillStyle = "#394832";
    ctx.fillRect(px + 10, py + 22 + wobble, 26, 18);
    ctx.fillStyle = enemy.color;
    ctx.fillRect(px + 14, py + 15 + wobble, 22, 20);
    ctx.fillStyle = enemy.accent;
    ctx.fillRect(px + 18, py + 13 + wobble, 6, 4);
    ctx.fillRect(px + 28, py + 20 + wobble, 5, 5);
    ctx.fillStyle = "#20251d";
    ctx.fillRect(px + 19, py + 25 + wobble, 3, 3);
    ctx.fillRect(px + 29, py + 25 + wobble, 3, 3);
  } else if (enemy.key === "crystal") {
    drawSprite(spriteIds.crystalEnemy, px + 8, py + 2 + wobble, 32, 32);
    ctx.fillStyle = "#34444c";
    ctx.fillRect(px + 14, py + 24 + wobble, 21, 16);
    ctx.fillStyle = enemy.color;
    ctx.fillRect(px + 21, py + 8 + wobble, 10, 31);
    ctx.fillRect(px + 13, py + 20 + wobble, 10, 15);
    ctx.fillRect(px + 30, py + 17 + wobble, 9, 18);
    ctx.fillStyle = enemy.accent;
    ctx.fillRect(px + 24, py + 12 + wobble, 3, 10);
  } else {
    drawSprite(spriteIds.totemEnemy, px + 8, py + 7 + wobble, 32, 32);
    ctx.fillStyle = "#5a554c";
    ctx.fillRect(px + 11, py + 15 + wobble, 27, 25);
    ctx.fillStyle = enemy.color;
    ctx.fillRect(px + 15, py + 12 + wobble, 21, 19);
    ctx.fillRect(px + 18, py + 31 + wobble, 8, 9);
    ctx.fillRect(px + 30, py + 31 + wobble, 8, 9);
    ctx.fillStyle = enemy.accent;
    ctx.fillRect(px + 18, py + 18 + wobble, 5, 5);
    ctx.fillRect(px + 29, py + 18 + wobble, 5, 5);
  }

  drawEnemyHp(enemy, px, py);
}

function drawEnemyHp(enemy, px, py) {
  if (enemy.hp === enemy.maxHp) return;
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fillRect(px + 8, py + 4, 32, 5);
  ctx.fillStyle = palette.coral;
  ctx.fillRect(px + 8, py + 4, Math.max(1, 32 * (enemy.hp / enemy.maxHp)), 5);
}

function drawEffect(effect) {
  if (!inCamera(effect.x, effect.y)) return;
  const { x: px, y: py } = toScreen(effect.x, effect.y);
  const t = 1 - effect.life / effect.maxLife;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - t);

  if (effect.kind === "floating") {
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = effect.color;
    ctx.fillText(effect.text, px + TILE / 2, py + 12 - t * 20);
  } else if (effect.kind === "ring") {
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 4;
    ctx.strokeRect(px + 8 - t * 9, py + 8 - t * 9, 32 + t * 18, 32 + t * 18);
  } else if (effect.kind === "slash") {
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(px + 10, py + 38);
    ctx.lineTo(px + 38, py + 10);
    ctx.stroke();
  } else if (effect.kind === "bump") {
    ctx.fillStyle = effect.color;
    ctx.fillRect(px + 15, py + 15, 18, 18);
  } else {
    ctx.fillStyle = effect.color;
    ctx.fillRect(px + 18 - t * 6, py + 18 - t * 6, 12 + t * 12, 12 + t * 12);
  }
  ctx.restore();
}

function drawFog() {
  const startX = Math.max(0, Math.floor(renderCamera.x) - 1);
  const endX = Math.min(MAP_W - 1, Math.ceil(renderCamera.x + renderCamera.width) + 1);
  const startY = Math.max(0, Math.floor(renderCamera.y) - 1);
  const endY = Math.min(MAP_H - 1, Math.ceil(renderCamera.y + renderCamera.height) + 1);

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      if (!game.seen[y][x]) continue;
      if (!game.visible[y][x]) {
        const { x: px, y: py } = toScreen(x, y);
        ctx.fillStyle = palette.fog;
        ctx.fillRect(px, py, TILE, TILE);
      }
    }
  }
}

function drawMiniMap() {
  const sx = miniCanvas.width / MAP_W;
  const sy = miniCanvas.height / MAP_H;
  miniCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
  miniCtx.fillStyle = "#070807";
  miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);

  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      if (!game.seen[y][x]) continue;
      if (game.map[y][x] === "wall") {
        miniCtx.fillStyle = game.visible[y][x] ? "#3c4239" : "#20231f";
      } else {
        miniCtx.fillStyle = game.visible[y][x] ? "#82725b" : "#3b352d";
      }
      miniCtx.fillRect(Math.floor(x * sx), Math.floor(y * sy), Math.ceil(sx), Math.ceil(sy));
    }
  }

  if (game.seen[game.stairs.y][game.stairs.x]) {
    miniCtx.fillStyle = palette.brass;
    miniCtx.fillRect(game.stairs.x * sx, game.stairs.y * sy, sx + 1, sy + 1);
  }

  for (const seal of game.seals) {
    miniCtx.fillStyle = seal.active ? "#fff5df" : seal.color;
    miniCtx.fillRect(seal.x * sx - 1, seal.y * sy - 1, sx + 3, sy + 3);
  }

  for (const enemy of game.enemies) {
    if (!isVisible(enemy.x, enemy.y)) continue;
    miniCtx.fillStyle = palette.coral;
    miniCtx.fillRect(enemy.x * sx, enemy.y * sy, sx + 1, sy + 1);
  }

  for (const player of game.players) {
    miniCtx.fillStyle = player.color;
    miniCtx.fillRect(player.x * sx - 1, player.y * sy - 1, sx + 3, sy + 3);
  }
}

function updateEffects(dt) {
  for (const effect of game.effects) {
    effect.life -= dt;
  }
  game.effects = game.effects.filter((effect) => effect.life > 0);
}

function drawSprite(index, x, y, width = TILE, height = TILE) {
  if (!spriteSheet.complete || !spriteSheet.naturalWidth) return false;
  const col = index % SPRITE_COLS;
  const row = Math.floor(index / SPRITE_COLS);
  const sx = col * (SPRITE_TILE + SPRITE_MARGIN);
  const sy = row * (SPRITE_TILE + SPRITE_MARGIN);
  ctx.drawImage(spriteSheet, sx, sy, SPRITE_TILE, SPRITE_TILE, x, y, width, height);
  return true;
}

function pickSprite(list, x, y, salt) {
  return list[Math.floor(noise(x, y, salt) * list.length) % list.length];
}

function addEffect(kind, x, y, color) {
  game.effects.push({ kind, x, y, color, life: 260, maxLife: 260 });
}

function addRingEffect(x, y, color) {
  game.effects.push({ kind: "ring", x, y, color, life: 520, maxLife: 520 });
}

function addFloatingText(x, y, text, color) {
  game.effects.push({ kind: "floating", x, y, text, color, life: 760, maxLife: 760 });
}

function makeGrid(value) {
  return Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => value));
}

function rectsOverlap(a, b, padding) {
  return !(
    a.x + a.w + padding < b.x ||
    b.x + b.w + padding < a.x ||
    a.y + a.h + padding < b.y ||
    b.y + b.h + padding < a.y
  );
}

function centerOf(room) {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

function farthestRoomFrom(point) {
  let selected = game.rooms[0];
  let best = -1;
  for (const room of game.rooms) {
    const center = centerOf(room);
    const score = manhattan(point.x, point.y, center.x, center.y);
    if (score > best) {
      selected = room;
      best = score;
    }
  }
  return selected;
}

function randomOpenSpot(minDistanceFromStart = 0) {
  const start = game.players[0] || { x: 0, y: 0 };
  for (let i = 0; i < 400; i += 1) {
    const room = game.rooms[randInt(0, game.rooms.length - 1)];
    const x = randInt(room.x, room.x + room.w - 1);
    const y = randInt(room.y, room.y + room.h - 1);
    if (!isWalkable(x, y)) continue;
    if (manhattan(start.x, start.y, x, y) < minDistanceFromStart) continue;
    if (blockedByActor(x, y)) continue;
    if (game.items.some((item) => item.x === x && item.y === y)) continue;
    if (game.seals?.some((seal) => seal.x === x && seal.y === y)) continue;
    if (x === game.stairs.x && y === game.stairs.y) continue;
    return { x, y };
  }
  return null;
}

function nearestOpen(x, y, blocked) {
  const queue = [{ x, y }];
  const visited = makeGrid(false);
  if (inBounds(x, y)) visited[y][x] = true;
  while (queue.length > 0) {
    const point = queue.shift();
    const blockedHere = blocked.some((candidate) => candidate.x === point.x && candidate.y === point.y);
    if (isWalkable(point.x, point.y) && !blockedHere) return point;
    for (const dir of dirs) {
      const nx = point.x + dir.x;
      const ny = point.y + dir.y;
      if (!inBounds(nx, ny) || visited[ny][nx]) continue;
      visited[ny][nx] = true;
      queue.push({ x: nx, y: ny });
    }
  }
  return { x, y };
}

function isWalkable(x, y) {
  return inBounds(x, y) && game.map[y][x] !== "wall";
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
}

function enemyAt(x, y) {
  return game.enemies.find((enemy) => enemy.x === x && enemy.y === y);
}

function blockedByActor(x, y) {
  return Boolean(
    enemyAt(x, y) ||
      game.players.some((player) => player.x === x && player.y === y),
  );
}

function livingPlayers() {
  return game.players.filter((player) => !player.down);
}

function nearestLivingPlayer(source) {
  let best = null;
  let bestDistance = Infinity;
  for (const player of livingPlayers()) {
    const d = manhattan(source.x, source.y, player.x, player.y);
    if (d < bestDistance) {
      best = player;
      bestDistance = d;
    }
  }
  return best;
}

function isVisible(x, y) {
  return inBounds(x, y) && game.visible[y][x];
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
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
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function noise(x, y, salt) {
  const value = Math.sin((x * 127.1 + y * 311.7 + salt * 74.7) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, Math.floor(((n >> 16) & 255) * amount)));
  const g = Math.max(0, Math.min(255, Math.floor(((n >> 8) & 255) * amount)));
  const b = Math.max(0, Math.min(255, Math.floor((n & 255) * amount)));
  return `rgb(${r},${g},${b})`;
}

function itemColor(kind) {
  if (kind === "herb") return palette.moss;
  if (kind === "guard") return palette.violet;
  if (kind === "bell") return palette.brass;
  return palette.brass;
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

function saveBestScore() {
  if (!game || game.score <= bestScore) return;
  bestScore = game.score;
  try {
    localStorage.setItem(STORAGE_KEY, String(bestScore));
  } catch {
    // Local storage can be disabled in private browsing.
  }
}

function handleKey(event) {
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  const activeTag = document.activeElement?.tagName;
  if (activeTag === "BUTTON" && key === " ") return;

  const actions = {
    w: { player: 0, type: "move", dx: 0, dy: -1 },
    a: { player: 0, type: "move", dx: -1, dy: 0 },
    s: { player: 0, type: "move", dx: 0, dy: 1 },
    d: { player: 0, type: "move", dx: 1, dy: 0 },
    e: { player: 0, type: "skill" },
    " ": { player: 0, type: "wait" },
    arrowup: { player: 1, type: "move", dx: 0, dy: -1 },
    arrowleft: { player: 1, type: "move", dx: -1, dy: 0 },
    arrowdown: { player: 1, type: "move", dx: 0, dy: 1 },
    arrowright: { player: 1, type: "move", dx: 1, dy: 0 },
    "/": { player: 1, type: "skill" },
    enter: { player: 1, type: "wait" },
  };

  const action = actions[key];
  if (!action) return;
  event.preventDefault();
  performAction(action.player, action);
}

function bindEvents() {
  document.addEventListener("keydown", handleKey);
  ui.restartButton.addEventListener("click", createGame);
  ui.endRestartButton.addEventListener("click", () => {
    ui.endOverlay.hidden = true;
    createGame();
  });
  ui.helpButton.addEventListener("click", () => ui.helpDialog.showModal());

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = {
        player: Number(button.dataset.player),
        type: button.dataset.action,
        dx: Number(button.dataset.dx || 0),
        dy: Number(button.dataset.dy || 0),
      };
      performAction(action.player, action);
    });
  });
}

bindEvents();
createGame();
spriteSheet.addEventListener("load", () => {
  if (game) updateAll();
});
requestAnimationFrame(draw);
