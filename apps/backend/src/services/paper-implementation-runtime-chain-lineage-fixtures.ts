import {
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID,
  type PaperImplementationRouteCandidateProposal,
  type PaperImplementationRoutePlanningRoleOutput,
  type PaperImplementationValidationCycleCandidateProposal,
  type PaperImplementationValidationCyclePlanningRoleOutput,
  type RunPaperImplementationRoutePlanningRuntimeRequest,
  type RunPaperImplementationValidationCyclePlanningRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import type { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { PaperImplementationRoutePlanningRuntimeService } from './paper-implementation-route-planning-runtime-service.js';
import {
  PaperImplementationValidationCyclePlanningRuntimeService,
} from './paper-implementation-validation-cycle-planning-runtime-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';

/**
 * Test-only chain-lineage seeding (S1-W2).
 *
 * Chained runtime slots (route skeptic, validation-cycle planning, feasibility
 * planning) now recheck their upstream inputs against the runtime admission
 * repository, so test fixtures can no longer feed fabricated upstream refs.
 * These helpers run the real upstream slot services in mocked_llm mode against
 * the same admission service the test uses, producing genuinely admitted passed
 * final artifacts, and return the admitted refs/hashes for downstream requests.
 */

export interface PaperImplementationSeededRouteLineage {
  routeProposalRef: TopicSelectionFunctionalRef;
  routeProposalHash: string;
  routeSkepticRef: TopicSelectionFunctionalRef;
  routeSkepticHash: string;
}

export interface PaperImplementationSeededValidationLineage extends PaperImplementationSeededRouteLineage {
  validationCycleRef: TopicSelectionFunctionalRef;
  validationCycleHash: string;
}

export interface PaperImplementationChainLineageSeedOptions {
  projectRepository: PaperImplementationRepository;
  runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  implementationProjectId: string;
  titleCardId?: string | null;
  idFactory?: (prefix: string) => string;
  now?: () => string;
  /** Prefix for seeded run ids; keep unique per seeding call within one repository. */
  runIdPrefix?: string;
  /** Route candidate key the downstream request reviews. */
  reviewedRouteCandidateKey?: string;
  /** Cycle candidate key the downstream feasibility request reviews. */
  reviewedCycleCandidateKey?: string;
}

interface ResolvedSeedOptions {
  projectRepository: PaperImplementationRepository;
  runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  implementationProjectId: string;
  titleCardId: string | null;
  idFactory: ((prefix: string) => string) | undefined;
  now: (() => string) | undefined;
  runIdPrefix: string;
  reviewedRouteCandidateKey: string;
  reviewedCycleCandidateKey: string;
}

export async function seedAdmittedRoutePlanningLineage(
  options: PaperImplementationChainLineageSeedOptions,
): Promise<PaperImplementationSeededRouteLineage> {
  const resolved = resolveOptions(options);
  const routeService = routePlanningSeedService(resolved);

  const architecture = await routeService.runRouteArchitecture(
    resolved.implementationProjectId,
    architectureSeedRequest(resolved),
  );
  const routeProposal = admittedFinal(architecture, 'route architecture');

  const skeptic = await routeService.runRouteSkepticReview(
    resolved.implementationProjectId,
    skepticSeedRequest(resolved, routeProposal.ref, routeProposal.hash),
  );
  const routeSkeptic = admittedFinal(skeptic, 'route skeptic');

  return {
    routeProposalRef: routeProposal.ref,
    routeProposalHash: routeProposal.hash,
    routeSkepticRef: routeSkeptic.ref,
    routeSkepticHash: routeSkeptic.hash,
  };
}

export async function seedAdmittedValidationPlanningLineage(
  options: PaperImplementationChainLineageSeedOptions,
): Promise<PaperImplementationSeededValidationLineage> {
  const resolved = resolveOptions(options);
  const routeLineage = await seedAdmittedRoutePlanningLineage(options);
  const cycleService = new PaperImplementationValidationCyclePlanningRuntimeService({
    projectRepository: resolved.projectRepository,
    runtimeAdmission: resolved.runtimeAdmission,
    agentOrchestrator: new MockedEchoAgentOrchestrator(),
    idFactory: resolved.idFactory,
    now: resolved.now,
  });
  const cycle = await cycleService.runCycleCandidates(
    resolved.implementationProjectId,
    cycleSeedRequest(resolved, routeLineage),
  );
  const validationCycle = admittedFinal(cycle, 'validation-cycle planning');
  return {
    ...routeLineage,
    validationCycleRef: validationCycle.ref,
    validationCycleHash: validationCycle.hash,
  };
}

/**
 * Produces an admitted **blocked** final route-architecture artifact (admission
 * records blocked finals with blocker codes as admitted). Used by negative tests
 * proving that blocked finals cannot impersonate downstream inputs.
 */
export async function seedBlockedRouteArchitectureFinalArtifact(
  options: PaperImplementationChainLineageSeedOptions,
): Promise<{ ref: TopicSelectionFunctionalRef; hash: string }> {
  const resolved = resolveOptions(options);
  const routeService = routePlanningSeedService(resolved);
  const blocked = await routeService.runRouteArchitecture(resolved.implementationProjectId, {
    ...architectureSeedRequest(resolved),
    run_id: `${resolved.runIdPrefix}_route_architecture_blocked_seed_run`,
    preflight_blocker_codes: ['upstream_seed_blocked'],
  });
  const final = admittedFinal(blocked, 'blocked route architecture');
  return { ref: final.ref, hash: final.hash };
}

/**
 * Produces an admitted **blocked** final validation-cycle artifact on top of an
 * already-seeded route lineage. Used by feasibility negative tests proving that
 * blocked cycle finals cannot impersonate the primary downstream input.
 */
export async function seedBlockedValidationCyclePlanningFinalArtifact(
  options: PaperImplementationChainLineageSeedOptions,
  lineage: PaperImplementationSeededRouteLineage,
): Promise<{ ref: TopicSelectionFunctionalRef; hash: string }> {
  const resolved = resolveOptions(options);
  const cycleService = new PaperImplementationValidationCyclePlanningRuntimeService({
    projectRepository: resolved.projectRepository,
    runtimeAdmission: resolved.runtimeAdmission,
    agentOrchestrator: new MockedEchoAgentOrchestrator(),
    idFactory: resolved.idFactory,
    now: resolved.now,
  });
  const blocked = await cycleService.runCycleCandidates(resolved.implementationProjectId, {
    ...cycleSeedRequest(resolved, lineage),
    run_id: `${resolved.runIdPrefix}_validation_cycle_blocked_seed_run`,
    preflight_blocker_codes: ['upstream_seed_blocked'],
  });
  const final = admittedFinal(blocked, 'blocked validation-cycle planning');
  return { ref: final.ref, hash: final.hash };
}

class MockedEchoAgentOrchestrator {
  async invokeStructuredOutput<T>(
    input: {
      node_id: string;
      execution_mode: string;
      mocked_output?: { output: T } | null;
    },
  ): Promise<TopicSelectionAgentInvocationResult<T>> {
    const output = input.mocked_output?.output ?? null;
    if (output === null) {
      throw new Error(`Chain lineage seeding requires mocked_output for ${input.node_id}.`);
    }
    return seedInvocationResult(output, input.node_id, input.execution_mode);
  }
}

function resolveOptions(
  options: PaperImplementationChainLineageSeedOptions,
): ResolvedSeedOptions {
  return {
    projectRepository: options.projectRepository,
    runtimeAdmission: options.runtimeAdmission,
    implementationProjectId: options.implementationProjectId,
    titleCardId: options.titleCardId ?? null,
    idFactory: options.idFactory,
    now: options.now,
    runIdPrefix: options.runIdPrefix ?? 'chain_lineage_seed',
    reviewedRouteCandidateKey: options.reviewedRouteCandidateKey ?? 'exploratory_route_candidate',
    reviewedCycleCandidateKey: options.reviewedCycleCandidateKey ?? 'exploratory_cycle_candidate',
  };
}

function routePlanningSeedService(
  resolved: ResolvedSeedOptions,
): PaperImplementationRoutePlanningRuntimeService {
  return new PaperImplementationRoutePlanningRuntimeService({
    projectRepository: resolved.projectRepository,
    runtimeAdmission: resolved.runtimeAdmission,
    agentOrchestrator: new MockedEchoAgentOrchestrator(),
    idFactory: resolved.idFactory,
    now: resolved.now,
  });
}

function admittedFinal(
  result: {
    status: string;
    final_runtime_artifact: { final_artifact_ref: TopicSelectionFunctionalRef | null } | null;
    final_admission_record: {
      admission_status: string;
      admitted_artifact_ref: TopicSelectionFunctionalRef | null;
      admitted_artifact_hash: string | null;
    } | null;
  },
  label: string,
): { ref: TopicSelectionFunctionalRef; hash: string } {
  const admission = result.final_admission_record;
  if (!admission || admission.admission_status !== 'admitted' || !admission.admitted_artifact_ref || !admission.admitted_artifact_hash) {
    throw new Error(`Chain lineage seeding failed: ${label} run did not produce an admitted final artifact (status=${result.status}).`);
  }
  return { ref: admission.admitted_artifact_ref, hash: admission.admitted_artifact_hash };
}

function architectureSeedRequest(
  resolved: ResolvedSeedOptions,
): RunPaperImplementationRoutePlanningRuntimeRequest {
  return {
    run_id: `${resolved.runIdPrefix}_route_architecture_seed_run`,
    run_mode: 'mock',
    execution_mode: 'mocked_llm',
    model_profile_id: null,
    model_option_id: null,
    target_ref: seedRef(resolved, 'implementation_input_snapshot', 'lineage_seed_input_snapshot'),
    target_version_id: 'v1',
    input_snapshot_ref: seedRef(resolved, 'implementation_input_snapshot', 'lineage_seed_input_snapshot'),
    input_snapshot_hash: seedHash('lineage-seed-input-snapshot'),
    source_refs: [seedRef(resolved, 'implementation_input_snapshot', 'lineage_seed_input_snapshot')],
    source_hashes: [seedHash('lineage-seed-input-snapshot')],
    admitted_route_proposal_artifact_ref: null,
    admitted_route_proposal_artifact_hash: null,
    reviewed_candidate_keys: [],
    secondary_route_candidate_refs: [],
    preflight_blocker_codes: [],
    mocked_role_outputs: {
      [PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID]: architectureSeedRoleOutput(resolved),
    },
  };
}

function skepticSeedRequest(
  resolved: ResolvedSeedOptions,
  routeProposalRef: TopicSelectionFunctionalRef,
  routeProposalHash: string,
): RunPaperImplementationRoutePlanningRuntimeRequest {
  return {
    ...architectureSeedRequest(resolved),
    run_id: `${resolved.runIdPrefix}_route_skeptic_seed_run`,
    admitted_route_proposal_artifact_ref: routeProposalRef,
    admitted_route_proposal_artifact_hash: routeProposalHash,
    reviewed_candidate_keys: [resolved.reviewedRouteCandidateKey],
    mocked_role_outputs: {
      [PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID]: skepticSeedRoleOutput(
        resolved,
        routeProposalRef,
        routeProposalHash,
      ),
    },
  };
}

function cycleSeedRequest(
  resolved: ResolvedSeedOptions,
  lineage: PaperImplementationSeededRouteLineage,
): RunPaperImplementationValidationCyclePlanningRuntimeRequest {
  return {
    run_id: `${resolved.runIdPrefix}_validation_cycle_seed_run`,
    run_mode: 'mock',
    execution_mode: 'mocked_llm',
    model_profile_id: null,
    model_option_id: null,
    target_ref: seedRef(resolved, 'technical_route_candidate', 'lineage_seed_route_candidate'),
    target_version_id: 'v1',
    input_snapshot_ref: seedRef(resolved, 'implementation_input_snapshot', 'lineage_seed_input_snapshot'),
    input_snapshot_hash: seedHash('lineage-seed-input-snapshot'),
    source_refs: [lineage.routeProposalRef, lineage.routeSkepticRef],
    source_hashes: [lineage.routeProposalHash, lineage.routeSkepticHash],
    admitted_route_proposal_artifact_ref: lineage.routeProposalRef,
    admitted_route_proposal_artifact_hash: lineage.routeProposalHash,
    admitted_route_skeptic_artifact_ref: lineage.routeSkepticRef,
    admitted_route_skeptic_artifact_hash: lineage.routeSkepticHash,
    reviewed_candidate_keys: [resolved.reviewedRouteCandidateKey],
    secondary_route_candidate_refs: [],
    preflight_blocker_codes: [],
    mocked_role_outputs: {
      [PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID]: cycleSeedRoleOutput(resolved, lineage),
    },
  };
}

function architectureSeedRoleOutput(
  resolved: ResolvedSeedOptions,
): PaperImplementationRoutePlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Seeded route architecture proposed bounded route candidates.',
    cited_source_refs: [seedRef(resolved, 'implementation_input_snapshot', 'lineage_seed_input_snapshot')],
    blocker_codes: [],
    warning_codes: [],
    route_candidate_proposals: [
      routeCandidateSeedProposal(resolved, resolved.reviewedRouteCandidateKey, false),
      routeCandidateSeedProposal(resolved, 'confirmatory_route_candidate_seed', true),
    ],
  };
}

