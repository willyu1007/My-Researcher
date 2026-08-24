# 03 Implementation Notes

## 2026-05-20 - Task Package Created
- Created `T-097` for trace kernel and trace repair.
- It is cross-cutting and must be wired into all flow-node children.
- No product code changes were made.

## 2026-05-20 - Implementation Started
- Scope locked to backend minimum closure: shared contracts, Prisma persistence, repository/service, REST routes, tests, and governance docs.
- UI remains T-100; motive/validation/work-order/result/dossier business objects remain owned by T-094/T-095/T-096/T-098.

## 2026-05-20 - Implementation Closed
- Added `paper-implementation-trace-contracts` with `TraceManifest`, `CitationCandidate`, `ClaimTracePacket`, natural-language field role records, trace gate results, and trace repair queue contracts.
- Added trace kernel Prisma tables and migration with columnized lookup fields for target refs, source locators, claim refs, field roles, trace status, counts, and queue blockers.
- Added memory and Prisma trace repositories. Business/service code depends on repository interfaces, not Prisma types.
- Added `PaperImplementationTraceKernelService` with project existence validation, immutable trace manifest creation, computed trace status/counts, repair queue creation, citation source/locator gates, claim trace memo-only guard, field role policy enforcement, trace gate evaluation, queue listing, and queue resolution.
- Extended PaperImplementation REST routes under `/paper-implementation/projects/:implementation_project_id/...`.
- Confirmed no `research-argument` authority is introduced into trace contracts, service, routes, repositories, or tests.

## 2026-05-21 - Quality Review Fixes Closed
- Removed `human_judgment_refs` from `TraceManifest`/shared `TraceLineageBundle.internal_interpretation`; human judgment remains a natural-language role and decision lineage concept through `decision.human_decision_refs`.
- Added required-lineage checks for known writing-affecting target refs. Empty lineage for a known target now produces `trace_status=broken` and an open `missing_required_lineage` repair queue item instead of passing as complete.
- Generalized `CitationCandidate` source evidence to a single `source_evidence_unit_ref` authority. `citable_source_evidence_unit + SourceLocator` is supported without a parallel literature-specific id.
- Enforced citation linked-target consistency against the referenced `TraceManifest.target_ref` and columnized primary linked target fields for downstream dossier/gate queries.
- Blocked empty `ClaimTracePacket` support lineage; decision/internal notes cannot act as sole claim support.
- Added duplicate/conflicting natural-language field role protection by owner ref, field name, and policy version, with DB query columns and a unique identity key.
- Added regression tests for all review findings plus source/target query indexes in the trace migration.
- Fixed the DB context Prisma parser so `@default("{}")` / `@default("[]")` JSON defaults do not truncate model parsing; regenerated context now exposes the T-097 queryable fields and indexes.

## 2026-05-21 - Deep Cleanup
- Removed the obsolete optional `literature_evidence_unit_id` compatibility field from shared contracts, service mapping, Prisma schema, migration SQL, repository tests, route tests, and service tests.
- `CitationCandidate.source_evidence_unit_ref` is now the only evidence-unit identity surface. Literature-derived evidence and citable source evidence both use that ref plus `source_locator_id`.
- No PaperImplementation test artifacts were found under `.ai/.tmp`; existing matches are older env/topic-selection artifacts and were left untouched.

## Handoff Notes
- T-094/T-095/T-096/T-098 should attach their writing-affecting objects to `TraceManifest` using `target_ref`.
- T-098 should consume `ClaimTracePacket` and `CitationCandidate` rather than redefining claim/citation trace fields.
- T-100 can consume repair queue list/resolve endpoints; resolving queue items does not mutate immutable trace manifest status.
- T-101 can evaluate trace contracts through shared schemas, service tests, route tests, and queryable DB context fields.
