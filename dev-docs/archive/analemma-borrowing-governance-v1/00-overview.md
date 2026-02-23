# 00 Overview

## Status
- State: done
- Next step: 任务文档归档到 `dev-docs/archive/analemma-borrowing-governance-v1` 并保持只读。

## Goal
- 将 Analemma/FARS 可借鉴机制沉淀为本项目治理适配层，形成可执行文档包与项目治理映射（`R-003/T-005`）。

## Non-goals
- 不实施任何业务代码、UI 页面、后端接口落地。
- 不修改 `T-002` 的模块清单正文与 `T-003` 的阶段治理正文主权。
- 不引入非 LLM 默认研究方向规则。

## Context
- 借鉴源为外部自动科研系统的公开机制（阶段状态、时间线、资产、成本、审查门）。
- 当前仓库已有 `T-003` 的治理基础与接口契约；本任务作为“外部借鉴适配层”输入。
- 任务边界受 `dev-docs/active/llm-research-lifecycle-governance-v1/06-task-boundary-and-anti-drift.md` 约束。

## Acceptance criteria (high level)
- [x] `dev-docs/archive/analemma-borrowing-governance-v1/` 包含 `roadmap + 00~08 + .ai-task.yaml`。
- [x] `06-borrowing-matrix.md` 覆盖 8 类借鉴项并含 owner/value gate/字段落点。
- [x] `07-integration-adjustment-plan.md` 输出可拆分后续实现任务的联动方案。
- [x] `08-interface-delta-spec.md` 为现有契约的增量草案且兼容。
- [x] `.ai/project/main/registry.yaml` 已新增 `R-003` 与 `T-005` 并通过 sync/lint。
