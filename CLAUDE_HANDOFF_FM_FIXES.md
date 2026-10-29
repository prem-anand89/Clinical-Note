# Handoff: FM section fixes and refinements (Argon 4 review, triaged)

> **Status: DONE (29 Oct 2026).** Step 0 `500906f`, Step 1 `41cea30` (plus Card 1 item 1f), Step 2 `b250de1`, Step 3 `3945ca7`. Details are in `PROTOTYPE_CHANGELOG.md`. Kept for reference; delete once the FM work moves to the React port.

**For:** a Claude Sonnet session implementing this in `/home/theranet/Clinical-Note/`.
**Source:** Argon 4's "FM End-to-End Refactoring" handoff, checked claim-by-claim
against the code on 2026-10-29. Only the verified, accepted items are below.
Rejected or already-built items are listed at the end so you don't build them.

## Ground rules

- Prototype only. Single file `clinical-note.html` (vanilla JS, no dependencies).
  Do not touch TheraNet (`/home/theranet/TN Project/thera-net-1`).
- Every `<button>` needs an explicit `type="button"`.
- Use existing CSS tokens (`--clinical`, `--line`, `--surface`, `--ink-faint`, …).
- **Line numbers in this doc are approximate and will drift.** Find code by the
  ids and function names given, using grep.
- Don't break `window.getFmData()`'s existing fields. Add fields, never rename.
- Local commits only. **Never push.** One commit per step, with a
  `PROTOTYPE_CHANGELOG.md` entry in the same commit.
- Signed-note lock: any new clickable control in `<main>` is blocked when
  `body.note-locked` is set unless it's on the allow-list in the click guard
  (search `note-locked`). New *editing* controls should stay blocked. Only add
  view-only controls to the allow-list.

## How to test

Tests are Playwright scripts in `tests/`. They load `playwright-core` through
`createRequire('/home/theranet/TN Project/thera-net-1/package.json')`. Copy that
header from an existing test; ESM `import` and `NODE_PATH` don't work. Chrome is at
`/usr/bin/google-chrome`, headless.

Run all of them:
```
cd /home/theranet/Clinical-Note
for t in tests/*.mjs; do out=$(node "$t" 2>&1); if echo "$out" | grep -qE "FAIL|Error"; then echo "== $t"; echo "$out" | grep -E "FAIL|Error" | head -5; fi; done; echo finished
```
Expected output is just `finished`. Grep for `FAIL`/`Error`, not `rror`, which
matches passing lines.

Gotchas:
- Opening the FM grade picker (`#pv-picker`) needs a real click. `force:true`
  skips it.
- Open FM in tests with `window.openAdvancedModule('fascial-manipulation')`.
- Never use `|| true` in an assertion.
- Compare text with whitespace collapsed: `.replace(/\s+/g,' ').trim()`.

Before each commit, also load the page and check for zero `pageerror` events.

---

## Step 0: clean working tree (owner decision, ask first)

As of 2026-10-29 the working tree has an **uncommitted whole-file reformat**
(~27k-line diff) that isn't from Claude. It had corrupted one line (a stray
`...[truncated for diff preview]` in the Facial Palsy composite-score code). That
line has been repaired, and on top of it are two uncommitted Claude changes:

1. Internal Dysfunction drawer (`#fm-internal-dysf-card`) moved to sit directly
   **under Card 1 (Segment Assessment), before Card 2 (FM History)**. Owner
   decision: internal dysfunction can still be part of the complaint.
2. Tests: a placement check in `tests/fm-workspace-tabs.mjs`, and a
   whitespace-tolerant comparison in `tests/fm-section4-hybrid1.mjs`.

All 17 suites pass on the current tree.

**Ask the owner** which option they want before anything else:
- **(A) Recommended: drop the reformat.** Save a backup, `git checkout
  clinical-note.html`, re-apply only the drawer move (cut the block from the
  `<!-- Internal Dysfunction — Stecco's Level 3` comment through the drawer's
  closing `</div>`, paste it after Card 1's closing `</div>`, just before
  `<!-- 2. History -->`), keep the two test edits, run all tests, and commit.
