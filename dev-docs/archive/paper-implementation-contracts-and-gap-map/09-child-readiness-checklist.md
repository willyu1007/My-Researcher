# 09 Child Readiness Checklist

## Execution Order
Recommended order after T-092:

```text
T-093 -> T-097 -> T-094 -> T-095 -> T-096 -> T-098 -> T-099 -> T-100 -> T-101
```

T-097 starts early because trace is a cross-cutting prerequisite for every writing-affecting object.

## Child Entry Checklist
| Child | Required inputs | Required outputs | Authority writer | Gates | Trace / queryability | Verification prerequisite |
|---|---|---|---|---|---|---|
| T-093 intake bootstrap | Active `TopicSelectionPaperProjectBridgeHandoff`, bridge payload hash, promotion refs, topic package refs | `ImplementationIntakeSnapshot`, `ImplementationProject`, `ImplementationFeedbackEvent` contract | Bootstrap service / future `StateWriter` | active bridge, hash match, source completeness, duplicate/idempotency, upstream no-overwrite | Intake source refs and hashes queryable | Contract/schema tests for stale bridge, hash mismatch, duplicate bootstrap, missing refs, feedback no-overwrite |
| T-097 trace kernel | T-092 object map and all planned writing-affecting objects | `TraceManifest`, `CitationCandidate`, `ClaimTracePacket` prerequisites, natural-language field roles, trace repair queue | Trace service / future `StateWriter` when readiness affected | trace completeness, citation readiness, memo guard, field-role gate | `trace_manifest_ref`, trace status, source locator, claim trace refs queryable | Gate tests for missing source locator, memo-as-evidence, stale/broken refs, JSON-only trace refs |
| T-094 motive/evidence/portfolio | `ImplementationProject`, intake source refs, trace role guidance | `CoreMotiveIdentity`, `CoreMotiveSet`, `CoreMotiveVersion`, assertions, board, `CrossBoardReview`, `MotivePortfolioDecision` | Motive/board service through future `StateWriter` | motive admission, semantic-change, board trace, portfolio constraint, primary confirmation | Motive role, lifecycle, version, board binding, portfolio decision refs queryable | Schema/gate tests for immutable version, unsupported assertion, portfolio violations, unconfirmed primary changes |
| T-095 validation planning | Motive assertions, board gaps/conflicts, `CoreMotiveSet`, portfolio decisions | `ValidationCycle`, route/probe candidates, `ExperimentPlanLight`, WorkOrder draft refs, `loop_budget_review`, feedback candidates | Validation planning service through future `StateWriter` | cycle admission, route feasibility, portfolio constraint, budget/stop rule, scope-broadening confirmation | Cycle id, budget, expected information gain, route/probe/plan refs queryable | Tests for missing budget, low information loop, baseline gap, unconfirmed broadening, portfolio violation |
| T-096 WorkOrder bridge | Admitted validation cycle / experiment plan, experiment-foundation contracts, trace guidance | `ResearchWorkOrder`, broker/harness, monitor intake, eligible `RunEvidenceUnit` gateway input and exact Run/Attempt closure-accounting facts | WorkOrder/ingestion services plus sole Evidence Trust Gateway | WorkOrder admission, reproducibility, run policy, monitor trust, D-16 evidence eligibility | WorkOrder id, separate execution/disposition, dataset/code/config refs, trace refs queryable | Zero failed/cancelled/incomplete REU, valid negative/inconclusive REU, exact closure accounting, AutoTune misuse |
| T-098 result/claim/dossier | eligible `RunEvidenceUnit`, explicit closed-Cycle snapshot refs/hashes, validation reports, trace manifests, motive refs | `ResultInterpretationPacket`, `ClaimCandidate`, `ClaimTracePacket` usage, `ImplementationDossier`, packet projection, feedback candidates | Result/claim/dossier service through `StateWriter` | result interpretation, claim boundary, claim trace, closed-Cycle dossier readiness, export confirmation, feedback no-overwrite | Dossier status, snapshot refs/hashes, claim trace refs, readiness gate refs queryable | Tests for overclaim, open/tampered/wrong-project snapshot, missing execution accounting, missing trace, strong-claim confirmation, stale packet, feedback triggers |
| T-099 AI workflow harness | Stable read-model refs from T-093/T-097/T-094/T-095/T-096/T-098 | `ImplementationHarness`, `ContextCompiler`, `ImplementationInputSnapshot`, harness runs, proposal artifacts, gate/transition/queue candidates | None for agent outputs; domain services call `StateWriter` after gates | harness invariants, schema/reference/trace validation, field-role gate, run-mode isolation, proposal-only output | Harness run, input snapshot, validation statuses, proposal refs, queue candidates queryable | Tests for missing snapshot, stale refs, missing trace, forbidden mutation, gate-failure queueing, mock/product isolation |
| T-100 desktop workbench | Backend command/read-model contracts from T-093 through T-099 | Queue-first workbench read-model consumption and command requests | Backend services / `StateWriter`, never UI | command eligibility, stale/hash display, confirmation policy | UI displays backend trace/queue/readiness fields only | UI contract/governance checks; route-level command tests or substitutes |
| T-101 evaluation suite | Outputs and verification evidence from T-092 through T-100 | Evaluation matrix, fixtures, test results, closure review, residual-risk list | none | D1-D10 coverage, design-doc component coverage, queryability coverage, replay, residual-risk triage | Evaluation evidence links to contracts, gates, traces, dossiers | Deterministic contract/replay/mutation/adversarial/queryability suite |

## Review Before Moving To Next Child
- Required inputs are present and versioned.
- Output objects are sufficient for the next flow.
- Authority writer is identified.
- Gate results and blockers are explicit.
- Trace requirements are wired before readiness/export.
- Required gate/queue/trace fields are queryable.
- Upstream feedback events are emitted instead of mutating topic-selection authority.
- Verification includes happy and blocked paths.

## T-092 Closure Result
T-092 closes with no unowned high-risk gap. T-093 may begin from the intake source fields and bridge compatibility constraints in this package, while T-097 should be scheduled early as the cross-cutting trace prerequisite.
