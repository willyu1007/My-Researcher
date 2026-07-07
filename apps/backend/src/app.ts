import Fastify, { type FastifyInstance } from 'fastify';
import { AutoPullController } from './controllers/auto-pull-controller.js';
import { ExperimentFoundationExecutionController } from './controllers/experiment-foundation-execution-controller.js';
import { ExperimentFoundationController } from './controllers/experiment-foundation-controller.js';
import { LiteratureAcquisitionSettingsController } from './controllers/literature-acquisition-settings-controller.js';
import { LiteratureBackfillController } from './controllers/literature-backfill-controller.js';
import { LiteratureContentProcessingSettingsController } from './controllers/literature-content-processing-settings-controller.js';
import { LiteratureFulltextAcquisitionController } from './controllers/literature-fulltext-acquisition-controller.js';
import { LiteratureController } from './controllers/literature-controller.js';
import { PaperImplementationController } from './controllers/paper-implementation-controller.js';
import { TopicSettingsController } from './controllers/topic-settings-controller.js';
import { TopicSelectionResourceSamplingController } from './controllers/topic-selection-resource-sampling-controller.js';
import { TopicSelectionV1aController } from './controllers/topic-selection-v1a-controller.js';
import { TopicSelectionV1bController } from './controllers/topic-selection-v1b-controller.js';
import { TopicSelectionV1cController } from './controllers/topic-selection-v1c-controller.js';
import { InMemoryApplicationSettingsRepository } from './repositories/in-memory-application-settings-repository.js';
import { InMemoryAutoPullRepository } from './repositories/in-memory-auto-pull-repository.js';
import { InMemoryExperimentFoundationExecutionRepository } from './repositories/in-memory-experiment-foundation-execution-repository.js';
import { InMemoryExperimentFoundationRepository } from './repositories/in-memory-experiment-foundation-repository.js';
import { InMemoryLiteratureRepository } from './repositories/in-memory-literature-repository.js';
import { InMemoryPaperImplementationRepository } from './repositories/in-memory-paper-implementation-repository.js';
import { InMemoryPaperImplementationAiWorkflowHarnessRepository } from './repositories/in-memory-paper-implementation-ai-workflow-harness-repository.js';
import { InMemoryPaperImplementationMotiveRepository } from './repositories/in-memory-paper-implementation-motive-repository.js';
import { InMemoryPaperImplementationResultClaimDossierRepository } from './repositories/in-memory-paper-implementation-result-claim-dossier-repository.js';
import { InMemoryPaperImplementationRuntimeRepository } from './repositories/in-memory-paper-implementation-runtime-repository.js';
import { InMemoryPaperImplementationTraceRepository } from './repositories/in-memory-paper-implementation-trace-repository.js';
import { InMemoryPaperImplementationValidationRepository } from './repositories/in-memory-paper-implementation-validation-repository.js';
import { InMemoryPaperImplementationWorkOrderRepository } from './repositories/in-memory-paper-implementation-workorder-repository.js';
import { ResearchLifecycleController } from './controllers/research-lifecycle-controller.js';
import { InMemoryResearchLifecycleRepository } from './repositories/in-memory-research-lifecycle-repository.js';
import { InMemoryTopicSelectionControlPlaneRepository } from './repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionEvidenceMapRepository } from './repositories/in-memory-topic-selection-evidence-map-repository.js';
import { InMemoryTopicSelectionNeedValidationRepository } from './repositories/in-memory-topic-selection-need-validation-repository.js';
import { InMemoryTopicSelectionOfflineEvaluationReplayRepository } from './repositories/in-memory-topic-selection-offline-evaluation-replay-repository.js';
import { InMemoryTopicSelectionRecheckRiskMemoryRepository } from './repositories/in-memory-topic-selection-recheck-risk-memory-repository.js';
import { InMemoryTopicSelectionResourceSamplingRepository } from './repositories/in-memory-topic-selection-resource-sampling-repository.js';
import { InMemoryTopicSelectionSearchResourceRepository } from './repositories/in-memory-topic-selection-search-resource-repository.js';
import { InMemoryTopicSelectionV1bIntakeRepository } from './repositories/in-memory-topic-selection-v1b-intake-repository.js';
import { InMemoryTopicSelectionV1bResearchSliceRepository } from './repositories/in-memory-topic-selection-v1b-research-slice-repository.js';
import { InMemoryTopicSelectionV1bTopicPackageRepository } from './repositories/in-memory-topic-selection-v1b-topic-package-repository.js';
import { InMemoryTopicSelectionV1bTopicQuestionRepository } from './repositories/in-memory-topic-selection-v1b-topic-question-repository.js';
import { InMemoryTopicSelectionV1bValueAssessmentRepository } from './repositories/in-memory-topic-selection-v1b-value-assessment-repository.js';
import { InMemoryTopicSelectionV1cDownstreamFeedbackRecheckRepository } from './repositories/in-memory-topic-selection-v1c-downstream-feedback-recheck-repository.js';
import { InMemoryTopicSelectionV1cHumanPromotionDecisionRepository } from './repositories/in-memory-topic-selection-v1c-human-promotion-decision-repository.js';
import { InMemoryTopicSelectionV1cPaperProjectBridgeRepository } from './repositories/in-memory-topic-selection-v1c-paper-project-bridge-repository.js';
import { InMemoryTopicSelectionV1cPromotionGateRepository } from './repositories/in-memory-topic-selection-v1c-promotion-gate-repository.js';
import { InMemoryTopicSelectionV1cPromotionInputRepository } from './repositories/in-memory-topic-selection-v1c-promotion-input-repository.js';
import { getPrismaClient } from './repositories/prisma/prisma-client.js';
import { PrismaApplicationSettingsRepository } from './repositories/prisma/prisma-application-settings-repository.js';
import { PrismaAutoPullRepository } from './repositories/prisma/prisma-auto-pull-repository.js';
import { PrismaExperimentFoundationExecutionRepository } from './repositories/prisma/prisma-experiment-foundation-execution-repository.js';
import { PrismaExperimentFoundationRepository } from './repositories/prisma/prisma-experiment-foundation-repository.js';
import { PrismaLiteratureRepository } from './repositories/prisma/prisma-literature-repository.js';
import { PrismaPaperImplementationRepository } from './repositories/prisma/prisma-paper-implementation-repository.js';
import { PrismaPaperImplementationAiWorkflowHarnessRepository } from './repositories/prisma/prisma-paper-implementation-ai-workflow-harness-repository.js';
import { PrismaPaperImplementationMotiveRepository } from './repositories/prisma/prisma-paper-implementation-motive-repository.js';
import { PrismaPaperImplementationResultClaimDossierRepository } from './repositories/prisma/prisma-paper-implementation-result-claim-dossier-repository.js';
import { PrismaPaperImplementationRuntimeRepository } from './repositories/prisma/prisma-paper-implementation-runtime-repository.js';
import { PrismaPaperImplementationTraceRepository } from './repositories/prisma/prisma-paper-implementation-trace-repository.js';
import { PrismaPaperImplementationValidationRepository } from './repositories/prisma/prisma-paper-implementation-validation-repository.js';
import { PrismaPaperImplementationWorkOrderRepository } from './repositories/prisma/prisma-paper-implementation-workorder-repository.js';
import { PrismaResearchLifecycleRepository } from './repositories/prisma/prisma-research-lifecycle-repository.js';
import { InMemoryTitleCardManagementRepository } from './repositories/title-card-management.repository.js';
import { PrismaTitleCardManagementRepository } from './repositories/prisma/prisma-title-card-management-repository.js';
import { PrismaTopicSelectionControlPlaneRepository } from './repositories/prisma/prisma-topic-selection-control-plane-repository.js';
import { PrismaTopicSelectionEvidenceMapRepository } from './repositories/prisma/prisma-topic-selection-evidence-map-repository.js';
import { PrismaTopicSelectionNeedValidationRepository } from './repositories/prisma/prisma-topic-selection-need-validation-repository.js';
import { PrismaTopicSelectionOfflineEvaluationReplayRepository } from './repositories/prisma/prisma-topic-selection-offline-evaluation-replay-repository.js';
import { PrismaTopicSelectionPromptPacketCacheStore } from './repositories/prisma/prisma-topic-selection-prompt-packet-cache-store.js';
import { PrismaTopicSelectionRecheckRiskMemoryRepository } from './repositories/prisma/prisma-topic-selection-recheck-risk-memory-repository.js';
import { PrismaTopicSelectionResourceSamplingRepository } from './repositories/prisma/prisma-topic-selection-resource-sampling-repository.js';
import { PrismaTopicSelectionSearchResourceRepository } from './repositories/prisma/prisma-topic-selection-search-resource-repository.js';
import { PrismaTopicSelectionV1bIntakeRepository } from './repositories/prisma/prisma-topic-selection-v1b-intake-repository.js';
import { PrismaTopicSelectionV1bResearchSliceRepository } from './repositories/prisma/prisma-topic-selection-v1b-research-slice-repository.js';
import { PrismaTopicSelectionV1bTopicPackageRepository } from './repositories/prisma/prisma-topic-selection-v1b-topic-package-repository.js';
import { PrismaTopicSelectionV1bTopicQuestionRepository } from './repositories/prisma/prisma-topic-selection-v1b-topic-question-repository.js';
import { PrismaTopicSelectionV1bValueAssessmentRepository } from './repositories/prisma/prisma-topic-selection-v1b-value-assessment-repository.js';
import { PrismaTopicSelectionV1cDownstreamFeedbackRecheckRepository } from './repositories/prisma/prisma-topic-selection-v1c-downstream-feedback-recheck-repository.js';
import { PrismaTopicSelectionV1cHumanPromotionDecisionRepository } from './repositories/prisma/prisma-topic-selection-v1c-human-promotion-decision-repository.js';
import { PrismaTopicSelectionV1cPaperProjectBridgeRepository } from './repositories/prisma/prisma-topic-selection-v1c-paper-project-bridge-repository.js';
import { PrismaTopicSelectionV1cPromotionGateRepository } from './repositories/prisma/prisma-topic-selection-v1c-promotion-gate-repository.js';
import { PrismaTopicSelectionV1cPromotionInputRepository } from './repositories/prisma/prisma-topic-selection-v1c-promotion-input-repository.js';
import { registerAutoPullRoutes } from './routes/auto-pull-routes.js';
import { registerExperimentFoundationExecutionRoutes } from './routes/experiment-foundation-execution-routes.js';
import { registerExperimentFoundationRoutes } from './routes/experiment-foundation-routes.js';
import { registerLiteratureAcquisitionSettingsRoutes } from './routes/literature-acquisition-settings-routes.js';
import { registerLiteratureBackfillRoutes } from './routes/literature-backfill-routes.js';
import { registerLiteratureContentProcessingSettingsRoutes } from './routes/literature-content-processing-settings-routes.js';
import { registerLiteratureFulltextAcquisitionRoutes } from './routes/literature-fulltext-acquisition-routes.js';
import { registerLiteratureRoutes } from './routes/literature-routes.js';
import { registerPaperImplementationRoutes } from './routes/paper-implementation-routes.js';
import { registerResearchLifecycleRoutes } from './routes/research-lifecycle-routes.js';
import { registerTitleCardManagementRoutes } from './routes/title-card-management.js';
import { registerTopicSettingsRoutes } from './routes/topic-settings-routes.js';
import { registerTopicSelectionV1aRoutes } from './routes/topic-selection-v1a-routes.js';
import { registerTopicSelectionV1bRoutes } from './routes/topic-selection-v1b-routes.js';
import { registerTopicSelectionV1cRoutes } from './routes/topic-selection-v1c-routes.js';
import type { ApplicationSettingsRepository } from './repositories/application-settings-repository.js';
import type { AutoPullRepository } from './repositories/auto-pull-repository.js';
import type { ExperimentFoundationExecutionRepository } from './repositories/experiment-foundation-execution.repository.js';
import type { ExperimentFoundationRepository } from './repositories/experiment-foundation.repository.js';
import type { LiteratureRepository } from './repositories/literature-repository.js';
import type { PaperImplementationRepository } from './repositories/paper-implementation.repository.js';
import type { PaperImplementationAiWorkflowHarnessRepository } from './repositories/paper-implementation-ai-workflow-harness.repository.js';
import type { PaperImplementationMotiveRepository } from './repositories/paper-implementation-motive.repository.js';
import type { PaperImplementationResultClaimDossierRepository } from './repositories/paper-implementation-result-claim-dossier.repository.js';
import type { PaperImplementationRuntimeRepository } from './repositories/paper-implementation-runtime.repository.js';
import type { PaperImplementationTraceRepository } from './repositories/paper-implementation-trace.repository.js';
import type { PaperImplementationValidationRepository } from './repositories/paper-implementation-validation.repository.js';
import type { PaperImplementationWorkOrderRepository } from './repositories/paper-implementation-workorder.repository.js';
import type { ResearchLifecycleRepository } from './repositories/research-lifecycle-repository.js';
import type { TitleCardManagementRepository } from './repositories/title-card-management.repository.js';
import type { TopicSelectionControlPlaneRepository } from './repositories/topic-selection-control-plane.repository.js';
import type { TopicSelectionEvidenceMapRepository } from './repositories/topic-selection-evidence-map.repository.js';
import type { TopicSelectionNeedValidationRepository } from './repositories/topic-selection-need-validation.repository.js';
import type { TopicSelectionOfflineEvaluationReplayRepository } from './repositories/topic-selection-offline-evaluation-replay.repository.js';
import type { TopicSelectionPromptPacketCacheStore } from './repositories/topic-selection-prompt-packet-cache-store.repository.js';
import type { TopicSelectionRecheckRiskMemoryRepository } from './repositories/topic-selection-recheck-risk-memory.repository.js';
import type { TopicSelectionResourceSamplingRepository } from './repositories/topic-selection-resource-sampling.repository.js';
import type { TopicSelectionSearchResourceRepository } from './repositories/topic-selection-search-resource.repository.js';
import type { TopicSelectionV1bIntakeRepository } from './repositories/topic-selection-v1b-intake.repository.js';
import type { TopicSelectionV1bResearchSliceRepository } from './repositories/topic-selection-v1b-research-slice.repository.js';
import type { TopicSelectionV1bTopicPackageRepository } from './repositories/topic-selection-v1b-topic-package.repository.js';
import type { TopicSelectionV1bTopicQuestionRepository } from './repositories/topic-selection-v1b-topic-question.repository.js';
import type { TopicSelectionV1bValueAssessmentRepository } from './repositories/topic-selection-v1b-value-assessment.repository.js';
import type { TopicSelectionV1cDownstreamFeedbackRecheckRepository } from './repositories/topic-selection-v1c-downstream-feedback-recheck.repository.js';
import type { TopicSelectionV1cHumanPromotionDecisionRepository } from './repositories/topic-selection-v1c-human-promotion-decision.repository.js';
import type { TopicSelectionV1cPaperProjectBridgeRepository } from './repositories/topic-selection-v1c-paper-project-bridge.repository.js';
import type { TopicSelectionV1cPromotionGateRepository } from './repositories/topic-selection-v1c-promotion-gate.repository.js';
import type { TopicSelectionV1cPromotionInputRepository } from './repositories/topic-selection-v1c-promotion-input.repository.js';
import { AutoPullScheduler } from './services/auto-pull-scheduler.js';
import { AutoPullService } from './services/auto-pull-service.js';
import { ExperimentFoundationExecutionService } from './services/experiment-foundation-execution-service.js';
import { ExperimentFoundationService } from './services/experiment-foundation-service.js';
import { LiteratureAutoAdvanceService } from './services/literature-auto-advance-service.js';
import { LiteratureBackfillService } from './services/literature-backfill-service.js';
import { LiteratureAcquisitionSettingsService } from './services/literature-acquisition-settings-service.js';
import { LiteratureClusterService } from './services/literature-cluster-service.js';
import { LiteratureFlowService } from './services/literature-flow-service.js';
import { LiteratureFulltextAcquisitionService } from './services/literature-fulltext-acquisition-service.js';
import { LiteratureService } from './services/literature-service.js';
import { LiteratureContentProcessingSettingsService } from './services/literature-content-processing-settings-service.js';
import { BackendLlmGateway } from './services/llm-gateway.js';
import {
  PaperImplementationIntakeBootstrapService,
  type PaperImplementationDownstreamFeedbackService,
} from './services/paper-implementation-intake-bootstrap-service.js';
import { PaperImplementationAiWorkflowHarnessService } from './services/paper-implementation-ai-workflow-harness-service.js';
import { PaperImplementationMotiveEvidenceBoardService } from './services/paper-implementation-motive-evidence-board-service.js';
import { PaperImplementationResultClaimDossierService } from './services/paper-implementation-result-claim-dossier-service.js';
import { PaperImplementationTraceKernelService } from './services/paper-implementation-trace-kernel-service.js';
import { PaperImplementationValidationCyclePlanningService } from './services/paper-implementation-validation-cycle-planning-service.js';
import { PaperImplementationWorkOrderExperimentBridgeService } from './services/paper-implementation-workorder-experiment-bridge-service.js';
import { PaperImplementationLiveExperimentAdapterService } from './services/paper-implementation-live-experiment-adapter-service.js';
import { PaperImplementationProviderVarianceEvaluationService } from './services/paper-implementation-provider-variance-evaluation-service.js';
import { PaperImplementationRuntimeAdmissionService } from './services/paper-implementation-runtime-admission-service.js';
import { PaperImplementationTraceIntegrityDebateRuntimeService } from './services/paper-implementation-trace-integrity-debate-runtime-service.js';
import { PaperImplementationTraceIntegrityRetrievalService } from './services/paper-implementation-trace-integrity-retrieval-service.js';
import { PaperImplementationP1RuntimeReviewService } from './services/paper-implementation-p1-runtime-review-service.js';
import { PaperImplementationResultAnalysisRuntimeService } from './services/paper-implementation-result-analysis-runtime-service.js';
import { PaperImplementationExperimentPlanningRuntimeService } from './services/paper-implementation-experiment-planning-runtime-service.js';
import { PaperImplementationRoutePlanningRuntimeService } from './services/paper-implementation-route-planning-runtime-service.js';
import { PaperImplementationValidationCyclePlanningRuntimeService } from './services/paper-implementation-validation-cycle-planning-runtime-service.js';
import { PaperImplementationFeasibilityPlanningRuntimeService } from './services/paper-implementation-feasibility-planning-runtime-service.js';
import { PaperImplementationCrossBoardSynthesisRuntimeService } from './services/paper-implementation-cross-board-synthesis-runtime-service.js';
import { PaperImplementationEvidenceBoardCurationRuntimeService } from './services/paper-implementation-evidence-board-curation-runtime-service.js';
import { PaperImplementationMotiveDecompositionRuntimeService } from './services/paper-implementation-motive-decomposition-runtime-service.js';
import { PaperImplementationMotiveEvolutionRuntimeService } from './services/paper-implementation-motive-evolution-runtime-service.js';
import { PaperImplementationRuntimeDomainGateService } from './services/paper-implementation-runtime-domain-gate-service.js';
import { ResearchLifecycleService } from './services/research-lifecycle-service.js';
import {
  TitleCardManagementService,
  type PaperProjectGateway,
} from './services/title-card-management.service.js';
import { TitleCardManagementController } from './controllers/title-card-management.controller.js';
import { TopicSelectionControlPlaneService } from './services/topic-selection-control-plane-service.js';
import { TopicSelectionEvidenceMapService } from './services/topic-selection-evidence-map-service.js';
import { TopicSelectionEvidenceMapMaterializationService } from './services/topic-selection-evidence-map-materialization-service.js';
import { TopicSelectionAgentOrchestratorService } from './services/topic-selection-agent-orchestrator-service.js';
import { TopicSelectionGenerateNeedCandidateOrchestratorAdapterService } from './services/topic-selection-generate-need-candidate-orchestrator-adapter-service.js';
import { TopicSelectionNeedValidationService } from './services/topic-selection-need-validation-service.js';
import { TopicSelectionNeedDiscoveryArtifactBoundaryService } from './services/topic-selection-need-discovery-artifact-boundary-service.js';
import { TopicSelectionNeedDiscoveryContextCompilerService } from './services/topic-selection-need-discovery-context-compiler-service.js';
import { TopicSelectionOfflineEvaluationReplayService } from './services/topic-selection-offline-evaluation-replay-service.js';
import { TopicSelectionPersistNeedCandidateBatchService } from './services/topic-selection-persist-need-candidate-batch-service.js';
import {
  InMemoryTopicSelectionPromptPacketCacheStore,
  TopicSelectionPromptPacketCacheService,
} from './services/topic-selection-prompt-packet-cache-service.js';
import { TopicSelectionContextPacketCacheService } from './services/topic-selection-context-packet-cache-service.js';
import { TopicSelectionContextPolicyProfileRegistryService } from './services/topic-selection-context-policy-profile-registry-service.js';
import { TopicSelectionRankedCandidateDraftBatchValidatorService } from './services/topic-selection-ranked-candidate-draft-batch-validator-service.js';
import { TopicSelectionRecheckRiskMemoryService } from './services/topic-selection-recheck-risk-memory-service.js';
import { TopicSelectionResourceSamplingService } from './services/topic-selection-resource-sampling-service.js';
import { TopicSelectionSearchResourceService } from './services/topic-selection-search-resource-service.js';
import { TopicSelectionWorkflowHarnessService } from './services/topic-selection-workflow-harness-service.js';
import { TopicSelectionV1bResearchSliceService } from './services/topic-selection-v1b-research-slice-service.js';
import { TopicSelectionV1bTopicPackageService } from './services/topic-selection-v1b-topic-package-service.js';
import { TopicSelectionV1bTopicQuestionService } from './services/topic-selection-v1b-topic-question-service.js';
import { TopicSelectionV1bValueAssessmentService } from './services/topic-selection-v1b-value-assessment-service.js';
import { TopicSelectionV1bWorkflowHarnessService } from './services/topic-selection-v1b-workflow-harness-service.js';
import { TopicSelectionV1bRunCoordinatorService } from './services/topic-selection-v1b-run-coordinator-service.js';
import { TopicSelectionV1bN6DivergentDebateRuntimeService } from './services/topic-selection-v1b-n6-divergent-debate-runtime-service.js';
import { TopicSelectionV1bN8BoundedDebateRuntimeService } from './services/topic-selection-v1b-n8-bounded-debate-runtime-service.js';
import {
  TopicSelectionV1cDownstreamFeedbackRecheckService,
  type TopicSelectionPaperProjectBridgeHandoffProvider,
} from './services/topic-selection-v1c-downstream-feedback-recheck-service.js';
import { TopicSelectionV1cHumanPromotionDecisionService } from './services/topic-selection-v1c-human-promotion-decision-service.js';
import { TopicSelectionV1cPaperProjectBridgeService } from './services/topic-selection-v1c-paper-project-bridge-service.js';
import { TopicSelectionV1cPromotionGateService } from './services/topic-selection-v1c-promotion-gate-service.js';
import { TopicSelectionV1cN2BoundedDebateRuntimeService } from './services/topic-selection-v1c-n2-bounded-debate-runtime-service.js';
import { TopicSelectionV1cN2BoundedDebateAdmissionService } from './services/topic-selection-v1c-n2-bounded-debate-admission-service.js';
import { TopicSelectionV1cN2BoundedDebateCoordinatorService } from './services/topic-selection-v1c-n2-bounded-debate-coordinator-service.js';
import { TopicSelectionV1cN4DelegatedPromotionDecisionRuntimeService } from './services/topic-selection-v1c-n4-delegated-promotion-decision-runtime-service.js';
import { TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService } from './services/topic-selection-v1c-n4-delegated-promotion-decision-admission-service.js';
import { TopicSelectionV1cN4DelegatedPromotionDecisionService } from './services/topic-selection-v1c-n4-delegated-promotion-decision-service.js';
import { TopicSelectionV1cPromotionInputService } from './services/topic-selection-v1c-promotion-input-service.js';
import { FileGovernanceDeliveryAuditStore } from './services/event-delivery/governance-delivery-audit-store.js';
import { FileGovernanceDeliveryOutboxStore } from './services/event-delivery/governance-delivery-outbox-store.js';
import { InProcessGovernanceEventDeliveryAdapter } from './services/event-delivery/governance-event-delivery-adapter.js';
import { DurableOutboxGovernanceEventDeliveryAdapter } from './services/event-delivery/governance-event-delivery-outbox-adapter.js';

