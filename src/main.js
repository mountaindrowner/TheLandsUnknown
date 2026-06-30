/* ============================================================
 * main.js — bootstrap. Builds the canvas display and the Game,
 * then hands off to the title screen.
 * ============================================================ */
(function (TLU) {
  'use strict';
  function boot() {
    // import a shared legend into the Annals from ?legend=<code>
    try {
      const m = location.search.match(/[?&]legend=([^&]+)/);
      if (m && TLU.Dynasty) { const a = TLU.Dynasty.importCode(decodeURIComponent(m[1])); if (a) console.log('[Annals] imported legend: ' + a.name); }
    } catch (e) {}
    if (TLU.Theme) TLU.Theme.load();        // apply the saved theme before first paint
    const canvas = document.getElementById('map');
    const disp = new TLU.Render.Display(canvas, { cell: 20, cols: 45, rows: 30, font: '"Cascadia Code", "DejaVu Sans Mono", monospace' });
    const game = new TLU.Game();
    window.GAME = game;
    game.init(disp);
    if (TLU.Touch) TLU.Touch.init(game);
    window.addEventListener('beforeunload', function () { try { if (game.state === 'play') game.save(); } catch (e) {} });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.TLU = window.TLU || {});
