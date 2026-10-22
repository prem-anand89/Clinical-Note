// Pins -> session note. Run: node tests/session-pins.mjs
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const cn = 'file://' + path.join(dir, '..', 'clinical-note.html');
const sn = 'file://' + path.join(dir, '..', 'session-note.html');

const results = []; const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const errors = [];

// Scenario A: pinned measures marked, memo shown in header
const a = await ctx.newPage(); a.on('pageerror', e => errors.push(e.message));
await a.goto(sn);
ok('A: header shows last focus', /Last focus:/.test(await a.textContent('#focus')) && /Progress knee flexion/.test(await a.textContent('#focus')));
const starsA = await a.locator('#measures .m .pin').count();
ok('A: 2 pinned measures starred (knee flexion + extension)', starsA === 2, starsA);
ok('A: measures count unchanged at 7', (await a.locator('#measures .m').count()) === 7, await a.locator('#measures .m').count());

// Scenario B: no history, pack + pins; no memo
await a.selectOption('#scenario', 'thr');
ok('B: no last-focus line on a first visit', (await a.locator('#focus').isHidden()));
ok('B: hip flexion + abductors starred', (await a.locator('#measures .m .pin').count()) === 2);
const pay = JSON.parse(await a.textContent('#payload'));
await a.locator('#measures .m').first().locator('.step .b').last().click();
const pay2 = JSON.parse(await a.textContent('#payload'));
const m = pay2.measures.find(x => x.id === 'hip_flex');
ok('B: payload carries findingId for pinned measure', m && m.findingId === 'rom:hip:flexion', pay2.measures);

// Scenario D: live bridge from the assessment page in the same browser context
const c = await ctx.newPage(); c.on('pageerror', e => errors.push(e.message));
await c.goto(cn);
await c.click('#region-chips [data-chip="Shoulder"]');
await c.evaluate(() => { window.leanSuggest.add('rom', 'Abduction'); window.leanSuggest.add('mmt', 'Flexors'); });
await c.locator('#rom-rows .obj-row').first().locator('.deg-input').first().fill('110');
await c.locator('#rom-rows .obj-row').first().locator('.pin-btn').click();
await c.locator('#mmt-rows .obj-row').first().locator('.pin-btn').click();
await a.reload(); await a.selectOption('#scenario', 'live');
const labels = await a.locator('#measures .m .name').allTextContents();
ok('D: unmapped ROM pin becomes a measure', labels.some(t => /Shoulder abduction \(AROM\)/.test(t)), labels);
ok('D: MMT pin becomes a chips measure', labels.some(t => /Flexors \(MMT\)/.test(t)), labels);
const trend = await a.locator('#measures .m .trend').first().textContent();
ok('D: baseline from assessment shown', /baseline 110°/.test(trend), trend);
const pd = JSON.parse(await a.textContent('#payload'));
await a.locator('#measures .m').first().locator('.step .b').last().click();
const pd2 = JSON.parse(await a.textContent('#payload'));
ok('D: payload uses finding id + label', pd2.measures.some(x => x.id === 'rom:shoulder:abduction' && x.label && x.findingId === 'rom:shoulder:abduction'), pd2.measures);

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]).length;
console.log(failed ? failed + ' FAILED' : 'ALL PASS');
process.exit(failed ? 1 : 0);
