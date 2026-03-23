# 05 Pitfalls

## Known risks

### P-001 Exception drift can be mistaken for compliance
- Symptom:
  - 团队把 `apps/desktop/src/renderer/styles` exclusion 误当成“旧 CSS 已合规”。
- Root cause:
  - UI gate 目前是通过 exclusion 避开 legacy CSS 存量，而不是证明这层已经迁移完成。
- Prevention:
  - 在 UI context 和本任务文档中持续强调：该 exclusion 是临时治理收口，不是 retirement 完成信号。

### P-002 Frozen layer can silently become the default escape hatch again
- Symptom:
  - 新模块或新需求又开始往 `styles/**` 里追加 class 和视觉规则。
- Root cause:
  - 若没有明确 owner 和硬冻结规则，legacy 层会重新变成“先写进去再说”的默认逃生口。
- Prevention:
  - 只允许 `T-022` 系列任务修改 legacy CSS，并在根 `AGENTS.md` 中写死该规则。

### P-003 app-layout.css can hide dependency sprawl
- Symptom:
  - 开发者以为自己没有直接 import legacy CSS，但实际上仍通过 `app-layout.css` 间接依赖这层。
- Root cause:
  - `app-layout.css` 是历史兼容聚合入口，隐含覆盖范围较大。
- Prevention:
  - 在 README 和 UI context 中明确其唯一入口身份，并按波次逐步收窄 import。
