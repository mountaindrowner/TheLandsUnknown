/* ============================================================
 * lore.js — world flavor for THE LANDS UNKNOWN
 * An original storm-haunted world of gale, gleam, and living wisps.
 * (Internal ids are kept stable across the codebase; only the
 *  display names below carry the setting's flavor.)
 * ============================================================ */
(function (TLU) {
  'use strict';

  TLU.LORE = {
    title: 'THE LANDS UNKNOWN',
    subtitle: 'A Chronicle of Gale and Gleam',
    continent: 'Aurenmark',

    intro: [
      'The Galestorm walks the world from east to west, and where it passes the',
      'stones wake and the souls of the dead drift like embers on the wind.',
      '',
      'You are one of the Gleamless — born without the gift the temples promised,',
      'cast out of the spire-cities to wander the sundered marches. But the wisps',
      'have begun to gather at your shoulder, and a dead order of knights stirs.',
      '',
      'Aurenmark is wide and unkind and crowded with forgotten things: drowned',
      'Riftvaults, feuding holds, monsters wearing the shapes of men. Go where you',
      'will. Breathe the Gleam. Claim a Riftblade. And when the Gloammother wakes',
      'beneath the ruin of Dawnhollow, be the one who stands in the last storm.',
    ],

    // Knightly orders double as Elder-Scrolls-style "classes / guild paths".
    // KEYS are internal ids (referenced by abilities/player); names are flavor.
    orders: {
      windrunner:  { name: 'Galewalker',   surge: ['Pull', 'Bind'],     glyph: '↑', color: '#7ec8ff', blurb: 'Sky-soldiers who break the world\'s pull and bind foe to stone.' },
      stoneward:   { name: 'Stonewarden',  surge: ['Form', 'Strain'],   glyph: '■', color: '#c98a4b', blurb: 'Unbreakable wardens who shape stone and refuse to fall.' },
      edgedancer:  { name: 'Slipstrider',  surge: ['Glide', 'Growth'],  glyph: '»', color: '#67e08a', blurb: 'Frictionless dancers who slide between blows and mend flesh.' },
      truthwatcher:{ name: 'Veilseer',     surge: ['Growth', 'Light'],  glyph: '◈', color: '#d9a7ff', blurb: 'Seers who weave light into illusion and read the threads of fate.' },
      dustbringer: { name: 'Cinderwright', surge: ['Cinder', 'Glide'],  glyph: '✸', color: '#ff7a4b', blurb: 'Feared ash-makers who unmake matter with a touch of flame.' },
    },

    // The polestone gems — vessels of stored Gleam.
    gems: ['Sapphire', 'Smokestone', 'Ruby', 'Diamond', 'Emerald', 'Garnet', 'Heliodor', 'Topaz', 'Amethyst', 'Zircon'],

    factions: {
      coalition: { name: 'The Galewardens',  blurb: 'Scholars and soldiers who would unite the holds against the Galestorm.' },
      reavers:   { name: 'The Cinder Reavers', blurb: 'Raiders who worship the storm and take what the weak cannot keep.' },
      guild:     { name: 'The Deepdelvers',  blurb: 'Treasure-hunters who plumb the drowned Riftvaults for lost wonders.' },
      cult:      { name: 'The Hollowed',     blurb: 'A hidden cult hastening the return of the Hollow Ones.' },
    },

    // Names used by the procedural name generator.
    nameParts: {
      pre:  ['Ka', 'Sha', 'Vor', 'Eln', 'Tal', 'Rys', 'Adon', 'Mei', 'Hael', 'Ves', 'Dar', 'Sil', 'Nan', 'Iri', 'Sel', 'Bren', 'Cor', 'Mar'],
      mid:  ['la', 'ra', 'mor', 'dal', 'eth', 'vin', 'ara', 'oden', 'ish', 'esh', 'an', 'or', 'wen', 'is'],
      suf:  ['', 'i', 'as', 'eth', 'in', 'a', 'os', 'ai', 'en', 'ar', 'wyn', 'ric'],
    },

    holds: ['Vesmark', 'Caldspire', 'Thornholt', 'Greywall', 'Saltmere', 'Emberhold', 'Dunmoor', 'Highreach'],

    deathQuotes: [
      'The storm does not mourn. It only moves on.',
      'Another soul for the Galestorm to carry east.',
      'Your wisp scatters into windlight and is gone.',
      'Strength before weakness, they said. Your strength fails here.',
      'The marches swallow another nameless wanderer.',
    ],

    // Flavor shown when first entering a biome (discovery pull).
    biomeFlavor: {
      plains:  'Rockbud fields stretch to the horizon, shells closing as you pass.',
      hills:   'Windward hills, scoured bare, hum faintly in the rising gale.',
      forest:  'Stonewood groans overhead — bark like slate, leaves like blades.',
      plateau: 'The Sundered Plains: a maze of chasms where armies once died.',
      crater:  'Crater flats pocked with old impacts, glittering with gem-dust.',
      storm:   'The Galeseat. Here the storm never fully sleeps. Gleam comes easy; death easier.',
      desert:  'The Ashlands — grey dunes of burnt stone, where nothing grows but rumor.',
      coast:   'The shore of the Eastern Sea, where the dead are said to drift home.',
    },
  };

  // --- procedural proper-name generator ---
  TLU.genName = function (rng) {
    const p = TLU.LORE.nameParts;
    let n = rng.pick(p.pre) + (rng.chance(0.6) ? rng.pick(p.mid) : '') + rng.pick(p.suf);
    return n.charAt(0).toUpperCase() + n.slice(1);
  };
})(window.TLU = window.TLU || {});
