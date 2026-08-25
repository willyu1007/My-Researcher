import test from 'node:test';
import assert from 'node:assert/strict';

import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionDecisionWorkQueueItemRecord,
  TopicSelectionImpactLevel,
  TopicSelectionRecheckEventRecord,
  TopicSelectionRecheckImpactRecord,
  TopicSelectionSeverity,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-recheck-risk-memory-contracts';
import type {
  TopicSelectionDownstreamTopicFeedbackCreateInput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionV1cDownstreamFeedbackRecheckRepository } from '../repositories/in-memory-topic-selection-v1c-downstream-feedback-recheck-repository.js';
import { InMemoryTopicSelectionV1cHumanPromotionDecisionRepository } from '../repositories/in-memory-topic-selection-v1c-human-promotion-decision-repository.js';
import { InMemoryTopicSelectionV1cPaperProjectBridgeRepository } from '../repositories/in-memory-topic-selection-v1c-paper-project-bridge-repository.js';
import { InMemoryTopicSelectionV1cPromotionGateRepository } from '../repositories/in-memory-topic-selection-v1c-promotion-gate-repository.js';
import { InMemoryTopicSelectionV1cPromotionInputRepository } from '../repositories/in-memory-topic-selection-v1c-promotion-input-repository.js';
import type {
  TopicSelectionV1cPromotionGatePersistenceBundle,
  TopicSelectionV1cPromotionGateCheckPersistenceBundle,
  TopicSelectionV1cPromotionSupportPersistenceBundle,
} from '../repositories/topic-selection-v1c-promotion-gate.repository.js';
import {
  createTopicSelectionV1cAcceptanceGraph,
  createTopicSelectionV1cAcceptanceIdFactory,
  createTopicSelectionV1cPromotionBridgeHandoffFixture,
  createTopicSelectionV1cPromotionConditionFixture,
  TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  topicSelectionV1cAcceptanceRef,
  TopicSelectionV1cAcceptancePromotionBridgeHandoffProvider,
  TopicSelectionV1cAcceptanceTopicPackageRepository,
} from './topic-selection-v1c-acceptance-scenario-fixtures.js';
import {
  TopicSelectionV1cDownstreamFeedbackRecheckService,
} from './topic-selection-v1c-downstream-feedback-recheck-service.js';
import {
  TopicSelectionV1cHumanPromotionDecisionService,
} from './topic-selection-v1c-human-promotion-decision-service.js';
import {
  TopicSelectionV1cPaperProjectBridgeService,
} from './topic-selection-v1c-paper-project-bridge-service.js';
import {
  TopicSelectionV1cPromotionGateService,
} from './topic-selection-v1c-promotion-gate-service.js';
import {
  TopicSelectionV1cPromotionInputService,
} from './topic-selection-v1c-promotion-input-service.js';
import { createAdvancingTopicSelectionCheckpointControlFixture } from './test-fixtures/topic-selection-v1c-checkpoint-control.fixture.js';

class RecordingPromotionGateRepository extends InMemoryTopicSelectionV1cPromotionGateRepository {
  readonly writes: TopicSelectionV1cPromotionGatePersistenceBundle[] = [];
  readonly supportWrites: TopicSelectionV1cPromotionSupportPersistenceBundle[] = [];
  readonly gateCheckWrites: TopicSelectionV1cPromotionGateCheckPersistenceBundle[] = [];

  override async createBundle(
    persistence: TopicSelectionV1cPromotionGatePersistenceBundle,
  ) {
    this.writes.push(persistence);
    return super.createBundle(persistence);
  }

  override async createSupportBundle(
    persistence: TopicSelectionV1cPromotionSupportPersistenceBundle,
  ) {
    this.supportWrites.push(persistence);
    return super.createSupportBundle(persistence);
  }

  override async createGateCheckBundle(
    persistence: TopicSelectionV1cPromotionGateCheckPersistenceBundle,
  ) {
    this.gateCheckWrites.push(persistence);
    return super.createGateCheckBundle(persistence);
  }
}

class RecordingRecheckSink {
  readonly calls: Array<{
    workspace_id?: string | null;
    title_card_id?: string | null;
    source_ref: TopicSelectionFunctionalRef;
    affected_ref: TopicSelectionFunctionalRef;
    feedback_type: string;
    reason_codes: string[];
    summary: string;
    impact_level?: TopicSelectionImpactLevel;
    severity?: TopicSelectionSeverity;
    required_actions?: string[];
    artifact_refs?: TopicSelectionFunctionalRef[];
    policy_version_id?: string | null;
    payload?: Record<string, unknown>;
  }> = [];

