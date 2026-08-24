// SlotParameterManifest@v1 (T-124 S2-D, D5 地基).
//
// Single machine-readable parameter truth for every promoted paper-implementation
// runtime slot. The backend model-profile registry is the runtime authority; this
// module derives the manifest from it at runtime and binds the slot-level identity
// facts (route, prompt template, context policy id, token budget, materialization
// class, canary flag, runtime-stress must-check cases) that the registry does not
// own. A committed JSON snapshot (see PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_SNAPSHOT_PATH,
// regenerated via `node apps/backend/scripts/paper-implementation-slot-parameter-manifest-export.mjs`)
// makes every parameter change a reviewable diff; the unit test suite enforces
// snapshot freshness and four-way completeness (routes ↔ manifest ↔ runtime-stress
// must-check cases ↔ provider canary env flags).
//
// New promoted slots MUST add a binding here (and regenerate the snapshot) instead
// of hand-writing a dev-docs Profile Resolution Block.

import {
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
  PAPER_IMPLEMENTATION_P1_REVIEW_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_P1_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROFILE_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_PLANNING_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_ROUTE_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROFILE_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import {
  PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_TIERS,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-debate-complexity-shadow';
import {
  PAPER_IMPLEMENTATION_DEBATE_POLICY_REGISTRY,
  type PaperImplementationDebatePolicy,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-debate-policy';
import type {
  TopicSelectionModelOption,
  TopicSelectionModelProfile,
  TopicSelectionModelProfileRegistry,
  TopicSelectionModelProfileRunModeEligibility,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';

import {
  createDefaultTopicSelectionModelProfileRegistry,
  TopicSelectionModelProfileRegistryService,
} from './topic-selection-model-profile-registry-service.js';

export const PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_SCHEMA_VERSION =
  'SlotParameterManifest@v1' as const;

/** Repo-relative path of the committed snapshot regenerated by the export script. */
export const PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_SNAPSHOT_PATH =
  'docs/context/paper-implementation/slot-parameter-manifest.json' as const;

export const PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_EXPORT_SCRIPT =
  'apps/backend/scripts/paper-implementation-slot-parameter-manifest-export.mjs' as const;

export const PAPER_IMPLEMENTATION_SLOT_MATERIALIZATION_CLASSES = [
  // Slot final artifacts may be materialized through the runtime Domain Gate
  // (claim / dossier / result-analysis).
  'domain_gate_materializable',
  // Slot output stays a runtime proposal artifact; downstream consumption goes
  // through admission + acceptance-bridge, never Domain Gate materialization.
  'proposal_only',
  // Reserved: slots whose output only hands off to another domain (none in v1).
  'handoff_only',
] as const;
export type PaperImplementationSlotMaterializationClass =
  (typeof PAPER_IMPLEMENTATION_SLOT_MATERIALIZATION_CLASSES)[number];

const RUNTIME_SLOT_ROUTE_PREFIX =
  '/paper-implementation/projects/:implementation_project_id/runtime-slots/' as const;

/**
 * Canary env flags in the runtime-stress / near-prod scripts that are not bound
 * to a single runtime slot (chain-level fail-closed canary).
 */
export const PAPER_IMPLEMENTATION_NON_SLOT_CANARY_ENV_FLAGS = [
  'T114_PROVIDER_FAIL_CLOSED_CANARY_LIVE',
] as const;

export interface PaperImplementationSlotTokenBudget {
  estimated_input_token_target: number;
  estimated_output_token_budget: number;
  context_window_tokens: number;
  token_estimate_safety_margin: number;
}

/**
 * Slot-level identity facts the model-profile registry does not own.
 * `context_policy_profile_id` and `token_budget` mirror the slot service's
 * context policy profile (the values are pinned to the service source by the
 * manifest unit tests without touching the services).
 */
export interface PaperImplementationSlotManifestBinding {
  slot_id: string;
  runtime_route_segment: string;
  runtime_request_schema_version: string;
  service_module: string;
  profile_id: string;
  prompt_template_id: string;
  prompt_template_version: string;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  token_budget: PaperImplementationSlotTokenBudget;
  materialization_class: PaperImplementationSlotMaterializationClass;
  canary_env_flag: string;
  runtime_stress_required_case_keys: readonly string[];
  /**
   * T-124 D2-core: the enforced DebatePolicy@v1 id this slot executes; resolved
   * against the shared PAPER_IMPLEMENTATION_DEBATE_POLICY_REGISTRY at export
   * (unknown id refuses export). Omitted for slots that are not policy-driven
   * (P1/evolution stay shadow-recorded in v1).
   */
  debate_policy_id?: string;
}

export interface PaperImplementationSlotManifestModelProfile {
  profile_id: string;
  profile_version: string;
  status: TopicSelectionModelProfile['status'];
  profile_function: string;
  role_family: TopicSelectionModelProfile['role_family'];
  stage_family: string;
  output_contract: string;
  allowed_execution_modes: TopicSelectionModelProfile['allowed_execution_modes'];
  run_mode_eligibility: TopicSelectionModelProfileRunModeEligibility;
  model_options: TopicSelectionModelOption[];
  provider_fallback_policy: TopicSelectionModelProfile['provider_fallback_policy'];
  failure_handling_policy: TopicSelectionModelProfile['failure_handling_policy'];
  budget_policy: TopicSelectionModelProfile['budget_policy'];
}

export interface PaperImplementationSlotParameterManifestEntry {
  slot_id: string;
  runtime_route_path: string;
  runtime_route_segment: string;
  runtime_request_schema_version: string;
  service_module: string;
  materialization_class: PaperImplementationSlotMaterializationClass;
  prompt_template: {
    prompt_template_id: string;
    prompt_template_version: string;
  };
  context_policy: {
    context_policy_profile_id: string;
    context_policy_profile_version: string;
  };
  token_budget: PaperImplementationSlotTokenBudget;
  model_profile: PaperImplementationSlotManifestModelProfile;
  canary_env_flag: string;
  runtime_stress_required_case_keys: string[];
  /**
   * D2 debate kernel policy mount (T-124 D2-core): the full enforced
   * DebatePolicy@v1 (tier role plans + budget parameters) for tier-driven
   * slots; null for slots that are not policy-driven yet.
   */
  debate_policy: PaperImplementationDebatePolicy | null;
  /** D2/D4 candidate selection policy mount — null until it lands. */
  candidate_selection_policy: null;
  /** D4 memory family mount — null until D4 lands. */
  memory_families: null;
}

export interface PaperImplementationSlotParameterManifest {
  schema_version: typeof PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_SCHEMA_VERSION;
  domain: 'paper_implementation';
  registry_schema_version: string;
  export_script: typeof PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_EXPORT_SCRIPT;
  slot_count: number;
  slots: PaperImplementationSlotParameterManifestEntry[];
}

// trace-integrity / claim-boundary / dossier-readiness / result-analysis all pin
// the same 24k/1.8k budget in their service context policy profiles.
const REVIEW_SLOT_TOKEN_BUDGET: PaperImplementationSlotTokenBudget = {
  estimated_input_token_target: 24_000,
  estimated_output_token_budget: 1_800,
  context_window_tokens: 128_000,
  token_estimate_safety_margin: 1.25,
};

const ROUTE_PLANNING_TOKEN_BUDGET: PaperImplementationSlotTokenBudget = {
  estimated_input_token_target: 32_000,
  estimated_output_token_budget: 2_400,
  context_window_tokens: 128_000,
  token_estimate_safety_margin: 1.25,
};

const EXPERIMENT_PLANNING_TOKEN_BUDGET: PaperImplementationSlotTokenBudget = {
  estimated_input_token_target: 32_000,
  estimated_output_token_budget: 2_400,
  context_window_tokens: 128_000,
  token_estimate_safety_margin: 1.25,
};

export const PAPER_IMPLEMENTATION_SLOT_MANIFEST_BINDINGS: readonly PaperImplementationSlotManifestBinding[] = [
  {
    slot_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
    runtime_route_segment: 'trace-integrity-boundary-debate',
    runtime_request_schema_version:
      PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    service_module:
      'apps/backend/src/services/paper-implementation-trace-integrity-debate-runtime-service.ts',
    profile_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
    prompt_template_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_ID,
    prompt_template_version: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_VERSION,
    context_policy_profile_id: 'paper-implementation.trace-integrity.context-policy.v1',
    context_policy_profile_version: 'v1',
    token_budget: REVIEW_SLOT_TOKEN_BUDGET,
    materialization_class: 'proposal_only',
    canary_env_flag: 'T114_TRACE_INTEGRITY_PROVIDER_CANARY_LIVE',
    runtime_stress_required_case_keys: [
      'trace_over_budget_zero_provider_calls',
      'trace_integrity_profile_and_model_option_drift_rejected_before_gateway',
      'trace_integrity_debate_inactive_project_rejected_before_orchestrator',
      // T-124 D2-core tier must-checks (registered before implementation).
      'trace_debate_tier_decision_replayable',
      'trace_debate_tier_identity_drift_rejected',
      'trace_debate_light_upgrade_deterministic',
      'trace_debate_tier_budget_insufficient_classified',
    ],
    debate_policy_id: 'paper-implementation.trace-integrity.boundary-debate.v1',
  },
  {
    slot_id: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
    runtime_route_segment: 'claim-boundary-debate',
    runtime_request_schema_version: PAPER_IMPLEMENTATION_P1_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    service_module:
      'apps/backend/src/services/paper-implementation-p1-runtime-review-service.ts',
    profile_id: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
    prompt_template_id: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROMPT_TEMPLATE_ID,
    prompt_template_version: PAPER_IMPLEMENTATION_P1_REVIEW_PROMPT_TEMPLATE_VERSION,
    context_policy_profile_id: 'paper-implementation.claim-boundary.context-policy.v1',
    context_policy_profile_version: 'v1',
    token_budget: REVIEW_SLOT_TOKEN_BUDGET,
    materialization_class: 'domain_gate_materializable',
    canary_env_flag: 'T114_P1_CLAIM_BOUNDARY_PROVIDER_CANARY_LIVE',
    runtime_stress_required_case_keys: [
      'p1_over_budget_zero_provider_calls',
      'p1_runtime_review_inactive_project_rejected_before_orchestrator',
      'domain_gate_claim_final_artifact_idempotency',
    ],
  },
  {
    slot_id: PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID,
    runtime_route_segment: 'dossier-readiness-audit',
    runtime_request_schema_version: PAPER_IMPLEMENTATION_P1_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    service_module:
      'apps/backend/src/services/paper-implementation-p1-runtime-review-service.ts',
    profile_id: PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
    prompt_template_id: PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROMPT_TEMPLATE_ID,
    prompt_template_version: PAPER_IMPLEMENTATION_P1_REVIEW_PROMPT_TEMPLATE_VERSION,
    context_policy_profile_id: 'paper-implementation.dossier-readiness.context-policy.v1',
    context_policy_profile_version: 'v1',
    token_budget: REVIEW_SLOT_TOKEN_BUDGET,
    materialization_class: 'domain_gate_materializable',
    canary_env_flag: 'T114_P1_DOSSIER_READINESS_PROVIDER_CANARY_LIVE',
    runtime_stress_required_case_keys: [
      'p1_schema_invalid_provider_output_retry_exhausted_no_domain_gate_payload',
      'p1_runtime_review_inactive_project_rejected_before_orchestrator',
      'domain_gate_dossier_final_artifact_idempotency',
    ],
  },
  {
    slot_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
    runtime_route_segment: 'result-analysis-scenarios',
    runtime_request_schema_version:
      PAPER_IMPLEMENTATION_RESULT_ANALYSIS_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    service_module:
      'apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts',
    profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    prompt_template_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROMPT_TEMPLATE_ID,
    prompt_template_version: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROMPT_TEMPLATE_VERSION,
    context_policy_profile_id: 'paper-implementation.result-analysis.context-policy.v1',
    context_policy_profile_version: 'v1',
    token_budget: REVIEW_SLOT_TOKEN_BUDGET,
    materialization_class: 'domain_gate_materializable',
    canary_env_flag: 'T114_RESULT_ANALYSIS_PROVIDER_CANARY_LIVE',
    runtime_stress_required_case_keys: [
      'result_analysis_provider_failure_retry_exhausted_no_domain_gate_payload',
      'result_analysis_inactive_project_rejected_before_orchestrator',
      'domain_gate_result_analysis_materialization_closed',
    ],
  },
  {
    slot_id: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
    runtime_route_segment: 'route-architecture-route-candidates',
    runtime_request_schema_version:
      PAPER_IMPLEMENTATION_ROUTE_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    service_module:
      'apps/backend/src/services/paper-implementation-route-planning-runtime-service.ts',
    profile_id: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROFILE_ID,
    prompt_template_id: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROMPT_TEMPLATE_ID,
    prompt_template_version: PAPER_IMPLEMENTATION_ROUTE_PLANNING_PROMPT_TEMPLATE_VERSION,
    context_policy_profile_id: 'paper-implementation.route-architecture.context-policy.v1',
    context_policy_profile_version: 'v1',
    token_budget: ROUTE_PLANNING_TOKEN_BUDGET,
    materialization_class: 'proposal_only',
    canary_env_flag: 'T114_ROUTE_ARCHITECTURE_PROVIDER_CANARY_LIVE',
    runtime_stress_required_case_keys: [
      'route_architecture_provider_failure_retry_exhausted_no_route_queue_or_domain_gate_payload',
      'route_architecture_over_budget_compression_applied_completes',
      'route_planning_inactive_project_rejected_before_orchestrator',
    ],
  },
  {
    slot_id: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
    runtime_route_segment: 'route-skeptic-review-route-risk-critique',
    runtime_request_schema_version:
      PAPER_IMPLEMENTATION_ROUTE_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    service_module:
      'apps/backend/src/services/paper-implementation-route-planning-runtime-service.ts',
    profile_id: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROFILE_ID,
    prompt_template_id: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROMPT_TEMPLATE_ID,
    prompt_template_version: PAPER_IMPLEMENTATION_ROUTE_PLANNING_PROMPT_TEMPLATE_VERSION,
    context_policy_profile_id: 'paper-implementation.route-skeptic-review.context-policy.v1',
    context_policy_profile_version: 'v1',
    token_budget: ROUTE_PLANNING_TOKEN_BUDGET,
    materialization_class: 'proposal_only',
    canary_env_flag: 'T114_ROUTE_SKEPTIC_PROVIDER_CANARY_LIVE',
    runtime_stress_required_case_keys: [
      'route_skeptic_incomplete_dimension_set_retry_exhausted_no_queue_or_domain_gate_payload',
      'route_skeptic_upstream_artifact_admission_recheck',
    ],
  },
  {
    slot_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
    runtime_route_segment: 'validation-cycle-planning-cycle-candidates',
    runtime_request_schema_version:
      PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    service_module:
      'apps/backend/src/services/paper-implementation-validation-cycle-planning-runtime-service.ts',
    profile_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
    prompt_template_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROMPT_TEMPLATE_ID,
    prompt_template_version: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROMPT_TEMPLATE_VERSION,
    context_policy_profile_id: 'paper-implementation.validation-cycle-planning.context-policy.v1',
    context_policy_profile_version: 'v1',
    token_budget: {
      estimated_input_token_target: 32_000,
      estimated_output_token_budget: 3_000,
      context_window_tokens: 128_000,
      token_estimate_safety_margin: 1.25,
    },
    materialization_class: 'proposal_only',
    canary_env_flag: 'T114_VALIDATION_CYCLE_PROVIDER_CANARY_LIVE',
    runtime_stress_required_case_keys: [
      'validation_cycle_planning_provider_failure_retry_exhausted_no_cycle_queue_or_domain_gate_payload',
      'validation_cycle_planning_over_budget_compression_applied_completes',
      'validation_cycle_planning_upstream_artifact_admission_recheck',
      'validation_cycle_planning_inactive_project_rejected_before_orchestrator',
    ],
  },
  {
    slot_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
    runtime_route_segment: 'feasibility-planning-probe-plan-candidates',
    runtime_request_schema_version:
      PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    service_module:
      'apps/backend/src/services/paper-implementation-feasibility-planning-runtime-service.ts',
    profile_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
    prompt_template_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROMPT_TEMPLATE_ID,
    prompt_template_version: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROMPT_TEMPLATE_VERSION,
    context_policy_profile_id: 'paper-implementation.feasibility-planning.context-policy.v1',
    context_policy_profile_version: 'v1',
    token_budget: {
      estimated_input_token_target: 32_000,
      estimated_output_token_budget: 3_000,
      context_window_tokens: 128_000,
      token_estimate_safety_margin: 1.25,
    },
    materialization_class: 'proposal_only',
    canary_env_flag: 'T114_FEASIBILITY_PLANNING_PROVIDER_CANARY_LIVE',
    runtime_stress_required_case_keys: [
      'feasibility_planning_over_budget_zero_provider_calls',
      'feasibility_planning_over_budget_compression_applied_completes',
      'feasibility_planning_upstream_artifact_admission_recheck',
      'feasibility_planning_inactive_project_rejected_before_orchestrator',
    ],
  },
  {
    slot_id: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_SLOT_ID,
    runtime_route_segment: 'cross-board-synthesis-merge-split-reuse-scenarios',
    runtime_request_schema_version:
      PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    service_module:
      'apps/backend/src/services/paper-implementation-cross-board-synthesis-runtime-service.ts',
    profile_id: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROFILE_ID,
    prompt_template_id: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROMPT_TEMPLATE_ID,
    prompt_template_version: PAPER_IMPLEMENTATION_CROSS_BOARD_SYNTHESIS_PROMPT_TEMPLATE_VERSION,
    context_policy_profile_id: 'paper-implementation.cross-board-synthesis.context-policy.v1',
    context_policy_profile_version: 'v1',
    token_budget: {
      estimated_input_token_target: 36_000,
      estimated_output_token_budget: 3_500,
      context_window_tokens: 128_000,
      token_estimate_safety_margin: 1.25,
    },
    materialization_class: 'proposal_only',
    canary_env_flag: 'T114_CROSS_BOARD_SYNTHESIS_PROVIDER_CANARY_LIVE',
    runtime_stress_required_case_keys: [
      'cross_board_synthesis_over_budget_zero_provider_calls',
      'cross_board_synthesis_over_budget_compression_applied_completes',
      'cross_board_synthesis_inactive_project_rejected_before_orchestrator',
    ],
  },
  {
    slot_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
    runtime_route_segment: 'evidence-board-curation-binding-gap-candidates',
    runtime_request_schema_version:
      PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    service_module:
      'apps/backend/src/services/paper-implementation-evidence-board-curation-runtime-service.ts',
    profile_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
    prompt_template_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROMPT_TEMPLATE_ID,
    prompt_template_version: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROMPT_TEMPLATE_VERSION,
    context_policy_profile_id: 'paper-implementation.evidence-board-curation.context-policy.v1',
    context_policy_profile_version: 'v1',
    token_budget: {
      estimated_input_token_target: 30_000,
      estimated_output_token_budget: 2_500,
      context_window_tokens: 128_000,
      token_estimate_safety_margin: 1.25,
    },
    materialization_class: 'proposal_only',
    canary_env_flag: 'T114_EVIDENCE_BOARD_CURATION_PROVIDER_CANARY_LIVE',
    runtime_stress_required_case_keys: [
      'evidence_board_curation_over_budget_zero_provider_calls',
      'evidence_board_curation_over_budget_compression_applied_completes',
      'evidence_board_curation_inactive_project_rejected_before_orchestrator',
    ],
  },
  {
    slot_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
    runtime_route_segment: 'motive-decomposition-draft-assertion-candidates',
    runtime_request_schema_version:
      PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    service_module:
      'apps/backend/src/services/paper-implementation-motive-decomposition-runtime-service.ts',
    profile_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
    prompt_template_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROMPT_TEMPLATE_ID,
    prompt_template_version: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROMPT_TEMPLATE_VERSION,
    context_policy_profile_id: 'paper-implementation.motive-decomposition.context-policy.v1',
    context_policy_profile_version: 'v1',
    token_budget: {
      estimated_input_token_target: 30_000,
      estimated_output_token_budget: 4_096,
      context_window_tokens: 128_000,
      token_estimate_safety_margin: 1.25,
    },
    materialization_class: 'proposal_only',
    canary_env_flag: 'T114_MOTIVE_DECOMPOSITION_PROVIDER_CANARY_LIVE',
    runtime_stress_required_case_keys: [
      'motive_decomposition_over_budget_zero_provider_calls',
      'motive_decomposition_inactive_project_rejected_before_orchestrator',
    ],
  },
  {
    slot_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_SLOT_ID,
    runtime_route_segment: 'motive-evolution-decision-support',
    runtime_request_schema_version:
      PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    service_module:
      'apps/backend/src/services/paper-implementation-motive-evolution-runtime-service.ts',
    profile_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROFILE_ID,
    prompt_template_id: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROMPT_TEMPLATE_ID,
    prompt_template_version: PAPER_IMPLEMENTATION_MOTIVE_EVOLUTION_PROMPT_TEMPLATE_VERSION,
    context_policy_profile_id: 'paper-implementation.motive-evolution.context-policy.v1',
    context_policy_profile_version: 'v1',
    token_budget: {
      estimated_input_token_target: 36_000,
      estimated_output_token_budget: 4_096,
      context_window_tokens: 128_000,
      token_estimate_safety_margin: 1.25,
    },
    materialization_class: 'proposal_only',
    canary_env_flag: 'T114_MOTIVE_EVOLUTION_PROVIDER_CANARY_LIVE',
    runtime_stress_required_case_keys: [
      'motive_evolution_over_budget_zero_provider_calls',
      'motive_evolution_inactive_project_rejected_before_orchestrator',
    ],
  },
  {
    slot_id: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID,
    runtime_route_segment: 'experiment-design-work-order-draft',
    runtime_request_schema_version:
      PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    service_module:
      'apps/backend/src/services/paper-implementation-experiment-planning-runtime-service.ts',
    profile_id: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID,
    prompt_template_id: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROMPT_TEMPLATE_ID,
    prompt_template_version: PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_PROMPT_TEMPLATE_VERSION,
    context_policy_profile_id: 'paper-implementation.experiment-design.context-policy.v1',
    context_policy_profile_version: 'v1',
    token_budget: EXPERIMENT_PLANNING_TOKEN_BUDGET,
    materialization_class: 'proposal_only',
    canary_env_flag: 'T114_EXPERIMENT_DESIGN_PROVIDER_CANARY_LIVE',
    runtime_stress_required_case_keys: [
      'experiment_planning_provider_failure_retry_exhausted_no_domain_gate_payload',
      'experiment_planning_inactive_project_rejected_before_orchestrator',
    ],
  },
  {
    slot_id: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID,
    runtime_route_segment: 'experiment-critique-plan-critique',
    runtime_request_schema_version:
      PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_RUNTIME_RUN_REQUEST_SCHEMA_VERSION,
    service_module:
      'apps/backend/src/services/paper-implementation-experiment-planning-runtime-service.ts',
    profile_id: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID,
    prompt_template_id: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROMPT_TEMPLATE_ID,
    prompt_template_version: PAPER_IMPLEMENTATION_EXPERIMENT_PLANNING_PROMPT_TEMPLATE_VERSION,
    context_policy_profile_id: 'paper-implementation.experiment-critique.context-policy.v1',
    context_policy_profile_version: 'v1',
    token_budget: EXPERIMENT_PLANNING_TOKEN_BUDGET,
    materialization_class: 'proposal_only',
    canary_env_flag: 'T114_EXPERIMENT_CRITIQUE_PROVIDER_CANARY_LIVE',
    runtime_stress_required_case_keys: [
      'experiment_critique_incomplete_dimension_set_retry_exhausted_no_domain_gate_payload',
      'experiment_planning_over_budget_compression_applied_completes',
      'experiment_planning_inactive_project_rejected_before_orchestrator',
    ],
  },
];

export function exportPaperImplementationSlotParameterManifest(options: {
  registry?: TopicSelectionModelProfileRegistry;
} = {}): PaperImplementationSlotParameterManifest {
  const registry = options.registry ?? createDefaultTopicSelectionModelProfileRegistry();
  const registryService = new TopicSelectionModelProfileRegistryService({ registry });
  const validation = registryService.validateRegistry(registry);
  if (!validation.valid) {
    const first = validation.issues[0];
    throw new Error(
      `SlotParameterManifest export refused: model profile registry is invalid (${first?.code ?? 'UNKNOWN'}: ${first?.message ?? 'no detail'}).`,
    );
  }

  const profilesById = new Map<string, TopicSelectionModelProfile>(
    registry.profiles.map((profile) => [profile.profile_id, profile]),
  );

  const slots = [...PAPER_IMPLEMENTATION_SLOT_MANIFEST_BINDINGS]
    .sort((a, b) => a.slot_id.localeCompare(b.slot_id))
    .map((binding) => {
      const profile = profilesById.get(binding.profile_id);
      if (!profile) {
        throw new Error(
          `SlotParameterManifest export refused: profile ${binding.profile_id} for slot ${binding.slot_id} is missing from the backend registry.`,
        );
      }
      if (profile.status !== 'active') {
        throw new Error(
          `SlotParameterManifest export refused: profile ${binding.profile_id} for slot ${binding.slot_id} is not active.`,
        );
      }
      return manifestEntry(binding, profile);
    });

  return {
    schema_version: PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_SCHEMA_VERSION,
    domain: 'paper_implementation',
    registry_schema_version: registry.schema_version,
    export_script: PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_EXPORT_SCRIPT,
    slot_count: slots.length,
    slots,
  };
}

function manifestEntry(
  binding: PaperImplementationSlotManifestBinding,
  profile: TopicSelectionModelProfile,
): PaperImplementationSlotParameterManifestEntry {
  // T-124 D2-core: resolve the enforced debate policy mount from the shared
  // registry — an unknown id refuses export (same posture as a missing profile).
  let debatePolicy: PaperImplementationDebatePolicy | null = null;
  if (binding.debate_policy_id) {
    const policy = PAPER_IMPLEMENTATION_DEBATE_POLICY_REGISTRY[binding.debate_policy_id];
    if (!policy) {
      throw new Error(
        `SlotParameterManifest export refused: debate policy ${binding.debate_policy_id} for slot ${binding.slot_id} is missing from the shared debate policy registry.`,
      );
    }
    debatePolicy = structuredClone(policy);
  }
  return {
    slot_id: binding.slot_id,
    runtime_route_path: `${RUNTIME_SLOT_ROUTE_PREFIX}${binding.runtime_route_segment}/run`,
    runtime_route_segment: binding.runtime_route_segment,
    runtime_request_schema_version: binding.runtime_request_schema_version,
    service_module: binding.service_module,
    materialization_class: binding.materialization_class,
    prompt_template: {
      prompt_template_id: binding.prompt_template_id,
      prompt_template_version: binding.prompt_template_version,
    },
    context_policy: {
      context_policy_profile_id: binding.context_policy_profile_id,
      context_policy_profile_version: binding.context_policy_profile_version,
    },
    token_budget: { ...binding.token_budget },
    model_profile: {
      profile_id: profile.profile_id,
      profile_version: profile.profile_version,
      status: profile.status,
      profile_function: profile.profile_function,
      role_family: profile.role_family,
      stage_family: profile.stage_family,
      output_contract: profile.output_contract,
      allowed_execution_modes: structuredClone(profile.allowed_execution_modes),
      run_mode_eligibility: structuredClone(profile.run_mode_eligibility),
      model_options: structuredClone(profile.model_options),
      provider_fallback_policy: structuredClone(profile.provider_fallback_policy),
      failure_handling_policy: structuredClone(profile.failure_handling_policy),
      budget_policy: structuredClone(profile.budget_policy),
    },
    canary_env_flag: binding.canary_env_flag,
    runtime_stress_required_case_keys: [...binding.runtime_stress_required_case_keys],
    debate_policy: debatePolicy,
    candidate_selection_policy: null,
    memory_families: null,
  };
}

export type PaperImplementationSlotParameterManifestCompletenessIssueCode =
  | 'ROUTE_MISSING_MANIFEST_ENTRY'
  | 'MANIFEST_ENTRY_MISSING_ROUTE'
  | 'DUPLICATE_MANIFEST_ROUTE_SEGMENT'
  | 'MANIFEST_ENTRY_MISSING_STRESS_CASE'
  | 'STRESS_CASE_KEY_UNKNOWN'
  | 'MANIFEST_ENTRY_CANARY_FLAG_UNKNOWN'
  | 'CANARY_FLAG_MISSING_MANIFEST_ENTRY'
  | 'DUPLICATE_MANIFEST_CANARY_FLAG'
  // T-124 D2-core tier dimension (manifest mounts ↔ shared policy registry ↔ tier set).
  | 'DEBATE_POLICY_UNKNOWN_ID'
  | 'DEBATE_POLICY_MISSING_MANIFEST_ENTRY'
  | 'DUPLICATE_DEBATE_POLICY_MOUNT'
  | 'DEBATE_POLICY_TIER_SET_INCOMPLETE';

export interface PaperImplementationSlotParameterManifestCompletenessIssue {
  code: PaperImplementationSlotParameterManifestCompletenessIssueCode;
  detail: string;
}

export interface PaperImplementationSlotParameterManifestCompletenessInput {
  manifest: PaperImplementationSlotParameterManifest;
  /** runtime-slots/<segment>/run segments parsed from paper-implementation-routes.ts */
  route_slot_segments: readonly string[];
  /** required-case keys parsed from apps/backend/scripts/paper-implementation-runtime-stress.mjs */
  stress_required_case_keys: readonly string[];
  /** T114_*_CANARY_LIVE flags parsed from the runtime-stress script */
  canary_env_flags: readonly string[];
  /** flags that intentionally have no slot binding (default: fail-closed canary) */
  non_slot_canary_env_flags?: readonly string[];
  /**
   * T-124 D2-core: the enforced debate policy ids the shared registry declares
   * (default: PAPER_IMPLEMENTATION_DEBATE_POLICY_REGISTRY keys). Every enforced
   * registry policy must be mounted by exactly one manifest entry and every
   * mount must resolve back to the registry with a complete tier set.
   */
  debate_policy_registry_ids?: readonly string[];
}

/**
 * Four-way completeness check (extended with the D2 tier dimension):
 * runtime routes ↔ manifest entries ↔ runtime-stress must-check cases ↔ canary env flags,
 * plus manifest debate-policy mounts ↔ shared DebatePolicy@v1 registry ↔ tier set.
 * Pure so tests can also verify the negative direction (a removed manifest entry
 * or an unknown key must produce issues).
 */
export function verifyPaperImplementationSlotParameterManifestCompleteness(
  input: PaperImplementationSlotParameterManifestCompletenessInput,
): PaperImplementationSlotParameterManifestCompletenessIssue[] {
  const issues: PaperImplementationSlotParameterManifestCompletenessIssue[] = [];
  const nonSlotFlags = new Set(
    input.non_slot_canary_env_flags ?? PAPER_IMPLEMENTATION_NON_SLOT_CANARY_ENV_FLAGS,
  );

  const routeSegments = new Set(input.route_slot_segments);
  const manifestSegments = new Map<string, number>();
  for (const entry of input.manifest.slots) {
    manifestSegments.set(
      entry.runtime_route_segment,
      (manifestSegments.get(entry.runtime_route_segment) ?? 0) + 1,
    );
  }

  for (const [segment, count] of manifestSegments) {
    if (count > 1) {
      issues.push({
        code: 'DUPLICATE_MANIFEST_ROUTE_SEGMENT',
        detail: `runtime route segment ${segment} is claimed by ${count} manifest entries.`,
      });
    }
    if (!routeSegments.has(segment)) {
      issues.push({
        code: 'MANIFEST_ENTRY_MISSING_ROUTE',
        detail: `manifest entry ${segment} has no runtime-slots/${segment}/run route.`,
      });
    }
  }
  for (const segment of routeSegments) {
    if (!manifestSegments.has(segment)) {
      issues.push({
        code: 'ROUTE_MISSING_MANIFEST_ENTRY',
        detail: `runtime-slots/${segment}/run route has no manifest entry.`,
      });
    }
  }

  const stressKeys = new Set(input.stress_required_case_keys);
  for (const entry of input.manifest.slots) {
    if (entry.runtime_stress_required_case_keys.length === 0) {
      issues.push({
        code: 'MANIFEST_ENTRY_MISSING_STRESS_CASE',
        detail: `manifest entry ${entry.slot_id} declares no runtime-stress must-check case.`,
      });
    }
    for (const key of entry.runtime_stress_required_case_keys) {
      if (!stressKeys.has(key)) {
        issues.push({
          code: 'STRESS_CASE_KEY_UNKNOWN',
          detail: `manifest entry ${entry.slot_id} references unknown runtime-stress case key ${key}.`,
        });
      }
    }
  }

  const canaryFlags = new Set(input.canary_env_flags);
  const manifestFlags = new Map<string, number>();
  for (const entry of input.manifest.slots) {
    manifestFlags.set(entry.canary_env_flag, (manifestFlags.get(entry.canary_env_flag) ?? 0) + 1);
    if (!canaryFlags.has(entry.canary_env_flag)) {
      issues.push({
        code: 'MANIFEST_ENTRY_CANARY_FLAG_UNKNOWN',
        detail: `manifest entry ${entry.slot_id} references unknown canary env flag ${entry.canary_env_flag}.`,
      });
    }
  }
  for (const [flag, count] of manifestFlags) {
    if (count > 1) {
      issues.push({
        code: 'DUPLICATE_MANIFEST_CANARY_FLAG',
        detail: `canary env flag ${flag} is claimed by ${count} manifest entries.`,
      });
    }
  }
  for (const flag of canaryFlags) {
    if (nonSlotFlags.has(flag)) {
      continue;
    }
    if (!manifestFlags.has(flag)) {
      issues.push({
        code: 'CANARY_FLAG_MISSING_MANIFEST_ENTRY',
        detail: `canary env flag ${flag} has no manifest entry.`,
      });
    }
  }

  // T-124 D2-core tier dimension: debate-policy mounts ↔ registry ↔ tier set.
  const registryPolicyIds = new Set(
    input.debate_policy_registry_ids ?? Object.keys(PAPER_IMPLEMENTATION_DEBATE_POLICY_REGISTRY),
  );
  const mountedPolicyIds = new Map<string, number>();
  for (const entry of input.manifest.slots) {
    const policy = entry.debate_policy;
    if (!policy) {
      continue;
    }
    mountedPolicyIds.set(policy.debate_policy_id, (mountedPolicyIds.get(policy.debate_policy_id) ?? 0) + 1);
    if (!registryPolicyIds.has(policy.debate_policy_id)) {
      issues.push({
        code: 'DEBATE_POLICY_UNKNOWN_ID',
        detail: `manifest entry ${entry.slot_id} mounts debate policy ${policy.debate_policy_id} that is not in the shared debate policy registry.`,
      });
    }
    const declaredTiers = new Set(Object.keys(policy.tiers ?? {}));
    for (const tier of PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_TIERS) {
      if (!declaredTiers.has(tier)) {
        issues.push({
          code: 'DEBATE_POLICY_TIER_SET_INCOMPLETE',
          detail: `manifest entry ${entry.slot_id} debate policy ${policy.debate_policy_id} does not declare tier ${tier}.`,
        });
      }
    }
  }
  for (const [policyId, count] of mountedPolicyIds) {
    if (count > 1) {
      issues.push({
        code: 'DUPLICATE_DEBATE_POLICY_MOUNT',
        detail: `debate policy ${policyId} is mounted by ${count} manifest entries.`,
      });
    }
  }
  for (const policyId of registryPolicyIds) {
    if (!mountedPolicyIds.has(policyId)) {
      issues.push({
        code: 'DEBATE_POLICY_MISSING_MANIFEST_ENTRY',
        detail: `registered debate policy ${policyId} is not mounted by any manifest entry.`,
      });
    }
  }

  return issues;
}
