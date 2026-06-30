/* ============================================================
 * skills.js — Elder-Scrolls-style skills that improve through use.
 * Using a skill grants XP toward it; skill-ups feed character level.
 * ============================================================ */
(function (TLU) {
  'use strict';

  const SKILLS = {
    // combat
    blades:   { name: 'Blades',   group: 'combat', desc: 'Swords and daggers.' },
    blunt:    { name: 'Blunt',    group: 'combat', desc: 'Maces and hammers.' },
    polearm:  { name: 'Polearm',  group: 'combat', desc: 'Spears and glaives.' },
    archery:  { name: 'Archery',  group: 'combat', desc: 'Bows and ranged precision.' },
    block:    { name: 'Block',    group: 'combat', desc: 'Shields and parrying.' },
    // armor
    heavy:    { name: 'Heavy Armor', group: 'armor', desc: 'Plate and mail.' },
    light:    { name: 'Light Armor', group: 'armor', desc: 'Leather and cloth.' },
    // Attunements — the old arts of waking leftover machines (one per device-class)
    pull:   { name: 'Pull',   group: 'attune', desc: 'Bend the weight of things with old lift-engines.' },
    bind:   { name: 'Bind',   group: 'attune', desc: 'Fuse matter with adhesive fields.' },
    form:   { name: 'Form',   group: 'attune', desc: 'Shape and harden stone, alloy, and self.' },
    strain: { name: 'Strain', group: 'attune', desc: 'Stress matter to its breaking point.' },
    glide:  { name: 'Glide',  group: 'attune', desc: 'Shed friction; slide and evade.' },
    mend:   { name: 'Mend',   group: 'attune', desc: 'Coax flesh and metal to knit and grow.' },
    veil:   { name: 'Veil',   group: 'attune', desc: 'Weave hard-light into illusion and sight.' },
    cinder: { name: 'Cinder', group: 'attune', desc: 'Disassemble matter with cutting flame.' },
    // utility
    lockpick: { name: 'Lockpicking', group: 'utility', desc: 'Open what is closed.' },
    barter:   { name: 'Barter',      group: 'utility', desc: 'Better prices when trading.' },
    survival: { name: 'Survival',    group: 'utility', desc: 'Endure the marches and travel.' },
    alchemy:  { name: 'Alchemy',     group: 'utility', desc: 'Brew draughts and charge cells.' },
  };

  // XP needed to advance a skill from level L to L+1.
  function skillXpFor(level) { return Math.round(20 + level * level * 1.6 + level * 6); }
  // XP needed to advance character level.
  function levelXpFor(level) { return Math.round(80 * Math.pow(level, 1.45)); }

  TLU.Skills = {
    LIST: SKILLS,
    skillXpFor: skillXpFor,
    levelXpFor: levelXpFor,
    ids: Object.keys(SKILLS),
    combatSkills: Object.keys(SKILLS).filter(function (k) { return SKILLS[k].group === 'combat'; }),
    attuneSkills: Object.keys(SKILLS).filter(function (k) { return SKILLS[k].group === 'attune'; }),
  };
})(window.TLU = window.TLU || {});
