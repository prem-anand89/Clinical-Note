// Neuro Assessment: one module, one form (plan: CLAUDE_HANDOFF_NEURO_FORM.md). Run: node tests/neuro-form.mjs
// N1 tools built once · N2 several conditions · N3 core exam + expansions, hosted Objective neuro screen, "+ Add tool", SCI swap.
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
const toggle = async (page, cond) => { await toCore(page); if (await page.locator('#known-condition-field').isHidden()) await page.locator('#kc-trigger').click(); await page.locator('.kc-tab[data-kc-tab="kc-neuro"]').click(); await page.locator('#kc-neuro [data-chip="' + cond + '"]').click(); await page.waitForTimeout(400); };
const selectedConds = page => page.evaluate(() => [...document.querySelectorAll('#kc-neuro .chip.selected')].map(c => c.dataset.chip));
const pick = async (page, cond) => { if (!(await selectedConds(page)).includes(cond)) await toggle(page, cond); };
const unpick = async (page, cond) => { if ((await selectedConds(page)).includes(cond)) await toggle(page, cond); };
const shown = page => page.evaluate(() => [...document.querySelectorAll('#group-a-body > .ga-slot')].filter(s => s.style.display !== 'none').map(s => s.dataset.neuroTool));
const count = (page, tool) => page.evaluate(t => document.querySelectorAll('.ga-slot[data-neuro-tool="' + t + '"]').length, tool);
const coordRow = page => page.locator('.ga-slot[data-neuro-tool="coordination_cerebellar"] .obj-row').first();
const region = (page, r) => page.evaluate(x => document.querySelector('#region-chips [data-chip="' + x + '"]').click(), r);
const labels = (page, grp) => page.evaluate(g => [...document.querySelectorAll('#obj-ns-' + g + '-rows .obj-label')].map(e => (e.value || e.textContent).trim()), grp);
const CORE = ['basic_exam', 'tone_spasticity', 'coordination_cerebellar'];

// ================= the form: core exam + condition expansions
let page = await fresh();
await region(page, 'Cervical Spine');
await page.evaluate(() => openConditionModule('neuro')); await page.waitForTimeout(500);
let s = await shown(page);
ok('with no condition the form is already usable: basic exam, tone, coordination', s.join() === CORE.join(), s);
ok('the basic exam IS the Objective Neuro screen: one element, now hosted in the tab', await page.evaluate(() => document.getElementById('view-groupa').contains(document.getElementById('card-obj-neuro-screen')) && document.getElementById('card-obj-neuro-screen').classList.contains('ns-hosted')));
ok('the card\'s own Add / Remove header is hidden while hosted', await page.evaluate(() => getComputedStyle(document.getElementById('obj-ns-toggle-row')).display === 'none'));
ok('cervical region: dermatomes default to C5–T1', (await labels(page, 'dermatome')).join() === 'C5,C6,C7,C8,T1', await labels(page, 'dermatome'));
ok('Objective no longer offers a second "Neuro screen" while the module is on', await page.evaluate(() => [...document.querySelectorAll('#sec-objective .lean-chip')].filter(b => /Neuro screen/.test(b.textContent)).every(b => b.hidden)));
ok('exactly one slot has no top rule (the first)', await page.evaluate(() => document.querySelectorAll('#group-a-body > .ga-slot.ga-first').length === 1));

// grade a dermatome in the tab; remove the module: the exam goes back to Objective with the entry
await page.locator('#obj-ns-dermatome-rows .obj-row').first().locator('.segmented button').nth(1).click();
const gradedBefore = await page.evaluate(() => document.querySelectorAll('#obj-ns-dermatome-rows button.selected').length);
await page.locator('#tab-btn-groupa .module-tab-close').click(); await page.waitForTimeout(500);
ok('Remove sends the basic exam back to Objective', await page.evaluate(() => document.getElementById('sec-objective').contains(document.getElementById('card-obj-neuro-screen')) && !document.getElementById('card-obj-neuro-screen').classList.contains('ns-hosted')));
ok('...with what was entered (it is Core data), and opened because it holds data', await page.evaluate(() => document.querySelectorAll('#obj-ns-dermatome-rows button.selected').length) === gradedBefore && await page.evaluate(() => document.getElementById('card-obj-neuro-screen').classList.contains('lean-shown') && document.getElementById('obj-neuro-screen-body').style.display !== 'none'));
// data entered in Objective first appears in the module (one data source)
await page.evaluate(() => openConditionModule('neuro')); await page.waitForTimeout(500);
ok('re-adding the module brings the same exam, entry intact (one data source)', await page.evaluate(() => document.querySelectorAll('#obj-ns-dermatome-rows button.selected').length) === gradedBefore);
await page.close();

