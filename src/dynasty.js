/* ============================================================
 * dynasty.js — asynchronous dynasties.
 * Every hero who dies (or triumphs) is recorded into the Annals, a
 * persistent ledger that OUTLIVES individual save files. In later
 * runs, a past hero returns as a ghostly "echo" on the map, bearing
 * a fragment of their legacy. Legends can be shared by code (and a
 * ?legend=<code> URL import seeds another player's hero into yours).
 * ============================================================ */
(function (TLU) {
  'use strict';

  const KEY = 'tlu_annals_v1';
  const MAX = 16;

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function store(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX))); } catch (e) {} }

  // the most valuable piece of gear the hero carried, as plain data
  function bestItem(p) {
    let best = null, bv = -1;
    ['weapon', 'body', 'head', 'feet', 'offhand'].forEach(function (s) {
      const it = p.equip && p.equip[s]; if (it && (it.value || 0) > bv) { bv = it.value; best = it; }
    });
    (p.inventory || []).forEach(function (it) {
      if ((it.type === 'weapon' || it.type === 'armor') && (it.value || 0) > bv) { bv = it.value; best = it; }
    });
    return best ? JSON.parse(JSON.stringify(best)) : null;
  }

  function record(p, info) {
    info = info || {};
    const annal = {
      name: p.name, orderName: p.order ? p.order.name : '', orderId: p.orderId,
      level: p.level, day: info.day || 0,
      kills: p.stats ? p.stats.kills : 0, fragments: p.fragments || 0,
      discoveries: p.discoveries || 0, cause: info.cause || 'fell in the marches',
      epitaph: info.epitaph || '', won: !!info.won, item: bestItem(p), t: info.t || 0,
    };
    const list = load();
    list.push(annal);
    store(list);
    return annal;
  }

  function encode(annal) { try { return btoa(unescape(encodeURIComponent(JSON.stringify(annal)))); } catch (e) { return ''; } }
  function decode(code) { try { return JSON.parse(decodeURIComponent(escape(atob(code)))); } catch (e) { return null; } }
  function importCode(code) {
    const a = decode(code);
    if (a && a.name) { const list = load(); a.imported = true; list.push(a); store(list); return a; }
    return null;
  }

  function pickEcho(rng) { const list = load(); return list.length ? rng.pick(list) : null; }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  TLU.Dynasty = { KEY: KEY, load: load, store: store, record: record, encode: encode, decode: decode, importCode: importCode, pickEcho: pickEcho, bestItem: bestItem, clear: clear };
})(window.TLU = window.TLU || {});
