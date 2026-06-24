import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { TopicSelectionOfflineEvaluationReplayService } from '../services/topic-selection-offline-evaluation-replay-service.js';
import { TopicSelectionV1cDownstreamFeedbackRecheckService } from '../services/topic-selection-v1c-downstream-feedback-recheck-service.js';
import { TopicSelectionV1cHumanPromotionDecisionService } from '../services/topic-selection-v1c-human-promotion-decision-service.js';
import { TopicSelectionV1cN2BoundedDebateCoordinatorService } from '../services/topic-selection-v1c-n2-bounded-debate-coordinator-service.js';
import { TopicSelectionV1cPaperProjectBridgeService } from '../services/topic-selection-v1c-paper-project-bridge-service.js';
import { TopicSelectionV1cPromotionGateService } from '../services/topic-selection-v1c-promotion-gate-service.js';
import { TopicSelectionV1cPromotionInputService } from '../services/topic-selection-v1c-promotion-input-service.js';

type BodyRequest<T> = FastifyRequest<{ Body: T }>;
type ParamsRequest<T> = FastifyRequest<{ Params: T }>;

type PromotionInputSnapshotBody = Parameters<TopicSelectionV1cPromotionInputService['createPromotionInputSnapshot']>[0];
type PromotionGateSupportBody = Parameters<TopicSelectionV1cPromotionGateService['createPromotionGateSupport']>[0];
type PromotionDecisionSupportBody = Parameters<TopicSelectionV1cPromotionGateService['createPromotionDecisionSupport']>[0];
type PromotionDecisionSupportFromBoundedDebateBody =
  Parameters<TopicSelectionV1cN2BoundedDebateCoordinatorService['createPromotionDecisionSupportFromBoundedDebate']>[0];
type PromotionGateCheckBody =
  Parameters<TopicSelectionV1cPromotionGateService['createPromotionGateCheckFromSupport']>[0]
  & Partial<PromotionGateSupportBody>;
type HumanPromotionDecisionBody = Parameters<TopicSelectionV1cHumanPromotionDecisionService['recordHumanPromotionDecision']>[0];
type PaperProjectBridgeBody = Parameters<TopicSelectionV1cPaperProjectBridgeService['createPaperProjectBridge']>[0];
type PaperProjectBridgeIntakeBody = Omit<
  Parameters<TopicSelectionV1cPaperProjectBridgeService['createPaperProjectIntakeFromBridge']>[0],
  'paper_project_bridge_id'
>;
type DownstreamFeedbackBody = Parameters<TopicSelectionV1cDownstreamFeedbackRecheckService['recordDownstreamTopicFeedback']>[0];
export type V1cOfflineDatasetBody = Parameters<TopicSelectionOfflineEvaluationReplayService['createDataset']>[0];
type OfflineCaseBody = Parameters<TopicSelectionOfflineEvaluationReplayService['addCase']>[0];
type OfflineRunBody = Parameters<TopicSelectionOfflineEvaluationReplayService['startRun']>[0];
type OfflineCaseResultBody = Parameters<TopicSelectionOfflineEvaluationReplayService['recordFrozenCaseResult']>[0];

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

  const request = (reply as { request?: { log?: { error: (err: unknown, msg?: string) => void } } }).request;
  if (request?.log?.error) {
    request.log.error(error, 'topic-selection v1c error');
  } else {
    console.error('[topic-selection-v1c]', error);
  }
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected topic-selection v1c failure.',
    },
  });
}

export class TopicSelectionV1cController {
  constructor(
    private readonly promotionInput: TopicSelectionV1cPromotionInputService,
    private readonly promotionGate: TopicSelectionV1cPromotionGateService,
    private readonly humanPromotionDecision: TopicSelectionV1cHumanPromotionDecisionService,
    private readonly paperProjectBridge: TopicSelectionV1cPaperProjectBridgeService,
    private readonly downstreamFeedbackRecheck: TopicSelectionV1cDownstreamFeedbackRecheckService,
    private readonly offlineReplay: TopicSelectionOfflineEvaluationReplayService,
    private readonly n2BoundedDebateCoordinator: TopicSelectionV1cN2BoundedDebateCoordinatorService,
  ) {}

