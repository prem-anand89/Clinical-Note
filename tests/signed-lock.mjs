// A signed note must not change. Run: node tests/signed-lock.mjs
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const results = []; const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1024, height: 900 } })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('file://' + path.join(dir, '..', 'clinical-note.html'));

// build a note with FM data, a ROM row and a pin, then sign
await page.click('#region-chips [data-chip="Knee"]');
await page.evaluate(() => { window.leanSuggest.add('rom', 'Flexion'); window.openAdvancedModule('fascial-manipulation'); });
await page.waitForTimeout(400);
await page.locator('#fm-grid-missing-chips .chip').first().click();
await page.waitForTimeout(200);
const cell = page.locator('#fm-pv-table tbody tr:not(.fm-prior-row) .pv-cell').first();
await cell.scrollIntoViewIfNeeded(); await cell.click(); await page.waitForTimeout(150);
await page.locator('#pv-picker button[data-grade="3"]').click();
if (await page.locator('#tab-btn-core').count()) await page.click('#tab-btn-core');
await page.locator('#rom-rows .obj-row .deg-input').first().fill('90');
await page.click('#lean-no-redflags');
await page.evaluate(() => document.getElementById('sign-note-btn').click());
await page.waitForTimeout(300);
if (await page.locator('#sign-anyway').count()) await page.locator('#sign-anyway').click();
await page.waitForTimeout(300);
ok('note is signed (frozen banner)', await page.locator('#frozen-banner').count() === 1);

const snap = () => page.evaluate(() => JSON.stringify({ fm: window.getFmData(), pins: window.getPinnedFindings(), hep: window.getHepRows(), notes: window.getAssessmentNotes() }));
const before = await snap();

// test that capsule link opens FM tab even when note is signed
if (await page.locator('.fm-capsule-open').count()) {
  await page.click('.fm-capsule-open');
  await page.waitForTimeout(200);
}

// every kind of edit a person could still attempt (real clicks, so handlers run if nothing blocks them)
const attempt = async (sel, label) => { const l = page.locator(sel).first(); if (await l.count()) { try { await l.scrollIntoViewIfNeeded({ timeout: 2000 }); await l.click({ timeout: 2000 }); } catch (e) {} await page.waitForTimeout(80); } };
await attempt('#fm-pv-table tbody tr:not(.fm-prior-row) .pv-cell', 'pv cell');
if (await page.locator('#pv-picker.open').count()) { await page.locator('#pv-picker button[data-grade="2"]').click({ timeout: 1500 }).catch(() => {}); }
ok('grade picker does not open on a signed note', await page.locator('#pv-picker.open').count() === 0);
await attempt('#fm-move-table .mv-b', 'mo/ve stepper');
await attempt('#fm-seg-table .del-seg-btn', 'delete segment');
await attempt('#fm-pv-table .del-pv-seg-btn', 'delete pv segment');

// switch to Core tab to test Core inputs are locked
if (await page.locator('#tab-btn-core').count()) await page.click('#tab-btn-core');
await attempt('#rom-rows .pin-btn', 'pin');
await attempt('#rom-rows .wnl-toggle', 'wnl');
await attempt('#rom-rows .pain-toggle', 'pain');
await attempt('#rom-rows .remove-x', 'remove row');

// switch to FM tab to test FM buttons
if (await page.locator('#tab-btn-fm').count()) await page.click('#tab-btn-fm');
await attempt('#fm-seq-from-findings', 'apply top findings to sequence');
await attempt('#fm-grid-missing-chips .chip', 'grid strip');

// switch to Core tab for gate button
if (await page.locator('#tab-btn-core').count()) await page.click('#tab-btn-core');
await attempt('#lean-no-redflags', 'gate button');
const after = await snap();
ok('FM, pins, HEP and notes are unchanged by those attempts', before === after, { before: before.length, after: after.length });
ok('ROM row still there', await page.locator('#rom-rows .obj-row').count() === 1);
ok('ROM value intact', (await page.locator('#rom-rows .deg-input').first().inputValue()) === '90');

// read-only viewing still works: switch to FM and test side toggle
if (await page.locator('#tab-btn-fm').count()) await page.click('#tab-btn-fm');
await page.click('#pv-side-toggle [data-pv-side="all"]');
ok('view controls still work (side filter)', (await page.getAttribute('.pv-container', 'data-side-view')) !== 'rt');
await page.click('#preview-open');
ok('note preview still opens', await page.locator('#note-preview.open').count() === 1);
ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]).length;
console.log(failed ? failed + ' FAILED' : 'ALL PASS'); process.exit(failed ? 1 : 0);
