import crypto from 'node:crypto';
import type {
  TopicSelectionFunctionalRef,
  TopicSelectionHumanConfirmedDecisionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceConflictSetRecord,
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionGapSelectionReview,
  TopicSelectionNeedCandidateRecord,
  TopicSelectionRejectedNeedCandidateFraming,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionCoverageRowIntentRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import type {
  TopicSelectionQuestionFrameRecord,
  TopicSelectionTopicQuestionAnswerabilityPlanRecord,
  TopicSelectionTopicQuestionAssumptionRefRecord,
  TopicSelectionTopicQuestionBoundaryRefRecord,
  TopicSelectionTopicQuestionCandidateRecord,
  TopicSelectionTopicQuestionContractRecord,
  TopicSelectionTopicQuestionEvidenceRefRecord,
  TopicSelectionTopicQuestionFalsificationConditionRecord,
  TopicSelectionTopicQuestionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-question-contracts';
import {
  TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION,
  TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS,
  TOPIC_SELECTION_RESEARCH_TRANSITIONS_BY_CHECKPOINT,
  type TopicSelectionResearchCheckpointAction,
  type TopicSelectionResearchCheckpointDecisionInput,
  type TopicSelectionResearchCheckpointDecisionRecord,
  type TopicSelectionResearchCheckpointKind,
  type TopicSelectionResearchCheckpointPacket,
  type TopicSelectionResearchCheckpointRecord,
  type TopicSelectionResearchObjectionInput,
  type TopicSelectionResearchObjectionRecord,
  type TopicSelectionResearchObjectionResolutionInput,
  type TopicSelectionResearchObjectionResolutionRecord,
  type TopicSelectionResearchStatusProjection,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-checkpoint-contracts';
import { AppError } from '../errors/app-error.js';
import {
  TopicSelectionResearchCheckpointCurrentConflictError,
  type TopicSelectionResearchCheckpointRepository,
} from '../repositories/topic-selection-research-checkpoint.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';

type IdFactory = (prefix: string) => string;

type ServiceOptions = {
  idFactory?: IdFactory;
  now?: () => string;
};

type GapCandidatePacketEntry = {
  need_candidate_ref: TopicSelectionFunctionalRef;
  semantic_group_key: string;
  machine_viable: boolean;
};

export type MaterializeResearchCheckpointInput = {
  workspace_id?: string | null;
  title_card_id: string;
  checkpoint_kind: TopicSelectionResearchCheckpointKind;
  provenance_class?: TopicSelectionResearchCheckpointRecord['provenance_class'];
  policy_version_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  target_snapshot_hash: string;
  source_refs?: TopicSelectionFunctionalRef[];
  allowed_actions: TopicSelectionResearchCheckpointAction[];
  required_action_refs?: TopicSelectionFunctionalRef[];
  packet_payload?: Record<string, unknown>;
};

export type AssertResearchTransitionInput = {
  title_card_id: string;
  checkpoint_kind: TopicSelectionResearchCheckpointKind;
  target_ref?: TopicSelectionFunctionalRef;
  target_snapshot_hash?: string;
};

export type MaterializeEvidenceLandscapeCheckpointInput = {
  evidence_map: TopicSelectionEvidenceMapRecord;
  evidence_units: TopicSelectionEvidenceUnitRecord[];
  conflict_sets: TopicSelectionEvidenceConflictSetRecord[];
  coverage_row_intents: TopicSelectionCoverageRowIntentRecord[];
  policy_version_id?: string | null;
};

export type MaterializeGapSelectionCheckpointInput = {
  workspace_id?: string | null;
  title_card_id: string;
  evidence_map_ref: TopicSelectionFunctionalRef;
  candidates: TopicSelectionNeedCandidateRecord[];
  rejected_framings?: TopicSelectionRejectedNeedCandidateFraming[];
  policy_version_id?: string | null;
};

export type MaterializeQuestionContractCheckpointInput = {
  contract: TopicSelectionTopicQuestionContractRecord;
  question: TopicSelectionTopicQuestionRecord;
  candidate: TopicSelectionTopicQuestionCandidateRecord;
  question_frame: TopicSelectionQuestionFrameRecord;
  answerability_plan: TopicSelectionTopicQuestionAnswerabilityPlanRecord;
  evidence_refs: TopicSelectionTopicQuestionEvidenceRefRecord[];
  boundary_refs: TopicSelectionTopicQuestionBoundaryRefRecord[];
  assumption_refs: TopicSelectionTopicQuestionAssumptionRefRecord[];
  falsification_conditions: TopicSelectionTopicQuestionFalsificationConditionRecord[];
  upstream_refs?: TopicSelectionFunctionalRef[];
  policy_version_id?: string | null;
};

export type TopicSelectionPromotionCheckpointFinding = {
  finding_id: string;
  summary: string;
  refs: TopicSelectionFunctionalRef[];
  mapped_accepted_risk_refs?: TopicSelectionFunctionalRef[];
};

export type TopicSelectionPromotionCheckpointCriticFinding = {
  finding_id: string;
  summary: string;
  resolution_status?: 'accepted_and_repaired' | 'accepted_as_risk' | 'rebutted_with_refs' | null;
  mapping_refs?: TopicSelectionFunctionalRef[];
};

export type MaterializePromotionCheckpointInput = {
  workspace_id?: string | null;
  title_card_id: string;
  promotion_input_snapshot_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_hash: string;
  topic_question_contract_ref: TopicSelectionFunctionalRef;
  source_refs?: TopicSelectionFunctionalRef[];
  gate_ready: boolean;
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  required_actions: Array<{
    action_code: string;
    refs: TopicSelectionFunctionalRef[];
  }>;
  pass_with_risk_findings: TopicSelectionPromotionCheckpointFinding[];
  critic_findings: TopicSelectionPromotionCheckpointCriticFinding[];
  proposed_condition_actions: Array<{
    action_code: string;
    refs: TopicSelectionFunctionalRef[];
  }>;
  policy_version_id?: string | null;
};

export type AssertCompleteResearchCheckpointChainInput = {
  title_card_id: string;
  promotion_input_snapshot_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_hash: string;
};

export type AdaptExistingResearchDecisionInput = {
  decision_authority_ref: TopicSelectionFunctionalRef;
  confirmed_snapshot_hash: string;
  advances?: boolean;
};

const BLOCKING_OBJECTION_SEVERITIES = new Set(['blocking', 'critical']);
const OBJECTION_LOOPBACK_REF_TYPES = {
  evidence_landscape: 'evidence_map',
  gap_selection: 'validated_need',
  research_slice: 'research_slice',
  question_contract: 'topic_question_contract',
} as const;
const OBJECTION_EVIDENCE_REF_TYPES = new Set([
  'evidence_map',
  'evidence_unit',
  'literature_record',
  'literature_snapshot',
  'search_run',
  'validated_need',
]);

export class TopicSelectionResearchCheckpointService {
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(
    private readonly repository: TopicSelectionResearchCheckpointRepository,
    private readonly controlPlane: TopicSelectionControlPlaneService,
    options: ServiceOptions = {},
  ) {
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async materializeCheckpoint(
    input: MaterializeResearchCheckpointInput,
  ): Promise<TopicSelectionResearchCheckpointRecord> {
    this.assertHash(input.target_snapshot_hash, 'target_snapshot_hash');
    this.assertTarget(input.title_card_id, input.target_ref);
    const sourceRefs = this.uniqueRefs(input.source_refs ?? []);
    const requiredActionRefs = this.uniqueRefs(input.required_action_refs ?? []);
    const allowedActions = [...new Set(input.allowed_actions)].sort();
    if (allowedActions.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'ResearchCheckpoint requires at least one allowed action.');
    }
    const packetIdentity = {
      allowed_actions: allowedActions,
      checkpoint_kind: input.checkpoint_kind,
      contract_version: TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION,
      provenance_class: input.provenance_class ?? 'native',
      packet_payload: input.packet_payload ?? {},
      policy_version_id: input.policy_version_id ?? null,
      required_action_refs: requiredActionRefs,
      source_refs: sourceRefs,
      target_ref: input.target_ref,
      target_snapshot_hash: input.target_snapshot_hash,
      title_card_id: input.title_card_id,
    };
    const packetHash = this.hash(packetIdentity);
    const checkpointKey = this.hash(packetIdentity);
    const existing = await this.repository.findCheckpointByKey(checkpointKey);
    if (existing) return existing;

    const inputSnapshot = await this.controlPlane.compileInputSnapshot({
      input_snapshot_id: `input_snapshot_research_checkpoint_${checkpointKey}`,
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      target_ref: input.target_ref,
      policy_version: input.policy_version_id ?? TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION,
      source_refs: sourceRefs,
      payload: packetIdentity,
      created_by: 'system',
    });
    const now = this.now();
    const record: TopicSelectionResearchCheckpointRecord = {
      research_checkpoint_id: this.idFactory('research_checkpoint'),
      checkpoint_key: checkpointKey,
      current_checkpoint_key: this.currentKey(input.title_card_id, input.checkpoint_kind),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      checkpoint_kind: input.checkpoint_kind,
      contract_version: TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION,
      provenance_class: input.provenance_class ?? 'native',
      policy_version_id: input.policy_version_id ?? null,
      target_ref: input.target_ref,
      target_snapshot_hash: input.target_snapshot_hash,
      packet_hash: packetHash,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      source_refs: sourceRefs,
      allowed_actions: allowedActions,
      required_action_refs: requiredActionRefs,
      decision_authority_ref: null,
      status: 'pending',
      supersedes_checkpoint_id: null,
      superseded_by_checkpoint_id: null,
      created_at: now,
      updated_at: now,
      decided_at: null,
      superseded_at: null,
    };
    try {
      return await this.repository.replaceCurrentCheckpoint(record);
    } catch (error) {
      if (error instanceof TopicSelectionResearchCheckpointCurrentConflictError) {
        throw new AppError(409, 'VERSION_CONFLICT', error.message);
      }
      throw error;
    }
  }

  async materializeEvidenceLandscapeCheckpoint(
    input: MaterializeEvidenceLandscapeCheckpointInput,
  ): Promise<TopicSelectionResearchCheckpointRecord> {
    const evidenceMap = input.evidence_map;
    const evidenceMapRef = this.ref(
      'evidence_map',
      evidenceMap.evidence_map_id,
      evidenceMap.title_card_id,
      evidenceMap.evidence_map_version,
    );
    const requiredBaselineRows = input.coverage_row_intents.filter((row) =>
      row.required && (row.intent_type === 'baseline' || row.expected_evidence_role === 'baseline'));
    const requiredChallengeRows = input.coverage_row_intents.filter((row) =>
      row.required && (row.intent_type === 'challenge' || row.expected_evidence_role === 'challenge'));
    const claimBearing = (unit: TopicSelectionEvidenceUnitRecord): boolean =>
      !unit.abstract_only
      && unit.freshness_status === 'current'
      && unit.review_status !== 'rejected'
      && unit.source_statement.trim().length > 0
      && (unit.source_attribution_kind === 'source_claim' || unit.source_attribution_kind === 'counter_evidence');
    const coversAny = (
      unit: TopicSelectionEvidenceUnitRecord,
      rows: TopicSelectionCoverageRowIntentRecord[],
    ): boolean => rows.length === 0
      || rows.some((row) => row.coverage_row_intent_id === unit.coverage_row_intent_ref?.ref_id);
    const supportUnits = input.evidence_units.filter((unit) => unit.evidence_role === 'support');
    const nearestWorkUnits = input.evidence_units.filter((unit) =>
      unit.evidence_role === 'baseline' && claimBearing(unit) && coversAny(unit, requiredBaselineRows));
    const disconfirmingUnits = input.evidence_units.filter((unit) =>
      unit.evidence_role === 'challenge' && claimBearing(unit) && coversAny(unit, requiredChallengeRows));
    const missingBaselineRows = requiredBaselineRows.filter((row) => !nearestWorkUnits.some((unit) =>
      unit.coverage_row_intent_ref?.ref_id === row.coverage_row_intent_id));
    const missingChallengeRows = requiredChallengeRows.filter((row) => !disconfirmingUnits.some((unit) =>
      unit.coverage_row_intent_ref?.ref_id === row.coverage_row_intent_id));
    const coreUnits = input.evidence_units.filter((unit) =>
      unit.evidence_role === 'support' || unit.evidence_role === 'baseline' || unit.evidence_role === 'challenge');
    const issues: Array<{ code: string; message: string; refs: TopicSelectionFunctionalRef[] }> = [];
    if (!supportUnits.some(claimBearing)) {
      issues.push({ code: 'CLAIM_BEARING_SUPPORT_REQUIRED', message: 'Support must include an inspectable claim beyond abstract-only text.', refs: [] });
    }
    if (nearestWorkUnits.length === 0 || missingBaselineRows.length > 0) {
      issues.push({
        code: 'DIRECT_NEIGHBOR_COVERAGE_REQUIRED',
        message: 'Every required direct-neighbor baseline intent needs claim-bearing, inspectable evidence.',
        refs: missingBaselineRows.map((row) => this.ref('coverage_row_intent', row.coverage_row_intent_id, evidenceMap.title_card_id)),
      });
    }
    if (disconfirmingUnits.length === 0 || missingChallengeRows.length > 0) {
      issues.push({
        code: 'DISCONFIRMING_EVIDENCE_REQUIRED',
        message: 'Every required disconfirming intent needs claim-bearing, inspectable challenge evidence.',
        refs: missingChallengeRows.map((row) => this.ref('coverage_row_intent', row.coverage_row_intent_id, evidenceMap.title_card_id)),
      });
    }
    const abstractCoreRefs = coreUnits.filter((unit) => unit.abstract_only).map((unit) => this.evidenceUnitRef(unit));
    if (abstractCoreRefs.length > 0) {
      issues.push({
        code: 'ABSTRACT_ONLY_CORE_EVIDENCE',
        message: 'Abstract-only material cannot serve as support, direct-neighbor, or disconfirming core evidence.',
        refs: abstractCoreRefs,
      });
    }
    const nonSourceClaimRefs = coreUnits
      .filter((unit) => unit.source_attribution_kind === 'llm_inference')
      .map((unit) => this.evidenceUnitRef(unit));
    if (nonSourceClaimRefs.length > 0) {
      issues.push({
        code: 'SOURCE_AUTHORITY_REQUIRED',
        message: 'LLM inference cannot substitute for claim-bearing source authority.',
        refs: nonSourceClaimRefs,
      });
    }
    const blockingConflictRefs = input.conflict_sets
      .filter((conflict) => conflict.severity === 'blocking')
      .map((conflict) => this.ref('evidence_conflict_set', conflict.evidence_conflict_set_id, evidenceMap.title_card_id));
    if (blockingConflictRefs.length > 0) {
      issues.push({
        code: 'BLOCKING_EVIDENCE_CONFLICT',
        message: 'Blocking evidence conflicts must be resolved before evidence review can advance.',
        refs: blockingConflictRefs,
      });
    }
    if (evidenceMap.freshness_status !== 'current') {
      issues.push({
        code: 'CURRENT_EVIDENCE_MAP_REQUIRED',
        message: 'Evidence landscape review requires a current EvidenceMap.',
        refs: [evidenceMapRef],
      });
    }
    const snapshotPayload = {
      evidence_map_ref: evidenceMapRef,
      evidence_map_freshness_status: evidenceMap.freshness_status,
      evidence_units: input.evidence_units.map((unit) => ({
        evidence_unit_ref: this.evidenceUnitRef(unit),
        literature_ref: unit.literature_ref,
        coverage_row_intent_ref: unit.coverage_row_intent_ref ?? null,
        evidence_role: unit.evidence_role,
        source_attribution_kind: unit.source_attribution_kind,
        locator: unit.locator,
        abstract_only: unit.abstract_only,
        review_status: unit.review_status,
        freshness_status: unit.freshness_status,
        issue_codes: unit.issue_codes,
      })),
      coverage_row_intents: input.coverage_row_intents.map((row) => ({
        coverage_row_intent_id: row.coverage_row_intent_id,
        coverage_key: row.coverage_key,
        intent_type: row.intent_type,
        required: row.required,
        expected_evidence_role: row.expected_evidence_role,
        rationale: row.rationale,
      })),
      nearest_work_unit_refs: nearestWorkUnits.map((unit) => this.evidenceUnitRef(unit)),
      disconfirming_unit_refs: disconfirmingUnits.map((unit) => this.evidenceUnitRef(unit)),
      claim_bearing_support_unit_refs: supportUnits.filter(claimBearing).map((unit) => this.evidenceUnitRef(unit)),
      material_conflict_refs: input.conflict_sets
        .filter((conflict) => conflict.severity === 'material' || conflict.severity === 'blocking')
        .map((conflict) => this.ref('evidence_conflict_set', conflict.evidence_conflict_set_id, evidenceMap.title_card_id)),
      policy_result: issues.length === 0 ? 'eligible_for_human_review' : 'loopback_required',
      policy_issues: issues,
      policy_note: 'Counts are diagnostic only; role, source authority, currentness, and inspectability govern eligibility.',
    };
    const targetSnapshotHash = this.hash(snapshotPayload);
    return this.materializeCheckpoint({
      workspace_id: evidenceMap.workspace_id ?? null,
      title_card_id: evidenceMap.title_card_id,
      checkpoint_kind: 'evidence_landscape',
      policy_version_id: input.policy_version_id ?? 'topic-selection-evidence-landscape@v1',
      target_ref: evidenceMapRef,
      target_snapshot_hash: targetSnapshotHash,
      source_refs: this.uniqueRefs([
        evidenceMap.search_run_ref,
        evidenceMap.search_plan_ref,
        evidenceMap.literature_snapshot_ref,
        ...input.evidence_units.flatMap((unit) => [this.evidenceUnitRef(unit), unit.literature_ref, ...unit.source_refs]),
      ]),
      allowed_actions: issues.length === 0
        ? ['advance', 'loopback', 'reject', 'hold']
        : ['loopback', 'reject', 'hold'],
      required_action_refs: issues.map((issue) => this.requiredActionRef(evidenceMap.title_card_id, evidenceMapRef, issue.code)),
      packet_payload: snapshotPayload,
    });
  }

  async materializeGapSelectionCheckpoint(
    input: MaterializeGapSelectionCheckpointInput,
  ): Promise<TopicSelectionResearchCheckpointRecord> {
    this.assertTarget(input.title_card_id, input.evidence_map_ref);
    const rejectedFramings = input.rejected_framings
      ?? await this.currentGapRejectedFramings(input.title_card_id);
    const candidates = input.candidates
      .filter((candidate) => candidate.evidence_map_id === input.evidence_map_ref.ref_id)
      .sort((left, right) => left.need_candidate_id.localeCompare(right.need_candidate_id));
    const entries = candidates.map((candidate) => {
      const semanticGroupKey = this.gapSemanticGroupKey(candidate);
      const machineBlockerCodes = [
        ...(candidate.speculative ? ['SPECULATIVE_CANDIDATE'] : []),
        ...(['already_solved', 'falsified'].includes(candidate.prior_art_status) ? ['PRIOR_ART_BLOCKED'] : []),
        ...(candidate.freshness_status !== 'current' ? ['STALE_CANDIDATE'] : []),
        ...(candidate.gap_codes.includes('PSEUDO_GAP_RISK') ? ['PSEUDO_GAP_RISK'] : []),
      ];
      return {
        need_candidate_ref: this.needCandidateRef(candidate),
        candidate_need: candidate.candidate_need,
        unmet_need_statement: candidate.unmet_need_statement,
        mechanism_type: candidate.mechanism_type,
        mechanism_summary: candidate.mechanism_summary ?? null,
        mechanism_payload: candidate.mechanism_payload,
        prior_art_status: candidate.prior_art_status,
        freshness_status: candidate.freshness_status,
        gap_codes: candidate.gap_codes,
        speculative: candidate.speculative,
        semantic_group_key: semanticGroupKey,
        machine_viable: machineBlockerCodes.length === 0,
        machine_blocker_codes: machineBlockerCodes,
      };
    });
    const viableEntries = entries.filter((entry) => entry.machine_viable);
    const viableSemanticGroups = new Set(viableEntries.map((entry) => entry.semantic_group_key));
    const issueCodes = [
      ...(viableEntries.length < 2 ? ['COMPETING_CANDIDATE_REQUIRED'] : []),
      ...(viableSemanticGroups.size < 2 ? ['GENUINELY_DISTINCT_ALTERNATIVE_REQUIRED'] : []),
    ];
    const policyIssues = issueCodes.map((code) => ({
      code,
      message: code === 'COMPETING_CANDIDATE_REQUIRED'
        ? 'Return to candidate discovery and retain at least one additional academically viable candidate.'
        : 'Return to candidate discovery; wording or parameter changes do not count as a distinct alternative.',
      recommended_loopback: 'generate_need_candidate',
    }));
    const snapshotPayload = {
      evidence_map_ref: input.evidence_map_ref,
      candidate_entries: entries,
      rejected_alternatives: rejectedFramings.map((framing) => ({
        framing_id: framing.framing_id,
        reason_code: framing.reason_code,
        summary: framing.summary,
        source_draft_id: framing.source_draft_id ?? null,
        refs: framing.refs,
      })),
      policy_result: issueCodes.length === 0 ? 'eligible_for_human_review' : 'loopback_required',
      policy_issue_codes: issueCodes,
      policy_issues: policyIssues,
      distinctness_axes: ['research_object', 'mechanism', 'intervention', 'comparison', 'outcome'],
      policy_note: 'Candidate counts and semantic groups are tripwires only; human review must identify an academically viable alternative and its substantive distinctness axes.',
    };
    const targetSnapshotHash = this.hash(snapshotPayload);
    const targetRef = this.ref(
      'need_candidate_arena',
      `need_candidate_arena_${targetSnapshotHash.slice(0, 24)}`,
      input.title_card_id,
      TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION,
    );
    return this.materializeCheckpoint({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      checkpoint_kind: 'gap_selection',
      policy_version_id: input.policy_version_id ?? 'topic-selection-gap-selection@v1',
      target_ref: targetRef,
      target_snapshot_hash: targetSnapshotHash,
      source_refs: this.uniqueRefs([
        input.evidence_map_ref,
        ...candidates.map((candidate) => this.needCandidateRef(candidate)),
        ...rejectedFramings.flatMap((framing) => framing.refs),
      ]),
      allowed_actions: issueCodes.length === 0
        ? ['advance', 'loopback', 'reject', 'hold']
        : ['loopback', 'reject', 'hold'],
      required_action_refs: issueCodes.map((code) => this.requiredActionRef(input.title_card_id, targetRef, code)),
      packet_payload: snapshotPayload,
    });
  }

  async materializeQuestionContractCheckpoint(
    input: MaterializeQuestionContractCheckpointInput,
  ): Promise<TopicSelectionResearchCheckpointRecord> {
    const { contract, question, candidate, question_frame: frame, answerability_plan: plan } = input;
    const titleCardId = contract.title_card_id;
    if (question.title_card_id !== titleCardId
      || candidate.title_card_id !== titleCardId
      || frame.title_card_id !== titleCardId
      || plan.title_card_id !== titleCardId
      || question.topic_question_id !== contract.topic_question_id
      || candidate.topic_question_candidate_id !== contract.source_candidate_id
      || candidate.question_frame_id !== frame.question_frame_id
      || question.research_slice_id !== contract.source_research_slice_id
      || plan.topic_question_id !== question.topic_question_id
      || plan.topic_question_contract_id !== contract.topic_question_contract_id
      || [
        ...input.evidence_refs,
        ...input.boundary_refs,
        ...input.assumption_refs,
        ...input.falsification_conditions,
      ].some((record) => record.title_card_id !== titleCardId
        || record.topic_question_contract_id !== contract.topic_question_contract_id)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Question checkpoint inputs do not identify one contract authority.');
    }

    const contractRef = this.ref(
      'topic_question_contract',
      contract.topic_question_contract_id,
      titleCardId,
      contract.version,
    );
    const mechanismEvidence = [
      frame.intervention_or_approach,
      frame.comparison_baseline,
      contract.expected_claim,
    ].filter((value) => value.trim().length > 0);
    const confoundAndAlternativeMaterial = this.uniqueStrings([
      ...plan.dependency_risks,
      ...input.assumption_refs
        .filter((assumption) => assumption.risk_level !== 'low')
        .map((assumption) => assumption.statement),
      ...candidate.objections,
    ]);
    const activePreValueFalsification = input.falsification_conditions.filter((condition) =>
      condition.status === 'active'
      && condition.check_timing === 'before_value_assessment'
      && condition.statement.trim().length > 0
      && condition.related_contract_fields.length > 0
      && (condition.trigger_evidence_refs.length > 0 || condition.trigger_source_refs.length > 0));
    const challengeRefs = input.evidence_refs
      .filter((record) => record.evidence_role === 'challenge')
      .map((record) => record.evidence_ref);
    const boundaryViolations = input.boundary_refs.filter((record) => record.boundary_kind === 'violated');
    const issueCodes = [
      ...(contract.status !== 'active' || question.status !== 'active' ? ['QUESTION_AUTHORITY_NOT_CURRENT'] : []),
      ...(mechanismEvidence.length < 3 ? ['MECHANISM_IDENTIFIABILITY_REQUIRED'] : []),
      ...(frame.observable_outcome.trim().length === 0
        || plan.metrics.length === 0
        || candidate.observable_success_criteria.length === 0
        ? ['OPERATIONAL_PROXY_REQUIRED'] : []),
      ...(confoundAndAlternativeMaterial.length === 0 ? ['MATERIAL_CONFOUND_REVIEW_REQUIRED'] : []),
      ...(challengeRefs.length === 0 ? ['ALTERNATIVE_EXPLANATION_PRESSURE_REQUIRED'] : []),
      ...(plan.datasets_or_resources.length === 0
        || plan.baselines.length === 0
        || plan.ablations_or_comparisons.length === 0
        || plan.evaluation_setting.trim().length === 0
        ? ['FEASIBLE_EVALUATION_ROUTE_REQUIRED'] : []),
      ...(activePreValueFalsification.length === 0 ? ['FALSIFICATION_CONDITIONS_REQUIRED'] : []),
      ...(!contract.claim_ceiling.trim()
        || !contract.max_claim_strength.trim()
        || contract.prohibited_claims.length === 0
        ? ['CLAIM_CEILING_REQUIRED'] : []),
      ...(boundaryViolations.length > 0 ? ['RESEARCH_BOUNDARY_VIOLATION'] : []),
      ...(!['answerable', 'answerable_with_risk'].includes(plan.answerability_verdict)
        ? ['QUESTION_NOT_ANSWERABLE'] : []),
    ];
    const policyIssues = issueCodes.map((code) => ({
      code,
      message: this.questionPolicyIssueMessage(code),
      recommended_loopback: this.questionPolicyLoopback(code),
    }));
    const snapshotPayload = {
      topic_question_ref: this.ref('topic_question', question.topic_question_id, titleCardId),
      topic_question_contract_ref: contractRef,
      source_candidate_ref: this.ref(
        'topic_question_candidate',
        candidate.topic_question_candidate_id,
        titleCardId,
      ),
      research_slice_ref: this.ref(
        'research_slice',
        contract.source_research_slice_id,
        titleCardId,
        contract.source_research_slice_version,
      ),
      mechanism_design: {
        intervention_or_approach: frame.intervention_or_approach,
        comparison_baseline: frame.comparison_baseline,
        expected_claim: contract.expected_claim,
      },
      operationalization: {
        observable_outcome: frame.observable_outcome,
        metrics: plan.metrics,
        observable_success_criteria: candidate.observable_success_criteria,
      },
      confounds_and_alternatives: confoundAndAlternativeMaterial,
      challenge_evidence_refs: challengeRefs,
      evaluation_design: {
        datasets_or_resources: plan.datasets_or_resources,
        baselines: plan.baselines,
        ablations_or_comparisons: plan.ablations_or_comparisons,
        evaluation_setting: plan.evaluation_setting,
        open_dependencies: plan.open_dependencies,
        known_gaps: plan.known_gaps,
      },
      falsification_conditions: activePreValueFalsification.map((condition) => ({
        condition_ref: this.ref(
          'topic_question_falsification_condition',
          condition.topic_question_falsification_condition_id,
          titleCardId,
        ),
        condition_type: condition.condition_type,
        severity: condition.severity,
        statement: condition.statement,
        related_contract_fields: condition.related_contract_fields,
        expected_action: condition.expected_action,
        confidence: condition.confidence,
      })),
      claim_boundary: {
        expected_claim: contract.expected_claim,
        fallback_claim: contract.fallback_claim,
        max_claim_strength: contract.max_claim_strength,
        claim_ceiling: contract.claim_ceiling,
        prohibited_claims: contract.prohibited_claims,
      },
      boundary_violations: boundaryViolations.map((record) => ({
        boundary_ref: this.ref('topic_question_boundary_ref', record.topic_question_boundary_ref_id, titleCardId),
        note: record.note,
      })),
      answerability_verdict: plan.answerability_verdict,
      policy_result: issueCodes.length === 0 ? 'eligible_for_human_review' : 'loopback_required',
      policy_issue_codes: issueCodes,
      policy_issues: policyIssues,
      policy_note: 'Question advancement is semantic and snapshot-bound; wording changes do not resolve blocking objections.',
    };
    const targetSnapshotHash = this.hash(snapshotPayload);
    return this.materializeCheckpoint({
      workspace_id: contract.workspace_id ?? null,
      title_card_id: titleCardId,
      checkpoint_kind: 'question_contract',
      policy_version_id: input.policy_version_id ?? 'topic-selection-question-contract@v1',
      target_ref: contractRef,
      target_snapshot_hash: targetSnapshotHash,
      source_refs: this.uniqueRefs([
        ...(input.upstream_refs ?? []),
        contractRef,
        this.ref('topic_question', question.topic_question_id, titleCardId),
        this.ref('topic_question_candidate', candidate.topic_question_candidate_id, titleCardId),
        this.ref('question_frame', frame.question_frame_id, titleCardId),
        this.ref('topic_question_answerability_plan', plan.topic_question_answerability_plan_id, titleCardId),
        this.ref('research_slice', contract.source_research_slice_id, titleCardId, contract.source_research_slice_version),
        ...input.evidence_refs.map((record) => record.evidence_ref),
        ...input.assumption_refs.flatMap((record) => record.evidence_refs),
        ...input.falsification_conditions.flatMap((condition) => [
          ...condition.trigger_evidence_refs,
          ...condition.trigger_source_refs,
        ]),
      ]),
      allowed_actions: issueCodes.length === 0
        ? ['advance', 'loopback', 'reject', 'hold']
        : ['loopback', 'reject', 'hold'],
      required_action_refs: issueCodes.map((code) => this.requiredActionRef(titleCardId, contractRef, code)),
      packet_payload: snapshotPayload,
    });
  }

  async materializePromotionCheckpoint(
    input: MaterializePromotionCheckpointInput,
  ): Promise<TopicSelectionResearchCheckpointRecord> {
    this.assertHash(input.promotion_input_snapshot_hash, 'promotion_input_snapshot_hash');
    this.assertTarget(input.title_card_id, input.promotion_input_snapshot_ref);
    this.assertTarget(input.title_card_id, input.topic_question_contract_ref);
    const chain = await this.inspectPrePromotionChain(
      input.title_card_id,
      input.topic_question_contract_ref,
    );
    const acceptedRiskKeys = new Set(input.accepted_risk_refs.map((ref) => this.refKey(ref)));
    const conditionActionRefKeys = new Set(
      input.proposed_condition_actions.flatMap((action) => action.refs.map((ref) => this.refKey(ref))),
    );
    const conditionActionCodes = new Set(
      input.proposed_condition_actions.map((action) => action.action_code.trim()).filter(Boolean),
    );
    const passWithRiskFindings = input.pass_with_risk_findings.map((finding) => {
      const mappedAcceptedRiskRefs = this.uniqueRefs(finding.mapped_accepted_risk_refs ?? []);
      const acceptedRiskMapped = mappedAcceptedRiskRefs.length > 0
        && mappedAcceptedRiskRefs.every((ref) => acceptedRiskKeys.has(this.refKey(ref)));
      const requiredActionMapped = conditionActionCodes.has(finding.finding_id)
        || finding.refs.some((ref) => conditionActionRefKeys.has(this.refKey(ref)));
      return {
        ...finding,
        refs: this.uniqueRefs(finding.refs),
        mapped_accepted_risk_refs: mappedAcceptedRiskRefs,
        mapping_status: acceptedRiskMapped
          ? 'accepted_risk'
          : requiredActionMapped
            ? 'required_action'
            : 'unmapped',
      };
    });
    const criticFindings = input.critic_findings.map((finding) => {
      const mappingRefs = this.uniqueRefs(finding.mapping_refs ?? []);
      const acceptedAsRiskMapped = finding.resolution_status === 'accepted_as_risk'
        && mappingRefs.length > 0
        && mappingRefs.every((ref) => acceptedRiskKeys.has(this.refKey(ref)));
      const resolved = (finding.resolution_status === 'accepted_and_repaired' && mappingRefs.length > 0)
        || (finding.resolution_status === 'rebutted_with_refs' && mappingRefs.length > 0)
        || acceptedAsRiskMapped;
      return {
        ...finding,
        mapping_refs: mappingRefs,
        resolution_status: finding.resolution_status ?? null,
        mapping_status: resolved ? 'resolved' : 'unresolved',
      };
    });
    const issueCodes = this.uniqueStrings([
      ...(!input.gate_ready ? ['PROMOTION_GATE_NOT_READY'] : []),
      ...(chain.every((entry) => entry.advancing) ? [] : ['CHECKPOINT_CHAIN_INCOMPLETE']),
      ...(input.required_actions.length > 0 ? ['PROMOTION_REQUIRED_ACTIONS_OPEN'] : []),
      ...(passWithRiskFindings.some((finding) => finding.mapping_status === 'unmapped')
        ? ['UNMAPPED_PASS_WITH_RISK_FINDING'] : []),
      ...(criticFindings.some((finding) => finding.mapping_status === 'unresolved')
        ? ['UNRESOLVED_INDEPENDENT_CRITIC_FINDING'] : []),
    ]);
    const policyIssues = issueCodes.map((code) => ({
      code,
      message: this.promotionPolicyIssueMessage(code),
      recommended_loopback: this.promotionPolicyLoopback(code),
    }));
    const packetPayload = {
      promotion_input_snapshot_ref: input.promotion_input_snapshot_ref,
      topic_question_contract_ref: input.topic_question_contract_ref,
      checkpoint_chain: chain,
      accepted_risk_refs: this.uniqueRefs(input.accepted_risk_refs),
      required_actions: input.required_actions.map((action) => ({
        action_code: action.action_code,
        refs: this.uniqueRefs(action.refs),
      })),
      proposed_condition_actions: input.proposed_condition_actions.map((action) => ({
        action_code: action.action_code,
        refs: this.uniqueRefs(action.refs),
      })),
      pass_with_risk_findings: passWithRiskFindings,
      independent_critic_findings: criticFindings,
      policy_result: issueCodes.length === 0 ? 'eligible_for_human_review' : 'loopback_required',
      policy_issue_codes: issueCodes,
      policy_issues: policyIssues,
      policy_note: 'Promotion requires a current native checkpoint chain and explicit risk or action ownership; scores and narrative warnings cannot silently advance.',
    };
    const requiredActionRefs = this.uniqueRefs([
      ...input.required_actions.map((action) => this.requiredActionRef(
        input.title_card_id,
        input.promotion_input_snapshot_ref,
        action.action_code,
      )),
      ...issueCodes.map((code) => this.requiredActionRef(
        input.title_card_id,
        input.promotion_input_snapshot_ref,
        code,
      )),
    ]);
    return this.materializeCheckpoint({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      checkpoint_kind: 'promotion',
      policy_version_id: input.policy_version_id ?? 'topic-selection-promotion@v1',
      target_ref: input.promotion_input_snapshot_ref,
      target_snapshot_hash: input.promotion_input_snapshot_hash,
      source_refs: this.uniqueRefs([
        ...(input.source_refs ?? []),
        input.topic_question_contract_ref,
        ...input.accepted_risk_refs,
        ...input.required_actions.flatMap((action) => action.refs),
        ...input.proposed_condition_actions.flatMap((action) => action.refs),
        ...input.pass_with_risk_findings.flatMap((finding) => [
          ...finding.refs,
          ...(finding.mapped_accepted_risk_refs ?? []),
        ]),
        ...input.critic_findings.flatMap((finding) => finding.mapping_refs ?? []),
      ]),
      allowed_actions: issueCodes.length === 0
        ? ['advance', 'loopback', 'reject', 'hold']
        : ['loopback', 'reject', 'hold'],
      required_action_refs: requiredActionRefs,
      packet_payload: packetPayload,
    });
  }

  async assertCompleteCheckpointChain(
    input: AssertCompleteResearchCheckpointChainInput,
  ): Promise<TopicSelectionResearchCheckpointRecord[]> {
    const checkpoints: TopicSelectionResearchCheckpointRecord[] = [];
    for (const checkpointKind of TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS) {
      const checkpoint = await this.assertTransitionAllowed({
        title_card_id: input.title_card_id,
        checkpoint_kind: checkpointKind,
        ...(checkpointKind === 'promotion'
          ? {
              target_ref: input.promotion_input_snapshot_ref,
              target_snapshot_hash: input.promotion_input_snapshot_hash,
            }
          : {}),
      });
      if (checkpoint.provenance_class !== 'native') {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          `Current ${checkpointKind} checkpoint is backfilled provenance and requires native review.`,
        );
      }
      checkpoints.push(checkpoint);
    }
    return checkpoints;
  }

  async listCheckpoints(titleCardId: string): Promise<TopicSelectionResearchCheckpointRecord[]> {
    return this.repository.listCheckpointsByTitleCardId(titleCardId);
  }

  async getCheckpoint(checkpointId: string): Promise<TopicSelectionResearchCheckpointRecord> {
    const record = await this.repository.findCheckpointById(checkpointId);
    if (!record) throw new AppError(404, 'NOT_FOUND', `ResearchCheckpoint ${checkpointId} not found.`);
    return record;
  }

  async getPacket(checkpointId: string): Promise<TopicSelectionResearchCheckpointPacket> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    const [decision, objections, inputSnapshot] = await Promise.all([
      this.repository.findDecisionByCheckpointId(checkpointId),
      this.listOpenObjectionsForTitleCard(checkpoint.title_card_id),
      this.controlPlane.getInputSnapshot(checkpoint.input_snapshot_id),
    ]);
    if (!inputSnapshot) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint input snapshot is missing.');
    }
    if (this.hash(inputSnapshot.payload) !== checkpoint.packet_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint packet hash no longer matches its input snapshot.');
    }
    const packetPayload = inputSnapshot.payload.packet_payload;
    if (!packetPayload || typeof packetPayload !== 'object' || Array.isArray(packetPayload)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint packet payload is invalid.');
    }
    return {
      research_checkpoint_id: checkpoint.research_checkpoint_id,
      checkpoint_kind: checkpoint.checkpoint_kind,
      title_card_id: checkpoint.title_card_id,
      contract_version: checkpoint.contract_version,
      target_ref: checkpoint.target_ref,
      target_snapshot_hash: checkpoint.target_snapshot_hash,
      source_refs: checkpoint.source_refs,
      allowed_actions: this.blockingObjectionsForCheckpoint(objections, checkpoint.checkpoint_kind).length > 0
        ? checkpoint.allowed_actions.filter((action) => action !== 'advance')
        : checkpoint.allowed_actions,
      required_action_refs: checkpoint.required_action_refs,
      packet_payload: packetPayload as Record<string, unknown>,
      open_objections: objections,
      decision,
      packet_hash: checkpoint.packet_hash,
    };
  }

  async recordDecision(
    checkpointId: string,
    input: TopicSelectionResearchCheckpointDecisionInput,
  ): Promise<TopicSelectionResearchCheckpointDecisionRecord> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    const replay = await this.repository.findDecisionByKey(input.decision_key);
    if (replay) {
      this.assertReplayMatches(replay, checkpointId, input);
      return replay;
    }
    this.assertCurrentPending(checkpoint);
    this.assertStrictHuman(input.actor);
    this.assertHash(input.confirmed_snapshot_hash, 'confirmed_snapshot_hash');
    if (input.confirmed_snapshot_hash !== checkpoint.target_snapshot_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint decision snapshot is stale.');
    }
    if (!checkpoint.allowed_actions.includes(input.decision)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `Decision ${input.decision} is not allowed by this checkpoint.`);
    }
    if (checkpoint.checkpoint_kind !== 'evidence_landscape'
      && checkpoint.checkpoint_kind !== 'question_contract') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `Checkpoint ${checkpoint.checkpoint_kind} must use its stage-specific human decision authority.`,
      );
    }
    this.assertReviewPayload(checkpoint.checkpoint_kind, input);
    if (input.decision === 'advance') {
      const objections = await this.listOpenObjectionsForTitleCard(checkpoint.title_card_id);
      if (this.blockingObjectionsForCheckpoint(objections, checkpoint.checkpoint_kind).length > 0) {
        throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Research checkpoint has an unresolved blocking human objection.');
      }
    }
    const requiredActionRefs = this.uniqueRefs(input.required_action_refs ?? []);
    const loopbackRefs = this.uniqueRefs(input.loopback_refs ?? []);
    if (input.decision === 'advance' && requiredActionRefs.length > 0) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'An advancing checkpoint decision cannot leave required actions open.');
    }
    if (input.decision === 'loopback' && !input.loopback_target) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'A loopback decision requires loopback_target.');
    }
    if (input.decision !== 'loopback' && input.loopback_target) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Only a loopback decision can name loopback_target.');
    }
    const now = this.now();
    const decisionId = this.idFactory('research_checkpoint_decision');
    const humanDecisionId = this.idFactory('human_decision');
    const decisionKind = checkpoint.checkpoint_kind === 'evidence_landscape'
      ? 'evidence_landscape_confirmation'
      : 'topic_question_confirmation';
    const decision: TopicSelectionResearchCheckpointDecisionRecord = {
      research_checkpoint_decision_id: decisionId,
      decision_key: input.decision_key,
      research_checkpoint_id: checkpoint.research_checkpoint_id,
      human_confirmed_decision_id: humanDecisionId,
      workspace_id: checkpoint.workspace_id ?? null,
      title_card_id: checkpoint.title_card_id,
      checkpoint_kind: checkpoint.checkpoint_kind,
      decision_kind: decisionKind,
      decision: input.decision,
      actor: input.actor,
      confirmed_snapshot_hash: input.confirmed_snapshot_hash,
      rationale: input.rationale,
      review_payload: input.review_payload,
      required_action_refs: requiredActionRefs,
      loopback_target: input.loopback_target ?? null,
      loopback_refs: loopbackRefs,
      created_at: now,
    };
    const decisionRef = this.ref('research_checkpoint_decision', decisionId, checkpoint.title_card_id);
    const humanDecision: TopicSelectionHumanConfirmedDecisionRecord = {
      human_confirmed_decision_id: humanDecisionId,
      workspace_id: checkpoint.workspace_id ?? null,
      title_card_id: checkpoint.title_card_id,
      target_ref: this.ref('research_checkpoint', checkpoint.research_checkpoint_id, checkpoint.title_card_id),
      decision_type: this.humanDecisionType(input.decision),
      actor: input.actor,
      rationale: input.rationale,
      artifact_refs: [],
      policy_version_id: checkpoint.policy_version_id ?? null,
      resulting_authority_refs: [decisionRef],
      created_at: now,
    };
    const decidedCheckpoint: TopicSelectionResearchCheckpointRecord = {
      ...checkpoint,
      status: 'decided',
      decision_authority_ref: decisionRef,
      required_action_refs: requiredActionRefs,
      updated_at: now,
      decided_at: now,
    };
    try {
      const persisted = await this.repository.createDecision({
        checkpoint: decidedCheckpoint,
        decision,
        human_confirmed_decision: humanDecision,
      });
      this.assertReplayMatches(persisted, checkpointId, input);
      return persisted;
    } catch (error) {
      if (error instanceof TopicSelectionResearchCheckpointCurrentConflictError) {
        throw new AppError(409, 'VERSION_CONFLICT', error.message);
      }
      throw error;
    }
  }

  async assertGapSelectionConfirmation(input: {
    title_card_id: string;
    selected_candidate: TopicSelectionNeedCandidateRecord;
    review: TopicSelectionGapSelectionReview;
  }): Promise<TopicSelectionResearchCheckpointRecord> {
    const checkpoint = await this.getCheckpoint(input.review.research_checkpoint_id);
    this.assertCurrent(checkpoint);
    if (checkpoint.status !== 'pending' && checkpoint.status !== 'decided') {
      throw new AppError(409, 'VERSION_CONFLICT', 'Gap selection checkpoint is no longer reviewable.');
    }
    if (checkpoint.checkpoint_kind !== 'gap_selection' || checkpoint.title_card_id !== input.title_card_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Gap selection review does not identify the current title-card checkpoint.');
    }
    if (input.review.confirmed_candidate_pool_hash !== checkpoint.target_snapshot_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Gap selection candidate-pool snapshot is stale.');
    }
    if (!checkpoint.allowed_actions.includes('advance') || checkpoint.required_action_refs.length > 0) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Gap selection arena is not eligible for human advancement.');
    }
    if (!input.review.direct_prior_art_pressure_reviewed || !input.review.disconfirming_evidence_reviewed) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Gap selection must review direct prior-art pressure and disconfirming evidence.');
    }
    const selectedCandidateRef = this.needCandidateRef(input.selected_candidate);
    if (!this.refsEqual(input.review.selected_candidate_ref, selectedCandidateRef)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Gap selection chose a different NeedCandidate than HumanConfirmNeed.');
    }
    const packet = await this.getPacket(checkpoint.research_checkpoint_id);
    const candidateEntries = this.gapCandidateEntries(packet.packet_payload);
    const entryById = new Map(candidateEntries.map((entry) => [entry.need_candidate_ref.ref_id, entry]));
    if (!entryById.has(input.selected_candidate.need_candidate_id)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Selected NeedCandidate is absent from the reviewed candidate arena.');
    }
    const reviewById = new Map<string, TopicSelectionGapSelectionReview['candidate_reviews'][number]>();
    for (const candidateReview of input.review.candidate_reviews) {
      const candidateId = candidateReview.need_candidate_ref.ref_id;
      if (reviewById.has(candidateId)) {
        throw new AppError(400, 'INVALID_PAYLOAD', `Gap selection contains duplicate review for ${candidateId}.`);
      }
      const packetEntry = entryById.get(candidateId);
      if (!packetEntry) {
        throw new AppError(409, 'VERSION_CONFLICT', `Gap selection review candidate ${candidateId} is outside the frozen arena.`);
      }
      if (!this.refsEqual(candidateReview.need_candidate_ref, packetEntry.need_candidate_ref)) {
        throw new AppError(409, 'VERSION_CONFLICT', `Gap selection review candidate ${candidateId} uses a stale version.`);
      }
      if (!candidateReview.rationale.trim()) {
        throw new AppError(400, 'INVALID_PAYLOAD', `Gap selection review candidate ${candidateId} requires rationale.`);
      }
      if (candidateReview.disposition === 'rejected' && !candidateReview.rejection_reason?.trim()) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `Rejected candidate ${candidateId} requires an explicit rejection reason.`);
      }
      reviewById.set(candidateId, candidateReview);
    }
    if (reviewById.size !== entryById.size) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Gap selection must preserve a disposition for every candidate in the frozen arena.');
    }
    const selectedReviews = [...reviewById.values()].filter((review) => review.disposition === 'selected');
    if (selectedReviews.length !== 1 || selectedReviews[0]?.need_candidate_ref.ref_id !== input.selected_candidate.need_candidate_id) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Gap selection requires exactly one selected candidate matching HumanConfirmNeed.');
    }
    const selectedEntry = entryById.get(input.selected_candidate.need_candidate_id);
    if (!selectedEntry) throw new AppError(409, 'VERSION_CONFLICT', 'Selected candidate arena entry is missing.');
    if (!selectedEntry.machine_viable) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Selected NeedCandidate is not machine-eligible for gap confirmation.');
    }
    const viableAlternative = [...reviewById.values()].find((review) => {
      if (review.disposition !== 'viable_alternative' || review.distinct_from_selected_axes.length === 0) return false;
      const entry = entryById.get(review.need_candidate_ref.ref_id);
      return entry?.machine_viable === true && entry.semantic_group_key !== selectedEntry.semantic_group_key;
    });
    if (!viableAlternative) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'Gap selection requires an academically viable alternative with substantive distinctness from the selected candidate.',
      );
    }
    const objections = await this.listOpenObjectionsForTitleCard(checkpoint.title_card_id);
    if (this.blockingObjectionsForCheckpoint(objections, checkpoint.checkpoint_kind).length > 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Gap selection checkpoint has open blocking objections.');
    }
    return checkpoint;
  }

  async adaptExistingStageDecision(
    checkpointId: string,
    input: AdaptExistingResearchDecisionInput,
  ): Promise<TopicSelectionResearchCheckpointRecord> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    if (checkpoint.checkpoint_kind !== 'gap_selection' && checkpoint.checkpoint_kind !== 'promotion') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Only gap and promotion checkpoints reuse an existing stage authority.');
    }
    const expectedAuthorityType = checkpoint.checkpoint_kind === 'gap_selection'
      ? 'human_confirmed_decision'
      : 'human_promotion_decision';
    if (input.decision_authority_ref.ref_type !== expectedAuthorityType) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `${checkpoint.checkpoint_kind} checkpoint requires ${expectedAuthorityType} authority.`,
      );
    }
    this.assertTarget(checkpoint.title_card_id, input.decision_authority_ref);
    this.assertHash(input.confirmed_snapshot_hash, 'confirmed_snapshot_hash');
    if (input.confirmed_snapshot_hash !== checkpoint.target_snapshot_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Stage decision snapshot is stale.');
    }
    if (checkpoint.status === 'decided' && checkpoint.decision_authority_ref
      && this.refsEqual(checkpoint.decision_authority_ref, input.decision_authority_ref)) {
      return checkpoint;
    }
    this.assertCurrentPending(checkpoint);
    const advances = input.advances ?? true;
    if (advances) {
      if (!checkpoint.allowed_actions.includes('advance') || checkpoint.required_action_refs.length > 0) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Checkpoint is not eligible for advancement.');
      }
      const objections = await this.listOpenObjectionsForTitleCard(checkpoint.title_card_id);
      if (this.blockingObjectionsForCheckpoint(objections, checkpoint.checkpoint_kind).length > 0) {
        throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Checkpoint has open blocking objections.');
      }
    } else if (checkpoint.checkpoint_kind !== 'promotion') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Only promotion authority can adapt a non-advancing stage decision.');
    } else if (checkpoint.required_action_refs.length === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'A non-advancing promotion decision requires a product-owned required action or loopback reason.',
      );
    }
    const now = this.now();
    const decidedCheckpoint: TopicSelectionResearchCheckpointRecord = {
      ...checkpoint,
      status: 'decided',
      decision_authority_ref: input.decision_authority_ref,
      required_action_refs: advances ? [] : checkpoint.required_action_refs,
      updated_at: now,
      decided_at: now,
    };
    try {
      return await this.repository.advanceWithExistingAuthority(decidedCheckpoint);
    } catch (error) {
      if (error instanceof TopicSelectionResearchCheckpointCurrentConflictError) {
        const current = await this.repository.findCheckpointById(checkpointId);
        if (current?.status === 'decided' && current.decision_authority_ref
          && this.refsEqual(current.decision_authority_ref, input.decision_authority_ref)) {
          return current;
        }
        throw new AppError(409, 'VERSION_CONFLICT', error.message);
      }
      throw error;
    }
  }

  async recordObjection(
    checkpointId: string,
    input: TopicSelectionResearchObjectionInput,
  ): Promise<TopicSelectionResearchObjectionRecord> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    const replay = await this.repository.findObjectionByKey(input.objection_key);
    if (replay) {
      if (this.hash(this.objectionReplayPayload(replay)) !== this.hash(this.objectionInputPayload(checkpoint, input))) {
        throw new AppError(409, 'VERSION_CONFLICT', 'objection_key already identifies different objection content.');
      }
      return replay;
    }
    this.assertCurrent(checkpoint);
    this.assertStrictHuman(input.actor);
    if (input.confirmed_snapshot_hash !== checkpoint.target_snapshot_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Research objection snapshot is stale.');
    }
    if (BLOCKING_OBJECTION_SEVERITIES.has(input.severity)
      && !Object.hasOwn(OBJECTION_LOOPBACK_REF_TYPES, input.required_loopback ?? '')) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'Blocking objections require an explicit evidence_landscape, gap_selection, research_slice, or question_contract loopback.',
      );
    }
    const record: TopicSelectionResearchObjectionRecord = {
      research_objection_id: this.idFactory('research_objection'),
      objection_key: input.objection_key,
      workspace_id: checkpoint.workspace_id ?? null,
      title_card_id: checkpoint.title_card_id,
      research_checkpoint_id: checkpoint.research_checkpoint_id,
      checkpoint_kind: checkpoint.checkpoint_kind,
      target_ref: checkpoint.target_ref,
      target_snapshot_hash: checkpoint.target_snapshot_hash,
      severity: input.severity,
      summary: input.summary,
      rationale: input.rationale,
      required_loopback: input.required_loopback ?? null,
      source_refs: this.uniqueRefs([
        checkpoint.target_ref,
        ...checkpoint.source_refs,
        ...(input.source_refs ?? []),
      ]),
      actor: input.actor,
      created_at: this.now(),
    };
    const persisted = await this.repository.createObjection(record);
    this.assertObjectionReplayMatches(persisted, checkpoint, input);
    return persisted;
  }

  async resolveObjection(
    objectionId: string,
    input: TopicSelectionResearchObjectionResolutionInput,
  ): Promise<TopicSelectionResearchObjectionResolutionRecord> {
    const objection = await this.repository.findObjectionById(objectionId);
    if (!objection) throw new AppError(404, 'NOT_FOUND', `ResearchObjection ${objectionId} not found.`);
    const replay = await this.repository.findObjectionResolutionByKey(input.resolution_key);
    if (replay) {
      if (this.hash(this.resolutionReplayPayload(replay))
        !== this.hash(this.resolutionInputPayload(objectionId, input))) {
        throw new AppError(409, 'VERSION_CONFLICT', 'resolution_key already identifies different resolution content.');
      }
      return replay;
    }
    const existing = await this.repository.findObjectionResolutionByObjectionId(objectionId);
    if (existing) throw new AppError(409, 'VERSION_CONFLICT', 'ResearchObjection is already resolved.');
    this.assertStrictHuman(input.actor);
    this.assertHash(input.resolved_snapshot_hash, 'resolved_snapshot_hash');
    if (input.output_refs.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'ResearchObjection resolution requires at least one output_ref.');
    }
    const currentCheckpoint = await this.repository.findCurrentCheckpoint(
      objection.title_card_id,
      objection.checkpoint_kind,
    );
    if (!currentCheckpoint) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ResearchObjection resolution requires a current affected checkpoint.');
    }
    if (input.resolved_snapshot_hash !== currentCheckpoint.target_snapshot_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchObjection resolution is not bound to the current checkpoint snapshot.');
    }
    const outputRefs = this.uniqueRefs(input.output_refs);
    if (!outputRefs.some((ref) => this.refsEqual(ref, currentCheckpoint.target_ref))) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'ResearchObjection resolution must name the current checkpoint target authority.');
    }
    const revisionResolution = input.resolution_type !== 'resolved_with_evidence'
      || BLOCKING_OBJECTION_SEVERITIES.has(objection.severity);
    if (revisionResolution && currentCheckpoint.target_snapshot_hash === objection.target_snapshot_hash) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'A blocking or revision resolution requires a genuinely revised checkpoint snapshot.');
    }
    if (objection.required_loopback
      && Object.hasOwn(OBJECTION_LOOPBACK_REF_TYPES, objection.required_loopback)) {
      const requiredRefType = OBJECTION_LOOPBACK_REF_TYPES[
        objection.required_loopback as keyof typeof OBJECTION_LOOPBACK_REF_TYPES
      ];
      const previousRefs = objection.source_refs.filter((ref) => ref.ref_type === requiredRefType);
      const currentRefs = [currentCheckpoint.target_ref, ...currentCheckpoint.source_refs]
        .filter((ref) => ref.ref_type === requiredRefType);
      const revisedRef = currentRefs.find((ref) => !previousRefs.some((previous) => this.refsEqual(previous, ref)));
      if (!revisedRef || !outputRefs.some((ref) => this.refsEqual(ref, revisedRef))) {
        throw new AppError(
          422,
          'GATE_CONSTRAINT_FAILED',
          `ResearchObjection resolution requires a revised ${requiredRefType} authority from the requested loopback.`,
        );
      }
    }
    if (BLOCKING_OBJECTION_SEVERITIES.has(objection.severity)) {
      const currentEvidenceRefs = currentCheckpoint.source_refs
        .filter((ref) => OBJECTION_EVIDENCE_REF_TYPES.has(ref.ref_type));
      if (currentEvidenceRefs.length === 0
        || !outputRefs.some((ref) => currentEvidenceRefs.some((evidenceRef) => this.refsEqual(ref, evidenceRef)))) {
        throw new AppError(
          422,
          'GATE_CONSTRAINT_FAILED',
          'Blocking objection resolution must cite current evidence or validated-need authority.',
        );
      }
    }
    const persisted = await this.repository.createObjectionResolution({
      research_objection_resolution_id: this.idFactory('research_objection_resolution'),
      resolution_key: input.resolution_key,
      research_objection_id: objection.research_objection_id,
      workspace_id: objection.workspace_id ?? null,
      title_card_id: objection.title_card_id,
      resolution_type: input.resolution_type,
      actor: input.actor,
      resolved_snapshot_hash: input.resolved_snapshot_hash,
      rationale: input.rationale,
      output_refs: outputRefs,
      created_at: this.now(),
    });
    this.assertResolutionReplayMatches(persisted, objectionId, input);
    return persisted;
  }

  async assertTransitionAllowed(
    input: AssertResearchTransitionInput,
  ): Promise<TopicSelectionResearchCheckpointRecord> {
    const checkpoint = await this.repository.findCurrentCheckpoint(input.title_card_id, input.checkpoint_kind);
    if (!checkpoint) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `Current ${input.checkpoint_kind} checkpoint is required.`);
    }
    if (input.target_ref && !this.refsEqual(input.target_ref, checkpoint.target_ref)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint target authority is stale.');
    }
    if (input.target_snapshot_hash && input.target_snapshot_hash !== checkpoint.target_snapshot_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint target snapshot is stale.');
    }
    if (checkpoint.status !== 'decided' || !checkpoint.decision_authority_ref) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `Current ${input.checkpoint_kind} checkpoint has not advanced.`);
    }
    const localDecision = await this.repository.findDecisionByCheckpointId(checkpoint.research_checkpoint_id);
    if (localDecision && localDecision.decision !== 'advance') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `Current ${input.checkpoint_kind} checkpoint decision is ${localDecision.decision}.`);
    }
    if (checkpoint.required_action_refs.length > 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `Current ${input.checkpoint_kind} checkpoint has unresolved required actions.`);
    }
    const objections = await this.listOpenObjectionsForTitleCard(checkpoint.title_card_id);
    if (this.blockingObjectionsForCheckpoint(objections, checkpoint.checkpoint_kind).length > 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `Current ${input.checkpoint_kind} checkpoint has open blocking objections.`);
    }
    return checkpoint;
  }

  async getResearchStatus(titleCardId: string): Promise<TopicSelectionResearchStatusProjection> {
    const allRecords = await this.repository.listCheckpointsByTitleCardId(titleCardId);
    const currentByKind = new Map(
      allRecords
        .filter((record) => record.current_checkpoint_key !== null)
        .map((record) => [record.checkpoint_kind, record]),
    );
    const checkpointChain = TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS
      .map((kind) => currentByKind.get(kind))
      .filter((record): record is TopicSelectionResearchCheckpointRecord => Boolean(record));
    const packetByKind = new Map(
      await Promise.all(checkpointChain.map(async (checkpoint) => [
        checkpoint.checkpoint_kind,
        await this.getPacket(checkpoint.research_checkpoint_id),
      ] as const)),
    );
    let currentCheckpoint: TopicSelectionResearchCheckpointRecord | null = null;
    let currentPacket: TopicSelectionResearchCheckpointPacket | null = null;
    let requiredCheckpointKind: TopicSelectionResearchCheckpointKind | null = 'evidence_landscape';
    let nextAuthorizedTransition: string | null = null;
    const openBlockingObjectionCount = (await this.listOpenObjectionsForTitleCard(titleCardId))
      .filter((objection) => BLOCKING_OBJECTION_SEVERITIES.has(objection.severity)).length;
    for (const kind of TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS) {
      requiredCheckpointKind = kind;
      const checkpoint = currentByKind.get(kind);
      if (!checkpoint) break;
      const packet = packetByKind.get(kind);
      if (!packet) throw new AppError(409, 'VERSION_CONFLICT', `Current ${kind} packet is missing.`);
      const advancing = checkpoint.status === 'decided'
        && Boolean(checkpoint.decision_authority_ref)
        && checkpoint.required_action_refs.length === 0
        && this.blockingObjectionsForCheckpoint(packet.open_objections, kind).length === 0
        && (!packet.decision || packet.decision.decision === 'advance');
      if (!advancing) {
        currentCheckpoint = checkpoint;
        currentPacket = packet;
        break;
      }
      nextAuthorizedTransition = TOPIC_SELECTION_RESEARCH_TRANSITIONS_BY_CHECKPOINT[kind];
      const nextIndex = TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS.indexOf(kind) + 1;
      requiredCheckpointKind = TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS[nextIndex] ?? null;
    }
    return {
      title_card_id: titleCardId,
      contract_version: TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION,
      checkpoint_chain: checkpointChain,
      current_checkpoint: currentCheckpoint,
      current_packet: currentPacket,
      required_checkpoint_kind: requiredCheckpointKind,
      next_authorized_transition: nextAuthorizedTransition,
      open_blocking_objection_count: openBlockingObjectionCount,
      legacy_provenance: checkpointChain.length === 0
        || checkpointChain.some((checkpoint) => checkpoint.provenance_class === 'backfilled'),
    };
  }

  private async listOpenObjectionsForTitleCard(
    titleCardId: string,
  ): Promise<TopicSelectionResearchObjectionRecord[]> {
    const objections = await this.repository.listObjectionsByTitleCardId(titleCardId);
    const open: TopicSelectionResearchObjectionRecord[] = [];
    for (const objection of objections) {
      const resolution = await this.repository.findObjectionResolutionByObjectionId(objection.research_objection_id);
      if (!resolution) open.push(objection);
    }
    return open;
  }

  private async inspectPrePromotionChain(
    titleCardId: string,
    topicQuestionContractRef: TopicSelectionFunctionalRef,
  ): Promise<Array<{
    checkpoint_kind: 'evidence_landscape' | 'gap_selection' | 'question_contract';
    checkpoint_ref: TopicSelectionFunctionalRef | null;
    target_ref: TopicSelectionFunctionalRef | null;
    provenance_class: TopicSelectionResearchCheckpointRecord['provenance_class'] | null;
    advancing: boolean;
    issue_codes: string[];
  }>> {
    const objections = await this.listOpenObjectionsForTitleCard(titleCardId);
    const kinds = TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS.slice(0, 3) as Array<
      'evidence_landscape' | 'gap_selection' | 'question_contract'
    >;
    const entries = [];
    for (const kind of kinds) {
      const checkpoint = await this.repository.findCurrentCheckpoint(titleCardId, kind);
      if (!checkpoint) {
        entries.push({
          checkpoint_kind: kind,
          checkpoint_ref: null,
          target_ref: null,
          provenance_class: null,
          advancing: false,
          issue_codes: ['CHECKPOINT_MISSING'],
        });
        continue;
      }
      const localDecision = await this.repository.findDecisionByCheckpointId(checkpoint.research_checkpoint_id);
      const issueCodes = this.uniqueStrings([
        ...(checkpoint.provenance_class !== 'native' ? ['NATIVE_REVIEW_REQUIRED'] : []),
        ...(checkpoint.status !== 'decided' || !checkpoint.decision_authority_ref
          ? ['CHECKPOINT_NOT_ADVANCED'] : []),
        ...(localDecision && localDecision.decision !== 'advance' ? ['CHECKPOINT_DECISION_NOT_ADVANCE'] : []),
        ...(checkpoint.required_action_refs.length > 0 ? ['CHECKPOINT_REQUIRED_ACTIONS_OPEN'] : []),
        ...(this.blockingObjectionsForCheckpoint(objections, kind).length > 0
          ? ['CHECKPOINT_BLOCKING_OBJECTION_OPEN'] : []),
        ...(kind === 'question_contract' && !this.refsEqual(checkpoint.target_ref, topicQuestionContractRef)
          ? ['QUESTION_CHECKPOINT_TARGET_STALE'] : []),
      ]);
      entries.push({
        checkpoint_kind: kind,
        checkpoint_ref: this.ref('research_checkpoint', checkpoint.research_checkpoint_id, titleCardId),
        target_ref: checkpoint.target_ref,
        provenance_class: checkpoint.provenance_class,
        advancing: issueCodes.length === 0,
        issue_codes: issueCodes,
      });
    }
    return entries;
  }

  private blockingObjectionsForCheckpoint(
    objections: TopicSelectionResearchObjectionRecord[],
    checkpointKind: TopicSelectionResearchCheckpointKind,
  ): TopicSelectionResearchObjectionRecord[] {
    const checkpointIndex = TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS.indexOf(checkpointKind);
    return objections.filter((objection) =>
      BLOCKING_OBJECTION_SEVERITIES.has(objection.severity)
      && checkpointIndex >= TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS.indexOf(objection.checkpoint_kind));
  }

  private assertCurrent(checkpoint: TopicSelectionResearchCheckpointRecord): void {
    if (!checkpoint.current_checkpoint_key || checkpoint.status === 'superseded') {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint is not current.');
    }
  }

  private assertCurrentPending(checkpoint: TopicSelectionResearchCheckpointRecord): void {
    this.assertCurrent(checkpoint);
    if (checkpoint.status !== 'pending') {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint already has a decision.');
    }
  }

  private assertReviewPayload(
    checkpointKind: TopicSelectionResearchCheckpointKind,
    input: TopicSelectionResearchCheckpointDecisionInput,
  ): void {
    if (checkpointKind !== input.review_payload.review_kind) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Review payload does not match checkpoint kind.');
    }
    if (input.decision !== 'advance') return;
    const payload = input.review_payload;
    const complete = payload.review_kind === 'evidence_landscape'
      ? payload.nearest_work_reviewed
        && payload.disconfirming_evidence_reviewed
        && payload.source_quality_reviewed
      : payload.mechanism_identifiable
        && payload.proxy_operationalized
        && payload.confounds_reviewed
        && payload.falsification_reviewed
        && payload.claim_ceiling_reviewed;
    if (!complete) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'An advancing decision requires every semantic review check to pass.');
    }
  }

  private assertReplayMatches(
    replay: TopicSelectionResearchCheckpointDecisionRecord,
    checkpointId: string,
    input: TopicSelectionResearchCheckpointDecisionInput,
  ): void {
    if (replay.research_checkpoint_id !== checkpointId) {
      throw new AppError(409, 'VERSION_CONFLICT', 'decision_key already identifies a different checkpoint.');
    }
    const existingPayload = {
      actor: replay.actor,
      confirmed_snapshot_hash: replay.confirmed_snapshot_hash,
      decision: replay.decision,
      decision_key: replay.decision_key,
      loopback_refs: replay.loopback_refs,
      loopback_target: replay.loopback_target ?? null,
      rationale: replay.rationale,
      required_action_refs: replay.required_action_refs,
      review_payload: replay.review_payload,
    };
    const requestedPayload = {
      actor: input.actor,
      confirmed_snapshot_hash: input.confirmed_snapshot_hash,
      decision: input.decision,
      decision_key: input.decision_key,
      loopback_refs: this.uniqueRefs(input.loopback_refs ?? []),
      loopback_target: input.loopback_target ?? null,
      rationale: input.rationale,
      required_action_refs: this.uniqueRefs(input.required_action_refs ?? []),
      review_payload: input.review_payload,
    };
    if (this.hash(existingPayload) !== this.hash(requestedPayload)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'decision_key already identifies different decision content.');
    }
  }

  private assertObjectionReplayMatches(
    replay: TopicSelectionResearchObjectionRecord,
    checkpoint: TopicSelectionResearchCheckpointRecord,
    input: TopicSelectionResearchObjectionInput,
  ): void {
    if (this.hash(this.objectionReplayPayload(replay))
      !== this.hash(this.objectionInputPayload(checkpoint, input))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'objection_key already identifies different objection content.');
    }
  }

  private assertResolutionReplayMatches(
    replay: TopicSelectionResearchObjectionResolutionRecord,
    objectionId: string,
    input: TopicSelectionResearchObjectionResolutionInput,
  ): void {
    if (this.hash(this.resolutionReplayPayload(replay))
      !== this.hash(this.resolutionInputPayload(objectionId, input))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'resolution_key already identifies different resolution content.');
    }
  }

  private objectionReplayPayload(record: TopicSelectionResearchObjectionRecord): Record<string, unknown> {
    return {
      actor: record.actor,
      confirmed_snapshot_hash: record.target_snapshot_hash,
      objection_key: record.objection_key,
      rationale: record.rationale,
      required_loopback: record.required_loopback ?? null,
      severity: record.severity,
      source_refs: record.source_refs,
      summary: record.summary,
      checkpoint_id: record.research_checkpoint_id,
    };
  }

  private objectionInputPayload(
    checkpoint: TopicSelectionResearchCheckpointRecord,
    input: TopicSelectionResearchObjectionInput,
  ): Record<string, unknown> {
    return {
      actor: input.actor,
      confirmed_snapshot_hash: input.confirmed_snapshot_hash,
      objection_key: input.objection_key,
      rationale: input.rationale,
      required_loopback: input.required_loopback ?? null,
      severity: input.severity,
      source_refs: this.uniqueRefs([
        checkpoint.target_ref,
        ...checkpoint.source_refs,
        ...(input.source_refs ?? []),
      ]),
      summary: input.summary,
      checkpoint_id: checkpoint.research_checkpoint_id,
    };
  }

  private resolutionReplayPayload(
    record: TopicSelectionResearchObjectionResolutionRecord,
  ): Record<string, unknown> {
    return {
      actor: record.actor,
      objection_id: record.research_objection_id,
      output_refs: record.output_refs,
      rationale: record.rationale,
      resolution_key: record.resolution_key,
      resolution_type: record.resolution_type,
      resolved_snapshot_hash: record.resolved_snapshot_hash,
    };
  }

  private resolutionInputPayload(
    objectionId: string,
    input: TopicSelectionResearchObjectionResolutionInput,
  ): Record<string, unknown> {
    return {
      actor: input.actor,
      objection_id: objectionId,
      output_refs: this.uniqueRefs(input.output_refs),
      rationale: input.rationale,
      resolution_key: input.resolution_key,
      resolution_type: input.resolution_type,
      resolved_snapshot_hash: input.resolved_snapshot_hash,
    };
  }

  private humanDecisionType(
    decision: TopicSelectionResearchCheckpointAction,
  ): TopicSelectionHumanConfirmedDecisionRecord['decision_type'] {
    if (decision === 'advance') return 'confirm';
    if (decision === 'reject') return 'reject';
    return 'request_revision';
  }

  private assertStrictHuman(actor: { actor_type: 'human'; actor_id: string }): void {
    if (actor.actor_type !== 'human' || !actor.actor_id.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'ResearchCheckpoint human authority requires actor_type=human and actor_id.');
    }
  }

  private assertTarget(titleCardId: string, target: TopicSelectionFunctionalRef): void {
    if (target.title_card_id && target.title_card_id !== titleCardId) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint target belongs to another title card.');
    }
  }

  private assertHash(value: string, field: string): void {
    if (!/^[a-f0-9]{64}$/u.test(value)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${field} must be a lowercase sha256 hash.`);
    }
  }

  private currentKey(titleCardId: string, kind: TopicSelectionResearchCheckpointKind): string {
    return `${titleCardId}:${kind}`;
  }

  private refsEqual(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return left.ref_type === right.ref_type
      && left.ref_id === right.ref_id
      && (left.version_id ?? null) === (right.version_id ?? null)
      && (!left.title_card_id || !right.title_card_id || left.title_card_id === right.title_card_id);
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    return refs.filter((ref) => {
      const key = `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((left, right) => this.refKey(left).localeCompare(this.refKey(right)));
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
  }

  private evidenceUnitRef(unit: TopicSelectionEvidenceUnitRecord): TopicSelectionFunctionalRef {
    return this.ref('evidence_unit', unit.evidence_unit_id, unit.title_card_id, unit.evidence_map_version);
  }

  private needCandidateRef(candidate: TopicSelectionNeedCandidateRecord): TopicSelectionFunctionalRef {
    return this.ref('need_candidate', candidate.need_candidate_id, candidate.title_card_id, candidate.candidate_version);
  }

  private requiredActionRef(
    titleCardId: string,
    targetRef: TopicSelectionFunctionalRef,
    issueCode: string,
  ): TopicSelectionFunctionalRef {
    const id = this.hash({ issue_code: issueCode, target_ref: targetRef, title_card_id: titleCardId }).slice(0, 24);
    return this.ref('research_required_action', `research_required_action_${id}`, titleCardId);
  }

  private gapSemanticGroupKey(candidate: TopicSelectionNeedCandidateRecord): string {
    const semanticAxes = ['research_object', 'mechanism', 'intervention', 'comparison', 'outcome']
      .map((key) => [key, candidate.mechanism_payload[key] ?? null]);
    return this.hash({ mechanism_type: candidate.mechanism_type, semantic_axes: semanticAxes });
  }

  private gapCandidateEntries(packetPayload: Record<string, unknown>): GapCandidatePacketEntry[] {
    const rawEntries = packetPayload.candidate_entries;
    if (!Array.isArray(rawEntries)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Gap selection packet is missing candidate entries.');
    }
    return rawEntries.map((rawEntry) => {
      if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Gap selection packet contains an invalid candidate entry.');
      }
      const entry = rawEntry as Record<string, unknown>;
      const ref = entry.need_candidate_ref;
      if (!ref || typeof ref !== 'object' || Array.isArray(ref)) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Gap selection packet candidate ref is invalid.');
      }
      const candidateRef = ref as Record<string, unknown>;
      if (candidateRef.ref_type !== 'need_candidate' || typeof candidateRef.ref_id !== 'string'
        || typeof entry.semantic_group_key !== 'string' || typeof entry.machine_viable !== 'boolean') {
        throw new AppError(409, 'VERSION_CONFLICT', 'Gap selection packet candidate entry is incomplete.');
      }
      return {
        need_candidate_ref: ref as TopicSelectionFunctionalRef,
        semantic_group_key: entry.semantic_group_key,
        machine_viable: entry.machine_viable,
      };
    });
  }

  private questionPolicyIssueMessage(code: string): string {
    const messages: Record<string, string> = {
      QUESTION_AUTHORITY_NOT_CURRENT: 'The question and contract must both be current active authorities.',
      MECHANISM_IDENTIFIABILITY_REQUIRED: 'Name the intervention or mechanism, direct comparison, and expected causal or behavioral claim.',
      OPERATIONAL_PROXY_REQUIRED: 'Operationalize the outcome with explicit metrics and observable success criteria.',
      MATERIAL_CONFOUND_REVIEW_REQUIRED: 'Record material confounds, dependency risks, or alternative explanations before review.',
      ALTERNATIVE_EXPLANATION_PRESSURE_REQUIRED: 'Bind at least one challenge evidence source to the question design.',
      FEASIBLE_EVALUATION_ROUTE_REQUIRED: 'Specify resources, baselines, comparisons or ablations, and the evaluation setting.',
      FALSIFICATION_CONDITIONS_REQUIRED: 'Define an active pre-value falsification condition tied to contract fields.',
      CLAIM_CEILING_REQUIRED: 'Set a claim ceiling, maximum claim strength, and prohibited claims.',
      RESEARCH_BOUNDARY_VIOLATION: 'Resolve violated research-slice boundaries before question confirmation.',
      QUESTION_NOT_ANSWERABLE: 'Revise the question or slice until the answerability verdict permits evaluation.',
    };
    return messages[code] ?? `Resolve question policy issue ${code}.`;
  }

  private promotionPolicyIssueMessage(code: string): string {
    const messages: Record<string, string> = {
      PROMOTION_GATE_NOT_READY: 'Promotion gate authority must allow a promote-class human decision.',
      CHECKPOINT_CHAIN_INCOMPLETE: 'Evidence, gap, and question checkpoints must all be current, native, and advancing.',
      PROMOTION_REQUIRED_ACTIONS_OPEN: 'Promotion gate required actions must be resolved or explicitly owned as downstream conditions.',
      UNMAPPED_PASS_WITH_RISK_FINDING: 'Every advancement-relevant pass-with-risk finding needs an accepted-risk or required-action mapping.',
      UNRESOLVED_INDEPENDENT_CRITIC_FINDING: 'Every independent critic finding needs a repaired, evidence-rebutted, or accepted-risk disposition.',
    };
    return messages[code] ?? `Resolve promotion policy issue ${code}.`;
  }

  private promotionPolicyLoopback(code: string): string {
    const loopbacks: Record<string, string> = {
      PROMOTION_GATE_NOT_READY: 'promotion_gate',
      CHECKPOINT_CHAIN_INCOMPLETE: 'earliest_unsatisfied_checkpoint',
      PROMOTION_REQUIRED_ACTIONS_OPEN: 'promotion_gate',
      UNMAPPED_PASS_WITH_RISK_FINDING: 'promotion_review',
      UNRESOLVED_INDEPENDENT_CRITIC_FINDING: 'promotion_support',
    };
    return loopbacks[code] ?? 'promotion_review';
  }

  private questionPolicyLoopback(code: string): string {
    if (code === 'QUESTION_AUTHORITY_NOT_CURRENT' || code === 'RESEARCH_BOUNDARY_VIOLATION'
      || code === 'QUESTION_NOT_ANSWERABLE') return 'research_slice';
    if (code === 'ALTERNATIVE_EXPLANATION_PRESSURE_REQUIRED') return 'evidence_landscape';
    return 'question_contract';
  }

  private async currentGapRejectedFramings(
    titleCardId: string,
  ): Promise<TopicSelectionRejectedNeedCandidateFraming[]> {
    const current = await this.repository.findCurrentCheckpoint(titleCardId, 'gap_selection');
    if (!current) return [];
    const packet = await this.getPacket(current.research_checkpoint_id);
    const raw = packet.packet_payload.rejected_alternatives;
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      const record = item as Record<string, unknown>;
      if (typeof record.framing_id !== 'string' || typeof record.reason_code !== 'string'
        || typeof record.summary !== 'string' || !Array.isArray(record.refs)) return [];
      return [{
        framing_id: record.framing_id,
        reason_code: record.reason_code,
        summary: record.summary,
        source_draft_id: typeof record.source_draft_id === 'string' ? record.source_draft_id : null,
        refs: record.refs as TopicSelectionFunctionalRef[],
      }];
    });
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId: string,
    versionId?: string,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: titleCardId,
      ...(versionId ? { version_id: versionId } : {}),
    };
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }
}
