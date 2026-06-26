/* Headless logic test: loads the DOM-free modules, generates a world,
 * and simulates combats (including the final boss) to catch errors. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// fake browser-ish globals the logic modules touch
const store = {};
const ctx = {
  window: {},
  performance: { now: () => 12345 },
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  },
  console: console,
  Math: Math, JSON: JSON, Date: Date, parseInt: parseInt, Uint8Array: Uint8Array,
};
ctx.global = ctx;
vm.createContext(ctx);

const root = path.join(__dirname, '..');
const files = [
  'src/rng.js', 'src/data/lore.js', 'src/data/skills.js', 'src/data/items.js',
  'src/data/abilities.js', 'src/data/bestiary.js', 'src/data/quests.js',
  'src/world.js', 'src/dungeon.js', 'src/player.js', 'src/combat.js', 'src/save.js',
];
for (const f of files) {
  const code = fs.readFileSync(path.join(root, f), 'utf8');
  vm.runInContext(code, ctx, { filename: f });
}
const TLU = ctx.window.TLU;

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; } else { fail++; console.error('  ✗ FAIL: ' + name); } }

// ---- worldgen ----
const world = TLU.World.generate('test-seed-001', {});
ok('world has tiles', world.tiles.length === world.h && world.tiles[0].length === world.w);
ok('world has >=4 towns', world.towns.length >= 4);
ok('world has vaults', world.vaults.length >= 6);
ok('world has aharietiam', !!world.aharietiam);
ok('start is passable', world.passable(world.start.x, world.start.y));
ok('4 vaults carry fragments', world.vaults.filter(v => v.hasFragment).length === 4);

// deterministic?
const world2 = TLU.World.generate('test-seed-001', {});
ok('worldgen deterministic', world2.towns[0].x === world.towns[0].x && world2.aharietiam.x === world.aharietiam.x);

// ---- dungeon ----
const dseed = 'd1';
const floor = TLU.Dungeon.genFloor(dseed, { level: 5, depth: 3, maxDepth: 3, biome: 'vault', hasFragment: true });
ok('dungeon has rooms', floor.rooms.length >= 3);
ok('dungeon entrance passable', floor.passable(floor.entrance.x, floor.entrance.y));
ok('dungeon down passable', floor.passable(floor.down.x, floor.down.y));
ok('fragment placed on deepest', floor.features.some(f => f.type === 'fragment'));

const bossFloor = TLU.Dungeon.genFloor('bf', { level: 16, depth: 4, maxDepth: 4, biome: 'aharietiam', boss: 'final' });
ok('boss floor has boss entity', bossFloor.entities.some(e => e.boss));

// ---- items ----
const rng = new TLU.RNG('loot');
let legendary = false, totalVal = 0;
for (let i = 0; i < 400; i++) {
  const it = TLU.Items.genEquipment(rng, 1 + (i % 20), { magic: i % 3 });
  ok('item has name', !!it.name);
  ok('item has value', it.value >= 0);
  if (it.rarity === 'legendary' || it.rarity === 'artifact') legendary = true;
  totalVal += it.value;
}
ok('some legendary drops in 400 rolls', legendary);
const uniq = TLU.Items.UNIQUES.oathbringer();
ok('unique oathbringer', uniq.shard && uniq.rarity === 'artifact');

// ---- player + leveling + skills ----
const p = TLU.Player.newPlayer({ name: 'Tester', order: 'windrunner', weaponSkill: 'blades', seed: 'x' });
ok('player has hp', p.maxHp > 0 && p.hp === p.maxHp);
ok('player has stormlight', p.maxStormlight > 0);
ok('player has weapon equipped', !!p.equip.weapon);
ok('player knows abilities', p.knownAbilities.length > 0);
const lvl0 = p.level;
const noop = () => {};
TLU.Player.gainXp(p, 100000, noop);
ok('player leveled up', p.level > lvl0);
ok('player gained attr points', p.attrPoints > 0);
TLU.Player.trainSkill(p, 'blades', 5000, noop);
ok('blades skill rose', p.skills.blades.level > 5);

// ---- combat: simulate many normal fights ----
function stubGame(seed) {
  return { turnCount: 0, onEnemyKilled: function () {}, level: 5 };
}
function runBattle(player, enemies, opts) {
  const logs = [];
  const game = stubGame();
  let ended = null;
  const c = new TLU.Combat(game, Object.assign({
    rng: new TLU.RNG('b' + (opts.s||0)), player: player, enemies: enemies,
    level: opts.level || 5, biome: 'plains', isBoss: !!opts.isBoss, canFlee: false,
    log: (m) => logs.push(m), onEnd: (cc) => { ended = cc.result; },
  }, opts));
  c.start();
  let guard = 0;
  const aoe = player.knownAbilities.filter((id) => TLU.Abilities[id].target === 'all-enemies');
  const single = player.knownAbilities.filter((id) => TLU.Abilities[id].target === 'enemy');
  const heal = player.knownAbilities.filter((id) => id === 'regrowth');
  function affordable(id) { return (TLU.Abilities[id].cost || 0) <= player.stormlight; }
  while (!c.over && guard++ < 2000) {
    if (!c.awaitingPlayer) break;
    const alive = c.aliveEnemies();
    const target = alive[0];
    const potion = player.inventory.find((it) => it.type === 'consumable' && it.heal);
    if (player.hp < player.maxHp * 0.32 && heal.length && affordable(heal[0])) {
      c.playerAct({ type: 'ability', id: heal[0] });
    } else if (player.hp < player.maxHp * 0.3 && potion) {
      c.playerAct({ type: 'item', item: potion });
    } else if (alive.length >= 2 && aoe.length && affordable(aoe[0])) {
      c.playerAct({ type: 'ability', id: aoe[0] });
    } else if (single.length && affordable(single[0]) && player.stormlight > player.maxStormlight * 0.4) {
      c.playerAct({ type: 'ability', id: single[0], target });
    } else {
      c.playerAct({ type: 'attack', target });
    }
  }
  return { result: ended || c.result, logs, guard };
}

// fresh strong-ish player for combat tests
const hero = TLU.Player.newPlayer({ name: 'Hero', order: 'dustbringer', weaponSkill: 'blades', seed: 'h' });
TLU.Player.gainXp(hero, 50000, noop); // a few levels
let wins = 0, battles = 0;
for (let i = 0; i < 40; i++) {
  hero.hp = hero.maxHp; hero.stormlight = hero.maxStormlight; hero.statuses = {};
  // refill a couple of potions so a real player's healing option is modeled
  if (!hero.inventory.some((it) => it.heal)) hero.inventory.push(TLU.Items.consumable('potion', 3));
  const enemies = TLU.Bestiary.spawnGroup(new TLU.RNG('grp' + i), 'plains', Math.min(8, hero.level));
  const r = runBattle(hero, enemies, { s: i, level: hero.level });
  battles++;
  if (r.guard >= 1999) { ok('battle ' + i + ' terminates', false); }
  if (r.result === 'victory') wins++;
  if (r.result !== 'victory' && r.result !== 'defeat') ok('battle ' + i + ' resolves', false);
}
ok('hero wins most level-appropriate fights (' + wins + '/' + battles + ')', wins >= battles * 0.6);

// ---- final boss fight with a geared, high-level hero ----
const champ = TLU.Player.newPlayer({ name: 'Champion', order: 'windrunner', weaponSkill: 'blades', seed: 'c' });
TLU.Player.gainXp(champ, 400000, noop); // push to high level
TLU.Player.equip(champ, TLU.Items.UNIQUES.oathbringer());
TLU.Player.equip(champ, TLU.Items.UNIQUES.plate_radiant());
for (const a of ['might','finesse','focus','endurance']) { for (let i=0;i<12;i++) TLU.Player.spendAttr(champ, a); }
champ.hp = champ.maxHp; champ.stormlight = champ.maxStormlight;
const boss = TLU.Bestiary.scale(TLU.Bestiary.FINAL_BOSS, TLU.Bestiary.FINAL_BOSS.lvl);
const br = runBattle(champ, [boss], { s: 999, isBoss: true, level: 18 });
ok('final boss fight terminates', br.guard < 1999);
ok('final boss fight resolves', br.result === 'victory' || br.result === 'defeat');
console.log('    final boss result with maxed champion (lvl ' + champ.level + '): ' + br.result);
ok('champion can defeat final boss', br.result === 'victory');

// ---- save snapshot / applyState ----
const fakeGame = {
  seed: 'test-seed-001', turnCount: 5, storm: {}, day: 2, player: p,
  world: world, questLog: {},
};
const saved = TLU.Save.save(fakeGame);
ok('save returns true', saved === true);
const loaded = TLU.Save.load();
ok('load returns data', loaded && loaded.seed === 'test-seed-001');
world.vaults[0].cleared = false;
loaded.siteStates[world.vaults[0].x + ',' + world.vaults[0].y].cleared = true;
TLU.Save.applyState(fakeGame, loaded);
ok('applyState restores cleared flag', world.vaults[0].cleared === true);

console.log('\n' + pass + ' passed, ' + fail + ' failed.');
process.exit(fail ? 1 : 0);
