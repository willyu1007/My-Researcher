import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  CreateCoreMotiveDraftRequest,
  CreateMotiveEvidenceBoardVersionRequest,
  MotiveEvolutionDecision,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import type {
  ImplementationFeedbackEvent,
  ImplementationIntakeSnapshot,
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  TraceLineageBundle,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationMotiveRepository } from '../repositories/in-memory-paper-implementation-motive-repository.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import { InMemoryPaperImplementationTraceRepository } from '../repositories/in-memory-paper-implementation-trace-repository.js';
import {
  InMemoryPaperImplementationHumanConfirmationRepository,
} from '../repositories/in-memory-paper-implementation-human-confirmation-repository.js';
import type {
  PaperImplementationBootstrapPersistence,
  PaperImplementationBootstrapResult,
  PaperImplementationRepository,
} from '../repositories/paper-implementation.repository.js';
import { seedAcceptedProposalFixture } from './paper-implementation-acceptance-bridge-test-fixtures.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { PaperImplementationTraceKernelService } from './paper-implementation-trace-kernel-service.js';
import { PaperImplementationMotiveEvidenceBoardService } from './paper-implementation-motive-evidence-board-service.js';

const NOW = '2026-05-21T00:00:00.000Z';

const PROJECT: ImplementationProject = {
  implementation_project_id: 'implementation_project_001',
  intake_snapshot_id: 'implementation_intake_snapshot_001',
  workspace_id: 'workspace_001',
  title_card_id: 'title_card_001',
  paper_project_bridge_id: 'paper_project_bridge_001',
  bridge_payload_hash: 'bridge_payload_hash_001',
  target_paper_project_ref: null,
  lifecycle_status: 'active',
  freshness_status: 'fresh',
  source_status: 'active',
  version_number: 1,
  policy_version_id: 'policy_v1',
  created_by: 'system',
  created_at: NOW,
  updated_at: NOW,
};

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: PROJECT.title_card_id,
    version_id: versionId,
  };
}

function makeIdFactory() {
  const counts = new Map<string, number>();
  return (prefix: string) => {
    const next = (counts.get(prefix) ?? 0) + 1;
    counts.set(prefix, next);
    return `${prefix}_${String(next).padStart(3, '0')}`;
  };
}

function emptyLineage(): TraceLineageBundle {
  return {
    literature: {
      literature_evidence_refs: [],
      source_locator_refs: [],
      citation_candidate_refs: [],
    },
    experiment: {
      experiment_plan_refs: [],
      work_order_refs: [],
      run_refs: [],
      run_evidence_refs: [],
      result_packet_refs: [],
      metric_refs: [],
    },
    artifact: {
      dataset_refs: [],
      baseline_refs: [],
      code_version_refs: [],
      model_checkpoint_refs: [],
      config_refs: [],
      log_artifact_refs: [],
    },
    decision: {
      validation_cycle_refs: [],
      motive_evolution_decision_refs: [],
      gate_result_refs: [],
      human_decision_refs: [],
      accepted_risk_refs: [],
    },
    internal_interpretation: {
      result_interpretation_refs: [],
      llm_rationale_refs: [],
      board_summary_refs: [],
      non_citable_refs: [],
    },
  };
}

function literatureLineage(): TraceLineageBundle {
  return {
    ...emptyLineage(),
    literature: {
      literature_evidence_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_001')],
      source_locator_refs: [ref('source_locator', 'source_locator_001')],
      citation_candidate_refs: [],
    },
  };
}

class SingleProjectRepository implements PaperImplementationRepository {
  async createBootstrap(
    _persistence: PaperImplementationBootstrapPersistence,
  ): Promise<PaperImplementationBootstrapResult> {
    throw new Error('createBootstrap is not used by motive tests.');
  }

  async findProjectById(implementationProjectId: string): Promise<ImplementationProject | null> {
    return implementationProjectId === PROJECT.implementation_project_id
      ? structuredClone(PROJECT)
      : null;
  }

  async findProjectByBridgeId(_paperProjectBridgeId: string): Promise<ImplementationProject | null> {
    return null;
  }

  async findIntakeSnapshotById(_intakeSnapshotId: string): Promise<ImplementationIntakeSnapshot | null> {
    return null;
  }

  async findIntakeSnapshotByProjectId(
    _implementationProjectId: string,
  ): Promise<ImplementationIntakeSnapshot | null> {
    return null;
  }

  async createFeedbackEvent(_event: ImplementationFeedbackEvent): Promise<ImplementationFeedbackEvent> {
    throw new Error('createFeedbackEvent is not used by motive tests.');
  }
}

function makeHarness() {
  const projectRepository = new SingleProjectRepository();
  const motiveRepository = new InMemoryPaperImplementationMotiveRepository();
  const traceRepository = new InMemoryPaperImplementationTraceRepository();
  const idFactory = makeIdFactory();
  const traceKernel = new PaperImplementationTraceKernelService({
    projectRepository,
    traceRepository,
    idFactory,
    now: () => NOW,
  });
  const confirmationRepository = new InMemoryPaperImplementationHumanConfirmationRepository();
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository: new InMemoryPaperImplementationRuntimeRepository(),
    now: () => NOW,
  });
  const service = new PaperImplementationMotiveEvidenceBoardService({
    projectRepository,
    motiveRepository,
    traceRepository,
    confirmationRepository,
    runtimeAdmission,
    idFactory,
    now: () => NOW,
  });
  return { service, traceKernel, motiveRepository, confirmationRepository, runtimeAdmission };
}

