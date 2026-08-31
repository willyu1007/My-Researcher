import crypto from 'node:crypto';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionHumanConfirmedDecisionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { topicSelectionRiskFindingRefs } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceConflictSetRecord,
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  HumanConfirmationInput,
  TopicSelectionGapSelectionReview,
  TopicSelectionHumanConfirmNeedIntentInput,
  TopicSelectionHumanConfirmNeedIntentRecord,
  TopicSelectionNeedCandidateRecord,
  TopicSelectionRejectedNeedCandidateFraming,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  TOPIC_SELECTION_HUMAN_CONFIRMATION_INPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_HUMAN_CONFIRM_NEED_INTENT_SCHEMA_VERSION,
  TOPIC_SELECTION_CANDIDATE_DROP_REASON_CODES,
  TOPIC_SELECTION_CANDIDATE_PORTFOLIO_DISPOSITIONS,
  TOPIC_SELECTION_CANDIDATE_PORTFOLIO_OUTCOMES,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  TOPIC_SELECTION_RESEARCH_ARENA_DELTA_TYPES,
  TOPIC_SELECTION_RESEARCH_ARENA_SHADOW_ROLES,
  type TopicSelectionResearchArenaAdvisoryCandidateDisposition,
  type TopicSelectionResearchArenaAdvisorySynthesis,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
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
  TOPIC_SELECTION_RESEARCH_CONFIRMATION_EFFECT_CLASSES,
  TOPIC_SELECTION_RESEARCH_ARENA_ADVISORY_REVIEW_REASON_CODES,
  TOPIC_SELECTION_RESEARCH_ARENA_ADVISORY_REVIEW_HISTORY_SCHEMA_VERSION,
  TOPIC_SELECTION_RESEARCH_ARENA_ADVISORY_REVIEW_SCHEMA_VERSION,
  TOPIC_SELECTION_RESEARCH_ROUTINE_EFFECT_CLASSES,
  TOPIC_SELECTION_RESEARCH_TRANSITIONS_BY_CHECKPOINT,
  type TopicSelectionResearchCheckpointAction,
  type TopicSelectionResearchArenaAdvisoryReviewInput,
  type TopicSelectionResearchArenaAdvisoryReviewHistory,
  type TopicSelectionResearchArenaAdvisoryReviewProjectionIssueCode,
  type TopicSelectionResearchArenaAdvisoryReviewReasonCode,
  type TopicSelectionResearchArenaAdvisoryReviewPayload,
  type TopicSelectionResearchArenaAdvisoryReviewRecord,
  type TopicSelectionResearchArenaAdvisoryReviewResult,
  type TopicSelectionResearchCheckpointDecisionInput,
  type TopicSelectionResearchCheckpointDecisionRecord,
  type TopicSelectionResearchCheckpointKind,
  type TopicSelectionResearchCheckpointPacket,
  type TopicSelectionResearchCheckpointRecord,
  type TopicSelectionResearchConfirmationEffectClass,
  type TopicSelectionResearchContinuationEnvelope,
  type TopicSelectionResearchContinuationEnvelopeEvaluation,
  type TopicSelectionResearchContinuationEnvelopeEvaluationInput,
  type TopicSelectionResearchGapArenaAdvisory,
  type TopicSelectionResearchHumanStageView,
  type TopicSelectionResearchLlmStageView,
  type TopicSelectionResearchObjectionInput,
  type TopicSelectionResearchObjectionRecord,
  type TopicSelectionResearchObjectionResolutionInput,
  type TopicSelectionResearchObjectionResolutionRecord,
  type TopicSelectionResearchRoutineEffectClass,
  type TopicSelectionResearchStatusProjection,
  type TopicSelectionResearchStageManifest,
  type TopicSelectionResearchStageManifestEntry,
  type TopicSelectionResearchStageHumanSummary,
  type TopicSelectionResearchStageView,
  type TopicSelectionResearchStageViewAudience,
  type TopicSelectionResearchStageViewStage,
  type TopicSelectionResearchStageWorkingSet,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-checkpoint-contracts';
import { topicSelectionNeedCandidateSemanticGroupKey } from '../topic-selection-need-candidate-identity.js';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionV1bTopicPackageRepository } from '../repositories/topic-selection-v1b-topic-package.repository.js';
import type { TopicSelectionV1bValueAssessmentRepository } from '../repositories/topic-selection-v1b-value-assessment.repository.js';
import type { TopicSelectionResearchArenaRepository } from '../repositories/topic-selection-research-arena.repository.js';
import {
  TopicSelectionResearchCheckpointCurrentConflictError,
  type TopicSelectionResearchCheckpointRepository,
} from '../repositories/topic-selection-research-checkpoint.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  buildTopicSelectionHumanConfirmNeedIntent,
  normalizeTopicSelectionGapSelectionReview,
} from './topic-selection-human-confirm-need-intent.js';

type IdFactory = (prefix: string) => string;

type ServiceOptions = {
  idFactory?: IdFactory;
  now?: () => string;
  arenaRepository?: Pick<TopicSelectionResearchArenaRepository, 'findCurrentSession'>;
  stageProjectionSources?: {
    topicPackageRepository: Pick<TopicSelectionV1bTopicPackageRepository, 'listPackagesByTitleCardId'>
      & Partial<Pick<
        TopicSelectionV1bTopicPackageRepository,
        | 'findReadinessAssessmentById'
        | 'findTraceBoundaryCheckById'
        | 'findV1cInputBundleByPackageId'
      >>;
    valueAssessmentRepository: Pick<
      TopicSelectionV1bValueAssessmentRepository,
      'listAssessmentsByTitleCardId' | 'listDispositionDecisionsByTitleCardId'
    > & Partial<Pick<
      TopicSelectionV1bValueAssessmentRepository,
      'findReasoningMemoById' | 'listEvidenceRefsByAssessmentId'
    >>;
  };
};

type GapCandidatePacketEntry = {
  need_candidate_ref: TopicSelectionFunctionalRef;
  semantic_group_key: string;
  machine_viable: boolean;
};

