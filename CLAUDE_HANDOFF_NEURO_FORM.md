# Plan: one Neuro Assessment module with condition-specific expansions (prototype first)

Status: **N0–N4 ALL DONE (30 Oct)** · next: therapist try-out of the form; clinician review of the tool→condition table (§6 item 5) · Written 2026-10-30 · Scope: `/home/theranet/Clinical-Note` only.
Owner direction (30 Oct): the six neuro conditions are **one module**; build **one Neuro Assessment form**, and let each condition **expand** that form with its own parameters. "Additional sections" (Vitals, Body Chart, PSFS, Gait, Palpation, Questionnaires, VOMS, Pain Science, Sports Profile) are part of Core and stay inline — they are not tabs (Questionnaires moved back inline the same day).

## 1. What exists today (verified in `clinical-note.html`)
- **Six exclusive chips** (Known diagnosis → "Neuro / systemic"): Stroke/TBI, Paraplegia/SCI, Parkinson's, MS, Peripheral Neuropathy, Concussion. Choosing one shows `#sec-group-a`; choosing another **wipes and rebuilds** it (`renderGroupA` starts with `groupABody.innerHTML = ''`), so **everything recorded is lost on a switch**.
- **Condition → tool map** (`GROUP_A_TOOL_MAP`), each tool built from scratch per condition:

| Tool | Stroke/TBI | SCI | Parkinson's | MS | Periph. neuropathy | Concussion |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Reflexes (UMN screen) | ● | supplementary | ● | ● | ● | ● |
| Tone / spasticity | ● | | ● | | | |
| Motor UMN signs | ● | | | | | |
| Fugl-Meyer | ● | | | | | |
| Coordination / cerebellar | ● | | ● | ● | | |
| Cognitive screen (light) | ● | | | | | ● |
| Hoehn & Yahr | | | ● | | | |
| Sensory — dermatomal (full set) | | | | ● | | |
| Fatigue / relapse | | | | ● | | |
| Sensory — peripheral | | | | | ● | |
| Symptom checklist | | | | | | ● |
| ISNCSCI worksheet (sensory + key muscles + AIS) | | ● | | | | |

  → **Coordination, tone and cognition are the same measure built two or three times.**
- A **separate minimal "Neuro screen"** (Objective, region-driven dermatomes / myotomes / reflexes, suggested only) holds the same kind of data as Group A's base block — two places to enter the same exam.
- Today's tab: one "Neuro: <condition>" tab (30 Oct) hosting that section; MSK Objective collapses behind a banner while it is active.
- Spec context (`archive/theranet-assessment-delta-spec.md` §1, §14.2, §30): Group A is **condition-mapped**, dermatomes default **C5–T1** for cervical/shoulder, data is **episode-level** (`neuro_spinal_assessments`) with a **snapshot into each note**. §1 said "a note section, not a tab" — superseded by the owner's tab decision.

## 2. Target design
**One module, "Neuro Assessment" (tab). One form. Conditions are lenses, not separate forms.**

