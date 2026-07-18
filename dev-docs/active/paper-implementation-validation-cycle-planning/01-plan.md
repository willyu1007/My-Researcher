# 01 Plan

## Phases
1. [x] Review motive/evidence-board gaps, `CoreMotiveSet`, and portfolio decisions from T-094.
2. [x] Define `ValidationCycle`, route candidate, feasibility probe, and `ExperimentPlanLight` contracts.
3. [x] Define admission/completion gates, portfolio constraint checks, and budget/stop-rule policy.
4. [x] Define `loop_budget_review` queue behavior for repeated low-information cycles.
5. [x] Define upstream feedback candidate and explicit dispatch path for infeasible route, data unavailable, or topic boundary mismatch.
6. [x] Define work-order-ready handoff objects for T-096 without creating `ResearchWorkOrder`.
7. [x] Verify negative cases: missing/trace-broken inputs, baseline gap, unconfirmed expensive/scope-broadening plan, low-info loop, and feedback dispatch.

## Review Before Next Flow
- Confirmed every executable experiment request remains an `ExperimentPlanLight` until T-096 creates a work order.
- Confirmed exploratory/confirmatory markers are explicit through `run_mode` and `confirmatory_marker`.
- Confirmed validation cycles do not schedule draft, stale, parked, or abandoned motives.
- Confirmed route infeasibility emits a local `ValidationUpstreamFeedbackCandidate`; only explicit dispatch creates `ImplementationFeedbackEvent`.
- Confirmed historical validation completion records assessment only and cannot create claims or mutate motive authority. T-132 D-16 later refines productized completion to atomically freeze an embedded immutable current-effective branch-head accounting snapshot/hash at one `closure_watermark`; the snapshot is not evidence and adds no new action.

## D-17 Productized Follow-up (docs-only; not implemented)
- Derive `CycleReadyForInterpretation` idempotently only when the admission-frozen branch set and every branch's current admitted revision plus sequence-fenced head Run are resolved at one `closure_watermark`, every head Run's cells/Attempts are accounted, and the closure-input snapshot/hash can be frozen.
- Keep superseded/non-head Runs as immutable queryable history and exclude them from readiness, snapshot and dossier scope by default. A current admitted revision MAY reference an old Run explicitly as `comparison_input_ref`; that reference adds interpretation lineage only and never restores head or execution-scope membership.
- Treat an admitted branch without a head Run as `BRANCH_HEAD_NOT_FROZEN` rather than silently removing the branch. Any non-terminal real-provider Attempt anywhere in the Cycle, including one on a non-head Run, returns `CYCLE_ACTIVE_REAL_ATTEMPT`.
- Freeze the Cycle version, branch set and per-branch head sequences with CAS. Admission or head drift MUST reject the closure input and rebuild readiness/snapshot; it cannot be accepted through a stale or dual-read path.
- Invoke Result Analysis automatically only when eligible REU exists; no-evidence/control-only scope skips scientific interpretation and closes with null scientific disposition.
- Treat the admitted Result Analysis artifact as one support proposal, not an assessment, selected exit or accepted `ResultInterpretationPacket`.
- Reuse the existing Cycle-closure action as the sole writer. The closure service MUST accept/correct the exact proposal, freeze the D-16 snapshot/hash, write the authoritative disposition and derive the selected exit from admission-frozen definitions.
- Reject caller-authored assessment/exit and keep `ResultInterpretationPacket`/Claim/Dossier generation downstream of the exact closed Cycle. No new aggregate or user action is introduced.

## Verification
- Contract/schema tests for planning DTOs.
- Gate tests for budget, baseline gap, missing trace, portfolio constraint violations, loop-budget review, upstream feedback triggers, and human-confirmation requirements.
- Future D-17 tests must cover watermark-bound readiness replay, branch/head CAS drift, stable no-head blocking, all-Cycle active real-Attempt blocking including non-head Runs, non-head default exclusion, explicit comparison lineage without scope promotion, no-evidence/control-only skip, proposal hash drift, caller assessment/exit rejection, server-derived exit mapping and packet-before-closure rejection.
