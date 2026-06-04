# 13 Pending Node Processing Matrix

## Purpose
This matrix is the source of truth for PaperImplementation nodes that are not yet production-runtime promoted.

It separates:
- already promoted runtime slots, which are not listed here except for cross-cutting cleanup;
- pending agent workflow nodes, which need runtime/admission/route/provider/stress work;
- deterministic and operational lanes, which should not become LLM runtime slots but still need stronger stress evidence.

## Current Promotion Baseline
The following slots are promoted and are not pending node work:
- `trace_integrity_review.boundary_debate`
- `claim_boundary_review.boundary_debate`
- `dossier_readiness_prep.readiness_audit`
- `result_analysis.interpretation_scenarios`
- `experiment_design.work_order_draft`
- `experiment_critique.plan_critique`

Promoted slots already have controlled runtime services/routes, shared runtime/admission envelopes, provider canary hooks, L5 stress coverage, L6 near-prod evidence hooks, and either Domain Gate materialization or an explicit no-authority boundary.

## Closed Cross-Cutting Cleanup
| Item | Closure |
|---|---|
| PaperImplementation model-profile product eligibility | Closed 2026-06-04. Promoted PaperImplementation runtime profiles now bind explicit PaperImplementation run-mode eligibility in the unified backend model-profile registry: `provider_llm` may run in `acceptance` / `product`, while `mocked_llm` and `codex_assisted` are limited to `test` / `acceptance`. |

## Cross-Cutting Decisions For Remaining Nodes
Every pending agent workflow node below MUST inherit the harness/runtime boundary from `10-harness-runtime-boundary.md`.

Operational interpretation:
- Harness verifies, stresses, and replays; it does not execute production semantics.
- Runtime executes production-capable LLM/Codex/mock slot logic; it does not write domain authority.
- Admission verifies runtime evidence; it does not repair, rerun, or materialize state.
- Domain Gate and deterministic services own queue/domain/live-experiment state transitions.
- Promotion evidence is machine-verifiable. Human-readable summaries or audit narratives are not required promotion artifacts and must not become acceptance criteria.

## Cross-Cutting Pending Cleanup
| Item | Why pending | Required decision / fix | Priority |
|---|---|---|---|
| Shared debate helper extraction | P1 debate patterns are implemented in slot-specific services. Reusing copy-shaped logic for route/motive nodes can increase complexity and semantic drift. | Either extract a neutral bounded-debate helper after one more debate slot, or explicitly keep slot-local implementations with a checklist. | P1 before route skeptic or motive evolution |
| Model option parameter visibility | Model ids, timeout, retry policy, and normalized params exist through the backend profile registry, while registry YAML only lists model candidates. | Document the full profile resolution path in each new slot note: YAML candidate -> backend profile options -> normalized params -> request policy -> retry/fallback policy. | P1 for every new promoted slot |