async function seedConfirmation(
  confirmationRepository: InMemoryPaperImplementationHumanConfirmationRepository,
  confirmationRecordId: string,
  scope: 'motive_portfolio_decision' | 'motive_evolution_decision',
  targetRefs: TopicSelectionFunctionalRef[] = [ref('core_motive', 'core_motive_001', null)],
) {
  await confirmationRepository.createHumanConfirmationRecord({
    confirmation_record_id: confirmationRecordId,
    implementation_project_id: PROJECT.implementation_project_id,
    confirmation_scope: scope,
    target_refs: targetRefs,
    reviewed_sources: [],
    transition_attempt_ref: null,
    gate_result_refs: [],
    rationale: 'Reviewed the structural change before confirming.',
    confirmed_by_actor_type: 'human',
    confirmed_by_actor_id: 'reviewer_001',
    policy_version_id: null,
    status: 'active',
    status_reason: null,
    created_at: NOW,
    updated_at: null,
  });
}

async function assertAppError(
  promise: Promise<unknown>,
  statusCode: number,
  errorCode: string,
) {
  await assert.rejects(
    promise,
    (error) => error instanceof AppError
      && error.statusCode === statusCode
      && error.errorCode === errorCode,
  );
}

function draftRequest(overrides: Partial<CreateCoreMotiveDraftRequest> = {}): CreateCoreMotiveDraftRequest {
  return {
    motive_id: 'core_motive_001',
    core_motive_version_id: 'core_motive_version_001',
    motive_contract: {
      short_name: 'Claim conflation in synthesis',
      motivation_claim: 'Evidence synthesis can conflate adjacent claims.',
      problem_pressure: 'False gap judgments affect paper planning.',
      current_solution_insufficiency: 'Retrieval-only systems do not address synthesis conflation.',
      unmet_or_failure_mechanism: 'Non-equivalent adjacent claims are compressed into one statement.',
      target_setting: 'CS paper evidence synthesis.',
      expected_contribution_path: 'Make claim conflation measurable and reducible.',
      why_this_is_not_trivial: 'The failure appears after retrieval.',
      why_existing_baselines_do_not_already_solve_it: 'Baselines optimize relevance, not claim equivalence.',
      what_makes_this_researchable_now: 'Evidence locator infrastructure exists.',
    },
    scope_contract: {
      included_scope: ['cross-paper synthesis'],
      excluded_scope: ['general web QA'],
      non_goals: ['general RAG reliability'],
    },
    falsification_contract: {
      invalidation_conditions: ['Controlled synthesis preserves all distinct claims.'],
      weakening_conditions: ['Only low-severity conflation remains.'],
      minimum_evidence_to_continue: ['At least one literature or probe signal.'],
      decisive_negative_conditions: ['Retrieval alone fully explains the issue.'],
    },
    claim_boundary: {
      maximum_allowed_claim: 'The method reduces scoped claim conflation.',
      minimum_defensible_contribution_claim: 'The analysis identifies a measurable failure mode.',
      forbidden_overclaims: ['Do not claim broad model reliability.'],
      claim_types_allowed: ['analysis_claim', 'empirical_finding'],
    },
    source_refs: [ref('topic_package', 'topic_package_001', 'v1')],
    assertions: [
      {
        assertion_id: 'motive_assertion_001',
        assertion_type: 'failure_mechanism',
        assertion_text: 'Claim conflation is a synthesis-level failure mechanism.',
        importance: {
          role: 'core',
          must_hold_for_motive_to_continue: true,
        },
        validation_requirements: {
          minimum_support_level: 'weak',
          required_evidence_types: ['literature'],
          required_counter_evidence_check: true,
        },
        falsification: {
          what_would_contradict_this: ['Equivalent claims are always preserved.'],
          what_would_weaken_this: ['Conflation is limited to missing abstracts.'],
        },
        expected_initial_status: 'untested',
      },
    ],
    ...overrides,
  };
}

function boardRequest(): CreateMotiveEvidenceBoardVersionRequest {
  return {
    board_version_id: 'motive_evidence_board_version_001',
    motive_id: 'core_motive_001',
    core_motive_version_id: 'core_motive_version_001',
    trace_manifest_id: 'trace_manifest_002',
    board_summary: {
      current_support_summary: 'Literature provides an initial signal.',
      current_challenge_summary: 'No direct counter-evidence yet.',
      unresolved_conflicts: [],
      board_gap_summary: 'Needs a validation probe.',
      next_evidence_needed: ['Run a controlled synthesis probe.'],
    },
    bindings: [
      {
        binding_id: 'evidence_binding_001',
        assertion_id: 'motive_assertion_001',
        evidence_ref: ref('literature_evidence_unit', 'literature_evidence_unit_001'),
        role: 'support',
        scope: { dataset_scope: 'CS papers' },
        strength: {
          directness: 'moderate',
          reliability: 'medium',
          reproducibility: 'unknown',
          freshness: 'fresh',
        },
        support_state: 'weak',
        challenge_status: 'none',
        interpretation: {
          normalized_statement: 'Prior work reports related synthesis conflation.',
          why_relevant_to_assertion: 'It supports the failure mechanism.',
          limitations: ['Different benchmark setting.'],
        },
        trace_manifest_id: 'trace_manifest_003',
      },
    ],
  };
}