// Objective-first: an empty exam that was never opened stays closed when the module goes away
page = await fresh();
await region(page, 'Cervical Spine');
await page.evaluate(() => openConditionModule('neuro')); await page.waitForTimeout(400);
await page.locator('#tab-btn-groupa .module-tab-close').click(); await page.waitForTimeout(400);
ok('an untouched exam goes back tucked (nothing newly opened in Objective)', await page.evaluate(() => !document.getElementById('card-obj-neuro-screen').classList.contains('lean-shown') && document.getElementById('obj-neuro-screen-body').style.display === 'none'));
await page.close();

// ================= conditions add tools to the same form
page = await fresh();
await pick(page, "Parkinson's");
s = await shown(page);
ok("Parkinson's: the core plus Hoehn & Yahr", s.join() === CORE.concat('hoehn_yahr').join(), s);
ok('slots follow the registry order', await page.evaluate(() => { const ids = [...document.querySelectorAll('#group-a-body > .ga-slot')].map(x => x.dataset.neuroTool); const order = ['isncsci','basic_exam','tone_spasticity','coordination_cerebellar','motor_umn','fugl_meyer','cognitive_screen_light','hoehn_yahr','fatigue_relapse_ms','sensory_peripheral','symptom_checklist_concussion']; return ids.join() === order.filter(o => ids.includes(o)).join(); }));
await toNeuro(page);
ok('the reflexes heading keeps its original wording', /0 \(absent\) – 4\+ \(clonus\), L\/R compared/.test(await page.textContent('#card-obj-neuro-screen .ns-grp[data-ns="reflex"] .card-heading')));
await coordRow(page).locator('.segmented button[data-val="Impaired"]').click();
await pick(page, 'MS');
s = await shown(page);
ok("Parkinson's + MS: the core, Hoehn & Yahr and the MS fatigue / relapse tool", s.join() === CORE.concat('hoehn_yahr', 'fatigue_relapse_ms').join(), s);
ok('coordination exists once and keeps its grade', await count(page, 'coordination_cerebellar') === 1);
await toNeuro(page);
ok('...grade intact', await coordRow(page).locator('.segmented button.selected').getAttribute('data-val') === 'Impaired');
ok('the tab is named "Neuro: PD + MS"', /Neuro: PD \+ MS/.test(await page.textContent('#tab-btn-groupa')));
ok('MS asks the basic exam for every dermatomal level (no separate MS sensory block)', (await labels(page, 'dermatome')).join() === 'C5,C6,C7,C8,T1,L2,L3,L4,L5,S1,S2' && await count(page, 'sensory_dermatomal') === 0, await labels(page, 'dermatome'));
await unpick(page, "Parkinson's");
s = await shown(page);
ok("unselecting Parkinson's drops its empty tool but keeps the core and MS's tools", !s.includes('hoehn_yahr') && s.includes('fatigue_relapse_ms') && CORE.every(t => s.includes(t)), s);

// data keeps a tool visible even when nothing suggests it any more
await pick(page, 'Stroke / TBI'); await toNeuro(page);
await page.locator('.ga-slot[data-neuro-tool="motor_umn"] .segmented button').first().click();
await unpick(page, 'Stroke / TBI');
s = await shown(page);
ok('a tool holding data stays visible after the condition that suggested it is unselected', s.includes('motor_umn'), s);
ok('tools with no data that nothing suggests are hidden (Fugl-Meyer, cognitive)', !s.includes('fugl_meyer') && !s.includes('cognitive_screen_light'), s);
await pick(page, 'Concussion'); await pick(page, 'Stroke / TBI');
ok('the cognitive screen (stroke + concussion) is built once', await count(page, 'cognitive_screen_light') === 1);
await unpick(page, 'Stroke / TBI'); await unpick(page, 'Concussion'); await unpick(page, 'MS');
ok('with the picker emptied the module goes (section hidden) and the exam returns to Objective', await page.evaluate(() => document.getElementById('sec-group-a').style.display === 'none' && document.getElementById('sec-objective').contains(document.getElementById('card-obj-neuro-screen'))));
await pick(page, 'MS'); await toNeuro(page);
ok('picking a condition again brings the earlier entries back', await coordRow(page).locator('.segmented button.selected').getAttribute('data-val') === 'Impaired');
await page.close();

