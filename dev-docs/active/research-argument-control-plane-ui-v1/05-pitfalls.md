# 05 Pitfalls

## P-001 UI can regress into a text report instead of a control plane
- Symptom:
  - 首版只显示 prose summary，没有 branch / blocker / coverage 的结构化视图。
- Prevention:
  - 保持最小视图集为强制项，而不是可选增强。

## P-002 UI can leak adjacent bounded-context ownership
- Symptom:
  - 控制面开始承担 title-card 或 paper-project 的主编辑流。
- Prevention:
  - 只消费 research-argument read models；跨边界编辑通过明确 bridge/links 进入相邻模块。
