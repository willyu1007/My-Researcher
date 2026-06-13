import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  TOPIC_SELECTION_ACTOR_TYPES,
  TOPIC_SELECTION_ARTIFACT_KINDS,
  TOPIC_SELECTION_ARTIFACT_STORAGE_KINDS,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_SOURCES,
  TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_STATUSES,
  TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_CASE_TYPES,
  TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_METRIC_KEYS,
  topicSelectionOfflineEvaluationGoldExpectationSchema,
  topicSelectionOfflineEvaluationObservedOutputSchema,
  topicSelectionOfflineFrozenInputBundleSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-offline-evaluation-replay-contracts';
import {
  TOPIC_SELECTION_AGENT_RUN_MODES,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import {
  TOPIC_SELECTION_AGENT_EXECUTION_MODES,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS,
  topicSelectionV1bWorkflowHarnessRunRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import {
  TopicSelectionV1bController,
  type ConstraintProfileHumanBody,
  type OfflineDatasetBody,
  type SliceHumanSelectionBody,
  type WorkflowHarnessArtifactBody,
  type WorkflowHarnessRunBody,
} from '../controllers/topic-selection-v1b-controller.js';

type JsonSchema = Record<string, unknown>;

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] } as const;
const stringArray = { type: 'array', items: stringId } as const;
const recordPayload = { type: 'object', additionalProperties: true } as const;
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

const packageParams = paramsSchema({ topicPackageId: stringId });

// T-115 Phase 2 — human-authority N5 select-research-slice. New semantic path
// (NOT the removed legacy `.../selection-decisions` write routes, which stay 404):
// goes THROUGH the harness via the controller, in human_delegated mode.
const actorRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['actor_type'],
  properties: { actor_type: actorType, actor_id: nullableStringId },
} as const;

const sliceHumanSelectionSchema = {
  ...bodySchema(['selected_option_id', 'selection_rationale', 'actor'], {
    selected_option_id: stringId,
    selection_rationale: stringId,
    actor: actorRefSchema,
    confidence: nullableNumber,
    decision_basis: recordPayload,
    required_actions: stringArray,
    accepted_risk_refs: { type: 'array', items: recordPayload },
    workflow_run_id: nullableStringId,
  }),
  ...paramsSchema({ optionSetId: stringId }),
};

// T-115 Phase 2 — human-authority N2 record-research-constraint-profile.
const constraintProfileHumanSchema = {
  ...bodySchema(['actor', 'profile'], {
    actor: actorRefSchema,
    workflow_run_id: nullableStringId,
    profile: {
      type: 'object',
      additionalProperties: true,
      required: ['target_community', 'claim_ceiling'],
      properties: {
        target_community: stringId,
        claim_ceiling: stringId,
        target_venue_class: nullableStringId,
        intended_contribution_style: nullableStringId,
        method_constraints: stringArray,
        resource_constraints: stringArray,
        available_assets: stringArray,
        feasibility_budget: recordPayload,
        non_goals: stringArray,
        human_constraint_notes: nullableStringId,
        constraint_payload: recordPayload,
      },
    },
  }),
  ...paramsSchema({ intakeSnapshotId: stringId }),
};

const offlineDatasetBody = bodySchema([], {
  workspace_id: nullableStringId,
  dataset_key: stringId,
  dataset_version: stringId,
  stage: { enum: ['v1b'] },
  source: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_SOURCES] },
  status: { enum: [...TOPIC_SELECTION_OFFLINE_EVALUATION_DATASET_STATUSES] },
  description: nullableStringId,
  payload: recordPayload,
  created_by: actorType,
});

