# 04 Verification

## Planned Commands
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- `pnpm --filter @paper-engineering-assistant/shared test`
- `pnpm --filter @paper-engineering-assistant/shared typecheck`
- `DATABASE_URL=postgresql://user:pass@localhost:5432/db pnpm --filter @paper-engineering-assistant/backend prisma:validate`
- `pnpm --filter @paper-engineering-assistant/backend typecheck`
- `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/topic-selection-v1a-routes.integration.test.ts`
- `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/topic-selection-v1b-routes.integration.test.ts`
- `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/topic-selection-v1c-routes.integration.test.ts`
- `node .ai/scripts/ctl-openapi-quality.mjs verify --strict`
- `node .ai/scripts/ctl-api-index.mjs verify --strict`
- `node .ai/skills/features/context-awareness/scripts/ctl-context.mjs verify --strict`
- `pnpm ci:prisma-smoke -- --base-url "$(sed -n 's/^DATABASE_URL=//p' .env.local)" --schema-prefix topic_selection_acceptance --artifacts-dir .ai/.tmp/prisma-smoke-topic-selection-acceptance`

## Results
## 2026-05-16 Task Package Opening
- Check: created `dev-docs/active/topic-selection-backend-decision-chain-acceptance/` with standard task bundle files.
- Result: task package opened as `T-068`, status `planned`.
- Check: `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`.
- Result: passed; T-068 registered in project hub.
- Check: `node .ai/scripts/ctl-project-governance.mjs map --project main --task T-068 --feature F-001 --milestone M-001 --requirement R-009 --apply`.
- Result: passed; T-068 mapped to `M-001 / F-001 / R-009`.
- Check: `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main && node .ai/scripts/ctl-project-governance.mjs lint --check --project main`.
- Result: passed; registry and derived views are in sync.
- Check: `git diff --check`.
- Result: passed.

## 2026-05-16 End-to-End Functional Acceptance
- Check: task status update.
- Result: T-068 moved from `planned` to `in-progress` before running acceptance commands.

- Check: `pnpm --filter @paper-engineering-assistant/shared typecheck`.
- Result: passed.

- Check: `pnpm --filter @paper-engineering-assistant/shared test`.
- Result: passed; 45 tests passed, 0 failed, 0 skipped.

- Check: `DATABASE_URL=postgresql://user:pass@localhost:5432/db pnpm --filter @paper-engineering-assistant/backend prisma:validate`.
- Result: passed; Prisma schema is valid.

- Check: `pnpm --filter @paper-engineering-assistant/backend typecheck`.
- Result: passed; Prisma generate completed before TypeScript compilation.

- Check: `node .ai/scripts/ctl-openapi-quality.mjs verify --strict && node .ai/scripts/ctl-api-index.mjs verify --strict && node .ai/skills/features/context-awareness/scripts/ctl-context.mjs verify --strict`.
- Result: passed; API index checksum verified and context verification passed with the built-in validator.

- Check: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/topic-selection-v1a-routes.integration.test.ts`.
- Result: passed; 3 tests passed, 0 failed.
- Covered:
  - v1a evidence-to-need route path through `buildApp`.
  - malformed search-plan payload rejection before service execution.
  - optional request-body endpoints accepting omitted bodies.

- Check: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/topic-selection-v1b-routes.integration.test.ts`.
- Result: environment/precondition failure without `DATABASE_URL`; 4 memory-mode route tests passed and the Prisma HTTP smoke subtest failed with `DATABASE_URL is required for T-054 Prisma HTTP smoke test.`
- Classification: environment/precondition failure, not accepted as persistence evidence by itself.
- Resolution: the same T-054 Prisma HTTP smoke subtest passed in the isolated Prisma smoke run below.

