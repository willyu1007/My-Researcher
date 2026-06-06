# 09 Phase 4 Readiness

## Initial Readiness Review Conclusion
- Phase 3 local data migration is a valid foundation for Phase 4:
  - approved local target coverage is `24,773/24,773`.
  - selected active/evidence-ready corpus has `0` missing native vectors.
  - selected active/evidence-ready corpus has `0` open quarantine rows in the current target.
  - public retrieval mode remains `jsonb_only`.
- Initial review result: Phase 4 public read-path cutover was **not implementation-ready yet**.
- Approved next work is to resolve the Phase 4 readiness findings below. Do not promote public reads to `shadow_pgvector`, `pgvector_canary`, or `pgvector_default` until these findings are implemented and verified.

## 2026-06-06 Implementation Update
- Phase 4 readiness findings F1-F6 are now implemented in code/tests.
- Public mode remains `jsonb_only`; no rollout transition has been executed by this implementation.
- Actual cutover remains gated by new Phase 4 artifacts:
  - `pnpm literature:pgvector:phase4 -- --mode run-evidence ...`
  - `pnpm literature:pgvector:phase4 -- --mode evaluate-promotion ...`
  - `pnpm literature:pgvector:phase4 -- --mode apply-promotion ...`
  - `pnpm literature:pgvector:phase4 -- --mode stable-audit ...`
- The Phase 4 CLI generates evidence/decision/apply/audit artifacts under `.ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260606-phase4-readiness` by default.
- `run-evidence` evaluates the requested rollout mode in-process without persisting the mode.
- `apply-promotion` is the only Phase 4 command that persists rollout mode, and it requires an approved promotion decision plus approved/matching target DB ref.

## 2026-06-06 Execution Update
- Phase 4 was executed on the approved local target through:
  - `jsonb_only -> shadow_pgvector`.
  - `shadow_pgvector -> pgvector_canary`.
  - `pgvector_canary -> pgvector_default`.
- Each transition had a passing evidence artifact, an `APPROVED` promotion-decision artifact, and an `APPLIED` promotion-apply artifact.
- Live rollout mode after execution is `pgvector_default`.
- Public retrieval smoke confirms `visible_source=pgvector` and fallback count `0`.
- Rollback drill evidence is now recorded:
  - `phase4-rollback-drill-phase4-rollback-drill-target-local-20260606.json`.
  - transition chain `pgvector_default -> jsonb_only -> shadow_pgvector -> pgvector_canary -> pgvector_default`.
  - `5/5` drill queries returned `rollout_mode=jsonb_only`, `visible_source=jsonb`, and fallback count `0`.
- Stable/default audit after rollback drill is `PASS`:
  - `phase4-stable-default-audit-phase4-stable-default-audit-after-rollback-drill-20260606.json`.
- Phase 5 cleanup and `finalized` still require a separate Phase 5 readiness review before migration-only fallback/shadow/canary infrastructure is removed.

## Reviewed Evidence
- Phase 3 verification:
  - `.ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase3-readiness/phase3-verification-phase3-target-local-20260606-verify.json`.
- Phase 3 broad execute:
  - `.ai/.tmp/literature-retrieval-pgvector-index-design/artifacts/db/20260605-phase3-readiness/broad-backfill-phase3-target-local-20260606-execute.json`.
- Public retrieval entry:
  - `apps/backend/src/routes/literature-routes.ts`.
  - `apps/backend/src/controllers/literature-controller.ts`.
  - `apps/backend/src/services/literature-service.ts`.
  - `apps/backend/src/services/literature-retrieval-service.ts`.
- Internal pgvector shadow and candidate primitives:
  - `apps/backend/src/services/literature-retrieval-pgvector-phase2-runner-service.ts`.
  - `apps/backend/src/repositories/prisma/literature/prisma-literature-embedding-store.ts`.
- Rollout settings:
  - `apps/backend/src/services/literature-retrieval-vector-settings-service.ts`.

## Findings