function skepticSeedRoleOutput(
  resolved: ResolvedSeedOptions,
  routeProposalRef: TopicSelectionFunctionalRef,
  routeProposalHash: string,
): PaperImplementationRoutePlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Seeded route skeptic covered all required route-risk dimensions.',
    cited_source_refs: [routeProposalRef],
    blocker_codes: [],
    warning_codes: [],
    reviewed_route_proposal_ref: routeProposalRef,
    reviewed_route_proposal_hash: routeProposalHash,
    reviewed_candidate_keys: [resolved.reviewedRouteCandidateKey],
    checked_dimensions: [...PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS],
    risk_findings: [{
      finding_id: 'lineage_seed_route_risk_finding_001',
      risk_dimension: 'compute_budget',
      severity: 'warning',
      summary: 'Budget must be confirmed before deterministic route admission proceeds.',
      evidence_refs: [seedRef(resolved, 'validation_budget', 'lineage_seed_budget')],
      affected_candidate_keys: [resolved.reviewedRouteCandidateKey],
      required_revision_refs: [],
      blocks_route_progression: false,
    }],
    recommended_disposition: 'revise',
    no_queue_side_effect: true,
  };
}

function cycleSeedRoleOutput(
  resolved: ResolvedSeedOptions,
  lineage: PaperImplementationSeededRouteLineage,
): PaperImplementationValidationCyclePlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Seeded validation-cycle planning proposed bounded cycle candidates.',
    cited_source_refs: [lineage.routeProposalRef],
    blocker_codes: [],
    warning_codes: [],
    reviewed_route_proposal_ref: lineage.routeProposalRef,
    reviewed_route_proposal_hash: lineage.routeProposalHash,
    reviewed_route_skeptic_artifact_ref: lineage.routeSkepticRef,
    reviewed_route_skeptic_artifact_hash: lineage.routeSkepticHash,
    reviewed_candidate_keys: [resolved.reviewedRouteCandidateKey],
    cycle_candidate_proposals: [
      validationCycleSeedProposal(resolved, resolved.reviewedCycleCandidateKey, false),
      validationCycleSeedProposal(resolved, 'confirmatory_cycle_candidate_seed', true),
    ],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_validation_cycle_side_effect: true,
  };
}

