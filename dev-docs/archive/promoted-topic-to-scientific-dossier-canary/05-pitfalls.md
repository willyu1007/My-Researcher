# 05 Pitfalls (do not repeat)

This file prevents repeated mistakes within T-137. Add resolved failures and dead ends append-only.

## Do-not-repeat summary
- Do not treat separate T-128 and T-136 successes as one continuous lineage.
- Do not reopen T-136, hide work in T-043, or start T-129 C-2/C-3.
- Do not bind an arbitrary topic to an unrelated executable experiment merely because refs validate.
- Do not turn every semantic handoff into caller-authored ids, hashes, or configuration parameters.
- Do not add approval for ordinary configured LLM calls; keep one authorization for real PAI/temporary credentials.
- Do not repeat the same hard validation in every module; validate once at the owning authority boundary.
- Do not replay the complete chain when durable progress exists; resume only the incomplete step.
- Do not build a generic workflow engine, exhaustive manifest, or protected-table census for this canary.
- Do not trust-upgrade T-132 diagnostic output, reuse T-136 authority, or accept caller-authored scientific values.
- Do not use Node 26 loader failures as evidence of business regression; use Node 20 where required.
- Do not commit secrets or raw large execution dumps.
- Do not reuse P313 or the V1B fixture harness merely because their technical bridge records are valid; their research semantics do not match this canary.
- Do not invent new semantic enum values inside existing contracts; keep rich meaning in text fields and use the contract's small controlled vocabulary.
- Do not omit MotiveEvidenceBoard from PI preflight; ValidationCycle admission requires a current trace-ready board.
- The prior warning against HTTP v2 WorkOrder admission is superseded: the discriminated schema is fixed and regression-tested. Fresh admissions must use the HTTP writer; only the historical T-137 row uses exact owner readback.
- Do not require provider or LLM credentials merely to read or replay a terminal owner state; branch on the persisted Closure/Dossier before credential checks.
- Browser downloads may default to broad file permissions. Move credential material immediately to a task-scoped `0600` temporary path, then overwrite and remove both local and Cloud Shell copies.

## Pitfall log (append-only)

### 2026-08-16 — Initial plan overfit T-136 ceremony
- Symptom: T-137 proposed five phases, four gates, separate provider approvals, exhaustive manifests/censuses, and full-chain exact replay.
- Context: the task reused strong T-136 safety patterns before applying the project's simplicity and LLM-semantic-flow principles.
- What we tried: a compliance-first canary plan with exact package and effect checks at most transitions.
- Why it failed: it optimized rare failure auditing over the normal product path, enlarged the parameter surface, and made the flow harder for an LLM or operator to follow.
- Fix: reduce to `Prepare → Run → Accept`, one real-PAI authorization, semantic handoffs, key lineage, focused hard checks, and resume-first recovery.
- Prevention: start future cross-module plans from the semantic happy path; add strict mechanics only at authority or irreversible-effect boundaries.
- References: T-137 roadmap revision and 2026-08-16 user design-principle alignment.

### 2026-08-16 — Existing E2E records are technically connected but semantically incompatible
- Symptom: P313 has a valid Topic-to-PaperProject bridge, and existing runners can reach PI/EF records, so they initially look reusable.
- Context: T-137 needs one continuous literature-backed SciFact retrieval-depth question.
- What we inspected: the current P313 question/evaluation plan, Topic Selection V1B harness mode, and PI/EF product-landing constants.
- Why direct reuse fails: P313 and V1B describe WorkflowHarness replay, while the landing scripts embed P313/T132/T136-specific motives and authority. Grafting the SciFact experiment onto those records would preserve ids but lose research meaning.
- Fix: create fresh T-137 product authority through existing writers, driven by one fixed semantic intent and a thin task-local coordinator.
- Prevention: verify source→question→experiment meaning before treating a valid technical bridge as reusable lineage.

