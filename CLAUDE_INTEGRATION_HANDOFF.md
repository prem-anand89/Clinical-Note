# Thera.Net Core Assessment Upgrade — Handoff for Claude

**Context:** The `clinical-note.html` file in this directory is the finalized blueprint for the next-generation Core Assessment in Thera.Net. It is a massive clinical and UX **upgrade** over the existing `NoteEditorPage.tsx` currently in the `thera-net` repository. 

**Why this is an upgrade over the legacy Core Assessment:**
1. **Dropdown-Free UX:** Replaces the clunky 30-item `<select>` dropdowns with rapid, cascading chip-based selection grids.
2. **Clinical Depth:** Introduces structured intervention dosages (sets/reps/grades) instead of flat string arrays, and adds formal tracking for Patient Functional Priorities (PSFS).
3. **Safety Workflows:** Introduces a mandatory Red-Flag Disposition workflow (forcing clinical attestation when red flags are positive).
4. **Data Preservation:** The new architecture intelligently preserves Objective data (ROM/MMT) when a clinician changes the primary anatomical region, rather than wiping the form clean.
5. **Advanced Modules:** Seamlessly integrates the highly requested Fascial Manipulation (FM) module directly into the core assessment flow.

**Your Mission:** You are tasked with replacing the legacy `NoteEditorPage.tsx` with this upgraded assessment structure. 

**Status update (after Phase 12 of the prototype):** scope is wider than the list below. The prototype now also covers the 10 MVP condition templates, Group A neuro (incl. ISNCSCI), questionnaires, intervention dosage, structured HEP/goals, risk summary and the red-flag sign gate. Read the **Phase 12** section of `PROTOTYPE_CHANGELOG.md` and `PAYLOAD_SHAPE_DRAFT.md` (draft v1.4 payload + the v1.3 reconciliation items, incl. a red-flag list mismatch) before Step 1. Cutover is side-by-side behind a flag (new editor dark, old stays default); legacy v1.3 notes keep opening in `NoteEditorPage`. Out of scope: Protocol Library / post-op drift, Exercise Library, outcome tracking relocation. Full plan: `~/.claude/plans/radiant-cuddling-ritchie.md`.

**Rules:**
1. Treat `clinical-note.html` as a **read-only blueprint**. Do not modify it. It already uses Thera.Net's design tokens and layout logic.
2. Read `PROTOTYPE_CHANGELOG.md` to understand all the clinical workflows and features that were built into the prototype.
3. Follow the detailed component mapping and architectural roadmap below to rebuild this within React, section by section.

---
## 1. Architectural Strategy

Currently, `thera-net` implements a heavy `NoteEditorPage.tsx` (~4,200 lines) driven by `CoreAssessmentPayload` (`src/domain/coreAssessment.ts`). Our goal is to port the UX and structural improvements from the standalone `clinical-note.html` prototype into the React environment, effectively replacing the current `NoteEditorPage` UI.

### Key Shifts:
- **Vanilla JS to React State:** The prototype uses direct DOM manipulation (`el.classList.toggle`, `innerHTML`). In `thera-net`, this will be rewritten to use controlled React inputs (via `react-hook-form` or standard controlled state) tied directly to the `CoreAssessmentPayload`.
- **Component Decomposition:** The monolithic `clinical-note.html` sections will be broken down into individual React components (e.g., `ChiefComplaintSection.tsx`, `HistorySection.tsx`, `FmAssessmentSection.tsx`) to keep file sizes manageable.
- **Payload Extension:** `src/domain/coreAssessment.ts` will need to be expanded to support the new features (Functional Priorities, Intervention Dosages, FM Segments, Red Flag Disposition).

## 2. Design System Alignment

The standalone HTML prototype has now been updated to use `thera-net`'s global design tokens extracted from `src/index.css` and its Tailwind configuration.

**Tokens & Styling Extracted:**
- **Typography:** Updated Google Fonts to import `IBM Plex Sans` (sans-serif) and `Fraunces` (display/serif). Applied `Fraunces` to section headers and `IBM Plex Sans` for body text.
- **Shadows:** Standardized to `--shadow-1` and `--shadow-2` styles used throughout the React app.
- **Colors:**
  - `--surface` mapped to TheraNet's `--paper` (`#f5f5f4`)
  - `--card` mapped to TheraNet's `--surface` (`#ffffff`)
  - `--ink` mapped to TheraNet's `--ink` (`#262626`)
  - `--ink-soft` mapped to TheraNet's `--muted` (`#3f4549`)
  - `--line` mapped to TheraNet's `--border` (`#e2e2e1`)
  - `--clinical` (Teal) mapped to TheraNet's `--teal` (`#2c5f63`)
  - `--clinical-dim` mapped to TheraNet's `--teal-light` (`#e4edec`)
  - `--context` (Rust/Alerts) mapped to TheraNet's `--rust` (`#a6552f`)
  - `--amber` mapped to TheraNet's `--amber` (`#9c6f1e`)

## 3. Component Mapping

To port the UI, we will map custom HTML structures from `clinical-note.html` to existing `thera-net` React components in `src/components/ui.tsx`:

| Prototype HTML Component | TheraNet React Component | Notes |
| :--- | :--- | :--- |
| `<button class="chip">` | `Pill` / New `Chip` | The current `Pill` in TheraNet is display-only. We will need to create an interactive `ToggleChip` wrapper around it. |
| `.segmented` toggle | `MultiToggle` | Direct drop-in replacement. |
| NRS Pain Scale (0-10) | `ScaleWidget` | Direct drop-in replacement. |
| Custom Body Chart | `BodyChart` | Reuse the existing `BodyChart.tsx` as-is (it already has the same mark types and normalized coordinates). **Deferred:** putting FM segments on the chart is out of scope for now; FM keeps its own segment/PV-grid UI. The HTML prototype's chart still needs `body-chart.png` beside it; the app already has the same image at `src/assets/body-chart.png`. |
| `select` / `SearchableSelect` | `SearchableSelect` | Use for dense dropdowns (e.g., specific surgical procedures). |
| `.text-input` / `.field` | `<Field>` and `inputCls` | TheraNet uses Tailwind `px-3 py-2 rounded-md` for inputs, which will replace the manual CSS classes used in the prototype. |

