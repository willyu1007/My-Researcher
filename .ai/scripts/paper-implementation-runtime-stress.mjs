#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquireSuiteLock } from '../../apps/backend/scripts/lib/suite-lock.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const RUN_ID = normalizeOptionalString(process.env.PAPER_IMPLEMENTATION_RUNTIME_STRESS_RUN_ID)
  ?? `t114-paper-implementation-runtime-stress-${Date.now()}`;
const ARTIFACT_DIR = path.join(REPO_ROOT, '.ai/.tmp/paper-implementation-runtime-stress', RUN_ID);
const CHILD_TIMEOUT_MS = positiveInt(process.env.PAPER_IMPLEMENTATION_RUNTIME_STRESS_CHILD_TIMEOUT_MS, 900000);
const L5_STEP_ID = '00-l5-stress-compression-adversarial';
const RUNTIME_REGRESSION_STEP_ID = '01-runtime-service-and-route-regression';
const DOMAIN_GATE_WRITER_OWNERSHIP_STEP_ID = '02-domain-gate-writer-ownership-scan';
const DETERMINISTIC_LANE_REGRESSION_STEP_ID = '03-deterministic-lane-regression';
const DECISION_WORK_QUEUE_REGRESSION_STEP_ID = '04-decision-work-queue-regression';
const LIVE_EXPERIMENT_ADAPTER_REGRESSION_STEP_ID = '05-live-experiment-adapter-operational-regression';
const LIVE_EXPERIMENT_ADAPTER_OWNERSHIP_STEP_ID = '06-live-experiment-adapter-ownership-scan';
const PROVIDER_VARIANCE_EVALUATION_REGRESSION_STEP_ID = '07-provider-variance-evaluation-regression';
const PROVIDER_VARIANCE_EVALUATION_OWNERSHIP_STEP_ID = '08-provider-variance-evaluation-ownership-scan';

