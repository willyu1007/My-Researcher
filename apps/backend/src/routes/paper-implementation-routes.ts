import type { FastifyInstance } from 'fastify';
import {
  bootstrapImplementationProjectRequestSchema,
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
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-live-experiment-adapter-contracts';
import {
  runProviderVarianceEvaluationRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-provider-variance-contracts';
import {
  admitPaperImplementationRuntimeArtifactRequestSchema,
  listPaperImplementationRuntimeAdmissionRecordsQuerySchema,
  listPaperImplementationRuntimeArtifactsQuerySchema,
  runPaperImplementationExperimentPlanningRuntimeRequestSchema,
  runPaperImplementationP1RuntimeReviewRequestSchema,
  runPaperImplementationResultAnalysisRuntimeRequestSchema,
  runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';

import { PaperImplementationController } from '../controllers/paper-implementation-controller.js';

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

export async function registerPaperImplementationRoutes(
  fastify: FastifyInstance,
  controller: PaperImplementationController,
): Promise<void> {
  fastify.post(
    '/paper-implementation/projects/bootstrap',
    { schema: { body: bootstrapImplementationProjectRequestSchema } },
    controller.bootstrapProject,
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
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/drafts',
    {
      schema: {
        ...implementationProjectParams,
        body: createResearchWorkOrderDraftRequestSchema,
      },
    },
    controller.createResearchWorkOrderDraft,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/admit',
    {
      schema: {
        ...researchWorkOrderParams,
        body: admitResearchWorkOrderRequestSchema,
      },
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
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/harness-runs',
    {
      schema: {
        ...researchWorkOrderParams,
        body: submitResearchWorkOrderHarnessRunRequestSchema,
      },
    },
    controller.submitResearchWorkOrderHarnessRun,
  );
  fastify.get(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/harness-runs',
    { schema: researchWorkOrderParams },
    controller.listResearchWorkOrderHarnessRuns,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/submit',
    {
      schema: {
        ...researchWorkOrderParams,
        body: submitLiveExperimentRunRequestSchema,
      },
    },
    controller.submitLiveExperimentRun,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/:external_job_id/sync',
    {
      schema: {
        ...liveExperimentRunParams,
        body: syncLiveExperimentRunRequestSchema,
      },
    },
    controller.syncLiveExperimentRun,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/:external_job_id/collect',
    {
      schema: {
        ...liveExperimentRunParams,
        body: collectLiveExperimentRunRequestSchema,
      },
    },
    controller.collectLiveExperimentRun,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/research-work-orders/:work_order_id/live-experiment-runs/:external_job_id/cancel',
    {
      schema: {
        ...liveExperimentRunParams,
        body: cancelLiveExperimentRunRequestSchema,
      },
    },
    controller.cancelLiveExperimentRun,
  );
  fastify.post(
    '/paper-implementation/projects/:implementation_project_id/run-monitor-intakes',
    {
      schema: {
        ...implementationProjectParams,
        body: recordRunMonitorIntakeRequestSchema,
      },
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
