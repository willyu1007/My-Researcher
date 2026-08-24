# 02 Architecture

## Contract Boundary
| Item | Contract |
|---|---|
| Input objects | writing-affecting objects from intake, motive, validation, work orders, results, claims, dossiers |
| Output objects | `TraceManifest`, `CitationCandidate`, `ClaimTracePacket`, natural-language field role registry, trace repair queue items, trace gate results |
| Authority writer | `PaperImplementationTraceKernelService` through memory/Prisma trace repositories |
| Gates | trace completeness, citation readiness, memo-as-evidence guard, natural-language role gate |
| Trace | trace object is self-describing and references source lineages |
| Handoff | T-098 consumes trace-complete result/claim inputs; T-100 displays trace repair tasks |

## Contract Review
- `TraceManifest` is mandatory for writing-affecting objects.
- `CitationCandidate` only comes from literature evidence with `SourceLocator`.
- `CitationCandidate` uses `source_evidence_unit_ref` as the single evidence-unit authority for both `LiteratureEvidenceUnit + SourceLocator` and `CitableSourceEvidenceUnit + SourceLocator`.
- A citation candidate must link back to the same target as its `TraceManifest.target_ref`; the primary linked target is columnized for downstream queries.
- Internal interpretation lineage remains non-citable.
- `human_judgment` is not internal interpretation lineage; it remains a field role / decision-lineage concept and cannot directly feed hard gates or citations.
- `rationale_memo` and `display_summary` cannot feed hard gates; `semantic_contract` and `human_judgment` must remain distinguishable.
- `trace_manifest_ref` and claim trace refs must be queryable by downstream gates and tests.

## Implemented Surface
| Layer | Files |
|---|---|
| Shared contracts | `packages/shared/src/research-lifecycle/paper-implementation-trace-contracts.ts` |
| Persistence | `prisma/schema.prisma`, `prisma/migrations/20260520130000_add_paper_implementation_trace_kernel/` |
| Repository | `apps/backend/src/repositories/paper-implementation-trace.repository.ts`, memory and Prisma implementations |
| Service | `apps/backend/src/services/paper-implementation-trace-kernel-service.ts` |
| REST | `apps/backend/src/controllers/paper-implementation-controller.ts`, `apps/backend/src/routes/paper-implementation-routes.ts` |

## Queryability
- Columnized fields include `implementationProjectId`, `traceManifestId`, `targetRefType`, `targetRefId`, `targetVersionId`, `traceStatus`, `sourceEvidenceUnitRefType/sourceEvidenceUnitId`, `sourceLocatorId`, primary `linkedTargetRefType/linkedTargetRefId`, `citationCandidateId`, `claimTracePacketId`, `claimRefType`, `claimRefId`, lineage counts, field owner/role booleans, and repair queue `status/severity/blockerCode`.
- Lineage detail arrays remain JSON payloads, but all gate, queue, dossier, and evaluation lookup fields are queryable outside JSON.
- Repair queue resolution records status/resolution metadata and does not rewrite immutable trace manifests.
