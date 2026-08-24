# 04 Verification

> Historical verification log. Commands and `.ai/.tmp` paths recorded below describe the
> pre-T-145 repository contract and are not current operational interfaces.

## 2026-05-19 - Deep cleanup and closure re-review
- Scope: experiment-foundation semantic-drift cleanup after T-078.
- Fixes verified:
  - [pass] removed obsolete T-078 temporary UI-gate evidence directories under `.ai/.tmp/ui/`
  - [pass] split parent acceptance criteria into closed minimum chain and explicit follow-up scope
  - [pass] removed stale parent TODO wording that made completed T-070~T-078 work look unimplemented
  - [pass] removed `external_training_job` from generic registry record kinds so job state is only writable through the T-077 execution table/API
- Commands:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - [pass] targeted `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/experiment-foundation-service.unit.test.ts`
  - [pass] targeted `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/experiment-foundation-execution-service.unit.test.ts`
  - [pass] `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - [pass] `DATABASE_URL=postgresql://user:pass@localhost:5432/paper_engineering_assistant pnpm --filter @paper-engineering-assistant/backend prisma:validate`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] `git diff --check`
  - [blocked external] `pnpm --filter @paper-engineering-assistant/backend test` still requires real `DATABASE_URL` for existing T-054/T-067 topic-selection Prisma HTTP smoke tests; experiment-foundation targeted backend tests passed.
- Result:
  - [pass] `T-069` through `T-078` remain closed for the minimum operational chain.
  - [pass] `T-043` remains `planned` only as parent closure/backlog umbrella.
  - [pass] follow-up requirements are explicitly listed instead of being implied as hidden work inside the completed child packages.

## 2026-05-18 - T-077 landing verification
- Scope: execution adapters minimum backend closure.
- Commands:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] `pnpm --filter @paper-engineering-assistant/backend prisma:format`
  - [pass] `DATABASE_URL='postgresql://user:pass@localhost:5432/paper_engineering_assistant' pnpm --filter @paper-engineering-assistant/backend prisma:validate`
  - [pass] `pnpm --filter @paper-engineering-assistant/backend prisma:generate`
  - [pass] `node .ai/scripts/ctl-db-ssot.mjs sync-to-context`
  - [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - [pass] `cd apps/backend && node --test --loader ts-node/esm src/services/experiment-foundation-execution-service.unit.test.ts`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] `git diff --check`
  - [blocked external] `pnpm --filter @paper-engineering-assistant/backend test` because existing T-054/T-067 Prisma HTTP smoke tests require a real `DATABASE_URL` and migrated Postgres DB; T-077 intentionally did not apply live migrations.
- Result:
  - [pass] `T-077` marked done; next owner is `T-078`
  - [pass] LocalScript execution, mocked Aliyun mirror/policy gates, idempotency, cancellation, collect, validation, and evidence flow have targeted backend coverage.
  - [pass] no live DB migration was applied
  - [pass] desktop UI remains open

