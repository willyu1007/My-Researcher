import test from 'node:test';
import assert from 'node:assert/strict';

import type {
  TopicSelectionDecisionWorkQueueItemRecord,
  TopicSelectionImpactLevel,
  TopicSelectionRecheckEventRecord,
  TopicSelectionRecheckImpactRecord,
  TopicSelectionSeverity,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-recheck-risk-memory-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
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
  TopicSelectionV1cHumanPromotionDecisionPersistenceBundle,
} from '../repositories/topic-selection-v1c-human-promotion-decision.repository.js';
import type {
  TopicSelectionV1cPaperProjectBridgePersistence,
} from '../repositories/topic-selection-v1c-paper-project-bridge.repository.js';
import type {
  TopicSelectionV1cPromotionGatePersistenceBundle,
  TopicSelectionV1cPromotionGateCheckPersistenceBundle,
  TopicSelectionV1cPromotionSupportPersistenceBundle,
} from '../repositories/topic-selection-v1c-promotion-gate.repository.js';
import type {
  TopicSelectionV1cPromotionInputPersistence,
} from '../repositories/topic-selection-v1c-promotion-input.repository.js';
import {
  createTopicSelectionV1cAcceptanceGraph,
  createTopicSelectionV1cAcceptanceIdFactory,
  createTopicSelectionV1cPromotionConditionFixture,
  TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  topicSelectionV1cAcceptanceRef,
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

class RecordingPromotionInputRepository extends InMemoryTopicSelectionV1cPromotionInputRepository {
  readonly writes: TopicSelectionV1cPromotionInputPersistence[] = [];

  override async createSnapshot(
    persistence: TopicSelectionV1cPromotionInputPersistence,
  ) {
    this.writes.push(persistence);
    return super.createSnapshot(persistence);
  }
}

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

class RecordingHumanPromotionDecisionRepository extends InMemoryTopicSelectionV1cHumanPromotionDecisionRepository {
  readonly writes: TopicSelectionV1cHumanPromotionDecisionPersistenceBundle[] = [];

  override async createBundle(
    persistence: TopicSelectionV1cHumanPromotionDecisionPersistenceBundle,
  ) {
    this.writes.push(persistence);
    return super.createBundle(persistence);
  }
}

class RecordingPaperProjectBridgeRepository extends InMemoryTopicSelectionV1cPaperProjectBridgeRepository {
  readonly writes: TopicSelectionV1cPaperProjectBridgePersistence[] = [];

  override async createBridge(
    persistence: TopicSelectionV1cPaperProjectBridgePersistence,
  ) {
    this.writes.push(persistence);
    return super.createBridge(persistence);
  }
}

class RecordingRecheckSink {
  readonly calls: Array<{
    source_ref: TopicSelectionFunctionalRef;
    affected_ref: TopicSelectionFunctionalRef;
    feedback_type: string;
    reason_codes: string[];
    summary: string;
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
    this.calls.push({
      source_ref: input.source_ref,
      affected_ref: input.affected_ref,
      feedback_type: input.feedback_type,
      reason_codes: input.reason_codes,
      summary: input.summary,
    });
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

function createReadyGraph() {
  return createTopicSelectionV1cAcceptanceGraph({
    packageOverrides: {
      package_payload: {
        claim_ceiling: 'Correlation and mechanism claims only.',
      },
      recheck_request_refs: [],
    },
  });
}

function createActionRequiredGraph() {
  return createTopicSelectionV1cAcceptanceGraph({
    packageOverrides: {
      contribution_summary: '',
      package_payload: {
        claim_ceiling: 'Correlation and mechanism claims only.',
      },
      recheck_request_refs: [],
    },
  });
}

function createWorkflowSubject(graph = createReadyGraph()) {
  const promotionInputRepository = new RecordingPromotionInputRepository();
  const promotionGateRepository = new RecordingPromotionGateRepository();
  const humanPromotionDecisionRepository = new RecordingHumanPromotionDecisionRepository();
  const paperProjectBridgeRepository = new RecordingPaperProjectBridgeRepository();
  const downstreamFeedbackRepository = new InMemoryTopicSelectionV1cDownstreamFeedbackRecheckRepository();
  const recheckSink = new RecordingRecheckSink();
  const promotionInputService = new TopicSelectionV1cPromotionInputService({
    repository: promotionInputRepository,
    topicPackageRepository: new TopicSelectionV1cAcceptanceTopicPackageRepository(graph),
    idFactory: createTopicSelectionV1cAcceptanceIdFactory(),
    now: () => TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  });
  const promotionGateService = new TopicSelectionV1cPromotionGateService({
    repository: promotionGateRepository,
    promotionInputService,
    idFactory: createTopicSelectionV1cAcceptanceIdFactory(),
    now: () => TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  });
  const humanPromotionDecisionService = new TopicSelectionV1cHumanPromotionDecisionService({
    repository: humanPromotionDecisionRepository,
    promotionGateService,
    checkpointControl: createAdvancingTopicSelectionCheckpointControlFixture(),
    idFactory: createTopicSelectionV1cAcceptanceIdFactory(),
    now: () => TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  });
  const paperProjectBridgeService = new TopicSelectionV1cPaperProjectBridgeService({
    repository: paperProjectBridgeRepository,
    humanPromotionDecisionService,
    checkpointControl: createAdvancingTopicSelectionCheckpointControlFixture(),
    idFactory: createTopicSelectionV1cAcceptanceIdFactory(),
    now: () => TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  });
  const downstreamFeedbackService = new TopicSelectionV1cDownstreamFeedbackRecheckService({
    repository: downstreamFeedbackRepository,
    paperProjectBridgeService,
    recheckRiskMemoryService: recheckSink,
    idFactory: createTopicSelectionV1cAcceptanceIdFactory(),
    now: () => TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  });
  return {
    graph,
    promotionInputRepository,
    promotionGateRepository,
    humanPromotionDecisionRepository,
    paperProjectBridgeRepository,
    downstreamFeedbackRepository,
    recheckSink,
    promotionInputService,
    promotionGateService,
    humanPromotionDecisionService,
    paperProjectBridgeService,
    downstreamFeedbackService,
  };
}

async function createSplitGateSupport(
  subject: ReturnType<typeof createWorkflowSubject>,
  promotionInputSnapshotId: string,
) {
  const supportBundle = await subject.promotionGateService.createPromotionDecisionSupport({
    promotion_input_snapshot_id: promotionInputSnapshotId,
  });
  return subject.promotionGateService.createPromotionGateCheckFromSupport({
    promotion_decision_support_id: supportBundle.promotion_decision_support.promotion_decision_support_id,
  });
}

async function runHappyBridgeChain(subject = createWorkflowSubject()) {
  const promotionInputSnapshot = await subject.promotionInputService.createPromotionInputSnapshot({
    v1b_to_v1c_input_bundle_id: subject.graph.bundle.v1b_to_v1c_input_bundle_id,
  });
  const gateSupport = await createSplitGateSupport(subject, promotionInputSnapshot.promotion_input_snapshot_id);
  const humanDecision = await subject.humanPromotionDecisionService.recordHumanPromotionDecision({
    promotion_gate_check_id: gateSupport.promotion_gate_check.promotion_gate_check_id,
    decision: 'promote_with_conditions',
    human_actor: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    rationale: 'Ready for bridge materialization with explicit condition.',
    confirmed_snapshot_hash: gateSupport.handoff.promotion_input_snapshot_hash,
    conditions: [createTopicSelectionV1cPromotionConditionFixture()],
  });
  const bridge = await subject.paperProjectBridgeService.createPaperProjectBridge({
    promotion_decision_id: humanDecision.promotion_decision.promotion_decision_id,
  });
  return {
    subject,
    promotionInputSnapshot,
    gateSupport,
    humanDecision,
    bridge,
  };
}

function workflowWriteCounts(subject: ReturnType<typeof createWorkflowSubject>) {
  return {
    promotionInput: subject.promotionInputRepository.writes.length,
    promotionSupport: subject.promotionGateRepository.writes.length
      + subject.promotionGateRepository.supportWrites.length,
    promotionGateCheck: subject.promotionGateRepository.writes.length
      + subject.promotionGateRepository.gateCheckWrites.length,
    humanDecision: subject.humanPromotionDecisionRepository.writes.length,
    paperProjectBridge: subject.paperProjectBridgeRepository.writes.length,
  };
}

test('T-108 L4 forward-only chain reaches N5 bridge without skipped authority boundaries', async () => {
  const result = await runHappyBridgeChain();
  const { subject, promotionInputSnapshot, gateSupport, humanDecision, bridge } = result;

  assert.deepEqual(workflowWriteCounts(subject), {
    promotionInput: 1,
    promotionSupport: 1,
    promotionGateCheck: 1,
    humanDecision: 1,
    paperProjectBridge: 1,
  });
  assert.equal(promotionInputSnapshot.closure_status, 'ready_for_gate');
  assert.equal(gateSupport.promotion_gate_check.disposition, 'ready_for_human_decision');
  assert.equal(gateSupport.handoff.promote_allowed, true);
  assert.equal(humanDecision.promotion_decision.bridge_eligible, true);
  assert.equal(humanDecision.bridge_handoff?.promotion_decision_id, humanDecision.promotion_decision.promotion_decision_id);
  assert.equal(bridge.paper_project_bridge.source_promotion_decision_id, humanDecision.promotion_decision.promotion_decision_id);
  assert.equal(bridge.paper_project_bridge.bridge_status, 'active');
  assert.equal(bridge.paper_project_bridge.paper_project_intake_ref, null);
  assert.equal(bridge.paper_project_bridge.target_paper_project_ref, null);
  assert.equal(subject.promotionGateRepository.supportWrites[0]?.control_plane.workflow_run.provider_id, null);
  assert.equal(subject.paperProjectBridgeRepository.writes[0]?.control_plane.workflow_run.provider_id, null);
});

test('T-108 L4 action-required gate stops before N4/N5 authority writes', async () => {
  const subject = createWorkflowSubject(createActionRequiredGraph());
  const promotionInputSnapshot = await subject.promotionInputService.createPromotionInputSnapshot({
    v1b_to_v1c_input_bundle_id: subject.graph.bundle.v1b_to_v1c_input_bundle_id,
  });
  const gateSupport = await createSplitGateSupport(subject, promotionInputSnapshot.promotion_input_snapshot_id);

  assert.equal(gateSupport.promotion_gate_check.disposition, 'needs_revision');
  assert.equal(gateSupport.promotion_gate_check.promote_allowed, false);
  assert.equal(gateSupport.promotion_gate_check.required_actions.length > 0, true);
  assert.deepEqual(workflowWriteCounts(subject), {
    promotionInput: 1,
    promotionSupport: 1,
    promotionGateCheck: 1,
    humanDecision: 0,
    paperProjectBridge: 0,
  });

  await assert.rejects(
    () => subject.humanPromotionDecisionService.recordHumanPromotionDecision({
      promotion_gate_check_id: gateSupport.promotion_gate_check.promotion_gate_check_id,
      decision: 'promote_to_paper_project',
      human_actor: {
        actor_type: 'human',
        actor_id: 'reviewer_001',
      },
      rationale: 'Invalid promote attempt after action-required gate.',
      confirmed_snapshot_hash: gateSupport.handoff.promotion_input_snapshot_hash,
    }),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
  assert.deepEqual(workflowWriteCounts(subject), {
    promotionInput: 1,
    promotionSupport: 1,
    promotionGateCheck: 1,
    humanDecision: 0,
    paperProjectBridge: 0,
  });
});

test('T-108 L4 exact replay returns existing N1-N5 records without duplicate writes', async () => {
  const subject = createWorkflowSubject();
  const first = await runHappyBridgeChain(subject);
  const second = await runHappyBridgeChain(subject);

  assert.deepEqual(workflowWriteCounts(subject), {
    promotionInput: 1,
    promotionSupport: 1,
    promotionGateCheck: 1,
    humanDecision: 1,
    paperProjectBridge: 1,
  });
  assert.equal(
    second.promotionInputSnapshot.promotion_input_snapshot_id,
    first.promotionInputSnapshot.promotion_input_snapshot_id,
  );
  assert.equal(
    second.gateSupport.promotion_gate_check.promotion_gate_check_id,
    first.gateSupport.promotion_gate_check.promotion_gate_check_id,
  );
  assert.equal(
    second.humanDecision.promotion_decision.promotion_decision_id,
    first.humanDecision.promotion_decision.promotion_decision_id,
  );
  assert.equal(
    second.bridge.paper_project_bridge.paper_project_bridge_id,
    first.bridge.paper_project_bridge.paper_project_bridge_id,
  );
});

test('T-108 L4 N6 recheck opens feedback projection without automatic N1-N5 loop', async () => {
  const result = await runHappyBridgeChain();
  const { subject, bridge } = result;
  const beforeCounts = workflowWriteCounts(subject);
  const beforeBridgeHash = bridge.paper_project_bridge.bridge_payload_hash;
  const feedbackInput: TopicSelectionDownstreamTopicFeedbackCreateInput = {
    paper_project_bridge_id: bridge.paper_project_bridge.paper_project_bridge_id,
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

  const feedback = await subject.downstreamFeedbackService.recordDownstreamTopicFeedback(feedbackInput);
  const storedBridge = await subject.paperProjectBridgeService.getPaperProjectBridge(
    bridge.paper_project_bridge.paper_project_bridge_id,
  );
  const listedFeedback = await subject.downstreamFeedbackRepository.listFeedbackByBridgeId(
    bridge.paper_project_bridge.paper_project_bridge_id,
  );

  assert.equal(feedback.classification.loopback_target, 'evidence_or_search');
  assert.equal(feedback.recheck_request?.loopback_cause, 'stale_evidence');
  assert.equal(subject.recheckSink.calls.length, 1);
  assert.equal(listedFeedback.length, 1);
  assert.deepEqual(workflowWriteCounts(subject), beforeCounts);
  assert.equal(storedBridge.bridge_payload_hash, beforeBridgeHash);
  assert.equal(storedBridge.paper_project_intake_ref, null);
  assert.equal(storedBridge.target_paper_project_ref, null);
});
