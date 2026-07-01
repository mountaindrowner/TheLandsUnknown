/* Isometric tactics bench: render it, capture stills, and auto-play a full
 * skirmish to exercise move / push / death / win-lose with no console errors. */
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
  const page = await browser.newPage({ viewport: { width: 1200, height: 820 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://localhost:${port}/design/iso.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);

  const ok = (label, cond) => console.log((cond ? '  ✓ ' : '  ✗ FAIL ') + label);

  ok('board mounts', await page.locator('.iso-board').count() > 0);
  ok('unit tokens drawn', await page.locator('.iso-unit').count() >= 6);
  ok('enemies telegraph on turn 1', await page.evaluate(() => window.ISO.enemies().every(e => !!e.intent)));

  // still: opening board with telegraphs
  await page.screenshot({ path: path.join(OUT, 'iso-board.png') });

  // select the hero -> movement range should light up
  await page.evaluate(() => window.ISO.select(window.ISO.allies()[0]));
  await page.waitForTimeout(120);
  ok('selecting shows a move set', await page.evaluate(() => Object.keys(window.ISO.moveSet).length > 0));
  await page.screenshot({ path: path.join(OUT, 'iso-select.png') });

  // auto-play a whole skirmish through the public API
  const result = await page.evaluate(() => {
    const g = window.ISO; let guard = 0;
    const dist = (a, b) => Math.abs(a.gx - b.gx) + Math.abs(a.gy - b.gy);
    while (!g.over && guard++ < 60) {
      g.allies().forEach(a => {
        if (g.over || a.acted) return;
        g.select(a);
        let tk = Object.keys(g.atkSet)[0];
        if (tk) { const [x, y] = tk.split(',').map(Number); g.attack(x, y); return; }
        const foes = g.enemies().slice().sort((p, q) => dist(p, a) - dist(q, a));
        const e = foes[0];
        if (e) {
          let best = null, bd = 1e9;
          Object.keys(g.moveSet).forEach(k => { const [x, y] = k.split(',').map(Number); const d = Math.abs(x - e.gx) + Math.abs(y - e.gy); if (d < bd) { bd = d; best = [x, y]; } });
          if (best) { g.moveTo(best[0], best[1]); const t2 = Object.keys(g.atkSet)[0]; if (t2) { const [x, y] = t2.split(',').map(Number); g.attack(x, y); } }
        }
        a.acted = true;
      });
      if (!g.over) g.endTurn();
    }
    return { over: g.over, turn: g.turn };
  });
  ok('skirmish reaches a terminal state', result.over === 'win' || result.over === 'lose');
  console.log('    -> outcome: ' + result.over + ' on turn ' + result.turn);
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(OUT, 'iso-end.png') });

  ok('no console/page errors', errs.length === 0);
  if (errs.length) console.log('ERRORS:\n' + errs.slice(0, 8).join('\n'));
  await browser.close(); srv.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
