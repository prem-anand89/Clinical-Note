// Card 4 sequence pills: one-tap treated (written to the Card 3 cell) and Earlier / Later ordering.
// Run: node tests/fm-seq-treat.mjs
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const results = []; const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const errors = [];
async function fresh(segs, width = 1280) {
  const page = await (await browser.newContext({ viewport: { width, height: 1000 } })).newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.dismiss());
  await page.goto('file://' + path.join(dir, '..', 'clinical-note.html'));
  await page.waitForTimeout(200);
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
  await page.waitForTimeout(300);
  await page.evaluate(s => s.forEach(c => window.addFmSegment('today', c, true, true)), segs);
  await page.waitForTimeout(300);
  return page;
}
async function grade(page, seg, plane, side, g) {
  const idx = await page.evaluate(s => Array.from(document.querySelectorAll('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)')).findIndex(tr => (tr.querySelector('.pv-seg-name') || {}).value === s), seg);
  const cell = page.locator('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)').nth(idx).locator(`.pv-cell[data-plane="${plane}"][data-side="${side}"]`);
  await cell.scrollIntoViewIfNeeded(); await cell.click(); await page.waitForTimeout(80);
  await page.locator(`#pv-picker button[data-grade="${g}"]`).click(); await page.waitForTimeout(80);
}
const cellState = (page, seg, plane, side) => page.evaluate(([s, p, d]) => { const c = window.__fmFindPvCell(p, s, d); return c ? { grade: c.getAttribute('data-grade'), treated: c.getAttribute('data-treated') } : null; }, [seg, plane, side]);
const order = page => page.evaluate(() => Array.from(document.querySelectorAll('#fm-seq-builder .seq-step')).map(st => st.dataset.segment));
const nums = page => page.evaluate(() => Array.from(document.querySelectorAll('#fm-seq-builder .seq-step .point-num')).map(n => n.textContent));
const pill = (page, i) => page.locator('#fm-seq-builder .seq-step').nth(i);
const count = page => page.textContent('#fm-seq-count').then(t => t.replace(/\s+/g, ' ').trim());
const addStep = async (page, plane, seg, side) => {
  await page.locator('#fm-add-seq-step').scrollIntoViewIfNeeded(); await page.click('#fm-add-seq-step');
  await page.selectOption('#fm-picker-plane', plane); await page.selectOption('#fm-picker-seg', seg); await page.selectOption('#fm-picker-side', side);
  await page.click('#fm-picker-save'); await page.waitForTimeout(200);
};

// ---- ✓ on a graded point: writes the cell, updates everything that follows the cell
{
  const page = await fresh(['CX', 'GE']);
  await grade(page, 'CX', 'RE-LA', 'rt', '3'); await grade(page, 'GE', 'RE-LA', 'rt', '2');
  await page.evaluate(() => window.addFmPatternToSequence('RE-LA|rt'));
  await page.waitForTimeout(250);
  const t0 = pill(page, 0).locator('.step-treat');
  ok('the ✓ is enabled on a graded point and starts off', await t0.isEnabled() && !(await t0.evaluate(b => b.classList.contains('on'))));
  ok('the count line starts as "2 points planned"', (await count(page)) === '2 points planned', await count(page));
  await t0.scrollIntoViewIfNeeded(); await t0.click(); await page.waitForTimeout(500);
  ok('tapping ✓ marks the Card 3 cell treated', (await cellState(page, 'CX', 'RE-LA', 'rt')).treated === 'true', await cellState(page, 'CX', 'RE-LA', 'rt'));
  ok('the pill shows the ✓ as on', await pill(page, 0).locator('.step-treat').evaluate(b => b.classList.contains('on') && b.getAttribute('aria-pressed') === 'true'));
  ok('the count line reads "2 points planned · 1 treated"', (await count(page)) === '2 points planned · 1 treated', await count(page));
  const card3 = await page.evaluate(() => document.getElementById('fm-density-summary').textContent.replace(/\s+/g, ' '));
  ok('Card 3 totals update live (1 treated)', /✓ 1 Treated/.test(card3), card3);
  ok('Card 5 palpatory re-check shows the point', await page.locator('#fm-recheck-container').isVisible() && await page.locator('#fm-recheck-table tbody tr .post-btn[data-pre-grade]').count() === 1);
  ok('the FM treatment chip is ticked in Intervention', await page.evaluate(() => document.querySelector('#manual-therapy-chips [data-chip="Fascial Manipulation (FM)"]').classList.contains('selected')));
  // un-treat
  await pill(page, 0).locator('.step-treat').click(); await page.waitForTimeout(500);
  ok('tapping ✓ again undoes it everywhere (cell, count, Card 5 hides the re-check)', (await cellState(page, 'CX', 'RE-LA', 'rt')).treated === 'false' && (await count(page)) === '2 points planned'
    && await page.locator('#fm-recheck-container').isHidden() && await page.locator('#fm-recheck-empty').isVisible(), [await cellState(page, 'CX', 'RE-LA', 'rt'), await count(page)]);
  ok('the auto-ticked FM chip clears when nothing is treated', !(await page.evaluate(() => document.querySelector('#manual-therapy-chips [data-chip="Fascial Manipulation (FM)"]').classList.contains('selected'))));
  // two-way: treat in Card 3 with the real picker, the pill follows
  const cell = page.locator('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)').nth(1).locator('.pv-cell[data-plane="RE-LA"][data-side="rt"]');
  await cell.scrollIntoViewIfNeeded(); await cell.click(); await page.waitForTimeout(100);
  await page.locator('#pv-picker [data-act="treated"]').click(); await page.waitForTimeout(400);
  ok('treating in Card 3 turns the matching pill\'s ✓ on', await pill(page, 1).locator('.step-treat').evaluate(b => b.classList.contains('on')), await count(page));
  await page.close();
}

