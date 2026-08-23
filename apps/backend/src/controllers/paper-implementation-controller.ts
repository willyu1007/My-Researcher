import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  BootstrapImplementationProjectRequest,
  CreatePaperImplementationCoreMotiveHandoffRequest,
  CreatePaperImplementationScientificContinuationRequest,
  CreatePaperImplementationTopicHandoffRequest,
  RecordImplementationFeedbackEventRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  CreateCitationCandidateRequest,
  CreateClaimTracePacketRequest,
  CreateTraceManifestRequest,
  EvaluateTraceGateRequest,
  RegisterNaturalLanguageFieldRoleRequest,
  ResolveTraceRepairQueueItemRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  AdmitCoreMotiveVersionRequest,
  ApplyMotivePortfolioDecisionRequest,
  CreateCoreMotiveDraftRequest,
  CreateCrossBoardReviewRequest,
  CreateEvidenceTransferBindingRequest,
  CreateMotiveEvidenceBoardVersionRequest,
  CreateMotiveEvolutionDecisionRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import type {
  AdmitValidationCycleRequest,
  CompleteValidationCycleRequest,
  CreateExperimentPlanLightRequest,
  CreateFeasibilityProbeRequest,
  CreateTechnicalRouteCandidateRequest,
  CreateValidationCycleDraftRequest,
  CreateValidationUpstreamFeedbackCandidateRequest,
  DispatchValidationUpstreamFeedbackCandidateRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import type {
  AdmitResearchWorkOrderRequest,
  CreateResearchWorkOrderDraftRequest,
  RecordRunMonitorIntakeRequest,
  SubmitResearchWorkOrderHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-workorder-contracts';
import type {
  CreateClaimCandidateRequest,
  CreateImplementationDossierRequest,
  CreateResultInterpretationPacketRequest,
  CreateWritingEntryPacketRequest,
  RecordResultClaimFeedbackEventRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  CreateAgentWorkflowHarnessRunRequest,
  CreateImplementationHarnessRequest,
  CreateImplementationInputSnapshotRequest,
  ResolveDecisionWorkQueueItemRequest,
  ResolveDecisionWorkQueueItemResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-ai-workflow-harness-contracts';
import type {
  CancelLiveExperimentRunRequest,
  CollectLiveExperimentRunRequest,
  SubmitLiveExperimentRunRequest,
  SyncLiveExperimentRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-live-experiment-adapter-contracts';
import type {
  RunProviderVarianceEvaluationRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-provider-variance-contracts';
import {
  PAPER_IMPLEMENTATION_COORDINATOR_TERMINAL_RUN_STATUSES,
  type AdvancePaperImplementationCoordinatorRunRequest,
  type CreatePaperImplementationCoordinatorRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';
import type {
  AdmitPaperImplementationRuntimeArtifactRequestPayload,
  ListPaperImplementationRuntimeAdmissionRecordsQuery,
  ListPaperImplementationRuntimeArtifactsQuery,
  RunPaperImplementationCrossBoardSynthesisRuntimeRequest,
  RunPaperImplementationEvidenceBoardCurationRuntimeRequest,
  RunPaperImplementationExperimentPlanningRuntimeRequest,
  RunPaperImplementationFeasibilityPlanningRuntimeRequest,
  RunPaperImplementationMotiveEvolutionRuntimeRequest,
  RunPaperImplementationMotiveDecompositionRuntimeRequest,
  RunPaperImplementationP1RuntimeReviewRequest,
  RunPaperImplementationRoutePlanningRuntimeRequest,
  RunPaperImplementationValidationCyclePlanningRuntimeRequest,
  RunPaperImplementationResultAnalysisRuntimeRequest,
  RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';

import { AppError } from '../errors/app-error.js';
import { PaperImplementationIntakeBootstrapService } from '../services/paper-implementation-intake-bootstrap-service.js';
import { PaperImplementationTopicHandoffService } from '../services/paper-implementation-topic-handoff-service.js';
import { PaperImplementationScientificContinuationService } from '../services/paper-implementation-scientific-continuation-service.js';
import { PaperImplementationCoreMotiveHandoffService } from '../services/paper-implementation-core-motive-handoff-service.js';
import { PaperImplementationMotiveEvidenceBoardService } from '../services/paper-implementation-motive-evidence-board-service.js';
import { PaperImplementationTraceKernelService } from '../services/paper-implementation-trace-kernel-service.js';
import { PaperImplementationValidationCyclePlanningService } from '../services/paper-implementation-validation-cycle-planning-service.js';
import { PaperImplementationWorkOrderExperimentBridgeService } from '../services/paper-implementation-workorder-experiment-bridge-service.js';
import { PaperImplementationResultClaimDossierService } from '../services/paper-implementation-result-claim-dossier-service.js';
import { PaperImplementationAiWorkflowHarnessService } from '../services/paper-implementation-ai-workflow-harness-service.js';
import { PaperImplementationLiveExperimentAdapterService } from '../services/paper-implementation-live-experiment-adapter-service.js';
import { PaperImplementationProviderVarianceEvaluationService } from '../services/paper-implementation-provider-variance-evaluation-service.js';
import { PaperImplementationRuntimeAdmissionService } from '../services/paper-implementation-runtime-admission-service.js';
import { PaperImplementationTraceIntegrityDebateRuntimeService } from '../services/paper-implementation-trace-integrity-debate-runtime-service.js';
import { PaperImplementationP1RuntimeReviewService } from '../services/paper-implementation-p1-runtime-review-service.js';
import { PaperImplementationResultAnalysisRuntimeService } from '../services/paper-implementation-result-analysis-runtime-service.js';
import { PaperImplementationExperimentPlanningRuntimeService } from '../services/paper-implementation-experiment-planning-runtime-service.js';
import { PaperImplementationRoutePlanningRuntimeService } from '../services/paper-implementation-route-planning-runtime-service.js';
import { PaperImplementationValidationCyclePlanningRuntimeService } from '../services/paper-implementation-validation-cycle-planning-runtime-service.js';
import { PaperImplementationFeasibilityPlanningRuntimeService } from '../services/paper-implementation-feasibility-planning-runtime-service.js';
import { PaperImplementationCrossBoardSynthesisRuntimeService } from '../services/paper-implementation-cross-board-synthesis-runtime-service.js';
import { PaperImplementationEvidenceBoardCurationRuntimeService } from '../services/paper-implementation-evidence-board-curation-runtime-service.js';
import { PaperImplementationMotiveDecompositionRuntimeService } from '../services/paper-implementation-motive-decomposition-runtime-service.js';
import { PaperImplementationMotiveEvolutionRuntimeService } from '../services/paper-implementation-motive-evolution-runtime-service.js';
import { PaperImplementationRuntimeDomainGateService } from '../services/paper-implementation-runtime-domain-gate-service.js';
import { PaperImplementationRunCoordinatorService } from '../services/paper-implementation-run-coordinator-service.js';
import { PaperImplementationRuntimeTelemetryService } from '../services/paper-implementation-runtime-telemetry-service.js';
import { PaperImplementationHumanConfirmationService } from '../services/paper-implementation-human-confirmation-service.js';
import type {
  CreateHumanConfirmationRecordRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-human-confirmation-contracts';

type BodyRequest<T> = FastifyRequest<{ Body: T }>;
type ParamsRequest<T> = FastifyRequest<{ Params: T }>;

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
    request.log.error(error, 'paper-implementation error');
  } else {
    console.error('[paper-implementation]', error);
  }
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected paper-implementation failure.',
    },
  });
}

export interface PaperImplementationControllerDependencies {
  intakeBootstrap: PaperImplementationIntakeBootstrapService;
  topicHandoff?: PaperImplementationTopicHandoffService;
  coreMotiveHandoff?: PaperImplementationCoreMotiveHandoffService;
  scientificContinuation?: PaperImplementationScientificContinuationService;
  traceKernel: PaperImplementationTraceKernelService;
  motiveEvidenceBoard: PaperImplementationMotiveEvidenceBoardService;
  validationCyclePlanning: PaperImplementationValidationCyclePlanningService;
  workOrderExperimentBridge: PaperImplementationWorkOrderExperimentBridgeService;
  resultClaimDossier: PaperImplementationResultClaimDossierService;
  aiWorkflowHarness: PaperImplementationAiWorkflowHarnessService;
  runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  traceIntegrityDebateRuntime: PaperImplementationTraceIntegrityDebateRuntimeService;
  p1RuntimeReview: PaperImplementationP1RuntimeReviewService;
  resultAnalysisRuntime: PaperImplementationResultAnalysisRuntimeService;
  experimentPlanningRuntime: PaperImplementationExperimentPlanningRuntimeService;
  routePlanningRuntime: PaperImplementationRoutePlanningRuntimeService;
  validationCyclePlanningRuntime: PaperImplementationValidationCyclePlanningRuntimeService;
  feasibilityPlanningRuntime: PaperImplementationFeasibilityPlanningRuntimeService;
  crossBoardSynthesisRuntime: PaperImplementationCrossBoardSynthesisRuntimeService;
  evidenceBoardCurationRuntime: PaperImplementationEvidenceBoardCurationRuntimeService;
  motiveDecompositionRuntime: PaperImplementationMotiveDecompositionRuntimeService;
  motiveEvolutionRuntime: PaperImplementationMotiveEvolutionRuntimeService;
  runtimeDomainGate: PaperImplementationRuntimeDomainGateService;
  runCoordinator?: PaperImplementationRunCoordinatorService;
  runtimeTelemetry?: PaperImplementationRuntimeTelemetryService;
  humanConfirmation: PaperImplementationHumanConfirmationService;
  liveExperimentAdapter?: PaperImplementationLiveExperimentAdapterService;
  providerVarianceEvaluation?: PaperImplementationProviderVarianceEvaluationService;
}

export class PaperImplementationController {
  private readonly intakeBootstrap: PaperImplementationIntakeBootstrapService;
  private readonly topicHandoff?: PaperImplementationTopicHandoffService;
  private readonly coreMotiveHandoff?: PaperImplementationCoreMotiveHandoffService;
  private readonly scientificContinuation?: PaperImplementationScientificContinuationService;
  private readonly traceKernel: PaperImplementationTraceKernelService;
  private readonly motiveEvidenceBoard: PaperImplementationMotiveEvidenceBoardService;
  private readonly validationCyclePlanning: PaperImplementationValidationCyclePlanningService;
  private readonly workOrderExperimentBridge: PaperImplementationWorkOrderExperimentBridgeService;
  private readonly resultClaimDossier: PaperImplementationResultClaimDossierService;
  private readonly aiWorkflowHarness: PaperImplementationAiWorkflowHarnessService;
  private readonly runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  private readonly traceIntegrityDebateRuntime: PaperImplementationTraceIntegrityDebateRuntimeService;
  private readonly p1RuntimeReview: PaperImplementationP1RuntimeReviewService;
  private readonly resultAnalysisRuntime: PaperImplementationResultAnalysisRuntimeService;
  private readonly experimentPlanningRuntime: PaperImplementationExperimentPlanningRuntimeService;
  private readonly routePlanningRuntime: PaperImplementationRoutePlanningRuntimeService;
  private readonly validationCyclePlanningRuntime: PaperImplementationValidationCyclePlanningRuntimeService;
  private readonly feasibilityPlanningRuntime: PaperImplementationFeasibilityPlanningRuntimeService;
  private readonly crossBoardSynthesisRuntime: PaperImplementationCrossBoardSynthesisRuntimeService;
  private readonly evidenceBoardCurationRuntime: PaperImplementationEvidenceBoardCurationRuntimeService;
  private readonly motiveDecompositionRuntime: PaperImplementationMotiveDecompositionRuntimeService;
  private readonly motiveEvolutionRuntime: PaperImplementationMotiveEvolutionRuntimeService;
  private readonly runtimeDomainGate: PaperImplementationRuntimeDomainGateService;
  private readonly runCoordinator?: PaperImplementationRunCoordinatorService;
  private readonly runtimeTelemetry?: PaperImplementationRuntimeTelemetryService;
  private readonly humanConfirmation: PaperImplementationHumanConfirmationService;
  private readonly liveExperimentAdapter?: PaperImplementationLiveExperimentAdapterService;
  private readonly providerVarianceEvaluation?: PaperImplementationProviderVarianceEvaluationService;

  constructor(dependencies: PaperImplementationControllerDependencies) {
    this.intakeBootstrap = dependencies.intakeBootstrap;
    this.topicHandoff = dependencies.topicHandoff;
    this.coreMotiveHandoff = dependencies.coreMotiveHandoff;
    this.scientificContinuation = dependencies.scientificContinuation;
    this.traceKernel = dependencies.traceKernel;
    this.motiveEvidenceBoard = dependencies.motiveEvidenceBoard;
    this.validationCyclePlanning = dependencies.validationCyclePlanning;
    this.workOrderExperimentBridge = dependencies.workOrderExperimentBridge;
    this.resultClaimDossier = dependencies.resultClaimDossier;
    this.aiWorkflowHarness = dependencies.aiWorkflowHarness;
    this.runtimeAdmission = dependencies.runtimeAdmission;
    this.traceIntegrityDebateRuntime = dependencies.traceIntegrityDebateRuntime;
    this.p1RuntimeReview = dependencies.p1RuntimeReview;
    this.resultAnalysisRuntime = dependencies.resultAnalysisRuntime;
    this.experimentPlanningRuntime = dependencies.experimentPlanningRuntime;
    this.routePlanningRuntime = dependencies.routePlanningRuntime;
    this.validationCyclePlanningRuntime = dependencies.validationCyclePlanningRuntime;
    this.feasibilityPlanningRuntime = dependencies.feasibilityPlanningRuntime;
    this.crossBoardSynthesisRuntime = dependencies.crossBoardSynthesisRuntime;
    this.evidenceBoardCurationRuntime = dependencies.evidenceBoardCurationRuntime;
    this.motiveDecompositionRuntime = dependencies.motiveDecompositionRuntime;
    this.motiveEvolutionRuntime = dependencies.motiveEvolutionRuntime;
    this.runtimeDomainGate = dependencies.runtimeDomainGate;
    this.runCoordinator = dependencies.runCoordinator;
    this.runtimeTelemetry = dependencies.runtimeTelemetry;
    this.humanConfirmation = dependencies.humanConfirmation;
    this.liveExperimentAdapter = dependencies.liveExperimentAdapter;
    this.providerVarianceEvaluation = dependencies.providerVarianceEvaluation;
  }

  createHumanConfirmationRecord = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateHumanConfirmationRecordRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const record = await this.humanConfirmation.createHumanConfirmationRecord(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(record);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listHumanConfirmationRecords = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.humanConfirmation.listHumanConfirmationRecords(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  bootstrapProject = async (
    request: BodyRequest<BootstrapImplementationProjectRequest>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.intakeBootstrap.bootstrapProject(request.body);
      return reply.status(result.project_created ? 201 : 200).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createTopicHandoff = async (
    request: BodyRequest<CreatePaperImplementationTopicHandoffRequest>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.requireTopicHandoff().continueFromTopic(request.body);
      return reply.status(result.status === 'created' ? 201 : 200).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  continueScientificDossier = async (
    request: BodyRequest<CreatePaperImplementationScientificContinuationRequest>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.requireScientificContinuation().continue(request.body);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createCoreMotiveHandoff = async (
    request: BodyRequest<CreatePaperImplementationCoreMotiveHandoffRequest>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.requireCoreMotiveHandoff().continue(request.body);
      return reply.status(result.status === 'created' ? 201 : 200).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getProject = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.intakeBootstrap.getProject(request.params.implementation_project_id);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getProjectByBridge = async (
    request: ParamsRequest<{ paper_project_bridge_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.intakeBootstrap.getProjectByBridge(request.params.paper_project_bridge_id);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  recordFeedbackEvent = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RecordImplementationFeedbackEventRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.intakeBootstrap.recordFeedbackEvent(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createTraceManifest = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateTraceManifestRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.traceKernel.createTraceManifest(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listTraceManifests = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.traceKernel.listTraceManifests(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getTraceManifest = async (
    request: ParamsRequest<{
      implementation_project_id: string;
      trace_manifest_id: string;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.traceKernel.getTraceManifest(
        request.params.implementation_project_id,
        request.params.trace_manifest_id,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createCitationCandidate = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateCitationCandidateRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.traceKernel.createCitationCandidate(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listCitationCandidates = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.traceKernel.listCitationCandidates(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createClaimTracePacket = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateClaimTracePacketRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.traceKernel.createClaimTracePacket(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listClaimTracePackets = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.traceKernel.listClaimTracePackets(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  registerNaturalLanguageFieldRole = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RegisterNaturalLanguageFieldRoleRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.traceKernel.registerNaturalLanguageFieldRole(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  evaluateTraceGate = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: EvaluateTraceGateRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.traceKernel.evaluateTraceGate(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listTraceRepairQueue = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.traceKernel.listTraceRepairQueue(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  resolveTraceRepairQueueItem = async (
    request: FastifyRequest<{
      Params: {
        implementation_project_id: string;
        queue_item_id: string;
      };
      Body: ResolveTraceRepairQueueItemRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.traceKernel.resolveTraceRepairQueueItem(
        request.params.implementation_project_id,
        request.params.queue_item_id,
        request.body,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createCoreMotiveDraft = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateCoreMotiveDraftRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.motiveEvidenceBoard.createCoreMotiveDraft(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  admitCoreMotiveVersion = async (
    request: FastifyRequest<{
      Params: {
        implementation_project_id: string;
        motive_id: string;
        core_motive_version_id: string;
      };
      Body: AdmitCoreMotiveVersionRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.motiveEvidenceBoard.admitCoreMotiveVersion(
        request.params.implementation_project_id,
        request.params.motive_id,
        request.params.core_motive_version_id,
        request.body,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listCoreMotives = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.motiveEvidenceBoard.listCoreMotives(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getCoreMotive = async (
    request: ParamsRequest<{
      implementation_project_id: string;
      motive_id: string;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.motiveEvidenceBoard.getCoreMotive(
        request.params.implementation_project_id,
        request.params.motive_id,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listCoreMotiveVersions = async (
    request: ParamsRequest<{
      implementation_project_id: string;
      motive_id: string;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.motiveEvidenceBoard.listCoreMotiveVersions(
        request.params.implementation_project_id,
        request.params.motive_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createMotiveEvidenceBoardVersion = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateMotiveEvidenceBoardVersionRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.motiveEvidenceBoard.createMotiveEvidenceBoardVersion(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listMotiveEvidenceBoards = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.motiveEvidenceBoard.listMotiveEvidenceBoards(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createEvidenceTransferBinding = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateEvidenceTransferBindingRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.motiveEvidenceBoard.createEvidenceTransferBinding(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listEvidenceTransferBindings = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.motiveEvidenceBoard.listEvidenceTransferBindings(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createCrossBoardReview = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateCrossBoardReviewRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.motiveEvidenceBoard.createCrossBoardReview(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  applyMotivePortfolioDecision = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: ApplyMotivePortfolioDecisionRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.motiveEvidenceBoard.applyMotivePortfolioDecision(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listMotivePortfolioDecisions = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.motiveEvidenceBoard.listMotivePortfolioDecisions(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createMotiveEvolutionDecision = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateMotiveEvolutionDecisionRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.motiveEvidenceBoard.createMotiveEvolutionDecision(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createValidationCycleDraft = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateValidationCycleDraftRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.validationCyclePlanning.createValidationCycleDraft(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  admitValidationCycle = async (
    request: FastifyRequest<{
      Params: {
        implementation_project_id: string;
        validation_cycle_id: string;
      };
      Body: AdmitValidationCycleRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.validationCyclePlanning.admitValidationCycle(
        request.params.implementation_project_id,
        request.params.validation_cycle_id,
        request.body,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  completeValidationCycle = async (
    request: FastifyRequest<{
      Params: {
        implementation_project_id: string;
        validation_cycle_id: string;
      };
      Body: CompleteValidationCycleRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.validationCyclePlanning.completeValidationCycle(
        request.params.implementation_project_id,
        request.params.validation_cycle_id,
        request.body,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listValidationCycles = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.validationCyclePlanning.listValidationCycles(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getValidationCycle = async (
    request: ParamsRequest<{
      implementation_project_id: string;
      validation_cycle_id: string;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.validationCyclePlanning.getValidationCycle(
        request.params.implementation_project_id,
        request.params.validation_cycle_id,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createTechnicalRouteCandidate = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateTechnicalRouteCandidateRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.validationCyclePlanning.createTechnicalRouteCandidate(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createFeasibilityProbe = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateFeasibilityProbeRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.validationCyclePlanning.createFeasibilityProbe(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createExperimentPlanLight = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateExperimentPlanLightRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.validationCyclePlanning.createExperimentPlanLight(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listValidationPlanningReviewItems = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.validationCyclePlanning.listValidationPlanningReviewItems(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createValidationUpstreamFeedbackCandidate = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateValidationUpstreamFeedbackCandidateRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.validationCyclePlanning.createValidationUpstreamFeedbackCandidate(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  dispatchValidationUpstreamFeedbackCandidate = async (
    request: FastifyRequest<{
      Params: {
        implementation_project_id: string;
        candidate_id: string;
      };
      Body: DispatchValidationUpstreamFeedbackCandidateRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.validationCyclePlanning.dispatchValidationUpstreamFeedbackCandidate(
        request.params.implementation_project_id,
        request.params.candidate_id,
        request.body,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createResearchWorkOrderDraft = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateResearchWorkOrderDraftRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.workOrderExperimentBridge.createResearchWorkOrderDraft(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  admitResearchWorkOrder = async (
    request: FastifyRequest<{
      Params: {
        implementation_project_id: string;
        work_order_id: string;
      };
      Body: AdmitResearchWorkOrderRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.workOrderExperimentBridge.admitResearchWorkOrder(
        request.params.implementation_project_id,
        request.params.work_order_id,
        request.body,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listResearchWorkOrders = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.workOrderExperimentBridge.listResearchWorkOrders(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getResearchWorkOrder = async (
    request: ParamsRequest<{
      implementation_project_id: string;
      work_order_id: string;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.workOrderExperimentBridge.getResearchWorkOrder(
        request.params.implementation_project_id,
        request.params.work_order_id,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  submitResearchWorkOrderHarnessRun = async (
    request: FastifyRequest<{
      Params: {
        implementation_project_id: string;
        work_order_id: string;
      };
      Body: SubmitResearchWorkOrderHarnessRunRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.workOrderExperimentBridge.submitHarnessRun(
        request.params.implementation_project_id,
        request.params.work_order_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listResearchWorkOrderHarnessRuns = async (
    request: ParamsRequest<{
      implementation_project_id: string;
      work_order_id: string;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.workOrderExperimentBridge.listHarnessRuns(
        request.params.implementation_project_id,
        request.params.work_order_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  submitLiveExperimentRun = async (
    request: FastifyRequest<{
      Params: {
        implementation_project_id: string;
        work_order_id: string;
      };
      Body: SubmitLiveExperimentRunRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.requireLiveExperimentAdapter().submitLiveExperimentRun(
        request.params.implementation_project_id,
        request.params.work_order_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  syncLiveExperimentRun = async (
    request: FastifyRequest<{
      Params: {
        implementation_project_id: string;
        work_order_id: string;
        external_job_id: string;
      };
      Body: SyncLiveExperimentRunRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.requireLiveExperimentAdapter().syncLiveExperimentRun(
        request.params.implementation_project_id,
        request.params.work_order_id,
        request.params.external_job_id,
        request.body,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  collectLiveExperimentRun = async (
    request: FastifyRequest<{
      Params: {
        implementation_project_id: string;
        work_order_id: string;
        external_job_id: string;
      };
      Body: CollectLiveExperimentRunRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.requireLiveExperimentAdapter().collectLiveExperimentRun(
        request.params.implementation_project_id,
        request.params.work_order_id,
        request.params.external_job_id,
        request.body,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  cancelLiveExperimentRun = async (
    request: FastifyRequest<{
      Params: {
        implementation_project_id: string;
        work_order_id: string;
        external_job_id: string;
      };
      Body: CancelLiveExperimentRunRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.requireLiveExperimentAdapter().cancelLiveExperimentRun(
        request.params.implementation_project_id,
        request.params.work_order_id,
        request.params.external_job_id,
        request.body,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  recordRunMonitorIntake = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RecordRunMonitorIntakeRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.workOrderExperimentBridge.recordRunMonitorIntake(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  private requireRunCoordinator(): PaperImplementationRunCoordinatorService {
    if (!this.runCoordinator) {
      throw new AppError(500, 'INTERNAL_ERROR', 'PaperImplementation run coordinator is not configured.');
    }
    return this.runCoordinator;
  }

  private requireTopicHandoff(): PaperImplementationTopicHandoffService {
    if (!this.topicHandoff) {
      throw new AppError(500, 'INTERNAL_ERROR', 'PaperImplementation topic handoff is not configured.');
    }
    return this.topicHandoff;
  }

  private requireScientificContinuation(): PaperImplementationScientificContinuationService {
    if (!this.scientificContinuation) {
      throw new AppError(
        500,
        'INTERNAL_ERROR',
        'PaperImplementation scientific continuation is not configured.',
      );
    }
    return this.scientificContinuation;
  }

  private requireCoreMotiveHandoff(): PaperImplementationCoreMotiveHandoffService {
    if (!this.coreMotiveHandoff) {
      throw new AppError(
        500,
        'INTERNAL_ERROR',
        'PaperImplementation CoreMotive handoff is not configured.',
      );
    }
    return this.coreMotiveHandoff;
  }

  private requireLiveExperimentAdapter(): PaperImplementationLiveExperimentAdapterService {
    if (!this.liveExperimentAdapter) {
      throw new AppError(500, 'INTERNAL_ERROR', 'PaperImplementation live experiment adapter is not configured.');
    }
    return this.liveExperimentAdapter;
  }

  private requireRuntimeTelemetry(): PaperImplementationRuntimeTelemetryService {
    if (!this.runtimeTelemetry) {
      throw new AppError(500, 'INTERNAL_ERROR', 'PaperImplementation runtime telemetry service is not configured.');
    }
    return this.runtimeTelemetry;
  }

  // S4-A read-model routes: project run summaries, single-run detail, project repaid-rate.
  listRuntimeTelemetryRunSummaries = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const runs = await this.requireRuntimeTelemetry().listProjectRunSummaries(
        request.params.implementation_project_id,
      );
      return reply.send({ runs });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getRuntimeTelemetryRunDetail = async (
    request: ParamsRequest<{ implementation_project_id: string; run_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const detail = await this.requireRuntimeTelemetry().getRunDetail(
        request.params.implementation_project_id,
        request.params.run_id,
      );
      return reply.send(detail);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getRuntimeTelemetryProjectRepaidRate = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const aggregate = await this.requireRuntimeTelemetry().getProjectRepaidRate(
        request.params.implementation_project_id,
      );
      return reply.send(aggregate);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listRunEvidenceUnits = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.workOrderExperimentBridge.listRunEvidenceUnits(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getRunEvidenceUnit = async (
    request: ParamsRequest<{
      implementation_project_id: string;
      run_evidence_unit_id: string;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.workOrderExperimentBridge.getRunEvidenceUnit(
        request.params.implementation_project_id,
        request.params.run_evidence_unit_id,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createResultInterpretationPacket = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateResultInterpretationPacketRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.resultClaimDossier.createResultInterpretationPacket(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listResultInterpretationPackets = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.resultClaimDossier.listResultInterpretationPackets(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getResultInterpretationPacket = async (
    request: ParamsRequest<{
      implementation_project_id: string;
      result_interpretation_packet_id: string;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.resultClaimDossier.getResultInterpretationPacket(
        request.params.implementation_project_id,
        request.params.result_interpretation_packet_id,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createClaimCandidate = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateClaimCandidateRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.resultClaimDossier.createClaimCandidate(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listClaimCandidates = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.resultClaimDossier.listClaimCandidates(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getClaimCandidate = async (
    request: ParamsRequest<{
      implementation_project_id: string;
      claim_candidate_id: string;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.resultClaimDossier.getClaimCandidate(
        request.params.implementation_project_id,
        request.params.claim_candidate_id,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createImplementationDossier = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateImplementationDossierRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.resultClaimDossier.createImplementationDossier(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listImplementationDossiers = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.resultClaimDossier.listImplementationDossiers(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getImplementationDossier = async (
    request: ParamsRequest<{
      implementation_project_id: string;
      dossier_id: string;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.resultClaimDossier.getImplementationDossier(
        request.params.implementation_project_id,
        request.params.dossier_id,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createWritingEntryPacket = async (
    request: FastifyRequest<{
      Params: {
        implementation_project_id: string;
        dossier_id: string;
      };
      Body: CreateWritingEntryPacketRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.resultClaimDossier.createWritingEntryPacket(
        request.params.implementation_project_id,
        request.params.dossier_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listWritingEntryPackets = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.resultClaimDossier.listWritingEntryPackets(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  recordResultClaimFeedbackEvent = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RecordResultClaimFeedbackEventRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.resultClaimDossier.recordResultClaimFeedbackEvent(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createImplementationHarness = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateImplementationHarnessRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.aiWorkflowHarness.createImplementationHarness(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listImplementationHarnesses = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.aiWorkflowHarness.listImplementationHarnesses(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createImplementationInputSnapshot = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateImplementationInputSnapshotRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.aiWorkflowHarness.createImplementationInputSnapshot(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listImplementationInputSnapshots = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.aiWorkflowHarness.listImplementationInputSnapshots(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listRuntimeArtifacts = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Querystring: ListPaperImplementationRuntimeArtifactsQuery;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.runtimeAdmission.listRuntimeArtifacts(
        request.params.implementation_project_id,
        request.query,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  admitRuntimeArtifact = async (
    request: FastifyRequest<{
      Params: {
        implementation_project_id: string;
        runtime_artifact_id: string;
      };
      Body: AdmitPaperImplementationRuntimeArtifactRequestPayload;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.runtimeAdmission.admitRuntimeArtifact({
        implementation_project_id: request.params.implementation_project_id,
        runtime_artifact_id: request.params.runtime_artifact_id,
        ...request.body,
      });
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listRuntimeAdmissionRecords = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Querystring: ListPaperImplementationRuntimeAdmissionRecordsQuery;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.runtimeAdmission.listAdmissionRecords(
        request.params.implementation_project_id,
        request.query,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  materializeRuntimeDomainGate = async (
    request: FastifyRequest<{
      Params: {
        implementation_project_id: string;
        runtime_artifact_id: string;
      };
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.runtimeDomainGate.materializeFinalRuntimeArtifact(
        request.params.implementation_project_id,
        request.params.runtime_artifact_id,
      );
      return reply.status(result.status === 'materialized' ? 201 : 200).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  runTraceIntegrityBoundaryDebateRuntime = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RunPaperImplementationTraceIntegrityDebateRuntimeRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.traceIntegrityDebateRuntime.runBoundaryDebate(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  runClaimBoundaryDebateRuntime = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RunPaperImplementationP1RuntimeReviewRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.p1RuntimeReview.runClaimBoundaryDebate(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  runDossierReadinessAuditRuntime = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RunPaperImplementationP1RuntimeReviewRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.p1RuntimeReview.runDossierReadinessAudit(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  runResultAnalysisRuntime = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RunPaperImplementationResultAnalysisRuntimeRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.resultAnalysisRuntime.runInterpretationScenarios(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  runRouteArchitectureRuntime = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RunPaperImplementationRoutePlanningRuntimeRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.routePlanningRuntime.runRouteArchitecture(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  runRouteSkepticReviewRuntime = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RunPaperImplementationRoutePlanningRuntimeRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.routePlanningRuntime.runRouteSkepticReview(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createCoordinatorRun = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreatePaperImplementationCoordinatorRunRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const run = await this.requireRunCoordinator().createCoordinatorRun(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(run);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  advanceCoordinatorRun = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string; coordinator_run_id: string };
      Body: AdvancePaperImplementationCoordinatorRunRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.requireRunCoordinator().advance(
        request.params.implementation_project_id,
        request.params.coordinator_run_id,
        request.body ?? {},
      );
      // D1: HTTP semantics stay 202 (advance is an asynchronous progression
      // request); v1 drives the progression loop synchronously before
      // returning the current run projection, a resident daemon remains a
      // compatible extension.
      return reply.status(202).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getCoordinatorRun = async (
    request: ParamsRequest<{ implementation_project_id: string; coordinator_run_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.requireRunCoordinator().getCoordinatorRun(
        request.params.implementation_project_id,
        request.params.coordinator_run_id,
      );
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  // Additive read-only project-level coordinator-run list: run projections only
  // (no steps, slot_request_payloads stripped), aligned with the single-run
  // GET's `run` field shape. Routed through the coordinator SERVICE (never a
  // controller-held repository) so the coordinator's zero-authority structural
  // fence covers this read too.
  listCoordinatorRunsByProject = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const runs = await this.requireRunCoordinator().listCoordinatorRunsByProject(
        request.params.implementation_project_id,
      );
      return reply.send({ runs });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  runValidationCyclePlanningRuntime = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RunPaperImplementationValidationCyclePlanningRuntimeRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.validationCyclePlanningRuntime.runCycleCandidates(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  runFeasibilityPlanningRuntime = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RunPaperImplementationFeasibilityPlanningRuntimeRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.feasibilityPlanningRuntime.runProbePlanCandidates(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  runCrossBoardSynthesisRuntime = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RunPaperImplementationCrossBoardSynthesisRuntimeRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.crossBoardSynthesisRuntime.runMergeSplitReuseScenarios(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  runEvidenceBoardCurationRuntime = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RunPaperImplementationEvidenceBoardCurationRuntimeRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.evidenceBoardCurationRuntime.runBindingGapCandidates(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  runMotiveDecompositionRuntime = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RunPaperImplementationMotiveDecompositionRuntimeRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.motiveDecompositionRuntime.runDraftAssertionCandidates(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  runMotiveEvolutionRuntime = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RunPaperImplementationMotiveEvolutionRuntimeRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.motiveEvolutionRuntime.runEvolutionDecisionSupport(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  runExperimentDesignRuntime = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RunPaperImplementationExperimentPlanningRuntimeRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.experimentPlanningRuntime.runExperimentDesign(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  runExperimentCritiqueRuntime = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RunPaperImplementationExperimentPlanningRuntimeRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.experimentPlanningRuntime.runExperimentCritique(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createAgentWorkflowHarnessRun = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: CreateAgentWorkflowHarnessRunRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.aiWorkflowHarness.createAgentWorkflowHarnessRun(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listAgentWorkflowHarnessRuns = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.aiWorkflowHarness.listAgentWorkflowHarnessRuns(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listImplementationProposalArtifacts = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.aiWorkflowHarness.listImplementationProposalArtifacts(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  listDecisionWorkQueueItems = async (
    request: ParamsRequest<{ implementation_project_id: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.aiWorkflowHarness.listDecisionWorkQueueItems(
        request.params.implementation_project_id,
      );
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * W4 queue reflow composition lives here, at the controller layer, so the
   * harness service never depends on the coordinator: resolve first, then —
   * only when `re_advance === true` and the item carries a
   * `source_coordinator_run_ref` — trigger one coordinator advance and
   * return its projection with the resolved item. The retry-budget and
   * cooldown gates run BEFORE the resolve so a 409 leaves the item
   * untouched; budget is checked first so an exhausted budget surfaces the
   * raise hint instead of being masked by the cooldown window.
   */
  resolveDecisionWorkQueueItem = async (
    request: FastifyRequest<{
      Params: {
        implementation_project_id: string;
        queue_item_id: string;
      };
      Body: ResolveDecisionWorkQueueItemRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const implementationProjectId = request.params.implementation_project_id;
      const queueItemId = request.params.queue_item_id;
      // re_advance drives a real coordinator advance (LLM consumption) — it is
      // only meaningful when the breakpoint is genuinely RESOLVED. A
      // `dismissed`/`superseded` resolution parks the item without a fix, so a
      // re_advance would burn provider budget re-running a slot the operator
      // just abandoned. Reject BEFORE any resolve/advance side-effect with a
      // clear, actionable message.
      if (request.body.re_advance === true && request.body.status !== 'resolved') {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `re_advance requires status 'resolved'; got '${request.body.status}'. `
          + 'Dismissed/superseded items abandon the breakpoint and cannot trigger a coordinator advance.',
          { status: request.body.status, re_advance: true },
        );
      }
      let reAdvanceCoordinatorRunId: string | null = null;
      if (request.body.re_advance === true) {
        const item = await this.aiWorkflowHarness.getDecisionWorkQueueItem(
          implementationProjectId,
          queueItemId,
        );
        if (item.source_coordinator_run_ref) {
          // F2: a terminal coordinator run can never be re-advanced — reject
          // BEFORE the resolve so the queue item is left untouched.
          const coordinatorRun = await this.requireRunCoordinator().getCoordinatorRun(
            implementationProjectId,
            item.source_coordinator_run_ref.ref_id,
          );
          if (
            (PAPER_IMPLEMENTATION_COORDINATOR_TERMINAL_RUN_STATUSES as readonly string[])
              .includes(coordinatorRun.run.run_status)
          ) {
            throw new AppError(
              409,
              'GATE_CONSTRAINT_FAILED',
              `CoordinatorRun ${item.source_coordinator_run_ref.ref_id} is terminal `
              + `(${coordinatorRun.run.run_status}) and cannot be re-advanced; the queue item was not resolved.`,
              { coordinator_run_status: coordinatorRun.run.run_status },
            );
          }
          // R1: a budget_exhausted run needs an explicit raise to resume — a
          // raise-less re_advance resolve would resolve the item and then
          // no-op the advance, silently dead-ending the reflow. Reject
          // BEFORE the resolve (item untouched) with the raise hint.
          if (
            coordinatorRun.run.run_status === 'budget_exhausted'
            && !request.body.raise_budget_envelope
          ) {
            throw new AppError(
              409,
              'GATE_CONSTRAINT_FAILED',
              `CoordinatorRun ${item.source_coordinator_run_ref.ref_id} is budget_exhausted; `
              + 're-advance requires raise_budget_envelope, otherwise the advance is a no-op. '
              + 'The queue item was not resolved.',
              {
                coordinator_run_status: coordinatorRun.run.run_status,
                recommended_action: 'raise_budget_envelope',
              },
            );
          }
          const effectiveRetryBudget = request.body.retry_budget_override
            ? Math.max(item.retry_budget, request.body.retry_budget_override)
            : item.retry_budget;
          if (item.retry_count >= effectiveRetryBudget) {
            throw new AppError(
              409,
              'GATE_CONSTRAINT_FAILED',
              `DecisionWorkQueueItem ${queueItemId} retry budget is exhausted `
              + `(retry_count ${item.retry_count} >= retry_budget ${effectiveRetryBudget}); `
              + 'raise it explicitly via retry_budget_override before re-advancing.',
              {
                retry_count: item.retry_count,
                retry_budget: effectiveRetryBudget,
                recommended_action: 'raise_retry_budget',
              },
            );
          }
          if (item.cooldown_until && Date.parse(item.cooldown_until) > Date.now()) {
            throw new AppError(
              409,
              'GATE_CONSTRAINT_FAILED',
              `DecisionWorkQueueItem ${queueItemId} is cooling down until ${item.cooldown_until}; `
              + 're-advance is rejected before the cooldown elapses.',
              { cooldown_until: item.cooldown_until },
            );
          }
          reAdvanceCoordinatorRunId = item.source_coordinator_run_ref.ref_id;
        }
      }
      const resolved = await this.aiWorkflowHarness.resolveDecisionWorkQueueItem(
        implementationProjectId,
        queueItemId,
        request.body,
      );
      if (!reAdvanceCoordinatorRunId) {
        return reply.send(resolved);
      }
      // F2: the resolve already happened — an advance failure (including
      // CONCURRENT_ADVANCE) must not fail the whole request. The resolve
      // result is returned as usual with the advance error alongside it.
      try {
        const coordinatorAdvance = await this.requireRunCoordinator().advance(
          implementationProjectId,
          reAdvanceCoordinatorRunId,
          {
            raise_budget_envelope: request.body.raise_budget_envelope ?? null,
          },
        );
        const response: ResolveDecisionWorkQueueItemResponse = {
          ...resolved,
          coordinator_advance: coordinatorAdvance,
        };
        return reply.send(response);
      } catch (advanceError) {
        const response: ResolveDecisionWorkQueueItemResponse = {
          ...resolved,
          coordinator_advance_error: advanceError instanceof AppError
            ? { code: advanceError.errorCode, message: advanceError.message }
            : {
              code: 'INTERNAL_ERROR',
              message: advanceError instanceof Error ? advanceError.message : String(advanceError),
            },
        };
        return reply.send(response);
      }
    } catch (error) {
      return handleError(reply, error);
    }
  };

  runProviderVarianceEvaluation = async (
    request: FastifyRequest<{
      Params: { implementation_project_id: string };
      Body: RunProviderVarianceEvaluationRequest;
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.requireProviderVarianceEvaluation().runProviderVarianceEvaluation(
        request.params.implementation_project_id,
        request.body,
      );
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  private requireProviderVarianceEvaluation(): PaperImplementationProviderVarianceEvaluationService {
    if (!this.providerVarianceEvaluation) {
      throw new AppError(500, 'INTERNAL_ERROR', 'PaperImplementation provider variance evaluation is not configured.');
    }
    return this.providerVarianceEvaluation;
  }
}
