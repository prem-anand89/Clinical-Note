# Handoff: Fascial Manipulation (FM) module improvements

Prototype only. Work in `/home/theranet/Clinical-Note` (standalone repo, branch `main`). Do not touch the TheraNet repo. Do not push; commit locally with small commits. Line numbers below are for commit `ffc655d` and will drift, so search by the names given.

## Context
The FM module (`#sec-fascial-manipulation`, opened with `window.openAdvancedModule('fascial-manipulation')`) was reviewed after your 26 Oct commits (PV layout toggle, side filter, region picker, manual history, Density & Pattern card). Three bugs were already fixed in `ffc655d` (distinct-segment counting, R/L display, side-count badges). Do not redo them. Five improvements remain. Owner decisions already made: **no FM segments on the body chart**; **no auto-generated hypothesis text** (the therapist writes their own one line; `fm-hyp-diag` stays rule-based); keep both R and L columns available.

## Rules
- Change only the FM module and its tests. Do not edit other sections of `clinical-note.html`.
- Stored data shapes stay as they are (`getFmData()`, side values `rt`/`lt`, `localStorage['cn.fm']` bridge read by `session-note.html`). If you must change a shape, stop and say so in the commit message and `PAYLOAD_SHAPE_DRAFT.md`.
- Every `<button>` needs `type="button"`.
- Prefer a real click in tests (a Playwright `force: true` click skips the grade picker). Wait about 150 ms after opening the picker.
- Run every script in `tests/` before each commit: `for t in tests/*.mjs; do node $t | tail -1; done` (all must say `ALL PASS`; allow ~2 minutes).
- Add to `PROTOTYPE_CHANGELOG.md` for each item. Do not claim a check you did not run.

## Tasks (in this order)

### 1. Prior-visit rows are read-only; remove the mock rows from real data
**Problem.** `addFmSegment("14/09/23", "GE")` and `("14/09/23", "HU")` run under "Inject Initial Mocks" for every note, even a knee patient. They can be graded like today's rows, and they flow into the density counts, Mo/Ve table, `getFmData()`, the payload and the session-note FM chips.
**Do.**
- Add a prototype switch: mock prior rows load only when `?demo=fm-history` is in the URL (or `window.FM_DEMO_HISTORY = true`). Default: none.
- A row whose date is not today is "prior": its PV cells are read-only (no picker), shown muted with a "Prior visit" label, and excluded from density counts, Mo/Ve rows, `fmTreated`/`cn.fm` and the "from highest findings" step builder. Their grades still appear as reference.
- Today's rows are unchanged.
**Accept.** Default load has zero rows; with the demo flag there are two prior rows that cannot be graded and do not change the density summary. `tests/pv-layout-test.mjs` and `tests/fm-chips.mjs` still pass (update them to use the demo flag only if they depend on the mock rows; say so in the commit).

### 2. Suggestion in the "Auto-derived diagonal / sequence" box
**Problem.** The box says "None" even when the density card detected a pattern, until "Apply to Sequence" is tapped.
**Do.** When patterns exist and no sequence steps exist, show a muted line in that box: `Suggested: AL diagonal (R) — tap to add`. Tapping does what "Apply to Sequence" does. It must never write the Detailed Reasoning field or any hypothesis text, and it disappears once steps exist. When steps exist, the box shows the derived diagonal as today.
**Accept.** Test: grade two segments on AL → suggestion appears; tap → steps added and `#fm-hyp-diag` shows the diagonal; reasoning textarea stays empty.

### 3. Mo/Ve table: one line per segment and side
**Problem.** `#fm-move-table` repeats a segment (e.g. two GE rows give "GE (rt)" twice).
**Do.** Key Mo/Ve rows by segment code + side. If today's segment table has a duplicate segment + side, show one Mo/Ve row (pre-VRS = the highest VRS among duplicates) and keep the segment table itself as entered (do not merge or delete rows). Use R/L in the labels.
**Accept.** Two GE R rows → one "GE · R" Mo/Ve row. Existing Pre/Post/Δ behaviour is unchanged; `getFmData().moVe` has no duplicate keys.

### 4. Phone layout: segment table as cards
**Problem.** At 390 px the segment table crops VRS and Painful Movements, and Side shows raw "rt".
**Do.** Below 744 px render each segment as a compact card (segment, side R/L, duration, trauma, VRS, painful movements) bound to the same inputs, with no duplicate state. Side options display "R"/"L" at all widths (values stay `rt`/`lt`). iPad and desktop keep the table. Keep the PV grid scrollable on phones (no change needed).
**Accept.** At 390 px no horizontal scroll in the segment area; editing a card field updates `getFmData().segments` and the Mo/Ve pre-VRS. A 390 px screenshot shows no cropped columns.

### 5. Optional: remember the side view
Keep R as the default. If the other side has graded points when the module opens (e.g. a reloaded draft), open on "Both" instead so nothing is hidden. Do not store anything in localStorage for this.
**Accept.** Programmatically grade a left cell, reload the module state, and the toggle starts on Both.

## Out of scope
Body-chart FM segments, auto-written hypothesis text, the session-note chips (already done), TheraNet port, and any change to the pattern rule (≥2 distinct segments graded 2 or higher on one plane/side/kind).

## Done means
All `tests/*.mjs` pass; one new test file `tests/fm-review2.mjs` covering items 1 to 5; screenshots at 1024 px and 390 px of the FM module attached or described in the changelog; changelog updated; local commits only, with one commit per item.
