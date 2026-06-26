/* ============================================================
 * dialogue.js — the soul of the world: NPCs, rumors, lore codex,
 * ambient barks, and travel micro-events.
 * This is content-heavy on purpose — emergent flavor is the pull.
 * ============================================================ */
(function (TLU) {
  'use strict';

  // ---- NPC archetypes (townsfolk) ----
  // Each has greeting/talk/farewell pools. The `topic` flag enables extra menus.
  const ARCHETYPES = {
    innkeeper: {
      role: 'Innkeeper', glyph: '☺', color: '#ffd86b',
      greet: [
        '"Welcome in, traveler. Mind the mud and mind your manners."',
        '"A bed, a bowl, and a barred door — that\'s all the storm allows."',
        '"Sit, sit. You look like the road chewed you and spat you out."',
        '"We don\'t get many of the Sworn through here. Drinks are half-price for the brave."',
      ],
      talk: [
        '"My grandmother rode out a galestorm in the open once. Came back white-haired and humming songs no one knew."',
        '"Gleam\'s gone dear this season. The gem-merchants hoard it like dragons."',
        '"You hear the wind change before a storm. Like the world holding its breath."',
        '"Folk vanish on the eastern roads. Reavers, mostly. Sometimes worse."',
        '"There\'s an old saying: \'Strength before weakness, journey before destination.\' The Sworn lived by it, before the fall."',
        '"My boy wants to be a soldier. I tell him soldiers feed the storm. He doesn\'t listen."',
        '"Wisps gather where the dead were wronged. We keep a candle lit so ours stay kind."',
        '"Drink up. Tomorrow the wilds will try to kill you, same as today."',
        '"They say the spire-cities float on stored Gleam. I\'ll believe it when one doesn\'t fall."',
      ],
      bye: ['"Storm keep you."', '"Off with you, then. Pay the tab first."', '"Come back breathing, eh?"'],
    },
    merchant: {
      role: 'Gem Merchant', glyph: '$', color: '#67e08a',
      greet: [
        '"Buying, selling, or just letting the rain off your cloak?"',
        '"Finest infused gems this side of the Sundered Plains. Probably."',
        '"Coin talks, traveler. Everything else is just weather."',
      ],
      talk: [
        '"A charged Sapphire holds Gleam for a year. A cracked one? An afternoon, if you\'re lucky."',
        '"The Deepdelvers pay triple for anything dredged from a Riftvault. Triple! For old junk!"',
        '"I dealt a Riftblade once. Held it a single night. The thing whispered. I sold it at dawn for half its worth and slept easier."',
        '"Prices rise the closer you get to the Galeseat. So does the chance of dying. Funny, that."',
        '"Never buy armor you haven\'t struck yourself. Riftsteel rings true; fakes ring flat."',
        '"A wise buyer haggles. A dead buyer paid full price for a coffin."',
      ],
      bye: ['"Pleasure doing business. Try not to die owing me."', '"Spend it before the storm takes it."'],
    },
    trainer: {
      role: 'Drillmaster', glyph: '╪', color: '#dfe6ee',
      greet: [
        '"Stand straight. I can teach a corpse to swing; question is whether you\'ll listen."',
        '"You move like a farmhand. We can fix that. For coin."',
        '"The Sworn trained for ten years before they bonded a wisp. You\'ve got less time. Pay attention."',
      ],
      talk: [
        '"Skill isn\'t bought, it\'s bled for. But coin buys you a teacher to bleed under."',
        '"Heavy armor for those who stand. Light for those who dance. Cowards wear neither and die first."',
        '"A surge is just a muscle you can\'t see. Use it or lose it, same as any."',
        '"I trained a Galewalker once. She could stop a falling man mid-air. The storm took her anyway."',
        '"Block, don\'t flinch. The flinch is what kills you."',
      ],
      bye: ['"Again tomorrow. And the day after. That\'s how it works."', '"Now get out. Go practice."'],
    },
    guard: {
      role: 'Hold Guard', glyph: '♦', color: '#7ec8ff',
      greet: [
        '"Move along. Or don\'t — but keep your hands where I can see them."',
        '"Another wanderer. You\'re either lost, hunted, or trouble. Which?"',
        '"Spire-folk don\'t come this far out unless they\'ve been thrown out. No offense."',
      ],
      talk: [
        '"We lost three on the wall last storm. The wind doesn\'t care how good you are."',
        '"Reavers tested the gate twice this month. They\'ll be back when the warlord says so."',
        '"If you see a Cragwrought walking the storm-lands, you run. You don\'t fight it. You run."',
        '"The Galewardens want us to march east. March east into what? Nobody comes back from Dawnhollow."',
        '"Keep to the roads. The roads are watched. The wilds are not."',
      ],
      bye: ['"Stay out of trouble."', '"Storm\'s coming. It always is."'],
    },
    scholar: {
      role: 'Galewarden Scholar', glyph: '◈', color: '#d9a7ff',
      greet: [
        '"Ah — a mind, perhaps? Or just another sword? Either is useful, in its way."',
        '"You carry wisps. Do you know what that means? Few do, anymore."',
        '"I study the old Orders. The dead ones. They have so much to teach, if you can stand the silence."',
      ],
      talk: [
        '"There were ten Surges and ten Orders, once. Now there are echoes, and people like you who don\'t know what you are."',
        '"The Hollow Ones are not demons. They are forces — old, patient, and very hungry. Vethra is the oldest of those that wake."',
        '"Dawnhollow was a city of light before it became a wound. They say the first Rift shattered there."',
        '"A Riftblade severs the soul, not the flesh. That is why the dead it kills do not rise. Remember that, at the end."',
        '"Gleam is breath made visible. The storm exhales; we inhale. We are, all of us, borrowing the storm\'s lungs."',
        '"If you gather the four fragments, bring them to me. Or to the storm. Or to your own ruin — the result may be the same."',
      ],
      bye: ['"Go carefully. Knowledge is heavy, and you carry enough already."', '"Strength before weakness, Sworn."'],
    },
    wanderer: {
      role: 'Wanderer', glyph: '☂', color: '#caa86a',
      greet: [
        '"Don\'t mind me. Just resting my feet before the next nowhere."',
        '"You\'ve got the look. The road look. We\'re the same, you and I."',
        '"Spare a moment? I\'ve walked too far to talk to walls."',
      ],
      talk: [
        '"I\'ve seen every hold on the map and slept in none of them twice. The road is the only honest place left."',
        '"There\'s a vault out west where the walls bleed gemlight. Went in once. Didn\'t go deep. Wasn\'t brave enough."',
        '"Met a man who\'d been to the Galeseat and back. He didn\'t talk right after. Words came out sideways."',
        '"Everyone\'s running from something. Me? I\'m running from sitting still."',
        '"Found a dead Sworn in the Ashlands. Armor still glowing faint. I couldn\'t move it. Couldn\'t leave it, either. Stayed a while. Then left."',
      ],
      bye: ['"See you down the road. Or not. Roads are funny."', '"Keep walking. It\'s all any of us can do."'],
    },
    urchin: {
      role: 'Street Child', glyph: '·', color: '#9adfff',
      greet: [
        '"You\'re one of them glowy knights, aintcha? Can you do a trick? Do a trick!"',
        '"Got any coin? Got any food? Got any STORIES?"',
        '"Mister! Miss! You been to the vaults? Is it true the monsters there are made of NIGHT?"',
      ],
      talk: [
        '"My friend Teft says if you breathe in enough Gleam you can FLY. He\'s a liar but I believe him."',
        '"The guards chase me but I\'m faster. I know every roof in the hold."',
        '"I saw a wisp once. It looked at me. Then it followed the baker home. Bakers always get the good wisps."',
        '"When I grow up I\'m gonna be one of the Sworn and nobody\'s gonna chase me ever again."',
      ],
      bye: ['"Bye mister! Don\'t die!"', 'The child is already gone, quick as a wisp.'],
    },
    priest: {
      role: 'Stormpriest', glyph: '†', color: '#b9a7ff',
      greet: [
        '"The storm gives and the storm takes. Have you given today?"',
        '"Peace, traveler. Or as much peace as the wind permits."',
        '"You glow faintly. The old light. I will not ask how — only that you use it well."',
      ],
      talk: [
        '"We do not pray to the storm. We pray with it. There is a difference, and it is everything."',
        '"The Hollowed worship the dark behind the storm. We do not speak their name in the light."',
        '"Death is only the wind changing direction. So my order teaches. I find it comforting on most days."',
        '"Bring your dead to the eastern wall. Let the storm carry them home. It is the only honest funeral."',
        '"You will face the Gloammother, I think. When you do — do not listen to her. She wears voices like cloaks."',
      ],
      bye: ['"Go with the wind at your back."', '"The storm keep you, child of the light."'],
    },
    smith: {
      role: 'Riftsmith', glyph: '⚒', color: '#caa04b',
      greet: [
        '"Mind the sparks. Riftsteel spits when it\'s worked right."',
        '"Need an edge? I put edges on things. It\'s the whole job, really."',
        '"You break it out there, I mend it in here. That\'s the arrangement."',
      ],
      talk: [
        '"Real Riftsteel hums when the storm\'s near. I\'ve a bar that sings before every gale. Better than any bell."',
        '"They say the old smiths Soulcast metal straight from gemstone. Lost art. We just hammer and sweat now."',
        '"A blade\'s only as good as the arm. But a bad blade ruins a good arm. So: buy good blades."',
        '"I forged a man\'s sword, then buried him with it a year later. That\'s the trade. You make tools for the dying."',
      ],
      bye: ['"Bring it back sharp-side intact."', '"Off you go. The forge won\'t mind itself."'],
    },
  };

  // ---- rumors: pure flavor + a few that reveal map sites ----
  const RUMORS = [
    'They say a Riftvault opened in the hills after the last gale. Nobody who entered has come out.',
    'A merchant swears the Galeseat has gone quiet. Quiet storms are the worst kind.',
    'The Cinder Reavers burned a caravan on the western road. Warlord Varen wants the Sworn dead, they say.',
    'A child in Greywall drew a picture of the Gloammother before she could speak. The priests took the picture.',
    'Old wells across the marches are running with gemlight. The Deepdelvers are paying for samples.',
    'A Cragwrought Colossus was seen walking the storm-lands. It left no tracks. Stone leaves no tracks.',
    'Somebody dredged a singing blade from a flooded vault and went mad inside a week.',
    'The eastern holds whisper of a "last storm" coming. The Galewardens whisper back to be ready.',
    'A wanderer claims the dead in the Ashlands stand up when the wind blows east.',
    'They found a Sworn\'s glowing plate in a crater, empty, with no body inside it.',
    'Gem-prices doubled overnight in three holds. Someone is buying up all the Gleam. For what?',
    'A Hollow Knight was sighted near a vault, just standing. Waiting. For whom, nobody knows.',
    'The Hollowed left their mark — a black sun — on a shrine near the coast.',
    'Travelers on the storm-roads report a woman\'s voice in the wind that knows their names.',
  ];

  // site-reveal rumors: text + the site type to reveal (nearest undiscovered)
  const SITE_RUMORS = [
    { type: 'vault', text: 'A drunk swears there\'s a Riftvault {dir} of here, lid half-sunk in the rock. "Gold," he says, "or a grave."' },
    { type: 'vault', text: 'A Deepdelver marks her map and taps it twice: "Riftvault, {dir}. Bring rope. Bring more rope than that."' },
    { type: 'camp', text: 'A guard spits: "Cinder Reaver camp {dir}. We\'d burn it ourselves if we had the spears."' },
    { type: 'lair', text: 'Hushed, the innkeeper leans close: "Warlord Varen\'s warcamp lies {dir}. Don\'t go. But if you do — end him for all of us."' },
    { type: 'town', text: 'A trader mentions another hold {dir} along the road, walls high against the wind.' },
    { type: 'ruin', text: 'The scholar\'s voice drops: "Dawnhollow lies far to the {dir}. The last ruin. Where it ends, one way or another."' },
  ];

  // ambient barks shown occasionally while travelling
  const BARKS = [
    'A windwisp pirouettes past your head and is gone.',
    'Far off, thunder that is not thunder rolls beneath the horizon.',
    'The rockbuds close their shells as your shadow falls across them.',
    'A flock of skyeels ribbons across the clouds, fleeing something unseen.',
    'You pass a cairn of stones. Someone died here, and someone cared enough to mark it.',
    'The wind carries a scent of ozone and old ash. A storm is somewhere, thinking about you.',
    'Your wisps cluster tighter, the way they do when the world feels thin.',
    'A weathered roadsign points to a hold whose name has worn away.',
    'Bones, picked clean, half-buried in the path. Not human. Probably.',
    'For a moment the gale sounds almost like a voice. Then it is only the gale.',
    'A lone tree, petrified to grey stone, fingers the sky like a frozen scream.',
    'You find a child\'s shoe on the empty road and decide not to think about it.',
  ];

  // ---- travel micro-events: non-combat encounters with choices/effects ----
  // effect(game) runs immediately; events keep the world surprising.
  const EVENTS = [
    { id: 'wisp_gift', weight: 3, text: 'A bright wisp alights on your hand and bursts, pouring warmth into you.',
      effect: function (g) { const p = g.player; const s = Math.min(p.maxStormlight - p.stormlight, 25); p.stormlight += s; g.msg('%cThe wisp\'s gift: +' + s + ' Gleam.', 'good'); } },
    { id: 'cairn_loot', weight: 3, text: 'A traveler\'s cairn, undisturbed. Beneath the stones, a parcel wrapped in oilcloth.',
      effect: function (g) { const it = TLU.Items.rollLoot(g.rng, Math.max(1, g.player.level), 0)[0]; if (it) { TLU.Player.addItem(g.player, it); g.msg('%cYou recover ' + it.name + ' from the cairn.', 'good'); } } },
    { id: 'coin_purse', weight: 3, text: 'Half-buried in the mud: a dead reaver, and a purse he no longer needs.',
      effect: function (g) { const gold = g.rng.int(8, 30) + g.player.level * 2; TLU.Player.addGold(g.player, gold); g.msg('%cYou pocket ' + gold + ' gold.', 'good'); } },
    { id: 'shrine', weight: 2, text: 'A weathered shrine to the storm. You leave a coin and feel, briefly, watched-over.',
      effect: function (g) { const p = g.player; const h = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * 0.3)); p.hp += h; TLU.Player.addGold(g.player, -1); g.msg('%cThe shrine\'s blessing: +' + h + ' HP.', 'good'); } },
    { id: 'wandering_healer', weight: 2, text: 'A wandering healer shares her fire and her stew. "Pay it forward," she says, and is gone by dawn.',
      effect: function (g) { TLU.Player.fullHeal(g.player); g.player.food = 100; g.msg('%cFully rested and fed. The kindness of strangers.', 'good'); } },
    { id: 'gem_glint', weight: 2, text: 'Something glints in a crack of rock — a gemstone, faintly charged.',
      effect: function (g) { const gem = TLU.Items.gem(g.rng.pick(TLU.LORE.gems), 1); TLU.Player.addItem(g.player, gem); g.player.gemsFound++; g.advanceSide && g.advanceSide(); g.msg('%cYou pry loose ' + gem.name + '.', 'good'); } },
    { id: 'lost_pilgrim', weight: 2, text: 'A lost pilgrim asks the way to the nearest hold. You point; he blesses you and shuffles off.',
      effect: function (g) { TLU.Player.trainSkill(g.player, 'survival', 8, g.mkLog()); g.msg('You learn a little more of these roads.'); } },
    { id: 'bad_water', weight: 1, text: 'You drink from a still pool. Too late, you taste the wrongness in it.',
      effect: function (g) { const d = Math.max(2, Math.round(g.player.maxHp * 0.06)); g.player.hp = Math.max(1, g.player.hp - d); g.msg('%cTainted water. You retch and lose ' + d + ' HP.', 'bad'); } },
  ];

  // ---- the discovery codex ----
  const CODEX = {
    world: [
      { id: 'aurenmark', title: 'Aurenmark', text: 'The sundered continent. Once green, now scoured by the Galestorm that walks it east to west. Spire-cities float on stored Gleam; the rest endure behind windward walls.' },
      { id: 'galestorm', title: 'The Galestorm', text: 'A living tempest that crosses the world on its own schedule. It wakes the stones, scatters the dead eastward, and floods the air with Gleam — the breath that powers every surge and gem.' },
      { id: 'gleam', title: 'Gleam', text: 'Stored storm-light. Breathed in from charged gemstones, it fuels surgebinding and mends Riftplate. Spend it wisely; it drains with use and time.' },
      { id: 'wisps', title: 'Wisps', text: 'Fragments of living spirit drawn to strong emotion and old oaths. They gather at the shoulders of those the dead Orders would have chosen. Yours followed you out of exile.' },
      { id: 'orders', title: 'The Sworn', text: 'The reborn Orders of knights — Galewalker, Stonewarden, Slipstrider, Veilseer, Cinderwright. Each bonds a wisp and binds two Surges. You are, perhaps, the first of a new age of them.' },
      { id: 'rift', title: 'The Rift', text: 'A weapon and a key both, shattered into fragments in the fall of Dawnhollow. Reforged, it can sever even a Hollow One from the world. Four fragments remain, scattered in drowned vaults.' },
    ],
    factions: {
      coalition: 'The Galewardens — scholars and soldiers who would unite the holds against the storm and the waking dark. They sense the wisps that follow you, and they remember the old oaths.',
      reavers:   'The Cinder Reavers — raiders who worship the storm\'s violence and take what the weak cannot keep. Their warlord, Varen, hunts the Sworn with a stolen Riftshard.',
      guild:     'The Deepdelvers — treasure-hunters and tomb-robbers who plumb the drowned Riftvaults for lost wonders and lost Gleam. They pay well and ask few questions.',
      cult:      'The Hollowed — a hidden cult who worship the dark behind the storm and labor to wake the Hollow Ones. They mark their shrines with a black sun.',
    },
    places: {
      town:  'Hold — a fortified settlement bunkered against the gale. Here you may rest, trade, train, and gather rumor. The last safe places in Aurenmark.',
      vault: 'Riftvault — a drowned ruin of the old world, sunk beneath stone and storm. The Deepdelvers prize them; the dark things within prize visitors.',
      camp:  'Cinder Reaver Camp — a raider warband\'s nest. Clear it to make the roads a little safer, and to take back what they\'ve stolen.',
      lair:  'A warlord\'s warcamp — the seat of a named enemy. Pray you are stronger than rumor says he is.',
      ruin:  'Dawnhollow — the last ruin, where the first Rift shattered and a Hollow One now wakes. The road ends here, one way or another.',
    },
  };

  // bestiary lore (unlocked on first kill, keyed by enemy id)
  const BESTIARY_LORE = {
    cremling: 'Rockmites — palm-sized shelled scavengers that swarm where the dead lie. Harmless alone; a tide of them can strip a corpse to bone in an hour.',
    whitespine_hatchling: 'The young of the palefang, a pale armored predator. Even hatchlings have a killing bite. The adults do not bear thinking about.',
    reaver_thug: 'The Cinder Reavers\' rank and file — desperate, brutal, and many. They fight for plunder and the storm\'s favor.',
    wild_axehound: 'Ridgehounds — six-legged pack hunters with chitinous, axe-like jaws. They run down anything that flees.',
    chull: 'Craghorns — vast, slow, shelled beasts. Domesticated as draft animals in the holds; lethal in the wild when cornered.',
    reaver_raider: 'Seasoned Cinder Reavers, armed with stolen steel. They cleave through the unprepared and laugh in the storm.',
    midnight_essence: 'Gloamspawn — congealed darkness given hunger and shape. A lesser splinter of the Hollow Ones\' power. It drinks souls to mend itself.',
    deepmaw: 'Deepmaws lurk in flooded vaults, all jaw and patience. They swallow the careless whole.',
    stormform: 'Stormcallers — those who gave themselves to the storm\'s dark form. They wield the gale as a weapon and no longer remember their names.',
    thunderclast: 'A Cragwrought Colossus — stone given malevolent life, the storm\'s fist made flesh. Do not fight it if you can run. Often, you cannot.',
    voidspren_knight: 'A Hollow Knight — a fallen Sworn remade by the dark, bound in deathless service. It regenerates from the void itself.',
    unmade_shard: 'A splinter of a Hollow One — a shard of an old god\'s malice. Where it walks, the dead grow restless and the living grow afraid.',
    highlord_reaver: 'Varen, Warlord of Cinders — the man uniting the Reaver bands beneath one black banner. He carries a stolen Riftshard and hunts the Sworn for sport.',
    midnight_mother: 'Vethra, the Gloammother — eldest of the waking Hollow Ones. A thing of living darkness that births murderous shadows to mimic and murder. She wears voices like cloaks. Do not listen.',
  };

  // ---- helpers ----
  function rosterFor(rng, town) {
    if (town._npcs) return town._npcs;
    const keys = Object.keys(ARCHETYPES);
    // always present
    const present = ['innkeeper', 'merchant'];
    const pool = rng.shuffle(keys.filter(function (k) { return present.indexOf(k) < 0; }));
    const n = 2 + rng.int(2, 4);
    for (let i = 0; i < n && i < pool.length; i++) present.push(pool[i]);
    // bigger holds get a scholar (quest-giver flavor)
    if (town.level >= 5 && present.indexOf('scholar') < 0) present.push('scholar');
    town._npcs = present.map(function (archKey) {
      return { name: TLU.genName(rng), archKey: archKey, arch: ARCHETYPES[archKey], _talk: 0 };
    });
    return town._npcs;
  }

  TLU.Dialogue = {
    ARCHETYPES: ARCHETYPES, RUMORS: RUMORS, SITE_RUMORS: SITE_RUMORS, BARKS: BARKS,
    EVENTS: EVENTS, CODEX: CODEX, BESTIARY_LORE: BESTIARY_LORE,
    rosterFor: rosterFor,
    pick: function (rng, arr) { return arr[rng.int(0, arr.length - 1)]; },
  };
})(window.TLU = window.TLU || {});
