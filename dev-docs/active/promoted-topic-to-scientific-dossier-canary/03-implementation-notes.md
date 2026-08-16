# 03 Implementation Notes

## Status
- Current status: `done`
- Last updated: 2026-08-17

## What changed
- Created and registered T-137 under `M-001 > F-001 > R-009 + R-012 + R-013`.
- Reworked the initial compliance-heavy roadmap after the user clarified the project design principles.
- Replaced five phases/four gates with `Prepare → Run → Accept`.
- Replaced separate topic/PAI authorization with existing product defaults plus one real-PAI/temporary-credential authorization.
- Replaced exhaustive manifest/census and full-chain replay with semantic spine, key lineage, scoped effects, and resume-first recovery.
- Implemented and ran the fixed coordinator through the pre-PAI boundary. Product/database authority was created only for the new T-137 lineage; no provider resource or paid Job was created.
- Fixed the WorkOrder v1/v2 route schema by replacing mutating `oneOf` validation with a version-discriminated `if/then/else` schema, with shared-contract and real Fastify route regressions.
- Implemented and ran the bounded real-PAI and evidence-to-Dossier continuations. The terminal owner state is 2 successful Attempts, 2 Results, 1 passed report, 1 EvidenceCandidate, 1 REU, 1 Closure, 1 Packet, 1 supported Claim, and 1 trace-complete `ready_for_writing` Dossier.
- Fixed terminal recovery after the real run: PAI preflight now reports the closed/consumed state, PAI execute rejects a closed Cycle before credential access, and acceptance replay no longer requires an OpenAI key when the Dossier already exists.

## Pre-PAI implementation
- Added `apps/backend/scripts/t137-scientific-dossier-canary-profile.ts` as the single fixed semantic profile and a focused unit test for source roles, metric, direction, thresholds, and claim exclusions.
- Extended the existing Topic real E2E and V1B WorkflowHarness runner with the named `t137_scifact_retrieval_depth` semantic mode.
- T-137 Topic mode uses exactly `LIT-0328` support, `LIT-0190` baseline, `LIT-0252` challenge, and `LIT-0765` context; it skips unrelated negative probes and downstream stress cases.
- Added `apps/backend/scripts/run-t137-scientific-dossier-preflight.ts` for PI bootstrap, motive/evidence-board/validation admission, exact WorkOrder admission, relay, EF Run readback, and zero post-PAI write assertions.
- Added `.ai/scripts/t137-scientific-dossier-canary.mjs` as a two-stage resume-first coordinator and `pnpm t137:pre-pai` as its sole command.
- Added `apps/backend/scripts/run-t137-scientific-dossier-live-window.ts` and `pnpm t137:pai` for the exact two-Job PAI→Result→Evidence→REU window.
- Added `apps/backend/scripts/run-t137-scientific-dossier-acceptance.ts` and `pnpm t137:accept` for ResultAnalysis→Closure→Packet→Claim→Dossier, with stepwise deterministic-id recovery.
- Reused the active immutable SciFact protocol, readiness attestation, metric revision, and execution bundle. No T-136 Run, Result, EvidenceCandidate, Claim, or Dossier is an input.
- Actual fresh anchors: PaperProject `P429`, ImplementationProject `implementation_project_4ccca1d1-6782-413a-a6fd-a8c56ab9d40b`, WorkOrder revision `pi_experiment_revision_v2_180802cd-d195-444f-a3e5-ab7c869c1f39`, EF Run `ef_run_v2_0369f26c-d784-4c5c-b8dd-7c9b7008bc1c`.

## Prepare discovery
- Read-only inventory found 410/410 literature rows hard-eligible in `ai-rag-finetuning-2022-2026` and an existing 16-item role-balanced sample set in `ready_with_warning` state.
- Selected `LIT-0328` as the primary source, with `LIT-0190`, `LIT-0252`, and `LIT-0765` supplying benchmark, challenge, and measurement context.
- Locked the scientific question to the existing SciFact exact-token two-cell shape: `top-k 10` versus `top-k 5`, server-owned `micro_recall_ppm`, with a `+/-10,000 ppm` directional decision boundary.
- Rejected the existing P313 PaperProject as an input: its question concerns WorkflowHarness replay and does not semantically support the SciFact retrieval-depth experiment.
- Rejected direct reuse of the current Topic Selection V1B harness and PI/EF product-landing scripts: they embed fixture or T128/T132/T136-specific content.
- Confirmed the backend already exposes the required Topic bridge/PaperProject, PI bootstrap/admission, EF real-provider/scientific-validation, ResultAnalysis, Packet, Claim, and Dossier services.
- Decided to add one fixed-sequence task-local coordinator. It will create fresh T-137 authority through existing writers and use persisted owner state for resume; it will not introduce a product workflow abstraction.

