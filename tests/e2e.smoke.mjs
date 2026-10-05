// E2E smoke test: full onboarding → home → slip → triggers → check-in →
// progress → settings. Run: node tests/e2e.smoke.mjs
// Requires: npm i --no-save puppeteer-core (chrome-headless-shell in ~/.cache/puppeteer)

import puppeteer from 'puppeteer-core';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';

const PORT = 8319;
const ROOT = new URL('../app', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const server = createServer(async (req, res) => {
  const path = join(ROOT, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(PORT);

const CHROME = `${process.env.HOME}/.cache/puppeteer/chrome-headless-shell/linux-150.0.7871.24/chrome-headless-shell-linux64/chrome-headless-shell`;

let failures = 0;
const ok = (cond, name) => { console.log(`${cond ? '✓' : '✗'} ${name}`); if (!cond) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => { console.log('✗ PAGE ERROR:', e.message); failures++; });

const text = () => page.evaluate(() => document.body.innerText);
const clickByText = async (sel, t) => page.evaluate(({ sel, t }) => {
  const n = [...document.querySelectorAll(sel)].find((x) => x.textContent.includes(t));
  if (!n) throw new Error(`not found: ${sel} "${t}"`);
  n.click();
}, { sel, t });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
ok((await text()).includes('Turas'), 'onboarding welcome renders');

// Step 1 → 2
await clickByText('button', 'I understand'); await sleep(150);
ok((await text()).includes('What’s your goal?'), 'mode step renders');
await clickByText('.card h3', 'Quit completely');
await clickByText('button', 'Continue'); await sleep(150);

// Step 3: add a drink from preset
ok((await text()).includes('What did you usually drink?'), 'drinks step renders');
await clickByText('button', '+ Add a drink'); await sleep(150);
await page.select('.sheet select', 'stout-pint'); await sleep(100);
await clickByText('.sheet button', 'Save drink'); await sleep(250);
ok((await text()).includes('Pint of stout'), 'drink added and listed');
ok((await text()).includes('per week'), 'weekly baseline summary shown');
await clickByText('button', 'Continue'); await sleep(150);

// Step 4 (sex) → 5 (pledge + reasons) → 6 (date)
await clickByText('button', 'Continue'); await sleep(150);
await page.type('textarea', 'For the clear mornings.');
const tas = await page.$$('textarea');
await tas[1].type('Better sleep\nSave for Spain');
await clickByText('button', 'Continue'); await sleep(150);
await clickByText('button', 'Begin the journey'); await sleep(400);

// Home — regression: finishing onboarding fired hashchange + turas:navigate
// together and rendered everything twice
ok(await page.evaluate(() => document.querySelectorAll('.hero').length === 1),
  'home renders exactly one hero after onboarding');
ok(await page.evaluate(() => [...document.querySelectorAll('a')].filter((a) => a.textContent.includes('Evening check-in')).length === 1),
  'home renders exactly one check-in link after onboarding');
ok((await text()).includes('Day'), 'home shows streak hero');
ok((await text()).includes('saved'), 'home shows savings stat');
ok((await text()).includes('Next up for your body'), 'home shows next milestone');

// Slip flow
await clickByText('button', 'I had a drink'); await sleep(200);
await clickByText('.sheet .qty-btns button', '+'); await sleep(100);
await clickByText('.sheet button', 'Log it & reset streak'); await sleep(800);
ok((await text()).includes('Day'), 'home still renders after slip');
const dayNum = await page.evaluate(() => document.querySelector('.day-count')?.textContent);
ok(dayNum === '1', `streak reset to Day 1 (got ${dayNum})`);
ok((await text()).includes('reflect'), 'quiet reflect offer appears');

// Triggers
await page.goto(`http://localhost:${PORT}/#/triggers`, { waitUntil: 'networkidle0' }); await sleep(200);
await clickByText('.chip', 'Tired');
await page.type('textarea', 'Long day, walked past the pub.');
await clickByText('button', 'Save'); await sleep(300);
ok((await text()).includes('Long day, walked past the pub.'), 'trigger saved to history');

// Check-in
await page.goto(`http://localhost:${PORT}/#/checkin`, { waitUntil: 'networkidle0' }); await sleep(200);
await clickByText('button', 'Done'); await sleep(300);

// Tab bar uses SVG icons (consistent styling, no emoji-presentation lottery)
ok(await page.evaluate(() => document.querySelectorAll('.tabbar svg.tab-icon').length === 5),
  'tab bar has 5 SVG icons');

// Progress
await page.goto(`http://localhost:${PORT}/#/progress`, { waitUntil: 'networkidle0' }); await sleep(300);
const pTxt = await text();
ok(pTxt.includes('The whole journey'), 'progress lifetime card renders');
ok(pTxt.includes('Last 6 weeks'), 'calendar shows 6-week window');

// Calendar paging: ‹ goes to the past (title becomes a date range), › returns
await page.evaluate(() => [...document.querySelectorAll('.cal-nav')].find((b) => b.textContent === '‹').click());
ok(!(await text()).includes('Last 6 weeks'), 'calendar pages back to earlier weeks');
await page.evaluate(() => [...document.querySelectorAll('.cal-nav')].find((b) => b.textContent === '›').click());
ok((await text()).includes('Last 6 weeks'), 'calendar pages forward again');
ok(await page.evaluate(() => [...document.querySelectorAll('.cal-nav')].find((b) => b.textContent === '›').disabled),
  'forward button disabled at current week');

// Condensed badges + "See all" sheet
// .badge-sub is uppercased by CSS, so compare case-insensitively
ok(/recently earned|coming up next/i.test(await text()), 'badges card is condensed');
ok(await page.evaluate(() => document.querySelectorAll('.badge').length <= 6),
  'at most 6 badge tiles inline');
await clickByText('button', 'See all'); await sleep(200);
ok(await page.evaluate(() => document.querySelectorAll('.sheet .badge').length >= 20),
  'See all sheet shows the full badge wall');
await page.evaluate(() => document.querySelector('.sheet-backdrop').click()); await sleep(150);

// Custom milestone
await clickByText('button', '+ add your own'); await sleep(200);
await page.evaluate(() => { document.querySelector('.sheet input[type="number"]').value = '2'; });
await page.type('.sheet input[type="text"]', 'My own big day');
await clickByText('.sheet button', 'Add'); await sleep(300);
ok((await text()).includes('My own big day'), 'custom milestone appears in timeline');

// SOS
await page.goto(`http://localhost:${PORT}/#/sos`, { waitUntil: 'networkidle0' }); await sleep(300);
const sTxt = await text();
ok(sTxt.includes('Ride it out'), 'SOS renders');
ok(sTxt.includes('For the clear mornings.'), 'pledge card shows pledge');
const backReason = await page.evaluate(() => document.querySelector('.pledge-back-main')?.textContent || '');
ok(backReason.includes('Better sleep') || backReason.includes('Save for Spain'),
  'card back shows a quit reason when no images are set');
await page.evaluate(() => document.querySelector('.pledge-card').click()); await sleep(100);

// Back navigation from SOS must stop its timers (router teardown)
await page.goto(`http://localhost:${PORT}/#/home`, { waitUntil: 'networkidle0' }); await sleep(200);
ok(await page.evaluate(async () => {
  const sos = await import('./js/views/sos.js');
  return sos.teardown && true;
}), 'SOS exposes teardown for the router');

await page.goto(`http://localhost:${PORT}/#/sos`, { waitUntil: 'networkidle0' }); await sleep(300);
await clickByText('button', 'I’m calm now'); await sleep(200);
await clickByText('.chip', 'Breathing');
await clickByText('button', 'Done'); await sleep(300);

// Settings renders + export builds
await page.goto(`http://localhost:${PORT}/#/settings`, { waitUntil: 'networkidle0' }); await sleep(300);
ok((await text()).includes('Your drinks & old habits'), 'settings renders');

// In quit mode the weekly-budget targets are hidden; switching mode reveals them
ok(await page.evaluate(() => {
  const budget = [...document.querySelectorAll('label.field span')].find((s) => s.textContent.includes('Weekly budget'));
  return budget && budget.closest('.row').classList.contains('hidden');
}), 'weekly budget hidden in quit mode');
await page.select('select', 'cutdown'); await sleep(100);
ok(await page.evaluate(() => {
  const budget = [...document.querySelectorAll('label.field span')].find((s) => s.textContent.includes('Weekly budget'));
  return budget && !budget.closest('.row').classList.contains('hidden');
}), 'weekly budget shown after switching to cut-down');
await page.select('select', 'abstinence'); await sleep(100);
const exportObj = await page.evaluate(async () => {
  const m = await import('./js/features/exportImport.js');
  return m.buildExport();
});
ok(exportObj.app === 'turas' && exportObj.stores.drinks.length === 1 && exportObj.stores.events.length >= 1,
  'export contains profile data, drinks and events');

await browser.close();
server.close();
console.log(failures ? `\n${failures} FAILURES` : '\nAll smoke checks passed');
process.exit(failures ? 1 : 0);
