// Module registry + the Core <-> module contract (handoff Step 5). Run: node tests/module-contract.mjs
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const cn = 'file://' + path.join(dir, '..', 'clinical-note.html');
const results = []; const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const errors = [];
async function fresh() {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.dismiss());
  await page.goto(cn); await page.waitForTimeout(300);
  return page;
}
async function grade(page, seg, plane, side, g) {
  const idx = await page.evaluate(s => Array.from(document.querySelectorAll('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)')).findIndex(tr => (tr.querySelector('.pv-seg-name') || {}).value === s), seg);
  const cell = page.locator('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)').nth(idx).locator(`.pv-cell[data-plane="${plane}"][data-side="${side}"]`);
  await cell.scrollIntoViewIfNeeded(); await cell.click(); await page.waitForTimeout(80);
  await page.locator(`#pv-picker button[data-grade="${g}"]`).click(); await page.waitForTimeout(80);
}

// a real tap on the picker's tick (a script-set value would skip the click that the app listens to)
async function toggleTreated(page, seg, plane, side) {
  const idx = await page.evaluate(s => Array.from(document.querySelectorAll('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)')).findIndex(tr => (tr.querySelector('.pv-seg-name') || {}).value === s), seg);
  const cell = page.locator('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)').nth(idx).locator(`.pv-cell[data-plane="${plane}"][data-side="${side}"]`);
  await cell.scrollIntoViewIfNeeded(); await cell.click(); await page.waitForTimeout(100);
  await page.locator('#pv-picker [data-act="treated"]').click(); await page.waitForTimeout(500);
}
let page = await fresh();
// ---- registry shape: extended, not replaced
const reg = await page.evaluate(() => window.MODULE_REGISTRY.map(m => ({ label: m.label, fn: m.fn, group: m.group, placement: m.placement })));
ok('the registry still has 23 entries, each with label / fn / group', reg.length === 23 && reg.every(m => m.label && m.fn && m.group), reg.length);
const count = k => reg.filter(m => m.placement === k).length;
ok('every entry declares a placement: 10 inline · 10 tab · 3 profile', reg.every(m => ['inline', 'tab', 'profile'].includes(m.placement)) && count('inline') === 10 && count('tab') === 10 && count('profile') === 3, [count('inline'), count('tab'), count('profile')]);
ok('Facial Palsy, Vestibular, Cardiothoracic are Patient Profile modules, not tabs', ['Facial Palsy', 'Vestibular', 'Cardiothoracic Assessment'].every(l => reg.find(m => m.label === l).placement === 'profile'));
ok('the old `tab: true` flag is gone', !(await page.evaluate(() => window.MODULE_REGISTRY.some(m => 'tab' in m))));
ok('only FM implements the contract today; the other tab modules are skipped', await page.evaluate(() => window.CoreModules.list().map(m => m.id).join() === 'fm'));

// ---- nothing shows while FM is not in the note
ok('no module line, no module print block, no sign warning with FM off', await page.evaluate(() => window.CoreModules.summaries().length === 0 && window.CoreModules.printBlocks('sec-objective').length === 0 && window.CoreModules.signWarnings().length === 0));

// ---- FM through the contract
await page.evaluate(() => window.openAdvancedModule('fascial-manipulation')); await page.waitForTimeout(300);
await page.evaluate(() => ['CX', 'GE'].forEach(c => window.addFmSegment('today', c, true, true))); await page.waitForTimeout(300);
ok('badge(): 0 graded points to start', await page.evaluate(() => window.CoreModules.badge('fm')) === 0);
await grade(page, 'CX', 'RE-LA', 'rt', '2'); await grade(page, 'GE', 'RE-LA', 'rt', '2');
await page.waitForTimeout(300);
ok('badge() counts graded points', await page.evaluate(() => window.CoreModules.badge('fm')) === 2);
// treat CX via the grade picker's tick -> chip auto-ticks through the registry
const chip = '#manual-therapy-chips [data-chip="Fascial Manipulation (FM)"]';
const isOn = () => page.evaluate(c => document.querySelector(c).classList.contains('selected'), chip);
ok('before anything is treated the FM Intervention chip is off', !(await isOn()));
await toggleTreated(page, 'CX', 'RE-LA', 'rt');
ok('treating a point ticks the chip (data-auto="fm")', (await isOn()) && (await page.getAttribute(chip, 'data-auto')) === 'fm');
await toggleTreated(page, 'CX', 'RE-LA', 'rt');
ok('un-treating clears the auto-ticked chip', !(await isOn()));
await toggleTreated(page, 'CX', 'RE-LA', 'rt');

// summaryLine -> Key Findings strip, not the cross-references
await page.evaluate(() => document.getElementById('tab-btn-core').click()); await page.waitForTimeout(500);
const strip = await page.evaluate(() => [...document.querySelectorAll('#ci-key-findings .kf-pill.kf-mod')].map(p => p.textContent.trim()));
ok('FM appears as a module pill in the Key Findings strip', strip.length === 1 && /^FM: .* · 1 point treated$/.test(strip[0]), strip);
ok('the cross-references no longer carry the FM line', !/FM:/.test(await page.textContent('#ci-cross-refs')));
await page.locator('#ci-key-findings .kf-pill.kf-mod').click(); await page.waitForTimeout(500);
ok('clicking the module pill opens that module\'s tab', await page.evaluate(() => window.getActiveModuleTab() === 'fm'));

