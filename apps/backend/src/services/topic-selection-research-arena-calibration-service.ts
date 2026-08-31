import { Ajv } from 'ajv';
import {
  topicSelectionFunctionalRefSchema,
  type TopicSelectionArtifactRefRecord,
  type TopicSelectionFunctionalRef,
  type TopicSelectionHumanConfirmedDecisionRecord,
  type TopicSelectionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { TOPIC_SELECTION_CANDIDATE_DROP_REASON_CODES } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_CASE_TYPES,
  TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_METRIC_KEYS,
  createTopicSelectionOfflineFrozenInputBundle,
  type TopicSelectionOfflineEvaluationCaseRecord,
  type TopicSelectionOfflineEvaluationCaseResultRecord,
  type TopicSelectionOfflineEvaluationMetricKey,
  type TopicSelectionOfflineEvaluationMetricResultRecord,
  type TopicSelectionOfflineEvaluationObservedOutput,
  type TopicSelectionOfflineEvaluationRunRecord,
  type TopicSelectionReplayDiffRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-offline-evaluation-replay-contracts';
import {
  TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_MEMBER_ROLES,
  TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_OVERRIDE_CATEGORIES,
  topicSelectionResearchArenaCalibrationProtocolV2Schema,
  topicSelectionResearchArenaCalibrationProtocolSlotSchema,
  topicSelectionResearchArenaCalibrationCaseResultSchema,
  type TopicSelectionResearchArenaCalibrationCaseCreateRequest,
  type TopicSelectionResearchArenaCalibrationCaseCreateRequestV1,
  type TopicSelectionResearchArenaCalibrationCaseMemberInput,
  type TopicSelectionResearchArenaCalibrationCaseResult,
  type TopicSelectionResearchArenaCalibrationCoverageGap,
  type TopicSelectionResearchArenaCalibrationDatasetCreateRequest,
  type TopicSelectionResearchArenaCalibrationExecutionAccounting,
  type TopicSelectionResearchArenaCalibrationHardBlocker,
  type TopicSelectionResearchArenaCalibrationHumanLabelCounts,
  type TopicSelectionResearchArenaCalibrationMemberRecipe,
  type TopicSelectionResearchArenaCalibrationMemberResult,
  type TopicSelectionResearchArenaCalibrationMemberRole,
  type TopicSelectionResearchArenaCalibrationProtocolSlot,
  type TopicSelectionResearchArenaCalibrationProtocolV2,
  type TopicSelectionResearchArenaCalibrationReport,
  type TopicSelectionResearchArenaCalibrationRunCreateRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-calibration-contracts';
import type {
  TopicSelectionResearchArenaAdvisoryReviewHistory,
  TopicSelectionResearchStageManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-checkpoint-contracts';
import type {
  TopicSelectionResearchArenaRoleExecutionRecord,
  TopicSelectionResearchArenaSessionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionControlPlaneRepository } from '../repositories/topic-selection-control-plane.repository.js';
import type { TopicSelectionOfflineEvaluationReplayRepository } from '../repositories/topic-selection-offline-evaluation-replay.repository.js';
import type { TopicSelectionResearchArenaRepository } from '../repositories/topic-selection-research-arena.repository.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import type { TopicSelectionOfflineEvaluationReplayService } from './topic-selection-offline-evaluation-replay-service.js';

type ControlPlaneReads = Pick<
  TopicSelectionControlPlaneRepository,
  'findInputSnapshotById' | 'findArtifactRefById' | 'findHumanConfirmedDecisionById'
>;

type AdvisoryReviewHistoryReader = {
  getArenaAdvisoryReviewHistory(
    checkpointId: string,
  ): Promise<TopicSelectionResearchArenaAdvisoryReviewHistory>;
  getArenaAdvisoryReviewHistoryForSession(
    titleCardId: string,
    arenaSessionId: string,
  ): Promise<TopicSelectionResearchArenaAdvisoryReviewHistory | null>;
  getStageManifest(titleCardId: string): Promise<TopicSelectionResearchStageManifest>;
};

type ServiceOptions = {
  now?: () => string;
};

type FrozenMember = {
  member_role: TopicSelectionResearchArenaCalibrationMemberRole;
  arena_session_id: string;
  research_checkpoint_id: string | null;
  source_hash: string;
};

type FrozenCasePayload = {
  schema_version: 'TopicSelectionResearchArenaCalibrationFrozenCase@v1';
  members: FrozenMember[];
};

type ProtocolDatasetPayload = {
  schema_version: 'TopicSelectionResearchArenaCalibrationDataset@v2';
  evaluation_mode: 'canonical_owner_reload';
  protocol_manifest: TopicSelectionResearchArenaCalibrationProtocolV2;
  support_only: true;
};

type PreRegisteredCasePayload = {
  schema_version: 'TopicSelectionResearchArenaCalibrationPreRegisteredCase@v2';
  protocol_hash: string;
  protocol_slot: TopicSelectionResearchArenaCalibrationProtocolSlot;
  work_avoided_baseline: {
    title_card_id: string;
    manifest_hash: string;
    unavailable_stage_keys: string[];
  } | null;
};

type ProtocolRunPayload = {
  schema_version: 'TopicSelectionResearchArenaCalibrationRun@v2';
  replay_mode?: 'frozen_snapshot_evaluation';
  stage?: 'research_arena';
  evaluation_mode: 'canonical_owner_reload';
  protocol_hash: string;
  cases: Array<{
    case_id: string;
    case_key: string;
    case_hash: string;
  }>;
  provider_execution_allowed: false;
  authority_writes_allowed: false;
  support_only: true;
  evaluated_from_canonical_owners?: true;
};

type MemberMeasurementContext = {
  recipe: TopicSelectionResearchArenaCalibrationMemberRecipe;
  workAvoidedStageKeys: TopicSelectionResearchArenaCalibrationProtocolSlot['work_avoided_stage_keys'];
  workAvoidedBaseline: PreRegisteredCasePayload['work_avoided_baseline'];
  history: TopicSelectionResearchArenaAdvisoryReviewHistory | null;
};

type ExecutionAccounting = TopicSelectionResearchArenaCalibrationExecutionAccounting;
type MemberObservation = TopicSelectionResearchArenaCalibrationMemberResult;
type CaseObservation = TopicSelectionResearchArenaCalibrationCaseResult;

type LoadedMember = {
  session: TopicSelectionResearchArenaSessionRecord;
  history: TopicSelectionResearchArenaAdvisoryReviewHistory | null;
  frozen: FrozenMember;
  sourceRefs: TopicSelectionFunctionalRef[];
  observation: MemberObservation;
};

const schemaValidator = new Ajv({ allErrors: true, strict: false, removeAdditional: false });
const caseObservationValidator = schemaValidator.compile<CaseObservation>(
  topicSelectionResearchArenaCalibrationCaseResultSchema,
);
const protocolV2Validator = schemaValidator.compile<TopicSelectionResearchArenaCalibrationProtocolV2>(
  topicSelectionResearchArenaCalibrationProtocolV2Schema,
);
const preRegisteredCasePayloadValidator = schemaValidator.compile<PreRegisteredCasePayload>({
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'protocol_hash',
    'protocol_slot',
    'work_avoided_baseline',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaCalibrationPreRegisteredCase@v2' },
    protocol_hash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    protocol_slot: topicSelectionResearchArenaCalibrationProtocolSlotSchema,
    work_avoided_baseline: {
      anyOf: [{
        type: 'object',
        additionalProperties: false,
        required: ['title_card_id', 'manifest_hash', 'unavailable_stage_keys'],
        properties: {
          title_card_id: { type: 'string', minLength: 1 },
          manifest_hash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
          unavailable_stage_keys: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            uniqueItems: true,
          },
        },
      }, { type: 'null' }],
    },
  },
});
const protocolRunPayloadValidator = schemaValidator.compile<ProtocolRunPayload>({
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'replay_mode',
    'stage',
    'evaluation_mode',
    'protocol_hash',
    'cases',
    'provider_execution_allowed',
    'authority_writes_allowed',
    'support_only',
  ],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaCalibrationRun@v2' },
    replay_mode: { const: 'frozen_snapshot_evaluation' },
    stage: { const: 'research_arena' },
    evaluation_mode: { const: 'canonical_owner_reload' },
    protocol_hash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    cases: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      uniqueItems: true,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['case_id', 'case_key', 'case_hash'],
        properties: {
          case_id: { type: 'string', minLength: 1 },
          case_key: { type: 'string', minLength: 1 },
          case_hash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
        },
      },
    },
    provider_execution_allowed: { const: false },
    authority_writes_allowed: { const: false },
    support_only: { const: true },
    evaluated_from_canonical_owners: { const: true },
  },
});
const functionalRefValidator = schemaValidator.compile<TopicSelectionFunctionalRef>(
  topicSelectionFunctionalRefSchema,
);
const frozenCasePayloadValidator = schemaValidator.compile<FrozenCasePayload>({
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'members'],
  properties: {
    schema_version: { const: 'TopicSelectionResearchArenaCalibrationFrozenCase@v1' },
    members: {
      type: 'array',
      minItems: 1,
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'member_role',
          'arena_session_id',
          'research_checkpoint_id',
          'source_hash',
        ],
        properties: {
          member_role: { enum: [...TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_MEMBER_ROLES] },
          arena_session_id: { type: 'string', minLength: 1 },
          research_checkpoint_id: {
            anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }],
          },
          source_hash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
        },
      },
    },
  },
});

const REQUIRED_ROLES = new Set(['opportunity_scout', 'prior_art_topic_killer']);

const COVERAGE_GAP_LABELS = {
  MISSING_FIRST_DOMINANCE_PAIR: '缺少第一组可比较的优劣案例',
  MISSING_SECOND_DOMINANCE_PAIR: '缺少第二组可比较的优劣案例',
  MISSING_CAUSAL_PERTURBATION: '缺少应当改变结论的关键证据扰动',
  MISSING_IRRELEVANT_PERTURBATION: '缺少不应改变结论的无关证据扰动',
  MISSING_SUCCESSFUL_NON_ADVANCE: '缺少经确认的成功停止或暂缓案例',
  MISSING_ADVANCING_CASE: '缺少经确认的继续推进案例',
  MISSING_PRODUCT_V2_EXECUTION: '缺少可由产品审计验证的双角色执行',
  MISSING_EVIDENCE_GROUNDING: '部分判断尚不能回溯到可解析文献证据',
  MISSING_EXECUTION_INDEPENDENCE: '尚未证明两个角色在首轮彼此独立',
  MISSING_REPLAY_INTEGRITY: '尚未完成一致的确定性回放',
  MISSING_ACCEPT_LABEL: '缺少人工接受建议的样本',
  MISSING_OVERRIDE_LABEL: '缺少人工推翻建议的样本',
  MISSING_NON_ADVANCE_LABEL: '缺少人工确认停止或暂缓合理的样本',
  MISSING_MEMBER_LABEL_COVERAGE: '部分案例成员缺少唯一且指定的人工作答',
  MISSING_COST_LATENCY_ACCOUNTING: '成本、耗时或人工暂停次数记录不完整',
  MISSING_MEASURED_WORK_AVOIDED: '尚未测得实际减少的后续工作',
} satisfies Record<TopicSelectionResearchArenaCalibrationCoverageGap, string>;

const HARD_BLOCKER_LABELS = {
  CONFIRMED_FALSE_DROP: '已确认存在错误放弃',
  CONFIRMED_FALSE_CONTINUE: '已确认存在错误继续',
  UNEXPLAINED_OVERRIDE: '人工推翻建议但没有充分说明',
  REPLAY_DRIFT: '回放结果或证据绑定发生漂移',
  AUTHORITY_LEAK: '建议机制越过了只读支持边界',
  PEER_EXPOSURE: '首轮角色看到了同轮其他角色输出',
  MISSING_LOOP_DELTA: '重试没有记录实质变化',
  PROVIDER_CALL: '校准过程中出现了未授权的供应商调用',
  EXTRA_HUMAN_STOP: '同一语义决策出现了额外人工停顿',
  INVALID_DROP_JUSTIFICATION: '放弃候选缺少理由、证据约束或重新开启条件',
  CALIBRATION_RELATION_MISS: '案例没有满足预先声明的比较关系',
} satisfies Record<TopicSelectionResearchArenaCalibrationHardBlocker['code'], string>;

export class TopicSelectionResearchArenaCalibrationService {
  private readonly now: () => string;

