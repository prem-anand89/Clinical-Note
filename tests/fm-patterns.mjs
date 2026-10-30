// Pattern chips in Card 4: grade-1 never counts, each segment counts once, a tap adds that pattern's own points.
// Run: node tests/fm-patterns.mjs
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const results = []; const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const errors = [];
async function fresh(segs) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.dismiss());
  await page.goto('file://' + path.join(dir, '..', 'clinical-note.html'));
  await page.waitForTimeout(200);
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
  await page.waitForTimeout(300);
  await page.evaluate(s => s.forEach(c => window.addFmSegment('today', c, true, true)), segs);
  await page.waitForTimeout(300);
  return page;
}
// Grade the cell for a segment row / plane / side with the real picker.
async function grade(page, seg, plane, side, g) {
  const idx = await page.evaluate(s => Array.from(document.querySelectorAll('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)')).findIndex(tr => (tr.querySelector('.pv-seg-name') || {}).value === s), seg);
  const cell = page.locator('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)').nth(idx).locator(`.pv-cell[data-plane="${plane}"][data-side="${side}"]`);
  await cell.scrollIntoViewIfNeeded(); await cell.click(); await page.waitForTimeout(80);
  await page.locator(`#pv-picker button[data-grade="${g}"]`).click(); await page.waitForTimeout(80);
}
const chips = page => page.evaluate(() => Array.from(document.querySelectorAll('#fm-pattern-chips .fm-pattern-chip')).map(b => ({
  text: b.textContent.replace(/\s+/g, ' ').trim(), key: b.dataset.pattern, added: b.classList.contains('selected') })));
const steps = page => page.evaluate(() => Array.from(document.querySelectorAll('#fm-seq-builder .seq-step')).map(st => [st.dataset.segment, st.dataset.plane, st.dataset.side].join('|')));

// ---- the reviewed grid: CX RL 3 · GE AM 2, RL 2 · TA AM 1, RL 3  (all right side)
{
  const page = await fresh(['CX', 'GE', 'TA']);
  await grade(page, 'CX', 'RE-LA', 'rt', '3');
  await grade(page, 'GE', 'AN-ME', 'rt', '2'); await grade(page, 'GE', 'RE-LA', 'rt', '2');
  await grade(page, 'TA', 'AN-ME', 'rt', '1'); await grade(page, 'TA', 'RE-LA', 'rt', '3');
  await page.waitForTimeout(250);
  let c = await chips(page);
  ok('grade 1 never counts: only the RL diagonal is detected (AM has one segment at grade 2+)', c.length === 1 && /RL diagonal R 3 segments/.test(c[0].text), c);
  ok('the chip shows each segment with its grade (the data to decide from)', /CX 3 · GE 2 · TA 3/.test(c[0].text), c);
  const card3 = await page.evaluate(() => document.getElementById('fm-density-summary').textContent.replace(/\s+/g, ' '));
  ok('Card 3 no longer repeats the pattern list (still has highest findings and totals)', !/Pattern Detected/i.test(card3) && /Highest Findings/i.test(card3) && /Treated/.test(card3), card3);
  ok('Card 4 shows the empty-state text only when no pattern exists', await page.locator('#fm-pattern-empty').isHidden());

  // tap adds that pattern's own points, once
  await page.locator('#fm-pattern-chips .fm-pattern-chip').first().scrollIntoViewIfNeeded();
  await page.locator('#fm-pattern-chips .fm-pattern-chip').first().click(); await page.waitForTimeout(250);
  let st = await steps(page);
  ok('tapping the RL chip adds CX, GE and TA on RE-LA right', st.length === 3 && ['CX', 'GE', 'TA'].every(s => st.includes(s + '|RE-LA|rt')), st);
  ok('the chip then shows as added (selected, with the chip style\'s own tick)', (await chips(page))[0].added);
  await page.locator('#fm-pattern-chips .fm-pattern-chip').first().click(); await page.waitForTimeout(200);
  ok('a second tap does not duplicate steps', (await steps(page)).length === 3);
  ok('the hypothesis banner follows the sequence', /RL diagonal/.test(await page.textContent('#fm-hyp-diag')), await page.textContent('#fm-hyp-diag'));
  // remove one step -> the chip is no longer fully added
  await page.locator('#fm-seq-builder .seq-step .del-step').first().click(); await page.waitForTimeout(200);
  ok('removing a step clears the chip\'s ✓', !(await chips(page))[0].added);
  await page.close();
}

