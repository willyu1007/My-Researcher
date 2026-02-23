# 05 Pitfalls

## Do-not-repeat summary
- 不要在 `T-008` 里重定义业务事件语义，语义 owner 仍是 `T-003`。
- 不要把交付机制实现细节直接塞回已归档任务（`T-007`）。
- 不要在未定义幂等键前设计自动重试策略。

## Append-only resolved log
### 2026-02-23 - 避免归档任务反向膨胀
- Symptom:
  - `T-007` 归档后仍存在“事件交付机制细化”后续项，容易诱发回写归档任务。
- Root cause:
  - 交付机制属于独立治理层，但此前被记录为单条 follow-up，未建立 owner 任务。
- What was tried:
  - 评估在 `T-007` 内继续补文档。
- Fix / workaround:
  - 新建 `T-008` 承接交付机制治理，保持 `T-007` 归档只读。
- Prevention:
  - 归档前将非阻塞 follow-up 显式拆分新任务并完成治理映射。
