# 02 Architecture

## UI surface
- 入口应位于 desktop shell 的 research workflow 主线上。
- 视图只消费 research-argument read models，不直接拼接 `title-card` persistence 细节。

## Frozen minimum views
- `AbstractStateDashboard`
- `BranchGraph`
- `BlockerBoard`
- `ClaimEvidenceCoverageTable`
- `ProtocolBaselineReproReadinessView`
- `SubmissionRiskReportReview`
- `WritingEntryPacketPreview`
- `ActionQueue`
- `DecisionTimeline`

## Consumed read-model contract
- `WorkspaceSummary`
- `AbstractStateSnapshot`
- `ClaimEvidenceCoverageRow`
- `ProtocolBaselineReproReadiness`
- `SubmissionRiskReport`
- `WritingEntryPacket`
- `DecisionTimelineEntry`
- `ActionQueue` read model

## UI action contract
- read-only surfaces 只能消费 research-argument query/read-model DTO。
- mutating surfaces 只能通过：
  - readiness verify
  - decision action
  - planner action enqueue（如启用）
- 每个 action item 必须携带 source refs、impact summary 与 audit reason entry point。

## Interaction rules
- 高风险动作必须带 confirmation / audit。
- UI 必须解释 `level / score / confidence / blockers`，而不是只显示一个总分。
- UI 必须能回看 risk report 的 `severity / detail / pointers`。
- UI 不得绕开现有 desktop theme / governance 约束。
