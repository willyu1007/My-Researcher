# Plan

## Phase 1 - Current-State Mapping
- Inventory v1b routes, services, shared contracts, repositories, tests, scripts, and archived task packages.
- Map existing v1b flow nodes to the v1a normalization dimensions:
  - automatically callable;
  - frozen input snapshot;
  - authority writer;
  - invocation slot or deterministic-only;
  - deterministic gate;
  - warning/blocker semantics;
  - replay/idempotency behavior;
  - handoff payload.
- Record mismatches as implementation gaps, not ad-hoc fixes.

## Phase 2 - Node Policy Closure
- Define or update node policies for:
  - v1b intake snapshot;
  - human research constraints / constraint profile;
  - intake readiness gate;
  - research-slice option generation;
  - research-slice selection;
  - topic-question candidate generation;
  - topic-question selection and contract materialization;
  - value assessment;
  - value disposition and draft package creation;
  - v1c handoff publication.
- Decide which nodes are deterministic, ordinary single-agent, Codex-assisted, provider-LLM, human/delegated, or loopback-only.

## Phase 3 - Contract And Runtime Alignment
- Normalize v1b model-like calls onto shared `TopicSelectionAgentExecutionSpec`.
- Ensure provider model choices remain registry-owned.
- Add or tighten deterministic gate contracts for `TopicQuestionContract` and `ValueAssessment`.
- Align scenario payloads with WorkflowHarness, not route-only smoke inputs.

## Phase 4 - Test Matrix And E2E
- Build targeted unit tests for node policy validators and admission gates.
- Add WorkflowHarness scenario tests for happy path, negative gates, loopbacks, replay/idempotency, and warning carry-forward.
- Run a mocked full v1b harness path from frozen v1a bundle to v1c handoff.
- Run at least one provider/Codex canary for model-like v1b nodes after deterministic gates exist.
