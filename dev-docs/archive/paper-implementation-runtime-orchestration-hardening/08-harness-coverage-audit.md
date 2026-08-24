# 08 Harness Coverage Audit

## 2026-06-03 Scope
Question: does the current `PaperImplementationHarness` cover the full implementation workflow chain, including loop, fallback, debate, and multi-scenario output?

Answer: no. The current harness is a proposal-only integrity and admission shell. It covers single-run proposal capture, input snapshot checks, trace/reference/memo guards, gate result creation, transition attempt recording, and blocker queueing. It does not yet implement production runtime orchestration.

## Evidence Reviewed
- `packages/shared/src/research-lifecycle/paper-implementation-ai-workflow-harness-contracts.ts`
- `apps/backend/src/services/paper-implementation-ai-workflow-harness-service.ts`
- `apps/backend/src/services/paper-implementation-ai-workflow-harness-service.unit.test.ts`
- `prisma/schema.prisma`
- `.ai/scripts/paper-implementation-v1-runnable-replay.mjs`
- `dev-docs/active/paper-implementation-ai-workflow-harness/`

## Coverage Matrix
| Chain capability | Current coverage | Evidence | Gap |
|---|---|---|---|
| Single workflow proposal envelope | covered | `CreateAgentWorkflowHarnessRunRequest` accepts one `workflow_type`, one `spec`, and an array of `proposal_artifacts`; service persists run, proposals, gate, transition, quality signals, and queue items. | This is not a multi-step runtime executor. |
| Input snapshot and trace integrity | covered | Service blocks missing/stale trace manifests, refs outside snapshots, excluded refs, disabled invariants, and memo-as-evidence. | Needs runtime/admission recomputation for production slots. |
| Proposal-only authority boundary | covered | Service blocks `direct_authority_mutation_refs`; T-099 docs state no authority mutation or provider invocation. | Needs adversarial no-side-effect-bypass tests for runtime promotion. |
| Mock/product isolation | covered | Service blocks `product` runs using `mocked_llm` or `mock.*` profile and blocks mock-mode profile/execution mismatch. | No provider canary proves product-mode execution reaches the shared gateway. |
| Decision queue blocker creation | covered | Blocked runs create one queue item with `inspect_harness_output`, `repair_trace_or_context`, and `rerun_after_gate_fix`. | Queue resolution does not trigger retry, loop continuation, rollback, or supersede orchestration. |
| Multi-artifact output in one run | partially covered | `proposal_artifacts` is an array and service persists all artifacts from one run. | No first-class scenario id, branch id, candidate ranking, or cross-scenario comparison contract. |
| Loop / upstream feedback | partially covered outside harness | T-109 runnable replay includes deterministic loopback targets to `paper_project_bridge`; queue types include `loop_budget_review`. | Harness service has no loop runner, loop state machine, loop budget enforcement, or automatic upstream re-entry. |
| Retry | schema only | `AgentWorkflowHarnessSpec.retry_policy` exists; queue item has `retry_count`, `retry_budget`, and `cooldown_until`. | Service sets blocked/completed only and does not execute retries, increment retry counters, or create retry-linked runs. |
| Fallback / profile escalation | not covered | Searches find fallback motive roles, not harness runtime fallback. | Need explicit policy for provider failure, profile escalation, and forbidden fallback to mock/cache/historical responses. |
| Debate / multi-agent review | not covered | No harness contract field for debate role, panel member, adjudicator, dissent, or debate round. | Needs explicit debate packet/schema if debate is a required workflow pattern. |
| Multi-scenario orchestration | not covered | Current request has one workflow type/spec and no scenario registry. | Need scenario set, branch identity, expected outputs, comparison rules, and admission choice rules. |
| Provider execution / canary | not covered | T-105 is deterministic fake/preflight; harness code does not call `AgentOrchestrator` or `BackendLlmGateway`. | Provider canary must hit the same production runtime slot and fail closed on budget/provider failure. |
| Runtime identity / prompt / cache / token / compression | not covered | Prisma stores run mode, execution mode, model profile, prompt template, schema ids, and spec JSON, but no runtime identity/admission hash/compression/token gate columns. | Need runtime slot/admission services and queryable identity if production ops require it. |
| Rollback / supersede | schema only | Enums include `superseded`; transition outcome supports `failed`; queue status supports `superseded`. | No rollback/supersede execution path, authority rollback contract, or transition graph. |

## Production Conclusion
The current harness is acceptable as a V1 proposal-safety layer. It is not sufficient as a production-grade task orchestration runtime.

Production hardening should keep this boundary clean:
- Harness: scenario fixtures, replay/stress assertions, proposal capture, coverage reporting.
- Runtime slot: prompt/context/profile/cache/token/compression execution semantics.
- Admission: recompute identity, validate output, block forbidden fields, hand off to deterministic domain gates.
- Domain services/state writer: authority mutation only after admission, trace, risk, and human/queue gates.

## Recommended Next Checks
1. Define whether loop, fallback, debate, and multi-scenario are required for every workflow type or only for promoted slots.
2. Add a per-node capability matrix with columns: loop, retry, fallback, debate, multi-scenario, provider canary, admission, authority impact.
3. Promote first-slice slots only after their missing orchestration semantics are explicit:
   - `trace_integrity_review`
   - `claim_boundary_review`
   - `dossier_readiness_prep`
4. Do not treat enum/schema presence as implementation evidence. Require service path, tests, and replay/canary evidence for each capability.
