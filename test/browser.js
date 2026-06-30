/* Comprehensive browser playthrough: boots index.html in Chromium and
 * drives the full UI — chargen, every overlay, town services, NPC dialogue,
 * the codex, a dungeon delve, normal combat, and a final-boss victory —
 * asserting zero console/page errors throughout. Screenshots on the way. */
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
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  let failed = 0;
  function ok(name, cond) { if (!cond) { failed++; console.error('  ✗ ' + name); } else console.log('  ✓ ' + name); }
  const press = async (k) => { await page.keyboard.press(k); await page.waitForTimeout(35); };
  const title = () => page.locator('.menu-title').first().innerText().catch(() => '');
  const state = () => page.evaluate(() => ({ s: window.GAME.state, mode: window.GAME.mode, ov: window.GAME.overlay && window.GAME.overlay.type }));

  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(250);

  ok('title screen shows', await page.locator('.title-screen').count() > 0);
  ok('TLU + GAME loaded', await page.evaluate(() => !!(window.TLU && window.GAME && window.TLU.Dialogue)));

  // ----- chargen -----
  await press('Enter');                          // New Game
  ok('chargen shows', (await title()).includes('Kindled'));
  await press('ArrowDown'); await press('Enter'); // order
  await press('Enter');                           // weapon
  await press('Enter');                           // name -> begin
  await page.waitForTimeout(150);
  const s1 = await state();
  ok('entered play/world', s1.s === 'play' && s1.mode === 'world');

  // ----- overlays -----
  await press('i'); ok('inventory opens', (await title()).includes('Inventory')); await press('Escape');
  await press('c'); ok('character opens', (await title()).length > 0); await press('Escape');
  await press('q'); ok('quests open', (await title()).includes('Quests')); await press('Escape');
  await press('Shift+L'); ok('codex opens', (await title()).includes('Codex'));
  await press('ArrowRight'); await press('ArrowRight'); // switch tabs
  await press('Escape');
  await press('?'); ok('help opens', (await title()).includes('How to Play')); await press('Enter');
  // perks: grant a talent point, open the screen, choose one
  await page.evaluate(() => { window.GAME.player.perkPoints = 1; window.GAME.render(); });
  await press('p'); ok('talents screen opens', (await title()).includes('Talents'));
  const perksBefore = await page.evaluate(() => Object.keys(window.GAME.player.perks).length);
  await press('Enter');
  ok('talent chosen', await page.evaluate(() => Object.keys(window.GAME.player.perks).length) > perksBefore);
  await press('Escape');

  // ----- teleport to a town and exercise services -----
  await page.evaluate(() => {
    const g = window.GAME; const t = g.world.towns[0];
    g.player.wx = t.x; g.player.wy = t.y; g.player.gold = 2000;
    g.render();
  });
  await press('Enter');                            // enter town
  ok('town menu opens', (await title()).length > 0 && (await state()).ov === 'town');

  // rest (cursor 0)
  await press('Enter'); await page.waitForTimeout(40);
  // shop: services order = rest,shop,train,folk,speak,leave -> cursor to shop
  await page.evaluate(() => { window.GAME.overlay.cursor = 1; });
  await press('Enter'); ok('shop opens', (await title()).includes('Merchant'));
  await press('Enter');                            // buy first item
  await press('Tab');                              // switch to sell
  await press('Escape');                           // back to town
  // train
  await page.evaluate(() => { window.GAME.overlay.cursor = 2; });
  await press('Enter'); ok('trainer opens', (await title()).includes('Trainer'));
  await press('Enter');                            // train first skill
  await press('Escape');
  // townsfolk -> NPC -> talk -> rumor -> farewell
  await page.evaluate(() => { window.GAME.overlay.cursor = 3; });
  await press('Enter'); ok('npc roster opens', (await title()).includes('folk of'));
  await press('Enter');                            // approach first NPC
  ok('npc conversation opens', (await state()).ov === 'npc');
  await press('Enter');                            // Talk (topic 0)
  await press('ArrowDown');                        // -> Ask for rumors (topic 1)
  await press('Enter');
  const rumorsLogged = await page.evaluate(() => window.GAME.player.codex.rumors.length);
  ok('rumor recorded to codex', rumorsLogged >= 1);
  // navigate to the last topic (Farewell) and leave
  for (let i = 0; i < 5; i++) {
    const isLast = await page.evaluate(() => {
      const o = window.GAME.overlay; if (!o || o.type !== 'npc') return true;
      const t = window.TLU.SCREENS.npc.topics(o.npc);
      return o.cursor === t.length - 1;
    });
    if (isLast) break;
    await press('ArrowDown');
  }
  await press('Enter');
  ok('returned to town after npc', (await state()).ov === 'town');
  // galewarden speak (quest) -> advances main stage; click through dialog
  await page.evaluate(() => { window.GAME.overlay.cursor = 4; });
  await press('Enter');
  ok('galewarden dialog opens', (await state()).ov === 'dialog');
  for (let i = 0; i < 8; i++) { if ((await state()).ov !== 'dialog') break; await press('Enter'); }
  const mainStage = await page.evaluate(() => window.GAME.player.questState.main.stage);
  ok('main quest advanced past intro', mainStage >= 1);
  // leave town
  if ((await state()).ov === 'town') { await page.evaluate(() => { window.GAME.overlay.cursor = 5; }); await press('Enter'); }

  // ----- dungeon delve: enter the nearest vault -----
  await page.evaluate(() => {
    const g = window.GAME; const v = g.world.vaults[0];
    g.player.wx = v.x; g.player.wy = v.y;
    window.TLU.Player.gainXp(g.player, 8000, () => {});
    g.player.hp = g.player.maxHp; g.player.stormlight = g.player.maxStormlight;
    g.render();
  });
  await press('Enter');                            // descend into vault
  ok('entered dungeon', (await state()).mode === 'dungeon');
  // walk around the floor a bit (may trigger combat)
  for (let i = 0; i < 25; i++) {
    const st = await state();
    if (st.s === 'combat') break;
    await page.keyboard.press(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'][i % 4]);
    await page.waitForTimeout(18);
  }
  // resolve combat if any
  await resolveCombat(page, press, state);

  // ----- forced normal combat via real flow -----
  await page.evaluate(() => {
    const g = window.GAME;
    if (g.overlay && g.overlay.type === 'loot') g.overlay = null;
    const grp = window.TLU.Bestiary.spawnGroup(new window.TLU.RNG('forced'), 'plains', Math.max(1, g.player.level));
    g.startCombat(grp, { biome: 'plains', level: g.player.level, canFlee: true });
  });
  await page.waitForTimeout(80);
  ok('combat screen renders', await page.locator('.combat').count() > 0);
  await page.screenshot({ path: path.join(ROOT, 'assets', 'screenshot-combat.png') });
  const normEnded = await resolveCombat(page, press, state);
  ok('normal combat resolves', normEnded);

  // ----- FINAL BOSS to victory -----
  await page.evaluate(() => {
    const g = window.GAME;
    if (g.overlay && g.overlay.type === 'loot') g.overlay = null;
    const p = g.player;
    window.TLU.Player.gainXp(p, 300000, () => {});
    window.TLU.Player.equip(p, window.TLU.Items.UNIQUES.oathbringer());
    window.TLU.Player.equip(p, window.TLU.Items.UNIQUES.plate_radiant());
    p.maxHp = 6000; p.hp = 6000; p.attack = 800; p.stormlight = p.maxStormlight;
    const boss = window.TLU.Bestiary.scale(window.TLU.Bestiary.FINAL_BOSS, 18);
    g.startCombat([boss], { biome: 'aharietiam', level: 18, isBoss: true, canFlee: false });
  });
  await page.waitForTimeout(80);
  const bossEnded = await resolveCombat(page, press, state, 300);
  ok('final boss fight resolves', bossEnded);
  const finalState = await page.evaluate(() => ({ s: window.GAME.state, ov: window.GAME.overlay && window.GAME.overlay.type }));
  ok('VICTORY screen reached', finalState.s === 'win' && finalState.ov === 'win');
  if (finalState.s === 'win') await page.screenshot({ path: path.join(ROOT, 'assets', 'screenshot-victory.png') });

  ok('no console/page errors', errors.length === 0);
  if (errors.length) errors.slice(0, 12).forEach((e) => console.error('    ! ' + e));

  await browser.close();
  srv.close();
  console.log(failed ? `\n${failed} browser checks FAILED` : '\nAll browser checks passed.');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

// drive a combat to its end via the real keyboard menu; returns true if it ended
async function resolveCombat(page, press, state, maxActions) {
  maxActions = maxActions || 160;
  for (let i = 0; i < maxActions; i++) {
    const st = await page.evaluate(() => {
      const g = window.GAME;
      return { s: g.state, await: g.combat ? g.combat.awaitingPlayer : false, menu: g.overlay && g.overlay.menu, ov: g.overlay && g.overlay.type };
    });
    if (st.s !== 'combat') {
      // clear any loot overlay
      if (st.ov === 'loot') { await page.keyboard.press('a').catch(() => {}); await page.waitForTimeout(30); }
      return true;
    }
    if (!st.await) { await page.waitForTimeout(30); continue; }
    if (st.menu === 'root') await press('Enter');        // Attack
    else if (st.menu === 'target') await press('Enter'); // first target
    else await press('Escape');
    await page.waitForTimeout(20);
  }
  return false;
}
