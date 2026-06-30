/* ============================================================
 * art/scenes.js — generative cinematic vistas.
 *
 * The opening's imagery: wide, dark, deep-time landscapes in the
 * Souls/Miyazaki key-art idiom — a glowing horizon, layered ridgelines
 * darkening toward the foreground, atmospheric haze, and a tiny figure
 * for scale, dwarfed by the world. Same ink doctrine, a landscape
 * skeleton. Self-contained SVG (its own sky + vignette), so a vista can
 * be dropped into the cinematic or screenshotted on its own.
 * ============================================================ */
(function (TLU) {
  'use strict';
  var A = TLU.Art;

  // cinematic palette — warm dusk over near-black land
  var SKY_TOP = '#0c0a07', SKY_MID = '#211710', GLOW = '#c07a2c', GLOW2 = '#5e3c17';
  var R_FAR = '#3a2c1d', R_MID = '#241a11', R_NEAR = '#0b0806', FIG = '#040302';
  var EMBER = '#cf7a2e', WISP = '#7fa6c4', BONE = '#e7dcc4';

  function rngOf(s) { return new TLU.RNG('scene:' + s); }

  // a jagged ridgeline filled down to the bottom of the frame
  function ridge(rng, W, H, baseY, amp, off, fill, op) {
    var n = 16, pts = [];
    for (var i = 0; i <= n; i++) {
      var x = W * i / n;
      var y = baseY + Math.sin(i * 0.8 + off) * amp * 0.45 + Math.sin(i * 1.9 + off * 2) * amp * 0.25 + (rng.next() - 0.5) * amp * 0.5;
      pts.push([x, y]);
    }
    var d = 'M 0 ' + H + ' L ' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var j = 1; j < pts.length; j++) {
      var a = pts[j - 1], b = pts[j], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      d += ' Q ' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
    }
    d += ' L ' + W + ' ' + H + ' Z';
    return '<path d="' + d + '" fill="' + fill + '"' + (op != null ? ' opacity="' + op + '"' : '') + '/>';
  }

  // a tiny cloaked figure standing on the ground, pure silhouette
  function figure(x, gy, h, fill, opt) {
    opt = opt || {};
    var w = h * 0.42;
    var s = '<ellipse cx="' + x + '" cy="' + (gy + 2) + '" rx="' + (w * 0.8) + '" ry="' + (h * 0.05) + '" fill="#000" opacity="0.5"/>';
    s += '<path d="M ' + (x - w / 2) + ' ' + gy +
      ' Q ' + (x - w * 0.58) + ' ' + (gy - h * 0.62) + ' ' + (x - h * 0.13) + ' ' + (gy - h * 0.8) +
      ' Q ' + x + ' ' + (gy - h * 1.04) + ' ' + (x + h * 0.13) + ' ' + (gy - h * 0.8) +
      ' Q ' + (x + w * 0.58) + ' ' + (gy - h * 0.62) + ' ' + (x + w / 2) + ' ' + gy + ' Z" fill="' + fill + '"/>';
    s += '<circle cx="' + x + '" cy="' + (gy - h * 0.86) + '" r="' + (h * 0.11) + '" fill="' + fill + '"/>';
    if (opt.staff) s += '<line x1="' + (x + w * 0.5) + '" y1="' + (gy + 2) + '" x2="' + (x + w * 0.62) + '" y2="' + (gy - h * 1.15) + '" stroke="' + fill + '" stroke-width="' + (h * 0.04) + '"/>';
    if (opt.wisp) { s += '<circle cx="' + (x - w * 0.5) + '" cy="' + (gy - h * 0.78) + '" r="' + (h * 0.09) + '" fill="' + WISP + '"/>'; s += '<circle cx="' + (x - w * 0.5) + '" cy="' + (gy - h * 0.78) + '" r="' + (h * 0.2) + '" fill="none" stroke="' + WISP + '" stroke-width="1" opacity="0.4"/>'; }
    return s;
  }

  // broken tower silhouette
  function tower(x, gy, h, w, fill, rng) {
    var topY = gy - h, jag = (rng.next() - 0.5) * w;
    return '<path d="M ' + (x - w / 2) + ' ' + gy + ' L ' + (x - w / 2 + 2) + ' ' + (topY + h * 0.2) +
      ' L ' + (x - w * 0.2) + ' ' + (topY + h * 0.06) + ' L ' + (x + jag * 0.3) + ' ' + topY +
      ' L ' + (x + w * 0.2) + ' ' + (topY + h * 0.12) + ' L ' + (x + w / 2 - 2) + ' ' + (topY + h * 0.25) +
      ' L ' + (x + w / 2) + ' ' + gy + ' Z" fill="' + fill + '"/>' +
      // a lit window or two
      '<rect x="' + (x - w * 0.12) + '" y="' + (topY + h * 0.4) + '" width="' + (w * 0.08) + '" height="' + (w * 0.12) + '" fill="' + EMBER + '" opacity="0.7"/>';
  }

  // ---- the public vista -----------------------------------------------
  // kind: 'world' | 'spires' | 'churn' | 'echo' | 'throne' | 'orders'
  function vista(kind, seed, opt) {
    opt = opt || {};
    var W = 1000, H = 460, rng = rngOf(kind + ':' + (seed || 'a'));
    var horizon = 300;
    var glowX = kind === 'churn' ? 820 : kind === 'orders' ? 500 : 360 + rng.next() * 120;
    var defs =
      '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + SKY_TOP + '"/><stop offset="0.62" stop-color="' + SKY_MID + '"/>' +
      '<stop offset="1" stop-color="' + GLOW2 + '"/></linearGradient>' +
      '<radialGradient id="glow" cx="' + (glowX / W) + '" cy="' + (horizon / H) + '" r="0.55">' +
      '<stop offset="0" stop-color="' + GLOW + '" stop-opacity="0.95"/>' +
      '<stop offset="0.4" stop-color="' + GLOW + '" stop-opacity="0.35"/>' +
      '<stop offset="1" stop-color="' + GLOW + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="vig" cx="0.5" cy="0.46" r="0.75">' +
      '<stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.82"/></radialGradient>';

    var s = '<rect width="' + W + '" height="' + H + '" fill="url(#sky)"/>';
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#glow)"/>';
    // the light source disc (sun / Churn-eye)
    var sunR = kind === 'throne' ? 26 : 40;
    s += '<circle cx="' + glowX + '" cy="' + (horizon - 24) + '" r="' + sunR + '" fill="' + (kind === 'echo' ? '#caa86a' : GLOW) + '" opacity="0.9"/>';
    s += '<circle cx="' + glowX + '" cy="' + (horizon - 24) + '" r="' + (sunR + 12) + '" fill="none" stroke="' + GLOW + '" stroke-width="2" opacity="0.3"/>';

    // drifting motes / stars
    for (var m = 0; m < 40; m++) s += '<circle cx="' + (rng.next() * W).toFixed(0) + '" cy="' + (rng.next() * horizon).toFixed(0) + '" r="' + (0.4 + rng.next()).toFixed(1) + '" fill="' + BONE + '" opacity="' + (0.05 + rng.next() * 0.18).toFixed(2) + '"/>';

    // far ridgeline (hazy)
    s += ridge(rng, W, H, horizon - 14, 26, 1.2, R_FAR, 0.9);
    // a haze band above the far ridge
    s += '<rect x="0" y="' + (horizon - 60) + '" width="' + W + '" height="60" fill="' + GLOW + '" opacity="0.06"/>';

    // mid ridge — kind-specific furniture sits here
    s += ridge(rng, W, H, horizon + 30, 34, 3.1, R_MID, 1);
    if (kind === 'spires') {
      for (var t = 0; t < 6; t++) { var tx = 120 + t * 150 + (rng.next() - 0.5) * 50; s += tower(tx, horizon + 26, 70 + rng.next() * 90, 26 + rng.next() * 14, R_NEAR, rng); }
    }
    if (kind === 'throne') {
      // a colossal seated hollow silhouette dominating the centre
      var cxT = 500, baseY = horizon + 40;
      s += '<path d="M ' + (cxT - 150) + ' ' + baseY + ' L ' + (cxT - 120) + ' ' + (baseY - 150) +
        ' Q ' + (cxT - 150) + ' ' + (baseY - 210) + ' ' + (cxT - 70) + ' ' + (baseY - 230) +
        ' L ' + (cxT - 60) + ' ' + (baseY - 300) + ' Q ' + cxT + ' ' + (baseY - 340) + ' ' + (cxT + 60) + ' ' + (baseY - 300) +
        ' L ' + (cxT + 70) + ' ' + (baseY - 230) + ' Q ' + (cxT + 150) + ' ' + (baseY - 210) + ' ' + (cxT + 120) + ' ' + (baseY - 150) +
        ' L ' + (cxT + 150) + ' ' + baseY + ' Z" fill="' + R_NEAR + '"/>';
      // crown spikes + ember eyes
      for (var sp = -2; sp <= 2; sp++) s += '<path d="M ' + (cxT + sp * 26) + ' ' + (baseY - 300) + ' l 6 -34 l 6 34 Z" fill="' + R_NEAR + '"/>';
      s += '<circle cx="' + (cxT - 16) + '" cy="' + (baseY - 286) + '" r="5" fill="' + EMBER + '"/><circle cx="' + (cxT + 16) + '" cy="' + (baseY - 286) + '" r="5" fill="' + EMBER + '"/>';
    }
    if (kind === 'churn') {
      // a towering wall of machine-haze sweeping from the east (right)
      s += '<rect x="700" y="0" width="300" height="' + H + '" fill="' + EMBER + '" opacity="0.05"/>';
      for (var c = 0; c < 60; c++) { var hx = 720 + rng.next() * 280, hy = rng.next() * H; s += '<circle cx="' + hx.toFixed(0) + '" cy="' + hy.toFixed(0) + '" r="' + (0.6 + rng.next() * 1.8).toFixed(1) + '" fill="' + EMBER + '" opacity="' + (0.1 + rng.next() * 0.35).toFixed(2) + '"/>'; }
      s += '<path d="M 720 0 Q 680 ' + (H / 2) + ' 760 ' + H + ' L 1000 ' + H + ' L 1000 0 Z" fill="' + R_NEAR + '" opacity="0.55"/>';
    }
    if (kind === 'orders') {
      // five distant standing stones, one per Order
      var glyphs = ['↑', '■', '»', '◈', '✸'];
      for (var o = 0; o < 5; o++) { var ox = 250 + o * 125; s += '<path d="M ' + (ox - 9) + ' ' + (horizon + 26) + ' L ' + (ox - 7) + ' ' + (horizon - 30) + ' L ' + (ox + 7) + ' ' + (horizon - 30) + ' L ' + (ox + 9) + ' ' + (horizon + 26) + ' Z" fill="' + R_NEAR + '"/>'; s += '<text x="' + ox + '" y="' + (horizon - 6) + '" text-anchor="middle" fill="' + EMBER + '" font-size="13" opacity="0.85">' + glyphs[o] + '</text>'; }
    }

    // near ridge (foreground, near-black) — the figure stands on it
    var nearY = horizon + 96;
    s += ridge(rng, W, H, nearY, 30, 5.7, R_NEAR, 1);

    // the tiny figure(s), dwarfed
    if (kind === 'echo') {
      s += figure(glowX, nearY + 14, 96, FIG, { wisp: true });
    } else if (kind === 'throne') {
      s += figure(500, nearY + 26, 54, FIG, { staff: true });
    } else if (kind === 'churn') {
      s += figure(300, nearY + 8, 70, FIG, {});
      s += figure(360, nearY + 16, 56, FIG, {});
    } else if (kind === 'orders') {
      s += figure(500, nearY + 14, 84, FIG, { staff: rng.chance(0.5) });
    } else {
      s += figure(300 + rng.next() * 60, nearY + 12, 80, FIG, { staff: rng.chance(0.4) });
    }

    // vignette on top
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#vig)"/>';

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" class="' + (opt.cls || 'tlu-vista') + '"><defs>' + defs + '</defs>' + s + '</svg>';
  }

  A.vista = vista;
})(window.TLU = window.TLU || {});