// ---- two candidate patterns are listed neutrally, most segments first; no ranking or antagonist wording
{
  const page = await fresh(['CX', 'GE', 'TA']);
  await grade(page, 'CX', 'RE-LA', 'rt', '3'); await grade(page, 'GE', 'RE-LA', 'rt', '2'); await grade(page, 'TA', 'RE-LA', 'rt', '3');
  await grade(page, 'GE', 'AN-ME', 'rt', '2'); await grade(page, 'TA', 'AN-ME', 'rt', '2');
  await page.waitForTimeout(250);
  const c = await chips(page);
  ok('two candidate lines appear in fixed grid order (AM before RL), not ranked by count', c.length === 2 && /AM diagonal/.test(c[0].text) && /RL diagonal/.test(c[1].text) && /2 segments/.test(c[0].text) && /3 segments/.test(c[1].text), c);
  ok('with two candidates the banner does not suggest one', /2 patterns detected/.test(await page.textContent('#fm-hyp-diag')) && await page.locator('.fm-hyp-suggest').count() === 0, await page.textContent('#fm-hyp-diag'));
  ok('...and tells the therapist to choose', /Choose which line/.test(await page.textContent('#fm-hyp-meta')), await page.textContent('#fm-hyp-meta'));
  const panel = await page.evaluate(() => document.getElementById('fm-pattern-panel').textContent);
  ok('no "primary", "counter" or "antagonist" labelling is generated', !/primary|counter|antagonist/i.test(panel), panel);
  await page.locator('#fm-pattern-chips .fm-pattern-chip').nth(0).click(); await page.waitForTimeout(200);
  let st = await steps(page);
  ok('tapping the AM chip adds only its own two points', st.length === 2 && st.every(s => /AN-ME\|rt$/.test(s)), st);
  await page.locator('#fm-pattern-chips .fm-pattern-chip').nth(1).click(); await page.waitForTimeout(200);
  st = await steps(page);
  ok('adding the other pattern keeps both (5 points, no duplicates)', st.length === 5 && new Set(st).size === 5, st);
  ok('both chips show as added', (await chips(page)).every(x => x.added), await chips(page));
  await page.close();
}

// ---- the banner suggestion adds the top pattern's own points (not just the top-graded cells)
{
  const page = await fresh(['CX', 'GE', 'TA']);
  await grade(page, 'CX', 'RE-LA', 'rt', '2'); await grade(page, 'GE', 'RE-LA', 'rt', '2'); await grade(page, 'TA', 'RE-LA', 'rt', '2');
  await grade(page, 'CX', 'An', 'rt', '3');   // a single stronger cell on another plane: not a pattern
  await page.waitForTimeout(250);
  ok('before any tap the banner offers the RL diagonal', /Suggested:\s*RL diagonal \(R\)/.test(await page.textContent('#fm-hyp-diag')), await page.textContent('#fm-hyp-diag'));
  await page.locator('.fm-hyp-suggest').click(); await page.waitForTimeout(250);
  const st = await steps(page);
  ok('tapping the suggestion adds the pattern\'s 3 points, not the single grade-3 cell', st.length === 3 && st.every(s => /RE-LA\|rt$/.test(s)), st);
  await page.close();
}

// ---- no pattern -> empty state; hints live in Card 4
{
  const page = await fresh(['GE', 'HU']);
  ok('with nothing graded the empty-state text shows and there are no chips', (await chips(page)).length === 0 && await page.locator('#fm-pattern-empty').isVisible());
  await grade(page, 'GE', 'An', 'rt', '2'); await grade(page, 'GE', 'Re', 'rt', '2');
  await page.waitForTimeout(200);
  const hints = await page.textContent('#fm-density-hints');
  ok('the quiet prompts now sit in Card 4\'s pattern panel', /An and Re both densified on GE R/.test(hints), hints);
  await page.close();
}

// ---- a signed note cannot be edited through a pattern chip
{
  const page = await fresh(['CX', 'GE']);
  await grade(page, 'CX', 'RE-LA', 'rt', '2'); await grade(page, 'GE', 'RE-LA', 'rt', '2');
  await page.waitForTimeout(250);
  await page.evaluate(() => document.getElementById('tab-btn-core').click());
  await page.click('#lean-no-redflags');
  await page.evaluate(() => document.getElementById('sign-note-btn').click());
  await page.waitForTimeout(300);
  if (await page.locator('#sign-anyway').count()) await page.locator('#sign-anyway').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('tab-btn-fm').click());
  await page.waitForTimeout(200);
  const chip = page.locator('#fm-pattern-chips .fm-pattern-chip').first();
  await chip.scrollIntoViewIfNeeded();
  await chip.click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(250);
  ok('tapping a pattern chip on a signed note adds nothing', (await steps(page)).length === 0, await steps(page));
  await page.close();
}

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
