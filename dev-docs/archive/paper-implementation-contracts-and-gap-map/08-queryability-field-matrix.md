# 08 Queryability Field Matrix

## Purpose
This file defines the minimum fields that later PaperImplementation tasks must keep queryable for gates, queues, trace checks, and contract tests. Required fields must not be stored only inside opaque JSON payloads.

> T-132 D-17 adoption (2026-07-12; docs-only, not implemented): the target fields below keep scientific disposition on the exact closed `ValidationCycle`, preserve Result Analysis as proposal identity, and make packets downstream projections. Existing mixed `run_status`, caller-authored exit and direct packet materializer fields require one atomic migration; no dual-read compatibility is permitted.

## Global Query Fields
| Field | Required for | Owner tasks |
|---|---|---|
| `object_id` | Generic gate/trace/queue targeting | all data-bearing children |
| `object_type` | Generic routing, queue grouping, evaluation fixtures | all data-bearing children |
| `project_id` | Project-scoped reads, replay, cleanup | all data-bearing children |
| `version_number` | Immutable versions, stale checks, replay | T-093, T-094, T-098 |
| `lifecycle_status` | State gates, queue filters, dashboard reads | T-093, T-094, T-095, T-098 |
| `freshness_status` | stale/invalidated gates | T-093, T-095, T-097, T-099 |
| `maturity_level` | motive and claim readiness gates | T-094, T-098 |
| `policy_version_id` | gate/audit replay | all stateful children |
| `created_at` / `updated_at` | ordering, staleness, audit | all data-bearing children |

