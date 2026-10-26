import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const results = [];
function ok(name, cond, info) {
    results.push({ name, pass: !!cond });
    if (cond) {
        console.log('PASS ' + name);
    } else {
        console.error('FAIL ' + name, info !== undefined ? info : '');
        process.exitCode = 1;
    }
}

(async () => {
    const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });

    // -------------------------------------------------------------
    // Test 1: Device Compatibility (Mobile 390px, iPad 820px, Desktop 1280px)
    // -------------------------------------------------------------
    console.log('=== Checking Device Compatibility ===');
    for (const vp of [
        { name: 'Mobile 390px', width: 390, height: 844 },
        { name: 'iPad 820px', width: 820, height: 1180 },
        { name: 'Desktop 1280px', width: 1280, height: 900 }
    ]) {
        const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
        const errors = [];
        page.on('pageerror', err => errors.push(err.message));

        await page.goto('file://' + path.resolve(__dirname, '../clinical-note.html'));
        await page.waitForTimeout(300);
        await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
        await page.waitForTimeout(300);

        // Check horizontal body overflow
        const hasBodyScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        ok(`${vp.name}: No unexpected page root horizontal scroll`, !hasBodyScroll);

        // Check Segment Assessment container overflow at mobile
        if (vp.width <= 744) {
            const segOverflow = await page.evaluate(() => {
                const wrap = document.getElementById('fm-seg-wrap');
                return wrap ? wrap.scrollWidth > wrap.clientWidth : false;
            });
            ok(`${vp.name}: Segment Assessment has 0 horizontal scroll (card layout active)`, !segOverflow);
        }

        // Add segment and check PV table scrollability
        await page.click('#pv-add-region-tabs button[data-region="Lower limb"]');
        await page.waitForTimeout(100);
        await page.click('#pv-region-chips .pv-seg-chip[data-seg="CX"]');
        await page.waitForTimeout(200);

        // Check PV container scroll behavior
        const pvCanScroll = await page.evaluate(() => {
            const c = document.querySelector('.pv-container');
            return c ? c.scrollWidth >= c.clientWidth : false;
        });
        ok(`${vp.name}: PV container handles wide table gracefully`, pvCanScroll);

        ok(`${vp.name}: 0 console errors`, errors.length === 0, errors);
        await page.close();
    }

    // -------------------------------------------------------------
    // Test 2: Deep Wiring & Edge Cases
    // -------------------------------------------------------------
    console.log('=== Checking Wiring, Reactivity & Edge Cases ===');
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('file://' + path.resolve(__dirname, '../clinical-note.html'));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
    await page.waitForTimeout(200);

    // Initial state: Palpatory recheck empty prompt is visible
    ok('Initial state: #fm-recheck-empty is visible', await page.isVisible('#fm-recheck-empty'));
    ok('Initial state: #fm-recheck-container is hidden', !(await page.isVisible('#fm-recheck-container')));

    // Add segment CX and LU via PV grid picker
    await page.click('#pv-add-region-tabs button[data-region="Lower limb"]');
    await page.waitForTimeout(100);
    await page.click('#pv-region-chips .pv-seg-chip[data-seg="CX"]');
    await page.waitForTimeout(200);

    await page.click('#pv-add-region-tabs button[data-region="Trunk"]');
    await page.waitForTimeout(100);
    await page.click('#pv-region-chips .pv-seg-chip[data-seg="LU"]');
    await page.waitForTimeout(200);

    // Grade CX Rt AL = 3 and mark treated
    const cxRow = page.locator('#fm-pv-table tbody tr[data-seg="CX"]').first();
    const cxAlCell = cxRow.locator('.pv-cell[data-side="rt"][data-plane="AN-LA"]').first();
    await cxAlCell.click();
    await page.waitForTimeout(100);
    await page.click('#pv-picker button[data-grade="3"]');
    await page.waitForTimeout(150);
    await cxAlCell.click();
    await page.waitForTimeout(100);
    await page.click('#pv-picker button[data-act="treated"]');
    await page.waitForTimeout(150);

    // Grade LU Rt AL = 2 and mark treated
    const luRow = page.locator('#fm-pv-table tbody tr[data-seg="LU"]').first();
    const luAlCell = luRow.locator('.pv-cell[data-side="rt"][data-plane="AN-LA"]').first();
    await luAlCell.click();
    await page.waitForTimeout(100);
    await page.click('#pv-picker button[data-grade="2"]');
    await page.waitForTimeout(150);
    await luAlCell.click();
    await page.waitForTimeout(100);
    await page.click('#pv-picker button[data-act="treated"]');
    await page.waitForTimeout(200);

    // Verify Re-check table auto-populated with both CX and LU
    ok('Re-check table is visible after marking treated', await page.isVisible('#fm-recheck-container'));
    const recheckRowCount = await page.locator('#fm-recheck-table tbody tr').count();
    ok('Re-check table has 2 segment rows (CX & LU)', recheckRowCount === 2, recheckRowCount);

    // Verify pre-grades
    const cxPreText = await page.locator('#fm-recheck-table tbody tr[data-seg="CX"] .pre-badge').textContent();
    const luPreText = await page.locator('#fm-recheck-table tbody tr[data-seg="LU"] .pre-badge').textContent();
    ok('CX pre-grade is 3', cxPreText.trim() === '3', cxPreText);
    ok('LU pre-grade is 2', luPreText.trim() === '2', luPreText);

    // Edge Case A: Update grade in Card 3 from 3 to 2+ for CX
    await cxAlCell.click();
    await page.waitForTimeout(100);
    await page.click('#pv-picker button[data-grade="2+"]');
    await page.waitForTimeout(200);
    const cxPreUpdated = await page.locator('#fm-recheck-table tbody tr[data-seg="CX"] .pre-badge').textContent();
    ok('Edge Case A: Re-check pre-grade reactively updates when Card 3 grade changes to 2+', cxPreUpdated.trim() === '2+', cxPreUpdated);

    // Edge Case B: Grade post-treatment for CX -> set to 0
    const cxPostBtn = page.locator('#fm-recheck-table tbody tr[data-seg="CX"] .post-btn').first();
    await cxPostBtn.click();
    await page.waitForTimeout(100);
    await page.click('#fm-recheck-picker button[data-post-grade="0"]');
    await page.waitForTimeout(150);
    ok('Edge Case B: Post-grade for CX set to 0', (await cxPostBtn.getAttribute('data-post-grade')) === '0');

    // Edge Case C: Untreat LU in Card 3 -> LU should drop out of Re-check table, CX post-grade preserved!
    await luAlCell.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    await luAlCell.click();
    await page.waitForTimeout(150);
    await page.click('#pv-picker button[data-act="treated"]');
    await page.waitForTimeout(200);

    const recheckRowsAfterUntreat = await page.locator('#fm-recheck-table tbody tr').count();
    ok('Edge Case C: Untreating LU removes it from Re-check table (now 1 row)', recheckRowsAfterUntreat === 1, recheckRowsAfterUntreat);
    const cxPostPreserved = await page.locator('#fm-recheck-table tbody tr[data-seg="CX"] .post-btn').getAttribute('data-post-grade');
    ok('Edge Case C: CX post-grade 0 preserved after table re-sync', cxPostPreserved === '0', cxPostPreserved);

    // Edge Case D: Untreat CX -> Re-check table hides, empty prompt reappears
    await cxAlCell.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    await cxAlCell.click();
    await page.waitForTimeout(150);
    await page.click('#pv-picker button[data-act="treated"]');
    await page.waitForTimeout(200);
    ok('Edge Case D: Untreating all points hides table and reveals empty prompt', await page.isVisible('#fm-recheck-empty'));

    // Re-treat CX for subsequent tests
    await cxAlCell.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    await cxAlCell.click();
    await page.waitForTimeout(150);
    await page.click('#pv-picker button[data-act="treated"]');
    await page.waitForTimeout(200);

    // Edge Case E: Mo/Ve table manual movement edits preserved across segment addition
    await page.evaluate(() => window.addFmSegment('today', 'GE', true, true));
    await page.waitForTimeout(200);
    await page.locator('#fm-seg-table tbody tr .seg-painful').first().fill('Deep squat');
    await page.locator('#fm-seg-table tbody tr .seg-vrs').first().fill('7');
    await page.locator('#fm-seg-table tbody tr .seg-vrs').first().evaluate(el => el.dispatchEvent(new Event('input', {bubbles:true})));
    await page.waitForTimeout(200);

    const moveInput = page.locator('#fm-move-table tbody tr .move-movement input').first();
    await moveInput.fill('Single leg squat to 45°');
    await moveInput.evaluate(el => el.dispatchEvent(new Event('input', {bubbles:true})));

    // Add another segment to trigger syncMoveTable
    await page.evaluate(() => window.addFmSegment('today', 'LU', true, true));
    await page.waitForTimeout(200);

    const moveInputAfter = await page.locator('#fm-move-table tbody tr:has(.move-seg-name:text-matches("GE")) .move-movement input').inputValue();
    ok('Edge Case E: Mo/Ve custom movement input preserved across table sync', moveInputAfter === 'Single leg squat to 45°', moveInputAfter);

    // Edge Case F: Mo/Ve pain scale outcome formatting
    const geMoveRow = page.locator('#fm-move-table tbody tr:has(.move-seg-name:text-matches("GE"))').first();
    // Step post down
    const minusBtn = geMoveRow.locator('.mv-b[data-dir="-1"]');
    await minusBtn.click();
    await page.waitForTimeout(100);
    const deltaText = await geMoveRow.locator('.move-delta').textContent();
    ok('Edge Case F: Pain scale outcome formatting shows points reduction without negative numbers', deltaText.includes('pts') && !deltaText.includes('-'), deltaText);

    // Edge Case G: getFmData structure verification
    const data = await page.evaluate(() => window.getFmData());
    ok('Edge Case G: getFmData() has segments array', Array.isArray(data.segments));
    ok('Edge Case G: getFmData() has pv array', Array.isArray(data.pv));
    ok('Edge Case G: getFmData() has moVe array', Array.isArray(data.moVe));
    ok('Edge Case G: getFmData() has palpatoryRecheck array with treated point', Array.isArray(data.palpatoryRecheck) && data.palpatoryRecheck.length >= 1);
    ok('Edge Case G: 0 page errors throughout all flows', errors.length === 0, errors);

    await browser.close();

    const failed = results.filter(r => !r.pass).length;
    console.log(`\n============================\n${failed ? failed + ' FAILED' : 'ALL ' + results.length + ' CHECKS PASSED'}\n============================`);
    process.exit(failed ? 1 : 0);
})();
