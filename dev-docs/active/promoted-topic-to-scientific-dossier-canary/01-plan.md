# 01 Plan

## Stages
1. Prepare — select the source and form a semantically executable research intent.
2. Run — drive the existing product path with one real-PAI authorization and resume-first recovery.
3. Accept — check semantic coherence and key authority boundaries, then record a concise lineage summary.

## Prepare
1. Read current persisted literature/title-card state and apply existing hard eligibility rules.
2. Use semantic matching to choose the best source/topic for an existing executable two-cell experiment; expose the rationale and permit optional override.
3. Form one task-level `ResearchIntent` from the research goal, scope/constraints, and desired evidence.
4. Derive an `ExperimentQuestion` that genuinely tests that intent and can be expressed through existing PI/EF artifacts.
5. Trace the shortest supported Topic → PaperProject → PI → EF → Dossier call path.
6. Prefer direct composition. Add a thin coordinator only if existing commands cannot carry the semantic state and resume cleanly.
7. Stop if the solution needs a new schema, authority, API, UI, provider, or automatic asset-discovery system.

### Prepare acceptance
- One default source/topic/experiment path is selected with an LLM-readable rationale.
- Every semantic value has a clear assigner and consumer.
- No paid external call, credential read, capability change, or product mutation occurs during discovery.

### Prepare result — accepted 2026-08-16
- Existing hard eligibility returned 410 eligible rows in scope `ai-rag-finetuning-2022-2026`; the ready-with-warning 16-item role-balanced sample remains usable for semantic selection.
- Default source lane:
  - primary: `LIT-0328` — retrieval-depth quality/cost/latency tradeoff
  - benchmark context: `LIT-0190` — adaptive RAG routing benchmark
  - challenge: `LIT-0252` — limits of nearest-neighbor meaning
  - measurement guardrail: `LIT-0765` — fixed-budget RAG evaluation discipline
- `ResearchIntent`: determine whether increasing exact-token retrieval depth from `top-k 5` to `top-k 10` materially improves positive-judgment micro recall on SciFact, holding corpus, queries/qrels, parser, evaluator, provider/runtime, and every non-top-k input fixed.
- `ExperimentQuestion`: under that controlled SciFact setup, is `micro_recall_ppm(top-k 10) - micro_recall_ppm(top-k 5)` at least `10,000 ppm`, at most `-10,000 ppm`, or inconclusive?
- Claim ceiling: this canary may conclude only the registered SciFact recall comparison. It may not claim general RAG superiority or a cost improvement.
- Direct composition is rejected: the existing Topic Selection V1B E2E is fixture-semantic, the current product PaperProject is about WorkflowHarness replay, and existing PI/EF landing scripts carry P313/T132/T136-specific meaning.
- A thin coordinator is required. It will use one fixed sequence, read progress from existing domain owners, and create no workflow schema, configurable DAG, public API, or parallel authority.
- Discovery performed only local read-only source/code/database inspection. Prisma consumed the existing local DB connection configuration; no secret value was displayed, copied, changed, or persisted, and no provider call, capability change, or product write occurred.

## Run
1. [x] Run the existing non-debate Topic Selection product path and existing promotion authority to create PaperProject.
2. [x] Bootstrap PI and derive/admit the ExperimentQuestion and WorkOrder through existing writers.
3. [x] Materialize the existing two-cell EF Run and resolve all technical ids/hashes server-side.
4. [x] Use existing configured semantic runtime paths without a new per-step approval; no external provider LLM was needed for the fixed canary profile.
5. [x] Lock one compact `ExecutionPolicy` with a 2-Job ceiling, CNY 50 ceiling, execute-time temporary credential expiry, and an at-most-48-minute window that stops at least 6 minutes before expiry; the user's standing authorization covers this bounded next implementation.
6. [x] Execute, collect server-owned Results, validate evidence, and continue through REU, ResultAnalysis, Closure, Packet, Claim, and Dossier.
7. [x] After an interruption or completed boundary, derive the next action from persisted owner summaries and run only the incomplete step.
8. [x] Restore process-scoped capabilities and remove temporary credentials after the external window.

### Pre-PAI result — accepted 2026-08-17
- `pnpm t137:pre-pai` ran the fixed four-source semantic profile through Topic V1A/V1B/V1C, PaperProject intake, PI motive/evidence-board/validation admission, v2 WorkOrder admission, integration relay, and EF immutable Run materialization.
- The run stopped before provider payload creation. All five scoped post-boundary counts are zero.
- A second invocation consumed the persisted passed summaries and returned the same anchors without rerunning either stage.