## Pending Agent Workflow Nodes
| Node | Current authority surface | Required slot identity | Model/profile and params | Context/cache/compression | Loop strategy | Retry/fallback strategy | Debate / multi-scenario strategy | Admission and Domain Gate boundary | Minimum production-grade evidence | Suggested order |
|---|---|---|---|---|---|---|---|---|---|---|
| `route_architecture` | T-095 route/probe planning; deterministic services own cycle/route authority. | `route_architecture.route_candidates` or equivalent route-candidate slot. | New PaperImplementation profile and prompt template. Default should mirror promoted slots: OpenAI/DashScope candidates, low creativity, high reasoning, medium output budget unless route candidates need large. Product mode must be provider-only. | Runtime must compile motive, validation-cycle, route/probe, metric, budget, and source refs into ref-backed context. Cache keys must include route/probe refs, source hashes, prompt variant, output schema, and compression identity. | Loop to route repair, feasibility probe, validation-cycle repair, or upstream feedback. Runtime cannot mutate route/cycle state. | Max one same-profile technical retry. Provider failure, schema failure, over-budget, stale refs, or compression failure fail closed. No mock/Codex/cache fallback in product. | Multi-candidate route alternatives are required. Debate can be deferred if paired with `route_skeptic_review`, but each candidate needs comparable identity and blocker taxonomy. | Admission verifies route candidate refs, motive/board/cycle refs, source hashes, expected information gain fields, and no route mutation. Domain Gate may create deterministic route-candidate/proposal artifacts only through existing services, or keep artifacts as proposal evidence if no deterministic gate exists yet. | Shared schema test, service test, route integration, profile registry validation, provider canary hook, L5 over-budget/adversarial/provider-failure coverage, no route/cycle write assertions, optional Prisma smoke. | 1 |
| `route_skeptic_review` | T-095 loop-budget/review anchors; no runtime slot today. | `route_skeptic_review.route_risk_critique`. | New profile and prompt template. Low creativity, high reasoning, medium output budget. Product mode provider-only. | Context must include admitted route candidate refs, critique dimensions, budget/compute refs, failure evidence, and source hashes. Cache identity must bind candidate id and critique dimension set. | Loop to route repair, abandonment/park queue, validation-cycle repair, or upstream feedback. | Same max-one technical retry; no semantic retry by default. Provider/schema failures fail closed; semantic blocker output is admitted as review evidence only. | Debate role itself is required as an independent critic. Multi-scenario is support-only: blocker/repair/park alternatives are proposal findings, not state transitions. | Admission verifies candidate refs, blocker refs, budget/scope risks, no route mutation, and no queue materialization. Domain Gate or deterministic queue service owns any blocker/repair item creation. | Same as route architecture plus negative tests for fake route mutation, missing critique dimension, and same-id/different-payload drift if materialized. | 2, paired with route architecture |
| `validation_cycle_planning` | T-095 deterministic validation cycle service owns cycle creation. | `validation_cycle_planning.cycle_candidates`. | New profile and prompt template. Low creativity, high reasoning, large output budget likely needed for criteria/budget/stop-condition alternatives. Product mode provider-only. | Context must include motive/board refs, route/probe refs, evidence gaps, prior validation outcomes, budget envelope, expected information gain, and stop rules. Compression must preserve negative/failed evidence and budget blockers. | Loop through low-information cycle feedback, loop-budget review, route/probe repair, or upstream feedback. Runtime output cannot create cycles. | Same-profile technical retry only. Fallback is queue-only; unavailable provider cannot imply a deterministic cycle. | Multi-scenario required for cycle alternatives. Debate recommended for high-cost cycles but can be a later hardening if route-skeptic critique exists. | Admission verifies criteria, budget, expected information gain, stop conditions, input target frame, trace/source refs, and no cycle creation. Domain service owns cycle draft/admission. | Schema/service/route tests, malformed minimal cycle rejection, L5 budget/compression/fail-closed, provider canary hook, no deterministic cycle write unless Domain Gate path is explicit. | 3 |
| `feasibility_planning` | T-095 feasibility probes and route/probe planning. | `feasibility_planning.probe_plan_candidates`. | New profile and prompt template. Low creativity, high reasoning, medium output budget unless producing multiple probe plans requires large. Product mode provider-only. | Context must include route candidate refs, probe targets, baseline gaps, data availability, compute/budget refs, source hashes, and constraints. | Loop to route/probe repair, budget review, or validation-cycle planning. | Same max-one technical retry; provider/cache/mock fallback forbidden in product. | Multi-candidate feasibility alternatives required. Debate recommended only for high-cost probes or conflicting feasibility evidence. | Admission verifies probe refs, baseline gaps, budget blockers, source hashes, no WorkOrder or live adapter payload, and no validation-cycle mutation. | Contract/service/route tests, no live experiment side effects, L5 provider failure/over-budget/compression, provider canary hook. | 4, with validation-cycle planning |
| `cross_board_synthesis` | T-094 evidence board and cross-board review services. | `cross_board_synthesis.merge_split_reuse_scenarios`. | New profile and prompt template. Low creativity, high reasoning, large output budget if multiple boards and conflicts are included. Product mode provider-only. | Context must bind board versions, transfer bindings, challenge/conflict refs, freshness, source locators, and motive refs. Compression must not drop conflict/challenge refs. | Loop to evidence board curation, motive decomposition/evolution draft, merge/split/reuse review, or upstream trace repair. | Same technical retry. Fallback is queue-only; no synthetic merge/split decision from cache/mock/Codex in product. | Multi-scenario recommended/likely required: merge, split, reuse, park, reject. Debate recommended for conflicting board conclusions. | Admission verifies board version refs, transfer binding refs, conflict refs, memo-as-evidence guard, and no portfolio/state mutation. Domain/human gate owns any board or motive state transition. | Schema/service/route tests, source-locator hygiene, conflict-preservation compression tests, no authority write assertions, provider canary hook, L5 adversarial memo-as-evidence tests. | 5 |
| `evidence_board_curation` | T-094 board/evidence binding and trace/evidence services. | `evidence_board_curation.binding_gap_candidates`. | New profile and prompt template. Low creativity, high reasoning, medium output budget. Product mode provider-only. | Context must bind source locators, evidence roles, trace refs, freshness, citation candidates, and existing board bindings. Cache identity must include source locator and board version hashes. | Loop to trace repair, evidence transfer, stale-evidence recheck, or board update review. | Same technical retry. Provider failure or source drift blocks; no fallback output can become board binding. | Debate recommended for conflict/challenge review. Multi-scenario recommended for binding/gap alternatives. | Admission verifies source locators, binding roles, trace refs, freshness, memo guard, no evidence binding write. Domain service owns board/evidence mutation. | Contract tests for locator/freshness, service/route tests, L5 source-drift and prompt-injection tests, no board write assertions, provider canary hook. | 6 |
| `motive_decomposition` | T-094 motive versions/assertions and motive board services. | `motive_decomposition.draft_assertion_candidates`. | New profile and prompt template. Low creativity, high reasoning, large output budget if decomposing multiple motives. Product mode provider-only. | Context must include motive assertion refs, evidence refs, trace/source bindings, scope boundaries, accepted-risk markers, and upstream feedback. | Loop through motive evolution draft, evidence board curation, trace repair, or human confirmation. | Same technical retry. Fallback is queue-only; semantic changes cannot be inferred from unavailable provider. | Multi-scenario required for decomposition alternatives. Debate recommended for high-impact motive split/merge. | Admission verifies motive assertion refs, evidence refs, semantic-change blockers, source refs, and draft-only output. Any scope/state change requires deterministic/human gate. | Schema/service/route tests, semantic-change blocker tests, no motive write assertions, provider canary hook, L5 compression preserving challenge/failure refs. | 7 |
| `motive_evolution` | T-094 motive evolution decisions and portfolio state. | `motive_evolution.evolution_decision_support`. | New profile and prompt template. Low creativity, high reasoning, large output budget. Product mode provider-only. | Context must bind motive version refs, portfolio roles, evidence refs, trace refs, prior decisions, human-confirmation requirements, and accepted risks. | Loop to supersede/merge/split/park/abandon review, evidence board repair, or human confirmation. | Same technical retry; no semantic retry by default until a human/domain gate policy exists. Fallback is queue-only. | Debate required for portfolio-changing decisions. Multi-scenario required for supersede/merge/split/park/abandon alternatives. | Admission verifies evolution decision refs, portfolio role constraints, trace refs, human-confirmation requirement, and strict no state-writer boundary. Domain/human gate is mandatory before mutation. | Strongest evidence bar: schema/service/route tests, provider canary, L5 adversarial/state-mutation tests, Domain/human gate tests, replay/idempotency/drift, Prisma queryability if materialized. | 8, last |

