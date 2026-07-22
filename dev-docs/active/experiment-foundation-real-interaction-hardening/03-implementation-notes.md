# T-106 Implementation Notes

## 2026-05-24: Task Package Creation
- Created T-106 as the post-V1 experiment-foundation hardening task.
- The task starts in `planned` state and is intentionally decision-first.
- No product code, shared contracts, Prisma schema, REST routes, desktop UI, or runner code changed during task creation.

## 2026-05-25: Phase 1 Matrix
- Confirmed D1 through D8 and moved T-106 to `in-progress`.
- Added `06-hardening-matrix.md` as the Phase 1 executable matrix and fixture inventory.
- Phase 1 remains documentation-only: no harness command, test implementation, product code, shared contract, Prisma, API, or desktop UI changed.
- The next implementation target is Phase 2 LocalScript robustness.

## 2026-05-25: Phase 2 LocalScript Robustness
- Added targeted deterministic tests in `apps/backend/src/services/experiment-foundation-execution-service.unit.test.ts`.
- Covered `EF-H-008` and strengthened `EF-H-009`:
  - LocalScript disabled outside `NODE_ENV=test` unless explicitly enabled.
  - Execution root escape via `output_contract.working_directory` is rejected.
  - Shell metacharacter arguments stay literal under `shell=false`.
  - Non-terminal collect is rejected with a gate error.
  - Timeout reaches failed terminal status and collect produces partial validation without evidence.
  - Repeated collect returns existing refs without duplicate stage/partial/result refs.
  - Existing idempotent submit and idempotency-conflict checks remain in the same suite.
- No product code changes were needed; the existing LocalScript adapter behavior satisfied the Phase 2 matrix after tests were added.
- Review follow-up:
  - Restored topic-selection T-107/T-108 task packages after confirming they are owned by a separate task stream and must not be deleted during T-106 work.
  - Added `afterEach` cleanup for LocalScript temp execution roots created by the execution-service tests.

## 2026-05-27: Phase 3A API Recovery Hardening
- Added a deterministic recovery scenario to `apps/backend/src/services/experiment-foundation-capability-harness.test.ts`.
- Covered the API-facing parts of `EF-H-003`, `EF-H-004`, `EF-H-006`, and `EF-H-016`:
  - stale `dataset_mirror` blocks `dataset_version` readiness and latest readiness exposes blockers/actions;
  - updating the mirror to fresh via registry upsert lets the next readiness check pass;
  - incomplete candidate promotion fails with stable `GATE_CONSTRAINT_FAILED` and writes no promotion request/result records;
  - fixing the candidate payload via registry upsert allows promotion to complete and update candidate status;
  - submit with mismatched materialization hash fails without creating an external job;
  - retrying with the original locked submit request succeeds;
  - cancellation is idempotent, terminal cancelled state is listable, and collect creates partial validation without evidence.
- Phase 3A intentionally remains memory/API deterministic only. Disposable Postgres parity and recovery proof remain Phase 3B.

## 2026-05-27: Phase 3B Disposable DB Baseline
- Ran the existing T-103 real-local-DB lane as a T-106 Phase 3B baseline.
- The runner created a disposable schema, applied repo migrations, round-tripped experiment-foundation registry/readiness/external-job rows, and dropped the schema.
- Redaction check found no raw database URL, provider keys, or credential patterns in the generated artifacts.
- The smoke proves DB infrastructure and SSOT migration viability for experiment-foundation tables, but the smoke is not yet the full parity probe for the same readiness/promotion/submit/recovery scenarios exercised by Phase 3A.

## 2026-05-27: Phase 3B Prisma Parity Probe
- Added opt-in disposable-Postgres parity coverage in `apps/backend/src/services/experiment-foundation-prisma-parity.integration.test.ts`.
- The test is skipped by default and runs only with `EXPERIMENT_FOUNDATION_PRISMA_PARITY=1` plus `DATABASE_URL`.
- The test creates an isolated schema, applies repo migrations, runs the parity scenario through `PrismaExperimentFoundationRepository` and `PrismaExperimentFoundationExecutionRepository`, then drops the schema.
- Covered DB-backed parts of `EF-H-003`, `EF-H-004`, `EF-H-006`, `EF-H-009`, `EF-H-013`, `EF-H-015`, and `EF-H-016`:
  - duplicate registry create returns `VERSION_CONFLICT`;
  - stale `dataset_mirror` blocks readiness and latest readiness is persisted;
  - registry upsert fixes mirror freshness and subsequent readiness passes;
  - incomplete candidate promotion fails without writing promotion records or changing candidate status;
  - fixed candidate promotion writes request/result records and updates candidate lifecycle;
  - successful submit/collect creates persisted result, validation, and evidence refs;
  - mismatched materialization hash fails without creating a job;
  - submit idempotency returns the existing job and conflicting reuse returns `VERSION_CONFLICT`;
  - cancel is idempotent, sync preserves cancelled terminal state, cancelled jobs are listable, and collect produces partial validation without evidence.