const REQUIRED_L5_CASES = [
  {
    key: 'trace_over_budget_zero_provider_calls',
    subtest: 'L5 trace stress blocks over-budget retrieval context before provider calls',
  },
  {
    key: 'trace_adversarial_prompt_zero_provider_calls',
    subtest: 'L5 trace adversarial prompt payload is blocked before provider calls and not persisted',
  },
  {
    key: 'trace_forbidden_provider_output_no_final_artifact',
    subtest: 'L5 trace forbidden provider output field fails closed without final artifact',
  },
  {
    key: 'trace_provider_failure_retry_exhausted_no_fallback_no_final_artifact',
    subtest: 'L5 trace provider gateway failure retries once and fails closed without fallback or final artifact',
  },
  {
    key: 'trace_transient_provider_failure_retry_recovered_no_fallback',
    subtest: 'L5 trace transient provider failure retries the same profile and recovers without fallback',
  },
  {
    key: 'trace_resume_prefix_reuse_no_provider_replay',
    subtest: 'L5 trace resume reuses the admitted role prefix without re-issuing provider calls',
  },
  {
    key: 'trace_resume_identity_drift_rejected',
    subtest: 'L5 trace resume rejects identity drift with 409 before any provider call',
  },
  {
    key: 'p1_over_budget_zero_provider_calls',
    subtest: 'L5 P1 stress blocks over-budget source bundles before provider calls',
  },
  {
    key: 'p1_compression_provenance_recorded',
    subtest: 'L5 P1 compression provenance is carried into role and final artifacts',
  },
  {
    key: 'p1_forbidden_provider_output_no_domain_gate_payload',
    subtest: 'L5 P1 forbidden provider output does not create final or domain-gate payloads',
  },
  {
    // T-124 S3 复审 F5-1: provider wire JSON carriers round-trip through the
    // real orchestrator ajv gate into canonical domain-gate/scenario shapes.
    key: 'p1_provider_wire_carriers_complete_chain_with_canonical_domain_gate',
    subtest: 'L5 P1 provider wire JSON carriers complete the debate chain with a canonical domain-gate request',
  },
  {
    // T-124 S3 复审 F5-2: a strict-mode-degenerate schema is rejected at the
    // gateway before any provider call (fail-closed floor for the wire encoding).
    key: 'degenerate_structured_output_schema_fails_closed_at_gateway',
    subtest: 'L5 degenerate structured-output schema fails closed at the gateway with InvalidRequestError',
  },
  {
    key: 'p1_provider_failure_retry_exhausted_no_domain_gate_payload',
    subtest: 'L5 P1 provider gateway failure retries once and does not create final or domain-gate payloads',
  },
  {
    key: 'result_analysis_provider_failure_retry_exhausted_no_domain_gate_payload',
    subtest: 'L5 result-analysis provider gateway failure retries once and does not create final or domain-gate payloads',
  },
  {
    key: 'result_analysis_incomplete_scenario_set_retry_exhausted_no_domain_gate_payload',
    subtest: 'L5 result-analysis incomplete scenario set retries once and does not create final or domain-gate payloads',
  },
  {
    key: 'experiment_planning_provider_failure_retry_exhausted_no_domain_gate_payload',
    subtest: 'L5 experiment planning provider gateway failure retries once and does not create final or domain-gate payloads',
  },
  {
    key: 'experiment_critique_incomplete_dimension_set_retry_exhausted_no_domain_gate_payload',
    subtest: 'L5 experiment critique incomplete dimension set retries once and does not create final or domain-gate payloads',
  },
  {
    key: 'experiment_planning_over_budget_compression_applied_completes',
    subtest: 'L5 experiment critique compressible over-budget packet context compresses and completes with verifiable lineage',
  },
  {
    key: 'route_architecture_provider_failure_retry_exhausted_no_route_queue_or_domain_gate_payload',
    subtest: 'L5 route architecture provider gateway failure retries once and does not create final, route, queue, or domain-gate payloads',
  },
  {
    key: 'route_architecture_incomplete_candidate_set_retry_exhausted_no_route_queue_or_domain_gate_payload',
    subtest: 'L5 route architecture incomplete candidate set retries once and does not create final, route, queue, or domain-gate payloads',
  },
  {
    key: 'route_skeptic_incomplete_dimension_set_retry_exhausted_no_queue_or_domain_gate_payload',
    subtest: 'L5 route skeptic incomplete dimension set retries once and does not create final, queue, or domain-gate payloads',
  },
  {
    key: 'route_architecture_over_budget_compression_applied_completes',
    subtest: 'L5 route architecture compressible over-budget packet context compresses and completes with verifiable lineage',
  },
  {
    key: 'validation_cycle_planning_provider_failure_retry_exhausted_no_cycle_queue_or_domain_gate_payload',
    subtest: 'L5 validation cycle planning provider gateway failure retries once and does not create final, cycle, queue, or domain-gate payloads',
  },
  {
    key: 'validation_cycle_planning_incomplete_candidate_set_retry_exhausted_no_cycle_queue_or_domain_gate_payload',
    subtest: 'L5 validation cycle planning incomplete candidate set retries once and does not create final, cycle, queue, or domain-gate payloads',
  },
  {
    key: 'validation_cycle_planning_over_budget_compression_applied_completes',
    subtest: 'L5 validation cycle planning compressible over-budget packet context compresses and completes with verifiable lineage',
  },
  {
    key: 'feasibility_planning_over_budget_zero_provider_calls',
    subtest: 'L5 feasibility planning stress blocks over-budget source bundles before provider calls',
  },
  {
    key: 'feasibility_planning_over_budget_compression_applied_completes',
    subtest: 'L5 feasibility planning compressible over-budget packet context compresses and completes with verifiable lineage',
  },
  {
    key: 'feasibility_planning_provider_failure_retry_exhausted_no_probe_plan_cycle_queue_or_domain_gate_payload',
    subtest: 'L5 feasibility planning provider gateway failure retries once and does not create final, probe, plan-light, cycle, queue, or domain-gate payloads',
  },
  {
    key: 'feasibility_planning_incomplete_candidate_set_retry_exhausted_no_probe_plan_cycle_queue_or_domain_gate_payload',
    subtest: 'L5 feasibility planning incomplete candidate set retries once and does not create final, probe, plan-light, cycle, queue, or domain-gate payloads',
  },
  {
    key: 'cross_board_synthesis_over_budget_zero_provider_calls',
    subtest: 'L5 cross-board synthesis stress blocks over-budget board context before provider calls',
  },
  {
    key: 'cross_board_synthesis_over_budget_compression_applied_completes',
    subtest: 'L5 cross-board synthesis compressible over-budget packet context compresses and completes with verifiable lineage',
  },
  {
    key: 'cross_board_synthesis_provider_failure_retry_exhausted_no_review_transfer_portfolio_queue_or_domain_gate_payload',
    subtest: 'L5 cross-board synthesis provider gateway failure retries once and does not create final, review, transfer, portfolio, queue, or domain-gate payloads',
  },
  {
    key: 'cross_board_synthesis_missing_conflict_scenario_retry_exhausted_no_review_transfer_portfolio_queue_or_domain_gate_payload',
    subtest: 'L5 cross-board synthesis missing conflict scenario retries once and does not create final, review, transfer, portfolio, queue, or domain-gate payloads',
  },
  {
    key: 'cross_board_synthesis_scenario_refs_outside_request_owned_sets_retry_exhausted_no_review_transfer_portfolio_queue_or_domain_gate_payload',
    subtest: 'L5 cross-board synthesis scenario refs outside request-owned sets retry once and does not create final, review, transfer, portfolio, queue, or domain-gate payloads',
  },
  {
    key: 'cross_board_synthesis_memo_like_evidence_zero_provider_calls',
    subtest: 'L5 cross-board synthesis memo-like evidence ref blocks before provider calls',
  },
  {
    key: 'cross_board_synthesis_viable_reuse_without_transfer_binding_retry_exhausted_no_review_transfer_portfolio_queue_or_domain_gate_payload',
    subtest: 'L5 cross-board synthesis viable reuse without transfer binding retries once and does not create final, review, transfer, portfolio, queue, or domain-gate payloads',
  },
  {
    key: 'evidence_board_curation_over_budget_zero_provider_calls',
    subtest: 'L5 evidence-board curation stress blocks over-budget board context before provider calls',
  },
  {
    key: 'evidence_board_curation_over_budget_compression_applied_completes',
    subtest: 'L5 evidence-board curation compressible over-budget packet context compresses and completes with verifiable lineage',
  },
  {
    key: 'evidence_board_curation_provider_failure_retry_exhausted_no_board_binding_citation_trace_queue_or_domain_gate_payload',
    subtest: 'L5 evidence-board curation provider gateway failure retries once and does not create final, board, binding, citation, trace-repair, queue, or domain-gate payloads',
  },
  {
    key: 'evidence_board_curation_missing_challenge_check_retry_exhausted_no_board_binding_citation_trace_queue_or_domain_gate_payload',
    subtest: 'L5 evidence-board curation missing challenge check retries once and does not create final, board, binding, citation, trace-repair, queue, or domain-gate payloads',
  },
  {
    key: 'evidence_board_curation_viable_binding_without_locator_retry_exhausted_no_board_binding_citation_trace_queue_or_domain_gate_payload',
    subtest: 'L5 evidence-board curation viable binding without locator retries once and does not create final, board, binding, citation, trace-repair, queue, or domain-gate payloads',
  },
  {
    key: 'evidence_board_curation_duplicate_existing_binding_retry_exhausted_no_board_binding_citation_trace_queue_or_domain_gate_payload',
    subtest: 'L5 evidence-board curation duplicate existing binding retries once and does not create final, board, binding, citation, trace-repair, queue, or domain-gate payloads',
  },
  {
    key: 'evidence_board_curation_candidate_refs_outside_request_owned_sets_retry_exhausted_no_board_binding_citation_trace_queue_or_domain_gate_payload',
    subtest: 'L5 evidence-board curation candidate refs outside request-owned sets retry once and does not create final, board, binding, citation, trace-repair, queue, or domain-gate payloads',
  },
  {
    key: 'evidence_board_curation_memo_like_evidence_zero_provider_calls',
    subtest: 'L5 evidence-board curation memo-like evidence ref blocks before provider calls',
  },
  {
    key: 'motive_decomposition_over_budget_zero_provider_calls',
    subtest: 'L5 motive decomposition stress blocks over-budget assertion context before provider calls',
  },
  {
    key: 'motive_decomposition_provider_failure_retry_exhausted_no_motive_board_trace_queue_or_domain_gate_payload',
    subtest: 'L5 motive decomposition provider gateway failure retries once and does not create final, motive, board, trace, queue, or domain-gate payloads',
  },
  {
    key: 'motive_decomposition_missing_decomposition_check_retry_exhausted_no_motive_board_trace_queue_or_domain_gate_payload',
    subtest: 'L5 motive decomposition missing decomposition check retries once and does not create final, motive, board, trace, queue, or domain-gate payloads',
  },
  {
    key: 'motive_decomposition_invalid_result_status_retry_exhausted_no_motive_board_trace_queue_or_domain_gate_payload',
    subtest: 'L5 motive decomposition invalid result status retries once and does not create final, motive, board, trace, queue, or domain-gate payloads',
  },
  {
    key: 'motive_decomposition_missing_reviewed_assertion_coverage_retry_exhausted_no_motive_board_trace_queue_or_domain_gate_payload',
    subtest: 'L5 motive decomposition missing reviewed assertion coverage retries once and does not create final, motive, board, trace, queue, or domain-gate payloads',
  },
  {
    key: 'motive_decomposition_candidate_refs_outside_request_owned_sets_retry_exhausted_no_motive_board_trace_queue_or_domain_gate_payload',
    subtest: 'L5 motive decomposition candidate refs outside request-owned sets retry once and does not create final, motive, board, trace, queue, or domain-gate payloads',
  },
  {
    key: 'motive_decomposition_new_claim_without_human_confirmation_gate_retry_exhausted_no_motive_board_trace_queue_or_domain_gate_payload',
    subtest: 'L5 motive decomposition new-claim risk without human-confirmation gate retries once and does not create final, motive, board, trace, queue, or domain-gate payloads',
  },
  {
    key: 'motive_decomposition_memo_like_assertion_context_zero_provider_calls',
    subtest: 'L5 motive decomposition memo-like assertion context blocks before provider calls',
  },
  {
    key: 'motive_evolution_over_budget_zero_provider_calls',
    subtest: 'L5 motive evolution stress blocks over-budget motive context before provider calls',
  },
  {
    // T-124 S3-β1: provider wire entries (gs001-lora-live-004 fix) round-trip
    // through the real orchestrator ajv gate into canonical option maps.
    key: 'motive_evolution_provider_wire_entries_complete_chain_with_canonical_option_maps',
    subtest: 'L5 motive evolution provider wire entries complete the two-role chain with canonical option maps',
  },
  {
    // T-124 S3-β1 reproduction pin: a legacy by-key option-map provider output
    // (the only options-proposing shape OpenAI strict mode could produce
    // before the wire encoding) still fails closed as SCHEMA_VALIDATION_FAILED.
    key: 'motive_evolution_legacy_option_map_output_schema_validation_retry_exhausted',
    subtest: 'L5 motive evolution legacy by-key option-map provider output fails closed as schema-validation retry exhausted',
  },
  {
    key: 'motive_evolution_provider_failure_retry_exhausted_no_motive_portfolio_board_trace_queue_or_domain_gate_payload',
    subtest: 'L5 motive evolution provider gateway failure retries once and does not create final, motive, portfolio, board, trace, queue, or domain-gate payloads',
  },
  {
    key: 'motive_evolution_missing_challenger_coverage_retry_exhausted_no_motive_portfolio_board_trace_queue_or_domain_gate_payload',
    subtest: 'L5 motive evolution missing challenger coverage retries once and does not create final, motive, portfolio, board, trace, queue, or domain-gate payloads',
  },
  {
    key: 'motive_evolution_option_set_drift_retry_exhausted_no_motive_portfolio_board_trace_queue_or_domain_gate_payload',
    subtest: 'L5 motive evolution option-set drift retries once and does not create final, motive, portfolio, board, trace, queue, or domain-gate payloads',
  },
  {
    key: 'motive_evolution_writer_payload_retry_exhausted_no_motive_portfolio_board_trace_queue_or_domain_gate_payload',
    subtest: 'L5 motive evolution writer-shaped payload retries once and does not create final, motive, portfolio, board, trace, queue, or domain-gate payloads',
  },
  {
    key: 'motive_evolution_portfolio_change_without_human_confirmation_gate_retry_exhausted_no_motive_portfolio_board_trace_queue_or_domain_gate_payload',
    subtest: 'L5 motive evolution portfolio-changing option without human-confirmation gate retries once and does not create final, motive, portfolio, board, trace, queue, or domain-gate payloads',
  },
  {
    key: 'motive_evolution_blocked_challenge_without_reason_retry_exhausted_no_motive_portfolio_board_trace_queue_or_domain_gate_payload',
    subtest: 'L5 motive evolution blocked challenge without reason retries once and does not create final, motive, portfolio, board, trace, queue, or domain-gate payloads',
  },
  {
    key: 'motive_evolution_memo_like_context_zero_provider_calls',
    subtest: 'L5 motive evolution memo-like motive context blocks before provider calls',
  },
  {
    key: 'p1_current_role_retry_no_prior_role_rerun',
    subtest: 'L5 P1 current-role retry does not rerun admitted prior roles',
  },
  {
    key: 'p1_schema_invalid_provider_output_retry_exhausted_no_domain_gate_payload',
    subtest: 'L5 P1 schema-invalid provider output retries once and does not create final or domain-gate payloads',
  },
  {
    // S4-C: the record-only shadow ComplexityAssessment is deterministic.
    key: 'shadow_complexity_assessment_replayable',
    subtest: 'L5 shadow complexity assessment is replayable for the same inputs',
  },
  {
    // S4-C: collecting shadow telemetry has zero effect on run artifacts.
    key: 'shadow_collection_does_not_change_run_artifact_hash',
    subtest: 'L5 shadow telemetry collection does not change run artifact hashes',
  },
  {
    key: 'coordinator_queue_classification_exhaustive_no_unclassified',
    subtest: 'L5 coordinator queue classification is exhaustive over blocked-lane trusted codes and outcomes with unclassified reachable only via an unregistered trusted code',
  },
];

