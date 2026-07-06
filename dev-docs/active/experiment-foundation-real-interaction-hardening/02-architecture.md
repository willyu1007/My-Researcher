# T-106 Architecture

## Ownership Boundary

| Area | T-106 Owns | T-106 Does Not Own |
| --- | --- | --- |
| Contracts | Drift tests and compatibility assertions | New shared domain semantics unless explicitly decided |
| Backend | Hardening tests and targeted reliability fixes | Rewriting T-076/T-077 service ownership |
| Database | Memory/disposable-schema parity and recovery checks for automation-facing behavior | Mutating the developer's normal schema, applying live migrations, or running long DB stress by default |
| Desktop | Workbench API-consumption flow definition, and later smoke/error-rendering tests when scheduled | Renderer-owned readiness, promotion, execution, or validation decisions |
| External execution | LocalScript robustness and external canary gate/opt-in design | Default real cloud execution or checked-in credentials |
| Cross-flow | Ref/hash/sidecar seam tests and no-copy/no-claim-leak guards | Moving PaperImplementation ownership into experiment foundation or adding broad bridge product behavior |

## Harness Layers

1. Contract and schema drift checks: shared schemas, API wrappers, forbidden fields, aliases, and no-copy guards.
2. Service/API checks: registry, readiness, promotion, materialization, execution jobs, result validation, and evidence creation.
3. Persistence checks: memory repositories and disposable local Postgres schema behavior.
4. Local execution checks: LocalScript command/root/path/timeout/cancel/collect lifecycle.
5. Desktop checks: define a user-like workbench flow through existing backend APIs first; implement automation only after lower lanes stabilize.
6. Cross-flow checks: PaperImplementation and evidence consumers use refs/hashes/sidecars only.
7. External canary checks: default gate-only checks, local fake provider execution, and true opt-in external lane with redacted artifacts.

## Artifact Contract

Default artifact root:

```text
.ai/.tmp/experiment-foundation-hardening/<run-id>/
```

Expected artifact categories:

- `matrix`: scenario coverage, lane status, and fixture inventory.
- `commands`: invoked checks, durations, exit codes, and redacted environment summary.
- `api`: request/response summaries without secrets, raw datasets, logs, or private adapter payloads.
- `ui`: screenshots or traces only when redacted and useful for debugging.
- `external`: canary skip/block/pass reports with no credentials or cloud SDK payloads.

## Fixture Policy

- Default fixtures MUST be synthetic and deterministic.
- Controlled local real fixtures MAY be used only when opt-in, located outside checked-in source or under `.ai/.tmp`, and redacted.
- External cloud fixtures MUST be opt-in, cost-bounded, cleanup-verified, and capable of proving minimum real submit/sync/collect/result/evidence flow when configured.
- Fixtures must avoid raw datasets, model weights, checkpoints, and credentials.

Allowed fixture classes:

| Class | Default | Storage | Artifact Rule |
| --- | --- | --- | --- |
| Synthetic deterministic | Yes | Checked-in source or generated under `.ai/.tmp` | Full payload allowed only when it is non-sensitive synthetic test data. |
| Controlled local real | No, explicit opt-in | Outside repo or `.ai/.tmp` | Store refs, hashes, summaries, and redacted diagnostics only. |
| True external canary sample | No, explicit opt-in | External provider plus redacted `.ai/.tmp` summary | Store refs, hashes, status, durations, validation summary, evidence refs, and cleanup result only. |

## Runner Relationship

T-103 remains the standard full-flow runner. T-106 should add a standalone hardening command first. After the command contract is stable, either:

- add a T-103 lane hook that invokes the T-106 command; or
- document the T-106 command as the official hardening entrypoint while T-103 stays the standard closure runner.

Implemented command shape:

```bash
pnpm experiment-foundation:hardening -- --mode contract
pnpm experiment-foundation:hardening -- --mode deterministic
pnpm experiment-foundation:hardening -- --mode real-local-db --require-real-db
pnpm experiment-foundation:hardening -- --mode ui-definition
pnpm experiment-foundation:hardening -- --mode external-gate --include-true-external-canary
pnpm experiment-foundation:hardening -- --mode full --include-true-external-canary
```

The command supports explicit lane selection and writes redacted artifacts under `.ai/.tmp/experiment-foundation-hardening/<run-id>/`.

`deterministic` runs targeted shared schema, backend execution, capability harness, PaperImplementation seam, backend typecheck, governance sync dry-run, governance lint, and diff hygiene checks. `real-local-db` invokes the opt-in disposable Postgres parity probe. `ui-definition` validates the Phase 4 workbench flow contract. `external-gate` validates prerequisite key presence only.

