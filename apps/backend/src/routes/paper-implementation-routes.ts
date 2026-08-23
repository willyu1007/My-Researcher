import type { FastifyInstance } from 'fastify';
import {
  bootstrapImplementationProjectRequestSchema,
  createPaperImplementationCoreMotiveHandoffRequestSchema,
  createPaperImplementationEvidenceBoardHandoffRequestSchema,
  createPaperImplementationScientificContinuationRequestSchema,
  createPaperImplementationTopicHandoffRequestSchema,
  recordImplementationFeedbackEventRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import {
  createCitationCandidateRequestSchema,
  createClaimTracePacketRequestSchema,
  createTraceManifestRequestSchema,
  evaluateTraceGateRequestSchema,
  registerNaturalLanguageFieldRoleRequestSchema,
  resolveTraceRepairQueueItemRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import {
  createHumanConfirmationRecordRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-human-confirmation-contracts';
import {
  admitCoreMotiveVersionRequestSchema,
  applyMotivePortfolioDecisionRequestSchema,
  createCoreMotiveDraftRequestSchema,
  createCrossBoardReviewRequestSchema,
  createEvidenceTransferBindingRequestSchema,
  createMotiveEvidenceBoardVersionRequestSchema,
  createMotiveEvolutionDecisionRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import {
  admitValidationCycleRequestSchema,
  completeValidationCycleRequestSchema,
  createExperimentPlanLightRequestSchema,
  createFeasibilityProbeRequestSchema,
  createTechnicalRouteCandidateRequestSchema,
  createValidationCycleDraftRequestSchema,
  createValidationUpstreamFeedbackCandidateRequestSchema,
  dispatchValidationUpstreamFeedbackCandidateRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import {
  admitResearchWorkOrderRequestSchema,
  createResearchWorkOrderDraftRequestSchema,
  recordRunMonitorIntakeRequestSchema,
  submitResearchWorkOrderHarnessRunRequestSchema,
  type AdmitResearchWorkOrderRequest,
  type CreateResearchWorkOrderDraftRequest,
  type RecordRunMonitorIntakeRequest,
  type SubmitResearchWorkOrderHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-workorder-contracts';
import {
  createClaimCandidateRequestSchema,
  createImplementationDossierRequestSchema,
  createResultInterpretationPacketRequestSchema,
  createWritingEntryPacketRequestSchema,
  recordResultClaimFeedbackEventRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import {
  createAgentWorkflowHarnessRunRequestSchema,
  createImplementationHarnessRequestSchema,
  createImplementationInputSnapshotRequestSchema,
  resolveDecisionWorkQueueItemRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-ai-workflow-harness-contracts';
import {
  cancelLiveExperimentRunRequestSchema,
  collectLiveExperimentRunRequestSchema,
  submitLiveExperimentRunRequestSchema,
  syncLiveExperimentRunRequestSchema,
  type CancelLiveExperimentRunRequest,
  type CollectLiveExperimentRunRequest,
  type SubmitLiveExperimentRunRequest,
  type SyncLiveExperimentRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-live-experiment-adapter-contracts';
import {
  runProviderVarianceEvaluationRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-provider-variance-contracts';
import {
  advancePaperImplementationCoordinatorRunRequestSchema,
  createPaperImplementationCoordinatorRunRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';
import {
  admitPaperImplementationRuntimeArtifactRequestSchema,
  listPaperImplementationRuntimeAdmissionRecordsQuerySchema,
  listPaperImplementationRuntimeArtifactsQuerySchema,
  runPaperImplementationCrossBoardSynthesisRuntimeRequestSchema,
  runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema,
  runPaperImplementationExperimentPlanningRuntimeRequestSchema,
  runPaperImplementationFeasibilityPlanningRuntimeRequestSchema,
  runPaperImplementationMotiveDecompositionRuntimeRequestSchema,
  runPaperImplementationMotiveEvolutionRuntimeRequestSchema,
  runPaperImplementationP1RuntimeReviewRequestSchema,
  runPaperImplementationRoutePlanningRuntimeRequestSchema,
  runPaperImplementationValidationCyclePlanningRuntimeRequestSchema,
  runPaperImplementationResultAnalysisRuntimeRequestSchema,
  runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';

import { PaperImplementationController } from '../controllers/paper-implementation-controller.js';
import { AppError } from '../errors/app-error.js';
import type { PaperImplementationRuntimeTelemetryService } from '../services/paper-implementation-runtime-telemetry-service.js';
import {
  legacyExperimentMutationOnRequest,
  type LegacyExperimentMutationRouteOptions,
} from './experiment-v2-cutover-guard.js';

const stringId = { type: 'string', minLength: 1 } as const;

function paramsSchema(properties: Record<string, unknown>) {
  return {
    params: {
      type: 'object',
      additionalProperties: false,
      required: Object.keys(properties),
      properties,
    },
  };
}

const implementationProjectParams = paramsSchema({ implementation_project_id: stringId });
const paperProjectBridgeParams = paramsSchema({ paper_project_bridge_id: stringId });
const traceManifestParams = paramsSchema({
  implementation_project_id: stringId,
  trace_manifest_id: stringId,
});
const traceRepairQueueItemParams = paramsSchema({
  implementation_project_id: stringId,
  queue_item_id: stringId,
});
const coreMotiveParams = paramsSchema({
  implementation_project_id: stringId,
  motive_id: stringId,
});
const coreMotiveVersionParams = paramsSchema({
  implementation_project_id: stringId,
  motive_id: stringId,
  core_motive_version_id: stringId,
});
const validationCycleParams = paramsSchema({
  implementation_project_id: stringId,
  validation_cycle_id: stringId,
});
const validationFeedbackCandidateParams = paramsSchema({
  implementation_project_id: stringId,
  candidate_id: stringId,
});
const researchWorkOrderParams = paramsSchema({
  implementation_project_id: stringId,
  work_order_id: stringId,
});
const liveExperimentRunParams = paramsSchema({
  implementation_project_id: stringId,
  work_order_id: stringId,
  external_job_id: stringId,
});
const runEvidenceUnitParams = paramsSchema({
  implementation_project_id: stringId,
  run_evidence_unit_id: stringId,
});
const resultInterpretationPacketParams = paramsSchema({
  implementation_project_id: stringId,
  result_interpretation_packet_id: stringId,
});
const claimCandidateParams = paramsSchema({
  implementation_project_id: stringId,
  claim_candidate_id: stringId,
});
const implementationDossierParams = paramsSchema({
  implementation_project_id: stringId,
  dossier_id: stringId,
});
const decisionWorkQueueItemParams = paramsSchema({
  implementation_project_id: stringId,
  queue_item_id: stringId,
});
const runtimeArtifactParams = paramsSchema({
  implementation_project_id: stringId,
  runtime_artifact_id: stringId,
});
const coordinatorRunParams = paramsSchema({
  implementation_project_id: stringId,
  coordinator_run_id: stringId,
});
const runtimeTelemetryRunParams = paramsSchema({
  implementation_project_id: stringId,
  run_id: stringId,
});

type ImplementationProjectRouteParams = {
  implementation_project_id: string;
};

type ResearchWorkOrderRouteParams = ImplementationProjectRouteParams & {
  work_order_id: string;
};

type LiveExperimentRunRouteParams = ResearchWorkOrderRouteParams & {
  external_job_id: string;
};

/**
 * S4 复审 FA-6: optional read-only runtime-telemetry service handle. When
 * provided, the merged `runtime-telemetry/overview` endpoint is registered
 * alongside the legacy `runs` / `repaid-rate` endpoints (both preserved).
 * Passed through route options (not the controller) so the additive endpoint
 * needs no controller surface change.
 */
export type PaperImplementationRouteOptions = LegacyExperimentMutationRouteOptions & {
  runtimeTelemetry?: Pick<PaperImplementationRuntimeTelemetryService, 'getProjectTelemetryOverview'> | null;
};

export async function registerPaperImplementationRoutes(
  fastify: FastifyInstance,
  controller: PaperImplementationController,
  options: PaperImplementationRouteOptions = {},
): Promise<void> {
  const legacyMutationOnRequest = legacyExperimentMutationOnRequest(options);

  fastify.post(
    '/paper-implementation/projects/bootstrap',
    { schema: { body: bootstrapImplementationProjectRequestSchema } },
    controller.bootstrapProject,
  );
  fastify.post(
    '/paper-implementation/topic-handoffs',
    { schema: { body: createPaperImplementationTopicHandoffRequestSchema } },
    controller.createTopicHandoff,
  );
  fastify.post(
    '/paper-implementation/scientific-continuations',
    { schema: { body: createPaperImplementationScientificContinuationRequestSchema } },
    controller.continueScientificDossier,
  );
  fastify.post(
    '/paper-implementation/core-motive-handoffs',
    { schema: { body: createPaperImplementationCoreMotiveHandoffRequestSchema } },
    controller.createCoreMotiveHandoff,
  );
  fastify.post(
    '/paper-implementation/evidence-board-handoffs',
    { schema: { body: createPaperImplementationEvidenceBoardHandoffRequestSchema } },
    controller.createEvidenceBoardHandoff,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id',
    { schema: implementationProjectParams },
    controller.getProject,
  );
  fastify.get(
    '/paper-implementation/projects/by-bridge/:paper_project_bridge_id',
    { schema: paperProjectBridgeParams },
    controller.getProjectByBridge,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/feedback-events',
    {
      schema: {
        ...implementationProjectParams,
        body: recordImplementationFeedbackEventRequestSchema,
      },
    },
    controller.recordFeedbackEvent,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/implementation-harnesses',
    {
      schema: {
        ...implementationProjectParams,
        body: createImplementationHarnessRequestSchema,
      },
    },
    controller.createImplementationHarness,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/implementation-harnesses',
    { schema: implementationProjectParams },
    controller.listImplementationHarnesses,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/implementation-input-snapshots',
    {
      schema: {
        ...implementationProjectParams,
        body: createImplementationInputSnapshotRequestSchema,
      },
    },
    controller.createImplementationInputSnapshot,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/implementation-input-snapshots',
    { schema: implementationProjectParams },
    controller.listImplementationInputSnapshots,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/runtime-artifacts',
    {
      schema: {
        ...implementationProjectParams,
        querystring: listPaperImplementationRuntimeArtifactsQuerySchema,
      },
    },
    controller.listRuntimeArtifacts,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/runtime-artifacts/:runtime_artifact_id/admit',
    {
      schema: {
        ...runtimeArtifactParams,
        body: admitPaperImplementationRuntimeArtifactRequestSchema,
      },
    },
    controller.admitRuntimeArtifact,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/runtime-artifacts/:runtime_artifact_id/materialize-domain-gate',
    {
      schema: runtimeArtifactParams,
    },
    controller.materializeRuntimeDomainGate,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/runtime-admission-records',
    {
      schema: {
        ...implementationProjectParams,
        querystring: listPaperImplementationRuntimeAdmissionRecordsQuerySchema,
      },
    },
    controller.listRuntimeAdmissionRecords,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/coordinator-runs',
    {
      schema: {
        ...implementationProjectParams,
        body: createPaperImplementationCoordinatorRunRequestSchema,
      },
    },
    controller.createCoordinatorRun,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/coordinator-runs',
    { schema: implementationProjectParams },
    controller.listCoordinatorRunsByProject,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/coordinator-runs/:coordinator_run_id/advance',
    {
      schema: {
        ...coordinatorRunParams,
        body: advancePaperImplementationCoordinatorRunRequestSchema,
      },
    },
    controller.advanceCoordinatorRun,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/coordinator-runs/:coordinator_run_id',
    { schema: coordinatorRunParams },
    controller.getCoordinatorRun,
  );
  // S4-A runtime telemetry read model.
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/runtime-telemetry/runs',
    { schema: implementationProjectParams },
    controller.listRuntimeTelemetryRunSummaries,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/runtime-telemetry/runs/:run_id',
    { schema: runtimeTelemetryRunParams },
    controller.getRuntimeTelemetryRunDetail,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/runtime-telemetry/repaid-rate',
    { schema: implementationProjectParams },
    controller.getRuntimeTelemetryProjectRepaidRate,
  );
  // S4 复审 FA-6: merged single-fetch overview ({runs, project_repaid_rate,
  // per_slot}) so desktop/runner consumers stop chaining the two endpoints
  // above. Additive; registered only when the telemetry service is wired.
  const runtimeTelemetry = options.runtimeTelemetry ?? null;
  if (runtimeTelemetry) {
    fastify.get(
      '/paper-implementation/projects/:implementation_project_id/runtime-telemetry/overview',
      { schema: implementationProjectParams },
      async (request, reply) => {
        try {
          const params = request.params as ImplementationProjectRouteParams;
          const overview = await runtimeTelemetry.getProjectTelemetryOverview(
            params.implementation_project_id,
          );
          return await reply.send(overview);
        } catch (error) {
          if (error instanceof AppError) {
            return reply.status(error.statusCode).send({
              error: { code: error.errorCode, message: error.message, details: error.details },
            });
          }
          request.log.error(error, 'paper-implementation runtime-telemetry overview error');
          return reply.status(500).send({
            error: { code: 'INTERNAL_ERROR', message: 'Unexpected paper-implementation failure.' },
          });
        }
      },
    );
  }
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/runtime-slots/trace-integrity-boundary-debate/run',
    {
      schema: {
        ...implementationProjectParams,
        body: runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema,
      },
    },
    controller.runTraceIntegrityBoundaryDebateRuntime,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/runtime-slots/claim-boundary-debate/run',
    {
      schema: {
        ...implementationProjectParams,
        body: runPaperImplementationP1RuntimeReviewRequestSchema,
      },
    },
    controller.runClaimBoundaryDebateRuntime,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/runtime-slots/dossier-readiness-audit/run',
    {
      schema: {
        ...implementationProjectParams,
        body: runPaperImplementationP1RuntimeReviewRequestSchema,
      },
    },
    controller.runDossierReadinessAuditRuntime,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/runtime-slots/result-analysis-scenarios/run',
    {
      schema: {
        ...implementationProjectParams,
        body: runPaperImplementationResultAnalysisRuntimeRequestSchema,
      },
    },
    controller.runResultAnalysisRuntime,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/runtime-slots/route-architecture-route-candidates/run',
    {
      schema: {
        ...implementationProjectParams,
        body: runPaperImplementationRoutePlanningRuntimeRequestSchema,
      },
    },
    controller.runRouteArchitectureRuntime,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/runtime-slots/route-skeptic-review-route-risk-critique/run',
    {
      schema: {
        ...implementationProjectParams,
        body: runPaperImplementationRoutePlanningRuntimeRequestSchema,
      },
    },
    controller.runRouteSkepticReviewRuntime,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/runtime-slots/validation-cycle-planning-cycle-candidates/run',
    {
      schema: {
        ...implementationProjectParams,
        body: runPaperImplementationValidationCyclePlanningRuntimeRequestSchema,
      },
    },
    controller.runValidationCyclePlanningRuntime,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/runtime-slots/feasibility-planning-probe-plan-candidates/run',
    {
      schema: {
        ...implementationProjectParams,
        body: runPaperImplementationFeasibilityPlanningRuntimeRequestSchema,
      },
    },
    controller.runFeasibilityPlanningRuntime,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/runtime-slots/cross-board-synthesis-merge-split-reuse-scenarios/run',
    {
      schema: {
        ...implementationProjectParams,
        body: runPaperImplementationCrossBoardSynthesisRuntimeRequestSchema,
      },
    },
    controller.runCrossBoardSynthesisRuntime,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/runtime-slots/evidence-board-curation-binding-gap-candidates/run',
    {
      schema: {
        ...implementationProjectParams,
        body: runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema,
      },
    },
    controller.runEvidenceBoardCurationRuntime,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/runtime-slots/motive-decomposition-draft-assertion-candidates/run',
    {
      schema: {
        ...implementationProjectParams,
        body: runPaperImplementationMotiveDecompositionRuntimeRequestSchema,
      },
    },
    controller.runMotiveDecompositionRuntime,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/runtime-slots/motive-evolution-decision-support/run',
    {
      schema: {
        ...implementationProjectParams,
        body: runPaperImplementationMotiveEvolutionRuntimeRequestSchema,
      },
    },
    controller.runMotiveEvolutionRuntime,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/runtime-slots/experiment-design-work-order-draft/run',
    {
      schema: {
        ...implementationProjectParams,
        body: runPaperImplementationExperimentPlanningRuntimeRequestSchema,
      },
    },
    controller.runExperimentDesignRuntime,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/runtime-slots/experiment-critique-plan-critique/run',
    {
      schema: {
        ...implementationProjectParams,
        body: runPaperImplementationExperimentPlanningRuntimeRequestSchema,
      },
    },
    controller.runExperimentCritiqueRuntime,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/agent-workflow-harness-runs',
    {
      schema: {
        ...implementationProjectParams,
        body: createAgentWorkflowHarnessRunRequestSchema,
      },
    },
    controller.createAgentWorkflowHarnessRun,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/agent-workflow-harness-runs',
    { schema: implementationProjectParams },
    controller.listAgentWorkflowHarnessRuns,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/implementation-proposal-artifacts',
    { schema: implementationProjectParams },
    controller.listImplementationProposalArtifacts,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/decision-work-queue',
    { schema: implementationProjectParams },
    controller.listDecisionWorkQueueItems,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/provider-variance-evaluations/run',
    {
      schema: {
        ...implementationProjectParams,
        body: runProviderVarianceEvaluationRequestSchema,
      },
    },
    controller.runProviderVarianceEvaluation,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/decision-work-queue/:queue_item_id/resolve',
    {
      schema: {
        ...decisionWorkQueueItemParams,
        body: resolveDecisionWorkQueueItemRequestSchema,
      },
    },
    controller.resolveDecisionWorkQueueItem,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/trace-manifests',
    {
      schema: {
        ...implementationProjectParams,
        body: createTraceManifestRequestSchema,
      },
    },
    controller.createTraceManifest,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/trace-manifests',
    { schema: implementationProjectParams },
    controller.listTraceManifests,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/trace-manifests/:trace_manifest_id',
    { schema: traceManifestParams },
    controller.getTraceManifest,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/citation-candidates',
    {
      schema: {
        ...implementationProjectParams,
        body: createCitationCandidateRequestSchema,
      },
    },
    controller.createCitationCandidate,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/citation-candidates',
    { schema: implementationProjectParams },
    controller.listCitationCandidates,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/claim-trace-packets',
    {
      schema: {
        ...implementationProjectParams,
        body: createClaimTracePacketRequestSchema,
      },
    },
    controller.createClaimTracePacket,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/claim-trace-packets',
    { schema: implementationProjectParams },
    controller.listClaimTracePackets,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/natural-language-field-roles',
    {
      schema: {
        ...implementationProjectParams,
        body: registerNaturalLanguageFieldRoleRequestSchema,
      },
    },
    controller.registerNaturalLanguageFieldRole,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/trace-gates/evaluate',
    {
      schema: {
        ...implementationProjectParams,
        body: evaluateTraceGateRequestSchema,
      },
    },
    controller.evaluateTraceGate,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/trace-repair-queue',
    { schema: implementationProjectParams },
    controller.listTraceRepairQueue,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/trace-repair-queue/:queue_item_id/resolve',
    {
      schema: {
        ...traceRepairQueueItemParams,
        body: resolveTraceRepairQueueItemRequestSchema,
      },
    },
    controller.resolveTraceRepairQueueItem,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/human-confirmations',
    {
      schema: {
        ...implementationProjectParams,
        body: createHumanConfirmationRecordRequestSchema,
      },
    },
    controller.createHumanConfirmationRecord,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/human-confirmations',
    { schema: implementationProjectParams },
    controller.listHumanConfirmationRecords,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/core-motives/drafts',
    {
      schema: {
        ...implementationProjectParams,
        body: createCoreMotiveDraftRequestSchema,
      },
    },
    controller.createCoreMotiveDraft,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/core-motives/:motive_id/versions/:core_motive_version_id/admit',
    {
      schema: {
        ...coreMotiveVersionParams,
        body: admitCoreMotiveVersionRequestSchema,
      },
    },
    controller.admitCoreMotiveVersion,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/core-motives',
    { schema: implementationProjectParams },
    controller.listCoreMotives,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/core-motives/:motive_id',
    { schema: coreMotiveParams },
    controller.getCoreMotive,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/core-motives/:motive_id/versions',
    { schema: coreMotiveParams },
    controller.listCoreMotiveVersions,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/motive-evidence-boards',
    {
      schema: {
        ...implementationProjectParams,
        body: createMotiveEvidenceBoardVersionRequestSchema,
      },
    },
    controller.createMotiveEvidenceBoardVersion,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/motive-evidence-boards',
    { schema: implementationProjectParams },
    controller.listMotiveEvidenceBoards,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/evidence-transfer-bindings',
    {
      schema: {
        ...implementationProjectParams,
        body: createEvidenceTransferBindingRequestSchema,
      },
    },
    controller.createEvidenceTransferBinding,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/evidence-transfer-bindings',
    { schema: implementationProjectParams },
    controller.listEvidenceTransferBindings,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/cross-board-reviews',
    {
      schema: {
        ...implementationProjectParams,
        body: createCrossBoardReviewRequestSchema,
      },
    },
    controller.createCrossBoardReview,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/motive-portfolio-decisions/apply',
    {
      schema: {
        ...implementationProjectParams,
        body: applyMotivePortfolioDecisionRequestSchema,
      },
    },
    controller.applyMotivePortfolioDecision,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/motive-portfolio-decisions',
    { schema: implementationProjectParams },
    controller.listMotivePortfolioDecisions,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/motive-evolution-decisions',
    {
      schema: {
        ...implementationProjectParams,
        body: createMotiveEvolutionDecisionRequestSchema,
      },
    },
    controller.createMotiveEvolutionDecision,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/validation-cycles/drafts',
    {
      schema: {
        ...implementationProjectParams,
        body: createValidationCycleDraftRequestSchema,
      },
    },
    controller.createValidationCycleDraft,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/validation-cycles/:validation_cycle_id/admit',
    {
      schema: {
        ...validationCycleParams,
        body: admitValidationCycleRequestSchema,
      },
    },
    controller.admitValidationCycle,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/validation-cycles/:validation_cycle_id/complete',
    {
      schema: {
        ...validationCycleParams,
        body: completeValidationCycleRequestSchema,
      },
    },
    controller.completeValidationCycle,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/validation-cycles',
    { schema: implementationProjectParams },
    controller.listValidationCycles,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/validation-cycles/:validation_cycle_id',
    { schema: validationCycleParams },
    controller.getValidationCycle,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/technical-route-candidates',
    {
      schema: {
        ...implementationProjectParams,
        body: createTechnicalRouteCandidateRequestSchema,
      },
    },
    controller.createTechnicalRouteCandidate,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/feasibility-probes',
    {
      schema: {
        ...implementationProjectParams,
        body: createFeasibilityProbeRequestSchema,
      },
    },
    controller.createFeasibilityProbe,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/experiment-plan-lights',
    {
      schema: {
        ...implementationProjectParams,
        body: createExperimentPlanLightRequestSchema,
      },
    },
    controller.createExperimentPlanLight,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/validation-planning-review-items',
    { schema: implementationProjectParams },
    controller.listValidationPlanningReviewItems,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/validation-upstream-feedback-candidates',
    {
      schema: {
        ...implementationProjectParams,
        body: createValidationUpstreamFeedbackCandidateRequestSchema,
      },
    },
    controller.createValidationUpstreamFeedbackCandidate,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/validation-upstream-feedback-candidates/:candidate_id/dispatch',
    {
      schema: {
        ...validationFeedbackCandidateParams,
        body: dispatchValidationUpstreamFeedbackCandidateRequestSchema,
      },
    },
    controller.dispatchValidationUpstreamFeedbackCandidate,
  );
  fastify.post<{
    Params: ImplementationProjectRouteParams;
    Body: CreateResearchWorkOrderDraftRequest;
  }>(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/drafts',
    {
      schema: {
        ...implementationProjectParams,
        body: createResearchWorkOrderDraftRequestSchema,
      },
      onRequest: legacyMutationOnRequest,
    },
    controller.createResearchWorkOrderDraft,
  );
  fastify.post<{
    Params: ResearchWorkOrderRouteParams;
    Body: AdmitResearchWorkOrderRequest;
  }>(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/admit',
    {
      schema: {
        ...researchWorkOrderParams,
        body: admitResearchWorkOrderRequestSchema,
      },
      onRequest: legacyMutationOnRequest,
    },
    controller.admitResearchWorkOrder,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders',
    { schema: implementationProjectParams },
    controller.listResearchWorkOrders,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id',
    { schema: researchWorkOrderParams },
    controller.getResearchWorkOrder,
  );
  fastify.post<{
    Params: ResearchWorkOrderRouteParams;
    Body: SubmitResearchWorkOrderHarnessRunRequest;
  }>(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/harness-runs',
    {
      schema: {
        ...researchWorkOrderParams,
        body: submitResearchWorkOrderHarnessRunRequestSchema,
      },
      onRequest: legacyMutationOnRequest,
    },
    controller.submitResearchWorkOrderHarnessRun,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/harness-runs',
    { schema: researchWorkOrderParams },
    controller.listResearchWorkOrderHarnessRuns,
  );
  fastify.post<{
    Params: ResearchWorkOrderRouteParams;
    Body: SubmitLiveExperimentRunRequest;
  }>(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/submit',
    {
      schema: {
        ...researchWorkOrderParams,
        body: submitLiveExperimentRunRequestSchema,
      },
      onRequest: legacyMutationOnRequest,
    },
    controller.submitLiveExperimentRun,
  );
  fastify.post<{
    Params: LiveExperimentRunRouteParams;
    Body: SyncLiveExperimentRunRequest;
  }>(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/:external_job_id/sync',
    {
      schema: {
        ...liveExperimentRunParams,
        body: syncLiveExperimentRunRequestSchema,
      },
      onRequest: legacyMutationOnRequest,
    },
    controller.syncLiveExperimentRun,
  );
  fastify.post<{
    Params: LiveExperimentRunRouteParams;
    Body: CollectLiveExperimentRunRequest;
  }>(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/:external_job_id/collect',
    {
      schema: {
        ...liveExperimentRunParams,
        body: collectLiveExperimentRunRequestSchema,
      },
      onRequest: legacyMutationOnRequest,
    },
    controller.collectLiveExperimentRun,
  );
  fastify.post<{
    Params: LiveExperimentRunRouteParams;
    Body: CancelLiveExperimentRunRequest;
  }>(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/:external_job_id/cancel',
    {
      schema: {
        ...liveExperimentRunParams,
        body: cancelLiveExperimentRunRequestSchema,
      },
      onRequest: legacyMutationOnRequest,
    },
    controller.cancelLiveExperimentRun,
  );
  fastify.post<{
    Params: ImplementationProjectRouteParams;
    Body: RecordRunMonitorIntakeRequest;
  }>(
    '/paper-implementation/projects/:implementation_project_id/run-monitor-intakes',
    {
      schema: {
        ...implementationProjectParams,
        body: recordRunMonitorIntakeRequestSchema,
      },
      onRequest: legacyMutationOnRequest,
    },
    controller.recordRunMonitorIntake,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/run-evidence-units',
    { schema: implementationProjectParams },
    controller.listRunEvidenceUnits,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/run-evidence-units/:run_evidence_unit_id',
    { schema: runEvidenceUnitParams },
    controller.getRunEvidenceUnit,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/result-interpretation-packets',
    {
      schema: {
        ...implementationProjectParams,
        body: createResultInterpretationPacketRequestSchema,
      },
    },
    controller.createResultInterpretationPacket,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/result-interpretation-packets',
    { schema: implementationProjectParams },
    controller.listResultInterpretationPackets,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/result-interpretation-packets/:result_interpretation_packet_id',
    { schema: resultInterpretationPacketParams },
    controller.getResultInterpretationPacket,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/claim-candidates',
    {
      schema: {
        ...implementationProjectParams,
        body: createClaimCandidateRequestSchema,
      },
    },
    controller.createClaimCandidate,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/claim-candidates',
    { schema: implementationProjectParams },
    controller.listClaimCandidates,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/claim-candidates/:claim_candidate_id',
    { schema: claimCandidateParams },
    controller.getClaimCandidate,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/implementation-dossiers',
    {
      schema: {
        ...implementationProjectParams,
        body: createImplementationDossierRequestSchema,
      },
    },
    controller.createImplementationDossier,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/implementation-dossiers',
    { schema: implementationProjectParams },
    controller.listImplementationDossiers,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/implementation-dossiers/:dossier_id',
    { schema: implementationDossierParams },
    controller.getImplementationDossier,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/implementation-dossiers/:dossier_id/writing-entry-packets',
    {
      schema: {
        ...implementationDossierParams,
        body: createWritingEntryPacketRequestSchema,
      },
    },
    controller.createWritingEntryPacket,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/writing-entry-packets',
    { schema: implementationProjectParams },
    controller.listWritingEntryPackets,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/result-claim-feedback-events',
    {
      schema: {
        ...implementationProjectParams,
        body: recordResultClaimFeedbackEventRequestSchema,
      },
    },
    controller.recordResultClaimFeedbackEvent,
  );
}