function evolutionDecision(overrides: Partial<MotiveEvolutionDecision> = {}): MotiveEvolutionDecision {
  return {
    motive_evolution_decision_id: 'motive_evolution_decision_untraced',
    implementation_project_id: PROJECT.implementation_project_id,
    source_motive_refs: [ref('core_motive', 'core_motive_001')],
    triggering_validation_cycle_refs: [],
    triggering_result_packet_refs: [],
    triggering_cross_board_review_refs: [],
    triggering_human_request_refs: [],
    evolution_type: 'refine_statement',
    effect_class: 'semantic_evolution',
    decision_summary: 'Refine wording.',
    decision_rationale: 'The scope became narrower.',
    change_set: {},
    proposed_outputs: {},
    evidence_basis: {},
    impact_analysis: {},
    gate: {},
    proposed_by: 'system',
    confirmed_by: null,
    human_confirmation_required: false,
    confirmation_ref: null,
    application_status: 'approved',
    trace_manifest_ref: null,
    trace_manifest_id: null,
    policy_version_id: PROJECT.policy_version_id,
    created_at: NOW,
    ...overrides,
  };
}

test('motive service creates draft, admits complete trace, and creates assertion-centered board', async () => {
  const { service, traceKernel } = makeHarness();
  const draft = await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest());
  assert.equal(draft.core_motive_version.version_status, 'draft');
  assert.equal(draft.motive_set.parked_motive_ids[0], 'core_motive_001');

  const motiveTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
    lineage: literatureLineage(),
  });
  const admitted = await service.admitCoreMotiveVersion(
    PROJECT.implementation_project_id,
    'core_motive_001',
    'core_motive_version_001',
    { trace_manifest_id: motiveTrace.trace_manifest_id },
  );
  assert.equal(admitted.core_motive_version.version_status, 'admitted');
  assert.equal(admitted.motive_identity.portfolio_role.role, 'primary');

  await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('motive_evidence_board_version', 'motive_evidence_board_version_001', 'v1'),
    lineage: literatureLineage(),
  });
  await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('evidence_binding', 'evidence_binding_001', 'v1'),
    lineage: literatureLineage(),
  });
  const board = await service.createMotiveEvidenceBoardVersion(
    PROJECT.implementation_project_id,
    boardRequest(),
  );
  assert.equal(board.board_version.board_state.readiness_status, 'evidence_ready');
  assert.equal(board.evidence_bindings[0]?.assertion_id, 'motive_assertion_001');
});

test('core motive draft with admitted proposal lineage is readable back', async () => {
  const { service, motiveRepository, runtimeAdmission } = makeHarness();
  const proposal = await seedAcceptedProposalFixture({
    admissionService: runtimeAdmission,
    implementationProjectId: PROJECT.implementation_project_id,
    workflowType: 'motive_decomposition',
    runtimeArtifactId: 'runtime_artifact_motive_decomposition_001',
  });

  const draft = await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest({
    source_proposal_artifact_ref: proposal.sourceProposalArtifactRef,
    source_proposal_artifact_hash: proposal.sourceProposalArtifactHash,
  }));
  assert.deepEqual(draft.core_motive_version.source_proposal_artifact_ref, proposal.sourceProposalArtifactRef);
  assert.equal(draft.core_motive_version.source_proposal_artifact_hash, proposal.sourceProposalArtifactHash);

  const readBack = await motiveRepository.findCoreMotiveVersionById(
    PROJECT.implementation_project_id,
    'core_motive_version_001',
  );
  assert.deepEqual(readBack?.source_proposal_artifact_ref, proposal.sourceProposalArtifactRef);
  assert.equal(readBack?.source_proposal_artifact_hash, proposal.sourceProposalArtifactHash);
});

test('core motive draft lineage drift is rejected before authority writes', async () => {
  const { service, motiveRepository, runtimeAdmission } = makeHarness();
  const proposal = await seedAcceptedProposalFixture({
    admissionService: runtimeAdmission,
    implementationProjectId: PROJECT.implementation_project_id,
    workflowType: 'motive_decomposition',
    runtimeArtifactId: 'runtime_artifact_motive_decomposition_001',
  });
  await assertAppError(
    service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest({
      source_proposal_artifact_ref: proposal.sourceProposalArtifactRef,
      source_proposal_artifact_hash: 'a'.repeat(64),
    })),
    409,
    'GATE_CONSTRAINT_FAILED',
  );

  const blockedProposal = await seedAcceptedProposalFixture({
    admissionService: runtimeAdmission,
    implementationProjectId: PROJECT.implementation_project_id,
    workflowType: 'motive_decomposition',
    runtimeArtifactId: 'runtime_artifact_motive_decomposition_blocked_001',
    runtimeStatus: 'blocked',
  });
  await assertAppError(
    service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest({
      source_proposal_artifact_ref: blockedProposal.sourceProposalArtifactRef,
      source_proposal_artifact_hash: blockedProposal.sourceProposalArtifactHash,
    })),
    409,
    'GATE_CONSTRAINT_FAILED',
  );

  assert.equal(
    await motiveRepository.findCoreMotiveVersionById(
      PROJECT.implementation_project_id,
      'core_motive_version_001',
    ),
    null,
  );
});

test('motive admission blocks missing source refs and broken trace', async () => {
  const { service, traceKernel } = makeHarness();
  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest({
    source_refs: [],
    hypothesis_only: false,
  }));
  const completeTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
    lineage: literatureLineage(),
  });
  await assertAppError(
    service.admitCoreMotiveVersion(
      PROJECT.implementation_project_id,
      'core_motive_001',
      'core_motive_version_001',
      { trace_manifest_id: completeTrace.trace_manifest_id },
    ),
    409,
    'GATE_CONSTRAINT_FAILED',
  );

  const { service: secondService, traceKernel: secondTraceKernel } = makeHarness();
  await secondService.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest());
  const brokenTrace = await secondTraceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
    lineage: emptyLineage(),
  });
  assert.equal(brokenTrace.trace_status, 'broken');
  await assertAppError(
    secondService.admitCoreMotiveVersion(
      PROJECT.implementation_project_id,
      'core_motive_001',
      'core_motive_version_001',
      { trace_manifest_id: brokenTrace.trace_manifest_id },
    ),
    409,
    'GATE_CONSTRAINT_FAILED',
  );
});