// ================= + Add tool
page = await fresh();
await page.evaluate(() => openConditionModule('neuro')); await page.waitForTimeout(500);
const menu = () => page.evaluate(() => [...document.querySelectorAll('#ga-add-tool-mount .chip')].map(c => c.textContent.replace(/^\+\s*/, '')));
let m = await menu();
ok('the Add-tool chips list the tools that are not showing (never the core)', m.includes('Hoehn & Yahr') && m.includes('ISNCSCI worksheet') && !m.includes('Tone / spasticity') && !m.includes('Basic neuro exam'), m);
await page.locator('#ga-add-tool-mount .chip', { hasText: 'Hoehn & Yahr' }).click(); await page.waitForTimeout(300);
ok('adding a tool by hand shows it with no condition chosen', (await shown(page)).includes('hoehn_yahr'));
ok('...and it leaves the Add list', !(await menu()).includes('Hoehn & Yahr'));
ok('an empty hand-added tool offers Hide; hiding puts it back on the list', await page.evaluate(() => { const b = document.querySelector('.ga-slot[data-neuro-tool="hoehn_yahr"] > .ga-slot-hide'); return !!b && b.style.display !== 'none'; }));
await page.locator('.ga-slot[data-neuro-tool="hoehn_yahr"] > .ga-slot-hide').click(); await page.waitForTimeout(300);
ok('...hidden again, back in the Add list', !(await shown(page)).includes('hoehn_yahr') && (await menu()).includes('Hoehn & Yahr'));
await page.locator('#ga-add-tool-mount .chip', { hasText: 'Peripheral sensory' }).click(); await page.waitForTimeout(300);
await page.locator('.ga-slot[data-neuro-tool="sensory_peripheral"] .segmented button').first().click();
ok('a tool holding data cannot be hidden (no Hide button)', await page.evaluate(() => document.querySelector('.ga-slot[data-neuro-tool="sensory_peripheral"] > .ga-slot-hide').style.display === 'none'));
ok('core tools have no Hide button', await page.evaluate(() => !document.querySelector('.ga-slot[data-neuro-tool="tone_spasticity"] > .ga-slot-hide')));
await page.close();

// ================= region
page = await fresh();
await region(page, 'Cervical Spine');
await pick(page, 'Stroke / TBI'); await toNeuro(page);
const before = await labels(page, 'reflex');
await page.locator('#obj-ns-reflex-rows .obj-row').first().locator('.segmented button').nth(2).click();
const graded = await page.evaluate(() => document.querySelectorAll('#obj-ns-reflex-rows button.selected').length);
await region(page, 'Knee'); await page.waitForTimeout(500);
await toNeuro(page);
const after = await labels(page, 'reflex');
ok('a region change keeps every reflex row already there and adds the new region\'s', before.every(r => after.includes(r)) && after.length > before.length, [before, after]);
ok('...and keeps the grade that was entered', await page.evaluate(() => document.querySelectorAll('#obj-ns-reflex-rows button.selected').length) === graded && graded >= 1, graded);
await page.close();

