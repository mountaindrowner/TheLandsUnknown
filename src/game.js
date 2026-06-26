/* ============================================================
 * game.js — the state machine: world & dungeon movement,
 * encounters, the turn-based combat flow, town services,
 * quests, save/load, and all keyboard input.
 * ============================================================ */
(function (TLU) {
  'use strict';

  const UI = TLU.UI;
  const BIOME_DANGER = { plains: 0, coast: 0, hills: 1, forest: 1, crater: 1, plateau: 2, storm: 4, desert: 2, vault: 2 };

  function Game() {
    this.state = 'title';     // title | chargen | play | combat | over | win
    this.mode = 'world';      // world | dungeon
    this.overlay = null;
    this.logLines = [];
    this.turnCount = 0;
    this.day = 1;
    this.storm = { active: false, timer: 60, front: 999 };
    this.disp = null;
  }

  // ---------- bootstrap ----------
  Game.prototype.init = function (disp) {
    this.disp = disp;
    const self = this;
    window.addEventListener('keydown', function (e) { self.onKey(e); });
    this.openTitle();
    this.render();
  };

  Game.prototype.render = function () {
    if (this.state === 'play' || this.state === 'combat') {
      if (this.mode === 'world') TLU.Render.drawWorld(this.disp, this);
      else TLU.Render.drawDungeon(this.disp, this);
      UI.renderHUD(this);
    }
    this.renderOverlay();
  };

  Game.prototype.msg = function (m, c) { UI.log(this, m, c); };

  // ---------- title / new game ----------
  Game.prototype.openTitle = function () {
    this.state = 'title';
    const items = [{ label: 'New Game', key: 'new' }];
    if (TLU.Save.hasSave()) items.unshift({ label: 'Continue', key: 'continue', color: '#7ec8ff' });
    items.push({ label: 'How to Play', key: 'help' });
    this.overlay = { type: 'title', cursor: 0, items: items };
  };

  Game.prototype.startChargen = function () {
    this.state = 'chargen';
    this.overlay = {
      type: 'chargen', step: 0, cursor: 0,
      name: TLU.genName(new TLU.RNG('name' + this.turnCount)),
      orderKeys: Object.keys(TLU.LORE.orders),
      orderIdx: 0,
      weapons: [['blades', 'Sword & Dagger'], ['blunt', 'Mace & Hammer'], ['polearm', 'Spear & Glaive'], ['archery', 'Bow']],
      weaponIdx: 0,
      seedStr: 'aurenmark-' + (Math.floor(performance.now()) ^ 0x5bd1e995),
    };
  };

  Game.prototype.beginGame = function (cfg) {
    this.seed = cfg.seed;
    this.world = TLU.World.generate(cfg.seed, {});
    this.player = TLU.Player.newPlayer({ name: cfg.name, order: cfg.order, weaponSkill: cfg.weaponSkill, seed: cfg.seed });
    const p = this.player;
    p.wx = this.world.start.x; p.wy = this.world.start.y;
    this.mode = 'world'; this.state = 'play'; this.overlay = null;
    this.questLog = {};
    p.questState.main = { stage: 0 };
    this.revealWorld(p.wx, p.wy, 4);
    this.ensureCodex();
    this.discoverBiome(p.wx, p.wy);
    this.logLines = [];
    this.msg('%c' + TLU.LORE.title + ' — ' + TLU.LORE.subtitle, 'head');
    this.msg('You wake on the Rockbud Plains, wisps circling like curious sparks.');
    this.msg('Seek the Galewardens in a hold (⌂). Press [?] for help, [Enter] to interact.');
    this.save();
  };

  Game.prototype.continueGame = function () {
    const data = TLU.Save.load();
    if (!data) { this.openTitle(); return; }
    this.seed = data.seed;
    this.world = TLU.World.generate(data.seed, {});
    TLU.Save.applyState(this, data);
    this.player = data.player;
    // rebuild non-serialized derived refs
    this.player.order = TLU.LORE.orders[this.player.orderId];
    TLU.Player.recompute(this.player);
    TLU.Player.refreshAbilities(this.player);
    this.ensureCodex();
    this.turnCount = data.turnCount || 0;
    this.storm = data.storm || this.storm;
    this.day = data.day || 1;
    this.questLog = data.questLog || {};
    this.mode = 'world'; this.state = 'play'; this.overlay = null;
    this.logLines = [];
    this.msg('%c— The journey continues. —', 'head');
  };

  Game.prototype.save = function () { try { TLU.Save.save(this); } catch (e) {} };

  // ---------- world reveal ----------
  Game.prototype.revealWorld = function (x, y, r) {
    const p = this.player;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + 2) continue;
      const mx = x + dx, my = y + dy;
      if (mx >= 0 && my >= 0 && mx < this.world.w && my < this.world.h) p.visited[mx + ',' + my] = 1;
    }
  };

  // ---------- world movement ----------
  Game.prototype.moveWorld = function (dx, dy) {
    const p = this.player, w = this.world;
    const nx = p.wx + dx, ny = p.wy + dy;
    if (nx < 0 || ny < 0 || nx >= w.w || ny >= w.h) return;
    if (!w.passable(nx, ny)) { this.msg('The way is impassable.'); return; }
    p.wx = nx; p.wy = ny; p.stats.steps++;
    this.revealWorld(nx, ny, 4);
    this.worldTurn();
    this.discoverBiome(nx, ny);
    const site = w.siteAt(nx, ny);
    if (site) { this.msg('%cYou stand before ' + site.name + '. Press [Enter] to ' + (site.type === 'town' ? 'enter' : 'descend') + '.', 'note'); }
    else { this.maybeEncounter(); if (this.state === 'play' && !this.overlay) this.ambientTick(); }
    if (p.stats.steps % 12 === 0) this.save();
    this.render();
  };

  Game.prototype.worldTurn = function () {
    this.turnCount++;
    const p = this.player;
    // light regen while travelling
    p.hp = Math.min(p.maxHp, p.hp + 1 + (p.hpRegen || 0));
    const sl = this.storm.active ? 3 : 1;
    p.stormlight = Math.min(p.maxStormlight, p.stormlight + sl + (p.stormRegen || 0));
    p.food = Math.max(0, p.food - 0.4);
    if (p.food <= 0 && this.turnCount % 4 === 0) { p.hp = Math.max(1, p.hp - 2); this.msg('%cYou are starving. Eat a ration ([I]).', 'bad'); }
    // storm cycle
    this.storm.timer--;
    if (this.storm.timer <= 0) {
      this.storm.active = !this.storm.active;
      if (this.storm.active) { this.storm.timer = 14; this.storm.front = 0; this.msg('%c⛈ A galestorm sweeps in from the east! The surges flow freely, but the wilds grow deadly.', 'storm'); }
      else { this.storm.timer = 90 + (this.turnCount % 40); this.storm.front = 999; this.day++; this.msg('%c☀ The storm passes. Dawn breaks on day ' + this.day + '.', 'note'); }
    }
    if (this.storm.active) this.storm.front = Math.max(0, this.storm.front - 4);
  };

  Game.prototype.maybeEncounter = function () {
    const p = this.player, w = this.world;
    const t = w.tiles[p.wy][p.wx];
    let chance = 0.12;
    if (t.road) chance = 0.04;
    if (this.storm.active) chance += 0.06;
    chance += (BIOME_DANGER[t.biome] || 0) * 0.015;
    if (!this.rng) this.rng = new TLU.RNG(this.seed + ':enc');
    if (this.rng.chance(chance)) {
      const lvl = this.encounterLevel(t);
      const grp = TLU.Bestiary.spawnGroup(this.rng, t.biome, lvl);
      this.startCombat(grp, { biome: t.biome, level: lvl, canFlee: true });
    }
  };

  Game.prototype.encounterLevel = function (t) {
    const p = this.player;
    const eastFactor = (p.wx / this.world.w) * 4;
    const danger = (BIOME_DANGER[t.biome] || 0) + eastFactor + (this.storm.active ? 2 : 0);
    const lvl = Math.round(p.level * 0.7 + danger * 0.7 + this.rng.float(-1, 1.5));
    return Math.max(1, Math.min(20, lvl));
  };

  // ---------- sites ----------
  Game.prototype.interact = function () {
    if (this.mode === 'world') {
      const site = this.world.siteAt(this.player.wx, this.player.wy);
      if (site) this.enterSite(site);
      else this.msg('There is nothing here to interact with.');
    } else {
      this.dungeonInteract();
    }
  };

  Game.prototype.enterSite = function (site) {
    if (site.type === 'town') { this.openTown(site); return; }
    // dungeon-like sites
    this.enterDungeon(site);
  };

  Game.prototype.enterDungeon = function (site) {
    const maxDepth = site.floors || 1;
    let bossKind = null;
    if (site.type === 'lair') bossKind = site.boss;
    if (site.final) bossKind = 'final';
    this.dungeon = { site: site, depth: 1, maxDepth: maxDepth, bossKind: bossKind };
    this.discoverPlace(site.type);
    if (site.final) this.advanceMain('reach:aharietiam');
    this.buildFloor(1);
    this.mode = 'dungeon'; this.state = 'play'; this.overlay = null;
    this.msg('%cYou enter ' + site.name + '.', 'head');
    this.render();
  };

  Game.prototype.buildFloor = function (depth) {
    const site = this.dungeon.site;
    const seed = this.seed + ':' + site.x + ',' + site.y + ':f' + depth;
    const onBossFloor = (depth === this.dungeon.maxDepth) && this.dungeon.bossKind;
    const floor = TLU.Dungeon.genFloor(seed, {
      level: site.level, depth: depth, maxDepth: this.dungeon.maxDepth,
      biome: site.type === 'camp' ? 'camp' : (site.final ? 'aharietiam' : 'vault'),
      boss: onBossFloor ? this.dungeon.bossKind : null,
      hasFragment: site.hasFragment && depth === this.dungeon.maxDepth && !site.fragmentTaken,
    });
    // camps: fill with reavers regardless of rooms
    this.dungeon.depth = depth;
    this.dungeon.floor = floor;
    this.dungeon.seen = new Uint8Array(floor.w * floor.h);
    const p = this.player;
    p.dx = floor.entrance.x; p.dy = floor.entrance.y;
    this.computeFOV();
  };

  // ---------- dungeon movement ----------
  Game.prototype.moveDungeon = function (dx, dy) {
    const d = this.dungeon.floor, p = this.player;
    const nx = p.dx + dx, ny = p.dy + dy;
    if (!d.passable(nx, ny)) return;
    // enemy in the way?
    const enemy = d.entities.find(function (e) { return e.alive && e.x === nx && e.y === ny; });
    if (enemy) {
      // gather a small group of adjacent foes
      const grp = d.entities.filter(function (e) {
        return e.alive && Math.abs(e.x - nx) <= 1 && Math.abs(e.y - ny) <= 1;
      });
      const isBoss = !!enemy.boss;
      this.startCombat(grp.length ? grp : [enemy], { biome: d.biome, level: d.level, isBoss: isBoss, canFlee: !isBoss });
      return;
    }
    p.dx = nx; p.dy = ny;
    this.turnCount++;
    this.computeFOV();
    // wandering enemies step toward player occasionally
    this.dungeonWander();
    // pick up feature on this tile
    const feat = d.features.find(function (f) { return f.x === nx && f.y === ny && !f.taken; });
    if (feat) this.takeFeature(feat);
    // stairs hints
    if (nx === d.down.x && ny === d.down.y) this.msg('%cStairs down (>). Press [Enter] to descend' + (this.dungeon.depth >= this.dungeon.maxDepth ? ' / leave.' : '.'), 'note');
    if (nx === d.entrance.x && ny === d.entrance.y && this.dungeon.depth === 1) this.msg('%cThe way out (<). Press [Enter] to leave.', 'note');
    this.render();
  };

  Game.prototype.dungeonWander = function () {
    const d = this.dungeon.floor, p = this.player;
    if (!this.rng) this.rng = new TLU.RNG(this.seed + ':enc');
    const self = this;
    d.entities.forEach(function (e) {
      if (!e.alive) return;
      const dist = Math.abs(e.x - p.dx) + Math.abs(e.y - p.dy);
      if (dist > 8 || dist === 0) return;
      if (!self.rng.chance(0.6)) return;
      const sx = Math.sign(p.dx - e.x), sy = Math.sign(p.dy - e.y);
      const tx = e.x + (Math.abs(p.dx - e.x) >= Math.abs(p.dy - e.y) ? sx : 0);
      const ty = e.y + (Math.abs(p.dx - e.x) >= Math.abs(p.dy - e.y) ? 0 : sy);
      if (d.passable(tx, ty) && !(tx === p.dx && ty === p.dy) &&
          !d.entities.some(function (o) { return o !== e && o.alive && o.x === tx && o.y === ty; })) {
        e.x = tx; e.y = ty;
      }
    });
  };

  Game.prototype.takeFeature = function (feat) {
    const p = this.player;
    if (feat.type === 'chest') {
      feat.taken = true;
      const loot = (feat.loot || []).filter(Boolean);
      if (feat.gold) { TLU.Player.addGold(p, feat.gold); this.msg('%c◎ You find ' + feat.gold + ' gold.', 'good'); }
      this.openLoot(loot, 'A chest creaks open');
    } else if (feat.type === 'gem') {
      feat.taken = true;
      TLU.Player.addItem(p, TLU.Items.gem(feat.gem, 1));
      p.gemsFound++; this.advanceSide();
      this.msg('%c* You pocket an Infused ' + feat.gem + '.', 'good');
      TLU.Player.trainSkill(p, 'alchemy', 4, this.mkLog());
    } else if (feat.type === 'fragment') {
      feat.taken = true; this.dungeon.site.fragmentTaken = true;
      p.fragments++;
      this.msg('%c◈ A DAWNSHARD FRAGMENT thrums in your hand! (' + p.fragments + '/4)', 'level');
      this.advanceMain('fragments');
      this.advanceSide();
    }
  };

  Game.prototype.dungeonInteract = function () {
    const d = this.dungeon.floor, p = this.player;
    if (p.dx === d.down.x && p.dy === d.down.y) {
      if (this.dungeon.depth < this.dungeon.maxDepth) {
        this.msg('%cYou descend deeper...', 'note');
        this.buildFloor(this.dungeon.depth + 1);
        p.deepestVault = Math.max(p.deepestVault || 0, this.dungeon.depth);
        this.advanceSide();
        this.render();
      } else {
        this.finishDungeon();
      }
      return;
    }
    if (p.dx === d.entrance.x && p.dy === d.entrance.y) {
      if (this.dungeon.depth > 1) { this.buildFloor(this.dungeon.depth - 1); this.render(); }
      else this.leaveDungeon();
      return;
    }
    const feat = d.features.find(function (f) { return f.x === p.dx && f.y === p.dy && !f.taken; });
    if (feat) { this.takeFeature(feat); this.render(); return; }
    this.msg('Nothing here.');
  };

  Game.prototype.finishDungeon = function () {
    const site = this.dungeon.site;
    const aliveBoss = this.dungeon.floor.entities.some(function (e) { return e.alive && e.boss; });
    if (aliveBoss) { this.msg('%cThe master of this place still lives. You cannot pass.', 'bad'); return; }
    if (site.type === 'vault' || site.final) {
      if (!site.cleared) { site.cleared = true; this.player.vaultsCleared++; }
      this.advanceMain('clearVault');
      this.msg('%cYou have plumbed the depths of ' + site.name + '.', 'good');
    }
    this.leaveDungeon();
  };

  Game.prototype.leaveDungeon = function () {
    this.mode = 'world'; this.state = 'play'; this.overlay = null;
    this.msg('%cYou return to the surface.', 'note');
    this.save();
    this.render();
  };

  // simple raycast FOV
  Game.prototype.computeFOV = function () {
    const d = this.dungeon.floor, seen = this.dungeon.seen, p = this.player;
    const R = 7;
    // demote currently-lit to remembered
    for (let i = 0; i < seen.length; i++) if (seen[i] === 2) seen[i] = 1;
    function blocked(x, y) { return !(x >= 0 && y >= 0 && x < d.w && y < d.h) || d.grid[y][x] === TLU.Dungeon.WALL; }
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      if (dx * dx + dy * dy > R * R) continue;
      const tx = p.dx + dx, ty = p.dy + dy;
      if (tx < 0 || ty < 0 || tx >= d.w || ty >= d.h) continue;
      // bresenham from player to target
      let x0 = p.dx, y0 = p.dy, x1 = tx, y1 = ty;
      let adx = Math.abs(x1 - x0), ady = Math.abs(y1 - y0);
      let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = adx - ady;
      let cx = x0, cy = y0, vis = true;
      while (true) {
        if (cx === x1 && cy === y1) break;
        if (!(cx === x0 && cy === y0) && blocked(cx, cy)) { vis = false; break; }
        const e2 = 2 * err;
        if (e2 > -ady) { err -= ady; cx += sx; }
        if (e2 < adx) { err += adx; cy += sy; }
      }
      if (vis) seen[ty * d.w + tx] = 2;
    }
    seen[p.dy * d.w + p.dx] = 2;
  };

  // ---------- combat ----------
  Game.prototype.mkLog = function () { const self = this; return function (m, c) { UI.log(self, m, c); }; };

  Game.prototype.startCombat = function (enemies, opts) {
    const self = this;
    if (!this.rng) this.rng = new TLU.RNG(this.seed + ':enc');
    this.state = 'combat';
    this.combat = new TLU.Combat(this, {
      rng: this.rng.fork('battle' + this.turnCount + ':' + enemies.length),
      player: this.player, enemies: enemies, level: opts.level, biome: opts.biome,
      isBoss: opts.isBoss, canFlee: opts.canFlee,
      log: this.mkLog(),
      onEnd: function (c) { self.onCombatEnd(c); },
    });
    this.overlay = { type: 'combat', menu: 'root', cursor: 0, pending: null };
    this.combat.start();
    this.render();
  };

  Game.prototype.onCombatEnd = function (c) {
    const p = this.player;
    if (c.result === 'defeat') { this.gameOver(); return; }
    if (c.result === 'victory') {
      TLU.Player.gainXp(p, c.rewards.xp, this.mkLog());
      TLU.Player.addGold(p, c.rewards.gold);
      const loot = (c.rewards.loot || []).filter(Boolean);
      // remove dead from dungeon floor
      if (this.mode === 'dungeon') this.dungeon.floor.entities = this.dungeon.floor.entities.filter(function (e) { return e.alive; });
      // boss-specific outcomes
      const killedFinal = c.enemies.some(function (e) { return e.id === 'midnight_mother' && !e.alive; });
      const killedMini = c.enemies.some(function (e) { return e.id === 'highlord_reaver' && !e.alive; });
      if (killedMini) { if (this.dungeon && this.dungeon.site) this.dungeon.site.cleared = true; loot.push(TLU.Items.UNIQUES.oathbringer()); }
      if (loot.length) { this.state = 'play'; this.openLoot(loot, 'Spoils of battle'); }
      else { this.state = 'play'; this.overlay = null; }
      if (killedFinal) { this.victory(); return; }
      this.save();
    } else { // flee
      this.state = 'play'; this.overlay = null;
    }
    this.render();
  };

  // quest hook from Combat
  Game.prototype.onEnemyKilled = function (e) {
    const p = this.player;
    p.kills[e.id] = (p.kills[e.id] || 0) + 1; p.stats.kills++;
    this.discoverBestiary(e);
    if (e.id === 'highlord_reaver') this.advanceMain('kill:highlord_reaver');
    if (e.id === 'midnight_mother') this.advanceMain('kill:midnight_mother');
    if (e.id === 'thunderclast') this.advanceSide();
  };

  // ---------- quests ----------
  Game.prototype.advanceMain = function (evt) {
    const p = this.player, q = TLU.Quests.MAIN;
    const st = p.questState.main || (p.questState.main = { stage: 0 });
    if (st.stage >= q.stages.length) return;
    const stage = q.stages[st.stage];
    const tr = stage.trigger;
    let match = false;
    if (tr.type === 'talk' && evt === 'talk:' + tr.who) match = true;
    else if (tr.type === 'clearVault' && evt === 'clearVault') match = true;
    else if (tr.type === 'kill' && evt === 'kill:' + tr.who) match = true;
    else if (tr.type === 'fragments' && evt === 'fragments' && p.fragments >= tr.count) match = true;
    else if (tr.type === 'reach' && evt === 'reach:' + tr.place) match = true;
    if (match) {
      st.stage++;
      if (st.stage < q.stages.length) {
        this.msg('%c✸ Quest updated: ' + q.stages[st.stage].text, 'level');
      } else {
        this.msg('%c✸ ' + q.name + ' complete!', 'level');
      }
      this.save();
    }
  };

  Game.prototype.advanceSide = function () {
    const p = this.player;
    TLU.Quests.SIDE.forEach(function (q) {
      const st = p.questState[q.id] || (p.questState[q.id] = { stage: 0, done: false });
      if (st.done) return;
      const tr = q.stages[0].trigger;
      let ok = false;
      if (tr.type === 'clearCamps' && p.campsCleared >= tr.count) ok = true;
      if (tr.type === 'vaultDepth' && (p.deepestVault || 0) >= tr.depth) ok = true;
      if (tr.type === 'killType' && (p.kills[tr.who] || 0) >= 1) ok = true;
      if (tr.type === 'collectGems' && p.gemsFound >= tr.count) ok = true;
      if (ok) {
        st.done = true; st.stage = 1;
        const r = q.onComplete;
        if (r.gold) TLU.Player.addGold(p, r.gold);
        if (r.item) {
          let it;
          if (r.item.unique && TLU.Items.UNIQUES[r.item.unique]) it = TLU.Items.UNIQUES[r.item.unique]();
          else it = TLU.Items.genEquipment(new TLU.RNG('reward' + q.id), r.item.level, { kind: r.item.kind, magic: r.item.magic });
          TLU.Player.addItem(p, it);
        }
        UI.log(window.GAME, '%c✸ Side quest complete: ' + q.name + ' (+' + (r.gold || 0) + 'g)', 'level');
      }
    });
  };

  // camps cleared check (called when leaving a fully-cleared camp)
  Game.prototype.checkCampClear = function () {
    const d = this.dungeon;
    if (d && d.site.type === 'camp' && !d.site.cleared) {
      const anyAlive = d.floor.entities.some(function (e) { return e.alive; });
      if (!anyAlive) {
        d.site.cleared = true; this.player.campsCleared++;
        this.msg('%cThe reaver camp is broken. (' + this.player.campsCleared + ' cleared)', 'good');
        this.advanceSide();
      }
    }
  };

  // ---------- end states ----------
  Game.prototype.gameOver = function () {
    this.player.stats.deaths++;
    this.state = 'over';
    const quote = new TLU.RNG('death' + this.turnCount).pick(TLU.LORE.deathQuotes);
    this.overlay = { type: 'over', quote: quote };
    this.render();
  };
  Game.prototype.victory = function () {
    this.state = 'win';
    this.overlay = { type: 'win' };
    TLU.Save.clear();
    this.render();
  };

  // ---------- overlays open helpers ----------
  Game.prototype.openLoot = function (items, title) {
    if (!items || !items.length) { this.overlay = null; this.render(); return; }
    items.forEach(function (it) { if (it) it._new = true; });
    this.overlay = { type: 'loot', items: items, title: title || 'Loot', cursor: 0 };
  };
  Game.prototype.openInventory = function () { if (this.state !== 'play') return; this.overlay = { type: 'inventory', cursor: 0, tab: 'all' }; this.render(); };
  Game.prototype.openCharacter = function () { if (this.state !== 'play') return; this.overlay = { type: 'character', cursor: 0 }; this.render(); };
  Game.prototype.openQuests = function () { if (this.state !== 'play') return; this.overlay = { type: 'quests', cursor: 0 }; this.render(); };
  Game.prototype.openHelp = function () { this.overlay = { type: 'help', back: this.state }; this.render(); };

  Game.prototype.openTown = function (site) {
    this.townSite = site;
    this.discoverPlace('town');
    this.overlay = { type: 'town', cursor: 0, site: site };
    this.state = 'play';
    this.render();
  };

  // ---------- discovery / codex / dialogue ----------
  Game.prototype.ensureCodex = function () {
    const p = this.player; if (!p) return;
    p.codex = p.codex || {};
    p.codex.bestiary = p.codex.bestiary || {};
    p.codex.places = p.codex.places || {};
    p.codex.biomes = p.codex.biomes || {};
    p.codex.rumors = p.codex.rumors || [];
  };
  Game.prototype.discoverBiome = function (x, y) {
    const p = this.player, t = this.world.tiles[y] && this.world.tiles[y][x];
    if (!t) return; this.ensureCodex();
    if (!p.codex.biomes[t.biome]) {
      p.codex.biomes[t.biome] = true;
      const fl = TLU.LORE.biomeFlavor[t.biome];
      if (fl) this.msg('%c' + fl, 'note');
    }
  };
  Game.prototype.placeName = function (type) { return { town: 'Holds', vault: 'Riftvaults', camp: 'Reaver Camps', lair: 'Warcamps', ruin: 'Dawnhollow' }[type] || type; };
  Game.prototype.discoverPlace = function (type) {
    const p = this.player; this.ensureCodex();
    if (!p.codex.places[type] && TLU.Dialogue.CODEX.places[type]) {
      p.codex.places[type] = true;
      this.msg('%c✦ Codex: discovered ' + this.placeName(type) + '. [L] to read.', 'skill');
    }
  };
  Game.prototype.discoverBestiary = function (e) {
    const p = this.player; this.ensureCodex();
    if (TLU.Dialogue.BESTIARY_LORE[e.id] && !p.codex.bestiary[e.id]) {
      p.codex.bestiary[e.id] = true;
      this.msg('%c✦ Bestiary: recorded ' + e.name + '. [L] to read.', 'skill');
    }
  };

  // ambient barks + non-combat travel events
  Game.prototype.ambientTick = function () {
    if (!this.rng) this.rng = new TLU.RNG(this.seed + ':enc');
    const r = this.rng;
    if (r.chance(0.06)) { this.triggerEvent(); return; }
    if (r.chance(0.14)) this.msg(TLU.Dialogue.pick(r, TLU.Dialogue.BARKS));
  };
  Game.prototype.triggerEvent = function () {
    const r = this.rng;
    const ev = r.weighted(TLU.Dialogue.EVENTS.map(function (e) { return { v: e, w: e.weight || 1 }; }));
    this.msg('%c' + ev.text, 'note');
    try { ev.effect(this); } catch (err) {}
  };

  Game.prototype.dirWord = function (dx, dy) {
    const ns = dy < -1 ? 'north' : dy > 1 ? 'south' : '';
    const ew = dx < -1 ? 'west' : dx > 1 ? 'east' : '';
    return (ns + ew) || 'nearby';
  };
  // reveal nearest undiscovered site of a type → {site, dir} or null
  Game.prototype.revealNearestSite = function (type) {
    const p = this.player, w = this.world;
    let best = null, bd = 1e9;
    w.sites.forEach(function (s) {
      if (s.type !== type || p.visited[s.x + ',' + s.y]) return;
      const d = Math.abs(s.x - p.wx) + Math.abs(s.y - p.wy);
      if (d < bd) { bd = d; best = s; }
    });
    if (!best) return null;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const mx = best.x + dx, my = best.y + dy;
      if (mx >= 0 && my >= 0 && mx < w.w && my < w.h) p.visited[mx + ',' + my] = 1;
    }
    return { site: best, dir: this.dirWord(best.x - p.wx, best.y - p.wy) };
  };

  Game.prototype.openCodex = function () { if (this.state !== 'play') return; this.ensureCodex(); this.overlay = { type: 'codex', tab: 0 }; this.render(); };
  Game.prototype.npcRng = function (site) { return new TLU.RNG(this.seed + ':npc:' + site.x + ',' + site.y); };
  Game.prototype.openNpcs = function (site) {
    this.ensureCodex();
    const roster = TLU.Dialogue.rosterFor(this.npcRng(site), site);
    this.overlay = { type: 'npclist', cursor: 0, site: site, roster: roster };
    this.render();
  };

  TLU.Game = Game;
})(window.TLU = window.TLU || {});
