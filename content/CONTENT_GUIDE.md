# Content Authoring Guide — *The Lands Unknown*

This game is **data-driven**. Almost everything — creatures, gear, NPCs, dialogue,
rumors, quests, lore, even whole regions — can be added in **content packs** without
touching a line of engine code.

A content pack is a plain JS file that calls `TLU.Content.register({ ... })`. The
registry merges your data into the live game tables at load time, and the rest of the
engine picks it up automatically.

> See **`content/example-pack.js`** for a complete, working pack that uses nearly every
> field below. Copy it as your starting template.

---

## 1. Creating a pack

1. Create `content/my-pack.js`:
   ```js
   (function (TLU) {
     'use strict';
     TLU.Content.register({
       id: 'my-pack',            // unique id (required-ish; auto-named if omitted)
       title: 'My Expansion',
       // ...content fields below...
     });
   })(window.TLU = window.TLU || {});
   ```
2. Add it to `index.html` after the registry:
   ```html
   <script src="src/content/registry.js"></script>
   <script src="content/example-pack.js"></script>
   <script src="content/my-pack.js"></script>   <!-- your pack -->
   ```
3. Reload. Open the browser console and run `TLU.Content.summary()` to confirm it loaded.

Packs **stack**: load as many as you like. Later packs add to earlier ones. The registry
warns (console) on duplicate ids and keeps the original.

---

## 2. Field reference

Every field is **optional**. Mix and match.

### World & lore
| Field | Type | Merges into | Notes |
|---|---|---|---|
| `holds` | `string[]` | town name pool | New settlement names that can appear on the map. |
| `gems` | `string[]` | gem pool | New gemstone names for loot/infusion. |
| `biomeFlavor` | `{ biomeId: string }` | first-entry flavor | Overrides/adds the line shown when you first enter a biome. Biome ids: `plains, hills, forest, plateau, crater, storm, desert, coast`. |
| `orders` | `{ id: {...} }` | playable Orders | Advanced — pair with `abilities`. See §3. |
| `factions` | `{ id: {name, blurb} }` | faction list | |

### Codex (the in-game journal)
```js
codex: {
  world:    [ { id, title, text } ],     // always-readable lore entries
  factions: { coalition: 'text...' },    // override/add faction codex text
  places:   { vault: 'text...' },        // override/add place codex text
}
```

### NPCs & dialogue
```js
npcs: {
  bard: {
    role: 'Wandering Bard', glyph: '♪', color: '#ffb3de',
    greet: [ '...' ],   // shown when first approached (pick-one)
    talk:  [ '...' ],   // "Talk" topic pool (the more, the better)
    bye:   [ '...' ],   // farewell pool
  }
}
```
New archetypes automatically join the town NPC rotation.

| Field | Type | Notes |
|---|---|---|
| `rumors` | `string[]` | Flavor rumors townsfolk may share (logged to the Codex). |
| `siteRumors` | `[{ type, text }]` | Rumors that **reveal a nearby site** on the map. `type` ∈ `vault, camp, lair, town, ruin`. Put `{dir}` in `text` — it's replaced with a compass direction. |
| `barks` | `string[]` | Ambient one-liners shown occasionally while travelling. |
| `events` | `[{ id, weight, text, effect(game) }]` | Non-combat travel events. `effect` gets the live `game`; use `game.player`, `game.msg(text, cls)`, `TLU.Player.*`, `TLU.Items.*`. |

### Creatures
```js
bestiary: [
  { id: 'frost_wisp', name: 'Hoarfrost Wisp', glyph: 'i', color: '#aee3ff',
    lvl: 3, hp: 26, atk: 11, def: 2, spd: 15, xp: 16, gold: [0, 4],
    biomes: ['coast','plains'], tags: ['void'],         // tags optional
    abilities: ['stormblast'],                          // ids from Abilities/EnemyAbilities
    drops: 'gem',                                       // 'weapon'|'gem'|'rare'|'legendary'
    lore: 'Codex entry, shown after first kill.' }
]
```
`lvl/hp/atk/def` are the stats at the creature's nominal level; the engine **auto-scales**
them to each encounter. `biomes` controls where it spawns (overworld biome ids plus
`vault, camp, ruin, road, night, cave, chasm, sky`).

