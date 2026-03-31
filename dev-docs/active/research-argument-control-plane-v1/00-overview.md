# 00 Overview

## Status
- State: in-progress
- Next step: 从 `T-024 research-argument-contracts-and-ssot` 开始，把 `research-varify` 设计输入规范化为 canonical docs、glossary/context 和 shared contracts。

## Goal
- 为仓库建立一条新的 pre-writing research argument control plane 主线，协调 `title-card` 上游证据链与 `paper-project` 下游写作容器之间的 research convergence。
- 完整覆盖 research-argument 这一需求切片，并补齐投稿前风险报告与写作交接输出。
- 通过 umbrella task 固定子任务拆分、执行顺序、跨任务边界、验证口径与 handoff 方式。

## Non-goals
- 不在 `T-023` 直接实现所有运行时模块；具体实现归各 child task 负责。
- 不重写 `T-014` / `T-021` 的 `title-card` 公开语义。
- 不重写现有 `paper-project` version-spine / writing-package 合同。
- 不在本轮推进 V2/V3 学习型排序、MCTS rollout 或写作层打通。
- 不并入 Markdown/LaTeX 编辑、章节 diff apply、Prism/Overleaf 执行面。
- 不在本组内完成 rebuttal 生成与响应编排。

## Context
- `research-varify/` 提供了完整的 research argument framework、data schema、planner spec 与 control-plane UI 输入，但当前尚未落入仓库正式 SSOT。
- 现有主线分成两段：
  - `T-014` / `T-021`：`title-card` 侧 evidence / need / question / value / package / promotion
  - `T-003` 及后续实现：`paper-project` 侧 version spine / stage gates / writing package
- 本任务在二者之间新增一层 `ArgumentObjectGraph + AbstractState + readiness / decision / bridge`，避免 title-card 和 paper-project 直接硬耦合。
- 对照 `requirements.md`，当前这一组任务原始版本只覆盖了 pre-writing 骨架；本轮修订后需显式补齐：
  - `Baseline / Protocol / ReproItem / Run / Artifact / Boundary / ReportProjection`
  - `SubmissionRiskReport`
  - `WritingEntryPacket`
  - `RuleEngine` 和 reviewer-facing 报告投影

## Acceptance criteria (high level)
- [x] `dev-docs/active/research-argument-control-plane-v1/` 包含 `roadmap + 00~05 + .ai-task.yaml`。
- [x] `T-024` 到 `T-028` 的 child task bundle 已创建。
- [x] 项目治理映射已预留到 `R-011`。
- [ ] `T-024` 完成 canonical docs、glossary/context 与 shared contracts。
- [ ] `T-025` 完成 graph/state V1 基座。
- [ ] `T-026` 完成 title-card seed/init 与 paper-project bridge。
- [ ] `T-027` 完成 desktop control plane V1。
- [ ] `T-028` 完成 planner / critic V1.5。
- [ ] `requirements coverage matrix` 已把 relevant MUST / journeys 标为 `owned / handoff / external dependency` 三类，且无未归属项。
- [ ] Journey 1 `idea -> claims` 在本组内有明确 owner 和验收。
- [ ] Journey 2 `claims -> evaluation evidence chain` 在本组内有明确 owner 和验收。
- [ ] Journey 3 `submission risk review output` 在本组内有明确 owner 和验收。
- [ ] Journey 4 `rebuttal` 明确只提供 upstream packet，不在本组内完成。

## Child-task ownership
- `T-024`: docs / context / shared domain contracts
- `T-025`: persistence / repository / synthesizer / read models
- `T-026`: title-card seed/init, readiness verify, risk/handoff sidecar, promote bridge
- `T-027`: desktop control plane, risk report review, handoff packet preview
- `T-028`: planner / critic / rule engine / risk-report assembly / async execution enhancement