  async recordDownstreamFeedback(input: {
    workspace_id?: string | null;
    title_card_id?: string | null;
    source_ref: TopicSelectionFunctionalRef;
    affected_ref: TopicSelectionFunctionalRef;
    feedback_type: string;
    reason_codes: string[];
    summary: string;
    impact_level?: TopicSelectionImpactLevel;
    severity?: TopicSelectionSeverity;
    required_actions?: string[];
    artifact_refs?: TopicSelectionFunctionalRef[];
    policy_version_id?: string | null;
    payload?: Record<string, unknown>;
  }): Promise<{
    event: TopicSelectionRecheckEventRecord;
    impact: TopicSelectionRecheckImpactRecord;
    queue_item: TopicSelectionDecisionWorkQueueItemRecord;
  }> {
    this.calls.push(input);
    const suffix = String(this.calls.length).padStart(3, '0');
    return {
      event: {
        recheck_event_id: `recheck_event_${suffix}`,
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id ?? null,
      } as TopicSelectionRecheckEventRecord,
      impact: {
        recheck_impact_id: `recheck_impact_${suffix}`,
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id ?? null,
      } as TopicSelectionRecheckImpactRecord,
      queue_item: {
        decision_work_queue_item_id: `decision_work_queue_item_${suffix}`,
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id ?? null,
      } as TopicSelectionDecisionWorkQueueItemRecord,
    };
  }
}

function makePromotionInputService(graph = createTopicSelectionV1cAcceptanceGraph()) {
  return new TopicSelectionV1cPromotionInputService({
    repository: new InMemoryTopicSelectionV1cPromotionInputRepository(),
    topicPackageRepository: new TopicSelectionV1cAcceptanceTopicPackageRepository(graph),
    idFactory: createTopicSelectionV1cAcceptanceIdFactory(),
    now: () => TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  });
}

async function createGateSubject(graph = createTopicSelectionV1cAcceptanceGraph()) {
  const promotionInputService = makePromotionInputService(graph);
  const snapshot = await promotionInputService.createPromotionInputSnapshot({
    v1b_to_v1c_input_bundle_id: graph.bundle.v1b_to_v1c_input_bundle_id,
  });
  const repository = new RecordingPromotionGateRepository();
  const service = new TopicSelectionV1cPromotionGateService({
    repository,
    promotionInputService,
    idFactory: createTopicSelectionV1cAcceptanceIdFactory(),
    now: () => TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  });
  return {
    graph,
    repository,
    service,
    snapshot,
  };
}

async function createSplitGateCheck(subject: Awaited<ReturnType<typeof createGateSubject>>) {
  const supportOnly = await subject.service.createPromotionDecisionSupport({
    promotion_input_snapshot_id: subject.snapshot.promotion_input_snapshot_id,
  });
  return subject.service.createPromotionGateCheckFromSupport({
    promotion_decision_support_id: supportOnly.promotion_decision_support.promotion_decision_support_id,
  });
}

test('T-108 N2/N3 deterministic support creates structured semantic layer and ready gate handoff', async () => {
  const subject = await createGateSubject(createTopicSelectionV1cAcceptanceGraph({
    packageOverrides: {
      package_payload: {
        claim_ceiling: 'Correlation and mechanism claims only.',
      },
      recheck_request_refs: [],
    },
  }));

  const result = await createSplitGateCheck(subject);
  const semanticLayer = result.promotion_dossier.dossier_payload.n3_semantic_layer as {
    claim_ceiling_alignment?: { status?: string };
    contribution_summary?: { status?: string };
    evaluation_plan_summary?: { status?: string };
    evidence_support_map?: { status?: string };
    accepted_risk_acknowledgements?: { status?: string };
    recheck_obligation_summary?: { status?: string };
    readiness_coverage_items?: unknown[];
  };
  const supportWrite = subject.repository.supportWrites[0];
  const gateCheckWrite = subject.repository.gateCheckWrites[0];

  assert.equal(result.promotion_decision_support.support_generation_mode, 'deterministic');
  assert.equal(result.promotion_gate_check.disposition, 'ready_for_human_decision');
  assert.equal(result.handoff.promote_allowed, true);
  assert.equal(semanticLayer.claim_ceiling_alignment?.status, 'addressed');
  assert.equal(semanticLayer.contribution_summary?.status, 'addressed');
  assert.equal(semanticLayer.evaluation_plan_summary?.status, 'addressed');
  assert.equal(semanticLayer.evidence_support_map?.status, 'addressed');
  assert.equal(semanticLayer.accepted_risk_acknowledgements?.status, 'addressed');
  assert.equal(semanticLayer.recheck_obligation_summary?.status, 'addressed');
  assert.ok((semanticLayer.readiness_coverage_items?.length ?? 0) > 0);
  assert.equal(supportWrite?.control_plane.workflow_run.provider_id, null);
  assert.deepEqual(
    gateCheckWrite?.control_plane.transition_attempt.created_authority_refs.map((ref) => ref.ref_type),
    [
      'argument_readiness_mini_check',
      'promotion_gate_check',
    ],
  );
});

