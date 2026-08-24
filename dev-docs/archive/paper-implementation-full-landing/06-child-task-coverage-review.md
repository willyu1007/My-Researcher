# 06 Child Task Coverage Review

## Review Outcome
- Review date: 2026-05-20
- Parent task: `T-091 paper-implementation-full-landing`
- Outcome: the child task set covers the full D1-D10 paper implementation scope.
- Design-doc supplement: portfolio governance, implementation runtime harness, upstream feedback, and queryable persistence fields are assigned to explicit child owners.
- Open coverage gaps: none unowned after supplement.
- Residual risks: handled by explicit child tasks and review gates below.
- Execution rule: the child set table below is a package coverage inventory, not the implementation execution order. The execution baseline after T-092 is `T-093 -> T-097 -> T-094 -> T-095 -> T-096 -> T-098 -> T-099 -> T-100 -> T-101`.

## Confirmed Child Set
| Package order | Task ID | Child package | Flow node | Coverage |
|---|---|---|---|---|
| 1 | `T-092` | `paper-implementation-contracts-and-gap-map` | object mapping and dependency review | done; owns current-state inventory, object/component map, queryability matrix, and child readiness checklist |
| 2 | `T-093` | `paper-implementation-intake-bootstrap` | topic-selection handoff to implementation root | done; owns `ImplementationIntakeSnapshot -> ImplementationProject` |
| 3 | `T-094` | `paper-implementation-motive-evidence-board` | motive/assertion/evidence-board/portfolio kernel | done; owns `CoreMotiveVersion`, evidence-board authority, and portfolio decisions |
| 4 | `T-095` | `paper-implementation-validation-cycle-planning` | validation cycle and route/probe planning | done; owns validation planning before execution under budget and portfolio constraints |
| 5 | `T-096` | `paper-implementation-workorder-experiment-bridge` | implementation work order to experiment foundation | done; owns WorkOrder, monitor intake, and `RunEvidenceUnit` ingestion |
| 6 | `T-097` | `paper-implementation-trace-kernel` | trace/citation/memo guard | done; owns cross-cutting trace kernel |
| 7 | `T-098` | `paper-implementation-result-claim-dossier` | result interpretation, claim boundary, dossier readiness | done; owns writing-prep authority |
| 8 | `T-099` | `paper-implementation-ai-workflow-harness` | AI proposal runtime and implementation harness | done; owns proposal-only AI workflow shell plus project-level runtime governance contracts |
| 9 | `T-100` | `paper-implementation-desktop-workbench` | desktop decision workbench | done; owns command/read-model UI surface |
| 10 | `T-101` | `paper-implementation-contract-evaluation-suite` | full-flow evaluation | done; owns contract/replay/adversarial/queryability closure |

## Execution Order Baseline
| Execution step | Task ID | Reason |
|---|---|---|
| 1 | `T-093` | Establish `ImplementationProject` identity and immutable upstream lineage before any implementation object is created. |
| 2 | `T-097` | Land trace primitives early so every writing-affecting child can wire trace before acceptance. |
| 3 | `T-094` | Build motive/evidence/portfolio contracts under the admitted implementation root and trace guidance. |
| 4 | `T-095` | Plan validation cycles from admitted motives, board gaps, and portfolio constraints. |
| 5 | `T-096` | Bridge admitted plans to experiment-foundation execution through WorkOrders. |
| 6 | `T-098` | Interpret run evidence into bounded claims and dossiers after WorkOrder evidence and trace are available. |
| 7 | `T-099` | Add AI workflow harness after stable read-model, gate, trace, and proposal boundaries exist. |
| 8 | `T-100` | Add desktop command/read-model surface after backend authority contracts exist. |
| 9 | `T-101` | Close with contract, replay, adversarial, queryability, trace, and dossier-readiness evaluation. |

