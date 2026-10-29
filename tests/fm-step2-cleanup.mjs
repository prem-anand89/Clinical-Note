// FM Step 2 (CLAUDE_HANDOFF_FM_FIXES.md): one sequence action, grid-missing chips in Card 3, one Response field,
// internal-dysfunction context pills. Run: node tests/fm-step2-cleanup.mjs
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const results = []; const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const errors = [];
async function fresh(width = 1024) {
  const page = await (await browser.newContext({ viewport: { width, height: 1000 } })).newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.dismiss());
  await page.goto('file://' + path.join(dir, '..', 'clinical-note.html'));
  await page.waitForTimeout(200);
  return page;
}
const tap = (page, sel) => page.evaluate(s => document.querySelector(s).click(), sel);

// ---- 2a one sequence action; banner follows the grid
{
  const page = await fresh();
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
  await page.waitForTimeout(300);
  ok('2a: Re-derive and Card 3 Apply buttons are gone', await page.locator('#fm-re-derive-btn, #fm-apply-to-seq').count() === 0);
  const btn = page.locator('#fm-seq-from-findings');
  ok('2a: the single action is labelled "Apply top findings"', (await btn.textContent()).includes('Apply top findings'));
  ok('2a: it is disabled until a point reaches grade 2', await btn.isDisabled());
  await page.evaluate(() => window.addFmSegment('today', 'GE', true, true));
  await page.waitForTimeout(200);
  const cell = page.locator('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)').first().locator('.pv-cell').first();
  await cell.scrollIntoViewIfNeeded(); await cell.click(); await page.waitForTimeout(150);
  await page.locator('#pv-picker button[data-grade="3"]').click();
  await page.waitForTimeout(300);
  ok('2a: grading a point to 3 enables the action', await btn.isEnabled());
  await btn.scrollIntoViewIfNeeded();
  await btn.click(); await page.waitForTimeout(200);
  ok('2a: tapping it adds the finding to the sequence', await page.locator('#fm-seq-builder .seq-step').count() === 1);
  await page.locator('#fm-seq-builder .seq-step .del-step').click(); await page.waitForTimeout(100);
  // a second tap does not duplicate once already in the sequence
  await btn.click(); await btn.click(); await page.waitForTimeout(200);
  ok('2a: repeated taps do not duplicate sequence steps', await page.locator('#fm-seq-builder .seq-step').count() === 1);
  await page.close();
}

// ---- 2b grid-missing chips live in Card 3
{
  const page = await fresh();
  await tap(page, '#region-chips [data-chip="Knee"]');
  await page.waitForTimeout(200);
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
  await page.waitForTimeout(500);
  const where = await page.evaluate(() => {
    const w = document.getElementById('fm-grid-missing');
    const c3 = document.getElementById('fm-pv-table').closest('.card');
    const c1 = document.getElementById('fm-seg-table').closest('.card');
    return { visible: getComputedStyle(w).display !== 'none', inCard3: c3.contains(w), inCard1: c1.contains(w),
      text: w.textContent.replace(/\s+/g, ' ').trim() };
  });
  ok('2b: the strip sits in Card 3, not Card 1', where.inCard3 && !where.inCard1, where);
  ok('2b: it is labelled "From Card 1" and offers the GE chip', /From Card 1/.test(where.text) && /GE/.test(where.text), where);
  await page.locator('#fm-grid-missing-chips .chip').first().click();
  await page.waitForTimeout(300);
  ok('2b: tapping the chip puts GE in the grid and the strip clears', await page.locator('#fm-pv-table tbody tr:not(.fm-prior-row) .pv-seg-name').count() >= 1
    && await page.locator('#fm-grid-missing').isHidden());
  await page.close();
}

// ---- 2c one response field
{
  const page = await fresh();
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
  await page.waitForTimeout(300);
  ok('2c: the old multi-select Session Response chips are gone', await page.locator('#fm-session-response .chip').count() === 0);
  const fmBtn = v => page.locator('#fm-session-response button[data-val="' + v + '"]');
  const coreSel = () => page.evaluate(() => Array.from(document.querySelectorAll('#response-to-treatment button.selected')).map(b => b.dataset.val));
  const fmSel = () => page.evaluate(() => Array.from(document.querySelectorAll('#fm-session-response button.selected')).map(b => b.dataset.val));
  await fmBtn('Improved').scrollIntoViewIfNeeded();
  await fmBtn('Improved').click(); await page.waitForTimeout(100);
  ok('2c: choosing in FM sets Core\'s Response', JSON.stringify(await coreSel()) === '["Improved"]', await coreSel());
  ok('2c: getFmData().sessionResponse is [Core value]', JSON.stringify(await page.evaluate(() => window.getFmData().sessionResponse)) === '["Improved"]');
  await fmBtn('Improved').click(); await page.waitForTimeout(100);
  ok('2c: a second tap clears it in both places', (await coreSel()).length === 0 && (await fmSel()).length === 0, [await coreSel(), await fmSel()]);
  await page.evaluate(() => document.querySelector('#response-to-treatment [data-val="Worse"]').click());
  await page.waitForTimeout(100);
  ok('2c: choosing in Core mirrors into FM', JSON.stringify(await fmSel()) === '["Worse"]', await fmSel());
  ok('2c: getFmData().sessionResponse is [] when nothing is chosen', await page.evaluate(() => { document.querySelector('#response-to-treatment [data-val="Worse"]').click(); return window.getFmData().sessionResponse.length === 0; }));
  await page.close();
}

// ---- 2d internal dysfunction context pills
{
  const page = await fresh();
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
  await page.waitForTimeout(300);
  const chip = await page.evaluate(() => { const c = document.querySelector('#internal-dysfunctions .chip'); return c ? c.getAttribute('data-chip') : null; });
  ok('2d: a Core systemic-symptom chip exists to test with', !!chip);
  await page.evaluate(() => document.querySelector('#internal-dysfunctions .chip').click());
  await page.evaluate(() => { const d = document.getElementById('internal-dysf-detail'); d.value = 'IBS for 5 years'; d.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(300);
  const ctx = await page.evaluate(() => ({
    shown: getComputedStyle(document.getElementById('fm-internal-dysf-context')).display !== 'none',
    pills: Array.from(document.querySelectorAll('#fm-internal-dysf-pills .fm-ctx-pill')).map(p => p.textContent.trim()),
    notes: document.getElementById('fm-internal-dysf').value }));
  ok('2d: Subjective systems and detail show as read-only pills', ctx.shown && ctx.pills.length >= 2 && ctx.pills.some(p => /IBS for 5 years/.test(p)), ctx);
  ok('2d: the FM notes box is NOT filled with copied text', ctx.notes === '', ctx.notes);
  ok('2d: apparatus is still auto-flagged from the Subjective system', await page.evaluate(() => document.querySelectorAll('#fm-apparatus-chips .chip.trigger-suggested').length >= 1));
  await page.evaluate(() => { const t = document.getElementById('fm-internal-dysf'); t.value = 'Epigastric tension'; t.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#internal-dysfunctions .chip.selected').click(); });
  await page.waitForTimeout(300);
  ok('2d: the therapist\'s FM notes survive the Subjective chip being cleared', await page.evaluate(() => document.getElementById('fm-internal-dysf').value === 'Epigastric tension'));
  ok('2d: getFmData().internalDysfunction.notes holds only the FM notes', await page.evaluate(() => window.getFmData().internalDysfunction.notes === 'Epigastric tension'));
  await page.close();
}

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
