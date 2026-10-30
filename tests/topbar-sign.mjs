// Top-bar Preview and Sign shortcut (handoff Step 7b). Run: node tests/topbar-sign.mjs
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
  const page = await (await browser.newContext({ viewport: { width: w, height: 900 } })).newPage();
  page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.dismiss());
  await page.goto(cn); await page.waitForTimeout(300);
  return page;
}
const locked = page => page.evaluate(() => document.body.classList.contains('note-locked'));
const check = page => page.evaluate(() => { const c = document.getElementById('sign-check'); return { shown: c.style.display !== 'none' && c.textContent.trim() !== '', text: c.textContent.replace(/\s+/g, ' ').trim(), anyway: !!c.querySelector('#sign-anyway') }; });

let page = await fresh();
await page.click('#lean-no-redflags');   // safety review attested, so only completeness gaps remain
// ---- placement
ok('Preview sits in the top bar, before the save pill, keeping its id and class', await page.evaluate(() => { const st = document.querySelector('.topbar .status'); const p = document.getElementById('preview-open'); return st.contains(p) && p.classList.contains('preview-open') && p.nextElementSibling.id === 'topbar-sign-btn' && st.querySelector('.save-pill') === p.nextElementSibling.nextElementSibling; }));
ok('the banner no longer holds a Preview button', await page.evaluate(() => !document.querySelector('.note-head .preview-open')));
ok('#preview-open-2 is still beside the Sign button at the end of the note', await page.evaluate(() => { const b = document.getElementById('preview-open-2'); return !!b && b.nextElementSibling === document.getElementById('sign-note-btn'); }));
ok('the top bar still fits in one row at 1280px', await page.evaluate(() => document.querySelector('.topbar').getBoundingClientRect().height < 70));
await page.click('#preview-open'); await page.waitForTimeout(300);
ok('top-bar Preview opens the note preview', await page.evaluate(() => document.getElementById('note-preview').classList.contains('open')));
await page.click('#np-close');

// ---- the Sign shortcut never signs
await page.evaluate(() => window.scrollTo(0, 0));
await page.click('#topbar-sign-btn'); await page.waitForTimeout(900);
let c = await check(page);
ok('Sign shortcut on an incomplete note: nothing is signed', !(await locked(page)));
ok('...it lists what is still open', c.shown && /Not yet documented/.test(c.text) && /Anatomical region/.test(c.text), c);
ok('...and offers no "Sign anyway" of its own (only the real Sign button signs)', !c.anyway && /Sign &|Sign & Complete Note/.test(c.text), c);
ok('...it scrolls to the real Sign button and focuses it (without pressing it)', await page.evaluate(() => { const b = document.getElementById('sign-note-btn'); const r = b.getBoundingClientRect(); return document.activeElement === b && r.top > 0 && r.bottom < innerHeight; }));
ok('...pressing the shortcut again still does not sign', (await page.click('#topbar-sign-btn'), await page.waitForTimeout(500), !(await locked(page))));

// a clean note: "nothing outstanding" — still not signed
await page.evaluate(() => { ['#region-chips [data-chip="Knee"]', '#primary-complaint [data-chip="Pain"]'].forEach(s => document.querySelector(s).click()); const h = document.getElementById('primary-hypothesis'); h.value = 'Patellofemoral pain'; h.dispatchEvent(new Event('input', { bubbles: true })); });
await page.click('#add-goal-row', { force: true }).catch(() => {});
await page.evaluate(() => { const g = document.getElementById('lean-fast-goal'); g.value = 'Walk 30 min pain-free'; g.dispatchEvent(new Event('input', { bubbles: true })); g.dispatchEvent(new Event('change', { bubbles: true })); });
await page.waitForTimeout(500);
await page.click('#topbar-sign-btn'); await page.waitForTimeout(700);
c = await check(page);
ok('a complete note: "Nothing outstanding" and STILL not signed', /Nothing outstanding/.test(c.text) && !(await locked(page)), c);

