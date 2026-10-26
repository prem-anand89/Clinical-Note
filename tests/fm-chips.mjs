// FM point chips in the session note. Run: node tests/fm-chips.mjs
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const cn = 'file://' + path.join(dir, '..', 'clinical-note.html'), sn = 'file://' + path.join(dir, '..', 'session-note.html');
const results = []; const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
const errors = [];
const a = await ctx.newPage(); a.on('pageerror', e => errors.push(e.message));
await a.goto(sn);
const pay = async () => JSON.parse(await a.textContent('#payload'));
ok('non-FM scenario shows no FM section', await a.locator('#fm-wrap').isHidden());
await a.selectOption('#scenario', 'fm');
const chips = await a.locator('#fm-chips .chip').allTextContents();
ok('mock FM chips from assessment', chips.join('|') === 'GE-An (R)|TA-La (R)|CX-Re (R)', chips);
await a.locator('#fm-chips .chip', { hasText: 'GE-An' }).click();
ok('tap marks treated with a tick', /✓/.test(await a.locator('#fm-chips .chip').first().textContent()));
let p = await pay();
ok('payload lists treated points only', p.fmTreated.length === 1 && p.fmTreated[0].segment === 'GE' && p.fmTreated[0].plane === 'An', p.fmTreated);
await a.locator('#fm-chips .chip', { hasText: 'GE-An' }).click();
ok('untap removes it', (await pay()).fmTreated.length === 0);

// live bridge: grade a real PV cell in the assessment, then read it in the session note
const c = await ctx.newPage(); c.on('pageerror', e => errors.push(e.message));
await c.goto(cn);
await c.click('#region-chips [data-chip="Knee"]');
await c.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
await c.waitForTimeout(400);

// Verify decoupling: complaints autofill segment assessment, but NOT PV table
const segCount = await c.locator('#fm-seg-table tbody tr').count();
const pvCountBefore = await c.locator('#fm-pv-table tbody tr').count();
ok('complaints autofill segment assessment but not PV table', segCount >= 1 && pvCountBefore === 0, { segCount, pvCountBefore });

// Add segment directly to PV grid using Card 3 toolbar
await c.click('#pv-add-region-tabs button[data-region="Lower limb"]');
await c.waitForTimeout(200);
await c.click('#pv-region-chips .pv-seg-chip[data-seg="GE"]');
await c.waitForTimeout(300);

const cc = c.locator('#fm-pv-table .pv-cell').first(); await cc.scrollIntoViewIfNeeded(); await cc.click();
await c.locator('button.g2:visible').first().click();
await c.waitForTimeout(400);
const stored = await c.evaluate(() => JSON.parse(localStorage.getItem('cn.fm') || '[]'));
ok('assessment mirrors graded points', stored.length === 1 && stored[0].grade, stored);
await a.reload(); await a.selectOption('#scenario', 'live');
const live = await a.locator('#fm-chips .chip').allTextContents();
ok('live scenario shows that point as a chip', live.length === 1, live);
ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]).length;
console.log(failed ? failed + ' FAILED' : 'ALL PASS'); process.exit(failed ? 1 : 0);
