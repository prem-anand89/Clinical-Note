// Print / Save-as-PDF: real PDFs from headless Chrome. Run: node tests/print-pdf.mjs
// Checks the running header, page numbers, draft vs completed status, a non-blank Ctrl+P path and that FM tables are kept together.
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const results = []; const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'cn-pdf-'));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1024, height: 1000 } })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('file://' + path.join(dir, '..', 'clinical-note.html'));
await page.waitForTimeout(200);
const tap = sel => page.evaluate(s => document.querySelector(s).click(), sel);
const pdf = async name => { const f = path.join(out, name); await page.pdf({ path: f, preferCSSPageSize: true, printBackground: true }); return f; };
const text = f => execSync('pdftotext -layout "' + f + '" -').toString();
const pages = f => Number(/Pages:\s+(\d+)/.exec(execSync('pdfinfo "' + f + '"').toString())[1]);

// Build a fairly full note with FM data so the document runs past one page.
await page.fill('#presenting-problem', Array.from({ length: 40 }, (_, i) => 'Line ' + (i + 1) + ': right knee pain on stairs after a fall, worse in the evening and when kneeling.').join('\n'));
await page.fill('#primary-hypothesis', Array.from({ length: 40 }, (_, i) => 'Reasoning line ' + (i + 1) + ' for the working hypothesis of this presentation.').join('\n'));
await tap('#region-chips [data-chip="Knee"]'); await tap('#laterality [data-val="Right"]');
await tap('#onset-mechanism [data-val="Sudden"]'); await tap('#nrs-current [data-val="7"]');
await page.evaluate(() => { Array.from(document.querySelectorAll('#aggravating-chips .chip')).slice(0, 3).forEach(c => c.click()); });
await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
await page.waitForTimeout(300);
await page.evaluate(() => { ['GE', 'CX', 'LU', 'HU', 'TA', 'PE'].forEach(c => window.addFmSegment('today', c, true, true)); window.addManualHistRow('Pa Prev', 'TA (rt)', 'Mar 2019', 'Ankle sprain', 'Full'); });
await page.waitForTimeout(300);
for (let r = 0; r < 3; r++) {
  const cell = page.locator('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)').nth(r).locator('.pv-cell').first();
  await cell.scrollIntoViewIfNeeded(); await cell.click(); await page.waitForTimeout(100);
  await page.locator('#pv-picker button[data-grade="3"]').click(); await page.waitForTimeout(100);
}
await page.evaluate(() => document.getElementById('tab-btn-core').click());
await page.evaluate(() => { document.querySelector('.preview-open').click(); });
await page.waitForTimeout(300);

// 1. Draft print via the preview
const f1 = await pdf('draft.pdf'); fs.copyFileSync(f1, process.env.KEEP_PDF || path.join(out, 'keep.pdf')); const t1 = text(f1);
ok('PDF has more than one page for a full note', pages(f1) >= 2, pages(f1));
ok('running header carries patient name and ID on every page', (t1.match(/Priya Reddy · Patient ID 00214/g) || []).length >= pages(f1), (t1.match(/Priya Reddy · Patient ID 00214/g) || []).length);
ok('page numbers read "Page n of N"', /Page 1 of \d+/.test(t1) && new RegExp('Page ' + pages(f1) + ' of ' + pages(f1)).test(t1), t1.slice(-200));
ok('draft is marked as a draft, not a signed record', /DRAFT/.test(t1) && /not a signed record/.test(t1) && !/Completed note/.test(t1));
ok('print hides the app chrome (no topbar, no Print/Close buttons)', !/Close\s+Print/.test(t1) && !/Save draft/i.test(t1));
ok('the FM chart table prints with its header', /Segment\s+Role\s+Side\s+Duration\s+Trauma\?\s+VRS/.test(t1), t1.slice(0, 600));
// no section heading stranded at the bottom of a page: the text after a form-feed must not start right after an h3-only page end
const pageTexts = t1.split('\f').filter(p => p.trim());
const stranded = pageTexts.slice(0, -1).filter(p => /\n\s*[A-Z][A-Z &/]+\s*\n\s*(Page \d+ of \d+)?\s*$/.test(p.replace(/\s+Page \d+ of \d+\s*$/, '')));
ok('no section heading is stranded at the bottom of a page', stranded.length === 0, stranded.map(p => p.slice(-120)));
await page.evaluate(() => document.getElementById('np-close').click());

// 2. Ctrl/Cmd+P with the preview closed must not print a blank page
await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
const f2 = await pdf('ctrlp.pdf'); const t2 = text(f2);
ok('Ctrl+P path prints the note, not a blank page', /Core Assessment/.test(t2) && /Priya Reddy/.test(t2), t2.slice(0, 200));
await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
ok('the preview closes again after printing', !(await page.evaluate(() => document.getElementById('note-preview').classList.contains('open'))));
ok('the page title is restored after printing', (await page.title()) === 'Thera.Net — Core Assessment', await page.title());

// 3. Completed note
await page.click('#lean-no-redflags');
await page.evaluate(() => document.getElementById('sign-note-btn').click());
await page.waitForTimeout(300);
if (await page.locator('#sign-anyway').count()) await page.locator('#sign-anyway').click();
await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector('.preview-open').click()); await page.waitForTimeout(200);
const f3 = await pdf('signed.pdf'); const t3 = text(f3);
ok('a signed note is marked Completed with a time, not Draft', /Completed note/.test(t3) && /Completed \d{2} \w{3} \d{4}/.test(t3) && !/DRAFT/.test(t3), t3.slice(0, 300));

ok('no page errors', errors.length === 0, errors);
await browser.close();
fs.rmSync(out, { recursive: true, force: true });
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
