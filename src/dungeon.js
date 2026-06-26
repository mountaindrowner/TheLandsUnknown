/* ============================================================
 * dungeon.js — Riftvault / ruin interiors (roguelike floors).
 * Rooms + corridors, monsters, ground loot, stairs, boss rooms.
 * ============================================================ */
(function (TLU) {
  'use strict';

  const WALL = 0, FLOOR = 1, DOOR = 2;

  function genFloor(seedStr, opts) {
    opts = opts || {};
    const rng = new TLU.RNG(seedStr);
    const W = opts.w || 64, H = opts.h || 40;
    const level = opts.level || 1;
    const biome = opts.biome || 'vault';
    const depth = opts.depth || 1;          // 1-based floor index
    const maxDepth = opts.maxDepth || 1;
    const isBossFloor = opts.boss && depth === maxDepth;

    const grid = [];
    for (let y = 0; y < H; y++) { grid[y] = []; for (let x = 0; x < W; x++) grid[y][x] = WALL; }

    const rooms = [];
    function carveRoom(r) {
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++)
          if (x > 0 && y > 0 && x < W - 1 && y < H - 1) grid[y][x] = FLOOR;
    }
    function overlaps(r) {
      return rooms.some(function (o) {
        return r.x - 1 < o.x + o.w && r.x + r.w + 1 > o.x && r.y - 1 < o.y + o.h && r.y + r.h + 1 > o.y;
      });
    }
    const target = isBossFloor ? 6 : rng.int(8, 13);
    for (let i = 0; i < target * 4 && rooms.length < target; i++) {
      const w = rng.int(5, 11), h = rng.int(4, 8);
      const r = { x: rng.int(1, W - w - 1), y: rng.int(1, H - h - 1), w: w, h: h };
      if (overlaps(r)) continue;
      carveRoom(r);
      rooms.push(r);
    }
    // connect rooms with L-corridors in placement order
    function center(r) { return { x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) }; }
    function tunnel(a, b) {
      let x = a.x, y = a.y;
      while (x !== b.x) { grid[y][x] = grid[y][x] || FLOOR; if (grid[y][x] === WALL) grid[y][x] = FLOOR; x += Math.sign(b.x - x); }
      while (y !== b.y) { if (grid[y][x] === WALL) grid[y][x] = FLOOR; y += Math.sign(b.y - y); }
    }
    for (let i = 1; i < rooms.length; i++) tunnel(center(rooms[i - 1]), center(rooms[i]));

    // entrance = first room center; stairs down = last room center
    const entrance = center(rooms[0]);
    const downRoom = rooms[rooms.length - 1];
    const down = center(downRoom);

    const entities = [];   // monsters wandering the floor
    const ground = [];     // { x, y, items:[], gold }
    const features = [];    // { x, y, type:'chest'|'altar'|'gem', ... }

    // populate non-entrance rooms
    for (let i = 1; i < rooms.length; i++) {
      const r = rooms[i], c = center(r);
      if (isBossFloor && i === rooms.length - 1) continue; // boss placed separately
      // monsters
      const count = rng.int(0, 2) + (depth > 2 ? 1 : 0);
      for (let k = 0; k < count; k++) {
        const e = TLU.Bestiary.spawn(rng, biome, level + rng.int(0, depth));
        e.x = r.x + rng.int(0, r.w - 1); e.y = r.y + rng.int(0, r.h - 1);
        e.glyph = e.glyph; entities.push(e);
      }
      // loot
      if (rng.chance(0.5)) {
        features.push({ x: c.x, y: c.y, type: 'chest', opened: false,
          loot: TLU.Items.rollLoot(rng, level + depth, depth >= 3 ? 1 : 0),
          gold: rng.int(5, 20) * (level + depth) });
      } else if (rng.chance(0.3)) {
        features.push({ x: c.x, y: c.y, type: 'gem', gem: rng.pick(TLU.LORE.gems) });
      }
    }

    // boss floor: place the boss + a guaranteed reward
    let boss = null;
    if (isBossFloor) {
      const c = center(downRoom);
      if (opts.boss === 'final') boss = TLU.Bestiary.FINAL_BOSS;
      else if (opts.boss === 'highlord_reaver') boss = TLU.Bestiary.MINIBOSS;
      else boss = TLU.Bestiary.byId(opts.boss);
      boss = TLU.Bestiary.scale(boss, Math.max(boss.lvl, level));
      boss.boss = true;
      boss.x = c.x; boss.y = c.y;
      entities.push(boss);
    }

    // fragment pickup on deepest non-boss vaults
    if (opts.hasFragment && depth === maxDepth) {
      const c = center(downRoom);
      features.push({ x: c.x, y: c.y, type: 'fragment', name: 'Rift Fragment' });
    }

    return {
      grid: grid, w: W, h: H, level: level, depth: depth, maxDepth: maxDepth, biome: biome,
      rooms: rooms, entrance: entrance, down: down, entities: entities, ground: ground,
      features: features, isBossFloor: isBossFloor, bossKind: opts.boss || null,
      passable: function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && grid[y][x] !== WALL; },
      WALL: WALL, FLOOR: FLOOR, DOOR: DOOR,
    };
  }

  TLU.Dungeon = { genFloor: genFloor, WALL: WALL, FLOOR: FLOOR, DOOR: DOOR };
})(window.TLU = window.TLU || {});
