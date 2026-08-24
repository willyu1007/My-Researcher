# experiment-foundation-research-workbench

## Outcome

- Upgrade the desktop `实验基座` workbench from an operator-grade JSON bridge to a researcher-grade workbench that surfaces experiment state, supports human-in-the-loop actions on assets and runs, and exposes the relationship between in-flight experiments and paper implementations.
- Land typed semantic editing for the most-used reusable assets (starting with `DatasetAsset`). Unfrozen or advanced fields remain reachable through an "Advanced JSON" panel inside a selected record's detail view; the generic JSON CRUD is no longer exposed as a top-level navigation tab.
- Retire the T-078 5-tab JSON-textarea IA phase by phase as the new IA absorbs each surface; do not leave the old tabs in place as a permanent fallback.
- Introduce a reusable `RefPicker` primitive that later milestones consume; avoid open-coded ref inputs.
- Replace the JSON-heavy execution tab with a `RunRecipe`-anchored experiment timeline that contextualizes submit/sync/cancel/collect.
- Provide light, dependency-free visualization for evaluation facts to support secondary needs (view baseline/benchmark, view results).
- Close the open T-106 UI-driven full-flow smoke acceptance criterion by landing it on the new IA.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-110`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-05-29`

### Historical Requirement provenance

- `R-012` — Experiment foundation reusable assets baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- Overview is the default `activePanel` (changed `useState<ExperimentFoundationPanelKey>('overview')`).
- Four counter cards render: `进行中 jobs` / `阻塞记录` / `待晋升候选` / `可用 evidence`.
- Three lists render with max 5 items each: recent jobs, blocked records, pending candidates.
- Deep-link callbacks present: `goToJob` (→ execution + preselect), `goToReadiness` (→ readiness + target preset), `goToPromotion` (→ promotion + candidate preset).
- No new API endpoint introduced; only existing `/experiment-foundation/records` and `/experiment-foundation/execution/jobs` are used.
- `论文绑定` Tab landed and routed to `<PaperBindingPanel>`.
- Sidecars are reachable and groupable: `PaperBindingPanel` queries `paper_experiment_sidecar` records and groups by `paper_project_id` (Map → sorted array). `paper_project_id` filter input narrows the list.
- Selecting a sidecar populates a read-only summary: 9 ref summaries (run_recipe / dataset_version_lock / evaluation_protocol_lock / benchmark_asset / training_task_spec / materialization_result / optional external_job + 5 ref-list summaries) plus the full payload `JsonAdvancedPanel`.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/experiment-foundation-research-workbench/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.
