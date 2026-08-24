# 03 Implementation Notes

## 2026-05-20 - Task Package Created
- Created `T-100` for the desktop workbench.
- Depends on backend read-model/command contracts and D9 UI boundary.
- No product code changes were made.

## Open Notes
- Keep UI coarse until backend contracts land; refine fields later.

## 2026-05-21 - Implementation Started
- T-099 backend command/read-model contracts are available and committed.
- UI delivery uses `data-ui` contract path with evidence under `.ai/.tmp/ui/t100-paper-implementation-workbench-20260521`.
- Initial scope: backend-backed project lookup, queue-first operational panels, trace repair/decision queue command buttons, upstream feedback dispatch, and portfolio/claim/dossier read-model visibility under `论文管理`.

## 2026-05-21 - Closure
- Added renderer module `apps/desktop/src/renderer/modules/paper-implementation/`.
- Updated `PaperModule` so `论文管理` has two panels: `论文实施` and existing `文献集合`.
- `PaperImplementationWorkbench` reads backend endpoints for trace, motive, validation, WorkOrder, run evidence, result/claim/dossier, writing-entry projections, AI proposal artifacts, and decision queues.
- Queue detail intentionally shows backend source refs, trace refs, gate refs, blockers, risks, stale/hash status, and backend-recommended actions.
- All mutating paths call existing backend commands; the UI does not write authority state locally and does not use `research-argument`.
- Loader calls only existing project-level GET read-model endpoints. T-095 route/probe/experiment-plan objects currently expose create commands but no project-level list routes, so T-100 does not synthesize those read-models client-side.
