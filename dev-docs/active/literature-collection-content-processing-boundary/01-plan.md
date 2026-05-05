# 01 Plan

## Phase A - Contracts and routes
- Rename shared DTOs and overview fields to collection/content-processing naming.
- Rename REST routes and OpenAPI contract paths.

## Phase B - Backend behavior
- Remove automatic content-processing run enqueue from collection import and metadata patch flows.
- Keep explicit content-processing runs as the only normal processing trigger.

## Phase C - Desktop integration
- Update manual import, Zotero import, seed injection, overview actions, and normalizers.
- Update visible wording from pipeline to content-processing where user-facing.

## Phase D - Verification
- Run backend tests and typecheck.
- Run shared checks.
- Run desktop typecheck/build where available.
- Regenerate API index/context if contract files change.
