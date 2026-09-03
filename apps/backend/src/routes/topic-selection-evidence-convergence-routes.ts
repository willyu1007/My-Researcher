import type { FastifyInstance } from 'fastify';
import {
  topicSelectionEvidenceConvergenceClaimAdmissionSchema,
  topicSelectionEvidenceConvergenceRetrievalRequestIntentSchema,
  topicSelectionEvidenceConvergenceRoundRoleOutputSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-convergence-contracts';
import { topicSelectionFunctionalRefSchema } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_RESEARCH_ARENA_PARTICIPANT_ROLES,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import type {
  TopicSelectionEvidenceConvergenceController,
} from '../controllers/topic-selection-evidence-convergence-controller.js';

const stringId = { type: 'string', minLength: 1 } as const;
const nonNegativeInteger = { type: 'integer', minimum: 0 } as const;

const executeRetrievalBody = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title_card_id',
    'target_search_plan_id',
    'predecessor_evidence_map_id',
    'role_requests',
    'accounting',
  ],
  properties: {
    workspace_id: { anyOf: [stringId, { type: 'null' }] },
    title_card_id: stringId,
    target_search_plan_id: stringId,
    predecessor_evidence_map_id: stringId,
    role_requests: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['participant_role', 'intent'],
        properties: {
          participant_role: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_PARTICIPANT_ROLES] },
          intent: topicSelectionEvidenceConvergenceRetrievalRequestIntentSchema,
        },
      },
    },
    accounting: {
      type: 'object',
      additionalProperties: false,
      required: [
        'orchestration_steps',
        'linked_rounds',
        'elapsed_ms',
        'accumulated_cost_microusd',
      ],
      properties: {
        orchestration_steps: nonNegativeInteger,
        linked_rounds: nonNegativeInteger,
        elapsed_ms: nonNegativeInteger,
        accumulated_cost_microusd: nonNegativeInteger,
      },
    },
    policy_version_id: { anyOf: [stringId, { type: 'null' }] },
  },
} as const;

const publishSuccessorBody = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title_card_id',
    'predecessor_evidence_map_id',
    'search_run_id',
    'issue_ref',
    'decision_relevance',
    'claim_admissions',
  ],
  properties: {
    workspace_id: { anyOf: [stringId, { type: 'null' }] },
    title_card_id: stringId,
    predecessor_evidence_map_id: stringId,
    search_run_id: stringId,
    issue_ref: topicSelectionFunctionalRefSchema,
    decision_relevance: stringId,
    claim_admissions: {
      type: 'array',
      minItems: 1,
      maxItems: 24,
      items: topicSelectionEvidenceConvergenceClaimAdmissionSchema,
    },
    policy_version_id: { anyOf: [stringId, { type: 'null' }] },
  },
} as const;

const runLinkedRoundBody = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title_card_id',
    'predecessor_arena_session_id',
    'successor_evidence_map_id',
    'evidence_delta_ref',
    'issue_ref',
    'execution_mode',
    'role_inputs',
    'accounting',
  ],
  properties: {
    workspace_id: { anyOf: [stringId, { type: 'null' }] },
    title_card_id: stringId,
    predecessor_arena_session_id: stringId,
    successor_evidence_map_id: stringId,
    evidence_delta_ref: topicSelectionFunctionalRefSchema,
    issue_ref: topicSelectionFunctionalRefSchema,
    execution_mode: { enum: ['mocked_llm', 'codex_assisted'] },
    role_inputs: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'participant_role',
          'evidence_packet_artifact_ref',
          'structured_output',
          'fixture_id',
          'operator_label',
        ],
        properties: {
          participant_role: {
            enum: ['opportunity_scout', 'empirical_skeptic', 'synthesis_arbiter'],
          },
          evidence_packet_artifact_ref: topicSelectionFunctionalRefSchema,
          structured_output: topicSelectionEvidenceConvergenceRoundRoleOutputSchema,
          fixture_id: { anyOf: [stringId, { type: 'null' }] },
          operator_label: { anyOf: [stringId, { type: 'null' }] },
        },
      },
    },
    accounting: {
      type: 'object',
      additionalProperties: false,
      required: [
        'orchestration_steps',
        'linked_rounds',
        'elapsed_ms',
        'accumulated_cost_microusd',
      ],
      properties: {
        orchestration_steps: nonNegativeInteger,
        linked_rounds: nonNegativeInteger,
        elapsed_ms: nonNegativeInteger,
        accumulated_cost_microusd: nonNegativeInteger,
      },
    },
    policy_version_id: { anyOf: [stringId, { type: 'null' }] },
  },
} as const;

export async function registerTopicSelectionEvidenceConvergenceRoutes(
  fastify: FastifyInstance,
  controller: TopicSelectionEvidenceConvergenceController,
): Promise<void> {
  fastify.post(
    '/topic-selection/evidence-convergence/retrieval-executions',
    { schema: { body: executeRetrievalBody } },
    controller.executeRoleRetrievalRequests,
  );
  fastify.post(
    '/topic-selection/evidence-convergence/evidence-map-successors',
    { schema: { body: publishSuccessorBody } },
    controller.publishEvidenceMapSuccessor,
  );
  fastify.post(
    '/topic-selection/evidence-convergence/linked-rounds',
    { schema: { body: runLinkedRoundBody } },
    controller.runLinkedRound,
  );
}
