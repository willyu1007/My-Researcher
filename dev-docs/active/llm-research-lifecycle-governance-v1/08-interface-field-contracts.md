# 08 Interface Field Contracts (v1 draft)

## Purpose
- 将治理语义落到“接口字段级”输入输出契约，作为后续 API/事件实现的统一基线。
- 保证 M4 到 M7 的版本链路、快照冻结和 M8 消费约束在接口层可强校验。

## Scope
- In scope:
  - 核心 REST 接口（创建项目、门禁校验、版本提交、写作包构建）的字段契约。
  - 核心事件（gate、version spine、snapshot pointer）的 payload 契约。
  - 公共字段组（lineage、value judgement、snapshot manifest/pointer）。
- Out of scope:
  - 具体数据库表结构、索引设计、迁移脚本。
  - 具体评分算法实现与模型 prompt 细节。

## Contract principles
1. Gate-first: 所有下游推进以 `value_judgement` + gate 结果为准。
2. Immutable snapshots: `SP-*` 一经生成不可变，回滚只切指针。
3. Parallel-safe: 并行线程由 `lane_id` + `attempt_id` 建模，不要求模块同步。
4. Evidence-first writing: M8 只读 `SP-full`，且必须可追溯到 `promoted` 上游节点。

## Canonical enums and formats
- `module_id`: `M1|M2|M3|M4|M5|M6|M7|M8`
- `node_status`: `draft|candidate|promoted|hold|rejected|superseded`
- `gate_decision`: `promote|hold|reject|loopback`
- `spine_snapshot_type`: `SP-partial|SP-full`
- `analysis_contract`: `with_m6|no_m6`
- `created_by`: `llm|human|hybrid`
- `timestamp`: ISO-8601 UTC string

## Common field groups
### `lineage_meta` (required)
- `paper_id`
- `stage_id`
- `module_id`
- `version_id`
- `parent_version_id` (optional)
- `parent_node_ids` (array, optional)
- `run_id`
- `lane_id`
- `attempt_id`
- `created_by`
- `created_at`

### `value_judgement_payload` (required for candidate)
- `judgement_id`
- `decision`
- `core_score_vector`
- `extension_score_vector`
- `confidence`
- `reason_summary`
- `reviewer`
- `timestamp`

### `snapshot_manifest_payload`
- `snapshot_id` (e.g. `SP-0042`)
- `snapshot_type` (`SP-partial|SP-full`)
- `spine_type` (`with_m6|no_m6`, `SP-full` required)
- `paper_id`
- `node_refs` (array of `node_id`)
- `compatibility_vector`
  - `claim_set_hash`
  - `problem_scope_hash`
  - `dataset_protocol_hash`
  - `evaluation_protocol_hash`
- `created_at`
- `created_by`

### `snapshot_pointer_payload`
- `paper_id`
- `paper_active_sp_full` (optional)
- `paper_active_sp_partial` (optional)
- `changed_by`
- `changed_at`
- `change_reason`

## REST contracts
### 1) `POST /paper-projects`
#### Request (minimum)
```json
{
  "topic_id": "TOPIC-001",
  "title": "string",
  "research_direction": "LLM",
  "created_by": "human",
  "initial_context": {
    "literature_evidence_ids": ["LIT-1", "LIT-2"]
  }
}
```

#### Validation
- `research_direction` 缺省时默认 `LLM`。
- `initial_context.literature_evidence_ids` 为空时禁止直接置为 active project。

#### Response (minimum)
```json
{
  "paper_id": "P023",
  "status": "active",
  "paper_active_sp_full": null,
  "paper_active_sp_partial": null,
  "created_at": "2026-02-22T10:00:00Z"
}
```

### 2) `POST /paper-projects/:id/version-spine/commit`
#### Request (minimum)
```json
{
  "lineage_meta": {
    "paper_id": "P023",
    "stage_id": "S3",
    "module_id": "M5",
    "version_id": "P023-M5-B02-N0004",
    "parent_node_ids": ["NODE-1001"],
    "run_id": "RUN-9002",
    "lane_id": "LANE-03",
    "attempt_id": "ATT-02",
    "created_by": "llm",
    "created_at": "2026-02-22T10:05:00Z"
  },
  "payload_ref": "experiment_plan_v:EXP-77",
  "node_status": "candidate",
  "value_judgement_payload": {
    "judgement_id": "JDG-331",
    "decision": "promote",
    "core_score_vector": {},
    "extension_score_vector": {},
    "confidence": 0.82,
    "reason_summary": "string",
    "reviewer": "llm",
    "timestamp": "2026-02-22T10:05:02Z"
  }
}
```

#### Validation
- 只允许 `M4..M7` 进入 version spine 提交。
- `candidate` 节点必须附 `value_judgement_payload`。
- `version_id` 必须符合 `P-M-B-N` 命名约束。

