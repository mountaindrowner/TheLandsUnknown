# Portrait Notes — the decisions, quantified

A companion to [`ART_DOCTRINE.md`](ART_DOCTRINE.md). That file is the *why*; this one is
the *what and how much* — the specific observations about human faces that the portrait
generator (`src/art/portrait.js`) encodes, with the actual numbers. It exists because the
faces worked, and the reasoning behind them should be legible and reusable.

All coordinates are in the portrait's 200×200 viewBox, centre line `cx = 100`.

---

## 1. The observations (what makes ink read as a *face*)

1. **A face is proportions before it is features.** The eye is forgiving of strange
   features but unforgiving of wrong spacing. So the spacing is fixed and the features vary.
2. **The eyes sit near the vertical middle of the head, not the top.** Beginners draw eyes
   too high. Real eyeline ≈ halfway between crown and chin.
3. **The face is five eyes wide; the eyes are one eye-width apart.** This single ratio is
   what makes two dots read as "a person" rather than "a mask."
4. **Brow→nose, nose→chin, and crown→brow are roughly equal thirds.** Violating any third
   reads as caricature; we stay inside it and vary *within* it.
5. **Heads are not ovals — they're a cranium plus a jaw,** and the jaw is where character
   lives (a square jaw and a heart jaw are different *people*, not different moods).
6. **Light comes from one side.** A face shaded on one cheek reads as solid; shaded on both
   (or neither) reads as flat. We pick a side and commit.
7. **The line must wobble.** A perfectly smooth contour reads as plastic; ~1px of seeded
   jitter reads as a pen. This is the difference between "vector" and "engraving."
8. **Identity is mostly nose + jaw + brow + hairline.** Eyes and mouths carry expression;
   the *bones* carry who-it-is. So those four axes get the most variants.

---

## 2. The proportional canon (the fixed skeleton)

Every feature is placed against these baselines. They never move — variation happens
*between* them, never by breaking them.

| Landmark | y | as a fraction of crown→chin (33→150) |
|---|---|---|
| Crown (skull top) | **33** | 0.00 |
| Brow line | **79** | 0.39 |
| Eye line | **93** | 0.51 — *the middle, as observed* |
| Nose base | **111** | 0.67 |
| Mouth | **128** | 0.81 |
| Chin | **150** | 1.00 |

- Crown→brow = 46, brow→nose = 32, nose→chin = 39 — the "equal thirds," loosely (the
  forehead is deliberately the tallest third; it reads as noble/serious, on-genre).
- Eye spacing: eye centres at **cx ± 17** (≈ one eye-width gap, observation #3).

## 3. The bones, as numbers (what varies the *person*)

Skull half-width `sh`, jaw width `jaw`, and chin point `chin` are looked up by **face shape**
and then scaled by **build** (a per-role multiplier). These three numbers reshape the whole
silhouette coherently because the outline is a 12-point closed curve through them.

| shape | sh (cheek half-width) | jaw (lower width) | chin (point) |
|---|---|---|---|
| oval | 38 | 26 | 9 |
| square | 44 | 38 | 16 |
| round | 42 | 32 | 13 |
| long | 35 | 24 | 8 |
| heart | 40 | 20 | 7 |
| angular | 41 | 30 | 11 |

- `sh *= (0.92 + build*0.08)`, `jaw *= (0.95 + build*0.05)`.
- **build** by role: warden 1.18, warrior 1.12, explorer/folk 1.00, skirmisher 0.92,
  channeler 0.90. So a warden is broad-skulled and heavy-jawed; a channeler is finer — the
  class reads in the bone structure before any gear.

## 4. The trait axes (independent rolls from the seed)

Each is chosen separately, so they multiply rather than add. Counts in brackets.

- **shape** [6]: oval, square, round, long, heart, angular
- **eyes** [5]: almond, round, narrow, hooded, wide — drives lid curve + height
  (round h≈6, narrow h≈3, hooded 3.6, else 4.6) and width (wide 11, narrow 8.5, else 10)
- **nose** [5]: straight, aquiline, broad, snub, hooked — each a distinct 3–4-point stroke
- **mouth** [5]: neutral, set, wry, frown, soft — a curve offset (neutral 0, set −0.5,
  frown +3, soft −2; wry is asymmetric)
- **brow** [3]: straight, arched, heavy (set by role) — heavy brows stroke at width 3 vs 2
- **hair / headwear** [~8 per role]: crop, swept, wavy, long, braid, topknot, bald, cap,
  hood, bandana, helm, greathelm, circlet, diadem, veil, widehat — role-weighted
- **facial hair** [6, weighted]: none, none, stubble, beard, mustache, goatee (women → none;
  old men biased toward beard)
- **markings** [6, weighted]: none, none, scar, cheek-mark, war-paint, brand
- **age** [5, weighted young/prime/prime/weathered/weathered/old] — adds brow lines &
  nasolabial strokes; greys the hair
- **presentation** [2]: fem/masc — biases hair length and removes facial hair
- plus booleans: **earring** p=0.25, **throat-gem** p=0.55, **one-sided shade** p=0.70,
  shade side ±1, **complexion** 0–3 (sets hatch density), and a **continuous gaze** −1..1
  (iris offset = gaze×2.4, so the eyes actually look somewhere)

## 5. Light & line (the "engraving" feel), quantified

- **Shading is one-sided.** Cross-hatch on one cheek/jaw, side = seeded ±1, at opacity
  **0.32**, line gap by complexion **[5, 4, 3.4, 2.8]px** (darker skin = tighter hatch).
  An under-jaw hatch is *always* drawn (gap 3.4, opacity 0.28) to seat the head on the neck.
- **Jitter (the hand).** Every stroke is nudged by a seeded amount `amt`:
  face outline **0.7**, internal features **0.3–0.5**, hair masses **0.6–1.2**, shoulders
  **1.1**. Small enough to stay anatomical, large enough to never look plotted.
- **Stroke weights:** outline 2.1, lids 1.7, brows 2–3, nose 1.4–1.5, mouth 1.8, with a
  faint 0.8–0.9 secondary line on the upper/lower lip for volume.
- **Eyes:** iris r 2.7 with a 0.8 paper highlight (a catch-light — the eye looks *wet*,
  i.e. alive). Hooded eyes get an extra fold stroke; that one line ages a face a decade.

## 6. Why it doesn't repeat (the arithmetic)

Multiplying the discrete axes:

```
6 shape × 5 eyes × 5 nose × 5 mouth × 3 brow × 8 hair × 6 facial-hair
  × 6 marks × 5 age × 2 presentation
  × 2 earring × 2 throat × 2 shade-side × 4 complexion
≈ 3.6 × 10^8 distinct faces
```

…and that's *before* the continuous gaze and the per-seed jitter, which make the realised
space effectively unbounded. Crucially the axes are **orthogonal** — any nose pairs with any
jaw — so the count is a product, not a sum, and every face reads as specifically itself.

## 7. Known soft spots (honest, for the next pass)

- **Hairlines** still cluster; a few presets read as "high forehead." Worth a dedicated
  hairline axis (widow's peak / receding / straight, with temple depth).
- **Mouths** are the weakest feature — a true upper/lower lip with a philtrum would lift them.
- **Ears** are generic by design; fine at this scale, but a 2–3 variant axis is cheap.
- **Necks/shoulders** are a single garment; a couple of collar/cloak variants would add range.

The method generalises: the same skeleton-then-axes approach drives the creatures
(`beast.js`) and the cinematic landscapes (`scenes.js`). See `ART_DOCTRINE.md`.
