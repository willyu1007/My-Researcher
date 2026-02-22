# 00 Overview

## Status
- State: in-progress
- Next step: 在 GitHub 首次运行更新后的 CI（含 Prisma smoke job）并记录 runner 侧证据

## Goal
- 将 8 模块能力按 4 阶段收敛为可执行路线，形成 LLM 驱动自动化流程和可追溯版本治理基线。

## Non-goals
- 不在本阶段交付完整生产级业务闭环（当前仅交付最小可运行治理骨架）。
- 不在本阶段定稿所有 UI 与交互设计。
- 不在无证据输入下自动生成结论性结果。
- 不在本任务重写 8 模块定义与批次清单（由 `T-002` 维护）。

## Context
- 已存在任务 `paper-assistant-core-modules` 提供首轮模块拆分。
- 当前任务新增重点：
  - 从“模块清单”升级到“4 阶段执行治理”。
  - 显式加入 LLM 自动化编排要求。
  - 对模块 4 到 7 建立版本链路和冻结门禁。
- 跨任务边界契约见：`dev-docs/active/llm-research-lifecycle-governance-v1/06-task-boundary-and-anti-drift.md`。

## Acceptance criteria (high level)
- [ ] 8 个模块有明确职责边界和依赖方向。
- [ ] 4 个阶段具备 entry/exit 门禁定义。
- [ ] 模块 4 到 7 形成统一版本主线（含 lineage 字段与冻结策略）。
- [ ] 并行线程场景下采用快照冻结（`SP-partial`/`SP-full`）并具备兼容性约束。
- [x] 已形成字段级接口契约文档（REST + events + snapshot pointer）。
- [x] 新任务已纳入 project governance registry 并可被 query/lint 识别。
- [x] 阶段治理文档仅引用 `T-002` 模块清单，不产生第二套 TP 定义。
- [x] 已形成 `Stage DAG + Value Gate` 统一词典并覆盖 M1 到 M8 与章节对象。
