import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionPackageTraceBoundaryCheckRecord,
  TopicSelectionTopicPackageReadinessAssessmentRecord,
  TopicSelectionTopicPackageRecord,
  TopicSelectionV1bToV1cInputBundleRecord,
  TopicSelectionV1bTopicPackageCreationResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-package-contracts';
import type {
  TopicSelectionAllowedPromotionRefinement,
  TopicSelectionPromotionBridgeHandoff,
  TopicSelectionPromotionCondition,
  TopicSelectionPromotionStopOrReopenCondition,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  TopicSelectionV1bTopicPackageAuthorityPersistence,
  TopicSelectionV1bTopicPackagePersistence,
  TopicSelectionV1bTopicPackageRepository,
} from '../repositories/topic-selection-v1b-topic-package.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

export const TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP = '2026-05-15T00:00:00.000Z';

export function topicSelectionV1cAcceptanceRef(
  refType: string,
  refId: string,
  versionId: string | null = null,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
}

export function createTopicSelectionV1cAcceptanceIdFactory() {
  const counts = new Map<string, number>();
  return (prefix: string) => {
    const next = (counts.get(prefix) ?? 0) + 1;
    counts.set(prefix, next);
    return `${prefix}_${String(next).padStart(3, '0')}`;
  };
}

export function createTopicSelectionV1cEvidenceRefFixture() {
  return {
    topic_question_evidence_ref_id: 'topic_question_evidence_ref_001',
    workspace_id: null,
    title_card_id: 'title_card_001',
    topic_question_id: 'topic_question_001',
    topic_question_contract_id: 'topic_question_contract_001',
    evidence_ref: topicSelectionV1cAcceptanceRef('evidence_unit', 'evidence_unit_001'),
    evidence_role: 'support' as const,
    mapped_question_part: 'main_question',
    rationale: 'supports the package',
    source_locator_snapshot: {},
    created_at: TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  };
}

export function createTopicSelectionV1cPackageFixture(
  overrides: Partial<TopicSelectionTopicPackageRecord> = {},
): TopicSelectionTopicPackageRecord {
  return {
    topic_package_id: 'topic_package_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    research_record_id: 'topic_research_record_001',
    topic_question_id: 'topic_question_001',
    topic_question_contract_id: 'topic_question_contract_001',
    topic_value_assessment_id: 'topic_value_assessment_001',
    value_reasoning_memo_id: 'value_reasoning_memo_001',
    value_disposition_decision_id: 'value_disposition_decision_001',
    research_slice_id: 'research_slice_001',
    research_slice_version: 'v1',
    package_version: 'v1',
    package_readiness_status: 'ready_for_promotion_review',
    topic_package_ref: topicSelectionV1cAcceptanceRef('topic_package', 'topic_package_001', 'v1'),
    topic_value_assessment_ref: topicSelectionV1cAcceptanceRef('topic_value_assessment', 'topic_value_assessment_001'),
    value_reasoning_memo_ref: topicSelectionV1cAcceptanceRef('value_reasoning_memo', 'value_reasoning_memo_001'),
    value_disposition_decision_ref: topicSelectionV1cAcceptanceRef('value_disposition_decision', 'value_disposition_decision_001'),
    topic_question_ref: topicSelectionV1cAcceptanceRef('topic_question', 'topic_question_001'),
    topic_question_contract_ref: topicSelectionV1cAcceptanceRef('topic_question_contract', 'topic_question_contract_001'),
    answerability_plan_ref: topicSelectionV1cAcceptanceRef('topic_question_answerability_plan', 'answerability_plan_001'),
    research_slice_ref: topicSelectionV1cAcceptanceRef('research_slice', 'research_slice_001', 'v1'),
    validated_need_refs: [topicSelectionV1cAcceptanceRef('validated_need', 'validated_need_001')],
    evidence_refs: [createTopicSelectionV1cEvidenceRefFixture()],
    selected_evidence_refs: [topicSelectionV1cAcceptanceRef('evidence_unit', 'evidence_unit_001')],
    accepted_risk_refs: [topicSelectionV1cAcceptanceRef('accepted_risk', 'accepted_risk_001')],
    blocker_refs: [],
    memory_suggestion_refs: [topicSelectionV1cAcceptanceRef('memory_suggestion', 'memory_suggestion_001')],
    recheck_request_refs: [topicSelectionV1cAcceptanceRef('recheck_request', 'recheck_request_001')],
    title_candidates: ['Trace ready package'],
    research_background: 'background',
    contribution_summary: 'contribution',
    candidate_methods: ['method'],
    evaluation_plan: 'evaluation',
    key_risks: ['risk'],
    non_goals: ['non-goal'],
    selected_literature_evidence_ids: ['evidence_unit_001'],
    package_payload: {},
    trace_boundary_check_id: 'package_trace_boundary_check_001',
    readiness_assessment_id: 'package_readiness_assessment_001',
    v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
    trace_snapshot_id: 'trace_snapshot_001',
    input_snapshot_id: 'input_snapshot_001',
    workflow_run_id: 'workflow_run_001',
    gate_result_id: 'gate_result_001',
    transition_attempt_id: 'transition_attempt_001',
    artifact_refs: [topicSelectionV1cAcceptanceRef('artifact_ref', 'artifact_ref_001')],
    created_by: 'system',
    created_at: TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
    updated_at: TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
    ...overrides,
  };
}

