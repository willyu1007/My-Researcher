import type {
  BootstrapImplementationProjectRequest,
  BootstrapImplementationProjectResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  ClaimTracePacket,
  ResolveTraceRepairQueueItemRequest,
  TraceManifest,
  TraceRepairQueueItem,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  ApplyMotivePortfolioDecisionRequest,
  CoreMotiveIdentity,
  MotiveEvidenceBoardVersion,
  MotivePortfolioDecision,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import type {
  DispatchValidationUpstreamFeedbackCandidateRequest,
  ExperimentPlanLight,
  TechnicalRouteCandidate,
  ValidationCycle,
  ValidationPlanningReviewItem,
  ValidationUpstreamFeedbackCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import type {
  ResearchWorkOrder,
  RunEvidenceUnit,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-workorder-contracts';
import type {
  ClaimCandidate,
  ImplementationDossier,
  PaperImplementationWritingEntryPacket,
  ResultInterpretationPacket,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  AgentWorkflowHarnessRun,
  DecisionWorkQueueItem,
  ImplementationProposalArtifact,
  ResolveDecisionWorkQueueItemRequest,
  ResolveDecisionWorkQueueItemResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-ai-workflow-harness-contracts';
import type {
  PaperImplementationCoordinatorRun,
  PaperImplementationCoordinatorRunWithSteps,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';
import type {
  PaperImplementationRuntimeTelemetryProjectRepaidRate,
  PaperImplementationRuntimeTelemetryRunDetail,
  PaperImplementationRuntimeTelemetryRunSummary,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-telemetry-contracts';
import type {
  CreateHumanConfirmationRecordRequest,
  HumanConfirmationRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-human-confirmation-contracts';

import { requestGovernance } from '../../literature/shared/api';

type ListResponse<T> = {
  items: T[];
};

export type PaperImplementationWorkbenchReadModels = {
  traceManifests: TraceManifest[];
  traceRepairQueue: TraceRepairQueueItem[];
  claimTracePackets: ClaimTracePacket[];
  coreMotives: CoreMotiveIdentity[];
  motiveEvidenceBoards: MotiveEvidenceBoardVersion[];
  motivePortfolioDecisions: MotivePortfolioDecision[];
  validationCycles: ValidationCycle[];
  technicalRouteCandidates: TechnicalRouteCandidate[];
  experimentPlanLights: ExperimentPlanLight[];
  validationPlanningReviewItems: ValidationPlanningReviewItem[];
  validationUpstreamFeedbackCandidates: ValidationUpstreamFeedbackCandidate[];
  researchWorkOrders: ResearchWorkOrder[];
  runEvidenceUnits: RunEvidenceUnit[];
  resultInterpretationPackets: ResultInterpretationPacket[];
  claimCandidates: ClaimCandidate[];
  implementationDossiers: ImplementationDossier[];
  writingEntryPackets: PaperImplementationWritingEntryPacket[];
  agentWorkflowHarnessRuns: AgentWorkflowHarnessRun[];
  implementationProposalArtifacts: ImplementationProposalArtifact[];
  decisionWorkQueue: DecisionWorkQueueItem[];
};

const emptyReadModels: PaperImplementationWorkbenchReadModels = {
  traceManifests: [],
  traceRepairQueue: [],
  claimTracePackets: [],
  coreMotives: [],
  motiveEvidenceBoards: [],
  motivePortfolioDecisions: [],
  validationCycles: [],
  technicalRouteCandidates: [],
  experimentPlanLights: [],
  validationPlanningReviewItems: [],
  validationUpstreamFeedbackCandidates: [],
  researchWorkOrders: [],
  runEvidenceUnits: [],
  resultInterpretationPackets: [],
  claimCandidates: [],
  implementationDossiers: [],
  writingEntryPackets: [],
  agentWorkflowHarnessRuns: [],
  implementationProposalArtifacts: [],
  decisionWorkQueue: [],
};

function projectPath(implementationProjectId: string, suffix: string): string {
  return `/paper-implementation/projects/${encodeURIComponent(implementationProjectId)}${suffix}`;
}

async function listItems<T>(implementationProjectId: string, suffix: string): Promise<T[]> {
  const response = await requestGovernance<ListResponse<T>>({
    method: 'GET',
    path: projectPath(implementationProjectId, suffix),
  });
  return response.items;
}

export function createEmptyPaperImplementationReadModels(): PaperImplementationWorkbenchReadModels {
  return { ...emptyReadModels };
}

export async function bootstrapImplementationProject(
  request: BootstrapImplementationProjectRequest,
): Promise<BootstrapImplementationProjectResponse> {
  return requestGovernance<BootstrapImplementationProjectResponse>({
    method: 'POST',
    path: '/paper-implementation/projects/bootstrap',
    body: request,
  });
}

export async function getImplementationProject(
  implementationProjectId: string,
): Promise<BootstrapImplementationProjectResponse> {
  return requestGovernance<BootstrapImplementationProjectResponse>({
    method: 'GET',
    path: projectPath(implementationProjectId, ''),
  });
}

export async function getImplementationProjectByBridge(
  paperProjectBridgeId: string,
): Promise<BootstrapImplementationProjectResponse> {
  return requestGovernance<BootstrapImplementationProjectResponse>({
    method: 'GET',
    path: `/paper-implementation/projects/by-bridge/${encodeURIComponent(paperProjectBridgeId)}`,
  });
}

export async function loadPaperImplementationReadModels(
  implementationProjectId: string,
): Promise<PaperImplementationWorkbenchReadModels> {
  const [
    traceManifests,
    traceRepairQueue,
    claimTracePackets,
    coreMotives,
    motiveEvidenceBoards,
    motivePortfolioDecisions,
    validationCycles,
    validationPlanningReviewItems,
    validationUpstreamFeedbackCandidates,
    researchWorkOrders,
    runEvidenceUnits,
    resultInterpretationPackets,
    claimCandidates,
    implementationDossiers,
    writingEntryPackets,
    agentWorkflowHarnessRuns,
    implementationProposalArtifacts,
    decisionWorkQueue,
  ] = await Promise.all([
    listItems<TraceManifest>(implementationProjectId, '/trace-manifests'),
    listItems<TraceRepairQueueItem>(implementationProjectId, '/trace-repair-queue'),
    listItems<ClaimTracePacket>(implementationProjectId, '/claim-trace-packets'),
    listItems<CoreMotiveIdentity>(implementationProjectId, '/core-motives'),
    listItems<MotiveEvidenceBoardVersion>(implementationProjectId, '/motive-evidence-boards'),
    listItems<MotivePortfolioDecision>(implementationProjectId, '/motive-portfolio-decisions'),
    listItems<ValidationCycle>(implementationProjectId, '/validation-cycles'),
    listItems<ValidationPlanningReviewItem>(implementationProjectId, '/validation-planning-review-items'),
    listItems<ValidationUpstreamFeedbackCandidate>(implementationProjectId, '/validation-upstream-feedback-candidates'),
    listItems<ResearchWorkOrder>(implementationProjectId, '/research-work-orders'),
    listItems<RunEvidenceUnit>(implementationProjectId, '/run-evidence-units'),
    listItems<ResultInterpretationPacket>(implementationProjectId, '/result-interpretation-packets'),
    listItems<ClaimCandidate>(implementationProjectId, '/claim-candidates'),
    listItems<ImplementationDossier>(implementationProjectId, '/implementation-dossiers'),
    listItems<PaperImplementationWritingEntryPacket>(implementationProjectId, '/writing-entry-packets'),
    listItems<AgentWorkflowHarnessRun>(implementationProjectId, '/agent-workflow-harness-runs'),
    listItems<ImplementationProposalArtifact>(implementationProjectId, '/implementation-proposal-artifacts'),
    listItems<DecisionWorkQueueItem>(implementationProjectId, '/decision-work-queue'),
  ]);

  return {
    traceManifests,
    traceRepairQueue,
    claimTracePackets,
    coreMotives,
    motiveEvidenceBoards,
    motivePortfolioDecisions,
    validationCycles,
    technicalRouteCandidates: [],
    experimentPlanLights: [],
    validationPlanningReviewItems,
    validationUpstreamFeedbackCandidates,
    researchWorkOrders,
    runEvidenceUnits,
    resultInterpretationPackets,
    claimCandidates,
    implementationDossiers,
    writingEntryPackets,
    agentWorkflowHarnessRuns,
    implementationProposalArtifacts,
    decisionWorkQueue,
  };
}

export async function resolveDecisionWorkQueueItem(
  implementationProjectId: string,
  queueItemId: string,
  request: ResolveDecisionWorkQueueItemRequest,
): Promise<ResolveDecisionWorkQueueItemResponse> {
  return requestGovernance<ResolveDecisionWorkQueueItemResponse>({
    method: 'POST',
    path: projectPath(
      implementationProjectId,
      `/decision-work-queue/${encodeURIComponent(queueItemId)}/resolve`,
    ),
    body: request,
  });
}

export async function resolveTraceRepairQueueItem(
  implementationProjectId: string,
  queueItemId: string,
  request: ResolveTraceRepairQueueItemRequest,
): Promise<TraceRepairQueueItem> {
  return requestGovernance<TraceRepairQueueItem>({
    method: 'POST',
    path: projectPath(
      implementationProjectId,
      `/trace-repair-queue/${encodeURIComponent(queueItemId)}/resolve`,
    ),
    body: request,
  });
}

export async function dispatchValidationUpstreamFeedbackCandidate(
  implementationProjectId: string,
  candidateId: string,
  request: DispatchValidationUpstreamFeedbackCandidateRequest,
): Promise<unknown> {
  return requestGovernance<unknown>({
    method: 'POST',
    path: projectPath(
      implementationProjectId,
      `/validation-upstream-feedback-candidates/${encodeURIComponent(candidateId)}/dispatch`,
    ),
    body: request,
  });
}

export async function applyMotivePortfolioDecision(
  implementationProjectId: string,
  request: ApplyMotivePortfolioDecisionRequest,
): Promise<MotivePortfolioDecision> {
  return requestGovernance<MotivePortfolioDecision>({
    method: 'POST',
    path: projectPath(implementationProjectId, '/motive-portfolio-decisions/apply'),
    body: request,
  });
}

// ---------------------------------------------------------------------------
// S4-B runtime lane: coordinator run + step timeline (read-only).
// The project-level list route returns run projections only (no steps);
// a single run is then loaded by its coordinator_run_id via
// GET .../coordinator-runs/:coordinator_run_id, which returns the run
// projection together with its ordered steps.
// ---------------------------------------------------------------------------

export async function listCoordinatorRunsByProject(
  implementationProjectId: string,
): Promise<PaperImplementationCoordinatorRun[]> {
  const response = await requestGovernance<{
    runs: PaperImplementationCoordinatorRun[];
  }>({
    method: 'GET',
    path: projectPath(implementationProjectId, '/coordinator-runs'),
  });
  return response.runs;
}

export async function getCoordinatorRun(
  implementationProjectId: string,
  coordinatorRunId: string,
): Promise<PaperImplementationCoordinatorRunWithSteps> {
  return requestGovernance<PaperImplementationCoordinatorRunWithSteps>({
    method: 'GET',
    path: projectPath(
      implementationProjectId,
      `/coordinator-runs/${encodeURIComponent(coordinatorRunId)}`,
    ),
  });
}

// ---------------------------------------------------------------------------
// S4-A runtime telemetry read model (three GET routes).
// ---------------------------------------------------------------------------

export async function listRuntimeTelemetryRunSummaries(
  implementationProjectId: string,
): Promise<PaperImplementationRuntimeTelemetryRunSummary[]> {
  const response = await requestGovernance<{
    runs: PaperImplementationRuntimeTelemetryRunSummary[];
  }>({
    method: 'GET',
    path: projectPath(implementationProjectId, '/runtime-telemetry/runs'),
  });
  return response.runs;
}

export async function getRuntimeTelemetryRunDetail(
  implementationProjectId: string,
  runId: string,
): Promise<PaperImplementationRuntimeTelemetryRunDetail> {
  return requestGovernance<PaperImplementationRuntimeTelemetryRunDetail>({
    method: 'GET',
    path: projectPath(
      implementationProjectId,
      `/runtime-telemetry/runs/${encodeURIComponent(runId)}`,
    ),
  });
}

export async function getRuntimeTelemetryProjectRepaidRate(
  implementationProjectId: string,
): Promise<PaperImplementationRuntimeTelemetryProjectRepaidRate> {
  return requestGovernance<PaperImplementationRuntimeTelemetryProjectRepaidRate>({
    method: 'GET',
    path: projectPath(implementationProjectId, '/runtime-telemetry/repaid-rate'),
  });
}

// ---------------------------------------------------------------------------
// S0 hand-off: HumanConfirmationRecord list + create (existing routes).
// ---------------------------------------------------------------------------

export async function listHumanConfirmationRecords(
  implementationProjectId: string,
): Promise<HumanConfirmationRecord[]> {
  return listItems<HumanConfirmationRecord>(implementationProjectId, '/human-confirmations');
}

export async function createHumanConfirmationRecord(
  implementationProjectId: string,
  request: CreateHumanConfirmationRecordRequest,
): Promise<HumanConfirmationRecord> {
  return requestGovernance<HumanConfirmationRecord>({
    method: 'POST',
    path: projectPath(implementationProjectId, '/human-confirmations'),
    body: request,
  });
}
