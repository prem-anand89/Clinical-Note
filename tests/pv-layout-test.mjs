// Test layout options, side default, anatomical names, and non-destructive data switching.
// Run: node tests/pv-layout-test.mjs
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

// 1. Open FM module
await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
await page.waitForTimeout(300);

// 2. Verify default side is Right and default layout is CF · CC
const pvContainerSide = await page.getAttribute('.pv-container', 'data-side-view');
ok('default side is Right (rt)', pvContainerSide === 'rt', pvContainerSide);

const pvContainerLayout = await page.getAttribute('.pv-container', 'data-layout-view');
ok('default layout is CF · CC (cf-cc)', pvContainerLayout === 'cf-cc', pvContainerLayout);

// 3. Verify segment picker below table & region tabs
const pickerBelowTable = await page.evaluate(() => {
    const t = document.getElementById('fm-seg-table'), pk = document.getElementById('fm-seg-picker');
    return !!(t && pk && (t.compareDocumentPosition(pk) & Node.DOCUMENT_POSITION_FOLLOWING));
});
ok('segment picker is located below segment table', pickerBelowTable);

// 4. Test Region Disclosure Drawer and Anatomical Names (e.g. GE – Knee)
await page.click('#fm-region-tabs button[data-region="Lower limb"]');
await page.waitForTimeout(200);

const drawerVisible = await page.isVisible('#fm-region-drawer');
ok('tapping region discloses drawer', drawerVisible);

const kneeChip = page.locator('#fm-region-chips .fm-seg-chip', { hasText: 'GE' });
const kneeChipText = await kneeChip.textContent();
ok('shows anatomical name GE – Knee', /GE.*Knee/i.test(kneeChipText), kneeChipText);

// 5. Click GE to add row
await kneeChip.click();
await page.waitForTimeout(300);

const segRows = await page.locator('#fm-seg-table tbody tr').count();
const pvRows = await page.locator('#fm-pv-table tbody tr').count();
ok('adding segment creates row in assessment and PV table', segRows >= 1 && pvRows >= 1, { segRows, pvRows });

// 6. Grade AL (CF) as 2+ and An (CC) as 3 ✓ on Right side
const alCell = page.locator('#fm-pv-table tbody tr .pv-cell[data-plane="AN-LA"][data-side="rt"]').first();
await alCell.scrollIntoViewIfNeeded();
await alCell.click();
await page.locator('button[data-grade="2+"]:visible').first().click();
await page.waitForTimeout(200);

const anCell = page.locator('#fm-pv-table tbody tr .pv-cell[data-plane="An"][data-side="rt"]').first();
await anCell.scrollIntoViewIfNeeded();
await anCell.click();
await page.locator('button.g3:visible').first().click();
await page.waitForTimeout(200);
// mark treated
await anCell.click();
await page.locator('button[data-act="treated"]:visible').first().click();
await page.waitForTimeout(200);

ok('AL rt has grade 2+', (await alCell.getAttribute('data-grade')) === '2+');
ok('An rt has grade 3 and treated=true', (await anCell.getAttribute('data-grade')) === '3' && (await anCell.getAttribute('data-treated')) === 'true');

// 7. Switch to 'Ante · Retro' layout
await page.click('#pv-layout-toggle button[data-pv-layout="ante-retro"]');
await page.waitForTimeout(200);
ok('layout switched to ante-retro', (await page.getAttribute('.pv-container', 'data-layout-view')) === 'ante-retro');

// Check that data is preserved non-destructively
const alCellAfterAnteRetro = page.locator('#fm-pv-table tbody tr .pv-cell[data-plane="AN-LA"][data-side="rt"]').first();
const anCellAfterAnteRetro = page.locator('#fm-pv-table tbody tr .pv-cell[data-plane="An"][data-side="rt"]').first();
ok('AL rt grade preserved in ante-retro', (await alCellAfterAnteRetro.getAttribute('data-grade')) === '2+');
ok('An rt grade & treated preserved in ante-retro', (await anCellAfterAnteRetro.getAttribute('data-grade')) === '3' && (await anCellAfterAnteRetro.getAttribute('data-treated')) === 'true');

