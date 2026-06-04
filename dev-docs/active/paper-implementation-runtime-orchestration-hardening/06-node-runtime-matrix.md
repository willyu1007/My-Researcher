# 06 Node Runtime Matrix

## Classification Legend
- `existing-minimum`: current implementation exists but is not production runtime promoted.
- `first-slice`: recommended first production promotion slice.
- `promoted`: controlled runtime/admission route, tests, and Domain Gate or explicit no-authority boundary are implemented for the named slot.
- `later-slice`: promote after first slice proves pattern.
- `deterministic-only`: should stay deterministic unless a future review proves LLM value.
- `experiment-runtime`: belongs to WorkOrder/live experiment execution lane.

## Agent Workflow Slots
| Workflow type | Current surface | Classification | Production gaps | Recommended action |
|---|---|---|---|---|
| `trace_integrity_review` | `trace_integrity_review.boundary_debate` runtime route plus T-097 trace service | promoted | Remaining production work is broader environment rollout, not slot entrypoint/routing; deeper semantic repair loop remains future work | Keep as the P1 bounded-debate reference slot; reuse its no-fallback, retry, telemetry, provider canary, and L5/L6 evidence pattern for later debate nodes. |
| `claim_boundary_review` | `claim_boundary_review.boundary_debate` runtime route plus T-098 claim service Domain Gate | promoted | Remaining production work is broader environment rollout; richer claim alternative selection can be added after result-analysis matures | Keep deterministic claim authority in T-098; runtime final artifacts only materialize through Domain Gate after admission. |
| `dossier_readiness_prep` | `dossier_readiness_prep.readiness_audit` runtime route plus T-098 dossier service Domain Gate | promoted | Remaining production work is broader environment rollout; writing-packet projection still stays outside runtime | Keep readiness alternatives as admitted runtime support only; Domain Gate remains the bridge into deterministic dossier authority. |
| `result_analysis` | `result_analysis.interpretation_scenarios` runtime route plus T-098 result interpretation packet Domain Gate | promoted | Multi-role interpretation debate is deferred; current production slice is single-role bounded scenario output with fail-closed retry and no interpretation-as-evidence | Keep result-analysis as interpretation-packet materialization only; use its scenario-output contract before claim-boundary or dossier consumers. |
| `experiment_critique` | `experiment_critique.plan_critique` runtime route plus T-096/T-104 WorkOrder/live adapter boundary | promoted | Remaining work is broader provider/live rollout; current slot is critique-only and has no execution side effect | Keep critique artifacts separate from live experiment adapter and WorkOrder admission; admitted final artifacts are review evidence only. |
| `experiment_design` | `experiment_design.work_order_draft` runtime route plus T-095/T-096 planning/workorder contracts | promoted | Remaining work is broader provider/live rollout; current slot proposes WorkOrder draft candidates but does not create WorkOrders | Keep WorkOrder draft creation in deterministic service routes; runtime final artifacts only carry admitted draft candidates. |
| `route_architecture` | T-095 route/probe planning | later-slice | No runtime slot/admission/replay key | Promote with validation-cycle source hashes and no direct cycle mutation. |
| `route_skeptic_review` | T-095 loop-budget/review anchors | later-slice | No provider canary or deterministic blocker mapping | Promote with queue-item output only. |
| `validation_cycle_planning` | T-095 deterministic service; T-099 workflow type | later-slice | Need runtime proposal/admission boundary before cycle creation | Promote after route slots; keep information-gain and budget gates deterministic. |
| `cross_board_synthesis` | T-094 evidence board/cross-board review | later-slice | No runtime identity or source-hash drift blocking | Promote with board version refs and memo-as-evidence guard. |
| `evidence_board_curation` | T-094 board/evidence binding | later-slice | Needs source locator and citation/evidence hygiene tests | Promote after trace first slice. |
| `motive_decomposition` | T-094 motive versions/assertions | later-slice | Needs semantic-change/human-confirmation boundary | Promote with draft-only output and primary motive change blocker. |
| `motive_evolution` | T-094 motive evolution decisions | later-slice | High authority risk; requires confirmation/state-writer boundary | Promote after runtime pattern is proven; do not start here. |
| `feasibility_planning` | T-095 feasibility probes | later-slice | No runtime/admission slot | Promote with route/probe source refs and budget blocker. |

## Deterministic / Non-LLM Flow Nodes
| Flow node | Current surface | Classification | Production gaps | Recommended action |
|---|---|---|---|---|
| Intake bootstrap | T-093 routes/services; T-101 replay | deterministic-only | Route-level replay exists; may need Prisma stress | Add to runtime stress as deterministic producer, not LLM slot. |
| Trace manifest creation | T-097 service | deterministic-only | Needs inclusion in runtime stress drift checks | Keep deterministic; runtime slots consume trace refs. |
| WorkOrder admission | T-096 service | experiment-runtime | Live adapter exists; stress coverage can be stronger | Add live/deterministic stress lane after LLM first slice or as separate slice. |
| Live experiment submit/sync/collect/cancel | T-104 adapter | experiment-runtime | Default CI fake only; cloud/live opt-in not production stressed | Keep env-gated; add local execution stress only if Q1 says include. |
| Result/claim/dossier authority writes | T-098 service | deterministic authority | Runtime prep can propose; service gates write | Runtime admission must produce safe input only. |
| Decision work queue | T-099/T-100 | deterministic authority surface | Needs runtime stress for dedup/resolve semantics | Include in first-slice stress. |

## Promoted Slot Exit Criteria
- `trace_integrity_review`, `claim_boundary_review`, `dossier_readiness_prep`, `result_analysis`, `experiment_design`, and `experiment_critique` each have:
  - shared contract coverage;
  - runtime service coverage;
  - admission identity/hash recomputation;
  - Prisma smoke or L6 evidence hooks through the shared runtime/admission repository;
  - provider canary local fake plus live skip/pass behavior where the route is enabled;
  - compression/adversarial fixtures;
  - no-authority-write and no-cache-bypass assertions.