- **(B) Keep the reformat.** Commit the current tree as is: one "chore: reformat
  + drawer move" commit.

Don't start Step 1 until this is committed.

---

## Step 1: bugs and missing wiring

### 1a. Undefined CSS tokens
- `.module-tab-bar` has `background: var(--bg)`, but `--bg` doesn't exist, so the
  sticky bar is transparent and content shows through. Change it to
  `var(--surface)`.
- `--rust` is used (tab close hover, `.fm-remove-link:hover`, a ⌫ button) but
  never defined. Add `--rust: #b3261e; --rust-dim: #fdecec;` to `:root`.
- Grep for any other `var(--` token missing from `:root` and fix those too.

**Test:** computed background of `#module-tab-bar` isn't transparent; computed
`--rust` is non-empty.

### 1b. Primary complaint → Card 1: onset and VRS
Function `routePrimaryComplaintToFm()` (Chief Complaint routing) and
`window.routeFmSegment(sourceKey, segStr, sideVal, durationStr, noteStr)`.

- Extend the signature additively:
  `routeFmSegment(sourceKey, segStr, sideVal, durationStr, noteStr, onsetVal, vrsVal)`.
  Existing callers (systemic, tensile, secondary-removal) keep working with
  `undefined`.
- In `routeFmSegment`, when given, set the row's `.seg-onset` select and its
  `.seg-vrs` input. Keep the existing `dataset.touched` guard: once the therapist
  edits the row, routing stops overwriting it.
- Card 1's onset select is a Trauma yes/no (`value="N"` Gradual / `value="Y"`
  Trauma). It gets a blank first option in **1f**. Do 1f first. Map
  `#onset-mechanism button.selected` `data-val` as:
  `Sudden → Y`, `Insidious → N`, `Flare-up → N`, `Post-Surgical → Y`.
  **Post-Surgical → Y is an assumption. Note it in the changelog for owner
  confirmation.** No onset selected → blank.
- VRS: read the selected value from `#nrs-current` (`.nrs-scale`; inspect its
  markup for the selected class and value attribute) and pass it as `vrsVal`. It's
  a suggested starting value the therapist can edit.
- Add `#onset-mechanism` and `#nrs-current` to the document click listener that
  re-triggers `routePrimaryComplaintToFm` (it already watches `#region-chips`,
  `#laterality`, `#onset-timeline-chips`, `#aggravating-chips`).
- After setting VRS programmatically, make Card 5's Pre update. Card 5's
  `.move-prevrs` is derived from Card 1's `.seg-vrs`, but probably only on input
  events. Dispatch an `input` event on the `.seg-vrs` field, or call the existing
  re-render. **Make sure that event doesn't trip the `touched` guard.** The guard
  listeners are `{once:true}` input/change listeners added when the row is
  created. Either set a flag around the dispatch or call the Card 5 re-render
  directly instead of dispatching.

**Test:** Knee + Right + Sudden + NRS 7 → the auto Card 1 row has seg `GE`, side
`rt`, onset `Y`, VRS `7`, the Card 5 Pre for that row shows 7, and the row is still
`.fm-auto-row` (not adopted). Then edit the VRS by hand and change the NRS → the
row keeps the hand-entered value.

### 1c. Secondary complaint → Card 1
Function `routeSecondaryToFm()`, inside the secondary-complaint card builder.

- Bug: it reads the card's onset (`Sudden | Insidious | Chronic`) and passes it as
  *duration*. Pass it as `onsetVal` instead: `Sudden → Y`, `Insidious → N`,
  `Chronic → blank` (chronic says nothing about trauma). For `Chronic` pass
  `durationStr = 'Chronic'`; otherwise leave duration empty.
