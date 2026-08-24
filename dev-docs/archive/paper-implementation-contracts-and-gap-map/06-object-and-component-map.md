# 06 Object And Component Map

## Purpose
This file is the T-092 ownership map for paper implementation. It maps design-doc objects and runtime components to child task owners before product implementation starts.

> T-132 D-17 adoption (2026-07-12; docs-only, not implemented): the rows below use the product-target single conclusion chain. Result Analysis proposes only; the existing ValidationCycle closure owns scientific disposition/selected exit; `ResultInterpretationPacket` and later consumers require that exact closed Cycle. Landed caller/direct-materializer paths are migration debt.

## Source Set
| Source | Role |
|---|---|
| `00-overview-and-lifecycle.md` | Lifecycle, `ImplementationProject`, motive set, WorkOrder, dossier, feedback |
| `01-core-motive-evidence-evolution.md` | Motive identity/version, evidence board, validation cycle, portfolio decisions |
| `02-route-feasibility-experimentation.md` | Route/probe/experiment planning, `ResearchWorkOrder`, `RunEvidenceUnit` |
| `03-result-claim-dossier.md` | Result interpretation, claim boundary, `ClaimTracePacket`, `ImplementationDossier` |
| `04-traceability-writing-lineage.md` | `TraceManifest`, `CitationCandidate`, trace harness, memo guard |
| `05-orchestration-harness-runtime.md` | Runtime components, harness, state writer, queue, upstream feedback |
| `06-v1-contract-evaluation-roadmap.md` | Frozen rules, queryability requirements, contract/evaluation matrix |

