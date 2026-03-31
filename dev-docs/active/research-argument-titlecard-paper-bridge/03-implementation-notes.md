# 03 Implementation Notes

## Initial decisions
- 决定 bridge 单独成任务，避免 graph/state 与 downstream promotion 混在一起。
- 决定 promote guardrail 由 readiness verify 决定，而不是沿用旧 promotion decision 直接放行。
- 决定 handoff 采用 sidecar artifact，而不是扩 `createPaperProject` 公共合同。

## Open hooks
- 待实施时需要决定 seed/init 是同步创建还是显式 command。
- 待实施时需要决定 readiness verify 是否区分 human-confirm-required 的动作类型。
- 待实施时需要决定 packet/report ref 如何在不破坏现有 `paper-project` 合同的前提下回链。
