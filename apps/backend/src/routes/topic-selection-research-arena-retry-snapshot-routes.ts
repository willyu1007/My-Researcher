import type { FastifyInstance } from 'fastify';
import {
  topicSelectionResearchArenaRetrySnapshotRequestSchema,
  topicSelectionResearchArenaRetrySnapshotSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import type {
  TopicSelectionResearchArenaRetrySnapshotController,
} from '../controllers/topic-selection-research-arena-retry-snapshot-controller.js';

export async function registerTopicSelectionResearchArenaRetrySnapshotRoutes(
  fastify: FastifyInstance,
  controller: TopicSelectionResearchArenaRetrySnapshotController,
): Promise<void> {
  fastify.post(
    '/topic-selection/research/arena/retry-snapshots',
    {
      schema: {
        body: topicSelectionResearchArenaRetrySnapshotRequestSchema,
        response: { 201: topicSelectionResearchArenaRetrySnapshotSchema },
      },
    },
    controller.prepare,
  );
}