### F1 - Public Retrieval Is Not Mode-Aware
- Severity: blocker for Phase 4 execution.
- Evidence:
  - `/literature/retrieve` routes to `LiteratureService.retrieve`, which delegates to `LiteratureRetrievalService.retrieve`.
  - `LiteratureRetrievalService.retrieve` still loads chunks through `listEmbeddingChunksByEmbeddingVersionIds` and scores JSONB vectors in TypeScript.
  - `LiteratureRetrievalVectorSettingsService.resolveSettings` is not consulted by the public retrieval path.
  - `retrieveShadowFromPgvectorCandidates` exists only as an internal runner/rerank helper and is not wired to controllers or the service entry path.
- Required resolution:
  - Add a mode-aware retrieval orchestrator for `jsonb_only`, `shadow_pgvector`, `pgvector_canary`, and `pgvector_default`.
  - Keep `jsonb_only` behavior byte-for-behavior compatible until a mode transition is explicitly recorded.
  - In `shadow_pgvector`, execute pgvector candidate retrieval for artifact/telemetry evidence without changing public response items.
  - In `pgvector_canary` and `pgvector_default`, user-visible retrieval must be produced from pgvector candidates and the existing service rerank semantics.

### F2 - Phase 4 Lacks A Public-Path Pgvector Query Contract
- Severity: blocker for Phase 4 execution.
- Evidence:
  - Phase 2 shadow uses precomputed `normalized_query_vector` from an artifact query set.
  - The public retrieval path embeds the query for JSONB scoring but does not normalize and pass that vector into `listEmbeddingVectorCandidates`.
  - Candidate-window selection exists in the Phase 2 runner, not in the public retrieval service.
- Required resolution:
  - Move or share query-vector normalization and candidate-window calculation into the public retrieval path.
  - Preserve service-owned active/evidence-ready/profile/stale eligibility before repository candidate calls.
  - Enforce candidate query timeout and candidate-window telemetry in the public-path contract.
  - Add regression tests proving stale-ineligible versions and incompatible embedding profiles cannot enter pgvector SQL.

### F3 - Canary Fallback Evidence Is Missing
- Severity: blocker for canary/default promotion.
- Evidence:
  - The rollout settings service defines `pgvector_canary` and `pgvector_default`, but no public-path fallback decision, fallback event record, fallback counter, or promotion gate exists.
  - Current Phase 2/Phase 3 verification only checks that public mode remains `jsonb_only`.
- Required resolution:
  - Implement canary-only JSONB fallback with structured reason recording.
  - Record fallback count by run/window/query class without storing raw vectors or credentials.
  - Block `pgvector_default` promotion when fallback count is non-zero.
  - Prove `pgvector_default` has no automatic per-request JSONB fallback branch.

### F4 - Full-Corpus Shadow/Canary Harness Is Missing
- Severity: major.
- Evidence:
  - Phase 2 shadow evidence is sample-scoped.
  - Phase 3 evidence proves broad native-vector coverage, not public read-path parity.
  - There is no Phase 4 runner that repeatedly captures JSONB baseline, broad pgvector shadow results, candidate-window pressure, scoped/unscoped latency, fallback counts, and promotion decisions over the full active/evidence-ready corpus.
- Required resolution:
  - Add a Phase 4 runner or service harness for repeated `shadow_pgvector` and `pgvector_canary` evidence.
  - Use the fixed query-set lineage rules from Phase 2, but broaden the workset to the Phase 3 selected corpus or a reviewed Phase 4 query matrix.
  - Record score drift, topK overlap, candidate-limit hit rate, DB similarity latency, post-rerank drop rate, scoped/unscoped outcomes, partial visual index behavior, stale-policy behavior, and same-work dedup behavior.

### F5 - Promotion Operations Are Not Approval-Gated
- Severity: major.
- Evidence:
  - `transitionMode` validates one-step transitions but is not wrapped in a Phase 4 approval command with target ref, evidence refs, and rollback preconditions.
  - There is no durable artifact proving each promotion from `jsonb_only -> shadow_pgvector -> pgvector_canary -> pgvector_default`.
- Required resolution:
  - Add an approval-gated Phase 4 promotion command.
  - Require target DB fingerprint, Phase 3 verification ref, Phase 4 shadow/canary evidence refs, and explicit rollback instructions.
  - Reject promotion on stale evidence, target mismatch, open quarantine, incomplete coverage, fallback events, or failed parity/performance gates.

