import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  StartRealProviderExecutionV2Request,
  StartRealProviderExecutionV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-execution-v2-contracts';

import { AppError } from '../errors/app-error.js';
import {
  ExperimentFoundationRealProviderIntakeV2Error,
} from '../services/experiment-foundation-real-provider-intake-v2-service.js';

interface ExperimentFoundationRealProviderV2UseCase {
  startForApi(
    runId: string,
    request: StartRealProviderExecutionV2Request,
  ): Promise<StartRealProviderExecutionV2Response>;
}

type RunParams = { run_id: string };

export class ExperimentFoundationRealProviderV2Controller {
  constructor(private readonly service: ExperimentFoundationRealProviderV2UseCase) {}

  start = async (
    request: FastifyRequest<{
      Params: RunParams;
      Body: StartRealProviderExecutionV2Request;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.startForApi(request.params.run_id, request.body);
      return reply.status(result.replayed ? 200 : 201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };
}

function handleError(reply: FastifyReply, error: unknown) {
  const mapped = error instanceof ExperimentFoundationRealProviderIntakeV2Error
    ? mapIntakeError(error)
    : error;
  if (mapped instanceof AppError) {
    return reply.status(mapped.statusCode).send({
      error: {
        code: mapped.errorCode,
        message: mapped.message,
        details: mapped.details,
      },
    });
  }
  const request = (reply as {
    request?: { log?: { error: (details: unknown, message?: string) => void } };
  }).request;
  request?.log?.error({ err: mapped }, 'experiment-foundation real-provider intake failed');
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected experiment-foundation real-provider intake failure.',
    },
  });
}

function mapIntakeError(error: ExperimentFoundationRealProviderIntakeV2Error): AppError {
  switch (error.reasonCode) {
    case 'EF_V2_REAL_PROVIDER_INTAKE_DISABLED':
      return new AppError(409, 'VERSION_CONFLICT', error.message, {
        reason_code: error.reasonCode,
      });
    case 'REAL_PROVIDER_TUPLE_INVALID':
      return new AppError(400, 'INVALID_PAYLOAD', error.message, {
        reason_code: error.reasonCode,
      });
    case 'EXECUTION_SCOPE_DRIFT':
      return new AppError(422, 'GATE_CONSTRAINT_FAILED', error.message, {
        reason_code: error.reasonCode,
      });
    case 'EXECUTION_ATTEMPT_STATE_CONFLICT':
      return new AppError(409, 'VERSION_CONFLICT', error.message, {
        reason_code: error.reasonCode,
      });
  }
}