- The adapter used by the parity probe is backend-only deterministic fake execution. The adapter keeps the DB parity lane focused on persistence/service behavior instead of LocalScript process timing, which Phase 2 already covers.

## 2026-05-27: Phase 4 UI Flow Contract
- Added `07-ui-workbench-flow-contract.md` as the define-only UI proof target.
- The contract names the required user path through navigation, registry, readiness, candidate promotion, recipe/materialization, execution/evidence, and error states.
- The contract fixes backend authority for readiness, promotion, materialization, execution, validation, and evidence decisions, so later UI automation cannot drift into renderer-owned domain semantics.
- No desktop product code, runtime styles, shared contracts, backend routes, or Prisma schema changed in Phase 4.

## 2026-05-27: Phase 5 Cross-flow Seam Probe
- Strengthened `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.unit.test.ts`.
- The fake experiment-foundation record port now returns payloads containing paper-claim/final-wording fields while preserving valid record hashes.
- The live adapter collect path still reads only refs/hashes and stores PaperImplementation `RunEvidenceUnit`, monitor intake, and trace manifest state without copied experiment-foundation DTO fields.
- Added recursive assertions that adjacent state excludes reusable experiment-foundation DTO keys, evidence/sidecar DTO keys, paper claim fields, final table fields, leaderboard/ranking fields, and publication-ready wording.
- The seam assertion extends the existing WorkOrder bridge no-copy guard without changing product code or moving ownership between experiment foundation and PaperImplementation.

## 2026-05-27: Phase 6/7 Hardening Runner And External Gate
- Added `.ai/scripts/experiment-foundation-hardening-runner.mjs` and the root `experiment-foundation:hardening` package script.
- The runner writes redacted artifacts under `.ai/.tmp/experiment-foundation-hardening/<run-id>/` and supports `contract`, `deterministic`, `real-local-db`, `ui-definition`, `external-gate`, and `full` modes.
- `deterministic` runs targeted shared schema, backend execution, capability harness, PaperImplementation seam, backend typecheck, governance sync dry-run, governance lint, and diff hygiene checks.
- `real-local-db` invokes the opt-in disposable Postgres parity probe with `EXPERIMENT_FOUNDATION_PRISMA_PARITY=1`.
- `ui-definition` validates that `07-ui-workbench-flow-contract.md` still names the required backend-authority routes and renderer non-ownership rules.
- `external-gate` is intentionally gate-only: by default the gate records `skipped`; with `--include-true-external-canary` the gate checks provider, mirror, approval, budget, cleanup, and provider-specific credential key presence without calling a real cloud provider.
- The gate never stores raw env values. Artifacts contain key names and present/missing booleans only.
- The T-103 relationship is documented as a handoff command rather than changing the default T-103 full-flow runner semantics.

## 2026-05-27: Runner Quality Fixes
- Fixed external-gate environment resolution to read key presence from both `process.env` and root `.env.local`.
- Added a provider allowlist for the gate contract. The current supported provider is `aliyun_pai_dlc`; unknown providers block instead of returning ready.
- Strengthened redaction for secret-like `KEY=value`, `KEY: value`, and JSON/quoted assignment shapes, plus bearer authorization output.
- The gate still records only key names and presence/source booleans. The artifact does not store raw environment values.

## 2026-05-29: Phase 8 UI Smoke Landed via T-110 S5
- The open acceptance criterion "UI-driven full-flow smoke covers registry, readiness, job submit/sync/cancel/collect, result/evidence detail, and error rendering without renderer-owned domain semantics" is now satisfied. Implementation lives at `apps/desktop/scripts/smoke-e2e.mjs` and is invoked as `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e`.
- Co-ownership boundary settled with T-110: T-110 S5 implements the smoke command in the desktop tree; T-106 owns the acceptance checkbox. T-110 closure does NOT gate on the checkbox flip; T-106 closure does (along with the still-open external-canary acceptance).
- T-106 02-architecture's UI Flow Contract section now carries a step-to-mount mapping for the T-110-cutover IA (Registry → 资产库; Readiness → ReadinessInspector modal; Recipe/Materialization → 实验流; Execution/Evidence → 实验流's external_training_job stage with typed JobActionForms). The six contract steps remain authoritative; the new IA names are documented alongside.
- Smoke coverage:
  - Step 1 (nav entry): `coreNavItems` order, `<ExperimentFoundationModule>` mount, Topbar aria label.
  - Step 2 (Registry): 5 sub-tab labels + 5 typed-view mounts; `useTypedAssetDraft` + `AssetFilterToolbar` + `MutationFeedback` + Advanced JSON disclosure required on every typed view. Backend POST `/records` (dataset_asset) exercises the canonical write path.
  - Step 3 (Readiness): `<ReadinessInspector>` modal mount; `getLatestExperimentFoundationReadiness` + `checkExperimentFoundationReadiness` wired; `data-tone="danger"` branch present. Backend POST `/readiness/check` then GET `/readiness?status=blocked` (S0+ thin list endpoint) confirms list contract; GET `/readiness?status=not_a_status` returns 400.
  - Step 4 (Recipe / Materialization): `useExperimentFlowController` exposes the 10 canonical stages including `recipe_draft` / `run_recipe` / `materialize_request` / `materialization_result` / `training_task_spec`; `RunRecipeTimeline` reads payloads through typed accessors (`getRunRecipePayload`).
  - Step 5 (Submit / Sync / Cancel / Collect + Evidence): each of `SubmitJobForm` / `SyncJobForm` / `CancelJobForm` / `CollectJobForm` declared and mounted; Sync / Cancel / Collect gated on `disabled={!hasSelectedJob}`; Cancel CTA uses literal `data-variant="danger"`. Backend POST `/execution/jobs/submit` with empty body returns 400 (validation surface alive).
  - Step 6 (error rendering): `data-tone="danger"` branch present in OverviewPanel + ReadinessInspector + JobActionForms; backend POST `/records` with empty payload returns 4xx.
