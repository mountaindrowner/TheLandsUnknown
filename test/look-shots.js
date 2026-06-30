/* Capture the character-appearance gallery (chargen step 1). */
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
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 }, deviceScaleFactor: 2 });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  // jump to chargen, appearance step
  await page.evaluate(() => { window.GAME.startChargen(); window.GAME.overlay.step = 1; window.GAME.render(); });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'look-gallery.png') });

  // a different Order + feminine preset + a different selected face
  await page.evaluate(() => { const o = window.GAME.overlay; o.orderIdx = 3; o.lookPres = 'fem'; o.lookIdx = 5; window.GAME.render(); });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(OUT, 'look-gallery2.png') });

  console.log(errs.length ? ('ERRORS:\n' + errs.slice(0, 8).join('\n')) : 'no errors');
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
