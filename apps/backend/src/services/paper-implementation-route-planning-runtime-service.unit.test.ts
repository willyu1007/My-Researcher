import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROFILE_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROFILE_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID,
  PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS,
  type PaperImplementationRouteCandidateProposal,
  type PaperImplementationRoutePlanningRoleOutput,
  type RunPaperImplementationRoutePlanningRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import type {
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationRepository } from '../repositories/in-memory-paper-implementation-repository.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import {
  seedAdmittedRoutePlanningLineage,
  seedBlockedRouteArchitectureFinalArtifact,
} from './paper-implementation-runtime-chain-lineage-fixtures.js';
import { PaperImplementationRoutePlanningRuntimeService } from './paper-implementation-route-planning-runtime-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const PROJECT_ID = 'implementation_project_route_planning_runtime_001';
const TITLE_CARD_ID = 'title_card_route_planning_runtime_001';
const NOW = '2026-06-07T10:00:00.000Z';

type Outcome =
  | 'passed_architecture'
  | 'passed_skeptic'
  | 'schema_failed'
  | 'incomplete_architecture'
  | 'incomplete_skeptic';

class StubRoutePlanningAgentOrchestrator {
  readonly calls: Array<{
    node_id: string;
    execution_mode: string;
    executor_kind: string;
    feature_id?: string | null;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    runtime_token_budget?: unknown;
    debate_extension?: unknown;
  }> = [];

  constructor(private readonly outcomes: Outcome[] = ['passed_architecture']) {}

