import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { Prisma } from '@prisma/client';

import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionTopicQuestionAnswerabilityPlanRecord,
  TopicSelectionTopicQuestionContractRecord,
  TopicSelectionTopicQuestionEvidenceRefRecord,
  TopicSelectionTopicQuestionFalsificationConditionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-question-contracts';
import type {
  TopicSelectionAssessTopicValueRunRecord,
  TopicSelectionTopicValueAssessmentInputSnapshotRecord,
  TopicSelectionTopicValueAssessmentRecord,
  TopicSelectionTopicValueEvidenceRefRecord,
  TopicSelectionValueDispositionDecisionRecord,
  TopicSelectionValueReasoningMemoRecord,
  TopicSelectionV1bPackageDraftInput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionV1bTopicPackageRepository } from '../repositories/in-memory-topic-selection-v1b-topic-package-repository.js';
import { PrismaTopicSelectionV1bTopicPackageRepository } from '../repositories/prisma/prisma-topic-selection-v1b-topic-package-repository.js';
import type {
  TopicSelectionTopicValueAssessmentPersistence,
  TopicSelectionValueDispositionDecisionPersistence,
  TopicSelectionV1bValueAssessmentRepository,
} from '../repositories/topic-selection-v1b-value-assessment.repository.js';
import { TopicSelectionV1bTopicPackageService } from './topic-selection-v1b-topic-package-service.js';

const NOW = '2026-05-14T10:00:00.000Z';
const TITLE_CARD_ID = 'title_card_t058';

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: TITLE_CARD_ID,
    version_id: versionId,
  };
}

function makeIdFactory() {
  const counters = new Map<string, number>();
  return (prefix: string) => {
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    return `${prefix}_${next}`;
  };
}

class StubValueAssessmentRepository implements TopicSelectionV1bValueAssessmentRepository {
  async listDispositionDecisionsByTitleCardId(): Promise<TopicSelectionValueDispositionDecisionRecord[]> {
    return [];
  }

  readonly decisions = new Map<string, TopicSelectionValueDispositionDecisionRecord>();

  constructor(decisions: TopicSelectionValueDispositionDecisionRecord[]) {
    for (const decision of decisions) {
      this.decisions.set(decision.value_disposition_decision_id, decision);
    }
  }

  async createAssessmentRun(): Promise<TopicSelectionAssessTopicValueRunRecord> {
    throw new Error('not implemented');
  }

  async findAssessmentRunById(): Promise<TopicSelectionAssessTopicValueRunRecord | null> {
    throw new Error('not implemented');
  }

  async createAssessmentWithMemo(): Promise<TopicSelectionTopicValueAssessmentPersistence> {
    throw new Error('not implemented');
  }

  async findAssessmentById(): Promise<TopicSelectionTopicValueAssessmentRecord | null> {
    throw new Error('not implemented');
  }

  async listAssessmentsByTitleCardId(): Promise<TopicSelectionTopicValueAssessmentRecord[]> {
    return [];
  }

  async findInputSnapshotById(): Promise<TopicSelectionTopicValueAssessmentInputSnapshotRecord | null> {
    throw new Error('not implemented');
  }

  async findReasoningMemoById(): Promise<TopicSelectionValueReasoningMemoRecord | null> {
    throw new Error('not implemented');
  }

  async listEvidenceRefsByAssessmentId(): Promise<TopicSelectionTopicValueEvidenceRefRecord[]> {
    throw new Error('not implemented');
  }

  async createDispositionDecision(
    persistence: TopicSelectionValueDispositionDecisionPersistence,
  ): Promise<TopicSelectionValueDispositionDecisionRecord> {
    this.decisions.set(
      persistence.decision.value_disposition_decision_id,
      persistence.decision,
    );
    return persistence.decision;
  }

  async findDispositionDecisionById(
    decisionId: string,
  ): Promise<TopicSelectionValueDispositionDecisionRecord | null> {
    return this.decisions.get(decisionId) ?? null;
  }

  async patchDispositionDecisionOutputTopicPackage(
    decisionId: string,
    outputTopicPackageId: string,
  ): Promise<TopicSelectionValueDispositionDecisionRecord> {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new Error(`ValueDispositionDecision ${decisionId} not found.`);
    }
    const next = {
      ...decision,
      output_topic_package_id: outputTopicPackageId,
    };
    this.decisions.set(decisionId, next);
    return next;
  }
}