type RepositoryStrategy = 'memory' | 'prisma';

export type BuildAppOptions = {
  topicSelectionV1aLlmGateway?: Pick<BackendLlmGateway, 'createStructuredOutput'>;
  topicSelectionV1cPromotionGateLlmGateway?: Pick<BackendLlmGateway, 'createStructuredOutput'>;
  paperImplementationTraceIntegrityDebateLlmGateway?: Pick<BackendLlmGateway, 'createStructuredOutput'>;
  paperImplementationP1RuntimeReviewLlmGateway?: Pick<BackendLlmGateway, 'createStructuredOutput'>;
  paperImplementationResultAnalysisLlmGateway?: Pick<BackendLlmGateway, 'createStructuredOutput'>;
  paperImplementationRoutePlanningLlmGateway?: Pick<BackendLlmGateway, 'createStructuredOutput'>;
  paperImplementationValidationCyclePlanningLlmGateway?: Pick<BackendLlmGateway, 'createStructuredOutput'>;
  paperImplementationFeasibilityPlanningLlmGateway?: Pick<BackendLlmGateway, 'createStructuredOutput'>;
  paperImplementationCrossBoardSynthesisLlmGateway?: Pick<BackendLlmGateway, 'createStructuredOutput'>;
  paperImplementationEvidenceBoardCurationLlmGateway?: Pick<BackendLlmGateway, 'createStructuredOutput'>;
  paperImplementationMotiveDecompositionLlmGateway?: Pick<BackendLlmGateway, 'createStructuredOutput'>;
  paperImplementationMotiveEvolutionLlmGateway?: Pick<BackendLlmGateway, 'createStructuredOutput'>;
  paperImplementationExperimentPlanningLlmGateway?: Pick<BackendLlmGateway, 'createStructuredOutput'>;
  topicSelectionPromptPacketCacheStore?: TopicSelectionPromptPacketCacheStore;
  paperImplementationRepository?: PaperImplementationRepository;
  paperImplementationMotiveRepository?: PaperImplementationMotiveRepository;
  paperImplementationTraceRepository?: PaperImplementationTraceRepository;
  paperImplementationValidationRepository?: PaperImplementationValidationRepository;
  paperImplementationWorkOrderRepository?: PaperImplementationWorkOrderRepository;
  paperImplementationResultClaimDossierRepository?: PaperImplementationResultClaimDossierRepository;
  paperImplementationAiWorkflowHarnessRepository?: PaperImplementationAiWorkflowHarnessRepository;
  paperImplementationRuntimeRepository?: PaperImplementationRuntimeRepository;
  paperImplementationBridgeService?: TopicSelectionPaperProjectBridgeHandoffProvider;
  paperImplementationDownstreamFeedbackService?: PaperImplementationDownstreamFeedbackService;
};