1. **Condition bar (top of the form).** Multi-select chips — real patients overlap (stroke + Parkinson's, MS + peripheral neuropathy, concussion + cervical). The Known-diagnosis picker's Neuro tab becomes multi-select to match. Tab label: "Neuro: PD + MS".
2. **Common neuro core — always in the form.** One block each, rendered once:
   Sensory (dermatomal) · Motor (key muscles / myotomes) · Reflexes (DTR + UMN signs) · Coordination · Tone. Region-filtered defaults (C5–T1 for cervical/shoulder) stay. SCI swaps the generic sensory + motor blocks for the **ISNCSCI worksheet** (the formal sensory/motor exam), keeping reflexes.
3. **Condition expansions — added to the same form, in clinical order.** Each is a card that appears when any selected condition suggests it:
   Stroke/TBI → Motor UMN, Fugl-Meyer, Cognitive · Parkinson's → Hoehn & Yahr · MS → Fatigue / relapse, full dermatomal set · Peripheral neuropathy → Peripheral sensory (glove/stocking) · Concussion → Symptom checklist, Cognitive (+ link to the VOMS inline section) · SCI → ISNCSCI.
4. **Tool-centric registry, not condition-centric rendering.**
   ```js
   NEURO_TOOLS = [{ id, title, group: 'core'|'condition', build(), suggestedFor: [conditions], replaces?: [ids], recorded(), summary() }]
   ```
   A tool is shown if **any** selected condition suggests it, or the therapist adds it with **"+ Add tool"** (every tool is available to any therapist; the conditions only *suggest*). Each tool exists **once**, however many conditions suggest it.
5. **Nothing is ever wiped.** Tools are built once and shown/hidden. A tool holding data stays visible even if the condition that suggested it is unselected (same rule as the "+" chips: data keeps a block open). Unselecting a condition never deletes entered values.
6. **One home for the basic exam.** The Objective "Neuro screen" and the form's common core become **the same component** with two hosts: inline in Objective when the module is absent, inside the tab when present — **one data source**, no double entry. Adding the module moves what was already entered.
7. **Core ↔ module contract (already built):** Key Findings line ("Neuro: PD + MS · 14 items recorded"; SCI adds the computed AIS), tab badge, print block, optional sign warning. MSK Objective collapse banner keeps working, keyed to "module present + at least one condition selected".

## 3. Payload (draft → `PAYLOAD_SHAPE_DRAFT.md`)
```ts
neuro?: {                       // = modules.neuro, versioned separately ('1.0')
  version: '1.0'
  conditions: NeuroCondition[]  // multi; replaces the single Known-condition string for neuro
  tools: {                      // keyed by tool id, only tools with data
    sensory?: {...}, motor?: {...}, reflexes?: {...}, coordination?: {...}, tone?: {...},
    isncsci?: {...}, fuglMeyer?: {...}, hoehnYahr?: {...}, cognitive?: {...},
    fatigueRelapse?: {...}, peripheralSensory?: {...}, symptomChecklist?: {...}
  }
  notes?: string
}
```
Port: episode-level master in `neuro_spinal_assessments`, per-note snapshot in the payload (spec §1); carry-forward of the last visit for comparison; module entitlement via `can_use_module()`.

## 4. Build order (prototype; each step one local commit, all suites + a new test)
| Step | What | Visible change | Who |
|---|---|---|---|
| **N0** | **Owner decisions** (below) | none | owner |
| **N1** | **Tool registry + build-once rendering.** Extract `NEURO_TOOLS` from `GROUP_A_TOOL_BUILDERS`/`GROUP_A_TOOL_MAP`; render the union once into persistent slots; show/hide instead of rebuild. | Switching condition no longer loses data; shared tools appear once. | Sonnet |
| **N2** | **One module, multi-condition.** One registry entry "Neuro Assessment" (replaces the six); picker's Neuro tab multi-select; tab label from the selection; dock/sidebar show one entry; `summaryLine`/badge/print per tool. | One dock chip; several conditions at once. | Sonnet |
| **N3** | **One form.** Condition bar, common core, expansion cards in order, "+ Add tool", region-filtered dermatome defaults, ISNCSCI swap rule, "has data keeps it visible" rule, one data source for the Objective neuro screen. | The form described in §2. | Sonnet (logic) · Gemini (card layout / spacing, after N3 logic lands) |
| **N4** | **Print, payload, docs.** Per-tool preview blocks (check ISNCSCI renders as a table — the generic collector may not read it), `neuro` payload draft, changelog, `FEATURES`-style notes. | Neuro prints grouped by tool. | Gemini (docs) · Sonnet (print) |

Each step: keep all existing ids that tests read (`#sec-group-a`, `#group-a-body`, `#kc-neuro` chips, `#group-a-hide`); update `step3` (registry 23 → 18, sidebar Neuro group → one item) in the same commit as N2.

## 5. Tests to add
`neuro-form.mjs`: switching/adding conditions keeps data · shared tool appears once for PD+MS · "+ Add tool" works with no condition · unselecting a condition with data keeps its tool · SCI swaps in ISNCSCI and keeps reflexes · Objective neuro screen and the module share data · Key Findings / badge / print per tool · tab × unsets all conditions · phone width.

## 6. Decisions (owner answered 30 Oct: yes to 1–4; 5–7 as recommended)
_Original wording kept below; **1 multi-condition: yes · 2 ISNCSCI replaces generic sensory/motor for SCI: yes · 3 merge the Objective neuro screen into the module core: yes · 4 common core = sensory, motor, reflexes, coordination, tone: yes**._
1. **Multiple conditions at once?** **Yes.**
2. **SCI:** ISNCSCI **replaces** the generic sensory + motor blocks (reflexes stay)? **Yes** — it *is* the formal sensory/motor exam.
3. **Objective "Neuro screen":** merge into the module's common core as one component with two hosts? **Yes** — otherwise the same exam is entered twice.
4. **Common core = sensory, motor, reflexes, coordination, tone** — or should tone and coordination stay condition-only? **Core**, since they apply across conditions (PD, MS, stroke).
5. **Tool suggestions per condition:** a clinician should review the table in §1 (e.g. should Parkinson's also suggest gait/balance? should MS suggest cognitive?). The prototype table is the starting point only.
6. **Cranial nerves, balance, gait:** not built today. **Out of scope** for this plan; "+ Add tool" leaves room for them later (Tinetti and VOMS already exist as inline Additional sections).
7. **Tier tag** "Advanced Module · Clinic tier": keep as the entitlement label for the port.

## 7. Not in this plan
New neuro tools beyond the twelve above; cranial-nerve exam; per-visit trend charts; the real `neuro_spinal_assessments` schema and migration (port phase).
