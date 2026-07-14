import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import {
  controlExecutionAttemptV2RequestSchema,
  executionAttemptV2EnvelopeSchema,
  experimentFoundationExecutionV2ErrorResponseSchema,
  startWorkflowSimulationV2ResponseSchema,
  startWorkflowSimulationV2RequestSchema,
  workflowSimulationStatusV2Schema,
  type ControlExecutionAttemptV2Request,
  type StartWorkflowSimulationV2Request,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-execution-v2-contracts';

import type {
  ExperimentFoundationExecutionV2Controller,
} from '../controllers/experiment-foundation-execution-v2-controller.js';
import { findForbiddenNestedField } from './experiment-v2-route-validation.js';

type RunParams = { run_id: string };
type AttemptParams = { attempt_id: string };

const runParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['run_id'],
  properties: {
    run_id: { type: 'string', minLength: 1 },
  },
} as const;

const attemptParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['attempt_id'],
  properties: {
    attempt_id: { type: 'string', minLength: 1 },
  },
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
  'scientific_execution_status',
  'task_spec_hash',
]);

async function rejectCallerAuthority(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const field = findForbiddenNestedField(request.body, callerAuthoredAuthorityFields);
  if (!field) {
    return;
  }
  await reply.status(400).send({
    error: {
      code: 'INVALID_PAYLOAD',
      message: `Caller-authored execution authority field is not allowed: ${field}`,
      details: { reason_code: 'PROVIDER_PAYLOAD_INVALID' },
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
        details: { reason_code: 'PROVIDER_PAYLOAD_INVALID' },
      },
    });
    return;
  }
  request.log.error(
    { err: error },
    'experiment-foundation execution v2 route failed outside controller boundary',
  );
  await reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected experiment-foundation execution v2 failure.',
    },
  });
}

export async function registerExperimentFoundationExecutionV2Routes(
  fastify: FastifyInstance,
  controller: ExperimentFoundationExecutionV2Controller,
): Promise<void> {
  fastify.post<{
    Params: RunParams;
    Body: StartWorkflowSimulationV2Request;
  }>(
    '/experiment-foundation/v2/runs/:run_id/workflow-simulations',
    {
      schema: {
        params: runParamsSchema,
        body: startWorkflowSimulationV2RequestSchema,
        response: {
          200: startWorkflowSimulationV2ResponseSchema,
          201: startWorkflowSimulationV2ResponseSchema,
          ...standardErrorResponses,
        },
      },
      preValidation: rejectCallerAuthority,
      errorHandler: handleRouteError,
    },
    controller.startWorkflowSimulation,
  );

  fastify.post<{
    Params: AttemptParams;
    Body: ControlExecutionAttemptV2Request;
  }>(
    '/experiment-foundation/v2/execution-attempts/:attempt_id/cancel',
    {
      schema: {
        params: attemptParamsSchema,
        body: controlExecutionAttemptV2RequestSchema,
        response: {
          202: executionAttemptV2EnvelopeSchema,
          ...standardErrorResponses,
        },
      },
      preValidation: rejectCallerAuthority,
      errorHandler: handleRouteError,
    },
    controller.cancelExecutionAttempt,
  );

  fastify.post<{
    Params: AttemptParams;
    Body: ControlExecutionAttemptV2Request;
  }>(
    '/experiment-foundation/v2/execution-attempts/:attempt_id/reconcile',
    {
      schema: {
        params: attemptParamsSchema,
        body: controlExecutionAttemptV2RequestSchema,
        response: {
          202: executionAttemptV2EnvelopeSchema,
          ...standardErrorResponses,
        },
      },
      preValidation: rejectCallerAuthority,
      errorHandler: handleRouteError,
    },
    controller.reconcileExecutionAttempt,
  );

  fastify.get<{ Params: AttemptParams }>(
    '/experiment-foundation/v2/execution-attempts/:attempt_id',
    {
      schema: {
        params: attemptParamsSchema,
        response: {
          200: executionAttemptV2EnvelopeSchema,
          ...standardErrorResponses,
        },
      },
      errorHandler: handleRouteError,
    },
    controller.getExecutionAttempt,
  );

  fastify.get<{ Params: RunParams }>(
    '/experiment-foundation/v2/runs/:run_id/workflow-simulation-status',
    {
      schema: {
        params: runParamsSchema,
        response: {
          200: workflowSimulationStatusV2Schema,
          ...standardErrorResponses,
        },
      },
      errorHandler: handleRouteError,
    },
    controller.getWorkflowSimulationStatus,
  );
}