export function resolveTitleCardManagementStoreConfig(): {
  researchLifecycleStrategy: RepositoryStrategy;
  literatureStrategy: RepositoryStrategy;
  autoPullStrategy: RepositoryStrategy;
  titleCardStrategy: RepositoryStrategy;
  applicationSettingsStrategy: RepositoryStrategy;
  experimentFoundationStrategy: RepositoryStrategy;
  paperImplementationStrategy: RepositoryStrategy;
} {
  const titleCardStrategy = resolveRepositoryStrategy(
    process.env.TITLE_CARD_REPOSITORY,
    process.env.RESEARCH_LIFECYCLE_REPOSITORY,
  );
  const researchLifecycleStrategy = resolveRepositoryStrategy(
    process.env.RESEARCH_LIFECYCLE_REPOSITORY,
    process.env.TITLE_CARD_REPOSITORY,
  );
  const literatureStrategy = resolveRepositoryStrategy(
    process.env.RESEARCH_LIFECYCLE_REPOSITORY,
    process.env.TITLE_CARD_REPOSITORY,
  );
  const autoPullStrategy = resolveRepositoryStrategy(
    process.env.AUTO_PULL_REPOSITORY,
    process.env.TITLE_CARD_REPOSITORY,
    process.env.RESEARCH_LIFECYCLE_REPOSITORY,
  );
  const applicationSettingsStrategy = resolveRepositoryStrategy(
    process.env.APPLICATION_SETTINGS_REPOSITORY,
    process.env.TITLE_CARD_REPOSITORY,
    process.env.RESEARCH_LIFECYCLE_REPOSITORY,
  );
  const experimentFoundationStrategy = resolveRepositoryStrategy(
    process.env.EXPERIMENT_FOUNDATION_REPOSITORY,
    process.env.RESEARCH_LIFECYCLE_REPOSITORY,
    process.env.TITLE_CARD_REPOSITORY,
  );
  const paperImplementationStrategy = resolveRepositoryStrategy(
    process.env.PAPER_IMPLEMENTATION_REPOSITORY,
    process.env.TITLE_CARD_REPOSITORY,
    process.env.RESEARCH_LIFECYCLE_REPOSITORY,
  );

  return {
    researchLifecycleStrategy,
    literatureStrategy,
    autoPullStrategy,
    titleCardStrategy,
    applicationSettingsStrategy,
    experimentFoundationStrategy,
    paperImplementationStrategy,
  };
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: false,
  });

  const storeConfig = resolveTitleCardManagementStoreConfig();
  assertTitleCardManagementStoreCompatibility(storeConfig);

  const repository = createRepository(storeConfig.researchLifecycleStrategy);
  const literatureRepository = createLiteratureRepository(storeConfig.literatureStrategy);
  const autoPullRepository = createAutoPullRepository(storeConfig.autoPullStrategy);
  const applicationSettingsRepository = createApplicationSettingsRepository(storeConfig.applicationSettingsStrategy);
  const titleCardManagementRepository = createTitleCardManagementRepository(storeConfig.titleCardStrategy);
  const experimentFoundationRepository = createExperimentFoundationRepository(
    storeConfig.experimentFoundationStrategy,
  );
  const experimentFoundationExecutionRepository = createExperimentFoundationExecutionRepository(
    storeConfig.experimentFoundationStrategy,
  );
  const topicSelectionControlPlaneRepository = createTopicSelectionControlPlaneRepository(storeConfig.titleCardStrategy);
  const topicSelectionResourceSamplingRepository = createTopicSelectionResourceSamplingRepository(storeConfig.titleCardStrategy);
  const topicSelectionSearchResourceRepository = createTopicSelectionSearchResourceRepository(storeConfig.titleCardStrategy);
  const topicSelectionEvidenceMapRepository = createTopicSelectionEvidenceMapRepository(storeConfig.titleCardStrategy);
  const topicSelectionNeedValidationRepository = createTopicSelectionNeedValidationRepository(storeConfig.titleCardStrategy);
  const topicSelectionRecheckRiskMemoryRepository = createTopicSelectionRecheckRiskMemoryRepository(storeConfig.titleCardStrategy);
  const topicSelectionOfflineEvaluationReplayRepository = createTopicSelectionOfflineEvaluationReplayRepository(
    storeConfig.titleCardStrategy,
  );
  const topicSelectionPromptPacketCacheStore = options.topicSelectionPromptPacketCacheStore
    ?? createTopicSelectionPromptPacketCacheStore(storeConfig.titleCardStrategy);
  const topicSelectionV1bIntakeRepository = createTopicSelectionV1bIntakeRepository(storeConfig.titleCardStrategy);
  const topicSelectionV1bResearchSliceRepository = createTopicSelectionV1bResearchSliceRepository(storeConfig.titleCardStrategy);
  const topicSelectionV1bTopicQuestionRepository = createTopicSelectionV1bTopicQuestionRepository(storeConfig.titleCardStrategy);
  const topicSelectionV1bValueAssessmentRepository = createTopicSelectionV1bValueAssessmentRepository(storeConfig.titleCardStrategy);
  const topicSelectionV1bTopicPackageRepository = createTopicSelectionV1bTopicPackageRepository(
    storeConfig.titleCardStrategy,
    topicSelectionV1bValueAssessmentRepository,
  );
  const topicSelectionV1cPromotionInputRepository = createTopicSelectionV1cPromotionInputRepository(
    storeConfig.titleCardStrategy,
  );
  const topicSelectionV1cPromotionGateRepository = createTopicSelectionV1cPromotionGateRepository(
    storeConfig.titleCardStrategy,
  );
  const topicSelectionV1cHumanPromotionDecisionRepository = createTopicSelectionV1cHumanPromotionDecisionRepository(
    storeConfig.titleCardStrategy,
  );
  const topicSelectionV1cPaperProjectBridgeRepository = createTopicSelectionV1cPaperProjectBridgeRepository(
    storeConfig.titleCardStrategy,
  );
  const topicSelectionV1cDownstreamFeedbackRecheckRepository = createTopicSelectionV1cDownstreamFeedbackRecheckRepository(
    storeConfig.titleCardStrategy,
  );
  const paperImplementationRepository = options.paperImplementationRepository
    ?? createPaperImplementationRepository(storeConfig.paperImplementationStrategy);
  const paperImplementationMotiveRepository = options.paperImplementationMotiveRepository
    ?? createPaperImplementationMotiveRepository(storeConfig.paperImplementationStrategy);
  const paperImplementationTraceRepository = options.paperImplementationTraceRepository
    ?? createPaperImplementationTraceRepository(storeConfig.paperImplementationStrategy);
  const paperImplementationValidationRepository = options.paperImplementationValidationRepository
    ?? createPaperImplementationValidationRepository(storeConfig.paperImplementationStrategy);
  const paperImplementationWorkOrderRepository = options.paperImplementationWorkOrderRepository
    ?? createPaperImplementationWorkOrderRepository(storeConfig.paperImplementationStrategy);
  const paperImplementationResultClaimDossierRepository = options.paperImplementationResultClaimDossierRepository
    ?? createPaperImplementationResultClaimDossierRepository(storeConfig.paperImplementationStrategy);
  const paperImplementationAiWorkflowHarnessRepository = options.paperImplementationAiWorkflowHarnessRepository
    ?? createPaperImplementationAiWorkflowHarnessRepository(storeConfig.paperImplementationStrategy);
  const paperImplementationRuntimeRepository = options.paperImplementationRuntimeRepository
    ?? createPaperImplementationRuntimeRepository(storeConfig.paperImplementationStrategy);
  const auditStore = new FileGovernanceDeliveryAuditStore({
    filePath: process.env.GOVERNANCE_DELIVERY_AUDIT_LOG_PATH,
  });
  const deliveryAdapter = createDeliveryAdapter();
  const researchLifecycleService = new ResearchLifecycleService(repository, {
    deliveryAdapter,
    deliveryAuditStore: auditStore,
  });
  const researchLifecycleController = new ResearchLifecycleController(researchLifecycleService);
  const paperProjectGateway: PaperProjectGateway = {
    createPaperProject: (input) => researchLifecycleService.createPaperProject(input),
    deletePaperProject: (paperId) => researchLifecycleService.deletePaperProject(paperId),
  };
  const titleCardManagementService = new TitleCardManagementService(titleCardManagementRepository, paperProjectGateway, {
    findLiteratureById: (literatureId) => literatureRepository.findLiteratureById(literatureId),
    listLiteratures: () => literatureRepository.listLiteratures(),
    listSourcesByLiteratureId: (literatureId) => literatureRepository.listSourcesByLiteratureId(literatureId),
    listPipelineStatesByLiteratureIds: (literatureIds) => literatureRepository.listPipelineStatesByLiteratureIds(literatureIds),
  });
  const titleCardManagementController = new TitleCardManagementController(titleCardManagementService);
  const experimentFoundationService = new ExperimentFoundationService(experimentFoundationRepository);
  const experimentFoundationController = new ExperimentFoundationController(experimentFoundationService);
  const experimentFoundationExecutionService = new ExperimentFoundationExecutionService(
    experimentFoundationExecutionRepository,
    experimentFoundationService,
  );
  const experimentFoundationExecutionController = new ExperimentFoundationExecutionController(
    experimentFoundationExecutionService,
  );
  const topicSelectionControlPlaneService = new TopicSelectionControlPlaneService(topicSelectionControlPlaneRepository);
  const topicSelectionSearchResourceService = new TopicSelectionSearchResourceService(
    topicSelectionSearchResourceRepository,
    topicSelectionControlPlaneService,
    titleCardManagementRepository,
    literatureRepository,
  );
  const topicSelectionEvidenceMapService = new TopicSelectionEvidenceMapService(
    topicSelectionEvidenceMapRepository,
    topicSelectionControlPlaneService,
    topicSelectionSearchResourceRepository,
    literatureRepository,
  );
  const topicSelectionNeedValidationService = new TopicSelectionNeedValidationService(
    topicSelectionNeedValidationRepository,
    topicSelectionControlPlaneService,
    topicSelectionEvidenceMapService,
    topicSelectionSearchResourceService,
  );
  const topicSelectionRecheckRiskMemoryService = new TopicSelectionRecheckRiskMemoryService(
    topicSelectionRecheckRiskMemoryRepository,
    topicSelectionControlPlaneService,
    topicSelectionSearchResourceRepository,
    topicSelectionNeedValidationRepository,
  );
  const topicSelectionOfflineEvaluationReplayService = new TopicSelectionOfflineEvaluationReplayService(
    topicSelectionOfflineEvaluationReplayRepository,
  );
  const literatureContentProcessingSettingsService = new LiteratureContentProcessingSettingsService(applicationSettingsRepository);
  const llmGateway = new BackendLlmGateway({
    settingsService: literatureContentProcessingSettingsService,
  });
  const topicSelectionV1aArtifactBoundaryService = new TopicSelectionNeedDiscoveryArtifactBoundaryService(
    topicSelectionControlPlaneService,
  );
  const topicSelectionV1aContextCompilerService = new TopicSelectionNeedDiscoveryContextCompilerService(
    topicSelectionV1aArtifactBoundaryService,
  );
  const topicSelectionV1aLlmGateway = options.topicSelectionV1aLlmGateway ?? llmGateway;
  const topicSelectionPromptPacketCacheService = new TopicSelectionPromptPacketCacheService({
    store: topicSelectionPromptPacketCacheStore,
  });
  const topicSelectionContextPacketCacheService = new TopicSelectionContextPacketCacheService();
  const topicSelectionContextPolicyProfileRegistryService =
    new TopicSelectionContextPolicyProfileRegistryService();
  const topicSelectionV1aAgentOrchestratorService = new TopicSelectionAgentOrchestratorService({
    controlPlane: topicSelectionControlPlaneService,
    llmGateway: topicSelectionV1aLlmGateway,
    promptPacketCache: topicSelectionPromptPacketCacheService,
  });
  const topicSelectionV1aNeedCandidateBatchPersistenceService = new TopicSelectionPersistNeedCandidateBatchService(
    topicSelectionNeedValidationRepository,
  );
  const topicSelectionV1aGenerateNeedCandidateAdapterService =
    new TopicSelectionGenerateNeedCandidateOrchestratorAdapterService({
      contextCompiler: topicSelectionV1aContextCompilerService,
      agentOrchestrator: topicSelectionV1aAgentOrchestratorService,
      artifactBoundary: topicSelectionV1aArtifactBoundaryService,
      draftBatchValidator: new TopicSelectionRankedCandidateDraftBatchValidatorService(),
      needCandidateBatchPersistence: topicSelectionV1aNeedCandidateBatchPersistenceService,
    });
  const topicSelectionV1aEvidenceMapMaterializationService = new TopicSelectionEvidenceMapMaterializationService();
  const topicSelectionWorkflowHarnessService = new TopicSelectionWorkflowHarnessService({
    contextCompiler: topicSelectionV1aContextCompilerService,
    generateNeedCandidateAdapter: topicSelectionV1aGenerateNeedCandidateAdapterService,
    artifactBoundary: topicSelectionV1aArtifactBoundaryService,
    contextPacketCache: topicSelectionContextPacketCacheService,
    contextPolicyProfileRegistry: topicSelectionContextPolicyProfileRegistryService,
    controlPlane: topicSelectionControlPlaneService,
    searchResources: topicSelectionSearchResourceService,
    evidenceMaps: topicSelectionEvidenceMapService,
    evidenceMapMaterializer: topicSelectionV1aEvidenceMapMaterializationService,
    evidenceMapExtractionAgent: topicSelectionV1aAgentOrchestratorService,
    needValidation: topicSelectionNeedValidationService,
    needAdjudicationAgent: topicSelectionV1aAgentOrchestratorService,
    humanConfirmationSemanticReviewAgent: topicSelectionV1aAgentOrchestratorService,
  });
  const topicSelectionV1aController = new TopicSelectionV1aController(
    topicSelectionControlPlaneService,
    topicSelectionSearchResourceService,
    topicSelectionEvidenceMapService,
    topicSelectionNeedValidationService,
    topicSelectionRecheckRiskMemoryService,
    topicSelectionOfflineEvaluationReplayService,
    topicSelectionWorkflowHarnessService,
  );
  const topicSelectionResourceSamplingAgentOrchestratorService = new TopicSelectionAgentOrchestratorService({
    controlPlane: topicSelectionControlPlaneService,
    llmGateway,
    promptPacketCache: topicSelectionPromptPacketCacheService,
  });
  const topicSelectionResourceSamplingService = new TopicSelectionResourceSamplingService({
    repository: topicSelectionResourceSamplingRepository,
    literatureRepository,
    controlPlaneService: topicSelectionControlPlaneService,
    agentOrchestrator: topicSelectionResourceSamplingAgentOrchestratorService,
  });
  const topicSelectionResourceSamplingController = new TopicSelectionResourceSamplingController(
    topicSelectionResourceSamplingService,
  );
  const topicSelectionV1cPromotionGateLlmGateway = options.topicSelectionV1cPromotionGateLlmGateway ?? llmGateway;
  const topicSelectionV1bResearchSliceService = new TopicSelectionV1bResearchSliceService({
    repository: topicSelectionV1bResearchSliceRepository,
  });
  const topicSelectionV1bTopicQuestionService = new TopicSelectionV1bTopicQuestionService({
    repository: topicSelectionV1bTopicQuestionRepository,
  });
  const topicSelectionV1bValueAssessmentService = new TopicSelectionV1bValueAssessmentService({
    repository: topicSelectionV1bValueAssessmentRepository,
  });
  const topicSelectionV1bTopicPackageService = new TopicSelectionV1bTopicPackageService({
    repository: topicSelectionV1bTopicPackageRepository,
    valueAssessmentRepository: topicSelectionV1bValueAssessmentRepository,
  });
  const topicSelectionV1bWorkflowHarnessService = new TopicSelectionV1bWorkflowHarnessService(
    topicSelectionControlPlaneService,
    {
      runnerDependencies: {
        evidenceMapRepository: topicSelectionEvidenceMapRepository,
        needValidationRepository: topicSelectionNeedValidationRepository,
        recheckRiskMemoryRepository: topicSelectionRecheckRiskMemoryRepository,
        researchSliceRepository: topicSelectionV1bResearchSliceRepository,
        searchResourceRepository: topicSelectionSearchResourceRepository,
        topicPackageRepository: topicSelectionV1bTopicPackageRepository,
        topicQuestionRepository: topicSelectionV1bTopicQuestionRepository,
        v1bIntakeRepository: topicSelectionV1bIntakeRepository,
        valueAssessmentRepository: topicSelectionV1bValueAssessmentRepository,
      },
    },
  );
  const topicSelectionV1bRunCoordinatorService = new TopicSelectionV1bRunCoordinatorService({
    harness: topicSelectionV1bWorkflowHarnessService,
    controlPlane: topicSelectionControlPlaneService,
    // Caller-side debate runtimes the coordinator drives on an N6 escalation / N8 bounded-debate
    // frontier (T-127 W-07 item a). They default-construct their own orchestrator/registries from
    // the full control plane; the harness only detects + routes the escalation.
    n6DivergentDebateRuntime: new TopicSelectionV1bN6DivergentDebateRuntimeService(topicSelectionControlPlaneService),
    n8BoundedDebateRuntime: new TopicSelectionV1bN8BoundedDebateRuntimeService(topicSelectionControlPlaneService),
  });
  const topicSelectionV1bController = new TopicSelectionV1bController(
    topicSelectionV1bResearchSliceService,
    topicSelectionV1bTopicQuestionService,
    topicSelectionV1bValueAssessmentService,
    topicSelectionV1bTopicPackageService,
    topicSelectionOfflineEvaluationReplayService,
    topicSelectionV1bWorkflowHarnessService,
    topicSelectionControlPlaneService,
    topicSelectionV1bRunCoordinatorService,
  );
  const topicSelectionV1cPromotionInputService = new TopicSelectionV1cPromotionInputService({
    repository: topicSelectionV1cPromotionInputRepository,
    topicPackageRepository: topicSelectionV1bTopicPackageRepository,
  });
  const topicSelectionV1cPromotionGateService = new TopicSelectionV1cPromotionGateService({
    repository: topicSelectionV1cPromotionGateRepository,
    promotionInputService: topicSelectionV1cPromotionInputService,
    llmGateway: topicSelectionV1cPromotionGateLlmGateway,
  });
  // T-128 W-13: v1c-N2 bounded-debate production caller. Default registries (deterministic) so the runtime/admission
  // profile hashes match the gate's verified-runtime-draft validation — proven by the coordinator unit test.
  const topicSelectionV1cN2BoundedDebateRuntime =
    new TopicSelectionV1cN2BoundedDebateRuntimeService(topicSelectionControlPlaneService);
  const topicSelectionV1cN2BoundedDebateCoordinator = new TopicSelectionV1cN2BoundedDebateCoordinatorService({
    runtime: topicSelectionV1cN2BoundedDebateRuntime,
    admission: new TopicSelectionV1cN2BoundedDebateAdmissionService(topicSelectionV1cN2BoundedDebateRuntime),
    gateService: topicSelectionV1cPromotionGateService,
    promotionInputService: topicSelectionV1cPromotionInputService,
  });
  const topicSelectionV1cHumanPromotionDecisionService = new TopicSelectionV1cHumanPromotionDecisionService({
    repository: topicSelectionV1cHumanPromotionDecisionRepository,
    promotionGateService: topicSelectionV1cPromotionGateService,
  });
  // T-128 W-13: v1c-N4 delegated promotion-decision production caller (distinct delegated endpoint; human still
  // authorizes; not RBAC-gated today — a tracked follow-up).
  const topicSelectionV1cN4DelegatedPromotionDecisionRuntime =
    new TopicSelectionV1cN4DelegatedPromotionDecisionRuntimeService(topicSelectionControlPlaneService);
  const topicSelectionV1cN4DelegatedPromotionDecisionService = new TopicSelectionV1cN4DelegatedPromotionDecisionService({
    runtime: topicSelectionV1cN4DelegatedPromotionDecisionRuntime,
    admission: new TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService(topicSelectionV1cN4DelegatedPromotionDecisionRuntime),
    gateService: topicSelectionV1cPromotionGateService,
    humanPromotionDecisionService: topicSelectionV1cHumanPromotionDecisionService,
  });
  const topicSelectionV1cPaperProjectBridgeService = new TopicSelectionV1cPaperProjectBridgeService({
    repository: topicSelectionV1cPaperProjectBridgeRepository,
    humanPromotionDecisionService: topicSelectionV1cHumanPromotionDecisionService,
    paperProjectGateway: {
      createPaperProject: (input) => researchLifecycleService.createPaperProject(input),
      deletePaperProject: (paperId) => researchLifecycleService.deletePaperProject(paperId),
    },
  });
  const topicSelectionV1cDownstreamFeedbackRecheckService = new TopicSelectionV1cDownstreamFeedbackRecheckService({
    repository: topicSelectionV1cDownstreamFeedbackRecheckRepository,
    paperProjectBridgeService: topicSelectionV1cPaperProjectBridgeService,
    recheckRiskMemoryService: topicSelectionRecheckRiskMemoryService,
  });
  const paperImplementationIntakeBootstrapService = new PaperImplementationIntakeBootstrapService({
    repository: paperImplementationRepository,
    paperProjectBridgeService: options.paperImplementationBridgeService
      ?? topicSelectionV1cPaperProjectBridgeService,
    downstreamFeedbackService: options.paperImplementationDownstreamFeedbackService
      ?? topicSelectionV1cDownstreamFeedbackRecheckService,
  });
  const paperImplementationTraceKernelService = new PaperImplementationTraceKernelService({
    projectRepository: paperImplementationRepository,
    traceRepository: paperImplementationTraceRepository,
  });
  const paperImplementationMotiveEvidenceBoardService = new PaperImplementationMotiveEvidenceBoardService({
    projectRepository: paperImplementationRepository,
    motiveRepository: paperImplementationMotiveRepository,
    traceRepository: paperImplementationTraceRepository,
  });
  const paperImplementationValidationCyclePlanningService = new PaperImplementationValidationCyclePlanningService({
    projectRepository: paperImplementationRepository,
    motiveRepository: paperImplementationMotiveRepository,
    traceRepository: paperImplementationTraceRepository,
    validationRepository: paperImplementationValidationRepository,
    feedbackRecorder: paperImplementationIntakeBootstrapService,
  });
  const paperImplementationWorkOrderExperimentBridgeService = new PaperImplementationWorkOrderExperimentBridgeService({
    projectRepository: paperImplementationRepository,
    traceRepository: paperImplementationTraceRepository,
    validationRepository: paperImplementationValidationRepository,
    workOrderRepository: paperImplementationWorkOrderRepository,
  });
  const paperImplementationLiveExperimentAdapterService = new PaperImplementationLiveExperimentAdapterService({
    experimentExecution: experimentFoundationExecutionService,
    experimentRecords: experimentFoundationService,
    workOrderService: paperImplementationWorkOrderExperimentBridgeService,
    traceKernel: paperImplementationTraceKernelService,
    workOrderRepository: paperImplementationWorkOrderRepository,
  });
  const paperImplementationResultClaimDossierService = new PaperImplementationResultClaimDossierService({
    projectRepository: paperImplementationRepository,
    resultClaimRepository: paperImplementationResultClaimDossierRepository,
    traceRepository: paperImplementationTraceRepository,
    validationRepository: paperImplementationValidationRepository,
    workOrderRepository: paperImplementationWorkOrderRepository,
    feedbackRecorder: paperImplementationIntakeBootstrapService,
  });
  const paperImplementationAiWorkflowHarnessService = new PaperImplementationAiWorkflowHarnessService({
    projectRepository: paperImplementationRepository,
    traceRepository: paperImplementationTraceRepository,
    harnessRepository: paperImplementationAiWorkflowHarnessRepository,
  });
  const paperImplementationProviderVarianceEvaluationService = new PaperImplementationProviderVarianceEvaluationService({
    aiWorkflowHarness: paperImplementationAiWorkflowHarnessService,
  });
  const paperImplementationRuntimeAdmissionService = new PaperImplementationRuntimeAdmissionService({
    repository: paperImplementationRuntimeRepository,
  });
  const paperImplementationTraceIntegrityDebateAgentOrchestratorService = new TopicSelectionAgentOrchestratorService({
    controlPlane: topicSelectionControlPlaneService,
    llmGateway: options.paperImplementationTraceIntegrityDebateLlmGateway ?? llmGateway,
    promptPacketCache: topicSelectionPromptPacketCacheService,
  });
  const paperImplementationTraceIntegrityRetrievalService =
    new PaperImplementationTraceIntegrityRetrievalService();
  const paperImplementationTraceIntegrityDebateRuntimeService =
    new PaperImplementationTraceIntegrityDebateRuntimeService({
      runtimeAdmission: paperImplementationRuntimeAdmissionService,
      agentOrchestrator: paperImplementationTraceIntegrityDebateAgentOrchestratorService,
      retrievalService: paperImplementationTraceIntegrityRetrievalService,
    });
  const paperImplementationP1RuntimeReviewAgentOrchestratorService = new TopicSelectionAgentOrchestratorService({
    controlPlane: topicSelectionControlPlaneService,
    llmGateway: options.paperImplementationP1RuntimeReviewLlmGateway
      ?? options.paperImplementationTraceIntegrityDebateLlmGateway
      ?? llmGateway,
    promptPacketCache: topicSelectionPromptPacketCacheService,
  });
  const paperImplementationP1RuntimeReviewService =
    new PaperImplementationP1RuntimeReviewService({
      runtimeAdmission: paperImplementationRuntimeAdmissionService,
      agentOrchestrator: paperImplementationP1RuntimeReviewAgentOrchestratorService,
    });
  const paperImplementationResultAnalysisAgentOrchestratorService = new TopicSelectionAgentOrchestratorService({
    controlPlane: topicSelectionControlPlaneService,
    llmGateway: options.paperImplementationResultAnalysisLlmGateway
      ?? options.paperImplementationP1RuntimeReviewLlmGateway
      ?? options.paperImplementationTraceIntegrityDebateLlmGateway
      ?? llmGateway,
    promptPacketCache: topicSelectionPromptPacketCacheService,
  });
  const paperImplementationResultAnalysisRuntimeService =
    new PaperImplementationResultAnalysisRuntimeService({
      runtimeAdmission: paperImplementationRuntimeAdmissionService,
      agentOrchestrator: paperImplementationResultAnalysisAgentOrchestratorService,
    });
  const paperImplementationRoutePlanningAgentOrchestratorService = new TopicSelectionAgentOrchestratorService({
    controlPlane: topicSelectionControlPlaneService,
    llmGateway: options.paperImplementationRoutePlanningLlmGateway
      ?? options.paperImplementationResultAnalysisLlmGateway
      ?? options.paperImplementationP1RuntimeReviewLlmGateway
      ?? options.paperImplementationTraceIntegrityDebateLlmGateway
      ?? llmGateway,
    promptPacketCache: topicSelectionPromptPacketCacheService,
  });
  const paperImplementationRoutePlanningRuntimeService =
    new PaperImplementationRoutePlanningRuntimeService({
      runtimeAdmission: paperImplementationRuntimeAdmissionService,
      agentOrchestrator: paperImplementationRoutePlanningAgentOrchestratorService,
    });
  const paperImplementationValidationCyclePlanningAgentOrchestratorService =
    new TopicSelectionAgentOrchestratorService({
      controlPlane: topicSelectionControlPlaneService,
      llmGateway: options.paperImplementationValidationCyclePlanningLlmGateway
        ?? options.paperImplementationRoutePlanningLlmGateway
        ?? options.paperImplementationResultAnalysisLlmGateway
        ?? options.paperImplementationP1RuntimeReviewLlmGateway
        ?? options.paperImplementationTraceIntegrityDebateLlmGateway
        ?? llmGateway,
      promptPacketCache: topicSelectionPromptPacketCacheService,
    });
  const paperImplementationValidationCyclePlanningRuntimeService =
    new PaperImplementationValidationCyclePlanningRuntimeService({
      runtimeAdmission: paperImplementationRuntimeAdmissionService,
      agentOrchestrator: paperImplementationValidationCyclePlanningAgentOrchestratorService,
    });
  const paperImplementationFeasibilityPlanningAgentOrchestratorService =
    new TopicSelectionAgentOrchestratorService({
      controlPlane: topicSelectionControlPlaneService,
      llmGateway: options.paperImplementationFeasibilityPlanningLlmGateway
        ?? options.paperImplementationValidationCyclePlanningLlmGateway
        ?? options.paperImplementationRoutePlanningLlmGateway
        ?? options.paperImplementationResultAnalysisLlmGateway
        ?? options.paperImplementationP1RuntimeReviewLlmGateway
        ?? options.paperImplementationTraceIntegrityDebateLlmGateway
        ?? llmGateway,
      promptPacketCache: topicSelectionPromptPacketCacheService,
    });
  const paperImplementationFeasibilityPlanningRuntimeService =
    new PaperImplementationFeasibilityPlanningRuntimeService({
      runtimeAdmission: paperImplementationRuntimeAdmissionService,
      agentOrchestrator: paperImplementationFeasibilityPlanningAgentOrchestratorService,
    });
  const paperImplementationCrossBoardSynthesisAgentOrchestratorService =
    new TopicSelectionAgentOrchestratorService({
      controlPlane: topicSelectionControlPlaneService,
      llmGateway: options.paperImplementationCrossBoardSynthesisLlmGateway
        ?? options.paperImplementationFeasibilityPlanningLlmGateway
        ?? options.paperImplementationValidationCyclePlanningLlmGateway
        ?? options.paperImplementationRoutePlanningLlmGateway
        ?? options.paperImplementationResultAnalysisLlmGateway
        ?? options.paperImplementationP1RuntimeReviewLlmGateway
        ?? options.paperImplementationTraceIntegrityDebateLlmGateway
        ?? llmGateway,
      promptPacketCache: topicSelectionPromptPacketCacheService,
    });
  const paperImplementationCrossBoardSynthesisRuntimeService =
    new PaperImplementationCrossBoardSynthesisRuntimeService({
      runtimeAdmission: paperImplementationRuntimeAdmissionService,
      agentOrchestrator: paperImplementationCrossBoardSynthesisAgentOrchestratorService,
    });
  const paperImplementationEvidenceBoardCurationAgentOrchestratorService =
    new TopicSelectionAgentOrchestratorService({
      controlPlane: topicSelectionControlPlaneService,
      llmGateway: options.paperImplementationEvidenceBoardCurationLlmGateway
        ?? options.paperImplementationCrossBoardSynthesisLlmGateway
        ?? options.paperImplementationFeasibilityPlanningLlmGateway
        ?? options.paperImplementationValidationCyclePlanningLlmGateway
        ?? options.paperImplementationRoutePlanningLlmGateway
        ?? options.paperImplementationResultAnalysisLlmGateway
        ?? options.paperImplementationP1RuntimeReviewLlmGateway
        ?? options.paperImplementationTraceIntegrityDebateLlmGateway
        ?? llmGateway,
      promptPacketCache: topicSelectionPromptPacketCacheService,
    });
  const paperImplementationEvidenceBoardCurationRuntimeService =
    new PaperImplementationEvidenceBoardCurationRuntimeService({
      runtimeAdmission: paperImplementationRuntimeAdmissionService,
      agentOrchestrator: paperImplementationEvidenceBoardCurationAgentOrchestratorService,
    });
  const paperImplementationMotiveDecompositionAgentOrchestratorService =
    new TopicSelectionAgentOrchestratorService({
      controlPlane: topicSelectionControlPlaneService,
      llmGateway: options.paperImplementationMotiveDecompositionLlmGateway
        ?? options.paperImplementationEvidenceBoardCurationLlmGateway
        ?? options.paperImplementationCrossBoardSynthesisLlmGateway
        ?? options.paperImplementationFeasibilityPlanningLlmGateway
        ?? options.paperImplementationValidationCyclePlanningLlmGateway
        ?? options.paperImplementationRoutePlanningLlmGateway
        ?? options.paperImplementationResultAnalysisLlmGateway
        ?? options.paperImplementationP1RuntimeReviewLlmGateway
        ?? options.paperImplementationTraceIntegrityDebateLlmGateway
        ?? llmGateway,
      promptPacketCache: topicSelectionPromptPacketCacheService,
    });
  const paperImplementationMotiveDecompositionRuntimeService =
    new PaperImplementationMotiveDecompositionRuntimeService({
      runtimeAdmission: paperImplementationRuntimeAdmissionService,
      agentOrchestrator: paperImplementationMotiveDecompositionAgentOrchestratorService,
    });
  const paperImplementationMotiveEvolutionAgentOrchestratorService =
    new TopicSelectionAgentOrchestratorService({
      controlPlane: topicSelectionControlPlaneService,
      llmGateway: options.paperImplementationMotiveEvolutionLlmGateway
        ?? options.paperImplementationMotiveDecompositionLlmGateway
        ?? options.paperImplementationEvidenceBoardCurationLlmGateway
        ?? options.paperImplementationCrossBoardSynthesisLlmGateway
        ?? options.paperImplementationFeasibilityPlanningLlmGateway
        ?? options.paperImplementationValidationCyclePlanningLlmGateway
        ?? options.paperImplementationRoutePlanningLlmGateway
        ?? options.paperImplementationResultAnalysisLlmGateway
        ?? options.paperImplementationP1RuntimeReviewLlmGateway
        ?? options.paperImplementationTraceIntegrityDebateLlmGateway
        ?? llmGateway,
      promptPacketCache: topicSelectionPromptPacketCacheService,
    });
  const paperImplementationMotiveEvolutionRuntimeService =
    new PaperImplementationMotiveEvolutionRuntimeService({
      runtimeAdmission: paperImplementationRuntimeAdmissionService,
      agentOrchestrator: paperImplementationMotiveEvolutionAgentOrchestratorService,
    });
  const paperImplementationExperimentPlanningAgentOrchestratorService = new TopicSelectionAgentOrchestratorService({
    controlPlane: topicSelectionControlPlaneService,
    llmGateway: options.paperImplementationExperimentPlanningLlmGateway
      ?? options.paperImplementationMotiveEvolutionLlmGateway
      ?? options.paperImplementationMotiveDecompositionLlmGateway
      ?? options.paperImplementationEvidenceBoardCurationLlmGateway
      ?? options.paperImplementationCrossBoardSynthesisLlmGateway
      ?? options.paperImplementationFeasibilityPlanningLlmGateway
      ?? options.paperImplementationValidationCyclePlanningLlmGateway
      ?? options.paperImplementationRoutePlanningLlmGateway
      ?? options.paperImplementationResultAnalysisLlmGateway
      ?? options.paperImplementationP1RuntimeReviewLlmGateway
      ?? options.paperImplementationTraceIntegrityDebateLlmGateway
      ?? llmGateway,
    promptPacketCache: topicSelectionPromptPacketCacheService,
  });
  const paperImplementationExperimentPlanningRuntimeService =
    new PaperImplementationExperimentPlanningRuntimeService({
      runtimeAdmission: paperImplementationRuntimeAdmissionService,
      agentOrchestrator: paperImplementationExperimentPlanningAgentOrchestratorService,
    });
  const paperImplementationRuntimeDomainGateService =
    new PaperImplementationRuntimeDomainGateService({
      runtimeAdmission: paperImplementationRuntimeAdmissionService,
      resultClaimDossier: paperImplementationResultClaimDossierService,
    });
  const paperImplementationController = new PaperImplementationController({
    intakeBootstrap: paperImplementationIntakeBootstrapService,
    traceKernel: paperImplementationTraceKernelService,
    motiveEvidenceBoard: paperImplementationMotiveEvidenceBoardService,
    validationCyclePlanning: paperImplementationValidationCyclePlanningService,
    workOrderExperimentBridge: paperImplementationWorkOrderExperimentBridgeService,
    resultClaimDossier: paperImplementationResultClaimDossierService,
    aiWorkflowHarness: paperImplementationAiWorkflowHarnessService,
    runtimeAdmission: paperImplementationRuntimeAdmissionService,
    traceIntegrityDebateRuntime: paperImplementationTraceIntegrityDebateRuntimeService,
    p1RuntimeReview: paperImplementationP1RuntimeReviewService,
    resultAnalysisRuntime: paperImplementationResultAnalysisRuntimeService,
    experimentPlanningRuntime: paperImplementationExperimentPlanningRuntimeService,
    routePlanningRuntime: paperImplementationRoutePlanningRuntimeService,
    validationCyclePlanningRuntime: paperImplementationValidationCyclePlanningRuntimeService,
    feasibilityPlanningRuntime: paperImplementationFeasibilityPlanningRuntimeService,
    crossBoardSynthesisRuntime: paperImplementationCrossBoardSynthesisRuntimeService,
    evidenceBoardCurationRuntime: paperImplementationEvidenceBoardCurationRuntimeService,
    motiveDecompositionRuntime: paperImplementationMotiveDecompositionRuntimeService,
    motiveEvolutionRuntime: paperImplementationMotiveEvolutionRuntimeService,
    runtimeDomainGate: paperImplementationRuntimeDomainGateService,
    liveExperimentAdapter: paperImplementationLiveExperimentAdapterService,
    providerVarianceEvaluation: paperImplementationProviderVarianceEvaluationService,
  });
  const topicSelectionV1cController = new TopicSelectionV1cController(
    topicSelectionV1cPromotionInputService,
    topicSelectionV1cPromotionGateService,
    topicSelectionV1cHumanPromotionDecisionService,
    topicSelectionV1cPaperProjectBridgeService,
    topicSelectionV1cDownstreamFeedbackRecheckService,
    topicSelectionOfflineEvaluationReplayService,
    topicSelectionV1cN2BoundedDebateCoordinator,
    topicSelectionV1cN4DelegatedPromotionDecisionService,
  );
  const literatureAcquisitionSettingsService = new LiteratureAcquisitionSettingsService(applicationSettingsRepository);
  const literatureAcquisitionSettingsController = new LiteratureAcquisitionSettingsController(
    literatureAcquisitionSettingsService,
  );
  const literatureContentProcessingSettingsController = new LiteratureContentProcessingSettingsController(
    literatureContentProcessingSettingsService,
  );
  const literatureFlowService = new LiteratureFlowService(
    literatureRepository,
    literatureContentProcessingSettingsService,
    llmGateway,
  );
  const literatureService = new LiteratureService(
    literatureRepository,
    repository,
    literatureContentProcessingSettingsService,
    {
      literatureFlowService,
      literatureAcquisitionSettingsService,
      llmGateway,
    },
  );
  const literatureClusterService = new LiteratureClusterService(literatureRepository);
  const literatureBackfillService = new LiteratureBackfillService(literatureRepository, literatureFlowService, {
    resolvePreferredKeyContentMethod: () => literatureContentProcessingSettingsService.resolvePreferredKeyContentMethod(),
  });
  void literatureBackfillService.resumeRunnableJobs().catch((error) => {
    app.log.error({ err: error }, 'Failed to resume literature content-processing backfill jobs.');
  });
  // T-130 W-06 (D8): import auto-advance gate (default OFF via settings) — quality-tiered
  // AUTO_ADVANCE backfill jobs for newly imported literature.
  const literatureAutoAdvanceService = new LiteratureAutoAdvanceService(
    literatureRepository,
    literatureBackfillService,
    literatureContentProcessingSettingsService,
  );
  const literatureController = new LiteratureController(
    literatureService,
    literatureClusterService,
    literatureAutoAdvanceService,
  );
  // T-130 W-01: close orphaned pipeline runs from a previous process before new work arrives.
  void literatureFlowService.recoverOrphanedPipelineRuns().catch((error) => {
    app.log.error({ err: error }, 'Failed to recover orphaned literature pipeline runs.');
  });
  const literatureBackfillController = new LiteratureBackfillController(literatureBackfillService);
  const literatureFulltextAcquisitionService = new LiteratureFulltextAcquisitionService(
    literatureRepository,
    literatureService,
    literatureAcquisitionSettingsService,
  );
  void literatureFulltextAcquisitionService.resumeRunnableJobs().catch((error) => {
    app.log.error({ err: error }, 'Failed to resume literature fulltext acquisition jobs.');
  });
  const literatureFulltextAcquisitionController = new LiteratureFulltextAcquisitionController(
    literatureFulltextAcquisitionService,
  );
  const autoPullService = new AutoPullService(
    autoPullRepository,
    literatureService,
    {
      contentProcessingSettingsService: literatureContentProcessingSettingsService,
      acquisitionSettingsService: literatureAcquisitionSettingsService,
      llmGateway,
      sourceRuntimeStore: literatureRepository,
      autoAdvanceService: literatureAutoAdvanceService,
    },
  );
  const autoPullController = new AutoPullController(autoPullService);
  const topicSettingsController = new TopicSettingsController(autoPullService);
  const autoPullScheduler = createAutoPullScheduler(autoPullService);

  app.setErrorHandler((error, _request, reply) => {
    if ('validation' in error) {
      const validationMessage = formatSchemaValidationMessage(error);
      reply.status(400).send({
        error: {
          code: 'INVALID_PAYLOAD',
          message: validationMessage,
          details: {
            validation: sanitizeSchemaValidation(error),
          },
        },
      });
      return;
    }

    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  });

  app.get('/health', async () => ({ ok: true }));

  if (autoPullScheduler) {
    autoPullScheduler.start();
    app.addHook('onClose', async () => {
      await autoPullScheduler.stop();
    });
  }

  app.register(async (instance) => {
    await registerResearchLifecycleRoutes(instance, researchLifecycleController);
    await registerTitleCardManagementRoutes(instance, titleCardManagementController);
    await registerExperimentFoundationRoutes(instance, experimentFoundationController);
    await registerExperimentFoundationExecutionRoutes(instance, experimentFoundationExecutionController);
    await registerTopicSelectionV1aRoutes(instance, topicSelectionV1aController, topicSelectionResourceSamplingController);
    await registerTopicSelectionV1bRoutes(instance, topicSelectionV1bController);
    await registerTopicSelectionV1cRoutes(instance, topicSelectionV1cController);
    await registerPaperImplementationRoutes(instance, paperImplementationController);
    await registerLiteratureAcquisitionSettingsRoutes(instance, literatureAcquisitionSettingsController);
    await registerLiteratureContentProcessingSettingsRoutes(instance, literatureContentProcessingSettingsController);
    await registerLiteratureBackfillRoutes(instance, literatureBackfillController);
    await registerLiteratureFulltextAcquisitionRoutes(instance, literatureFulltextAcquisitionController);
    await registerLiteratureRoutes(instance, literatureController);
    await registerTopicSettingsRoutes(instance, topicSettingsController);
    await registerAutoPullRoutes(instance, autoPullController);
  });

  return app;
}

