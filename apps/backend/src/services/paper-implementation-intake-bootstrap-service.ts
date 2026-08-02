import crypto from 'node:crypto';

import {
  type BootstrapImplementationProjectRequest,
  type BootstrapImplementationProjectResponse,
  type ImplementationFeedbackEvent,
  type ImplementationFeedbackType,
  type ImplementationIntakeSnapshot,
  type ImplementationProject,
  type RecordImplementationFeedbackEventRequest,
  type RecordImplementationFeedbackEventResponse,
  type ImplementationUpstreamAction,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionPaperProjectBridgeHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';
import type {
  TopicSelectionPromotionCondition,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import type {
  TopicSelectionDownstreamLoopbackCause,
  TopicSelectionDownstreamTopicFeedbackCreateInput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';

import { AppError } from '../errors/app-error.js';
import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import {
  type TopicSelectionPaperProjectBridgeHandoffProvider,
  type TopicSelectionV1cDownstreamFeedbackRecheckResult,
} from './topic-selection-v1c-downstream-feedback-recheck-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

type IdFactory = (prefix: string) => string;

export type PaperImplementationDownstreamFeedbackService = {
  recordDownstreamTopicFeedback(
    input: TopicSelectionDownstreamTopicFeedbackCreateInput,
  ): Promise<TopicSelectionV1cDownstreamFeedbackRecheckResult>;
};

export type PaperImplementationIntakeBootstrapServiceOptions = {
  repository: PaperImplementationRepository;
  paperProjectBridgeService: TopicSelectionPaperProjectBridgeHandoffProvider;
  downstreamFeedbackService: PaperImplementationDownstreamFeedbackService;
  idFactory?: IdFactory;
  now?: () => string;
};

const FEEDBACK_SIGNAL_BY_TYPE: Record<ImplementationFeedbackType, TopicSelectionDownstreamLoopbackCause> = {
  infeasible_route: 'paper_project_constraint_conflict',
  unavailable_data: 'stale_evidence',
  invalidated_evidence: 'stale_evidence',
  lower_claim_ceiling: 'overclaim',
  topic_question_not_answerable: 'unanswerable_question',
  research_slice_too_broad: 'boundary_drift',
};

const PAPER_PROJECT_BINDING_REQUIRED_REASON_CODE = 'PAPER_PROJECT_BINDING_REQUIRED';
const PAPER_PROJECT_BINDING_CONFLICT_REASON_CODE = 'PAPER_PROJECT_BINDING_CONFLICT';
const LEGACY_RECORD_NOT_ELIGIBLE_REASON_CODE = 'LEGACY_RECORD_NOT_ELIGIBLE';

export class PaperImplementationIntakeBootstrapService {
  private readonly repository: PaperImplementationRepository;
  private readonly paperProjectBridgeService: TopicSelectionPaperProjectBridgeHandoffProvider;
  private readonly downstreamFeedbackService: PaperImplementationDownstreamFeedbackService;
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(options: PaperImplementationIntakeBootstrapServiceOptions) {
    this.repository = options.repository;
    this.paperProjectBridgeService = options.paperProjectBridgeService;
    this.downstreamFeedbackService = options.downstreamFeedbackService;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async bootstrapProject(
    request: BootstrapImplementationProjectRequest,
  ): Promise<BootstrapImplementationProjectResponse> {
    this.assertBootstrapRequest(request);

    const existingProject = await this.repository.findProjectByBridgeId(request.paper_project_bridge_id);
    if (existingProject) {
      if (existingProject.bridge_payload_hash !== request.bridge_payload_hash) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `ImplementationProject ${existingProject.implementation_project_id} already admits PaperProjectBridge ${request.paper_project_bridge_id} at a different bridge_payload_hash.`,
          {
            implementation_project_id: existingProject.implementation_project_id,
            admitted_bridge_payload_hash: existingProject.bridge_payload_hash,
            requested_bridge_payload_hash: request.bridge_payload_hash,
          },
        );
      }
      const existingSnapshot = await this.repository.findIntakeSnapshotByProjectId(
        existingProject.implementation_project_id,
      );
      if (!existingSnapshot) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          `ImplementationProject ${existingProject.implementation_project_id} is missing its intake snapshot.`,
        );
      }
      this.assertStoredBootstrapBinding(existingProject, existingSnapshot);
      return this.toBootstrapResponse(existingProject, existingSnapshot, false);
    }

    const handoff = await this.paperProjectBridgeService.getPaperProjectBridgeHandoff(
      request.paper_project_bridge_id,
    );
    const targetPaperProjectRef = this.assertUsableHandoff(handoff, request);

    const createdAt = this.now();
    const createdBy = request.created_by ?? 'system';
    const policyVersionId = request.policy_version_id ?? handoff.bridge.policy_version_id ?? null;
    const implementationProjectId = this.idFactory('implementation_project');
    const intakeSnapshotId = this.idFactory('implementation_intake_snapshot');
    const conditionRefs = this.conditionRefs(handoff);
    const snapshotHash = this.intakeSnapshotHash({
      implementation_project_id: implementationProjectId,
      paper_project_bridge_id: handoff.paper_project_bridge_id,
      bridge_payload_hash: handoff.bridge_payload_hash,
      promotion_decision_id: handoff.source_promotion_decision_id,
      promotion_commitment_profile_id: handoff.bridge.promotion_commitment_profile_id,
      promotion_input_snapshot_id: handoff.promotion_input_snapshot_id,
      promotion_input_snapshot_hash: handoff.promotion_input_snapshot_hash,
      topic_package_id: handoff.topic_package_id,
      package_version: handoff.package_version,
      snapshot_hashes: handoff.snapshot_hashes,
      source_refs: handoff.source_refs,
      accepted_risk_refs: handoff.accepted_risk_refs,
      condition_refs: conditionRefs,
      early_check_obligations: handoff.early_check_obligations,
      working_copy_payload_hash: handoff.working_copy_payload_hash,
      target_paper_project_ref: targetPaperProjectRef,
    });

    const project: ImplementationProject = {
      implementation_project_id: implementationProjectId,
      intake_snapshot_id: intakeSnapshotId,
      workspace_id: handoff.bridge.workspace_id ?? null,
      title_card_id: handoff.bridge.title_card_id,
      paper_project_bridge_id: handoff.paper_project_bridge_id,
      bridge_payload_hash: handoff.bridge_payload_hash,
      target_paper_project_ref: targetPaperProjectRef,
      lifecycle_status: 'active',
      freshness_status: 'fresh',
      source_status: 'active',
      version_number: 1,
      policy_version_id: policyVersionId,
      created_by: createdBy,
      created_at: createdAt,
      updated_at: createdAt,
    };
    const snapshot: ImplementationIntakeSnapshot = {
      intake_snapshot_id: intakeSnapshotId,
      implementation_project_id: implementationProjectId,
      workspace_id: handoff.bridge.workspace_id ?? null,
      title_card_id: handoff.bridge.title_card_id,
      paper_project_bridge_id: handoff.paper_project_bridge_id,
      paper_project_bridge_ref: handoff.paper_project_bridge_ref,
      bridge_payload_hash: handoff.bridge_payload_hash,
      promotion_decision_id: handoff.source_promotion_decision_id,
      promotion_decision_ref: handoff.source_promotion_decision_ref,
      promotion_commitment_profile_id: handoff.bridge.promotion_commitment_profile_id,
      promotion_commitment_profile_ref: handoff.promotion_commitment_profile_ref,
      promotion_input_snapshot_id: handoff.promotion_input_snapshot_id,
      promotion_input_snapshot_ref: handoff.promotion_input_snapshot_ref,
      promotion_input_snapshot_hash: handoff.promotion_input_snapshot_hash,
      topic_package_id: handoff.topic_package_id,
      package_version: handoff.package_version,
      source_status: 'active',
      snapshot_hashes: handoff.snapshot_hashes,
      source_refs: handoff.source_refs,
      accepted_risk_refs: handoff.accepted_risk_refs,
      condition_refs: conditionRefs,
      early_check_obligations: handoff.early_check_obligations,
      working_copy_payload: handoff.working_copy_payload,
      working_copy_payload_hash: handoff.working_copy_payload_hash,
      source_handoff: handoff,
      target_paper_project_ref: targetPaperProjectRef,
      intake_snapshot_hash: snapshotHash,
      policy_version_id: policyVersionId,
      created_by: createdBy,
      created_at: createdAt,
    };

    const persisted = await this.repository.createBootstrap({
      implementation_project: project,
      intake_snapshot: snapshot,
    });
    return this.toBootstrapResponse(
      persisted.implementation_project,
      persisted.intake_snapshot,
      persisted.created,
    );
  }

  async getProject(
    implementationProjectId: string,
  ): Promise<BootstrapImplementationProjectResponse> {
    if (!this.hasText(implementationProjectId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'implementation_project_id is required.');
    }
    const project = await this.repository.findProjectById(implementationProjectId);
    if (!project) {
      throw new AppError(404, 'NOT_FOUND', `ImplementationProject ${implementationProjectId} not found.`);
    }
    const snapshot = await this.repository.findIntakeSnapshotByProjectId(project.implementation_project_id);
    if (!snapshot) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `ImplementationProject ${implementationProjectId} is missing its intake snapshot.`,
      );
    }
    this.assertStoredBootstrapBinding(project, snapshot);
    return this.toBootstrapResponse(project, snapshot, false);
  }

  async getProjectByBridge(
    paperProjectBridgeId: string,
  ): Promise<BootstrapImplementationProjectResponse> {
    if (!this.hasText(paperProjectBridgeId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'paper_project_bridge_id is required.');
    }
    const project = await this.repository.findProjectByBridgeId(paperProjectBridgeId);
    if (!project) {
      throw new AppError(
        404,
        'NOT_FOUND',
        `ImplementationProject for PaperProjectBridge ${paperProjectBridgeId} not found.`,
      );
    }
    const snapshot = await this.repository.findIntakeSnapshotByProjectId(project.implementation_project_id);
    if (!snapshot) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `ImplementationProject ${project.implementation_project_id} is missing its intake snapshot.`,
      );
    }
    this.assertStoredBootstrapBinding(project, snapshot);
    return this.toBootstrapResponse(project, snapshot, false);
  }

  async recordFeedbackEvent(
    implementationProjectId: string,
    request: RecordImplementationFeedbackEventRequest,
  ): Promise<RecordImplementationFeedbackEventResponse> {
    if (!this.hasText(implementationProjectId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'implementation_project_id is required.');
    }
    this.assertFeedbackRequest(request);
    const project = await this.repository.findProjectById(implementationProjectId);
    if (!project) {
      throw new AppError(404, 'NOT_FOUND', `ImplementationProject ${implementationProjectId} not found.`);
    }
    const snapshot = await this.repository.findIntakeSnapshotByProjectId(implementationProjectId);
    if (!snapshot) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `ImplementationProject ${implementationProjectId} is missing its intake snapshot.`,
      );
    }

    const eventId = this.idFactory('implementation_feedback_event');
    const createdAt = this.now();
    const createdBy = request.created_by ?? 'system';
    const eventRef = this.ref(
      'implementation_feedback_event',
      eventId,
      project.title_card_id,
      project.bridge_payload_hash,
    );
    const recommendedUpstreamAction = this.resolveRecommendedAction(request.recommended_upstream_action);
    const feedbackSignal = FEEDBACK_SIGNAL_BY_TYPE[request.feedback_type];
    const policyVersionId = request.policy_version_id ?? project.policy_version_id ?? null;
    const event: ImplementationFeedbackEvent = {
      feedback_event_id: eventId,
      implementation_project_id: project.implementation_project_id,
      intake_snapshot_id: snapshot.intake_snapshot_id,
      paper_project_bridge_id: project.paper_project_bridge_id,
      feedback_type: request.feedback_type,
      severity: request.severity,
      summary: request.summary.trim(),
      source_object_refs: request.source_object_refs ?? [],
      evidence_refs: request.evidence_refs ?? [],
      run_refs: request.run_refs ?? [],
      recommended_upstream_action: recommendedUpstreamAction,
      feedback_status: 'recheck_requested',
      downstream_topic_feedback_ref: null,
      downstream_recheck_request: null,
      downstream_impact_summary: null,
      artifact_refs: request.artifact_refs ?? [],
      payload: {
        local_feedback_payload: request.feedback_payload ?? {},
        downstream_feedback_signal: feedbackSignal,
        downstream_dispatch_status: 'requested',
        source_kind: 'paper_implementation',
      },
      policy_version_id: policyVersionId,
      created_by: createdBy,
      created_at: createdAt,
    };
    const created = await this.repository.createFeedbackEvent(event);
    const downstreamResult = await this.downstreamFeedbackService.recordDownstreamTopicFeedback({
      paper_project_bridge_id: project.paper_project_bridge_id,
      workspace_id: project.workspace_id ?? null,
      downstream_source_kind: 'paper_implementation',
      downstream_source_ref: eventRef,
      source_feedback_refs: request.source_object_refs ?? [],
      observed_blocker_refs: [
        ...(request.evidence_refs ?? []),
        ...(request.run_refs ?? []),
      ],
      feedback_signal: FEEDBACK_SIGNAL_BY_TYPE[request.feedback_type],
      severity: request.severity,
      summary: request.summary.trim(),
      required_action: request.required_action ?? 'Review PaperImplementation feedback and recheck upstream topic-selection authority.',
      artifact_refs: request.artifact_refs ?? [],
      feedback_payload: {
        implementation_project_ref: this.ref(
          'implementation_project',
          project.implementation_project_id,
          project.title_card_id,
          project.bridge_payload_hash,
        ),
        intake_snapshot_ref: this.ref(
          'implementation_intake_snapshot',
          snapshot.intake_snapshot_id,
          snapshot.title_card_id,
          snapshot.intake_snapshot_hash,
        ),
        feedback_type: request.feedback_type,
        feedback_payload: request.feedback_payload ?? {},
      },
      policy_version_id: policyVersionId,
      created_by: createdBy,
    });

    const responseEvent: ImplementationFeedbackEvent = {
      ...created,
      feedback_status: downstreamResult.recheck_request ? 'recheck_requested' : 'recorded',
      downstream_topic_feedback_ref: this.ref(
        'downstream_topic_feedback',
        downstreamResult.downstream_topic_feedback.downstream_topic_feedback_id,
        project.title_card_id,
        project.bridge_payload_hash,
      ),
      downstream_recheck_request: downstreamResult.recheck_request,
      downstream_impact_summary: downstreamResult.impact_summary,
      payload: {
        ...created.payload,
        downstream_classification: downstreamResult.classification,
        downstream_dispatch_status: 'accepted',
      },
    };
    return {
      feedback_event: responseEvent,
      downstream_topic_feedback: downstreamResult.downstream_topic_feedback,
    };
  }

  private assertBootstrapRequest(request: BootstrapImplementationProjectRequest): void {
    if (!this.hasText(request.paper_project_bridge_id)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'paper_project_bridge_id is required.');
    }
    if (!this.hasText(request.bridge_payload_hash)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'bridge_payload_hash is required.');
    }
    if (request.workspace_id !== undefined && request.workspace_id !== null && !this.hasText(request.workspace_id)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'workspace_id must be non-empty when provided.');
    }
  }

  private assertUsableHandoff(
    handoff: TopicSelectionPaperProjectBridgeHandoff,
    request: BootstrapImplementationProjectRequest,
  ): TopicSelectionFunctionalRef {
    if (
      handoff.bridge_status !== 'active'
      || handoff.bridge.bridge_status !== 'active'
      || handoff.paper_project_bridge_id !== handoff.bridge.paper_project_bridge_id
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `PaperProjectBridge ${request.paper_project_bridge_id} is not an active PaperImplementation source.`,
      );
    }
    if (handoff.bridge_payload_hash !== request.bridge_payload_hash) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `PaperProjectBridge ${request.paper_project_bridge_id} bridge_payload_hash does not match the requested hash.`,
        {
          expected_bridge_payload_hash: handoff.bridge_payload_hash,
          requested_bridge_payload_hash: request.bridge_payload_hash,
        },
      );
    }
    const bridgeWorkspaceId = handoff.bridge.workspace_id ?? null;
    if (request.workspace_id && request.workspace_id !== bridgeWorkspaceId) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `PaperProjectBridge workspace mismatch: requested ${request.workspace_id}, bridge ${bridgeWorkspaceId}.`,
      );
    }
    this.assertRequiredSource(handoff);
    return this.assertBoundPaperProjectHandoff(handoff);
  }

  private assertBoundPaperProjectHandoff(
    handoff: TopicSelectionPaperProjectBridgeHandoff,
  ): TopicSelectionFunctionalRef {
    const handoffIntakeRef = handoff.paper_project_intake_ref;
    const handoffTargetRef = handoff.target_paper_project_ref;
    const bridgeIntakeRef = handoff.bridge?.paper_project_intake_ref;
    const bridgeTargetRef = handoff.bridge?.target_paper_project_ref;

    if (!handoffIntakeRef && !handoffTargetRef && !bridgeIntakeRef && !bridgeTargetRef) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `PaperProjectBridge ${handoff.paper_project_bridge_id} has not completed PaperProject intake.`,
        { reason_code: PAPER_PROJECT_BINDING_REQUIRED_REASON_CODE },
      );
    }
    if (!handoffIntakeRef || !handoffTargetRef || !bridgeIntakeRef || !bridgeTargetRef) {
      throw this.paperProjectBindingConflict(
        handoff.paper_project_bridge_id,
        'PaperProject intake refs are incomplete.',
      );
    }

    this.assertBindingRef(
      handoff.paper_project_bridge_id,
      handoffIntakeRef,
      'paper_project_intake',
      handoff.bridge.title_card_id,
      handoff.bridge_payload_hash,
    );
    this.assertBindingRef(
      handoff.paper_project_bridge_id,
      handoffTargetRef,
      'paper_project',
      handoff.bridge.title_card_id,
      handoff.bridge_payload_hash,
    );
    if (
      !this.sameFunctionalRef(handoffIntakeRef, bridgeIntakeRef)
      || !this.sameFunctionalRef(handoffTargetRef, bridgeTargetRef)
    ) {
      throw this.paperProjectBindingConflict(
        handoff.paper_project_bridge_id,
        'PaperProject handoff refs do not match the admitted bridge refs.',
      );
    }
    return handoffTargetRef;
  }

  private assertStoredBootstrapBinding(
    project: ImplementationProject,
    snapshot: ImplementationIntakeSnapshot,
  ): void {
    const sourceHandoff = snapshot.source_handoff;
    if (
      !project.target_paper_project_ref
      || !snapshot.target_paper_project_ref
      || !sourceHandoff?.paper_project_intake_ref
      || !sourceHandoff.target_paper_project_ref
      || !sourceHandoff.bridge?.paper_project_intake_ref
      || !sourceHandoff.bridge.target_paper_project_ref
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `ImplementationProject ${project.implementation_project_id} has a legacy null PaperProject binding and is not eligible for the product path.`,
        {
          reason_code: LEGACY_RECORD_NOT_ELIGIBLE_REASON_CODE,
          recovery: 'diagnostics_only',
        },
      );
    }

    this.assertBoundPaperProjectHandoff(sourceHandoff);
    if (
      project.paper_project_bridge_id !== snapshot.paper_project_bridge_id
      || project.paper_project_bridge_id !== sourceHandoff.paper_project_bridge_id
      || project.bridge_payload_hash !== snapshot.bridge_payload_hash
      || project.bridge_payload_hash !== sourceHandoff.bridge_payload_hash
      || project.title_card_id !== snapshot.title_card_id
      || project.title_card_id !== sourceHandoff.bridge.title_card_id
      || !this.sameFunctionalRef(project.target_paper_project_ref, snapshot.target_paper_project_ref)
      || !this.sameFunctionalRef(project.target_paper_project_ref, sourceHandoff.target_paper_project_ref)
    ) {
      throw this.paperProjectBindingConflict(
        project.paper_project_bridge_id,
        'Stored ImplementationProject binding does not match its immutable intake snapshot.',
      );
    }
  }

  private assertBindingRef(
    bridgeId: string,
    value: unknown,
    expectedRefType: 'paper_project_intake' | 'paper_project',
    expectedTitleCardId: string,
    expectedVersionId: string,
  ): asserts value is TopicSelectionFunctionalRef {
    if (!this.isFunctionalRef(value)) {
      throw this.paperProjectBindingConflict(bridgeId, `${expectedRefType} ref is malformed.`);
    }
    if (
      value.ref_type !== expectedRefType
      || value.title_card_id !== expectedTitleCardId
      || value.version_id !== expectedVersionId
    ) {
      throw this.paperProjectBindingConflict(
        bridgeId,
        `${expectedRefType} ref does not bind the admitted title card and bridge hash.`,
      );
    }
  }

  private paperProjectBindingConflict(bridgeId: string, message: string): AppError {
    return new AppError(
      409,
      'VERSION_CONFLICT',
      `PaperProjectBridge ${bridgeId} has an invalid PaperProject binding. ${message}`,
      { reason_code: PAPER_PROJECT_BINDING_CONFLICT_REASON_CODE },
    );
  }

  private assertRequiredSource(handoff: TopicSelectionPaperProjectBridgeHandoff): void {
    const required: Array<[string, unknown]> = [
      ['paper_project_bridge_id', handoff.paper_project_bridge_id],
      ['bridge_payload_hash', handoff.bridge_payload_hash],
      ['title_card_id', handoff.bridge.title_card_id],
      ['source_promotion_decision_id', handoff.source_promotion_decision_id],
      ['promotion_commitment_profile_id', handoff.bridge.promotion_commitment_profile_id],
      ['promotion_input_snapshot_id', handoff.promotion_input_snapshot_id],
      ['promotion_input_snapshot_hash', handoff.promotion_input_snapshot_hash],
      ['topic_package_id', handoff.topic_package_id],
      ['package_version', handoff.package_version],
      ['working_copy_payload_hash', handoff.working_copy_payload_hash],
    ];
    for (const [field, value] of required) {
      if (!this.hasText(value)) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          `PaperProjectBridge ${handoff.paper_project_bridge_id} is missing required ${field}.`,
        );
      }
    }
    if (handoff.source_refs.length === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `PaperProjectBridge ${handoff.paper_project_bridge_id} has no source_refs for PaperImplementation intake.`,
      );
    }
  }

  private assertFeedbackRequest(request: RecordImplementationFeedbackEventRequest): void {
    if (!this.hasText(request.summary)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'summary is required.');
    }
    if (!FEEDBACK_SIGNAL_BY_TYPE[request.feedback_type]) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported implementation feedback type: ${request.feedback_type}.`);
    }
  }

  private toBootstrapResponse(
    project: ImplementationProject,
    snapshot: ImplementationIntakeSnapshot,
    projectCreated: boolean,
  ): BootstrapImplementationProjectResponse {
    return {
      implementation_project: project,
      intake_snapshot: snapshot,
      project_created: projectCreated,
      handoff_to_motive: {
        implementation_project_id: project.implementation_project_id,
        intake_snapshot_id: snapshot.intake_snapshot_id,
        title_card_id: snapshot.title_card_id,
        topic_package_id: snapshot.topic_package_id,
        package_version: snapshot.package_version,
        source_refs: snapshot.source_refs,
        accepted_risk_refs: snapshot.accepted_risk_refs,
        condition_refs: snapshot.condition_refs,
        early_check_obligations: snapshot.early_check_obligations,
      },
    };
  }

  private conditionRefs(
    handoff: TopicSelectionPaperProjectBridgeHandoff,
  ): TopicSelectionFunctionalRef[] {
    return handoff.conditions.map((condition, index) => this.ref(
      'promotion_condition',
      this.conditionCode(condition, index),
      handoff.bridge.title_card_id,
      handoff.bridge_payload_hash,
    ));
  }

  private conditionCode(condition: TopicSelectionPromotionCondition, index: number): string {
    return condition.condition_code || `condition_${index + 1}`;
  }

  private intakeSnapshotHash(payload: Record<string, unknown>): string {
    return sha256Text(stableStringify(payload));
  }

  private resolveRecommendedAction(
    action: ImplementationUpstreamAction | null | undefined,
  ): ImplementationUpstreamAction {
    return action ?? 'recheck_topic_selection';
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId?: string | null,
    versionId?: string | null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: titleCardId ?? null,
      version_id: versionId ?? null,
    };
  }

  private hasText(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private isFunctionalRef(value: unknown): value is TopicSelectionFunctionalRef {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    const candidate = value as Record<string, unknown>;
    return this.hasText(candidate.ref_type)
      && this.hasText(candidate.ref_id)
      && (candidate.title_card_id === null || this.hasText(candidate.title_card_id))
      && (candidate.version_id === null || this.hasText(candidate.version_id));
  }

  private sameFunctionalRef(
    left: TopicSelectionFunctionalRef,
    right: TopicSelectionFunctionalRef,
  ): boolean {
    return left.ref_type === right.ref_type
      && left.ref_id === right.ref_id
      && (left.title_card_id ?? null) === (right.title_card_id ?? null)
      && (left.version_id ?? null) === (right.version_id ?? null);
  }
}
