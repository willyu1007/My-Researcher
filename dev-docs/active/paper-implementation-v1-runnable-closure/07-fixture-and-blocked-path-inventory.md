# Fixture And Blocked Path Inventory

> D-16 supersession (2026-07-12): `LL-FAILED-RUN-001` below remains historical V1 fixture evidence. The current replacement fixture must use exact failed Run/Attempt refs in an immutable closed-Cycle snapshot/hash, create zero failed REU, and source any valid negative/inconclusive scientific result from a complete validation-passed REU. Both fixture shapes must not remain alternative product passes.

## Fixture Naming
Use deterministic IDs so route replay can be re-run without hidden state:

```text
implementation_project_v1_run_001
core_motive_v1_run_001
validation_cycle_v1_run_001
experiment_plan_light_v1_run_001
research_work_order_v1_run_001
run_evidence_unit_v1_run_001
result_interpretation_packet_v1_run_001
claim_candidate_v1_run_001
implementation_dossier_v1_run_001
writing_entry_packet_v1_run_001
```

Use refs from existing contract helpers:
- `topicSelectionFunctionalRef` style refs for PaperImplementation objects;
- experiment-foundation refs for T-104 external job/source records;
- no `research-argument` refs as authority fixtures.

## Happy Path Fixture
| Fixture | Purpose | Required objects | Expected result |
|---|---|---|---|
| `HP-ROUTE-001` | Canonical route-level replay from active handoff to writing packet projection | Active bridge handoff, motive draft/admission, evidence board, validation cycle, experiment plan light, WorkOrder, trusted run evidence, result packet, claim trace, claim, dossier, writing packet | `WritingEntryPacket.packet_status = current`, dossier ready, no direct authority bypass. |

Minimum assertions:
- bootstrap is created from active bridge/hash and can be fetched by project id and bridge id;
- every writing-affecting object has a complete `TraceManifest`;
- WorkOrder is admitted before execution seam;
- final run evidence has target-specific `run_evidence_unit` trace;
- claim is `supported`, not `support_pending_trace`;
- dossier is `ready_for_writing`;
- writing output is projection-only.

## Linked-Loop Fixture
| Fixture | Purpose | Required objects | Expected result |
|---|---|---|---|
| `LL-FAILED-RUN-001` | Historical proof that failed/inconclusive experiment-facing information returns into planning/review/feedback; superseded input shape under D-16 | Admitted validation cycle, admitted WorkOrder, fake/local external job, exact failed Run/Attempt closure entry, zero failed REU, optional complete valid inconclusive REU, feedback/review source refs | Validation completion freezes exact accounting and feedback creates explicit next-step planning signal; no upstream authority mutation or execution/evidence conflation. |
| `LL-FOLLOWUP-PLAN-001` | Prove continued progression after feedback/review | Review/feedback output from `LL-FAILED-RUN-001`, adjusted validation question or follow-up work-order candidate | Follow-up planning object is explicit and traceable; no implicit overwrite of previous validation/work order. |

The first implementation may close the linked loop with a validation review item plus dispatched upstream feedback if a follow-up cycle fixture is too costly. If so, `LL-FOLLOWUP-PLAN-001` must remain as a named follow-up fixture, not disappear from the inventory.

## Adjacent Lane Fixtures
| Fixture | Lane | Required behavior |
|---|---|---|
| `ADJ-T104-FAKE-001` | Live experiment adapter seam | Submit/sync/collect uses fake/local external job semantics; sync is non-final; collect records trusted evidence through the existing run-monitor authority path. |
| `ADJ-T104-IDEMPOTENT-001` | Live experiment adapter finalization | Repeated collect/cancel finalization returns already-recorded/idempotent behavior and does not duplicate trusted run evidence. |
| `ADJ-T105-PREFLIGHT-001` | Provider variance preflight | `deterministic_fake` runs through harness; enabled `live_provider_preflight` reports blocked/skipped and performs no live provider call. |
| `ADJ-T100-STATIC-001` | Desktop workbench boundary | UI code uses backend read-model/command routes only and does not synthesize readiness locally. |

## P0 Blocked Paths
P0 coverage is required for T-109 closure.

