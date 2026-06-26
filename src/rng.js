/* ============================================================
 * rng.js — deterministic, seedable pseudo-random number engine
 * The whole world (and every dungeon) is reproducible from a seed.
 * ============================================================ */
(function (root) {
  'use strict';

  // Mulberry32 — small, fast, good enough for a game world.
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Hash a string into a 32-bit integer seed (xfnv1a-ish).
  function hashSeed(str) {
    str = String(str);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function RNG(seed) {
    if (typeof seed === 'string') seed = hashSeed(seed);
    if (seed === undefined || seed === null) seed = (Date.now() ^ 0x9e3779b9) >>> 0;
    this.seed = seed >>> 0;
    this._next = mulberry32(this.seed);
  }

  RNG.prototype.next = function () { return this._next(); };
  // integer in [min, max] inclusive
  RNG.prototype.int = function (min, max) {
    if (max === undefined) { max = min; min = 0; }
    return min + Math.floor(this._next() * (max - min + 1));
  };
  // float in [min, max)
  RNG.prototype.float = function (min, max) {
    if (max === undefined) { max = min; min = 0; }
    return min + this._next() * (max - min);
  };
  RNG.prototype.chance = function (p) { return this._next() < p; };
  RNG.prototype.pick = function (arr) { return arr[Math.floor(this._next() * arr.length)]; };
  RNG.prototype.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this._next() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  // weighted pick: items = [{w: 3, v: 'a'}, ...] OR ({a:3,b:1})
  RNG.prototype.weighted = function (items) {
    let entries;
    if (Array.isArray(items)) entries = items.map(function (e) { return [e.v, e.w]; });
    else entries = Object.keys(items).map(function (k) { return [k, items[k]]; });
    let total = 0;
    for (const e of entries) total += e[1];
    let r = this._next() * total;
    for (const e of entries) { r -= e[1]; if (r <= 0) return e[0]; }
    return entries[entries.length - 1][0];
  };
  // roll NdM (+bonus)
  RNG.prototype.dice = function (n, m, bonus) {
    let s = bonus || 0;
    for (let i = 0; i < n; i++) s += this.int(1, m);
    return s;
  };
  // gaussian-ish via average of several uniforms (Irwin-Hall)
  RNG.prototype.normal = function (mean, spread) {
    let s = 0;
    for (let i = 0; i < 4; i++) s += this._next();
    return mean + (s / 4 - 0.5) * 2 * spread;
  };
  // derive a child RNG (independent stream) — useful for per-region/per-dungeon seeds
  RNG.prototype.fork = function (label) {
    return new RNG((this.seed ^ hashSeed(String(label))) >>> 0);
  };

  root.RNG = RNG;
  root.hashSeed = hashSeed;
})(typeof window !== 'undefined' ? (window.TLU = window.TLU || {}) : module.exports);