### F6 - Stable Default Cleanup Preconditions Are Not Yet Provable
- Severity: major.
- Evidence:
  - JSONB retrieval remains the only public retrieval implementation.
  - Migration-only rollout modes, backfill/quarantine runtime tables, and JSONB rollback storage remain intentionally present.
  - No audit command proves that `pgvector_default` lacks automatic fallback and that Phase 5 cleanup can safely begin.
- Required resolution:
  - Add stable-mode audit checks before `pgvector_default` and before Phase 5.
  - Keep JSONB rollback only until rollback drill evidence exists.
  - Defer final cleanup until repeated default-on evidence passes.

## Entry Checklist For Phase 4 Implementation
- [x] Phase 3 local coverage is complete on the approved target.
- [x] Public retrieval remains `jsonb_only`.
- [x] Repository-level pgvector candidate primitive exists.
- [x] Internal rerank helper for pgvector candidates exists.
- [x] Rollout mode settings and one-step transition validation exist.
- [x] Public retrieval is mode-aware.
- [x] Public pgvector path computes and normalizes query vectors.
- [x] Public pgvector path applies candidate-window settings and telemetry.
- [x] Canary fallback events are recorded and promotion-blocking.
- [x] Full-corpus repeated shadow/canary harness exists.
- [x] Promotion commands are target/evidence approval-gated.
- [x] Stable/default audit proves no automatic fallback before cleanup.

## Implementation Mapping
- F1/F2 resolved by `LiteratureRetrievalService.retrieveWithVectorRolloutEvidence` and the public `retrieve` wrapper:
  - `jsonb_only` preserves the previous JSONB response path.
  - `shadow_pgvector` runs pgvector candidate evidence while returning JSONB-visible results.
  - `pgvector_canary` returns pgvector-visible results when successful and records structured canary fallback events when pgvector execution fails.
  - `pgvector_default` and `finalized` use pgvector-visible results with no automatic JSONB fallback branch.
- F2 stale/profile eligibility is enforced before repository candidate SQL through service-resolved `eligibleEmbeddingVersionIds`; candidate query timeout is enforced from rollout settings.
- F3 fallback evidence is exposed through the internal execution envelope and aggregated by the Phase 4 runner.
- F4 is implemented by `LiteratureRetrievalPgvectorPhase4RunnerService.runEvidence`, which captures query-level source, fallback count, candidate-window pressure, DB similarity latency, topK overlap, and score drift.
- F5 is implemented by `LiteratureRetrievalPgvectorPhase4RunnerService.evaluatePromotion`, `LiteratureRetrievalPgvectorPhase4RunnerService.applyPromotion`, and `pnpm literature:pgvector:phase4 -- --mode evaluate-promotion|apply-promotion`; evaluation requires target approval, Phase 3 verification, Phase 4 evidence, one-step transition, zero fallback, and rollback instructions, while apply requires an approved decision artifact, approved target, and live mode matching the decision current mode.
- F6 is implemented by `LiteratureRetrievalPgvectorPhase4RunnerService.auditStableDefault` and `pnpm literature:pgvector:phase4 -- --mode stable-audit`; it requires default-mode evidence with pgvector-visible results, zero fallback events, and rollback-drill evidence before cleanup.

## Verification
- `pnpm --filter @paper-engineering-assistant/backend exec node --loader ts-node/esm --test src/services/literature-retrieval-service.unit.test.ts`
- `pnpm --filter @paper-engineering-assistant/backend exec node --loader ts-node/esm --test src/services/literature-retrieval-pgvector-phase4-runner-service.unit.test.ts`
- `pnpm literature:pgvector:phase4 -- --help`
- `pnpm --filter @paper-engineering-assistant/backend test -- literature-retrieval-service.unit.test.ts`
- `pnpm --filter @paper-engineering-assistant/backend typecheck`

## Readiness Decision
- Ready now: execute Phase 4 evidence generation and promotion-decision evaluation on the approved target.
- Not approved by this document alone: persisting a rollout mode transition. That requires an `APPROVED` promotion-decision artifact and a deliberate `apply-promotion` command with `--target-db-approved`.
- Explicitly blocked: staging/prod mutation and cleanup until target-specific Phase 4 evidence, promotion/apply, stable audit, and rollback drill evidence pass.