function createRepository(strategy: RepositoryStrategy): ResearchLifecycleRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaResearchLifecycleRepository(prisma);
  }

  return new InMemoryResearchLifecycleRepository();
}

function formatSchemaValidationMessage(error: unknown): string {
  const baseMessage = error instanceof Error ? error.message : 'Request payload failed schema validation.';
  const validation = readValidationEntries(error);
  const hasKeyContentProvenanceError = validation.some((entry) =>
    readString(entry.instancePath).endsWith('/provenance')
    && readString(entry.schemaPath).includes('/provenance'));
  if (hasKeyContentProvenanceError) {
    return [
      'Invalid key-content item provenance.',
      'Use item-level provenance "model_generated" or "user_edited";',
      'use request.curation_source "codex_curated" or "manual_curated" to identify who curated the dossier.',
    ].join(' ');
  }
  return baseMessage;
}

function sanitizeSchemaValidation(error: unknown): Array<Record<string, unknown>> {
  return readValidationEntries(error).slice(0, 20).map((entry) => ({
    instance_path: readString(entry.instancePath),
    schema_path: readString(entry.schemaPath),
    keyword: readString(entry.keyword),
    message: readString(entry.message),
    params: isRecord(entry.params) ? entry.params : {},
  }));
}

function readValidationEntries(error: unknown): Array<Record<string, unknown>> {
  if (!isRecord(error) || !Array.isArray(error.validation)) {
    return [];
  }
  return error.validation.filter(isRecord);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function createLiteratureRepository(strategy: RepositoryStrategy): LiteratureRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaLiteratureRepository(prisma);
  }

  return new InMemoryLiteratureRepository();
}

