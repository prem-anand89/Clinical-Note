// FM density fixes. Run: node tests/fm-density.mjs
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const results = []; const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('file://' + path.join(dir, '..', 'clinical-note.html'));
await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
await page.waitForTimeout(400);
const grade = async (row, g, side) => {
  const c = page.locator('#fm-pv-table tbody tr').nth(row).locator('.pv-cell' + (side ? '[data-side="' + side + '"]' : '')).first();
  await c.scrollIntoViewIfNeeded(); await c.click(); await page.waitForTimeout(100);
  await page.locator('#pv-picker button[data-grade="' + g + '"]').click();
};
const dens = async () => (await page.textContent('#fm-density-summary')).replace(/\s+/g, ' ');

// rows 0,1 = GE, HU (prototype mock rows). Same plane, two different segments -> a pattern
await grade(0, '2'); await grade(1, '2');
let d = await dens();
ok('two different segments on one plane form a pattern', /AL diagonal/.test(d) && /2 segments/.test(d), d);
ok('side shown as R, no double brackets', /GE R/.test(d) && !/\(\(/.test(d), d);

// the same segment graded twice is not a pattern
await page.locator('#fm-pv-table tbody tr').nth(1).locator('.pv-cell').first().click();
await page.locator('#pv-picker button[data-act="clear"]').click();
await page.locator('#fm-region-tabs [data-region="Lower limb"]').click();
await page.locator('#fm-region-chips .chip', { hasText: 'GE' }).first().click();
await page.waitForTimeout(150);
await grade(2, '2');
d = await dens();
ok('same segment on two rows is not counted as two segments', /No clear diagonal/.test(d), d);

// left-side finding is signalled on the L chip while the R view is shown
await page.click('#pv-side-toggle [data-pv-side="all"]');
await grade(0, '3', 'lt');
await page.click('#pv-side-toggle [data-pv-side="rt"]');
ok('L chip shows a count for the hidden side', /L · 1/.test(await page.textContent('#pv-side-toggle [data-pv-side="lt"]')), await page.textContent('#pv-side-toggle [data-pv-side="lt"]'));
ok('R chip shows its own count', /R · 2/.test(await page.textContent('#pv-side-toggle [data-pv-side="rt"]')), await page.textContent('#pv-side-toggle [data-pv-side="rt"]'));
ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]).length;
console.log(failed ? failed + ' FAILED' : 'ALL PASS'); process.exit(failed ? 1 : 0);