export function createTopicSelectionV1cTraceCheckFixture(
  overrides: Partial<TopicSelectionPackageTraceBoundaryCheckRecord> = {},
  pkg: TopicSelectionTopicPackageRecord = createTopicSelectionV1cPackageFixture(),
): TopicSelectionPackageTraceBoundaryCheckRecord {
  return {
    package_trace_boundary_check_id: 'package_trace_boundary_check_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    topic_package_id: pkg.topic_package_id,
    value_disposition_decision_id: pkg.value_disposition_decision_id,
    topic_value_assessment_id: pkg.topic_value_assessment_id,
    topic_question_contract_id: pkg.topic_question_contract_id,
    research_slice_id: pkg.research_slice_id,
    check_status: 'passed',
    package_ref: pkg.topic_package_ref,
    topic_value_assessment_ref: pkg.topic_value_assessment_ref,
    value_reasoning_memo_ref: pkg.value_reasoning_memo_ref,
    value_disposition_decision_ref: pkg.value_disposition_decision_ref,
    topic_question_ref: pkg.topic_question_ref,
    topic_question_contract_ref: pkg.topic_question_contract_ref,
    answerability_plan_ref: pkg.answerability_plan_ref,
    research_slice_ref: pkg.research_slice_ref,
    validated_need_refs: pkg.validated_need_refs,
    evidence_refs: pkg.selected_evidence_refs,
    accepted_risk_refs: pkg.accepted_risk_refs,
    blocker_refs: pkg.blocker_refs,
    recheck_request_refs: pkg.recheck_request_refs,
    missing_ref_codes: [],
    new_ref_codes: [],
    boundary_conflict_codes: [],
    carry_forward_codes: [],
    trace_issues: [],
    boundary_issues: [],
    narrative_consistency: {},
    input_snapshot_id: 'input_snapshot_001',
    workflow_run_id: 'workflow_run_001',
    gate_result_id: 'gate_result_001',
    transition_attempt_id: 'transition_attempt_001',
    artifact_refs: pkg.artifact_refs,
    created_at: TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
    ...overrides,
  };
}