## Pending Deterministic And Operational Lanes
These lanes should not become LLM runtime slots by default. They need stronger replay/stress evidence or explicit Domain Gate coupling.

| Lane | Current surface | Pending work | Required evidence |
|---|---|---|---|
| Intake bootstrap | T-093 routes/services. | Add runtime-stress coverage as deterministic producer; verify bridge hash/idempotency under downstream runtime consumption. | Route replay, idempotency, stale bridge rejection, no LLM/provider calls. |
| Trace manifest creation/repair | T-097 deterministic service. | Add drift checks to runtime-stress so promoted runtime slots cannot consume stale or mismatched trace refs. | Trace source drift, locator drift, failed-run accounting, no runtime context rebuild in admission. |
| WorkOrder admission | T-096 deterministic service. | Stress WorkOrder draft admission separately from experiment-design runtime output. | Runtime artifact can propose draft only; deterministic service owns WorkOrder creation/admission; replay and drift checks. |
| Live experiment submit/sync/collect/cancel | T-104 adapter. | Keep env-gated; add local execution stress only after WorkOrder lane decisions are stable. | No LLM runtime can submit/cancel/sync experiments; adapter failure/backoff is operational, not semantic fallback. |
| Result/claim/dossier authority writes | T-098 deterministic service. | Continue adding Domain Gate tests for newly promoted runtime final artifacts. | Domain Gate materialization, replay/idempotency, same-id drift conflict, blocked/failed runtime rejection. |
| Decision work queue | T-099/T-100 orchestration surface. | Stress dedup, cooldown, replay, and resolution semantics when admitted blockers from remaining slots are routed. | Queue creation only through Domain Gate/domain service; runtime/admission cannot materialize queue items. |
| Provider variance evaluation | T-105 evaluation lane. | Keep as evidence/preflight lane; do not count as product provider canary for promoted slots. | Provider variance output cannot satisfy runtime/provider execution or Domain Gate admission. |

