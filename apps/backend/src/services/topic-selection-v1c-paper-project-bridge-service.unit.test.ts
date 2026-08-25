import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { Prisma } from '@prisma/client';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionChainTransitionAttemptRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionInputSnapshotRecord,
  TopicSelectionLlmWorkflowRunRecord,
  TopicSelectionReadinessGateResultRecord,
  TopicSelectionTraceSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionPromotionBridgeHandoff,
  TopicSelectionPromotionCondition,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import type {
  TopicSelectionPaperProjectBridgeRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';
import type {
  CreatePaperProjectRequest,
  CreatePaperProjectResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-project-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionV1cPaperProjectBridgeRepository } from '../repositories/in-memory-topic-selection-v1c-paper-project-bridge-repository.js';
import { PrismaTopicSelectionV1cPaperProjectBridgeRepository } from '../repositories/prisma/prisma-topic-selection-v1c-paper-project-bridge-repository.js';
import type {
  TopicSelectionV1cPaperProjectBridgePersistence,
} from '../repositories/topic-selection-v1c-paper-project-bridge.repository.js';
import {
  TopicSelectionV1cPaperProjectBridgeAttachmentConflictError,
  TopicSelectionV1cPaperProjectBridgeHashConflictError,
} from '../repositories/topic-selection-v1c-paper-project-bridge.repository.js';
import {
  TopicSelectionV1cPaperProjectBridgeService,
} from './topic-selection-v1c-paper-project-bridge-service.js';
import { createAdvancingTopicSelectionCheckpointControlFixture } from './test-fixtures/topic-selection-v1c-checkpoint-control.fixture.js';

const NOW = '2026-05-15T00:00:00.000Z';

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
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

function makeCondition(): TopicSelectionPromotionCondition {
  const action = {
    action_code: 'clarify_contribution_claim',
    severity: 'warning' as const,
    loopback_target: 'package' as const,
    refs: [ref('topic_package', 'topic_package_001')],
    reason: 'Clarify contribution claim before outline lock.',
  };
  return {
    condition_id: 'promotion_condition_001',
    condition_code: 'clarify_contribution_claim',
    owner: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    required_action: action,
    refs: action.refs,
    early_check_obligations: ['Re-check contribution claim before outline lock.'],
    verification_note: 'Condition is reviewer-visible.',
  };
}

function makeSourceHandoff(
  overrides: Partial<TopicSelectionPromotionBridgeHandoff> = {},
): TopicSelectionPromotionBridgeHandoff {
  const decisionRef = ref('promotion_decision', 'promotion_decision_001', 'promotion_input_snapshot_hash_001');
  const humanRef = ref('human_promotion_decision', 'human_promotion_decision_001', 'promotion_input_snapshot_hash_001');
  const humanConfirmedRef = ref('human_confirmed_decision', 'human_confirmed_decision_001');
  const commitmentRef = ref('promotion_commitment_profile', 'promotion_commitment_profile_001', 'promotion_input_snapshot_hash_001');
  const gateRef = ref('promotion_gate_check', 'promotion_gate_check_001');
  const inputRef = ref('promotion_input_snapshot', 'promotion_input_snapshot_001', 'promotion_input_snapshot_hash_001');
  const evidenceRef = ref('evidence_unit', 'evidence_unit_001');
  const acceptedRiskRef = ref('accepted_risk', 'accepted_risk_001');
  const condition = makeCondition();
  const snapshotHashes = {
    bundle_hash: 'bundle_hash_001',
    package_snapshot_hash: 'package_snapshot_hash_001',
    package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
  };
  const humanDecision = {
    human_promotion_decision_id: 'human_promotion_decision_001',
    human_confirmed_decision_id: 'human_confirmed_decision_001',
    human_promotion_decision_key: 'human_promotion_decision_key_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    promotion_gate_check_id: 'promotion_gate_check_001',
    promotion_gate_check_ref: gateRef,
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    decision: 'promote_with_conditions' as const,
    decision_class: 'promote' as const,
    actor: {
      actor_type: 'human' as const,
      actor_id: 'reviewer_001',
    },
    decision_timestamp: NOW,
    confirmed_snapshot_hash: 'promotion_input_snapshot_hash_001',
    rationale: 'Ready to promote with one condition.',
    conditions: [condition],
    required_actions: [],
    loopback_target: null,
    loopback_refs: [],
    accepted_risk_refs: [acceptedRiskRef],
    allowed_refinements: [
      {
        refinement_code: 'wording_only',
        scope: 'title_and_abstract_claim_wording',
        refs: [ref('topic_package', 'topic_package_001')],
      },
    ],
    stop_conditions: [],
    reopen_conditions: [],
    source_refs: [
      gateRef,
      inputRef,
      ref('topic_package', 'topic_package_001', 'v1'),
      ref('topic_value_assessment', 'topic_value_assessment_001'),
      ref('topic_question', 'topic_question_001'),
      ref('research_slice', 'research_slice_001'),
      ref('validated_need', 'validated_need_001'),
      ref('topic_selection_blocker', 'blocker_001'),
      ref('memory_suggestion', 'memory_suggestion_001'),
      ref('recheck_request', 'recheck_request_001'),
    ],
    artifact_refs: [ref('artifact_ref', 'artifact_ref_human_001')],
    created_at: NOW,
  };
  const promotionDecision = {
    promotion_decision_id: 'promotion_decision_001',
    promotion_decision_status: 'current' as const,
    current_promotion_input_snapshot_key: 'promotion_input_snapshot_001',
    human_promotion_decision_id: humanDecision.human_promotion_decision_id,
    human_confirmed_decision_id: humanDecision.human_confirmed_decision_id,
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    promotion_gate_check_id: 'promotion_gate_check_001',
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    gate_disposition: 'ready_for_human_decision' as const,
    decision: 'promote_with_conditions' as const,
    decision_class: 'promote' as const,
    bridge_eligible: true,
    promotion_commitment_profile_id: 'promotion_commitment_profile_001',
    loopback_target: null,
    required_actions: [],
    accepted_risk_refs: [acceptedRiskRef],
    conditions: [condition],
    source_refs: humanDecision.source_refs,
    snapshot_hashes: snapshotHashes,
    artifact_refs: [ref('artifact_ref', 'artifact_ref_decision_001')],
    created_at: NOW,
  };
  const commitment = {
    promotion_commitment_profile_id: 'promotion_commitment_profile_001',
    promotion_decision_id: 'promotion_decision_001',
    human_promotion_decision_id: humanDecision.human_promotion_decision_id,
    human_confirmed_decision_id: humanDecision.human_confirmed_decision_id,
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    promotion_gate_check_id: 'promotion_gate_check_001',
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    scope: {
      contribution_summary: 'A focused contribution summary.',
      evaluation_plan: 'A bounded evaluation plan.',
      source_snapshot_excerpt: {
        title: 'Working paper title',
        problem_statement: 'A concise problem statement.',
        contribution_summary: 'A focused contribution summary.',
        evaluation_plan: 'A bounded evaluation plan.',
        selected_evidence_refs: [
          {
            evidence_ref: evidenceRef,
          },
        ],
      },
    },
    claim_ceiling: 'Correlation and mechanism claims only.',
    prohibited_claims: ['Do not claim causal proof.'],
    accepted_risk_refs: [acceptedRiskRef],
    conditions: [condition],
    allowed_refinements: humanDecision.allowed_refinements,
    early_check_obligations: ['Re-check contribution claim before outline lock.'],
    stop_conditions: [],
    reopen_conditions: [],
    source_refs: humanDecision.source_refs,
    snapshot_hashes: snapshotHashes,
    artifact_refs: [ref('artifact_ref', 'artifact_ref_commitment_001')],
    created_at: NOW,
  };
  return {
    promotion_decision_id: 'promotion_decision_001',
    promotion_decision_ref: decisionRef,
    human_promotion_decision_ref: humanRef,
    human_confirmed_decision_ref: humanConfirmedRef,
    promotion_commitment_profile_ref: commitmentRef,
    promotion_gate_check_ref: gateRef,
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_ref: inputRef,
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    decision: 'promote_with_conditions',
    promotion_decision_status: 'current',
    conditions: [condition],
    accepted_risk_refs: [acceptedRiskRef],
    allowed_refinements: humanDecision.allowed_refinements,
    early_check_obligations: commitment.early_check_obligations,
    stop_conditions: [],
    reopen_conditions: [],
    source_refs: humanDecision.source_refs,
    snapshot_hashes: snapshotHashes,
    artifact_refs: [ref('artifact_ref', 'artifact_ref_handoff_001')],
    human_promotion_decision: humanDecision,
    promotion_decision: promotionDecision,
    promotion_commitment_profile: commitment,
    ...overrides,
  };
}

class StubHumanPromotionDecisionService {
  constructor(private readonly handoff: TopicSelectionPromotionBridgeHandoff) {}

  async getPromotionBridgeHandoff(
    promotionDecisionId: string,
  ): Promise<TopicSelectionPromotionBridgeHandoff> {
    if (promotionDecisionId !== this.handoff.promotion_decision_id) {
      throw new AppError(404, 'NOT_FOUND', `PromotionDecision ${promotionDecisionId} not found.`);
    }
    return this.handoff;
  }
}

class RecordingPaperProjectGateway {
  readonly createCalls: CreatePaperProjectRequest[] = [];
  readonly deleteCalls: string[] = [];
  private readonly papers = new Map<string, CreatePaperProjectResponse>();

  async createPaperProject(input: CreatePaperProjectRequest): Promise<CreatePaperProjectResponse> {
    this.createCalls.push(input);
    const paperId = `paper_project_${String(this.createCalls.length).padStart(3, '0')}`;
    const response: CreatePaperProjectResponse = {
      paper_id: paperId,
      status: 'active',
      paper_active_sp_full: null,
      paper_active_sp_partial: null,
      created_at: NOW,
    };
    this.papers.set(paperId, response);
    return response;
  }

  async deletePaperProject(paperId: string): Promise<void> {
    this.deleteCalls.push(paperId);
    this.papers.delete(paperId);
  }

  hasPaperProject(paperId: string): boolean {
    return this.papers.has(paperId);
  }
}

class AttachConflictPaperProjectBridgeRepository extends InMemoryTopicSelectionV1cPaperProjectBridgeRepository {
  override async attachPaperProjectRefs(
    paperProjectBridgeId: string,
    _input: {
      expected_bridge_payload_hash: string;
      paper_project_intake_ref: TopicSelectionFunctionalRef;
      target_paper_project_ref: TopicSelectionFunctionalRef;
    },
  ): Promise<TopicSelectionPaperProjectBridgeRecord> {
    throw new TopicSelectionV1cPaperProjectBridgeAttachmentConflictError(paperProjectBridgeId);
  }
}

function makeSubject(sourceHandoff: TopicSelectionPromotionBridgeHandoff = makeSourceHandoff()) {
  const repository = new InMemoryTopicSelectionV1cPaperProjectBridgeRepository();
  const paperProjectGateway = new RecordingPaperProjectGateway();
  const service = new TopicSelectionV1cPaperProjectBridgeService({
    repository,
    humanPromotionDecisionService: new StubHumanPromotionDecisionService(sourceHandoff),
    checkpointControl: createAdvancingTopicSelectionCheckpointControlFixture(),
    paperProjectGateway,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  return {
    paperProjectGateway,
    repository,
    service,
  };
}

test('promote handoff creates active paper project bridge without creating PaperProject', async () => {
  const source = makeSourceHandoff();
  const before = structuredClone(source);
  const { service, repository } = makeSubject(source);

  const result = await service.createPaperProjectBridge({
    promotion_decision_id: 'promotion_decision_001',
  });
  const stored = await repository.findBridgeBySourcePromotionDecisionId('promotion_decision_001');

  assert.equal(result.paper_project_bridge.bridge_status, 'active');
  assert.equal(result.paper_project_bridge.source_promotion_decision_id, 'promotion_decision_001');
  assert.equal(result.paper_project_bridge.target_paper_project_ref, null);
  assert.equal(result.paper_project_bridge.paper_project_intake_ref, null);
  assert.equal(result.handoff.bridge.paper_project_bridge_id, result.paper_project_bridge.paper_project_bridge_id);
  assert.equal(result.handoff.working_copy_payload.editable_title, 'Working paper title');
  assert.equal(
    result.handoff.source_refs.some((sourceRef) =>
      sourceRef.ref_type === 'evidence_unit' && sourceRef.ref_id === 'evidence_unit_001'),
    true,
  );
  assert.equal(stored?.working_copy_payload_hash, result.paper_project_bridge.working_copy_payload_hash);
  assert.deepEqual(source, before);
});

test('promote_with_conditions carries conditions and duplicate creation is idempotent', async () => {
  const { service } = makeSubject();

  const first = await service.createPaperProjectBridge({
    promotion_decision_id: 'promotion_decision_001',
  });
  const second = await service.createPaperProjectBridge({
    promotion_decision_id: 'promotion_decision_001',
  });

  assert.equal(second.paper_project_bridge.paper_project_bridge_id, first.paper_project_bridge.paper_project_bridge_id);
  assert.equal(second.handoff.conditions[0]?.condition_code, 'clarify_contribution_claim');
  assert.equal(
    second.handoff.early_check_obligations.includes('Re-check contribution claim before outline lock.'),
    true,
  );
});

test('paper project intake consumes active bridge once and preserves carried evidence and obligations', async () => {
  const { service, repository, paperProjectGateway } = makeSubject();
  const bridgeResult = await service.createPaperProjectBridge({
    promotion_decision_id: 'promotion_decision_001',
  });

  const intake = await service.createPaperProjectIntakeFromBridge({
    paper_project_bridge_id: bridgeResult.paper_project_bridge.paper_project_bridge_id,
    bridge_payload_hash: bridgeResult.paper_project_bridge.bridge_payload_hash,
    workspace_id: 'workspace_001',
    title: 'Paper title from explicit intake request',
    research_direction: 'RAG',
    created_by: 'human',
  });

  assert.equal(intake.paper_project_created, true);
  assert.equal(intake.paper_project_id, 'paper_project_001');
  assert.equal(intake.paper_project_ref.ref_type, 'paper_project');
  assert.equal(intake.paper_project_ref.ref_id, 'paper_project_001');
  assert.equal(intake.paper_project_ref.version_id, bridgeResult.paper_project_bridge.bridge_payload_hash);
  assert.equal(intake.paper_project_intake_ref.ref_type, 'paper_project_intake');
  assert.equal(intake.paper_project_intake_ref.version_id, bridgeResult.paper_project_bridge.bridge_payload_hash);
  assert.deepEqual(intake.carried_literature_evidence_ids, ['evidence_unit_001']);
  assert.deepEqual(intake.carried_accepted_risk_refs, [ref('accepted_risk', 'accepted_risk_001')]);
  assert.equal(
    intake.carried_condition_refs.some((conditionRef) =>
      conditionRef.ref_type === 'topic_package' && conditionRef.ref_id === 'topic_package_001'),
    true,
  );
  assert.equal(paperProjectGateway.createCalls.length, 1);
  assert.equal(paperProjectGateway.createCalls[0]?.title, 'Paper title from explicit intake request');
  assert.equal(paperProjectGateway.createCalls[0]?.research_direction, 'RAG');
  assert.equal(paperProjectGateway.createCalls[0]?.created_by, 'human');
  assert.deepEqual(paperProjectGateway.createCalls[0]?.initial_context.literature_evidence_ids, [
    'evidence_unit_001',
  ]);

  const stored = await repository.findBridgeById(bridgeResult.paper_project_bridge.paper_project_bridge_id);
  assert.deepEqual(stored?.paper_project_intake_ref, intake.paper_project_intake_ref);
  assert.deepEqual(stored?.target_paper_project_ref, intake.paper_project_ref);
  assert.equal(stored?.bridge_payload_hash, bridgeResult.paper_project_bridge.bridge_payload_hash);
  assert.equal(stored?.working_copy_payload_hash, bridgeResult.paper_project_bridge.working_copy_payload_hash);
  assert.equal(stored?.promotion_input_snapshot_hash, bridgeResult.paper_project_bridge.promotion_input_snapshot_hash);

  const duplicate = await service.createPaperProjectIntakeFromBridge({
    paper_project_bridge_id: bridgeResult.paper_project_bridge.paper_project_bridge_id,
    bridge_payload_hash: bridgeResult.paper_project_bridge.bridge_payload_hash,
    title: 'Ignored duplicate intake title',
    research_direction: 'ignored',
    created_by: 'hybrid',
  });

  assert.equal(duplicate.paper_project_created, false);
  assert.equal(duplicate.paper_project_id, intake.paper_project_id);
  assert.deepEqual(duplicate.paper_project_ref, intake.paper_project_ref);
  assert.deepEqual(duplicate.paper_project_intake_ref, intake.paper_project_intake_ref);
  assert.equal(paperProjectGateway.createCalls.length, 1);

  await assert.rejects(
    () => service.createPaperProjectIntakeFromBridge({
      paper_project_bridge_id: bridgeResult.paper_project_bridge.paper_project_bridge_id,
      bridge_payload_hash: 'stale_after_intake_hash',
      title: 'Stale duplicate must not be accepted',
      created_by: 'hybrid',
    }),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
  assert.equal(paperProjectGateway.createCalls.length, 1);
});

test('paper project intake prefers explicit selected literature ids and blocks empty evidence baskets', async () => {
  const explicitSource = makeSourceHandoff();
  const explicitScope = explicitSource.promotion_commitment_profile.scope as Record<string, unknown>;
  const explicitExcerpt = explicitScope.source_snapshot_excerpt as Record<string, unknown>;
  explicitExcerpt.selected_literature_evidence_ids = [
    'literature_evidence_explicit_001',
    'literature_evidence_explicit_001',
    'literature_evidence_explicit_002',
  ];
  const explicitSubject = makeSubject(explicitSource);
  const explicitBridge = await explicitSubject.service.createPaperProjectBridge({
    promotion_decision_id: 'promotion_decision_001',
  });

  const explicitIntake = await explicitSubject.service.createPaperProjectIntakeFromBridge({
    paper_project_bridge_id: explicitBridge.paper_project_bridge.paper_project_bridge_id,
    bridge_payload_hash: explicitBridge.paper_project_bridge.bridge_payload_hash,
    created_by: 'hybrid',
  });

  assert.deepEqual(explicitIntake.carried_literature_evidence_ids, [
    'literature_evidence_explicit_001',
    'literature_evidence_explicit_002',
  ]);
  assert.deepEqual(
    explicitSubject.paperProjectGateway.createCalls[0]?.initial_context.literature_evidence_ids,
    ['literature_evidence_explicit_001', 'literature_evidence_explicit_002'],
  );

  const emptySource = makeSourceHandoff();
  const emptyScope = emptySource.promotion_commitment_profile.scope as Record<string, unknown>;
  const emptyExcerpt = emptyScope.source_snapshot_excerpt as Record<string, unknown>;
  emptyExcerpt.selected_literature_evidence_ids = [];
  emptyExcerpt.selected_evidence_refs = [];
  await assert.rejects(
    () => makeSubject(emptySource).service.createPaperProjectBridge({
      promotion_decision_id: 'promotion_decision_001',
    }),
    (error) =>
      error instanceof AppError
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && /selected_evidence_refs/.test(error.message),
  );
});

test('paper project intake rejects stale preconditions before creating downstream project', async () => {
  const { service, paperProjectGateway } = makeSubject();
  const bridgeResult = await service.createPaperProjectBridge({
    promotion_decision_id: 'promotion_decision_001',
  });

  await assert.rejects(
    () => service.createPaperProjectIntakeFromBridge({
      paper_project_bridge_id: bridgeResult.paper_project_bridge.paper_project_bridge_id,
      bridge_payload_hash: 'stale_hash',
      created_by: 'hybrid',
    }),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
  await assert.rejects(
    () => service.createPaperProjectIntakeFromBridge({
      paper_project_bridge_id: bridgeResult.paper_project_bridge.paper_project_bridge_id,
      bridge_payload_hash: bridgeResult.paper_project_bridge.bridge_payload_hash,
      workspace_id: 'workspace_other',
      created_by: 'hybrid',
    }),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
  assert.equal(paperProjectGateway.createCalls.length, 0);
});

test('paper project intake requires gateway and rolls back PaperProject on attach conflict', async () => {
  const repository = new InMemoryTopicSelectionV1cPaperProjectBridgeRepository();
  const noGatewayService = new TopicSelectionV1cPaperProjectBridgeService({
    repository,
    humanPromotionDecisionService: new StubHumanPromotionDecisionService(makeSourceHandoff()),
    checkpointControl: createAdvancingTopicSelectionCheckpointControlFixture(),
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  const noGatewayBridge = await noGatewayService.createPaperProjectBridge({
    promotion_decision_id: 'promotion_decision_001',
  });

  await assert.rejects(
    () => noGatewayService.createPaperProjectIntakeFromBridge({
      paper_project_bridge_id: noGatewayBridge.paper_project_bridge.paper_project_bridge_id,
      bridge_payload_hash: noGatewayBridge.paper_project_bridge.bridge_payload_hash,
      created_by: 'hybrid',
    }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );

  const conflictRepository = new AttachConflictPaperProjectBridgeRepository();
  const paperProjectGateway = new RecordingPaperProjectGateway();
  const service = new TopicSelectionV1cPaperProjectBridgeService({
    repository: conflictRepository,
    humanPromotionDecisionService: new StubHumanPromotionDecisionService(makeSourceHandoff()),
    checkpointControl: createAdvancingTopicSelectionCheckpointControlFixture(),
    paperProjectGateway,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  const bridgeResult = await service.createPaperProjectBridge({
    promotion_decision_id: 'promotion_decision_001',
  });

  await assert.rejects(
    () => service.createPaperProjectIntakeFromBridge({
      paper_project_bridge_id: bridgeResult.paper_project_bridge.paper_project_bridge_id,
      bridge_payload_hash: bridgeResult.paper_project_bridge.bridge_payload_hash,
      created_by: 'hybrid',
    }),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
  assert.deepEqual(paperProjectGateway.deleteCalls, ['paper_project_001']);
  assert.equal(paperProjectGateway.hasPaperProject('paper_project_001'), false);
});

test('non-promote, superseded, missing commitment, and workspace drift are rejected', async () => {
  const nonPromote = makeSourceHandoff({
    decision: 'promote_with_conditions',
    promotion_decision: {
      ...makeSourceHandoff().promotion_decision,
      decision: 'drop',
      decision_class: 'non_promote',
      bridge_eligible: false,
      promotion_commitment_profile_id: null,
    } as never,
  });
  await assert.rejects(
    () => makeSubject(nonPromote).service.createPaperProjectBridge({
      promotion_decision_id: 'promotion_decision_001',
    }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );

  const superseded = makeSourceHandoff({
    promotion_decision_status: 'current',
    promotion_decision: {
      ...makeSourceHandoff().promotion_decision,
      promotion_decision_status: 'superseded',
    } as never,
  });
  await assert.rejects(
    () => makeSubject(superseded).service.createPaperProjectBridge({
      promotion_decision_id: 'promotion_decision_001',
    }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );

  const missingCommitment = makeSourceHandoff({
    promotion_commitment_profile: null,
  } as unknown as Partial<TopicSelectionPromotionBridgeHandoff>);
  await assert.rejects(
    () => makeSubject(missingCommitment).service.createPaperProjectBridge({
      promotion_decision_id: 'promotion_decision_001',
    }),
    (error) => error instanceof AppError && /commitment profile/.test(error.message),
  );

  await assert.rejects(
    () => makeSubject().service.createPaperProjectBridge({
      promotion_decision_id: 'promotion_decision_001',
      workspace_id: 'workspace_other',
    }),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );

  const noWorkspaceSource = makeSourceHandoff();
  noWorkspaceSource.human_promotion_decision.workspace_id = null;
  noWorkspaceSource.promotion_decision.workspace_id = null;
  noWorkspaceSource.promotion_commitment_profile.workspace_id = null;
  await assert.rejects(
    () => makeSubject(noWorkspaceSource).service.createPaperProjectBridge({
      promotion_decision_id: 'promotion_decision_001',
      workspace_id: 'workspace_001',
    }),
    (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
});

test('malformed bridge handoff lineage is rejected before bridge creation', async () => {
  const mismatchedInputSnapshot = makeSourceHandoff({
    topic_package_id: 'topic_package_other',
  });
  await assert.rejects(
    () => makeSubject(mismatchedInputSnapshot).service.createPaperProjectBridge({
      promotion_decision_id: 'promotion_decision_001',
    }),
    (error) =>
      error instanceof AppError
      && error.errorCode === 'VERSION_CONFLICT'
      && /inconsistent lineage/.test(error.message),
  );

  const mismatchedWorkspace = makeSourceHandoff();
  mismatchedWorkspace.promotion_commitment_profile.workspace_id = 'workspace_other';
  await assert.rejects(
    () => makeSubject(mismatchedWorkspace).service.createPaperProjectBridge({
      promotion_decision_id: 'promotion_decision_001',
    }),
    (error) =>
      error instanceof AppError
      && error.errorCode === 'VERSION_CONFLICT'
      && /workspace_id/.test(error.message),
  );
});

test('Prisma bridge repository round-trips bridge and control-plane records', async () => {
  const fake = new FakePaperProjectBridgePrismaClient();
  const repository = new PrismaTopicSelectionV1cPaperProjectBridgeRepository(fake.client);
  const service = new TopicSelectionV1cPaperProjectBridgeService({
    repository,
    humanPromotionDecisionService: new StubHumanPromotionDecisionService(makeSourceHandoff()),
    checkpointControl: createAdvancingTopicSelectionCheckpointControlFixture(),
    idFactory: makeIdFactory(),
    now: () => NOW,
  });

  const result = await service.createPaperProjectBridge({
    promotion_decision_id: 'promotion_decision_001',
  });
  const found = await repository.findBridgeById(result.paper_project_bridge.paper_project_bridge_id);
  const duplicate = await service.createPaperProjectBridge({
    promotion_decision_id: 'promotion_decision_001',
  });

  assert.equal(found?.source_promotion_decision_id, 'promotion_decision_001');
  assert.equal(duplicate.paper_project_bridge.paper_project_bridge_id, result.paper_project_bridge.paper_project_bridge_id);
  assert.equal(fake.inputSnapshots.size, 1);
  assert.equal(fake.traceSnapshots.size, 1);
  const traceSnapshot = [...fake.traceSnapshots.values()][0] as unknown as { objectRefs: TopicSelectionFunctionalRef[] };
  const objectRefKeys = new Set(traceSnapshot.objectRefs.map((traceRef) => `${traceRef.ref_type}:${traceRef.ref_id}`));
  for (const expectedRef of [
    'paper_project_bridge:paper_project_bridge_001',
    'promotion_decision:promotion_decision_001',
    'human_promotion_decision:human_promotion_decision_001',
    'human_confirmed_decision:human_confirmed_decision_001',
    'promotion_commitment_profile:promotion_commitment_profile_001',
    'promotion_gate_check:promotion_gate_check_001',
    'promotion_input_snapshot:promotion_input_snapshot_001',
    'topic_package:topic_package_001',
    'topic_value_assessment:topic_value_assessment_001',
    'topic_question:topic_question_001',
    'research_slice:research_slice_001',
    'validated_need:validated_need_001',
    'evidence_unit:evidence_unit_001',
    'accepted_risk:accepted_risk_001',
    'topic_selection_blocker:blocker_001',
    'memory_suggestion:memory_suggestion_001',
    'recheck_request:recheck_request_001',
  ]) {
    assert.equal(objectRefKeys.has(expectedRef), true, `${expectedRef} missing from trace objectRefs`);
  }
});

test('Prisma bridge repository attaches downstream PaperProject refs with hash guard', async () => {
  const fake = new FakePaperProjectBridgePrismaClient();
  const repository = new PrismaTopicSelectionV1cPaperProjectBridgeRepository(fake.client);
  const service = new TopicSelectionV1cPaperProjectBridgeService({
    repository,
    humanPromotionDecisionService: new StubHumanPromotionDecisionService(makeSourceHandoff()),
    checkpointControl: createAdvancingTopicSelectionCheckpointControlFixture(),
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  const result = await service.createPaperProjectBridge({
    promotion_decision_id: 'promotion_decision_001',
  });
  const bridgeId = result.paper_project_bridge.paper_project_bridge_id;

  await assert.rejects(
    () => repository.attachPaperProjectRefs(bridgeId, {
      expected_bridge_payload_hash: 'stale_hash',
      paper_project_intake_ref: ref('paper_project_intake', 'paper_project_intake_stale'),
      target_paper_project_ref: ref('paper_project', 'paper_project_stale'),
    }),
    (error) => error instanceof TopicSelectionV1cPaperProjectBridgeHashConflictError,
  );

  const attached = await repository.attachPaperProjectRefs(bridgeId, {
    expected_bridge_payload_hash: result.paper_project_bridge.bridge_payload_hash,
    paper_project_intake_ref: ref(
      'paper_project_intake',
      'paper_project_intake_001',
      result.paper_project_bridge.bridge_payload_hash,
    ),
    target_paper_project_ref: ref(
      'paper_project',
      'paper_project_001',
      result.paper_project_bridge.bridge_payload_hash,
    ),
  });

  assert.equal(attached.paper_project_intake_ref?.ref_id, 'paper_project_intake_001');
  assert.equal(attached.target_paper_project_ref?.ref_id, 'paper_project_001');
  const found = await repository.findBridgeById(bridgeId);
  assert.deepEqual(found?.paper_project_intake_ref, attached.paper_project_intake_ref);
  assert.deepEqual(found?.target_paper_project_ref, attached.target_paper_project_ref);
  await assert.rejects(
    () => repository.attachPaperProjectRefs(bridgeId, {
      expected_bridge_payload_hash: result.paper_project_bridge.bridge_payload_hash,
      paper_project_intake_ref: ref('paper_project_intake', 'paper_project_intake_duplicate'),
      target_paper_project_ref: ref('paper_project', 'paper_project_duplicate'),
    }),
    (error) => error instanceof TopicSelectionV1cPaperProjectBridgeAttachmentConflictError,
  );
});

test('Prisma bridge repository maps source promotion unique race to existing bridge', async () => {
  const fake = new FakePaperProjectBridgePrismaClient();
  const repository = new PrismaTopicSelectionV1cPaperProjectBridgeRepository(fake.client);
  const service = new TopicSelectionV1cPaperProjectBridgeService({
    repository,
    humanPromotionDecisionService: new StubHumanPromotionDecisionService(makeSourceHandoff()),
    checkpointControl: createAdvancingTopicSelectionCheckpointControlFixture(),
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  const first = await service.createPaperProjectBridge({
    promotion_decision_id: 'promotion_decision_001',
  });
  fake.bridgeModel.uniqueConflictFieldOnCreate = 'sourcePromotionDecisionId';

  const returned = await repository.createBridge({
    paper_project_bridge: {
      ...first.paper_project_bridge,
      paper_project_bridge_id: 'paper_project_bridge_race',
    },
    control_plane: makeControlPlaneForBridge(first.paper_project_bridge),
  });

  assert.equal(returned.paper_project_bridge_id, first.paper_project_bridge.paper_project_bridge_id);
});

test('paper project bridge migration declares table and unique source promotion guard', async () => {
  const sql = await fs.readFile(
    new URL('../../../../prisma/migrations/20260515170000_add_topic_selection_v1c_paper_project_bridge/migration.sql', import.meta.url),
    'utf8',
  );

  assert.match(sql, /CREATE TABLE "TopicSelectionPaperProjectBridge"/);
  assert.match(sql, /"sourcePromotionDecisionId" TEXT NOT NULL/);
  assert.match(sql, /tsppb_source_promotion_decision_key/);
  assert.match(sql, /"workingCopyPayload" JSONB NOT NULL/);
  assert.doesNotMatch(sql, /CREATE TABLE "PaperProject"/);
});

function makeControlPlaneForBridge(
  bridge: TopicSelectionPaperProjectBridgeRecord,
): TopicSelectionV1cPaperProjectBridgePersistence['control_plane'] {
  const targetRef = ref('paper_project_bridge', bridge.paper_project_bridge_id);
  const artifactRef = ref('artifact_ref', 'artifact_ref_race');
  return {
    input_snapshot: {
      input_snapshot_id: 'input_snapshot_race',
      workspace_id: bridge.workspace_id ?? null,
      title_card_id: bridge.title_card_id,
      target_ref: bridge.source_promotion_decision_ref,
      context_policy_version_id: null,
      policy_version: null,
      snapshot_hash: 'input_snapshot_hash_race',
      source_refs: bridge.source_refs,
      permission_refs: [],
      payload: {},
      created_by: 'system',
      created_at: NOW,
    },
    workflow_run: {
      workflow_run_id: 'workflow_run_race',
      workspace_id: bridge.workspace_id ?? null,
      title_card_id: bridge.title_card_id,
      workflow_key: 'topic-selection.v1c-paper-project-bridge',
      workflow_profile_key: 'topic-selection-paper-project-bridge',
      workflow_profile_version: '1',
      input_snapshot_id: 'input_snapshot_race',
      status: 'succeeded',
      provider_id: null,
      model_id: null,
      prompt_template_id: null,
      prompt_template_version: null,
      started_at: NOW,
      finished_at: NOW,
      telemetry: {},
      output_summary: {},
      error_code: null,
      error_message: null,
      created_by: 'system',
    },
    artifact_refs: [
      {
        artifact_ref_id: 'artifact_ref_race',
        workspace_id: bridge.workspace_id ?? null,
        title_card_id: bridge.title_card_id,
        artifact_kind: 'structured_output',
        storage_kind: 'inline',
        uri: null,
        payload: {},
        checksum: 'artifact_checksum_race',
        byte_size: null,
        mime_type: 'application/json',
        workflow_run_id: 'workflow_run_race',
        input_snapshot_id: 'input_snapshot_race',
        created_by: 'system',
        created_at: NOW,
      },
    ],
    readiness_gate_result: {
      readiness_gate_result_id: 'readiness_gate_result_race',
      workspace_id: bridge.workspace_id ?? null,
      title_card_id: bridge.title_card_id,
      gate_key: 'topic-selection.v1c-paper-project-bridge-check',
      target_ref: targetRef,
      input_snapshot_id: 'input_snapshot_race',
      workflow_run_id: 'workflow_run_race',
      policy_version_id: null,
      verdict: 'pass',
      blockers: [],
      warnings: [],
      required_actions: [],
      loopback_target: null,
      accepted_risk_refs: bridge.accepted_risk_refs,
      quality_signal_refs: [],
      created_by: 'system',
      created_at: NOW,
    },
    transition_attempt: {
      chain_transition_attempt_id: 'chain_transition_attempt_race',
      workspace_id: bridge.workspace_id ?? null,
      title_card_id: bridge.title_card_id,
      transition_key: 'v1c-promotion-decision-to-paper-project-bridge',
      source_ref: bridge.source_promotion_decision_ref,
      target_ref: targetRef,
      gate_result_id: 'readiness_gate_result_race',
      workflow_run_id: 'workflow_run_race',
      input_snapshot_id: 'input_snapshot_race',
      policy_version_id: null,
      actor: {
        actor_type: 'system',
        actor_id: null,
      },
      result: 'passed',
      reason: 'Race test duplicate bridge create.',
      required_actions: [],
      blockers: [],
      accepted_risk_refs: bridge.accepted_risk_refs,
      state_write_intents: [],
      created_authority_refs: [targetRef],
      created_at: NOW,
    },
    trace_snapshot: {
      trace_snapshot_id: 'trace_snapshot_race',
      workspace_id: bridge.workspace_id ?? null,
      title_card_id: bridge.title_card_id,
      target_ref: targetRef,
      snapshot_hash: 'trace_snapshot_hash_race',
      object_refs: [targetRef, bridge.source_promotion_decision_ref],
      lineage_link_refs: [],
      artifact_refs: [artifactRef],
      quality_signal_refs: [],
      transition_attempt_refs: [ref('chain_transition_attempt', 'chain_transition_attempt_race')],
      payload: {},
      created_by: 'system',
      created_at: NOW,
    },
  };
}

class FakeModel {
  readonly rows = new Map<string, Record<string, unknown>>();
  uniqueConflictFieldOnCreate: string | null;

  constructor(
    private readonly uniqueFields: string[] = [],
    uniqueConflictFieldOnCreate: string | null = null,
  ) {
    this.uniqueConflictFieldOnCreate = uniqueConflictFieldOnCreate;
  }

  async create({ data }: { data: Record<string, unknown> }) {
    if (this.uniqueConflictFieldOnCreate) {
      throw new Prisma.PrismaClientKnownRequestError(
        `duplicate ${this.uniqueConflictFieldOnCreate}`,
        {
          clientVersion: 'test',
          code: 'P2002',
          meta: { target: [this.uniqueConflictFieldOnCreate] },
        },
      );
    }
    for (const field of this.uniqueFields) {
      if (data[field] !== null && data[field] !== undefined) {
        const duplicate = [...this.rows.values()].some((row) => row[field] === data[field]);
        if (duplicate) {
          throw new Prisma.PrismaClientKnownRequestError(`duplicate ${field}`, {
            clientVersion: 'test',
            code: 'P2002',
            meta: { target: [field] },
          });
        }
      }
    }
    this.rows.set(String(data.id), data);
    return data;
  }

  async findUnique({ where }: { where: Record<string, unknown> }) {
    return [...this.rows.values()].find((row) => this.matches(row, where)) ?? null;
  }

  async update({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
    const current = await this.findUnique({ where });
    if (!current) {
      throw new Error(`No row matched ${JSON.stringify(where)}.`);
    }
    const updated = {
      ...current,
      ...data,
    };
    this.rows.set(String(updated.id), updated);
    return updated;
  }

  private matches(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
    return Object.entries(where).every(([key, value]) => row[key] === value);
  }
}

class FakePaperProjectBridgePrismaClient {
  readonly inputSnapshots = new Map<string, TopicSelectionInputSnapshotRecord>();
  readonly workflowRuns = new Map<string, TopicSelectionLlmWorkflowRunRecord>();
  readonly artifactRefs = new Map<string, TopicSelectionArtifactRefRecord>();
  readonly gateResults = new Map<string, TopicSelectionReadinessGateResultRecord>();
  readonly transitionAttempts = new Map<string, TopicSelectionChainTransitionAttemptRecord>();
  readonly traceSnapshots = new Map<string, TopicSelectionTraceSnapshotRecord>();
  readonly bridgeModel = new FakeModel(['sourcePromotionDecisionId']);
  readonly client: any;

  constructor() {
    this.client = {
      $transaction: async (callback: (tx: any) => Promise<void>) => callback(this.client),
      topicSelectionInputSnapshot: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          this.inputSnapshots.set(String(data.id), data as unknown as TopicSelectionInputSnapshotRecord);
          return data;
        },
      },
      topicSelectionLlmWorkflowRun: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          this.workflowRuns.set(String(data.id), data as unknown as TopicSelectionLlmWorkflowRunRecord);
          return data;
        },
      },
      topicSelectionArtifactRef: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          this.artifactRefs.set(String(data.id), data as unknown as TopicSelectionArtifactRefRecord);
          return data;
        },
      },
      topicSelectionReadinessGateResult: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          this.gateResults.set(String(data.id), data as unknown as TopicSelectionReadinessGateResultRecord);
          return data;
        },
      },
      topicSelectionChainTransitionAttempt: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          this.transitionAttempts.set(String(data.id), data as unknown as TopicSelectionChainTransitionAttemptRecord);
          return data;
        },
      },
      topicSelectionTraceSnapshot: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          this.traceSnapshots.set(String(data.id), data as unknown as TopicSelectionTraceSnapshotRecord);
          return data;
        },
      },
      topicSelectionPaperProjectBridge: {
        create: async ({ data }: { data: Record<string, unknown> }) => this.bridgeModel.create({ data }),
        findUnique: async ({ where }: { where: Record<string, unknown> }) => this.bridgeModel.findUnique({ where }),
        update: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) =>
          this.bridgeModel.update({ where, data }),
      },
    };
  }
}
