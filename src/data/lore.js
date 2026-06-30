/* ============================================================
 * lore.js — world bible for THE LANDS UNKNOWN
 *
 * An original death-and-memory cosmology:
 *   • THE CHURN — a slow apocalypse that walks the world, unmaking
 *     the land and stirring the dead from their rest.
 *   • ANIMA — the soul-light shaken loose from the dead by the Churn;
 *     breathed from gemstones to fuel the Arts.
 *   • ECHOES — lingering fragments of the dead that gather to the
 *     living. The dead never truly leave Aurenmark.
 *   • THE KINDLED — those who carry an echo and can channel the Arts.
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
      'The Churn walks the world from east to west, and where it passes the land is',
      'unmade and remade, and the dead rise from their rest to drift like embers.',
      '',
      'You are one of the Unkindled — born without the echo the temples promised,',
      'cast out of the spire-cities to wander the unmade marches. But an echo has',
      'found you now: a fragment of some forgotten dead, burning quietly at your',
      'shoulder, and a vanished order of the Kindled whispers your name in the wind.',
      '',
      'Aurenmark is wide and unkind and crowded with the unforgotten: drowned',
      'Riftvaults, feuding holds, things wearing the shapes of the people they ate.',
      'Go where you will. Breathe the Anima. Carry the dead. And when the Gloammother',
      'wakes beneath the ruin of Dawnhollow, be the one who stands in the last Churn.',
    ],

    // Knightly orders double as Elder-Scrolls-style "classes".
    // KEYS are internal ids (referenced by abilities/player); names are flavor.
    orders: {
      windrunner:  { name: 'Skyrender',  surge: ['Pull', 'Bind'],     glyph: '↑', color: '#7ec8ff', blurb: 'Sky-walkers who break the world\'s pull and bind foe to stone.' },
      stoneward:   { name: 'Stonewarden', surge: ['Form', 'Strain'],  glyph: '■', color: '#c98a4b', blurb: 'Unbreakable wardens who shape stone and refuse to fall.' },
      edgedancer:  { name: 'Slipstrider', surge: ['Glide', 'Mend'],   glyph: '»', color: '#67e08a', blurb: 'Frictionless dancers who slide between blows and mend flesh.' },
      truthwatcher:{ name: 'Veilseer',    surge: ['Mend', 'Light'],   glyph: '◈', color: '#d9a7ff', blurb: 'Seers who weave light into illusion and read the threads of fate.' },
      dustbringer: { name: 'Cinderwright', surge: ['Cinder', 'Glide'], glyph: '✸', color: '#ff7a4b', blurb: 'Feared ash-makers who unmake matter with a touch of flame.' },
    },

    // The polestone gems — vessels of stored Anima.
    gems: ['Sapphire', 'Smokestone', 'Ruby', 'Diamond', 'Emerald', 'Garnet', 'Heliodor', 'Topaz', 'Amethyst', 'Zircon'],

    factions: {
      coalition: { name: 'The Wardens',       blurb: 'Scholars and soldiers who would unite the holds against the Churn.' },
      reavers:   { name: 'The Cinder Reavers', blurb: 'Raiders who worship the unmaking and take what the weak cannot keep.' },
      guild:     { name: 'The Deepdelvers',   blurb: 'Treasure-hunters who plumb the drowned Riftvaults for lost wonders.' },
      cult:      { name: 'The Hollowed',      blurb: 'A hidden cult hastening the return of the Hollow Ones.' },
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
      'Another soul shaken loose, to drift the unmade east.',
      'Your echo scatters into emberlight and is gone.',
      'They said the Kindled outlast the Churn. Not you. Not today.',
      'The marches swallow another nameless wanderer.',
    ],

    // Flavor shown when first entering a biome (discovery pull).
    biomeFlavor: {
      plains:  'Rockbud fields stretch to the horizon, shells closing as you pass.',
      hills:   'Windward hills, scoured bare, hum faintly when the Churn draws near.',
      forest:  'Stonewood groans overhead — bark like slate, leaves like blades.',
      plateau: 'The Sundered Plains: a maze of chasms where the Churn first broke the world.',
      crater:  'Crater flats pocked with old unmakings, glittering with gem-dust.',
      storm:   'The Churnreach. Here the unmaking never fully sleeps. Anima comes easy; death easier.',
      desert:  'The Ashlands — grey dunes of unmade stone, where nothing grows but rumor.',
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
