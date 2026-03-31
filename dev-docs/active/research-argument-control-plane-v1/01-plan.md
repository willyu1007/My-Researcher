# 01 Plan

## Phases
1. Governance intake and child-task setup
2. Contracts and SSOT normalization
3. Graph/state V1 baseline
4. Title-card and paper-project bridge
5. Desktop control plane V1
6. Planner / Critic Hub V1.5
7. Verification, sync, and handoff

## Detailed steps
- Phase 1:
  - 创建 `R-011` 与 `T-023` 到 `T-028` 的治理映射。
  - 固定 `T-014` / `T-021` / `T-003` 与本任务的 ownership split。
- Phase 2:
  - 执行 `T-024`，把 `research-varify` 规范化到仓库 SSOT。
  - 落 shared contracts、context registry、glossary 增量与 cross-link。
  - 补 `requirements.md` 映射章节与 coverage matrix。
- Phase 3:
  - 执行 `T-025`，落对象图最小集合、9 维状态、decision / lesson log、state recompute。
  - 将 `Baseline / Protocol / ReproItem / Run / Artifact / Boundary / ReportProjection` 纳入 V1 owner。
- Phase 4:
  - 执行 `T-026`，实现 `title-card` seed/init、readiness verify、`SubmissionRiskReport` / `WritingEntryPacket` sidecar 和 paper-project bridge。
- Phase 5:
  - 执行 `T-027`，在稳定 read models 上实现 desktop control plane V1，并补 risk report / handoff preview 视图。
- Phase 6:
  - 执行 `T-028`，补 candidate generation、bundle ranking、CriticHub、RuleEngine、RiskReportAssembler、memory、async orchestration。
- Phase 7:
  - 执行 governance sync/lint、context verify、相关 typecheck/test，并更新 handoff 文档。

## Execution order constraints
- `T-024` 必须先于 `T-025` 到 `T-028`。
- `T-025` 必须先于 `T-026` 和 `T-027`。
- `T-026` 与 `T-027` 可在 `T-025` read model 稳定后并行。
- `T-028` 不得在 V1 graph/state 未闭环前启动实现。
- `createPaperProject` 公共合同在本轮保持不变；handoff 通过 sidecar packet/report refs 接入。

## Cross-package review gates
- Before `T-025` starts:
  - `T-024` 必须完成 canonical 落点、术语冻结、shared contract 分组和 requirements 映射 review。
- Before `T-026` / `T-027` start implementation:
  - `T-025` 必须完成 runtime object ids、read-model DTO、recompute 语义、metadata hooks 的 review 和收口。
- Before `T-028` starts implementation:
  - `T-026` / `T-027` 必须完成 readiness gate、sidecar handoff artifact、UI explainability surface 的 joint review。
- Before umbrella task closes:
  - 必须走通 `title-card -> workspace -> risk report / writing packet -> paper-project` 的端到端 walkthrough。
  - 必须明确记录仍由 downstream writing lane 持有的能力，不允许留下未归属 requirement。

## Risks & mitigations
- Risk: 与 `R-009` title-card 决策层重叠。
  - Mitigation: 明确 `title-card` 是输入 owner，本任务只读和桥接。
- Risk: 与 `paper-project` stage-gate 语义重复。
  - Mitigation: 本任务只处理 pre-writing argument convergence，不接管 downstream writing governance。
- Risk: 在没有 V1 基座前就进入 planner / critic，范围失控。
  - Mitigation: 强制 `T-028` 后置到 `T-025` / `T-026` / `T-027` 验证之后。
- Risk: requirements 中的 risk report / handoff 被留成隐性空白。
  - Mitigation: 将 `SubmissionRiskReport` / `WritingEntryPacket` 设为本组显式产物，并在 coverage matrix 中标明 owner。
