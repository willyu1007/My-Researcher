# Verification

## Required Initial Checks
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`

## 2026-05-29 - LLM Model/Reasoning Default Alignment
- `node .ai/skills/workflows/llm/llm-engineering/scripts/validate-llm-registry.mjs` - passed.
- `node .ai/skills/workflows/llm/llm-engineering/scripts/check-llm-config-keys.mjs` - passed.
- `node --check .ai/scripts/topic-selection-v1c-real-codex-acceptance.mjs && node --check .ai/scripts/topic-selection-real-e2e.mjs && node --check .ai/scripts/topic-selection-v1a-harness-e2e.mjs && node --check .ai/scripts/topic-selection-workflow-scenario-runner.mjs` - passed.
- `cd packages/shared && node --test --loader ts-node/esm src/research-lifecycle/topic-selection-agent-profile-contracts.schema.test.ts src/research-lifecycle/topic-selection-agent-invocation-contracts.schema.test.ts` - passed (`7` tests).
- `pnpm --filter @paper-engineering-assistant/shared typecheck` - passed.
- `pnpm --filter @paper-engineering-assistant/backend typecheck` - passed.
- `pnpm --filter @paper-engineering-assistant/desktop typecheck` - passed.
- `pnpm --filter @paper-engineering-assistant/backend test` - passed (`889` tests collected, `887` passed, `2` skipped, `0` failed).
- `git diff --check` - passed.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` - passed.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` - passed with one unrelated warning for `topic-selection-v1a-production-orchestration` missing status metadata.
- `rg -n "gpt-5\\.4-mini|gpt-5-mini|gpt-5\\.2" --glob '!apps/desktop/dist/**' --glob '!dev-docs/**' --glob '!node_modules/**' --glob '!*.log' .` - no current code/config/context matches.
- `rg -n "model_reasoning_effort|^model\\s*=" ~/.codex/config.toml && codex --version && /Applications/Codex.app/Contents/Resources/codex --version` - confirmed `model=gpt-5.5`, `model_reasoning_effort=high`, global Codex `0.135.0`, bundled Codex `0.133.0`.
- Codex smoke command without reasoning override printed startup metadata with `model: gpt-5.5` and `reasoning effort: high`; the process was stopped after the metadata confirmation because it did not return a last message promptly under high reasoning.
- `pnpm --filter @paper-engineering-assistant/shared test` now passes after the barrel export list was updated for the existing v1a workflow harness split module (`197` tests).

## 2026-05-29 - Barrel Export List and Real Codex High-Reasoning Rerun
- `cd packages/shared && node --test --loader ts-node/esm src/research-lifecycle/title-card-management-contracts.schema.test.ts` - passed (`49` tests).
- `pnpm --filter @paper-engineering-assistant/shared typecheck` - passed.
- `pnpm --filter @paper-engineering-assistant/shared test` - passed (`197` tests).
- `node --check .ai/scripts/topic-selection-v1c-real-codex-acceptance.mjs` - passed.
- `git diff --check` - passed.
- First high-reasoning rerun:
  - command: `TOPIC_SELECTION_V1C_REAL_CODEX_RUN_ID=t-108-v1c-real-codex-high-2026-05-29 TOPIC_SELECTION_V1C_REAL_CODEX_GATE=local TOPIC_SELECTION_V1C_REAL_CODEX_SAMPLE_COUNT=3 pnpm topic-selection:v1c-real-codex-acceptance`;
  - result: `blocked_environment`;
  - evidence: `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-real-codex-high-2026-05-29/manifest.json`;
  - failure point: N4 Codex delegated sample 2 timed out after `240000ms`;
  - diagnosis: the N4 prompt carried the full gate handoff/read model even though the N4 candidate contract only needs the explicit authorization envelope, snapshot hash, boundary refs, and condition template.
- Harness adjustment:
  - N4 real-Codex prompt now uses a compact `n4_authorization_context_json` rather than the full gate handoff;
  - N3/N4/N6 prompts explicitly prohibit file inspection and shell commands so real Codex acceptance tests contract-following only;
  - deterministic N4 admission and allowed-ref validation remain unchanged.
- Passing high-reasoning rerun:
  - command: `TOPIC_SELECTION_V1C_REAL_CODEX_RUN_ID=t-108-v1c-real-codex-high-2026-05-29-r2 TOPIC_SELECTION_V1C_REAL_CODEX_GATE=local TOPIC_SELECTION_V1C_REAL_CODEX_SAMPLE_COUNT=3 pnpm topic-selection:v1c-real-codex-acceptance`;
  - evidence: `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-real-codex-high-2026-05-29-r2/manifest.json`;
  - status `pass`;
  - `full_l5b_acceptance=true`;
  - `10` row results;
  - `15` node trace entries;
  - real Codex environment `available`;
  - Codex reasoning effort `high`;
  - `36` real Codex calls;
  - `0` hard failures.

## 2026-05-29 - L5c Provider/Canary Runner
- `node --check .ai/scripts/topic-selection-v1c-provider-canary.mjs && node --check .ai/scripts/topic-selection-v1c-real-codex-acceptance.mjs` - passed.
- `node .ai/skills/workflows/llm/llm-engineering/scripts/validate-llm-registry.mjs` - passed.
- `node .ai/skills/workflows/llm/llm-engineering/scripts/check-llm-config-keys.mjs` - passed.
- `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-model-profile-registry-service.unit.test.ts` - passed (`5` tests).
- `pnpm --filter @paper-engineering-assistant/backend typecheck` - passed.
- `git diff --check` - passed.
- Provider smoke findings:
  - `t-108-v1c-provider-canary-smoke-2026-05-29` failed because OpenAI rejected an empty-array schema without a typed `items` schema; fixed in schema inference.
  - `t-108-v1c-provider-canary-smoke-2026-05-29-r2` and `-r5` failed because real provider output rewrote functional refs with `version_id:null` into strings; fixed with ref-aware structured-output schema constraints plus existing deterministic allowed-ref validation.
  - `t-108-v1c-provider-canary-smoke-2026-05-29-r4` was stopped after more than four minutes without per-call artifact output; smoke now applies a `90000ms` provider timeout override.
- Passing provider smoke:
  - command: `TOPIC_SELECTION_V1C_PROVIDER_CANARY_RUN_ID=t-108-v1c-provider-canary-smoke-2026-05-29-r6 TOPIC_SELECTION_V1C_PROVIDER_CANARY_GATE=smoke TOPIC_SELECTION_V1C_PROVIDER_CANARY_SAMPLE_COUNT=1 TOPIC_SELECTION_V1C_PROVIDER_CANARY_MODEL_OPTION_SUFFIXES=openai-balanced pnpm topic-selection:v1c-provider-canary`;
  - evidence: `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-provider-canary-smoke-2026-05-29-r6/manifest.json`;
  - status `pass`;
  - `full_l5c_acceptance=false` because this was explicit smoke, not `canary|nightly|release` with `sample_count>=3`;
  - provider canary environment `available`;
  - provider timeout override `90000`;
  - `9` row results;
  - `4` node trace entries;
  - `8` real provider structured outputs;
  - `0` hard failures.
- Passing full L5c canary:
  - command: `TOPIC_SELECTION_V1C_PROVIDER_CANARY_RUN_ID=t-108-v1c-provider-canary-full-2026-05-29 TOPIC_SELECTION_V1C_PROVIDER_CANARY_GATE=canary TOPIC_SELECTION_V1C_PROVIDER_CANARY_SAMPLE_COUNT=3 TOPIC_SELECTION_V1C_PROVIDER_CANARY_MODEL_OPTION_SUFFIXES=openai-balanced pnpm topic-selection:v1c-provider-canary`;
  - evidence: `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-provider-canary-full-2026-05-29/manifest.json`;
  - status `pass`;
  - `full_l5c_acceptance=true`;
  - provider canary environment `available`;
  - provider timeout override `null`;
  - `9` row results;
  - `15` node trace entries;
  - `36` real provider structured outputs;
  - `0` hard failures;
  - scenario counts: N2 bounded micro-debate `6`, N3 diagnostic adjunct `3`, N4 provider delegated `3`, N4 provider delegated rejection `3`, N6 feedback normalization `3`, N6 feedback normalization rejection `3`;
  - N2 telemetry summary: `24` OpenAI `gpt-5.5` calls, `0` retries, `0` timeouts, max elapsed `16181ms`, and `108147` total tokens.

## 2026-05-29 - Product/Native Harness Consumption
- `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts` - passed (`86` tests).
- `pnpm --filter @paper-engineering-assistant/backend typecheck` - passed.
- New native v1c consumption assertions covered:
  - forward-only adapter result consumption from N1 through N5;
  - stop-after-failure behavior when N3 emits `action_required`;
  - N6 downstream feedback as `record_only` ingress after N5 without automatic loopback.

## 2026-05-29 - Expanded Final-Row Deterministic Coverage
- `node --check .ai/scripts/topic-selection-v1c-harness-acceptance.mjs` - passed.
- `TOPIC_SELECTION_V1C_ACCEPTANCE_RUN_ID=t-108-v1c-harness-expanded-2026-05-29 pnpm topic-selection:v1c-harness-acceptance` - passed.
- Evidence: `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-harness-expanded-2026-05-29/manifest.json`.
- Manifest result:
  - status `pass`;
  - `15` row results;
  - `27` node trace entries;
  - added rows: `N3-08`, `N4-11`, `N5-10`, `N6-02`, and `N6-10`.
- `pnpm --filter @paper-engineering-assistant/backend typecheck` - passed.

## 2026-05-29 - Regression Pass
- `TOPIC_SELECTION_V1C_ACCEPTANCE_RUN_ID=t-108-v1c-harness-regression-2026-05-29 pnpm topic-selection:v1c-harness-acceptance` - passed.
  - Evidence: `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-harness-regression-2026-05-29/manifest.json`;
  - status `pass`;
  - `15` row results;
  - `27` node trace entries.
- `pnpm --filter @paper-engineering-assistant/shared test` - passed (`197` tests).
- `pnpm --filter @paper-engineering-assistant/backend test` - passed (`892` tests collected, `890` passed, `2` skipped, `0` failed).
- `pnpm --filter @paper-engineering-assistant/shared typecheck` - passed.
- `pnpm --filter @paper-engineering-assistant/backend typecheck` - passed.
- `git diff --check` - passed.
- Real L5b Codex and L5c provider runners were not repeated in this regression pass because this round changed deterministic harness consumption/coverage only; latest full evidence remains:
  - L5b: `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-real-codex-high-2026-05-29-r2/manifest.json`;
  - L5c: `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-provider-canary-full-2026-05-29/manifest.json`.

## 2026-05-29 - Known Residual Closure: Product N2/N3 Split
- `pnpm --filter @paper-engineering-assistant/backend typecheck` - passed.
- `cd apps/backend && node --test --loader ts-node/esm src/routes/research-lifecycle-routes.integration.test.ts` - passed (`21` tests).
- `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-v1c-promotion-gate-service.unit.test.ts` - passed (`14` tests).
- `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-v1c-node-contract-acceptance.unit.test.ts` - passed (`5` tests).
- `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-v1c-cross-node-acceptance.unit.test.ts` - passed (`4` tests).
- `cd apps/backend && node --test --loader ts-node/esm --test-name-pattern "topic-selection v1c HTTP routes drive ready bundle" src/routes/topic-selection-v1c-routes.integration.test.ts` - passed (`1` selected, `7` skipped by name filter).
- `pnpm --filter @paper-engineering-assistant/backend test` - passed (`893` tests collected, `891` passed, `2` skipped, `0` failed).
- `TOPIC_SELECTION_V1C_ACCEPTANCE_RUN_ID=t-108-v1c-harness-split2-2026-05-29 pnpm topic-selection:v1c-harness-acceptance` - passed.
  - Evidence: `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-harness-split2-2026-05-29/manifest.json`;
  - status `pass`;
  - `15` row results;
  - `27` node trace entries.

## 2026-05-29 - Closure Review: Single Harness Surface
- `node --check .ai/scripts/topic-selection-v1c-harness-acceptance.mjs` - passed.
- `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-v1c-harness-adapter.unit.test.ts src/services/topic-selection-v1c-node-contract-acceptance.unit.test.ts src/services/topic-selection-v1c-cross-node-acceptance.unit.test.ts src/services/topic-selection-workflow-harness-service.unit.test.ts` - passed (`99` tests).
- `pnpm --filter @paper-engineering-assistant/backend typecheck` - passed.
- `pnpm --filter @paper-engineering-assistant/backend test` - passed (`894` tests collected, `892` passed, `2` skipped, `0` failed).
- `git diff --check` - passed.
- `TOPIC_SELECTION_V1C_ACCEPTANCE_RUN_ID=t-108-v1c-harness-closure-2026-05-29 pnpm topic-selection:v1c-harness-acceptance` - passed.
  - Evidence: `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-harness-closure-2026-05-29/manifest.json`;
  - status `pass`;
  - `15` row results;
  - `27` node trace entries;
  - `pending_gaps=[]`;
  - persistence summary: `7` promotion input snapshots, `7` promotion decision support records, `7` promotion gate checks, `5` human promotion decisions, `4` bridges, `2` downstream feedback records, and `1` recheck sink call.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main` - passed and regenerated project registry/dashboard/feature-map/task-index.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` - passed with one unrelated warning for `dev-docs/active/topic-selection-v1a-production-orchestration` missing status metadata.