const REQUIRED_RUNTIME_REGRESSION_CASES = [
  {
    key: 'trace_integrity_profile_and_model_option_drift_rejected_before_gateway',
    subtest: 'trace integrity debate runtime rejects slot profile and model option drift before provider calls',
  },
  {
    key: 'trace_integrity_debate_inactive_project_rejected_before_orchestrator',
    subtest: 'trace integrity debate runtime rejects missing or inactive implementation project before provider calls',
  },
  {
    key: 'p1_runtime_review_inactive_project_rejected_before_orchestrator',
    subtest: 'P1 runtime review rejects missing or inactive implementation project before provider calls',
  },
  {
    key: 'result_analysis_inactive_project_rejected_before_orchestrator',
    subtest: 'result analysis runtime rejects missing or inactive implementation project before provider calls',
  },
  {
    key: 'experiment_planning_inactive_project_rejected_before_orchestrator',
    subtest: 'experiment planning runtime rejects missing or inactive implementation project before provider calls',
  },
  {
    key: 'route_planning_inactive_project_rejected_before_orchestrator',
    subtest: 'route planning runtime rejects missing or inactive implementation project before provider calls',
  },
  {
    key: 'route_skeptic_upstream_artifact_admission_recheck',
    subtest: 'route skeptic runtime rejects unadmitted, drifted, blocked, or wrong-slot upstream route proposals before provider calls',
  },
  {
    key: 'validation_cycle_planning_upstream_artifact_admission_recheck',
    subtest: 'validation cycle planning runtime rejects unadmitted, drifted, blocked, or wrong-slot upstream route artifacts before provider calls',
  },
  {
    key: 'feasibility_planning_upstream_artifact_admission_recheck',
    subtest: 'feasibility planning runtime rejects unadmitted, drifted, blocked, or wrong-slot upstream cycle artifacts before provider calls',
  },
  {
    key: 'feasibility_planning_route_lineage_anchor_admission_recheck',
    subtest: 'feasibility planning runtime rejects unadmitted or drifted route lineage anchors before provider calls',
  },
  {
    key: 'validation_cycle_planning_inactive_project_rejected_before_orchestrator',
    subtest: 'validation cycle planning runtime rejects missing or inactive implementation project before provider calls',
  },
  {
    key: 'feasibility_planning_inactive_project_rejected_before_orchestrator',
    subtest: 'feasibility planning runtime rejects missing or inactive implementation project before provider calls',
  },
  {
    key: 'cross_board_synthesis_inactive_project_rejected_before_orchestrator',
    subtest: 'cross-board synthesis runtime rejects missing or inactive implementation project before provider calls',
  },
  {
    key: 'evidence_board_curation_inactive_project_rejected_before_orchestrator',
    subtest: 'evidence-board curation runtime rejects missing or inactive implementation project before provider calls',
  },
  {
    key: 'motive_decomposition_inactive_project_rejected_before_orchestrator',
    subtest: 'motive decomposition runtime rejects missing or inactive implementation project before provider calls',
  },
  {
    key: 'motive_evolution_inactive_project_rejected_before_orchestrator',
    subtest: 'motive evolution runtime rejects missing or inactive implementation project before provider calls',
  },
  {
    key: 'domain_gate_claim_final_artifact_idempotency',
    subtest: 'runtime Domain Gate materializes an admitted claim final artifact idempotently',
  },
  {
    key: 'domain_gate_dossier_final_artifact_idempotency',
    subtest: 'runtime Domain Gate materializes an admitted dossier final artifact idempotently',
  },
  {
    key: 'domain_gate_result_analysis_final_artifact_idempotency',
    subtest: 'runtime Domain Gate materializes an admitted result-analysis final artifact idempotently',
  },
  {
    key: 'domain_gate_claim_dossier_same_id_drift_conflict',
    subtest: 'runtime Domain Gate rejects same-id claim and dossier materialization drift',
  },
  {
    key: 'domain_gate_role_and_blocked_final_artifact_rejection',
    subtest: 'runtime Domain Gate rejects role and blocked final artifacts',
  },
  {
    key: 'domain_gate_result_analysis_route_replay_idempotency',
    subtest: 'PaperImplementation result-analysis runtime run route uses the production slot service path',
  },
  {
    key: 'domain_gate_result_analysis_route_malformed_and_drift_rejection',
    subtest: 'PaperImplementation result-analysis Domain Gate route rejects malformed and drifted payloads',
  },
  {
    key: 'domain_gate_support_only_runtime_final_artifact_rejection_matrix',
    subtest: 'PaperImplementation Domain Gate rejects support-only runtime final artifacts',
  },
  {
    key: 'domain_gate_blocked_and_failed_runtime_final_artifact_rejection',
    subtest: 'PaperImplementation runtime Domain Gate route rejects blocked and failed runtime artifacts',
  },
  {
    key: 'coordinator_lane_a_single_advance_completes',
    subtest: 'coordinator lane A single advance completes with chained artifact lineage',
  },
  {
    key: 'coordinator_concurrent_advance_single_execution',
    subtest: 'coordinator concurrent double advance executes once and rejects the loser with 409',
  },
  {
    key: 'coordinator_crash_readvance_resumes_without_duplicates',
    subtest: 'coordinator crash re-advance resumes from the breakpoint without duplicate steps or artifacts',
  },
  {
    key: 'coordinator_budget_exhausted',
    subtest: 'coordinator budget exhaustion parks the run as budget_exhausted',
  },
  {
    key: 'coordinator_selection_decision_replayable',
    subtest: 'coordinator candidate selection decision records are replayable from stored projections',
  },
  {
    key: 'coordinator_blocked_step_materializes_queue_item',
    subtest: 'coordinator blocked step materializes a decision work queue item with dedup and retry accumulation',
  },
  {
    key: 'queue_resolve_readvance_resumes_run',
    subtest: 'queue resolve re-advance resumes the coordinator run from the breakpoint',
  },
  {
    key: 'coordinator_no_eligible_candidate_blocks_and_reflows',
    subtest: 'coordinator no-eligible-candidate step blocks the run and override re-advance reflows the same slot',
  },
  {
    key: 'coordinator_step_projection_seeds_acceptance_bridge',
    subtest: 'coordinator admitted step projection seeds the acceptance bridge and backfills authority lineage',
  },
];

