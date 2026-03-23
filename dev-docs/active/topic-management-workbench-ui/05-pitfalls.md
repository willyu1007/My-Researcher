# 05 Pitfalls

## Known residual risks after implementation

### P-001 UI governance scan root or exception can drift
- Symptom:
  - 若 scan root 回退，`ui_gate.py` 会再次遗漏桌面工作台代码；若 exception 过期或被误删，gate 会重新被 legacy CSS 存量阻塞。
- Root cause:
  - governance 配置曾长期停留在 web-style 默认目录，桌面 renderer 直到本任务才纳入覆盖；而历史 CSS 尚未迁移到 token/contract 合规形态。
- Prevention:
  - 保留本轮新增的 `ui/config/governance.json` scan root、`apps/desktop/src/renderer/styles` exclusion 和对应 approval evidence；若要重新纳入 styles 目录，需先单开债务清理任务。

### P-002 source_evidence_review_ids currently hard-fails
- Symptom:
  - 若 UI 传入的 `source_evidence_review_ids` 未对应到题目卡 evidence basket，service 仍会返回 `422 GATE_CONSTRAINT_FAILED`。
- Root cause:
  - 首版 bridge 只保证“题目卡篮子内证据可用”，还没有独立 topic-side EvidenceReview 持久层。
- Prevention:
  - 后续若要支持 richer evidence-review lineage，单开任务扩展 bridge，而不是在现有字段上继续堆兼容。

### P-003 topic-management currently lacks workbench-oriented read/update surface
- Symptom:
  - 若后续有人绕开 `title-cards` canonical surface 继续扩展旧 `topic` 语义，API 会重新分叉。
- Root cause:
  - 仓库里仍保留旧 `topicId` 内部字段和历史 route 文档语境，容易诱发局部回退。
- Prevention:
  - 后续新能力必须继续挂到 `title-cards` canonical API，而不是恢复旧公开命名。

### P-004 retrieval-topic and title-card semantics can drift again
- Symptom:
  - 文档、UI 文案或 OpenAPI 又把 `retrieval-topic` 和 `title-card` 混成同一类对象。
- Root cause:
  - 仓库已有大量旧 `topic` 术语与历史实现，局部改名很容易留下公开面漂移。
- Prevention:
  - 本任务把 repo docs、OpenAPI/API index、shared contract、桌面 UI 一起切换，避免半切换状态进入主线。
