# 05 Pitfalls — Do Not Repeat

## Scope split obscured by historical T-132 product framing — 2026-07-30

- Symptom: four open audit findings were described as parked while older T-132 text still said they had to be resolved before T-132 could finish.
- Root cause: a personal PAI completion override was added without moving residual productization ownership into a named task.
- What was tried: retaining the findings in T-132 as non-current queue items. This preserved history but left completion ownership ambiguous.
- Fix/workaround: create T-134, transfer EF-P06/P14/P15 and semantic EF-P21 explicitly, and state that T-134 does not block T-132.
- Prevention: every scope reduction must name the receiving task, update both tasks' completion definitions and synchronize the project registry.

## Do-not-repeat summary

- Do not reintroduce desktop UI to close any T-134 finding.
- Do not treat structured lineage plus an embedding score as a new truth or control authority.
- Do not repair legacy null bindings through silent backfill or trust upgrade.
- Do not attach standalone EF output by identity-only linkage; full project/readiness/validation revalidation is mandatory.
- Do not split promotion decision, canonicalization, Candidate and outbox into partial commits.
