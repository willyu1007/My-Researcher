# T-106 Hardening Matrix And Fixture Inventory

## Purpose

The matrix turns the D1 through D8 roadmap decisions into an executable hardening backlog. The matrix defines what T-106 must prove before experiment foundation can be treated as a robust tool surface for paper-implementation automation.

T-106 does not redefine T-070 through T-078 semantics. The task exercises the existing contracts, APIs, repositories, adapters, desktop workbench boundary, and PaperImplementation seams with harder fixtures and explicit artifact rules.

## Lane Taxonomy

| Lane | Default | Purpose | Command Contract |
| --- | --- | --- | --- |
| `deterministic` | Yes | Repeatable repo-local contract, service, adapter, seam, and redaction checks. | `pnpm experiment-foundation:hardening -- --mode deterministic` |
| `real-local-db` | No, explicit | Disposable Postgres schema parity and recovery checks. | `pnpm experiment-foundation:hardening -- --mode real-local-db` |
| `ui-definition` | Yes, docs only | Define the desktop workbench proof target without implementing UI automation in early phases. | Matrix/doc lint only until UI automation is scheduled. |
| `local-fake-external` | Yes | Exercise external submit/sync/collect/result/evidence flow without cloud credentials. | Included in deterministic hardening once implemented. |
| `true-external-canary` | No, explicit | Verify real external connectivity and minimum real external flow. | `pnpm experiment-foundation:hardening -- --mode full --include-true-external-canary` |
| `governance` | Yes | Keep task status, project views, and artifact policy aligned. | `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` |

Artifacts default to `.ai/.tmp/experiment-foundation-hardening/<run-id>/`.

## Fixture Inventory

| Fixture Id | Class | Source / Builder | Default | Used By | Artifact Rule |
| --- | --- | --- | --- | --- | --- |
| `SYN-MINIMAL-GRAPH` | Synthetic deterministic | `createExperimentFoundationMinimalGraph` in `apps/backend/src/services/experiment-foundation-scenario-fixtures.ts` | Yes | Registry, readiness, recipe, materialization, submit | Payload may be stored when the payload remains non-sensitive synthetic data. |
| `SYN-REF-ID-SET` | Synthetic deterministic | `experimentFoundationScenarioIds` and `experimentFoundationRef` | Yes | All backend and seam tests | Store ids and refs. |
| `SYN-DATASET-MIRROR` | Synthetic deterministic | `datasetMirrorFixture` | Yes | Mirror freshness, checksum, policy, Aliyun fake | Store refs, hashes, status, and synthetic provider kind only. |
| `SYN-CANDIDATE-PROMOTION` | Synthetic deterministic | `datasetAssetCandidateFixture`, `promotionRequestFixture`, `promotionResultFixture` | Yes | Promotion gate and candidate lifecycle | Store candidate ids, decision, blockers, and canonical refs only. |
| `SYN-LOCAL-ROOT` | Synthetic deterministic | `createLocalScriptExecutionRoot`, `writeAllowedLocalScript`, `installLocalScriptTestEnv` | Yes | LocalScript success and failure paths | Store temp root status and redacted path summary, not raw process output when unsafe. |
| `SYN-RESULT-EVIDENCE` | Synthetic deterministic | Capability harness result/evidence/sidecar scenario builders | Yes | Collect, validation, evidence, sidecar | Store refs, hashes, validation status, and blockers. |
| `SYN-PAPER-SEAM` | Synthetic deterministic | PaperImplementation workorder/live experiment adapter unit fixtures | Yes | Cross-flow no-copy/no-claim-leak tests | Store PaperImplementation ids and experiment refs/hashes only. |
| `DB-DISPOSABLE-SCHEMA` | Controlled local real | T-103 disposable-schema pattern using local `DATABASE_URL` | No, explicit | Prisma repository parity and recovery | Store disposable schema name, step status, cleanup status; never raw `DATABASE_URL`. |
| `UI-FLOW-CONTRACT` | Synthetic deterministic | T-106 `UI Flow Contract` in `02-architecture.md` | Yes, docs only | Desktop proof target | Store route/panel/backend-call inventory, not screenshots until UI automation is scheduled. |
| `TRUE-EXT-CANARY-SAMPLE` | True external canary sample | Approved external provider environment and minimum sample/mirror | No, explicit | Real connectivity and real submit/sync/collect/result/evidence | Store refs, hashes, durations, validation summary, evidence refs, and cleanup result only. |

