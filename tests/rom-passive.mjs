// ROM "+ Passive / End-feel" tuck (handoff Step 3). Run: node tests/rom-passive.mjs
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
async function fresh(w = 1024) {
  const page = await (await browser.newContext({ viewport: { width: w, height: 900 } })).newPage();
  page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.dismiss());
  await page.goto(cn); await page.waitForTimeout(300);
  await page.click('#region-chips [data-chip="Knee"]');
  await page.evaluate(() => window.leanSuggest.add('rom', 'Flexion'));
  await page.waitForTimeout(150);
  return page;
}
let page = await fresh();
const row = page.locator('#rom-rows .obj-row').first();
const sb = n => row.locator('.side-block').nth(n);
const wrapOpen = n => sb(n).locator('.rom-passive-wrap').evaluate(e => getComputedStyle(e).display !== 'none');

ok('each side has one "+ Passive / End-feel" chip', await row.locator('.rom-passive-toggle').count() === 2);
ok('Passive° and End-feel are hidden by default', !(await wrapOpen(0)) && !(await wrapOpen(1)));
ok('the fields are still in the DOM (4 numeric inputs, 2 end-feel selects)', await row.locator('.deg-input[inputmode="numeric"]').count() === 4 && await row.locator('.endfeel-select').count() === 2);
ok('hidden by a stylesheet rule, not inline style', await page.evaluate(() => !document.querySelector('.rom-passive-wrap').hasAttribute('style')));

await sb(0).locator('.rom-passive-toggle').click();
ok('the chip opens that side only', (await wrapOpen(0)) && !(await wrapOpen(1)));
ok('the chip reads "− Passive / End-feel" and aria-expanded is true', /^−/.test(await sb(0).locator('.rom-passive-toggle').textContent()) && (await sb(0).locator('.rom-passive-toggle').getAttribute('aria-expanded')) === 'true');
await sb(0).locator('.rom-passive-toggle').click();
ok('with nothing entered it closes again', !(await wrapOpen(0)));

// typing a passive value opens it and it can no longer be hidden
await sb(1).locator('.rom-passive-toggle').click();
await sb(1).locator('.rom-passive-wrap .deg-input').fill('120');
await sb(1).locator('.rom-passive-toggle').click();
ok('a side holding a passive value cannot be hidden', await wrapOpen(1));

// end-feel alone also opens it
await sb(0).locator('.rom-passive-toggle').click();
await sb(0).locator('.endfeel-select').selectOption('Capsular');
await sb(0).locator('.rom-passive-toggle').click();
ok('an end-feel alone also keeps it open', await wrapOpen(0));

// values set by code (carry-forward / import) open it on the next refresh
await page.close(); page = await fresh();
await page.evaluate(() => { const r = document.querySelector('#rom-rows .obj-row'); r.querySelectorAll('.side-block')[1].querySelectorAll('.deg-input')[1].value = '110'; });
await page.evaluate(() => { document.querySelector('#presenting-problem').dispatchEvent(new Event('input', { bubbles: true })); });
await page.waitForTimeout(500);
ok('a value written by code opens its Passive / End-feel after a refresh', await page.evaluate(() => document.querySelectorAll('#rom-rows .obj-row')[0].querySelectorAll('.rom-passive-wrap')[1].classList.contains('open')));

// Full / WNL still clears and disables both degree boxes, hidden or not
await page.close(); page = await fresh();
const r2 = page.locator('#rom-rows .obj-row').first();
await r2.locator('.side-block').nth(0).locator('.deg-input').first().fill('95');
await r2.locator('.side-block').nth(0).locator('.wnl-toggle').click();
ok('Full/WNL clears and disables both degree inputs even with Passive hidden', await r2.locator('.side-block').nth(0).locator('.deg-input').evaluateAll(a => a.length === 2 && a.every(i => i.disabled && i.value === '')));

// preview + pin snapshot read the hidden fields
await page.close(); page = await fresh();
const r3 = page.locator('#rom-rows .obj-row').first();
await r3.locator('.side-block').nth(0).locator('.deg-input').first().fill('100');
await r3.locator('.side-block').nth(0).locator('.rom-passive-toggle').click();
await r3.locator('.side-block').nth(0).locator('.rom-passive-wrap .deg-input').fill('115');
await r3.locator('.side-block').nth(0).locator('.endfeel-select').selectOption('Springy block');
await r3.locator('.pin-btn').click();
const pin = (await page.evaluate(() => window.getPinnedFindings()))[0];
const side0 = Object.keys(pin.baseline)[0];
ok('the pin snapshot records the passive value', pin.baseline[side0].passive === 115, pin.baseline);
// collapse the display state by reloading values into a fresh row would be a different test; here prove the preview prints them while the chip is closed
await page.evaluate(() => { const w = document.querySelector('#rom-rows .rom-passive-wrap'); w.classList.remove('open'); });
await page.evaluate(() => document.querySelector('.preview-open').click()); await page.waitForTimeout(250);
const pv = await page.evaluate(() => document.getElementById('note-preview').textContent);
ok('the preview prints passive and end-feel even when the chip is closed', /115/.test(pv) && /springy block end-feel/i.test(pv), pv.slice(0, 300));
await page.close();

// phone: the compact row fits and the chip is reachable
page = await fresh(390);
ok('390px: no sideways page scroll with ROM rows', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
const h0 = await page.evaluate(() => Math.round(document.querySelector('#rom-rows .obj-row').getBoundingClientRect().height));
await page.locator('#rom-rows .obj-row .rom-passive-toggle').first().click();
const h1 = await page.evaluate(() => Math.round(document.querySelector('#rom-rows .obj-row').getBoundingClientRect().height));
ok('390px: opening Passive makes the row taller (tuck saves space)', h1 > h0, [h0, h1]);
await page.close();

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
