import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { TopicSelectionControlPlaneService } from '../services/topic-selection-control-plane-service.js';
import { TopicSelectionEvidenceMapService } from '../services/topic-selection-evidence-map-service.js';
import { TopicSelectionNeedValidationService } from '../services/topic-selection-need-validation-service.js';
import { TopicSelectionOfflineEvaluationReplayService } from '../services/topic-selection-offline-evaluation-replay-service.js';
import { TopicSelectionRecheckRiskMemoryService } from '../services/topic-selection-recheck-risk-memory-service.js';
import { TopicSelectionSearchResourceService } from '../services/topic-selection-search-resource-service.js';
import { TopicSelectionWorkflowHarnessService } from '../services/topic-selection-workflow-harness-service.js';
import type {
  TopicSelectionV1aWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1a-workflow-harness-contracts';

type BodyRequest<T> = FastifyRequest<{ Body: T }>;
type ParamsRequest<T> = FastifyRequest<{ Params: T }>;
type BodyParamsRequest<TBody, TParams> = FastifyRequest<{ Body: TBody; Params: TParams }>;

export type TopicSeedBody = Parameters<TopicSelectionSearchResourceService['createTopicSeedFromTitleCard']>[0];
export type LiteratureSnapshotBody = Parameters<TopicSelectionSearchResourceService['createLiteratureResourcePoolSnapshot']>[0];
export type SearchPlanBody = Parameters<TopicSelectionSearchResourceService['createSearchPlan']>[0];
export type SearchRunBody = Parameters<TopicSelectionSearchResourceService['recordSearchRun']>[0];
export type SearchPlanRecheckBody = Parameters<TopicSelectionSearchResourceService['createSearchPlanRecheckRequest']>[0];
export type ResolveSearchPlanRecheckBody =
  Omit<Parameters<TopicSelectionSearchResourceService['resolveSearchPlanRecheckRequest']>[0], 'request_id'>;
export type EvidenceMapBody = Parameters<TopicSelectionEvidenceMapService['createEvidenceMapFromSearchRun']>[0];
export type EvidenceStrengthBody = Parameters<TopicSelectionEvidenceMapService['assessEvidenceStrength']>[0];
export type MarkEvidenceMapStaleBody =
  Omit<Parameters<TopicSelectionEvidenceMapService['markEvidenceMapStale']>[0], 'evidence_map_id'>;
export type NeedCandidateBody = Parameters<TopicSelectionNeedValidationService['createNeedCandidateFromEvidenceMap']>[0];
export type ReadinessBody = Omit<
  Parameters<TopicSelectionNeedValidationService['assessCandidateReadiness']>[0],
  'need_candidate_id'
>;
export type SupportPacketBody = Parameters<TopicSelectionNeedValidationService['createValidationDecisionSupportPacket']>[0];
export type AdjudicationBody = Omit<Parameters<TopicSelectionNeedValidationService['adjudicateNeed']>[0], 'need_candidate_id'>;
export type ConfirmValidatedNeedBody = Omit<
  Parameters<TopicSelectionNeedValidationService['confirmValidatedNeed']>[0],
  'adjudication_result_id'
>;
export type V1bInputBundleBody = Parameters<TopicSelectionNeedValidationService['publishV1bInputBundle']>[0];
export type QualitySignalBody = Parameters<TopicSelectionControlPlaneService['emitQualitySignal']>[0];
export type InterpretQualitySignalBody = Omit<
  Parameters<TopicSelectionRecheckRiskMemoryService['interpretQualitySignal']>[0],
  'quality_signal_id'
>;
export type QueueSearchPlanRecheckBody = Omit<
  Parameters<TopicSelectionRecheckRiskMemoryService['queueSearchPlanRecheckRequest']>[0],
  'search_plan_recheck_request_id'
>;
export type AcceptedRiskBody = Parameters<TopicSelectionRecheckRiskMemoryService['acceptRisk']>[0];
export type MaterializeMemoryBody = Omit<
  Parameters<TopicSelectionRecheckRiskMemoryService['materializeCandidateMemorySuggestion']>[0],
  'memory_suggestion_id'
>;
export type OfflineDatasetBody = Parameters<TopicSelectionOfflineEvaluationReplayService['createDataset']>[0];
export type OfflineCaseBody = Parameters<TopicSelectionOfflineEvaluationReplayService['addCase']>[0];
export type OfflineRunBody = Parameters<TopicSelectionOfflineEvaluationReplayService['startRun']>[0];
export type OfflineCaseResultBody = Parameters<TopicSelectionOfflineEvaluationReplayService['recordFrozenCaseResult']>[0];
export type WorkflowHarnessRunBody = TopicSelectionV1aWorkflowHarnessRunRequest;
export type WorkflowHarnessArtifactBody = Parameters<TopicSelectionControlPlaneService['recordArtifactRef']>[0];

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
    request.log.error(error, 'topic-selection v1a error');
  } else {
    console.error('[topic-selection-v1a]', error);
  }
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected topic-selection v1a failure.',
    },
  });
}

