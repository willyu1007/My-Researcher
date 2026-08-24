# Implementation Notes

## 2026-05-28
- Created task bundle before code changes per `dev-docs/AGENTS.md`.
- Added shared `topic-selection-v1a-workflow-harness-contracts` with N1-N9 `node_policy`, `route_edges`, route decisions/signals/targets, handoff kinds, allowed statuses, and request/result envelopes.
- Added v1a native runner HTTP:
  - `POST /topic-selection/v1a/workflow-harness/nodes/:nodeId/invocations`
  - `POST /topic-selection/v1a/workflow-harness/artifacts`
  - `GET /topic-selection/v1a/workflow-harness/artifacts/:artifactRefId`
- Wired `TopicSelectionWorkflowHarnessService.invokeNode()` to dispatch to existing node runners and resolve N1-N9 outcomes through the shared route-policy registry.
- Added route-signal normalization for N4 search retry/source-health loopbacks, N5 review/block, N6 supplemental/finalize/block, N7 repair/recheck/reject/park/merge/wait/block, N8 confirmation wait/block, and N9 publish/block.
- Guarded retained direct v1a write routes against automation/harness payload markers (`schema_version`, `scenario_input`, `scenario_id`, `scenario_case_id`, `node_attempt_id`, v1a `node_id`) so automatic orchestration must use the native runner while manual UI payloads continue to work.
- Added contract, service, and HTTP tests for policy schema rejection, native HTTP artifact readback, direct-route automation blocking, N4 loopbacks, N6 supplemental loopback, and N7 repair/hold/merge routes.
- Migrated `.ai/scripts/topic-selection-v1a-harness-e2e.mjs` to call the native HTTP runner for N1-N9 instead of invoking harness service methods directly.
- Migrated v1b HTTP harness route tests and `.ai/scripts/topic-selection-v1b-harness-e2e.mjs` so automatic v1b fixture creation now consumes a v1a native N9-published bundle, not v1a direct write routes.
- Added full v1a native HTTP N1-N9 route integration coverage and v1a native N9 -> v1b N1-N11 HTTP integration coverage.
- Added `buildApp({ topicSelectionV1aLlmGateway })` injection support so route/provider canaries can exercise v1a provider-backed nodes without relying on global provider state in tests.
- Provider acceptance used a dedicated seeded topic fixture (`v1a-provider-canary-topic-roles-20260528`) because the current local DB initially had no topic-scoped literature for resource sampling.