function routeCandidateSeedProposal(
  resolved: ResolvedSeedOptions,
  candidateKey: string,
  confirmatoryMarker: boolean,
): PaperImplementationRouteCandidateProposal {
  return {
    candidate_key: candidateKey,
    route_summary: `${candidateKey} proposes a bounded route candidate.`,
    expected_information_gain: 'Clarifies route feasibility before deterministic validation admission.',
    baseline_gap_status: confirmatoryMarker ? 'partial' : 'unknown',
    cited_source_refs: [seedRef(resolved, 'implementation_input_snapshot', 'lineage_seed_input_snapshot')],
    trace_refs: [seedRef(resolved, 'trace_manifest', 'lineage_seed_trace_manifest')],
    validation_signal_refs: [seedRef(resolved, 'validation_signal', `${candidateKey}_signal_seed`)],
    dataset_refs: [seedRef(resolved, 'dataset_version', `${candidateKey}_dataset_seed`)],
    metric_refs: [seedRef(resolved, 'metric', `${candidateKey}_metric_seed`)],
    baseline_refs: [seedRef(resolved, 'baseline_version', `${candidateKey}_baseline_seed`)],
    code_refs: [seedRef(resolved, 'code_version', `${candidateKey}_code_seed`)],
    config_refs: [seedRef(resolved, 'config_snapshot', `${candidateKey}_config_seed`)],
    scope_boundary: 'Proposal only; deterministic validation planning owns persisted route records.',
    confirmatory_marker: confirmatoryMarker,
    blocker_codes: [],
    warning_codes: [],
  };
}

