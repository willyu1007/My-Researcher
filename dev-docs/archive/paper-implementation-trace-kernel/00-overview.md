# T-097 Paper Implementation Trace Kernel

## Status
- State: done
- Parent task: `T-091 paper-implementation-full-landing`
- Mapping: `M-001 > F-001 > R-013`
- Flow node: trace kernel and trace repair
- Next step: T-094/T-095/T-096/T-098 consume trace refs and gate semantics without redefining trace authority.

## Goal
- Implement `TraceManifest`, `CitationCandidate`, `ClaimTracePacket` trace prerequisites, and `MemoAsEvidenceGuard`.
- Define natural-language field roles so semantic contracts, interpretations, rationale memos, display summaries, operational instructions, and human judgments cannot be confused.
- Provide trace completeness checks and trace repair queue behavior.
- Ensure writing-affecting objects cannot become writing-ready without trace.

## Non-goals
- Do not create claim readiness by trace alone.
- Do not make internal interpretation citable.
- Do not defer trace to the writing stage.

## Acceptance Criteria
- [x] Trace lineages are separated into literature, experiment, artifact, decision, and internal interpretation.
- [x] Citation candidates require citable evidence and source locators.
- [x] Natural-language fields have explicit roles, and only allowed roles can feed downstream workflows or gates.
- [x] Memo/rationale/summary/result interpretation cannot become evidence authority.
- [x] Trace refs are queryable for gate, queue, dossier, and evaluation checks.
- [x] Flow-node children have trace integration requirements.

## Closure
- Landed shared trace contracts, Prisma tables/migration, memory and Prisma repositories, trace kernel service, REST routes, route tests, service tests, and Prisma repository mapping tests.
- Closed quality-review fixes for required-lineage completeness, citation source/target queryability, field-role uniqueness, empty claim packets, and human-judgment lineage ownership.
- T-097 is backend-only. Trace repair UI remains T-100, and motive/validation/work-order/result/dossier authority remains T-094/T-095/T-096/T-098.
- Retired pre-writing control-plane artifacts are historical only and are not part of PaperImplementation trace authority.
