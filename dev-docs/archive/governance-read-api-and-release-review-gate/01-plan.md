# 01 Plan

## Phases
1. Contract freeze and architecture alignment
2. Read API implementation
3. Release review gate implementation
4. Event integration and verification

## Detailed steps
- Step 1: 将 `08-interface-delta-spec.md` 转换为后端 route/controller schema 与 service DTO。
- Step 2: 实现 timeline/resource-metrics/artifact-bundle 三个只读接口。
- Step 3: 实现 release-gate review 写接口，校验 payload 与审计字段。
- Step 4: 在 service 层补齐事件触发点（status/timeline/metrics/review）。
- Step 5: 补充 repository 查询与必要索引评估，保持查询性能可控。
- Step 6: 增加测试（schema 校验、happy path、至少一条负例）。
- Step 7: 运行 typecheck/test/smoke，并回填 `04-verification.md`。

## Risks & mitigations
- Risk: 契约字段与数据库映射不一致。
  - Mitigation: 在 controller 层统一 schema 校验并保持 DTO 显式映射。
- Risk: timeline 查询在大数据量下退化。
  - Mitigation: 增加分页/时间窗口参数与索引评估记录。
- Risk: 审核接口被误用为通用写入口。
  - Mitigation: 严格限制 action 范围，仅接受审查相关字段。
