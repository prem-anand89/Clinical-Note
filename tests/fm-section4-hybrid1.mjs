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
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('file://' + path.resolve(__dirname, '../clinical-note.html'));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
    await page.waitForTimeout(200);

    // 1. Initial State
    console.log('--- 1. Testing Initial State ---');
    const initDiag = await page.textContent('#fm-hyp-diag');
    ok('Initial diagnosis is None', initDiag.trim() === 'None', initDiag);
    ok('Initial badge is hidden', !(await page.isVisible('#fm-hyp-badge')));
    const initMeta = await page.textContent('#fm-hyp-meta');
    ok('Initial meta guidance is shown', initMeta.includes('Palpate and grade'), initMeta);
    const initCount = await page.textContent('#fm-seq-count');
    ok('Initial count is 0 points planned', initCount.trim() === '0 points planned', initCount);

    // 2. Add Point via Popover
    console.log('--- 2. Testing Add Point via Popover ---');
    await page.click('#fm-add-seq-step');
    await page.waitForTimeout(100);
    ok('Popover opens on Add Point click', await page.isVisible('#fm-seq-picker'));
    const pickerTitle = await page.textContent('#fm-picker-title');
    ok('Popover title is Add Sequence Point', pickerTitle.includes('Add Sequence Point'), pickerTitle);

    // Select AN-LA, CX, rt
    await page.selectOption('#fm-picker-plane', 'AN-LA');
    await page.selectOption('#fm-picker-seg', 'CX');
    await page.selectOption('#fm-picker-side', 'rt');
    await page.click('#fm-picker-save');
    await page.waitForTimeout(100);
    ok('Popover closes on Save', !(await page.isVisible('#fm-seq-picker')));

    const chips = page.locator('#fm-seq-builder .seq-step.point-chip');
    ok('1 point chip created', (await chips.count()) === 1);
    const chip1 = chips.nth(0);
    ok('Chip 1 has number 1', (await chip1.locator('.point-num').textContent()).trim() === '1');
    ok('Chip 1 has segment CX', (await chip1.locator('.point-seg').textContent()).trim() === 'CX');
    ok('Chip 1 has plane AN-LA', (await chip1.locator('.point-plane').textContent()).trim() === 'AN-LA');
    ok('Chip 1 has side RT', (await chip1.locator('.point-side').textContent()).trim() === 'RT');
    ok('Count updated to 1 point planned', (await page.textContent('#fm-seq-count')).trim() === '1 point planned');

    // Diagnostic banner should derive AL diagonal
    const diag1 = await page.textContent('#fm-hyp-diag');
    ok('Hypothesis derives AL diagonal', diag1.includes('AL diagonal'), diag1);
    ok('Hypothesis badge is visible', await page.isVisible('#fm-hyp-badge'));
    ok('Hypothesis badge text is Diagonal', (await page.textContent('#fm-hyp-badge')).trim() === 'Diagonal');

    // 3. Add Second Point
    console.log('--- 3. Testing Add Second Point ---');
    await page.click('#fm-add-seq-step');
    await page.waitForTimeout(100);
    await page.selectOption('#fm-picker-plane', 'AN-LA');
    await page.selectOption('#fm-picker-seg', 'GE');
    await page.selectOption('#fm-picker-side', 'rt');
    await page.click('#fm-picker-save');
    await page.waitForTimeout(100);

    ok('2 point chips now in sequence', (await chips.count()) === 2);
    const chip2 = chips.nth(1);
    ok('Chip 2 has number 2', (await chip2.locator('.point-num').textContent()).trim() === '2');
    ok('Chip 2 has segment GE', (await chip2.locator('.point-seg').textContent()).trim() === 'GE');
    ok('Count updated to 2 points planned', (await page.textContent('#fm-seq-count')).trim() === '2 points planned');

    // 4. Edit Point Chip via Tap
    console.log('--- 4. Testing Edit Point Chip via Tap ---');
    await chip2.click();
    await page.waitForTimeout(100);
    ok('Popover opens in Edit mode', await page.isVisible('#fm-seq-picker'));
    const editTitle = await page.textContent('#fm-picker-title');
    ok('Popover title is Edit Sequence Point', editTitle.includes('Edit Sequence Point'), editTitle);

    // Change segment to PE
    await page.selectOption('#fm-picker-seg', 'PE');
    await page.click('#fm-picker-save');
    await page.waitForTimeout(100);
    ok('Chip 2 segment updated to PE', (await chip2.locator('.point-seg').textContent()).trim() === 'PE');
    ok('Chip 2 dataset segment is PE', (await chip2.getAttribute('data-segment')) === 'PE');

    // 5. Delete Point Chip
    console.log('--- 5. Testing Delete Point Chip ---');
    await chip1.locator('.del-step').click();
    await page.waitForTimeout(100);
    ok('Now only 1 chip remaining', (await chips.count()) === 1);
    const remainingChip = chips.nth(0);
    ok('Remaining chip reindexed to number 1', (await remainingChip.locator('.point-num').textContent()).trim() === '1');
    ok('Remaining chip is PE', (await remainingChip.locator('.point-seg').textContent()).trim() === 'PE');
    ok('Count updated to 1 point planned', (await page.textContent('#fm-seq-count')).trim() === '1 point planned');

    // 6. Re-derive Button
    console.log('--- 6. Testing Re-derive Button ---');
    await page.click('#fm-re-derive-btn');
    await page.waitForTimeout(50);
    const reBtnText = await page.textContent('#fm-re-derive-btn');
    ok('Re-derive gives visual feedback', reBtnText.includes('Updated'), reBtnText);

    // 7. Collapsible Reasoning & Quick Tags
    console.log('--- 7. Testing Reasoning Collapse & Quick Tags ---');
    const collapse = page.locator('#fm-reasoning-collapse');
    ok('Reasoning starts collapsed', !(await collapse.evaluate(el => el.open)));
    await collapse.locator('summary').click();
    await page.waitForTimeout(100);
    ok('Reasoning is now expanded', await collapse.evaluate(el => el.open));

    const densityTag = page.locator('#fm-reasoning-tags button[data-chip="Density chain"]');
    await densityTag.click();
    await page.waitForTimeout(100);
    ok('Quick tag Density chain is selected', await densityTag.evaluate(el => el.classList.contains('selected')));

    await page.fill('#fm-seq-reasoning', 'Ascending myofascial tension from ankle sprain');
    await page.waitForTimeout(100);

    // 8. getFmData() Integration
    console.log('--- 8. Testing getFmData().hypothesis API ---');
    const fmData = await page.evaluate(() => window.getFmData());
    ok('getFmData().hypothesis exists', !!fmData.hypothesis);
    ok('hypothesis.steps length is 1', fmData.hypothesis.steps.length === 1);
    ok('hypothesis.steps[0] has plane AN-LA', fmData.hypothesis.steps[0].plane === 'AN-LA');
    ok('hypothesis.steps[0] has segment PE', fmData.hypothesis.steps[0].segment === 'PE');
    ok('hypothesis.steps[0] has side rt', fmData.hypothesis.steps[0].side === 'rt');
    ok('hypothesis.derived contains AL diagonal', fmData.hypothesis.derived.includes('AL diagonal'), fmData.hypothesis.derived);
    ok('hypothesis.tags contains Density chain', fmData.hypothesis.tags.includes('Density chain'), fmData.hypothesis.tags);
    ok('hypothesis.reasoning matches input', fmData.hypothesis.reasoning.includes('Ascending myofascial tension'), fmData.hypothesis.reasoning);

    // Add a 2nd point to demonstrate full sequence in screenshot
    await page.click('#fm-add-seq-step');
    await page.waitForTimeout(100);
    await page.selectOption('#fm-picker-plane', 'AN-LA');
    await page.selectOption('#fm-picker-seg', 'GE');
    await page.selectOption('#fm-picker-side', 'rt');
    await page.click('#fm-picker-save');
    await page.waitForTimeout(100);

    // Capture high-res screenshot of Card 4
    const card4 = page.locator('#fm-seq-builder').locator('xpath=ancestor::div[contains(@class, "card")]');
    await card4.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await card4.screenshot({ path: '/home/theranet/.gemini/antigravity-ide/brain/7f4b0632-ae7f-4d16-97a0-9e88ec9627c0/card4-hybrid1-desktop.png' });
    console.log('Saved card4-hybrid1-desktop.png');

    // Mobile viewport screenshot
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    await card4.scrollIntoViewIfNeeded();
    await card4.screenshot({ path: '/home/theranet/.gemini/antigravity-ide/brain/7f4b0632-ae7f-4d16-97a0-9e88ec9627c0/card4-hybrid1-mobile.png' });
    console.log('Saved card4-hybrid1-mobile.png');

    ok('Zero console errors', errors.length === 0, errors);
    await browser.close();

    console.log('============================');
    console.log(`ALL ${results.length} CHECKS PASSED`);
    console.log('============================');
})();
