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
  TopicSelectionPackageTraceBoundaryCheckRecord,
  TopicSelectionTopicPackageReadinessAssessmentRecord,
  TopicSelectionTopicPackageRecord,
  TopicSelectionV1bToV1cInputBundleRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-package-contracts';
import type {
  TopicSelectionPromotionInputSnapshotCheckDetail,
  TopicSelectionPromotionInputSnapshotClosureStatus,
  TopicSelectionPromotionInputSnapshotHandoff,
  TopicSelectionPromotionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-input-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  TopicSelectionV1bTopicPackageRepository,
} from '../repositories/topic-selection-v1b-topic-package.repository.js';
import type {
  TopicSelectionV1cPromotionInputControlPlanePersistence,
  TopicSelectionV1cPromotionInputRepository,
} from '../repositories/topic-selection-v1c-promotion-input.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { hashV1bToV1cBundle } from './topic-selection-v1b-harness-authority-hash.js';

type IdFactory = (prefix: string) => string;

export type CreatePromotionInputSnapshotInput = {
  v1b_to_v1c_input_bundle_id: string;
  workspace_id?: string | null;
  created_by?: TopicSelectionActorType;
  policy_version_id?: string | null;
};

export type TopicSelectionV1cPromotionInputServiceOptions = {
  repository: TopicSelectionV1cPromotionInputRepository;
  topicPackageRepository: TopicSelectionV1bTopicPackageRepository;
  idFactory?: IdFactory;
  now?: () => string;
};

type SnapshotEvaluation = {
  closureStatus: TopicSelectionPromotionInputSnapshotClosureStatus;
  stopConditionCode: string | null;
  blockers: TopicSelectionGateIssue[];
  warnings: TopicSelectionGateIssue[];
  requiredActions: string[];
  checkDetails: TopicSelectionPromotionInputSnapshotCheckDetail[];
  replacementBundleRef: TopicSelectionFunctionalRef | null;
};

type LoadedPromotionInputContext = {
  bundle: TopicSelectionV1bToV1cInputBundleRecord;
  currentPackage: TopicSelectionTopicPackageRecord | null;
  latestBundle: TopicSelectionV1bToV1cInputBundleRecord | null;
  traceBoundaryCheck: TopicSelectionPackageTraceBoundaryCheckRecord | null;
  readinessAssessment: TopicSelectionTopicPackageReadinessAssessmentRecord | null;
};

