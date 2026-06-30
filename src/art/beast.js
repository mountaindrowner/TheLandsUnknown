/* ============================================================
 * art/beast.js — generative naturalist specimen plates.
 *
 * The codex is a field journal, so every creature is drawn the way a
 * travelling naturalist would plate a thing that tried to kill them:
 * an inked profile on a hatched groundline, assembled from a seed +
 * the creature's tags (void / stone / beast / reaver / swarm). Seeded
 * by the bestiary id, so a Rockmite is always the same Rockmite.
 * ============================================================ */
(function (TLU) {
  'use strict';
  var A = TLU.Art, PAL = A.PAL;

  // decide a body archetype from tags/glyph/level
  function formOf(rng, opt) {
    if (opt.form) return opt.form;
    var tags = opt.tags || [];
    var big = opt.big;
    if (tags.indexOf('void') >= 0) return big ? 'hollow' : 'void';
    if (tags.indexOf('stone') >= 0) return big ? 'colossus' : 'stone';
    if (opt.faction === 'reavers') return 'reaver';
    if (opt.swarm || (opt.lvl != null && opt.lvl <= 1)) return 'swarm';
    if (big) return 'colossus';
    return rng.chance(0.5) ? 'beast' : 'brute';
  }

  function plate(seed, opt) {
    opt = opt || {};
    var rng = new TLU.RNG('beast:' + seed);
    var W = 240, H = 188, gy = 150, cx = 120; // groundline y
    var accent = opt.accent || PAL.oxblood;
    var ink = PAL.ink, body = '', defs = '';
    var form = formOf(rng, opt);
    var scale = opt.big ? 1.18 : 0.85 + rng.next() * 0.3;

    // groundline + its hatched shadow
    var sid = 'bg_' + A.uid();
    var sh = A.hatch(sid, { gap: 3.6, angle: 0, op: 0.25, w: 0.8 });
    defs += sh.def;
    body += A.stroke(rng, [[24, gy], [W - 24, gy]], { w: 1.6, amt: 0.4 });

    function ground(x0, x1) {
      return A.stroke(rng, [[x0, gy + 2], [(x0 + x1) / 2, gy + 9], [x1, gy + 2]], { close: true, fill: sh.ref, stroke: 'none', amt: 0.3 });
    }

    // shading hatch for the underbelly
    var uid = 'bb_' + A.uid();
    var ub = A.hatch(uid, { gap: 3.4, angle: 55, op: 0.26, w: 0.8 });
    defs += ub.def;

    if (form === 'swarm') {
      // several small carapaced mites
      for (var i = 0; i < 5; i++) {
        var mx = cx - 60 + i * 30 + (rng.next() - 0.5) * 8, my = gy - 8 - (i % 2) * 6, r = 9 + rng.next() * 4;
        body += A.stroke(rng, [[mx - r, my], [mx - r * 0.6, my - r], [mx + r * 0.6, my - r], [mx + r, my], [mx + r * 0.5, my + r * 0.5], [mx - r * 0.5, my + r * 0.5]], { close: true, fill: PAL.paper2, w: 1.6, amt: 0.5 });
        // carapace ridges
        body += A.stroke(rng, [[mx - r * 0.5, my - r * 0.6], [mx + r * 0.5, my - r * 0.6]], { w: 0.9, amt: 0.3, stroke: PAL.ink2 });
        // legs
        for (var L = -1; L <= 1; L += 2) for (var k = 0; k < 2; k++) body += A.stroke(rng, [[mx + L * (r * 0.5), my + r * 0.4], [mx + L * (r + 4), gy]], { w: 1, amt: 0.4 });
        body += A.circle(mx + r * 0.4, my - r * 0.4, 1.4, { fill: accent, stroke: 'none' });
      }
      body += ground(cx - 70, cx + 70);
      return finish(W, H, defs, body, accent, opt);
    }

    // ----- single-creature forms share a torso + legs builder -----
    var len = 70 * scale, tall = 40 * scale, bx = cx, by = gy - tall * 0.55;
    var legN = form === 'reaver' ? 2 : (rng.chance(0.6) ? 4 : 6);

    if (form === 'reaver') {
      // a humanoid raider — hunched, armed
      var hx = cx + 6;
      body += A.stroke(rng, [[hx - 16, gy], [hx - 18, gy - 44], [hx - 8, gy - 60], [hx + 10, gy - 62], [hx + 18, gy - 46], [hx + 14, gy - 12], [hx + 16, gy]], { close: true, fill: PAL.paper2, w: 2, amt: 0.8 });
      // head
      body += A.circle(hx + 2, gy - 70, 11, { fill: PAL.paper2, w: 1.8 });
      body += A.stroke(rng, [[hx - 9, gy - 74], [hx + 13, gy - 76]], { w: 3, amt: 0.4, stroke: accent, op: 0.7, cap: 'butt' }); // war-band
      body += A.circle(hx + 5, gy - 70, 1.6, { fill: accent, stroke: 'none' });
      // arm + jagged blade
      body += A.stroke(rng, [[hx + 14, gy - 48], [hx + 34, gy - 40], [hx + 30, gy - 16]], { w: 4, amt: 0.5 });
      body += A.stroke(rng, [[hx + 30, gy - 18], [hx + 40, gy - 56], [hx + 34, gy - 16]], { close: true, fill: PAL.paper, w: 1.6, amt: 0.5 });
      // legs
      body += A.stroke(rng, [[hx - 8, gy - 12], [hx - 12, gy]], { w: 3.5, amt: 0.4 });
      body += A.stroke(rng, [[hx + 8, gy - 12], [hx + 12, gy]], { w: 3.5, amt: 0.4 });
      body += A.stroke(rng, [[hx - 18, gy - 44], [hx - 6, gy - 36], [hx + 10, gy - 40]], { w: 1, amt: 0.4, stroke: PAL.ink2 });
      body += ground(hx - 22, hx + 36);
      return finish(W, H, defs, body, accent, opt);
    }

    // ----- towering hollow (big void boss) -----
    if (form === 'hollow') {
      var topH = 26;
      body += A.stroke(rng, [[cx - 26, gy], [cx - 30, gy - 70], [cx - 14, gy - 100], [cx - 18, topH + 10], [cx, topH], [cx + 18, topH + 10], [cx + 14, gy - 100], [cx + 30, gy - 70], [cx + 26, gy]], { close: true, fill: PAL.ink, w: 2.2, amt: 1.3, op: 0.94 });
      body += A.stroke(rng, [[cx - 30, gy - 70], [cx - 48, gy - 94], [cx - 22, gy - 80]], { close: true, fill: PAL.ink, w: 1.6, amt: 0.6 });
      body += A.stroke(rng, [[cx + 30, gy - 70], [cx + 48, gy - 94], [cx + 22, gy - 80]], { close: true, fill: PAL.ink, w: 1.6, amt: 0.6 });
      var hvid = 'hv_' + A.uid();
      var hvh = A.hatch(hvid, { gap: 5, angle: -45, op: 0.34, w: 0.8, color: accent });
      defs += hvh.def;
      body += A.stroke(rng, [[cx - 22, gy - 6], [cx - 24, gy - 66], [cx - 10, gy - 96], [cx, topH + 6], [cx + 10, gy - 96], [cx + 24, gy - 66], [cx + 22, gy - 6]], { close: true, fill: hvh.ref, stroke: 'none', amt: 1.1 });
      for (var he = 0; he < 5; he++) body += A.circle(cx - 9 + (he % 2) * 18, topH + 20 + Math.floor(he / 2) * 15, 2.6, { fill: accent, stroke: 'none' });
      body += A.stroke(rng, [[cx - 22, gy - 80], [cx - 42, gy - 48], [cx - 36, gy - 14]], { w: 5, amt: 0.6, stroke: PAL.ink });
      body += A.stroke(rng, [[cx + 22, gy - 80], [cx + 42, gy - 48], [cx + 36, gy - 14]], { w: 5, amt: 0.6, stroke: PAL.ink });
      body += ground(cx - 36, cx + 36);
      return finish(W, H, defs, body, accent, opt);
    }

    // ----- colossus (big stone/generic brute, upright) -----
    if (form === 'colossus') {
      var fc = PAL.paper2;
      body += A.stroke(rng, [[cx - 34, gy], [cx - 30, gy - 58], [cx - 40, gy - 66], [cx - 20, gy - 86], [cx + 20, gy - 86], [cx + 40, gy - 66], [cx + 30, gy - 58], [cx + 34, gy]], { close: true, fill: fc, w: 2.4, amt: 0.5 });
      body += A.circle(cx, gy - 92, 10, { fill: fc, w: 2 });
      body += A.circle(cx - 3, gy - 92, 1.8, { fill: accent, stroke: 'none' });
      body += A.stroke(rng, [[cx - 8, gy - 100], [cx - 4, gy - 112], [cx + 2, gy - 114]], { w: 2.6, amt: 0.4 });
      body += A.stroke(rng, [[cx + 8, gy - 100], [cx + 12, gy - 110], [cx + 18, gy - 110]], { w: 2.6, amt: 0.4 });
      body += A.stroke(rng, [[cx - 38, gy - 64], [cx - 50, gy - 30], [cx - 44, gy - 2]], { w: 9, amt: 0.5, stroke: fc });
      body += A.stroke(rng, [[cx + 38, gy - 64], [cx + 50, gy - 30], [cx + 44, gy - 2]], { w: 9, amt: 0.5, stroke: fc });
      body += A.stroke(rng, [[cx - 14, gy - 10], [cx - 16, gy]], { w: 8, amt: 0.3, stroke: fc });
      body += A.stroke(rng, [[cx + 14, gy - 10], [cx + 16, gy]], { w: 8, amt: 0.3, stroke: fc });
      body += A.stroke(rng, [[cx - 18, gy - 78], [cx, gy - 50], [cx + 16, gy - 72]], { w: 1, amt: 0.3, stroke: PAL.ink2 });
      body += A.stroke(rng, [[cx - 10, gy - 40], [cx + 8, gy - 20]], { w: 1, amt: 0.3, stroke: PAL.ink2 });
      body += A.stroke(rng, [[cx - 30, gy - 6], [cx, gy], [cx + 30, gy - 6], [cx, gy - 30]], { close: true, fill: ub.ref, stroke: 'none', amt: 0.4 });
      body += ground(cx - 46, cx + 46);
      return finish(W, H, defs, body, accent, opt);
    }

    // quadruped/brute/void/stone torso
    var torso = [
      [bx - len * 0.5, by + tall * 0.3], [bx - len * 0.5, by - tall * 0.2],
      [bx - len * 0.3, by - tall * 0.55], [bx + len * 0.2, by - tall * 0.6],
      [bx + len * 0.5, by - tall * 0.3], [bx + len * 0.55, by + tall * 0.2],
      [bx + len * 0.35, by + tall * 0.45], [bx - len * 0.35, by + tall * 0.45],
    ];
    var fill = form === 'void' ? PAL.ink : PAL.paper2;
    body += A.stroke(rng, torso, { close: true, fill: fill, w: form === 'stone' ? 2.4 : 2, amt: form === 'stone' ? 0.4 : 0.9, op: form === 'void' ? 0.92 : 1 });

    // head + neck (front-right) — neck overlaps the head so they read as one
    var nx = bx + len * 0.5, ny = by - tall * 0.3;
    var headType = rng.pick(['maw', 'horned', 'beaked', 'blunt']);
    body += A.stroke(rng, [[nx - 8, ny + tall * 0.1], [nx + 6, ny - tall * 0.3], [nx + 18, ny - tall * 0.18]], { w: tall * 0.38, amt: 0.5, stroke: fill, cap: 'round' });
    var hx2 = nx + 19, hy2 = ny - tall * 0.16;
    if (form === 'void') {
      // hollow head with embered eyes
      body += A.circle(hx2, hy2, 11, { fill: PAL.ink, stroke: 'none' });
      body += A.circle(hx2 + 2, hy2 - 2, 2.4, { fill: accent, stroke: 'none' });
      body += A.circle(hx2 - 4, hy2 + 1, 1.8, { fill: accent, stroke: 'none' });
    } else {
      body += A.stroke(rng, [[hx2 - 12, hy2 - 8], [hx2 + 12, hy2 - 6], [hx2 + 16, hy2 + 4], [hx2 + 2, hy2 + 9], [hx2 - 12, hy2 + 6]], { close: true, fill: fill, w: 1.8, amt: 0.5 });
      if (headType === 'maw') { // open jaws + teeth
        body += A.stroke(rng, [[hx2 + 4, hy2 + 2], [hx2 + 17, hy2 + 1], [hx2 + 16, hy2 + 8], [hx2 + 4, hy2 + 7]], { close: true, fill: PAL.paper, w: 1.4, amt: 0.3 });
        for (var tt = 0; tt < 3; tt++) body += A.path('M ' + (hx2 + 6 + tt * 3.5) + ' ' + (hy2 + 2) + ' l 1.4 3 l 1.4 -3 Z', { fill: PAL.ink, stroke: 'none' });
      }
      body += A.circle(hx2 - 2, hy2 - 2, 1.8, { fill: accent, stroke: 'none' });
    }
    // horns / crest
    if (headType === 'horned' || rng.chance(0.4)) {
      body += A.stroke(rng, [[hx2 - 6, hy2 - 8], [hx2 - 2, hy2 - 22], [hx2 + 4, hy2 - 26]], { w: 3, amt: 0.4, stroke: ink });
      body += A.stroke(rng, [[hx2 + 4, hy2 - 8], [hx2 + 10, hy2 - 20], [hx2 + 16, hy2 - 22]], { w: 3, amt: 0.4, stroke: ink });
    }

    // legs
    var lx0 = bx - len * 0.38, lspan = len * 0.78;
    for (var n = 0; n < legN; n++) {
      var lx = lx0 + (lspan * n / (legN - 1));
      var foot = gy + (rng.next() - 0.5) * 2;
      body += A.stroke(rng, [[lx, by + tall * 0.35], [lx + (n % 2 ? 3 : -3), (by + gy) / 2], [lx + (n % 2 ? 5 : -2), foot]], { w: form === 'stone' ? 4.5 : 3.4, amt: 0.4, stroke: fill });
    }

    // tail / spines
    var spine = rng.pick(['tail', 'spines', 'plates']);
    var tx = bx - len * 0.5;
    if (spine === 'tail') body += A.stroke(rng, [[tx, by], [tx - 22, by + 4], [tx - 34, by + tall * 0.4], [tx - 30, gy - 6]], { w: 5, amt: 0.6, stroke: fill, cap: 'round' });
    else if (spine === 'spines') { for (var sp = 0; sp < 5; sp++) { var spx = bx - len * 0.3 + sp * (len * 0.16); body += A.stroke(rng, [[spx, by - tall * 0.55], [spx + 1, by - tall * 0.55 - 8 - rng.next() * 6]], { w: 2.2, amt: 0.3 }); } }
    else { for (var pl = 0; pl < 4; pl++) { var plx = bx - len * 0.25 + pl * (len * 0.18); body += A.path('M ' + plx + ' ' + (by - tall * 0.5) + ' l 6 -10 l 6 10 Z', { fill: PAL.paper, w: 1.6, stroke: ink }); } }

    // stone carapace cracks, or void dissolve
    if (form === 'stone') {
      body += A.stroke(rng, [[bx - len * 0.2, by - tall * 0.4], [bx, by], [bx + len * 0.2, by - tall * 0.2]], { w: 1, amt: 0.3, stroke: PAL.ink2 });
      body += A.stroke(rng, [[bx + len * 0.1, by + tall * 0.1], [bx + len * 0.3, by + tall * 0.3]], { w: 1, amt: 0.3, stroke: PAL.ink2 });
    } else if (form === 'void') {
      var vid = 'bv_' + A.uid();
      var vh = A.hatch(vid, { gap: 5, angle: -45, op: 0.3, w: 0.8, color: accent });
      defs += vh.def;
      body += A.stroke(rng, torso, { close: true, fill: vh.ref, stroke: 'none', amt: 0.9 });
    }
    // underbelly shading
    body += A.stroke(rng, [[bx - len * 0.35, by + tall * 0.42], [bx, by + tall * 0.5], [bx + len * 0.35, by + tall * 0.42], [bx, by + tall * 0.2]], { close: true, fill: ub.ref, stroke: 'none', amt: 0.4 });

    body += ground(bx - len * 0.55, hx2 + 12);
    return finish(W, H, defs, body, accent, opt);
  }

  function finish(W, H, defs, body, accent, opt) {
    var frame = '';
    // a thin plate border + corner ticks, like an engraving
    frame += A.path('M 8 8 L ' + (W - 8) + ' 8 L ' + (W - 8) + ' ' + (H - 8) + ' L 8 ' + (H - 8) + ' Z', { stroke: PAL.ink2, w: 1, fill: 'none', op: 0.6 });
    var cap = opt.caption ? A.caption(W / 2, H - 14, opt.caption, { size: 13, color: accent }) : '';
    return A.svg(W, H, '<defs>' + defs + '</defs>' + body + frame + cap, { cls: opt.cls || 'tlu-plate' });
  }

  TLU.Art.beastPlate = plate;
})(window.TLU = window.TLU || {});
