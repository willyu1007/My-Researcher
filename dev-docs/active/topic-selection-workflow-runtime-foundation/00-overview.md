# 00 Overview

## Status
- State: done
- Closure / 对账收口（2026-07-05）: 工程范围全部达成或经联合决策处置——v1a N1–N9 harness 归一（本包 05 月主线，03/04 §2026-05-19..24）；v1b/v1c harness 与路由级集成由后续包吸收落地（T-107/T-108/T-115/T-123/T-127，证据见下方 AC 注记）；profile escalation runtime 判 **superseded**（`06-joint-decisions.md` **D-27**）；D-09 脚本迁移判据**修订**并经 18 脚本一次性审计 18/18 合规（**D-28**，证据 04 §2026-07-05）；v1a N6 supplemental 轮跨执行自动化的语义裁决**移交 T-089** backlog ⑤（现状=调用方按 `round_index` 重入，D-22 路由语义已锁）。**本包不归档**：`06-joint-decisions.md` 仍是 WorkflowHarness/AgentOrchestrator 边界 SSOT + 活跃 JD 台账（D-T128-00 协议有效，T-129 C-3 及后续 harness-touch 仍在此登记）；台账迁移或随包归档待 T-129 收口后另议。
- Progress: 2026-06 之后本包无自有工程改动；六月起的提交均为 JD 台账代记（D-T123-*/D-T127-*/D-T128-* 系列）与两笔经 T-128 Phase 4 对抗式复审的代持代码（D-T128-02 S1 / D-T128-03）。
- Task ID: `T-088`
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-009`
- Parent architecture package: `dev-docs/archive/topic-selection-decision-chain-redesign/`
- Trigger: T-068/T-079/T-080/T-081/T-082/T-084/T-085 acceptance exposed that v1a/v1b/v1c are individually testable, but workflow execution still lacks one runtime harness and one orchestration boundary.

## Goal
- Build a unified `WorkflowHarness` for topic-selection backend flows so mocked, Codex-assisted, and provider-backed runs share the same node contract, trace shape, fixture setup, and assertion model.
- Implement a generic `AgentOrchestrator` boundary that can execute ordinary agent workflow steps with explicit profile selection, retries, structured outputs, evidence assignment, and audit artifacts.
- Productize a profile escalation policy runtime so nodes can move from cheap/mock/local profiles to stronger provider profiles only when deterministic criteria require it.

## Non-goals
- Do not implement multi-agent debate itself in this package; only provide runtime primitives that a later debate package can consume.
- Do not rewrite v1a/v1b/v1c domain services or change their authority contracts.
- Do not make desktop UI changes.
- Do not add new provider secrets or commit local `.env.local`.

## Acceptance Criteria
- [x] `WorkflowHarness` can run v1a, v1b, v1c, and bridge-oriented topic-selection scenarios with stable fixtures and node-level assertions.（v1a N1–N9：本包 03/04 §2026-05-20..23，真 provider 九节点全链 §2026-05-23；v1b：`topic-selection-v1b-workflow-harness-service.ts`（T-107 起建，T-123/T-127 拆透扩建）；v1c 含 N5 create-paper-project-bridge：`topic-selection-v1c-harness-adapter.ts`（T-108）；bridge 全链场景：canary scenario `topic-selection.real-e2e.canary.v1` 达 PaperProject intake）
- [x] `AgentOrchestrator` exposes a provider-agnostic contract for structured LLM calls, tool/context inputs, evidence role outputs, and retry/escalation audit.（03 §2026-05-19/20；统一 `execution_spec` §2026-05-24；invocation provenance/audit envelope 契约校验后持久化）
- [x] ~~Profile escalation policy is deterministic, testable, and records why a profile was used or escalated.~~ **superseded**——显式 `execution_spec`/`execution_plan` 选择取代策略运行时，无自动升级路径（`06-joint-decisions.md` D-27，用户拍板 2026-07-05；D-05 边界保留为设计记录）
- [x] Harness supports three execution modes: mocked LLM, Codex-assisted/manual LLM stand-in, and real provider-backed LLM.（D-04 词汇 + 03 §2026-05-23 provider participation closure；v1b provider debate 路径另受 W-14 dormancy 产品门控，属产品发布门而非 harness 能力缺口）
- [x] Existing T-068/T-079/T-084/T-085 real-flow scripts can be migrated or wrapped without keeping duplicate runtime logic.（按 D-28 修订判据达成：quality-gate 断言迁入 scenario-runner 注册 id；18 脚本一次性审计 18/18 业务语义全经服务层/HTTP 路由，零自持运行时逻辑，04 §2026-07-05）
- [x] Unit and integration tests cover success, blocked, malformed output, retry, escalation, and audit persistence boundaries.（harness/orchestrator/coordinator 单测+集成覆盖前五类与 audit 边界；"escalation" 子句按 D-27 改判为显式 execution_spec/execution_plan 路径覆盖——mismatch 拒绝/双轨拒绝语义既有测试在案）
