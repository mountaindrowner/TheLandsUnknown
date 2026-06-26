/* Capture title + combat screenshots for the README. */
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
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ROOT, 'assets', 'screenshot-title.png') });

  // start a game and jump into a boss combat for a dramatic shot
  const press = async (k) => { await page.keyboard.press(k); await page.waitForTimeout(60); };
  await press('Enter'); await press('Enter'); await press('Enter'); await press('Enter');
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const g = window.GAME;
    TLU.Player.gainXp(g.player, 6000, () => {});
    g.player.hp = Math.round(g.player.maxHp * 0.7);
    const boss = TLU.Bestiary.scale(TLU.Bestiary.MINIBOSS, TLU.Bestiary.MINIBOSS.lvl);
    const adds = [TLU.Bestiary.scale(TLU.Bestiary.byId('reaver_raider'), 6), TLU.Bestiary.scale(TLU.Bestiary.byId('reaver_raider'), 6)];
    g.startCombat([boss].concat(adds), { biome: 'plains', level: 8, isBoss: true, canFlee: false });
  });
  await page.waitForTimeout(150);
  await press('ArrowDown'); // move cursor to Surge to show menu depth
  await page.screenshot({ path: path.join(ROOT, 'assets', 'screenshot-combat.png') });
  await browser.close(); srv.close();
  console.log('shots captured');
})().catch((e) => { console.error(e); process.exit(1); });