The T-103 handoff remains documented rather than embedded: T-103 is the standard full-flow closure runner; T-106 is the official post-V1 hardening entrypoint.

The external gate reads key presence from `process.env` and root `.env.local`. It records only source/presence booleans, never values.

## External Canary Boundary

T-106 uses three external lanes:

- `gate-only`: default; validates opt-in flags and required environment shape without calling external services.
- `local-fake-external`: default; exercises submit/sync/collect/result/evidence behavior through a fake provider without cloud credentials.
- `true-external-canary`: explicit opt-in; Phase 6/7 implements prerequisite gating only. A later provider-specific implementation must call the configured external provider with minimum resources to verify connectivity and real flow.

The true canary must return `blocked`, not `passed`, when credentials, project/bucket/queue, mirror, approval, or cleanup prerequisites are missing.

A gate status of `ready_for_provider_specific_real_execution` means the local prerequisites are present. It is not evidence that any real external provider was contacted.

Supported provider gate contracts are explicit. The initial gate allows `aliyun_pai_dlc`; unknown provider names return `blocked` until a provider-specific gate is added.

True canary artifacts must not store raw datasets, model weights, checkpoints, raw provider logs, SDK payloads, access keys, secrets, full endpoint credentials, or unredacted bucket/object paths.

## UI Flow Contract

T-106 defines the UI proof target before implementing UI automation. The executable Phase 4 contract lives in `07-ui-workbench-flow-contract.md`. The later workbench test should cover this user path:

1. Open `实验基座` from the desktop navigation.
2. In Registry, create or upsert a valid contract payload and verify list/detail refresh.
3. In Readiness, run a check for the selected record and display blockers/actions when not passed.
4. In Recipe/Materialization, inspect or upsert frozen payloads without generating domain decisions in the renderer.
5. In Execution/Evidence, submit or inspect a job, run sync/cancel/collect where available, and display result/evidence refs.
6. Trigger at least one malformed payload or gate failure and verify the error state is readable and contained.

### Mapping to the S2/S3 IA (post-T-110 cutover)

The T-078 5-tab IA the contract was authored against has been retired through T-110 S1–S3. The flow steps now map as follows; the UI smoke (`apps/desktop/scripts/smoke-e2e.mjs`) asserts each step against the new mounts.

| Contract step | New surface (post-T-110) | Smoke assertions (sample) |
|---|---|---|
| 1. Open 实验基座 | `coreNavItems` includes 实验基座; `<ExperimentFoundationModule>` mounted; Topbar exposes `aria-label="实验基座标签页"`. | `assertExperimentFoundationWorkbenchSource` — nav order + module mount + topbar label. |
| 2. Registry create / upsert | `资产库` parent tab with sub-tabs Dataset / Benchmark / Baseline / Protocol / Facts. Each typed view uses `useTypedAssetDraft` + `AssetFilterToolbar` + `MutationFeedback`. | Asserts on `<DatasetAssetView>` / `<BaselineAssetView>` / `<BenchmarkAssetView>` / `<EvaluationProtocolView>` / `<FactsView>` mounts; backend POST `/records` for `dataset_asset`. |
| 3. Readiness check | Module-level `<ReadinessInspector>` (`data-ui="modal"`) opened by `goToReadiness(kind, id)` deep-links from Overview or per-stage buttons. Drives `getLatestExperimentFoundationReadiness` + `checkExperimentFoundationReadiness`. | Smoke calls `POST /readiness/check` then `GET /readiness?status=blocked` (S0+ canonical list endpoint) and asserts the previously-created report's id appears, plus rejection of `status=not_a_status`. |
| 4. Recipe / Materialization inspect | Absorbed into `实验流` Tab via `<ExperimentFlowPanel>`. Per-stage cards for `recipe_draft` / `run_recipe` / `materialize_request` / `materialization_result` / `training_task_spec`. Each surfaces an Advanced JSON disclosure. | `useExperimentFlowController` covers the 10 canonical stages; timeline mounts each card; renderer reads via `getRunRecipePayload(...)`. |
| 5. Submit / Sync / Cancel / Collect + Evidence refs | Absorbed into `实验流`'s `external_training_job` stage. Typed `SubmitJobForm` / `SyncJobForm` / `CancelJobForm` / `CollectJobForm` replace the legacy JSON-textarea editors. Sync/Cancel/Collect are gated on `disabled={!hasSelectedJob}`. | Asserts each form declared + mounted; gated state assertion; Cancel CTA uses literal `data-variant="danger"` per UI gate. Backend `POST /execution/jobs/submit` with empty body returns 400 (boundary verification). |
| 6. Malformed payload + error rendering | `data-tone="danger"` branches in `OverviewPanel`, `ReadinessInspector`, `JobActionForms`. | Source assertions on all three surfaces; backend `POST /records` with empty payload returns 4xx. |