  constructor(
    private readonly dependencies: {
      offlineRepository: TopicSelectionOfflineEvaluationReplayRepository;
      offlineService: TopicSelectionOfflineEvaluationReplayService;
      arenaRepository: TopicSelectionResearchArenaRepository;
      controlPlaneRepository: ControlPlaneReads;
      advisoryReviewHistoryReader: AdvisoryReviewHistoryReader;
    },
    options: ServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async createDataset(input: TopicSelectionResearchArenaCalibrationDatasetCreateRequest) {
    if (input.schema_version === 'TopicSelectionResearchArenaCalibrationDatasetCreateRequest@v2') {
      this.assertProtocol(input.protocol_manifest);
      await this.assertProtocolBeforeExecution(input.protocol_manifest);
      const protocolManifest = this.cloneProtocol(input.protocol_manifest);
      const payload: ProtocolDatasetPayload = {
        schema_version: 'TopicSelectionResearchArenaCalibrationDataset@v2',
        evaluation_mode: 'canonical_owner_reload',
        protocol_manifest: protocolManifest,
        support_only: true,
      };
      return this.dependencies.offlineService.createDataset({
        workspace_id: input.workspace_id,
        dataset_key: input.dataset_key,
        dataset_version: input.dataset_version,
        stage: 'research_arena',
        source: 'frozen_snapshot',
        status: 'active',
        description: input.description,
        payload,
        created_by: 'system',
      });
    }
    return this.dependencies.offlineService.createDataset({
      workspace_id: input.workspace_id,
      dataset_key: input.dataset_key,
      dataset_version: input.dataset_version,
      stage: 'research_arena',
      source: 'frozen_snapshot',
      status: 'active',
      description: input.description,
      payload: {
        schema_version: 'TopicSelectionResearchArenaCalibrationDataset@v1',
        evaluation_mode: 'canonical_owner_reload',
        support_only: true,
      },
      created_by: 'system',
    });
  }

  async addCase(
    input: TopicSelectionResearchArenaCalibrationCaseCreateRequest,
  ): Promise<TopicSelectionOfflineEvaluationCaseRecord> {
    const dataset = await this.requireDataset(input.dataset_id);
    this.assertResearchArenaDataset(dataset.stage, input.dataset_id);
    if (input.schema_version === 'TopicSelectionResearchArenaCalibrationCaseCreateRequest@v2') {
      const payload = this.readProtocolDatasetPayload(dataset.payload, input.dataset_id);
      const slot = payload.protocol_manifest.slots.find((candidate) =>
        candidate.slot_key === input.slot_key);
      if (!slot) {
        throw new AppError(400, 'INVALID_PAYLOAD', `Protocol slot ${input.slot_key} is not declared by the dataset.`);
      }
      if (input.case_key !== slot.slot_key) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'A Phase 10B case key must equal its frozen protocol slot key.');
      }
      const tags = [...input.tags].sort();
      const existingCases = await this.dependencies.offlineRepository.listCasesByDatasetId(input.dataset_id);
      const existingForSlot = existingCases.find((candidate) =>
        this.readPreRegisteredSlotKey(candidate.frozen_input_bundle.payload) === input.slot_key);
      if (existingForSlot) {
        const existingPayload = this.readPreRegisteredPayload(existingForSlot);
        if (existingForSlot.case_key === input.case_key
          && existingPayload.protocol_hash === sha256Text(stableStringify(payload.protocol_manifest))
          && stableStringify(existingPayload.protocol_slot) === stableStringify(slot)
          && stableStringify(existingForSlot.tags) === stableStringify(tags)) {
          return existingForSlot;
        }
        throw new AppError(409, 'VERSION_CONFLICT', `Protocol slot ${input.slot_key} is already registered.`);
      }
      await Promise.all(slot.members.map((member) => this.assertMemberPreRegistration(member)));
      const protocolSlot = this.cloneProtocolSlot(slot);
      const workAvoidedBaseline = await this.captureWorkAvoidedBaseline(slot);
      const frozenPayload: PreRegisteredCasePayload = {
        schema_version: 'TopicSelectionResearchArenaCalibrationPreRegisteredCase@v2',
        protocol_hash: sha256Text(stableStringify(payload.protocol_manifest)),
        protocol_slot: protocolSlot,
        work_avoided_baseline: workAvoidedBaseline,
      };
      const sourceRefs = this.uniqueRefs(slot.members.flatMap((member) => [
        member.input_snapshot_ref,
        ...member.candidate_refs,
        ...member.evidence_refs,
        ...(member.loop_delta ? [member.loop_delta.ref] : []),
      ]));
      const titleCardIds = new Set(slot.members.map((member) => member.title_card_id));
      const addCaseInput: Parameters<TopicSelectionOfflineEvaluationReplayService['addCase']>[0] = {
        workspace_id: dataset.workspace_id ?? null,
        dataset_id: dataset.offline_evaluation_dataset_id,
        title_card_id: titleCardIds.size === 1 ? [...titleCardIds][0] ?? null : null,
        case_key: input.case_key,
        case_type: slot.case_type,
        frozen_input_bundle: createTopicSelectionOfflineFrozenInputBundle({
          stage: 'research_arena',
          frozen_at: dataset.created_at,
          source_refs: sourceRefs,
          artifact_refs: sourceRefs.filter((candidate) => candidate.ref_type === 'artifact_ref'),
          payload: frozenPayload,
        }),
        gold_expectation: {
          expected_unmet_need: false,
          expected_key_evidence_refs: [],
          expected_counter_evidence_refs: [],
          expected_blocker_codes: [],
          required_trace_refs: sourceRefs,
          expected_recheck_action_refs: [],
          expected_negative_memory_refs: [],
          expected_downstream_rework_causes: [],
          notes: [`Expected relation ${slot.expected_relation.relation_kind} was frozen before execution.`],
        },
        tags,
      };
      try {
        return await this.dependencies.offlineService.addCase(addCaseInput);
      } catch (error) {
        const replay = (await this.dependencies.offlineRepository.listCasesByDatasetId(input.dataset_id))
          .find((candidate) => candidate.case_key === input.case_key);
        if (replay
          && replay.case_type === addCaseInput.case_type
          && replay.title_card_id === addCaseInput.title_card_id
          && stableStringify(replay.frozen_input_bundle)
            === stableStringify(addCaseInput.frozen_input_bundle)
          && stableStringify(replay.gold_expectation)
            === stableStringify(addCaseInput.gold_expectation)
          && stableStringify(replay.tags) === stableStringify(tags)) {
          return replay;
        }
        throw error;
      }
    }
    if (dataset.payload.schema_version === 'TopicSelectionResearchArenaCalibrationDataset@v2') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'A Phase 10B dataset requires a v2 pre-registered case request.');
    }
    this.assertMemberShape(input);
    const loadedMembers = await Promise.all(input.members.map((member) => this.loadMember(member)));
    const sourceRefs = this.uniqueRefs(loadedMembers.flatMap((member) => member.sourceRefs));
    const titleCardIds = new Set(loadedMembers.map((member) => member.observation.arena_session_ref.title_card_id));
    const frozenPayload: FrozenCasePayload = {
      schema_version: 'TopicSelectionResearchArenaCalibrationFrozenCase@v1',
      members: loadedMembers.map((member) => member.frozen),
    };
    return this.dependencies.offlineService.addCase({
      workspace_id: dataset.workspace_id ?? null,
      dataset_id: dataset.offline_evaluation_dataset_id,
      title_card_id: titleCardIds.size === 1 ? [...titleCardIds][0] ?? null : null,
      case_key: input.case_key,
      case_type: input.case_type,
      frozen_input_bundle: createTopicSelectionOfflineFrozenInputBundle({
        stage: 'research_arena',
        frozen_at: this.now(),
        source_refs: sourceRefs,
        artifact_refs: sourceRefs.filter((candidate) => candidate.ref_type === 'artifact_ref'),
        payload: { ...frozenPayload },
      }),
      gold_expectation: {
        expected_unmet_need: false,
        expected_key_evidence_refs: [],
        expected_counter_evidence_refs: [],
        expected_blocker_codes: [],
        required_trace_refs: sourceRefs,
        expected_recheck_action_refs: [],
        expected_negative_memory_refs: [],
        expected_downstream_rework_causes: [],
        notes: [`Relation is derived from ${input.case_type}; no absolute worthwhile label is stored.`],
      },
      tags: input.tags,
    });
  }

  async startRun(
    input: TopicSelectionResearchArenaCalibrationRunCreateRequest,
  ): Promise<TopicSelectionOfflineEvaluationRunRecord> {
    const dataset = await this.requireDataset(input.dataset_id);
    this.assertResearchArenaDataset(dataset.stage, input.dataset_id);
    const protocol = dataset.payload.schema_version === 'TopicSelectionResearchArenaCalibrationDataset@v2'
      ? this.readProtocolDatasetPayload(dataset.payload, input.dataset_id)
      : null;
    let activeCases = (await this.dependencies.offlineRepository.listCasesByDatasetId(input.dataset_id))
      .filter((candidate) => candidate.status === 'active');
    let runPayload: ProtocolRunPayload | Record<string, unknown>;
    if (protocol) {
      if (activeCases.length === 0) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Phase 10B calibration cannot start without a pre-registered case.');
      }
      const protocolHash = sha256Text(stableStringify(protocol.protocol_manifest));
      const slotIndex = new Map(protocol.protocol_manifest.slots.map((slot, index) => [slot.slot_key, index]));
      for (const evaluationCase of activeCases) {
        const frozen = this.readPreRegisteredPayload(evaluationCase);
        const protocolSlot = protocol.protocol_manifest.slots.find((slot) =>
          slot.slot_key === evaluationCase.case_key);
        if (frozen.protocol_hash !== protocolHash
          || !protocolSlot
          || stableStringify(frozen.protocol_slot) !== stableStringify(protocolSlot)) {
          throw new AppError(409, 'VERSION_CONFLICT', `Calibration case ${evaluationCase.case_key} belongs to another protocol revision.`);
        }
      }
      activeCases = [...activeCases].sort((left, right) =>
        slotIndex.get(left.case_key)! - slotIndex.get(right.case_key)!);
      runPayload = {
        schema_version: 'TopicSelectionResearchArenaCalibrationRun@v2',
        evaluation_mode: 'canonical_owner_reload',
        protocol_hash: protocolHash,
        cases: activeCases.map((evaluationCase) => ({
          case_id: evaluationCase.offline_evaluation_case_id,
          case_key: evaluationCase.case_key,
          case_hash: sha256Text(stableStringify(evaluationCase)),
        })),
        provider_execution_allowed: false,
        authority_writes_allowed: false,
        support_only: true,
      };
    } else {
      runPayload = {
        schema_version: 'TopicSelectionResearchArenaCalibrationRun@v1',
        evaluation_mode: 'canonical_owner_reload',
        provider_execution_allowed: false,
        authority_writes_allowed: false,
        support_only: true,
      };
    }
    return this.dependencies.offlineService.startRunForStage({
      workspace_id: dataset.workspace_id ?? null,
      dataset_id: dataset.offline_evaluation_dataset_id,
      run_key: input.run_key,
      workflow_profile_key: 'topic-selection-research-arena-calibration',
      workflow_profile_version: protocol ? 'v2' : 'v1',
      model_profile_key: null,
      search_profile_key: null,
      policy_version_id: null,
      metric_keys: [...TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_METRIC_KEYS],
      run_payload: runPayload,
      created_by: 'system',
    }, 'research_arena');
  }

  async evaluateRun(runId: string): Promise<TopicSelectionResearchArenaCalibrationReport> {
    const run = await this.requireRun(runId);
    const dataset = await this.requireDataset(run.dataset_id);
    this.assertResearchArenaDataset(dataset.stage, dataset.offline_evaluation_dataset_id);
    if (run.status === 'completed') return this.getReport(runId);
    if (run.status !== 'running') {
      throw new AppError(409, 'VERSION_CONFLICT', 'Only running or completed Arena calibration runs can be evaluated.');
    }
    const cases = await this.casesForRun(run, dataset.payload);
    if (cases.length === 0) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena calibration requires at least one active frozen case.');
    }

    // Reload and validate the full corpus before the first evaluation write so source drift cannot
    // leave a partially evaluated run.
    const observations = await Promise.all(cases.map((evaluationCase) =>
      this.evaluateCase(evaluationCase, dataset.payload)));
    for (let index = 0; index < cases.length; index += 1) {
      await this.persistCaseEvaluation(run, cases[index]!, observations[index]!);
    }
    for (const metricKey of TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_METRIC_KEYS) {
      await this.persistMetric(run, metricKey, cases, observations);
    }
    await this.dependencies.offlineRepository.updateRun(run.offline_evaluation_run_id, {
      status: 'completed',
      case_count: cases.length,
      finished_at: this.now(),
      run_payload: {
        ...run.run_payload,
        evaluated_from_canonical_owners: true,
      },
    });
    return this.getReport(runId);
  }

  async getReport(runId: string): Promise<TopicSelectionResearchArenaCalibrationReport> {
    const run = await this.requireRun(runId);
    const dataset = await this.requireDataset(run.dataset_id);
    this.assertResearchArenaDataset(dataset.stage, dataset.offline_evaluation_dataset_id);
    if (run.status !== 'completed') {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena calibration report is available only after evaluation completes.');
    }
    const cases = await this.casesForRun(run, dataset.payload);
    const caseResultRecords = await this.dependencies.offlineRepository.listCaseResultsByRunId(runId);
    const metricResults = await this.dependencies.offlineRepository.listMetricResultsByRunId(runId);
    if (caseResultRecords.length !== cases.length
      || metricResults.length !== TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_METRIC_KEYS.length) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena calibration run has incomplete persisted results.');
    }
    const caseResultsByCaseId = new Map(caseResultRecords.map((record) => [record.case_id, record]));
    const metricKeys = metricResults.map((record) => record.metric_key);
    if (caseResultsByCaseId.size !== cases.length
      || new Set(metricKeys).size !== metricKeys.length
      || TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_METRIC_KEYS.some((metricKey) =>
        !metricKeys.includes(metricKey))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena calibration run has duplicated or unexpected persisted result identities.');
    }
    const observations = cases.map((evaluationCase) => {
      const record = caseResultsByCaseId.get(evaluationCase.offline_evaluation_case_id);
      if (!record
        || record.run_id !== runId
        || record.dataset_id !== run.dataset_id
        || record.case_type !== evaluationCase.case_type) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Arena calibration case result identity does not match its frozen run case.');
      }
      const observation = this.readObservation(record);
      if (this.refKey(observation.case_ref) !== this.refKey(this.caseRef(evaluationCase))) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Arena calibration observation identifies another frozen case.');
      }
      return observation;
    });
    if (metricResults.some((record) =>
      record.run_id !== runId
      || record.dataset_id !== run.dataset_id
      || record.denominator !== cases.length)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena calibration metric identity does not match its frozen run.');
    }
    const requiresExactMemberLabels = dataset.payload.schema_version
      === 'TopicSelectionResearchArenaCalibrationDataset@v2';
    for (const record of metricResults) {
      const metricKey = record.metric_key as TopicSelectionOfflineEvaluationMetricKey;
      const passed = observations.filter((observation) =>
        this.metricPassed(metricKey, observation, requiresExactMemberLabels));
      const failed = observations.filter((observation) =>
        !this.metricPassed(metricKey, observation, requiresExactMemberLabels));
      const expectedValue = observations.length === 0 ? null : passed.length / observations.length;
      if (record.numerator !== passed.length
        || record.value !== expectedValue
        || stableStringify(record.contributing_case_refs)
          !== stableStringify(passed.map((observation) => observation.case_ref))
        || stableStringify(record.failure_case_refs)
          !== stableStringify(failed.map((observation) => observation.case_ref))) {
        throw new AppError(409, 'VERSION_CONFLICT', `Arena calibration metric ${record.metric_key} drifted from its persisted cases.`);
      }
    }
    return this.buildReport(dataset, run, cases, observations, metricResults);
  }

  private async evaluateCase(
    evaluationCase: TopicSelectionOfflineEvaluationCaseRecord,
    datasetPayload: Record<string, unknown>,
  ): Promise<CaseObservation> {
    if (evaluationCase.frozen_input_bundle.payload.schema_version
      === 'TopicSelectionResearchArenaCalibrationPreRegisteredCase@v2') {
      return this.evaluatePreRegisteredCase(evaluationCase, datasetPayload);
    }
    const caseType = this.requireArenaCaseType(evaluationCase.case_type);
    const frozenPayload = this.readFrozenPayload(evaluationCase);
    const loadedMembers = await Promise.all(frozenPayload.members.map((member) => this.loadMember(member)));
    for (let index = 0; index < frozenPayload.members.length; index += 1) {
      const expected = frozenPayload.members[index]!;
      const observed = loadedMembers[index]!.frozen;
      if (expected.source_hash !== observed.source_hash
        || expected.member_role !== observed.member_role
        || expected.arena_session_id !== observed.arena_session_id
        || expected.research_checkpoint_id !== observed.research_checkpoint_id) {
        throw new AppError(409, 'VERSION_CONFLICT', `Calibration case ${evaluationCase.case_key} source identity drifted.`);
      }
    }
    const members = loadedMembers.map((member) => member.observation);
    const relationPassed = this.relationPassed(caseType, members);
    const caseRef = this.caseRef(evaluationCase);
    const relationBlockers: TopicSelectionResearchArenaCalibrationHardBlocker[] = relationPassed ? [] : [{
      code: 'CALIBRATION_RELATION_MISS',
      message: `${caseType} did not satisfy its predeclared relation.`,
      case_ref: caseRef,
      member_role: null,
    }];
    return {
      schema_version: 'TopicSelectionResearchArenaCalibrationCaseObservation@v1',
      case_ref: caseRef,
      case_type: caseType,
      relation_passed: relationPassed,
      members,
      hard_blockers: this.uniqueBlockers([
        ...members.flatMap((member) => member.hard_blockers.map((blocker) => ({ ...blocker, case_ref: caseRef }))),
        ...relationBlockers,
      ]),
    };
  }

  private async evaluatePreRegisteredCase(
    evaluationCase: TopicSelectionOfflineEvaluationCaseRecord,
    datasetPayload: Record<string, unknown>,
  ): Promise<CaseObservation> {
    const dataset = this.readProtocolDatasetPayload(datasetPayload, evaluationCase.dataset_id);
    const frozenPayload = this.readPreRegisteredPayload(evaluationCase);
    const datasetSlot = dataset.protocol_manifest.slots.find((candidate) =>
      candidate.slot_key === frozenPayload.protocol_slot.slot_key);
    if (!datasetSlot
      || frozenPayload.protocol_hash !== sha256Text(stableStringify(dataset.protocol_manifest))
      || stableStringify(frozenPayload.protocol_slot) !== stableStringify(datasetSlot)
      || evaluationCase.case_type !== datasetSlot.case_type) {
      throw new AppError(409, 'VERSION_CONFLICT', `Calibration case ${evaluationCase.case_key} drifted from its pre-registered protocol slot.`);
    }
    const loadedMembers = await Promise.all(datasetSlot.members.map((recipe) =>
      this.loadPreRegisteredMember(recipe, datasetSlot, frozenPayload.work_avoided_baseline)));
    const members = loadedMembers.map((member) => member.observation);
    const relationPassed = this.relationPassed(datasetSlot.case_type, members)
      && this.registeredRelationIdentityPassed(datasetSlot, loadedMembers);
    const caseRef = this.caseRef(evaluationCase);
    const relationBlockers: TopicSelectionResearchArenaCalibrationHardBlocker[] = relationPassed ? [] : [{
      code: 'CALIBRATION_RELATION_MISS',
      message: `${datasetSlot.expected_relation.relation_kind} did not satisfy its pre-registered identity and outcome relation.`,
      case_ref: caseRef,
      member_role: null,
    }];
    return {
      schema_version: 'TopicSelectionResearchArenaCalibrationCaseObservation@v1',
      case_ref: caseRef,
      case_type: datasetSlot.case_type,
      relation_passed: relationPassed,
      members,
      hard_blockers: this.uniqueBlockers([
        ...members.flatMap((member) => member.hard_blockers.map((blocker) => ({
          ...blocker,
          case_ref: caseRef,
        }))),
        ...relationBlockers,
      ]),
    };
  }

  private async loadPreRegisteredMember(
    recipe: TopicSelectionResearchArenaCalibrationMemberRecipe,
    slot: TopicSelectionResearchArenaCalibrationProtocolSlot,
    workAvoidedBaseline: PreRegisteredCasePayload['work_avoided_baseline'],
  ): Promise<LoadedMember> {
    const session = await this.dependencies.arenaRepository.findSessionByKey(recipe.session_key);
    if (!session) {
      throw new AppError(404, 'NOT_FOUND', `Pre-registered Arena session ${recipe.session_key} was not found.`);
    }
    await this.requireRecipeSnapshot(recipe);
    const expectedLoopDeltaRefs = recipe.loop_delta ? [{
      delta_type: recipe.loop_delta.delta_type,
      ref: recipe.loop_delta.ref,
      rationale: recipe.loop_delta.rationale,
    }] : [];
    if (session.title_card_id !== recipe.title_card_id
      || session.input_snapshot_id !== recipe.input_snapshot_ref.ref_id
      || session.input_snapshot_hash !== recipe.input_snapshot_ref.version_id
      || !recipe.candidate_refs.some((candidate) =>
        this.refKey(candidate) === this.refKey(session.target_ref))
      || stableStringify(session.loop_delta_refs) !== stableStringify(expectedLoopDeltaRefs)) {
      throw new AppError(409, 'VERSION_CONFLICT', `Arena session ${recipe.session_key} drifted from its pre-registered recipe.`);
    }
    const history = await this.dependencies.advisoryReviewHistoryReader
      .getArenaAdvisoryReviewHistoryForSession(recipe.title_card_id, session.arena_session_id);
    return this.loadMember({
      member_role: recipe.member_role,
      arena_session_id: session.arena_session_id,
      research_checkpoint_id: history?.research_checkpoint_id ?? null,
    }, {
      recipe,
      workAvoidedStageKeys: slot.work_avoided_stage_keys,
      workAvoidedBaseline,
      history,
    });
  }

  private registeredRelationIdentityPassed(
    slot: TopicSelectionResearchArenaCalibrationProtocolSlot,
    members: LoadedMember[],
  ): boolean {
    if (slot.case_type !== 'arena_causal_perturbation'
      && slot.case_type !== 'arena_irrelevant_perturbation') return true;
    const control = members.find((member) => member.frozen.member_role === 'control');
    const variant = members.find((member) => member.frozen.member_role === 'variant');
    const controlReview = control?.history?.reviews.length === 1
      ? control.history.reviews[0]
      : null;
    return Boolean(control && variant
      && controlReview
      && Date.parse(controlReview.review.created_at) <= Date.parse(variant.session.created_at)
      && variant.session.supersedes_arena_session_id === control.session.arena_session_id);
  }

  private async loadMember(
    input: TopicSelectionResearchArenaCalibrationCaseMemberInput | FrozenMember,
    measurementContext: MemberMeasurementContext | null = null,
  ): Promise<LoadedMember> {
    const session = await this.dependencies.arenaRepository.findSessionById(input.arena_session_id);
    if (!session) throw new AppError(404, 'NOT_FOUND', `ResearchArenaSession ${input.arena_session_id} was not found.`);
    if ((session.status !== 'synthesized' && session.status !== 'superseded')
      || !session.loop_transcript_ref
      || !session.loop_transcript_hash
      || !session.synthesized_at) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `ResearchArenaSession ${input.arena_session_id} is not synthesized.`);
    }
    const snapshot = await this.requireSnapshot(session);
    const transcript = await this.requireArtifact(session.loop_transcript_ref, session.title_card_id, snapshot.input_snapshot_id);
    const transcriptPayload = this.requireRecordPayload(transcript, 'Arena transcript');
    this.assertArtifactChecksum(transcript, transcriptPayload, false, 'Arena transcript');
    const transcriptSchemaVersion = transcriptPayload.schema_version;
    if (transcript.checksum !== session.loop_transcript_hash
      || (transcriptSchemaVersion !== 'TopicSelectionResearchArenaLoopTranscript@v1'
        && transcriptSchemaVersion !== 'TopicSelectionResearchArenaLoopTranscript@v2')
      || transcriptPayload.arena_session_id !== session.arena_session_id
      || transcriptPayload.input_snapshot_id !== session.input_snapshot_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena transcript does not match its session and snapshot identity.');
    }
    const executions = [
      ...await this.dependencies.arenaRepository.listRoleExecutionsBySessionId(session.arena_session_id),
    ].sort((left, right) => left.role_slot_id.localeCompare(right.role_slot_id)
      || left.instance_index - right.instance_index
      || left.arena_role_execution_id.localeCompare(right.arena_role_execution_id));
    if (executions.length === 0) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Arena calibration member has no durable role executions.');
    }
    const transcriptExecutions = this.recordArray(transcriptPayload.independent_first_pass, 'Arena transcript first pass');
    const evidencePackets: TopicSelectionArtifactRefRecord[] = [];
    const auditArtifacts: TopicSelectionArtifactRefRecord[] = [];
    for (const execution of executions) {
      this.assertExecutionIdentity(session, execution, transcriptExecutions, transcriptSchemaVersion);
      const packet = await this.requireArtifact(
        execution.evidence_packet_artifact_ref,
        session.title_card_id,
        snapshot.input_snapshot_id,
      );
      const packetPayload = this.requireRecordPayload(packet, 'EvidencePacket');
      this.assertArtifactChecksum(packet, packetPayload, true, 'EvidencePacket');
      if (packet.checksum !== execution.evidence_packet_hash
        || packetPayload.schema_version !== 'TopicSelectionResearchEvidencePacket@v1') {
        throw new AppError(409, 'VERSION_CONFLICT', 'EvidencePacket does not match its role execution identity.');
      }
      this.assertEvidencePacketIdentity(session, execution, packetPayload);
      evidencePackets.push(packet);
      const output = await this.requireArtifact(
        execution.output_artifact_ref,
        session.title_card_id,
        snapshot.input_snapshot_id,
      );
      const outputPayload = this.requireRecordPayload(output, 'Arena role output');
      this.assertArtifactChecksum(output, outputPayload, false, 'Arena role output');
      if (output.checksum !== execution.output_artifact_hash) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Arena role output checksum drifted.');
      }
      if (execution.schema_version === 'TopicSelectionResearchArenaRoleExecution@v2') {
        const audit = await this.requireArtifact(
          execution.agent_invocation_audit_artifact_ref,
          session.title_card_id,
          snapshot.input_snapshot_id,
        );
        const auditPayload = this.requireRecordPayload(audit, 'Agent invocation audit');
        this.assertArtifactChecksum(audit, auditPayload, false, 'Agent invocation audit');
        if (audit.checksum !== execution.agent_invocation_audit_artifact_hash) {
          throw new AppError(409, 'VERSION_CONFLICT', 'Agent invocation audit does not prove a succeeded product execution.');
        }
        this.assertProductAuditIdentity(execution, audit, auditPayload);
        auditArtifacts.push(audit);
      }
    }

    const history = measurementContext
      ? measurementContext.history
      : input.research_checkpoint_id
        ? await this.dependencies.advisoryReviewHistoryReader.getArenaAdvisoryReviewHistory(input.research_checkpoint_id)
        : null;
    if (history && history.title_card_id !== session.title_card_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena advisory review history belongs to another title card.');
    }
    const humanDecisions = history ? await this.loadHumanDecisions(history) : [];
    const advisoryOutcome = this.readAdvisoryOutcome(transcriptPayload);
    const humanLabelReviews = measurementContext
      ? history?.reviews.filter((review) =>
        review.review.actor.actor_type === measurementContext.recipe.label_actor.actor_type
        && review.review.actor.actor_id === measurementContext.recipe.label_actor.actor_id) ?? []
      : history?.reviews ?? [];
    const exactDesignatedLabel = humanLabelReviews.length === 1 && history?.reviews.length === 1;
    const derivedMeasurement = measurementContext
      ? await this.deriveMemberMeasurement(
        measurementContext,
        advisoryOutcome,
        exactDesignatedLabel ? humanLabelReviews[0]! : null,
      )
      : null;
    const transcriptAccounting = this.readAccounting(transcriptPayload.execution_accounting);
    const accounting: ExecutionAccounting = measurementContext ? {
      ...transcriptAccounting,
      work_avoided_stage_count: derivedMeasurement?.workAvoidedStageCount ?? null,
      authorization_pause_count: exactDesignatedLabel ? 1 : null,
    } : transcriptAccounting;
    const accountingPassed = this.accountingComplete(accounting)
      && accounting.non_provider_role_invocation_count === executions.length
      && accounting.retrieval_run_count === executions.length;
    const structuralIndependence = this.structuralIndependence(executions);
    const productV2Verified = executions.length === REQUIRED_ROLES.size
      && executions.every((execution) => execution.schema_version === 'TopicSelectionResearchArenaRoleExecution@v2')
      && auditArtifacts.length === executions.length
      && new Set(executions.map((execution) => execution.participant_role)).size === REQUIRED_ROLES.size
      && executions.every((execution) => REQUIRED_ROLES.has(execution.participant_role));
    const evidenceGroundingPassed = evidencePackets.length === executions.length;
    const replayIntegrityPassed = transcriptExecutions.length === executions.length;
    const hardBlockers = this.memberHardBlockers(
      session,
      transcriptPayload,
      executions,
      history,
      accounting,
      input.member_role,
      measurementContext?.recipe.label_actor ?? null,
    );
    const humanLabelResponses = humanLabelReviews.map((review) => review.review.response);
    const workAvoidedStageCount = accounting.work_avoided_stage_count ?? 0;
    const sourceManifest = {
      member_role: input.member_role,
      arena_session: this.sessionIdentity(session),
      input_snapshot: this.snapshotIdentity(snapshot),
      transcript: this.artifactIdentity(transcript),
      role_executions: executions.map((execution) => this.executionIdentity(execution)),
      evidence_packets: evidencePackets.map((artifact) => this.artifactIdentity(artifact)),
      agent_invocation_audits: auditArtifacts.map((artifact) => this.artifactIdentity(artifact)),
      advisory_review_history: history ? {
        research_checkpoint_id: history.research_checkpoint_id,
        gap_input_snapshot_id: history.gap_input_snapshot_id,
        checkpoint_currentness: history.checkpoint_currentness,
        history_hash: history.history_hash,
        review_refs: history.reviews.map((review) => review.review_ref),
        projection_issues: history.projection_issues,
      } : null,
      human_confirmed_decisions: humanDecisions.map((decision) => this.humanDecisionIdentity(decision)),
      advisory_outcome: advisoryOutcome,
      execution_accounting: accounting,
      measurement_context: measurementContext ? {
        recipe: measurementContext.recipe,
        work_avoided_baseline: measurementContext.workAvoidedBaseline,
        current_stage_manifest: derivedMeasurement?.stageManifest ?? null,
      } : null,
    };
    const sourceHash = sha256Text(stableStringify(sourceManifest));
    const frozen: FrozenMember = {
      member_role: input.member_role,
      arena_session_id: input.arena_session_id,
      research_checkpoint_id: input.research_checkpoint_id,
      source_hash: sourceHash,
    };
    const arenaSessionRef = this.ref(
      'research_arena_session',
      session.arena_session_id,
      session.title_card_id,
      session.input_snapshot_hash,
    );
    const inputSnapshotRef = this.ref(
      'input_snapshot',
      snapshot.input_snapshot_id,
      session.title_card_id,
      snapshot.snapshot_hash,
    );
    const sourceRefs = this.uniqueRefs([
      arenaSessionRef,
      inputSnapshotRef,
      session.loop_transcript_ref,
      ...executions.flatMap((execution) => [
        this.ref('research_arena_role_execution', execution.arena_role_execution_id, session.title_card_id, execution.runtime_identity_hash),
        execution.evidence_packet_artifact_ref,
        execution.output_artifact_ref,
        ...(execution.schema_version === 'TopicSelectionResearchArenaRoleExecution@v2'
          ? [execution.agent_invocation_audit_artifact_ref]
          : []),
      ]),
      ...(history ? history.reviews.map((review) => review.review_ref) : []),
      ...humanDecisions.map((decision) => this.ref(
        'human_confirmed_decision',
        decision.human_confirmed_decision_id,
        session.title_card_id,
      )),
    ]);
    return {
      session,
      history,
      frozen,
      sourceRefs,
      observation: {
        member_role: input.member_role,
        arena_session_ref: arenaSessionRef,
        input_snapshot_ref: inputSnapshotRef,
        transcript_ref: session.loop_transcript_ref,
        role_execution_refs: executions.map((execution) => this.ref(
          'research_arena_role_execution',
          execution.arena_role_execution_id,
          session.title_card_id,
          execution.runtime_identity_hash,
        )),
        evidence_packet_refs: evidencePackets.map((artifact) => this.ref('artifact_ref', artifact.artifact_ref_id, session.title_card_id, artifact.checksum)),
        agent_invocation_audit_refs: auditArtifacts.map((artifact) => this.ref('artifact_ref', artifact.artifact_ref_id, session.title_card_id, artifact.checksum)),
        human_review_refs: history?.reviews.map((review) => review.review_ref) ?? [],
        human_confirmed_decision_refs: humanDecisions.map((decision) => this.ref(
          'human_confirmed_decision',
          decision.human_confirmed_decision_id,
          session.title_card_id,
        )),
        advisory_outcome: advisoryOutcome,
        product_v2_verified: productV2Verified,
        evidence_grounding_passed: evidenceGroundingPassed,
        execution_independence_passed: productV2Verified && structuralIndependence,
        replay_integrity_passed: replayIntegrityPassed,
        human_label_responses: humanLabelResponses,
        cost_latency_accounting_passed: accountingPassed,
        work_avoided_stage_count: workAvoidedStageCount,
        execution_accounting: accounting,
        source_hash: sourceHash,
        issues: [
          ...(!productV2Verified ? ['MISSING_PRODUCT_V2_EXECUTION'] : []),
          ...(!evidenceGroundingPassed ? ['MISSING_EVIDENCE_GROUNDING'] : []),
          ...(!(productV2Verified && structuralIndependence) ? ['MISSING_EXECUTION_INDEPENDENCE'] : []),
          ...(!replayIntegrityPassed ? ['MISSING_REPLAY_INTEGRITY'] : []),
          ...(measurementContext
            ? humanLabelResponses.length !== 1 ? ['MISSING_MEMBER_LABEL_COVERAGE'] : []
            : humanLabelResponses.length === 0 ? ['MISSING_HUMAN_LABEL'] : []),
          ...(!accountingPassed ? ['MISSING_COST_LATENCY_ACCOUNTING'] : []),
          ...(workAvoidedStageCount === 0 ? ['MISSING_MEASURED_WORK_AVOIDED'] : []),
        ],
        hard_blockers: hardBlockers,
      },
    };
  }

  private async persistCaseEvaluation(
    run: TopicSelectionOfflineEvaluationRunRecord,
    evaluationCase: TopicSelectionOfflineEvaluationCaseRecord,
    observation: CaseObservation,
  ): Promise<void> {
    const requiresExactMemberLabels = evaluationCase.frozen_input_bundle.payload.schema_version
      === 'TopicSelectionResearchArenaCalibrationPreRegisteredCase@v2';
    const createdAt = run.started_at;
    const replayDiffId = `offline_eval_replay_diff_${sha256Text(`${run.offline_evaluation_run_id}:${evaluationCase.offline_evaluation_case_id}`)}`;
    const replayDiff: TopicSelectionReplayDiffRecord = {
      replay_diff_id: replayDiffId,
      workspace_id: run.workspace_id ?? null,
      run_id: run.offline_evaluation_run_id,
      dataset_id: run.dataset_id,
      case_id: evaluationCase.offline_evaluation_case_id,
      status: observation.relation_passed && observation.hard_blockers.length === 0 ? 'match' : 'mismatch',
      changed_dimensions: [],
      final_decision_changed: !observation.relation_passed,
      key_evidence_set_changed: false,
      blocker_set_changed: observation.hard_blockers.length > 0,
      trace_verdict_changed: false,
      expected_snapshot: {
        frozen_case: evaluationCase.frozen_input_bundle.payload,
        relation_case_type: evaluationCase.case_type,
      },
      observed_snapshot: this.observedOutput(observation),
      baseline_snapshot: null,
      diff_payload: {
        schema_version: 'TopicSelectionResearchArenaCalibrationReplayDiff@v1',
        relation_passed: observation.relation_passed,
        hard_blockers: observation.hard_blockers,
      },
      created_at: createdAt,
    };
    await this.createOrRecoverReplayDiff(replayDiff);
    const caseResult: TopicSelectionOfflineEvaluationCaseResultRecord = {
      offline_evaluation_case_result_id: `offline_eval_case_result_${sha256Text(`${run.offline_evaluation_run_id}:${evaluationCase.offline_evaluation_case_id}`)}`,
      workspace_id: run.workspace_id ?? null,
      run_id: run.offline_evaluation_run_id,
      dataset_id: run.dataset_id,
      case_id: evaluationCase.offline_evaluation_case_id,
      case_type: evaluationCase.case_type,
      status: 'evaluated',
      observed_output: this.observedOutput(observation),
      replay_diff_ref: this.ref('offline_evaluation_replay_diff', replayDiffId, evaluationCase.title_card_id),
      metric_contribution_payload: this.metricContribution(observation, requiresExactMemberLabels),
      failure_examples: observation.hard_blockers.map((blocker) => `${blocker.code}: ${blocker.message}`),
      created_at: createdAt,
    };
    await this.createOrRecoverCaseResult(caseResult);
  }

  private async persistMetric(
    run: TopicSelectionOfflineEvaluationRunRecord,
    metricKey: TopicSelectionOfflineEvaluationMetricKey,
    cases: TopicSelectionOfflineEvaluationCaseRecord[],
    observations: CaseObservation[],
  ): Promise<void> {
    const requiresExactMemberLabels = cases.some((evaluationCase) =>
      evaluationCase.frozen_input_bundle.payload.schema_version
        === 'TopicSelectionResearchArenaCalibrationPreRegisteredCase@v2');
    const passed = observations.filter((observation) =>
      this.metricPassed(metricKey, observation, requiresExactMemberLabels));
    const failed = observations.filter((observation) =>
      !this.metricPassed(metricKey, observation, requiresExactMemberLabels));
    const record: TopicSelectionOfflineEvaluationMetricResultRecord = {
      offline_evaluation_metric_result_id: `offline_eval_metric_result_${sha256Text(`${run.offline_evaluation_run_id}:${metricKey}`)}`,
      workspace_id: run.workspace_id ?? null,
      run_id: run.offline_evaluation_run_id,
      dataset_id: run.dataset_id,
      metric_key: metricKey,
      numerator: passed.length,
      denominator: observations.length,
      value: observations.length === 0 ? null : passed.length / observations.length,
      contributing_case_refs: passed.map((observation) => observation.case_ref),
      failure_case_refs: failed.map((observation) => observation.case_ref),
      notes: failed.length === 0 ? [] : [`${failed.length}/${cases.length} cases lack ${metricKey}.`],
      metric_payload: {
        schema_version: 'TopicSelectionResearchArenaCalibrationMetric@v1',
        support_only: true,
      },
      created_at: run.started_at,
    };
    await this.createOrRecoverMetric(record);
  }

  private buildReport(
    dataset: Awaited<ReturnType<TopicSelectionResearchArenaCalibrationService['requireDataset']>>,
    run: TopicSelectionOfflineEvaluationRunRecord,
    cases: TopicSelectionOfflineEvaluationCaseRecord[],
    observations: CaseObservation[],
    metricResults: TopicSelectionOfflineEvaluationMetricResultRecord[],
  ): TopicSelectionResearchArenaCalibrationReport {
    const caseTypeCounts = Object.fromEntries(
      [...new Set(cases.map((evaluationCase) => evaluationCase.case_type))]
        .sort()
        .map((caseType) => [caseType, cases.filter((evaluationCase) => evaluationCase.case_type === caseType).length]),
    );
    const members = observations.flatMap((observation) => observation.members);
    const labelCounts: TopicSelectionResearchArenaCalibrationHumanLabelCounts = {
      accept: members.flatMap((member) => member.human_label_responses).filter((response) => response === 'accept').length,
      override: members.flatMap((member) => member.human_label_responses).filter((response) => response === 'override').length,
      defer: members.flatMap((member) => member.human_label_responses).filter((response) => response === 'defer').length,
      non_advance: members.filter((member) => member.advisory_outcome !== 'selected'
        && member.human_label_responses.includes('accept')).length,
    };
    const coverageGaps = this.coverageGaps(
      caseTypeCounts,
      members,
      labelCounts,
      dataset.payload.schema_version === 'TopicSelectionResearchArenaCalibrationDataset@v2',
    );
    const hardBlockers = this.uniqueBlockers(observations.flatMap((observation) => observation.hard_blockers));
    const structuralGaps = coverageGaps.filter((gap) => gap !== 'MISSING_MEASURED_WORK_AVOIDED');
    const recommendation = hardBlockers.length > 0
      ? 'remain_advisory' as const
      : structuralGaps.length > 0
        ? 'insufficient_evidence' as const
        : coverageGaps.includes('MISSING_MEASURED_WORK_AVOIDED')
          ? 'remain_advisory' as const
          : 'eligible_for_activation' as const;
    const core = {
      dataset_ref: this.ref('offline_evaluation_dataset', dataset.offline_evaluation_dataset_id),
      run_ref: this.ref('offline_evaluation_run', run.offline_evaluation_run_id),
      recommendation,
      case_type_counts: caseTypeCounts,
      product_v2_member_count: members.filter((member) => member.product_v2_verified).length,
      human_label_counts: labelCounts,
      coverage_gaps: coverageGaps,
      hard_blockers: hardBlockers,
      metric_results: [...metricResults].sort((left, right) => left.metric_key.localeCompare(right.metric_key)),
      case_results: observations,
      support_only: true as const,
    };
    const technicalTraceHash = sha256Text(stableStringify(core));
    const humanMarkdown = this.humanMarkdown(core.recommendation, cases.length, coverageGaps, hardBlockers);
    const llmWorkingSet = {
      schema_version: 'TopicSelectionResearchArenaCalibrationWorkingSet@v1',
      dataset: this.reportDatasetIdentity(dataset),
      run_identity: this.runIdentity(run),
      frozen_cases: cases,
      ...core,
      technical_trace_hash: technicalTraceHash,
    };
    return {
      schema_version: 'TopicSelectionResearchArenaCalibrationReport@v1',
      ...core,
      technical_trace_hash: technicalTraceHash,
      human_markdown: humanMarkdown,
      llm_working_set: llmWorkingSet,
    };
  }

  private coverageGaps(
    caseTypeCounts: Record<string, number>,
    members: MemberObservation[],
    labelCounts: TopicSelectionResearchArenaCalibrationHumanLabelCounts,
    requiresExactMemberLabels: boolean,
  ): TopicSelectionResearchArenaCalibrationCoverageGap[] {
    const gaps: TopicSelectionResearchArenaCalibrationCoverageGap[] = [];
    const dominanceCount = caseTypeCounts.arena_dominance_pair ?? 0;
    if (dominanceCount < 1) gaps.push('MISSING_FIRST_DOMINANCE_PAIR');
    if (dominanceCount < 2) gaps.push('MISSING_SECOND_DOMINANCE_PAIR');
    if ((caseTypeCounts.arena_causal_perturbation ?? 0) < 1) gaps.push('MISSING_CAUSAL_PERTURBATION');
    if ((caseTypeCounts.arena_irrelevant_perturbation ?? 0) < 1) gaps.push('MISSING_IRRELEVANT_PERTURBATION');
    if ((caseTypeCounts.arena_successful_non_advance ?? 0) < 1) gaps.push('MISSING_SUCCESSFUL_NON_ADVANCE');
    if ((caseTypeCounts.arena_advancing_case ?? 0) < 1) gaps.push('MISSING_ADVANCING_CASE');
    if (members.some((member) => !member.product_v2_verified)) gaps.push('MISSING_PRODUCT_V2_EXECUTION');
    if (members.some((member) => !member.evidence_grounding_passed)) gaps.push('MISSING_EVIDENCE_GROUNDING');
    if (members.some((member) => !member.execution_independence_passed)) gaps.push('MISSING_EXECUTION_INDEPENDENCE');
    if (members.some((member) => !member.replay_integrity_passed)) gaps.push('MISSING_REPLAY_INTEGRITY');
    if (labelCounts.accept === 0) gaps.push('MISSING_ACCEPT_LABEL');
    if (labelCounts.override === 0) gaps.push('MISSING_OVERRIDE_LABEL');
    if (labelCounts.non_advance === 0) gaps.push('MISSING_NON_ADVANCE_LABEL');
    if (requiresExactMemberLabels
      && members.some((member) => member.human_label_responses.length !== 1)) {
      gaps.push('MISSING_MEMBER_LABEL_COVERAGE');
    }
    if (members.some((member) => !member.cost_latency_accounting_passed)) gaps.push('MISSING_COST_LATENCY_ACCOUNTING');
    if (members.every((member) => member.work_avoided_stage_count === 0)) gaps.push('MISSING_MEASURED_WORK_AVOIDED');
    return gaps;
  }

  private humanMarkdown(
    recommendation: TopicSelectionResearchArenaCalibrationReport['recommendation'],
    caseCount: number,
    gaps: TopicSelectionResearchArenaCalibrationCoverageGap[],
    blockers: TopicSelectionResearchArenaCalibrationHardBlocker[],
  ): string {
    const conclusion = recommendation === 'insufficient_evidence'
      ? '当前证据不足，Arena 继续保持建议模式。'
      : recommendation === 'remain_advisory'
        ? '当前证据不支持激活，Arena 应保持建议模式。'
        : '证据已达到可提交人工激活决策的条件；本报告不会自动改变策略。';
    return [
      '# Research Arena 校准结论',
      '',
      conclusion,
      '',
      `- 已评估案例：${caseCount}`,
      `- 还缺的证据：${gaps.length === 0 ? '无' : gaps.map((gap) => COVERAGE_GAP_LABELS[gap]).join('；')}`,
      `- 必须先解决的问题：${blockers.length === 0
        ? '无'
        : blockers.map((blocker) => HARD_BLOCKER_LABELS[blocker.code]).join('；')}`,
      '- 权限边界：只读校准；不运行角色、不调用供应商、不写入研究或人工决策权威。',
    ].join('\n');
  }

  private relationPassed(caseType: CaseObservation['case_type'], members: MemberObservation[]): boolean {
    const byRole = new Map(members.map((member) => [member.member_role, member]));
    switch (caseType) {
      case 'arena_dominance_pair':
        return byRole.get('baseline')?.advisory_outcome !== 'selected'
          && byRole.get('preferred')?.advisory_outcome === 'selected';
      case 'arena_causal_perturbation':
        return byRole.get('control')?.advisory_outcome !== byRole.get('variant')?.advisory_outcome;
      case 'arena_irrelevant_perturbation':
        return byRole.get('control')?.advisory_outcome === byRole.get('variant')?.advisory_outcome;
      case 'arena_successful_non_advance':
        return byRole.get('subject')?.advisory_outcome !== 'selected';
      case 'arena_advancing_case':
        return byRole.get('subject')?.advisory_outcome === 'selected';
      default:
        throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported Arena calibration case type ${caseType}.`);
    }
  }

  private assertProtocol(protocol: TopicSelectionResearchArenaCalibrationProtocolV2): void {
    if (!protocolV2Validator(protocol)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Phase 10B protocol manifest is malformed.');
    }
    if (stableStringify(protocol.override_categories)
      !== stableStringify(TOPIC_SELECTION_RESEARCH_ARENA_CALIBRATION_OVERRIDE_CATEGORIES)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Phase 10B override categories must keep their canonical order.');
    }
    const expectedSlots = [
      ['first', 'arena_dominance_pair', 'dominance'],
      ['first', 'arena_causal_perturbation', 'causal_perturbation'],
      ['first', 'arena_successful_non_advance', 'successful_non_advance'],
      ['second', 'arena_dominance_pair', 'dominance'],
      ['second', 'arena_irrelevant_perturbation', 'irrelevant_perturbation'],
      ['second', 'arena_advancing_case', 'advancing'],
    ] as const;
    const slotKeys = new Set<string>();
    const sessionKeys = new Set<string>();
    const labelSlotKeys = new Set<string>();
    let memberCount = 0;
    for (const [index, slot] of protocol.slots.entries()) {
      const [tranche, caseType, relationKind] = expectedSlots[index]!;
      if (slot.tranche !== tranche
        || slot.case_type !== caseType
        || slot.expected_relation.relation_kind !== relationKind) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Phase 10B protocol slots must keep the fixed two-tranche matrix order.');
      }
      if (slotKeys.has(slot.slot_key)) {
        throw new AppError(400, 'INVALID_PAYLOAD', `Protocol slot key ${slot.slot_key} is duplicated.`);
      }
      slotKeys.add(slot.slot_key);
      this.assertProtocolSlot(slot);
      memberCount += slot.members.length;
      for (const member of slot.members) {
        if (sessionKeys.has(member.session_key)) {
          throw new AppError(400, 'INVALID_PAYLOAD', `Protocol member session key ${member.session_key} is reused across slots.`);
        }
        if (labelSlotKeys.has(member.label_slot_key)) {
          throw new AppError(400, 'INVALID_PAYLOAD', `Protocol label slot ${member.label_slot_key} is reused across members.`);
        }
        sessionKeys.add(member.session_key);
        labelSlotKeys.add(member.label_slot_key);
      }
    }
    if (memberCount !== protocol.budgets.max_session_count || sessionKeys.size !== memberCount) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Phase 10B protocol must bind exactly ten unique member sessions.');
    }
  }

  private async assertProtocolBeforeExecution(
    protocol: TopicSelectionResearchArenaCalibrationProtocolV2,
  ): Promise<void> {
    for (const recipe of protocol.slots.flatMap((slot) => slot.members)) {
      const session = await this.dependencies.arenaRepository.findSessionByKey(recipe.session_key);
      if (!session) continue;
      const roleExecutions = await this.dependencies.arenaRepository.listRoleExecutionsBySessionId(
        session.arena_session_id,
      );
      const expectedLoopDeltaRefs = recipe.loop_delta ? [{
        delta_type: recipe.loop_delta.delta_type,
        ref: recipe.loop_delta.ref,
        rationale: recipe.loop_delta.rationale,
      }] : [];
      if (session.status !== 'open'
        || session.title_card_id !== recipe.title_card_id
        || session.input_snapshot_id !== recipe.input_snapshot_ref.ref_id
        || session.input_snapshot_hash !== recipe.input_snapshot_ref.version_id
        || !recipe.candidate_refs.some((candidate) =>
          this.refKey(candidate) === this.refKey(session.target_ref))
        || stableStringify(session.loop_delta_refs) !== stableStringify(expectedLoopDeltaRefs)
        || session.loop_transcript_ref !== null
        || session.loop_transcript_hash !== null
        || roleExecutions.length > 0) {
        throw new AppError(409, 'VERSION_CONFLICT', `Phase 10B protocol member ${recipe.session_key} already has output or identity drift.`);
      }
    }
  }

  private assertProtocolSlot(slot: TopicSelectionResearchArenaCalibrationProtocolSlot): void {
    const roles = slot.members.map((member) => member.member_role);
    const expectedRoles: TopicSelectionResearchArenaCalibrationMemberRole[] =
      slot.case_type === 'arena_dominance_pair'
        ? ['baseline', 'preferred']
        : slot.case_type === 'arena_causal_perturbation'
          || slot.case_type === 'arena_irrelevant_perturbation'
          ? ['control', 'variant']
          : ['subject'];
    if (stableStringify(roles) !== stableStringify(expectedRoles)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${slot.slot_key} has an invalid ordered member shape.`);
    }
    for (const member of slot.members) this.assertMemberRecipeRefs(member, slot.slot_key);

    const isDominance = slot.case_type === 'arena_dominance_pair';
    const isPerturbation = slot.case_type === 'arena_causal_perturbation'
      || slot.case_type === 'arena_irrelevant_perturbation';
    const isNonAdvance = slot.case_type === 'arena_successful_non_advance';
    if (isDominance ? slot.expected_relation.dominance_axes.length === 0
      : slot.expected_relation.dominance_axes.length > 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${slot.slot_key} has invalid dominance axes.`);
    }
    if (isPerturbation) {
      const [control, variant] = slot.members;
      const expectedClassification = slot.case_type === 'arena_causal_perturbation'
        ? 'causal'
        : 'irrelevant';
      if (!control || !variant
        || control.title_card_id !== variant.title_card_id
        || stableStringify(control.candidate_refs) !== stableStringify(variant.candidate_refs)
        || this.refKey(control.input_snapshot_ref) === this.refKey(variant.input_snapshot_ref)
        || control.loop_delta !== null
        || variant.loop_delta?.classification !== expectedClassification
        || !slot.expected_relation.sole_delta_ref
        || this.refKey(variant.loop_delta.ref) !== this.refKey(slot.expected_relation.sole_delta_ref)) {
        throw new AppError(400, 'INVALID_PAYLOAD', `${slot.slot_key} must declare one exact typed evidence delta on a shared candidate lineage.`);
      }
      const expectedVariantEvidence = [...control.evidence_refs, variant.loop_delta.ref];
      if (stableStringify(variant.evidence_refs) !== stableStringify(expectedVariantEvidence)) {
        throw new AppError(400, 'INVALID_PAYLOAD', `${slot.slot_key} must change only its declared evidence delta.`);
      }
    } else if (slot.expected_relation.sole_delta_ref !== null
      || slot.members.some((member) => member.loop_delta !== null)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${slot.slot_key} cannot declare a loop delta.`);
    }

    const requiredWorkAvoidedStages = [
      'research_question',
      'value_feasibility',
      'topic_package',
      'promotion_review',
    ];
    if (isNonAdvance
      ? stableStringify(slot.work_avoided_stage_keys) !== stableStringify(requiredWorkAvoidedStages)
      : slot.work_avoided_stage_keys.length !== 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${slot.slot_key} has an invalid work-avoided measurement window.`);
    }
  }

  private assertMemberRecipeRefs(
    member: TopicSelectionResearchArenaCalibrationMemberRecipe,
    slotKey: string,
  ): void {
    const candidateKeys = new Set(member.candidate_refs.map((candidate) => this.refKey(candidate)));
    const evidenceKeys = new Set(member.evidence_refs.map((candidate) => this.refKey(candidate)));
    const refs = [
      member.input_snapshot_ref,
      ...member.candidate_refs,
      ...member.evidence_refs,
      ...(member.loop_delta ? [member.loop_delta.ref] : []),
    ];
    if (member.input_snapshot_ref.ref_type !== 'input_snapshot'
      || !member.input_snapshot_ref.version_id
      || member.candidate_refs.some((candidate) => candidate.ref_type !== 'need_candidate')
      || refs.some((candidate) => candidate.title_card_id !== member.title_card_id)
      || candidateKeys.size !== member.candidate_refs.length
      || evidenceKeys.size !== member.evidence_refs.length
      || [...candidateKeys].some((key) => evidenceKeys.has(key))) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${slotKey} has a malformed or cross-title member recipe.`);
    }
  }

  private async assertMemberPreRegistration(
    member: TopicSelectionResearchArenaCalibrationMemberRecipe,
  ): Promise<void> {
    const snapshot = await this.requireRecipeSnapshot(member);

    const session = await this.dependencies.arenaRepository.findSessionByKey(member.session_key);
    if (!session) return;
    const roleExecutions = await this.dependencies.arenaRepository.listRoleExecutionsBySessionId(
      session.arena_session_id,
    );
    const expectedLoopDeltaRefs = member.loop_delta ? [{
      delta_type: member.loop_delta.delta_type,
      ref: member.loop_delta.ref,
      rationale: member.loop_delta.rationale,
    }] : [];
    if (session.status !== 'open'
      || session.title_card_id !== member.title_card_id
      || session.input_snapshot_id !== snapshot.input_snapshot_id
      || session.input_snapshot_hash !== snapshot.snapshot_hash
      || !member.candidate_refs.some((candidate) =>
        this.refKey(candidate) === this.refKey(session.target_ref))
      || stableStringify(session.loop_delta_refs) !== stableStringify(expectedLoopDeltaRefs)
      || session.loop_transcript_ref !== null
      || session.loop_transcript_hash !== null
      || roleExecutions.length > 0) {
      throw new AppError(409, 'VERSION_CONFLICT', `Arena session ${member.session_key} already has output or drifted from its pre-registered recipe.`);
    }
  }

  private async requireRecipeSnapshot(
    member: TopicSelectionResearchArenaCalibrationMemberRecipe,
  ): Promise<TopicSelectionInputSnapshotRecord> {
    const snapshot = await this.dependencies.controlPlaneRepository.findInputSnapshotById(
      member.input_snapshot_ref.ref_id,
    );
    if (!snapshot) {
      throw new AppError(404, 'NOT_FOUND', `InputSnapshot ${member.input_snapshot_ref.ref_id} was not found.`);
    }
    const sourceKeys = new Set(snapshot.source_refs.map((candidate) => this.refKey(candidate)));
    const expectedSourceKeys = new Set([...member.candidate_refs, ...member.evidence_refs]
      .map((candidate) => this.refKey(candidate)));
    if (snapshot.title_card_id !== member.title_card_id
      || snapshot.snapshot_hash !== member.input_snapshot_ref.version_id
      || !member.candidate_refs.some((candidate) =>
        this.refKey(candidate) === this.refKey(snapshot.target_ref))
      || snapshot.source_refs.length !== sourceKeys.size
      || sourceKeys.size !== expectedSourceKeys.size
      || [...expectedSourceKeys].some((key) => !sourceKeys.has(key))) {
      throw new AppError(409, 'VERSION_CONFLICT', `InputSnapshot ${snapshot.input_snapshot_id} does not match its pre-registered member recipe.`);
    }
    return snapshot;
  }

  private async captureWorkAvoidedBaseline(
    slot: TopicSelectionResearchArenaCalibrationProtocolSlot,
  ): Promise<PreRegisteredCasePayload['work_avoided_baseline']> {
    if (slot.work_avoided_stage_keys.length === 0) return null;
    const member = slot.members[0]!;
    const manifest = await this.dependencies.advisoryReviewHistoryReader.getStageManifest(
      member.title_card_id,
    );
    const entryByStage = new Map(manifest.stages.map((entry) => [entry.stage, entry]));
    const unavailableStageKeys = slot.work_avoided_stage_keys.filter((stage) =>
      entryByStage.get(stage)?.state === 'unavailable');
    if (manifest.title_card_id !== member.title_card_id
      || unavailableStageKeys.length !== slot.work_avoided_stage_keys.length) {
      throw new AppError(409, 'VERSION_CONFLICT', `${slot.slot_key} work-avoided stages were already entered before registration.`);
    }
    return {
      title_card_id: manifest.title_card_id,
      manifest_hash: manifest.manifest_hash,
      unavailable_stage_keys: unavailableStageKeys,
    };
  }

  private readProtocolDatasetPayload(
    value: Record<string, unknown>,
    datasetId: string,
  ): ProtocolDatasetPayload {
    if (value.schema_version !== 'TopicSelectionResearchArenaCalibrationDataset@v2'
      || value.evaluation_mode !== 'canonical_owner_reload'
      || value.support_only !== true
      || !protocolV2Validator(value.protocol_manifest)) {
      throw new AppError(409, 'VERSION_CONFLICT', `OfflineEvaluationDataset ${datasetId} has no valid Phase 10B protocol.`);
    }
    this.assertProtocol(value.protocol_manifest);
    return value as ProtocolDatasetPayload;
  }

  private readPreRegisteredSlotKey(value: Record<string, unknown>): string | null {
    if (value.schema_version !== 'TopicSelectionResearchArenaCalibrationPreRegisteredCase@v2') return null;
    if (!this.isRecord(value.protocol_slot)
      || typeof value.protocol_slot.slot_key !== 'string'
      || value.protocol_slot.slot_key.length === 0) {
      throw new AppError(409, 'VERSION_CONFLICT', 'A Phase 10B case has a malformed pre-registration payload.');
    }
    return value.protocol_slot.slot_key;
  }

  private cloneProtocol(
    protocol: TopicSelectionResearchArenaCalibrationProtocolV2,
  ): TopicSelectionResearchArenaCalibrationProtocolV2 {
    return JSON.parse(stableStringify(protocol)) as TopicSelectionResearchArenaCalibrationProtocolV2;
  }

  private cloneProtocolSlot(
    slot: TopicSelectionResearchArenaCalibrationProtocolSlot,
  ): TopicSelectionResearchArenaCalibrationProtocolSlot {
    return JSON.parse(stableStringify(slot)) as TopicSelectionResearchArenaCalibrationProtocolSlot;
  }

  private assertMemberShape(input: TopicSelectionResearchArenaCalibrationCaseCreateRequestV1): void {
    const roles = input.members.map((member) => member.member_role);
    if (new Set(roles).size !== roles.length || new Set(input.members.map((member) => member.arena_session_id)).size !== input.members.length) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Arena calibration case members must have unique roles and sessions.');
    }
    const exact = (expected: TopicSelectionResearchArenaCalibrationMemberRole[]) =>
      roles.length === expected.length && expected.every((role) => roles.includes(role));
    const valid = input.case_type === 'arena_dominance_pair'
      ? exact(['baseline', 'preferred'])
      : input.case_type === 'arena_causal_perturbation' || input.case_type === 'arena_irrelevant_perturbation'
        ? exact(['control', 'variant'])
        : exact(['subject']);
    if (!valid) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${input.case_type} has an invalid calibration member shape.`);
    }
  }

  private assertExecutionIdentity(
    session: TopicSelectionResearchArenaSessionRecord,
    execution: TopicSelectionResearchArenaRoleExecutionRecord,
    transcriptExecutions: Record<string, unknown>[],
    transcriptSchemaVersion:
      | 'TopicSelectionResearchArenaLoopTranscript@v1'
      | 'TopicSelectionResearchArenaLoopTranscript@v2',
  ): void {
    if (execution.input_snapshot_id !== session.input_snapshot_id
      || execution.input_snapshot_hash !== session.input_snapshot_hash
      || execution.title_card_id !== session.title_card_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena role execution is outside the session snapshot.');
    }
    const transcriptExecution = transcriptSchemaVersion === 'TopicSelectionResearchArenaLoopTranscript@v2'
      ? transcriptExecutions.find((candidate) =>
        candidate.arena_role_execution_id === execution.arena_role_execution_id)
      : transcriptExecutions.find((candidate) => candidate.participant_role === execution.participant_role);
    const legacyExpected = {
      participant_role: execution.participant_role,
      evidence_packet_artifact_ref: execution.evidence_packet_artifact_ref,
      evidence_packet_hash: execution.evidence_packet_hash,
      exposure_set_hash: execution.exposure_set_hash,
      output_artifact_ref: execution.output_artifact_ref,
      output_artifact_hash: execution.output_artifact_hash,
      prior_role_hashes: execution.prior_role_hashes,
    };
    const expected = transcriptSchemaVersion === 'TopicSelectionResearchArenaLoopTranscript@v1'
      ? legacyExpected
      : {
        arena_role_execution_id: execution.arena_role_execution_id,
        ...legacyExpected,
        agent_invocation_audit_artifact_ref: execution.schema_version === 'TopicSelectionResearchArenaRoleExecution@v2'
          ? execution.agent_invocation_audit_artifact_ref
          : null,
        agent_invocation_audit_artifact_hash: execution.schema_version === 'TopicSelectionResearchArenaRoleExecution@v2'
          ? execution.agent_invocation_audit_artifact_hash
          : null,
        execution_provenance_hash: execution.schema_version === 'TopicSelectionResearchArenaRoleExecution@v2'
          ? execution.execution_provenance_hash
          : null,
      };
    if (transcriptSchemaVersion === 'TopicSelectionResearchArenaLoopTranscript@v1'
      && execution.schema_version !== 'TopicSelectionResearchArenaRoleExecution@v1') {
      throw new AppError(409, 'VERSION_CONFLICT', 'Legacy Arena transcript cannot prove a product-v2 role execution.');
    }
    if (!transcriptExecution || stableStringify(transcriptExecution) !== stableStringify(expected)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena transcript role identity does not match durable execution.');
    }
  }

  private assertEvidencePacketIdentity(
    session: TopicSelectionResearchArenaSessionRecord,
    execution: TopicSelectionResearchArenaRoleExecutionRecord,
    packetPayload: Record<string, unknown>,
  ): void {
    const items = this.recordArray(packetPayload.items, 'EvidencePacket items');
    const provenance = execution.retrieval_provenance;
    const evidenceRefs = items.map((item) => this.requireRef(item.evidence_unit_ref, 'evidence_unit'));
    const literatureRefs = items.map((item) => this.requireRef(item.literature_ref, 'literature_record'));
    const expectedEvidence = [...execution.evidence_partition_refs]
      .map((candidate) => this.refKey(candidate)).sort();
    const observedEvidence = evidenceRefs.map((candidate) => this.refKey(candidate)).sort();
    const retrievedLiteratureIds = new Set(provenance.hits.map((hit) => hit.literature_ref.ref_id));
    if (items.length === 0
      || packetPayload.title_card_id !== session.title_card_id
      || packetPayload.participant_role !== execution.participant_role
      || stableStringify(packetPayload.query_intent) !== stableStringify(execution.query_intent)
      || provenance.participant_role !== execution.participant_role
      || stableStringify(provenance.query_intent) !== stableStringify(execution.query_intent)
      || provenance.hits.length === 0
      || provenance.hits.some((hit) => hit.is_stale || !/^[a-f0-9]{64}$/u.test(hit.chunk_hash))
      || stableStringify(observedEvidence) !== stableStringify(expectedEvidence)
      || literatureRefs.some((candidate) => !retrievedLiteratureIds.has(candidate.ref_id))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'EvidencePacket is not resolvable to the admitted role retrieval.');
    }
  }

  private assertProductAuditIdentity(
    execution: Extract<
      TopicSelectionResearchArenaRoleExecutionRecord,
      { schema_version: 'TopicSelectionResearchArenaRoleExecution@v2' }
    >,
    audit: TopicSelectionArtifactRefRecord,
    auditPayload: Record<string, unknown>,
  ): void {
    const provenance = this.requireRecord(auditPayload.provenance, 'Agent invocation audit provenance');
    const validation = this.requireRecord(auditPayload.validation, 'Agent invocation audit validation');
    const expectedNodeId = `topic_selection_research_arena_${execution.participant_role}`;
    if (audit.artifact_kind !== 'diagnostic'
      || auditPayload.schema_version !== 'topic-selection-agent-invocation-audit-v1'
      || auditPayload.status !== 'succeeded'
      || validation.valid !== true
      || auditPayload.node_id !== expectedNodeId
      || provenance.node_id !== expectedNodeId
      || auditPayload.workflow_run_id !== provenance.workflow_run_id
      || audit.workflow_run_id !== auditPayload.workflow_run_id
      || auditPayload.node_attempt_id !== provenance.node_attempt_id
      || provenance.executor_kind !== 'multi_agent_debate'
      || provenance.run_mode !== 'acceptance'
      || provenance.non_provider !== true
      || provenance.structured_output_hash !== execution.output_artifact_hash
      || sha256Text(stableStringify(provenance)) !== execution.execution_provenance_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Agent invocation audit identity does not match the admitted role output.');
    }
  }

  private structuralIndependence(executions: TopicSelectionResearchArenaRoleExecutionRecord[]): boolean {
    const peerOutputKeys = new Set(executions.map((execution) => this.refKey(execution.output_artifact_ref)));
    return executions.every((execution) => execution.pass_kind === 'first_pass'
      && execution.prior_role_hashes.length === 0
      && !execution.exposure_artifact_refs.some((artifactRef) => peerOutputKeys.has(this.refKey(artifactRef))))
      && new Set(executions.map((execution) => execution.runtime_identity_hash)).size === executions.length
      && new Set(executions.map((execution) => this.refKey(execution.evidence_packet_artifact_ref))).size === executions.length;
  }

  private async deriveMemberMeasurement(
    context: MemberMeasurementContext,
    advisoryOutcome: MemberObservation['advisory_outcome'],
    designatedReview: TopicSelectionResearchArenaAdvisoryReviewHistory['reviews'][number] | null,
  ): Promise<{
    workAvoidedStageCount: number | null;
    stageManifest: TopicSelectionResearchStageManifest | null;
  }> {
    if (context.workAvoidedStageKeys.length === 0) {
      return { workAvoidedStageCount: 0, stageManifest: null };
    }
    const baseline = context.workAvoidedBaseline;
    if (!baseline
      || baseline.title_card_id !== context.recipe.title_card_id
      || stableStringify(baseline.unavailable_stage_keys)
        !== stableStringify(context.workAvoidedStageKeys)) {
      return { workAvoidedStageCount: null, stageManifest: null };
    }
    if (!designatedReview
      || designatedReview.review.response !== 'accept'
      || advisoryOutcome === 'selected') {
      return { workAvoidedStageCount: 0, stageManifest: null };
    }
    const manifest = await this.dependencies.advisoryReviewHistoryReader.getStageManifest(
      context.recipe.title_card_id,
    );
    const entryByStage = new Map(manifest.stages.map((entry) => [entry.stage, entry]));
    if (manifest.title_card_id !== context.recipe.title_card_id
      || context.workAvoidedStageKeys.some((stage) => !entryByStage.has(stage))) {
      return { workAvoidedStageCount: null, stageManifest: manifest };
    }
    return {
      workAvoidedStageCount: context.workAvoidedStageKeys.filter((stage) =>
        entryByStage.get(stage)?.state === 'unavailable').length,
      stageManifest: manifest,
    };
  }

  private memberHardBlockers(
    session: TopicSelectionResearchArenaSessionRecord,
    transcriptPayload: Record<string, unknown>,
    executions: TopicSelectionResearchArenaRoleExecutionRecord[],
    history: TopicSelectionResearchArenaAdvisoryReviewHistory | null,
    accounting: ExecutionAccounting,
    memberRole: TopicSelectionResearchArenaCalibrationMemberRole,
    designatedLabelActor: TopicSelectionResearchArenaCalibrationMemberRecipe['label_actor'] | null,
  ): TopicSelectionResearchArenaCalibrationHardBlocker[] {
    const blockers: TopicSelectionResearchArenaCalibrationHardBlocker[] = [];
    const add = (code: TopicSelectionResearchArenaCalibrationHardBlocker['code'], message: string) => {
      blockers.push({ code, message, case_ref: null, member_role: memberRole });
    };
    if (session.support_only !== true || transcriptPayload.support_only !== true) {
      add('AUTHORITY_LEAK', 'Arena calibration source is not support-only.');
    }
    if (!this.structuralIndependence(executions)) {
      add('PEER_EXPOSURE', 'First-pass role exposure is correlated or includes peer output.');
    }
    if (session.supersedes_arena_session_id && session.loop_delta_refs.length === 0) {
      add('MISSING_LOOP_DELTA', 'Retry Arena session has no typed loop delta.');
    }
    if (accounting.provider_call_count !== null && accounting.provider_call_count > 0) {
      add('PROVIDER_CALL', 'Provider activity is outside the authorized Phase 10 calibration boundary.');
    }
    if ((accounting.authorization_pause_count ?? 0) > 1) {
      add('EXTRA_HUMAN_STOP', 'Calibration source records more than one human pause for the semantic decision.');
    }
    if (designatedLabelActor && history && history.reviews.length > 1) {
      add('EXTRA_HUMAN_STOP', 'The pre-registered member has more than one advisory review for one semantic decision.');
    }
    const synthesis = this.requireRecord(transcriptPayload.advisory_synthesis, 'Arena advisory synthesis');
    const dispositions = this.recordArray(synthesis.candidate_dispositions, 'Arena candidate dispositions');
    if (dispositions.some((disposition) => disposition.disposition === 'dropped'
      && (!TOPIC_SELECTION_CANDIDATE_DROP_REASON_CODES.some((code) => code === disposition.drop_reason_code)
        || !Array.isArray(disposition.reopening_conditions)
        || disposition.reopening_conditions.length === 0
        || disposition.reopening_conditions.some((condition) =>
          typeof condition !== 'string' || condition.trim().length === 0)
        || typeof disposition.rationale !== 'string'
        || disposition.rationale.trim().length === 0))) {
      add('INVALID_DROP_JUSTIFICATION', 'Dropped candidate lacks a coded reason, rationale, or reopening condition.');
    }
    if (history?.reviews.some((review) => review.review.response === 'override'
      && (review.review.reason_codes.length === 0 || review.review.rationale.trim().length === 0))) {
      add('UNEXPLAINED_OVERRIDE', 'Human override lacks a coded and reasoned explanation.');
    }
    if (history && history.projection_issues.length > 0) {
      add('REPLAY_DRIFT', 'Advisory review history contains projection or binding issues.');
    }
    return blockers;
  }

  private readAccounting(value: unknown): ExecutionAccounting {
    const record = this.requireRecord(value, 'Arena execution accounting');
    const number = (key: string) => typeof record[key] === 'number'
      && Number.isFinite(record[key])
      && (record[key] as number) >= 0
      ? record[key] as number
      : null;
    return {
      non_provider_role_invocation_count: number('non_provider_role_invocation_count'),
      provider_call_count: number('provider_call_count'),
      retrieval_run_count: number('retrieval_run_count'),
      retrieval_hit_count: number('retrieval_hit_count'),
      evidence_excerpt_chars: number('evidence_excerpt_chars'),
      duration_ms: number('duration_ms'),
      work_avoided_stage_count: number('work_avoided_stage_count'),
      authorization_pause_count: number('authorization_pause_count'),
    };
  }

  private accountingComplete(accounting: ExecutionAccounting): boolean {
    return accounting.provider_call_count === 0
      && accounting.non_provider_role_invocation_count !== null
      && accounting.non_provider_role_invocation_count >= 2
      && accounting.retrieval_run_count !== null
      && accounting.retrieval_run_count >= 2
      && accounting.retrieval_hit_count !== null
      && accounting.evidence_excerpt_chars !== null
      && accounting.evidence_excerpt_chars > 0
      && accounting.duration_ms !== null
      && accounting.work_avoided_stage_count !== null
      && accounting.authorization_pause_count !== null
      && accounting.authorization_pause_count <= 1;
  }

  private readAdvisoryOutcome(
    transcriptPayload: Record<string, unknown>,
  ): MemberObservation['advisory_outcome'] {
    const synthesis = this.requireRecord(transcriptPayload.advisory_synthesis, 'Arena advisory synthesis');
    if (typeof synthesis.outcome !== 'string'
      || !['selected', 'none_viable', 'evidence_expansion_required', 'reframe_required'].includes(synthesis.outcome)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Arena advisory synthesis has no outcome.');
    }
    return synthesis.outcome as MemberObservation['advisory_outcome'];
  }

  private async loadHumanDecisions(
    history: TopicSelectionResearchArenaAdvisoryReviewHistory,
  ): Promise<TopicSelectionHumanConfirmedDecisionRecord[]> {
    const decisionIds = [...new Set(history.reviews.flatMap((review) =>
      review.advancement_binding.human_confirmed_decision_ref?.ref_id
        ? [review.advancement_binding.human_confirmed_decision_ref.ref_id]
        : []))];
    const decisions = await Promise.all(decisionIds.map((decisionId) =>
      this.dependencies.controlPlaneRepository.findHumanConfirmedDecisionById(decisionId)));
    if (decisions.some((decision) => !decision)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Advisory history references a missing HumanConfirmedDecision.');
    }
    return decisions.filter((decision): decision is TopicSelectionHumanConfirmedDecisionRecord => Boolean(decision));
  }

  private async requireSnapshot(session: TopicSelectionResearchArenaSessionRecord): Promise<TopicSelectionInputSnapshotRecord> {
    const snapshot = await this.dependencies.controlPlaneRepository.findInputSnapshotById(session.input_snapshot_id);
    if (!snapshot) throw new AppError(404, 'NOT_FOUND', `InputSnapshot ${session.input_snapshot_id} was not found.`);
    if (snapshot.snapshot_hash !== session.input_snapshot_hash || snapshot.title_card_id !== session.title_card_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena InputSnapshot identity drifted.');
    }
    return snapshot;
  }

  private async requireArtifact(
    ref: TopicSelectionFunctionalRef,
    titleCardId: string,
    inputSnapshotId: string,
  ): Promise<TopicSelectionArtifactRefRecord> {
    if (ref.ref_type !== 'artifact_ref') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Arena calibration source artifacts require artifact_ref refs.');
    }
    const artifact = await this.dependencies.controlPlaneRepository.findArtifactRefById(ref.ref_id);
    if (!artifact) throw new AppError(404, 'NOT_FOUND', `ArtifactRef ${ref.ref_id} was not found.`);
    if (artifact.title_card_id !== titleCardId || artifact.input_snapshot_id !== inputSnapshotId) {
      throw new AppError(409, 'VERSION_CONFLICT', `ArtifactRef ${ref.ref_id} is outside the Arena snapshot.`);
    }
    return artifact;
  }

  private assertArtifactChecksum(
    artifact: TopicSelectionArtifactRefRecord,
    payload: Record<string, unknown>,
    evidencePacket: boolean,
    label: string,
  ): void {
    if (!artifact.checksum || !/^[a-f0-9]{64}$/u.test(artifact.checksum)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `${label} requires a sha256 checksum.`);
    }
    const canonicalPayload = evidencePacket
      ? Object.fromEntries(Object.entries(payload).filter(([key]) => key !== 'packet_hash'))
      : payload;
    if (sha256Text(stableStringify(canonicalPayload)) !== artifact.checksum
      || (evidencePacket && payload.packet_hash !== artifact.checksum)) {
      throw new AppError(409, 'VERSION_CONFLICT', `${label} checksum does not match its canonical payload.`);
    }
  }

  private metricPassed(
    metricKey: TopicSelectionOfflineEvaluationMetricKey,
    observation: CaseObservation,
    requiresExactMemberLabels: boolean,
  ): boolean {
    switch (metricKey) {
      case 'arena_evidence_grounding_rate':
        return observation.members.every((member) => member.evidence_grounding_passed);
      case 'arena_execution_independence_rate':
        return observation.members.every((member) => member.execution_independence_passed);
      case 'arena_replay_integrity_rate':
        return observation.members.every((member) => member.replay_integrity_passed);
      case 'arena_human_label_coverage_rate':
        return observation.members.every((member) => requiresExactMemberLabels
          ? member.human_label_responses.length === 1
          : member.human_label_responses.length > 0);
      case 'arena_cost_latency_accounting_rate':
        return observation.members.every((member) => member.cost_latency_accounting_passed);
      case 'arena_work_avoided_rate':
        return observation.members.some((member) => member.work_avoided_stage_count > 0);
      default:
        throw new AppError(400, 'INVALID_PAYLOAD', `${metricKey} is not an Arena calibration metric.`);
    }
  }

  private metricContribution(
    observation: CaseObservation,
    requiresExactMemberLabels: boolean,
  ): Record<string, unknown> {
    return Object.fromEntries(TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_METRIC_KEYS.map((metricKey) => [
      metricKey,
      this.metricPassed(metricKey, observation, requiresExactMemberLabels),
    ]));
  }

  private observedOutput(observation: CaseObservation): TopicSelectionOfflineEvaluationObservedOutput {
    return {
      key_evidence_refs: observation.members.flatMap((member) => member.evidence_packet_refs),
      counter_evidence_refs: [],
      evidence_refs: observation.members.flatMap((member) => member.evidence_packet_refs),
      blocker_codes: observation.hard_blockers.map((blocker) => blocker.code),
      trace_refs: observation.members.flatMap((member) => [member.transcript_ref, ...member.role_execution_refs]),
      human_override_refs: observation.members.flatMap((member) => member.human_review_refs),
      recheck_action_refs: [],
      memory_refs: [],
      memory_used_as_evidence_refs: [],
      downstream_rework_causes: [],
      payload: {
        research_arena_calibration: observation,
      },
    };
  }

  private readObservation(record: TopicSelectionOfflineEvaluationCaseResultRecord): CaseObservation {
    const raw = record.observed_output.payload.research_arena_calibration;
    if (!caseObservationValidator(raw)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Persisted Arena calibration case result is malformed.');
    }
    return raw;
  }

  private readFrozenPayload(evaluationCase: TopicSelectionOfflineEvaluationCaseRecord): FrozenCasePayload {
    const payload = evaluationCase.frozen_input_bundle.payload;
    if (!frozenCasePayloadValidator(payload)) {
      throw new AppError(409, 'VERSION_CONFLICT', `Calibration case ${evaluationCase.case_key} has a malformed frozen source manifest.`);
    }
    return payload;
  }

  private readPreRegisteredPayload(
    evaluationCase: TopicSelectionOfflineEvaluationCaseRecord,
  ): PreRegisteredCasePayload {
    const payload = evaluationCase.frozen_input_bundle.payload;
    if (!preRegisteredCasePayloadValidator(payload)) {
      throw new AppError(409, 'VERSION_CONFLICT', `Calibration case ${evaluationCase.case_key} has a malformed pre-registration payload.`);
    }
    this.assertProtocolSlot(payload.protocol_slot);
    if ((payload.protocol_slot.work_avoided_stage_keys.length === 0)
      !== (payload.work_avoided_baseline === null)) {
      throw new AppError(409, 'VERSION_CONFLICT', `Calibration case ${evaluationCase.case_key} has an inconsistent work-avoided baseline.`);
    }
    return payload;
  }

  private async createOrRecoverCaseResult(record: TopicSelectionOfflineEvaluationCaseResultRecord): Promise<void> {
    try {
      await this.dependencies.offlineRepository.createCaseResult(record);
      return;
    } catch (error) {
      const existing = await this.dependencies.offlineRepository.findCaseResultByRunAndCaseId(record.run_id, record.case_id);
      if (!existing || stableStringify(existing) !== stableStringify(record)) throw error;
    }
  }

  private async createOrRecoverMetric(record: TopicSelectionOfflineEvaluationMetricResultRecord): Promise<void> {
    try {
      await this.dependencies.offlineRepository.createMetricResult(record);
      return;
    } catch (error) {
      const existing = (await this.dependencies.offlineRepository.listMetricResultsByRunId(record.run_id))
        .find((candidate) => candidate.metric_key === record.metric_key);
      if (!existing || stableStringify(existing) !== stableStringify(record)) throw error;
    }
  }

  private async createOrRecoverReplayDiff(record: TopicSelectionReplayDiffRecord): Promise<void> {
    try {
      await this.dependencies.offlineRepository.createReplayDiff(record);
      return;
    } catch (error) {
      const existing = (await this.dependencies.offlineRepository.listReplayDiffsByRunId(record.run_id))
        .find((candidate) => candidate.replay_diff_id === record.replay_diff_id);
      if (!existing || stableStringify(existing) !== stableStringify(record)) throw error;
    }
  }

  private sessionIdentity(session: TopicSelectionResearchArenaSessionRecord): Record<string, unknown> {
    return {
      arena_session_id: session.arena_session_id,
      title_card_id: session.title_card_id,
      input_snapshot_id: session.input_snapshot_id,
      input_snapshot_hash: session.input_snapshot_hash,
      participant_plan_hash: session.participant_plan_hash,
      participant_roles: session.participant_roles,
      status: session.status,
      termination_reason: session.termination_reason,
      loop_transcript_ref: session.loop_transcript_ref,
      loop_transcript_hash: session.loop_transcript_hash,
      loop_delta_refs: session.loop_delta_refs,
      support_only: session.support_only,
      supersedes_arena_session_id: session.supersedes_arena_session_id,
      superseded_by_arena_session_id: session.superseded_by_arena_session_id,
      created_at: session.created_at,
      updated_at: session.updated_at,
      synthesized_at: session.synthesized_at,
      superseded_at: session.superseded_at,
    };
  }

  private snapshotIdentity(snapshot: TopicSelectionInputSnapshotRecord): Record<string, unknown> {
    return {
      input_snapshot_id: snapshot.input_snapshot_id,
      title_card_id: snapshot.title_card_id,
      target_ref: snapshot.target_ref,
      snapshot_hash: snapshot.snapshot_hash,
      source_refs: snapshot.source_refs,
      permission_refs: snapshot.permission_refs,
      policy_version: snapshot.policy_version,
    };
  }

  private executionIdentity(execution: TopicSelectionResearchArenaRoleExecutionRecord): Record<string, unknown> {
    return {
      schema_version: execution.schema_version,
      execution_identity_status: execution.execution_identity_status,
      arena_role_execution_id: execution.arena_role_execution_id,
      role_slot_id: execution.role_slot_id,
      instance_index: execution.instance_index,
      participant_role: execution.participant_role,
      pass_kind: execution.pass_kind,
      input_snapshot_id: execution.input_snapshot_id,
      input_snapshot_hash: execution.input_snapshot_hash,
      evidence_packet_artifact_ref: execution.evidence_packet_artifact_ref,
      evidence_packet_hash: execution.evidence_packet_hash,
      exposure_artifact_refs: execution.exposure_artifact_refs,
      exposure_set_hash: execution.exposure_set_hash,
      output_artifact_ref: execution.output_artifact_ref,
      output_artifact_hash: execution.output_artifact_hash,
      agent_invocation_audit_artifact_ref: execution.schema_version === 'TopicSelectionResearchArenaRoleExecution@v2'
        ? execution.agent_invocation_audit_artifact_ref
        : null,
      agent_invocation_audit_artifact_hash: execution.schema_version === 'TopicSelectionResearchArenaRoleExecution@v2'
        ? execution.agent_invocation_audit_artifact_hash
        : null,
      execution_provenance_hash: execution.schema_version === 'TopicSelectionResearchArenaRoleExecution@v2'
        ? execution.execution_provenance_hash
        : null,
      prior_role_hashes: execution.prior_role_hashes,
      runtime_identity_hash: execution.runtime_identity_hash,
    };
  }

  private artifactIdentity(artifact: TopicSelectionArtifactRefRecord): Record<string, unknown> {
    return {
      artifact_ref_id: artifact.artifact_ref_id,
      title_card_id: artifact.title_card_id,
      input_snapshot_id: artifact.input_snapshot_id,
      artifact_kind: artifact.artifact_kind,
      storage_kind: artifact.storage_kind,
      checksum: artifact.checksum,
      workflow_run_id: artifact.workflow_run_id,
    };
  }

  private runIdentity(run: TopicSelectionOfflineEvaluationRunRecord): Record<string, unknown> {
    return {
      offline_evaluation_run_id: run.offline_evaluation_run_id,
      dataset_id: run.dataset_id,
      run_key: run.run_key,
      workflow_profile_key: run.workflow_profile_key,
      workflow_profile_version: run.workflow_profile_version,
      model_profile_key: run.model_profile_key,
      search_profile_key: run.search_profile_key,
      policy_version_id: run.policy_version_id,
      metric_keys: run.metric_keys,
      run_payload: run.run_payload,
      started_at: run.started_at,
    };
  }

  private reportDatasetIdentity(
    dataset: Awaited<ReturnType<TopicSelectionResearchArenaCalibrationService['requireDataset']>>,
  ): Record<string, unknown> {
    if (dataset.payload.schema_version !== 'TopicSelectionResearchArenaCalibrationDataset@v2') {
      return { ...dataset };
    }
    return {
      offline_evaluation_dataset_id: dataset.offline_evaluation_dataset_id,
      workspace_id: dataset.workspace_id,
      dataset_key: dataset.dataset_key,
      dataset_version: dataset.dataset_version,
      stage: dataset.stage,
      source: dataset.source,
      payload: dataset.payload,
      created_by: dataset.created_by,
      created_at: dataset.created_at,
    };
  }

  private humanDecisionIdentity(decision: TopicSelectionHumanConfirmedDecisionRecord): Record<string, unknown> {
    return {
      human_confirmed_decision_id: decision.human_confirmed_decision_id,
      title_card_id: decision.title_card_id,
      target_ref: decision.target_ref,
      decision_type: decision.decision_type,
      actor: decision.actor,
      artifact_refs: decision.artifact_refs,
      resulting_authority_refs: decision.resulting_authority_refs,
    };
  }

  private caseRef(evaluationCase: TopicSelectionOfflineEvaluationCaseRecord): TopicSelectionFunctionalRef {
    return this.ref(
      'offline_evaluation_case',
      evaluationCase.offline_evaluation_case_id,
      evaluationCase.title_card_id,
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
      version_id: versionId ?? null,
      title_card_id: titleCardId ?? null,
    };
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    return [...new Map(refs.map((candidate) => [this.refKey(candidate), candidate])).values()];
  }

  private uniqueBlockers(
    blockers: TopicSelectionResearchArenaCalibrationHardBlocker[],
  ): TopicSelectionResearchArenaCalibrationHardBlocker[] {
    return [...new Map(blockers.map((blocker) => [stableStringify(blocker), blocker])).values()];
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
  }

  private requireRecordPayload(artifact: TopicSelectionArtifactRefRecord, label: string): Record<string, unknown> {
    return this.requireRecord(artifact.payload, `${label} payload`);
  }

  private requireRecord(value: unknown, label: string): Record<string, unknown> {
    if (!this.isRecord(value)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `${label} must be an object.`);
    }
    return value;
  }

  private recordArray(value: unknown, label: string): Record<string, unknown>[] {
    if (!Array.isArray(value) || value.some((candidate) => !this.isRecord(candidate))) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `${label} must be an object array.`);
    }
    return value as Record<string, unknown>[];
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  private requireRef(value: unknown, refType: string): TopicSelectionFunctionalRef {
    if (!functionalRefValidator(value) || value.ref_type !== refType) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `Expected a ${refType} functional ref.`);
    }
    return value;
  }

  private async requireDataset(datasetId: string) {
    const dataset = await this.dependencies.offlineRepository.findDatasetById(datasetId);
    if (!dataset) throw new AppError(404, 'NOT_FOUND', `OfflineEvaluationDataset ${datasetId} was not found.`);
    return dataset;
  }

  private async requireRun(runId: string): Promise<TopicSelectionOfflineEvaluationRunRecord> {
    const run = await this.dependencies.offlineRepository.findRunById(runId);
    if (!run) throw new AppError(404, 'NOT_FOUND', `OfflineEvaluationRun ${runId} was not found.`);
    return run;
  }

  private async casesForRun(
    run: TopicSelectionOfflineEvaluationRunRecord,
    datasetPayload: Record<string, unknown>,
  ): Promise<TopicSelectionOfflineEvaluationCaseRecord[]> {
    const allCases = await this.dependencies.offlineRepository.listCasesByDatasetId(run.dataset_id);
    if (datasetPayload.schema_version !== 'TopicSelectionResearchArenaCalibrationDataset@v2') {
      return allCases.filter((candidate) => candidate.status === 'active');
    }
    const protocol = this.readProtocolDatasetPayload(datasetPayload, run.dataset_id);
    if (!protocolRunPayloadValidator(run.run_payload)
      || run.run_payload.protocol_hash !== sha256Text(stableStringify(protocol.protocol_manifest))
      || run.workflow_profile_key !== 'topic-selection-research-arena-calibration'
      || run.workflow_profile_version !== 'v2'
      || run.model_profile_key !== null
      || run.search_profile_key !== null
      || run.policy_version_id !== null
      || stableStringify(run.metric_keys)
        !== stableStringify(TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_METRIC_KEYS)) {
      throw new AppError(409, 'VERSION_CONFLICT', `Calibration run ${run.offline_evaluation_run_id} has no valid frozen Phase 10B case manifest.`);
    }
    const caseIds = run.run_payload.cases.map((candidate) => candidate.case_id);
    const caseKeys = run.run_payload.cases.map((candidate) => candidate.case_key);
    if (new Set(caseIds).size !== caseIds.length || new Set(caseKeys).size !== caseKeys.length) {
      throw new AppError(409, 'VERSION_CONFLICT', `Calibration run ${run.offline_evaluation_run_id} repeats a frozen case identity.`);
    }
    const byId = new Map(allCases.map((candidate) => [candidate.offline_evaluation_case_id, candidate]));
    if (run.case_count !== run.run_payload.cases.length) {
      throw new AppError(409, 'VERSION_CONFLICT', `Calibration run ${run.offline_evaluation_run_id} case count drifted.`);
    }
    return run.run_payload.cases.map((frozen) => {
      const evaluationCase = byId.get(frozen.case_id);
      if (!evaluationCase
        || evaluationCase.status !== 'active'
        || evaluationCase.case_key !== frozen.case_key
        || sha256Text(stableStringify(evaluationCase)) !== frozen.case_hash) {
        throw new AppError(409, 'VERSION_CONFLICT', `Calibration run ${run.offline_evaluation_run_id} case identity drifted.`);
      }
      return evaluationCase;
    });
  }

  private assertResearchArenaDataset(stage: string, datasetId: string): void {
    if (stage !== 'research_arena') {
      throw new AppError(404, 'NOT_FOUND', `OfflineEvaluationDataset ${datasetId} was not found for research_arena.`);
    }
  }

  private requireArenaCaseType(caseType: string): CaseObservation['case_type'] {
    if (!TOPIC_SELECTION_RESEARCH_ARENA_OFFLINE_EVALUATION_CASE_TYPES.some((candidate) => candidate === caseType)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `OfflineEvaluationCase has unsupported Arena case type ${caseType}.`,
      );
    }
    return caseType as CaseObservation['case_type'];
  }
}
