// Comprehensive wiring verification test:
// 1. Core Assessment complaints auto-fill Segment Assessment and Mo/Ve table, but NEVER auto-fill PV table.
// 2. Core Assessment history auto-fills FM History table.
// 3. Card 3 PV segment picker adds rows directly to PV table with individual row dates (no session banners).
// 4. PV rows can be deleted using .del-pv-seg-btn.
// Run: node tests/fm-wiring-test.mjs

import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const cnUrl = 'file://' + path.join(dir, '..', 'clinical-note.html');

const results = [];
const ok = (n, c, x) => {
    results.push([n, !!c]);
    console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x)));
};

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
const errors = [];
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message));

await page.goto(cnUrl);

// Step 1: In Core Assessment, select Primary Complaint: Knee, Right, 2–6 wks, Squat
await page.click('#region-chips [data-chip="Knee"]');
await page.click('#laterality [data-val="Right"]');
await page.click('#onset-timeline-chips [data-chip="1-4 weeks"]');
await page.click('#primary-complaint [data-chip="Pain"]');
await page.waitForTimeout(200);

// Select aggravating movement 'Squat' if present
const squatChip = page.locator('#aggravating-chips .chip', { hasText: 'Squat' });
if (await squatChip.count() > 0) {
    await squatChip.first().click();
}
await page.waitForTimeout(200);

// Open Fascial Manipulation module
await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
await page.waitForTimeout(300);

// Verify Segment Assessment received Knee (GE)
const segRows = await page.locator('#fm-seg-table tbody tr').count();
const segName = await page.inputValue('#fm-seg-table tbody tr .seg-name');
const segSide = await page.inputValue('#fm-seg-table tbody tr .seg-side');
ok('Chief Complaint routes to Segment Assessment table as GE', segRows === 1 && segName === 'GE', { segRows, segName });
ok('Chief Complaint routes side as rt', segSide === 'rt', segSide);

// CRITICAL CHECK: Verify PV table is NOT auto-filled from complaints!
const pvRowsFromComplaint = await page.locator('#fm-pv-table tbody tr').count();
ok('PV table is NOT auto-filled from complaints section (0 rows)', pvRowsFromComplaint === 0, pvRowsFromComplaint);

// Verify Mo/Ve table received GE · R
const moveRows = await page.locator('#fm-move-table tbody tr').count();
const moveSeg = await page.getAttribute('#fm-move-table tbody tr', 'data-seg');
const moveSide = await page.getAttribute('#fm-move-table tbody tr', 'data-side');
ok('Mo/Ve table receives movement verification row GE R', moveRows >= 1 && moveSeg === 'GE' && moveSide === 'rt', { moveRows, moveSeg, moveSide });

// Switch to Core tab to add secondary complaints and medical history
await page.click('#tab-btn-core');
await page.waitForTimeout(150);

// Step 2: Show Secondary Complaints & Past History cards
await page.evaluate(() => {
    document.querySelectorAll('#card-secondary, #card-past').forEach(el => el.classList.add('lean-shown'));
});
await page.waitForTimeout(100);

await page.click('#add-secondary');
await page.waitForTimeout(200);

const secCard = page.locator('#secondary-rows .repeatable-card').first();
await secCard.locator('.sec-region-chips [data-chip="Ankle / Foot"]').click();
await secCard.locator('button[data-val="Left"]').click();
await page.waitForTimeout(300);

// Verify Segment Assessment received TA
const segRows2 = await page.locator('#fm-seg-table tbody tr').count();
ok('Secondary Complaint routes to Segment Assessment table (2 rows)', segRows2 === 2, segRows2);

// CRITICAL CHECK: Verify PV table STILL has 0 rows!
const pvRowsAfterSec = await page.locator('#fm-pv-table tbody tr').count();
ok('PV table still has 0 rows after secondary complaint', pvRowsAfterSec === 0, pvRowsAfterSec);

// Step 3: Add Surgery in Core Assessment History
await page.evaluate(() => {
    document.getElementById('sec-history')?.classList.remove('sec-lean-collapsed');
    if (window.Lean && window.Lean.reveal) window.Lean.reveal('h-past');
    document.getElementById('card-past')?.classList.add('lean-shown');
});
await page.waitForTimeout(200);

