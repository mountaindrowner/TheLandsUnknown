/* Screenshot every scene×style frame from the lookbook into assets/design/. */
const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
function serve() { return new Promise((r) => { const s = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const fp = path.join(ROOT, p); if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'text/plain' }); res.end(fs.readFileSync(fp)); }); s.listen(0, () => r(s)); }); }
(async () => {
  const srv = await serve(); const port = srv.address().port;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 2 });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://localhost:${port}/design/lookbook.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200); // let webfonts settle
  const frames = await page.$$('.frame[data-shot]');
  let n = 0;
  for (const f of frames) {
    const id = await f.getAttribute('data-shot');
    await f.screenshot({ path: path.join(ROOT, 'assets', 'design', id + '.png') });
    n++;
  }
  console.log('captured ' + n + ' frames' + (errs.length ? ('  · errors: ' + errs.slice(0, 5).join(' | ')) : ' · no errors'));
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