- Check: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/topic-selection-v1c-routes.integration.test.ts`.
- Result: environment/precondition failure without `DATABASE_URL`; 4 memory-mode route tests passed and the Prisma HTTP smoke subtest failed with `DATABASE_URL is required for T-067 Prisma HTTP smoke test.`
- Classification: environment/precondition failure, not accepted as persistence evidence by itself.
- Resolution: the same T-067 Prisma HTTP smoke subtest passed in the isolated Prisma smoke run below.

- Check: `pnpm ci:prisma-smoke -- --base-url "$(sed -n 's/^DATABASE_URL=//p' .env.local)" --schema-prefix topic_selection_acceptance --artifacts-dir .ai/.tmp/prisma-smoke-topic-selection-acceptance`.
- Result: passed.
- Evidence:
  - Smoke schema created: `topic_selection_acceptance_20260516_023007_d307`.
  - Prisma generate passed.
  - 34 repo migrations applied.
  - Backend tests passed against isolated Prisma schema: 424 tests total, 423 passed, 1 skipped, 0 failed.
  - T-054 v1b Prisma HTTP smoke passed as backend test `ok 64`.
  - T-067 v1c Prisma HTTP smoke passed as backend test `ok 68`.
  - Smoke schema cleanup passed; `90-summary.json` reports `success: true`, `failed: false`, `cleanup_failed: false`.
- Artifacts:
  - `.ai/.tmp/prisma-smoke-topic-selection-acceptance/20260516-023007/00-context.json`
  - `.ai/.tmp/prisma-smoke-topic-selection-acceptance/20260516-023007/01-prisma-generate.log`
  - `.ai/.tmp/prisma-smoke-topic-selection-acceptance/20260516-023007/02-prisma-migrate-deploy.log`
  - `.ai/.tmp/prisma-smoke-topic-selection-acceptance/20260516-023007/03-backend-test-prisma.log`
  - `.ai/.tmp/prisma-smoke-topic-selection-acceptance/20260516-023007/04-drop-schema.log`
  - `.ai/.tmp/prisma-smoke-topic-selection-acceptance/20260516-023007/90-summary.json`

## Hard Decision Invariants
- v1a:
  - Candidate creation stores hypothesis only.
  - Non-validate adjudication persists result with no `output_validated_need_id`.
  - Validate adjudication requires a human confirmation actor and creates `HumanConfirmedDecision`, `ValidatedNeed`, candidate result link, and v1b bundle.
  - `request_searchplan_recheck` emits T-052 request without mutating `SearchPlan`.
  - Memory suggestions remain suggestions only.
- v1b:
  - `advance_to_package` creates a trace-ready draft package and v1c bundle.
  - Non-advance and already-output decisions cannot create packages.
  - Boundary conflicts create revision-needed packages without v1c bundles.
- v1c:
  - Promote handoff creates an active `PaperProjectBridge` without creating `PaperProject`.
  - Non-promote, superseded, missing commitment, workspace drift, and malformed bridge handoff lineage are rejected before bridge creation.
  - Downstream feedback maps loopback causes to explicit targets and remains append-only.
  - Upstream authority loopbacks are rejected when bridge lineage is missing.
- Control plane and replay:
  - Raw `QualitySignal` does not directly block or create authority state.
  - `needs-human-review` transition requires valid human confirmation.
  - Offline replay records case results without production workflow or `ValidatedNeed` dependencies.
  - v1c replay metrics include human-promotion bypass and bridge trace completeness checks.

## Acceptance Summary
- Decision: accepted after tightened node-level, invariant/negative, route-contract, and isolated persistence acceptance on 2026-05-16.
- Blocking backend defects found in the previous pass: none found.
- Required follow-ups: none inside T-068.
- Out-of-scope residual gaps:
  - Desktop reviewer UI does not yet expose the new v1a/v1b/v1c reviewer workflow.
  - Full downstream `PaperProject` execution remains separate from `PaperProjectBridge` handoff acceptance.
  - Synthetic replay baselines do not establish mature real-world research-quality thresholds.

## 2026-05-16 Closure Checks
- Check: `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main && node .ai/scripts/ctl-project-governance.mjs lint --check --project main`.
- Result: passed; T-068 is registered as `done` in project hub derived views.
- Check: `git diff --check`.
- Result: passed.

## 2026-05-16 Invariant, Negative, Persistence, And Contract Acceptance
- Change: extended `apps/backend/src/routes/topic-selection-decision-chain-acceptance.test.ts`.
- Fixture: reused the deterministic T-068 mock data and added targeted negative branches without relying on broad connectivity.
- Check: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/topic-selection-decision-chain-acceptance.test.ts`.
- Result: passed; 32 tests passed, 0 failed. The parent decision-chain test contains 30 node-level/invariant subtests.
- Added invariant/negative coverage:
  - v1a blocked readiness with no support/baseline/context refs returns `evidence_gap` and cannot create a validation support packet;
  - v1a duplicate adjudication after `ValidatedNeed` authority closure returns `GATE_CONSTRAINT_FAILED`;
  - v1b `park` disposition cannot create a draft package or v1c handoff;
  - v1b duplicate draft package creation for the same value disposition returns `VERSION_CONFLICT`;
  - v1c non-promote `refine_package` decision is not bridge-eligible and bridge creation returns `GATE_CONSTRAINT_FAILED`;
  - downstream `no_recheck_needed` feedback appends a second feedback item without fabricating a recheck projection.
