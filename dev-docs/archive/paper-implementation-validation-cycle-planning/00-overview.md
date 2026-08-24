# T-095 Paper Implementation Validation Cycle Planning

## Status
- State: done
- Parent task: `T-091 paper-implementation-full-landing`
- Mapping: `M-001 > F-001 > R-013`
- Flow node: validation cycle, route/probe planning, experiment-plan candidates
- Completed: backend minimum closure for validation planning authority.
- Next step: T-096 consumes admitted validation planning objects as WorkOrder-ready inputs.
- Semantic refinement (2026-07-13, T-132 D-16): productized Cycle closure reuses the existing completion authority to atomically freeze the complete current-effective decision scope at a `closure_watermark`: the admission-frozen branch set and, for each branch, its current admitted revision plus sequence-fenced head Run and complete cell/Attempt accounting. The snapshot creates no failed evidence, Sidecar is display-only, and no new human action is added.
- Planned semantic cutover (2026-07-13, T-132 D-17; docs-only, not implemented): the watermark-bound current-effective head scope derives `CycleReadyForInterpretation`; Result Analysis may produce one exact-hash-bound proposal, while the existing Cycle-closure action is the sole writer of nullable `positive | negative | inconclusive`, closure kind, accepted proposal identity, D-16 snapshot/hash and the server-derived selected exit. Caller-authored assessment/exit, packet-before-closure and implicit history scans are superseded migration debt.

## Goal
- Turn motive/evidence-board gaps into validation cycles and route/probe/experiment plans.
- Schedule validation work under current portfolio priority and motive-role constraints.
- Preserve budget, expected information gain, stop rules, and human-confirmation requirements.
- Produce work-order-ready plans without submitting experiments directly.
- For the productized target, close each Cycle through one authoritative assessment path without turning execution state, REU state, Result Analysis output, or a downstream packet into a second scientific-conclusion authority.

## Non-goals
- Do not call experiment-foundation directly.
- Do not create trusted evidence or claims.
- Do not broaden upstream topic scope without human confirmation.
- Do not let draft/admit callers select the scientific exit or let completion callers author an unconstrained Cycle assessment.

## Acceptance Criteria
- [x] `ValidationCycle` has criteria, budget, expected information gain, and stop conditions.
- [x] Validation scheduling respects admitted `CoreMotiveVersion`, active motive role, fresh motive state, and trace-ready board context.
- [x] Route/probe/experiment plan candidates are planning-only, trace-ready, and do not call experiment-foundation.
- [x] Low-information repeated cycles create `loop_budget_review` review items instead of silently continuing.
- [x] Expensive or scope-broadening admission paths require human confirmation; unresolved baseline gaps block expensive/confirmatory plans.
- [x] Handoff to T-096 can use admitted `ValidationCycle`, `TechnicalRouteCandidate`, `FeasibilityProbe`, and `ExperimentPlanLight` refs.
- [x] D-16 follow-up ownership is recorded: T-132/T-124 must add exact watermark-bound current-effective branch-head snapshot/hash readback and zero failed/cancelled/incomplete REU proof; T-095 does not claim that later migration as historical completion.
- Product-target follow-up (pending implementation): D-17 atomically replaces caller-authored `cycle_assessment`/`decision_exit`, derives readiness from the watermark-bound current-effective branch-head scope, accepts one exact proposal identity, writes the scientific disposition only at closure, and requires closed-Cycle-only consumers. Historical T-095 acceptance remains unchanged.