## 2026-05-18 - T-076 landing verification
- Scope: persistence/API/readiness minimum backend closure.
- Commands:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] `pnpm --filter @paper-engineering-assistant/backend prisma:format`
  - [pass] `pnpm --filter @paper-engineering-assistant/backend prisma:validate` with dummy Postgres URL for Prisma config validation
  - [pass] `pnpm --filter @paper-engineering-assistant/backend prisma:generate` with dummy Postgres URL
  - [pass] `node .ai/scripts/ctl-db-ssot.mjs sync-to-context`
  - [pass] `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - [pass] `cd apps/backend && node --test --loader ts-node/esm src/services/experiment-foundation-service.unit.test.ts`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] `git diff --check`
  - [blocked] `pnpm --filter @paper-engineering-assistant/backend test` because pre-existing T-054/T-067 Prisma HTTP smoke tests require a reachable migrated Postgres DB; T-076 intentionally did not apply live migrations.
- Result:
  - [pass] `T-076` marked done; next owner is `T-077`
  - [pass] minimum DB/API/readiness backend loop exists for experiment-foundation records
  - [pass] no live DB migration was applied
  - [pass] adapters and desktop UI remain open

## 2026-05-18 - T-075 landing verification
- Scope: candidate promotion shared contracts and schema tests.
- Post-review fixes:
  - [pass] candidate and promotion contracts now reject DTO alias leakage under the repo Fastify/Ajv behavior.
  - [pass] promoted results now require non-empty canonical asset/version/protocol/policy refs.
- Commands:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] `git diff --check`
- Result:
  - [pass] `T-075` marked done; next owner is `T-076`
  - [pass] candidate payloads, candidate support checks, triage reports, promotion requests, and promotion results are frozen as shared contracts
  - [pass] auto-promotion cannot pass without source/provenance refs, confidence threshold, no-duplicate status, complete fields, clear policy, low risk, and deterministic rule traces
  - [pass] canonical asset/protocol/method schemas reject candidate lifecycle drift
  - [pass] product-layer implementation remains open for persistence/API/readiness, adapters, and UI

## 2026-05-17 - T-074 landing verification
- Scope: result/evidence/evaluation-fact/paper-sidecar shared contracts.
- Commands:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] `git diff --check`
- Result:
  - [pass] `T-074` marked done; next owner is `T-075`
  - [pass] result packets, validation reports, facts/observations, evidence candidates, table fact sets, and paper sidecars are frozen as shared contracts
  - [pass] invalid/partial/unvalidated result status cannot create evidence candidates
  - [pass] sidecar contracts reject full reusable DTO copies
  - [pass] product-layer implementation remains open for later persistence/API/adapters/UI tasks

## 2026-05-17 - T-073 landing verification
- Scope: materialization and adapter-boundary shared contracts.
- Commands:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] `git diff --check`
- Result:
  - [pass] `T-073` marked done; next owner is `T-074`
  - [pass] `RunRecipe` remains platform-neutral and T-073 consumes it only through `MaterializeTrainingTaskSpecRequest`
  - [pass] fine-tuning remains a `TrainingTaskSpec(profile_kind = llm_fine_tuning)` profile
  - [pass] adapter-private payloads are represented only by refs/hashes

## 2026-05-17 - T-071 landing verification
- Scope: benchmark/protocol/baseline shared contracts and schema tests.
- Expected:
  - `BenchmarkAsset` / `EvaluationProtocol` ownership split is represented in shared contracts
  - `BaselineAsset` / `BaselineImplementationVersion` ownership split is represented in shared contracts
  - negative tests reject evaluation-rule leakage into `BenchmarkAsset`
  - negative tests reject implementation/baseline-set leakage into `BaselineAsset`
  - shared typecheck/test and governance sync/lint pass
- Actual:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] shared test suite reports 57 passing tests
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] `T-071` marked done; next owner is `T-072`

## 2026-05-17 - T-070 landing verification
- Scope: dataset registry shared contracts and schema tests.
- Expected:
  - `DatasetAsset` / `DatasetVersion` ownership split is represented in shared contracts
  - negative tests reject checksum/storage/path/uri/location/mirror leakage on `DatasetAsset`
  - `DatasetVersionLock` supports downstream RunRecipe dataset locks without storage/mirror refs
  - shared typecheck/test and governance sync/lint pass
- Actual:
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] `T-070` marked done; next owner is `T-071`

## 2026-05-17 - T-069/T-070 review fix verification
- Scope: code-quality review findings after T-070 landing.
- Expected:
  - all review findings are fixed
  - shared typecheck/test pass
  - governance sync/lint pass
- Actual:
  - [pass] `DatasetLocation` now requires resolvable local or remote refs by location kind
  - [pass] `LocalFileRef.relative_path` rejects absolute and parent-traversal paths
  - [pass] parent quality review no longer describes T-070 as documentation-only
  - [pass] `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - [pass] `pnpm --filter @paper-engineering-assistant/shared test`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`

## 2026-05-17 - Semantic drift and closure review
- Scope: mother package and child packages after design-review sync.
- Expected:
  - no remaining wording that implies `DatasetAsset` owns version/checksum/storage/mirror fields
  - no remaining wording that implies `RunRecipe` chooses a concrete platform or owns adapter-private payloads
  - no remaining standalone fine-tuning execution object path
  - repo-state closure review records whether product functionality is actually implemented
  - governance sync/lint passes
- Actual:
  - [pass] removed stale fine-tuning object naming, selected-platform wording, platform-specific leakage wording, old candidate lifecycle, and old benchmark leaderboard-ref wording from active experiment-foundation docs
  - [pass] added `07-quality-closure-review.md`
  - [pass] repo scan confirmed that, at that time, product functionality was not yet closed: shared contracts/tests, DB/API, UI, adapters, and result/evidence sidecar were not implemented
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`