const REQUIRED_DETERMINISTIC_LANE_CASES = [
  {
    key: 'work_order_admission_gate_result_must_resolve',
    subtest: 'work order admission rejects unresolvable or non-passed admission gate results',
  },
  {
    key: 'trace_gate_result_persisted_and_resolvable',
    subtest: 'trace gate evaluation persists the gate result for later resolution',
  },
  {
    key: 'intake_bootstrap_route_replay_stale_hash',
    subtest: 'PaperImplementation routes expose bootstrap, idempotent duplicate, stale hash, and feedback behavior through real service',
  },
  {
    key: 'intake_bootstrap_service_idempotency',
    subtest: 'duplicate bootstrap with same bridge/hash returns existing project idempotently',
  },
  {
    key: 'intake_bootstrap_stale_hash_no_mutation',
    subtest: 'hash mismatch and changed upstream hash block without mutating admitted implementation state',
  },
  {
    key: 'trace_manifest_complete_no_queue',
    subtest: 'complete trace manifest creates no repair queue items and passes trace gate',
  },
  {
    key: 'trace_manifest_stale_refs_repair_queue',
    subtest: 'stale refs produce stale status and queryable stale count',
  },
  {
    key: 'trace_manifest_immutable_id_conflict',
    subtest: 'memory repository rejects duplicate immutable trace citation and claim ids',
  },
  {
    key: 'work_order_draft_admitted_cycle_and_plan_refs',
    subtest: 'creates ResearchWorkOrder draft from admitted validation cycle and plan refs',
  },
  {
    key: 'work_order_draft_stale_trace_rejection',
    subtest: 'blocks draft creation from non-admitted cycle and stale work-order trace',
  },
  {
    key: 'work_order_admission_replay_and_drift',
    subtest: 'work order admission replays same gate result and rejects drifted gate result',
  },
  {
    key: 'work_order_harness_submission_replay_and_drift',
    subtest: 'harness run submission replays same idempotency key and rejects drifted external job identity',
  },
  {
    key: 'work_order_final_evidence_trace_identity',
    subtest: 'trusted final run evidence requires target-specific run evidence trace manifest',
  },
  {
    key: 'acceptance_bridge_lineage_drift_rejected',
    subtest: 'acceptance bridge rejects lineage drift for forged hash, blocked final, and wrong workflow type',
  },
  {
    key: 'human_confirmation_target_binding_enforced',
    subtest: 'human confirmation target binding rejects records that do not cover the authorized object',
  },
  {
    key: 'human_confirmation_single_use_consumption',
    subtest: 'human confirmation record is consumed once and rejects reuse across decisions',
  },
];

