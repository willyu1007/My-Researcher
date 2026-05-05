# 00 Overview

## Status
- State: planned
- Parent: `T-030 literature-content-processing-landing-roadmap`
- Next step: detail retrieve API/profile contract and overview/workbench trigger UX.

## Goal
- Implement scenario-based retrieval profiles and explicit content-processing trigger/stale UX.

## Non-goals
- Do not implement batch backfill operations in this task.
- Do not build separate physical indexes for each product scenario.
- Do not auto-enqueue processing from stale propagation.

## Scope
- Retrieve API request/response contract with profile.
- Query-time embedding via active profile.
- Hybrid retrieval and provenance return.
- `STALE` propagation and action availability.
- Literature overview lightweight actions.
- Detail panel/workbench entry for complex controls.

## Acceptance Criteria
- Retrieve supports `general`, `topic_exploration`, `paper_management`, and `writing_evidence`.
- Stale state is visible and actionable.
- Overview can trigger single-literature processing without auto-runs.
- Retrieval warns when active index is stale.
