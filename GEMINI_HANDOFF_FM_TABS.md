# Handoff: FM tabbed workspace + Core capsule (revised plan)

Supersedes `advanced_modules_tabbed_workspace_plan.md` (same idea, corrected after review). Prototype only: work in `/home/theranet/Clinical-Note`, branch `main`, local commits, no push, TheraNet untouched. Line numbers drift; search by name.

## Goal
Give Fascial Manipulation (FM) its own tab so the wide grids get room, and show a small read-only **FM capsule** in the Core note. Everything else in the Core note stays as it is.

## Rules
- Do not change `getFmData()` keys, `window.openAdvancedModule` / `hideAdvancedModule` signatures, or `localStorage['cn.fm']` (read by `session-note.html`). Additive fields only.
- Every `<button>` has `type="button"`. No new dependencies. Use existing CSS variables (no inline hex).
- Run every `tests/*.mjs` before each commit; each must end with `ALL PASS` / `ALL ... CHECKS PASSED`. Do not claim a pass you did not run. One commit per task.

## Task 0 — Clean-up first (found in review of the 26–27 Oct commits)
1. `tests/pv-layout-test.mjs` fails: "segment picker is located below segment table". The picker moved below the PV grid in a later commit; update the assertion to the new location. The changelog currently says this suite passes; correct it.
2. 14 loose screenshots sit in the repo root (`desktop_*.png`, `mobile_*.png`, `pv_session_mockup.png`, …) and `fm-review2-*.png` are modified. Move them to `screenshots/` (or delete) and keep them out of commits.
3. `PROTOTYPE_CHANGELOG.md` only documents tasks 1 to 5 of the first FM handoff. Add entries for the later commits: grouped date cells + Visit filter (All / Today), Palpatory Re-check matrix, Section 4 hybrid synthesis, Card 1 onset and empty states, session banner, and the header change "MRN" → "Patient ID" (also in the note preview). That header change is outside the FM module; say in the entry that it was out of scope and needs the owner's OK, or revert it.
4. Hidden FM data for non-FM patients: choosing a region in Chief Complaint already creates a hidden FM segment row (`routeFmSegment`, now triggered by a document click listener). With FM never opened, `getFmData().segments` is `["GE/rt"]`. Fix: add `enabled: boolean` to `getFmData()` (true once the module was opened/enrolled) and make the note preview, `cn.fm` mirror and any export ignore FM data when it is false. Do not delete the auto-row.
5. Question to answer in the changelog, not code: segments auto-routed from Chief Complaint appear in Card 1 but not in the PV grid, so the therapist adds the same segment twice. Either confirm this is intended or add a one-tap "Add GE to grid" on that row. Do not change it silently.
6. On a 390 px phone the Mo/Ve table crops the Outcome column. Make it scroll with a visible edge or stack it.

## Task 1 — Tab bar, views, capsule markup
- Tab bar under `.note-head` with `role="tablist"`, tabs `role="tab"` + `aria-selected`, Left/Right arrow keys move focus, `aria-controls` on each panel (`role="tabpanel"`). It scrolls horizontally inside itself on phones (`overflow-x:auto`); the page must not get a horizontal scrollbar (`document.documentElement.scrollWidth === clientWidth` at 390 px).
- Put the Core sections in `#view-core` and `#sec-fascial-manipulation` in `#view-fm`. Tab bar is sticky below the app header; check it does not cover the sticky PV columns or the lean section headers.
- Capsule `#fm-capsule-card` is a **sibling placed directly after `#sec-objective`**, not inside it (the Objective body collapses). Shown only when FM is enabled. Do not use `btn btn-secondary` (not defined); reuse an existing button style. Use CSS classes and variables only.
- Capsule empty text exactly: `Assessment initialized · 0 points treated`, with the open link. Active text lists today's treated points (`CX-AL R`), the derived diagonal, and Mo/Ve pre → post per segment. Status badge: `Evaluating` / `Graded & treated`.
- Use one set of IDs everywhere: `#module-tab-bar`, `#tab-btn-core`, `#tab-btn-fm`, `#view-core`, `#view-fm`, `#fm-capsule-card`, `#fm-capsule-badge`, `#fm-capsule-hyp`, `#fm-capsule-treated`, `#fm-capsule-move`.

## Task 2 — Switching (state, scroll, open vs show)
- `switchModuleTab(key)` only toggles views and remembers each view's `scrollY`; on switching it restores the saved position (FM starts at top the first time). No re-render, no data refetch.
- Split behaviour: `openAdvancedModule('fascial-manipulation')` called **by an explicit user action** (tab, capsule link, dock chip, sidebar item, suggestion pill) enables FM and switches to its tab. Any programmatic or automatic call must not switch tabs: add a second argument `{ switch: false }`. Existing tests call it with one argument and expect FM visible and clickable, so one-argument calls keep switching.
- Core sidebar/outline items and the scroll-spy: clicking a core section while on the FM tab switches to Core first, then scrolls. The scroll-spy must ignore hidden sections.
- Left outline: hide it while the FM tab is active so the grids get the extra width (this is the real width gain; a tab alone gives none). Restore it on Core.
- Hash/deep link `#fm` optional; not required.

## Task 3 — Capsule sync
- `syncFmCapsule()` reads `getFmData()` but uses **today's rows only** (`!isPrior`), and treated = cells with `treated`. Call it when switching to Core, when the note preview opens, and on the existing FM change events. No MutationObservers.
- Note preview and the sign check include a one-line FM summary when FM is enabled (reuse the capsule text).
- After signing, the FM tab opens read-only: the sign lock currently disables inputs and chips but not `.pv-cell`, the grade picker or the Mo/Ve steppers. Make those inert when locked, and confirm the capsule link still opens FM for reading.

## Task 4 — Other modules
Keep FM as the only tabbed module in this pass, but drive the tab list from `window.MODULE_REGISTRY` entries (add an optional `tab: true` flag, set only on FM) so VM/CST/NKT/DNS can follow without copying code. Their inline behaviour must not change.

## Task 5 — Tests (`tests/fm-workspace-tabs.mjs`)
1. Default load: Core tab active, FM tab hidden, capsule hidden.
2. `openAdvancedModule('fascial-manipulation')` shows the tab, switches, and the five FM cards are visible and clickable.
3. Empty capsule shows the exact empty text; after grading and treating a point and switching back it shows the point, diagonal and Mo/Ve line.
4. Typed text in Core and a graded FM cell both survive a round trip between tabs; scroll position in Core is restored (±2 px).
5. `openAdvancedModule('fascial-manipulation', { switch: false })` enables FM without switching.
6. Clicking a Core sidebar item from the FM tab shows Core.
7. Remove FM → tab and capsule hidden, Core shown, `getFmData().enabled === false`.
8. Phone 390 px, iPad 820 px, desktop 1280 px: no console errors and no page-level horizontal scroll; outline hidden on the FM tab, restored on Core.
9. Signed note: FM cells and steppers do not respond; capsule link still opens FM.
10. Note preview shows the FM line only when enabled; `cn.fm` is `[]` when not enabled.
11. Keyboard: arrows move between tabs; `aria-selected` follows.

## Task 6 — Docs and commit
Changelog entry per task with the real test results (list any suite you could not run). Screenshots at 1024 px and 390 px into `screenshots/`. Local commits only.

## Out of scope
Body-chart FM segments, auto-written hypothesis text, changes to the pattern rule (≥2 distinct segments graded 2 or higher), session-note changes, the TheraNet port.
