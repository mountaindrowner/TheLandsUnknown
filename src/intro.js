/* ============================================================
 * intro.js — the opening cinematic + the Order lore.
 *
 * A slow, dark, mythic prologue in the Souls/Miyazaki idiom: it poses
 * the deep world, frames you as a tiny figure within it, and resolves
 * into the choosing of an Order. Narration beats fade in over the
 * generative vistas (src/art/scenes.js); the player advances or skips.
 * SCREENS.intro (in screens.js) renders it; this file owns the content
 * and the Game hooks.
 * ============================================================ */
(function (TLU) {
  'use strict';

  // Each beat: a vista `kind`, a chapter caption, and narration lines.
  var BEATS = [
    { kind: 'world', chapter: 'I · The Lands Unknown', lines: [
      'Before the holds, before the Kindled, there were a thousand ages —',
      'and a thousand worlds, each raised upon the bones of the last.',
      'This is the worn skin of the world they left. We call it Aurenmark.',
    ] },
    { kind: 'churn', chapter: 'II · The Churn', lines: [
      'Out of the east it comes, patient as rust: the Churn.',
      'The old machines, still at their work — taking the world apart, a grain at a time.',
      'Where it passes, the land is undone, and the dead are shaken loose.',
    ] },
    { kind: 'spires', chapter: 'III · The Unkindled', lines: [
      'The spire-cities promised every child an echo — a soul drawn from the buried machines,',
      'to wake the old powers and make them Kindled.',
      'You, they cast out. Unkindled. Nameless. Alone.',
    ] },
    { kind: 'echo', chapter: 'IV · The Bond', lines: [
      'But the dead choose their own.',
      'An echo has found you in the dark — a fragment of someone the world forgot —',
      'and at its touch, the old arts stir in your hands.',
    ] },
    { kind: 'throne', chapter: 'V · The Gloammother', lines: [
      'Beneath ruined Dawnhollow, the eldest of the Hollow Ones turns in her sleep.',
      'When the Gloammother wakes, the last Churn begins.',
      'There is no one left to stand against her. Only you.',
    ] },
    { kind: 'orders', chapter: 'VI · The Choosing', lines: [
      'Five traditions of the Kindled endure, scattered and all but forgotten.',
      'One will answer to your hand.',
      'Rise, little echo. The world is unkind, and wide, and waiting.',
    ] },
  ];

  // Richer, darker descriptions for the Order-choosing screen.
  // role → which portrait face to draw; lines → the evocative read.
  var ORDER_LORE = {
    skyrender: { role: 'skirmisher', tag: 'Sky & Fall',
      desc: 'They wake the old lift-engines and turn a thing\'s own weight against it — flinging foes from their feet, pinning them to the stone. Quick, far-ranging, and merciless from above.' },
    stonewarden: { role: 'warden', tag: 'The Unbroken Wall',
      desc: 'They command the cohesion of stone and alloy, and will not break. The wall the Churn cannot pass; the last of any company to fall.' },
    slipstrider: { role: 'skirmisher', tag: 'The Frictionless Dance',
      desc: 'Friction forgets them. They slide between blows untouched, and coax torn flesh to knit again — the dance and the mending, in one hand.' },
    veilseer: { role: 'channeler', tag: 'Half-Seen',
      desc: 'They weave hard-light into shapes that lie, and read the pattern of what is coming. Half-here and half-elsewhere, always a step ahead of the blade.' },
    cinderwright: { role: 'channeler', tag: 'The Unmaking Hand',
      desc: 'They speak the word that takes a thing apart — matter undone by a touch of cutting flame. Feared in every hold, and not without cause.' },
  };

  TLU.Intro = { BEATS: BEATS, ORDER_LORE: ORDER_LORE };

  // ---- Game hooks -----------------------------------------------------
  function install(Game) {
    if (!Game) return;
    // `then` = where to go when the cinematic ends: 'chargen' (default) or 'title'
    Game.prototype.startIntro = function (then) {
      this.state = 'intro';
      this.overlay = { type: 'intro', beat: 0, then: then || 'chargen', seed: 't' + (this.turnCount || 0) };
      this.render();
    };
    Game.prototype.advanceIntro = function () {
      var o = this.overlay; if (!o || o.type !== 'intro') return;
      o.beat++;
      if (o.beat >= BEATS.length) { this.endIntro(); return; }
      this.render();
    };
    Game.prototype.endIntro = function () {
      var o = this.overlay || {};
      if (o.then === 'title') this.openTitle(); else this.startChargen();
      this.render();
    };
  }

  if (TLU.Game) install(TLU.Game);
  else { var prev = TLU._onGame; TLU._onGame = function (G) { if (prev) prev(G); install(G); }; }
  TLU.Intro.install = install;
})(window.TLU = window.TLU || {});