test('semantic vNext requires approved motive evolution decision', async () => {
  const { service, traceKernel } = makeHarness();
  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest());
  const motiveTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
    lineage: literatureLineage(),
  });
  await service.admitCoreMotiveVersion(
    PROJECT.implementation_project_id,
    'core_motive_001',
    'core_motive_version_001',
    { trace_manifest_id: motiveTrace.trace_manifest_id },
  );

  await assertAppError(
    service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest({
      core_motive_version_id: 'core_motive_version_002',
      version_origin: {
        previous_version_id: 'core_motive_version_001',
        derivation_type: 'refine',
      },
    })),
    409,
    'GATE_CONSTRAINT_FAILED',
  );
});

test('approved evolution decisions require trace before creation and semantic reuse', async () => {
  const { service, traceKernel, motiveRepository } = makeHarness();
  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest());
  const motiveTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
    lineage: literatureLineage(),
  });
  await service.admitCoreMotiveVersion(
    PROJECT.implementation_project_id,
    'core_motive_001',
    'core_motive_version_001',
    { trace_manifest_id: motiveTrace.trace_manifest_id },
  );

  await assertAppError(
    service.createMotiveEvolutionDecision(PROJECT.implementation_project_id, {
      source_motive_refs: [ref('core_motive', 'core_motive_001')],
      evolution_type: 'refine_statement',
      effect_class: 'semantic_evolution',
      decision_summary: 'Refine wording.',
      decision_rationale: 'The scope became narrower.',
      change_set: {},
    }),
    409,
    'GATE_CONSTRAINT_FAILED',
  );

  const proposed = await service.createMotiveEvolutionDecision(PROJECT.implementation_project_id, {
    motive_evolution_decision_id: 'motive_evolution_decision_proposed',
    source_motive_refs: [ref('core_motive', 'core_motive_001')],
    evolution_type: 'refine_statement',
    effect_class: 'semantic_evolution',
    decision_summary: 'Refine wording.',
    decision_rationale: 'The scope became narrower.',
    change_set: {},
    application_status: 'proposed',
  });
  assert.equal(proposed.trace_manifest_id, null);

  await motiveRepository.createMotiveEvolutionDecision(evolutionDecision());
  await assertAppError(
    service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest({
      core_motive_version_id: 'core_motive_version_002',
      evolution_decision_id: 'motive_evolution_decision_untraced',
      version_origin: {
        previous_version_id: 'core_motive_version_001',
        created_by_decision_id: 'motive_evolution_decision_untraced',
        derivation_type: 'refine',
      },
    })),
    409,
    'GATE_CONSTRAINT_FAILED',
  );
});

test('portfolio mutations require confirmation and cross-board review does not mutate motive roles', async () => {
  const { service, traceKernel } = makeHarness();
  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest());
  const motiveTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
    lineage: literatureLineage(),
  });
  await service.admitCoreMotiveVersion(
    PROJECT.implementation_project_id,
    'core_motive_001',
    'core_motive_version_001',
    { trace_manifest_id: motiveTrace.trace_manifest_id },
  );
  const beforeReview = await service.getCoreMotive(PROJECT.implementation_project_id, 'core_motive_001');
  await service.createCrossBoardReview(PROJECT.implementation_project_id, {
    motive_refs: [ref('core_motive', 'core_motive_001')],
    portfolio_update_recommendations: ['Consider a secondary route.'],
  });
  const afterReview = await service.getCoreMotive(PROJECT.implementation_project_id, 'core_motive_001');
  assert.equal(afterReview.portfolio_role.role, beforeReview.portfolio_role.role);

  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest({
    motive_id: 'core_motive_002',
    core_motive_version_id: 'core_motive_version_002',
    assertions: [
      {
        ...draftRequest().assertions[0],
        assertion_id: 'motive_assertion_002',
      },
    ],
  }));
  const secondTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_002', 'v1'),
    lineage: literatureLineage(),
  });
  await assertAppError(
    service.admitCoreMotiveVersion(
      PROJECT.implementation_project_id,
      'core_motive_002',
      'core_motive_version_002',
      {
        trace_manifest_id: secondTrace.trace_manifest_id,
        portfolio_role: 'primary',
      },
    ),
    409,
    'GATE_CONSTRAINT_FAILED',
  );
});

test('draft creation cannot mutate active portfolio before admission', async () => {
  const { service } = makeHarness();
  await assertAppError(
    service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest({
      portfolio_role: 'primary',
    })),
    409,
    'GATE_CONSTRAINT_FAILED',
  );
});

