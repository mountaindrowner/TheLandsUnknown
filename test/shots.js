/* Capture showcase screenshots: title, overworld, NPC dialogue, codex. */
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
  const press = async (k) => { await page.keyboard.press(k); await page.waitForTimeout(55); };
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ROOT, 'assets', 'screenshot-title.png') });

  // start a game
  await press('Enter'); await press('Enter'); await press('Enter'); await press('Enter');
  await page.waitForTimeout(150);
  // explore a bit for a populated map + log
  for (let i = 0; i < 28; i++) { await page.keyboard.press(['ArrowRight','ArrowDown','ArrowRight','ArrowUp'][i % 4]); await page.waitForTimeout(16); const inc = await page.evaluate(() => window.GAME.state === 'combat'); if (inc) { for (let j=0;j<40;j++){ const st=await page.evaluate(()=>({s:window.GAME.state,a:window.GAME.combat&&window.GAME.combat.awaitingPlayer,m:window.GAME.overlay&&window.GAME.overlay.menu})); if(st.s!=='combat')break; if(!st.a){await page.waitForTimeout(25);continue;} await page.keyboard.press('Enter'); await page.waitForTimeout(25);} } }
  // bring the Churn front onto the map for the overworld shot
  await page.evaluate(() => { const g = window.GAME; if (g.overlay) g.overlay = null; g.storm = { active: true, x: g.player.wx + 4, dir: -1, speed: 1.6, timer: 30 }; g.render(); });
  await page.waitForTimeout(60);
  await page.screenshot({ path: path.join(ROOT, 'assets', 'screenshot-play.png') });

  // Talents screen
  await page.evaluate(() => { const g = window.GAME; window.TLU.Player.gainXp(g.player, 9000, () => {}); g.player.perkPoints = 3; g.openPerks(); });
  await page.waitForTimeout(60);
  await page.screenshot({ path: path.join(ROOT, 'assets', 'screenshot-talents.png') });

  // NPC dialogue
  await page.evaluate(() => { const g = window.GAME; const t = g.world.towns[0]; g.openNpcs(t); });
  await page.waitForTimeout(60);
  await page.keyboard.press('Enter'); await page.waitForTimeout(60);  // approach first NPC
  await page.keyboard.press('Enter'); await page.waitForTimeout(60);  // talk
  await page.screenshot({ path: path.join(ROOT, 'assets', 'screenshot-npc.png') });

  // combat with a companion vs a group
  await page.evaluate(() => {
    const g = window.GAME; g.overlay = null;
    g.player.party = [window.TLU.Companions.generate(new window.TLU.RNG('shot'), g.player.level, 'channeler')];
    const grp = window.TLU.Bestiary.spawnGroup(new window.TLU.RNG('shotg'), 'plains', Math.max(2, g.player.level));
    g.startCombat(grp, { biome: 'plains', level: g.player.level, canFlee: true });
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(ROOT, 'assets', 'screenshot-combat.png') });

  // codex
  await page.evaluate(() => { const g = window.GAME; if (g.combat) { g.state = 'play'; } g.overlay = null; g.openCodex(); });
  await page.waitForTimeout(60);
  await page.screenshot({ path: path.join(ROOT, 'assets', 'screenshot-codex.png') });

  await browser.close(); srv.close();
  console.log('shots captured');
})().catch((e) => { console.error(e); process.exit(1); });