## 4. Backend & Schema Changes

The `CoreAssessmentPayload` (`src/domain/coreAssessment.ts`) must be extended before building the React UI. 

**Required Additions to Payload:**
1. **Red Flag Disposition:** Add a `disposition` object (Action taken, Clinician contacted, Treatment status, Patient advice) to the Red Flags section.
2. **Functional Priorities:** Add an array for PSFS goals and functional limitations to the Chief Complaint section.
3. **Intervention Dosages:** Extend the Intervention section to store arrays of objects containing `region`, `grade`, `duration`, `response`, `sets`, `reps`, and `load` instead of just an array of strings.
4. **Fascial Manipulation (FM) Module:** Add an entirely new section block to support:
   - `fmSegments`: Array of `{ name, side, duration, trauma, vrs, planes }`
   - `fmMoVe`: Array of Pre/Post testing data
   - `fmHistory`: Integrated surgical/trauma auto-fill data.

## 5. Detailed Execution & Build Plan

Because this is a massive replacement of the core assessment, **do not attempt to port the entire file in one shot**. You must build, integrate, and verify each section incrementally.

### Step 1: Schema Updates & UI Primitives
1. **Extend `CoreAssessmentPayload`**: Update `src/domain/coreAssessment.ts` to include arrays for Functional Priorities, FM Segments, Intervention Dosages, and the Red Flag Disposition object.
2. **Build `ToggleChip`**: Wrap the existing display-only `Pill` component into an interactive, clickable chip component that supports a `selected` state (mimicking `.chip.selected` in the HTML).
3. **Verify**: Ensure the TypeScript compiler passes and the UI components render correctly in a sandbox/story mode.

### Step 2: App Shell & Navigation (The Wrapper)
1. **Scaffold `UnifiedNoteEditorPage.tsx`**: Create the new container page.
2. **Implement Scroll-Spy Sidebar**: Port the `<nav class="outline">` and the IntersectionObserver logic into a React sidebar component.
3. **Implement Sign & Lock State**: Build the "Sign & Complete Note" workflow. Add the top-level frozen banner state and pass a `readOnly` prop down to all future child components.
4. **Verify**: Test that scrolling updates the sidebar active state, and clicking "Sign" correctly transitions the shell into a locked state.

### Step 3: Chief Complaint Section
1. **Build `ChiefComplaintSection.tsx`**: Implement the 9-region wrapping chip grid (replacing the old dropdown).
2. **Onset Mechanism**: Build the cascading drill-down (Insidious vs Post-Surgical -> Surgery Category -> Specific Procedure).
3. **Functional Priorities**: Add the patient-centered priority fields and PSFS toggle.
4. **Verify**: Check that selecting 'Pain' conditionally reveals the Pain Profile sub-fields (NRS, Irritability).

### Step 4: Medical History & Safety Checkpoint
1. **Compact History Rows**: Port the new `addCompactHistoryRow` logic to React state (arrays of history objects). Replace the old bulky accordion Yes/No toggles.
2. **Red-Flag Disposition**: Implement the required safety workflow. If any red flag is marked positive, force the rendering of the Safety Disposition Card (Action taken, Clinician contacted).
3. **Verify**: Test adding multiple history rows and ensuring the red-flag requirement blocks saving if incomplete.

### Step 5: Fascial Manipulation (FM) Module
1. **Segment Assessment**: Build the form for Name, Side, Duration, and Trauma.
2. **PV Grid & Mo/Ve Table**: Build the complex 20-cell grid and the Pre/Post testing table.
3. **Data Binding**: Ensure typing in the Segment Assessment instantly syncs labels in the PV Grid and Mo/Ve tables using React state.
4. **Verify**: Test the UI state synchronization between the 3 sub-tables.

### Step 6: Objective & Carry-Forward Data
1. **Region-Driven Defaults**: Port the `refreshObjectiveDefaults` logic. Ensure that changing the region in Chief Complaint *appends* new tests but preserves existing data.
2. **Carry-Forward UI**: Implement the ghost data UI (`.carry-forward`) for prior visits above the Palpation/ROM sections.
3. **General Palpation**: Add the standard Tenderness, Tone, and Texture chips.
4. **Verify**: Test changing regions multiple times to ensure previously entered ROM data is not wiped out.

### Step 7: Clinical Impression & Interventions
1. **Structured Impression**: Build inputs for Working Diagnosis, Impairments, and Episode Duration.
2. **Intervention Dosages**: Convert the old string-array interventions into complex objects. When a user clicks 'Manual Therapy', reveal inputs for Target Region, Grade, Duration, and Response.
3. **Verify**: Ensure deep inputs collapse cleanly when a parent category chip is deselected.

### Step 8: Plan, Goals, & Integration
1. **Structured HEP**: Build the Home Exercise Program rows (Name, Dose, Frequency, Cues).
2. **Measurable Goals**: Build the goal rows tracking Measure/Baseline, Target, and Status.
3. **Final Integration**: Swap the router target in `App.tsx` (or `main.tsx`) so that `/patients/$patientId/notes/$noteId` points to the new `UnifiedNoteEditorPage` instead of the legacy `NoteEditorPage`.
4. **Verify**: Perform a full end-to-end assessment entry and save to the Dexie/Supabase backend.