No fixture class may commit raw real datasets, model weights, checkpoints, credentials, raw provider logs, SDK payloads, or unredacted external object paths.

## Critical Node Matrix

| Id | Layer | Scenario | Fixture | Lane | Command / Test Target | Expected Result | Artifact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `EF-H-001` | Shared contracts | T-070 through T-077 schema boundaries reject forbidden fields and aliases. | `SYN-MINIMAL-GRAPH` plus schema canonical payloads | `deterministic` | `pnpm --filter @paper-engineering-assistant/shared test` | Dataset, benchmark, recipe, materialization, result/evidence, candidate, API wrapper, and external job schemas pass positive/negative checks. | `matrix/shared-schema-summary.json` |
| `EF-H-002` | Registry API | Create, upsert, get, and list records across canonical assets, recipe, materialization, result/evidence, and candidate records. | `SYN-MINIMAL-GRAPH` | `deterministic` | `apps/backend/src/services/experiment-foundation-service.unit.test.ts`; future hardening route probe | Stable `201/200`, list filters, stored refs/hashes, and `INVALID_PAYLOAD` for malformed input. | `api/registry-records.md` |
| `EF-H-003` | Readiness | Passed, blocked, stale, and unknown readiness reports are persisted and readable by latest endpoint. | `SYN-MINIMAL-GRAPH`, stale mirror variants | `deterministic`, `real-local-db` | `experiment-foundation-service.unit.test.ts`; `experiment-foundation-capability-harness.test.ts`; `experiment-foundation-prisma-parity.integration.test.ts` | Automation can read blockers/actions and decide retry/fix path without guessing. | `api/readiness-statuses.json` |
| `EF-H-004` | Promotion | Candidate auto-promotion success and gate failures for low confidence, duplicate, incomplete, unclear/restricted policy, high risk, missing canonical refs. | `SYN-CANDIDATE-PROMOTION` | `deterministic`, `real-local-db` | `experiment-foundation-capability-harness.test.ts`; `experiment-foundation-prisma-parity.integration.test.ts` | Safe candidates promote to canonical refs; unsafe candidates return stable gate errors; candidate lifecycle stays separate from canonical status. | `api/promotion-gates.md` |
| `EF-H-005` | Recipe/materialization | `RunRecipe`, `TrainingTaskSpec`, and materialization result are usable as frozen inputs without renderer or adapter redefinition. | `SYN-MINIMAL-GRAPH` | `deterministic` | `experiment-foundation-capability-harness.test.ts`; shared schema test | Hash/ref mismatches and non-passed readiness block execution before adapter submit. | `api/materialization-preconditions.json` |
| `EF-H-006` | Execution submit | Submit requires existing `training_task_spec`, materialization result, passed readiness, and matching hashes. | `SYN-MINIMAL-GRAPH` | `deterministic`, `real-local-db` | `experiment-foundation-execution-service.unit.test.ts`; `experiment-foundation-capability-harness.test.ts`; `experiment-foundation-prisma-parity.integration.test.ts` | Valid submit creates one external job; stale/missing/mismatched inputs return `GATE_CONSTRAINT_FAILED` or `NOT_FOUND`. | `api/execution-submit.md` |
| `EF-H-007` | LocalScript success | Allowed local script runs with `shell=false` under execution root and collect creates result/validation/evidence. | `SYN-LOCAL-ROOT`, `SYN-MINIMAL-GRAPH` | `deterministic`, `local-fake-external` | Existing LocalScript unit test; future robustness matrix | Submit/sync/collect reaches terminal success and creates refs without raw output leakage. | `commands/localscript-success.json` |
| `EF-H-008` | LocalScript safety | Disabled execution, disallowed command, root escape, shell metacharacters, timeout, cancellation, malformed output, and repeated collect. | `SYN-LOCAL-ROOT` | `deterministic` | New Phase 2 hardening tests | Each failure is deterministic, has stable error/status, and cannot pass after timeout/cancel. | `commands/localscript-robustness.md` |
| `EF-H-009` | Execution idempotency | Same idempotency key with same task returns existing job; same key with different task/materialization conflicts. | `SYN-MINIMAL-GRAPH` | `deterministic`, `real-local-db` | `experiment-foundation-execution-service.unit.test.ts`; `experiment-foundation-prisma-parity.integration.test.ts` | Retries are safe and conflicts return `VERSION_CONFLICT`. | `api/execution-idempotency.json` |
| `EF-H-010` | Mocked external provider | Aliyun fake consumes ready/fresh mirrors and rejects missing/stale/checksum mismatch/restricted-without-approval. | `SYN-DATASET-MIRROR` | `deterministic`, `local-fake-external` | `experiment-foundation-capability-harness.test.ts`; execution unit tests | Mirror/policy gates are enforced without real cloud credentials or inline provider payloads. | `external/local-fake-provider.md` |
| `EF-H-011` | True external canary gate | Missing opt-in, credentials, provider config, mirror, approval, budget, or cleanup prerequisites block true canary. | `TRUE-EXT-CANARY-SAMPLE` | `true-external-canary` | `.ai/scripts/experiment-foundation-hardening-runner.mjs --mode external-gate --include-true-external-canary` | Missing prerequisites return `blocked`, not pass; skipped default does not fail deterministic lane. | `external/true-canary-gate.json` |
| `EF-H-012` | True external canary flow | Real provider performs minimum submit, sync, collect, validation, evidence, and cleanup. | `TRUE-EXT-CANARY-SAMPLE` | `true-external-canary` | Future provider-specific implementation with explicit opt-in | Connectivity and real flow are proven, or failure is actionable and redacted. | `external/true-canary-result.md` |
| `EF-H-013` | Result validation | Valid, invalid, partial, and accepted-partial behavior does not leak paper claims or final tables. | `SYN-RESULT-EVIDENCE` | `deterministic` | `experiment-foundation-capability-harness.test.ts`; shared schema tests | Only valid or accepted-partial validation can produce evidence candidates; facts remain non-claim records. | `api/result-validation.json` |
| `EF-H-014` | Sidecar/evidence | PaperExperimentSidecar stores refs, locks, hashes, snapshots, and event refs only. | `SYN-RESULT-EVIDENCE` | `deterministic` | Shared schema tests plus future no-copy probe | No full reusable DTO copies in sidecar; no paper acceptance wording. | `api/sidecar-no-copy.md` |
| `EF-H-015` | Persistence parity | Memory repository and disposable Postgres expose equivalent automation-facing behavior. | `SYN-MINIMAL-GRAPH`, `DB-DISPOSABLE-SCHEMA` | `real-local-db` | T-103 real-local-DB smoke as baseline; `experiment-foundation-prisma-parity.integration.test.ts` for recovery parity | Same scenario produces same refs/status/errors; disposable schema cleanup is recorded. | `db/persistence-parity.json` |
| `EF-H-016` | Recovery/resume | Automation can resume after failed readiness, failed promotion, failed submit, cancel, and partial collect. | `SYN-MINIMAL-GRAPH`, `SYN-LOCAL-ROOT` | `deterministic`, `real-local-db` | `experiment-foundation-capability-harness.test.ts`; `experiment-foundation-prisma-parity.integration.test.ts` | Stable latest/read/list endpoints provide enough state to continue without manual repair. | `api/recovery-resume.md` |
| `EF-H-017` | Desktop workbench definition | UI proof target names user path, backend calls, expected states, and error states. | `UI-FLOW-CONTRACT` | `ui-definition` | `07-ui-workbench-flow-contract.md`; later desktop smoke/e2e | Renderer remains API consumer only and does not synthesize domain decisions. | `ui/workbench-flow-contract.md` |
| `EF-H-018` | Desktop future smoke | Registry, readiness, job, result/evidence, and error states render without overflow or semantic ownership. | `UI-FLOW-CONTRACT` | Future opt-in UI implementation | Future desktop smoke/e2e after lower lanes stabilize | UI proves consumption and rendering, not domain decision ownership. | `ui/workbench-smoke-summary.md` |
| `EF-H-019` | Cross-flow seam | PaperImplementation submits admitted WorkOrder idempotently and consumes refs/hashes only. | `SYN-PAPER-SEAM` | `deterministic` | `paper-implementation-live-experiment-adapter-service.unit.test.ts`; `paper-implementation-workorder-experiment-bridge-service.unit.test.ts` | No experiment-foundation DTO copy, no paper-claim leakage, no repository bypass when service/API boundary exists. | `cross-flow/paper-implementation-seam.md` |
| `EF-H-020` | Runner contract | Standalone hardening command exposes deterministic, real-local-DB, local fake external, UI definition, and true canary gate lanes. | Matrix rows above | `deterministic`, `real-local-db`, `true-external-canary` | `.ai/scripts/experiment-foundation-hardening-runner.mjs` | Command writes manifest/report/blockers and is the documented T-103 handoff entrypoint. | `commands/hardening-runner-manifest.json` |
| `EF-H-021` | Artifact redaction | Reports contain no secrets, raw `DATABASE_URL`, raw provider logs, SDK payloads, raw datasets, checkpoints, or unredacted external paths. | All fixtures | All lanes | Future runner artifact scan plus `git diff --check` | Artifact scan passes and blockers are actionable without sensitive payloads. | `commands/redaction-report.md` |
| `EF-H-022` | Governance | T-106 state, project registry, derived views, and residual risks stay synchronized. | Task docs | `governance` | `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`; `lint --check` | Registry shows `T-106=in-progress` until closure; no F-000 mapping drift. | `.ai/project/main/*` |

