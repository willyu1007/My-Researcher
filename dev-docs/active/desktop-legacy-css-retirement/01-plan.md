# 01 Plan

## Phases
1. Requirement/task bootstrap and ownership reset
2. Declare the legacy compatibility layer
3. Hard-freeze the layer
4. Migrate legacy interface clusters in waves
5. Remove legacy imports and governance exclusion
6. Final verification and handoff

## Detailed steps
- Phase 1:
  - 在 `.ai/project/main/registry.yaml` 新增 `R-010 Desktop legacy CSS retirement and governance freeze`。
  - 创建 `dev-docs/active/desktop-legacy-css-retirement/` 任务包，并通过 governance sync 生成 `T-022`。
  - 在任务文档中写清楚：
    - `T-017` 是历史前置拆分任务
    - `T-021` 只负责 gate 拉绿与 renderer scan coverage，不再承担 legacy CSS 退役主权
    - `T-022` 是唯一 retirement owner
- Phase 2:
  - 在 UI context 文档里声明 legacy CSS 的当前身份：
    - 仍是运行依赖
    - 只作为 compatibility layer 存在
    - `app-layout.css` 是唯一 legacy 聚合入口
  - 在代码侧通过注释和 README 固化边界，不改任何运行语义。
- Phase 3:
  - 在根 `AGENTS.md` 和任务架构文档写明冻结规则：
    - 新功能不得新增对 `apps/desktop/src/renderer/styles/**` 的依赖
    - 新 UI 只能走 `data-ui` / token / contract 路线
    - 只有 `T-022` 及其后续迁移子任务可以修改 legacy CSS
  - 保持 `ui/config/governance.json` 对 styles 目录的 exclusion，不把临时治理手段误写成合规完成。
- Phase 4:
  - Wave A: `shell/*`
  - Wave B: `modules-paper-writing.css`
  - Wave C: `literature-overview.css`
  - Wave D: `literature-auto-import/*`
  - Wave E: `literature-manual-import/*`
  - 每一波都按“迁移界面 -> 移除 import -> 删除 legacy 文件”执行。
- Phase 5:
  - 当所有 legacy 界面迁移完成后，从 `app-layout.css` 移除 feature CSS import。
  - 清空或删除 `apps/desktop/src/renderer/styles/**` 剩余遗留文件。
  - 从 `ui/config/governance.json` 去掉对 styles 目录的 exclusion。
- Phase 6:
  - 跑 governance sync/lint、desktop typecheck、UI suite、UI gate。
  - 记录最终 retirement 证据与 handoff。

## Deliverables by phase
- Phase 1:
  - `R-010` / `T-022` registry 映射与任务包
- Phase 2:
  - UI context、README、聚合入口声明
- Phase 3:
  - 冻结规则与 owner 边界
- Phase 4:
  - 每一波的迁移实现与 import 删除
- Phase 5:
  - styles 目录退役与 governance exclusion 收回
- Phase 6:
  - 最终验证记录

## Immediate tranche acceptance
- `R-010` / `T-022` 已可在 project hub 中看到。
- 仓库内对 legacy CSS 的官方口径统一为“兼容层，保留运行，准备退役”。
- 未来 implementer 不需要猜“能不能继续往旧 CSS 里写”，答案固定为“不能，除非是 `T-022` 迁移任务”。
