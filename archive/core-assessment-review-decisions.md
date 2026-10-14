# Thera.Net — Core Assessment / Clinical Note Structure Review
## Consolidated Decisions — Handoff Draft for Claude Code

*Compiled from a section-by-section review session, reconciling the live codebase
state (`clinicalnotestructure-2.md`, 2026-08-16), the open items list (§5a of that
doc), and the Track 1 proposal doc (`thera-net-track1-additions.md`). This
document is the single source of decisions from that review — where it disagrees
with either source doc, this document wins.*

*Scope note: Referral Source Refinement (Track 1, §2) is explicitly OUT of
scope for this review — that lives on `patients`/Ledger, not Core Assessment,
and has already been addressed there.*

*Status: Draft — architecture and decisions are locked; this has not yet been
scoped into implementation phases/PRs. That should happen before Claude Code
begins building.*

### Companion files (all four documents together form the full handoff)
1. **`core-assessment-review-decisions.md`** (this file) — structural
   decisions, field-by-field changes, cross-cutting patterns, architecture
2. **`condition-template-full-mapping.md`** — every locked condition
   template's full Objective field content (ROM/Strength/Joint mobility/
   Muscle length/Functional screening/Neurodynamics/Special Tests) plus
   HEP/Manual/Precautions/Education/PSFS suggestions
3. **`protocol-library-seed-content.md`** — actual phase-wise content
   (week ranges, WB status, ROM goals, precautions, HEP focus) for every
   post-op condition, and stage-based content for every non-op condition —
   the real seed data for `protocol_library` (§13.3/§19)
4. **`patient-facing-rehab-guides.md`** — architecture + 4 representative
   sample rewrites for the patient-facing version of Protocol Library
   content (§14) — most conditions still need this content written

---

## 0. Cross-Cutting Principles (apply across every section below)

### 0.1 Tappable-first input pattern
- Every multi-select → tappable chips, not dropdowns. Large tap targets, obvious
  selected state.
- Every boolean → segmented toggle, not checkbox.
- Every scored field (NRS, PSFS, MMT grades, dermatome/myotome/reflex levels) →
  tap-to-select scale (`ScaleWidget` or equivalent), not free number entry.
- Quick-pick presets before free text, not instead of it (existing
  session-duration quick-pick is the reference pattern).
- Repeatable rows get a fast "+ Add" that opens a minimal row, not a
  full-detail-required form.
- Free text reserved for genuinely narrative content chips can't capture.
- **Desktop/mouse parity**: same components work with click instead of tap.
  Add hover states, keyboard (tab + space/enter) selection, and cursor:pointer.
  Use the existing ≥768px breakpoint to tighten density on larger screens —
  same components, not separate desktop-only ones.

### 0.2 Tier 1 (always-present) vs. Tier 2 ("+"-addable) sections
Splitting the note into a fixed clinical spine (Tier 1) plus opt-in sections
(Tier 2) that a therapist explicitly adds, to avoid an intake wall that gets
skipped rather than engaged with.

**Tier 1 — always present, never absent from the note:**
Chief Complaint, History, Screening (red/yellow flags), Pain Profile,
Objective (ROM/MMT/Special tests), Treatment/HEP, Plan & Goals.

**Tier 2 — hidden by default, surfaced via a "+ Add section" affordance:**
Vitals & Measurements, Body Chart, Functional Status (PSFS), Gait & Posture,
Palpation, Neurological Screen (Level 1 general).

**Stickiness rule:** once a Tier 2 section is added to a patient's episode
(enrollment), it persists automatically across that episode's follow-up notes.
If a therapist later collapses/removes it, it stops appearing in future notes
too — re-addable via "+" at any time.

*This split is provisional — confirmed as reasonable for now, subject to
revision once real usage patterns are visible during/after build.*

### 0.3 Auto-applied, dismissible templates/modules

*Presentation corrected this session — see §0.3a below. Trigger logic
itself is unchanged.*

A single composition mechanism, driven by three independent classifiers
set early in Chief Complaint:

