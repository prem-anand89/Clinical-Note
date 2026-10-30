// FM Step 1 (CLAUDE_HANDOFF_FM_FIXES.md): tokens, Card 1 blank defaults + routing (onset/VRS/secondary),
// FM History fields + index surgery, FM Intervention chip + Impression cross-refs. Run: node tests/fm-step1-wiring.mjs
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const results = []; const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const norm = s => (s || '').replace(/\s+/g, ' ').trim();
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const errors = [];
async function fresh(width = 1024) {
  const page = await (await browser.newContext({ viewport: { width, height: 1000 } })).newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.join(dir, '..', 'clinical-note.html'));
  await page.waitForTimeout(200);
  return page;
}
// Click through the DOM (some chips live inside collapsed "+" groups).
const tap = (page, sel) => page.evaluate(s => document.querySelector(s).click(), sel);
const segRows = page => page.evaluate(() => Array.from(document.querySelectorAll('#fm-seg-table tbody tr')).map(tr => ({
  seg: tr.querySelector('.seg-name').value, side: tr.querySelector('.seg-side').value, trauma: tr.querySelector('.seg-onset').value,
  vrs: tr.querySelector('.seg-vrs').value, painful: tr.querySelector('.seg-painful').value, dur: tr.children[2].querySelector('input').value,
  auto: tr.classList.contains('fm-auto-row'), src: tr.getAttribute('data-fm-source') })));

// ---- 1a tokens
{
  const page = await fresh();
  const t = await page.evaluate(() => ({
    bar: getComputedStyle(document.getElementById('module-tab-bar')).backgroundColor,
    rust: getComputedStyle(document.documentElement).getPropertyValue('--rust').trim(),
    moss: getComputedStyle(document.documentElement).getPropertyValue('--moss').trim() }));
  ok('1a: sticky module tab bar has a solid background', t.bar !== 'rgba(0, 0, 0, 0)' && t.bar !== 'transparent', t);
  ok('1a: --rust and --moss are defined', !!t.rust && !!t.moss, t);
  await page.close();
}

// ---- 1f blank defaults
{
  const page = await fresh();
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.addFmSegment('today', 'GE', false, true));
  const r = (await segRows(page))[0];
  ok('1f: a fresh manual row has blank Side and blank Trauma?', r.side === '' && r.trauma === '', r);
  const head = await page.evaluate(() => Array.from(document.querySelectorAll('#fm-seg-table thead th')).map(th => th.textContent.replace(/\s+/g, ' ').trim()));
  ok('1f: Onset column is renamed Trauma?', head.includes('Trauma?') && !head.includes('Onset'), head);
  const d = await page.evaluate(() => window.getFmData().segments[0]);
  ok('1f: getFmData exports blank side/trauma as empty strings', d.side === '' && d.trauma === '', d);
  await page.close();
}

// ---- 1b primary complaint -> Card 1 (onset + VRS), Card 5 Pre
{
  const page = await fresh();
  await tap(page, '#region-chips [data-chip="Knee"]');
  await tap(page, '#laterality [data-val="Right"]');
  await tap(page, '#onset-mechanism [data-val="Sudden"]');
  await tap(page, '#nrs-current [data-val="7"]');
  await page.evaluate(() => { Array.from(document.querySelectorAll('#aggravating-chips .chip')).slice(0, 2).forEach(c => c.click()); });
  await page.waitForTimeout(300);
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
  await page.waitForTimeout(300);
  let rows = await segRows(page);
  ok('1b: Knee/Right/Sudden/NRS 7 routes GE, rt, Trauma Y, VRS 7', rows.length === 1 && rows[0].seg === 'GE' && rows[0].side === 'rt' && rows[0].trauma === 'Y' && rows[0].vrs === '7', rows);
  ok('1b: routed row is still an auto row (not adopted)', rows[0].auto === true, rows[0]);
  const pre = await page.textContent('#fm-move-table .move-prevrs');
  ok('1b: Card 5 Pre is pre-filled from the routed VRS', norm(pre) === '7', pre);
  // therapist edits VRS by hand -> routing must stop touching it
  const vrs = page.locator('#fm-seg-table tbody tr').first().locator('.seg-vrs');
  await vrs.fill('9'); await vrs.dispatchEvent('input');
  await tap(page, '#nrs-current [data-val="3"]');
  await page.waitForTimeout(300);
  rows = await segRows(page);
  ok('1b: a hand-edited VRS survives a later NRS change', rows[0].vrs === '9' && rows[0].auto === false, rows);
  // no onset chosen -> blank
  await page.close();
  const p2 = await fresh();
  await tap(p2, '#region-chips [data-chip="Knee"]');
  await p2.waitForTimeout(200);
  await p2.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
  const r2 = (await segRows(p2))[0];
  ok('1b: no onset and no NRS chosen leaves Trauma? and VRS blank', r2 && r2.trauma === '' && r2.vrs === '', r2);
  await p2.close();
}

