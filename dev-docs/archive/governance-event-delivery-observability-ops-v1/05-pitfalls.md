# 05 Pitfalls

## Do-not-repeat summary
- 不要在没有审批链路时启用自动回放。
- 不要定义与 delivery core 不一致的指标命名。
- 不要让告警策略直接修改业务执行逻辑。

## Append-only resolved log
### 2026-02-23 - 拆分后避免运维需求挤压实现节奏
- Symptom:
  - 运维与观测需求在 delivery 实现讨论中被持续延后。
- Root cause:
  - 缺少独立任务承接 SLO/告警/runbook 的治理设计。
- What was tried:
  - 评估在 `T-009` 附带运维章节。
- Fix / workaround:
  - 新建 `T-010` 独立承接 observability + ops。
- Prevention:
  - 交付层与运维层必须双任务并行，靠契约联动而非混写。

### 2026-02-23 - 避免双词典导致监控漂移
- Symptom:
  - `T-009` 与 `T-010` 曾分别维护指标命名草案，存在口径漂移风险。
- Root cause:
  - 缺少跨任务 single-source telemetry contract。
- What was tried:
  - 仅在各自任务文档局部约束命名。
- Fix / workaround:
  - 新增并冻结 `06-telemetry-contract-draft.md`，两任务仅引用不重复定义。
- Prevention:
  - 后续新增指标必须先更新单一词典，再更新实现或告警文档。
