// Neuro Assessment form (plan: CLAUDE_HANDOFF_NEURO_FORM.md). N1: tools are built once; conditions only show/hide them.
// Run: node tests/neuro-form.mjs
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
async function fresh() {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(cn); await page.waitForTimeout(300);
  return page;
}
const toCore = async page => { await page.evaluate(() => document.getElementById('tab-btn-core').click()); await page.waitForTimeout(150); };
const toNeuro = async page => { await page.evaluate(() => document.getElementById('tab-btn-groupa').click()); await page.waitForTimeout(200); };
// conditions are independent toggles (several can apply): pick adds one, unpick removes one
const toggle = async (page, cond) => { await toCore(page); if (await page.locator('#known-condition-field').isHidden()) await page.locator('#kc-trigger').click(); await page.locator('.kc-tab[data-kc-tab="kc-neuro"]').click(); await page.locator('#kc-neuro [data-chip="' + cond + '"]').click(); await page.waitForTimeout(400); };
const selectedConds = page => page.evaluate(() => [...document.querySelectorAll('#kc-neuro .chip.selected')].map(c => c.dataset.chip));
const pick = async (page, cond) => { if (!(await selectedConds(page)).includes(cond)) await toggle(page, cond); };
const unpick = async (page, cond) => { if ((await selectedConds(page)).includes(cond)) await toggle(page, cond); };
const shown = page => page.evaluate(() => [...document.querySelectorAll('#group-a-body > .ga-slot')].filter(s => s.style.display !== 'none').map(s => s.dataset.neuroTool));
const count = (page, tool) => page.evaluate(t => document.querySelectorAll('.ga-slot[data-neuro-tool="' + t + '"]').length, tool);
const coordRow = page => page.locator('.ga-slot[data-neuro-tool="coordination_cerebellar"] .obj-row').first();

let page = await fresh();
await pick(page, "Parkinson's");
let s = await shown(page);
ok("Parkinson's shows reflexes, tone, coordination and Hoehn & Yahr", ['reflexes', 'tone_spasticity', 'coordination_cerebellar', 'hoehn_yahr'].every(t => s.includes(t)) && s.length === 4, s);
ok('slots follow the registry order', await page.evaluate(() => { const ids = [...document.querySelectorAll('#group-a-body > .ga-slot')].map(x => x.dataset.neuroTool); const order = ['isncsci','reflexes','reflexes_sci','tone_spasticity','motor_umn','fugl_meyer','coordination_cerebellar','cognitive_screen_light','hoehn_yahr','sensory_dermatomal','fatigue_relapse_ms','sensory_peripheral','symptom_checklist_concussion']; return ids.join() === order.filter(o => ids.includes(o)).join(); }));
ok('exactly one slot has no top rule (the first visible one)', await page.evaluate(() => document.querySelectorAll('#group-a-body > .ga-slot.ga-first').length === 1 && document.querySelector('#group-a-body > .ga-slot.ga-first').dataset.neuroTool === 'reflexes'));
ok('the Reflexes heading keeps its original wording', /0 \(absent\) – 4\+ \(clonus\), L\/R compared/.test(await page.textContent('.ga-slot[data-neuro-tool="reflexes"] .card-heading')));

// add a second condition: tools are the UNION, shared ones appear once and keep their entries
await toNeuro(page); await coordRow(page).locator('.segmented button[data-val="Impaired"]').click();
await pick(page, 'MS');
s = await shown(page);
ok("Parkinson's + MS: the union of both conditions' tools", ['reflexes', 'tone_spasticity', 'coordination_cerebellar', 'hoehn_yahr', 'sensory_dermatomal', 'fatigue_relapse_ms'].every(t => s.includes(t)) && s.length === 6, s);
ok('coordination (suggested by both) exists once', await count(page, 'coordination_cerebellar') === 1);
await toNeuro(page);
ok('...and keeps the grade entered earlier', await coordRow(page).locator('.segmented button.selected').getAttribute('data-val') === 'Impaired');
ok('the tab is named "Neuro: PD + MS"', /Neuro: PD \+ MS/.test(await page.textContent('#tab-btn-groupa')), await page.textContent('#tab-btn-groupa'));

// remove one condition: its empty tools go, shared / used tools stay
await unpick(page, "Parkinson's");
s = await shown(page);
ok("unselecting Parkinson's drops its empty tools (tone, Hoehn & Yahr) but keeps what MS still suggests", !s.includes('tone_spasticity') && !s.includes('hoehn_yahr') && s.includes('coordination_cerebellar') && s.includes('sensory_dermatomal'), s);
ok('...and the tab goes back to the full condition name', /Neuro: MS/.test(await page.textContent('#tab-btn-groupa')));

// data keeps a tool visible even when nothing suggests it any more
await pick(page, 'Stroke / TBI'); await toNeuro(page);
await page.locator('.ga-slot[data-neuro-tool="tone_spasticity"] input[type=text]').first().fill('R elbow flexors');
await unpick(page, 'Stroke / TBI');
s = await shown(page);
ok('a tool holding data stays visible after the condition that suggested it is unselected', s.includes('tone_spasticity'), s);
ok('...and its entry is still there', await page.locator('.ga-slot[data-neuro-tool="tone_spasticity"] input[type=text]').first().inputValue() === 'R elbow flexors');
ok('tools with no data that nothing suggests are hidden (motor UMN, Fugl-Meyer)', !s.includes('motor_umn') && !s.includes('fugl_meyer'), s);
await pick(page, 'Concussion'); await pick(page, 'Stroke / TBI');
ok('cognitive screen (stroke + concussion) is built once', await count(page, 'cognitive_screen_light') === 1);

