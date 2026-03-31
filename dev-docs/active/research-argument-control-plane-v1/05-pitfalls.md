# 05 Pitfalls

## P-001 scope can collapse back into title-card ownership
- Symptom:
  - 后续实现把 research-argument 层直接塞回 `title-card` service / UI，导致两条主线再次混 scope。
- Prevention:
  - 保持 `title-card` 作为 source object owner，本任务只读、投影和桥接。

## P-002 umbrella task can turn into duplicate implementation log
- Symptom:
  - `T-023` 开始记录所有子任务的实现细节，导致 child task bundle 失去价值。
- Prevention:
  - `T-023` 只记录跨任务边界、排序和 handoff，具体实现细节写回 child tasks。

## P-003 planner work can start before V1 contracts stabilize
- Symptom:
  - `T-028` 提前落代码，反向定义 graph/state 结构。
- Prevention:
  - 强制 `T-028` 以后置 enhancement 方式消费 `T-024` / `T-025` 产物。