## End-to-End Coverage
| Requirement / goal | Covered by | Review result |
|---|---|---|
| Promoted topic intake without `PaperProjectBridge` semantic drift | `T-092`, `T-093` | covered |
| `PaperImplementation` authority root and motive kernel | `T-093`, `T-094` | covered |
| Portfolio governance, cross-board review, and motive role changes | `T-094`, `T-095`, `T-100`, `T-101` | covered after supplement |
| Validation cycles before expensive execution | `T-095` | covered |
| Experiment execution via WorkOrder and experiment-foundation refs | `T-096` | covered |
| Failed execution and negative/inconclusive result retention | `T-095`, `T-096`, `T-097`, `T-098`, refined by T-132 D-16 | covered historically; productized split requires Cycle closure snapshot for execution and REU only for eligible scientific results |
| Trace-first lineage and memo-as-evidence guard | `T-097` plus every flow-node child | covered |
| Result interpretation without evidence drift | `T-098` | covered |
| Claim boundary, claim trace, and dossier readiness | `T-097`, `T-098` | covered |
| Project-level `ImplementationHarness` and runtime governance | `T-099`, `T-101` | covered after supplement |
| AI workflow without authority bypass | `T-099` | covered |
| Upstream implementation feedback into topic selection | `T-093`, `T-095`, `T-096`, `T-098`, `T-100` | covered after supplement |
| Human review and confirmation command surfaces | `T-098`, `T-100` | covered |
| Desktop workbench as command/read-model surface | `T-100` | covered |
| Queryable persistence fields for gates, queues, trace, and tests | `T-092`, all data-bearing children, `T-101` | covered after supplement |
| Full-flow repeatable verification | `T-101` | covered |
| Retired pre-writing control-plane removal | `T-113`, all implementation children as a boundary rule | covered |

## Flow Contract Review
1. Intake bootstrap closes only when `ImplementationProject` has immutable upstream refs/hashes.
   - Next step dependency: motive/evidence-board work must read admitted implementation identity, not upstream bridge as authority.
2. Motive/evidence board closes only when motive assertions, evidence support/challenge, gaps, conflicts, `CoreMotiveSet`, and portfolio decisions are trace-ready.
   - Next step dependency: validation planning must use explicit gaps, assertions, and portfolio priorities, not free-text summaries.
3. Validation-cycle planning closes only when cycles have budget, expected information gain, stop rules, portfolio constraint checks, and work-order handoff candidates.
   - Next step dependency: WorkOrder bridge must receive admitted plans, policy refs, and portfolio context, not raw agent suggestions.
4. WorkOrder bridge historical closure retained all outcomes, but T-132 D-16 supersedes the all-REU target: eligible scientific results enter RunEvidenceUnit; failed/cancelled/incomplete execution enters the immutable Cycle closure snapshot/hash.
   - Next step dependency: result/claim/dossier work consumes declared closed-Cycle accounting plus eligible run evidence, not raw platform output or a project-wide REU scan.
5. Trace kernel closes only when writing-affecting objects have explicit lineage categories and broken trace creates queue items.
   - Next step dependency: claim and dossier gates must call trace completeness before readiness.
6. Result/claim/dossier closes only when claims have boundaries, trace packets, failed-run accounting, and dossier readiness result.
   - Next step dependency: writing and desktop surfaces consume dossier/packet projections only.
7. AI workflow harness closes only when `ImplementationHarness`, `ContextCompiler`, policy pack, runtime bindings, and proposal-only agent behavior are explicit.
   - Next step dependency: UI can show proposals and commands without treating model output as confirmation.
8. Desktop workbench closes only when queue-first UI emits backend commands and never writes authority state locally.
   - Next step dependency: evaluation suite can verify command/read-model behavior.
9. Evaluation closes only when D1-D10 rules, design-doc component coverage, and required queryable fields have repeatable tests or explicit residual-risk owners.
   - Parent closure dependency: no unowned blocker remains.

## Gap Assessment
The second design-doc audit found four implicit gaps: portfolio governance, project-level runtime harness, upstream feedback, and minimum queryable persistence fields. These gaps are now assigned to explicit child tasks and no uncovered functional gap remains after the supplement.

T-092 closure confirms:
- all required design-doc objects and runtime components have child owners;
- current repo surfaces are classified as reuse, adapt, legacy-transition, or missing;
- required queryable fields are mapped before persistence work starts;
- T-093 is the next child entry, with T-097 scheduled early for trace prerequisites.

Residual risk handling:
- Trace timing risk: `T-097` starts early, and each flow-node child must wire trace before acceptance.
- UI-before-backend risk: `T-100` depends on backend command/read-model contracts.
- AI-before-gates risk: `T-099` depends on trace, gates, and WorkOrder boundaries.
- Portfolio drift risk: `T-094` owns motive roles and portfolio decisions; `T-095` must not schedule cycles outside portfolio constraints.
- Runtime-fragmentation risk: `T-099` owns the project-level harness contract; flow-node tasks must not create local harness variants.
- Persistence-query risk: `T-092` maps required columnized fields, and `T-101` must fail closure if gate/queue/trace fields are only hidden in JSON.
- Legacy drift risk: retired pre-writing control-plane artifacts must not be touched except archive maintenance or negative guards.

