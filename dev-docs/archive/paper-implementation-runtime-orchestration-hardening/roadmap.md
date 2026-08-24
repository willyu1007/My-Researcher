# Paper Implementation Runtime Orchestration Hardening - Roadmap

## Goal
- Bring PaperImplementation harness/runtime orchestration to a production-grade standard by inspecting every implementation workflow node, defining runtime/admission boundaries, and promoting verified node slots through the same level of evidence used by topic-selection runtime hardening.

## Planning-Mode Context And Merge Policy
- Runtime mode signal: Default.
- User confirmation when signal is unknown: not needed; user approved proceeding with the shared-contract first slice.
- Host plan artifact path(s): (none).
- Requirements baseline: this roadmap plus `dev-docs/active/paper-implementation-full-landing/` and the task packages listed below.
- Merge method: set-union.
- Conflict precedence: latest user-confirmed > existing task docs > topic-selection reference tasks > model inference.
- Repository SSOT output: `dev-docs/active/paper-implementation-runtime-orchestration-hardening/roadmap.md`.
- Mode fallback used: non-Plan default applied; task moved from planning docs into shared L1 contract implementation on 2026-06-03.

## Input Sources And Usage
| Source | Path/reference | Used for | Trust level | Notes |
|---|---|---|---|---|
| User instruction | chat, 2026-06-03 | Goal and reference direction | highest | Deep node-by-node review; use topic-selection harness/runtime as planning reference. |
| PaperImplementation parent | `dev-docs/active/paper-implementation-full-landing/` | Frozen boundaries and D1-D10 decisions | high | PaperImplementation owns implementation authority; no retired control-plane wrappers. |
| Current AI harness | `dev-docs/active/paper-implementation-ai-workflow-harness/` | Existing T-099 proposal-only harness | high | Backend minimum closure exists, but not production runtime promotion. |
| WorkOrder/live execution | `dev-docs/active/paper-implementation-workorder-experiment-bridge/`, `dev-docs/active/paper-implementation-live-experiment-adapter/` | Experiment runtime lane | high | WorkOrder/live adapter is stronger than LLM runtime lane; still needs orchestration matrix integration. |
| Provider variance | `dev-docs/active/paper-implementation-provider-variance-evaluation/` | Existing T-105 deterministic fake/preflight lane | high | Live provider execution is intentionally not implemented. |
| V1 runnable replay | `.ai/scripts/paper-implementation-v1-runnable-replay.mjs` | Current route-level in-memory replay | medium | Good closure proof; not production runtime stress. |
| Topic-selection runtime | `dev-docs/active/topic-selection-workflow-runtime-foundation/`, `topic-selection-v1b-workflow-hardening/`, `topic-selection-llm-context-cache-runtime/` | Production-grade runtime standard | high | Reuse patterns, not topic-selection business semantics. |

## Non-Goals
- Do not add runtime service, Prisma, provider canary, or production route wiring before the shared-contract/admission boundary is locked. This restriction is satisfied for the current trace-integrity boundary debate slice.
- Do not introduce a second LLM gateway, model-profile store, or paper-implementation-only provider SDK path.
- Do not route PaperImplementation through topic-selection node contracts or task-specific workflow semantics.
- Do not make provider credentials, cloud spend, or external experiment availability part of default CI.
- Do not weaken PaperImplementation authority boundaries: agents remain proposal-only; `StateWriter`/domain services own admitted state changes.
- Do not reintroduce retired research-argument wrappers or migration adapters.

## Scope And Impact
- Affected areas/modules:
  - `packages/shared/src/research-lifecycle/paper-implementation-*`
  - `apps/backend/src/services/paper-implementation-*`
  - `apps/backend/src/routes/paper-implementation-routes.ts`
  - `.ai/scripts/paper-implementation-*`
  - `prisma/schema.prisma` only if discovery proves current persisted runtime identity fields are insufficient.
