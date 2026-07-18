# 02 Architecture

## Contract Boundary
| Item | Contract |
|---|---|
| Input objects | `CoreMotiveVersion`, assertions, evidence-board gaps/conflicts, `CoreMotiveSet`, `MotivePortfolioDecision` |
| Output objects | `ValidationCycle`, route/probe candidates, `ExperimentPlanLight`, work-order draft refs, `loop_budget_review` queue candidates, upstream feedback candidates; D-16 productized closure adds an embedded immutable execution-accounting snapshot/hash on the existing Cycle closure record |
| Authority writer | `PaperImplementationValidationCyclePlanningService` through validation repository |
| Gates | cycle admission, route selection, feasibility, portfolio constraint, budget/stop rule, scope-broadening confirmation |
| Trace | motive refs, board refs, baseline/data refs, decision policy refs |
| Handoff | T-096 receives admitted validation cycles plus route/probe/experiment-plan-light refs with policy, trace, and portfolio context refs |

## D-17 Scientific-Conclusion Responsibility Chain (product target; docs-only, not implemented)

T-132 D-17 is the cross-task decision source. T-095 owns the Cycle authority transition but does not own EF validation or model reasoning.

| Stage | Responsible component/object | May write | Must not write |
|---|---|---|---|
| Closure readiness | `ImplementationControlPlane` derived `CycleReadyForInterpretation` | idempotent readiness/progress projection bound to exact closure-input hash | Cycle assessment, selected exit, evidence or packet |
| Interpretation proposal | admitted Result Analysis runtime artifact | one `proposed_scientific_disposition` plus evidence roles, rationale, uncertainty, limitations and claim ceiling | authoritative disposition, selected exit, closure snapshot or packet writer payload |
| Authoritative closure | existing ValidationCycle closure action / closure service / `StateWriter` | closure kind, nullable `positive | negative | inconclusive`, accepted proposal ref/hash, D-16 execution-accounting snapshot/hash and server-derived selected exit | a second conclusion object or caller-selected exit |
| Interpretation packet | T-098 result/claim/dossier service after closure | derivative interpretation lineage that references the exact closed Cycle and accepted proposal | changing disposition/exit or becoming evidence |
| Downstream use | Claim, Dossier, retrieval/motive projection and next-step draft services | consume the exact closed Cycle and derivative packet | accept open/proposal-only input as a conclusion |

### D-16 current-effective closure scope
- `closure_watermark` binds the Cycle/frame version, the admission-frozen WorkOrder branch set and each branch's `current_admitted_revision_id`, `head_run_id` and head sequence. The embedded snapshot is the complete current-effective decision scope at that watermark, not the full experimental history.
- Each head Run contributes the Run's immutable manifest, complete required-cell set, all technical Attempts, execution states, eligibility codes and eligible REU refs. An admitted branch with no head Run remains in the candidate scope with stable blocker `BRANCH_HEAD_NOT_FROZEN`; the branch cannot disappear because no Run exists.
- Superseded/non-head Runs remain immutable and queryable but are excluded from closure readiness, execution-accounting snapshot and dossier scope by default. A current admitted revision MAY carry explicit `comparison_input_ref` lineage to an old Run for paper comparison; that reference does not restore head, readiness or execution-scope membership.
- Any non-terminal real-provider Attempt in the Cycle blocks closure, including an Attempt on a superseded/non-head Run. This all-Cycle safety scan is a blocker check and does not make the non-head Run a snapshot member.
- Closure MUST CAS the Cycle version, branch set and per-branch head sequences. Concurrent admission or head advancement returns `CYCLE_CLOSURE_SCOPE_DRIFT`, writes nothing and rebuilds readiness/snapshot; no old snapshot, implicit history scan or compatibility read may be accepted.

### Trigger and state invariants
- Readiness is derived only when the watermark-bound current-effective branch-head scope is complete, exact refs/hashes resolve, every head Run's cells/Attempts are accounted, no branch has `BRANCH_HEAD_NOT_FROZEN`, and no Cycle-wide real-provider Attempt would return `CYCLE_ACTIVE_REAL_ATTEMPT`. A single terminal job or adapter callback cannot make the Cycle ready.
- Eligible REU causes one idempotent Result Analysis invocation for the exact Cycle/frame/snapshot/evidence hash; D-17 does not require a new persisted `interpreting` state. No eligible REU or control-flow-only scope skips Result Analysis and prepares a closure with null scientific disposition.
- Null disposition means **no scientific conclusion** and is not `inconclusive`. Only a scientific `positive | negative | inconclusive` assessment selects the matching admission-frozen exit. No-evidence/control-only next steps come from the non-scientific closure kind and existing control policy, not a scientific exit.
- The closure action accepts or corrects one exact proposal and atomically writes assessment plus snapshot/hash. Draft/admit/complete callers cannot independently author `decision_exit`, and generic completion payloads cannot supply an unconstrained `cycle_assessment`.
- Packet lineage is one-way from `ResultInterpretationPacket` to the immutable closed Cycle. Productized closure MUST NOT depend on a packet that can only be created after closure, and the closed Cycle is not mutated later merely to add a packet ref.

## Implemented Boundary
- Historical note: the landed T-095 backend predates D-17. Its caller-authored `cycle_assessment`, draft/admit `decision_exit`, mixed `pass | fail | inconclusive | partial | blocked` outcome axis and Cycle output packet refs remain accurate implementation history, but they cannot satisfy the product target and must be replaced atomically without compatibility aliases or dual reads.
- Shared contracts live in `paper-implementation-validation-contracts`.
- Persistence is isolated in T-095 Prisma tables; required query fields are columnized and full refs are preserved as payload JSON.
- Service code is Prisma-free and depends on PaperImplementation project, motive, trace, and validation repositories.
- REST routes expose validation draft/admit/complete, planning objects, review items, upstream feedback candidates, and explicit dispatch.
- Admission does not call experiment-foundation, create `ResearchWorkOrder`, create evidence, or create claims.
- Completion does not mutate `CoreMotiveVersion`, evidence boards, portfolio roles, or upstream topic authority.
- Under T-132 D-16, completion atomically freezes each watermark-bound current-effective branch head's exact Run/Attempt refs, execution states, eligibility codes and eligible REU refs into one embedded immutable snapshot/hash. The closure does not mint failed evidence, include non-head history by default, create a new aggregate or add a human action.
- PaperExperimentSidecar only references/rebuilds the snapshot for display; dossier declares closed-Cycle snapshot refs/hashes and cannot infer scope from project-wide REUs.
- D-17 implementation must keep the same single closure action while making the closure service the sole scientific-disposition/selected-exit writer. Result Analysis and T-098 remain proposal/consumer paths respectively.

## Contract Review
- Low-cost cycles can be policy-confirmed.
- Expensive cycles and boundary expansion require human-confirmed transition.
- Exploratory plans can inform future planning but cannot support strong claims without later confirmatory evidence.
- Every active motive must have a current validation cycle, a portfolio decision, or a clear park/abandon state.
- Repeated low-information cycles must create a queue item rather than consuming budget silently.
- Scientific disposition is contextual Cycle authority and does not live on EF Run/Attempt, `RunEvidenceUnit`, a runtime scenario or `ResultInterpretationPacket`.
