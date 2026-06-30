/* ============================================================
 * content/example-pack.js — a worked example content pack.
 *
 * This single file adds a whole mini-region's worth of content —
 * a hold, two creatures, a unique blade, gear affixes, a bard NPC,
 * rumors, a travel event, a side-quest, and codex lore — WITHOUT
 * touching any engine code. Copy it as a template for your own packs.
 *
 * Read content/CONTENT_GUIDE.md for the full field reference.
 * To disable: remove its <script> tag from index.html.
 * ============================================================ */
(function (TLU) {
  'use strict';
  TLU.Content.register({
    id: 'frostmere',
    title: 'The Frostmere Reach',

    // --- world flavor ---
    holds: ['Frostmere'],
    gems: ['Opal'],
    biomeFlavor: {
      // overrides/extends existing biome intro text
      coast: 'The Frostmere shore, where pale ice-echoes drift in off a sea that never quite freezes.',
    },

    // --- a new NPC archetype (joins the town rotation automatically) ---
    npcs: {
      bard: {
        role: 'Wandering Bard', glyph: '♪', color: '#ffb3de',
        greet: [
          '"Ah, a face with a story in it! Sit — let me trade you a verse for it."',
          '"Coin for a song? Or a song for a rumor? I deal in both."',
        ],
        talk: [
          '"I sang in the spire-cities once, before the gale took my patron and his roof."',
          '"There\'s a ballad of the first Kindled that the temples banned. I know all nine verses. Buy me a drink."',
          '"Every hold has a song. Frostmere\'s is a lament. They usually are, this far east."',
          '"A good rumor travels faster than a Churn. And lies faster still."',
        ],
        bye: ['"Travel light, and hum as you go."', '"May your story end in a tavern, not a ditch."'],
      },
    },

    // --- rumors (flavor) and a site-revealing rumor ---
    rumors: [
      'They say the Frostmere ice hides a vault no Deepdelver has ever bottomed.',
      'A bard sang of a blade named Hoarfrost that freezes the soul it cuts. Then he vanished.',
    ],
    siteRumors: [
      { type: 'vault', text: 'The bard lowers her voice: "An ice-drowned Riftvault lies {dir}. Cold enough to keep its dead fresh."' },
    ],

    // --- ambient bark + a non-combat travel event ---
    barks: [
      'A pale ice-wisp drifts past, trailing frost that melts before it lands.',
    ],
    events: [
      { id: 'frost_spring', weight: 2,
        text: 'A frost-rimed spring bubbles up, shockingly clean. You drink deep and feel renewed.',
        effect: function (g) { var p = g.player; var h = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * 0.25)); p.hp += h; g.msg('%cThe cold water mends you: +' + h + ' HP.', 'good'); } },
    ],

    // --- two new creatures (with codex lore baked in) ---
    bestiary: [
      { id: 'frost_wisp', name: 'Hoarfrost Echo', glyph: 'i', color: '#aee3ff', lvl: 3, hp: 26, atk: 11, def: 2, spd: 15,
        xp: 16, gold: [0, 4], biomes: ['coast', 'plains', 'hills'], abilities: ['stormblast'], drops: 'gem',
        lore: 'Hoarfrost Echoes are echoes soured by the cold sea — beautiful, drifting, and lethally sharp when they cluster.' },
      { id: 'ice_revenant', name: 'Ice-Drowned Revenant', glyph: 'Z', color: '#7fb3d9', lvl: 7, hp: 95, atk: 26, def: 11, spd: 8,
        xp: 55, gold: [6, 20], biomes: ['vault', 'coast'], tags: ['void'], abilities: ['drain', 'rend'], drops: 'rare',
        lore: 'Ice-Drowned Revenants are the dead of sunken vaults, preserved and animated by the cold and the dark beneath it.' },
    ],

    // --- gear: an affix pair and a unique weapon ---
    prefixes: [
      { id: 'frostforged', name: 'Frostforged', tier: 3, bonus: { def: 5, maxHp: 15 } },
    ],
    suffixes: [
      { id: 'of_hoarfrost', name: 'of Hoarfrost', tier: 3, bonus: { dmg: 6, element: 'frost' } },
    ],
    uniques: {
      hoarfrost: function () {
        return {
          uid: TLU.Items.uid(), type: 'weapon', base: 'sidesword', glyph: '†', mat: 'shardsteel', color: '#aee3ff',
          name: 'Hoarfrost, the Soulchill', skill: 'blades', slot: 'weapon', hands: 1, dmg: 48, speed: 11, crit: 0.18,
          armorPierce: 0.4, shard: true, rarity: 'artifact', level: 14, affixes: [{ name: 'Soulchill', tier: 5 }],
          bonus: { dmg: 16, element: 'frost', maxStormlight: 30 }, value: 9999,
          desc: 'A Riftblade sheathed in everfrost. What it cuts, the cold remembers.',
        };
      },
    },

    // --- a side-quest (joins the Quests log) ---
    quests: [
      { id: 'frostmere_vault', name: 'The Ice That Remembers', faction: 'guild',
        stages: [{ id: 'delve', text: 'Brave an ice-drowned Riftvault and slay an Ice-Drowned Revenant.', trigger: { type: 'killType', who: 'ice_revenant' } }],
        onComplete: { gold: 700, item: { unique: 'hoarfrost' } } },
    ],

    // --- codex lore ---
    codex: {
      world: [
        { id: 'frostmere', title: 'The Frostmere Reach', text: 'A cold northern coast where the Eastern Sea laps at black ice. The Churn comes rarely here, but when it does, it brings the drowned dead with it.' },
      ],
    },
  });
})(window.TLU = window.TLU || {});