// ---- 1c secondary complaint + row order
{
  const page = await fresh();
  await page.evaluate(() => document.getElementById('add-secondary').click());
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    const card = document.querySelector('#secondary-rows .repeatable-card');
    card.querySelector('.sec-region-chips [data-chip="Ankle / Foot"]').click();
    card.querySelector('[id$="-lat"] [data-val="Right"]').click();
    card.querySelector('[id$="-onset"] [data-val="Insidious"]').click();
    const inp = card.querySelector('input[placeholder="Other unlisted factors"]');
    inp.value = 'Morning stiffness'; inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  // primary added AFTER the secondary
  await tap(page, '#region-chips [data-chip="Knee"]');
  await tap(page, '#laterality [data-val="Right"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
  await page.waitForTimeout(300);
  const rows = await segRows(page);
  const sec = rows.find(r => r.seg === 'TA');
  ok('1c: secondary complaint routes TA, rt, Trauma N, empty duration', sec && sec.side === 'rt' && sec.trauma === 'N' && sec.dur === '', rows);
  ok('1c: secondary free text lands in Painful Movements', sec && sec.painful.includes('Morning stiffness'), sec);
  ok('1c: primary complaint row stays first even when routed second', rows[0] && rows[0].src === 'primary-complaint', rows);
  await page.close();
}

// ---- 1d FM History: named fields, deletion, index surgery
{
  const page = await fresh();
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
  await page.evaluate(() => document.getElementById('add-trauma-row').click());
  await page.waitForTimeout(100);
  const named = await page.evaluate(() => Array.from(document.querySelectorAll('#trauma-history-rows [data-hist-field]')).map(e => e.getAttribute('data-hist-field')));
  ok('1d: history row fields carry data-hist-field', ['date', 'region', 'side', 'detail', 'recovery'].every(f => named.includes(f)), named);
  await page.evaluate(() => {
    const row = document.querySelector('#trauma-history-rows > div');
    row.querySelector('[data-hist-field="date"]').value = '2019-03-01';
    const reg = row.querySelector('[data-hist-field="region"]'); reg.value = 'Ankle'; reg.dispatchEvent(new Event('change', { bubbles: true }));
    const sd = row.querySelector('[data-hist-field="side"]'); sd.value = 'Right'; sd.dispatchEvent(new Event('change', { bubbles: true }));
    const dt = row.querySelector('[data-hist-field="detail"]'); dt.value = 'Sprain'; dt.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  let hist = await page.evaluate(() => Array.from(document.querySelectorAll('#fm-hist-table tbody tr')).map(tr => Array.from(tr.querySelectorAll('input,select')).map(e => e.value).join('|')));
  ok('1d: an injury in History appears in FM History with the Stecco segment', hist.length === 1 && /\|TA /.test(hist[0]) && /Sprain/.test(hist[0]), hist);
  await page.evaluate(() => document.querySelector('#trauma-history-rows .icon-btn').click());
  await page.waitForTimeout(300);
  hist = await page.evaluate(() => document.querySelectorAll('#fm-hist-table tbody tr:not(#fm-hist-empty)').length);
  ok('1d: deleting it removes it from FM History', hist === 0 || (await page.evaluate(() => document.querySelectorAll('#fm-hist-table tbody tr').length)) === 0, hist);
  // index surgery
  await tap(page, '#onset-mechanism [data-val="Post-Surgical"]');
  await tap(page, '#surg-category-chips [data-chip="Knee"]');
  await page.evaluate(() => { document.getElementById('surgery-type').value = 'TKR'; const d = document.getElementById('surgery-date'); d.value = '2026-09-01'; d.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(300);
  hist = await page.evaluate(() => Array.from(document.querySelectorAll('#fm-hist-table tbody tr')).map(tr => Array.from(tr.querySelectorAll('input,select')).map(e => e.value).join('|')));
  ok('1d: Post-Surgical index surgery appears in FM History tagged (index) with GE', hist.length === 1 && /GE/.test(hist[0]) && /TKR \(index\)/.test(hist[0]), hist);
  await tap(page, '#onset-mechanism [data-val="Insidious"]');
  await page.waitForTimeout(300);
  hist = await page.evaluate(() => document.querySelectorAll('#fm-hist-table tbody tr[data-manual], #fm-hist-table tbody tr .hist-seg').length);
  ok('1d: switching onset away from Post-Surgical removes the index row', hist === 0, hist);
  // manual rows survive
  await page.evaluate(() => window.addManualHistRow('Pa Prev', 'LU', '', 'Back pain', 'Full'));
  await tap(page, '#onset-mechanism [data-val="Post-Surgical"]');
  await page.waitForTimeout(300);
  const manual = await page.evaluate(() => document.querySelectorAll('#fm-hist-table tbody tr[data-manual="true"]').length);
  ok('1d: manual FM History rows survive a sync', manual === 1, manual);
  await page.close();
}

// ---- 1e FM chip + cross-refs (uses the real grade picker, including its treated tick)
{
  const page = await fresh();
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.addFmSegment('today', 'GE', true, true));
  await page.waitForTimeout(200);
  const cell = page.locator('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)').first().locator('.pv-cell').first();
  await cell.scrollIntoViewIfNeeded();
  const openPicker = async () => { await cell.click(); await page.waitForTimeout(120); };
  const setTreated = async () => { await openPicker(); await page.locator('#pv-picker [data-act="treated"]').click(); await page.waitForTimeout(500); };
  await openPicker(); await page.locator('#pv-picker button[data-grade="3"]').click(); await page.waitForTimeout(300);
  const chip = '#manual-therapy-chips [data-chip="Fascial Manipulation (FM)"]';
  const isOn = () => page.evaluate(c => document.querySelector(c).classList.contains('selected'), chip);
  ok('1e: grading without treating does not select the FM chip', !(await isOn()));
  await setTreated();
  ok('1e: treating a point selects the FM Intervention chip', await isOn());
  await page.waitForTimeout(400);
  const refs = await page.evaluate(() => document.getElementById('ci-key-findings').textContent.replace(/\s+/g, ' ').trim());
  ok('1e: Clinical Impression Key Findings strip mentions FM and the treated count', /FM:/.test(refs) && /1 point treated/.test(refs), refs);
  await setTreated(); // toggle treated off
  ok('1e: un-treating clears the auto-selected chip', !(await isOn()));
  await setTreated(); // treated again -> auto on
  await page.evaluate(() => document.getElementById('tab-btn-core').click());
  await page.waitForTimeout(200);
  const quick = '#lean-quick-tx [data-quick-tx="Fascial Manipulation (FM)"]';
  ok('1e: the quick treatment row shows an FM chip once FM is in the note', await page.locator(quick).isVisible());
  ok('1e: the quick FM chip reflects the auto selection', await page.evaluate(q => document.querySelector(q).classList.contains('selected'), quick));
  await page.locator(quick).click(); await page.waitForTimeout(400); // therapist unticks while a point is still treated
  ok('1e: an untick by the therapist sticks while points stay treated', !(await isOn()));
  await page.locator(quick).click(); await page.waitForTimeout(100); // re-ticks: now the therapist's
  await page.evaluate(() => document.getElementById('tab-btn-fm').click());
  await page.waitForTimeout(150);
  await cell.scrollIntoViewIfNeeded();
  await setTreated(); // untreat via the picker
  ok('1e: a chip the therapist re-ticked is not auto-cleared', await isOn());
  await page.close();
}

// ---- 1f phone fit
{
  const page = await fresh(390);
  await tap(page, '#region-chips [data-chip="Knee"]');
  await tap(page, '#laterality [data-val="Right"]');
  await tap(page, '#onset-mechanism [data-val="Sudden"]');
  await tap(page, '#nrs-current [data-val="7"]');
  await page.evaluate(() => { const c = document.querySelector('#onset-timeline-chips .chip'); if (c) c.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
  await page.waitForTimeout(300);
  const clipped = await page.evaluate(() => Array.from(document.querySelectorAll('#fm-seg-table tbody tr:first-child input, #fm-seg-table tbody tr:first-child select')).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.className + ':' + e.value));
  ok('1f: no Card 1 field clips its text at 390 px', clipped.length === 0, clipped);
  const wrapOverflow = await page.evaluate(() => { const w = document.getElementById('fm-seg-wrap'); return w.scrollWidth <= w.clientWidth; });
  ok('1f: no horizontal scroll in the segment area at 390 px', wrapOverflow);
  await page.close();
}

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
