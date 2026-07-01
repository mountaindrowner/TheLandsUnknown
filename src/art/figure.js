/* ============================================================
 * art/figure.js — generative full-body standees.
 *
 * The portraits gave us faces; this gives us *people*. A standing
 * figure in the same ink doctrine (parametric anatomy, seeded jitter,
 * one-sided shade), built to stand on a tile: transparent ground, a
 * cast shadow, ~120x172 viewBox. Five Orders drive silhouette and
 * kit — the Skyrender's cloak and longblade, the Stonewarden's plate
 * and maul, the Slipstrider's hood and daggers, the Veilseer's robe
 * and rift-staff, the Cinderwright's apron and ember-forge — while
 * build, height, stance, colouring and gear vary from the seed, so a
 * squad reads as kin without any two being the same.
 * ============================================================ */
(function (TLU) {
  'use strict';
  var A = TLU.Art, PAL = A.PAL;
  var CX = 60, GY = 160;                 // centre line, ground line

  function pick(rng, a) { return a[Math.floor(rng.next() * a.length)]; }

  var ORDER = {
    skyrender:   { cloth: '#5f7286', trim: '#c9a24a', cape: '#3b566e', head: 'crown', weapon: 'blade',  build: 'lean' },
    stonewarden: { cloth: '#8f8b80', trim: '#6b6459', cape: null,      head: 'helm',  weapon: 'maul',   build: 'broad' },
    slipstrider: { cloth: '#5f5648', trim: '#8a7a52', cape: '#4a4234', head: 'hood',  weapon: 'daggers',build: 'lean' },
    veilseer:    { cloth: '#6a6480', trim: '#b6a2c4', cape: '#4c4660', head: 'veil',  weapon: 'staff',  build: 'robe' },
    cinderwright:{ cloth: '#7a5a3a', trim: '#d0762c', cape: null,      head: 'cowl',  weapon: 'hammer', build: 'broad' },
  };

  function traits(seed, opt) {
    var rng = new TLU.RNG('figure:' + seed);
    var order = opt.order && ORDER[opt.order] ? opt.order : 'skyrender';
    var O = ORDER[order];
    var build = rng.chance(0.55) ? O.build : pick(rng, ['lean', 'normal', 'broad']);
    return {
      order: order, O: O, rng: rng, build: build,
      h: 0.94 + rng.next() * 0.13,
      fem: opt.fem != null ? opt.fem : rng.chance(0.45),
      cloak: O.cape && (order === 'skyrender' || order === 'veilseer' || rng.chance(0.5)),
      hair: pick(rng, ['#3a2f24', '#5a4a36', '#221d17', '#7a6a4a', '#8f877a', '#4a3a2a']),
      skin: opt.skin || pick(rng, ['#c99f78', '#b98a5e', '#8c5f3d', '#d7b389', '#9d6a45']),
      stance: rng.chance(0.5) ? 1 : -1,
      accent: opt.accent || PAL.oxblood,
      guard: rng.chance(0.5),          // shield for the warden
    };
  }

  // a tapered limb between two points, filled + inked
  function limb(rng, x0, y0, x1, y1, w0, w1, fill) {
    var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L;
    return A.stroke(rng, [[x0 + px * w0, y0 + py * w0], [x1 + px * w1, y1 + py * w1], [x1 - px * w1, y1 - py * w1], [x0 - px * w0, y0 - py * w0]],
      { close: true, fill: fill, stroke: PAL.ink, w: 1.3, amt: 0.5 });
  }
  function boot(rng, x, fill) { return A.stroke(rng, [[x - 6, GY - 6], [x - 6, GY - 1], [x + 7, GY], [x + 7, GY - 5], [x + 1, GY - 8]], { close: true, fill: fill, stroke: PAL.ink, w: 1.2, amt: 0.4 }); }

  function figure(seed, opt) {
    opt = opt || {};
    var t = traits(seed, opt), rng = t.rng, O = t.O, s = '';
    var shW = t.build === 'broad' ? 22 : t.build === 'lean' ? 15 : 18;   // shoulder half-width
    var lw = t.build === 'broad' ? 6 : t.build === 'lean' ? 4.2 : 5;     // limb half-thickness
    var shY = 62, waistY = 100, hipY = 106, headCY = 44, headR = 12.5;
    var stance = t.stance, boots = '#3a2f24';
    var g0 = '<g transform="translate(0,' + ((1 - t.h) * 40) + ') scale(1,' + t.h + ')" transform-origin="60 160">';

    // cast shadow
    s += A.ellipse(CX, GY + 2, 20, 5, { fill: 'rgba(0,0,0,0.28)', stroke: 'none' });

    // back cloak (behind the body)
    if (t.cloak) s += A.stroke(rng, [[CX - shW + 2, shY - 2], [CX - shW - 8, hipY + 4], [CX - 6, GY - 8], [CX + 10, GY - 6], [CX + shW + 6, hipY], [CX + shW - 2, shY - 2]],
      { close: true, fill: O.cape, stroke: PAL.ink, w: 1.4, amt: 0.7, op: 0.96 });

    // ---- lower body ----
    if (t.build === 'robe') {
      // a long robe skirt to the ground (Veilseer)
      s += A.stroke(rng, [[CX - shW * 0.8, waistY - 6], [CX - shW - 6, GY - 2], [CX + shW + 6, GY - 2], [CX + shW * 0.8, waistY - 6]],
        { close: true, fill: O.cloth, stroke: PAL.ink, w: 1.5, amt: 0.6 });
      for (var f = -2; f <= 2; f++) s += A.stroke(rng, [[CX + f * 9, waistY + 2], [CX + f * 11, GY - 3]], { w: 0.8, amt: 0.4, stroke: PAL.ink2, op: 0.5 });
      s += A.stroke(rng, [[CX - shW - 6, GY - 3], [CX, GY + 1], [CX + shW + 6, GY - 3]], { w: 1.2, amt: 0.4, stroke: PAL.ink });
    } else {
      var fx = CX + 9 * stance, bx = CX - 8 * stance;       // front / back foot x
      s += boot(rng, bx, boots);
      s += limb(rng, CX - 5, hipY, bx, GY - 6, lw, lw * 0.8, O.cloth);   // back leg
      s += boot(rng, fx, boots);
      s += limb(rng, CX + 5, hipY, fx, GY - 6, lw + 0.5, lw * 0.8, O.cloth); // front leg
      // knee/greave hint for plated orders
      if (O.head === 'helm') { s += A.circle(fx - 1, (hipY + GY) / 2, 3.4, { fill: '#a49c88', stroke: PAL.ink, w: 1 }); }
    }

    // ---- far arm (behind torso) ----
    var farHandY = t.order === 'veilseer' ? shY + 40 : hipY + 6;
    s += limb(rng, CX - shW + 2, shY + 2, CX - shW - 4, farHandY, lw - 0.4, lw - 1, O.cloth);

    // ---- torso ----
    var torso = [[CX - shW, shY], [CX + shW, shY], [CX + shW * 0.72, waistY], [CX + shW * 0.82, hipY], [CX - shW * 0.82, hipY], [CX - shW * 0.72, waistY]];
    s += A.stroke(rng, torso, { close: true, fill: O.cloth, stroke: PAL.ink, w: 1.6, amt: 0.5 });
    // chest/gear detailing per order
    s += gear(rng, t, shW, shY, waistY, hipY);
    // one-sided shade (left third)
    s += A.stroke(rng, [[CX - shW, shY], [CX - shW * 0.72, waistY], [CX - shW * 0.5, waistY], [CX - shW * 0.6, shY]], { close: true, fill: 'rgba(20,16,10,0.18)', stroke: 'none' });

    // ---- neck + head ----
    s += limb(rng, CX, shY, CX, shY - 8, 4.5, 4, t.skin);
    s += head(rng, t, headCY, headR);

    // ---- near arm + weapon ----
    s += nearArmWeapon(rng, t, shW, shY, hipY);

    // belt
    if (t.build !== 'robe') s += A.stroke(rng, [[CX - shW * 0.78, hipY - 2], [CX + shW * 0.78, hipY - 2]], { w: 2.6, amt: 0.3, stroke: O.trim });

    var inner = g0 + s + '</g>';
    return A.svg(120, 172, inner, { paper: false, cls: opt.cls || 'tlu-figure' });
  }

  // chest plate / straps / apron by order
  function gear(rng, t, shW, shY, waistY, hipY) {
    var O = t.O, s = '';
    if (O.head === 'helm') { // warden: a breastplate seam + rivets
      s += A.stroke(rng, [[CX, shY + 2], [CX, hipY - 2]], { w: 1, amt: 0.3, stroke: PAL.ink2 });
      s += A.stroke(rng, [[CX - shW * 0.7, shY + 6], [CX + shW * 0.7, shY + 6]], { w: 1, amt: 0.3, stroke: PAL.ink2 });
      // pauldrons
      s += A.stroke(rng, [[CX - shW - 3, shY - 1], [CX - shW + 5, shY - 6], [CX - shW * 0.4, shY + 2]], { close: true, fill: '#a49c88', stroke: PAL.ink, w: 1.2, amt: 0.4 });
      s += A.stroke(rng, [[CX + shW + 3, shY - 1], [CX + shW - 5, shY - 6], [CX + shW * 0.4, shY + 2]], { close: true, fill: '#a49c88', stroke: PAL.ink, w: 1.2, amt: 0.4 });
    } else if (t.order === 'skyrender') { // a diagonal sash in the accent
      s += A.stroke(rng, [[CX - shW * 0.8, shY + 3], [CX + shW * 0.7, hipY - 4]], { w: 3, amt: 0.4, stroke: t.accent, op: 0.9 });
      s += A.circle(CX + 2, shY + 8, 2.4, { fill: O.trim, stroke: PAL.ink, w: 0.8 });
    } else if (t.order === 'cinderwright') { // a forge apron + ember at the belt
      s += A.stroke(rng, [[CX - shW * 0.6, shY + 8], [CX - shW * 0.6, hipY], [CX + shW * 0.6, hipY], [CX + shW * 0.6, shY + 8]], { close: true, fill: '#5a4632', stroke: PAL.ink, w: 1.2, amt: 0.4 });
      s += A.circle(CX + shW * 0.5, hipY - 4, 2.6, { fill: O.trim, stroke: 'none' });
    } else if (t.order === 'slipstrider') { // crossed straps
      s += A.stroke(rng, [[CX - shW * 0.8, shY + 2], [CX + shW * 0.7, hipY - 3]], { w: 1.8, amt: 0.3, stroke: '#3a2f24' });
      s += A.stroke(rng, [[CX + shW * 0.8, shY + 2], [CX - shW * 0.7, hipY - 3]], { w: 1.8, amt: 0.3, stroke: '#3a2f24' });
    } else if (t.order === 'veilseer') { // a hung amulet
      s += A.stroke(rng, [[CX - 5, shY + 3], [CX, shY + 12], [CX + 5, shY + 3]], { w: 0.9, amt: 0.3, stroke: O.trim });
      s += A.circle(CX, shY + 13, 2.4, { fill: t.accent, stroke: PAL.ink, w: 0.8 });
    }
    return s;
  }

  function head(rng, t, cy, r) {
    var O = t.O, s = '', hd = O.head;
    if (hd === 'helm') {
      s += A.stroke(rng, [[CX - r, cy + 3], [CX - r, cy - r * 0.6], [CX - r * 0.5, cy - r], [CX + r * 0.5, cy - r], [CX + r, cy - r * 0.6], [CX + r, cy + 3], [CX + r * 0.6, cy + 7], [CX - r * 0.6, cy + 7]],
        { close: true, fill: '#a49c88', stroke: PAL.ink, w: 1.4, amt: 0.4 });
      s += A.stroke(rng, [[CX, cy - r], [CX, cy + 6]], { w: 1.4, amt: 0.2, stroke: PAL.ink2 });          // nasal
      s += A.stroke(rng, [[CX - r * 0.7, cy], [CX - r * 0.2, cy]], { w: 1.6, amt: 0.2, stroke: PAL.ink });// eye slits
      s += A.stroke(rng, [[CX + r * 0.2, cy], [CX + r * 0.7, cy]], { w: 1.6, amt: 0.2, stroke: PAL.ink });
      s += A.stroke(rng, [[CX - r * 0.6, cy - r - 2], [CX, cy - r - 9], [CX + r * 0.6, cy - r - 2]], { close: true, fill: t.accent, stroke: PAL.ink, w: 1, amt: 0.3 }); // crest
    } else if (hd === 'hood' || hd === 'cowl') {
      // a pointed cowl, face in shadow with two eye-glints
      s += A.stroke(rng, [[CX - r - 1, cy + 6], [CX - r + 1, cy - r + 2], [CX, cy - r - 4], [CX + r - 1, cy - r + 2], [CX + r + 1, cy + 6], [CX + r - 3, cy + 9], [CX - r + 3, cy + 9]],
        { close: true, fill: t.O.cloth, stroke: PAL.ink, w: 1.4, amt: 0.5 });
      s += A.stroke(rng, [[CX - r + 2, cy + 1], [CX, cy + 5], [CX + r - 2, cy + 1], [CX, cy - 3]], { close: true, fill: 'rgba(20,16,12,0.85)', stroke: 'none' });
      s += A.circle(CX - 3.5, cy + 1, 1, { fill: hd === 'cowl' ? t.accent : '#d8cbb0', stroke: 'none' });
      s += A.circle(CX + 3.5, cy + 1, 1, { fill: hd === 'cowl' ? t.accent : '#d8cbb0', stroke: 'none' });
    } else if (hd === 'veil') {
      s += A.stroke(rng, [[CX - r - 1, cy + 8], [CX - r, cy - r + 2], [CX, cy - r - 3], [CX + r, cy - r + 2], [CX + r + 1, cy + 8]],
        { close: true, fill: t.O.cloth, stroke: PAL.ink, w: 1.4, amt: 0.5 });
      s += A.stroke(rng, [[CX - r + 1, cy + 1], [CX + r - 1, cy + 1]], { w: 5, amt: 0.2, stroke: 'rgba(20,16,12,0.7)' });
      s += A.stroke(rng, [[CX - r * 0.6, cy], [CX + r * 0.6, cy]], { w: 1.4, amt: 0.2, stroke: t.accent, op: 0.9 }); // glowing eye-line
      s += A.stroke(rng, [[CX - r, cy + 8], [CX, cy + 12], [CX + r, cy + 8]], { w: 1, amt: 0.3, stroke: t.O.trim, op: 0.6 });
    } else { // bare: face + hair (crown / open)
      s += A.stroke(rng, [[CX - r * 0.8, cy - r * 0.5], [CX - r * 0.85, cy + r * 0.5], [CX - r * 0.4, cy + r], [CX + r * 0.4, cy + r], [CX + r * 0.85, cy + r * 0.5], [CX + r * 0.8, cy - r * 0.5], [CX, cy - r]],
        { close: true, fill: t.skin, stroke: PAL.ink, w: 1.3, amt: 0.4 });
      // hair
      s += A.stroke(rng, [[CX - r * 0.9, cy], [CX - r, cy - r * 0.8], [CX, cy - r - 2], [CX + r, cy - r * 0.8], [CX + r * 0.9, cy - r * 0.2], [CX + r * 0.5, cy - r * 0.6], [CX, cy - r * 0.9], [CX - r * 0.5, cy - r * 0.6]],
        { close: true, fill: t.hair, stroke: PAL.ink, w: 1.1, amt: 0.5 });
      s += A.stroke(rng, [[CX - r * 0.45, cy], [CX - r * 0.15, cy]], { w: 1.2, amt: 0.2, stroke: PAL.ink });
      s += A.stroke(rng, [[CX + r * 0.15, cy], [CX + r * 0.45, cy]], { w: 1.2, amt: 0.2, stroke: PAL.ink });
      s += A.stroke(rng, [[CX - 1.5, cy + 3], [CX + 1.5, cy + 4]], { w: 1, amt: 0.2, stroke: PAL.ink2 }); // mouth
      if (t.order === 'skyrender') s += A.stroke(rng, [[CX - r * 0.7, cy - r * 0.5], [CX + r * 0.7, cy - r * 0.5]], { w: 1.6, amt: 0.2, stroke: t.O.trim }); // circlet
    }
    return s;
  }

  function nearArmWeapon(rng, t, shW, shY, hipY) {
    var O = t.O, s = '', lw = t.build === 'broad' ? 5.5 : 4.4;
    var sx = CX + shW - 1, hx, hy;    // shoulder origin, hand target
    if (O.weapon === 'staff') {
      hx = CX + shW + 4; hy = shY + 26;
      s += limb(rng, sx, shY + 2, hx, hy, lw, lw - 1, O.cloth);
      s += A.stroke(rng, [[hx, hy - 34], [hx + 2, GY - 8]], { w: 2.4, amt: 0.4, stroke: '#6a5c44' });   // staff shaft
      s += A.circle(hx, hy - 36, 5, { fill: t.accent, stroke: PAL.ink, w: 1.2 });                       // rift orb
      s += A.circle(hx, hy - 36, 8.5, { fill: 'none', stroke: t.O.trim, w: 1, op: 0.5 });
    } else if (O.weapon === 'blade') {
      hx = CX + shW + 6; hy = hipY - 6;
      s += limb(rng, sx, shY + 2, hx, hy, lw, lw - 1, O.cloth);
      s += A.stroke(rng, [[hx, hy], [hx + 16, hy - 40]], { w: 3, amt: 0.3, stroke: '#c8c2b0', cap: 'butt' }); // blade
      s += A.stroke(rng, [[hx + 15, hy - 39], [hx + 18, hy - 44]], { w: 2, amt: 0.2, stroke: '#e6e0cd' });
      s += A.stroke(rng, [[hx - 4, hy + 1], [hx + 5, hy - 4]], { w: 2.2, amt: 0.2, stroke: O.trim });        // guard
    } else if (O.weapon === 'maul') {
      hx = CX + shW + 5; hy = hipY - 2;
      s += limb(rng, sx, shY + 2, hx, hy, lw + 0.5, lw, O.cloth);
      s += A.stroke(rng, [[hx, hy + 6], [hx + 6, hy - 34]], { w: 3, amt: 0.3, stroke: '#6a5c44' });          // haft
      s += A.stroke(rng, [[hx + 1, hy - 32], [hx + 12, hy - 30], [hx + 12, hy - 44], [hx + 1, hy - 46]], { close: true, fill: '#8f8b80', stroke: PAL.ink, w: 1.3, amt: 0.3 }); // head
    } else if (O.weapon === 'hammer') {
      hx = CX + shW + 4; hy = hipY - 4;
      s += limb(rng, sx, shY + 2, hx, hy, lw + 0.5, lw, O.cloth);
      s += A.stroke(rng, [[hx, hy + 4], [hx + 4, hy - 22]], { w: 2.6, amt: 0.3, stroke: '#6a5c44' });
      s += A.stroke(rng, [[hx + 1, hy - 20], [hx + 10, hy - 19], [hx + 10, hy - 29], [hx + 1, hy - 30]], { close: true, fill: '#5a5346', stroke: PAL.ink, w: 1.2, amt: 0.3 });
      s += A.circle(hx + 6, hy - 24, 1.6, { fill: O.trim, stroke: 'none' });                                  // ember on the face
    } else if (O.weapon === 'daggers') {
      hx = CX + shW + 3; hy = hipY - 4;
      s += limb(rng, sx, shY + 2, hx, hy, lw, lw - 1, O.cloth);
      s += A.stroke(rng, [[hx, hy], [hx + 12, hy - 14]], { w: 2, amt: 0.2, stroke: '#c8c2b0', cap: 'butt' });
      // second dagger in the far hand
      s += A.stroke(rng, [[CX - shW - 2, hipY + 4], [CX - shW - 12, hipY - 8]], { w: 2, amt: 0.2, stroke: '#c8c2b0', cap: 'butt' });
    }
    // a shield slung for a guarding warden
    if (t.order === 'stonewarden' && t.guard) {
      s += A.stroke(rng, [[CX - shW - 2, shY + 6], [CX - shW - 12, shY + 14], [CX - shW - 10, hipY - 2], [CX - shW, hipY - 6]],
        { close: true, fill: '#7a7264', stroke: PAL.ink, w: 1.4, amt: 0.4 });
      s += A.circle(CX - shW - 6, (shY + hipY) / 2 + 2, 2.4, { fill: t.accent, stroke: PAL.ink, w: 0.9 });
    }
    return s;
  }

  A.figure = figure;
  A.figureTraits = traits;
  A.ORDERS = Object.keys(ORDER);
})(window.TLU = window.TLU || {});
