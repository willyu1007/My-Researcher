# 05 Pitfalls

## Do-not-repeat summary
- 不要在 `T-005` 中复制/重写 `T-002` 或 `T-003` 的 SSOT 正文。
- 不要在“文档先行”任务中混入接口实现或 UI 改造。
- 不要跳过 `sync + lint` 直接宣告治理映射完成。

## Append-only resolved log
### 2026-02-23 — 漂移风险前置规避
- Symptom:
  - 外部借鉴内容容易直接覆盖现有治理任务，造成双写漂移。
- Root cause:
  - 借鉴讨论天然跨越模块定义、阶段门禁、接口契约三个层面。
- What was tried:
  - 先评估并入 `T-003`，再对照单写者契约复核。
- Fix / workaround:
  - 新建 `T-005` 独立任务，只保留“借鉴适配层”职责。
- Prevention:
  - 任何借鉴条目必须标注 `SSOT owner` 和 `T-005 role`。