## Current Coverage Baseline

Already covered before T-106 implementation:

- Shared schema boundary checks exist in `packages/shared/src/research-lifecycle/experiment-foundation-contracts.schema.test.ts`.
- Backend registry/readiness/promotion route and service checks exist in `apps/backend/src/services/experiment-foundation-service.unit.test.ts`.
- Backend execution adapter, LocalScript happy path, mocked Aliyun gates, idempotency, cancel, and route checks exist in `apps/backend/src/services/experiment-foundation-execution-service.unit.test.ts`.
- Scenario-level harness checks exist in `apps/backend/src/services/experiment-foundation-capability-harness.test.ts`.
- PaperImplementation live experiment adapter seam coverage exists in `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.unit.test.ts`.
- T-103 full-flow runner already covers contract, preflight, deterministic, real-local-DB smoke, and gate-only external canary reporting.
- T-106 hardening runner now provides the post-V1 command entrypoint for targeted deterministic, real-local-DB, UI-definition, and true-external-gate lanes.

T-106 must deepen the baseline rather than duplicate the baseline.

## Implementation Backlog From Matrix

| Backlog Id | Status | Source Rows | Work |
| --- | --- | --- | --- |
| `T106-B1` | Done | `EF-H-020`, `EF-H-021` | Added standalone hardening runner skeleton with redacted artifact contract. |
| `T106-B2` | Done | `EF-H-008`, `EF-H-009` | Add LocalScript robustness tests for disabled execution, allowlist, root escape, shell args, timeout, cancel, repeated sync/collect, malformed output, and idempotency conflicts. |
| `T106-B3` | Done | `EF-H-003`, `EF-H-004`, `EF-H-006`, `EF-H-015`, `EF-H-016` | Added memory/API recovery coverage and opt-in disposable Postgres parity probe for automation-facing behavior. |
| `T106-B4` | Done | `EF-H-017`, `EF-H-018` | Defined the UI workbench proof target; concrete UI automation remains intentionally deferred. |
| `T106-B5` | Done | `EF-H-019` | Strengthened PaperImplementation live-experiment seam probes for refs/hashes-only consumption and no DTO/claim leakage. |
| `T106-B6` | Gate Done / Real Flow Pending | `EF-H-011`, `EF-H-012` | Added first-class true external canary prerequisite gate with opt-in, cleanup, and redaction policy. Provider-specific real flow implementation remains explicit follow-up work. |

## Phase 1 Closure

Phase 1 is complete when:

- the hardening matrix is reviewed and kept as the T-106 implementation backlog;
- future work references matrix row ids in implementation notes and verification results;
- no raw real dataset, credential, model weight, checkpoint, provider log, SDK payload, or unredacted object path is added to the repo.
