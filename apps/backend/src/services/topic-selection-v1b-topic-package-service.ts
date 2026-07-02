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
  TopicSelectionValueDispositionDecisionRecord,
  TopicSelectionV1bPackageDraftInput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import type {
  TopicSelectionPackageTraceBoundaryCheckRecord,
  TopicSelectionPackageTraceBoundaryCheckStatus,
  TopicSelectionTopicPackageReadinessAssessmentRecord,
  TopicSelectionTopicPackageReadinessStatus,
  TopicSelectionTopicPackageRecord,
  TopicSelectionV1bToV1cInputBundleRecord,
  TopicSelectionV1bTopicPackageCreationResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-package-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  TopicSelectionV1bTopicPackageControlPlanePersistence,
  TopicSelectionV1bTopicPackageRepository,
} from '../repositories/topic-selection-v1b-topic-package.repository.js';
import type {
  TopicSelectionV1bValueAssessmentRepository,
} from '../repositories/topic-selection-v1b-value-assessment.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { hashV1bToV1cBundle } from './topic-selection-v1b-harness-authority-hash.js';

type IdFactory = (prefix: string) => string;

export type CreateDraftPackageInput = {
  value_disposition_decision_id: string;
  workspace_id?: string | null;
  created_by?: TopicSelectionActorType;
  policy_version_id?: string | null;
};

export type PublishV1cInputBundleInput = {
  topic_package_id: string;
};

export type TopicSelectionV1bTopicPackageServiceOptions = {
  repository: TopicSelectionV1bTopicPackageRepository;
  valueAssessmentRepository: TopicSelectionV1bValueAssessmentRepository;
  idFactory?: IdFactory;
  now?: () => string;
};

type NarrativeDraft = {
  titleCandidates: string[];
  researchBackground: string;
  contributionSummary: string;
  candidateMethods: string[];
  evaluationPlan: string;
  keyRisks: string[];
  nonGoals: string[];
};

type TraceBoundaryEvaluation = {
  checkStatus: TopicSelectionPackageTraceBoundaryCheckStatus;
  readinessStatus: TopicSelectionTopicPackageReadinessStatus;
  missingRefCodes: string[];
  newRefCodes: string[];
  boundaryConflictCodes: string[];
  carryForwardCodes: string[];
  traceIssues: TopicSelectionGateIssue[];
  boundaryIssues: TopicSelectionGateIssue[];
  blockers: TopicSelectionGateIssue[];
  warnings: TopicSelectionGateIssue[];
  requiredActions: string[];
  narrativeConsistency: Record<string, unknown>;
};

export class TopicSelectionV1bTopicPackageService {
  private readonly repository: TopicSelectionV1bTopicPackageRepository;
  private readonly valueAssessmentRepository: TopicSelectionV1bValueAssessmentRepository;
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(options: TopicSelectionV1bTopicPackageServiceOptions) {
    this.repository = options.repository;
    this.valueAssessmentRepository = options.valueAssessmentRepository;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async createDraftPackage(
    input: CreateDraftPackageInput,
  ): Promise<TopicSelectionV1bTopicPackageCreationResult> {
    const decision = await this.requirePackageDecision(input.value_disposition_decision_id);
    const packageInput = decision.package_draft_input;
    if (!packageInput) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ValueDispositionDecision is missing package draft input.');
    }
    const titleCardId = this.requireTitleCardId(packageInput.value_disposition_decision_ref);
    this.validatePackageDraftHandoff(decision, packageInput, titleCardId);
    const workspaceId = this.resolveWorkspaceId({
      requestedWorkspaceId: input.workspace_id ?? null,
      decision,
      packageInput,
    });
    const existing = await this.repository.findPackageByValueDispositionDecisionId(
      decision.value_disposition_decision_id,
    );
    if (existing || decision.output_topic_package_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'TopicPackage already exists for this ValueDispositionDecision.');
    }

    const createdBy = input.created_by ?? 'system';
    const now = this.now();
    const topicPackageId = this.idFactory('topic_package');
    const researchRecordId = this.idFactory('topic_research_record');
    const traceBoundaryCheckId = this.idFactory('package_trace_boundary_check');
    const readinessAssessmentId = this.idFactory('package_readiness_assessment');
    const bundleId = this.idFactory('v1b_to_v1c_input_bundle');
    const packageVersion = 'v1';
    const packageRef = this.ref('topic_package', topicPackageId, titleCardId, packageVersion);
    const narrative = this.buildNarrative(packageInput);
    const selectedEvidenceRefs = this.uniqueRefs(packageInput.evidence_refs.map((record) => record.evidence_ref));
    const selectedLiteratureEvidenceIds = selectedEvidenceRefs.map((ref) => ref.ref_id);
    const packageRecord = this.buildPackageRecord({
      topicPackageId,
      researchRecordId,
      workspaceId,
      titleCardId,
      packageVersion,
      packageRef,
      packageInput,
      narrative,
      selectedEvidenceRefs,
      selectedLiteratureEvidenceIds,
      createdBy,
      now,
    });
    const evaluation = this.evaluateTraceBoundary(packageRecord, packageInput, narrative);
    packageRecord.package_readiness_status = evaluation.readinessStatus;

    const sourceRefs = this.compileSourceRefs(packageInput);
    const controlPlane = this.buildControlPlaneRecords({
      workspaceId,
      titleCardId,
      packageRef,
      packageInput,
      packageRecord,
      narrative,
      evaluation,
      sourceRefs,
      policyVersionId: input.policy_version_id ?? null,
      createdBy,
      now,
    });

    packageRecord.trace_snapshot_id = controlPlane.trace_snapshot.trace_snapshot_id;
    packageRecord.input_snapshot_id = controlPlane.input_snapshot.input_snapshot_id;
    packageRecord.workflow_run_id = controlPlane.workflow_run.workflow_run_id;
    packageRecord.gate_result_id = controlPlane.readiness_gate_result.readiness_gate_result_id;
    packageRecord.transition_attempt_id = controlPlane.transition_attempt.chain_transition_attempt_id;
    packageRecord.artifact_refs = this.artifactRefs(controlPlane.artifact_refs, titleCardId);