#### Response (minimum)
```json
{
  "node_id": "NODE-2009",
  "accepted": true,
  "node_status": "candidate"
}
```

### 3) `POST /paper-projects/:id/stage-gates/:gate/verify`
#### Request (minimum)
```json
{
  "candidate_node_ids": ["NODE-2009", "NODE-2010"],
  "config_version": "llm-global-default-v1",
  "reviewer_mode": "hybrid",
  "analysis_contract": "no_m6",
  "override_context": {
    "skip_m6_reason": "training budget and scope constraints",
    "training_claim_allowed": false
  }
}
```

#### Validation
- 任一候选节点无 `value_judgement` 时直接失败。
- `analysis_contract=no_m6` 时必须满足：
  - `skip_m6_reason` 存在。
  - `training_claim_allowed=false`。
  - 使用更严格阈值（`evaluation_rigor>=0.75`、`reproducibility_transparency>=0.70`）。

#### Response (minimum)
```json
{
  "gate_run_id": "GR-1007",
  "results": [
    {
      "node_id": "NODE-2009",
      "decision": "promote",
      "reason_summary": "string"
    }
  ],
  "snapshot": {
    "snapshot_id": "SP-0042",
    "snapshot_type": "SP-full",
    "spine_type": "no_m6"
  },
  "pointer_update": {
    "paper_active_sp_full": "SP-0042"
  }
}
```

### 4) `POST /paper-projects/:id/writing-packages/build`
#### Request (minimum)
```json
{
  "source_snapshot_id": "SP-0042",
  "writing_mode": "submission",
  "target_release_tag": "R1.0.0",
  "sections": ["abstract", "method", "results", "discussion"]
}
```

#### Validation
- 默认只接受 `SP-full`。
- `spine_type=no_m6` 时，写作输出必须包含 `training-free` 声明并禁止训练增益表述。

#### Response (minimum)
```json
{
  "writing_package_id": "WP-501",
  "source_snapshot_id": "SP-0042",
  "release_tag": "R1.0.0",
  "section_node_ids": ["SEC-01", "SEC-02"],
  "compliance_flags": {
    "claim_evidence_coverage_ok": true,
    "no_m6_wording_ok": true
  }
}
```

## Event payload contracts
### `llm.workflow.plan.generated`
- `event_id`, `paper_id`, `run_id`, `lane_id`, `attempt_id`, `planner_profile`, `created_at`

### `stage.gate.check.requested`
- `event_id`, `paper_id`, `gate_id`, `candidate_node_ids`, `analysis_contract`, `requested_by`, `requested_at`

### `stage.gate.check.passed|failed`
- `event_id`, `paper_id`, `gate_run_id`, `result_summary`, `snapshot_id` (optional), `emitted_at`

### `version.spine.committed`
- `event_id`, `paper_id`, `node_id`, `module_id`, `version_id`, `lane_id`, `attempt_id`, `committed_at`

### `snapshot.pointer.switched` (new)
- `event_id`, `paper_id`, `pointer_type` (`full|partial`), `from_snapshot_id`, `to_snapshot_id`, `reason`, `changed_by`, `changed_at`

## Error model (minimum)
- `400 INVALID_PAYLOAD`: 字段结构或枚举错误。
- `409 VERSION_CONFLICT`: `version_id`/`parent_node_ids` 与当前血缘冲突。
- `409 SNAPSHOT_COMPATIBILITY_FAILED`: 快照兼容性约束不满足。
- `422 GATE_CONSTRAINT_FAILED`: hard constraints 未满足。
- `422 NO_M6_POLICY_VIOLATION`: `no_m6` 契约字段缺失或不合法。
- `423 SNAPSHOT_LOCKED`: 试图改写已冻结快照内容。

## Responsibility at interface layer (R/C/F)
- R (`M3` gate service):
  - `stage-gates/:gate/verify`
  - `paper_active_sp_full/paper_active_sp_partial` 指针切换审批
- C (`M4..M7` module services):
  - 产出 `lineage_meta` + `value_judgement_payload` 并提交 `version-spine/commit`
- F:
  - `M8` 直接写入或覆盖 M4..M7 节点内容
  - 任意模块绕过 gate 直接切换 `paper_active_sp_full`

## Implementation handoff notes
- 本文档仅定义字段与约束，不定义实现代码。
- 实现阶段建议按以下顺序落地：
  1. DTO/Schema 定义（请求与事件）。
  2. Gate validator（含 `no_m6` 分支规则）。
  3. Snapshot pointer service（切换而非改写）。

## Code mapping (current)
- Shared contract module:
  - `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
- Shared exports:
  - `packages/shared/src/research-lifecycle/index.ts`
  - `packages/shared/src/index.ts`