// ================= SCI: ISNCSCI replaces the generic sensory + motor blocks; reflexes stay
page = await fresh();
await region(page, 'Lumbar Spine');
await pick(page, 'Paraplegia / SCI'); await toNeuro(page);
s = await shown(page);
ok('SCI: ISNCSCI, the basic exam, tone and coordination', s.join() === ['isncsci'].concat(CORE).join(), s);
ok('SCI: the generic dermatome and myotome blocks are hidden (ISNCSCI is the formal exam); reflexes stay', await page.evaluate(() => { const g = k => document.querySelector('#card-obj-neuro-screen .ns-grp[data-ns="' + k + '"]').style.display; return g('derm') === 'none' && g('myo') === 'none' && g('reflex') === ''; }));
ok('SCI: patellar and Achilles reflexes are there', (await labels(page, 'reflex')).some(r => /Patellar/.test(r)) && (await labels(page, 'reflex')).some(r => /Achilles/.test(r)), await labels(page, 'reflex'));
await page.locator('.ga-slot[data-neuro-tool="isncsci"] table.isn-table button').first().click(); await page.waitForTimeout(200);
const isnHtml = await page.evaluate(() => document.querySelector('.ga-slot[data-neuro-tool="isncsci"]').innerHTML);
await region(page, 'Cervical Spine'); await page.waitForTimeout(400);
ok('a region change does not rebuild the worksheet', await page.evaluate(() => document.querySelector('.ga-slot[data-neuro-tool="isncsci"]').innerHTML) === isnHtml);
await pick(page, "Parkinson's");
ok('SCI + Parkinson\'s: ISNCSCI, the basic exam, Hoehn & Yahr — and no second reflex screen', (await shown(page)).join() === ['isncsci'].concat(CORE, 'hoehn_yahr').join(), await shown(page));
ok('the graded worksheet keeps its entry and counts in the badge', await page.evaluate(() => document.querySelectorAll('.ga-slot[data-neuro-tool="isncsci"] button.selected').length) === 1 && await page.evaluate(() => window.CoreModules.badge('groupa')) >= 1);
await page.close();
// SCI never hides a dermatome block that already holds data
page = await fresh();
await region(page, 'Cervical Spine');
await page.evaluate(() => openConditionModule('neuro')); await page.waitForTimeout(400);
await page.locator('#obj-ns-dermatome-rows .obj-row').first().locator('.segmented button').first().click();
await pick(page, 'Paraplegia / SCI'); await toNeuro(page);
ok('SCI keeps the dermatome block visible when something is recorded in it', await page.evaluate(() => document.querySelector('#card-obj-neuro-screen .ns-grp[data-ns="derm"]').style.display === ''));
await page.close();

// ================= Remove
page = await fresh();
await pick(page, "Parkinson's"); await toNeuro(page);
await coordRow(page).locator('.segmented button[data-val="Unable"]').click();
await page.locator('#tab-btn-groupa .module-tab-close').click(); await page.waitForTimeout(500);
ok('× on the tab removes the module and unsets the condition', !(await selectedConds(page)).length);
await pick(page, "Parkinson's");
ok('after an explicit Remove the tools start empty again', await page.locator('.ga-slot[data-neuro-tool="coordination_cerebellar"] .segmented button.selected').count() === 0);
await page.close();

// ================= preview
page = await fresh();
await region(page, 'Cervical Spine');
await pick(page, "Parkinson's"); await toNeuro(page);
await coordRow(page).locator('.segmented button[data-val="Impaired"]').click();
await page.locator('#obj-ns-dermatome-rows .obj-row').first().locator('.segmented button').nth(1).click();
await toCore(page);
await page.evaluate(() => document.querySelector('.preview-open').click()); await page.waitForTimeout(300);
const pv = await page.evaluate(() => document.getElementById('np-body').textContent.replace(/\s+/g, ' '));
ok('the preview prints the tools and the hosted basic exam under the Neuro assessment', /Neuro assessment/.test(pv) && /impaired/i.test(pv) && /C5/.test(pv.slice(pv.indexOf('Neuro assessment'))) && /reduced/i.test(pv.slice(pv.indexOf('Neuro assessment'))), pv.slice(pv.indexOf('Neuro assessment'), pv.indexOf('Neuro assessment') + 300));
ok('...and the exam is printed once (not also in Objective)', (pv.match(/Reduced|reduced/g) || []).length === 1, (pv.match(/educed/g) || []).length);
ok('the Known condition picker is not read as a stray field', !/Create PSFS: Parkinson/.test(pv) && /Known condition: Parkinson/.test(pv));
await page.close();

ok('no page errors', errors.length === 0, errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(failed.length ? `\n${failed.length} FAILED` : '\nALL CHECKS PASS');
process.exit(failed.length ? 1 : 0);
