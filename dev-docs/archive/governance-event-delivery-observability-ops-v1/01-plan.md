# 01 Plan

## Phases
1. Telemetry contract
2. Alert policy and SLO
3. Replay and incident operations
4. Verification and adoption

## Execution status
- [x] Step 1: telemetry contract freeze (`06-telemetry-contract-draft.md`)
- [x] Step 2: alert policy + SLO baseline (`07-alert-policy-and-slo.md`)
- [x] Step 3: replay approval SOP (`08-replay-approval-sop.md`)
- [x] Step 4: incident runbook + postmortem template (`09-incident-runbook.md`, `10-postmortem-template.md`)
- [x] Step 5: cross-task naming consistency with `T-009`

## Detailed steps
- Step 1: 定义 delivery telemetry 指标词典。
  - Output: metric dictionary（name/type/source/aggregation）。
  - Done when: 与 delivery 状态机一一对应。
- Step 2: 定义告警策略与阈值。
  - Output: alert matrix（trigger/severity/owner/action）。
  - Done when: 支持 warn/error/critical 分级。
- Step 3: 定义 dead-letter 回放与审批门禁。
  - Output: replay SOP + approval checklist。
  - Done when: 回放动作均有审计闭环。
- Step 4: 编写 incident runbook 与复盘模板。
  - Output: runbook + postmortem template。
  - Done when: 新人可按文档完成一次演练。
- Step 5: 与 `T-009` 对齐字段与命名。
  - Output: cross-task contract checklist。
  - Done when: 无命名冲突与重复定义。

## Risks and mitigations
- Risk: 指标过多导致运营成本上升。
  - Mitigation: 先定义核心指标，再扩展辅助指标。
- Risk: 告警过敏导致忽略真实故障。
  - Mitigation: 引入告警抑制与升级策略。
- Risk: 回放流程权限边界不清晰。
  - Mitigation: 强制审批角色和审计记录。

## Dependency order
1. `T-008` policy baseline
2. `T-009` delivery execution fields
3. `T-010` observability and ops contract freeze
