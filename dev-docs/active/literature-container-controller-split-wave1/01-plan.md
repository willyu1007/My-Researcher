# 01-plan

## Phases
1. Baseline freeze and contract lock
2. Auto-import container decomposition
3. Auto-import controller decomposition
4. Manual-import controller decomposition
5. Host wiring reduction and compatibility cleanup
6. Verification and handoff

## Phase details
### Phase 1 - Baseline freeze and contract lock
- Deliverables:
  - 当前 `T-012` host baseline 记录
  - 当前 tab/controller 输入输出面盘点
  - props bundle / controller facade 方案
- Acceptance:
  - 明确哪些改动属于 Wave 1B，哪些必须留到 Wave 2
  - 明确 `AutoImportTab` / controller 对外兼容出口
- Verification:
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`

### Phase 2 - Auto-import container decomposition
- Deliverables:
  - `AutoImportTab.tsx` 主文件瘦身
  - topic/rule/run 相关 subviews 或 render modules
  - props typing 收紧，不再依赖 `Record<string, any>`
- Acceptance:
  - 视图逻辑能按子域定位
  - 主 container 不再定义大段重复 helper/render block
- Verification:
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - `pnpm --filter @paper-engineering-assistant/desktop build`

### Phase 3 - Auto-import controller decomposition
- Deliverables:
  - loader / commands / derived view models 子模块
  - 兼容 facade hook 或聚合出口
- Acceptance:
  - 数据加载、副作用命令、纯派生状态可分开理解和测试
  - 对外返回 shape 保持兼容或提供平滑过渡层
- Verification:
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`

### Phase 4 - Manual-import controller decomposition
- Deliverables:
  - upload / review / Zotero / submit 子边界
  - 对应命令和派生状态从单一 hook 中拆出
- Acceptance:
  - 高副作用流程不再与纯 UI state 派生缠绕
  - Zotero 逻辑可以独立定位，不再埋在大 hook 中段
- Verification:
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - `pnpm --filter @paper-engineering-assistant/desktop build`

### Phase 5 - Host wiring reduction and compatibility cleanup
- Deliverables:
  - `App.tsx` 最小接线调整
  - grouped DTO / command bundles
  - import surface 清理
- Acceptance:
  - `App.tsx` 不反向吸收 feature 细节
  - tab/container 接口更稳定
- Verification:
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`

### Phase 6 - Verification and handoff
- Deliverables:
  - verification 记录
  - handoff notes
  - 需要留给 Wave 2 的残留边界说明
- Acceptance:
  - 该包不再遗留“哪些属于 Wave 1B / 2”的模糊区
- Verification:
  - `pnpm --filter @paper-engineering-assistant/desktop typecheck`
  - `pnpm --filter @paper-engineering-assistant/desktop build`
  - `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e`

## Entry criteria
- 任务包已注册到 project hub。
- `T-015` 已完成波次与边界治理。
- `T-012` 当前实现可作为 host baseline 使用。

## Exit criteria
- 子视图、子控制器、host wiring 的边界都能用文件路径和出口说明清楚。
- 不再需要靠阅读超长单文件才能理解 auto/manual import 主流程。
- Wave 2 的样式/normalizer 工作被清晰留后，不与本包混淆。

