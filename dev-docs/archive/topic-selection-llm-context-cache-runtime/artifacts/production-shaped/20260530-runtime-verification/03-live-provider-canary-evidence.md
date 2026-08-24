# 03 Live Provider Canary Evidence

## Scope
- Date: 2026-05-30
- Approval: user approved local provider configuration and near-production live calls.
- Providers: OpenAI and DashScope.
- Path: `AgentOrchestrator -> BackendLlmGateway`; no direct provider SDK path and no provider secrets printed or persisted.
- Runtime surface: v1a N6 provider-required prompt-cache canary using the T-112 context runtime profile.

## Commands
| Command | Result | Notes |
|---|---|---|
| `T112_PROVIDER_CANARY_LIVE=1 BACKEND_TEST_PRESERVE_REAL_ENV=1 node --env-file=../../.env.local --test --loader ts-node/esm src/services/topic-selection-provider-canary-service.unit.test.ts` | passed | 6/6 tests passed. Live OpenAI and DashScope tests were active, not skipped. |
| Persistent Prisma live evidence script | passed | Used real `BackendLlmGateway`, Prisma control plane, and Prisma prompt packet cache index. OpenAI and DashScope each executed two live provider calls for prompt-cache exact-hit verification, then an over-budget zero-call branch. |
| Persistent Prisma cleanup check | passed | Temporary prompt-index rows and artifact refs from the direct live evidence run were cleaned: counts `0/0`. |

## Evidence Summary
| Provider | Model Option | Live Calls | Prompt Artifact Reused | Quality Report Reused | Response Reuse | Provider Response Cache Status | Prompt Index Rows | Over-Budget Calls |
|---|---:|---:|---|---|---|---|---:|---:|
| OpenAI | `topic-selection.generate-need-candidate.single-agent.v1.openai-balanced` | 2 | yes | yes | none | `not_applicable`, `not_applicable` | 1 before cleanup | 0 |
| DashScope | `topic-selection.generate-need-candidate.single-agent.v1.dashscope-thinking-budget` | 2 | yes | yes | none | `not_applicable`, `not_applicable` | 1 before cleanup | 0 |

## Telemetry Snapshot
| Provider | Model | Input Tokens | Output Tokens | Total Tokens | Retries | Rate Limits | Provider Cache Telemetry |
|---|---|---:|---:|---:|---:|---:|---|
| OpenAI call 1 | `gpt-5.5` | 115 | 94 | 209 | 0 | 0 | hit `false`, read `0`, write `null` |
| OpenAI call 2 | `gpt-5.5` | 115 | 50 | 165 | 0 | 0 | hit `false`, read `0`, write `null` |
| DashScope call 1 | `qwen3.6-plus` | 182 | 1218 | 1400 | 0 | 0 | not reported by provider |
| DashScope call 2 | `qwen3.6-plus` | 182 | 1255 | 1437 | 0 | 0 | not reported by provider |

## Gate Evidence
- OpenAI over-budget fixture: `blocked_over_budget`, `TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION`, provider call count `0`.
- DashScope over-budget fixture: `blocked_over_budget`, `TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION`, provider call count `0`.
- In both provider-required live branches, prompt cache reused only redacted prompt and prompt-quality artifact refs. Historical provider responses were not reused and `response_reuse_ref` stayed `null`.
