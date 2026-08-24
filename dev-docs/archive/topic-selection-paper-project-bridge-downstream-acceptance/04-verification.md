# 04 Verification

## 2026-05-18 Boundary Inventory
- Checked current route/service/contracts:
  - `packages/shared/src/research-lifecycle/paper-project-contracts.ts`
  - `apps/backend/src/routes/research-lifecycle-routes.ts`
  - `apps/backend/src/services/research-lifecycle-service.ts`
  - `apps/backend/src/routes/title-card-management.ts`
  - `apps/backend/src/services/title-card-management.service.ts`
  - `apps/backend/src/services/topic-selection-v1c-downstream-feedback-recheck-service.ts`
  - `apps/backend/src/services/topic-selection-recheck-risk-memory-service.ts`
- Result:
  - `PaperProjectBridge` has no downstream PaperProject consumer yet;
  - downstream feedback/recheck is the implemented bridge-adjacent downstream boundary;
  - bridge-to-PaperProject intake remains a product gap.

## 2026-05-18 Targeted Recheck Tests
- First target check:
  ```bash
  set -a
  . ./.env.local
  set +a
  pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm \
    src/services/topic-selection-v1c-downstream-feedback-recheck-service.unit.test.ts \
    src/services/topic-selection-recheck-risk-memory-service.unit.test.ts
  ```
- Result: failed; 22 tests passed, 2 failed.
- Failure classification:
  - `research_slice` was misclassified as search because the implementation used broad substring matching for `search`;
  - stale evidence feedback selected `research_slice` as the evidence/search affected ref.
- Fix:
  - introduced boundary-aware search-ref matching;
  - mapped downstream affected refs to concrete stages in risk memory.
- Target check after fix:
  ```bash
  set -a
  . ./.env.local
  set +a
  pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm \
    src/services/topic-selection-v1c-downstream-feedback-recheck-service.unit.test.ts \
    src/services/topic-selection-recheck-risk-memory-service.unit.test.ts
  ```
- Result: passed; 24 tests passed, 0 failed.

## 2026-05-18 HTTP Route Check
- Command:
  ```bash
  set -a
  . ./.env.local
  set +a
  pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/routes/topic-selection-v1c-routes.integration.test.ts
  ```
- Result: passed; 7 tests passed, 0 failed.
- Added route-level assertions:
  - recheck projection by feedback id and by recheck id carries the same affected ref and loopback target;
  - recheck request source refs include bridge, promotion decision, and promotion input snapshot;
  - no-recheck feedback still has no recheck projection.

## 2026-05-18 Full Related Module Check
- Command:
  ```bash
  set -a
  . ./.env.local
  set +a
  pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm \
    src/services/topic-selection-recheck-risk-memory-service.unit.test.ts \
    src/services/topic-selection-v1c-promotion-input-service.unit.test.ts \
    src/services/topic-selection-v1c-promotion-gate-service.unit.test.ts \
    src/services/topic-selection-v1c-human-promotion-decision-service.unit.test.ts \
    src/services/topic-selection-v1c-paper-project-bridge-service.unit.test.ts \
    src/services/topic-selection-v1c-downstream-feedback-recheck-service.unit.test.ts \
    src/routes/topic-selection-v1c-routes.integration.test.ts
  ```
- Result: passed; 73 tests passed, 0 failed.

## 2026-05-18 Real DB Routing Readback
- Scope: use the real provider bridge from `downstream-real-rerun-20260518135802` and create one additional `stale_evidence` downstream feedback through the Fastify route with Prisma repositories.
- Bridge: `paper_project_bridge_7884f6dc-5776-46d3-8ed0-40a03b5ca5b1`.
- Result:
  - feedback id `downstream_topic_feedback_68021a11-137a-42a6-9ede-49d7d788e2cb`;
  - recheck id `downstream_recheck_request_4e0f1694-aff9-4a21-a9ae-80b6cf3692e4`;
  - classification target `evidence_or_search`;
  - classification affected ref type `evidence_unit`;
  - persisted `TopicSelectionRecheckImpact.affectedStage=evidence_or_search`;
  - persisted `TopicSelectionRecheckImpact.affectedRefType=evidence_unit`;
  - persisted `TopicSelectionRecheckEvent.originStage=downstream`.

## 2026-05-18 Bridge Intake Targeted Tests
- Service command:
  ```bash
  cd apps/backend
  node --test --loader ts-node/esm src/services/topic-selection-v1c-paper-project-bridge-service.unit.test.ts
  ```
- Result: passed; 11 tests passed, 0 failed.
- Handoff carry-forward command:
  ```bash
  cd apps/backend
  node --test --loader ts-node/esm \
    src/services/topic-selection-v1c-promotion-gate-service.unit.test.ts \
    src/services/topic-selection-v1c-human-promotion-decision-service.unit.test.ts \
    src/services/topic-selection-v1c-paper-project-bridge-service.unit.test.ts
  ```
