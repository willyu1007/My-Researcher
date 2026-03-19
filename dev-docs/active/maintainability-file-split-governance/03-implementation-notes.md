# 03-implementation-notes

## Current state
- 已完成总任务包、四个规划子任务包和 project hub 同步。
- `sync --apply` 已为总任务分配 `T-015`，并为四个规划子任务分配：
  - `T-016 backend-service-boundary-split-wave3`
  - `T-017 frontend-normalizers-and-css-split-wave2`
  - `T-018 literature-container-controller-split-wave1`
  - `T-019 shared-contract-decomposition-wave4`
- 所有子任务包均已完成首轮合同 review；尚未启动任何产品代码拆分波次。

## Wave log
### Wave 0
- Status: done
- Dates: 2026-03-19
- Notes:
  - 创建并同步 `T-015`。
  - 补建并同步 `T-016` / `T-017` / `T-018` / `T-019`。
  - 完成逐包合同 review 与整体执行顺序收口。

### Wave 1A
- Status: existing task, not modified
- Dates: 2026-03-19 review only
- Notes:
  - 继续复用 `T-012`，不扩 scope。

### Wave 1B
- Status: planned, review closed
- Dates: 2026-03-19
- Notes:
  - `T-018` 已创建。
  - 收口点：只拆 container/controller，不前置 CSS/normalizer。
  - 进入门槛：吸收 `T-012` 最新 host baseline。

### Wave 2
- Status: planned, review closed
- Dates: 2026-03-19
- Notes:
  - `T-017` 已创建。
  - 收口点：保留 `normalizers.ts` 兼容 barrel，CSS 聚合入口只负责 import order。
  - 进入门槛：Wave 1B 稳定，且吸收 `T-011` 的 `normalizers.ts` baseline。

### Wave 3
- Status: planned, review closed
- Dates: 2026-03-19
- Notes:
  - `T-016` 已创建。
  - 收口点：三大热点文件全部采用 facade + internal slices。
  - 进入门槛：吸收 `T-011` / `T-013` 的 backend overlap baseline。

### Wave 4
- Status: planned, review closed
- Dates: 2026-03-19
- Notes:
  - `T-019` 已创建。
  - 收口点：保持 `interface-field-contracts.ts` 与 shared barrel 兼容导出。
  - 进入门槛：Wave 3 稳定、consumer audit 完成、shared baseline 收口。

## Sequential package review
| Package | Review focus | Key closure |
|---|---|---|
| `T-018 literature-container-controller-split-wave1` | host wiring、container/controller 边界、Wave 2 defer list | 可直接作为 Wave 1B 实施包；前提是吸收 `T-012` baseline |
| `T-017 frontend-normalizers-and-css-split-wave2` | `normalizers.ts` overlap、CSS import order、兼容 barrel | 可作为 Wave 2 实施包；前提是 Wave 1B 稳定且吸收 `T-011` baseline |
| `T-016 backend-service-boundary-split-wave3` | backend overlap、facade compatibility、Prisma-only boundary | 可作为 Wave 3 实施包；前提是 `T-011` / `T-013` baseline 稳定 |
| `T-019 shared-contract-decomposition-wave4` | consumer audit、barrel compatibility、sibling module stability | 可作为 Wave 4 实施包；前提是 Wave 3 稳定且完成 consumer audit |

## Overall review
- 推荐执行顺序已经明确：
  - `T-012 -> T-018 -> T-017 -> T-016 -> T-019`
- 当前计划的主要非代码阻塞也已经明确：
  - `T-018` 依赖 `T-012` host baseline
  - `T-017` 依赖 Wave 1B 和 `T-011 normalizers.ts` baseline
  - `T-016` 依赖 `T-011` / `T-013` backend overlap 收口
  - `T-019` 依赖 Wave 3 稳定、`T-011` shared baseline、`T-014` sibling barrel、consumer audit
- 结论：
  - 任务包体系已足以支撑后续逐波实施，无需再补充新的治理决策。

## Decision log
| Date | Decision | Rationale | Follow-up |
|---|---|---|---|
| 2026-03-19 | 创建总任务 `maintainability-file-split-governance` | 现有 `T-012` 范围过窄，无法承载全仓拆分治理 | 后续波次按子任务推进 |
| 2026-03-19 | 该任务由 sync 自动分配为 `T-015` | 避免手写 `task_id` 与 registry 漂移 | 后续引用统一使用 `T-015` |
| 2026-03-19 | 保留 `T-012` 作为 Wave 1A 窄子任务 | 避免无声扩 scope | Wave 1B 单独建子任务 |
| 2026-03-19 | 第一波坚持零行为变化 | 降低长期拆分引入回归的风险 | Wave 1~3 都沿用该原则 |
| 2026-03-19 | 按用户要求预创建剩余四个规划子任务包 | 提前补足上下文承载与后续执行入口 | 仍保持“一次只实施一个波次” |
| 2026-03-19 | 波次实施推荐顺序固定为 `T-012 -> T-018 -> T-017 -> T-016 -> T-019` | 先收口前端边界，再处理 util/style，再处理 backend，最后处理 shared surface | 后续实施按此链路推进，除非用户显式重排 |

## Handoff notes
- 当前状态：
  - `T-015` 的治理目标已完成。
  - 后续应直接从实施任务中选下一包开工。
- 下一个明确动作：
  - 推荐先确认 `T-012` 当前 host baseline 是否已可作为 `T-018` 的起点。
