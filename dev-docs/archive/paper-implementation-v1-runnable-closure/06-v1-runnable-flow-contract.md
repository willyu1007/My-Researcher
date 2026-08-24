# V1 Runnable Flow Contract

> D-16 supersession (2026-07-12): the route sequence is historical V1 evidence. Step 13/14 failed-REU behavior cannot satisfy current productized acceptance; the replacement sequence routes failed/cancelled/incomplete execution to immutable Cycle closure accounting and creates REU only for a complete validation-passed EvidenceCandidate.

## Purpose
The contract defines the minimum PaperImplementation V1 flow that T-109 must make repeatable. The flow is a route-level replay contract backed by service-level fixture helpers. The replay does not create new authority objects and does not bypass existing authority writers.

Primary source surfaces:
- `apps/backend/src/routes/paper-implementation-routes.ts`
- `apps/backend/src/routes/paper-implementation-routes.integration.test.ts`
- `packages/shared/src/research-lifecycle/paper-implementation-*-contracts.ts`
- `apps/backend/src/services/paper-implementation-*-service.ts`

## Runner Boundary
| Rule | Decision |
|---|---|
| Default runner | Route-level replay through `buildApp` / Fastify injection. |
| Fixture helpers | Service-level helpers may construct deterministic inputs, but final authority writes must go through existing routes or service authority writers. |
| Persistence | In-memory is required for default closure. Local Postgres/disposable-schema is optional unless DB parity becomes a blocker. |
| Artifact output | Write redacted evidence under `.ai/.tmp/paper-implementation-v1-runnable-closure/<run-id>/`. |
| CLI smoke | Preferred after route sequence stabilizes, not required for the first closure entrypoint. |

## Canonical Happy Path
| Step | Route / writer | Required inputs | Authority output | Gate / trace requirement | Recovery / next step |
|---|---|---|---|---|---|
| 1 | `POST /paper-implementation/projects/bootstrap` | `paper_project_bridge_id`, `bridge_payload_hash` from active upstream handoff | `ImplementationProject`, immutable intake snapshot | Active bridge and matching payload hash; no `research-argument` authority input | Same bridge/hash is idempotent; changed hash returns `VERSION_CONFLICT`. |
| 2 | `POST /trace-manifests` for `core_motive_version:<id>` | Literature/decision lineage for admitted motive | `TraceManifest` | Must be `complete` before motive admission | Broken trace creates repair/review signal and blocks admission. |
| 3 | `POST /core-motives/drafts` | Semantic contract, motive assertion, falsification, claim boundary | Draft `CoreMotiveVersion` | Draft is not ready for downstream flow | Admit only after trace and gate checks. |
| 4 | `POST /core-motives/:motive_id/versions/:version_id/admit` | `trace_manifest_id` from step 2 | Admitted `CoreMotiveVersion` | Complete trace targeting motive version | Draft or trace-broken motive cannot feed validation. |
| 5 | `POST /trace-manifests` for board and bindings | Board/binding lineage | Board/binding `TraceManifest` objects | Complete trace for writing-affecting board/bindings | Binding trace gaps block board readiness. |
| 6 | `POST /motive-evidence-boards` | Admitted motive version, assertion-centered bindings, board trace | `MotiveEvidenceBoardVersion` | Board summaries are display/interpretation only, not evidence | Validation consumes assertions/gaps, not free-text summary alone. |
| 7 | `POST /validation-cycles/drafts` | Admitted motive, board gap trigger, criteria, budget, expected information gain | Draft `ValidationCycle` | Must contain pass/fail/inconclusive criteria, budget, stop rules | `expected_information_gain=none` needs explicit override. |
| 8 | `POST /trace-manifests` for `validation_cycle:<id>` and `POST /validation-cycles/:id/admit` | Validation-cycle trace | Admitted `ValidationCycle` | Complete trace targeting validation cycle | Draft/parked/trace-broken target blocks admission. |
| 9 | `POST /trace-manifests` for `experiment_plan_light:<id>` and `POST /experiment-plan-lights` | Metrics, dataset/code/config/baseline refs, budget, stop conditions | `ExperimentPlanLight` | Trace-ready handoff to WorkOrder | Baseline gaps block expensive/confirmatory plans. |
| 10 | `POST /trace-manifests` for `research_work_order:<id>`, `POST /research-work-orders/drafts`, `POST /research-work-orders/:id/admit` | Validation cycle, experiment plan light, run policy, experiment bridge refs/hashes | Admitted `ResearchWorkOrder` | Complete WorkOrder trace; no direct experiment execution from validation | WorkOrder remains process authority, not scientific outcome authority. |
| 11 | T-104 seam: `POST /research-work-orders/:id/live-experiment-runs/submit` | Admitted WorkOrder, idempotency key, experiment materialization refs | External job plus harness run | External job belongs-to-WorkOrder must be checked before side effects | Duplicate same key is idempotent; mismatch returns conflict. |
| 12 | T-104 seam: `POST /live-experiment-runs/:external_job_id/sync` | WorkOrder id, external job id | Non-final monitor intake / handoff | Sync never creates trusted final evidence | Terminal sync should recommend collect/finalize. |
| 13 | Historical V1 `collect`/monitor intake; D-16 replacement uses gateway or Cycle closure input | Target-specific trace/external job plus resolved result/validation/EvidenceCandidate or exact terminal Run/Attempt facts | Eligible `RunEvidenceUnit` or immutable Cycle closure snapshot entry | REU requires complete validation-passed EvidenceCandidate; failed/cancelled/incomplete creates no REU | Orphan callback is untrusted; missing trace/candidate blocks evidence, while terminal execution remains accountable. |
| 14 | `POST /trace-manifests` for `result_interpretation_packet:<id>` and `POST /result-interpretation-packets` | Eligible run evidence, metrics and declared closed-Cycle snapshot refs/hashes | `ResultInterpretationPacket` | Experiment lineage and Cycle accounting scope required | Result summary bounds claim implications; failed execution remains in closure snapshot, not REU. |
| 15 | `POST /trace-manifests` for `claim_candidate:<id>` and `POST /claim-trace-packets` | Claim statement, trace manifest, separated lineage, challenge/scope/boundary | `ClaimTracePacket` | Memo-only evidence is forbidden | Missing claim trace keeps claim out of ready dossier. |
| 16 | `POST /claim-candidates` | Result packet ids, support refs, scope, boundary, trace and claim trace | `ClaimCandidate` | Supported only with claim trace; broad contextual refs are insufficient | Overclaim and unsupported support block readiness. |
| 17 | `POST /trace-manifests` for `implementation_dossier:<id>` and `POST /implementation-dossiers` | Result packet, claim candidate, claim trace packet, readiness gate | `ImplementationDossier` | Dossier `ready_for_writing` admits supported trace-ready claims only | Dossier not ready blocks writing packet. |
| 18 | `POST /implementation-dossiers/:dossier_id/writing-entry-packets` | Ready dossier, projection policy | `WritingEntryPacket` projection | Projection only; no writing-module authority mutation | The step is the V1 writing boundary. |
| 19 | Linked loop: `POST /validation-cycles/:id/complete`, `GET /validation-planning-review-items`, `POST /validation-upstream-feedback-candidates`, optional `dispatch` | Assessment and source refs from evidence/result | Review item, feedback candidate/event, or adjusted planning input | Feedback dispatch must use `paper_implementation` source and not mutate topic-selection authority directly | Next-step planning is explicit: follow-up validation cycle/work order or upstream feedback. |
| 20 | Optional AI/evaluation lanes | Harness/input snapshot/provider variance requests | Proposal artifacts, quality signals, queue items, preflight report | AI output is proposal/evaluation only | T-105 preflight must not become live provider execution. |

