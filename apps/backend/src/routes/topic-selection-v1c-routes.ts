import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  TOPIC_SELECTION_ACTOR_TYPES,
  topicSelectionActorRefSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_SOURCES,
  TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_STATUSES,
  TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_CASE_TYPES,
  TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_METRIC_KEYS,
  topicSelectionOfflineEvaluationGoldExpectationSchema,
  topicSelectionOfflineEvaluationObservedOutputSchema,
  topicSelectionOfflineFrozenInputBundleSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-offline-evaluation-replay-contracts';
import {
  topicSelectionDownstreamTopicFeedbackCreateInputSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';
import {
  TOPIC_SELECTION_HUMAN_PROMOTION_DECISIONS,
  TOPIC_SELECTION_PROMOTION_LOOPBACK_TARGETS,
  topicSelectionPromotionAllowedRefinementSchema,
  topicSelectionPromotionConditionSchema,
  topicSelectionPromotionStopOrReopenConditionSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import {
  TOPIC_SELECTION_PROMOTION_SUPPORT_GENERATION_MODES,
  topicSelectionPromotionGateRequiredActionSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import {
  topicSelectionPaperProjectBridgeCreateInputSchema,
  topicSelectionPaperProjectBridgeIntakeBodySchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';
import {
  TopicSelectionV1cController,
  type V1cOfflineDatasetBody,
} from '../controllers/topic-selection-v1c-controller.js';

type JsonSchema = Record<string, unknown>;

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const recordPayload = { type: 'object', additionalProperties: true } as const;
const stringArray = { type: 'array', items: stringId } as const;
const actorType = { enum: [...TOPIC_SELECTION_ACTOR_TYPES] } as const;

function bodySchema(required: string[], properties: JsonSchema): JsonSchema {
  const body: JsonSchema = {
    type: 'object',
    additionalProperties: true,
    properties,
  };
  if (required.length > 0) {
    body.required = required;
  }
  return { body };
}

function paramsSchema(properties: JsonSchema): JsonSchema {
  return {
    params: {
      type: 'object',
      additionalProperties: false,
      required: Object.keys(properties),
      properties,
    },
  };
}

async function normalizeOptionalBody(request: FastifyRequest): Promise<void> {
  if (request.body === undefined) {
    (request as FastifyRequest & { body: unknown }).body = {};
  }
}

const promotionInputSnapshotBody = bodySchema(['v1b_to_v1c_input_bundle_id'], {
  v1b_to_v1c_input_bundle_id: stringId,
  workspace_id: nullableStringId,
  created_by: actorType,
  policy_version_id: nullableStringId,
});

const promotionGateSupportBody = bodySchema(['promotion_input_snapshot_id'], {
  promotion_input_snapshot_id: stringId,
  workspace_id: nullableStringId,
  created_by: actorType,
  policy_version_id: nullableStringId,
  support_generation_mode: { enum: [...TOPIC_SELECTION_PROMOTION_SUPPORT_GENERATION_MODES] },
  workflow_profile_version: nullableStringId,
  prompt_template_version: nullableStringId,
  model: recordPayload,
});

// T-128 W-13: v1c-N2 bounded-debate support. debate_role_outputs is a passthrough object (4 operator-supplied
// codex_assisted role outputs); the runtime + admission do the deep per-role validation, so no nested schema here.
const promotionDecisionSupportBoundedDebateBody = bodySchema(
  ['promotion_input_snapshot_id', 'workflow_run_id', 'node_attempt_id', 'debate_role_outputs'],
  {
    promotion_input_snapshot_id: stringId,
    workspace_id: nullableStringId,
    created_by: actorType,
    policy_version_id: nullableStringId,
    workflow_run_id: stringId,
    node_attempt_id: stringId,
    operator_label: { type: 'string' },
    debate_role_outputs: recordPayload,
  },
);

const promotionGateCheckBody = {
  body: {
    type: 'object',
    additionalProperties: true,
    anyOf: [
      { required: ['promotion_decision_support_id'] },
      { required: ['support_run_key'] },
      { required: ['promotion_input_snapshot_id'] },
    ],
    properties: {
      promotion_decision_support_id: stringId,
      support_run_key: stringId,
      promotion_input_snapshot_id: stringId,
      workspace_id: nullableStringId,
      created_by: actorType,
      policy_version_id: nullableStringId,
      support_generation_mode: { enum: [...TOPIC_SELECTION_PROMOTION_SUPPORT_GENERATION_MODES] },
      workflow_profile_version: nullableStringId,
      prompt_template_version: nullableStringId,
      model: recordPayload,
    },
  },
} as const;

const humanPromotionDecisionBody = bodySchema([
  'promotion_gate_check_id',
  'decision',
  'human_actor',
  'rationale',
  'confirmed_snapshot_hash',
], {
  promotion_gate_check_id: stringId,
  decision: { enum: [...TOPIC_SELECTION_HUMAN_PROMOTION_DECISIONS] },
  human_actor: topicSelectionActorRefSchema,
  rationale: stringId,
  confirmed_snapshot_hash: stringId,
  decision_timestamp: nullableStringId,
  workspace_id: nullableStringId,
  policy_version_id: nullableStringId,
  conditions: {
    type: 'array',
    items: topicSelectionPromotionConditionSchema,
  },
  required_actions: {
    type: 'array',
    items: topicSelectionPromotionGateRequiredActionSchema,
  },
  loopback_target: {
    anyOf: [{ enum: [...TOPIC_SELECTION_PROMOTION_LOOPBACK_TARGETS] }, { type: 'null' }],
  },
  allowed_refinements: {
    type: 'array',
    items: topicSelectionPromotionAllowedRefinementSchema,
  },
  stop_conditions: {
    type: 'array',
    items: topicSelectionPromotionStopOrReopenConditionSchema,
  },
  reopen_conditions: {
    type: 'array',
    items: topicSelectionPromotionStopOrReopenConditionSchema,
  },
});

const paperProjectBridgeBody = {
  body: topicSelectionPaperProjectBridgeCreateInputSchema,
};

const downstreamFeedbackBody = {
  body: topicSelectionDownstreamTopicFeedbackCreateInputSchema,
};

const snapshotParams = paramsSchema({ snapshotId: stringId });
const supportParams = paramsSchema({ supportId: stringId });
const dossierParams = paramsSchema({ dossierId: stringId });
const miniCheckParams = paramsSchema({ miniCheckId: stringId });
const gateCheckParams = paramsSchema({ gateCheckId: stringId });
const humanPromotionDecisionParams = paramsSchema({ humanPromotionDecisionId: stringId });
const promotionDecisionParams = paramsSchema({ promotionDecisionId: stringId });
const commitmentProfileParams = paramsSchema({ commitmentProfileId: stringId });
const bridgeParams = paramsSchema({ bridgeId: stringId });
const paperProjectBridgeIntakeBody = {
  ...bridgeParams,
  body: topicSelectionPaperProjectBridgeIntakeBodySchema,
};
const feedbackParams = paramsSchema({ feedbackId: stringId });
const recheckRequestParams = paramsSchema({ recheckRequestId: stringId });
const runParams = paramsSchema({ runId: stringId });

const offlineDatasetBody = bodySchema([], {
  workspace_id: nullableStringId,
  dataset_key: stringId,
  dataset_version: stringId,
  stage: { const: 'v1c' },
  source: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_SOURCES] },
  status: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_STATUSES] },
  description: nullableStringId,
  payload: recordPayload,
  created_by: actorType,
});

