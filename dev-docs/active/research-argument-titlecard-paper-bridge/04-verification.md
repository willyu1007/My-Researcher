# 04 Verification

## Planned checks
- targeted backend tests for seed/init, readiness verify, promote bridge
- contract drift tests
- governance sync/lint

## Executed checks
- Pending in current implementation pass.

## Pre-handoff review for `T-027` / downstream writing lane
- [ ] seed/init 输入源与 traceability 绑定已冻结。
- [ ] readiness response 已覆盖 claim/evidence、baseline/protocol、repro 三类 gate。
- [ ] `WritingEntryPacket` / `SubmissionRiskReport` 可独立查询，并可通过 ref/audit link 回链。
- [ ] promote bridge 对 `createPaperProject` 的兼容边界已通过 review。