// 8. Switch to 'CCs only' layout
await page.click('#pv-layout-toggle button[data-pv-layout="cc-only"]');
await page.waitForTimeout(200);
ok('layout switched to cc-only', (await page.getAttribute('.pv-container', 'data-layout-view')) === 'cc-only');

const alCellHidden = await page.evaluate(() => {
    const td = document.querySelector('#fm-pv-table tbody tr td.pv-col-cf');
    return window.getComputedStyle(td).display === 'none';
});
ok('CF columns are visually hidden in CCs only mode', alCellHidden);

const anCellVisible = await page.evaluate(() => {
    const td = document.querySelector('#fm-pv-table tbody tr td.pv-col-cc');
    return window.getComputedStyle(td).display !== 'none';
});
ok('CC columns are visible in CCs only mode', anCellVisible);

// Density summary warning for hidden graded CF points
const summaryText = await page.textContent('#fm-density-summary');
ok('warning displayed in density summary for hidden CF points', /hidden in CCs-only mode/i.test(summaryText), summaryText);

// 9. Switch back to 'CF · CC' layout
await page.click('#pv-layout-toggle button[data-pv-layout="cf-cc"]');
await page.waitForTimeout(200);
ok('switched back to cf-cc', (await page.getAttribute('.pv-container', 'data-layout-view')) === 'cf-cc');

const alCellAfterCfCc = page.locator('#fm-pv-table tbody tr .pv-cell[data-plane="AN-LA"][data-side="rt"]').first();
ok('AL rt grade 2+ restored and visible', (await alCellAfterCfCc.getAttribute('data-grade')) === '2+');

// 10. Test Left side filter and Both sides filter
await page.click('#pv-side-toggle button[data-pv-side="lt"]');
await page.waitForTimeout(100);
ok('side filter switched to lt', (await page.getAttribute('.pv-container', 'data-side-view')) === 'lt');

await page.click('#pv-side-toggle button[data-pv-side="all"]');
await page.waitForTimeout(100);
const allSidesAttr = await page.getAttribute('.pv-container', 'data-side-view');
ok('side filter shows both sides (no side attribute)', allSidesAttr === null, allSidesAttr);

// 11. Auto-filling from chief complaints auto-opens matching region drawer
await page.evaluate(() => {
    const input = document.getElementById('complaint-input');
    if (input) {
        input.value = 'Severe knee pain and stiffness';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }
});
await page.waitForTimeout(300);

// 12. Test Manual Add & Override in FM History Section
await page.click('#fm-add-hist');
await page.waitForTimeout(200);

const histRows = await page.locator('#fm-hist-table tbody tr').count();
ok('adding manual history row creates a row', histRows >= 1, histRows);

const lastHistRow = page.locator('#fm-hist-table tbody tr').last();
await lastHistRow.locator('.hist-seg').fill('GE (rt)');
await lastHistRow.locator('.hist-date').fill('2023');
await lastHistRow.locator('.hist-diag').fill('Meniscus tear');
await lastHistRow.locator('.hist-type').selectOption('Trauma');

const fmDataWithHist = await page.evaluate(() => window.getFmData());
const foundHist = fmDataWithHist.history.find(h => h.segment === 'GE (rt)' && h.type === 'Trauma');
ok('getFmData accurately reads manual history inputs', !!foundHist, foundHist);

// Verify syncFmHistory preserves manual row
await page.evaluate(() => window.syncFmHistory());
const histCountAfterSync = await page.locator('#fm-hist-table tbody tr').count();
ok('syncFmHistory preserves manual rows', histCountAfterSync >= 1);

// Test delete button
await lastHistRow.locator('.del-hist-btn').click();
await page.waitForTimeout(100);
const histCountAfterDelete = await page.locator('#fm-hist-table tbody tr').count();
ok('deleting manual history row removes it', histCountAfterDelete === histRows - 1);

ok('no page errors throughout operations', errors.length === 0, errors);

await browser.close();
const failed = results.filter(r => !r[1]).length;
console.log(failed ? failed + ' FAILED' : 'ALL PASS');
process.exit(failed ? 1 : 0);
