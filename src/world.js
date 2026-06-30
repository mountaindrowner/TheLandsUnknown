/* ============================================================
 * world.js — procedural overworld of Aurenmark.
 * Value-noise heightmap -> biomes; scatter towns, vaults, camps,
 * roads, and the final ruin of Dawnhollow. Fully seed-reproducible.
 * ============================================================ */
(function (TLU) {
  'use strict';

  const BIOMES = {
    ocean:   { id: 'ocean',   glyph: '~', color: '#1d4e73', bg: '#0c2436', name: 'The Eastern Sea', passable: false },
    coast:   { id: 'coast',   glyph: '.', color: '#caa86a', bg: '#1a1d12', name: 'Shore', biome: 'plains' },
    plains:  { id: 'plains',  glyph: '"', color: '#6f8a3f', bg: '#12160c', name: 'Rockbud Plains', biome: 'plains' },
    hills:   { id: 'hills',   glyph: 'n', color: '#7d7048', bg: '#16140c', name: 'Windward Hills', biome: 'hills' },
    forest:  { id: 'forest',  glyph: '♣', color: '#3f7a3f', bg: '#0d160d', name: 'Stonewood', biome: 'forest' },
    mountain:{ id: 'mountain',glyph: '▲', color: '#8a8a8a', bg: '#161616', name: 'The Unclimbed', biome: 'plateau', passable: false },
    plateau: { id: 'plateau', glyph: '=', color: '#9a7a4a', bg: '#161208', name: 'Sundered Plains', biome: 'plateau' },
    crater:  { id: 'crater',  glyph: 'o', color: '#6a5a3a', bg: '#13100a', name: 'Crater Flats', biome: 'crater' },
    storm:   { id: 'storm',   glyph: '§', color: '#7e6bff', bg: '#0e0b1a', name: 'The Churnreach', biome: 'storm' },
    desert:  { id: 'desert',  glyph: ':', color: '#caa84a', bg: '#161206', name: 'The Ashlands', biome: 'plains' },
  };

  // simple 2D value noise from RNG-seeded gradient grid
  function makeNoise(rng, w, h, scale) {
    const gw = Math.ceil(w / scale) + 2, gh = Math.ceil(h / scale) + 2;
    const grid = [];
    for (let y = 0; y < gh; y++) { grid[y] = []; for (let x = 0; x < gw; x++) grid[y][x] = rng.next(); }
    function smooth(t) { return t * t * (3 - 2 * t); }
    return function (x, y) {
      const fx = x / scale, fy = y / scale;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = smooth(fx - x0), ty = smooth(fy - y0);
      const a = grid[y0][x0], b = grid[y0][x0 + 1], cc = grid[y0 + 1][x0], d = grid[y0 + 1][x0 + 1];
      const top = a + (b - a) * tx, bot = cc + (d - cc) * tx;
      return top + (bot - top) * ty;
    };
  }

  function generate(seedStr, opts) {
    opts = opts || {};
    const W = opts.w || 96, H = opts.h || 64;
    const rng = new TLU.RNG(seedStr);
    const height = makeNoise(rng.fork('height'), W, H, 11);
    const moist  = makeNoise(rng.fork('moist'), W, H, 9);
    const detail = makeNoise(rng.fork('detail'), W, H, 4);

    const tiles = []; // tiles[y][x] = { biome, glyph, color, ... }
    for (let y = 0; y < H; y++) {
      tiles[y] = [];
      for (let x = 0; x < W; x++) {
        // island-ish falloff so the sea rings the continent
        const dx = (x / W - 0.5) * 2, dy = (y / H - 0.5) * 2;
        const fall = 1 - Math.min(1, Math.sqrt(dx * dx + dy * dy) * 0.95);
        let e = height(x, y) * 0.7 + detail(x, y) * 0.3;
        e = e * 0.55 + fall * 0.55;
        const m = moist(x, y);
        let b;
        if (e < 0.30) b = BIOMES.ocean;
        else if (e < 0.345) b = BIOMES.coast;
        else if (e > 0.82) b = BIOMES.mountain;
        else if (e > 0.70) b = BIOMES.plateau;
        else if (x > W * 0.62 && m > 0.55 && e > 0.45) b = BIOMES.storm; // east = churn-wracked
        else if (m < 0.30 && x > W * 0.5) b = BIOMES.desert;
        else if (m > 0.62 && e < 0.6) b = BIOMES.forest;
        else if (e > 0.55) b = BIOMES.hills;
        else if (m < 0.38) b = BIOMES.crater;
        else b = BIOMES.plains;
        tiles[y][x] = {
          biome: b.biome || b.id, glyph: b.glyph, color: b.color, bg: b.bg,
          name: b.name, passable: b.passable !== false, e: e,
        };
      }
    }

    const sites = [];
    function isLand(x, y) { return x >= 0 && y >= 0 && x < W && y < H && tiles[y][x].passable; }
    function placeSite(site, minDist) {
      for (let tries = 0; tries < 400; tries++) {
        const x = rng.int(3, W - 4), y = rng.int(3, H - 4);
        if (!isLand(x, y)) continue;
        if (tiles[y][x].site) continue;
        let ok = true;
        for (const s of sites) { if (Math.abs(s.x - x) + Math.abs(s.y - y) < (minDist || 6)) { ok = false; break; } }
        if (!ok) continue;
        site.x = x; site.y = y;
        tiles[y][x].site = site;
        tiles[y][x].passable = true;
        sites.push(site);
        return site;
      }
      return null;
    }

    // --- Towns (hubs) ---
    const holdNames = rng.shuffle(TLU.LORE.holds);
    const TOWN_COUNT = 5;
    const towns = [];
    for (let i = 0; i < TOWN_COUNT; i++) {
      const t = placeSite({
        type: 'town', glyph: '⌂', color: '#ffd86b', name: holdNames[i] || ('Hold ' + (i + 1)),
        level: 1 + i * 2,
        services: ['rest', 'shop', 'train', 'tavern'],
      }, 9);
      if (t) towns.push(t);
    }
    // designate the first town as the starting hub
    const start = towns[0] || { x: Math.floor(W / 2), y: Math.floor(H / 2) };

    // --- Vault dungeons (the meat) ---
    const VAULT_COUNT = 8;
    const vaults = [];
    for (let i = 0; i < VAULT_COUNT; i++) {
      const v = placeSite({
        type: 'vault', glyph: '▼', color: '#b99cff', name: 'Riftvault of ' + TLU.genName(rng),
        level: 3 + i * 2, floors: 2 + Math.min(5, Math.floor(i / 1.3)),
        hasFragment: i < 4, // four fragments across the early vaults
        cleared: false,
      }, 7);
      if (v) vaults.push(v);
    }

    // --- Reaver camps ---
    const CAMP_COUNT = 6;
    const camps = [];
    for (let i = 0; i < CAMP_COUNT; i++) {
      const c = placeSite({
        type: 'camp', glyph: '▲', color: '#c0533b', name: 'Cinder Reaver Camp', level: 2 + i, cleared: false,
      }, 6);
      if (c) camps.push(c);
    }

    // --- Mini-boss lair ---
    const lair = placeSite({ type: 'lair', glyph: '☠', color: '#ff6a3d', name: 'Varen\'s Warcamp', level: 8, boss: 'highlord_reaver', cleared: false }, 8);

    // --- Final ruin: Dawnhollow (placed deep in the unmade lands, east) ---
    let aha = null;
    for (let tries = 0; tries < 500 && !aha; tries++) {
      const x = rng.int(W - 18, W - 4), y = rng.int(6, H - 6);
      if (isLand(x, y)) {
        aha = { type: 'ruin', glyph: 'Ω', color: '#ff2d78', name: 'Dawnhollow, the Last Ruin', level: 16, floors: 4, final: true, x: x, y: y };
        tiles[y][x].site = aha; tiles[y][x].passable = true; sites.push(aha);
      }
    }
    if (!aha) { aha = Object.assign({ type: 'ruin', glyph: 'Ω', color: '#ff2d78', name: 'Dawnhollow, the Last Ruin', level: 16, floors: 4, final: true }, { x: W - 5, y: Math.floor(H / 2) }); tiles[aha.y][aha.x].site = aha; tiles[aha.y][aha.x].passable = true; sites.push(aha); }

    // --- Roads: connect towns via simple line carving (visual + safer travel) ---
    function carveRoad(a, b) {
      let x = a.x, y = a.y;
      let guard = 0;
      while ((x !== b.x || y !== b.y) && guard++ < 800) {
        if (Math.abs(b.x - x) > Math.abs(b.y - y)) x += Math.sign(b.x - x);
        else y += Math.sign(b.y - y);
        const t = tiles[y] && tiles[y][x];
        if (t && t.passable && !t.site) { t.road = true; }
      }
    }
    for (let i = 1; i < towns.length; i++) carveRoad(towns[i - 1], towns[i]);
    if (towns.length) { carveRoad(towns[towns.length - 1], aha); }

    return {
      seed: seedStr, w: W, h: H, tiles: tiles, sites: sites,
      towns: towns, vaults: vaults, camps: camps, lair: lair, aharietiam: aha,
      start: { x: start.x, y: start.y },
      biomeAt: function (x, y) { return (tiles[y] && tiles[y][x]) ? tiles[y][x].biome : 'plains'; },
      siteAt: function (x, y) { return (tiles[y] && tiles[y][x]) ? tiles[y][x].site : null; },
      passable: function (x, y) { return isLand(x, y); },
    };
  }

  TLU.World = { generate: generate, BIOMES: BIOMES };
})(window.TLU = window.TLU || {});