| ID | Fixture | Route / source | Expected result | Evidence owner |
|---|---|---|---|---|
| BP0-01 | `BP0-HASH-DRIFT-001` | `POST /paper-implementation/projects/bootstrap` with same bridge and changed hash | `409 VERSION_CONFLICT`; admitted implementation state unchanged | T-109 replay, existing T-093 route coverage reference allowed |
| BP0-02 | `BP0-MISSING-TRACE-001` | Motive/validation/result/claim/dossier object with missing or broken trace | Readiness/admission blocks and repair/review signal is visible | T-109 replay |
| BP0-03 | `BP0-MEMO-AS-EVIDENCE-001` | citation/evidence/field-role misuse | `409 GATE_CONSTRAINT_FAILED`; memo/summary/rationale cannot satisfy evidence/citation | T-109 replay or T-097/T-098 test reference |
| BP0-04 | `BP0-ORPHAN-MONITOR-001` | orphan monitor callback or external job not belonging to WorkOrder | Untrusted monitor or pre-side-effect block; no trusted run evidence | T-109 linked-loop replay |
| BP0-05 | `BP0-RUN-EVIDENCE-TRACE-001` | final monitor intake or collect without target-specific run evidence trace | `409 GATE_CONSTRAINT_FAILED`; no final trusted evidence | T-109 linked-loop replay |
| BP0-06 | `BP0-CLAIM-PENDING-TRACE-001` | claim candidate without claim trace | `claim_status = support_pending_trace`; ready dossier rejects it | T-109 replay or T-098 test reference |
| BP0-07 | `BP0-OVERCLAIM-001` | unsupported/overclaim claim candidate or dossier | claim/dossier/writing packet readiness blocks | T-109 replay or T-102/T-098 test reference |
| BP0-08 | `BP0-AI-DIRECT-MUTATION-001` | AI harness run with direct authority mutation refs | Harness blocks and emits queue/quality signal | T-109 adjacent lane or T-099/T-101 test reference |
| BP0-09 | `BP0-PROVIDER-LIVE-CONFUSION-001` | T-105 live preflight profile with `live_provider_enabled = true` | preflight result is blocked/skipped; no live provider execution | T-109 adjacent lane or T-105 test reference |
| BP0-10 | `BP0-RESEARCH-ARGUMENT-AUTHORITY-001` | fixture or replay tries to use retired control-plane authority refs | replay rejects/excludes them as authority input; only archived docs and negative guards may mention them | T-109 static/replay check |

## P1 Blocked Paths
P1 paths should be covered where cheap or already covered. Otherwise assign an owner in `residual-risks.md`.

| ID | Fixture | Handling |
|---|---|---|
| BP1-01 | `BP1-DUPLICATE-BOOTSTRAP-001` | Prefer direct replay assertion; existing T-093 route test can satisfy if referenced in evidence package. |
| BP1-02 | `BP1-SAME-BRIDGE-DIFFERENT-HASH-001` | Prefer direct replay assertion; overlaps BP0-01. |
| BP1-03 | `BP1-REPEATED-FINALIZATION-001` | Prefer T-104 seam assertion for collect/cancel idempotency. |
| BP1-04 | `BP1-NO-INFORMATION-GAIN-001` | Existing T-095 test reference acceptable unless route replay naturally includes it. |
| BP1-05 | `BP1-PORTFOLIO-VIOLATION-001` | Include only if fixture setup stays small; otherwise assign T-094/T-095 owner. |
| BP1-06 | `BP1-FAILED-RUN-DISAPPEARS-001` | Should be covered by `LL-FAILED-RUN-001` if implementation follows R3. |

## P2 Residual Risks
P2 paths are not default closure blockers unless T-109 discovers a concrete defect.

| ID | Risk | Default owner / action |
|---|---|---|
| BP2-01 | Local Postgres transaction/repository parity | Optional local DB lane; upgrade only if queryability/idempotency/recovery defects appear. |
| BP2-02 | UI stale state race | Future UI/browser task unless route/static proof finds drift. |
| BP2-03 | True cloud job partial failure | T-106 or future real external canary task. |
| BP2-04 | Live provider output instability | Future live provider execution task; T-105 remains preflight. |
| BP2-05 | Writing module ingestion mismatch | Future writing integration task; T-109 stops at projection. |

## Existing Coverage References
These tests may be referenced in the T-109 evidence package when they directly cover the same blocked-path contract:

| Coverage area | Existing file |
|---|---|
| Route-level PaperImplementation happy path through writing packet and feedback dispatch | `apps/backend/src/routes/paper-implementation-routes.integration.test.ts` |
| Contract/replay/adversarial/queryability suite | `apps/backend/src/services/paper-implementation-contract-evaluation-suite.unit.test.ts` |
| T-104 live adapter ownership, finalization, and idempotency | `apps/backend/src/services/paper-implementation-live-experiment-adapter-service.unit.test.ts` |
| T-102/T-098 claim readiness and overclaim hardening | `apps/backend/src/services/paper-implementation-result-claim-dossier-service.unit.test.ts` |
| T-097 trace/citation/memo role gates | `apps/backend/src/services/paper-implementation-trace-kernel-service.unit.test.ts` |
| T-099 AI proposal-only and direct mutation blocking | `apps/backend/src/services/paper-implementation-ai-workflow-harness-service.unit.test.ts` |
| T-105 provider variance deterministic/preflight behavior | `apps/backend/src/services/paper-implementation-provider-variance-evaluation-service.unit.test.ts` |

## Phase 2 Implementation Notes
- Prefer one route-level integration test or replay helper that can emit redacted artifacts.
- Reuse deterministic payload builders from existing route integration tests where possible.
- Do not import Prisma in domain/service helpers.
- Do not create `.ai/.tmp` artifacts during unit tests unless the replay entrypoint is explicitly run.
- Do not commit generated `.ai/.tmp` artifacts by default.
