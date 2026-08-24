# Verification

| Date | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-05-28 | `pnpm --filter @paper-engineering-assistant/shared typecheck` | pass | Shared route-policy contract compiles. |
| 2026-05-28 | `node --test --loader ts-node/esm src/research-lifecycle/topic-selection-v1a-workflow-harness-contracts.schema.test.ts` | pass | Direct v1a policy/envelope schema coverage. |
| 2026-05-28 | `pnpm --filter @paper-engineering-assistant/shared test` | pass | 196 shared schema tests. |
| 2026-05-28 | `pnpm --filter @paper-engineering-assistant/backend typecheck` | pass | Backend app/controller/routes/service wiring compiles. |
| 2026-05-28 | `env -u ... NODE_ENV=test node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts` | pass | 82 v1a harness service tests, including native N4/N6/N7 route-policy variants. |
| 2026-05-28 | `env -u ... NODE_ENV=test node --test --loader ts-node/esm src/routes/topic-selection-v1a-routes.integration.test.ts` | pass | 5 v1a route integration tests, including full native HTTP N1-N9, artifact readback, mismatch rejection, and direct-route automation guard. |
| 2026-05-28 | `env -u ... NODE_ENV=test node --test --loader ts-node/esm --test-name-pattern "legacy write routes\|offline replay routes reject\|workflow harness HTTP route invokes N1\|HTTP route drives N1-N11\|offline replay HTTP routes" src/routes/topic-selection-v1b-routes.integration.test.ts` | pass | 5 v1b route integration tests plus one skipped Prisma-required test; v1b fixture now consumes a v1a native N9 bundle. |
| 2026-05-28 | `node --check .ai/scripts/topic-selection-v1a-harness-e2e.mjs` | pass | v1a native e2e script syntax. |
| 2026-05-28 | `node --check .ai/scripts/topic-selection-v1b-harness-e2e.mjs` | pass | v1b harness e2e script syntax after v1a native fixture migration. |
| 2026-05-28 | `TOPIC_SELECTION_V1B_HARNESS_SEMANTIC_MODE=fixture ... .ai/scripts/topic-selection-v1b-harness-e2e.mjs` | pass | Script-level v1a native N9 -> v1b N1-N11 fixture smoke. |
| 2026-05-28 | `TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm ... .ai/scripts/topic-selection-v1a-harness-e2e.mjs` | pass | OpenAI real provider canary through native v1a runner N7; one provider call, N1-N9 closed with v1b bundle. Artifact: `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-openai-native-canary-roles/90-summary.json`. |
| 2026-05-28 | `TOPIC_SELECTION_REAL_PROVIDER_ID=dashscope TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm ... .ai/scripts/topic-selection-v1a-harness-e2e.mjs` | pass | DashScope real provider canary through native v1a runner N7; one provider call, N1-N9 closed with v1b bundle. Artifact: `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-dashscope-native-canary-roles/90-summary.json`. |

## Notes
- Provider canaries used deterministic resource sampling and a seeded local topic fixture because the current DB initially had no topic-scoped literature.
- Failed precondition-only canary artifacts from the empty-sampling attempts were removed; passed provider evidence artifacts were retained.
