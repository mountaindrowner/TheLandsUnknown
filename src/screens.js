/* ============================================================
 * screens.js — keyboard input + every overlay screen.
 * Extends Game.prototype with onKey/renderOverlay and a SCREENS
 * registry: each screen has render(g) and key(g, k).
 * ============================================================ */
(function (TLU) {
  'use strict';
  const Game = TLU.Game, UI = TLU.UI, P = TLU.Player, I = TLU.Items;
  const esc = UI.esc;

  function dirOf(k) {
    switch (k) {
      case 'ArrowUp': case 'w': case 'W': case 'k': return [0, -1];
      case 'ArrowDown': case 's': case 'S': case 'j': return [0, 1];
      case 'ArrowLeft': case 'a': case 'A': case 'h': return [-1, 0];
      case 'ArrowRight': case 'd': case 'D': case 'l': return [1, 0];
      case 'y': return [-1, -1]; case 'u': return [1, -1];
      case 'b': return [-1, 1]; case 'n': return [1, 1];
    }
    return null;
  }

  // ---------- master input ----------
  Game.prototype.onKey = function (e) {
    const k = e.key;
    const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'];
    if (navKeys.indexOf(k) >= 0) e.preventDefault();

    // global: cycle visual theme anywhere
    if ((k === 't' || k === 'T') && TLU.Theme) { TLU.Theme.cycle(this); return; }

    if (this.overlay) {
      const s = SCREENS[this.overlay.type];
      if (s && s.key) s.key(this, k);
      return;
    }
    if (this.state !== 'play') return;

    // movement / world hotkeys
    const d = dirOf(k);
    if (d) {
      if (k === 'j' || k === 's' || k === 'S') { /* could collide w/ menus, but fine here */ }
      if (this.mode === 'world') this.moveWorld(d[0], d[1]);
      else this.moveDungeon(d[0], d[1]);
      return;
    }
    switch (k) {
      case 'Enter': case ' ': case 'e': case 'E': this.interact(); break;
      case 'i': case 'I': this.openInventory(); break;
      case 'c': case 'C': this.openCharacter(); break;
      case 'q': case 'Q': this.openQuests(); break;
      case 'p': case 'P': this.openPerks(); break;
      case 'L': this.openCodex(); break;
      case 'm': case 'M':
        if (this.mode === 'world' && TLU.Render && TLU.Render.cycleMapStyle) {
          const s = TLU.Render.cycleMapStyle();
          this.msg('%c❖ Map style: ' + (TLU.Render.mapStyleNames[s] || s), 'note');
          this.render();
        }
        break;
      case '?': case '/': this.openHelp(); break;
      case 'Escape': this.overlay = { type: 'system', cursor: 0 }; this.render(); break;
    }
  };

  Game.prototype.renderOverlay = function () {
    if (!this.overlay) { UI.hideOverlay(); return; }
    const s = SCREENS[this.overlay.type];
    if (s && s.render) UI.showOverlay(this, s.render(this), this.overlay.type);
    else UI.hideOverlay();
  };

  // ---------- touch / synthetic input ----------
  // dispatch a key through the normal handler (used by on-screen controls)
  Game.prototype.key = function (k) { this.onKey({ key: k, preventDefault: function () {} }); };

  // resolve the active overlay's "cursor" field (varies by screen)
  Game.prototype._cursorRef = function () {
    const o = this.overlay; if (!o) return null;
    if (o.type === 'chargen') {
      if (o.step === 0) return { get: function () { return o.orderIdx; }, set: function (v) { o.orderIdx = v; } };
      if (o.step === 2) return { get: function () { return o.weaponIdx; }, set: function (v) { o.weaponIdx = v; } };
      return null;
    }
    if (typeof o.cursor === 'number') return { get: function () { return o.cursor; }, set: function (v) { o.cursor = v; } };
    return null;
  };

  // tap a rendered menu item → focus it and confirm (single tap)
  Game.prototype.touchMenuSelect = function (idx) {
    const o = this.overlay; if (!o) return;
    const ref = this._cursorRef();
    if (ref) ref.set(idx);
    this.key('Enter');
  };

  // tap a codex tab
  Game.prototype.touchCodexTab = function (idx) {
    if (this.overlay && this.overlay.type === 'codex') { this.overlay.tab = idx; this.render(); }
  };

  // tap an enemy card in combat → quick-attack it (or pick as target mid-action)
  Game.prototype.touchEnemy = function (aliveIdx) {
    const o = this.overlay, c = this.combat;
    if (!o || o.type !== 'combat' || !c || !c.awaitingPlayer) return;
    if (o.menu === 'target') { o.cursor = aliveIdx; this.key('Enter'); return; }
    if (o.menu === 'root') { o.pending = { kind: 'attack' }; o.menu = 'target'; o.cursor = aliveIdx; this.render(); this.key('Enter'); }
  };

  // ---------- helpers ----------
  function menuNav(o, k, len, onConfirm, onCancel) {
    if (k === 'ArrowUp' || k === 'w' || k === 'k') o.cursor = (o.cursor - 1 + len) % len;
    else if (k === 'ArrowDown' || k === 's' || k === 'j') o.cursor = (o.cursor + 1) % len;
    else if (k === 'Enter' || k === ' ') { if (onConfirm) onConfirm(o.cursor); }
    else if (k === 'Escape') { if (onCancel) onCancel(); }
  }

  function describeItem(it) {
    if (!it) return '';
    let s = '<div class="idesc" style="color:' + I.rarityColor(it.rarity) + '">' + (it.upgrade ? '+' + it.upgrade + ' ' : '') + esc(it.name) + '</div>';
    const lines = [];
    const up = 1 + 0.10 * (it.upgrade || 0);
    if (it.type === 'weapon') {
      lines.push('Weapon · ' + (TLU.Skills.LIST[it.skill] ? TLU.Skills.LIST[it.skill].name : it.skill) + (it.hands === 2 ? ' (2H)' : ''));
      lines.push('Damage ' + Math.round(it.dmg * up) + '  Speed ' + it.speed + '  Crit ' + Math.round((it.crit || 0) * 100) + '%');
      if (it.armorPierce) lines.push('Armor pierce ' + Math.round(it.armorPierce * 100) + '%');
    } else if (it.type === 'armor') {
      lines.push('Armor · ' + it.slot + (it.block ? ' (block ' + Math.round(it.block * 100) + '%)' : ''));
      lines.push('Defense ' + Math.round(it.def * up));
    } else if (it.type === 'material') {
      lines.push('Crafting material · used at the smith / alchemist');
    } else if (it.type === 'consumable') {
      if (it.heal) lines.push('Restores ' + it.heal + ' HP');
      if (it.charge) lines.push('Restores ' + it.charge + ' Charge');
      if (it.food) lines.push('Restores ' + it.food + ' Sustenance');
      if (it.scroll) lines.push('Scroll: ' + it.scroll);
      if (it.cure) lines.push('Cures ' + it.cure);
    } else if (it.type === 'gem') { lines.push('Infused gem · +' + it.charge + ' Charge when used'); }
    if (it.bonus) { const b = []; for (const key in it.bonus) { if (key === 'element' || key === 'riftbane') b.push(key + ' ' + it.bonus[key]); else b.push((it.bonus[key] > 0 ? '+' : '') + it.bonus[key] + ' ' + key); } if (b.length) lines.push('<span style="color:#7ec8ff">' + b.join(', ') + '</span>'); }
    if (it.desc) lines.push('<i style="color:#9a8">' + esc(it.desc) + '</i>');
    lines.push('Value ' + (it.value || 0) + 'g');
    return s + lines.map(function (l) { return '<div class="iline">' + l + '</div>'; }).join('');
  }

  function itemLabel(it) {
    let n = (it.upgrade ? '+' + it.upgrade + ' ' : '') + esc(it.name);
    if (it.qty && it.qty > 1) n += ' ×' + it.qty;
    return '<span style="color:' + I.rarityColor(it.rarity) + '">' + n + '</span>';
  }

  // ---- generative ink-portrait helpers (Folio) -------------------------
  const ORDER_ROLE = { skyrender: 'skirmisher', stonewarden: 'warden', slipstrider: 'skirmisher', veilseer: 'channeler', cinderwright: 'channeler' };
  const ARCH_ROLE = { guard: 'warden', warden_scholar: 'channeler', drillmaster: 'warrior', priest: 'channeler', smith: 'warrior', merchant: 'folk', innkeeper: 'folk', wanderer: 'explorer', urchin: 'folk' };

  function art() { return TLU.Art; }
  // a portrait <svg> for any actor; opts forwarded to TLU.Art.portrait
  function portraitSVG(seed, opts) {
    if (!TLU.Art || !TLU.Art.portrait) return '';
    return TLU.Art.portrait(seed, opts || {});
  }
  function playerPortrait(p, opts) {
    const look = p.look || { seed: p.artSeed || p.name, fem: p.fem, age: 'prime' };
    return portraitSVG(look.seed, Object.assign({
      role: ORDER_ROLE[p.orderId] || 'explorer', accent: '#9a3b2a', fem: look.fem, age: look.age || 'prime',
    }, opts || {}));
  }
  function companionPortrait(c, opts) {
    const role = TLU.Art.PORTRAIT_ROLES[c.role] ? c.role : 'folk';
    return portraitSVG('ally:' + c.name + ':' + c.role + ':' + c.level, Object.assign({ role: role }, opts || {}));
  }
  function npcPortrait(npc, opts) {
    return portraitSVG('npc:' + npc.name + ':' + npc.archKey, Object.assign({ role: ARCH_ROLE[npc.archKey] || 'folk', accent: npc.arch.color }, opts || {}));
  }
  // build the gallery of premade looks for chargen, given current options
  function lookOptions(o) {
    const orderKey = o.orderKeys[o.orderIdx];
    const role = ORDER_ROLE[orderKey] || 'channeler';
    const accent = TLU.LORE.orders[orderKey].color;
    const AGES = ['young', 'prime', 'prime', 'weathered', 'old'];
    const out = [];
    for (let i = 0; i < 8; i++) {
      const seed = 'look:' + o.seedStr + ':' + o.lookSet + ':' + i;
      const r = new TLU.RNG(seed + ':meta');
      const fem = o.lookPres === 'fem' ? true : o.lookPres === 'masc' ? false : r.chance(0.5);
      const age = o.lookAge === 'any' ? r.pick(AGES) : o.lookAge;
      out.push({ seed: seed, fem: fem, age: age, role: role, accent: accent });
    }
    return out;
  }

  // give a companion a generated face's traits so its bio matches the drawing
  function companionTraits(c) {
    const role = TLU.Art.PORTRAIT_ROLES[c.role] ? c.role : 'folk';
    return TLU.Art.traits('ally:' + c.name + ':' + c.role + ':' + c.level, { role: role });
  }

  // ============================================================
  // SCREENS
  // ============================================================
  const SCREENS = {};

  // ---- TITLE ----
  SCREENS.title = {
    render: function (g) {
      const art = [
        '  _____ _            _                    _      ',
        ' |_   _| |__   ___  | |    __ _ _ __   __| |___  ',
        '   | | | \'_ \\ / _ \\ | |   / _` | \'_ \\ / _` / __| ',
        '   | | | | | |  __/ | |__| (_| | | | | (_| \\__ \\ ',
        '   |_| |_| |_|\\___| |_____\\__,_|_| |_|\\__,_|___/ ',
        '            U N K N O W N',
      ].join('\n');
      let html = '<div class="title-screen">';
      html += '<pre class="logo">' + esc(art) + '</pre>';
      html += '<div class="tagline">' + esc(TLU.LORE.subtitle) + '</div>';
      html += UI.renderMenu({ items: g.overlay.items.map(function (it) { return { label: it.label, color: it.color }; }), cursor: g.overlay.cursor });
      html += '<div class="menu-foot">↑/↓ move · Enter select · A churn-wracked open world of rift & echo</div>';
      html += '</div>';
      return html;
    },
    key: function (g, k) {
      const o = g.overlay;
      menuNav(o, k, o.items.length, function (i) {
        const key = o.items[i].key;
        if (key === 'new') g.startIntro('chargen');
        else if (key === 'tale') g.startIntro('title');
        else if (key === 'continue') g.continueGame();
        else if (key === 'help') g.openHelp();
        g.render();
      });
      g.render();
    },
  };

  // ---- CHARGEN ----
  SCREENS.chargen = {
    render: function (g) {
      const o = g.overlay;
      let body = '';
      if (o.step === 0) {
        body += '<div class="cg-q">Five traditions endure. One will answer to your hand.</div>';
        const items = o.orderKeys.map(function (key) {
          const ord = TLU.LORE.orders[key];
          return { label: ord.glyph + ' ' + ord.name, hint: ord.attune.join(' / '), color: ord.color };
        });
        body += UI.renderMenu({ items: items, cursor: o.orderIdx });
        const key = o.orderKeys[o.orderIdx], ord = TLU.LORE.orders[key];
        const lore = (TLU.Intro && TLU.Intro.ORDER_LORE[key]) || {};
        const port = (TLU.Art && TLU.Art.portrait) ? TLU.Art.portrait('order:' + key, { role: lore.role || 'channeler', accent: ord.color, age: 'prime', fem: (o.orderIdx % 2 === 0) }) : '';
        body += '<div class="cg-order"><div class="pf">' + port + '</div><div class="col">' +
          '<div class="cg-ord-name" style="color:' + ord.color + '">' + ord.glyph + ' ' + esc(ord.name) + '</div>' +
          '<div class="cg-ord-tag">' + esc(lore.tag || '') + '</div>' +
          '<div class="cg-ord-desc">' + esc(lore.desc || ord.blurb) + '</div>' +
          '<div class="cg-ord-att">✦ Attunements · ' + ord.attune.join(' &amp; ') + '</div></div></div>';
      } else if (o.step === 1) {
        // ---- Appearance: a gallery of premade looks ----
        body += '<div class="cg-q">Choose your face.</div>';
        const looks = lookOptions(o);
        if (o.lookIdx >= looks.length) o.lookIdx = 0;
        const sel = looks[o.lookIdx];
        const big = portraitSVG(sel.seed, { role: sel.role, accent: sel.accent, fem: sel.fem, age: sel.age });
        body += '<div class="cg-look"><div class="cg-look-big pf">' + big + '</div>';
        body += '<div class="cg-look-side">';
        const presLabel = { any: 'Either', fem: 'Feminine', masc: 'Masculine' }[o.lookPres];
        const ageLabel = { any: 'Any age', young: 'Young', prime: 'Prime', weathered: 'Weathered', old: 'Old' }[o.lookAge];
        body += '<div class="cg-look-ctrl touch-btn" data-key="f">Look · <b>' + presLabel + '</b></div>';
        body += '<div class="cg-look-ctrl touch-btn" data-key="g">Age · <b>' + ageLabel + '</b></div>';
        body += '<div class="cg-look-ctrl touch-btn" data-key="Tab">↻ More faces</div>';
        body += '<div class="cg-look-ctrl cg-confirm touch-btn" data-key="Enter">Confirm ▸</div>';
        body += '</div></div>';
        body += '<div class="cg-look-grid">';
        looks.forEach(function (lk, i) {
          const th = portraitSVG(lk.seed, { role: lk.role, accent: lk.accent, fem: lk.fem, age: lk.age, ring: true });
          body += '<div class="cg-thumb' + (i === o.lookIdx ? ' sel' : '') + '" data-look="' + i + '">' + th + '</div>';
        });
        body += '</div>';
        body += '<div class="menu-foot">←/→ pick a face · [F] look · [G] age · [Tab] reroll · Enter confirm</div>';
      } else if (o.step === 2) {
        body += '<div class="cg-q">Choose your weapon focus:</div>';
        body += UI.renderMenu({ items: o.weapons.map(function (w) { return { label: w[1] }; }), cursor: o.weaponIdx });
      } else {
        body += '<div class="cg-q">Your name, Kindled?</div>';
        const sel2 = o.look || lookOptions(o)[o.lookIdx];
        body += '<div class="folio-figrow" style="justify-content:center"><div class="pf pf-sm">' +
          portraitSVG(sel2.seed, { role: sel2.role, accent: sel2.accent, fem: sel2.fem, age: sel2.age }) + '</div></div>';
        body += '<div class="cg-name">' + esc(o.name) + ' <span class="dimk">(Tab to reroll)</span></div>';
        const ord = TLU.LORE.orders[o.orderKeys[o.orderIdx]];
        body += '<div class="cg-summary">' + ord.glyph + ' ' + ord.name + ' · ' + o.weapons[o.weaponIdx][1] + '</div>';
        body += '<div class="menu-foot">Enter to begin your journey.</div>';
      }
      return '<div class="title-screen"><div class="menu-title">Create Your Kindled</div>' + body +
        '<div class="menu-foot">↑/↓ choose · Enter next · Esc back</div></div>';
    },
    key: function (g, k) {
      const o = g.overlay;
      if (o.step === 0) {
        menuNav({ get cursor() { return o.orderIdx; }, set cursor(v) { o.orderIdx = v; } }, k, o.orderKeys.length,
          function () { o.step = 1; }, function () { g.openTitle(); });
      } else if (o.step === 1) {
        // appearance gallery
        const N = 8;
        if (k === 'ArrowLeft' || k === 'a' || k === 'h') o.lookIdx = (o.lookIdx + N - 1) % N;
        else if (k === 'ArrowRight' || k === 'd' || k === 'l') o.lookIdx = (o.lookIdx + 1) % N;
        else if (k === 'ArrowUp' || k === 'w') o.lookIdx = (o.lookIdx + N - 4) % N;
        else if (k === 'ArrowDown' || k === 's') o.lookIdx = (o.lookIdx + 4) % N;
        else if (k === 'f' || k === 'F') o.lookPres = { any: 'fem', fem: 'masc', masc: 'any' }[o.lookPres];
        else if (k === 'g' || k === 'G') o.lookAge = { any: 'young', young: 'prime', prime: 'weathered', weathered: 'old', old: 'any' }[o.lookAge];
        else if (k === 'Tab') { o.lookSet++; }
        else if (k === 'Enter' || k === ' ') { o.look = lookOptions(o)[o.lookIdx]; o.step = 2; }
        else if (k === 'Escape') { o.step = 0; }
      } else if (o.step === 2) {
        menuNav({ get cursor() { return o.weaponIdx; }, set cursor(v) { o.weaponIdx = v; } }, k, o.weapons.length,
          function () { o.step = 3; }, function () { o.step = 1; });
      } else {
        if (k === 'Tab') { o.name = TLU.genName(new TLU.RNG('name' + Math.floor(performance.now()))); }
        else if (k === 'Enter' || k === ' ') {
          if (!o.look) o.look = lookOptions(o)[o.lookIdx];
          g.beginGame({ seed: o.seedStr, name: o.name, order: o.orderKeys[o.orderIdx], weaponSkill: o.weapons[o.weaponIdx][0], look: { seed: o.look.seed, fem: o.look.fem, age: o.look.age } });
          return;
        } else if (k === 'Escape') o.step = 2;
      }
      g.render();
    },
  };

  // ---- INTRO CINEMATIC ----
  SCREENS.intro = {
    render: function (g) {
      const o = g.overlay, B = TLU.Intro.BEATS;
      const beat = B[o.beat] || B[B.length - 1];
      const last = o.beat >= B.length - 1;
      const art = (TLU.Art && TLU.Art.vista) ? TLU.Art.vista(beat.kind, o.seed + ':' + o.beat) : '';
      const lines = beat.lines.map(function (t, i) {
        return '<div class="cine-line" style="animation-delay:' + (0.3 + i * 0.95).toFixed(2) + 's">' + esc(t) + '</div>';
      }).join('');
      let html = '<div class="cine" data-intro="1">';
      html += '<div class="cine-art">' + art + '</div>';
      html += '<div class="cine-chapter">' + esc(beat.chapter) + '</div>';
      html += '<div class="cine-text">' + lines + '</div>';
      html += '<div class="cine-foot"><span class="cine-prompt">' + (last ? '▸ Press Enter to choose your Order' : 'Press Enter ▸ continue') + '</span>' +
        '<span class="cine-skip" data-skip="1">Esc · Skip</span>' +
        '<span class="cine-count">' + (o.beat + 1) + ' / ' + B.length + '</span></div>';
      html += '</div>';
      return html;
    },
    key: function (g, k) {
      if (k === 'Escape') { g.endIntro(); return; }
      if (k === 'Enter' || k === ' ' || k === 'ArrowRight') { g.advanceIntro(); return; }
    },
  };

  // ---- SYSTEM (pause) ----
  SCREENS.system = {
    render: function (g) {
      const tn = TLU.Theme ? TLU.Theme.active().name : '—';
      return UI.renderMenu({ title: 'Paused', items: [{ label: 'Resume' }, { label: 'Theme', hint: tn + ' — Enter/T to cycle' }, { label: 'Save Game' }, { label: 'Help' }, { label: 'Quit to Title' }], cursor: g.overlay.cursor, footer: 'Esc to resume' });
    },
    key: function (g, k) {
      const o = g.overlay;
      menuNav(o, k, 5, function (i) {
        if (i === 0) { g.overlay = null; }
        else if (i === 1) { if (TLU.Theme) TLU.Theme.cycle(g); return; }
        else if (i === 2) { g.save(); g.msg('%cGame saved.', 'good'); g.overlay = null; }
        else if (i === 3) { g.openHelp(); return; }
        else if (i === 4) { g.save(); g.openTitle(); }
        g.render();
      }, function () { g.overlay = null; g.render(); });
      g.render();
    },
  };

  // ---- HELP ----
  SCREENS.help = {
    render: function () {
      const rows = [
        ['Move', '↑↓←→ / WASD / HJKL (+ YUBN diagonals)'],
        ['Interact / Enter site / Stairs', 'Enter or E'],
        ['Inventory', 'I'], ['Character & level-up', 'C'], ['Quests', 'Q'], ['Talents', 'P'],
        ['Pause / Save / Quit', 'Esc'], ['This help', '?'],
        ['Codex / Journal', 'L'], ['Cycle visual theme', 'T'],
        ['—', '—'],
        ['Goal', 'Find the Wardens, gather 4 Rift fragments from'],
        ['', 'drowned vaults (▼), end Warlord Varen (☠), then descend'],
        ['', 'Dawnhollow (Ω) and destroy the Gloammother.'],
        ['Tips', 'Skills level by USE. Churns (⛈) refill Charge fast'],
        ['', 'but make the wilds deadlier. The east is far more dangerous.'],
      ];
      let html = '<div class="title-screen"><div class="menu-title">How to Play</div><div class="help-grid">';
      rows.forEach(function (r) { html += '<div class="hk">' + esc(r[0]) + '</div><div class="hv">' + esc(r[1]) + '</div>'; });
      html += '</div><div class="menu-foot">Press any key to return</div></div>';
      return html;
    },
    key: function (g) { const back = g.overlay.back; if (g.state === 'title') g.openTitle(); else g.overlay = null; g.render(); },
  };

  // ---- INVENTORY ----
  SCREENS.inventory = {
    list: function (g) {
      const p = g.player;
      const rows = [];
      P.SLOTS.forEach(function (slot) { if (p.equip[slot]) rows.push({ it: p.equip[slot], equipped: true, slot: slot }); });
      p.inventory.forEach(function (it) { rows.push({ it: it, equipped: false }); });
      return rows;
    },
    render: function (g) {
      const o = g.overlay, p = g.player;
      const rows = SCREENS.inventory.list(g);
      const items = rows.map(function (r) {
        return { label: (r.equipped ? '<span class="eq">[E]</span> ' : '    ') + itemLabel(r.it) };
      });
      if (!items.length) items.push({ label: '(empty)', disabled: true });
      const cur = rows[o.cursor] ? rows[o.cursor].it : null;
      let body = '<div class="inv-wrap"><div class="inv-left">' +
        UI.renderMenu({ items: items, cursor: o.cursor }) + '</div>' +
        '<div class="inv-right">' + describeItem(cur) + '</div></div>';
      return '<div class="panel"><div class="menu-title">Inventory · ' + p.gold + 'g · Sustenance ' + Math.round(p.food) + '</div>' +
        body + '<div class="menu-foot">Enter: equip/use · D: drop · Esc: close</div></div>';
    },
    key: function (g, k) {
      const o = g.overlay, p = g.player;
      const rows = SCREENS.inventory.list(g);
      if (!rows.length) { if (k === 'Escape') { g.overlay = null; } g.render(); return; }
      if (o.cursor >= rows.length) o.cursor = rows.length - 1;
      menuNav(o, k, rows.length, function (i) {
        const r = rows[i]; const it = r.it;
        if (r.equipped) { P.unequip(p, r.slot); g.msg('Unequipped ' + it.name + '.'); }
        else if (it.type === 'weapon' || it.type === 'armor') { P.equip(p, it); g.msg('Equipped ' + it.name + '.'); TLU.Player.trainSkill(p, it.skill, 2, g.mkLog()); }
        else SCREENS.inventory.use(g, it);
        if (o.cursor >= SCREENS.inventory.list(g).length) o.cursor = Math.max(0, SCREENS.inventory.list(g).length - 1);
      }, function () { g.overlay = null; });
      if (k === 'd' || k === 'D') {
        const r = rows[o.cursor];
        if (r && !r.equipped) { P.removeItem(p, r.it, r.it.qty || 1); g.msg('Dropped ' + r.it.name + '.'); }
      }
      g.render();
    },
    use: function (g, it) {
      const p = g.player;
      if (it.type === 'consumable') {
        if (it.heal) { const h = Math.min(p.maxHp - p.hp, it.heal); p.hp += h; g.msg('%cYou drink ' + it.name + ' (+' + h + ' HP).', 'good'); }
        if (it.food) { p.food = Math.min(100, p.food + it.food); g.msg('You eat. (+' + it.food + ' sustenance)'); }
        if (it.charge) { p.charge = Math.min(p.maxCharge, p.charge + it.charge); g.msg('%c+' + it.charge + ' Charge.', 'good'); }
        if (it.scroll === 'recall') { SCREENS.inventory.recall(g); }
        else if (it.scroll === 'blast') { g.msg('That scroll only works in battle.'); return; }
        if (it.cure) { g.msg('Nothing to cure right now.'); return; }
        P.removeItem(p, it, 1);
      } else if (it.type === 'gem') {
        const s = Math.min(p.maxCharge - p.charge, it.charge);
        p.charge += s; g.msg('%cYou breathe in the gem\'s light. +' + s + ' Charge.', 'good');
        P.removeItem(p, it, 1);
      }
    },
    recall: function (g) {
      if (g.mode !== 'world') { g.msg('You can only recall under open sky.'); return; }
      // nearest discovered town
      let best = null, bd = 1e9;
      g.world.towns.forEach(function (t) {
        if (!g.player.visited[t.x + ',' + t.y]) return;
        const d = Math.abs(t.x - g.player.wx) + Math.abs(t.y - g.player.wy);
        if (d < bd) { bd = d; best = t; }
      });
      best = best || g.world.towns[0];
      if (best) { g.player.wx = best.x; g.player.wy = best.y; g.revealWorld(best.x, best.y, 4); g.msg('%cThe scroll tears space — you stand in ' + best.name + '.', 'cast'); }
    },
  };

  // ---- CHARACTER ----
  SCREENS.character = {
    render: function (g) {
      const p = g.player;
      const attrs = ['might', 'finesse', 'focus', 'endurance'];
      const epithet = (TLU.Art && TLU.Art.epithet) ? TLU.Art.epithet(p.artSeed || p.name) : '';
      let html = '<div class="panel"><div class="menu-title">' + esc(p.name) + (epithet ? ' ' + esc(epithet) : '') + '</div>';
      html += '<div class="folio-figrow"><div class="pf pf-md">' + playerPortrait(p, { caption: 'Lv ' + p.level }) + '</div><div class="col">';
      html += '<div class="fig-sub">' + p.order.glyph + ' ' + esc(p.order.name) + ' · Level ' + p.level + '</div>';
      html += '<div class="fig-bio">' + esc(p.order.blurb || '') + '</div>';
      html += '<div class="ch-d" style="margin-top:6px">HP ' + p.maxHp + ' · Charge ' + p.maxCharge + ' · Atk ' + p.attack + ' · Def ' + p.defense + '</div>';
      html += '</div></div>';
      html += '<div class="char-grid"><div>';
      html += '<div class="ch-h">Attributes' + (p.attrPoints > 0 ? ' <span class="alert">(' + p.attrPoints + ' to spend — Enter)</span>' : '') + '</div>';
      attrs.forEach(function (a, i) {
        html += '<div class="ch-attr' + (i === g.overlay.cursor ? ' sel' : '') + '">' + (i === g.overlay.cursor ? '▶ ' : '  ') +
          a.charAt(0).toUpperCase() + a.slice(1) + ': <b>' + p.attr[a] + '</b></div>';
      });
      html += '<div class="ch-h">Derived</div>';
      html += '<div class="ch-d">HP ' + p.maxHp + ' · Charge ' + p.maxCharge + '</div>';
      html += '<div class="ch-d">Attack ' + p.attack + ' · Defense ' + p.defense + '</div>';
      html += '<div class="ch-d">Speed ' + p.speed + ' · Crit ' + Math.round(p.crit * 100) + '%</div>';
      html += '<div class="ch-d">Block ' + Math.round(p.blockChance * 100) + '% · Frags ' + p.fragments + '/4</div>';
      html += '</div><div>';
      html += '<div class="ch-h">Skills</div><div class="skill-list">';
      ['combat', 'armor', 'attune', 'utility'].forEach(function (grp) {
        TLU.Skills.ids.filter(function (id) { return TLU.Skills.LIST[id].group === grp; }).forEach(function (id) {
          const sk = p.skills[id];
          html += '<div class="sk"><span>' + TLU.Skills.LIST[id].name + '</span><span class="skl">' + sk.level + '</span></div>';
        });
      });
      html += '</div></div></div>';
      html += '<div class="ch-h">Attunements Known</div><div class="ab-list">';
      p.knownAbilities.forEach(function (id) { const ab = TLU.Abilities[id]; html += '<span class="ab">' + ab.name + ' <i>(' + (ab.cost || 0) + ')</i></span>'; });
      html += '</div>';
      if (p.party && p.party.length) {
        html += '<div class="ch-h">Companions</div><div class="ab-list">';
        p.party.forEach(function (a) { html += '<span class="ab" style="color:' + a.color + '">' + esc(a.glyph + ' ' + a.name) + ' <i>' + a.roleName + ' Lv' + a.level + '</i></span>'; });
        html += '</div>';
      }
      if (p.discoveries) html += '<div class="ch-d" style="margin-top:6px">◹ Discoveries charted: ' + p.discoveries + '</div>';
      html += '<div class="menu-foot">↑/↓ select attribute · Enter spend point · [P] perks · Esc close</div></div>';
      return html;
    },
    key: function (g, k) {
      const o = g.overlay, p = g.player;
      const attrs = ['might', 'finesse', 'focus', 'endurance'];
      if (k === 'p' || k === 'P') { g.openPerks(); return; }
      menuNav(o, k, 4, function (i) { if (P.spendAttr(p, attrs[i])) g.msg('%c' + attrs[i] + ' raised to ' + p.attr[attrs[i]] + '.', 'good'); },
        function () { g.overlay = null; });
      g.render();
    },
  };

  // ---- PERKS (talent choices) ----
  SCREENS.perks = {
    render: function (g) {
      const p = g.player; const pts = p.perkPoints || 0;
      let html = '<div class="panel"><div class="menu-title">Talents' + (pts > 0 ? ' <span class="alert">(' + pts + ' to choose)</span>' : '') + '</div>';
      if (pts > 0) {
        const offer = TLU.Perks.offer(p, pts);
        if (offer.length) {
          html += '<div class="menu-sub">Choose a talent:</div>';
          html += UI.renderMenu({ items: offer.map(function (id) { const pk = TLU.Perks.LIST[id]; return { label: pk.name, hint: pk.desc }; }), cursor: g.overlay.cursor });
        } else { html += '<div class="cx-empty">No new talents available — raise your skills to unlock more.</div>'; }
      } else {
        html += '<div class="menu-sub">Reach the next level to earn a talent.</div>';
      }
      const owned = Object.keys(p.perks || {});
      html += '<div class="ch-h">Talents earned (' + owned.length + ')</div><div class="ab-list">';
      if (!owned.length) html += '<span class="cx-empty" style="padding:6px">None yet.</span>';
      owned.forEach(function (id) { const pk = TLU.Perks.LIST[id]; if (pk) html += '<span class="ab" title="' + esc(pk.desc) + '">' + esc(pk.name) + '</span>'; });
      html += '</div><div class="menu-foot">↑/↓ choose · Enter take · Esc close</div></div>';
      return html;
    },
    key: function (g, k) {
      const o = g.overlay, p = g.player; const pts = p.perkPoints || 0;
      if (pts <= 0) { if (k === 'Escape' || k === 'Enter' || k === 'p' || k === 'P') { g.overlay = null; g.render(); } return; }
      const offer = TLU.Perks.offer(p, pts);
      if (!offer.length) { if (k === 'Escape') { g.overlay = null; } g.render(); return; }
      if (o.cursor >= offer.length) o.cursor = offer.length - 1;
      menuNav(o, k, offer.length, function (i) {
        const id = offer[i];
        if (P.addPerk(p, id)) { g.msg('%c★ Talent gained: ' + TLU.Perks.LIST[id].name, 'level'); o.cursor = 0; }
      }, function () { g.overlay = null; });
      g.render();
    },
  };

  // ---- QUESTS ----
  SCREENS.quests = {
    render: function (g) {
      const p = g.player;
      let html = '<div class="panel"><div class="menu-title">Quests & Bounties</div><div class="quest-list">';
      const mq = TLU.Quests.MAIN, st = p.questState.main || { stage: 0 };
      html += '<div class="qcard main"><div class="qc-h">✸ ' + mq.name + ' <span class="qc-tag">MAIN</span></div>';
      mq.stages.forEach(function (s, i) {
        const done = i < st.stage; const cur = i === st.stage;
        html += '<div class="qc-stage ' + (done ? 'done' : cur ? 'cur' : 'future') + '">' + (done ? '✔ ' : cur ? '▶ ' : '· ') + esc(s.text) + '</div>';
      });
      html += '</div>';
      TLU.Quests.SIDE.forEach(function (q) {
        const qs = p.questState[q.id] || { done: false };
        html += '<div class="qcard"><div class="qc-h">' + esc(q.name) + ' <span class="qc-tag">' + (qs.done ? 'DONE' : 'OPEN') + '</span></div>' +
          '<div class="qc-stage ' + (qs.done ? 'done' : 'cur') + '">' + (qs.done ? '✔ ' : '▶ ') + esc(q.stages[0].text) + '</div></div>';
      });
      html += '</div><div class="menu-foot">Esc close</div></div>';
      return html;
    },
    key: function (g, k) { if (k === 'Escape' || k === 'q' || k === 'Q' || k === 'Enter') { g.overlay = null; g.render(); } },
  };

  // ---- LOOT ----
  SCREENS.loot = {
    render: function (g) {
      const o = g.overlay;
      const items = o.items.map(function (it) { return { label: itemLabel(it) }; });
      const cur = o.items[o.cursor];
      let body = '<div class="inv-wrap"><div class="inv-left">' + UI.renderMenu({ items: items.length ? items : [{ label: '(taken)', disabled: true }], cursor: o.cursor }) +
        '</div><div class="inv-right">' + describeItem(cur) + '</div></div>';
      return '<div class="panel"><div class="menu-title">✦ ' + esc(o.title) + '</div>' + body +
        '<div class="menu-foot">Enter: take · A: take all · Esc: leave rest</div></div>';
    },
    key: function (g, k) {
      const o = g.overlay;
      if (!o.items.length) { g.overlay = null; if (g.mode === 'dungeon') g.checkCampClear(); g.render(); return; }
      if (k === 'a' || k === 'A') {
        o.items.forEach(function (it) { P.addItem(g.player, it); });
        g.msg('%cTaken all.', 'good'); o.items = [];
        g.overlay = null; if (g.mode === 'dungeon') g.checkCampClear(); g.render(); return;
      }
      menuNav(o, k, o.items.length, function (i) {
        const it = o.items[i]; P.addItem(g.player, it); g.msg('Took ' + it.name + '.');
        o.items.splice(i, 1); if (o.cursor >= o.items.length) o.cursor = Math.max(0, o.items.length - 1);
        if (!o.items.length) { g.overlay = null; if (g.mode === 'dungeon') g.checkCampClear(); }
      }, function () { g.overlay = null; if (g.mode === 'dungeon') g.checkCampClear(); });
      g.render();
    },
  };

  // ---- TOWN ----
  SCREENS.town = {
    services: [['Rest at the inn (10g)', 'rest'], ['Visit the merchant', 'shop'], ['Visit the smith', 'smith'], ['Visit the alchemist', 'alchemy'], ['Train skills', 'train'], ['Speak with the townsfolk', 'folk'], ['Speak with the Warden', 'speak'], ['Recruit a companion', 'recruit'], ['Leave'.toString(), 'leave']],
    render: function (g) {
      const o = g.overlay, site = o.site;
      if (o.sub === 'shop') return SCREENS.town.renderShop(g);
      if (o.sub === 'train') return SCREENS.town.renderTrain(g);
      if (o.sub === 'smith') return SCREENS.town.renderSmith(g);
      if (o.sub === 'alchemy') return SCREENS.town.renderAlchemy(g);
      if (o.sub === 'recruit') return SCREENS.town.renderRecruit(g);
      let html = '<div class="panel town"><div class="menu-title">⌂ ' + esc(site.name) + '</div>' +
        '<div class="town-desc">A churn-bunkered hold of the ' + (site.level > 6 ? 'eastern frontier' : 'western plains') + '. Travelers shelter behind its windward wall.</div>';
      html += UI.renderMenu({ items: SCREENS.town.services.map(function (s) { return { label: s[0] }; }), cursor: o.cursor });
      html += '<div class="menu-foot">' + g.player.gold + 'g · HP ' + Math.round(g.player.hp) + '/' + g.player.maxHp + ' · Enter select · Esc leave</div></div>';
      return html;
    },
    key: function (g, k) {
      const o = g.overlay;
      if (o.sub === 'shop') return SCREENS.town.keyShop(g, k);
      if (o.sub === 'train') return SCREENS.town.keyTrain(g, k);
      if (o.sub === 'smith') return SCREENS.town.keySmith(g, k);
      if (o.sub === 'alchemy') return SCREENS.town.keyAlchemy(g, k);
      if (o.sub === 'recruit') return SCREENS.town.keyRecruit(g, k);
      menuNav(o, k, SCREENS.town.services.length, function (i) {
        const act = SCREENS.town.services[i][1];
        if (act === 'rest') SCREENS.town.rest(g);
        else if (act === 'shop') { o.sub = 'shop'; o.cursor = 0; o.mode = 'buy'; SCREENS.town.ensureStock(g); }
        else if (act === 'smith') { o.sub = 'smith'; o.cursor = 0; }
        else if (act === 'alchemy') { o.sub = 'alchemy'; o.cursor = 0; }
        else if (act === 'recruit') { o.sub = 'recruit'; o.cursor = 0; SCREENS.town.ensureRecruits(g); }
        else if (act === 'train') { o.sub = 'train'; o.cursor = 0; }
        else if (act === 'folk') { g.openNpcs(o.site); return; }
        else if (act === 'speak') SCREENS.town.speak(g);
        else if (act === 'leave') { g.overlay = null; }
      }, function () { g.overlay = null; });
      g.render();
    },
    rest: function (g) {
      const p = g.player;
      if (p.gold < 10) { g.msg('You cannot afford a bed (10g).'); g.render(); return; }
      p.gold -= 10; P.fullHeal(p); p.food = 100; g.day++;
      g.msg('%cYou rest. HP & Charge restored. (Day ' + g.day + ')', 'good');
      g.save(); g.render();
    },
    speak: function (g) {
      const p = g.player;
      g.advanceMain('talk:stormwarden');
      const st = p.questState.main.stage;
      g.overlay = { type: 'dialog', who: 'The Warden', back: 'town', backSite: g.townSite,
        lines: SCREENS.town.stormwardenLines(g, st), idx: 0 };
      g.render();
    },
    stormwardenLines: function (g, stage) {
      if (stage <= 1) return [
        'The Warden studies the echoes orbiting your shoulders.',
        '"So. The old bonds stir again. You are no Unkindled — you are the first of a reborn Order."',
        '"Listen: the Churn is no mere tempest. A Hollow One wakes beneath Dawnhollow — Vethra, the Gloammother."',
        '"To stand against her you must reclaim a Rift. Its fragments lie scattered in the drowned Riftvaults (▼). Recover all four."',
        '"And beware Warlord Varen of the Cinder Reavers (☠). He hunts the Kindled. End him before he ends you."',
      ];
      return [
        'The Warden bows her head.',
        '"You carry ' + g.player.fragments + ' of four fragments. When all are joined, descend into Dawnhollow (Ω)."',
        '"Remember the dead, Kindled. The last Churn is coming."',
      ];
    },
    // ---- shop ----
    ensureStock: function (g) {
      const site = g.overlay.site;
      const key = 'd' + g.day;
      if (site._stockKey === key && site._stock) return;
      const rng = new TLU.RNG(g.seed + ':shop:' + site.x + ',' + site.y + ':' + g.day);
      const stock = [];
      const n = 6 + (site.level || 1);
      for (let i = 0; i < n; i++) stock.push(I.genEquipment(rng, (site.level || 1) + rng.int(0, 3), { magic: rng.chance(0.25) ? 1 : 0 }));
      ['potion', 'potion_major', 'elixir_storm', 'ration', 'antidote', 'scroll_blast', 'scroll_warp'].forEach(function (id) {
        const c = I.consumable(id, 1); c.qty = 99; stock.push(c);
      });
      site._stock = stock; site._stockKey = key;
    },
    priceBuy: function (g, it) { const b = g.player.skills.barter.level; return Math.max(1, Math.round((it.value || 10) * (1.6 - Math.min(0.5, b * 0.03)))); },
    priceSell: function (g, it) { const b = g.player.skills.barter.level; return Math.max(1, Math.round((it.value || 4) * (0.35 + Math.min(0.35, b * 0.02)))); },
    renderShop: function (g) {
      const o = g.overlay, p = g.player, site = o.site;
      const buying = o.mode === 'buy';
      const list = buying ? site._stock : p.inventory.filter(function (i) { return !i.equipped; });
      const items = list.map(function (it) {
        const price = buying ? SCREENS.town.priceBuy(g, it) : SCREENS.town.priceSell(g, it);
        return { label: itemLabel(it), hint: price + 'g' };
      });
      if (!items.length) items.push({ label: '(nothing)', disabled: true });
      const cur = list[o.cursor];
      let body = '<div class="inv-wrap"><div class="inv-left">' +
        '<div class="shop-tabs"><span class="' + (buying ? 'on' : '') + '">BUY</span> <span class="' + (!buying ? 'on' : '') + '">SELL</span> <span class="dimk">(Tab)</span></div>' +
        UI.renderMenu({ items: items, cursor: o.cursor }) + '</div><div class="inv-right">' + describeItem(cur) + '</div></div>';
      return '<div class="panel"><div class="menu-title">Merchant of ' + esc(site.name) + ' · ' + p.gold + 'g</div>' + body +
        '<div class="menu-foot">Enter: ' + (buying ? 'buy' : 'sell') + ' · Tab: switch · Esc: back</div></div>';
    },
    keyShop: function (g, k) {
      const o = g.overlay, p = g.player, site = o.site;
      if (k === 'Tab') { o.mode = o.mode === 'buy' ? 'sell' : 'buy'; o.cursor = 0; g.render(); return; }
      if (k === 'Escape') { o.sub = null; o.cursor = 0; g.render(); return; }
      const buying = o.mode === 'buy';
      const list = buying ? site._stock : p.inventory.filter(function (i) { return !i.equipped; });
      if (!list.length) { g.render(); return; }
      menuNav(o, k, list.length, function (i) {
        const it = list[i];
        if (buying) {
          const price = SCREENS.town.priceBuy(g, it);
          if (p.gold < price) { g.msg('Not enough gold.'); return; }
          p.gold -= price;
          if (it.stack) { const copy = Object.assign({}, it, { qty: 1, uid: I.uid() }); P.addItem(p, copy); }
          else { const copy = JSON.parse(JSON.stringify(it)); copy.uid = I.uid(); P.addItem(p, copy); }
          g.msg('%cBought ' + it.name + ' (-' + price + 'g).', 'good');
          TLU.Player.trainSkill(p, 'barter', 3, g.mkLog());
        } else {
          const price = SCREENS.town.priceSell(g, it);
          p.gold += price; P.removeItem(p, it, it.qty ? 1 : 1);
          g.msg('%cSold ' + it.name + ' (+' + price + 'g).', 'good');
          TLU.Player.trainSkill(p, 'barter', 3, g.mkLog());
          if (o.cursor >= list.length - 1) o.cursor = Math.max(0, list.length - 2);
        }
      });
      g.render();
    },
    // ---- train ----
    renderTrain: function (g) {
      const o = g.overlay, p = g.player;
      const ids = TLU.Skills.ids;
      const items = ids.map(function (id) {
        const sk = p.skills[id]; const cost = (sk.level) * 40;
        return { label: TLU.Skills.LIST[id].name, hint: 'Lv ' + sk.level + ' · ' + cost + 'g' };
      });
      return '<div class="panel"><div class="menu-title">Trainer · ' + p.gold + 'g</div>' +
        UI.renderMenu({ items: items, cursor: o.cursor }) +
        '<div class="menu-foot">Enter: train +1 · Esc: back</div></div>';
    },
    keyTrain: function (g, k) {
      const o = g.overlay, p = g.player; const ids = TLU.Skills.ids;
      if (k === 'Escape') { o.sub = null; o.cursor = 0; g.render(); return; }
      menuNav(o, k, ids.length, function (i) {
        const id = ids[i]; const sk = p.skills[id]; const cost = sk.level * 40;
        if (p.gold < cost) { g.msg('Not enough gold to train ' + TLU.Skills.LIST[id].name + '.'); return; }
        p.gold -= cost; sk.level++; sk.xp = 0;
        P.recompute(p); P.refreshAbilities(p);
        g.msg('%c' + TLU.Skills.LIST[id].name + ' trained to ' + sk.level + '.', 'good');
        P.gainXp(p, 10, g.mkLog());
      });
      g.render();
    },
    // ---- smith: reinforce gear with materials + gold ----
    matCount: function (p, kind) { const m = p.inventory.find(function (i) { return i.id === 'mat_' + kind; }); return m ? (m.qty || 1) : 0; },
    spendMat: function (p, kind, n) { const m = p.inventory.find(function (i) { return i.id === 'mat_' + kind; }); if (m) P.removeItem(p, m, n); },
    upgradeList: function (g) {
      const p = g.player; const out = [];
      P.SLOTS.forEach(function (s) { const it = p.equip[s]; if (it && (it.type === 'weapon' || it.type === 'armor')) out.push(it); });
      p.inventory.forEach(function (it) { if (it.type === 'weapon' || it.type === 'armor') out.push(it); });
      return out;
    },
    reinforceCost: function (it) {
      const u = (it.upgrade || 0) + 1;
      const cost = { gold: 30 * u + (it.level || 1) * 6, mats: { scrap: u } };
      if (u >= 3) cost.mats.alloy = u - 2;
      return cost;
    },
    costStr: function (c) {
      let parts = [c.gold + 'g'];
      for (const k in c.mats) parts.push(c.mats[k] + ' ' + (TLU.Items.CRAFT_MATERIALS[k] ? TLU.Items.CRAFT_MATERIALS[k].name : k));
      return parts.join(' + ');
    },
    renderSmith: function (g) {
      const o = g.overlay, p = g.player;
      const list = SCREENS.town.upgradeList(g);
      const items = list.map(function (it) {
        if ((it.upgrade || 0) >= 5) return { label: itemLabel(it), hint: 'MAX +5' };
        return { label: itemLabel(it), hint: SCREENS.town.costStr(SCREENS.town.reinforceCost(it)) };
      });
      if (!items.length) items.push({ label: '(no gear to reinforce)', disabled: true });
      const cur = list[o.cursor];
      const mats = ['scrap', 'sinew', 'dust', 'alloy'].map(function (k) { return SCREENS.town.matCount(p, k) + ' ' + TLU.Items.CRAFT_MATERIALS[k].name; }).join(' · ');
      let body = '<div class="inv-wrap"><div class="inv-left">' + UI.renderMenu({ items: items, cursor: o.cursor }) +
        '</div><div class="inv-right">' + describeItem(cur) + '</div></div>';
      return '<div class="panel"><div class="menu-title">⚒ Smith · ' + p.gold + 'g</div>' +
        '<div class="town-desc">' + esc(mats) + '</div>' + body +
        '<div class="menu-foot">Enter: reinforce (+10% stats) · Esc: back</div></div>';
    },
    keySmith: function (g, k) {
      const o = g.overlay, p = g.player;
      if (k === 'Escape') { o.sub = null; o.cursor = 0; g.render(); return; }
      const list = SCREENS.town.upgradeList(g);
      if (!list.length) { g.render(); return; }
      if (o.cursor >= list.length) o.cursor = list.length - 1;
      menuNav(o, k, list.length, function (i) {
        const it = list[i];
        if ((it.upgrade || 0) >= 5) { g.msg('That is already reinforced to the maximum.'); return; }
        const c = SCREENS.town.reinforceCost(it);
        if (p.gold < c.gold) { g.msg('Not enough gold.'); return; }
        for (const m in c.mats) { if (SCREENS.town.matCount(p, m) < c.mats[m]) { g.msg('You lack ' + TLU.Items.CRAFT_MATERIALS[m].name + '.'); return; } }
        p.gold -= c.gold;
        for (const m in c.mats) SCREENS.town.spendMat(p, m, c.mats[m]);
        it.upgrade = (it.upgrade || 0) + 1;
        it.value = Math.round((it.value || 10) * 1.15);
        P.recompute(p);
        g.msg('%c⚒ ' + it.name + ' reinforced to +' + it.upgrade + '!', 'good');
        TLU.Player.trainSkill(p, 'alchemy', 2, g.mkLog());
      });
      g.render();
    },
    // ---- alchemist: brew consumables from ingredients ----
    recipes: [
      { out: 'potion', name: 'Healing Draught', gold: 18, mats: { herb: 1 } },
      { out: 'potion_major', name: 'Greater Healing Draught', gold: 55, mats: { herb: 3 } },
      { out: 'elixir_storm', name: 'Charge Elixir', gold: 35, mats: { dust: 1 } },
      { out: 'antidote', name: 'Antidote', gold: 14, mats: { herb: 1 } },
      { out: 'scroll_blast', name: 'Scroll of Arc Blast', gold: 60, mats: { dust: 1, alloy: 1 } },
    ],
    renderAlchemy: function (g) {
      const o = g.overlay, p = g.player;
      const items = SCREENS.town.recipes.map(function (r) { return { label: r.name, hint: SCREENS.town.costStr({ gold: r.gold, mats: r.mats }) }; });
      const mats = ['herb', 'dust', 'alloy'].map(function (k) { return SCREENS.town.matCount(p, k) + ' ' + TLU.Items.CRAFT_MATERIALS[k].name; }).join(' · ');
      return '<div class="panel"><div class="menu-title">⚗ Alchemist · ' + p.gold + 'g</div>' +
        '<div class="town-desc">' + esc(mats) + '</div>' +
        UI.renderMenu({ items: items, cursor: o.cursor }) +
        '<div class="menu-foot">Enter: brew · Esc: back</div></div>';
    },
    keyAlchemy: function (g, k) {
      const o = g.overlay, p = g.player; const recipes = SCREENS.town.recipes;
      if (k === 'Escape') { o.sub = null; o.cursor = 0; g.render(); return; }
      menuNav(o, k, recipes.length, function (i) {
        const r = recipes[i];
        if (p.gold < r.gold) { g.msg('Not enough gold.'); return; }
        for (const m in r.mats) { if (SCREENS.town.matCount(p, m) < r.mats[m]) { g.msg('You lack ' + TLU.Items.CRAFT_MATERIALS[m].name + '.'); return; } }
        p.gold -= r.gold;
        for (const m in r.mats) SCREENS.town.spendMat(p, m, r.mats[m]);
        P.addItem(p, TLU.Items.consumable(r.out, 1));
        g.msg('%c⚗ Brewed ' + r.name + '.', 'good');
        TLU.Player.trainSkill(p, 'alchemy', 4, g.mkLog());
      });
      g.render();
    },
    // ---- recruit companions (party max 2) ----
    ensureRecruits: function (g) {
      const site = g.overlay.site; const key = 'd' + g.day;
      if (site._recruitKey === key && site._recruits) return;
      const rng = new TLU.RNG(g.seed + ':recruit:' + site.x + ',' + site.y + ':' + g.day);
      site._recruits = TLU.Companions.recruitOffer(rng, g.player.level + (site.level || 1) - 1);
      site._recruitKey = key;
    },
    renderRecruit: function (g) {
      const o = g.overlay, p = g.player, site = o.site;
      SCREENS.town.ensureRecruits(g);
      const offer = site._recruits || [];
      let html = '<div class="panel"><div class="menu-title">⚑ Recruit · ' + p.gold + 'g · Party ' + (p.party ? p.party.length : 0) + '/2</div>' +
        '<div class="town-desc">Sellswords and the Churn-touched gather in the tavern, looking for a Kindled to follow.</div>';
      if (!offer.length) {
        html += '<div class="cx-empty">None will follow you today. Return another day.</div>';
      } else {
        html += '<div class="recruit-list">';
        offer.forEach(function (c, i) {
          const tr = companionTraits(c);
          const ep = TLU.Art.epithet('ally:' + c.name + ':' + c.role);
          const bio = TLU.Art.bio('ally:' + c.name + ':' + c.role + ':' + c.level, { role: tr.role, traits: tr, fem: tr.fem });
          html += '<div class="rec-card' + (i === o.cursor ? ' sel' : '') + '" data-mi="' + i + '">' +
            companionPortrait(c) +
            '<div class="rec-meta"><div class="fig-name" style="color:' + c.color + '">' + esc(c.name) + ' ' + esc(ep) + '</div>' +
            '<div class="fig-sub">' + esc(c.roleName) + ' · Lv ' + c.level + ' · HP ' + c.maxHp + ' · Atk ' + c.atk + '</div>' +
            '<div class="fig-bio">' + esc(bio) + '</div>' +
            '<div class="ch-d" style="color:#9a3b2a;margin-top:4px">' + c.cost + ' gold</div></div></div>';
        });
        html += '</div>';
      }
      html += '<div class="menu-foot">↑/↓ choose · Enter hire · Esc back</div></div>';
      return html;
    },
    keyRecruit: function (g, k) {
      const o = g.overlay, p = g.player, site = o.site;
      if (k === 'Escape') { o.sub = null; o.cursor = 0; g.render(); return; }
      const offer = site._recruits || [];
      if (!offer.length) { g.render(); return; }
      menuNav(o, k, offer.length, function (i) {
        const c = offer[i];
        p.party = p.party || [];
        if (p.party.length >= 2) { g.msg('Your party is full (2).'); return; }
        if (p.gold < c.cost) { g.msg('Not enough gold to hire ' + c.name + '.'); return; }
        p.gold -= c.cost;
        const hired = Object.assign({}, c); delete hired.cost;
        hired.alive = true; hired.hp = hired.maxHp; hired.statuses = {};
        p.party.push(hired);
        offer.splice(i, 1);
        g.msg('%c⚑ ' + hired.name + ' the ' + hired.roleName + ' joins your party!', 'good');
        if (o.cursor >= offer.length) o.cursor = Math.max(0, offer.length - 1);
      });
      g.render();
    },
  };

  // ---- DIALOG ----
  SCREENS.dialog = {
    render: function (g) {
      const o = g.overlay;
      let html = '<div class="panel dialog"><div class="menu-title">' + esc(o.who) + '</div>';
      html += '<div class="dlg-text">' + esc(o.lines[o.idx]) + '</div>';
      html += '<div class="menu-foot">Enter to continue (' + (o.idx + 1) + '/' + o.lines.length + ') · Esc skip</div></div>';
      return html;
    },
    key: function (g, k) {
      const o = g.overlay;
      if (k === 'Enter' || k === ' ') { o.idx++; if (o.idx >= o.lines.length) SCREENS.dialog.close(g); }
      else if (k === 'Escape') SCREENS.dialog.close(g);
      g.render();
    },
    close: function (g) {
      const o = g.overlay;
      if (o.back === 'town' && o.backSite) { g.openTown(o.backSite); }
      else { g.overlay = null; g.render(); }
    },
  };

  // ---- COMBAT ----
  SCREENS.combat = {
    render: function (g) {
      const c = g.combat, p = g.player, o = g.overlay;
      let html = '<div class="combat">';
      // enemies
      html += '<div class="cb-enemies">';
      const alive = SCREENS.combat.aliveList(c);
      c.enemies.forEach(function (e, i) {
        const targeting = (o.menu === 'target') && alive[o.cursor] === e;
        const aIdx = alive.indexOf(e);
        html += '<div class="cb-enemy' + (e.alive ? '' : ' dead') + (targeting ? ' target' : '') + '"' + (e.alive ? ' data-eidx="' + aIdx + '"' : '') + '>' +
          '<div class="cb-glyph" style="color:' + e.color + '">' + esc(e.glyph) + (e.boss ? ' ☠' : '') + '</div>' +
          '<div class="cb-name">' + esc(e.name) + '</div>' +
          (e.alive ? UI.bar(e.hp, e.maxHp, e.boss ? '#ff2d78' : '#a33') : '<div class="slain">SLAIN</div>') +
          '<div class="cb-status">' + statusTags(e) + '</div></div>';
      });
      html += '</div>';
      // allies (companions)
      if (c.allies && c.allies.length) {
        html += '<div class="cb-allies">';
        c.allies.forEach(function (a) {
          html += '<div class="cb-ally' + (a.alive ? '' : ' dead') + '"><span class="cb-aname" style="color:' + a.color + '">' + esc(a.glyph + ' ' + a.name) + ' <i>' + a.roleName + '</i></span>' +
            (a.alive ? UI.bar(a.hp, a.maxHp, '#3a8a4a') : '<span class="slain">DOWNED</span>') + '</div>';
        });
        html += '</div>';
      }
      // player panel
      html += '<div class="cb-player"><div class="cb-pname">@ ' + esc(p.name) + ' · Lv' + p.level + ' ' + statusTags(p) + '</div>' +
        '<div class="cb-bars">HP ' + UI.bar(p.hp, p.maxHp, '#c0392b') + 'Charge ' + UI.bar(p.charge, p.maxCharge, '#7e6bff') + '</div></div>';
      // menu
      html += '<div class="cb-menu">' + SCREENS.combat.renderMenu(g) + '</div>';
      html += '</div>';
      return html;
    },
    aliveList: function (c) { return c.enemies.filter(function (e) { return e.alive; }); },
    renderMenu: function (g) {
      const o = g.overlay, c = g.combat, p = g.player;
      if (!c.awaitingPlayer) return '<div class="cb-wait">…</div>';
      if (o.menu === 'root') {
        return UI.renderMenu({ items: [{ label: '⚔ Attack' }, { label: '✦ Channel' }, { label: '⚗ Item' }, { label: '⛨ Defend' }, { label: '⚐ Flee', disabled: c.isBoss }], cursor: o.cursor, footer: 'Enter select · Esc back' });
      }
      if (o.menu === 'attune') {
        const ab = p.knownAbilities.map(function (id) { const a = TLU.Abilities[id]; return { label: a.name, hint: a.cost + ' Charge', color: a.cost > p.charge ? '#777' : null }; });
        if (!ab.length) ab.push({ label: '(no Attunements known)', disabled: true });
        return UI.renderMenu({ title: 'Attunements', items: ab, cursor: o.cursor, footer: 'Esc back' });
      }
      if (o.menu === 'item') {
        const items = SCREENS.combat.usableItems(p).map(function (it) { return { label: itemLabel(it), hint: it.heal ? '+' + it.heal + ' HP' : it.charge ? '+' + it.charge + ' Charge' : it.scroll || '' }; });
        if (!items.length) items.push({ label: '(no usable items)', disabled: true });
        return UI.renderMenu({ title: 'Items', items: items, cursor: o.cursor, footer: 'Esc back' });
      }
      if (o.menu === 'target') {
        const items = SCREENS.combat.aliveList(c).map(function (e) { return { label: esc(e.name), hint: e.hp + ' HP', color: e.color }; });
        return UI.renderMenu({ title: 'Choose target', items: items, cursor: o.cursor, footer: 'Enter confirm · Esc back' });
      }
      return '';
    },
    usableItems: function (p) {
      return p.inventory.filter(function (it) {
        return (it.type === 'consumable' && (it.heal || it.charge || it.scroll === 'blast' || it.cure)) || it.type === 'gem';
      });
    },
    key: function (g, k) {
      const o = g.overlay, c = g.combat, p = g.player;
      if (!c.awaitingPlayer) return;
      if (o.menu === 'root') {
        menuNav(o, k, 5, function (i) {
          if (i === 0) { o.pending = { kind: 'attack' }; o.menu = 'target'; o.cursor = 0; }
          else if (i === 1) { o.menu = 'attune'; o.cursor = 0; }
          else if (i === 2) { o.menu = 'item'; o.cursor = 0; }
          else if (i === 3) { c.playerAct({ type: 'defend' }); SCREENS.combat.after(g); }
          else if (i === 4) { if (!c.isBoss) { c.playerAct({ type: 'flee' }); SCREENS.combat.after(g); } }
        });
      } else if (o.menu === 'attune') {
        const ids = p.knownAbilities;
        if (k === 'Escape') { o.menu = 'root'; o.cursor = 0; g.render(); return; }
        menuNav(o, k, Math.max(1, ids.length), function (i) {
          const id = ids[i]; if (!id) return;
          const ab = TLU.Abilities[id];
          if ((ab.cost || 0) > p.charge) { g.msg('Not enough Charge.'); return; }
          if (ab.target === 'enemy') { o.pending = { kind: 'ability', id: id }; o.menu = 'target'; o.cursor = 0; }
          else { c.playerAct({ type: 'ability', id: id }); SCREENS.combat.after(g); }
        });
      } else if (o.menu === 'item') {
        const items = SCREENS.combat.usableItems(p);
        if (k === 'Escape') { o.menu = 'root'; o.cursor = 0; g.render(); return; }
        menuNav(o, k, Math.max(1, items.length), function (i) {
          const it = items[i]; if (!it) return;
          if (it.scroll === 'blast' || it.type !== 'consumable' && false) { c.playerAct({ type: 'item', item: it }); }
          else c.playerAct({ type: 'item', item: it });
          SCREENS.combat.after(g);
        });
      } else if (o.menu === 'target') {
        const list = SCREENS.combat.aliveList(c);
        if (k === 'Escape') { o.menu = 'root'; o.cursor = 0; g.render(); return; }
        menuNav(o, k, Math.max(1, list.length), function (i) {
          const t = list[i]; if (!t) return;
          if (o.pending.kind === 'attack') c.playerAct({ type: 'attack', target: t });
          else c.playerAct({ type: 'ability', id: o.pending.id, target: t });
          SCREENS.combat.after(g);
        });
      }
      g.render();
    },
    after: function (g) {
      // combat may have ended (onEnd already handled state); else return to root menu
      if (g.state === 'combat' && g.combat && !g.combat.over) { g.overlay.menu = 'root'; g.overlay.cursor = 0; }
      g.render();
    },
  };

  function statusTags(a) {
    if (!a.statuses) return '';
    const map = { guard: '⛨', evade: '»', blur: '◍', truesight: '◉', burn: '🔥', bleed: '⸙', poison: '☠', stun: '✸', bound: '⛓', fear: '‼', rage: '⇈' };
    return Object.keys(a.statuses).map(function (s) { return '<span class="st st-' + s + '" title="' + s + '">' + (map[s] || s) + '</span>'; }).join('');
  }

  // ---- CODEX / JOURNAL (discovery-driven lore) ----
  const CODEX_TABS = ['World', 'Factions', 'Bestiary', 'Places', 'Rumors'];
  SCREENS.codex = {
    render: function (g) {
      const o = g.overlay, p = g.player; g.ensureCodex();
      const D = TLU.Dialogue;
      let tabs = CODEX_TABS.map(function (t, i) { return '<span class="cx-tab' + (i === o.tab ? ' on' : '') + '" data-cxtab="' + i + '">' + t + '</span>'; }).join(' ');
      let body = '';
      if (o.tab === 0) {
        body = D.CODEX.world.map(function (e) { return '<div class="cx-entry"><div class="cx-h">' + esc(e.title) + '</div><div class="cx-b">' + esc(e.text) + '</div></div>'; }).join('');
      } else if (o.tab === 1) {
        body = Object.keys(D.CODEX.factions).map(function (k) { return '<div class="cx-entry"><div class="cx-h">' + esc(TLU.LORE.factions[k].name) + '</div><div class="cx-b">' + esc(D.CODEX.factions[k]) + '</div></div>'; }).join('');
      } else if (o.tab === 2) {
        const ids = Object.keys(p.codex.bestiary).filter(function (id) { return p.codex.bestiary[id]; });
        body = ids.length ? ids.map(function (id) {
          const b = TLU.Bestiary.byId(id);
          const plate = (TLU.Art && TLU.Art.beastPlate) ? TLU.Art.beastPlate(id, {
            tags: b.tags || [], faction: b.faction, big: !!b.boss || (b.lvl || 0) >= 9, lvl: b.lvl, accent: '#9a3b2a',
          }) : '';
          const note = (TLU.Art && TLU.Art.beastNote) ? TLU.Art.beastNote(id) : '';
          return '<div class="cx-entry plate-card"><div class="tlu-plate-wrap">' + plate + '</div>' +
            '<div><div class="cx-h" style="color:#9a3b2a">' + esc(b.name) + ' <span class="fig-sub">· Lv ' + (b.lvl || '?') + '</span></div>' +
            '<div class="cx-b">' + esc(D.BESTIARY_LORE[id] || '') + '</div>' +
            '<div class="cx-b" style="font-style:italic;margin-top:4px">' + esc(note) + '</div></div></div>';
        }).join('') : '<div class="cx-empty">Slay the creatures of Aurenmark to fill these pages.</div>';
      } else if (o.tab === 3) {
        const keys = Object.keys(p.codex.places).filter(function (t) { return p.codex.places[t]; });
        body = keys.length ? keys.map(function (t) { return '<div class="cx-entry"><div class="cx-h">' + esc(g.placeName(t)) + '</div><div class="cx-b">' + esc(D.CODEX.places[t]) + '</div></div>'; }).join('') : '';
        const lms = p.codex.landmarks || {};
        const lmKeys = Object.keys(lms);
        if (lmKeys.length) {
          body += '<div class="cx-h">Discoveries (' + lmKeys.length + ')</div>';
          body += lmKeys.map(function (k) { return '<div class="cx-entry"><div class="cx-h" style="color:#ffd86b">◹ ' + esc(lms[k].name) + '</div><div class="cx-b">' + esc(lms[k].lore) + '</div></div>'; }).join('');
        }
        if (!body) body = '<div class="cx-empty">Explore the world to chart its places.</div>';
      } else {
        body = (p.codex.rumors && p.codex.rumors.length) ? p.codex.rumors.slice().reverse().map(function (r) { return '<div class="cx-entry"><div class="cx-b">“' + esc(r) + '”</div></div>'; }).join('') : '<div class="cx-empty">Speak with townsfolk to gather rumors.</div>';
      }
      return '<div class="panel codex"><div class="menu-title">Codex &amp; Journal</div><div class="cx-tabs">' + tabs + '</div>' +
        '<div class="cx-body">' + body + '</div><div class="menu-foot">←/→ switch section · Esc close</div></div>';
    },
    key: function (g, k) {
      const o = g.overlay;
      if (k === 'ArrowLeft' || k === 'a' || k === 'h') o.tab = (o.tab - 1 + CODEX_TABS.length) % CODEX_TABS.length;
      else if (k === 'ArrowRight' || k === 'd' || k === 'l') o.tab = (o.tab + 1) % CODEX_TABS.length;
      else if (k === 'Escape' || k === 'L' || k === 'Enter') { g.overlay = null; }
      g.render();
    },
  };

  // ---- NPC ROSTER ----
  SCREENS.npclist = {
    render: function (g) {
      const o = g.overlay;
      const items = o.roster.map(function (npc) { return { label: npc.arch.glyph + ' ' + esc(npc.name), hint: npc.arch.role, color: npc.arch.color }; });
      return '<div class="panel"><div class="menu-title">The folk of ' + esc(o.site.name) + '</div>' +
        UI.renderMenu({ items: items, cursor: o.cursor, footer: 'Enter: approach · Esc: back' }) + '</div>';
    },
    key: function (g, k) {
      const o = g.overlay;
      menuNav(o, k, o.roster.length, function (i) {
        const npc = o.roster[i];
        const greet = TLU.Dialogue.pick(g.rng || (g.rng = new TLU.RNG(g.seed + ':npc')), npc.arch.greet);
        g.overlay = { type: 'npc', npc: npc, site: o.site, line: greet, cursor: 0 };
      }, function () { g.openTown(o.site); });
      g.render();
    },
  };

  // ---- NPC CONVERSATION ----
  SCREENS.npc = {
    topics: function (npc) {
      const t = [['Talk', 'talk'], ['Ask for rumors', 'rumor']];
      if (npc.archKey === 'scholar' || npc.archKey === 'priest') t.push(['Ask about the world', 'lore']);
      t.push(['Farewell', 'bye']);
      return t;
    },
    render: function (g) {
      const o = g.overlay, npc = o.npc;
      const topics = SCREENS.npc.topics(npc);
      let html = '<div class="panel dialog"><div class="menu-title" style="color:' + npc.arch.color + '">' + npc.arch.glyph + ' ' + esc(npc.name) + ' <span class="npc-role">— ' + npc.arch.role + '</span></div>';
      html += '<div class="folio-figrow"><div class="pf pf-sm">' + npcPortrait(npc) + '</div><div class="col">';
      html += '<div class="dlg-text">' + esc(o.line) + '</div></div></div>';
      html += UI.renderMenu({ items: topics.map(function (t) { return { label: t[0] }; }), cursor: o.cursor });
      html += '<div class="menu-foot">Enter: choose · Esc: leave</div></div>';
      return html;
    },
    key: function (g, k) {
      const o = g.overlay, npc = o.npc;
      const topics = SCREENS.npc.topics(npc);
      if (!g.rng) g.rng = new TLU.RNG(g.seed + ':npc');
      menuNav(o, k, topics.length, function (i) {
        const act = topics[i][1];
        if (act === 'talk') { o.line = TLU.Dialogue.pick(g.rng, npc.arch.talk); }
        else if (act === 'rumor') { o.line = SCREENS.npc.giveRumor(g); }
        else if (act === 'lore') { o.line = SCREENS.npc.giveLore(g); }
        else { o.line = TLU.Dialogue.pick(g.rng, npc.arch.bye); g.openTown(o.site); return; }
      }, function () { g.openTown(o.site); });
      g.render();
    },
    giveRumor: function (g) {
      const r = g.rng, D = TLU.Dialogue;
      g.ensureCodex();
      if (r.chance(0.4)) {
        // a rumor that reveals a map site
        const tmpl = D.pick(r, D.SITE_RUMORS);
        const found = g.revealNearestSite(tmpl.type);
        if (found) {
          const text = tmpl.text.replace('{dir}', found.dir);
          if (g.player.codex.rumors.indexOf(text) < 0) g.player.codex.rumors.push(text);
          g.msg('%c✦ A location was marked on your map: ' + found.site.name + ' (' + found.dir + ').', 'skill');
          return text + '  [marked on your map]';
        }
      }
      const rumor = D.pick(r, D.RUMORS);
      if (g.player.codex.rumors.indexOf(rumor) < 0) g.player.codex.rumors.push(rumor);
      return '"' + rumor + '"';
    },
    giveLore: function (g) {
      const r = g.rng, world = TLU.Dialogue.CODEX.world;
      const e = TLU.Dialogue.pick(r, world);
      return e.title + ': ' + e.text;
    },
  };

  // ---- LANDMARK DISCOVERY ----
  SCREENS.landmark = {
    render: function (g) {
      const o = g.overlay;
      return '<div class="panel dialog landmark"><div class="menu-title" style="color:#ffd86b">◹ Discovery — ' + esc(o.name) + '</div>' +
        '<div class="dlg-text">' + esc(o.lore) + '</div>' +
        '<div class="lm-reward">✦ ' + esc(o.reward) + '</div>' +
        '<div class="menu-foot">' + ((g.player.discoveries || 0)) + ' discoveries charted · Enter to continue</div></div>';
    },
    key: function (g, k) { if (k === 'Enter' || k === ' ' || k === 'Escape') { g.overlay = null; g.render(); } },
  };

  // ---- ECHO OF A PAST HERO (asynchronous dynasty) ----
  SCREENS.echo = {
    render: function (g) {
      const a = g.overlay.annal;
      const tale = a.won
        ? esc(a.name) + ', a ' + esc(a.orderName) + ' of legend, reached Level ' + a.level + ' and ' + esc(a.cause) + '.'
        : esc(a.name) + ', a ' + esc(a.orderName) + ', reached Level ' + a.level + ' before they ' + esc(a.cause) + ' on day ' + a.day + '.';
      const ghost = portraitSVG('echo:' + a.name + ':' + a.orderName + ':' + a.level, { kind: 'echo', accent: '#7a6a9c' });
      return '<div class="panel dialog echo"><div class="menu-title" style="color:#9a3b2a">φ An Echo Stirs — ' + esc(a.name) + '</div>' +
        '<div class="folio-figrow"><div class="pf pf-md">' + ghost + '</div><div class="col">' +
        '<div class="dlg-text">A figure of pale light takes shape from the drifting dead. ' + tale +
        (a.epitaph ? '<br><br><i>“' + esc(a.epitaph) + '”</i>' : '') +
        '<br><br>The echo presses a fragment of its legacy into your hands.</div>' +
        '<div class="lm-reward">✦ You receive: ' + esc(g.overlay.boon) + '</div></div></div>' +
        '<div class="menu-foot">Enter to continue</div></div>';
    },
    key: function (g, k) { if (k === 'Enter' || k === ' ' || k === 'Escape') { g.overlay = null; g.render(); } },
  };

  // ---- GAME OVER ----
  function annalsNote(g) {
    if (!g.overlay.code) return '';
    return '<div class="annals-note">✶ Your legend joins the Annals — it will return as an echo (φ) in worlds to come.' +
      '<div class="annals-code" title="Share this legend">' + esc(g.overlay.code) + '</div>' +
      '<span class="dimk">Share this code, or append ?legend=&lt;code&gt; to the URL to seed it into another world.</span></div>';
  }
  function statsBlock(g) {
    const p = g.player;
    return '<div class="end-stats">' +
      '<span>Order · ' + esc(p.order.name) + '</span>' +
      '<span>Level · ' + p.level + '</span>' +
      '<span>Day · ' + g.day + '</span>' +
      '<span>Foes slain · ' + p.stats.kills + '</span>' +
      '<span>Rift fragments · ' + p.fragments + '/4</span>' +
      '<span>Gold · ' + p.gold + '</span>' +
      '</div>';
  }
  SCREENS.over = {
    render: function (g) {
      const cont = TLU.Save.hasSave();
      return '<div class="title-screen endscreen death"><div class="end-title">✟ You Have Fallen ✟</div>' +
        '<div class="end-quote">' + esc(g.overlay.quote || '') + '</div>' + statsBlock(g) + annalsNote(g) +
        UI.renderMenu({ items: cont ? [{ label: 'Reload last camp', color: '#7ec8ff' }, { label: 'Return to title' }] : [{ label: 'Return to title' }], cursor: g.overlay.cursor || 0 }) +
        '<div class="menu-foot">The Churn moves on. Will you?</div></div>';
    },
    key: function (g, k) {
      const o = g.overlay; o.cursor = o.cursor || 0;
      const cont = TLU.Save.hasSave();
      const n = cont ? 2 : 1;
      menuNav(o, k, n, function (i) {
        if (cont && i === 0) g.continueGame();
        else g.openTitle();
        g.render();
      });
      g.render();
    },
  };

  // ---- VICTORY ----
  SCREENS.win = {
    options: function (g) {
      if (g.overlay.grand) return [['Begin anew', 'title']];
      return [['⬇ Descend into the Heart of the Churn — the TRUE finale', 'churnheart'], ['Rest your legend (return to title)', 'title']];
    },
    render: function (g) {
      const grand = g.overlay.grand;
      const title = grand ? '★✶★ THE CHURN UNDONE ★✶★' : '★ The Last Churn Stilled ★';
      const tale = grand
        ? 'Karth-Vael, the Heart of the Churn, comes apart in your hands — and with it, the undoing itself. The storm that walked the world since the first dawn simply... stops. Aurenmark exhales. The dead, at last, rest. Your name will outlast every hold: you did not merely survive the Churn. You ended it. <b>This is the true ending.</b>'
        : 'Vethra, the Gloammother, unravels into fading light, and the Churn gentles. You have ended the eldest of the waking Hollow Ones. But far below where she fell, something older still turns in its sleep — the Heart of the Churn itself. The undoing is wounded, not ended. Will you descend?';
      return '<div class="title-screen endscreen victory"><div class="end-title win">' + title + '</div>' +
        '<div class="end-quote">' + tale + '</div>' +
        statsBlock(g) + annalsNote(g) +
        UI.renderMenu({ items: SCREENS.win.options(g).map(function (o) { return { label: o[0], color: o[1] === 'churnheart' ? '#ff4488' : '#ffd86b' }; }), cursor: g.overlay.cursor || 0 }) +
        '<div class="menu-foot">Remember the dead. Outlast the Churn.' + (grand ? ' — Thank you for playing.' : '') + '</div></div>';
    },
    key: function (g, k) {
      const o = g.overlay; o.cursor = o.cursor || 0;
      const opts = SCREENS.win.options(g);
      menuNav(o, k, opts.length, function (i) {
        const act = opts[i][1];
        if (act === 'churnheart') { g.churnheartFight(); return; }
        g.openTitle(); g.render();
      });
      g.render();
    },
  };

  TLU.SCREENS = SCREENS;
})(window.TLU = window.TLU || {});
