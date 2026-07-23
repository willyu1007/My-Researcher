import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import {
  experimentFoundationExecutionV2ErrorResponseSchema,
  startRealProviderExecutionV2RequestSchema,
  startRealProviderExecutionV2ResponseSchema,
  type StartRealProviderExecutionV2Request,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-execution-v2-contracts';

import type {
  ExperimentFoundationRealProviderV2Controller,
} from '../controllers/experiment-foundation-real-provider-v2-controller.js';
import { findForbiddenNestedField } from './experiment-v2-route-validation.js';

type RunParams = { run_id: string };

const runParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['run_id'],
  properties: { run_id: { type: 'string', minLength: 1 } },
} as const;

const standardErrorResponses = {
  400: experimentFoundationExecutionV2ErrorResponseSchema,
  404: experimentFoundationExecutionV2ErrorResponseSchema,
  409: experimentFoundationExecutionV2ErrorResponseSchema,
  422: experimentFoundationExecutionV2ErrorResponseSchema,
  500: experimentFoundationExecutionV2ErrorResponseSchema,
} as const;

const callerAuthoredAuthorityFields = new Set([
  'adapter_kind',
  'execution_mode',
  'external_job_hash',
  'external_job_ref',
  'payload',
  'payload_hash',
  'provider_idempotency_key',
  'provider_payload',
  'provider_payload_hash',
  'run_manifest_hash',
  'task_spec_hash',
]);

export async function registerExperimentFoundationRealProviderV2Routes(
  fastify: FastifyInstance,
  controller: ExperimentFoundationRealProviderV2Controller,
): Promise<void> {
  fastify.post<{
    Params: RunParams;
    Body: StartRealProviderExecutionV2Request;
  }>(
    '/experiment-foundation/v2/runs/:run_id/real-provider-executions',
    {
      schema: {
        params: runParamsSchema,
        body: startRealProviderExecutionV2RequestSchema,
        response: {
          200: startRealProviderExecutionV2ResponseSchema,
          201: startRealProviderExecutionV2ResponseSchema,
          ...standardErrorResponses,
        },
      },
      preValidation: rejectCallerAuthority,
      errorHandler: handleRouteError,
    },
    controller.start,
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
      message: `Caller-authored real-provider authority field is not allowed: ${field}`,
      details: { reason_code: 'REAL_PROVIDER_TUPLE_INVALID' },
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
        details: { reason_code: 'REAL_PROVIDER_TUPLE_INVALID' },
      },
    });
    return;
  }
  request.log.error({ err: error }, 'experiment-foundation real-provider route failed');
  await reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected experiment-foundation real-provider route failure.',
    },
  });
}