// ---- ✓ is disabled where there is nothing honest to tick
{
  const page = await fresh(['CX', 'GE']);
  await grade(page, 'CX', 'RE-LA', 'rt', '3');
  await addStep(page, 'RE-LA', 'CX', 'rt');    // CX is graded
  await addStep(page, 'RE-LA', 'GE', 'rt');    // GE is in the grid but ungraded
  await addStep(page, 'RE-LA', 'PE', 'rt');    // PE is not in the grid at all
  await page.waitForTimeout(150);
  const info = await page.evaluate(() => Array.from(document.querySelectorAll('#fm-seq-builder .seq-step')).map(st => ({ seg: st.dataset.segment, disabled: st.querySelector('.step-treat').disabled, title: st.querySelector('.step-treat').title })));
  ok('the graded point\'s ✓ is enabled (CX)', info.find(i => i.seg === 'CX').disabled === false, info);
  ok('GE (in grid, ungraded): disabled, "Grade this point in Card 3 first"', info.find(i => i.seg === 'GE').disabled && /Grade this point/.test(info.find(i => i.seg === 'GE').title), info);
  ok('PE (not in grid): disabled, "add this segment to the grid first"', info.find(i => i.seg === 'PE').disabled && /grid/.test(info.find(i => i.seg === 'PE').title), info);
  await pill(page, 1).locator('.step-treat').click({ force: true }).catch(() => {});
  ok('tapping a disabled ✓ changes nothing and records no grade', (await cellState(page, 'GE', 'RE-LA', 'rt')).grade === '' && (await cellState(page, 'GE', 'RE-LA', 'rt')).treated !== 'true', await cellState(page, 'GE', 'RE-LA', 'rt'));
  // grading the cell enables the pill
  await grade(page, 'GE', 'RE-LA', 'rt', '2'); await page.waitForTimeout(250);
  ok('grading the cell later enables that pill\'s ✓', await page.evaluate(() => !Array.from(document.querySelectorAll('#fm-seq-builder .seq-step')).find(st => st.dataset.segment === 'GE').querySelector('.step-treat').disabled));
  await page.close();
}

