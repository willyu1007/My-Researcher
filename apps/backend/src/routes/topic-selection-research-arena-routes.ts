import type { FastifyInstance } from 'fastify';
import {
  topicSelectionResearchCheckpointRecordSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-checkpoint-contracts';
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
  const sessionParams = {
    type: 'object',
    additionalProperties: false,
    required: ['arenaSessionId'],
    properties: { arenaSessionId: { type: 'string', minLength: 1 } },
  } as const;
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
        params: sessionParams,
        response: { 200: topicSelectionResearchArenaSessionSchema },
      },
    },
    controller.getSession,
  );
  fastify.post(
    '/topic-selection/research/arena/sessions/:arenaSessionId/gap-projection/recover',
    {
      schema: {
        params: sessionParams,
        response: { 200: topicSelectionResearchCheckpointRecordSchema },
      },
    },
    controller.recoverGapProjection,
  );
}