const DETERMINISTIC_LANE_TEST_NAME_PATTERN = REQUIRED_DETERMINISTIC_LANE_CASES
  .map((item) => escapeRegExp(item.subtest))
  .join('|');

const REQUIRED_DECISION_WORK_QUEUE_CASES = [
  {
    key: 'decision_queue_dedups_equivalent_blockers_across_harness_reruns',
    subtest: 'DecisionWorkQueue dedups equivalent blockers across harness reruns',
  },
  {
    key: 'decision_queue_resolution_replay_and_terminal_drift_rejection',
    subtest: 'DecisionWorkQueue resolution replays terminal status and rejects terminal drift without authority writes',
  },
  {
    key: 'decision_queue_reopens_terminal_item_on_recurrent_blocker',
    subtest: 'DecisionWorkQueue reopens terminal item when equivalent blocker recurs',
  },
  {
    key: 'decision_queue_prisma_resolution_replay_and_terminal_drift_rejection',
    subtest: 'DecisionWorkQueue Prisma resolution replays terminal status and rejects terminal drift',
  },
  {
    key: 'runtime_admission_rejects_drift_without_queue_payloads',
    subtest: 'PaperImplementationRuntimeAdmissionService rejects hash and schema drift without exposing queue payloads',
  },
];

const DECISION_WORK_QUEUE_TEST_NAME_PATTERN = REQUIRED_DECISION_WORK_QUEUE_CASES
  .map((item) => escapeRegExp(item.subtest))
  .join('|');

const REQUIRED_LIVE_EXPERIMENT_ADAPTER_CASES = [
  {
    key: 'live_adapter_submit_admitted_work_order_idempotent',
    subtest: 'submits admitted WorkOrder to experiment-foundation execution idempotently',
    source_step_id: LIVE_EXPERIMENT_ADAPTER_REGRESSION_STEP_ID,
  },
  {
    key: 'live_adapter_submit_blocks_unadmitted_before_external_call',
    subtest: 'blocks submit before external execution when WorkOrder is not admitted or running',
    source_step_id: LIVE_EXPERIMENT_ADAPTER_REGRESSION_STEP_ID,
  },
  {
    key: 'live_adapter_submit_blocks_missing_materialization_refs',
    subtest: 'blocks live submit when WorkOrder lacks materialization refs',
    source_step_id: LIVE_EXPERIMENT_ADAPTER_REGRESSION_STEP_ID,
  },
  {
    key: 'live_adapter_wrong_external_job_rejected_before_side_effects',
    subtest: 'blocks wrong external job before sync collect or cancel side effects',
    source_step_id: LIVE_EXPERIMENT_ADAPTER_REGRESSION_STEP_ID,
  },
  {
    key: 'live_adapter_sync_running_records_monitor_without_evidence',
    subtest: 'sync records non-final monitor intake without trusted run evidence',
    source_step_id: LIVE_EXPERIMENT_ADAPTER_REGRESSION_STEP_ID,
  },
  {
    key: 'live_adapter_sync_terminal_observation_without_evidence',
    subtest: 'sync observes terminal external status without creating evidence and recommends finalization',
    source_step_id: LIVE_EXPERIMENT_ADAPTER_REGRESSION_STEP_ID,
  },
  {
    key: 'live_adapter_collect_success_finalizes_trusted_evidence_idempotent',
    subtest: 'collect creates target-specific trace and trusted run evidence from stored result hashes',
    source_step_id: LIVE_EXPERIMENT_ADAPTER_REGRESSION_STEP_ID,
  },
  {
    key: 'live_adapter_cancel_nonfinal_records_monitor_without_evidence',
    subtest: 'cancel records non-final status without trusted run evidence while external job is cancelling',
    source_step_id: LIVE_EXPERIMENT_ADAPTER_REGRESSION_STEP_ID,
  },
  {
    key: 'live_adapter_cancel_terminal_finalizes_trusted_evidence_idempotent',
    subtest: 'cancel finalizes trusted cancelled run evidence with target-specific trace',
    source_step_id: LIVE_EXPERIMENT_ADAPTER_REGRESSION_STEP_ID,
  },
  {
    key: 'live_adapter_route_submit_schema_and_delegate',
    subtest: 'route wiring validates submit payload and delegates live experiment submit',
    source_step_id: LIVE_EXPERIMENT_ADAPTER_REGRESSION_STEP_ID,
  },
  {
    key: 'live_adapter_external_failure_no_partial_state_or_fallback',
    subtest: 'live adapter external execution failures do not create partial state or fallback artifacts',
    source_step_id: LIVE_EXPERIMENT_ADAPTER_REGRESSION_STEP_ID,
  },
  {
    key: 'live_adapter_no_runtime_admission_harness_entrypoint',
    subtest: 'PaperImplementation live adapter ownership scan keeps runtime admission and harness out of live experiment execution',
    source_step_id: LIVE_EXPERIMENT_ADAPTER_OWNERSHIP_STEP_ID,
  },
];

const LIVE_EXPERIMENT_ADAPTER_TEST_NAME_PATTERN = REQUIRED_LIVE_EXPERIMENT_ADAPTER_CASES
  .filter((item) => item.source_step_id === LIVE_EXPERIMENT_ADAPTER_REGRESSION_STEP_ID)
  .map((item) => escapeRegExp(item.subtest))
  .join('|');

