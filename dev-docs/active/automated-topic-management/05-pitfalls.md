# 05 Pitfalls

## Do-not-repeat summary
- 不要把 `topic settings` 直接当成 `research question`。
- 不要在 roadmap 阶段就把完整 `EvidenceMap`、多角色评审和 portfolio 一起塞进 MVP。
- 不要让评分结果直接驱动 `paper-project` 创建，promotion 必须保留人工审批。
- 不要在未对齐 EvidenceReview / NeedReview / ValueAssessment 契约（见 02-architecture 内嵌小节）的情况下实现 LLM 自审输出的解析或持久化；契约以 02-architecture 为准。
- 不要在 service 层跳过 promotion gate invariants（question 须有上游 sources、value assessment 任一 hard gate 失败不得 promote、promote 须 package_id 与 target_paper_title、promote-to-paper-project 须对齐且 evidence ids 非空）；这些规则须在 service 强制，不能仅靠 UI。

## Historical log
- None yet. Add resolved failures, dead ends, or planning mistakes here once they occur.
