import type { FastifyInstance } from 'fastify';
import {
  createNeedReviewRequestSchema,
  createTopicPackageRequestSchema,
  createTopicPromotionDecisionRequestSchema,
  createTopicQuestionRequestSchema,
  createTopicValueAssessmentRequestSchema,
  paramsTopicIdQuestionIdSchema,
  paramsTopicIdQuestionIdValueAssessmentIdSchema,
  paramsTopicIdSchema,
  promoteTopicToPaperProjectRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-management-contracts';
import { TopicManagementController } from '../controllers/topic-management.controller.js';

function withParamsTopicId<T extends { body?: unknown }>(schema: T) {
  return { ...schema, params: paramsTopicIdSchema.params };
}
function withParamsTopicIdQuestionId<T extends { body?: unknown }>(schema: T) {
  return { ...schema, params: paramsTopicIdQuestionIdSchema.params };
}
function withParamsTopicIdQuestionIdValueAssessmentId<T extends { body?: unknown }>(schema: T) {
  return { ...schema, params: paramsTopicIdQuestionIdValueAssessmentIdSchema.params };
}

export async function registerTopicManagementRoutes(
  fastify: FastifyInstance,
  controller: TopicManagementController,
): Promise<void> {
  fastify.get('/topics/:topicId/need-reviews', { schema: paramsTopicIdSchema }, controller.listNeedReviews);
  fastify.post(
    '/topics/:topicId/need-reviews',
    { schema: withParamsTopicId(createNeedReviewRequestSchema) },
    controller.createNeedReview,
  );

  fastify.get('/topics/:topicId/questions', { schema: paramsTopicIdSchema }, controller.listQuestions);
  fastify.post(
    '/topics/:topicId/questions',
    { schema: withParamsTopicId(createTopicQuestionRequestSchema) },
    controller.createQuestion,
  );

  fastify.get(
    '/topics/:topicId/questions/:questionId/value-assessments',
    { schema: paramsTopicIdQuestionIdSchema },
    controller.listValueAssessments,
  );
  fastify.post(
    '/topics/:topicId/questions/:questionId/value-assessments',
    { schema: withParamsTopicIdQuestionId(createTopicValueAssessmentRequestSchema) },
    controller.createValueAssessment,
  );

  fastify.get(
    '/topics/:topicId/questions/:questionId/value-assessments/:valueAssessmentId/topic-packages',
    { schema: paramsTopicIdQuestionIdValueAssessmentIdSchema },
    controller.listTopicPackages,
  );
  fastify.post(
    '/topics/:topicId/questions/:questionId/value-assessments/:valueAssessmentId/topic-package',
    { schema: withParamsTopicIdQuestionIdValueAssessmentId(createTopicPackageRequestSchema) },
    controller.createTopicPackage,
  );

  fastify.post(
    '/topics/:topicId/promotion-decisions',
    { schema: withParamsTopicId(createTopicPromotionDecisionRequestSchema) },
    controller.createPromotionDecision,
  );

  fastify.post(
    '/topics/:topicId/promote-to-paper-project',
    { schema: withParamsTopicId(promoteTopicToPaperProjectRequestSchema) },
    controller.promoteTopicToPaperProject,
  );
}
