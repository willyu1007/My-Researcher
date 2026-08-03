import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  PaperImplementationSemanticIndexRebuildV2Response,
  PaperImplementationSemanticRetrievalV2Request,
  PaperImplementationSemanticRetrievalV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-semantic-retrieval-v2-contracts';

import { AppError } from '../errors/app-error.js';
import {
  PaperImplementationSemanticProjectionV2RepositoryError,
} from '../repositories/paper-implementation-semantic-projection-v2.repository.js';
import { LlmGatewayError } from '../services/llm-gateway.js';
import {
  PaperImplementationSemanticCandidateV2ServiceError,
} from '../services/paper-implementation-semantic-candidate-v2-service.js';
import {
  PaperImplementationExperimentLineageV2ServiceError,
} from '../services/paper-implementation-experiment-lineage-v2-service.js';
import {
  PaperImplementationSemanticIndexV2ServiceError,
} from '../services/paper-implementation-semantic-index-v2-service.js';
import {
  PaperImplementationSemanticRetrievalV2ServiceError,
} from '../services/paper-implementation-semantic-retrieval-v2-service.js';
import {
  PaperImplementationSemanticV2ServiceError,
} from '../services/paper-implementation-semantic-v2-service.js';

export interface PaperImplementationSemanticV2UseCase {
  rebuildProjectProjection(
    implementationProjectId: string,
    signal?: AbortSignal,
  ): Promise<PaperImplementationSemanticIndexRebuildV2Response>;

  retrieve(
    implementationProjectId: string,
    request: PaperImplementationSemanticRetrievalV2Request,
  ): Promise<PaperImplementationSemanticRetrievalV2Response>;
}

type ProjectParams = { implementation_project_id: string };

export class PaperImplementationSemanticV2Controller {
  constructor(private readonly service: PaperImplementationSemanticV2UseCase) {}

  rebuildProjectProjection = async (
    request: FastifyRequest<{ Params: ProjectParams }>,
    reply: FastifyReply,
  ) => {
    const requestAbort = createRequestAbortSignal(request, reply);
    try {
      const response = await this.service.rebuildProjectProjection(
        request.params.implementation_project_id,
        requestAbort.signal,
      );
      return reply.status(200).send(response);
    } catch (error) {
      return handleError(reply, error, 'semantic index rebuild');
    } finally {
      requestAbort.cleanup();
    }
  };

  retrieve = async (
    request: FastifyRequest<{
      Params: ProjectParams;
      Body: PaperImplementationSemanticRetrievalV2Request;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const response = await this.service.retrieve(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(200).send(response);
    } catch (error) {
      return handleError(reply, error, 'semantic retrieval');
    }
  };
}

function handleError(reply: FastifyReply, error: unknown, operation: string) {
  const mapped = mapSemanticError(error);
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
  request?.log?.error({ err: mapped }, `paper-implementation ${operation} failed`);
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: `Unexpected paper-implementation ${operation} failure.`,
    },
  });
}

function mapSemanticError(error: unknown): unknown {
  if (error instanceof AppError) return error;
  if (error instanceof PaperImplementationSemanticV2ServiceError) {
    switch (error.reasonCode) {
      case 'SEMANTIC_RETRIEVAL_V2_DISABLED':
      case 'SEMANTIC_REBUILD_CANCELLED':
        return semanticAppError(409, 'VERSION_CONFLICT', error);
      case 'SEMANTIC_EMBEDDING_CONFIGURATION_INVALID':
        return semanticAppError(422, 'GATE_CONSTRAINT_FAILED', error);
      case 'SEMANTIC_REBUILD_TIMEOUT':
        return semanticAppError(504, 'INTERNAL_ERROR', error);
    }
  }
  if (error instanceof PaperImplementationSemanticCandidateV2ServiceError) {
    return error.reasonCode === 'SEMANTIC_QUERY_INVALID'
      ? semanticAppError(400, 'INVALID_PAYLOAD', error)
      : semanticAppError(500, 'INTERNAL_ERROR', error);
  }
  if (error instanceof PaperImplementationExperimentLineageV2ServiceError) {
    return error.reasonCode === 'IMPLEMENTATION_PROJECT_NOT_FOUND'
      ? semanticAppError(404, 'NOT_FOUND', error)
      : semanticAppError(409, 'VERSION_CONFLICT', error);
  }
  if (error instanceof PaperImplementationSemanticIndexV2ServiceError) {
    switch (error.reasonCode) {
      case 'SEMANTIC_DOCUMENT_LIMIT_EXCEEDED':
        return semanticAppError(422, 'GATE_CONSTRAINT_FAILED', error);
      case 'SEMANTIC_SOURCE_DRIFT':
        return semanticAppError(409, 'VERSION_CONFLICT', error);
      case 'SEMANTIC_EMBEDDING_INVALID':
        return semanticAppError(502, 'INTERNAL_ERROR', error);
    }
  }
  if (error instanceof PaperImplementationSemanticRetrievalV2ServiceError) {
    return error.reasonCode === 'SEMANTIC_RESULT_LIMIT_INVALID'
      ? semanticAppError(400, 'INVALID_PAYLOAD', error)
      : semanticAppError(500, 'INTERNAL_ERROR', error);
  }
  if (error instanceof PaperImplementationSemanticProjectionV2RepositoryError) {
    switch (error.reasonCode) {
      case 'IMPLEMENTATION_PROJECT_NOT_FOUND':
        return semanticAppError(404, 'NOT_FOUND', error);
      case 'PROJECTION_INPUT_INVALID':
        return semanticAppError(422, 'GATE_CONSTRAINT_FAILED', error);
      case 'PROJECTION_QUERY_INVALID':
        return semanticAppError(400, 'INVALID_PAYLOAD', error);
      case 'PROJECTION_QUERY_TIMEOUT':
        return semanticAppError(502, 'INTERNAL_ERROR', error);
      case 'PROJECTION_STORED_INTEGRITY_ERROR':
        return semanticAppError(500, 'INTERNAL_ERROR', error);
    }
  }
  if (error instanceof LlmGatewayError) {
    const status = error.code === 'AuthError' || error.code === 'InvalidRequestError'
      ? 422
      : 502;
    const code = status === 422 ? 'GATE_CONSTRAINT_FAILED' : 'INTERNAL_ERROR';
    return new AppError(
      status,
      code,
      status === 422
        ? 'The active embedding provider configuration cannot serve semantic retrieval v2.'
        : 'The embedding provider is unavailable.',
      { reason_code: 'SEMANTIC_EMBEDDING_PROVIDER_UNAVAILABLE' },
    );
  }
  return error;
}

function createRequestAbortSignal(
  request: FastifyRequest,
  reply: FastifyReply,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const abortIfUnfinished = () => {
    if (!reply.raw.writableEnded) abort();
  };
  request.raw.once('aborted', abort);
  reply.raw.once('close', abortIfUnfinished);
  if (request.raw.aborted) abort();
  return {
    signal: controller.signal,
    cleanup: () => {
      request.raw.removeListener('aborted', abort);
      reply.raw.removeListener('close', abortIfUnfinished);
    },
  };
}

function semanticAppError(
  statusCode: number,
  errorCode: 'INVALID_PAYLOAD' | 'NOT_FOUND' | 'VERSION_CONFLICT'
    | 'GATE_CONSTRAINT_FAILED' | 'INTERNAL_ERROR',
  error: { message: string; reasonCode: string },
): AppError {
  return new AppError(statusCode, errorCode, error.message, {
    reason_code: error.reasonCode,
  });
}
