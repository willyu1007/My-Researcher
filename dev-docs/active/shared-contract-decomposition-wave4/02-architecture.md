# 02-architecture

## Purpose
- 固化 Wave 4 的 shared contract 拆分合同，重点保护 consumer 兼容性和 barrel 稳定性，而不是追求一次性“最干净”的 import 路径。

## Current-state signals
| File | Current signal | Consequence |
|---|---|---|
| `interface-field-contracts.ts` | `1663` 行，承载多 bounded context 契约 | 需要 contract slices |
| `research-lifecycle/index.ts` | 当前直接导出 `interface-field-contracts.ts` 与 `topic-management-contracts.ts` | barrel compatibility 是核心 |
| `packages/shared/src/index.ts` | 通过 shared 顶层 barrel 暴露 research-lifecycle | 需要保护顶层 consumer |
| `topic-management-contracts.ts` | 同目录已有拆分先例 | 新拆分应与既有模式兼容 |

## Bounded-context contract model
- Candidate slices:
  - `research-lifecycle-core`
  - `literature-contracts`
  - `auto-pull-contracts`
  - `paper-project-contracts`
  - `schema-helpers`
- Organization rule:
  - 每个 slice 只承载一个相对稳定的业务语义域
  - barrel 负责聚合，不负责重新定义语义

## Compatibility contract
- Must preserve during migration:
  - `interface-field-contracts.ts` 兼容导出
  - `research-lifecycle/index.ts` 导出形态
  - `packages/shared/src/index.ts` 顶层 shared 导出形态
- Must not do:
  - 删除旧导出导致 backend/desktop 同时大量改 import
  - 在同一波里同时追求“拆分完成”与“完全去兼容层”

## Consumer strategy
- First priority:
  - 保持现有 consumer 路径工作
- Second priority:
  - 允许新代码渐进使用细粒度 contract slices
- Optional follow-up:
  - 未来如需移除兼容层，应单独建 cleanup 任务，而不是在本包继续膨胀

## Coordination constraints
- 与 `T-011 literature-management-flow` 的重叠：
  - 该任务对 `interface-field-contracts.ts` 有多次扩展记录
  - 本包启动前必须吸收其最新 baseline
- 与 `T-014 automated-topic-management` 的边界：
  - `topic-management-contracts.ts` 已在同一 barrel 下工作
  - 本包不得破坏 sibling module 的导出关系

## Verification contract
- 必须证明：
  - shared tests/typecheck 通过
  - backend/desktop consumer typecheck 通过
  - barrel/export surface 兼容
- 推荐保留的验证面：
  - `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - `pnpm --filter @paper-engineering-assistant/shared test`
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`

## Risks and controls
| Risk | Impact | Control |
|---|---|---|
| 拆分后移除旧 barrel | backend/desktop consumer 大面积失败 | 保留兼容聚合层 |
| 与 `T-011` 并发改同一 contract file | 基线错位与冲突 | 先吸收 `T-011` baseline |
| 打破 `topic-management-contracts.ts` sibling 关系 | shared barrel 不稳定 | 明确 sibling compatibility 约束 |
| 在同一波强行去除兼容层 | scope 失控 | 把 cleanup 视为单独后续任务 |

## Decision checkpoints
- Checkpoint 1:
  - bounded context 的最终切片命名是否足够稳定。
- Checkpoint 2:
  - `interface-field-contracts.ts` 是作为纯 re-export 层保留，还是改名为新的兼容层文件。
- Checkpoint 3:
  - 是否需要单独创建后续 cleanup 任务来移除兼容层。

