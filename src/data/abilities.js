/* ============================================================
 * abilities.js — combat actions: Attunement powers, enemy moves.
 * Each ability: cost (Charge), targeting, and an effect(ctx).
 * ctx = { rng, user, target, enemies, allies, log, combat }
 * ============================================================ */
(function (TLU) {
  'use strict';

  // Player Attunement abilities, gated by Order & skill level.
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

    // --- Skyrender: Pull / Bind ---
    skypull: { name: 'Skyward Pull', cost: 12, school: 'pull', target: 'enemy', unlock: 1, order: 'skyrender',
      desc: 'Reverse a foe\'s weight, dealing arc damage and stunning briefly.',
      effect: function (c) { c.combat.magicHit(c.user, c.target, 1.4, 'arc', 'Skyward Pull'); if (c.rng.chance(0.5)) c.combat.applyStatus(c.target, 'stun', 1); } },
    fullbind: { name: 'Binding', cost: 18, school: 'bind', target: 'enemy', unlock: 4, order: 'skyrender',
      desc: 'Bind a foe in place — they cannot act next turn.',
      effect: function (c) { c.combat.applyStatus(c.target, 'bound', 2); c.log(c.target.name + ' is bound fast to the ground!'); } },

    // --- Stonewarden: Form / Strain ---
    stonestance: { name: 'Stonestance', cost: 10, school: 'form', target: 'self', unlock: 1, order: 'stonewarden',
      desc: 'Harden like stone: greatly raise defense for several turns.',
      effect: function (c) { c.combat.applyStatus(c.user, 'guard', 3); c.log(c.user.name + ' sets an unbreakable stance.'); } },
    seismic_slam: { name: 'Seismic Slam', cost: 16, school: 'strain', target: 'all-enemies', unlock: 4, order: 'stonewarden',
      desc: 'Shatter the ground for arc damage to all foes.',
      effect: function (c) { c.enemies.filter(function (e) { return e.alive; }).forEach(function (e) { c.combat.magicHit(c.user, e, 1.1, 'arc', 'Seismic Slam'); }); } },

    // --- Slipstrider: Glide / Mend ---
    slick: { name: 'Slickness', cost: 10, school: 'glide', target: 'self', unlock: 1, order: 'slipstrider',
      desc: 'Become frictionless: large evasion boost for several turns.',
      effect: function (c) { c.combat.applyStatus(c.user, 'evade', 3); c.log(c.user.name + ' slides free of all friction.'); } },
    regrowth: { name: 'Regrowth', cost: 14, school: 'mend', target: 'self', unlock: 2, order: 'slipstrider',
      desc: 'Channel the Mend to knit a third of your wounds.',
      effect: function (c) { c.combat.heal(c.user, Math.round(c.user.maxHp * 0.33), 'Regrowth'); } },

    // --- Veilseer: Veil / Mend ---
    illusion_double: { name: 'Veilweaving', cost: 13, school: 'veil', target: 'self', unlock: 1, order: 'veilseer',
      desc: 'Weave a decoy of light: foes likely miss you next turns.',
      effect: function (c) { c.combat.applyStatus(c.user, 'blur', 3); c.log(c.user.name + ' splits into shards of light.'); } },
    foresight: { name: 'Foresight', cost: 12, school: 'veil', target: 'self', unlock: 3, order: 'veilseer',
      desc: 'Read the patterns of what comes: your next hits always crit.',
      effect: function (c) { c.combat.applyStatus(c.user, 'truesight', 2); c.log(c.user.name + '\'s eyes glow with foresight.'); } },

    // --- Cinderwright: Cinder / Glide ---
    disassemble: { name: 'Disassemble', cost: 14, school: 'cinder', target: 'enemy', unlock: 1, order: 'cinderwright',
      desc: 'Take a foe apart from within — heavy thermal damage over time.',
      effect: function (c) { c.combat.magicHit(c.user, c.target, 1.2, 'fire', 'Disassemble'); c.combat.applyStatus(c.target, 'burn', 3); } },
    ashstorm: { name: 'Ashstorm', cost: 20, school: 'cinder', target: 'all-enemies', unlock: 4, order: 'cinderwright',
      desc: 'Reduce all foes toward slag with searing fire.',
      effect: function (c) { c.enemies.filter(function (e) { return e.alive; }).forEach(function (e) { c.combat.magicHit(c.user, e, 1.3, 'fire', 'Ashstorm'); c.combat.applyStatus(e, 'burn', 2); }); } },

    // --- consumable scrolls reuse these ---
    scroll_blast: { name: 'Arc Blast', cost: 0, target: 'all-enemies', hidden: true,
      effect: function (c) { c.enemies.filter(function (e) { return e.alive; }).forEach(function (e) { c.combat.magicHit(c.user, e, 1.6, 'arc', 'Arc Blast'); }); } },
  };

  // Enemy abilities, chosen by the combat AI.
  const ENEMY_ABILITIES = {
    rend: { name: 'Rend', target: 'enemy', effect: function (c) { c.combat.attack(c.user, c.target, { mult: 1.3, label: 'Rend' }); c.combat.applyStatus(c.target, 'bleed', 2); } },
    cleave: { name: 'Cleave', target: 'enemy', effect: function (c) { c.combat.attack(c.user, c.target, { mult: 1.25, label: 'Cleave' }); } },
    shellguard: { name: 'Shell Guard', target: 'self', effect: function (c) { c.combat.applyStatus(c.user, 'guard', 2); c.log(c.user.name + ' pulls into its shell.'); } },
    drain: { name: 'Charge Siphon', target: 'enemy', effect: function (c) { const d = c.combat.magicHit(c.user, c.target, 1.0, 'rift', 'Charge Siphon'); c.combat.heal(c.user, Math.round(d * 0.6), null); } },
    swallow: { name: 'Swallow', target: 'enemy', effect: function (c) { c.combat.attack(c.user, c.target, { mult: 1.5, label: 'Swallow' }); if (c.rng.chance(0.3)) c.combat.applyStatus(c.target, 'stun', 1); } },
    arcblast: { name: 'Arc Blast', target: 'enemy', effect: function (c) { c.combat.magicHit(c.user, c.target, 1.3, 'arc', 'Arc Blast'); } },
    quake: { name: 'Quake', target: 'all-enemies', effect: function (c) { c.allies0(c).forEach(function (t) { c.combat.magicHit(c.user, t, 0.9, 'arc', 'Quake'); }); } },
    riftlance: { name: 'Rift Lance', target: 'enemy', effect: function (c) { c.combat.magicHit(c.user, c.target, 1.5, 'rift', 'Rift Lance'); } },
    regenrift: { name: 'Rift Mending', target: 'self', effect: function (c) { c.combat.heal(c.user, Math.round(c.user.maxHp * 0.15), 'Rift Mending'); } },
    terror: { name: 'Terror', target: 'enemy', effect: function (c) { c.combat.applyStatus(c.target, 'fear', 2); c.log(c.user.name + ' radiates dread.'); } },
    warcry: { name: 'Warcry', target: 'self', effect: function (c) { c.combat.applyStatus(c.user, 'rage', 3); c.log(c.user.name + ' bellows a warcry!'); } },
    // boss-only
    spawn_shadow: { name: 'Birth Shadow', target: 'self', effect: function (c) { c.combat.spawnAdd(c.user); } },
    midnight_flood: { name: 'Midnight Flood', target: 'all-enemies', effect: function (c) { c.allies0(c).forEach(function (t) { c.combat.magicHit(c.user, t, 1.2, 'rift', 'Midnight Flood'); }); c.log('Darkness floods the chamber!'); } },
  };

  TLU.Abilities = ABILITIES;
  TLU.EnemyAbilities = ENEMY_ABILITIES;
})(window.TLU = window.TLU || {});