function validationCycleSeedProposal(
  resolved: ResolvedSeedOptions,
  candidateKey: string,
  confirmatoryMarker: boolean,
): PaperImplementationValidationCycleCandidateProposal {
  return {
    candidate_key: candidateKey,
    reviewed_route_candidate_key: resolved.reviewedRouteCandidateKey,
    target_ref: seedRef(resolved, 'technical_route_candidate', `technical_route_candidate_${candidateKey}_seed`),
    target_frame_summary: `${candidateKey} validates a bounded route signal before deterministic cycle admission.`,
    cycle_type: confirmatoryMarker ? 'baseline_challenge' : 'route_feasibility',
    trigger_refs: [seedRef(resolved, 'route_risk_finding', `route_risk_finding_${candidateKey}_seed`)],
    validation_question: `Can ${candidateKey} produce a useful validation signal within the budget envelope?`,
    assumptions_under_test: ['Route context is sufficient to validate against the baseline.'],
    assertion_refs_under_test: [seedRef(resolved, 'motive_assertion', `motive_assertion_${candidateKey}_seed`)],
    decision_if_pass: 'Admit a deterministic validation cycle draft downstream.',
    decision_if_fail: 'Park the candidate or send it back to route revision.',
    decision_if_inconclusive: 'Request more source context before deterministic validation admission.',
    expected_information_gain: confirmatoryMarker ? 'medium' : 'high',
    criteria: {
      pass_conditions: ['The validation signal isolates route merit against the baseline.'],
      fail_conditions: ['The signal cannot distinguish route merit from missing context.'],
      inconclusive_conditions: ['Dataset, metric, or budget facts are unavailable.'],
      stop_conditions: ['Budget envelope is exceeded.'],
      minimum_artifacts_required: ['route proposal artifact', 'route skeptic artifact'],
    },
    budget_envelope: {
      budget_ref: seedRef(resolved, 'validation_budget', `validation_budget_${candidateKey}_seed`),
      iteration_budget_ref: seedRef(resolved, 'iteration_budget', `iteration_budget_${candidateKey}_seed`),
      retry_budget: 1,
      max_runtime: '2h',
      max_compute: 'single-gpu-smoke',
      max_human_review_count: 1,
    },
    included_context_refs: [seedRef(resolved, 'route_architecture_runtime_artifact', 'lineage_seed_route_context')],
    trace_refs: [seedRef(resolved, 'trace_manifest', `trace_manifest_${candidateKey}_seed`)],
    confirmatory_marker: confirmatoryMarker,
    blocker_codes: [],
    warning_codes: [],
  };
}

