# 01 Plan

## Phase 0 - Audit And Classification
- Read PaperImplementation T-093 through T-105, T-109, T-113.
- Read topic-selection T-088, T-107, T-108, T-112 runtime/harness standards.
- Classify each PaperImplementation workflow type and deterministic flow node.

Acceptance:
- `06-node-runtime-matrix.md` contains every known PaperImplementation workflow type.
- `09-node-capability-matrix.md` contains per-node loop, retry, fallback, debate, multi-scenario, provider/canary, admission, and authority-boundary expectations.
- Each row has owner, current state, missing production capability, capability expectations, and recommendation.

## Phase 1 - Lock Runtime Standard
- Define the PaperImplementation runtime vocabulary.
- Lock which concepts are domain-specific versus shared runtime primitives.
- Decide which topic-selection primitives can be reused directly and which require neutral extraction.

Acceptance:
- Architecture doc separates harness, runtime/admission, domain services, provider gateway, and authority writer.
- No topic-selection business semantics enter PaperImplementation.

## Phase 2 - First Slice Design
- Select first production slice.
- Recommended first slice:
  - `trace_integrity_review`
  - `claim_boundary_review`
  - `dossier_readiness_prep`
- Define exact contracts, routes, persistence, tests, and smoke/stress commands for the slice.

Acceptance:
- Each first-slice slot has L1-L5 verification targets.
- DB/schema impact is confirmed before Prisma or production service code starts.
- `12-runtime-persistence-envelope.md` defines runtime artifact/admission persistence without reusing harness proposal tables.
- L1 shared runtime/admission contract schemas are implemented before service/runtime persistence.

## Phase 3 - Implementation Slices
- Implement first-slice contracts/services/tests.
- Current first slice starts with shared runtime/admission contracts only.
- Add Prisma-backed smoke.
- Add provider canary behind explicit env/key gate.
- Add runtime stress runner.
- Add near-prod runtime gate for same-route live provider, Prisma runtime/admission, replay/idempotency, minimal concurrency, and no-skip summary evidence.

Acceptance:
- Default deterministic verification passes.
- Provider canaries skip cleanly without env and pass when explicitly enabled.
- Prisma smoke is explicit, env-gated, and fails before runtime execution when the target database lacks required migrations.
- Runtime stress proves replay/drift/no-duplicate/no-bypass behavior.
- Near-prod runtime gate uses `passed | blocked | failed`; `blocked` is for missing env/DB/migration/provider prerequisites, and `passed` is impossible when any L6 test step is skipped.

## Phase 4 - Remaining Node Promotion
- Promote result/claim, validation/workorder, motive/evidence, route/experiment, and provider-variance slots in order.
- `result_analysis.interpretation_scenarios` is now the first completed remaining-node promotion slice.
- Avoid a bulk rewrite; each slice must have independent acceptance.

Acceptance:
- Every slot is either production-promoted or explicitly deferred with owner and reason.

## Phase 5 - Closure
- Run full targeted backend/shared checks.
- Run PaperImplementation V1 replay plus new runtime stress.
- Run L6 near-prod runtime gate in staging/pre-release environments with provider credentials and migrated DB.
- Update context/governance if new contracts or DB fields are added.

Acceptance:
- T-114 can be archived with evidence and no open P0/P1 runtime risks.

## Dependencies
- `T-099 paper-implementation-ai-workflow-harness`
- `T-104 paper-implementation-live-experiment-adapter`
- `T-105 paper-implementation-provider-variance-evaluation`
- `T-109 paper-implementation-v1-runnable-closure`
- `T-112 topic-selection-llm-context-cache-runtime`

## Approval Gate Before Code
- Confirm first slice scope.
- Confirm live provider canary provider set.
- Confirm whether schema migration is allowed after shared runtime/admission envelope contracts are accepted.
