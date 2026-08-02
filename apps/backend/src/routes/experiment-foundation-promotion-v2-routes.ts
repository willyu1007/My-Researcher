import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  experimentFoundationPromotionV2ErrorResponseSchema,
  experimentFoundationPromotionV2ParamsSchema,
  experimentFoundationPromotionV2RequestSchema,
  experimentFoundationPromotionV2ResponseSchema,
  type ExperimentFoundationPromotionV2Request,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-promotion-v2-contracts';

import type {
  ExperimentFoundationPromotionV2Controller,
  ExperimentFoundationPromotionV2Params,
} from '../controllers/experiment-foundation-promotion-v2-controller.js';
import { findForbiddenNestedField } from './experiment-v2-route-validation.js';

const callerAuthoredAuthorityFields = new Set([
  'candidate_id',
  'candidate_content_hash',
  'canonical_hash',
  'canonical_id',
  'canonical_revision',
  'canonical_revision_id',
  'canonical_revision_hash',
  'content_hash',
  'event_id',
  'outbox',
  'promotion_decision_id',
  'promotion_result',
  'result',
  'status',
  'task_spec_hash',
  'task_spec_id',
]);

const errorResponses = {
  400: experimentFoundationPromotionV2ErrorResponseSchema,
  404: experimentFoundationPromotionV2ErrorResponseSchema,
  409: experimentFoundationPromotionV2ErrorResponseSchema,
  422: experimentFoundationPromotionV2ErrorResponseSchema,
  500: experimentFoundationPromotionV2ErrorResponseSchema,
} as const;

export async function registerExperimentFoundationPromotionV2Routes(
  fastify: FastifyInstance,
  controller: ExperimentFoundationPromotionV2Controller,
): Promise<void> {
  fastify.post<{
    Params: ExperimentFoundationPromotionV2Params;
    Body: ExperimentFoundationPromotionV2Request;
  }>(
    '/experiment-foundation/v2/assets/:asset_type/:logical_id/candidate-revisions/:candidate_revision/promotion',
    {
      schema: {
        params: experimentFoundationPromotionV2ParamsSchema,
        body: experimentFoundationPromotionV2RequestSchema,
        response: {
          200: experimentFoundationPromotionV2ResponseSchema,
          201: experimentFoundationPromotionV2ResponseSchema,
          ...errorResponses,
        },
      },
      preValidation: rejectCallerAuthority,
      errorHandler: handleRouteError,
    },
    controller.decide,
  );
}

async function rejectCallerAuthority(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const field = findForbiddenNestedField(request.body, callerAuthoredAuthorityFields);
  if (!field) return;
  await reply.status(400).send({
    error: {
      code: 'INVALID_PAYLOAD',
      message: `Caller-authored promotion authority field is not allowed: ${field}`,
      details: { reason_code: 'PROMOTION_COMMAND_INVALID' },
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
        message: 'Promotion request failed schema validation.',
        details: { reason_code: 'PROMOTION_COMMAND_INVALID' },
      },
    });
    return;
  }
  request.log.error({ err: error }, 'experiment-foundation promotion v2 route failed');
  await reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected experiment-foundation promotion route failure.',
    },
  });
}
