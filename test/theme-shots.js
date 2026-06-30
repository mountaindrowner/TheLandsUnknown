/* Capture the same in-play scene under each theme, for the proposal. */
const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
function serve() { return new Promise((r) => { const s = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const fp = path.join(ROOT, p); if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'text/plain' }); res.end(fs.readFileSync(fp)); }); s.listen(0, () => r(s)); }); }
(async () => {
  const srv = await serve(); const port = srv.address().port;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const press = async (k) => { await page.keyboard.press(k); await page.waitForTimeout(45); };
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
  // new game
  await press('Enter'); await press('ArrowDown'); await press('Enter'); await press('Enter');
  await page.locator('.title-screen').first().dispatchEvent('click'); await page.waitForTimeout(150);
  // explore + resolve any combat for a lived-in scene
  for (let i = 0; i < 22; i++) { await page.keyboard.press(['ArrowRight','ArrowDown','ArrowRight','ArrowUp'][i % 4]); await page.waitForTimeout(16);
    for (let j = 0; j < 50; j++) { const st = await page.evaluate(() => ({ s: window.GAME.state, a: window.GAME.combat && window.GAME.combat.awaitingPlayer })); if (st.s !== 'combat') break; if (!st.a) { await page.waitForTimeout(20); continue; } await page.keyboard.press('Enter'); await page.waitForTimeout(20); } }
  await page.evaluate(() => {
    const g = window.GAME;
    if (g.overlay && g.overlay.type === 'loot') g.key('a');
    g.overlay = null;
    g.state = 'play';                          // ensure render() actually redraws
    window.TLU.Player.gainXp(g.player, 4000, () => {});
    g.player.hp = g.player.maxHp; g.player.stormlight = g.player.maxStormlight;
    g.storm = { active: true, x: g.player.wx + 5, dir: -1, speed: 1.6, timer: 30 };
    g.render();
  });

  for (const id of ['storm', 'phosphor', 'almanac', 'bauhaus']) {
    await page.evaluate((t) => { window.TLU.Theme.apply(t, window.GAME); window.GAME.render(); }, id);
    await page.waitForTimeout(90);
    await page.screenshot({ path: path.join(ROOT, 'assets', 'theme-' + id + '.png') });
  }
  // also a title shot per theme (shows logo/menus)
  for (const id of ['phosphor', 'almanac', 'bauhaus']) {
    await page.evaluate((t) => { const g = window.GAME; window.TLU.Theme.apply(t, g); g.openTitle(); g.render(); }, id);
    await page.waitForTimeout(90);
    await page.screenshot({ path: path.join(ROOT, 'assets', 'theme-title-' + id + '.png') });
  }
  await browser.close(); srv.close();
  console.log('theme shots captured');
})().catch((e) => { console.error(e); process.exit(1); });