### Items
| Field | Type | Notes |
|---|---|---|
| `materials` | `[{id,name,mult,value,tier,color}]` | New material tiers (scale base stats). |
| `weapons` / `armors` | `[{...}]` | New base item types (see `src/data/items.js` for shape). |
| `prefixes` / `suffixes` | `[{id,name,tier,bonus}]` | Randomized affixes. `bonus` keys: `dmg, def, speed, maxHp, maxStormlight, crit, regen, stormRegen, armorPierce, voidbane, element`. |
| `consumables` | `{ id: {...} }` | Potions/scrolls/etc. |
| `uniques` | `{ id: () => itemObject }` | Hand-authored artifacts. Each is a **factory function** returning a fresh item (call `TLU.Items.uid()` for its `uid`). |

### Quests
```js
quests: [
  { id: 'frostmere_vault', name: 'The Ice That Remembers', faction: 'guild',
    stages: [ { id, text, trigger } ],
    onComplete: { gold: 700, item: { unique: 'hoarfrost' } } }
]
```
**Trigger types** (single-stage, milestone-driven):
`clearCamps {count}`, `vaultDepth {depth}`, `killType {who}`, `collectGems {count}`.
`onComplete.item` may be `{ unique: 'id' }` or `{ kind:'weapon'|'armor', level, magic }`.

### Abilities & skills (advanced)
| Field | Merges into | Notes |
|---|---|---|
| `abilities` | player Surges | `{ id: { name, cost, school, target, unlock, order?, effect(ctx) } }`. |
| `enemyAbilities` | enemy moves | `{ id: { name, target, effect(ctx) } }`. |
| `skills` | skill list | `{ id: { name, group, desc } }`. `group` ∈ `combat, armor, surge, utility`. |

`ctx` in an ability effect = `{ rng, user, target, enemies, allies, log, combat }`. The
`combat` object exposes `attack, magicHit, heal, applyStatus, spawnAdd`.

### Escape hatch
```js
apply: function (TLU) { /* arbitrary setup with full engine access */ }
```
Runs after all other merges. Use for anything the declarative fields don't cover.

---

## 3. Adding a whole playable Order (worked sketch)

```js
TLU.Content.register({
  id: 'tidecaller-order',
  orders: {
    tidecaller: { name: 'Tidecaller', surge: ['Flow','Bind'], glyph: '≈', color: '#3fd0d0',
                  blurb: 'Sea-sworn who turn water to weapon and wall.' },
  },
  skills: { flow: { name: 'Flow', group: 'surge', desc: 'Command water and tide.' } },
  abilities: {
    tide_lash: { name: 'Tide Lash', cost: 12, school: 'flow', target: 'enemy', unlock: 1, order: 'tidecaller',
      desc: 'A whip of seawater for frost damage.',
      effect: function (c) { c.combat.magicHit(c.user, c.target, 1.4, 'frost', 'Tide Lash'); } },
  },
});
```
The new Order appears in character creation; its surge skill levels through use and unlocks
its abilities — exactly like the built-in five.

---

## 4. Tips

- **IDs are forever.** Saves and quests reference ids; renaming an id orphans saved data.
  Change `name`/display text freely, but keep `id` stable.
- **Balance via `lvl` + `tier`.** The engine scales creatures and biases loot by these.
- **Lore is the pull.** Generous `talk`, `rumors`, and `codex` pools are what make the
  world feel inhabited. Write more than you think you need.
- **Validate:** `TLU.Content.summary()` in the console prints counts and warning totals;
  `TLU.Content.warnings` lists them.

Happy worldbuilding. *Strength before weakness.*
