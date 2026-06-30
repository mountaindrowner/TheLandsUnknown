/* Capture the generative cast gallery + folio in-game overlays. */
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
  const errs = [];

  // ---- 1) the generative cast gallery ----
  const gal = await browser.newPage({ viewport: { width: 1240, height: 1000 }, deviceScaleFactor: 2 });
  gal.on('pageerror', e => errs.push('GAL ' + e.message));
  await gal.goto(`http://localhost:${port}/design/faces.html`, { waitUntil: 'networkidle' });
  await gal.waitForTimeout(900);
  await gal.evaluate(() => window.scrollTo(0, 0));
  await gal.screenshot({ path: path.join(OUT, 'folio-cast.png'), fullPage: true });

  // ---- 2) in-game folio overlays ----
  const page = await browser.newPage({ viewport: { width: 1320, height: 860 } });
  page.on('pageerror', e => errs.push('GAME ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('C ' + m.text()); });
  const press = async (k) => { await page.keyboard.press(k); await page.waitForTimeout(60); };
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  // new game: New Game -> skip intro cinematic -> chargen (order, weapon, name)
  await press('Enter'); await press('Escape');
  await press('Enter'); await press('Enter');
  await page.locator('.title-screen').first().dispatchEvent('click').catch(() => {});
  await page.waitForTimeout(200);
  // set up a lived-in hero
  await page.evaluate(() => {
    const g = window.GAME; if (!g || !g.player) return;
    window.TLU.Player.gainXp(g.player, 6000, () => {});
    g.player.hp = g.player.maxHp; g.player.gold = 400;
    g.state = 'play';
    g.storm = { active: true, x: g.player.wx + 5, dir: -1, speed: 1.6, timer: 30 };
    // give some bestiary knowledge
    ['scrapmite', 'ridgehound', 'reaver_raider', 'gloamspawn', 'cragwrought'].forEach(id => { g.player.codex.bestiary[id] = true; });
    g.render();
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(OUT, 'folio-play.png') });

  // character sheet
  await page.evaluate(() => window.GAME.openCharacter());
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'folio-character.png') });
  await press('Escape');

  // codex bestiary
  await page.evaluate(() => { window.GAME.openCodex(); window.GAME.overlay.tab = 2; window.GAME.render(); });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'folio-codex.png') });
  await press('Escape');

  // recruit screen (build a town + recruits directly)
  await page.evaluate(() => {
    const g = window.GAME;
    const site = { x: g.player.wx, y: g.player.wy, name: 'Vesmark', level: 3, type: 'town' };
    g.overlay = { type: 'town', site: site, sub: 'recruit', cursor: 0 };
    if (g.SCREENS) {} // noop
    // ensure recruits via the town screen helper
    const T = window.TLU.Game.prototype;
    g.render();
  });
  // the town screen's renderRecruit calls ensureRecruits; trigger a render path
  await page.evaluate(() => { const g = window.GAME; g.overlay = { type: 'town', site: { x: g.player.wx, y: g.player.wy, name: 'Vesmark', level: 3, type: 'town' }, sub: 'recruit', cursor: 0 }; g.render(); });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'folio-recruit.png') });
  await press('Escape'); await press('Escape');

  // an NPC conversation
  await page.evaluate(() => {
    const g = window.GAME, D = window.TLU.Dialogue;
    const rng = new window.TLU.RNG('npcshot');
    const roster = D.rosterFor(rng, { level: 5, _npcs: null });
    const npc = roster[2] || roster[0];
    const site = { x: g.player.wx, y: g.player.wy, name: 'Vesmark' };
    const greet = (npc.arch.greet ? D.pick(rng, npc.arch.greet) : 'Well met, Kindled.');
    g.overlay = { type: 'npc', npc: npc, site: site, line: greet, cursor: 0 };
    g.render();
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'folio-npc.png') });

  // an echo
  await page.evaluate(() => {
    const g = window.GAME;
    g.overlay = { type: 'echo', annal: { name: 'Shalra Vethin', orderName: 'Veilseer', level: 14, day: 22, cause: 'fell holding the Last Gate', won: false, epitaph: 'I carried what I could.' }, boon: 'a fragment of stored Charge' };
    g.render();
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'folio-echo.png') });

  console.log(errs.length ? ('ERRORS:\n' + errs.slice(0, 12).join('\n')) : 'no errors');
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
