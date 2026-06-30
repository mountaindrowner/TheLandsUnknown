/* ============================================================
 * perks.js — talent choices granted on level-up.
 * Each level grants a perk point; you pick one of three offered
 * perks whose skill requirement you meet. Perks add passive
 * `bonus` stats and/or combat `flags` the resolver reads.
 * ============================================================ */
(function (TLU) {
  'use strict';

  // req: { skill, level } gate (optional). bonus: merged into derived stats.
  // flags: copied onto player.perkFlags for the combat resolver.
  const PERKS = {
    // --- weapons ---
    duelist:    { name: 'Duelist', desc: '+8% critical chance with any weapon.', req: { skill: 'blades', level: 3 }, bonus: { crit: 0.08 } },
    riposte:    { name: 'Riposte', desc: '25% chance to counterattack when struck.', req: { skill: 'blades', level: 6 }, flags: { riposte: 0.25 } },
    crusher:    { name: 'Crusher', desc: '+25% armor penetration.', req: { skill: 'blunt', level: 3 }, bonus: { armorPierce: 0.25 } },
    stagger:    { name: 'Stagger', desc: '20% chance to stun on a heavy hit.', req: { skill: 'blunt', level: 6 }, flags: { stagger: 0.2 } },
    deadeye:    { name: 'Deadeye', desc: '+6 damage and +6% crit.', req: { skill: 'archery', level: 3 }, bonus: { dmg: 6, crit: 0.06 } },
    skirmisher: { name: 'Skirmisher', desc: '+4 speed; act sooner each round.', req: { skill: 'polearm', level: 3 }, bonus: { speed: 4 } },
    // --- defense ---
    bulwark:    { name: 'Bulwark', desc: '+15% block chance.', req: { skill: 'block', level: 3 }, bonus: { block: 0.15 } },
    ironhide:   { name: 'Ironhide', desc: '+8 defense, +20 HP.', req: { skill: 'heavy', level: 3 }, bonus: { def: 8, maxHp: 20 } },
    acrobat:    { name: 'Acrobat', desc: '+4 speed; harder to hit.', req: { skill: 'light', level: 3 }, bonus: { speed: 4 }, flags: { evasive: 0.12 } },
    // --- the Arts (channeling) ---
    channeler:  { name: 'Channeler', desc: '+30 max Anima and faster regen.', bonus: { maxStormlight: 30, stormRegen: 1 } },
    overchannel:{ name: 'Overchannel', desc: 'Your Arts cost 25% less Anima.', flags: { artDiscount: 0.25 } },
    soulfire:   { name: 'Soulfire', desc: '+30% damage from the Arts.', req: { skill: 'cinder', level: 4 }, flags: { artPower: 0.3 } },
    // --- vitality / aggression ---
    vital:      { name: 'Vital', desc: '+35 maximum HP.', bonus: { maxHp: 35 } },
    lifedrinker:{ name: 'Lifedrinker', desc: 'Heal for 15% of melee damage dealt.', flags: { lifesteal: 0.15 } },
    second_wind:{ name: 'Second Wind', desc: 'Recover HP whenever you slay a foe.', flags: { killheal: 0.12 } },
    berserker:  { name: 'Berserker', desc: '+40% damage while below a third HP.', flags: { berserker: 0.4 } },
    // --- exploration / economy (Explorer build) ---
    pathfinder: { name: 'Pathfinder', desc: 'See farther; fewer ambushes on the road.', req: { skill: 'survival', level: 3 }, flags: { pathfinder: 1 }, bonus: { } },
    treasure_hunter: { name: 'Treasure Hunter', desc: 'Find better loot (+magic find).', flags: { magicFind: 1 } },
    forager:    { name: 'Forager', desc: 'Rations stretch further; resist starvation.', req: { skill: 'survival', level: 2 }, flags: { forager: 1 } },
    silver_tongue: { name: 'Silver Tongue', desc: 'Better prices and more rumors.', req: { skill: 'barter', level: 3 }, flags: { barter: 1 } },
    stormrider: { name: 'Churn-Rider', desc: 'Draw far more Anima from the Churn.', flags: { churnrider: 1 } },
  };

  const IDS = Object.keys(PERKS);

  // perks the player is eligible for (meets req, doesn't already own)
  function eligible(p) {
    return IDS.filter(function (id) {
      if (p.perks && p.perks[id]) return false;
      const r = PERKS[id].req;
      if (!r) return true;
      return p.skills[r.skill] && p.skills[r.skill].level >= r.level;
    });
  }

  // deterministic offer of up to 3 perks for the Nth perk-point
  function offer(p, n) {
    const pool = eligible(p);
    if (!pool.length) return [];
    const rng = new TLU.RNG('perk:' + (p.name || 'x') + ':' + n + ':' + p.level);
    const shuffled = rng.shuffle(pool);
    return shuffled.slice(0, Math.min(3, shuffled.length));
  }

  TLU.Perks = { LIST: PERKS, IDS: IDS, eligible: eligible, offer: offer };
})(window.TLU = window.TLU || {});