// emptying the picker removes the module; picking again brings the entries back
await unpick(page, 'Stroke / TBI'); await unpick(page, 'Concussion'); await unpick(page, 'MS');
ok('unselecting every condition removes the tab (section hidden)', await page.evaluate(() => document.getElementById('sec-group-a').style.display === 'none'));
await pick(page, 'MS'); await toNeuro(page);
ok('picking a condition again brings the earlier entries back', await coordRow(page).locator('.segmented button.selected').getAttribute('data-val') === 'Impaired');
await page.close();

// region change adds rows, never rebuilds
page = await fresh();
await page.evaluate(() => document.querySelector('#region-chips [data-chip="Cervical Spine"]').click());
await pick(page, 'Stroke / TBI'); await toNeuro(page);
const rows = () => page.evaluate(() => [...document.querySelectorAll('.ga-slot[data-neuro-tool="reflexes"] .obj-row')].map(r => r.getAttribute('data-ga-label')));
const before = await rows();
await page.locator('.ga-slot[data-neuro-tool="reflexes"] .obj-row').first().locator('.segmented button').nth(2).click();
const graded = await page.evaluate(() => document.querySelectorAll('.ga-slot[data-neuro-tool="reflexes"] button.selected').length);
await page.evaluate(() => document.querySelector('#region-chips [data-chip="Knee"]').click()); await page.waitForTimeout(500);
await toNeuro(page);
const after = await rows();
ok('a region change keeps every row already there', before.every(r => after.includes(r)), [before, after]);
ok('...adds the new region\'s reflexes', after.length > before.length, [before, after]);
ok('...and keeps the grade that was entered', await page.evaluate(() => document.querySelectorAll('.ga-slot[data-neuro-tool="reflexes"] button.selected').length) === graded && graded >= 1, graded);
await page.close();

// SCI: ISNCSCI built once, survives region and condition changes
page = await fresh();
await pick(page, 'Paraplegia / SCI');
s = await shown(page);
ok('SCI shows the ISNCSCI worksheet and the supplementary reflexes (not the UMN screen)', s.join() === 'isncsci,reflexes_sci', s);
await toNeuro(page);
const isn = page.locator('.ga-slot[data-neuro-tool="isncsci"] table.isn-table button').first();
await isn.click(); await page.waitForTimeout(200);
const isnHtml = await page.evaluate(() => document.querySelector('.ga-slot[data-neuro-tool="isncsci"]').innerHTML);
ok('a worksheet cell can be graded', await page.evaluate(() => document.querySelectorAll('.ga-slot[data-neuro-tool="isncsci"] button.selected').length) === 1);
await page.evaluate(() => document.querySelector('#region-chips [data-chip="Lumbar Spine"]').click()); await page.waitForTimeout(400);
ok('changing region does not rebuild the worksheet', await page.evaluate(() => document.querySelector('.ga-slot[data-neuro-tool="isncsci"]').innerHTML) === isnHtml);
await pick(page, "Parkinson's");
ok('after switching condition the graded worksheet stays visible and keeps its entry', (await shown(page)).includes('isncsci') && await page.evaluate(() => document.querySelectorAll('.ga-slot[data-neuro-tool="isncsci"] button.selected').length) === 1, await shown(page));
ok('the module badge counts the ISNCSCI entry', await page.evaluate(() => window.CoreModules.badge('groupa')) >= 1);
await page.close();

// SCI together with another condition: ISNCSCI plus ONE reflex screen (the fuller one), not two
page = await fresh();
await pick(page, 'Paraplegia / SCI'); await pick(page, "Parkinson's");
s = await shown(page);
ok('SCI + Parkinson\'s: ISNCSCI, the UMN reflex screen once (no supplementary duplicate), tone, coordination, Hoehn & Yahr', s.includes('isncsci') && s.includes('reflexes') && !s.includes('reflexes_sci') && s.includes('tone_spasticity') && s.includes('hoehn_yahr'), s);
await unpick(page, "Parkinson's");
ok('back to SCI alone: the supplementary reflexes return', (await shown(page)).join() === 'isncsci,reflexes_sci', await shown(page));
await page.close();

// explicit Remove forgets everything
page = await fresh();
await pick(page, "Parkinson's"); await toNeuro(page);
await coordRow(page).locator('.segmented button[data-val="Unable"]').click();
await page.locator('#tab-btn-groupa .module-tab-close').click(); await page.waitForTimeout(500);
ok('× on the tab removes the module and unsets the condition', !(await page.evaluate(() => !!document.querySelector('#kc-neuro .chip.selected'))));
await pick(page, "Parkinson's");
ok('after an explicit Remove the form starts empty again', await page.locator('.ga-slot[data-neuro-tool="coordination_cerebellar"] .segmented button.selected').count() === 0);
await page.close();

// preview still prints the tools that are showing
page = await fresh();
await pick(page, "Parkinson's"); await toNeuro(page);
await coordRow(page).locator('.segmented button[data-val="Impaired"]').click();
await toCore(page);
await page.evaluate(() => document.querySelector('.preview-open').click()); await page.waitForTimeout(300);
const pv = await page.evaluate(() => document.getElementById('np-body').textContent.replace(/\s+/g, ' '));
ok('the preview prints the neuro entries', /Neuro assessment/.test(pv) && /impaired/i.test(pv), pv.slice(-300));
ok('the Known condition picker is not read as a stray field (no "Create PSFS: Parkinson\'s")', !/Create PSFS: Parkinson/.test(pv) && /Known condition: Parkinson/.test(pv), pv.slice(0, 250));
await page.close();

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
