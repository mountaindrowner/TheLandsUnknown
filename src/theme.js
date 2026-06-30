/* ============================================================
 * theme.js — switchable visual themes.
 *
 * Each theme is (a) a body CSS class that overrides the design
 * tokens in styles.css, and (b) a canvas palette that recolours the
 * ASCII map. col()/bg() are consulted by render.js and ui.bar so a
 * single switch retones the whole game. The default 'storm' theme is
 * a pure pass-through (zero change to the original look).
 * ============================================================ */
(function (TLU) {
  'use strict';

  // hex -> luminance 0..1
  function lum(hex) {
    if (!hex || hex[0] !== '#') return 0.5;
    let n = hex.length === 4
      ? parseInt(hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3], 16)
      : parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  function rampPick(ramp, L) {
    const i = Math.max(0, Math.min(ramp.length - 1, Math.floor(L * ramp.length)));
    return ramp[i];
  }

  // known source hexes -> semantic role (so bars/player retone without call-site changes)
  const HEXROLE = {
    '#c0392b': 'hp', '#7e6bff': 'charge', '#3a8a4a': 'xp', '#3a8a4a ': 'xp',
    '#fff36b': 'player', '#a33': 'enemy', '#ff2d78': 'boss',
  };

  const THEMES = {
    folio: {
      id: 'folio', name: 'Folio (default)', evokes: "an explorer's inked field journal — Obra Dinn / antique cartography",
      cls: 'theme-folio', mapBg: '#f3ecd9',
      ramp: ['#241f18', '#3c3528', '#574d3a', '#736449', '#8c7c58', '#a3936a'], // ink (low-lum src) -> faint sepia
      roles: { player: '#9a3b2a', site: '#9a3b2a', accent: '#9a3b2a', enemy: '#7a4a2a',
               hp: '#9a3b2a', charge: '#3f6173', xp: '#6b7a4a', boss: '#7a1f14' },
    },
    storm: { id: 'storm', name: 'Stormglass', evokes: 'the original storm-violet HUD', cls: '' },

    phosphor: {
      id: 'phosphor', name: 'Phosphor', evokes: 'a vintage amber CRT terminal (Pip-Boy / DEC VT)',
      cls: 'theme-phosphor', mapBg: '#080500',
      ramp: ['#241400', '#5e3a00', '#9a6400', '#c98200', '#ffb000', '#ffd87a'],
      roles: { player: '#fff3b0', site: '#ffd060', accent: '#ffb000', enemy: '#ff9a3a',
               hp: '#d98a00', charge: '#ffb000', xp: '#7a5200', boss: '#ff7a00' },
    },
    almanac: {
      id: 'almanac', name: 'Almanac', evokes: "a printed naturalist's field journal / e-ink reader",
      cls: 'theme-almanac', mapBg: '#e7e0cb',
      ramp: ['#2a2620', '#4a4233', '#6f6650', '#8f856a', '#b3a988'],   // dark ink (low lum src) -> faint
      roles: { player: '#8c2f1f', site: '#9a3b2a', accent: '#9a3b2a', enemy: '#7d4a2a',
               hp: '#9a3b2a', charge: '#3f6173', xp: '#6b7a4a', boss: '#7a1f14' },
    },
    bauhaus: {
      id: 'bauhaus', name: 'Bauhaus', evokes: 'Swiss / International-Typographic modernism — stark, one signal-red accent',
      cls: 'theme-bauhaus', mapBg: '#0b0b0b',
      ramp: ['#202020', '#3c3c3c', '#5e5e5e', '#8a8a8a', '#bdbdbd', '#ededed'],
      roles: { player: '#e4002b', site: '#e4002b', accent: '#e4002b', enemy: '#bdbdbd',
               hp: '#e4002b', charge: '#ededed', xp: '#6e6e6e', boss: '#e4002b' },
    },
  };

  let activeId = 'folio';

  function active() { return THEMES[activeId] || THEMES.storm; }

  // remap a source colour for the active theme. role hint optional.
  function col(hex, role) {
    const t = active();
    if (t.id === 'storm') return hex;
    role = role || HEXROLE[hex];
    if (role && t.roles && t.roles[role]) return t.roles[role];
    if (t.ramp) return rampPick(t.ramp, lum(hex));
    return hex;
  }
  // flat map/tile background for the active theme (pass-through on default)
  function bg(hex) { const t = active(); return t.id === 'storm' ? hex : t.mapBg; }
  function clearBg() { const t = active(); return t.id === 'storm' ? null : t.mapBg; }

  function apply(id, game) {
    if (!THEMES[id]) id = 'storm';
    activeId = id;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('theme-folio', 'theme-phosphor', 'theme-almanac', 'theme-bauhaus');
      const c = THEMES[id].cls; if (c) document.body.classList.add(c);
    }
    try { localStorage.setItem('tlu_theme', id); } catch (e) {}
    if (game && game.render) game.render();
    return THEMES[id];
  }
  function load() { let id = 'folio'; try { id = localStorage.getItem('tlu_theme') || 'folio'; } catch (e) {} apply(id); return id; }
  function order() { return ['folio', 'storm', 'phosphor', 'almanac', 'bauhaus']; }
  function cycle(game) {
    const o = order(); const next = o[(o.indexOf(activeId) + 1) % o.length];
    const t = apply(next, game);
    if (game && game.msg) game.msg('%c❖ Theme: ' + t.name, 'note');
    return t;
  }

  TLU.Theme = {
    THEMES: THEMES, order: order, apply: apply, load: load, cycle: cycle,
    col: col, bg: bg, clearBg: clearBg,
    get activeId() { return activeId; }, active: active,
  };
})(window.TLU = window.TLU || {});