## Object Ownership Map
| Flow | Object / contract | Owner child | Consumers | Current repo status | Required treatment |
|---|---|---|---|---|---|
| Intake | `TopicSelectionPaperProjectBridgeHandoff` | existing `选题管理`; consumed by T-093 | T-093 | adapt | Reuse as upstream handoff only; do not rename or make it implementation root. |
| Intake | `ImplementationIntakeSnapshot` | T-093 | T-094, T-099, T-101 | missing | New neutral intake snapshot with immutable source refs and hashes. |
| Intake | `ImplementationProject` | T-093 | all implementation children | missing | New PaperImplementation authority root; optional PaperProject link is non-authority. |
| Intake / feedback | `ImplementationFeedbackEvent` | T-093 | T-095, T-096, T-098, T-100 | missing | Append-only feedback/recheck event into topic selection; never overwrite upstream authority. |
| Motive | `CoreMotiveIdentity` | T-094 | T-095, T-098, T-100, T-101 | missing | Owns origin, current version, portfolio role, lifecycle, lineage. |
| Motive | `CoreMotiveSet` | T-094 | T-095, T-100, T-101 | missing | Owns active/primary/fallback/supporting/parked/abandoned sets and constraints. |
| Motive | `CoreMotiveVersion` | T-094 | T-095, T-097, T-098 | missing | Immutable admitted semantic contract; changes require evolution decision. |
| Motive | Motive assertion records | T-094 | T-095, T-097, T-098 | missing | Separate motivation, method, empirical, and scope assertions. |
| Motive | `MotiveEvidenceBoardVersion` | T-094 | T-095, T-097 | missing | Support/challenge/context bindings only; not final claim evidence. |
| Portfolio | `CrossBoardReview` | T-094 | T-095, T-100, T-101 | missing | Structured cross-board review, not UI browsing. |
| Portfolio | `MotivePortfolioDecision` | T-094 | T-095, T-100, T-101 | missing | Required for role changes, merge/split, park, abandon, primary replacement. |
| Validation | `ValidationCycle` | T-095 | T-096, T-098, T-101 | missing; D-17 migration required | Admission freezes question/criteria/budget and positive/negative/inconclusive exit definitions; existing closure is the sole nullable scientific-disposition writer and server-derives the selected exit. |
| Validation | `TechnicalRouteCandidate` / `FeasibilityProbe` | T-095 | T-096, T-101 | missing | Route/probe planning only; no trusted evidence or claims. |
| Validation | `ExperimentPlanLight` | T-095 | T-096, T-098 | missing | Freezes route scope, metrics, baseline/data refs, budget, stop rules. |
| Experiment | `ResearchWorkOrder` | T-096 | T-097, T-098, T-101 | missing | PaperImplementation governance envelope for all experiment execution. |
| Experiment | `ResearchWorkOrderHarness` | T-096 | T-099, T-101 | missing | Only trusted path into experiment-foundation execution. |
| Experiment | `RunMonitorAdapter` | T-096 | T-098, T-101 | missing | Receives async run updates; untrusted without `work_order_id`. |
| Experiment | Evidence Trust Gateway | T-132/T-124 refinement of T-096 | T-098, T-101 | missing | Sole writer for complete protocol-compliant validation-passed EvidenceCandidate → RunEvidenceUnit. |
| Experiment | `RunEvidenceUnit` | T-096, refined by T-132 D-16/D-17 | T-097, T-098, T-101 | missing | Eligible evidence lineage for a complete protocol-compliant validation-passed candidate; never failed/cancelled/incomplete execution and never the scientific-disposition authority. |
| Result support | Result Analysis proposal | T-114/T-124 under T-132 D-17 | T-095 closure only | landed four-scenario/direct-packet path must migrate | One exact-hash-bound proposal with disposition, evidence roles, uncertainty, limitations and claim ceiling; support-only, no Cycle/exit/packet write. |
| Validation/experiment accounting | ValidationCycle closure assessment + snapshot/hash | T-095/T-124 under T-132 D-16/D-17 | T-098, T-101 | missing; atomic migration required | Sole nullable scientific-disposition/selected-exit authority plus embedded exact Run/Attempt accounting; Sidecar display and dossier declared-scope source. |
| Experiment substrate | `RunRecipe`, `TrainingTaskSpec`, `ExternalTrainingJob`, `ExperimentResult`, `ResultValidationReport`, `EvidenceCandidate` | existing `experiment-foundation`; consumed by T-096 | T-096, T-098 | adapt | Reuse by refs/hashes only; do not copy reusable asset DTOs into PaperImplementation authority. |
| Trace | `TraceManifest` | T-097 | all writing-affecting children | missing | Mandatory for writing-affecting objects before writing-ready export. |
| Trace | `CitationCandidate` | T-097 | T-098, writing lane | missing | Only from citable literature evidence with source locator. |
| Trace | `ClaimTracePacket` | T-097 / T-098 | T-098, T-101 | missing | Required for every claim included in an implementation dossier. |
| Trace | `MemoAsEvidenceGuard` | T-097 | all children | missing | Blocks memo/rationale/summary/interpretation from evidence authority. |
| Trace | Natural-language field role registry | T-097 | T-099, T-101 | missing | Distinguish semantic contract, interpretation, rationale memo, display summary, operational instruction, human judgment. |
| Result | `ResultInterpretationPacket` | T-098 | T-099, T-100, T-101 | missing; D-17 migration required | Post-closure interpretation lineage over the exact closed Cycle and accepted proposal; explains evidence/limitations/claim ceiling but cannot choose disposition/exit or become evidence. |
| Result | `ClaimCandidate` | T-098 | T-097, T-100, T-101 | missing | Bounded proposed claim; cannot be writing-ready without trace and gates. |
| Dossier | `ImplementationDossier` | T-098 | PaperProject/writing lane, T-100, T-101 | missing | Authoritative pre-writing package; supports ready, parked, abandoned-with-trace. |
| Dossier projection | `WritingEntryPacket` projection | T-098 | `PaperProject` / writing lane | legacy/adapt | Future packet is derived from dossier version; legacy research-argument packet is migration input only. |
| Runtime | `ImplementationHarness` | T-099 | all runtime children, T-101 | missing | Project-level policy shell for workflows, WorkOrders, trace, evaluation. |
| Runtime | `ImplementationInputSnapshot` | T-099 | all AI workflows | missing | Controlled workflow input with included/excluded refs, hashes, freshness policy. |
| Runtime | `ContextCompiler` | T-099 | all AI workflows | missing | Builds controlled input snapshots; excludes stale/invalidated/memo-as-evidence inputs. |
| Runtime | `PaperImplementationAgentWorkflowHarness` | T-099 | T-100, T-101 | missing | Proposal-only AI workflow shell over shared runtime kernel. |
| Runtime | `GateResult` / `TransitionAttempt` | T-099 | StateWriter, T-100, T-101 | missing | Formal envelope for proposed state transitions and gate outcomes. |
| Runtime | `StateWriter` | T-099 contract; implemented by domain services | all stateful children | missing | Sole authority state writer after gates, trace, confirmation, risk checks. |
| Queue | `DecisionWorkQueueItem` | T-099 | T-100, T-101 | adapt/missing | Topic-selection has queue pattern; PaperImplementation needs own queue item contract. |
| UI | `PaperImplementationWorkbench` | T-100 | users, T-101 | missing | Queue-first command/read-model surface under `论文管理`; no client authority state. |
| Evaluation | Evaluation matrix / fixtures | T-101 | parent closure | missing | Contract, replay, adversarial, queryability, trace, dossier readiness tests. |