- Bug: the card's free-text `input[placeholder="Other unlisted factors"]` is
  ignored. Append its value to the movements list, the same way
  `#aggravating-other` is handled for the primary complaint, and add an `input`
  listener that re-routes.
- Severity stays where it is. Don't invent a VRS from Mild/Moderate/Severe.

**Test:** add a secondary complaint (Ankle / Foot, Right, Insidious, free text
"Morning stiffness") → a second Card 1 row: `TA`, `rt`, onset `N`, empty
duration, and painful movements containing "Morning stiffness".

### 1d. FM History: field attributes and index surgery
- `addCompactHistoryRow(container, typeLabel, fields)`: add
  `data-hist-field="date|region|side|detail|recovery"` (whichever apply) to each
  generated input/select.
- `window.syncFmHistory`: read fields by `[data-hist-field=…]` instead of the
  positional `inputs[0..4]` scraping. Keep the positional read as a fallback for
  rows without the attribute.
- Add the **index surgery** from Chief Complaint: when
  `#onset-mechanism` = `Post-Surgical` and a surgery category is chosen
  (`#surg-category-chips`, `#surgery-type` hidden input, `#surgery-date`), add one
  `Surgery` row to `#fm-hist-table`, segment from `REGION_TO_FM_SEGMENT` (map
  surgery categories: Knee→GE, Hip→CX, Shoulder→HU, Spine→LU, Ankle/Foot→TA,
  Other→blank), detail = procedure, tagged "(index)". Re-sync on clicks in those
  controls.
- **Don't** route the index *injury* (`Sudden` + `#moi`). It's already Card 1's
  onset; FM History is for previous events.
- Deleting a Section 2 history row already re-syncs through the existing
  MutationObserver. Don't add a second mechanism; just test it.

**Test:** add a past injury in Section 2 → it appears in `#fm-hist-table`; delete
it → it's gone. Set Post-Surgical + Knee + TKR + date → an index Surgery row
appears; switch onset to Insidious → it disappears. Manual rows (`data-manual`)
survive throughout.

### 1e. Core ↔ FM: Intervention chip and Impression cross-refs
- When ≥1 current-visit PV cell has `data-treated="true"`, select the
  `#manual-therapy-chips [data-chip="Fascial Manipulation (FM)"]` chip if it isn't
  already selected, and mark it `data-auto="fm"`. If the treated count drops to 0
  and the chip still has `data-auto="fm"`, deselect it. If the therapist taps the
  chip themselves, remove `data-auto` (from then on it's theirs). Hook this to the
  same place the capsule/density updates run after a grade or treated change.
- `updateClinicalImpressionCrossRefs()`: when `getFmData().enabled`, add one line:
  "FM: <hypothesis from #fm-hyp-diag, or 'no pattern yet'> · N points treated".
  Use the existing line styling. Call it when FM data changes, or at least when the
  Core tab is shown (`switchModuleTab('core')`).

**Test:** grade and treat one cell → the FM chip is selected and the cross-refs
show the FM line; untreat it → the chip clears. Tap the chip by hand first → it
stays selected after untreating.

### 1f. Card 1 (Segment Assessment): no silent defaults, readable columns. Do this before 1b.
Found on 2026-10-29: with Chief Complaint onset = **Sudden (Traumatic)**, the
auto-routed Card 1 row showed **"Gradual (No)"**. The select has no blank option,
so every row records "no trauma" whether or not anyone assessed it. It's the same
problem as the rejected "mark untested as WNL": the note records a value nobody
entered. The template is the `trSeg.innerHTML` block in `addFmSegment()`.

- **Onset → "Trauma?"**: rename the column header from "Onset" to "Trauma?". It is
  a yes/no on trauma, and "Onset" clashes with Core's Onset (Insidious / Sudden /
  Post-Surgical / Flare-up). Options become `"" —`, `N No`, `Y Yes`, with blank
  as the default. Short labels also fix the truncation ("Gradual (N…" at 1024 px,
  "Grac" at 390 px).