// ---- Earlier / Later
{
  const page = await fresh(['CX', 'GE', 'TA']);
  await grade(page, 'CX', 'RE-LA', 'rt', '2'); await grade(page, 'GE', 'RE-LA', 'rt', '2'); await grade(page, 'TA', 'RE-LA', 'rt', '2');
  await page.evaluate(() => window.addFmPatternToSequence('RE-LA|rt'));
  await page.waitForTimeout(250);
  ok('the order starts CX, GE, TA', JSON.stringify(await order(page)) === '["CX","GE","TA"]', await order(page));
  // adding a point: no order controls
  await page.locator('#fm-add-seq-step').scrollIntoViewIfNeeded(); await page.click('#fm-add-seq-step');
  ok('the Add popup does not show the order buttons', await page.locator('#fm-picker-move').isHidden());
  await page.click('#fm-picker-cancel');
  // edit the last pill
  await pill(page, 2).locator('.point-seg').click(); await page.waitForTimeout(150);
  ok('the Edit popup shows Earlier / Later; Later is disabled on the last point', await page.locator('#fm-picker-move').isVisible() && await page.locator('#fm-picker-later').isDisabled() && await page.locator('#fm-picker-earlier').isEnabled());
  await page.click('#fm-picker-earlier'); await page.waitForTimeout(150);
  ok('Earlier moves TA before GE and renumbers', JSON.stringify(await order(page)) === '["CX","TA","GE"]' && JSON.stringify(await nums(page)) === '["1","2","3"]', [await order(page), await nums(page)]);
  ok('the popup stays open for the moved point', await page.locator('#fm-picker-move').isVisible());
  await page.click('#fm-picker-earlier'); await page.waitForTimeout(150);
  ok('a second Earlier moves TA to the front', JSON.stringify(await order(page)) === '["TA","CX","GE"]', await order(page));
  ok('Earlier is then disabled at the front', await page.locator('#fm-picker-earlier').isDisabled());
  await page.click('#fm-picker-later'); await page.waitForTimeout(150);
  ok('Later moves it back one place', JSON.stringify(await order(page)) === '["CX","TA","GE"]', await order(page));
  await page.click('#fm-picker-cancel');
  ok('the treated count and the hypothesis survive reordering', (await count(page)) === '3 points planned' && /RL diagonal/.test(await page.textContent('#fm-hyp-diag')), await count(page));
  await page.close();
}

// ---- a signed note cannot be changed through a pill
{
  const page = await fresh(['CX', 'GE']);
  await grade(page, 'CX', 'RE-LA', 'rt', '2'); await grade(page, 'GE', 'RE-LA', 'rt', '2');
  await page.evaluate(() => window.addFmPatternToSequence('RE-LA|rt'));
  await page.waitForTimeout(250);
  await page.evaluate(() => document.getElementById('tab-btn-core').click());
  await page.click('#lean-no-redflags');
  await page.evaluate(() => document.getElementById('sign-note-btn').click());
  await page.waitForTimeout(300);
  if (await page.locator('#sign-anyway').count()) await page.locator('#sign-anyway').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('tab-btn-fm').click());
  await page.waitForTimeout(200);
  const b = pill(page, 0).locator('.step-treat');
  await b.scrollIntoViewIfNeeded(); await b.click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(300);
  ok('tapping a pill ✓ on a signed note treats nothing', (await cellState(page, 'CX', 'RE-LA', 'rt')).treated !== 'true', await cellState(page, 'CX', 'RE-LA', 'rt'));
  await page.close();
}

// ---- phone width: five pills with the ✓ still fit
{
  const page = await fresh(['CX', 'GE', 'TA', 'LU', 'HU'], 390);
  for (const sg of ['CX', 'GE', 'TA', 'LU', 'HU']) await grade(page, sg, 'RE-LA', 'rt', '2');
  await page.evaluate(() => window.addFmPatternToSequence('RE-LA|rt'));
  await page.waitForTimeout(250);
  await page.locator('#fm-seq-builder').scrollIntoViewIfNeeded();
  const fit = await page.evaluate(() => ({ page: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    pills: Array.from(document.querySelectorAll('#fm-seq-builder .seq-step')).every(p => p.getBoundingClientRect().right <= window.innerWidth) }));
  ok('five pills with ✓ do not overflow the screen at 390 px', fit.page && fit.pills, fit);
  const size = await page.locator('#fm-seq-builder .step-treat').first().boundingBox();
  ok('the ✓ target is at least 22 px', size.width >= 22 && size.height >= 22, size);
  await page.close();
}

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