### 2026-08-17 — T-137 semantic draft used vocabulary outside the N6 contract
- Symptom: the first V1B run reached N6 and failed with `N6_TOPIC_QUESTION_CANDIDATE_DRAFT_INVALID`.
- Cause: the draft used `comparative_empirical`, `bounded_empirical_finding`, `metric_threshold`, and `after_experiment_result` where the existing contract expects its controlled question, falsification, and timing enums.
- Fix: retain the exact scientific meaning in semantic text, use `benchmark`, `contradicted_by_evidence`, and `on_new_evidence` for the controlled fields, then start a fresh canary attempt because the failed WorkflowHarness prefix is immutable history.
- Prevention: read the owning contract vocabulary before adding a new semantic profile; do not enlarge enums for one task.

### 2026-08-17 — PI ValidationCycle requires a MotiveEvidenceBoard
- Symptom: validation-cycle draft creation returned `GATE_CONSTRAINT_FAILED` after motive admission.
- Cause: the simplified plan incorrectly treated the board as optional, but the existing PI owner gate requires a current trace-ready `MotiveEvidenceBoardVersion`.
- Fix: create one board with four traced bindings that preserve support, challenge, baseline/qualify, and context roles; keep scientific result evidence absent until execution.
- Prevention: simplify optional ceremony, not owner-required state transitions.

### 2026-08-17 — Fastify default AJV mutates the v1/v2 WorkOrder union
- Symptom: the v2 admission request passed the shared schema under non-mutating AJV but the HTTP route returned `V2_TYPED_SNAPSHOT_INVALID` before the controller.
- Cause: Fastify's default `removeAdditional` behavior evaluates the v1/v2 `oneOf` destructively; the v1 branch strips v2-only fields before the v2 branch evaluates.
- Fix for this canary: validate the command with the shared schema using `removeAdditional: false`, then call the existing canonical admission domain service. No repository write or alternate authority writer was added.
- Prevention: do not route executable v2 admission through a mutating union validator. Fix the adapter in a separate focused change if HTTP v2 admission becomes required.

### 2026-08-17 — Fastify WorkOrder union issue resolved
- Resolution: replaced `oneOf` with `work_order_schema_version`-discriminated `if/then/else`, so only one deep schema is evaluated under Fastify's mutating AJV defaults.
- Evidence: shared schema tests accept valid v1/v2 and reject cross-version fields; the actual route test proves executable v2 fields arrive unchanged at the controller.
- Historical-row handling: the already-created T-137 admission keeps its original actor lineage and is recovered only after exact owner-side branch/revision/cell comparison. New missing admissions use HTTP.
- Prevention: prefer discriminator-led validation whenever branch evaluation can mutate input; do not add a second writer as a validator workaround.

### 2026-08-17 — Terminal preflights initially treated completion as an error
- Symptom: after the real acceptance closed the ValidationCycle, the PAI offline preflight still asserted that the Cycle must be open; acceptance offline still reported that continuation was ready after the Dossier existed.
- Cause: execution eligibility checks ran before the read-only terminal-state branch, and the acceptance status considered evidence readiness but not the exact Dossier owner state.
- Fix: PAI preflight now reports `scientific_evidence_consumed_by_closed_cycle`, PAI execute rejects the closed Cycle before credential access, and acceptance preflight reports `ready_for_writing` from the exact Dossier. Terminal acceptance replay does not require an OpenAI key.
- Prevention: read-only status commands must recognize terminal owner state before checking credentials or runnable-state gates.

### 2026-08-17 — Browser download permissions were broader than the credential policy
- Symptom: the browser-created STS download initially had mode `0644`.
- Fix: the file was moved immediately from Downloads to a task-scoped OS temporary directory, changed to `0600`, used by one bounded child process, overwritten, and removed. The Cloud Shell source was also overwritten and removed after explicit confirmation.
- Prevention: never execute directly from a browser download location and never retain a browser/cloud credential file after the bounded process exits.