export function createTopicSelectionV1cReadinessFixture(
  overrides: Partial<TopicSelectionTopicPackageReadinessAssessmentRecord> = {},
  pkg: TopicSelectionTopicPackageRecord = createTopicSelectionV1cPackageFixture(),
): TopicSelectionTopicPackageReadinessAssessmentRecord {
  return {
    package_readiness_assessment_id: 'package_readiness_assessment_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    topic_package_id: pkg.topic_package_id,
    value_disposition_decision_id: pkg.value_disposition_decision_id,
    package_trace_boundary_check_id: 'package_trace_boundary_check_001',
    package_version: pkg.package_version,
    package_readiness_status: 'ready_for_promotion_review',
    blockers: [],
    warnings: [],
    required_actions: [],
    accepted_risk_refs: pkg.accepted_risk_refs,
    blocker_refs: pkg.blocker_refs,
    recheck_request_refs: pkg.recheck_request_refs,
    input_snapshot_id: 'input_snapshot_001',
    workflow_run_id: 'workflow_run_001',
    gate_result_id: 'gate_result_001',
    transition_attempt_id: 'transition_attempt_001',
    artifact_refs: pkg.artifact_refs,
    assessed_by: 'system',
    created_at: TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
    ...overrides,
  };
}

export function expectedTopicSelectionV1cBundleHash(bundle: Pick<
TopicSelectionV1bToV1cInputBundleRecord,
'package_trace_boundary_check_ref'
| 'topic_package_ref'
| 'package_version'
| 'package_readiness_assessment_ref'
| 'value_disposition_decision_ref'
>): string {
  return sha256Text(stableStringify({
    check_ref: bundle.package_trace_boundary_check_ref,
    package_ref: bundle.topic_package_ref,
    package_version: bundle.package_version,
    readiness_ref: bundle.package_readiness_assessment_ref,
    value_disposition_decision_ref: bundle.value_disposition_decision_ref,
  }));
}

export function createTopicSelectionV1cInputBundleFixture(
  overrides: Partial<TopicSelectionV1bToV1cInputBundleRecord> = {},
  pkg: TopicSelectionTopicPackageRecord = createTopicSelectionV1cPackageFixture(),
): TopicSelectionV1bToV1cInputBundleRecord {
  const bundle: TopicSelectionV1bToV1cInputBundleRecord = {
    v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    topic_package_id: pkg.topic_package_id,
    package_version: pkg.package_version,
    package_readiness_status: 'ready_for_promotion_review',
    bundle_status: 'ready_for_promotion_review',
    topic_package_ref: pkg.topic_package_ref,
    package_trace_boundary_check_ref: topicSelectionV1cAcceptanceRef(
      'package_trace_boundary_check',
      'package_trace_boundary_check_001',
    ),
    package_readiness_assessment_ref: topicSelectionV1cAcceptanceRef(
      'topic_package_readiness_assessment',
      'package_readiness_assessment_001',
    ),
    topic_value_assessment_ref: pkg.topic_value_assessment_ref,
    value_reasoning_memo_ref: pkg.value_reasoning_memo_ref,
    value_disposition_decision_ref: pkg.value_disposition_decision_ref,
    topic_question_ref: pkg.topic_question_ref,
    topic_question_contract_ref: pkg.topic_question_contract_ref,
    answerability_plan_ref: pkg.answerability_plan_ref,
    research_slice_ref: pkg.research_slice_ref,
    validated_need_refs: pkg.validated_need_refs,
    evidence_refs: pkg.evidence_refs,
    accepted_risk_refs: pkg.accepted_risk_refs,
    blocker_refs: pkg.blocker_refs,
    memory_suggestion_refs: pkg.memory_suggestion_refs,
    recheck_request_refs: pkg.recheck_request_refs,
    readiness_check_refs: [
      topicSelectionV1cAcceptanceRef('package_trace_boundary_check', 'package_trace_boundary_check_001'),
      topicSelectionV1cAcceptanceRef('topic_package_readiness_assessment', 'package_readiness_assessment_001'),
    ],
    package_snapshot: pkg,
    package_draft_input_snapshot: {
      value_disposition_decision_ref: pkg.value_disposition_decision_ref,
      topic_value_assessment_ref: pkg.topic_value_assessment_ref,
      value_reasoning_memo_ref: pkg.value_reasoning_memo_ref,
      topic_question_ref: pkg.topic_question_ref,
      topic_question_contract_ref: pkg.topic_question_contract_ref,
      answerability_plan_ref: pkg.answerability_plan_ref,
      research_slice_ref: pkg.research_slice_ref,
      validated_need_refs: pkg.validated_need_refs,
      evidence_refs: pkg.evidence_refs,
      accepted_risk_refs: pkg.accepted_risk_refs,
      memory_suggestion_refs: pkg.memory_suggestion_refs,
      recheck_request_refs: pkg.recheck_request_refs,
      boundary_refs: [],
      assumption_refs: [],
      falsification_conditions: [],
      topic_value_assessment: {} as never,
      value_reasoning_memo: {} as never,
      value_disposition_decision: {} as never,
      question_contract: {} as never,
      answerability_plan: {} as never,
      research_slice_snapshot: {},
    },
    bundle_hash: '',
    input_snapshot_id: 'input_snapshot_001',
    workflow_run_id: 'workflow_run_001',
    gate_result_id: 'gate_result_001',
    transition_attempt_id: 'transition_attempt_001',
    artifact_refs: pkg.artifact_refs,
    created_at: TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
    ...overrides,
  };
  return {
    ...bundle,
    bundle_hash: overrides.bundle_hash ?? expectedTopicSelectionV1cBundleHash(bundle),
  };
}

