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
    // surgebinding schools (one per surge)
    gravitation: { name: 'Pull', group: 'surge', desc: 'Bend the pull of the world.' },
    adhesion:    { name: 'Bind',    group: 'surge', desc: 'Bind things together.' },
    cohesion:    { name: 'Form',    group: 'surge', desc: 'Shape and harden stone & self.' },
    tension:     { name: 'Strain',     group: 'surge', desc: 'Stress matter to breaking.' },
    abrasion:    { name: 'Glide',    group: 'surge', desc: 'Remove friction; slide and evade.' },
    progression: { name: 'Growth', group: 'surge', desc: 'Accelerate growth and healing.' },
    illumination:{ name: 'Light',group: 'surge', desc: 'Weave light and illusion.' },
    division:    { name: 'Cinder',    group: 'surge', desc: 'Unmake matter with fire.' },
    // utility
    lockpick: { name: 'Lockpicking', group: 'utility', desc: 'Open what is closed.' },
    barter:   { name: 'Barter',      group: 'utility', desc: 'Better prices when trading.' },
    survival: { name: 'Survival',    group: 'utility', desc: 'Endure storms and travel.' },
    alchemy:  { name: 'Alchemy',     group: 'utility', desc: 'Brew draughts and infuse gems.' },
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
    surgeSkills: Object.keys(SKILLS).filter(function (k) { return SKILLS[k].group === 'surge'; }),
  };
})(window.TLU = window.TLU || {});
