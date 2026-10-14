# Thera.Net Assessment Form — Locked Changes & Decisions
## Delta Spec for Engineering Handoff (Post-Review)

*This document captures only the decisions and changes made during the review conversation. It assumes familiarity with the four base documents: `core-assessment-review-decisions.md`, `condition-template-full-mapping.md`, `protocol-library-seed-content.md`, and `patient-facing-rehab-guides.md`. Where this document conflicts with the base documents, this document wins.*

---

## 0. Confirmed in follow-up review (this pass)

Four open questions from the first read of this delta were resolved directly
with Prem. These corrections are folded into the relevant sections below,
but are logged here as the decision record:

1. **Level 1 General Neuro Screen removal is confirmed as-is** — no
   ungated fallback added. See §1's updated note on the accepted MVP
   consequence for Cervical Radiculopathy/Sciatica.
2. **MVP condition list stays at the 10 conditions in §3** — this
   supersedes the earlier "first-batch" 6-condition list referenced in
   prior planning (Post-op TKR, THR, Frozen Shoulder, Chronic LBP,
   Shoulder Stabilization Post-Surgical, Post-op ACL/Meniscus Repair).
   That earlier list is **retired**; §3's 10 conditions are the single
   MVP scope going forward.
3. **Red Flags/Screening exclusion is patient-facing-output only** — see
   §8, corrected below. This has a real consequence for MVP specifically,
   since MVP has no separate patient-facing artifact (§5).
4. **`actual_phase` reuses the existing Plan & Goals Phase field** (Acute/
   Subacute/Chronic/Maintenance/RTS-prep/Discharge) rather than
   introducing a second, separate Phase 1–4 dropdown — see §10, corrected
   below. This preserves base doc §11.5's "one phase concept, not two
   running in parallel" rule; it just makes that one field
   therapist-editable instead of purely calendar-derived.

---

## 1. Neuro Assessment — Consolidated into Group A Only

### Decision
Remove the **Level 1 General Neuro Screen** from the base assessment entirely. All neurological assessment (dermatomes, myotomes, reflexes, UMN signs, tone, coordination, cognitive screen, etc.) lives in **Group A** only.

### How it works in the note
- Group A appears as a **note section** (not a separate module tab) when active for the episode.
- **Activation paths:**
  1. Chief Complaint classifier (Stroke/TBI/Parkinson's/MS/Peripheral Neuropathy/Concussion) → auto-suggests dismissible pill → therapist accepts → Group A section appears.
  2. Therapist hits "+" in note → "Neuro Assessment (Group A)" → section appears.
  3. Added via Patient Profile module enrollment → auto-appears in all notes for that episode.
- Group A tools shown are **condition-mapped** (per base doc §8.2 table), not all tools always.

### Region-filtered display (NEW)
- When Group A is active and Anatomical Region = Cervical/Shoulder → dermatomes default-show **C5–T1 only**.
- When Region = Lumbar/Hip/Knee/Ankle → dermatomes default-show **L2–S2 only**.
- **"Show all levels" toggle** always available to override.
- Same filtering applies to myotomes and reflexes.

### Data architecture
- Live/master data: `neuro_spinal_assessments` table (episode-level, one row per episode).
- Note snapshot: On each note save, current Group A state is **snapshotted into the note payload** (`assessmentPayload`) as a read-only reference for that visit.
- Prior values visible for comparison; editable for today's update.
- **No duplicate entry**: If dermatomes were filled last visit, they appear as current values today.

### Schema note
- `neuro_spinal_assessments` table shape unchanged from base doc §8.2.
- Group A no longer has a `sensory_dermatomal` or `reflexes` tool that duplicates Level 1 — those tools are removed from the Group A registry. The registry now contains only: `tone_spasticity`, `motor_umn`, `sensory_peripheral`, `coordination_cerebellar`, `cognitive_screen_light`, `symptom_checklist_concussion`, `fatigue_relapse_ms`, `asia_composite`.
- Dermatomes/myotomes/reflexes are **base fields within the Group A section**, not separate tools.

### Accepted MVP consequence — confirmed, not a fix backlog item
Two of the 10 MVP condition templates (**Cervical Radiculopathy**, and
**Sciatica/Disc Herniation** if it re-enters scope) reference myotome/
dermatome grading in `condition-template-full-mapping.md` via
"cross-references existing Neuro Screen." With Level 1 removed, that
grading now has **no home outside Group A**, which is an Advanced Module
gated behind the Clinic tier (base doc §8.4). A Solo-tier clinic, or a
Clinic-tier clinic that hasn't enabled the Group A module, has **no way to
grade a myotome/dermatome/reflex** for a routine Cervical Radiculopathy
visit in MVP. **Confirmed accepted as-is** — the mapping doc's Cervical
Radiculopathy entry is corrected to state this dependency plainly rather
than implying a Neuro Screen that no longer exists.

---

## 2. Enable/Disable Templates & Protocols

### Decision
Add a **clinic-level setting** in Settings:
- **Label:** "Auto-apply condition templates"
- **Type:** Boolean toggle (ON/OFF)
- **Default:** ON
- **Scope:** Clinic-wide; affects all therapists at that clinic.

### Behavior
| Toggle | Effect |
|---|---|
| **ON** | Chief Complaint region + surgery type → auto-computes post-op week → suggests matching template pill (dismissible). Protocol Library phase content pre-populates load-management block + Precautions. |
| **OFF** | No template pills appear. No auto-population. Therapist works from general physio assessment. Protocol Library still exists and is manually referenceable, but does not auto-surface in the note. |

---

## 3. MVP Condition Templates — Locked List (10 Conditions)

### Post-Surgical (6)
1. **Post-op TKR** (Total Knee Replacement)
2. **Post-op ACL Reconstruction**
3. **Post-op THR** (Total Hip Replacement)
4. **Post-op Rotator Cuff Repair / Shoulder Stabilization**
5. **Post-op Lumbar Discectomy / Microdiscectomy**
6. **Post-op Achilles Tendon Repair**

### Non-Surgical (4)
7. **Chronic Low Back Pain**
8. **Subacromial Impingement / Rotator Cuff Tendinopathy**
9. **Ankle Sprain**
10. **Cervical Radiculopathy**

### Deferred to Post-MVP
- All other ~35 conditions from `condition-template-full-mapping.md`
- McKenzie/MDT module (explicitly deferred)
- Exercise Library table (see §5)

---

## 4. Assessment Modules — Zero Cuts

### Confirmed in MVP
- **Group A:** Brain/Spinal shared toolkit (`neuro_spinal_assessments`)
- **Group B:** Facial Palsy (existing table, frontend wiring), Vestibular (new table `vestibular_assessments`)
- **Cardiothoracic:** New table `cardiothoracic_assessments`

### Pre-requisite
- **`module_key` unconstrained-text bug fix MUST land before any new module gets a key assigned.** (Base doc §8.4, §17)

---

## 5. Exercise, HEP, and Rehab Timeline — Free Text for MVP

### Decision
No `exercise_library` table in MVP. No separate patient handout artifact.

### HEP in the note
- **Free-text rows** with category tags (drawn from Treatment/Intervention §12.4 categories: Strengthening, Eccentric loading, Stretching, Nerve glides, etc.).
- Therapist types exercise name + instructions; selects category tag from tappable chips.
- No video, no image, no library search.

### Rehab Timeline / Recovery Outlook
- **Read-only section** inside **Plan & Goals**.
- Sourced from `protocol_library.phases`:
  - Post-op: shows phase label + week range + precautions + HEP focus (clinical language)
  - Non-op: shows stage label (Acute/Subacute/Chronic/Maintenance) + precautions + HEP focus
- Prints as part of the consultation note PDF.
- No separate patient-facing PDF artifact.
- Patient-facing rewrite (`patient_summary` / `patient_precautions`) **deferred** — use clinical language in MVP. The patient-facing content pass happens post-MVP.

---

## 6. No Template — General Physio Assessment

### Behavior
When no condition template matches (or templates are disabled):
- **All Tier 1 sections visible and empty:** Chief Complaint, History, Screening, Pain Profile, Objective (ROM, Strength/MMT, Joint Mobility, Muscle Length, Functional Screening, Neurodynamics block, Special Tests), Treatment/Intervention, Plan & Goals.
- **Tier 2 sections hidden by default**, addable via "+" menu: Vitals & Measurements, Body Chart, Functional Status (PSFS), Gait & Posture, Palpation, Neurological Assessment (Group A — if module active).
- **No auto-populated suggestions.** No protocol phase lookup.
- Therapist fills everything from scratch.

---

## 7. Outcome Tracking — Relocated to Patient Profile

### Decision
Remove the Outcome Tracking section from the Core Assessment note editor entirely.

### New home: Patient Profile
- Cross-visit trend cards (NRS, PSFS mean, Tinetti, FMS, Y-Balance, 6MWT) appear in Patient Profile.
- **Trend cards require ≥2 notes** with that instrument in the same enrollment before rendering.
- **Milestone/Clearance cards** (RTS LSI, Scoliosis severity) show on first use.
- Vitals excluded from Outcome Tracking (point-in-time only, per base doc §9).

### Note editor: contextual hint only
- Near each scored input (NRS, PSFS, etc.), show faint hint: *"Last visit: [value]"*.
- No graphs, no cards, no full trend view in the note.

---

## 8. Live Preview & Print / PDF Export

### Corrected scope of the Red Flags/Screening exclusion
The original draft of this section said Red Flags/Screening "never appears
in preview or PDF" — **that's wrong as written and is corrected here.**
The exclusion rule is **patient-facing-output only**. The clinical
record — what the clinic itself keeps/exports — should retain Screening
data; a clinic facing an audit or a complaint needs it in their own copy.

This matters specifically **because of §5's MVP scope**: MVP has **no
separate patient-facing artifact** — the patient handout PDF is deferred,
and Rehab Timeline prints inside the single consultation note PDF instead.
That means, for MVP, **there is currently no patient-facing output at
all** — the one PDF that exists **is** the clinical record. So the
corrected rule resolves to:

- **MVP**: Live preview and PDF export **include** Red Flags/Screening —
  there's no patient-facing surface for it to be excluded from yet.
- **Post-MVP**, once the deferred patient handout artifact (base doc §14)
  is built: *that* artifact excludes Red Flags/Screening. The clinical
  note PDF continues to include it.

### Live preview (free, all tiers)
Renders the note as a clinical document:
- Converts chip selections to prose
- Shows computed fields (BMI, PSFS mean, LSI)
- Hides empty Tier 2 sections entirely
- Screening/Red Flags **included** (MVP — see correction above)

### PDF export (tier-gated)
- Same content as live preview, including Screening/Red Flags.
- Rehab Timeline appears inside Plan & Goals section.
- Single PDF document (clinical note + rehab timeline combined).

---

## 9. Tier 2 "+" Section Removal — Dual Options

### Collapse / Hide
- Section header has a **collapse chevron** or **"Hide"** action.
- Section disappears from view but remains attached to the episode.
- Reappears in next visit unless explicitly removed.
- Therapist can re-expand via a "Hidden sections" overflow or it auto-shows on next visit.

### Remove from Episode
- Section header has a **"Remove"** action (distinct from collapse).
- Section fully detached from the episode.
- Must be re-added via "+" menu to bring back.
- Removing a Tier 2 section stops it from appearing in future notes for that episode.

---

## 10. Post-Op Drift — New Mechanism

### The Problem
Patient's calendar post-op week says Phase 2, but clinically they are still at Phase 1 (missed rehab, slow healing, etc.).

### The Solution

**A. Surgery date storage**
- `surgery_date` stored on the **episode/enrollment record** (not the note).
- Never stored statically; always the source of truth.

**B. Auto-compute recommended phase**
- At every visit render: `calendar_post_op_week = floor((visit_date - surgery_date) / 7)`
- Look up Protocol Library: which post-op Phase (1–4) does Week X fall into?
- Cross-reference that post-op Phase to Plan & Goals' existing Phase
  vocabulary, per base doc §11.5's mapping (Phase 1–2 → "Acute," Phase 3 →
  "Subacute," Phase 4 → "RTS-prep"/"Maintenance").
