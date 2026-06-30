/* ============================================================
 * bestiary.js — enemies of Aurenmark, from scrap-mite to Gloammother.
 * Stats scale by an encounter "level"; many variants for variety.
 * ============================================================ */
(function (TLU) {
  'use strict';

  // Base templates. hp/atk/def are at the template's nominal level.
  // tags affect spawning biomes & resistances.
  const BESTIARY = [
    // --- weak / early ---
    { id: 'scrapmite', name: 'Scrap-Mite Swarm', glyph: 'c', color: '#9a8f80', lvl: 1, hp: 14, atk: 5, def: 1, spd: 13, xp: 6, gold: [1, 4], biomes: ['plains', 'hills', 'crater'], abilities: [] },
    { id: 'palefang_whelp', name: 'Palefang Whelp', glyph: 'w', color: '#e8e8e8', lvl: 2, hp: 22, atk: 8, def: 2, spd: 12, xp: 10, gold: [2, 6], biomes: ['plains', 'forest'] },
    { id: 'reaver_thug', name: 'Cinder Thug', glyph: 'r', color: '#c0533b', lvl: 2, hp: 26, atk: 9, def: 3, spd: 9, xp: 12, gold: [4, 12], biomes: ['plains', 'road', 'hills'], faction: 'reavers', drops: 'weapon' },
    { id: 'ridgehound', name: 'Ridgehound', glyph: 'd', color: '#b08040', lvl: 3, hp: 30, atk: 12, def: 3, spd: 16, xp: 14, gold: [0, 2], biomes: ['plains', 'forest', 'hills'], abilities: ['rend'] },
    // --- mid ---
    { id: 'craghorn', name: 'Wild Craghorn', glyph: 'C', color: '#7a6a4a', lvl: 4, hp: 70, atk: 14, def: 9, spd: 5, xp: 26, gold: [2, 8], biomes: ['plains', 'crater'], abilities: ['shellguard'] },
    { id: 'reaver_raider', name: 'Cinder Raider', glyph: 'R', color: '#c0533b', lvl: 4, hp: 48, atk: 16, def: 6, spd: 10, xp: 24, gold: [8, 24], biomes: ['plains', 'road', 'camp'], faction: 'reavers', drops: 'weapon', abilities: ['cleave'] },
    { id: 'gloamspawn', name: 'Gloamspawn', glyph: 'm', color: '#3a2a55', lvl: 5, hp: 40, atk: 18, def: 4, spd: 14, xp: 30, gold: [0, 0], biomes: ['ruin', 'vault', 'night'], tags: ['rift'], abilities: ['drain'] },
    { id: 'deepmaw', name: 'Deepmaw', glyph: 'D', color: '#553355', lvl: 6, hp: 90, atk: 22, def: 8, spd: 7, xp: 40, gold: [4, 14], biomes: ['cave', 'vault', 'chasm'], abilities: ['swallow'] },
    { id: 'churncaller', name: 'Churncaller', glyph: 'S', color: '#7e6bff', lvl: 7, hp: 80, atk: 24, def: 10, spd: 11, xp: 50, gold: [10, 30], biomes: ['storm', 'plateau'], tags: ['rift'], abilities: ['arcblast'], drops: 'gem' },
    // --- elite / late ---
    { id: 'cragwrought', name: 'Cragwrought Colossus', glyph: 'T', color: '#b04030', lvl: 9, hp: 180, atk: 34, def: 16, spd: 6, xp: 90, gold: [10, 40], biomes: ['ruin', 'vault', 'storm'], tags: ['rift', 'stone'], abilities: ['quake', 'cleave'], drops: 'rare' },
    { id: 'hollow_knight', name: 'Hollow Knight', glyph: 'F', color: '#cc55cc', lvl: 11, hp: 150, atk: 40, def: 18, spd: 15, xp: 120, gold: [20, 60], biomes: ['storm', 'vault', 'sky'], tags: ['rift'], abilities: ['riftlance', 'regenrift'], drops: 'rare' },
    { id: 'hollow_splinter', name: 'Splinter of the Hollow', glyph: 'U', color: '#ff4488', lvl: 13, hp: 240, atk: 48, def: 20, spd: 12, xp: 200, gold: [40, 100], biomes: ['vault', 'deepvault'], tags: ['rift'], abilities: ['terror', 'drain', 'arcblast'], drops: 'legendary' },
  ];

  // The final boss — the eldest Hollow One, awake beneath Dawnhollow.
  const FINAL_BOSS = {
    id: 'gloammother', name: 'Vethra, the Gloammother', glyph: 'Ω', color: '#ff2d78',
    lvl: 18, hp: 1100, atk: 60, def: 26, spd: 12, xp: 2000, gold: [500, 800], boss: true, tags: ['rift'],
    desc: 'A Hollow One of living darkness that births murderous shadows to mimic and kill.',
    phases: 3,
    abilities: ['spawn_shadow', 'terror', 'drain', 'arcblast', 'quake', 'midnight_flood'],
    drops: 'artifact',
  };

  // The authored hard finale — a superboss unlocked AFTER the main victory.
  const SUPERBOSS = {
    id: 'churnheart', name: 'Karth-Vael, the Heart of the Churn', glyph: '◉', color: '#ff2d78',
    lvl: 22, hp: 2600, atk: 86, def: 34, spd: 14, xp: 6000, gold: [0, 0], boss: true, tags: ['rift'],
    desc: 'The first of the Hollow Ones, and the engine of the Churn itself — the wound at the centre of the world. To still it is to end the Churn forever.',
    phases: 3,
    abilities: ['midnight_flood', 'quake', 'drain', 'terror', 'arcblast', 'spawn_shadow', 'riftlance'],
    drops: 'artifact',
  };

  // A mini-boss for the midgame.
  const MINIBOSS = {
    id: 'highlord_reaver', name: 'Varen, Warlord of Cinders', glyph: '☠', color: '#ff6a3d',
    lvl: 8, hp: 360, atk: 30, def: 14, spd: 11, xp: 300, gold: [120, 200], boss: true, faction: 'reavers',
    desc: 'The warlord uniting the Cinder Reavers. Wields a stolen Riftspur.',
    abilities: ['cleave', 'warcry', 'rend'], drops: 'rare',
  };

  function scale(base, level) {
    const e = Object.assign({}, base);
    const dl = Math.max(0, level - base.lvl);
    const f = 1 + dl * 0.18;
    e.maxHp = Math.round(base.hp * f);
    e.hp = e.maxHp;
    e.atk = Math.round(base.atk * (1 + dl * 0.12));
    e.def = Math.round(base.def * (1 + dl * 0.1));
    e.spd = base.spd;
    e.level = Math.max(base.lvl, level);
    e.xp = Math.round(base.xp * f);
    e.abilities = (base.abilities || []).slice();
    e.alive = true;
    e.kind = 'enemy';
    return e;
  }

  TLU.Bestiary = {
    LIST: BESTIARY,
    FINAL_BOSS: FINAL_BOSS,
    SUPERBOSS: SUPERBOSS,
    MINIBOSS: MINIBOSS,
    scale: scale,
    byId: function (id) {
      if (id === 'churnheart') return SUPERBOSS;
      if (id === 'gloammother') return FINAL_BOSS;
      return BESTIARY.find(function (b) { return b.id === id; }) || FINAL_BOSS;
    },
    // pick a template appropriate for biome & level, then scale it
    spawn: function (rng, biome, level) {
      let pool = BESTIARY.filter(function (b) {
        const ok = !b.biomes || b.biomes.indexOf(biome) >= 0;
        return ok && b.lvl <= level + 2;
      });
      if (!pool.length) pool = BESTIARY.filter(function (b) { return b.lvl <= level + 2; });
      if (!pool.length) pool = [BESTIARY[0]];
      // weight toward templates near the encounter level
      const weighted = pool.map(function (b) {
        const dist = Math.abs(b.lvl - level);
        return { v: b, w: Math.max(1, 6 - dist) };
      });
      const base = rng.weighted(weighted);
      return scale(base, level);
    },
    spawnGroup: function (rng, biome, level) {
      const n = level < 4 ? rng.int(1, 3) : rng.int(1, Math.min(4, 2 + Math.floor(level / 4)));
      const group = [];
      for (let i = 0; i < n; i++) group.push(TLU.Bestiary.spawn(rng, biome, level + rng.int(-1, 1)));
      return group;
    },
  };
})(window.TLU = window.TLU || {});
