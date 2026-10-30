// Core layout compaction (handoff Step 1): fewer cards, nothing orphaned, Known condition in Section 1 with a read-only echo in Impression.
// Run: node tests/core-layout-step1.mjs
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const results = []; const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const errors = [];
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', d => d.dismiss());
await page.goto('file://' + path.join(dir, '..', 'clinical-note.html'));
await page.waitForTimeout(300);
const inside = (child, parent) => page.evaluate(([c, p]) => { const a = document.querySelector(c), b = document.querySelector(p); return !!(a && b && b.contains(a)); }, [child, parent]);

const cards = await page.evaluate(() => [...document.querySelectorAll('main .card')].filter(e => e.offsetParent !== null && e.getBoundingClientRect().height > 0).length);
ok('a blank note shows at most 13 cards (16 before)', cards <= 13, cards);

// 1b pairs
ok('Side and Onset share one row', await inside('#laterality', '.cc-pair') && await page.evaluate(() => document.getElementById('laterality').closest('.cc-pair') === document.getElementById('onset-mechanism').closest('.cc-pair')));
ok('Since and Course share one row', await page.evaluate(() => document.getElementById('onset-timeline-chips').closest('.cc-pair') === document.getElementById('episode-pattern').closest('.cc-pair')));
ok('Mechanism / surgery reveals stay full width below the pair', !(await inside('#reveal-sudden', '.cc-pair')) && !(await inside('#reveal-surgical', '.cc-pair')));

// 1c Functional priority in the Chief Complaint card
const ccCard = '#sec-chief-complaint .card';
for (const id of ['fp-limited', 'lean-fp-return', 'fp-return', 'create-psfs', 'create-psfs-note'])
  ok('#' + id + ' lives in the first Chief Complaint card', await page.evaluate(([i]) => { const el = document.getElementById(i), c = document.querySelector('#sec-chief-complaint .card'); return !!(el && c && c.contains(el)); }, [id]));

// 1d one safety card
ok('precautions sit inside the safety gate card', await inside('#blood-thinner-yn', '#lean-safety-gate') && await inside('#implants-yn', '#lean-safety-gate') && await inside('#pregnancy-status', '#lean-safety-gate'));
ok('the old separate precautions card is gone (id kept on an inner block)', !(await page.evaluate(() => document.getElementById('safety-flags-card').classList.contains('card'))));

// 1e quiet risk line
const risk = await page.evaluate(() => { const r = document.getElementById('risk-summary-card'); const cs = getComputedStyle(r); return { txt: r.textContent.trim(), border: cs.borderTopWidth }; });
ok('empty risk line still reads "No risks recorded" but has no box', /No risks recorded/.test(risk.txt) && risk.border === '0px', risk);

// 1f Phase in the Plan card with its drift siblings
for (const id of ['plan-phase', 'phase-recommended-note', 'lean-phase-note', 'drift-banner', 'drift-reason-field', 'drift-reason'])
  ok('#' + id + ' lives in the Plan card', await page.evaluate(([i]) => { const el = document.getElementById(i), h = [...document.querySelectorAll('.card-heading')].find(x => x.textContent.trim() === 'Plan'); return !!(el && h && h.parentElement.contains(el)); }, [id]));

// 1g three reasoning chips
const chipTxt = await page.evaluate(() => [...document.querySelectorAll('#sec-clinical-impression .add-link, #sec-clinical-impression .lean-more-chip, #sec-clinical-impression button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
for (const l of ['Differential & evidence', 'Impairments & ICF', 'Contributing factors'])
  ok('Impression has a "+ ' + l + '" chip', chipTxt.some(t => t.includes(l)), chipTxt.slice(0, 12));
ok('the old single "Deep reasoning & ICF" chip is gone', !chipTxt.some(t => /Deep reasoning/.test(t)));

// 1h Known condition: Section 1, one field, echo in Impression
ok('Known condition field lives in Section 1', await inside('#known-condition-field', '#sec-chief-complaint') && !(await inside('#known-condition-field', '#sec-clinical-impression')));
ok('there is exactly one Known condition field', await page.locator('#known-condition-field').count() === 1);
ok('Impression echo is hidden while nothing is chosen', await page.locator('#ci-known-condition').isHidden());
await page.locator('#known-condition-toggle-row .subsection-toggle').click();
await page.waitForTimeout(150);
ok('the + toggle opens the condition chooser', await page.locator('#known-condition-field').isVisible());
await page.locator('#kc-postop [data-template-id="postop-tkr"]').click();
await page.waitForTimeout(400);
ok('choosing Post-op TKR sets the region to Knee', await page.evaluate(() => /Knee/.test(document.getElementById('region').value) || !!document.querySelector('#region-chips .chip.selected[data-chip="Knee"]')));
const echo = await page.textContent('#ci-known-condition');
ok('Impression now echoes it read-only', await page.locator('#ci-known-condition').isVisible() && /TKR/i.test(echo), echo);
ok('the echo has no inputs (display only)', await page.locator('#ci-known-condition input, #ci-known-condition button').count() === 0);
await page.locator('#ci-known-condition a').click();
await page.waitForTimeout(1200);
ok('the echo link scrolls back to the Section 1 row', await page.evaluate(() => { const r = document.getElementById('known-condition-toggle-row').getBoundingClientRect(); return r.top > 0 && r.bottom < window.innerHeight; }));

// review fixes: one name, region on one line, preview prints non-template conditions
ok('one name for the row: Known diagnosis / referral', await page.evaluate(() => /Known diagnosis \/ referral/.test(document.getElementById('known-condition-toggle-row').textContent) && /Known diagnosis \/ referral/.test(document.querySelector('#known-condition-field > label').textContent) && !/Known Condition/.test(document.querySelector('#known-condition-field > label').textContent)));
ok('region chips fit on one line at 1280px', await page.evaluate(() => { const t = [...document.querySelectorAll('#region-chips .chip')].map(c => Math.round(c.getBoundingClientRect().top)); return new Set(t).size === 1; }));
ok('the "+ Select" link sits beside its label, not at the far edge', await page.evaluate(() => { const r = document.getElementById('known-condition-toggle-row'); return r.querySelector('.subsection-toggle').getBoundingClientRect().left - r.firstElementChild.getBoundingClientRect().right < 40; }));
await page.locator('#kc-neuro [data-chip="Parkinson\'s"]').click();
await page.evaluate(() => document.querySelector('.preview-open').click()); await page.waitForTimeout(250);
ok('preview prints a neuro Known condition (was template-only)', await page.evaluate(() => /Known condition:\s*Parkinson/.test(document.getElementById('note-preview').textContent)));
ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
