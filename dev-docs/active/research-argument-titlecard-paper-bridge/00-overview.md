# 00 Overview

## Status
- State: planned
- Next step: 在 `T-025` graph/state V1 稳定后，设计 title-card seed/init payload 与 readiness verify flow。

## Goal
- 让一个完整的 `title-card` 能创建 active research-argument workspace。
- 在 `WorthContinuing` / `ReadyForWritingEntry` 的验证通过后，受控桥接到现有 `paper-project`。
- 在 bridge 过程中生成 `WritingEntryPacket` 与 `SubmissionRiskReport`，作为 downstream writing lane 的 sidecar artifact。

## Non-goals
- 不重写 `title-card` 的 upstream CRUD。
- 不重写 `paper-project` version-spine 或 writing-package。
- 不把 bridge 变成第二套 paper lifecycle。
- 不扩 `createPaperProject` 公共合同。

## Context
- 当前 `title-card` 已有 evidence / need / research-question / value / package / promotion 主链，但缺少 research-argument workspace 这一层。
- 当前 `paper-project` 已可作为 downstream 容器，但没有 pre-writing argument readiness gate。

## Acceptance criteria (high level)
- [x] `dev-docs/active/research-argument-titlecard-paper-bridge/` 包含 `roadmap + 00~05 + .ai-task.yaml`。
- [ ] title-card seed/init 已能创建 active workspace。
- [ ] readiness verify 已可产出 `WorthContinuing` / `ReadyForWritingEntry` 结果。
- [ ] 非 ready workspace 不能直接 bridge 到 `paper-project`。
- [ ] `WritingEntryPacket` 与 `SubmissionRiskReport` 已能作为 sidecar artifact 生成和查询。
- [ ] promote bridge 保留 traceability 和 audit 信息。
- [ ] backend tests / governance checks 通过。
