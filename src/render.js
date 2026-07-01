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

  // ---- overworld viewport — a hand-drawn world map, in three styles ----
  const MAP_STYLES = ['realm', 'chart', 'vellum', 'survey'];
  const MAP_STYLE_NAMES = { realm: 'Hand-Drawn Realm', chart: 'Field Chart', vellum: 'Old Vellum', survey: 'Survey Map' };
  // key is versioned: the Hand-Drawn Realm is the new definitive overworld, so any style
  // pinned under the old key is ignored and every player lands on 'realm' by default.
  const MAP_STYLE_KEY = 'tlu_mapstyle_v2';
  let MAP_STYLE = (function () { try { return localStorage.getItem(MAP_STYLE_KEY) || 'realm'; } catch (e) { return 'realm'; } })();
  if (MAP_STYLES.indexOf(MAP_STYLE) < 0) MAP_STYLE = 'realm';
  function setMapStyle(s) { if (MAP_STYLES.indexOf(s) < 0) s = 'realm'; MAP_STYLE = s; try { localStorage.setItem(MAP_STYLE_KEY, s); } catch (e) {} }
  function cycleMapStyle() { setMapStyle(MAP_STYLES[(MAP_STYLES.indexOf(MAP_STYLE) + 1) % MAP_STYLES.length]); return MAP_STYLE; }

  // a charted, in-bounds tile or null
  function vtile(env, mx, my) {
    if (mx < 0 || my < 0 || mx >= env.w.w || my >= env.w.h) return null;
    if (!env.p.visited[mx + ',' + my]) return null;
    return env.w.tiles[my][mx];
  }
  // raw (possibly-uncharted) tile, for neighbour terrain tests like coastlines
  function rtile(env, mx, my) {
    if (mx < 0 || my < 0 || mx >= env.w.w || my >= env.w.h) return null;
    return env.w.tiles[my][mx];
  }
  function isWater(t) { return !!t && (t.glyph === '~' || t.glyph === '.'); }
  // coarse elevation rank from terrain glyph (for contours & relief)
  function elev(t) {
    if (!t) return -1;
    switch (t.glyph) {
      case '~': return 0; case '.': return 1;
      case 'n': return 3; case '=': return 4; case '▲': return 5;
      default: return 2;
    }
  }

  function drawWorld(disp, game) {
    const w = game.world, p = game.player, ctx = disp.ctx, cell = disp.cell;
    const base = (TLU.Theme && TLU.Theme.active().mapBg) || '#0e0b16';
    const ink = TC('#2a2620'), ink2 = TC('#6f6650');
    disp.clear(base);
    const halfC = Math.floor(disp.cols / 2), halfR = Math.floor(disp.rows / 2);
    const ox = p.wx - halfC, oy = p.wy - halfR;
    const env = { w: w, p: p, game: game, ctx: ctx, cell: cell, base: base, ink: ink, ink2: ink2, ox: ox, oy: oy, cols: disp.cols, rows: disp.rows };

    if (MAP_STYLE === 'vellum') drawVellum(env);
    else if (MAP_STYLE === 'survey') drawSurvey(env);
    else if (MAP_STYLE === 'chart') drawChart(env);
    else drawRealm(env);

    if (game.storm && game.storm.active) drawChurn(ctx, disp, game, ox, oy);
    drawHero(ctx, halfC * cell + cell / 2, halfR * cell + cell / 2, cell, ink, TC('#9a3b2a', 'accent'));
    drawMinimap(game);
  }

  // a small seeded wobble for hand-drawn edges (deterministic per tile)
  function wob(mx, my, k) { return Math.sin((mx * 12.9898 + my * 78.233 + k) * 1.0) * 1.4; }

  // an ink coastline along the land/water borders of a charted land tile
  function drawCoast(env, mx, my, px, py, col, lw) {
    const ctx = env.ctx, cell = env.cell;
    ctx.strokeStyle = col; ctx.lineWidth = lw || Math.max(1.2, cell * 0.07); ctx.lineCap = 'round';
    const nbrs = [[0, -1, 'top'], [0, 1, 'bot'], [-1, 0, 'left'], [1, 0, 'right']];
    for (let i = 0; i < nbrs.length; i++) {
      const d = nbrs[i]; if (!isWater(rtile(env, mx + d[0], my + d[1]))) continue;
      ctx.beginPath();
      const j = wob(mx, my, i);
      if (d[2] === 'top') { ctx.moveTo(px, py + 1); ctx.quadraticCurveTo(px + cell / 2, py + 1 + j, px + cell, py + 1); }
      else if (d[2] === 'bot') { ctx.moveTo(px, py + cell - 1); ctx.quadraticCurveTo(px + cell / 2, py + cell - 1 + j, px + cell, py + cell - 1); }
      else if (d[2] === 'left') { ctx.moveTo(px + 1, py); ctx.quadraticCurveTo(px + 1 + j, py + cell / 2, px + 1, py + cell); }
      else { ctx.moveTo(px + cell - 1, py); ctx.quadraticCurveTo(px + cell - 1 + j, py + cell / 2, px + cell - 1, py + cell); }
      ctx.stroke();
    }
  }

  // ===== STYLE 1: Field Chart — the inked working map (refined) =====
  function drawChart(env) {
    const { ctx, cell, base, ink, ink2 } = env;
    ctx.save();
    for (let sy = 0; sy < env.rows; sy++) for (let sx = 0; sx < env.cols; sx++) {
      const mx = env.ox + sx, my = env.oy + sy, t = vtile(env, mx, my); if (!t) continue;
      const px = sx * cell, py = sy * cell;
      ctx.fillStyle = mix(base, t.color, t.glyph === '~' ? 0.4 : 0.22);
      ctx.fillRect(px, py, cell, cell);
      if (t.road && !t.site) drawRoad(ctx, px, py, cell, mix(ink, '#b89360', 0.55));
      else if (!t.site) drawMotif(ctx, px, py, cell, t.glyph, mix(ink, t.color, 0.28), ink2);
      if (!isWater(t)) drawCoast(env, mx, my, px, py, ink);
    }
    // pins on top
    for (let sy = 0; sy < env.rows; sy++) for (let sx = 0; sx < env.cols; sx++) {
      const t = vtile(env, env.ox + sx, env.oy + sy); if (t && t.site) drawPin(ctx, sx * cell, sy * cell, cell, t.site, base, ink);
    }
    ctx.restore();
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

  // ===== STYLE 2: Old Vellum — antique copperplate cartography =====
  function drawVellum(env) {
    const { ctx, cell, base, ink, ink2 } = env;
    const seaInk = mix(ink, '#3f5a70', 0.55);
    ctx.save(); ctx.lineCap = 'round';
    // pass 1 — fills: pale sea, sepia-vellum land
    for (let sy = 0; sy < env.rows; sy++) for (let sx = 0; sx < env.cols; sx++) {
      const t = vtile(env, env.ox + sx, env.oy + sy); if (!t) continue;
      const px = sx * cell, py = sy * cell;
      ctx.fillStyle = isWater(t) ? mix(base, '#9fb0ac', 0.26) : mix(base, mix(t.color, '#c9b487', 0.6), 0.24);
      ctx.fillRect(px, py, cell, cell);
    }
    // pass 2 — engraved sea: horizontal hatch + coastline halo lines
    ctx.strokeStyle = mix(seaInk, base, 0.35); ctx.lineWidth = Math.max(0.7, cell * 0.035);
    for (let sy = 0; sy < env.rows; sy++) for (let sx = 0; sx < env.cols; sx++) {
      const mx = env.ox + sx, my = env.oy + sy, t = vtile(env, mx, my); if (!isWater(t)) continue;
      const px = sx * cell, py = sy * cell;
      for (let k = 0; k < 2; k++) { const yy = py + cell * (0.32 + k * 0.36); ctx.beginPath(); ctx.moveTo(px, yy); ctx.quadraticCurveTo(px + cell / 2, yy + wob(mx, my, k) * 0.5, px + cell, yy); ctx.stroke(); }
      // halo: a denser line hugging any land edge
      const nbrs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (let i = 0; i < 4; i++) { const nb = rtile(env, mx + nbrs[i][0], my + nbrs[i][1]); if (!nb || isWater(nb)) continue;
        ctx.beginPath();
        if (nbrs[i][1]) { const yy = py + (nbrs[i][1] < 0 ? cell * 0.16 : cell * 0.84); ctx.moveTo(px + 2, yy); ctx.lineTo(px + cell - 2, yy); }
        else { const xx = px + (nbrs[i][0] < 0 ? cell * 0.16 : cell * 0.84); ctx.moveTo(xx, py + 2); ctx.lineTo(xx, py + cell - 2); }
        ctx.stroke();
      }
    }
    // pass 3 — relief & forests on land
    for (let sy = 0; sy < env.rows; sy++) for (let sx = 0; sx < env.cols; sx++) {
      const mx = env.ox + sx, my = env.oy + sy, t = vtile(env, mx, my); if (!t || isWater(t)) continue;
      const px = sx * cell, py = sy * cell;
      if (t.road && !t.site) drawRoad(ctx, px, py, cell, mix(ink, '#9a7a48', 0.5));
      else if (!t.site) vellumRelief(ctx, px, py, cell, t.glyph, ink2, ink);
    }
    ctx.restore();
    // pass 4 — banner pins
    for (let sy = 0; sy < env.rows; sy++) for (let sx = 0; sx < env.cols; sx++) {
      const t = vtile(env, env.ox + sx, env.oy + sy); if (t && t.site) vellumPin(ctx, sx * cell, sy * cell, cell, t.site, ink);
    }
    compassRose(ctx, cell * 1.5, cell * 1.5, cell * 1.05, ink, mix(ink, '#9a3b2a', 0.7));
  }

  function vellumRelief(ctx, px, py, cell, glyph, col, ink) {
    const cx = px + cell / 2, cy = py + cell / 2, u = cell;
    ctx.lineWidth = Math.max(1, u * 0.05); ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.fillStyle = col;
    if (glyph === '▲' || glyph === 'n') {
      const s = glyph === '▲' ? 0.3 : 0.18, y0 = cy + u * 0.18;
      ctx.beginPath(); ctx.moveTo(cx - u * s, y0); ctx.lineTo(cx, cy - u * s); ctx.lineTo(cx + u * s, y0); ctx.closePath();
      ctx.fillStyle = mix(col, '#ffffff', glyph === '▲' ? 0.1 : 0.25); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = Math.max(0.8, u * 0.04); ctx.stroke();
      // hachure ticks down one flank
      ctx.strokeStyle = col; for (let k = 1; k <= 3; k++) { const tt = k / 4; ctx.beginPath(); ctx.moveTo(cx + u * s * tt, y0 - u * s * 2 * tt * 0.5); ctx.lineTo(cx + u * s * tt + u * 0.06, y0 - u * s * 2 * tt * 0.5 + u * 0.06); ctx.stroke(); }
    } else if (glyph === '♣') {
      for (let i = 0; i < 3; i++) { const tx = cx + (i - 1) * u * 0.2, ty = cy + (i % 2 ? -1 : 1) * u * 0.06;
        ctx.fillStyle = mix(col, '#3f6a3a', 0.4); ctx.beginPath(); ctx.arc(tx, ty - u * 0.05, u * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = ink; ctx.lineWidth = Math.max(0.7, u * 0.03); ctx.beginPath(); ctx.moveTo(tx, ty + u * 0.06); ctx.lineTo(tx, ty - u * 0.02); ctx.stroke(); }
    } else if (glyph === 'o') { ctx.beginPath(); ctx.arc(cx, cy, u * 0.16, 0, Math.PI * 2); ctx.stroke(); }
    else if (glyph === '=') { for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx - u * 0.2, cy + i * u * 0.12); ctx.lineTo(cx + u * 0.2, cy + i * u * 0.12); ctx.stroke(); } }
    else if (glyph === '§') { ctx.fillStyle = mix(col, '#c0703a', 0.6); for (let i = 0; i < 3; i++) dot(ctx, cx + (i - 1) * u * 0.16, cy + (i % 2 ? 1 : -1) * u * 0.1, u * 0.045); }
    else { ctx.fillStyle = mix(col, '#000', 0.1); dot(ctx, cx - u * 0.1, cy, u * 0.035); dot(ctx, cx + u * 0.12, cy + u * 0.05, u * 0.03); }
  }

  function vellumPin(ctx, px, py, cell, site, ink) {
    const cx = px + cell / 2, cy = py + cell / 2, u = cell;
    ctx.save(); ctx.lineWidth = Math.max(1, u * 0.06); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const col = site.color;
    if (site.type === 'town') { // a banner
      ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(cx - u * 0.02, cy + u * 0.28); ctx.lineTo(cx - u * 0.02, cy - u * 0.3); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx, cy - u * 0.3); ctx.lineTo(cx + u * 0.26, cy - u * 0.2); ctx.lineTo(cx, cy - u * 0.1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = Math.max(0.8, u * 0.035); ctx.stroke();
      ctx.fillStyle = ink; dot(ctx, cx - u * 0.02, cy + u * 0.28, u * 0.04);
    } else { // a star-marker for vaults/camps/ruins/landmarks
      star(ctx, cx, cy, u * 0.22, u * 0.09, site.type === 'lair' || site.type === 'ruin' ? 5 : 4, mix('#000000', col, 0.85), ink, Math.max(0.8, u * 0.04));
    }
    ctx.restore();
  }

  function star(ctx, cx, cy, rO, rI, points, fill, stroke, lw) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) { const r = i % 2 ? rI : rO, a = (Math.PI * i / points) - Math.PI / 2; ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }

  function compassRose(ctx, cx, cy, r, ink, accent) {
    ctx.save(); ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.fillStyle = 'rgba(245,236,217,0.35)'; ctx.beginPath(); ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    // cardinal long points + diagonal short points
    for (let i = 0; i < 8; i++) {
      const a = Math.PI * i / 4 - Math.PI / 2, long = i % 2 === 0, rr = long ? r : r * 0.55;
      ctx.fillStyle = (i === 0) ? accent : mix(ink, '#ffffff', long ? 0.0 : 0.4);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      ctx.lineTo(cx + Math.cos(a + 0.28) * r * 0.18, cy + Math.sin(a + 0.28) * r * 0.18);
      ctx.lineTo(cx + Math.cos(a - 0.28) * r * 0.18, cy + Math.sin(a - 0.28) * r * 0.18);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = accent; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.floor(r * 0.5) + 'px Georgia, serif';
    ctx.fillText('N', cx, cy - r * 1.4);
    ctx.restore();
  }

  // ===== STYLE 3: Survey Map — topographic contours & graticule =====
  function drawSurvey(env) {
    const { ctx, cell, base, ink, ink2 } = env;
    ctx.save(); ctx.lineCap = 'round';
    // elevation tint (hillshade-ish stepped bands)
    for (let sy = 0; sy < env.rows; sy++) for (let sx = 0; sx < env.cols; sx++) {
      const t = vtile(env, env.ox + sx, env.oy + sy); if (!t) continue;
      const e = elev(t), px = sx * cell, py = sy * cell;
      ctx.fillStyle = e <= 0 ? mix(base, '#8ea6ac', 0.16) : mix(base, '#7a6238', 0.03 + e * 0.035);
      ctx.fillRect(px, py, cell, cell);
    }
    // graticule — a faint survey grid every 5 world tiles
    ctx.strokeStyle = mix(ink2, base, 0.55); ctx.lineWidth = Math.max(0.5, cell * 0.02);
    for (let sx = 0; sx < env.cols; sx++) { const mx = env.ox + sx; if (((mx % 5) + 5) % 5 === 0) { ctx.beginPath(); ctx.moveTo(sx * cell, 0); ctx.lineTo(sx * cell, env.rows * cell); ctx.stroke(); } }
    for (let sy = 0; sy < env.rows; sy++) { const my = env.oy + sy; if (((my % 5) + 5) % 5 === 0) { ctx.beginPath(); ctx.moveTo(0, sy * cell); ctx.lineTo(env.cols * cell, sy * cell); ctx.stroke(); } }
    // contour lines between elevation bands
    for (let sy = 0; sy < env.rows; sy++) for (let sx = 0; sx < env.cols; sx++) {
      const mx = env.ox + sx, my = env.oy + sy, t = vtile(env, mx, my); if (!t) continue;
      const e = elev(t), px = sx * cell, py = sy * cell;
      const tr = vtile(env, mx + 1, my), td = vtile(env, mx, my + 1);
      if (tr && elev(tr) !== e) { const hi = Math.max(e, elev(tr)); ctx.strokeStyle = mix(ink, base, hi <= 1 ? 0.25 : 0.05); ctx.lineWidth = Math.max(0.7, cell * (hi % 2 ? 0.045 : 0.07)); ctx.beginPath(); ctx.moveTo(px + cell, py); ctx.lineTo(px + cell, py + cell); ctx.stroke(); }
      if (td && elev(td) !== e) { const hi2 = Math.max(e, elev(td)); ctx.strokeStyle = mix(ink, base, hi2 <= 1 ? 0.25 : 0.05); ctx.lineWidth = Math.max(0.7, cell * (hi2 % 2 ? 0.045 : 0.07)); ctx.beginPath(); ctx.moveTo(px, py + cell); ctx.lineTo(px + cell, py + cell); ctx.stroke(); }
      // spot height at peaks
      if (t.glyph === '▲') { ctx.fillStyle = ink; dot(ctx, px + cell / 2, py + cell / 2, cell * 0.05); }
    }
    ctx.restore();
    // survey markers + grid refs for sites
    for (let sy = 0; sy < env.rows; sy++) for (let sx = 0; sx < env.cols; sx++) {
      const t = vtile(env, env.ox + sx, env.oy + sy); if (t && t.site) surveyMarker(ctx, sx * cell, sy * cell, cell, t.site, ink, base);
      else if (t && t.road && !t.site) drawRoad(ctx, sx * cell, sy * cell, cell, mix(ink, base, 0.3));
    }
  }

  function surveyMarker(ctx, px, py, cell, site, ink, base) {
    const cx = px + cell / 2, cy = py + cell / 2, u = cell, col = site.color;
    ctx.save(); ctx.lineWidth = Math.max(1, u * 0.06); ctx.strokeStyle = ink; ctx.fillStyle = mix(base, col, 0.55);
    if (site.type === 'town') { ctx.beginPath(); ctx.rect(cx - u * 0.18, cy - u * 0.18, u * 0.36, u * 0.36); ctx.fill(); ctx.stroke(); ctx.fillStyle = ink; dot(ctx, cx, cy, u * 0.05); }
    else if (site.type === 'vault') { ctx.beginPath(); ctx.moveTo(cx, cy - u * 0.2); ctx.lineTo(cx + u * 0.2, cy + u * 0.16); ctx.lineTo(cx - u * 0.2, cy + u * 0.16); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (site.type === 'ruin' || site.type === 'lair') { ctx.beginPath(); ctx.arc(cx, cy, u * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - u * 0.12, cy - u * 0.12); ctx.lineTo(cx + u * 0.12, cy + u * 0.12); ctx.moveTo(cx + u * 0.12, cy - u * 0.12); ctx.lineTo(cx - u * 0.12, cy + u * 0.12); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(cx, cy, u * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = ink; dot(ctx, cx, cy, u * 0.04); }
    ctx.restore();
  }

  // ===== STYLE 0 (default): Hand-Drawn Realm — organic polygon map =====
  // A jittered shared-corner mesh turns each tile into an irregular polygon.
  // Edges are drawn ONLY at biome boundaries, so same-terrain cells merge
  // into organic regions; coastlines become wobbly hand-inked curves.
  function corner(env, cx, cy) {
    const w = env.w;
    if (!w._cj) w._cj = Object.create(null);
    const key = (cx + 2048) * 100000 + (cy + 2048);
    let c = w._cj[key]; if (c) return c;
    const h = (TLU.hashSeed ? TLU.hashSeed(cx + '_' + cy + '_' + (env.game && env.game.seed)) : (((cx * 73856093) ^ (cy * 19349663)) >>> 0));
    const ang = (h & 4095) / 4095 * Math.PI * 2;
    const mag = 0.17 + ((h >>> 12) & 255) / 255 * 0.27;   // 0.17 .. 0.44 tile
    c = { x: cx + Math.cos(ang) * mag, y: cy + Math.sin(ang) * mag };
    w._cj[key] = c; return c;
  }
  function cpx(env, c) { return [(c.x - env.ox) * env.cell, (c.y - env.oy) * env.cell]; }
  function bgroup(t) {
    if (!t) return 'none';
    switch (t.glyph) {
      case '~': case '.': return 'sea';
      case '▲': return 'mtn'; case 'n': return 'hill'; case '♣': return 'forest';
      case '=': return 'plateau'; case 'o': return 'crater'; case '§': return 'churn'; case ':': return 'desert';
      default: return 'plain';
    }
  }
  function drawEdge(env, a, b, col, lw) {
    const ctx = env.ctx, A = cpx(env, a), B = cpx(env, b);
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1];
    const len = Math.hypot(dx, dy) || 1, bow = ((((a.x * 53 + a.y * 131) % 1) + 1) % 1 - 0.5) * env.cell * 0.28;
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(A[0], A[1]);
    ctx.quadraticCurveTo(mx + (-dy / len) * bow, my + (dx / len) * bow, B[0], B[1]); ctx.stroke();
  }

  // coarse mesh: bigger, looser polygons (each cell = a 2×2 block of tiles)
  const MSTEP = 2;
  function ccorner(env, I, J) {
    const w = env.w; if (!w._cc) w._cc = Object.create(null);
    const key = (I + 2048) * 100000 + (J + 2048); let c = w._cc[key]; if (c) return c;
    const h = (TLU.hashSeed ? TLU.hashSeed(I + '_' + J + '_cc_' + (env.game && env.game.seed)) : (((I * 73856093) ^ (J * 19349663)) >>> 0));
    const ang = (h & 4095) / 4095 * Math.PI * 2, mag = (0.3 + ((h >>> 12) & 255) / 255 * 0.55) * MSTEP; // up to ~0.85 cell
    c = { x: I * MSTEP + Math.cos(ang) * mag, y: J * MSTEP + Math.sin(ang) * mag }; w._cc[key] = c; return c;
  }
  // a coarse cell's representative (biome) tile + whether any of it is charted
  function coarseCell(env, I, J) {
    const w = env.w, bx = I * MSTEP, by = J * MSTEP; let seen = false, raw = null, rep = null;
    for (let dy = 0; dy < MSTEP; dy++) for (let dx = 0; dx < MSTEP; dx++) {
      const x = bx + dx, y = by + dy; if (x < 0 || y < 0 || x >= w.w || y >= w.h) continue;
      const t = w.tiles[y][x]; if (!raw) raw = t;
      if (env.p.visited[x + ',' + y]) { seen = true; if (!rep) rep = t; }
    }
    return { rep: rep || raw, seen: seen, bx: bx, by: by };
  }
  function hash01(a, b, s) { return (TLU.hashSeed ? (TLU.hashSeed(a + '_' + b + '_' + s) & 0xffff) / 0xffff : 0.5); }

  // trace rivers once per world: from the highlands, descend the distance-to-sea
  // field to the coast (coarse elevation alone has no gradient across flats).
  function ensureRivers(env) {
    const w = env.w; if (w._rivers) return w._rivers;
    const seed = (env.game && env.game.seed) || 'x', W = w.w, H = w.h;
    // multi-source BFS: distance (in tiles) from the nearest sea
    const dsea = new Array(W * H).fill(-1), q = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isWater(w.tiles[y][x])) { dsea[y * W + x] = 0; q.push(x, y); }
    const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let h = 0; h < q.length; h += 2) { const x = q[h], y = q[h + 1], dv = dsea[y * W + x];
      for (let k = 0; k < 4; k++) { const nx = x + N4[k][0], ny = y + N4[k][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const ni = ny * W + nx; if (dsea[ni] < 0) { dsea[ni] = dv + 1; q.push(nx, ny); } } }
    const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    const rivers = []; let count = 0;
    for (let y = 0; y < H && count < 8; y++) for (let x = 0; x < W && count < 8; x++) {
      if (elev(w.tiles[y][x]) < 4) continue;                 // sources: plateau/mountain
      if ((dsea[y * W + x]) < 6) continue;                   // far enough inland to matter
      if (hash01(x, y, seed + 'src') > 0.16) continue;       // and sparse
      const path = [[x, y]]; let cx = x, cy = y, reached = false;
      for (let step = 0; step < 400; step++) {
        const cur = dsea[cy * W + cx]; if (cur <= 1) { reached = true; break; }
        let bX = cx, bY = cy, bD = 1e9, bS = 1e9;
        for (let k = 0; k < 8; k++) { const nx = cx + N8[k][0], ny = cy + N8[k][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const nd = dsea[ny * W + nx]; if (nd < 0) continue;
          const s = elev(w.tiles[ny][nx]) + hash01(nx, ny, seed + 'e') * 0.9;   // tie-break: prefer lower & noisy
          if (nd < bD || (nd === bD && s < bS)) { bD = nd; bS = s; bX = nx; bY = ny; }
        }
        if (bD >= cur) break; cx = bX; cy = bY; path.push([cx, cy]);
      }
      if (reached && path.length >= 5) { rivers.push(path); count++; }
    }
    w._rivers = rivers; return rivers;
  }

  // a small-caps serif place label with a paper halo, for legibility on the map
  function drawMapLabel(ctx, x, y, text, ink, base, size, italic, col) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = (italic ? 'italic ' : '') + 'small-caps ' + (size || 12) + 'px Georgia, serif';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2.5, size * 0.28); ctx.strokeStyle = mix(base, '#ffffff', 0.35);
    ctx.strokeText(text, x, y); ctx.fillStyle = col || ink; ctx.fillText(text, x, y);
    ctx.restore();
  }

  // hand-drawn terrain icon (mountains, hills, woods, craters, mesas, dunes)
  function realmIcon(ctx, cx, cy, u, glyph, col, ink, base) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (glyph === '▲') {
      const peak = function (dx, hh) {
        ctx.beginPath(); ctx.moveTo(cx + dx - u * 0.16, cy + u * 0.16); ctx.lineTo(cx + dx, cy + u * 0.16 - hh); ctx.lineTo(cx + dx + u * 0.16, cy + u * 0.16); ctx.closePath();
        ctx.fillStyle = mix(col, base, 0.12); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = Math.max(0.8, u * 0.045); ctx.stroke();
        ctx.fillStyle = mix('#ffffff', col, 0.25); ctx.beginPath(); ctx.moveTo(cx + dx, cy + u * 0.16 - hh); ctx.lineTo(cx + dx - u * 0.05, cy + u * 0.16 - hh + u * 0.09); ctx.lineTo(cx + dx + u * 0.05, cy + u * 0.16 - hh + u * 0.09); ctx.closePath(); ctx.fill();
      };
      peak(-u * 0.14, u * 0.34); peak(u * 0.16, u * 0.46);
    } else if (glyph === 'n') {
      ctx.fillStyle = mix(col, base, 0.25); ctx.strokeStyle = ink; ctx.lineWidth = Math.max(0.7, u * 0.035);
      ctx.beginPath(); ctx.moveTo(cx - u * 0.24, cy + u * 0.1); ctx.quadraticCurveTo(cx - u * 0.08, cy - u * 0.14, cx + u * 0.06, cy + u * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - u * 0.02, cy + u * 0.12); ctx.quadraticCurveTo(cx + u * 0.14, cy - u * 0.08, cx + u * 0.26, cy + u * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (glyph === '♣') {
      for (let i = 0; i < 3; i++) { const tx = cx + (i - 1) * u * 0.22, ty = cy + (i % 2 ? u * 0.05 : -u * 0.03);
        ctx.strokeStyle = ink; ctx.lineWidth = Math.max(0.7, u * 0.035); ctx.beginPath(); ctx.moveTo(tx, ty + u * 0.14); ctx.lineTo(tx, ty + u * 0.02); ctx.stroke();
        ctx.fillStyle = mix(col, '#3f6a3a', 0.5); ctx.beginPath(); ctx.arc(tx, ty - u * 0.05, u * 0.11, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = ink; ctx.stroke(); }
    } else if (glyph === 'o') { // a shaded impact crater — a bowl, not a ring
      ctx.fillStyle = mix(col, '#2a2016', 0.32); ctx.beginPath(); ctx.ellipse(cx, cy, u * 0.2, u * 0.13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = Math.max(1, u * 0.05);
      ctx.strokeStyle = mix(col, '#000000', 0.5); ctx.beginPath(); ctx.ellipse(cx, cy, u * 0.2, u * 0.13, 0, 0.2, Math.PI - 0.2); ctx.stroke();          // lower rim shadow
      ctx.strokeStyle = mix(col, '#ffffff', 0.45); ctx.beginPath(); ctx.ellipse(cx, cy, u * 0.2, u * 0.13, 0, Math.PI + 0.2, Math.PI * 2 - 0.2); ctx.stroke(); // upper rim light
    } else if (glyph === '=') { // a mesa / chasm plateau
      ctx.fillStyle = mix(col, base, 0.15); ctx.strokeStyle = ink; ctx.lineWidth = Math.max(0.7, u * 0.035);
      ctx.beginPath(); ctx.moveTo(cx - u * 0.22, cy + u * 0.14); ctx.lineTo(cx - u * 0.14, cy - u * 0.1); ctx.lineTo(cx + u * 0.14, cy - u * 0.1); ctx.lineTo(cx + u * 0.22, cy + u * 0.14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = mix(col, '#000000', 0.35); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - u * 0.16 + i * u * 0.12, cy - u * 0.06); ctx.lineTo(cx - u * 0.13 + i * u * 0.12, cy + u * 0.12); ctx.stroke(); }
    } else if (glyph === ':') { // dunes
      ctx.strokeStyle = mix(col, '#000000', 0.25); ctx.lineWidth = Math.max(0.8, u * 0.04);
      ctx.beginPath(); ctx.moveTo(cx - u * 0.24, cy + u * 0.06); ctx.quadraticCurveTo(cx - u * 0.06, cy - u * 0.06, cx + u * 0.1, cy + u * 0.06); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - u * 0.06, cy + u * 0.14); ctx.quadraticCurveTo(cx + u * 0.12, cy + u * 0.02, cx + u * 0.26, cy + u * 0.14); ctx.stroke();
    } else if (glyph === '§') { ctx.fillStyle = mix(col, '#c0703a', 0.6); for (let i = 0; i < 3; i++) dot(ctx, cx + (i - 1) * u * 0.16, cy + (i % 2 ? u * 0.1 : -u * 0.1), u * 0.045); }
  }

  function drawRealm(env) {
    const { ctx, cell, base, ink, ink2 } = env;
    const seed = (env.game && env.game.seed) || 'x';
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const I0 = Math.floor(env.ox / MSTEP) - 1, I1 = Math.floor((env.ox + env.cols) / MSTEP) + 1;
    const J0 = Math.floor(env.oy / MSTEP) - 1, J1 = Math.floor((env.oy + env.rows) / MSTEP) + 1;

    // PASS 1 — coarse polygon fills, each region's wash nudged for life
    for (let I = I0; I <= I1; I++) for (let J = J0; J <= J1; J++) {
      const cc = coarseCell(env, I, J); if (!cc.seen) continue;
      const A = cpx(env, ccorner(env, I, J)), B = cpx(env, ccorner(env, I + 1, J)), C = cpx(env, ccorner(env, I + 1, J + 1)), D = cpx(env, ccorner(env, I, J + 1));
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.lineTo(D[0], D[1]); ctx.closePath();
      const v = (hash01(I, J, seed + 'w') - 0.5) * 0.06;
      ctx.fillStyle = isWater(cc.rep) ? mix(base, '#9fb6bd', 0.32 + v) : mix(base, cc.rep.color, (cc.rep.glyph === '§' ? 0.3 : 0.24) + v);
      ctx.fill();
    }

    // PASS 2 — boundary edges: bold wobbly coast, faint biome borders
    const coastCol = ink, borderCol = mix(ink, base, 0.5);
    for (let I = I0; I <= I1; I++) for (let J = J0; J <= J1; J++) {
      const cc = coarseCell(env, I, J), cE = coarseCell(env, I + 1, J), cD = coarseCell(env, I, J + 1);
      const gs = isWater(cc.rep), gE = isWater(cE.rep), gD = isWater(cD.rep);
      if (cc.seen || cE.seen) {
        if (gs !== gE) drawEdge(env, ccorner(env, I + 1, J), ccorner(env, I + 1, J + 1), coastCol, Math.max(1.4, cell * 0.08));
        else if (cc.seen && cE.seen && !gs && bgroup(cc.rep) !== bgroup(cE.rep)) drawEdge(env, ccorner(env, I + 1, J), ccorner(env, I + 1, J + 1), borderCol, Math.max(0.7, cell * 0.03));
      }
      if (cc.seen || cD.seen) {
        if (gs !== gD) drawEdge(env, ccorner(env, I, J + 1), ccorner(env, I + 1, J + 1), coastCol, Math.max(1.4, cell * 0.08));
        else if (cc.seen && cD.seen && !gs && bgroup(cc.rep) !== bgroup(cD.rep)) drawEdge(env, ccorner(env, I, J + 1), ccorner(env, I + 1, J + 1), borderCol, Math.max(0.7, cell * 0.03));
      }
    }

    // PASS 3 — rivers, from the highlands to the sea
    const rivers = ensureRivers(env), rivCol = mix(ink, '#3f6173', 0.55);
    for (let r = 0; r < rivers.length; r++) {
      const path = rivers[r]; let seg = [];
      const flush = function () {
        for (let i = 1; i < seg.length; i++) { const a = seg[i - 1], b = seg[i];
          ctx.strokeStyle = rivCol; ctx.lineWidth = Math.max(1.2, cell * (0.06 + b[2] * 0.16));
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
        seg = [];
      };
      for (let i = 0; i < path.length; i++) { const x = path[i][0], y = path[i][1];
        if (env.p.visited[x + ',' + y]) { const jx = (hash01(x, y, 'rx') - 0.5) * 0.36, jy = (hash01(x, y, 'ry') - 0.5) * 0.36; seg.push([(x + 0.5 + jx - env.ox) * cell, (y + 0.5 + jy - env.oy) * cell, i / path.length]); }
        else flush();
      }
      flush();
    }

    // PASS 4 — terrain icons, a few hand-placed per region (not per tile)
    const ICON_N = { mtn: 2, forest: 2, hill: 1, crater: 1, plateau: 1, desert: 1, churn: 1 };
    for (let I = I0; I <= I1; I++) for (let J = J0; J <= J1; J++) {
      const cc = coarseCell(env, I, J); if (!cc.seen || isWater(cc.rep) || cc.rep.glyph === '"') continue;
      const g = bgroup(cc.rep), n = ICON_N[g] || 0;
      for (let k = 0; k < n; k++) {
        const jx = hash01(I * 5 + k, J, seed + 'ix') * 1.7 - 0.85, jy = hash01(I, J * 5 + k, seed + 'iy') * 1.7 - 0.85;
        const wx = cc.bx + MSTEP / 2 + jx, wy = cc.by + MSTEP / 2 + jy;
        realmIcon(ctx, (wx - env.ox) * cell, (wy - env.oy) * cell, cell * 1.15, cc.rep.glyph, mix(ink, cc.rep.color, 0.35), ink, base);
      }
    }

    // PASS 5 — roads: an organic dashed trail between cell centres
    ctx.strokeStyle = mix(ink, '#9a7a48', 0.5); ctx.lineWidth = Math.max(1.4, cell * 0.1); ctx.setLineDash([cell * 0.34, cell * 0.26]);
    for (let sy = 0; sy < env.rows; sy++) for (let sx = 0; sx < env.cols; sx++) {
      const mx = env.ox + sx, my = env.oy + sy, t = vtile(env, mx, my); if (!t || !t.road || t.site) continue;
      const ct = corner(env, mx, my), Cp = cpx(env, { x: ct.x + 0.5, y: ct.y + 0.5 });
      for (const d of [[1, 0], [0, 1]]) { const nb = vtile(env, mx + d[0], my + d[1]); if (nb && nb.road) { const cn2 = corner(env, mx + d[0], my + d[1]), N = cpx(env, { x: cn2.x + 0.5, y: cn2.y + 0.5 }); ctx.beginPath(); ctx.moveTo(Cp[0], Cp[1]); ctx.lineTo(N[0], N[1]); ctx.stroke(); } }
    }
    ctx.setLineDash([]);

    // PASS 6 — sea label at the charted-water centroid
    let swx = 0, swy = 0, swn = 0;
    for (let sy = 0; sy < env.rows; sy++) for (let sx = 0; sx < env.cols; sx++) { const t = vtile(env, env.ox + sx, env.oy + sy); if (isWater(t)) { swx += sx; swy += sy; swn++; } }
    if (swn > 24) drawMapLabel(ctx, (swx / swn) * cell + cell / 2, (swy / swn) * cell + cell / 2, 'The Eastern Sea', ink, base, Math.max(12, cell * 0.7), true, mix(ink, '#3f6173', 0.6));

    // PASS 7 — pins + place labels
    for (let sy = 0; sy < env.rows; sy++) for (let sx = 0; sx < env.cols; sx++) {
      const mx = env.ox + sx, my = env.oy + sy, t = vtile(env, mx, my); if (!t || !t.site) continue;
      const ct = corner(env, mx, my), cen = cpx(env, { x: ct.x + 0.5, y: ct.y + 0.5 });
      drawPin(ctx, cen[0] - cell / 2, cen[1] - cell / 2, cell, t.site, base, ink);
      if (t.site.type === 'town' || t.site.type === 'ruin' || t.site.type === 'lair') {
        const nm = (t.site.name || '').split(',')[0];
        drawMapLabel(ctx, cen[0], cen[1] + cell * 0.62, nm, ink, base, Math.max(10, cell * 0.56), false, t.site.type === 'town' ? ink : mix(ink, t.site.color, 0.5));
      }
    }
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

  TLU.Render = {
    Display: Display, drawWorld: drawWorld, drawDungeon: drawDungeon, drawMinimap: drawMinimap, dim: dim,
    mapStyles: MAP_STYLES, mapStyleNames: MAP_STYLE_NAMES,
    cycleMapStyle: cycleMapStyle, setMapStyle: setMapStyle,
    get mapStyle() { return MAP_STYLE; },
  };
})(window.TLU = window.TLU || {});