test('T-108 N2 LLM draft mode fails closed without fallback or partial persistence', async () => {
  const subject = await createGateSubject();

  await assert.rejects(
    () => subject.service.createPromotionDecisionSupport({
      promotion_input_snapshot_id: subject.snapshot.promotion_input_snapshot_id,
      support_generation_mode: 'llm_draft',
    }),
    (error) =>
      error instanceof AppError
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && /fallback is disabled/.test(error.message),
  );
  assert.equal(subject.repository.writes.length, 0);
  assert.equal(subject.repository.supportWrites.length, 0);
  assert.equal(subject.repository.gateCheckWrites.length, 0);
});

test('T-108 N3 mini-check gaps produce typed action_required gate output', async () => {
  const subject = await createGateSubject(createTopicSelectionV1cAcceptanceGraph({
    packageOverrides: {
      contribution_summary: '',
      package_payload: {
        claim_ceiling: 'Correlation and mechanism claims only.',
      },
      recheck_request_refs: [],
    },
  }));

  const result = await createSplitGateCheck(subject);

  assert.equal(result.promotion_gate_check.disposition, 'needs_revision');
  assert.equal(result.promotion_gate_check.promote_allowed, false);
  assert.equal(
    result.promotion_gate_check.required_actions.some((action) =>
      action.action_code === 'refine_package_contribution_summary'
      && action.loopback_target === 'package'),
    true,
  );
  assert.equal(
    result.promotion_gate_check.loopback_hints.some((hint) => hint.loopback_target === 'package'),
    true,
  );
  assert.equal(result.argument_readiness_mini_check.check_status, 'blocking');
});