await page.click('#add-surgical-row');
await page.waitForTimeout(150);

const surgRow = page.locator('#surgical-history-rows > div').first();
await surgRow.locator('input[type="date"]').fill('2023-05-10');
await surgRow.locator('select').first().selectOption('Knee');
await surgRow.locator('input[type="text"]').fill('Meniscectomy');
await surgRow.locator('select').nth(1).selectOption('Partial');
await surgRow.locator('select').nth(1).dispatchEvent('change');
await page.waitForTimeout(400);

// Verify FM History Table received Surgery
const histRows = page.locator('#fm-hist-table tbody tr');
const histCount = await histRows.count();
ok('Surgery history routes to FM History table', histCount >= 1, histCount);

const firstHistType = await histRows.first().locator('.hist-type').inputValue();
const firstHistSeg = await histRows.first().locator('.hist-seg').inputValue();
const firstHistDate = await histRows.first().locator('.hist-date').inputValue();
const firstHistDiag = await histRows.first().locator('.hist-diag').inputValue();
ok('FM History entry correctly formatted (Surgery, GE, May 2023, Meniscectomy)', 
    firstHistType === 'Surgery' && firstHistSeg === 'GE' && firstHistDate === 'May 2023' && firstHistDiag === 'Meniscectomy',
    { firstHistType, firstHistSeg, firstHistDate, firstHistDiag });

// Step 4: Add Trauma in Core Assessment History
await page.evaluate(() => document.getElementById('add-trauma-row').click());
await page.waitForTimeout(200);

const traumaRow = page.locator('#trauma-history-rows > div').first();
await traumaRow.locator('input[type="date"]').fill('2022-11-04');
await traumaRow.locator('select').first().selectOption('Ankle');
await traumaRow.locator('select').nth(1).selectOption('Left');
await traumaRow.locator('input[type="text"]').fill('Inversion sprain');
await traumaRow.locator('select').nth(2).selectOption('Full');
await traumaRow.locator('select').nth(2).dispatchEvent('change');
await page.waitForTimeout(400);

const histCount2 = await page.locator('#fm-hist-table tbody tr').count();
ok('Trauma history routes to FM History table (now 2 rows)', histCount2 >= 2, histCount2);

// Switch back to FM tab to interact with Card 3 PV grid
await page.click('#tab-btn-fm');
await page.waitForTimeout(150);

// Step 5: Therapist independently adds segments to PV table via Card 3 PV Grid Picker
// Add Hip (CX) from Lower limb
await page.click('#pv-add-region-tabs button[data-region="Lower limb"]');
await page.waitForTimeout(200);
await page.click('#pv-region-chips .pv-seg-chip[data-seg="CX"]');
await page.waitForTimeout(200);

// Add Lumbar (LU) from Trunk
await page.click('#pv-add-region-tabs button[data-region="Trunk"]');
await page.waitForTimeout(200);
await page.click('#pv-region-chips .pv-seg-chip[data-seg="LU"]');
await page.waitForTimeout(200);

const pvRowsAfterPicker = await page.locator('#fm-pv-table tbody tr').count();
ok('Card 3 PV picker adds 2 independent rows to PV table', pvRowsAfterPicker === 2, pvRowsAfterPicker);

// Step 5b: Verify Option B grouped date cells (rowspan=2 for Today's 2 rows)
const bannerRows = await page.locator('#fm-pv-table tbody tr.pv-session-banner-row').count();
ok('No session banner rows exist in PV table', bannerRows === 0, bannerRows);

const row1DateSpan = await page.locator('#fm-pv-table tbody tr:nth-child(1) td.pv-date-col').getAttribute('rowspan');
const row1DateText = await page.locator('#fm-pv-table tbody tr:nth-child(1) td.pv-date-col .pv-date-val').textContent();
const row1Seg = await page.inputValue('#fm-pv-table tbody tr:nth-child(1) td.pv-seg-col input');
const row2Seg = await page.inputValue('#fm-pv-table tbody tr:nth-child(2) td.pv-seg-col input');
const row2HasDate = await page.locator('#fm-pv-table tbody tr:nth-child(2) td.pv-date-col').count();

