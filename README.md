# The Lands Unknown
### *A Chronicle of Gale and Gleam*

A large, open-world **ASCII RPG** that blends the freeform exploration and skill-by-use
progression of **The Elder Scrolls**, the deep procedural systems of **Dwarf Fortress**,
and the emergent, story-soaked pull of **RimWorld** and **Minecraft** — set in an
original storm-haunted world of gale, gleam, and living wisps.

Wander a seed-generated continent, bind the surges, hoard randomized Riftgear, gather
rumors from a town full of talkative NPCs, fill in a discovery Codex as you explore —
and, when you are ready, descend into ruined Dawnhollow to face the final boss:
**Vethra, the Gloammother**.

It runs entirely in the browser with **no build step and no dependencies**.

## ▶ Play it now

**[▶ Play in your browser (githack)](https://raw.githack.com/mountaindrowner/TheLandsUnknown/claude/eldest-girl-dwarf-fortress-ejhqoz/index.html)**

```
https://raw.githack.com/mountaindrowner/TheLandsUnknown/claude/eldest-girl-dwarf-fortress-ejhqoz/index.html
```

> The githack link serves the game straight from this branch — it works as long as the
> repository is **public**. If the page doesn't load, the repo is likely private; make it
> public (or use a local run, below) and the same link will work.

**Run locally instead:** clone the repo and either open `index.html` directly, or serve it:

```bash
python3 -m http.server 8080      # then open http://localhost:8080
```

![Title](assets/screenshot-title.png)
![Overworld](assets/screenshot-play.png)
![NPC dialogue](assets/screenshot-npc.png)
![Codex](assets/screenshot-codex.png)
![Combat](assets/screenshot-combat.png)

---

## The world

> *The Galestorm walks the world from east to west, and where it passes the stones wake
> and the souls of the dead drift like embers on the wind. You are one of the Gleamless —
> born without the gift the temples promised, cast out of the spire-cities to wander the
> sundered marches. But the wisps have begun to gather at your shoulder...*

- **Aurenmark** — a sundered continent crossed by the living **Galestorm**.
- **Gleam** — stored storm-light, breathed from charged gems to fuel surgebinding.
- **Wisps** — fragments of living spirit that gather at the shoulders of the would-be **Sworn**.
- **The five Orders** — Galewalker, Stonewarden, Slipstrider, Veilseer, Cinderwright — each
  binding two of the eight Surges.
- **The Rift** — a soul-severing weapon shattered into four fragments, scattered in drowned vaults.
- **The Hollow Ones** — old, patient, hungry forces. **Vethra, the Gloammother**, is the eldest that wakes.

### Controls

| Action | Keys |
|---|---|
| Move | Arrow keys / `WASD` / `HJKL` (+ `YUBN` diagonals) |
| Interact · enter site · take stairs | `Enter` or `E` |
| Inventory | `I` |
| Character & spend level-up points | `C` |
| Quests & bounties | `Q` |
| **Codex / Journal** | `Shift+L` |
| Pause / Save / Quit | `Esc` |
| Help | `?` |

The game **auto-saves** as you travel and on major events.

---

## What's in it

- **Procedural open world.** A value-noise continent with nine biomes, holds (towns),
  drowned Riftvaults, reaver camps, roads, galestorms, and a far-eastern danger gradient —
  every world is reproducible from its seed.
- **A world that talks.** Towns are populated with named, archetyped **NPCs** — innkeepers,
  gem-merchants, drillmasters, guards, scholars, wanderers, street children, stormpriests,
  riftsmiths — each with deep pools of greetings, banter, and lore. Ask for **rumors** to
  hear flavor or to get nearby vaults, camps, and the warlord's lair **marked on your map**.
- **A discovery Codex.** A journal that fills in as you play: World lore, Factions, a
  **Bestiary** that records each creature you slay, **Places** you've charted, and every
  **rumor** you've heard. Discovery is the pull.
- **Ambient life & travel events.** Evocative barks while you roam, plus non-combat
  micro-events — a wisp's gift of Gleam, a traveler's cairn, a roadside shrine, a wandering
  healer, tainted water — that keep the road surprising.
- **Skill-by-use progression (Elder-Scrolls style).** 21 skills across combat, armor,
  surgebinding and utility that level *through use*; skill-ups feed your character level
  and grant attribute points you allocate freely.
- **Mountains of randomized loot.** Seven material tiers × weapon/armor bases ×
  prefix/suffix affixes, plus hand-authored artifacts (the living Riftblade *Gravewind*,
  *Gleamsworn Riftplate*, *Cinderfall*). Rarities from common to artifact.
- **Final-Fantasy-style turn-based combat.** Initiative order, crits, elements,
  armor-piercing, blocking, status effects (burn/bleed/stun/bound/fear/guard/evade…),
  fleeing, and a multi-phase final boss that spawns murderous shadows and escalates.
- **Roguelike dungeon delving.** Multi-floor vaults with room/corridor generation,
  raycast field-of-view, wandering monsters, chests, infused gems, and Rift fragments.
- **Quests in many directions.** A main arc (gather the Rift, end Warlord Varen, descend
  Dawnhollow) plus faction side-quests and bounties — pursue them in any order.
- **Towns & economy.** Rest at inns, buy/sell from refreshing merchant stock, pay
  trainers, and counsel with the Galewardens. Bartering improves with use.

---

## Project layout

```
index.html            # loads everything in order (no build step)
styles.css            # terminal / FF-menu aesthetic
src/
  rng.js              # seedable deterministic RNG (Mulberry32)
  data/
    lore.js           # world flavor, orders, gems, name generator, biome flavor
    skills.js         # skill definitions + XP curves
    items.js          # materials, bases, affixes, loot tables, uniques
    abilities.js      # surgebinding powers + enemy moves
    bestiary.js       # enemies, mini-boss, final boss, scaling
    quests.js         # main arc + side quests
    dialogue.js       # NPC archetypes, rumors, codex, barks, travel events
  world.js            # overworld generation (biomes, sites, roads)
  dungeon.js          # dungeon floor generation
  player.js           # character: attributes, gear, derived stats, leveling, codex
  combat.js           # turn-based battle resolver
  save.js             # localStorage persistence
  render.js           # canvas ASCII viewport + minimap
  ui.js               # HUD + generic menu rendering
  game.js             # state machine: movement, encounters, quests, discovery
  screens.js          # keyboard input + every overlay screen
  main.js             # bootstrap
test/
  sim.js              # headless logic tests (worldgen, loot, combat, final boss)
  browser.js          # full UI playthrough in Chromium (town/NPC/codex/dungeon/boss)
  shots.js            # screenshot capture
```

---

## Tests

```bash
npm test               # headless logic simulation (no browser needed)  -> 828 checks
npm run test:browser   # full UI playthrough in Chromium (needs playwright-core) -> 24 checks
```

The logic suite generates worlds, rolls hundreds of items, levels a character, runs
dozens of battles, and verifies a maxed champion can defeat the final boss. The browser
suite drives the *real* UI from the title screen through chargen, every overlay, all town
services, an NPC conversation, the codex, a dungeon entry, normal combat, and a
**final-boss victory** — asserting zero console errors throughout.

---

## A note on the goal

Built to a single brief: *make it completely playable; reskin the world from an obvious
inspiration into something original but kindred; pack it with NPC dialogue and lore; make
it enthralling like the games that pull people in for hundreds of hours; and give me a link
to play.* Strength before weakness. Journey before destination.
