# Shared Contract Decomposition Wave 4 - Roadmap

## Goal
- 将 `interface-field-contracts.ts` 按 bounded context 拆成更清晰的 shared contract 文件组，同时保持现有 barrel/export surface 对 desktop/backend consumers 兼容。

## Program position
- Parent governance task: `T-015 maintainability-file-split-governance`
- Wave: `4`
- Task slug: `shared-contract-decomposition-wave4`
- Project mapping target: `M-000 > F-000 > T-pending`
- Current status target: `planned`

## Why this task exists
- `interface-field-contracts.ts` 达到 `1663` 行，当前同时承载 module ids、literature、auto-pull、paper-project/release、schema helpers/request schemas 等多组职责。
- `packages/shared/src/research-lifecycle/index.ts` 当前通过单个 barrel 对外导出该文件；如果不在最后一波统一处理，很容易把前面各 wave 拖进 shared surface 大改。
- 同目录已经存在拆分先例 `topic-management-contracts.ts`，说明 `research-lifecycle/` 本身适合按 bounded context 扩展，而不是继续向单文件累积。

## Scope
- Primary target:
  - `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
- Allowed integration surfaces:
  - `packages/shared/src/research-lifecycle/index.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/research-lifecycle/`
  - 直接消费 shared barrel 的 backend/desktop import path（仅限兼容迁移与验证）
  - shared 测试与 consumer typecheck

## Explicit non-goals
- 不改 contract 的业务语义。
- 不删除现有 barrel 导出而迫使 consumers 一次性切换。
- 不把 backend/desktop 业务逻辑改动混入本包。
- 不改 REST/DB path、schema 或运行行为。

## Inputs and fixed assumptions
| Input | Why it matters | Constraint carried into this task |
|---|---|---|
| `T-015` parent roadmap | 定义本包属于最后一波 | 必须在前几波稳定后进入 |
| `T-011 literature-management-flow` | 已大量使用并扩展 `interface-field-contracts.ts` | 启动前需吸收其最新 baseline |
| `topic-management-contracts.ts` | 已提供同目录的拆分先例 | 新拆分应延续 bounded-context 组织方式 |
| `research-lifecycle/index.ts` | 当前 consumer 主要通过 barrel 进入 | barrel compatibility 是硬要求 |

## Decomposition strategy
### Candidate contract slices
- `paper-project-contracts`
- `literature-contracts`
- `auto-pull-contracts`
- `research-lifecycle-core`
- `schema-helpers` / request-schema group

### Compatibility strategy
- 迁移期保留：
  - `interface-field-contracts.ts` 作为兼容聚合层
  - `research-lifecycle/index.ts` 继续稳定导出
  - `packages/shared/src/index.ts` 不破坏顶层 shared barrel
- 允许逐步把 consumers 切换到更细粒度模块，但不是本包的前置要求。

## Entry gates
- Wave 3 已完成或至少 backend/shared internal boundaries 已稳定。
- `T-011` 相关 shared contract 活跃修改已吸收或停稳。
- 已完成 desktop/backend consumer audit，明确当前依赖 barrel 的入口和验证矩阵。

## Acceptance
- `interface-field-contracts.ts` 不再继续承担所有研究生命周期契约。
- 新的 bounded-context contract 文件组已落地，并有清晰 barrel 关系。
- 旧 barrel/export surface 在迁移期保持兼容。
- shared/backend/desktop typecheck 与 shared tests 通过。

## Rollback
- 保留兼容聚合层，支持先回退 barrel wiring，再回退单个 contract slice。
- 若 consumer 兼容性出现问题，优先恢复聚合导出，而不是放弃整个拆分结构。

## Review closure for this package
- 该任务包实施前必须再确认：
  - `T-011` 对 shared contract 的最新变更已吸收
  - backend/desktop consumer audit 已完成
  - `research-lifecycle/index.ts` 与顶层 shared barrel 的兼容策略已定稿

