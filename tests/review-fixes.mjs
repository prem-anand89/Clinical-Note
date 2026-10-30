// Fixes from the 31 Oct review of the day's work. Run: node tests/review-fixes.mjs
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
  page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(cn); await page.waitForTimeout(300);
  return page;
}
const click = (p, s) => p.evaluate(x => document.querySelector(x).click(), s);

// 1. the Neuro badge / Key Findings line count findings, not the selected condition chips
let page = await fresh();
await page.evaluate(() => openConditionModule('neuro')); await page.waitForTimeout(300);
await page.evaluate(() => { document.querySelector('#ga-cond-chips [data-ga-cond="Parkinson\'s"]').click(); document.querySelector('#ga-cond-chips [data-ga-cond="MS"]').click(); }); await page.waitForTimeout(500);
ok('two conditions chosen, nothing recorded: the tab badge is 0 and there is no "items recorded" line', await page.evaluate(() => CoreModules.badge('groupa') === 0 && !CoreModules.summaries().some(s => /Neuro/.test(s.text)) && getComputedStyle(document.querySelector('.module-tab-badge[data-badge-for="groupa"]')).display === 'none'));
await page.evaluate(() => document.getElementById('tab-btn-groupa').click()); await page.waitForTimeout(200);
await page.evaluate(() => document.querySelector('.ga-slot[data-neuro-tool="coordination_cerebellar"] .segmented button').click()); await page.waitForTimeout(500);
ok('one finding recorded: the badge reads 1', await page.evaluate(() => CoreModules.badge('groupa')) === 1 && /1 item recorded/.test((await page.evaluate(() => CoreModules.summaries().map(s => s.text).join())) ), await page.evaluate(() => CoreModules.summaries()));
await page.close();

// 2. Sports Profile (an Additional section) prints when it was added and filled — and not when it was not
page = await fresh();
await click(page, '.preview-open'); await page.waitForTimeout(300);
ok('Sports Profile not added: nothing about it in the print', !/sports profile/i.test(await page.evaluate(() => document.getElementById('np-body').innerText)));
await click(page, '#np-close');
await page.evaluate(() => openSportsProfile()); await page.waitForTimeout(300);
await click(page, '.preview-open'); await page.waitForTimeout(300);
ok('Sports Profile added but empty: still not printed', !/sports profile/i.test(await page.evaluate(() => document.getElementById('np-body').innerText)));
await click(page, '#np-close');
await page.evaluate(() => { const s = document.getElementById('sec-sports-profile'); const t = s.querySelector('input[type=text], textarea'); t.value = 'Recreational football, 3x/week'; t.dispatchEvent(new Event('input', { bubbles: true })); });
await click(page, '.preview-open'); await page.waitForTimeout(300);
const pvt = await page.evaluate(() => document.getElementById('np-body').innerText.replace(/\s+/g, ' '));
ok('Sports Profile filled: it prints, with its entry, after the Core sections', /sports profile/i.test(pvt) && /recreational football/i.test(pvt) && pvt.toLowerCase().indexOf('sports profile') > pvt.toLowerCase().lastIndexOf('plan'), pvt.slice(-200));
await page.close();

// 3. phone: the pinned "+ Module" never covers the active tab (or its ×)
page = await fresh(390);
await page.evaluate(() => { openAdvancedModule('vm'); openAdvancedModule('cst'); openConditionModule('neuro'); openAdvancedModule('fascial-manipulation'); }); await page.waitForTimeout(600);
const overlaps = [];
for (const t of ['vm', 'cst', 'groupa', 'fm', 'core']) {
  await page.evaluate(k => document.getElementById('tab-btn-' + k).click(), t); await page.waitForTimeout(400);
  overlaps.push([t, await page.evaluate(() => { const a = document.querySelector('#module-tab-bar .module-tab.active').getBoundingClientRect(), m = document.getElementById('module-add-btn').getBoundingClientRect(); return Math.round(Math.max(0, Math.min(a.right, m.right) - Math.max(a.left, m.left))); })]);
}
ok('390px, five tabs: the active tab is never under "+ Module"', overlaps.every(o => o[1] <= 1), overlaps);
await page.close();

// 4. the Objective "Neurological screen" suggestion only appears while the Neuro Assessment is off
page = await fresh();
const pill = () => page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.children.length < 4 && /Neurological screen/.test(e.textContent) && /in Objective/.test(e.textContent) && e.offsetParent !== null).length > 0);
await click(page, '#primary-complaint [data-chip="Weakness"]'); await page.waitForTimeout(400);
ok('Weakness chosen, module off: the suggestion is offered', await pill());
await page.evaluate(() => openConditionModule('neuro')); await page.waitForTimeout(400);
await page.evaluate(() => document.getElementById('tab-btn-core').click()); await page.waitForTimeout(300);
ok('...with the Neuro Assessment on, it is withdrawn (the module already holds that exam)', !(await pill()));
await page.evaluate(() => document.getElementById('tab-btn-groupa').click()); await page.waitForTimeout(200);
await page.locator('#tab-btn-groupa .module-tab-close').click(); await page.waitForTimeout(500);
ok('...and comes back once the module is removed', await pill());
await page.close();

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
