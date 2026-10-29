// FM Step 3 (CLAUDE_HANDOFF_FM_FIXES.md): role badges, FM block in the note preview, pattern prompts.
// Run: node tests/fm-step3-additions.mjs
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
// Grade a PV cell with the real picker. `rowIdx` = current-visit row, `colIdx` = column within that row.
async function grade(page, rowIdx, colIdx, g, treated) {
  const c = page.locator('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)').nth(rowIdx).locator('.pv-cell').nth(colIdx);
  await c.scrollIntoViewIfNeeded(); await c.click(); await page.waitForTimeout(120);
  await page.locator('#pv-picker button[data-grade="' + g + '"]').click(); await page.waitForTimeout(120);
}

// ---- 3a role badges
{
  const page = await fresh();
  await tap(page, '#region-chips [data-chip="Knee"]');
  await tap(page, '#laterality [data-val="Right"]');
  await page.evaluate(() => document.getElementById('add-secondary').click());
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    const card = document.querySelector('#secondary-rows .repeatable-card');
    card.querySelector('.sec-region-chips [data-chip="Ankle / Foot"]').click();
    card.querySelector('[id$="-lat"] [data-val="Right"]').click();
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.addFmSegment('today', 'LU', false, true)); // manual row: no badge
  await page.evaluate(() => { window.addFmSegment('today', 'GE', true, false); window.addFmSegment('today', 'TA', true, false); });
  await page.waitForTimeout(400);
  const roles = await page.evaluate(() => Array.from(document.querySelectorAll('#fm-seg-table tbody tr')).map(tr => ({
    seg: tr.querySelector('.seg-name').value, badge: (tr.querySelector('.fm-role-badge') || {}).textContent || '' })));
  ok('3a: Card 1 shows SiPa on the primary row and PaConc on the secondary', roles.find(r => r.seg === 'GE').badge === 'SiPa' && roles.find(r => r.seg === 'TA').badge === 'PaConc', roles);
  ok('3a: a manual row has no badge', roles.find(r => r.seg === 'LU').badge === '', roles);
  const pvBadges = await page.evaluate(() => Array.from(document.querySelectorAll('#fm-pv-table tbody tr:not(.fm-prior-row) .pv-seg-col')).map(td => ({
    seg: td.querySelector('.pv-seg-name').value, badge: (td.querySelector('.fm-role-badge') || {}).textContent || '' })));
  ok('3a: Card 3 segment column carries the same badge by segment', pvBadges.find(r => r.seg === 'GE').badge === 'SiPa' && pvBadges.find(r => r.seg === 'TA').badge === 'PaConc', pvBadges);
  const exp = await page.evaluate(() => window.getFmData().segments.map(s => [s.segment, s.role]));
  ok('3a: getFmData().segments exports role (null for manual)', JSON.stringify(exp.find(x => x[0] === 'GE')) === '["GE","SiPa"]' && exp.find(x => x[0] === 'LU')[1] === null, exp);
  await page.close();
}

// ---- 3b FM block in the preview
{
  const page = await fresh();
  const blank = await page.evaluate(() => { document.querySelector('.preview-open').click(); return document.getElementById('np-body').textContent; });
  ok('3b: no FM block when FM is not in the note', !/Fascial Manipulation/.test(blank));
  await page.evaluate(() => document.getElementById('np-close').click());
  await tap(page, '#region-chips [data-chip="Knee"]');
  await tap(page, '#laterality [data-val="Right"]');
  await tap(page, '#onset-mechanism [data-val="Sudden"]');
  await tap(page, '#nrs-current [data-val="7"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.addFmSegment('today', 'GE', true, false); });
  await page.waitForTimeout(300);
  await page.evaluate(() => window.addManualHistRow('Pa Prev', 'TA (rt)', 'Mar 2019', 'Sprain', 'Full'));
  await grade(page, 0, 0, '3');
  await page.evaluate(() => { const c = document.querySelector('#fm-pv-table .pv-cell[data-grade="3"]'); c.setAttribute('data-treated', 'true'); });
  await page.waitForTimeout(200);
  const html = await page.evaluate(() => { document.querySelector('.preview-open').click(); return document.getElementById('np-body').innerHTML; });
  const text = await page.evaluate(() => document.getElementById('np-body').textContent.replace(/\s+/g, ' '));
  ok('3b: the preview has a Fascial Manipulation chart with the segment table', /Fascial Manipulation/.test(text) && /<table class="np-table">/.test(html) && /SiPa/.test(text), text.slice(0, 400));
  ok('3b: the table shows side, Trauma? and VRS for the routed row', /GE\s*SiPa\s*R\s*Yes\s*7/.test(text.replace(/\s+/g, ' ')) || (/SiPa/.test(text) && /Yes/.test(text) && /\b7\b/.test(text)), text);
  ok('3b: FM history appears', /FM history:.*TA/.test(text), text);
  ok('3b: only graded points are listed, with the treated tick', /Palpatory verification:.*GE-AL R 3 ✓/.test(text), text);
  await page.close();
}

// ---- 3c pattern prompts
{
  const page = await fresh();
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.addFmSegment('today', 'LU', true, true));
  await page.waitForTimeout(200);
  const cols = await page.evaluate(() => Array.from(document.querySelectorAll('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)')[0].querySelectorAll('.pv-cell')).map(c => c.dataset.plane + '|' + c.dataset.side));
  const idx = (plane, side) => cols.indexOf(plane + '|' + side);
  await grade(page, 0, idx('An', 'rt'), '2');
  await grade(page, 0, idx('Re', 'rt'), '2');
  await page.waitForTimeout(250);
  const hints = await page.evaluate(() => (document.getElementById('fm-density-hints') || {}).textContent || '');
  ok('3c: An + Re densified on the same segment/side is noted (and not called co-contraction)', /An and Re both densified on LU R/.test(hints) && !/co-?contraction/i.test(hints), hints);
  await page.evaluate(() => window.addManualHistRow('Pa Prev', 'LU', 'Mar 2018', 'Back pain', 'Full'));
  await grade(page, 0, idx('La', 'rt'), '2');
  await page.waitForTimeout(250);
  const hints2 = await page.evaluate(() => (document.getElementById('fm-density-hints') || {}).textContent || '');
  ok('3c: a densified segment that is also in FM History is noted', /LU is also in FM History/.test(hints2), hints2);
  // hint only describes: it must not write into the hypothesis or reasoning
  ok('3c: prompts never fill the reasoning text', await page.evaluate(() => document.getElementById('fm-seq-reasoning').value === ''));
  // one-segment sequence hint
  await page.evaluate(() => { window.addFmSegment('today', 'GE', true, true); });
  await page.waitForTimeout(150);
  ok('3c: no sequence hint with an empty sequence', await page.locator('#fm-seq-hint').isHidden());
  await page.locator('#fm-add-seq-step').scrollIntoViewIfNeeded();
  await page.evaluate(() => document.getElementById('fm-seq-from-findings').click());
  await page.waitForTimeout(250);
  const steps = await page.locator('#fm-seq-builder .seq-step').count();
  const hint = await page.evaluate(() => { const h = document.getElementById('fm-seq-hint'); return h && getComputedStyle(h).display !== 'none' ? h.textContent : ''; });
  ok('3c: all planned points on one segment shows the non-blocking hint', steps >= 2 && /All planned points are on LU/.test(hint), { steps, hint });
  await page.close();
}

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
