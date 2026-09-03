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
| Managed-library manifest and exact candidate universe (ECK-01) | Compare unscoped retrieval and manifest eligibility through the same resolver; create a manifest without a title basket | passed | Focused retrieval/search-resource tests prove evidence readiness, active-profile compatibility, current-index filtering, sorted version membership, and retrieval-stack identity. Existing non-pilot snapshot defaults remain unchanged. |
| Coordinator request identity and SearchRun lineage (ECK-02) | Canonicalize equivalent inputs, reject role-authored keys/empty strategy, reuse the durable recheck request, materialize a revised plan and follow-up SearchRun | passed | In-memory service tests and the gated Prisma unique-key race prove replay. Phase 2 still owns automatic execution and result interpretation. |
| Saturation and execution boundaries (ECK-03) | Exercise no-delta unchanged strategy and each named standing-policy boundary in pure contract tests | passed for Phase 1 | The only terminal results are `saturated_unresolved` and `boundary_exhausted_unresolved`; neither exposes a pass result. Runtime accounting belongs to Phase 2. |
| Linked frozen rounds (ECK-04) | Validate a closed round-link schema and reject a link missing the parent transcript or EvidenceDelta hash | passed for Phase 1 | The contract is frozen; Phase 2 still owns creating the successor Arena session and distributing its frozen input. |
| EvidenceMap successor compare-and-swap (ECK-05) | Race a stale successor writer against the advanced head in memory and on disposable PostgreSQL | passed | The Prisma transition updates the predecessor and creates the successor plus child records in one transaction; the losing writer creates no orphan map. |
| Typed immutable resolution support (ECK-07) | Persist and replay content-addressed EvidenceDelta and ResolutionRoute artifacts | passed for Phase 1 | Stable keys and checksums deduplicate identical artifacts; the route declares evidence-landscape ownership and deterministic-gate/strict-Human authority. Route execution remains Phase 2. |
| ECK-06 and ECK-08 | Run the complete pilot and later real-flow/failure proof | not run — outside authorization | Phase 2 and Phase 3 require a new authorization. No result in this checkpoint claims end-to-end convergence. |

## Phase 1 verification run — 2026-09-03

- Shared contract suite: 449 passed.
- Focused backend retrieval, search-resource, control-plane, EvidenceMap, and Arena retrieval suites: 63 passed.
- Gated disposable-PostgreSQL successor/request race suite: 1 passed; the disposable database was deleted afterward.
- Shared and backend TypeScript checks: passed.
- Prisma validate/generate, disposable-schema drift check, DB context constraint check, and `git diff --check`: passed.
- Repository build was not run because the project instructions reserve build commands for explicit requests.

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

- Implement and verify the Phase 2 coordinator without importing Arena-specific participant authority or downstream question/value/promotion semantics.
- Admit retrieved hits through claim-level evidence review before publishing a successor map, then create the linked Arena round and fresh instance of the same checkpoint.
- Account for orchestration steps, linked rounds, elapsed time, and accumulated retrieval cost at runtime and prove boundary exhaustion remains unresolved.
- Verify the Phase 2 seam against T-148's typed required-coverage issue without importing T-148 presentation or downstream Debate policy.
- Verify that downstream evidence changes create visible obligations without mutating existing Human decisions.
- Complete ECK-06 and ECK-08 with one bounded local pilot and Human-reviewed real-flow packet after separate authorization.
