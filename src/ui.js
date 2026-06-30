/* ============================================================
 * ui.js — HTML HUD + keyboard-driven overlay screens.
 * game.js owns logic & state; this module renders DOM and
 * exposes a generic list-menu used by every screen.
 * ============================================================ */
(function (TLU) {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // ---- message log ----
  function log(game, msg, cls) {
    if (typeof msg === 'string' && msg.indexOf('%c') === 0) { msg = msg.slice(2); }
    game.logLines.push({ t: msg, c: cls || null });
    if (game.logLines.length > 200) game.logLines.shift();
    renderLog(game);
  }
  function renderLog(game) {
    const el = $('log'); if (!el) return;
    const recent = game.logLines.slice(-60);
    el.innerHTML = recent.map(function (l) {
      return '<div class="logline ' + (l.c ? 'log-' + l.c : '') + '">' + esc(l.t) + '</div>';
    }).join('');
    el.scrollTop = el.scrollHeight;
  }

  function bar(cur, max, color, w) {
    cur = Math.max(0, cur); const pct = max > 0 ? Math.round(cur / max * 100) : 0;
    return '<div class="bar"><div class="barfill" style="width:' + pct + '%;background:' + color + '"></div>' +
      '<span class="barlabel">' + Math.round(cur) + ' / ' + Math.round(max) + '</span></div>';
  }

  // ---- HUD sidebar ----
  function renderHUD(game) {
    const p = game.player; if (!p) return;
    const el = $('stats'); if (!el) return;
    let html = '';
    html += '<div class="pname">' + esc(p.name) + '</div>';
    html += '<div class="psub" style="color:' + p.order.color + '">' + p.order.glyph + ' ' + esc(p.order.name) + ' · Lv ' + p.level + '</div>';
    html += '<div class="statrow">HP</div>' + bar(p.hp, p.maxHp, '#c0392b');
    html += '<div class="statrow">Anima</div>' + bar(p.stormlight, p.maxStormlight, '#7e6bff');
    html += '<div class="statrow">XP</div>' + bar(p.xp, p.xpNext, '#3a8a4a');
    html += '<div class="gridstats">';
    html += '<span>⚔ ATK <b>' + p.attack + '</b></span>';
    html += '<span>⛨ DEF <b>' + p.defense + '</b></span>';
    html += '<span>» SPD <b>' + p.speed + '</b></span>';
    html += '<span>✦ CRIT <b>' + Math.round(p.crit * 100) + '%</b></span>';
    html += '<span>◎ Gold <b>' + p.gold + '</b></span>';
    html += '<span>◈ Frags <b>' + p.fragments + '/4</b></span>';
    html += '</div>';
    if (p.attrPoints > 0) html += '<div class="alert">★ ' + p.attrPoints + ' attribute points! Press [C]</div>';
    // active quest
    const aq = activeQuestText(game);
    if (aq) html += '<div class="quest"><div class="qhead">✸ ' + esc(aq.name) + '</div><div class="qbody">' + esc(aq.text) + '</div></div>';
    // location & time
    const loc = game.mode === 'world'
      ? (game.world.tiles[p.wy] && game.world.tiles[p.wy][p.wx] ? game.world.tiles[p.wy][p.wx].name : '')
      : (game.dungeon.site ? game.dungeon.site.name + ' — Floor ' + game.dungeon.depth : 'Ruin');
    html += '<div class="loc">◉ ' + esc(loc) + '</div>';
    html += '<div class="time">' + (game.storm && game.storm.active ? '⛈ THE CHURN' : '☀ Day ' + game.day) + '</div>';
    el.innerHTML = html;
  }

  function activeQuestText(game) {
    const q = TLU.Quests.MAIN;
    const st = game.player.questState.main || { stage: 0 };
    if (st.stage >= q.stages.length) return { name: q.name, text: 'Complete.' };
    return { name: q.name, text: q.stages[st.stage].text };
  }

  // ---- generic list menu ----
  // model: { title, subtitle?, items:[{label, hint?, color?, disabled?}], cursor, footer?, columns? }
  function renderMenu(m) {
    let html = '<div class="menu">';
    if (m.title) html += '<div class="menu-title">' + m.title + '</div>';
    if (m.subtitle) html += '<div class="menu-sub">' + m.subtitle + '</div>';
    if (m.body) html += '<div class="menu-body">' + m.body + '</div>';
    html += '<div class="menu-list">';
    (m.items || []).forEach(function (it, i) {
      const sel = i === m.cursor;
      html += '<div class="menu-item' + (sel ? ' sel' : '') + (it.disabled ? ' disabled' : '') + '" data-mi="' + i + '"' +
        (it.color ? ' style="color:' + it.color + '"' : '') + '>' +
        '<span class="mi-cursor">' + (sel ? '▶ ' : '  ') + '</span>' +
        '<span class="mi-label">' + it.label + '</span>' +
        (it.hint ? '<span class="mi-hint">' + it.hint + '</span>' : '') + '</div>';
    });
    html += '</div>';
    if (m.footer) html += '<div class="menu-foot">' + m.footer + '</div>';
    html += '</div>';
    return html;
  }

  function showOverlay(game, html, cls) {
    const ov = $('overlay');
    ov.className = 'show' + (cls ? ' ' + cls : '');
    ov.innerHTML = html;
  }
  function hideOverlay() { const ov = $('overlay'); ov.className = ''; ov.innerHTML = ''; }

  TLU.UI = {
    $: $, esc: esc, log: log, renderLog: renderLog, renderHUD: renderHUD,
    renderMenu: renderMenu, showOverlay: showOverlay, hideOverlay: hideOverlay, bar: bar,
    activeQuestText: activeQuestText,
  };
})(window.TLU = window.TLU || {});
