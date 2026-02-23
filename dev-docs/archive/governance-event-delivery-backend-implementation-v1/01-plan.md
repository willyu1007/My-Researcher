# 01 Plan

## Phases
1. Adapter and envelope foundation
2. In-process delivery path
3. Durable-outbox compatibility path
4. Verification and rollout

## Detailed steps
- Step 1: 定义 delivery adapter 接口与 envelope DTO。
  - Output: adapter contract + type/schema。
  - Done when: 生产/消费双方都通过同一契约。
- Step 2: 接入现有事件生产点，落地 in-process 发布与重试。
  - Output: service/repository integration。
  - Done when: 成功与失败路径都可追踪。
- Step 3: 增加幂等去重和失败审计记录。
  - Output: dedupe strategy + audit fields。
  - Done when: 重复投递不产生重复副作用。
- Step 4: 设计 durable-outbox 升级点（可先关闭）。
  - Output: schema/migration 草案 + worker 边界。
  - Done when: 不影响现有 in-process 主路径。
- Step 5: 补充测试与回滚方案。
  - Output: tests + rollback checklist。
  - Done when: 关键场景可复现通过。

## Risks and mitigations
- Risk: 幂等键不稳定导致误判。
  - Mitigation: 固化 dedupe_key 生成规则并测试。
- Risk: outbox 写入与业务事务脱节。
  - Mitigation: 明确事务边界，先以文档冻结后再实现。
- Risk: delivery 抽象过深降低交付效率。
  - Mitigation: 先保留最小 adapter，避免过度设计。

## Dependency order
1. `T-008` delivery policy
2. `T-009` backend implementation
3. `T-010` observability + ops 联动校准
