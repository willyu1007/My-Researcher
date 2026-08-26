import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { TopicSelectionControlPlaneService } from '../services/topic-selection-control-plane-service.js';
import { TopicSelectionOfflineEvaluationReplayService } from '../services/topic-selection-offline-evaluation-replay-service.js';
import { TopicSelectionV1bResearchSliceService } from '../services/topic-selection-v1b-research-slice-service.js';
import { TopicSelectionV1bTopicPackageService } from '../services/topic-selection-v1b-topic-package-service.js';
import { TopicSelectionV1bTopicQuestionService } from '../services/topic-selection-v1b-topic-question-service.js';
import { TopicSelectionV1bValueAssessmentService } from '../services/topic-selection-v1b-value-assessment-service.js';
import { TopicSelectionV1bWorkflowHarnessService } from '../services/topic-selection-v1b-workflow-harness-service.js';
import {
  TopicSelectionV1bRunCoordinatorService,
  type AdvanceTopicSelectionV1bRunInput,
} from '../services/topic-selection-v1b-run-coordinator-service.js';
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
  TopicSelectionV1bResearchSliceOptionSetDraftPayload,
  TopicSelectionV1bTopicValueAssessmentDraftPayload,
  TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
  TopicSelectionV1bWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type { TopicSelectionCodexAssistedAgentOutput } from '../services/topic-selection-agent-orchestrator-service.js';

type BodyRequest<T> = FastifyRequest<{ Body: T }>;
type ParamsRequest<T> = FastifyRequest<{ Params: T }>;
type BodyParamsRequest<TBody, TParams> = FastifyRequest<{ Body: TBody; Params: TParams }>;

/**
 * W-04: opt-in human-submission idempotency key. The N2/N5 human routes accept an
 * `X-Coordinator-Attempt-Nonce` header; when present, a same-(run, nonce) resubmission is rejected
 * with 409 instead of recording a duplicate human attempt. Absent/blank → no guard (unchanged).
 */
