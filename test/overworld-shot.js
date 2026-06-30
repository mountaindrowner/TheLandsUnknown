/* Capture the illustrated overworld with the whole map charted. */
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

  // begin a game directly, then chart the whole map and centre on a site-rich spot
  await page.evaluate(() => {
    const g = window.GAME;
    g.beginGame({ seed: 'showmap', name: 'Selin', order: 'skyrender', weaponSkill: 'blades', look: { seed: 'look:show:0:1', fem: false, age: 'prime' } });
    const w = g.world, p = g.player;
    for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) p.visited[x + ',' + y] = true;
    // centre near the town cluster so pins are on screen
    const t = w.towns && w.towns[0] ? w.towns[0] : { x: Math.floor(w.w / 2), y: Math.floor(w.h / 2) };
    p.wx = t.x; p.wy = t.y;
    g.storm = { active: true, x: p.wx + 7, dir: -1, speed: 1.6, timer: 30 };
    g.render();
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'overworld-map.png') });
  // a tighter crop of just the map canvas
  const map = await page.$('#map-wrap');
  if (map) await map.screenshot({ path: path.join(OUT, 'overworld-canvas.png') });

  console.log(errs.length ? ('ERRORS:\n' + errs.slice(0, 8).join('\n')) : 'no errors');
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
