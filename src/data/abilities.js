/* ============================================================
 * abilities.js — combat actions: surgebinding powers, enemy moves.
 * Each ability: cost (stormlight), targeting, and an effect(ctx).
 * ctx = { rng, user, target, enemies, allies, log, combat }
 * ============================================================ */
(function (TLU) {
  'use strict';

  // Player surgebinding abilities, gated by Order & skill level.
  // unlock: minimum skill level in `school` to learn.
  const ABILITIES = {
    // --- universal martial ---
    power_strike: { name: 'Power Strike', cost: 0, sl: 8, school: 'blades', target: 'enemy', unlock: 2,
      desc: 'A committed blow for 175% weapon damage.',
      effect: function (c) { c.combat.attack(c.user, c.target, { mult: 1.75, label: 'Power Strike' }); } },
    cleave: { name: 'Cleave', cost: 6, school: 'blunt', target: 'all-enemies', unlock: 3,
      desc: 'Strike all foes for 90% weapon damage.',
      effect: function (c) { c.enemies.filter(function (e) { return e.alive; }).forEach(function (e) { c.combat.attack(c.user, e, { mult: 0.9, label: 'Cleave' }); }); } },
    aimed_shot: { name: 'Aimed Shot', cost: 5, school: 'archery', target: 'enemy', unlock: 3,
      desc: 'A precise shot: +40% damage and guaranteed crit chance up.',
      effect: function (c) { c.combat.attack(c.user, c.target, { mult: 1.4, bonusCrit: 0.4, label: 'Aimed Shot' }); } },

    // --- Windrunner: Gravitation / Adhesion ---
    lashing: { name: 'Skyward Pull', cost: 12, school: 'gravitation', target: 'enemy', unlock: 1, order: 'windrunner',
      desc: 'Reverse a foe\'s gravity, dealing storm damage and stunning briefly.',
      effect: function (c) { c.combat.magicHit(c.user, c.target, 1.4, 'storm', 'Skyward Pull'); if (c.rng.chance(0.5)) c.combat.applyStatus(c.target, 'stun', 1); } },
    full_lashing: { name: 'Binding', cost: 18, school: 'adhesion', target: 'enemy', unlock: 4, order: 'windrunner',
      desc: 'Bind a foe in place — they cannot act next turn.',
      effect: function (c) { c.combat.applyStatus(c.target, 'bound', 2); c.log(c.target.name + ' is bound to the stone!'); } },

    // --- Stoneward: Cohesion / Tension ---
    stonestance: { name: 'Stonestance', cost: 10, school: 'cohesion', target: 'self', unlock: 1, order: 'stoneward',
      desc: 'Harden like stone: greatly raise defense for several turns.',
      effect: function (c) { c.combat.applyStatus(c.user, 'guard', 3); c.log(c.user.name + ' sets an unbreakable stance.'); } },
    seismic_slam: { name: 'Seismic Slam', cost: 16, school: 'tension', target: 'all-enemies', unlock: 4, order: 'stoneward',
      desc: 'Shatter the ground for storm damage to all foes.',
      effect: function (c) { c.enemies.filter(function (e) { return e.alive; }).forEach(function (e) { c.combat.magicHit(c.user, e, 1.1, 'storm', 'Seismic Slam'); }); } },

    // --- Edgedancer: Abrasion / Progression ---
    slick: { name: 'Slickness', cost: 10, school: 'abrasion', target: 'self', unlock: 1, order: 'edgedancer',
      desc: 'Become frictionless: large evasion boost for several turns.',
      effect: function (c) { c.combat.applyStatus(c.user, 'evade', 3); c.log(c.user.name + ' slides free of all friction.'); } },
    regrowth: { name: 'Regrowth', cost: 14, school: 'progression', target: 'self', unlock: 2, order: 'edgedancer',
      desc: 'Channel Progression to heal a third of your wounds.',
      effect: function (c) { c.combat.heal(c.user, Math.round(c.user.maxHp * 0.33), 'Regrowth'); } },

    // --- Truthwatcher: Illumination / Progression ---
    illusion_double: { name: 'Veilweaving', cost: 13, school: 'illumination', target: 'self', unlock: 1, order: 'truthwatcher',
      desc: 'Weave a decoy of light: foes likely miss you next turns.',
      effect: function (c) { c.combat.applyStatus(c.user, 'blur', 3); c.log(c.user.name + ' splits into shards of light.'); } },
    foresight: { name: 'Foresight', cost: 12, school: 'illumination', target: 'self', unlock: 3, order: 'truthwatcher',
      desc: 'Read the threads of fate: your next hits always crit.',
      effect: function (c) { c.combat.applyStatus(c.user, 'truesight', 2); c.log(c.user.name + '\'s eyes glow with foresight.'); } },

    // --- Dustbringer: Division / Abrasion ---
    division: { name: 'Division', cost: 14, school: 'division', target: 'enemy', unlock: 1, order: 'dustbringer',
      desc: 'Unmake a foe from within — heavy fire damage over time.',
      effect: function (c) { c.combat.magicHit(c.user, c.target, 1.2, 'fire', 'Division'); c.combat.applyStatus(c.target, 'burn', 3); } },
    ashstorm: { name: 'Ashstorm', cost: 20, school: 'division', target: 'all-enemies', unlock: 4, order: 'dustbringer',
      desc: 'Reduce all foes toward ash with searing fire.',
      effect: function (c) { c.enemies.filter(function (e) { return e.alive; }).forEach(function (e) { c.combat.magicHit(c.user, e, 1.3, 'fire', 'Ashstorm'); c.combat.applyStatus(e, 'burn', 2); }); } },

    // --- consumable scrolls reuse these ---
    scroll_blast: { name: 'Galeblast', cost: 0, target: 'all-enemies', hidden: true,
      effect: function (c) { c.enemies.filter(function (e) { return e.alive; }).forEach(function (e) { c.combat.magicHit(c.user, e, 1.6, 'storm', 'Galeblast'); }); } },
  };

  // Enemy abilities, chosen by the combat AI.
  const ENEMY_ABILITIES = {
    rend: { name: 'Rend', target: 'enemy', effect: function (c) { c.combat.attack(c.user, c.target, { mult: 1.3, label: 'Rend' }); c.combat.applyStatus(c.target, 'bleed', 2); } },
    cleave: { name: 'Cleave', target: 'enemy', effect: function (c) { c.combat.attack(c.user, c.target, { mult: 1.25, label: 'Cleave' }); } },
    shellguard: { name: 'Shell Guard', target: 'self', effect: function (c) { c.combat.applyStatus(c.user, 'guard', 2); c.log(c.user.name + ' pulls into its shell.'); } },
    drain: { name: 'Soul Drain', target: 'enemy', effect: function (c) { const d = c.combat.magicHit(c.user, c.target, 1.0, 'void', 'Soul Drain'); c.combat.heal(c.user, Math.round(d * 0.6), null); } },
    swallow: { name: 'Swallow', target: 'enemy', effect: function (c) { c.combat.attack(c.user, c.target, { mult: 1.5, label: 'Swallow' }); if (c.rng.chance(0.3)) c.combat.applyStatus(c.target, 'stun', 1); } },
    stormblast: { name: 'Galeblast', target: 'enemy', effect: function (c) { c.combat.magicHit(c.user, c.target, 1.3, 'storm', 'Galeblast'); } },
    quake: { name: 'Quake', target: 'all-enemies', effect: function (c) { c.allies0(c).forEach(function (t) { c.combat.magicHit(c.user, t, 0.9, 'storm', 'Quake'); }); } },
    gravlance: { name: 'Gravitation Lance', target: 'enemy', effect: function (c) { c.combat.magicHit(c.user, c.target, 1.5, 'storm', 'Gravitation Lance'); } },
    regenvoid: { name: 'Void Mending', target: 'self', effect: function (c) { c.combat.heal(c.user, Math.round(c.user.maxHp * 0.15), 'Void Mending'); } },
    terror: { name: 'Terror', target: 'enemy', effect: function (c) { c.combat.applyStatus(c.target, 'fear', 2); c.log(c.user.name + ' radiates dread.'); } },
    warcry: { name: 'Warcry', target: 'self', effect: function (c) { c.combat.applyStatus(c.user, 'rage', 3); c.log(c.user.name + ' bellows a warcry!'); } },
    // boss-only
    spawn_shadow: { name: 'Birth Shadow', target: 'self', effect: function (c) { c.combat.spawnAdd(c.user); } },
    midnight_flood: { name: 'Midnight Flood', target: 'all-enemies', effect: function (c) { c.allies0(c).forEach(function (t) { c.combat.magicHit(c.user, t, 1.2, 'void', 'Midnight Flood'); }); c.log('Darkness floods the chamber!'); } },
  };

  TLU.Abilities = ABILITIES;
  TLU.EnemyAbilities = ENEMY_ABILITIES;
})(window.TLU = window.TLU || {});