function makeAssessment(): TopicSelectionTopicValueAssessmentRecord {
  return {
    topic_value_assessment_id: 'topic_value_assessment_1',
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    topic_question_id: 'topic_question_1',
    topic_question_contract_id: 'topic_question_contract_1',
    research_record_id: 'topic_research_record_value_1',
    source_research_slice_id: 'research_slice_1',
    source_research_slice_version: 'v1',
    assess_topic_value_run_id: 'assess_topic_value_run_1',
    topic_value_input_snapshot_id: 'topic_value_input_snapshot_1',
    value_reasoning_memo_id: 'value_reasoning_memo_1',
    active_disposition_decision_id: 'value_disposition_decision_1',
    readiness_status: 'ready',
    freshness_status: 'current',
    strongest_claim_if_success: 'The workflow improves trace completeness in offline replay.',
    fallback_claim_if_success: 'The workflow exposes trace gaps earlier than manual planning.',
    hard_gates: [
      {
        gate_key: 'value_signal',
        verdict: 'pass',
        severity: 'info',
        overridable_with_risk: false,
        rationale: 'Value signal is positive.',
        refs: [ref('evidence_unit', 'support_1')],
      },
      {
        gate_key: 'non_solved_sanity',
        verdict: 'pass',
        severity: 'info',
        overridable_with_risk: false,
        rationale: 'No solved baseline found.',
        refs: [ref('evidence_unit', 'baseline_1')],
      },
      {
        gate_key: 'answerability_sanity',
        verdict: 'pass',
        severity: 'info',
        overridable_with_risk: false,
        rationale: 'Answerability plan is concrete.',
        refs: [ref('evidence_unit', 'support_1')],
      },
      {
        gate_key: 'feasibility_sanity',
        verdict: 'pass',
        severity: 'info',
        overridable_with_risk: false,
        rationale: 'Feasible with local replay.',
        refs: [ref('evidence_unit', 'support_1')],
      },
      {
        gate_key: 'evidence_sanity',
        verdict: 'pass',
        severity: 'info',
        overridable_with_risk: false,
        rationale: 'Evidence refs are inherited.',
        refs: [ref('evidence_unit', 'support_1')],
      },
      {
        gate_key: 'claim_ceiling_fit',
        verdict: 'pass',
        severity: 'info',
        overridable_with_risk: false,
        rationale: 'Claim stays within ceiling.',
        refs: [ref('evidence_unit', 'support_1')],
      },
    ],
    dimension_scores: [
      'significance',
      'originality',
      'answerability',
      'feasibility',
      'claim_ceiling_fit',
      'reviewer_risk',
      'effort_to_value_fit',
      'strategic_fit',
      'negative_memory_check',
    ].map((dimension) => ({
      dimension_key: dimension as TopicSelectionTopicValueAssessmentRecord['dimension_scores'][number]['dimension_key'],
      score: 80,
      rationale: `${dimension} is sufficient.`,
      evidence_refs: [ref('evidence_unit', 'support_1')],
      uncertainty: 'medium',
    })),
    risk_penalty: {},
    reviewer_objections: ['Trace completeness may not transfer to live review.'],
    ceiling_case: 'Reviewer-aligned planning feasibility.',
    base_case: 'Earlier trace gap detection.',
    floor_case: 'Clearer audit artifacts.',
    legacy_verdict: 'refine',
    total_score: 82,
    value_summary: 'The question is valuable enough for a draft package.',
    confidence: 0.82,
    accepted_risk_refs: [ref('accepted_risk', 'risk_1')],
    blocker_refs: [],
    risk_notes: ['Evidence freshness can drift.'],
    trace_snapshot_id: 'trace_snapshot_value_1',
    workflow_run_id: 'workflow_run_value_1',
    gate_result_id: 'gate_result_value_1',
    transition_attempt_id: 'transition_value_1',
    artifact_refs: [],
    created_at: NOW,
    updated_at: NOW,
  };
}

function makeMemo(): TopicSelectionValueReasoningMemoRecord {
  return {
    value_reasoning_memo_id: 'value_reasoning_memo_1',
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    topic_value_assessment_id: 'topic_value_assessment_1',
    topic_question_contract_id: 'topic_question_contract_1',
    recommendation: 'advance_to_package',
    value_thesis: 'A trace-ready workflow can make reviewer-facing evidence gaps visible before commitment.',
    significance: 'Reviewer-aligned evidence workflows are a recurring paper-engineering bottleneck.',
    originality: 'The package emphasizes trace completeness rather than prose generation.',
    claim_leverage: 'Claims remain bounded to offline replay feasibility.',
    reviewer_risks: ['Reviewers may require stronger live workflow evidence.'],
    effort_to_value: 'The work fits the available local corpus and replay budget.',
    strategic_fit: 'The package aligns with local-first paper engineering.',
    negative_memory_check: 'No negative memory blocks this draft.',
    evidence_backed_rationale: 'All claims cite inherited evidence refs.',
    top_objections: ['Offline replay may not generalize.'],
    uncertainty: 'Medium uncertainty from evidence freshness.',
    disposition_bridge: 'Advance only to draft package, not promotion.',
    requires_critic_review: false,
    critic_triggers: [],
    cited_refs: [ref('evidence_unit', 'support_1')],
    created_by_workflow_run_id: 'workflow_run_value_1',
    artifact_refs: [],
    created_at: NOW,
  };
}

