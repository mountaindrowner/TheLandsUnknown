/* ============================================================
 * lore.js — world flavor for THE LANDS UNKNOWN
 * A storm-wracked continent in the spirit of the Stormlight Archive,
 * explored with Elder-Scrolls freedom and Dwarf-Fortress depth.
 * ============================================================ */
(function (TLU) {
  'use strict';

  TLU.LORE = {
    title: 'THE LANDS UNKNOWN',
    subtitle: 'A Chronicle of Storm and Shard',
    continent: 'Kharavar',

    intro: [
      'The Everstorm walks the world from east to west, and where it passes the',
      'stones grow legs and the souls of the dead light the dark like embers.',
      '',
      'You are one of the Stormless — born without the gift the priests promised,',
      'cast out of the spire-cities to wander the broken plains. But the spren',
      'have begun to follow you, and a dead order of knights whispers your name.',
      '',
      'Kharavar is wide and cruel and full of forgotten things: sunken Shardvaults,',
      'feuding holds, monsters wearing the shapes of men. Go where you will.',
      'Bind the surges. Claim a Blade. And when the Unmade wakes beneath Aharietiam,',
      'be the one who stands in the last storm.',
    ],

    // Knightly orders double as Elder-Scrolls-style "classes / guild paths".
    orders: {
      windrunner:  { name: 'Windrunner',  surge: ['Gravitation', 'Adhesion'], glyph: '↑', color: '#7ec8ff', blurb: 'Sky-soldiers who break the pull of the world and bind foe to stone.' },
      stoneward:   { name: 'Stoneward',   surge: ['Cohesion', 'Tension'],     glyph: '■', color: '#c98a4b', blurb: 'Unbreakable wardens who shape stone and refuse to fall.' },
      edgedancer:  { name: 'Edgedancer',  surge: ['Abrasion', 'Progression'], glyph: '»', color: '#67e08a', blurb: 'Frictionless dancers who slide between blows and mend flesh.' },
      truthwatcher:{ name: 'Truthwatcher', surge: ['Progression', 'Illumination'], glyph: '◈', color: '#d9a7ff', blurb: 'Seers who weave light into illusion and read the threads of fate.' },
      dustbringer: { name: 'Dustbringer',  surge: ['Division', 'Abrasion'],   glyph: '✸', color: '#ff7a4b', blurb: 'Feared ash-makers who unmake matter with a touch of flame.' },
    },

    // The ten Polestone gems — currency of magic (Stormlight infusion).
    gems: ['Sapphire', 'Smokestone', 'Ruby', 'Diamond', 'Emerald', 'Garnet', 'Heliodor', 'Topaz', 'Amethyst', 'Zircon'],

    factions: {
      coalition: { name: 'The Stormwardens',   blurb: 'Scholars and soldiers who would unite the holds against the Everstorm.' },
      reavers:   { name: 'The Ashen Reavers',  blurb: 'Raiders who worship the storm and take what the weak cannot keep.' },
      guild:     { name: 'The Vaultseekers',   blurb: 'Treasure-hunters who plumb the sunken Shardvaults for lost technology.' },
      cult:      { name: 'Children of the Unmade', blurb: 'A hidden cult hastening the return of the void-gods.' },
    },

    // Names used by the procedural name generator.
    nameParts: {
      pre:  ['Ka', 'Sha', 'Vor', 'Eln', 'Tal', 'Rys', 'Adon', 'Mei', 'Hoid', 'Ves', 'Dar', 'Sil', 'Nan', 'Iri', 'Sel'],
      mid:  ['la', 'ra', 'mor', 'dal', 'eth', 'vin', 'ara', 'oden', 'ish', 'esh', 'an', 'or'],
      suf:  ['', 'i', 'as', 'eth', 'in', 'a', 'os', 'ai', 'en', 'ar'],
    },

    holds: ['Aharietiam', 'Vedenar', 'Kholin Spire', 'Thaylen Reach', 'Sesemalex', 'Urithar', 'Kasitor', 'Revolar'],

    deathQuotes: [
      'The storm does not mourn. It only moves on.',
      'Another soul for the highstorm to carry east.',
      'Your spren scatters into windspren and is gone.',
      'Journey before destination, they said. Your journey ends here.',
    ],
  };

  // --- procedural proper-name generator ---
  TLU.genName = function (rng) {
    const p = TLU.LORE.nameParts;
    let n = rng.pick(p.pre) + (rng.chance(0.6) ? rng.pick(p.mid) : '') + rng.pick(p.suf);
    return n.charAt(0).toUpperCase() + n.slice(1);
  };
})(window.TLU = window.TLU || {});
