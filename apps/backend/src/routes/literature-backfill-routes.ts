import {
  literatureContentProcessingBackfillCreateJobRequestSchema,
  literatureContentProcessingBackfillDryRunRequestSchema,
  literatureContentProcessingCleanupDryRunRequestSchema,
  listLiteratureContentProcessingBackfillJobsQuerySchema,
  type LiteratureContentProcessingBackfillCreateJobRequest,
  type LiteratureContentProcessingBackfillDryRunRequest,
  type LiteratureContentProcessingCleanupDryRunRequest,
  type ListLiteratureContentProcessingBackfillJobsQuery,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import type { FastifyInstance } from 'fastify';
import { LiteratureBackfillController } from '../controllers/literature-backfill-controller.js';

const jobParamsSchema = {
  type: 'object',
  required: ['jobId'],
  properties: {
    jobId: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

export async function registerLiteratureBackfillRoutes(
  app: FastifyInstance,
  controller: LiteratureBackfillController,
): Promise<void> {
  app.post<{ Body: LiteratureContentProcessingBackfillDryRunRequest }>(
    '/literature/content-processing/backfill/dry-runs',
    {
      schema: {
        body: literatureContentProcessingBackfillDryRunRequestSchema,
      },
    },
    async (request, reply) => controller.dryRunBackfill(request, reply),
  );

  app.post<{ Body: LiteratureContentProcessingBackfillCreateJobRequest }>(
    '/literature/content-processing/backfill/jobs',
    {
      schema: {
        body: literatureContentProcessingBackfillCreateJobRequestSchema,
      },
    },
    async (request, reply) => controller.createBackfillJob(request, reply),
  );

  app.get<{ Querystring: ListLiteratureContentProcessingBackfillJobsQuery }>(
    '/literature/content-processing/backfill/jobs',
    {
      schema: {
        querystring: listLiteratureContentProcessingBackfillJobsQuerySchema,
      },
    },
    async (request, reply) => controller.listBackfillJobs(request, reply),
  );

  app.get<{ Params: { jobId: string } }>(
    '/literature/content-processing/backfill/jobs/:jobId',
    {
      schema: {
        params: jobParamsSchema,
      },
    },
    async (request, reply) => controller.getBackfillJob(request, reply),
  );

  app.post<{ Params: { jobId: string } }>(
    '/literature/content-processing/backfill/jobs/:jobId/pause',
    {
      schema: {
        params: jobParamsSchema,
      },
    },
    async (request, reply) => controller.pauseBackfillJob(request, reply),
  );

  app.post<{ Params: { jobId: string } }>(
    '/literature/content-processing/backfill/jobs/:jobId/resume',
    {
      schema: {
        params: jobParamsSchema,
      },
    },
    async (request, reply) => controller.resumeBackfillJob(request, reply),
  );

  app.post<{ Params: { jobId: string } }>(
    '/literature/content-processing/backfill/jobs/:jobId/cancel',
    {
      schema: {
        params: jobParamsSchema,
      },
    },
    async (request, reply) => controller.cancelBackfillJob(request, reply),
  );

  app.post<{ Params: { jobId: string } }>(
    '/literature/content-processing/backfill/jobs/:jobId/retry-failed',
    {
      schema: {
        params: jobParamsSchema,
      },
    },
    async (request, reply) => controller.retryBackfillJob(request, reply),
  );

  app.delete<{ Params: { jobId: string } }>(
    '/literature/content-processing/backfill/jobs/:jobId',
    {
      schema: {
        params: jobParamsSchema,
      },
    },
    async (request, reply) => controller.deleteBackfillJob(request, reply),
  );

  app.post<{ Body: LiteratureContentProcessingCleanupDryRunRequest }>(
    '/literature/content-processing/cleanup/dry-runs',
    {
      schema: {
        body: literatureContentProcessingCleanupDryRunRequestSchema,
      },
    },
    async (request, reply) => controller.cleanupDryRun(request, reply),
  );
}
