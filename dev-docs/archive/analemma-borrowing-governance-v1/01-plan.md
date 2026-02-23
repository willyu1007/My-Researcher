# 01 Plan

## Phases
1. Bundle initialization and baseline alignment
2. Borrowing adaptation artifacts completion
3. Governance mapping and consistency verification

## Detailed steps
- Step 1: 创建 `T-005` 目录、`.ai-task.yaml`、`roadmap.md`、`00~05`。
- Step 2: 在 `02-architecture.md` 固化借鉴机制到 `M1~M8` 的映射，并声明 owner 边界。
- Step 3: 产出 `06-borrowing-matrix.md`，覆盖 8 类借鉴项（来源 -> 对象 -> gate -> owner -> 字段）。
- Step 4: 产出 `07-integration-adjustment-plan.md`，定义前后端联动调整策略与拆任务入口。
- Step 5: 产出 `08-interface-delta-spec.md`，给出 REST/event/type 增量与兼容性约束。
- Step 6: 更新 `.ai/project/main/registry.yaml`，新增 `R-003` 与 `T-005` 映射。
- Step 7: 执行治理同步与校验：
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Step 8: 将命令证据与人工检查结果记录到 `04-verification.md`。

## Deliverables by phase
- Phase 1:
  - `roadmap.md`, `00~05`, `.ai-task.yaml`
- Phase 2:
  - `06-borrowing-matrix.md`, `07-integration-adjustment-plan.md`, `08-interface-delta-spec.md`
- Phase 3:
  - registry 增量、sync/lint 结果、派生视图更新

## Risks & mitigations
- Risk: 越权覆盖 `T-002/T-003` SSOT。
  - Mitigation: 只做借鉴适配增量；正文主权保持在原任务。
- Risk: 接口增量定义与现有契约冲突。
  - Mitigation: 仅定义可空字段与新增事件，不改既有字段语义。
- Risk: 治理索引不同步导致 task 视图漂移。
  - Mitigation: 强制执行 `sync + lint`，并记录验证结果。

## Acceptance criteria (step-level)
- 每个步骤都必须满足：
  - 输入明确（来源文件/命令）
  - 输出明确（新文档/新增条目）
  - 验证明确（命令或人工检查）