// module warnings appear in the shortcut as warnings
await page.evaluate(() => { window.MODULE_REGISTRY.push({ group: 'Test', label: 'Temp', fn: 'noop', placement: 'tab', id: 'tmp2', tabKey: 'tmp2', enabled: () => true, signWarning: () => 'TMP: 3 items open' }); });
await page.click('#topbar-sign-btn'); await page.waitForTimeout(700);
c = await check(page);
ok('open module items show as a warning, not a block', /Open in a module/.test(c.text) && /TMP: 3 items open/.test(c.text) && !(await locked(page)), c);

await page.close();

// ---- a safety blocker (screening not reviewed) is reported as one, and still nothing is signed
page = await fresh();
await page.click('#topbar-sign-btn'); await page.waitForTimeout(700);
c = await check(page);
ok('a safety blocker (red-flag screening not reviewed) is reported as "Can\'t sign yet" and nothing is signed', /Can't sign yet/.test(c.text) && /Red-flag screening/.test(c.text) && !(await locked(page)), c);
await page.close();

// ---- from another tab it brings you back to Core
page = await fresh();
await page.evaluate(() => window.openAdvancedModule('fascial-manipulation')); await page.waitForTimeout(400);
ok('the shortcut is available from a module tab', await page.locator('#topbar-sign-btn').isVisible());
await page.click('#topbar-sign-btn'); await page.waitForTimeout(900);
ok('...and returns to Core to show the sign section', await page.evaluate(() => window.getActiveModuleTab() === 'core'));
await page.close();

// ---- the pinned bars follow the top bar's real height (it grew when these buttons were added)
page = await fresh();
await page.evaluate(() => { document.querySelector('.topbar').style.padding = '26px 20px'; });
await page.waitForTimeout(400);
await page.evaluate(() => window.scrollTo(0, 900)); await page.waitForTimeout(500);
const flush = await page.evaluate(() => { const t = document.querySelector('.topbar').getBoundingClientRect(), b = document.getElementById('module-tab-bar').getBoundingClientRect(); return Math.round(b.top - t.bottom); });
ok('make the top bar taller and the tab bar still sits flush under it (measured, not hard-coded)', flush >= -2 && flush <= 1, flush);
await page.close();

// ---- the real Sign button still signs; afterwards the shortcut goes, Preview stays
page = await fresh();
await page.click('#lean-no-redflags');
await page.evaluate(() => document.getElementById('sign-note-btn').click()); await page.waitForTimeout(300);
if (await page.locator('#sign-anyway').count()) await page.locator('#sign-anyway').click();
await page.waitForTimeout(400);
ok('the real "Sign & Complete Note" still completes the note', await locked(page));
ok('after signing the top-bar Sign shortcut is gone', await page.evaluate(() => getComputedStyle(document.getElementById('topbar-sign-btn')).display === 'none'));
await page.click('#preview-open'); await page.waitForTimeout(300);
ok('...and Preview still works on a signed note', await page.evaluate(() => document.getElementById('note-preview').classList.contains('open') && /Completed \d/.test(document.getElementById('np-body').textContent)));
await page.close();

// ---- phone
page = await fresh(390);
const pb = await page.evaluate(() => { const t = document.querySelector('.topbar').getBoundingClientRect(); const a = document.getElementById('preview-open').getBoundingClientRect(), b = document.getElementById('topbar-sign-btn').getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, iw: innerWidth, h: Math.round(t.height), prev: [Math.round(a.width), Math.round(a.right)], sign: [Math.round(b.width), Math.round(b.right)], lbls: [...document.querySelectorAll('.topbar .pv-lbl, .topbar .ts-lbl')].map(e => getComputedStyle(e).display) }; });
ok('390px: both buttons fit in the top bar (icon only) with no sideways scroll', pb.sw <= pb.iw && pb.prev[1] <= pb.iw && pb.sign[1] <= pb.iw && pb.lbls.every(d => d === 'none') && pb.h < 70, pb);
ok('390px: both are real tap targets (>= 32px wide)', pb.prev[0] >= 32 && pb.sign[0] >= 32, pb);
await page.click('#topbar-sign-btn'); await page.waitForTimeout(700);
ok('390px: the shortcut works on a phone and does not sign', !(await locked(page)) && (await check(page)).shown);
await page.close();

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
