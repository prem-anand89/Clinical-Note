# Clinical Note — FM Integration & UX Overhaul Walkthrough

## Summary of All Changes

This document captures every modification made to [`clinical-note.html`](file:///home/theranet/Clinical%20Note/Clinical-Note/clinical-note.html) across all phases, serving as the hand-off reference for Thera.Net app integration.

---

## Phase 1: Tier 1 Field Upgrades (Complaints & History)

### Aggravating Factors → Region-Aware Movement Chips
- **What:** Replaced freetext `<input>` with a dynamic chip grid that auto-populates based on the selected Anatomical Region.
- **Data map:** `movementMaps{}` object maps each of the 9 clinical regions to its relevant FM movements (e.g., Knee → Flexion, Squat, Stairs ↑, Stairs ↓, etc.)
- **Integration note:** The selected aggravating movements directly feed the FM Segment Assessment's "Painful Movements" column.

### Easing Factors → Chip Row
- Converted freetext to static chips: Rest, Ice, Heat, Elevation, Movement, Medication, Stretching.

### Secondary Complaints → Region + Laterality + Movement Chips
- Each secondary complaint card now captures: Region (select), Laterality (select), Onset, Severity, Relation to Primary, and region-aware aggravating movement chips.
- **Integration note:** Secondary complaints route to **Pa Concomitant (Pa Conc)** in the FM chart — distinct from Pain History (Pa Prev).

### History Card Upgrades
| Card | Added Fields | Recovery Options |
|---|---|---|
| Past Surgery | Region (select) | Full / Partial / Ongoing / Unknown |
| Past Injury | Region (select) + Side (select) | Full / Partial / Ongoing / Unknown |
| Pain Episode | Side (select) + Current Status | Full / Partial / Ongoing / Unknown |

---

## Phase 2: FM Module — PV Grid & Density Summary

### Palpation / Treatment Mode Toggle
- **Design:** Segmented toggle `[🔍 Palpation] [🛠 Treatment]` at the top of the PV card.
- **Palpation mode:** Single tap cycles density grade (1 → 2 → 2+ → 3 → 3+).
- **Treatment mode:** Single tap toggles treated status (thick teal `box-shadow` border). Only cells with density can be treated.
- **Removed:** All double-tap, long-press, and right-click gestures. The `✓` checkmark CSS pseudo-element was also stripped.

### Smart Density & Pattern Summary
Auto-generated summary below the PV grid that includes:
1. **Highest findings** with segment, plane, side, and grade.
2. **Pattern detection** — identifies diagonals when ≥2 segments share the same plane.
3. **Session stats** — Treated count vs. Untreated grade ≥2 count.

### PV Grid Colors (Pastel)
| Grade | Background |
|---|---|
| 1 | `#FEF9C3` (cream yellow) |
| 2 | `#FEF08A` (soft yellow) |
| 2+ | `#FDE68A` (warm amber) |
| 3 | `#FECACA` (light rose) |
| 3+ | `#FCA5A5` (soft red) |

---

## Phase 3: Hypothesis Builder & Mo/Ve

### Interactive Hypothesis Sequence Builder
- `＋ Add Step` generates dropdowns for Plane, Segment, Side.
- **Auto-Derived Diagonal:** If all steps share the same plane, it outputs e.g., "AN-ME Diagonal".

### Mo/Ve Table Pre-Fill
- Auto-syncs from Segment Assessment: pulls segment name, side, and Pre-VRS score.
- Post-VRS is a clickable 0-10 scale; Δ Change auto-calculates with color indicators (green ▼ for improvement, red ▲ for worsening).

---

## Phase 4: VM/Osteopathic Prep

### New Intervention Chips
Added `Visceral Manipulation (VM)` and `Craniosacral Therapy (CST)` to the Manual Therapy chip row.

### Internal Dysfunctions (under Medical Conditions)
- System-level chips: Digestive/GI, Gynaecological, Urological, Hepatic/Liver, Renal/Kidney, Endocrine.
- Freetext details box below.
- **Placement rationale:** The therapist naturally asks about comorbidities after current symptoms. Putting internal dysfunctions here (not in History) captures current ongoing symptoms correctly.

### General Palpation Card (Tier 1, Objective)
Always-visible card with:
- Tenderness (Localised / Diffuse / None)
- Tone (Hypertonic / Normal / Hypotonic)
- Texture chips (Thickened, Fibrotic, Oedematous, Normal)
- Specific findings freetext

---

## Unified Segment Engine

### `addFmSegment(dateStr, segStr)`
A single function that creates synchronized rows across 3 tables:
1. **Segment Assessment** — editable inputs for Name, Side, Duration, Trauma, VRS, Movements.
2. **PV Grid** — 20 tappable density cells (10 Right + 10 Left).
3. **Mo/Ve Table** — Pre-VRS auto-synced, Post-VRS clickable, Δ auto-calculated.

### Live Data Binding
- Typing in Segment Assessment instantly updates labels in PV Grid and Mo/Ve.
- Deleting a segment removes it from all 3 tables.

### History Auto-Fill (`syncFmHistory`)
- Listens to changes in Past Surgery, Past Injury, and Pain Episode cards.
- Auto-populates the FM History table with Type, Segment, Date (MMM YYYY), Diagnosis, and Recovery.

---

## Phase 5: Chief Complaint Restructure (Dropdown-Free)

### Anatomical Region → Wrapping Chip Grid
9 region chips replace the `<select>` dropdown. One tap selects, auto-triggers aggravating movement chips and objective defaults.

### "How did this begin?" → Onset Engine
Replaced the confusing 4-way classifier with:
1. **Onset Mechanism:** Segmented toggle — `Insidious` | `Sudden` | `Post-Surgical` | `Flare-up`
2. **Conditional reveals:**
   - Sudden → MOI text + Date of Injury
   - Post-Surgical → **Cascading drill-down chips** (Category → Specific Procedure)
3. **Onset Timeline:** Chip row — `<1 wk` through `Years`

### Cascading Surgery Drill-Down
Two-tap flow replaces 30-item dropdown:
1. Tap category: `[Knee] [Hip] [Shoulder] [Spine] [Other]`
2. Tap procedure: e.g., `[Rotator Cuff Repair] [SLAP Repair] [Total Shoulder]`

### Unified Card Flow
Eliminated the disconnected "Context" and "Pain Profile" section dividers. The Chief Complaint section now flows as:
1. **Card 1:** Complaint + Origin (Problem → Region → Laterality → Onset → Episode Pattern)
2. **Card 2:** Symptoms & Triggers (Primary Symptoms → NRS → Pattern → Aggravating → Easing → Sleep)
3. **Card 3:** Secondary Complaints
4. **Card 4:** Occupation chips

---

## Design System Polish

### Component Size Reductions
| Component | Before | After |
|---|---|---|
| **Chip** padding | `9px 15px`, 13px font | `5px 11px`, 12px font |
| **Segmented** button | `9px 16px`, 13px font | `6px 12px`, 11.5px font |
| **NRS button** | 32×32px, 12.5px font | 26×26px, 11px font |
| **Card** padding | 22px | 16px 18px |
| **Field** margin | 20px | 14px |
| **Label** font | 12.5px | 11.5px |
| **Input** padding | 11px 13px, 14px font | 8px 10px, 13px font |
| **Reveal** padding | 16px | 12px 14px |

### SVG Cleanup
All inline `<svg class="check">` elements removed from chips (~200 instances). Replaced with a CSS-only `::before` pseudo-element (`✓`) that only renders on `.chip.selected`.

### Mobile-First Responsive Breakpoints
| Breakpoint | Optimizations |
|---|---|
| **≤767px (Mobile)** | Segmented controls get horizontal scroll-snap, NRS buttons shrink to 24px, card padding tightens to 14px |
| **768–1024px (iPad)** | Chips shrink to 11.5px, NRS to 24px, moderate card padding |
| **≥1025px (Desktop)** | Full layout with sidebar, comfortable spacing |

---

## Phase 6: Alignment, Pill Width & Event Listener Stability Fixes

### 1. Legacy JavaScript Compatibility Stubs
- Injected hidden compatibility stubs (`#legacy-stubs`) for dormant selectors (`#condition-picker`, `#reveal-surgery`, `#reveal-trauma`, `#onset-timeline-value`, `#episode-context-value`, `#recency-row`).
- Prevents unhandled null references (`TypeError`) during page load, restoring full functionality to all history buttons (`[+ Add past surgery]`, `[+ Add past injury]`, `[+ Add pain episode]`, `[+ Add secondary complaint]`).

### 2. Segmented Pill Stretching & CSS Grid Alignment
- Fixed container stretch on `.segmented` controls inside responsive grids (`.rc-grid`) by adding `justify-self: start;`. Pill containers now neatly hug button content without stretching across empty whitespace.
- Elevated `.rc-grid` definitions to global scope so dual-column layouts (e.g., Episode Pattern & Trend) format consistently across mobile, iPad, and desktop viewports.

### 3. Reveal Container & Typography Standardization
- Redesigned `.reveal` drill-down containers from high-contrast teal gradients with heavy left borders to clean, neutral card styles (`background: var(--surface); border: 1px solid var(--line)`).
- Standardized section divider typography and label contrast across all conditional inputs for seamless visual harmony.

---

## Phase 7: History UX Redesign & Region Map Extension

### 1. Compact History Row Redesign (iPad-Optimized)
- **Merged History Blocks:** Consolidated the previously scattered "Past surgeries", "Past injuries", and "Previous pain history" sections into a single, cohesive **Medical History** card.
- **Removed Toggles:** Eliminated the bulky `[Yes/No]` segmented toggles and `reveal` blocks in favor of direct-action chips (`[+ Past Surgery]`, `[+ Past Injury]`, `[+ Pain Episode]`).
- **Compact Inline Rows:** Replaced the heavy `addRepeatableCard` logic (which generated large 2-row grid blocks) with a new `addCompactHistoryRow` function. History items now render as a sleek, single-line horizontal flex row containing tightly packed `<select>` and `<input>` elements (e.g., `[Date] [Region] [Procedure] [Recovery] [x]`).

### 2. "Head / Face" Region & TMJ Support
- Added `[Head / Face]` to the Anatomical Region wrapping chip grid.
- Extended `movementMaps` to auto-populate relevant TMJ/Headache aggravating movements (e.g., Chewing, Talking, Screen time, Reading) when Head/Face is selected.
- Mapped Head/Face across all Objective modules (ROM: Mouth opening/closing, MMT: Masseter/Temporalis, Special Tests: Cranial Nerves/Dix-Hallpike, Joint Mobility: TMJ/Occiput, Muscle Length: Suboccipitals).

### 3. Final JavaScript Stability Fixes
- Removed duplicated `#legacy-stubs` blocks and properly mapped missing dormant inputs (e.g., `activity-sport`). This resolved a critical invisible `TypeError` that was halting script execution and preventing event listeners from attaching to the newer Chief Complaint components and history buttons.

---

## Data Flow Architecture (for Thera.Net Integration)

```
Chief Complaint
├── Region → drives Objective defaults (ROM/MMT rows)
├── Region → drives Aggravating Movement Chips
├── Region → maps to FM Segments (CL, SC, TH, HU, CU, CA, DI, CX, GE, TA, PE, PV, LU)
├── Onset Mechanism + Timeline → feeds Episode Context
└── Secondary Complaints → routes to Pa Concomitant (FM)

History Cards
├── Past Surgery (Region) → auto-fills FM History (Type: Surgery)
├── Past Injury (Region + Side) → auto-fills FM History (Type: Trauma)
└── Pain Episode (Region + Side) → auto-fills FM History (Type: Pa Prev)

FM Module
├── Segment Assessment → syncs PV Grid rows + Mo/Ve rows
├── PV Grid (Palpation mode) → density grades → Pattern Summary
├── PV Grid (Treatment mode) → treated indicators → Session Stats
├── Hypothesis Builder → auto-derived diagonal from selected planes
└── Mo/Ve Table → Pre-VRS from Segment Assessment, Post-VRS manual, Δ auto-calc
```

---

## Phase 8: Clinical Assessment Upgrades & Safety Workflows (Codex Recommendations)

### 1. Structural Cleanup & Workflow Unification
- **Removed Duplicate Protocol Picker**: Deleted the legacy top-of-form `Clinical Protocol` picker. Downstream protocol logic (Rehab Timelines, Objective defaults, Load Management) is now seamlessly driven by the `Onset Mechanism` (e.g., selecting `Post-Surgical` → `Knee` → `TKR` auto-applies the TKR protocol).
- **Consolidated Javascript**: Cleaned up obsolete script blocks and safely exposed global helper functions (`setupChips`, `setupSegmented`) to ensure dynamic elements work flawlessly without chained runtime crashes.

### 2. Clinical Assessment Refinements
- **Functional Priority**: Added patient-centered fields at the start of Chief Complaint ("What does the patient most need/want to return to?"), including a toggle to link it directly to the Patient-Specific Functional Scale (PSFS).
- **Conditional Pain & Irritability**: Wrapped the entire Pain block (NRS, 24hr pattern, easing factors, etc.) in a conditional container. It now only appears if `Pain` is selected under Primary Symptoms. Also added Irritability sub-fields (trigger, time to onset, easing, time to settle).
- **Structured Clinical Impression**: Replaced purely free-text fields with structured inputs for Working Diagnosis, Impairments (chip-based), Activity limitations, Participation restrictions, Episode duration, and Visit frequency.
- **Intervention Dosages**: Clickable intervention categories (Manual Therapy, Modalities, Therapeutic Exercise) now reveal structured dosage sub-fields (target region, grade, duration, patient response, sets/reps, load, RPE).
- **Structured HEP, Goals, & Plan**:
  - HEP rows now cleanly separate Exercise Name, Dose, Frequency, Key cue/safety instruction, and Progression rule.
  - Goals now track Measure & Baseline, Target, Status, and link directly to Functional Priorities.
  - Plan Details card explicitly captures Visit Frequency, Expected Duration, Reassessment Date, Outcome Measure, and Discharge Criteria.

### 3. Safety & Data Integrity
- **Red-Flag Disposition Workflow**: Screening a red flag as positive now injects a mandatory **Safety Disposition Card** requiring the clinician to document Action Taken (e.g. Urgent Referral), Clinician Contacted, Treatment Status, and Patient Advice.
- **Objective Data Preservation**: Completely refactored `refreshObjectiveDefaults()`. Changing the Anatomical Region in Chief Complaint no longer wipes out existing ROM/MMT/Special Test rows. It now safely appends new region-specific tests while preserving previously entered objective data.
- **Suggestions Review Queue**: Enhanced the Suggestions panel by decoupling auto-apply mechanics where appropriate. Users can now explicitly `Accept` or `Dismiss` incoming workflow suggestions.


### Phase 10: Advanced Modules (VM & CST)
- **Visceral Manipulation (VM)**: Built the `#sec-vm` module containing the Barral listening cards (Global/Local) and an interactive 20-organ assessment grid.
- **Craniosacral Therapy (CST)**: Built the `#sec-cst` module containing the Upledger rhythm (rate, quality, amplitude), cranial bone/suture assessment (SBS), and Dural Tube assessment.
- **TMJ Sub-Module**: Built a dedicated TMJ assessment card inside CST that conceptually syncs with the MSK Head/Face region.
- **Cross-Module Sync**:
  - The VM module auto-populates its "Internal Dysfunctions" text area based on the Medical Condition chips selected in the History section.
  - The VM and CST modules are hidden by default and dynamically revealed via their respective Intervention chips in the Manual Therapy section.


### Phase 11: Unified Navigation & Smart Triggers
- **Decoupled Interventions**: Interventions (Manual Therapy chips) no longer forcibly open assessment modules. They strictly document treatment.
- **Tier 1 Promotion UI**: Advanced modules (FM, VM, CST) are now permanently visible in the sidebar with a `[+ Add]` badge. Clicking them opens the module and seamlessly transforms the sidebar item into a Tier 1 checkmarked item (e.g., `<span class="num">✓</span> Visceral Manipulation`). 
- **Hide Buttons**: Added dedicated `− Hide Module` buttons to all three advanced modules to allow clinicians to collapse them, reverting them back to `[+ Add]` in the sidebar.
- **Smart Clinical Triggers Engine**: 
  - Integrated with the existing `#sec-suggestions` banner.
  - Automatically analyzes real-time inputs (e.g., Regional changes to Head/Face, chronic symptom duration, surgical history, internal dysfunction chips, or keywords like "concussion" in the presenting problem).
  - Generates actionable suggestion pills (e.g., "Consider Craniosacral Assessment").
  - Clicking "Accept" instantly opens the module, scrolls to it, and cleanly removes the suggestion pill from the UI.


## Phase 12: Pre-Port Refinement (review P0/P1 closure, template canon, audits)

Everything below was verified in headless Chrome against `clinical-note.html`. Items marked **bug** were wrong behavior found and fixed, not new features.

### Safety & template flow (P0)
- **Red-flag disposition is now enforced.** Fields: clinical rationale, action taken, clinician contacted + date/time, treatment status, patient advice. A positive red flag blocks **Sign & Complete** until rationale, action, treatment status, advice and the "I reviewed these questions with the patient" attestation are all present; the card opens and lists what's missing.
- **"Unknown" (unable to assess)** added beside No / Yes / N/A. Summary reads "No red flags noted · N unable to assess".
- **"Mark all reviewed as negative"** now asks for confirmation, ticks the attestation, and is stored distinguishably (`redFlagBulkNegative`, cleared by any individual answer; summary shows "bulk-confirmed").
- **One canonical template flow (P0.1).** All paths go through `applyTemplate(id, source)` over a registry of the 10 MVP templates (6 post-surgical, 4 non-surgical; version `mvp-1`). Surgery cascade now *suggests* a template (Accept / Dismiss; dismissed ids don't re-suggest); Known Condition is the manual override ("choose another template") and is never overwritten by later Chief Complaint changes. Procedures without an MVP template (meniscus, fusion, arthroscopy…) get no template. Added Ankle/Foot surgery category (Achilles repair). Provenance shown in Clinical Impression ("manually selected" / "auto-suggested, accepted" · version). Dead "Clinical Protocol" selector code removed. Existing label shapes (`Template: Post-op …`) preserved because Load-management, Rehab Timeline, Questionnaires and drift key off them.
- P0.2 (objective data survives region change): already true for ROM, MMT, special tests, functional screens — verified, no change. P0.4 (Neuro Screen contradiction): resolved by delta spec §14.2; prototype matches.

### Clinical format (P1)
- **Intervention dosage (P1.6).** Each selected Manual Therapy / Modality / Therapeutic Exercise chip gets its own dosage card (collapses on deselect; values retained on reselect). Manual: region, grade (mobilisation/manipulation only), duration, response. Modality: parameters, duration, location, contraindications-screened, response. Exercise: exercise, sets, reps/time/hold, load, RPE, assistance, response. `getInterventionDosage()` returns the flat array.
- **PSFS from Functional Priority (P1.1):** the checkbox now creates the PSFS activity and a linked goal; empty input is guarded.
- **Goals (P1.8):** linked-priority list is live (real priorities + PSFS activities); reason field appears for Revised / Discontinued. Plan: progression criteria added.
- **Clinical Impression (P1.5):** evidence supporting / not supporting, precautions / contraindications.
- **HEP (P1.7):** sets, reps, hold, load split out; teach-back (Correct / Needed cues / Unable); adherence barrier; progression / regression rule.
- **Risk summary (P1.3):** live card above Intervention — allergies (latex/adhesive flagged), anticoagulants, implants/pacemaker, medication, surgery + precautions, comorbidities.
- **Objective method metadata (P1.4):** optional "Method & equipment" on ROM and MMT (test position, symptom response, equipment). `getObjectiveMethod()` returns it. *Not done:* baseline-vs-today (needs prior-visit data; belongs to the port's carry-forward step).

### Audit fixes
- **bug — ISNCSCI:** voluntary anal contraction alone graded AIS B; now C. Thoracic injuries (T2–L1, no key muscles) took the last normal key muscle (T1) as motor level; now uses the sensory level, so a complete T6 injury gives NLI T6.
- **bug — MS Group A:** missing sensory dermatomal tool (spec §30.5); added, full C5–S2 bilateral.
- **Gotcha:** a block near the end of the main script toggles every id-less `.chip-row` inside `#sec-objective`; inline-`onclick` chips there double-toggle. Give such rows an id.

### Verified, no change needed
Group A tool mapping for all 6 conditions + MSK collapse / "Show anyway" / override persistence; minimal Neuro Screen triggers (Weakness, Numbness, Cervical Radiculopathy template); questionnaire mapping for all 10 templates, accept/skip, FAAM scoring and Sports subscale; Facial Palsy (Sunnybrook composite matches the official formula — delta spec §32.2's "no composite" is outdated), Vestibular (DGI total + <19 flag, DHI raw only), Cardiothoracic (all spec sections, 6MWT not duplicating vitals).

### Known open items
- Cervical Radiculopathy template does not set the region, so the Neuro Screen can keep showing another region's levels.
- Clinic-level "Auto-apply condition templates" setting (delta spec §2) belongs in app Settings, not this prototype.
- AIS grading ignores Zone of Partial Preservation and full NT handling (stated in UI). FAAM / Fugl-Meyer severity bands and ISNCSCI logic remain on the clinician sign-off list.
- Spec §14.2 says Neuro Screen is *suggested*; prototype auto-opens it (and §31 describes it that way).

### Workflow review fixes (sign-off, reasoning visibility, duplicates)
- **Signable-note rules.** *Hard blocks (safety only):* positive red flag without a complete disposition (as above), or red-flag screening not reviewed (every question answered, or the attestation ticked). *Warnings, overridable with "Sign anyway":* anatomical region, primary complaint, primary hypothesis, at least one goal. Previously an empty note could be signed. Panel is `#sign-check`; nothing is stored.
- **Reasoning sections open by default.** Clinical Impression and Plan & Goals no longer start collapsed.
- **Duplicates removed.** Visit frequency and episode duration are owned by Plan & Goals; Impression shows a read-only "Episode of care" echo (`#ci-plan-echo`). The Impression "Irritability" rating is relabelled as the overall summary of the Pain Profile irritability fields (both kept: the rating also covers non-pain presentations). Note: a per-visit "Response to treatment" field (spec §12.5) is *not* in the HTML — only dead `setupSegmented('patient-progress')` JS refers to it; responses currently live only in the dosage cards. Decide whether to restore an overall-response field.
- **Still open from the workflow review:** a follow-up-visit mode (carry-forward is a static mockup; design it in React with real prior-visit data), a single rule for auto-add vs. suggest, and a sticky suggestions panel.

### Housekeeping decisions
- Stale nested clone `thera-net/` (commit cad0e55, Sep 12) deleted; it held nothing unique (clean tree, no unpushed commits, no stashes).
- `body-chart.png` is **required** by `clinical-note.html` (the Body Chart module loads it from the same folder) — keep it next to the HTML. The app already ships the same image at `src/assets/body-chart.png`.
- **Deferred:** extending the body chart with Fascial Manipulation segments. FM keeps its own segment / PV-grid UI; the port reuses `BodyChart.tsx` unchanged.

## Session Note prototype (`session-note.html`) — short per-visit / daily-log SOAP note
Separate file, mock data only, nothing saved. Upgrade path for the live app's existing light session note (`noteMode: 'session'`, `SessionNotePayload` 1.0 → draft 1.1, additive). Built for regular package patients and post-op (TKR/THR) daily logs. Home-visit specifics deliberately parked.
- **One layout, config-driven.** A single renderer draws any measure (stepper or chips) from a registry; a "pack" (TKR, THR, General MSK) is only a starting list of measure ids plus extra safety items — no per-condition UI or logic. Start list priority: last visit's pinned measures > pack from the assessment template > empty (manual "+ Add measure" with a custom name/unit fallback).
- **Fast path.** Pain, since-last, one active safety confirmation, measures, "Same as last visit" for treatments, assessment, plan. Measured: ~11 taps for a fully carried-forward TKR note (target ≈ 12 taps / 60 s). Tap counter + timer in the prototype toolbar.
- **Carried-forward values are marked.** "Repeat last values" copies the last visit's measures but flags each one `carried` (hatched row, payload `carried: true`) until the therapist touches it; completing with carried values shows an overridable warning. Avoids silent note cloning.
- **Safety.** Active "no concerns today" tap (never pre-ticked); flagging opens an action + note card; that is the only hard block on Complete. Pain/assessment/plan gaps and carried measures only warn ("Complete anyway").
- **Escalation prompt** on Regressed/Flare, with a "second regressed visit in a row" hint pointing to a Core Assessment follow-up.
- **Trend hint** per measure shows baseline (from the assessment) and last value; measure ids should be shared with the Core Assessment ROM/MMT ids so baseline and daily values plot on one line.
- **Open:** clinician review of the TKR/THR measure lists and precautions (mock text in the prototype); whether the safety tap is mandatory for all notes or post-op packs only; lock-on-complete vs editable; where home-visit data lives.

### FM PV grid — owner's column order (replaces Gemini's 4+6 split proposal)
- **Order per side:** `AL, AM, An, Ir, Me | RL, RM, Re, Er, La`, grouped under **Ante** / **Retro** headers; Right and Left both stay visible, same order on each side. CF/CC column tints kept; heavier divider between R and L, lighter between Ante and Retro.
- **Single source of truth:** `PV_COLUMNS` defines the order; the header rows are rendered from it and every cell carries `data-plane` / `data-side` / `data-kind`. The density summary reads those attributes instead of mapping by column index, so reordering can no longer mislabel a finding. Hypothesis-builder dropdown follows the same order.
- **bug — wording:** repeated findings were all called "diagonal". Now CFs on one plane = *diagonal*, CCs on one plane = *sequence* (summary and hypothesis builder).
- **bug — phones:** below 744 px the table was hidden and the planned mobile cards were never built, so phones showed no PV grid. Phones now get the same table, scrolling sideways with Date/Seg pinned; the unused mobile-card markup and CSS were removed.
- Cell height raised (27 → 35 px); width stays ~31 px because all 20 columns remain visible.
- CC column headers shown in true case (An, Ir, Me / Re, Er, La); CF headers stay capitals (AL, AM / RL, RM). Hypothesis-builder plane list uses the same case.

### FM section audit fixes (owner-approved items 8, 9, 11, 13, 14)
- **Region → FM segment codes (one shared map, `REGION_TO_FM_SEGMENT`):** Shoulder → HU, Scapula → SC, Ankle → TA, Foot → PE (plus CP1, CL, TH, LU, CU, CA, CX, GE). History rows' region list now offers Scapula, Ankle and Foot separately; FM History shows the code with the region as a tooltip. The same map drives Chief Complaint → FM routing (Shoulder previously routed to SC).
- **Patterns need grade ≥ 2:** grade-1 cells no longer form a diagonal / sequence.
- **Mo/Ve table reorganised:** Segment · Movement (from table 1's painful movements) · Pre (table 1 VRS) · Post (40 px −/+ stepper, 0–10) · Δ. Fits a 390 px phone without scrolling.
  - bug: with no Pre-VRS, choosing a Post showed a red "+5 ▲"; Δ now shows only when both values exist.
  - bug: VRS accepted any number (e.g. 15); now clamped to 0–10.
- **Pinned Segment column** in Segment Assessment and Mo/Ve on phones (PV grid already pinned).
- **`getFmData()`** exports segments, history, PV findings (plane / side / kind / grade / treated), hypothesis steps, Mo/Ve, session response and notes — the FM payload shape for the port.
