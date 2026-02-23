# 08 Interface Delta Spec (Incremental Draft)

## Baseline reference
- Base contract (SSOT): `dev-docs/active/llm-research-lifecycle-governance-v1/08-interface-field-contracts.md`
- This file only defines additive deltas.

## Delta principles
1. Additive only: 不覆盖既有字段组语义。
2. Nullable first: 新字段默认可空，兼容旧客户端。
3. Event-compatible: 新事件不改变既有事件订阅语义。

## REST additions (proposal)
### `GET /paper-projects/:id/timeline`
- Purpose: 返回按时间序组织的研究事件。
- Response delta:
  - `events[]`: `event_id`, `event_type`, `module_id`, `timestamp`, `node_id?`, `summary`, `severity?`

### `GET /paper-projects/:id/resource-metrics`
- Purpose: 返回论文级运行与成本快照。
- Response delta:
  - `paper_runtime_metric`: `tokens`, `cost_usd`, `gpu_requested`, `gpu_total`, `updated_at`

### `GET /paper-projects/:id/artifact-bundle`
- Purpose: 返回可发布研究资产链接集合。
- Response delta:
  - `artifact_bundle`: `proposal_url`, `paper_url`, `repo_url`, `review_url`

### `POST /paper-projects/:id/release-gate/review`
- Purpose: 提交发布前人审门禁决策。
- Request delta:
  - `release_review_payload`: `reviewers`, `decision`, `risk_flags`, `label_policy`, `comment?`
- Response delta:
  - `gate_result`: `accepted`, `review_id`, `approved_by`, `approved_at`, `audit_ref`

## Event additions
### `research.node.status.changed`
- Payload:
  - `event_id`, `paper_id`, `node_id`, `from_status`, `to_status`, `changed_at`, `changed_by`

### `research.timeline.event.appended`
- Payload:
  - `event_id`, `paper_id`, `timeline_event`, `appended_at`

### `research.metrics.updated`
- Payload:
  - `event_id`, `paper_id`, `paper_runtime_metric`, `updated_at`

### `research.release.reviewed`
- Payload:
  - `event_id`, `paper_id`, `review_id`, `decision`, `reviewers`, `label_policy`, `reviewed_at`

## Type additions
### `artifact_bundle`
```json
{
  "proposal_url": "string|null",
  "paper_url": "string|null",
  "repo_url": "string|null",
  "review_url": "string|null"
}
```

### `paper_runtime_metric`
```json
{
  "tokens": 0,
  "cost_usd": 0.0,
  "gpu_requested": 0,
  "gpu_total": 0,
  "updated_at": "2026-02-23T00:00:00Z"
}
```

### `release_review_payload`
```json
{
  "reviewers": ["user-1", "user-2"],
  "decision": "approve|reject|hold",
  "risk_flags": ["low-evidence", "policy-check"],
  "label_policy": "ai-generated-required",
  "comment": "string|null"
}
```

## Compatibility constraints
- MUST NOT break existing groups:
  - `lineage_meta`
  - `value_judgement_payload`
  - `snapshot_pointer_payload`
- All new fields MUST be nullable or optional in first release.
- Old clients SHOULD ignore unknown fields safely.
- Server SHOULD support mixed-mode responses during rollout window.

## Non-goals
- 不定义数据库迁移脚本。
- 不定义消息队列主题部署细节。
- 不定义鉴权实现细节。
