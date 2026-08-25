import type { FastifyInstance } from 'fastify';
import {
  topicSelectionResearchCheckpointDecisionInputSchema,
  topicSelectionResearchObjectionInputSchema,
  topicSelectionResearchObjectionResolutionInputSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-checkpoint-contracts';
import type { TopicSelectionResearchCheckpointController } from '../controllers/topic-selection-research-checkpoint-controller.js';

const stringId = { type: 'string', minLength: 1 } as const;

function paramsSchema(properties: Record<string, typeof stringId>) {
  return {
    type: 'object',
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  } as const;
}

export async function registerTopicSelectionResearchCheckpointRoutes(
  fastify: FastifyInstance,
  controller: TopicSelectionResearchCheckpointController,
): Promise<void> {
  const checkpointParams = paramsSchema({ checkpointId: stringId });
  const titleCardParams = paramsSchema({ titleCardId: stringId });

  fastify.get(
    '/topic-selection/title-cards/:titleCardId/checkpoints',
    { schema: { params: titleCardParams } },
    controller.listCheckpoints,
  );
  fastify.get(
    '/topic-selection/checkpoints/:checkpointId',
    { schema: { params: checkpointParams } },
    controller.getCheckpoint,
  );
  fastify.get(
    '/topic-selection/checkpoints/:checkpointId/packet',
    { schema: { params: checkpointParams } },
    controller.getPacket,
  );
  fastify.post(
    '/topic-selection/checkpoints/:checkpointId/decisions',
    { schema: { params: checkpointParams, body: topicSelectionResearchCheckpointDecisionInputSchema } },
    controller.recordDecision,
  );
  fastify.post(
    '/topic-selection/checkpoints/:checkpointId/objections',
    { schema: { params: checkpointParams, body: topicSelectionResearchObjectionInputSchema } },
    controller.recordObjection,
  );
  fastify.post(
    '/topic-selection/objections/:objectionId/resolutions',
    {
      schema: {
        params: paramsSchema({ objectionId: stringId }),
        body: topicSelectionResearchObjectionResolutionInputSchema,
      },
    },
    controller.resolveObjection,
  );
  fastify.get(
    '/topic-selection/title-cards/:titleCardId/research-status',
    { schema: { params: titleCardParams } },
    controller.getResearchStatus,
  );
}