const v1cFrozenInputBundleSchema = {
  ...topicSelectionOfflineFrozenInputBundleSchema,
  properties: {
    ...(topicSelectionOfflineFrozenInputBundleSchema.properties as Record<string, unknown>),
    stage: { const: 'v1c' },
  },
} as const;

const offlineCaseBody = bodySchema([
  'dataset_id',
  'case_key',
  'case_type',
  'frozen_input_bundle',
  'gold_expectation',
], {
  workspace_id: nullableStringId,
  dataset_id: stringId,
  title_card_id: nullableStringId,
  case_key: stringId,
  case_type: { enum: [...TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_CASE_TYPES] },
  frozen_input_bundle: v1cFrozenInputBundleSchema,
  gold_expectation: topicSelectionOfflineEvaluationGoldExpectationSchema,
  tags: stringArray,
});

const offlineRunBody = bodySchema(['dataset_id', 'workflow_profile_key'], {
  workspace_id: nullableStringId,
  dataset_id: stringId,
  run_key: stringId,
  workflow_profile_key: stringId,
  workflow_profile_version: nullableStringId,
  model_profile_key: nullableStringId,
  search_profile_key: nullableStringId,
  policy_version_id: nullableStringId,
  metric_keys: {
    type: 'array',
    items: { enum: [...TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_METRIC_KEYS] },
  },
  run_payload: recordPayload,
  created_by: actorType,
});

