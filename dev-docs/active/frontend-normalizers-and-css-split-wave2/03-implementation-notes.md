# 03-implementation-notes

## Current state
- 任务包已创建，尚未进入产品代码实施。
- `sync --apply` 已分配任务 ID：`T-017`。
- 本包聚焦 utility/style 边界，不处理 controller/view 结构，不改 backend/shared contract。

## Package contract review
### Review 1 - Overlap lock
- Reviewed on: 2026-03-19
- Findings:
  - `normalizers.ts` 与 `T-011 literature-management-flow` 存在真实重叠。
  - Wave 1B 未完成前，style/utility 归属容易漂移。
- Closure:
  - 已将这两个条件写成显式 entry gate；未满足前不得启动本包。

### Review 2 - Compatibility lock
- Reviewed on: 2026-03-19
- Findings:
  - `normalizers.ts` 必须保留兼容 barrel。
  - CSS 拆分的核心风险不是文件数量，而是 import order / cascade。
- Closure:
  - 兼容 barrel 与聚合入口已被写入硬合同。

## Decision log
| Date | Decision | Rationale | Follow-up |
|---|---|---|---|
| 2026-03-19 | Wave 2 独立建包 | 避免与 Wave 1B 的 controller/view 拆分混在一起 | 待 Wave 1B 稳定后再启动 |
| 2026-03-19 | `normalizers.ts` 采取兼容 barrel 策略 | 减少 consumer 一次性迁移成本 | 实施时记录调用点切换节奏 |
| 2026-03-19 | CSS 聚合入口只负责 import order | 防止再次形成“新的大杂烩样式文件” | 在 verification 记录顺序原因 |

## Phase 1 - Baseline inventory
- Reviewed on: 2026-03-19
- Findings:
  - `normalizers.ts` 当前为 `1475` 行，导出面天然分成 common/manual-import/auto-pull/governance/overview/metadata 六组。
  - `app-layout.css` 当前 import order 为：`shell.css -> literature-base.css -> literature-auto-import.css -> literature-manual-import.css -> literature-overview.css -> modules-paper-writing.css`。
  - `shell.css` 中仍残留 manual/auto/overview/paper-writing 的重复 selector，而这些块已经在对应 feature 样式入口中存在。
  - `literature-base.css` 已承载大量共享 literature workspace selector，可继续作为 shared literature layer。
- Closure:
  - Wave 2 的拆分策略固定为：
    - `normalizers.ts` 改为 compatibility barrel，真实实现落到 `shared/normalizers/*`
    - `shell.css` 改为 shell/governance 聚合层
    - 共享 literature selector 保持在 `literature-base.css`
    - auto/manual import CSS 改为 feature 聚合入口 + 子模块

## Phase 2 - Normalizer decomposition
- Reviewed on: 2026-03-19
- Findings:
  - `normalizers.ts` 已从单文件 `1475` 行收敛为 `1` 行兼容 barrel。
  - 实际实现拆成 `common / manual-import / governance / auto-pull / overview / metadata` 六个模块。
  - `shared/normalizers/index.ts` 作为域级 public API，consumer 无需立刻迁移 import path。
- Closure:
  - 兼容层保留为 `apps/desktop/src/renderer/literature/shared/normalizers.ts -> ./normalizers/index`
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck` 已验证 barrel 拆分没有破坏现有类型边界

## Phase 3 - CSS decomposition
- Reviewed on: 2026-03-19
- Findings:
  - `shell.css` 从 `3722` 行收敛为 `64` 行聚合入口，仅保留 shell/governance import 与响应式规则。
  - `literature-auto-import.css` 收敛为 `62` 行聚合入口，拆出 `runs / topic-settings / rule-center / shell-compat` 四个子模块。
  - `literature-manual-import.css` 收敛为 `22` 行聚合入口，拆出 `panels-zotero / upload / review / shell-compat` 四个子模块。
  - shell 中仅存的 feature-only selector 缺口被补到对应 feature 子模块：`brand-icon` 进入 shell topbar，topic rule legacy row selector 进入 auto-import rule-center。
- Closure:
  - `shell-compat.css` 采用“在 feature 基础样式之前导入”的顺序，保留原有 shell -> feature cascade，不把历史兼容规则意外激活到更高优先级
  - `app-layout.css` import order 保持不变：`shell.css -> literature-base.css -> literature-auto-import.css -> literature-manual-import.css -> literature-overview.css -> modules-paper-writing.css`

## Phase 4 - Verification and closure review
- Reviewed on: 2026-03-19
- Findings:
  - desktop `typecheck / build / smoke:e2e` 全通过。
  - `build` 重新生成了 desktop renderer dist 产物；这是预期副作用，不属于功能回归。
  - 工作区存在与本任务无关的未跟踪文件 `apps/backend/src/services/topic-management.service 2.ts`，本包未触碰。
- Closure:
  - `T-017` 达到收尾条件，可切换到 Wave 3 backend boundary 拆分
  - 后续任务不得把 feature selector 回流到 `shell.css`，也不得移除 `normalizers.ts` 兼容 barrel，除非有单独治理决策

## Phase 5 - Post-close quality hardening
- Reviewed on: 2026-03-19
- Findings:
  - class 集合对比发现 `literature-defaults-grid` 在 manual-import CSS 拆分后漏掉，`build` 不会直接报错，但会造成低频 UI 布局样式丢失。
  - 尝试把 `normalizers.ts` 改成 `export * from './normalizers'` 时触发了自引用解析问题，因为同目录下同时存在 `normalizers.ts` 文件和 `normalizers/` 目录。
  - 工作区中存在无效未跟踪副本 `apps/backend/src/services/topic-management.service 2.ts`。
- Closure:
  - `literature-defaults-grid` 已补回 manual review 子模块。
  - `normalizers.ts` 保持显式 `./normalizers/index` 兼容出口，不再使用目录短路径。
  - 无效副本文件已删除。

## Handoff notes
- 实施前先核对：
  - `T-011` 最新 `normalizers.ts` baseline
  - 当前 CSS import order 清单
  - Wave 1B 是否已稳定 container/view 边界
- Wave 2 完成后保持：
  - `normalizers.ts` 只作为兼容出口，不再重新堆业务实现
  - `shell.css` 只承载 shell/governance 聚合，不再重新引入 literature/manual/auto/overview selector
  - 若再次拆 CSS，必须补做“旧 class 集合 vs 新模块 class 集合”的对比检查