const REQUIRED_PROVIDER_VARIANCE_EVALUATION_CASES = [
  {
    key: 'provider_variance_fake_replay_materializes_harness_signals',
    subtest: 'provider variance evaluation deterministically replays fake provider cases and materializes harness signals',
    source_step_id: PROVIDER_VARIANCE_EVALUATION_REGRESSION_STEP_ID,
  },
  {
    key: 'provider_variance_live_profiles_no_execution',
    subtest: 'provider variance evaluation reports live provider profiles without executing live calls',
    source_step_id: PROVIDER_VARIANCE_EVALUATION_REGRESSION_STEP_ID,
  },
  {
    key: 'provider_variance_schema_trace_authority_handoff_guardrails',
    subtest: 'provider variance evaluation covers schema trace authority and handoff guardrails',
    source_step_id: PROVIDER_VARIANCE_EVALUATION_REGRESSION_STEP_ID,
  },
  {
    key: 'provider_variance_evaluation_only_refs_no_runtime_admission_or_domain_gate',
    subtest: 'provider variance evaluation exposes evaluation-only refs without runtime admission or Domain Gate authority',
    source_step_id: PROVIDER_VARIANCE_EVALUATION_REGRESSION_STEP_ID,
  },
  {
    key: 'provider_variance_route_schema_and_delegate',
    subtest: 'provider variance evaluation route validates payloads and returns aggregate report',
    source_step_id: PROVIDER_VARIANCE_EVALUATION_REGRESSION_STEP_ID,
  },
  {
    key: 'provider_variance_no_runtime_admission_domain_gate_or_live_entrypoint',
    subtest: 'PaperImplementation provider variance ownership scan keeps evaluation out of runtime admission Domain Gate and live execution',
    source_step_id: PROVIDER_VARIANCE_EVALUATION_OWNERSHIP_STEP_ID,
  },
];

const PROVIDER_VARIANCE_EVALUATION_TEST_NAME_PATTERN = REQUIRED_PROVIDER_VARIANCE_EVALUATION_CASES
  .filter((item) => item.source_step_id === PROVIDER_VARIANCE_EVALUATION_REGRESSION_STEP_ID)
  .map((item) => escapeRegExp(item.subtest))
  .join('|');

const steps = [
  {
    id: L5_STEP_ID,
    cwd: path.join(REPO_ROOT, 'apps/backend'),
    command: 'node',
    args: [
      '--test',
      '--loader',
      'ts-node/esm',
      'src/services/paper-implementation-runtime-l5-stress.unit.test.ts',
    ],
  },
  {
    id: RUNTIME_REGRESSION_STEP_ID,
    cwd: path.join(REPO_ROOT, 'apps/backend'),
    command: 'node',
    args: [
      '--test',
      '--loader',
      'ts-node/esm',
      'src/services/paper-implementation-compression-attempt.unit.test.ts',
      'src/services/paper-implementation-trace-integrity-debate-runtime-service.unit.test.ts',
      'src/services/paper-implementation-p1-runtime-review-service.unit.test.ts',
      'src/services/paper-implementation-result-analysis-runtime-service.unit.test.ts',
      'src/services/paper-implementation-experiment-planning-runtime-service.unit.test.ts',
      'src/services/paper-implementation-route-planning-runtime-service.unit.test.ts',
      'src/services/paper-implementation-validation-cycle-planning-runtime-service.unit.test.ts',
      'src/services/paper-implementation-feasibility-planning-runtime-service.unit.test.ts',
      'src/services/paper-implementation-cross-board-synthesis-runtime-service.unit.test.ts',
      'src/services/paper-implementation-evidence-board-curation-runtime-service.unit.test.ts',
      'src/services/paper-implementation-motive-decomposition-runtime-service.unit.test.ts',
      'src/services/paper-implementation-motive-evolution-runtime-service.unit.test.ts',
      'src/services/paper-implementation-runtime-domain-gate-service.unit.test.ts',
      'src/services/paper-implementation-run-coordinator-service.unit.test.ts',
      'src/routes/paper-implementation-runtime-routes.integration.test.ts',
    ],
  },
  {
    id: DOMAIN_GATE_WRITER_OWNERSHIP_STEP_ID,
    cwd: REPO_ROOT,
    command: 'node',
    args: [
      '.ai/scripts/paper-implementation-domain-gate-writer-ownership-check.mjs',
    ],
  },
  {
    id: DETERMINISTIC_LANE_REGRESSION_STEP_ID,
    cwd: path.join(REPO_ROOT, 'apps/backend'),
    command: 'node',
    args: [
      '--test',
      '--loader',
      'ts-node/esm',
      '--test-name-pattern',
      DETERMINISTIC_LANE_TEST_NAME_PATTERN,
      'src/services/paper-implementation-intake-bootstrap-service.unit.test.ts',
      'src/services/paper-implementation-trace-kernel-service.unit.test.ts',
      'src/services/paper-implementation-workorder-experiment-bridge-service.unit.test.ts',
      'src/routes/paper-implementation-routes.integration.test.ts',
    ],
  },
  {
    id: DECISION_WORK_QUEUE_REGRESSION_STEP_ID,
    cwd: path.join(REPO_ROOT, 'apps/backend'),
    command: 'node',
    args: [
      '--test',
      '--loader',
      'ts-node/esm',
      '--test-name-pattern',
      DECISION_WORK_QUEUE_TEST_NAME_PATTERN,
      'src/services/paper-implementation-ai-workflow-harness-service.unit.test.ts',
      'src/repositories/prisma/prisma-paper-implementation-ai-workflow-harness-repository.unit.test.ts',
      'src/services/paper-implementation-runtime-admission-service.unit.test.ts',
    ],
  },
  {
    id: LIVE_EXPERIMENT_ADAPTER_REGRESSION_STEP_ID,
    cwd: path.join(REPO_ROOT, 'apps/backend'),
    command: 'node',
    args: [
      '--test',
      '--loader',
      'ts-node/esm',
      '--test-name-pattern',
      LIVE_EXPERIMENT_ADAPTER_TEST_NAME_PATTERN,
      'src/services/paper-implementation-live-experiment-adapter-service.unit.test.ts',
    ],
  },
  {
    id: LIVE_EXPERIMENT_ADAPTER_OWNERSHIP_STEP_ID,
    cwd: REPO_ROOT,
    command: 'node',
    args: [
      '.ai/scripts/paper-implementation-live-adapter-ownership-check.mjs',
    ],
  },
  {
    id: PROVIDER_VARIANCE_EVALUATION_REGRESSION_STEP_ID,
    cwd: path.join(REPO_ROOT, 'apps/backend'),
    command: 'node',
    args: [
      '--test',
      '--loader',
      'ts-node/esm',
      '--test-name-pattern',
      PROVIDER_VARIANCE_EVALUATION_TEST_NAME_PATTERN,
      'src/services/paper-implementation-provider-variance-evaluation-service.unit.test.ts',
    ],
  },
  {
    id: PROVIDER_VARIANCE_EVALUATION_OWNERSHIP_STEP_ID,
    cwd: REPO_ROOT,
    command: 'node',
    args: [
      '.ai/scripts/paper-implementation-provider-variance-ownership-check.mjs',
    ],
  },
];

