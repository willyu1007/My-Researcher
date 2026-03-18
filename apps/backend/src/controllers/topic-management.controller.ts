import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  CreateNeedReviewRequest,
  CreateTopicPackageRequest,
  CreateTopicPromotionDecisionRequest,
  CreateTopicQuestionRequest,
  CreateTopicValueAssessmentRequest,
  PromoteTopicToPaperProjectRequest,
} from '@paper-engineering-assistant/shared';
import { TopicManagementInvariantError, TopicManagementService } from '../services/topic-management.service.js';

function handleError(reply: FastifyReply, error: unknown) {
  if (error instanceof TopicManagementInvariantError) {
    return reply.status(400).send({ error: error.name, message: error.message });
  }
  return reply.status(500).send({ error: 'InternalServerError', message: 'Unexpected topic management failure.' });
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