- External interfaces/APIs:
  - Existing PaperImplementation route group.
  - Existing `AgentOrchestrator` / `BackendLlmGateway` boundary should be reused or extracted into a neutral runtime kernel.
  - Existing experiment-foundation execution APIs for WorkOrder/live experiment slots.
- Data/storage impact:
  - Preserve existing `PaperImplementationHarness*` tables as proposal-harness evidence.
  - Do not reuse harness tables as runtime artifact or admission persistence.
  - Prefer generic runtime/admission envelopes before any slot-specific persistence.
  - Add migrations only after shared runtime/admission contracts prove queryability needs.
- Backward compatibility:
  - Preserve existing PaperImplementation contracts and replay fixtures unless a node-level migration plan supersedes them.
  - Default deterministic test lane must remain credential-free.

## Production-Grade Standard Borrowed From Topic Selection
1. Every node has a declared runtime slot, owner, input refs, output artifact/authority boundary, blockers, warnings, replay key, and handoff contract.
2. Harness orchestrates scenarios; runtime/admission services own prompt/context/cache/compression/admission semantics.
3. Provider calls route through `AgentOrchestrator -> BackendLlmGateway`; no direct provider calls in domain services or scripts.
4. `mocked_llm`, `codex_assisted`, and `provider_llm` are explicit execution modes and query-distinguishable.
5. Provider failure blocks; no fallback to mock, Codex, cache, or historical response as provider execution.
6. Prompt/context identity, runtime invocation context hash, output schema id, model/profile id, and admission identity hash are recorded.
7. Cache hits and replay hits never skip deterministic gates or authority checks.
8. Compression/token-budget gates fail closed and preserve required facts before provider calls.
9. Runtime-verified artifacts are admitted only by slot-specific admission services that recompute expected identity.
10. Production readiness requires L1-L5 evidence, not only route-level happy path replay.

## Project Structure Change Preview
This is a non-binding planning hypothesis. Implementation may narrow this after discovery.

### Existing Areas Likely To Change
- Modify:
  - `packages/shared/src/research-lifecycle/paper-implementation-ai-workflow-harness-contracts.ts`
  - `apps/backend/src/services/paper-implementation-ai-workflow-harness-service.ts`
  - `apps/backend/src/services/paper-implementation-provider-variance-evaluation-service.ts`
  - `.ai/scripts/paper-implementation-v1-runnable-replay.mjs`
  - `apps/backend/src/routes/paper-implementation-routes.ts`
- Delete:
  - (none planned)
- Move/Rename:
  - (none planned)

### New Additions
- New module(s), if discovery confirms need:
  - `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts` (added 2026-06-03)
  - `apps/backend/src/services/paper-implementation-runtime-admission-service.ts` (added 2026-06-03)
  - `apps/backend/src/services/paper-implementation-trace-integrity-debate-runtime-service.ts` (added 2026-06-03)
  - `apps/backend/src/services/paper-implementation-p1-runtime-review-service.ts` (added 2026-06-03)
  - `apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts` (added 2026-06-04)
  - `apps/backend/src/services/paper-implementation-experiment-planning-runtime-service.ts` (added 2026-06-04)
  - `.ai/scripts/paper-implementation-runtime-stress.mjs` (added 2026-06-03)
  - `package.json` script `paper-implementation:provider-canary` (added 2026-06-03)
  - `package.json` script `paper-implementation:runtime-prisma-smoke` (added 2026-06-03)
  - `package.json` script `paper-implementation:runtime-stress` (added 2026-06-03)
- New docs:
  - `06-node-runtime-matrix.md`
  - `07-topic-selection-reference-map.md`
  - `12-runtime-persistence-envelope.md`

## Phases
1. **Phase 0 - Current-State Audit**
   - Deliverable: complete node/runtime inventory and gap classification.
   - Acceptance criteria: every PaperImplementation workflow type and deterministic flow node is classified as production-ready, needs runtime promotion, needs admission, needs provider canary, or remains deterministic-only.