const offlineCaseResultBody = bodySchema(['run_id', 'case_id', 'observed_output'], {
  workspace_id: nullableStringId,
  run_id: stringId,
  case_id: stringId,
  observed_output: topicSelectionOfflineEvaluationObservedOutputSchema,
});

export async function registerTopicSelectionV1cRoutes(
  fastify: FastifyInstance,
  controller: TopicSelectionV1cController,
): Promise<void> {
  // T-087 Phase 4 — reviewer workbench v1c read-only projections.
  fastify.get(
    '/topic-selection/v1c/title-cards/:titleCardId/promotion-gate-checks',
    { schema: paramsSchema({ titleCardId: stringId }) },
    controller.listPromotionGateChecksByTitleCard,
  );
  fastify.get(
    '/topic-selection/v1c/title-cards/:titleCardId/promotion-decisions',
    { schema: paramsSchema({ titleCardId: stringId }) },
    controller.listPromotionDecisionsByTitleCard,
  );
  fastify.get(
    '/topic-selection/v1c/title-cards/:titleCardId/paper-project-bridges',
    { schema: paramsSchema({ titleCardId: stringId }) },
    controller.listPaperProjectBridgesByTitleCard,
  );
  fastify.post(
    '/topic-selection/v1c/promotion-input-snapshots',
    { schema: promotionInputSnapshotBody },
    controller.createPromotionInputSnapshot,
  );
  fastify.get(
    '/topic-selection/v1c/promotion-input-snapshots/:snapshotId',
    { schema: snapshotParams },
    controller.getPromotionInputSnapshot,
  );
  fastify.post(
    '/topic-selection/v1c/promotion-decision-support',
    { schema: promotionGateSupportBody },
    controller.createPromotionDecisionSupport,
  );
  fastify.post(
    '/topic-selection/v1c/promotion-decision-support/bounded-debate',
    { schema: promotionDecisionSupportBoundedDebateBody },
    controller.createPromotionDecisionSupportFromBoundedDebate,
  );
  fastify.post(
    '/topic-selection/v1c/promotion-gate-checks',
    { schema: promotionGateCheckBody },
    controller.createPromotionGateCheck,
  );
  fastify.get(
    '/topic-selection/v1c/promotion-decision-support/:supportId',
    { schema: supportParams },
    controller.getPromotionDecisionSupport,
  );
  fastify.get(
    '/topic-selection/v1c/promotion-dossiers/:dossierId',
    { schema: dossierParams },
    controller.getPromotionDossier,
  );
  fastify.get(
    '/topic-selection/v1c/argument-readiness-mini-checks/:miniCheckId',
    { schema: miniCheckParams },
    controller.getArgumentReadinessMiniCheck,
  );
  fastify.get(
    '/topic-selection/v1c/promotion-gate-checks/:gateCheckId',
    { schema: gateCheckParams },
    controller.getPromotionGateCheck,
  );
  fastify.post(
    '/topic-selection/v1c/promotion-decisions',
    { schema: humanPromotionDecisionBody },
    controller.recordHumanPromotionDecision,
  );
  fastify.get(
    '/topic-selection/v1c/human-promotion-decisions/:humanPromotionDecisionId',
    { schema: humanPromotionDecisionParams },
    controller.getHumanPromotionDecision,
  );
  fastify.get(
    '/topic-selection/v1c/promotion-decisions/:promotionDecisionId',
    { schema: promotionDecisionParams },
    controller.getPromotionDecision,
  );
  fastify.get(
    '/topic-selection/v1c/promotion-decisions/:promotionDecisionId/bundle',
    { schema: promotionDecisionParams },
    controller.getPromotionDecisionBundle,
  );
  fastify.get(
    '/topic-selection/v1c/promotion-commitment-profiles/:commitmentProfileId',
    { schema: commitmentProfileParams },
    controller.getPromotionCommitmentProfile,
  );
  fastify.post(
    '/topic-selection/v1c/paper-project-bridges',
    { schema: paperProjectBridgeBody },
    controller.createPaperProjectBridge,
  );
  fastify.get(
    '/topic-selection/v1c/paper-project-bridges/:bridgeId',
    { schema: bridgeParams },
    controller.getPaperProjectBridge,
  );
  fastify.post(
    '/topic-selection/v1c/paper-project-bridges/:bridgeId/paper-project-intake',
    { schema: paperProjectBridgeIntakeBody },
    controller.createPaperProjectIntakeFromBridge,
  );
  fastify.post(
    '/topic-selection/v1c/downstream-feedback',
    { schema: downstreamFeedbackBody },
    controller.recordDownstreamTopicFeedback,
  );
  fastify.get(
    '/topic-selection/v1c/downstream-feedback/:feedbackId',
    { schema: feedbackParams },
    controller.getDownstreamTopicFeedback,
  );
  fastify.get(
    '/topic-selection/v1c/paper-project-bridges/:bridgeId/downstream-feedback',
    { schema: bridgeParams },
    controller.listDownstreamTopicFeedbackByBridge,
  );
  // T-127 W-08: scoped, ranked, record-only recheck advisories for a bridge (priority-desc).
  fastify.get(
    '/topic-selection/v1c/paper-project-bridges/:bridgeId/recheck-advisories',
    { schema: bridgeParams },
    controller.listDownstreamRecheckAdvisoriesByBridge,
  );
  fastify.get(
    '/topic-selection/v1c/downstream-feedback/:feedbackId/recheck-request',
    { schema: feedbackParams },
    controller.getDownstreamRecheckRequestByFeedback,
  );
  fastify.get(
    '/topic-selection/v1c/recheck-requests/:recheckRequestId',
    { schema: recheckRequestParams },
    controller.getDownstreamRecheckRequest,
  );
  fastify.post<{ Body: V1cOfflineDatasetBody }>(
    '/topic-selection/v1c/offline-evaluation/datasets',
    { schema: offlineDatasetBody, preValidation: normalizeOptionalBody },
    controller.createOfflineEvaluationDataset,
  );
  fastify.post<{ Body: V1cOfflineDatasetBody }>(
    '/topic-selection/v1c/offline-evaluation/datasets/synthetic-baseline',
    { schema: offlineDatasetBody, preValidation: normalizeOptionalBody },
    controller.createSyntheticOfflineEvaluationDataset,
  );
  fastify.post(
    '/topic-selection/v1c/offline-evaluation/cases',
    { schema: offlineCaseBody },
    controller.addOfflineEvaluationCase,
  );
  fastify.post(
    '/topic-selection/v1c/offline-evaluation/runs',
    { schema: offlineRunBody },
    controller.startOfflineEvaluationRun,
  );
  fastify.post(
    '/topic-selection/v1c/offline-evaluation/case-results',
    { schema: offlineCaseResultBody },
    controller.recordOfflineEvaluationCaseResult,
  );
  fastify.post(
    '/topic-selection/v1c/offline-evaluation/runs/:runId/complete',
    { schema: runParams },
    controller.completeOfflineEvaluationRun,
  );
  fastify.get(
    '/topic-selection/v1c/offline-evaluation/runs/:runId/metrics',
    { schema: runParams },
    controller.listOfflineEvaluationMetricResults,
  );
  fastify.get(
    '/topic-selection/v1c/offline-evaluation/runs/:runId/diffs',
    { schema: runParams },
    controller.listOfflineEvaluationReplayDiffs,
  );
}
