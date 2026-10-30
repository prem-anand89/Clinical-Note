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

### FM section — round 2 (items 2, 5, 6, 7, 10, 12 + bugs)
- **Segment quick-add chips (#7):** Trunk (CP1–3, CL, TH, LU, PV) · Upper limb (SC, HU, CU, CA, DI) · Lower limb (CX, GE, TA, PE); one tap adds a row to all three tables. "+ Other" adds a blank row for anything not listed; segment inputs suggest the same codes but stay free text. One canonical list (`FM_SEGMENTS`) feeds chips, suggestions and the Hypothesis Builder.
- **PV-grid Seg stays editable (#2, owner decision)** and now syncs both ways: editing it updates table 1 and Mo/Ve (previously one-way, so the tables drifted).
- **Delete asks first (#6)** when the segment has any data (findings, VRS, Mo/Ve post); empty rows delete straight away.
- **bug:** a deleted auto-filled segment came back on the next Chief Complaint change; it now stays deleted unless that source points to a different segment.
- **bug:** deleting a segment threw `updateDensitySummary is not defined` (cross-script scope), so the summary never refreshed after a delete. Fixed.
- **bug (#5):** Hypothesis Builder listed CX twice.
- **"+ From highest findings" (#10):** adds a builder step for each highest-graded finding (grade ≥ 2), skipping duplicates. Label now "Auto-derived diagonal / sequence".
- **Labels (#12):** "Traum?" → "Trauma?"; VRS header shows "0–10".
- **Pending owner decision:** grade palette (#4) — mockup only, not built.
- "+ Other" moved out of the Segment Assessment header into the quick-add chips as a "Not listed" group; the chip block now sits outside the table's horizontal scroll area so it doesn't scroll away on phones.

### FM PV grid — grade picker (replaces tap-cycle and Palpation/Treatment toggle)
- **Tap a box, pick the grade.** A small picker opens above the box (below it when there's no room; clamped to the screen edges): `1 · 2 · 2+ · 3 · 3+ · ✓ · ⌫`. The current grade and treated state are highlighted. Picking closes it; tapping elsewhere, Escape or scrolling closes it without changes.
- **Phones:** the same buttons as a strip along the bottom (48 px), labelled with the box being graded (e.g. "HU · rt · AM"); the page scrolls so that box stays visible above the strip.
- **Treated** is a small ✓ in the box's corner — the grade number stays readable. Only graded boxes can be treated; changing a grade keeps the treated mark; ⌫ clears both.
- Removes the old failure where one tap too many erased a finding (3+ wrapped to blank) and the five-tap step-down.
- Summary and Hypothesis Builder now show header codes (AM, An…) instead of internal plane ids (AN-ME).
- Picker made smaller and subtler on iPad/desktop (34 px colour-coded buttons, ~272×42 px, lighter border and shadow, sits 5 px from the box); phone strip unchanged (48 px).
- Treated mark is now a small unfilled teal ✓ in the box's corner (no filled circle).
- Phones now use the same small pop-up at the box (owner preference); the bottom-strip variant was removed. The pop-up stays within the screen edges and closes on scroll.

### Owner decisions applied (2026-10-21)
- **Session note:** safety check shown and enforced for post-op packs only (TKR, THR); General notes skip it (payload `safety: null`). Completed notes can be edited via "Edit" in the completed banner; `completedAt` and each reopen time (`editedAfterCompletion`) go in the payload.
- **Template sets the region:** each MVP template carries a region (TKR/ACL → Knee, THR → Hip, RC & SIS → Shoulder, lumbar & CLBP → Lumbar Spine, Achilles & ankle sprain → Ankle / Foot, cervical radiculopathy → Cervical Spine); applying it selects that region chip. Entered Objective rows are kept.
- **Neuro Screen is suggested only:** the trigger shows a suggestion pill; Accept opens the screen. Nothing opens automatically.
- **McKenzie (MDT) removed for now** (sidebar entry, card and script).

### Red / yellow flag lists (owner-approved)
- **Red flags (12 screening questions):** bowel/bladder change · saddle numbness · progressive or widespread neuro deficit · history of cancer · unexplained weight loss · fever / night sweats / recent infection / immunosuppression · significant trauma or minor trauma with osteoporosis / steroids · constant progressive pain incl. night pain · **new:** calf pain / swelling / warmth (DVT) · **new:** chest pain or sudden breathlessness · **new, neck/head only:** dizziness, double vision, speech/swallowing difficulty, drop attacks · **new, neck only:** clumsy or numb hands both sides, unsteady gait.
- Region-limited items appear only for their regions (10 items by default, 12 for Cervical Spine) and stay visible once answered, so a positive answer can't vanish on a region change. Bulk "all negative", the review rule and the sign gate count only the items shown.
- **Yellow flags (6):** fear-avoidance · catastrophizing · low mood / high distress · **new:** low expectation of recovery · work / compensation issues · passive coping. Scale is now 3-step: None / Some concern / Significant.

## Lean assessment (branch `lean-assessment`)

The core assessment re-organised so a therapist sees a short form that expands on demand. **Every existing field and id is kept** (saved data is unchanged apart from the additions below); a shared "lean layer" decides what is shown.

### Shared layer
- **Collapsible sections with a one-line summary** (✓ once filled; summary reads from the real fields). Sidebar navigation expands a collapsed section.
- **"+" chips reveal tucked blocks** and **auto-open the moment a block holds data** (auto-filled values excluded), so nothing entered can end up hidden; a block holding data can't be collapsed.
- **Notes boxes:** `Subjective notes`, `Examination notes` (ids `subjective-notes`, `objective-notes`; `getAssessmentNotes()`).
- **One-tap explicit statements** instead of fake normal values: "✓ No relevant history", "✓ No red flags — reviewed with patient", "☐ Screened — no other deficits" (`getAssessmentFlags()`).
- Refresh is debounced with a 200 ms cap; primary buttons refresh immediately.

### Per section
- **Chief Complaint:** symptoms merged into the first card; "Course" row (episode pattern + trend); Pain Profile appears only when Pain is chosen and shows now / aggravating / easing (24h pain & sleep, irritability detail behind chips); most-limited activity + PSFS/goal stays, "return to" behind a chip; secondary complaint, systemic symptoms, psychosocial (yellow flags), work & sport behind chips. Known condition moved to Impression.
- **History:** collapsed by default; one gate card + chips (Past history, Conditions, Meds & allergies, Family, Lifestyle). Anticoagulants chip removed (Safety owns it); activity level → Work & sport; Bristol scale and sleep-difficulty → Systemic.
- **Safety:** gate buttons; "Flag one…" opens the full list (auto-opens on any Yes/N/A/Unknown); "Mark the rest as No" answers only unanswered items; no confirm dialog (button wording is the attestation). Yellow flags → Chief Complaint (Psychosocial).
- **Objective:** Observation + Palpation merged into one finding-chip card; ROM / strength / special tests / functional screens are region-suggested chips and a row exists only once tapped (untested items are never stored; entered rows survive region changes); joint mobility, muscle length, functional screening, neurodynamics, neuro screen (highlighted when suggested) and another region behind chips; one module dock built from the sidebar's entries; the static "last visit" mock is hidden.
- **Impression:** hypothesis, working diagnosis + Known condition, irritability, prognosis, precautions visible; differential, evidence, impairments, activity/participation (pre-filled from Chief Complaint), contributing factors behind "Deep reasoning & ICF"; duplicate neuromuscular factors removed.
- **Intervention:** one-line risk strip (only real risks; now reads allergy chips) replaces the risk card; "Treatment today" quick chips drive the real category chips; "+ dose / note" link per treatment opens the dosage card only on request (every selected treatment is still recorded); Response to treatment moved up; Manual / Modalities / Exercise lists, Load management (auto-revealed for post-op templates) and Session duration behind chips; the duplicate precautions field removed. Taping caution now also fires from allergy chips.
- **Plan & Goals:** one-line goal creates a real goal row (detail behind "Goal detail & more goals"); Phase suggested from "Since" with tap-to-confirm (post-op still pre-selects from the surgery date); HEP moved here and made two-speed (`getHepRows()`); quick review dates; outcome measure, criteria, referral, next-visit memo (`next-visit-memo`) and education behind chips.

### Measured (iPad width, 7 core sections, headless Chrome; baseline = commit before this branch)
| | Before | After |
|---|---|---|
| Empty note | 7,813 px · 202 controls · 5.7 screens | 3,935 px · 138 controls · 2.9 screens |
| Region = Knee | 8,780 px · 267 controls · 6.4 screens | 3,881 px · 139 controls · 2.8 screens |
The target of ~2 screens was not reached; the biggest remaining blocks are Chief Complaint (906 px), Objective (988 px) and Plan (802 px).

### Behaviour changes to be aware of
- Old tests that click the removed controls (`#screening-toggle`, `#add-goal-row` on first view, category "Add" buttons) were rewritten for the new flow.
- Yellow flags and the Impression echo now say "Psychosocial".
- Sidebar remains for navigation and still opens modules; the dock is the in-page way to add them.

## ⭐ Pin bridge (Gemini #9, step 1)
- **Assessment:** ROM, MMT and functional-screen rows get a ☆/★ pin (not special tests: they are binary, not trended). Max 6 pins, with an inline "N pinned" line and a cap message. Ids are `kind:region:name` slugs computed live, so renaming a custom row or changing region never leaves a stale id. `window.getPinnedFindings()` returns id, region, name and a baseline snapshot (ROM active/passive per side, MMT grade, screen result). Pins are mirrored to `localStorage['cn.pins']` as a prototype-only bridge.
- **Session note:** pinned findings join the starting measures (last visit's set > + pins; pack + pins on a first visit), shown with ★, capped at 6. Known pins map to existing measures; any other pin becomes its own measure (ROM → numeric stepper, MMT/screen → chips). Baseline comes from the assessment snapshot. Payload measure entries carry `findingId`. The header shows "Last focus:" from the previous visit's memo. New scenario D reads the live pins written by `clinical-note.html`.
- **Tests:** `tests/pins.mjs`, `tests/session-pins.mjs` (run with node; need playwright-core and Chrome).
- Not in this step: the "+ after treatment" value, response chips, this visit's memo box (Step 2).

## Session note step 2 (Gemini #25, #26, #10, #18)
- **Immediate response** chips in Intervention: Better · Same · Worse (sore / flare). `sessionResponse`.
- **HEP adherence** relabelled Doing / Partly / Not doing.
- **Next session focus:** one memo box plus quick chips that drop text in (no duplicates); `nextVisitMemo`. Per-exercise pills dropped.
- **"+ after treatment"** on ★ pinned measures only: optional second stepper/chips, delta "vs before", removable; `afterValue` stored only when added.
- `seg()` accepts value/label pairs; `renderStepper()` takes a store, so before and after share one control.
- Test: `tests/session-step2.mjs` (13 checks).

## Step 3: ROM Full / WNL + module registry (Gemini #20, #12 groundwork)
- **ROM:** degree boxes now use the numeric keypad (`inputmode="numeric"`); a per-side **Full / WNL** toggle records a flag and locks the boxes. It shows in the row summary and in pin snapshots. The 5° stepper stays in the session note only; 0°/90° preset chips were not added (not meaningful for every joint).
- **Module registry:** `window.MODULE_REGISTRY` (23 entries: group, label, opener, argument) now drives the Objective module dock instead of scraping the sidebar's DOM. A test checks it matches the sidebar entries. Next (at port): make the sidebar scroll-spy navigation only.
- Test: `tests/step3.mjs`.

## Preview, WhatsApp HEP, FM point chips (Gemini #14, #28, #29, #30)
- **Whole-note preview** (`👁 Preview note`, top of the note and beside Sign): reads only what is entered and visible, section by section, as a clinical document with Print. Generic walk of live controls, so new fields appear without editing it. Not yet true prose (lines read "Label: value"); PDF export waits for the port.
- **Share HEP via WhatsApp:** button under the HEP card builds a plain-text plan (exercise, sets × reps, hold, frequency, cue, next step) and opens `wa.me/?text=`. Review box and Copy fallback; nothing is sent automatically. At port: address to the patient's number and block when do-not-message.
- **FM point chips (session note):** the assessment's graded fascial points appear as chips ("GE-An (R)"); a tap marks treated, saved as `fmTreated`. Shown only for FM patients. Scenario E (mock) and D (live bridge via `localStorage['cn.fm']`).
- **Decisions:** no auto-generated hypothesis text (keep the rule-based `fm-hyp-diag` and the therapist's own one line); single-visit PDF deferred until after the React port (cumulative `SessionLogPrintPage.tsx` is what insurers ask for); no FM segments on the body chart.
- Tests: `tests/preview.mjs`, `tests/hep-share.mjs`, `tests/fm-chips.mjs`.

## FM review fixes (review of the 26 Oct FM work)
- **Pattern counting:** "N segments" counted graded cells, so two rows for the same segment made a false diagonal. It now counts distinct segments per plane, side and kind.
- **Display:** density and finding badges showed "((rt))" and raw "rt/lt"; now "R"/"L" (stored values unchanged).
- **Hidden side:** with the default R-only view, left findings were counted but invisible. The R and L chips now show their graded-point counts ("L · 3").
- Test: `tests/fm-density.mjs`. Open FM proposals are listed in the review reply (prior-visit rows read-only, suggestion in the derived-diagonal box, Mo/Ve duplicates, phone segment table, default view).

## Task 1: Prior-visit rows read-only & mock gating
- **Mock row gating:** `addFmSegment("14/09/23", "GE")` and `("HU")` now load only when `?demo=fm-history` is present or `window.FM_DEMO_HISTORY = true`. Initial note starts clean with zero rows.
- **Prior-visit rows read-only:** Rows where date ≠ today are designated as prior visit rows (`.fm-prior-row`). Their PV cells receive `.pv-cell-prior` (muted opacity, pointer-events none, no picker dialog). They are excluded from density calculations, side badge counts, Mo/Ve movement tables, sequence finding suggestions, and `localStorage['cn.fm']` persistence.
- **Data export:** `getFmData().pv` includes `isPrior: true|false` for accurate record classification.

## Task 2: Suggestion in Auto-derived diagonal / sequence box
- **Suggested pattern line:** When patterns exist and no sequence steps exist, `#fm-hyp-diag` displays `Suggested: <Pattern> — tap to add` (e.g. `Suggested: AL diagonal (R) — tap to add`).
- **Tap-to-add action:** Tapping the suggestion triggers sequence creation from findings without writing into the Detailed Reasoning textarea or auto-populating arbitrary hypothesis text.
- **Dynamic state:** Once steps are added, the suggestion cleanly transitions into the derived diagonal/sequence (or "Mixed / Custom Sequence"). When steps are deleted, the suggestion reappears if patterns are present.

## Task 3: Mo/Ve table deduplication & state preservation
- **Deduplication by segment and side:** Multiple rows in the segment table for the same segment code and side (e.g., two GE R rows) map to a single Mo/Ve row (`GE · R`).
- **Pre-VRS aggregation:** When duplicate rows exist, the Mo/Ve row displays the highest pre-VRS rating among duplicates. Distinct painful movements from duplicates are combined.
- **Preservation across syncs:** Reconciling the Mo/Ve table looks up existing rows by `data-key` (`${seg}_${side}`), preserving existing therapist adjustments to post-VRS (`data-post`) and recomputing delta rather than clobbering state.
- **Data export:** `getFmData().moVe` includes `key`, `segment`, and `side` without duplicate keys.

## Task 4: Phone layout table-to-cards (< 744px)
- **Responsive card layout:** Below 744px, `#fm-seg-table` rows transform via pure CSS grid into clean mobile cards (row 1: Segment & Side with delete × button; row 2: Duration, Trauma, VRS; row 3: Painful Movements spanning full width).
- **Zero state duplication:** Uses the exact same form controls and input nodes, maintaining 100% data fidelity with `getFmData().segments` and Mo/Ve sync without duplicating state.
- **Overflow-free:** At 390px, the segment container fits perfectly without horizontal scrolling (`scrollWidth === clientWidth`).
- **Display labels:** Side dropdown displays "R" and "L" across all viewports while retaining canonical `rt` and `lt` values.

## Task 5: Context-aware smart side view
- **Adaptive side view on module open:** Right (R) remains the default view. If graded palpation findings exist on the left side (e.g. from an auto-draft or restored patient history), the view toggle automatically initializes to "Both" so left-side findings are immediately visible without being hidden.
- **Pure in-memory:** No state is persisted to `localStorage` for this switch.

## Verification & Screenshots (Tasks 1–5)
- **New Test Suite:** `tests/fm-review2.mjs` verifies all 5 tasks (prior-visit row gating, hypothesis auto-derived suggestion tap, Mo/Ve deduplication & delta preservation, 390px card overflow & binding, and adaptive side view toggle).
- **All 10 Test Suites Passing:**
  - `tests/fm-chips.mjs`: ALL PASS
  - `tests/fm-density.mjs`: ALL PASS
  - `tests/fm-review2.mjs`: ALL PASS
  - `tests/hep-share.mjs`: ALL PASS
  - `tests/pins.mjs`: ALL PASS
  - `tests/preview.mjs`: ALL PASS
  - `tests/pv-layout-test.mjs`: ALL PASS
  - `tests/session-pins.mjs`: ALL PASS
  - `tests/session-step2.mjs`: ALL PASS
  - `tests/step3.mjs`: ALL PASS
- **Visual Artifacts:**
  - `fm-review2-1024px.png`: Desktop layout showing muted prior-visit row ("14/09/23 PRIOR VISIT"), today's palpation findings, density & pattern intelligence pills, and side count badges ("R · 2").
  - `fm-review2-390px.png`: Mobile viewport (390px) demonstrating the pure CSS table-to-card transformation for Segment Assessment with zero horizontal overflow, clear uppercase labels, and top-right delete action.







## FM work after the first handoff (26–27 Oct; documented retroactively)
Written from the commit messages plus a hands-on check (every suite run, page probed at 390 / 1024 px). Not a line-by-line audit.
- **Palpatory Verification grid:** date cells grouped by visit with an inverted timeline and a Visit filter (All / Today); the segment picker for the grid sits below it; complaints autofill is decoupled from the PV grid (see the grid-strip fix below); session banner as a compact side heading; Date and Seg columns restored.
- **Section 5:** side-by-side Palpatory Re-check matrix next to Mo/Ve, pain-scale outcome, collapsed notes; reactive re-check sync on deletions; sticky-column positioning fixed.
- **Section 4:** hybrid synthesis banner (derived diagonal / suggestion, ↻ Re-derive), planned-sequence pills, collapsed reasoning with quick tags. The derived text is rule-based; nothing is written into the reasoning field.
- **Card 1 and 2:** onset column and empty states, prior-pain handling and silent status, Card 3/5 headers.
- **Header wording:** "MRN" became "Patient ID" (also in the note preview). Outside the FM module, but it matches TheraNet's own wording (patient service messages say "Patient ID"), so it stays.
- **Chief Complaint → FM routing** now also runs on region / laterality / onset / aggravating clicks.
- Tests added by Gemini: `fm-review2`, `fm-wiring-test`, `fm-comprehensive-audit`, `fm-section4-hybrid1`, `fm-section5-recheck-test`.

## FM review clean-up (follow-up to the above)
- **`getFmData().enabled`** (true once the FM module is opened, false after Remove). The auto-routed Chief Complaint row still exists in memory, but the `cn.fm` mirror used by the session note is empty unless FM is enabled. Consumers (export, preview) should treat `enabled: false` as "no FM data".
- **"Not in the palpation grid" strip** under Card 1: segments auto-routed from Chief Complaint now offer a one-tap `＋ GE` chip that adds the segment to the grid (no second picking, no duplicate row in Card 1).
- **Mo/Ve on phones:** the table now fits at 390 px (smaller padding, header hints hidden below 744 px) instead of cropping Outcome.
- **Test fix:** `pv-layout-test` now checks document order (picker after the segment table); the old selector broke when an empty-state block was added between them. (The earlier changelog line saying this suite passed was only true at the time.)
- **Housekeeping:** screenshots moved to `screenshots/`; `body-chart.png` stays in the repo root because the note loads it.
- Test: `tests/fm-review3.mjs`.

## Signed-note lock fix
- **Bug (reproduced):** after signing, only inputs, chips and segmented buttons were disabled. Clicking a ROM row's ×, a pin, Full / WNL, Pain, FM delete buttons, grid cells or Mo/Ve steppers still changed the signed note (a signed ROM row could be removed).
- **Fix:** `body.note-locked` plus a capture-phase click guard that blocks every click inside `<main>` once signed, except reading aids: note preview, section collapse, and the PV side / layout / visit filters (those chips were being disabled too, which stopped a signer from viewing the left side).
- Test: `tests/signed-lock.mjs`.

## FM Tabbed Workspace Architecture & Core Living Capsule
- **Tab Bar & View Separation:**
  - Sticky `.module-tab-bar` (`id="module-tab-bar"`, `role="tablist"`) positioned below `.note-head` housing `#tab-btn-core` and `#tab-btn-fm` (`role="tab"`, `aria-selected`, `aria-controls`).
  - Split views: `#view-core` (`role="tabpanel"`) wraps all primary SOAP/Core evaluation sections; `#view-fm` (`role="tabpanel"`) isolates all five Fascial Manipulation cards.
  - Zero form destruction: Both panels persist in the DOM, toggled cleanly via `display: block` / `display: none`.
- **Core Living Capsule (`#fm-capsule-card`):**
  - Positioned as a direct sibling immediately following `#sec-objective` inside `#view-core`.
  - Hidden by default when FM is disabled; reactively updates when FM is enabled (`getFmData().enabled === true`).
  - Empty text: `Assessment initialized · 0 points treated`, with `.fm-capsule-open` ("Open FM workspace →") linking directly to the FM tab.
  - Active summary: Status badge (`Evaluating` vs `Graded & treated`), lists today's treated points using short plane codes (`CX-AL R`), derived diagonal (`AL diagonal`), and Mo/Ve pre/post outcomes (`CX pre: 3 → post: 0`).
  - Note Preview integration: Renders FM summary line under Objective assessment when enabled.
- **Scroll Position & Navigation:**
  - `window.switchModuleTab(key)`: Remembers and restores `scrollY` coordinates per tab so switching back and forth preserves exact scroll offset without jumpiness.
  - Sidebar outline integration: Desktop left sidebar (`.outline`) is cleanly hidden on the FM tab (`body.fm-tab-active .outline:not(.drawer-open)`) to dedicate maximum horizontal width to wide PV palpation matrices. Clicking an outline section from the FM tab automatically transitions back to Core view and scrolls smoothly to the section.
  - Keyboard navigation: Left/Right/Home/End arrow keys on the tab bar move focus and switch tabs with `aria-selected` following.
- **API Backwards Compatibility & Signed Note Guard:**
  - `openAdvancedModule(key, { switch: false })`: Accepts optional `switch: false` flag for background/programmatic initialization while keeping default 1-arg calls switching to FM workspace.
  - `hideAdvancedModule(key)`: Hides FM tab & capsule, reverts to Core view, clears `cn.fm` mirror in `localStorage`, and sets `enabled: false`.
  - Signed note guard: Added `.module-tab` and `.fm-capsule-open` to the `completeSign()` allow-list, enabling therapists to view the FM workspace and capsule in read-only mode after signing without unlocking edits or pickers.
  - `window.MODULE_REGISTRY`: Added `tab: true` to the Fascial Manipulation entry.
- **Verification & Testing:**
  - New test suite: `tests/fm-workspace-tabs.mjs` verifying all 11 requirements (default load, switch:false, capsule states, state/scroll persistence, outline navigation, cleanup, note preview & cn.fm mirror, keyboard navigation, viewports 390px/820px/1280px, screenshots).
  - Screenshots generated: `screenshots/fm-workspace-tabs-1024px.png` and `screenshots/fm-workspace-tabs-390px.png`.
  - All 17 test suites passing cleanly with zero errors:
    - `tests/fm-chips.mjs`: ALL PASS
    - `tests/fm-comprehensive-audit.mjs`: ALL 28 CHECKS PASSED
    - `tests/fm-density.mjs`: ALL PASS
    - `tests/fm-review2.mjs`: ALL PASS
    - `tests/fm-review3.mjs`: ALL PASS
    - `tests/fm-section4-hybrid1.mjs`: ALL 41 CHECKS PASSED
    - `tests/fm-section5-recheck-test.mjs`: ALL PASS
    - `tests/fm-wiring-test.mjs`: ALL PASS
    - `tests/fm-workspace-tabs.mjs`: ALL 11 CHECKS PASSED
    - `tests/hep-share.mjs`: ALL PASS
    - `tests/pins.mjs`: ALL PASS
    - `tests/preview.mjs`: ALL PASS
    - `tests/pv-layout-test.mjs`: ALL PASS
    - `tests/session-pins.mjs`: ALL PASS
    - `tests/session-step2.mjs`: ALL PASS
    - `tests/signed-lock.mjs`: ALL PASS
    - `tests/step3.mjs`: ALL PASS

## FM UX Refinements: Module Removal & Collapsible Internal Dysfunction Drawer
- **Module Removal UX (Option B Tab Close + Workspace Footer):**
  - Removed ambiguous inline `✕ Remove` button from the section title header line (`#sec-fascial-manipulation > .section-title`).
  - Added inline tab close button `<span class="module-tab-close" id="fm-tab-close">×</span>` on `#tab-btn-fm` with stop-propagation and keyboard accessibility (`Enter` / `Space`).
  - Added quiet workspace footer action `<div class="fm-workspace-footer"><button type="button" class="fm-remove-link" id="fm-hide">` at the bottom of the FM workspace.
  - Centralized remove flow via `requestRemoveFmModule()`: prompts `window.confirm` if any clinical data has been recorded in FM (graded PV cells, hypothesis steps, Mo/Ve post scores, treatment notes, or internal dysfunction inputs), while providing instant, frictionless removal if opened accidentally without data.
  - Signed-note lock protection: `.module-tab-close` and `.fm-workspace-footer` are hidden via CSS (`display: none !important`) and blocked by the capture-phase signed-note click guard when `body.note-locked` is active.
- **Collapsible Level 3 Internal Dysfunction Drawer:**
  - Converted `#fm-internal-dysf-card` into a clean, collapsible drawer immediately preceding Card 1, collapsed by default so Card 1 Segment Assessment sits directly at the top of the FM workspace.
  - Header toggle `#fm-internal-dysf-toggle` with dynamic badge `#fm-internal-dysf-badge`:
    - Surfaces Core systemic triggers (`💡 N systems flagged (...)`).
    - Indicates manual apparatus / tensile selections (`✓ ADI · TLU, TPV`).
    - Excluded from signed-note disabling so clinicians can expand and read recorded notes on signed records.
  - Multi-select apparatus chips (`ADI`, `ARE`, `ACI`, `AUN`, `AEN`, `AHE`, `APR`) unioning tensile structure suggestions (`APPARATUS_TENSILE_STRUCTURES`).
- **Strict Card 1 Routing & Card 3 Palpation Grid Decoupling:**
  - Decoupled Card 1 Segment Assessment picker (`#fm-region-drawer .fm-seg-chip`) and "＋ Other" (`#fm-add-seg`) from Card 3 Palpation Grid: picking or adding a segment in Card 1 now explicitly passes `addToPv = false, addToSeg = true`.
  - `addFmSegment(dateStr, segStr, addToPv = false, addToSeg = true)` default for `addToPv` is now `false`, guaranteeing that no complaint, systemic symptom, internal dysfunction, or Card 1 segment picker action ever auto-populates Card 3.
  - Card 3 Palpation Grid starts completely blank for the current visit. The therapist retains 100% manual freedom to choose which segments to palpate (via Card 3's own `#pv-add-region-tabs` picker, "＋ Other", or the optional `#fm-grid-missing` strip), allowing cases where a patient presenting with knee pain (GE) is examined for Cx, PV, Ta, or PE while leaving GE unpalpated.
  - Added `#fm-tensile-routing-field` and `#fm-tensile-routing-chips` dynamically rendering one-tap routing pills for suggested/selected tensile structures (`TCP` → `CP1`, `CL`; `TCL` → `CL`; `TTH` → `TH`; `TLU` → `LU`; `TPV` → `PV`).
  - Tapping a routing chip invokes `window.routeFmSegment(...)` with `addToPv = false, addToSeg = true`, populating Card 1 Segment Assessment and syncing the Mo/Ve row without adding any rows to Card 3 (Palpation Grid).
  - Duplicate prevention: If a segment is already recorded in Card 1 (from Core auto-routing or manual entry), the chip renders as a confirmed badge (`✓ LU in Card 1`) instead of creating a duplicate row.
  - Palpation strip sync: Card 3's `#fm-grid-missing` strip automatically offers one-tap addition (`Not in the palpation grid: [ ＋ LU ]`) if the therapist decides to palpate the segment.
- **Data Export & State Reset:**
  - `getFmData()` additively exports `internalDysfunction: { notes, apparatuses, tensileStructures, catenary }`.
  - `hideAdvancedModule('fascial-manipulation')` collapses the drawer and resets state cleanly.
- **Verification:**
  - Updated `tests/fm-workspace-tabs.mjs` verifying default collapsed state, toggle expansion/collapse, ADI apparatus selection, one-tap routing to Card 1 only (confirming Card 3 PV grid remains at 0 rows), confirmed button state, safety confirmation dismiss and accept.
  - All 17 test suites passing (100% pass rate).

## FM: Internal Dysfunction drawer moved under Segment Assessment (29 Oct)
- **Why:** internal dysfunction can still be part of the patient's complaint, so it belongs next to the complaint's segment rather than ahead of it. The FM tab now reads: 1. Segment Assessment → Viscerofascial & Internal Dysfunction drawer (collapsed) → 2. FM History → 3 → 4 → 5.
- **What:** `#fm-internal-dysf-card` now sits directly after Card 1 and before Card 2. Ids, collapse behaviour, apparatus/tensile chips and routing into Card 1 are unchanged.
- **Test:** `tests/fm-workspace-tabs.mjs` asserts the drawer's previous sibling is Card 1 (`#fm-seg-table`) and its next sibling is Card 2. All 17 suites pass.
- **Also:** `CLAUDE_HANDOFF_FM_FIXES.md` added — triaged plan (Argon 4 review) for the next FM fixes, to be implemented in steps.

## FM Step 1: bugs and missing wiring (29 Oct; `CLAUDE_HANDOFF_FM_FIXES.md`)
- **Tokens:** `--rust`, `--rust-dim`, `--moss` defined; the sticky module tab bar now uses `--surface` instead of the undefined `--bg` (content no longer shows through it).
- **Card 1 stops recording values nobody entered (1f):** Onset column renamed **Trauma?** with options —/No/Yes, and Side gets a blank first option. Both default to blank on a manual row. Wider Duration/VRS columns; on phones the five short fields now sit three per row so nothing clips at 390 px. Row order is fixed: site of pain, then concomitant, then internal, then manual rows. `getFmData()` exports blank side/trauma as `''`.
- **Complaint → Card 1 (1b):** `routeFmSegment(sourceKey, seg, side, duration, note, onsetVal, vrsVal)` — onset (Sudden/Post-Surgical → Y, other chosen onset → N, none → blank) and today's pain (NRS) as a suggested VRS. A therapist edit still adopts the row and stops routing. Card 5 Pre refreshes from the routed VRS.
- **Secondary complaint (1c):** its onset no longer lands in the Duration column (Sudden → Y, Insidious → N, Chronic → blank trauma + duration "Chronic"); the "Other unlisted factors" text now reaches Painful Movements.
- **FM History (1d):** history rows carry `data-hist-field` names (positional read kept as a fallback); the **index surgery** from a Post-Surgical Chief Complaint now appears in FM History tagged "(index)" (the index injury does not — Card 1's Trauma? already records it). Recovery for the index row is set to "Ongoing".
- **Core ↔ FM (1e):** treating a point ticks "Fascial Manipulation (FM)" under Intervention (marked automatic, cleared again if the points are cleared); a tap by the therapist makes it theirs, and an untick sticks while points stay treated. The quick treatment row shows an FM chip once FM is in the note. Clinical Impression cross-references show the FM hypothesis and treated count.
- **Open questions for the owner:** (1) Post-Surgical onset → Trauma? "Yes" is an assumption; (2) the index surgery's Recovery defaulting to "Ongoing".
- **Tests:** new `tests/fm-step1-wiring.mjs` (27 checks); `fm-review2` now sets the side explicitly instead of relying on the old silent default of R. All 19 suites pass.

## FM Step 2: de-duplication (29 Oct; `CLAUDE_HANDOFF_FM_FIXES.md`)
- **One sequence action (2a):** removed **↻ Re-derive** (the hypothesis banner already re-derives on every grade/treated change via `updateDensitySummary`) and Card 3's **⚡ Apply to Sequence**. The Card 4 builder keeps one action, **⚡ Apply top findings**, which is disabled until a point reaches grade 2, plus **＋ Add point**. Repeated taps don't duplicate steps.
- **Grid-missing chips (2b):** the "not in the palpation grid" strip moved from Card 1 into Card 3 next to the grid pickers, labelled "From Card 1:". Same ids (`#fm-grid-missing`, `#fm-grid-missing-chips`).
- **One Response field (2c):** Card 5's five multi-select Session Response chips are replaced by a segmented control mirroring Core's *Response to treatment* (Improved / Unchanged / Worse / Unclear). A tap in either place sets the same value; a second tap clears both. `getFmData().sessionResponse` stays an array: `[coreValue]` or `[]`. (The old FM wording — "Immediate relief" etc. — is no longer collected; the session note's Better / Same / Worse chips are unchanged.)
- **Internal dysfunction (2d):** Subjective systemic symptoms and the Core detail text now show as read-only "From Subjective" pills at the top of the drawer instead of being copied into `#fm-internal-dysf`, which is now only the therapist's FM notes (nothing is auto-filled; the apparatus auto-flagging is unchanged). The VM box is untouched.
- **Tests:** new `tests/fm-step2-cleanup.mjs` (22 checks); `fm-section4-hybrid1` and `signed-lock` updated for the removed buttons. All 19 suites pass.

## FM Step 3: additions (29 Oct; `CLAUDE_HANDOFF_FM_FIXES.md`)
- **Role badges (3a):** Card 1 rows show **SiPa** (site of pain, from Chief Complaint), **PaConc** (concomitant pain, from a Secondary Complaint) or **Int** (internal, from systemic symptoms / tensile structure); manual rows have none. Card 3's segment column shows the same badge by segment code (a tiny corner label). `getFmData().segments[].role` exports it (`null` for manual).
- **FM chart in the note preview (3b):** replaces the one-line summary with a compact chart under Objective: segment table (segment, role, side, duration, trauma?, VRS, painful movements), FM history, graded points (✓ = treated), hypothesis and reasoning, treatment sequence, Mo/Ve pre → post and palpatory re-check pre → post, treatment notes. Only appears when FM is in the note.
- **Pattern prompts (3c):** three quiet, non-blocking lines — both planes of a pair densified on the same segment and side (An+Re, La+Me, Ir+Er; deliberately not called "co-contraction"), a densified segment that is also in FM History, and, in Card 4, "all planned points are on one segment". They describe the grid; they never write a hypothesis or touch the reasoning text.
- **Tests:** new `tests/fm-step3-additions.mjs` (15 checks); `fm-workspace-tabs` updated for the FM chart heading. All 20 suites pass.
- **Payload draft:** `PAYLOAD_SHAPE_DRAFT.md` now records FM segment `role`, blank-means-not-assessed side/trauma, the single response field, the index-surgery history row and FM-only internal-dysfunction notes.

## Print / Save as PDF polish (29 Oct)
- **Print stylesheet:** A4 with margins; a running page header on every page (patient name and ID on the left, **DRAFT** or **Completed note** plus the print time on the right, via CSS page margin boxes); "Page n of N" at the bottom; section headings and table rows no longer split across pages; table headers repeat; the shaded header colours print. Body text is 10.5 pt.
- **Draft vs completed:** the preview header now says "Draft preview — not a signed record" or "Completed <date time> — read-only record". Completion time is recorded when the note is signed (`window.__noteSignedAt`). The prototype stores no signer name, so none is printed; the TheraNet port will add it.
- **Ctrl/Cmd+P now prints the note:** it used to print a blank page unless the preview was open. A `beforeprint` hook opens the preview for the print and closes it afterwards. The document title becomes the default PDF file name ("Core Assessment - Priya Reddy - 2026-10-29") and is restored after printing.
- **Cleaner labels in the preview/PDF:** labels and card headings no longer pull in their hint text and toggle buttons ("Primary hypothesis", not "Primary hypothesis deliberate exception to structured-first"), and the moved Known Condition row no longer shows as a stray group heading.
- **Tests:** new `tests/print-pdf.mjs` generates real PDFs with headless Chrome and checks page count, header on every page, page numbers, draft vs completed, the blank-page fix, title restore, the FM table header and that no heading is stranded at a page bottom. All 21 suites pass.
- **Not included:** a downloadable-PDF button or signer identity (TheraNet port, reusing `NotePrintPage.tsx`).

## FM: detected patterns move to Card 4 as tappable chips (30 Oct)
- **Why:** Card 3's "Density & Pattern Intelligence" box and Card 4's banner said the same thing twice, and a tap on the banner only added the top-graded cells, never the pattern's own points. With two candidate lines (for example an RL and an AM diagonal on the same side) there was no way to choose.
- **Card 4:** a new "Detected patterns" row under the banner. Each chip is one pattern (≥2 segments graded 2 or higher on one plane and side) with its segment count and segment codes. **Tapping a chip adds that pattern's own points to the treatment sequence** (skipping any already there); a pattern whose points are all in the sequence shows as selected. The hypothesis banner then follows the sequence as before. The banner's "Suggested: …, tap to add" now adds the top pattern's points too.
- **Order:** see the follow-up below (fixed grid order, not ranked).
- **Card 3:** keeps "Highest findings" (tap to scroll to the cell) and the Treated / Untreated / points-evaluated line. The pattern list and the quiet prompts (planes both densified, segment also in FM History) moved to Card 4's pattern panel.
- **Verified, not a bug:** grade 1 never counts toward a pattern and each segment counts once. The "AM diagonal counted a grade-1 cell" report could not be reproduced; `tests/fm-patterns.mjs` now locks that in with the reported grid.
- **Data:** `window.__fmDetectedPatterns` entries gain `key`, `segs`, `points`, `top`; stored note data is unchanged.
- **Tests:** new `tests/fm-patterns.mjs` (20 checks incl. a signed note); `fm-density` reads the new panel. All 22 suites pass.
- **Not building (owner decision):** labelling antagonist diagonal pairs, marking one line "primary", an "include antagonist diagonal" chip. See the follow-up below.

### Follow-up (30 Oct): the therapist chooses the line — the app only shows the data
- **Owner decision:** the app never marks one line primary or pairs lines as antagonists. Which line to treat, and whether to go for an internal or a musculoskeletal sequence, is the individual therapist's discernment. The antagonist-pair labelling is therefore **not planned** (it is no longer "deferred pending a clinician").
- **Pattern chips** are listed in a **fixed grid order** (column order, right side first), not ranked by segment count, so the order never implies a priority.
- Each chip shows **every segment with its grade** (for example "CX 3 · GE 2 · TA 3") so the therapist has the data to decide from.
- With **more than one** pattern the banner no longer says "Suggested: …"; it reads "N patterns detected — choose which line to treat from the patterns below". With exactly one, the banner still offers it as before.
- Tests updated in `tests/fm-patterns.mjs`.

## FM: one-tap "treated" on sequence pills, and Earlier / Later ordering (30 Oct)
- **✓ on each Card 4 pill:** marks the point treated without scrolling back to Card 3. It writes the matching Card 3 cell (the single source of truth) through the same path as the grade picker's tick, so Card 3's totals, Card 5's palpatory re-check, the FM capsule, the auto-ticked "Fascial Manipulation (FM)" Intervention chip and the session-note points all follow. Treating in Card 3 turns the matching pill's ✓ on too (two-way), and tapping ✓ again undoes it.
- **Only where it is honest:** the ✓ is disabled when the cell is ungraded ("Grade this point in Card 3 first") or the segment is not in today's grid ("add this segment to the grid first"). The app never invents a grade or adds a cell. A treated pill is tinted.
- **Progress:** the sequence header reads "3 points planned · 1 treated".
- **Order:** the pill's edit popup has **◂ Earlier / Later ▸** (shown when editing, hidden when adding; disabled at the ends). The popup stays open on the moved point and the numbers re-index. No drag and drop (unreliable on touch).
- **Not built (decision):** a "mark all planned points as treated" action — it can record treatment that did not happen, and ticking each point as you go is 3–6 taps.
- **Signed notes:** the ✓ and the order controls are blocked by the existing lock.
- **Tests:** new `tests/fm-seq-treat.mjs` (30 checks: graded / ungraded / out-of-grid, two-way sync, ordering, signed note, 390 px fit). All 23 suites pass.

## Core layout compaction — Step 1 (30 Oct)
Blank note: **16 → 13 visible cards**. No field removed; every id kept (see `CLAUDE_HANDOFF_CORE_LAYOUT.md`).
- **Section 1:** Side | Onset and Since | Course now share a row each (stack on phones; Onset keeps its own sideways scroll). **Functional priority** (most limited activity, return-to, PSFS) is the last block of the Chief Complaint card.
- **Known condition moved back to Section 1** (owner decision, reverses the 21 Oct move to Impression): collapsed row "Known diagnosis / referral — optional" after the onset rows, still one field. Impression shows a read-only line under the working diagnosis ("Known condition: … · change in Section 1") that scrolls back to the row.
- **Safety:** the gate and the three precautions (blood thinner, implants, pregnancy) are one card.
- **Risk line:** when empty it is faint text ("No risks recorded"), no box; with real risks it keeps the amber card.
- **Plan:** Phase (with the recommended-phase note, drift banner and drift reason) is the first row of the Plan card.
- **Impression:** "Deep reasoning & ICF" is now three chips — Differential & evidence · Impairments & ICF · Contributing factors.
- Pain card needed no change (it already hides when Pain is not selected).
- **Tests:** new `tests/core-layout-step1.mjs`; existing suites unchanged and passing.