The UI proof must assert:

- backend APIs remain the source of readiness, promotion, materialization, execution, validation, and evidence decisions;
- renderer code does not invent statuses, hashes, promotion eligibility, result validity, or evidence eligibility;
- UI state is only filters, selected ids, editor content, loading/error state, and display formatting;
- screenshots, traces, and logs are redacted before being stored as artifacts.

### Smoke entrypoint

`pnpm --filter @paper-engineering-assistant/desktop smoke:e2e` is the official UI-driven full-flow smoke. It boots a memory-backed backend on a held port, starts the desktop dev server, runs the source-level + API-level assertions, and tears down both processes. Implementation lives at `apps/desktop/scripts/smoke-e2e.mjs`; the assertion catalogue lives in `assertExperimentFoundationWorkbenchSource` and `smokeExperimentFoundationApis`. Co-owned with `T-110 S5` per the soft-preference decision in `dev-docs/archive/experiment-foundation-research-workbench/03-implementation-notes.md`.

## LocalScript Robustness Contract

T-106 should test LocalScript as a real local execution boundary, but the default suite must stay deterministic.

| Scenario | Risk Covered | Expected Proof |
| --- | --- | --- |
| Execution disabled outside test unless explicitly enabled | Accidental local command execution | Submit is blocked with a stable gate error. |
| Command allowlist | Arbitrary command execution | Non-allowlisted command is rejected before spawn. |
| `shell=false` behavior | Shell injection through arguments | Shell metacharacters are passed as args or rejected, not interpreted by a shell. |
| Execution root containment | Reading or writing outside the allowed root | `cwd`, input, output, and artifact paths outside root are rejected. |
| Timeout | Hung process | Job transitions to failed/cancelled-equivalent status with no pass-after-timeout artifact. |
| Cancellation | Running process lifecycle | Cancel records a cancellation request and sync reflects the terminal status. |
| Submit idempotency | Duplicate user/API retries | Same idempotency key and same task returns the existing job. |
| Idempotency conflict | Key reuse for different task/materialization | Same key with different task/materialization returns `VERSION_CONFLICT`. |
| Repeated sync/collect | Retry safety | Repeated calls are stable and do not duplicate result/evidence refs. |
| Partial collect | Incomplete external output | Produces partial/invalid validation according to T-074/T-077, not a false valid result. |
| Malformed result payload | Adapter output drift | Collect rejects or records invalid validation without paper-claim leakage. |
| Artifact redaction | Secret/path/log leakage | Reports omit credentials, raw logs, raw paths where unsafe, and adapter-private payloads. |

Out of default scope:

- load testing;
- long-running soak testing;
- high-concurrency submit/cancel storms;
- platform performance benchmarks.

## Cross-flow Seam Contract

T-106 should prove that experiment-foundation outputs can be consumed by adjacent flows without creating another authority track.

Required seam assertions:

- PaperImplementation or adjacent evidence consumers store experiment-foundation refs, hashes, facts, evidence refs, and sidecar refs, not full `DatasetAsset`, `DatasetVersion`, `RunRecipe`, `TrainingTaskSpec`, `ExperimentResult`, or `EvidenceCandidate` DTO copies.
- WorkOrder or implementation evidence intake does not call lower-level experiment-foundation repositories directly when an established service/API boundary exists.
- Evidence candidates and sidecars are not treated as accepted paper claims, final conclusions, final rendered tables, or leaderboard rankings.
- Cross-flow tests preserve ownership: experiment foundation owns reusable assets, execution, results, validation, and sidecars; PaperImplementation owns paper/work-order interpretation.
- If a seam test requires new product behavior beyond compatibility glue, create a follow-up task instead of expanding T-106 silently.

## Persistence Hardening Contract

T-106 should treat persistence as an automation handoff guarantee, not as a standalone database exercise.

Required persistence assertions:

- Memory and Prisma-backed disposable Postgres paths expose the same record ids, hashes, statuses, list filters, readiness reports, promotion outcomes, job states, result refs, and evidence refs for the same scenario.
- Disposable Postgres validation uses an isolated schema or equivalent non-destructive setup and records cleanup status.
- Retry behavior is stable for create/upsert, readiness check, promotion decision, submit, sync, cancel, collect, and result/evidence reads.
- Duplicate ids, idempotency conflicts, missing refs, stale readiness, hash mismatch, and invalid promotion gates return stable automation-consumable errors.
- The suite proves paper-implementation automation can resume from persisted refs after process or request interruption.

Out of default scope:

- long-running DB stress;
- destructive migration application against the developer's normal schema;
- broad query performance benchmarking;
- schema redesign unless a hardening failure exposes a concrete product defect.
