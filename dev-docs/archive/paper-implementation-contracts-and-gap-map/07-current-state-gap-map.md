# 07 Current State Gap Map

## Purpose
This file classifies current repo assets as `reuse`, `adapt`, `legacy-transition`, or `missing` for PaperImplementation.

## Classification Rules
| Status | Meaning |
|---|---|
| `reuse` | Existing contract/code can be consumed as-is by refs or documented behavior. |
| `adapt` | Existing contract/code provides a pattern or upstream/downstream object, but PaperImplementation needs its own contract. |
| `legacy-transition` | Existing capability may be inventoried or migrated, but must not receive new authority semantics. |
| `missing` | Required PaperImplementation contract/code does not exist yet. |

## Repo Inventory
| Area | Evidence | Status | T-092 conclusion |
|---|---|---|---|
| Topic-selection bridge | `packages/shared/src/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts.ts`, backend bridge service/repository, topic workbench bridge card | adapt | Use `TopicSelectionPaperProjectBridgeHandoff` as upstream handoff for T-093. Preserve existing `PaperProjectBridge` names; do not rename. |
| Paper project intake | `TopicSelectionPaperProjectBridgeIntakeInput` / `TopicSelectionPaperProjectBridgeIntakeResult` exist for downstream paper intake | adapt | T-093 must create PaperImplementation intake separately; optional `target_paper_project_ref` remains a link. |
| Research argument | `packages/shared/src/research-lifecycle/research-argument-*`, backend research-argument service/repository, active `research-argument-control-plane-v1` docs | legacy-transition | Useful vocabulary/checks may be inventoried. Do not add PaperImplementation authority, readiness, planner, or UI under research-argument. |
| Retired packet concept | Historical bridge docs defined packet and promotion response | retired | `WritingEntryPacket` is regenerated from `ImplementationDossier`; no retired packet shape is a migration/reference source. |
| Experiment foundation contracts | `experiment-foundation-contracts.ts` defines datasets, locks, recipes, materialization, jobs, results, validation, evidence candidates, sidecars | adapt | T-096 consumes refs/hashes and does not copy reusable DTOs into PaperImplementation authority. |
| Experiment foundation execution | backend execution repository/service/routes and desktop workbench exist | adapt | T-096 needs `ResearchWorkOrder`, `RunMonitorAdapter`, `EvidenceLedgerWriter`, `RunEvidenceUnit` before results are trusted implementation evidence. |
| Topic-selection workflow harness | topic-selection workflow harness service and runtime docs exist | adapt | T-099 may reuse domain-neutral runtime patterns only; PaperImplementation owns its own snapshots, gates, harness, queue, StateWriter contract. |
| Topic workbench queue/card patterns | desktop topic workbench and queue panel exist | adapt | T-100 may reuse UI shape; must not reuse topic-selection business semantics. |
| PaperImplementation contracts | no shared/backend PaperImplementation contracts found | missing | T-093 through T-101 own new PaperImplementation contracts. |
| Trace kernel | no `TraceManifest`, `CitationCandidate`, `ClaimTracePacket` implementation found for PaperImplementation | missing | T-097 must land before writing-affecting outputs can become writing-ready. |
| Queryability matrix | no PaperImplementation persistence fields exist | missing | T-092 matrix defines minimum fields; later data-bearing tasks must implement/test them. |

## Child Gap Matrix
| Child | Blocking gaps before implementation | Non-blocking gaps / notes |
|---|---|---|
| T-093 intake bootstrap | Define `ImplementationIntakeSnapshot`, `ImplementationProject`, `ImplementationFeedbackEvent`, idempotency, stale/hash checks. | Existing `PaperProjectBridge` gives source refs and hashes; preserve compatibility names. |
| T-097 trace kernel | Define `TraceManifest`, `CitationCandidate`, `ClaimTracePacket`, natural-language field roles, trace repair queue, queryable trace refs. | Can start early in parallel after T-092 because it is cross-cutting. |
| T-094 motive/evidence/portfolio | Define `CoreMotiveIdentity`, `CoreMotiveSet`, `CoreMotiveVersion`, assertions, board, cross-board review, portfolio decision. | Research-argument can inform vocabulary but cannot own authority. |
| T-095 validation planning | Define `ValidationCycle`, route/probe/plan contracts, budget/stop rules, portfolio constraints, `loop_budget_review`. | May emit feedback candidates, but T-093 owns event contract. |
| T-096 WorkOrder bridge | Define `ResearchWorkOrder`, broker/harness, monitor intake, ledger writer, `RunEvidenceUnit`. | Experiment-foundation refs/hashes are available; PaperImplementation must not copy asset DTOs. |
| T-098 result/claim/dossier | Define result interpretation, claim candidate, dossier readiness, dossier statuses, projection policy, feedback triggers. | Depends on T-096 evidence and T-097 trace completeness. |
| T-099 AI workflow harness | Define `ImplementationHarness`, `ContextCompiler`, snapshots, proposal artifacts, gate/transition/queue contracts. | Topic-selection runtime is a pattern only. |
| T-100 desktop workbench | Define backend read-model and command contracts before UI details. | UI should stay coarse until backend contracts land. |
| T-101 evaluation suite | Define design-doc component coverage, queryability tests, replay/adversarial fixtures. | Default suite must be deterministic and credential-free. |

## High-Risk Gap Review
| Risk | Owner | Blocking? | Closure path |
|---|---|---|---|
| `PaperProjectBridge` semantic drift into implementation authority | T-093 | yes | Bootstrap only from `ImplementationIntakeSnapshot`; keep bridge as upstream lineage. |
| Retired pre-writing control plane reactivated as a second authority lane | all children; T-113 guard | yes | Do not reuse as migration/reference input; only archived docs and negative guards may mention it. |
| Experiment execution without WorkOrder | T-096 | yes | `ResearchWorkOrderHarness` is the only trusted execution path. |
| Trace added after writing readiness | T-097 / T-098 | yes | `TraceManifest` required before dossier readiness/export. |
| AI proposal becomes authority write | T-099 | yes | Agents output proposals/quality signals only; StateWriter applies after gates. |
| Required gate/queue/trace fields hidden in JSON | T-092 / data-bearing children / T-101 | yes | Use 08 matrix; T-101 queryability tests fail JSON-only required fields. |
| UI synthesizes readiness locally | T-100 | yes | Workbench consumes backend read-models and emits commands only. |

## Current Gap Decision
No high-risk gap is unowned after T-092. The next implementation entry is T-093, while T-097 should start early enough to constrain later writing-affecting contracts.
