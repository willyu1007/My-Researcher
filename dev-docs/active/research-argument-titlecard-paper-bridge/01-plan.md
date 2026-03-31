# 01 Plan

## Phases
1. Seed/init contract
2. Readiness verify contract
3. Promote bridge implementation plan
4. Verification and handoff

## Detailed steps
- Phase 1:
  - 固定 `title-card` 到 workspace 的 seed 输入范围。
  - 决定 branch 初始化策略和 traceability 绑定。
- Phase 2:
  - 定义 readiness verify request/response。
  - 明确 `ReadyForWritingEntry` 必须检查 claim/evidence、baseline/protocol、repro readiness。
  - 定义 `continue / pivot / kill / archive` 决策写入方式。
- Phase 3:
  - 定义 `WritingEntryPacket` / `SubmissionRiskReport` 的 sidecar 产出与查询。
  - 定义 bridge 到 `createPaperProject` 的 guardrails 和 payload mapping。
  - 禁止绕过 readiness 直接 promote。
  - 仅传递兼容字段到 `createPaperProject`，其余通过 ref/audit link 接入。
- Phase 4:
  - 执行 targeted backend tests 和 governance sync/lint。

## Entry criteria
- `T-025` 已冻结 workspace ids、traceability refs、read-model DTO 和 report projection surface。
- 现有 `createPaperProject` 兼容字段和 guardrails 已完成对照。

## Exit review before downstream consumers
- `seed/init`、`readiness verify`、`decision action`、`promote bridge` 的 request/response 已冻结。
- `WritingEntryPacket` / `SubmissionRiskReport` sidecar 结构与 refs 已冻结。
- 非 ready workspace 无法 bridge 的 guardrail 已能被测试证明。
- `createPaperProject` 未被扩 shape，所有新增语义都走 sidecar refs / audit links。
