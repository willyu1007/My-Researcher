# 02 Architecture

## Purpose
- 在不改动业务实现的前提下，将外部自动科研系统机制映射为本项目治理层可消费的增量规范。

## Architectural position
- 上游输入层：外部借鉴机制（状态、timeline、资产、成本、审查门）。
- 中间适配层（本任务）：`T-005` 文档化映射与接口增量草案。
- 下游执行层：后续前端/后端实现任务（建议 `T-006/T-007`）消费该适配层。

## Single-writer boundary alignment
| Topic | SSOT owner | T-005 role | Constraint |
|---|---|---|---|
| 8模块定义与批次 | `T-002` | 只引用，不重写 | 禁止改 TP 编号与优先级正文 |
| 4阶段门禁与版本主线 | `T-003` | 增量借鉴输入 | 禁止覆盖 `roadmap/01-plan/02-architecture` 主权段落 |
| 外部借鉴适配矩阵 | `T-005` | 新增 SSOT | 只输出适配策略与联动方案 |

## Borrowing-to-module mapping (M1~M8)
| Borrowing class | Primary module targets | Governance object | Value gate touchpoint |
|---|---|---|---|
| B-01 状态机可观测 | M3, M4~M8 | `stage_node.status` 映射扩展 | `decision lifecycle` 与 gate trace |
| B-02 Timeline-first | M3 | `paper timeline stream` | gate 事件时间序一致性 |
| B-03 结构化价值门 | M3, M4~M7 | `value_judgement` 强化字段 | hard constraints + promote gate |
| B-04 资产包链接化 | M1, M3, M8 | `artifact_bundle` | 写作包证据完整性 |
| B-05 成本与资源指标 | M5~M7 | `paper_runtime_metric` | `efficiency_cost_reasonableness` |
| B-06 并行回流可追溯 | M4~M7 | `loopback_edge + lane meta` | loopback decision trace |
| B-07 负结果发布策略 | M7, M8 | `negative_result_publish_policy` | claim-evidence coverage |
| B-08 发布前人审与标注 | M8 | `release_review_payload` | release gate approval |

## Owner boundary (R/C/F)
- R (`T-005`): 借鉴矩阵、联动方案、接口增量草案。
- C (`T-003`): 复核与吸收可执行治理条目。
- F (`T-005` forbidden): 直接修改 `T-003` 现有 gate 主流程定义；直接改业务代码。

## Data flow (docs-to-implementation)
1. `06-borrowing-matrix.md` 作为语义映射输入。
2. `08-interface-delta-spec.md` 作为接口增量输入。
3. `07-integration-adjustment-plan.md` 作为实施拆分输入。
4. 后续 `T-006/T-007` 执行前需再次跑 anti-drift 校验。

## Invariants
- Invariant 1: 增量字段不得破坏 `lineage_meta`、`value_judgement_payload`、`snapshot_pointer_payload`。
- Invariant 2: 所有新增事件必须与现有 gate/pointer 生命周期对齐。
- Invariant 3: 文档适配层不产生第二套模块命名与阶段门禁体系。