export class TopicSelectionV1aController {
  constructor(
    private readonly controlPlane: TopicSelectionControlPlaneService,
    private readonly searchResources: TopicSelectionSearchResourceService,
    private readonly evidenceMaps: TopicSelectionEvidenceMapService,
    private readonly needValidation: TopicSelectionNeedValidationService,
    private readonly recheckRiskMemory: TopicSelectionRecheckRiskMemoryService,
    private readonly offlineReplay: TopicSelectionOfflineEvaluationReplayService,
    private readonly workflowHarness: TopicSelectionWorkflowHarnessService,
  ) {}

  invokeWorkflowHarnessNode = async (
    request: BodyParamsRequest<WorkflowHarnessRunBody, { nodeId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      if (request.body.node_id !== request.params.nodeId) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Workflow harness body node_id must match the route nodeId.');
      }
      const result = await this.workflowHarness.invokeNode(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  recordWorkflowHarnessArtifact = async (
    request: BodyRequest<WorkflowHarnessArtifactBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.controlPlane.recordArtifactRef(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getWorkflowHarnessArtifact = async (
    request: ParamsRequest<{ artifactRefId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.controlPlane.getArtifactRef(request.params.artifactRefId);
      if (!result) {
        throw new AppError(404, 'NOT_FOUND', 'Workflow harness artifact not found.');
      }
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createTopicSeedFromTitleCard = async (request: BodyRequest<TopicSeedBody>, reply: FastifyReply) => {
    try {
      const result = await this.searchResources.createTopicSeedFromTitleCard(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createLiteratureResourcePoolSnapshot = async (
    request: BodyRequest<LiteratureSnapshotBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.searchResources.createLiteratureResourcePoolSnapshot(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createSearchPlan = async (request: BodyRequest<SearchPlanBody>, reply: FastifyReply) => {
    try {
      const result = await this.searchResources.createSearchPlan(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  recordSearchRun = async (request: BodyRequest<SearchRunBody>, reply: FastifyReply) => {
    try {
      const result = await this.searchResources.recordSearchRun(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getCoverageMatrix = async (
    request: ParamsRequest<{ searchPlanId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.searchResources.getCoverageMatrix(request.params.searchPlanId);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createSearchPlanRecheckRequest = async (
    request: BodyRequest<SearchPlanRecheckBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.searchResources.createSearchPlanRecheckRequest(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  resolveSearchPlanRecheckRequest = async (
    request: BodyParamsRequest<ResolveSearchPlanRecheckBody, { requestId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.searchResources.resolveSearchPlanRecheckRequest({
        ...request.body,
        request_id: request.params.requestId,
      });
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createEvidenceMapFromSearchRun = async (request: BodyRequest<EvidenceMapBody>, reply: FastifyReply) => {
    try {
      const result = await this.evidenceMaps.createEvidenceMapFromSearchRun(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getNeedValidationEvidenceBundle = async (
    request: ParamsRequest<{ evidenceMapId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.evidenceMaps.getNeedValidationEvidenceBundle(request.params.evidenceMapId);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  assessEvidenceStrength = async (request: BodyRequest<EvidenceStrengthBody>, reply: FastifyReply) => {
    try {
      const result = await this.evidenceMaps.assessEvidenceStrength(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  markEvidenceMapStale = async (
    request: BodyParamsRequest<MarkEvidenceMapStaleBody, { evidenceMapId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.evidenceMaps.markEvidenceMapStale({
        ...request.body,
        evidence_map_id: request.params.evidenceMapId,
      });
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createNeedCandidateFromEvidenceMap = async (
    request: BodyRequest<NeedCandidateBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.needValidation.createNeedCandidateFromEvidenceMap(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  assessCandidateReadiness = async (
    request: BodyParamsRequest<ReadinessBody, { needCandidateId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.needValidation.assessCandidateReadiness({
        ...request.body,
        need_candidate_id: request.params.needCandidateId,
      });
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createValidationDecisionSupportPacket = async (
    request: BodyRequest<SupportPacketBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.needValidation.createValidationDecisionSupportPacket(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  adjudicateNeed = async (
    request: BodyParamsRequest<AdjudicationBody, { needCandidateId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.needValidation.adjudicateNeed({
        ...request.body,
        need_candidate_id: request.params.needCandidateId,
      });
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  confirmValidatedNeed = async (
    request: BodyParamsRequest<ConfirmValidatedNeedBody, { adjudicationResultId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.needValidation.confirmValidatedNeed({
        ...request.body,
        adjudication_result_id: request.params.adjudicationResultId,
      });
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  publishV1bInputBundle = async (request: BodyRequest<V1bInputBundleBody>, reply: FastifyReply) => {
    try {
      const result = await this.needValidation.publishV1bInputBundle(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  emitQualitySignal = async (request: BodyRequest<QualitySignalBody>, reply: FastifyReply) => {
    try {
      const result = await this.controlPlane.emitQualitySignal(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  interpretQualitySignal = async (
    request: BodyParamsRequest<InterpretQualitySignalBody, { qualitySignalId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.recheckRiskMemory.interpretQualitySignal({
        ...request.body,
        quality_signal_id: request.params.qualitySignalId,
      });
      return reply.status(result.queue_item ? 201 : 200).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  queueSearchPlanRecheckRequest = async (
    request: BodyParamsRequest<QueueSearchPlanRecheckBody, { requestId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.recheckRiskMemory.queueSearchPlanRecheckRequest({
        ...request.body,
        search_plan_recheck_request_id: request.params.requestId,
      });
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  materializeCandidateMemorySuggestion = async (
    request: BodyParamsRequest<MaterializeMemoryBody, { memorySuggestionId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.recheckRiskMemory.materializeCandidateMemorySuggestion({
        memory_suggestion_id: request.params.memorySuggestionId,
      });
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  acceptRisk = async (request: BodyRequest<AcceptedRiskBody>, reply: FastifyReply) => {
    try {
      const result = await this.recheckRiskMemory.acceptRisk(request.body);
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /** Read projection: accepted risks for a title-card (Phase 5 AcceptedRisk reviewer surface). */
  listAcceptedRisksByTitleCard = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.recheckRiskMemory.listAcceptedRisksByTitleCardId(request.params.titleCardId);
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listOpenWorkQueueItems = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.recheckRiskMemory.listOpenQueueItems();
      return reply.send({ items: result });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-087 D1 — list SearchPlans for a title-card. Reviewer workbench v1a
   * SearchPlan surface entry point.
   */
  listSearchPlansByTitleCard = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.searchResources.listSearchPlansByTitleCardId(request.params.titleCardId);
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-087 D1 — list EvidenceMaps for a title-card. Reviewer workbench v1a
   * EvidenceMap surface entry point.
   */
  listEvidenceMapsByTitleCard = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.evidenceMaps.listEvidenceMapsByTitleCardId(request.params.titleCardId);
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-087 D1 — list NeedCandidates for a title-card. Reviewer workbench v1a
   * NeedCandidate surface entry point.
   */
  listNeedCandidatesByTitleCard = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.needValidation.listNeedCandidatesByTitleCardId(request.params.titleCardId);
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-087 D1 — list ValidatedNeeds for a title-card. Reviewer workbench v1a
   * ValidatedNeed surface entry point.
   */
  listValidatedNeedsByTitleCard = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.needValidation.listValidatedNeedsByTitleCardId(request.params.titleCardId);
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-087 Phase 2.5 — list ValidationDecisionSupportPackets for a candidate.
   * Drives the adjudication confirm drawer's support_packet_id picker.
   */
  listValidationSupportPacketsByNeedCandidate = async (
    request: ParamsRequest<{ needCandidateId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.needValidation.listValidationSupportPacketsByNeedCandidateId(
        request.params.needCandidateId,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-087 Phase 2.4 — list CandidateDecisionMemorySuggestions for a candidate.
   * Drives the NeedCandidate inline negative-memory section.
   */
  listCandidateMemorySuggestionsByNeedCandidate = async (
    request: ParamsRequest<{ needCandidateId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.needValidation.listCandidateMemorySuggestionsByNeedCandidateId(
        request.params.needCandidateId,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-087 Phase 2.2 — list SearchPlanRecheckRequests for a title-card.
   * Drives the SearchPlan card's recheck-request inline list.
   */
  listSearchPlanRecheckRequestsByTitleCard = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.searchResources.listSearchPlanRecheckRequestsByTitleCardId(
        request.params.titleCardId,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-087 Phase 2.3 — list EvidenceUnits for an EvidenceMap.
   * Drives the EvidenceMap drilldown inline panel.
   */
  listEvidenceUnitsByEvidenceMap = async (
    request: ParamsRequest<{ evidenceMapId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.evidenceMaps.listEvidenceUnitsByEvidenceMapId(
        request.params.evidenceMapId,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createOfflineEvaluationDataset = async (
    request: BodyRequest<OfflineDatasetBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.offlineReplay.createDataset(request.body ?? {});
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createSyntheticOfflineEvaluationDataset = async (
    request: BodyRequest<OfflineDatasetBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.offlineReplay.createSyntheticV1aBaselineDataset(request.body ?? {});
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
      const result = await this.offlineReplay.startRun(request.body);
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
      const result = await this.offlineReplay.recordFrozenCaseResult(request.body);
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
      const result = await this.offlineReplay.completeRunAndCalculateMetrics({ run_id: request.params.runId });
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
      const result = await this.offlineReplay.listMetricResults(request.params.runId);
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
      const result = await this.offlineReplay.listReplayDiffs(request.params.runId);
      return reply.send({ items: result });
    } catch (error) {
      return handleError(reply, error);
    }
  };
}