function normalizeOptionalString(value) {
  const normalized = value?.trim();
  return normalized || null;
}

function positiveInt(raw, fallback) {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function deterministicTestEnv() {
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    AUTO_PULL_SCHEDULER_ENABLED: 'false',
    T114_TRACE_INTEGRITY_PROVIDER_CANARY_LIVE: '',
    T114_P1_CLAIM_BOUNDARY_PROVIDER_CANARY_LIVE: '',
    T114_P1_DOSSIER_READINESS_PROVIDER_CANARY_LIVE: '',
    T114_RESULT_ANALYSIS_PROVIDER_CANARY_LIVE: '',
    T114_EXPERIMENT_DESIGN_PROVIDER_CANARY_LIVE: '',
    T114_EXPERIMENT_CRITIQUE_PROVIDER_CANARY_LIVE: '',
    T114_ROUTE_ARCHITECTURE_PROVIDER_CANARY_LIVE: '',
    T114_ROUTE_SKEPTIC_PROVIDER_CANARY_LIVE: '',
    T114_VALIDATION_CYCLE_PROVIDER_CANARY_LIVE: '',
    T114_FEASIBILITY_PLANNING_PROVIDER_CANARY_LIVE: '',
    T114_CROSS_BOARD_SYNTHESIS_PROVIDER_CANARY_LIVE: '',
    T114_EVIDENCE_BOARD_CURATION_PROVIDER_CANARY_LIVE: '',
    T114_MOTIVE_DECOMPOSITION_PROVIDER_CANARY_LIVE: '',
    T114_MOTIVE_EVOLUTION_PROVIDER_CANARY_LIVE: '',
    T114_PROVIDER_FAIL_CLOSED_CANARY_LIVE: '',
    T114_RUNTIME_PRISMA_SMOKE: '',
  };
  for (const key of [
    'OPENAI_API_KEY',
    'DASHSCOPE_API_KEY',
    'DASHSCOPE_API_KEY_CODING',
    'DEEPSEEK_API_KEY',
    'TITLE_CARD_REPOSITORY',
    'RESEARCH_LIFECYCLE_REPOSITORY',
    'PAPER_IMPLEMENTATION_REPOSITORY',
    'AUTO_PULL_REPOSITORY',
    'APPLICATION_SETTINGS_REPOSITORY',
    'EXPERIMENT_FOUNDATION_REPOSITORY',
  ]) {
    delete env[key];
  }
  return env;
}