- **Anatomical Region** (+ Onset's surgery type, when post-surgical) — drives
  MSK/Ortho condition templates (e.g. Knee + TKR → "Post-op TKR" template).
  Templates affect **structure/visibility only** — auto-expand relevant
  sections, pre-focus likely HEP/Special-test picks — **never** clinical
  values (ROM degrees, weight-bearing % are never hardcoded).
- **Condition/Diagnosis classifier** (see §1 below) — drives which Advanced
  Module(s) surface (Neuro Group A/B, Cardio, future categories), independent
  of Region.
- **Primary Complaint chip (Weakness / Numbness-tingling) or Cervical
  Radiculopathy template match** — drives the minimal Neuro Screen
  suggestion (delta spec §14.2, corrects §8.1).

All three behave the same way: **auto-apply on match, shown as a
dismissible pill** ("Template: Post-op TKR ✕" / "Module: Stroke/TBI Neuro
✕" / "Neuro Screen (minimal) ✕"). No blocking confirmation prompt — low
risk to guess wrong, one tap to remove.

### 0.3a Suggestion presentation — consolidated panel (new this session)
*Corrects the implied presentation in §0.3 above, where each trigger's
pill was shown scattered inline near the field that triggered it (e.g.
the Condition classifier's pill rendered inside Chief Complaint's own
reveal block). That's replaced.*

All three trigger types now surface through **one consolidated panel —
"Suggested for this visit"** — rather than as separate pills scattered
across different fields. This panel sits at a single fixed position in
the note: **immediately after the Chief Complaint card, before the Safety
Checkpoint** (see §0.5 below for full ordering). As Chief Complaint fields
are filled in, any matching suggestions (Ortho/MSK template, Advanced
Module, minimal Neuro Screen) accumulate in this one panel — a therapist
sees everything the system inferred in one glance, rather than hunting
across the form for pills. Each entry is still individually dismissible
(no change to that mechanic) — only the *location* changed, not the
per-suggestion accept/dismiss behavior. **No change to trigger logic or
conditions** — this is a presentation/hierarchy fix only.

### 0.4 Live preview + tier-gated export
- **Live in-app preview** (read-friendly rendering of the note as filled so
  far) — free on every subscription tier, no export.
- **Print/Export PDF button**, inside that same preview screen, is the
  tier-gated action (per existing Lite/Solo/Clinic entitlement plan).

### 0.5 Note section ordering — corrected twice this session, final state below

*The section-by-section content below (§1 Chief Complaint, §2 History,
§3 Screening, §5 Pain Profile, etc.) is numbered by when each was
originally drafted, not by final on-screen order — reordering the doc
itself would be too disruptive to re-number wholesale. This table is the
single source of truth for actual note rendering order; field content for
each still lives under its originally-numbered section below.*

*Second correction this session: the previous version of this table (with
Safety Checkpoint at position 2, right after Chief Complaint) is
superseded. Reasoning: standard orthopedic/manual therapy examination
teaching (Maitland, McKenzie, the SOCRATES framework) places "Special
Questions" (= red-flag screening) at the END of the subjective exam, not
the start — red flags are interpreted against History context (e.g.
"unexplained weight loss" reads differently once cancer history is
already known), not asked context-free. Pain Profile is also folded into
Chief Complaint this round — SOCRATES treats severity/pattern/
exacerbating-relieving factors as core History-of-Present-Complaint
content, not a separate downstream section; splitting them out was making
Primary Complaint feel disconnected from its own severity/pattern data.*

| On-screen position | Section | Doc reference | What changed |
|---|---|---|---|
| 1 | Chief Complaint — **now includes Pain Profile's fields**, folded into the Context group | §1 (content) + §5 (folded in) | **Pain Profile absorbed, no longer a separate Tier 1 section** |
| — | **Suggested for this visit** (panel, not a Tier 1/2 section) | §0.3a | consolidates 3 trigger pills, sits right after Chief Complaint |
| 2 | History (surgeries/injuries, previous pain history, medical conditions, family history, medications & allergies, lifestyle) | §2 (minus Safety Flags item) | **moved from position 3 → 2** |
| 3 | **Safety Checkpoint** (Screening's Red/Yellow Flags **+ Safety Flags**, co-located) | §3 (content) + §2 item 5 (relocated) | **moved from position 2 → 3, now AFTER History, right before Objective** — matches "Special Questions at end of subjective exam" |
| 4 | Objective | §11 (content) | moved from 5 → 4 (numbering shift only, no content change) |
| 5 | Clinical Impression | §11a | moved from 6 → 5 (numbering shift only) |
| 6 | Intervention/Therapy | §12 | moved from 7 → 6 (numbering shift only) |
| 7 | Plan & Goals | §14 (content) | moved from 8 → 7 (numbering shift only) |

**Note total dropped from 8 sections to 7** — Pain Profile is no longer
counted separately; its content lives inside Chief Complaint now.

**Scoping note on the Safety Flags extraction** (unchanged from previous
correction): only the three fields originally grouped under "Safety
flags" in §2 item 5 (On blood thinner, Implants/pacemaker, Pregnancy
status) moved. **Medications and Allergies (§2 item 6) stay in History**
— they weren't part of the named "Safety flags" field group, even though
Allergies also feeds a safety banner (Taping caution, §2a).

**Safety Checkpoint section — merged presentation, not merged data
model**: Screening (Red/Yellow Flags) and Safety Flags remain distinct
field sets/schema, just presented under one heading with two sub-cards.
**Collapsed-by-default visibility is unchanged** — only sequence position
moved (twice now: position 3 → 2 → 3, net result is it ended up back
where it started numerically, but landed there for a different, better
reason — after History, not before — see the general-physio-assessment
framing this session vs. the earlier ER-triage framing).

---

## 1. Chief Complaint

### Final field order — **reordered this session**, corrects the order below

*Second correction to this section's field order. Original design led
with Region (structural/template-driving field first, narrative last).
Reordered per Prem's explicit direction: the form should read as a good
standalone assessment on its own clinical merits — regardless of whether
templates/auto-suggestions are on, since some physios prefer manual
assessment or run with templates disabled (delta spec §2's clinic
toggle). Order is no longer optimized around when auto-suggestions can
fire; it's optimized around natural intake logic. The auto-apply
mechanism (§0.3/§0.3a) still works exactly the same regardless of this
reorder — it evaluates on field change, not on visual position.*

**Complaint card** (Option B — visually merged, shared heading, not two boxed
sub-sections):
1. **Presenting problem** (free text) — **promoted to first field**,
   reframed from "optional — anything to add?" to the natural opening
   question of any assessment, template-driven or manual. No longer
   demoted below the chips.
2. **Anatomical region** — stays early (position 2, not last) — this is
   basic information any physio logs near the top regardless of
   templates; it also happens to scope everything downstream (surgery
   type list, region-filtered Neuro Screen, template matching), but that
   is not why it's positioned here now. **+ Laterality — relocated here
   this session** (Left / Right / Bilateral / N/A, segmented, paired
   side-by-side with Region). Was briefly placed under Primary Complaint
   last session to address it feeling disconnected — corrected: Laterality
   describes *where* the complaint is (a location property, same family
   as Region), not *what* the complaint is, so it belongs with Region.
3. **Recency/classifier row** — **label corrected this session**: was
   "What brings them in today?", duplicating Presenting Problem's framing
   word-for-word even though the two fields do different jobs (one is
   open narrative, one is categorical classification). Relabeled to
   **"How did this begin?"** with hint "classification — drives templates
   below." Options unchanged: *Recent surgery / Recent trauma / Known
   condition or diagnosis / Neither*
   - **Recent surgery** → inline reveal: surgery type, surgery date →
     auto-computed post-op week
   - **Recent trauma** → inline reveal: trauma date only (mechanism
     merged into Context group's single Mechanism field, see below)
   - **Known condition or diagnosis** → inline reveal: condition picker
     (see §1a below) **+ Onset timing quick-pick + Onset quality toggle**
   - **Neither** → inline reveal: **Onset timing quick-pick + Onset
     quality toggle**
   This classification remains clinically valuable on its own — a manual
   physio still wants to know post-surgical/traumatic/insidious status —
   independent of whether it also happens to power auto-suggestions.
4. **Primary complaint** (tappable chips: Pain, Stiffness, Weakness,
   Instability, Numbness/tingling, Swelling). Laterality was briefly
   placed here last session to fix Primary Complaint feeling
   disconnected — **relocated this session to field 2 (Region) instead**,
   see correction above. Laterality is a property of *where* the
   complaint is, not *what* it is — it belongs with Region, not the
   symptom-type chips.
5. **Secondary complaints** (repeatable, expanded previous session — see
   below)

**Context group** (visual break after the Complaint card):
6. **Onset — split into two derived, read-only fields** (previous
   session's correction). Originally one combined string conflated two
   different things: *when* and *what kind*. Now two labeled fields, both
   still fully derived/read-only, no new re-asking:
   - **Onset timeline** — pure time value: "Day 14" (surgery/trauma, from
     the actual date), or the duration bucket ("3–6 months ago") for
     Known condition/Neither
   - **Episode context** — classification + identifying detail + onset
     quality: "Post-surgical · TKR", "Traumatic · [mechanism]",
     "Condition-related · Stroke/TBI · Gradual", "Insidious · Gradual"
7. **Mechanism of injury** — single field (corrected two sessions ago).
   Lives in Context group, applies regardless of recency answer, feeds
   Episode context above when traumatic.
8. Episode pattern (First episode / Recurrent / Chronic ongoing /
   Post-surgical) — **RESOLVED, corrects the earlier "not resolved" note
   below (see delta spec §29 for full reasoning).** The redundancy with
   Recency's "Recent surgery" answer only actually fires when Recency =
   "Recent surgery" specifically (a tautology in that one case); the
   option stays valuable on its own for episodes tracing back to
   older/non-recent surgery (Recency = "Known condition," not "Recent
   surgery"). Fix: when Recency = "Recent surgery," Episode pattern
   auto-selects "Post-surgical" (same auto-default-but-editable pattern
   as Plan & Goals' recommended_phase) — therapist can still override.
   Option itself unchanged, still manually selectable regardless of
   Recency's answer. No schema change.
9. Trend (Improving / Stable / Worsening / Fluctuating) — considered
   hiding on first visit, declined, stays always visible.

**Pain Profile — folded into Context group this session** (was a
separate Tier 1 section, §5 below; that section is now empty/retired,
content lives here instead). Rationale: SOCRATES (Site, Onset, Character,
Radiation, Associated symptoms, Timing, Exacerbating/relieving, Severity)
— the framework most physio training is built on — treats severity,
pattern, and aggravating/easing factors as core History-of-Present-
Complaint elements, not a separate downstream section. Splitting them out
was making Primary Complaint (point 4 above) feel disconnected from its
own severity/pattern data. Positioned after Trend, before Occupation/
Activity:
- **Pain intensity (NRS 0–10)** — Current, Best (last 24h), Worst (last
  24h) — three separate tap-to-select 0–10 scales, per §0.1's rule
  (scored fields must be tap-to-select, not free entry). Full NRS
  granularity, not the lighter Mild/Moderate/Severe used for Secondary
  complaints — this is the primary complaint's own severity, the
  data other trend tracking (Outcome Tracking §15) reads from.
- **Pattern** — Constant / Intermittent / Occasional (segmented)
- **24-hour pattern** — when is it worst: Morning / Midday / Evening /
  Night / No clear pattern (chips)
- **Aggravating factors** / **Easing factors** (free text, two fields)
- **Sleep disturbed by pain?** — Yes/No (segmented) — explicitly distinct
  from History's general Sleep quality field (§2 item 7), unchanged
  distinction from original design
- **Data/schema note**: this is a UI/grouping change only — the
  underlying fields, their schema, and Outcome Tracking's consumption of
  NRS/pattern data (§15) are unaffected by where they're visually
  positioned in the note.
10. Occupation (grouped dropdown), activity/sport (grouped dropdown),
    specific demands. **"Job/role" field removed this session** — its
    clinical value (what the specific job entails physically) was fully
    subsumed by Occupation's category + Specific demands' free text;
    keeping it was redundant without adding information a physio could
    actually use, since anything a job title would suggest needs to be
    spelled out in Specific demands to be useful anyway.

**Secondary complaints — expanded previous session** (was a single
free-text repeatable row). Each secondary complaint is now a small
structured card:
- **Description** (free text, unchanged)
- **Onset** — lightweight duration quick-pick (<1 week / 1–4 weeks / 1–3
  months / 3–6 months / 6+ months / Years) — intentionally *not* the full
  recency-branch system used for the primary complaint; kept minimal so
  secondary complaints stay quick to log
- **Severity** — Mild / Moderate / Severe (categorical, not the full 0–10
  NRS now used for the primary complaint above — deliberately
  lighter-weight for a secondary item)
- **Relation to primary** — Same injury / Compensatory / Unrelated /
  Pre-existing
- **Aggravating factors** (free text) — scoped to *this specific*
  secondary complaint, distinct from the primary complaint's Aggravating/
  Easing factors now in the Context group above.

**Removed from Chief Complaint entirely:**
- "Prior surgery (yes/no + details)" — **moved to History**, see §2.
  (Originally considered as an inline flag here; relocated after review since
  Chief Complaint should describe the *current* episode only, not point
  backward into past history.)

### §1a. Condition/Diagnosis classifier — general Advanced-Module trigger

**Not Neuro-specific.** This is a general-purpose classifier that can route to
*any* Advanced Module — Neuro (Group A/B, §7 below), Cardio, or future
categories — parallel to (not replacing) the existing Region-driven Ortho/MSK
template path.

- Default: no condition selected → standard Ortho/MSK flow, Region drives
  templates as normal.
- If set, options are grouped: **Orthopedic/MSK (non-surgical)** —
  Chronic Low Back Pain, Subacromial Impingement/Rotator Cuff
  Tendinopathy, Ankle Sprain, Cervical Radiculopathy; **Neurological
  (Group A/B)** — Stroke/TBI, Paraplegia/SCI, Parkinson's, MS, Peripheral
  Neuropathy, Concussion, Vestibular, Facial Palsy; **Cardiopulmonary** —
  Cardiothoracic.
- **Ortho group — new this session.** Gives a therapist a direct,
  explicit way to confirm a non-op MVP condition rather than relying
  solely on the Region-based heuristic (which only guesses one likely
  condition per region — e.g. Cervical Spine always suggests Cervical
  Radiculopathy even though Mechanical Neck Pain or another non-MVP
  condition might be the real picture). Selecting an Ortho option here
  **overrides/confirms** the `ortho-template` suggestion directly
  (labeled "confirmed" rather than "MVP condition match" in the
  Suggested-for-this-visit panel), rather than routing through
  `advanced-module` like Neuro/Cardio picks do — it's not triggering an
  Advanced Module, it's directly stating the Ortho template. **Post-op
  conditions are deliberately not listed here** — those already have a
  more precise capture path (Recency = Recent surgery + Surgery type),
  and listing them again in this picker would create two competing
  sources of truth for the same information. This does not conflict with
  "no formal differential diagnosis section" above — that principle is
  about the app not *inferring/suggesting* a diagnosis on its own; a
  therapist *explicitly selecting* a condition they already know is
  self-declaration, the same mechanism already used for Neuro/Cardio.
- **Cardiothoracic — fixed this session**: the picker previously only
  listed neuro options despite this section explicitly stating "not
  Neuro-specific" — a real gap between the doc's stated intent and what
  was actually built. §11.4 already specified that Cardiothoracic gets
  added as its own classifier option (to trigger the Cardiothoracic
  Assessment module) — that was simply never implemented until now.
  Cardiothoracic is a single flat option (unlike Neuro's 8 specific
  conditions) since the module itself doesn't have Group-A-style
  condition-to-tool sub-mapping — matches the doc's existing
  architecture, not new scope.
- Selecting a condition auto-surfaces the relevant Advanced Module(s), same
  dismissible-pill pattern as Ortho templates (§0.3).
- **No formal "differential diagnosis" section** — deliberately avoided. The
  app does not infer or suggest a diagnosis. When a patient presents with an
  undiagnosed finding (e.g. unexplained weakness), the therapist runs the
  default Tier 2 General Neuro Screen (§7.1, trimmed) on their own clinical
  judgment, and manually "+"-adds any Group A tool the findings indicate
  (e.g. adds Coordination/Cerebellar after finding ataxia). System supports
  the workflow; does not diagnose.

### Open/parked items
- None remaining for this section — fully resolved this pass.

---

## 2. History

### Final structure, top to bottom

1. **"Any past surgeries?"** (yes/no) → **Yes** reveals Surgical history
   repeatable rows inline (date, procedure, outcome, complications,
   current status). **Scoped to past/non-index surgeries only** — the
   current/index surgery lives exclusively in Chief Complaint's recency
   flow (§1), never duplicated here.
   - **Current status options — differentiated this session** (were
     identical to Trauma history's options below, which read oddly for a
     surgical context — e.g. "Reinjured" doesn't really fit a surgery).
     Surgery-specific options: **Fully recovered / Ongoing management-PT
     / Complication or residual issue / Required revision surgery /
     Unknown**. "Required revision surgery" is a surgery-specific concept
     with no equivalent in the Trauma history list below.
2. **"Any past injuries?"** (yes/no) → **Yes** reveals Trauma history
   repeatable rows inline (date, body part, nature, treatment, sequelae, **+
   current status — added last session** for parity with Surgical
   history, which already had this field and Trauma history didn't).
   - **Current status options — differentiated this session**, own list,
     no longer sharing Surgical history's options above: **Fully resolved
     / Chronic-recurring issue / Reinjured / Unknown**. "Chronic-recurring
     issue" fits how non-surgical injuries are typically described
     (e.g. recurrent ankle sprains) in a way the surgical list doesn't.
3. **Previous pain history** (repeatable: **region — corrected this
   session, now a structured select reusing the same 9-region list Chief
   Complaint uses, was free text**; timeline onset/duration; **intensity —
   corrected this session, now Mild/Moderate/Severe select, was free text
   inconsistent with §0.1's tap-to-select rule**; treatment) — scoped to
   recurring pain *episodes*, with or without a discrete injury event
   (distinguishes it from Trauma history, which is the injury *event*
   itself).
4. **Medical conditions** (multi-select, 13 items) — **reordered this
   session** into loose clinical clusters (cardiopulmonary: Cardiac,
   Hypertension, Respiratory; metabolic/systemic: Diabetes, Thyroid
   disorder, Autoimmune; MSK-adjacent: Osteoporosis, Arthritis;
   neuro/hematologic/oncologic: Neurological, Seizure/epilepsy disorder,
   Blood disorder, Cancer; Mental health) — cosmetic only, same 13 items,
   same data model, just faster to scan:
   - **+ bulk "None of the above" clear action** (new — closes the gap where
     Medical Conditions had no bulk-clear while Red Flags already did;
     wording made consistent with Screening's equivalent action, see §3)
   - **Arthritis/Autoimmune overlap** (RA could be checked under either) —
     left **intentionally unresolved**, documented as a known limitation, not
     fixed this pass.
   - **Neurological breadth** (stroke/MS/Parkinson's/peripheral neuropathy
     all one checkbox) — left **intentionally unresolved** as a known
     limitation. Note: the new Neuro Advanced Module (§7) gives these
     conditions a proper structured home when selected via the Chief
     Complaint classifier (§1a) — this checkbox remains a coarse flag only.
5. **Family history — new this session**: repeatable (Relation: Parent/
   Sibling/Grandparent/Other; Condition: free text). Was not captured
   anywhere in the note previously — flagged as a gap during this
   session's History review, confirmed for addition.
6. **Safety flags — RELOCATED per §0.5 (previous session)**: moved out of
   History entirely, now co-located with Screening in the "Safety
   Checkpoint" (position 2 in the note, per §0.5's ordering table). Field
   content unchanged: On blood thinner (bool + details), Implants/
   pacemaker (bool + type/details), Pregnancy status (No/Yes/N/A) — still
   feed the safety banner, see §2a.
7. **Current medications, Allergies** (free text, unchanged — stays in
   History; not part of the Safety Flags relocation, see §0.5's scoping
   note)
7. **New lifestyle fields** (Track 1, confirmed placement here):
   - Smoking status (Never / Former / Current)
   - Alcohol use (None / Occasional / Regular)
   - Physical activity level (Sedentary / Light / Moderate / Active)
   - **Sleep quality — expanded this session.** Was Good/Disturbed/Poor
     (3-tier). Now: Good / Fair / Disturbed / Poor (4-tier) **+ Average
     hours per night** (<4h / 4–6h / 6–8h / 8h+, new — previously
     uncaptured entirely) **+ Difficulty type** (Falling asleep / Staying
     asleep / Early waking — chips, optional, shown when disturbed)
   - *Confirmed distinct from the (now Chief-Complaint-housed) Pain
     Profile's "Sleep disturbed by pain?" field (pain-driven sleep
     disruption specifically) — both kept, not merged; different clinical
     purpose. Cross-reference updated since Pain Profile moved — see §1
     and §5.*

### §2a. Safety banner — resolved and deferred items

- **Allergies → banner**: wired. Allergies free text now feeds a caution note
  whenever Taping is selected in Treatment (adhesive/latex relevance).
- **Vitals → banner**: architecture agreed — banner will react to abnormal
  vitals (elevated BP, fever, etc.) in addition to History flags. **Exact
  threshold values are not yet set** (flag as abnormal, thresholds TBD by
  clinical lead before build). **No banner triggers on absent/never-recorded
  vitals** — Vitals is Tier 2, so absence must never be conflated with a
  cleared/normal reading.
- **Blood-thinner boolean vs. free-text medications mismatch** (a therapist
  could enter an anticoagulant in Medications without toggling the boolean,
  and the banner only reads the boolean) — **left alone, documented as a
  known limitation**, no fix this pass.

### Open/parked items
- None remaining — fully resolved this pass, aside from the two items
  explicitly left as documented limitations above (by decision, not
  oversight).
- **RESOLVED (was "New, this session, not resolved")**: Chief Complaint's
  Episode pattern's "Post-surgical" option redundancy with the Recency
  row's "Recent surgery" answer — see §1 field 8 above and delta spec
  §29 for the resolution (auto-default on Recency = Recent surgery,
  option itself unchanged and still manually selectable otherwise).

---

## 3. Screening (Red/Yellow Flags) — built this session, "Safety Checkpoint," position 3

*Positioning note: this section's on-screen position moved twice this
session (position 3 → 2 → 3, see §0.5's ordering table for the full
history) — it now sits AFTER History, right before Objective. It also
co-locates with History's former Safety Flags item (§2 item 5, relocated)
under one "Safety Checkpoint" heading. This entry documents the actual
built content, replacing the earlier stub description.*

**Content, built this session:**
- **Red flags** (8 items, each a 3-state No/Yes/N-A control): Unexplained
  weight loss; Fever or night sweats; Bowel/bladder dysfunction; Saddle
  anesthesia; Progressive neurological deficit; History of cancer;
  Significant trauma (high-energy mechanism); Night pain unrelieved by
  rest or position change. **+ bulk "No red flags" clear action**
  (sets all 8 to "No" in one tap).
- **Yellow flags** (5 items, each a 4-state concern scale: None/Mild/
  Moderate/Significant): Fear-avoidance beliefs; Catastrophizing; Low
  mood indicators; Work/compensation dissatisfaction; Passive coping
  style.

**Smart collapse behavior — new this session, confirmed with Prem.** Not
just "collapsed until tapped open" — the collapsed *summary* itself is
state-aware:
- **Untouched**: neutral "Not yet screened" label, gray.
- **All 8 red flags answered, none positive**: collapses to a green "✓ No
  red flags noted" summary — confirms screening *was done* and was clean,
  distinct from simply never having been opened.
- **Any red flag marked "Yes"**: summary shows a red "N flagged" badge,
  and a **persistent callout listing the specific flagged item(s) by
  name stays visible even while the section is collapsed** — the
  therapist doesn't have to re-expand the full 8-item list to see what's
  clinically significant. Expanding the section also visually highlights
  the flagged row(s) (red background) against the unflagged rows, so
  signal doesn't get lost in the full checklist either.
- This is a middle ground between the two positions considered in the
  earlier critical-review pass (§ delta spec §14.1): "always fully
  expanded" was declined as excessive; "always collapsed, no
  differentiation" would bury a positive finding. This surfaces exactly
  what's flagged without forcing either extreme.
- Yellow flags are not part of this flagged-callout logic — they stay
  inside the expandable body only, per the standing decision that
  yellow-flag → banner integration is explicitly not pursued (unchanged
  from below).

**Still true, unchanged:**
- Tier 1 (always present), collapsed-by-default — **confirmed staying**
  after a second-pass critical review argued for always-expanded;
  declined, see delta spec §14.1. The smart-collapse behavior above is a
  refinement of *how* it's collapsed, not a reversal of *whether*.
- **Wording consistency**: bulk-clear language standardized across the note
  (Screening's "No red flags" and Medical Conditions' "None of the
  above" read as the same pattern)
- Yellow-flag → banner integration explicitly **not pursued** (psychosocial
  risk flags stay separate from the clinical-safety banner)
- **Safety Flags sub-card** (On blood thinner, Implants/pacemaker,
  Pregnancy status) — relocated from History §2 item 5, field content
  unchanged, still feeds the safety banner per §2a.

---

## 4. Body Chart

**No field changes**, one field removed:
- Tap-to-mark diagram (front/back/lateral), 4 mark types (pain/numbness/
  stiffness/referred) — unchanged, Tier 2
- **Confirmed fully independent of Anatomical Region** — no auto-focus/zoom
  tied to Region; therapist can mark anywhere (referred pain, secondary
  sites)
- **"Dominant side (L/R/bilateral)" field removed entirely** — not relocated,
  dropped from the note structure

---

## 5. Pain Profile — **RETIRED as a standalone Tier 1 section this session**

*Content folded into Chief Complaint's Context group — see §1 above for
the full field list (Pain intensity NRS, Pattern, 24-hour pattern,
Aggravating/Easing factors, Sleep disturbed by pain). This section header
is kept only so §1's "see §5" cross-references still resolve, and so this
isn't mistaken for silently deleted content — the fields are alive and
fully specified in §1, not dropped. No standalone "Pain Profile" note
section exists anymore; it is not a Tier 1 section in its own right.*

**Data/schema note**: field content, scoring, and behavior are unchanged
from the original design (NRS 0–10 tap-to-select, Pattern segmented,
24-hour pattern chips, Aggravating/Easing free text, Sleep disturbed
segmented) — this was a UI/grouping move, not a field redesign. Outcome
Tracking (§15) reads the same underlying NRS data regardless of where
it's visually positioned in the note.

---

## 6. Functional Status (PSFS)

**No changes. Full pass-through confirmed.**
- Up to 5 activities, baseline (locked on first save) + current scores,
  derived mean + MCID crossing count
- Tier 2, "+"-addable — baseline-locking behavior already matches the
  Tier 2 stickiness rule (§0.2): once added, persists across follow-ups,
  only "current" scores update each visit

---

## 6a. Sports Profile — new Tier 2 section, added this session

*New "+"-addable section, sport-related injuries/conditions only.
Auto-surfaces (not just listed in a menu) when Chief Complaint's
Activity/sport field is set to a real sport (i.e. not blank, not
"None / not active") — hideable via a "Hide" action on the section
header, matching the Collapse/Hide pattern from delta spec §9. Unlike
the other Tier 2 items in this doc (Vitals, Body Chart, PSFS, Gait,
Palpation), this one was actually built as a functional section in the
mockup rather than left as an outline stub, since it was explicitly
requested rather than inferred as a gap.*

**Rationale**: scattered sports-relevant content already existed
(Chief Complaint's Activity/sport field, Vitals' "Sports context"
sub-block with resting/target HR and RPE, Return to Sport / Melbourne ACL
modules) but nothing consolidated the sport-specific *intake* context
that matters for planning — level of competition, training phase and
load, upcoming competition — the kind of content that materially affects
treatment prioritization for a competitive/elite athlete specifically,
directly serving the "acceptable to elite-level physiotherapists" bar.

**Fields:**
- **Sport** — read-only, pulled from Chief Complaint's Activity/sport
  field. Not re-asked, consistent with the "connect, don't duplicate"
  pattern established this session (Clinical Impression's cross-reference
  strip, Onset's derived fields).
- **Position / role** — free text (e.g. "Fast bowler," "Point guard")
- **Level of competition** — Recreational / Club / Collegiate / Elite-
  National / Professional (select)
- **Training phase** — Off-season / Pre-season / In-season / Post-season
  (segmented)
- **Training load** — sessions/week + hours/week (two number fields)
- **Upcoming competition/event** — free text
- **Return-to-sport goal** — free text

**Suggestion panel integration**: appearing/hiding also sets/clears a
4th entry in the "Suggested for this visit" panel (§0.3a) — labeled
"Added: Sports Profile" rather than the pill-only pattern the other 3
triggers use, since this one actually shows/hides a real section rather
than just indicating intent.

**Not built**: mechanism-of-injury duplication was deliberately avoided
— sport-specific injury mechanism already lives in Chief Complaint's
Mechanism of injury field, not re-asked here. Sport-specific injury
history (e.g. "3rd ACL tear this career") isn't separately captured
either — History's Past injuries repeatable rows already cover this
generally; a sport-specific filter/tag on those wasn't built, flagged as
a possible follow-on if it turns out to matter.

---

### Gait (multi-select, tappable chips)
**Existing:** Normal, Limping/Antalgic, Trendelenburg, Ataxic, Wide-based,
Shuffling, Circumduction
**Added — neurological gait patterns:**
- Foot drop / Steppage
- Festinating (Parkinsonian)
- Scissoring (spastic diplegia pattern)
- Waddling (myopathic pattern)
- Hemiplegic (distinct from generic Circumduction)

### Assistive device — expanded from a flat field into two structured fields
- **Device type** (single-select, tappable chips): None, Cane (single-point),
  Cane (quad/multi-point), Crutches (single), Crutches (bilateral), Walker
  (standard), Walker (rollator/wheeled), Wheelchair (manual), Wheelchair
  (powered), Other (free text)
- **Dependency level** (single-select, 3-tier, scoped to gait/mobility with
  the device specifically — not a general ADL/transfer-independence field):
  Independent / Partial assist / Full assist

### Posture (multi-select, tappable chips) — **unchanged**
Normal, Forward head, Rounded shoulders, Increased kyphosis/lordosis,
Scoliosis, Pelvic tilt ant/post, Shoulder asymmetry, Genu valgum/varum, +
notes

### New — functional/dynamic quick-capture fields (simple, no new architecture)
- **Timed Up and Go (TUG)** — single number, seconds
- **Gait speed / 10-Meter Walk** — single number or short descriptor

### New — Tinetti POMA questionnaire (separate "+"-addable module)
- Gait + Balance subscales, combined score — chosen over Berg Balance Scale
  (too long, 14 items/15–20 min vs. Tinetti's ~10 min) for a general-clinic
  fit; chosen over building TUG as part of a scored instrument (TUG stays a
  simple standalone field above, not folded into Tinetti)
- Same architecture as the five existing dormant instrument tables: own
  table, raw item-level answers (JSONB) + computed score column
- **Only the score/result appears in note preview/print/PDF** — full
  item-by-item breakdown does not surface there
- DGI/FGA (Dynamic Gait Index / Functional Gait Assessment) — **not** added
  here; parked for the Vestibular module instead (§8, Group B)

### Falls-risk trigger (belongs conceptually here, lives in Vitals — see §9)
- **Age-based only** (default threshold 65, clinic-configurable) — confirmed,
  not combined with an abnormal-gait-finding trigger. An abnormal Gait
  finding recorded here does **not** itself surface the falls-risk block.

### FIM — considered and explicitly rejected
- Proprietary/licensed instrument (UDSMR), requires per-facility license +
  certified-training to score correctly; primarily an inpatient-rehab
  instrument (admission-vs-discharge design), better fit for the parked
  "Inpatient rehabilitation software" roadmap item if that product ever
  becomes real, than for outpatient Core Assessment. **Skipped.**

**Tier: 2** ("+"-addable, sticks once added to episode)

---

## 8. Neurological Assessment (restructured — was flat "Neurological Screen")

### 8.1 Level 1 — General Neuro Screen — **partially reinstated, corrected per delta spec §14.2**

*Second correction to this section — first removed entirely per delta
spec §1, now partially reinstated per delta spec §14.2 following a
second-pass critical review. Read both corrections; this note reflects
the current, final state.*

A **narrow, ungated Tier 2 section** exists on all subscription tiers
(not gated behind Group A/Clinic tier): myotomes, dermatomes, reflexes
only — same region-filtering as originally designed (below), same
tap-to-grade pattern as every other scored field in the app. **UMN signs,
coordination/cerebellar testing, and cognitive screen stay Group-A-only**
— that's what keeps this "minimal," not a full reversion to the original
Level 1's scope (which also had a "Mark all WNL" bulk action and full UMN
signs section — those are not part of the reinstated version).

**Trigger — new, not present in either prior version**: this section is
not just a static "+ Add" Tier 2 item — it's **auto-suggested** via the
same dismissible-pill mechanism used for condition templates (§0.3), when
either the Chief Complaint Primary Complaint chip **Weakness** or
**Numbness/tingling** is selected, or the matched condition template is
**Cervical Radiculopathy**. Manual "+ Add" still works regardless of
trigger.

**Region-filtered display** (same principle as the existing spine ROM
preset table):
- Region = Cervical/Shoulder → default-show C5–T1 dermatomes/myotomes,
  Biceps/Triceps/Brachioradialis reflexes only
- Region = Lumbar/Hip/Knee/Ankle → default-show L2–S2 dermatomes/myotomes,
  Patellar/Achilles reflexes only
- Region = non-spinal (Elbow, Wrist/Hand) → lighter default set, or none
- **"Show all levels" toggle** always available to override

**Resolves the accepted MVP limitation**: Cervical Radiculopathy (an
MVP-locked condition template) now has an ungated home for myotome
grading again — see the corrected entry in
`condition-template-full-mapping.md`.

**No new schema** — reuses the same three field shapes the original
Level 1 design had; no new table (distinct from Group A's dedicated
`neuro_spinal_assessments` table).

### 8.2 Level 2 — Group A: Brain/Spinal Shared Toolkit (new — Advanced Module)

Auto-surfaced via the Chief Complaint condition classifier (§1a); also
manually "+"-addable by a therapist screening on their own suspicion (§1a,
"no formal differential diagnosis section" note).

**New table: `neuro_spinal_assessments`**
```
id                uuid PK
clinic_id         uuid FK
patient_id        uuid FK
enrollment_id     uuid FK -> patient_module_enrollments, nullable
conditions        text[]   -- which condition(s) selected/apply
responses         jsonb    -- raw answers, keyed by tool id
computed          jsonb    -- per-tool computed scores/summaries
status            text     -- draft | completed
created_by, updated_by  uuid
updated_at        timestamptz
```
Same shape as the five existing dormant instrument tables (§7 of the
note-structure doc): raw JSONB + computed scalar summary, no new
architectural pattern.

**Shared tool registry** (new: `src/domain/instruments/neuroSpinalTools.ts`
— the directory the note-structure doc already flags as planned-but-absent):

*Registry corrected per delta spec §1: dermatomes and reflexes are no
longer separate tools — since Level 1 is removed, they're **base fields
within the Group A section itself** (region-filtered per §8.1 above), not
reusable/duplicated tool entries. Registry is now 10 tools (was 8 after
delta spec §1's cut, 9 after §30.4 added `fugl_meyer`) — **corrected
again per delta spec §30.6**: `hoehn_yahr` added (Parkinson's only), and
`asia_composite` as originally described here is **superseded for
Paraplegia/SCI** by a full ISNCSCI worksheet — see the note below the
table.*

| Tool id | Captures |
|---|---|
| `tone_spasticity` | Modified Ashworth Scale, per limb/segment |
| `motor_umn` | UMN-pattern motor grading (distinct from nerve-root MMT) |
| `fugl_meyer` | **New, delta spec §30.4.** Motor recovery scoring (UE /66, LE /34 subtotals — not full item-level), Stroke/TBI only |
| `hoehn_yahr` | **New, delta spec §30.6.** Modified 8-point staging scale (0, 1, 1.5, 2, 2.5, 3, 4, 5) with standard stage descriptions, Parkinson's only |
| `sensory_peripheral` | Monofilament/vibration, glove-stocking pattern |
| `coordination_cerebellar` | Finger-to-nose, heel-to-shin, rapid alternating movements |
| `cognitive_screen_light` | Brief orientation/attention check, not a full battery |
| `symptom_checklist_concussion` | Concussion-specific + graded return-to-activity |
| `fatigue_relapse_ms` | MS-specific pattern tracking |
| `asia_composite` | ~~Computed roll-up from the base dermatome fields + `motor_umn`~~ — **superseded by delta spec §30.3**: Paraplegia/SCI now gets a full ISNCSCI worksheet (28-level bilateral sensory + 10 key-muscle motor + VAC/DAP) with live-computed sensory/motor levels, single NLI, and actual AIS A–E grading, not a derived roll-up of the generic base fields |

*(Dermatomes and reflexes are referenced directly as Group A base fields
for every condition except Paraplegia/SCI, which uses the full ISNCSCI
worksheet's own sensory grid instead — not as a tool lookup.)*

**Condition → tool mapping** (config data, not per-condition field
duplication — selecting multiple conditions shows the union of their tools):

| Condition | Tools shown |
|---|---|
| Stroke/TBI | tone_spasticity, motor_umn, **fugl_meyer (new, delta spec §30.4)**, reflexes, coordination_cerebellar, cognitive_screen_light |
| Paraplegia/SCI | **full ISNCSCI worksheet (delta spec §30.3) + supplementary reflexes** — supersedes the earlier sensory_dermatomal/motor_umn/reflexes/asia_composite(derived) row |
| Parkinson's | coordination_cerebellar, tone_spasticity (rigidity), **hoehn_yahr (new, delta spec §30.6)** — pairs with Gait's Festinating tag |
| MS | coordination_cerebellar, fatigue_relapse_ms, sensory_dermatomal |
| Peripheral Neuropathy | sensory_peripheral |
| Concussion | symptom_checklist_concussion, cognitive_screen_light |

**Considered and declined this session (delta spec §30.4)**: Modified
Rankin Scale, Postural Assessment Scale for Stroke/trunk-control tool —
neither chosen for Stroke/TBI this pass, can revisit later.

**Considered, not chosen this pass (delta spec §30.6, follow-up
session)**: EDSS for MS, DN4 neuropathic pain screen for Peripheral
Neuropathy, upgrading the Concussion symptom checklist to 0–6 graded
severity — none declined outright, just not picked this round.

**✅ RESOLVED — open fork closed by removing Level 1.** The original fork
(whether Group A reuses Level 1's dermatome/reflex values or starts blank)
no longer applies: Level 1 is removed entirely, so there's only one place
these values live — inside Group A itself. No duplication, no reuse
question. See delta spec §1 and §8.1 above.

**Explicitly considered and rejected for Group A:**
- **FIM** — same reasoning as §7's rejection (licensing, inpatient-rehab fit)
- **DGI/FGA** — routed to Vestibular (Group B) instead, not Group A
- **Berg Balance Scale** — routed to Gait & Posture's Tinetti choice instead
  (§7), not part of Group A

### 8.3 Level 2 — Group B: Self-contained specialty modules

Distinct format, no shared tools with Group A — each its own module.

- **Facial Palsy** — table already exists (`facial_palsy_assessments`),
  currently dormant per the note-structure doc §7. **No schema change
  needed** — just needs frontend wiring (House-Brackmann grade, Sunnybrook
  score, synkinesis). **Frontend built this session, delta spec §32.2**:
  House-Brackmann I–VI with stage descriptions, and Sunnybrook's three
  subscores (Resting symmetry, Voluntary movement, Synkinesis) —
  **deliberately no composite score computed**, since the official
  weighting formula wasn't verified confidently enough to assert; a real
  build should reference the validated worksheet for that calculation.
- **Vestibular** (new) — new table `vestibular_assessments`, same shape as
  the dormant instrument pattern (`responses jsonb`, `computed_score
  numeric`, `category text`). Covers DGI/FGA (parked here from the Gait
  discussion) + Dizziness Handicap Inventory. **Frontend built this
  session, delta spec §32.3**: DGI (8 items, /24, with a flagged
  fall-risk note below the commonly-cited <19 cutoff) + DHI as a
  12-item paraphrased subset (raw score only, no severity band — the
  official bands assume all 25 items). FGA still parked, unchanged.

### 8.4 Fit with existing entitlement/module architecture
- Both Group A and Group B modules are **Advanced Modules** under the
  **Clinic** subscription tier, gated through the same three-tier chain
  already live for the other five dormant instruments: `clinic_entitlements`
  → `clinic_module_settings` → `patient_module_enrollments`.
- **Must use proper, constrained `module_key` values.** This ties directly
  to the already-queued mandatory fix: `module_key` is currently
  unconstrained free text (the `modules` table it referenced was dropped
  with CASCADE). **That fix must land before these new modules get keys
  assigned — sequencing dependency, not just a nice-to-have.**
- **Trigger/entry point — CORRECTED per delta spec §1**: originally
  specified as Patient-Profile-only, matching the other five dormant
  instruments. **This is superseded for Group A specifically** — Group A
  now appears as a **note section** (inline in Core Assessment), not a
  separate module tab, with three activation paths: (1) Chief Complaint
  classifier auto-suggests a dismissible pill → accepted → section
  appears; (2) therapist manually hits "+" in the note → "Neuro Assessment
  (Group A)"; (3) added via Patient Profile module enrollment → then
  auto-appears in all notes for that episode. Live/master data still lives
  in `neuro_spinal_assessments` (episode-level, one row per episode); each
  note save snapshots the current Group A state into that note's
  `assessmentPayload` as a read-only reference, with prior values shown
  for comparison and editable for today's update. Group B (Facial Palsy,
  Vestibular) and Cardiothoracic are **unchanged** — still Patient-Profile
  entry only, per the original design.
- **MSK Objective collapse — new, delta spec §30.2.** When a Group A
  condition is active in the note, the base Objective content (ROM/
  Strength-MMT/Joint mobility/Muscle length/Functional screening/
  Neurodynamics/Special Tests) collapses to a summary banner with a
  "Show anyway" action — reversible, nothing entered is cleared, and the
  auto-collapse stops re-triggering once manually overridden for that
  visit. Not previously specified anywhere in this document; confirmed
  with Prem this session because the base Objective structure isn't the
  relevant exam shape once a Group A condition is active.

### Explicitly considered, not built as separate modules
- Nerve entrapment tests (carpal tunnel, cubital tunnel, thoracic outlet) —
  these stay as individual entries in the existing Objective → Special Tests
  section (Phalen's/Tinel's etc.), not a dedicated module.
- Pediatric neuro (GMFCS/Cerebral Palsy) — not addressed this pass, no
  pediatric population confirmed yet.

**Tier: 8.1 (Level 1) is Tier 2, "+"-addable. 8.2/8.3 (Group A/B) are
Advanced Modules, gated separately from the Tier 1/Tier 2 note-section
model — they're patient-level module enrollments, not note sections.**

---

## 9. Vitals & Measurements (renamed from "General Health & Triage")

### Renamed
"General Health & Triage" → **"Vitals & Measurements"** — old name's
"Triage" implied emergency-sorting that isn't what this section does; new
name is literal and unambiguous.

### Structure
**Always-visible** (unchanged): Weight (kg), Height (cm), Waist (cm) →
derived read-only BMI, waist:height ratio.

**Tier 2, "+"-addable sub-blocks** (previously reserved-but-unwired fields
in the type — this wires them up):
- **Core vitals**: BP, Pulse/HR, **Temp (new, Track 1)**, RR, SpO2
- **Sports context**: resting HR vs. target HR zones, optional post-session
  RPE (Borg scale)
- **Falls-risk block**: activates via **age threshold only** (default 65,
  clinic-configurable) — confirmed not combined with any in-note signal
  (abnormal gait, fall-history mention) as a secondary trigger, at least for
  this pass

### Explicitly decided
- **No Outcome Tracking trend for vitals** — unlike NRS/PSFS, vitals do not
  get a trend/comparison view. Point-in-time capture only.
- **Banner logic**: flags only actual abnormal readings; **never flags
  absence** of a reading (Vitals is Tier 2 — not filled in ≠ cleared/normal).
  Exact threshold numbers (e.g. what counts as "elevated BP") are **not
  pinned down in this review** — flagged as "TBD by clinical lead" before
  build.
- **Post-surgical SpO2/temp trend** ties into the existing post-surgical
  load-management block in Treatment — from Track 1, not re-litigated this
  pass, carried forward as proposed.

**Tier: 2, "+"-addable, sub-blocks addable independently of each other**
(a clinic that never sees sports patients need not surface RPE/target-HR at
all — same "+" mechanism, finer granularity).

---

## 10. Palpation

**No changes. Full pass-through confirmed.**
- Repeatable rows: region, findings (multi-select: Tenderness, Muscle spasm,
  Trigger points, Swelling, Warmth, Crepitus), pain-on-palpation level, notes
- **Tier: 2** ("+"-addable — confirmed this pass; was previously unassigned)

---

## 11. Objective — full expansion (was previously "not reviewed")

*This section is now fully specced — see condition-template-full-mapping.md
for the complete per-condition table (ROM/Strength/Special Tests/HEP/Manual/
Precautions/Education/PSFS across every locked condition). This section
covers the base structural additions to Objective itself.*

### 11.0 Objective — built this session

**Region-driven ROM/Strength suggestion, mockup-scoped.** Per §11's
"never hardcode clinical values" rule: selecting a Region in Chief
Complaint auto-suggests which **movements** (ROM) and **muscle groups**
(Strength/MMT) to show as rows — structure only, the actual degree/grade
values stay blank for the therapist to fill in. Config built for all 9
regions; the 6 that are part of the 10 MVP condition templates (Cervical
Spine, Lumbar Spine, Shoulder, Hip, Knee, Ankle/Foot) have fuller,
condition-informed movement/muscle lists pulled from
`condition-template-full-mapping.md`; Thoracic Spine, Elbow, Wrist/Hand
have lighter generic sets since they're not part of MVP scope. Rows are
individually removable and a "+ Add" link allows any extra movement/
muscle group beyond the suggested set — suggestions never block manual
entry.

**Bilateral comparison — corrected twice this session, final design
below.** ROM and Strength/MMT rows show side-labeled columns based on
**Region alone**, not Laterality:
- **Spine regions (Cervical/Thoracic/Lumbar) → single unlabeled column.**
  Side is already encoded in the movement name itself (e.g. "Rotation
  (L)" / "Rotation (R)" are already separate ROM rows).
- **Every other region → always both L and R columns, unconditionally.**
  Confirmed with Prem: comparing to the contralateral/uninvolved side is
  standard practice for symmetry assessment regardless of which side the
  complaint is on — the *complaint* being one-sided doesn't mean the
  *measurement* should be. This no longer depends on the Laterality
  field's value at all.
- **Laterality switching no longer rebuilds rows — corrects the first
  version of this fix**, which regenerated rows on every Laterality
  change and cleared entered values (flagged as a known limitation,
  since resolved rather than left open). Row structure now only depends
  on Region (which legitimately needs a rebuild, since the movement/
  muscle list itself changes).
- **Laterality now drives a visual highlight instead** — see below.

**Affected-side highlight — new this session.** Since Laterality no
longer changes row structure, it's used for something more useful:
whichever side matches the current Laterality selection (Left/Right, or
both if Bilateral) gets a subtle amber highlight (tinted background +
left accent bar) on its column, so the clinically relevant side is
visually distinguishable from the comparison/reference side without
hiding either. N/A or unset Laterality → no highlight, both columns
read neutrally. This reuses the amber attention color already defined in
the design tokens (distinct from red, which stays reserved for
Screening's flagged safety items) — an emphasis cue, not an alert.

**Component choices, confirmed this session:**
- **ROM** — plain numeric degree inputs (Active + Passive **per side
  shown**), not a tap-scale. Explicitly not treated as a §0.1 "scored
  field" — ROM is continuous (0–140°+), a tap-scale would need 140+
  buttons, which isn't a real application of the tappable-first
  principle. Numeric entry is the correct pattern here, same reasoning
  that already applied to Vitals' BP/HR fields elsewhere in the note.
  **+ End-feel and Pain-during-movement — added this session, confirmed
  with Prem.** Two genuinely new fields, flagged before adding rather
  than assumed:
  - **End-feel** — select per side: Capsular / Bony / Springy block /
    Empty (pain) / Muscular. Core orthopedic manual therapy content
    (Cyriax, Maitland) that was entirely absent before — end-feel quality
    is often what actually differentiates a capsular pattern from a
    mechanical block, not just the degree number.
  - **Pain during movement** — a toggle per side; when active, reveals a
    free-text note for where in range (e.g. "painful arc 60–120°").
    Addresses a real content gap: `condition-template-full-mapping.md`'s
    Shoulder ROM entry explicitly says "note painful arc" for Subacromial
    Impingement, but there was previously no structured field for that
    note to live in.
  - Both are per-side (inside the same side-block used for Active/
    Passive), so they follow the same L/R + affected-side-highlight
    behavior as the rest of ROM.
- **Strength/MMT — number (0–5) + separate +/− modifier buttons,
  simplified from the first correction's 12-button row.** Tapping a base
  number (0–5) selects the grade; tapping + or − appends a modifier,
  combining to the full MRC convention (0, 1, 2-, 2, 2+, 3-, 3, 3+, 4-,
  4, 4+, 5) without needing 12 buttons visible at once — 8 total (6
  numbers + 2 modifiers), reads more like a real chart. Per standard MRC
  grading, **0/1/5 don't take modifiers** — the modifier buttons
  auto-disable when one of those is selected, since "5+" or "1-" aren't
  meaningful gradations. Modifiers concentrate where real strength-
  deficit variation during rehab actually shows up (grades 2–4), which a
  flat 0–5 scale couldn't capture. **Bilateral rows stack two full
  number+modifier widgets** (Left row, Right row) rather than combining
  into one crowded line. HHD stays out of scope here per the existing
  rule (§11.4) — reserved for RTS/Melbourne testing specifically.
- **Joint mobility — separated local grading from systemic hypermobility,
  corrects the earlier assumption.** Was Hypomobile/Normal/Hypermobile —
  **corrected to Maitland Grade I–IV**, resolving a real clinical
  ambiguity flagged this session: the word "Hypermobile" on a per-joint
  accessory-motion field reads like it's screening for systemic
  hypermobility syndromes (EDS, JHS/hEDS — a completely different,
  multi-joint diagnostic category), when it was only ever meant to
  describe local accessory motion at the one joint being tested. Grade
  I–IV is unambiguous and carries no such conflation risk. **Systemic
  hypermobility now has its own separate, explicit home**: a new
  "Hypermobility syndrome (EDS/JHS)" chip added to History's Medical
  Conditions (§2 item 4) — a patient-level flag, not a per-joint grade,
  correctly separated from local Objective findings. Side-aware, reuses
  the same side-block/affected-highlight mechanism built for ROM/MMT —
  same rules apply (spine = single column, everything else = both L/R).
- **Muscle length — also side-aware**, same mechanism as Joint mobility.
  WNL/Mildly tight/Very tight tap-scale, per row.
- **Functional screening — region-suggested**, lighter-weight than ROM/
  MMT/Special Tests: a short default list per region (e.g. Single-leg
  squat quality for Knee, Squat pattern + Hip hinge quality for Lumbar
  Spine). Intentionally **not** side-aware — functional screening's
  movement names typically already encode side when relevant.
- **Neurodynamics** — reuses the same multi-field repeatable-card
  component already built for History's surgical/trauma/pain-history
  rows (Test/Response type/Provoking range/Sensitizing maneuver/Notes) —
  confirms the doc's own note that this needs to be a genuinely
  structured block, not a flat Special Test row (§11.2). **Test dropdown
  filtered by Region** — a Knee assessment no longer shows cervical ULTT
  variants; only the region-relevant subset shows (e.g. Lumbar Spine →
  SLR/Crossed SLR/Slump/Femoral nerve tension).
- **Special Tests — region-suggested**, corrects the earlier explicit
  scope-out. Region-level aggregation from `condition-template-full-mapping.md`
  (e.g. Knee → McMurray's/Lachman's/Anterior drawer/Valgus/Varus stress).
  Region-level, not full per-condition granularity — that finer wiring
  is still a Claude Code task.

### 11.0a Smart-add — replaces prompt()/plain-text entry across all 6 fields, added this session

*Two related gaps raised together: (1) once a region-suggested row was
removed, the only way back was switching Region away and back — which
regenerates the entire suggested set and risks losing anything else
already entered; (2) manually adding an item beyond the suggested set
used a bare browser `prompt()` dialog or a free-text box with no
reference list, undermining the standardized terminology a region-level
config already existed for. Both are fixed by the same mechanism.*

**How it works**: each of ROM, Strength/MMT, Joint mobility, Muscle
length, Functional screening, and Special Tests gets a **"+ Add…"
dropdown** (a native `<select>`, not a button) instead of a plain add
link. Its options are computed live from that field's region-config list
(the same lists already driving auto-suggestion) **minus whatever's
currently on screen** — so:
- A row removed from the suggested set **reappears in the dropdown
  immediately**, one tap to restore exactly what was dismissed — no
  region round-trip, no risk to other entered data.
- Anything from the region's known reference vocabulary that *wasn't*
  auto-suggested is still browsable and addable from the same dropdown —
  reduces free-text typos and keeps terminology consistent, which matters
  for research-grade documentation.
- A **"✏️ Custom…"** option stays at the bottom of every dropdown as an
  escape hatch for anything genuinely not in the reference list (still
  uses a prompt() for that one case only — acceptable, since it's the
  deliberate fallback, not the default path).
- Joint mobility and Muscle length **do not auto-populate default rows**
  (unchanged design choice, "blank where not typically indicated" per
  the mapping doc) — but their dropdown's *option list* is still
  region-driven via new `jointMobilityConfig`/`muscleLengthConfig` lookup
  tables, so manual adds are just as guided as the auto-suggested fields.
- Neurodynamics keeps its own "+ Add" button (not a dropdown) since it
  opens a multi-field card, not a single named item — no change there
  beyond the region-filtered Test dropdown noted above.

**Data model note**: this is entirely a mockup-side UI mechanism (active-
name tracking in the browser session) — no schema implication. The real
build's equivalent would likely be a searchable combobox reading from
`exercise_library`-style reference tables (deferred to post-MVP per delta
spec §5) or a simple static reference list per field, whichever Claude
Code finds more natural given the actual data layer.

### 11.0b Multi-region assessment — "+ Assess another region", added this session

*Objective was single-region by construction — every builder function
keyed off the one Region selected in Chief Complaint. This adds genuine
multi-region capability without touching that existing, working
single-region path (no regression risk to what was already solid).*

**Trigger**: a "+ Assess another region…" select sits at the top of
Objective, above ROM. Picking a region appends a **self-contained
secondary region block** below Special Tests, with its own heading
("[Region] (secondary region)") and a remove-block button. Picking the
same region as the primary Region is blocked with a message pointing
back to the main section — avoids two competing places holding the same
region's data.

**Scoped to 3 fields, not all 7** — deliberate scope-down for secondary
blocks: **ROM, Strength/MMT, Special Tests only.** Joint mobility,
Muscle length, Functional screening, and Neurodynamics stay
primary-region-only. Rationale: a secondary/compensatory region in the
same visit is rarely the deep-assessment focus the primary region is —
ROM/MMT/Special Tests cover the core objective picture needed to
document a secondary or compensatory finding (e.g. a Secondary Complaint
marked "Relation to primary: Compensatory" in Chief Complaint, in a
different region than the primary). If a second region genuinely needs
full 7-field depth, the guidance is to make it the primary Region in
Chief Complaint instead — not a limitation of this mechanism specifically,
a reasonable line drawn given real usage patterns.

**Reuses the primary block's builder functions and region configs**
(`makeRomRow`, `makeMmtRow`, `makeNamedScaleRow`, `romConfig`,
`mmtConfig`, `specialTestConfig`) — same auto-suggestion logic, same
smart-add dropdown pattern (§11.0a), just with locally-scoped active-name
tracking per block so multiple secondary regions (if more than one is
added) don't collide with each other or with the primary block's
tracking.

**Simplification, flagged not fixed**: secondary blocks use the **same
global Laterality value** as the primary block (Chief Complaint has only
one Laterality field). If the primary complaint is Left Knee and a
secondary Lumbar Spine block is added, the affected-side highlight in
that secondary block still follows "Left" — which may not be meaningful
for a region where laterality means something different, or nothing at
all. A more correct design would give each region block its own
laterality context; not built this pass, flagged as a real limitation
rather than silently accepted as correct.

### 11.1 Locked condition list (Ortho, for template matching)
**Post-surgical** (existing 6 + expanded): Post-op TKR, Post-op THR, Post-op
ACL Reconstruction/Meniscus Repair, Post-op Meniscectomy, Shoulder
Stabilization Post-Surgical (Rotator Cuff/SLAP/Bankart-Remplisage), Post-op
Total Shoulder Replacement/Reverse TSA, Post-op Lumbar Discectomy/
Microdiscectomy, Post-op Spinal Fusion, Post-op Laminectomy, Post-op UCL
Reconstruction, Post-op Carpal Tunnel Release, Post-op Distal Radius ORIF,
Post-op Hip Arthroscopy, Post-op Achilles Tendon Repair, Post-op Ankle
Fracture (ORIF)

**Non-surgical** (Chronic Low Back Pain already locked, + expanded):
Cervical Radiculopathy, Mechanical Neck Pain, Whiplash-Associated Disorder,
Thoracic Outlet Syndrome, Facet Joint Syndrome, SI Joint Dysfunction,
Piriformis Syndrome (matchable under Spine AND Hip), Sciatica/Disc
Herniation (non-op), Subacromial Impingement, Rotator Cuff Tendinopathy
(non-op), Frozen Shoulder/Adhesive Capsulitis (**confirmed same condition,
one template**), AC Joint Sprain/Dysfunction, Shoulder Instability (non-op),
Lateral Epicondylitis, Medial Epicondylitis, Cubital Tunnel Syndrome (non-op),
Carpal Tunnel Syndrome (non-op), De Quervain's Tenosynovitis, Trigger
Finger, CMC Osteoarthritis (thumb), Hip Osteoarthritis, Greater Trochanteric
Pain Syndrome, Hip Labral Tear (non-op), Knee Osteoarthritis, Patellofemoral
Pain Syndrome, IT Band Syndrome, Meniscus Tear (non-op), MCL/LCL Sprain
(grade I-II), Patellar Tendinopathy, Ankle Sprain, Plantar Fasciitis,
Achilles Tendinopathy (non-op), Posterior Tibial Tendon Dysfunction,
Metatarsalgia

**Cross-region, flagged as not fitting the Region→Template model** (not
built into templates this pass): Fibromyalgia, Chronic Pain Syndrome
(general), Generalized Deconditioning/Post-immobilization weakness

### 11.2 New Objective base fields (beyond ROM/Strength/Special Tests)
- **Joint mobility / accessory motion grading** — new field (e.g. Maitland
  grade I-V or hypo/normo/hypermobile tag, per joint) — justifies Manual
  Therapy's Joint mobilisation pick, previously had no home
- **Muscle length testing** — new field, distinct from Strength/MMT (tests
  length, not contraction) — Thomas test, Ely's test, 90/90 hamstring, etc.
- **Functional/movement screening** — new field, compound/loaded movement
  quality (single-leg squat, double-leg squat, overhead reach pattern) —
  distinct from isolated-joint ROM
- **Neurodynamics** — pulled OUT of the flat Special Tests list into its
  **own structured repeatable block**: test (SLR/ULTT/Slump/etc.), symptom
  response type (local/referred/none), provoking range, sensitizing/
  desensitizing maneuver, notes. Structurally same weight as ROM or MMT, not
  a Special Test row.

### 11.3 McKenzie / MDT — new "+"-addable module, Spine-specific
Full Mechanical Diagnosis & Therapy classification (repeated-movement
testing, centralization/peripheralization tracking, postural/dysfunction/
derangement syndrome classification) — built as its own module, not folded
into base ROM, since it's a full methodology not a quick field. Spine
conditions only. Lighter McKenzie-adjacent takeaway (directional preference
exercises) already flows into HEP suggestions for Low Back/Sciatica
templates regardless of whether this module is used.

### 11.4 New objective-assessment modules (examination/objective scope only —
PROMs/questionnaires for all of these explicitly deferred to a later pass)

**Return to Sport** — wires up dormant `return_to_sport_responses` table.
Hop tests (Single/Triple/Crossover/6m timed, per limb), **Limb Symmetry
Index (LSI)** auto-computed, strength benchmark (cross-references MMT or
HHD — see Melbourne ACL below), single-leg squat/landing quality (via
11.2's functional screening), `computed_score`/`risk_category`. Triggered
by Post-op ACL/Knee templates and Plan & Goals phase = "RTS-prep."

**Scoliosis Screening** — wires up dormant `scoliosis_screening_responses`
table. Adam's Forward Bend Test, Scoliometer reading, Cobb angle (entered
from imaging, existing dormant column), shoulder/hip/scapular asymmetry
(cross-references existing Posture multi-select rather than duplicating),
`severity_level` (existing dormant column).

**FMS (Functional Movement Screen)** — new module. Fixed 7-movement battery
(Deep squat, Hurdle step, In-line lunge, Shoulder mobility, Active
straight-leg raise, Trunk stability push-up, Rotary stability), each 0-3,
composite score. **SFMA explicitly deferred** (more complex breakout
methodology) — FMS only, for now.

**Y-Balance Test** — simple quick-capture field set (like TUG), NOT a full
module/table. 3 reach directions (Anterior, Posteromedial, Posterolateral)
× limb, normalized to leg length, composite reach score.

**Melbourne ACL Return to Sport Testing** — new module, built as an
**ACL-specific superset sharing tools with the generic Return to Sport
module** (not duplicated fields). Adds: Quad + Hamstring strength via
**handheld dynamometry (HHD) as the primary/default method** (force reading
per limb, joint angle at testing, trial count) — **isokinetic kept as an
optional supplementary method**, not required, clearly separate from HHD
scoring, not blended into one number. Per-test LSI (not just an overall
average — Melbourne criteria is typically ≥90% on *each* hop test
individually). Drop vertical jump (landing quality, via 11.2's functional
screening). Isokinetic multi-speed testing (optional, if equipment
available). Running/agility progression status.
**Note**: ACL-RSI (psychological readiness questionnaire) is normally a
core part of the real Melbourne protocol — explicitly deferred here along
with all other PROMs; this module currently captures physical criteria
only. Flag this gap when the PROM pass happens.
Triggered specifically by Post-op ACL Reconstruction template.

**Standard Strength/MMT vs. HHD — scoping note**: ordinary MMT grading
(5/5–0/5, existing base Objective field) stays the default for routine
visit-to-visit tracking. **HHD is reserved for RTS/Melbourne-criteria
testing** specifically, where precise numeric/LSI comparison actually
matters — not a blanket replacement of MMT everywhere.

**Cardiothoracic Assessment** — new module, new table
`cardiothoracic_assessments` (same dormant-instrument pattern: `responses
jsonb`, computed columns). Built despite no current confirmed
cardiopulmonary caseload at Beyond Mechanics/Abhijaya, on the basis that
specialist cardiopulmonary physios would use it if available — **scoped now
as examination/objective content only**, PROMs (mMRC, CAT, SGRQ) explicitly
deferred. **Frontend built this session, delta spec §32.4** — the content
below matches what was actually built, including the 6MWT's HR/SpO2/RPE
fields genuinely reusing Vitals rather than just being specified as
"not duplicated" without a build to enforce it. Content: Auscultation findings (breath sounds per lung field,
heart sounds — tap-select grid), Chest wall assessment (expansion
measurement, shape observations), Cough characteristics, Exercise
tolerance/functional capacity (6-Minute Walk Test — distance + reuses
existing Vitals HR/SpO2 fields + existing RPE field from Sports context,
not duplicated), Dyspnea during exertion (Borg/modified Borg, reuses
ScaleWidget), Peripheral edema (location, grade 1+ to 4+), Peak flow/
spirometry (simple numeric, if equipment available). Triggered via the
Chief Complaint classifier (§1a — Cardiothoracic added as a classifier
option) and independently "+"-addable from Patient Profile.

### 11.5 Phase-wise post-op protocols — new structure
Per post-op condition template: **Phase 1-4 (or however many phases apply),
each carrying Precautions, HEP focus, ROM goal range, WB status.**
- **Auto-selection — CORRECTED per delta spec §10 (post-op drift
  mechanism)**: post-op week still **defaults/recommends** which phase's
  content surfaces (via `surgery_date` on the episode/enrollment record,
  recomputed at every visit), but this is no longer a hard rule — "no
  manual phase-picking" is superseded. The therapist can now override the
  existing Phase field away from the calendar-recommended value (e.g.
  patient is calendar-Phase-2 but clinically still Phase-1 after missed
  sessions); a drift banner shows when the two disagree. The
  therapist-selected value is authoritative for protocol lookup. See delta
  spec §10 for the full mechanism — no second field was added; the
  existing Acute/Subacute/.../RTS-prep Phase field just became editable.
- **Cross-references Plan & Goals' existing Phase field**: post-op Phase
  1-2 → "Acute," Phase 3 → "Subacute," Phase 4 → "RTS-prep"/"Maintenance" —
  one phase concept, not two running in parallel.
- **Relationship to the existing load-management block (Intervention/
  Therapy section): Option A confirmed** — phase protocol content
  pre-populates the load-management block's fields (WB status, ROM limit,
  brace type, etc.); the therapist's entered/edited value for that specific
  visit is the authoritative saved record, not the template default.
- **Same "post-op shell" pattern noted in the mapping doc**: build once as
  a parameterized structure (deferred HEP, protocol-compliance precautions,
  deferred PSFS, phase-gating), not ~15 independent post-op template
  definitions.
- **Precise week boundaries, precaution content, and ROM goal ranges are
  clinic-editable defaults**, not fixed rules — see §14 (Protocol Library)
  for where these now live and how they're edited.

---

## 11a. Clinical Impression / Assessment — **new Tier 1 section, added per delta spec §14.3**

*New section, not present in the original review — added following a
second-pass critical review that identified a real gap: the note
collected data (History/Screening/Pain Profile/Objective) and acted on it
(Intervention/Plan) but had no explicit synthesis step — the missing "A"
in SOAP.*

**Placement**: Tier 1, positioned after Objective and before Intervention/
Therapy — matches standard SOAP ordering (History-family ≈ Subjective,
Objective, **Assessment**, Intervention/Plan ≈ Plan).

**Fields — expanded and refined this session** (original version flagged
as too thin/generic to be clinically meaningful — see rationale below):
- **Read-only cross-reference strip** — new. Shows, when present: (a) any
  active "Suggested for this visit" template/module match from Chief
  Complaint, (b) any Yellow flags marked Mild/Moderate/Significant in
  Screening. Neither is re-entered — both are pulled from data already
  captured elsewhere, so Clinical Impression reads as a genuine synthesis
  of what's already known rather than a fourth isolated island of chips.
  This directly addresses the "feels disconnected" critique that also
  motivated the earlier Laterality/Pain-Profile-folding fixes.
- **Primary hypothesis** — free text, unchanged. Deliberate, narrow
  exception to the app's structured-first philosophy (§0.1) — clinical
  synthesis is genuinely narrative in a way chip selections aren't. Not a
  reopening of §16's Free Notes removal.
- **Contributing factors — reorganized into 3 labeled categories**, was a
  flat 4-chip list:
  - *Biomechanical/movement*: Posture, Mobility deficit, Movement pattern
    deficit
  - *Neuromuscular*: Weakness, Motor control deficit, Neural tension
  - *Load/training*: Training error/overuse, Recent activity change
  - Psychosocial factors are **not duplicated as chips here** — they're
    already captured with more precision in Screening's Yellow flags
    (4-state concern scale vs. a flat chip), and now surface via the
    cross-reference strip above instead of being re-asked.
- **Irritability — new field.** Low / Moderate / High, segmented. Part of
  the SIN framework (Severity/Irritability/Nature) taught broadly in
  manual therapy clinical reasoning — how easily symptoms are provoked
  and how long they take to settle, which directly informs how
  aggressively to treat *today*. This was a genuine content gap: nothing
  else in the note captured this, and it's exactly the kind of
  synthesis-level judgment Clinical Impression exists for.
- **Prognosis indicator** — segmented toggle: Favorable / Guarded / Poor,
  unchanged.

**Rationale for the refresh**: the original 4-chip/free-text/3-option
version was flagged as "vague" — functionally present but not doing much
clinical work. The fixes above target that directly: connecting to data
that already exists (cross-reference strip) rather than re-asking it,
giving Contributing factors actual clinical structure instead of a flat
list, and adding Irritability as content this section was missing
entirely rather than restating something captured elsewhere.

**Still not built** (proposed alongside the section, not yet confirmed):
template-suggested starter text for Primary hypothesis, and condition
templates suggesting specific Contributing factors. Flagged as a natural
follow-on, not committed.

**Note outline renumbers as a result**: Chief Complaint (1, now includes
Pain Profile) → History (2) → Safety Checkpoint (3) → Objective (4) →
**Clinical Impression (5)** → Intervention/Therapy (6) → Plan & Goals
(7). *(Corrects the numbering in the original version of this note, which
predates the Pain-Profile-fold-in and Safety-Checkpoint-repositioning
sessions — see §0.5 for the current authoritative ordering table.)*

---

## 12. Intervention/Therapy (renamed from "Treatment / Intervention")

**Section renamed** to distinguish from Ledger's billing-side
`treatment_catalog`/`visits.treatment_ids`/"Treatments" language, which
stays completely separate and unsynced by design (confirmed — no
reconciliation between the two lists; they serve different jobs, billing
record vs. clinical detail, per your own existing documented reasoning).

### 12.1 Structure
Manual Therapy, Modalities, and Therapeutic Exercise each become their own
**"+"-addable subsections** (not three always-visible multi-selects) — a
therapist who never uses Modalities never opens that subsection. Tappable
chips within each opened subsection, consistent with the app-wide pattern.

### 12.2 Manual Therapy — final list
Joint mobilisation, Manipulation, MFR, **Taping/KT** (kept as one combined
entry, not split), Dry needling, Fascial Manipulation (FM), PNF, Muscle
Energy Technique (METs)
*(Visceral Manipulation, Craniosacral Therapy — considered, removed.
Neurodynamics and DNS — considered, deliberately left out: neurodynamic
treatment is covered by the Objective Neurodynamics block, §11.2, not
duplicated as a flat tag here.)*

### 12.3 Modalities — final list
Ultrasound, TENS, IFC, Heat/ice, Laser, Shockwave, Spinal Decompression,
NMES (Neuromuscular Electrical Stimulation), Pneumatic Compression

### 12.4 Therapeutic Exercise — final list (significantly expanded)
**Strength-based**: Strengthening (general), Eccentric loading, Isometric
loading, Closed-chain, Open-chain
**Mobility-based**: Stretching, ROM exercises
**Motor control/neuromuscular**: Neuromuscular re-education, Motor
control/stabilization, Proprioception/balance training
**Power/performance**: Plyometric, Agility/change-of-direction,
Sport-specific/return-to-activity drills
**Cardiopulmonary**: Aerobic conditioning, Breathing exercises, Airway
clearance techniques
*(Soft tissue/self-myofascial release — considered, removed, to avoid
overlap with therapist-performed MFR already in Manual Therapy.)*

### 12.5 Other Intervention/Therapy decisions
- **Session duration**: stays a single total-time field (quick-pick
  15/30/45/60/90 + free text), no per-intervention time breakdown — kept
  simple per your explicit call.
- **Response to treatment**: unchanged, simple per-visit field
  (Improved/Unchanged/Worse/Unclear), no relationship to phase tracking —
  kept simple.
- **Load-management block**: unchanged fields, now populated by phase-wise
  protocol defaults per §11.5/Option A, fully therapist-editable.

---

## 13. Clinical Library — new top-level nav group

*New navigation structure, separate from Settings, separate from the
existing Patients-nested note editor.*

### 13.1 Access model — Exercise Library and Protocol Library
**Both libraries share one configurable access mechanism** (not two
different hardcoded rules): default edit access = **admin only**, with a
**clinic-level setting to extend edit access to specific therapists** (or
all therapists) — same pattern as the existing Billing access toggle
("Everyone" vs. "Billing staff only"). Read access open to all clinical
roles (front_desk excluded, consistent with existing "no clinical-notes
access" scoping). This needs its **own RLS policy shape**, distinct from
`service_catalog`/`treatment_catalog`'s current admin-write-only pattern —
flagged so it isn't built by copy-pasting the existing catalog RLS and
accidentally staying admin-only regardless of the clinic setting.

### 13.2 Exercise Library
**New table: `exercise_library`**
```
id                 uuid PK
clinic_id          uuid FK (nullable if system-wide base entry)
name               text
category           text  -- maps to Therapeutic Exercise categories, §12.4
default_instructions  text
active             boolean
created_by, updated_by  uuid
updated_at         timestamptz
```
- **Text-first, no video/image URL field** (explicitly decided — deferred,
  not built into this pass; avoids offline-availability complications and
  external-hosting scope creep)
- **No third-party/licensed exercise database integration** (HEP2go,
  Physitrack-style APIs, etc.) — explicitly rejected: recurring cost,
  external dependency, breaks offline-first, same "don't build ahead of
  validated demand" instinct already applied elsewhere in this plan
- **Seed content**: drawn directly from every condition-specific HEP
  suggestion mapped in `condition-template-full-mapping.md` — real,
  clinically-grounded starter set, no licensing needed
- **System-wide base + clinic-custom additions** model (leaning
  recommendation — not m locked as strongly as Protocol Library's version
  of this same fork, see below)
- HEP rows in the note editor **reference the library** (search/tap-select,
  autocompletes name+category+instructions) **or** allow a one-off custom
  free-text entry not in the library — library-use is not forced

### 13.3 Protocol Library
**New table: `protocol_library`**
```
id              uuid PK
clinic_id       uuid FK (nullable if system-wide base entry)
condition_key   text  -- links to the condition template, e.g. "post_op_tkr"
phases          jsonb -- [{label, week_range, precautions[], hep_focus_tags[],
                          rom_goal_range, wb_status}, ...]
active          boolean
created_by, updated_by  uuid
updated_at      timestamptz
```
- **Preloaded starter set**: seeded from the full phase-wise protocol
  structure mapped in §11.5, across every post-op condition in §11.1
- **Gives the previously-abstract "clinic-editable defaults" concept
  (referenced throughout §11 and the mapping doc for Precautions and phase
  content) an actual home** — this was flagged repeatedly earlier as
  needing a real place to live; this table is that place
- **Clinic customization expected to matter more here than for Exercise
  Library** — surgeon protocols vary meaningfully between clinics/referring
  hospitals, more so than exercise-name preferences
- **Integration**: same trigger mechanism already locked in §11.5 — post-op
  condition template + auto-computed post-op week → looks up the matching
  `protocol_library` phase → pre-populates load-management block +
  Precautions callout, editable per-visit (Option A)

### 13.4 "Notes" — new top-level tab (Core Assessment note editor)
- **Does NOT replace** the existing entry points — Patient Profile's
  "Clinical notes" section and any visit-based entry stay exactly as they
  are today. This is an **additional**, second door into the same editor/
  data, not a relocation.
- **No new list-view logic built** — the tab's default view reuses the
  **existing `pendingWork()` incomplete-notes aggregation** (already
  powering Workspace's Pending Work feed) as its own dedicated, filterable
  view: recent visits with a draft or missing note (patient, visit date,
  therapist, status), tap to jump into that note or start one.
- **Search fallback**: same patient-search component already used on New
  Visit (`SearchableSelect` pattern), for reaching anything outside the
  "recent incomplete" list — older episodes, already-completed notes to
  review, etc.
- List-first (common case), search-as-fallback (everything else) — not
  search-first-with-no-list.

### 13.5 Nav grouping
New top-level nav group — **"Clinical"** — containing: **Notes**,
**Exercise Library**, **Protocol Library**. Deliberately separate from
Settings (these carry clinical access rules, not admin/billing
configuration) and distinct from the existing per-patient note entry
points (§13.4).

---

## 14. Plan & Goals

### Final fields
- Phase (Acute / Subacute / Chronic / Maintenance / RTS-prep / Discharge) —
  unchanged, now driven by/cross-referenced with the Protocol Library phase
  structure (§11.5, §18)
- **Estimated sessions — removed entirely.** A specific session-count
  prediction was judged too close to a commitment/promise the clinic could
  be held to (unlike Precautions/HEP, which are practice patterns, not
  forecasts). Not replaced with another number field.
- Goals (repeatable: text, target date, term short/long) — unchanged, kept
  free-text/individualized, **no template-suggested starting text** —
  deliberately not extended the way HEP/PSFS were, since a goal is
  inherently patient-specific in a way a suggested ROM target isn't
- Patient education topics — unchanged (Posture, HEP, Pain neuroscience,
  Ergonomics, Activity modification, Load progression), already gets
  template-suggested per condition throughout §11's mapping

### New: Rehab Timeline / Recovery Outlook (replaces Estimated sessions)
- **Read-only, auto-generated display**, not a therapist-filled field.
  Rendered from the matched Protocol Library entry (§13.3/§18).
- **Post-op conditions**: labeled "Phase Timeline" — shows the actual
  week-based phase structure (Phase 1: Week 0-2..., Phase 2:...) in
  clinician-facing language, sourced from §18's seed content.
- **Non-surgical conditions**: labeled "Recovery Outlook" (deliberately
  different label from "Phase Timeline" — non-op has no fixed weeks, using
  the same word as post-op would imply false precision). Shows the
  stage-based shape (Acute → Subacute → Chronic/Maintenance) without dates.
- Surfaces at the **top** of Plan & Goals, above Phase/Goals — frames the
  rest of the section.
- **No template match → section doesn't render at all** (no empty
  placeholder), consistent with how every other template-driven surface in
  this note behaves.
- **Editing happens at the Protocol Library source only** (Clinical Library
  tab), never inline in the note — same admin-default/clinic-assignable
  access model as the rest of Protocol Library (§13.1).

### New: Patient-facing rewrite of the same content
- Separate `patient_summary`/`patient_precautions` fields added per phase
  to `protocol_library.phases` JSONB (extends, does not duplicate, the
  clinical fields) — see §18/`patient-facing-rehab-guides.md` for full
  architecture, tone rules, and four representative sample rewrites
  (Post-op TKR, Post-op ACL/RTS, Frozen Shoulder, Chronic LBP).
- Surfaces via a **separate patient handout artifact** (live preview → PDF
  export), not folded into the full clinical note PDF — a patient
  shouldn't receive Screening/Red-flags/Palpation findings alongside their
  recovery timeline.
- **Tone rule, locked**: ranges/"typical" framing, never firm dates or
  promises — especially load-bearing for ACL RTS timelines (9-12 months,
  commonly misunderstood by patients) and Frozen Shoulder (12-24 month
  total resolution).
- **Same edit access as clinical Protocol Library fields** — no separate
  permission system.
- **Only 4 of ~45 conditions have patient-facing content written** (the
  samples) — remaining conditions are an explicitly flagged follow-on
  content-authoring pass, not done this session.

---

## 15. Outcome Tracking — refined and relocated

### Relocated: out of the note editor entirely, into Patient Profile
- **No Outcome Tracking section in Core Assessment anymore**, not even
  read-only. The note stays focused on documenting the current visit.
- **New home: Patient Profile**, own card/section alongside Clinical notes
  — consistent with Patient Profile already owning other cross-visit
  aggregation (visit history, payments summary, package tracking).
- Now shows the **full trend across the enrollment** (every note in the
  episode), not just latest-vs-previous — an upgrade enabled by having a
  dedicated home instead of being squeezed into a single note's accordion.
- Derived scalar columns (`nrsScore`, `psfsMean`, `redFlagCount`) **still
  computed and saved at note-save time as before** — this is a display
  relocation only, not a computation change. Same enrollment-scoping.

### Contextual hint stays in the note editor
- A **small, informational hint** near where each relevant score is
  entered (e.g., last visit's NRS shown faintly next to today's NRS input)
  — not a full card, not the full Outcome Tracking experience, just enough
  that a therapist isn't documenting blind to trend while writing today's
  note.

### Two display types (Patient Profile), not one
Extends the original NRS/PSFS-only model to cover every scored instrument
added this session — sorted by what kind of measurement they actually are:

**Trend cards** (continuous, direction-aware, serial comparison):
NRS (lower = improving), PSFS (higher = improving, MCID applied), Tinetti
POMA score (higher = improving), FMS composite (higher = improving),
Y-Balance composite reach (higher = improving), Cardiothoracic 6-Minute
Walk distance (higher = improving)

**Milestone/Clearance cards** (threshold pass/fail, not a graphed trend —
more honest than implying gradual progress toward an arbitrary target):
RTS/Melbourne ACL LSI (per-test status against ≥90% threshold, most recent
test only — not a trend of prior attempts), Scoliosis severity level
(current classification, not graphed — a Cobb angle isn't "improving" the
way NRS is)

**Display rule**: a Trend card requires **at least two notes** with that
instrument in the same enrollment before it appears (need two points for a
trend). Milestone cards show on **first use** — "met criteria: yes/no" is
meaningful without a prior comparison.

**Vitals remain excluded** — no trend, no milestone card (locked earlier,
§9).

---

## 16. Free Notes — removed entirely

- Field dropped from Core Assessment.
- **Schema consequence flagged, not yet resolved**: `consultation_notes.
  notes_text` currently exists specifically as a mirror of this field
  ("mirrors `assessmentPayload.freeNotes`," per the original note-structure
  doc §2). With the field removed, this column has nothing to mirror.
  **Recommend treating `notes_text` as dead weight to clean up in the same
  pass** — same spirit as the already-documented legacy-column cleanup for
  `visits.consultation_note_id`/`consultation_notes.visit_id` (§6 of the
  original note-structure doc). Not yet actioned, just flagged so it isn't
  silently left orphaned.

---

## 17. Summary of all schema/architecture changes required

| Change | Type | Sequencing note |
|---|---|---|
| Medical Conditions: +Thyroid, +bulk clear action | Field addition | — |
| Allergies → Taping banner wiring | Logic change | — |
| Vitals → banner logic (abnormal-only, no absence-flagging) | Logic change | Needs threshold values from clinical lead before build |
| `module_key` unconstrained-text bug fix | **Prerequisite fix** | **Must land before any new module (Neuro Group A/B, Vestibular) gets a `module_key` assigned** |
| Chief Complaint restructure (recency row, classifier, merged complaint card, derived Onset) | Form restructure | — |
| History restructure (surgeries/injuries as gated reveals, lifestyle fields) | Form restructure | — |
| Gait & Posture: neuro gait patterns, device type + dependency, TUG/gait speed | Field addition | — |
| Tinetti POMA module | New table + instrument, same pattern as dormant 5 | — |
| Body Chart: remove Dominant side | Field removal | — |
| Neuro Level 1: Region-filtered dermatome/myotome/reflex display | UI logic | — |
| `neuro_spinal_assessments` table + shared tool registry (Group A) | New table + new domain directory (`src/domain/instruments/`) | Depends on `module_key` fix above |
| `vestibular_assessments` table (Group B) | New table, same dormant-instrument pattern | Depends on `module_key` fix above |
| Facial Palsy frontend wiring (Group B) | Frontend only — table exists | Depends on `module_key` fix above |
| Vitals & Measurements rename | Cosmetic/label only | — |
| Tier 1/Tier 2 "+"-add UI pattern, section stickiness per episode | New UI/state pattern, cross-cutting | Affects every Tier 2 section listed above |
| Live preview (free) + gated PDF export inside it | New feature (PDF export was already net-new/planned) | — |
| Tappable chip/toggle pattern applied app-wide | UI pattern, cross-cutting | — |
| Estimated sessions field removed; Rehab Timeline/Recovery Outlook added (read-only, Protocol-Library-sourced) | Field removal + new display, Plan & Goals | Depends on Protocol Library (§13.3) existing |
| Patient-facing rehab content (`patient_summary`/`patient_precautions`) | New JSONB fields on `protocol_library.phases` | Content-authoring dependency — only 4/45 conditions written |
| Outcome Tracking relocated from note editor to Patient Profile; two-type display (Trend vs. Milestone cards) | Relocation + display logic change | — |
| Free Notes field removed; `notes_text` column orphaned | Field removal, flags a cleanup dependency | `notes_text` cleanup not yet actioned |

---

## 18. Open items carried forward (not resolved this pass, by decision)

- Arthritis/Autoimmune overlap in Medical Conditions — intentional, undocumented-fix
- Neurological-breadth checkbox in Medical Conditions — intentional, undocumented-fix (mitigated by new Neuro module for structured cases)
- Blood-thinner boolean vs. free-text medications mismatch — intentional, undocumented-fix
- Vitals banner threshold values — TBD by clinical lead
- Falls-risk age threshold — default 65, confirm final number before build
- Group A `sensory_dermatomal`/`reflexes` reuse-vs-blank fork (§8.2) — **unresolved, needs a decision before Group A build starts**
- Interactive/guided intake (conversational Q&A wizard for Chief Complaint) — parked as a future idea, not committed, not precluded by anything decided here
- **Precautions/Contraindications content (§11) needs clinician review** before shipping — drawn from general orthopedic practice, not your referring surgeons' actual protocols; ships as clinic-editable defaults via Protocol Library (§13.3), but starter content itself is unverified against real practice
- **ISNCSCI/AIS grading logic (§8.2, delta spec §30.3) needs clinician verification** before shipping — the sensory/motor level, single NLI, and AIS A–E derivation is a simplified implementation of the official algorithm (no Zone of Partial Preservation, simplified Not-Testable handling) and should be checked against known real cases, same reasoning as the Precautions item above
- **Fugl-Meyer severity bands (§8.2, delta spec §30.4) need clinician verification** before shipping — the Severe/Moderate/Mild/Full-recovery percentage bands are a general simplification, not the precise validated categories from a specific published source
- **ACL-RSI and all other PROMs/questionnaires** (mMRC, CAT, SGRQ, DHI, ACL-RSI, etc.) — explicitly deferred across every new module this pass (RTS, Melbourne ACL, Cardiothoracic, Scoliosis, FMS) — **partially resolved in a later session**: a Questionnaires section covering all 10 MVP conditions (Oxford Knee/Hip Score, IKDC, SPADI, ODI×2, FAAM×2, NDI) was built, plus DHI for Vestibular — see delta spec §31/§32.3. Still deferred: ACL-RSI, Tampa Scale of Kinesiophobia, FABQ, mMRC, CAT, SGRQ
- **Questionnaire item wording and severity bands (delta spec §31.3) need clinician verification** before shipping — items are paraphrased, not the official licensed wording of each instrument, and severity bands are a generic percentage-of-max simplification, same reasoning as the AIS/Fugl-Meyer items above
- **Sunnybrook Facial Grading composite formula not implemented (delta spec §32.2)** — only the three raw subscores (Resting symmetry/Voluntary movement/Synkinesis) are built; the official weighted composite calculation needs to be sourced from the validated worksheet directly, not guessed at
- **DHI built as a 12-item subset, not the full 25-item instrument (delta spec §32.3)** — raw score only, no severity band, since the official mild/moderate/severe bands assume all 25 items
- **Exercise Library vs. Protocol Library: system-wide-base-plus-clinic-custom model** — leaning recommendation for both, more strongly stated for Protocol Library than Exercise Library; not fully locked as a hard architecture decision for either
- ~~RTS/Melbourne LSI outcome view~~ — **resolved this pass**: Milestone/Clearance card, not a trend (§15)
- **`consultation_notes.notes_text` orphaned column** (§16) — Free Notes removed, this mirror column has nothing to mirror; flagged for cleanup, not yet actioned
- **Patient-facing rehab content — 41 of ~45 conditions still need writing** (§14, `patient-facing-rehab-guides.md`) — only 4 representative samples done this session (Post-op TKR, Post-op ACL, Frozen Shoulder, Chronic LBP); explicitly scoped as a follow-on content pass
- **Patient handout artifact/PDF flow** (§14) — referenced as the destination for patient-facing content, but the flow itself (how it's assembled, what else it might contain beyond the rehab timeline) is not fully scoped — only referenced, not designed
- **Non-op Protocol Library entries for the ~15 non-surgical conditions not given a full stage breakdown in `protocol-library-seed-content.md`** — cross-check against §11.1's full condition list; several minor/low-phase-variance conditions (Trigger Finger, Metatarsalgia) got lighter treatment than higher-variance ones (Frozen Shoulder, Chronic LBP) — intentional, but worth confirming coverage is acceptable as-is

---

## 19. New tables required (consolidated list)

| Table | Purpose | Depends on |
|---|---|---|
| `neuro_spinal_assessments` | Group A Brain/Spinal shared toolkit (§8.2) | `module_key` fix |
| `vestibular_assessments` | Group B Vestibular module (§8.3) | `module_key` fix |
| `cardiothoracic_assessments` | Cardiothoracic module (§11.4) | `module_key` fix |
| `exercise_library` | Exercise Library (§13.2) | New RLS shape (§13.1) |
| `protocol_library` | Protocol Library (§13.3) | New RLS shape (§13.1) |
| *(reuse)* `return_to_sport_responses` | Wired up, extended for Melbourne ACL superset (§11.4) | Already exists, dormant |
| *(reuse)* `scoliosis_screening_responses` | Wired up (§11.4) | Already exists, dormant |
| *(reuse)* `facial_palsy_assessments` | Wired up, no schema change (§8.3) | Already exists, dormant |

FMS and Y-Balance do not require new tables — FMS fits the existing dormant-instrument JSONB pattern if built as a module (not yet decided which table), Y-Balance is a plain field-set with no separate table.

**Field extensions to existing tables (no new table):**
- `protocol_library.phases` (JSONB) gains two new keys per phase entry:
  `patient_summary`, `patient_precautions` (§14/§18) — patient-facing
  content, same record as the clinical phase data, not a separate table.

---

## 20. Addendum — Fascial Manipulation (FM), Mobile-First Chief Complaints & Tier 1 Palpation

### 20.1 Fascial Manipulation (Stecco Method) Module
- **Biomechanical Model & Taxonomy:** Scoped to Segment level. Hip is standardized as `CX` (Coxa). Caput divided into `CP1`, `CP2`, `CP3`. Pelvis contains Coccyx. Full 14-segment catalog: `CL`, `SC`, `TH`, `HU`, `CU`, `CA`, `DI`, `CX`, `GE`, `TA`, `PE`, `PV`, `LU`, `CP`.
- **Palpation Verification (PV) Grid Modes:** Segmented toggle for `[🔍 Palpation Mode]` (single tap cycles density 1 → 2 → 2+ → 3 → 3+ using soft pastel colors) vs. `[🛠 Treatment Mode]` (single tap sets treated state with thick teal outline, eliminating checkmarks). Double-tap and long-press gestures removed for touchscreen safety.
- **Smart Pattern Detection:** Automatically identifies fascial diagonals (e.g., "AN-ME diagonal (rt)") when ≥2 segments share the same plane, and tallies treated vs untreated grade ≥2 density points.
- **Three-Table Unified Sync:** Adding a segment via `addFmSegment()` binds Segment Assessment, PV Grid, and Movement Verification (Mo/Ve) tables in real-time.
- **History Auto-Sync (`syncFmHistory`):** Pulls Past Surgeries, Injuries, and Pain Episodes into FM History, formatting dates to `MMM YYYY` and routing Secondary Complaints to `Pa Conc` (concomitant pain).

### 20.2 Chief Complaints & Onset UX Overhaul (iPad-First)
- **Elimination of Dropdowns:** Anatomical Region converted to a 9-item wrapping chip grid. Hidden input dispatches change events to preserve reactive ROM/MMT defaults and aggravating factor chips.
- **Linear Onset Engine:** Direct choice of Onset Mechanism (`Insidious` / `Sudden` / `Post-Surgical` / `Flare-up`) + immediate Onset Timeline chips (`<1 wk` to `Years`).
- **Cascading Surgical Drill-Down:** Selecting Post-Surgical reveals category chips (Knee/Hip/Shoulder/Spine/Other) followed by specific procedure chips, eliminating 30-item scrolling dropdowns.
- **Unified Symptoms & Triggers:** Dissolved the disconnected Context divider; merged Primary Symptoms, compact NRS 0–10 scale (26×26px), pain pattern, aggravating and easing movement chips into a single card.
- **Visual Design Parity:** Standardized reveal containers with clean neutral surfaces (`var(--surface)` with `1px solid var(--line)`) and applied `justify-self: start` to `.segmented` controls to prevent awkward pill stretching.

### 20.3 Visceral Manipulation (VM) & Internal Dysfunctions
- Added `[Visceral Manipulation (VM)]` and `[Craniosacral Therapy (CST)]` modality chips under Intervention Manual Therapy.
- Added Internal / Visceral Dysfunctions card inside Tier 1 *Medical Conditions* with system chips (Digestive, Gynaecological, Urological, Hepatic, Renal, Endocrine) and freetext notes.

### 20.4 Objective General Palpation Elevated to Tier 1
- Promoted General Palpation from Tier 2 to a Tier 1 (always visible) card in Objective (Section 4): includes Tenderness toggle, Tone toggle, Tissue Texture chips (Thickened, Fibrotic, Oedematous, Normal), and findings freetext.

