import type { FastifyInstance } from 'fastify';
import {
  topicSelectionEvidenceConvergenceRetrievalRequestIntentSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-convergence-contracts';
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

export async function registerTopicSelectionEvidenceConvergenceRoutes(
  fastify: FastifyInstance,
  controller: TopicSelectionEvidenceConvergenceController,
): Promise<void> {
  fastify.post(
    '/topic-selection/evidence-convergence/retrieval-executions',
    { schema: { body: executeRetrievalBody } },
    controller.executeRoleRetrievalRequests,
  );
}
