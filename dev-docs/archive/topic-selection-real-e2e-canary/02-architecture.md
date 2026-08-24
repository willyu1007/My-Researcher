# 02 Architecture

## Boundary
- The runner is an operator-facing E2E harness, not a default CI test.
- It uses `.env.local` app configuration and Prisma repositories intentionally.
- Default backend tests remain isolated by `apps/backend/scripts/run-node-tests.mjs`.

## Runner Inputs
- Topic id: `TOPIC_SELECTION_REAL_TOPIC_ID`, default `ai-rag-finetuning-2022-2026`.
- Literature limit: `TOPIC_SELECTION_REAL_LITERATURE_LIMIT`, default `16`.
- LLM mode: `TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1` for deterministic local execution; unset/`0` for provider mode.
- Model: `TOPIC_SELECTION_REAL_MODEL_ID`, default `gpt-5.5`.

## Artifacts
- Resource sample payload.
- Selected literature summary.
- v1a, v1b, v1c stage summaries.
- PaperProject intake summary.
- Downstream feedback summary.
- Final `90-summary.json`.

## Safety
- The runner writes real test records to the configured local DB.
- It does not wipe or reset existing data.
- The non-active bridge negative temporarily flips only the bridge created by the current run and restores it afterward.
