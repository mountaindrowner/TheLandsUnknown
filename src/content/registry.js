/* ============================================================
 * registry.js — the CONTENT FRAMEWORK.
 *
 * A data-driven loader that merges authored "content packs" into
 * the live game tables (lore, NPCs, rumors, events, bestiary, items,
 * quests, skills, abilities...). Author entire regions, factions,
 * questlines, creatures and dialogue in plain data files — no engine
 * edits required. See content/CONTENT_GUIDE.md for the full schema.
 *
 * Usage (in a pack file, loaded after this script):
 *   TLU.Content.register({ id: 'my-pack', bestiary: [...], npcs: {...}, ... });
 * ============================================================ */
(function (TLU) {
  'use strict';

  const packs = [];
  const warnings = [];

  function warn(msg) { warnings.push(msg); if (typeof console !== 'undefined') console.warn('[Content] ' + msg); }

  // push items onto a live array (de-dup by `id` when present)
  function pushAll(arr, items, label) {
    if (!items) return;
    if (!Array.isArray(items)) { warn(label + ' should be an array'); return; }
    items.forEach(function (it) {
      if (it && it.id && arr.some(function (x) { return x && x.id === it.id; })) {
        warn('duplicate id "' + it.id + '" in ' + label + ' — skipped');
        return;
      }
      arr.push(it);
    });
  }
  // assign keyed entries onto a live object
  function assignAll(obj, map, label, overwrite) {
    if (!map) return;
    Object.keys(map).forEach(function (k) {
      if (!overwrite && obj[k] !== undefined) { warn('key "' + k + '" already exists in ' + label + ' — kept original'); return; }
      obj[k] = map[k];
    });
  }

  // The single entry point. Each field is optional.
  function register(pack) {
    if (!pack || typeof pack !== 'object') { warn('register() called with non-object'); return; }
    pack.id = pack.id || ('pack-' + (packs.length + 1));
    packs.push(pack);

    const LORE = TLU.LORE, D = TLU.Dialogue, B = TLU.Bestiary, I = TLU.Items,
      Q = TLU.Quests, S = TLU.Skills, A = TLU.Abilities, EA = TLU.EnemyAbilities;

    // ---- world / lore ----
    if (pack.holds) pack.holds.forEach(function (h) { if (LORE.holds.indexOf(h) < 0) LORE.holds.push(h); });
    if (pack.gems) pack.gems.forEach(function (g) { if (LORE.gems.indexOf(g) < 0) LORE.gems.push(g); });
    if (pack.biomeFlavor) assignAll(LORE.biomeFlavor, pack.biomeFlavor, 'biomeFlavor', true);
    if (pack.orders) assignAll(LORE.orders, pack.orders, 'orders', false);
    if (pack.factions) assignAll(LORE.factions, pack.factions, 'factions', false);

    // ---- codex ----
    if (pack.codex) {
      if (pack.codex.world) pushAll(D.CODEX.world, pack.codex.world, 'codex.world');
      if (pack.codex.factions) assignAll(D.CODEX.factions, pack.codex.factions, 'codex.factions', true);
      if (pack.codex.places) assignAll(D.CODEX.places, pack.codex.places, 'codex.places', true);
    }

    // ---- dialogue / NPCs / ambient ----
    if (pack.npcs) assignAll(D.ARCHETYPES, pack.npcs, 'npcs', false);
    if (pack.rumors) pack.rumors.forEach(function (r) { D.RUMORS.push(r); });
    if (pack.siteRumors) pack.siteRumors.forEach(function (r) { D.SITE_RUMORS.push(r); });
    if (pack.barks) pack.barks.forEach(function (b) { D.BARKS.push(b); });
    if (pack.events) pushAll(D.EVENTS, pack.events, 'events');

    // ---- bestiary (templates + lore) ----
    if (pack.bestiary) {
      pack.bestiary.forEach(function (e) {
        if (!e || !e.id) { warn('bestiary entry missing id'); return; }
        if (B.LIST.some(function (x) { return x.id === e.id; })) { warn('duplicate bestiary id "' + e.id + '"'); return; }
        if (e.lore) { D.BESTIARY_LORE[e.id] = e.lore; }
        B.LIST.push(e);
      });
    }
    if (pack.bestiaryLore) assignAll(D.BESTIARY_LORE, pack.bestiaryLore, 'bestiaryLore', true);

    // ---- items ----
    if (pack.materials) pushAll(I.MATERIALS, pack.materials, 'materials');
    if (pack.weapons) pushAll(I.WEAPONS, pack.weapons, 'weapons');
    if (pack.armors) pushAll(I.ARMORS, pack.armors, 'armors');
    if (pack.prefixes) pushAll(I.PREFIXES, pack.prefixes, 'prefixes');
    if (pack.suffixes) pushAll(I.SUFFIXES, pack.suffixes, 'suffixes');
    if (pack.consumables) assignAll(I.CONSUMABLES, pack.consumables, 'consumables', false);
    if (pack.uniques) assignAll(I.UNIQUES, pack.uniques, 'uniques', false);

    // ---- quests ----
    if (pack.quests) pushAll(Q.SIDE, pack.quests, 'quests');

    // ---- abilities ----
    if (pack.abilities) assignAll(A, pack.abilities, 'abilities', false);
    if (pack.enemyAbilities) assignAll(EA, pack.enemyAbilities, 'enemyAbilities', false);

    // ---- skills (recompute derived id lists if changed) ----
    if (pack.skills) {
      assignAll(S.LIST, pack.skills, 'skills', false);
      S.ids = Object.keys(S.LIST);
      S.combatSkills = S.ids.filter(function (k) { return S.LIST[k].group === 'combat'; });
      S.surgeSkills = S.ids.filter(function (k) { return S.LIST[k].group === 'surge'; });
    }

    // ---- optional hook: arbitrary setup with full TLU access ----
    if (typeof pack.apply === 'function') {
      try { pack.apply(TLU); } catch (e) { warn('pack "' + pack.id + '" apply() threw: ' + e.message); }
    }
    return pack;
  }

  TLU.Content = {
    register: register,
    packs: packs,
    warnings: warnings,
    // convenience: register many at once
    load: function (list) { (list || []).forEach(register); },
    // summary for debugging / a future content browser
    summary: function () {
      return {
        packs: packs.map(function (p) { return p.id; }),
        enemies: TLU.Bestiary.LIST.length,
        npcArchetypes: Object.keys(TLU.Dialogue.ARCHETYPES).length,
        rumors: TLU.Dialogue.RUMORS.length,
        sideQuests: TLU.Quests.SIDE.length,
        uniques: Object.keys(TLU.Items.UNIQUES).length,
        warnings: warnings.length,
      };
    },
  };
})(window.TLU = window.TLU || {});
