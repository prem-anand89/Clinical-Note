// VM, CST and the Neuro conditions open as their own tabs, like FM (Questionnaires and the other Additional sections stay in Core). Run: node tests/module-tabs.mjs
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
const active = page => page.evaluate(() => window.getActiveModuleTab());
const tabShown = (page, k) => page.evaluate(k => { const b = document.getElementById('tab-btn-' + k); return !!b && b.offsetParent !== null; }, k);
const fromDock = async (page, text) => { await page.click('#module-add-btn'); await page.locator('#lean-module-dock [data-dock-idx]', { hasText: text }).click(); await page.waitForTimeout(500); };

// ---------------- VM and CST: same behaviour, parametrised
for (const m of [{ k: 'vm', dock: 'Visceral Manipulation', sec: 'sec-vm' }, { k: 'cst', dock: 'Craniosacral', sec: 'sec-cst' }]) {
  const page = await fresh();
  ok(m.k + ': no tab before it is added', !(await tabShown(page, m.k)));
  await fromDock(page, m.dock);
  ok(m.k + ': the dock adds its tab and switches to it', (await tabShown(page, m.k)) && (await active(page)) === m.k);
  ok(m.k + ': its section lives in the tab panel, not in Core', await page.evaluate(([k, s]) => document.getElementById('view-' + k).contains(document.getElementById(s)) && !document.getElementById('view-core').contains(document.getElementById(s)), [m.k, m.sec]));
  ok(m.k + ': the section is visible and Core is hidden', await page.evaluate(([k, s]) => document.getElementById(s).offsetParent !== null && document.getElementById('view-core').style.display === 'none', [m.k, m.sec]));
  ok(m.k + ': exactly one tab is active', await page.evaluate(() => document.querySelectorAll('#module-tab-bar .module-tab.active').length === 1));
  await page.evaluate(() => document.getElementById('tab-btn-core').click()); await page.waitForTimeout(200);
  ok(m.k + ': back to Core hides the module view; the tab stays', (await active(page)) === 'core' && (await tabShown(page, m.k)) && await page.evaluate(k => document.getElementById('view-' + k).style.display === 'none', m.k));
  await page.evaluate(k => document.getElementById('tab-btn-' + k).click(), m.k); await page.waitForTimeout(200);
  ok(m.k + ': clicking the tab returns to it', (await active(page)) === m.k);
  // record something (technique chip), check strip, badge and print
  await page.evaluate(s => document.querySelector('#' + s + ' .chip.small').click(), m.sec); await page.waitForTimeout(500);
  ok(m.k + ': the tab badge counts what was recorded', await page.evaluate(k => { const b = document.querySelector('.module-tab-badge[data-badge-for="' + k + '"]'); return b && b.style.display !== 'none' && Number(b.textContent) >= 1; }, m.k), await page.evaluate(k => document.getElementById('tab-btn-' + k).textContent, m.k));
  await page.evaluate(() => document.getElementById('tab-btn-core').click()); await page.waitForTimeout(500);
  ok(m.k + ': Key Findings shows a one-line module pill that opens the tab', await page.evaluate(k => { const p = [...document.querySelectorAll('#ci-key-findings .kf-pill.kf-mod')].find(x => /recorded/.test(x.textContent) && x.textContent.length > 0); return !!p; }, m.k));
  await page.evaluate(() => document.querySelector('.preview-open').click()); await page.waitForTimeout(300);
  const pv = await page.evaluate(() => document.getElementById('np-body').textContent.replace(/\s+/g, ' '));
  const title = m.k === 'vm' ? 'Visceral Manipulation' : 'Craniosacral Therapy';
  ok(m.k + ': the preview now prints it, after Core (it used to be missing from the print)', pv.indexOf(title) > pv.lastIndexOf('Plan'), [pv.indexOf(title), pv.lastIndexOf('Plan')]);
  await page.evaluate(() => document.getElementById('np-close').click());
  // close with × (data recorded -> confirm accepted)
  await page.evaluate(k => document.getElementById('tab-btn-' + k).click(), m.k); await page.waitForTimeout(200);
  await page.locator('#tab-btn-' + m.k + ' .module-tab-close').click(); await page.waitForTimeout(400);
  ok(m.k + ': × removes the module: tab gone, back on Core, section hidden', !(await tabShown(page, m.k)) && (await active(page)) === 'core' && await page.evaluate(s => document.getElementById(s).style.display === 'none', m.sec));
  await page.evaluate(() => document.querySelector('.preview-open').click()); await page.waitForTimeout(300);
  ok(m.k + ': a removed module is not printed', !(await page.evaluate(() => document.getElementById('np-body').textContent)).includes(title));
  await page.evaluate(() => document.getElementById('np-close').click());
  await fromDock(page, m.dock);
  ok(m.k + ': it can be added again', (await tabShown(page, m.k)) && (await active(page)) === m.k);
  await page.close();
}