function createAutoPullRepository(strategy: RepositoryStrategy): AutoPullRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaAutoPullRepository(prisma);
  }

  return new InMemoryAutoPullRepository();
}

function createApplicationSettingsRepository(strategy: RepositoryStrategy): ApplicationSettingsRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaApplicationSettingsRepository(prisma);
  }

  return new InMemoryApplicationSettingsRepository();
}

function createTitleCardManagementRepository(strategy: RepositoryStrategy): TitleCardManagementRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTitleCardManagementRepository(prisma);
  }

  return new InMemoryTitleCardManagementRepository();
}

function createExperimentFoundationRepository(strategy: RepositoryStrategy): ExperimentFoundationRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaExperimentFoundationRepository(prisma);
  }

  return new InMemoryExperimentFoundationRepository();
}

function createExperimentFoundationExecutionRepository(
  strategy: RepositoryStrategy,
): ExperimentFoundationExecutionRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaExperimentFoundationExecutionRepository(prisma);
  }

  return new InMemoryExperimentFoundationExecutionRepository();
}

function createTopicSelectionControlPlaneRepository(
  strategy: RepositoryStrategy,
): TopicSelectionControlPlaneRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionControlPlaneRepository(prisma);
  }

  return new InMemoryTopicSelectionControlPlaneRepository();
}