- Added route-contract coverage:
  - malformed v1a search-plan payload returns `INVALID_PAYLOAD`;
  - invalid v1b slice-selection enum returns `INVALID_PAYLOAD`;
  - malformed v1c promotion-decision payload returns `INVALID_PAYLOAD`;
  - malformed v1c downstream-feedback payload returns `INVALID_PAYLOAD`.
- Check: `pnpm --filter @paper-engineering-assistant/backend typecheck`.
- Result: passed; Prisma generate completed before TypeScript compilation.
- Check: `pnpm --filter @paper-engineering-assistant/shared test`.
- Result: passed; 45 tests passed, 0 failed, 0 skipped.
- Check: `pnpm --filter @paper-engineering-assistant/shared typecheck`.
- Result: passed.
- Check: `node .ai/scripts/ctl-openapi-quality.mjs verify --strict`.
- Result: passed.
- Check: `node .ai/scripts/ctl-api-index.mjs verify --strict`.
- Result: passed; API index checksum verified as `10d71b81260cc1be...`.
- Check: `node .ai/skills/features/context-awareness/scripts/ctl-context.mjs verify --strict`.
- Result: passed; context verification used the built-in validator because Ajv is not installed locally.
- Check: `pnpm ci:prisma-smoke -- --base-url "$(sed -n 's/^DATABASE_URL=//p' .env.local)" --schema-prefix topic_selection_acceptance --artifacts-dir .ai/.tmp/prisma-smoke-topic-selection-acceptance`.
- Result: passed.
- Evidence:
  - Smoke schema created: `topic_selection_acceptance_20260516_031236_0122`.
  - Prisma generate passed.
  - 34 repo migrations applied.
  - Backend tests passed against isolated Prisma schema: 456 tests total, 455 passed, 1 skipped, 0 failed.
  - T-068 decision-chain acceptance passed inside the isolated backend test run.
  - Smoke schema cleanup passed; script reported successful execution.
- Artifacts:
  - `.ai/.tmp/prisma-smoke-topic-selection-acceptance/20260516-031236/00-context.json`
  - `.ai/.tmp/prisma-smoke-topic-selection-acceptance/20260516-031236/01-prisma-generate.log`
  - `.ai/.tmp/prisma-smoke-topic-selection-acceptance/20260516-031236/02-prisma-migrate-deploy.log`
  - `.ai/.tmp/prisma-smoke-topic-selection-acceptance/20260516-031236/03-backend-test-prisma.log`
  - `.ai/.tmp/prisma-smoke-topic-selection-acceptance/20260516-031236/04-drop-schema.log`
  - `.ai/.tmp/prisma-smoke-topic-selection-acceptance/20260516-031236/90-summary.json`

