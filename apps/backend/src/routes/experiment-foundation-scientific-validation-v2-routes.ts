import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import {
  generateExperimentResultV2RequestSchema,
  scientificValidationV2ErrorResponseSchema,
  validateScientificBatchV2RequestSchema,
  validateScientificBatchV2ResponseSerializationSchema,
  type GenerateExperimentResultV2Request,
  type ValidateScientificBatchV2Request,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';
import {
  experimentFoundationSourceBoundResultCellV2Schema,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-source-v1-contracts';

import type {
  ExperimentFoundationScientificValidationV2Controller,
} from '../controllers/experiment-foundation-scientific-validation-v2-controller.js';

type RunParams = { run_id: string };

const runParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['run_id'],
  properties: { run_id: { type: 'string', minLength: 1 } },
} as const;

const errorResponses = {
  400: scientificValidationV2ErrorResponseSchema,
  404: scientificValidationV2ErrorResponseSchema,
  409: scientificValidationV2ErrorResponseSchema,
  422: scientificValidationV2ErrorResponseSchema,
  500: scientificValidationV2ErrorResponseSchema,
} as const;

export async function registerExperimentFoundationScientificValidationV2Routes(
  fastify: FastifyInstance,
  controller: ExperimentFoundationScientificValidationV2Controller,
): Promise<void> {
  fastify.post<{ Body: GenerateExperimentResultV2Request }>(
    '/experiment-foundation/v2/scientific-results',
    {
      schema: {
        body: generateExperimentResultV2RequestSchema,
        response: { 200: experimentFoundationSourceBoundResultCellV2Schema, ...errorResponses },
      },
      preValidation: rejectUnexpectedBodyKeys([
        'run_cell_id', 'scientific_source_output_id', 'idempotency_key',
      ]),
      errorHandler: handleRouteError,
    },
    controller.generateResult,
  );

  fastify.post<{ Body: ValidateScientificBatchV2Request }>(
    '/experiment-foundation/v2/scientific-validations',
    {
      schema: {
        body: validateScientificBatchV2RequestSchema,
        response: {
          200: validateScientificBatchV2ResponseSerializationSchema,
          ...errorResponses,
        },
      },
      preValidation: rejectUnexpectedBodyKeys([
        'run_id', 'expected_run_manifest_hash', 'idempotency_key',
      ]),
      errorHandler: handleRouteError,
    },
    controller.validateBatch,
  );

  fastify.get<{ Params: RunParams }>(
    '/experiment-foundation/v2/scientific-validations/:run_id',
    {
      schema: {
        params: runParamsSchema,
        response: {
          200: validateScientificBatchV2ResponseSerializationSchema,
          ...errorResponses,
        },
      },
      errorHandler: handleRouteError,
    },
    controller.getValidation,
  );
}

function rejectUnexpectedBodyKeys(expectedKeys: readonly string[]) {
  const expected = new Set(expectedKeys);
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) return;
    const unexpected = Object.keys(request.body).find((key) => !expected.has(key));
    if (!unexpected) return;
    await reply.status(400).send({
      error: {
        code: 'INVALID_PAYLOAD',
        message: `Caller-authored scientific field is not allowed: ${unexpected}`,
        details: { reason_code: 'VALIDATION_SCOPE_DRIFT' },
      },
    });
  };
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
        details: { reason_code: 'VALIDATION_SCOPE_DRIFT' },
      },
    });
    return;
  }
  request.log.error({ err: error }, 'experiment-foundation scientific route failed');
  await reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected experiment-foundation scientific route failure.',
    },
  });
}
