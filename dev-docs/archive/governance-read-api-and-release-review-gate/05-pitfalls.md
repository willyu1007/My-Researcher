# 05 Pitfalls

## Do-not-repeat summary
- 不要让 controller 直接拼接 Prisma 查询，必须经 service/repository 分层。
- 不要在 release-review 接口复用无关写路径，避免越权写入。
- 不要在新增字段上默认 required，首版必须兼容可空。

## Append-only resolved log
### 2026-02-23 — 防止接口与治理语义双写
- Symptom:
  - 接口实现任务容易与 `T-003` 治理语义文档同时修改，出现双写风险。
- Root cause:
  - 语义定义与实现契约相邻，边界不明确时易交叉覆盖。
- What was tried:
  - 评估继续在 `T-003` 内扩展实现。
- Fix / workaround:
  - 新建 `T-007`，仅承载后端契约实现与验证。
- Prevention:
  - 所有语义调整先回到 `T-003/T-005`，`T-007` 只消费已冻结契约。