function createTopicSelectionPromptPacketCacheStore(
  strategy: RepositoryStrategy,
): TopicSelectionPromptPacketCacheStore {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionPromptPacketCacheStore(prisma, {
      allowMissingTableFallback: true,
    });
  }

  return new InMemoryTopicSelectionPromptPacketCacheStore();
}

function createTopicSelectionResourceSamplingRepository(
  strategy: RepositoryStrategy,
): TopicSelectionResourceSamplingRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionResourceSamplingRepository(prisma);
  }

  return new InMemoryTopicSelectionResourceSamplingRepository();
}

function createTopicSelectionSearchResourceRepository(
  strategy: RepositoryStrategy,
): TopicSelectionSearchResourceRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionSearchResourceRepository(prisma);
  }

  return new InMemoryTopicSelectionSearchResourceRepository();
}

function createTopicSelectionEvidenceMapRepository(strategy: RepositoryStrategy): TopicSelectionEvidenceMapRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionEvidenceMapRepository(prisma);
  }

  return new InMemoryTopicSelectionEvidenceMapRepository();
}

function createTopicSelectionNeedValidationRepository(
  strategy: RepositoryStrategy,
): TopicSelectionNeedValidationRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionNeedValidationRepository(prisma);
  }

  return new InMemoryTopicSelectionNeedValidationRepository();
}

