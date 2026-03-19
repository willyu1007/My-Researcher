# 01-plan

## Phases
1. Baseline inventory and compatibility contract
2. Domain normalizer split
3. Shell/base CSS split
4. Auto-import CSS split
5. Manual-import CSS split
6. Import-order reconciliation and verification

## Phase details
### Phase 1 - Baseline inventory and compatibility contract
- Deliverables:
  - `normalizers.ts` 导出清单与调用面盘点
  - CSS import order 清单
  - 关键 selector / `data-ui` 兼容基线
- Acceptance:
  - 后续拆分有明确回归基线
  - 已确认哪些调用点只允许 import rewrite，不允许语义变化
- Verification:
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`

### Phase 2 - Domain normalizer split
- Deliverables:
  - domain normalizer 子文件组
  - 兼容 barrel 导出
  - 最小调用点改写
- Acceptance:
  - manual import / auto-pull / overview / metadata / common helper 边界可用文件结构说明
  - 外部调用不需要一次性全量改写
- Verification:
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`

### Phase 3 - Shell/base CSS split
- Deliverables:
  - `shell.css` 收敛
  - shell/topbar/sidebar/governance 基础块拆出
  - 兼容聚合入口
- Acceptance:
  - `shell.css` 不再含大量 literature/manual/topic feature 语义
  - import order 可解释且可复用
- Verification:
  - `pnpm --filter @paper-engineering-assistant/desktop build`

### Phase 4 - Auto-import CSS split
- Deliverables:
  - topic/rule/run/editor 样式子文件组
  - auto-import 样式聚合入口
- Acceptance:
  - auto-import 样式结构能按 feature 子域定位
  - selector 文本保持兼容
- Verification:
  - `pnpm --filter @paper-engineering-assistant/desktop build`

### Phase 5 - Manual-import CSS split
- Deliverables:
  - upload/zotero/review/status 样式子文件组
  - manual-import 样式聚合入口
- Acceptance:
  - manual-import 样式结构能按子域定位
  - review table / upload / zotero 样式不再挤在单文件
- Verification:
  - `pnpm --filter @paper-engineering-assistant/desktop build`

### Phase 6 - Import-order reconciliation and verification
- Deliverables:
  - 最终 import order 说明
  - regression checklist
  - verification 记录
- Acceptance:
  - 不存在“文件拆开了，但没人知道聚合顺序为何如此”的问题
  - smoke 主流程无样式/运行回归
- Verification:
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - `pnpm --filter @paper-engineering-assistant/desktop build`
  - `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e`

## Entry criteria
- Wave 1B 或等效前端边界收口完成。
- `T-011` 对 `normalizers.ts` 的活跃修改已吸收或停稳。
- 现有 CSS import order 基线已记录。

## Exit criteria
- normalizer 与 CSS 的边界可通过目录/聚合入口说明清楚。
- 兼容导出与兼容聚合层已明确，后续不必再回到单个超大文件理解全局。
- 下游前端迭代无需继续在同一份大杂烩 utility/CSS 中追加语义。

