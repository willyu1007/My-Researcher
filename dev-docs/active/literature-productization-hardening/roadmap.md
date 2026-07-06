# Roadmap

## Why This Exists
- 2026-07-07 落地审查实锤:文献域验收级成熟但生产级有洞(死锁、外部依赖裸奔、遥测 bug、语义双源)。
- 选题域已完成同类硬化(T-127/T-128/T-089),文献域需要同水位的生产姿态与机器守卫。

## Target Outcome
- 文献管线在无人值守下可安全运行:崩溃可恢复、并发有互斥、外部依赖有超时断路、成本可见。
- retrieval-ready 单一语义贯通文献→检索→选题;新入库文献自动推进。
- 阶段模型有 SSOT 与一致性脚本守卫,漂移在 CI 被抓。

## Exit Criteria
- 00 的 Acceptance Criteria 全勾;L-01..L-17 逐项做或显式 defer 留痕。
