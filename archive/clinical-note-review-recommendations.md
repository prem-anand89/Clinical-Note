# Clinical Note Build — Review Recommendations & Implementation Handoff

## Purpose

This document turns the build review into an implementation-ready backlog.
It is a review and recommendation artifact, not a replacement for the locked
product/clinical decisions. Where it conflicts with the locked delta spec,
the delta spec remains authoritative until the product owner deliberately
updates that decision.

## Recommended implementation order

1. Resolve the architecture and source-of-truth conflicts.
2. Eliminate in-progress data loss and unsafe interaction states.
3. Complete the safety-screening disposition workflow.
4. Strengthen the clinical assessment, intervention, and plan data model.
5. Refine progressive disclosure and longitudinal review.

Do not add more condition templates or advanced modules before items P0 and P1
are completed.

---

## P0 — Must resolve before production use

### P0.1 Establish one intake/template/protocol flow

**Problem**

The current build contains two competing paths:

- a visible `Clinical Protocol` selector at the top of the note;
- legacy classifier/reveal code that expects a separate recency and condition
  workflow, with hidden compatibility stubs.

The visible protocol list also does not match the 10-condition MVP list in the
delta spec.

**Recommendation**

Use one canonical flow:

`Chief Complaint classifier → suggested template(s) → therapist accepts or dismisses → protocol content is applied`

The visible protocol selector should either be removed, or redesigned as a
manual override/reference inside the consolidated **Suggested for this visit**
panel. It must never silently compete with the Chief Complaint values.

**Required product decision**

Confirm whether a therapist may manually choose a template when the classifier
does not match. If yes, place that action under an explicit “Choose another
template” control and record that it was manually selected.

**Acceptance criteria**

- One template state exists per episode/note; no duplicate selectors.
- The implemented condition list exactly matches the approved MVP list.
- Selecting, changing, or dismissing a template updates all dependent UI from
  the same canonical state.
- The preview records template name, version, source, and whether it was
  auto-suggested or manually selected.

### P0.2 Preserve objective findings when the region changes

**Problem**

Changing Anatomical Region clears and rebuilds ROM/MMT rows. Region-driven
refreshes also clear special-test and functional-screening rows. A clinician can
therefore lose entered objective findings during note completion.

**Recommendation**

Persist rows independently from suggestion lists. Region changes should:

- retain existing measurements and custom rows;
- label retained rows with their original region when relevant;
- add only missing suggested rows for the new region;
- require an explicit, confirmable removal action to delete entered data.

**Acceptance criteria**

- Change region after entering ROM, MMT, special-test, and functional-screening
  findings; all entries remain intact.
- No action rebuilds an entered row without preserving its values.
- Removal uses an explicit delete action and is auditable in the draft state.

### P0.3 Build a red-flag disposition workflow

**Problem**

Positive red flags produce a visual callout but do not document what action the
clinician took. A “No red flags” bulk action can also complete screening without
an explicit review/attestation.

**Recommendation**

When any red flag is positive, show a required **Safety disposition** card:

- clinical context / rationale;
- action: emergency escalation, urgent referral, routine referral, GP/specialist
  contact, monitor with safety-netting, or other;
- clinician contacted, date/time, and outcome where applicable;
- treatment status: deferred, modified, or proceeded;
- patient advice and return/escalation instructions.

Keep “Unknown / unable to assess” distinct from “No” and “Not applicable.”
Replace the bulk action with “Mark all reviewed as negative,” followed by an
attestation such as “I reviewed these screening questions with the patient.”

**Acceptance criteria**

- A positive red flag cannot be finalized without a disposition.
- The clinical PDF includes screening findings and the disposition.
- The “all negative” shortcut requires explicit confirmation and remains
  distinguishable from individual answers in stored data.

### P0.4 Resolve the Neuro Screen contradiction

**Problem**

The delta spec removes Level 1/minimal neuro screening, but the build still
auto-adds a “Neuro Screen (minimal)” for all tiers. This affects routine
cervical radiculopathy workflows and subscription gating.

**Required product decision**

Choose exactly one:

1. Keep the delta-spec decision: no minimal screen; dermatomes, myotomes, and
   reflexes live only in Group A.
2. Restore a limited, non-gated neuro screen for routine MSK/radicular cases,
   then update the delta spec, data model, tier entitlements, and templates.

**Acceptance criteria**

- UI, data model, condition templates, entitlement rules, and specification all
  agree.
- A clinician can document the minimum required neuro findings for every
  supported condition without contradictory tier behaviour.

### P0.5 Replace generic protocol timing with versioned protocol content

**Problem**

The build currently computes generic post-operative phase thresholds in the
front end, despite the design requiring condition-specific, clinic-editable
Protocol Library content.

**Recommendation**

Move phase boundaries, precautions, weight-bearing status, ROM restrictions,
and progression criteria into a versioned protocol source. Show the applied
protocol/version and make any clinician deviation explicit.

**Acceptance criteria**

- No generic hard-coded week boundaries determine clinical protocol content.
- The note records protocol name/version and a clinician override reason.
- Surgeon/referrer-specific restrictions can override clinic defaults.

---

## P1 — Improve the clinical assessment format

### P1.1 Put functioning and patient priorities at the start

Add two fields alongside the presenting problem:

- **What does the patient most need or want to return to?**
- **Which meaningful activity is most limited today?**

Offer to create a PSFS item from that answer. This avoids relegating function to
an optional Tier 2 section and gives goals a patient-centred anchor.

**Acceptance criteria**

- A functional priority can create a PSFS item and a goal without retyping.
- The Clinical Impression and Plan can reference it directly.

### P1.2 Make pain assessment conditional and more clinically useful