function seedInvocationResult<T>(
  output: T,
  nodeId: string,
  executionMode: string,
): TopicSelectionAgentInvocationResult<T> {
  const outputHash = seedHash(output);
  const provenance = {
    workflow_run_id: 'chain_lineage_seed_workflow_run',
    node_id: nodeId,
    node_attempt_id: `${nodeId}.attempt-0`,
    invocation_attempt_id: `${nodeId}.call-1`,
    execution_mode: executionMode,
    executor_kind: 'single_agent',
    source_kind: 'mock_fixture',
    non_provider: true,
    run_mode: 'test',
    profile_id: 'chain-lineage-seed-profile',
    profile_version: 'v1',
    profile_hash: seedHash('chain-lineage-seed-profile'),
    model_option_id: null,
    normalized_params_hash: null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'ChainLineageSeedRoleArtifact@v1',
    prompt_template_id: 'chain-lineage-seed-template',
    prompt_template_version: 'v1',
    schema_name: 'chain_lineage_seed_role_output',
    prompt_packet_hash: seedHash(`prompt:${nodeId}`),
    prompt_packet_cache_status: 'not_applicable',
    prompt_packet_cache_result_ref: null,
    prompt_packet_cache_result_hash: null,
    response_hash: outputHash,
    structured_output_hash: outputHash,
    cache_status: 'not_applicable',
    response_reuse_ref: null,
    telemetry: null,
  };
  const validation = { valid: true, error_count: 0, errors: [] };
  return {
    schema_version: 'v1',
    node_id: nodeId,
    workflow_run_id: 'chain_lineage_seed_workflow_run',
    node_attempt_id: `${nodeId}.attempt-0`,
    status: 'succeeded',
    structured_output: output,
    provenance,
    validation,
    token_budget_gate_result: seedTokenBudgetGateResult(nodeId),
    warning_codes: [],
    blocker_codes: [],
    error_code: null,
    audit_snapshot: {
      schema_version: 'topic-selection-agent-invocation-audit-v1',
      node_id: nodeId,
      workflow_run_id: 'chain_lineage_seed_workflow_run',
      node_attempt_id: `${nodeId}.attempt-0`,
      status: 'succeeded',
      provenance,
      token_budget_gate_result: seedTokenBudgetGateResult(nodeId),
      validation,
      warning_codes: [],
      blocker_codes: [],
      error_code: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
    created_at: '2026-01-01T00:00:00.000Z',
    audit_artifact_ref: null,
  } as unknown as TopicSelectionAgentInvocationResult<T>;
}

function seedTokenBudgetGateResult(nodeId: string) {
  return {
    provider_id: null,
    model_id: null,
    profile_id: 'chain-lineage-seed-profile',
    model_option_id: null,
    estimated_input_tokens: 1200,
    estimated_output_tokens: 2400,
    context_window_tokens: 128000,
    schema_overhead_tokens: 1200,
    decision: 'within_budget',
    compression_strategy_ref: {
      ref_type: 'compression_strategy',
      ref_id: `${nodeId}.context-compression`,
      title_card_id: null,
      version_id: null,
    },
    blocker_codes: [],
    warning_codes: [],
  };
}

function seedRef(
  resolved: ResolvedSeedOptions,
  refType: string,
  refId: string,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: resolved.titleCardId,
    version_id: 'v1',
  };
}

function seedHash(value: unknown): string {
  return sha256Text(stableStringify(value));
}
