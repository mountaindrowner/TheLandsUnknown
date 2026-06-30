/* ============================================================
 * items.js — equipment, materials, randomized affixes, loot tables
 * Elder-Scrolls-style: tons of gear, found everywhere, randomized.
 * ============================================================ */
(function (TLU) {
  'use strict';

  // Material tiers scale base stats & value. Higher = rarer/stronger.
  const MATERIALS = [
    { id: 'crude',    name: 'Crude',     mult: 0.7, value: 0.5, tier: 0, color: '#9a8f80' },
    { id: 'iron',     name: 'Iron',      mult: 1.0, value: 1.0, tier: 1, color: '#c9c9c9' },
    { id: 'steel',    name: 'Steel',     mult: 1.25, value: 1.8, tier: 2, color: '#dfe6ee' },
    { id: 'bronze',   name: 'Tarnsteel', mult: 1.45, value: 2.6, tier: 3, color: '#caa04b' },
    { id: 'azure',    name: 'Azurine',     mult: 1.7, value: 4.0, tier: 4, color: '#7ec8ff' },
    { id: 'shardsteel', name: 'Riftsteel', mult: 2.1, value: 7.5, tier: 5, color: '#b99cff' },
    { id: 'soulcast', name: 'Soulforged',  mult: 2.6, value: 12, tier: 6, color: '#67e08a' },
  ];

  // Weapon base types. dmg is base at iron tier; speed affects turn order.
  const WEAPONS = [
    { id: 'dagger',   name: 'Dagger',     glyph: '/', dmg: 5,  speed: 14, hands: 1, skill: 'blades',  crit: 0.15 },
    { id: 'shortsword', name: 'Shortsword', glyph: '/', dmg: 8, speed: 11, hands: 1, skill: 'blades' },
    { id: 'longsword', name: 'Longsword', glyph: '/', dmg: 12, speed: 9, hands: 1, skill: 'blades' },
    { id: 'sidesword', name: 'Sidesword', glyph: '/', dmg: 15, speed: 8, hands: 1, skill: 'blades' },
    { id: 'mace',     name: 'Mace',       glyph: '!', dmg: 13, speed: 8, hands: 1, skill: 'blunt', armorPierce: 0.2 },
    { id: 'warhammer', name: 'Warhammer', glyph: '!', dmg: 22, speed: 5, hands: 2, skill: 'blunt', armorPierce: 0.45 },
    { id: 'spear',    name: 'Spear',      glyph: '|', dmg: 11, speed: 10, hands: 2, skill: 'polearm' },
    { id: 'glaive',   name: 'Glaive',     glyph: '|', dmg: 18, speed: 7, hands: 2, skill: 'polearm' },
    { id: 'greatbow', name: 'Longbow',    glyph: '}', dmg: 14, speed: 9, hands: 2, skill: 'archery', ranged: true },
    { id: 'shortbow', name: 'Shortbow',   glyph: '}', dmg: 9, speed: 12, hands: 2, skill: 'archery', ranged: true },
    { id: 'halfshard', name: 'Riftshard Blade', glyph: '†', dmg: 20, speed: 10, hands: 1, skill: 'blades', crit: 0.1, special: 'shard' },
  ];

  // Armor slots and bases. def = base armor at iron tier.
  const ARMORS = [
    { id: 'cap',     name: 'Cap',        glyph: '^', slot: 'head',  def: 2, skill: 'light' },
    { id: 'helm',    name: 'Helm',       glyph: '^', slot: 'head',  def: 4, skill: 'heavy' },
    { id: 'leather', name: 'Leather Vest', glyph: '[', slot: 'body', def: 4, skill: 'light' },
    { id: 'mail',    name: 'Mail Hauberk', glyph: '[', slot: 'body', def: 8, skill: 'heavy' },
    { id: 'plate',   name: 'Plate Cuirass', glyph: '[', slot: 'body', def: 13, skill: 'heavy' },
    { id: 'halfplate', name: 'Half-Plate', glyph: '[', slot: 'body', def: 18, skill: 'heavy' },
    { id: 'boots',   name: 'Boots',      glyph: 'L', slot: 'feet',  def: 2, skill: 'light' },
    { id: 'greaves', name: 'Greaves',    glyph: 'L', slot: 'feet',  def: 4, skill: 'heavy' },
    { id: 'buckler', name: 'Buckler',    glyph: ')', slot: 'offhand', def: 3, skill: 'block', block: 0.15 },
    { id: 'kiteshield', name: 'Kiteshield', glyph: ')', slot: 'offhand', def: 6, skill: 'block', block: 0.3 },
    { id: 'towershield', name: 'Tower Shield', glyph: ')', slot: 'offhand', def: 10, skill: 'block', block: 0.45 },
  ];

  // Prefix / suffix affixes (randomized magic). bonus keys map to stats.
  const PREFIXES = [
    { id: 'sturdy',  name: 'Sturdy',   tier: 1, bonus: { def: 2 } },
    { id: 'keen',    name: 'Keen',     tier: 1, bonus: { dmg: 2 } },
    { id: 'swift',   name: 'Swift',    tier: 1, bonus: { speed: 2 } },
    { id: 'heavy',   name: 'Brutal',   tier: 2, bonus: { dmg: 4 } },
    { id: 'guarded', name: 'Warded',   tier: 2, bonus: { def: 4 } },
    { id: 'stormlit', name: 'Animabright', tier: 3, bonus: { dmg: 5, maxStormlight: 15 } },
    { id: 'vicious', name: 'Vicious',  tier: 3, bonus: { dmg: 6, crit: 0.08 } },
    { id: 'adamant', name: 'Adamant',  tier: 3, bonus: { def: 7, maxHp: 12 } },
    { id: 'godslaying', name: 'God-Slaying', tier: 4, bonus: { dmg: 10, crit: 0.12 } },
  ];
  const SUFFIXES = [
    { id: 'of_the_bear',  name: 'of the Bear',   tier: 1, bonus: { maxHp: 10 } },
    { id: 'of_winds',     name: 'of Winds',      tier: 1, bonus: { speed: 3 } },
    { id: 'of_warding',   name: 'of Warding',    tier: 2, bonus: { def: 3, maxHp: 8 } },
    { id: 'of_flame',     name: 'of Flame',      tier: 2, bonus: { dmg: 4, element: 'fire' } },
    { id: 'of_frost',     name: 'of Frost',      tier: 2, bonus: { dmg: 4, element: 'frost' } },
    { id: 'of_the_storm', name: 'of the Gale',  tier: 3, bonus: { maxStormlight: 30, stormRegen: 1 } },
    { id: 'of_vigor',     name: 'of Vigor',      tier: 3, bonus: { maxHp: 25, regen: 1 } },
    { id: 'of_radiance',  name: 'of Dawnlight',   tier: 4, bonus: { dmg: 6, def: 6, maxStormlight: 25 } },
    { id: 'of_voidbane',  name: 'of Voidbane',   tier: 5, bonus: { dmg: 12, voidbane: 0.4 } },
  ];

  // Consumables & quest items.
  const CONSUMABLES = {
    potion_minor:  { id: 'potion_minor', name: 'Minor Healing Draught', glyph: '!', type: 'consumable', heal: 25, value: 15, stack: true },
    potion:        { id: 'potion', name: 'Healing Draught', glyph: '!', type: 'consumable', heal: 60, value: 40, stack: true },
    potion_major:  { id: 'potion_major', name: 'Greater Healing Draught', glyph: '!', type: 'consumable', heal: 140, value: 110, stack: true },
    elixir_storm:  { id: 'elixir_storm', name: 'Anima Elixir', glyph: '*', type: 'consumable', stormlight: 60, value: 60, stack: true },
    antidote:      { id: 'antidote', name: 'Antidote', glyph: '!', type: 'consumable', cure: 'poison', value: 25, stack: true },
    ration:        { id: 'ration', name: 'Travel Ration', glyph: '%', type: 'consumable', food: 30, value: 5, stack: true },
    scroll_blast:  { id: 'scroll_blast', name: 'Scroll of Churnblast', glyph: '?', type: 'consumable', scroll: 'blast', value: 50, stack: true },
    scroll_warp:   { id: 'scroll_warp', name: 'Scroll of Recall', glyph: '?', type: 'consumable', scroll: 'recall', value: 80, stack: true },
  };

  // Infused gems — used to recharge Anima & craft.
  function makeGem(name) {
    return { id: 'gem_' + name.toLowerCase(), name: 'Infused ' + name, glyph: '*', type: 'gem', stormlight: 40, value: 35, stack: true };
  }

  let UID = 1;
  function uid() { return 'i' + (UID++); }

  function pickByTier(rng, list, maxTier, biasHigh) {
    const pool = list.filter(function (x) { return (x.tier || 0) <= maxTier; });
    if (!pool.length) return list[0];
    if (biasHigh) {
      // weight toward higher tiers
      const weighted = pool.map(function (x) { return { v: x, w: (x.tier || 0) + 1 }; });
      return rng.weighted(weighted);
    }
    return rng.pick(pool);
  }

  // Generate a randomized weapon or armor piece appropriate to a "level".
  function genEquipment(rng, level, opts) {
    opts = opts || {};
    level = Math.max(1, level | 0);
    const matTier = Math.min(MATERIALS.length - 1, Math.max(0, Math.round((level / 4) + rng.normal(0, 1.1))));
    const mat = MATERIALS[Math.max(0, matTier)];

    const isWeapon = opts.kind === 'weapon' ? true : opts.kind === 'armor' ? false : rng.chance(0.5);
    const base = isWeapon ? rng.pick(WEAPONS) : rng.pick(ARMORS);

    const item = {
      uid: uid(),
      type: isWeapon ? 'weapon' : 'armor',
      base: base.id,
      glyph: base.glyph,
      mat: mat.id,
      color: mat.color,
      name: mat.name + ' ' + base.name,
      skill: base.skill,
      slot: isWeapon ? 'weapon' : base.slot,
      hands: base.hands || 1,
      ranged: !!base.ranged,
      bonus: {},
      affixes: [],
      level: level,
    };

    if (isWeapon) {
      item.dmg = Math.round(base.dmg * mat.mult);
      item.speed = base.speed;
      item.crit = base.crit || 0.05;
      item.armorPierce = base.armorPierce || 0;
      if (base.special === 'shard') item.shard = true;
    } else {
      item.def = Math.round(base.def * mat.mult);
      item.block = base.block || 0;
    }

    // Affix roll — chance scales with level & a magic-find option.
    const magic = opts.magic || 0;
    const affixTierCap = Math.min(5, 1 + Math.floor(level / 3) + magic);
    let rarity = 'common';
    if (rng.chance(0.42 + magic * 0.08)) {
      const pre = pickByTier(rng, PREFIXES, affixTierCap, magic > 0);
      item.affixes.push(pre);
      item.name = pre.name + ' ' + item.name;
      mergeBonus(item.bonus, pre.bonus);
    }
    if (rng.chance(0.34 + magic * 0.08)) {
      const suf = pickByTier(rng, SUFFIXES, affixTierCap, magic > 0);
      item.affixes.push(suf);
      item.name = item.name + ' ' + suf.name;
      mergeBonus(item.bonus, suf.bonus);
    }
    rarity = item.affixes.length === 0 ? 'common'
      : item.affixes.length === 1 ? 'magic'
      : (item.affixes.some(function (a) { return a.tier >= 4; }) ? 'legendary' : 'rare');
    item.rarity = rarity;
    if (item.shard) item.rarity = 'legendary';

    // Value
    const baseVal = isWeapon ? base.dmg * 3 : base.def * 4;
    item.value = Math.round((baseVal * mat.value + item.affixes.reduce(function (s, a) { return s + a.tier * 30; }, 0)) * (1 + level * 0.1));
    return item;
  }

  function mergeBonus(dst, src) {
    if (!src) return dst;
    for (const k in src) {
      if (k === 'element' || k === 'voidbane') { dst[k] = src[k]; continue; }
      dst[k] = (dst[k] || 0) + src[k];
    }
    return dst;
  }

  // A handful of unique, hand-authored artifacts (Shardblades etc.)
  const UNIQUES = {
    oathbringer: function () {
      return { uid: uid(), type: 'weapon', base: 'longsword', glyph: '†', mat: 'shardsteel', color: '#b99cff',
        name: 'Gravewind, the First Rift', skill: 'blades', slot: 'weapon', hands: 1, dmg: 55, speed: 11, crit: 0.2,
        armorPierce: 0.6, shard: true, rarity: 'artifact', level: 20, affixes: [{name:'Soulsevering',tier:5}],
        bonus: { dmg: 20, voidbane: 0.6, maxStormlight: 50 }, value: 9999,
        desc: 'A living Riftblade that severs the soul. The dead cannot rise from its cut.' };
    },
    sunmaker: function () {
      return { uid: uid(), type: 'weapon', base: 'warhammer', glyph: '†', mat: 'soulcast', color: '#ff7a4b',
        name: 'Cinderfall, the Ruin', skill: 'blunt', slot: 'weapon', hands: 2, dmg: 70, speed: 6, crit: 0.12,
        armorPierce: 0.8, shard: true, rarity: 'artifact', level: 24, affixes: [{name:'Cataclysm',tier:5}],
        bonus: { dmg: 25, element: 'fire' }, value: 9999,
        desc: 'A Rifthammer that burned a hundred holds to ash. It hungers still.' };
    },
    plate_radiant: function () {
      return { uid: uid(), type: 'armor', base: 'halfplate', glyph: '◊', mat: 'shardsteel', color: '#b99cff',
        name: 'Kindled Riftplate', skill: 'heavy', slot: 'body', def: 50, block: 0.2, rarity: 'artifact', level: 20,
        affixes: [{name:'Galeforged',tier:5}], bonus: { maxHp: 80, maxStormlight: 60, stormRegen: 2, def: 20 }, value: 9999,
        desc: 'Glowing plate that drinks Anima to mend itself and its bearer.' };
    },
  };

  TLU.Items = {
    MATERIALS: MATERIALS, WEAPONS: WEAPONS, ARMORS: ARMORS,
    PREFIXES: PREFIXES, SUFFIXES: SUFFIXES, CONSUMABLES: CONSUMABLES,
    UNIQUES: UNIQUES,
    genEquipment: genEquipment,
    makeGem: makeGem,
    mergeBonus: mergeBonus,
    uid: uid,
    consumable: function (id, qty) {
      const c = CONSUMABLES[id];
      if (!c) return null;
      const item = Object.assign({ uid: uid(), rarity: 'common' }, c);
      item.qty = qty || 1;
      return item;
    },
    gem: function (name, qty) { const g = makeGem(name); g.uid = uid(); g.rarity = 'magic'; g.qty = qty || 1; return g; },
    // Coins handled separately as currency, but provide a loot bag helper.
    rollLoot: function (rng, level, magic) {
      const out = [];
      const n = rng.int(1, 3);
      for (let i = 0; i < n; i++) {
        const roll = rng.next();
        if (roll < 0.5) out.push(genEquipment(rng, level, { magic: magic || 0 }));
        else if (roll < 0.72) out.push(TLU.Items.consumable(rng.pick(['potion_minor', 'potion', 'ration', 'elixir_storm']), 1));
        else if (roll < 0.85) out.push(TLU.Items.gem(rng.pick(TLU.LORE.gems), 1));
        else if (roll < 0.95) out.push(TLU.Items.consumable(rng.pick(['scroll_blast', 'antidote', 'potion_major']), 1));
        else out.push(genEquipment(rng, level + 2, { magic: (magic || 0) + 1 }));
      }
      return out;
    },
    rarityColor: function (r) {
      return { common: '#cfcfcf', magic: '#7ec8ff', rare: '#ffd86b', legendary: '#ff8adf', artifact: '#ff7a4b' }[r] || '#cfcfcf';
    },
  };
})(window.TLU = window.TLU || {});
