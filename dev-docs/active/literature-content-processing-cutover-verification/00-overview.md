# 00 Overview

## Status
- State: done
- Parent: `T-030 literature-content-processing-landing-roadmap`
- Next step: none; collection -> explicit processing -> retrieval cutover has passed verification.

## Goal
- Directly replace the old placeholder implementation and verify there is no semantic dual-track left behind.

## Non-goals
- Do not implement the pipeline features directly in this task.
- Do not keep compatibility shims unless explicitly approved for a short migration window.

## Scope
- Old implementation removal.
- Search checks for semantic drift.
- End-to-end verification matrix.
- OpenAPI/API index checks.
- Desktop build/typecheck.
- Final handoff and archival criteria for parent/child tasks.

## Acceptance Criteria
- [x] Old placeholder paths are removed or explicitly dev/test-only.
- [x] No old stage order or hidden dual run path remains.
- [x] End-to-end collection -> explicit processing -> retrieval passes.
- [x] Verification commands and evidence are recorded.
