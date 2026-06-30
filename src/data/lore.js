/* ============================================================
 * lore.js — world bible for THE LANDS UNKNOWN
 *
 * A far-future, deep-time science-fantasy (its own setting):
 *   • AURENMARK — the worn skin of a world built and ruined countless
 *     times across uncounted ages. The ground is layered with the
 *     vaults and bones of prior peoples and the machines they left.
 *   • THE CHURN — a self-propagating tide of ancient disassembler-motes:
 *     old machines still executing a task no one remembers, taking the
 *     land apart and scattering it east. It walks the world, slow and sure.
 *   • CHARGE — the ambient power that still leaks from the buried
 *     machines, drawn from cells to wake old devices and work the Attunements.
 *   • ECHOES — the deep vaults imprinted the dying long ago; the Churn
 *     stirs those recordings loose to walk as echoes — memory given a shell.
 *   • THE KINDLED — the rare few an echo-shell will bond to, who can
 *     wake the old machines, draw Charge, and turn the Attunements.
 *
 * (Internal ids are kept stable across the codebase; only the display
 *  text below carries the setting's flavor.)
 * ============================================================ */
(function (TLU) {
  'use strict';

  TLU.LORE = {
    title: 'THE LANDS UNKNOWN',
    subtitle: 'A Chronicle of the Churn',
    continent: 'Aurenmark',

    intro: [
      'The Churn walks the world from east to west — a haze of old machine-dust',
      'that takes the land apart, motes still finishing a task their makers forgot.',
      '',
      'You are one of the Unkindled — born without the echo the spires promised,',
      'cast out of the vault-cities to wander the undone marches. But an echo has',
      'bonded to you now: a recorded soul out of some buried machine, humming at your',
      'shoulder, and a vanished order of the Kindled whispers your name in the wind.',
      '',
      'Aurenmark is wide and unkind and crowded with leftover ages: drowned',
      'Riftvaults, feuding holds, things wearing the shapes of the people they ate.',
      'Go where you will. Draw the Charge. Carry the dead. And when the Gloammother',
      'wakes beneath the ruin of Dawnhollow, be the one who stands in the last Churn.',
    ],

    // The five orders of the Kindled — adept-traditions, and Elder-Scrolls-style
    // "classes". KEYS are internal ids (referenced by abilities/player); the
    // `attune` arrays name the two Attunements each tradition is biased toward
    // (lowercased, they map to skill ids).
    orders: {
      skyrender:   { name: 'Skyrender',   attune: ['Pull', 'Bind'],   glyph: '↑', color: '#7ec8ff', blurb: 'Adepts who wake the old lift-engines — reversing a thing\'s weight and pinning foes to the ground.' },
      stonewarden: { name: 'Stonewarden', attune: ['Form', 'Strain'], glyph: '■', color: '#c98a4b', blurb: 'Unbreakable wardens who shape stone and alloy and refuse to fall.' },
      slipstrider: { name: 'Slipstrider', attune: ['Glide', 'Mend'],  glyph: '»', color: '#67e08a', blurb: 'Frictionless dancers who slide between blows and coax flesh to knit.' },
      veilseer:    { name: 'Veilseer',    attune: ['Mend', 'Veil'],   glyph: '◈', color: '#d9a7ff', blurb: 'Seers who weave hard-light into illusion and read the patterns of what comes.' },
      cinderwright:{ name: 'Cinderwright', attune: ['Cinder', 'Glide'], glyph: '✸', color: '#ff7a4b', blurb: 'Feared disassemblers who take matter apart with a touch of cutting flame.' },
    },

    // Power cells — old batteries that still hold Charge, prized and traded.
    gems: ['Sapphire', 'Smokestone', 'Ruby', 'Diamond', 'Emerald', 'Garnet', 'Heliodor', 'Topaz', 'Amethyst', 'Zircon'],

    factions: {
      coalition: { name: 'The Wardens',       blurb: 'Scholars and soldiers who would unite the holds against the Churn.' },
      reavers:   { name: 'The Cinder Reavers', blurb: 'Raiders who worship the Churn and take what the weak cannot keep.' },
      guild:     { name: 'The Deepdelvers',   blurb: 'Treasure-hunters who plumb the drowned Riftvaults for lost devices.' },
      cult:      { name: 'The Hollowed',      blurb: 'A hidden cult hastening the waking of the Hollow Ones.' },
    },

    // Names used by the procedural name generator.
    nameParts: {
      pre:  ['Ka', 'Sha', 'Vor', 'Eln', 'Tal', 'Rys', 'Adon', 'Mei', 'Hael', 'Ves', 'Dar', 'Sil', 'Nan', 'Iri', 'Sel', 'Bren', 'Cor', 'Mar'],
      mid:  ['la', 'ra', 'mor', 'dal', 'eth', 'vin', 'ara', 'oden', 'ish', 'esh', 'an', 'or', 'wen', 'is'],
      suf:  ['', 'i', 'as', 'eth', 'in', 'a', 'os', 'ai', 'en', 'ar', 'wyn', 'ric'],
    },

    holds: ['Vesmark', 'Caldspire', 'Thornholt', 'Greywall', 'Saltmere', 'Emberhold', 'Dunmoor', 'Highreach'],

    // Original creed of the Kindled (no relation to any other work's ideals).
    creed: ['Remember the dead.', 'Outlast the Churn.', 'Carry what is lost.'],

    deathQuotes: [
      'The Churn does not mourn. It only moves on.',
      'Another shell shaken loose, to drift the undone east.',
      'Your echo scatters into stray light and is gone.',
      'They said the Kindled outlast the Churn. Not you. Not today.',
      'The marches swallow another nameless wanderer.',
    ],

    // Flavor shown when first entering a biome (discovery pull).
    biomeFlavor: {
      plains:  'Ironbud fields stretch to the horizon — old crop-machines, long seized, that still close their shells as you pass.',
      hills:   'Windward hills, scoured bare, hum faintly when the Churn draws near.',
      forest:  'Stonewood groans overhead — bark like slate, leaves like blades.',
      plateau: 'The Sundered Plains: a maze of chasms where the Churn first broke the world.',
      crater:  'Crater flats pocked with old undoings, glittering with cell-dust.',
      storm:   'The Churnreach. Here the machine-tide never fully sleeps. Charge comes easy; death easier.',
      desert:  'The Ashlands — grey dunes of undone stone, where nothing grows but rumor.',
      coast:   'The shore of the Eastern Sea, where the loosed dead are said to drift home.',
    },
  };

  // --- procedural proper-name generator ---
  TLU.genName = function (rng) {
    const p = TLU.LORE.nameParts;
    let n = rng.pick(p.pre) + (rng.chance(0.6) ? rng.pick(p.mid) : '') + rng.pick(p.suf);
    return n.charAt(0).toUpperCase() + n.slice(1);
  };
})(window.TLU = window.TLU || {});