- Display as `recommended_phase` (read-only, informational) — using the
  **Acute/Subacute/Chronic/Maintenance/RTS-prep/Discharge** label, not a
  raw "Phase N."

**C. Therapist selects actual phase — CORRECTED: no new field**
*Original draft of this section proposed a new, separate "Clinical Phase"
Phase 1–4 dropdown. That's corrected here — confirmed with Prem to reuse
the existing field instead, preserving base doc §11.5's "one phase
concept, not two running in parallel" rule.*
- **No new field.** Plan & Goals' existing **Phase** field (Acute /
  Subacute / Chronic / Maintenance / RTS-prep / Discharge) is reused as-is.
- That field **defaults to `recommended_phase`** (auto-selected from the
  calendar computation in step B) but is now **therapist-editable** —
  previously it auto-advanced with no override.
- The therapist's selected value on this one field **is** `actual_phase`
  for lookup purposes — there is no second value stored.
- This field's current value is the **authoritative** input for:
  - Protocol Library precautions lookup
  - HEP focus suggestions
  - ROM goal suggestions
  - Rehab Timeline display

**D. Drift indicator**
- Compares the therapist's current Phase field value against the
  freshly-computed `recommended_phase` for today's visit date — not two
  stored fields, just today's selection vs. today's calendar computation.
- When the therapist's selected phase is **behind** `recommended_phase`:
  - Show **yellow banner** in Plan & Goals: *"Patient is clinically behind
    protocol timeline. Calendar suggests: [Recommended phase] · Currently
    documented: [Selected phase]"*
- When **ahead** of `recommended_phase`:
  - Show **green/info banner**: *"Patient is progressing ahead of
    protocol timeline. Calendar suggests: [Recommended phase] · Currently
    documented: [Selected phase]"*

**E. Drift reason (optional)**
- Free-text field appears only when `actual_phase ≠ recommended_phase`.
- **Optional**, not required.
- Placeholder: *"Document reason for phase deviation (e.g., missed sessions, complications)"*

**F. Protocol Library content uses `actual_phase`**
- All pre-populated precautions, HEP focus, ROM goals pulled from Protocol Library using the therapist-selected `actual_phase`, not the calendar-derived `recommended_phase`.
- The therapist's clinical judgment always wins over the calendar.

### Edge case: surgery_date edited
- Rare, but if corrected, all visits automatically recompute `recommended_phase` from the same date.
- `actual_phase` values in prior notes remain as-documented (historical record).

---

## 11. McKenzie / MDT — Deferred

- Not built in MVP.
- Directional preference exercises still flow into HEP suggestions for LBP/Sciatica templates (from `condition-template-full-mapping.md`), but no dedicated McKenzie module.

---

## 12. Summary of Schema Changes (Delta Only)

### New tables (unchanged from base doc)
| Table | Purpose | Pre-requisite |
|---|---|---|
| `neuro_spinal_assessments` | Group A toolkit | `module_key` fix |
| `vestibular_assessments` | Group B Vestibular | `module_key` fix |
| `cardiothoracic_assessments` | Cardiothoracic module | `module_key` fix |
| `protocol_library` | Phase-wise protocols (10 MVP conditions) | New RLS shape |

### Removed from MVP scope
| Item | Original Plan | MVP Decision |
|---|---|---|
| `exercise_library` table | Built in MVP | **Deferred** — free-text HEP instead |
| `patient_summary` / `patient_precautions` fields on `protocol_library.phases` | Built in MVP | **Deferred** — clinical language only |
| McKenzie/MDT module | "+"-addable | **Deferred** |
| ~35 condition templates | All locked | **Deferred** — 10 only |
| Patient handout PDF artifact | Separate document | **Deferred** — prints inside consultation note |

### Field changes
| Change | Location | Detail |
|---|---|---|
| Remove Level 1 General Neuro Screen | Objective section | Entirely removed; all neuro in Group A |
| Add `surgery_date` | Episode/enrollment record | Date field, immutable after set (rare edits allowed) |
| Make existing Phase field editable | Plan & Goals | **Corrected**: no new field — existing Acute/Subacute/.../RTS-prep field becomes therapist-editable, defaults to calendar-computed `recommended_phase` |
| Add drift banner | Plan & Goals | Conditional UI when selected phase ≠ `recommended_phase` |
| Add drift reason | Plan & Goals | Optional free text, appears only when drift detected |
| Add clinic setting | Settings | "Auto-apply condition templates" boolean |

---

## 13. Sequencing Recommendation (Engineering Order)

1. **`module_key` fix** — blocker for all modules.
2. **Tier 1/Tier 2 UI shell + stickiness state machine** — foundation for everything.
3. **Chief Complaint restructure** — region inline, recency row, auto-compute post-op week.
4. **Protocol Library table + RLS + seed content** — 10 conditions only.
5. **Post-op drift mechanism** — `surgery_date`, `recommended_phase`, `actual_phase`, drift banner.
6. **Objective base fields** — ROM, MMT, Joint Mobility, Muscle Length, Functional Screening, Neurodynamics block, Special Tests.
7. **Condition template matcher + auto-apply** — 10 conditions, dismissible pills.
8. **Group A section** — region-filtered dermatomes, episode-level persistence, note snapshot.
9. **Treatment/Intervention subsections** — free-text HEP with category tags.
10. **Plan & Goals** — Phase, Goals, Rehab Timeline (read-only from Protocol Library).
11. **Outcome Tracking relocation** — Patient Profile trend cards + note editor hints.
12. **Live preview rendering** — note-to-document transform, minus Red Flags.
13. **PDF export** — tier-gated, same content as preview.
14. **Group B + Cardiothoracic** — can be built in parallel after `module_key` fix.

