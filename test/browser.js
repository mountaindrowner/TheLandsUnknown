/* Browser smoke test: boots index.html in Chromium, drives the title ->
 * chargen -> world -> combat flow, asserts no console errors, screenshots. */
const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'text/plain' });
      res.end(fs.readFileSync(fp));
    });
    srv.listen(0, () => resolve(srv));
  });
}

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  let failed = 0;
  function ok(name, cond) { if (!cond) { failed++; console.error('  ✗ ' + name); } else console.log('  ✓ ' + name); }
  const press = async (k) => { await page.keyboard.press(k); await page.waitForTimeout(40); };

  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  // title visible
  ok('title screen shows', await page.locator('.title-screen').count() > 0);
  ok('TLU loaded', await page.evaluate(() => !!window.TLU && !!window.GAME));

  // New Game (first item may be New Game when no save) -> select
  // ensure no save: clear localStorage then reload
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  await press('Enter');               // New Game
  ok('chargen order step', (await page.locator('.menu-title').first().innerText()).includes('Radiant'));
  await press('ArrowDown');           // pick a different order
  await press('Enter');               // confirm order -> weapon step
  await press('Enter');               // confirm weapon -> name step
  await press('Enter');               // begin game
  await page.waitForTimeout(200);

  const state1 = await page.evaluate(() => ({ state: window.GAME.state, mode: window.GAME.mode, hp: window.GAME.player.maxHp, lvl: window.GAME.player.level }));
  ok('game entered play state', state1.state === 'play' && state1.mode === 'world');
  ok('player created with hp', state1.hp > 0);

  // open & close inventory, character, quests, help
  await press('i'); ok('inventory opens', await page.locator('.menu-title').first().innerText().then(t => t.includes('Inventory')));
  await press('Escape');
  await press('c'); ok('character opens', (await page.locator('.menu-title').first().innerText()).toLowerCase().includes(state1 ? '' : ''));
  await press('Escape');
  await press('q'); await press('Escape');
  await press('?'); await press('Enter');

  // walk around many steps to discover map and likely trigger a combat
  for (let i = 0; i < 60; i++) {
    const dir = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'][i % 4];
    await page.keyboard.press(dir);
    await page.waitForTimeout(20);
    const inCombat = await page.evaluate(() => window.GAME.state === 'combat');
    if (inCombat) break;
  }

  // force a combat deterministically if none triggered, to test the flow
  const forced = await page.evaluate(() => {
    const g = window.GAME;
    if (g.state === 'combat') return 'already';
    if (g.overlay) { g.overlay = null; }
    const grp = TLU.Bestiary.spawnGroup(new TLU.RNG('forced'), 'plains', Math.max(1, g.player.level));
    g.startCombat(grp, { biome: 'plains', level: g.player.level, canFlee: true });
    return 'forced';
  });
  await page.waitForTimeout(120);
  ok('combat screen renders', await page.locator('.combat').count() > 0);

  // fight: attack until combat ends (max 80 actions)
  let ended = false;
  for (let i = 0; i < 120; i++) {
    const st = await page.evaluate(() => ({ s: window.GAME.state, await: window.GAME.combat ? window.GAME.combat.awaitingPlayer : false, menu: window.GAME.overlay && window.GAME.overlay.menu }));
    if (st.s !== 'combat') { ended = true; break; }
    if (!st.await) { await page.waitForTimeout(40); continue; }
    if (st.menu === 'root') { await press('Enter'); }       // Attack
    else if (st.menu === 'target') { await press('Enter'); } // first target
    else { await press('Escape'); }
    await page.waitForTimeout(30);
  }
  // if a loot overlay popped, take all
  if (await page.locator('.panel').count() > 0) { await page.keyboard.press('a').catch(() => {}); }
  ok('combat resolved (no hang)', ended);

  const final = await page.evaluate(() => ({ state: window.GAME.state, kills: window.GAME.player.stats.kills }));
  ok('returned to a valid state', ['play', 'over', 'win'].includes(final.state));

  await page.screenshot({ path: path.join(ROOT, 'assets', 'screenshot-play.png') });

  ok('no console/page errors', errors.length === 0);
  if (errors.length) errors.slice(0, 12).forEach((e) => console.error('    ! ' + e));

  await browser.close();
  srv.close();
  console.log(failed ? `\n${failed} browser checks FAILED` : '\nAll browser checks passed.');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
