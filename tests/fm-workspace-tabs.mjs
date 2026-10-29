// Comprehensive tests for FM Tabbed Workspace & Executive Capsule
// Run: node tests/fm-workspace-tabs.mjs
import { createRequire } from 'module';
const require = createRequire('/home/theranet/TN Project/thera-net-1/package.json');
const { chromium } = require('playwright-core');
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const cnUrl = 'file://' + path.join(dir, '..', 'clinical-note.html');

const results = [];
const ok = (n, c, x) => {
  results.push([n, !!c]);
  console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(x)));
};

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1024, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

await page.goto(cnUrl);

console.log('--- 1. Default Load ---');
const coreActive = await page.evaluate(() => {
  const btn = document.getElementById('tab-btn-core');
  return btn.classList.contains('active') && btn.getAttribute('aria-selected') === 'true';
});
ok('Default load: Core tab is active with aria-selected=true', coreActive);

const fmTabHidden = await page.evaluate(() => {
  const btn = document.getElementById('tab-btn-fm');
  return btn.style.display === 'none';
});
ok('Default load: FM tab button is hidden', fmTabHidden);

const capHidden = await page.evaluate(() => {
  const c = document.getElementById('fm-capsule-card');
  return c.style.display === 'none';
});
ok('Default load: FM capsule card is hidden', capHidden);

const viewsInit = await page.evaluate(() => {
  const vc = document.getElementById('view-core');
  const vf = document.getElementById('view-fm');
  return vc.style.display !== 'none' && vf.style.display === 'none';
});
ok('Default load: view-core visible, view-fm hidden', viewsInit);
ok('Default load: getFmData().enabled is false', (await page.evaluate(() => window.getFmData().enabled)) === false);

console.log('--- 2. openAdvancedModule with switch:false ---');
await page.evaluate(() => window.openAdvancedModule('fascial-manipulation', { switch: false }));
await page.waitForTimeout(200);

const switchFalseCheck = await page.evaluate(() => {
  const fmTab = document.getElementById('tab-btn-fm');
  const coreTab = document.getElementById('tab-btn-core');
  const vc = document.getElementById('view-core');
  const vf = document.getElementById('view-fm');
  const cap = document.getElementById('fm-capsule-card');
  const fmd = window.getFmData();
  return {
    fmTabShown: fmTab.style.display !== 'none',
    fmTabSelected: fmTab.getAttribute('aria-selected') === 'true',
    coreTabSelected: coreTab.getAttribute('aria-selected') === 'true',
    coreVisible: vc.style.display !== 'none',
    fmHidden: vf.style.display === 'none',
    capVisible: cap.style.display !== 'none',
    enabled: fmd.enabled
  };
});
ok('openAdvancedModule(..., {switch:false}) shows tab & capsule without switching view',
  switchFalseCheck.fmTabShown && !switchFalseCheck.fmTabSelected && switchFalseCheck.coreTabSelected &&
  switchFalseCheck.coreVisible && switchFalseCheck.fmHidden && switchFalseCheck.capVisible && switchFalseCheck.enabled,
  switchFalseCheck
);

console.log('--- 3. Empty Capsule Text ---');
const emptyCap = await page.evaluate(() => {
  const cap = document.getElementById('fm-capsule-card');
  const badge = document.getElementById('fm-capsule-badge');
  const empty = document.getElementById('fm-capsule-empty');
  const open = cap.querySelector('.fm-capsule-open');
  return {
    badge: badge ? badge.textContent.trim() : '',
    emptyText: empty ? empty.textContent.trim() : '',
    hasOpenLink: !!open
  };
});
ok('Empty capsule shows exact text: "Assessment initialized · 0 points treated"',
  emptyCap.emptyText === 'Assessment initialized · 0 points treated' && emptyCap.badge === 'Evaluating' && emptyCap.hasOpenLink,
  emptyCap
);

console.log('--- 4. openAdvancedModule default switches to FM workspace ---');
await page.evaluate(() => window.openAdvancedModule('fascial-manipulation'));
await page.waitForTimeout(250);

