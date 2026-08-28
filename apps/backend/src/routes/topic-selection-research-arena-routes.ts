import type { FastifyInstance } from 'fastify';
import {
  topicSelectionResearchArenaOpenSessionRequestSchema,
  topicSelectionResearchArenaSessionSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import type {
  TopicSelectionResearchArenaController,
} from '../controllers/topic-selection-research-arena-controller.js';

export async function registerTopicSelectionResearchArenaRoutes(
  fastify: FastifyInstance,
  controller: TopicSelectionResearchArenaController,
): Promise<void> {
  fastify.post(
    '/topic-selection/research/arena/sessions',
    {
      schema: {
        body: topicSelectionResearchArenaOpenSessionRequestSchema,
        response: { 201: topicSelectionResearchArenaSessionSchema },
      },
    },
    controller.openSession,
  );
  fastify.get(
    '/topic-selection/research/arena/sessions/:arenaSessionId',
    {
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['arenaSessionId'],
          properties: { arenaSessionId: { type: 'string', minLength: 1 } },
        },
        response: { 200: topicSelectionResearchArenaSessionSchema },
      },
    },
    controller.getSession,
  );
}
