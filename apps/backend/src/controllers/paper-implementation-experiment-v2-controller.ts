import type {
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import type {
  PaperImplementationExperimentV2AdmissionRequest,
  PaperImplementationExperimentV2AdmissionResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import type {
  CloseValidationCycleV2Request,
  CloseValidationCycleV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';

import { AppError } from '../errors/app-error.js';

export interface PaperImplementationExperimentV2AdmissionUseCase {
  admit(input: {
    implementation_project_id: string;
    validation_cycle_id: string;
    request: PaperImplementationExperimentV2AdmissionRequest;
    admitted_by: string;
  }): Promise<PaperImplementationExperimentV2AdmissionResponse>;
}

export interface PaperImplementationValidationCycleClosureV2UseCase {
  close(request: CloseValidationCycleV2Request): Promise<CloseValidationCycleV2Response>;
}

type AdmissionParams = {
  implementation_project_id: string;
  validation_cycle_id: string;
};

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
  request?.log?.error({ err: error }, 'paper-implementation experiment v2 admission failed');
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected paper-implementation experiment v2 failure.',
    },
  });
}

export class PaperImplementationExperimentV2Controller {
  private readonly closure: PaperImplementationValidationCycleClosureV2UseCase;

  constructor(
    private readonly admission: PaperImplementationExperimentV2AdmissionUseCase,
    closure?: PaperImplementationValidationCycleClosureV2UseCase,
  ) {
    this.closure = closure ?? {
      async close() {
        throw new Error('ValidationCycle v2 closure use case is not composed.');
      },
    };
  }

  admitWorkOrderRevision = async (
    request: FastifyRequest<{
      Params: AdmissionParams;
      Body: PaperImplementationExperimentV2AdmissionRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const response = await this.admission.admit({
        implementation_project_id: request.params.implementation_project_id,
        validation_cycle_id: request.params.validation_cycle_id,
        request: request.body,
        // Pack A has no new RBAC product surface. The actor is server-owned and
        // cannot be supplied in the request body.
        admitted_by: 'system:paper-implementation-experiment-v2-admission',
      });
      return reply.status(201).send(response);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  closeValidationCycle = async (
    request: FastifyRequest<{
      Params: { validation_cycle_id: string };
      Body: CloseValidationCycleV2Request;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const response = await this.closure.close(request.body);
      return reply.status(201).send(response);
    } catch (error) {
      return handleError(reply, error);
    }
  };
}