// printBlock -> preview, in FM's declared slot (still inside Objective)
await page.evaluate(() => document.getElementById('tab-btn-core').click());
await page.evaluate(() => document.querySelector('.preview-open').click()); await page.waitForTimeout(300);
const pv = await page.evaluate(() => document.getElementById('np-body').textContent.replace(/\s+/g, ' '));
const iObj = pv.indexOf('Objective'), iFm = pv.indexOf('Fascial Manipulation', iObj), iImp = pv.indexOf('Clinical Impression', iObj);
ok('FM prints where it always did: after Objective, before Clinical Impression', iObj > -1 && iFm > iObj && iFm < iImp, [iObj, iFm, iImp]);
await page.evaluate(() => document.getElementById('np-close').click());

// a second module through the same contract — no Core code changes, only a registry entry
await page.evaluate(() => {
  window.MODULE_REGISTRY.push({ group: 'Test', label: 'Temp module', fn: 'noop', placement: 'tab', id: 'tmp', tabKey: 'tmp', enabled: () => true,
    summaryLine: () => 'TMP: one line', printBlock: () => '<h4>Temp module block</h4>', signWarning: () => 'TMP: 3 items open' });
  window.Lean.refresh();
});
await page.waitForTimeout(500);
ok('a new registry entry gets a strip pill with no Core change', await page.evaluate(() => [...document.querySelectorAll('#ci-key-findings .kf-pill.kf-mod')].some(p => p.textContent === 'TMP: one line')));
await page.evaluate(() => document.querySelector('.preview-open').click()); await page.waitForTimeout(300);
const pv2 = await page.evaluate(() => document.getElementById('np-body').textContent.replace(/\s+/g, ' '));
ok('a module without a Core slot prints after Core (after Plan & Goals)', pv2.indexOf('Temp module block') > pv2.lastIndexOf('Plan'), [pv2.indexOf('Temp module block'), pv2.lastIndexOf('Plan')]);
await page.evaluate(() => document.getElementById('np-close').click());

// sign check: module warnings are warnings only
await page.click('#lean-no-redflags');
await page.evaluate(() => document.getElementById('sign-note-btn').click()); await page.waitForTimeout(300);
const chk = await page.textContent('#sign-check');
ok('the sign check lists open module items as a warning', /Open in a module/.test(chk) && /TMP: 3 items open/.test(chk), chk);
ok('...with "Sign anyway" available (never a block)', await page.locator('#sign-anyway').count() === 1);
await page.locator('#sign-anyway').click(); await page.waitForTimeout(300);
ok('signing anyway completes the note', await page.evaluate(() => document.body.classList.contains('note-locked')));
await page.close();

// ---- FM's own warning: planned points not marked treated
page = await fresh();
await page.evaluate(() => window.openAdvancedModule('fascial-manipulation')); await page.waitForTimeout(300);
await page.evaluate(() => ['CX', 'GE'].forEach(c => window.addFmSegment('today', c, true, true))); await page.waitForTimeout(300);
await grade(page, 'CX', 'RE-LA', 'rt', '2'); await grade(page, 'GE', 'RE-LA', 'rt', '2'); await page.waitForTimeout(300);
await page.locator('#fm-pattern-chips .fm-pattern-chip').first().scrollIntoViewIfNeeded();
await page.locator('#fm-pattern-chips .fm-pattern-chip').first().click(); await page.waitForTimeout(300);
ok('two planned, none treated -> FM warning reads "2 planned points not marked treated"', await page.evaluate(() => window.CoreModules.signWarnings().join() === 'FM: 2 planned points not marked treated'), await page.evaluate(() => window.CoreModules.signWarnings()));
await toggleTreated(page, 'CX', 'RE-LA', 'rt');
ok('treating one leaves "1 planned point not marked treated"', await page.evaluate(() => window.CoreModules.signWarnings().join() === 'FM: 1 planned point not marked treated'));
await page.close();

// ---- Core add-ons: one call adds a "+" chip
page = await fresh();
const before = await page.evaluate(() => window.Lean.addons().length);
ok('Lean.addons() lists every Core add-on with its section', before > 25 && await page.evaluate(() => window.Lean.addons().every(a => a.id && a.label && a.section && a.bar)), before);
await page.evaluate(() => { const c = document.createElement('div'); c.id = 'card-newthing'; c.className = 'card lean-tucked'; c.textContent = 'New thing'; document.getElementById('sec-objective').appendChild(c); window.Lean.addon('obj-more', { id: 'o-new', label: 'New thing', targets: ['#card-newthing'] }); });
await page.waitForTimeout(200);
ok('one Lean.addon() call adds a chip to the section\'s "+" bar and to the add-on list', await page.evaluate(() => !!document.querySelector('#lean-more-obj-more [data-lean-group="o-new"]')) && (await page.evaluate(() => window.Lean.addons().length)) === before + 1);
await page.evaluate(() => document.querySelector('#lean-more-obj-more [data-lean-group="o-new"]').click());
ok('...and it opens its card like every other add-on', await page.evaluate(() => document.getElementById('card-newthing').classList.contains('lean-shown')));
await page.close();

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
