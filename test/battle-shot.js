/* Capture the cinematic battle stage: a normal fight, a boss fight, and a
 * mid-animation frame (floating damage + hit flash). */
const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
function serve() { return new Promise((r) => { const s = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const fp = path.join(ROOT, p); if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'text/plain' }); res.end(fs.readFileSync(fp)); }); s.listen(0, () => r(s)); }); }
const OUT = path.join(ROOT, 'assets', 'design');

(async () => {
  const srv = await serve(); const port = srv.address().port;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1320, height: 880 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const g = window.GAME;
    g.beginGame({ seed: 'battle', name: 'Selin', order: 'skyrender', weaponSkill: 'blades', look: { seed: 'look:b:0:1', fem: false, age: 'prime' } });
  });

  // 1) a mixed group in a storm (churn backdrop)
  await page.evaluate(() => {
    const g = window.GAME, B = window.TLU.Bestiary;
    const grp = [B.scale(B.byId('churncaller'), 8), B.scale(B.byId('ridgehound'), 5), B.scale(B.byId('scrapmite'), 3)];
    g.startCombat(grp, { biome: 'storm', level: 8, canFlee: true });
  });
  await page.waitForTimeout(150);
  let el = await page.$('#overlay'); if (el) await el.screenshot({ path: path.join(OUT, 'battle-group.png') });

  // mid-animation: strike the first foe and grab a frame while the fx play
  await page.evaluate(() => { const g = window.GAME, c = g.combat; c.playerAct({ type: 'attack', target: c.aliveEnemies()[0] }); });
  await page.waitForTimeout(130);
  el = await page.$('#overlay'); if (el) await el.screenshot({ path: path.join(OUT, 'battle-hit.png') });
  await page.evaluate(() => { if (window.GAME._fxSkip) window.GAME._fxSkip(); });
  await page.waitForTimeout(60);

  // 2) a boss fight (throne backdrop, big plate)
  await page.evaluate(() => {
    const g = window.GAME, B = window.TLU.Bestiary;
    g.startCombat([B.scale(B.FINAL_BOSS, 18)], { biome: 'deepvault', level: 18, isBoss: true, canFlee: false });
  });
  await page.waitForTimeout(160);
  el = await page.$('#overlay'); if (el) await el.screenshot({ path: path.join(OUT, 'battle-boss.png') });

  console.log(errs.length ? ('ERRORS:\n' + errs.slice(0, 8).join('\n')) : 'no errors');
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
