# desktop-legacy-css-retirement

## Outcome

- 退役 `apps/desktop/src/renderer/styles/**` 与 `apps/desktop/src/renderer/app-layout.css` 这条 renderer legacy CSS 双入口。
- 在不改变现有 UI/UX 的前提下，将既有运行时 CSS 聚合到 `ui/styles/ui.css` 主入口下。
- 收回 UI governance gate 对 renderer legacy styles 目录的临时 exclusion，使桌面 renderer 不再依赖被排除的旧样式目录。

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-022`
- Feature: `F-002` — Desktop Frontend Foundation
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-05-13`

### Historical Requirement provenance

- `R-010` — Desktop legacy CSS retirement and governance freeze

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- The complete old verification record remains available at the recovery reference below.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/desktop-legacy-css-retirement/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.
