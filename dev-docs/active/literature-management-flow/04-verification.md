# 04 Verification

## Automated checks
- [x] `pnpm --filter @paper-engineering-assistant/shared typecheck`
- [x] `pnpm --filter @paper-engineering-assistant/backend typecheck`
- [x] `pnpm desktop:typecheck`
- [x] `pnpm --filter @paper-engineering-assistant/backend test`
- [x] `pnpm desktop:build`
- [x] `python3 .ai/skills/features/ui/ui-governance-gate/scripts/ui_gate.py run --mode full`
- [x] `node .ai/tests/run.mjs --suite ui`
- [x] `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e`
- [x] 文献管理专项 E2E（本地脚本化链路：web-import -> manual import -> zotero-import -> overview -> metadata -> paper sync -> citation）

## Manual functional checks
- [ ] 自动联网导入：成功、部分失败、全失败、恢复重试。
- [ ] 手动上传：JSON/CSV/BibTeX 正常与异常文件。
- [ ] 文献库联动：公开库与授权库流程。
- [ ] 高级查询：多条件组合、保存查询、复用查询。
- [ ] 结果列表：快速浏览、行内操作、状态同步。
- [ ] 综览与分类：统计正确、编辑成功、错误回滚。
- [ ] 反馈一致性：关键操作均有内联与顶部提示。

## Usability checks
- [ ] 关键路径首轮操作可在 3 分钟内完成（导入 -> 查询 -> 元数据编辑）。
- [ ] 空态、加载态、错误态、保存态文案可理解。
- [ ] 中文术语一致，必要英文术语使用稳定。
- [ ] 桌面与小屏布局均可操作，无关键控件遮挡。

## Gray rollout checks
- [ ] 阶段 A：内部启用新标签页，旧流程保留。
- [ ] 阶段 B：新流程默认，验证 1 个周期无阻塞问题。
- [ ] 阶段 C：确认回滚条件与动作可执行。
- [ ] 回滚演练：能在单次发布窗口恢复旧流程。

## Result log
- 2026-02-26: `pnpm --filter @paper-engineering-assistant/shared typecheck` ✅
- 2026-02-26: `pnpm --filter @paper-engineering-assistant/backend typecheck` ✅
- 2026-02-26: `pnpm desktop:typecheck` ✅
- 2026-02-26: `pnpm --filter @paper-engineering-assistant/backend test` ✅（26 passed）
- 2026-02-26: `pnpm desktop:build` ✅（renderer/main build passed）
- 2026-02-26: `python3 .ai/skills/features/ui/ui-governance-gate/scripts/ui_gate.py run --mode full` ✅
- 2026-02-26: `node .ai/tests/run.mjs --suite ui` ✅（run_id=`20260225-230100-3e6b64`）
- 2026-02-26: `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e` ✅（desktop-smoke PASS，后端与桌面协同链路通过）
- 2026-02-26: 文献管理专项 E2E（本地脚本）✅
  - `web-import`: imported=1, scoped=1（含 1 条无效 URL 失败回执，失败可恢复验证通过）
  - `manual import`: imported=1，后续 metadata 更新成功（rights -> OA）
  - `zotero-import`（query=machine learning）: imported=0, scoped=0（接口成功，结果为空）
  - `overview`: total=2, in_scope=2, paper_links=2, cited=1（链路数据一致）
  - `paper sync + citation update`: linked=2，citation 更新为 cited 成功
- 2026-02-26: Zotero 专项补充 E2E（无 query）✅
  - 请求：`library_type=groups, library_id=2430503, limit=5`
  - 结果：`imported=5, scoped=5, results=5`（样例标题：`Prospects of insects as food and feed`）
- 2026-02-26: 标签与布局调整回归（3 标签 + 扁平分区）✅
  - `pnpm desktop:typecheck` ✅
  - `pnpm desktop:build` ✅
- 2026-02-26: 筛选语义强化与去卡片化回归（筛选徽标 + 摘要条 + 下划线标签）✅
  - `pnpm desktop:typecheck` ✅
  - `pnpm desktop:build` ✅
  - `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e` ✅（`desktop-smoke PASS`）
  - `python3 .ai/skills/features/ui/ui-governance-gate/scripts/ui_gate.py run --mode full` ✅
- 2026-02-26: `node .ai/tests/run.mjs --suite ui` ✅（run_id=`20260225-234227-2a75f3`）
- 2026-02-26: 顶栏 Tab + 综览内筛选回归 ✅
  - `pnpm desktop:typecheck` ✅
  - `pnpm desktop:build` ✅
  - `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e` ✅（`desktop-smoke PASS`）
- 2026-02-26: 顶栏 Tab 可点击修复 + 左对齐位置修正 ✅
  - `pnpm desktop:typecheck` ✅
  - `pnpm desktop:build` ✅
  - `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e` ✅（`desktop-smoke PASS`）
- 2026-02-26: 自动导入 Tab 需求对齐回归（状态拆分 + 失败重试 + URL 结果明细）✅
  - `pnpm desktop:typecheck` ✅
  - `pnpm desktop:build` ✅
- 2026-02-26: 自动拉取系统改造回归（规则驱动 + 异步 run + 旧接口移除）✅
  - `pnpm --filter @paper-engineering-assistant/shared typecheck` ✅
  - `pnpm --filter @paper-engineering-assistant/backend typecheck` ✅
  - `pnpm --filter @paper-engineering-assistant/backend test` ✅（34 passed）
  - `pnpm desktop:typecheck` ✅
  - `pnpm desktop:build` ✅
  - 关键覆盖：
    - Topic settings / auto-pull 规则 CRUD、run 触发、retry failed sources、alerts ack（集成测试通过）
    - 单飞跳过告警、无数据源失败告警、scheduled due 判定、retry 路径（单测通过）
    - `/literature/web-import`、`/literature/search` 删除后 404 回归（集成测试通过）
- 2026-02-26: Manual functional checks / usability checks / gray rollout checks 尚未执行（需人工验收）。
