/* ============================================================
 * companions.js — recruitable followers who fight at your side.
 * A companion is a lightweight entity the combat resolver runs with
 * a simple role-based AI. Recruited at holds; can be downed (not a
 * game-over) and revives after a won battle.
 * ============================================================ */
(function (TLU) {
  'use strict';

  // stat multipliers vs a baseline; `art` channelers cast/heal instead of swing
  const ROLES = {
    warrior:    { name: 'Warrior',    glyph: 'W', color: '#ff9a5a', hp: 1.4, atk: 1.25, def: 1.1, spd: 0.95 },
    warden:     { name: 'Warden',     glyph: 'D', color: '#7ec8ff', hp: 1.8, atk: 0.9,  def: 1.5, spd: 0.8, guard: true },
    skirmisher: { name: 'Skirmisher', glyph: 'S', color: '#67e08a', hp: 1.0, atk: 1.15, def: 0.9, spd: 1.45 },
    channeler:  { name: 'Channeler',  glyph: 'C', color: '#d9a7ff', hp: 0.95, atk: 1.35, def: 0.8, spd: 1.05, art: true },
  };

  function generate(rng, level, role) {
    level = Math.max(1, level | 0);
    role = role || rng.pick(Object.keys(ROLES));
    const r = ROLES[role];
    const c = {
      kind: 'ally', role: role, roleName: r.name, glyph: r.glyph, color: r.color,
      name: TLU.genName(rng), level: level,
      maxHp: Math.round((40 + level * 9) * r.hp),
      atk: Math.round((8 + level * 2.2) * r.atk),
      def: Math.round((3 + level * 1.3) * r.def),
      spd: Math.round((10 + level) * r.spd),
      art: !!r.art, guardy: !!r.guard, alive: true, statuses: {},
    };
    c.hp = c.maxHp;
    return c;
  }

  // a hireable pair offered at a hold, with gold costs
  function recruitOffer(rng, level) {
    const out = [];
    for (let i = 0; i < 2; i++) {
      const c = generate(rng, Math.max(1, level + rng.int(-1, 1)), null);
      c.cost = 70 + (c.level) * 35 + rng.int(0, 40);
      out.push(c);
    }
    return out;
  }

  TLU.Companions = { ROLES: ROLES, generate: generate, recruitOffer: recruitOffer };
})(window.TLU = window.TLU || {});
