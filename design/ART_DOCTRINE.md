# The Folio Art Doctrine

*How the generative ink-art works, and why it reads as designed rather than generated.*

This document exists because the portraits "struck gold," and the reasoning behind
them should be reusable — for creatures, props, and anything else we draw from a seed.
It is both an explanation and a build spec. `src/art/portrait.js` is the reference
implementation; `src/art/beast.js` applies the same doctrine to animals; the shared
pen is `src/art/ink.js`.

---

## The one idea

**Draw anatomy parametrically, then vary the parameters — never draw a picture.**

We do not author a face. We author a *system of landmarks* — a skull, a brow line, an
eye baseline, a jaw, a chin — each placed by a named number. A face is a closed path
through those landmarks. Change the numbers and the whole thing reshapes coherently,
because every feature is positioned *relative to the same anatomy*. That is the entire
trick. Everything below is in service of it.

---

## The seven principles

### 1. Parametric anatomy, not templates
Every feature is a function of a few named measures — for faces: skull half-width `sh`,
jaw width `jaw`, chin point `chin`, and fixed baselines (`topY`, `browY`, `eyeY`,
`noseY`, `mouthY`, `chinY`). The face outline is a closed curve through ~12 landmark
points derived from those measures. Because eyes, nose, and mouth are all placed against
the *same* baselines, the face stays plausible no matter how the measures move.

> Generalize: before drawing any subject, define its skeleton as named measures
> (a creature's spine length, shoulder height, head mass, leg span). Draw every part
> relative to that skeleton.

### 2. Orthogonal trait axes that combine combinatorially
Identity comes from the **cross-product of independent choices**. A portrait rolls head
shape × eyes × nose × mouth × brow × hair × facial hair × marking × age × adornments —
each picked independently from the seed. Six shapes × five eyes × five noses × five
mouths × … is tens of thousands of legible combinations, and because the axes are
*orthogonal* (a square jaw pairs with any nose), every individual feels specifically
itself rather than a palette-swap.

> Generalize: list the parts that can vary independently, give each 3–6 discrete
> variants, and roll them separately. Avoid "presets" — presets collapse the
> cross-product and everything starts to rhyme.

### 3. Curves, not corners
Features are quadratic curves through landmark points, never straight blocky segments.
This is why the heads read as "rounded and varied, not one blocky shape." A jaw is a
soft arc between cheek and chin; a brow is a three-point bend. Corners read as
mechanical; curves read as grown.

### 4. The inked hand (seeded jitter)
Every stroke is nudged by a tiny seeded random amount (`amt`). Lines wobble a pixel or
two like a real pen, so the result reads as *drawn*, not plotted. The jitter is seeded,
so it is stable — the same face wobbles the same way every time. This single touch is
most of what separates "engraving" from "vector clip-art."

### 5. Form through hatching, not fill
Volume comes from engraved cross-hatch, not flat shadow. A face is shaded on **one**
seeded side (cheek, under-jaw), giving it a light source and a printed-plate quality.
Hatching is cheap (a `<pattern>`), tonal, and on-genre for a field journal.

### 6. Anchored proportions, variation within constraints
Variation happens *inside* the canon of proportion. Eyes sit on a baseline; brows a set
distance above; the nose spans brow-to-nose-line; the mouth sits between nose and chin.
We move features within believable ranges, never outside them. Freedom bounded by
anatomy is what keeps a thousand random faces all looking like people.

### 7. Seeded identity, sparing accent
Same seed → same subject, forever (a companion keeps one face across saves and worlds).
And a **single** accent colour per subject, used sparingly (a throat-gem, an earring,
war-paint, a creature's eye-glint), ties it to its role/faction without visual noise.
Restraint is what makes the ink read as tasteful.

---

## Applying the doctrine to creatures

The same method, a different skeleton. A creature is built from:

- **Body plan** (parametric): spine length, shoulder height, head mass, posture
  (quadruped / hunched / upright / serpentine), all seeded.
- **Orthogonal axes:** head type (maw / beaked / horned / blunt) × eye arrangement
  (single / paired / clustered) × crest/horn style × hide texture (smooth / plated /
  bristled / hatched) × leg build (digitigrade / column / many) × tail/spine type ×
  jaw state. Rolled independently, exactly like facial features.
- **Curves + jitter + hatching:** identical pen. Silhouettes are landmark paths;
  undersides and mass are hatched; the eye carries the accent.
- **Tag-biased family resemblance:** a creature's tags (`rift` / `stone` / `reaver` /
  `swarm`) *bias the axes* rather than switching renderers — `rift` favours hollow
  voids and clustered ember-eyes, `stone` favours angular carapace plates and column
  legs. So all rift-things share a look while each individual still varies. (This is the
  creature analogue of "an Order's accent colour.")

The failure mode to avoid is the **blob**: a single silhouette with a couple of knobs.
The fix is always the same — add an orthogonal axis with real variants and roll it from
the seed.

---

## Checklist for any new generated subject

1. Define the skeleton as named measures.
2. List the independently-varying parts; give each 3–6 variants.
3. Draw every part relative to the skeleton, with curves.
4. Jitter every stroke (seeded).
5. Shade with one-sided hatching for form.
6. Keep proportions anchored; vary within range.
7. One accent, used sparingly. Same seed → same subject.

If a result looks generated, it has usually broken #2 (too few axes) or #3 (corners /
absolute coordinates instead of skeleton-relative curves). Add an axis or re-anchor.