test('T-108 N4 ready gate creates promotion authority while action-required gate cannot promote', async () => {
  const readySubject = await createGateSubject(createTopicSelectionV1cAcceptanceGraph({
    packageOverrides: {
      package_payload: {
        claim_ceiling: 'Correlation and mechanism claims only.',
      },
      recheck_request_refs: [],
    },
  }));
  const readyGate = await createSplitGateCheck(readySubject);
  const humanDecisionService = new TopicSelectionV1cHumanPromotionDecisionService({
    repository: new InMemoryTopicSelectionV1cHumanPromotionDecisionRepository(),
    promotionGateService: readySubject.service,
    checkpointControl: createAdvancingTopicSelectionCheckpointControlFixture(),
    idFactory: createTopicSelectionV1cAcceptanceIdFactory(),
    now: () => TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  });
  const promoted = await humanDecisionService.recordHumanPromotionDecision({
    promotion_gate_check_id: readyGate.promotion_gate_check.promotion_gate_check_id,
    decision: 'promote_with_conditions',
    human_actor: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    rationale: 'Ready with one explicit condition.',
    confirmed_snapshot_hash: readyGate.handoff.promotion_input_snapshot_hash,
    conditions: [createTopicSelectionV1cPromotionConditionFixture()],
  });

  assert.equal(promoted.promotion_decision.bridge_eligible, true);
  assert.equal(promoted.promotion_commitment_profile?.claim_ceiling, 'Correlation and mechanism claims only.');
  assert.equal(promoted.bridge_handoff?.promotion_decision_id, promoted.promotion_decision.promotion_decision_id);

  const actionSubject = await createGateSubject(createTopicSelectionV1cAcceptanceGraph({
    packageOverrides: {
      contribution_summary: '',
      package_payload: {
        claim_ceiling: 'Correlation and mechanism claims only.',
      },
      recheck_request_refs: [],
    },
  }));
  const actionGate = await createSplitGateCheck(actionSubject);
  const actionDecisionService = new TopicSelectionV1cHumanPromotionDecisionService({
    repository: new InMemoryTopicSelectionV1cHumanPromotionDecisionRepository(),
    promotionGateService: actionSubject.service,
    checkpointControl: createAdvancingTopicSelectionCheckpointControlFixture(),
    idFactory: createTopicSelectionV1cAcceptanceIdFactory(),
    now: () => TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  });

  await assert.rejects(
    () => actionDecisionService.recordHumanPromotionDecision({
      promotion_gate_check_id: actionGate.promotion_gate_check.promotion_gate_check_id,
      decision: 'promote_to_paper_project',
      human_actor: {
        actor_type: 'human',
        actor_id: 'reviewer_001',
      },
      rationale: 'This promote attempt must fail.',
      confirmed_snapshot_hash: actionGate.handoff.promotion_input_snapshot_hash,
    }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );

  const actionRequired = await actionDecisionService.recordHumanPromotionDecision({
    promotion_gate_check_id: actionGate.promotion_gate_check.promotion_gate_check_id,
    decision: 'refine_package',
    human_actor: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    rationale: 'Refine the missing contribution summary.',
    confirmed_snapshot_hash: actionGate.handoff.promotion_input_snapshot_hash,
    loopback_target: 'package',
    required_actions: actionGate.promotion_gate_check.required_actions,
  });

  assert.equal(actionRequired.promotion_decision.bridge_eligible, false);
  assert.equal(actionRequired.promotion_commitment_profile, null);
  assert.equal(actionRequired.bridge_handoff, null);
});

test('T-108 N6 feedback opens one recheck projection and replay is fingerprint-idempotent', async () => {
  const bridgeService = new TopicSelectionV1cPaperProjectBridgeService({
    repository: new InMemoryTopicSelectionV1cPaperProjectBridgeRepository(),
    humanPromotionDecisionService: new TopicSelectionV1cAcceptancePromotionBridgeHandoffProvider(
      createTopicSelectionV1cPromotionBridgeHandoffFixture(),
    ),
    checkpointControl: createAdvancingTopicSelectionCheckpointControlFixture(),
    idFactory: createTopicSelectionV1cAcceptanceIdFactory(),
    now: () => TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  });
  const bridgeResult = await bridgeService.createPaperProjectBridge({
    promotion_decision_id: 'promotion_decision_001',
  });
  const recheckSink = new RecordingRecheckSink();
  const feedbackRepository = new InMemoryTopicSelectionV1cDownstreamFeedbackRecheckRepository();
  const feedbackService = new TopicSelectionV1cDownstreamFeedbackRecheckService({
    repository: feedbackRepository,
    paperProjectBridgeService: bridgeService,
    recheckRiskMemoryService: recheckSink,
    idFactory: createTopicSelectionV1cAcceptanceIdFactory(),
    now: () => TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  });
  const feedbackInput: TopicSelectionDownstreamTopicFeedbackCreateInput = {
    paper_project_bridge_id: bridgeResult.paper_project_bridge.paper_project_bridge_id,
    workspace_id: 'workspace_001',
    downstream_source_kind: 'reviewer_check',
    downstream_source_ref: topicSelectionV1cAcceptanceRef('reviewer_check', 'reviewer_check_001'),
    source_feedback_refs: [topicSelectionV1cAcceptanceRef('review_comment', 'review_comment_001')],
    feedback_signal: 'stale_evidence',
    severity: 'blocking',
    summary: 'The selected evidence is stale for the current paper framing.',
    required_action: 'Refresh selected evidence before continuing.',
    created_by: 'system',
  };

  const first = await feedbackService.recordDownstreamTopicFeedback(feedbackInput);
  const second = await feedbackService.recordDownstreamTopicFeedback(feedbackInput);
  const storedBridge = await bridgeService.getPaperProjectBridge(bridgeResult.paper_project_bridge.paper_project_bridge_id);
  const listed = await feedbackRepository.listFeedbackByBridgeId(bridgeResult.paper_project_bridge.paper_project_bridge_id);

  assert.equal(first.classification.loopback_target, 'evidence_or_search');
  assert.equal(first.recheck_request?.loopback_cause, 'stale_evidence');
  assert.equal(second.downstream_topic_feedback.downstream_topic_feedback_id, first.downstream_topic_feedback.downstream_topic_feedback_id);
  assert.equal(recheckSink.calls.length, 1);
  assert.equal(listed.length, 1);
  assert.equal(storedBridge.paper_project_intake_ref, null);
  assert.equal(storedBridge.target_paper_project_ref, null);
  assert.equal(storedBridge.bridge_payload_hash, bridgeResult.paper_project_bridge.bridge_payload_hash);
});
