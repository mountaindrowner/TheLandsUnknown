/* ============================================================
 * player.js — the player character: attributes, skills, gear,
 * inventory, derived combat stats, leveling & skill-by-use.
 * ============================================================ */
(function (TLU) {
  'use strict';

  const SLOTS = ['weapon', 'offhand', 'head', 'body', 'feet'];

  function newPlayer(opts) {
    opts = opts || {};
    const order = TLU.LORE.orders[opts.order] || TLU.LORE.orders.windrunner;
    const p = {
      kind: 'player',
      name: opts.name || 'Wanderer',
      orderId: opts.order || 'windrunner',
      order: order,
      level: 1, xp: 0, xpNext: TLU.Skills.levelXpFor(1),
      // core attributes (raised on level-up)
      attr: { might: 5, finesse: 5, focus: 5, endurance: 5 },
      attrPoints: 0,
      hp: 0, maxHp: 0,
      stormlight: 0, maxStormlight: 0,
      food: 100,
      gold: 25,
      skills: {},     // id -> { level, xp }
      inventory: [],  // items
      equip: { weapon: null, offhand: null, head: null, body: null, feet: null },
      statuses: {},   // combat statuses
      flags: {},
      fragments: 0,
      knownAbilities: [],
      // world state
      wx: 0, wy: 0,
      visited: {},    // discovered overworld tiles "x,y"
      questState: {}, // questId -> { stage }
      kills: {}, campsCleared: 0, vaultsCleared: 0, deepestVault: 0, gemsFound: 0,
      codex: { bestiary: {}, places: {}, biomes: {}, rumors: [] },
      stats: { steps: 0, kills: 0, deaths: 0, found: 0 },
    };

    // init skills
    TLU.Skills.ids.forEach(function (id) { p.skills[id] = { level: 1, xp: 0 }; });

    // starting bias by order: bump its surge skills & a weapon skill
    order.surge.forEach(function (s) { const id = s.toLowerCase(); if (p.skills[id]) p.skills[id].level = 5; });
    const startWeaponSkill = opts.weaponSkill || 'blades';
    p.skills[startWeaponSkill].level = 5;
    p.skills.light.level = 3; p.skills.survival.level = 3;

    // starting gear by order
    const rng = new TLU.RNG((opts.seed || 'start') + ':gear');
    const w = TLU.Items.genEquipment(rng, 2, { kind: 'weapon' });
    w.skill = startWeaponSkill; w.name = 'Iron ' + (startWeaponSkill === 'archery' ? 'Shortbow' : startWeaponSkill === 'blunt' ? 'Mace' : 'Shortsword');
    const body = TLU.Items.genEquipment(rng, 2, { kind: 'armor' });
    p.inventory.push(w, body);
    p.inventory.push(TLU.Items.consumable('potion', 3));
    p.inventory.push(TLU.Items.consumable('ration', 5));
    p.inventory.push(TLU.Items.consumable('elixir_storm', 2));
    equip(p, w); equip(p, body);

    recompute(p);
    p.hp = p.maxHp; p.stormlight = p.maxStormlight;
    refreshAbilities(p);
    return p;
  }

  // --- derived stats from attributes + skills + equipment ---
  function recompute(p) {
    const a = p.attr;
    let bonus = { dmg: 0, def: 0, speed: 0, maxHp: 0, maxStormlight: 0, crit: 0, stormRegen: 0, regen: 0, voidbane: 0, armorPierce: 0 };
    let element = null;
    SLOTS.forEach(function (slot) {
      const it = p.equip[slot];
      if (!it) return;
      if (it.bonus) for (const k in it.bonus) {
        if (k === 'element') element = it.bonus[k];
        else bonus[k] = (bonus[k] || 0) + it.bonus[k];
      }
    });
    p._bonus = bonus; p._element = element;

    const wpn = p.equip.weapon;
    const wSkillId = (wpn && wpn.skill && p.skills[wpn.skill]) ? wpn.skill : 'blades';
    const weaponSkillLv = p.skills[wSkillId] ? p.skills[wSkillId].level : 1;

    // HP & Stormlight
    p.maxHp = Math.round(40 + a.endurance * 7 + p.level * 6 + bonus.maxHp);
    p.maxStormlight = Math.round(30 + a.focus * 6 + bonus.maxStormlight);

    // Attack
    const wd = wpn ? wpn.dmg : 3;
    p.attack = Math.round(a.might * 1.4 + wd + bonus.dmg + weaponSkillLv * 0.8);
    p.weaponSkillId = wSkillId;
    p.armorPierce = (wpn ? wpn.armorPierce || 0 : 0) + bonus.armorPierce;

    // Defense from armor pieces + Block + armor skill
    let armorDef = 0, armorSkillLv = 0, blockChance = 0;
    ['head', 'body', 'feet', 'offhand'].forEach(function (slot) {
      const it = p.equip[slot];
      if (it && it.def) { armorDef += it.def; }
      if (it && it.block) blockChance += it.block;
    });
    const lightLv = p.skills.light.level, heavyLv = p.skills.heavy.level;
    armorSkillLv = Math.max(lightLv, heavyLv);
    p.defense = Math.round(armorDef + bonus.def + a.endurance * 0.5 + armorSkillLv * 0.6);
    p.blockChance = Math.min(0.6, blockChance + p.skills.block.level * 0.01);

    // Speed (turn order) & crit
    const wSpeed = wpn ? wpn.speed : 10;
    p.speed = Math.round(wSpeed + a.finesse * 1.1 + bonus.speed);
    p.crit = Math.min(0.6, (wpn ? wpn.crit || 0.05 : 0.05) + a.finesse * 0.004 + bonus.crit + p.skills[wSkillId].level * 0.002);
    p.element = element;
    p.voidbane = bonus.voidbane || 0;
    p.stormRegen = bonus.stormRegen || 0;
    p.hpRegen = bonus.regen || 0;

    if (p.hp > p.maxHp) p.hp = p.maxHp;
    if (p.stormlight > p.maxStormlight) p.stormlight = p.maxStormlight;
  }

  function equip(p, item) {
    if (!item) return false;
    const slot = item.slot === 'weapon' ? 'weapon' : item.slot;
    if (SLOTS.indexOf(slot) < 0) return false;
    // two-handed weapons clear offhand
    if (slot === 'weapon' && item.hands === 2 && p.equip.offhand) { unequip(p, 'offhand'); }
    if (slot === 'offhand' && p.equip.weapon && p.equip.weapon.hands === 2) { unequip(p, 'weapon'); }
    if (p.equip[slot]) unequip(p, slot);
    // remove from inventory, set equipped
    const idx = p.inventory.indexOf(item);
    if (idx >= 0) p.inventory.splice(idx, 1);
    p.equip[slot] = item;
    item.equipped = true;
    recompute(p);
    refreshAbilities(p);
    return true;
  }

  function unequip(p, slot) {
    const it = p.equip[slot];
    if (!it) return;
    it.equipped = false;
    p.equip[slot] = null;
    p.inventory.push(it);
    recompute(p);
  }

  // Which abilities are known given order + surge skill levels + weapon skill.
  function refreshAbilities(p) {
    const known = [];
    for (const id in TLU.Abilities) {
      const ab = TLU.Abilities[id];
      if (ab.hidden) continue;
      if (ab.order && ab.order !== p.orderId) continue;
      const sk = p.skills[ab.school];
      const lvl = sk ? sk.level : 0;
      if (lvl >= (ab.unlock || 1)) known.push(id);
    }
    p.knownAbilities = known;
    return known;
  }

  // --- skill-by-use: grant skill XP, may level the skill & the character ---
  function trainSkill(p, skillId, amount, log) {
    const sk = p.skills[skillId];
    if (!sk) return;
    sk.xp += amount;
    let leveled = false;
    while (sk.xp >= TLU.Skills.skillXpFor(sk.level)) {
      sk.xp -= TLU.Skills.skillXpFor(sk.level);
      sk.level++;
      leveled = true;
      if (log) log('%c' + TLU.Skills.LIST[skillId].name + ' rose to ' + sk.level + '.', 'skill');
      gainXp(p, 12 + sk.level * 3, log); // skill-ups feed character XP (Elder-Scrolls style)
    }
    if (leveled) { recompute(p); refreshAbilities(p); }
    return leveled;
  }

  function gainXp(p, amount, log) {
    p.xp += amount;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level++;
      p.attrPoints += 2;
      p.xpNext = TLU.Skills.levelXpFor(p.level);
      recompute(p);
      p.hp = p.maxHp; p.stormlight = p.maxStormlight;
      if (log) log('%c— You have reached level ' + p.level + '! (2 attribute points) —', 'level');
    }
  }

  function spendAttr(p, attrId) {
    if (p.attrPoints <= 0 || !(attrId in p.attr)) return false;
    p.attr[attrId]++;
    p.attrPoints--;
    recompute(p);
    return true;
  }

  // --- inventory helpers ---
  function addItem(p, item) {
    if (!item) return;
    if (item.stack) {
      const ex = p.inventory.find(function (i) { return i.id === item.id && i.stack; });
      if (ex) { ex.qty = (ex.qty || 1) + (item.qty || 1); return; }
    }
    p.inventory.push(item);
    p.stats.found++;
  }
  function removeItem(p, item, qty) {
    const idx = p.inventory.indexOf(item);
    if (idx < 0) return;
    if (item.stack && (item.qty || 1) > (qty || 1)) { item.qty -= (qty || 1); return; }
    p.inventory.splice(idx, 1);
  }
  function addGold(p, n) { p.gold = Math.max(0, p.gold + n); }

  function fullHeal(p) { p.hp = p.maxHp; p.stormlight = p.maxStormlight; for (const k in p.statuses) delete p.statuses[k]; }

  TLU.Player = {
    newPlayer: newPlayer, recompute: recompute, equip: equip, unequip: unequip,
    refreshAbilities: refreshAbilities, trainSkill: trainSkill, gainXp: gainXp,
    spendAttr: spendAttr, addItem: addItem, removeItem: removeItem, addGold: addGold,
    fullHeal: fullHeal, SLOTS: SLOTS,
  };
})(window.TLU = window.TLU || {});