function createTopicSelectionRecheckRiskMemoryRepository(
  strategy: RepositoryStrategy,
): TopicSelectionRecheckRiskMemoryRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionRecheckRiskMemoryRepository(prisma);
  }

  return new InMemoryTopicSelectionRecheckRiskMemoryRepository();
}

function createTopicSelectionOfflineEvaluationReplayRepository(
  strategy: RepositoryStrategy,
): TopicSelectionOfflineEvaluationReplayRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionOfflineEvaluationReplayRepository(prisma);
  }

  return new InMemoryTopicSelectionOfflineEvaluationReplayRepository();
}

function createTopicSelectionV1bIntakeRepository(strategy: RepositoryStrategy): TopicSelectionV1bIntakeRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionV1bIntakeRepository(prisma);
  }

  return new InMemoryTopicSelectionV1bIntakeRepository();
}

function createTopicSelectionV1bResearchSliceRepository(
  strategy: RepositoryStrategy,
): TopicSelectionV1bResearchSliceRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionV1bResearchSliceRepository(prisma);
  }

  return new InMemoryTopicSelectionV1bResearchSliceRepository();
}

function createTopicSelectionV1bTopicQuestionRepository(
  strategy: RepositoryStrategy,
): TopicSelectionV1bTopicQuestionRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionV1bTopicQuestionRepository(prisma);
  }

  return new InMemoryTopicSelectionV1bTopicQuestionRepository();
}

