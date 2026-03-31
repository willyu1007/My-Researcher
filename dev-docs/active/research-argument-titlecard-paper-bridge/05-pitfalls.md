# 05 Pitfalls

## P-001 bridge can bypass readiness semantics
- Symptom:
  - implementation 直接把旧 promotion decision 结果映射到 `createPaperProject`。
- Prevention:
  - 强制先走 research-argument readiness verify，再进入 promote bridge。

## P-002 traceability can be lost at promotion time
- Symptom:
  - `paper-project` 创建后无法回溯到上游 claim / evidence / decision。
- Prevention:
  - bridge payload 和 audit log 必须显式保留 workspace / branch / decision refs。