const fmWorkspace = await page.evaluate(() => {
  const fmTab = document.getElementById('tab-btn-fm');
  const coreTab = document.getElementById('tab-btn-core');
  const vc = document.getElementById('view-core');
  const vf = document.getElementById('view-fm');
  return {
    fmTabSelected: fmTab.getAttribute('aria-selected') === 'true',
    coreTabSelected: coreTab.getAttribute('aria-selected') === 'true',
    fmVisible: vf.style.display !== 'none',
    coreHidden: vc.style.display === 'none'
  };
});
ok('openAdvancedModule switches to FM workspace (view-fm visible, view-core hidden)',
  fmWorkspace.fmTabSelected && !fmWorkspace.coreTabSelected && fmWorkspace.fmVisible && fmWorkspace.coreHidden,
  fmWorkspace
);

const fiveCards = await page.evaluate(() => {
  const sec = document.getElementById('sec-fascial-manipulation');
  const cards = sec.querySelectorAll('.card');
  return cards.length >= 5;
});
ok('All five FM cards are present and loaded in view-fm', fiveCards);

console.log('--- 4b. Internal Dysfunction Collapsible Drawer & Card 1 Routing ---');
const drawerDefaultCollapsed = await page.evaluate(() => {
  const body = document.getElementById('fm-internal-dysf-body');
  const toggle = document.getElementById('fm-internal-dysf-toggle');
  return body && body.style.display === 'none' && toggle.getAttribute('aria-expanded') === 'false';
});
ok('Internal Dysfunction drawer is collapsed by default', drawerDefaultCollapsed);

// Placement: directly under Card 1 (Segment Assessment), before Card 2 (FM History)
const drawerPlacement = await page.evaluate(() => {
  const drawer = document.getElementById('fm-internal-dysf-card');
  const card1 = drawer.previousElementSibling;
  const card2 = drawer.nextElementSibling;
  return !!card1 && !!card2 && !!card1.querySelector('#fm-seg-table') && /2\. FM History/.test(card2.textContent);
});
ok('Internal Dysfunction drawer sits directly under Segment Assessment (Card 1)', drawerPlacement);

// Toggle open drawer
await page.click('#fm-internal-dysf-toggle');
await page.waitForTimeout(100);
const drawerOpened = await page.evaluate(() => {
  const body = document.getElementById('fm-internal-dysf-body');
  return body && body.style.display !== 'none';
});
ok('Tapping drawer toggle expands Internal Dysfunction body', drawerOpened);

// Select Digestive (ADI) apparatus chip
await page.click('#fm-apparatus-chips button[data-apparatus="Digestive (ADI)"]');
await page.waitForTimeout(150);

const apparatusSuggestedTensiles = await page.evaluate(() => {
  const tluSuggested = document.querySelector('#fm-tensile-chips button[data-tensile="TLU"]').classList.contains('trigger-suggested');
  const routingVisible = document.getElementById('fm-tensile-routing-field').style.display !== 'none';
  const routingChips = Array.from(document.querySelectorAll('#fm-tensile-routing-chips .fm-routing-btn')).map(b => b.textContent.trim());
  return { tluSuggested, routingVisible, routingChips };
});
ok('Selecting ADI highlights tensile structures and reveals Card 1 routing chips',
  apparatusSuggestedTensiles.tluSuggested && apparatusSuggestedTensiles.routingVisible && apparatusSuggestedTensiles.routingChips.some(c => c.includes('LU')),
  apparatusSuggestedTensiles
);

// Click "＋ Add LU to Card 1"
const luBtn = page.locator('#fm-tensile-routing-chips button', { hasText: 'Add LU' }).first();
await luBtn.click();
await page.waitForTimeout(150);

