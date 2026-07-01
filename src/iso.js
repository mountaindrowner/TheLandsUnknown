/* ============================================================
 * iso.js — an isometric tactical-combat test, in the Into the Breach idiom.
 *
 * A small square board drawn in isometric projection. Two sides take
 * alternating turns. The core loop is Into the Breach's: the Hollow
 * telegraph exactly where they will strike NEXT resolution, and the
 * player's job on their turn is to reposition — step off a marked tile,
 * or shove an enemy so its own attack whiffs, hits a mountain, or lands
 * on one of its own. Damage is small and the board is a puzzle.
 *
 * Self-contained (TLU.Iso.mount(rootEl, opts)); it borrows only the
 * generative art (portraits + beast plates) and the RNG. No dependency
 * on the main game loop — this is a bench, not a mode.
 * ============================================================ */
(function (TLU) {
  'use strict';

  var TW = 74, TH = 37;            // iso tile footprint (width, height)
  var LIFT = 16;                   // pixel lift of a mountain block
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function key(x, y) { return x + ',' + y; }

  // ---- the skirmish ---------------------------------------------------
  function Iso(root, opts) {
    opts = opts || {};
    this.root = root;
    this.W = opts.w || 8; this.H = opts.h || 8;
    this.seed = opts.seed || 'iso-bench';
    this.rng = new TLU.RNG('iso:' + this.seed);
    this.turn = 1;
    this.over = null;              // 'win' | 'lose'
    this.selected = null;
    this.moveSet = {};             // key -> true (reachable tiles for selected)
    this.atkSet = {};              // key -> {dir} (attackable enemies for selected)
    this.pulse = 0;
    this._raf = null;
    this.build();
    this.spawn();
    this.enemyPlan(true);          // opening telegraph so intents show immediately
    this.mountDom();
    this.render();
    this.loop();
  }

  Iso.prototype.tile = function (x, y) { return (x >= 0 && x < this.W && y >= 0 && y < this.H) ? this.tiles[y * this.W + x] : null; };
  Iso.prototype.unitAt = function (x, y) { return this.units.find(function (u) { return u.alive && u.gx === x && u.gy === y; }); };
  Iso.prototype.allies = function () { return this.units.filter(function (u) { return u.alive && u.side === 'ally'; }); };
  Iso.prototype.enemies = function () { return this.units.filter(function (u) { return u.alive && u.side === 'enemy'; }); };

  // terrain: mostly ground, a few mountains (blockers) and a pond (lethal push)
  Iso.prototype.build = function () {
    var rng = this.rng, N = this.W * this.H;
    this.tiles = [];
    for (var i = 0; i < N; i++) this.tiles.push({ x: i % this.W, y: (i / this.W) | 0, terrain: 'ground' });
    var mtn = 3 + rng.int(0, 2);
    for (var m = 0; m < mtn; m++) {
      var tx = rng.int(2, this.W - 3), ty = rng.int(1, this.H - 2);
      var t = this.tile(tx, ty); if (t) t.terrain = 'mountain';
    }
    // one small pond
    var px = rng.int(2, this.W - 3), py = rng.int(1, this.H - 2);
    [[0, 0], [1, 0], [0, 1]].forEach(function (d) { var t = this.tile(px + d[0], py + d[1]); if (t) t.terrain = 'water'; }, this);
  };

  Iso.prototype.spawn = function () {
    this.units = [];
    var self = this;
    // the Kindled — three characters, drawn from portraits
    var party = [
      { name: 'Selin', role: 'skirmisher', hp: 5, atk: 2, moves: 3, weapon: 'punch', accent: '#c9a24a', fem: false, seed: 'iso-hero', hero: true },
      { name: 'Naneth', role: 'warden', hp: 6, atk: 1, moves: 2, weapon: 'punch', accent: '#3a8a4a', fem: true, seed: 'iso-naneth' },
      { name: 'Ves', role: 'channeler', hp: 3, atk: 1, moves: 3, weapon: 'beam', accent: '#7e6bff', fem: true, seed: 'iso-ves' },
    ];
    party.forEach(function (p, i) {
      var y = 1 + i * 2;
      while (self.tile(0, y) && self.tile(0, y).terrain !== 'ground') y++;
      self.units.push(mk(p, 'ally', 0, clamp(y, 0, self.H - 1)));
    });
    // the Hollow — beasts, drawn from the bestiary (small tactical stats)
    var foes = [
      { id: 'ridgehound', hp: 3, atk: 1, moves: 2, weapon: 'punch' },
      { id: 'gloamspawn', hp: 2, atk: 2, moves: 2, weapon: 'punch' },
      { id: 'craghorn', hp: 4, atk: 1, moves: 1, weapon: 'punch' },
    ];
    foes.forEach(function (f, i) {
      var b = TLU.Bestiary ? TLU.Bestiary.byId(f.id) : { name: f.id, color: '#a33', tags: [] };
      var y = 1 + i * 2;
      while (self.tile(self.W - 1, y) && self.tile(self.W - 1, y).terrain !== 'ground') y++;
      var u = mk({ name: b.name, id: f.id, hp: f.hp, atk: f.atk, moves: f.moves, weapon: f.weapon, accent: b.color, tags: b.tags || [], faction: b.faction, color: b.color }, 'enemy', self.W - 1, clamp(y, 0, self.H - 1));
      self.units.push(u);
    });
    function mk(d, side, x, y) {
      return { name: d.name, id: d.id, side: side, gx: x, gy: y, hp: d.hp, maxHp: d.hp, atk: d.atk,
        moves: d.moves, weapon: d.weapon || 'punch', accent: d.accent, color: d.color, tags: d.tags,
        faction: d.faction, role: d.role, fem: d.fem, seed: d.seed, hero: d.hero, alive: true, acted: false, intent: null, el: null };
    }
  };

  // ---- projection -----------------------------------------------------
  Iso.prototype.originX = function () { return 40 + (this.H - 1) * TW / 2; };
  Iso.prototype.originY = function () { return 96; };
  Iso.prototype.cx = function (gx, gy) { return this.originX() + (gx - gy) * TW / 2; };
  Iso.prototype.cy = function (gx, gy) { return this.originY() + (gx + gy) * TH / 2; };
  Iso.prototype.cw = function () { return this.originX() + (this.W - 1) * TW / 2 + TW / 2 + 40; };
  Iso.prototype.ch = function () { return this.originY() + (this.W + this.H - 2) * TH / 2 + TH / 2 + 70; };
  // pixel -> grid (click picking)
  Iso.prototype.pick = function (px, py) {
    var dx = px - this.originX(), dy = py - this.originY();
    var gx = Math.round((dx / (TW / 2) + dy / (TH / 2)) / 2);
    var gy = Math.round((dy / (TH / 2) - dx / (TW / 2)) / 2);
    return this.tile(gx, gy) ? { x: gx, y: gy } : null;
  };

  // ---- reachability (4-dir BFS over free ground) ----------------------
  Iso.prototype.reach = function (u) {
    var set = {}, q = [[u.gx, u.gy, 0]], seen = {}; seen[key(u.gx, u.gy)] = true;
    while (q.length) {
      var c = q.shift(), x = c[0], y = c[1], d = c[2];
      if (d >= u.moves) continue;
      for (var i = 0; i < 4; i++) {
        var nx = x + DIRS[i][0], ny = y + DIRS[i][1], k = key(nx, ny);
        var t = this.tile(nx, ny);
        if (!t || seen[k] || t.terrain !== 'ground' || this.unitAt(nx, ny)) continue;
        seen[k] = true; set[k] = true; q.push([nx, ny, d + 1]);
      }
    }
    return set;
  };

  // enemies attackable by u from its current tile (u.weapon reach along 4 dirs)
  Iso.prototype.targets = function (u) {
    var res = {}, range = u.weapon === 'beam' ? 3 : 1;
    for (var i = 0; i < 4; i++) {
      for (var r = 1; r <= range; r++) {
        var tx = u.gx + DIRS[i][0] * r, ty = u.gy + DIRS[i][1] * r, t = this.tile(tx, ty);
        if (!t || t.terrain === 'mountain') break;
        var oc = this.unitAt(tx, ty);
        if (oc) { if (oc.side !== u.side) res[key(tx, ty)] = { dir: DIRS[i] }; break; }
      }
    }
    return res;
  };

  // ---- push / damage --------------------------------------------------
  Iso.prototype.damage = function (u, n, srcName) {
    if (!u || !u.alive) return;
    u.hp -= n;
    this.flash(u, 'iso-hurt');
    if (u.hp <= 0) { u.hp = 0; u.alive = false; if (u.el) u.el.classList.add('iso-dead'); }
  };

  // shove target one tile along dir; collisions & water follow ITB rules
  Iso.prototype.push = function (target, dir) {
    if (!target || !target.alive || !dir) return;
    var nx = target.gx + dir[0], ny = target.gy + dir[1], t = this.tile(nx, ny);
    if (!t) { this.damage(target, 1); return; }                      // shoved into the void wall
    if (t.terrain === 'mountain') { this.damage(target, 1); return; } // crunch
    var oc = this.unitAt(nx, ny);
    if (oc) { this.damage(target, 1); this.damage(oc, 1); return; }   // bodies collide
    if (t.terrain === 'water') { this.damage(target, 99, 'the pond'); return; } // drown
    target.gx = nx; target.gy = ny;                                  // clean slide
  };

  Iso.prototype.hit = function (attacker, tx, ty, dir) {
    var t = this.tile(tx, ty); if (!t) return;
    var oc = this.unitAt(tx, ty);
    if (oc) { this.damage(oc, attacker.atk, attacker.name); this.push(oc, dir); }
  };

  // ---- player actions -------------------------------------------------
  Iso.prototype.select = function (u) {
    if (this.over || u.side !== 'ally' || u.acted) return;
    this.selected = u;
    this.moveSet = this.reach(u);
    this.atkSet = this.targets(u);
    this.render();
  };

  Iso.prototype.moveTo = function (x, y) {
    var u = this.selected; if (!u) return;
    if (!this.moveSet[key(x, y)]) return;
    u.gx = x; u.gy = y;
    this.moveSet = {};                       // spent the step
    this.atkSet = this.targets(u);           // may now have new targets
    this.render();
  };

  Iso.prototype.attack = function (tx, ty) {
    var u = this.selected; if (!u) return;
    var a = this.atkSet[key(tx, ty)]; if (!a) return;
    this.hit(u, tx, ty, a.dir);
    u.acted = true; this.selected = null; this.moveSet = {}; this.atkSet = {};
    this.render();
    this.checkEnd();
  };

  // ---- enemy phase ----------------------------------------------------
  Iso.prototype.nearestAlly = function (e) {
    var best = null, bd = 1e9;
    this.allies().forEach(function (a) {
      var d = Math.abs(a.gx - e.gx) + Math.abs(a.gy - e.gy);
      if (d < bd) { bd = d; best = a; }
    });
    return best;
  };
  // the direction from e that most reduces distance to its quarry
  Iso.prototype.dirToward = function (e, a) {
    if (!a) return DIRS[0];
    var ax = a.gx - e.gx, ay = a.gy - e.gy;
    if (Math.abs(ax) >= Math.abs(ay)) return ax === 0 ? (ay > 0 ? [0, 1] : [0, -1]) : (ax > 0 ? [1, 0] : [-1, 0]);
    return ay > 0 ? [0, 1] : [0, -1];
  };

  // set each enemy's telegraph (its next-resolution strike). If `initial`,
  // only telegraph (no prior attack to resolve, no advance).
  Iso.prototype.enemyPlan = function (initial) {
    var self = this;
    this.enemies().forEach(function (e) {
      var a = self.nearestAlly(e);
      e.intent = { dir: self.dirToward(e, a) };
    });
  };

  // resolve telegraphed strikes, then advance + re-telegraph
  Iso.prototype.endTurn = function () {
    if (this.over) return;
    var self = this;
    // 1) execute the strikes the player just saw
    this.enemies().forEach(function (e) {
      if (!e.intent) return;
      var d = e.intent.dir, tx = e.gx + d[0], ty = e.gy + d[1];
      self.hit(e, tx, ty, d);
    });
    this.checkEnd();
    if (this.over) { this.render(); return; }
    // 2) advance toward the nearest Kindled (one step) if not adjacent
    this.enemies().forEach(function (e) {
      var a = self.nearestAlly(e); if (!a) return;
      if (Math.abs(a.gx - e.gx) + Math.abs(a.gy - e.gy) <= 1) return;
      var d = self.dirToward(e, a), nx = e.gx + d[0], ny = e.gy + d[1], t = self.tile(nx, ny);
      if (t && t.terrain === 'ground' && !self.unitAt(nx, ny)) { e.gx = nx; e.gy = ny; }
    });
    // 3) telegraph the next round
    this.enemyPlan(false);
    this.turn++;
    this.allies().forEach(function (u) { u.acted = false; });
    this.selected = null; this.moveSet = {}; this.atkSet = {};
    this.render();
  };

  Iso.prototype.checkEnd = function () {
    if (!this.enemies().length) this.over = 'win';
    else { var hero = this.units.find(function (u) { return u.hero; }); if ((hero && !hero.alive) || !this.allies().length) this.over = 'lose'; }
    if (this.over && this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  };

  // ---- DOM + rendering ------------------------------------------------
  Iso.prototype.mountDom = function () {
    var self = this;
    this.root.innerHTML =
      '<div class="iso-wrap">' +
      '  <div class="iso-board" style="width:' + this.cw() + 'px;height:' + this.ch() + 'px">' +
      '    <canvas class="iso-canvas"></canvas><div class="iso-units"></div>' +
      '    <div class="iso-banner" style="display:none"></div>' +
      '  </div>' +
      '  <div class="iso-side">' +
      '    <div class="iso-title">Isometric Skirmish <span>· a tactics bench</span></div>' +
      '    <div class="iso-status"></div>' +
      '    <div class="iso-roster"></div>' +
      '    <div class="iso-actions"><button class="iso-btn iso-end">End Turn ▸</button><button class="iso-btn iso-reset">Reset</button></div>' +
      '    <div class="iso-help">Click a Kindled to select · blue tiles = move · red tiles = a Hollow’s telegraphed strike. ' +
      'Step off a marked tile, or shove a foe (attacks push 1) so its own blow whiffs, crunches a mountain, or hits its kin. Clear the Hollow.</div>' +
      '  </div>' +
      '</div>';
    this.canvas = this.root.querySelector('.iso-canvas');
    this.unitLayer = this.root.querySelector('.iso-units');
    this.banner = this.root.querySelector('.iso-banner');
    var dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    this.canvas.width = this.cw() * dpr; this.canvas.height = this.ch() * dpr;
    this.canvas.style.width = this.cw() + 'px'; this.canvas.style.height = this.ch() + 'px';
    this.ctx = this.canvas.getContext('2d'); this.ctx.scale(dpr, dpr);

    this.canvas.addEventListener('click', function (ev) {
      var r = self.canvas.getBoundingClientRect();
      var p = self.pick(ev.clientX - r.left, ev.clientY - r.top);
      if (!p) return;
      if (self.selected && self.atkSet[key(p.x, p.y)]) { self.attack(p.x, p.y); return; }
      if (self.selected && self.moveSet[key(p.x, p.y)]) { self.moveTo(p.x, p.y); return; }
      var u = self.unitAt(p.x, p.y);
      if (u && u.side === 'ally') self.select(u);
      else { self.selected = null; self.moveSet = {}; self.atkSet = {}; self.render(); }
    });
    this.root.querySelector('.iso-end').addEventListener('click', function () { self.endTurn(); });
    this.root.querySelector('.iso-reset').addEventListener('click', function () { self.reset(); });

    // build unit tokens (generative art)
    this.units.forEach(function (u) { self.makeToken(u); });
  };

  Iso.prototype.makeToken = function (u) {
    var el = document.createElement('div');
    el.className = 'iso-unit iso-' + u.side + (u.hero ? ' iso-heroU' : '');
    var art = '';
    if (u.side === 'ally' && TLU.Art && TLU.Art.portrait) {
      art = TLU.Art.portrait(u.seed, { role: u.role, accent: u.accent, fem: u.fem, age: 'prime' });
    } else if (TLU.Art && TLU.Art.beastPlate) {
      art = TLU.Art.beastPlate(u.id, { tags: u.tags || [], faction: u.faction, accent: u.accent || u.color, bare: true, cls: 'tlu-plate iso-art' });
    }
    el.innerHTML = '<div class="iso-art-wrap">' + art + '</div>' +
      '<div class="iso-tag" style="border-color:' + (u.accent || u.color) + '"><span class="iso-hp"></span></div>';
    var self = this;
    el.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (self.selected && self.atkSet[key(u.gx, u.gy)]) { self.attack(u.gx, u.gy); return; }
      if (u.side === 'ally') self.select(u);
    });
    u.el = el; u.hpEl = el.querySelector('.iso-hp');
    this.unitLayer.appendChild(el);
  };

  Iso.prototype.render = function () {
    this.drawBoard();
    this.placeUnits();
    this.drawStatus();
  };

  Iso.prototype.diamond = function (ctx, cx, cy) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - TH / 2); ctx.lineTo(cx + TW / 2, cy);
    ctx.lineTo(cx, cy + TH / 2); ctx.lineTo(cx - TW / 2, cy); ctx.closePath();
  };

  Iso.prototype.drawBoard = function () {
    var ctx = this.ctx; ctx.clearRect(0, 0, this.cw(), this.ch());
    var sel = this.selected;
    for (var gy = 0; gy < this.H; gy++) for (var gx = 0; gx < this.W; gx++) {
      var t = this.tile(gx, gy), cx = this.cx(gx, gy), cy = this.cy(gx, gy);
      var base = t.terrain === 'water' ? '#2b4a63' : t.terrain === 'mountain' ? '#5a5346' : ((gx + gy) % 2 ? '#3b3527' : '#443d2d');
      // tile top
      this.diamond(ctx, cx, cy); ctx.fillStyle = base; ctx.fill();
      // move / attack overlays
      if (this.moveSet[key(gx, gy)]) { this.diamond(ctx, cx, cy); ctx.fillStyle = 'rgba(90,150,220,0.42)'; ctx.fill(); }
      var intent = this.intentTile(gx, gy);
      if (intent) { this.diamond(ctx, cx, cy); ctx.fillStyle = 'rgba(220,60,70,' + (0.3 + this.pulse * 0.28) + ')'; ctx.fill(); }
      if (this.atkSet[key(gx, gy)]) { this.diamond(ctx, cx, cy); ctx.fillStyle = 'rgba(230,190,90,0.5)'; ctx.fill(); }
      // grid stroke
      this.diamond(ctx, cx, cy); ctx.strokeStyle = 'rgba(20,16,10,0.55)'; ctx.lineWidth = 1; ctx.stroke();
      if (sel && sel.gx === gx && sel.gy === gy) { this.diamond(ctx, cx, cy); ctx.strokeStyle = '#e6c15a'; ctx.lineWidth = 2; ctx.stroke(); }
      // mountain block
      if (t.terrain === 'mountain') this.drawBlock(cx, cy);
      if (t.terrain === 'water') { this.diamond(ctx, cx, cy); ctx.fillStyle = 'rgba(120,180,220,0.15)'; ctx.fill(); }
    }
    // telegraph arrows from each enemy toward its strike tile
    var self = this;
    this.enemies().forEach(function (e) {
      if (!e.intent) return;
      var d = e.intent.dir, tx = e.gx + d[0], ty = e.gy + d[1];
      if (!self.tile(tx, ty)) return;
      self.arrow(self.cx(e.gx, e.gy), self.cy(e.gx, e.gy) - 6, self.cx(tx, ty), self.cy(tx, ty) - 6);
    });
  };

  Iso.prototype.drawBlock = function (cx, cy) {
    var ctx = this.ctx;
    // two side faces + a top, a crude raised prism
    ctx.beginPath(); ctx.moveTo(cx - TW / 2, cy); ctx.lineTo(cx, cy + TH / 2); ctx.lineTo(cx, cy + TH / 2 - LIFT); ctx.lineTo(cx - TW / 2, cy - LIFT); ctx.closePath();
    ctx.fillStyle = '#3f3a30'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + TW / 2, cy); ctx.lineTo(cx, cy + TH / 2); ctx.lineTo(cx, cy + TH / 2 - LIFT); ctx.lineTo(cx + TW / 2, cy - LIFT); ctx.closePath();
    ctx.fillStyle = '#4b4438'; ctx.fill();
    this.diamond(ctx, cx, cy - LIFT); ctx.fillStyle = '#6a6152'; ctx.fill(); ctx.strokeStyle = 'rgba(20,16,10,0.5)'; ctx.stroke();
  };

  Iso.prototype.arrow = function (x0, y0, x1, y1) {
    var ctx = this.ctx, a = Math.atan2(y1 - y0, x1 - x0);
    // shorten to tile edge
    x1 -= Math.cos(a) * 12; y1 -= Math.sin(a) * 8;
    ctx.strokeStyle = 'rgba(255,90,100,0.9)'; ctx.fillStyle = 'rgba(255,90,100,0.95)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - Math.cos(a - 0.5) * 10, y1 - Math.sin(a - 0.5) * 10);
    ctx.lineTo(x1 - Math.cos(a + 0.5) * 10, y1 - Math.sin(a + 0.5) * 10); ctx.closePath(); ctx.fill();
  };

  // is (gx,gy) a tile a living enemy has telegraphed to strike?
  Iso.prototype.intentTile = function (gx, gy) {
    return this.enemies().some(function (e) { return e.intent && e.gx + e.intent.dir[0] === gx && e.gy + e.intent.dir[1] === gy; });
  };

  Iso.prototype.placeUnits = function () {
    var self = this;
    this.units.forEach(function (u) {
      if (!u.el) return;
      if (!u.alive) { u.el.style.display = 'none'; return; }
      u.el.style.display = '';
      u.el.style.left = self.cx(u.gx, u.gy) + 'px';
      u.el.style.top = (self.cy(u.gx, u.gy) - 4) + 'px';
      u.el.style.zIndex = 100 + (u.gx + u.gy) * 2 + (u.side === 'ally' ? 1 : 0);
      u.el.classList.toggle('iso-acted', u.side === 'ally' && u.acted);
      u.el.classList.toggle('iso-sel', self.selected === u);
      if (u.hpEl) u.hpEl.textContent = u.hp;
    });
  };

  Iso.prototype.drawStatus = function () {
    var st = this.root.querySelector('.iso-status'), ro = this.root.querySelector('.iso-roster');
    if (st) st.innerHTML = this.over
      ? (this.over === 'win' ? '<b class="iso-win">The Hollow are broken.</b>' : '<b class="iso-lose">The Kindled have fallen.</b>')
      : 'Turn <b>' + this.turn + '</b> — <span>the Hollow have telegraphed. Reposition, then End Turn.</span>';
    if (ro) ro.innerHTML = this.units.filter(function (u) { return u.alive; }).map(function (u) {
      return '<div class="iso-r ' + u.side + (u.acted ? ' done' : '') + '"><span class="dot" style="background:' + (u.accent || u.color) + '"></span>' +
        u.name + ' <i>' + u.hp + '/' + u.maxHp + '</i></div>';
    }).join('');
    if (this.banner) {
      if (this.over) { this.banner.style.display = ''; this.banner.className = 'iso-banner ' + this.over; this.banner.textContent = this.over === 'win' ? 'VICTORY' : 'DEFEAT'; }
      else this.banner.style.display = 'none';
    }
  };

  Iso.prototype.flash = function (u, cls) {
    if (!u.el) return; u.el.classList.add(cls);
    setTimeout(function () { if (u.el) u.el.classList.remove(cls); }, 320);
  };

  Iso.prototype.reset = function () {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    this.rng = new TLU.RNG('iso:' + this.seed + ':' + (this.turn * 7));
    this.turn = 1; this.over = null; this.selected = null; this.moveSet = {}; this.atkSet = {};
    this.build(); this.spawn(); this.enemyPlan(true);
    this.unitLayer.innerHTML = '';
    var self = this; this.units.forEach(function (u) { self.makeToken(u); });
    this.render(); this.loop();
  };

  Iso.prototype.loop = function () {
    var self = this;
    function frame() {
      self.pulse = (Math.sin(Date.now() / 380) + 1) / 2;
      self.drawBoard();
      if (!self.over) self._raf = requestAnimationFrame(frame);
    }
    if (typeof requestAnimationFrame !== 'undefined') this._raf = requestAnimationFrame(frame);
  };

  TLU.Iso = { mount: function (root, opts) { return new Iso(root, opts); }, Iso: Iso };
})(window.TLU = window.TLU || {});
