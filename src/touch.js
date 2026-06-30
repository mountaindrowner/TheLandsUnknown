/* ============================================================
 * touch.js — mobile / touch controls.
 * Builds an on-screen D-pad + action buttons, adds swipe & tap on
 * the map, and makes every menu / combat card / codex tab tappable.
 * All input is routed through the existing keyboard handlers via
 * synthetic key dispatch, so behavior stays identical to desktop.
 * ============================================================ */
(function (TLU) {
  'use strict';

  function hasTouch() {
    try {
      if (localStorage.getItem('tlu_touch') === '1') return true;
      if (location.search.indexOf('touch=1') >= 0) return true;
    } catch (e) {}
    return ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function btn(key, label, cls) {
    const b = el('button', 'touch-btn' + (cls ? ' ' + cls : ''), label);
    b.setAttribute('data-key', key);
    b.setAttribute('type', 'button');
    return b;
  }

  function build(game) {
    const ui = el('div', 'touch-ui');

    // --- D-pad (3×3; center = Action/Enter) ---
    const dpad = el('div', 'touch-dpad');
    const cells = [
      ['y', '↖'], ['ArrowUp', '↑'], ['u', '↗'],
      ['ArrowLeft', '←'], ['Enter', '◉'], ['ArrowRight', '→'],
      ['b', '↙'], ['ArrowDown', '↓'], ['n', '↘'],
    ];
    cells.forEach(function (c) {
      const b = btn(c[0], c[1], c[0] === 'Enter' ? 'dp-center' : 'dp-dir');
      dpad.appendChild(b);
    });

    // --- action buttons ---
    const acts = el('div', 'touch-acts');
    acts.appendChild(btn('i', '🎒<span>Bag</span>'));
    acts.appendChild(btn('c', '👤<span>Hero</span>'));
    acts.appendChild(btn('q', '📜<span>Quest</span>'));
    acts.appendChild(btn('L', '📖<span>Codex</span>'));
    acts.appendChild(btn('Escape', '☰<span>Menu</span>'));

    // --- back button (for overlays) ---
    const back = btn('Escape', '✕', 'touch-back');

    ui.appendChild(dpad);
    ui.appendChild(acts);
    ui.appendChild(back);
    document.body.appendChild(ui);

    game._touch = { ui: ui, dpad: dpad, acts: acts, back: back };
  }

  // route a tap anywhere to the right action
  function onTap(game, target) {
    const b = target.closest && target.closest('.touch-btn[data-key]');
    if (b) { game.key(b.getAttribute('data-key')); return true; }
    const ov = document.getElementById('overlay');
    if (!ov || !ov.classList.contains('show')) return false;
    const mi = target.closest('[data-mi]');
    if (mi && !mi.classList.contains('disabled')) { game.touchMenuSelect(parseInt(mi.getAttribute('data-mi'), 10)); return true; }
    const tab = target.closest('.cx-tab[data-cxtab]');
    if (tab) { game.touchCodexTab(parseInt(tab.getAttribute('data-cxtab'), 10)); return true; }
    const en = target.closest('.cb-enemy[data-eidx]');
    if (en) { game.touchEnemy(parseInt(en.getAttribute('data-eidx'), 10)); return true; }
    // tap-to-advance for text screens (dialog, help, chargen name step)
    const o = game.overlay;
    if (o && (o.type === 'dialog' || o.type === 'help' || o.type === 'landmark' || o.type === 'echo' || (o.type === 'chargen' && o.step === 2))) { game.key('Enter'); return true; }
    return false;
  }

  function init(game) {
    if (!document.body) { document.addEventListener('DOMContentLoaded', function () { init(game); }); return; }
    build(game);
    if (hasTouch()) document.body.classList.add('has-touch');

    // delegated tap handling (works for touch + desktop mouse on menus)
    document.addEventListener('click', function (e) {
      if (onTap(game, e.target)) { e.preventDefault(); }
    });

    // swipe + tap on the map (touch only, so desktop mouse is unaffected)
    const wrap = document.getElementById('map-wrap');
    if (wrap) {
      let sx = 0, sy = 0, active = false;
      wrap.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse') return;
        sx = e.clientX; sy = e.clientY; active = true;
      });
      wrap.addEventListener('pointerup', function (e) {
        if (e.pointerType === 'mouse' || !active) return;
        active = false;
        if (game.overlay) return; // overlays use taps, not swipes
        const dx = e.clientX - sx, dy = e.clientY - sy;
        const adx = Math.abs(dx), ady = Math.abs(dy);
        if (Math.max(adx, ady) < 22) { game.key('Enter'); return; }   // tap = interact
        if (adx > ady) game.key(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        else game.key(dy > 0 ? 'ArrowDown' : 'ArrowUp');
      });
    }

    sync(game);
  }

  // show/hide the right controls for the current screen
  function sync(game) {
    const t = game._touch; if (!t) return;
    const o = game.overlay;
    const inPlay = (game.state === 'play' || game.state === 'combat');
    const movable = inPlay && !o;                 // free roam → D-pad
    const textScreen = o && (o.type === 'title' || o.type === 'win' || o.type === 'over');
    t.dpad.style.display = movable ? '' : 'none';
    t.acts.style.display = movable ? '' : 'none';
    // back button on overlays that accept Escape (not title/end screens)
    t.back.style.display = (o && !textScreen) ? '' : 'none';
  }

  TLU.Touch = { init: init, sync: sync, hasTouch: hasTouch };
})(window.TLU = window.TLU || {});
