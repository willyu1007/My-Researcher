# Desktop Legacy CSS Retirement Roadmap

## Decision
- New requirement + task: `R-010` + `T-022 desktop-legacy-css-retirement`
- Mapping: `M-001 > F-002 > R-010`
- Primary goal: 将 `apps/desktop/src/renderer/styles/**` 收口为 frozen legacy compatibility layer，并按波次迁移后最终移除。

## Why this is a separate task
- `T-017 frontend-normalizers-and-css-split-wave2` 完成了历史 CSS 聚合/拆分，但没有定义退役主权与冻结规则。
- `T-021 topic-management-workbench-ui` 负责把 UI gate 拉绿与覆盖 desktop renderer，不再承担 legacy CSS 的长期治理。
- 旧 CSS 仍是桌面运行依赖，但如果继续让任何任务自由扩展，会持续造成语义漂移和治理逃逸。

## Phases
1. Requirement/task bootstrap and governance mapping
2. Declare legacy compatibility layer
3. Hard-freeze the legacy CSS layer
4. Wave migration of legacy interface clusters
5. Remove legacy imports and retire scan exclusion
6. Final verification and handoff

## Immediate tranche
- 本轮只执行：
  - Phase 1: requirement/task bootstrap
  - Phase 2: 声明 compatibility layer
  - Phase 3: hard-freeze 规则落地
- 本轮不执行任何波次迁移、import 删除或视觉重构。

## Future wave order
- Wave A: `shell/*`
- Wave B: `modules-paper-writing.css`
- Wave C: `literature-overview.css`
- Wave D: `literature-auto-import/*`
- Wave E: `literature-manual-import/*`

## Rollback
- 若任务映射或文档边界错误，可删除 `dev-docs/active/desktop-legacy-css-retirement/`，回退 registry 中 `R-010` / `T-022` 项后重新执行 `sync --apply`。
