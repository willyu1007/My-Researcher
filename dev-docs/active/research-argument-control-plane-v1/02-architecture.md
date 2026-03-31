# 02 Architecture

## Purpose
- 固定 `Research Argument Control Plane` 在当前产品中的位置、边界、 ownership split 与 phased delivery 约束，避免后续子任务重复拍板。

## Architectural position
- Upstream owners:
  - `T-014 automated-topic-management`
  - `T-021 topic-management-workbench-ui`
- New middle layer:
  - `ArgumentObjectGraph`
  - `AbstractState`
  - `StateSynthesizer`
  - readiness / decision / bridge services
  - desktop control plane
- Downstream owner:
  - 现有 `paper-project` lifecycle / stage-gate / writing-package 主线

## Frozen ownership split
- `title-card` 相关公开对象、路由、UI workflow 仍由 `T-014` / `T-021` 维护。
- `paper-project` 相关公开对象、version spine、release gate 仍由现有 research-lifecycle 维护。
- 本任务新增的 canonical surface 是 research-argument domain；它可以读取上游并桥接下游，但不得重定义两侧已有公开语义。

## Frozen interface seam
- Input seam:
  - `title-card`
  - `NeedReview`
  - `ResearchQuestion`
  - `ValueAssessment`
  - selected literature evidence
- Middle-layer outputs:
  - workspace / branch / graph snapshot
  - abstract readiness state
  - decision log
  - submission risk report
  - writing entry packet
  - readiness verify result
- Downstream seam:
  - bridge into existing `createPaperProject` flow
  - sidecar packet/report refs for downstream writing lane
  - no rewrite of `paper-project` contracts in V1

## Requirements coverage matrix
| Requirement / journey slice | Coverage mode | Owner |
| --- | --- | --- |
| Journey 1: 研究想法到 Claims 定义 | owned | `T-024` + `T-025` |
| Journey 2: Claims 到 Evaluation 证据链构建 | owned | `T-025` + `T-026` + `T-028` |
| Journey 3: 投稿前风险审查输出 | owned | `T-026` + `T-027` + `T-028` |
| Journey 4: Rebuttal 生成 | handoff only | upstream packet from this task group, downstream owner = writing lane |
| Claims/Evidence/Baseline/Protocol/ReproItem 管理 | owned | `T-024` + `T-025` |
| Claims-to-Evidence Traceability 与 coverage 检查 | owned | `T-025` + `T-027` |
| reviewer-style 规则化自检报告 | owned for pre-writing slice | `T-028` assembles, `T-027` displays |
| 写作阶段章节建议与 Diff apply | external dependency | downstream writing lane |
| Markdown/LaTeX/Prism/Overleaf 编辑执行面 | external dependency | downstream writing lane |
| 本地优先 / sync eligibility / Git 弱映射 / audit metadata | owned as compatibility constraints | `T-025` + `T-026` + `T-028` |

## Phased delivery contract
- V1:
  - object graph minimum set
  - 9 readiness dimensions
  - manual / rule-driven state synthesis
  - continue / pivot / kill / archive decisions
  - submission risk report and writing handoff sidecar artifacts
  - desktop control plane minimum views
- V1.5:
  - candidate generation
  - bundle planning
  - CriticHub
  - RuleEngine
  - RiskReportAssembler
  - stagnation detection
  - memory / tabu
  - async task orchestration

## Cross-task dependency rules
- `T-024` is the SSOT writer for canonical docs / glossary / shared contracts.
- `T-025` owns persistence and state read models.
- `T-026` owns seed/init, risk/handoff sidecar artifacts, and bridge flows, but not title-card source objects.
- `T-027` owns desktop control-plane UX, risk-report review, and handoff preview, but not title-card workflow IA.
- `T-028` owns planner/critic/rule/report enhancement, but must consume `T-025` / `T-026` contracts instead of redefining them。

## Package handoff contract
| Producer task | Stable outputs before handoff | Primary consumer |
| --- | --- | --- |
| `T-024` | canonical docs paths, glossary terms, shared domain/read-model/bridge/advisory DTO names | `T-025` / `T-026` / `T-027` / `T-028` |
| `T-025` | runtime ids, graph persistence model, `WorkspaceSummary` / `AbstractStateSnapshot` / coverage / readiness / report projections | `T-026` / `T-027` / `T-028` |
| `T-026` | seed/init, readiness verify, decision action, `WritingEntryPacket`, `SubmissionRiskReport`, promote bridge refs | `T-027` / `T-028` / downstream writing lane |
| `T-027` | UI-to-read-model mapping, human confirmation/audit UX rules, explainability rendering rules | `T-028` / umbrella close review |
| `T-028` | planner/critic/rule/report output contracts, async/API governance constraints, advisory-to-authority rule | `T-027` / umbrella close review |

## Cross-cutting compatibility constraints
- local-first:
  - graph/report artifacts 默认本地可用，显式标记 sync eligibility / authorization metadata。
- Git:
  - 仅保留 weak mapping/ref，不引入 destructive Git flow。
- sync/cloud/vector:
  - 本组只定义 metadata hooks 和 compatibility constraints，不接管全局 sync 子系统实现。
- async/API governance:
  - retry/backoff、idempotency、cost、audit、observability 由 `T-028` 明确 owner。
