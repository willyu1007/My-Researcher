# 03 Implementation Notes

## 2026-05-18
- Implemented the desktop `实验基座` workbench as an operational minimum loop.
- Added the module entry directly under `文献管理` and mounted a self-contained `ExperimentFoundationModule`.
- Added desktop API/client/controller/view code under `apps/desktop/src/renderer/modules/experiment-foundation/`.
- The workbench consumes existing T-076/T-077 APIs only:
  - registry create/upsert/list through `/experiment-foundation/records`;
  - readiness latest/check through `/experiment-foundation/readiness/**`;
  - candidate promotion through `/experiment-foundation/candidates/:candidate_id/promotion`;
  - execution submit/sync/cancel/collect through `/experiment-foundation/execution/jobs/**`.
- JSON registry operations are an explicit UI minimum-closure bridge for already frozen shared contract payloads. The renderer does not generate `RunRecipe`, materialize `TrainingTaskSpec`, validate results, or execute adapters.
- Extended desktop governance bridge method/path allowlists for `PUT` and `/experiment-foundation/**`.
- Added desktop dependency on `@paper-engineering-assistant/shared` so UI record kinds and job status options come from shared contracts rather than duplicated renderer enums.
- No legacy `apps/desktop/src/renderer/styles/**` or `app-layout.css` entry was created; no token/contract change was made.
- Post-review fix: registry, promotion, recipe/materialization, and evidence views now keep separate record filters so panel switching cannot silently reuse an unrelated `record_kind`.
- Post-review fix: the promotion candidate selector now contains only promotable candidate record kinds; triage reports remain registry records, not promotion targets.
- Post-review fix: the execution/evidence view now includes evidence/sidecar record detail and scoped create/upsert controls.

## 2026-05-17
- Created to own S9 desktop workbench after contracts and APIs settle.
- Initial design decision: UI consumes domain contracts and backend APIs; it does not own experiment semantics.
