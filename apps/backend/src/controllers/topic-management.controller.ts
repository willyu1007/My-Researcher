import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  CreateNeedReviewRequest,
  CreatePackageRequest,
  CreatePromotionDecisionRequest,
  CreateResearchQuestionRequest,
  CreateTitleCardRequest,
  CreateValueAssessmentRequest,
  EvidenceCandidateQuery,
  PromoteTitleCardToPaperProjectRequest,
  UpdateNeedReviewRequest,
  UpdatePackageRequest,
  UpdatePromotionDecisionRequest,
  UpdateResearchQuestionRequest,
  UpdateTitleCardEvidenceBasketRequest,
  UpdateTitleCardRequest,
  UpdateValueAssessmentRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-management-contracts';
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
    req.log.error(error, 'title-card management error');
  } else {
    console.error('[title-card-management]', error);
  }
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected title-card management failure.',
    },
  });
}

export class TopicManagementController {
  constructor(private readonly service: TopicManagementService) {}

  listTitleCards = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.service.listTitleCards();
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createTitleCard = async (
    request: FastifyRequest<{ Body: CreateTitleCardRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.createTitleCard(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getTitleCard = async (
    request: FastifyRequest<{ Params: { titleCardId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.getTitleCard(request.params.titleCardId);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  updateTitleCard = async (
    request: FastifyRequest<{ Params: { titleCardId: string }; Body: UpdateTitleCardRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.updateTitleCard(request.params.titleCardId, request.body);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getEvidenceBasket = async (
    request: FastifyRequest<{ Params: { titleCardId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.getEvidenceBasket(request.params.titleCardId);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  updateEvidenceBasket = async (
    request: FastifyRequest<{ Params: { titleCardId: string }; Body: UpdateTitleCardEvidenceBasketRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.updateEvidenceBasket(request.params.titleCardId, request.body);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listEvidenceCandidates = async (
    request: FastifyRequest<{ Params: { titleCardId: string }; Querystring: EvidenceCandidateQuery }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.listEvidenceCandidates(request.params.titleCardId, request.query);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createNeedReview = async (
    request: FastifyRequest<{ Params: { titleCardId: string }; Body: CreateNeedReviewRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.createNeedReview(request.params.titleCardId, request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listNeedReviews = async (
    request: FastifyRequest<{ Params: { titleCardId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.listNeedReviews(request.params.titleCardId);
      return reply.send({ items: result });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getNeedReview = async (
    request: FastifyRequest<{ Params: { titleCardId: string; needId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.getNeedReview(request.params.titleCardId, request.params.needId);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  updateNeedReview = async (
    request: FastifyRequest<{ Params: { titleCardId: string; needId: string }; Body: UpdateNeedReviewRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.updateNeedReview(
        request.params.titleCardId,
        request.params.needId,
        request.body,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createResearchQuestion = async (
    request: FastifyRequest<{ Params: { titleCardId: string }; Body: CreateResearchQuestionRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.createResearchQuestion(request.params.titleCardId, request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listResearchQuestions = async (
    request: FastifyRequest<{ Params: { titleCardId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.listResearchQuestions(request.params.titleCardId);
      return reply.send({ items: result });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getResearchQuestion = async (
    request: FastifyRequest<{ Params: { titleCardId: string; researchQuestionId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.getResearchQuestion(
        request.params.titleCardId,
        request.params.researchQuestionId,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  updateResearchQuestion = async (
    request: FastifyRequest<{
      Params: { titleCardId: string; researchQuestionId: string };
      Body: UpdateResearchQuestionRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.updateResearchQuestion(
        request.params.titleCardId,
        request.params.researchQuestionId,
        request.body,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createValueAssessment = async (
    request: FastifyRequest<{ Params: { titleCardId: string }; Body: CreateValueAssessmentRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.createValueAssessment(request.params.titleCardId, request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listValueAssessments = async (
    request: FastifyRequest<{ Params: { titleCardId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.listValueAssessments(request.params.titleCardId);
      return reply.send({ items: result });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getValueAssessment = async (
    request: FastifyRequest<{ Params: { titleCardId: string; valueAssessmentId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.getValueAssessment(
        request.params.titleCardId,
        request.params.valueAssessmentId,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  updateValueAssessment = async (
    request: FastifyRequest<{
      Params: { titleCardId: string; valueAssessmentId: string };
      Body: UpdateValueAssessmentRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.updateValueAssessment(
        request.params.titleCardId,
        request.params.valueAssessmentId,
        request.body,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createPackage = async (
    request: FastifyRequest<{ Params: { titleCardId: string }; Body: CreatePackageRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.createPackage(request.params.titleCardId, request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listPackages = async (
    request: FastifyRequest<{ Params: { titleCardId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.listPackages(request.params.titleCardId);
      return reply.send({ items: result });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getPackage = async (
    request: FastifyRequest<{ Params: { titleCardId: string; packageId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.getPackage(request.params.titleCardId, request.params.packageId);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  updatePackage = async (
    request: FastifyRequest<{ Params: { titleCardId: string; packageId: string }; Body: UpdatePackageRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.updatePackage(
        request.params.titleCardId,
        request.params.packageId,
        request.body,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createPromotionDecision = async (
    request: FastifyRequest<{ Params: { titleCardId: string }; Body: CreatePromotionDecisionRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.createPromotionDecision(request.params.titleCardId, request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listPromotionDecisions = async (
    request: FastifyRequest<{ Params: { titleCardId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.listPromotionDecisions(request.params.titleCardId);
      return reply.send({ items: result });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getPromotionDecision = async (
    request: FastifyRequest<{ Params: { titleCardId: string; decisionId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.getPromotionDecision(
        request.params.titleCardId,
        request.params.decisionId,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  updatePromotionDecision = async (
    request: FastifyRequest<{
      Params: { titleCardId: string; decisionId: string };
      Body: UpdatePromotionDecisionRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.updatePromotionDecision(
        request.params.titleCardId,
        request.params.decisionId,
        request.body,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  promoteTitleCardToPaperProject = async (
    request: FastifyRequest<{ Params: { titleCardId: string }; Body: PromoteTitleCardToPaperProjectRequest }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.service.promoteTitleCardToPaperProject(request.params.titleCardId, request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };
}
