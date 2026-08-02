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

## Standalone attachment assumed a source authority that does not exist — 2026-08-02

- Symptom: the plan required attaching a standalone typed EF output, but the current v2 Run, TaskSpec, Attempt and Result schemas all require exact PI scope.
- Root cause: D-09 preserved an independent exploration concept while Pack A/C implemented only the PI-bound typed execution/scientific spine; legacy standalone rows are simultaneously barred by D-08.
- What was tried: inventorying legacy result/generic records and current v2 scientific ingress as potential sources. Legacy would create a forbidden trust migration, and v2 rows are already attached by construction.
- Fix/workaround: block Phase 3 implementation until a typed source model is approved. Prefer attaching an exploration specification and performing a new PI-bound execution; keep the prior output diagnostic-only.
- Prevention: before planning an attachment or migration command, prove that both source and destination have authoritative typed identities and that the source is eligible under legacy/cutover policy.