- **Side**: add a blank `—` first option as the default for manually added rows.
  Today a new row silently says R. Routed rows still get their side from
  laterality.
- **getFmData()**: export blank as `''` (not `'N'` / `'rt'`). Check
  `session-note.html`, the preview and the tests for any consumer that assumed a
  value was always there.
- **Column widths**: at 1024 px, give Duration and VRS enough width for "1-4 wks"
  and "0–10". In the phone card layout (< 744 px, the CSS block "Segment
  Assessment table-to-card transformation"), let SEG / SIDE / DUR / TRAUMA? / VRS
  wrap onto two rows instead of squeezing five fields into one, so nothing
  truncates at 390 px. Check by screenshot at 390 and 1024.
- **Row order**: keep SiPa (primary complaint) as the first row. Then PaConc,
  then internal, then manual rows. Today rows appear in whatever order routing
  fired.

**Test:** a fresh manual row has Side `''` and Trauma? `''`; Sudden + Knee routes
Trauma? `Y`; no onset selected → `''`; at 390 px, no Card 1 input's text is wider
than its box (`scrollWidth <= clientWidth`) for the routed GE row; adding a
secondary complaint before the primary still leaves the primary row first.

**Commit:** `fix(fm): tokens, complaint→Card 1 onset/VRS, secondary routing, history fields + index surgery, FM chip and cross-refs`

---

## Step 2: de-duplication

### 2a. One sequence action
There are three overlapping controls today: `#fm-apply-to-seq` (Card 3 density
strip), `#fm-re-derive-btn` (Card 4 banner) and `#fm-seq-from-findings` (Card 4
builder).
- Re-derive the hypothesis banner automatically whenever a PV grade or treated
  state changes (call whatever `#fm-re-derive-btn`'s handler calls). Then remove
  `#fm-re-derive-btn`.
- Keep **one** "⚡ Apply top findings to sequence" button in the Card 4 header and
  remove the others, plus `＋ Add point` (`#fm-add-seq-step`). Point every handler
  and every test that referenced a removed id at the survivor. Grep `tests/` for
  the old ids.
- Auto-derive must not overwrite anything the therapist typed into the hypothesis
  or reasoning fields. Only the derived banner text updates.

### 2b. "Not in the palpation grid" chips move to Card 3
`#fm-grid-missing` / `refreshGridMissing()` currently render in Card 1. Move the
strip into Card 3's toolbar, next to `#pv-add-region-tabs`, labelled "From Card 1:",
listing Card 1 segments not yet in the grid as one-tap `＋ SEG` chips (existing
behaviour). Remove it from Card 1.

### 2c. One response field
FM Card 5 has its own multi-select `#fm-session-response` chips; Core
Intervention has the single-choice `#response-to-treatment` (Improved / Unchanged
/ Worse / Unclear). The owner decided earlier: **one** response field.
- Remove the `#fm-session-response` chips from Card 5. In their place, show a
  copy of the Core field that stays in sync with it (selecting in either place
  sets the same value), labelled "Response to treatment (also in Intervention)".
- `getFmData().sessionResponse` must keep returning an array: return
  `[coreValue]` or `[]`. Check `session-note.html` and the tests for consumers of
  `sessionResponse`.

### 2d. Internal dysfunction: context pills, not copied text
Code around `fmInternalDysfEl` copies the Core systemic-symptom text into
`#fm-internal-dysf`.
- Stop copying. At the top of `#fm-internal-dysf-body`, render the selected Core
  systemic symptoms (`#internal-dysfunctions .chip.selected`, plus
  `#internal-dysf-detail` text) as read-only pills headed "From Subjective".
  Re-render on changes.
- `#fm-internal-dysf` becomes FM-only notes, with the placeholder "FM notes on
  internal dysfunction". Keep the apparatus auto-flagging that already exists.
- Leave VM's `#vm-internal-dysf` alone. That's a separate module.

**Commit:** `refactor(fm): single sequence action, grid-missing in Card 3, one response field, internal-dysfunction context pills`

---

## Step 3: additions

### 3a. Role badges
In Card 1 rows and Card 3's segment column, show a small badge from the row's
source:
- `data-fm-source="primary-complaint"` → **SiPa** (site of pain)
- `secondary-*` → **PaConc** (concomitant pain)
- `systemic-*` / `tensile-*` → **Int** (internal)
- manual rows → no badge

Style it like a muted pill. Add `role` to each segment in `getFmData().segments`
(`'SiPa' | 'PaConc' | 'Int' | null`). Update `PAYLOAD_SHAPE_DRAFT.md`.

### 3b. FM block in the note preview
In the preview script (`<script id="preview-js">`), the FM section is currently one
line (`getFmSummaryLine`). When `getFmData().enabled`, replace it with a compact
block:
1. Segments: `Segment | Role | Side | Duration | Onset | VRS | Painful movements`
2. History: one line per Pa Prev / Trauma / Surgery row
3. Points: only graded (≥1) and treated points, plus the hypothesis line
4. Outcome: Mo/Ve pre → post and palpatory re-check pre → post (only if present)

Keep it plain HTML tables using the preview's existing classes. Escape everything
with the preview's `esc()`.

### 3c. Pattern prompts in the density summary
In `updateDensitySummary()`, add up to three quiet, non-blocking lines (muted text,
not warnings):
- Both planes of a pair densified (grade ≥2) on the same segment and side (AN+RE,
  LA+ME, IR+ER): "AN and RE both densified on LU R". **Don't call it
  "co-contraction".**
- A densified segment (≥2) that also appears in FM History: "GE R also has a
  previous event in FM History (Trauma, 2019)".
- In Card 4, all planned points on one segment: "All planned points are on GE.
  Consider points along the sequence."

These describe patterns; they never write a hypothesis (owner decision: no
generated clinical text).

**Commit:** `feat(fm): role badges, FM block in note preview, pattern prompts`

---

## Do NOT build (triaged out)

| Argon item | Why not |
|---|---|
| 2.2 region change event dispatch | Already done: region chips dispatch `change` on the hidden `#region`. |
| 2.2 two regions per complaint | Deferred. Core region drives objective defaults; Card 1 segment is editable and "+ Add segment" covers a second. |
| 2.3 history removal sync | Already done by the MutationObserver in `syncFmHistory`. |
| 2.1 push VRS to Card 5 Pre | Already derived from Card 1 VRS; only make it refresh (1b). |
| 2.4 one-way session-response mapping | Replaced by 2c (one field). |
| 4.2 movement → Stecco plane map | Clinically wrong: planes are segment-specific (knee flexion = RE-GE, hip flexion = AN-CX), and "Squat"/"Stairs" are activities, not planes. Needs an FM clinician first. |
| 4.3 full segment taxonomy | Already present (14 segments + CP1–CP3). |
| 4.5 catenary pills | Owner decision 29 Oct: **do not add catenary pills.** Keep the free-text catenary field. |
| Card 1 plane pills (AN RE LA ME IR ER) in Painful Movements, plus Card 3 column highlight / per-plane Card 5 | Owner decision 29 Oct: **skip.** Painful Movements stays free text. |
| Card 1 deficit-type, 24h-rhythm and chronology columns; per-row "+ Grid" button; merged 6-column layout; auto-written hypothesis note | Reviewed 29 Oct and not built: Core already holds these at complaint level, and the rest duplicates or is unsourced. |

## When done

- All suites pass, zero page errors, 3 commits (plus Step 0's).
- Changelog entries for each step. Include the open owner question: Post-Surgical
  onset → Trauma "Y"?
- Update `PAYLOAD_SHAPE_DRAFT.md` (segment `role`, `sessionResponse` source).
- Tick items in this doc, or delete it once fully done and note that in the
  changelog.
- Don't push.
