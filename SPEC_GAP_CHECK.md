# Spec vs prototype gap check (2026-10-23, after the lean merge)

Checked by searching the prototype and probing the page for each item in the delta spec and the P0/P1/P2 review list. "Present" means the control or logic exists in `clinical-note.html`; it does not mean clinically reviewed.

## Present
- P0.1 one template flow (accept/dismiss, manual "Known condition" choice, source recorded as auto/manual); 10 MVP templates; "no template" general path
- P0.2 objective rows survive a region change (tested)
- P0.3 red-flag disposition (action, rationale, clinician contacted, date/time, treatment status, advice), attestation on "all negative", Unknown kept distinct, sign gate
- P0.4 neuro: minimal screen suggested only; Group A with region-filtered dermatomes, ISNCSCI/AIS scoring, Fugl-Meyer, Hoehn & Yahr, MSK Objective collapse
- P1.1 functional priority + "create PSFS item and goal"; P1.2 conditional pain + irritability; P1.3 risk summary; P1.4 method & equipment; P1.5 structured impression; P1.6 dosage; P1.7 structured HEP (incl. teach-back, barrier); P1.8 goals (measure & baseline, target date, term), plan fields, criteria
- Questionnaires (suggested by condition, accept/skip); Tinetti; sports profile; Visceral Manipulation; Rehab Timeline / Recovery Outlook (read-only, only when a template matched); sign & lock

## Not present or only partly present
| Item | State | Where it belongs |
|---|---|---|
| Live preview / print of the whole note as prose (delta §8) | Not built; the only "preview" is the payload view | Port phase (print page) or a prototype step if you want to review it earlier |
| Goal status (active / progressing / met / revised / discontinued) and reason (P1.8) | Missing; goals have term, target date, measure only | Add in prototype (small) |
| Tier 2 "Remove from episode" vs "Hide" (delta §9) | Only "Hide Module" on advanced modules; no episode-level remove | Port phase (needs persistence) |
| "Last visit" prior-value hints (delta §7, P2.2) | Static mock text ("Last Visit: 12 Oct") in a few modules; real values need stored notes | Port phase |
| Auto-apply templates clinic setting (delta §2) | Not in prototype (it is a Settings toggle) | Port phase |
| Protocol version + override reason (P0.5), post-op drift | Out of scope by decision | Later |
| Outcome trend cards in Patient Profile (Y-Balance, 6MWT etc.) | Out of scope by decision | Later |
| Draft/signed states, amendment history, template/protocol snapshot (P2.5) | Sign & lock exists; amendment history and snapshot do not | Port phase |
| Instrument governance table (P2.4: version, licence, MCID) | Not documented | Needs a short doc before port |

Not checked in detail: the field-level fixes in delta §15–29 (Chief Complaint, History, Objective polish). The lean rebuild reorganised these, so they need a walkthrough with a therapist rather than a text search.
