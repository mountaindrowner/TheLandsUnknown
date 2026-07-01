/* ============================================================
 * battlefx.js — the battle animator.
 *
 * Combat resolves a whole round synchronously, emitting a queue of
 * fx events (hit / heal / cast / death / phase …). This module plays
 * that queue back over time against the already-rendered battle DOM:
 * lunges, hit-flashes, floating numbers, HP-bar tweens, cast glows,
 * death fades and screen shake. It reads nothing back into the sim —
 * it is pure presentation, and degrades to a no-op with no DOM (so the
 * headless simulation is unaffected).
 *
 * A keypress or tap fast-forwards: remaining events apply instantly.
 * ============================================================ */
(function (TLU) {
  'use strict';

  // per-event dwell (ms) before the next event plays
  var DELAY = { act: 200, hit: 300, miss: 210, heal: 300, cast: 440, status: 150, death: 420, phase: 560, spawn: 1 };

  function run(game, queue, done) {
    var root = (typeof document !== 'undefined') ? document.getElementById('overlay') : null;
    var stage = root ? root.querySelector('.combat') : null;
    if (!root || !stage || !queue || !queue.length) { done(); return; }

    var i = 0, skipped = false, timer = null;
    game._fxPlaying = true;
    stage.classList.add('fx-busy');

    function nodeFor(id) { return id ? root.querySelector('[data-fxid="' + id + '"]') : null; }
    function finish() {
      if (timer) { clearTimeout(timer); timer = null; }
      game._fxPlaying = false; game._fxSkip = null;
      stage.classList.remove('fx-busy');
      done();
    }
    function drain() { while (i < queue.length) { apply(queue[i], true); i++; } finish(); }
    game._fxSkip = function () { if (skipped) return; skipped = true; if (timer) { clearTimeout(timer); timer = null; } drain(); };

    function floatNum(node, text, cls) {
      if (!node) return;
      var s = document.createElement('span');
      s.className = 'cb-float ' + cls;
      s.textContent = text;
      node.appendChild(s);
      setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 900);
    }
    function flash(node, cls, ms) {
      if (!node) return;
      node.classList.add(cls);
      setTimeout(function () { node.classList.remove(cls); }, ms);
    }
    function setBar(node, hpAfter, maxHp) {
      if (!node) return;
      var fill = node.querySelector('.barfill');
      if (fill) { var pct = maxHp > 0 ? Math.max(0, Math.round(hpAfter / maxHp * 100)) : 0; fill.style.width = pct + '%'; }
      var lbl = node.querySelector('.barlabel');
      if (lbl) lbl.textContent = Math.round(Math.max(0, hpAfter)) + ' / ' + Math.round(maxHp);
    }
    function shake(big) { flash(stage, big ? 'fx-shake-big' : 'fx-shake', big ? 480 : 300); }

    function apply(ev, instant) {
      var node = nodeFor(ev.id);
      switch (ev.type) {
        case 'act':
          if (node && !instant) {
            var enemy = node.getAttribute('data-side') === 'enemy';
            flash(node, enemy ? 'fx-lunge-dn' : 'fx-lunge-up', 240);
          }
          return DELAY.act;
        case 'hit':
          setBar(node, ev.hpAfter, ev.maxHp);
          if (node && ev.dead) node.classList.add('fx-dying');
          if (!instant) {
            var dcls = 'dmg' + (ev.crit ? ' crit' : '') + (ev.dot ? ' ' + ev.element : '');
            floatNum(node, '-' + ev.amount, dcls);
            flash(node, ev.blocked ? 'fx-block' : 'fx-hit', 300);
            if (ev.crit) shake(true);
          }
          return ev.dot ? 190 : DELAY.hit;
        case 'miss':
          if (!instant) { floatNum(node, 'miss', 'miss'); flash(node, 'fx-dodge', 240); }
          return DELAY.miss;
        case 'heal':
          setBar(node, ev.hpAfter, ev.maxHp);
          if (!instant) { floatNum(node, '+' + ev.amount, 'heal'); flash(node, 'fx-heal', 360); }
          return DELAY.heal;
        case 'cast':
          if (!instant) {
            flash(node, ev.enemy ? 'fx-cast-e' : 'fx-cast', 460);
            if (ev.name) floatNum(node, ev.name, 'cast-name' + (ev.enemy ? ' e' : ''));
          }
          return DELAY.cast;
        case 'status':
          if (!instant) floatNum(node, ev.status, 'status');
          return DELAY.status;
        case 'death':
          if (node) node.classList.add('fx-dying');
          if (!instant && ev.boss) shake(true);
          return DELAY.death;
        case 'phase':
          if (!instant) { flash(node, 'fx-phase', 720); shake(true); floatNum(node, 'PHASE ' + ev.phase, 'phase'); }
          return DELAY.phase;
        case 'spawn':
          return DELAY.spawn; // the new combatant appears on the closing re-render
        default:
          return 80;
      }
    }

    function step() {
      if (i >= queue.length) { finish(); return; }
      var ev = queue[i]; i++;
      var d = apply(ev, false);
      if (skipped) { drain(); return; }
      timer = setTimeout(step, d);
    }
    step();
  }

  TLU.BattleFX = { run: run };
})(window.TLU = window.TLU || {});
