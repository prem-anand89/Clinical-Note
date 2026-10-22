// Pin bridge checks. Run: node tests/pins.mjs   (needs playwright-core + /usr/bin/google-chrome)
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(dir, '..', 'clinical-note.html');

const results = []; const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 } });
const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(url);
await page.click('#region-chips [data-chip="Knee"]');
await page.evaluate(() => { window.leanSuggest.add('rom', 'Flexion'); window.leanSuggest.add('rom', 'Extension'); window.leanSuggest.add('mmt', 'Quadriceps'); });

ok('pin buttons on ROM + MMT rows', (await page.locator('.obj-row .pin-btn').count()) === 3, await page.locator('.obj-row .pin-btn').count());
ok('no pins initially', (await page.evaluate(() => window.getPinnedFindings().length)) === 0);

// pin Flexion and enter active 85 on the first side block
const rom = page.locator('#rom-rows .obj-row').first();
await rom.locator('.deg-input').first().fill('85');
await rom.locator('.pin-btn').click();
let pins = await page.evaluate(() => window.getPinnedFindings());
ok('pin recorded with stable id', pins.length === 1 && pins[0].id === 'rom:knee:flexion', pins);
const side = pins[0] && Object.keys(pins[0].baseline)[0];
ok('baseline snapshot has active 85', pins[0] && pins[0].baseline[side] && pins[0].baseline[side].active === 85, pins[0]);
ok('summary shows 1 pinned', /1 pinned/.test(await page.textContent('#pin-summary')));
ok('localStorage bridge written', (await page.evaluate(() => JSON.parse(localStorage.getItem('cn.pins') || '[]').length)) === 1);

// value change after pinning updates the snapshot
await rom.locator('.deg-input').first().fill('92');
pins = await page.evaluate(() => window.getPinnedFindings());
ok('snapshot follows later edits', pins[0].baseline[side].active === 92, pins[0]);

// unpin
await rom.locator('.pin-btn').click();
ok('unpin works', (await page.evaluate(() => window.getPinnedFindings().length)) === 0);

// remove a pinned row drops the pin
await rom.locator('.pin-btn').click();
await rom.locator('.remove-x').click();
ok('removing a pinned row drops the pin', (await page.evaluate(() => window.getPinnedFindings().length)) === 0);

// region change keeps the pin id tied to its row's region at read time (rows survive region change)
await page.evaluate(() => window.leanSuggest.add('mmt', 'Hamstrings'));
await page.locator('#mmt-rows .obj-row').nth(1).locator('.pin-btn').click();
ok('mmt pin id', (await page.evaluate(() => window.getPinnedFindings().map(f => f.id))).includes('mmt:knee:hamstrings'));

// cap at 6
await page.evaluate(() => { ['Flexion', 'Extension'].forEach(n => window.leanSuggest.add('rom', n)); ['Quadriceps'].forEach(n => window.leanSuggest.add('mmt', n)); });
await page.click('#region-chips [data-chip="Hip"]');
await page.evaluate(() => ['Flexion','Extension','Abduction','Adduction','Internal rotation','External rotation'].forEach(n => window.leanSuggest.add('rom', n)));
const btns = page.locator('#rom-rows .obj-row .pin-btn');
const nBtn = await btns.count();
for (let i = 0; i < nBtn; i++) await btns.nth(i).click();
const total = await page.evaluate(() => window.getPinnedFindings().length);
ok('cap holds at 6', total === 6, total);
ok('cap message shown', /Max 6/.test(await page.textContent('#pin-summary')), await page.textContent('#pin-summary'));

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]).length;
console.log(failed ? failed + ' FAILED' : 'ALL PASS');
process.exit(failed ? 1 : 0);
