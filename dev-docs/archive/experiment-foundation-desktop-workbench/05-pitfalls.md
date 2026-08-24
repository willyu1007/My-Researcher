# 05 Pitfalls

## 2026-05-18 Guards
- Desktop smoke should use memory repository config when the local database has not applied experiment-foundation migrations. Otherwise registry list can show backend `INTERNAL_ERROR` unrelated to the renderer.
- Keep JSON create/upsert as a transport for frozen shared contract payloads only. Do not move recipe generation, materialization generation, readiness rules, result validation, or adapter execution into renderer state.
- Keep shared contract constants imported from `@paper-engineering-assistant/shared`; do not copy record kind or job status enums into desktop-only lists.
- Keep record filters scoped by operation surface. Registry, promotion, recipe/materialization, and evidence views must not share a single `record_kind` filter because that creates silent cross-panel drift.
- Do not expose `asset_candidate_triage_report` as a promotion target. Promotion targets are the six canonical `*_candidate` record kinds accepted by the backend gate.
- UI governance requires static `data-ui` attribute literals. Dynamic `data-tone={...}` failed the gate and must stay expressed through explicit render branches.

## Do Not Repeat
- Do not create `apps/desktop/src/renderer/styles/**`.
- Do not add `app-layout.css`.
- Do not duplicate backend domain rules in UI-only state.