const v1bFrozenInputBundleSchema = {
  ...topicSelectionOfflineFrozenInputBundleSchema,
  properties: {
    ...(topicSelectionOfflineFrozenInputBundleSchema.properties as Record<string, unknown>),
    stage: { const: 'v1b' },
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
  case_type: { enum: [...TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_CASE_TYPES] },
  frozen_input_bundle: v1bFrozenInputBundleSchema,
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
    items: { enum: [...TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_METRIC_KEYS] },
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

const runParams = paramsSchema({ runId: stringId });
const workflowHarnessNodeParams = paramsSchema({
  nodeId: { enum: [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS] },
});
const workflowHarnessRunBody = {
  ...workflowHarnessNodeParams,
  body: topicSelectionV1bWorkflowHarnessRunRequestSchema,
};
// T-123 Phase 2 — run-coordinator routes. The advance body validates budgets/enums at
// the schema layer (the coordinator trusts numeric budgets), and bootstrap_request
// reuses the SAME contract schema the direct harness-invocation route enforces.
const workflowRunStateSchema = paramsSchema({ workflowRunId: stringId });
const coordinatorExecutionSpecSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['execution_mode'],
  properties: {
    execution_mode: { enum: [...TOPIC_SELECTION_AGENT_EXECUTION_MODES] },
    model_option_id: nullableStringId,
  },
} as const;
const workflowRunAdvanceSchema = {
  ...paramsSchema({ workflowRunId: stringId }),
  ...bodySchema([], {
    retry_node_id: nullableStringId,
    bootstrap_request: { anyOf: [topicSelectionV1bWorkflowHarnessRunRequestSchema, { type: 'null' }] },
    node_inputs: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: {
            type: 'object',
            additionalProperties: false,
            properties: {
              execution_spec: { anyOf: [coordinatorExecutionSpecSchema, { type: 'null' }] },
              draft_payload: { anyOf: [recordPayload, { type: 'null' }] },
            },
          },
        },
        { type: 'null' },
      ],
    },
    max_steps: { type: 'integer', minimum: 1, maximum: 100 },
    loopback_budget_per_node: { type: 'integer', minimum: 0, maximum: 10 },
    node_timeout_ms: { type: 'integer', minimum: 1_000, maximum: 3_600_000 },
    run_timeout_ms: { type: 'integer', minimum: 1_000, maximum: 7_200_000 },
    created_by: actorType,
    run_mode: { anyOf: [{ enum: [...TOPIC_SELECTION_AGENT_RUN_MODES] }, { type: 'null' }] },
  }),
};
const workflowHarnessArtifactParams = paramsSchema({ artifactRefId: stringId });
const workflowHarnessTraceSnapshotParams = paramsSchema({ traceSnapshotId: stringId });
const workflowHarnessArtifactBody = bodySchema(['artifact_kind'], {
  workspace_id: nullableStringId,
  title_card_id: nullableStringId,
  artifact_kind: { enum: [...TOPIC_SELECTION_ARTIFACT_KINDS] },
  storage_kind: { enum: [...TOPIC_SELECTION_ARTIFACT_STORAGE_KINDS] },
  uri: nullableStringId,
  payload: { anyOf: [recordPayload, { type: 'null' }] },
  checksum: nullableStringId,
  byte_size: nullableNumber,
  mime_type: nullableStringId,
  workflow_run_id: nullableStringId,
  input_snapshot_id: nullableStringId,
  created_by: actorType,
});

