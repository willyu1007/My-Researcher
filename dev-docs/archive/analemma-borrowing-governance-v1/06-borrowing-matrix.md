# 06 Borrowing Matrix

## Purpose
- 将 Analemma/FARS 借鉴点映射到本项目治理对象，确保每项借鉴可追溯、可门禁、可分责。

## Matrix
| ID | Borrowing class | Source signal (public) | Project target object | Value gate / check | Owner | Evidence fields |
|---|---|---|---|---|---|---|
| B-01 | 阶段状态机与节点状态可观测 | `list-idea` 状态分层（GENERATED/VERIFYING/VERIFIED/FAILED） | `stage_node.status` 扩展映射 | 状态转移合法性校验 | T-005 spec, T-003 consume | `node_id`, `status`, `updated_at` |
| B-02 | timeline-first | `list-key-event-timeline` | `paper_timeline_event` | 事件时间序一致性 | T-005 spec, 后续T-006/T-007实现 | `event_id`, `event_type`, `gmt_achieved`, `idea_id` |
| B-03 | 结构化价值判断与晋级门 | `VERIFYING->VERIFIED` 可见流程 | `value_judgement` + gate run | hard constraints + promote decision trace | T-003 | `judgement_id`, `decision`, `reason_summary` |
| B-04 | 研究资产包链接化 | repo/pdf/review 链接字段 | `artifact_bundle` | 写作包证据完整性检查 | T-005 spec | `proposal_url`, `paper_url`, `repo_url`, `review_url` |
| B-05 | 资源与成本指标面 | `metrics/latest`, `count-cost` | `paper_runtime_metric` | `efficiency_cost_reasonableness` | T-005 spec, T-003 gate consume | `tokens`, `cost_usd`, `gpu_requested`, `gpu_total` |
| B-06 | 并行分支与回流可追溯 | 实时事件流 + idea并行推进 | `loopback_edge` + `lane_id/attempt_id` | 回流触发与兼容性检查 | T-003 | `from_node_id`, `to_module_id`, `trigger_judgement_id` |
| B-07 | 负结果可发布策略 | FAILED/negative outputs 可追踪 | `negative_result_publish_policy` | “负结果可发但需证据”规则 | T-005 spec, M8 consume | `result_type`, `evidence_node_ids`, `disclosure_note` |
| B-08 | 发布前人审门禁与合规标注 | 人审 + AI-generated disclosure | `release_review_payload` | release gate approval | T-005 spec, 后续实现任务 | `reviewers`, `decision`, `risk_flags`, `label_policy` |

## Notes
- `T-005` 只负责映射与契约增量，不替代 `T-003` gate 执行主权。
- 后续实现必须经过 `sync + lint` + anti-drift 二次校验。
