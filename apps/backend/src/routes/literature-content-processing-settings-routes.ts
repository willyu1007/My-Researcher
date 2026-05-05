import {
  updateLiteratureContentProcessingSettingsRequestSchema,
  type UpdateLiteratureContentProcessingSettingsRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import type { FastifyInstance } from 'fastify';
import { LiteratureContentProcessingSettingsController } from '../controllers/literature-content-processing-settings-controller.js';

export async function registerLiteratureContentProcessingSettingsRoutes(
  app: FastifyInstance,
  controller: LiteratureContentProcessingSettingsController,
): Promise<void> {
  app.get('/settings/literature-content-processing', async (request, reply) =>
    controller.getSettings(request, reply),
  );

  app.get('/settings/literature-content-processing/fulltext-parser/health', async (request, reply) =>
    controller.getFulltextParserHealth(request, reply),
  );

  app.patch<{ Body: UpdateLiteratureContentProcessingSettingsRequest }>(
    '/settings/literature-content-processing',
    {
      schema: {
        body: updateLiteratureContentProcessingSettingsRequestSchema,
      },
    },
    async (request, reply) => controller.updateSettings(request, reply),
  );
}