  async invokeStructuredOutput<T>(
    input: {
      node_id: string;
      execution_mode: string;
      executor_kind: string;
      feature_id?: string | null;
      messages: Array<{ role: 'system' | 'user'; content: string }>;
      runtime_token_budget?: unknown;
      debate_extension?: unknown;
    },
  ): Promise<TopicSelectionAgentInvocationResult<T>> {
    this.calls.push(input);
    const outcome = this.outcomes.shift() ?? 'passed_architecture';
    if (outcome === 'schema_failed') {
      return failedInvocationResult(input.node_id, input.execution_mode);
    }
    if (outcome === 'incomplete_architecture') {
      return invocationResult(routeArchitectureRoleOutput({
        route_candidate_proposals: [routeCandidateProposal('single_candidate', false)],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'incomplete_skeptic') {
      return invocationResult(routeSkepticRoleOutput({
        checked_dimensions: ['compute_budget'],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'passed_skeptic') {
      return invocationResult(routeSkepticRoleOutput() as T, input.node_id, input.execution_mode);
    }
    return invocationResult(routeArchitectureRoleOutput() as T, input.node_id, input.execution_mode);
  }
}

test('route architecture runtime records proposal-only artifacts without Domain Gate or route writes', async () => {
  const { service, repository, orchestrator } = serviceFixture(['passed_architecture']);
  const result = await service.runRouteArchitecture(PROJECT_ID, providerRequest('architecture'));

  assert.equal(result.status, 'passed');
  assert.equal(result.slot_id, PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID);
  assert.equal(result.workflow_type, 'route_architecture');
  assert.equal(result.provider_call_count, 1);
  assert.equal(orchestrator.calls.length, 1);
  assert.equal(orchestrator.calls[0]?.node_id, PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID);
  assert.equal(orchestrator.calls[0]?.executor_kind, 'single_agent');
  assert.equal(orchestrator.calls[0]?.feature_id, 'paper_implementation');
  assert.equal(Boolean(orchestrator.calls[0]?.runtime_token_budget), true);
  assert.equal(orchestrator.calls[0]?.debate_extension, null);
  assert.match(orchestrator.calls[0]?.messages[0]?.content ?? '', /route architecture candidate proposals/);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.final_runtime_artifact?.artifact_scope, 'final');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(
    (result.final_runtime_artifact?.artifact_payload.route_candidate_proposals as unknown[] | undefined)?.length,
    2,
  );
  assert.equal('domain_gate_request' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal('technical_route_candidate_create_request' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_domain_gate_request, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_queue_side_effect, true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.response_reuse_status_counts.miss, 2);

  const storedArtifacts = await repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_SLOT_ID,
  });
  assert.equal(storedArtifacts.length, 2);
  assert.equal(stableStringify(result).includes('raw_provider_response'), false);
  assert.equal(stableStringify(result).includes('technical_route_candidate_create_request'), false);
});

test('route skeptic runtime records independent critique coverage against admitted route proposal', async () => {
  const { service, orchestrator, seedLineage } = serviceFixture(['passed_skeptic']);
  const lineage = await seedLineage();
  const result = await service.runRouteSkepticReview(PROJECT_ID, providerRequest('skeptic', {
    ref: lineage.routeProposalRef,
    hash: lineage.routeProposalHash,
  }));

  assert.equal(result.status, 'passed');
  assert.equal(result.slot_id, PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_SLOT_ID);
  assert.equal(result.workflow_type, 'route_skeptic_review');
  assert.equal(orchestrator.calls.length, 1);
  assert.equal(orchestrator.calls[0]?.node_id, PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID);
  assert.equal(orchestrator.calls[0]?.executor_kind, 'single_agent');
  assert.equal(result.runtime_artifacts[0]?.executor_kind, 'single_agent');
  assert.deepEqual(
    result.final_runtime_artifact?.artifact_payload.checked_dimensions,
    [...PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS],
  );
  assert.equal(result.final_runtime_artifact?.artifact_payload.recommended_disposition, 'revise');
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_queue_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_domain_gate_request, true);
  assert.equal('queue_action' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal('domain_gate_request' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
});

test('route planning runtime records preflight blockers without provider calls', async () => {
  const { service, orchestrator } = serviceFixture(['passed_architecture']);
  const result = await service.runRouteArchitecture(PROJECT_ID, {
    ...providerRequest('architecture'),
    run_id: 'route_architecture_preflight_blocked_run_001',
    preflight_blocker_codes: ['source_refs_missing'],
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(orchestrator.calls.length, 0);
  assert.deepEqual(result.blocker_codes, ['source_refs_missing']);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
});

test('route planning runtime fails closed after same-profile semantic retry exhaustion', async () => {
  const architecture = serviceFixture(['incomplete_architecture', 'incomplete_architecture']);
  const architectureResult = await architecture.service.runRouteArchitecture(PROJECT_ID, {
    ...providerRequest('architecture'),
    run_id: 'route_architecture_missing_candidate_run_001',
  });

  assert.equal(architectureResult.status, 'failed_runtime');
  assert.equal(architecture.orchestrator.calls.length, 2);
  assert.equal(architectureResult.provider_call_count, 2);
  assert.equal(architectureResult.runtime_artifacts.length, 1);
  assert.equal(architectureResult.final_runtime_artifact, null);
  assert.equal(
    architectureResult.runtime_artifacts[0]?.runtime_failure_code,
    'ROUTE_ARCHITECTURE_CANDIDATE_SET_INCOMPLETE',
  );
  assert.equal(architectureResult.admission_records[0]?.admission_status, 'rejected');

  const skeptic = serviceFixture(['incomplete_skeptic', 'incomplete_skeptic']);
  const skepticLineage = await skeptic.seedLineage();
  const skepticResult = await skeptic.service.runRouteSkepticReview(PROJECT_ID, {
    ...providerRequest('skeptic', {
      ref: skepticLineage.routeProposalRef,
      hash: skepticLineage.routeProposalHash,
    }),
    run_id: 'route_skeptic_missing_dimension_run_001',
  });

  assert.equal(skepticResult.status, 'failed_runtime');
  assert.equal(skeptic.orchestrator.calls.length, 2);
  assert.equal(skepticResult.provider_call_count, 2);
  assert.equal(
    skepticResult.runtime_artifacts[0]?.runtime_failure_code,
    'ROUTE_SKEPTIC_DIMENSION_COVERAGE_INCOMPLETE',
  );
  assert.equal(skepticResult.admission_records[0]?.admission_status, 'rejected');
});

test('route planning runtime rejects product fixture modes and provider fixture payloads', async () => {
  const { service, orchestrator } = serviceFixture();

  await assert.rejects(
    () => service.runRouteArchitecture(PROJECT_ID, {
      ...providerRequest('architecture'),
      run_id: 'route_architecture_product_mocked_mode_run_001',
      execution_mode: 'mocked_llm',
      model_option_id: null,
      mocked_role_outputs: routePlanningRoleOutputs('architecture'),
    }),
    /product run_mode requires execution_mode=provider_llm/,
  );

  await assert.rejects(
    () => service.runRouteSkepticReview(PROJECT_ID, {
      ...providerRequest('skeptic'),
      run_id: 'route_skeptic_provider_fixture_payload_run_001',
      codex_role_outputs: routePlanningRoleOutputs('skeptic'),
    }),
    /provider_llm runtime requests must not include mocked_role_outputs or codex_role_outputs/,
  );

  assert.equal(orchestrator.calls.length, 0);
});

test('route skeptic runtime rejects missing admitted proposal primary input before provider calls', async () => {
  const { service, orchestrator } = serviceFixture(['passed_skeptic']);

  await assert.rejects(
    () => service.runRouteSkepticReview(PROJECT_ID, {
      ...providerRequest('skeptic'),
      run_id: 'route_skeptic_missing_primary_proposal_run_001',
      admitted_route_proposal_artifact_ref: null,
      admitted_route_proposal_artifact_hash: null,
    }),
    /requires admitted_route_proposal_artifact_ref/,
  );

  assert.equal(orchestrator.calls.length, 0);
});

test('route skeptic runtime rejects unadmitted, drifted, blocked, or wrong-slot upstream route proposals before provider calls', async () => {
  const { service, orchestrator, seedLineage, seedBlockedRouteFinal } = serviceFixture(['passed_skeptic']);
  const lineage = await seedLineage();
  const blocked = await seedBlockedRouteFinal();

  const rejectsBeforeOrchestrator = async (
    request: RunPaperImplementationRoutePlanningRuntimeRequest,
  ) => {
    await assert.rejects(
      () => service.runRouteSkepticReview(PROJECT_ID, request),
      (error: unknown) => error instanceof AppError
        && error.statusCode === 409
        && error.errorCode === 'GATE_CONSTRAINT_FAILED',
    );
  };

  await rejectsBeforeOrchestrator({
    ...providerRequest('skeptic', {
      ref: ref('route_architecture_runtime_artifact', 'route_architecture_final_forged_001'),
      hash: hash('forged-route-architecture-final'),
    }),
    run_id: 'route_skeptic_unadmitted_upstream_run_001',
  });
  await rejectsBeforeOrchestrator({
    ...providerRequest('skeptic', {
      ref: lineage.routeProposalRef,
      hash: hash('drifted-route-architecture-final'),
    }),
    run_id: 'route_skeptic_drifted_upstream_hash_run_001',
  });
  await rejectsBeforeOrchestrator({
    ...providerRequest('skeptic', { ref: blocked.ref, hash: blocked.hash }),
    run_id: 'route_skeptic_blocked_upstream_final_run_001',
  });
  await rejectsBeforeOrchestrator({
    ...providerRequest('skeptic', {
      ref: lineage.routeSkepticRef,
      hash: lineage.routeSkepticHash,
    }),
    run_id: 'route_skeptic_wrong_slot_upstream_run_001',
  });

  assert.equal(orchestrator.calls.length, 0);
});

test('route planning runtime rejects missing or inactive implementation project before provider calls', async () => {
  const missingProject = serviceFixture(undefined, null);
  await assert.rejects(
    () => missingProject.service.runRouteArchitecture(PROJECT_ID, providerRequest('architecture')),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 404
      && error.errorCode === 'NOT_FOUND',
  );
  assert.equal(missingProject.orchestrator.calls.length, 0);

  const inactiveProject = serviceFixture(undefined, implementationProjectFixture('archived'));
  await assert.rejects(
    () => inactiveProject.service.runRouteSkepticReview(PROJECT_ID, providerRequest('skeptic')),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
  assert.equal(inactiveProject.orchestrator.calls.length, 0);
});

function implementationProjectFixture(
  lifecycleStatus: ImplementationProject['lifecycle_status'] = 'active',
): ImplementationProject {
  return {
    implementation_project_id: PROJECT_ID,
    intake_snapshot_id: `${PROJECT_ID}_intake_snapshot`,
    workspace_id: 'workspace_001',
    title_card_id: TITLE_CARD_ID,
    paper_project_bridge_id: `${PROJECT_ID}_bridge`,
    bridge_payload_hash: 'bridge_payload_hash_001',
    target_paper_project_ref: null,
    lifecycle_status: lifecycleStatus,
    freshness_status: 'fresh',
    source_status: 'active',
    version_number: 1,
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };
}

function projectRepositoryFixture(
  project: ImplementationProject | null,
): InMemoryPaperImplementationRepository {
  const repository = new InMemoryPaperImplementationRepository();
  if (project) {
    void repository.createBootstrap({
      implementation_project: project,
      intake_snapshot: {
        intake_snapshot_id: project.intake_snapshot_id,
        implementation_project_id: project.implementation_project_id,
        workspace_id: project.workspace_id,
        title_card_id: project.title_card_id,
        paper_project_bridge_id: project.paper_project_bridge_id,
        paper_project_bridge_ref: {
          ref_type: 'paper_project_bridge',
          ref_id: project.paper_project_bridge_id,
          title_card_id: project.title_card_id,
          version_id: null,
        },
        bridge_payload_hash: project.bridge_payload_hash,
        promotion_decision_id: 'promotion_decision_001',
        promotion_decision_ref: {
          ref_type: 'promotion_decision',
          ref_id: 'promotion_decision_001',
          title_card_id: project.title_card_id,
          version_id: null,
        },
        promotion_commitment_profile_id: 'promotion_commitment_profile_001',
        promotion_commitment_profile_ref: {
          ref_type: 'promotion_commitment_profile',
          ref_id: 'promotion_commitment_profile_001',
          title_card_id: project.title_card_id,
          version_id: null,
        },
        promotion_input_snapshot_id: 'promotion_input_snapshot_001',
        promotion_input_snapshot_ref: {
          ref_type: 'promotion_input_snapshot',
          ref_id: 'promotion_input_snapshot_001',
          title_card_id: project.title_card_id,
          version_id: null,
        },
        promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
        topic_package_id: 'topic_package_001',
        package_version: 'v1',
        source_status: 'active',
        snapshot_hashes: {
          bundle_hash: 'bundle_hash_001',
          package_snapshot_hash: 'package_snapshot_hash_001',
          package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
          promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
        },
        source_refs: [],
        accepted_risk_refs: [],
        condition_refs: [],
        early_check_obligations: [],
        working_copy_payload: {
          editable_title: 'Working paper title',
          problem_statement: 'Problem statement.',
          contribution_summary: 'Contribution summary.',
          evaluation_plan: 'Evaluation plan.',
          initial_planning_notes: [],
          claim_ceiling: 'Bounded claim ceiling.',
          prohibited_claims: [],
          conditions: [],
          accepted_risk_refs: [],
          early_check_obligations: [],
          source_lineage_summary: {},
        },
        working_copy_payload_hash: 'working_copy_payload_hash_001',
        source_handoff: {} as never,
        target_paper_project_ref: null,
        intake_snapshot_hash: 'intake_snapshot_hash_001',
        policy_version_id: 'policy_v1',
        created_by: 'system',
        created_at: NOW,
      },
    });
  }
  return repository;
}

function serviceFixture(
  outcomes?: Outcome[],
  project: ImplementationProject | null = implementationProjectFixture(),
) {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository,
    idFactory,
    now: () => NOW,
  });
  const projectRepository = projectRepositoryFixture(project);
  const orchestrator = new StubRoutePlanningAgentOrchestrator(outcomes);
  const service = new PaperImplementationRoutePlanningRuntimeService({
    projectRepository,
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now: () => NOW,
  });
  const seedOptions = {
    projectRepository,
    runtimeAdmission,
    implementationProjectId: PROJECT_ID,
    titleCardId: TITLE_CARD_ID,
    idFactory,
    now: () => NOW,
  };
  const seedLineage = () => seedAdmittedRoutePlanningLineage(seedOptions);
  const seedBlockedRouteFinal = () => seedBlockedRouteArchitectureFinalArtifact(seedOptions);
  return { service, repository, orchestrator, seedLineage, seedBlockedRouteFinal };
}

function routePlanningRoleOutputs(
  slot: 'architecture' | 'skeptic',
): RunPaperImplementationRoutePlanningRuntimeRequest['mocked_role_outputs'] {
  if (slot === 'architecture') {
    return {
      [PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID]: routeArchitectureRoleOutput(),
    };
  }
  return {
    [PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID]: routeSkepticRoleOutput(),
  };
}

function providerRequest(
  slot: 'architecture' | 'skeptic',
  admittedRouteProposal?: { ref: TopicSelectionFunctionalRef; hash: string },
): RunPaperImplementationRoutePlanningRuntimeRequest {
  const profileId = slot === 'architecture'
    ? PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROFILE_ID
    : PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROFILE_ID;
  return {
    run_id: `${slot}_runtime_run_001`,
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: profileId,
    model_option_id: `${profileId}.openai-balanced`,
    target_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: [
      ref('implementation_input_snapshot', 'input_snapshot_001'),
      ref('trace_manifest', 'trace_manifest_001'),
      ref('literature_evidence', 'literature_evidence_001'),
    ],
    source_hashes: [hash('snapshot'), hash('trace'), hash('literature')],
    admitted_route_proposal_artifact_ref: slot === 'skeptic'
      ? admittedRouteProposal?.ref ?? ref('route_architecture_runtime_artifact', 'route_architecture_final_001')
      : null,
    admitted_route_proposal_artifact_hash: slot === 'skeptic'
      ? admittedRouteProposal?.hash ?? hash('route-architecture-final')
      : null,
    reviewed_candidate_keys: slot === 'skeptic' ? ['exploratory_route_candidate'] : [],
    secondary_route_candidate_refs: slot === 'skeptic'
      ? [ref('technical_route_candidate', 'technical_route_candidate_secondary_001')]
      : [],
    preflight_blocker_codes: [],
  };
}

function routeCandidateProposal(
  candidateKey: string,
  confirmatoryMarker: boolean,
): PaperImplementationRouteCandidateProposal {
  return {
    candidate_key: candidateKey,
    route_summary: `${candidateKey} proposes a bounded route candidate.`,
    expected_information_gain: 'Expected to clarify whether the target method beats the baseline under bounded evidence.',
    baseline_gap_status: confirmatoryMarker ? 'partial' : 'unknown',
    cited_source_refs: [ref('implementation_input_snapshot', 'input_snapshot_001')],
    trace_refs: [ref('trace_manifest', 'trace_manifest_001')],
    validation_signal_refs: [ref('validation_signal', `${candidateKey}_signal_001`)],
    dataset_refs: [ref('dataset_version', `${candidateKey}_dataset_001`)],
    metric_refs: [ref('metric', `${candidateKey}_metric_001`)],
    baseline_refs: [ref('baseline_version', `${candidateKey}_baseline_001`)],
    code_refs: [ref('code_version', `${candidateKey}_code_001`)],
    config_refs: [ref('config_snapshot', `${candidateKey}_config_001`)],
    scope_boundary: 'Proposal only; deterministic validation planning owns persisted route records.',
    confirmatory_marker: confirmatoryMarker,
    blocker_codes: [],
    warning_codes: [],
  };
}

function routeArchitectureRoleOutput(
  overrides: Partial<PaperImplementationRoutePlanningRoleOutput> = {},
): PaperImplementationRoutePlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Route architecture proposed bounded route candidates.',
    cited_source_refs: [ref('implementation_input_snapshot', 'input_snapshot_001')],
    blocker_codes: [],
    warning_codes: [],
    route_candidate_proposals: [
      routeCandidateProposal('exploratory_route_candidate', false),
      routeCandidateProposal('confirmatory_route_candidate', true),
    ],
    ...overrides,
  };
}

function routeSkepticRoleOutput(
  overrides: Partial<PaperImplementationRoutePlanningRoleOutput> = {},
): PaperImplementationRoutePlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Independent route skeptic covered route-planning risks.',
    cited_source_refs: [ref('route_architecture_runtime_artifact', 'route_architecture_final_001')],
    blocker_codes: [],
    warning_codes: [],
    reviewed_route_proposal_ref: ref('route_architecture_runtime_artifact', 'route_architecture_final_001'),
    reviewed_route_proposal_hash: hash('route-architecture-final'),
    reviewed_candidate_keys: ['exploratory_route_candidate'],
    checked_dimensions: [...PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_RISK_DIMENSIONS],
    risk_findings: [{
      finding_id: 'route_risk_finding_budget_001',
      risk_dimension: 'compute_budget',
      severity: 'warning',
      summary: 'Budget must be confirmed before deterministic route admission proceeds.',
      evidence_refs: [ref('validation_budget', 'budget_001')],
      affected_candidate_keys: ['exploratory_route_candidate'],
      required_revision_refs: [],
      blocks_route_progression: false,
    }],
    recommended_disposition: 'revise',
    no_queue_side_effect: true,
    ...overrides,
  };
}

function invocationResult<T>(
  output: T,
  nodeId: string,
  executionMode: string,
): TopicSelectionAgentInvocationResult<T> {
  return baseInvocationResult({
    output,
    nodeId,
    executionMode,
    status: 'succeeded',
    errorCode: null,
    blockerCodes: [],
  });
}

function failedInvocationResult<T>(
  nodeId: string,
  executionMode: string,
): TopicSelectionAgentInvocationResult<T> {
  return baseInvocationResult<T>({
    output: null,
    nodeId,
    executionMode,
    status: 'blocked',
    errorCode: 'SCHEMA_VALIDATION_FAILED',
    blockerCodes: ['SCHEMA_VALIDATION_FAILED'],
  });
}

function baseInvocationResult<T>(input: {
  output: T | null;
  nodeId: string;
  executionMode: string;
  status: 'succeeded' | 'blocked';
  errorCode: string | null;
  blockerCodes: string[];
}): TopicSelectionAgentInvocationResult<T> {
  const profileId = input.nodeId === PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID
    ? PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_PROFILE_ID
    : PAPER_IMPLEMENTATION_ROUTE_ARCHITECTURE_PROFILE_ID;
  const outputHash = input.output ? hash(input.output) : hash(input.errorCode);
  const provenance = {
    workflow_run_id: 'route_planning_runtime_run_001',
    node_id: input.nodeId,
    node_attempt_id: `${input.nodeId}.attempt-0`,
    invocation_attempt_id: `${input.nodeId}.call-1`,
    execution_mode: input.executionMode,
    executor_kind: 'single_agent',
    source_kind: input.executionMode === 'provider_llm' ? 'provider_response' : 'mock_fixture',
    non_provider: input.executionMode !== 'provider_llm',
    run_mode: input.executionMode === 'provider_llm' ? 'product' : 'acceptance',
    profile_id: profileId,
    profile_version: 'v1',
    profile_hash: hash('profile'),
    model_option_id: input.executionMode === 'provider_llm'
      ? `${profileId}.openai-balanced`
      : null,
    normalized_params_hash: input.executionMode === 'provider_llm' ? hash('normalized-params') : null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'PaperImplementationRoutePlanningRoleArtifact@v1',
    prompt_template_id: input.nodeId === PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID
      ? 'paper-implementation-route-skeptic-review-route-risk-critique'
      : 'paper-implementation-route-architecture-route-candidates',
    prompt_template_version: 'v1',
    schema_name: 'paper_implementation_route_planning_role_output',
    prompt_packet_hash: hash(`prompt:${input.nodeId}`),
    prompt_packet_cache_status: 'miss',
    prompt_packet_cache_result_ref: null,
    prompt_packet_cache_result_hash: null,
    response_hash: outputHash,
    structured_output_hash: outputHash,
    cache_status: 'not_applicable',
    response_reuse_ref: null,
    telemetry: input.executionMode === 'provider_llm' ? { request_count: 1 } : null,
  };
  return {
    schema_version: 'v1',
    node_id: input.nodeId,
    workflow_run_id: 'route_planning_runtime_run_001',
    node_attempt_id: `${input.nodeId}.attempt-0`,
    status: input.status,
    structured_output: input.output,
    provenance,
    validation: input.status === 'succeeded'
      ? { valid: true, error_count: 0, errors: [] }
      : { valid: false, error_count: 1, errors: [{ keyword: 'required' }] },
    token_budget_gate_result: tokenBudgetGateResult(profileId),
    warning_codes: [],
    blocker_codes: input.blockerCodes,
    error_code: input.errorCode,
    audit_snapshot: {
      schema_version: 'topic-selection-agent-invocation-audit-v1',
      node_id: input.nodeId,
      workflow_run_id: 'route_planning_runtime_run_001',
      node_attempt_id: `${input.nodeId}.attempt-0`,
      status: input.status,
      provenance,
      token_budget_gate_result: tokenBudgetGateResult(profileId),
      validation: input.status === 'succeeded'
        ? { valid: true, error_count: 0, errors: [] }
        : { valid: false, error_count: 1, errors: [{ keyword: 'required' }] },
      warning_codes: [],
      blocker_codes: input.blockerCodes,
      error_code: input.errorCode,
      created_at: NOW,
    },
    created_at: NOW,
    audit_artifact_ref: null,
  } as unknown as TopicSelectionAgentInvocationResult<T>;
}

function tokenBudgetGateResult(profileId: string) {
  return {
    provider_id: null,
    model_id: null,
    profile_id: profileId,
    model_option_id: null,
    estimated_input_tokens: 1400,
    estimated_output_tokens: 2400,
    context_window_tokens: 128000,
    schema_overhead_tokens: 1200,
    decision: 'within_budget',
    compression_strategy_ref: ref('compression_strategy', 'paper-implementation-route-planning-context-compression'),
    blocker_codes: [],
    warning_codes: [],
  };
}

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: TITLE_CARD_ID,
    version_id: 'v1',
  };
}