- Boundary guards (renderer must not own backend / materialization semantics) preserved: smoke asserts no `fetch(`, `buildApp(`, `PrismaClient`, `child_process`, `new Ajv`, `LocalScriptAdapter`, `AliyunPaiDlcAdapter`, `TrainingPlatformAdapter` in renderer sources.
- Renderer-side classification audit: smoke asserts OverviewPanel reads `listExperimentFoundationReadinessReports` (canonical-source contract from S0+) and that the 4 shared classification constants (`EXPERIMENT_FOUNDATION_READINESS_BLOCKED_STATUSES`, `EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_ATTENTION_STATUSES`, `EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_REVIEW_STATUSES`, `EXPERIMENT_FOUNDATION_EXTERNAL_TRAINING_JOB_IN_FLIGHT_STATUSES`) are imported, not invented in the renderer.
- Typed payload accessor surface (S2 + S3): smoke asserts `payloads.ts` exports all 10 accessors. Sparkline must remain inline SVG (smoke rejects any `import 'recharts'` / `import 'd3'`).
- Headless-browser automation is NOT introduced; the proof model stays "source-level assertions + backend API exercises against a memory-backed boot of the desktop dev server." Browser-driven coverage remains documented as a follow-up in T-110.

## Decision Backlog
- D1: confirmed one task with phase gates; split child tasks only after concrete hardening findings or large independent work appears.
- D2: confirmed default `gate-only` plus `local fake provider`, with true external canary as a first-class explicit opt-in lane for real connectivity and minimum real-flow validation.
- D3: confirmed define-only for now. T-106 should specify the user-like workbench flow and acceptance contract, but concrete UI automation can wait until backend/API and runner hardening lanes stabilize.
- D4: confirmed deterministic LocalScript robustness matrix; cover allowlist, root containment, `shell=false`, timeout, cancellation, idempotency, partial/invalid collect, and redaction, with stress/load out of default scope.
- D5: confirmed seam tests in T-106. Cross-flow coverage should verify refs/hashes/sidecars and no-copy/no-claim-leak behavior without moving PaperImplementation or bridge product ownership.
- D6: confirmed memory plus disposable local Postgres validation. Persistence hardening should prove automation-facing usability for paper-implementation handoff, not mutate the normal developer schema or run long DB stress by default.
- D7: confirmed standalone T-106 hardening command first; hook into T-103 only after the command contract is stable and does not change default full-flow semantics.
- D8: confirmed synthetic deterministic fixtures by default. Controlled local real fixtures and true external samples are explicit opt-in only, with refs/hashes/summaries/cleanup artifacts and no checked-in raw data, model weights, checkpoints, credentials, raw logs, or unredacted provider payloads.

## 2026-07-23: provider-canary ownership handoff to T-132 M7

- Recorded a bilateral ownership handoff with T-132. T-132 M7 uniquely owns Aliyun real-provider contracts, schema/migration, transport, crash recovery, live gate and execution because it owns the current PI/EF v2 Run/Attempt/scientific trust lineage.
- T-106's existing `external-gate` remains a key-presence/prerequisite gate and receives no provider calls or real persistence. T-106 will consume and verify the final redacted M7 verdict rather than creating a second canary implementation.
- The T-132 readiness review found that the existing acknowledged Run is immutable simulation-only and cannot be upgraded. M7 will require a new PI WorkOrder revision/new Run plus an exact typed execution bundle. The new-lineage design preserves T-106's no-second-semantic-track rule.
- No T-106 code, provider configuration, credential, database or cloud resource changed in the handoff.
