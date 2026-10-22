// Session note step 2: response chips, focus memo, HEP adherence, after-treatment. Run: node tests/session-step2.mjs
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const sn = 'file://' + path.join(dir, '..', 'session-note.html');
const results = []; const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(sn);
const pay = async () => JSON.parse(await page.textContent('#payload'));

// response chips
ok('3 response chips', (await page.locator('#resp button').count()) === 3);
await page.locator('#resp button', { hasText: 'Worse' }).click();
ok('response stored as enum', (await pay()).sessionResponse === 'worse', (await pay()).sessionResponse);
await page.locator('#resp button', { hasText: 'Worse' }).click();
ok('response toggles off', (await pay()).sessionResponse === null);

// HEP
ok('HEP chips relabelled', (await page.locator('#hep button').allTextContents()).join() === 'Doing,Partly,Not doing');
await page.locator('#hep button', { hasText: 'Partly' }).click();
ok('HEP stored', (await pay()).hepAdherence === 'partly');

// memo chips drop text, no dupes, typing works
await page.locator('#focus-chips button', { hasText: 'Progress HEP' }).click();
await page.locator('#focus-chips button', { hasText: 'Re-check pinned items' }).click();
await page.locator('#focus-chips button', { hasText: 'Progress HEP' }).click();
ok('memo chips append once each', (await page.inputValue('#memo')) === 'Progress HEP; Re-check pinned items', await page.inputValue('#memo'));
await page.fill('#memo', 'Progress HEP; extension focus');
ok('memo in payload', (await pay()).nextVisitMemo === 'Progress HEP; extension focus');

// after treatment: only on pinned rows (knee flexion is pinned in scenario A)
const rows = page.locator('#measures .m');
const pinnedRow = rows.filter({ has: page.locator('.pin') }).first();
const unpinnedRow = rows.filter({ hasNot: page.locator('.pin') }).first();
ok('after link on pinned rows only', (await pinnedRow.locator('text=+ after treatment').count()) === 1 && (await unpinnedRow.locator('text=+ after treatment').count()) === 0);
ok('no afterValue by default', !(await pay()).measures.some(m => 'afterValue' in m));
await pinnedRow.locator('text=+ after treatment').click();
const fl = page.locator('#measures .m', { hasText: 'Knee flexion' });
const before = fl.locator('.ctl .step').first();
await before.locator('.same').click();          // before = last (85)
await fl.locator('.after .step .b').last().click(); // after: starts from before (85)
await fl.locator('.after .step .b').last().click(); // 90
let p = await pay(); let m = p.measures.find(x => x.id === 'knee_flex');
ok('afterValue stored with before value', m && m.value === 85 && m.afterValue === 90, m);
ok('after delta vs before shown', /\+5 vs before/.test(await fl.locator('.after .delta').textContent()));
await fl.locator('text=Remove after-treatment value').click();
p = await pay(); m = p.measures.find(x => x.id === 'knee_flex');
ok('removing drops afterValue', m && !('afterValue' in m), m);

// chips-kind pinned measure after value (scenario B: abductors MMT pinned)
await page.selectOption('#scenario', 'thr');
const ab = page.locator('#measures .m', { hasText: 'Hip abductor' });
await ab.locator('text=+ after treatment').click();
await ab.locator('.after .seg button', { hasText: '4' }).first().click();
p = await pay(); m = p.measures.find(x => x.id === 'abd_str');
ok('chips after value stored (before not yet set)', m === undefined, m);
await ab.locator('.ctl .seg button', { hasText: '3+' }).click();
p = await pay(); m = p.measures.find(x => x.id === 'abd_str');
ok('chips before + after', m && m.value === '3+' && m.afterValue === '4', m);

// tap budget unchanged for the base flow: scenario A, same-as-last style flow still completes
await page.selectOption('#scenario', 'tkr');
ok('reset clears memo/response/after', (await page.inputValue('#memo')) === '' && (await pay()).sessionResponse === null);
ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]).length;
console.log(failed ? failed + ' FAILED' : 'ALL PASS'); process.exit(failed ? 1 : 0);