## 2026-05-17 - Child package split verification plan
- Scope: parent package + child task packages for experiment-foundation V1.
- Expected:
  - child packages exist under `dev-docs/active/experiment-foundation-*`
  - each child package has standard dev-docs files
  - parent package maps review issues and child responsibilities
  - project governance sync/lint passes
- Actual:
  - [pass] created 10 child packages from `T-069` through `T-078`
  - [pass] parent package now contains child task index and `06-child-task-review.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] child tasks mapped to `M-001 > F-001 > R-012`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] reran `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` after adding per-flow contract closure checklist
  - [pass] removed parent-doc conflicts for DatasetAsset checksum/storage ownership, BenchmarkAsset protocol-rule ownership, canonical `candidate` lifecycle state, and standalone fine-tuning execution specs
  - [pass] final `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`

## Planned verification
### Governance
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Expected: `T-043 experiment-foundation-v1` registered and derived views updated.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Expected: no project governance errors.

### Slice verification policy
- Every slice `S1` through `S9` MUST append commands, expected results, and actual results to this file before handoff.
- A later slice MUST NOT silently expand an earlier slice's non-goals; record scope changes in `03-implementation-notes.md`.

### Contract and typecheck (after implementation begins)
- `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - Expected: shared contracts compile.
- `pnpm --filter @paper-engineering-assistant/shared test`
  - Expected: existing schema tests and `experiment-foundation-contracts.schema.test.ts` pass.
- `S1` negative contract tests:
  - Expected: reject direct `RecipeDraft` execution, adapter-private fields in `RunRecipe`, tuning without decision, incomplete `PaperExperimentSidecar`, and loose metric-only facts.

