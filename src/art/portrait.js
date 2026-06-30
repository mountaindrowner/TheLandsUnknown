/* ============================================================
 * art/portrait.js — generative inked character portraits.
 *
 * One number in, one face out. A seed is expanded into a deep trait
 * model (skull, brow, eyes, nose, mouth, hair, headwear, markings,
 * adornments, age, bearing) and rendered as an engraved bust in a
 * roundel — the way a field journal would plate a person it met.
 *
 * The point of the exercise: an essentially infinite, internally
 * consistent cast that no one hand-drew. Echoes and bosses get their
 * own hollowed treatments. Every draw is deterministic, so a face is
 * a face for as long as its owner exists.
 * ============================================================ */
(function (TLU) {
  'use strict';
  var A = TLU.Art, PAL = A.PAL;

  // role → accent ink + which headwear table to draw from
  var ROLE = {
    warrior:    { ink: PAL.oxblood, head: ['helm', 'crop', 'topknot', 'swept', 'crop'], build: 1.12, brow: 'heavy' },
    warden:     { ink: PAL.blue,    head: ['greathelm', 'hood', 'crop', 'swept'],       build: 1.18, brow: 'straight' },
    skirmisher: { ink: PAL.green,   head: ['hood', 'bandana', 'braid', 'wavy', 'crop'], build: 0.92, brow: 'arched' },
    channeler:  { ink: '#6a4a86',   head: ['diadem', 'long', 'veil', 'wavy', 'long'],   build: 0.9,  brow: 'arched' },
    explorer:   { ink: PAL.gold,    head: ['widehat', 'hood', 'braid', 'swept', 'wavy'], build: 1.0, brow: 'straight' },
    folk:       { ink: PAL.ink2,    head: ['crop', 'long', 'wavy', 'cap', 'braid', 'swept', 'bald'], build: 1.0, brow: 'straight' },
  };
  var SHAPES = ['oval', 'square', 'round', 'long', 'heart', 'angular'];
  var EYES = ['almond', 'round', 'narrow', 'hooded', 'wide'];
  var NOSES = ['straight', 'aquiline', 'broad', 'snub', 'hooked'];
  var MOUTHS = ['neutral', 'set', 'wry', 'frown', 'soft'];
  var FHAIR = ['none', 'none', 'stubble', 'beard', 'mustache', 'goatee'];
  var MARKS = ['none', 'none', 'scar', 'cheekmark', 'warpaint', 'brand'];

  function pick(rng, arr) { return arr[Math.floor(rng.next() * arr.length)]; }

  // build the full trait model from seed + hints
  function traits(seed, opt) {
    opt = opt || {};
    var rng = new TLU.RNG('portrait:' + seed);
    var roleKey = opt.role && ROLE[opt.role] ? opt.role : pick(rng, ['warrior', 'skirmisher', 'channeler', 'explorer', 'folk']);
    var role = ROLE[roleKey];
    var age = opt.age || pick(rng, ['young', 'prime', 'prime', 'weathered', 'weathered', 'old']);
    var fem = opt.fem != null ? opt.fem : rng.chance(0.5);
    var t = {
      role: roleKey, accent: opt.accent || role.ink, build: role.build,
      shape: pick(rng, SHAPES), eyes: pick(rng, EYES), nose: pick(rng, NOSES),
      mouth: pick(rng, MOUTHS), brow: role.brow, hair: pick(rng, role.head),
      fhair: fem ? 'none' : pick(rng, FHAIR), mark: pick(rng, MARKS),
      gaze: rng.float(-1, 1), age: age, fem: fem,
      earring: rng.chance(0.25), throat: rng.chance(0.55), shade: rng.chance(0.7),
      shadeAng: rng.chance(0.5) ? -1 : 1, complexion: rng.int(0, 3),
    };
    if (age === 'old') t.fhair = t.fhair === 'none' && !fem && rng.chance(0.5) ? 'beard' : t.fhair;
    // women rarely wear shaved crops — give them length more often
    if (fem && (t.hair === 'crop' || t.hair === 'swept' || t.hair === 'bald') && rng.chance(0.7)) t.hair = rng.chance(0.5) ? 'long' : 'wavy';
    return t;
  }

  // ---- one bust, given a trait model -----------------------------------
  function draw(t, opt) {
    opt = opt || {};
    var cx = 100, defs = '', body = '';
    var topY = 33, browY = 79, eyeY = 93, noseY = 111, mouthY = 128, chinY = 150;
    var sh = { oval: 38, square: 44, round: 42, long: 35, heart: 40, angular: 41 }[t.shape] * (0.92 + t.build * 0.08);
    var jaw = { oval: 26, square: 38, round: 32, long: 24, heart: 20, angular: 30 }[t.shape] * (0.95 + t.build * 0.05);
    var chin = { oval: 9, square: 16, round: 13, long: 8, heart: 7, angular: 11 }[t.shape];
    var rng = new TLU.RNG('draw:' + (t._seed || ''));
    var ink = PAL.ink, lw = 2.1;

    // shoulders / cloak (a journal bust ends at the collarbone)
    body += A.stroke(rng, [
      [cx - 78, 200], [cx - 70, 176], [cx - 40, 162], [cx - 20, 156],
      [cx, 153], [cx + 20, 156], [cx + 40, 162], [cx + 70, 176], [cx + 78, 200],
    ], { close: true, fill: PAL.paper2, w: lw, amt: 1.1 });
    // collar fold lines
    body += A.stroke(rng, [[cx - 30, 166], [cx - 10, 178], [cx, 182]], { w: 1.2, amt: 0.6, stroke: PAL.ink2 });
    body += A.stroke(rng, [[cx + 30, 166], [cx + 10, 178], [cx, 182]], { w: 1.2, amt: 0.6, stroke: PAL.ink2 });
    // neck
    body += A.stroke(rng, [[cx - 14, chinY - 6], [cx - 13, 160]], { w: lw, amt: 0.5 });
    body += A.stroke(rng, [[cx + 14, chinY - 6], [cx + 13, 160]], { w: lw, amt: 0.5 });

    // face outline
    var face = [
      [cx - sh, browY - 4], [cx - sh * 0.74, topY + 7], [cx, topY], [cx + sh * 0.74, topY + 7],
      [cx + sh, browY - 4], [cx + sh * 0.97, eyeY + 7], [cx + jaw, mouthY + 4],
      [cx + chin, chinY - 6], [cx, chinY], [cx - chin, chinY - 6], [cx - jaw, mouthY + 4],
      [cx - sh * 0.97, eyeY + 7],
    ];
    body += A.stroke(rng, face, { close: true, fill: PAL.paper, w: lw, amt: 0.7 });

    // ears
    body += A.stroke(rng, [[cx - sh, eyeY - 2], [cx - sh - 7, eyeY + 4], [cx - sh - 4, eyeY + 14], [cx - sh + 2, eyeY + 16]], { w: 1.6, amt: 0.4, fill: PAL.paper });
    body += A.stroke(rng, [[cx + sh, eyeY - 2], [cx + sh + 7, eyeY + 4], [cx + sh + 4, eyeY + 14], [cx + sh - 2, eyeY + 16]], { w: 1.6, amt: 0.4, fill: PAL.paper });
    if (t.earring) body += A.circle(cx + sh + 3, eyeY + 17, 2.2, { fill: t.accent, stroke: ink, w: 1 });

    // ---- cheek / jaw shading (engraved hatch on one side) ----
    if (t.shade) {
      var hid = 'sh_' + A.uid();
      var dens = [5, 4, 3.4, 2.8][t.complexion];
      var hh = A.hatch(hid, { gap: dens, angle: 50 * t.shadeAng, op: 0.32, w: 0.8 });
      defs += hh.def;
      var s = t.shadeAng;
      var shade = [
        [cx + s * sh * 0.5, eyeY + 6], [cx + s * sh * 0.98, eyeY + 8],
        [cx + s * jaw, mouthY + 2], [cx + s * chin, chinY - 8], [cx + s * 6, chinY - 4],
        [cx + s * 10, mouthY], [cx + s * 16, eyeY + 14],
      ];
      body += A.stroke(rng, shade, { close: true, fill: hh.ref, stroke: 'none', amt: 0.4 });
    }
    // under-jaw shadow always (grounds the head)
    var uid2 = 'uj_' + A.uid();
    var uj = A.hatch(uid2, { gap: 3.4, angle: -50, op: 0.28, w: 0.8 });
    defs += uj.def;
    body += A.stroke(rng, [[cx - jaw + 4, mouthY + 8], [cx - chin, chinY - 5], [cx, chinY + 1], [cx + chin, chinY - 5], [cx + jaw - 4, mouthY + 8], [cx, mouthY + 14]], { close: true, fill: uj.ref, stroke: 'none', amt: 0.4 });

    // ---- brows ----
    var bdx = 17, bw = t.brow === 'heavy' ? 3 : 2;
    var browL, browR, by = browY;
    if (t.brow === 'arched') { browL = [[cx - bdx - 8, by], [cx - bdx, by - 4], [cx - bdx + 7, by - 1]]; browR = [[cx + bdx - 7, by - 1], [cx + bdx, by - 4], [cx + bdx + 8, by]]; }
    else if (t.brow === 'heavy') { browL = [[cx - bdx - 9, by - 1], [cx - bdx, by - 2], [cx - bdx + 8, by + 1]]; browR = [[cx + bdx - 8, by + 1], [cx + bdx, by - 2], [cx + bdx + 9, by - 1]]; }
    else { browL = [[cx - bdx - 8, by - 1], [cx - bdx, by - 2], [cx - bdx + 8, by]]; browR = [[cx + bdx - 8, by], [cx + bdx, by - 2], [cx + bdx + 8, by - 1]]; }
    body += A.stroke(rng, browL, { w: bw, amt: 0.5 });
    body += A.stroke(rng, browR, { w: bw, amt: 0.5 });

    // ---- eyes ----
    var gaze = t.gaze * 2.4;
    [-1, 1].forEach(function (sgn) {
      var ex = cx + sgn * bdx, ey = eyeY;
      var w = t.eyes === 'wide' ? 11 : t.eyes === 'narrow' ? 8.5 : 10;
      var hgt = t.eyes === 'round' ? 6 : t.eyes === 'narrow' ? 3 : t.eyes === 'hooded' ? 3.6 : 4.6;
      // upper + lower lid
      body += A.stroke(rng, [[ex - w, ey], [ex, ey - hgt], [ex + w, ey]], { w: 1.7, amt: 0.3 });
      body += A.stroke(rng, [[ex - w + 1, ey + 1], [ex, ey + hgt * 0.8], [ex + w - 1, ey + 1]], { w: 1.3, amt: 0.3 });
      if (t.eyes === 'hooded') body += A.stroke(rng, [[ex - w, ey - 1], [ex, ey - hgt - 2], [ex + w, ey - 1]], { w: 1, amt: 0.3, stroke: PAL.ink2 });
      // iris + pupil (gaze offset)
      body += A.circle(ex + gaze, ey + 0.5, 2.7, { fill: PAL.ink, stroke: 'none' });
      body += A.circle(ex + gaze - 0.8, ey - 0.4, 0.8, { fill: PAL.paper, stroke: 'none' });
    });

    // ---- nose ----
    var nb = noseY, nx = cx + gaze * 0.5;
    if (t.nose === 'aquiline' || t.nose === 'hooked') {
      body += A.stroke(rng, [[cx - 2, browY + 6], [nx + (t.nose === 'hooked' ? 5 : 3), nb - 6], [nx + 2, nb], [nx - 4, nb + 2]], { w: 1.5, amt: 0.35 });
    } else if (t.nose === 'broad') {
      body += A.stroke(rng, [[cx - 2, browY + 8], [nx - 1, nb - 2], [nx - 6, nb + 2]], { w: 1.4, amt: 0.35 });
      body += A.stroke(rng, [[nx - 6, nb + 2], [nx, nb + 4], [nx + 6, nb + 2]], { w: 1.3, amt: 0.3 });
    } else if (t.nose === 'snub') {
      body += A.stroke(rng, [[cx - 1, browY + 10], [nx - 3, nb - 1], [nx + 2, nb + 1]], { w: 1.4, amt: 0.3 });
    } else {
      body += A.stroke(rng, [[cx - 1, browY + 6], [nx - 2, nb - 3], [nx - 5, nb + 1]], { w: 1.4, amt: 0.35 });
    }
    // nostril hint
    body += A.stroke(rng, [[nx + 3, nb + 1], [nx + 5, nb + 2]], { w: 1, amt: 0.2, stroke: PAL.ink2 });

    // ---- mouth ----
    var mw = 13, my = mouthY, curve = { neutral: 0, set: -0.5, wry: 0, frown: 3, soft: -2 }[t.mouth];
    var mPts;
    if (t.mouth === 'wry') mPts = [[cx - mw, my + 1], [cx, my], [cx + mw, my - 2.5]];
    else mPts = [[cx - mw, my + (curve < 0 ? 1 : 0)], [cx, my + curve], [cx + mw, my + (curve < 0 ? 1 : 0)]];
    body += A.stroke(rng, mPts, { w: 1.8, amt: 0.3 });
    if (t.mouth !== 'set') body += A.stroke(rng, [[cx - mw + 2, my - 3], [cx, my - 2], [cx + mw - 2, my - 3]], { w: 0.9, amt: 0.2, stroke: PAL.ink2 });

    // ---- facial hair ----
    if (t.fhair === 'stubble') body += A.stipple(rng, cx, my + 8, jaw - 4, 14, 90, { op: 0.5, r: 0.55 });
    else if (t.fhair === 'beard') {
      body += A.stroke(rng, [[cx - jaw + 2, mouthY - 2], [cx - jaw + 4, chinY], [cx, chinY + 12], [cx + jaw - 4, chinY], [cx + jaw - 2, mouthY - 2], [cx, mouthY + 6]], { close: true, fill: PAL.ink2, w: 1.4, amt: 0.6, op: 0.92 });
      body += A.stipple(rng, cx, chinY - 2, jaw - 6, 12, 60, { op: 0.4, color: PAL.ink });
    } else if (t.fhair === 'goatee') {
      body += A.stroke(rng, [[cx - 8, my + 4], [cx - 7, chinY + 2], [cx, chinY + 9], [cx + 7, chinY + 2], [cx + 8, my + 4]], { close: true, fill: PAL.ink2, w: 1.3, amt: 0.5, op: 0.9 });
    }
    if (t.fhair === 'mustache' || t.fhair === 'beard' || t.fhair === 'goatee') body += A.stroke(rng, [[cx - mw, my - 2], [cx - 4, my + 1], [cx, my - 1], [cx + 4, my + 1], [cx + mw, my - 2]], { w: 2, amt: 0.4, stroke: PAL.ink2 });

    // ---- age lines ----
    if (t.age === 'weathered' || t.age === 'old') {
      body += A.stroke(rng, [[cx - bdx - 4, browY - 8], [cx + bdx + 4, browY - 8]], { w: 0.8, amt: 0.4, stroke: PAL.ink2, op: 0.7 });
      if (t.age === 'old') body += A.stroke(rng, [[cx - bdx - 6, browY - 13], [cx + bdx + 6, browY - 13]], { w: 0.7, amt: 0.4, stroke: PAL.ink2, op: 0.55 });
      // nasolabial hint
      body += A.stroke(rng, [[nx - 8, nb + 2], [cx - mw - 2, my - 2]], { w: 0.8, amt: 0.3, stroke: PAL.ink2, op: 0.6 });
    }

    // ---- markings ----
    if (t.mark === 'scar') body += A.stroke(rng, [[cx - bdx - 6, browY - 6], [cx - bdx + 2, eyeY + 8]], { w: 1.4, amt: 0.3, stroke: PAL.oxblood, op: 0.8 });
    else if (t.mark === 'cheekmark') { for (var m = 0; m < 3; m++) body += A.stroke(rng, [[cx + 12 + m * 5, eyeY + 8], [cx + 14 + m * 5, mouthY]], { w: 1.4, amt: 0.3, stroke: t.accent, op: 0.75 }); }
    else if (t.mark === 'warpaint') body += A.stroke(rng, [[cx - sh * 0.9, eyeY - 3], [cx - 4, eyeY - 5], [cx + sh * 0.9, eyeY - 3]], { w: 4.5, amt: 0.5, stroke: t.accent, op: 0.42, cap: 'butt' });
    else if (t.mark === 'brand') body += A.circle(cx, browY - 16, 4.5, { stroke: t.accent, w: 1.4, op: 0.8 });

    // ---- hair / headwear (drawn over the cranium) ----
    body = hair(rng, t, { cx: cx, topY: topY, browY: browY, sh: sh, eyeY: eyeY }) + body;

    // ---- throat gem ----
    if (t.throat) {
      body += A.path('M ' + cx + ' 170 l 4 5 l -4 5 l -4 -5 Z', { fill: t.accent, stroke: PAL.ink, w: 1.2 });
    }
    return { defs: defs, body: body };
  }

  // hair & headwear pass (returns markup drawn BEHIND the face features)
  function hair(rng, t, g) {
    var cx = g.cx, topY = g.topY, browY = g.browY, sh = g.sh, eyeY = g.eyeY, ink = PAL.ink, out = '';
    var dark = t.age === 'old' ? PAL.faint : (t.age === 'weathered' ? '#5a5040' : PAL.ink2);
    // a forehead hairline shape: -1 receding, 0 straight, 1 widow's peak
    var line = new TLU.RNG('hl:' + (t._seed || '') + t.hair).int(-1, 1);
    var hlY = browY - (line < 0 ? 18 : 10);  // receding sits higher
    var peak = line > 0 ? 7 : 0;
    switch (t.hair) {
      case 'crop':
        out += A.stroke(rng, [
          [cx - sh - 2, eyeY - 4], [cx - sh - 2, browY - 12], [cx - sh * 0.5, topY - 3], [cx, topY - 7], [cx + sh * 0.5, topY - 3], [cx + sh + 2, browY - 12], [cx + sh + 2, eyeY - 4],
          [cx + sh - 5, hlY - 2], [cx + 11, hlY + 2], [cx, hlY - peak], [cx - 11, hlY + 2], [cx - sh + 5, hlY - 2],
        ], { close: true, fill: dark, w: 1.7, amt: 0.7 });
        break;
      case 'swept':
        out += A.stroke(rng, [
          [cx - sh - 2, eyeY - 2], [cx - sh - 2, browY - 12], [cx - sh * 0.4, topY - 4], [cx + sh * 0.2, topY - 8], [cx + sh + 4, browY - 16], [cx + sh + 3, eyeY - 4],
          [cx + sh - 6, browY - 14], [cx + 4, hlY - 4], [cx - 16, hlY + 2], [cx - sh + 6, hlY],
        ], { close: true, fill: dark, w: 1.7, amt: 0.8 });
        // a few swept strands
        out += A.stroke(rng, [[cx - sh + 4, hlY], [cx + 2, hlY - 6], [cx + sh - 6, browY - 14]], { w: 0.8, amt: 0.5, stroke: PAL.paper2, op: 0.5 });
        break;
      case 'wavy':
        out += A.stroke(rng, [
          [cx - sh - 5, eyeY + 14], [cx - sh - 6, browY - 6], [cx - sh * 0.4, topY - 5], [cx, topY - 9], [cx + sh * 0.4, topY - 5], [cx + sh + 6, browY - 6], [cx + sh + 5, eyeY + 14],
          [cx + sh - 2, eyeY], [cx + sh - 5, hlY], [cx + 12, hlY + 3], [cx, hlY - peak], [cx - 12, hlY + 3], [cx - sh + 5, hlY], [cx - sh + 2, eyeY],
        ], { close: true, fill: dark, w: 1.6, amt: 1.2 });
        // wave lines
        out += A.stroke(rng, [[cx - sh + 4, hlY + 4], [cx - sh * 0.3, topY + 4], [cx, hlY - 2]], { w: 0.8, amt: 0.6, stroke: PAL.paper2, op: 0.4 });
        out += A.stroke(rng, [[cx + sh - 4, hlY + 4], [cx + sh * 0.3, topY + 4], [cx, hlY - 1]], { w: 0.8, amt: 0.6, stroke: PAL.paper2, op: 0.4 });
        break;
      case 'long':
        out += A.stroke(rng, [[cx - sh - 7, eyeY + 36], [cx - sh - 9, browY], [cx - sh + 1, topY], [cx, topY - 7], [cx + sh - 1, topY], [cx + sh + 9, browY], [cx + sh + 7, eyeY + 36], [cx + sh - 1, eyeY + 8], [cx + sh - 6, hlY], [cx, topY + 2], [cx - sh + 6, hlY], [cx - sh + 1, eyeY + 8]], { close: true, fill: dark, w: 1.6, amt: 1, op: 0.96 });
        out += A.stroke(rng, [[cx - sh - 3, browY + 6], [cx - sh - 2, eyeY + 26]], { w: 0.8, amt: 0.5, stroke: PAL.paper2, op: 0.35 });
        break;
      case 'braid':
        out += A.stroke(rng, [[cx - sh - 2, eyeY - 2], [cx - sh - 1, browY - 10], [cx, topY - 6], [cx + sh + 1, browY - 10], [cx + sh + 2, eyeY - 2], [cx + sh - 5, hlY], [cx, hlY - peak], [cx - sh + 5, hlY]], { fill: dark, w: 1.7, amt: 0.7, close: true });
        out += A.stroke(rng, [[cx + sh - 2, browY + 4], [cx + sh + 8, eyeY + 18], [cx + sh + 4, eyeY + 40], [cx + sh + 10, eyeY + 58]], { w: 3.4, amt: 0.6, stroke: dark });
        for (var b = 0; b < 4; b++) out += A.circle(cx + sh + 5 + (b % 2) * 2, eyeY + 18 + b * 11, 2, { stroke: dark, w: 1 });
        break;
      case 'topknot':
        out += A.stroke(rng, [[cx - sh, eyeY - 4], [cx - sh, browY - 8], [cx, topY + 4], [cx + sh, browY - 8], [cx + sh, eyeY - 4], [cx + sh - 5, hlY], [cx, hlY - 3], [cx - sh + 5, hlY]], { fill: dark, w: 1.6, amt: 0.6, close: true });
        out += A.circle(cx, topY - 1, 7, { fill: dark, w: 1.6 });
        out += A.stroke(rng, [[cx, topY - 8], [cx + 2, topY - 18]], { w: 2, amt: 0.4, stroke: dark });
        break;
      case 'bald':
        out += A.stroke(rng, [[cx - sh * 0.55, topY + 11], [cx, topY + 5], [cx + sh * 0.55, topY + 11]], { w: 0.8, amt: 0.3, stroke: PAL.ink2, op: 0.35 });
        // a faint fringe at the sides so it reads shaved, not absent
        out += A.stroke(rng, [[cx - sh - 1, eyeY - 2], [cx - sh - 1, browY - 4]], { w: 2, amt: 0.4, stroke: dark, op: 0.6 });
        out += A.stroke(rng, [[cx + sh + 1, eyeY - 2], [cx + sh + 1, browY - 4]], { w: 2, amt: 0.4, stroke: dark, op: 0.6 });
        break;
      case 'cap':
        out += A.stroke(rng, [[cx - sh - 2, browY], [cx - sh + 2, topY + 4], [cx, topY - 2], [cx + sh - 2, topY + 4], [cx + sh + 2, browY]], { close: true, fill: dark, w: 1.8, amt: 0.6 });
        out += A.stroke(rng, [[cx - sh - 2, browY], [cx + sh + 2, browY]], { w: 2, amt: 0.4 });
        break;
      case 'hood':
        out += A.stroke(rng, [[cx - sh - 12, eyeY + 36], [cx - sh - 14, browY - 6], [cx - sh * 0.5, topY - 12], [cx, topY - 16], [cx + sh * 0.5, topY - 12], [cx + sh + 14, browY - 6], [cx + sh + 12, eyeY + 36], [cx + sh + 2, eyeY + 30], [cx + sh - 2, browY - 2], [cx, topY - 3], [cx - sh + 2, browY - 2], [cx - sh - 2, eyeY + 30]], { close: true, fill: PAL.paper2, w: 2.2, amt: 0.9 });
        out += A.stroke(rng, [[cx - sh - 6, browY - 2], [cx, topY - 5], [cx + sh + 6, browY - 2]], { w: 1.2, amt: 0.5, stroke: PAL.ink2 });
        break;
      case 'bandana':
        out += A.stroke(rng, [[cx - sh - 1, browY - 4], [cx, topY], [cx + sh + 1, browY - 4]], { close: true, fill: dark, w: 1.6, amt: 0.5 });
        out += A.stroke(rng, [[cx - sh - 2, browY - 5], [cx + sh + 2, browY - 7]], { w: 4, amt: 0.4, stroke: t.accent, op: 0.85, cap: 'butt' });
        out += A.stroke(rng, [[cx + sh, browY - 6], [cx + sh + 10, browY + 2], [cx + sh + 6, browY + 12]], { w: 2.4, amt: 0.5, stroke: t.accent, op: 0.8 });
        break;
      case 'helm':
        out += A.stroke(rng, [[cx - sh - 2, eyeY], [cx - sh - 2, browY - 4], [cx - sh * 0.5, topY - 6], [cx, topY - 9], [cx + sh * 0.5, topY - 6], [cx + sh + 2, browY - 4], [cx + sh + 2, eyeY]], { fill: PAL.paper2, w: 2.3, amt: 0.6 });
        out += A.stroke(rng, [[cx, topY - 9], [cx, browY - 2]], { w: 1.6, amt: 0.3 });
        out += A.stroke(rng, [[cx - sh - 2, browY - 4], [cx + sh + 2, browY - 4]], { w: 2, amt: 0.4 });
        out += A.path('M ' + cx + ' ' + (topY - 9) + ' q -6 -14 -2 -22', { w: 2.4, stroke: t.accent });
        break;
      case 'greathelm':
        out += A.stroke(rng, [[cx - sh - 3, eyeY + 12], [cx - sh - 3, browY - 6], [cx, topY - 12], [cx + sh + 3, browY - 6], [cx + sh + 3, eyeY + 12]], { fill: PAL.paper2, w: 2.4, amt: 0.5 });
        out += A.stroke(rng, [[cx, topY - 12], [cx, eyeY + 12]], { w: 1.6, amt: 0.3 });
        out += A.stroke(rng, [[cx - sh - 3, browY + 2], [cx - 6, browY + 2]], { w: 2.2, amt: 0.3 });
        out += A.stroke(rng, [[cx + 6, browY + 2], [cx + sh + 3, browY + 2]], { w: 2.2, amt: 0.3 });
        break;
      case 'circlet':
        out += A.stroke(rng, [[cx - sh - 1, browY - 2], [cx - sh + 3, topY + 2], [cx, topY - 4], [cx + sh - 3, topY + 2], [cx + sh + 1, browY - 2]], { close: true, fill: dark, w: 1.6, amt: 0.6 });
        out += A.stroke(rng, [[cx - sh + 2, browY - 4], [cx, browY - 8], [cx + sh - 2, browY - 4]], { w: 2, amt: 0.3, stroke: t.accent });
        out += A.path('M ' + cx + ' ' + (browY - 12) + ' l 3 4 l -3 4 l -3 -4 Z', { fill: t.accent, stroke: PAL.ink, w: 1 });
        break;
      case 'diadem':
        out += A.stroke(rng, [[cx - sh - 8, eyeY + 26], [cx - sh - 6, browY - 4], [cx, topY - 6], [cx + sh + 6, browY - 4], [cx + sh + 8, eyeY + 26], [cx + sh - 2, eyeY + 6], [cx + sh - 5, browY], [cx, topY + 2], [cx - sh + 5, browY], [cx - sh + 2, eyeY + 6]], { close: true, fill: dark, w: 1.6, amt: 0.9, op: 0.95 });
        out += A.stroke(rng, [[cx - sh + 1, browY - 3], [cx, browY - 9], [cx + sh - 1, browY - 3]], { w: 2, amt: 0.3, stroke: t.accent });
        out += A.circle(cx, browY - 10, 2.6, { fill: t.accent, stroke: PAL.ink, w: 1 });
        break;
      case 'veil':
        out += A.stroke(rng, [[cx - sh - 10, eyeY + 34], [cx - sh - 8, browY - 6], [cx, topY - 10], [cx + sh + 8, browY - 6], [cx + sh + 10, eyeY + 34]], { fill: PAL.paper2, w: 1.6, amt: 0.8, op: 0.95 });
        var vid = 'veil_' + A.uid();
        var vh = A.hatch(vid, { gap: 4, angle: 0, op: 0.2, w: 0.7 });
        out = vh.def + out;
        out += A.stroke(rng, [[cx - sh - 8, browY - 4], [cx, topY - 6], [cx + sh + 8, browY - 4], [cx + sh + 6, eyeY + 20], [cx, eyeY + 8], [cx - sh - 6, eyeY + 20]], { close: true, fill: vh.ref, stroke: 'none', amt: 0.5 });
        break;
      case 'widehat':
        out += A.stroke(rng, [[cx - sh + 2, browY - 2], [cx, topY + 2], [cx + sh - 2, browY - 2]], { close: true, fill: dark, w: 1.6, amt: 0.5 });
        out += A.stroke(rng, [[cx - sh - 18, browY + 2], [cx - sh, browY - 4], [cx + sh, browY - 4], [cx + sh + 18, browY + 2]], { w: 3, amt: 0.6, stroke: ink });
        out += A.stroke(rng, [[cx - sh - 18, browY + 2], [cx, browY + 6], [cx + sh + 18, browY + 2]], { w: 1.4, amt: 0.4, stroke: PAL.ink2 });
        break;
    }
    return out;
  }

  // ---- echo (ghost) treatment: a hollow cowl + two embered eyes ----
  function echoDraw(seed, opt) {
    var rng = new TLU.RNG('echo:' + seed), cx = 100, ink = PAL.ink, accent = (opt && opt.accent) || '#7a6a9c';
    var body = '', defs = '';
    var fid = 'ef_' + A.uid();
    var fh = A.hatch(fid, { gap: 4, angle: 60, op: 0.22, w: 0.8, color: ink });
    defs += fh.def;
    // cowl
    body += A.stroke(rng, [[cx - 52, 200], [cx - 56, 96], [cx - 30, 44], [cx, 34], [cx + 30, 44], [cx + 56, 96], [cx + 52, 200]], { close: true, fill: PAL.paper2, w: 2.2, amt: 1.4 });
    // dissolving hatch within the cowl
    body += A.stroke(rng, [[cx - 44, 196], [cx - 48, 100], [cx - 26, 52], [cx, 44], [cx + 26, 52], [cx + 48, 100], [cx + 44, 196]], { close: true, fill: fh.ref, stroke: 'none', amt: 1 });
    // the hollow of the hood
    var void_ = [[cx - 30, 150], [cx - 34, 86], [cx - 18, 60], [cx, 54], [cx + 18, 60], [cx + 34, 86], [cx + 30, 150], [cx, 138]];
    body += A.stroke(rng, void_, { close: true, fill: ink, stroke: 'none', amt: 1, op: 0.9 });
    // embered eyes
    body += A.circle(cx - 12, 96, 3.4, { fill: accent, stroke: 'none' });
    body += A.circle(cx + 12, 96, 3.4, { fill: accent, stroke: 'none' });
    body += A.circle(cx - 12, 96, 6, { stroke: accent, w: 1, op: 0.4 });
    body += A.circle(cx + 12, 96, 6, { stroke: accent, w: 1, op: 0.4 });
    // wisps rising
    for (var i = 0; i < 5; i++) {
      var wx = cx - 30 + i * 15;
      body += A.stroke(rng, [[wx, 40], [wx + (rng.next() - 0.5) * 14, 18], [wx + (rng.next() - 0.5) * 20, 2]], { w: 1.2, amt: 1.2, stroke: accent, op: 0.35 });
    }
    return { defs: defs, body: body, accent: accent };
  }

  // ---- public: portrait(seed, opt) → svg string -----------------------
  // opt: { role, accent, age, fem, kind:'echo'|'hollow', size, caption, ring }
  function portrait(seed, opt) {
    opt = opt || {};
    var W = 200, H = opt.caption ? 224 : 200;
    var inner = '', defs = '';
    var accent;

    if (opt.kind === 'echo') {
      var e = echoDraw(seed, opt); defs += e.defs; inner += e.body; accent = e.accent;
    } else {
      var t = opt.traits || traits(seed, opt);
      t._seed = seed;
      var d = draw(t, opt); defs += d.defs; inner += d.body; accent = t.accent;
    }

    // roundel frame — the plate's coin-like double ring
    var ring = '';
    if (opt.ring !== false) {
      var ghost = opt.kind === 'echo';
      ring += A.circle(100, 100, 95, { stroke: PAL.ink, w: 2.4, op: ghost ? 0.5 : 1, dash: ghost ? '3 4' : null });
      ring += A.circle(100, 100, 89, { stroke: PAL.ink2, w: 1, op: 0.7 });
    }
    // mask the bust to the roundel so shoulders don't spill past the coin
    var clipId = 'rc_' + A.uid();
    defs += '<clipPath id="' + clipId + '"><circle cx="100" cy="100" r="88"/></clipPath>';
    var plate = '<g clip-path="url(#' + clipId + ')">' + inner + '</g>' + ring;

    var cap = '';
    if (opt.caption) cap = A.caption(100, 218, opt.caption, { size: 14, color: accent });

    var svgStr = A.svg(W, H, '<defs>' + defs + '</defs>' + plate + cap, { paper: false, cls: opt.cls || 'tlu-portrait' });
    return svgStr;
  }

  TLU.Art.portrait = portrait;
  TLU.Art.traits = traits;
  TLU.Art.PORTRAIT_ROLES = ROLE;
})(window.TLU = window.TLU || {});
