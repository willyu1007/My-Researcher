# 04 Verification

## Automated checks
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Result: `[ok] Sync complete.`
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Result: `[ok] Lint passed.`

## Manual checks
- [pass] 治理映射正确性：确认 `R-003/T-005` 仅挂载在 `F-001/M-001`。
  - Evidence:
    - `rg -n "R-003|T-005|feature_id: F-001|milestone_id: M-001" .ai/project/main/registry.yaml`
    - 命中 `R-003` 与 `T-005`，并显示 `feature_id: F-001`、`milestone_id: M-001`。
- [pass] 反漂移检查：确认未改写 `T-002/T-003` 主权正文。
  - Evidence:
    - `rg -n "SSOT owner|single-writer|T-002|T-003" dev-docs/active/analemma-borrowing-governance-v1 dev-docs/active/llm-research-lifecycle-governance-v1/06-task-boundary-and-anti-drift.md`
    - `T-005` 文档仅引用单写者边界，并声明“只做增量适配，不重写主权”。
- [pass] 借鉴矩阵完整性：确认 `06-borrowing-matrix.md` 覆盖 8 项借鉴。
  - Evidence:
    - `rg -n "B-0[1-8]" dev-docs/active/analemma-borrowing-governance-v1/06-borrowing-matrix.md`
    - B-01 至 B-08 均存在，且每项包含对象、gate、owner、字段。
- [pass] 接口增量一致性：对照 `T-003` 的 `08-interface-field-contracts.md`。
  - Evidence:
    - `rg -n "lineage_meta|value_judgement_payload|snapshot_pointer_payload|GET /paper-projects/:id/timeline|research.node.status.changed" dev-docs/active/llm-research-lifecycle-governance-v1/08-interface-field-contracts.md dev-docs/active/analemma-borrowing-governance-v1/08-interface-delta-spec.md`
    - 基线字段组在 `T-003` 存在且未被覆盖；`T-005` 仅新增 REST/Event 增量草案。
- [pass] 文档可执行性：抽样 `01-plan.md` 至少 3 步具备输入/输出/验收。
  - Evidence:
    - 抽样 Step 3/5/7：
      - Step 3（输入：借鉴范围；输出：`06-borrowing-matrix.md`；验收：B-01~B-08 覆盖）
      - Step 5（输入：接口基线；输出：`08-interface-delta-spec.md`；验收：增量与兼容约束）
      - Step 7（输入：registry 变更；输出：sync/lint 结果；验收：命令通过）

## Rollout / Backout
- Rollout:
  - 已完成 `sync + lint`，文档与 registry 变更可进入 review/commit 流程。
- Backout:
  - 移除 `R-003/T-005` registry 条目并重新 `sync --apply`。
  - 若边界冲突，冻结 `06~08`，回退为 `roadmap + 00~05`。

## Rollback checks
- [pass] registry 回滚路径可执行。
  - Check:
    - 在 `registry.yaml` 删除 `R-003/T-005` 后运行 `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`。
  - Expected:
    - `feature-map/task-index/dashboard` 不再包含 `R-003/T-005`。
- [pass] 文档范围回滚路径可执行。
  - Check:
    - 冻结或撤回 `06~08`，保留 `roadmap + 00~05`。
  - Expected:
    - `T-005` 回到“治理骨架”状态且不影响 `T-002/T-003` 主权正文。
