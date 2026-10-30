// One openCard path (handoff Step 2): every "+" chip opens its card in ONE click, data auto-opens it,
// templates and the sidebar use the same path, and no code opens things with synthetic clicks.
// Run: node tests/open-card.mjs
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(dir, '..', 'clinical-note.html');
const results = []; const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x))); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const errors = [];
const fresh = async () => { const p = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.dismiss()); await p.goto('file://' + file); await p.waitForTimeout(300); return p; };

// ---- source guard: no group opens a card by clicking a toggle button
const src = fs.readFileSync(file, 'utf8');
ok('no onOpen hook opens something with a synthetic .click()', !/onOpen:[^\n]*\.click\(\)/.test(src));
ok('the old per-group openCard / openBody helpers are gone', !/const openCard = id =>/.test(src) && !/const openBody = \(card/.test(src));
ok('collapsible headers go through Lean.toggleCard (no inline classList.toggle)', !/onclick="this\.parentElement\.classList\.toggle\('open'\)"/.test(src));

let page = await fresh();
// ---- every "+" chip: one click shows its targets; collapsible targets are also expanded; a "body" group shows its body
const info = await page.evaluate(() => Lean.groups.filter(g => g._btn && g._btn.parentElement && g.targets && g.id).map(g => ({ id: g.id, label: g.label, body: g.body || null, targets: g.targets, hasData: !!g.dataFn })));
ok('there are "+" groups to test', info.length > 25, info.length);
const bad = [];
for (const g of info) {
  const r = await page.evaluate(id => {
    const grp = Lean.groups.find(x => x.id === id);
    if (grp.visible && !grp.visible()) return { skip: true };
    const btn = grp._btn;
    if (btn.hidden) return { skip: true };
    btn.click();
    const els = grp.targets.map(s => document.querySelector(s)).filter(Boolean);
    const shown = els.every(e => e.classList.contains('lean-shown'));
    const expanded = els.filter(e => e.classList.contains('collapsible-card')).every(e => e.classList.contains('open'));
    const body = grp.body ? (() => { const b = document.getElementById(grp.body); return !!b && b.style.display === 'block'; })() : true;
    return { shown, expanded, body, open: grp._open };
  }, g.id);
  if (!r.skip && !(r.shown && r.expanded && r.body && r.open)) bad.push([g.id, r]);
}
ok('one click on every "+" chip untucks its card, expands collapsible cards and opens its body', bad.length === 0, bad);

// ---- second tap hides again (no data entered)
page = await fresh();
await page.evaluate(() => { const g = Lean.groups.find(x => x.id === 'x-manual'); g._btn.click(); });
await page.evaluate(() => { const g = Lean.groups.find(x => x.id === 'x-manual'); g._btn.click(); });
ok('tapping a chip again hides the card', await page.evaluate(() => !document.getElementById('card-manual-therapy').classList.contains('lean-shown')));

// ---- + Add body buttons still behave the same way
page = await fresh();
await page.evaluate(() => Lean.openCard('#card-manual-therapy'));
await page.waitForTimeout(100);
ok('manual therapy: body open, "+ Add" hidden, "− Collapse" shown', await page.evaluate(() => { const t = document.querySelector('.subsection-toggle[data-target="body-manual-therapy"]'), r = document.querySelector('.subsection-remove[data-target="body-manual-therapy"]'); return document.getElementById('body-manual-therapy').style.display === 'block' && t.style.display === 'none' && r.style.display === 'inline-flex'; }));
await page.evaluate(() => document.querySelector('.subsection-remove[data-target="body-manual-therapy"]').click());
ok('"− Collapse" closes the body and brings back "+ Add"', await page.evaluate(() => document.getElementById('body-manual-therapy').style.display === 'none' && document.querySelector('.subsection-toggle[data-target="body-manual-therapy"]').style.display === 'inline-flex'));
await page.evaluate(() => document.querySelector('.subsection-toggle[data-target="body-manual-therapy"]').click());
ok('the card\'s own "+ Add" button still opens it', await page.evaluate(() => document.getElementById('body-manual-therapy').style.display === 'block'));

// ---- collapsible header toggles through the same path
page = await fresh();
await page.evaluate(() => Lean.openCard('#card-family'));
const hdr = '#card-family .collapsible-header';
await page.evaluate(h => document.querySelector(h).click(), hdr);
const afterHdr = await page.evaluate(() => document.getElementById('card-family').classList.contains('open'));
await page.evaluate(h => document.querySelector(h).click(), hdr);
ok('a collapsible card\'s header toggles it open and closed', afterHdr === false && (await page.evaluate(() => document.getElementById('card-family').classList.contains('open'))) === true, afterHdr);

// ---- data auto-opens a tucked block (and expands a collapsible one) after a reload-style refresh
page = await fresh();
await page.evaluate(() => { document.getElementById('add-family-row').click(); const f = document.querySelector('#family-history-rows input[type=text], #family-history-rows textarea'); if (f) { f.value = 'Mother — type 2 diabetes'; f.dispatchEvent(new Event('input', { bubbles: true })); } });
await page.waitForTimeout(500);
ok('typing into a tucked collapsible card opens and expands it', await page.evaluate(() => { const c = document.getElementById('card-family'); return c.classList.contains('lean-shown') && c.classList.contains('open'); }));

// ---- a "+" chip stays in step when a card is opened another way (sidebar / API)
page = await fresh();
await page.evaluate(() => Lean.openCard('#card-lifestyle'));
ok('opening a grouped card through openCard keeps its chip in step', await page.evaluate(() => { const g = Lean.groups.find(x => x.id === 'h-life'); return g._open === true && g._btn.classList.contains('open'); }));

// ---- template auto-open: a post-op template reveals Load management
page = await fresh();
await page.evaluate(() => document.querySelector('.kc-tab[data-kc-tab="kc-postop"]') && null);
await page.locator('#kc-trigger').click(); await page.locator('.kc-tab[data-kc-tab="kc-postop"]').click();
await page.locator('#kc-postop [data-template-id="postop-tkr"]').click(); await page.waitForTimeout(500);
ok('choosing a post-op template still reveals Load management', await page.evaluate(() => document.getElementById('card-load').classList.contains('lean-shown')));

// ---- sidebar navigation to a tucked collapsible card shows and expands it
page = await fresh();
// no real sidebar item points at a tucked card today, so add one the way the app does (delegated handler on data-target)
await page.evaluate(() => { const it = document.createElement('div'); it.className = 'outline-item'; it.id = 'tmp-nav'; it.setAttribute('data-target', 'card-lifestyle'); document.body.appendChild(it); });
await page.evaluate(() => document.getElementById('tmp-nav').click());
await page.waitForTimeout(200);
ok('a sidebar jump to a tucked collapsible card shows and expands it, chip in step', await page.evaluate(() => { const c = document.getElementById('card-lifestyle'); const g = Lean.groups.find(x => x.id === 'h-life'); return c.classList.contains('lean-shown') && c.classList.contains('open') && g._open === true; }));

// ---- signed note: the chips cannot open anything new
page = await fresh();
await page.click('#lean-no-redflags');
await page.evaluate(() => document.getElementById('sign-note-btn').click()); await page.waitForTimeout(300);
if (await page.locator('#sign-anyway').count()) await page.locator('#sign-anyway').click();
await page.waitForTimeout(300);
await page.locator('.lean-chip', { hasText: 'Conditions' }).first().click({ timeout: 1500, force: true }).catch(() => {});
await page.waitForTimeout(200);
ok('on a signed note a "+" chip cannot open a card', await page.evaluate(() => !document.getElementById('medical-conditions-card').classList.contains('lean-shown')));

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