2. **Phase 1 - Runtime Contract And Slot Matrix**
   - Deliverable: locked node-slot contract matrix.
   - Acceptance criteria: each promoted slot has input refs, output contract, runtime identity, admission identity, replay key, blockers, and owner.
3. **Phase 2 - Runtime/Admission Architecture Plan**
   - Deliverable: implementation architecture for shared kernel reuse plus PaperImplementation-specific adapters.
   - Acceptance criteria: no topic-selection business dependency; no second provider path; DB impact preview is explicit.
4. **Phase 3 - First Production Slice**
   - Deliverable: planned first implementation slice for `trace_integrity_review`, `claim_boundary_review`, and `dossier_readiness_prep`.
   - Acceptance criteria: L1-L5 verification ladder is defined before code work starts.
5. **Phase 4 - Full Node Promotion**
   - Deliverable: phased promotion plan for all remaining PaperImplementation workflow slots.
   - Acceptance criteria: every slot has a target verification layer and operational runbook.
6. **Phase 5 - Closure Gate**
   - Deliverable: production-readiness report.
   - Acceptance criteria: default deterministic suite, Prisma stress, provider canaries, replay/drift, and no-authority-bypass checks pass or are explicitly deferred.

## Step-By-Step Plan
### Phase 0 - Current-State Audit
- Read T-093 through T-105 and T-109 closure evidence.
- Compare current `paper-implementation-*` services/contracts/scripts against topic-selection T-088/T-107/T-112 standards.
- Produce a gap table with these columns: node/slot, current implementation, missing runtime capability, risk, first recommended action.

### Phase 1 - Runtime Contract And Slot Matrix
- Freeze PaperImplementation runtime vocabulary:
  - workflow node;
  - runtime slot;
  - runtime invocation context;
  - runtime-verified artifact;
  - admission identity/hash;
  - deterministic authority gate;
  - stress scenario.
- Create per-slot requirements for:
  - execution mode and executor kind;
  - model/profile resolution;
  - prompt/context/cache identity;
  - token/compression policy;
  - replay/idempotency;
  - allowed side effects;
  - admission output.

### Phase 2 - Runtime/Admission Architecture Plan
- Decide whether to reuse topic-selection runtime primitives directly, extract neutral services, or implement thin PaperImplementation adapters over them.
- Define runtime/admission persistence envelopes and explicitly keep current Prisma `PaperImplementationHarness*` tables in the proposal-harness evidence lane.
- Decide whether new Prisma runtime/admission tables are required after contract shape and queryability are confirmed.
- Define route-level command/read-model changes only after backend service boundaries are locked.

### Phase 3 - First Production Slice
- Start with the highest writing-readiness risk:
  - `trace_integrity_review`;
  - `claim_boundary_review`;
  - `dossier_readiness_prep`.
- Require:
  - L1 contract/unit tests;
  - L2 service integration tests;
  - L3 Prisma smoke;
  - L4 opt-in provider canary;
  - L5 compression/adversarial/stress.

### Phase 4 - Full Node Promotion
- Promoted slots now include the P1 writing-readiness slice, `result_analysis.interpretation_scenarios`, `experiment_design.work_order_draft`, and `experiment_critique.plan_critique`.
- Pending slot details are tracked in `13-pending-node-processing-matrix.md`; that matrix is the handoff artifact for remaining node work.
- Promote remaining slots in dependency order:
  1. route planning slice: `route_architecture` and `route_skeptic_review`;
  2. validation planning slice: `validation_cycle_planning` and `feasibility_planning`;
  3. motive/evidence-board slice: `cross_board_synthesis`, `evidence_board_curation`, `motive_decomposition`, and `motive_evolution`;
  4. provider-variance and operational replay slots, only as evidence lanes rather than authority writers.

