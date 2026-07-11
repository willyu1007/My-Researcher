import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
  type PaperImplementationValidationCycleCandidateProposal,
  type PaperImplementationValidationCyclePlanningRoleOutput,
  type RunPaperImplementationValidationCyclePlanningRuntimeRequest,
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
  type PaperImplementationSeededRouteLineage,
} from './paper-implementation-runtime-chain-lineage-fixtures.js';
import { PaperImplementationValidationCyclePlanningRuntimeService } from './paper-implementation-validation-cycle-planning-runtime-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const PROJECT_ID = 'implementation_project_validation_cycle_planning_runtime_001';
const TITLE_CARD_ID = 'title_card_validation_cycle_planning_runtime_001';
const NOW = '2026-06-07T10:00:00.000Z';

type Outcome =
  | 'passed'
  | 'schema_failed'
  | 'incomplete_candidates'
  | 'route_proposal_mismatch'
  | 'route_skeptic_mismatch'
  | 'candidate_key_mismatch';

class StubValidationCyclePlanningAgentOrchestrator {
  readonly calls: Array<{
    node_id: string;
    execution_mode: string;
    executor_kind: string;
    feature_id?: string | null;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    runtime_token_budget?: unknown;
    debate_extension?: unknown;
  }> = [];

  constructor(
    private readonly lineage: PaperImplementationSeededRouteLineage,
    private readonly outcomes: Outcome[] = ['passed'],
  ) {}

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
    const outcome = this.outcomes.shift() ?? 'passed';
    if (outcome === 'schema_failed') {
      return failedInvocationResult(input.node_id, input.execution_mode);
    }
    if (outcome === 'incomplete_candidates') {
      return invocationResult(validationCyclePlanningRoleOutput(this.lineage, {
        cycle_candidate_proposals: [validationCycleCandidateProposal('single_cycle_candidate', false)],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'route_proposal_mismatch') {
      return invocationResult(validationCyclePlanningRoleOutput(this.lineage, {
        reviewed_route_proposal_hash: hash('drifted-route-architecture-final'),
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'route_skeptic_mismatch') {
      return invocationResult(validationCyclePlanningRoleOutput(this.lineage, {
        reviewed_route_skeptic_artifact_ref: ref('route_skeptic_review_runtime_artifact', 'drifted_route_skeptic_final_001'),
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'candidate_key_mismatch') {
      return invocationResult(validationCyclePlanningRoleOutput(this.lineage, {
        cycle_candidate_proposals: [
          {
            ...validationCycleCandidateProposal('exploratory_cycle_candidate', false),
            reviewed_route_candidate_key: 'drifted_route_candidate',
          },
          validationCycleCandidateProposal('confirmatory_cycle_candidate', true),
        ],
      }) as T, input.node_id, input.execution_mode);
    }
    return invocationResult(validationCyclePlanningRoleOutput(this.lineage) as T, input.node_id, input.execution_mode);
  }
}

test('validation cycle planning runtime records proposal-only artifacts without cycle, queue, or Domain Gate writes', async () => {
  const { service, repository, orchestrator, lineage } = await serviceFixture(['passed']);
  const result = await service.runCycleCandidates(PROJECT_ID, providerRequest(lineage));

  assert.equal(result.status, 'passed');
  assert.equal(result.slot_id, PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID);
  assert.equal(result.workflow_type, 'validation_cycle_planning');
  assert.equal(result.provider_call_count, 1);
  assert.equal(orchestrator.calls.length, 1);
  assert.equal(orchestrator.calls[0]?.node_id, PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID);
  assert.equal(orchestrator.calls[0]?.executor_kind, 'single_agent');
  assert.equal(orchestrator.calls[0]?.feature_id, 'paper_implementation');
  assert.equal(Boolean(orchestrator.calls[0]?.runtime_token_budget), true);
  assert.equal(orchestrator.calls[0]?.debate_extension, null);
  assert.match(orchestrator.calls[0]?.messages[0]?.content ?? '', /validation-cycle candidate planning/);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.final_runtime_artifact?.artifact_scope, 'final');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(
    (result.final_runtime_artifact?.artifact_payload.cycle_candidate_proposals as unknown[] | undefined)?.length,
    2,
  );
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_domain_gate_request, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_queue_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_validation_cycle_side_effect, true);
  assert.equal('domain_gate_request' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal('validation_cycle_id' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal('create_validation_cycle_draft_request' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal('queue_action' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.response_reuse_status_counts.miss, 2);

  const storedArtifacts = await repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
  });
  assert.equal(storedArtifacts.length, 2);
  assert.equal(stableStringify(result).includes('raw_provider_response'), false);
  assert.equal(stableStringify(result).includes('create_validation_cycle_draft_request'), false);
});

test('validation cycle planning runtime records preflight blockers without provider calls', async () => {
  const { service, orchestrator, lineage } = await serviceFixture(['passed']);
  const result = await service.runCycleCandidates(PROJECT_ID, {
    ...providerRequest(lineage),
    run_id: 'validation_cycle_planning_preflight_blocked_run_001',
    preflight_blocker_codes: ['route_skeptic_artifact_not_admitted'],
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(orchestrator.calls.length, 0);
  assert.deepEqual(result.blocker_codes, ['route_skeptic_artifact_not_admitted']);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
});

test('validation cycle planning runtime fails closed after same-profile semantic retry exhaustion', async () => {
  const { service, orchestrator, lineage } = await serviceFixture(['incomplete_candidates', 'incomplete_candidates']);
  const result = await service.runCycleCandidates(PROJECT_ID, {
    ...providerRequest(lineage),
    run_id: 'validation_cycle_planning_missing_candidates_run_001',
  });

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(result.provider_call_count, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  assert.equal(
    result.runtime_artifacts[0]?.runtime_failure_code,
    'VALIDATION_CYCLE_PLANNING_CANDIDATE_SET_INCOMPLETE',
  );
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
});

for (const scenario of [
  {
    name: 'route proposal hash/ref mismatch',
    outcome: 'route_proposal_mismatch' as const,
    failureCode: 'VALIDATION_CYCLE_PLANNING_ROUTE_PROPOSAL_MISMATCH',
  },
  {
    name: 'route skeptic artifact mismatch',
    outcome: 'route_skeptic_mismatch' as const,
    failureCode: 'VALIDATION_CYCLE_PLANNING_ROUTE_SKEPTIC_MISMATCH',
  },
  {
    name: 'reviewed candidate key mismatch',
    outcome: 'candidate_key_mismatch' as const,
    failureCode: 'VALIDATION_CYCLE_PLANNING_CANDIDATE_KEY_MISMATCH',
  },
]) {
  test(`validation cycle planning runtime rejects ${scenario.name} before final admission`, async () => {
    const { service, orchestrator, lineage } = await serviceFixture([scenario.outcome, scenario.outcome]);
    const result = await service.runCycleCandidates(PROJECT_ID, {
      ...providerRequest(lineage),
      run_id: `validation_cycle_planning_${scenario.outcome}_run_001`,
    });

    assert.equal(result.status, 'failed_runtime');
    assert.equal(orchestrator.calls.length, 2);
    assert.equal(result.provider_call_count, 2);
    assert.equal(result.runtime_artifacts.length, 1);
    assert.equal(result.final_runtime_artifact, null);
    assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, scenario.failureCode);
    assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  });
}

test('validation cycle planning runtime rejects product fixture modes, provider fixtures, and missing primary inputs', async () => {
  const { service, orchestrator, lineage } = await serviceFixture();

  await assert.rejects(
    () => service.runCycleCandidates(PROJECT_ID, {
      ...providerRequest(lineage),
      run_id: 'validation_cycle_planning_product_mocked_mode_run_001',
      execution_mode: 'mocked_llm',
      model_option_id: null,
      mocked_role_outputs: validationCyclePlanningRoleOutputs(lineage),
    }),
    /product run_mode requires execution_mode=provider_llm/,
  );

  await assert.rejects(
    () => service.runCycleCandidates(PROJECT_ID, {
      ...providerRequest(lineage),
      run_id: 'validation_cycle_planning_provider_fixture_payload_run_001',
      codex_role_outputs: validationCyclePlanningRoleOutputs(lineage),
    }),
    /provider_llm runtime requests must not include mocked_role_outputs or codex_role_outputs/,
  );

  await assert.rejects(
    () => service.runCycleCandidates(PROJECT_ID, {
      ...providerRequest(lineage),
      run_id: 'validation_cycle_planning_missing_skeptic_run_001',
      admitted_route_skeptic_artifact_ref: null as unknown as TopicSelectionFunctionalRef,
      admitted_route_skeptic_artifact_hash: null as unknown as string,
    }),
    /requires admitted_route_skeptic_artifact_ref/,
  );

  assert.equal(orchestrator.calls.length, 0);
});

test('validation cycle planning runtime rejects unadmitted, drifted, blocked, or wrong-slot upstream route artifacts before provider calls', async () => {
  const { service, orchestrator, lineage, seedBlockedRouteFinal } = await serviceFixture(['passed']);
  const blocked = await seedBlockedRouteFinal();

  const rejectsBeforeOrchestrator = async (
    request: RunPaperImplementationValidationCyclePlanningRuntimeRequest,
  ) => {
    await assert.rejects(
      () => service.runCycleCandidates(PROJECT_ID, request),
      (error: unknown) => error instanceof AppError
        && error.statusCode === 409
        && error.errorCode === 'GATE_CONSTRAINT_FAILED',
    );
  };

  await rejectsBeforeOrchestrator({
    ...providerRequest(lineage),
    run_id: 'validation_cycle_planning_unadmitted_route_run_001',
    admitted_route_proposal_artifact_ref: ref('route_architecture_runtime_artifact', 'route_architecture_final_forged_001'),
    admitted_route_proposal_artifact_hash: hash('forged-route-architecture-final'),
  });
  await rejectsBeforeOrchestrator({
    ...providerRequest(lineage),
    run_id: 'validation_cycle_planning_drifted_skeptic_hash_run_001',
    admitted_route_skeptic_artifact_hash: hash('drifted-route-skeptic-final'),
  });
  await rejectsBeforeOrchestrator({
    ...providerRequest(lineage),
    run_id: 'validation_cycle_planning_blocked_route_final_run_001',
    admitted_route_proposal_artifact_ref: blocked.ref,
    admitted_route_proposal_artifact_hash: blocked.hash,
  });
  await rejectsBeforeOrchestrator({
    ...providerRequest(lineage),
    run_id: 'validation_cycle_planning_wrong_slot_skeptic_run_001',
    admitted_route_skeptic_artifact_ref: lineage.routeProposalRef,
    admitted_route_skeptic_artifact_hash: lineage.routeProposalHash,
  });

  assert.equal(orchestrator.calls.length, 0);
});

test('validation cycle planning runtime rejects missing or inactive implementation project before provider calls', async () => {
  const missingProject = await serviceFixture(undefined, null);
  await assert.rejects(
    () => missingProject.service.runCycleCandidates(PROJECT_ID, providerRequest(missingProject.lineage)),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 404
      && error.errorCode === 'NOT_FOUND',
  );
  assert.equal(missingProject.orchestrator.calls.length, 0);

  const inactiveProject = await serviceFixture(undefined, implementationProjectFixture('archived'));
  await assert.rejects(
    () => inactiveProject.service.runCycleCandidates(PROJECT_ID, providerRequest(inactiveProject.lineage)),
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

async function serviceFixture(
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
  const seedOptions = {
    projectRepository,
    runtimeAdmission,
    implementationProjectId: PROJECT_ID,
    titleCardId: TITLE_CARD_ID,
    idFactory,
    now: () => NOW,
  };
  const lineage = project?.lifecycle_status === 'active'
    ? await seedAdmittedRoutePlanningLineage(seedOptions)
    : fabricatedRouteLineage();
  const orchestrator = new StubValidationCyclePlanningAgentOrchestrator(lineage, outcomes);
  const service = new PaperImplementationValidationCyclePlanningRuntimeService({
    projectRepository,
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now: () => NOW,
  });
  const seedBlockedRouteFinal = () => seedBlockedRouteArchitectureFinalArtifact(seedOptions);
  return { service, repository, orchestrator, lineage, seedBlockedRouteFinal };
}

function fabricatedRouteLineage(): PaperImplementationSeededRouteLineage {
  return {
    routeProposalRef: ref('route_architecture_runtime_artifact', 'route_architecture_final_001'),
    routeProposalHash: hash('route-architecture-final'),
    routeSkepticRef: ref('route_skeptic_review_runtime_artifact', 'route_skeptic_final_001'),
    routeSkepticHash: hash('route-skeptic-final'),
  };
}

function validationCyclePlanningRoleOutputs(
  lineage: PaperImplementationSeededRouteLineage,
): RunPaperImplementationValidationCyclePlanningRuntimeRequest['mocked_role_outputs'] {
  return {
    [PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID]: validationCyclePlanningRoleOutput(lineage),
  };
}

function providerRequest(
  lineage: PaperImplementationSeededRouteLineage,
): RunPaperImplementationValidationCyclePlanningRuntimeRequest {
  return {
    run_id: 'validation_cycle_planning_runtime_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID}.openai-balanced`,
    target_ref: ref('technical_route_candidate', 'technical_route_candidate_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: [
      lineage.routeProposalRef,
      lineage.routeSkepticRef,
      ref('trace_manifest', 'trace_manifest_001'),
    ],
    source_hashes: [lineage.routeProposalHash, lineage.routeSkepticHash, hash('trace')],
    admitted_route_proposal_artifact_ref: lineage.routeProposalRef,
    admitted_route_proposal_artifact_hash: lineage.routeProposalHash,
    admitted_route_skeptic_artifact_ref: lineage.routeSkepticRef,
    admitted_route_skeptic_artifact_hash: lineage.routeSkepticHash,
    reviewed_candidate_keys: ['exploratory_route_candidate'],
    secondary_route_candidate_refs: [
      ref('technical_route_candidate', 'technical_route_candidate_secondary_001'),
    ],
    preflight_blocker_codes: [],
  };
}

function validationCycleCandidateProposal(
  candidateKey: string,
  confirmatoryMarker: boolean,
): PaperImplementationValidationCycleCandidateProposal {
  return {
    candidate_key: candidateKey,
    reviewed_route_candidate_key: 'exploratory_route_candidate',
    target_ref: ref('technical_route_candidate', `technical_route_candidate_${candidateKey}`),
    target_frame_summary: `${candidateKey} validates a bounded route signal before deterministic cycle admission.`,
    cycle_type: confirmatoryMarker ? 'baseline_challenge' : 'route_feasibility',
    trigger_refs: [ref('route_risk_finding', `route_risk_finding_${candidateKey}`)],
    validation_question: `Can ${candidateKey} produce a useful validation signal within the budget envelope?`,
    assumptions_under_test: ['Route context is sufficient to validate against the baseline.'],
    assertion_refs_under_test: [ref('motive_assertion', `motive_assertion_${candidateKey}`)],
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
      budget_ref: ref('validation_budget', `validation_budget_${candidateKey}`),
      iteration_budget_ref: ref('iteration_budget', `iteration_budget_${candidateKey}`),
      retry_budget: 1,
      max_runtime: '2h',
      max_compute: 'single-gpu-smoke',
      max_human_review_count: 1,
    },
    included_context_refs: [ref('route_architecture_runtime_artifact', 'route_architecture_final_001')],
    trace_refs: [ref('trace_manifest', `trace_manifest_${candidateKey}`)],
    confirmatory_marker: confirmatoryMarker,
    blocker_codes: [],
    warning_codes: [],
  };
}

function validationCyclePlanningRoleOutput(
  lineage: PaperImplementationSeededRouteLineage,
  overrides: Partial<PaperImplementationValidationCyclePlanningRoleOutput> = {},
): PaperImplementationValidationCyclePlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Validation-cycle planning proposed bounded cycle candidates.',
    cited_source_refs: [lineage.routeProposalRef],
    blocker_codes: [],
    warning_codes: [],
    reviewed_route_proposal_ref: lineage.routeProposalRef,
    reviewed_route_proposal_hash: lineage.routeProposalHash,
    reviewed_route_skeptic_artifact_ref: lineage.routeSkepticRef,
    reviewed_route_skeptic_artifact_hash: lineage.routeSkepticHash,
    reviewed_candidate_keys: ['exploratory_route_candidate'],
    cycle_candidate_proposals: [
      validationCycleCandidateProposal('exploratory_cycle_candidate', false),
      validationCycleCandidateProposal('confirmatory_cycle_candidate', true),
    ],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_validation_cycle_side_effect: true,
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
  const outputHash = input.output ? hash(input.output) : hash(input.errorCode);
  const provenance = {
    workflow_run_id: 'validation_cycle_planning_runtime_run_001',
    node_id: input.nodeId,
    node_attempt_id: `${input.nodeId}.attempt-0`,
    invocation_attempt_id: `${input.nodeId}.call-1`,
    execution_mode: input.executionMode,
    executor_kind: 'single_agent',
    source_kind: input.executionMode === 'provider_llm' ? 'provider_response' : 'mock_fixture',
    non_provider: input.executionMode !== 'provider_llm',
    run_mode: input.executionMode === 'provider_llm' ? 'product' : 'acceptance',
    profile_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
    profile_version: 'v1',
    profile_hash: hash('profile'),
    model_option_id: input.executionMode === 'provider_llm'
      ? `${PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID}.openai-balanced`
      : null,
    normalized_params_hash: input.executionMode === 'provider_llm' ? hash('normalized-params') : null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'PaperImplementationValidationCyclePlanningRoleArtifact@v1',
    prompt_template_id: 'paper-implementation-validation-cycle-planning-cycle-candidates',
    prompt_template_version: 'v1',
    schema_name: 'paper_implementation_validation_cycle_planning_role_output',
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
    workflow_run_id: 'validation_cycle_planning_runtime_run_001',
    node_attempt_id: `${input.nodeId}.attempt-0`,
    status: input.status,
    structured_output: input.output,
    provenance,
    validation: input.status === 'succeeded'
      ? { valid: true, error_count: 0, errors: [] }
      : { valid: false, error_count: 1, errors: [{ keyword: 'required' }] },
    token_budget_gate_result: tokenBudgetGateResult(),
    warning_codes: [],
    blocker_codes: input.blockerCodes,
    error_code: input.errorCode,
    audit_snapshot: {
      schema_version: 'topic-selection-agent-invocation-audit-v1',
      node_id: input.nodeId,
      workflow_run_id: 'validation_cycle_planning_runtime_run_001',
      node_attempt_id: `${input.nodeId}.attempt-0`,
      status: input.status,
      provenance,
      token_budget_gate_result: tokenBudgetGateResult(),
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

function tokenBudgetGateResult() {
  return {
    provider_id: null,
    model_id: null,
    profile_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
    model_option_id: null,
    estimated_input_tokens: 1600,
    estimated_output_tokens: 3000,
    context_window_tokens: 128000,
    schema_overhead_tokens: 1500,
    decision: 'within_budget',
    compression_strategy_ref: ref('compression_strategy', 'paper-implementation-validation-cycle-planning-context-compression'),
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