### Backend (after implementation begins)
- `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Expected: backend compiles.
- Backend service/route tests selected after routes are created.
  - Expected: CRUD/search/readiness/candidate promotion/run recipe paths pass.

### Database (if persistence changes)
- Use repo Prisma SSOT workflow before applying schema changes.
- Refresh `docs/context/db/schema.json` when required by context awareness.

### Desktop UI (after implementation begins)
- Run existing desktop typecheck/test/governance commands after inspecting package scripts.
- Verify “实验基座” appears below “文献管理”.
- Verify no new dependency on `apps/desktop/src/renderer/styles/**`.

## Verification log
- 2026-05-12:
  - Created initial task package files.
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
    - Result: registered `T-043 experiment-foundation-v1` and regenerated project derived views.
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: project governance lint passed.
- 2026-05-12:
  - Synced discussion result: experiment foundation should not build a training platform; it should provide a fixed control-plane pipeline over external training platforms.
  - Updated docs:
    - `00-overview.md`
    - `01-plan.md`
    - `02-architecture.md`
    - `03-implementation-notes.md`
    - `05-pitfalls.md`
    - `roadmap.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: project governance lint passed after documentation updates.
- 2026-05-12:
  - Synced prior consensus: experiment foundation has four layers: reusable assets, method recipes, evaluation, and external execution control.
  - Updated docs:
    - `00-overview.md`
    - `01-plan.md`
    - `02-architecture.md`
    - `03-implementation-notes.md`
    - `roadmap.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: project governance lint passed after consensus sync.
- 2026-05-12:
  - Synced discussion result: LLM fine-tuning is a first-class experiment-foundation scenario, modeled as a specialized `TrainingTaskSpec` profile submitted through external platform adapters.
  - Updated docs:
    - `00-overview.md`
    - `01-plan.md`
    - `02-architecture.md`
    - `03-implementation-notes.md`
    - `05-pitfalls.md`
    - `roadmap.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: project governance lint passed after LLM fine-tuning sync.
- 2026-05-12:
  - Synced confirmed `DP-02` storage decision: local canonical registry + local file refs + optional cloud execution mirror.
  - Updated docs:
    - `00-overview.md`
    - `01-plan.md`
    - `02-architecture.md`
    - `03-implementation-notes.md`
    - `05-pitfalls.md`
    - `roadmap.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: project governance lint passed after storage decision sync.
- 2026-05-12:
  - Synced confirmed `DP-07` adapter decision: V1 includes `LocalScriptAdapter` and `AliyunPaiDlcAdapter`; `CustomHttpAdapter` is out of V1 scope.
  - Updated docs:
    - `01-plan.md`
    - `02-architecture.md`
    - `03-implementation-notes.md`
    - `05-pitfalls.md`
    - `roadmap.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: project governance lint passed after adapter decision sync.
- 2026-05-12:
  - Synced confirmed `DP-08` result collection contract: metrics + artifacts + logs + config snapshot + validation report.
  - Updated docs:
    - `01-plan.md`
    - `02-architecture.md`
    - `03-implementation-notes.md`
    - `05-pitfalls.md`
    - `roadmap.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: project governance lint passed after result collection decision sync.
- 2026-05-12:
  - Synced confirmed `DP-03` candidate promotion policy: auto-promote low-risk complete candidates; manual review is escalation only, not a default blocking gate.
  - Updated docs:
    - `00-overview.md`
    - `01-plan.md`
    - `02-architecture.md`
    - `03-implementation-notes.md`
    - `05-pitfalls.md`
    - `roadmap.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: project governance lint passed after candidate promotion decision sync.
- 2026-05-12:
  - Synced confirmed `DP-04` baseline/benchmark usage split and tiered verification policy.
  - Updated docs:
    - `00-overview.md`
    - `01-plan.md`
    - `02-architecture.md`
    - `03-implementation-notes.md`
    - `05-pitfalls.md`
    - `roadmap.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: project governance lint passed after baseline/benchmark decision sync.
- 2026-05-12:
  - Synced confirmed `DP-05` RunRecipe depth decision: `RecipeDraft -> RunRecipe -> TrainingTaskSpec`, with `RunRecipe` locked and platform-neutral.
  - Updated docs:
    - `00-overview.md`
    - `01-plan.md`
    - `02-architecture.md`
    - `03-implementation-notes.md`
    - `05-pitfalls.md`
    - `roadmap.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: project governance lint passed after RunRecipe depth decision sync.
- 2026-05-12:
  - Synced confirmed `DP-06` PaperProject integration decision: `PaperExperimentSidecar` with frozen trace refs, no reusable asset DTO expansion in core paper-project contracts.
  - Updated docs:
    - `00-overview.md`
    - `01-plan.md`
    - `02-architecture.md`
    - `03-implementation-notes.md`
    - `05-pitfalls.md`
    - `roadmap.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: project governance lint passed after PaperProject integration decision sync.
- 2026-05-12:
  - Synced confirmed `DP-09` method recipe/tuning scope: reusable method recipes plus human/LLM-in-loop tuning sessions; no automatic hyperparameter optimization.
  - Updated docs:
    - `00-overview.md`
    - `01-plan.md`
    - `02-architecture.md`
    - `03-implementation-notes.md`
    - `05-pitfalls.md`
    - `roadmap.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: project governance lint passed after method recipe/tuning decision sync.
- 2026-05-12:
  - Synced confirmed `DP-10` evaluation fact-layer scope: structured facts support paper tables and implementation decisions; no full leaderboard.
  - Updated docs:
    - `00-overview.md`
    - `01-plan.md`
    - `02-architecture.md`
    - `03-implementation-notes.md`
    - `05-pitfalls.md`
    - `roadmap.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: project governance lint passed after evaluation fact-layer decision sync.
- 2026-05-12:
  - Synced confirmed `DP-01` UI label decision: desktop label is `实验基座`, placed below “文献管理”, while canonical domain remains `experiment-foundation`.
  - Updated docs:
    - `00-overview.md`
    - `01-plan.md`
    - `02-architecture.md`
    - `03-implementation-notes.md`
    - `roadmap.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: project governance lint passed after UI label decision sync.
- 2026-05-12:
  - Synced first implementation slice `S1`: shared contracts + schema tests only.
  - Updated docs:
    - `00-overview.md`
    - `01-plan.md`
    - `03-implementation-notes.md`
    - `04-verification.md`
    - `05-pitfalls.md`
    - `roadmap.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: project governance lint passed after S1 slice sync.
- 2026-05-12:
  - Expanded execution plan into `S1` through `S9` slices:
    - `S1` shared contracts + schema tests
    - `S2` persistence + repository/service skeleton
    - `S3` asset CRUD/search/readiness API
    - `S4` literature-to-asset candidate flow
    - `S5` recipe/tuning/evaluation fact services
    - `S6` `PaperExperimentSidecar` bridge
    - `S7` `LocalScriptAdapter` execution control pipeline
    - `S8` Aliyun PAI-DLC adapter + cloud mirror
    - `S9` desktop “实验基座” workbench
  - Updated docs:
    - `01-plan.md`
    - `03-implementation-notes.md`
    - `04-verification.md`
    - `roadmap.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: project governance lint passed after S1-S9 execution plan sync.
