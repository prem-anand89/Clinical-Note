# Core Assessment payload — draft extension (for Phase 2 of the port)

Draft only. Derived from what `clinical-note.html` actually collects as of Phase 12. The live type is `CoreAssessmentPayload` in thera-net `src/domain/coreAssessment.ts` (`PAYLOAD_VERSION = '1.3'`). Target: `'1.4'` with a pure `upgrade()` so v1.3 notes load unchanged. Do not store derived values (scores, levels, grades) — recompute from inputs.

## Reconcile with v1.3 before adding anything
- **Red / yellow flag lists — DECIDED (2026-10-21):** the prototype lists replace v1.3's `RED_FLAG_ITEMS` / `YELLOW_FLAG_ITEMS` for new notes. Red flags are 12 screening questions (two shown only for neck / head regions — store `regions` with the item list); yellow flags are 6 items on a 3-step scale (None / Some concern / Significant). v1.3 notes keep their own labels and keep opening in the legacy editor, so no data migration is needed; reporting across both needs a label map.
- **Regions:** prototype adds "Head / Face" to the 9 `ANATOMICAL_REGIONS`.
- **Red flag answer states:** prototype `No | Yes | NA | Unknown` (v1.3: `yes | no | not-assessed`).

## New / changed fields

```ts
// Screening
redFlagBulkNegative: boolean;               // true only if bulk shortcut used and confirmed
redFlagAttested: boolean;
disposition?: {                             // required when any red flag === 'Yes'
  rationale: string;
  action: 'Emergency escalation' | 'Urgent referral' | 'Routine referral'
        | 'GP / specialist contact' | 'Monitor with safety-netting' | 'Other';
  clinicianContacted?: string;
  contactedAt?: string;                     // ISO datetime
  treatmentStatus: 'Deferred' | 'Modified' | 'Proceeded';
  patientAdvice: string;
};

// Template (one per note)
template?: {
  id: 'postop-tkr' | 'postop-acl' | 'postop-thr' | 'postop-rc' | 'postop-lumbar'
    | 'postop-achilles' | 'nonop-clbp' | 'nonop-sis' | 'nonop-ankle' | 'nonop-cervrad';
  version: string;                          // 'mvp-1'
  source: 'auto' | 'manual';                // 'auto' = suggested then accepted
};

// Chief complaint
functionalPriority: { returnTo: string; mostLimited: string };   // PSFS items live in psfs[]
psfs: { activity: string; baseline?: number; baselineLocked?: boolean; current?: number }[]; // max 5

// Clinical impression additions
impression: { evidenceFor?: string; evidenceAgainst?: string; precautions?: string /* + existing */ };

// Intervention: replaces string[] chips as the record of treatment delivered
interventionDosage: {
  category: 'Manual therapy' | 'Modality' | 'Therapeutic exercise';
  type: string;                             // chip name
  response?: 'Improved' | 'No change' | 'Worse';
  // manual
  region?: string; grade?: 'I'|'II'|'III'|'IV'|'V'; duration?: string;
  // modality
  parameters?: string; location?: string; contraindicationsChecked?: boolean;
  // exercise
  exercise?: string; sets?: string; reps?: string; load?: string;
  rpe?: string; assistance?: string;
}[];

// HEP
hep: { name: string; sets?: string; reps?: string; hold?: string; load?: string;
       frequency?: 'Daily'|'2x/day'|'EOD'|'PRN'; cue?: string; progression?: string;
       teachBack?: 'Correct'|'Needed cues'|'Unable'; adherenceBarrier?: string;
       category?: string }[];

// Goals / plan
goals: { description: string; linkedPriority?: string; measureBaseline?: string; target?: string;
         targetDate?: string; term: 'Short-term'|'Long-term';
         status: 'Active'|'Progressing'|'Met'|'Revised'|'Discontinued';
         reason?: string /* required when Revised/Discontinued */ }[];
plan: { progressionCriteria?: string /* + existing frequency, duration, reassessment, outcome measure, discharge, referral */ };

// Objective method (optional)
objectiveMethod?: Record<'rom'|'mmt', { position?: string; symptomResponse?: string; equipment: string[] }>;
```

## Modules (from the handoff, shapes still to be fixed in Phase 2)
- `fmSegments`, `fmMoVe`, `fmHistory` per handoff §4.
- **Group A:** ISNCSCI inputs only — sensory `{level: {rLT, rPP, lLT, lPP}}` over C2…S4-5 (`0|1|2|NT`), key muscles `{C5…S1: {r,l}}` (`0–5|NT`), `vac`, `dap` (`Yes|No|NT`). Other tools: Fugl-Meyer subtotals, Hoehn & Yahr stage, MS dermatomal grid, etc. Needs its own table per delta spec §30.3 (not `neuro_spinal_assessments`).
- **Specialty modules** (Facial Palsy, Vestibular, Cardiothoracic) are Patient-Profile modules, not note payload — separate tables (`facial_palsy_assessments` exists/dormant; vestibular and cardiothoracic to create).
- Questionnaires: `responses` jsonb per instrument + accepted/skipped state; scores computed, not stored.


## Additions from the lean assessment build (branch `lean-assessment`)
Same rule: store inputs, never derived text. New / changed:

```ts
// Notes (free text, optional)
notes: { subjective?: string; objective?: string };               // getAssessmentNotes()

// Explicit statements (booleans — never stored as fake normal values)
statements: {
  noRelevantHistory: boolean;                                      // cancelled automatically once history is entered
  screenedNoOtherDeficits: boolean;                                // Objective
  noRedFlagsReviewed: boolean;                                     // the gate button; with redFlagBulkNegative (below) for how it was set
};                                                                 // getAssessmentFlags()

// Objective: rows exist ONLY for items the clinician tapped; untested suggestions are not stored.
// (ROM/MMT/special-test rows keep their current shapes; region changes never remove an entered row.)

// Psychosocial (yellow flags) now captured in Chief Complaint; unchanged shape, 3-step scale
psychosocial: { label: string; level: 'None' | 'Some concern' | 'Significant' }[];

// Treatment: every selected treatment is recorded; dose fields appear only if the clinician opened "+ dose"
interventionDosage: /* as above; entries may be { category, type } only */

// HEP rows (two-speed UI; same fields)                            // getHepRows()
hep: { name; sets; reps; hold; load; frequency; cue; progression; teachBack; adherenceBarrier; category }[];

// Plan
plan: { nextVisitMemo?: string /* shown at the top of the next session note */ };
goals: /* a one-line goal creates a normal goal row (description only until detail is added) */

// ⭐ Pinned findings (test-retest markers)                         // getPinnedFindings()
// Ids are stable and shared with the session note: `${kind}:${regionSlug}:${nameSlug}`, kind = 'rom' | 'mmt' | 'func'
// (e.g. 'rom:knee:flexion'). Max 6. Only the ids are stored; baseline values already live in the objective rows.
pinnedFindingIds: string[];
```
Session note (v1.1, additive): a measure that came from a pin carries `findingId` (the assessment id above). Measures without an entry in the id map use the finding id as their own `id` plus a `label`. The map from finding ids to session measure ids (`rom:knee:flexion` → `knee_flex`, …) lives in the session-note config, not in the payload.
Removed fields (do not port): the second `precautions` textarea in Load-management (Impression `ci-precautions` is the only home); the "Anticoagulants" medication chip (Safety's blood-thinner answer is the only source); duplicate "Neuromuscular" contributing-factor chips; the separate Palpation card (its fields now live under Observation & palpation, ids unchanged).
