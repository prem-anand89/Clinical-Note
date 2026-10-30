// FM card-jump chips (6a) and the compact patient banner (7a). Run: node tests/core-layout-step6a7a.mjs
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const results = []; const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const errors = [];
async function open(width) {
  const page = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
  page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.dismiss());
  await page.goto('file://' + path.join(dir, '..', 'clinical-note.html')); await page.waitForTimeout(300);
  return page;
}
// ---- 7a banner
{
  const page = await open(1280);
  const h = await page.evaluate(() => { const n = document.querySelector('.note-head'); return { h: n.getBoundingClientRect().height, text: n.textContent.replace(/\s+/g, ' '), eyebrow: getComputedStyle(n.querySelector('.eyebrow')).display, build: getComputedStyle(document.querySelector('.build-note')).display, prevInHead: !!n.querySelector('#preview-open') }; });
  ok('the patient banner is one compact line (<= 60px)', h.h <= 60, h);
  ok('banner still carries the patient name and ID', /Priya Reddy · Patient ID: 00214/.test(h.text), h.text);
  ok('the prototype build note is hidden', h.build === 'none' && h.eyebrow === 'none', h);
  ok('Preview has moved out of the banner into the top bar (step 7b)', !h.prevInHead && await page.evaluate(() => !!document.querySelector('.topbar .status #preview-open')));
  await page.close();
  const m = await open(390);
  ok('banner fits at 390px with no sideways scroll', await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  const mh = await m.evaluate(() => Math.round(document.querySelector('.note-head').getBoundingClientRect().height));
  ok('phone banner is one compact line (<= 56px)', mh <= 56, mh);
  ok('Preview button still reachable on a phone (icon only, labelled)', await m.evaluate(() => { const b = document.getElementById('preview-open'); const r = b.getBoundingClientRect(); return r.width > 30 && r.right <= innerWidth && b.getAttribute('aria-label') === 'Preview note'; }));
  await m.close();
}
// ---- 6a FM chips
for (const w of [1280, 390]) {
  const page = await open(w);
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation')); await page.waitForTimeout(400);
  const chips = await page.evaluate(() => [...document.querySelectorAll('#fm-jump .fm-jump-chip')].map(c => c.textContent.trim()));
  ok(w + 'px: six chips in card order', chips.join('|') === '1 Segments|↳ Internal|2 History|3 Grid|4 Sequence|5 Re-check', chips);
  const targets = { 'fm-seg-table': '1 Segments', 'fm-internal-dysf-card': '↳ Internal', 'fm-hist-table': '2 History', 'fm-pv-table': '3 Grid', 'fm-hyp-banner': '4 Sequence', 'fm-move-table': '5 Re-check' };
  for (const [id, label] of Object.entries(targets)) {
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(100);
    await page.locator('#fm-jump .fm-jump-chip', { hasText: label }).first().click();
    await page.waitForTimeout(900);
    const r = await page.evaluate(i => { const t = document.getElementById(i); const c = t.closest('.card') || t; const b = c.getBoundingClientRect(); return { top: Math.round(b.top), visible: b.top < window.innerHeight && b.bottom > 100 }; }, id);
    // fm-move-table may be hidden until something is treated; then the click is a no-op rather than an error
    if (id === 'fm-move-table' && r.top === 0 && !r.visible) { ok(w + 'px: "' + label + '" chip does not error when the card is hidden', true); continue; }
    ok(w + 'px: "' + label + '" brings its card into view below the sticky bars', r.visible && r.top >= 150, r);
  }
  await page.evaluate(() => window.scrollTo(0, 1500)); await page.waitForTimeout(900);
  const sticky = await page.evaluate(() => { const r = document.getElementById('fm-jump').getBoundingClientRect(); return { top: Math.round(r.top), ok: r.top >= 0 && r.top < 120 }; });
  if (w > 744) ok(w + 'px: the chip row stays visible while scrolling', sticky.ok, sticky);
  const stack = await page.evaluate(() => { const g = s => document.querySelector(s).getBoundingClientRect(); const j = document.getElementById('fm-jump'); return { gapTopTabs: Math.round(g('#module-tab-bar').top - g('.topbar').bottom), jumpPinned: getComputedStyle(j).position, jumpGap: Math.round(g('#fm-jump').top - g('#module-tab-bar').bottom) }; });
  ok(w + 'px: tab bar sits flush under the top bar (no gap showing content)', stack.gapTopTabs <= 1 && stack.gapTopTabs >= -2, stack);
  ok(w + 'px: jump row ' + (w > 744 ? 'pinned flush under the tab bar' : 'scrolls away on phones'), w > 744 ? (stack.jumpPinned === 'sticky' && Math.abs(stack.jumpGap) <= 2) : stack.jumpPinned === 'static', stack);
  ok(w + 'px: no sideways page scroll', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.close();
}
// ---- signed note: the jump chips are a reading aid and must still work
{
  const page = await open(1280);
  await page.evaluate(() => window.openAdvancedModule('fascial-manipulation')); await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('tab-btn-core').click());
  await page.click('#lean-no-redflags');
  await page.evaluate(() => document.getElementById('sign-note-btn').click()); await page.waitForTimeout(300);
  if (await page.locator('#sign-anyway').count()) await page.locator('#sign-anyway').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('tab-btn-fm').click()); await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
  await page.locator('#fm-jump .fm-jump-chip', { hasText: '3 Grid' }).click();
  await page.waitForTimeout(1000);
  const r = await page.evaluate(() => { const b = (document.getElementById('fm-pv-table').closest('.card')).getBoundingClientRect(); return { top: Math.round(b.top), visible: b.top < innerHeight && b.bottom > 100 }; });
  ok('signed note: the FM jump chips still scroll to their card', r.visible && r.top >= 150, r);
  await page.close();
}
ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