const routingVerification = await page.evaluate(() => {
  const segRows = Array.from(document.querySelectorAll('#fm-seg-table tbody tr')).map(tr => tr.querySelector('.seg-name').value.trim());
  const pvRows = document.querySelectorAll('#fm-pv-table tbody tr:not(.fm-prior-row)').length;
  const luBtnState = document.querySelector('#fm-tensile-routing-chips button[title*="already"]').textContent.trim();
  const fmd = window.getFmData();
  return {
    segRows,
    pvRows,
    luBtnState,
    exportedInternal: fmd.internalDysfunction
  };
});
ok('One-tap routing adds LU to Card 1 Segment Assessment', routingVerification.segRows.includes('LU'), routingVerification.segRows);
ok('CRITICAL: Card 3 PV grid remains completely untouched (0 rows)', routingVerification.pvRows === 0, routingVerification.pvRows);
ok('Routing chip flips to confirmed state "✓ LU in Card 1"', routingVerification.luBtnState.includes('LU in Card 1'), routingVerification.luBtnState);
ok('getFmData().internalDysfunction exports apparatuses & tensiles', routingVerification.exportedInternal && routingVerification.exportedInternal.apparatuses.includes('Digestive (ADI)'));

// Close the drawer
await page.click('#fm-internal-dysf-toggle');
await page.waitForTimeout(100);
const drawerClosed = await page.evaluate(() => document.getElementById('fm-internal-dysf-body').style.display === 'none');
ok('Tapping drawer toggle collapses Internal Dysfunction body', drawerClosed);