  createPromotionInputSnapshot = async (
    request: BodyRequest<PromotionInputSnapshotBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.promotionInput.createPromotionInputSnapshot(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getPromotionInputSnapshot = async (
    request: ParamsRequest<{ snapshotId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.promotionInput.getPromotionInputSnapshot(request.params.snapshotId);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createPromotionDecisionSupport = async (
    request: BodyRequest<PromotionDecisionSupportBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.promotionGate.createPromotionDecisionSupport(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  // T-128 W-13: the v1c-N2 bounded-debate production caller (operator-supplied codex_assisted role outputs ->
  // runtime -> admission -> verified-runtime-draft gate entry). Replaces the canary's admission-bypassing path.
  createPromotionDecisionSupportFromBoundedDebate = async (
    request: BodyRequest<PromotionDecisionSupportFromBoundedDebateBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.n2BoundedDebateCoordinator.createPromotionDecisionSupportFromBoundedDebate(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createPromotionGateCheck = async (
    request: BodyRequest<PromotionGateCheckBody>,
    reply: FastifyReply,
  ) => {
    try {
      const body = request.body;
      const result = body.promotion_decision_support_id || body.support_run_key
        ? await this.promotionGate.createPromotionGateCheckFromSupport(body)
        : await this.promotionGate.createPromotionGateSupport(body as PromotionGateSupportBody);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getPromotionDecisionSupport = async (
    request: ParamsRequest<{ supportId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.promotionGate.getPromotionDecisionSupport(request.params.supportId);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getPromotionDossier = async (
    request: ParamsRequest<{ dossierId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.promotionGate.getPromotionDossier(request.params.dossierId);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getArgumentReadinessMiniCheck = async (
    request: ParamsRequest<{ miniCheckId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.promotionGate.getArgumentReadinessMiniCheck(request.params.miniCheckId);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getPromotionGateCheck = async (
    request: ParamsRequest<{ gateCheckId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.promotionGate.getPromotionGateCheck(request.params.gateCheckId);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  recordHumanPromotionDecision = async (
    request: BodyRequest<HumanPromotionDecisionBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.humanPromotionDecision.recordHumanPromotionDecision(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getHumanPromotionDecision = async (
    request: ParamsRequest<{ humanPromotionDecisionId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.humanPromotionDecision.getHumanPromotionDecision(
        request.params.humanPromotionDecisionId,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getPromotionDecision = async (
    request: ParamsRequest<{ promotionDecisionId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.humanPromotionDecision.getPromotionDecision(request.params.promotionDecisionId);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getPromotionDecisionBundle = async (
    request: ParamsRequest<{ promotionDecisionId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.humanPromotionDecision.getPromotionDecisionBundle(
        request.params.promotionDecisionId,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getPromotionCommitmentProfile = async (
    request: ParamsRequest<{ commitmentProfileId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.humanPromotionDecision.getPromotionCommitmentProfile(
        request.params.commitmentProfileId,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createPaperProjectBridge = async (
    request: BodyRequest<PaperProjectBridgeBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.paperProjectBridge.createPaperProjectBridge(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getPaperProjectBridge = async (
    request: ParamsRequest<{ bridgeId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.paperProjectBridge.getPaperProjectBridge(request.params.bridgeId);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createPaperProjectIntakeFromBridge = async (
    request: FastifyRequest<{ Params: { bridgeId: string }; Body: PaperProjectBridgeIntakeBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.paperProjectBridge.createPaperProjectIntakeFromBridge({
        ...request.body,
        paper_project_bridge_id: request.params.bridgeId,
      });
      return reply.status(result.paper_project_created ? 201 : 200).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  recordDownstreamTopicFeedback = async (
    request: BodyRequest<DownstreamFeedbackBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.downstreamFeedbackRecheck.recordDownstreamTopicFeedback(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getDownstreamTopicFeedback = async (
    request: ParamsRequest<{ feedbackId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.downstreamFeedbackRecheck.getDownstreamTopicFeedback(request.params.feedbackId);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listDownstreamTopicFeedbackByBridge = async (
    request: ParamsRequest<{ bridgeId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.downstreamFeedbackRecheck.listDownstreamTopicFeedbackByBridge(
        request.params.bridgeId,
      );
      return reply.send({ items: result });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  // T-127 W-08: scoped, ranked, record-only recheck-advisory read projection for a bridge. The route path
  // (.../recheck-advisories) names the resource; the response uses the codebase's universal { items } list
  // envelope (matching the sibling listDownstreamTopicFeedbackByBridge on the same bridge resource).
  listDownstreamRecheckAdvisoriesByBridge = async (
    request: ParamsRequest<{ bridgeId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.downstreamFeedbackRecheck.listDownstreamRecheckAdvisoriesByBridge(
        request.params.bridgeId,
      );
      return reply.send({ items: result });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getDownstreamRecheckRequestByFeedback = async (
    request: ParamsRequest<{ feedbackId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.downstreamFeedbackRecheck.getDownstreamRecheckRequestByFeedback(
        request.params.feedbackId,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getDownstreamRecheckRequest = async (
    request: ParamsRequest<{ recheckRequestId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.downstreamFeedbackRecheck.getDownstreamRecheckRequest(
        request.params.recheckRequestId,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createOfflineEvaluationDataset = async (
    request: BodyRequest<V1cOfflineDatasetBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.offlineReplay.createDataset({
        ...(request.body ?? {}),
        stage: 'v1c',
      });
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createSyntheticOfflineEvaluationDataset = async (
    request: BodyRequest<V1cOfflineDatasetBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.offlineReplay.createSyntheticV1cBaselineDataset(request.body ?? {});
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  addOfflineEvaluationCase = async (request: BodyRequest<OfflineCaseBody>, reply: FastifyReply) => {
    try {
      const result = await this.offlineReplay.addCase(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  startOfflineEvaluationRun = async (request: BodyRequest<OfflineRunBody>, reply: FastifyReply) => {
    try {
      const result = await this.offlineReplay.startRunForStage(request.body, 'v1c');
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  recordOfflineEvaluationCaseResult = async (
    request: BodyRequest<OfflineCaseResultBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.offlineReplay.recordFrozenCaseResultForStage(request.body, 'v1c');
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  completeOfflineEvaluationRun = async (
    request: ParamsRequest<{ runId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.offlineReplay.completeRunAndCalculateMetricsForStage({
        run_id: request.params.runId,
        stage: 'v1c',
      });
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listOfflineEvaluationMetricResults = async (
    request: ParamsRequest<{ runId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.offlineReplay.listMetricResultsForStage(request.params.runId, 'v1c');
      return reply.send({ items: result });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listOfflineEvaluationReplayDiffs = async (
    request: ParamsRequest<{ runId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.offlineReplay.listReplayDiffsForStage(request.params.runId, 'v1c');
      return reply.send({ items: result });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-087 Phase 4 — list PromotionGateChecks for a title-card.
   */
  listPromotionGateChecksByTitleCard = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.promotionGate.listGateChecksByTitleCardId(request.params.titleCardId);
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-087 Phase 4 — list PromotionDecisions for a title-card.
   */
  listPromotionDecisionsByTitleCard = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.humanPromotionDecision.listPromotionDecisionsByTitleCardId(
        request.params.titleCardId,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-087 Phase 4 — list PaperProjectBridges for a title-card.
   */
  listPaperProjectBridgesByTitleCard = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.paperProjectBridge.listBridgesByTitleCardId(request.params.titleCardId);
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };
}