function createTopicSelectionV1bValueAssessmentRepository(
  strategy: RepositoryStrategy,
): TopicSelectionV1bValueAssessmentRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionV1bValueAssessmentRepository(prisma);
  }

  return new InMemoryTopicSelectionV1bValueAssessmentRepository();
}

function createTopicSelectionV1bTopicPackageRepository(
  strategy: RepositoryStrategy,
  valueAssessmentRepository: TopicSelectionV1bValueAssessmentRepository,
): TopicSelectionV1bTopicPackageRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionV1bTopicPackageRepository(prisma);
  }

  return new InMemoryTopicSelectionV1bTopicPackageRepository(valueAssessmentRepository);
}

function createTopicSelectionV1cPromotionInputRepository(
  strategy: RepositoryStrategy,
): TopicSelectionV1cPromotionInputRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionV1cPromotionInputRepository(prisma);
  }

  return new InMemoryTopicSelectionV1cPromotionInputRepository();
}

function createTopicSelectionV1cPromotionGateRepository(
  strategy: RepositoryStrategy,
): TopicSelectionV1cPromotionGateRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionV1cPromotionGateRepository(prisma);
  }

  return new InMemoryTopicSelectionV1cPromotionGateRepository();
}

function createTopicSelectionV1cHumanPromotionDecisionRepository(
  strategy: RepositoryStrategy,
): TopicSelectionV1cHumanPromotionDecisionRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionV1cHumanPromotionDecisionRepository(prisma);
  }

  return new InMemoryTopicSelectionV1cHumanPromotionDecisionRepository();
}

function createTopicSelectionV1cPaperProjectBridgeRepository(
  strategy: RepositoryStrategy,
): TopicSelectionV1cPaperProjectBridgeRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionV1cPaperProjectBridgeRepository(prisma);
  }

  return new InMemoryTopicSelectionV1cPaperProjectBridgeRepository();
}

function createTopicSelectionV1cDownstreamFeedbackRecheckRepository(
  strategy: RepositoryStrategy,
): TopicSelectionV1cDownstreamFeedbackRecheckRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaTopicSelectionV1cDownstreamFeedbackRecheckRepository(prisma);
  }

  return new InMemoryTopicSelectionV1cDownstreamFeedbackRecheckRepository();
}

function createPaperImplementationRepository(
  strategy: RepositoryStrategy,
): PaperImplementationRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaPaperImplementationRepository(prisma);
  }

  return new InMemoryPaperImplementationRepository();
}

function createPaperImplementationTraceRepository(
  strategy: RepositoryStrategy,
): PaperImplementationTraceRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaPaperImplementationTraceRepository(prisma);
  }

  return new InMemoryPaperImplementationTraceRepository();
}

function createPaperImplementationMotiveRepository(
  strategy: RepositoryStrategy,
): PaperImplementationMotiveRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaPaperImplementationMotiveRepository(prisma);
  }

  return new InMemoryPaperImplementationMotiveRepository();
}

function createPaperImplementationValidationRepository(
  strategy: RepositoryStrategy,
): PaperImplementationValidationRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaPaperImplementationValidationRepository(prisma);
  }

  return new InMemoryPaperImplementationValidationRepository();
}

function createPaperImplementationWorkOrderRepository(
  strategy: RepositoryStrategy,
): PaperImplementationWorkOrderRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaPaperImplementationWorkOrderRepository(prisma);
  }

  return new InMemoryPaperImplementationWorkOrderRepository();
}

function createPaperImplementationResultClaimDossierRepository(
  strategy: RepositoryStrategy,
): PaperImplementationResultClaimDossierRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaPaperImplementationResultClaimDossierRepository(prisma);
  }

  return new InMemoryPaperImplementationResultClaimDossierRepository();
}

function createPaperImplementationAiWorkflowHarnessRepository(
  strategy: RepositoryStrategy,
): PaperImplementationAiWorkflowHarnessRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaPaperImplementationAiWorkflowHarnessRepository(prisma);
  }

  return new InMemoryPaperImplementationAiWorkflowHarnessRepository();
}

function createPaperImplementationRuntimeRepository(
  strategy: RepositoryStrategy,
): PaperImplementationRuntimeRepository {
  if (strategy === 'prisma') {
    const prisma = getPrismaClient();
    return new PrismaPaperImplementationRuntimeRepository(prisma);
  }

  return new InMemoryPaperImplementationRuntimeRepository();
}

function createAutoPullScheduler(service: AutoPullService): AutoPullScheduler | null {
  const enabled = process.env.AUTO_PULL_SCHEDULER_ENABLED ?? 'true';
  const normalized = enabled.trim().toLowerCase();
  if (normalized === 'false' || normalized === '0' || normalized === 'off') {
    return null;
  }

  const tickMsRaw = process.env.AUTO_PULL_SCHEDULER_TICK_MS;
  const tickMs = tickMsRaw ? Number.parseInt(tickMsRaw, 10) : undefined;
  return new AutoPullScheduler(service, { tickMs });
}

function createDeliveryAdapter():
  | InProcessGovernanceEventDeliveryAdapter
  | DurableOutboxGovernanceEventDeliveryAdapter {
  const mode = process.env.GOVERNANCE_DELIVERY_MODE ?? 'in-process';
  if (mode === 'durable-outbox') {
    const outboxStore = new FileGovernanceDeliveryOutboxStore({
      filePath: process.env.GOVERNANCE_OUTBOX_LOG_PATH,
    });
    return new DurableOutboxGovernanceEventDeliveryAdapter(outboxStore);
  }
  return new InProcessGovernanceEventDeliveryAdapter();
}

function resolveRepositoryStrategy(...candidates: Array<string | undefined>): RepositoryStrategy {
  const raw = candidates.find((candidate) => candidate !== undefined);
  if (!raw) {
    return 'memory';
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'memory' || normalized === 'prisma') {
    return normalized;
  }

  throw new Error(`Unsupported repository strategy "${raw}". Expected "memory" or "prisma".`);
}

function assertTitleCardManagementStoreCompatibility(config: {
  researchLifecycleStrategy: RepositoryStrategy;
  literatureStrategy: RepositoryStrategy;
  autoPullStrategy: RepositoryStrategy;
  titleCardStrategy: RepositoryStrategy;
  applicationSettingsStrategy: RepositoryStrategy;
  experimentFoundationStrategy: RepositoryStrategy;
  paperImplementationStrategy: RepositoryStrategy;
}) {
  if (config.titleCardStrategy !== 'prisma') {
    return;
  }

  if (
    config.titleCardStrategy !== config.researchLifecycleStrategy
    || config.titleCardStrategy !== config.literatureStrategy
    || config.titleCardStrategy !== config.autoPullStrategy
    || config.titleCardStrategy !== config.applicationSettingsStrategy
    || config.titleCardStrategy !== config.experimentFoundationStrategy
    || config.titleCardStrategy !== config.paperImplementationStrategy
  ) {
    throw new Error(
      'When title-card management uses Prisma, TITLE_CARD_REPOSITORY, RESEARCH_LIFECYCLE_REPOSITORY, AUTO_PULL_REPOSITORY, APPLICATION_SETTINGS_REPOSITORY, EXPERIMENT_FOUNDATION_REPOSITORY, and PAPER_IMPLEMENTATION_REPOSITORY must resolve to the same strategy.',
    );
  }
}
