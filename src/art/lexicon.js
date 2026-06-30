/* ============================================================
 * art/lexicon.js — generative epithets & field-journal notes.
 *
 * The pictures get faces; this gives them lives. Deep combinatorial
 * tables turn a seed into an epithet ("the Ashbound", "Warden of the
 * Last Gate") and a two-line biographer's note — origin, a physical
 * tell drawn from the portrait's own traits, a habit, and a reason
 * they walk the marches. Seeded, so a companion's story never drifts.
 * ============================================================ */
(function (TLU) {
  'use strict';
  var A = TLU.Art;

  var HOLDS = ['Vesmark', 'Caldspire', 'Thornholt', 'Greywall', 'Saltmere', 'Emberhold', 'Dunmoor', 'Highreach', 'the Ashlands', 'the drowned east', 'a hold the Churn has since unmade', 'the windward marches'];
  var ORIGIN_ADJ = ['windward', 'salt-bitten', 'ash-grey', 'far-northern', 'low-born', 'cloister-raised', 'reaver-orphaned', 'rift-touched', 'twice-displaced'];

  var EP_ADJ = ['Ashbound', 'Stormwise', 'Unmournful', 'the Late', 'Grey', 'Hollow-touched', 'Twice-Killed', 'Riftborn', 'the Quiet', 'Unkindled', 'Cinder-marked', 'the Patient', 'Saltworn', 'the Unbroken', 'Lastlight', 'the Tallykeeper', 'Stonefast', 'Emberwake', 'the Unsleeping', 'Churn-spurned'];
  var EP_OF = [
    ['Warden', ['the Last Gate', 'a fallen hold', 'the Quiet Field', 'no banner', 'the salt road']],
    ['Keeper', ['Tallies', 'the Dead', 'a broken oath', 'the eastern lamps', 'lost names']],
    ['Walker', ['the Churnreach', 'the unmade roads', 'the grey marches', 'the long east']],
    ['Last', ['of an order', 'of a bloodline', 'of a drowned hold', 'to leave the wall']],
  ];
  var NICK = ['Grey-eye', 'Coalhand', 'Saltwidow', 'Ninefingers', 'Hollowcheek', 'Brightblade', 'Lowvoice', 'Stormear', 'Ashlung', 'Onelamp', 'Dryeye', 'Cairnhand'];

  function pick(rng, a) { return a[Math.floor(rng.next() * a.length)]; }

  // a short epithet, e.g. "the Ashbound" or "Warden of the Last Gate"
  function epithet(seed) {
    var rng = new TLU.RNG('epithet:' + seed);
    var roll = rng.next();
    if (roll < 0.5) return 'the ' + pick(rng, EP_ADJ).replace(/^the /, '');
    if (roll < 0.8) { var pair = pick(rng, EP_OF); return pair[0] + ' of ' + pick(rng, pair[1]); }
    return 'called ' + pick(rng, NICK);
  }

  // role-coloured noun for the trade
  var TRADE = {
    warrior: ['swordhand', 'line-breaker', 'oathblade', 'shieldbreaker'],
    warden: ['warden', 'wallkeeper', 'shieldbearer', 'bulwark'],
    skirmisher: ['skirmisher', 'outrider', 'knife', 'pathfinder'],
    channeler: ['channeler', 'anima-singer', 'gemwright', 'surge-touched'],
    explorer: ['wanderer', 'charter', 'marchwalker', 'far-strider'],
    folk: ['traveller', 'survivor', 'hold-soul', 'wayfarer'],
  };

  // tells drawn from portrait traits (so words match the drawing)
  function tellFor(rng, t) {
    var tells = [];
    if (t) {
      if (t.mark === 'scar') tells.push('a pale scar splits one brow');
      if (t.mark === 'warpaint') tells.push('the old war-bands still painted across the eyes');
      if (t.mark === 'cheekmark') tells.push('three mourning-marks scored down one cheek');
      if (t.mark === 'brand') tells.push('a faded order-brand burned at the brow');
      if (t.age === 'old') tells.push('weathered past counting, and unhurried with it');
      if (t.age === 'weathered') tells.push('a face the wind has had its way with');
      if (t.fhair === 'beard') tells.push('a grey-shot beard kept against the cold');
      if (t.eyes === 'narrow') tells.push('eyes narrowed as if always reading the horizon');
      if (t.earring) tells.push('a single anima-bead at one ear');
      if (t.throat) tells.push('a chipped polestone worn at the throat');
    }
    if (!tells.length) tells = ['lean and quiet', 'unremarkable until the killing starts', 'plain-cloaked and watchful'];
    return pick(rng, tells);
  }

  var HABIT = [
    'keeps a charcoal tally of the dead on one bracer, and counts it nightly',
    'will not sleep facing the Churn',
    'hums hold-hymns no living hold remembers',
    'sharpens an already-keen blade to fill the silence',
    'carries a child\'s shoe wrapped in oilcloth and will not say whose',
    'pours out the first sip of any drink "for the loosed"',
    'maps every ruin twice, trusting neither hand',
    'speaks to the echoes when they think no one hears',
    'never lights more than one lamp, however dark it gets',
    'collects the names of the dead like other folk collect coin',
    'flinches at thunder but walks toward it anyway',
    'buries a stone at every crossroads, an old marcher\'s custom',
  ];
  var MOTIVE = [
    'walks the marches because the Churn took everyone who stayed',
    'follows a Kindled in hope of an ending worth the walking',
    'owes a debt that outlived the one it was owed to',
    'is looking for a grave that keeps moving',
    'swore an oath to a hold that no longer stands',
    'means to see the Heart of the Churn before the Churn sees them',
    'has nothing left to lose and a great deal left to spend',
    'believes the dead can still be carried home, if anyone bothers',
    'remembers the world before, and refuses to let it go quiet',
  ];

  // a two-line field note. opt: { role, traits, fem }
  function bio(seed, opt) {
    opt = opt || {};
    var rng = new TLU.RNG('bio:' + seed);
    var trade = pick(rng, TRADE[opt.role] || TRADE.folk);
    var origin = pick(rng, ORIGIN_ADJ), hold = pick(rng, HOLDS);
    var tell = tellFor(rng, opt.traits);
    var habit = pick(rng, HABIT), motive = pick(rng, MOTIVE);
    var who = (opt.fem === true) ? 'She' : (opt.fem === false) ? 'He' : 'They';
    var verb = who === 'They' ? '' : 's';
    var s1 = cap(origin) + ' ' + trade + ', out of ' + hold + '; ' + tell + '.';
    var s2 = who + ' ' + habit.replace(/^keeps/, who === 'They' ? 'keep' : 'keeps') + '.';
    var s3 = cap(who) + ' ' + motive.replace(/^walks/, who === 'They' ? 'walk' : 'walks').replace(/^follows/, who === 'They' ? 'follow' : 'follows') + '.';
    return s1 + ' ' + s3;
  }

  // a naturalist's specimen note for a creature
  var BEAST_HABITAT = ['the windward flats', 'old unmakings', 'drowned riftvaults', 'the Churnreach', 'stonewood deeps', 'crater-glass barrens', 'the ash dunes'];
  var BEAST_NOTE = [
    'Drawn from a carcass; the living specimen would not hold still for the plate.',
    'Hunts at the Churn\'s edge, where the unmaking keeps it fed.',
    'Sketched at forty paces and a dead run. Errors are the artist\'s.',
    'Said to be drawn to anima the way moths take a lamp.',
    'The eyes keep their light a full day after death. The locals bury them deep.',
    'Marrow sells well to gemwrights; the meat to no one.',
    'Moves in the storm-shadow and is gone before the thunder.',
  ];
  function beastNote(seed) {
    var rng = new TLU.RNG('bnote:' + seed);
    return 'Of ' + pick(rng, BEAST_HABITAT) + '. ' + pick(rng, BEAST_NOTE);
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  A.epithet = epithet;
  A.bio = bio;
  A.beastNote = beastNote;
})(window.TLU = window.TLU || {});
