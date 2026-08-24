# 02 Architecture

## UI Ownership
- The workbench is a presentation and workflow surface.
- Domain rules live in shared contracts and backend services.
- UI must not become a hidden owner of experiment semantics.

## Primary Views
- Asset registry: datasets, baselines, benchmarks, protocols, models.
- Candidate review: needs_info, manual review, promotion, rejection.
- Readiness: blockers, locks, protocol compatibility.
- Recipes: draft, lock, materialization request.
- Jobs/results: T-077 external job state, submit/sync/cancel/collect actions, stage events, partial refs, logs/artifacts, validation, and evidence candidates.
- Evidence/sidecar: evidence candidate and paper binding refs.

## Backend Ownership Inputs
- T-076 owns registry/readiness persistence and APIs.
- T-077 owns external job runtime state, execution adapter behavior, result collection, validation, and evidence candidate creation.
- The desktop workbench may show guarded actions and status, but it must call backend APIs rather than duplicating readiness, adapter, or validation rules.

## UI Constraints
- Use data-ui and token-governed styling.
- Do not add `apps/desktop/src/renderer/styles/**`.
- Do not add `app-layout.css`.
- Use dense, operational layouts suitable for repeated scanning and action.

## Verification
- Navigation smoke confirms `实验基座` below `文献管理`.
- UI governance checks pass.
- Browser smoke checks key views and disabled states for incomplete readiness.