    const check = this.buildTraceBoundaryCheck({
      id: traceBoundaryCheckId,
      workspaceId,
      titleCardId,
      packageRecord,
      evaluation,
      inputSnapshotId: controlPlane.input_snapshot.input_snapshot_id,
      workflowRunId: controlPlane.workflow_run.workflow_run_id,
      gateResultId: controlPlane.readiness_gate_result.readiness_gate_result_id,
      transitionAttemptId: controlPlane.transition_attempt.chain_transition_attempt_id,
      artifactRefs: packageRecord.artifact_refs,
      now,
    });
    const readiness = this.buildReadinessAssessment({
      id: readinessAssessmentId,
      workspaceId,
      titleCardId,
      packageRecord,
      check,
      evaluation,
      inputSnapshotId: controlPlane.input_snapshot.input_snapshot_id,
      workflowRunId: controlPlane.workflow_run.workflow_run_id,
      gateResultId: controlPlane.readiness_gate_result.readiness_gate_result_id,
      transitionAttemptId: controlPlane.transition_attempt.chain_transition_attempt_id,
      artifactRefs: packageRecord.artifact_refs,
      assessedBy: createdBy,
      now,
    });
    packageRecord.trace_boundary_check_id = check.package_trace_boundary_check_id;
    packageRecord.readiness_assessment_id = readiness.package_readiness_assessment_id;

    const bundle = evaluation.readinessStatus === 'ready_for_promotion_review'
      ? this.buildV1cInputBundle({
        id: bundleId,
        workspaceId,
        titleCardId,
        packageRecord,
        check,
        readiness,
        packageInput,
        inputSnapshotId: controlPlane.input_snapshot.input_snapshot_id,
        workflowRunId: controlPlane.workflow_run.workflow_run_id,
        gateResultId: controlPlane.readiness_gate_result.readiness_gate_result_id,
        transitionAttemptId: controlPlane.transition_attempt.chain_transition_attempt_id,
        artifactRefs: packageRecord.artifact_refs,
        now,
      })
      : null;
    packageRecord.v1c_input_bundle_id = bundle?.v1b_to_v1c_input_bundle_id ?? null;

