import type { FastifyInstance } from 'fastify';
import {
  topicSelectionResearchArenaShadowRunRequestSchema,
  topicSelectionResearchArenaShadowRunResponseSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import type {
  TopicSelectionResearchArenaShadowController,
} from '../controllers/topic-selection-research-arena-shadow-controller.js';

export async function registerTopicSelectionResearchArenaShadowRoutes(
  fastify: FastifyInstance,
  controller: TopicSelectionResearchArenaShadowController,
): Promise<void> {
  fastify.post(
    '/topic-selection/research/arena/shadow/run',
    {
      schema: {
        body: topicSelectionResearchArenaShadowRunRequestSchema,
        response: { 200: topicSelectionResearchArenaShadowRunResponseSchema },
      },
    },
    controller.run,
  );
}