function hash(value: unknown): string {
  return sha256Text(stableStringify(value));
}

test('route planning runtime token budget counts message-embedded context once and wires the compression attempt (S2-A)', async () => {
  const fatText = 'Neutral benchmark evidence sentence with cited source support and no secrets. '.repeat(200);
  const { service, orchestrator } = serviceFixture(['passed_architecture']);
  const base = providerRequest('architecture');
  const request = {
    ...base,
    run_id: 'route_architecture_token_budget_run_001',
    source_context_packets: [{
      source_ref: base.source_refs[0],
      evidence_kind: 'admitted_upstream_proposal',
      content_summary: fatText,
      key_facts: [fatText, 'bounded key fact with cited source support.'],
    }],
  };
  await service.runRouteArchitecture(PROJECT_ID, request);

  const call = orchestrator.calls[0];
  assert.ok(call);
  const budget = call.runtime_token_budget as {
    context_payloads: unknown[];
    estimated_input_tokens_override: number;
    compression_attempt?: {
      compression_executor_kind: string;
      compressed_messages?: Array<{ role: string; content: string }> | null;
    } | null;
  };
  const messages = call.messages;
  // N3 single-source estimate: exactly the messages that will be sent, counted once.
  assert.equal(
    budget.estimated_input_tokens_override,
    Math.ceil(stableStringify({ messages }).length / 4),
  );
  assert.deepEqual(budget.context_payloads, []);
  // Re-carrying the embedded packet bodies (the pre-fix shape) would roughly double
  // the estimate for packet-dominated inputs.
  const doubleCounted = Math.ceil(stableStringify({
    messages,
    context_payloads: [{ source_context_packets: request.source_context_packets }],
  }).length / 4);
  assert.equal(budget.estimated_input_tokens_override <= Math.ceil(doubleCounted * 0.6), true);
  // PC-S2/PC-S3: a packet face yields a caller-supplied deterministic attempt.
  assert.ok(budget.compression_attempt);
  assert.equal(budget.compression_attempt.compression_executor_kind, 'deterministic_structural');
  assert.equal((budget.compression_attempt.compressed_messages?.length ?? 0) > 0, true);

  const noPackets = serviceFixture(['passed_architecture']);
  await noPackets.service.runRouteArchitecture(PROJECT_ID, {
    ...providerRequest('architecture'),
    run_id: 'route_architecture_token_budget_run_002',
  });
  const noPacketBudget = noPackets.orchestrator.calls[0]?.runtime_token_budget as {
    compression_attempt?: unknown;
  };
  assert.equal(noPacketBudget.compression_attempt ?? null, null);
});