## Per-Slot Implementation Checklist
Every pending agent workflow node must satisfy this checklist before it can move from `later-slice` to `promoted`:
- Define concrete `slot_id`, role slot id(s), profile id, prompt template id, and output contract id.
- Define model option policy: default provider option, manual quality/deep options, normalized params, timeout, and product-mode eligibility.
- Assert the harness only calls the real runtime route/service path and verifies machine invariants; it must not compile prompts, choose models, compute cache/compression identity, repair outputs, or emit runtime artifacts.
- Add product-mode guard: `run_mode=product` requires `execution_mode=provider_llm`.
- Add context packet identity, prompt packet identity, token-budget gate, compression policy, cache key, and cache result refs.
- Add same-profile technical retry and explicit no fallback to mock/Codex/cache/replay in product mode.
- Add role artifact and final artifact schemas with forbidden prompt/provider/authority payload checks.
- Add admission record coverage for passed, blocked, failed-runtime, replay, and drift.
- Add Domain Gate materialization only when a deterministic domain service owns the target state transition; otherwise assert explicit no-Domain-Gate/no-authority boundary.
- Add L1 shared schema, L2 service, L3 repository/Prisma smoke when persisted, L4 provider canary hook, and L5 stress/compression/adversarial tests.
- Treat human-readable summaries as optional diagnostics only. Promotion must be proven by runtime/admission/domain evidence fields and no-side-effect assertions.
- Add no-dual-track scans proving the harness cannot masquerade as runtime/admission/domain authority.

## Next Recommended Slice
Start with the route planning slice:
1. `route_architecture.route_candidates`
2. `route_skeptic_review.route_risk_critique`

Reason:
- It is the next dependency after experiment design/critique.
- It has medium authority risk, lower than motive evolution.
- It can reuse the promoted pattern without immediately requiring high-risk motive state mutation.
- It will clarify whether a shared bounded-debate helper is worth extracting before motive/evidence-board nodes.