## 2026-05-16 Tightened Node-Level Acceptance
- Change: added `apps/backend/src/routes/topic-selection-decision-chain-acceptance.test.ts`.
- Fixture: deterministic T-068 mock title card, literature source, coverage rows, evidence units, v1b LLM outputs, human decisions, promotion condition, and downstream feedback.
- Check: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/topic-selection-decision-chain-acceptance.test.ts`.
- Result: passed; 28 tests passed, 0 failed. The parent test contains 27 node-level subtests.
- Covered v1a nodes:
  - fixture title card/literature/evidence basket;
  - topic seed;
  - resource pool snapshot;
  - search plan;
  - search run and coverage matrix;
  - evidence map and validation evidence bundle;
  - need candidate;
  - readiness assessment and validation support packet;
  - human adjudication and v1b input handoff.
- Covered v1b nodes:
  - intake snapshot;
  - research constraint profile;
  - intake readiness;
  - research-slice option generation;
  - human slice selection and `ResearchSlice` materialization;
  - topic-question candidate generation;
  - human question selection and contract materialization;
  - value assessment gates/dimensions;
  - value disposition;
  - trace-ready draft package;
  - idempotent v1c input handoff.
- Covered v1c nodes:
  - promotion input snapshot;
  - deterministic promotion support;
  - dossier;
  - argument readiness mini-check;
  - promotion gate;
  - human promotion decision;
  - commitment profile;
  - promotion decision read models;
  - active `PaperProjectBridge` without `PaperProject` side effect;
  - downstream feedback and recheck projection.
- Negative boundaries:
  - system-only v1a validate adjudication rejected with `INVALID_PAYLOAD`;
  - premature bridge creation rejected with `NOT_FOUND`;
  - non-human v1c promotion actor rejected with `INVALID_PAYLOAD`.
- Check: `pnpm --filter @paper-engineering-assistant/backend typecheck`.
- Result: passed.
- Check: `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main && node .ai/scripts/ctl-project-governance.mjs lint --check --project main`.
- Result: passed; T-068 remains registered as `done` after the tightened acceptance update.
- Check: `git diff --check`.
- Result: passed.

## 2026-05-16 Final Closure Checks
- Check: `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`.
- Result: passed; T-068 is registered as `done` in project hub derived views after the invariant/persistence acceptance update.
- Check: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`.
- Result: passed.
- Check: `git diff --check`.
- Result: passed.

## 2026-05-16 Quality Baseline Acceptance
- Change: extended `apps/backend/src/routes/topic-selection-decision-chain-acceptance.test.ts` with a dedicated route-level quality baseline acceptance test.
- Scope:
  - v1a/v1b/v1c synthetic offline replay baseline datasets;
  - case-type coverage and same-stage frozen input bundles;
  - stage-specific default metric sets;
  - representative metric ratios;
  - replay diff changed-dimension coverage;
  - cross-stage metric rejection.
- Check: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/topic-selection-decision-chain-acceptance.test.ts`.
- Result: passed; 33 tests passed, 0 failed. The target file now includes node-level decision-chain acceptance, route-contract acceptance, and quality baseline acceptance.
- Quality baseline assertions:
  - each stage's synthetic dataset is `synthetic_fixture`, `active`, and covers every required stage-specific case type;
  - each case has a same-stage frozen input bundle and `fixture_observed_output`;
  - incompatible cross-stage metric keys return `INVALID_PAYLOAD`;
  - each run exposes the full stage-specific metric key set;
  - metric records carry numeric numerator/denominator, case refs, failure refs, and notes;
  - representative ratios match expected v1a/v1b/v1c synthetic baseline values;
  - replay diffs expose the expected changed dimensions for v1a, v1b, and v1c.
- Check: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/topic-selection-offline-evaluation-replay-service.unit.test.ts`.
- Result: passed; 19 tests passed, 0 failed.
- Check: `pnpm --filter @paper-engineering-assistant/backend typecheck`.
- Result: passed; Prisma generate completed before TypeScript compilation.
- Check: `pnpm --filter @paper-engineering-assistant/shared test`.
- Result: passed; 45 tests passed, 0 failed, 0 skipped.
- Acceptance interpretation: accepted as a synthetic offline replay regression baseline. It does not establish mature real-world research-quality thresholds.

## 2026-05-17 Real-Resource Environment Rehearsal
- Scope: run a real small-sample topic-selection flow after the literature resource pool was populated.
- Resource pool preflight:
  - `literature_total=129`
  - `with_abstract=123`
  - `with_key_content_digest=102`
  - `pipeline_abstract_ready=103`
  - `pipeline_key_content_ready=102`
  - `content_assets_ready=102`
  - `topic_literature_scope=109`
  - selected scope: `ai-rag-finetuning-2022-2026`
