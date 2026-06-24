import crypto from 'node:crypto';

import type {
  TopicSelectionActorRef,
  TopicSelectionArtifactRefRecord,
  TopicSelectionChainTransitionAttemptRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionGateIssue,
  TopicSelectionGateVerdict,
  TopicSelectionHumanConfirmedDecisionRecord,
  TopicSelectionHumanDecisionType,
  TopicSelectionInputSnapshotRecord,
  TopicSelectionLlmWorkflowRunRecord,
  TopicSelectionReadinessGateResultRecord,
  TopicSelectionTraceSnapshotRecord,
  TopicSelectionTransitionResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionAllowedPromotionRefinement,
  TopicSelectionHumanPromotionDecisionKind,
  TopicSelectionHumanPromotionDecisionRecord,
  TopicSelectionNonPromoteDecision,
  TopicSelectionPromotionBridgeHandoff,
  TopicSelectionPromotionCommitmentProfileRecord,
  TopicSelectionPromotionCondition,
  TopicSelectionPromotionDecisionBundle,
  TopicSelectionPromotionDecisionClass,
  TopicSelectionPromotionDecisionRecord,
  TopicSelectionDelegatedDecisionProvenance,
  TopicSelectionPromotionLoopbackTarget,
  TopicSelectionPromotionStopOrReopenCondition,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import type {
  TopicSelectionPromotionGateHandoff,
  TopicSelectionPromotionGateRequiredAction,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';

import { AppError } from '../errors/app-error.js';
import {
  TopicSelectionV1cHumanPromotionDecisionCurrentConflictError,
  type TopicSelectionV1cHumanPromotionDecisionControlPlanePersistence,
  type TopicSelectionV1cHumanPromotionDecisionRecordBundle,
  type TopicSelectionV1cHumanPromotionDecisionRepository,
} from '../repositories/topic-selection-v1c-human-promotion-decision.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const WORKFLOW_KEY = 'topic-selection.v1c-human-promotion-decision-profile';
const GATE_KEY = 'topic-selection.v1c-human-promotion-authorization-check';
const TRANSITION_KEY = 'v1c-promotion-gate-to-human-decision';
const WORKFLOW_PROFILE_KEY = 'topic-selection-human-promotion-decision-profile';

type IdFactory = (prefix: string) => string;

const PROMOTE_DECISIONS = new Set<TopicSelectionHumanPromotionDecisionKind>([
  'promote_to_paper_project',
  'promote_with_conditions',
]);

const LOOPBACK_TARGET_BY_DECISION: Record<TopicSelectionNonPromoteDecision, TopicSelectionPromotionLoopbackTarget> = {
  merge_packages: 'package',
  refine_package: 'package',
  reassess_value: 'value',
  revise_question: 'question',
  revise_slice: 'slice',
  recheck_evidence_or_search: 'evidence_or_search',
  park: 'park',
  drop: 'none',
};

export type RecordHumanPromotionDecisionInput = {
  promotion_gate_check_id: string;
  decision: TopicSelectionHumanPromotionDecisionKind;
  human_actor: TopicSelectionActorRef;
  rationale: string;
  confirmed_snapshot_hash: string;
  decision_timestamp?: string | null;
  workspace_id?: string | null;
  policy_version_id?: string | null;
  conditions?: TopicSelectionPromotionCondition[];
  required_actions?: TopicSelectionPromotionGateRequiredAction[];
  loopback_target?: TopicSelectionPromotionLoopbackTarget | null;
  allowed_refinements?: TopicSelectionAllowedPromotionRefinement[];
  stop_conditions?: TopicSelectionPromotionStopOrReopenCondition[];
  reopen_conditions?: TopicSelectionPromotionStopOrReopenCondition[];
};

/**
 * T-128 W-13 (provenance-integrity guard): the delegated-decision provenance marker is INTERNAL-ONLY — deliberately
 * kept OFF the public RecordHumanPromotionDecisionInput so it can be supplied only here, by the N4 delegated-promotion
 * service, from the admission-computed identity hash. The pure-human POST /topic-selection/v1c/promotion-decisions
 * route uses additionalProperties:true, so a caller could otherwise smuggle a fabricated `delegated_decision_provenance`
 * into the request body and have it persisted — falsely marking a fully-human decision as agent-delegated. Because the
 * writer reads the marker ONLY from this second argument (never from `input`), such a spoofed body field is silently
 * ignored, while the N4 path still stamps real provenance. (Inverse of impersonation: this protects audit trust.)
 */
export type RecordHumanPromotionDecisionInternalOptions = {
  delegatedDecisionProvenance?: TopicSelectionDelegatedDecisionProvenance | null;
};

export type TopicSelectionPromotionGateHandoffProvider = {
  getPromotionGateHandoff(
    promotionGateCheckId: string,
  ): Promise<TopicSelectionPromotionGateHandoff>;
  getLatestPromotionGateHandoffByPromotionInputSnapshotId(
    promotionInputSnapshotId: string,
  ): Promise<TopicSelectionPromotionGateHandoff>;
};

export type TopicSelectionV1cHumanPromotionDecisionCreationResult =
  TopicSelectionV1cHumanPromotionDecisionRecordBundle & {
    bridge_handoff?: TopicSelectionPromotionBridgeHandoff | null;
  };

export type TopicSelectionV1cHumanPromotionDecisionServiceOptions = {
  repository: TopicSelectionV1cHumanPromotionDecisionRepository;
  promotionGateService: TopicSelectionPromotionGateHandoffProvider;
  idFactory?: IdFactory;
  now?: () => string;
};

type NormalizedDecisionInput = {
  decisionClass: TopicSelectionPromotionDecisionClass;
  bridgeEligible: boolean;
  conditions: TopicSelectionPromotionCondition[];
  requiredActions: TopicSelectionPromotionGateRequiredAction[];
  loopbackTarget: TopicSelectionPromotionLoopbackTarget | null;
  loopbackRefs: TopicSelectionFunctionalRef[];
  allowedRefinements: TopicSelectionAllowedPromotionRefinement[];
  stopConditions: TopicSelectionPromotionStopOrReopenCondition[];
  reopenConditions: TopicSelectionPromotionStopOrReopenCondition[];
  decisionTimestamp: string;
};

export class TopicSelectionV1cHumanPromotionDecisionService {
  private readonly repository: TopicSelectionV1cHumanPromotionDecisionRepository;
  private readonly promotionGateService: TopicSelectionPromotionGateHandoffProvider;
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(options: TopicSelectionV1cHumanPromotionDecisionServiceOptions) {
    this.repository = options.repository;
    this.promotionGateService = options.promotionGateService;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async recordHumanPromotionDecision(
    input: RecordHumanPromotionDecisionInput,
    internalOptions: RecordHumanPromotionDecisionInternalOptions = {},
  ): Promise<TopicSelectionV1cHumanPromotionDecisionCreationResult> {
    const gateHandoff = await this.promotionGateService.getPromotionGateHandoff(
      input.promotion_gate_check_id,
    );
    this.assertWorkspace(input.workspace_id ?? null, gateHandoff);
    await this.assertLatestGate(gateHandoff);
    this.assertHumanActor(input.human_actor);
    if (!this.hasText(input.rationale)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Human promotion decision requires rationale.');
    }
    if (input.confirmed_snapshot_hash !== gateHandoff.promotion_input_snapshot_hash) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Human promotion decision confirmed snapshot hash does not match the promotion gate handoff.',
      );
    }

    const normalized = this.normalizeDecisionInput(input, gateHandoff);
    const humanPromotionDecisionKey = this.computeHumanPromotionDecisionKey({
      input,
      gateHandoff,
      normalized,
    });
    const existingByKey = await this.repository.findBundleByHumanPromotionDecisionKey(
      humanPromotionDecisionKey,
    );
    if (existingByKey) {
      return {
        ...existingByKey,
        bridge_handoff: existingByKey.promotion_decision.bridge_eligible
          ? this.toBridgeHandoff(existingByKey)
          : null,
      };
    }
    const existingCurrent = await this.repository.findCurrentBundleByPromotionInputSnapshotId(
      gateHandoff.promotion_input_snapshot_id,
    );
    if (existingCurrent) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `PromotionInputSnapshot ${gateHandoff.promotion_input_snapshot_id} already has a current PromotionDecision.`,
      );
    }

    const now = this.now();
    const humanPromotionDecisionId = this.idFactory('human_promotion_decision');
    const humanConfirmedDecisionId = this.idFactory('human_confirmed_decision');
    const promotionDecisionId = this.idFactory('promotion_decision');
    const commitmentProfileId = normalized.bridgeEligible
      ? this.idFactory('promotion_commitment_profile')
      : null;
    const inputSnapshotId = this.idFactory('input_snapshot');
    const workflowRunId = this.idFactory('workflow_run');
    const artifactRefId = this.idFactory('artifact_ref');
    const gateRef = gateHandoff.promotion_gate_check_ref;
    const humanPromotionDecisionRef = this.ref(
      'human_promotion_decision',
      humanPromotionDecisionId,
      gateHandoff.gate_check.title_card_id,
      gateHandoff.promotion_input_snapshot_hash,
    );
    const humanConfirmedDecisionRef = this.ref(
      'human_confirmed_decision',
      humanConfirmedDecisionId,
      gateHandoff.gate_check.title_card_id,
      null,
    );
    const promotionDecisionRef = this.ref(
      'promotion_decision',
      promotionDecisionId,
      gateHandoff.gate_check.title_card_id,
      gateHandoff.promotion_input_snapshot_hash,
    );
    const commitmentProfileRef = commitmentProfileId
      ? this.ref(
          'promotion_commitment_profile',
          commitmentProfileId,
          gateHandoff.gate_check.title_card_id,
          gateHandoff.promotion_input_snapshot_hash,
        )
      : null;
    const artifactRef = this.ref(
      'artifact_ref',
      artifactRefId,
      gateHandoff.gate_check.title_card_id,
      null,
    );
    const sourceRefs = this.compileSourceRefs(gateHandoff);
    const authorityRefs = [
      humanPromotionDecisionRef,
      humanConfirmedDecisionRef,
      promotionDecisionRef,
      ...(commitmentProfileRef ? [commitmentProfileRef] : []),
    ];
    const humanPromotionDecision: TopicSelectionHumanPromotionDecisionRecord = {
      human_promotion_decision_id: humanPromotionDecisionId,
      human_confirmed_decision_id: humanConfirmedDecisionId,
      human_promotion_decision_key: humanPromotionDecisionKey,
      workspace_id: gateHandoff.gate_check.workspace_id ?? null,
      title_card_id: gateHandoff.gate_check.title_card_id,
      promotion_gate_check_id: gateHandoff.promotion_gate_check_id,
      promotion_gate_check_ref: gateRef,
      promotion_input_snapshot_id: gateHandoff.promotion_input_snapshot_id,
      promotion_input_snapshot_hash: gateHandoff.promotion_input_snapshot_hash,
      decision: input.decision,
      decision_class: normalized.decisionClass,
      actor: input.human_actor,
      decision_timestamp: normalized.decisionTimestamp,
      confirmed_snapshot_hash: input.confirmed_snapshot_hash,
      rationale: input.rationale,
      conditions: normalized.conditions,
      required_actions: normalized.requiredActions,
      loopback_target: normalized.loopbackTarget,
      loopback_refs: normalized.loopbackRefs,
      accepted_risk_refs: gateHandoff.accepted_risk_refs,
      allowed_refinements: normalized.allowedRefinements,
      stop_conditions: normalized.stopConditions,
      reopen_conditions: normalized.reopenConditions,
      source_refs: sourceRefs,
      input_snapshot_id: inputSnapshotId,
      workflow_run_id: workflowRunId,
      gate_result_id: null,
      transition_attempt_id: null,
      trace_snapshot_id: null,
      artifact_refs: [artifactRef],
      policy_version_id: input.policy_version_id ?? null,
      created_at: now,
    };
    const promotionDecision: TopicSelectionPromotionDecisionRecord = {
      promotion_decision_id: promotionDecisionId,
      promotion_decision_status: 'current',
      current_promotion_input_snapshot_key: gateHandoff.promotion_input_snapshot_id,
      human_promotion_decision_id: humanPromotionDecisionId,
      human_confirmed_decision_id: humanConfirmedDecisionId,
      workspace_id: gateHandoff.gate_check.workspace_id ?? null,
      title_card_id: gateHandoff.gate_check.title_card_id,
      promotion_gate_check_id: gateHandoff.promotion_gate_check_id,
      promotion_input_snapshot_id: gateHandoff.promotion_input_snapshot_id,
      promotion_input_snapshot_hash: gateHandoff.promotion_input_snapshot_hash,
      gate_disposition: gateHandoff.disposition,
      decision: input.decision,
      decision_class: normalized.decisionClass,
      bridge_eligible: normalized.bridgeEligible,
      promotion_commitment_profile_id: commitmentProfileId,
      loopback_target: normalized.loopbackTarget,
      required_actions: normalized.requiredActions,
      accepted_risk_refs: gateHandoff.accepted_risk_refs,
      conditions: normalized.conditions,
      source_refs: sourceRefs,
      snapshot_hashes: gateHandoff.snapshot_hashes,
      artifact_refs: [artifactRef],
      delegated_decision_provenance: internalOptions.delegatedDecisionProvenance ?? null,
      created_at: now,
    };
    const promotionCommitmentProfile = commitmentProfileId
      ? this.buildCommitmentProfile({
          commitmentProfileId,
          promotionDecisionId,
          humanPromotionDecisionId,
          humanConfirmedDecisionId,
          gateHandoff,
          normalized,
          sourceRefs,
          artifactRef,
          now,
        })
      : null;
    const controlPlane = this.buildControlPlaneRecords({
      gateHandoff,
      humanPromotionDecision,
      promotionDecision,
      promotionCommitmentProfile,
      inputSnapshotId,
      workflowRunId,
      artifactRefId,
      authorityRefs,
      policyVersionId: input.policy_version_id ?? null,
      now,
    });
    humanPromotionDecision.gate_result_id = controlPlane.readiness_gate_result.readiness_gate_result_id;
    humanPromotionDecision.transition_attempt_id = controlPlane.transition_attempt.chain_transition_attempt_id;
    humanPromotionDecision.trace_snapshot_id = controlPlane.trace_snapshot.trace_snapshot_id;

    let bundle: TopicSelectionV1cHumanPromotionDecisionRecordBundle;
    try {
      bundle = await this.repository.createBundle({
        human_promotion_decision: humanPromotionDecision,
        promotion_decision: promotionDecision,
        promotion_commitment_profile: promotionCommitmentProfile,
        control_plane: controlPlane,
      });
    } catch (error) {
      if (error instanceof TopicSelectionV1cHumanPromotionDecisionCurrentConflictError) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `PromotionInputSnapshot ${error.promotionInputSnapshotId} already has a current PromotionDecision.`,
        );
      }
      throw error;
    }

    return {
      ...bundle,
      bridge_handoff: bundle.promotion_decision.bridge_eligible
        ? this.toBridgeHandoff(bundle)
        : null,
    };
  }

  async getHumanPromotionDecision(
    humanPromotionDecisionId: string,
  ): Promise<TopicSelectionHumanPromotionDecisionRecord> {
    const record = await this.repository.findHumanPromotionDecisionById(humanPromotionDecisionId);
    if (!record) {
      throw new AppError(404, 'NOT_FOUND', `HumanPromotionDecision ${humanPromotionDecisionId} not found.`);
    }
    return record;
  }

  async getPromotionDecision(
    promotionDecisionId: string,
  ): Promise<TopicSelectionPromotionDecisionRecord> {
    const record = await this.repository.findPromotionDecisionById(promotionDecisionId);
    if (!record) {
      throw new AppError(404, 'NOT_FOUND', `PromotionDecision ${promotionDecisionId} not found.`);
    }
    return record;
  }

  async getPromotionCommitmentProfile(
    promotionCommitmentProfileId: string,
  ): Promise<TopicSelectionPromotionCommitmentProfileRecord> {
    const record = await this.repository.findCommitmentProfileById(promotionCommitmentProfileId);
    if (!record) {
      throw new AppError(
        404,
        'NOT_FOUND',
        `PromotionCommitmentProfile ${promotionCommitmentProfileId} not found.`,
      );
    }
    return record;
  }

  async getPromotionDecisionBundle(
    promotionDecisionId: string,
  ): Promise<TopicSelectionPromotionDecisionBundle> {
    const bundle = await this.repository.findBundleByPromotionDecisionId(promotionDecisionId);
    if (!bundle) {
      throw new AppError(404, 'NOT_FOUND', `PromotionDecision ${promotionDecisionId} not found.`);
    }
    return bundle;
  }

  async getPromotionBridgeHandoff(
    promotionDecisionId: string,
  ): Promise<TopicSelectionPromotionBridgeHandoff> {
    const bundle = await this.repository.findBundleByPromotionDecisionId(promotionDecisionId);
    if (!bundle) {
      throw new AppError(404, 'NOT_FOUND', `PromotionDecision ${promotionDecisionId} not found.`);
    }
    return this.toBridgeHandoff(bundle);
  }

  private normalizeDecisionInput(
    input: RecordHumanPromotionDecisionInput,
    gateHandoff: TopicSelectionPromotionGateHandoff,
  ): NormalizedDecisionInput {
    const decisionTimestamp = input.decision_timestamp ?? this.now();
    const allowedRefinements = input.allowed_refinements ?? [];
    const stopConditions = input.stop_conditions ?? [];
    const reopenConditions = input.reopen_conditions ?? [];
    const isPromote = PROMOTE_DECISIONS.has(input.decision);
    if (isPromote) {
      if (gateHandoff.disposition !== 'ready_for_human_decision' || !gateHandoff.promote_allowed) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          `PromotionGateCheck ${gateHandoff.promotion_gate_check_id} does not allow promote-class decisions.`,
        );
      }
      const conditions = input.conditions ?? [];
      if (input.decision === 'promote_to_paper_project' && conditions.length > 0) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'promote_to_paper_project cannot carry conditions; use promote_with_conditions.',
        );
      }
      if (input.decision === 'promote_with_conditions' && conditions.length === 0) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'promote_with_conditions requires at least one condition.',
        );
      }
      if (input.decision === 'promote_with_conditions') {
        this.assertPromotionConditions(conditions);
      }
      return {
        decisionClass: 'promote',
        bridgeEligible: true,
        conditions,
        requiredActions: [],
        loopbackTarget: null,
        loopbackRefs: [],
        allowedRefinements,
        stopConditions,
        reopenConditions,
        decisionTimestamp,
      };
    }

    const expectedLoopbackTarget = LOOPBACK_TARGET_BY_DECISION[input.decision as TopicSelectionNonPromoteDecision];
    if (input.loopback_target && input.loopback_target !== expectedLoopbackTarget) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `${input.decision} requires loopback target ${expectedLoopbackTarget}.`,
      );
    }
    const requiredActions = this.resolveNonPromoteRequiredActions({
      gateHandoff,
      decision: input.decision as TopicSelectionNonPromoteDecision,
      loopbackTarget: expectedLoopbackTarget,
      inputActions: input.required_actions ?? [],
    });
    return {
      decisionClass: 'non_promote',
      bridgeEligible: false,
      conditions: [],
      requiredActions,
      loopbackTarget: expectedLoopbackTarget,
      loopbackRefs: this.loopbackRefsFromActions(requiredActions),
      allowedRefinements,
      stopConditions,
      reopenConditions,
      decisionTimestamp,
    };
  }

  private assertPromotionConditions(conditions: TopicSelectionPromotionCondition[]): void {
    conditions.forEach((condition, index) => {
      const label = condition.condition_code || condition.condition_id || `condition_${index + 1}`;
      if (!condition.owner || !this.hasText(condition.owner.actor_id ?? null)) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `Promotion condition ${label} requires an owner with a non-empty actor_id.`,
        );
      }
      if (!this.hasFunctionalRefs(condition.refs)) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `Promotion condition ${label} requires at least one source ref.`,
        );
      }
      if (!Array.isArray(condition.early_check_obligations)
        || condition.early_check_obligations.filter((obligation) => this.hasText(obligation)).length === 0
      ) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `Promotion condition ${label} requires at least one early-check obligation.`,
        );
      }
      const action = condition.required_action;
      if (
        !action
        || !this.hasText(action.action_code)
        || !this.hasText(action.reason)
        || !this.hasFunctionalRefs(action.refs)
      ) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `Promotion condition ${label} requires a typed required_action with refs and reason.`,
        );
      }
    });
  }

  private resolveNonPromoteRequiredActions(input: {
    gateHandoff: TopicSelectionPromotionGateHandoff;
    decision: TopicSelectionNonPromoteDecision;
    loopbackTarget: TopicSelectionPromotionLoopbackTarget;
    inputActions: TopicSelectionPromotionGateRequiredAction[];
  }): TopicSelectionPromotionGateRequiredAction[] {
    if (input.inputActions.length > 0) {
      return input.inputActions;
    }
    if (input.gateHandoff.required_actions.length > 0) {
      return input.gateHandoff.required_actions;
    }
    if (input.decision === 'park') {
      return [
        this.requiredAction(
          'record_park_decision',
          'warning',
          'park',
          [input.gateHandoff.promotion_gate_check_ref],
          'Human reviewer parked the package without upstream mutation.',
        ),
      ];
    }
    if (input.decision === 'drop') {
      return [
        this.requiredAction(
          'record_drop_rationale',
          'warning',
          'none',
          [input.gateHandoff.promotion_gate_check_ref],
          'Human reviewer dropped the package without upstream mutation.',
        ),
      ];
    }
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `${input.decision} requires typed required_actions.`,
    );
  }

  private buildCommitmentProfile(input: {
    commitmentProfileId: string;
    promotionDecisionId: string;
    humanPromotionDecisionId: string;
    humanConfirmedDecisionId: string;
    gateHandoff: TopicSelectionPromotionGateHandoff;
    normalized: NormalizedDecisionInput;
    sourceRefs: TopicSelectionFunctionalRef[];
    artifactRef: TopicSelectionFunctionalRef;
    now: string;
  }): TopicSelectionPromotionCommitmentProfileRecord {
    const excerpt = this.asRecord(input.gateHandoff.dossier.dossier_payload.source_snapshot_excerpt);
    const claimCeiling = this.readString(excerpt, 'claim_ceiling');
    if (!claimCeiling) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Promotion commitment profile requires a claim ceiling from the gate dossier.',
      );
    }
    const earlyCheckObligations = this.uniqueStrings([
      ...input.gateHandoff.argument_readiness_mini_check.early_check_obligations,
      ...input.normalized.conditions.flatMap((condition) => condition.early_check_obligations),
    ]);
    return {
      promotion_commitment_profile_id: input.commitmentProfileId,
      promotion_decision_id: input.promotionDecisionId,
      human_promotion_decision_id: input.humanPromotionDecisionId,
      human_confirmed_decision_id: input.humanConfirmedDecisionId,
      workspace_id: input.gateHandoff.gate_check.workspace_id ?? null,
      title_card_id: input.gateHandoff.gate_check.title_card_id,
      promotion_gate_check_id: input.gateHandoff.promotion_gate_check_id,
      promotion_input_snapshot_id: input.gateHandoff.promotion_input_snapshot_id,
      promotion_input_snapshot_hash: input.gateHandoff.promotion_input_snapshot_hash,
      topic_package_id: input.gateHandoff.topic_package_id,
      package_version: input.gateHandoff.package_version,
      scope: {
        topic_package_id: input.gateHandoff.topic_package_id,
        package_version: input.gateHandoff.package_version,
        contribution_summary: this.readString(excerpt, 'contribution_summary'),
        evaluation_plan: this.readString(excerpt, 'evaluation_plan'),
        selected_literature_evidence_ids: this.asStringArray(excerpt.selected_literature_evidence_ids),
        selected_evidence_refs: input.gateHandoff.dossier.dossier_payload
          ? this.asArray(excerpt.selected_evidence_refs)
          : [],
        source_snapshot_excerpt: excerpt,
      },
      claim_ceiling: claimCeiling,
      prohibited_claims: this.asStringArray(excerpt.prohibited_claims),
      accepted_risk_refs: input.gateHandoff.accepted_risk_refs,
      conditions: input.normalized.conditions,
      allowed_refinements: input.normalized.allowedRefinements,
      early_check_obligations: earlyCheckObligations,
      stop_conditions: input.normalized.stopConditions,
      reopen_conditions: input.normalized.reopenConditions,
      source_refs: input.sourceRefs,
      snapshot_hashes: input.gateHandoff.snapshot_hashes,
      artifact_refs: [input.artifactRef],
      created_at: input.now,
    };
  }

  private buildControlPlaneRecords(input: {
    gateHandoff: TopicSelectionPromotionGateHandoff;
    humanPromotionDecision: TopicSelectionHumanPromotionDecisionRecord;
    promotionDecision: TopicSelectionPromotionDecisionRecord;
    promotionCommitmentProfile: TopicSelectionPromotionCommitmentProfileRecord | null;
    inputSnapshotId: string;
    workflowRunId: string;
    artifactRefId: string;
    authorityRefs: TopicSelectionFunctionalRef[];
    policyVersionId: string | null;
    now: string;
  }): TopicSelectionV1cHumanPromotionDecisionControlPlanePersistence {
    const targetRef = this.ref(
      'promotion_decision',
      input.promotionDecision.promotion_decision_id,
      input.promotionDecision.title_card_id,
      input.promotionDecision.promotion_input_snapshot_hash,
    );
    const inputSnapshotPayload = {
      promotion_gate_handoff: input.gateHandoff,
      human_promotion_decision_request: {
        decision: input.humanPromotionDecision.decision,
        actor: input.humanPromotionDecision.actor,
        confirmed_snapshot_hash: input.humanPromotionDecision.confirmed_snapshot_hash,
        conditions: input.humanPromotionDecision.conditions,
        required_actions: input.humanPromotionDecision.required_actions,
        loopback_target: input.humanPromotionDecision.loopback_target,
      },
      policy_version_id: input.policyVersionId,
    };
    const inputSnapshot: TopicSelectionInputSnapshotRecord = {
      input_snapshot_id: input.inputSnapshotId,
      workspace_id: input.promotionDecision.workspace_id ?? null,
      title_card_id: input.promotionDecision.title_card_id,
      target_ref: input.gateHandoff.promotion_gate_check_ref,
      context_policy_version_id: input.policyVersionId,
      policy_version: input.policyVersionId,
      snapshot_hash: sha256Text(stableStringify(inputSnapshotPayload)),
      source_refs: input.humanPromotionDecision.source_refs,
      permission_refs: [],
      payload: inputSnapshotPayload,
      created_by: 'human',
      created_at: input.now,
    };
    const workflowRun: TopicSelectionLlmWorkflowRunRecord = {
      workflow_run_id: input.workflowRunId,
      workspace_id: input.promotionDecision.workspace_id ?? null,
      title_card_id: input.promotionDecision.title_card_id,
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
        explicit_human_authorization_required: true,
        gate_disposition: input.gateHandoff.disposition,
      },
      output_summary: {
        decision: input.promotionDecision.decision,
        decision_class: input.promotionDecision.decision_class,
        bridge_eligible: input.promotionDecision.bridge_eligible,
        required_action_codes: input.promotionDecision.required_actions.map((action) => action.action_code),
      },
      error_code: null,
      error_message: null,
      created_by: 'human',
    };
    const gateResultId = this.idFactory('readiness_gate_result');
    const transitionAttemptId = this.idFactory('chain_transition_attempt');
    const traceSnapshotId = this.idFactory('trace_snapshot');
    input.humanPromotionDecision.gate_result_id = gateResultId;
    input.humanPromotionDecision.transition_attempt_id = transitionAttemptId;
    input.humanPromotionDecision.trace_snapshot_id = traceSnapshotId;
    const artifactPayload = {
      human_promotion_decision: input.humanPromotionDecision,
      promotion_decision: input.promotionDecision,
      promotion_commitment_profile: input.promotionCommitmentProfile,
      created_bridge: false,
    };
    const artifactRefRecord: TopicSelectionArtifactRefRecord = {
      artifact_ref_id: input.artifactRefId,
      workspace_id: input.promotionDecision.workspace_id ?? null,
      title_card_id: input.promotionDecision.title_card_id,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      uri: null,
      payload: artifactPayload,
      checksum: sha256Text(stableStringify(artifactPayload)),
      byte_size: null,
      mime_type: 'application/json',
      workflow_run_id: input.workflowRunId,
      input_snapshot_id: input.inputSnapshotId,
      created_by: 'human',
      created_at: input.now,
    };
    const loopbackTargetRef = input.promotionDecision.loopback_target
      && input.promotionDecision.loopback_target !== 'none'
      ? this.ref(
          'promotion_loopback_target',
          input.promotionDecision.loopback_target,
          input.promotionDecision.title_card_id,
          null,
        )
      : null;
    const readinessGateResult: TopicSelectionReadinessGateResultRecord = {
      readiness_gate_result_id: gateResultId,
      workspace_id: input.promotionDecision.workspace_id ?? null,
      title_card_id: input.promotionDecision.title_card_id,
      gate_key: GATE_KEY,
      target_ref: targetRef,
      input_snapshot_id: input.inputSnapshotId,
      workflow_run_id: input.workflowRunId,
      policy_version_id: input.policyVersionId,
      verdict: this.toGateVerdict(input.promotionDecision),
      blockers: this.toGateBlockers(input.promotionDecision),
      warnings: this.toGateWarnings(input.promotionDecision),
      required_actions: input.promotionDecision.required_actions.map((action) => action.action_code),
      loopback_target: loopbackTargetRef,
      accepted_risk_refs: input.promotionDecision.accepted_risk_refs,
      quality_signal_refs: [],
      created_by: 'human',
      created_at: input.now,
    };
    const transitionAttempt: TopicSelectionChainTransitionAttemptRecord = {
      chain_transition_attempt_id: transitionAttemptId,
      workspace_id: input.promotionDecision.workspace_id ?? null,
      title_card_id: input.promotionDecision.title_card_id,
      transition_key: TRANSITION_KEY,
      source_ref: input.gateHandoff.promotion_gate_check_ref,
      target_ref: targetRef,
      gate_result_id: gateResultId,
      workflow_run_id: input.workflowRunId,
      input_snapshot_id: input.inputSnapshotId,
      policy_version_id: input.policyVersionId,
      actor: input.humanPromotionDecision.actor,
      result: this.toTransitionResult(input.promotionDecision),
      reason: input.humanPromotionDecision.rationale,
      required_actions: input.promotionDecision.required_actions.map((action) => action.action_code),
      blockers: this.toGateBlockers(input.promotionDecision),
      accepted_risk_refs: input.promotionDecision.accepted_risk_refs,
      state_write_intents: [],
      created_authority_refs: input.authorityRefs,
      created_at: input.now,
    };
    const artifactFunctionalRef = this.ref(
      'artifact_ref',
      input.artifactRefId,
      input.promotionDecision.title_card_id,
      null,
    );
    const traceSnapshotPayload = {
      decision: input.promotionDecision.decision,
      decision_class: input.promotionDecision.decision_class,
      bridge_eligible: input.promotionDecision.bridge_eligible,
      source_snapshot_hashes: input.promotionDecision.snapshot_hashes,
      created_bridge: false,
    };
    const traceSnapshot: TopicSelectionTraceSnapshotRecord = {
      trace_snapshot_id: traceSnapshotId,
      workspace_id: input.promotionDecision.workspace_id ?? null,
      title_card_id: input.promotionDecision.title_card_id,
      target_ref: targetRef,
      snapshot_hash: sha256Text(stableStringify(traceSnapshotPayload)),
      object_refs: [
        input.gateHandoff.promotion_gate_check_ref,
        input.gateHandoff.promotion_decision_support_ref,
        input.gateHandoff.promotion_dossier_ref,
        input.gateHandoff.argument_readiness_mini_check_ref,
        input.gateHandoff.promotion_input_snapshot_ref,
        ...input.authorityRefs,
      ],
      lineage_link_refs: [],
      artifact_refs: [artifactFunctionalRef],
      quality_signal_refs: [],
      transition_attempt_refs: [
        this.ref('chain_transition_attempt', transitionAttemptId, input.promotionDecision.title_card_id, null),
      ],
      payload: traceSnapshotPayload,
      created_by: 'human',
      created_at: input.now,
    };
    const humanConfirmedDecision: TopicSelectionHumanConfirmedDecisionRecord = {
      human_confirmed_decision_id: input.humanPromotionDecision.human_confirmed_decision_id,
      workspace_id: input.promotionDecision.workspace_id ?? null,
      title_card_id: input.promotionDecision.title_card_id,
      target_ref: input.gateHandoff.promotion_gate_check_ref,
      decision_type: this.toHumanDecisionType(input.promotionDecision.decision),
      actor: input.humanPromotionDecision.actor,
      rationale: input.humanPromotionDecision.rationale,
      artifact_refs: [artifactFunctionalRef],
      policy_version_id: input.policyVersionId,
      resulting_authority_refs: input.authorityRefs,
      created_at: input.humanPromotionDecision.decision_timestamp,
    };
    return {
      input_snapshot: inputSnapshot,
      workflow_run: workflowRun,
      artifact_refs: [artifactRefRecord],
      readiness_gate_result: readinessGateResult,
      transition_attempt: transitionAttempt,
      trace_snapshot: traceSnapshot,
      human_confirmed_decision: humanConfirmedDecision,
    };
  }

  private toBridgeHandoff(
    bundle: TopicSelectionV1cHumanPromotionDecisionRecordBundle,
  ): TopicSelectionPromotionBridgeHandoff {
    const decision = bundle.promotion_decision;
    const commitment = bundle.promotion_commitment_profile;
    if (
      decision.promotion_decision_status !== 'current'
      || !decision.bridge_eligible
      || decision.decision_class !== 'promote'
      || (decision.decision !== 'promote_to_paper_project' && decision.decision !== 'promote_with_conditions')
      || !commitment
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `PromotionDecision ${decision.promotion_decision_id} cannot create a PaperProjectBridge handoff.`,
      );
    }
    return {
      promotion_decision_id: decision.promotion_decision_id,
      promotion_decision_ref: this.ref(
        'promotion_decision',
        decision.promotion_decision_id,
        decision.title_card_id,
        decision.promotion_input_snapshot_hash,
      ),
      human_promotion_decision_ref: this.ref(
        'human_promotion_decision',
        decision.human_promotion_decision_id,
        decision.title_card_id,
        decision.promotion_input_snapshot_hash,
      ),
      human_confirmed_decision_ref: this.ref(
        'human_confirmed_decision',
        decision.human_confirmed_decision_id,
        decision.title_card_id,
        null,
      ),
      promotion_commitment_profile_ref: this.ref(
        'promotion_commitment_profile',
        commitment.promotion_commitment_profile_id,
        decision.title_card_id,
        decision.promotion_input_snapshot_hash,
      ),
      promotion_gate_check_ref: bundle.human_promotion_decision.promotion_gate_check_ref,
      promotion_input_snapshot_id: decision.promotion_input_snapshot_id,
      promotion_input_snapshot_ref: this.ref(
        'promotion_input_snapshot',
        decision.promotion_input_snapshot_id,
        decision.title_card_id,
        decision.promotion_input_snapshot_hash,
      ),
      promotion_input_snapshot_hash: decision.promotion_input_snapshot_hash,
      topic_package_id: commitment.topic_package_id,
      package_version: commitment.package_version,
      decision: decision.decision,
      promotion_decision_status: 'current',
      conditions: commitment.conditions,
      accepted_risk_refs: commitment.accepted_risk_refs,
      allowed_refinements: commitment.allowed_refinements,
      early_check_obligations: commitment.early_check_obligations,
      stop_conditions: commitment.stop_conditions,
      reopen_conditions: commitment.reopen_conditions,
      source_refs: commitment.source_refs,
      snapshot_hashes: commitment.snapshot_hashes,
      artifact_refs: commitment.artifact_refs,
      human_promotion_decision: bundle.human_promotion_decision,
      promotion_decision: decision,
      promotion_commitment_profile: commitment,
    };
  }

  private async assertLatestGate(gateHandoff: TopicSelectionPromotionGateHandoff): Promise<void> {
    const latest = await this.promotionGateService.getLatestPromotionGateHandoffByPromotionInputSnapshotId(
      gateHandoff.promotion_input_snapshot_id,
    );
    if (latest.promotion_gate_check_id !== gateHandoff.promotion_gate_check_id) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `PromotionGateCheck ${gateHandoff.promotion_gate_check_id} is stale for PromotionInputSnapshot ${gateHandoff.promotion_input_snapshot_id}.`,
      );
    }
  }

  private assertWorkspace(
    requestedWorkspaceId: string | null,
    gateHandoff: TopicSelectionPromotionGateHandoff,
  ): void {
    const sourceWorkspaceId = gateHandoff.gate_check.workspace_id ?? null;
    if (requestedWorkspaceId && sourceWorkspaceId && requestedWorkspaceId !== sourceWorkspaceId) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `PromotionGateCheck workspace mismatch: requested ${requestedWorkspaceId}, source ${sourceWorkspaceId}.`,
      );
    }
  }

  private assertHumanActor(actor: TopicSelectionActorRef): void {
    if (actor.actor_type !== 'human' || !this.hasText(actor.actor_id ?? null)) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'HumanPromotionDecision requires actor_type=human and a non-empty actor_id.',
      );
    }
  }

  private computeHumanPromotionDecisionKey(input: {
    input: RecordHumanPromotionDecisionInput;
    gateHandoff: TopicSelectionPromotionGateHandoff;
    normalized: NormalizedDecisionInput;
  }): string {
    return sha256Text(stableStringify({
      promotion_gate_check_id: input.gateHandoff.promotion_gate_check_id,
      promotion_input_snapshot_id: input.gateHandoff.promotion_input_snapshot_id,
      promotion_input_snapshot_hash: input.gateHandoff.promotion_input_snapshot_hash,
      decision: input.input.decision,
      actor: input.input.human_actor,
      confirmed_snapshot_hash: input.input.confirmed_snapshot_hash,
      rationale: input.input.rationale,
      conditions: input.normalized.conditions,
      required_actions: input.normalized.requiredActions,
      loopback_target: input.normalized.loopbackTarget,
      allowed_refinements: input.normalized.allowedRefinements,
      stop_conditions: input.normalized.stopConditions,
      reopen_conditions: input.normalized.reopenConditions,
      policy_version_id: input.input.policy_version_id ?? null,
    }));
  }

  private compileSourceRefs(
    gateHandoff: TopicSelectionPromotionGateHandoff,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      gateHandoff.promotion_gate_check_ref,
      gateHandoff.promotion_decision_support_ref,
      gateHandoff.promotion_dossier_ref,
      gateHandoff.argument_readiness_mini_check_ref,
      gateHandoff.promotion_input_snapshot_ref,
      ...gateHandoff.gate_check.source_refs,
      ...gateHandoff.support.source_refs,
    ]);
  }

  private loopbackRefsFromActions(
    actions: TopicSelectionPromotionGateRequiredAction[],
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs(actions.flatMap((action) => action.refs));
  }

  private requiredAction(
    actionCode: string,
    severity: TopicSelectionPromotionGateRequiredAction['severity'],
    loopbackTarget: TopicSelectionPromotionLoopbackTarget,
    refs: TopicSelectionFunctionalRef[],
    reason: string,
  ): TopicSelectionPromotionGateRequiredAction {
    return {
      action_code: actionCode,
      severity,
      loopback_target: loopbackTarget,
      refs,
      reason,
    };
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

  private toHumanDecisionType(
    decision: TopicSelectionHumanPromotionDecisionKind,
  ): TopicSelectionHumanDecisionType {
    if (PROMOTE_DECISIONS.has(decision)) {
      return 'confirm';
    }
    if (decision === 'park' || decision === 'drop') {
      return 'reject';
    }
    return 'request_revision';
  }

  private toGateVerdict(
    decision: TopicSelectionPromotionDecisionRecord,
  ): TopicSelectionGateVerdict {
    if (!decision.bridge_eligible) {
      return 'block';
    }
    return decision.accepted_risk_refs.length > 0 || decision.conditions.length > 0
      ? 'pass_with_risk'
      : 'pass';
  }

  private toTransitionResult(
    decision: TopicSelectionPromotionDecisionRecord,
  ): TopicSelectionTransitionResult {
    if (!decision.bridge_eligible) {
      return 'blocked';
    }
    return decision.accepted_risk_refs.length > 0 || decision.conditions.length > 0
      ? 'passed_with_risk'
      : 'passed';
  }

  private toGateBlockers(
    decision: TopicSelectionPromotionDecisionRecord,
  ): TopicSelectionGateIssue[] {
    if (decision.bridge_eligible) {
      return [];
    }
    return decision.required_actions.map((action) => ({
      code: action.action_code,
      message: action.reason,
      severity: action.severity === 'info' ? 'warning' : action.severity,
      refs: action.refs,
    }));
  }

  private toGateWarnings(
    decision: TopicSelectionPromotionDecisionRecord,
  ): TopicSelectionGateIssue[] {
    const warnings: TopicSelectionGateIssue[] = [];
    if (decision.accepted_risk_refs.length > 0) {
      warnings.push({
        code: 'accepted_risks_frozen_in_promotion_decision',
        message: 'Accepted risks were frozen into the promotion decision profile.',
        severity: 'warning',
        refs: decision.accepted_risk_refs,
      });
    }
    if (decision.conditions.length > 0) {
      warnings.push({
        code: 'promotion_conditions_frozen',
        message: 'Promotion conditions were frozen into the commitment profile.',
        severity: 'warning',
        refs: decision.conditions.flatMap((condition) => condition.refs),
      });
    }
    return warnings;
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const result: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
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

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private asStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private readString(record: Record<string, unknown>, key: string): string | null {
    const value = record[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private hasText(value: string | null | undefined): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private hasFunctionalRefs(refs: TopicSelectionFunctionalRef[] | null | undefined): boolean {
    return Array.isArray(refs)
      && refs.length > 0
      && refs.every((ref) => this.hasText(ref.ref_type) && this.hasText(ref.ref_id));
  }

  /**
   * T-087 Phase 4 read-only projection — list PromotionDecisions under a
   * title-card. Pure repository delegation.
   */
  async listPromotionDecisionsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionPromotionDecisionRecord[]> {
    return this.repository.listPromotionDecisionsByTitleCardId(titleCardId);
  }
}
