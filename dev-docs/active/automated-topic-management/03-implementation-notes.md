# 03 Implementation Notes

## Current state
- 当前阶段未进入产品代码实现。
- 已完成的工作是：根据 `automated_topic_notes.md`、product requirements、现有 API/代码边界，创建任务包并登记治理映射。
- 已执行 project governance `sync --apply` 与 `lint --check`，新任务已进入 project hub。

## Decisions made
- 决定新建复杂任务 `automated-topic-management`，不复用 `topic-initial-pull-and-rule-preview`。
- 决定把模块定位为 `topic settings` 与 `paper-project` 之间的中间决策层。
- 决定 MVP 先做四对象闭环，不先做完整 `EvidenceMap`。
- 决定 promotion 维持人工审批，不做自动立项。

## Deviations from the initial design note
- 原始设计稿把完整链路写到了 `TopicSeed -> EvidenceMap -> ...`。
- 本任务包为保证首版可落地，明确将 `EvidenceMap` 完整化后置到增强阶段。
- 这不是推翻设计稿，而是对 Phase 1 / Phase 2 的执行顺序做了收敛。

## Open follow-ups
- 与用户继续讨论并确认 MVP 边界和命名：
  - `topic-assessment`
  - `topic-workspace`
  - `direction-pool`
- 继续细化 `TopicPackage -> createPaperProject` 的 payload 映射。
- 确认 requirement / feature 语义是否足够稳定，或后续需要单独抽出 topic selection feature。
