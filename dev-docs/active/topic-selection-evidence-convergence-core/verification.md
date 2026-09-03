# Verification

## Evidence

| Claim / reference | Check / procedure | Latest result | Evidence / limitation |
|---|---|---|---|
| Full managed-library retrieval already exists | Inspect `LiteratureRetrieveRequest`, its route schema, and `LiteratureRetrievalService.resolveCandidateVersions` | observed | `query` is the only required request field. Without `topic_id` or `paper_id`, the service lists all active embedding versions and keeps evidence-ready records; rebuilding the retriever is not part of this task. |
| Snapshot-bound evidence admission is distinct from retrieval scope | Inspect SearchPlan creation, SearchRun authority blockers, and EvidenceMap allowed-ref validation | observed | SearchPlans require a literature snapshot; SearchRun bindings outside it are blocked; EvidenceMap accepts only SearchRun input/binding refs. The pilot must onboard new hits without weakening provenance. |
| The research-question candidate stage freezes evidence lineage | Inspect the downstream input bundle, intake snapshot, current-EvidenceMap guard, and evidence-expansion route | observed | The bundle freezes `evidence_map_ref`, SearchRun, SearchPlan, and literature snapshot. Evidence expansion returns to intake with no successor-map handoff, so this stage cannot host an in-place evidence refresh without reopening upstream lineage and Human decisions. |
| Evidence-landscape convergence owns the natural pilot loop | Inspect search recheck, child SearchPlan, SearchRun, EvidenceMap materialization, checkpoint creation, and checkpoint loopback | observed | These canonical owners already compose the search and evidence lineage before the downstream frozen handoff. The pilot can add role-issued requests and successor links without changing downstream question authority. |
| Arena is a partial reusable pilot | Inspect `TopicSelectionResearchArenaRetrievalService.prepare` and SearchRun recording | observed | Non-local Arena mode invokes the unscoped retriever and records a SearchRun, but outside-map hits remain unresolved and the service is Arena-specific. Reuse boundaries still require Phase 1 discovery. |
| Debate cannot currently request evidence | Search production and shared contracts for RetrievalRequest and inspect Debate role outputs | observed | RetrievalRequest exists only in T-148 planning text; current role contracts consume frozen context and cannot trigger retrieval. |
| Current Debate core is one frozen role walk | Inspect `TopicSelectionBoundedDebateCoreService.runLoop` and need-discovery `round_index` validation | observed | The core hashes one fixed role-order transcript. `max_rounds` limits an index but supplies no parent-transcript or evidence-delta link. |
| EvidenceMap lacks successor lifecycle | Inspect shared EvidenceMap record, Prisma model, freshness update route, and repository update | observed | No predecessor/successor field exists. Freshness/superseded can be written directly without binding a successor transition. Mutable lifecycle metadata is not itself the defect; missing enforceable successor lineage is. |
| T-148 scope split | Compare T-148 findings, `dde23f76`, and the approved split with this bundle | passed for the exchanged contract | FIND-029 through FIND-031 supply discovery evidence; T-148 retains presentation and strict-Human acceptance while `REQUIRED_COVERAGE_MISSING` with exact row refs is now available for this pilot. T-150 remains limited to evidence-landscape convergence. |
| ECK-01 through ECK-08 | Execute the focused contract, service, failure, replay, concurrency, and real-flow checks identified by the revised plan | Phase 1 authorized; not-run | The approved implementation boundary ends after the Phase 1 contract/repository checkpoint. Phase 2 execution and ECK-06 end-to-end proof require a later authorization. |

## Source-to-acceptance traceability

| Source | Observed problem or accepted adjustment | T-150 response | Acceptance refs |
|---|---|---|---|
| T-148 FIND-029 | The real run used a topic-scoped frozen snapshot even though the retriever already supports the full managed library; relevant outside-snapshot hits have no provenance-preserving admission path. | Keep the broad managed library as retrieval fuel, bind each execution to a canonical corpus manifest and retrieval-stack identity, admit material claim-level evidence through durable SearchRun lineage, and publish a successor result rather than weakening snapshot provenance. | ECK-01, ECK-05, ECK-06 |
| T-148 FIND-030 | Recorded Debates performed zero retriever operations, and role contracts cannot request evidence after identifying a literature gap. | Add typed, durable, reusable RetrievalRequests; measure evidence delta; continue material changes as linked frozen Debate rounds. | ECK-02, ECK-03, ECK-04, ECK-06, ECK-08 |
| T-148 FIND-031 | Gate failures, Debate findings, and loopbacks are separate mechanisms, so an issue may have no owned repair delta or same-gate return route. | Add one typed ResolutionRoute for the pilot and prove issue → repair → declared delta → same-gate recheck without creating a second decision authority. | ECK-06, ECK-07, ECK-08 |
| Accepted process adjustment | EvidenceMap is a selected, replayable result; the managed literature library is the process fuel. | Keep retrieval process state in RetrievalRequest/SearchRun/round artifacts and preserve EvidenceMap history through explicit successor lineage. | ECK-01, ECK-02, ECK-05 |
| Accepted process adjustment | Debate retrieval must not stop at a fixed request count, while repeated work still needs a convergence boundary. | Let the coordinator derive request/strategy identity, reuse equivalent requests, saturate only an unchanged issue/strategy with no material delta, and enforce explicit step/round, time, and cost boundaries as unresolved stops rather than pass conditions. | ECK-02, ECK-03, ECK-08 |

FIND-029 through FIND-031 are reproduced defects. RetrievalRequest, linked rounds, successor lineage, strategy-level saturation, and ResolutionRoute are approved design responses; they are not independently claimed as pre-existing failures. Completion means the single evidence-landscape pilot closes the mapped behavior end to end. Adoption by downstream question, value, or promotion Debate scenarios requires separately accepted follow-up work.

## Outstanding verification

- Confirm whether the Arena retrieval/provenance implementation can be extracted without importing Arena-specific snapshot or participant semantics.
- Inventory the exact SearchPlan/SearchRun change needed to admit full-library hits while preserving a canonical corpus manifest and retrieval-stack identity.
- Select concrete defaults and configuration ownership for per-issue orchestration steps/rounds, elapsed time, and accumulated retrieval cost.
- Verify the Phase 2 seam against T-148's typed required-coverage issue without importing T-148 presentation or downstream Debate policy.
- Define the transactional EvidenceMap successor/head invariant and its in-memory/Prisma test seam.
- Verify that downstream evidence changes create visible obligations without mutating existing Human decisions.
