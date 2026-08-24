# 00 Scope

## Goal
- Validate T-112 runtime behavior in a production-shaped local/dev setup after the persistent DB prompt index migration was applied.

## Environment
- Local/dev PostgreSQL from `.env.local`.
- Prisma-backed repositories through `TITLE_CARD_REPOSITORY=prisma` and related local settings.
- External provider calls were not enabled for this pass; live OpenAI/DashScope canaries remain gated by explicit env/key approval.

## Layers Covered
- LLM registry/config consistency.
- Provider canary behavior through `AgentOrchestrator -> BackendLlmGateway` with local fake gateway.
- Real Prisma prompt packet cache store and control-plane artifact recording.
- Token-budget over-limit preflight with provider call count `0`.
- v1a WorkflowHarness main path over local/dev DB with a balanced T-112 resource sample fixture.

## Known Local Fixture Issue
- The default deterministic resource sampling fixture for topic `ai-rag-finetuning-2022-2026` underfilled the `baseline` role, so the broad v1a replay smoke could not use it directly.
- A T-112 balanced local/dev resource sample fixture was created for production-shaped harness verification: `resource_sample_set_t112_prod_balanced_20260530`.
