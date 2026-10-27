// FM Review 2 test suite: verifies Tasks 1 through 5
// Run with: node tests/fm-review2.mjs
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

try {
    // -------------------------------------------------------------
    // TEST 1: Task 1 - Prior-visit rows read-only & mock gating
    // -------------------------------------------------------------
    const ctxDesktop = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const page1 = await ctxDesktop.newPage();
    await page1.goto(cnUrl);
    await page1.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
    await page1.waitForTimeout(400);

    const defaultRowCount = await page1.locator('#fm-pv-table tbody tr').count();
    ok('Task 1: Default load has 0 rows in PV table', defaultRowCount === 0, defaultRowCount);

    // Add a prior-visit row
    await page1.evaluate(() => {
        window.addFmSegment('14/09/23', 'GE');
    });
    await page1.waitForTimeout(100);

    const priorRow = page1.locator('#fm-pv-table tbody tr.fm-prior-row').first();
    ok('Task 1: Prior visit row receives .fm-prior-row class', (await priorRow.count()) === 1);

    const priorCell = priorRow.locator('.pv-cell').first();
    const hasPriorClass = await priorCell.evaluate(el => el.classList.contains('pv-cell-prior'));
    ok('Task 1: Prior visit cells have .pv-cell-prior class', hasPriorClass);

    // Click prior cell -> picker must NOT open
    await priorCell.click({ force: true });
    await page1.waitForTimeout(150);
    const pickerVisible = await page1.locator('#pv-picker').isVisible();
    ok('Task 1: Prior visit cells are read-only (picker does not open)', !pickerVisible);

    const densSummary = await page1.textContent('#fm-density-summary');
    ok('Task 1: Prior visit rows excluded from density calculation', /Palpate and grade points|No palpation data entered yet/.test(densSummary), densSummary);

    // -------------------------------------------------------------
    // TEST 2: Task 2 - Suggestion in auto-derived diagonal box
    // -------------------------------------------------------------
    // Add 2 segments for today
    await page1.evaluate(() => {
        const today = new Date().toLocaleDateString('en-GB', {day:'2-digit', month:'2-digit', year:'2-digit'});
        window.addFmSegment(today, 'GE');
        window.addFmSegment(today, 'HU');
    });
    await page1.waitForTimeout(100);

    // Grade GE AL and HU AL to 2
    const grade = async (rowIdx, g) => {
        const c = page1.locator('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)').nth(rowIdx).locator('.pv-cell').first();
        await c.scrollIntoViewIfNeeded();
        await c.click();
        await page1.waitForTimeout(100);
        await page1.locator('#pv-picker button[data-grade="' + g + '"]').click();
        await page1.waitForTimeout(100);
    };
    await grade(0, '2');
    await grade(1, '2');

    const diagText = await page1.textContent('#fm-hyp-diag');
    ok('Task 2: Suggestion appears in auto-derived box', /Suggested:\s*AL diagonal \(R\)\s*—\s*tap to add/.test(diagText), diagText);

    const textareaLoc = page1.locator('#fm-hyp-diag').locator('xpath=ancestor::div[contains(@class, "card")]//textarea');
    ok('Task 2: Reasoning textarea stays blank when suggestion appears', (await textareaLoc.inputValue()) === '');

    // Tap suggestion
    await page1.locator('.fm-hyp-suggest').click();
    await page1.waitForTimeout(200);

    const diagAfterTap = await page1.textContent('#fm-hyp-diag');
    ok('Task 2: Tapping suggestion derives AL diagonal', diagAfterTap.includes('AL diagonal'), diagAfterTap);
    ok('Task 2: Reasoning textarea still blank after tap', (await textareaLoc.inputValue()) === '');
    const stepsCount = await page1.locator('#fm-seq-builder .seq-step').count();
    ok('Task 2: Sequence steps created in builder', stepsCount === 2, stepsCount);

    // -------------------------------------------------------------
    // TEST 3: Task 3 - Mo/Ve deduplication & state preservation
    // -------------------------------------------------------------
    // First segment (GE rt) row set VRS 5, movement 'Flexion'
    const segRow0 = page1.locator('#fm-seg-table tbody tr').nth(0);
    await segRow0.locator('.seg-vrs').fill('5');
    await segRow0.locator('.seg-vrs').dispatchEvent('input');
    await segRow0.locator('.seg-painful').fill('Flexion');
    await segRow0.locator('.seg-painful').dispatchEvent('input');
    await page1.waitForTimeout(100);

    // Mo/Ve row for GE · R
    const moVeGe = page1.locator('#fm-move-table tbody tr[data-key="GE_rt"]');
    ok('Task 3: Mo/Ve row GE · R exists', (await moVeGe.count()) === 1);
    ok('Task 3: Initial pre-VRS is 5', (await moVeGe.locator('.move-prevrs').textContent()) === '5');

    // Adjust post-VRS to 3
    await moVeGe.locator('.mv-b[data-dir="-1"]').click(); // 5 -> 4
    await moVeGe.locator('.mv-b[data-dir="-1"]').click(); // 4 -> 3
    await page1.waitForTimeout(100);
    ok('Task 3: Post-VRS adjusted to 3', (await moVeGe.locator('.mv-val').textContent()) === '3');
    const delta1 = await moVeGe.locator('.move-delta').textContent();
    const dataDelta1 = await moVeGe.locator('.move-delta').getAttribute('data-delta');
    ok('Task 3: Outcome formatted on pain scale (↓ 2 pts) with data-delta -2', delta1.includes('2 pts') && dataDelta1 === '-2', { delta1, dataDelta1 });

    // Add duplicate GE rt row with VRS 8, movement 'Squat'
    await page1.evaluate(() => {
        const today = new Date().toLocaleDateString('en-GB', {day:'2-digit', month:'2-digit', year:'2-digit'});
        window.addFmSegment(today, 'GE');
    });
    await page1.waitForTimeout(100);

    const segRow2 = page1.locator('#fm-seg-table tbody tr').nth(2);
    await segRow2.locator('.seg-vrs').fill('8');
    await segRow2.locator('.seg-vrs').dispatchEvent('input');
    await segRow2.locator('.seg-painful').fill('Squat');
    await segRow2.locator('.seg-painful').dispatchEvent('input');
    await page1.waitForTimeout(100);

    const geRows = await page1.locator('#fm-move-table tbody tr[data-key="GE_rt"]').count();
    ok('Task 3: Duplicate GE R merged into single Mo/Ve row', geRows === 1, geRows);

    const preVrsDedupe = await moVeGe.locator('.move-prevrs').textContent();
    ok('Task 3: Pre-VRS is highest among duplicates (8)', preVrsDedupe === '8', preVrsDedupe);

    const postVrsPreserved = await moVeGe.locator('.mv-val').textContent();
    ok('Task 3: Post-VRS preserved across sync (3)', postVrsPreserved === '3', postVrsPreserved);

    const deltaRecomputed = await moVeGe.locator('.move-delta').textContent();
    const dataDelta2 = await moVeGe.locator('.move-delta').getAttribute('data-delta');
    ok('Task 3: Delta recomputed on pain scale (↓ 5 pts) with data-delta -5', deltaRecomputed.includes('5 pts') && dataDelta2 === '-5', { deltaRecomputed, dataDelta2 });

    const moVeData = await page1.evaluate(() => window.getFmData().moVe);
    const geKeys = moVeData.filter(m => m.key === 'GE_rt');
    ok('Task 3: getFmData().moVe has no duplicate keys', geKeys.length === 1, geKeys);

    // Save 1024px screenshot
    await page1.screenshot({ path: path.join(dir, '..', 'screenshots', 'fm-review2-1024px.png'), fullPage: false });
    console.log('Saved 1024px screenshot to screenshots/fm-review2-1024px.png');

    // -------------------------------------------------------------
    // TEST 4: Task 4 - Phone layout table-to-cards (< 744px)
    // -------------------------------------------------------------
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page2 = await ctxMobile.newPage();
    await page2.goto(cnUrl);
    await page2.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
    await page2.waitForTimeout(400);

    await page2.evaluate(() => {
        const today = new Date().toLocaleDateString('en-GB', {day:'2-digit', month:'2-digit', year:'2-digit'});
        window.addFmSegment(today, 'GE');
    });
    await page2.waitForTimeout(100);

    const overflowCheck = await page2.evaluate(() => {
        const el = document.getElementById('fm-seg-wrap');
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
    });
    ok('Task 4: No horizontal scroll in segment area at 390px', overflowCheck.scrollWidth <= overflowCheck.clientWidth, overflowCheck);

    const sideOptionLabels = await page2.locator('#fm-seg-table .seg-side option').allTextContents();
    ok('Task 4: Side dropdown shows R/L/Bil labels', sideOptionLabels.slice(0, 3).join('/') === 'R/L/Bil', sideOptionLabels);

    // Edit field inside phone card
    const phoneCard = page2.locator('#fm-seg-table tbody tr').first();
    await phoneCard.locator('.seg-vrs').fill('6');
    await phoneCard.locator('.seg-vrs').dispatchEvent('input');
    await phoneCard.locator('.seg-painful').fill('Stairs');
    await phoneCard.locator('.seg-painful').dispatchEvent('input');
    await page2.waitForTimeout(100);

    const phoneSegs = await page2.evaluate(() => window.getFmData().segments);
    ok('Task 4: Editing phone card updates getFmData().segments', phoneSegs[0].vrs === 6 && phoneSegs[0].painfulMovements === 'Stairs', phoneSegs[0]);

    const phoneMoVePre = await page2.textContent('#fm-move-table .move-prevrs');
    ok('Task 4: Phone card edit updates Mo/Ve pre-VRS', phoneMoVePre.trim() === '6', phoneMoVePre);

    // Save 390px screenshot of the segment card area
    const segCardWrapper = page2.locator('#fm-seg-table').locator('xpath=ancestor::div[contains(@class, "card")]');
    await segCardWrapper.screenshot({ path: path.join(dir, '..', 'screenshots', 'fm-review2-390px.png') });
    console.log('Saved 390px screenshot to screenshots/fm-review2-390px.png');

    // -------------------------------------------------------------
    // TEST 5: Task 5 - Smart side view on module open
    // -------------------------------------------------------------
    const defaultSide = await page2.locator('#pv-side-toggle button.selected').getAttribute('data-pv-side');
    ok('Task 5: Default view starts on R (rt)', defaultSide === 'rt', defaultSide);

    // Grade a left cell
    await page2.evaluate(() => {
        const leftCell = document.querySelector('#fm-pv-table tbody tr:not(.fm-prior-row) .pv-cell[data-side="lt"]');
        leftCell.setAttribute('data-grade', '2');
    });

    // Reopen module state
    await page2.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
    await page2.waitForTimeout(100);

    const smartSide = await page2.locator('#pv-side-toggle button.selected').getAttribute('data-pv-side');
    ok('Task 5: With left-side findings, module initializes toggle on Both (all)', smartSide === 'all', smartSide);

    const containerAttr = await page2.locator('.pv-container').getAttribute('data-side-view');
    ok('Task 5: Both sides visible in container (data-side-view removed)', containerAttr === null, containerAttr);

} finally {
    await browser.close();
}

const failed = results.filter(r => !r[1]).length;
console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exit(failed ? 1 : 0);
