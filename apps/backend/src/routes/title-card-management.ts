import type { FastifyInstance } from 'fastify';
import {
  createNeedReviewRequestSchema,
  createPackageRequestSchema,
  createPromotionDecisionRequestSchema,
  createResearchQuestionRequestSchema,
  createTitleCardRequestSchema,
  createValueAssessmentRequestSchema,
  evidenceCandidateQuerySchema,
  paramsTitleCardIdDecisionIdSchema,
  paramsTitleCardIdNeedIdSchema,
  paramsTitleCardIdPackageIdSchema,
  paramsTitleCardIdResearchQuestionIdSchema,
  paramsTitleCardIdSchema,
  paramsTitleCardIdValueAssessmentIdSchema,
  promoteTitleCardToPaperProjectRequestSchema,
  updateNeedReviewRequestSchema,
  updatePackageRequestSchema,
  updatePromotionDecisionRequestSchema,
  updateResearchQuestionRequestSchema,
  updateTitleCardEvidenceBasketRequestSchema,
  updateTitleCardRequestSchema,
  updateValueAssessmentRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/title-card-management-contracts';
import { TitleCardManagementController } from '../controllers/title-card-management.controller.js';

function withTitleCardParams<T extends { body?: unknown; querystring?: unknown }>(schema: T) {
  return { ...schema, params: paramsTitleCardIdSchema.params };
}

function withNeedParams<T extends { body?: unknown }>(schema: T) {
  return { ...schema, params: paramsTitleCardIdNeedIdSchema.params };
}

function withResearchQuestionParams<T extends { body?: unknown }>(schema: T) {
  return { ...schema, params: paramsTitleCardIdResearchQuestionIdSchema.params };
}

function withValueAssessmentParams<T extends { body?: unknown }>(schema: T) {
  return { ...schema, params: paramsTitleCardIdValueAssessmentIdSchema.params };
}

function withPackageParams<T extends { body?: unknown }>(schema: T) {
  return { ...schema, params: paramsTitleCardIdPackageIdSchema.params };
}

function withDecisionParams<T extends { body?: unknown }>(schema: T) {
  return { ...schema, params: paramsTitleCardIdDecisionIdSchema.params };
}

export async function registerTitleCardManagementRoutes(
  fastify: FastifyInstance,
  controller: TitleCardManagementController,
): Promise<void> {
  fastify.get('/title-cards', controller.listTitleCards);
  fastify.post('/title-cards', { schema: createTitleCardRequestSchema }, controller.createTitleCard);

  fastify.get('/title-cards/:titleCardId', { schema: paramsTitleCardIdSchema }, controller.getTitleCard);
  fastify.patch(
    '/title-cards/:titleCardId',
    { schema: withTitleCardParams(updateTitleCardRequestSchema) },
    controller.updateTitleCard,
  );

  fastify.get(
    '/title-cards/:titleCardId/evidence-basket',
    { schema: paramsTitleCardIdSchema },
    controller.getEvidenceBasket,
  );
  fastify.patch(
    '/title-cards/:titleCardId/evidence-basket',
    { schema: withTitleCardParams(updateTitleCardEvidenceBasketRequestSchema) },
    controller.updateEvidenceBasket,
  );
  fastify.get(
    '/title-cards/:titleCardId/evidence-candidates',
    { schema: { ...paramsTitleCardIdSchema, querystring: evidenceCandidateQuerySchema.querystring } },
    controller.listEvidenceCandidates,
  );

  fastify.get('/title-cards/:titleCardId/needs', { schema: paramsTitleCardIdSchema }, controller.listNeedReviews);
  fastify.post(
    '/title-cards/:titleCardId/needs',
    { schema: withTitleCardParams(createNeedReviewRequestSchema) },
    controller.createNeedReview,
  );
  fastify.get(
    '/title-cards/:titleCardId/needs/:needId',
    { schema: paramsTitleCardIdNeedIdSchema },
    controller.getNeedReview,
  );
  fastify.patch(
    '/title-cards/:titleCardId/needs/:needId',
    { schema: withNeedParams(updateNeedReviewRequestSchema) },
    controller.updateNeedReview,
  );

  fastify.get(
    '/title-cards/:titleCardId/research-questions',
    { schema: paramsTitleCardIdSchema },
    controller.listResearchQuestions,
  );
  fastify.post(
    '/title-cards/:titleCardId/research-questions',
    { schema: withTitleCardParams(createResearchQuestionRequestSchema) },
    controller.createResearchQuestion,
  );
  fastify.get(
    '/title-cards/:titleCardId/research-questions/:researchQuestionId',
    { schema: paramsTitleCardIdResearchQuestionIdSchema },
    controller.getResearchQuestion,
  );
  fastify.patch(
    '/title-cards/:titleCardId/research-questions/:researchQuestionId',
    { schema: withResearchQuestionParams(updateResearchQuestionRequestSchema) },
    controller.updateResearchQuestion,
  );

  fastify.get(
    '/title-cards/:titleCardId/value-assessments',
    { schema: paramsTitleCardIdSchema },
    controller.listValueAssessments,
  );
  fastify.post(
    '/title-cards/:titleCardId/value-assessments',
    { schema: withTitleCardParams(createValueAssessmentRequestSchema) },
    controller.createValueAssessment,
  );
  fastify.get(
    '/title-cards/:titleCardId/value-assessments/:valueAssessmentId',
    { schema: paramsTitleCardIdValueAssessmentIdSchema },
    controller.getValueAssessment,
  );
  fastify.patch(
    '/title-cards/:titleCardId/value-assessments/:valueAssessmentId',
    { schema: withValueAssessmentParams(updateValueAssessmentRequestSchema) },
    controller.updateValueAssessment,
  );

  fastify.get('/title-cards/:titleCardId/packages', { schema: paramsTitleCardIdSchema }, controller.listPackages);
  fastify.post(
    '/title-cards/:titleCardId/packages',
    { schema: withTitleCardParams(createPackageRequestSchema) },
    controller.createPackage,
  );
  fastify.get(
    '/title-cards/:titleCardId/packages/:packageId',
    { schema: paramsTitleCardIdPackageIdSchema },
    controller.getPackage,
  );
  fastify.patch(
    '/title-cards/:titleCardId/packages/:packageId',
    { schema: withPackageParams(updatePackageRequestSchema) },
    controller.updatePackage,
  );

  fastify.get(
    '/title-cards/:titleCardId/promotion-decisions',
    { schema: paramsTitleCardIdSchema },
    controller.listPromotionDecisions,
  );
  fastify.post(
    '/title-cards/:titleCardId/promotion-decisions',
    { schema: withTitleCardParams(createPromotionDecisionRequestSchema) },
    controller.createPromotionDecision,
  );
  fastify.get(
    '/title-cards/:titleCardId/promotion-decisions/:decisionId',
    { schema: paramsTitleCardIdDecisionIdSchema },
    controller.getPromotionDecision,
  );
  fastify.patch(
    '/title-cards/:titleCardId/promotion-decisions/:decisionId',
    { schema: withDecisionParams(updatePromotionDecisionRequestSchema) },
    controller.updatePromotionDecision,
  );

  fastify.post(
    '/title-cards/:titleCardId/promote-to-paper-project',
    { schema: withTitleCardParams(promoteTitleCardToPaperProjectRequestSchema) },
    controller.promoteTitleCardToPaperProject,
  );
}
