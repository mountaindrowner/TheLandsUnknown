/* ============================================================
 * art/beast.js — generative naturalist specimen plates.
 *
 * The same doctrine as the portraits (see design/ART_DOCTRINE.md),
 * applied to a different skeleton: a creature is a parametric body
 * plan (posture, spine, height, head mass) with orthogonal trait axes
 * — head type, eye arrangement, crest, hide, legs, tail, jaw — each
 * rolled independently from the seed and drawn with curves + inked
 * jitter + one-sided hatching. Tags (rift/stone/reaver/swarm) BIAS the
 * axes rather than switching renderers, so a family resemblance
 * emerges while every individual still varies. Seeded by the bestiary
 * id, so a given creature is always itself.
 * ============================================================ */
(function (TLU) {
  'use strict';
  var A = TLU.Art, PAL = A.PAL;

  function pick(rng, a) { return a[Math.floor(rng.next() * a.length)]; }

  // ---- the creature trait model ---------------------------------------
  function traits(seed, opt) {
    var rng = new TLU.RNG('beasttraits:' + seed);
    var tags = opt.tags || [];
    var rift = tags.indexOf('rift') >= 0, stone = tags.indexOf('stone') >= 0;
    var reaver = opt.faction === 'reavers';
    var swarm = opt.swarm || (opt.lvl != null && opt.lvl <= 1);
    var big = !!opt.big;
    var posture =
      swarm ? 'swarm' :
      reaver ? 'upright' :
      (big && stone) ? 'upright' :       // armored colossus (plated, paper-filled)
      (big && rift) ? 'hollow' :         // towering hollow (dark, hatched)
      big ? 'upright' :
      pick(rng, ['quadruped', 'quadruped', 'hunched', 'serpentine']);
    return {
      rift: rift, stone: stone, reaver: reaver, big: big, posture: posture,
      head: reaver ? 'reaver' : rift ? 'hollow' : pick(rng, ['maw', 'beaked', 'horned', 'blunt', 'maw']),
      eyes: rift ? 'cluster' : pick(rng, ['single', 'paired', 'paired']),
      crest: reaver ? 'none' : stone ? 'horns' : pick(rng, ['none', 'horns', 'spines', 'frill', 'antennae']),
      hide: stone ? 'plated' : rift ? 'hatched' : pick(rng, ['smooth', 'bristled', 'plated', 'smooth']),
      legs: stone ? 'column' : pick(rng, ['digitigrade', 'digitigrade', 'many']),
      tail: pick(rng, ['none', 'whip', 'club', 'fan']),
      jaw: rng.chance(0.45) ? 'open' : 'closed',
      scale: big ? 1.16 : 0.82 + rng.next() * 0.32,
      lean: rng.chance(0.5) ? 1 : -1,    // which side carries the hatched shadow
    };
  }

  // ---- shared sub-draws (append to painter P = {body, defs}) ----------

  // a head at (x,y), facing `dir` (+1 = right), at scale s. fill = body ink.
  function drawHead(P, rng, t, x, y, s, dir, accent, fill) {
    var d = dir;
    if (t.head === 'reaver') {
      // a hooded humanoid head — round, war-banded, no muzzle
      P.body += A.circle(x, y, 11 * s, { fill: PAL.paper2, w: 1.8 });
      P.body += A.stroke(rng, [[x - 9 * s, y - 4 * s], [x + 11 * s, y - 6 * s]], { w: 3 * s, amt: 0.4, stroke: accent, op: 0.75, cap: 'butt' });
      P.body += A.circle(x + 4 * s, y, 1.6 * s, { fill: accent, stroke: 'none' });
      P.body += A.stroke(rng, [[x - 7 * s, y + 5 * s], [x + 7 * s, y + 6 * s]], { w: 1, amt: 0.3, stroke: PAL.ink2 });
      return;
    }
    if (t.head === 'hollow') {
      // dark void skull with clustered ember-eyes
      P.body += A.stroke(rng, [
        [x - 12 * s, y - 9 * s], [x + 8 * d * s, y - 13 * s], [x + 15 * d * s, y - 2 * s],
        [x + 12 * d * s, y + 9 * s], [x - 10 * s, y + 8 * s], [x - 13 * s, y - 1 * s],
      ], { close: true, fill: PAL.ink, w: 1.8, amt: 0.6, op: 0.95 });
      drawEyes(P, rng, t, x + 2 * d * s, y, s, accent);
      return;
    }
    // skull outline — muzzle length & brow vary by head type
    var muz = t.head === 'beaked' ? 22 : t.head === 'maw' ? 18 : 13;
    var brow = t.head === 'horned' ? 13 : 10;
    P.body += A.stroke(rng, [
      [x - 13 * s, y + 2 * s],                       // back of skull
      [x - 11 * s, y - brow * s],                    // brow
      [x + 2 * d * s, y - (brow + 2) * s],
      [x + muz * 0.6 * d * s, y - 5 * s],            // bridge
      [x + muz * d * s, y + (t.head === 'beaked' ? 0 : 3) * s], // snout tip
      [x + muz * 0.7 * d * s, y + 8 * s],            // lower muzzle
      [x - 4 * s, y + 10 * s], [x - 12 * s, y + 8 * s],
    ], { close: true, fill: fill, w: 1.8, amt: 0.5 });
    // jaw
    if (t.jaw === 'open') {
      P.body += A.stroke(rng, [[x + muz * 0.45 * d * s, y + 7 * s], [x + muz * d * s, y + 6 * s], [x + muz * 0.9 * d * s, y + 14 * s], [x + muz * 0.3 * d * s, y + 13 * s]],
        { close: true, fill: PAL.paper, w: 1.4, amt: 0.3 });
      for (var k = 0; k < 3; k++) {
        var tx = x + (muz * 0.5 + k * 3.2) * d * s;
        P.body += A.path('M ' + tx + ' ' + (y + 7 * s) + ' l ' + (1.4 * d) + ' ' + (3.2 * s) + ' l ' + (1.4 * d) + ' ' + (-3.2 * s) + ' Z', { fill: PAL.ink, stroke: 'none' });
        P.body += A.path('M ' + tx + ' ' + (y + 13 * s) + ' l ' + (1.2 * d) + ' ' + (-2.6 * s) + ' l ' + (1.2 * d) + ' ' + (2.6 * s) + ' Z', { fill: PAL.ink, stroke: 'none', op: 0.85 });
      }
    } else if (t.head === 'maw') {
      // closed mouth line + a tooth hint
      P.body += A.stroke(rng, [[x + 2 * d * s, y + 9 * s], [x + muz * 0.85 * d * s, y + 6 * s]], { w: 1, amt: 0.3, stroke: PAL.ink2 });
    }
    if (t.head === 'beaked') P.body += A.stroke(rng, [[x + muz * 0.5 * d * s, y + 2 * s], [x + muz * d * s, y + 3 * s]], { w: 1, amt: 0.2, stroke: PAL.ink2 });
    // nostril
    P.body += A.circle(x + muz * 0.85 * d * s, y + 1 * s, 0.9, { fill: PAL.ink2, stroke: 'none' });
    drawEyes(P, rng, t, x - 2 * s, y - 2 * s, s, accent);
    drawCrest(P, rng, t, x - 2 * s, y - brow * s, s, dir);
  }

  function drawEyes(P, rng, t, x, y, s, accent) {
    if (t.eyes === 'cluster') {
      for (var i = 0; i < 4; i++) P.body += A.circle(x - 4 * s + (i % 2) * 9 * s, y - 2 * s + Math.floor(i / 2) * 7 * s, 1.8 * s, { fill: accent, stroke: 'none' });
      P.body += A.circle(x + 2 * s, y, 7 * s, { stroke: accent, w: 0.8, op: 0.3 });
    } else if (t.eyes === 'single') {
      // a slit predator's eye with a lid, not a target ring
      P.body += A.stroke(rng, [[x - 4 * s, y - 1 * s], [x + 3 * s, y - 5 * s], [x + 9 * s, y - 1 * s]], { w: 1.4, amt: 0.3 });
      P.body += A.stroke(rng, [[x - 4 * s, y - 1 * s], [x + 3 * s, y + 3 * s], [x + 9 * s, y - 1 * s]], { w: 1.1, amt: 0.3 });
      P.body += A.circle(x + 3 * s, y - 1 * s, 2.1 * s, { fill: accent, stroke: 'none' });
      P.body += A.circle(x + 2.3 * s, y - 1.7 * s, 0.7 * s, { fill: PAL.paper, stroke: 'none' });
    } else { // paired
      P.body += A.circle(x + 1 * s, y, 2.4 * s, { fill: PAL.paper, w: 1.2 });
      P.body += A.circle(x + 7 * s, y - 1 * s, 2 * s, { fill: PAL.paper, w: 1.1 });
      P.body += A.circle(x + 1 * s, y, 1.2 * s, { fill: accent, stroke: 'none' });
      P.body += A.circle(x + 7 * s, y - 1 * s, 1 * s, { fill: accent, stroke: 'none' });
    }
  }

  function drawCrest(P, rng, t, x, y, s, dir) {
    var d = dir;
    if (t.crest === 'horns') {
      P.body += A.stroke(rng, [[x - 4 * s, y + 2 * s], [x - 2 * s, y - 14 * s], [x + 3 * d * s, y - 19 * s]], { w: 3 * s, amt: 0.4 });
      P.body += A.stroke(rng, [[x + 5 * s, y + 2 * s], [x + 9 * d * s, y - 12 * s], [x + 15 * d * s, y - 15 * s]], { w: 3 * s, amt: 0.4 });
    } else if (t.crest === 'spines') {
      for (var i = 0; i < 5; i++) P.body += A.stroke(rng, [[x - 6 * s + i * 4 * s, y + 2 * s], [x - 6 * s + i * 4 * s, y - (8 + (i % 2) * 5) * s]], { w: 1.6 * s, amt: 0.3 });
    } else if (t.crest === 'frill') {
      P.body += A.stroke(rng, [[x - 8 * s, y + 4 * s], [x - 14 * s, y - 10 * s], [x - 2 * s, y - 6 * s], [x + 6 * s, y - 12 * s], [x + 10 * s, y + 2 * s]], { close: true, fill: PAL.paper2, w: 1.4, amt: 0.5, op: 0.92 });
    } else if (t.crest === 'antennae') {
      P.body += A.stroke(rng, [[x, y + 2 * s], [x - 3 * s, y - 12 * s], [x - 8 * s, y - 18 * s]], { w: 1.3 * s, amt: 0.5 });
      P.body += A.stroke(rng, [[x + 4 * s, y + 2 * s], [x + 8 * d * s, y - 12 * s], [x + 13 * d * s, y - 18 * s]], { w: 1.3 * s, amt: 0.5 });
      P.body += A.circle(x - 8 * s, y - 18 * s, 1.6 * s, { fill: PAL.ink2, stroke: 'none' });
      P.body += A.circle(x + 13 * d * s, y - 18 * s, 1.6 * s, { fill: PAL.ink2, stroke: 'none' });
    }
  }

  // a single leg from (x, top) to the ground gy, with a joint bend
  function drawLeg(P, rng, t, x, top, gy, w, dir, fill) {
    var mid = (top + gy) / 2, k = t.legs === 'column' ? 1 : (3 * dir);
    P.body += A.stroke(rng, [[x, top], [x + k, mid], [x + (t.legs === 'column' ? 0 : 4 * dir), gy]],
      { w: w, amt: 0.4, stroke: fill, cap: 'round' });
    if (t.legs === 'digitigrade') P.body += A.stroke(rng, [[x + 4 * dir, gy], [x + 9 * dir, gy + 1]], { w: w * 0.7, amt: 0.3, stroke: fill });
  }

  function drawTail(P, rng, t, x, y, dir, fill) {
    if (t.tail === 'none') return;
    var d = -dir; // tail trails behind
    if (t.tail === 'whip') P.body += A.stroke(rng, [[x, y], [x + 22 * d, y + 4], [x + 36 * d, y - 6], [x + 40 * d, y - 22]], { w: 4, amt: 0.6, stroke: fill, cap: 'round' });
    else if (t.tail === 'club') { P.body += A.stroke(rng, [[x, y], [x + 20 * d, y + 6], [x + 32 * d, y - 2]], { w: 5, amt: 0.5, stroke: fill, cap: 'round' }); P.body += A.circle(x + 36 * d, y - 4, 6, { fill: fill, w: 1.6 }); for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2; P.body += A.stroke(rng, [[x + 36 * d, y - 4], [x + 36 * d + Math.cos(a) * 9, y - 4 + Math.sin(a) * 9]], { w: 1.6, amt: 0.2, stroke: PAL.ink }); } }
    else if (t.tail === 'fan') { for (var f = -2; f <= 2; f++) P.body += A.stroke(rng, [[x, y], [x + 20 * d + f * 2, y + f * 6]], { w: 1.6, amt: 0.4, stroke: fill }); }
  }

  // hide texture across a silhouette region (rough box cx0..cx1, cy0..cy1)
  function drawHide(P, rng, t, cx0, cy0, cx1, cy1, accent) {
    if (t.hide === 'smooth') return;
    if (t.hide === 'plated') {
      var n = 4;
      for (var i = 0; i < n; i++) {
        var px = cx0 + (cx1 - cx0) * (i + 0.5) / n;
        P.body += A.stroke(rng, [[px, cy0 + 3], [px - 2, (cy0 + cy1) / 2], [px, cy1 - 3]], { w: 1, amt: 0.3, stroke: PAL.ink2, op: 0.7 });
      }
    } else if (t.hide === 'bristled') {
      P.body += A.stipple(rng, (cx0 + cx1) / 2, (cy0 + cy1) / 2, (cx1 - cx0) * 0.42, (cy1 - cy0) * 0.42, 36, { op: 0.45, r: 0.6 });
    } else if (t.hide === 'hatched') {
      var id = 'hh_' + A.uid();
      var h = A.hatch(id, { gap: 5, angle: -45, op: 0.3, w: 0.8, color: accent });
      P.defs += h.def;
      P.body += A.stroke(rng, [[cx0, cy0], [cx1, cy0], [cx1, cy1], [cx0, cy1]], { close: true, fill: h.ref, stroke: 'none', amt: 0.6 });
    }
  }

  // ---- the plate ------------------------------------------------------
  function plate(seed, opt) {
    opt = opt || {};
    var rng = new TLU.RNG('beast:' + seed);
    var W = 240, H = 188, gy = 150, cx = 120;
    var accent = opt.accent || PAL.oxblood;
    var t = traits(seed, opt);
    var s = t.scale;
    var P = { body: '', defs: '' };
    var fill = t.rift ? PAL.ink : PAL.paper2;

    // groundline + hatched ground shadow
    var sid = 'bg_' + A.uid();
    var gh = A.hatch(sid, { gap: 3.6, angle: 0, op: 0.25, w: 0.8 });
    P.defs += gh.def;
    P.body += A.stroke(rng, [[24, gy], [W - 24, gy]], { w: 1.6, amt: 0.4 });
    function ground(x0, x1) { P.body += A.stroke(rng, [[x0, gy + 2], [(x0 + x1) / 2, gy + 9], [x1, gy + 2]], { close: true, fill: gh.ref, stroke: 'none', amt: 0.3 }); }
    // under-belly shade
    var ubid = 'ub_' + A.uid();
    var ub = A.hatch(ubid, { gap: 3.4, angle: 55, op: 0.24, w: 0.8 });
    P.defs += ub.def;

    if (t.posture === 'swarm') {
      for (var i = 0; i < 5; i++) {
        var mx = cx - 62 + i * 31 + (rng.next() - 0.5) * 8, my = gy - 8 - (i % 2) * 7, r = 8 + rng.next() * 4;
        P.body += A.stroke(rng, [[mx - r, my], [mx - r * 0.6, my - r], [mx + r * 0.6, my - r], [mx + r, my], [mx + r * 0.5, my + r * 0.6], [mx - r * 0.5, my + r * 0.6]], { close: true, fill: PAL.paper2, w: 1.6, amt: 0.5 });
        P.body += A.stroke(rng, [[mx - r * 0.5, my - r * 0.55], [mx + r * 0.5, my - r * 0.55]], { w: 0.9, amt: 0.3, stroke: PAL.ink2 });
        for (var L = -1; L <= 1; L += 2) for (var kk = 0; kk < 2; kk++) P.body += A.stroke(rng, [[mx + L * r * 0.5, my + r * 0.4], [mx + L * (r + 4), gy]], { w: 1, amt: 0.4 });
        P.body += A.circle(mx + r * 0.35, my - r * 0.35, 1.4, { fill: accent, stroke: 'none' });
      }
      ground(cx - 72, cx + 72);
      return finish(W, H, P, accent, opt);
    }

    if (t.posture === 'serpentine') {
      var seg = [], y0 = gy - 18;
      for (var n = 0; n <= 6; n++) { var sx = cx - 78 + n * 26; seg.push([sx, y0 + Math.sin(n * 1.1) * 12]); }
      // body as a thick wavy spine
      P.body += A.stroke(rng, seg, { w: 16 * s, amt: 0.7, stroke: fill, cap: 'round' });
      P.body += A.stroke(rng, seg, { w: 16 * s, amt: 0.7, stroke: PAL.ink, op: 0.18 });
      // a couple of stub legs
      for (var g = 1; g <= 2; g++) { var lx = cx - 40 + g * 30; drawLeg(P, rng, t, lx, gy - 16, gy, 3, 1, fill); }
      drawHide(P, rng, t, cx - 70, y0 - 8, cx + 40, gy - 4, accent);
      var hxS = seg[seg.length - 1][0], hyS = seg[seg.length - 1][1];
      drawHead(P, rng, t, hxS + 8, hyS, 1.25 * s, 1, accent, fill);
      drawTail(P, rng, t, seg[0][0], seg[0][1], 1, fill);
      ground(cx - 86, cx + 40);
      return finish(W, H, P, accent, opt);
    }

    if (t.posture === 'upright' || t.posture === 'hollow') {
      var hollow = t.posture === 'hollow';
      var topY = hollow ? 24 : 64, hx = cx;
      // torso column (tapers up)
      var halfTop = hollow ? 14 : 22, halfBot = hollow ? 26 : 34;
      P.body += A.stroke(rng, [
        [hx - halfBot, gy], [hx - halfBot + 4, gy - 56], [hx - halfTop, topY + 12], [hx, topY + 4],
        [hx + halfTop, topY + 12], [hx + halfBot - 4, gy - 56], [hx + halfBot, gy],
      ], { close: true, fill: hollow ? PAL.ink : fill, w: 2.3, amt: hollow ? 1.2 : 0.6, op: hollow ? 0.94 : 1 });
      // shoulders / spikes
      if (hollow) {
        P.body += A.stroke(rng, [[hx - halfBot + 2, gy - 50], [hx - halfBot - 16, gy - 72], [hx - halfTop, gy - 58]], { close: true, fill: PAL.ink, w: 1.6, amt: 0.6 });
        P.body += A.stroke(rng, [[hx + halfBot - 2, gy - 50], [hx + halfBot + 16, gy - 72], [hx + halfTop, gy - 58]], { close: true, fill: PAL.ink, w: 1.6, amt: 0.6 });
      }
      // legs (two columns) + arms
      drawLeg(P, rng, t, hx - 13, gy - 8, gy, hollow ? 6 : 8, -1, hollow ? PAL.ink : fill);
      drawLeg(P, rng, t, hx + 13, gy - 8, gy, hollow ? 6 : 8, 1, hollow ? PAL.ink : fill);
      var armY = hollow ? gy - 64 : gy - 48;
      P.body += A.stroke(rng, [[hx - halfTop, armY], [hx - halfBot - 12, armY + 30], [hx - halfBot - 6, armY + 62]], { w: hollow ? 5 : 8, amt: 0.5, stroke: hollow ? PAL.ink : fill });
      if (t.reaver) {
        // armed right arm + jagged blade
        P.body += A.stroke(rng, [[hx + halfTop, armY], [hx + halfBot + 12, armY - 6], [hx + halfBot + 8, armY + 18]], { w: 7, amt: 0.5, stroke: fill });
        P.body += A.stroke(rng, [[hx + halfBot + 8, armY + 16], [hx + halfBot + 20, armY - 30], [hx + halfBot + 14, armY + 16]], { close: true, fill: PAL.paper, w: 1.6, amt: 0.5 });
      } else {
        P.body += A.stroke(rng, [[hx + halfTop, armY], [hx + halfBot + 12, armY + 30], [hx + halfBot + 6, armY + 62]], { w: hollow ? 5 : 8, amt: 0.5, stroke: hollow ? PAL.ink : fill });
      }
      // hide on torso
      if (!hollow) drawHide(P, rng, t, hx - halfBot + 4, topY + 14, hx + halfBot - 4, gy - 12, accent);
      else { var vid = 'hv_' + A.uid(); var vh = A.hatch(vid, { gap: 5, angle: -45, op: 0.32, w: 0.8, color: accent }); P.defs += vh.def; P.body += A.stroke(rng, [[hx - halfTop, topY + 8], [hx + halfTop, topY + 8], [hx + halfBot - 6, gy - 8], [hx - halfBot + 6, gy - 8]], { close: true, fill: vh.ref, stroke: 'none', amt: 0.8 }); }
      // head atop
      drawHead(P, rng, t, hx, topY + (hollow ? 2 : 0), (hollow ? 1.05 : 1.25) * s, t.lean, accent, hollow ? PAL.ink : fill);
      // belly shade
      P.body += A.stroke(rng, [[hx - halfBot + 6, gy - 6], [hx, gy], [hx + halfBot - 6, gy - 6], [hx, gy - 34]], { close: true, fill: ub.ref, stroke: 'none', amt: 0.4 });
      ground(hx - halfBot - 18, hx + halfBot + 22);
      return finish(W, H, P, accent, opt);
    }

    // ---- quadruped / hunched ----
    var hunched = t.posture === 'hunched';
    var len = 78 * s, tall = 40 * s, bx = cx - 6, by = gy - tall * (hunched ? 0.7 : 0.6);
    var frontUp = hunched ? tall * 0.5 : 0;   // hunched lifts the shoulders
    // torso silhouette (back arches; belly curves)
    P.body += A.stroke(rng, [
      [bx - len * 0.5, by + tall * 0.3],
      [bx - len * 0.48, by - tall * 0.25],
      [bx - len * 0.2, by - tall * 0.55 - frontUp * 0.4],
      [bx + len * 0.25, by - tall * 0.55 - frontUp],
      [bx + len * 0.5, by - tall * 0.3 - frontUp],
      [bx + len * 0.52, by + tall * 0.18 - frontUp * 0.3],
      [bx + len * 0.34, by + tall * 0.46],
      [bx - len * 0.34, by + tall * 0.46],
    ], { close: true, fill: fill, w: 2, amt: 0.7, op: t.rift ? 0.92 : 1 });

    // legs — 4 (digitigrade) or 6 (many); front pair sits at front, raised if hunched
    var legN = t.legs === 'many' ? 6 : 4;
    var lx0 = bx - len * 0.34, lspan = len * 0.7;
    for (var nn = 0; nn < legN; nn++) {
      var frac = nn / (legN - 1);
      var lx = lx0 + lspan * frac;
      var top = by + tall * 0.33 - (frac > 0.6 ? frontUp : 0);
      drawLeg(P, rng, t, lx, top, gy + (rng.next() - 0.5) * 2, t.legs === 'column' ? 5 : 3.4, nn % 2 ? 1 : -1, fill);
    }

    // neck + head (front, low or raised) — head sized to read at a glance
    var nx = bx + len * 0.5, ny = by - tall * 0.3 - frontUp;
    P.body += A.stroke(rng, [[nx - 10, ny + tall * 0.2], [nx + 6, ny - tall * 0.05], [nx + 16, ny]], { w: tall * 0.46, amt: 0.5, stroke: fill, cap: 'round' });
    drawHead(P, rng, t, nx + 20, ny, 1.32 * s, 1, accent, fill);

    // tail
    drawTail(P, rng, t, bx - len * 0.5, by, 1, fill);

    // hide + belly shade
    drawHide(P, rng, t, bx - len * 0.4, by - tall * 0.5, bx + len * 0.45, by + tall * 0.35, accent);
    P.body += A.stroke(rng, [[bx - len * 0.34, by + tall * 0.42], [bx, by + tall * 0.5], [bx + len * 0.34, by + tall * 0.42], [bx, by + tall * 0.2]], { close: true, fill: ub.ref, stroke: 'none', amt: 0.4 });

    ground(bx - len * 0.55, nx + 32);
    return finish(W, H, P, accent, opt);
  }

  function finish(W, H, P, accent, opt) {
    var frame = A.path('M 8 8 L ' + (W - 8) + ' 8 L ' + (W - 8) + ' ' + (H - 8) + ' L 8 ' + (H - 8) + ' Z', { stroke: PAL.ink2, w: 1, fill: 'none', op: 0.6 });
    var cap = opt.caption ? A.caption(W / 2, H - 14, opt.caption, { size: 13, color: accent }) : '';
    return A.svg(W, H, '<defs>' + P.defs + '</defs>' + P.body + frame + cap, { cls: opt.cls || 'tlu-plate' });
  }

  TLU.Art.beastPlate = plate;
  TLU.Art.beastTraits = traits;
})(window.TLU = window.TLU || {});