function parseTapOutput(output) {
  const counters = {};
  for (const match of output.matchAll(/^# (tests|suites|pass|fail|cancelled|skipped|todo) (\d+)$/gmu)) {
    counters[match[1]] = Number.parseInt(match[2], 10);
  }
  const durationMatch = [...output.matchAll(/^# duration_ms ([0-9.]+)$/gmu)].at(-1);
  const subtests = [];
  for (const match of output.matchAll(/^(ok|not ok) \d+ - (.+?)(?: # (SKIP|TODO)\b.*)?$/gmu)) {
    subtests.push({
      name: match[2],
      status: match[1] === 'ok'
        ? match[3] === 'SKIP' ? 'skipped' : match[3] === 'TODO' ? 'todo' : 'passed'
        : 'failed',
    });
  }
  return {
    tests: counters.tests ?? null,
    suites: counters.suites ?? null,
    pass: counters.pass ?? null,
    fail: counters.fail ?? null,
    cancelled: counters.cancelled ?? null,
    skipped: counters.skipped ?? null,
    todo: counters.todo ?? null,
    duration_ms: durationMatch ? Number.parseFloat(durationMatch[1]) : null,
    subtests,
  };
}

function buildRequiredCaseCoverage(results, requiredCases, sourceStepId) {
  const sourceStep = results.find((result) => result.id === sourceStepId);
  const subtestsByName = new Map(
    (sourceStep?.tap_summary?.subtests ?? []).map((subtest) => [subtest.name, subtest]),
  );
  const cases = requiredCases.map((item) => {
    const subtest = subtestsByName.get(item.subtest);
    return {
      key: item.key,
      required_subtest: item.subtest,
      observed_status: subtest?.status ?? 'missing',
      passed: subtest?.status === 'passed',
    };
  });
  return {
    source: 'parsed_tap_subtests',
    source_step_id: sourceStepId,
    status: cases.every((item) => item.passed) ? 'passed' : 'failed',
    cases,
  };
}

function buildRequiredCaseCoverageBySource(results, requiredCases) {
  const subtestsBySource = new Map();
  for (const result of results) {
    subtestsBySource.set(
      result.id,
      new Map((result.tap_summary?.subtests ?? []).map((subtest) => [subtest.name, subtest])),
    );
  }
  const cases = requiredCases.map((item) => {
    const subtest = subtestsBySource.get(item.source_step_id)?.get(item.subtest);
    return {
      key: item.key,
      required_subtest: item.subtest,
      source_step_id: item.source_step_id,
      observed_status: subtest?.status ?? 'missing',
      passed: subtest?.status === 'passed',
    };
  });
  return {
    source: 'parsed_tap_subtests_by_source_step',
    source_step_ids: [...new Set(requiredCases.map((item) => item.source_step_id))],
    status: cases.every((item) => item.passed) ? 'passed' : 'failed',
    cases,
  };
}

function buildRequiredL5CaseCoverage(results) {
  return buildRequiredCaseCoverage(results, REQUIRED_L5_CASES, L5_STEP_ID);
}

function aggregateTapTotals(results) {
  const totals = {
    tests: 0,
    pass: 0,
    fail: 0,
    cancelled: 0,
    skipped: 0,
    todo: 0,
  };
  for (const result of results) {
    const summary = result.tap_summary;
    if (!summary) {
      continue;
    }
    for (const key of Object.keys(totals)) {
      totals[key] += summary[key] ?? 0;
    }
  }
  return totals;
}

async function runStep(step) {
  const startedAt = new Date();
  const logPath = path.join(ARTIFACT_DIR, `${step.id}.log`);
  const outputChunks = [];
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  await fs.writeFile(logPath, '');

  // Multi-file `node --test` steps spawn a ts-node fleet as wide as the full
  // backend suite's — take the machine-wide suite lock so they never overlap
  // another session's fleet. Acquired before the step timer starts, so lock
  // wait does not consume the step budget. Residual (pre-existing): a step
  // timeout kills only the coordinator, so orphaned workers may briefly
  // outlive the released lock on that rare path.
  const spawnsTestFleet =
    step.args.filter((arg) => typeof arg === 'string' && arg.endsWith('.test.ts')).length >= 2;
  const releaseSuiteLock = spawnsTestFleet ? await acquireSuiteLock() : () => {};

  let exit;
  try {
    const child = spawn(step.command, step.args, {
      cwd: step.cwd,
      env: deterministicTestEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
    }, CHILD_TIMEOUT_MS);

    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (chunk) => {
        process.stdout.write(chunk);
        outputChunks.push(chunk);
      });
    }

    exit = await new Promise((resolve) => {
      child.on('close', (code, signal) => resolve({ code, signal }));
    });
    clearTimeout(timeout);
  } finally {
    releaseSuiteLock();
  }

  const output = Buffer.concat(outputChunks).toString('utf8');
  const tapSummary = parseTapOutput(output);
  await fs.writeFile(logPath, output);
  const finishedAt = new Date();
  return {
    id: step.id,
    status: exit.code === 0 ? 'passed' : 'failed',
    command: [step.command, ...step.args].join(' '),
    cwd: path.relative(REPO_ROOT, step.cwd),
    exit_code: exit.code,
    signal: exit.signal,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    elapsed_ms: finishedAt.getTime() - startedAt.getTime(),
    log_path: path.relative(REPO_ROOT, logPath),
    tap_summary: tapSummary,
  };
}

async function main() {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  const results = [];
  for (const step of steps) {
    results.push(await runStep(step));
    if (results[results.length - 1].status !== 'passed') {
      break;
    }
  }
  const requiredL5Cases = buildRequiredL5CaseCoverage(results);
  const requiredRuntimeRegressionCases = buildRequiredCaseCoverage(
    results,
    REQUIRED_RUNTIME_REGRESSION_CASES,
    RUNTIME_REGRESSION_STEP_ID,
  );
  const requiredDeterministicLaneCases = buildRequiredCaseCoverage(
    results,
    REQUIRED_DETERMINISTIC_LANE_CASES,
    DETERMINISTIC_LANE_REGRESSION_STEP_ID,
  );
  const requiredDecisionWorkQueueCases = buildRequiredCaseCoverage(
    results,
    REQUIRED_DECISION_WORK_QUEUE_CASES,
    DECISION_WORK_QUEUE_REGRESSION_STEP_ID,
  );
  const requiredLiveExperimentAdapterCases = buildRequiredCaseCoverageBySource(
    results,
    REQUIRED_LIVE_EXPERIMENT_ADAPTER_CASES,
  );
  const requiredProviderVarianceEvaluationCases = buildRequiredCaseCoverageBySource(
    results,
    REQUIRED_PROVIDER_VARIANCE_EVALUATION_CASES,
  );
  const stepStatus = results.every((result) => result.status === 'passed') ? 'passed' : 'failed';
  const summary = {
    schema_version: 'paper-implementation-runtime-stress-summary-v0',
    run_id: RUN_ID,
    scenario_id: 'paper-implementation.runtime.l5.stress-compression-adversarial.v1',
    artifact_dir: path.relative(REPO_ROOT, ARTIFACT_DIR),
    started_at: results[0]?.started_at ?? new Date().toISOString(),
    finished_at: new Date().toISOString(),
    status: stepStatus === 'passed'
      && requiredL5Cases.status === 'passed'
      && requiredRuntimeRegressionCases.status === 'passed'
      && requiredDeterministicLaneCases.status === 'passed'
      && requiredDecisionWorkQueueCases.status === 'passed'
      && requiredLiveExperimentAdapterCases.status === 'passed'
      && requiredProviderVarianceEvaluationCases.status === 'passed'
      ? 'passed'
      : 'failed',
    steps: results,
    tap_totals: aggregateTapTotals(results),
    required_l5_cases: requiredL5Cases,
    required_runtime_regression_cases: requiredRuntimeRegressionCases,
    required_deterministic_lane_cases: requiredDeterministicLaneCases,
    required_decision_work_queue_cases: requiredDecisionWorkQueueCases,
    required_live_experiment_adapter_cases: requiredLiveExperimentAdapterCases,
    required_provider_variance_evaluation_cases: requiredProviderVarianceEvaluationCases,
    runner_guardrails: {
      source: 'runner_configuration',
      no_parallel_harness_entrypoint: 'runner only spawns node --test commands and does not create runtime artifacts itself',
      deterministic_no_live_provider_keys: {
        unset_keys: [
          'OPENAI_API_KEY',
          'DASHSCOPE_API_KEY',
          'DASHSCOPE_API_KEY_CODING',
          'DEEPSEEK_API_KEY',
        ],
        disabled_flags: [
          'T114_TRACE_INTEGRITY_PROVIDER_CANARY_LIVE',
          'T114_P1_CLAIM_BOUNDARY_PROVIDER_CANARY_LIVE',
          'T114_P1_DOSSIER_READINESS_PROVIDER_CANARY_LIVE',
          'T114_RESULT_ANALYSIS_PROVIDER_CANARY_LIVE',
          'T114_EXPERIMENT_DESIGN_PROVIDER_CANARY_LIVE',
          'T114_EXPERIMENT_CRITIQUE_PROVIDER_CANARY_LIVE',
          'T114_ROUTE_ARCHITECTURE_PROVIDER_CANARY_LIVE',
          'T114_ROUTE_SKEPTIC_PROVIDER_CANARY_LIVE',
          'T114_VALIDATION_CYCLE_PROVIDER_CANARY_LIVE',
          'T114_FEASIBILITY_PLANNING_PROVIDER_CANARY_LIVE',
          'T114_CROSS_BOARD_SYNTHESIS_PROVIDER_CANARY_LIVE',
          'T114_EVIDENCE_BOARD_CURATION_PROVIDER_CANARY_LIVE',
          'T114_MOTIVE_DECOMPOSITION_PROVIDER_CANARY_LIVE',
          'T114_MOTIVE_EVOLUTION_PROVIDER_CANARY_LIVE',
          'T114_PROVIDER_FAIL_CLOSED_CANARY_LIVE',
          'T114_RUNTIME_PRISMA_SMOKE',
        ],
      },
    },
  };
  const summaryPath = path.join(ARTIFACT_DIR, '90-summary.json');
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== 'passed') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
