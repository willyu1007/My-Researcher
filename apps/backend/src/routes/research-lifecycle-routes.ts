import {
  createPaperProjectRequestSchema,
  releaseReviewRequestSchema,
  stageGateVerifyRequestSchema,
  versionSpineCommitRequestSchema,
  writingPackageBuildRequestSchema,
  type CreatePaperProjectRequest,
  type ReleaseReviewPayload,
  type StageGateVerifyRequest,
  type VersionSpineCommitRequest,
  type WritingPackageBuildRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-project-contracts';
import type { FastifyInstance } from 'fastify';
import { ResearchLifecycleController } from '../controllers/research-lifecycle-controller.js';

const paperIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

const stageGateParamsSchema = {
  type: 'object',
  required: ['id', 'gate'],
  properties: {
    id: { type: 'string', minLength: 1 },
    gate: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

export async function registerResearchLifecycleRoutes(
  app: FastifyInstance,
  controller: ResearchLifecycleController,
): Promise<void> {
  app.post<{ Body: CreatePaperProjectRequest }>(
    '/paper-projects',
    {
      schema: {
        body: createPaperProjectRequestSchema,
      },
    },
    async (request, reply) => controller.createPaperProject(request, reply),
  );

  app.post<{ Params: { id: string }; Body: VersionSpineCommitRequest }>(
    '/paper-projects/:id/version-spine/commit',
    {
      schema: {
        params: paperIdParamsSchema,
        body: versionSpineCommitRequestSchema,
      },
    },
    async (request, reply) => controller.commitVersionSpine(request, reply),
  );

  app.post<{ Params: { id: string; gate: string }; Body: StageGateVerifyRequest }>(
    '/paper-projects/:id/stage-gates/:gate/verify',
    {
      schema: {
        params: stageGateParamsSchema,
        body: stageGateVerifyRequestSchema,
      },
    },
    async (request, reply) => controller.verifyStageGate(request, reply),
  );

  app.post<{ Params: { id: string }; Body: WritingPackageBuildRequest }>(
    '/paper-projects/:id/writing-packages/build',
    {
      schema: {
        params: paperIdParamsSchema,
        body: writingPackageBuildRequestSchema,
      },
    },
    async (request, reply) => controller.buildWritingPackage(request, reply),
  );

  app.get<{ Params: { id: string } }>(
    '/paper-projects/:id/timeline',
    {
      schema: {
        params: paperIdParamsSchema,
      },
    },
    async (request, reply) => controller.getTimeline(request, reply),
  );

  app.get<{ Params: { id: string } }>(
    '/paper-projects/:id/resource-metrics',
    {
      schema: {
        params: paperIdParamsSchema,
      },
    },
    async (request, reply) => controller.getResourceMetrics(request, reply),
  );

  app.get<{ Params: { id: string } }>(
    '/paper-projects/:id/artifact-bundle',
    {
      schema: {
        params: paperIdParamsSchema,
      },
    },
    async (request, reply) => controller.getArtifactBundle(request, reply),
  );

  app.post<{ Params: { id: string }; Body: ReleaseReviewPayload }>(
    '/paper-projects/:id/release-gate/review',
    {
      schema: {
        params: paperIdParamsSchema,
        body: releaseReviewRequestSchema,
      },
    },
    async (request, reply) => controller.reviewReleaseGate(request, reply),
  );
}
