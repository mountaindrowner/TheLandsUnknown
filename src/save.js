/* ============================================================
 * save.js — persistence via localStorage. The world is rebuilt
 * from its seed; we store the player and mutable site/quest state.
 * ============================================================ */
(function (TLU) {
  'use strict';

  const KEY = 'tlu_save_v1';

  function snapshot(game) {
    const w = game.world;
    const siteStates = {};
    w.sites.forEach(function (s) {
      siteStates[s.x + ',' + s.y] = { cleared: !!s.cleared, opened: !!s.opened, hasFragment: !!s.hasFragment, discovered: !!s.discovered, fragmentTaken: !!s.fragmentTaken };
    });
    return {
      v: 1,
      seed: game.seed,
      turnCount: game.turnCount,
      storm: game.storm,
      day: game.day,
      player: game.player,         // plain data — serializes cleanly
      siteStates: siteStates,
      questLog: game.questLog,
      time: Date.now ? null : null, // (Date.now intentionally avoided in scripted contexts)
    };
  }

  function save(game) {
    try {
      const data = snapshot(game);
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) { console.warn('save failed', e); return false; }
  }

  function hasSave() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { console.warn('load failed', e); return null; }
  }

  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  // re-apply saved mutable state onto a freshly-generated world
  function applyState(game, data) {
    if (!data || !data.siteStates) return;
    game.world.sites.forEach(function (s) {
      const st = data.siteStates[s.x + ',' + s.y];
      if (st) { s.cleared = st.cleared; s.opened = st.opened; s.hasFragment = st.hasFragment; s.discovered = st.discovered; s.fragmentTaken = st.fragmentTaken; }
    });
  }

  TLU.Save = { save: save, load: load, clear: clear, hasSave: hasSave, applyState: applyState, KEY: KEY };
})(window.TLU = window.TLU || {});
