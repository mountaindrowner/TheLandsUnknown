/* ============================================================
 * iso_art.js — the isometric folio tileset.
 *
 * A canvas re-implementation of the game's ink doctrine (jittered
 * strokes, one-sided hatching, limited palette) for an isometric
 * tactics map drawn like a hand-inked field chart on vellum. Two
 * families:
 *   TERRAIN — the diamond a tile is painted with (grass, water, ash…)
 *   FEATURE — a thing standing on a tile (mountain, tree, tower, vent…)
 *
 * Everything is deterministic from a seed, so a tile always looks like
 * itself and never shimmers between redraws. Pure drawing — no state,
 * no engine knowledge. The engine (iso.js) decides what each does.
 * ============================================================ */
(function (TLU) {
  'use strict';

  var TW = 78, TH = 39;                 // iso tile footprint
  var PAL = {
    paper: '#e4d9bd', paper2: '#d8c9a4', ink: '#2c2820', ink2: '#5f5643',
    ox: '#9a3b2a', water: '#9fbcc0', water2: '#7ea3a8', ice: '#cfe0df',
    grass: '#c4c79a', grass2: '#aab183', dirt: '#cbb488', sand: '#e0d3a6',
    stone: '#c0b9a6', stone2: '#a49c88', ash: '#bab3a6', bog: '#a4a883',
    rift: '#b6a2c4', rift2: '#7c5f92', ember: '#d0762c', road: '#cdb691',
    wood: '#b98a54', leaf: '#6f8f56', leaf2: '#557045', bone: '#e7dcc4',
  };

  function rr(seed) { return new TLU.RNG('isoart:' + seed); }
  function jit(rng, v, a) { return v + (rng.next() - 0.5) * a; }

  // ---- primitives -----------------------------------------------------
  function diamond(ctx, cx, cy, inset) {
    inset = inset || 0; var w = TW / 2 - inset, h = TH / 2 - inset * (TH / TW);
    ctx.beginPath();
    ctx.moveTo(cx, cy - h); ctx.lineTo(cx + w, cy); ctx.lineTo(cx, cy + h); ctx.lineTo(cx - w, cy); ctx.closePath();
  }

  // an organic jittered stroke (quadratic midpoints) — the ink line
  function ink(ctx, pts, o) {
    o = o || {}; var rng = o.rng || rr('x'), amt = o.amt == null ? 1.1 : o.amt;
    var P = pts.map(function (p) { return [jit(rng, p[0], amt), jit(rng, p[1], amt)]; });
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
    for (var i = 1; i < P.length; i++) {
      var a = P[i - 1], b = P[i], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      ctx.quadraticCurveTo(a[0], a[1], mx, my);
    }
    var L = P[P.length - 1]; ctx.lineTo(L[0], L[1]); if (o.close) ctx.closePath();
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    if (o.stroke !== 'none') { ctx.lineWidth = o.w || 1.2; ctx.strokeStyle = o.stroke || PAL.ink; ctx.lineJoin = 'round'; ctx.lineCap = o.cap || 'round'; ctx.stroke(); }
  }
  function blob(ctx, pts, o) { o = o || {}; o.close = true; ink(ctx, pts, o); }

  // a closed rough ellipse of points (for canopies, stones, pools)
  function lump(cx, cy, rx, ry, n, rng, wob) {
    var p = []; for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; p.push([cx + Math.cos(a) * rx * (1 + (rng.next() - 0.5) * (wob || 0.3)), cy + Math.sin(a) * ry * (1 + (rng.next() - 0.5) * (wob || 0.3))]); } return p;
  }

  function stipple(ctx, cx, cy, rx, ry, n, o) {
    o = o || {}; var rng = o.rng || rr('s'); ctx.save(); ctx.globalAlpha = o.op || 0.4; ctx.fillStyle = o.color || PAL.ink2;
    for (var i = 0; i < n; i++) { var a = rng.next() * 6.28, r = Math.sqrt(rng.next()); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, o.r || 0.6, 0, 6.28); ctx.fill(); }
    ctx.restore();
  }

  // parallel hatch clipped to the tile diamond (one-sided shading)
  function hatch(ctx, cx, cy, o) {
    o = o || {}; ctx.save(); diamond(ctx, cx, cy, o.inset || 1); ctx.clip();
    ctx.globalAlpha = o.op || 0.16; ctx.strokeStyle = o.color || PAL.ink2; ctx.lineWidth = o.w || 0.8;
    var gap = o.gap || 5, ang = o.angle == null ? -0.5 : o.angle, dx = Math.cos(ang), dy = Math.sin(ang);
    for (var t = -TW; t < TW; t += gap) {
      ctx.beginPath(); ctx.moveTo(cx + t - TW * dy, cy - TW * dx); ctx.lineTo(cx + t + TW * dy, cy + TW * dx); ctx.stroke();
    }
    ctx.restore();
  }

  function shadow(ctx, cx, cy, rx, ry, op) {
    ctx.save(); ctx.globalAlpha = op || 0.28; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.28); ctx.fill(); ctx.restore();
  }

  // a raised iso prism (mountains, buildings, blocks): top diamond + 2 faces
  function prism(ctx, cx, cy, h, o) {
    o = o || {}; var w = TW / 2 - (o.inset || 0), hh = TH / 2 - (o.inset || 0) * (TH / TW);
    // left face
    ctx.beginPath(); ctx.moveTo(cx - w, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx, cy + hh - h); ctx.lineTo(cx - w, cy - h); ctx.closePath();
    ctx.fillStyle = o.left || PAL.stone2; ctx.fill(); ctx.strokeStyle = o.ink || PAL.ink; ctx.lineWidth = o.w || 1; ctx.stroke();
    // right face
    ctx.beginPath(); ctx.moveTo(cx + w, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx, cy + hh - h); ctx.lineTo(cx + w, cy - h); ctx.closePath();
    ctx.fillStyle = o.right || PAL.stone; ctx.fill(); ctx.stroke();
    // top
    ctx.beginPath(); ctx.moveTo(cx, cy - hh - h); ctx.lineTo(cx + w, cy - h); ctx.lineTo(cx, cy + hh - h); ctx.lineTo(cx - w, cy - h); ctx.closePath();
    ctx.fillStyle = o.top || PAL.stone; ctx.fill(); ctx.stroke();
  }

  // ---- terrain --------------------------------------------------------
  // each: draw the tile diamond (base fill + texture + faint ink edge)
  function edge(ctx, cx, cy) { diamond(ctx, cx, cy, 0); ctx.strokeStyle = 'rgba(60,54,40,0.4)'; ctx.lineWidth = 1; ctx.stroke(); }
  function fill(ctx, cx, cy, c) { diamond(ctx, cx, cy, 0); ctx.fillStyle = c; ctx.fill(); }

  var TERRAIN = {
    grass: function (ctx, cx, cy, s) {
      var rng = rr('grass' + s); fill(ctx, cx, cy, PAL.grass); hatch(ctx, cx, cy, { angle: -0.5, gap: 6, op: 0.1, color: PAL.grass2 });
      for (var i = 0; i < 5; i++) { var x = cx + (rng.next() - 0.5) * TW * 0.6, y = cy + (rng.next() - 0.5) * TH * 0.6; ink(ctx, [[x, y + 2], [x - 1, y - 3]], { rng: rng, w: 0.8, amt: 0.4, stroke: PAL.leaf2 }); ink(ctx, [[x + 2, y + 2], [x + 2.5, y - 2.5]], { rng: rng, w: 0.8, amt: 0.4, stroke: PAL.leaf2 }); }
      edge(ctx, cx, cy);
    },
    dirt: function (ctx, cx, cy, s) { var rng = rr('dirt' + s); fill(ctx, cx, cy, PAL.dirt); stipple(ctx, cx, cy, TW * 0.32, TH * 0.32, 22, { rng: rng, op: 0.3, r: 0.7, color: PAL.ink2 }); edge(ctx, cx, cy); },
    sand: function (ctx, cx, cy, s) { var rng = rr('sand' + s); fill(ctx, cx, cy, PAL.sand); for (var i = 0; i < 3; i++) { var y = cy - 6 + i * 6 + (rng.next() - 0.5) * 3; ink(ctx, [[cx - TW * 0.3, y], [cx, y + 2], [cx + TW * 0.3, y]], { rng: rng, w: 0.7, amt: 0.5, stroke: 'rgba(95,86,67,0.5)' }); } edge(ctx, cx, cy); },
    stone: function (ctx, cx, cy, s) { var rng = rr('stone' + s); fill(ctx, cx, cy, PAL.stone); for (var i = 0; i < 3; i++) { var a = rng.next() * 6.28, x = cx + Math.cos(a) * 10, y = cy + Math.sin(a) * 5; ink(ctx, [[x, y], [x + (rng.next() - 0.5) * 12, y + (rng.next() - 0.5) * 6]], { rng: rng, w: 0.7, amt: 0.4, stroke: PAL.stone2 }); } edge(ctx, cx, cy); },
    ash: function (ctx, cx, cy, s) { var rng = rr('ash' + s); fill(ctx, cx, cy, PAL.ash); hatch(ctx, cx, cy, { angle: 0.5, gap: 4, op: 0.12 }); stipple(ctx, cx, cy, TW * 0.3, TH * 0.3, 14, { rng: rng, op: 0.25, r: 0.6 }); edge(ctx, cx, cy); },
    bog: function (ctx, cx, cy, s) { var rng = rr('bog' + s); fill(ctx, cx, cy, PAL.bog); for (var i = 0; i < 4; i++) { var x = cx + (rng.next() - 0.5) * TW * 0.5, y = cy + (rng.next() - 0.5) * TH * 0.5; ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = PAL.ink2; ctx.beginPath(); ctx.ellipse(x, y, 3 + rng.next() * 3, 1.6, 0, 0, 6.28); ctx.fill(); ctx.restore(); } edge(ctx, cx, cy); },
    road: function (ctx, cx, cy, s) { var rng = rr('road' + s); fill(ctx, cx, cy, PAL.road); ink(ctx, [[cx - TW / 2, cy], [cx, cy - 2], [cx + TW / 2, cy]], { rng: rng, w: 1, amt: 0.6, stroke: 'rgba(95,86,67,0.5)' }); ink(ctx, [[cx, cy - TH / 2], [cx + 2, cy], [cx, cy + TH / 2]], { rng: rng, w: 1, amt: 0.6, stroke: 'rgba(95,86,67,0.4)' }); edge(ctx, cx, cy); },
    water: function (ctx, cx, cy, s) { waterTile(ctx, cx, cy, s, PAL.water); },
    deepwater: function (ctx, cx, cy, s) { waterTile(ctx, cx, cy, s, PAL.water2); },
    ice: function (ctx, cx, cy, s) { var rng = rr('ice' + s); fill(ctx, cx, cy, PAL.ice); for (var i = 0; i < 3; i++) { var x = cx + (rng.next() - 0.5) * 20, y = cy + (rng.next() - 0.5) * 10; ink(ctx, [[x, y], [x + 6, y - 3], [x + 3, y + 4]], { rng: rng, w: 0.7, amt: 0.4, stroke: 'rgba(120,150,160,0.7)' }); } edge(ctx, cx, cy); },
    rift: function (ctx, cx, cy, s) { var rng = rr('rift' + s); fill(ctx, cx, cy, PAL.rift); hatch(ctx, cx, cy, { angle: -0.6, gap: 4, op: 0.2, color: PAL.rift2 }); for (var i = 0; i < 2; i++) { var y = cy + (rng.next() - 0.5) * 8; ink(ctx, [[cx - 12, y], [cx - 2, y + 3], [cx + 6, y - 2], [cx + 14, y + 2]], { rng: rng, w: 1, amt: 0.8, stroke: PAL.rift2 }); } edge(ctx, cx, cy); },
  };
  function waterTile(ctx, cx, cy, s, base) {
    var rng = rr('water' + s); fill(ctx, cx, cy, base);
    ctx.save(); diamond(ctx, cx, cy, 1); ctx.clip();
    for (var i = 0; i < 4; i++) { var y = cy - 8 + i * 5 + (rng.next() - 0.5) * 2; ink(ctx, [[cx - 16, y], [cx - 6, y + 2], [cx + 4, y - 1], [cx + 16, y + 2]], { rng: rng, w: 0.8, amt: 0.3, stroke: 'rgba(255,255,255,0.35)' }); }
    ctx.restore(); edge(ctx, cx, cy);
  }

  // ---- features (stand on a tile) ------------------------------------
  // drawn anchored to (cx, cy) = tile-top centre; grow upward.
  function tree(ctx, cx, cy, s, o) {
    o = o || {}; var rng = rr('tree' + s); shadow(ctx, cx, cy + 2, 12, 5);
    ink(ctx, [[cx, cy], [cx - 1, cy - 16]], { rng: rng, w: 3, amt: 0.5, stroke: PAL.wood });
    var cyc = cy - 22, lf = o.leaf || PAL.leaf;
    blob(ctx, lump(cx, cyc, 13, 11, 11, rng, 0.35), { rng: rng, w: 1.3, amt: 0.6, fill: lf, stroke: PAL.ink });
    canopyShade(ctx, cx, cyc, 13, 11, PAL.leaf2, 0.28);
  }
  function pine(ctx, cx, cy, s) {
    var rng = rr('pine' + s); shadow(ctx, cx, cy + 2, 10, 4);
    ink(ctx, [[cx, cy], [cx, cy - 26]], { rng: rng, w: 2.4, amt: 0.4, stroke: PAL.wood });
    for (var i = 0; i < 3; i++) { var ty = cy - 6 - i * 8, wr = 12 - i * 3; blob(ctx, [[cx - wr, ty], [cx, ty - 10], [cx + wr, ty]], { rng: rng, w: 1.2, amt: 0.5, fill: PAL.leaf2, stroke: PAL.ink }); }
  }
  function deadtree(ctx, cx, cy, s) {
    var rng = rr('dead' + s); shadow(ctx, cx, cy + 2, 9, 4);
    ink(ctx, [[cx, cy], [cx + 1, cy - 22]], { rng: rng, w: 2.4, amt: 0.6, stroke: '#6a5c44' });
    ink(ctx, [[cx, cy - 12], [cx - 8, cy - 20]], { rng: rng, w: 1.4, amt: 0.7, stroke: '#6a5c44' });
    ink(ctx, [[cx + 1, cy - 16], [cx + 9, cy - 26]], { rng: rng, w: 1.4, amt: 0.7, stroke: '#6a5c44' });
    ink(ctx, [[cx - 3, cy - 8], [cx - 9, cy - 12]], { rng: rng, w: 1.1, amt: 0.6, stroke: '#6a5c44' });
  }
  function mountain(ctx, cx, cy, s) {
    var rng = rr('mtn' + s); shadow(ctx, cx, cy + 3, 20, 8);
    // a jagged peak silhouette rising from the tile
    var h = 30 + rng.next() * 8;
    blob(ctx, [[cx - 20, cy + 4], [cx - 8, cy - h * 0.6], [cx - 2, cy - h * 0.45], [cx + 3, cy - h], [cx + 12, cy - h * 0.4], [cx + 21, cy + 4]], { rng: rng, w: 1.6, amt: 0.5, fill: PAL.stone2, stroke: PAL.ink });
    // snow cap + shading
    blob(ctx, [[cx - 2, cy - h * 0.62], [cx + 3, cy - h], [cx + 9, cy - h * 0.55], [cx + 3, cy - h * 0.5]], { rng: rng, w: 0.8, amt: 0.3, fill: PAL.bone, stroke: 'none' });
    ink(ctx, [[cx + 3, cy - h], [cx + 8, cy - h * 0.2], [cx + 14, cy + 2]], { rng: rng, w: 0.9, amt: 0.4, stroke: PAL.ink2 });
  }
  function hill(ctx, cx, cy, s) { var rng = rr('hill' + s); shadow(ctx, cx, cy + 2, 18, 7); blob(ctx, lump(cx, cy - 6, 20, 12, 9, rng, 0.2), { rng: rng, w: 1.3, amt: 0.4, fill: PAL.grass2, stroke: PAL.ink }); canopyShade(ctx, cx + 3, cy - 6, 18, 11, PAL.leaf2, 0.2); }
  function boulder(ctx, cx, cy, s) { var rng = rr('bld' + s); shadow(ctx, cx, cy + 2, 14, 6); blob(ctx, lump(cx, cy - 7, 14, 11, 8, rng, 0.28), { rng: rng, w: 1.5, amt: 0.5, fill: PAL.stone, stroke: PAL.ink }); ink(ctx, [[cx - 6, cy - 10], [cx + 2, cy - 6]], { rng: rng, w: 0.8, amt: 0.3, stroke: PAL.stone2 }); }
  function rubble(ctx, cx, cy, s) { var rng = rr('rub' + s); shadow(ctx, cx, cy + 2, 15, 6); for (var i = 0; i < 4; i++) { var x = cx + (rng.next() - 0.5) * 22, y = cy + (rng.next() - 0.5) * 8 - 3, r = 3 + rng.next() * 4; blob(ctx, lump(x, y, r, r * 0.7, 6, rng, 0.3), { rng: rng, w: 1, amt: 0.4, fill: PAL.stone2, stroke: PAL.ink }); } }
  function standingstone(ctx, cx, cy, s) { var rng = rr('menhir' + s); shadow(ctx, cx, cy + 2, 10, 4); blob(ctx, [[cx - 6, cy + 2], [cx - 7, cy - 20], [cx - 2, cy - 26], [cx + 5, cy - 22], [cx + 6, cy + 2]], { rng: rng, w: 1.4, amt: 0.4, fill: PAL.stone2, stroke: PAL.ink }); ink(ctx, [[cx - 2, cy - 20], [cx - 1, cy - 4]], { rng: rng, w: 0.7, amt: 0.3, stroke: PAL.ink2 }); }
  function obelisk(ctx, cx, cy, s) { var rng = rr('obl' + s); shadow(ctx, cx, cy + 2, 9, 4); prism(ctx, cx, cy - 6, 30, { top: PAL.rift, left: PAL.rift2, right: PAL.rift, inset: 20, w: 1.2 }); ink(ctx, [[cx, cy - 12], [cx, cy - 34]], { rng: rng, w: 0.8, amt: 0.3, stroke: PAL.ember }); }
  function campfire(ctx, cx, cy, s) { var rng = rr('fire' + s); shadow(ctx, cx, cy + 2, 11, 5); for (var i = 0; i < 5; i++) { var a = i / 5 * 6.28; ink(ctx, [[cx, cy + 1], [cx + Math.cos(a) * 8, cy + 2 + Math.sin(a) * 3]], { rng: rng, w: 1.4, amt: 0.3, stroke: PAL.wood }); } blob(ctx, [[cx - 5, cy - 1], [cx - 2, cy - 12], [cx + 1, cy - 5], [cx + 4, cy - 14], [cx + 5, cy - 1]], { rng: rng, w: 1.1, amt: 0.5, fill: PAL.ember, stroke: '#a2481c' }); }
  function tent(ctx, cx, cy, s) { var rng = rr('tent' + s); shadow(ctx, cx, cy + 2, 15, 6); blob(ctx, [[cx - 15, cy + 3], [cx, cy - 20], [cx + 15, cy + 3]], { rng: rng, w: 1.4, amt: 0.4, fill: PAL.paper2, stroke: PAL.ink }); ink(ctx, [[cx, cy - 20], [cx, cy + 3]], { rng: rng, w: 1, amt: 0.3, stroke: PAL.ink2 }); ink(ctx, [[cx - 5, cy + 3], [cx - 1, cy - 6], [cx - 5, cy + 3]], { rng: rng, w: 1, amt: 0.3, stroke: PAL.ink, fill: PAL.ink2 }); ink(ctx, [[cx + 15, cy + 3], [cx + 20, cy - 2]], { rng: rng, w: 1, amt: 0.3, stroke: '#7a6a4a' }); }
  function banner(ctx, cx, cy, s, o) { o = o || {}; var rng = rr('ban' + s); shadow(ctx, cx, cy + 2, 7, 3); ink(ctx, [[cx, cy + 2], [cx - 1, cy - 30]], { rng: rng, w: 1.8, amt: 0.3, stroke: '#6a5c44' }); blob(ctx, [[cx - 1, cy - 30], [cx + 16, cy - 27], [cx + 12, cy - 20], [cx + 16, cy - 13], [cx - 1, cy - 15]], { rng: rng, w: 1, amt: 0.4, fill: o.accent || PAL.ox, stroke: PAL.ink }); }
  function well(ctx, cx, cy, s) { var rng = rr('well' + s); shadow(ctx, cx, cy + 2, 12, 5); prism(ctx, cx, cy, 8, { top: PAL.stone, left: PAL.stone2, right: PAL.stone, inset: 22, w: 1.1 }); ctx.save(); diamond(ctx, cx, cy - 8, 22); ctx.fillStyle = PAL.ink; ctx.fill(); ctx.restore(); ink(ctx, [[cx - 12, cy - 8], [cx - 12, cy - 24]], { rng: rng, w: 1.4, amt: 0.3, stroke: PAL.wood }); ink(ctx, [[cx + 12, cy - 8], [cx + 12, cy - 24]], { rng: rng, w: 1.4, amt: 0.3, stroke: PAL.wood }); ink(ctx, [[cx - 13, cy - 24], [cx + 13, cy - 26]], { rng: rng, w: 1.8, amt: 0.3, stroke: '#6a5c44' }); }
  function bones(ctx, cx, cy, s) { var rng = rr('bone' + s); shadow(ctx, cx, cy + 2, 13, 5); blob(ctx, lump(cx - 4, cy - 4, 6, 5, 8, rng, 0.2), { rng: rng, w: 1, amt: 0.3, fill: PAL.bone, stroke: PAL.ink2 }); for (var i = 0; i < 3; i++) { var x = cx + 2 + i * 4, y = cy + (rng.next() - 0.5) * 4; ink(ctx, [[x, y - 3], [x + 6, y + 3]], { rng: rng, w: 1.6, amt: 0.3, stroke: PAL.bone }); } }
  function crystal(ctx, cx, cy, s) { var rng = rr('cry' + s); shadow(ctx, cx, cy + 2, 10, 4); blob(ctx, [[cx - 6, cy + 1], [cx - 4, cy - 16], [cx, cy - 22], [cx + 4, cy - 14], [cx + 6, cy + 1]], { rng: rng, w: 1.1, amt: 0.3, fill: PAL.rift, stroke: PAL.rift2 }); ink(ctx, [[cx, cy - 22], [cx - 1, cy + 1]], { rng: rng, w: 0.7, amt: 0.2, stroke: '#e9d9f0' }); blob(ctx, [[cx + 4, cy + 1], [cx + 8, cy - 9], [cx + 11, cy + 1]], { rng: rng, w: 0.9, amt: 0.2, fill: PAL.rift2, stroke: PAL.rift2 }); }
  function barricade(ctx, cx, cy, s) { var rng = rr('bar' + s); shadow(ctx, cx, cy + 2, 16, 6); for (var i = -1; i <= 1; i++) { var x = cx + i * 10; ink(ctx, [[x, cy + 4], [x + 2, cy - 14]], { rng: rng, w: 2.6, amt: 0.4, stroke: PAL.wood }); } ink(ctx, [[cx - 12, cy - 4], [cx + 12, cy - 8]], { rng: rng, w: 2, amt: 0.5, stroke: '#8a6a3a' }); ink(ctx, [[cx - 12, cy - 10], [cx + 12, cy - 2]], { rng: rng, w: 1.6, amt: 0.5, stroke: '#8a6a3a' }); }
  function gate(ctx, cx, cy, s) { var rng = rr('gate' + s); shadow(ctx, cx, cy + 2, 18, 6); prism(ctx, cx - 14, cy, 26, { top: PAL.stone, left: PAL.stone2, right: PAL.stone, inset: 30, w: 1.1 }); prism(ctx, cx + 14, cy, 26, { top: PAL.stone, left: PAL.stone2, right: PAL.stone, inset: 30, w: 1.1 }); blob(ctx, [[cx - 8, cy - 4], [cx - 8, cy - 24], [cx, cy - 30], [cx + 8, cy - 24], [cx + 8, cy - 4]], { rng: rng, w: 1.2, amt: 0.3, fill: PAL.ink, stroke: PAL.ink }); }
  function tower(ctx, cx, cy, s) { var rng = rr('twr' + s); shadow(ctx, cx, cy + 2, 15, 6); prism(ctx, cx, cy - 8, 42, { top: PAL.stone, left: PAL.stone2, right: PAL.stone, inset: 24, w: 1.2 }); blob(ctx, [[cx - 10, cy - 50], [cx, cy - 62], [cx + 10, cy - 50]], { rng: rng, w: 1.2, amt: 0.4, fill: PAL.ox, stroke: PAL.ink }); ctx.save(); ctx.fillStyle = PAL.ember; ctx.globalAlpha = 0.8; ctx.fillRect(cx - 2, cy - 40, 4, 6); ctx.restore(); }
  function building(ctx, cx, cy, s, o) { o = o || {}; var rng = rr('bld2' + s); shadow(ctx, cx, cy + 3, 20, 8); prism(ctx, cx, cy - 4, 26, { top: o.roof || '#b7734a', left: '#8a6a4a', right: '#a07a52', inset: 12, w: 1.2 }); // roof gable
    blob(ctx, [[cx - (TW / 2 - 12), cy - 4 - 26], [cx, cy - 4 - 40], [cx + (TW / 2 - 12), cy - 4 - 26]], { rng: rng, w: 1.2, amt: 0.3, fill: o.roof || '#b7734a', stroke: PAL.ink }); // door + window
    ctx.save(); ctx.fillStyle = PAL.ink; ctx.globalAlpha = 0.8; ctx.fillRect(cx - 4, cy - 16, 8, 12); ctx.restore(); ink(ctx, [[cx - 4, cy - 16], [cx + 4, cy - 16]], { rng: rng, w: 0.8, amt: 0.2, stroke: PAL.ink2 });
  }
  function riftvent(ctx, cx, cy, s, o) { o = o || {}; var rng = rr('vent' + s); var op = o.pulse == null ? 0.5 : 0.3 + o.pulse * 0.4;
    ctx.save(); diamond(ctx, cx, cy, 4); ctx.fillStyle = PAL.ink; ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha = op; ctx.strokeStyle = PAL.rift2; ctx.lineWidth = 2; diamond(ctx, cx, cy, 4); ctx.stroke(); ctx.restore();
    for (var i = 0; i < 4; i++) { var a = i / 4 * 6.28 + rng.next(); ink(ctx, [[cx, cy], [cx + Math.cos(a) * 14, cy - 6 + Math.sin(a) * 6]], { rng: rng, w: 1, amt: 0.5, stroke: PAL.rift2 }); }
    ctx.save(); ctx.globalAlpha = op; ctx.fillStyle = '#c79ae0'; ctx.beginPath(); ctx.ellipse(cx, cy - 2, 4, 2, 0, 0, 6.28); ctx.fill(); ctx.restore();
  }
  function embervent(ctx, cx, cy, s, o) { o = o || {}; var rng = rr('emb' + s); var op = o.pulse == null ? 0.6 : 0.35 + o.pulse * 0.5;
    ctx.save(); diamond(ctx, cx, cy, 6); ctx.fillStyle = '#3a2415'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha = op; ctx.fillStyle = PAL.ember; diamond(ctx, cx, cy, 8); ctx.fill(); ctx.restore();
    for (var i = 0; i < 4; i++) { var x = cx + (rng.next() - 0.5) * 12; ink(ctx, [[x, cy], [x + (rng.next() - 0.5) * 4, cy - 6 - rng.next() * 6]], { rng: rng, w: 1.4, amt: 0.4, stroke: PAL.ember }); }
  }
  function chasm(ctx, cx, cy, s) { var rng = rr('cha' + s); ctx.save(); diamond(ctx, cx, cy, 0); ctx.fillStyle = '#141118'; ctx.fill(); ctx.restore(); ctx.save(); diamond(ctx, cx, cy, 3); ctx.clip(); for (var i = 0; i < 3; i++) { var y = cy - 6 + i * 6; ink(ctx, [[cx - 16, y], [cx, y + 3], [cx + 16, y - 1]], { rng: rng, w: 0.7, amt: 0.4, stroke: 'rgba(120,110,140,0.4)' }); } ctx.restore(); diamond(ctx, cx, cy, 0); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.4; ctx.stroke(); }
  function bridge(ctx, cx, cy, s) { var rng = rr('brg' + s); ctx.save(); diamond(ctx, cx, cy, 0); ctx.fillStyle = PAL.wood; ctx.globalAlpha = 0.95; ctx.fill(); ctx.restore(); for (var i = -2; i <= 2; i++) { ink(ctx, [[cx + i * 7 - 6, cy + Math.abs(i) * 1.5], [cx + i * 7 + 6, cy - 3 + Math.abs(i) * 1.5]], { rng: rng, w: 1, amt: 0.3, stroke: '#8a6a3a' }); } diamond(ctx, cx, cy, 0); ctx.strokeStyle = '#6a5230'; ctx.lineWidth = 1; ctx.stroke(); }
  function flag(ctx, cx, cy, s, o) { banner(ctx, cx, cy, s, o); }

  // one-sided hatch shading, clipped to an ellipse (canopies, mounds)
  function canopyShade(ctx, cx, cy, rx, ry, color, op) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.28); ctx.clip();
    ctx.globalAlpha = op; ctx.strokeStyle = color; ctx.lineWidth = 0.7;
    for (var t = -rx; t < rx * 1.4; t += 3) { ctx.beginPath(); ctx.moveTo(cx + t, cy - ry - 4); ctx.lineTo(cx + t + rx, cy + ry + 4); ctx.stroke(); }
    ctx.restore();
  }

  var FEATURE = {
    mountain: mountain, hill: hill, forest: tree, pine: pine, deadtree: deadtree,
    boulder: boulder, rubble: rubble, standingstone: standingstone, obelisk: obelisk,
    campfire: campfire, tent: tent, banner: banner, well: well, bones: bones,
    crystal: crystal, barricade: barricade, gate: gate, tower: tower, building: building,
    riftvent: riftvent, embervent: embervent, chasm: chasm, bridge: bridge, flag: flag,
  };

  TLU.IsoArt = {
    TW: TW, TH: TH, PAL: PAL,
    diamond: diamond, ink: ink, blob: blob, prism: prism, shadow: shadow, hatch: hatch, stipple: stipple,
    TERRAIN: TERRAIN, FEATURE: FEATURE,
    terrainKinds: Object.keys(TERRAIN),
    featureKinds: Object.keys(FEATURE),
    drawTerrain: function (ctx, kind, cx, cy, seed) { (TERRAIN[kind] || TERRAIN.grass)(ctx, cx, cy, seed || kind); },
    drawFeature: function (ctx, kind, cx, cy, seed, opt) { if (FEATURE[kind]) FEATURE[kind](ctx, cx, cy, seed || kind, opt); },
  };
})(window.TLU = window.TLU || {});
