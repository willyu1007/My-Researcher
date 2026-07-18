# 03 Implementation Notes

## 2026-05-20 - Task Package Created
- Created `T-098` for result interpretation, claim boundary, dossier readiness, and writing-entry projection.
- Depends on T-096 run evidence and T-097 trace kernel.
- No product code changes were made.

## Open Notes
- Keep dossier authority in `PaperImplementation`; downstream writing consumes projections only.

## 2026-05-21 - Backend Minimum Closure
- Added shared result/claim/dossier contracts and schema tests.
- Added Prisma persistence, migration, repository interface, in-memory repository, and Prisma repository for T-098 objects.
- Added `PaperImplementationResultClaimDossierService` with gates for failed/inconclusive run accounting, memo-as-evidence blocking, forbidden overclaim blocking, strong-claim human confirmation, ready dossier claim-trace completeness, and non-ready writing projection blocking.
- D-16 supersession (2026-07-12): the preceding gate description remains accurate historical implementation evidence. The productized target replaces failed-like REU/project scans with declared immutable closed-Cycle snapshot/hash accounting; failed/cancelled/incomplete creates zero REU and valid negative/inconclusive remains a separate scientific disposition.
- Added REST route/controller wiring and extended paper-implementation integration coverage from T-096 run evidence into T-098 result packet, claim candidate, ready dossier, and writing packet creation.
- Feedback events are delegated to T-093 `recordFeedbackEvent` with `paper_implementation` downstream source behavior preserved by the T-093 service.
- No `research-argument` authority path was introduced.

## 2026-05-21 - Review Fixes
- Renamed the PaperImplementation writing projection contract surface to `PaperImplementationWritingEntryPacket` and `paperImplementationWritingEntryPacketSchema`; aggregate shared exports expose legacy research-argument packet schema only as `researchArgumentWritingEntryPacketSchema`.
- Tightened result interpretation gates to require trusted `RunEvidenceUnit` inputs, required validation report refs when run evidence has validation reports, and metric refs for successful run evidence.
- Tightened claim support gates from memo-only rejection to a positive evidence allowlist: run evidence, citation candidates, and citable literature/source evidence.
- Tightened ready dossier gates so unresolved `blocker_refs` block readiness and every included `ClaimCandidate` must be explicitly admitted or rejected.

## Owner Decisions
- Result/claim/dossier authority writer: `PaperImplementationResultClaimDossierService`.
- Trace authority remains T-097; T-098 validates and references trace manifests/claim trace packets but does not redefine trace semantics.
- Experiment/run authority remains T-096/EF; under D-16, productized T-098 consumes eligible `RunEvidenceUnit` plus explicit watermark-bound current-effective closed-Cycle snapshot refs/hashes and never raw platform/Sidecar/project-wide/history REU scope.

## 2026-07-12 - D-17 Semantic Adoption (docs-only; not implemented)
- Recorded T-132 D-17 as the product target: Result Analysis creates one exact-hash proposal, the existing ValidationCycle closure alone assigns the scientific disposition/selected exit, and T-098 creates derivative packets only from that exact closed Cycle.
- The landed direct result-analysis packet materializer and mixed failed/inconclusive run-ref semantics remain accurate historical implementation facts but cannot satisfy product acceptance. They must be removed in the joint D-16/D-17 atomic migration without fallback.
- No contracts, services, repositories, Prisma schema, routes or tests changed in this documentation update.
- Writing lane receives only `PaperImplementationWritingEntryPacket` projections from ready dossiers.

## 2026-07-13 - Current-effective closure-scope convergence (docs-only; not implemented)
- Refined the productized T-098 input to the exact `closure_watermark` current-effective branch-head snapshot rather than full Cycle/project history. Non-head Runs remain immutable/queryable and are excluded from dossier readiness by default.
- A closed current revision may carry explicit `comparison_input_ref` lineage without promoting an old Run into execution-accounting scope. Missing-head blockers and Cycle/branch/head CAS drift fail closed; readers never select a newer head or reconstruct a different snapshot.
- Historical T-098 implementation evidence remains unchanged; no contract, code, schema, database or runtime behavior was modified.
