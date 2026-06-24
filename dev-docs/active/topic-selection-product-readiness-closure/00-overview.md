# 00 Overview

## Status
- State: planned
- Progress: **立项 2026-06-24** —— 由 `T-128 topic-selection-prompt-content-authoring` **重定范围（rename / re-scope）** 而来：原 T-128 只承接「prompt 正文产品化」单线，现升格为**选题管理产品就绪收口伞型包**，统一处理并收口**所有未闭环项**；原 prompt 撰写计划保留为本包 Phase 1。立项基于只读 grounding `wf_d4972427`（4 reader → 综合：开放项清单 / 治理规约 / 依赖排序 / 查漏）。尚未开工。
- Task ID: `T-128`（复用，未在 registry 注册过 → 本次随建包 sync 注册）
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-009`
- Depends on / 承接:
  - `T-127`（topic-selection-backend-hardening-and-expansion，**done 2026-06-24，W-01..W-13 全收口、核心段 Phase 0–4 sign-off**）—— 本包承接其遗留的产品就绪缺口（W-13 标定尾巴、D5 工作台延期、W-09 dormant debate plan、W-07 step f prompt 骨架延期）。
  - `T-123`（done 归档）—— inline prompt 撰写惯例 / debate 角色 prompt 形态参照；其 P-01 压缩恢复 confirm 义务由本包认领（见下）。
- Coordinates with（**不吸收，按 D6 联合决策协议**）:
  - `T-088`（topic-selection-workflow-runtime-foundation，**in-progress**）—— WorkflowHarness / AgentOrchestrator 边界（D-02/D-03）与 harness-touch 联合决策（D6）的 SSOT。本包凡触碰 harness 壳 / bounded-debate-core / orchestrator 的改动，**先在 T-088 `06-joint-decisions.md` 追加 `D-T128-0N` 联合决策**（承 `D-T127-02`）。
  - `T-124`（paper-implementation-productization-hardening）—— 共享 orchestrator 的 P-01 压缩恢复为跨包 JD；本包认领 topic-selection 侧回归确认半边。
- Writes-into（部分吸收）: `T-089`（topic-selection-agent-workflow-review，planned）—— 本包吸收其 **live-surface 切片**（产品跑真实穿越节点的 execution-type + WorkflowScenario 绑定）；穷举式 dormant/边缘节点复核留 T-089 backlog。
- Trigger: 2026-06-24 用户在 T-127 全收口后提出「另起一个任务包，面向处理和收口所有没有闭环的问题」，并锁定 4 个范围岔口（见下）。

## 背景 / Mission
T-127 把选题管理**后端骨架**彻底夯实并 sign-off（v1a/v1b/v1c 的 N1–N11 节点链 + paper-project bridge 在 `codex_assisted`/`mocked` 模式下端到端 functional、可穿越、有测）。但「**产品级端到端真选题**」还差几环，且 grounding 查出**数个无主/未追踪**的结构开口。本包的使命是把这些环**一站式收口或显式登记延期**，使 `run_mode:'product'` 的真实选题可达且可靠（product-reachable + product-robust）。

## 锁定的范围决策（locked 2026-06-24，用户拍板）
1. **T-128 处理 = 重命名/重定范围**：复用 T-128 id，原 prompt-content-authoring 升格为本伞型包；prompt 撰写降为 Phase 1。**不**新建 T-129、**不**留两个重叠包。
2. **provider_llm 生产接线（首次真跑）= 纳入核心**：注册 product-eligible `model_option_id` + 定义 `run_mode:'product'` WorkflowScenario + provider canary，在非 debate 路径完成**首次真实端到端产品跑**（N8/N6 维持 provisional + W-06 tripwire，debate 升级为 advisory/非阻断）。
3. **provider_llm debate 管路 = 现在预接（dormant behind tripwire）**：放宽 N6/N8 debate runtime 的 `execution_mode` 类型并集以承 `provider_llm` + 穿 `model_option_id`，管路就绪但**默认 dormant**、由 tripwire/标定门控开启（W-09 已铸 inert 的 provider-diverse execution_plan 作为未来 caller）。
4. **DoD = 宽 DoD**：直到全部**工程可闭环**结构项（P-01 压缩恢复 confirm 半边、N6 升级可达性、v1c-N2 生产接线、D5 HumanOverride）闭环才算 done。**唯一例外是物理不可由工程造出的外部硬门**（见 Phase 5）。

## 未闭环项清单（grounding `wf_d4972427`，分类）
> 分类：**closeable-by-us**（代码/文档可收口）｜**coordination-only**（跨包/SSOT，走 JD 协调）｜**externally-gated**（需真实语料/人工/产品决策，工程造不出）。

**closeable-by-us（本包核心驱动收口）：**
- 非-debate prompt 正文产品化（v1a need-discovery、v1b N2–N7 runtime-support、v1c promotion/delegated/feedback、resource-sampling）+ 逐项定稿 version & `prompt_packet_hash` 锚点 — M。
- live-surface 分类（T-089 切片）：产品跑真实穿越节点的 execution-type + WorkflowScenario 绑定，对齐**已迁移的 SSOT** `docs/context/process/topic-selection-workflow-matrix.md`（勿 re-fork） — M。
- 产品跑使能（**新，无主**）：注册/激活 product-eligible `model_option_id`（否则 harness 抛 `MISSING_PROVIDER_MODEL_OPTION`）+ 定义 product WorkflowScenario + 扩展已 done 的 real-e2e canary/scale 包 — M。
- N6 升级可达性硬化（**chip，无主**）：`regeneration_after_n6_gate_failure` 硬需的 `n6_gate_failure_retry_context` projection 未记录/穿线（现以 clean `debate_blocked` halt 兜底）+ crash-mid-debate / blocked-then-retry 幂等 — M。
- v1c-N2 bounded debate **+ v1c-N4 delegated-promotion 二者皆无生产 caller**（审计 `wf_034f15eb` 确认，仅 canary inline 自证、绕过 class）：v1c-N2 emission↔admission 对齐 + 接 caller + gate 入口 + 修 fixtures；v1c-N4 穿 delegated candidate 或文档化 reserved — 各需先定「接真 caller vs reserved」 — M（见 W-13）。
- W-13 stakeholder sign-off **工件 schema**（`requires_stakeholder_sign_off:true` 今天只是声明 flag、无 artifact/表）——纯代码 S，**语料到位即可翻门**。
- provider_llm debate 管路预接（决策 3）：放宽类型并集 + 穿 `model_option_id`，dormant — M。
- D5 工作台：HumanOverride **写面**（operator card + 后端 HTTP 路由 + audit label）+ Trace-snapshot **抽屉**（只读 trace 工件查看器）— M，**软门控**于 HumanOverride 权限边界产品 spec 先落。
- 文档卫生：回填 **T-127 `00-overview.md` stale 状态行**（仍写「Phase 2+ 待开工」）— S。

**coordination-only（走 JD，不在本包独立改 harness 本体）：**
- **P-01 压缩恢复**（共享 orchestrator）：`blockForCompressionAttempt` 只记录不恢复，超预算输入 fail-closed、**无 compress→re-gate→continue 分支**。T-123 D3 closure 要求「topic-selection 侧回归由 T-127 共同确认」但 T-127 收口未碰 → **此半边现孤儿**。本包以 `D-T128-0N` 正式认领 topic-selection 回归确认半边，与 T-124 + T-088 协调 — L。**当前最大未追踪开口**。
- STEP-7 debate 压缩-facts builder：N6/N8 debate 传 `compression_attempt:null`、未建 `requiredCompressionFacts` —— 严格在 P-01 压缩恢复**下游**，跟其后做，不独立建 — M。
- T-088 Phase 4/5 脚本迁移尾巴 / T-089 穷举 dormant 节点复核 —— 各有 owner，协调不吸收。

**externally-gated（Phase 5 尾巴，track-and-defer，物理不可工程收口）：**
- **N8/N6 阈值真标定 + 翻门**（`provisional:false` + 撤 tripwire）：阻塞于 ≥100 多 provider 人工标注语料 + FP<5% + 记录 sign-off + 独立 content-grounded assessor（带外）。工程造不出任何一个。维持 W-13 的 read-only/guard/banner 三重防（D8「骆驼鼻子」）。**排除出 DoD 的可达性核心**。
- 语料耦合 debate 正文（N6 三角色 / N8 bounded / value-assessment）：与标定语料同期定稿，**不盲写**，维持骨架 + 门控登记。
- provider_llm debate **开启**（非接线）：接线本包预做（决策 3），但**跑真 debate** 由同一标定语料门控。
- T-112 DB-backed cache index：成本/留存治理决策，非工程，**不在本包**。

## Goal
- 使 `run_mode:'product'` 的真实选题在**非 debate 路径**端到端可达（首次真跑 = 核心 sign-off），并把所有工程可闭环的结构缺口收口（宽 DoD）。
- 把无主/孤儿开口（P-01 confirm 半边、N6 可达性、v1c-N2、产品跑使能、sign-off 工件 schema）正式认领、ledger 化、收口。
- 把物理外部硬门（真标定 + 语料耦合正文）**显式 track-and-defer**，维持 tripwire，不伪造、不翻门。

## Non-goals
- 不在本包改 WorkflowHarness/AgentOrchestrator 边界本体——凡触碰先走 T-088 的 `D-T128-0N` JD。
- 不翻 `provisional:false`、不撤 tripwire、不把 dry-run 接成写阈值（违 D8）。
- 不盲写语料耦合 debate 正文为「已定稿」。
- 不引入第二套 prompt/context 装配路径（复用 T-112）；不改 `prompt_packet_hash` 算法（canonicalHash 单源）。
- 不做 T-088 脚本迁移尾巴 / T-089 穷举 dormant 复核（各有 owner）。

## Acceptance / DoD（宽 DoD）
- [ ] **Phase 0–4 全部工程可闭环项闭环**：非 debate prompt 定稿 + 首次真实产品跑 + live-surface 分类 + 产品跑使能 + P-01 压缩恢复（topic-selection 半边）+ N6 可达性 + v1c-N2 生产接线 + provider_llm debate 管路预接 + D5 HumanOverride/Trace + sign-off 工件 schema + 文档卫生。
- [ ] 每项：tsc / 全套件 / replay byte-identity 守卫绿；`topic-selection-llm-invocation-lint` 绿；harness-touch 项有 `D-T128-0N` JD 留痕。
- [ ] **Phase 5 外部尾巴**（真标定翻门 + 语料耦合正文 + provider_llm debate 开启）= 唯一显式延期，维持 tripwire + W-13 三重防，登记门控条件（≥100 多 provider 语料 + FP<5% + sign-off + 独立 assessor），**不计入可达性 sign-off**。
- [ ] 治理：registry 注册 T-128（新 slug）、`sync --apply` + `lint --check` 绿、`query T-128` 可见。
