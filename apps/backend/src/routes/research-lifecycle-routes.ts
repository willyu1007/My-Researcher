import {
  createPaperProjectRequestSchema,
  type CreatePaperProjectRequest,
  type StageGateVerifyRequest,
  type VersionSpineCommitRequest,
  type WritingPackageBuildRequest,
  stageGateVerifyRequestSchema,
  versionSpineCommitRequestSchema,
  writingPackageBuildRequestSchema,
} from '@paper-engineering-assistant/shared';
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
}
