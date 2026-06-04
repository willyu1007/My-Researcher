import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { TopicSelectionControlPlaneService } from '../services/topic-selection-control-plane-service.js';
import { TopicSelectionOfflineEvaluationReplayService } from '../services/topic-selection-offline-evaluation-replay-service.js';
import { TopicSelectionV1bResearchSliceService } from '../services/topic-selection-v1b-research-slice-service.js';
import { TopicSelectionV1bTopicPackageService } from '../services/topic-selection-v1b-topic-package-service.js';
import { TopicSelectionV1bTopicQuestionService } from '../services/topic-selection-v1b-topic-question-service.js';
import { TopicSelectionV1bValueAssessmentService } from '../services/topic-selection-v1b-value-assessment-service.js';
import { TopicSelectionV1bWorkflowHarnessService } from '../services/topic-selection-v1b-workflow-harness-service.js';
import { V1bSliceHumanSelectionService } from '../services/topic-selection-v1b-slice-human-selection-service.js';
import {
  V1bConstraintProfileHumanService,
  type V1bHumanConstraintProfileContent,
} from '../services/topic-selection-v1b-constraint-profile-human-service.js';
import type {
  TopicSelectionActorRef,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionV1bWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';

type BodyRequest<T> = FastifyRequest<{ Body: T }>;
type ParamsRequest<T> = FastifyRequest<{ Params: T }>;
type BodyParamsRequest<TBody, TParams> = FastifyRequest<{ Body: TBody; Params: TParams }>;

export type SliceHumanSelectionBody = {
  selected_option_id: string;
  selection_rationale: string;
  actor: TopicSelectionActorRef;
  confidence?: number | null;
  decision_basis?: Record<string, unknown>;
  required_actions?: string[];
  accepted_risk_refs?: TopicSelectionFunctionalRef[];
};

export type ConstraintProfileHumanBody = {
  actor: TopicSelectionActorRef;
  profile: V1bHumanConstraintProfileContent;
};

export type OfflineDatasetBody = Parameters<TopicSelectionOfflineEvaluationReplayService['createDataset']>[0];
export type WorkflowHarnessRunBody = TopicSelectionV1bWorkflowHarnessRunRequest;
export type WorkflowHarnessArtifactBody = Parameters<TopicSelectionControlPlaneService['recordArtifactRef']>[0];
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
    request.log.error(error, 'topic-selection v1b error');
  } else {
    console.error('[topic-selection-v1b]', error);
  }
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected topic-selection v1b failure.',
    },
  });
}

export class TopicSelectionV1bController {
  constructor(
    private readonly researchSlice: TopicSelectionV1bResearchSliceService,
    private readonly topicQuestion: TopicSelectionV1bTopicQuestionService,
    private readonly valueAssessment: TopicSelectionV1bValueAssessmentService,
    private readonly topicPackage: TopicSelectionV1bTopicPackageService,
    private readonly offlineReplay: TopicSelectionOfflineEvaluationReplayService,
    private readonly workflowHarness: TopicSelectionV1bWorkflowHarnessService,
    private readonly controlPlane: TopicSelectionControlPlaneService,
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

  /**
   * T-115 Phase 2 — human-authority N5 select-research-slice. Builds a
   * `human_delegated` harness invocation from persisted state and runs it
   * through the same harness path the native runner uses (no legacy direct
   * write). Returns the harness run result (gate_status admitted/blocked).
   */
  selectResearchSliceHuman = async (
    request: BodyParamsRequest<SliceHumanSelectionBody, { optionSetId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const service = new V1bSliceHumanSelectionService(this.workflowHarness, this.researchSlice);
      const result = await service.selectSlice({
        research_slice_option_set_id: request.params.optionSetId,
        selected_option_id: request.body.selected_option_id,
        selection_rationale: request.body.selection_rationale,
        actor: request.body.actor,
        confidence: request.body.confidence ?? null,
        decision_basis: request.body.decision_basis,
        required_actions: request.body.required_actions,
        accepted_risk_refs: request.body.accepted_risk_refs,
      });
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-115 Phase 2 — human-authority N2 record-research-constraint-profile. The
   * researcher authors the constraint profile; built into a `human_delegated`
   * harness invocation and run THROUGH the harness (no legacy direct write).
   */
  recordConstraintProfileHuman = async (
    request: BodyParamsRequest<ConstraintProfileHumanBody, { intakeSnapshotId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const service = new V1bConstraintProfileHumanService(this.workflowHarness);
      const result = await service.recordConstraintProfile({
        intake_snapshot_id: request.params.intakeSnapshotId,
        profile: request.body.profile,
        actor: request.body.actor,
      });
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

  getWorkflowHarnessTraceSnapshot = async (
    request: ParamsRequest<{ traceSnapshotId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.controlPlane.getTraceSnapshot(request.params.traceSnapshotId);
      if (!result) {
        throw new AppError(404, 'NOT_FOUND', 'Workflow harness trace snapshot not found.');
      }
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  getDraftPackage = async (request: ParamsRequest<{ topicPackageId: string }>, reply: FastifyReply) => {
    try {
      const result = await this.topicPackage.getDraftPackage(request.params.topicPackageId);
      return reply.send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  createOfflineEvaluationDataset = async (
    request: BodyRequest<OfflineDatasetBody>,
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.offlineReplay.createDataset({
        ...(request.body ?? {}),
        stage: 'v1b',
      });
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
      const result = await this.offlineReplay.createSyntheticV1bBaselineDataset(request.body ?? {});
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

  /**
   * T-087 Phase 3.1 — list ResearchSliceOptionSets for a title-card.
   */
  listResearchSliceOptionSetsByTitleCard = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.researchSlice.listOptionSetsByTitleCardId(request.params.titleCardId);
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-087 Phase 3.1 — list TopicQuestionCandidateSets for a title-card.
   */
  listTopicQuestionCandidateSetsByTitleCard = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.topicQuestion.listCandidateSetsByTitleCardId(request.params.titleCardId);
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-087 Phase 3.1 — list TopicValueAssessments for a title-card.
   */
  listTopicValueAssessmentsByTitleCard = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.valueAssessment.listAssessmentsByTitleCardId(request.params.titleCardId);
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-087 Phase 3.1 — list TopicPackages for a title-card.
   */
  listTopicPackagesByTitleCard = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.topicPackage.listPackagesByTitleCardId(request.params.titleCardId);
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-087 Phase 3.2 — list ResearchSliceOptions for an OptionSet picker.
   */
  listResearchSliceOptionsByOptionSet = async (
    request: ParamsRequest<{ optionSetId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.researchSlice.listOptionsByOptionSetId(request.params.optionSetId);
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * T-087 Phase 3.3 — list TopicQuestionCandidates for a CandidateSet picker.
   */
  listTopicQuestionCandidatesByCandidateSet = async (
    request: ParamsRequest<{ candidateSetId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.topicQuestion.listCandidatesByCandidateSetId(request.params.candidateSetId);
      return reply.send({ items });
    } catch (error) {
      return handleError(reply, error);
    }
  };
}
