import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  paperImplementationExplorationAttachmentV2ErrorResponseSchema,
  paperImplementationExplorationAttachmentV2ParamsSchema,
  paperImplementationExplorationAttachmentV2RequestSchema,
  paperImplementationExplorationAttachmentV2ResponseSchema,
  type PaperImplementationExplorationAttachmentV2Params,
  type PaperImplementationExplorationAttachmentV2Request,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-exploration-attachment-v2-contracts';

import type {
  PaperImplementationExplorationAttachmentV2Controller,
} from '../controllers/paper-implementation-exploration-attachment-v2-controller.js';

const errorResponses = {
  400: paperImplementationExplorationAttachmentV2ErrorResponseSchema,
  404: paperImplementationExplorationAttachmentV2ErrorResponseSchema,
  409: paperImplementationExplorationAttachmentV2ErrorResponseSchema,
  500: paperImplementationExplorationAttachmentV2ErrorResponseSchema,
} as const;

export async function registerPaperImplementationExplorationAttachmentV2Routes(
  fastify: FastifyInstance,
  controller: PaperImplementationExplorationAttachmentV2Controller,
): Promise<void> {
  fastify.post<{
    Params: PaperImplementationExplorationAttachmentV2Params;
    Body: PaperImplementationExplorationAttachmentV2Request;
  }>(
    '/paper-implementation/projects/:implementation_project_id/validation-cycles/:validation_cycle_id/exploration-specifications/:spec_id/revisions/:spec_revision/attach',
    {
      schema: {
        params: paperImplementationExplorationAttachmentV2ParamsSchema,
        body: paperImplementationExplorationAttachmentV2RequestSchema,
        response: {
          200: paperImplementationExplorationAttachmentV2ResponseSchema,
          201: paperImplementationExplorationAttachmentV2ResponseSchema,
          ...errorResponses,
        },
      },
      preValidation: rejectCallerAuthority,
      errorHandler: handleRouteError,
    },
    controller.attach,
  );
}

async function rejectCallerAuthority(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!isRecord(request.body)) return;
  const unexpected = Object.keys(request.body).find(
    (field) => field !== 'branch_key' && field !== 'business_idempotency_key',
  );
  if (!unexpected) return;
  await reply.status(400).send({
    error: {
      code: 'INVALID_PAYLOAD',
      message: `Caller-authored exploration attachment field is not allowed: ${unexpected}`,
      details: { reason_code: 'EXPLORATION_ATTACHMENT_COMMAND_INVALID' },
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function handleRouteError(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (error.validation) {
    await reply.status(400).send({
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Exploration attachment command failed schema validation.',
        details: { reason_code: 'EXPLORATION_ATTACHMENT_COMMAND_INVALID' },
      },
    });
    return;
  }
  request.log.error({ err: error }, 'paper-implementation exploration attachment route failed');
  await reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected paper-implementation exploration attachment route failure.',
    },
  });
}