- Early live-run findings:
  - `real-flow-1778996378002-098c5c`: value assessment cited wrapper evidence refs; classified as LLM contract drift.
  - `real-flow-1778996602309-a82722` and `real-flow-1778996796862-6b9c1c`: topic-question output cited `research_slice` / boundary / assumption refs in fields that require exact boundary, assumption, or evidence refs; classified as LLM contract drift.
  - `real-flow-1778996936735-bc90a3`: ordinary evidence sufficiency uncertainty was emitted as a hard blocker; classified as risk-taxonomy drift.
  - `real-flow-1778997136585-2a2b10` and `real-flow-1778997270501-ada48e`: value assessment / package handoff exposed the rule that `ready_with_accepted_risk` requires true accepted-risk authority refs; classified as correct governance constraint plus harness gap.
- Fixes verified:
  - `apps/backend/src/services/topic-selection-v1b-topic-question-service.ts`
  - `apps/backend/src/services/topic-selection-v1b-topic-question-service.unit.test.ts`
  - `apps/backend/src/services/topic-selection-v1b-value-assessment-service.ts`
  - `apps/backend/src/services/topic-selection-v1b-value-assessment-service.unit.test.ts`
  - `.ai/.tmp/topic-selection-real-flow.mjs`
- Check: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/topic-selection-v1b-topic-question-service.unit.test.ts`.
- Result: passed; 26 tests passed, 0 failed.
- Check: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/topic-selection-v1b-value-assessment-service.unit.test.ts`.
- Result: passed; 19 tests passed, 0 failed.
- Check: `pnpm --filter @paper-engineering-assistant/backend typecheck`.
- Result: passed; Prisma generate completed before TypeScript compilation.
- Check:
  ```bash
  set -a
  . ./.env.local
  set +a
  pnpm --filter @paper-engineering-assistant/backend exec node --loader ts-node/esm ../../.ai/.tmp/topic-selection-real-flow.mjs
  ```
- Result: passed.
- Final run:
  - Run id: `real-flow-1778997699431-177e4e`
  - Artifact dir: `.ai/.tmp/topic-selection-real-flow/real-flow-1778997699431-177e4e`
  - Model: `gpt-5.4-mini`
  - Literature count: 12 role-balanced records.
  - v1a output: `title_card_68611777-1a24-4393-ac21-a519b8c4cf64`, `validated_need_425b35c0-e395-4e0e-b9cb-c79504ecd656`, `v1b_input_bundle_b9cde891-55ad-40de-b52a-23b4baea92e5`.
  - v1b output: `topic_question_contract_3c219080-3bad-4848-9b39-02919a163738`, `topic_value_assessment_c1ab1fb0-a689-4ce4-a1bc-bcf96a053b07`, `topic_package_dd05f8d8-16ff-4b93-92a6-29e917686089`, `v1b_to_v1c_input_bundle_c48dd5ab-ffb9-4d79-939d-f883c3053965`.
  - v1c output: `promotion_decision_37522343-18a5-44ec-a0c2-cbb8bc68f0fa`, `paper_project_bridge_e8e3a776-eb41-48a1-b47c-554677f5e018`.
- Persistence readback:
  - `TopicQuestionContract.status=active`
  - `TitleCardValueAssessment.v1bReadinessStatus=ready`
  - `TitleCardValueAssessment.v1bFreshnessStatus=current`
  - `TitleCardPackage.v1bReadinessStatus=ready_for_promotion_review`
  - `TopicSelectionV1bToV1cInputBundle.bundleStatus=ready_for_promotion_review`
  - `TopicSelectionPromotionDecision.bridgeEligible=true`
  - `TopicSelectionPaperProjectBridge.bridgeStatus=active`
- Acceptance interpretation: accepted as real environment rehearsal evidence. It proves the configured local LLM, populated literature scope, backend decision chain, persistence, and v1c bridge can run together for a small real sample. It still does not establish mature real-world research-quality thresholds.

## 2026-05-17 Resource-Sampling And Accepted-Risk Live Test
- Scope: test whether a stricter real-resource sampler still runs end to end and whether the accepted-risk path works in a live LLM flow.
- Resource audit artifact: `.ai/.tmp/topic-selection-real-tests/resource-audit-1779009276003/resource-audit.json`.
- Resource audit result:
  - scoped records: 109
  - ready records: 102
  - source-ready records: 102
  - role counts: `rag_retrieval=79`, `fine_tuning=14`, `baseline_eval=38`, `risk_challenge=10`, `foundation_context=22`
  - possible topic-drift records: 11