- Result: passed; 34 tests passed, 0 failed.
- Coverage added:
  - active bridge intake creates one PaperProject and attaches downstream refs;
  - duplicate intake call returns existing refs without creating another PaperProject;
  - stale bridge hash and workspace drift reject before downstream creation;
  - missing PaperProject gateway rejects;
  - attach conflict rolls back the created PaperProject;
  - Prisma repository attaches refs with bridge hash guard and duplicate-attachment guard.
  - promotion gate and human promotion handoff preserve `selected_literature_evidence_ids` before bridge intake.

## 2026-05-18 Bridge Intake HTTP And Prisma E2E
- Command:
  ```bash
  cd apps/backend
  set -a
  . ../../.env.local
  set +a
  node --test --loader ts-node/esm src/routes/topic-selection-v1c-routes.integration.test.ts
  ```
- Result: passed; 8 tests passed, 0 failed.
- Coverage added:
  - malformed intake body returns stable `INVALID_PAYLOAD`;
  - stale hash and workspace drift return `VERSION_CONFLICT`;
  - HTTP route creates a PaperProject from an active bridge and carries `selected_literature_evidence_ids`;
  - bridge readback includes `paper_project_intake_ref` and `target_paper_project_ref`;
  - duplicate HTTP intake is idempotent;
  - Prisma smoke creates the PaperProject, persists refs on `TopicSelectionPaperProjectBridge`, and continues to downstream feedback/recheck.

## 2026-05-18 Shared Contract And Type Checks
- Shared schema command:
  ```bash
  pnpm --filter @paper-engineering-assistant/shared test
  ```
- Result: passed; 91 tests passed, 0 failed.
- Typecheck commands:
  ```bash
  pnpm --filter @paper-engineering-assistant/backend typecheck
  pnpm --filter @paper-engineering-assistant/shared typecheck
  ```
- Result: both passed.

## 2026-05-18 Backend Full Test Note
- Command:
  ```bash
  cd apps/backend
  set -a
  . ../../.env.local
  set +a
  pnpm test
  ```
- Result: failed outside the T-082 surface; T-082-related tests passed.
- Observed unrelated/environment failures:
  - persistent DB was not empty, so config tests saw existing title cards and PaperProject ids starting after `P001`;
  - auto-pull/global-rule assumptions were affected by existing settings state;
  - settings redaction tests saw real local settings;
  - fulltext acquisition tests timed out or failed network-dependent jobs.
- Interpretation: use the targeted service, route/Prisma, shared schema, and typecheck results as T-082 verification. Full backend suite needs isolated test DB/fixtures before it can be treated as a clean gate.

## 2026-05-18 Deep Post-v1c Contract Regression
- Service command:
  ```bash
  cd apps/backend
  node --loader ts-node/esm --test src/services/topic-selection-v1c-paper-project-bridge-service.unit.test.ts
  ```
- Result: passed; 12 tests passed, 0 failed.
- Route command without env preload:
  ```bash
  cd apps/backend
  node --loader ts-node/esm --test src/routes/topic-selection-v1c-routes.integration.test.ts
  ```
- Result: failed only at the Prisma smoke because `DATABASE_URL` was not loaded into the shell; non-DB route cases passed.
- Route command with local SSOT:
  ```bash
  cd apps/backend
  set -a
  . ../../.env.local
  set +a
  node --loader ts-node/esm --test src/routes/topic-selection-v1c-routes.integration.test.ts
  ```
- Result: passed; 8 tests passed, 0 failed.
- Downstream feedback command:
  ```bash
  cd apps/backend
  node --loader ts-node/esm --test src/services/topic-selection-v1c-downstream-feedback-recheck-service.unit.test.ts
  ```
- Result: passed; 9 tests passed, 0 failed.
- Typecheck:
  ```bash
  pnpm typecheck
  ```
- Result: passed.
- Whitespace check:
  ```bash
  git diff --check -- dev-docs/active/topic-selection-paper-project-bridge-downstream-acceptance apps/backend/src/services/topic-selection-v1c-paper-project-bridge-service.unit.test.ts apps/backend/src/routes/topic-selection-v1c-routes.integration.test.ts
  ```
- Result: passed.
- Real-flow quality-gate reanalysis:
  ```bash
  TOPIC_SELECTION_REAL_E2E_QUALITY_RUN_ID=post-v1c-contract-reuse-20260518 \
  TOPIC_SELECTION_REAL_E2E_EXISTING_RUN_IDS=scale-quality-sanitize-20260518200537-provider-r1 \
  TOPIC_SELECTION_REAL_E2E_SKIP_NEGATIVE=1 \
  TOPIC_SELECTION_REAL_LITERATURE_LIMIT=32 \
  node .ai/scripts/topic-selection-workflow-scenario-runner.mjs --scenario topic-selection.real-e2e.scale-quality.v1
  ```
- Result: passed; reused the provider run without new LLM calls.
- Real-flow evidence:
  - run id `scale-quality-sanitize-20260518200537-provider-r1`;
  - sample size 32 with role counts `support=8`, `challenge=8`, `baseline=8`, `context=8`;
  - sample hash `2a7094eede6cfc2339bf3071161d7e49975b8738a24152c1eff79bc610621a81`;
  - full chain outcome `passed_full_chain`;
  - PaperProject `P023`;
  - bridge `paper_project_bridge_0175ce70-7156-47aa-a5fa-37b0c36c28d2`;
  - quality gate failures: none.