## Review Gate For Each Child
Before moving from one child flow to the next, review:
- required inputs are present and versioned;
- output objects are sufficient for the next flow;
- authority writer is identified;
- gate results and blockers are explicit;
- trace requirements are wired;
- stale/hash behavior is defined;
- required gate/queue/trace fields are queryable;
- upstream feedback events are emitted instead of mutating topic-selection authority;
- verification proves both happy and blocked paths.

## Overall Decision
The task package set is executable as a staged implementation plan. `T-092 paper-implementation-contracts-and-gap-map` is closed. Proceed with `T-093 paper-implementation-intake-bootstrap`, schedule `T-097 paper-implementation-trace-kernel` early, then continue through the confirmed D10 sequence while keeping `T-091` as the roadmap authority for decision conflicts.

## 2026-05-21 T-094 Closure Review
- `T-094 paper-implementation-motive-evidence-board` is closed as backend minimum closure.
- The next child entry is `T-095 paper-implementation-validation-cycle-planning`.
- T-095 must consume only admitted `CoreMotiveVersion` objects and trace-ready `MotiveEvidenceBoardVersion` outputs; draft/internal objects and board summaries alone are not ready inputs.
- No D1-D10 roadmap decision was reopened.

## 2026-05-21 T-095 Closure Review
- `T-095 paper-implementation-validation-cycle-planning` is closed as backend minimum closure.
- The next child entry is `T-096 paper-implementation-workorder-experiment-bridge`.
- T-096 must consume admitted `ValidationCycle` and work-order-ready `ExperimentPlanLight` refs; no direct experiment execution is allowed from validation planning.
- No D1-D10 roadmap decision was reopened.

## 2026-05-21 T-096 Closure Review
- `T-096 paper-implementation-workorder-experiment-bridge` is closed as backend minimum closure.
- The next child entry is `T-098 paper-implementation-result-claim-dossier`.
- T-098 must consume `RunEvidenceUnit`, result validation refs, validation-cycle refs, and trace refs; raw experiment-foundation platform state and untrusted monitor callbacks are not ready claim inputs.
- WorkOrder statuses, run statuses, run type, dataset/code/config refs, external job refs, trace refs, and failure summaries are queryable in persistence.
- No D1-D10 roadmap decision was reopened.

## 2026-05-21 T-098 Closure Review
- `T-098 paper-implementation-result-claim-dossier` is closed as backend minimum closure.
- The next child entry is `T-099 paper-implementation-ai-workflow-harness`.
- T-099 must consume backend read-model refs and trace-ready objects as proposal context; it must not turn AI output into authority state.
- Result interpretation, claim candidate, dossier readiness, writing-entry packet projection, and result-driven feedback surfaces are available as refs/read models for AI proposal workflows.
- No D1-D10 roadmap decision was reopened.

## 2026-05-21 T-099 Closure Review
- `T-099 paper-implementation-ai-workflow-harness` is closed as backend minimum closure.
- The next child entry is `T-100 paper-implementation-desktop-workbench`.
- T-100 must consume `ImplementationProposalArtifact`, `ImplementationGateResult`, `ImplementationTransitionAttempt`, and `DecisionWorkQueueItem` as backend read models; UI must still emit backend commands and never write authority state locally.
- T-099 confirmed proposal-only AI workflow behavior, mock/product isolation, trace-manifest checks, memo-as-evidence blocking, and direct authority mutation blocking.
- No D1-D10 roadmap decision was reopened.

## 2026-05-21 T-100 Closure Review
- `T-100 paper-implementation-desktop-workbench` is closed as desktop minimum closure.
- The next child entry is `T-101 paper-implementation-contract-evaluation-suite`.
- T-101 must verify UI command/read-model paths by renderer tests or route-level substitutes, because screenshot verification was blocked by missing Chrome in the current environment.
- T-100 confirmed queue-first backend read-model consumption and backend-only commands for decision queue resolution, trace repair resolution, upstream feedback dispatch, and portfolio decision apply.
- No D1-D10 roadmap decision was reopened.

## 2026-05-22 T-101 Closure Review
- `T-101 paper-implementation-contract-evaluation-suite` is closed.
- Added full-flow replay from implementation intake through dossier readiness and writing packet projection.
- Added blocked/adversarial checks for hash drift, missing citation locator, display-summary hard-gate misuse, orphan monitor callback, AI direct authority mutation, upstream feedback boundary, and JSON-only queryability risks.
- Added design-doc component coverage and residual-risk report; remaining risks are non-blocking and owned.
- Parent `T-091 paper-implementation-full-landing` can close with no unowned V1 blocker.
- No D1-D10 roadmap decision was reopened.