Only show NRS/pain-pattern fields when pain is selected as a primary or
secondary symptom; otherwise show “Not applicable.” Add irritability fields:

- trigger/load needed to provoke;
- time to onset;
- easing strategy;
- time to settle.

Keep current/best/worst NRS, but avoid making non-pain presentations complete a
pain workflow.

### P1.3 Add a compact, always-visible risk summary

Detailed History may remain collapsible, but the note should surface a compact
summary before intervention:

- allergies and adhesive/latex sensitivity;
- anticoagulants;
- implants/pacemaker;
- relevant current medication;
- surgery and applicable precautions;
- key medical comorbidities.

This should be an at-a-glance safety aid, not a diagnostic decision engine.

### P1.4 Make Objective findings reproducible

The ROM design is a good base: active/passive values, end-feel, and pain notes.
For measures where interpretation depends on method, add optional structured
metadata:

- test position / method;
- side and comparison side;
- equipment, where relevant (for example HHD);
- symptom response / quality;
- baseline vs today where the measure recurs.

Do not require every field every visit. Use condition-aware defaults and
preserve clinician-added custom tests.

### P1.5 Turn Clinical Impression into a structured synthesis

Retain free-text **Primary hypothesis**, then add structured prompts for:

- working diagnosis/classification and differential, when relevant;
- evidence supporting and evidence not supporting the hypothesis;
- impairments;
- activity limitations;
- participation restrictions;
- contributing factors and precautions;
- rehabilitation prognosis and expected episode needs.

The goal is to make the Assessment demonstrate reasoning, not just restate
Subjective and Objective findings.

### P1.6 Capture intervention dosage and response

Categories alone are insufficient for a defensible treatment record.

- **Therapeutic exercise:** exercise, sets/reps/time, load/resistance, intensity
  cue such as RPE where relevant, assistance level, and response.
- **Manual therapy:** technique, region/target, grade where relevant, duration,
  and response.
- **Modalities:** parameters, duration, location, contraindication check where
  relevant, and response.

Keep category chips as a quick entry aid; they should not be the only persisted
record of treatment delivered.

### P1.7 Improve HEP documentation

Split HEP instructions into structured fields:

- exercise name;
- dose: sets, repetitions, hold, frequency, load;
- key cue / safety instruction;
- progression or regression rule;
- patient teach-back/comprehension;
- adherence barrier, if reported.

Free text remains available for unusual instructions.

### P1.8 Make goals and plan measurable and episode-aware

For each goal, capture:

- patient-priority/function link;
- measure and baseline;
- target and target date;
- short/long term;
- status: active, progressing, met, revised, discontinued;
- reason when revised/discontinued.

Add plan-level fields for visit frequency/duration, next reassessment date,
selected outcome measure, progression criteria, referral/escalation plan, and
discharge criteria.

---

## P2 — Usability, auditability, and longitudinal care

### P2.1 Make suggestions a review queue

The consolidated Suggested for this visit panel is the right location. Each
suggestion should show:

- what was suggested;
- why it was suggested;
- Accept / Dismiss;
- an option for manual override;
- accepted/dismissed status in the audit trail.

Ensure orthopaedic templates appear in the panel; they are currently excluded
from the render list.

### P2.2 Add prior-value context where measures recur

Beside recurring measures, show last recorded value, date, and delta where
valid. Examples: NRS, PSFS, ROM, MMT, TUG, 6MWT, and condition-specific
outcomes. Make the complete graph/trend available in Patient Profile, while the
note gets concise at-point-of-entry context.

### P2.3 Reduce initial cognitive load

Initial visit default sequence:

1. presenting problem, function priority, region/laterality, onset;
2. symptom profile and relevant history;
3. safety checkpoint;
4. condition-aware objective defaults;
5. clinical synthesis;
6. intervention, HEP, and plan.

Keep deep/less-common domains opt-in. Avoid showing pain fields for non-pain
presentations and avoid displaying unaccepted template content as if it were
patient data.

### P2.4 Standardized instruments governance

For every questionnaire or score, document:

- full instrument/version and licensing status;
- intended population and use case;
- scoring and interpretation source;
- minimum clinically important difference or meaningful-change approach, when
  supported;
- whether a displayed subset is non-standard and must not be interpreted as the
  full instrument.

Never present an abbreviated, locally modified instrument as equivalent to a
validated complete tool.

### P2.5 Audit and note integrity

Implement draft versus signed-note states, authorship/authentication, note
timestamps, amendment history, and a reliable preview/PDF snapshot. Applied
templates, protocol versions, computed fields, overrides, and safety
dispositions should be retained in the visit snapshot.

---

## Suggested test scenarios

1. Enter a knee assessment, complete ROM/MMT/special tests, then change the
   region to hip. Confirm all existing data is preserved.
2. Select a red flag and attempt to finalize the note. Confirm a safety
   disposition is required and printed.
3. Choose each approved MVP template and confirm the same canonical template
   state drives suggestions, protocol details, plan phase, preview, and PDF.
4. Create a non-pain presentation (for example weakness). Confirm pain fields
   are not required and neuro workflow behaves according to the final product
   decision.
5. Add a functional priority, PSFS item, goal, intervention, and HEP. Confirm
   links can be carried through the Clinical Impression and Plan without
   duplicate entry.
6. Complete an initial note, reopen a follow-up, and confirm last values,
   protocol version, applied safety summary, and prior goals are appropriately
   available.

## Clinical governance note

This product should support—not replace—therapist clinical judgement. Have the
final question sets, red-flag escalation options, protocol content, outcome
measure implementations, and documentation/export requirements reviewed by the
clinic’s clinical governance lead and applicable local regulatory/payer
requirements before production release.

