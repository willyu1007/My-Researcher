# 03 Implementation Notes

## Initial Planning - 2026-05-19
- Created T-090 as a validation-focused follow-up to T-043/T-070~T-078.
- Scope is test harnesses, scenario tests, desktop smoke, and robustness checks.
- Product behavior changes are not planned unless a validation case exposes a concrete defect that must be fixed to preserve the already-agreed semantics.
- External cloud interaction remains mocked/credential-free in this task; real cloud SDK hardening remains a separate follow-up.

## Test Matrix Sync - 2026-05-20
- Added the confirmed detailed test matrix to `02-architecture.md`.
- Matrix groups validation by registry/readiness, automation API flow, candidate promotion, recipe/materialization preconditions, LocalScript, mocked Aliyun, result/evidence, sidecar/adjacent flow, desktop smoke, opt-in DB smoke, and out-of-scope real cloud canary.
- The default T-090 suite should remain credential-free and deterministic; live Postgres and real cloud checks are separate opt-in lanes.

## Harness / Fixture Design Sync - 2026-05-20
- Added the agreed harness design to `02-architecture.md`.
- The design uses three layers:
  - deterministic fixture builders for valid and drifted experiment graphs;
  - route-first API scenario harness around Fastify `buildApp().inject()`;
  - external fakes for LocalScript roots/scripts and mocked Aliyun PAI-DLC behavior.
- Initial implementation should prioritize backend/API capability tests before desktop smoke, because current renderer work has unrelated active changes.

## Critical-node Deep-test Sync - 2026-05-20
- Added a critical-node deep-test matrix to `02-architecture.md`.
- Each critical node now requires functional, integration, robustness, traceability, and quality coverage; security-sensitive nodes also require explicit data-safety tests.
- The matrix prevents T-090 from becoming a shallow happy-path test pass and gives implementation a coverage standard for registry, readiness, promotion, recipe/materialization, execution, collect/validation, evidence/sidecar, desktop, and adjacent-flow boundaries.

## Minimal Harness Vertical Slice - 2026-05-23
- Added reusable fixture builders in `apps/backend/src/services/experiment-foundation-scenario-fixtures.ts`.
  - The minimal graph covers dataset asset/version/location/mirror/policy, evaluation protocol, metric definition, run recipe, training task spec, materialization result, and submit request payloads.
  - Fixtures use shared experiment-foundation contract types and refs/hashes only; no raw datasets, credentials, SDK payloads, or adapter-private blobs are stored.
- Added route-first API harness in `apps/backend/src/services/experiment-foundation-capability-harness.ts`.
  - The harness drives `buildApp().inject()` against the existing registry/readiness/execution routes.
  - It centralizes status/error assertions but does not recompute readiness, promotion, materialization, validation, or adapter semantics.
- Added LocalScript test fakes in `apps/backend/src/services/experiment-foundation-external-fakes.ts`.
  - The helper creates an OS-temp execution root, installs test-only LocalScript env guards, and restores env after the test.
- Added `apps/backend/src/services/experiment-foundation-capability-harness.test.ts`.
  - The vertical slice proves automated API flow for registry create/list, dataset/task readiness, submit gate failure before readiness, LocalScript submit, idempotent repeat submit, idempotency conflict, sync-to-terminal, collect, result/validation/evidence refs, no inline adapter metadata, and rejection of generic registry writes for `external_training_job`.

## Harness Hardening and Candidate Promotion Slice - 2026-05-23
- Fixed review findings from the first harness slice.
  - `syncJobUntilTerminal` now supports configurable `timeoutMs` and `pollMs`, with a 5s default timeout instead of a narrow 1s loop.
  - The LocalScript test now restores env and removes the temp execution root even if harness construction fails.
  - Scenario fixtures now accept `scenarioId` and generate per-scenario ids, hashes, refs, and idempotency keys to avoid record collisions as T-090 grows.
- Extended fixtures with dataset candidate and promotion request/result builders.
- Added a candidate promotion route scenario in `experiment-foundation-capability-harness.test.ts`.
  - Success path: eligible dataset candidate promotes through existing canonical refs and persists request/result plus candidate status update.
  - Negative paths: low-confidence candidate and possible-duplicate candidate return `GATE_CONSTRAINT_FAILED`; missing canonical protocol ref returns `NOT_FOUND`.

## Mocked Aliyun Boundary Slice - 2026-05-23
- Extended scenario fixtures with `adapterKind`, dataset mirror overrides, data policy overrides, and task spec overrides.
  - Aliyun scenarios produce `aliyun_oss` / `aliyun_oss_object` mirror refs while still using public refs and hashes only.
  - Drifted scenarios can now express missing mirrors, stale mirrors, checksum mismatch, restricted policies, and platform-private field leakage without duplicating fixture graphs.
