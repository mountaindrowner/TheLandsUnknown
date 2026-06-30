/* ============================================================
 * art/ink.js — the deterministic ink-illustration toolkit.
 *
 * The Folio look is a hand-inked naturalist's field journal. This
 * module is the pen: small primitives that turn a seed into tasteful,
 * slightly-wobbling ink line-art rendered as inline SVG strings, which
 * the overlays drop straight into the DOM.
 *
 * Everything is pure + seeded: the same (seed, traits) always draws the
 * same plate, so a companion, an echo, or a beast keeps one face for
 * the life of a dynasty — across saves, across worlds. No bitmaps, no
 * network, no build step; just geometry composed from a number.
 * ============================================================ */
(function (TLU) {
  'use strict';

  // Folio palette — paper, ink, and three muted plate inks.
  var PAL = {
    paper:  '#f3ecd9', paper2: '#efe7d2', edge: '#b9ad90',
    ink:    '#2a2620', ink2: '#6f6650', faint: '#9a8f72',
    oxblood:'#9a3b2a', blue: '#3f6173', green: '#6b7a4a', gold: '#b08a3c',
    shadow: 'rgba(42,38,32,0.16)',
  };

  // a tiny per-illustration id so multiple SVGs on a page never collide
  var _uid = 0;
  function uid() { return 'ik' + (++_uid).toString(36); }

  // ---- seeded helpers -------------------------------------------------
  function rngOf(seed) { return new TLU.RNG(seed); }

  // jittered point — nudges (x,y) by up to `amt` px, deterministically
  function jit(rng, x, y, amt) {
    return [x + (rng.next() - 0.5) * 2 * amt, y + (rng.next() - 0.5) * 2 * amt];
  }

  // a hand-inked open path through points, with a faint wobble.
  // pts: [[x,y],...]; opts.close, opts.amt(jitter), and standard stroke opts.
  function stroke(rng, pts, opts) {
    opts = opts || {};
    var amt = opts.amt == null ? 0.8 : opts.amt;
    var p = pts.map(function (q) { return jit(rng, q[0], q[1], amt); });
    var d = 'M ' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for (var i = 1; i < p.length; i++) {
      // quadratic through midpoints → smooth but not mechanical
      var a = p[i - 1], b = p[i];
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      d += ' Q ' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
    }
    var last = p[p.length - 1];
    d += ' L ' + last[0].toFixed(1) + ' ' + last[1].toFixed(1);
    if (opts.close) d += ' Z';
    return path(d, opts);
  }

  // raw path with folio defaults
  function path(d, opts) {
    opts = opts || {};
    var fill = opts.fill || 'none';
    var sw = opts.w == null ? 2 : opts.w;
    var stroke = opts.stroke === undefined ? PAL.ink : opts.stroke;
    var lc = opts.cap || 'round', lj = opts.join || 'round';
    var extra = opts.dash ? ' stroke-dasharray="' + opts.dash + '"' : '';
    if (opts.op != null) extra += ' opacity="' + opts.op + '"';
    return '<path d="' + d + '" fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="' + lc + '" stroke-linejoin="' + lj + '"' : '') +
      extra + '/>';
  }

  function circle(cx, cy, r, opts) {
    opts = opts || {};
    var fill = opts.fill || 'none';
    var stroke = opts.stroke === undefined ? PAL.ink : opts.stroke;
    var sw = opts.w == null ? 2 : opts.w;
    var extra = opts.op != null ? ' opacity="' + opts.op + '"' : '';
    return '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="' + sw + '"' : '') + extra + '/>';
  }

  function ellipse(cx, cy, rx, ry, opts) {
    opts = opts || {};
    var fill = opts.fill || 'none';
    var stroke = opts.stroke === undefined ? PAL.ink : opts.stroke;
    var sw = opts.w == null ? 2 : opts.w;
    var extra = opts.op != null ? ' opacity="' + opts.op + '"' : '';
    var tr = opts.rot ? ' transform="rotate(' + opts.rot + ' ' + cx + ' ' + cy + ')"' : '';
    return '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '" fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="' + sw + '"' : '') + tr + extra + '/>';
  }

  // cross-hatch pattern def — engrave shading the way a plate would.
  // returns { def, ref } ; angle in deg, gap in px, two layers if cross.
  function hatch(id, opts) {
    opts = opts || {};
    var gap = opts.gap || 4, ang = opts.angle == null ? 45 : opts.angle;
    var col = opts.color || PAL.ink, op = opts.op == null ? 0.5 : opts.op, w = opts.w || 0.9;
    var def = '<pattern id="' + id + '" width="' + gap + '" height="' + gap +
      '" patternUnits="userSpaceOnUse" patternTransform="rotate(' + ang + ')">' +
      '<line x1="0" y1="0" x2="0" y2="' + gap + '" stroke="' + col + '" stroke-width="' + w + '" opacity="' + op + '"/>';
    if (opts.cross) def += '<line x1="0" y1="0" x2="' + gap + '" y2="0" stroke="' + col + '" stroke-width="' + w + '" opacity="' + (op * 0.8) + '"/>';
    def += '</pattern>';
    return { def: def, ref: 'url(#' + id + ')' };
  }

  // stipple a region with tiny ink flecks (deterministic) — for age/grain
  function stipple(rng, cx, cy, rx, ry, n, opts) {
    opts = opts || {};
    var col = opts.color || PAL.ink, op = opts.op == null ? 0.5 : opts.op, r = opts.r || 0.6;
    var out = '';
    for (var i = 0; i < n; i++) {
      var a = rng.next() * Math.PI * 2, d = Math.sqrt(rng.next());
      var x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
      out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (r * (0.6 + rng.next() * 0.8)).toFixed(2) + '" fill="' + col + '" opacity="' + op + '"/>';
    }
    return out;
  }

  // wrap inner SVG markup in a sized, paper-toned <svg>
  function svg(w, h, inner, opts) {
    opts = opts || {};
    var cls = opts.cls ? ' class="' + opts.cls + '"' : '';
    var bg = opts.paper === false ? '' :
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="' + (opts.bg || PAL.paper) + '"/>';
    var style = opts.style ? ' style="' + opts.style + '"' : '';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '"' + cls + style +
      ' xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' + bg + inner + '</svg>';
  }

  // small-caps ink caption (relies on EB Garamond from the folio theme)
  function caption(x, y, text, opts) {
    opts = opts || {};
    var size = opts.size || 13, col = opts.color || PAL.ink, anc = opts.anchor || 'middle';
    var fv = opts.caps === false ? '' : ' font-variant="small-caps" letter-spacing="0.5"';
    var st = opts.italic ? ' font-style="italic"' : '';
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + anc + '" fill="' + col +
      '" font-family="EB Garamond, Georgia, serif" font-size="' + size + '"' + fv + st + '>' +
      esc(text) + '</text>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  TLU.Art = TLU.Art || {};
  TLU.Art.PAL = PAL;
  TLU.Art.uid = uid;
  TLU.Art.rngOf = rngOf;
  TLU.Art.jit = jit;
  TLU.Art.stroke = stroke;
  TLU.Art.path = path;
  TLU.Art.circle = circle;
  TLU.Art.ellipse = ellipse;
  TLU.Art.hatch = hatch;
  TLU.Art.stipple = stipple;
  TLU.Art.svg = svg;
  TLU.Art.caption = caption;
  TLU.Art.esc = esc;
})(window.TLU = window.TLU || {});