export async function registerTopicSelectionV1bRoutes(
  fastify: FastifyInstance,
  controller: TopicSelectionV1bController,
): Promise<void> {
  fastify.post<{ Body: WorkflowHarnessRunBody; Params: { nodeId: string } }>(
    '/topic-selection/v1b/workflow-harness/nodes/:nodeId/invocations',
    { schema: workflowHarnessRunBody },
    controller.invokeWorkflowHarnessNode,
  );
  fastify.get<{ Params: { workflowRunId: string } }>(
    '/topic-selection/v1b/workflow-runs/:workflowRunId/state',
    { schema: workflowRunStateSchema },
    controller.getWorkflowRunState,
  );
  fastify.post<{ Params: { workflowRunId: string }; Body: Record<string, unknown> }>(
    '/topic-selection/v1b/workflow-runs/:workflowRunId/advance',
    { schema: workflowRunAdvanceSchema, preValidation: normalizeOptionalBody },
    controller.advanceWorkflowRun,
  );
  fastify.post<{ Body: WorkflowHarnessArtifactBody }>(
    '/topic-selection/v1b/workflow-harness/artifacts',
    { schema: workflowHarnessArtifactBody },
    controller.recordWorkflowHarnessArtifact,
  );
  fastify.get<{ Params: { artifactRefId: string } }>(
    '/topic-selection/v1b/workflow-harness/artifacts/:artifactRefId',
    { schema: workflowHarnessArtifactParams },
    controller.getWorkflowHarnessArtifact,
  );
  fastify.get<{ Params: { traceSnapshotId: string } }>(
    '/topic-selection/v1b/workflow-harness/trace-snapshots/:traceSnapshotId',
    { schema: workflowHarnessTraceSnapshotParams },
    controller.getWorkflowHarnessTraceSnapshot,
  );
  // T-087 Phase 3.1 — reviewer workbench v1b read-only projections.
  fastify.get(
    '/topic-selection/v1b/title-cards/:titleCardId/research-slice-option-sets',
    { schema: paramsSchema({ titleCardId: stringId }) },
    controller.listResearchSliceOptionSetsByTitleCard,
  );
  fastify.get(
    '/topic-selection/v1b/title-cards/:titleCardId/topic-question-candidate-sets',
    { schema: paramsSchema({ titleCardId: stringId }) },
    controller.listTopicQuestionCandidateSetsByTitleCard,
  );
  fastify.get(
    '/topic-selection/v1b/title-cards/:titleCardId/topic-value-assessments',
    { schema: paramsSchema({ titleCardId: stringId }) },
    controller.listTopicValueAssessmentsByTitleCard,
  );
  fastify.get(
    '/topic-selection/v1b/title-cards/:titleCardId/topic-packages',
    { schema: paramsSchema({ titleCardId: stringId }) },
    controller.listTopicPackagesByTitleCard,
  );
  // T-087 Phase 3.2/3.3 — read-only detail projections for harness-written authority.
  fastify.get(
    '/topic-selection/v1b/research-slice-option-sets/:optionSetId/options',
    { schema: paramsSchema({ optionSetId: stringId }) },
    controller.listResearchSliceOptionsByOptionSet,
  );
  fastify.post<{ Body: SliceHumanSelectionBody; Params: { optionSetId: string } }>(
    '/topic-selection/v1b/research-slice-option-sets/:optionSetId/human-selection',
    { schema: sliceHumanSelectionSchema },
    controller.selectResearchSliceHuman,
  );
  fastify.post<{ Body: ConstraintProfileHumanBody; Params: { intakeSnapshotId: string } }>(
    '/topic-selection/v1b/intake-snapshots/:intakeSnapshotId/constraint-profile/human',
    { schema: constraintProfileHumanSchema },
    controller.recordConstraintProfileHuman,
  );
  fastify.get(
    '/topic-selection/v1b/title-cards/:titleCardId/intake-snapshots',
    { schema: paramsSchema({ titleCardId: stringId }) },
    controller.listIntakeSnapshotsByTitleCard,
  );
  fastify.get(
    '/topic-selection/v1b/topic-question-candidate-sets/:candidateSetId/candidates',
    { schema: paramsSchema({ candidateSetId: stringId }) },
    controller.listTopicQuestionCandidatesByCandidateSet,
  );
  fastify.get('/topic-selection/v1b/topic-packages/:topicPackageId', { schema: packageParams }, controller.getDraftPackage);
  fastify.post<{ Body: OfflineDatasetBody }>(
    '/topic-selection/v1b/offline-evaluation/datasets',
    { schema: offlineDatasetBody, preValidation: normalizeOptionalBody },
    controller.createOfflineEvaluationDataset,
  );
  fastify.post<{ Body: OfflineDatasetBody }>(
    '/topic-selection/v1b/offline-evaluation/datasets/synthetic-baseline',
    { schema: offlineDatasetBody, preValidation: normalizeOptionalBody },
    controller.createSyntheticOfflineEvaluationDataset,
  );
  fastify.post('/topic-selection/v1b/offline-evaluation/cases', { schema: offlineCaseBody }, controller.addOfflineEvaluationCase);
  fastify.post('/topic-selection/v1b/offline-evaluation/runs', { schema: offlineRunBody }, controller.startOfflineEvaluationRun);
  fastify.post(
    '/topic-selection/v1b/offline-evaluation/case-results',
    { schema: offlineCaseResultBody },
    controller.recordOfflineEvaluationCaseResult,
  );
  fastify.post(
    '/topic-selection/v1b/offline-evaluation/runs/:runId/complete',
    { schema: runParams },
    controller.completeOfflineEvaluationRun,
  );
  fastify.get(
    '/topic-selection/v1b/offline-evaluation/runs/:runId/metric-results',
    { schema: runParams },
    controller.listOfflineEvaluationMetricResults,
  );
  fastify.get(
    '/topic-selection/v1b/offline-evaluation/runs/:runId/replay-diffs',
    { schema: runParams },
    controller.listOfflineEvaluationReplayDiffs,
  );
}
