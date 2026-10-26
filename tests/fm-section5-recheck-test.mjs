import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ok(name, cond, info) {
    if (cond) {
        console.log('PASS ' + name);
    } else {
        console.error('FAIL ' + name, info !== undefined ? info : '');
        process.exitCode = 1;
    }
}

(async () => {
    const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });

    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

    await page.goto('file://' + path.resolve(__dirname, '../clinical-note.html'));
    await page.waitForTimeout(500);

    // Open FM module
    await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
    await page.waitForTimeout(300);

    // 1. Check notes details is collapsed by default
    const isNotesOpen = await page.evaluate(() => {
        const details = document.querySelector('.card:has(#fm-move-table) details.fm-collapse');
        return details ? details.open : null;
    });
    ok('Treatment notes details is collapsed by default', isNotesOpen === false, isNotesOpen);

    // 2. Check Palpatory Re-check shows empty prompt initially (0 treated points)
    const emptyPromptVisible = await page.isVisible('#fm-recheck-empty');
    ok('Empty prompt visible when no points treated yet', emptyPromptVisible);

    // 3. Add segment CX via Card 3 PV Grid Picker
    await page.click('#pv-add-region-tabs button[data-region="Lower limb"]');
    await page.waitForTimeout(200);
    await page.click('#pv-region-chips .pv-seg-chip[data-seg="CX"]');
    await page.waitForTimeout(300);

    // Tap cell for CX -> Right -> AL
    const cxRow = page.locator('#fm-pv-table tbody tr[data-seg="CX"]').first();
    const alCell = cxRow.locator('.pv-cell[data-side="rt"][data-plane="AN-LA"]').first();
    await alCell.click();
    await page.waitForTimeout(100);

    // In picker: pick grade 3 and mark treated
    await page.click('#pv-picker button[data-grade="3"]');
    await page.waitForTimeout(500);
    // Tapping 3 auto-marks or we can tap treated
    await alCell.click();
    await page.waitForTimeout(100);
    await page.click('#pv-picker button[data-act="treated"]');
    await page.waitForTimeout(100);

    // Check that AL cell is treated
    const isTreated = await alCell.getAttribute('data-treated');
    ok('Card 3 AL CX marked treated', isTreated === 'true', isTreated);

    // 4. Verify Palpatory Re-check matrix table auto-populated
    const recheckTableVisible = await page.isVisible('#fm-recheck-table');
    ok('Palpatory Re-check table is now visible', recheckTableVisible);

    const recheckHeaderCols = await page.locator('#fm-recheck-table thead tr').nth(1).locator('th').count();
    ok('Re-check table has AL line column', recheckHeaderCols >= 1, recheckHeaderCols);

    // Check Pre sub-column badge
    const preBadgeText = await page.locator('#fm-recheck-table tbody tr .pre-badge').first().textContent();
    ok('Pre sub-column shows prefilled grade 3', preBadgeText.trim() === '3', preBadgeText);

    // Check Post sub-column initial unrated state
    const postBtn = page.locator('#fm-recheck-table tbody tr .post-btn').first();
    const postBtnText = await postBtn.textContent();
    ok('Post sub-column shows unrated ? button', postBtnText.trim() === '?', postBtnText);

    // 5. Tap Post button and pick 0 in recheck picker
    await postBtn.click();
    await page.waitForTimeout(100);
    const pickerOpen = await page.isVisible('#fm-recheck-picker');
    ok('Re-check picker opens on tap', pickerOpen);

    // Select grade 0
    await page.click('#fm-recheck-picker button[data-post-grade="0"]');
    await page.waitForTimeout(100);

    const postGradeAfter = await postBtn.getAttribute('data-post-grade');
    const postBtnTextAfter = await postBtn.textContent();
    ok('Post grade updated to 0', postGradeAfter === '0' && postBtnTextAfter.trim() === '0', { postGradeAfter, postBtnTextAfter });

    // 6. Test Quick Add Aftercare Note
    await page.click('.fm-collapse summary'); // open details
    await page.waitForTimeout(100);
    const quickChip = page.locator('.fm-collapse .chip').first();
    await quickChip.click();
    const notesVal = await page.inputValue('#fm-rx-notes');
    ok('Clicking quick aftercare chip appends to notes', notesVal.includes('soreness explained'), notesVal);

    // 7. Verify getFmData() export
    const fmData = await page.evaluate(() => window.getFmData());
    ok('getFmData().palpatoryRecheck exists', Array.isArray(fmData.palpatoryRecheck) && fmData.palpatoryRecheck.length >= 1, fmData.palpatoryRecheck);
    const recheckEntry = fmData.palpatoryRecheck[0];
    ok('palpatoryRecheck contains correct preGrade (3) and postGrade (0)', recheckEntry.preGrade === '3' && recheckEntry.postGrade === '0', recheckEntry);
    ok('getFmData().treatmentNotes captured aftercare notes', fmData.treatmentNotes.includes('soreness explained'), fmData.treatmentNotes);

    console.log('ALL PASS');
    await browser.close();
})();