- Added mocked Aliyun route-level coverage to `experiment-foundation-capability-harness.test.ts`.
  - Success path: a readiness-passed Aliyun training task submits through the execution API, records an external job, and exposes adapter metadata only as refs.
  - Negative paths: missing dataset mirror, stale mirror, checksum mismatch, and restricted approval-required policy all fail the submit gate with `GATE_CONSTRAINT_FAILED`.
  - Schema boundary: platform-private `region` leakage in a `training_task_spec` is rejected as `INVALID_PAYLOAD` before execution.
- Tightened the harness test typing around Fastify `inject()` responses so negative-path helpers assert against actual response objects, not chain builders.

## Result / Evidence / Sidecar Boundary Slice - 2026-05-23
- Added route-level coverage for collect-time result and evidence boundaries.
  - Success path verifies `ExperimentResult`, `ResultValidationReport`, `EvidenceCandidate`, metric observations, evaluation facts, and stage/partial refs are produced from the execution API without renderer or test-side domain synthesis.
  - Negative path verifies a failed LocalScript run creates a `partial` validation report and does not create an `EvidenceCandidate`.
- Added schema boundary checks through the registry route.
  - `ExperimentResult` with `claim_text` is rejected as `INVALID_PAYLOAD`.
  - `EvidenceCandidate` with `validation_status = invalid` is rejected as `INVALID_PAYLOAD`.
  - `PaperExperimentSidecar` can be persisted as refs/hashes/snapshots only, and a sidecar that copies a full `run_recipe` DTO is rejected as `INVALID_PAYLOAD`.
- Added a sidecar payload builder inside the harness test to prove adjacent paper surfaces can link to experiment outputs without owning canonical experiment DTOs.

## Adjacent-flow No-copy Robustness Slice - 2026-05-24
- Hardened `PaperImplementationWorkOrderExperimentBridgeService` so service-level callers cannot bypass route schemas and copy experiment-foundation DTOs into adjacent paper implementation state.
  - `experiment_bridge` now rejects full DTO keys such as `run_recipe`, `training_task_spec`, `experiment_result`, `dataset_asset`, and sidecar/result DTO variants.
  - `RunMonitorIntake.raw_payload` now recursively rejects full experiment DTO copies and paper-claim/table fields such as `claim_text`, `final_table`, leaderboard/ranking fields, and publication-ready wording.
  - Lightweight refs/hashes remain accepted, preserving the intended handoff shape.
- Added targeted unit coverage in `paper-implementation-workorder-experiment-bridge-service.unit.test.ts`.
  - The test proves adjacent workflows can accept refs/hashes while rejecting copied `run_recipe`, nested `experiment_result`, and raw `claim_text` payloads.

## Desktop Smoke Slice - 2026-05-24
- Extended `apps/desktop/scripts/smoke-e2e.mjs` with experiment-foundation-specific smoke checks.
  - Source checks verify `实验基座` is immediately below `文献管理`, `App.tsx` mounts `ExperimentFoundationModule`, and the workbench advertises the `实验基座工作台` tab surface.
  - API client checks verify the renderer uses `requestGovernance` for registry, readiness, promotion, submit, sync, cancel, and collect paths under `/experiment-foundation/**`.
  - Renderer boundary checks reject direct `fetch`, backend service construction, Prisma, child-process execution, Ajv schema ownership, and adapter implementation imports inside the experiment-foundation renderer module.
  - Runtime smoke starts backend memory mode and desktop dev server, then exercises experiment-foundation registry create/list, readiness check/latest, and execution job list endpoints.
- The smoke script continues to avoid real cloud credentials and live database dependencies.

## Backend Default Test Runner Alignment - 2026-05-24
- Updated `apps/backend/scripts/run-node-tests.mjs` to load local env files before spawning the Node test runner.
  - Load order is repo `.env.local`, repo `.env`, backend `.env.local`, backend `.env`.
  - Explicit shell/CI environment variables still win, because the loader only fills missing keys.
  - Provider API key variables remain stripped from the spawned test process unless `BACKEND_TEST_PRESERVE_REAL_ENV=1`, preserving the credential-free default test lane.
- This removes the prior manual `source .env.local` step for local full backend validation while keeping root `.env.local` as the repo-env-contract local entry point.

## Closure Notes
- The first slice intentionally complements existing T-076/T-077 service tests by making reusable route-level harness helpers available for the rest of T-090.
- Keep the T-090 targeted harness and real cloud checks credential-free; the broader backend suite may use local Postgres when the repo-local `.env.local` is present.
- T-090 is closed as the deterministic default validation package for the T-070~T-078 minimum chain.
- Remaining product expansion, such as live DB smoke, real Aliyun SDK/credential canary, candidate extraction services, typed asset CRUD UX, and dedicated paper-project sidecar attachment, should be opened as explicit follow-up task packages.
