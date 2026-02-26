import {
  literatureOverviewQuerySchema,
  literatureImportRequestSchema,
  literatureSearchRequestSchema,
  literatureWebAutoImportRequestSchema,
  syncPaperLiteratureFromTopicRequestSchema,
  updateLiteratureMetadataRequestSchema,
  updatePaperLiteratureLinkRequestSchema,
  upsertTopicLiteratureScopeRequestSchema,
  zoteroImportRequestSchema,
  type LiteratureOverviewQuery,
  type LiteratureImportRequest,
  type LiteratureSearchRequest,
  type LiteratureWebAutoImportRequest,
  type SyncPaperLiteratureFromTopicRequest,
  type UpdateLiteratureMetadataRequest,
  type UpdatePaperLiteratureLinkRequest,
  type UpsertTopicLiteratureScopeRequest,
  type ZoteroImportRequest,
} from '@paper-engineering-assistant/shared';
import type { FastifyInstance } from 'fastify';
import { LiteratureController } from '../controllers/literature-controller.js';

const topicParamsSchema = {
  type: 'object',
  required: ['topicId'],
  properties: {
    topicId: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

const paperParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

const paperLinkParamsSchema = {
  type: 'object',
  required: ['id', 'linkId'],
  properties: {
    id: { type: 'string', minLength: 1 },
    linkId: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

const literatureParamsSchema = {
  type: 'object',
  required: ['literatureId'],
  properties: {
    literatureId: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

export async function registerLiteratureRoutes(
  app: FastifyInstance,
  controller: LiteratureController,
): Promise<void> {
  app.post<{ Body: LiteratureSearchRequest }>(
    '/literature/search',
    {
      schema: {
        body: literatureSearchRequestSchema,
      },
    },
    async (request, reply) => controller.search(request, reply),
  );

  app.post<{ Body: LiteratureImportRequest }>(
    '/literature/import',
    {
      schema: {
        body: literatureImportRequestSchema,
      },
    },
    async (request, reply) => controller.import(request, reply),
  );

  app.post<{ Body: LiteratureWebAutoImportRequest }>(
    '/literature/web-import',
    {
      schema: {
        body: literatureWebAutoImportRequestSchema,
      },
    },
    async (request, reply) => controller.webAutoImport(request, reply),
  );

  app.post<{ Body: ZoteroImportRequest }>(
    '/literature/zotero-import',
    {
      schema: {
        body: zoteroImportRequestSchema,
      },
    },
    async (request, reply) => controller.zoteroImport(request, reply),
  );

  app.get<{ Querystring: LiteratureOverviewQuery }>(
    '/literature/overview',
    {
      schema: {
        querystring: literatureOverviewQuerySchema,
      },
    },
    async (request, reply) => controller.getOverview(request, reply),
  );

  app.get<{ Params: { topicId: string } }>(
    '/topics/:topicId/literature-scope',
    {
      schema: {
        params: topicParamsSchema,
      },
    },
    async (request, reply) => controller.getTopicScope(request, reply),
  );

  app.post<{ Params: { topicId: string }; Body: UpsertTopicLiteratureScopeRequest }>(
    '/topics/:topicId/literature-scope',
    {
      schema: {
        params: topicParamsSchema,
        body: upsertTopicLiteratureScopeRequestSchema,
      },
    },
    async (request, reply) => controller.upsertTopicScope(request, reply),
  );

  app.post<{ Params: { id: string }; Body: SyncPaperLiteratureFromTopicRequest }>(
    '/paper-projects/:id/literature-links/from-topic',
    {
      schema: {
        params: paperParamsSchema,
        body: syncPaperLiteratureFromTopicRequestSchema,
      },
    },
    async (request, reply) => controller.syncPaperFromTopic(request, reply),
  );

  app.get<{ Params: { id: string } }>(
    '/paper-projects/:id/literature',
    {
      schema: {
        params: paperParamsSchema,
      },
    },
    async (request, reply) => controller.getPaperLiterature(request, reply),
  );

  app.patch<{ Params: { id: string; linkId: string }; Body: UpdatePaperLiteratureLinkRequest }>(
    '/paper-projects/:id/literature-links/:linkId',
    {
      schema: {
        params: paperLinkParamsSchema,
        body: updatePaperLiteratureLinkRequestSchema,
      },
    },
    async (request, reply) => controller.updatePaperLiteratureLink(request, reply),
  );

  app.patch<{ Params: { literatureId: string }; Body: UpdateLiteratureMetadataRequest }>(
    '/literature/:literatureId/metadata',
    {
      schema: {
        params: literatureParamsSchema,
        body: updateLiteratureMetadataRequestSchema,
      },
    },
    async (request, reply) => controller.updateLiteratureMetadata(request, reply),
  );
}