## Flow-Specific Query Fields
| Flow | Required queryable fields | Owner | Used by |
|---|---|---|---|
| Intake | `implementation_project_id`, `intake_snapshot_id`, `paper_project_bridge_id`, `bridge_payload_hash`, `promotion_decision_id`, `promotion_commitment_profile_id`, `promotion_input_snapshot_id`, `promotion_input_snapshot_hash`, `topic_package_id`, `package_version`, `title_card_id`, `source_status` | T-093 | T-094, T-099, T-101 |
| Upstream feedback | `feedback_event_id`, `feedback_type`, `severity`, `source_object_refs`, `evidence_refs`, `run_refs`, `recommended_upstream_action`, `feedback_status` | T-093; emitted by T-095/T-096/T-098 | T-100, topic-selection recheck, T-101 |
| Motive identity | `motive_id`, `current_version_id`, `portfolio_role`, `role_decision_ref`, `lifecycle_status`, `merged_into_motive_id`, `superseded_by_motive_id` | T-094 | T-095, T-100, T-101 |
| Motive version | `core_motive_version_id`, `motive_id`, `version_number`, `maturity_level`, `trace_manifest_ref`, `admission_gate_result_id`, `evolution_decision_id` | T-094/T-097 | T-095, T-098, T-101 |
| Portfolio | `portfolio_decision_id`, `primary_motive_ids`, `active_motive_count`, `max_active_motives`, `max_primary_motives`, `max_parallel_routes`, `confirmed_by`, `confirmation_level` | T-094 | T-095, T-100, T-101 |
| Evidence board | `board_version_id`, `assertion_id`, `binding_role`, `support_state`, `challenge_status`, `source_ref`, `trace_manifest_ref`, `freshness_status` | T-094/T-097 | T-095, T-098, T-101 |
| Validation cycle | `validation_cycle_id`, `input_snapshot_id`, `target_ref`, `validation_question`, `budget_id`, `expected_information_gain`, `cycle_status`, `closure_kind`, nullable `scientific_disposition`, `accepted_proposal_ref`, `accepted_proposal_hash`, `closure_snapshot_hash`, server-derived `decision_exit`, `gate_result_id`, `trace_manifest_ref` | T-095 | T-096, T-098, T-100, T-101 |
| Route/probe/plan | `route_candidate_id`, `probe_id`, `experiment_plan_light_id`, `run_mode`, `primary_metric_refs`, `secondary_metric_refs`, `dataset_version_refs`, `baseline_version_refs`, `code_version_refs`, `config_refs`, `confirmatory_marker`, `scope_boundary_ref` | T-095 | T-096, T-098, T-101 |
| WorkOrder | `work_order_id`, `validation_cycle_id`, `experiment_plan_light_id`, `run_type`, `run_policy_id`, `retry_budget`, `compute_limit_ref`, `stop_condition_refs`, `admission_gate_result_id`, `trace_manifest_ref`, `work_order_status` | T-096 | T-097, T-098, T-101 |
| Run evidence | `run_evidence_unit_id`, `work_order_id`, `external_job_id`, `run_type`, `execution_status=completed`, `validation_status=passed`, `evidence_candidate_ref`, `evidence_candidate_hash`, `dataset_version_refs`, `baseline_version_refs`, `code_version_refs`, `config_refs`, `result_validation_report_id`, `trace_manifest_ref`, `trusted_status`; no scientific-disposition status | T-096/T-097 | T-095, T-098, T-100, T-101 |
| Trace | `trace_manifest_ref`, `trace_status`, `source_locator_id`, `citation_candidate_id`, `claim_trace_packet_ref`, `lineage_type`, `target_ref`, `broken_ref_count`, `stale_ref_count` | T-097 | all writing-affecting children |
| Natural-language fields | `field_owner_ref`, `field_name`, `field_role`, `can_feed_workflow`, `can_feed_hard_gate`, `can_be_cited` | T-097/T-099 | T-101 |
| Result/claim | `result_packet_id`, exact `validation_cycle_closure_ref`, `validation_cycle_closure_hash`, `accepted_proposal_ref`, `accepted_proposal_hash`, `claim_candidate_id`, `claim_type`, `claim_strength`, `claim_boundary_status`, `support_status`, `challenge_status`, `claim_trace_packet_ref`, `confirmation_level`, `gate_result_id` | T-098 | T-100, T-101 |
| Dossier | `dossier_id`, `dossier_version`, `dossier_status`, declared `validation_cycle_closure_refs`, `closure_snapshot_refs`, `closure_snapshot_hashes`, `readiness_gate_result_id`, `trace_manifest_ref`, `claim_trace_packet_ref`, derived `failed_execution_count`, `forbidden_overclaim_count`, `projection_policy_version_id` | T-098 | PaperProject/writing lane, T-100, T-101 |
| AI harness | `harness_id`, `harness_run_id`, `workflow_type`, `input_snapshot_id`, `model_profile_id`, `run_mode`, `schema_validation_status`, `reference_validation_status`, `trace_validation_status`, `proposal_artifact_id`, `quality_signal_id` | T-099 | T-100, T-101 |
| Queue | `queue_item_id`, `queue_type`, `target_ref`, `priority`, `status`, `dedup_key`, `blocking_transition_keys`, `policy_version_id`, `retry_count`, `retry_budget`, `cooldown_until` | T-099 | T-100, T-101 |
| Evaluation | `eval_run_id`, `eval_type`, `fixture_id`, `target_task_id`, `covered_rule_id`, `result_status`, `failure_code`, `evidence_ref` | T-101 | parent closure |

## JSON-Only Guard
These values may appear inside rich payloads, but a queryable copy or indexed projection is required when persistence is introduced:

- `trace_manifest_ref`
- `input_snapshot_id`
- `validation_cycle_id`
- `work_order_id`
- `run_type`
- `run_status`
- `dataset_version_refs`
- `baseline_version_refs`
- `code_version_refs`
- `config_refs`
- `claim_trace_packet_ref`
- `dossier_status`
- `queue_type`
- `dedup_key`
- `feedback_type`
- `portfolio_role`

## Test Expectation
T-101 must include queryability tests that fail when gates, queues, traces, run evidence, claims, or dossiers can only be filtered by parsing opaque JSON blobs.
