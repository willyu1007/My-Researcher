import type { FastifyInstance } from 'fastify';
import {
  createNeedReviewRequestSchema,
  createTopicPackageRequestSchema,
  createTopicPromotionDecisionRequestSchema,
  createTopicQuestionRequestSchema,
  createTopicValueAssessmentRequestSchema,
  promoteTopicToPaperProjectRequestSchema,
} from '@paper-engineering-assistant/shared';
import { TopicManagementController } from '../controllers/topic-management.controller.js';

export async function registerTopicManagementRoutes(
  fastify: FastifyInstance,
  controller: TopicManagementController,
): Promise<void> {
  fastify.get('/topics/:topicId/need-reviews', controller.listNeedReviews);
  fastify.post('/topics/:topicId/need-reviews', { schema: createNeedReviewRequestSchema }, controller.createNeedReview);

  fastify.get('/topics/:topicId/questions', controller.listQuestions);
  fastify.post('/topics/:topicId/questions', { schema: createTopicQuestionRequestSchema }, controller.createQuestion);

  fastify.post(
    '/topics/:topicId/questions/:questionId/value-assessments',
    { schema: createTopicValueAssessmentRequestSchema },
    controller.createValueAssessment,
  );

  fastify.post(
    '/topics/:topicId/questions/:questionId/value-assessments/:valueAssessmentId/topic-package',
    { schema: createTopicPackageRequestSchema },
    controller.createTopicPackage,
  );

  fastify.post(
    '/topics/:topicId/promotion-decisions',
    { schema: createTopicPromotionDecisionRequestSchema },
    controller.createPromotionDecision,
  );

  fastify.post(
    '/topics/:topicId/promote-to-paper-project',
    { schema: promoteTopicToPaperProjectRequestSchema },
    controller.promoteTopicToPaperProject,
  );
}
