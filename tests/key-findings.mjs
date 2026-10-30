// Key Findings strip in Impression (handoff Step 4). Run: node tests/key-findings.mjs
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
async function fresh(w = 1280) {
  const page = await (await browser.newContext({ viewport: { width: w, height: 1000 } })).newPage();
  page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.dismiss());
  await page.goto(cn); await page.waitForTimeout(300);
  return page;
}
const pills = page => page.evaluate(() => [...document.querySelectorAll('#ci-key-findings .kf-pill')].map(p => ({ k: p.className.replace(/.*kf-(\w+)$/, '$1'), t: p.textContent.trim() })));
const settle = page => page.waitForTimeout(450);
const tap = (page, s) => page.evaluate(x => document.querySelector(x).click(), s);

let page = await fresh();
ok('a blank note shows no strip', await page.locator('#ci-key-findings').isHidden());
ok('the strip sits at the top of Impression, above the cross-references', await page.evaluate(() => { const k = document.getElementById('ci-key-findings'), c = document.getElementById('ci-cross-refs'); return !!k && k.nextElementSibling === c && document.getElementById('sec-clinical-impression').contains(k); }));

// subjective
await tap(page, '#region-chips [data-chip="Knee"]'); await tap(page, '#laterality [data-val="Right"]');
await tap(page, '#onset-mechanism [data-val="Sudden"]'); await tap(page, '#nrs-current [data-val="7"]');
await settle(page);
let p = await pills(page);
ok('subjective pill: "R Knee · Sudden · NRS 7/10"', p.length === 1 && p[0].k === 'subj' && p[0].t === 'R Knee · Sudden · NRS 7/10', p);

// ROM: painful, gap > 10, gap exactly 10, no gap
await page.evaluate(() => ['Flexion', 'Extension', 'Abduction', 'Adduction'].forEach(n => window.leanSuggest.add('rom', n))); await page.waitForTimeout(200);
const rom = page.locator('#rom-rows .obj-row');
const fill = async (row, side, v) => row.locator('.side-block').nth(side).locator('.deg-input').first().fill(String(v));
await fill(rom.nth(0), 0, 95); await fill(rom.nth(0), 1, 140);               // Flexion: gap 45
await fill(rom.nth(1), 0, 0); await fill(rom.nth(1), 1, 10);                  // Extension: gap exactly 10 -> not a deficit
await fill(rom.nth(2), 0, 40); await rom.nth(2).locator('.side-block').nth(0).locator('.pain-toggle').click(); // Abduction: painful, no gap data
await fill(rom.nth(3), 0, 20); await fill(rom.nth(3), 1, 25);                 // Adduction: gap 5
await settle(page);
p = await pills(page);
const romP = p.filter(x => x.k === 'rom');
ok('a left/right gap over 10° is a deficit (Flexion Δ45°)', romP.some(x => /^Flexion/.test(x.t) && /Δ45°/.test(x.t)), romP);
ok('a gap of exactly 10° is not (Extension absent)', !romP.some(x => /^Extension/.test(x.t)), romP);
ok('a painful side is a deficit even without a gap (Abduction ⚡), with no empty-side noise', romP.some(x => /^Abduction/.test(x.t) && /⚡/.test(x.t) && !/—/.test(x.t)), romP);
ok('a small gap with no pain is not (Adduction absent)', !romP.some(x => /^Adduction/.test(x.t)), romP);
// WNL side must not be counted as 0
await rom.nth(1).locator('.side-block').nth(0).locator('.wnl-toggle').click(); await fill(rom.nth(1), 1, 180); await settle(page);
ok('a Full / WNL side is never read as a number, so no false gap', !(await pills(page)).some(x => x.k === 'rom' && /^Extension/.test(x.t)));
// removing the pain clears the pill
await rom.nth(2).locator('.side-block').nth(0).locator('.pain-toggle').click(); await settle(page);
ok('clearing the pain flag removes its pill', !(await pills(page)).some(x => /^Abduction/.test(x.t)));

