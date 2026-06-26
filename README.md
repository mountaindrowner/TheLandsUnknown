# The Lands Unknown
### *A Chronicle of Storm and Shard*

A large, open-world **ASCII RPG** that blends the freeform exploration and skill-by-use
progression of **The Elder Scrolls**, the deep procedural systems of **Dwarf Fortress**,
and a storm-wracked world inspired by the **Stormlight Archive**.

Wander a seed-generated continent, bind the surges, hoard randomized Shard-gear,
join (or hunt) factions, delve sunken vaults for Dawnshard fragments — and, when you
are ready, descend into ruined Aharietiam to face the final boss: **Re-Shephir, the
Midnight Mother**.

It runs entirely in the browser with **no build step and no dependencies**. Just open
`index.html`.

![Title](assets/screenshot-title.png)
![Overworld](assets/screenshot-play.png)
![Combat](assets/screenshot-combat.png)

---

## Play it

**Option A — just open it:** double-click `index.html` (everything is plain
`<script>` tags; no bundler, no server required).

**Option B — local server** (recommended; guarantees `localStorage` saves work):

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

### Controls

| Action | Keys |
|---|---|
| Move | Arrow keys / `WASD` / `HJKL` (+ `YUBN` diagonals) |
| Interact · enter site · take stairs | `Enter` or `E` |
| Inventory | `I` |
| Character & spend level-up points | `C` |
| Quests & bounties | `Q` |
| Pause / Save / Quit | `Esc` |
| Help | `?` |

The game **auto-saves** as you travel and on major events.

---

## What's in it

- **Procedural open world.** A value-noise continent (`Kharavar`) with nine biomes,
  five holds (towns), eight sunken Shardvaults, reaver camps, roads, highstorms, and a
  far-eastern danger gradient — every world is reproducible from its seed.
- **Skill-by-use progression (Elder-Scrolls style).** 21 skills across combat, armor,
  surgebinding and utility that level *through use*; skill-ups feed your character level,
  which grants attribute points you allocate freely.
- **Five Knightly Orders** as classes — Windrunner, Stoneward, Edgedancer, Truthwatcher,
  Dustbringer — each with its own surgebinding powers (Gravitation, Division, Regrowth,
  Lightweaving, and more).
- **Mountains of randomized loot.** Seven material tiers × weapon/armor bases ×
  prefix/suffix affixes, plus hand-authored artifacts (the living Shardblade *Oathbringer*,
  *Radiant Shardplate*, *Sunmaker*). Rarities from common to artifact.
- **Final-Fantasy-style turn-based combat.** Initiative order, crits, elements,
  armor-piercing, blocking, status effects (burn/bleed/stun/bound/fear/guard/evade…),
  fleeing, and multi-phase bosses that spawn adds and escalate.
- **Roguelike dungeon delving.** Multi-floor Shardvaults with room/corridor generation,
  raycast field-of-view, wandering monsters, chests, infused gems, and Dawnshard fragments.
- **Quests in many directions.** A main arc (gather the Dawnshard, end Highlord Vaten,
  descend Aharietiam) plus faction side-quests and bounties — pursue them in any order.
- **Towns & economy.** Rest at inns, buy/sell from refreshing merchant stock, pay
  trainers, and talk to the Stormwardens. Bartering improves with use.
- **Day/highstorm cycle.** Highstorms refill Stormlight quickly but make the wilds deadlier.

---

## Project layout

```
index.html            # loads everything in order (no build step)
styles.css            # terminal / FF-menu aesthetic
src/
  rng.js              # seedable deterministic RNG (Mulberry32)
  data/
    lore.js           # world flavor, orders, gems, name generator
    skills.js         # skill definitions + XP curves
    items.js          # materials, bases, affixes, loot tables, uniques
    abilities.js      # surgebinding powers + enemy moves
    bestiary.js       # enemies, mini-boss, final boss, scaling
    quests.js         # main arc + side quests
  world.js            # overworld generation (biomes, sites, roads)
  dungeon.js          # dungeon floor generation
  player.js           # character: attributes, gear, derived stats, leveling
  combat.js           # turn-based battle resolver
  save.js             # localStorage persistence
  render.js           # canvas ASCII viewport + minimap
  ui.js               # HUD + generic menu rendering
  game.js             # state machine: movement, encounters, quests, input glue
  screens.js          # keyboard input + every overlay screen
  main.js             # bootstrap
test/
  sim.js              # headless logic tests (worldgen, loot, combat, final boss)
  browser.js          # Chromium smoke test of the full UI flow
  shots.js            # screenshot capture
```

---

## Tests

```bash
npm test            # headless logic simulation (no browser needed)
npm run test:browser   # full UI smoke test in Chromium (needs playwright-core)
```

The logic suite generates worlds, rolls hundreds of items, levels a character, runs
dozens of battles, and verifies a maxed champion can actually defeat the final boss.

---

## A note on the goal

This was built to a single brief: *a big, freeform RPG — Elder Scrolls openness,
Dwarf Fortress depth, a Stormlight-flavored world, tons of equipment and randomness and
directions to go, intentional low-fi ASCII graphics, all the way to a final boss, and it
all plays smoothly.* Journey before destination.