## Files/modules touched
- `dev-docs/active/promoted-topic-to-scientific-dossier-canary/`
- `.ai/project/main/` generated governance registration from task creation.
- `.ai/scripts/topic-selection-real-e2e.mjs`
- `.ai/scripts/topic-selection-v1b-harness-e2e.mjs`
- `.ai/scripts/t137-scientific-dossier-canary.mjs`
- `apps/backend/scripts/t137-scientific-dossier-canary-profile.ts`
- `apps/backend/scripts/t137-scientific-dossier-canary-profile.unit.test.ts`
- `apps/backend/scripts/run-t137-scientific-dossier-preflight.ts`
- `apps/backend/scripts/run-t137-scientific-dossier-live-window.ts`
- `apps/backend/scripts/run-t137-scientific-dossier-acceptance.ts`
- `packages/shared/src/research-lifecycle/paper-implementation-experiment-v2-contracts.ts`
- `packages/shared/src/research-lifecycle/experiment-v2-contracts.schema.test.ts`
- `apps/backend/src/routes/paper-implementation-experiment-v2-routes.integration.test.ts`
- `apps/backend/tsconfig.experiment-foundation-scripts.json`
- `package.json`

## Decisions and tradeoffs
- Decision: semantic continuity is primary; technical trace is supporting evidence.
  - Rationale: LLMs can carry research meaning across modules, while servers should own technical identity and hard authority.
- Decision: validate hard invariants once at their owner boundary.
  - Rationale: repeated checks and caller-carried hashes add complexity without improving the normal path.
- Decision: use one compact `ExecutionPolicy` only for real PAI.
  - Rationale: ordinary configured LLM calls already have product profiles and budgets.
- Decision: resume completed work instead of replaying the entire chain.
  - Rationale: this is both more robust and easier for a human or LLM to follow.
- Decision: keep a concise `LineageSummary`, not a second manifest authority.
  - Rationale: the domain models remain the source of truth.
- Decision: share immutable SciFact dependencies but create fresh T-137 workflow authority.
  - Rationale: duplicating byte-identical datasets/protocol/bundle would add names, copies, and owners without improving isolation; historical scientific conclusions remain excluded.
- Decision: keep MotiveEvidenceBoard because the existing ValidationCycle gate requires a current trace-ready board.
  - Rationale: it is owner-required product state, not optional canary ceremony.
- Decision: discriminate the WorkOrder union before validating its selected version.
  - Rationale: Fastify's default `removeAdditional` behavior can mutate branches while evaluating `oneOf`; selecting one branch from `work_order_schema_version` keeps one contract and one HTTP writer without weakening either version.
- Decision: preserve the already-created T-137 admission through exact owner readback, while routing every fresh admission through HTTP.
  - Rationale: replaying that historical row through the corrected route conflicts because its original server actor predates the adapter fix. Exact branch/revision/cell comparison avoids duplicate authority and keeps the repaired HTTP path as the only new writer.
- Decision: split continuation into `t137:pai` and `t137:accept`.
  - Rationale: cloud credentials must be absent during ResultAnalysis/Closure, and the durable REU is the natural recovery boundary. Two commands keep this distinction visible without a workflow engine.

## Deviations from the initial roadmap
- Removed standalone offline-package and upstream/downstream gate phases.
- Removed protected-table census and exhaustive id/hash/sequence requirements.
- Removed per-external-stage authorization and byte-identical full package regeneration as general requirements.
- Kept server-owned science, paid-job idempotency, immutable authority, claim ceiling, credential cleanup, and historical-authority isolation.

## Known issues / follow-ups
- No functional follow-up remains inside T-137.
- The issued provider-side STS has no locally recoverable copy and expires automatically at `2026-08-16T23:39:13Z`; no new credential or PAI run is needed.
- Archive movement remains a separate governance action and requires explicit approval.
- Landing convention: keep the verified implementation in an intentional T-137 commit with the required task trailer; no push is part of this task.

## Next three actions
1. Preserve the current Run/Closure/Dossier authority; do not issue another T-137 STS or PAI execution.
2. For read-only inspection, run `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm t137:pai --mode offline-preflight` and `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm t137:accept --mode offline-preflight`.
3. Archive `dev-docs/active/promoted-topic-to-scientific-dossier-canary/` only after explicit approval; no code follow-up is required first.

## Pitfalls / dead ends
- Keep the append-only detail in `05-pitfalls.md`.