// MMT
await page.evaluate(() => window.leanSuggest.add('mmt', 'Quadriceps')); await page.waitForTimeout(200);
const mmt = page.locator('#mmt-rows .obj-row').first();
await mmt.locator('.side-block').nth(0).locator('.mrc-numbers [data-val="4"]').click();
await mmt.locator('.side-block').nth(1).locator('.mrc-numbers [data-val="5"]').click();
await settle(page);
p = await pills(page);
ok('MMT below 5 gives a pill naming only the weak side', p.some(x => x.k === 'mmt' && /^Quadriceps/.test(x.t) && /4/.test(x.t) && !/5\/5/.test(x.t)), p);
await mmt.locator('.side-block').nth(0).locator('.mrc-numbers [data-val="5"]').click(); await settle(page);
ok('5/5 on both sides gives no MMT pill', !(await pills(page)).some(x => x.k === 'mmt'));

// special tests
await page.evaluate(() => { window.leanSuggest.add('specialtest', 'Lachman'); window.leanSuggest.add('specialtest', 'Anterior drawer'); }); await page.waitForTimeout(200);
const st = page.locator('#specialtest-rows .obj-row');
await st.nth(0).locator('.segmented [data-val="Positive"]').click();
await st.nth(1).locator('.segmented [data-val="Equivocal"]').click();
await settle(page);
p = await pills(page);
ok('a Positive special test gets a pill; Equivocal does not', p.some(x => x.k === 'test' && /Lachman positive/.test(x.t)) && !p.some(x => /Anterior drawer/.test(x.t)), p);

// read-only + jump
ok('the strip has no inputs (display only)', await page.locator('#ci-key-findings input, #ci-key-findings select, #ci-key-findings textarea').count() === 0);
const before = await page.evaluate(() => document.querySelectorAll('.obj-row').length);
await page.locator('#ci-key-findings .kf-pill.kf-test').first().click(); await page.waitForTimeout(900);
const jumped = await page.evaluate(() => { const r = [...document.querySelectorAll('#specialtest-rows .obj-row')][0].getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
ok('clicking a pill scrolls to the row it came from and edits nothing', jumped && (await page.evaluate(() => document.querySelectorAll('.obj-row').length)) === before, jumped);
// jump works from the FM tab and from a collapsed section
await page.evaluate(() => window.openAdvancedModule('fascial-manipulation')); await page.waitForTimeout(300);
await page.evaluate(() => { document.getElementById('sec-objective') && document.getElementById('sec-objective').classList.add('sec-lean-collapsed'); });
await page.evaluate(() => document.querySelector('#ci-key-findings .kf-pill.kf-rom').click()); await page.waitForTimeout(900);
ok('jumping from another tab returns to Core and expands a collapsed section', await page.evaluate(() => window.getActiveModuleTab() === 'core' && !document.getElementById('sec-objective').classList.contains('sec-lean-collapsed')));

// cap
await page.evaluate(() => { for (let i = 0; i < 16; i++) { const r = window.leanSuggest.add('specialtest', 'Test ' + i); if (r) r.querySelector('.segmented [data-val="Positive"]').click(); } }); await settle(page);
ok('more than 12 findings: 12 pills and a "+N more" note', (await page.locator('#ci-key-findings .kf-pill').count()) === 12 && /\+\d+ more/.test(await page.textContent('#ci-key-findings')));

// signed note: pills still navigate (reading aid) and nothing is editable through them
await page.evaluate(() => document.getElementById('tab-btn-core').click());
await page.click('#lean-no-redflags');
await page.evaluate(() => document.getElementById('sign-note-btn').click()); await page.waitForTimeout(300);
if (await page.locator('#sign-anyway').count()) await page.locator('#sign-anyway').click();
await page.waitForTimeout(300);
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
await page.evaluate(() => document.querySelector('#ci-key-findings').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(500);
await page.locator('#ci-key-findings .kf-pill.kf-subj').click({ force: true }); await page.waitForTimeout(900);
ok('on a signed note a pill still jumps to its source', await page.evaluate(() => { const r = document.getElementById('sec-chief-complaint').getBoundingClientRect(); window.__dbg = [document.body.classList.contains('note-locked'), Math.round(r.top), Math.round(r.bottom), innerHeight, Math.round(scrollY)]; return r.top < innerHeight && r.bottom > 0; }), await page.evaluate(() => window.__dbg));
await page.close();

// phone
page = await fresh(390);
await tap(page, '#region-chips [data-chip="Knee"]'); await tap(page, '#nrs-current [data-val="7"]');
await page.evaluate(() => window.leanSuggest.add('rom', 'Flexion')); await page.waitForTimeout(200);
await page.locator('#rom-rows .obj-row .side-block').nth(0).locator('.pain-toggle').click(); await settle(page);
ok('390px: strip wraps without sideways scroll', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await page.close();

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
