# T-100 Paper Implementation Desktop Workbench

## Status
- State: done
- Parent task: `T-091 paper-implementation-full-landing`
- Mapping: `M-001 > F-001 > R-013`
- Flow node: queue-first desktop workbench
- Next step: T-101 can add contract/evaluation coverage for UI command/read-model paths.

## Goal
- Expose `PaperImplementationWorkbench` under `论文管理`.
- Provide queue-first decision/action surfaces for human review, trace repair, blockers, failed runs, stale recheck, loop-budget review, upstream feedback, portfolio decisions, and accepted risk expiry.
- Let users inspect and command implementation workflows without entering a writing editor.

## Non-goals
- Do not implement paper body writing, LaTeX editing, Prism/Overleaf execution, submission, or rebuttal flows.
- Do not duplicate experiment-foundation asset registry or execution console.
- Do not synthesize readiness in client state.

## Acceptance Criteria
- [x] Workbench consumes backend read-models and emits backend commands.
- [x] Queue item detail shows source refs, trace, gate result, blockers, risks, stale/hash status, and actions.
- [x] Portfolio decision and upstream feedback items are displayed as backend queue/read-model items, not client-only state.
- [x] Confirmation surfaces capture scoped confirmation records only.
- [x] UI follows repo `data-ui` + token/contract path.

## Closure
- Added `PaperImplementationWorkbench` under `论文管理` as a coarse queue-first UI surface.
- The workbench loads `ImplementationProject` by project id or bridge id, can bootstrap through the existing backend command, and reads T-093 through T-099 backend read-model endpoints.
- Queue aggregation is derived from backend objects only: `DecisionWorkQueueItem`, trace repair queue items, validation review items, upstream feedback candidates, portfolio decisions, failed workflows, failed/negative/inconclusive runs, claim-boundary blockers, and dossier readiness blockers.
- Commands are backend-only: decision queue resolve/dismiss/supersede, trace repair resolve, upstream feedback dispatch, and portfolio decision apply.
- No writing editor, experiment console duplication, local authority writer, or client-synthesized readiness was added.