type GapArenaAdvisoryProjection = {
  advisory: TopicSelectionResearchGapArenaAdvisory | null;
  issueCodes: string[];
  sourceRefs: TopicSelectionFunctionalRef[];
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
const STAGE_BY_CHECKPOINT_KIND = {
  evidence_landscape: 'evidence_landscape',
  gap_selection: 'research_gap',
  question_contract: 'research_question',
  promotion: 'promotion_review',
} as const satisfies Record<TopicSelectionResearchCheckpointKind, TopicSelectionResearchStageViewStage>;
const CHECKPOINT_KIND_BY_STAGE = {
  evidence_landscape: 'evidence_landscape',
  research_gap: 'gap_selection',
  research_question: 'question_contract',
  promotion_review: 'promotion',
} as const satisfies Partial<Record<TopicSelectionResearchStageViewStage, TopicSelectionResearchCheckpointKind>>;
const HUMAN_STAGE_LABELS = {
  overview: '选题总览',
  evidence_landscape: '证据版图',
  research_gap: '研究空白',
  research_question: '研究问题',
  value_feasibility: '价值与可行性',
  topic_package: '选题包',
  promotion_review: '晋级审阅',
} as const satisfies Record<TopicSelectionResearchStageViewStage, string>;
const HUMAN_ACTION_LABELS = {
  advance: '接受并推进',
  loopback: '回环补强',
  reject: '拒绝当前结果',
  hold: '暂缓决定',
} as const satisfies Record<TopicSelectionResearchCheckpointAction, string>;
const ROUTINE_EFFECT_CLASS_SET = new Set<string>(TOPIC_SELECTION_RESEARCH_ROUTINE_EFFECT_CLASSES);
const CONFIRMATION_EFFECT_CLASS_SET = new Set<string>(TOPIC_SELECTION_RESEARCH_CONFIRMATION_EFFECT_CLASSES);
const ARENA_OUTCOME_SET = new Set<string>(TOPIC_SELECTION_CANDIDATE_PORTFOLIO_OUTCOMES);
const ARENA_DISPOSITION_SET = new Set<string>(TOPIC_SELECTION_CANDIDATE_PORTFOLIO_DISPOSITIONS);
const ARENA_DROP_REASON_SET = new Set<string>(TOPIC_SELECTION_CANDIDATE_DROP_REASON_CODES);
const ARENA_DELTA_SET = new Set<string>(TOPIC_SELECTION_RESEARCH_ARENA_DELTA_TYPES);
const ARENA_ROLE_SET = new Set<string>(TOPIC_SELECTION_RESEARCH_ARENA_SHADOW_ROLES);
const ARENA_REVIEW_REASON_SET = new Set<string>(TOPIC_SELECTION_RESEARCH_ARENA_ADVISORY_REVIEW_REASON_CODES);
const ARENA_REVIEW_STABLE_KEY_PREFIX = 'topic-selection-arena-advisory-review:';

export class TopicSelectionResearchCheckpointService {
  private readonly idFactory: IdFactory;
  private readonly now: () => string;
  private readonly arenaRepository: ServiceOptions['arenaRepository'];
  private readonly stageProjectionSources: ServiceOptions['stageProjectionSources'];

  constructor(
    private readonly repository: TopicSelectionResearchCheckpointRepository,
    private readonly controlPlane: TopicSelectionControlPlaneService,
    options: ServiceOptions = {},
  ) {
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
    this.arenaRepository = options.arenaRepository;
    this.stageProjectionSources = options.stageProjectionSources;
  }

  async materializeCheckpoint(
    input: MaterializeResearchCheckpointInput,
  ): Promise<TopicSelectionResearchCheckpointRecord> {
    this.assertHash(input.target_snapshot_hash, 'target_snapshot_hash');
    this.assertTarget(input.title_card_id, input.target_ref);
    const checkpointIndex = TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS.indexOf(input.checkpoint_kind);
    const predecessorKind = checkpointIndex > 0
      ? TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS[checkpointIndex - 1]
      : null;
    const predecessor = predecessorKind
      ? await this.repository.findCurrentCheckpoint(input.title_card_id, predecessorKind)
      : null;
    const sourceRefs = this.uniqueRefs([
      ...(input.source_refs ?? []),
      ...(predecessor ? [this.checkpointRef(predecessor)] : []),
    ]);
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
    const arenaProjection = await this.projectGapArenaAdvisory(input.title_card_id, candidates);
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
      arena_advisory: arenaProjection.advisory,
      arena_advisory_issue_codes: arenaProjection.issueCodes,
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
        ...arenaProjection.sourceRefs,
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
    for (let index = 1; index < checkpoints.length; index += 1) {
      const predecessor = checkpoints[index - 1];
      const checkpoint = checkpoints[index];
      if (!predecessor || !checkpoint
        || !checkpoint.source_refs.some((ref) => this.refsEqual(ref, this.checkpointRef(predecessor)))) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `Current ${checkpoint?.checkpoint_kind ?? 'research'} checkpoint has stale upstream checkpoint lineage.`,
        );
      }
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

  async recordArenaAdvisoryReview(
    checkpointId: string,
    input: TopicSelectionResearchArenaAdvisoryReviewInput,
  ): Promise<TopicSelectionResearchArenaAdvisoryReviewResult> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    this.assertCurrent(checkpoint);
    if (checkpoint.checkpoint_kind !== 'gap_selection') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Arena advisory review requires a gap-selection checkpoint.');
    }
    this.assertArenaReviewInput(checkpoint, input);
    const packet = await this.getPacket(checkpointId);
    const advisory = this.requireGapArenaAdvisory(packet);
    const advisorySnapshotHash = this.hash(advisory);
    if (input.advisory_snapshot_hash !== advisorySnapshotHash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena advisory review identifies a stale advisory snapshot.');
    }
    const humanReview = input.human_gap_selection_review
      ? this.normalizeGapSelectionReview(input.human_gap_selection_review)
      : null;
    if (humanReview) this.assertArenaHumanReviewScope(checkpoint, advisory, humanReview);
    const classification = this.classifyArenaAdvisoryReview(advisory, humanReview, input.response);
    if (classification.response !== input.response) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Arena advisory response does not match the human candidate review.', {
        expected_response: classification.response,
        reason_codes: classification.reasonCodes,
      });
    }
    const humanConfirmNeedIntent = this.buildArenaHumanConfirmNeedIntent(
      checkpoint,
      input.human_confirm_need_intent,
      humanReview,
      input.actor,
    );
    const stableKey = `${ARENA_REVIEW_STABLE_KEY_PREFIX}${this.hash({
      actor: input.actor,
      checkpoint_id: checkpoint.research_checkpoint_id,
      idempotency_key: input.idempotency_key,
      input_snapshot_id: checkpoint.input_snapshot_id,
    })}`;
    const reviewIdentityHash = this.hash({ stable_key: stableKey });
    const review: TopicSelectionResearchArenaAdvisoryReviewPayload = {
      schema_version: TOPIC_SELECTION_RESEARCH_ARENA_ADVISORY_REVIEW_SCHEMA_VERSION,
      review_id: `topic_selection_research_arena_advisory_review_${reviewIdentityHash}`,
      title_card_id: checkpoint.title_card_id,
      research_checkpoint_id: checkpoint.research_checkpoint_id,
      gap_input_snapshot_id: checkpoint.input_snapshot_id,
      confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
      advisory_snapshot_hash: advisorySnapshotHash,
      response: classification.response,
      rationale: input.rationale.trim(),
      reason_codes: classification.reasonCodes,
      actor: input.actor,
      human_gap_selection_review: humanReview,
      human_gap_selection_review_hash: humanReview ? this.hash(humanReview) : null,
      selected_candidate_ref: humanReview?.selected_candidate_ref ?? null,
      human_confirm_need_intent: humanConfirmNeedIntent,
      support_only: true,
    };
    const existing = await this.controlPlane.getArtifactRefByStableKey(stableKey);
    if (existing) return this.arenaReviewResult(existing, review);
    if (checkpoint.status !== 'pending') {
      throw new AppError(409, 'VERSION_CONFLICT', 'A decided gap checkpoint cannot accept a new Arena advisory review.');
    }
    let artifact: TopicSelectionArtifactRefRecord;
    try {
      artifact = await this.controlPlane.recordArtifactRef({
        stable_key: stableKey,
        workspace_id: checkpoint.workspace_id ?? null,
        title_card_id: checkpoint.title_card_id,
        artifact_kind: 'structured_output',
        payload: { ...review },
        input_snapshot_id: checkpoint.input_snapshot_id,
        created_by: 'human',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes(`ArtifactRef stable key ${stableKey}`)) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Arena advisory review idempotency key identifies different content.');
      }
      throw error;
    }
    return this.arenaReviewResult(artifact, review);
  }

  async getArenaAdvisoryReviewHistory(
    checkpointId: string,
  ): Promise<TopicSelectionResearchArenaAdvisoryReviewHistory> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    if (checkpoint.checkpoint_kind !== 'gap_selection') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Arena advisory review history requires a gap-selection checkpoint.');
    }
    const packet = await this.getPacket(checkpointId);
    const advisory = this.requireGapArenaAdvisory(packet);
    const [artifacts, humanDecisions] = await Promise.all([
      this.controlPlane.listArtifactRefsByInputSnapshotId(checkpoint.input_snapshot_id),
      this.controlPlane.listHumanDecisionsByTitleCardId(checkpoint.title_card_id),
    ]);
    const reviews: TopicSelectionResearchArenaAdvisoryReviewHistory['reviews'] = [];
    const projectionIssues: TopicSelectionResearchArenaAdvisoryReviewHistory['projection_issues'] = [];
    const sortedArtifacts = [...artifacts].sort((left, right) =>
      left.created_at.localeCompare(right.created_at)
      || left.artifact_ref_id.localeCompare(right.artifact_ref_id)
    );
    for (const artifact of sortedArtifacts) {
      const payload = this.asRecord(artifact.payload);
      const claimsReviewSchema = payload?.schema_version === TOPIC_SELECTION_RESEARCH_ARENA_ADVISORY_REVIEW_SCHEMA_VERSION;
      const hasDedicatedKey = artifact.stable_key?.startsWith(ARENA_REVIEW_STABLE_KEY_PREFIX) ?? false;
      if (!claimsReviewSchema && !hasDedicatedKey) continue;
      const artifactRef = this.ref(
        'artifact_ref',
        artifact.artifact_ref_id,
        artifact.title_card_id ?? checkpoint.title_card_id,
        TOPIC_SELECTION_RESEARCH_ARENA_ADVISORY_REVIEW_SCHEMA_VERSION,
      );
      if (claimsReviewSchema && !hasDedicatedKey) {
        projectionIssues.push({
          artifact_ref: artifactRef,
          issue_code: 'LOOKALIKE_REVIEW_ARTIFACT',
          message: 'Artifact claims the Arena advisory review schema without dedicated provenance.',
        });
        continue;
      }
      try {
        const review = this.decodeArenaReviewArtifact(checkpoint, advisory, artifact);
        const humanDecision = review.response !== 'defer' && review.selected_candidate_ref
          ? humanDecisions.find((decision) => this.humanDecisionBindsArenaReview(
            decision,
            artifactRef,
            review,
          )) ?? null
          : null;
        reviews.push({
          review_ref: artifactRef,
          review,
          advancement_binding: {
            status: humanDecision ? 'confirmed' : 'proposed',
            human_confirmed_decision_ref: humanDecision
              ? this.ref(
                'human_confirmed_decision',
                humanDecision.human_confirmed_decision_id,
                checkpoint.title_card_id,
              )
              : null,
          },
        });
      } catch (error) {
        projectionIssues.push({
          artifact_ref: artifactRef,
          issue_code: this.arenaReviewProjectionIssueCode(error),
          message: error instanceof Error ? error.message : 'Arena advisory review artifact is invalid.',
        });
      }
    }
    const reopenSignals: TopicSelectionResearchArenaAdvisoryReviewHistory['reopen_signals'] = [];
    for (const item of reviews) {
      const selectedCandidateRef = item.review.selected_candidate_ref;
      if (!selectedCandidateRef) continue;
      const common = {
        status: item.advancement_binding.status,
        review_ref: item.review_ref,
        selected_candidate_ref: selectedCandidateRef,
        reason_codes: item.review.reason_codes,
        human_confirmed_decision_ref: item.advancement_binding.human_confirmed_decision_ref,
      };
      if (item.review.reason_codes.some((code) =>
        code === 'SELECTED_PARKED_CANDIDATE' || code === 'SELECTED_DROPPED_CANDIDATE'
      )) {
        reopenSignals.push({ signal_type: 'candidate_reopened', ...common });
      }
      if (item.review.reason_codes.some((code) =>
        code === 'ADVANCE_AGAINST_NONE_VIABLE'
        || code === 'ADVANCE_BEFORE_EVIDENCE_EXPANSION'
        || code === 'ADVANCE_WITHOUT_REFRAME'
      )) {
        reopenSignals.push({ signal_type: 'advanced_against_stop', ...common });
      }
    }
    const body = {
      schema_version: TOPIC_SELECTION_RESEARCH_ARENA_ADVISORY_REVIEW_HISTORY_SCHEMA_VERSION,
      research_checkpoint_id: checkpoint.research_checkpoint_id,
      title_card_id: checkpoint.title_card_id,
      gap_input_snapshot_id: checkpoint.input_snapshot_id,
      checkpoint_currentness: checkpoint.current_checkpoint_key && checkpoint.status !== 'superseded'
        ? 'current' as const
        : 'superseded' as const,
      reviews,
      projection_issues: projectionIssues,
      reopen_signals: reopenSignals,
    };
    return { ...body, history_hash: this.hash(body) };
  }

  async assertGapArenaAdvisoryReviewBinding(input: {
    checkpoint_id: string;
    title_card_id: string;
    review_ref: TopicSelectionFunctionalRef | null;
    human_gap_selection_review: TopicSelectionGapSelectionReview;
    accountable_human_ref: { actor_type: string; actor_id?: string | null };
    human_confirm_need_intent: TopicSelectionHumanConfirmNeedIntentRecord;
  }): Promise<TopicSelectionResearchArenaAdvisoryReviewRecord | null> {
    const checkpoint = await this.getCheckpoint(input.checkpoint_id);
    this.assertCurrent(checkpoint);
    if (checkpoint.checkpoint_kind !== 'gap_selection' || checkpoint.title_card_id !== input.title_card_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena advisory review binding identifies another gap checkpoint.');
    }
    const packet = await this.getPacket(checkpoint.research_checkpoint_id);
    const rawAdvisory = packet.packet_payload.arena_advisory;
    if (rawAdvisory === null || rawAdvisory === undefined) {
      if (input.review_ref) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Gap checkpoint did not expose current Arena advice.');
      }
      return null;
    }
    const advisory = this.requireGapArenaAdvisory(packet);
    if (!input.review_ref) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'HumanConfirmNeed requires an explicit Arena advisory review ref.');
    }
    if (input.accountable_human_ref.actor_type !== 'human' || !input.accountable_human_ref.actor_id?.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Arena advisory advancement requires the same accountable human actor.');
    }
    if (input.review_ref.ref_type !== 'artifact_ref'
      || input.review_ref.version_id !== TOPIC_SELECTION_RESEARCH_ARENA_ADVISORY_REVIEW_SCHEMA_VERSION
      || input.review_ref.title_card_id !== checkpoint.title_card_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena advisory review ref has the wrong type, version, or title card.');
    }
    const artifact = await this.controlPlane.getArtifactRef(input.review_ref.ref_id);
    if (!artifact) throw new AppError(404, 'NOT_FOUND', `Arena advisory review ${input.review_ref.ref_id} not found.`);
    const normalizedHumanReview = this.normalizeGapSelectionReview(input.human_gap_selection_review);
    this.assertArenaHumanReviewScope(checkpoint, advisory, normalizedHumanReview);
    const review = this.decodeArenaReviewArtifact(checkpoint, advisory, artifact);
    if (stableStringify(review.actor) !== stableStringify({
      actor_type: 'human',
      actor_id: input.accountable_human_ref.actor_id ?? '',
    }) || stableStringify(review.human_gap_selection_review) !== stableStringify(normalizedHumanReview)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena advisory review idempotency or binding content changed.');
    }
    if (review.human_confirm_need_intent
      && stableStringify(review.human_confirm_need_intent) !== stableStringify(input.human_confirm_need_intent)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'HumanConfirmNeed intent changed after the Arena label was recorded.',
        {
          recorded_intent_hash: review.human_confirm_need_intent.intent_hash,
          submitted_intent_hash: input.human_confirm_need_intent.intent_hash,
        },
      );
    }
    if (review.response === 'defer') {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'A deferred Arena advisory review cannot advance HumanConfirmNeed.');
    }
    return review;
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
    if (persisted.resolution_key !== input.resolution_key) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchObjection is already resolved.');
    }
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
    const materialRiskFindingRefs = await this.currentMaterialRiskFindingRefs(titleCardId);
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
      material_risk_finding_refs: materialRiskFindingRefs,
      legacy_provenance: checkpointChain.length === 0
        || checkpointChain.some((checkpoint) => checkpoint.provenance_class === 'backfilled'),
    };
  }

  private async listArenaAdvisoryReviewHistories(
    titleCardId: string,
  ): Promise<TopicSelectionResearchArenaAdvisoryReviewHistory[]> {
    const checkpoints = (await this.repository.listCheckpointsByTitleCardId(titleCardId))
      .filter((checkpoint) => checkpoint.checkpoint_kind === 'gap_selection')
      .sort((left, right) =>
        left.created_at.localeCompare(right.created_at)
        || left.research_checkpoint_id.localeCompare(right.research_checkpoint_id)
      );
    const histories: TopicSelectionResearchArenaAdvisoryReviewHistory[] = [];
    for (const checkpoint of checkpoints) {
      const packet = await this.getPacket(checkpoint.research_checkpoint_id);
      if (!this.asRecord(packet.packet_payload.arena_advisory)) continue;
      histories.push(await this.getArenaAdvisoryReviewHistory(checkpoint.research_checkpoint_id));
    }
    return histories;
  }

  async getArenaAdvisoryReviewHistoryForSession(
    titleCardId: string,
    arenaSessionId: string,
  ): Promise<TopicSelectionResearchArenaAdvisoryReviewHistory | null> {
    const checkpoints = (await this.repository.listCheckpointsByTitleCardId(titleCardId))
      .filter((checkpoint) => checkpoint.checkpoint_kind === 'gap_selection')
      .sort((left, right) =>
        left.created_at.localeCompare(right.created_at)
        || left.research_checkpoint_id.localeCompare(right.research_checkpoint_id)
      );
    const matchingCheckpointIds: string[] = [];
    for (const checkpoint of checkpoints) {
      const packet = await this.getPacket(checkpoint.research_checkpoint_id);
      const advisory = this.asRecord(packet.packet_payload.arena_advisory);
      if (!advisory) continue;
      const sessionRef = this.asRecord(advisory.arena_session_ref);
      if (!sessionRef || typeof sessionRef.ref_id !== 'string') {
        throw new AppError(409, 'VERSION_CONFLICT', 'Gap checkpoint Arena advice has a malformed session ref.');
      }
      if (sessionRef.ref_id === arenaSessionId) {
        matchingCheckpointIds.push(checkpoint.research_checkpoint_id);
      }
    }
    if (matchingCheckpointIds.length > 1) {
      throw new AppError(409, 'VERSION_CONFLICT', `Arena session ${arenaSessionId} is bound to multiple gap checkpoints.`);
    }
    const checkpointId = matchingCheckpointIds[0];
    return checkpointId ? this.getArenaAdvisoryReviewHistory(checkpointId) : null;
  }

  async getStageManifest(titleCardId: string): Promise<TopicSelectionResearchStageManifest> {
    const researchStatus = await this.getResearchStatus(titleCardId);
    const arenaReviewHistories = await this.listArenaAdvisoryReviewHistories(titleCardId);
    const checkpointByKind = new Map(
      researchStatus.checkpoint_chain.map((checkpoint) => [checkpoint.checkpoint_kind, checkpoint]),
    );
    const checkpointEntry = (
      stage: TopicSelectionResearchStageViewStage,
      kind: TopicSelectionResearchCheckpointKind,
    ): TopicSelectionResearchStageManifestEntry => {
      const checkpoint = checkpointByKind.get(kind);
      if (!checkpoint) {
        return this.unavailableStageManifestEntry(stage, 'checkpoint_unique_current_key');
      }
      const checkpointRef = this.checkpointRef(checkpoint);
      const resolvableRefs = this.uniqueRefs([
        checkpoint.target_ref,
        ...checkpoint.source_refs,
      ]);
      return {
        stage,
        state: 'current',
        current_selection_rule: 'checkpoint_unique_current_key',
        authority_ref: checkpoint.target_ref,
        checkpoint_ref: checkpointRef,
        supersedes_ref: checkpoint.supersedes_checkpoint_id
          ? this.ref('research_checkpoint', checkpoint.supersedes_checkpoint_id, titleCardId)
          : null,
        snapshot_hash: checkpoint.target_snapshot_hash,
        status: checkpoint.status,
        source_refs: checkpoint.source_refs,
        artifact_refs: resolvableRefs.filter((ref) => ref.ref_type === 'artifact_ref'),
        issue_codes: [],
      };
    };
    const valueStage = await this.currentValueStageManifestEntry(
      titleCardId,
      checkpointByKind.get('question_contract')?.target_ref ?? null,
    );
    const gapEntry = checkpointEntry('research_gap', 'gap_selection');
    const gapHistoryArtifactRefs = arenaReviewHistories.flatMap((history) => [
      ...history.reviews.map((item) => item.review_ref),
      ...history.projection_issues.map((issue) => issue.artifact_ref),
    ]);
    const gapHistoryDecisionRefs = arenaReviewHistories.flatMap((history) =>
      history.reviews.flatMap((item) =>
        item.advancement_binding.human_confirmed_decision_ref
          ? [item.advancement_binding.human_confirmed_decision_ref]
          : []
      )
    );
    const researchGapEntry: TopicSelectionResearchStageManifestEntry = gapEntry.state === 'current'
      ? {
        ...gapEntry,
        source_refs: this.uniqueRefs([...gapEntry.source_refs, ...gapHistoryDecisionRefs]),
        artifact_refs: this.uniqueRefs([...gapEntry.artifact_refs, ...gapHistoryArtifactRefs]),
        issue_codes: this.uniqueStrings([
          ...gapEntry.issue_codes,
          ...arenaReviewHistories.flatMap((history) =>
            history.projection_issues.map((issue) => issue.issue_code)
          ),
        ]),
      }
      : gapEntry;
    const projectedStages: TopicSelectionResearchStageManifestEntry[] = [
      checkpointEntry('evidence_landscape', 'evidence_landscape'),
      researchGapEntry,
      checkpointEntry('research_question', 'question_contract'),
      valueStage.entry,
      await this.currentPackageStageManifestEntry(titleCardId, valueStage.currentDispositionDecisionId),
      checkpointEntry('promotion_review', 'promotion'),
    ];
    const currentAuthorityRefs = projectedStages
      .map((stage) => stage.authority_ref)
      .filter((ref): ref is TopicSelectionFunctionalRef => ref !== null);
    const overview: TopicSelectionResearchStageManifestEntry = {
      stage: 'overview',
      state: 'current',
      current_selection_rule: 'derived_from_current_manifest',
      authority_ref: null,
      checkpoint_ref: null,
      supersedes_ref: null,
      snapshot_hash: this.hash(projectedStages),
      status: researchStatus.required_checkpoint_kind === null ? 'complete' : 'in_progress',
      source_refs: this.uniqueRefs(currentAuthorityRefs),
      artifact_refs: this.uniqueRefs(projectedStages.flatMap((stage) => stage.artifact_refs)),
      issue_codes: [],
    };
    const stages = [overview, ...projectedStages];
    const currentStage = researchStatus.current_checkpoint
      ? STAGE_BY_CHECKPOINT_KIND[researchStatus.current_checkpoint.checkpoint_kind]
      : [...projectedStages].reverse().find((stage) => stage.state === 'current')?.stage ?? null;
    const body = {
      schema_version: 'TopicSelectionResearchStageManifest@v1' as const,
      title_card_id: titleCardId,
      current_stage: currentStage,
      next_human_decision_stage: researchStatus.required_checkpoint_kind
        ? STAGE_BY_CHECKPOINT_KIND[researchStatus.required_checkpoint_kind]
        : null,
      stages,
    };
    return {
      ...body,
      manifest_hash: this.hash(body),
    };
  }

  async getArtifact(artifactRefId: string): Promise<TopicSelectionArtifactRefRecord> {
    const artifact = await this.controlPlane.getArtifactRef(artifactRefId);
    if (!artifact) {
      throw new AppError(404, 'NOT_FOUND', `Topic-selection artifact ${artifactRefId} was not found.`);
    }
    return artifact;
  }

  async getContinuationEnvelope(
    titleCardId: string,
  ): Promise<TopicSelectionResearchContinuationEnvelope> {
    const manifest = await this.getStageManifest(titleCardId);
    const boundaryReached = manifest.current_stage !== null
      && manifest.current_stage === manifest.next_human_decision_stage;
    const body = {
      schema_version: 'TopicSelectionResearchContinuationEnvelope@v1' as const,
      intent: 'advance_to_next_human_decision' as const,
      title_card_id: titleCardId,
      manifest_hash: manifest.manifest_hash,
      environment_scope: 'selected_local_backend' as const,
      target_human_decision_stage: manifest.next_human_decision_stage,
      boundary_reached: boundaryReached,
      routine_effect_classes: [...TOPIC_SELECTION_RESEARCH_ROUTINE_EFFECT_CLASSES],
      confirmation_required_effect_classes: [
        ...TOPIC_SELECTION_RESEARCH_CONFIRMATION_EFFECT_CLASSES,
      ],
      reason_codes: boundaryReached
        ? ['HUMAN_DECISION_BOUNDARY_REACHED' as const]
        : [],
    };
    return { ...body, envelope_hash: this.hash(body) };
  }

  async evaluateContinuationEnvelope(
    titleCardId: string,
    input: TopicSelectionResearchContinuationEnvelopeEvaluationInput,
  ): Promise<TopicSelectionResearchContinuationEnvelopeEvaluation> {
    this.assertHash(input.envelope_hash, 'envelope_hash');
    this.assertHash(input.manifest_hash, 'manifest_hash');
    if (input.proposed_effects.length === 0 || new Set(input.proposed_effects).size !== input.proposed_effects.length) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Continuation evaluation requires unique proposed effects.');
    }
    if (input.proposed_effects.some((effect) =>
      !ROUTINE_EFFECT_CLASS_SET.has(effect) && !CONFIRMATION_EFFECT_CLASS_SET.has(effect)
    )) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Continuation evaluation contains an unknown effect class.');
    }
    const envelope = await this.getContinuationEnvelope(titleCardId);
    const stale = input.envelope_hash !== envelope.envelope_hash
      || input.manifest_hash !== envelope.manifest_hash;
    const routineEffects = stale ? [] : input.proposed_effects.filter(
      (effect): effect is TopicSelectionResearchRoutineEffectClass => ROUTINE_EFFECT_CLASS_SET.has(effect),
    );
    const blockingEffects = stale ? [] : input.proposed_effects.filter(
      (effect): effect is TopicSelectionResearchConfirmationEffectClass =>
        CONFIRMATION_EFFECT_CLASS_SET.has(effect),
    );
    const decision = stale
      ? 'refresh_envelope' as const
      : blockingEffects.length > 0 || envelope.boundary_reached
        ? 'stop_for_human' as const
        : 'continue' as const;
    const reasonCodes = stale
      ? ['ENVELOPE_STALE' as const]
      : [
        ...(blockingEffects.length > 0 ? ['CONFIRMATION_REQUIRED_EFFECT' as const] : []),
        ...(envelope.boundary_reached ? ['HUMAN_DECISION_BOUNDARY_REACHED' as const] : []),
        ...(blockingEffects.length === 0 && !envelope.boundary_reached
          ? ['WITHIN_ROUTINE_EFFECT_ENVELOPE' as const] : []),
      ];
    const body = {
      schema_version: 'TopicSelectionResearchContinuationEnvelopeEvaluation@v1' as const,
      title_card_id: titleCardId,
      decision,
      envelope_hash: envelope.envelope_hash,
      manifest_hash: envelope.manifest_hash,
      target_human_decision_stage: envelope.target_human_decision_stage,
      routine_effects: routineEffects,
      blocking_effects: blockingEffects,
      reason_codes: reasonCodes,
    };
    return { ...body, evaluation_hash: this.hash(body) };
  }

  async getStageView(
    titleCardId: string,
    stage: TopicSelectionResearchStageViewStage,
    audience: 'human',
  ): Promise<TopicSelectionResearchHumanStageView>;
  async getStageView(
    titleCardId: string,
    stage: TopicSelectionResearchStageViewStage,
    audience: 'llm',
  ): Promise<TopicSelectionResearchLlmStageView>;
  async getStageView(
    titleCardId: string,
    stage: TopicSelectionResearchStageViewStage,
    audience: TopicSelectionResearchStageViewAudience,
  ): Promise<TopicSelectionResearchStageView>;
  async getStageView(
    titleCardId: string,
    stage: TopicSelectionResearchStageViewStage,
    audience: TopicSelectionResearchStageViewAudience,
  ): Promise<TopicSelectionResearchStageView> {
    const manifest = await this.getStageManifest(titleCardId);
    const entry = manifest.stages.find((candidate) => candidate.stage === stage);
    if (!entry) {
      throw new AppError(404, 'NOT_FOUND', `Research stage ${stage} was not found.`);
    }
    const workingSet = await this.buildStageWorkingSet(titleCardId, stage, manifest, entry);
    const common = {
      schema_version: 'TopicSelectionResearchStageView@v1' as const,
      title_card_id: titleCardId,
      stage,
      state: entry.state,
      manifest_hash: manifest.manifest_hash,
      source_snapshot_hash: entry.snapshot_hash,
    };
    if (audience === 'human') {
      const body = {
        ...common,
        audience: 'human' as const,
        markdown: this.renderHumanStageMarkdown(manifest, workingSet),
      };
      return { ...body, view_hash: this.hash(body) };
    }
    const body = {
      ...common,
      audience: 'llm' as const,
      working_set: workingSet,
    };
    return { ...body, view_hash: this.hash(body) };
  }

  private async buildStageWorkingSet(
    titleCardId: string,
    stage: TopicSelectionResearchStageViewStage,
    manifest: TopicSelectionResearchStageManifest,
    entry: TopicSelectionResearchStageManifestEntry,
  ): Promise<TopicSelectionResearchStageWorkingSet> {
    const researchStatus = await this.getResearchStatus(titleCardId);
    const checkpointKind = CHECKPOINT_KIND_BY_STAGE[stage as keyof typeof CHECKPOINT_KIND_BY_STAGE];
    const checkpointRecords = (await this.repository.listCheckpointsByTitleCardId(titleCardId))
      .filter((checkpoint) => !checkpointKind || checkpoint.checkpoint_kind === checkpointKind)
      .sort((left, right) =>
        left.created_at.localeCompare(right.created_at)
        || left.research_checkpoint_id.localeCompare(right.research_checkpoint_id)
      );
    const checkpointHistory = await Promise.all(
      checkpointRecords.map((checkpoint) => this.getPacket(checkpoint.research_checkpoint_id)),
    );
    const currentPacket = entry.checkpoint_ref
      ? checkpointHistory.find(
        (packet) => packet.research_checkpoint_id === entry.checkpoint_ref?.ref_id,
      ) ?? null
      : stage === 'overview'
        ? researchStatus.current_packet ?? null
        : null;
    let canonicalOwner: unknown = currentPacket?.packet_payload ?? null;
    let relatedRecords: Record<string, unknown> = {
      checkpoint_records: checkpointRecords,
    };

    if (stage === 'overview') {
      canonicalOwner = manifest;
      relatedRecords = { checkpoint_records: checkpointRecords };
    } else if (stage === 'research_gap') {
      const arenaReviewHistories = await this.listArenaAdvisoryReviewHistories(titleCardId);
      const arenaAdvisory = this.asRecord(currentPacket?.packet_payload.arena_advisory);
      const riskFindingRefs = this.functionalRefs(arenaAdvisory?.risk_finding_refs) ?? [];
      const arenaRiskFindings = (await Promise.all(
        riskFindingRefs.map((ref) => this.controlPlane.getArtifactRef(ref.ref_id)),
      )).filter((artifact): artifact is TopicSelectionArtifactRefRecord => Boolean(
        artifact
        && artifact.title_card_id === titleCardId
        && artifact.payload
        && artifact.checksum === this.hash(artifact.payload),
      ));
      relatedRecords = {
        checkpoint_records: checkpointRecords,
        arena_advisory: arenaAdvisory,
        arena_risk_findings: arenaRiskFindings,
        arena_advisory_review_histories: arenaReviewHistories,
        arena_advisory_review_projection_issues: arenaReviewHistories.flatMap(
          (history) => history.projection_issues,
        ),
        arena_advisory_reopen_signals: arenaReviewHistories.flatMap(
          (history) => history.reopen_signals,
        ),
      };
    } else if (stage === 'value_feasibility') {
      const repository = this.stageProjectionSources?.valueAssessmentRepository;
      const [assessments, decisions] = repository
        ? await Promise.all([
          repository.listAssessmentsByTitleCardId(titleCardId),
          repository.listDispositionDecisionsByTitleCardId(titleCardId),
        ])
        : [[], []];
      const assessment = assessments.find(
        (candidate) => candidate.topic_value_assessment_id === entry.authority_ref?.ref_id,
      ) ?? null;
      if (entry.state === 'current' && !assessment) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Current value stage owner changed while its view was being projected.');
      }
      const decision = decisions.find(
        (candidate) => candidate.is_current
          && candidate.topic_value_assessment_id === assessment?.topic_value_assessment_id,
      ) ?? null;
      const [memo, evidenceRefs] = assessment
        ? await Promise.all([
          repository?.findReasoningMemoById
            ? repository.findReasoningMemoById(assessment.value_reasoning_memo_id)
            : null,
          repository?.listEvidenceRefsByAssessmentId
            ? repository.listEvidenceRefsByAssessmentId(assessment.topic_value_assessment_id)
            : [],
        ])
        : [null, []];
      canonicalOwner = assessment;
      relatedRecords = {
        current_disposition_decision: decision,
        evidence_refs: evidenceRefs,
        reasoning_memo: memo,
      };
    } else if (stage === 'topic_package') {
      const repository = this.stageProjectionSources?.topicPackageRepository;
      const packages = repository ? await repository.listPackagesByTitleCardId(titleCardId) : [];
      const topicPackage = packages.find(
        (candidate) => candidate.topic_package_id === entry.authority_ref?.ref_id,
      ) ?? null;
      if (entry.state === 'current' && !topicPackage) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Current topic-package owner changed while its view was being projected.');
      }
      const [traceBoundary, readiness, v1cBundle] = topicPackage
        ? await Promise.all([
          topicPackage.trace_boundary_check_id && repository?.findTraceBoundaryCheckById
            ? repository.findTraceBoundaryCheckById(topicPackage.trace_boundary_check_id)
            : null,
          topicPackage.readiness_assessment_id && repository?.findReadinessAssessmentById
            ? repository.findReadinessAssessmentById(topicPackage.readiness_assessment_id)
            : null,
          repository?.findV1cInputBundleByPackageId
            ? repository.findV1cInputBundleByPackageId(topicPackage.topic_package_id)
            : null,
        ])
        : [null, null, null];
      canonicalOwner = topicPackage;
      relatedRecords = {
        package_readiness_assessment: readiness,
        package_trace_boundary_check: traceBoundary,
        v1c_input_bundle: v1cBundle,
      };
    }

    const workingSetWithoutSummary = {
      manifest_entry: entry,
      research_status: researchStatus,
      current_packet: currentPacket,
      checkpoint_history: checkpointHistory,
      canonical_owner: canonicalOwner,
      related_records: relatedRecords,
      artifact_route_template: '/topic-selection/artifacts/{artifactRefId}' as const,
    };
    return {
      ...workingSetWithoutSummary,
      human_summary: this.buildHumanStageSummary(manifest, stage, workingSetWithoutSummary),
    };
  }

  private buildHumanStageSummary(
    manifest: TopicSelectionResearchStageManifest,
    stage: TopicSelectionResearchStageViewStage,
    workingSet: Omit<TopicSelectionResearchStageWorkingSet, 'human_summary'>,
  ): TopicSelectionResearchStageHumanSummary {
    const { manifest_entry: entry, current_packet: packet } = workingSet;
    const label = HUMAN_STAGE_LABELS[stage];
    if (entry.state === 'unavailable') {
      return {
        conclusions: [`${label}尚未形成可用的当前版本。`],
        evidence_and_counterevidence: [],
        alternatives_and_rejections: [],
        claim_and_falsification_boundaries: [],
        open_risks: entry.issue_codes.map((code) => `当前性检查未通过：${code}`),
        recommendation: '先完成或重建前置阶段，再重新生成本视图。',
        decision_requested: manifest.next_human_decision_stage
          ? `下一次人工判断位于“${HUMAN_STAGE_LABELS[manifest.next_human_decision_stage]}”。`
          : '当前没有待确认的人工决定。',
      };
    }

    if (stage === 'overview') {
      const currentStages = manifest.stages.filter((candidate) => candidate.state === 'current');
      const unavailableStages = manifest.stages.filter((candidate) => candidate.state === 'unavailable');
      return {
        conclusions: [
          `当前已有 ${currentStages.length} 个可读阶段，研究流程停留在“${manifest.current_stage ? HUMAN_STAGE_LABELS[manifest.current_stage] : '尚未开始'}”。`,
        ],
        evidence_and_counterevidence: currentStages
          .filter((candidate) => candidate.stage !== 'overview')
          .map((candidate) => `${HUMAN_STAGE_LABELS[candidate.stage]}：${candidate.status ?? '已有当前版本'}`),
        alternatives_and_rejections: [],
        claim_and_falsification_boundaries: [],
        open_risks: unavailableStages.map(
          (candidate) => `${HUMAN_STAGE_LABELS[candidate.stage]}：${candidate.issue_codes.join('、')}`,
        ),
        recommendation: manifest.next_human_decision_stage
          ? `先处理“${HUMAN_STAGE_LABELS[manifest.next_human_decision_stage]}”的人工审阅。`
          : '当前检查点链已完成，可按后续产品门禁继续。',
        decision_requested: manifest.next_human_decision_stage
          ? `请在“${HUMAN_STAGE_LABELS[manifest.next_human_decision_stage]}”查看完整材料并作出决定。`
          : '当前没有待确认的人工决定。',
      };
    }

    if (stage === 'value_feasibility') {
      const assessment = this.asRecord(workingSet.canonical_owner);
      const memo = this.asRecord(workingSet.related_records.reasoning_memo);
      const decision = this.asRecord(workingSet.related_records.current_disposition_decision);
      return {
        conclusions: this.uniqueStrings([
          this.stringField(assessment, 'value_summary'),
          this.stringField(memo, 'value_thesis'),
          entry.status ? `当前评估状态：${entry.status}` : '',
        ]),
        evidence_and_counterevidence: this.humanItems(workingSet.related_records.evidence_refs),
        alternatives_and_rejections: this.humanItems(decision?.blocking_contexts),
        claim_and_falsification_boundaries: this.uniqueStrings([
          this.stringField(assessment, 'strongest_claim_if_success'),
          this.stringField(assessment, 'fallback_claim_if_success'),
          this.stringField(assessment, 'ceiling_case'),
          this.stringField(assessment, 'floor_case'),
        ]),
        open_risks: this.uniqueStrings([
          ...this.stringArrayField(assessment, 'reviewer_objections'),
          ...this.stringArrayField(assessment, 'risk_notes'),
          ...this.stringArrayField(memo, 'top_objections'),
          ...topicSelectionRiskFindingRefs(this.functionalRefArrayField(assessment, 'artifact_refs'))
            .map((ref) => `可追踪风险记录：${ref.ref_id}`),
        ]),
        recommendation: this.stringField(decision, 'decision_rationale')
          || this.stringField(memo, 'disposition_bridge')
          || '依据当前价值评估决定继续、回环、暂存或停止。',
        decision_requested: this.stageDecisionRequest(manifest, stage, packet),
      };
    }

    if (stage === 'research_gap') {
      const rawReviewHistories = workingSet.related_records.arena_advisory_review_histories;
      const reviewHistories: TopicSelectionResearchArenaAdvisoryReviewHistory[] = Array.isArray(rawReviewHistories)
        ? (rawReviewHistories as TopicSelectionResearchArenaAdvisoryReviewHistory[])
        : [];
      const currentReviewHistory = reviewHistories.find(
        (history) => history.checkpoint_currentness === 'current',
      ) ?? null;
      const supersededReviewCount = reviewHistories
        .filter((history) => history.checkpoint_currentness === 'superseded')
        .reduce((count, history) => count + history.reviews.length, 0);
      const currentReviewSummaries = currentReviewHistory?.reviews.map((item) => {
        const response = this.arenaReviewResponseLabel(item.review.response);
        const binding = item.advancement_binding.status === 'confirmed'
          ? '已由正式人工推进决定确认'
          : '尚未形成正式推进决定';
        return `人工评议：${response}；${binding}。`;
      }) ?? [];
      const reopenSummaries = (currentReviewHistory?.reopen_signals ?? []).map((signal) => {
        const action = signal.signal_type === 'candidate_reopened'
          ? '重新开放了先前暂存或停止的候选'
          : '在停止、补证或重构建议下仍提出推进';
        return signal.status === 'confirmed'
          ? `人工决定已确认：${action}。`
          : `人工评议提出但尚未确认：${action}。`;
      });
      const advisory = this.asRecord(workingSet.related_records.arena_advisory);
      const candidateDispositions = Array.isArray(advisory?.candidate_dispositions)
        ? advisory.candidate_dispositions.map((value) => this.asRecord(value)).filter(
          (value): value is Record<string, unknown> => value !== null,
        )
        : [];
      const riskFindings = Array.isArray(workingSet.related_records.arena_risk_findings)
        ? workingSet.related_records.arena_risk_findings.map((value) => this.asRecord(value)).filter(
          (value): value is Record<string, unknown> => value !== null,
        )
        : [];
      const candidateEntries = Array.isArray(packet?.packet_payload.candidate_entries)
        ? packet.packet_payload.candidate_entries.map((value) => this.asRecord(value)).filter(
          (value): value is Record<string, unknown> => value !== null,
        )
        : [];
      const candidateEntryById = new Map(candidateEntries.flatMap((candidateEntry) => {
        const candidateRef = this.asRecord(candidateEntry.need_candidate_ref);
        const candidateId = this.stringField(candidateRef, 'ref_id');
        return candidateId ? [[candidateId, candidateEntry] as const] : [];
      }));
      const outcome = this.stringField(advisory, 'outcome');
      const issueCodes = this.stringArrayField(this.asRecord(packet?.packet_payload), 'arena_advisory_issue_codes');
      const candidateItems = candidateDispositions.map((disposition) => {
        const candidateRef = this.asRecord(disposition.candidate_ref);
        const candidateId = this.stringField(candidateRef, 'ref_id') || '未知候选';
        const candidateEntry = candidateEntryById.get(candidateId) ?? null;
        const candidateLabel = this.stringField(candidateEntry, 'candidate_need')
          || this.stringField(candidateEntry, 'unmet_need_statement')
          || candidateId;
        const dispositionLabel = this.arenaDispositionLabel(this.stringField(disposition, 'disposition'));
        const rationale = this.stringField(disposition, 'rationale');
        const reopeningConditions = this.stringArrayField(disposition, 'reopening_conditions');
        return [
          `候选“${candidateLabel}”：${dispositionLabel}。${rationale}`,
          reopeningConditions.length > 0 ? `重新开放条件：${reopeningConditions.join('；')}` : '',
        ].filter(Boolean).join(' ');
      });
      const unresolvedDissent = this.stringArrayField(advisory, 'unresolved_dissent');
      return {
        conclusions: this.uniqueStrings([
          outcome ? `多视角评议建议：${this.arenaOutcomeLabel(outcome)}` : '',
          this.stringField(advisory, 'summary'),
          ...currentReviewSummaries,
          supersededReviewCount > 0 ? `另有 ${supersededReviewCount} 条历史评议来自已被替代的检查点。` : '',
          `${label}已有当前版本，状态为 ${entry.status ?? 'current'}。`,
        ]),
        evidence_and_counterevidence: this.uniqueStrings(riskFindings.flatMap((artifact) => {
          const payload = this.asRecord(artifact.payload);
          const summary = this.stringField(payload, 'summary');
          return summary ? [summary] : [];
        })),
        alternatives_and_rejections: candidateItems.length > 0
          ? [...candidateItems, ...reopenSummaries]
          : [
            ...this.payloadItems(packet?.packet_payload ?? {}, ['candidate', 'alternative', 'reject']),
            ...reopenSummaries,
          ],
        claim_and_falsification_boundaries: [],
        open_risks: this.uniqueStrings([
          ...(packet?.open_objections.map((objection) => objection.summary) ?? []),
          ...unresolvedDissent.map((dissent) => `未解决分歧：${dissent}`),
          ...issueCodes.map((code) => `多视角评议未纳入审阅：${this.arenaIssueLabel(code)}`),
          ...reviewHistories.flatMap((history) => history.projection_issues)
            .map((issue) => `人工评议历史有一条记录未通过校验：${this.arenaReviewIssueLabel(issue.issue_code)}`),
        ]),
        recommendation: outcome
          ? this.arenaOutcomeRecommendation(outcome)
          : '当前没有可验证的多视角评议建议；按现有候选与证据完成严格人工审阅。',
        decision_requested: this.stageDecisionRequest(manifest, stage, packet),
      };
    }

    if (stage === 'topic_package') {
      const topicPackage = this.asRecord(workingSet.canonical_owner);
      const readiness = this.asRecord(workingSet.related_records.package_readiness_assessment);
      return {
        conclusions: this.uniqueStrings([
          this.stringField(topicPackage, 'contribution_summary'),
          this.stringField(topicPackage, 'research_background'),
          entry.status ? `当前选题包状态：${entry.status}` : '',
        ]),
        evidence_and_counterevidence: this.humanItems(topicPackage?.selected_evidence_refs),
        alternatives_and_rejections: this.stringArrayField(topicPackage, 'title_candidates'),
        claim_and_falsification_boundaries: this.uniqueStrings([
          ...this.stringArrayField(topicPackage, 'candidate_methods'),
          this.stringField(topicPackage, 'evaluation_plan'),
          ...this.stringArrayField(topicPackage, 'non_goals'),
        ]),
        open_risks: this.uniqueStrings([
          ...this.stringArrayField(topicPackage, 'key_risks'),
          ...this.humanItems(readiness?.blockers),
          ...this.humanItems(readiness?.warnings),
          ...topicSelectionRiskFindingRefs(this.functionalRefArrayField(topicPackage, 'artifact_refs'))
            .map((ref) => `可追踪风险记录：${ref.ref_id}`),
        ]),
        recommendation: this.stringArrayField(readiness, 'required_actions').length > 0
          ? `先完成：${this.stringArrayField(readiness, 'required_actions').join('；')}`
          : '按当前选题包状态进入晋级审阅。',
        decision_requested: this.stageDecisionRequest(manifest, stage, packet),
      };
    }

    const payload = packet?.packet_payload ?? {};
    return {
      conclusions: this.uniqueStrings([
        ...this.payloadItems(payload, ['summary', 'question', 'gap', 'mechanism', 'recommendation', 'contribution']),
        `${label}已有当前版本，状态为 ${entry.status ?? 'current'}。`,
      ]).slice(0, 8),
      evidence_and_counterevidence: this.payloadItems(
        payload,
        ['evidence', 'nearest', 'counter', 'disconfirm', 'conflict', 'source'],
      ).slice(0, 12),
      alternatives_and_rejections: this.payloadItems(
        payload,
        ['alternative', 'candidate', 'reject', 'disposition', 'option'],
      ).slice(0, 12),
      claim_and_falsification_boundaries: this.payloadItems(
        payload,
        ['claim', 'falsif', 'confound', 'proxy', 'ceiling', 'boundary', 'mechanism'],
      ).slice(0, 12),
      open_risks: this.uniqueStrings([
        ...(packet?.open_objections.map((objection) => objection.summary) ?? []),
        ...this.payloadItems(payload, ['risk', 'objection', 'blocker', 'warning', 'issue']),
        ...(packet && packet.required_action_refs.length > 0
          ? [`尚有 ${packet.required_action_refs.length} 项必须处理。`] : []),
      ]).slice(0, 12),
      recommendation: packet?.decision
        ? `已记录人工决定：${HUMAN_ACTION_LABELS[packet.decision.decision]}。${packet.decision.rationale}`
        : packet?.allowed_actions.includes('advance')
          ? '当前材料允许在审阅后接受并推进，也可选择回环、拒绝或暂缓。'
          : '先处理当前异议或必做事项，再决定是否推进。',
      decision_requested: this.stageDecisionRequest(manifest, stage, packet),
    };
  }

  private stageDecisionRequest(
    manifest: TopicSelectionResearchStageManifest,
    stage: TopicSelectionResearchStageViewStage,
    packet: TopicSelectionResearchCheckpointPacket | null,
  ): string {
    if (manifest.next_human_decision_stage !== stage) {
      return manifest.next_human_decision_stage
        ? `下一次人工判断位于“${HUMAN_STAGE_LABELS[manifest.next_human_decision_stage]}”。`
        : '当前没有待确认的人工决定。';
    }
    const actions = packet?.allowed_actions.map((action) => HUMAN_ACTION_LABELS[action]) ?? [];
    return actions.length > 0
      ? `请审阅本阶段并选择：${actions.join('、')}。`
      : '请审阅本阶段的当前材料并作出决定。';
  }

  private renderHumanStageMarkdown(
    manifest: TopicSelectionResearchStageManifest,
    workingSet: TopicSelectionResearchStageWorkingSet,
  ): string {
    const { manifest_entry: entry, human_summary: summary } = workingSet;
    const technicalRefs = [entry.authority_ref, entry.checkpoint_ref, entry.supersedes_ref]
      .filter((ref): ref is TopicSelectionFunctionalRef => ref !== null)
      .map((ref) => `${ref.ref_type}/${ref.ref_id}`);
    const artifactRefs = entry.artifact_refs.map((ref) => ref.ref_id);
    return [
      `# ${HUMAN_STAGE_LABELS[entry.stage]}`,
      '',
      `> 当前状态：${entry.state === 'current' ? '当前有效' : '尚不可用'}；流程位置：${manifest.current_stage ? HUMAN_STAGE_LABELS[manifest.current_stage] : '尚未开始'}`,
      '',
      '## 结论',
      this.markdownBullets(summary.conclusions),
      '',
      '## 证据与反证',
      this.markdownBullets(summary.evidence_and_counterevidence),
      '',
      '## 备选与拒绝理由',
      this.markdownBullets(summary.alternatives_and_rejections),
      '',
      '## 主张与证伪边界',
      this.markdownBullets(summary.claim_and_falsification_boundaries),
      '',
      '## 开放风险',
      this.markdownBullets(summary.open_risks),
      '',
      '## 建议',
      summary.recommendation,
      '',
      '## 下一次人工判断',
      summary.decision_requested,
      '',
      '## 技术追踪',
      `- Manifest：${manifest.manifest_hash}`,
      `- 阶段快照：${entry.snapshot_hash ?? '无'}`,
      `- 当前选择规则：${entry.current_selection_rule}`,
      `- 权威与检查点引用：${technicalRefs.join('；') || '无'}`,
      `- 可解析产物：${artifactRefs.join('；') || '无'}`,
    ].join('\n');
  }

  private payloadItems(payload: Record<string, unknown>, keyFragments: string[]): string[] {
    return this.uniqueStrings(
      Object.entries(payload).flatMap(([key, value]) =>
        keyFragments.some((fragment) => key.toLowerCase().includes(fragment))
          ? this.humanItems(value)
          : []
      ),
    );
  }

  private humanItems(value: unknown): string[] {
    if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
    if (typeof value === 'number' || typeof value === 'boolean') return [String(value)];
    if (Array.isArray(value)) return value.flatMap((item) => this.humanItems(item));
    const record = this.asRecord(value);
    if (!record) return [];
    for (const key of ['summary', 'title', 'claim', 'rationale', 'description', 'name', 'text', 'reason']) {
      const candidate = this.stringField(record, key);
      if (candidate) return [candidate];
    }
    return Object.values(record).flatMap((item) =>
      typeof item === 'string' ? this.humanItems(item) : []
    ).slice(0, 3);
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  private stringField(record: Record<string, unknown> | null, key: string): string {
    const value = record?.[key];
    return typeof value === 'string' ? value.trim() : '';
  }

  private stringArrayField(record: Record<string, unknown> | null, key: string): string[] {
    const value = record?.[key];
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
      : [];
  }

  private functionalRefArrayField(
    record: Record<string, unknown> | null,
    key: string,
  ): TopicSelectionFunctionalRef[] {
    const value = record?.[key];
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is TopicSelectionFunctionalRef => {
      const candidate = this.asRecord(item);
      return Boolean(this.stringField(candidate, 'ref_type') && this.stringField(candidate, 'ref_id'));
    });
  }

  private markdownBullets(items: string[]): string {
    return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- 暂无。';
  }

  private arenaDispositionLabel(disposition: string): string {
    const labels: Record<string, string> = {
      selected: '建议选择',
      parked: '暂存',
      dropped: '停止',
    };
    return labels[disposition] ?? disposition;
  }

  private arenaReviewResponseLabel(response: string): string {
    const labels: Record<string, string> = {
      accept: '接受评议建议',
      override: '覆盖评议建议',
      defer: '暂缓决定',
    };
    return labels[response] ?? response;
  }

  private arenaReviewIssueLabel(issueCode: string): string {
    const labels: Record<string, string> = {
      LOOKALIKE_REVIEW_ARTIFACT: '记录缺少专用来源标识',
      INVALID_REVIEW_PROVENANCE: '记录来源或人工身份不可信',
      INVALID_REVIEW_CHECKSUM: '记录内容校验失败',
      INVALID_REVIEW_BINDING: '记录绑定的检查点或证据版本不一致',
      INVALID_REVIEW_CLASSIFICATION: '记录中的接受或覆盖分类不一致',
    };
    return labels[issueCode] ?? '记录校验失败';
  }

  private arenaOutcomeLabel(outcome: string): string {
    const labels: Record<string, string> = {
      selected: '建议选择一个候选方向',
      none_viable: '当前没有值得继续的候选',
      evidence_expansion_required: '证据不足，补充证据后再判断',
      reframe_required: '当前范围需要重新界定',
    };
    return labels[outcome] ?? outcome;
  }

  private arenaOutcomeRecommendation(outcome: string): string {
    const recommendations: Record<string, string> = {
      selected: '多视角评议仅提供建议；请核对证据、反方意见和替代候选后，由研究者决定是否接受。',
      none_viable: '优先考虑结束当前候选集合；若仍要推进，需要明确说明不同意停止建议的证据依据。',
      evidence_expansion_required: '先按重新开放条件补充证据，再比较候选；也可以由研究者明确决定暂缓或覆盖该建议。',
      reframe_required: '先重新界定研究对象或候选范围，再生成并比较新的候选集合。',
    };
    return recommendations[outcome] ?? '审阅多视角评议建议及其证据后，由研究者决定下一步。';
  }

  private arenaIssueLabel(issueCode: string): string {
    const labels: Record<string, string> = {
      ARENA_ADVISORY_MIXED: '候选携带的评议版本不一致',
      ARENA_ADVISORY_UNVERIFIED: '当前环境无法核验评议记录',
      ARENA_ADVISORY_NOT_CURRENT: '评议已经过期',
      ARENA_ADVISORY_INCOMPLETE: '评议材料不完整',
      ARENA_ADVISORY_INVALID: '评议材料校验失败',
    };
    return labels[issueCode] ?? '评议材料暂不可用';
  }

  private unavailableStageManifestEntry(
    stage: TopicSelectionResearchStageViewStage,
    currentSelectionRule: TopicSelectionResearchStageManifestEntry['current_selection_rule'],
    issueCode = 'STAGE_NOT_MATERIALIZED',
  ): TopicSelectionResearchStageManifestEntry {
    return {
      stage,
      state: 'unavailable',
      current_selection_rule: currentSelectionRule,
      authority_ref: null,
      checkpoint_ref: null,
      supersedes_ref: null,
      snapshot_hash: null,
      status: null,
      source_refs: [],
      artifact_refs: [],
      issue_codes: [issueCode],
    };
  }

  private async currentValueStageManifestEntry(
    titleCardId: string,
    currentQuestionContractRef: TopicSelectionFunctionalRef | null,
  ): Promise<{
    currentDispositionDecisionId: string | null;
    entry: TopicSelectionResearchStageManifestEntry;
  }> {
    const repository = this.stageProjectionSources?.valueAssessmentRepository;
    if (!repository) {
      return {
        currentDispositionDecisionId: null,
        entry: this.unavailableStageManifestEntry('value_feasibility', 'value_disposition_is_current'),
      };
    }
    const [assessments, decisions] = await Promise.all([
      repository.listAssessmentsByTitleCardId(titleCardId),
      repository.listDispositionDecisionsByTitleCardId(titleCardId),
    ]);
    const currentDecisions = decisions.filter((decision) => decision.is_current);
    if (currentDecisions.length > 1) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Multiple current value disposition decisions exist for the stage manifest.');
    }
    const decision = currentDecisions[0];
    if (!decision) {
      return {
        currentDispositionDecisionId: null,
        entry: this.unavailableStageManifestEntry('value_feasibility', 'value_disposition_is_current'),
      };
    }
    const assessment = assessments.find(
      (candidate) => candidate.topic_value_assessment_id === decision.topic_value_assessment_id,
    );
    if (!assessment) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Current value disposition points to a missing value assessment.');
    }
    if (!currentQuestionContractRef) {
      return {
        currentDispositionDecisionId: null,
        entry: this.unavailableStageManifestEntry(
          'value_feasibility',
          'value_disposition_is_current',
          'CURRENT_QUESTION_CHECKPOINT_MISSING',
        ),
      };
    }
    if (
      currentQuestionContractRef.ref_type !== 'topic_question_contract'
      || currentQuestionContractRef.ref_id !== assessment.topic_question_contract_id
    ) {
      return {
        currentDispositionDecisionId: null,
        entry: this.unavailableStageManifestEntry(
          'value_feasibility',
          'value_disposition_is_current',
          'CURRENT_VALUE_UPSTREAM_STALE',
        ),
      };
    }
    if (assessment.freshness_status !== 'current') {
      return {
        currentDispositionDecisionId: null,
        entry: this.unavailableStageManifestEntry(
          'value_feasibility',
          'value_disposition_is_current',
          'CURRENT_VALUE_ASSESSMENT_STALE',
        ),
      };
    }
    const assessmentRef = this.ref('topic_value_assessment', assessment.topic_value_assessment_id, titleCardId);
    const decisionRef = this.ref('value_disposition_decision', decision.value_disposition_decision_id, titleCardId);
    const sourceRefs = this.uniqueRefs([
      decisionRef,
      this.ref('topic_question_contract', assessment.topic_question_contract_id, titleCardId),
      ...assessment.artifact_refs,
      ...decision.artifact_refs,
    ]);
    return {
      currentDispositionDecisionId: decision.value_disposition_decision_id,
      entry: {
        stage: 'value_feasibility',
        state: 'current',
        current_selection_rule: 'value_disposition_is_current',
        authority_ref: assessmentRef,
        checkpoint_ref: null,
        supersedes_ref: null,
        snapshot_hash: this.hash({ assessment, decision }),
        status: `${assessment.readiness_status}:${decision.decision}`,
        source_refs: sourceRefs,
        artifact_refs: sourceRefs.filter((ref) => ref.ref_type === 'artifact_ref'),
        issue_codes: [],
      },
    };
  }

  private async currentPackageStageManifestEntry(
    titleCardId: string,
    currentDispositionDecisionId: string | null,
  ): Promise<TopicSelectionResearchStageManifestEntry> {
    const repository = this.stageProjectionSources?.topicPackageRepository;
    if (!repository || !currentDispositionDecisionId) {
      return this.unavailableStageManifestEntry('topic_package', 'latest_created_at_then_id');
    }
    const packages = (await repository.listPackagesByTitleCardId(titleCardId))
      .filter((topicPackage) =>
        topicPackage.value_disposition_decision_id === currentDispositionDecisionId
      )
      .sort((left, right) =>
        left.created_at.localeCompare(right.created_at)
        || left.topic_package_id.localeCompare(right.topic_package_id)
      );
    const topicPackage = packages.at(-1);
    if (!topicPackage) {
      return this.unavailableStageManifestEntry('topic_package', 'latest_created_at_then_id');
    }
    const sourceRefs = this.uniqueRefs([
      topicPackage.value_disposition_decision_ref,
      topicPackage.topic_value_assessment_ref,
      topicPackage.topic_question_contract_ref,
      topicPackage.research_slice_ref,
      ...topicPackage.validated_need_refs,
      ...topicPackage.selected_evidence_refs,
      ...topicPackage.accepted_risk_refs,
      ...topicPackage.blocker_refs,
      ...topicPackage.recheck_request_refs,
      ...topicPackage.artifact_refs,
    ]);
    return {
      stage: 'topic_package',
      state: 'current',
      current_selection_rule: 'latest_created_at_then_id',
      authority_ref: topicPackage.topic_package_ref,
      checkpoint_ref: null,
      supersedes_ref: null,
      snapshot_hash: this.hash(topicPackage),
      status: topicPackage.package_readiness_status,
      source_refs: sourceRefs,
      artifact_refs: sourceRefs.filter((ref) => ref.ref_type === 'artifact_ref'),
      issue_codes: [],
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

  private async currentMaterialRiskFindingRefs(
    titleCardId: string,
  ): Promise<TopicSelectionFunctionalRef[]> {
    const valueRepository = this.stageProjectionSources?.valueAssessmentRepository;
    if (!valueRepository) return [];
    const [assessments, decisions] = await Promise.all([
      valueRepository.listAssessmentsByTitleCardId(titleCardId),
      valueRepository.listDispositionDecisionsByTitleCardId(titleCardId),
    ]);
    const currentDecisions = decisions.filter((decision) => decision.is_current);
    if (currentDecisions.length > 1) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Multiple current value disposition decisions exist for risk projection.');
    }
    const decision = currentDecisions[0];
    if (!decision) return [];
    const assessment = assessments.find(
      (candidate) => candidate.topic_value_assessment_id === decision.topic_value_assessment_id,
    );
    if (!assessment) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Current value disposition points to a missing assessment for risk projection.');
    }
    const packages = this.stageProjectionSources?.topicPackageRepository
      ? (await this.stageProjectionSources.topicPackageRepository.listPackagesByTitleCardId(titleCardId))
          .filter((topicPackage) => topicPackage.value_disposition_decision_id === decision.value_disposition_decision_id)
          .sort((left, right) => left.created_at.localeCompare(right.created_at)
            || left.topic_package_id.localeCompare(right.topic_package_id))
      : [];
    const currentPackage = packages.at(-1);
    return topicSelectionRiskFindingRefs(this.uniqueRefs([
      ...(assessment.risk_finding_refs ?? []),
      ...assessment.artifact_refs,
      ...(decision.risk_finding_refs ?? []),
      ...decision.artifact_refs,
      ...(currentPackage?.risk_finding_refs ?? []),
      ...(currentPackage?.artifact_refs ?? []),
    ]));
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
    let predecessor: TopicSelectionResearchCheckpointRecord | null = null;
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
        predecessor = null;
        continue;
      }
      const localDecision = await this.repository.findDecisionByCheckpointId(checkpoint.research_checkpoint_id);
      const predecessorRef = predecessor ? this.checkpointRef(predecessor) : null;
      const issueCodes = this.uniqueStrings([
        ...(checkpoint.provenance_class !== 'native' ? ['NATIVE_REVIEW_REQUIRED'] : []),
        ...(checkpoint.status !== 'decided' || !checkpoint.decision_authority_ref
          ? ['CHECKPOINT_NOT_ADVANCED'] : []),
        ...(localDecision && localDecision.decision !== 'advance' ? ['CHECKPOINT_DECISION_NOT_ADVANCE'] : []),
        ...(checkpoint.required_action_refs.length > 0 ? ['CHECKPOINT_REQUIRED_ACTIONS_OPEN'] : []),
        ...(this.blockingObjectionsForCheckpoint(objections, kind).length > 0
          ? ['CHECKPOINT_BLOCKING_OBJECTION_OPEN'] : []),
        ...(predecessorRef
          && !checkpoint.source_refs.some((ref) => this.refsEqual(ref, predecessorRef))
          ? ['CHECKPOINT_UPSTREAM_STALE'] : []),
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
      predecessor = checkpoint;
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
    if (payload.review_kind === 'question_contract' && !payload.objections_reviewed) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'An advancing question decision requires explicit human objection review.',
      );
    }
    const complete = payload.review_kind === 'evidence_landscape'
      ? payload.nearest_work_reviewed
        && payload.disconfirming_evidence_reviewed
        && payload.source_quality_reviewed
      : payload.mechanism_identifiable
        && payload.proxy_operationalized
        && payload.confounds_reviewed
        && payload.falsification_reviewed
        && payload.claim_ceiling_reviewed
        && payload.objections_reviewed;
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

  private checkpointRef(checkpoint: TopicSelectionResearchCheckpointRecord): TopicSelectionFunctionalRef {
    return this.ref('research_checkpoint', checkpoint.research_checkpoint_id, checkpoint.title_card_id);
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
    return topicSelectionNeedCandidateSemanticGroupKey(candidate);
  }

  private async projectGapArenaAdvisory(
    titleCardId: string,
    candidates: TopicSelectionNeedCandidateRecord[],
  ): Promise<GapArenaAdvisoryProjection> {
    const projected = candidates.filter((candidate) => candidate.current_arena_advisory !== null);
    if (projected.length === 0) return { advisory: null, issueCodes: [], sourceRefs: [] };
    if (projected.length !== candidates.length) {
      return { advisory: null, issueCodes: ['ARENA_ADVISORY_MIXED'], sourceRefs: [] };
    }
    const firstAdvice = projected[0]!.current_arena_advisory!;
    const sameProjectionIdentity = projected.every((candidate) => {
      const advice = candidate.current_arena_advisory!;
      return advice.support_only
        && advice.arena_session_id === firstAdvice.arena_session_id
        && advice.arena_synthesis_hash === firstAdvice.arena_synthesis_hash
        && this.refKey(advice.arena_synthesis_ref) === this.refKey(firstAdvice.arena_synthesis_ref);
    });
    if (!sameProjectionIdentity) {
      return { advisory: null, issueCodes: ['ARENA_ADVISORY_MIXED'], sourceRefs: [] };
    }
    if (!this.arenaRepository) {
      return { advisory: null, issueCodes: ['ARENA_ADVISORY_UNVERIFIED'], sourceRefs: [] };
    }
    const session = await this.arenaRepository.findCurrentSession(titleCardId, 'gap_portfolio');
    if (!session
      || session.arena_session_id !== firstAdvice.arena_session_id
      || session.title_card_id !== titleCardId
      || session.status !== 'synthesized'
      || !session.current_arena_key
      || !session.support_only) {
      return { advisory: null, issueCodes: ['ARENA_ADVISORY_NOT_CURRENT'], sourceRefs: [] };
    }
    if (!session.loop_transcript_ref
      || !session.loop_transcript_hash
      || this.refKey(session.loop_transcript_ref) !== this.refKey(firstAdvice.arena_synthesis_ref)
      || session.loop_transcript_hash !== firstAdvice.arena_synthesis_hash) {
      return { advisory: null, issueCodes: ['ARENA_ADVISORY_INCOMPLETE'], sourceRefs: [] };
    }
    const transcript = await this.controlPlane.getArtifactRef(session.loop_transcript_ref.ref_id);
    if (!transcript
      || transcript.title_card_id !== titleCardId
      || transcript.input_snapshot_id !== session.input_snapshot_id
      || transcript.checksum !== session.loop_transcript_hash
      || !transcript.payload
      || this.hash(transcript.payload) !== session.loop_transcript_hash) {
      return { advisory: null, issueCodes: ['ARENA_ADVISORY_INVALID'], sourceRefs: [] };
    }
    const transcriptPayload = this.asRecord(transcript.payload);
    const synthesis = transcriptPayload?.schema_version === 'TopicSelectionResearchArenaLoopTranscript@v2'
      && transcriptPayload.arena_session_id === session.arena_session_id
      && transcriptPayload.input_snapshot_id === session.input_snapshot_id
      && transcriptPayload.support_only === true
      && this.isArenaAdvisorySynthesis(transcriptPayload.advisory_synthesis)
      ? transcriptPayload.advisory_synthesis
      : null;
    const rawRiskFindingRefs = this.functionalRefs(transcriptPayload?.risk_finding_refs);
    const riskFindingRefs = rawRiskFindingRefs
      && topicSelectionRiskFindingRefs(rawRiskFindingRefs).length === rawRiskFindingRefs.length
      && rawRiskFindingRefs.every((ref) => !ref.title_card_id || ref.title_card_id === titleCardId)
      ? rawRiskFindingRefs
      : null;
    if (!synthesis || riskFindingRefs === null) {
      return { advisory: null, issueCodes: ['ARENA_ADVISORY_INVALID'], sourceRefs: [] };
    }
    const expectedTermination = synthesis.outcome === 'selected' ? 'recommendation_ready' : synthesis.outcome;
    if (session.termination_reason !== expectedTermination) {
      return { advisory: null, issueCodes: ['ARENA_ADVISORY_INVALID'], sourceRefs: [] };
    }
    const candidateRefs = candidates.map((candidate) => this.needCandidateRef(candidate));
    const dispositionByCandidate = new Map(
      synthesis.candidate_dispositions.map((disposition) => [this.refKey(disposition.candidate_ref), disposition]),
    );
    if (dispositionByCandidate.size !== candidateRefs.length
      || candidateRefs.some((ref) => !dispositionByCandidate.has(this.refKey(ref)))) {
      return { advisory: null, issueCodes: ['ARENA_ADVISORY_INCOMPLETE'], sourceRefs: [] };
    }
    const projectionMatches = candidates.every((candidate) => {
      const advice = candidate.current_arena_advisory!;
      const disposition = dispositionByCandidate.get(this.refKey(this.needCandidateRef(candidate)));
      if (!disposition) return false;
      return stableStringify({
        disposition: advice.disposition,
        drop_reason_code: advice.drop_reason_code,
        rationale: advice.rationale,
        reopening_conditions: advice.reopening_conditions,
        selected_against_candidate_ref: advice.selected_against_candidate_ref,
      }) === stableStringify({
        disposition: disposition.disposition,
        drop_reason_code: disposition.drop_reason_code,
        rationale: disposition.rationale,
        reopening_conditions: disposition.reopening_conditions,
        selected_against_candidate_ref: disposition.selected_against_candidate_ref,
      });
    });
    if (!projectionMatches) {
      return { advisory: null, issueCodes: ['ARENA_ADVISORY_INCOMPLETE'], sourceRefs: [] };
    }
    const sessionRef = this.ref(
      'research_arena_session',
      session.arena_session_id,
      titleCardId,
      session.input_snapshot_hash,
    );
    const inputSnapshotRef = this.ref(
      'input_snapshot',
      session.input_snapshot_id,
      titleCardId,
      session.input_snapshot_hash,
    );
    const advisory: TopicSelectionResearchGapArenaAdvisory = {
      schema_version: 'TopicSelectionResearchGapArenaAdvisory@v1',
      arena_session_ref: sessionRef,
      arena_input_snapshot_ref: inputSnapshotRef,
      arena_synthesis_ref: session.loop_transcript_ref,
      arena_synthesis_hash: session.loop_transcript_hash,
      outcome: synthesis.outcome,
      summary: synthesis.summary,
      candidate_dispositions: [...synthesis.candidate_dispositions]
        .sort((left, right) => this.refKey(left.candidate_ref).localeCompare(this.refKey(right.candidate_ref))),
      risk_finding_refs: this.uniqueRefs(riskFindingRefs),
      preserved_finding_ids: [...synthesis.preserved_finding_ids].sort(),
      unresolved_dissent: [...synthesis.unresolved_dissent],
      required_next_delta: synthesis.required_next_delta,
      support_only: true,
    };
    return {
      advisory,
      issueCodes: [],
      sourceRefs: this.uniqueRefs([
        sessionRef,
        inputSnapshotRef,
        session.loop_transcript_ref,
        ...riskFindingRefs,
      ]),
    };
  }

  private assertArenaReviewInput(
    checkpoint: TopicSelectionResearchCheckpointRecord,
    input: TopicSelectionResearchArenaAdvisoryReviewInput,
  ): void {
    if (!input.idempotency_key.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Arena advisory review idempotency_key is required.');
    }
    if (input.actor.actor_type !== 'human' || !input.actor.actor_id.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Arena advisory review requires an accountable human actor.');
    }
    if (!input.rationale.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Arena advisory review rationale is required.');
    }
    this.assertHash(input.confirmed_candidate_pool_hash, 'confirmed_candidate_pool_hash');
    this.assertHash(input.advisory_snapshot_hash, 'advisory_snapshot_hash');
    if (input.confirmed_input_snapshot_id !== checkpoint.input_snapshot_id
      || input.confirmed_candidate_pool_hash !== checkpoint.target_snapshot_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena advisory review identifies a stale gap checkpoint snapshot.');
    }
  }

  private requireGapArenaAdvisory(
    packet: TopicSelectionResearchCheckpointPacket,
  ): TopicSelectionResearchGapArenaAdvisory {
    const issueCodes = packet.packet_payload.arena_advisory_issue_codes;
    if (!Array.isArray(issueCodes) || issueCodes.some((code) => typeof code !== 'string')) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Gap checkpoint Arena advisory issue state is invalid.');
    }
    if (issueCodes.length > 0) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Gap checkpoint Arena advice is not reviewable.', {
        issue_codes: issueCodes,
      });
    }
    const advisory = this.asRecord(packet.packet_payload.arena_advisory);
    const candidateDispositions = advisory?.candidate_dispositions;
    const riskFindingRefs = this.functionalRefs(advisory?.risk_finding_refs);
    const arenaRefs = this.functionalRefs([
      advisory?.arena_session_ref,
      advisory?.arena_input_snapshot_ref,
      advisory?.arena_synthesis_ref,
    ]);
    const synthesisLike = advisory ? {
      schema_version: 'TopicSelectionResearchArenaAdvisorySynthesis@v1',
      outcome: advisory.outcome,
      summary: advisory.summary,
      candidate_dispositions: advisory.candidate_dispositions,
      preserved_finding_ids: advisory.preserved_finding_ids,
      unresolved_dissent: advisory.unresolved_dissent,
      required_next_delta: advisory.required_next_delta,
      support_only: advisory.support_only,
    } : null;
    if (!advisory
      || advisory.schema_version !== 'TopicSelectionResearchGapArenaAdvisory@v1'
      || advisory.support_only !== true
      || typeof advisory.arena_synthesis_hash !== 'string'
      || !/^[a-f0-9]{64}$/u.test(advisory.arena_synthesis_hash)
      || !arenaRefs
      || arenaRefs.length !== 3
      || !riskFindingRefs
      || !Array.isArray(candidateDispositions)
      || !this.isArenaAdvisorySynthesis(synthesisLike)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Gap checkpoint Arena advisory payload is invalid.');
    }
    return advisory as unknown as TopicSelectionResearchGapArenaAdvisory;
  }

  private normalizeGapSelectionReview(
    review: TopicSelectionGapSelectionReview,
  ): TopicSelectionGapSelectionReview {
    if (!review.research_checkpoint_id?.trim()
      || !/^[a-f0-9]{64}$/u.test(review.confirmed_candidate_pool_hash)
      || !review.selected_candidate_ref
      || !Array.isArray(review.candidate_reviews)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Arena advisory review has an invalid human gap-selection review.');
    }
    review.candidate_reviews.forEach((candidateReview) => {
      if (!candidateReview.need_candidate_ref
        || !['selected', 'viable_alternative', 'rejected'].includes(candidateReview.disposition)
        || !Array.isArray(candidateReview.distinct_from_selected_axes)
        || !candidateReview.rationale?.trim()) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Arena advisory review has an invalid candidate disposition.');
      }
    });
    return normalizeTopicSelectionGapSelectionReview(review);
  }

  private buildArenaHumanConfirmNeedIntent(
    checkpoint: TopicSelectionResearchCheckpointRecord,
    rawIntent: TopicSelectionHumanConfirmNeedIntentInput | TopicSelectionHumanConfirmNeedIntentRecord | null | undefined,
    humanReview: TopicSelectionGapSelectionReview | null,
    actor: { actor_type: 'human'; actor_id: string },
    allowLegacyMissing = false,
  ): TopicSelectionHumanConfirmNeedIntentRecord | null | undefined {
    if (!humanReview) {
      if (rawIntent !== null && rawIntent !== undefined) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'A non-advancing Arena label cannot carry HumanConfirmNeed intent.');
      }
      return rawIntent === undefined && allowLegacyMissing ? undefined : null;
    }
    if (rawIntent === null || rawIntent === undefined) {
      if (allowLegacyMissing && rawIntent === undefined) return undefined;
      throw new AppError(400, 'INVALID_PAYLOAD', 'An advancing Arena label requires the complete HumanConfirmNeed intent.');
    }
    const intent = this.asRecord(rawIntent);
    const confirmationInput = this.asRecord(intent?.confirmation_input);
    const gapReview = this.asRecord(confirmationInput?.gap_selection_review);
    if (!intent
      || intent.schema_version !== TOPIC_SELECTION_HUMAN_CONFIRM_NEED_INTENT_SCHEMA_VERSION
      || !this.isFunctionalRef(intent.adjudication_result_ref)
      || intent.adjudication_result_ref.ref_type !== 'validate_need_adjudication_result'
      || intent.adjudication_result_ref.title_card_id !== checkpoint.title_card_id
      || !this.isFunctionalRef(intent.output_validated_need_ref)
      || intent.output_validated_need_ref.ref_type !== 'validated_need'
      || intent.output_validated_need_ref.title_card_id !== checkpoint.title_card_id
      || !confirmationInput
      || confirmationInput.schema_version !== TOPIC_SELECTION_HUMAN_CONFIRMATION_INPUT_SCHEMA_VERSION
      || typeof confirmationInput.rationale !== 'string'
      || !confirmationInput.rationale.trim()
      || !Array.isArray(confirmationInput.accepted_risk_refs)
      || !Array.isArray(confirmationInput.required_check_results)
      || !this.asRecord(confirmationInput.accountable_human_ref)
      || confirmationInput.arena_advisory_review_ref !== null
      || !gapReview) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Arena label HumanConfirmNeed intent is invalid or has stale lineage.');
    }
    const accountableHuman = confirmationInput.accountable_human_ref as Record<string, unknown>;
    if (accountableHuman.actor_type !== 'human'
      || accountableHuman.actor_id !== actor.actor_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena label HumanConfirmNeed intent requires the same accountable human actor.');
    }
    const normalizedIntentReview = this.normalizeGapSelectionReview(
      gapReview as unknown as TopicSelectionGapSelectionReview,
    );
    if (stableStringify(normalizedIntentReview) !== stableStringify(humanReview)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena label HumanConfirmNeed intent changed the gap-selection review.');
    }
    const built = buildTopicSelectionHumanConfirmNeedIntent({
      schema_version: TOPIC_SELECTION_HUMAN_CONFIRM_NEED_INTENT_SCHEMA_VERSION,
      adjudication_result_ref: intent.adjudication_result_ref,
      output_validated_need_ref: intent.output_validated_need_ref,
      confirmation_input: {
        ...(confirmationInput as unknown as HumanConfirmationInput),
        gap_selection_review: normalizedIntentReview,
        arena_advisory_review_ref: null,
      },
    });
    if (typeof intent.intent_hash === 'string' && intent.intent_hash !== built.intent_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena label HumanConfirmNeed intent hash changed.');
    }
    return built;
  }

  private assertArenaHumanReviewScope(
    checkpoint: TopicSelectionResearchCheckpointRecord,
    advisory: TopicSelectionResearchGapArenaAdvisory,
    review: TopicSelectionGapSelectionReview,
  ): void {
    if (review.research_checkpoint_id !== checkpoint.research_checkpoint_id
      || review.confirmed_candidate_pool_hash !== checkpoint.target_snapshot_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Human candidate review is bound to another gap snapshot.');
    }
    const advisoryByRef = new Map(
      advisory.candidate_dispositions.map((disposition) => [this.refKey(disposition.candidate_ref), disposition]),
    );
    const humanByRef = new Map<string, TopicSelectionGapSelectionReview['candidate_reviews'][number]>();
    for (const candidateReview of review.candidate_reviews) {
      const key = this.refKey(candidateReview.need_candidate_ref);
      if (!advisoryByRef.has(key)) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Human candidate review contains a stale or foreign candidate ref.');
      }
      if (humanByRef.has(key)) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Human candidate review contains duplicate candidate refs.');
      }
      humanByRef.set(key, candidateReview);
    }
    if (humanByRef.size !== advisoryByRef.size) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Human candidate review must cover the complete exposed Arena portfolio.');
    }
    const selected = [...humanByRef.values()].filter((candidateReview) => candidateReview.disposition === 'selected');
    if (selected.length !== 1
      || this.refKey(selected[0]!.need_candidate_ref) !== this.refKey(review.selected_candidate_ref)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Human candidate review requires one exact selected candidate.');
    }
  }

  private classifyArenaAdvisoryReview(
    advisory: TopicSelectionResearchGapArenaAdvisory,
    humanReview: TopicSelectionGapSelectionReview | null,
    requestedResponse?: TopicSelectionResearchArenaAdvisoryReviewInput['response'],
  ): {
    response: 'accept' | 'override' | 'defer';
    reasonCodes: TopicSelectionResearchArenaAdvisoryReviewReasonCode[];
  } {
    if (!humanReview) {
      if (requestedResponse === 'defer') return { response: 'defer', reasonCodes: ['REVIEW_DEFERRED'] };
      if (requestedResponse === 'accept' && advisory.outcome !== 'selected') {
        return { response: 'accept', reasonCodes: ['AGREES_WITH_ARENA'] };
      }
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'Accepting a selected path or overriding Arena advice requires the exact proposed human candidate review.',
      );
    }
    const reasons = new Set<TopicSelectionResearchArenaAdvisoryReviewReasonCode>();
    const humanByRef = new Map(
      humanReview.candidate_reviews.map((candidateReview) => [this.refKey(candidateReview.need_candidate_ref), candidateReview]),
    );
    if (advisory.outcome === 'none_viable') reasons.add('ADVANCE_AGAINST_NONE_VIABLE');
    if (advisory.outcome === 'evidence_expansion_required') reasons.add('ADVANCE_BEFORE_EVIDENCE_EXPANSION');
    if (advisory.outcome === 'reframe_required') reasons.add('ADVANCE_WITHOUT_REFRAME');
    const selectedAdvice = advisory.candidate_dispositions.find(
      (disposition) => this.refKey(disposition.candidate_ref) === this.refKey(humanReview.selected_candidate_ref),
    );
    if (selectedAdvice?.disposition === 'parked') reasons.add('SELECTED_PARKED_CANDIDATE');
    if (selectedAdvice?.disposition === 'dropped') reasons.add('SELECTED_DROPPED_CANDIDATE');
    for (const disposition of advisory.candidate_dispositions) {
      const humanDisposition = humanByRef.get(this.refKey(disposition.candidate_ref))?.disposition;
      const expectedHumanDisposition = disposition.disposition === 'selected'
        ? 'selected'
        : disposition.disposition === 'parked'
          ? 'viable_alternative'
          : 'rejected';
      if (humanDisposition !== expectedHumanDisposition
        && this.refKey(disposition.candidate_ref) !== this.refKey(humanReview.selected_candidate_ref)) {
        reasons.add('NON_SELECTED_DISPOSITION_CHANGED');
      }
    }
    if (reasons.size === 0 && advisory.outcome === 'selected') {
      return { response: 'accept', reasonCodes: ['AGREES_WITH_ARENA'] };
    }
    const ordered = TOPIC_SELECTION_RESEARCH_ARENA_ADVISORY_REVIEW_REASON_CODES
      .filter((code): code is TopicSelectionResearchArenaAdvisoryReviewReasonCode => reasons.has(code));
    return { response: 'override', reasonCodes: ordered };
  }

  private decodeArenaReviewArtifact(
    checkpoint: TopicSelectionResearchCheckpointRecord,
    advisory: TopicSelectionResearchGapArenaAdvisory,
    artifact: TopicSelectionArtifactRefRecord,
  ): TopicSelectionResearchArenaAdvisoryReviewRecord {
    const payload = this.arenaReviewPayload(artifact);
    const stableKey = artifact.stable_key;
    const expectedReviewId = stableKey
      ? `topic_selection_research_arena_advisory_review_${this.hash({ stable_key: stableKey })}`
      : null;
    const actor = this.asRecord(payload.actor);
    const actorKeys = actor ? Object.keys(actor).sort() : [];
    if (!stableKey?.startsWith(ARENA_REVIEW_STABLE_KEY_PREFIX)
      || artifact.created_by !== 'human'
      || !actor
      || payload.review_id !== expectedReviewId
      || actor.actor_type !== 'human'
      || typeof actor.actor_id !== 'string'
      || !actor.actor_id.trim()
      || stableStringify(actorKeys) !== stableStringify(['actor_id', 'actor_type'])) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Artifact ref is not a dedicated human Arena advisory review.',
        { projection_issue_code: 'INVALID_REVIEW_PROVENANCE' },
      );
    }
    let humanReview: TopicSelectionGapSelectionReview | null = null;
    if (payload.human_gap_selection_review !== null) {
      const humanReviewRecord = this.asRecord(payload.human_gap_selection_review);
      if (!humanReviewRecord) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          'Arena advisory review human review binding is invalid.',
          { projection_issue_code: 'INVALID_REVIEW_BINDING' },
        );
      }
      humanReview = this.normalizeGapSelectionReview(
        humanReviewRecord as unknown as TopicSelectionGapSelectionReview,
      );
      this.assertArenaHumanReviewScope(checkpoint, advisory, humanReview);
    }
    const requestedResponse = typeof payload.response === 'string'
      && ['accept', 'override', 'defer'].includes(payload.response)
      ? payload.response as TopicSelectionResearchArenaAdvisoryReviewInput['response']
      : undefined;
    if (!requestedResponse || typeof payload.rationale !== 'string' || !payload.rationale.trim()) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Arena advisory review response or rationale is invalid.',
        { projection_issue_code: 'INVALID_REVIEW_CLASSIFICATION' },
      );
    }
    const hasHumanConfirmNeedIntent = Object.prototype.hasOwnProperty.call(
      payload,
      'human_confirm_need_intent',
    );
    const humanConfirmNeedIntent = this.buildArenaHumanConfirmNeedIntent(
      checkpoint,
      hasHumanConfirmNeedIntent
        ? payload.human_confirm_need_intent as TopicSelectionHumanConfirmNeedIntentRecord | null
        : undefined,
      humanReview,
      { actor_type: 'human', actor_id: actor.actor_id },
      true,
    );
    let classification: ReturnType<TopicSelectionResearchCheckpointService['classifyArenaAdvisoryReview']>;
    try {
      classification = this.classifyArenaAdvisoryReview(advisory, humanReview, requestedResponse);
    } catch (error) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        error instanceof Error ? error.message : 'Arena advisory review classification is invalid.',
        { projection_issue_code: 'INVALID_REVIEW_CLASSIFICATION' },
      );
    }
    const expected = {
      schema_version: TOPIC_SELECTION_RESEARCH_ARENA_ADVISORY_REVIEW_SCHEMA_VERSION,
      title_card_id: checkpoint.title_card_id,
      research_checkpoint_id: checkpoint.research_checkpoint_id,
      gap_input_snapshot_id: checkpoint.input_snapshot_id,
      confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
      advisory_snapshot_hash: this.hash(advisory),
      response: classification.response,
      rationale: payload.rationale.trim(),
      reason_codes: classification.reasonCodes,
      actor: { actor_type: 'human' as const, actor_id: actor.actor_id },
      human_gap_selection_review: humanReview,
      human_gap_selection_review_hash: humanReview ? this.hash(humanReview) : null,
      selected_candidate_ref: humanReview?.selected_candidate_ref ?? null,
      ...(hasHumanConfirmNeedIntent
        ? { human_confirm_need_intent: humanConfirmNeedIntent ?? null }
        : {}),
      support_only: true as const,
    };
    try {
      return this.assertArenaReviewArtifactMatches(artifact, expected);
    } catch (error) {
      if (error instanceof AppError && error.details?.projection_issue_code) throw error;
      const classificationChanged = payload.response !== expected.response
        || stableStringify(payload.reason_codes) !== stableStringify(expected.reason_codes);
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        error instanceof Error ? error.message : 'Arena advisory review binding content changed.',
        {
          projection_issue_code: classificationChanged
            ? 'INVALID_REVIEW_CLASSIFICATION'
            : 'INVALID_REVIEW_BINDING',
        },
      );
    }
  }

  private humanDecisionBindsArenaReview(
    decision: TopicSelectionHumanConfirmedDecisionRecord,
    reviewRef: TopicSelectionFunctionalRef,
    review: TopicSelectionResearchArenaAdvisoryReviewRecord,
  ): boolean {
    const exactReviewRef = decision.artifact_refs.some((ref) =>
      ref.ref_type === reviewRef.ref_type
      && ref.ref_id === reviewRef.ref_id
      && (ref.version_id ?? null) === (reviewRef.version_id ?? null)
      && (ref.title_card_id ?? null) === (reviewRef.title_card_id ?? null)
    );
    return decision.title_card_id === review.title_card_id
      && decision.decision_type === 'confirm'
      && decision.actor.actor_type === 'human'
      && decision.actor.actor_id === review.actor.actor_id
      && decision.target_ref.ref_type === 'validated_need'
      && decision.target_ref.title_card_id === review.title_card_id
      && decision.resulting_authority_refs.some((ref) => this.refsEqual(ref, decision.target_ref))
      && exactReviewRef;
  }

  private arenaReviewProjectionIssueCode(
    error: unknown,
  ): TopicSelectionResearchArenaAdvisoryReviewProjectionIssueCode {
    if (error instanceof AppError) {
      const issueCode = error.details?.projection_issue_code;
      if (issueCode === 'LOOKALIKE_REVIEW_ARTIFACT'
        || issueCode === 'INVALID_REVIEW_PROVENANCE'
        || issueCode === 'INVALID_REVIEW_CHECKSUM'
        || issueCode === 'INVALID_REVIEW_BINDING'
        || issueCode === 'INVALID_REVIEW_CLASSIFICATION') {
        return issueCode;
      }
    }
    return 'INVALID_REVIEW_BINDING';
  }

  private arenaReviewPayload(artifact: TopicSelectionArtifactRefRecord): Record<string, unknown> {
    const payload = this.asRecord(artifact.payload);
    if (!payload
      || artifact.artifact_kind !== 'structured_output'
      || artifact.storage_kind !== 'inline'
      || artifact.checksum !== this.hash(payload)
      || payload.schema_version !== TOPIC_SELECTION_RESEARCH_ARENA_ADVISORY_REVIEW_SCHEMA_VERSION
      || typeof payload.review_id !== 'string'
      || typeof payload.rationale !== 'string') {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Arena advisory review artifact is invalid or checksum-drifted.',
        { projection_issue_code: 'INVALID_REVIEW_CHECKSUM' },
      );
    }
    return payload;
  }

  private assertArenaReviewArtifactMatches(
    artifact: TopicSelectionArtifactRefRecord,
    expected: Omit<TopicSelectionResearchArenaAdvisoryReviewPayload, 'review_id'>,
  ): TopicSelectionResearchArenaAdvisoryReviewRecord {
    const payload = this.arenaReviewPayload(artifact);
    const reasonCodes = payload.reason_codes;
    const stableKey = artifact.stable_key;
    const expectedReviewId = stableKey
      ? `topic_selection_research_arena_advisory_review_${this.hash({ stable_key: stableKey })}`
      : null;
    if (!stableKey?.startsWith(ARENA_REVIEW_STABLE_KEY_PREFIX)
      || artifact.created_by !== 'human'
      || payload.review_id !== expectedReviewId
      || artifact.title_card_id !== expected.title_card_id
      || artifact.input_snapshot_id !== expected.gap_input_snapshot_id
      || !Array.isArray(reasonCodes)
      || reasonCodes.some((code) => typeof code !== 'string' || !ARENA_REVIEW_REASON_SET.has(code))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Artifact ref is not a dedicated human Arena advisory review.');
    }
    const comparable = {
      schema_version: payload.schema_version,
      title_card_id: payload.title_card_id,
      research_checkpoint_id: payload.research_checkpoint_id,
      gap_input_snapshot_id: payload.gap_input_snapshot_id,
      confirmed_candidate_pool_hash: payload.confirmed_candidate_pool_hash,
      advisory_snapshot_hash: payload.advisory_snapshot_hash,
      response: payload.response,
      rationale: payload.rationale,
      reason_codes: payload.reason_codes,
      actor: payload.actor,
      human_gap_selection_review: payload.human_gap_selection_review,
      human_gap_selection_review_hash: payload.human_gap_selection_review_hash,
      selected_candidate_ref: payload.selected_candidate_ref,
      ...(Object.prototype.hasOwnProperty.call(payload, 'human_confirm_need_intent')
        || Object.prototype.hasOwnProperty.call(expected, 'human_confirm_need_intent')
        ? { human_confirm_need_intent: payload.human_confirm_need_intent }
        : {}),
      support_only: payload.support_only,
    };
    if (stableStringify(comparable) !== stableStringify(expected)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena advisory review idempotency or binding content changed.');
    }
    return {
      ...(payload as unknown as TopicSelectionResearchArenaAdvisoryReviewPayload),
      created_at: artifact.created_at,
    };
  }

  private arenaReviewResult(
    artifact: TopicSelectionArtifactRefRecord,
    expected: TopicSelectionResearchArenaAdvisoryReviewPayload,
  ): TopicSelectionResearchArenaAdvisoryReviewResult {
    const { review_id: expectedReviewId, ...expectedComparable } = expected;
    const review = this.assertArenaReviewArtifactMatches(artifact, expectedComparable);
    if (review.review_id !== expectedReviewId) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena advisory review stable identity changed.');
    }
    return {
      review_ref: this.ref(
        'artifact_ref',
        artifact.artifact_ref_id,
        expected.title_card_id,
        TOPIC_SELECTION_RESEARCH_ARENA_ADVISORY_REVIEW_SCHEMA_VERSION,
      ),
      review,
    };
  }

  private isArenaAdvisorySynthesis(value: unknown): value is TopicSelectionResearchArenaAdvisorySynthesis {
    const synthesis = this.asRecord(value);
    if (!synthesis
      || synthesis.schema_version !== 'TopicSelectionResearchArenaAdvisorySynthesis@v1'
      || typeof synthesis.outcome !== 'string'
      || !ARENA_OUTCOME_SET.has(synthesis.outcome)
      || typeof synthesis.summary !== 'string'
      || !synthesis.summary.trim()
      || synthesis.support_only !== true
      || !Array.isArray(synthesis.candidate_dispositions)
      || synthesis.candidate_dispositions.length === 0
      || !synthesis.candidate_dispositions.every((item) => this.isArenaCandidateDisposition(item))
      || !this.isStringArray(synthesis.preserved_finding_ids)
      || !this.isStringArray(synthesis.unresolved_dissent)
      || !(synthesis.required_next_delta === null
        || (typeof synthesis.required_next_delta === 'string'
          && ARENA_DELTA_SET.has(synthesis.required_next_delta)))) {
      return false;
    }
    return true;
  }

  private isArenaCandidateDisposition(
    value: unknown,
  ): value is TopicSelectionResearchArenaAdvisoryCandidateDisposition {
    const disposition = this.asRecord(value);
    if (!disposition
      || !this.isFunctionalRef(disposition.candidate_ref)
      || typeof disposition.disposition !== 'string'
      || !ARENA_DISPOSITION_SET.has(disposition.disposition)
      || typeof disposition.rationale !== 'string'
      || !disposition.rationale.trim()
      || !(disposition.drop_reason_code === null
        || (typeof disposition.drop_reason_code === 'string'
          && ARENA_DROP_REASON_SET.has(disposition.drop_reason_code)))
      || !this.isStringArray(disposition.reopening_conditions)
      || !(disposition.selected_against_candidate_ref === null
        || this.isFunctionalRef(disposition.selected_against_candidate_ref))
      || !Array.isArray(disposition.role_positions)
      || disposition.role_positions.length !== 2) {
      return false;
    }
    return disposition.role_positions.every((value) => {
      const position = this.asRecord(value);
      return Boolean(position
        && typeof position.participant_role === 'string'
        && ARENA_ROLE_SET.has(position.participant_role)
        && typeof position.recommended_disposition === 'string'
        && ARENA_DISPOSITION_SET.has(position.recommended_disposition));
    });
  }

  private functionalRefs(value: unknown): TopicSelectionFunctionalRef[] | null {
    return Array.isArray(value) && value.every((item) => this.isFunctionalRef(item))
      ? value
      : null;
  }

  private isFunctionalRef(value: unknown): value is TopicSelectionFunctionalRef {
    const ref = this.asRecord(value);
    return Boolean(ref
      && typeof ref.ref_type === 'string'
      && ref.ref_type.trim()
      && typeof ref.ref_id === 'string'
      && ref.ref_id.trim()
      && (ref.version_id === undefined || ref.version_id === null || typeof ref.version_id === 'string')
      && (ref.title_card_id === undefined || ref.title_card_id === null || typeof ref.title_card_id === 'string'));
  }

  private isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string' && Boolean(item.trim()));
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