## Deterministic Linked Loop
T-109 must prove more than one-way execution. The replay must show that experiment-facing evidence can return into PaperImplementation planning.

```text
Admitted ValidationCycle
  -> ExperimentPlanLight
  -> admitted ResearchWorkOrder
  -> T-104 fake/local submit/sync/collect
  -> trusted RunEvidenceUnit
  -> ResultInterpretationPacket
  -> ClaimCandidate / ImplementationDossier gate
  -> validation completion or feedback candidate
  -> explicit adjusted next-step planning
```

Minimum linked-loop assertions:
- `sync` is non-final and cannot create trusted `RunEvidenceUnit`.
- `collect` or final monitor intake must use a target-specific `run_evidence_unit` trace.
- failed, negative, or inconclusive evidence is retained and feeds review/feedback, not silently dropped;
- feedback dispatch uses `downstream_source_kind = "paper_implementation"`;
- the adjusted next step is explicit: create a follow-up validation cycle/work order candidate or dispatch upstream feedback;
- no step overwrites motive, validation, WorkOrder, claim, dossier, or topic-selection authority implicitly.

## Human Confirmation Points
| Flow area | Confirmation condition |
|---|---|
| Validation planning | `expected_information_gain = none`, expensive plans, or scope-broadening cycles require explicit confirmation/override. |
| Motive portfolio | Primary replacement, merge/split, abandonment, or broadened active portfolio requires portfolio decision confirmation. |
| WorkOrder | Admission confirms the plan is work-order-ready; execution still happens through WorkOrder/adapter boundaries. |
| Claim/dossier | High-risk or boundary-sensitive claims must stay within claim trace and dossier readiness gates. |
| Decision queue | AI, trace repair, feedback, and portfolio commands remain backend decisions, not client-local confirmations. |

## Intentional Stops
| Stop | Reason |
|---|---|
| Writing stops at `WritingEntryPacket` projection | Writing-module ingestion, paragraph placement, citation insertion, and document mutation are future explicit work. |
| T-105 stops at deterministic fake provider and live-provider preflight | Live provider execution is not implemented in T-105 or T-109. |
| Real cloud experiment execution is optional/manual evidence | T-109 default closure must remain deterministic and credential-free. |
| UI proof is route/static boundary proof | Backend flow closure comes before UI adaptation or browser E2E. |
| Local Postgres lane is optional by default | Upgrade only if queryability/idempotency/recovery parity cannot be trusted otherwise. |

## Evidence Package Mapping
| Artifact | Source |
|---|---|
| `flow-steps.json` | Steps 1-20 with route, status, key refs, and gate outcome. |
| `linked-loop-report.json` | Steps 7-19 with evidence/result/feedback/adjustment summary. |
| `blocked-path-report.json` | P0/P1/P2 coverage from `07-fixture-and-blocked-path-inventory.md`. |
| `writing-packet-summary.json` | Step 18 projection refs and readiness summary only. |
| `ui-boundary-report.json` | T-100 read-model/command/static boundary checks. |
| `residual-risks.md` | P1/P2 gaps and owners. |
| `operator-checklist.md` | How to run default, optional, skipped, and manual lanes. |