- Check: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/topic-selection-decision-chain-acceptance.test.ts`.
- Result: passed; 33 tests passed, 0 failed.
- Check: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/topic-selection-v1b-topic-question-service.unit.test.ts src/services/topic-selection-v1b-value-assessment-service.unit.test.ts`.
- Result: passed; 45 tests passed, 0 failed.
- Check: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/topic-selection-v1b-topic-question-service.unit.test.ts`.
- Result: passed after adding aggregate-slice alias coverage; 26 tests passed, 0 failed.
- Check: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/topic-selection-v1b-value-assessment-service.unit.test.ts`.
- Result: passed; 19 tests passed, 0 failed.
- Check: `pnpm --filter @paper-engineering-assistant/backend typecheck`.
- Result: passed.
- Check:
  ```bash
  set -a
  . ./.env.local
  set +a
  TOPIC_SELECTION_REAL_LITERATURE_LIMIT=16 pnpm --filter @paper-engineering-assistant/backend exec node --loader ts-node/esm ../../.ai/.tmp/topic-selection-real-flow.mjs
  ```
- Result: passed after tightening support/challenge sampling.
- Final run:
  - Run id: `real-flow-1779009570584-8d4f4a`
  - Artifact dir: `.ai/.tmp/topic-selection-real-flow/real-flow-1779009570584-8d4f4a`
  - Literature count: 16 role-balanced records.
  - Topic question: `What evidence-linked decision protocol can guide when RAG is more defensible, when fine-tuning is more defensible, and when neither is justified under offline, local-asset-only constraints?`
  - Answerability verdict: `answerable_with_risk`
  - Accepted risk: `accepted_risk_d2f2ce96-8501-4b5a-bc2d-3255cd30940a`
  - Bridge: `paper_project_bridge_70294c92-980b-4dcb-8cd7-7e6c770f9dae`
- Persistence readback:
  - `TopicQuestionContract.status=active`
  - `TopicValueAssessment.v1bReadinessStatus=ready_with_accepted_risk`
  - `TitleCardPackage.v1bReadinessStatus=ready_for_promotion_review`
  - `TopicSelectionV1bToV1cInputBundle.bundleStatus=ready_for_promotion_review`
  - `TopicSelectionPromotionDecision.bridgeEligible=true`
  - `TopicSelectionPaperProjectBridge.bridgeStatus=active`
  - accepted risk ref is preserved on contract, bundle, promotion decision, and bridge.
- Sampling interpretation: the pool is testable now, but production-quality sampling should add a durable relevance classifier or curated inclusion/exclusion rules before treating generated topics as research-quality outputs.

## 2026-05-18 v1c Product-Level Route Hardening
- Scope: deepen v1c HTTP-level closure beyond broad route connectivity.
- Change: extended `apps/backend/src/routes/topic-selection-v1c-routes.integration.test.ts`.
- Added assertions:
  - `PaperProjectBridge` preserves promotion input snapshot id/hash and source promotion decision id;
  - `PaperProjectBridge.working_copy_payload` carries claim ceiling, promotion conditions, early-check obligations, and source lineage summary;
  - v1c bridge creation remains handoff-only with `paper_project_intake_ref=null` and `target_paper_project_ref=null`;
  - stale confirmed snapshot hash returns `VERSION_CONFLICT`;
  - malformed promotion condition payload returns `INVALID_PAYLOAD`;
  - second current promotion decision for the same promotion input snapshot returns `VERSION_CONFLICT`;
  - bridge workspace drift returns `VERSION_CONFLICT`, and a valid bridge can still be created afterward.
- Baseline check:
  ```bash
  set -a
  . ./.env.local
  set +a
  pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm \
    src/services/topic-selection-v1c-promotion-input-service.unit.test.ts \
    src/services/topic-selection-v1c-promotion-gate-service.unit.test.ts \
    src/services/topic-selection-v1c-human-promotion-decision-service.unit.test.ts \
    src/services/topic-selection-v1c-paper-project-bridge-service.unit.test.ts \
    src/services/topic-selection-v1c-downstream-feedback-recheck-service.unit.test.ts \
    src/routes/topic-selection-v1c-routes.integration.test.ts
  ```