### Continuation implementation — 2026-08-17
- `pnpm t137:pai --mode offline-preflight` passes against the exact T-137 Run and reports `ready_waiting_for_temporary_credentials` with zero cloud calls, database writes, or capability changes.
- `pnpm t137:pai --mode execute` reads credentials before enabling capabilities or creating provider state, limits `CreateJob` to the two existing cells, resumes the same business key, generates server-owned Results, validates one scientific batch, and relays one trusted REU.
- `pnpm t137:accept --mode offline-preflight` passes and reports `waiting_for_real_scientific_evidence`; the execute path resumes ResultAnalysis, creates the future Packet trace, closes the Cycle, materializes the Packet, and creates one supported Claim plus one trace-complete `ready_for_writing` Dossier.
- A no-credential execute probe failed before any product or provider effect; immediate owner-state readback remained at zero Attempts, Results, reports, candidates, and REUs.

### Real execution result — accepted 2026-08-17
- One 3,600-second STS session for `pea-m7-canary-controller` used a session policy narrowed to the exact workspace, runtime role, PAI actions, image read, caller identity, and current Run output prefix. No RAM role, trust, or policy changed.
- `pnpm t137:pai --mode execute` made exactly two `CreateJob` calls and completed 2 Attempts, 2 server-owned Results, 1 passed report, 1 EvidenceCandidate, and 1 trusted REU. Relay reached idle with zero failures and the built-in replay added zero rows.
- `pnpm t137:accept --mode execute` created the admitted ResultAnalysis records, Closure, Packet, supported moderate Claim, and trace-complete `ready_for_writing` Dossier.
- The registered scientific fact is `top-k 10 - top-k 5 = +61,947 ppm`, which supports the bounded SciFact expectation at the `+10,000 ppm` threshold.
- Local and Cloud Shell credential files were overwritten and removed. Product capabilities are at their resting defaults and scoped integration outboxes are zero.
- Terminal replay is owner-state-driven: PAI execute refuses the closed Cycle, both offline commands report terminal state, and acceptance execute replays without an OpenAI key or new authority writes.

### Run acceptance
- One semantic question remains consistent from Topic through Claim.
- No user or LLM manually copies technical refs or supplies scientific values.
- Paid Job creation and immutable scientific writes are idempotent.
- A restart does not repeat a completed provider Job or accepted authority write.

## Accept
1. Ask the semantic verifier to explain source relevance, why the experiment tests the question, what the evidence says, and why the Claim strength is justified.
2. Re-read only the key persisted anchors: Literature/TitleCard, PaperProject, WorkOrder, Run/Attempt/Result, EvidenceCandidate/REU, Closure, and Dossier.
3. Verify hard invariants at those boundaries and rely on existing domain services for internal details.
4. Record scoped counts for paid Jobs and new key authority rows; do not scan every protected table.
5. Produce a concise `LineageSummary`, cleanup result, and changed-surface verification record.
6. Run targeted tests/typechecks and only the regression breadth justified by actual changes.

### Accept acceptance
- The Dossier is `ready_for_writing`, trace-complete, and semantically supported.
- `LineageSummary` is sufficient for a fresh LLM or human to follow the flow without domain payload duplication.
- Capabilities rest at defaults, credentials are absent, and repository evidence is concise and secret-free.

## Parameters and ownership

| Value | Assigner | Consumer |
|---|---|---|
| Research goal and constraints | User context plus LLM draft | Topic Selection and PI motive/question generation |
| Source/topic choice and rationale | Existing eligibility filters plus LLM semantic matcher | Topic Selection product run |
| ExperimentQuestion and success meaning | PI semantic stage under the promoted topic | WorkOrder and EF protocol/run planning |
| Scientific observations | EF server-owned Result generation | Validation, EvidenceCandidate, PI evidence trust |
| Evidence interpretation | ResultAnalysis LLM proposal under server source context | Closure and Claim/Dossier gates |
| ExecutionPolicy | Existing defaults plus one operator authorization | Real PAI execution adapter only |
| Technical ids/hashes | Owning server/repository | Next owner and final LineageSummary |

## Risks and mitigations
- Semantic mismatch despite valid references: require a short source→question→experiment→claim rationale and existing claim ceilings.
- Coordinator overgrowth: no generic DAG or configurable step language; sequence existing calls only.
- Duplicate paid work: keep exact idempotency at Job and scientific-authority writers.
- Exceptional recovery obscures normal use: one default next-action/resume command, detailed diagnostics only on failure.
- Scope expansion: stop and request a separate decision for schema/authority/API/UI/provider changes.
- Node runtime mismatch: use Node 20 for verification lanes that depend on `ts-node/esm`.