test('human-confirmed primary replacement demotes previous primary and keeps identity/set aligned', async () => {
  const { service, traceKernel, confirmationRepository } = makeHarness();
  await seedConfirmation(
    confirmationRepository,
    'pi_human_confirmation_primary_001',
    'motive_portfolio_decision',
    [ref('core_motive', 'core_motive_002', null)],
  );
  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest());
  const firstTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
    lineage: literatureLineage(),
  });
  await service.admitCoreMotiveVersion(
    PROJECT.implementation_project_id,
    'core_motive_001',
    'core_motive_version_001',
    { trace_manifest_id: firstTrace.trace_manifest_id },
  );

  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest({
    motive_id: 'core_motive_002',
    core_motive_version_id: 'core_motive_version_002',
    assertions: [
      {
        ...draftRequest().assertions[0],
        assertion_id: 'motive_assertion_002',
      },
    ],
  }));
  const secondTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_002', 'v1'),
    lineage: literatureLineage(),
  });
  const admitted = await service.admitCoreMotiveVersion(
    PROJECT.implementation_project_id,
    'core_motive_002',
    'core_motive_version_002',
    {
      trace_manifest_id: secondTrace.trace_manifest_id,
      portfolio_role: 'primary',
      confirmation_level: 'human_confirmed',
      confirmed_by: 'human',
      confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_primary_001', null),
    },
  );

  assert.deepEqual(admitted.motive_set.primary_motive_ids, ['core_motive_002']);
  assert.deepEqual(admitted.motive_set.secondary_motive_ids, ['core_motive_001']);
  assert.deepEqual(admitted.portfolio_decision.changes.demoted_from_primary, ['core_motive_001']);
  assert.equal(
    (await service.getCoreMotive(PROJECT.implementation_project_id, 'core_motive_001')).portfolio_role.role,
    'secondary',
  );
  assert.equal(
    (await service.getCoreMotive(PROJECT.implementation_project_id, 'core_motive_002')).portfolio_role.role,
    'primary',
  );
  const consumedRecord = await confirmationRepository.findHumanConfirmationRecordById(
    PROJECT.implementation_project_id,
    'pi_human_confirmation_primary_001',
  );
  assert.equal(consumedRecord?.consumed_at, NOW);
  assert.equal(consumedRecord?.consumed_by_ref?.ref_type, 'core_motive_version');
  assert.equal(consumedRecord?.consumed_by_ref?.ref_id, 'core_motive_version_002');
});

test('portfolio decision must cover existing motives and normalized memo-like evidence refs are blocked', async () => {
  const { service, traceKernel } = makeHarness();
  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest());
  const firstTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
    lineage: literatureLineage(),
  });
  await service.admitCoreMotiveVersion(
    PROJECT.implementation_project_id,
    'core_motive_001',
    'core_motive_version_001',
    { trace_manifest_id: firstTrace.trace_manifest_id },
  );
  await assertAppError(
    service.applyMotivePortfolioDecision(PROJECT.implementation_project_id, {
      motive_roles_after_decision: {
        primary_motive_ids: [],
        secondary_motive_ids: [],
        fallback_motive_ids: [],
        supporting_motive_ids: [],
        parked_motive_ids: [],
        abandoned_motive_ids: [],
      },
      changes: {
        promoted_to_primary: [],
        demoted_from_primary: ['core_motive_001'],
        merged_motives: [],
        split_motives: [],
        newly_parked: [],
        newly_abandoned: [],
      },
      rationale: { missing: 'Omitted by mistake.' },
      confirmation_level: 'human_confirmed',
      confirmed_by: 'human',
    }),
    409,
    'GATE_CONSTRAINT_FAILED',
  );

  await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('motive_evidence_board_version', 'motive_evidence_board_version_001', 'v1'),
    lineage: literatureLineage(),
  });
  await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('evidence_binding', 'evidence_binding_001', 'v1'),
    lineage: literatureLineage(),
  });
  await assertAppError(
    service.createMotiveEvidenceBoardVersion(PROJECT.implementation_project_id, {
      ...boardRequest(),
      bindings: [
        {
          ...boardRequest().bindings[0],
          evidence_ref: ref('board-summary', 'board_summary_001'),
        },
      ],
    }),
    409,
    'GATE_CONSTRAINT_FAILED',
  );
  await assertAppError(
    service.createMotiveEvidenceBoardVersion(PROJECT.implementation_project_id, {
      ...boardRequest(),
      bindings: [
        {
          ...boardRequest().bindings[0],
          evidence_ref: ref('evidence_binding', 'evidence_binding_001'),
        },
      ],
    }),
    409,
    'GATE_CONSTRAINT_FAILED',
  );
});

test('evolution decision trace uses explicit decision id instead of trace id as target', async () => {
  const { service, traceKernel } = makeHarness();
  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest());
  const decisionTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('motive_evolution_decision', 'motive_evolution_decision_001', 'v1'),
    lineage: {
      ...emptyLineage(),
      decision: {
        ...emptyLineage().decision,
        human_decision_refs: [ref('human_decision', 'human_decision_001')],
      },
    },
  });
  const decision = await service.createMotiveEvolutionDecision(PROJECT.implementation_project_id, {
    motive_evolution_decision_id: 'motive_evolution_decision_001',
    source_motive_refs: [ref('core_motive', 'core_motive_001')],
    evolution_type: 'refine_statement',
    effect_class: 'semantic_evolution',
    decision_summary: 'Refine wording.',
    decision_rationale: 'The scope became narrower.',
    change_set: {},
    trace_manifest_id: decisionTrace.trace_manifest_id,
  });
  assert.equal(decision.trace_manifest_id, decisionTrace.trace_manifest_id);
  assert.equal(decision.trace_manifest_ref?.ref_id, decisionTrace.trace_manifest_id);
});