function readAttemptNonce(request: FastifyRequest): string | null {
  const raw = request.headers['x-coordinator-attempt-nonce'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export type SliceHumanSelectionBody = {
  selected_option_id: string;
  selection_rationale: string;
  actor: TopicSelectionActorRef;
  confidence?: number | null;
  decision_basis?: Record<string, unknown>;
  required_actions?: string[];
  accepted_risk_refs?: TopicSelectionFunctionalRef[];
  /** Join an existing coordinator-driven run; the attempt id is always service-generated
   * (a caller-supplied stale id would replay or drift-block the run's frontier). */
  workflow_run_id?: string | null;
};

export type ConstraintProfileHumanBody = {
  actor: TopicSelectionActorRef;
  profile: V1bHumanConstraintProfileContent;
  workflow_run_id?: string | null;
};

export type OfflineDatasetBody = Parameters<TopicSelectionOfflineEvaluationReplayService['createDataset']>[0];
export type WorkflowHarnessRunBody = TopicSelectionV1bWorkflowHarnessRunRequest;
const N4_CODEX_ASSISTED_NODE_ID = 'topic-selection.v1b.generate-research-slice-options.v1' as const;
const N6_CODEX_ASSISTED_NODE_ID = 'topic-selection.v1b.generate-topic-question-candidates.v1' as const;
const N8_CODEX_ASSISTED_NODE_ID = 'topic-selection.v1b.assess-topic-value.v1' as const;

type N4CodexAssistedInvocationBody = {
  request: TopicSelectionV1bWorkflowHarnessRunRequest & { node_id: typeof N4_CODEX_ASSISTED_NODE_ID };
  codex_response: TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1bResearchSliceOptionSetDraftPayload>;
};

type N6CodexAssistedInvocationBody = {
  request: TopicSelectionV1bWorkflowHarnessRunRequest & { node_id: typeof N6_CODEX_ASSISTED_NODE_ID };
  codex_response: TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload>;
};

type N8CodexAssistedInvocationBody = {
  request: TopicSelectionV1bWorkflowHarnessRunRequest & { node_id: typeof N8_CODEX_ASSISTED_NODE_ID };
  codex_response: TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1bTopicValueAssessmentDraftPayload>;
};

export type CodexAssistedInvocationBody =
  | N4CodexAssistedInvocationBody
  | N6CodexAssistedInvocationBody
  | N8CodexAssistedInvocationBody;

function isN4CodexAssistedInvocation(
  body: CodexAssistedInvocationBody,
): body is N4CodexAssistedInvocationBody {
  return body.request.node_id === N4_CODEX_ASSISTED_NODE_ID;
}

function isN6CodexAssistedInvocation(
  body: CodexAssistedInvocationBody,
): body is N6CodexAssistedInvocationBody {
  return body.request.node_id === N6_CODEX_ASSISTED_NODE_ID;
}
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
    private readonly runCoordinator: TopicSelectionV1bRunCoordinatorService,
  ) {}

  getWorkflowRunState = async (
    request: { params: { workflowRunId: string } },
    reply: FastifyReply,
  ) => {
    try {
      const state = await this.runCoordinator.getRunState(request.params.workflowRunId);
      if (!state.nodes.some((node) => node.latest)) {
        // A v1b run exists only as its recorded attempts — an all-empty projection is a
        // 404, not a legitimate "not started yet" state (matches the file's GET-by-id convention).
        throw new AppError(404, 'NOT_FOUND', `workflow run ${request.params.workflowRunId} has no recorded attempts.`);
      }
      return reply.status(200).send(state);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  advanceWorkflowRun = async (
    request: {
      params: { workflowRunId: string };
      body: Omit<AdvanceTopicSelectionV1bRunInput, 'workflow_run_id'>;
    },
    reply: FastifyReply,
  ) => {
    try {
      const report = await this.runCoordinator.advanceUntilBlocked({
        ...(request.body ?? {}),
        workflow_run_id: request.params.workflowRunId,
      });
      return reply.status(200).send(report);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /** T-128 W-15 O-1: record a provisional-thresholds run-override sign-off (W-16 contract).
   *  Route body stays permissive; the coordinator's strict Ajv is the authoritative validator
   *  (W-09 pattern). No RBAC yet — distinct endpoint + human actor in payload, honestly noted. */
  recordProvisionalSignOff = async (
    request: { params: { workflowRunId: string }; body: Record<string, unknown> },
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.runCoordinator.recordProvisionalRunOverrideSignOff({
        workflow_run_id: request.params.workflowRunId,
        payload: request.body,
        created_by: 'human',
      });
      return reply.status(result.already_recorded ? 200 : 201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /** T-128 W-15 O-2: record an audited loopback-budget raise (schema-capped at 5). */
  recordLoopbackBudgetRaise = async (
    request: { params: { workflowRunId: string }; body: Record<string, unknown> },
    reply: FastifyReply,
  ) => {
    try {
      const result = await this.runCoordinator.recordLoopbackBudgetRaise({
        workflow_run_id: request.params.workflowRunId,
        payload: request.body,
        created_by: 'human',
      });
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

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

  invokeCodexAssisted = async (
    request: BodyParamsRequest<CodexAssistedInvocationBody, { nodeId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      if (request.body.request.node_id !== request.params.nodeId) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Codex-assisted request node_id must match the route nodeId.');
      }
      const result = isN4CodexAssistedInvocation(request.body)
        ? await this.workflowHarness.invokeN4CodexAssisted(request.body)
        : isN6CodexAssistedInvocation(request.body)
          ? await this.workflowHarness.invokeN6CodexAssisted(request.body)
          : await this.workflowHarness.invokeN8CodexAssisted(request.body);
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
      const workflowRunId = request.body.workflow_run_id ?? undefined;
      if (workflowRunId) {
        await this.assertHumanRunBinding(workflowRunId, {
          human_node_id: 'topic-selection.v1b.select-research-slice.v1',
          upstream_node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
          route_target_ref_id: request.params.optionSetId,
          route_target_label: 'research_slice_option_set_id',
        });
      }
      const service = new V1bSliceHumanSelectionService(this.workflowHarness, this.researchSlice);
      const invoke = () => service.selectSlice({
        research_slice_option_set_id: request.params.optionSetId,
        selected_option_id: request.body.selected_option_id,
        selection_rationale: request.body.selection_rationale,
        actor: request.body.actor,
        confidence: request.body.confidence ?? null,
        decision_basis: request.body.decision_basis,
        required_actions: request.body.required_actions,
        accepted_risk_refs: request.body.accepted_risk_refs,
        workflow_run_id: workflowRunId,
      });
      // Same-run human writes share the coordinator's per-run mutex so they cannot interleave with
      // an in-progress advance; an optional X-Coordinator-Attempt-Nonce guards double-submits (W-04).
      const result = workflowRunId
        ? await this.runCoordinator.runHumanSubmissionExclusive(workflowRunId, readAttemptNonce(request), invoke)
        : await invoke();
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
      const workflowRunId = request.body.workflow_run_id ?? undefined;
      if (workflowRunId) {
        await this.assertHumanRunBinding(workflowRunId, {
          human_node_id: 'topic-selection.v1b.record-research-constraint-profile.v1',
          upstream_node_id: 'topic-selection.v1b.create-intake-snapshot.v1',
          route_target_ref_id: request.params.intakeSnapshotId,
          route_target_label: 'intake_snapshot_id',
        });
      }
      const service = new V1bConstraintProfileHumanService(this.workflowHarness);
      const invoke = () => service.recordConstraintProfile({
        intake_snapshot_id: request.params.intakeSnapshotId,
        profile: request.body.profile,
        actor: request.body.actor,
        workflow_run_id: workflowRunId,
      });
      // Per-run mutex + opt-in X-Coordinator-Attempt-Nonce double-submit guard (W-04).
      const result = workflowRunId
        ? await this.runCoordinator.runHumanSubmissionExclusive(workflowRunId, readAttemptNonce(request), invoke)
        : await invoke();
      return reply.status(201).send(result);
    } catch (error) {
      return handleError(reply, error);
    }
  };

  /**
   * A caller-supplied workflow_run_id binds a human decision into that run's timeline —
   * validate the binding before invoking the harness: the run must exist, the human node
   * must be the run's CURRENT frontier (next_node_id), and the route target must descend
   * from THIS run's upstream authority (a wrong/stale run id would otherwise contaminate
   * a foreign run).
   *
   * The frontier check keys on next_node_id ALONE (not "the node has any prior attempt").
   * next_node_id is derived purely from the last admitted node's route edge, so a human
   * node that submitted but only BLOCKED keeps next_node_id pointed at itself — retries and
   * loopback re-entries (which pull the frontier back) still pass. But once the node is
   * admitted and the frontier advances past it, a late/duplicate write with the stale
   * run id is rejected (409) instead of landing a fresh attempt that would poison the run.
   */
  private async assertHumanRunBinding(
    workflowRunId: string,
    binding: {
      human_node_id: string;
      upstream_node_id: string;
      route_target_ref_id: string;
      route_target_label: string;
    },
  ): Promise<void> {
    const state = await this.runCoordinator.getRunState(workflowRunId);
    if (!state.nodes.some((node) => node.latest)) {
      throw new AppError(404, 'NOT_FOUND', `workflow run ${workflowRunId} has no recorded attempts.`);
    }
    if (state.next_node_id !== binding.human_node_id) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `workflow run ${workflowRunId} is not awaiting ${binding.human_node_id} (next: ${state.next_node_id ?? 'none'}).`,
      );
    }
    const upstreamAuthority = state.nodes.find((node) => node.node_id === binding.upstream_node_id)
      ?.latest_admitted?.authority_ref;
    if (upstreamAuthority?.ref_id && upstreamAuthority.ref_id !== binding.route_target_ref_id) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `${binding.route_target_label} ${binding.route_target_ref_id} does not belong to workflow run ${workflowRunId} (its ${binding.upstream_node_id} authority is ${upstreamAuthority.ref_id}).`,
      );
    }
  }

  /** T-115 — read-only projection: intake snapshots for a title-card, so the
   * constraint-profile authoring surface can offer a snapshot picker. */
  listIntakeSnapshotsByTitleCard = async (
    request: ParamsRequest<{ titleCardId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.workflowHarness.listIntakeSnapshotsByTitleCardId(request.params.titleCardId);
      return reply.send({ items });
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

  /**
   * T-128 W-15 S3 — read-only list of a run's control-plane artifacts. Serves the workbench
   * run-operations surface (existing sign-offs / budget raises / diagnostics are all artifacts
   * on the run). List semantics: unknown run id → empty items, not 404.
   */
  listWorkflowRunArtifacts = async (
    request: ParamsRequest<{ workflowRunId: string }>,
    reply: FastifyReply,
  ) => {
    try {
      const items = await this.controlPlane.listArtifactRefsByWorkflowRunId(request.params.workflowRunId);
      return reply.send({ items });
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
