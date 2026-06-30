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

  // theme helpers (pass-through on the default 'storm' theme)
  function TC(hex, role) { return TLU.Theme ? TLU.Theme.col(hex, role) : hex; }
  function TB(hex) { return TLU.Theme ? TLU.Theme.bg(hex) : hex; }
  function themed() { return TLU.Theme && TLU.Theme.activeId !== 'storm'; }

  // ---- overworld viewport — an illustrated, inked cartographic map ----
  function drawWorld(disp, game) {
    const w = game.world, p = game.player, ctx = disp.ctx, cell = disp.cell;
    const base = (TLU.Theme && TLU.Theme.active().mapBg) || '#0e0b16';
    const ink = TC('#2a2620'), ink2 = TC('#6f6650');
    disp.clear(base);
    const halfC = Math.floor(disp.cols / 2), halfR = Math.floor(disp.rows / 2);
    const ox = p.wx - halfC, oy = p.wy - halfR;

    ctx.save();
    for (let sy = 0; sy < disp.rows; sy++) {
      for (let sx = 0; sx < disp.cols; sx++) {
        const mx = ox + sx, my = oy + sy;
        if (mx < 0 || my < 0 || mx >= w.w || my >= w.h) continue;
        const t = w.tiles[my][mx];
        if (!p.visited[mx + ',' + my]) continue;   // uncharted stays blank parchment
        const px = sx * cell, py = sy * cell;
        // terrain wash — the biome's hue, muted into the map's paper
        ctx.fillStyle = mix(base, t.color, t.glyph === '~' ? 0.4 : 0.22);
        ctx.fillRect(px, py, cell, cell);
        if (t.road && !t.site) drawRoad(ctx, px, py, cell, mix(ink, '#b89360', 0.55));
        else if (!t.site) drawMotif(ctx, px, py, cell, t.glyph, mix(ink, t.color, 0.28), ink2);
        if (t.site) drawPin(ctx, px, py, cell, t.site, base, ink);
      }
    }
    ctx.restore();

    // the Churn front — a hatched band of machine-dust sweeping the map
    if (game.storm && game.storm.active) drawChurn(ctx, disp, game, ox, oy);

    // the hero, dwarfed at the centre
    drawHero(ctx, halfC * cell + cell / 2, halfR * cell + cell / 2, cell, ink, TC('#9a3b2a', 'accent'));
    drawMinimap(game);
  }

  // ---- map drawing primitives -----------------------------------------
  function parseHex(h) {
    if (!h || h[0] !== '#') return [128, 128, 128];
    const n = h.length === 4
      ? parseInt(h[1] + h[1] + h[2] + h[2] + h[3] + h[3], 16) : parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    const A = parseHex(a), B = parseHex(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }

  // a small terrain symbol drawn for a tile glyph
  function drawMotif(ctx, px, py, cell, glyph, col, col2) {
    const cx = px + cell / 2, cy = py + cell / 2, u = cell;
    ctx.lineWidth = Math.max(1, u * 0.055);
    ctx.lineCap = 'round';
    ctx.strokeStyle = col; ctx.fillStyle = col;
    switch (glyph) {
      case '~': // open water
        ctx.strokeStyle = mix(col2, '#3f6173', 0.55);
        wave(ctx, cx, cy - u * 0.12, u * 0.32);
        wave(ctx, cx, cy + u * 0.16, u * 0.32);
        break;
      case '.': // shore
        ctx.strokeStyle = mix(col2, '#3f6173', 0.4);
        wave(ctx, cx, cy + u * 0.06, u * 0.3);
        break;
      case '"': // ironbud plains — little tufts
        ctx.strokeStyle = col;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx + i * u * 0.22, cy + u * 0.12); ctx.lineTo(cx + i * u * 0.22, cy - u * 0.06); ctx.stroke(); }
        break;
      case 'n': // hills — a bump or two
        ctx.beginPath(); ctx.arc(cx - u * 0.13, cy + u * 0.06, u * 0.16, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + u * 0.15, cy + u * 0.1, u * 0.13, Math.PI, 0); ctx.stroke();
        break;
      case '♣': { // stonewood — a tree
        ctx.beginPath(); ctx.moveTo(cx, cy + u * 0.2); ctx.lineTo(cx, cy - u * 0.04); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - u * 0.26); ctx.lineTo(cx - u * 0.16, cy + u * 0.02); ctx.lineTo(cx + u * 0.16, cy + u * 0.02); ctx.closePath(); ctx.fill();
        break;
      }
      case '▲': // mountain
        ctx.beginPath(); ctx.moveTo(cx, cy - u * 0.24); ctx.lineTo(cx - u * 0.26, cy + u * 0.2); ctx.lineTo(cx + u * 0.26, cy + u * 0.2); ctx.closePath();
        ctx.fillStyle = mix(col, '#ffffff', 0.12); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = mix(col, '#ffffff', 0.5); ctx.beginPath(); ctx.moveTo(cx, cy - u * 0.24); ctx.lineTo(cx - u * 0.08, cy - u * 0.02); ctx.stroke();
        break;
      case '=': // sundered plateau — chasm hatch
        ctx.strokeStyle = col2;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx - u * 0.22 + i * u * 0.04, cy - u * 0.12 + i * u * 0.16); ctx.lineTo(cx + u * 0.22 + i * u * 0.04, cy - u * 0.12 + i * u * 0.16); ctx.stroke(); }
        break;
      case 'o': // crater
        ctx.beginPath(); ctx.arc(cx, cy, u * 0.18, 0, Math.PI * 2); ctx.stroke();
        break;
      case '§': // the Churnreach — drifting motes
        ctx.fillStyle = mix(col, '#c0703a', 0.6);
        for (let i = 0; i < 4; i++) dot(ctx, cx + (i % 2 ? 1 : -1) * u * 0.16, cy + (i < 2 ? -1 : 1) * u * 0.13, u * 0.05);
        break;
      case ':': // ashlands
        ctx.fillStyle = col2;
        dot(ctx, cx - u * 0.12, cy + u * 0.04, u * 0.045); dot(ctx, cx + u * 0.1, cy - u * 0.06, u * 0.045); dot(ctx, cx + u * 0.04, cy + u * 0.14, u * 0.04);
        break;
      default:
        dot(ctx, cx, cy, u * 0.05);
    }
  }
  function wave(ctx, cx, cy, half) {
    ctx.beginPath(); ctx.moveTo(cx - half, cy);
    ctx.quadraticCurveTo(cx - half * 0.5, cy - half * 0.5, cx, cy);
    ctx.quadraticCurveTo(cx + half * 0.5, cy + half * 0.5, cx + half, cy); ctx.stroke();
  }
  function dot(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

  function drawRoad(ctx, px, py, cell, col) {
    const cx = px + cell / 2, cy = py + cell / 2;
    ctx.fillStyle = col;
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(cx - cell * 0.34, cy - cell * 0.1, cell * 0.68, cell * 0.2, cell * 0.1); ctx.fill(); }
    else ctx.fillRect(cx - cell * 0.34, cy - cell * 0.1, cell * 0.68, cell * 0.2);
  }

  // a framed map-pin: a light disc with an ink ring and the site's symbol
  function drawPin(ctx, px, py, cell, site, base, ink) {
    const cx = px + cell / 2, cy = py + cell / 2, r = cell * 0.4;
    ctx.save();
    ctx.fillStyle = 'rgba(40,30,18,0.28)';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.7, r * 0.8, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = mix(base, site.color, 0.5);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(1, cell * 0.07); ctx.strokeStyle = ink; ctx.stroke();
    ctx.fillStyle = mix(ink, site.color, 0.65);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = Math.floor(cell * 0.56) + 'px ' + 'Georgia, serif';
    ctx.fillText(site.glyph, cx, cy + 1);
    ctx.restore();
  }

  function drawHero(ctx, cx, cy, cell, ink, accent) {
    const h = cell * 0.86, w = h * 0.46;
    ctx.save();
    // selection ring
    ctx.strokeStyle = accent; ctx.lineWidth = Math.max(1.5, cell * 0.07);
    ctx.beginPath(); ctx.arc(cx, cy, cell * 0.5, 0, Math.PI * 2); ctx.stroke();
    // shadow
    ctx.fillStyle = 'rgba(30,22,12,0.3)';
    ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.36, w * 0.5, h * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    // cloaked body
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy + h * 0.36);
    ctx.quadraticCurveTo(cx - w * 0.56, cy - h * 0.22, cx - h * 0.13, cy - h * 0.36);
    ctx.quadraticCurveTo(cx, cy - h * 0.52, cx + h * 0.13, cy - h * 0.36);
    ctx.quadraticCurveTo(cx + w * 0.56, cy - h * 0.22, cx + w / 2, cy + h * 0.36);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy - h * 0.4, h * 0.12, 0, Math.PI * 2); ctx.fill();
    // anima gem
    ctx.fillStyle = accent; dot(ctx, cx, cy - h * 0.04, cell * 0.06);
    ctx.restore();
  }

  function drawChurn(ctx, disp, game, ox, oy) {
    const cell = disp.cell, sxF = (game.storm.x - ox);
    const xpx = sxF * cell;
    if (xpx < -cell * 2 || xpx > disp.cols * cell + cell * 2) return;
    const H = disp.rows * cell;
    ctx.save();
    // faint wash on the wake (west) side already passed
    ctx.fillStyle = 'rgba(150,70,40,0.08)';
    ctx.fillRect(xpx - cell, 0, cell * 2, H);
    // diagonal hatch front
    ctx.strokeStyle = 'rgba(120,60,35,0.5)'; ctx.lineWidth = Math.max(1, cell * 0.05);
    for (let y = -cell; y < H; y += cell * 0.5) {
      ctx.beginPath(); ctx.moveTo(xpx - cell * 0.5, y); ctx.lineTo(xpx + cell * 0.5, y + cell * 0.8); ctx.stroke();
    }
    // a stronger leading line
    ctx.strokeStyle = TC('#9a3b2a', 'accent'); ctx.lineWidth = Math.max(1.5, cell * 0.08);
    ctx.beginPath(); ctx.moveTo(xpx + cell * 0.1, 0); ctx.lineTo(xpx + cell * 0.1, H); ctx.stroke();
    ctx.restore();
  }

  // ---- dungeon viewport ----
  function drawDungeon(disp, game) {
    const d = game.dungeon.floor;
    const p = game.player;
    const dbg = TB('#04040a'), fbg = TB('#0c0c16');
    disp.clear(dbg);
    const halfC = Math.floor(disp.cols / 2), halfR = Math.floor(disp.rows / 2);
    const ox = p.dx - halfC, oy = p.dy - halfR;
    const seen = game.dungeon.seen;
    for (let sy = 0; sy < disp.rows; sy++) {
      for (let sx = 0; sx < disp.cols; sx++) {
        const mx = ox + sx, my = oy + sy;
        if (mx < 0 || my < 0 || mx >= d.w || my >= d.h) { disp.put(sx, sy, ' ', null, dbg); continue; }
        const vis = seen[my * d.w + mx];
        if (!vis) { disp.put(sx, sy, ' ', null, dbg); continue; }
        const lit = vis === 2;
        const wallc = TC(lit ? '#3a3550' : '#1c1a2a');
        const floorc = TC(lit ? '#5a5440' : '#26241c');
        if (d.grid[my][mx] === TLU.Dungeon.WALL) { disp.put(sx, sy, '#', wallc, TB('#0a0a14')); continue; }
        if (mx === d.down.x && my === d.down.y) { disp.put(sx, sy, '>', lit ? TC('#ffd86b', 'site') : TC('#7a6a30'), fbg); continue; }
        if (mx === d.entrance.x && my === d.entrance.y) { disp.put(sx, sy, '<', lit ? TC('#9adfff', 'site') : TC('#3a5a66'), fbg); continue; }
        const feat = d.features.find(function (f) { return f.x === mx && f.y === my && !f.taken; });
        if (feat) { const fc = TC(featColor(feat), 'site'); disp.put(sx, sy, featGlyph(feat), lit ? fc : dim(fc, 0.5), fbg); continue; }
        if (lit) {
          const e = d.entities.find(function (en) { return en.alive && en.x === mx && en.y === my; });
          if (e) { disp.put(sx, sy, e.glyph, TC(e.color, e.boss ? 'boss' : 'enemy'), TB('#140a0a')); continue; }
        }
        disp.put(sx, sy, '.', floorc, TB('#080810'));
      }
    }
    disp.put(halfC, halfR, '@', TC('#fff36b', 'player'), TB('#1a1a2a'));
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
    ctx.fillStyle = TB('#05060a'); ctx.fillRect(0, 0, W, H);
    if (game.mode !== 'world') {
      ctx.fillStyle = TC('#555'); ctx.font = '10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('(inside ' + (game.dungeon.site ? game.dungeon.site.name.split(' ')[0] : 'ruin') + ')', W / 2, H / 2);
      return;
    }
    const sx = W / w.w, sy = H / w.h;
    for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) {
      if (!game.player.visited[x + ',' + y]) continue;
      const t = w.tiles[y][x];
      ctx.fillStyle = t.site ? TC(t.site.color, 'site') : dim(TC(t.color), 0.8);
      ctx.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy));
    }
    // the Churn front as a vertical band
    if (game.storm && game.storm.active && game.storm.x >= 0 && game.storm.x <= w.w) {
      ctx.fillStyle = (TLU.Theme && TLU.Theme.activeId !== 'storm') ? hexA(TC('#ffffff', 'accent'), 0.5) : 'rgba(150,80,220,0.55)';
      ctx.fillRect(Math.round(game.storm.x * sx) - 1, 0, Math.max(2, Math.ceil(sx * 2)), H);
    }
    ctx.fillStyle = TC('#fff36b', 'player');
    ctx.fillRect(game.player.wx * sx - 1, game.player.wy * sy - 1, 3, 3);
  }

  // hex -> rgba string at alpha a
  function hexA(hex, a) {
    if (!hex || hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
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