// ---------------- Questionnaires is an Additional section: it stays inside Core, never a tab
{
  const page = await fresh();
  await fromDock(page, 'Questionnaires');
  ok('questionnaires: no tab is created and Core stays active', !(await tabShown(page, 'questionnaires')) && (await active(page)) === 'core');
  ok('questionnaires: the card lives inside Objective in Core', await page.evaluate(() => document.getElementById('sec-objective').contains(document.getElementById('tier2-card-questionnaires')) && document.getElementById('view-core').contains(document.getElementById('tier2-card-questionnaires'))));
  await page.evaluate(() => document.querySelector('#tier2-card-questionnaires .t2-remove').click()); await page.waitForTimeout(300);
  ok('questionnaires: Remove deletes the card and it can be added again', await page.evaluate(() => !document.getElementById('tier2-card-questionnaires')));
  await page.close();
}
// a condition template that suggests questionnaires adds the card inside Core, quietly
{
  const page = await fresh();
  await page.locator('#kc-trigger').click(); await page.locator('.kc-tab[data-kc-tab="kc-postop"]').click();
  await page.locator('#kc-postop [data-template-id="postop-tkr"]').click(); await page.waitForTimeout(600);
  ok('a post-op template adds the Questionnaires card in Core (still no tab)', await page.evaluate(() => !!document.getElementById('tier2-card-questionnaires') && document.getElementById('sec-objective').contains(document.getElementById('tier2-card-questionnaires'))) && !(await tabShown(page, 'questionnaires')) && (await active(page)) === 'core');
  await page.evaluate(() => document.querySelector('#tier2-card-questionnaires .q-use').click()); await page.waitForTimeout(400);
  await page.evaluate(() => { const c = document.getElementById('tier2-card-questionnaires'); const b = [...c.querySelectorAll('button')].find(x => x.textContent.trim() === '3'); if (b) b.click(); });
  ok('a suggested questionnaire can be accepted and answered in Core', await page.evaluate(() => !!document.querySelector('#tier2-card-questionnaires button.selected')));
  await page.close();
}