class MockedEchoRouteAgentOrchestrator {
  readonly calls: Array<{ node_id: string; execution_mode: string }> = [];

  async invokeStructuredOutput<T>(
    input: { node_id: string; execution_mode: string; mocked_output?: { output: T } | null },
  ): Promise<TopicSelectionAgentInvocationResult<T>> {
    this.calls.push(input);
    const output = input.mocked_output?.output ?? null;
    if (output === null) {
      throw new Error(`mocked_output is required for ${input.node_id}.`);
    }
    return invocationResult(output, input.node_id, input.execution_mode);
  }
}

function mockedEchoServiceFixture() {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository,
    idFactory,
    now: () => NOW,
  });
  const projectRepository = projectRepositoryFixture(implementationProjectFixture());
  const orchestrator = new MockedEchoRouteAgentOrchestrator();
  const service = new PaperImplementationRoutePlanningRuntimeService({
    projectRepository,
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now: () => NOW,
  });
  const seedLineage = () => seedAdmittedRoutePlanningLineage({
    projectRepository,
    runtimeAdmission,
    implementationProjectId: PROJECT_ID,
    titleCardId: TITLE_CARD_ID,
    idFactory,
    now: () => NOW,
  });
  return { service, orchestrator, seedLineage };
}

function mockedSkepticRequest(
  lineage: { routeProposalRef: TopicSelectionFunctionalRef; routeProposalHash: string },
  fixture: PaperImplementationRoutePlanningRoleOutput,
  runId: string,
): RunPaperImplementationRoutePlanningRuntimeRequest {
  return {
    ...providerRequest('skeptic', { ref: lineage.routeProposalRef, hash: lineage.routeProposalHash }),
    run_id: runId,
    run_mode: 'mock',
    execution_mode: 'mocked_llm',
    model_profile_id: null,
    model_option_id: null,
    mocked_role_outputs: {
      [PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_REVIEW_ROLE_SLOT_ID]: fixture,
    },
  };
}