    return this.repository.createDraftPackage({
      topic_package: packageRecord,
      package_trace_boundary_check: check,
      package_readiness_assessment: readiness,
      v1c_input_bundle: bundle,
      control_plane: controlPlane,
    });
  }

  async publishV1cInputBundle(
    input: PublishV1cInputBundleInput,
  ): Promise<TopicSelectionV1bToV1cInputBundleRecord> {
    const pkg = await this.getDraftPackage(input.topic_package_id);
    if (pkg.package_readiness_status !== 'ready_for_promotion_review') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Only ready package drafts can publish v1c input bundles.');
    }
    const bundle = await this.repository.findV1cInputBundleByPackageId(input.topic_package_id);
    if (!bundle) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Ready TopicPackage is missing its v1c input bundle.');
    }
    return bundle;
  }

  async getDraftPackage(topicPackageId: string): Promise<TopicSelectionTopicPackageRecord> {
    const pkg = await this.repository.findPackageById(topicPackageId);
    if (!pkg) {
      throw new AppError(404, 'NOT_FOUND', `TopicPackage ${topicPackageId} not found.`);
    }
    return pkg;
  }

  private async requirePackageDecision(
    decisionId: string,
  ): Promise<TopicSelectionValueDispositionDecisionRecord> {
    const decision = await this.valueAssessmentRepository.findDispositionDecisionById(decisionId);
    if (!decision) {
      throw new AppError(404, 'NOT_FOUND', `ValueDispositionDecision ${decisionId} not found.`);
    }
    if (decision.status !== 'active' || !decision.is_current) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Only active/current ValueDispositionDecision records can create draft packages.');
    }
    if (decision.decision !== 'advance_to_package') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Only advance_to_package decisions can create draft packages.');
    }
    return decision;
  }

  private resolveWorkspaceId(input: {
    requestedWorkspaceId: string | null;
    decision: TopicSelectionValueDispositionDecisionRecord;
    packageInput: TopicSelectionV1bPackageDraftInput;
  }): string | null {
    const sourceWorkspaceIds = this.uniqueStrings([
      this.optionalString(input.decision.workspace_id),
      this.optionalString(input.packageInput.value_disposition_decision.workspace_id),
      this.optionalString(input.packageInput.topic_value_assessment.workspace_id),
      this.optionalString(input.packageInput.value_reasoning_memo.workspace_id),
      this.optionalString(input.packageInput.question_contract.workspace_id),
      this.optionalString(input.packageInput.answerability_plan.workspace_id),
      this.optionalString(this.stringFromRecord(input.packageInput.research_slice_snapshot, 'workspace_id')),
    ]);
    if (sourceWorkspaceIds.length > 1) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'T-060 package handoff contains conflicting workspace refs.');
    }
    const sourceWorkspaceId = sourceWorkspaceIds[0] ?? null;
    if (input.requestedWorkspaceId && sourceWorkspaceId && input.requestedWorkspaceId !== sourceWorkspaceId) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Requested workspace drifts from ValueDispositionDecision handoff.');
    }
    return input.requestedWorkspaceId ?? sourceWorkspaceId;
  }

  private validatePackageDraftHandoff(
    decision: TopicSelectionValueDispositionDecisionRecord,
    input: TopicSelectionV1bPackageDraftInput,
    titleCardId: string,
  ): void {
    const issues: string[] = [];
    this.expectRefMatches(
      'value_disposition_decision_ref',
      input.value_disposition_decision_ref,
      'value_disposition_decision',
      decision.value_disposition_decision_id,
      titleCardId,
      issues,
    );
    this.expectRefMatches(
      'topic_value_assessment_ref',
      input.topic_value_assessment_ref,
      'topic_value_assessment',
      decision.topic_value_assessment_id,
      titleCardId,
      issues,
    );
    this.expectRefMatches(
      'value_reasoning_memo_ref',
      input.value_reasoning_memo_ref,
      'value_reasoning_memo',
      decision.value_reasoning_memo_id,
      titleCardId,
      issues,
    );
    this.expectRefMatches(
      'topic_question_contract_ref',
      input.topic_question_contract_ref,
      'topic_question_contract',
      decision.topic_question_contract_id,
      titleCardId,
      issues,
    );
    this.validateFunctionalRef('topic_question_ref', input.topic_question_ref, issues, {
      expectedType: 'topic_question',
      titleCardId,
    });
    this.validateFunctionalRef('answerability_plan_ref', input.answerability_plan_ref, issues, {
      expectedType: 'topic_question_answerability_plan',
      titleCardId,
    });
    this.validateFunctionalRef('research_slice_ref', input.research_slice_ref, issues, {
      expectedType: 'research_slice',
      titleCardId,
    });

    this.expectStringMatches(
      'value_disposition_decision.value_disposition_decision_id',
      input.value_disposition_decision.value_disposition_decision_id,
      decision.value_disposition_decision_id,
      issues,
    );
    this.expectStringMatches(
      'value_disposition_decision.topic_value_assessment_id',
      input.value_disposition_decision.topic_value_assessment_id,
      decision.topic_value_assessment_id,
      issues,
    );
    this.expectStringMatches(
      'value_disposition_decision.topic_question_contract_id',
      input.value_disposition_decision.topic_question_contract_id,
      decision.topic_question_contract_id,
      issues,
    );
    this.expectStringMatches(
      'value_disposition_decision.value_reasoning_memo_id',
      input.value_disposition_decision.value_reasoning_memo_id,
      decision.value_reasoning_memo_id,
      issues,
    );
    if (input.value_disposition_decision.decision !== decision.decision) {
      issues.push('value_disposition_decision.decision drifts from loaded decision');
    }
    if (input.value_disposition_decision.status !== decision.status) {
      issues.push('value_disposition_decision.status drifts from loaded decision');
    }
    if (input.value_disposition_decision.is_current !== decision.is_current) {
      issues.push('value_disposition_decision.is_current drifts from loaded decision');
    }
    if (input.value_disposition_decision.output_topic_package_id) {
      issues.push('value_disposition_decision.output_topic_package_id is already set in handoff');
    }

    this.expectStringMatches(
      'topic_value_assessment.topic_value_assessment_id',
      input.topic_value_assessment.topic_value_assessment_id,
      decision.topic_value_assessment_id,
      issues,
    );
    this.expectStringMatches(
      'topic_value_assessment.topic_question_contract_id',
      input.topic_value_assessment.topic_question_contract_id,
      decision.topic_question_contract_id,
      issues,
    );
    this.expectStringMatches(
      'topic_value_assessment.value_reasoning_memo_id',
      input.topic_value_assessment.value_reasoning_memo_id,
      decision.value_reasoning_memo_id,
      issues,
    );
    this.expectStringMatches(
      'value_reasoning_memo.value_reasoning_memo_id',
      input.value_reasoning_memo.value_reasoning_memo_id,
      decision.value_reasoning_memo_id,
      issues,
    );
    this.expectStringMatches(
      'value_reasoning_memo.topic_value_assessment_id',
      input.value_reasoning_memo.topic_value_assessment_id,
      decision.topic_value_assessment_id,
      issues,
    );
    this.expectStringMatches(
      'value_reasoning_memo.topic_question_contract_id',
      input.value_reasoning_memo.topic_question_contract_id,
      decision.topic_question_contract_id,
      issues,
    );
    this.expectStringMatches(
      'question_contract.topic_question_contract_id',
      input.question_contract.topic_question_contract_id,
      decision.topic_question_contract_id,
      issues,
    );
    this.expectStringMatches(
      'question_contract.topic_question_id',
      input.question_contract.topic_question_id,
      input.topic_question_ref.ref_id,
      issues,
    );
    this.expectStringMatches(
      'question_contract.answerability_plan_id',
      input.question_contract.answerability_plan_id,
      input.answerability_plan_ref.ref_id,
      issues,
    );
    this.expectStringMatches(
      'answerability_plan.topic_question_contract_id',
      input.answerability_plan.topic_question_contract_id,
      decision.topic_question_contract_id,
      issues,
    );
    this.expectStringMatches(
      'answerability_plan.topic_question_id',
      input.answerability_plan.topic_question_id,
      input.topic_question_ref.ref_id,
      issues,
    );
    this.expectRecordStringMatches(
      'research_slice_snapshot.research_slice_id',
      input.research_slice_snapshot,
      'research_slice_id',
      input.research_slice_ref.ref_id,
      issues,
    );

    this.validateTitleCardId('loaded decision', decision.title_card_id, titleCardId, issues);
    this.validateTitleCardId('value_disposition_decision', input.value_disposition_decision.title_card_id, titleCardId, issues);
    this.validateTitleCardId('topic_value_assessment', input.topic_value_assessment.title_card_id, titleCardId, issues);
    this.validateTitleCardId('value_reasoning_memo', input.value_reasoning_memo.title_card_id, titleCardId, issues);
    this.validateTitleCardId('question_contract', input.question_contract.title_card_id, titleCardId, issues);
    this.validateTitleCardId('answerability_plan', input.answerability_plan.title_card_id, titleCardId, issues);
    this.validateRecordTitleCardId('research_slice_snapshot', input.research_slice_snapshot, titleCardId, issues);

    this.validateRefArray('validated_need_refs', input.validated_need_refs, issues, {
      expectedType: 'validated_need',
      titleCardId,
    });
    for (const [index, record] of input.evidence_refs.entries()) {
      this.validateFunctionalRef(`evidence_refs[${index}].evidence_ref`, record.evidence_ref, issues, {
        titleCardId,
      });
      this.validateTitleCardId(`evidence_refs[${index}]`, record.title_card_id, titleCardId, issues);
      this.expectStringMatches(
        `evidence_refs[${index}].topic_question_contract_id`,
        record.topic_question_contract_id,
        decision.topic_question_contract_id,
        issues,
      );
    }
    this.validateRefArray('accepted_risk_refs', input.accepted_risk_refs, issues, {
      expectedType: 'accepted_risk',
      titleCardId,
    });
    this.validateRefArray('memory_suggestion_refs', input.memory_suggestion_refs, issues, {
      expectedType: 'memory_suggestion',
      titleCardId,
    });
    this.validateRefArray('recheck_request_refs', input.recheck_request_refs, issues, {
      expectedType: 'recheck_request',
      titleCardId,
    });
    for (const [index, record] of input.boundary_refs.entries()) {
      this.validateRecordId(`boundary_refs[${index}].topic_question_boundary_ref_id`, record.topic_question_boundary_ref_id, issues);
      this.validateTitleCardId(`boundary_refs[${index}]`, record.title_card_id, titleCardId, issues);
    }
    for (const [index, record] of input.assumption_refs.entries()) {
      this.validateRecordId(`assumption_refs[${index}].topic_question_assumption_ref_id`, record.topic_question_assumption_ref_id, issues);
      this.validateTitleCardId(`assumption_refs[${index}]`, record.title_card_id, titleCardId, issues);
    }
    for (const [index, record] of input.falsification_conditions.entries()) {
      this.validateRecordId(
        `falsification_conditions[${index}].topic_question_falsification_condition_id`,
        record.topic_question_falsification_condition_id,
        issues,
      );
      this.validateTitleCardId(`falsification_conditions[${index}]`, record.title_card_id, titleCardId, issues);
      this.validateRefArray(`falsification_conditions[${index}].trigger_evidence_refs`, record.trigger_evidence_refs, issues, {
        titleCardId,
      });
      this.validateRefArray(`falsification_conditions[${index}].trigger_source_refs`, record.trigger_source_refs, issues, {
        titleCardId,
      });
    }

    if (issues.length > 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `T-060 package handoff is stale or malformed: ${issues.join('; ')}.`,
      );
    }
  }

  private buildControlPlaneRecords(input: {
    workspaceId: string | null;
    titleCardId: string;
    packageRef: TopicSelectionFunctionalRef;
    packageInput: TopicSelectionV1bPackageDraftInput;
    packageRecord: TopicSelectionTopicPackageRecord;
    narrative: NarrativeDraft;
    evaluation: TraceBoundaryEvaluation;
    sourceRefs: TopicSelectionFunctionalRef[];
    policyVersionId: string | null;
    createdBy: TopicSelectionActorType;
    now: string;
  }): TopicSelectionV1bTopicPackageControlPlanePersistence {
    const inputSnapshotId = this.idFactory('input_snapshot');
    const workflowRunId = this.idFactory('workflow_run');
    const gateResultId = this.idFactory('gate_result');
    const transitionAttemptId = this.idFactory('transition_attempt');
    const traceSnapshotId = this.idFactory('trace_snapshot');
    const inputSnapshotPayload = {
      package_draft_input: input.packageInput,
      deterministic_narrative: input.narrative,
      readiness_status: input.evaluation.readinessStatus,
    };
    const inputSnapshot: TopicSelectionInputSnapshotRecord = {
      input_snapshot_id: inputSnapshotId,
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      target_ref: input.packageRef,
      context_policy_version_id: null,
      policy_version: input.policyVersionId,
      snapshot_hash: sha256Text(stableStringify({
        context_policy_version_id: null,
        payload: inputSnapshotPayload,
        permission_refs: [],
        policy_version: input.policyVersionId,
        source_refs: input.sourceRefs,
        target_ref: input.packageRef,
      })),
      source_refs: input.sourceRefs,
      permission_refs: [],
      payload: inputSnapshotPayload,
      created_by: input.createdBy,
      created_at: input.now,
    };
    const workflowRun: TopicSelectionLlmWorkflowRunRecord = {
      workflow_run_id: workflowRunId,
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      workflow_key: 'topic-selection.v1b-create-topic-package-draft',
      workflow_profile_key: 'deterministic-topic-package-draft',
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
        topic_package_id: input.packageRecord.topic_package_id,
        readiness_status: input.evaluation.readinessStatus,
        v1c_input_bundle_created: input.evaluation.readinessStatus === 'ready_for_promotion_review',
      },
      error_code: null,
      error_message: null,
      created_by: input.createdBy,
    };
    const artifactPayload = {
      narrative: input.narrative,
      readiness_status: input.evaluation.readinessStatus,
      trace_status: input.evaluation.checkStatus,
    };
    const artifactPayloadText = stableStringify(artifactPayload);
    const artifactRefs: TopicSelectionArtifactRefRecord[] = [{
      artifact_ref_id: this.idFactory('artifact_ref'),
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      uri: null,
      payload: artifactPayload,
      checksum: sha256Text(artifactPayloadText),
      byte_size: Buffer.byteLength(artifactPayloadText, 'utf8'),
      mime_type: 'application/json',
      workflow_run_id: workflowRunId,
      input_snapshot_id: inputSnapshotId,
      created_by: input.createdBy,
      created_at: input.now,
    }];
    const gateVerdict: TopicSelectionGateVerdict = input.evaluation.blockers.length > 0 ? 'block' : 'pass';
    const gate: TopicSelectionReadinessGateResultRecord = {
      readiness_gate_result_id: gateResultId,
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      gate_key: 'topic-selection.v1b-topic-package-readiness',
      target_ref: input.packageRef,
      input_snapshot_id: inputSnapshotId,
      workflow_run_id: workflowRunId,
      policy_version_id: input.policyVersionId,
      verdict: gateVerdict,
      blockers: input.evaluation.blockers,
      warnings: input.evaluation.warnings,
      required_actions: input.evaluation.requiredActions,
      loopback_target: null,
      accepted_risk_refs: input.packageRecord.accepted_risk_refs,
      quality_signal_refs: [],
      created_by: input.createdBy,
      created_at: input.now,
    };
    const transitionResult = this.resolveTransitionResult(gateVerdict, input.packageRecord.accepted_risk_refs);
    const canWriteState = transitionResult === 'passed' || transitionResult === 'passed_with_risk';
    const transition: TopicSelectionChainTransitionAttemptRecord = {
      chain_transition_attempt_id: transitionAttemptId,
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      transition_key: 'v1b-value-disposition-to-topic-package-draft',
      source_ref: input.packageInput.value_disposition_decision_ref,
      target_ref: input.packageRef,
      gate_result_id: gateResultId,
      workflow_run_id: workflowRunId,
      input_snapshot_id: inputSnapshotId,
      policy_version_id: input.policyVersionId,
      actor: { actor_type: input.createdBy },
      result: transitionResult,
      reason: this.defaultReasonForTransitionResult(transitionResult),
      required_actions: input.evaluation.requiredActions,
      blockers: input.evaluation.blockers,
      accepted_risk_refs: input.packageRecord.accepted_risk_refs,
      state_write_intents: [],
      created_authority_refs: canWriteState ? [input.packageRef] : [],
      created_at: input.now,
    };
    const artifactFunctionalRefs = this.artifactRefs(artifactRefs, input.titleCardId);
    const transitionAttemptRefs = [
      this.ref('chain_transition_attempt', transitionAttemptId, input.titleCardId),
    ];
    const tracePayload = {
      readiness_status: input.evaluation.readinessStatus,
      check_status: input.evaluation.checkStatus,
    };
    const objectRefs = this.uniqueRefs([
      input.packageRef,
      ...input.sourceRefs,
    ]);
    const traceSnapshot: TopicSelectionTraceSnapshotRecord = {
      trace_snapshot_id: traceSnapshotId,
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      target_ref: input.packageRef,
      snapshot_hash: sha256Text(stableStringify({
        artifact_refs: artifactFunctionalRefs,
        lineage_link_refs: [],
        object_refs: objectRefs,
        payload: tracePayload,
        quality_signal_refs: [],
        target_ref: input.packageRef,
        transition_attempt_refs: transitionAttemptRefs,
      })),
      object_refs: objectRefs,
      lineage_link_refs: [],
      artifact_refs: artifactFunctionalRefs,
      quality_signal_refs: [],
      transition_attempt_refs: transitionAttemptRefs,
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

  private buildPackageRecord(input: {
    topicPackageId: string;
    researchRecordId: string;
    workspaceId: string | null;
    titleCardId: string;
    packageVersion: string;
    packageRef: TopicSelectionFunctionalRef;
    packageInput: TopicSelectionV1bPackageDraftInput;
    narrative: NarrativeDraft;
    selectedEvidenceRefs: TopicSelectionFunctionalRef[];
    selectedLiteratureEvidenceIds: string[];
    createdBy: TopicSelectionActorType;
    now: string;
  }): TopicSelectionTopicPackageRecord {
    const assessment = input.packageInput.topic_value_assessment;
    const questionContract = input.packageInput.question_contract;
    return {
      topic_package_id: input.topicPackageId,
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      research_record_id: input.researchRecordId,
      topic_question_id: input.packageInput.topic_question_ref.ref_id,
      topic_question_contract_id: input.packageInput.topic_question_contract_ref.ref_id,
      topic_value_assessment_id: input.packageInput.topic_value_assessment_ref.ref_id,
      value_reasoning_memo_id: input.packageInput.value_reasoning_memo_ref.ref_id,
      value_disposition_decision_id: input.packageInput.value_disposition_decision_ref.ref_id,
      research_slice_id: input.packageInput.research_slice_ref.ref_id,
      research_slice_version: input.packageInput.research_slice_ref.version_id ?? 'v1',
      package_version: input.packageVersion,
      package_readiness_status: 'draft',
      topic_package_ref: input.packageRef,
      topic_value_assessment_ref: input.packageInput.topic_value_assessment_ref,
      value_reasoning_memo_ref: input.packageInput.value_reasoning_memo_ref,
      value_disposition_decision_ref: input.packageInput.value_disposition_decision_ref,
      topic_question_ref: input.packageInput.topic_question_ref,
      topic_question_contract_ref: input.packageInput.topic_question_contract_ref,
      answerability_plan_ref: input.packageInput.answerability_plan_ref,
      research_slice_ref: input.packageInput.research_slice_ref,
      validated_need_refs: input.packageInput.validated_need_refs,
      evidence_refs: input.packageInput.evidence_refs,
      selected_evidence_refs: input.selectedEvidenceRefs,
      accepted_risk_refs: input.packageInput.accepted_risk_refs,
      blocker_refs: assessment.blocker_refs,
      memory_suggestion_refs: input.packageInput.memory_suggestion_refs,
      recheck_request_refs: input.packageInput.recheck_request_refs,
      title_candidates: input.narrative.titleCandidates,
      research_background: input.narrative.researchBackground,
      contribution_summary: input.narrative.contributionSummary,
      candidate_methods: input.narrative.candidateMethods,
      evaluation_plan: input.narrative.evaluationPlan,
      key_risks: input.narrative.keyRisks,
      non_goals: input.narrative.nonGoals,
      selected_literature_evidence_ids: input.selectedLiteratureEvidenceIds,
      package_payload: {
        deterministic_source: 'topic_selection_v1b_package_draft',
        claim_ceiling: questionContract.claim_ceiling,
        max_claim_strength: questionContract.max_claim_strength,
        package_draft_input: input.packageInput,
      },
      trace_boundary_check_id: null,
      readiness_assessment_id: null,
      v1c_input_bundle_id: null,
      trace_snapshot_id: null,
      input_snapshot_id: null,
      workflow_run_id: null,
      gate_result_id: null,
      transition_attempt_id: null,
      artifact_refs: [],
      created_by: input.createdBy,
      created_at: input.now,
      updated_at: input.now,
    };
  }

  private buildNarrative(input: TopicSelectionV1bPackageDraftInput): NarrativeDraft {
    const contract = input.question_contract;
    const answerability = input.answerability_plan;
    const assessment = input.topic_value_assessment;
    const memo = input.value_reasoning_memo;
    const slice = input.research_slice_snapshot;
    const evaluationPath = this.stringFromRecord(slice, 'evaluation_path');
    const nonGoals = this.uniqueStrings([
      ...this.stringArrayFromRecord(slice, 'non_goals'),
      ...contract.prohibited_claims,
    ]);
    const candidateMethods = this.uniqueStrings([
      ...answerability.datasets_or_resources.map((item) => `Resource: ${item}`),
      ...answerability.baselines.map((item) => `Baseline: ${item}`),
      ...answerability.metrics.map((item) => `Metric: ${item}`),
      ...answerability.ablations_or_comparisons.map((item) => `Comparison: ${item}`),
      answerability.evaluation_setting ? `Evaluation setting: ${answerability.evaluation_setting}` : '',
      evaluationPath ? `Execution path: ${evaluationPath}` : '',
    ]);
    const falsificationRisks = input.falsification_conditions.map((condition) =>
      `${condition.condition_type}: ${condition.statement}`,
    );
    return {
      titleCandidates: this.uniqueStrings([
        contract.main_question.replace(/\?$/, ''),
        `${contract.contribution_hypothesis}: ${contract.expected_claim}`,
        `${contract.target_community} topic package: ${contract.max_claim_strength}`,
      ]).slice(0, 3),
      researchBackground: [
        `Target setting: ${contract.target_setting}.`,
        `Target community: ${contract.target_community}.`,
        memo.significance,
        memo.originality,
      ].join(' '),
      contributionSummary: [
        memo.value_thesis,
        `Strongest claim: ${assessment.strongest_claim_if_success}.`,
        assessment.fallback_claim_if_success ? `Fallback claim: ${assessment.fallback_claim_if_success}.` : '',
        `Claim ceiling: ${contract.claim_ceiling}.`,
      ].filter(Boolean).join(' '),
      candidateMethods,
      evaluationPlan: [
        answerability.evaluation_setting,
        answerability.datasets_or_resources.length > 0
          ? `Datasets/resources: ${answerability.datasets_or_resources.join('; ')}.`
          : '',
        answerability.metrics.length > 0 ? `Metrics: ${answerability.metrics.join('; ')}.` : '',
        answerability.baselines.length > 0 ? `Baselines: ${answerability.baselines.join('; ')}.` : '',
        answerability.ablations_or_comparisons.length > 0
          ? `Ablations/comparisons: ${answerability.ablations_or_comparisons.join('; ')}.`
          : '',
        evaluationPath ? `ResearchSlice path: ${evaluationPath}.` : '',
      ].filter(Boolean).join(' '),
      keyRisks: this.uniqueStrings([
        ...assessment.risk_notes,
        ...memo.reviewer_risks,
        ...memo.top_objections,
        ...answerability.dependency_risks,
        ...answerability.open_dependencies,
        ...answerability.known_gaps,
        ...falsificationRisks,
      ]),
      nonGoals,
    };
  }

  private evaluateTraceBoundary(
    pkg: TopicSelectionTopicPackageRecord,
    input: TopicSelectionV1bPackageDraftInput,
    narrative: NarrativeDraft,
  ): TraceBoundaryEvaluation {
    const missingRefCodes = this.missingRefCodes(input);
    const expectedEvidenceKeys = new Set(input.evidence_refs.map((ref) => this.refKey(ref.evidence_ref)));
    const newEvidenceRefs = pkg.selected_evidence_refs.filter((ref) => !expectedEvidenceKeys.has(this.refKey(ref)));
    const expectedNeedKeys = new Set(input.validated_need_refs.map((ref) => this.refKey(ref)));
    const newNeedRefs = pkg.validated_need_refs.filter((ref) => !expectedNeedKeys.has(this.refKey(ref)));
    const newRefCodes = [
      ...newEvidenceRefs.map((ref) => `new_evidence_ref:${ref.ref_type}:${ref.ref_id}`),
      ...newNeedRefs.map((ref) => `new_need_ref:${ref.ref_type}:${ref.ref_id}`),
    ];
    const boundaryConflictCodes = this.boundaryConflictCodes(input, narrative);
    const carryForwardCodes = [
      pkg.accepted_risk_refs.length > 0 ? 'accepted_risks_carried_forward' : '',
      pkg.blocker_refs.length > 0 ? 'blockers_carried_forward' : '',
      pkg.recheck_request_refs.length > 0 ? 'recheck_requests_carried_forward' : '',
    ].filter(Boolean);
    const traceIssues = [
      ...missingRefCodes.map((code) => this.issue(code, `Missing required package trace ref: ${code}.`, 'blocking')),
      ...newRefCodes.map((code) => this.issue(code, `Package introduces a ref outside the T-060 handoff: ${code}.`, 'blocking')),
    ];
    const boundaryIssues = boundaryConflictCodes.map((code) =>
      this.issue(code, `Package narrative conflicts with upstream boundary: ${code}.`, 'blocking'),
    );
    const blockers = [...traceIssues, ...boundaryIssues];
    const warnings = carryForwardCodes.map((code) =>
      this.issue(code, `Package carries forward ${code}.`, 'warning'),
    );
    const checkStatus: TopicSelectionPackageTraceBoundaryCheckStatus = traceIssues.length > 0 || newRefCodes.length > 0
      ? 'blocked'
      : boundaryIssues.length > 0
        ? 'needs_revision'
        : 'passed';
    const readinessStatus: TopicSelectionTopicPackageReadinessStatus = checkStatus === 'passed'
      ? 'ready_for_promotion_review'
      : checkStatus === 'needs_revision'
        ? 'needs_revision'
        : 'blocked';

    return {
      checkStatus,
      readinessStatus,
      missingRefCodes,
      newRefCodes,
      boundaryConflictCodes,
      carryForwardCodes,
      traceIssues,
      boundaryIssues,
      blockers,
      warnings,
      requiredActions: blockers.map((blocker) => blocker.code),
      narrativeConsistency: {
        deterministic: true,
        evidence_ref_count: pkg.selected_evidence_refs.length,
        validated_need_ref_count: pkg.validated_need_refs.length,
        prohibited_claim_count: input.question_contract.prohibited_claims.length,
      },
    };
  }

  private buildTraceBoundaryCheck(input: {
    id: string;
    workspaceId: string | null;
    titleCardId: string;
    packageRecord: TopicSelectionTopicPackageRecord;
    evaluation: TraceBoundaryEvaluation;
    inputSnapshotId: string;
    workflowRunId: string;
    gateResultId: string;
    transitionAttemptId: string;
    artifactRefs: TopicSelectionFunctionalRef[];
    now: string;
  }): TopicSelectionPackageTraceBoundaryCheckRecord {
    return {
      package_trace_boundary_check_id: input.id,
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      topic_package_id: input.packageRecord.topic_package_id,
      value_disposition_decision_id: input.packageRecord.value_disposition_decision_id,
      topic_value_assessment_id: input.packageRecord.topic_value_assessment_id,
      topic_question_contract_id: input.packageRecord.topic_question_contract_id,
      research_slice_id: input.packageRecord.research_slice_id,
      check_status: input.evaluation.checkStatus,
      package_ref: input.packageRecord.topic_package_ref,
      topic_value_assessment_ref: input.packageRecord.topic_value_assessment_ref,
      value_reasoning_memo_ref: input.packageRecord.value_reasoning_memo_ref,
      value_disposition_decision_ref: input.packageRecord.value_disposition_decision_ref,
      topic_question_ref: input.packageRecord.topic_question_ref,
      topic_question_contract_ref: input.packageRecord.topic_question_contract_ref,
      answerability_plan_ref: input.packageRecord.answerability_plan_ref,
      research_slice_ref: input.packageRecord.research_slice_ref,
      validated_need_refs: input.packageRecord.validated_need_refs,
      evidence_refs: input.packageRecord.selected_evidence_refs,
      accepted_risk_refs: input.packageRecord.accepted_risk_refs,
      blocker_refs: input.packageRecord.blocker_refs,
      recheck_request_refs: input.packageRecord.recheck_request_refs,
      missing_ref_codes: input.evaluation.missingRefCodes,
      new_ref_codes: input.evaluation.newRefCodes,
      boundary_conflict_codes: input.evaluation.boundaryConflictCodes,
      carry_forward_codes: input.evaluation.carryForwardCodes,
      trace_issues: input.evaluation.traceIssues,
      boundary_issues: input.evaluation.boundaryIssues,
      narrative_consistency: input.evaluation.narrativeConsistency,
      input_snapshot_id: input.inputSnapshotId,
      workflow_run_id: input.workflowRunId,
      gate_result_id: input.gateResultId,
      transition_attempt_id: input.transitionAttemptId,
      artifact_refs: input.artifactRefs,
      created_at: input.now,
    };
  }

  private buildReadinessAssessment(input: {
    id: string;
    workspaceId: string | null;
    titleCardId: string;
    packageRecord: TopicSelectionTopicPackageRecord;
    check: TopicSelectionPackageTraceBoundaryCheckRecord;
    evaluation: TraceBoundaryEvaluation;
    inputSnapshotId: string;
    workflowRunId: string;
    gateResultId: string;
    transitionAttemptId: string;
    artifactRefs: TopicSelectionFunctionalRef[];
    assessedBy: TopicSelectionActorType;
    now: string;
  }): TopicSelectionTopicPackageReadinessAssessmentRecord {
    return {
      package_readiness_assessment_id: input.id,
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      topic_package_id: input.packageRecord.topic_package_id,
      value_disposition_decision_id: input.packageRecord.value_disposition_decision_id,
      package_trace_boundary_check_id: input.check.package_trace_boundary_check_id,
      package_version: input.packageRecord.package_version,
      package_readiness_status: input.evaluation.readinessStatus,
      blockers: input.evaluation.blockers,
      warnings: input.evaluation.warnings,
      required_actions: input.evaluation.requiredActions,
      accepted_risk_refs: input.packageRecord.accepted_risk_refs,
      blocker_refs: input.packageRecord.blocker_refs,
      recheck_request_refs: input.packageRecord.recheck_request_refs,
      input_snapshot_id: input.inputSnapshotId,
      workflow_run_id: input.workflowRunId,
      gate_result_id: input.gateResultId,
      transition_attempt_id: input.transitionAttemptId,
      artifact_refs: input.artifactRefs,
      assessed_by: input.assessedBy,
      created_at: input.now,
    };
  }

  private buildV1cInputBundle(input: {
    id: string;
    workspaceId: string | null;
    titleCardId: string;
    packageRecord: TopicSelectionTopicPackageRecord;
    check: TopicSelectionPackageTraceBoundaryCheckRecord;
    readiness: TopicSelectionTopicPackageReadinessAssessmentRecord;
    packageInput: TopicSelectionV1bPackageDraftInput;
    inputSnapshotId: string;
    workflowRunId: string;
    gateResultId: string;
    transitionAttemptId: string;
    artifactRefs: TopicSelectionFunctionalRef[];
    now: string;
  }): TopicSelectionV1bToV1cInputBundleRecord {
    const checkRef = this.ref(
      'package_trace_boundary_check',
      input.check.package_trace_boundary_check_id,
      input.titleCardId,
    );
    const readinessRef = this.ref(
      'topic_package_readiness_assessment',
      input.readiness.package_readiness_assessment_id,
      input.titleCardId,
    );
    // D-T128-03: the bundle content hash is single-sourced with the harness N11 publisher and
    // the v1c freshness checker; this shape is byte-identical to the previous local payload.
    const bundleHash = hashV1bToV1cBundle({
      checkRef,
      packageRef: input.packageRecord.topic_package_ref,
      packageVersion: input.packageRecord.package_version,
      readinessRef,
      valueDispositionDecisionRef: input.packageRecord.value_disposition_decision_ref,
    });
    return {
      v1b_to_v1c_input_bundle_id: input.id,
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      topic_package_id: input.packageRecord.topic_package_id,
      package_version: input.packageRecord.package_version,
      package_readiness_status: 'ready_for_promotion_review',
      bundle_status: 'ready_for_promotion_review',
      topic_package_ref: input.packageRecord.topic_package_ref,
      package_trace_boundary_check_ref: checkRef,
      package_readiness_assessment_ref: readinessRef,
      topic_value_assessment_ref: input.packageRecord.topic_value_assessment_ref,
      value_reasoning_memo_ref: input.packageRecord.value_reasoning_memo_ref,
      value_disposition_decision_ref: input.packageRecord.value_disposition_decision_ref,
      topic_question_ref: input.packageRecord.topic_question_ref,
      topic_question_contract_ref: input.packageRecord.topic_question_contract_ref,
      answerability_plan_ref: input.packageRecord.answerability_plan_ref,
      research_slice_ref: input.packageRecord.research_slice_ref,
      validated_need_refs: input.packageRecord.validated_need_refs,
      evidence_refs: input.packageRecord.evidence_refs,
      accepted_risk_refs: input.packageRecord.accepted_risk_refs,
      blocker_refs: input.packageRecord.blocker_refs,
      memory_suggestion_refs: input.packageRecord.memory_suggestion_refs,
      recheck_request_refs: input.packageRecord.recheck_request_refs,
      readiness_check_refs: [checkRef, readinessRef],
      package_snapshot: input.packageRecord,
      package_draft_input_snapshot: input.packageInput,
      bundle_hash: bundleHash,
      input_snapshot_id: input.inputSnapshotId,
      workflow_run_id: input.workflowRunId,
      gate_result_id: input.gateResultId,
      transition_attempt_id: input.transitionAttemptId,
      artifact_refs: input.artifactRefs,
      created_at: input.now,
    };
  }

  private missingRefCodes(input: TopicSelectionV1bPackageDraftInput): string[] {
    const checks: Array<[string, unknown]> = [
      ['topic_value_assessment_ref', input.topic_value_assessment_ref],
      ['value_reasoning_memo_ref', input.value_reasoning_memo_ref],
      ['value_disposition_decision_ref', input.value_disposition_decision_ref],
      ['topic_question_ref', input.topic_question_ref],
      ['topic_question_contract_ref', input.topic_question_contract_ref],
      ['answerability_plan_ref', input.answerability_plan_ref],
      ['research_slice_ref', input.research_slice_ref],
    ];
    const missing = checks
      .filter(([, value]) => !this.hasRef(value))
      .map(([code]) => code);
    if (input.validated_need_refs.length === 0) missing.push('validated_need_refs');
    if (input.evidence_refs.length === 0) missing.push('evidence_refs');
    return missing;
  }

  private boundaryConflictCodes(
    input: TopicSelectionV1bPackageDraftInput,
    narrative: NarrativeDraft,
  ): string[] {
    const text = [
      ...narrative.titleCandidates,
      narrative.researchBackground,
      narrative.contributionSummary,
      ...narrative.candidateMethods,
      narrative.evaluationPlan,
    ].join(' ').toLowerCase();
    const prohibited = input.question_contract.prohibited_claims
      .map((claim) => claim.toLowerCase().trim())
      .filter(Boolean);
    const conflicts = prohibited
      .filter((claim) => this.containsProhibitedAssertion(text, claim))
      .map((claim) => `prohibited_claim:${claim}`);
    if (
      this.containsOverstrongLanguage(input.topic_value_assessment.strongest_claim_if_success)
      && /not|no|cannot|must not/.test(input.question_contract.claim_ceiling.toLowerCase())
    ) {
      conflicts.push('claim_ceiling:strongest_claim_exceeds_ceiling');
    }
    return conflicts;
  }

  private compileSourceRefs(input: TopicSelectionV1bPackageDraftInput): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      input.topic_value_assessment_ref,
      input.value_reasoning_memo_ref,
      input.value_disposition_decision_ref,
      input.topic_question_ref,
      input.topic_question_contract_ref,
      input.answerability_plan_ref,
      input.research_slice_ref,
      ...input.validated_need_refs,
      ...input.evidence_refs.map((record) => record.evidence_ref),
      ...input.accepted_risk_refs,
      ...input.memory_suggestion_refs,
      ...input.recheck_request_refs,
      ...input.boundary_refs.map((record) =>
        this.ref('topic_question_boundary_ref', record.topic_question_boundary_ref_id, record.title_card_id),
      ),
      ...input.assumption_refs.map((record) =>
        this.ref('topic_question_assumption_ref', record.topic_question_assumption_ref_id, record.title_card_id),
      ),
      ...input.falsification_conditions.map((record) =>
        this.ref(
          'topic_question_falsification_condition',
          record.topic_question_falsification_condition_id,
          record.title_card_id,
        ),
      ),
    ]);
  }

  private issue(
    code: string,
    message: string,
    severity: TopicSelectionGateIssue['severity'],
  ): TopicSelectionGateIssue {
    return { code, message, severity, refs: [] };
  }

  private expectRefMatches(
    path: string,
    ref: TopicSelectionFunctionalRef,
    expectedType: string,
    expectedId: string,
    titleCardId: string,
    issues: string[],
  ): void {
    this.validateFunctionalRef(path, ref, issues, {
      expectedType,
      expectedId,
      titleCardId,
    });
  }

  private validateFunctionalRef(
    path: string,
    ref: TopicSelectionFunctionalRef,
    issues: string[],
    options: {
      expectedType?: string;
      expectedId?: string;
      titleCardId?: string;
    } = {},
  ): void {
    if (!ref || typeof ref !== 'object') {
      issues.push(`${path} must be a functional ref`);
      return;
    }
    if (typeof ref.ref_type !== 'string' || ref.ref_type.trim().length === 0) {
      issues.push(`${path}.ref_type is missing`);
    } else if (options.expectedType && ref.ref_type !== options.expectedType) {
      issues.push(`${path}.ref_type expected ${options.expectedType} but received ${ref.ref_type}`);
    }
    if (typeof ref.ref_id !== 'string' || ref.ref_id.trim().length === 0) {
      issues.push(`${path}.ref_id is missing`);
    } else if (options.expectedId && ref.ref_id !== options.expectedId) {
      issues.push(`${path}.ref_id expected ${options.expectedId} but received ${ref.ref_id}`);
    }
    if (ref.title_card_id && options.titleCardId && ref.title_card_id !== options.titleCardId) {
      issues.push(`${path}.title_card_id drifts from value disposition title card`);
    }
  }

  private validateRefArray(
    path: string,
    refs: TopicSelectionFunctionalRef[],
    issues: string[],
    options: {
      expectedType?: string;
      titleCardId?: string;
    } = {},
  ): void {
    if (!Array.isArray(refs)) {
      issues.push(`${path} must be an array`);
      return;
    }
    refs.forEach((ref, index) => {
      this.validateFunctionalRef(`${path}[${index}]`, ref, issues, options);
    });
  }

  private expectStringMatches(
    path: string,
    actual: string,
    expected: string,
    issues: string[],
  ): void {
    if (typeof actual !== 'string' || actual.trim().length === 0) {
      issues.push(`${path} is missing`);
      return;
    }
    if (actual !== expected) {
      issues.push(`${path} expected ${expected} but received ${actual}`);
    }
  }

  private expectRecordStringMatches(
    path: string,
    record: Record<string, unknown>,
    key: string,
    expected: string,
    issues: string[],
  ): void {
    const actual = record[key];
    if (typeof actual !== 'string' || actual.trim().length === 0) {
      issues.push(`${path} is missing`);
      return;
    }
    if (actual !== expected) {
      issues.push(`${path} expected ${expected} but received ${actual}`);
    }
  }

  private validateRecordId(path: string, value: string, issues: string[]): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      issues.push(`${path} is missing`);
    }
  }

  private validateTitleCardId(
    path: string,
    value: string | null | undefined,
    titleCardId: string,
    issues: string[],
  ): void {
    if (value && value !== titleCardId) {
      issues.push(`${path}.title_card_id drifts from value disposition title card`);
    }
  }

  private validateRecordTitleCardId(
    path: string,
    record: Record<string, unknown>,
    titleCardId: string,
    issues: string[],
  ): void {
    const value = record.title_card_id;
    if (typeof value === 'string' && value.length > 0 && value !== titleCardId) {
      issues.push(`${path}.title_card_id drifts from value disposition title card`);
    }
  }

  private resolveTransitionResult(
    gateVerdict: TopicSelectionGateVerdict,
    acceptedRiskRefs: TopicSelectionFunctionalRef[],
  ): TopicSelectionTransitionResult {
    if (gateVerdict === 'block') {
      return 'blocked';
    }
    if (gateVerdict === 'pass_with_risk') {
      return acceptedRiskRefs.length > 0 ? 'passed_with_risk' : 'requires_accepted_risk';
    }
    if (gateVerdict === 'needs_human_review') {
      return 'needs_human_review';
    }
    return 'passed';
  }

  private defaultReasonForTransitionResult(result: TopicSelectionTransitionResult): string {
    switch (result) {
      case 'passed':
        return 'Transition passed deterministic gate.';
      case 'passed_with_risk':
        return 'Transition passed with accepted risk refs.';
      case 'blocked':
        return 'Transition blocked by readiness gate.';
      case 'needs_human_review':
        return 'Transition requires human confirmation.';
      case 'requires_accepted_risk':
        return 'Transition requires accepted risk refs.';
      case 'failed':
        return 'Transition failed.';
    }
  }

  private hasRef(value: unknown): boolean {
    return Boolean(
      value
      && typeof value === 'object'
      && 'ref_id' in value
      && typeof (value as { ref_id?: unknown }).ref_id === 'string'
      && (value as { ref_id: string }).ref_id.length > 0,
    );
  }

  private artifactRefs(
    artifacts: Array<{ artifact_ref_id: string }>,
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

  private requireTitleCardId(ref: TopicSelectionFunctionalRef): string {
    if (!ref.title_card_id) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'T-058 handoff ref is missing title_card_id.');
    }
    return ref.title_card_id;
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}`;
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const output: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      const key = this.refKey(ref);
      if (!seen.has(key)) {
        seen.add(key);
        output.push(ref);
      }
    }
    return output;
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }

  private optionalString(value: string | null | undefined): string {
    return typeof value === 'string' ? value : '';
  }

  private stringFromRecord(record: Record<string, unknown>, key: string): string {
    const value = record[key];
    return typeof value === 'string' ? value : '';
  }

  private stringArrayFromRecord(record: Record<string, unknown>, key: string): string[] {
    const value = record[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private containsOverstrongLanguage(claim: string): boolean {
    const normalized = claim.toLowerCase();
    return [
      'production-ready',
      'production ready',
      'production superiority',
      'state of the art',
      'sota',
      'guarantee',
      'always',
    ].some((term) => normalized.includes(term));
  }

  private containsProhibitedAssertion(text: string, term: string): boolean {
    let cursor = text.indexOf(term);
    while (cursor >= 0) {
      const prefix = text.slice(Math.max(0, cursor - 24), cursor);
      if (!/(?:not|no|never|without|cannot|can't|must not)\s+$/.test(prefix)) {
        return true;
      }
      cursor = text.indexOf(term, cursor + term.length);
    }
    return false;
  }

  /**
   * T-087 Phase 3.1 read-only projection — list TopicPackages under a
   * title-card. Pure repository delegation.
   */
  async listPackagesByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionTopicPackageRecord[]> {
    return this.repository.listPackagesByTitleCardId(titleCardId);
  }
}
