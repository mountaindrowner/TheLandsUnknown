/* ============================================================
 * iso.js — the isometric tactics bench (Into the Breach idiom).
 *
 * A hand-inked vellum board (see iso_art.js) on which the Kindled and
 * the Hollow trade turns. The Hollow TELEGRAPH their next strike; the
 * player repositions or shoves foes so blows betray them — into water,
 * chasms, fire, mountains, or each other. Terrain has behaviour, each
 * Order has a signature verb (push / bash / pull / artillery / burn),
 * each Hollow archetype telegraphs a different shape, and buildings on
 * the board are objectives to protect.
 *
 * Units are the game's generative art: Kindled = full-body figures,
 * Hollow = beast plates. Rendering caches a static board bitmap and
 * only animates overlays (telegraphs, ranges) per frame.
 * ============================================================ */
(function (TLU) {
  'use strict';
  var IA = TLU.IsoArt, TW = IA ? IA.TW : 78, TH = IA ? IA.TH : 39;
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // terrain behaviour
  var TERR = {
    grass: {}, dirt: {}, sand: {}, stone: {}, ash: {}, road: {},
    bog: { slow: true }, ice: { slide: true }, rift: {},
    water: { lethal: 'drown', block: true }, deepwater: { lethal: 'drown', block: true },
  };
  // feature behaviour (a thing standing on a tile)
  var FEAT = {
    mountain: { block: true, cover: true }, hill: { cover: true }, boulder: { block: true },
    tower: { block: true, cover: true }, gate: { block: true, cover: true }, standingstone: { block: true },
    obelisk: { block: true }, building: { block: true, cover: true, objective: true, hp: 3 },
    rubble: { block: true }, forest: { cover: true }, pine: { cover: true },
    embervent: { fire: true }, riftvent: { spawner: true, block: true },
    crystal: { block: true }, well: {}, campfire: { fire: true }, deadtree: {}, bones: {}, tent: { block: true },
    banner: {}, barricade: { block: true }, chasm: { lethal: 'fall', block: true }, bridge: {}, flag: {},
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function key(x, y) { return x + ',' + y; }

  // ---- Orders (player weapons) & Hollow archetypes --------------------
  var ORDERS = {
    skyrender:   { name: 'Selin',  order: 'skyrender',   hp: 5, atk: 2, moves: 4, weapon: 'lunge',     accent: '#c9a24a', verb: 'Skyblade — dash + shove 1' },
    stonewarden: { name: 'Naneth', order: 'stonewarden', hp: 7, atk: 1, moves: 2, weapon: 'bash',      accent: '#8f8b80', verb: 'Shield-bash — shove 2 + stun' },
    slipstrider: { name: 'Ves',    order: 'slipstrider', hp: 4, atk: 2, moves: 3, weapon: 'hook',      accent: '#6f8f56', verb: 'Hookblade — pull a foe 1 (range 2)' },
    veilseer:    { name: 'Ora',    order: 'veilseer',    hp: 4, atk: 1, moves: 2, weapon: 'artillery', accent: '#b6a2c4', verb: 'Riftlance — arced splash (range 3)' },
    cinderwright:{ name: 'Bram',   order: 'cinderwright',hp: 5, atk: 2, moves: 2, weapon: 'ember',      accent: '#d0762c', verb: 'Ember-line — burn a lane (range 3)' },
  };
  // Hollow: kind drives telegraph shape + movement
  var HOLLOW = {
    ridgehound: { kind: 'charger',   hp: 3, atk: 1, moves: 3, shape: 'single', push: 1 },
    craghorn:   { kind: 'brute',     hp: 5, atk: 2, moves: 1, shape: 'single', push: 2 },
    gloamspawn: { kind: 'artillery', hp: 2, atk: 1, moves: 2, shape: 'splash', push: 1, range: 3 },
    churncaller:{ kind: 'flyer',     hp: 3, atk: 1, moves: 3, shape: 'single', push: 1, fly: true },
    cragwrought:{ kind: 'shield',    hp: 4, atk: 2, moves: 1, shape: 'single', push: 1, armor: 1 },
  };

  function Iso(root, opts) {
    opts = opts || {};
    this.root = root; this.W = opts.w || 8; this.H = opts.h || 8;
    this.seed = opts.seed || 'bench'; this.rng = new TLU.RNG('iso:' + this.seed);
    this.turn = 1; this.over = null; this.selected = null; this.moveSet = {}; this.atkSet = {};
    this.pulse = 0; this._raf = null; this.spawnTimer = 3;
    this.build(); this.spawn(); this.enemyPlan();
    this.mountDom(); this.renderStatic(); this.render(); this.loop();
  }

  Iso.prototype.tile = function (x, y) { return (x >= 0 && x < this.W && y >= 0 && y < this.H) ? this.tiles[y * this.W + x] : null; };
  Iso.prototype.unitAt = function (x, y) { return this.units.find(function (u) { return u.alive && u.gx === x && u.gy === y; }); };
  Iso.prototype.allies = function () { return this.units.filter(function (u) { return u.alive && u.side === 'ally'; }); };
  Iso.prototype.enemies = function () { return this.units.filter(function (u) { return u.alive && u.side === 'enemy'; }); };
  Iso.prototype.buildings = function () { return this.tiles.filter(function (t) { return t.feature && t.feature.kind === 'building' && t.feature.hp > 0; }); };

  // ---- board generation ----------------------------------------------
  Iso.prototype.build = function () {
    var rng = this.rng, N = this.W * this.H, i;
    this.tiles = [];
    for (i = 0; i < N; i++) this.tiles.push({ x: i % this.W, y: (i / this.W) | 0, terrain: 'grass', feature: null, fire: false, seed: 's' + i });
    var self = this;
    function paintBlob(kind, n, r) {
      var sx = rng.int(1, self.W - 2), sy = rng.int(1, self.H - 2);
      for (var k = 0; k < n; k++) { var t = self.tile(clamp(sx + rng.int(-r, r), 0, self.W - 1), clamp(sy + rng.int(-r, r), 0, self.H - 1)); if (t) t.terrain = kind; }
    }
    paintBlob('water', 4, 1); paintBlob('stone', 3, 1); paintBlob('sand', 3, 1);
    if (rng.chance(0.6)) paintBlob('bog', 3, 1);
    if (rng.chance(0.5)) paintBlob('rift', 2, 1);
    // a short chasm
    if (rng.chance(0.7)) { var cx = rng.int(2, this.W - 3), cy = rng.int(1, this.H - 2); this.tile(cx, cy).terrain = 'grass'; this.tile(cx, cy).feature = { kind: 'chasm' }; if (rng.chance(0.5) && this.tile(cx, cy + 1)) this.tile(cx, cy + 1).feature = { kind: 'chasm' }; }
    // clear spawn columns (0 = Kindled, W-1 = Hollow) to plain ground
    for (var y = 0; y < this.H; y++) { [0, this.W - 1].forEach(function (x) { var t = self.tile(x, y); if (TERR[t.terrain] && TERR[t.terrain].block) t.terrain = 'grass'; t.feature = null; }); }
    // scatter features on interior ground
    function freeGround(pad) { for (var tries = 0; tries < 40; tries++) { var x = rng.int(1 + (pad || 0), self.W - 2 - (pad || 0)), yy = rng.int(0, self.H - 1); var t = self.tile(x, yy); if (t && !t.feature && !(TERR[t.terrain] && TERR[t.terrain].block)) return t; } return null; }
    function place(kind, n) { for (var k = 0; k < n; k++) { var t = freeGround(1); if (t) t.feature = Object.assign({ kind: kind }, FEAT[kind].hp ? { hp: FEAT[kind].hp } : {}); } }
    place('mountain', 2 + rng.int(0, 1)); place('boulder', 2); place('forest', 3); place('standingstone', 1);
    place('embervent', 1); place('riftvent', rng.chance(0.6) ? 1 : 0);
    if (rng.chance(0.5)) place('rubble', 1); if (rng.chance(0.5)) place('deadtree', 1);
    // objective buildings, held toward the Kindled side
    var nb = 2; for (var b = 0; b < nb; b++) { for (var tr = 0; tr < 30; tr++) { var x = rng.int(1, Math.floor(this.W / 2)), yy = rng.int(0, this.H - 1); var t = this.tile(x, yy); if (t && !t.feature && !(TERR[t.terrain] && TERR[t.terrain].block)) { t.feature = { kind: 'building', hp: 3 }; break; } } }
  };

  Iso.prototype.spawn = function () {
    this.units = []; var self = this;
    // three Kindled of distinct Orders (varied weapons each skirmish)
    var pool = ['skyrender', 'stonewarden', 'slipstrider', 'veilseer', 'cinderwright'];
    for (var p = pool.length - 1; p > 0; p--) { var j = this.rng.int(0, p); var tmp = pool[p]; pool[p] = pool[j]; pool[j] = tmp; }
    var party = pool.slice(0, 3);
    party.forEach(function (o, i) { var d = ORDERS[o]; var y = self.clearCol(0, 1 + i * 2); self.units.push(mkAlly(d, 0, y)); });
    // Hollow
    var foes = ['ridgehound', 'gloamspawn', 'craghorn'];
    if (this.rng.chance(0.6)) foes.push(this.rng.chance(0.5) ? 'churncaller' : 'cragwrought');
    foes.forEach(function (id, i) { var y = self.clearCol(self.W - 1, 1 + i * 2); self.units.push(mkEnemy(id, self.W - 1, y)); });

    function mkAlly(d, x, y) { return { side: 'ally', name: d.name, order: d.order, weapon: d.weapon, accent: d.accent, verb: d.verb, gx: x, gy: y, hp: d.hp, maxHp: d.hp, atk: d.atk, moves: d.moves, alive: true, acted: false, el: null, statuses: {} }; }
    function mkEnemy(id, x, y) {
      var h = HOLLOW[id], b = TLU.Bestiary ? TLU.Bestiary.byId(id) : { name: id, color: '#a33', tags: [] };
      return { side: 'enemy', id: id, name: b.name, color: b.color, tags: b.tags || [], faction: b.faction, kind: h.kind, shape: h.shape,
        push: h.push, range: h.range || 1, fly: !!h.fly, armor: h.armor || 0, gx: x, gy: y, hp: h.hp, maxHp: h.hp, atk: h.atk, moves: h.moves, alive: true, intent: null, el: null, statuses: {} };
    }
  };
  Iso.prototype.clearCol = function (x, y) { y = clamp(y, 0, this.H - 1); var t = this.tile(x, y); if (t) { if (TERR[t.terrain] && TERR[t.terrain].block) t.terrain = 'grass'; t.feature = null; } return y; };

  // ---- tile queries ---------------------------------------------------
  Iso.prototype.blocked = function (x, y) { var t = this.tile(x, y); if (!t) return true; if (TERR[t.terrain] && TERR[t.terrain].block) return true; if (t.feature && FEAT[t.feature.kind] && FEAT[t.feature.kind].block) return true; return false; };
  Iso.prototype.lethalAt = function (x, y) { var t = this.tile(x, y); if (!t) return null; if (TERR[t.terrain] && TERR[t.terrain].lethal) return TERR[t.terrain].lethal; if (t.feature && FEAT[t.feature.kind] && FEAT[t.feature.kind].lethal) return FEAT[t.feature.kind].lethal; return null; };
  Iso.prototype.coverAt = function (x, y) { var t = this.tile(x, y); return !!(t && t.feature && FEAT[t.feature.kind] && FEAT[t.feature.kind].cover); };
  // can a ground unit stand on (x,y)?
  Iso.prototype.walkable = function (x, y, u) {
    var t = this.tile(x, y); if (!t || this.unitAt(x, y)) return false;
    if (u && u.fly) return !this.blocked(x, y);                 // flyers ignore lethal, not solid blockers
    if (this.blocked(x, y) || this.lethalAt(x, y)) return false;
    return true;
  };

  Iso.prototype.reach = function (u) {
    var set = {}, q = [[u.gx, u.gy, 0]], seen = {}; seen[key(u.gx, u.gy)] = true;
    while (q.length) { var c = q.shift(); if (c[2] >= u.moves) continue;
      for (var i = 0; i < 4; i++) { var nx = c[0] + DIRS[i][0], ny = c[1] + DIRS[i][1], k = key(nx, ny);
        if (seen[k]) continue; var t = this.tile(nx, ny); if (!t) continue;
        // flyers may pass over anything solid-free; ground stops at blockers/lethal/units
        if (!this.walkable(nx, ny, u)) { seen[k] = true; if (u.fly && !this.blocked(nx, ny) && !this.unitAt(nx, ny)) { /* flyer can traverse lethal but only land where walkable */ } continue; }
        seen[k] = true; set[k] = true; q.push([nx, ny, c[2] + 1]);
      }
    }
    return set;
  };

  // line of fire is blocked by cover/blockers (not by the target itself)
  Iso.prototype.clearLine = function (x0, y0, dir, r) {
    for (var i = 1; i < r; i++) { var x = x0 + dir[0] * i, y = y0 + dir[1] * i; if (this.coverAt(x, y) || this.blocked(x, y)) return i; } return r;
  };

  // ---- player weapon targeting ---------------------------------------
  Iso.prototype.targets = function (u) {
    var res = {}, self = this, i, r, tx, ty, t, oc;
    if (u.weapon === 'artillery') {                // any foe within Manhattan range 3 (arcs over cover)
      this.units.forEach(function (e) { if (!e.alive || e.side !== 'enemy') return; var d = Math.abs(e.gx - u.gx) + Math.abs(e.gy - u.gy); if (d >= 1 && d <= 3) res[key(e.gx, e.gy)] = { type: 'artillery', tx: e.gx, ty: e.gy }; });
      return res;
    }
    var range = (u.weapon === 'hook') ? 2 : (u.weapon === 'ember') ? 3 : 1;
    for (i = 0; i < 4; i++) {
      var limit = (u.weapon === 'ember') ? this.clearLine(u.gx, u.gy, DIRS[i], range + 1) : range;
      for (r = 1; r <= limit; r++) {
        tx = u.gx + DIRS[i][0] * r; ty = u.gy + DIRS[i][1] * r; t = this.tile(tx, ty); if (!t) break;
        if (this.blocked(tx, ty) && !this.unitAt(tx, ty)) break;
        oc = this.unitAt(tx, ty);
        if (oc && oc.side === 'enemy') { res[key(tx, ty)] = { type: u.weapon, dir: DIRS[i], tx: tx, ty: ty }; break; }
        if (oc) break;
      }
    }
    return res;
  };
  Iso.prototype.hostileHint = function () { return []; };

  // ---- damage / push --------------------------------------------------
  Iso.prototype.damage = function (u, n) { if (!u || !u.alive) return; if (u.armor) { u.armor -= 1; this.flash(u, 'iso-hurt'); return; } u.hp -= n; this.flash(u, 'iso-hurt'); if (u.hp <= 0) { u.hp = 0; u.alive = false; if (u.el) u.el.classList.add('iso-dead'); } };
  Iso.prototype.hurtTile = function (x, y, n) {   // damage whatever occupies a tile (unit or building)
    var u = this.unitAt(x, y); if (u) { this.damage(u, n); return; }
    var t = this.tile(x, y); if (t && t.feature && t.feature.hp) { t.feature.hp -= n; this.flashTile(x, y); if (t.feature.hp <= 0) { t.feature = { kind: 'rubble' }; this._dirty = true; } }
  };
  Iso.prototype.push = function (target, dir, dist) {
    dist = dist || 1;
    for (var s = 0; s < dist; s++) {
      if (!target.alive) return; var nx = target.gx + dir[0], ny = target.gy + dir[1], t = this.tile(nx, ny);
      if (!t || this.blocked(nx, ny)) { this.damage(target, 1); return; }
      var oc = this.unitAt(nx, ny); if (oc) { this.damage(target, 1); this.damage(oc, 1); return; }
      var leth = this.lethalAt(nx, ny); if (leth && !target.fly) { target.gx = nx; target.gy = ny; this.damage(target, 99); return; }
      target.gx = nx; target.gy = ny;
      if (t.fire || (t.feature && FEAT[t.feature.kind] && FEAT[t.feature.kind].fire)) this.damage(target, 1);
    }
  };

  // execute a player weapon on a target tile
  Iso.prototype.resolveWeapon = function (u, a) {
    if (a.type === 'artillery') {
      this.hurtTile(a.tx, a.ty, u.atk);
      for (var i = 0; i < 4; i++) { var nx = a.tx + DIRS[i][0], ny = a.ty + DIRS[i][1], oc = this.unitAt(nx, ny); if (oc) this.push(oc, DIRS[i], 1); }
      return;
    }
    var oc = this.unitAt(a.tx, a.ty); if (!oc) return;
    if (a.type === 'lunge') { this.damage(oc, u.atk); this.push(oc, a.dir, 1); }
    else if (a.type === 'bash') { this.damage(oc, u.atk); this.applyStatus(oc, 'stun'); this.push(oc, a.dir, 2); }
    else if (a.type === 'hook') { this.damage(oc, u.atk); this.push(oc, [-a.dir[0], -a.dir[1]], 1); }   // pull toward user
    else if (a.type === 'ember') { this.damage(oc, u.atk); this.ignite(a.tx, a.ty); this.push(oc, a.dir, 1); }
  };

  Iso.prototype.ignite = function (x, y) { var t = this.tile(x, y); if (t && !this.blocked(x, y)) { t.fire = true; this._dirty = true; } };
  Iso.prototype.applyStatus = function (u, s, n) { u.statuses = u.statuses || {}; u.statuses[s] = n || 1; };

  // ---- player actions -------------------------------------------------
  Iso.prototype.select = function (u) { if (this.over || u.side !== 'ally' || u.acted || this._fx) return; this.selected = u; this.moveSet = this.reach(u); this.atkSet = this.targets(u); this.render(); };
  Iso.prototype.moveTo = function (x, y) { var u = this.selected; if (!u || !this.moveSet[key(x, y)]) return; u.gx = x; u.gy = y; this.moveSet = {}; if (this.standingHazard(u)) this.damage(u, 1); this.atkSet = this.targets(u); this.render(); };
  Iso.prototype.standingHazard = function (u) { var t = this.tile(u.gx, u.gy); return t && (t.fire || (t.feature && FEAT[t.feature.kind] && FEAT[t.feature.kind].fire)); };
  Iso.prototype.attack = function (tx, ty) { var u = this.selected, a = this.atkSet[key(tx, ty)]; if (!u || !a) return; this.resolveWeapon(u, a); u.acted = true; this.selected = null; this.moveSet = {}; this.atkSet = {}; this.render(); this.checkEnd(); };

  // ---- enemy phase ----------------------------------------------------
  Iso.prototype.threatTargets = function () { // allies + objective buildings
    var list = this.allies().map(function (a) { return { gx: a.gx, gy: a.gy }; });
    this.buildings().forEach(function (t) { list.push({ gx: t.x, gy: t.y }); });
    return list;
  };
  Iso.prototype.nearest = function (e, list) { var best = null, bd = 1e9; list.forEach(function (a) { var d = Math.abs(a.gx - e.gx) + Math.abs(a.gy - e.gy); if (d < bd) { bd = d; best = a; } }); return best ? { t: best, d: bd } : null; };
  Iso.prototype.dirToward = function (e, a) { var ax = a.gx - e.gx, ay = a.gy - e.gy; if (Math.abs(ax) >= Math.abs(ay)) return ax === 0 ? (ay > 0 ? [0, 1] : [0, -1]) : (ax > 0 ? [1, 0] : [-1, 0]); return ay > 0 ? [0, 1] : [0, -1]; };

  Iso.prototype.enemyPlan = function () {
    var self = this, tgts = this.threatTargets();
    this.enemies().forEach(function (e) {
      var near = self.nearest(e, tgts); if (!near) { e.intent = null; return; }
      if ((e.kind === 'artillery' || e.kind === 'flyer') && near.d >= 1 && near.d <= (e.range || 3)) {
        e.intent = { shape: e.shape, cx: near.t.gx, cy: near.t.gy };
      } else {
        var d = self.dirToward(e, near.t); e.intent = { shape: 'single', dir: d, cx: e.gx + d[0], cy: e.gy + d[1] };
      }
    });
  };

  Iso.prototype.intentCells = function (e) {
    if (!e.intent) return [];
    if (e.intent.shape === 'splash') { var out = [{ x: e.intent.cx, y: e.intent.cy }]; for (var i = 0; i < 4; i++) out.push({ x: e.intent.cx + DIRS[i][0], y: e.intent.cy + DIRS[i][1] }); return out; }
    return [{ x: e.intent.cx, y: e.intent.cy }];
  };

  Iso.prototype.endTurn = function () {
    if (this.over || this._fx) return; var self = this;
    // 1) hazards tick (fire burns occupants)
    this.units.forEach(function (u) { if (u.alive && self.standingHazard(u)) self.damage(u, 1); });
    // 2) resolve telegraphed strikes
    this.enemies().forEach(function (e) {
      if (!e.intent) return;
      if (e.intent.shape === 'splash') { self.hurtTile(e.intent.cx, e.intent.cy, e.atk); for (var i = 0; i < 4; i++) { var nx = e.intent.cx + DIRS[i][0], ny = e.intent.cy + DIRS[i][1], oc = self.unitAt(nx, ny); if (oc) self.push(oc, DIRS[i], 1); } }
      else { var oc = self.unitAt(e.intent.cx, e.intent.cy); if (oc) { self.damage(oc, e.atk); self.push(oc, e.intent.dir || [0, 0], e.push || 1); } else { self.hurtTile(e.intent.cx, e.intent.cy, e.atk); } }
    });
    this.checkEnd(); if (this.over) { this.render(); return; }
    // 3) fire spreads to adjacent forest; ground fire burns out
    this.spreadFire();
    // 4) enemies advance toward their quarry (melee kinds only)
    this.enemies().forEach(function (e) {
      if (e.statuses && e.statuses.stun) { e.statuses.stun = 0; return; }
      if (e.kind === 'artillery') return; // gunners hold ground
      var near = self.nearest(e, self.threatTargets()); if (!near || near.d <= 1) return;
      var steps = e.moves; while (steps-- > 0) { var near2 = self.nearest(e, self.threatTargets()); if (!near2 || near2.d <= 1) break; var d = self.dirToward(e, near2.t), nx = e.gx + d[0], ny = e.gy + d[1]; if (self.walkable(nx, ny, e)) { e.gx = nx; e.gy = ny; } else break; }
    });
    // 5) rift-vents emit a Hollow occasionally
    this.spawnTimer--; if (this.spawnTimer <= 0) { this.ventSpawn(); this.spawnTimer = 3; }
    // 6) re-telegraph, decay statuses, new turn
    this.enemyPlan(); this.turn++;
    this.allies().forEach(function (u) { u.acted = false; if (u.statuses) u.statuses.stun = 0; });
    this.selected = null; this.moveSet = {}; this.atkSet = {};
    if (this._dirty) { this.renderStatic(); this._dirty = false; }
    this.render();
  };

  Iso.prototype.spreadFire = function () {
    var self = this, add = [];
    this.tiles.forEach(function (t) { if (t.fire) { DIRS.forEach(function (d) { var n = self.tile(t.x + d[0], t.y + d[1]); if (n && !n.fire && n.feature && (n.feature.kind === 'forest' || n.feature.kind === 'pine')) add.push(n); }); } });
    add.forEach(function (n) { n.fire = true; });
    // ground (non-forest) fire burns out after a turn
    this.tiles.forEach(function (t) { if (t.fire && !(t.feature && (t.feature.kind === 'forest' || t.feature.kind === 'pine'))) { t._fireAge = (t._fireAge || 0) + 1; if (t._fireAge > 1) { t.fire = false; t._fireAge = 0; } } });
    this._dirty = true;
  };
  Iso.prototype.ventSpawn = function () {
    var self = this, vents = this.tiles.filter(function (t) { return t.feature && t.feature.kind === 'riftvent'; });
    vents.forEach(function (v) { for (var i = 0; i < 4; i++) { var nx = v.x + DIRS[i][0], ny = v.y + DIRS[i][1]; if (self.walkable(nx, ny, { fly: false })) { var u = mkVentEnemy(nx, ny); self.units.push(u); self.makeToken(u); break; } } });
    function mkVentEnemy(x, y) { var h = HOLLOW.gloamspawn, b = TLU.Bestiary ? TLU.Bestiary.byId('gloamspawn') : { name: 'Gloamspawn', color: '#6a4a8a', tags: ['rift'] }; return { side: 'enemy', id: 'gloamspawn', name: b.name, color: b.color, tags: b.tags, kind: h.kind, shape: h.shape, push: h.push, range: h.range, gx: x, gy: y, hp: h.hp, maxHp: h.hp, atk: h.atk, moves: h.moves, alive: true, intent: null, el: null, statuses: {} }; }
  };

  Iso.prototype.checkEnd = function () {
    var was = this.over;
    if (!this.enemies().length) { this.over = 'win'; }
    else if (!this.buildings().length) { this.over = 'lose'; }
    else if (!this.allies().length) { this.over = 'lose'; }
    if (this.over && !was) { if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; } this.render(); }
  };

  // ---- projection -----------------------------------------------------
  Iso.prototype.ox = function () { return 46 + (this.H - 1) * TW / 2; };
  Iso.prototype.oy = function () { return 104; };
  Iso.prototype.cx = function (gx, gy) { return this.ox() + (gx - gy) * TW / 2; };
  Iso.prototype.cy = function (gx, gy) { return this.oy() + (gx + gy) * TH / 2; };
  Iso.prototype.cw = function () { return this.ox() + (this.W - 1) * TW / 2 + TW / 2 + 46; };
  Iso.prototype.ch = function () { return this.oy() + (this.W + this.H - 2) * TH / 2 + TH / 2 + 80; };
  Iso.prototype.pick = function (px, py) { var dx = px - this.ox(), dy = py - this.oy(); var gx = Math.round((dx / (TW / 2) + dy / (TH / 2)) / 2); var gy = Math.round((dy / (TH / 2) - dx / (TW / 2)) / 2); return this.tile(gx, gy) ? { x: gx, y: gy } : null; };

  // ---- DOM + rendering ------------------------------------------------
  Iso.prototype.mountDom = function () {
    var self = this;
    this.root.innerHTML =
      '<div class="iso-wrap"><div class="iso-board" style="width:' + this.cw() + 'px;height:' + this.ch() + 'px">' +
      '<canvas class="iso-canvas"></canvas><div class="iso-units"></div><div class="iso-banner" style="display:none"></div></div>' +
      '<div class="iso-side"><div class="iso-title">Isometric Skirmish <span>· a tactics bench</span></div>' +
      '<div class="iso-status"></div><div class="iso-roster"></div>' +
      '<div class="iso-actions"><button class="iso-btn iso-end">End Turn ▸</button><button class="iso-btn iso-reset">Reset</button></div>' +
      '<div class="iso-sel-info"></div>' +
      '<div class="iso-help">Click a Kindled → blue = move, gold = strike. Red tiles + arrows are the Hollow’s telegraphed blows. ' +
      'Reposition, or shove a foe into <b>water</b>, a <b>chasm</b>, <b>fire</b>, a <b>mountain</b>, or its own kin. Protect the <b>steadings</b> (▛). Clear the Hollow.</div></div></div>';
    this.canvas = this.root.querySelector('.iso-canvas'); this.unitLayer = this.root.querySelector('.iso-units'); this.banner = this.root.querySelector('.iso-banner');
    var dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1); this._dpr = dpr;
    this.canvas.width = this.cw() * dpr; this.canvas.height = this.ch() * dpr; this.canvas.style.width = this.cw() + 'px'; this.canvas.style.height = this.ch() + 'px';
    this.ctx = this.canvas.getContext('2d'); this.ctx.scale(dpr, dpr);
    // offscreen static board
    this.bg = document.createElement('canvas'); this.bg.width = this.cw() * dpr; this.bg.height = this.ch() * dpr; this.bgx = this.bg.getContext('2d'); this.bgx.scale(dpr, dpr);
    this.canvas.addEventListener('click', function (ev) { var r = self.canvas.getBoundingClientRect(); var p = self.pick(ev.clientX - r.left, ev.clientY - r.top); if (!p) return; if (self.selected && self.atkSet[key(p.x, p.y)]) { self.attack(p.x, p.y); return; } if (self.selected && self.moveSet[key(p.x, p.y)]) { self.moveTo(p.x, p.y); return; } var u = self.unitAt(p.x, p.y); if (u && u.side === 'ally') self.select(u); else { self.selected = null; self.moveSet = {}; self.atkSet = {}; self.render(); } });
    this.root.querySelector('.iso-end').addEventListener('click', function () { self.endTurn(); });
    this.root.querySelector('.iso-reset').addEventListener('click', function () { self.reset(); });
    this.units.forEach(function (u) { self.makeToken(u); });
  };

  Iso.prototype.makeToken = function (u) {
    var el = document.createElement('div'); el.className = 'iso-unit iso-' + u.side; var art = '';
    if (u.side === 'ally' && TLU.Art && TLU.Art.figure) art = TLU.Art.figure(u.order + ':' + u.name, { order: u.order, accent: u.accent, cls: 'tlu-figure iso-fig' });
    else if (TLU.Art && TLU.Art.beastPlate) art = TLU.Art.beastPlate(u.id, { tags: u.tags || [], faction: u.faction, accent: u.color, bare: true, cls: 'tlu-plate iso-art' });
    el.innerHTML = '<div class="iso-art-wrap iso-' + (u.side === 'ally' ? 'figw' : 'beastw') + '">' + art + '</div><div class="iso-tag" style="border-color:' + (u.accent || u.color) + '"><span class="iso-hp"></span></div>';
    var self = this; el.addEventListener('click', function (ev) { ev.stopPropagation(); if (self.selected && self.atkSet[key(u.gx, u.gy)]) { self.attack(u.gx, u.gy); return; } if (u.side === 'ally') self.select(u); });
    u.el = el; u.hpEl = el.querySelector('.iso-hp'); this.unitLayer.appendChild(el);
  };

  // paint the static board (terrain + features) once to the offscreen canvas
  Iso.prototype.renderStatic = function () {
    var ctx = this.bgx; ctx.clearRect(0, 0, this.cw(), this.ch());
    // iso order: back (small gx+gy) to front
    var order = [];
    for (var gy = 0; gy < this.H; gy++) for (var gx = 0; gx < this.W; gx++) order.push([gx, gy]);
    order.sort(function (a, b) { return (a[0] + a[1]) - (b[0] + b[1]); });
    var self = this;
    order.forEach(function (c) { var t = self.tile(c[0], c[1]); var cx = self.cx(c[0], c[1]), cy = self.cy(c[0], c[1]); IA.drawTerrain(ctx, t.terrain, cx, cy, t.seed); if (t.fire) self.drawFire(ctx, cx, cy, t.seed); });
    order.forEach(function (c) { var t = self.tile(c[0], c[1]); if (!t.feature) return; var cx = self.cx(c[0], c[1]), cy = self.cy(c[0], c[1]); IA.drawFeature(ctx, t.feature.kind, cx, cy, t.seed, { accent: '#9a3b2a' }); if (t.feature.kind === 'building' && t.feature.hp != null) self.drawBuildHp(ctx, cx, cy, t.feature.hp); });
  };
  Iso.prototype.drawFire = function (ctx, cx, cy, s) { var rng = new TLU.RNG('fire' + s); for (var i = 0; i < 4; i++) { var x = cx + (rng.next() - 0.5) * 20, y = cy + (rng.next() - 0.5) * 8; IA.ink(ctx, [[x, y], [x + (rng.next() - 0.5) * 4, y - 6 - rng.next() * 6]], { rng: rng, w: 1.6, amt: 0.4, stroke: '#d0762c' }); } };
  Iso.prototype.drawBuildHp = function (ctx, cx, cy, hp) { for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx - 8 + i * 8, cy - 52, 2.4, 0, 6.28); ctx.fillStyle = i < hp ? '#c9a24a' : 'rgba(0,0,0,0.4)'; ctx.fill(); ctx.strokeStyle = '#2c2820'; ctx.lineWidth = 0.8; ctx.stroke(); } };

  Iso.prototype.diamond = function (ctx, cx, cy, inset) { IA.diamond(ctx, cx, cy, inset || 0); };

  Iso.prototype.render = function () { this.drawOverlays(); this.placeUnits(); this.drawStatus(); };

  Iso.prototype.drawOverlays = function () {
    var ctx = this.ctx, dpr = this._dpr; ctx.clearRect(0, 0, this.cw(), this.ch());
    ctx.drawImage(this.bg, 0, 0, this.cw(), this.ch());
    var self = this, sel = this.selected;
    // move + attack + telegraph highlights
    for (var gy = 0; gy < this.H; gy++) for (var gx = 0; gx < this.W; gx++) {
      var cx = this.cx(gx, gy), cy = this.cy(gx, gy);
      if (this.moveSet[key(gx, gy)]) { this.diamond(ctx, cx, cy); ctx.fillStyle = 'rgba(70,130,200,0.34)'; ctx.fill(); this.diamond(ctx, cx, cy); ctx.strokeStyle = 'rgba(90,150,220,0.6)'; ctx.lineWidth = 1; ctx.stroke(); }
      if (this.threatCell(gx, gy)) { this.diamond(ctx, cx, cy); ctx.fillStyle = 'rgba(210,60,70,' + (0.28 + this.pulse * 0.3) + ')'; ctx.fill(); this.diamond(ctx, cx, cy); ctx.strokeStyle = 'rgba(220,70,80,0.8)'; ctx.lineWidth = 1.2; ctx.stroke(); }
      if (this.atkSet[key(gx, gy)]) { this.diamond(ctx, cx, cy); ctx.fillStyle = 'rgba(230,180,80,0.55)'; ctx.fill(); }
      if (sel && sel.gx === gx && sel.gy === gy) { this.diamond(ctx, cx, cy); ctx.strokeStyle = '#e6c15a'; ctx.lineWidth = 2; ctx.stroke(); }
    }
    // telegraph arrows
    this.enemies().forEach(function (e) { if (!e.intent) return; var tx = e.intent.cx, ty = e.intent.cy; if (!self.tile(tx, ty)) return; self.arrow(self.cx(e.gx, e.gy), self.cy(e.gx, e.gy) - 8, self.cx(tx, ty), self.cy(tx, ty) - 8); });
  };
  Iso.prototype.threatCell = function (gx, gy) { return this.enemies().some(function (e) { var cells = this.intentCells(e); return cells.some(function (c) { return c.x === gx && c.y === gy; }); }, this); };
  Iso.prototype.arrow = function (x0, y0, x1, y1) { var ctx = this.ctx, a = Math.atan2(y1 - y0, x1 - x0); x1 -= Math.cos(a) * 12; y1 -= Math.sin(a) * 8; ctx.strokeStyle = 'rgba(200,50,60,0.92)'; ctx.fillStyle = 'rgba(200,50,60,0.95)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - Math.cos(a - 0.5) * 9, y1 - Math.sin(a - 0.5) * 9); ctx.lineTo(x1 - Math.cos(a + 0.5) * 9, y1 - Math.sin(a + 0.5) * 9); ctx.closePath(); ctx.fill(); };

  Iso.prototype.placeUnits = function () {
    var self = this;
    this.units.forEach(function (u) { if (!u.el) return; if (!u.alive) { u.el.style.display = 'none'; return; } u.el.style.display = ''; u.el.style.left = self.cx(u.gx, u.gy) + 'px'; u.el.style.top = (self.cy(u.gx, u.gy) - 2) + 'px'; u.el.style.zIndex = 100 + (u.gx + u.gy) * 2 + (u.side === 'ally' ? 1 : 0); u.el.classList.toggle('iso-acted', u.side === 'ally' && u.acted); u.el.classList.toggle('iso-sel', self.selected === u); if (u.hpEl) u.hpEl.textContent = u.hp + (u.armor ? '⛨' : ''); });
  };

  Iso.prototype.drawStatus = function () {
    var st = this.root.querySelector('.iso-status'), ro = this.root.querySelector('.iso-roster'), si = this.root.querySelector('.iso-sel-info');
    if (st) st.innerHTML = this.over ? (this.over === 'win' ? '<b class="iso-win">The Hollow are broken.</b>' : '<b class="iso-lose">The line is lost.</b>') : 'Turn <b>' + this.turn + '</b> · steadings <b>' + this.buildings().length + '</b> — the Hollow have telegraphed. Reposition, then End Turn.';
    if (ro) ro.innerHTML = this.units.filter(function (u) { return u.alive; }).map(function (u) { return '<div class="iso-r ' + u.side + (u.acted ? ' done' : '') + '"><span class="dot" style="background:' + (u.accent || u.color) + '"></span>' + u.name + (u.armor ? ' ⛨' : '') + ' <i>' + u.hp + '/' + u.maxHp + '</i></div>'; }).join('');
    if (si) si.innerHTML = this.selected && this.selected.verb ? '<b style="color:' + this.selected.accent + '">' + this.selected.name + '</b> — ' + this.selected.verb : '';
    if (this.banner) { if (this.over) { this.banner.style.display = ''; this.banner.className = 'iso-banner ' + this.over; this.banner.textContent = this.over === 'win' ? 'VICTORY' : 'DEFEAT'; } else this.banner.style.display = 'none'; }
  };

  Iso.prototype.flash = function (u, cls) { if (!u.el) return; u.el.classList.add(cls); setTimeout(function () { if (u.el) u.el.classList.remove(cls); }, 320); };
  Iso.prototype.flashTile = function (x, y) { this._dirty = true; };

  Iso.prototype.reset = function () {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    this.rng = new TLU.RNG('iso:' + this.seed + ':' + (this.turn * 13 + 1)); this.turn = 1; this.over = null; this.selected = null; this.moveSet = {}; this.atkSet = {}; this.spawnTimer = 3;
    this.build(); this.spawn(); this.enemyPlan(); this.unitLayer.innerHTML = ''; var self = this; this.units.forEach(function (u) { self.makeToken(u); }); this.renderStatic(); this.render(); this.loop();
  };

  Iso.prototype.loop = function () {
    var self = this; function frame() { self.pulse = (Math.sin(Date.now() / 380) + 1) / 2; self.drawOverlays(); if (!self.over) self._raf = requestAnimationFrame(frame); }
    if (typeof requestAnimationFrame !== 'undefined') this._raf = requestAnimationFrame(frame);
  };

  TLU.Iso = { mount: function (root, opts) { return new Iso(root, opts); }, Iso: Iso, ORDERS: ORDERS, HOLLOW: HOLLOW };
})(window.TLU = window.TLU || {});