test('route skeptic runtime synthesizes missing fixture echo fields slot-side and flags blocked output without repair guidance (S2-C C4)', async () => {
  const { service, seedLineage } = mockedEchoServiceFixture();
  const lineage = await seedLineage();
  const fixture = routeSkepticRoleOutput({
    role_status: 'blocked',
    blocker_codes: ['ROUTE_SKEPTIC_SCOPE_RISK'],
    // Missing/placeholder echo fields are normalized slot-side from the
    // request-injected admitted values (coordinator alignment sink).
    reviewed_route_proposal_ref: null,
    reviewed_route_proposal_hash: null,
  });
  const result = await service.runRouteSkepticReview(
    PROJECT_ID,
    mockedSkepticRequest(lineage, fixture, 'route_skeptic_fixture_echo_blocked_run_001'),
  );

  assert.equal(result.status, 'blocked');
  const roleOutputPayload = result.runtime_artifacts[0]?.artifact_payload.role_output as
    { reviewed_route_proposal_hash?: string | null } | undefined;
  assert.equal(roleOutputPayload?.reviewed_route_proposal_hash, lineage.routeProposalHash);
  // Transitional pre-S3 completeness check: blocked skeptic outcome without a
  // single required_revision_refs entry gets a non-blocking warning.
  assert.equal(
    result.final_runtime_artifact?.warning_codes.includes('ROUTE_SKEPTIC_REPAIR_SUGGESTIONS_MISSING'),
    true,
  );
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
});

