# 05 Pitfalls

## Do-not-repeat summary
- 不要在未冻结幂等键前上线重试机制。
- 不要把 observability 需求塞到 delivery core 实现任务。
- 不要在未评审 migration 前直接落地 outbox 表结构。

## Append-only resolved log
### 2026-02-23 - 拆分后避免任务边界重叠
- Symptom:
  - delivery implementation 与 observability/ops 需求混在同一任务中，难以并行推进。
- Root cause:
  - 拆分前只有 `T-008` 总体任务，缺少执行层 owner。
- What was tried:
  - 评估继续在 `T-008` 内细化。
- Fix / workaround:
  - 新建 `T-009`（backend implementation）与 `T-010`（observability/ops）。
- Prevention:
  - 所有后续变更先判断属于执行面还是运维面，再进入对应任务。
