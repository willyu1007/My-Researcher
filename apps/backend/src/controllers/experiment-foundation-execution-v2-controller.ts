import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  ControlExecutionAttemptV2Request,
  ExecutionAttemptV2,
  StartWorkflowSimulationV2Request,
  StartWorkflowSimulationV2Response,
  WorkflowSimulationStatusV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-execution-v2-contracts';

import { AppError } from '../errors/app-error.js';

export interface ExperimentFoundationExecutionV2UseCase {
  startWorkflowSimulation(
    runId: string,
    request: StartWorkflowSimulationV2Request,
  ): Promise<StartWorkflowSimulationV2Response>;
  cancelExecutionAttempt(
    attemptId: string,
    request: ControlExecutionAttemptV2Request,
  ): Promise<ExecutionAttemptV2>;
  reconcileExecutionAttempt(
    attemptId: string,
    request: ControlExecutionAttemptV2Request,
  ): Promise<ExecutionAttemptV2>;
  getExecutionAttempt(attemptId: string): Promise<ExecutionAttemptV2>;
  getWorkflowSimulationStatus(runId: string): Promise<WorkflowSimulationStatusV2>;
}

type RunParams = { run_id: string };
type AttemptParams = { attempt_id: string };

function handleError(reply: FastifyReply, error: unknown) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.errorCode,
        message: error.message,
        details: error.details,
      },
    });
  }

  const request = (reply as {
    request?: { log?: { error: (details: unknown, message?: string) => void } };
  }).request;
  request?.log?.error({ err: error }, 'experiment-foundation execution v2 command failed');
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected experiment-foundation execution v2 failure.',
    },
  });
}

export class ExperimentFoundationExecutionV2Controller {
  constructor(private readonly service: ExperimentFoundationExecutionV2UseCase) {}

  startWorkflowSimulation = async (
    request: FastifyRequest<{
      Params: RunParams;
      Body: StartWorkflowSimulationV2Request;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.startWorkflowSimulation(
        request.params.run_id,
        request.body,
      );
      return reply.status(result.replayed ? 200 : 201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  cancelExecutionAttempt = async (
    request: FastifyRequest<{
      Params: AttemptParams;
      Body: ControlExecutionAttemptV2Request;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const attempt = await this.service.cancelExecutionAttempt(
        request.params.attempt_id,
        request.body,
      );
      return reply.status(202).send({ execution_attempt: attempt });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  reconcileExecutionAttempt = async (
    request: FastifyRequest<{
      Params: AttemptParams;
      Body: ControlExecutionAttemptV2Request;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const attempt = await this.service.reconcileExecutionAttempt(
        request.params.attempt_id,
        request.body,
      );
      return reply.status(202).send({ execution_attempt: attempt });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getExecutionAttempt = async (
    request: FastifyRequest<{ Params: AttemptParams }>,
    reply: FastifyReply,
  ) => {
    try {
      const attempt = await this.service.getExecutionAttempt(request.params.attempt_id);
      return reply.status(200).send({ execution_attempt: attempt });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getWorkflowSimulationStatus = async (
    request: FastifyRequest<{ Params: RunParams }>,
    reply: FastifyReply,
  ) => {
    try {
      const status = await this.service.getWorkflowSimulationStatus(request.params.run_id);
      return reply.status(200).send(status);
    } catch (error) {
      return handleError(reply, error);
    }
  };
}