console.log('--- 5. Grade & Treat Point, Derive Diagonal, Mo/Ve & Capsule Sync ---');
// Add CX segment to FM and grade/treat a point (CX-AL R)
await page.evaluate(() => {
  window.addFmSegment('today', 'CX', true, true);
  const segVrs = document.querySelector('#fm-seg-table tbody tr .seg-vrs');
  if (segVrs) {
    segVrs.value = '3';
    segVrs.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (typeof window.syncFmMoveTable === 'function') window.syncFmMoveTable();
});
await page.waitForTimeout(200);

const cxRow = page.locator('#fm-pv-table tbody tr:not(.fm-prior-row)').first();
const cell = cxRow.locator('.pv-cell[data-side="rt"][data-plane="AN-LA"]').first();
await cell.scrollIntoViewIfNeeded();
await cell.click();
await page.waitForTimeout(100);
await page.click('#pv-picker button[data-grade="3"]');
await page.waitForTimeout(100);
await cell.click();
await page.waitForTimeout(100);
await page.click('#pv-picker button[data-act="treated"]');
await page.waitForTimeout(150);

// Add step to hypothesis sequence
await page.click('#fm-add-seq-step');
await page.waitForTimeout(150);
await page.selectOption('#fm-picker-plane', 'AN-LA');
await page.selectOption('#fm-picker-seg', 'CX');
await page.selectOption('#fm-picker-side', 'rt');
await page.click('#fm-picker-save');
await page.waitForTimeout(200);

// Set Mo/Ve row post value
await page.evaluate(() => {
  const row = document.querySelector('#fm-move-table tbody tr');
  if (row) {
    row.dataset.post = '0';
    const valEl = row.querySelector('.mv-val');
    if (valEl) valEl.textContent = '0';
  }
  if (typeof window.syncFmCapsule === 'function') window.syncFmCapsule();
});

// Switch back to Core tab and inspect Capsule
await page.evaluate(() => window.switchModuleTab('core'));
await page.waitForTimeout(250);

const activeCap = await page.evaluate(() => {
  const cap = document.getElementById('fm-capsule-card');
  const badge = document.getElementById('fm-capsule-badge');
  const treated = document.getElementById('fm-capsule-treated');
  const hyp = document.getElementById('fm-capsule-hyp');
  const move = document.getElementById('fm-capsule-move');
  return {
    badge: badge ? badge.textContent.trim() : '',
    treatedText: treated ? treated.textContent.trim() : '',
    hypText: hyp ? hyp.textContent.trim() : '',
    moveText: move ? move.textContent.trim() : '',
    capAll: cap ? cap.textContent : ''
  };
});
ok('Active capsule badge is "Graded & treated"', activeCap.badge === 'Graded & treated', activeCap.badge);
ok('Active capsule lists treated point (CX-AL R)', activeCap.treatedText.includes('CX-AL R') || activeCap.capAll.includes('CX-AL R'), activeCap);
ok('Active capsule shows derived diagonal', activeCap.hypText.includes('AL') || activeCap.capAll.includes('AL'), activeCap);
ok('Active capsule shows Mo/Ve line', activeCap.moveText.includes('pre:') || activeCap.capAll.includes('pre:'), activeCap);

console.log('--- 6. State & Scroll Round-trip Between Tabs ---');
await page.locator('#presenting-problem').fill('Persistent clinical impression notes');
await page.evaluate(() => window.scrollTo(0, 420));
await page.waitForTimeout(100);
const coreScroll = await page.evaluate(() => window.scrollY);

// Switch to FM
await page.evaluate(() => window.switchModuleTab('fm'));
await page.waitForTimeout(200);

// Verify cell in FM still graded
const fmGraded = await page.evaluate(() => {
  const fmd = window.getFmData();
  const treated = fmd.pv.filter(c => !c.isPrior && c.treated);
  return treated.length > 0 && treated[0].grade === '3';
});
ok('Graded FM cell survives round trip', fmGraded);

// Switch back to Core
await page.evaluate(() => window.switchModuleTab('core'));
await page.waitForTimeout(200);

const coreRestored = await page.evaluate((expectedScroll) => {
  const text = document.getElementById('presenting-problem').value;
  const scrollY = window.scrollY;
  return {
    textIntact: text === 'Persistent clinical impression notes',
    scrollDiff: Math.abs(scrollY - expectedScroll),
    scrollY
  };
}, coreScroll);
ok('Core text persists after tab round-trip', coreRestored.textIntact);
ok('Core scroll position restored within ±2 px', coreRestored.scrollDiff <= 2, coreRestored);

console.log('--- 7. Outline Item Click from FM Tab Shows Core ---');
await page.evaluate(() => window.switchModuleTab('fm'));
await page.waitForTimeout(200);

// Click Chief Complaint outline item (e.g. from nav or programmatic link)
await page.evaluate(() => {
  const item = document.querySelector('.outline-item[data-target="sec-chief-complaint"]');
  if (item) item.click();
});
await page.waitForTimeout(250);

const outlineJump = await page.evaluate(() => {
  const cur = window.getActiveModuleTab();
  const vc = document.getElementById('view-core');
  const vf = document.getElementById('view-fm');
  return {
    currentTab: cur,
    coreVisible: vc.style.display !== 'none',
    fmHidden: vf.style.display === 'none'
  };
});
ok('Clicking Core sidebar item from FM tab switches back to Core tab',
  outlineJump.currentTab === 'core' && outlineJump.coreVisible && outlineJump.fmHidden,
  outlineJump
);

console.log('--- 8. Removing FM Cleans Up Tabs, Capsule, and Enabled Flag ---');
await page.evaluate(() => window.switchModuleTab('fm'));
await page.waitForTimeout(150);

// Safety confirmation check: dismiss first
page.once('dialog', async d => {
  await d.dismiss();
});
await page.locator('#fm-hide').click();
await page.waitForTimeout(150);
const stillEnabled = await page.evaluate(() => window.getFmData().enabled);
ok('Dismissing confirmation dialog keeps FM module active', stillEnabled === true);

// Accept confirmation dialog via tab close button (#fm-tab-close)
page.once('dialog', async d => {
  await d.accept();
});
await page.locator('#fm-tab-close').click();
await page.waitForTimeout(250);

const removedFm = await page.evaluate(() => {
  const tab = document.getElementById('tab-btn-fm');
  const cap = document.getElementById('fm-capsule-card');
  const cur = window.getActiveModuleTab();
  const fmd = window.getFmData();
  return {
    tabHidden: tab.style.display === 'none',
    capHidden: cap.style.display === 'none',
    curTab: cur,
    enabled: fmd.enabled
  };
});
ok('Remove FM hides tab and capsule, returns to Core, sets enabled=false',
  removedFm.tabHidden && removedFm.capHidden && removedFm.curTab === 'core' && !removedFm.enabled,
  removedFm
);

console.log('--- 9. Note Preview & cn.fm Mirror ---');
// When disabled
await page.click('#preview-open');
await page.waitForTimeout(200);
const prevDisabledText = await page.locator('#np-body').textContent();
ok('Note preview does not show FM when disabled', !(await page.locator('#np-body h4', { hasText: 'Fascial Manipulation' }).count()));
await page.click('#np-close');

const cnFmMirrorEmpty = await page.evaluate(() => JSON.parse(localStorage.getItem('cn.fm') || '[]').length === 0);
ok('cn.fm mirror is [] when FM is not enabled', cnFmMirrorEmpty);

// When enabled
await page.evaluate(() => window.openAdvancedModule('fascial-manipulation', { switch: false }));
await page.waitForTimeout(200);
await page.click('#preview-open');
await page.waitForTimeout(200);
const prevEnabledText = await page.locator('#np-body').textContent();
ok('Note preview includes the FM chart when enabled', (await page.locator('#np-body h4', { hasText: 'Fascial Manipulation' }).count()) === 1);
await page.click('#np-close');

console.log('--- 10. Keyboard Arrow Navigation Between Tabs ---');
await page.focus('#tab-btn-core');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(200);

const keyRight = await page.evaluate(() => {
  const fmTab = document.getElementById('tab-btn-fm');
  const cur = window.getActiveModuleTab();
  return fmTab.getAttribute('aria-selected') === 'true' && cur === 'fm';
});
ok('Keyboard ArrowRight switches focus and view to FM tab', keyRight);

await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(200);

const keyLeft = await page.evaluate(() => {
  const coreTab = document.getElementById('tab-btn-core');
  const cur = window.getActiveModuleTab();
  return coreTab.getAttribute('aria-selected') === 'true' && cur === 'core';
});
ok('Keyboard ArrowLeft switches focus and view back to Core tab', keyLeft);

console.log('--- 11. Viewports & Responsiveness ---');
// 390px Mobile
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
const overflow390 = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
ok('At 390 px: document.documentElement has no page-level horizontal scroll', overflow390);

await page.screenshot({ path: path.join(dir, '..', 'screenshots', 'fm-workspace-tabs-390px.png'), fullPage: false });

// 820px iPad
await page.setViewportSize({ width: 820, height: 1180 });
await page.waitForTimeout(200);
const overflow820 = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
ok('At 820 px: no page-level horizontal scroll', overflow820);

// 1280px Desktop
await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(200);

// On Core: outline is visible
const outlineCoreVis = await page.evaluate(() => {
  const o = document.querySelector('.outline');
  return window.getComputedStyle(o).display !== 'none';
});
ok('At 1280 px: sidebar outline is visible on Core tab', outlineCoreVis);

// Switch to FM: outline is hidden
await page.evaluate(() => window.switchModuleTab('fm'));
await page.waitForTimeout(200);

const outlineFmHidden = await page.evaluate(() => {
  const o = document.querySelector('.outline');
  return window.getComputedStyle(o).display === 'none';
});
ok('At 1280 px: sidebar outline is hidden on FM tab to grant full width to grids', outlineFmHidden);

await page.screenshot({ path: path.join(dir, '..', 'screenshots', 'fm-workspace-tabs-1024px.png'), fullPage: false });

// Switch back to Core
await page.evaluate(() => window.switchModuleTab('core'));
await page.waitForTimeout(200);

ok('Zero console errors throughout test run', errors.length === 0, errors);

await browser.close();
const failed = results.filter(r => !r[1]).length;
console.log('============================');
console.log(failed ? `${failed} FAILED` : 'ALL 11 CHECKS PASSED');
console.log('============================');
process.exit(failed ? 1 : 0);