test('evidence transfer binding is explicit trace-gated authority for cross-board reuse', async () => {
  const { service, traceKernel } = makeHarness();
  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest());
  const firstTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
    lineage: literatureLineage(),
  });
  await service.admitCoreMotiveVersion(
    PROJECT.implementation_project_id,
    'core_motive_001',
    'core_motive_version_001',
    { trace_manifest_id: firstTrace.trace_manifest_id },
  );
  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest({
    motive_id: 'core_motive_002',
    core_motive_version_id: 'core_motive_version_002',
    assertions: [
      {
        ...draftRequest().assertions[0],
        assertion_id: 'motive_assertion_002',
      },
    ],
  }));
  const secondTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_002', 'v1'),
    lineage: literatureLineage(),
  });
  await service.admitCoreMotiveVersion(
    PROJECT.implementation_project_id,
    'core_motive_002',
    'core_motive_version_002',
    { trace_manifest_id: secondTrace.trace_manifest_id },
  );

  const firstBoardTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('motive_evidence_board_version', 'motive_evidence_board_version_001', 'v1'),
    lineage: literatureLineage(),
  });
  const firstBindingTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('evidence_binding', 'evidence_binding_001', 'v1'),
    lineage: literatureLineage(),
  });
  await service.createMotiveEvidenceBoardVersion(PROJECT.implementation_project_id, {
    ...boardRequest(),
    trace_manifest_id: firstBoardTrace.trace_manifest_id,
    bindings: [
      {
        ...boardRequest().bindings[0],
        trace_manifest_id: firstBindingTrace.trace_manifest_id,
      },
    ],
  });

  const secondBoardTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('motive_evidence_board_version', 'motive_evidence_board_version_002', 'v1'),
    lineage: literatureLineage(),
  });
  const secondBindingTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('evidence_binding', 'evidence_binding_002', 'v1'),
    lineage: literatureLineage(),
  });
  await service.createMotiveEvidenceBoardVersion(PROJECT.implementation_project_id, {
    ...boardRequest(),
    board_version_id: 'motive_evidence_board_version_002',
    motive_id: 'core_motive_002',
    core_motive_version_id: 'core_motive_version_002',
    trace_manifest_id: secondBoardTrace.trace_manifest_id,
    bindings: [
      {
        ...boardRequest().bindings[0],
        binding_id: 'evidence_binding_002',
        assertion_id: 'motive_assertion_002',
        trace_manifest_id: secondBindingTrace.trace_manifest_id,
      },
    ],
  });

  const transferTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('evidence_transfer_binding', 'evidence_transfer_binding_001', 'v1'),
    lineage: literatureLineage(),
  });
  const transfer = await service.createEvidenceTransferBinding(PROJECT.implementation_project_id, {
    transfer_id: 'evidence_transfer_binding_001',
    source: {
      board_version_id: 'motive_evidence_board_version_001',
      assertion_id: 'motive_assertion_001',
      evidence_binding_id: 'evidence_binding_001',
    },
    target: {
      board_version_id: 'motive_evidence_board_version_002',
      assertion_id: 'motive_assertion_002',
    },
    transfer_role: 'transfer_support',
    transfer_validity: 'valid',
    scope_match: {
      dataset_scope_match: 'exact',
      method_scope_match: 'partial',
      metric_scope_match: 'exact',
      setting_scope_match: 'partial',
    },
    rationale: 'The evidence transfers under the narrowed scope.',
    reviewed_by: 'human',
    trace_manifest_id: transferTrace.trace_manifest_id,
  });
  assert.equal(transfer.transfer_id, 'evidence_transfer_binding_001');
  assert.equal(transfer.trace_manifest_id, transferTrace.trace_manifest_id);
  assert.equal((await service.listEvidenceTransferBindings(PROJECT.implementation_project_id)).length, 1);

  const invalidTransferTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('evidence_transfer_binding', 'evidence_transfer_binding_002', 'v1'),
    lineage: literatureLineage(),
  });
  await assertAppError(
    service.createEvidenceTransferBinding(PROJECT.implementation_project_id, {
      ...transfer,
      transfer_id: 'evidence_transfer_binding_002',
      transfer_validity: 'valid',
      scope_match: {
        ...transfer.scope_match,
        dataset_scope_match: 'mismatch',
      },
      trace_manifest_id: invalidTransferTrace.trace_manifest_id,
    }),
    409,
    'GATE_CONSTRAINT_FAILED',
  );
});

test('primary replacement and human-required evolution require resolvable confirmation records', async () => {
  const { service, traceKernel, confirmationRepository } = makeHarness();
  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest());
  const firstTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
    lineage: literatureLineage(),
  });
  await service.admitCoreMotiveVersion(
    PROJECT.implementation_project_id,
    'core_motive_001',
    'core_motive_version_001',
    { trace_manifest_id: firstTrace.trace_manifest_id },
  );
  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest({
    motive_id: 'core_motive_002',
    core_motive_version_id: 'core_motive_version_002',
    assertions: [
      {
        ...draftRequest().assertions[0],
        assertion_id: 'motive_assertion_002',
      },
    ],
  }));
  const secondTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_002', 'v1'),
    lineage: literatureLineage(),
  });

  await assertAppError(
    service.admitCoreMotiveVersion(
      PROJECT.implementation_project_id,
      'core_motive_002',
      'core_motive_version_002',
      {
        trace_manifest_id: secondTrace.trace_manifest_id,
        portfolio_role: 'primary',
        confirmation_level: 'human_confirmed',
        confirmed_by: 'human',
        confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_fabricated', null),
      },
    ),
    409,
    'GATE_CONSTRAINT_FAILED',
  );

  await seedConfirmation(confirmationRepository, 'pi_human_confirmation_wrong_scope_001', 'motive_evolution_decision');
  await assertAppError(
    service.admitCoreMotiveVersion(
      PROJECT.implementation_project_id,
      'core_motive_002',
      'core_motive_version_002',
      {
        trace_manifest_id: secondTrace.trace_manifest_id,
        portfolio_role: 'primary',
        confirmation_level: 'human_confirmed',
        confirmed_by: 'human',
        confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_wrong_scope_001', null),
      },
    ),
    409,
    'GATE_CONSTRAINT_FAILED',
  );

  await assertAppError(
    service.createMotiveEvolutionDecision(PROJECT.implementation_project_id, {
      source_motive_refs: [ref('core_motive', 'core_motive_001', null)],
      evolution_type: 'refine_statement',
      effect_class: 'structural_evolution',
      decision_summary: 'Merge motives after board review.',
      decision_rationale: 'Evidence overlap requires a merged framing.',
      change_set: {},
      human_confirmation_required: true,
      confirmed_by: 'human',
      application_status: 'proposed',
    }),
    409,
    'GATE_CONSTRAINT_FAILED',
  );

  await seedConfirmation(confirmationRepository, 'pi_human_confirmation_evolution_001', 'motive_evolution_decision');
  const decision = await service.createMotiveEvolutionDecision(PROJECT.implementation_project_id, {
    source_motive_refs: [ref('core_motive', 'core_motive_001', null)],
    evolution_type: 'refine_statement',
    effect_class: 'structural_evolution',
    decision_summary: 'Merge motives after board review.',
    decision_rationale: 'Evidence overlap requires a merged framing.',
    change_set: {},
    human_confirmation_required: true,
    confirmed_by: 'human',
    confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_evolution_001', null),
    application_status: 'proposed',
  });
  assert.equal(decision.human_confirmation_required, true);
});