---

## 14. Second review pass — critical review response (this session)

*A third-party critical review (`theranet_critical_review.md`) raised
several concerns. Most were evaluated and either declined (re-litigating
already-closed decisions with no new argument) or deferred. Three were
acted on — logged here.*

### 14.1 Red Flags collapsed-by-default — **confirmed unchanged**
Reviewer proposed always-expanded. **Declined** — base doc §3's original
decision stands: Tier 1, collapsed-by-default is acceptable.

### 14.2 Minimal Neuro Screen — **partially reinstated, corrects §1 above**
*Supersedes §1 of this document and base doc §8.1's "removed entirely, no
ungated fallback" position — but only partially. This is narrower than
the original Level 1, not a full reversion.*

A **narrow, ungated Tier 2 section** is reinstated, available on all
tiers (not Group A/Clinic-tier gated):
- **Included**: myotomes, dermatomes, reflexes — same region-filtering
  logic as the original Level 1 (Cervical/Shoulder → C5–T1 + 3 reflex
  sites; Lumbar/Hip/Knee/Ankle → L2–S2 + 2 reflex sites), same tap-to-grade
  pattern as every other scored field in the app (no free text — grading
  is exactly the kind of thing chips/scales capture, per §0.1).
- **Excluded** (stays Group-A-only, Clinic-tier): UMN signs, coordination/
  cerebellar testing, cognitive screen. This is what keeps it "minimal" —
  it is not a full reversion of Level 1.
- **Trigger — new pattern, reuses the existing dismissible-pill mechanism
  (base doc §0.3)**: auto-suggested (not auto-added) when either (a) the
  Chief Complaint Primary Complaint chip **Weakness** or
  **Numbness/tingling** is selected, or (b) the matched condition template
  is **Cervical Radiculopathy**. Therapist can also manually "+ Add" it
  regardless of trigger, same as any Tier 2 section.
- **Resolves the accepted MVP limitation** flagged in §1 above and in
  `core-assessment-review-decisions.md` §8.1/`condition-template-full-mapping.md`'s
  Cervical Radiculopathy entry — myotome/dermatome grading for Cervical
  Radiculopathy (an MVP-locked condition) no longer requires the
  Clinic-tier Group A module.
- **No schema change** — reuses the same field shape Level 1 already had
  for these three field types; no new table needed for this narrow
  version (unlike Group A, which has its own `neuro_spinal_assessments`
  table).

### 14.3 Clinical Impression / Assessment section — **new Tier 1 section, added**
*New scope — not in any base document until now.* Confirmed rationale:
the note previously had no explicit synthesis step (the missing "A" in
SOAP) — Chief Complaint/History/Screening/Pain Profile/Objective collect
data, Intervention/Plan act on it, but nothing in between asks the
therapist to state a clinical impression.

**Placement**: new Tier 1 section, positioned after Objective and before
Intervention/Therapy — matches SOAP order (History-family ≈ Subjective,
Objective, **Assessment**, Intervention/Plan ≈ Plan). Renumbers the note
outline: Chief Complaint (1) → History (2) → Screening (3) → Pain Profile
(4) → Objective (5) → **Clinical Impression (6, new)** → Intervention/
Therapy (7) → Plan & Goals (8).

