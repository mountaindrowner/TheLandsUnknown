/* Capture the opening cinematic beats + the Order-choosing screen. */
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(250);

  // start the cinematic
  await page.evaluate(() => window.GAME.startIntro('chargen'));
  const beats = await page.evaluate(() => window.TLU.Intro.BEATS.length);
  for (let b = 0; b < beats; b++) {
    await page.evaluate((i) => { window.GAME.overlay.beat = i; window.GAME.render(); }, b);
    await page.waitForTimeout(1700); // let the narration finish fading in
    await page.screenshot({ path: path.join(OUT, 'intro-' + (b + 1) + '.png') });
  }

  // the Order-choosing screen (chargen step 0), one shot per Order
  await page.evaluate(() => window.GAME.startChargen());
  await page.waitForTimeout(120);
  const orders = await page.evaluate(() => window.GAME.overlay.orderKeys.length);
  for (let i = 0; i < orders; i++) {
    await page.evaluate((idx) => { window.GAME.overlay.orderIdx = idx; window.GAME.render(); }, i);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, 'order-' + (i + 1) + '.png') });
  }

  console.log(errs.length ? ('ERRORS:\n' + errs.slice(0, 8).join('\n')) : 'no errors');
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
