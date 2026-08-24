# 04 Verification

## 2026-05-18 Commands
- `node --check .ai/scripts/topic-selection-workflow-scenario-runner.mjs`
- `node --check .ai/scripts/topic-selection-real-e2e.mjs`
- `node --loader ts-node/esm --test src/services/topic-selection-resource-sampling-service.unit.test.ts` from `apps/backend`
- `node --loader ts-node/esm --test src/services/topic-selection-v1b-topic-question-service.unit.test.ts` from `apps/backend`
- `node --loader ts-node/esm --test src/services/topic-selection-v1b-value-assessment-service.unit.test.ts` from `apps/backend`
- `pnpm typecheck`
- `git diff --check -- ...` for touched files and T-085 docs

## Provider E2E Evidence
- `scale-quality-final-20260518194635`: 3 provider repeats confirmed sampling stability.
  - sample hash stable: `2a7094eede6cfc2339bf3071161d7e49975b8738a24152c1eff79bc610621a81`
  - selected set stable: yes
  - role counts: `support=8`, `challenge=8`, `baseline=8`, `context=8`
  - full chain: 2/3 provider runs reached PaperProject (`P021`, `P022`)
  - remaining failure found there was ValueAssessment accepting risk without refs; fixed after this run.
- `scale-quality-refallow-20260518200206`: post-allowed-ref prompt run still reproduced provider-invented unknown evidence refs; this led to deterministic dropping of unknown LLM evidence refs before persistence.
- `scale-quality-sanitize-20260518200537`: post-fix single provider regression passed.
  - full chain reached PaperProject `P023`
  - bridge: `paper_project_bridge_0175ce70-7156-47aa-a5fa-37b0c36c28d2`
  - role counts remained 8/8/8/8
  - v1b negative remained `passed_v1b_non_advance`
  - failures: none

## Notes
- An accidental broad backend test invocation ran 496 tests but failed two Prisma smoke tests because that runner did not load `DATABASE_URL`; targeted single-file tests and `pnpm typecheck` passed.
- The final post-sanitizer verification was a single provider repeat. The latest 3-repeat run before sanitizer already proved sampling stability, and the sanitizer only changed ValueAssessment ref handling.

## 2026-05-19 Cleanup Note
- Previous scale-quality artifacts under `.ai/.tmp/topic-selection-real-e2e-quality` and child `.ai/.tmp/topic-selection-real-e2e` runs were removed as ignored temporary run output.
- The durable quality gate now runs through `.ai/scripts/topic-selection-workflow-scenario-runner.mjs --scenario topic-selection.real-e2e.scale-quality.v1`; the old standalone script path is retired.

## 2026-05-20 WorkflowScenario Runner Migration
- Command: `node --check .ai/scripts/topic-selection-workflow-scenario-runner.mjs && node --check .ai/scripts/topic-selection-real-e2e.mjs`
- Result: passed.
- Initial command: `TOPIC_SELECTION_REAL_E2E_REPEATS=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_V1A_GENERATE_EXECUTION_MODE=mocked_llm pnpm topic-selection:real-e2e:quality-gate`
- Result: failed as intended by the preserved semantic audit because a guardrail-canonicalized `support` item still carried stale risk/failure rationale from the LLM classification.
- Fix: `TopicSelectionResourceSamplingService` now rewrites classification rationale and method families whenever deterministic guardrails canonicalize a target role.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-resource-sampling-service.unit.test.ts`
- Result: passed; 12 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Follow-up command: `TOPIC_SELECTION_REAL_E2E_REPEATS=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_V1A_GENERATE_EXECUTION_MODE=mocked_llm pnpm topic-selection:real-e2e:quality-gate`
- Result: passed.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 597 tests total, 596 passed, 1 skipped.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Successful quality run id: `real-e2e-quality-20260520172205`.
- Coverage:
  - scenario id `topic-selection.real-e2e.scale-quality.v1`;
  - child scenarios `topic-selection.real-e2e.canary.v1` and `topic-selection.v1b.non-advance-negative.v1`;
  - sample size 4 with role counts `support=1`, `challenge=1`, `baseline=1`, `context=1`;
  - sample hash stable for the one-repeat smoke;
  - PaperProject intake created;
  - v1b negative stopped with `passed_v1b_non_advance`;
  - failures: none.
