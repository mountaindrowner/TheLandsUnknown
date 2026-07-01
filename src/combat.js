/* ============================================================
 * combat.js — turn-based, Final-Fantasy-style battle resolver.
 * Round-based initiative; the player's turn pauses for input,
 * enemy turns resolve via a small AI. Status effects, crits,
 * elements, boss phases, loot & skill-training on victory.
 * ============================================================ */
(function (TLU) {
  'use strict';

  function speedOf(a) { return a.kind === 'player' ? a.speed : a.spd; }
  function defenseOf(a) {
    let d = a.kind === 'player' ? a.defense : a.def;
    if (a.statuses && a.statuses.guard) d = Math.round(d * 2.2);
    return d;
  }
  function atkOf(a) { return a.kind === 'player' ? a.attack : a.atk; }

  function Combat(game, opts) {
    this.game = game;
    this.rng = opts.rng || new TLU.RNG('battle' + (game.turnCount || 0));
    this.player = opts.player;
    this.enemies = opts.enemies || [];
    this.level = opts.level || 1;
    this.biome = opts.biome || 'plains';
    this.isBoss = opts.isBoss || false;
    this.canFlee = opts.canFlee !== false;
    this.log = opts.log || function () {};
    // fx(ev): a visual-effect sink drained by the battle animator. Emitting is
    // side-effect-free for the simulation — combat math never reads it back.
    this.fx = opts.fx || function () {};
    this.onEnd = opts.onEnd || function () {};
    this.round = 0;
    this.order = [];
    this.turnIndex = 0;
    this.over = false;
    this.result = null;
    this.rewards = { xp: 0, gold: 0, loot: [] };
    this.awaitingPlayer = false;
    this.bossPhase = 1;

    // ensure enemies have statuses + unique tags
    this.enemies.forEach(function (e, i) { e.statuses = e.statuses || {}; e._id = 'e' + i; e.alive = e.hp > 0; });
    this.player.statuses = this.player.statuses || {};
    this.player._id = 'player';
    // companions fight on the player's side
    this.allies = (opts.allies || []).filter(function (a) { return a && a.hp > 0; });
    this.allies.forEach(function (a, i) { a.statuses = a.statuses || {}; a._id = 'a' + i; a.alive = a.hp > 0; a.kind = 'ally'; });
  }

  Combat.prototype.aliveEnemies = function () { return this.enemies.filter(function (e) { return e.alive && e.hp > 0; }); };
  Combat.prototype.aliveAllies = function () { return this.allies.filter(function (a) { return a.alive && a.hp > 0; }); };

  Combat.prototype.start = function () {
    this.log('%c⚔ ' + this._enemyDesc() + ' block your path!', 'head');
    this._newRound();
  };

  Combat.prototype._enemyDesc = function () {
    const names = {};
    this.enemies.forEach(function (e) { names[e.name] = (names[e.name] || 0) + 1; });
    return Object.keys(names).map(function (n) { return names[n] > 1 ? names[n] + '× ' + n : n; }).join(', ');
  };

  Combat.prototype._newRound = function () {
    this.round++;
    // build initiative
    const all = [this.player].concat(this.aliveAllies()).concat(this.aliveEnemies());
    const rng = this.rng;
    all.forEach(function (a) { a._init = speedOf(a) + rng.float(0, 5); });
    all.sort(function (a, b) { return b._init - a._init; });
    this.order = all;
    this.turnIndex = 0;
    this._advance();
  };

  // process turns until it's the player's turn (pause) or combat ends
  Combat.prototype._advance = function () {
    while (!this.over) {
      if (this.turnIndex >= this.order.length) { this._newRound(); return; }
      const actor = this.order[this.turnIndex];
      if (!actor || (actor.kind !== 'player' && (!actor.alive || actor.hp <= 0))) { this.turnIndex++; continue; }
      // status tick at start of this actor's turn
      const skip = this._tickStatuses(actor);
      if (this._checkEnd()) return;
      if (actor.hp <= 0) { this.turnIndex++; continue; }
      if (skip) { this.log(actor.name + ' cannot act!'); this.turnIndex++; continue; }

      if (actor.kind === 'player') {
        this.awaitingPlayer = true;
        return; // wait for playerAct()
      } else if (actor.kind === 'ally') {
        this._allyTurn(actor);
        this.turnIndex++;
        if (this._checkEnd()) return;
      } else {
        this._enemyTurn(actor);
        this.turnIndex++;
        if (this._checkEnd()) return;
      }
    }
  };

  // returns true if the actor must skip its action this turn
  Combat.prototype._tickStatuses = function (actor) {
    const s = actor.statuses; if (!s) return false;
    let skip = false;
    // damage-over-time
    if (s.burn) { const d = Math.max(2, Math.round((actor.maxHp || 40) * 0.04)); this._raw(actor, d, 'fire'); this.log('%c' + actor.name + ' burns for ' + d + '.', 'dot'); this._emitHit(actor, d, 'fire', { dot: true }); }
    if (s.bleed) { const d = Math.max(2, Math.round((actor.maxHp || 40) * 0.03)); this._raw(actor, d, 'phys'); this.log('%c' + actor.name + ' bleeds for ' + d + '.', 'dot'); this._emitHit(actor, d, 'bleed', { dot: true }); }
    if (s.poison) { const d = Math.max(1, Math.round((actor.maxHp || 40) * 0.025)); this._raw(actor, d, 'poison'); this.log('%c' + actor.name + ' suffers poison for ' + d + '.', 'dot'); this._emitHit(actor, d, 'poison', { dot: true }); }
    if (s.stun || s.bound) skip = true;
    if (s.fear && this.rng.chance(0.5)) skip = true;
    // decrement durations
    for (const k in s) { s[k]--; if (s[k] <= 0) delete s[k]; }
    return skip;
  };

  // ---- the player's chosen action ----
  // action: {type:'attack', target} | {type:'ability', id, target} |
  //         {type:'item', item, target} | {type:'defend'} | {type:'flee'}
  Combat.prototype.playerAct = function (action) {
    if (!this.awaitingPlayer || this.over) return;
    this.awaitingPlayer = false;
    const p = this.player;
    const self = this;
    const ctx = this._ctx(p);

    if (action.type === 'attack') {
      const t = action.target && action.target.alive ? action.target : this.aliveEnemies()[0];
      if (t) { this.attack(p, t, { label: null }); TLU.Player.trainSkill(p, p.weaponSkillId, 6, this.log); }
    } else if (action.type === 'ability') {
      const ab = TLU.Abilities[action.id];
      if (ab) {
        let cost = ab.cost || 0;
        if (p.perkFlags && p.perkFlags.artDiscount) cost = Math.ceil(cost * (1 - p.perkFlags.artDiscount));
        if (cost > p.charge) { this.log('Not enough Charge!'); this.awaitingPlayer = true; return; }
        p.charge -= cost;
        ctx.target = action.target && action.target.alive ? action.target : this.aliveEnemies()[0];
        this.log('%c' + p.name + ' invokes ' + ab.name + '!', 'cast');
        this.fx({ type: 'cast', id: p._id, name: ab.name, school: ab.school || null });
        ab.effect(ctx);
        if (ab.school) TLU.Player.trainSkill(p, ab.school, 10, this.log);
      }
    } else if (action.type === 'item') {
      this._useItem(p, action.item, action.target);
    } else if (action.type === 'defend') {
      this.applyStatus(p, 'guard', 2);
      p.charge = Math.min(p.maxCharge, p.charge + 6);
      this.log(p.name + ' takes a defensive stance and draws breath.');
    } else if (action.type === 'flee') {
      const chance = this.isBoss ? 0 : 0.45 + (p.speed - this._avgEnemySpeed()) * 0.02;
      if (this.rng.chance(chance)) { this.over = true; this.result = 'flee'; this.log('%cYou break away and flee!', 'good'); return this.onEnd(this); }
      this.log('You fail to escape!');
    }

    if (this._checkEnd()) return;
    this.turnIndex++;
    this._advance();
  };

  Combat.prototype._avgEnemySpeed = function () {
    const e = this.aliveEnemies(); if (!e.length) return 0;
    return e.reduce(function (s, x) { return s + x.spd; }, 0) / e.length;
  };

  Combat.prototype._useItem = function (p, item, target) {
    if (!item) return;
    if (item.heal) { this.heal(p, item.heal, item.name); }
    if (item.charge) { p.charge = Math.min(p.maxCharge, p.charge + item.charge); this.log('%c+' + item.charge + ' Charge.', 'good'); }
    if (item.cure && p.statuses[item.cure]) { delete p.statuses[item.cure]; this.log('Cured ' + item.cure + '.'); }
    if (item.scroll === 'blast') { TLU.Abilities.scroll_blast.effect(this._ctx(p)); }
    TLU.Player.removeItem(p, item, 1);
  };

  // ---- ally (companion) AI ----
  Combat.prototype._allyTurn = function (a) {
    const enemies = this.aliveEnemies();
    if (!enemies.length) return;
    const p = this.player;
    if (a.art) {
      if (p.hp < p.maxHp * 0.4 && this.rng.chance(0.6)) { this.fx({ type: 'cast', id: a._id, name: 'Mending' }); this.heal(p, Math.round(p.maxHp * 0.18), a.name + '’s mending'); return; }
      this.fx({ type: 'cast', id: a._id, name: 'Art' });
      this.magicHit(a, this.rng.pick(enemies), 1.2, 'arc', a.name + '’s Art');
      return;
    }
    if (a.guardy && this.rng.chance(0.22)) { this.applyStatus(a, 'guard', 2); this.log(a.name + ' raises a guard.'); return; }
    this.attack(a, this.rng.pick(enemies), {});
  };

  // pick whom an enemy strikes (player is twice as likely as any one ally)
  Combat.prototype._enemyPickTarget = function () {
    const pool = [this.player, this.player];
    this.aliveAllies().forEach(function (a) { pool.push(a); });
    const live = pool.filter(function (x) { return x.hp > 0; });
    return live.length ? this.rng.pick(live) : this.player;
  };

  // ---- enemy AI ----
  Combat.prototype._enemyTurn = function (e) {
    const p = this.player;
    const ctx = this._ctx(e);
    ctx.target = this._enemyPickTarget();

    // boss phase transitions
    if (e.boss && e.phases) this._bossPhase(e);

    // choose an ability sometimes, else basic attack
    const abilities = (e.abilities || []).filter(function (id) { return TLU.EnemyAbilities[id]; });
    let useAbility = abilities.length && this.rng.chance(e.boss ? 0.7 : 0.4);
    // heal if low
    if (e.hp < e.maxHp * 0.3 && abilities.indexOf('regenrift') >= 0 && this.rng.chance(0.7)) {
      this.fx({ type: 'cast', id: e._id, name: TLU.EnemyAbilities.regenrift.name, enemy: true });
      TLU.EnemyAbilities.regenrift.effect(ctx); return;
    }
    if (useAbility) {
      const id = this.rng.pick(abilities);
      const ab = TLU.EnemyAbilities[id];
      this.log('%c' + e.name + ' uses ' + ab.name + '!', 'ecast');
      this.fx({ type: 'cast', id: e._id, name: ab.name, enemy: true });
      ab.effect(ctx);
    } else {
      this.attack(e, ctx.target || p, {});
    }
  };

  Combat.prototype._bossPhase = function (e) {
    const ratio = e.hp / e.maxHp;
    const newPhase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
    if (newPhase > this.bossPhase) {
      this.bossPhase = newPhase;
      e.atk = Math.round(e.atk * 1.12);
      e.spd += 1;
      this.fx({ type: 'phase', id: e._id, phase: newPhase });
      this.log('%c☇ ' + e.name + ' surges with renewed fury! (Phase ' + newPhase + ')', 'boss');
      if (e.id === 'gloammother' || e.id === 'churnheart') this.spawnAdd(e);
    }
  };

  // ---- damage / heal primitives ----
  // returns damage dealt
  Combat.prototype.attack = function (attacker, target, opts) {
    opts = opts || {};
    if (!target || target.hp <= 0) return 0;
    this._emitAct(attacker, opts._counter ? 'counter' : 'melee', target._id);
    // miss checks (evasion from blur/evade/slick)
    const ts = target.statuses || {};
    let missChance = 0;
    if (ts.evade) missChance += 0.45;
    if (ts.blur) missChance += 0.4;
    if (target.kind === 'player' && target.perkFlags && target.perkFlags.evasive) missChance += target.perkFlags.evasive;
    if (this.rng.chance(missChance)) { this.log(attacker.name + ' misses ' + target.name + '!'); this.fx({ type: 'miss', id: target._id }); return 0; }
    // block (shields)
    let mitigateBlock = 1;
    const blockCh = target.kind === 'player' ? target.blockChance : (target.block || 0);
    if (blockCh && this.rng.chance(blockCh)) { mitigateBlock = 0.45; this.log('%c' + target.name + ' blocks!', 'block');
      if (target.kind === 'player') TLU.Player.trainSkill(target, 'block', 5, this.log); }

    let base = atkOf(attacker) * (opts.mult || 1);
    if (attacker.statuses && attacker.statuses.rage) base *= 1.3;
    const apf = attacker.kind === 'player' ? (attacker.perkFlags || {}) : {};
    if (apf.berserker && attacker.hp < attacker.maxHp / 3) base *= (1 + apf.berserker);
    let raw = base * this.rng.float(0.85, 1.18);

    // crit
    let critCh = (attacker.kind === 'player' ? attacker.crit : 0.05) + (opts.bonusCrit || 0);
    if (attacker.statuses && (attacker.statuses.truesight)) critCh = 1;
    let crit = this.rng.chance(critCh);
    if (crit) raw *= 1.85;

    // mitigation
    const pierce = (attacker.kind === 'player' ? attacker.armorPierce : (attacker.armorPierce || 0)) || 0;
    const def = defenseOf(target) * (1 - Math.min(0.85, pierce));
    let dmg = raw * (60 / (60 + Math.max(0, def))) * mitigateBlock;

    // element / riftbane vs rift enemies
    if (attacker.kind === 'player' && attacker.riftbane && target.tags && target.tags.indexOf('rift') >= 0) dmg *= (1 + attacker.riftbane);

    dmg = Math.max(1, Math.round(dmg));
    this._raw(target, dmg, 'phys');
    this.log((crit ? '%c' : '') + attacker.name + (opts.label ? ' ' + opts.label + 's' : ' hits') + ' ' + target.name + ' for ' + dmg + (crit ? '! CRIT' : '.'), crit ? 'crit' : null);
    this._emitHit(target, dmg, 'phys', { crit: crit, blocked: mitigateBlock < 1 });
    // melee perks: lifesteal & stagger (player attacker only)
    if (apf.lifesteal && dmg > 0 && attacker.hp > 0) this.heal(attacker, Math.max(1, Math.round(dmg * apf.lifesteal)), null);
    if (apf.stagger && target.hp > 0 && this.rng.chance(apf.stagger)) { this.applyStatus(target, 'stun', 1); this.log('%c' + target.name + ' is staggered!', 'block'); }
    this._onDamaged(attacker, target);
    // riposte: defender counterattacks (player only, no recursion — counter target lacks the flag)
    if (target.kind === 'player' && target.hp > 0 && target.perkFlags && target.perkFlags.riposte &&
        attacker.alive && attacker.hp > 0 && !opts._counter && this.rng.chance(target.perkFlags.riposte)) {
      this.log('%c' + target.name + ' ripostes!', 'good');
      this.attack(target, attacker, { mult: 0.7, label: 'counter', _counter: true });
    }
    return dmg;
  };

  Combat.prototype.magicHit = function (user, target, mult, element, label) {
    if (!target || target.hp <= 0) return 0;
    const ts = target.statuses || {};
    if ((ts.blur && this.rng.chance(0.3))) { this.log(label + ' fizzles against ' + target.name + '.'); return 0; }
    let power;
    if (user.kind === 'player') {
      // magic power derives from focus + best Attunement skill below
      let bestSurge = 0;
      TLU.Skills.attuneSkills.forEach(function (id) { if (user.skills[id]) bestSurge = Math.max(bestSurge, user.skills[id].level); });
      power = user.attr.focus * 1.7 + bestSurge * 1.6 + (user._bonus ? user._bonus.dmg * 0.4 : 0);
    } else power = user.atk * 0.9;
    if (user.kind === 'player' && user.perkFlags && user.perkFlags.artPower) power *= (1 + user.perkFlags.artPower);
    let raw = power * (mult || 1) * this.rng.float(0.88, 1.15);
    const def = defenseOf(target) * 0.4; // magic half-ignores armor
    let dmg = Math.max(1, Math.round(raw * (60 / (60 + Math.max(0, def)))));
    if (user.kind === 'player' && user.riftbane && target.tags && target.tags.indexOf('rift') >= 0) dmg = Math.round(dmg * (1 + user.riftbane));
    this._raw(target, dmg, element);
    this.log('%c' + (label || 'Attunement') + ' strikes ' + target.name + ' for ' + dmg + '.', 'cast');
    this._emitHit(target, dmg, element || 'arc', { magic: true });
    this._onDamaged(user, target);
    return dmg;
  };

  Combat.prototype._raw = function (target, dmg, element) {
    target.hp -= dmg;
    if (target.hp <= 0) { target.hp = 0; }
  };

  Combat.prototype._onDamaged = function (attacker, target) {
    if (target.hp <= 0) this._kill(attacker, target);
  };

  Combat.prototype._kill = function (attacker, target) {
    if (target.kind === 'enemy') {
      if (!target.alive) return;
      target.alive = false;
      this.fx({ type: 'death', id: target._id, boss: !!target.boss });
      this.log('%c' + target.name + ' is slain!', 'kill');
      this.rewards.xp += target.xp || 0;
      const g = target.gold ? this.rng.int(target.gold[0], target.gold[1]) : 0;
      this.rewards.gold += g;
      // perk: Second Wind — heal on kill
      const pf = this.player.perkFlags || {};
      if (attacker && attacker.kind === 'player' && pf.killheal && this.player.hp > 0) this.heal(this.player, Math.round(this.player.maxHp * pf.killheal), null);
      const mf = pf.magicFind ? 1 : 0;
      // drops
      if (target.drops) {
        const lvl = target.level || this.level;
        if (target.drops === 'weapon') this.rewards.loot.push(TLU.Items.genEquipment(this.rng, lvl, { kind: 'weapon', magic: mf }));
        else if (target.drops === 'gem') this.rewards.loot.push(TLU.Items.gem(this.rng.pick(TLU.LORE.gems), 1));
        else if (target.drops === 'rare') this.rewards.loot.push(TLU.Items.genEquipment(this.rng, lvl + 1, { magic: 1 + mf }));
        else if (target.drops === 'legendary') this.rewards.loot.push(TLU.Items.genEquipment(this.rng, lvl + 2, { magic: 2 + mf }));
        else if (target.drops === 'artifact') {/* handled by quest */}
      }
      if (this.rng.chance(0.35)) this.rewards.loot.push(TLU.Items.rollLoot(this.rng, target.level || this.level, 0)[0]);
      // crafting material drop
      if (this.rng.chance(0.5)) this.rewards.loot.push(TLU.Items.rollMaterial(this.rng, target));
      // track kills
      this.game.onEnemyKilled && this.game.onEnemyKilled(target);
    } else if (target.kind === 'ally') {
      if (!target.alive) return;
      target.alive = false; target.hp = 0;
      this.fx({ type: 'death', id: target._id });
      this.log('%c' + target.name + ' is downed!', 'bad');
    } else {
      // player died
      this.over = true; this.result = 'defeat';
    }
  };

  Combat.prototype.heal = function (target, amount, label) {
    const max = target.maxHp || 40;
    const before = target.hp;
    target.hp = Math.min(max, target.hp + amount);
    const gained = target.hp - before;
    if (label) this.log('%c' + target.name + ' recovers ' + gained + ' HP (' + label + ').', 'good');
    if (gained > 0 && target._id) this.fx({ type: 'heal', id: target._id, amount: gained, hpAfter: target.hp, maxHp: max });
    return gained;
  };

  Combat.prototype.applyStatus = function (target, status, turns) {
    target.statuses = target.statuses || {};
    const fresh = !target.statuses[status];
    target.statuses[status] = Math.max(target.statuses[status] || 0, turns);
    if (fresh && target._id) this.fx({ type: 'status', id: target._id, status: status });
  };

  // ---- fx emitters (drained by the battle animator; no gameplay effect) ----
  Combat.prototype._emitAct = function (actor, kind, targetId) {
    if (actor && actor._id) this.fx({ type: 'act', id: actor._id, kind: kind, targetId: targetId || null });
  };
  Combat.prototype._emitHit = function (target, amount, element, opt) {
    opt = opt || {};
    if (!target || !target._id) return;
    this.fx({
      type: 'hit', id: target._id, amount: amount, element: element || 'phys',
      hpAfter: Math.max(0, target.hp), maxHp: target.maxHp || 40,
      crit: !!opt.crit, blocked: !!opt.blocked, dot: !!opt.dot, dead: target.hp <= 0,
    });
  };

  Combat.prototype.spawnAdd = function (boss) {
    const add = TLU.Bestiary.scale(TLU.Bestiary.byId('gloamspawn'), this.level);
    add.name = 'Gloam Shadow';
    add.statuses = {}; add.alive = true; add._id = 'e' + this.enemies.length;
    this.enemies.push(add);
    this.fx({ type: 'spawn', id: add._id });
    this.log('%cA murderous shadow peels from the darkness!', 'boss');
  };

  Combat.prototype._ctx = function (user) {
    const self = this;
    return {
      rng: this.rng, user: user, target: null, combat: this, log: this.log,
      enemies: this.enemies, allies: [this.player],
      allies0: function () { return [self.player].concat(self.aliveAllies()); }, // "the player's side" for enemy AoE
    };
  };

  Combat.prototype._checkEnd = function () {
    if (this.over) { this._finish(); return true; }
    if (this.player.hp <= 0) { this.over = true; this.result = 'defeat'; this._finish(); return true; }
    if (this.aliveEnemies().length === 0) { this.over = true; this.result = 'victory'; this._finish(); return true; }
    return false;
  };

  Combat.prototype._finish = function () {
    if (this._finished) return; this._finished = true;
    if (this.result === 'victory') {
      this.log('%c★ Victory! +' + this.rewards.xp + ' XP, +' + this.rewards.gold + ' gold.', 'good');
    }
    this.onEnd(this);
  };

  TLU.Combat = Combat;
})(window.TLU = window.TLU || {});
