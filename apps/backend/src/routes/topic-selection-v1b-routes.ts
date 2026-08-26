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
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER,
  TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS,
  topicSelectionV1bResearchSliceOptionSetDraftPayloadSchema,
  topicSelectionV1bTopicQuestionCandidateSetDraftPayloadSchema,
  topicSelectionV1bWorkflowHarnessRunRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import {
  topicSelectionNamedDebateExecutionPlanSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-debate-execution-plan-contracts';
import {
  TopicSelectionV1bController,
  type CodexAssistedInvocationBody,
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
const n4CodexAssistedNodeId = 'topic-selection.v1b.generate-research-slice-options.v1' as const;
const n6CodexAssistedNodeId = 'topic-selection.v1b.generate-topic-question-candidates.v1' as const;
const codexAssistedInvocationSchema = {
  ...paramsSchema({ nodeId: { enum: [n4CodexAssistedNodeId, n6CodexAssistedNodeId] } }),
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['request', 'codex_response'],
    properties: {
      request: topicSelectionV1bWorkflowHarnessRunRequestSchema,
      codex_response: {
        type: 'object',
        additionalProperties: false,
        required: ['output', 'operator_label'],
        properties: {
          output: {
            anyOf: [
              topicSelectionV1bResearchSliceOptionSetDraftPayloadSchema,
              topicSelectionV1bTopicQuestionCandidateSetDraftPayloadSchema,
            ],
          },
          operator_label: stringId,
          response_hash: nullableStringId,
          prompt_packet_hash: nullableStringId,
        },
      },
    },
  },
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
// T-127 W-09 pre-provider_llm hardening: validate a debate frontier's optional execution_plan at the HTTP
// boundary against the debate kind's OWN role slot ids (the same shared named-plan factory the runtimes use),
// constrained ONLY when debate.kind names a known frontier (if/then). Every other debate field (kind,
// execution_mode, run_mode, generation_mode, role_outputs) rides additionalProperties:true and is validated
// by the coordinator's discriminated union + the runtimes.
// IMPORTANT — what this actually enforces at the route: Fastify's default Ajv runs with removeAdditional:true
// (@fastify/ajv-compiler default), so this sub-schema only 400s enum/type/required violations — an unknown
// plan `name`, or a bad role-spec `execution_mode`. additionalProperties:false violations (foreign role keys,
// unknown plan/spec keys) are SILENTLY STRIPPED here, NOT rejected. The authoritative structural reject is the
// coordinator's own Ajv (removeAdditional OFF) in assertDebateExecutionPlanValid: it fully rejects foreign/
// unknown keys for DIRECT (non-HTTP) callers; over HTTP it sees the already-stripped body, so the two layers
// are complementary (route = early enum/type 400 + sanitize unknown keys; coordinator = authoritative
// structural reject for direct callers). Pinned by the advance-route schema-validation integration test.
const debateNodeInputSchema: JsonSchema = {
  type: 'object',
  additionalProperties: true,
  allOf: [
    {
      if: { required: ['kind'], properties: { kind: { const: 'n6_divergent' } } },
      then: {
        properties: {
          execution_plan: {
            anyOf: [topicSelectionNamedDebateExecutionPlanSchema(TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER), { type: 'null' }],
          },
        },
      },
    },
    {
      if: { required: ['kind'], properties: { kind: { const: 'n8_bounded' } } },
      then: {
        properties: {
          execution_plan: {
            anyOf: [topicSelectionNamedDebateExecutionPlanSchema(TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER), { type: 'null' }],
          },
        },
      },
    },
  ],
};
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
              // Per-role debate fixtures for an N6 divergent / N8 bounded debate frontier (W-07 item a).
              // The per-kind execution_plan's enum/type constraints are checked here (debateNodeInputSchema,
              // W-09 pre-provider_llm hardening) — a non-named plan or a bad role execution_mode 400s; foreign
              // role keys / unknown keys are STRIPPED by Fastify, not rejected (see debateNodeInputSchema note).
              // The remaining debate fields (kind, execution_mode, run_mode, generation_mode, role_outputs) stay
              // permissive — the coordinator validates the discriminated union (kind, mutual-exclusion with
              // draft_payload/execution_spec) + the plan structurally, and the runtimes validate the per-role
              // fixtures; a structural mismatch there surfaces as a 400 / debate_blocked halt.
              debate: { anyOf: [debateNodeInputSchema, { type: 'null' }] },
              // D-30: N8-only operator request arming the bounded-debate loopback (T-OP). The
              // coordinator forwards it verbatim; the harness enforces the N8-only contract.
              operator_debate_request: {
                anyOf: [
                  {
                    type: 'object',
                    additionalProperties: false,
                    required: ['reason', 'requested_by'],
                    properties: {
                      reason: { type: 'string', minLength: 1 },
                      requested_by: { type: 'string', minLength: 1 },
                    },
                  },
                  { type: 'null' },
                ],
              },
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
  fastify.post<{ Body: CodexAssistedInvocationBody; Params: { nodeId: string } }>(
    '/topic-selection/v1b/workflow-harness/nodes/:nodeId/codex-assisted-invocations',
    { schema: codexAssistedInvocationSchema },
    controller.invokeCodexAssisted,
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
  // T-128 W-15: operator records. Route bodies are permissive objects — the coordinator's own
  // strict Ajv is the authoritative validator (W-09 pattern: Fastify's default removeAdditional
  // would silently strip additionalProperties violations instead of rejecting them).
  fastify.post<{ Params: { workflowRunId: string }; Body: Record<string, unknown> }>(
    '/topic-selection/v1b/workflow-runs/:workflowRunId/sign-offs',
    { schema: { ...paramsSchema({ workflowRunId: stringId }), body: { type: 'object' } } },
    controller.recordProvisionalSignOff,
  );
  fastify.post<{ Params: { workflowRunId: string }; Body: Record<string, unknown> }>(
    '/topic-selection/v1b/workflow-runs/:workflowRunId/loopback-budget-raises',
    { schema: { ...paramsSchema({ workflowRunId: stringId }), body: { type: 'object' } } },
    controller.recordLoopbackBudgetRaise,
  );
  // T-128 W-15 S3 — read-only artifact list by run (workbench run-operations surface).
  fastify.get<{ Params: { workflowRunId: string } }>(
    '/topic-selection/v1b/workflow-runs/:workflowRunId/artifacts',
    { schema: paramsSchema({ workflowRunId: stringId }) },
    controller.listWorkflowRunArtifacts,
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
