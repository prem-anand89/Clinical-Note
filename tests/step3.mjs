// Step 3: ROM Full/WNL flag + module registry. Run: node tests/step3.mjs
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const cn = 'file://' + path.join(dir, '..', 'clinical-note.html');
const results = []; const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1024, height: 900 } })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(cn);

// --- ROM Full/WNL
await page.click('#region-chips [data-chip="Knee"]');
await page.evaluate(() => window.leanSuggest.add('rom', 'Flexion'));
const row = page.locator('#rom-rows .obj-row').first();
ok('numeric keypad hint on degree inputs', (await row.locator('.deg-input[inputmode="numeric"]').count()) === 4);
ok('one Full/WNL per side', (await row.locator('.wnl-toggle').count()) === 2);
const blocks = row.locator('.side-block');
await blocks.nth(0).locator('.deg-input').first().fill('95');
await blocks.nth(0).locator('.wnl-toggle').click();
ok('WNL clears + disables that side', (await blocks.nth(0).locator('.deg-input').first().inputValue()) === '' && await blocks.nth(0).locator('.deg-input').first().isDisabled());
ok('other side untouched', !(await blocks.nth(1).locator('.deg-input').first().isDisabled()));
await blocks.nth(1).locator('.deg-input').first().fill('140');
await row.locator('.pin-btn').click();
const pin = (await page.evaluate(() => window.getPinnedFindings()))[0];
const sides = Object.keys(pin.baseline);
ok('pin snapshot records full flag, not a number', pin.baseline[sides[0]].full === true && pin.baseline[sides[0]].active === null && pin.baseline[sides[1]].active === 140 && !pin.baseline[sides[1]].full, pin.baseline);
await blocks.nth(0).locator('.wnl-toggle').click();
ok('toggling off re-enables', !(await blocks.nth(0).locator('.deg-input').first().isDisabled()));
await blocks.nth(0).locator('.wnl-toggle').click();

// --- module registry
const reg = await page.evaluate(() => window.MODULE_REGISTRY.length);
ok('registry has 18 modules (the six neuro conditions are one Neuro Assessment)', reg === 18, reg);
const missing = await page.evaluate(() => window.MODULE_REGISTRY.filter(m => typeof window[m.fn] !== 'function').map(m => m.fn));
ok('every opener exists globally', missing.length === 0, missing);
const sidebarLabels = await page.evaluate(() => [...document.querySelectorAll('.outline-item[onclick]')].filter(el => /openTier2Module|openAdvancedModule|openConditionModule|openSportsProfile/.test(el.getAttribute('onclick'))).map(el => el.textContent.replace(/[+✓]/g, '').replace(/\s+/g, ' ').trim()));
const regLabels = await page.evaluate(() => window.MODULE_REGISTRY.map(m => m.label));
ok('registry matches sidebar entries', JSON.stringify([...sidebarLabels].sort()) === JSON.stringify([...regLabels].sort()), { sidebarLabels, regLabels });
// open a module through the dock
const dockBtn = page.locator('#lean-module-dock [data-dock-idx]').first();
ok('dock renders from registry', (await page.locator('#lean-module-dock [data-dock-idx]').count()) === 7);
await page.evaluate(() => document.getElementById('lean-module-dock').classList.remove('lean-tucked'));
ok('dock no longer lists the Additional sections', (await page.locator('#lean-module-dock [data-dock-idx]', { hasText: 'Vitals' }).count()) === 0);
await page.locator('#nav-t2-vitals').dispatchEvent('click');
ok('dock click opens module without error', errors.length === 0, errors);
ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]).length;
console.log(failed ? failed + ' FAILED' : 'ALL PASS'); process.exit(failed ? 1 : 0);
