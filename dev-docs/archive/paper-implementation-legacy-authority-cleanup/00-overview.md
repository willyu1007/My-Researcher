# T-113 Paper Implementation Legacy Authority Cleanup

## Status
- State: done
- Task ID: `T-113`
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-013`
- Current focus: completed removal of `research-argument` public/runtime/persistence/context surfaces so PaperImplementation remains the only forward pre-writing implementation authority.

## Problem
- PaperImplementation V1 is closed, but `research-argument` still exists as active code, shared contracts, Prisma models, context glossary entries, and active task docs.
- Keeping those surfaces creates a practical dual-track risk: future work can accidentally import, revive, or route writing-readiness semantics through `research-argument` instead of `PaperImplementation`.

## Goal
- Decommission the legacy `research-argument` authority surface from current code and LLM-readable context.
- Preserve historical task/docs as archive material only.
- Keep `PaperImplementationWritingEntryPacket` as the only current writing-entry projection contract.

## Non-goals
- Do not change PaperImplementation authority semantics or add new PaperImplementation objects.
- Do not implement writing-module ingestion.
- Do not apply destructive DB writes to a live database in this task turn.
- Do not delete historical archived docs unless needed for current context correctness.
- Do not remove unrelated legacy UI/CSS or topic-selection wrappers.

## Acceptance Criteria
- [x] Shared package no longer exports `research-argument` contracts or `researchArgumentWritingEntryPacketSchema`.
- [x] Backend no longer contains current `research-argument` service/repository/runtime code or tests.
- [x] Prisma SSOT no longer defines `ResearchArgument*` models; migration SQL documents the drop path without applying it to a live DB.
- [x] `docs/context/db/schema.json` and current glossary/architecture context no longer present `research-argument` as a current bounded context.
- [x] Active project governance no longer shows legacy `research-argument` work as active forward work.
- [x] PaperImplementation targeted tests/typecheck/replay still pass, proving no fallback to legacy authority.
