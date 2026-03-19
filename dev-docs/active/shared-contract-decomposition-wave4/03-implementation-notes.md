# 03-implementation-notes

## Current state
- 已进入产品代码实施，当前采用 compat aggregator + bounded-context files 策略。
- `sync --apply` 已分配任务 ID：`T-019`。
- 本包聚焦 shared contract internal decomposition，不改变 contract 对外业务语义。

## Package contract review
### Review 1 - Consumer lock
- Reviewed on: 2026-03-19
- Findings:
  - 当前 `interface-field-contracts.ts` 主要通过 `research-lifecycle/index.ts` 和 shared 顶层 barrel 暴露。
  - 因此本包真正的风险不只是拆文件，而是破坏 barrel compatibility。
- Closure:
  - barrel compatibility 已被写成硬合同，consumer audit 为强制 entry gate。

### Review 2 - Overlap lock
- Reviewed on: 2026-03-19
- Findings:
  - `T-011` 对 `interface-field-contracts.ts` 有真实扩展记录。
  - `T-014` 通过同一 `research-lifecycle/` barrel 暴露 sibling contracts。
- Closure:
  - 已将 `T-011` baseline 吸收与 sibling compatibility 写入实施前门槛。

## Decision log
| Date | Decision | Rationale | Follow-up |
|---|---|---|---|
| 2026-03-19 | Wave 4 独立建包 | shared contract 拆分影响面最广，必须最后处理 | 以前几波稳定为前提 |
| 2026-03-19 | 保留 `interface-field-contracts.ts` 兼容聚合层 | 避免 consumer 一次性大迁移 | 实施时记录哪些导出仍需长期兼容 |
| 2026-03-19 | cleanup compat layer 不并入本包 | 防止同一任务同时承担拆分和彻底迁移 | 如有需要后续单独立项 |
| 2026-03-19 | 先做 compat aggregator，再做 consumer 迁移 | 当前没有 direct-import pressure，优先降低 shared monolith 风险 | 本包完成后不强制 backend/desktop 迁移到新路径 |

## Wave log
### Wave 4 baseline freeze
- Reviewed on: 2026-03-19
- Findings:
  - direct import audit 显示当前只有 `packages/shared/src/research-lifecycle/index.ts` 直接引用 `interface-field-contracts.ts`。
  - backend/desktop consumers 主要通过 `packages/shared/src/index.ts` 和 `research-lifecycle/index.ts` 获取导出。
  - `pnpm --filter @paper-engineering-assistant/shared test` 通过。
  - `pnpm --filter @paper-engineering-assistant/backend typecheck` 已在 `T-016` 收尾时保持绿色。
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck` 通过。
- Closure:
  - compat aggregator 方案成立，不需要 consumer 一次性迁移。

### Wave 4 implementation
- Implemented on: 2026-03-19
- Scope:
  - `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
  - `packages/shared/src/research-lifecycle/research-lifecycle-core-contracts.ts`
  - `packages/shared/src/research-lifecycle/paper-project-contracts.ts`
  - `packages/shared/src/research-lifecycle/literature-contracts.ts`
  - `packages/shared/src/research-lifecycle/auto-pull-contracts.ts`
- Changes:
  - 将原始 `interface-field-contracts.ts` 降为 compat aggregator，只做 `export *` 聚合。
  - 新增 `core / paper-project / literature / auto-pull` 四个 bounded-context contract 文件。
  - 保持 `research-lifecycle/index.ts -> interface-field-contracts.ts -> bounded-context files` 的旧路径兼容。
- Review closure:
  - consumer audit 继续成立，当前 repo 内没有 direct-import pressure。
  - backend consumers 暴露出的遗漏 shape 已补回到 `literature-contracts.ts`，兼容原响应结构。

### Wave 4 post-review hardening
- Implemented on: 2026-03-19
- Scope:
  - `packages/shared/src/research-lifecycle/topic-management-contracts.schema.test.ts`
- Changes:
  - 将 compat barrel 回归校验并入 shared 现有稳定测试入口，避免 `ts-node/esm` 多入口噪音影响 CI/本地执行。
  - 新增 `interface-field-contracts` runtime value export surface 审计。
  - 新增关键 contract helper/schema reachability 校验，并用 type-only smoke 锁定 compat barrel 的代表性导出。
- Review closure:
  - `T-019` 不再只依赖 consumer typecheck 证明兼容；shared 自身已经对 compat barrel 做了显式回归。
  - 保留旧路径兼容的同时，bounded-context contract files 的聚合关系已被测试固定。

## Closure summary
- Completed on: 2026-03-19
- Outcome:
  - `interface-field-contracts.ts` 由单体合同文件收敛为 `4` 行 compat aggregator。
  - 共享合同已按 `core / paper-project / literature / auto-pull` 分域落盘。
  - backend/desktop 继续通过既有 shared barrel 获取导出，无需迁移。

## Handoff notes
- 实施前先核对：
  - `T-011` 最新 shared baseline
  - backend/desktop consumer audit
  - `research-lifecycle/index.ts` 与顶层 shared barrel 的当前导出面
