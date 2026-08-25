import crypto from 'node:crypto';

import type {
  TopicSelectionActorType,
  TopicSelectionArtifactRefRecord,
  TopicSelectionChainTransitionAttemptRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionGateIssue,
  TopicSelectionGateVerdict,
  TopicSelectionInputSnapshotRecord,
  TopicSelectionLlmWorkflowRunRecord,
  TopicSelectionReadinessGateResultRecord,
  TopicSelectionTraceSnapshotRecord,
  TopicSelectionTransitionResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  CreatePaperProjectRequest,
  CreatePaperProjectResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-project-contracts';
import type {
  TopicSelectionPromotionBridgeHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import type {
  TopicSelectionPaperProjectBridgeCreateInput,
  TopicSelectionPaperProjectBridgeHandoff,
  TopicSelectionPaperProjectBridgeIntakeInput,
  TopicSelectionPaperProjectBridgeIntakeResult,
  TopicSelectionPaperProjectBridgeRecord,
  TopicSelectionPaperProjectBridgeWorkingCopyPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  TopicSelectionV1cPaperProjectBridgeControlPlanePersistence,
  TopicSelectionV1cPaperProjectBridgeRepository,
} from '../repositories/topic-selection-v1c-paper-project-bridge.repository.js';
import {
  TopicSelectionV1cPaperProjectBridgeAttachmentConflictError,
  TopicSelectionV1cPaperProjectBridgeHashConflictError,
} from '../repositories/topic-selection-v1c-paper-project-bridge.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import type { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';

const WORKFLOW_KEY = 'topic-selection.v1c-paper-project-bridge';
const GATE_KEY = 'topic-selection.v1c-paper-project-bridge-check';
const TRANSITION_KEY = 'v1c-promotion-decision-to-paper-project-bridge';
const WORKFLOW_PROFILE_KEY = 'topic-selection-paper-project-bridge';

type IdFactory = (prefix: string) => string;

export type TopicSelectionPromotionBridgeHandoffProvider = {
  getPromotionBridgeHandoff(
    promotionDecisionId: string,
  ): Promise<TopicSelectionPromotionBridgeHandoff>;
};

export type TopicSelectionV1cPaperProjectBridgeCreationResult = {
  paper_project_bridge: TopicSelectionPaperProjectBridgeRecord;
  handoff: TopicSelectionPaperProjectBridgeHandoff;
};

export type TopicSelectionPaperProjectIntakeGateway = {
  createPaperProject(input: CreatePaperProjectRequest): Promise<CreatePaperProjectResponse>;
  deletePaperProject(paperId: string): Promise<void>;
};

export type TopicSelectionV1cPaperProjectBridgeServiceOptions = {
  repository: TopicSelectionV1cPaperProjectBridgeRepository;
  humanPromotionDecisionService: TopicSelectionPromotionBridgeHandoffProvider;
  paperProjectGateway?: TopicSelectionPaperProjectIntakeGateway;
  checkpointControl: Pick<TopicSelectionResearchCheckpointService, 'assertCompleteCheckpointChain'>;
  idFactory?: IdFactory;
  now?: () => string;
};

export class TopicSelectionV1cPaperProjectBridgeService {
  private readonly repository: TopicSelectionV1cPaperProjectBridgeRepository;
  private readonly humanPromotionDecisionService: TopicSelectionPromotionBridgeHandoffProvider;
  private readonly paperProjectGateway: TopicSelectionPaperProjectIntakeGateway | null;
  private readonly checkpointControl: TopicSelectionV1cPaperProjectBridgeServiceOptions['checkpointControl'];
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(options: TopicSelectionV1cPaperProjectBridgeServiceOptions) {
    this.repository = options.repository;
    this.humanPromotionDecisionService = options.humanPromotionDecisionService;
    this.paperProjectGateway = options.paperProjectGateway ?? null;
    this.checkpointControl = options.checkpointControl;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async createPaperProjectBridge(
    input: TopicSelectionPaperProjectBridgeCreateInput,
  ): Promise<TopicSelectionV1cPaperProjectBridgeCreationResult> {
    const sourceHandoff = await this.humanPromotionDecisionService.getPromotionBridgeHandoff(
      input.promotion_decision_id,
    );
    this.assertBridgeEligibleSource(sourceHandoff);
    await this.assertCompleteCheckpointChain({
      title_card_id: sourceHandoff.promotion_commitment_profile.title_card_id,
      promotion_input_snapshot_ref: sourceHandoff.promotion_input_snapshot_ref,
      promotion_input_snapshot_hash: sourceHandoff.promotion_input_snapshot_hash,
    });
    this.assertHandoffLineageConsistency(sourceHandoff);
    this.assertRequiredBridgeSemantics(sourceHandoff);
    this.assertWorkspace(input.workspace_id ?? null, sourceHandoff);

    const workingCopyPayload = this.buildWorkingCopyPayload(sourceHandoff);
    const workingCopyPayloadHash = sha256Text(stableStringify(workingCopyPayload));
    const sourceRefs = this.compileSourceRefs(sourceHandoff);
    const bridgePayloadHash = sha256Text(stableStringify({
      source_promotion_decision_id: sourceHandoff.promotion_decision_id,
      promotion_commitment_profile_id:
        sourceHandoff.promotion_commitment_profile.promotion_commitment_profile_id,
      snapshot_hashes: sourceHandoff.snapshot_hashes,
      working_copy_payload_hash: workingCopyPayloadHash,
      conditions: sourceHandoff.conditions,
      accepted_risk_refs: sourceHandoff.accepted_risk_refs,
      early_check_obligations: sourceHandoff.early_check_obligations,
    }));
    const existing = await this.repository.findBridgeBySourcePromotionDecisionId(
      sourceHandoff.promotion_decision_id,
    );
    if (existing) {
      this.assertExistingBridgeMatchesSource({
        existing,
        sourceHandoff,
        workingCopyPayloadHash,
        bridgePayloadHash,
      });
      return {
        paper_project_bridge: existing,
        handoff: this.toHandoff(existing),
      };
    }

    const now = this.now();
    const createdBy = input.created_by ?? 'system';
    const bridgeId = this.idFactory('paper_project_bridge');
    const inputSnapshotId = this.idFactory('input_snapshot');
    const workflowRunId = this.idFactory('workflow_run');
    const artifactRefId = this.idFactory('artifact_ref');
    const gateResultId = this.idFactory('readiness_gate_result');
    const transitionAttemptId = this.idFactory('chain_transition_attempt');
    const traceSnapshotId = this.idFactory('trace_snapshot');
    const bridgeRef = this.ref(
      'paper_project_bridge',
      bridgeId,
      sourceHandoff.promotion_commitment_profile.title_card_id,
      sourceHandoff.promotion_input_snapshot_hash,
    );
    const artifactRef = this.ref(
      'artifact_ref',
      artifactRefId,
      sourceHandoff.promotion_commitment_profile.title_card_id,
      null,
    );
    const bridge: TopicSelectionPaperProjectBridgeRecord = {
      paper_project_bridge_id: bridgeId,
      bridge_status: 'active',
      workspace_id: sourceHandoff.promotion_decision.workspace_id ?? null,
      title_card_id: sourceHandoff.promotion_commitment_profile.title_card_id,
      source_promotion_decision_id: sourceHandoff.promotion_decision_id,
      source_promotion_decision_ref: sourceHandoff.promotion_decision_ref,
      human_promotion_decision_ref: sourceHandoff.human_promotion_decision_ref,
      human_confirmed_decision_ref: sourceHandoff.human_confirmed_decision_ref,
      promotion_commitment_profile_id:
        sourceHandoff.promotion_commitment_profile.promotion_commitment_profile_id,
      promotion_commitment_profile_ref: sourceHandoff.promotion_commitment_profile_ref,
      promotion_gate_check_ref: sourceHandoff.promotion_gate_check_ref,
      promotion_input_snapshot_id: sourceHandoff.promotion_input_snapshot_id,
      promotion_input_snapshot_ref: sourceHandoff.promotion_input_snapshot_ref,
      promotion_input_snapshot_hash: sourceHandoff.promotion_input_snapshot_hash,
      topic_package_id: sourceHandoff.topic_package_id,
      package_version: sourceHandoff.package_version,
      decision: sourceHandoff.decision,
      conditions: sourceHandoff.conditions,
      accepted_risk_refs: sourceHandoff.accepted_risk_refs,
      allowed_refinements: sourceHandoff.allowed_refinements,
      early_check_obligations: sourceHandoff.early_check_obligations,
      stop_conditions: sourceHandoff.stop_conditions,
      reopen_conditions: sourceHandoff.reopen_conditions,
      source_refs: sourceRefs,
      snapshot_hashes: sourceHandoff.snapshot_hashes,
      working_copy_payload: workingCopyPayload,
      working_copy_payload_hash: workingCopyPayloadHash,
      bridge_payload_hash: bridgePayloadHash,
      paper_project_intake_ref: null,
      target_paper_project_ref: null,
      source_promotion_handoff: sourceHandoff,
      input_snapshot_id: inputSnapshotId,
      workflow_run_id: workflowRunId,
      gate_result_id: gateResultId,
      transition_attempt_id: transitionAttemptId,
      trace_snapshot_id: traceSnapshotId,
      artifact_refs: [artifactRef],
      policy_version_id: input.policy_version_id ?? null,
      created_by: createdBy,
      created_at: now,
    };
    const controlPlane = this.buildControlPlaneRecords({
      bridge,
      bridgeRef,
      artifactRef,
      inputSnapshotId,
      workflowRunId,
      artifactRefId,
      gateResultId,
      transitionAttemptId,
      traceSnapshotId,
      policyVersionId: input.policy_version_id ?? null,
      createdBy,
      now,
    });

    const created = await this.repository.createBridge({
      paper_project_bridge: bridge,
      control_plane: controlPlane,
    });
    return {
      paper_project_bridge: created,
      handoff: this.toHandoff(created),
    };
  }

  async getPaperProjectBridge(
    paperProjectBridgeId: string,
  ): Promise<TopicSelectionPaperProjectBridgeRecord> {
    const bridge = await this.repository.findBridgeById(paperProjectBridgeId);
    if (!bridge) {
      throw new AppError(404, 'NOT_FOUND', `PaperProjectBridge ${paperProjectBridgeId} not found.`);
    }
    return bridge;
  }

  async getPaperProjectBridgeHandoff(
    paperProjectBridgeId: string,
  ): Promise<TopicSelectionPaperProjectBridgeHandoff> {
    return this.toHandoff(await this.getPaperProjectBridge(paperProjectBridgeId));
  }

  async createPaperProjectIntakeFromBridge(
    input: TopicSelectionPaperProjectBridgeIntakeInput,
  ): Promise<TopicSelectionPaperProjectBridgeIntakeResult> {
    if (!this.paperProjectGateway) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'PaperProjectBridge intake requires a configured PaperProject gateway.',
      );
    }
    if (!this.hasText(input.paper_project_bridge_id)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'PaperProjectBridge intake requires paper_project_bridge_id.');
    }
    if (!this.hasText(input.bridge_payload_hash)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'PaperProjectBridge intake requires bridge_payload_hash.');
    }
    const bridge = await this.getPaperProjectBridge(input.paper_project_bridge_id);
    await this.assertCompleteCheckpointChain({
      title_card_id: bridge.title_card_id,
      promotion_input_snapshot_ref: bridge.promotion_input_snapshot_ref,
      promotion_input_snapshot_hash: bridge.promotion_input_snapshot_hash,
    });
    this.assertConsumableBridge(bridge, input);

    if (bridge.paper_project_intake_ref && bridge.target_paper_project_ref) {
      return this.toIntakeResult({
        bridge,
        paperProjectCreated: false,
        carriedLiteratureEvidenceIds: this.deriveLiteratureEvidenceIds(bridge),
      });
    }
    if (bridge.paper_project_intake_ref || bridge.target_paper_project_ref) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `PaperProjectBridge ${bridge.paper_project_bridge_id} has incomplete downstream intake refs.`,
      );
    }

    const carriedLiteratureEvidenceIds = this.deriveLiteratureEvidenceIds(bridge);
    if (carriedLiteratureEvidenceIds.length === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `PaperProjectBridge ${bridge.paper_project_bridge_id} has no selected evidence refs for PaperProject intake.`,
      );
    }

    const createdBy = input.created_by ?? 'hybrid';
    const paperProject = await this.paperProjectGateway.createPaperProject({
      title_card_id: bridge.title_card_id,
      title: input.title?.trim() || bridge.working_copy_payload.editable_title,
      research_direction: input.research_direction?.trim() || 'LLM',
      created_by: createdBy,
      initial_context: {
        literature_evidence_ids: carriedLiteratureEvidenceIds,
      },
    });

    const paperProjectRef = this.ref(
      'paper_project',
      paperProject.paper_id,
      bridge.title_card_id,
      bridge.bridge_payload_hash,
    );
    const intakeRef = this.ref(
      'paper_project_intake',
      this.idFactory('paper_project_intake'),
      bridge.title_card_id,
      bridge.bridge_payload_hash,
    );

    try {
      const updated = await this.repository.attachPaperProjectRefs(bridge.paper_project_bridge_id, {
        expected_bridge_payload_hash: input.bridge_payload_hash,
        paper_project_intake_ref: intakeRef,
        target_paper_project_ref: paperProjectRef,
      });
      return this.toIntakeResult({
        bridge: updated,
        paperProjectCreated: true,
        carriedLiteratureEvidenceIds,
      });
    } catch (error) {
      await this.rollbackPaperProject(paperProject.paper_id, error);
      throw this.toAttachError(error, bridge.paper_project_bridge_id);
    }
  }

  private async assertCompleteCheckpointChain(input: {
    title_card_id: string;
    promotion_input_snapshot_ref: TopicSelectionFunctionalRef;
    promotion_input_snapshot_hash: string;
  }): Promise<void> {
    await this.checkpointControl.assertCompleteCheckpointChain(input);
  }

  private assertWorkspace(
    requestedWorkspaceId: string | null,
    sourceHandoff: TopicSelectionPromotionBridgeHandoff,
  ): void {
    const sourceWorkspaceId = this.resolveWorkspaceId(sourceHandoff);
    if (requestedWorkspaceId && requestedWorkspaceId !== sourceWorkspaceId) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `PromotionDecision workspace mismatch: requested ${requestedWorkspaceId}, source ${sourceWorkspaceId}.`,
      );
    }
  }

  private assertConsumableBridge(
    bridge: TopicSelectionPaperProjectBridgeRecord,
    input: TopicSelectionPaperProjectBridgeIntakeInput,
  ): void {
    if (bridge.bridge_status !== 'active') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `PaperProjectBridge ${bridge.paper_project_bridge_id} is not active.`,
      );
    }
    if (bridge.bridge_payload_hash !== input.bridge_payload_hash) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `PaperProjectBridge ${bridge.paper_project_bridge_id} bridge_payload_hash is stale.`,
      );
    }
    const requestedWorkspaceId = input.workspace_id ?? null;
    if (requestedWorkspaceId && requestedWorkspaceId !== (bridge.workspace_id ?? null)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `PaperProjectBridge workspace mismatch: requested ${requestedWorkspaceId}, bridge ${bridge.workspace_id ?? null}.`,
      );
    }
    if (!bridge.source_promotion_decision_id || !bridge.promotion_input_snapshot_hash) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `PaperProjectBridge ${bridge.paper_project_bridge_id} is missing promotion lineage.`,
      );
    }
  }

  private assertBridgeEligibleSource(
    sourceHandoff: TopicSelectionPromotionBridgeHandoff,
  ): void {
    const decision = sourceHandoff.promotion_decision;
    if (
      sourceHandoff.promotion_decision_status !== 'current'
      || decision.promotion_decision_status !== 'current'
      || decision.current_promotion_input_snapshot_key !== sourceHandoff.promotion_input_snapshot_id
      || !decision.bridge_eligible
      || decision.decision_class !== 'promote'
      || (decision.decision !== 'promote_to_paper_project'
        && decision.decision !== 'promote_with_conditions')
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `PromotionDecision ${sourceHandoff.promotion_decision_id} is not a current promote-class bridge source.`,
      );
    }
    if (
      !sourceHandoff.promotion_commitment_profile
      || !sourceHandoff.promotion_commitment_profile.promotion_commitment_profile_id
      || decision.promotion_commitment_profile_id
        !== sourceHandoff.promotion_commitment_profile.promotion_commitment_profile_id
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `PromotionDecision ${sourceHandoff.promotion_decision_id} is missing its commitment profile.`,
      );
    }
  }

  private assertHandoffLineageConsistency(
    sourceHandoff: TopicSelectionPromotionBridgeHandoff,
  ): void {
    const decision = sourceHandoff.promotion_decision;
    const humanDecision = sourceHandoff.human_promotion_decision;
    const commitment = sourceHandoff.promotion_commitment_profile;
    const mismatches: string[] = [];
    this.pushMismatch(
      mismatches,
      'promotion_decision_id',
      sourceHandoff.promotion_decision_id,
      decision.promotion_decision_id,
    );
    this.pushMismatch(mismatches, 'decision', sourceHandoff.decision, decision.decision);
    this.pushMismatch(
      mismatches,
      'promotion_input_snapshot_id',
      sourceHandoff.promotion_input_snapshot_id,
      decision.promotion_input_snapshot_id,
    );
    this.pushMismatch(
      mismatches,
      'promotion_input_snapshot_hash',
      sourceHandoff.promotion_input_snapshot_hash,
      decision.promotion_input_snapshot_hash,
    );
    this.pushMismatch(
      mismatches,
      'human_promotion_decision_id',
      decision.human_promotion_decision_id,
      humanDecision.human_promotion_decision_id,
    );
    this.pushMismatch(
      mismatches,
      'human_confirmed_decision_id',
      decision.human_confirmed_decision_id,
      humanDecision.human_confirmed_decision_id,
    );
    this.pushMismatch(
      mismatches,
      'promotion_decision_commitment_profile_id',
      decision.promotion_commitment_profile_id,
      commitment.promotion_commitment_profile_id,
    );
    this.pushMismatch(
      mismatches,
      'commitment_promotion_decision_id',
      sourceHandoff.promotion_decision_id,
      commitment.promotion_decision_id,
    );
    this.pushMismatch(
      mismatches,
      'commitment_promotion_input_snapshot_id',
      sourceHandoff.promotion_input_snapshot_id,
      commitment.promotion_input_snapshot_id,
    );
    this.pushMismatch(
      mismatches,
      'commitment_promotion_input_snapshot_hash',
      sourceHandoff.promotion_input_snapshot_hash,
      commitment.promotion_input_snapshot_hash,
    );
    this.pushMismatch(
      mismatches,
      'topic_package_id',
      sourceHandoff.topic_package_id,
      commitment.topic_package_id,
    );
    this.pushMismatch(
      mismatches,
      'package_version',
      sourceHandoff.package_version,
      commitment.package_version,
    );
    this.pushJsonMismatch(
      mismatches,
      'snapshot_hashes',
      sourceHandoff.snapshot_hashes,
      commitment.snapshot_hashes,
    );
    this.pushJsonMismatch(mismatches, 'conditions', sourceHandoff.conditions, commitment.conditions);
    this.pushJsonMismatch(
      mismatches,
      'accepted_risk_refs',
      sourceHandoff.accepted_risk_refs,
      commitment.accepted_risk_refs,
    );
    const workspaceIds = [
      decision.workspace_id ?? null,
      humanDecision.workspace_id ?? null,
      commitment.workspace_id ?? null,
    ].filter((workspaceId): workspaceId is string => this.hasText(workspaceId));
    if (new Set(workspaceIds).size > 1) {
      mismatches.push('workspace_id');
    }
    if (mismatches.length > 0) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `PromotionBridgeHandoff ${sourceHandoff.promotion_decision_id} has inconsistent lineage: ${mismatches.join(', ')}.`,
      );
    }
  }

  private assertRequiredBridgeSemantics(
    sourceHandoff: TopicSelectionPromotionBridgeHandoff,
  ): void {
    const commitment = sourceHandoff.promotion_commitment_profile;
    const scope = this.asRecord(commitment.scope);
    const excerpt = this.asRecord(scope.source_snapshot_excerpt);
    const missing: string[] = [];

    if (!this.hasText(commitment.claim_ceiling)) {
      missing.push('claim_ceiling');
    }
    if (!this.firstPresentText(scope, excerpt, 'contribution_summary')) {
      missing.push('contribution_summary');
    }
    if (!this.firstPresentText(scope, excerpt, 'evaluation_plan')) {
      missing.push('evaluation_plan');
    }
    if (!this.hasSelectedEvidence(sourceHandoff, excerpt)) {
      missing.push('selected_evidence_refs');
    }
    if (
      sourceHandoff.decision === 'promote_with_conditions'
      && sourceHandoff.conditions.length === 0
    ) {
      missing.push('conditions');
    }
    if (sourceHandoff.conditions.some((condition) =>
      !this.hasText(condition.condition_code)
      || !this.hasText(condition.required_action?.action_code)
      || !this.hasText(condition.required_action?.reason))) {
      missing.push('condition_required_actions');
    }

    if (missing.length > 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `PromotionDecision ${sourceHandoff.promotion_decision_id} is missing required bridge semantic fields: ${missing.join(', ')}.`,
      );
    }
  }

  private assertExistingBridgeMatchesSource(input: {
    existing: TopicSelectionPaperProjectBridgeRecord;
    sourceHandoff: TopicSelectionPromotionBridgeHandoff;
    workingCopyPayloadHash: string;
    bridgePayloadHash: string;
  }): void {
    const mismatches: string[] = [];
    this.pushMismatch(
      mismatches,
      'promotion_input_snapshot_hash',
      input.existing.promotion_input_snapshot_hash,
      input.sourceHandoff.promotion_input_snapshot_hash,
    );
    this.pushMismatch(
      mismatches,
      'promotion_commitment_profile_id',
      input.existing.promotion_commitment_profile_id,
      input.sourceHandoff.promotion_commitment_profile.promotion_commitment_profile_id,
    );
    this.pushMismatch(
      mismatches,
      'working_copy_payload_hash',
      input.existing.working_copy_payload_hash,
      input.workingCopyPayloadHash,
    );
    this.pushMismatch(
      mismatches,
      'bridge_payload_hash',
      input.existing.bridge_payload_hash,
      input.bridgePayloadHash,
    );
    if (mismatches.length > 0) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `PaperProjectBridge ${input.existing.paper_project_bridge_id} source handoff drifted for ${input.sourceHandoff.promotion_decision_id}: ${mismatches.join(', ')}.`,
      );
    }
  }

  private resolveWorkspaceId(
    sourceHandoff: TopicSelectionPromotionBridgeHandoff,
  ): string | null {
    return sourceHandoff.promotion_decision.workspace_id
      ?? sourceHandoff.human_promotion_decision.workspace_id
      ?? sourceHandoff.promotion_commitment_profile.workspace_id
      ?? null;
  }

  private pushMismatch(
    mismatches: string[],
    field: string,
    left: string | null | undefined,
    right: string | null | undefined,
  ): void {
    if ((left ?? null) !== (right ?? null)) {
      mismatches.push(field);
    }
  }

  private pushJsonMismatch(
    mismatches: string[],
    field: string,
    left: unknown,
    right: unknown,
  ): void {
    if (stableStringify(left) !== stableStringify(right)) {
      mismatches.push(field);
    }
  }

  private buildWorkingCopyPayload(
    sourceHandoff: TopicSelectionPromotionBridgeHandoff,
  ): TopicSelectionPaperProjectBridgeWorkingCopyPayload {
    const commitment = sourceHandoff.promotion_commitment_profile;
    const scope = this.asRecord(commitment.scope);
    const excerpt = this.asRecord(scope.source_snapshot_excerpt);
    const contributionSummary = this.firstText([
      this.readString(scope, 'contribution_summary'),
      this.readString(excerpt, 'contribution_summary'),
      `Contribution summary pending PaperProject intake for ${commitment.topic_package_id}.`,
    ]);
    const evaluationPlan = this.firstText([
      this.readString(scope, 'evaluation_plan'),
      this.readString(excerpt, 'evaluation_plan'),
      'Initial evaluation plan pending PaperProject intake.',
    ]);
    const initialPlanningNotes = this.uniqueStrings([
      ...sourceHandoff.conditions.map((condition) =>
        `Condition ${condition.condition_code}: ${condition.required_action.reason}`),
      ...sourceHandoff.early_check_obligations,
      ...sourceHandoff.accepted_risk_refs.map((risk) =>
        `Accepted risk carried forward: ${risk.ref_type}:${risk.ref_id}.`),
    ]);
    return {
      editable_title: this.firstText([
        this.readString(scope, 'editable_title'),
        this.readString(excerpt, 'editable_title'),
        this.readString(excerpt, 'working_title'),
        this.readString(excerpt, 'title'),
        `Draft paper for ${commitment.topic_package_id}`,
      ]),
      problem_statement: this.firstText([
        this.readString(scope, 'problem_statement'),
        this.readString(excerpt, 'problem_statement'),
        contributionSummary,
      ]),
      contribution_summary: contributionSummary,
      evaluation_plan: evaluationPlan,
      initial_planning_notes: initialPlanningNotes.length > 0
        ? initialPlanningNotes
        : ['PaperProject intake must preserve promotion lineage and accepted risks.'],
      claim_ceiling: commitment.claim_ceiling,
      prohibited_claims: commitment.prohibited_claims,
      conditions: commitment.conditions,
      accepted_risk_refs: commitment.accepted_risk_refs,
      early_check_obligations: commitment.early_check_obligations,
      source_lineage_summary: {
        topic_package_id: commitment.topic_package_id,
        package_version: commitment.package_version,
        promotion_decision_id: sourceHandoff.promotion_decision_id,
        promotion_input_snapshot_id: sourceHandoff.promotion_input_snapshot_id,
        snapshot_hashes: sourceHandoff.snapshot_hashes,
      },
    };
  }

  private buildControlPlaneRecords(input: {
    bridge: TopicSelectionPaperProjectBridgeRecord;
    bridgeRef: TopicSelectionFunctionalRef;
    artifactRef: TopicSelectionFunctionalRef;
    inputSnapshotId: string;
    workflowRunId: string;
    artifactRefId: string;
    gateResultId: string;
    transitionAttemptId: string;
    traceSnapshotId: string;
    policyVersionId: string | null;
    createdBy: TopicSelectionActorType;
    now: string;
  }): TopicSelectionV1cPaperProjectBridgeControlPlanePersistence {
    const inputSnapshotPayload = {
      source_promotion_handoff: input.bridge.source_promotion_handoff,
      bridge_create_request: {
        promotion_decision_id: input.bridge.source_promotion_decision_id,
        created_by: input.createdBy,
      },
      paper_project_created: false,
      policy_version_id: input.policyVersionId,
    };
    const inputSnapshot: TopicSelectionInputSnapshotRecord = {
      input_snapshot_id: input.inputSnapshotId,
      workspace_id: input.bridge.workspace_id ?? null,
      title_card_id: input.bridge.title_card_id,
      target_ref: input.bridge.source_promotion_decision_ref,
      context_policy_version_id: input.policyVersionId,
      policy_version: input.policyVersionId,
      snapshot_hash: sha256Text(stableStringify(inputSnapshotPayload)),
      source_refs: input.bridge.source_refs,
      permission_refs: [],
      payload: inputSnapshotPayload,
      created_by: input.createdBy,
      created_at: input.now,
    };
    const workflowRun: TopicSelectionLlmWorkflowRunRecord = {
      workflow_run_id: input.workflowRunId,
      workspace_id: input.bridge.workspace_id ?? null,
      title_card_id: input.bridge.title_card_id,
      workflow_key: WORKFLOW_KEY,
      workflow_profile_key: WORKFLOW_PROFILE_KEY,
      workflow_profile_version: '1',
      input_snapshot_id: input.inputSnapshotId,
      status: 'succeeded',
      provider_id: null,
      model_id: null,
      prompt_template_id: null,
      prompt_template_version: null,
      started_at: input.now,
      finished_at: input.now,
      telemetry: {
        deterministic_bridge_creation: true,
        paper_project_created: false,
      },
      output_summary: {
        paper_project_bridge_id: input.bridge.paper_project_bridge_id,
        bridge_status: input.bridge.bridge_status,
        source_promotion_decision_id: input.bridge.source_promotion_decision_id,
        working_copy_payload_hash: input.bridge.working_copy_payload_hash,
      },
      error_code: null,
      error_message: null,
      created_by: input.createdBy,
    };
    const artifactPayload = {
      paper_project_bridge: input.bridge,
      source_promotion_handoff: input.bridge.source_promotion_handoff,
      paper_project_created: false,
    };
    const artifactRefRecord: TopicSelectionArtifactRefRecord = {
      artifact_ref_id: input.artifactRefId,
      workspace_id: input.bridge.workspace_id ?? null,
      title_card_id: input.bridge.title_card_id,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      uri: null,
      payload: artifactPayload,
      checksum: sha256Text(stableStringify(artifactPayload)),
      byte_size: null,
      mime_type: 'application/json',
      workflow_run_id: input.workflowRunId,
      input_snapshot_id: input.inputSnapshotId,
      created_by: input.createdBy,
      created_at: input.now,
    };
    const warnings = this.toGateWarnings(input.bridge);
    const readinessGateResult: TopicSelectionReadinessGateResultRecord = {
      readiness_gate_result_id: input.gateResultId,
      workspace_id: input.bridge.workspace_id ?? null,
      title_card_id: input.bridge.title_card_id,
      gate_key: GATE_KEY,
      target_ref: input.bridgeRef,
      input_snapshot_id: input.inputSnapshotId,
      workflow_run_id: input.workflowRunId,
      policy_version_id: input.policyVersionId,
      verdict: this.toGateVerdict(input.bridge),
      blockers: [],
      warnings,
      required_actions: input.bridge.early_check_obligations,
      loopback_target: null,
      accepted_risk_refs: input.bridge.accepted_risk_refs,
      quality_signal_refs: [],
      created_by: input.createdBy,
      created_at: input.now,
    };
    const transitionAttempt: TopicSelectionChainTransitionAttemptRecord = {
      chain_transition_attempt_id: input.transitionAttemptId,
      workspace_id: input.bridge.workspace_id ?? null,
      title_card_id: input.bridge.title_card_id,
      transition_key: TRANSITION_KEY,
      source_ref: input.bridge.source_promotion_decision_ref,
      target_ref: input.bridgeRef,
      gate_result_id: input.gateResultId,
      workflow_run_id: input.workflowRunId,
      input_snapshot_id: input.inputSnapshotId,
      policy_version_id: input.policyVersionId,
      actor: {
        actor_type: input.createdBy,
        actor_id: input.createdBy === 'system' ? null : input.createdBy,
      },
      result: this.toTransitionResult(input.bridge),
      reason: 'Created PaperProjectBridge from current human-confirmed promotion decision.',
      required_actions: input.bridge.early_check_obligations,
      blockers: [],
      accepted_risk_refs: input.bridge.accepted_risk_refs,
      state_write_intents: [],
      created_authority_refs: [input.bridgeRef],
      created_at: input.now,
    };
    const traceSnapshotPayload = {
      paper_project_bridge_id: input.bridge.paper_project_bridge_id,
      source_promotion_decision_id: input.bridge.source_promotion_decision_id,
      source_snapshot_hashes: input.bridge.snapshot_hashes,
      working_copy_payload_hash: input.bridge.working_copy_payload_hash,
      bridge_payload_hash: input.bridge.bridge_payload_hash,
      paper_project_created: false,
    };
    const transitionRef = this.ref(
      'chain_transition_attempt',
      input.transitionAttemptId,
      input.bridge.title_card_id,
      null,
    );
    const traceSnapshot: TopicSelectionTraceSnapshotRecord = {
      trace_snapshot_id: input.traceSnapshotId,
      workspace_id: input.bridge.workspace_id ?? null,
      title_card_id: input.bridge.title_card_id,
      target_ref: input.bridgeRef,
      snapshot_hash: sha256Text(stableStringify(traceSnapshotPayload)),
      object_refs: this.uniqueRefs([
        input.bridgeRef,
        input.bridge.source_promotion_decision_ref,
        input.bridge.human_promotion_decision_ref,
        input.bridge.human_confirmed_decision_ref,
        input.bridge.promotion_commitment_profile_ref,
        input.bridge.promotion_gate_check_ref,
        input.bridge.promotion_input_snapshot_ref,
        ...input.bridge.source_refs,
      ]),
      lineage_link_refs: [],
      artifact_refs: [input.artifactRef],
      quality_signal_refs: [],
      transition_attempt_refs: [transitionRef],
      payload: traceSnapshotPayload,
      created_by: input.createdBy,
      created_at: input.now,
    };
    return {
      input_snapshot: inputSnapshot,
      workflow_run: workflowRun,
      artifact_refs: [artifactRefRecord],
      readiness_gate_result: readinessGateResult,
      transition_attempt: transitionAttempt,
      trace_snapshot: traceSnapshot,
    };
  }

  private toHandoff(
    bridge: TopicSelectionPaperProjectBridgeRecord,
  ): TopicSelectionPaperProjectBridgeHandoff {
    if (bridge.bridge_status !== 'active') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `PaperProjectBridge ${bridge.paper_project_bridge_id} is not active.`,
      );
    }
    return {
      paper_project_bridge_id: bridge.paper_project_bridge_id,
      paper_project_bridge_ref: this.ref(
        'paper_project_bridge',
        bridge.paper_project_bridge_id,
        bridge.title_card_id,
        bridge.promotion_input_snapshot_hash,
      ),
      bridge_status: 'active',
      source_promotion_decision_id: bridge.source_promotion_decision_id,
      source_promotion_decision_ref: bridge.source_promotion_decision_ref,
      promotion_commitment_profile_ref: bridge.promotion_commitment_profile_ref,
      promotion_input_snapshot_id: bridge.promotion_input_snapshot_id,
      promotion_input_snapshot_ref: bridge.promotion_input_snapshot_ref,
      promotion_input_snapshot_hash: bridge.promotion_input_snapshot_hash,
      topic_package_id: bridge.topic_package_id,
      package_version: bridge.package_version,
      decision: bridge.decision,
      working_copy_payload: bridge.working_copy_payload,
      working_copy_payload_hash: bridge.working_copy_payload_hash,
      bridge_payload_hash: bridge.bridge_payload_hash,
      conditions: bridge.conditions,
      accepted_risk_refs: bridge.accepted_risk_refs,
      allowed_refinements: bridge.allowed_refinements,
      early_check_obligations: bridge.early_check_obligations,
      stop_conditions: bridge.stop_conditions,
      reopen_conditions: bridge.reopen_conditions,
      source_refs: bridge.source_refs,
      snapshot_hashes: bridge.snapshot_hashes,
      paper_project_intake_ref: bridge.paper_project_intake_ref ?? null,
      target_paper_project_ref: bridge.target_paper_project_ref ?? null,
      bridge,
      source_promotion_handoff: bridge.source_promotion_handoff,
    };
  }

  private toIntakeResult(input: {
    bridge: TopicSelectionPaperProjectBridgeRecord;
    paperProjectCreated: boolean;
    carriedLiteratureEvidenceIds: string[];
  }): TopicSelectionPaperProjectBridgeIntakeResult {
    if (!input.bridge.paper_project_intake_ref || !input.bridge.target_paper_project_ref) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `PaperProjectBridge ${input.bridge.paper_project_bridge_id} has no downstream intake refs.`,
      );
    }
    return {
      paper_project_bridge: input.bridge,
      handoff: this.toHandoff(input.bridge),
      paper_project_id: input.bridge.target_paper_project_ref.ref_id,
      paper_project_ref: input.bridge.target_paper_project_ref,
      paper_project_intake_ref: input.bridge.paper_project_intake_ref,
      paper_project_created: input.paperProjectCreated,
      carried_literature_evidence_ids: input.carriedLiteratureEvidenceIds,
      carried_accepted_risk_refs: input.bridge.accepted_risk_refs,
      carried_condition_refs: this.conditionRefs(input.bridge),
    };
  }

  private deriveLiteratureEvidenceIds(bridge: TopicSelectionPaperProjectBridgeRecord): string[] {
    const handoff = this.asRecord(bridge.source_promotion_handoff);
    const commitment = this.asRecord(handoff.promotion_commitment_profile);
    const scope = this.asRecord(commitment.scope);
    const excerpt = this.asRecord(scope.source_snapshot_excerpt);
    const explicitIds = this.asArray(excerpt.selected_literature_evidence_ids)
      .filter((value): value is string => this.hasText(value as string | null));
    if (explicitIds.length > 0) {
      return this.uniqueStrings(explicitIds);
    }

    const selectedEvidenceIds = this.asArray(excerpt.selected_evidence_refs)
      .map((item) => this.asRecord(this.asRecord(item).evidence_ref).ref_id)
      .filter((value): value is string => this.hasText(value as string | null));
    if (selectedEvidenceIds.length > 0) {
      return this.uniqueStrings(selectedEvidenceIds);
    }

    return this.uniqueStrings(
      bridge.source_refs
        .filter((ref) => this.isPaperProjectEvidenceRef(ref))
        .map((ref) => ref.ref_id),
    );
  }

  private isPaperProjectEvidenceRef(ref: TopicSelectionFunctionalRef): boolean {
    return ref.ref_type === 'evidence_unit'
      || ref.ref_type === 'literature'
      || ref.ref_type === 'literature_record'
      || ref.ref_type === 'literature_evidence';
  }

  private conditionRefs(bridge: TopicSelectionPaperProjectBridgeRecord): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs(bridge.conditions.flatMap((condition) => [
      ...condition.refs,
      ...condition.required_action.refs,
    ]));
  }

  private async rollbackPaperProject(paperProjectId: string, originalError: unknown): Promise<void> {
    if (!this.paperProjectGateway) {
      return;
    }
    try {
      await this.paperProjectGateway.deletePaperProject(paperProjectId);
    } catch (rollbackError) {
      throw new AppError(
        500,
        'INTERNAL_ERROR',
        'PaperProjectBridge intake failed and rollback of the created PaperProject also failed.',
        {
          created_paper_id: paperProjectId,
          original_error: originalError instanceof Error ? originalError.message : 'unknown',
          rollback_error: rollbackError instanceof Error ? rollbackError.message : 'unknown',
        },
      );
    }
  }

  private toAttachError(error: unknown, paperProjectBridgeId: string): AppError | unknown {
    if (error instanceof TopicSelectionV1cPaperProjectBridgeHashConflictError) {
      return new AppError(
        409,
        'VERSION_CONFLICT',
        `PaperProjectBridge ${paperProjectBridgeId} bridge_payload_hash is stale.`,
      );
    }
    if (error instanceof TopicSelectionV1cPaperProjectBridgeAttachmentConflictError) {
      return new AppError(
        409,
        'VERSION_CONFLICT',
        `PaperProjectBridge ${paperProjectBridgeId} already has downstream paper-project refs.`,
      );
    }
    return error;
  }

  private toGateVerdict(bridge: TopicSelectionPaperProjectBridgeRecord): TopicSelectionGateVerdict {
    return bridge.accepted_risk_refs.length > 0 || bridge.conditions.length > 0
      ? 'pass_with_risk'
      : 'pass';
  }

  private toTransitionResult(
    bridge: TopicSelectionPaperProjectBridgeRecord,
  ): TopicSelectionTransitionResult {
    return bridge.accepted_risk_refs.length > 0 || bridge.conditions.length > 0
      ? 'passed_with_risk'
      : 'passed';
  }

  private toGateWarnings(
    bridge: TopicSelectionPaperProjectBridgeRecord,
  ): TopicSelectionGateIssue[] {
    const warnings: TopicSelectionGateIssue[] = [];
    if (bridge.accepted_risk_refs.length > 0) {
      warnings.push({
        code: 'accepted_risks_carried_into_bridge',
        message: 'Accepted risks were carried into the PaperProjectBridge handoff.',
        severity: 'warning',
        refs: bridge.accepted_risk_refs,
      });
    }
    if (bridge.conditions.length > 0) {
      warnings.push({
        code: 'promotion_conditions_carried_into_bridge',
        message: 'Promotion conditions were carried into the PaperProjectBridge handoff.',
        severity: 'warning',
        refs: bridge.conditions.flatMap((condition) => condition.refs),
      });
    }
    return warnings;
  }

  private compileSourceRefs(
    sourceHandoff: TopicSelectionPromotionBridgeHandoff,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      sourceHandoff.promotion_decision_ref,
      sourceHandoff.human_promotion_decision_ref,
      sourceHandoff.human_confirmed_decision_ref,
      sourceHandoff.promotion_commitment_profile_ref,
      sourceHandoff.promotion_gate_check_ref,
      sourceHandoff.promotion_input_snapshot_ref,
      ...sourceHandoff.source_refs,
      ...sourceHandoff.accepted_risk_refs,
      ...sourceHandoff.conditions.flatMap((condition) => [
        ...condition.refs,
        ...condition.required_action.refs,
      ]),
      ...sourceHandoff.allowed_refinements.flatMap((refinement) => refinement.refs),
      ...sourceHandoff.stop_conditions.flatMap((condition) => condition.refs),
      ...sourceHandoff.reopen_conditions.flatMap((condition) => condition.refs),
      ...this.extractSelectedEvidenceRefs(sourceHandoff),
    ]);
  }

  private extractSelectedEvidenceRefs(
    sourceHandoff: TopicSelectionPromotionBridgeHandoff,
  ): TopicSelectionFunctionalRef[] {
    const scope = this.asRecord(sourceHandoff.promotion_commitment_profile.scope);
    const excerpt = this.asRecord(scope.source_snapshot_excerpt);
    const selected = this.asArray(excerpt.selected_evidence_refs);
    const refs: TopicSelectionFunctionalRef[] = [];
    for (const item of selected) {
      const record = this.asRecord(item);
      if (this.hasRef(record)) {
        refs.push(record as unknown as TopicSelectionFunctionalRef);
      }
      const evidenceRef = this.asRecord(record.evidence_ref);
      if (this.hasRef(evidenceRef)) {
        refs.push(evidenceRef as unknown as TopicSelectionFunctionalRef);
      }
    }
    return refs;
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId: string | null,
    versionId: string | null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: titleCardId,
      version_id: versionId,
    };
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const result: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      if (!this.hasRef(ref)) {
        continue;
      }
      const key = `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(ref);
      }
    }
    return result;
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter((value) => this.hasText(value)))];
  }

  private firstText(values: Array<string | null>): string {
    return values.find((value): value is string => this.hasText(value)) ?? 'Pending PaperProject intake.';
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private readString(record: Record<string, unknown>, key: string): string | null {
    const value = record[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private firstPresentText(
    primary: Record<string, unknown>,
    secondary: Record<string, unknown>,
    key: string,
  ): string | null {
    return this.readString(primary, key) ?? this.readString(secondary, key);
  }

  private hasSelectedEvidence(
    sourceHandoff: TopicSelectionPromotionBridgeHandoff,
    excerpt: Record<string, unknown>,
  ): boolean {
    const explicitIds = this.asArray(excerpt.selected_literature_evidence_ids)
      .some((value) => this.hasText(value as string | null));
    return explicitIds || this.extractSelectedEvidenceRefs(sourceHandoff).length > 0;
  }

  private hasText(value: string | null | undefined): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private hasRef(value: unknown): value is TopicSelectionFunctionalRef {
    const record = this.asRecord(value);
    return this.hasText(record.ref_type as string | null)
      && this.hasText(record.ref_id as string | null);
  }

  /**
   * T-087 Phase 4 read-only projection — list PaperProjectBridges under a
   * title-card. Pure repository delegation.
   */
  async listBridgesByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionPaperProjectBridgeRecord[]> {
    return this.repository.listBridgesByTitleCardId(titleCardId);
  }
}