export type TopicSelectionV1cAcceptanceGraphOptions = {
  packageOverrides?: Partial<TopicSelectionTopicPackageRecord>;
  traceCheckOverrides?: Partial<TopicSelectionPackageTraceBoundaryCheckRecord>;
  readinessOverrides?: Partial<TopicSelectionTopicPackageReadinessAssessmentRecord>;
  bundleOverrides?: Partial<TopicSelectionV1bToV1cInputBundleRecord>;
};

export function createTopicSelectionV1cAcceptanceGraph(
  options: TopicSelectionV1cAcceptanceGraphOptions = {},
) {
  const pkg = createTopicSelectionV1cPackageFixture(options.packageOverrides);
  const check = createTopicSelectionV1cTraceCheckFixture(options.traceCheckOverrides, pkg);
  const readiness = createTopicSelectionV1cReadinessFixture(options.readinessOverrides, pkg);
  const bundle = createTopicSelectionV1cInputBundleFixture(options.bundleOverrides, pkg);
  return {
    pkg,
    check,
    readiness,
    bundle,
  };
}

export class TopicSelectionV1cAcceptanceTopicPackageRepository
implements TopicSelectionV1bTopicPackageRepository {
  readonly packages = new Map<string, TopicSelectionTopicPackageRecord>();
  readonly checks = new Map<string, TopicSelectionPackageTraceBoundaryCheckRecord>();
  readonly readiness = new Map<string, TopicSelectionTopicPackageReadinessAssessmentRecord>();
  readonly bundles = new Map<string, TopicSelectionV1bToV1cInputBundleRecord>();
  readonly latestBundleByPackageId = new Map<string, string>();

  constructor(graph = createTopicSelectionV1cAcceptanceGraph()) {
    this.putPackage(graph.pkg);
    this.putTraceCheck(graph.check);
    this.putReadiness(graph.readiness);
    this.putBundle(graph.bundle, true);
  }

  putPackage(pkg: TopicSelectionTopicPackageRecord): void {
    this.packages.set(pkg.topic_package_id, pkg);
  }

  putTraceCheck(check: TopicSelectionPackageTraceBoundaryCheckRecord): void {
    this.checks.set(check.package_trace_boundary_check_id, check);
  }

  putReadiness(readiness: TopicSelectionTopicPackageReadinessAssessmentRecord): void {
    this.readiness.set(readiness.package_readiness_assessment_id, readiness);
  }

  putBundle(bundle: TopicSelectionV1bToV1cInputBundleRecord, latest: boolean): void {
    this.bundles.set(bundle.v1b_to_v1c_input_bundle_id, bundle);
    if (latest) {
      this.latestBundleByPackageId.set(bundle.topic_package_id, bundle.v1b_to_v1c_input_bundle_id);
    }
  }

  async createDraftPackage(
    _persistence: TopicSelectionV1bTopicPackagePersistence,
  ): Promise<TopicSelectionV1bTopicPackageCreationResult> {
    throw new Error('not implemented in acceptance fixture repository');
  }

  async createDraftPackageAuthority(
    _persistence: TopicSelectionV1bTopicPackageAuthorityPersistence,
  ): Promise<TopicSelectionV1bTopicPackageCreationResult> {
    throw new Error('not implemented in acceptance fixture repository');
  }

  async findPackageById(topicPackageId: string): Promise<TopicSelectionTopicPackageRecord | null> {
    return this.packages.get(topicPackageId) ?? null;
  }

  async listPackagesByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionTopicPackageRecord[]> {
    return [...this.packages.values()].filter((pkg) => pkg.title_card_id === titleCardId);
  }

  async findPackageByValueDispositionDecisionId(
    valueDispositionDecisionId: string,
  ): Promise<TopicSelectionTopicPackageRecord | null> {
    return [...this.packages.values()]
      .find((pkg) => pkg.value_disposition_decision_id === valueDispositionDecisionId) ?? null;
  }

  async findTraceBoundaryCheckById(
    traceBoundaryCheckId: string,
  ): Promise<TopicSelectionPackageTraceBoundaryCheckRecord | null> {
    return this.checks.get(traceBoundaryCheckId) ?? null;
  }

  async findReadinessAssessmentById(
    readinessAssessmentId: string,
  ): Promise<TopicSelectionTopicPackageReadinessAssessmentRecord | null> {
    return this.readiness.get(readinessAssessmentId) ?? null;
  }

  async findV1cInputBundleById(
    v1bToV1cInputBundleId: string,
  ): Promise<TopicSelectionV1bToV1cInputBundleRecord | null> {
    return this.bundles.get(v1bToV1cInputBundleId) ?? null;
  }

  async findV1cInputBundleByPackageId(
    topicPackageId: string,
  ): Promise<TopicSelectionV1bToV1cInputBundleRecord | null> {
    const id = this.latestBundleByPackageId.get(topicPackageId);
    return id ? this.bundles.get(id) ?? null : null;
  }
}