test('route skeptic runtime omits the repair-suggestions warning when blocked findings carry revision refs (S2-C C4)', async () => {
  const { service, seedLineage } = mockedEchoServiceFixture();
  const lineage = await seedLineage();
  const fixture = routeSkepticRoleOutput({
    role_status: 'blocked',
    blocker_codes: ['ROUTE_SKEPTIC_SCOPE_RISK'],
    reviewed_route_proposal_ref: null,
    reviewed_route_proposal_hash: null,
    risk_findings: [{
      finding_id: 'route_risk_finding_scope_001',
      risk_dimension: 'scope_boundary',
      severity: 'blocking',
      summary: 'Scope boundary must be revised before the route can proceed.',
      evidence_refs: [ref('implementation_input_snapshot', 'input_snapshot_001')],
      affected_candidate_keys: ['exploratory_route_candidate'],
      required_revision_refs: [ref('technical_route_candidate', 'route_candidate_revision_001')],
      blocks_route_progression: true,
    }],
  });
  const result = await service.runRouteSkepticReview(
    PROJECT_ID,
    mockedSkepticRequest(lineage, fixture, 'route_skeptic_fixture_echo_blocked_run_002'),
  );

  assert.equal(result.status, 'blocked');
  assert.equal(
    result.final_runtime_artifact?.warning_codes.includes('ROUTE_SKEPTIC_REPAIR_SUGGESTIONS_MISSING'),
    false,
  );
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
});
