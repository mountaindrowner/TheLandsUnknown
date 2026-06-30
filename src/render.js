/* ============================================================
 * render.js — canvas ASCII viewport renderer.
 * Draws a tile grid (overworld or dungeon) centered on the player,
 * plus a small minimap. HUD/menus are HTML (see ui.js).
 * ============================================================ */
(function (TLU) {
  'use strict';

  function Display(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cell = opts.cell || 20;
    this.cols = opts.cols || 45;
    this.rows = opts.rows || 30;
    this.font = opts.font || 'monospace';
    this.resize();
  }

  Display.prototype.resize = function () {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.cols * this.cell * dpr;
    this.canvas.height = this.rows * this.cell * dpr;
    this.canvas.style.width = (this.cols * this.cell) + 'px';
    this.canvas.style.height = (this.rows * this.cell) + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = Math.floor(this.cell * 0.92) + 'px ' + this.font;
  };

  Display.prototype.clear = function (bg) {
    this.ctx.fillStyle = bg || '#05060a';
    this.ctx.fillRect(0, 0, this.cols * this.cell, this.rows * this.cell);
  };

  Display.prototype.put = function (cx, cy, glyph, color, bg) {
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return;
    const px = cx * this.cell, py = cy * this.cell;
    if (bg) { this.ctx.fillStyle = bg; this.ctx.fillRect(px, py, this.cell, this.cell); }
    if (glyph && glyph !== ' ') {
      this.ctx.fillStyle = color || '#cfcfcf';
      this.ctx.fillText(glyph, px + this.cell / 2, py + this.cell / 2 + 1);
    }
  };

  // ---- overworld viewport ----
  function drawWorld(disp, game) {
    const w = game.world, p = game.player;
    const ctx = disp.ctx;
    disp.clear('#05060a');
    const halfC = Math.floor(disp.cols / 2), halfR = Math.floor(disp.rows / 2);
    const ox = p.wx - halfC, oy = p.wy - halfR;
    for (let sy = 0; sy < disp.rows; sy++) {
      for (let sx = 0; sx < disp.cols; sx++) {
        const mx = ox + sx, my = oy + sy;
        if (mx < 0 || my < 0 || mx >= w.w || my >= w.h) { disp.put(sx, sy, ' ', null, '#05060a'); continue; }
        const t = w.tiles[my][mx];
        const seen = p.visited[mx + ',' + my];
        let glyph = t.glyph, color = t.color, bg = t.bg;
        if (t.road && !t.site) { glyph = '+'; color = '#8a7a55'; }
        if (t.site) { glyph = t.site.glyph; color = t.site.color; bg = '#0a0a12'; }
        if (game.storm && game.storm.active) {
          const dxF = mx - game.storm.x;
          if (Math.abs(dxF) <= 3) { bg = '#3a1455'; if (Math.abs(dxF) <= 1) bg = '#5a1f7a'; }   // the front
          else if (dxF < 0) bg = '#160c22';                                                       // the wake
        }
        if (!seen) { color = dim(color, 0.42); bg = dim(bg || '#05060a', 0.5); glyph = t.site ? t.site.glyph : glyph; }
        disp.put(sx, sy, glyph, color, bg);
      }
    }
    // player on top
    disp.put(halfC, halfR, '@', '#fff36b', '#1a1a2a');
    drawMinimap(game);
  }

  // ---- dungeon viewport ----
  function drawDungeon(disp, game) {
    const d = game.dungeon.floor;
    const p = game.player;
    disp.clear('#04040a');
    const halfC = Math.floor(disp.cols / 2), halfR = Math.floor(disp.rows / 2);
    const ox = p.dx - halfC, oy = p.dy - halfR;
    const seen = game.dungeon.seen;
    for (let sy = 0; sy < disp.rows; sy++) {
      for (let sx = 0; sx < disp.cols; sx++) {
        const mx = ox + sx, my = oy + sy;
        if (mx < 0 || my < 0 || mx >= d.w || my >= d.h) { disp.put(sx, sy, ' ', null, '#04040a'); continue; }
        const vis = seen[my * d.w + mx];
        if (!vis) { disp.put(sx, sy, ' ', null, '#04040a'); continue; }
        const lit = vis === 2;
        const wallc = lit ? '#3a3550' : '#1c1a2a';
        const floorc = lit ? '#5a5440' : '#26241c';
        if (d.grid[my][mx] === TLU.Dungeon.WALL) { disp.put(sx, sy, '#', wallc, '#0a0a14'); continue; }
        // stairs
        if (mx === d.down.x && my === d.down.y) { disp.put(sx, sy, '>', lit ? '#ffd86b' : '#7a6a30', '#0c0c16'); continue; }
        if (mx === d.entrance.x && my === d.entrance.y) { disp.put(sx, sy, '<', lit ? '#9adfff' : '#3a5a66', '#0c0c16'); continue; }
        // features
        const feat = d.features.find(function (f) { return f.x === mx && f.y === my && !f.taken; });
        if (feat) { disp.put(sx, sy, featGlyph(feat), lit ? featColor(feat) : dim(featColor(feat), 0.5), '#0c0c16'); continue; }
        // enemies (only if lit)
        if (lit) {
          const e = d.entities.find(function (en) { return en.alive && en.x === mx && en.y === my; });
          if (e) { disp.put(sx, sy, e.glyph, e.color, '#140a0a'); continue; }
        }
        disp.put(sx, sy, '.', floorc, '#080810');
      }
    }
    disp.put(halfC, halfR, '@', '#fff36b', '#1a1a2a');
    drawMinimap(game);
  }

  function featGlyph(f) { return f.type === 'chest' ? '▯' : f.type === 'gem' ? '*' : f.type === 'fragment' ? '◈' : '?'; }
  function featColor(f) { return f.type === 'chest' ? '#caa04b' : f.type === 'gem' ? '#7ec8ff' : f.type === 'fragment' ? '#ff8adf' : '#cccccc'; }

  // ---- minimap (overworld only) ----
  function drawMinimap(game) {
    const cv = document.getElementById('minimap');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const w = game.world;
    const W = cv.width, H = cv.height;
    ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
    if (game.mode !== 'world') {
      ctx.fillStyle = '#555'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('(inside ' + (game.dungeon.site ? game.dungeon.site.name.split(' ')[0] : 'ruin') + ')', W / 2, H / 2);
      return;
    }
    const sx = W / w.w, sy = H / w.h;
    for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) {
      if (!game.player.visited[x + ',' + y]) continue;
      const t = w.tiles[y][x];
      ctx.fillStyle = t.site ? t.site.color : dim(t.color, 0.8);
      ctx.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy));
    }
    // the Churn front as a vertical band
    if (game.storm && game.storm.active && game.storm.x >= 0 && game.storm.x <= w.w) {
      ctx.fillStyle = 'rgba(150,80,220,0.55)';
      ctx.fillRect(Math.round(game.storm.x * sx) - 1, 0, Math.max(2, Math.ceil(sx * 2)), H);
    }
    ctx.fillStyle = '#fff36b';
    ctx.fillRect(game.player.wx * sx - 1, game.player.wy * sy - 1, 3, 3);
  }

  function dim(hex, f) {
    if (!hex || hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r * f); g = Math.round(g * f); b = Math.round(b * f);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  TLU.Render = { Display: Display, drawWorld: drawWorld, drawDungeon: drawDungeon, drawMinimap: drawMinimap, dim: dim };
})(window.TLU = window.TLU || {});
