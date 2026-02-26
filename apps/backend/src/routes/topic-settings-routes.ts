import {
  createTopicProfileRequestSchema,
  updateTopicProfileRequestSchema,
  type CreateTopicProfileRequest,
  type UpdateTopicProfileRequest,
} from '@paper-engineering-assistant/shared';
import type { FastifyInstance } from 'fastify';
import { TopicSettingsController } from '../controllers/topic-settings-controller.js';

const topicParamsSchema = {
  type: 'object',
  required: ['topicId'],
  properties: {
    topicId: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

export async function registerTopicSettingsRoutes(
  app: FastifyInstance,
  controller: TopicSettingsController,
): Promise<void> {
  app.post<{ Body: CreateTopicProfileRequest }>(
    '/topics/settings',
    {
      schema: {
        body: createTopicProfileRequestSchema,
      },
    },
    async (request, reply) => controller.createTopicProfile(request, reply),
  );

  app.get('/topics/settings', async (request, reply) => controller.listTopicProfiles(request, reply));

  app.patch<{ Params: { topicId: string }; Body: UpdateTopicProfileRequest }>(
    '/topics/settings/:topicId',
    {
      schema: {
        params: topicParamsSchema,
        body: updateTopicProfileRequestSchema,
      },
    },
    async (request, reply) => controller.updateTopicProfile(request, reply),
  );
}
