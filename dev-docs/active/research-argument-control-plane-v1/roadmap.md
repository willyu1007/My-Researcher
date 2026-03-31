# Research Argument Control Plane v1 Roadmap

## Decision
- New complex task: `T-023 research-argument-control-plane-v1`
- Mapping: `M-001 > F-001 > R-011`
- Primary goal: 在 `title-card -> paper-project` 之间建立一层 pre-writing research argument control plane，用结构化对象图、抽象状态和 phased execution 收口 `research-varify` 的设计输入，并补齐投稿前风险报告与写作交接输出。

## Why this is a separate task
- `research-varify` 引入的是新的 argument layer，不等于现有 `R-009` 选题决策层，也不等于 `T-003` 的 version-spine / stage-gate 治理。
- 该框架同时涉及 docs/contract、backend domain、bridge、desktop control plane 和 planner/critic，必须有一个 umbrella task 管理边界和执行顺序。
- 将其独立建包后：
  - `T-014` / `T-021` 继续拥有 `title-card` 语义与工作台主链
  - 现有 `paper-project` 合同继续拥有 writing / stage-gate 语义
  - `T-023` 只负责它们之间的 research-argument convergence layer
  - `T-023` 调整后覆盖 `idea -> claim/evidence/baseline/protocol/repro -> readiness -> risk report -> writing handoff`

## Child tasks
1. `T-024 research-argument-contracts-and-ssot`
2. `T-025 research-argument-graph-and-state-v1`
3. `T-026 research-argument-titlecard-paper-bridge`
4. `T-027 research-argument-control-plane-ui-v1`
5. `T-028 research-argument-planner-critic-v15`

## Phases
1. Governance intake and SSOT normalization
2. Argument graph and abstract state baseline
3. Title-card seed and paper-project bridge
4. Desktop control plane V1
5. Planner / Critic Hub V1.5
6. Verification and handoff

## Phase outcomes
- Phase 1:
  - `R-011` 和 `T-023` 到 `T-028` 完成治理注册
  - canonical docs / glossary / shared contracts 的落点固定
- Phase 2:
  - 对象图最小集合、9 维状态和 `StateSynthesizer` 的 V1 范围固定
  - requirements coverage matrix 固定
- Phase 3:
  - `title-card` 到 research-argument workspace 的 seed/init 与 readiness bridge 范围固定
  - `SubmissionRiskReport` 与 `WritingEntryPacket` 的 sidecar handoff 方案固定
- Phase 4:
  - 桌面控制面最小视图和人工确认点固定
  - risk report / handoff preview 视图固定
- Phase 5:
  - planner / critic enhancement 范围固定在 V1.5，不前置到 V1
  - `RuleEngine`、`RiskReportAssembler` 和异步可靠性 owner 固定
- Phase 6:
  - governance、contract、backend、desktop 的验证与 handoff 记录齐全

## Explicit defaults
- V1 默认一个 `title-card` 对应一个 active research-argument workspace。
- 多路线通过 workspace 内 `Branch` 管理，而不是多个 sibling workspace。
- `research-varify` 保留为 intake 输入，不作为长期 SSOT 目录。
- 先落 V1 基座，再做 V1.5 planner / critic，不跳步。
- 不扩 `createPaperProject` 公共合同。
- Markdown/LaTeX、章节 diff apply、Prism/Overleaf、完整 rebuttal 继续留在 downstream writing lane。

## Rollback
- 若任务编号或映射错误，可删除对应 `dev-docs/active/research-argument-*/` 目录、回退 `registry.yaml` 新增项后重新执行 `sync --apply`。
