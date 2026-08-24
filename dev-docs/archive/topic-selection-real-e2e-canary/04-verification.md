# 04 Verification

## 2026-05-18 Mock LLM Real DB Canary
- Command:
  ```bash
  TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 \
  TOPIC_SELECTION_REAL_LITERATURE_LIMIT=16 \
  TOPIC_SELECTION_REAL_RUN_ID=real-e2e-mock-20260518183016 \
  pnpm topic-selection:real-e2e
  ```
- Result: passed.
- Artifact dir: `.ai/.tmp/topic-selection-real-e2e/real-e2e-mock-20260518183016`.
- Coverage evidence:
  - resource sample set `resource_sample_set_1102bf56-d757-48b5-8919-42984148fb21`;
  - selected 16 real literature records, 4 per role;
  - sample status `ready_with_warning`, warning `CONTEXT_CAP_APPLIED`;
  - v1b carried accepted risk `accepted_risk_3ee50bdb-d37d-45da-b025-c0cc1cfddc2f`;
  - v1c bridge `paper_project_bridge_79d1d709-8bde-4034-83e7-579b96f9fdbf`;
  - PaperProject intake created `P012`;
  - duplicate intake was idempotent;
  - malformed/stale/workspace/non-active intake negatives returned expected errors;
  - downstream feedback created 13 feedback records and 12 recheck requests.

## 2026-05-18 Provider LLM Real DB Canary
- Command:
  ```bash
  TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=0 \
  TOPIC_SELECTION_REAL_LITERATURE_LIMIT=16 \
  TOPIC_SELECTION_REAL_RUN_ID=real-e2e-provider-20260518183030 \
  pnpm topic-selection:real-e2e
  ```
- Result: passed.
- Artifact dir: `.ai/.tmp/topic-selection-real-e2e/real-e2e-provider-20260518183030`.
- Coverage evidence:
  - resource sample set `resource_sample_set_feea9cbf-0dd7-45bd-a05f-8b20e568b0a4`;
  - selected 16 real literature records, 4 per role;
  - sample status `ready_with_warning`, warning `CONTEXT_CAP_APPLIED`;
  - sample hash matched mock canary hash `11029bfc62cd0f1ede56afe42c4915a7d064fb02abc58a41d98675b380c276cd`;
  - v1b carried accepted risk `accepted_risk_02ecbe2a-d54f-4cb6-8490-df2d2034971f`;
  - v1c bridge `paper_project_bridge_88c233d9-3191-4ac9-85b8-6b1fd479b157`;
  - PaperProject intake created `P013`;
  - duplicate intake was idempotent;
  - malformed/stale/workspace/non-active intake negatives returned expected errors;
  - downstream feedback created 13 feedback records and 12 recheck requests.

## 2026-05-18 Root Regression Gates
- Command:
  ```bash
  set -a
  . ./.env.local
  set +a
  pnpm test
  ```
- Result: passed.
- Evidence:
  - Shared tests: 91 tests, 91 pass.
  - Backend tests: 524 tests, 523 pass, 1 skipped, 0 fail.
- Command:
  ```bash
  pnpm typecheck
  ```
- Result: passed.
- Evidence:
  - shared typecheck pass;
  - backend typecheck pass after Prisma generate;
  - desktop renderer/main typecheck pass.
- Command:
  ```bash
  git diff --check -- .ai/scripts/topic-selection-real-e2e.mjs package.json dev-docs/active/topic-selection-real-e2e-canary
  ```
- Result: passed.
- Command:
  ```bash
  node .ai/scripts/ctl-project-governance.mjs sync --apply --project main
  node .ai/scripts/ctl-project-governance.mjs lint --check --project main
  ```
- Result: passed.

## 2026-05-19 Cleanup Note
- Previous canary artifacts under `.ai/.tmp/topic-selection-real-e2e/real-e2e-*` were removed as ignored temporary run output.
- The durable runner remains `.ai/scripts/topic-selection-real-e2e.mjs`; future runs will create fresh artifacts under `.ai/.tmp/topic-selection-real-e2e/<run-id>/`.