export class TopicSelectionV1cPromotionInputService {
  private readonly repository: TopicSelectionV1cPromotionInputRepository;
  private readonly topicPackageRepository: TopicSelectionV1bTopicPackageRepository;
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(options: TopicSelectionV1cPromotionInputServiceOptions) {
    this.repository = options.repository;
    this.topicPackageRepository = options.topicPackageRepository;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async createPromotionInputSnapshot(
    input: CreatePromotionInputSnapshotInput,
  ): Promise<TopicSelectionPromotionInputSnapshotRecord> {
    const bundle = await this.topicPackageRepository.findV1cInputBundleById(
      input.v1b_to_v1c_input_bundle_id,
    );
    if (!bundle) {
      throw new AppError(404, 'NOT_FOUND', `TopicSelectionV1bToV1cInputBundle ${input.v1b_to_v1c_input_bundle_id} not found.`);
    }
    const existing = await this.repository.findSnapshotByBundleId(bundle.v1b_to_v1c_input_bundle_id);
    if (existing) {
      if (existing.bundle_hash === bundle.bundle_hash) {
        return existing;
      }
      throw new AppError(409, 'VERSION_CONFLICT', 'PromotionInputSnapshot already exists for this bundle id with a different bundle hash.');
    }

    const context = await this.loadContext(bundle);
    const workspaceId = this.resolveWorkspaceId({
      requestedWorkspaceId: input.workspace_id ?? null,
      bundle,
      currentPackage: context.currentPackage,
    });
    const createdBy = input.created_by ?? 'system';
    const now = this.now();
    const promotionInputSnapshotId = this.idFactory('promotion_input_snapshot');
    const promotionInputSnapshotRef = this.ref(
      'promotion_input_snapshot',
      promotionInputSnapshotId,
      bundle.title_card_id,
      bundle.package_version,
    );
    const sourceBundleRef = this.ref(
      'v1b_to_v1c_input_bundle',
      bundle.v1b_to_v1c_input_bundle_id,
      bundle.title_card_id,
      bundle.package_version,
    );
    const evaluation = this.evaluateContext(context);
    const packageSnapshotHash = sha256Text(stableStringify(bundle.package_snapshot));
    const packageDraftInputSnapshotHash = sha256Text(stableStringify(bundle.package_draft_input_snapshot));
    const promotionInputSnapshotHash = sha256Text(stableStringify({
      bundle_hash: bundle.bundle_hash,
      closure_status: evaluation.closureStatus,
      package_draft_input_snapshot_hash: packageDraftInputSnapshotHash,
      package_snapshot_hash: packageSnapshotHash,
      readiness_check_refs: bundle.readiness_check_refs,
      source_bundle_ref: sourceBundleRef,
      topic_package_ref: bundle.topic_package_ref,
    }));

    const snapshot: TopicSelectionPromotionInputSnapshotRecord = {
      promotion_input_snapshot_id: promotionInputSnapshotId,
      workspace_id: workspaceId,
      title_card_id: bundle.title_card_id,
      v1b_to_v1c_input_bundle_id: bundle.v1b_to_v1c_input_bundle_id,
      topic_package_id: bundle.topic_package_id,
      package_version: bundle.package_version,
      closure_status: evaluation.closureStatus,
      stop_condition_code: evaluation.stopConditionCode,
      required_actions: evaluation.requiredActions,
      blockers: evaluation.blockers,
      warnings: evaluation.warnings,
      check_details: evaluation.checkDetails,
      bundle_hash: bundle.bundle_hash,
      package_snapshot_hash: packageSnapshotHash,
      package_draft_input_snapshot_hash: packageDraftInputSnapshotHash,
      promotion_input_snapshot_hash: promotionInputSnapshotHash,
      source_bundle_ref: sourceBundleRef,
      promotion_input_snapshot_ref: promotionInputSnapshotRef,
      topic_package_ref: bundle.topic_package_ref,
      package_trace_boundary_check_ref: bundle.package_trace_boundary_check_ref,
      package_readiness_assessment_ref: bundle.package_readiness_assessment_ref,
      topic_value_assessment_ref: bundle.topic_value_assessment_ref,
      value_reasoning_memo_ref: bundle.value_reasoning_memo_ref,
      value_disposition_decision_ref: bundle.value_disposition_decision_ref,
      topic_question_ref: bundle.topic_question_ref,
      topic_question_contract_ref: bundle.topic_question_contract_ref,
      answerability_plan_ref: bundle.answerability_plan_ref,
      research_slice_ref: bundle.research_slice_ref,
      validated_need_refs: bundle.validated_need_refs,
      evidence_refs: bundle.evidence_refs,
      accepted_risk_refs: bundle.accepted_risk_refs,
      blocker_refs: bundle.blocker_refs,
      memory_suggestion_refs: bundle.memory_suggestion_refs,
      recheck_request_refs: bundle.recheck_request_refs,
      readiness_check_refs: bundle.readiness_check_refs,
      replacement_bundle_ref: evaluation.replacementBundleRef,
      source_bundle_snapshot: bundle,
      package_snapshot: bundle.package_snapshot,
      package_draft_input_snapshot: bundle.package_draft_input_snapshot,
      input_snapshot_id: null,
      workflow_run_id: null,
      gate_result_id: null,
      transition_attempt_id: null,
      trace_snapshot_id: null,
      artifact_refs: [],
      created_by: createdBy,
      created_at: now,
    };
    const sourceRefs = this.compileSourceRefs(snapshot);
    const controlPlane = this.buildControlPlaneRecords({
      snapshot,
      sourceRefs,
      policyVersionId: input.policy_version_id ?? null,
      createdBy,
      now,
    });
    snapshot.input_snapshot_id = controlPlane.input_snapshot.input_snapshot_id;
    snapshot.workflow_run_id = controlPlane.workflow_run.workflow_run_id;
    snapshot.gate_result_id = controlPlane.readiness_gate_result.readiness_gate_result_id;
    snapshot.transition_attempt_id = controlPlane.transition_attempt.chain_transition_attempt_id;
    snapshot.trace_snapshot_id = controlPlane.trace_snapshot.trace_snapshot_id;
    snapshot.artifact_refs = this.artifactRefs(controlPlane.artifact_refs, snapshot.title_card_id);

    return this.repository.createSnapshot({
      promotion_input_snapshot: snapshot,
      control_plane: controlPlane,
    });
  }

  async getPromotionInputSnapshot(
    promotionInputSnapshotId: string,
  ): Promise<TopicSelectionPromotionInputSnapshotRecord> {
    const snapshot = await this.repository.findSnapshotById(promotionInputSnapshotId);
    if (!snapshot) {
      throw new AppError(404, 'NOT_FOUND', `PromotionInputSnapshot ${promotionInputSnapshotId} not found.`);
    }
    return snapshot;
  }

  async getPromotionInputHandoff(
    promotionInputSnapshotId: string,
  ): Promise<TopicSelectionPromotionInputSnapshotHandoff> {
    const snapshot = await this.repository.findReadySnapshotById(promotionInputSnapshotId);
    if (!snapshot) {
      const existing = await this.repository.findSnapshotById(promotionInputSnapshotId);
      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', `PromotionInputSnapshot ${promotionInputSnapshotId} not found.`);
      }
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `PromotionInputSnapshot ${promotionInputSnapshotId} is not ready for gate handoff: ${existing.closure_status}.`,
      );
    }
    return this.toHandoff(snapshot);
  }

  private async loadContext(
    bundle: TopicSelectionV1bToV1cInputBundleRecord,
  ): Promise<LoadedPromotionInputContext> {
    const currentPackage = await this.topicPackageRepository.findPackageById(bundle.topic_package_id);
    const latestBundle = await this.topicPackageRepository.findV1cInputBundleByPackageId(bundle.topic_package_id);
    const traceBoundaryCheck = this.hasRef(bundle.package_trace_boundary_check_ref)
      ? await this.topicPackageRepository.findTraceBoundaryCheckById(bundle.package_trace_boundary_check_ref.ref_id)
      : null;
    const readinessAssessment = this.hasRef(bundle.package_readiness_assessment_ref)
      ? await this.topicPackageRepository.findReadinessAssessmentById(bundle.package_readiness_assessment_ref.ref_id)
      : null;
    return {
      bundle,
      currentPackage,
      latestBundle,
      traceBoundaryCheck,
      readinessAssessment,
    };
  }

  private evaluateContext(context: LoadedPromotionInputContext): SnapshotEvaluation {
    const issues: TopicSelectionGateIssue[] = [];
    const warnings: TopicSelectionGateIssue[] = [];
    const checkDetails: TopicSelectionPromotionInputSnapshotCheckDetail[] = [];
    const bundle = context.bundle;
    const requiredRefChecks: Array<[string, TopicSelectionFunctionalRef]> = [
      ['topic_package_ref', bundle.topic_package_ref],
      ['package_trace_boundary_check_ref', bundle.package_trace_boundary_check_ref],
      ['package_readiness_assessment_ref', bundle.package_readiness_assessment_ref],
      ['topic_value_assessment_ref', bundle.topic_value_assessment_ref],
      ['value_reasoning_memo_ref', bundle.value_reasoning_memo_ref],
      ['value_disposition_decision_ref', bundle.value_disposition_decision_ref],
      ['topic_question_ref', bundle.topic_question_ref],
      ['topic_question_contract_ref', bundle.topic_question_contract_ref],
      ['answerability_plan_ref', bundle.answerability_plan_ref],
      ['research_slice_ref', bundle.research_slice_ref],
    ];

    for (const [key, ref] of requiredRefChecks) {
      if (!this.hasRef(ref)) {
        issues.push(this.issue(`missing_${key}`, `Promotion input bundle is missing ${key}.`, 'blocking'));
      }
    }
    if (bundle.validated_need_refs.length === 0) {
      issues.push(this.issue('missing_validated_need_refs', 'Promotion input bundle has no validated need refs.', 'blocking'));
    }
    if (bundle.evidence_refs.length === 0) {
      issues.push(this.issue('missing_evidence_refs', 'Promotion input bundle has no evidence refs.', 'blocking'));
    }
    const malformedEvidenceRefs = bundle.evidence_refs
      .map((record, index) => ({ index, record }))
      .filter(({ record }) => !this.hasRef(record?.evidence_ref));
    if (malformedEvidenceRefs.length > 0) {
      issues.push(this.issue(
        'malformed_evidence_refs',
        'Promotion input bundle contains evidence refs without evidence_ref lineage.',
        'blocking',
        [bundle.topic_question_ref],
      ));
    }
    if (bundle.readiness_check_refs.length === 0) {
      issues.push(this.issue('missing_readiness_check_refs', 'Promotion input bundle has no readiness check refs.', 'blocking'));
    }
    if (issues.length > 0) {
      checkDetails.push(this.checkDetail(
        'required_refs_present',
        'blocking',
        'Required v1c promotion input refs are missing.',
        issues.flatMap((issue) => issue.refs ?? []),
        issues.map((issue) => issue.code),
      ));
      return this.evaluation('blocked', 'missing_required_refs', issues, warnings, checkDetails, null);
    }

    checkDetails.push(this.checkDetail(
      'required_refs_present',
      'passed',
      'Required v1c promotion input refs are present.',
      this.requiredRefs(bundle),
      [],
    ));

    const replacementBundleRef = context.latestBundle
      && context.latestBundle.v1b_to_v1c_input_bundle_id !== bundle.v1b_to_v1c_input_bundle_id
      ? this.ref(
        'v1b_to_v1c_input_bundle',
        context.latestBundle.v1b_to_v1c_input_bundle_id,
        context.latestBundle.title_card_id,
        context.latestBundle.package_version,
      )
      : null;
    if (bundle.bundle_status === 'superseded' || replacementBundleRef) {
      const blocker = this.issue(
        'v1b_to_v1c_bundle_superseded',
        'Promotion input bundle is superseded by a newer v1b-to-v1c input bundle.',
        'blocking',
        replacementBundleRef ? [replacementBundleRef] : [],
      );
      checkDetails.push(this.checkDetail(
        'bundle_currentness',
        'blocking',
        'Bundle is superseded and cannot enter promotion gate support.',
        replacementBundleRef ? [replacementBundleRef] : [],
        [blocker.code],
      ));
      return this.evaluation('superseded', blocker.code, [blocker], warnings, checkDetails, replacementBundleRef);
    }
    checkDetails.push(this.checkDetail(
      'bundle_currentness',
      'passed',
      'Bundle is current for its package.',
      [this.ref('v1b_to_v1c_input_bundle', bundle.v1b_to_v1c_input_bundle_id, bundle.title_card_id, bundle.package_version)],
      [],
    ));

    const refreshIssues: TopicSelectionGateIssue[] = [];
    const expectedBundleHash = this.expectedV1cBundleHash(bundle);
    if (bundle.bundle_hash !== expectedBundleHash) {
      refreshIssues.push(this.issue(
        'v1b_to_v1c_bundle_hash_drift',
        'Source bundle hash no longer matches its canonical v1b-to-v1c handoff payload.',
        'blocking',
        [this.ref('v1b_to_v1c_input_bundle', bundle.v1b_to_v1c_input_bundle_id, bundle.title_card_id, bundle.package_version)],
      ));
    }
    if (!context.currentPackage) {
      refreshIssues.push(this.issue('topic_package_missing', 'Current TopicPackage could not be loaded.', 'blocking', [bundle.topic_package_ref]));
    } else {
      if (context.currentPackage.package_readiness_status !== 'ready_for_promotion_review') {
        refreshIssues.push(this.issue(
          'topic_package_not_ready_for_promotion_review',
          'Current TopicPackage readiness no longer matches ready_for_promotion_review.',
          'blocking',
          [context.currentPackage.topic_package_ref],
        ));
      }
      if (context.currentPackage.package_version !== bundle.package_version) {
        refreshIssues.push(this.issue(
          'topic_package_version_drift',
          'Current TopicPackage version drifts from the source bundle.',
          'blocking',
          [context.currentPackage.topic_package_ref],
        ));
      }
      if (!this.sameRef(context.currentPackage.topic_package_ref, bundle.topic_package_ref)) {
        refreshIssues.push(this.issue(
          'topic_package_ref_drift',
          'Current TopicPackage ref drifts from the source bundle package ref.',
          'blocking',
          [context.currentPackage.topic_package_ref, bundle.topic_package_ref],
        ));
      }
      if (context.currentPackage.trace_boundary_check_id !== bundle.package_trace_boundary_check_ref.ref_id) {
        refreshIssues.push(this.issue(
          'topic_package_trace_check_ref_drift',
          'Current TopicPackage trace/boundary check id drifts from the source bundle.',
          'blocking',
          [context.currentPackage.topic_package_ref, bundle.package_trace_boundary_check_ref],
        ));
      }
      if (context.currentPackage.readiness_assessment_id !== bundle.package_readiness_assessment_ref.ref_id) {
        refreshIssues.push(this.issue(
          'topic_package_readiness_ref_drift',
          'Current TopicPackage readiness assessment id drifts from the source bundle.',
          'blocking',
          [context.currentPackage.topic_package_ref, bundle.package_readiness_assessment_ref],
        ));
      }
      if (
        context.currentPackage.v1c_input_bundle_id
        && context.currentPackage.v1c_input_bundle_id !== bundle.v1b_to_v1c_input_bundle_id
      ) {
        refreshIssues.push(this.issue(
          'topic_package_points_to_different_v1c_bundle',
          'Current TopicPackage points to a different v1c input bundle.',
          'blocking',
          [context.currentPackage.topic_package_ref],
        ));
      }
      if (this.hashValue(context.currentPackage) !== this.hashValue(bundle.package_snapshot)) {
        refreshIssues.push(this.issue(
          'package_snapshot_hash_drift',
          'Current TopicPackage no longer matches the frozen package snapshot in the source bundle.',
          'blocking',
          [context.currentPackage.topic_package_ref, bundle.topic_package_ref],
        ));
      }
    }
    if (bundle.package_readiness_status !== 'ready_for_promotion_review') {
      refreshIssues.push(this.issue(
        'bundle_package_readiness_not_ready',
        'Source bundle package readiness is not ready_for_promotion_review.',
        'blocking',
        [bundle.topic_package_ref],
      ));
    }
    if (!context.traceBoundaryCheck) {
      refreshIssues.push(this.issue(
        'package_trace_boundary_check_missing',
        'Package trace/boundary check referenced by the bundle could not be loaded.',
        'blocking',
        [bundle.package_trace_boundary_check_ref],
      ));
    } else if (context.traceBoundaryCheck.check_status !== 'passed') {
      refreshIssues.push(this.issue(
        'package_trace_boundary_check_not_passed',
        'Package trace/boundary check no longer passes.',
        'blocking',
        [bundle.package_trace_boundary_check_ref],
      ));
    } else if (!this.traceBoundaryCheckMatchesBundle(context.traceBoundaryCheck, bundle)) {
      refreshIssues.push(this.issue(
        'package_trace_boundary_check_lineage_drift',
        'Trace/boundary check lineage no longer matches the source bundle refs.',
        'blocking',
        [bundle.package_trace_boundary_check_ref, bundle.topic_package_ref],
      ));
    }
    if (!context.readinessAssessment) {
      refreshIssues.push(this.issue(
        'package_readiness_assessment_missing',
        'Package readiness assessment referenced by the bundle could not be loaded.',
        'blocking',
        [bundle.package_readiness_assessment_ref],
      ));
    } else {
      if (context.readinessAssessment.package_readiness_status !== 'ready_for_promotion_review') {
        refreshIssues.push(this.issue(
          'package_readiness_assessment_not_ready',
          'Package readiness assessment no longer allows promotion review.',
          'blocking',
          [bundle.package_readiness_assessment_ref],
        ));
      }
      if (
        context.readinessAssessment.package_trace_boundary_check_id
        !== bundle.package_trace_boundary_check_ref.ref_id
      ) {
        refreshIssues.push(this.issue(
          'package_readiness_assessment_trace_check_drift',
          'Readiness assessment points to a different trace/boundary check.',
          'blocking',
          [bundle.package_readiness_assessment_ref, bundle.package_trace_boundary_check_ref],
        ));
      }
      if (context.readinessAssessment.package_version !== bundle.package_version) {
        refreshIssues.push(this.issue(
          'package_readiness_assessment_version_drift',
          'Readiness assessment package version drifts from the source bundle.',
          'blocking',
          [bundle.package_readiness_assessment_ref],
        ));
      }
      if (context.readinessAssessment.topic_package_id !== bundle.topic_package_id) {
        refreshIssues.push(this.issue(
          'package_readiness_assessment_package_drift',
          'Readiness assessment points to a different TopicPackage.',
          'blocking',
          [bundle.package_readiness_assessment_ref, bundle.topic_package_ref],
        ));
      }
      if (
        context.readinessAssessment.value_disposition_decision_id
        !== bundle.package_snapshot.value_disposition_decision_id
      ) {
        refreshIssues.push(this.issue(
          'package_readiness_assessment_value_decision_drift',
          'Readiness assessment points to a different value disposition decision.',
          'blocking',
          [bundle.package_readiness_assessment_ref, bundle.value_disposition_decision_ref],
        ));
      }
      if (
        !this.refsEqual(context.readinessAssessment.accepted_risk_refs, bundle.accepted_risk_refs)
        || !this.refsEqual(context.readinessAssessment.blocker_refs, bundle.blocker_refs)
        || !this.refsEqual(context.readinessAssessment.recheck_request_refs, bundle.recheck_request_refs)
      ) {
        refreshIssues.push(this.issue(
          'package_readiness_assessment_carry_forward_drift',
          'Readiness assessment carry-forward refs no longer match the source bundle.',
          'blocking',
          [bundle.package_readiness_assessment_ref],
        ));
      }
    }
    if (refreshIssues.length > 0) {
      checkDetails.push(this.checkDetail(
        'upstream_currentness',
        'blocking',
        'Loaded v1b authority records drift from the source bundle.',
        refreshIssues.flatMap((issue) => issue.refs ?? []),
        refreshIssues.map((issue) => issue.code),
      ));
      return this.evaluation(
        'needs_upstream_refresh',
        refreshIssues[0]?.code ?? 'needs_upstream_refresh',
        refreshIssues,
        warnings,
        checkDetails,
        null,
      );
    }
    checkDetails.push(this.checkDetail(
      'upstream_currentness',
      'passed',
      'Package readiness and trace/boundary records still match the source bundle.',
      [bundle.topic_package_ref, bundle.package_trace_boundary_check_ref, bundle.package_readiness_assessment_ref],
      [],
    ));

    if (bundle.accepted_risk_refs.length > 0) {
      warnings.push(this.issue(
        'accepted_risks_carried_forward',
        'Promotion input snapshot carries accepted risks into gate support.',
        'warning',
        bundle.accepted_risk_refs,
      ));
    }
    if (bundle.blocker_refs.length > 0) {
      warnings.push(this.issue(
        'blocker_refs_carried_forward',
        'Promotion input snapshot carries blocker refs into gate support.',
        'warning',
        bundle.blocker_refs,
      ));
    }
    if (bundle.recheck_request_refs.length > 0) {
      warnings.push(this.issue(
        'recheck_refs_carried_forward',
        'Promotion input snapshot carries recheck refs into gate support.',
        'warning',
        bundle.recheck_request_refs,
      ));
    }
    checkDetails.push(this.checkDetail(
      'risk_blocker_recheck_carry_forward',
      warnings.length > 0 ? 'warning' : 'passed',
      warnings.length > 0
        ? 'Risk, blocker, or recheck refs were carried forward for T-062 review.'
        : 'No risk, blocker, or recheck carry-forward refs require special handling.',
      [...bundle.accepted_risk_refs, ...bundle.blocker_refs, ...bundle.recheck_request_refs],
      [],
    ));

    return this.evaluation('ready_for_gate', null, [], warnings, checkDetails, null);
  }

  private evaluation(
    closureStatus: TopicSelectionPromotionInputSnapshotClosureStatus,
    stopConditionCode: string | null,
    blockers: TopicSelectionGateIssue[],
    warnings: TopicSelectionGateIssue[],
    checkDetails: TopicSelectionPromotionInputSnapshotCheckDetail[],
    replacementBundleRef: TopicSelectionFunctionalRef | null,
  ): SnapshotEvaluation {
    return {
      closureStatus,
      stopConditionCode,
      blockers,
      warnings,
      requiredActions: blockers.map((blocker) => blocker.code),
      checkDetails,
      replacementBundleRef,
    };
  }

  private buildControlPlaneRecords(input: {
    snapshot: TopicSelectionPromotionInputSnapshotRecord;
    sourceRefs: TopicSelectionFunctionalRef[];
    policyVersionId: string | null;
    createdBy: TopicSelectionActorType;
    now: string;
  }): TopicSelectionV1cPromotionInputControlPlanePersistence {
    const inputSnapshotId = this.idFactory('input_snapshot');
    const workflowRunId = this.idFactory('workflow_run');
    const artifactRefId = this.idFactory('artifact_ref');
    const gateResultId = this.idFactory('gate_result');
    const transitionAttemptId = this.idFactory('transition_attempt');
    const traceSnapshotId = this.idFactory('trace_snapshot');
    const inputSnapshotPayload = {
      bundle_hash: input.snapshot.bundle_hash,
      closure_status: input.snapshot.closure_status,
      package_draft_input_snapshot_hash: input.snapshot.package_draft_input_snapshot_hash,
      package_snapshot_hash: input.snapshot.package_snapshot_hash,
      source_bundle_id: input.snapshot.v1b_to_v1c_input_bundle_id,
    };
    const inputSnapshot: TopicSelectionInputSnapshotRecord = {
      input_snapshot_id: inputSnapshotId,
      workspace_id: input.snapshot.workspace_id ?? null,
      title_card_id: input.snapshot.title_card_id,
      target_ref: input.snapshot.promotion_input_snapshot_ref,
      context_policy_version_id: null,
      policy_version: input.policyVersionId,
      snapshot_hash: sha256Text(stableStringify({
        context_policy_version_id: null,
        payload: inputSnapshotPayload,
        permission_refs: [],
        policy_version: input.policyVersionId,
        source_refs: input.sourceRefs,
        target_ref: input.snapshot.promotion_input_snapshot_ref,
      })),
      source_refs: input.sourceRefs,
      permission_refs: [],
      payload: inputSnapshotPayload,
      created_by: input.createdBy,
      created_at: input.now,
    };
    const workflowRun: TopicSelectionLlmWorkflowRunRecord = {
      workflow_run_id: workflowRunId,
      workspace_id: input.snapshot.workspace_id ?? null,
      title_card_id: input.snapshot.title_card_id,
      workflow_key: 'topic-selection.v1c-create-promotion-input-snapshot',
      workflow_profile_key: 'deterministic-promotion-input-snapshot',
      workflow_profile_version: input.policyVersionId,
      input_snapshot_id: inputSnapshotId,
      status: 'succeeded',
      provider_id: null,
      model_id: null,
      prompt_template_id: null,
      prompt_template_version: null,
      started_at: input.now,
      finished_at: input.now,
      telemetry: {},
      output_summary: {
        closure_status: input.snapshot.closure_status,
        promotion_input_snapshot_id: input.snapshot.promotion_input_snapshot_id,
        stop_condition_code: input.snapshot.stop_condition_code ?? null,
      },
      error_code: null,
      error_message: null,
      created_by: input.createdBy,
    };
    const artifactPayload = {
      check_details: input.snapshot.check_details,
      closure_status: input.snapshot.closure_status,
      snapshot_hashes: {
        bundle_hash: input.snapshot.bundle_hash,
        package_snapshot_hash: input.snapshot.package_snapshot_hash,
        package_draft_input_snapshot_hash: input.snapshot.package_draft_input_snapshot_hash,
        promotion_input_snapshot_hash: input.snapshot.promotion_input_snapshot_hash,
      },
      stop_condition_code: input.snapshot.stop_condition_code ?? null,
    };
    const artifactText = stableStringify(artifactPayload);
    const artifactRefs: TopicSelectionArtifactRefRecord[] = [{
      artifact_ref_id: artifactRefId,
      workspace_id: input.snapshot.workspace_id ?? null,
      title_card_id: input.snapshot.title_card_id,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      uri: null,
      payload: artifactPayload,
      checksum: sha256Text(artifactText),
      byte_size: Buffer.byteLength(artifactText, 'utf8'),
      mime_type: 'application/json',
      workflow_run_id: workflowRunId,
      input_snapshot_id: inputSnapshotId,
      created_by: input.createdBy,
      created_at: input.now,
    }];
    const gateVerdict = this.gateVerdictForSnapshot(input.snapshot);
    const gate: TopicSelectionReadinessGateResultRecord = {
      readiness_gate_result_id: gateResultId,
      workspace_id: input.snapshot.workspace_id ?? null,
      title_card_id: input.snapshot.title_card_id,
      gate_key: 'topic-selection.v1c-promotion-input-snapshot-readiness',
      target_ref: input.snapshot.promotion_input_snapshot_ref,
      input_snapshot_id: inputSnapshotId,
      workflow_run_id: workflowRunId,
      policy_version_id: input.policyVersionId,
      verdict: gateVerdict,
      blockers: input.snapshot.blockers,
      warnings: input.snapshot.warnings,
      required_actions: input.snapshot.required_actions,
      loopback_target: null,
      accepted_risk_refs: input.snapshot.accepted_risk_refs,
      quality_signal_refs: [],
      created_by: input.createdBy,
      created_at: input.now,
    };
    const transitionResult = this.transitionResultForSnapshot(input.snapshot);
    const transition: TopicSelectionChainTransitionAttemptRecord = {
      chain_transition_attempt_id: transitionAttemptId,
      workspace_id: input.snapshot.workspace_id ?? null,
      title_card_id: input.snapshot.title_card_id,
      transition_key: 'v1c-v1b-input-bundle-to-promotion-input-snapshot',
      source_ref: input.snapshot.source_bundle_ref,
      target_ref: input.snapshot.promotion_input_snapshot_ref,
      gate_result_id: gateResultId,
      workflow_run_id: workflowRunId,
      input_snapshot_id: inputSnapshotId,
      policy_version_id: input.policyVersionId,
      actor: { actor_type: input.createdBy },
      result: transitionResult,
      reason: input.snapshot.closure_status,
      required_actions: input.snapshot.required_actions,
      blockers: input.snapshot.blockers,
      accepted_risk_refs: input.snapshot.accepted_risk_refs,
      state_write_intents: [],
      created_authority_refs: [input.snapshot.promotion_input_snapshot_ref],
      created_at: input.now,
    };
    const artifactFunctionalRefs = this.artifactRefs(artifactRefs, input.snapshot.title_card_id);
    const tracePayload = {
      closure_status: input.snapshot.closure_status,
      stop_condition_code: input.snapshot.stop_condition_code ?? null,
    };
    const traceSnapshot: TopicSelectionTraceSnapshotRecord = {
      trace_snapshot_id: traceSnapshotId,
      workspace_id: input.snapshot.workspace_id ?? null,
      title_card_id: input.snapshot.title_card_id,
      target_ref: input.snapshot.promotion_input_snapshot_ref,
      snapshot_hash: sha256Text(stableStringify({
        artifact_refs: artifactFunctionalRefs,
        lineage_link_refs: [],
        object_refs: input.sourceRefs,
        payload: tracePayload,
        quality_signal_refs: [],
        target_ref: input.snapshot.promotion_input_snapshot_ref,
        transition_attempt_refs: [this.ref('chain_transition_attempt', transitionAttemptId, input.snapshot.title_card_id)],
      })),
      object_refs: this.uniqueRefs([
        input.snapshot.promotion_input_snapshot_ref,
        ...input.sourceRefs,
      ]),
      lineage_link_refs: [],
      artifact_refs: artifactFunctionalRefs,
      quality_signal_refs: [],
      transition_attempt_refs: [this.ref('chain_transition_attempt', transitionAttemptId, input.snapshot.title_card_id)],
      payload: tracePayload,
      created_by: input.createdBy,
      created_at: input.now,
    };
    return {
      input_snapshot: inputSnapshot,
      workflow_run: workflowRun,
      artifact_refs: artifactRefs,
      readiness_gate_result: gate,
      transition_attempt: transition,
      trace_snapshot: traceSnapshot,
    };
  }

  private toHandoff(
    snapshot: TopicSelectionPromotionInputSnapshotRecord,
  ): TopicSelectionPromotionInputSnapshotHandoff {
    return {
      promotion_input_snapshot_id: snapshot.promotion_input_snapshot_id,
      promotion_input_snapshot_ref: snapshot.promotion_input_snapshot_ref,
      v1b_to_v1c_input_bundle_id: snapshot.v1b_to_v1c_input_bundle_id,
      topic_package_id: snapshot.topic_package_id,
      package_version: snapshot.package_version,
      closure_status: 'ready_for_gate',
      topic_package_ref: snapshot.topic_package_ref,
      package_trace_boundary_check_ref: snapshot.package_trace_boundary_check_ref,
      package_readiness_assessment_ref: snapshot.package_readiness_assessment_ref,
      topic_value_assessment_ref: snapshot.topic_value_assessment_ref,
      value_reasoning_memo_ref: snapshot.value_reasoning_memo_ref,
      value_disposition_decision_ref: snapshot.value_disposition_decision_ref,
      topic_question_ref: snapshot.topic_question_ref,
      topic_question_contract_ref: snapshot.topic_question_contract_ref,
      answerability_plan_ref: snapshot.answerability_plan_ref,
      research_slice_ref: snapshot.research_slice_ref,
      validated_need_refs: snapshot.validated_need_refs,
      evidence_refs: snapshot.evidence_refs,
      accepted_risk_refs: snapshot.accepted_risk_refs,
      blocker_refs: snapshot.blocker_refs,
      memory_suggestion_refs: snapshot.memory_suggestion_refs,
      recheck_request_refs: snapshot.recheck_request_refs,
      readiness_check_refs: snapshot.readiness_check_refs,
      snapshot_hashes: {
        bundle_hash: snapshot.bundle_hash,
        package_snapshot_hash: snapshot.package_snapshot_hash,
        package_draft_input_snapshot_hash: snapshot.package_draft_input_snapshot_hash,
        promotion_input_snapshot_hash: snapshot.promotion_input_snapshot_hash,
      },
      snapshot,
    };
  }

  private compileSourceRefs(
    snapshot: TopicSelectionPromotionInputSnapshotRecord,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      snapshot.source_bundle_ref,
      snapshot.topic_package_ref,
      snapshot.package_trace_boundary_check_ref,
      snapshot.package_readiness_assessment_ref,
      snapshot.topic_value_assessment_ref,
      snapshot.value_reasoning_memo_ref,
      snapshot.value_disposition_decision_ref,
      snapshot.topic_question_ref,
      snapshot.topic_question_contract_ref,
      snapshot.answerability_plan_ref,
      snapshot.research_slice_ref,
      ...snapshot.validated_need_refs,
      ...snapshot.evidence_refs.map((record) => record.evidence_ref),
      ...snapshot.accepted_risk_refs,
      ...snapshot.blocker_refs,
      ...snapshot.memory_suggestion_refs,
      ...snapshot.recheck_request_refs,
      ...snapshot.readiness_check_refs,
    ]);
  }

  private resolveWorkspaceId(input: {
    requestedWorkspaceId: string | null;
    bundle: TopicSelectionV1bToV1cInputBundleRecord;
    currentPackage: TopicSelectionTopicPackageRecord | null;
  }): string | null {
    const sourceWorkspaceIds = this.uniqueStrings([
      this.optionalString(input.bundle.workspace_id),
      this.optionalString(input.bundle.package_snapshot.workspace_id),
      this.optionalString(input.currentPackage?.workspace_id),
    ]);
    if (sourceWorkspaceIds.length > 1) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'v1c promotion input bundle contains conflicting workspace refs.');
    }
    const sourceWorkspaceId = sourceWorkspaceIds[0] ?? null;
    if (input.requestedWorkspaceId && sourceWorkspaceId && input.requestedWorkspaceId !== sourceWorkspaceId) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Requested workspace drifts from v1c promotion input bundle.');
    }
    return input.requestedWorkspaceId ?? sourceWorkspaceId;
  }

  private gateVerdictForSnapshot(
    snapshot: TopicSelectionPromotionInputSnapshotRecord,
  ): TopicSelectionGateVerdict {
    if (snapshot.closure_status === 'ready_for_gate') {
      return snapshot.accepted_risk_refs.length > 0 || snapshot.warnings.length > 0 ? 'pass_with_risk' : 'pass';
    }
    return 'block';
  }

  private transitionResultForSnapshot(
    snapshot: TopicSelectionPromotionInputSnapshotRecord,
  ): TopicSelectionTransitionResult {
    if (snapshot.closure_status !== 'ready_for_gate') {
      return 'blocked';
    }
    return snapshot.accepted_risk_refs.length > 0 || snapshot.warnings.length > 0 ? 'passed_with_risk' : 'passed';
  }

  private checkDetail(
    checkKey: string,
    status: TopicSelectionPromotionInputSnapshotCheckDetail['status'],
    message: string,
    refs: TopicSelectionFunctionalRef[],
    requiredActions: string[],
  ): TopicSelectionPromotionInputSnapshotCheckDetail {
    return {
      check_key: checkKey,
      status,
      message,
      refs: this.uniqueRefs(refs),
      required_actions: requiredActions,
    };
  }

  private issue(
    code: string,
    message: string,
    severity: TopicSelectionGateIssue['severity'],
    refs: TopicSelectionFunctionalRef[] = [],
  ): TopicSelectionGateIssue {
    return {
      code,
      message,
      severity,
      refs,
    };
  }

  private requiredRefs(bundle: TopicSelectionV1bToV1cInputBundleRecord): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      bundle.topic_package_ref,
      bundle.package_trace_boundary_check_ref,
      bundle.package_readiness_assessment_ref,
      bundle.topic_value_assessment_ref,
      bundle.value_reasoning_memo_ref,
      bundle.value_disposition_decision_ref,
      bundle.topic_question_ref,
      bundle.topic_question_contract_ref,
      bundle.answerability_plan_ref,
      bundle.research_slice_ref,
      ...bundle.validated_need_refs,
      ...bundle.evidence_refs.map((record) => record.evidence_ref),
      ...bundle.readiness_check_refs,
    ]);
  }

  private expectedV1cBundleHash(bundle: TopicSelectionV1bToV1cInputBundleRecord): string {
    // D-T128-03: single-sourced with both bundle producers (route path + harness N11).
    return hashV1bToV1cBundle({
      checkRef: bundle.package_trace_boundary_check_ref,
      packageRef: bundle.topic_package_ref,
      packageVersion: bundle.package_version,
      readinessRef: bundle.package_readiness_assessment_ref,
      valueDispositionDecisionRef: bundle.value_disposition_decision_ref,
    });
  }

  private hashValue(value: unknown): string {
    return sha256Text(stableStringify(value));
  }

  private traceBoundaryCheckMatchesBundle(
    check: TopicSelectionPackageTraceBoundaryCheckRecord,
    bundle: TopicSelectionV1bToV1cInputBundleRecord,
  ): boolean {
    return check.topic_package_id === bundle.topic_package_id
      && check.value_disposition_decision_id === bundle.package_snapshot.value_disposition_decision_id
      && check.topic_value_assessment_id === bundle.package_snapshot.topic_value_assessment_id
      && check.topic_question_contract_id === bundle.package_snapshot.topic_question_contract_id
      && check.research_slice_id === bundle.package_snapshot.research_slice_id
      && this.sameRef(check.package_ref, bundle.topic_package_ref)
      && this.sameRef(check.topic_value_assessment_ref, bundle.topic_value_assessment_ref)
      && this.sameRef(check.value_reasoning_memo_ref, bundle.value_reasoning_memo_ref)
      && this.sameRef(check.value_disposition_decision_ref, bundle.value_disposition_decision_ref)
      && this.sameRef(check.topic_question_ref, bundle.topic_question_ref)
      && this.sameRef(check.topic_question_contract_ref, bundle.topic_question_contract_ref)
      && this.sameRef(check.answerability_plan_ref, bundle.answerability_plan_ref)
      && this.sameRef(check.research_slice_ref, bundle.research_slice_ref)
      && this.refsEqual(check.validated_need_refs, bundle.validated_need_refs)
      && this.refsEqual(check.evidence_refs, this.evidenceFunctionalRefs(bundle))
      && this.refsEqual(check.accepted_risk_refs, bundle.accepted_risk_refs)
      && this.refsEqual(check.blocker_refs, bundle.blocker_refs)
      && this.refsEqual(check.recheck_request_refs, bundle.recheck_request_refs);
  }

  private evidenceFunctionalRefs(bundle: TopicSelectionV1bToV1cInputBundleRecord): TopicSelectionFunctionalRef[] {
    return bundle.evidence_refs
      .map((record) => record.evidence_ref)
      .filter((record) => this.hasRef(record));
  }

  private sameRef(left: TopicSelectionFunctionalRef | null | undefined, right: TopicSelectionFunctionalRef | null | undefined): boolean {
    if (!this.hasRef(left) || !this.hasRef(right)) {
      return false;
    }
    return this.refKey(left) === this.refKey(right);
  }

  private refsEqual(left: TopicSelectionFunctionalRef[], right: TopicSelectionFunctionalRef[]): boolean {
    const leftKeys = this.uniqueRefs(left).map((ref) => this.refKey(ref)).sort();
    const rightKeys = this.uniqueRefs(right).map((ref) => this.refKey(ref)).sort();
    return stableStringify(leftKeys) === stableStringify(rightKeys);
  }

  private artifactRefs(
    artifacts: TopicSelectionArtifactRefRecord[],
    titleCardId: string,
  ): TopicSelectionFunctionalRef[] {
    return artifacts.map((artifact) =>
      this.ref('artifact_ref', artifact.artifact_ref_id, titleCardId),
    );
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

  private hasRef(ref: TopicSelectionFunctionalRef | null | undefined): ref is TopicSelectionFunctionalRef {
    return Boolean(ref?.ref_type && ref.ref_id);
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}`;
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const output: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs.filter((item) => this.hasRef(item))) {
      const key = this.refKey(ref);
      if (!seen.has(key)) {
        seen.add(key);
        output.push(ref);
      }
    }
    return output;
  }

  private optionalString(value: string | null | undefined): string {
    return typeof value === 'string' ? value : '';
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }
}