### Phase 5 - Closure Gate
- `paper-implementation:runtime-stress` exists and records deterministic L5 stress evidence.
- Ensure default CI remains deterministic and credential-free.
- Record provider canaries as opt-in local/live evidence only.

## Verification And Acceptance Criteria
- Build/typecheck:
  - `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Contract tests:
  - PaperImplementation shared schema tests.
  - Runtime/admission unit tests per promoted slot.
- Integration:
  - PaperImplementation route tests.
  - Prisma-backed runtime smoke for promoted slots.
- Replay/stress:
  - Existing V1 replay remains passing.
  - New runtime stress runner proves replay/idempotency, prompt/runtime identity drift blocking, no duplicate authority writes, and no side-effect bypass.
- Provider canary:
  - Default skipped unless env/key gate is explicit.
  - Live OpenAI/DashScope canaries prove provider-required calls still call providers and over-budget paths call zero providers.
- Acceptance:
  - Every promoted PaperImplementation runtime slot has L1-L5 status or documented deferral.
  - No runtime or harness path can mutate authority state directly.
  - No direct provider calls exist outside the approved runtime boundary.
  - No cache/replay/compression path skips deterministic gates.

## Risks And Mitigations
| Risk | Likelihood | Impact | Mitigation | Detection | Rollback |
|---|---:|---:|---|---|---|
| Harness becomes a second runtime authority | med | high | Keep harness as scenario/assertion layer; move semantics to runtime/admission services. | Static imports and no-authority-bypass tests. | Revert harness-owned semantics; keep route replay only. |
| Direct provider path duplicates topic-selection gateway | med | high | Use `AgentOrchestrator -> BackendLlmGateway` or extract neutral kernel first. | `rg` direct provider imports; provider canary route audit. | Remove provider path before promotion. |
| JSON-only runtime identity hides drift | med | high | Add queryable fields only where needed; use DB SSOT if schema changes are required. | Queryability guard over Prisma/context DB schema. | Roll back migration before applying DB writes. |
| Over-broad first slice stalls | med | med | Start with three writing-readiness slots only. | Phase 3 exit review. | Split remaining slots into follow-up tasks. |
| Live provider instability blocks default closure | low | med | Keep live canaries opt-in; default suite uses fakes and local Prisma. | Provider canary skip/pass reporting. | Keep provider evidence as non-blocking until stable. |

## Open Questions And Assumptions
### Open Questions
- Q1: Should the first implementation slice include live experiment adapter runtime stress, or keep it focused on LLM/agent slots?
- Q2: Should provider canary target both OpenAI and DashScope from the start, matching topic-selection, or start with one provider?
- Q3: Should runtime identity storage reuse existing `PaperImplementationHarness*` tables or add dedicated runtime slot/admission models?

### Assumptions
- A1: Production-grade means local-first production readiness, not always-on cloud scheduling. Risk: low.
- A2: The first slice should prioritize writing-readiness risk over motive ideation convenience. Risk: medium.
- A3: Default verification must remain credential-free. Risk: low.

## Optional Detailed Documentation Layout
```
dev-docs/active/paper-implementation-runtime-orchestration-hardening/
  roadmap.md
  00-overview.md
  01-plan.md
  02-architecture.md
  03-implementation-notes.md
  04-verification.md
  05-pitfalls.md
  06-node-runtime-matrix.md
  07-topic-selection-reference-map.md
```

## To-Dos
- [x] Record planning-mode fallback and source merge policy.
- [x] Define production-grade standard borrowed from topic-selection.
- [x] Create initial node/runtime matrix.
- [x] Land shared runtime/admission envelope contract first slice.
- [x] Confirm provider canary provider set before L4 work.
- [x] Confirm Prisma migration scope before persistence implementation.
- [x] Promote P1 trace/claim/dossier runtime slots.
- [x] Promote P2 result-analysis runtime slot.
- [x] Promote P2 experiment-design and experiment-critique runtime slots.
