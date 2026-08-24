# 01 Plan

## Phase 0 - Inventory
- Enumerate every existing topic-selection workflow runner, E2E script, service test fixture, and provider/mock LLM path.
- Mark each as keep, wrap, migrate, or delete to avoid a second workflow runtime.

## Phase 1 - Contracts
- Define `WorkflowRun`, `WorkflowNode`, `WorkflowNodeInput`, `WorkflowNodeOutput`, `WorkflowTrace`, and `AgentInvocationAudit` contracts in the shared research-lifecycle package.
- Define execution mode values: `mocked_llm`, `codex_assisted`, `provider_llm`.
- Define profile escalation policy inputs, decisions, and audit DTOs.

## Phase 2 - Runtime
- Add backend runtime services for `WorkflowHarness`, `AgentOrchestrator`, and profile escalation.
- Keep domain services authoritative; the runtime coordinates calls and validates node boundaries.
- Route LLM calls through the existing `BackendLlmGateway`.
- Normalize complete v1a nodes through `WorkflowHarness` before attempting deep v1b/v1c harness migration:
  - create topic seed;
  - snapshot literature resource pool;
  - create search plan;
  - record search run;
  - build evidence map;
  - generate need candidate;
  - validate need adjudication;
  - human confirm need;
  - publish v1b input bundle.
- Detailed slice plan: `07-v1a-workflow-harness-normalization.md`.

## Phase 3 - Persistence And Artifacts
- Persist only durable run summaries and audit refs when needed.
- Store verbose trace artifacts in the existing artifact pattern, without hidden reasoning.
- Ensure sample set, title-card, value assessment, promotion, and bridge references are carried through trace metadata.

## Phase 4 - Migration
- Wrap or replace `.ai/scripts/topic-selection-real-e2e.mjs` and the retired quality-gate compatibility path with the unified harness.
- Remove obsolete ad hoc runner logic once parity is proven.
- Preserve legacy command names only as thin CLI wrappers around registered `WorkflowScenario` ids.
- Add drift checks so scripts cannot retain independent node sequencing, prompt construction, model-mode branching, guardrail decisions, evidence assignment, persistence semantics, hash semantics, or replay/cache semantics.
- Treat migration as incomplete until every existing real-flow/E2E/provider-stability path maps to the scenario registry and wrapper tests prove no direct business-service execution remains in CLI scripts.

## Phase 5 - Verification
- Add mocked runtime tests for each node.
- Add provider-gated E2E smoke with small sample size.
- Add regression assertions for stable hash, accepted risk propagation, and blocked escalation.
