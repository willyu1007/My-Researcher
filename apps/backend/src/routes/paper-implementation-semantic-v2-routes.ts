import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import {
  paperImplementationSemanticIndexRebuildV2ResponseSchema,
  paperImplementationSemanticRetrievalV2RequestSchema,
  paperImplementationSemanticRetrievalV2ResponseSchema,
  paperImplementationSemanticV2ErrorEnvelopeSchema,
  type PaperImplementationSemanticRetrievalV2Request,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-semantic-retrieval-v2-contracts';

import type {
  PaperImplementationSemanticV2Controller,
} from '../controllers/paper-implementation-semantic-v2-controller.js';

const pathIdSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 512,
  pattern: '\\S',
} as const;

const projectParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['implementation_project_id'],
  properties: { implementation_project_id: pathIdSchema },
} as const;

const standardErrorResponses = {
  400: paperImplementationSemanticV2ErrorEnvelopeSchema,
  404: paperImplementationSemanticV2ErrorEnvelopeSchema,
  409: paperImplementationSemanticV2ErrorEnvelopeSchema,
  422: paperImplementationSemanticV2ErrorEnvelopeSchema,
  500: paperImplementationSemanticV2ErrorEnvelopeSchema,
  502: paperImplementationSemanticV2ErrorEnvelopeSchema,
  504: paperImplementationSemanticV2ErrorEnvelopeSchema,
} as const;

export async function registerPaperImplementationSemanticV2Routes(
  fastify: FastifyInstance,
  controller: PaperImplementationSemanticV2Controller,
): Promise<void> {
  fastify.post<{
    Params: { implementation_project_id: string };
    Body: unknown;
  }>(
    '/paper-implementation/projects/:implementation_project_id/semantic-index/v2/rebuild',
    {
      schema: {
        params: projectParamsSchema,
        response: {
          200: paperImplementationSemanticIndexRebuildV2ResponseSchema,
          ...standardErrorResponses,
        },
      },
      preValidation: validateOptionalEmptyBody,
      errorHandler: handleRouteError,
    },
    controller.rebuildProjectProjection,
  );

  fastify.post<{
    Params: { implementation_project_id: string };
    Body: PaperImplementationSemanticRetrievalV2Request;
  }>(
    '/paper-implementation/projects/:implementation_project_id/semantic-retrieval/v2',
    {
      schema: {
        params: projectParamsSchema,
        body: paperImplementationSemanticRetrievalV2RequestSchema,
        response: {
          200: paperImplementationSemanticRetrievalV2ResponseSchema,
          ...standardErrorResponses,
        },
      },
      errorHandler: handleRouteError,
    },
    controller.retrieve,
  );
}

async function validateOptionalEmptyBody(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const body = request.body;
  const isPlainEmptyObject = typeof body === 'object'
    && body !== null
    && !Array.isArray(body)
    && (
      Object.getPrototypeOf(body) === Object.prototype
      || Object.getPrototypeOf(body) === null
    )
    && Object.keys(body).length === 0;
  if (
    body === undefined
    || isPlainEmptyObject
  ) {
    return;
  }
  await reply.status(400).send({
    error: {
      code: 'INVALID_PAYLOAD',
      message: 'Semantic index rebuild accepts only an omitted or empty JSON body.',
    },
  });
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
        message: 'Request payload failed schema validation.',
      },
    });
    return;
  }
  request.log.error(
    { err: error },
    'paper-implementation semantic v2 route failed outside controller boundary',
  );
  await reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected paper-implementation semantic v2 failure.',
    },
  });
}