test('primary-set change without confirmation ref and control-flagged structural evolution are rejected', async () => {
  const { service, traceKernel, confirmationRepository } = makeHarness();
  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest());
  const firstTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
    lineage: literatureLineage(),
  });
  await service.admitCoreMotiveVersion(
    PROJECT.implementation_project_id,
    'core_motive_001',
    'core_motive_version_001',
    { trace_manifest_id: firstTrace.trace_manifest_id },
  );
  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest({
    motive_id: 'core_motive_002',
    core_motive_version_id: 'core_motive_version_002',
    assertions: [
      {
        ...draftRequest().assertions[0],
        assertion_id: 'motive_assertion_002',
      },
    ],
  }));
  const secondTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_002', 'v1'),
    lineage: literatureLineage(),
  });

  await assertAppError(
    service.admitCoreMotiveVersion(
      PROJECT.implementation_project_id,
      'core_motive_002',
      'core_motive_version_002',
      {
        trace_manifest_id: secondTrace.trace_manifest_id,
        portfolio_role: 'primary',
        confirmation_level: 'human_confirmed',
        confirmed_by: 'human',
      },
    ),
    409,
    'GATE_CONSTRAINT_FAILED',
  );

  await assertAppError(
    service.createMotiveEvolutionDecision(PROJECT.implementation_project_id, {
      source_motive_refs: [ref('core_motive', 'core_motive_001', null)],
      evolution_type: 'refine_statement',
      effect_class: 'structural_evolution',
      decision_summary: 'Structural change without volunteering the confirmation flag.',
      decision_rationale: 'Control flag on the motive must force confirmation.',
      change_set: {},
      application_status: 'proposed',
    }),
    409,
    'GATE_CONSTRAINT_FAILED',
  );

  await seedConfirmation(confirmationRepository, 'pi_human_confirmation_control_001', 'motive_evolution_decision');
  const decision = await service.createMotiveEvolutionDecision(PROJECT.implementation_project_id, {
    source_motive_refs: [ref('core_motive', 'core_motive_001', null)],
    evolution_type: 'refine_statement',
    effect_class: 'structural_evolution',
    decision_summary: 'Structural change with resolvable confirmation.',
    decision_rationale: 'Control flag satisfied through a real record.',
    change_set: {},
    confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_control_001', null),
    application_status: 'proposed',
  });
  assert.equal(decision.human_confirmation_required, true);
});

