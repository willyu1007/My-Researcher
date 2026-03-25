# 05 Pitfalls

## Known residual risks after implementation

### P-001 UI governance scan root or exception can drift
- Symptom:
  - 若 scan root 回退，`ui_gate.py` 会再次遗漏桌面工作台代码；若 exception 过期或被误删，gate 会重新被 legacy CSS 存量阻塞。
- Root cause:
  - governance 配置曾长期停留在 web-style 默认目录，桌面 renderer 直到本任务才纳入覆盖；而历史 CSS 尚未迁移到 token/contract 合规形态。
- Prevention:
  - 保留本轮新增的 `ui/config/governance.json` scan root、`apps/desktop/src/renderer/styles` exclusion 和对应 approval evidence；若要重新纳入 styles 目录，需先单开债务清理任务。

### P-002 legacy review/package enums can leak through Prisma rows if adapters skip normalization
- Symptom:
  - 若后续有人直接从 Prisma row 把历史 `question / topic_package` 字符串透传到 DTO，公开 contract 会再次出现旧枚举值。
- Root cause:
  - 物理层和历史 migration 仍保留旧 `Topic*` 命名，legacy 数据可能带着旧 enum literal 存量进入新语义面。
- Prevention:
  - 在物理命名迁移完成前，所有 title-card Prisma read adapter 都必须复用 `title-card-management-normalizers.ts`，不得手写 cast 直接暴露数据库原值。

### P-003 historical topic semantics can still re-enter through adjacent layers
- Symptom:
  - 若后续有人绕开 `title-cards` canonical surface 继续扩展旧 `topic` 语义，API 会重新分叉。
- Root cause:
  - 即使 compat wrapper 已删除，仓库仍保留旧 `topicId` 物理字段、历史任务文档和兼容环境变量语境，容易诱发局部回退。
- Prevention:
  - 后续新能力必须继续挂到 `title-cards` canonical API，而不是恢复旧公开命名。

### P-004 retrieval-topic and title-card semantics can drift again
- Symptom:
  - 文档、UI 文案或 OpenAPI 又把 `retrieval-topic` 和 `title-card` 混成同一类对象。
- Root cause:
  - 仓库已有大量旧 `topic` 术语与历史实现，局部改名很容易留下公开面漂移。
- Prevention:
  - 本任务把 repo docs、OpenAPI/API index、shared contract、桌面 UI 一起切换，避免半切换状态进入主线。
