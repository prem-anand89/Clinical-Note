// "+ Module" popover in the tab bar and count badges on tabs (handoff Step 6b). Run: node tests/module-popover.mjs
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
const dockOpen = page => page.evaluate(() => document.getElementById('lean-module-dock').classList.contains('open') && getComputedStyle(document.getElementById('lean-module-dock')).display !== 'none');

let page = await fresh();
ok('"+ Module" is the last control in the tab bar and is not itself a tab', await page.evaluate(() => { const bar = document.getElementById('module-tab-bar'); const last = bar.lastElementChild; return last.id === 'module-add-btn' && last.getAttribute('role') !== 'tab' && !last.classList.contains('module-tab'); }));
ok('the module list is no longer inside Section 4', await page.evaluate(() => !document.getElementById('sec-objective').contains(document.getElementById('lean-module-dock'))));
ok('Section 4 has no "Modules…" chip any more', !(await page.evaluate(() => [...document.querySelectorAll('#sec-objective .lean-chip')].some(b => /Modules…/.test(b.textContent)))));
ok('the dock is hidden until asked for, and still renders all 18 modules', !(await dockOpen(page)) && await page.locator('#lean-module-dock [data-dock-idx]').count() === 18);

await page.click('#module-add-btn');
ok('clicking "+ Module" opens the list', await dockOpen(page) && (await page.getAttribute('#module-add-btn', 'aria-expanded')) === 'true');
const box = await page.evaluate(() => { const r = document.getElementById('lean-module-dock').getBoundingClientRect(); const b = document.getElementById('module-add-btn').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, iw: innerWidth, ih: innerHeight, btnBottom: b.bottom }; });
ok('the popover sits under the button and inside the window', box.l >= 0 && box.r <= box.iw && box.t >= box.btnBottom && box.b <= box.ih + 1, box);
ok('tab and profile modules are tagged in the list', await page.evaluate(() => { const t = id => [...document.querySelectorAll('#lean-module-dock .chip')].find(b => b.textContent.startsWith(id)); return /tab/.test(t('Fascial').textContent) && /profile/.test(t('Facial Palsy').textContent) && !t('Vitals').querySelector('.dock-tag'); }));
await page.keyboard.press('Escape');
ok('Escape closes it', !(await dockOpen(page)));
await page.click('#module-add-btn'); await page.mouse.click(5, 450);
ok('clicking outside closes it', !(await dockOpen(page)));
await page.click('#module-add-btn'); await page.click('#module-add-btn');
ok('the button toggles it', !(await dockOpen(page)));

// inline module: opens in Core, popover closes
await page.click('#module-add-btn');
await page.locator('#lean-module-dock [data-dock-idx]', { hasText: 'Vitals' }).click(); await page.waitForTimeout(400);
ok('choosing an inline module (Vitals) opens it in Core and closes the list', !(await dockOpen(page)) && await page.evaluate(() => window.getActiveModuleTab() === 'core') && await page.evaluate(() => { const z = document.getElementById('tier2-zone'); return [...z.children].some(c => c.offsetParent !== null); }));

// tab module: FM
await page.click('#module-add-btn');
await page.locator('#lean-module-dock [data-dock-idx]', { hasText: 'Fascial' }).click(); await page.waitForTimeout(500);
ok('choosing FM adds its tab and switches to it', !(await dockOpen(page)) && await page.evaluate(() => window.getActiveModuleTab() === 'fm' && document.getElementById('tab-btn-fm').offsetParent !== null));
ok('"+ Module" stays at the far end of the bar with FM added', await page.evaluate(() => document.getElementById('module-tab-bar').lastElementChild.id === 'module-add-btn'));

// badges
ok('no badge while nothing is graded', await page.evaluate(() => getComputedStyle(document.querySelector('.module-tab-badge[data-badge-for="fm"]')).display === 'none'));
await page.evaluate(() => ['CX', 'GE', 'TA'].forEach(c => window.addFmSegment('today', c, true, true))); await page.waitForTimeout(300);
for (const seg of ['CX', 'GE']) {
  const idx = await page.evaluate(s => Array.from(document.querySelectorAll('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)')).findIndex(tr => (tr.querySelector('.pv-seg-name') || {}).value === s), seg);
  const cell = page.locator('#fm-pv-table tbody tr:not(.fm-prior-row):not(.pv-session-banner-row)').nth(idx).locator('.pv-cell[data-plane="RE-LA"][data-side="rt"]');
  await cell.scrollIntoViewIfNeeded(); await page.waitForTimeout(250); await cell.click(); await page.waitForTimeout(80);
  await page.locator('#pv-picker button[data-grade="2"]').click(); await page.waitForTimeout(150);
}
await page.waitForTimeout(500);
ok('the FM tab shows how many points are graded (2)', await page.evaluate(() => { const b = document.querySelector('.module-tab-badge[data-badge-for="fm"]'); return getComputedStyle(b).display !== 'none' && b.textContent === '2'; }), await page.evaluate(() => document.getElementById('tab-btn-fm').textContent));
ok('the badge does not widen the tab beyond its label + close button', await page.evaluate(() => document.getElementById('tab-btn-fm').getBoundingClientRect().width < 320));

// arrow-key tab navigation ignores the + button
await page.focus('#tab-btn-fm'); await page.keyboard.press('ArrowRight');
ok('arrow keys cycle the tabs only (never land on "+ Module")', await page.evaluate(() => document.activeElement.id !== 'module-add-btn'));
await page.close();

// signed note: cannot add modules
page = await fresh();
await page.click('#lean-no-redflags');
await page.evaluate(() => document.getElementById('sign-note-btn').click()); await page.waitForTimeout(300);
if (await page.locator('#sign-anyway').count()) await page.locator('#sign-anyway').click();
await page.waitForTimeout(300);
ok('on a signed note "+ Module" is hidden', await page.evaluate(() => getComputedStyle(document.getElementById('module-add-btn')).display === 'none'));
await page.close();

// phone
page = await fresh(390);
await page.click('#module-add-btn');
const pb = await page.evaluate(() => { const r = document.getElementById('lean-module-dock').getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), iw: innerWidth, b: Math.round(r.bottom), ih: innerHeight, sw: document.documentElement.scrollWidth }; });
ok('390px: the popover fits the screen and the page does not scroll sideways', pb.l >= 0 && pb.r <= pb.iw && pb.b <= pb.ih + 1 && pb.sw <= pb.iw, pb);
await page.locator('#lean-module-dock [data-dock-idx]', { hasText: 'Fascial' }).click(); await page.waitForTimeout(500);
ok('390px: FM tab reachable from the popover', await page.evaluate(() => window.getActiveModuleTab() === 'fm'));
await page.close();

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