- Baseline result before new assertions: passed; 56 tests passed, 0 failed.
- Target check after new assertions:
  ```bash
  set -a
  . ./.env.local
  set +a
  pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/topic-selection-v1c-routes.integration.test.ts
  ```
- Result: passed; 6 tests passed, 0 failed.
- Full v1c module check after new assertions:
  ```bash
  set -a
  . ./.env.local
  set +a
  pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm \
    src/services/topic-selection-v1c-promotion-input-service.unit.test.ts \
    src/services/topic-selection-v1c-promotion-gate-service.unit.test.ts \
    src/services/topic-selection-v1c-human-promotion-decision-service.unit.test.ts \
    src/services/topic-selection-v1c-paper-project-bridge-service.unit.test.ts \
    src/services/topic-selection-v1c-downstream-feedback-recheck-service.unit.test.ts \
    src/routes/topic-selection-v1c-routes.integration.test.ts
  ```
- Result: passed; 57 tests passed, 0 failed.
- Check: `pnpm --filter @paper-engineering-assistant/backend typecheck`.
- Result: passed.
- Check: `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`.
- Result: passed.
- Check: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`.
- Result: passed.
- Check: `git diff --check`.
- Result: passed.

## 2026-05-18 v1c Downstream Feedback Route Hardening
- Scope: deepen HTTP-level product closure after `PaperProjectBridge` creation.
- Change: extended `apps/backend/src/routes/topic-selection-v1c-routes.integration.test.ts`.
- Added assertions:
  - route test creates a real active bridge through promotion input, gate, human decision, and bridge creation;
  - missing `required_action` for a recheck-producing feedback signal returns `INVALID_PAYLOAD`;
  - downstream feedback workspace drift returns `VERSION_CONFLICT`;
  - all 13 downstream feedback signals map to the expected loopback target;
  - every recheck-producing signal creates a retrievable downstream recheck projection by feedback id and recheck id;
  - `no_recheck_needed` stays append-only and has no recheck projection;
  - list-by-bridge returns exactly the appended feedback records;
  - stable bridge fields are unchanged after downstream feedback is recorded.
- First target check:
  ```bash
  set -a
  . ./.env.local
  set +a
  pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/topic-selection-v1c-routes.integration.test.ts
  ```
- Result: failed; test harness compared a selected bridge-field object to the full bridge read model returned by GET. Classified as test harness defect, not product behavior.
- Fix: compare stable bridge fields on both sides of the immutability assertion.
- Target check after fix:
  ```bash
  set -a
  . ./.env.local
  set +a
  pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/topic-selection-v1c-routes.integration.test.ts
  ```
- Result: passed; 7 tests passed, 0 failed.
- Full v1c module check:
  ```bash
  set -a
  . ./.env.local
  set +a
  pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm \
    src/services/topic-selection-v1c-promotion-input-service.unit.test.ts \
    src/services/topic-selection-v1c-promotion-gate-service.unit.test.ts \
    src/services/topic-selection-v1c-human-promotion-decision-service.unit.test.ts \
    src/services/topic-selection-v1c-paper-project-bridge-service.unit.test.ts \
    src/services/topic-selection-v1c-downstream-feedback-recheck-service.unit.test.ts \
    src/routes/topic-selection-v1c-routes.integration.test.ts
  ```
- Result: passed; 58 tests passed, 0 failed.
- Check: `pnpm --filter @paper-engineering-assistant/backend typecheck`.
- Result: passed.
- Check: `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`.
- Result: passed.
- Check: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`.
- Result: passed.
- Check: `git diff --check`.
- Result: passed.

## 2026-05-18 Real Provider Downstream Replay
- Scope: real DB, real provider, 20 sampled literature records, full v1a -> v1b -> v1c -> downstream feedback/recheck replay.
- Mock control run:
  ```bash
  set -a
  . ./.env.local
  set +a
  TOPIC_SELECTION_REAL_RUN_ID="downstream-mock-20260518135329" \
  TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 \
  TOPIC_SELECTION_REAL_LITERATURE_LIMIT=16 \
  pnpm --filter @paper-engineering-assistant/backend exec node --loader ts-node/esm ../../.ai/.tmp/topic-selection-real-flow.mjs
  ```
