import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  CreateNeedReviewRequest,
  CreateTopicPackageRequest,
  CreateTopicPromotionDecisionRequest,
  CreateTopicQuestionRequest,
  CreateTopicValueAssessmentRequest,
  PromoteTopicToPaperProjectRequest,
} from '@paper-engineering-assistant/shared';
import { AppError } from '../errors/app-error.js';
import { TopicManagementService } from '../services/topic-management.service.js';

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
  const req = (reply as { request?: { log?: { error: (err: unknown, msg?: string) => void } } }).request;
  if (req?.log?.error) {
    req.log.error(error, 'topic management error');
  } else {
    console.error('[topic-management]', error);
  }
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected topic management failure.',
    },
  });
}

export class TopicManagementController {
  constructor(private readonly service: TopicManagementService) {}

  createNeedReview = async (
    request: FastifyRequest<{ Params: { topicId: string }; Body: CreateNeedReviewRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.createNeedReview(request.params.topicId, request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listNeedReviews = async (request: FastifyRequest<{ Params: { topicId: string } }>, reply: FastifyReply) => {
    try {
      const result = await this.service.listNeedReviews(request.params.topicId);
      return reply.send({ items: result });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createQuestion = async (
    request: FastifyRequest<{ Params: { topicId: string }; Body: CreateTopicQuestionRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.createQuestion(request.params.topicId, request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listQuestions = async (request: FastifyRequest<{ Params: { topicId: string } }>, reply: FastifyReply) => {
    try {
      const result = await this.service.listQuestions(request.params.topicId);
      return reply.send({ items: result });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listValueAssessments = async (
    request: FastifyRequest<{ Params: { topicId: string; questionId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.listValueAssessments(request.params.topicId, request.params.questionId);
      return reply.send({ items: result });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createValueAssessment = async (
    request: FastifyRequest<{ Params: { topicId: string; questionId: string }; Body: CreateTopicValueAssessmentRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.createValueAssessment(
        request.params.topicId,
        request.params.questionId,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createTopicPackage = async (
    request: FastifyRequest<{
      Params: { topicId: string; questionId: string; valueAssessmentId: string };
      Body: CreateTopicPackageRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.createTopicPackage(
        request.params.topicId,
        request.params.questionId,
        request.params.valueAssessmentId,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listTopicPackages = async (
    request: FastifyRequest<{ Params: { topicId: string; questionId: string; valueAssessmentId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.listTopicPackages(
        request.params.topicId,
        request.params.questionId,
        request.params.valueAssessmentId,
      );
      return reply.send({ items: result });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createPromotionDecision = async (
    request: FastifyRequest<{ Params: { topicId: string }; Body: CreateTopicPromotionDecisionRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.createPromotionDecision(request.params.topicId, request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  promoteTopicToPaperProject = async (
    request: FastifyRequest<{ Params: { topicId: string }; Body: PromoteTopicToPaperProjectRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.promoteTopicToPaperProject(request.params.topicId, request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };
}
