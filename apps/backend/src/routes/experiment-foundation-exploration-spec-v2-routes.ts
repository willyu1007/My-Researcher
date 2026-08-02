import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  experimentFoundationExplorationSpecV2CreateRevisionRequestSchema,
  experimentFoundationExplorationSpecV2CreateRevisionResponseSchema,
  experimentFoundationExplorationSpecV2ErrorResponseSchema,
  experimentFoundationExplorationSpecV2ParamsSchema,
  type ExperimentFoundationExplorationSpecV2CreateRevisionRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-exploration-spec-v2-contracts';

import type {
  ExperimentFoundationExplorationSpecV2Controller,
  ExperimentFoundationExplorationSpecV2Params,
} from '../controllers/experiment-foundation-exploration-spec-v2-controller.js';
import { findForbiddenNestedField } from './experiment-v2-route-validation.js';

const callerAuthoredAuthorityFields = new Set([
  'admission_id',
  'approved_plan_hash',
  'attempt',
  'attempt_id',
  'evidence_candidate',
  'event_id',
  'legacy_record_id',
  'result',
  'result_id',
  'run_id',
  'scientific_validation',
  'spec_id',
  'spec_revision',
  'task_spec_id',
  'trust_outcome',
  'work_order_revision_id',
]);
const callerAuthoredTopLevelAuthorityFields = new Set([
  'content_hash',
  'revision_id',
]);

const errorResponses = {
  400: experimentFoundationExplorationSpecV2ErrorResponseSchema,
  404: experimentFoundationExplorationSpecV2ErrorResponseSchema,
  409: experimentFoundationExplorationSpecV2ErrorResponseSchema,
  422: experimentFoundationExplorationSpecV2ErrorResponseSchema,
  500: experimentFoundationExplorationSpecV2ErrorResponseSchema,
} as const;

export async function registerExperimentFoundationExplorationSpecV2Routes(
  fastify: FastifyInstance,
  controller: ExperimentFoundationExplorationSpecV2Controller,
): Promise<void> {
  fastify.post<{
    Params: ExperimentFoundationExplorationSpecV2Params;
    Body: ExperimentFoundationExplorationSpecV2CreateRevisionRequest;
  }>(
    '/experiment-foundation/v2/exploration-specifications/:logical_id/revisions',
    {
      schema: {
        params: experimentFoundationExplorationSpecV2ParamsSchema,
        body: experimentFoundationExplorationSpecV2CreateRevisionRequestSchema,
        response: {
          200: experimentFoundationExplorationSpecV2CreateRevisionResponseSchema,
          201: experimentFoundationExplorationSpecV2CreateRevisionResponseSchema,
          ...errorResponses,
        },
      },
      preValidation: rejectCallerAuthority,
      errorHandler: handleRouteError,
    },
    controller.createRevision,
  );
}

async function rejectCallerAuthority(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const body = isRecord(request.body) ? request.body : null;
  const field = body
    ? [...callerAuthoredTopLevelAuthorityFields].find((candidate) => candidate in body)
      ?? findForbiddenNestedField(body, callerAuthoredAuthorityFields)
    : findForbiddenNestedField(request.body, callerAuthoredAuthorityFields);
  if (!field) return;
  await reply.status(400).send({
    error: {
      code: 'INVALID_PAYLOAD',
      message: `Caller-authored exploration authority field is not allowed: ${field}`,
      details: { reason_code: 'EXPLORATION_SPEC_COMMAND_INVALID' },
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
        message: 'Exploration spec request failed schema validation.',
        details: { reason_code: 'EXPLORATION_SPEC_COMMAND_INVALID' },
      },
    });
    return;
  }
  request.log.error({ err: error }, 'experiment-foundation exploration spec v2 route failed');
  await reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected experiment-foundation exploration spec route failure.',
    },
  });
}
