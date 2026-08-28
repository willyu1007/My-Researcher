import type { FastifyInstance } from 'fastify';
import {
  topicSelectionResearchArenaRoleEvidencePreparationRequestSchema,
  topicSelectionResearchArenaRoleEvidencePreparationSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import type {
  TopicSelectionResearchArenaRetrievalController,
} from '../controllers/topic-selection-research-arena-retrieval-controller.js';

export async function registerTopicSelectionResearchArenaRetrievalRoutes(
  fastify: FastifyInstance,
  controller: TopicSelectionResearchArenaRetrievalController,
): Promise<void> {
  fastify.post(
    '/topic-selection/research/arena/role-evidence/prepare',
    {
      schema: {
        body: topicSelectionResearchArenaRoleEvidencePreparationRequestSchema,
        response: { 200: topicSelectionResearchArenaRoleEvidencePreparationSchema },
      },
    },
    controller.prepareRoleEvidence,
  );
}
