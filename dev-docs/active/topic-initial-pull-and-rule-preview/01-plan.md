# Plan

## Phase 1
- Add topic-level `initial_pull_pending` field through DB/repository/shared contracts.
- Wire create/update/list APIs and desktop normalizers/types.

## Phase 2
- Change TOPIC execution mode decision to use topic-level `initial_pull_pending`.
- After first successful run, update participating topics to `initial_pull_pending=false`.

## Phase 3
- Add topic list click-to-preview for effective rule.
- Reuse existing `topic-rule-preview-*` rendering/style for consistency.

## Verification
- Typecheck for desktop and backend.
- Targeted backend tests for topic profile + run behavior.
- Manual UI smoke: topic table rule preview and existing modal preview consistency.
