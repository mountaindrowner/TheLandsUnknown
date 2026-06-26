# Design Refinement — *The Lands Unknown*

A working questionnaire to push the game from "complete vertical slice" to "the kind of
game people lose hundreds of hours in." Answer inline (a sentence each is plenty), or
just react to the **recommendation** I've pre-baked into each section. The last section
pitches **unique spins** the genre hasn't really explored — pick a lane and I'll build it.

Legend: ⭐ = my recommended default if you don't want to decide.

---

## A. The core gameplay loop (minute-to-minute)

The loop today: *roam the overworld → random encounter or site → fight / loot / talk →
return to town to spend → repeat → push east.* It works but it's thin. Questions:

1. **What is the player's moment-to-moment fantasy?** Pick the dominant one:
   - (a) **Tactician** — combat is the point; encounters should be puzzles. ⭐
   - (b) **Explorer** — the map and its secrets are the point; combat is texture.
   - (c) **Collector** — gear/loot/lore completion is the point.
   - (d) **Storyteller** — emergent character drama (RimWorld-style) is the point.
   - *Most great games of this type pick a primary and a strong secondary. What's yours?*
2. **Should overworld combat stay random**, or move to **visible enemies you can avoid,
   ambush, or sneak past** (Dwarf-Fortress/roguelike style)? ⭐ Visible — it rewards
   skill and makes the map feel inhabited.
3. **How long is one "session"?** 5-minute mobile bursts, 30–60 min sittings, or both?
   This decides save granularity, run length, and how punishing death should be.
4. **What's the friction we want?** Today travel is free and safe-ish. Do you want
   meaningful **survival pressure** (food, storms, light, supply) ⭐, or should the world
   be frictionless so players chase goals unimpeded?

## B. Progression & depth (the 40-hour question)

5. **Is character power best expressed through gear, skills, or surges?** Today all three
   exist but shallowly. ⭐ Make **skills the spine** (they level by use → unlock perks),
   gear the **variance**, surges the **expression**. Agree, or rebalance?
6. **Perks / talents:** add a perk tree per skill (every few skill levels = a meaningful
   choice)? ⭐ Yes — choice-on-level-up is the single biggest depth multiplier here.
7. **Crafting & economy:** how deep? Options: (a) none, (b) gem-infusion + enchanting only,
   ⭐ (c) full loop — gather materials, craft/upgrade gear, infuse gems, brew alchemy.
8. **Companions / followers (RimWorld pull):** do you want recruitable NPCs with their own
   skills, opinions, and arcs who travel and fight with you? ⭐ Yes, lightweight — 1–3
   companions create the emergent-story hook this genre thrives on.
9. **Bases / settlement:** claim and develop a hold (build, assign, defend)? This is the
   Dwarf-Fortress/Minecraft "make a mark on the world" axis. Worth a whole mode, or a
   distraction from the adventure? *(Big fork — see §E spin #2.)*

## C. Endgame & "what do I do at level 30?"

10. **What happens after the final boss?** Today: a victory screen. Options:
    - (a) **New Game+** with harder world + carried gear. ⭐
    - (b) **Open endgame** — the Galestorm intensifies; the world becomes a roguelite
      gauntlet of escalating Hollow incursions you hold back indefinitely.
    - (c) **Legacy** — retire your hero into the world as an NPC/legend; start an heir who
      inherits a piece of your power (DF-style dynasties).
11. **Endless scaling vs. authored apex:** do you want **infinite procedural depth**
    (paragon levels, endless vaults, leaderboard-style "how deep can you go") ⭐, an
    **authored hard ending** (a true final challenge that caps the curve), or both?
12. **Build chase:** should the endgame be about **finding the one build** (set items,
    capstone perks, a signature combo) the way ARPGs do? ⭐ Yes — a few build-defining
    legendaries/perks give the long tail purpose.

## D. Variance & replayability (why play again?)

13. **How different should two playthroughs be?** Today the world reseeds but the beats are
    fixed. Add: (a) randomized **faction alignment** (who's the villain shifts), (b)
    **world modifiers / seeds with traits** ("the Long Storm", "the Gleam Famine"), ⭐ (c)
    procedural **main-quest variants** (the Rift's pieces, bosses, and ending vary).
14. **Difficulty & accessibility:** a settings screen (combat speed, permadeath toggle,
    encounter rate, text size) ⭐ — important for mobile and for the broad audience you
    mentioned. Which knobs matter most to you?
15. **Permadeath stance:** ⭐ optional — a forgiving default (reload last camp) plus a
    **Storm-sworn / hardcore** mode for the people who want the roguelike stakes.
16. **Mod/content reach:** now that the **content framework** exists, do you want an
    in-game **content browser / pack toggles**, and eventually a way to share packs? This
    is the Minecraft-mod flywheel — community content = infinite replayability.

## E. The unique spin (pick one to make this *not* just another roguelike RPG)

Here are four original mechanics built around what's *already* in the fiction — the living
storm, the wisps, the soul-severing Rift. Each could be **the** thing this game is known for.

1. **The Storm as a living clock & second player.** ⭐⭐ The Galestorm isn't weather — it's a
   *roaming systemic force* that physically crosses the map on a schedule you can read and
   exploit. It supercharges your surges and reveals hidden vaults in its path, but
   transforms the wilds into deadly stormforms and *rewrites terrain* behind it. Master
   players **chase or flee the storm** as a core strategic layer — plan routes around it,
   bank Gleam before it passes, raid vaults only the storm can open. Nobody has made the
   weather a *thing you duel with*. *(Lowest-risk, highest-fit — the lore already supports it.)*

2. **Wisp-bonding as the whole progression system.** Instead of an XP bar, your power comes
   from **bonding wisps** — semi-autonomous spirit companions, each a *living perk with
   opinions*. They grow by witnessing you live up (or fail) your Oaths; break an Oath and a
   wisp can **abandon you mid-fight**, stripping a power at the worst moment. Builds become
   *relationships you maintain*, not stats you grind. (RimWorld's emergent drama meets a
   skill tree that can quit on you.)

3. **Death feeds the world (the soul-economy spin).** The Rift *severs souls*; the storm
   *carries the dead east*. Make that mechanical: every creature you kill releases a soul
   that the storm sweeps toward Dawnhollow, and **the final boss grows stronger the more you
   kill** along the way. The game becomes a tension between power (kill to grow) and
   consequence (every kill arms the apocalypse) — a pacifist-viable, choices-have-weight
   roguelite where *how* you win is the puzzle. ⭐⭐ *(Boldest, most "no one's done this".)*

4. **Asynchronous dynasties / shared world.** Permadeath isn't the end — your fallen hero
   becomes a **ghost-wisp NPC** seeded into *your next run and (optionally) other players'
   worlds*, carrying your last words and a fragment of your gear. The continent slowly fills
   with the legends of everyone who died there. (Dark Souls messages × Dwarf Fortress
   legends, fully offline-capable.)

**My pick:** lead with **#1 (the storm as a duelable clock)** as the signature loop because
it's the lowest-risk, best-fit, and instantly readable; layer **#3 (soul-economy)** as the
moral/strategic depth that gives the *narrative* its unique edge. Together they make a game
that is recognizably *about its world* rather than a reskin of the genre.

---

### How to use this
Reply with letters/numbers and any notes (e.g. *"A:(a)+(d), B-survival yes, E:#1 lead #2
secondary"*). I'll turn your answers into a concrete build plan and start implementing —
likely in this order: settings/accessibility → visible encounters → perks-on-levelup →
the chosen unique spin → endgame mode.
