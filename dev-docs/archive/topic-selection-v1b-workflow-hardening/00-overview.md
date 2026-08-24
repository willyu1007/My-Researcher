# T-107 Topic Selection v1b Workflow Hardening

## Status
- State: done
- Task ID: `T-107`
- Mapping: `M-001 > F-001 > R-009 > T-107`
- Depends on: `T-088 topic-selection-workflow-runtime-foundation`, `T-089 topic-selection-agent-workflow-review`
- Trigger: v1a WorkflowHarness normalization established a stronger standard than the older v1b implementation packages: each node must be automatically callable, contract-bound, replayable, and quality-gated instead of merely service-callable.
- Current phase: T-107 exit gate accepted for v1b product-level WorkflowHarness normalization and supplemented with harness-native HTTP invocation capability, a standalone harness e2e runner, current provider slot canaries, and external bundled-Codex CLI N4/N6/N8 variance probes. v1b now has executable N1 intake snapshot, N2 constraint profile, N3 intake readiness, N4 research-slice option generation, N5 research-slice selection, N6 topic-question candidate generation, N7 topic-question contract materialization/trial coordination, N8 topic value assessment, N9 value disposition, N10 draft topic package creation, and N11 v1c input bundle publication runners behind the WorkflowHarness admission/replay shell. Local/Codex-assisted automation invokes the full N1-N11 shared harness chain through `/topic-selection/v1b/workflow-harness/nodes/:nodeId/invocations` and harness artifact routes, either from tests or `pnpm topic-selection:v1b-harness-e2e`. T-112 later retired the old N1-N11 provider-backed repeat harness entry and moved current provider-required-live evidence to N4/N6/N8 slot canaries. Legacy v1b HTTP orchestration write routes have been physically removed; old route strings remain only as negative 404 assertions.

## Goal
- Refine and harden v1b from `V1bInputBundle` to v1c draft package handoff using the v1a node-normalization standard.
- Make every v1b node explicit enough for WorkflowHarness execution: frozen inputs, authority boundary, invocation slot, validators, blockers, warnings, replay hash, and handoff contract.
- Align `TopicQuestionContract`, `ValueAssessment`, research-slice selection, draft package creation, and v1c handoff into one coherent, automatable workflow.
- Define where Codex/provider LLM participation is allowed, where deterministic validation is mandatory, and where human/delegated review is required.

## Non-Goals
- Do not redesign v1a or v1c.
- Do not add desktop UI.
- Do not introduce DB migrations unless the readiness review proves an existing persisted contract cannot support the normalized workflow.
- Do not create a separate v1b agent runtime path outside the shared `WorkflowHarness` / `AgentOrchestrator` / model-profile registry pattern.
- Do not make every v1b node multi-agent; debate must be justified by concrete value over deterministic or single-agent workflow.

## Acceptance Criteria
- [x] A v1b node inventory exists and matches repo code/contracts.
- [x] Every v1b node has a node policy with input refs, output authority, blockers, warnings, validators, replay/idempotency, and downstream handoff.
- [x] Every model-like v1b node uses a single invocation-slot shape and resolves provider/model through the model profile registry.
- [x] Codex-assisted paths are explicit and distinguish local cost-control from provider-quality evidence.
- [x] `TopicQuestionContract` and `ValueAssessment` have deterministic gates that prevent schema-valid but low-quality or semantically drifting output from advancing.
- [x] v1b WorkflowHarness scenarios cover happy path, negative gates, loopbacks, replay/idempotency, provider/Codex admission canaries, full harness-native HTTP N1-N11 invocation for local automation, a standalone harness e2e runner, current N4/N6/N8 provider slot canaries, historical DashScope/OpenAI repeat provider evidence, external bundled-Codex CLI N4/N6/N8 variance, and a Prisma-backed harness HTTP route smoke. Full multi-turn human-interactive Codex-session variance and broader multi-sample operational stability remain outside this service-level T-107 slice.
- [x] v1b can run from frozen v1a handoff to v1c handoff without reading mutable live upstream state.