**Fields** (per reviewer's proposed set, confirmed):
- **Primary hypothesis** — free text. This is a deliberate, narrow
  exception to the app's structured-first philosophy (§0.1) — clinical
  synthesis is genuinely narrative in a way chip selections aren't; it is
  not a reopening of the general Free Notes removal (base doc §16, still
  removed).
- **Contributing factors** — tappable chips: Posture, Weakness, Mobility
  deficit, Neural tension *(starter set — not exhaustive; extend as real
  usage surfaces gaps, same "provisional, revisit after usage" caveat as
  base doc §0.2's Tier 1/2 split)*
- **Prognosis indicator** — segmented toggle: Favorable / Guarded / Poor

**Not included in this pass** (reviewer also proposed these; deferred,
not decided against — needs separate confirmation before adding):
template-suggested starter text for Primary hypothesis, and templates
suggesting Contributing factors per condition. Both are natural follow-ons
but weren't part of what was confirmed this session.

### 14.4 Everything else in the critical review — deferred, not decided
The review raised many other points (follow-up "light mode," carry-forward
treatment, context-aware Tier promotion, contextual safety guardrails,
natural-language preview, multi-template support, rich trend
indicators/sparklines in the note editor, HEP quick-build chips, time
allocation per intervention, Free Notes reinstatement). **None of these
were acted on** — some directly conflict with explicit prior decisions
(e.g. sparklines in the note editor vs. delta spec §7's "contextual hint
only, no graphs" call; single total-time field vs. §12.5's "kept simple
per your explicit call"), others are genuinely new scope not yet
confirmed. Flagged here so they aren't lost, not because they're rejected
— revisit if/when relevant.

## 15. Intake flow reorganization (this session)

Three sequence/hierarchy corrections, confirmed with Prem. None change
field content, schema, or trigger logic — all are ordering/presentation
fixes. Full detail and the definitive ordering table now live in
`core-assessment-review-decisions.md` §0.5 (new) and §0.3a (new) — this
entry is the decision log pointer.

1. **Screening moved from note position 3 → 2** (right after Chief
   Complaint, ahead of History) — safety-relevant screening now happens
   before biographical history-taking, not after.
2. **Safety Flags (blood thinner/implants/pregnancy) relocated out of
   History into the same section as Screening**, now called "Safety
   Checkpoint" — both feed the same safety banner (§2a) and are safety-
   relevant, not biographical, so they're co-located. Medications/
   Allergies stay in History (not part of this relocation — see the
   scoping note in §0.5).
3. **The three separate trigger pills (Ortho/MSK template, Advanced
   Module, minimal Neuro Screen) consolidated into one "Suggested for
   this visit" panel**, positioned after Chief Complaint, before the new
   Safety Checkpoint. Trigger conditions are unchanged — this only changes
   where suggestions are displayed.

## 16. Chief Complaint field-level fixes (this session)

Three corrections to Chief Complaint's Context group fields, found during
an internal-organization review. Full detail in
`core-assessment-review-decisions.md` §1 — this is the decision-log
pointer.

1. **Onset gap fixed for Known-condition/Neither branches.** Onset is a
   derived summary, not a raw date field — but only the surgery/trauma
   recency branches had an actual date to derive from. Added **Onset
   timing** (quick-pick duration chips) and **Onset quality** (Sudden/
   Gradual) to the Known-condition and Neither reveals specifically, so
   the most common gradual-onset MSK cases get a real derived summary
   instead of a placeholder.
2. **Mechanism of injury de-duplicated.** Was captured twice — once
   inside the Recent Trauma reveal, once again in Context group. Merged
   into one field, kept in Context group, applies regardless of recency
   answer.
3. **Trend field — considered visit-aware hiding, declined.** Stays
   always visible regardless of visit number, per Prem's call.

## 17. Chief Complaint reorder + Onset split + Secondary complaint expansion (this session)

Full detail in `core-assessment-review-decisions.md` §1 (rewritten this
session) — this is the decision-log pointer.

1. **Field order reordered**, second correction to this section.
   Presenting Problem promoted to first field (was last, framed as
   optional — now the natural opening question). Region stays early
   (position 2) for its own sake, not because it drives auto-suggestions.
   Explicit design goal per Prem: the form should work well as a
   standalone assessment even with templates/protocols off, for physios
   who prefer manual assessment. Full order: Presenting Problem → Region
   → Recency/classifier row → Primary complaint chips → Secondary
   complaints → [Context group] Onset timeline + Episode context →
   Mechanism of injury → Episode pattern → Trend → Occupation/Activity.
2. **Onset split into two derived fields**: Onset timeline (pure time)
   and Episode context (classification + quality + identifying detail).
   Both still fully derived/read-only — no new input, just clearer
   presentation of data already being computed.
3. **Secondary complaints expanded** from a single free-text row to a
   structured card: Description, Onset (lightweight duration quick-pick,
   deliberately not the full recency-branch system), Severity
   (Mild/Moderate/Severe), Relation to primary (new field), Aggravating
   factors (free text, scoped to that specific secondary complaint —
   see the scoping note in the base doc regarding Pain Profile's
   equivalent field being understood as primary-complaint-scoped).

## 18. History refinement pass (this session)

Full detail in `core-assessment-review-decisions.md` §2 — this is the
decision-log pointer.

**Fixed (consistency corrections, no new decisions needed):**
1. Previous pain history's Intensity field converted from free text to a
   Mild/Moderate/Severe select — was violating §0.1's tap-to-select rule.
2. Previous pain history's Region field converted from free text to the
   same structured 9-region select Chief Complaint uses — enables actual
   region-matching against the current complaint, not just similar-sounding
   strings. Trauma history's Body part field stays free text deliberately
   (needs laterality/specificity a coarse region list can't capture).
3. Past injuries repeatable cards gained a Current status field
   (Resolved/Ongoing management/Reinjured/Unknown) — parity fix, Past
   surgeries already had this field.
4. Medical conditions chip order regrouped into clinical clusters
   (cardiopulmonary / metabolic-systemic / MSK-adjacent /
   neuro-hematologic-oncologic / mental health) — cosmetic only, same 13
   items, same data.

**Added (confirmed with Prem):**
5. **Family history** — new card in History, repeatable (Relation: Parent/
   Sibling/Grandparent/Other; Condition: free text). Was not captured
   anywhere in the note previously.

**Declined:**
6. Connecting Episode pattern's "Recurrent" selection to visually nudge/
   highlight History's Previous Pain History section — considered,
   declined. Sections stay unconnected.

**Parked, not resolved:**
7. Episode pattern's "Post-surgical" option vs. Recency row's "Recent
   surgery" — flagged as possibly redundant. Prem wants to think it over.
   **No change made** — option stays as-is until a follow-up decision.
   **RESOLVED, see §29.**

## 19. Chief Complaint / History / Context major refinement (this session)

Full detail in `core-assessment-review-decisions.md` §0.5, §1, §2, §5 —
this is the decision-log pointer for the largest single-session
restructure to date.

**Structural (confirmed with Prem):**
1. **Safety Checkpoint moved from position 2 (right after Chief
   Complaint) to position 3 (right after History, before Objective)** —
   second reordering of this section this session. Reasoning reversed
   from the earlier ER-triage-speed framing to standard orthopedic/manual
   therapy examination teaching: Maitland/McKenzie/SOCRATES place
   "Special Questions" (red-flag screening) at the END of the subjective
   exam, since red flags are interpreted against History context, not
   asked context-free.
2. **Pain Profile retired as a standalone Tier 1 section, folded into
   Chief Complaint's Context group.** Note total drops from 8 sections to
   7. Reasoning: SOCRATES treats severity/pattern/exacerbating-relieving
   as core History-of-Present-Complaint content, not a separate section —
   splitting it out was making Primary Complaint feel disconnected from
   its own severity data. Fields, schema, and Outcome Tracking's
   consumption of NRS data are unchanged — this was a UI/grouping move.
3. **Laterality added** (Left/Right/Bilateral/N/A) directly below Primary
   Complaint chips — addresses the "disconnected" complaint alongside #2.

**Field-level fixes (confirmed):**
4. Recency row relabeled "How did this begin?" — was duplicating
   Presenting Problem's "what brings them in today" framing.
5. Job/role field removed — redundant with Occupation category +
   Specific demands.
6. Current status dropdown options differentiated between Past Surgery
   and Past Injury cards — were identical, now each has its own
   clinically-appropriate option set (surgery gets "Required revision
   surgery"; injury gets "Chronic/recurring issue").
7. Sleep quality expanded — 4-tier scale + Average hours/night (new,
   previously uncaptured) + Difficulty type chips.

**Parked, not resolved (carried forward, unchanged):**
8. Episode pattern's "Post-surgical" option vs. Recency row's "Recent
   surgery" — still flagged as possibly redundant, still unresolved.
   Prem is thinking it over. No change made. **RESOLVED, see §29.**

## 20. Laterality relocation + Screening built (this session)

Full detail in `core-assessment-review-decisions.md` §1 (field 2) and §3
— this is the decision-log pointer.

1. **Laterality moved from Primary Complaint to Region.** Was placed
   under Primary Complaint chips last session to fix the "disconnected"
   complaint; correctly belongs with Region instead — it's a location
   property (where), not a symptom property (what). Now paired
   side-by-side with Region.
2. **Screening (Red/Yellow Flags) built.** 8 red flag items (3-state No/
   Yes/N-A) + bulk "No red flags" clear; 5 yellow flag items (4-state
   concern scale). **New smart-collapse behavior**: collapsed summary is
   state-aware — neutral when untouched, green confirmation when clean,
   and a persistent red callout naming the specific flagged item(s) when
   any red flag is positive, visible even while the section stays
   collapsed. Expanded view also highlights flagged rows against
   unflagged ones. This is a middle ground between "always expanded"
   (declined earlier, delta spec §14.1) and a flat collapsed state that
   would bury a positive finding.

## 21. Objective section built (this session)

Full detail in `core-assessment-review-decisions.md` §11.0 — this is the
decision-log pointer.

Built all 7 sub-fields: ROM, Strength/MMT, Joint mobility, Muscle length,
Functional screening, Neurodynamics, Special Tests. Key choices:
- **ROM and Strength/MMT rows auto-suggest from the Region selected in
  Chief Complaint** — structure only (movement/muscle names), never
  pre-filled clinical values, per §11's rule. Config covers all 9
  regions; the 6 MVP-relevant regions (Cervical, Lumbar, Shoulder, Hip,
  Knee, Ankle/Foot) have fuller lists.
- **ROM uses plain numeric degree inputs**, not a tap-scale — explicitly
  not a §0.1 "scored field" (continuous range, not discrete).
- **Strength/MMT uses a 0–5 tap-scale** — genuinely discrete, fits §0.1.
- **Joint mobility uses Hypomobile/Normal/Hypermobile** rather than full
  Maitland Grade I–V — flagged as an assumption, easy to swap.
- **Neurodynamics reuses the repeatable-card component** already built
  for History (Test/Response type/Provoking range/Sensitizing maneuver/
  Notes) — confirms it's a structured block, not a flat Special Test row.
- **Special Tests are not per-condition auto-suggested in this mockup** —
  the full per-condition mapping already exists in
  `condition-template-full-mapping.md` for all 10 MVP conditions; wiring
  that level of specificity is left as a Claude Code build task.

## 22. Objective corrections — bilateral comparison + MRC grading (this session)

Full detail in `core-assessment-review-decisions.md` §11.0 — this is the
decision-log pointer.

1. **ROM and Strength/MMT rows now read Laterality and render L/R
   columns.** Laterality = Left/Right/Bilateral → always shows both L and
   R columns (comparing to the uninvolved side is standard practice even
   for a one-sided complaint, confirmed with Prem). Laterality = N/A or
   unset → single column (correct only for regions like spine where side
   is already baked into the movement name). Changing Laterality
   live-regenerates the rows. **Known limitation, not fixed**: this
   currently clears any values already entered in those rows — real
   build should preserve entered values when only the column count
   changes.
2. **Strength/MMT upgraded to full MRC grading with +/- modifiers** — was
   a simplified 0–5 scale, now the proper 12-value convention (0, 1, 2-,
   2, 2+, 3-, 3, 3+, 4-, 4, 4+, 5), matching standard manual muscle
   testing practice. Bilateral rows stack two full grade-scales rather
   than combining into one crowded row.
3. **Joint mobility and Muscle length are not yet side-aware** like ROM/
   MMT — flagged as a possible follow-on, not done this pass.

## 23. Objective — Laterality/MRC refinement, resolves the earlier limitation (this session)

Full detail in `core-assessment-review-decisions.md` §11.0 — this is the
decision-log pointer. Supersedes §22 above.

1. **Row structure (L/R columns) now depends on Region only, not
   Laterality.** Spine regions get a single column (side already in the
   movement name); every other region always shows both L/R,
   unconditionally — comparing to the uninvolved side is standard
   practice regardless of which side the complaint is on. Laterality no
   longer triggers a row rebuild, which **resolves §22's flagged
   data-loss limitation** rather than leaving it open.
2. **Laterality now drives an affected-side highlight instead** — amber
   tint + accent bar on whichever column(s) match the current Laterality
   selection, so the clinically relevant side is visually distinguishable
   without hiding the comparison side. No highlight when Laterality is
   N/A or unset.
3. **MMT simplified from 12 buttons to 8** — separate number (0–5) +
   modifier (+/−) buttons that combine to the same full MRC grades (0, 1,
   2-, 2, 2+, 3-, 3, 3+, 4-, 4, 4+, 5). Modifiers auto-disable for 0/1/5,
   which don't take +/- in standard MRC grading.

## 24. Objective polish + Clinical Impression built (this session)

1. **Column order swapped to Right-then-Left** (was Left-then-Right) in
   ROM/MMT side-by-side rows — cosmetic only, no logic change.
2. **Affected-side highlight lightened** — was a solid amber tint +
   3px accent bar, now a much subtler low-opacity tint + 2px bar. Same
   mechanism (§23), just visually quieter.
3. **Clinical Impression built** — matches the spec locked in
   `core-assessment-review-decisions.md` §11a / delta spec §14.3 exactly:
   Primary hypothesis (free text), Contributing factors (chips: Posture/
   Weakness/Mobility deficit/Neural tension), Prognosis indicator
   (Favorable/Guarded/Poor segmented). No new decisions — straightforward
   build of already-locked content.

## 25. Objective — region-driven Special Tests + consistency completions (this session)

Full detail in `core-assessment-review-decisions.md` §11.0 — this is the
decision-log pointer.

1. **Special Tests now region-suggested** — region-level aggregation from
   `condition-template-full-mapping.md` (e.g. Knee → McMurray's/
   Lachman's/Anterior drawer/Valgus/Varus stress). Region-level, not full
   per-condition specificity — that finer wiring is still a Claude Code
   task, this closes the gap partially.
2. **Joint mobility and Muscle length made side-aware** — closes the
   follow-on flagged last session, reuses the same side-block/highlight
   mechanism as ROM/MMT.
3. **Functional screening now lightly region-suggested** — short default
   list per region (e.g. Single-leg squat quality for Knee), not
   side-aware (movement names already encode side when relevant).
4. **Neurodynamics' Test dropdown now filtered by region** — was always
   showing all 7 options regardless of region; now shows only the
   region-relevant subset.

All four reuse the region-driven suggestion pattern already established
for ROM/MMT — no new architecture, consistency completion.

## 26. ROM — End-feel and Pain-during-movement added (this session)

Full detail in `core-assessment-review-decisions.md` §11.0 — this is the
decision-log pointer. Confirmed with Prem before building (genuinely new
fields, not a consistency completion of an already-approved pattern).

- **End-feel** — select per side: Capsular / Bony / Springy block / Empty
  (pain) / Muscular. Standard orthopedic manual therapy content
  (Cyriax/Maitland), previously entirely absent from ROM.
- **Pain during movement** — toggle per side, reveals a free-text note
  for where in range when active (e.g. "painful arc 60–120°"). Fills a
  real gap — the mapping doc's Shoulder ROM entry says "note painful arc"
  but there was no field for it.
- Both live inside the existing per-side block, so they inherit the same
  L/R + affected-side-highlight behavior already built for ROM/MMT.

## 27. Five fixes: Joint mobility naming, Clinical Impression refinement, smart-add system, Cardiothoracic (this session)

Full detail in `core-assessment-review-decisions.md` §11.0/§11.0a (new),
§11a, §1a — this is the decision-log pointer for a large combined pass.

1. **Joint mobility naming corrected** — "Hypermobile" as a per-joint
   grading word was misleading (reads like systemic hypermobility
   syndrome screening). Switched to Maitland Grade I–IV for local
   accessory motion. Added a genuinely separate "Hypermobility syndrome
   (EDS/JHS)" flag to History's Medical Conditions for the systemic
   concept — properly separated, not conflated.
2. **Clinical Impression refined** — was flagged as vague. Added a
   read-only cross-reference strip (pulls active template/module matches
   + any positive Yellow flags, doesn't re-ask); reorganized Contributing
   factors into 3 labeled categories (Biomechanical/Neuromuscular/Load)
   instead of a flat 4-chip list; added Irritability (Low/Moderate/High,
   SIN framework) as new content — a genuine gap, not captured anywhere
   else in the note.
3. **Smart-add system built across all 6 Objective sub-fields** (ROM,
   MMT, Joint mobility, Muscle length, Functional screening, Special
   Tests) — replaces prompt()/plain-text entry with a region-aware
   dropdown showing: dismissed/removed suggestions (one-tap restore, no
   region round-trip needed), the region's full reference vocabulary
   (reduces free-text typos), and a Custom fallback. Solves both the
   "how do I get a removed item back" question and the "why is manual add
   a plain text box" question with one mechanism.
4. **Cardiothoracic added to the Known Condition picker** — base doc
   §11.4 already specified this (Cardiothoracic triggers its own
   Advanced Module via the Chief Complaint classifier) but it was never
   actually built; the picker only ever had neuro options despite §1a
   explicitly saying "not Neuro-specific." Build gap, not new scope.

## 28. Ortho conditions, Sports Profile, multi-region Objective (this session)

Full detail in `core-assessment-review-decisions.md` §1a, §6a (new),
§11.0b (new) — this is the decision-log pointer for three separate
additions requested together.

1. **Ortho conditions added to the Known Condition picker** — a new
   "Orthopedic/MSK (non-surgical)" group with the 4 non-op MVP conditions
   (Chronic LBP, Subacromial Impingement, Ankle Sprain, Cervical
   Radiculopathy), letting a therapist directly confirm/override the
   Region-based guess rather than relying solely on inference. Post-op
   conditions intentionally excluded — already precisely captured via
   Recency = Recent surgery + Surgery type, no need for a second path.
2. **Sports Profile — new Tier 2 section**, sport-related content only:
   Sport (read-only, pulled from Chief Complaint), Position/role, Level
   of competition, Training phase, Training load (sessions+hours/week),
   Upcoming competition, Return-to-sport goal. Auto-surfaces when a real
   sport is selected in Chief Complaint's Activity/sport field; hideable.
   Built as a genuine functional section (unlike other Tier 2 items in
   this mockup, which remain outline stubs) since it was explicitly
   requested.
3. **Multi-region Objective — "+ Assess another region"**. Adds
   self-contained secondary region blocks (ROM, Strength/MMT, Special
   Tests only — not all 7 sub-fields) below the primary Objective
   content, for secondary/compensatory complaints in a different region.
   Reuses the same builder functions and region configs as the primary
   block. **Known limitation, flagged not fixed**: secondary blocks share
   the single global Laterality value with the primary block — not
   necessarily meaningful for a different region. Real build should give
   each region block its own laterality context.

## 29. Episode pattern "Post-surgical" vs. Recency row "Recent surgery" — RESOLVED (this session)

*Closes the item parked in §18 item 7 and carried forward unchanged in
§19 item 8 — corrects both. Full detail in
`core-assessment-review-decisions.md` §1 (field 8) and §2's open/parked
items — this is the decision-log pointer.*

**The redundancy only actually fires in one specific case**: when
Recency = "Recent surgery," selecting Episode pattern = "Post-surgical"
is pure restatement — a recent surgery *is* a post-surgical episode by
definition. The option is not redundant in general, though — a patient
whose current complaint traces back to a surgery from years ago
(Recency = "Known condition or diagnosis," not "Recent surgery," since
the surgery itself isn't recent) still needs a way to flag that the
episode pattern is post-surgical, and nothing else in Chief Complaint
captures that for the older-surgery case.

**Decision**: not removed. Instead, treated the same way Onset's derived
fields already work — **auto-defaulted, not auto-locked**:

- When Recency = "Recent surgery" is selected, Episode pattern
  auto-selects "Post-surgical" (removes the redundant manual re-click in
  the one case where it really is a tautology).
- Therapist can override this at any time — same as every other
  auto-default in the app (recommended_phase in Plan & Goals works the
  same way, see delta spec §10/§27).
- Once the therapist manually picks a different Episode pattern value,
  the auto-default stops re-asserting itself for that visit — it's an
  initial default, not a locked/derived read-only field like Onset
  timeline/Episode context.
- The "Post-surgical" option itself is **unchanged and still manually
  selectable** regardless of Recency's answer — this is what preserves
  its value for the older-surgery case.

**No schema change** — reuses the existing Episode pattern field and
existing option list; only default-selection behavior is added,
conditioned on Recency's value. **Built in the mockup this session** —
`clinical-note.html`'s Episode pattern segmented now auto-selects
"Post-surgical" when Recency = "Recent surgery," with the same
manual-override-stops-auto-default pattern already used for Plan &
Goals' Phase field.

## 30. Group A built, MSK Objective collapse, real ISNCSCI/AIS scoring, Fugl-Meyer (this session)

*New scope — Group A existed only as an outline stub before this
session (base doc §8.2/§8.4 specified the architecture but nothing was
built). Corrects/extends `core-assessment-review-decisions.md` §8.2,
§8.4, and §18 — full detail below, base doc updated to match.*

### 30.1 Group A now appears as a real note section

Built per §8.4's corrected trigger paths: auto-suggested via the Chief
Complaint condition classifier (§1a) for the 6 conditions the base doc's
§8.2 table actually assigns to Group A (Stroke/TBI, Paraplegia/SCI,
Parkinson's, MS, Peripheral Neuropathy, Concussion). **Vestibular and
Facial Palsy deliberately do not trigger Group A** — confirmed against
§8.3/§8.4, which specify those as Group B, Patient-Profile-entry only,
not note-inline. Selecting either in the mockup's condition picker shows
a suggestion pill labeled "Patient Profile entry, not shown in this note
mockup" rather than opening a section — correctly reflects that Group A
and Group B have different entry points, not a build gap.

Base fields (dermatomes/myotomes/reflexes, region-filtered) render first
for every Group A condition, reusing the same component as the minimal
Neuro Screen (§14.2) — no duplicate implementation, consistent with
§8.2's "no schema change, reuses the same field shapes" note.

Condition-mapped tools render below the base fields, per §8.2's table —
confirmed no change to that table this session **except** the two
additions in §30.3 and §30.4 below.

### 30.2 MSK Objective collapse when a Group A condition is active — NEW DECISION

*Not previously specified anywhere in the base doc or this delta spec —
raised and confirmed with Prem this session.*

**Problem**: ROM/Strength-MMT/Joint mobility/Muscle length/Functional
screening/Neurodynamics/Special Tests (the whole base Objective
structure, §11) are built around a single-region MSK exam. For a Group A
condition like Stroke/TBI or Paraplegia/SCI, that structure isn't the
relevant exam shape — Group A's own tools (Tone/Spasticity, Motor UMN
pattern, the ISNCSCI worksheet, etc.) are what actually apply.

**Decision**: when a Group A-triggering condition is selected, the
entire base Objective content **collapses to a summary banner**
("Musculoskeletal Objective collapsed — not typically the primary exam
structure for [condition]. Group A (below) covers the neuro-relevant
exam instead.") with a **"Show anyway"** action.

- **Collapse, not hide/remove** — nothing already entered in ROM/MMT/etc.
  is cleared. This is a display-state change only, same non-destructive
  principle as delta spec §9's Collapse/Hide.
- **Reversible, therapist wins**: clicking "Show anyway" expands it back
  and the auto-collapse stops re-triggering for the rest of that visit —
  same manual-override-stops-auto-behavior pattern already used for Plan
  & Goals' recommended_phase (§10) and this session's Episode pattern
  fix (§29). A genuinely mixed-presentation patient (e.g. a stroke
  patient with a separate orthopedic complaint) is never blocked from
  the MSK exam, just defaulted away from it.
- Switching to a non-Group-A condition (or clearing the picker)
  re-expands automatically.
- **No schema change** — this is a note-rendering/UI-state decision only,
  not a new field or table.

### 30.3 Real ISNCSCI/AIS scoring for Paraplegia/SCI — supersedes the asia_composite placeholder

*Corrects `core-assessment-review-decisions.md` §8.2's tool registry
entry for `asia_composite`, which was previously described only as "a
computed roll-up... not modeled numerically" pending real build. Built
properly this session per explicit request.*

For Paraplegia/SCI specifically, Group A now shows a **full ISNCSCI
worksheet** in place of the generic base-fields-plus-tool-list pattern
used by the other 5 conditions — confirmed as the right call, since SCI
classification genuinely needs whole-cord (C2–S4/5) bilateral testing,
not the single-region-filtered base fields the other conditions use.

**Built**:
- Full 28-level bilateral sensory grid (Light Touch + Pin Prick, each
  0/1/2/NT)
- All 10 ISNCSCI key muscles bilaterally, MRC 0–5
- Voluntary Anal Contraction (VAC) and Deep Anal Pressure (DAP)
- **Live-computed**: sensory totals (LT/PP, /112 each), motor total
  (UEMS+LEMS, /100), sensory level per side, motor level per side,
  single Neurological Level of Injury (NLI), Complete-vs-Incomplete
  determination from sacral sparing, and the actual **AIS A–E grade with
  a plain-language interpretation** — all recompute live as the
  worksheet is filled in.
- Patellar/Achilles reflexes retained as a supplementary block below the
  worksheet (not part of the formal AIS algorithm, but clinically
  relevant for UMN signs) — the only piece of the old base-fields/tool
  pattern kept for this condition.

**Explicitly flagged as simplified, not a full replacement for the
official algorithm** — does not implement Zone of Partial Preservation,
and Not-Testable (NT) handling is simplified rather than following every
edge case of the official ISNCSCI worksheet. Stated directly in the UI
copy, not just in this doc. **Added to the clinician-sign-off list**
alongside Precautions (§18 of the base doc) — the AIS grading logic
needs verification against known real cases before shipping, same
reasoning as Precautions content needing your referring surgeons'
actual protocols rather than shipping unverified.

**No schema change specified yet** — this mockup doesn't model a new
table; a real build would need its own ISNCSCI-shaped table (28 sensory
levels × 2 sides × 2 modalities + 10 muscles × 2 sides + VAC/DAP, plus
the derived level/grade fields), separate from the generic
`neuro_spinal_assessments` shape used by the other Group A tools. Flagged
as an open item for the eventual real Group A schema pass — not decided
this session.

### 30.4 Fugl-Meyer Assessment added to Stroke/TBI's tool set — NEW

*New tool, not in the original §8.2 registry or condition-tool mapping
table — added this session after reviewing stroke-specific assessment
options with Prem. Declined: Modified Rankin Scale, Postural Assessment
Scale for Stroke/trunk-control tool (neither chosen this pass — can
revisit).*

- **Registry**: Fugl-Meyer Assessment (motor) added as a 9th Group A
  tool, mapped to Stroke/TBI only (not the other 5 Group A conditions).
- **Scoped the same way Tinetti was scoped in Gait & Posture (base doc
  §7)**: subtotal entry (UE motor /66, LE motor /34), not the full
  ~50-item breakdown — combined total and a severity band compute live.
  Only the score, not item-level detail, is what would surface in note
  preview/print, consistent with Tinetti's existing "score only" rule.
- **Severity bands are a general percentage-of-max simplification**, not
  the precise validated FMA severity categories from a specific
  published source — flagged in the UI copy itself. **Added to the
  clinician-sign-off list** alongside Precautions and the AIS grading
  logic above.
- No schema change specified yet, same open-item status as §30.3's
  ISNCSCI table — a real build needs its own shape for this, not decided
  this session.

### 30.5 Updated condition → tool mapping table (supersedes the table in base doc §8.2)

| Condition | Tools shown |
|---|---|
| Stroke/TBI | tone_spasticity, motor_umn, **fugl_meyer (new)**, reflexes (base), coordination_cerebellar, cognitive_screen_light |
| Paraplegia/SCI | **full ISNCSCI worksheet (supersedes base_dermatomes/motor_umn/base_reflexes/asia_composite placeholder — see §30.3)**, plus reflexes (supplementary) |
| Parkinson's | coordination_cerebellar, tone_spasticity (rigidity) — unchanged |
| MS | coordination_cerebellar, fatigue_relapse_ms, sensory_dermatomal — unchanged |
| Peripheral Neuropathy | sensory_peripheral — unchanged |
| Concussion | symptom_checklist_concussion, cognitive_screen_light — unchanged |

### 30.6 Hoehn & Yahr Stage added to Parkinson's tool set — NEW (follow-up session)

*Same "round out Group A with a condition-specific gold-standard measure"
pass as §30.4's Fugl-Meyer addition, applied to the remaining 4
conditions. Only this one was picked — see below for what wasn't.*

- **Registry**: Hoehn & Yahr Stage added as a 10th Group A tool, mapped to
  Parkinson's only.
- **Content**: the modified 8-point scale (0, 1, 1.5, 2, 2.5, 3, 4, 5),
  each stage with its standard description (e.g. Stage 2: "Bilateral
  disease, without impairment of balance") surfacing once selected — a
  simple severity/laterality staging tool, not a multi-item assessment,
  so no subtotal/composite computation needed the way Fugl-Meyer or the
  ISNCSCI worksheet required.
- **Explicitly not built this pass** (offered, not chosen): EDSS for MS,
  DN4 neuropathic pain screen for Peripheral Neuropathy, upgrading the
  Concussion symptom checklist from Yes/No chips to 0–6 graded severity
  (SCAT5-style). None declined outright — just not picked this round,
  can revisit.
- No schema change specified — same open-item status as Fugl-Meyer/
  ISNCSCI (§30.3/§30.4): a real build needs its own field shape for this,
  not decided this session.

## 31. Questionnaires — new section, auto-suggested by condition, therapist accept/skip (this session)

*New scope — begins the "dedicated PROM/questionnaire pass" flagged as
still-needed throughout this spec and the base doc's §18 open items.
Corrects/extends base doc §18's PROM item — see the updated entry there.*

### 31.1 Structure

New Tier 2 section, **"Questionnaires"** — reuses the same Tier2 shell
already built for Vitals/PSFS/Gait/Palpation/Neuro Screen (§0.2's
"+"-addable, sticks-once-added model), so it also appears in the manual
"+ Add section" dropdown regardless of match.

**Auto-suggest, not auto-fill** — same dismissible-pill philosophy as
§0.3, adapted with an explicit accept/skip step since filling out a full
PROM is a bigger commitment than accepting a template pill:
- Triggers off the same matched condition template signal that already
  drives Load-management pre-population and the Rehab Timeline (delta
  spec §10/§27's `ortho-template` suggestion).
- When triggered, the Questionnaires section itself auto-adds (same
  auto-add-on-trigger behavior as the minimal Neuro Screen, delta spec
  §14.2), but each suggested instrument renders as a **collapsed card
  with "Use this questionnaire" / "Skip"** — nothing is filled in until
  the therapist opts in.
- **Skip** collapses to a dashed "skipped — Add anyway" strip, not a
  delete — reversible, matching the collapse-not-remove principle
  established for the MSK Objective collapse (§30.2).
- **Manual add always available** via a dropdown inside the section,
  independent of any match — same "manual override always available"
  rule used for the minimal Neuro Screen and Group A.
- If the matched template changes before a suggestion is acted on, the
  suggestion set updates live; anything already accepted or skipped is
  left alone (mirrors the Tier2/Group A "don't fight the therapist's
  prior choice" pattern).

### 31.2 First-pass condition → questionnaire mapping (all 10 MVP conditions)

| Condition | Questionnaire |
|---|---|
| Post-op TKR | Oxford Knee Score |
| Post-op ACL Reconstruction | IKDC Subjective Knee Form |
| Post-op THR | Oxford Hip Score |
| Post-op Rotator Cuff Repair/Shoulder Stabilization | SPADI |
| Post-op Lumbar Discectomy/Microdiscectomy | Oswestry Disability Index (ODI) |
| Post-op Achilles Tendon Repair | FAAM |
| Chronic Low Back Pain | Oswestry Disability Index (ODI) |
| Subacromial Impingement/Rotator Cuff Tendinopathy | SPADI |
| Ankle Sprain | FAAM |
| Cervical Radiculopathy | Neck Disability Index (NDI) |

All free/unlicensed, all standard in outpatient PT — chosen deliberately
over any licensed/proprietary alternative, same reasoning already
applied to FIM's rejection (§7 of the base doc).

**Deliberately not included this pass**: ACL-RSI (psychological
readiness — usually only relevant at RTS-prep phase, not every visit,
per §11.4's existing note on this), Tampa Scale of Kinesiophobia, and
FABQ (both risk overlapping with Screening's existing Yellow flags
rather than adding new signal). Still open items, not declined outright.

### 31.3 Scoring and content caveats

- Each accepted questionnaire renders its real item list (not a
  subtotal-only entry like Fugl-Meyer/Tinetti) with a live-computed
  score and a generic severity band (Minimal/Mild/Moderate/Severe
  limitation, by percentage of max) — **added to the clinician
  sign-off list** (base doc §18) alongside Precautions, AIS grading, and
  Fugl-Meyer bands.
- **Item wording is paraphrased for this mockup, not the exact
  copyrighted wording of the official instruments** — stated directly in
  the built UI. Most of these instruments are free for clinical use, but
  the item text itself is authored/copyrighted by the original
  developers; a real build should source the official wording rather
  than use these placeholders.
- **FAAM** built with its real two-subscale structure: ADL (required, 12
  items) + Sports (optional, 4 items, toggled in) — reported separately,
  not combined into one score, matching how the real instrument works.
- No schema change specified — same open-item status as the other
  scored instruments this session (§30.3/§30.4/§30.6): a real build
  needs its own field shape, not decided this session.

## 32. Facial Palsy, Vestibular, Cardiothoracic built (this session)

*New scope — these existed only as content descriptions in base doc
§8.3/§11.4 before this session (Facial Palsy's table already existed
but was dormant/unwired; Vestibular and Cardiothoracic had no frontend
at all). Corrects/extends base doc §8.3, §11.4, and §18 — full detail
below.*

### 32.1 Architecture — deliberately NOT inline in the note

Confirmed against §8.4's explicit statement that Group B (Facial Palsy,
Vestibular) and Cardiothoracic are **Patient-Profile-entry only**,
unchanged from the original design — unlike Group A, which got its own
note section this session (§30.1). Built in the mockup as a **visually
and architecturally separate area below the note**, labeled "Patient
Profile — Advanced Modules," specifically to avoid implying these render
inline in the Core Assessment note the way Group A does. This is a
mockup-file convenience (keeping everything reviewable in one file), not
a statement that the real build should put a Patient Profile screen's
content inside the note component.

### 32.2 Facial Palsy — frontend wiring for the existing dormant table

Per §8.3: table (`facial_palsy_assessments`) already exists, this
session only wires the frontend.

- **House-Brackmann Grade** — I–VI, each with its standard description
  surfacing on select (same pattern as Hoehn & Yahr, §30.6).
- **Sunnybrook Facial Grading** — built as three raw subscores only:
  Resting symmetry (3 regions: eye, cheek/nasolabial fold, mouth; −2 to
  +2 each), Voluntary movement (5 standard movements; 1–5 each),
  Synkinesis (same 5 movements; 0–3 each).
- **Deliberately no composite score computed.** The official Sunnybrook
  composite uses specific weighting coefficients across the three
  subscores; rather than assert coefficients that haven't been verified,
  the mockup shows the three subtotals only and states directly in the
  UI that a real build should reference the validated worksheet for the
  composite formula. This is a stricter caveat than the "flagged as
  simplified" treatment given to AIS/Fugl-Meyer (§30.3/§30.4), because
  those two had a verified/well-understood algorithm to simplify from,
  where here the composite math itself was the uncertain part — not
  worth guessing at.

### 32.3 Vestibular — new module, new table (per §8.3)

- **Dynamic Gait Index (DGI)** — chosen over FGA for this pass, per
  §7's earlier reasoning (Berg too long; the same "shorter, general-
  clinic-fit" logic extends here). 8 items, 0–3 each, total /24. When
  fully answered and total falls below the commonly-cited <19 fall-risk
  cutoff, a flagged amber note appears — explicitly stated as needing
  clinical confirmation, not treated as a validated threshold baked into
  the tool.
- **Dizziness Handicap Inventory (DHI)** — built as a **12-item
  paraphrased subset**, not the full 25-item official instrument (same
  "representative subset" scoping choice already used for FAAM's ADL
  subscale, base doc §11.4). No/Sometimes/Yes response scale (0/2/4,
  matching the real instrument's scoring convention). **Raw total only,
  no severity band** — the official mild/moderate/severe DHI bands
  assume all 25 items, so applying them to a 12-item subset would be a
  false-precision problem, not just an unverified-content problem; the
  UI states this directly rather than fabricating a proportional band.
- FGA parked, unchanged from §7's original note.

### 32.4 Cardiothoracic — new module, new table (per §11.4)

Built to the content spec already locked in base doc §11.4, with one
change: **6-Minute Walk Test's HR/SpO2/RPE fields are explicitly *not*
duplicated here** — the UI states they reuse Vitals & Measurements'
Core vitals/Sports context sub-blocks (§9), consistent with §11.4's own
"not duplicated" note that had never actually been enforced in a build
before now. Only distance is unique to this module.

- Auscultation: 6 lung fields (RUL/RML/RLL/LUL/Lingula/LLL) × 6 finding
  options (Normal/Crackles/Wheeze/Diminished/Absent/Rhonchi), reusing
  the same grade-row component as Group A's tools; heart sounds as a
  separate chip row.
- Chest wall: expansion (numeric) + shape observation chips.
- Cough: characteristics chips + sputum free text.
- 6MWT: distance only (see reuse note above).
- Dyspnea: Borg/modified Borg 0–10 scale.
- Peripheral edema: location chips + 1+–4+ grade.
- Peak flow: simple numeric.

### 32.5 No schema changes made

All three remain at mockup/field-content level — `facial_palsy_assessments`
already exists and needs no schema change per §8.3; `vestibular_assessments`
and `cardiothoracic_assessments` are still not-yet-created tables, same
dormant-instrument pattern (`responses jsonb` + computed columns) as
already specified in §8.3/§11.4/§19. This session locked field content
and UI behavior, not the schema itself.

---

## 33. Fascial Manipulation (FM — Stecco Method) Integration

### 33.1 Architectural Placement & Multi-Table Synchronization
Fascial Manipulation is incorporated as a dedicated specialty assessment module within the clinical note, architecturally integrated with Tier 1 core fields while maintaining clinical fidelity to Luigi Stecco's biomechanical model.

- **Unified Segment Assessment (`#fm-seg-table`):**
  - Columns: Segment, Side (Lt/Rt/Bil), Duration, Past Trauma, Pre-VRS (0–10), Painful Movements (auto-suggested from Aggravating Factors).
  - Adding a segment via `addFmSegment(date, segment)` creates synchronized rows across:
    1. Segment Assessment Table
    2. Palpation Verification (PV) Grid
    3. Movement Verification (Mo/Ve) Table
  - Real-time two-way synchronization: edits to segment name, side, or Pre-VRS instantly propagate across all three views via event delegation on `data-seg-id`.

### 33.2 Stecco FM Taxonomy & Segment Normalization
- Hip segment normalized strictly as **CX (Coxa)** (supersedes non-standard "CO").
- Caput has 3 sub-zones: CP1, CP2, CP3.
- Coccyx is assigned to PV (Pelvis).
- Taxonomy depth is scoped to the **Segment level** for primary assessment.
- Full 14-segment catalog:
  `CL` (Colum), `SC` (Scapula), `TH` (Thorax), `HU` (Humerus), `CU` (Cubitus), `CA` (Carpus), `DI` (Digiti Manus), `CX` (Coxa), `GE` (Genu), `TA` (Talus), `PE` (Pes), `PV` (Pelvis), `LU` (Lumbus), `CP` (Caput).

### 33.3 Palpation Verification (PV) Grid with Mode Toggle
- **Touch Ergonomics & Gesture Safety:**
  - Double-tap and long-press shortcuts removed to eliminate inadvertent data entry during rapid tactile evaluation on touchscreens/tablets.
  - Dedicated Segmented Mode Toggle: `[🔍 Palpation Mode]` vs. `[🛠 Treatment Mode]`.
- **Palpation Mode:**
  - Single tap cycles density grade: `Empty → 1 → 2 → 2+ → 3 → 3+ → Empty`.
  - Palette uses de-saturated, low-contrast pastel tones (`#FEF9C3`, `#FEF08A`, `#FDE68A`, `#FECACA`, `#FCA5A5`) with dark text for enhanced clinical legibility and reduced visual fatigue.
- **Treatment Mode:**
  - Single tap toggles treatment state (`data-treated="true"`).
  - Treated points are styled with a bold teal border (`box-shadow: inset 0 0 0 2.5px var(--clinical)`).
  - Elimination of checkmarks (`✓`) in treated cells to avoid clutter and preserve density readability.
- **Smart Density & Pattern Summary:**
  - Auto-computes highest density findings across planes and sides.
  - Pattern recognition: automatically detects fascial diagonals (e.g., "AN-ME diagonal (rt) — 2 segments") when ≥2 segments share the same plane.
  - Session statistics: tracks treated point count vs. untreated significant points (grade ≥2).

### 33.4 Movement Verification (Mo/Ve) & Hypothesis Sequence Builder
- **Mo/Ve Table:**
  - Pre-VRS automatically sourced from Segment Assessment.
  - Post-VRS clickable scale (0–10).
  - Real-time Δ change computation with directional delta indicators (green ▼ for improvement, red ▲ for aggravation).
- **Hypothesis Sequence Builder:**
  - Allows step-wise sequence construction: Step order, Plane, Segment, Side.
  - Auto-derives diagonal nomenclature based on plane consensus.

### 33.5 History Auto-Population Engine (`syncFmHistory`)
- Auto-syncs between Tier 1 History Cards and the FM History Table:
  - Past Surgery → Type: Surgery, auto-maps Region to FM Segment.
  - Past Injury / Trauma → Type: Trauma, auto-maps Region + Side.
  - Pain Episodes → Type: Pa Prev (Pain Previous).
  - Secondary Complaints → Type: Pa Conc (Pain Concomitant).
- Date formatting: formats standard `YYYY-MM-DD` inputs as compact `MMM YYYY` (e.g., `Jan 2024`) for History, and `DD/MM/YY` for the PV Grid to conserve horizontal space.

---

## 34. Mobile & iPad-First UX Overhaul

### 34.1 Dropdown-Free Chief Complaints Intake
Native vertical dropdowns (`<select>`) have been eliminated from the primary intake flow to prevent cumbersome vertical scrolling on iPads and mobile devices:
- **Anatomical Region:** Replaced with a wrapping chip grid (9 direct touch buttons). Single tap sets region, dispatches reactive updates to Objective ROM/MMT defaults, and triggers Aggravating Factors movement chip generation.
- **Hidden Input Compatibility:** A hidden `<input type="hidden" id="region">` preserves full backward compatibility with downstream event listeners.

### 34.2 Linear Onset Mechanism & Cascading Drill-Down Chips
- **Onset Engine ("How did this begin"):**
  - Flattened into a 4-way direct mechanism choice: `[Insidious (Gradual)]`, `[Sudden (Traumatic)]`, `[Post-Surgical]`, `[Flare-up]`.
  - Immediate Onset Timeline row: `[<1 wk]`, `[1-4 wks]`, `[1-3 mos]`, `[3-6 mos]`, `[6+ mos]`, `[Years]`.
- **Cascading Surgical Drill-Down:**
  - Selecting `[Post-Surgical]` reveals a two-tier horizontal chip hierarchy:
    1. Category row: `[Knee]`, `[Hip]`, `[Shoulder]`, `[Spine]`, `[Other]`.
    2. Sub-procedure row (e.g., Knee → `[ACL Reconstruction]`, `[TKR]`, `[Meniscectomy]`, `[Patellar Tendon Repair]`).
  - Replaces a 30-item vertical dropdown with two rapid thumb taps.

### 34.3 Layout & Structural Refinement
- **Consolidation of Context & Pain Profile:** The artificial "Context" boundary divider was dissolved. Primary Symptoms, Pain Severity (compact NRS 0–10 tap scale), Pain Pattern, and Aggravating/Easing factors are unified into a single coherent **"Symptoms & Triggers"** card.
- **Reveal Card Standardization:** Replaced high-contrast gradients and heavy left-borders with clean, subdued nested card containers (`var(--surface)` background with `1px solid var(--line)`), creating design parity across all conditional inputs.
- **Grid Stretching Fix:** Applied `justify-self: start` to `.segmented` toggle containers inside responsive grids (`.rc-grid`), preventing pill groups from stretching awkwardly across empty space.

---

## 35. Visceral Manipulation (VM), CST Foundations & Internal Dysfunctions

### 35.1 Manual Therapy Expansion
- Added `[Visceral Manipulation (VM)]` and `[Craniosacral Therapy (CST)]` modality chips to the Intervention section (Section 6) Manual Therapy panel.

### 35.2 Internal Dysfunctions Sub-Module
- Added an **Internal / Visceral Dysfunctions** card directly within Tier 1 *Medical Conditions*.
- Structured system-level chips: `[Digestive / GI]`, `[Gynaecological]`, `[Urological]`, `[Hepatic / Liver]`, `[Renal / Kidney]`, `[Endocrine]`.
- Narrative freetext detail box for visceral symptom descriptions, surgical adhesions, or visceral mobility restrictions.
- **Placement Rationale:** Sits alongside comorbidities during subjective intake where visceral restrictions impacting fascial lines or somatic pain patterns are naturally gathered.

---

## 36. Tier 1 Objective General Palpation & Design System Polish

### 36.1 General Palpation Elevated to Tier 1
- General Palpation is promoted to a **Tier 1 (always visible)** card in the Objective section (Section 4), distinct from the specialty FM PV grid.
- Captures:
  - Tenderness: Segmented toggle (`Localised` / `Diffuse` / `None`).
  - Tone: Segmented toggle (`Hypertonic` / `Normal` / `Hypotonic`).
  - Tissue Texture: Multi-select chips (`Thickened`, `Fibrotic`, `Oedematous`, `Normal / Supple`).
  - Specific palpation findings freetext.

### 36.2 Design System Tokens & Density Optimization
- **Component Footprint Reduction:**
  - `.chip`: Reduced padding (`5px 11px`) and font size (`12px`), saving ~40% vertical and horizontal whitespace.
  - `.segmented button`: Compact padding (`6px 12px`, `11.5px` font).
  - `.nrs-scale button`: Reduced from 32×32px to 26×26px (24×24px on mobile), preventing line breaks on narrow screens.
  - Card and field padding tightened systematically (`16px 18px` card padding, `14px` field margins).
- **CSS-Only Checkmarks:** Replaced ~200 inline SVG checkmark elements with CSS `::before` pseudo-elements on `.chip.selected`, stripping significant DOM weight and accelerating rendering performance.
- **Responsive Touch Breakpoints:**
  - Mobile (≤767px): Horizontal touch-scrolling with snap for segmented toggles; stacked grid inputs.
  - iPad (768–1024px): Balanced touch targets optimized for thumb interaction.
  - Desktop (≥1025px): Full sidebar layout with structured column grids.