test('motive gates bind confirmations to their targets and consume them once', async () => {
  const { service, traceKernel, confirmationRepository } = makeHarness();
  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest());
  const firstTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
    lineage: literatureLineage(),
  });
  await service.admitCoreMotiveVersion(
    PROJECT.implementation_project_id,
    'core_motive_001',
    'core_motive_version_001',
    { trace_manifest_id: firstTrace.trace_manifest_id },
  );
  await service.createCoreMotiveDraft(PROJECT.implementation_project_id, draftRequest({
    motive_id: 'core_motive_002',
    core_motive_version_id: 'core_motive_version_002',
    assertions: [
      {
        ...draftRequest().assertions[0],
        assertion_id: 'motive_assertion_002',
      },
    ],
  }));
  const secondTrace = await traceKernel.createTraceManifest(PROJECT.implementation_project_id, {
    target_ref: ref('core_motive_version', 'core_motive_version_002', 'v1'),
    lineage: literatureLineage(),
  });

  // Admission gate: a record whose targets do not cover the promoted motive is rejected.
  await seedConfirmation(
    confirmationRepository,
    'pi_human_confirmation_wrong_target_001',
    'motive_portfolio_decision',
    [ref('core_motive', 'core_motive_001', null)],
  );
  await assert.rejects(
    service.admitCoreMotiveVersion(
      PROJECT.implementation_project_id,
      'core_motive_002',
      'core_motive_version_002',
      {
        trace_manifest_id: secondTrace.trace_manifest_id,
        portfolio_role: 'primary',
        confirmation_level: 'human_confirmed',
        confirmed_by: 'human',
        confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_wrong_target_001', null),
      },
    ),
    (error) => error instanceof AppError
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && error.message.includes('target_refs must cover the authorized object'),
  );

  // Admission gate consumes a covering record exactly once.
  await seedConfirmation(
    confirmationRepository,
    'pi_human_confirmation_admit_002',
    'motive_portfolio_decision',
    [ref('core_motive', 'core_motive_002', null)],
  );
  await service.admitCoreMotiveVersion(
    PROJECT.implementation_project_id,
    'core_motive_002',
    'core_motive_version_002',
    {
      trace_manifest_id: secondTrace.trace_manifest_id,
      portfolio_role: 'primary',
      confirmation_level: 'human_confirmed',
      confirmed_by: 'human',
      confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_admit_002', null),
    },
  );
  const admitConsumed = await confirmationRepository.findHumanConfirmationRecordById(
    PROJECT.implementation_project_id,
    'pi_human_confirmation_admit_002',
  );
  assert.equal(admitConsumed?.consumed_at, NOW);
  assert.equal(admitConsumed?.consumed_by_ref?.ref_id, 'core_motive_version_002');

  // Re-admitting the same version replays into the non-draft branch before any
  // consumption check: it fails as VERSION_CONFLICT, not as a consumed-record 409.
  await assert.rejects(
    service.admitCoreMotiveVersion(
      PROJECT.implementation_project_id,
      'core_motive_002',
      'core_motive_version_002',
      {
        trace_manifest_id: secondTrace.trace_manifest_id,
        portfolio_role: 'primary',
        confirmation_level: 'human_confirmed',
        confirmed_by: 'human',
        confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_admit_002', null),
      },
    ),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );

  // The consumed record cannot authorize a later portfolio decision.
  const swapPrimaryRequest = {
    motive_roles_after_decision: {
      primary_motive_ids: ['core_motive_001'],
      secondary_motive_ids: ['core_motive_002'],
      fallback_motive_ids: [],
      supporting_motive_ids: [],
      parked_motive_ids: [],
      abandoned_motive_ids: [],
    },
    changes: {
      promoted_to_primary: ['core_motive_001'],
      demoted_from_primary: ['core_motive_002'],
      merged_motives: [],
      split_motives: [],
      newly_parked: [],
      newly_abandoned: [],
    },
    rationale: { swap: 'Primary swap after board review.' },
    confirmation_level: 'human_confirmed' as const,
    confirmed_by: 'human' as const,
  };
  await assert.rejects(
    service.applyMotivePortfolioDecision(PROJECT.implementation_project_id, {
      ...swapPrimaryRequest,
      confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_admit_002', null),
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && error.message.includes('already been consumed'),
  );

  // Portfolio gate: the record must cover every structurally changed motive.
  await seedConfirmation(
    confirmationRepository,
    'pi_human_confirmation_portfolio_partial_001',
    'motive_portfolio_decision',
    [ref('core_motive', 'core_motive_001', null)],
  );
  await assert.rejects(
    service.applyMotivePortfolioDecision(PROJECT.implementation_project_id, {
      ...swapPrimaryRequest,
      confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_portfolio_partial_001', null),
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && error.message.includes('target_refs must cover the authorized object'),
  );
  await seedConfirmation(
    confirmationRepository,
    'pi_human_confirmation_portfolio_001',
    'motive_portfolio_decision',
    [ref('core_motive', 'core_motive_001', null), ref('core_motive', 'core_motive_002', null)],
  );
  const portfolioDecision = await service.applyMotivePortfolioDecision(PROJECT.implementation_project_id, {
    ...swapPrimaryRequest,
    confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_portfolio_001', null),
  });
  const portfolioConsumed = await confirmationRepository.findHumanConfirmationRecordById(
    PROJECT.implementation_project_id,
    'pi_human_confirmation_portfolio_001',
  );
  assert.equal(portfolioConsumed?.consumed_at, NOW);
  assert.equal(portfolioConsumed?.consumed_by_ref?.ref_type, 'motive_portfolio_decision');
  assert.equal(portfolioConsumed?.consumed_by_ref?.ref_id, portfolioDecision.portfolio_decision_id);

  // Evolution gate: record is bound to the source motives and single-use.
  await seedConfirmation(
    confirmationRepository,
    'pi_human_confirmation_evolution_target_001',
    'motive_evolution_decision',
    [ref('core_motive', 'core_motive_002', null)],
  );
  const evolutionRequest = {
    source_motive_refs: [ref('core_motive', 'core_motive_001', null)],
    evolution_type: 'refine_statement' as const,
    effect_class: 'structural_evolution' as const,
    decision_summary: 'Structural refinement of the primary motive.',
    decision_rationale: 'Evidence overlap requires refinement.',
    change_set: {},
    human_confirmation_required: true,
    confirmed_by: 'human' as const,
    application_status: 'proposed' as const,
  };
  await assert.rejects(
    service.createMotiveEvolutionDecision(PROJECT.implementation_project_id, {
      ...evolutionRequest,
      confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_evolution_target_001', null),
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && error.message.includes('target_refs must cover the authorized object'),
  );
  await seedConfirmation(
    confirmationRepository,
    'pi_human_confirmation_evolution_002',
    'motive_evolution_decision',
    [ref('core_motive', 'core_motive_001', null)],
  );
  const evolutionDecision = await service.createMotiveEvolutionDecision(PROJECT.implementation_project_id, {
    ...evolutionRequest,
    confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_evolution_002', null),
  });
  const evolutionConsumed = await confirmationRepository.findHumanConfirmationRecordById(
    PROJECT.implementation_project_id,
    'pi_human_confirmation_evolution_002',
  );
  assert.equal(evolutionConsumed?.consumed_at, NOW);
  assert.equal(evolutionConsumed?.consumed_by_ref?.ref_type, 'motive_evolution_decision');
  assert.equal(evolutionConsumed?.consumed_by_ref?.ref_id, evolutionDecision.motive_evolution_decision_id);
  await assert.rejects(
    service.createMotiveEvolutionDecision(PROJECT.implementation_project_id, {
      ...evolutionRequest,
      confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_evolution_002', null),
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && error.message.includes('already been consumed'),
  );
});