## Runtime Component Ownership Map
| Component | Primary owner | Consumer / verifier | Current repo status | Required treatment |
|---|---|---|---|---|
| `ContextCompiler` | T-099 | T-101 | missing | Build controlled `ImplementationInputSnapshot`; no free-form history ingestion. |
| `ValidationCycleScheduler` | T-095 | T-100, T-101 | missing | Select next validation under portfolio, budget, stop-rule constraints. |
| `AgentWorkflowHarness` | T-099 | T-100, T-101 | adapt | Reuse domain-neutral runtime lessons from topic-selection, not topic-selection node semantics. |
| `ResearchWorkOrderBroker` | T-096 | T-099, T-101 | missing | Admit work-order drafts and bind policy/trace refs before execution. |
| `ResearchWorkOrderHarness` | T-096 | T-101 | missing | Enforce reproducibility and trace around experiment-foundation calls. |
| `RunMonitorAdapter` | T-096 | T-098, T-101 | missing | Receive async run result; mark callback untrusted without WorkOrder linkage. |
| `EvidenceLedgerWriter` | T-096 | T-098, T-101 | missing | Persist every run outcome into queryable `RunEvidenceUnit`. |
| `GateService` | T-099 contract; flow gates in T-093-T-098 | T-101 | missing | Deterministic/semantic gates cannot read memo as evidence. |
| `MotiveEvolutionService` | T-094 | T-095, T-101 | missing | Produces evolution decision drafts; `StateWriter` applies admitted changes. |
| `BudgetAndStopRuleService` | T-095 / T-099 | T-100, T-101 | missing | Enforce iteration budgets, stop rules, `loop_budget_review`. |
| `PortfolioCoordinator` | T-094 | T-095, T-100, T-101 | missing | Manage motive roles, active limits, primary replacement confirmation. |
| `TraceHarness` | T-097 | all children, T-101 | missing | Generate/validate trace before readiness/export. |
| `StateWriter` | T-099 contract; domain services implement | all stateful children | missing | Only authority writer for lifecycle/readiness/version changes. |
| `DecisionWorkQueue` | T-099 | T-100, T-101 | adapt/missing | Use topic-selection pattern as reference only; PaperImplementation queue owns its own types. |
| `UpstreamFeedbackBridge` | T-093 | T-095, T-096, T-098, T-100 | missing | Emit `ImplementationFeedbackEvent`; no upstream overwrite. |
| `EvaluationHarness` | T-101 | parent closure | adapt/missing | Reuse scenario/evaluation patterns, add paper implementation fixtures. |

## Closure Decisions
- No required design-doc object remains without a child owner.
- No existing repo object should be promoted directly into PaperImplementation authority without a child-specific contract.
- Retired pre-writing control-plane artifacts are historical only and not implementation inputs.
- T-093 may start after this map because intake source refs and current repo handoff source are identified.