function makeQuestionContract(
  overrides: Partial<TopicSelectionTopicQuestionContractRecord> = {},
): TopicSelectionTopicQuestionContractRecord {
  return {
    topic_question_contract_id: 'topic_question_contract_1',
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    topic_question_id: 'topic_question_1',
    version: 'v1',
    answerability_plan_id: 'answerability_plan_1',
    source_research_slice_id: 'research_slice_1',
    source_research_slice_version: 'v1',
    source_candidate_id: 'topic_question_candidate_1',
    selection_decision_id: 'topic_question_selection_1',
    input_snapshot_ref: ref('input_snapshot', 'question_input_1'),
    contract_hash: 'contract_hash_1',
    main_question: 'Can a local-first assistant improve trace completeness for reviewer-aligned evidence planning?',
    question_type: 'system',
    contribution_hypothesis: 'system',
    target_setting: 'Offline paper-engineering workflows.',
    target_community: 'LLM systems researchers',
    expected_claim: 'The workflow improves trace completeness in offline replay.',
    fallback_claim: 'The workflow exposes trace gaps earlier than manual planning.',
    max_claim_strength: 'Offline replay feasibility and trace completeness.',
    evaluation_route: 'Replay frozen evidence snapshots.',
    claim_ceiling: 'Can claim reviewer-aligned planning feasibility, not production superiority.',
    prohibited_claims: ['production superiority'],
    required_evidence_categories: ['support', 'baseline', 'challenge'],
    allowed_refinements: ['narrow metric scope'],
    stop_reopen_conditions: ['new baseline solves the workflow'],
    accepted_risk_refs: [ref('accepted_risk', 'risk_1')],
    risk_notes: ['Evidence freshness can drift.'],
    status: 'active',
    created_by_workflow_run_id: 'workflow_run_question_1',
    artifact_refs: [],
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makeAnswerabilityPlan(): TopicSelectionTopicQuestionAnswerabilityPlanRecord {
  return {
    topic_question_answerability_plan_id: 'answerability_plan_1',
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    topic_question_id: 'topic_question_1',
    topic_question_contract_id: 'topic_question_contract_1',
    answerability_verdict: 'answerable',
    datasets_or_resources: ['frozen evidence snapshots'],
    metrics: ['trace completeness'],
    baselines: ['manual spreadsheet planning'],
    ablations_or_comparisons: ['with and without trace boundary checks'],
    evaluation_setting: 'Offline replay.',
    dependency_risks: ['Snapshot coverage can drift.'],
    open_dependencies: [],
    known_gaps: ['Need later live workflow validation.'],
    required_evidence_refs: [ref('evidence_unit', 'support_1')],
    created_at: NOW,
  };
}

function makeEvidenceRef(): TopicSelectionTopicQuestionEvidenceRefRecord {
  return {
    topic_question_evidence_ref_id: 'topic_question_evidence_ref_1',
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    topic_question_id: 'topic_question_1',
    topic_question_contract_id: 'topic_question_contract_1',
    evidence_ref: ref('evidence_unit', 'support_1'),
    evidence_role: 'support',
    mapped_question_part: 'trace completeness',
    rationale: 'Supports the package claim.',
    source_locator_snapshot: {},
    created_at: NOW,
  };
}

function makeFalsificationCondition(): TopicSelectionTopicQuestionFalsificationConditionRecord {
  return {
    topic_question_falsification_condition_id: 'falsification_condition_1',
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    topic_question_contract_id: 'topic_question_contract_1',
    condition_type: 'solved_by_baseline',
    severity: 'hard',
    statement: 'A manual baseline already reaches complete trace coverage.',
    trigger_evidence_refs: [ref('evidence_unit', 'baseline_1')],
    trigger_source_refs: [ref('search_run', 'search_run_1')],
    related_contract_fields: ['evaluation_route'],
    expected_action: 'drop',
    check_timing: 'before_promotion',
    confidence: 'medium',
    status: 'active',
    created_at: NOW,
  };
}

function makePackageDraftInput(
  overrides: Partial<TopicSelectionV1bPackageDraftInput> = {},
): TopicSelectionV1bPackageDraftInput {
  const assessment = makeAssessment();
  const memo = makeMemo();
  const questionContract = makeQuestionContract();
  const answerabilityPlan = makeAnswerabilityPlan();
  const decisionWithoutPackage: Omit<TopicSelectionValueDispositionDecisionRecord, 'package_draft_input'> = {
    value_disposition_decision_id: 'value_disposition_decision_1',
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    topic_value_assessment_id: assessment.topic_value_assessment_id,
    topic_question_contract_id: questionContract.topic_question_contract_id,
    value_reasoning_memo_id: memo.value_reasoning_memo_id,
    decision: 'advance_to_package',
    decided_by: 'system',
    decision_rationale: 'Value gates passed.',
    required_actions: [],
    loopback_target_ref: null,
    blocking_contexts: [],
    accepted_risk_refs: [ref('accepted_risk', 'risk_1')],
    blocker_refs: [],
    output_topic_package_id: null,
    status: 'active',
    is_current: true,
    input_snapshot_id: 'input_snapshot_decision_1',
    workflow_run_id: 'workflow_run_decision_1',
    gate_result_id: 'gate_result_decision_1',
    transition_attempt_id: 'transition_decision_1',
    artifact_refs: [],
    created_at: NOW,
  };
  return {
    topic_value_assessment_ref: ref('topic_value_assessment', assessment.topic_value_assessment_id),
    value_reasoning_memo_ref: ref('value_reasoning_memo', memo.value_reasoning_memo_id),
    value_disposition_decision_ref: ref('value_disposition_decision', decisionWithoutPackage.value_disposition_decision_id),
    topic_question_ref: ref('topic_question', 'topic_question_1'),
    topic_question_contract_ref: ref('topic_question_contract', questionContract.topic_question_contract_id, 'v1'),
    answerability_plan_ref: ref('topic_question_answerability_plan', answerabilityPlan.topic_question_answerability_plan_id),
    research_slice_ref: ref('research_slice', 'research_slice_1', 'v1'),
    validated_need_refs: [ref('validated_need', 'validated_need_1')],
    evidence_refs: [makeEvidenceRef()],
    boundary_refs: [],
    assumption_refs: [],
    falsification_conditions: [makeFalsificationCondition()],
    accepted_risk_refs: [ref('accepted_risk', 'risk_1')],
    memory_suggestion_refs: [ref('memory_suggestion', 'memory_1')],
    recheck_request_refs: [ref('recheck_request', 'recheck_1')],
    topic_value_assessment: assessment,
    value_reasoning_memo: memo,
    value_disposition_decision: decisionWithoutPackage,
    question_contract: questionContract,
    answerability_plan: answerabilityPlan,
    research_slice_snapshot: {
      research_slice_id: 'research_slice_1',
      evaluation_path: 'Offline replay plus reviewer rubric scoring.',
      non_goals: ['production deployment'],
    },
    ...overrides,
  };
}

function makeDecision(
  packageInput: TopicSelectionV1bPackageDraftInput,
  overrides: Partial<TopicSelectionValueDispositionDecisionRecord> = {},
): TopicSelectionValueDispositionDecisionRecord {
  return {
    ...packageInput.value_disposition_decision,
    package_draft_input: packageInput,
    ...overrides,
  };
}

function makeSubject(decision: TopicSelectionValueDispositionDecisionRecord) {
  const valueRepository = new StubValueAssessmentRepository([decision]);
  const packageRepository = new InMemoryTopicSelectionV1bTopicPackageRepository(valueRepository);
  const service = new TopicSelectionV1bTopicPackageService({
    repository: packageRepository,
    valueAssessmentRepository: valueRepository,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  return { service, valueRepository };
}

class RaceGuardedTopicPackageRepository extends InMemoryTopicSelectionV1bTopicPackageRepository {
  private createCallCount = 0;
  private releaseCreateBarrier: (() => void) | null = null;
  private readonly createBarrier = new Promise<void>((resolve) => {
    this.releaseCreateBarrier = resolve;
  });
  private readonly reservedDecisionIds = new Set<string>();

  async createDraftPackage(
    persistence: Parameters<InMemoryTopicSelectionV1bTopicPackageRepository['createDraftPackage']>[0],
  ): ReturnType<InMemoryTopicSelectionV1bTopicPackageRepository['createDraftPackage']> {
    this.createCallCount += 1;
    if (this.createCallCount >= 2) {
      this.releaseCreateBarrier?.();
    }
    await this.createBarrier;
    const decisionId = persistence.topic_package.value_disposition_decision_id;
    if (this.reservedDecisionIds.has(decisionId)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'TopicPackage already exists for this ValueDispositionDecision.');
    }
    this.reservedDecisionIds.add(decisionId);
    try {
      return await super.createDraftPackage(persistence);
    } catch (error) {
      this.reservedDecisionIds.delete(decisionId);
      throw error;
    }
  }
}

function makeRaceSubject(decision: TopicSelectionValueDispositionDecisionRecord) {
  const valueRepository = new StubValueAssessmentRepository([decision]);
  const packageRepository = new RaceGuardedTopicPackageRepository(valueRepository);
  const service = new TopicSelectionV1bTopicPackageService({
    repository: packageRepository,
    valueAssessmentRepository: valueRepository,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  return { service, valueRepository };
}

type FakeRow = Record<string, unknown>;
type FakeCreateArgs = { data: FakeRow };
type FakeFindArgs = { where: Record<string, unknown> };
type FakeTopicPackagePrismaShape = {
  $transaction: <T>(callback: (tx: FakeTopicPackagePrismaShape) => Promise<T>) => Promise<T>;
  topicSelectionInputSnapshot: { create: (args: FakeCreateArgs) => Promise<FakeRow> };
  topicSelectionLlmWorkflowRun: { create: (args: FakeCreateArgs) => Promise<FakeRow> };
  topicSelectionArtifactRef: { create: (args: FakeCreateArgs) => Promise<FakeRow> };
  topicSelectionReadinessGateResult: { create: (args: FakeCreateArgs) => Promise<FakeRow> };
  topicSelectionChainTransitionAttempt: { create: (args: FakeCreateArgs) => Promise<FakeRow> };
  topicSelectionTraceSnapshot: { create: (args: FakeCreateArgs) => Promise<FakeRow> };
  titleCardResearchRecord: { create: (args: FakeCreateArgs) => Promise<FakeRow> };
  titleCardPackage: {
    create: (args: FakeCreateArgs) => Promise<FakeRow>;
    findUnique: (args: FakeFindArgs) => Promise<FakeRow | null>;
  };
  topicSelectionPackageTraceBoundaryCheck: {
    create: (args: FakeCreateArgs) => Promise<FakeRow>;
    findUnique: (args: FakeFindArgs) => Promise<FakeRow | null>;
  };
  topicSelectionTopicPackageReadinessAssessment: {
    create: (args: FakeCreateArgs) => Promise<FakeRow>;
    findUnique: (args: FakeFindArgs) => Promise<FakeRow | null>;
  };
  topicSelectionV1bToV1cInputBundle: {
    create: (args: FakeCreateArgs) => Promise<FakeRow>;
    findFirst: (args: FakeFindArgs) => Promise<FakeRow | null>;
  };
  topicSelectionValueDispositionDecision: {
    update: (args: { where: Record<string, unknown>; data: FakeRow }) => Promise<FakeRow>;
  };
};

class FakeTopicPackagePrismaClient {
  failOnTitleCardPackageCreate = false;
  failOnTitleCardPackageValueDispositionUnique = false;
  readonly inputSnapshots = new Map<string, FakeRow>();
  readonly workflowRuns = new Map<string, FakeRow>();
  readonly artifactRefs = new Map<string, FakeRow>();
  readonly gateResults = new Map<string, FakeRow>();
  readonly transitionAttempts = new Map<string, FakeRow>();
  readonly traceSnapshots = new Map<string, FakeRow>();
  readonly titleCardResearchRecords = new Map<string, FakeRow>();
  readonly titleCardPackages = new Map<string, FakeRow>();
  readonly traceChecks = new Map<string, FakeRow>();
  readonly readinessAssessments = new Map<string, FakeRow>();
  readonly v1cBundles = new Map<string, FakeRow>();
  readonly valueDecisionOutputs = new Map<string, string>();
  readonly client: FakeTopicPackagePrismaShape;

  constructor() {
    this.client = {
      $transaction: async <T>(callback: (tx: FakeTopicPackagePrismaShape) => Promise<T>): Promise<T> => {
        const snapshot = this.snapshot();
        try {
          return await callback(this.client);
        } catch (error) {
          this.restore(snapshot);
          throw error;
        }
      },
      topicSelectionInputSnapshot: {
        create: async ({ data }: FakeCreateArgs): Promise<FakeRow> => {
          this.inputSnapshots.set(String(data.id), data);
          return data;
        },
      },
      topicSelectionLlmWorkflowRun: {
        create: async ({ data }: FakeCreateArgs): Promise<FakeRow> => {
          this.workflowRuns.set(String(data.id), data);
          return data;
        },
      },
      topicSelectionArtifactRef: {
        create: async ({ data }: FakeCreateArgs): Promise<FakeRow> => {
          this.artifactRefs.set(String(data.id), data);
          return data;
        },
      },
      topicSelectionReadinessGateResult: {
        create: async ({ data }: FakeCreateArgs): Promise<FakeRow> => {
          this.gateResults.set(String(data.id), data);
          return data;
        },
      },
      topicSelectionChainTransitionAttempt: {
        create: async ({ data }: FakeCreateArgs): Promise<FakeRow> => {
          this.transitionAttempts.set(String(data.id), data);
          return data;
        },
      },
      topicSelectionTraceSnapshot: {
        create: async ({ data }: FakeCreateArgs): Promise<FakeRow> => {
          this.traceSnapshots.set(String(data.id), data);
          return data;
        },
      },
      titleCardResearchRecord: {
        create: async ({ data }: FakeCreateArgs): Promise<FakeRow> => {
          this.titleCardResearchRecords.set(String(data.id), data);
          return data;
        },
      },
      titleCardPackage: {
        create: async ({ data }: FakeCreateArgs): Promise<FakeRow> => {
          if (this.failOnTitleCardPackageCreate) {
            throw new Error('injected title card package failure');
          }
          if (this.failOnTitleCardPackageValueDispositionUnique) {
            throw new Prisma.PrismaClientKnownRequestError(
              'duplicate v1bSourceValueDispositionDecisionId',
              {
                clientVersion: 'test',
                code: 'P2002',
                meta: { target: ['v1bSourceValueDispositionDecisionId'] },
              },
            );
          }
          this.titleCardPackages.set(String(data.id), data);
          return data;
        },
        findUnique: async ({ where }: FakeFindArgs): Promise<FakeRow | null> => {
          if (where.id) {
            return this.titleCardPackages.get(String(where.id)) ?? null;
          }
          if (where.v1bSourceValueDispositionDecisionId) {
            return [...this.titleCardPackages.values()]
              .find((row) => row.v1bSourceValueDispositionDecisionId === where.v1bSourceValueDispositionDecisionId)
              ?? null;
          }
          return null;
        },
      },
      topicSelectionPackageTraceBoundaryCheck: {
        create: async ({ data }: FakeCreateArgs): Promise<FakeRow> => {
          this.traceChecks.set(String(data.id), data);
          return data;
        },
        findUnique: async ({ where }: FakeFindArgs): Promise<FakeRow | null> =>
          this.traceChecks.get(String(where.id)) ?? null,
      },
      topicSelectionTopicPackageReadinessAssessment: {
        create: async ({ data }: FakeCreateArgs): Promise<FakeRow> => {
          this.readinessAssessments.set(String(data.id), data);
          return data;
        },
        findUnique: async ({ where }: FakeFindArgs): Promise<FakeRow | null> =>
          this.readinessAssessments.get(String(where.id)) ?? null,
      },
      topicSelectionV1bToV1cInputBundle: {
        create: async ({ data }: FakeCreateArgs): Promise<FakeRow> => {
          this.v1cBundles.set(String(data.id), data);
          return data;
        },
        findFirst: async ({ where }: FakeFindArgs): Promise<FakeRow | null> =>
          [...this.v1cBundles.values()]
            .find((row) => row.topicPackageId === where.topicPackageId)
          ?? null,
      },
      topicSelectionValueDispositionDecision: {
        update: async ({ where, data }: { where: Record<string, unknown>; data: FakeRow }): Promise<FakeRow> => {
          this.valueDecisionOutputs.set(String(where.id), String(data.outputTopicPackageId));
          return { id: where.id, ...data };
        },
      },
    };
  }

  private snapshot() {
    return {
      inputSnapshots: new Map(this.inputSnapshots),
      workflowRuns: new Map(this.workflowRuns),
      artifactRefs: new Map(this.artifactRefs),
      gateResults: new Map(this.gateResults),
      transitionAttempts: new Map(this.transitionAttempts),
      traceSnapshots: new Map(this.traceSnapshots),
      titleCardResearchRecords: new Map(this.titleCardResearchRecords),
      titleCardPackages: new Map(this.titleCardPackages),
      traceChecks: new Map(this.traceChecks),
      readinessAssessments: new Map(this.readinessAssessments),
      v1cBundles: new Map(this.v1cBundles),
      valueDecisionOutputs: new Map(this.valueDecisionOutputs),
    };
  }

  private restore(snapshot: ReturnType<FakeTopicPackagePrismaClient['snapshot']>): void {
    this.inputSnapshots.clear();
    this.workflowRuns.clear();
    this.artifactRefs.clear();
    this.gateResults.clear();
    this.transitionAttempts.clear();
    this.traceSnapshots.clear();
    this.titleCardResearchRecords.clear();
    this.titleCardPackages.clear();
    this.traceChecks.clear();
    this.readinessAssessments.clear();
    this.v1cBundles.clear();
    this.valueDecisionOutputs.clear();
    for (const [id, row] of snapshot.inputSnapshots) this.inputSnapshots.set(id, row);
    for (const [id, row] of snapshot.workflowRuns) this.workflowRuns.set(id, row);
    for (const [id, row] of snapshot.artifactRefs) this.artifactRefs.set(id, row);
    for (const [id, row] of snapshot.gateResults) this.gateResults.set(id, row);
    for (const [id, row] of snapshot.transitionAttempts) this.transitionAttempts.set(id, row);
    for (const [id, row] of snapshot.traceSnapshots) this.traceSnapshots.set(id, row);
    for (const [id, row] of snapshot.titleCardResearchRecords) this.titleCardResearchRecords.set(id, row);
    for (const [id, row] of snapshot.titleCardPackages) this.titleCardPackages.set(id, row);
    for (const [id, row] of snapshot.traceChecks) this.traceChecks.set(id, row);
    for (const [id, row] of snapshot.readinessAssessments) this.readinessAssessments.set(id, row);
    for (const [id, row] of snapshot.v1cBundles) this.v1cBundles.set(id, row);
    for (const [id, row] of snapshot.valueDecisionOutputs) this.valueDecisionOutputs.set(id, row);
  }
}

function makePrismaSubject(decision: TopicSelectionValueDispositionDecisionRecord) {
  const valueRepository = new StubValueAssessmentRepository([decision]);
  const fakePrisma = new FakeTopicPackagePrismaClient();
  const packageRepository = new PrismaTopicSelectionV1bTopicPackageRepository(
    fakePrisma.client as never,
  );
  const service = new TopicSelectionV1bTopicPackageService({
    repository: packageRepository,
    valueAssessmentRepository: valueRepository,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  return { service, packageRepository, fakePrisma };
}

test('advance_to_package decision creates trace-ready draft package and v1c bundle', async () => {
  const packageInput = makePackageDraftInput();
  const decision = makeDecision(packageInput);
  const { service, valueRepository } = makeSubject(decision);

  const result = await service.createDraftPackage({
    value_disposition_decision_id: decision.value_disposition_decision_id,
  });
  const bundle = await service.publishV1cInputBundle({
    topic_package_id: result.topic_package.topic_package_id,
  });
  const patchedDecision = await valueRepository.findDispositionDecisionById(decision.value_disposition_decision_id);

  assert.equal(result.topic_package.package_readiness_status, 'ready_for_promotion_review');
  assert.equal(result.package_trace_boundary_check.check_status, 'passed');
  assert.equal(result.package_readiness_assessment.package_readiness_status, 'ready_for_promotion_review');
  assert.ok(result.v1c_input_bundle);
  assert.equal(bundle.topic_package_id, result.topic_package.topic_package_id);
  assert.equal(patchedDecision?.output_topic_package_id, result.topic_package.topic_package_id);
  assert.deepEqual(result.topic_package.validated_need_refs, packageInput.validated_need_refs);
  assert.deepEqual(result.topic_package.selected_evidence_refs, [ref('evidence_unit', 'support_1')]);
  assert.deepEqual(result.topic_package.accepted_risk_refs, [ref('accepted_risk', 'risk_1')]);
  assert.deepEqual(result.topic_package.memory_suggestion_refs, [ref('memory_suggestion', 'memory_1')]);
  assert.deepEqual(result.topic_package.recheck_request_refs, [ref('recheck_request', 'recheck_1')]);
});

test('non-advance and already-output decisions cannot create packages', async () => {
  const packageInput = makePackageDraftInput();
  const nonAdvance = makeDecision(packageInput, {
    decision: 'park',
    package_draft_input: null,
  });
  const { service: nonAdvanceService } = makeSubject(nonAdvance);

  await assert.rejects(
    () => nonAdvanceService.createDraftPackage({
      value_disposition_decision_id: nonAdvance.value_disposition_decision_id,
    }),
    (error) => error instanceof AppError && /advance_to_package/.test(error.message),
  );

  const alreadyOutput = makeDecision(packageInput, {
    output_topic_package_id: 'topic_package_existing',
  });
  const { service: alreadyOutputService } = makeSubject(alreadyOutput);
  await assert.rejects(
    () => alreadyOutputService.createDraftPackage({
      value_disposition_decision_id: alreadyOutput.value_disposition_decision_id,
    }),
    (error) => error instanceof AppError && /already exists/.test(error.message),
  );
});

test('duplicate package creation for one value disposition is rejected', async () => {
  const packageInput = makePackageDraftInput();
  const decision = makeDecision(packageInput);
  const { service } = makeSubject(decision);

  await service.createDraftPackage({
    value_disposition_decision_id: decision.value_disposition_decision_id,
  });

  await assert.rejects(
    () => service.createDraftPackage({
      value_disposition_decision_id: decision.value_disposition_decision_id,
    }),
    (error) => error instanceof AppError && /already exists/.test(error.message),
  );
});

test('concurrent duplicate package creation returns one success and one VERSION_CONFLICT', async () => {
  const packageInput = makePackageDraftInput();
  const decision = makeDecision(packageInput);
  const { service, valueRepository } = makeRaceSubject(decision);

  const results = await Promise.allSettled([
    service.createDraftPackage({
      value_disposition_decision_id: decision.value_disposition_decision_id,
    }),
    service.createDraftPackage({
      value_disposition_decision_id: decision.value_disposition_decision_id,
    }),
  ]);

  const fulfilled = results.filter(
    (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof service.createDraftPackage>>> =>
      result.status === 'fulfilled',
  );
  const rejected = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.ok(rejected[0]?.reason instanceof AppError);
  assert.equal((rejected[0].reason as AppError).errorCode, 'VERSION_CONFLICT');
  assert.equal(
    (await valueRepository.findDispositionDecisionById(decision.value_disposition_decision_id))
      ?.output_topic_package_id,
    fulfilled[0]?.value.topic_package.topic_package_id,
  );
});

test('workspace drift is rejected before package creation', async () => {
  const packageInput = makePackageDraftInput({
    topic_value_assessment: {
      ...makeAssessment(),
      workspace_id: 'workspace_source',
    },
  });
  const decision = makeDecision(packageInput, {
    workspace_id: null,
  });
  const { service } = makeSubject(decision);

  await assert.rejects(
    () => service.createDraftPackage({
      value_disposition_decision_id: decision.value_disposition_decision_id,
      workspace_id: 'workspace_other',
    }),
    (error) => error instanceof AppError && /workspace drifts/.test(error.message),
  );
});

test('stale package draft input refs are rejected before package creation', async () => {
  const packageInput = makePackageDraftInput({
    value_disposition_decision_ref: ref('value_disposition_decision', 'value_disposition_decision_stale'),
  });
  const decision = makeDecision(packageInput);
  const { service } = makeSubject(decision);

  await assert.rejects(
    () => service.createDraftPackage({
      value_disposition_decision_id: decision.value_disposition_decision_id,
    }),
    (error) => error instanceof AppError && /stale or malformed/.test(error.message),
  );
});

test('malformed nested handoff refs are rejected before package creation', async () => {
  const evidenceRef = makeEvidenceRef();
  const packageInput = makePackageDraftInput({
    evidence_refs: [
      {
        ...evidenceRef,
        evidence_ref: {
          ...evidenceRef.evidence_ref,
          ref_id: '',
        },
      },
    ],
  });
  const decision = makeDecision(packageInput);
  const { service } = makeSubject(decision);

  await assert.rejects(
    () => service.createDraftPackage({
      value_disposition_decision_id: decision.value_disposition_decision_id,
    }),
    (error) => error instanceof AppError && /stale or malformed/.test(error.message),
  );
});

test('Prisma repository round-trips package sidecars bundle and decision output patch', async () => {
  const packageInput = makePackageDraftInput();
  const decision = makeDecision(packageInput);
  const { service, packageRepository, fakePrisma } = makePrismaSubject(decision);

  const result = await service.createDraftPackage({
    value_disposition_decision_id: decision.value_disposition_decision_id,
  });

  const storedPackage = await packageRepository.findPackageById(result.topic_package.topic_package_id);
  const storedByDecision = await packageRepository.findPackageByValueDispositionDecisionId(
    decision.value_disposition_decision_id,
  );
  const storedCheck = await packageRepository.findTraceBoundaryCheckById(
    result.package_trace_boundary_check.package_trace_boundary_check_id,
  );
  const storedReadiness = await packageRepository.findReadinessAssessmentById(
    result.package_readiness_assessment.package_readiness_assessment_id,
  );
  const storedBundle = await packageRepository.findV1cInputBundleByPackageId(
    result.topic_package.topic_package_id,
  );

  assert.equal(
    fakePrisma.valueDecisionOutputs.get(decision.value_disposition_decision_id),
    result.topic_package.topic_package_id,
  );
  assert.equal(storedPackage?.topic_package_id, result.topic_package.topic_package_id);
  assert.deepEqual(storedPackage?.package_payload, result.topic_package.package_payload);
  assert.equal(storedByDecision?.topic_package_id, result.topic_package.topic_package_id);
  assert.equal(storedCheck?.topic_package_id, result.topic_package.topic_package_id);
  assert.deepEqual(storedCheck?.missing_ref_codes, []);
  assert.equal(storedReadiness?.package_readiness_status, 'ready_for_promotion_review');
  assert.equal(storedBundle?.topic_package_id, result.topic_package.topic_package_id);
  assert.equal(storedBundle?.package_readiness_status, 'ready_for_promotion_review');
});

test('Prisma package creation rolls back control-plane records on persistence failure', async () => {
  const packageInput = makePackageDraftInput();
  const decision = makeDecision(packageInput);
  const { service, fakePrisma } = makePrismaSubject(decision);
  fakePrisma.failOnTitleCardPackageCreate = true;

  await assert.rejects(
    () => service.createDraftPackage({
      value_disposition_decision_id: decision.value_disposition_decision_id,
    }),
    /injected title card package failure/,
  );

  assert.equal(fakePrisma.inputSnapshots.size, 0);
  assert.equal(fakePrisma.workflowRuns.size, 0);
  assert.equal(fakePrisma.artifactRefs.size, 0);
  assert.equal(fakePrisma.gateResults.size, 0);
  assert.equal(fakePrisma.transitionAttempts.size, 0);
  assert.equal(fakePrisma.traceSnapshots.size, 0);
  assert.equal(fakePrisma.titleCardResearchRecords.size, 0);
  assert.equal(fakePrisma.titleCardPackages.size, 0);
  assert.equal(fakePrisma.traceChecks.size, 0);
  assert.equal(fakePrisma.readinessAssessments.size, 0);
  assert.equal(fakePrisma.v1cBundles.size, 0);
  assert.equal(fakePrisma.valueDecisionOutputs.size, 0);
});

test('Prisma duplicate value disposition unique conflict maps to VERSION_CONFLICT', async () => {
  const packageInput = makePackageDraftInput();
  const decision = makeDecision(packageInput);
  const { service, fakePrisma } = makePrismaSubject(decision);
  fakePrisma.failOnTitleCardPackageValueDispositionUnique = true;

  await assert.rejects(
    () => service.createDraftPackage({
      value_disposition_decision_id: decision.value_disposition_decision_id,
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'VERSION_CONFLICT'
      && /already exists/.test(error.message),
  );

  assert.equal(fakePrisma.inputSnapshots.size, 0);
  assert.equal(fakePrisma.titleCardPackages.size, 0);
  assert.equal(fakePrisma.valueDecisionOutputs.size, 0);
});

test('boundary conflicts create revision-needed package without v1c bundle', async () => {
  const base = makePackageDraftInput();
  const conflictedContract = makeQuestionContract({
    expected_claim: 'Supports production deployment.',
    prohibited_claims: ['production deployment'],
  });
  const packageInput = makePackageDraftInput({
    question_contract: conflictedContract,
  });
  packageInput.topic_value_assessment = {
    ...base.topic_value_assessment,
    strongest_claim_if_success: 'Supports production deployment.',
  };
  const decision = makeDecision(packageInput);
  const { service } = makeSubject(decision);

  const result = await service.createDraftPackage({
    value_disposition_decision_id: decision.value_disposition_decision_id,
  });

  assert.equal(result.topic_package.package_readiness_status, 'needs_revision');
  assert.equal(result.package_trace_boundary_check.check_status, 'needs_revision');
  assert.equal(result.v1c_input_bundle, null);
  await assert.rejects(
    () => service.publishV1cInputBundle({
      topic_package_id: result.topic_package.topic_package_id,
    }),
    (error) => error instanceof AppError && /Only ready package drafts/.test(error.message),
  );
});

test('Prisma migration adds package sidecars and decision uniqueness guard', async () => {
  const migration = await fs.readFile(
    new URL('../../../../prisma/migrations/20260514183000_add_topic_selection_v1b_topic_package_draft/migration.sql', import.meta.url),
    'utf8',
  );

  assert.match(migration, /CREATE TABLE "TopicSelectionPackageTraceBoundaryCheck"/);
  assert.match(migration, /CREATE TABLE "TopicSelectionTopicPackageReadinessAssessment"/);
  assert.match(migration, /CREATE TABLE "TopicSelectionV1bToV1cInputBundle"/);
  assert.match(migration, /CREATE UNIQUE INDEX "TopicPackage_v1bSourceValueDispositionDecisionId_key"/);
});