ok('Option B: Row 1 has grouped date cell with rowspan=2', row1DateSpan === '2' && !!row1DateText, { row1DateSpan, row1DateText });
ok('Option B: Row 1 has segment CX and Row 2 has segment LU', row1Seg === 'CX' && row2Seg === 'LU', { row1Seg, row2Seg });
ok('Option B: Row 2 has no separate date cell (spanned by Row 1)', row2HasDate === 0, row2HasDate);

// Step 6: Test Inverted Timeline & Multi-Visit Dropdown Filter with Prior Visit
await page.evaluate(() => window.addFmSegment('14/09/23', 'GE'));
await page.waitForTimeout(200);

const rowsWithPrior = await page.locator('#fm-pv-table tbody tr').count();
ok('Adding prior visit appends below today rows (total 3 rows)', rowsWithPrior === 3, rowsWithPrior);

// Today's rows must still be at top (inverted timeline)
const topSeg = await page.inputValue('#fm-pv-table tbody tr:nth-child(1) td.pv-seg-col input');
ok('Inverted timeline: Today row CX remains at top', topSeg === 'CX', topSeg);

const priorRowSep = await page.locator('#fm-pv-table tbody tr:nth-child(3)').getAttribute('class');
ok('Prior visit row has session-sep divider class', (priorRowSep || '').includes('session-sep'), priorRowSep);

const dropdownVisible = await page.locator('#pv-prior-visit-select').isVisible();
const dropdownText = await page.locator('#pv-prior-visit-select').textContent();
ok('Prior visit dropdown is visible with 14/09/23 option', dropdownVisible && dropdownText.includes('14/09/23 · Prior'), { dropdownVisible, dropdownText });

// Test Visit Filter: Today only
await page.click('#pv-visit-toggle button[data-pv-visit="today"]');
await page.waitForTimeout(200);
const visibleInToday = await page.locator('#fm-pv-table tbody tr:visible').count();
ok('Filter "Today" shows only today 2 rows', visibleInToday === 2, visibleInToday);

// Test Visit Filter: Prior visit dropdown
await page.selectOption('#pv-prior-visit-select', '14/09/23');
await page.waitForTimeout(200);
const visibleInPrior = await page.locator('#fm-pv-table tbody tr:visible').count();
ok('Dropdown selection "14/09/23" shows only prior visit 1 row', visibleInPrior === 1, visibleInPrior);

// Test Visit Filter: All
await page.click('#pv-visit-toggle button[data-pv-visit="all"]');
await page.waitForTimeout(200);
const visibleInAll = await page.locator('#fm-pv-table tbody tr:visible').count();
ok('Filter "All" restores all 3 rows', visibleInAll === 3, visibleInAll);

// Step 7: Test PV row deletion and dynamic rowspan recalculation
const delBtn = page.locator('#fm-pv-table tbody tr:nth-child(2) .del-pv-seg-btn');
await delBtn.click({ force: true });
await page.waitForTimeout(200);

const pvRowsAfterDelete = await page.locator('#fm-pv-table tbody tr').count();
ok('Clicking delete on PV row removes that row (2 rows remain)', pvRowsAfterDelete === 2, pvRowsAfterDelete);

const row1DateSpanAfterDel = await page.locator('#fm-pv-table tbody tr:nth-child(1) td.pv-date-col').getAttribute('rowspan');
ok('Option B: Row 1 date cell dynamically reduces rowspan to 1', row1DateSpanAfterDel === '1', row1DateSpanAfterDel);

// Step 8: Verify getFmData exports match UI state
const fmData = await page.evaluate(() => window.getFmData());
ok('getFmData().segments has 2 segments', fmData.segments.length === 2, fmData.segments.length);
ok('getFmData().history has 2 history events', fmData.history.length >= 2, fmData.history.length);

ok('no page errors throughout operations', errors.length === 0, errors);

await browser.close();
const failed = results.filter(r => !r[1]).length;
console.log(failed ? failed + ' FAILED' : 'ALL PASS');
process.exit(failed ? 1 : 0);