- Result: passed; 16 literature records, active bridge, 13 downstream feedback records, 12 recheck requests, one append-only `no_recheck_needed` record.
- First real provider run:
  ```bash
  set -a
  . ./.env.local
  set +a
  TOPIC_SELECTION_REAL_RUN_ID="downstream-real-20260518135346" \
  TOPIC_SELECTION_REAL_LITERATURE_LIMIT=20 \
  TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 \
  pnpm --filter @paper-engineering-assistant/backend exec node --loader ts-node/esm ../../.ai/.tmp/topic-selection-real-flow.mjs
  ```
- Result: failed at `v1b LLM topic-value assessment` with `GATE_CONSTRAINT_FAILED` because the live LLM emitted `ref_type=research_slice_ref` for the inherited research-slice authority ref.
- Fix verification:
  ```bash
  set -a
  . ./.env.local
  set +a
  pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/topic-selection-v1b-value-assessment-service.unit.test.ts
  ```
- Result: passed; 27 tests passed, 0 failed.
- Full v1b module check:
  ```bash
  set -a
  . ./.env.local
  set +a
  pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm \
    src/services/topic-selection-v1b-intake-service.unit.test.ts \
    src/services/topic-selection-v1b-research-slice-service.unit.test.ts \
    src/services/topic-selection-v1b-topic-question-service.unit.test.ts \
    src/services/topic-selection-v1b-value-assessment-service.unit.test.ts \
    src/services/topic-selection-v1b-topic-package-service.unit.test.ts \
    src/routes/topic-selection-v1b-routes.integration.test.ts
  ```
- Result: passed; 98 tests passed, 0 failed.
- Backend typecheck:
  ```bash
  pnpm --filter @paper-engineering-assistant/backend typecheck
  ```
- Result: passed.
- Final real provider rerun:
  ```bash
  set -a
  . ./.env.local
  set +a
  TOPIC_SELECTION_REAL_RUN_ID="downstream-real-rerun-20260518135802" \
  TOPIC_SELECTION_REAL_LITERATURE_LIMIT=20 \
  TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 \
  pnpm --filter @paper-engineering-assistant/backend exec node --loader ts-node/esm ../../.ai/.tmp/topic-selection-real-flow.mjs
  ```
- Result: passed.
- Artifact directory: `.ai/.tmp/topic-selection-real-flow/downstream-real-rerun-20260518135802`.
- Key output:
  - sample set `resource_sample_set_b8bcc296-1a2a-4385-8d7b-4c6ab1ae3e32`, status `ready_with_warning`, warning `CONTEXT_CAP_APPLIED`;
  - active bridge `paper_project_bridge_7884f6dc-5776-46d3-8ed0-40a03b5ca5b1`;
  - downstream feedback count 13, recheck count 12, no-recheck count 1;
  - malformed missing-action case returned 400 and workspace drift returned 409;
  - bridge stable fields were unchanged after feedback creation.
- DB readback:
  - `TopicSelectionPaperProjectBridge` row exists with status `active` and the expected bridge/promotion snapshot hashes;
  - `TopicSelectionDownstreamTopicFeedback` has 13 rows for the bridge;
  - 12 rows include a downstream recheck request and one `no_recheck_needed` row does not.
- Downstream service/route regression check:
  ```bash
  set -a
  . ./.env.local
  set +a
  pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm \
    src/services/topic-selection-v1c-downstream-feedback-recheck-service.unit.test.ts \
    src/routes/topic-selection-v1c-routes.integration.test.ts
  ```
- Result: passed; 16 tests passed, 0 failed.

## Closure Checklist
- [x] All required checks have recorded outcomes.
- [x] Failures have root-cause classification and follow-up ownership.
- [x] Acceptance summary states accepted / accepted with follow-ups / blocked under the final tightened/invariant/persistence standard.
- [x] Project governance sync/lint passes after status updates.

## 2026-05-19 Cleanup Note
- Legacy temporary real-flow harnesses and artifact directories under `.ai/.tmp/topic-selection-real-flow*` and `.ai/.tmp/topic-selection-real-tests` were removed.
- Historical commands above remain a record of the acceptance work. Future replay should use `.ai/scripts/topic-selection-real-e2e.mjs` via `pnpm topic-selection:real-e2e` so workflow execution has one durable entrypoint.
