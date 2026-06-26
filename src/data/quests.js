/* ============================================================
 * quests.js — the main arc + faction/side quests.
 * Quests are milestone-driven: stages advance when the game fires
 * an event matching the stage's trigger (kill/reach/collect/talk).
 * ============================================================ */
(function (TLU) {
  'use strict';

  // The spine. Completing it culminates in the final boss at Aharietiam.
  const MAIN = {
    id: 'main', name: 'The Last Storm', main: true,
    stages: [
      { id: 'awaken', text: 'Speak with the Stormwardens at the nearest hold. They sense the spren that follow you.', trigger: { type: 'talk', who: 'stormwarden' } },
      { id: 'firstblade', text: 'Recover a fragment of a dead Order from a sunken Shardvault. Clear a vault dungeon.', trigger: { type: 'clearVault' } },
      { id: 'reaver', text: 'The Ashen Reavers raid the roads, hoarding a stolen Half-Shard. End Highlord Vaten.', trigger: { type: 'kill', who: 'highlord_reaver' } },
      { id: 'gather', text: 'Three Dawnshard fragments lie scattered. Recover them all from the deep vaults.', trigger: { type: 'fragments', count: 3 } },
      { id: 'aharietiam', text: 'Re-Shephir, the Midnight Mother, wakes beneath ruined Aharietiam. Descend and end her.', trigger: { type: 'reach', place: 'aharietiam' } },
      { id: 'final', text: 'Stand in the last storm. Destroy the Midnight Mother.', trigger: { type: 'kill', who: 'midnight_mother' } },
    ],
    onComplete: { gold: 5000, xp: 3000 },
  };

  const SIDE = [
    { id: 'reaver_camps', name: 'Ash on the Wind', faction: 'coalition',
      stages: [{ id: 'clear', text: 'Clear 3 Ashen Reaver camps from the plains.', trigger: { type: 'clearCamps', count: 3 } }],
      onComplete: { gold: 400, item: { kind: 'weapon', level: 6, magic: 1 } } },
    { id: 'vault_delve', name: 'The Vaultseekers\' Bargain', faction: 'guild',
      stages: [{ id: 'delve', text: 'Reach the bottom of any deep Shardvault (5+ floors).', trigger: { type: 'vaultDepth', depth: 5 } }],
      onComplete: { gold: 600, item: { kind: 'armor', level: 8, magic: 2 } } },
    { id: 'bounty_thunderclast', name: 'The Walking Ruin', faction: 'coalition',
      stages: [{ id: 'slay', text: 'Slay a Thunderclast haunting the storm-lands.', trigger: { type: 'killType', who: 'thunderclast' } }],
      onComplete: { gold: 500, item: { unique: 'plate_radiant' } } },
    { id: 'gem_hoard', name: 'Light in Darkness', faction: 'guild',
      stages: [{ id: 'gather', text: 'Recover 8 infused gems from across the lands.', trigger: { type: 'collectGems', count: 8 } }],
      onComplete: { gold: 300, item: { kind: 'weapon', level: 10, magic: 2 } } },
  ];

  TLU.Quests = {
    MAIN: MAIN, SIDE: SIDE,
    all: function () { return [MAIN].concat(SIDE); },
    byId: function (id) { return TLU.Quests.all().find(function (q) { return q.id === id; }); },
  };
})(window.TLU = window.TLU || {});