export function createTopicSelectionV1cPromotionConditionFixture(): TopicSelectionPromotionCondition {
  const action = {
    action_code: 'clarify_contribution_claim',
    severity: 'warning' as const,
    loopback_target: 'package' as const,
    refs: [topicSelectionV1cAcceptanceRef('topic_package', 'topic_package_001')],
    reason: 'Clarify contribution claim before outline lock.',
  };
  return {
    condition_id: 'promotion_condition_001',
    condition_code: 'clarify_contribution_claim',
    owner: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    required_action: action,
    refs: action.refs,
    early_check_obligations: ['Re-check contribution claim before outline lock.'],
    verification_note: 'Condition is reviewer-visible.',
  };
}

export function createTopicSelectionV1cPromotionBridgeHandoffFixture(
  overrides: Partial<TopicSelectionPromotionBridgeHandoff> = {},
): TopicSelectionPromotionBridgeHandoff {
  const promotionInputSnapshotHash = 'd'.repeat(64);
  const decisionRef = topicSelectionV1cAcceptanceRef(
    'promotion_decision',
    'promotion_decision_001',
    promotionInputSnapshotHash,
  );
  const humanRef = topicSelectionV1cAcceptanceRef(
    'human_promotion_decision',
    'human_promotion_decision_001',
    promotionInputSnapshotHash,
  );
  const humanConfirmedRef = topicSelectionV1cAcceptanceRef('human_confirmed_decision', 'human_confirmed_decision_001');
  const commitmentRef = topicSelectionV1cAcceptanceRef(
    'promotion_commitment_profile',
    'promotion_commitment_profile_001',
    promotionInputSnapshotHash,
  );
  const gateRef = topicSelectionV1cAcceptanceRef('promotion_gate_check', 'promotion_gate_check_001');
  const inputRef = topicSelectionV1cAcceptanceRef(
    'promotion_input_snapshot',
    'promotion_input_snapshot_001',
    promotionInputSnapshotHash,
  );
  const evidenceRef = topicSelectionV1cAcceptanceRef('evidence_unit', 'evidence_unit_001');
  const acceptedRiskRef = topicSelectionV1cAcceptanceRef('accepted_risk', 'accepted_risk_001');
  const condition = createTopicSelectionV1cPromotionConditionFixture();
  const snapshotHashes = {
    bundle_hash: 'bundle_hash_001',
    package_snapshot_hash: 'package_snapshot_hash_001',
    package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
    promotion_input_snapshot_hash: promotionInputSnapshotHash,
  };
  const sourceRefs = [
    gateRef,
    inputRef,
    topicSelectionV1cAcceptanceRef('topic_package', 'topic_package_001', 'v1'),
    topicSelectionV1cAcceptanceRef('topic_value_assessment', 'topic_value_assessment_001'),
    topicSelectionV1cAcceptanceRef('topic_question', 'topic_question_001'),
    topicSelectionV1cAcceptanceRef('research_slice', 'research_slice_001'),
    topicSelectionV1cAcceptanceRef('validated_need', 'validated_need_001'),
    topicSelectionV1cAcceptanceRef('topic_selection_blocker', 'blocker_001'),
    topicSelectionV1cAcceptanceRef('memory_suggestion', 'memory_suggestion_001'),
    topicSelectionV1cAcceptanceRef('recheck_request', 'recheck_request_001'),
  ];
  const humanDecision = {
    human_promotion_decision_id: 'human_promotion_decision_001',
    human_confirmed_decision_id: 'human_confirmed_decision_001',
    human_promotion_decision_key: 'human_promotion_decision_key_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    promotion_gate_check_id: 'promotion_gate_check_001',
    promotion_gate_check_ref: gateRef,
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_hash: promotionInputSnapshotHash,
    decision: 'promote_with_conditions' as const,
    decision_class: 'promote' as const,
    actor: {
      actor_type: 'human' as const,
      actor_id: 'reviewer_001',
    },
    decision_timestamp: TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
    confirmed_snapshot_hash: promotionInputSnapshotHash,
    rationale: 'Ready to promote with one condition.',
    conditions: [condition],
    required_actions: [],
    loopback_target: null,
    loopback_refs: [],
    accepted_risk_refs: [acceptedRiskRef],
    allowed_refinements: [
      {
        refinement_code: 'wording_only',
        scope: 'title_and_abstract_claim_wording',
        refs: [topicSelectionV1cAcceptanceRef('topic_package', 'topic_package_001')],
      },
    ] satisfies TopicSelectionAllowedPromotionRefinement[],
    stop_conditions: [] satisfies TopicSelectionPromotionStopOrReopenCondition[],
    reopen_conditions: [] satisfies TopicSelectionPromotionStopOrReopenCondition[],
    source_refs: sourceRefs,
    artifact_refs: [topicSelectionV1cAcceptanceRef('artifact_ref', 'artifact_ref_human_001')],
    created_at: TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  };
  const promotionDecision = {
    promotion_decision_id: 'promotion_decision_001',
    promotion_decision_status: 'current' as const,
    current_promotion_input_snapshot_key: 'promotion_input_snapshot_001',
    human_promotion_decision_id: humanDecision.human_promotion_decision_id,
    human_confirmed_decision_id: humanDecision.human_confirmed_decision_id,
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    promotion_gate_check_id: 'promotion_gate_check_001',
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_hash: promotionInputSnapshotHash,
    gate_disposition: 'ready_for_human_decision' as const,
    decision: 'promote_with_conditions' as const,
    decision_class: 'promote' as const,
    bridge_eligible: true,
    promotion_commitment_profile_id: 'promotion_commitment_profile_001',
    loopback_target: null,
    required_actions: [],
    accepted_risk_refs: [acceptedRiskRef],
    conditions: [condition],
    source_refs: sourceRefs,
    snapshot_hashes: snapshotHashes,
    artifact_refs: [topicSelectionV1cAcceptanceRef('artifact_ref', 'artifact_ref_decision_001')],
    created_at: TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  };
  const commitment = {
    promotion_commitment_profile_id: 'promotion_commitment_profile_001',
    promotion_decision_id: 'promotion_decision_001',
    human_promotion_decision_id: humanDecision.human_promotion_decision_id,
    human_confirmed_decision_id: humanDecision.human_confirmed_decision_id,
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    promotion_gate_check_id: 'promotion_gate_check_001',
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_hash: promotionInputSnapshotHash,
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    scope: {
      contribution_summary: 'A focused contribution summary.',
      evaluation_plan: 'A bounded evaluation plan.',
      source_snapshot_excerpt: {
        title: 'Working paper title',
        problem_statement: 'A concise problem statement.',
        contribution_summary: 'A focused contribution summary.',
        evaluation_plan: 'A bounded evaluation plan.',
        selected_evidence_refs: [
          {
            evidence_ref: evidenceRef,
          },
        ],
      },
    },
    claim_ceiling: 'Correlation and mechanism claims only.',
    prohibited_claims: ['Do not claim causal proof.'],
    accepted_risk_refs: [acceptedRiskRef],
    conditions: [condition],
    allowed_refinements: humanDecision.allowed_refinements,
    early_check_obligations: ['Re-check contribution claim before outline lock.'],
    stop_conditions: [],
    reopen_conditions: [],
    source_refs: sourceRefs,
    snapshot_hashes: snapshotHashes,
    artifact_refs: [topicSelectionV1cAcceptanceRef('artifact_ref', 'artifact_ref_commitment_001')],
    created_at: TOPIC_SELECTION_V1C_ACCEPTANCE_TIMESTAMP,
  };
  return {
    promotion_decision_id: 'promotion_decision_001',
    promotion_decision_ref: decisionRef,
    human_promotion_decision_ref: humanRef,
    human_confirmed_decision_ref: humanConfirmedRef,
    promotion_commitment_profile_ref: commitmentRef,
    promotion_gate_check_ref: gateRef,
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_ref: inputRef,
    promotion_input_snapshot_hash: promotionInputSnapshotHash,
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    decision: 'promote_with_conditions',
    promotion_decision_status: 'current',
    conditions: [condition],
    accepted_risk_refs: [acceptedRiskRef],
    allowed_refinements: humanDecision.allowed_refinements,
    early_check_obligations: commitment.early_check_obligations,
    stop_conditions: [],
    reopen_conditions: [],
    source_refs: sourceRefs,
    snapshot_hashes: snapshotHashes,
    artifact_refs: [topicSelectionV1cAcceptanceRef('artifact_ref', 'artifact_ref_handoff_001')],
    human_promotion_decision: humanDecision,
    promotion_decision: promotionDecision,
    promotion_commitment_profile: commitment,
    ...overrides,
  };
}

export class TopicSelectionV1cAcceptancePromotionBridgeHandoffProvider {
  constructor(private readonly handoff: TopicSelectionPromotionBridgeHandoff) {}

  async getPromotionBridgeHandoff(
    promotionDecisionId: string,
  ): Promise<TopicSelectionPromotionBridgeHandoff> {
    if (promotionDecisionId !== this.handoff.promotion_decision_id) {
      throw new AppError(404, 'NOT_FOUND', `PromotionDecision ${promotionDecisionId} not found.`);
    }
    return this.handoff;
  }
}