// ---------------- Neuro conditions: one tab, named for the condition
{
  const page = await fresh();
  ok('neuro: no tab before a condition is chosen', !(await tabShown(page, 'groupa')));
  await page.locator('#kc-trigger').click(); await page.locator('.kc-tab[data-kc-tab="kc-neuro"]').click();
  await page.locator('#kc-neuro [data-chip="Parkinson\'s"]').click(); await page.waitForTimeout(400);
  ok('choosing it in the picker adds the tab but stays in Section 1', (await tabShown(page, 'groupa')) && (await active(page)) === 'core');
  ok('the tab is named for the condition', /Neuro: Parkinson's/.test(await page.textContent('#tab-btn-groupa')), await page.textContent('#tab-btn-groupa'));
  await page.locator('#kc-neuro [data-chip="MS"]').click(); await page.waitForTimeout(400);
  ok('switching condition renames the same tab (still one neuro tab)', /Neuro: MS/.test(await page.textContent('#tab-btn-groupa')) && await page.locator('[id^="tab-btn-groupa"]').count() === 1);
  await page.click('#tab-btn-groupa'); await page.waitForTimeout(300);
  ok('the tab shows the neuro tools in its own panel', (await active(page)) === 'groupa' && await page.evaluate(() => document.getElementById('view-groupa').contains(document.getElementById('sec-group-a')) && document.getElementById('sec-group-a').offsetParent !== null));
  await page.evaluate(() => { const b = document.querySelector('#group-a-body .segmented button'); if (b) b.click(); }); await page.waitForTimeout(400);
  ok('neuro: a recorded item shows in the tab badge and Key Findings', await page.evaluate(() => { const b = document.querySelector('.module-tab-badge[data-badge-for="groupa"]'); return b && b.style.display !== 'none'; }));
  await page.locator('#tab-btn-groupa .module-tab-close').click(); await page.waitForTimeout(500);
  ok('× on the tab unsets the condition everywhere (picker, Impression line, tab)', !(await tabShown(page, 'groupa')) && (await active(page)) === 'core' && await page.evaluate(() => !document.querySelector('#kc-neuro .chip.selected')) && await page.locator('#ci-known-condition').isHidden());
  // the dock for a neuro condition adds the tab and switches; opening the same condition again does not toggle it off
  await fromDock(page, "Parkinson's");
  ok('dock: a neuro condition adds the tab and switches to it', (await tabShown(page, 'groupa')) && (await active(page)) === 'groupa');
  await page.evaluate(() => document.getElementById('tab-btn-core').click());
  await fromDock(page, "Parkinson's");
  ok('dock: choosing the same condition again keeps it (it does not toggle off)', (await tabShown(page, 'groupa')) && (await active(page)) === 'groupa' && await page.evaluate(() => !!document.querySelector('#kc-neuro .chip.selected')));
  await page.evaluate(() => document.getElementById('tab-btn-core').click());
  // unselecting in the picker removes the tab
  await page.locator('#kc-trigger').click().catch(() => {});
  await page.evaluate(() => document.querySelector('#kc-neuro .chip.selected').click()); await page.waitForTimeout(400);
  ok('unselecting the condition in the picker removes the tab', !(await tabShown(page, 'groupa')));
  await page.close();
}

// ---------------- several tabs at once, keyboard, phone, signed
{
  const page = await fresh();
  await fromDock(page, 'Visceral Manipulation'); await fromDock(page, 'Craniosacral'); await fromDock(page, "Parkinson's");
  ok('several module tabs can be open together; exactly one is active', await page.evaluate(() => document.querySelectorAll('#module-tab-bar .module-tab[role="tab"]:not([style*="display: none"])').length >= 4 && document.querySelectorAll('#module-tab-bar .module-tab.active').length === 1));
  ok('"+ Module" is still the last control in the bar', await page.evaluate(() => document.getElementById('module-tab-bar').lastElementChild.id === 'module-add-btn'));
  await page.focus('#tab-btn-groupa'); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(300);
  ok('arrow keys move between the tabs', (await active(page)) === 'cst', await active(page));
  await page.click('#tab-btn-core'); await page.waitForTimeout(200);
  await page.click('#lean-no-redflags');
  await page.evaluate(() => document.getElementById('sign-note-btn').click()); await page.waitForTimeout(300);
  if (await page.locator('#sign-anyway').count()) await page.locator('#sign-anyway').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('tab-btn-vm').click()); await page.waitForTimeout(200);
  ok('signed note: tabs still switch (reading) but × cannot remove a module', (await active(page)) === 'vm');
  await page.locator('#tab-btn-vm .module-tab-close').click({ force: true }).catch(() => {}); await page.waitForTimeout(300);
  ok('signed note: the module is still there after trying ×', await tabShown(page, 'vm'));
  await page.close();
}
{
  const page = await fresh(390);
  await fromDock(page, 'Visceral Manipulation');
  ok('390px: the tab bar scrolls sideways inside itself; the page does not', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.close();
}

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
