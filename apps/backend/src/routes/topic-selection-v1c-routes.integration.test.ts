import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify, { type FastifyInstance } from 'fastify';
import { Prisma, PrismaClient } from '@prisma/client';

import {
  TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_CASE_TYPES,
  TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_CASE_TYPES,
  TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_METRIC_KEYS,
  type TopicSelectionOfflineEvaluationCaseRecord,
  type TopicSelectionOfflineEvaluationObservedOutput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-offline-evaluation-replay-contracts';
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
  TopicSelectionTopicQuestionEvidenceRefRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-question-contracts';
import type {
  TopicSelectionPromotionGateRequiredAction,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import type {
  CreatePaperProjectRequest,
  CreatePaperProjectResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-project-contracts';

import { buildApp } from '../app.js';
import { TopicSelectionV1cController } from '../controllers/topic-selection-v1c-controller.js';
import { InMemoryTopicSelectionOfflineEvaluationReplayRepository } from '../repositories/in-memory-topic-selection-offline-evaluation-replay-repository.js';
import { InMemoryTopicSelectionV1cDownstreamFeedbackRecheckRepository } from '../repositories/in-memory-topic-selection-v1c-downstream-feedback-recheck-repository.js';
import { InMemoryTopicSelectionV1cHumanPromotionDecisionRepository } from '../repositories/in-memory-topic-selection-v1c-human-promotion-decision-repository.js';
import { InMemoryTopicSelectionV1cPaperProjectBridgeRepository } from '../repositories/in-memory-topic-selection-v1c-paper-project-bridge-repository.js';
import { InMemoryTopicSelectionV1cPromotionGateRepository } from '../repositories/in-memory-topic-selection-v1c-promotion-gate-repository.js';
import { InMemoryTopicSelectionV1cPromotionInputRepository } from '../repositories/in-memory-topic-selection-v1c-promotion-input-repository.js';
import type {
  TopicSelectionV1bTopicPackageAuthorityPersistence,
  TopicSelectionV1bTopicPackagePersistence,
  TopicSelectionV1bTopicPackageRepository,
} from '../repositories/topic-selection-v1b-topic-package.repository.js';
import { TopicSelectionOfflineEvaluationReplayService } from '../services/topic-selection-offline-evaluation-replay-service.js';
import { sha256Text, stableStringify } from '../services/literature-content-processing-utils.js';
import type { TopicSelectionDownstreamRecheckSink } from '../services/topic-selection-v1c-downstream-feedback-recheck-service.js';
import { TopicSelectionV1cDownstreamFeedbackRecheckService } from '../services/topic-selection-v1c-downstream-feedback-recheck-service.js';
import { TopicSelectionV1cHumanPromotionDecisionService } from '../services/topic-selection-v1c-human-promotion-decision-service.js';
import { TopicSelectionV1cPaperProjectBridgeService } from '../services/topic-selection-v1c-paper-project-bridge-service.js';
import { TopicSelectionV1cPromotionGateService } from '../services/topic-selection-v1c-promotion-gate-service.js';
import { TopicSelectionControlPlaneService } from '../services/topic-selection-control-plane-service.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { TopicSelectionV1cN2BoundedDebateRuntimeService } from '../services/topic-selection-v1c-n2-bounded-debate-runtime-service.js';
import { TopicSelectionV1cN2BoundedDebateAdmissionService } from '../services/topic-selection-v1c-n2-bounded-debate-admission-service.js';
import { TopicSelectionV1cN2BoundedDebateCoordinatorService } from '../services/topic-selection-v1c-n2-bounded-debate-coordinator-service.js';
import {
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_FINAL_OUTPUT_SCHEMA_VERSION,
} from '../services/topic-selection-v1c-n2-bounded-debate-admission-service.js';
import { TopicSelectionV1cN4DelegatedPromotionDecisionRuntimeService } from '../services/topic-selection-v1c-n4-delegated-promotion-decision-runtime-service.js';
import { TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService } from '../services/topic-selection-v1c-n4-delegated-promotion-decision-admission-service.js';
import { TopicSelectionV1cN4DelegatedPromotionDecisionService } from '../services/topic-selection-v1c-n4-delegated-promotion-decision-service.js';
import { TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_CANDIDATE_SCHEMA_VERSION } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import { TopicSelectionV1cPromotionInputService } from '../services/topic-selection-v1c-promotion-input-service.js';
import { registerTopicSelectionV1cRoutes } from './topic-selection-v1c-routes.js';

const NOW = '2026-05-16T00:00:00.000Z';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function ref(
  refType: string,
  refId: string,
  titleCardId = 'title_card_v1c_route',
  versionId: string | null = null,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: titleCardId,
    version_id: versionId,
  };
}

function assertStatus(response: { statusCode: number; body: string }, expected: number): void {
  if (response.statusCode !== expected) {
    assert.fail(`Expected HTTP ${expected}, received ${response.statusCode}: ${response.body}`);
  }
}

function requiredAction(
  actionCode: string,
  refs: TopicSelectionFunctionalRef[],
  loopbackTarget: TopicSelectionPromotionGateRequiredAction['loopback_target'] = 'package',
): TopicSelectionPromotionGateRequiredAction {
  return {
    action_code: actionCode,
    severity: 'blocking',
    loopback_target: loopbackTarget,
    refs,
    reason: `${actionCode} is required before continuing.`,
  };
}

class SeededTopicPackageRepository implements TopicSelectionV1bTopicPackageRepository {
  constructor(
    readonly topicPackage: TopicSelectionTopicPackageRecord,
    readonly traceBoundaryCheck: TopicSelectionPackageTraceBoundaryCheckRecord,
    readonly readinessAssessment: TopicSelectionTopicPackageReadinessAssessmentRecord,
    readonly v1cInputBundle: TopicSelectionV1bToV1cInputBundleRecord,
  ) {}

  async createDraftPackage(
    _persistence: TopicSelectionV1bTopicPackagePersistence,
  ): Promise<TopicSelectionV1bTopicPackageCreationResult> {
    throw new Error('SeededTopicPackageRepository does not support creating draft packages.');
  }

  async createDraftPackageAuthority(
    _persistence: TopicSelectionV1bTopicPackageAuthorityPersistence,
  ): Promise<TopicSelectionV1bTopicPackageCreationResult> {
    throw new Error('SeededTopicPackageRepository does not support creating draft packages.');
  }

  async findPackageById(topicPackageId: string): Promise<TopicSelectionTopicPackageRecord | null> {
    return topicPackageId === this.topicPackage.topic_package_id ? this.topicPackage : null;
  }

  async listPackagesByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionTopicPackageRecord[]> {
    return this.topicPackage.title_card_id === titleCardId ? [this.topicPackage] : [];
  }

  async findPackageByValueDispositionDecisionId(
    valueDispositionDecisionId: string,
  ): Promise<TopicSelectionTopicPackageRecord | null> {
    return valueDispositionDecisionId === this.topicPackage.value_disposition_decision_id
      ? this.topicPackage
      : null;
  }

  async findTraceBoundaryCheckById(
    traceBoundaryCheckId: string,
  ): Promise<TopicSelectionPackageTraceBoundaryCheckRecord | null> {
    return traceBoundaryCheckId === this.traceBoundaryCheck.package_trace_boundary_check_id
      ? this.traceBoundaryCheck
      : null;
  }

  async findReadinessAssessmentById(
    readinessAssessmentId: string,
  ): Promise<TopicSelectionTopicPackageReadinessAssessmentRecord | null> {
    return readinessAssessmentId === this.readinessAssessment.package_readiness_assessment_id
      ? this.readinessAssessment
      : null;
  }

  async findV1cInputBundleById(
    v1bToV1cInputBundleId: string,
  ): Promise<TopicSelectionV1bToV1cInputBundleRecord | null> {
    return v1bToV1cInputBundleId === this.v1cInputBundle.v1b_to_v1c_input_bundle_id
      ? this.v1cInputBundle
      : null;
  }

  async findV1cInputBundleByPackageId(
    topicPackageId: string,
  ): Promise<TopicSelectionV1bToV1cInputBundleRecord | null> {
    return topicPackageId === this.topicPackage.topic_package_id ? this.v1cInputBundle : null;
  }
}

class NullRecheckSink implements TopicSelectionDownstreamRecheckSink {
  async recordDownstreamFeedback() {
    return {
      event: null,
      impact: null,
      queue_item: null,
    };
  }
}

class RecordingPaperProjectGateway {
  readonly createCalls: CreatePaperProjectRequest[] = [];
  readonly deleteCalls: string[] = [];
  private readonly papers = new Map<string, CreatePaperProjectResponse>();

  async createPaperProject(input: CreatePaperProjectRequest): Promise<CreatePaperProjectResponse> {
    this.createCalls.push(input);
    const paperId = `paper_project_route_${this.createCalls.length}`;
    const response: CreatePaperProjectResponse = {
      paper_id: paperId,
      status: 'active',
      paper_active_sp_full: null,
      paper_active_sp_partial: null,
      created_at: NOW,
    };
    this.papers.set(paperId, response);
    return response;
  }

  async deletePaperProject(paperId: string): Promise<void> {
    this.deleteCalls.push(paperId);
    this.papers.delete(paperId);
  }

  hasPaperProject(paperId: string): boolean {
    return this.papers.has(paperId);
  }
}

async function assertPrismaHttpSmokeDatabaseReady(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl, 'DATABASE_URL is required for T-067 Prisma HTTP smoke test.');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.topicSelectionV1bToV1cInputBundle.findFirst({ select: { id: true } });
    await prisma.topicSelectionDownstreamTopicFeedback.findFirst({ select: { id: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert.fail(
      [
        'DATABASE_URL for T-067 Prisma HTTP smoke must point at a reachable Postgres database with repo migrations applied.',
        `Underlying Prisma error: ${message}`,
      ].join(' '),
    );
  } finally {
    await prisma.$disconnect();
  }
}

function makeSeededTopicPackageRepository(suffix: string): SeededTopicPackageRepository {
  const titleCardId = `title_card_${suffix}`;
  const topicPackageId = `topic_package_${suffix}`;
  const packageVersion = 'v1';
  const traceBoundaryCheckId = `package_trace_boundary_check_${suffix}`;
  const readinessAssessmentId = `package_readiness_assessment_${suffix}`;
  const v1cInputBundleId = `v1b_to_v1c_input_bundle_${suffix}`;
  const topicPackageRef = ref('topic_package', topicPackageId, titleCardId, packageVersion);
  const traceBoundaryCheckRef = ref('package_trace_boundary_check', traceBoundaryCheckId, titleCardId, packageVersion);
  const readinessAssessmentRef = ref('topic_package_readiness_assessment', readinessAssessmentId, titleCardId, packageVersion);
  const topicValueAssessmentRef = ref('topic_value_assessment', `topic_value_assessment_${suffix}`, titleCardId);
  const valueReasoningMemoRef = ref('value_reasoning_memo', `value_reasoning_memo_${suffix}`, titleCardId);
  const valueDispositionDecisionRef = ref('value_disposition_decision', `value_disposition_decision_${suffix}`, titleCardId);
  const topicQuestionRef = ref('topic_question', `topic_question_${suffix}`, titleCardId);
  const topicQuestionContractRef = ref('topic_question_contract', `topic_question_contract_${suffix}`, titleCardId);
  const answerabilityPlanRef = ref('topic_question_answerability_plan', `answerability_plan_${suffix}`, titleCardId);
  const researchSliceRef = ref('research_slice', `research_slice_${suffix}`, titleCardId, packageVersion);
  const validatedNeedRefs = [ref('validated_need', `validated_need_${suffix}`, titleCardId)];
  const evidenceFunctionalRef = ref('evidence_unit', `evidence_unit_${suffix}`, titleCardId);
  const evidenceRefs: TopicSelectionTopicQuestionEvidenceRefRecord[] = [
    {
      topic_question_evidence_ref_id: `topic_question_evidence_ref_${suffix}`,
      workspace_id: null,
      title_card_id: titleCardId,
      topic_question_id: topicQuestionRef.ref_id,
      topic_question_contract_id: topicQuestionContractRef.ref_id,
      evidence_ref: evidenceFunctionalRef,
      evidence_role: 'support',
      mapped_question_part: 'main_question',
      rationale: 'Supports the reviewer-facing topic promotion claim.',
      source_locator_snapshot: {},
      created_at: NOW,
    },
  ];
  const topicPackage: TopicSelectionTopicPackageRecord = {
    topic_package_id: topicPackageId,
    workspace_id: null,
    title_card_id: titleCardId,
    research_record_id: `research_record_${suffix}`,
    topic_question_id: topicQuestionRef.ref_id,
    topic_question_contract_id: topicQuestionContractRef.ref_id,
    topic_value_assessment_id: topicValueAssessmentRef.ref_id,
    value_reasoning_memo_id: valueReasoningMemoRef.ref_id,
    value_disposition_decision_id: valueDispositionDecisionRef.ref_id,
    research_slice_id: researchSliceRef.ref_id,
    research_slice_version: packageVersion,
    package_version: packageVersion,
    package_readiness_status: 'ready_for_promotion_review',
    topic_package_ref: topicPackageRef,
    topic_value_assessment_ref: topicValueAssessmentRef,
    value_reasoning_memo_ref: valueReasoningMemoRef,
    value_disposition_decision_ref: valueDispositionDecisionRef,
    topic_question_ref: topicQuestionRef,
    topic_question_contract_ref: topicQuestionContractRef,
    answerability_plan_ref: answerabilityPlanRef,
    research_slice_ref: researchSliceRef,
    validated_need_refs: validatedNeedRefs,
    evidence_refs: evidenceRefs,
    selected_evidence_refs: [evidenceFunctionalRef],
    accepted_risk_refs: [],
    blocker_refs: [],
    memory_suggestion_refs: [],
    recheck_request_refs: [],
    title_candidates: ['Reviewer-aligned topic promotion bridge'],
    research_background: 'Reviewer-facing topic promotion needs traceable claims and evidence.',
    contribution_summary: 'A focused contribution summary for paper engineering workflows.',
    candidate_methods: ['offline replay', 'manual review'],
    evaluation_plan: 'Evaluate trace completeness and reviewer alignment on frozen cases.',
    key_risks: ['Evidence freshness drift.'],
    non_goals: ['Do not claim production deployment superiority.'],
    selected_literature_evidence_ids: ['LIT-v1c-route'],
    package_payload: {
      claim_ceiling: 'Can claim reviewer-aligned planning feasibility, not production superiority.',
      prohibited_claims: ['production deployment superiority'],
      contribution_summary: 'A focused contribution summary for paper engineering workflows.',
      evaluation_plan: 'Evaluate trace completeness and reviewer alignment on frozen cases.',
    },
    trace_boundary_check_id: traceBoundaryCheckId,
    readiness_assessment_id: readinessAssessmentId,
    v1c_input_bundle_id: v1cInputBundleId,
    trace_snapshot_id: `trace_snapshot_${suffix}`,
    input_snapshot_id: `input_snapshot_${suffix}`,
    workflow_run_id: `workflow_run_${suffix}`,
    gate_result_id: `readiness_gate_result_${suffix}`,
    transition_attempt_id: `chain_transition_attempt_${suffix}`,
    artifact_refs: [ref('artifact_ref', `artifact_ref_package_${suffix}`, titleCardId)],
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };
  const traceBoundaryCheck: TopicSelectionPackageTraceBoundaryCheckRecord = {
    package_trace_boundary_check_id: traceBoundaryCheckId,
    workspace_id: null,
    title_card_id: titleCardId,
    topic_package_id: topicPackageId,
    value_disposition_decision_id: valueDispositionDecisionRef.ref_id,
    topic_value_assessment_id: topicValueAssessmentRef.ref_id,
    topic_question_contract_id: topicQuestionContractRef.ref_id,
    research_slice_id: researchSliceRef.ref_id,
    check_status: 'passed',
    package_ref: topicPackageRef,
    topic_value_assessment_ref: topicValueAssessmentRef,
    value_reasoning_memo_ref: valueReasoningMemoRef,
    value_disposition_decision_ref: valueDispositionDecisionRef,
    topic_question_ref: topicQuestionRef,
    topic_question_contract_ref: topicQuestionContractRef,
    answerability_plan_ref: answerabilityPlanRef,
    research_slice_ref: researchSliceRef,
    validated_need_refs: validatedNeedRefs,
    evidence_refs: [evidenceFunctionalRef],
    accepted_risk_refs: [],
    blocker_refs: [],
    recheck_request_refs: [],
    missing_ref_codes: [],
    new_ref_codes: [],
    boundary_conflict_codes: [],
    carry_forward_codes: [],
    trace_issues: [],
    boundary_issues: [],
    narrative_consistency: {},
    input_snapshot_id: `input_snapshot_trace_${suffix}`,
    workflow_run_id: `workflow_run_trace_${suffix}`,
    gate_result_id: `readiness_gate_result_trace_${suffix}`,
    transition_attempt_id: `chain_transition_attempt_trace_${suffix}`,
    artifact_refs: [ref('artifact_ref', `artifact_ref_trace_${suffix}`, titleCardId)],
    created_at: NOW,
  };
  const readinessAssessment: TopicSelectionTopicPackageReadinessAssessmentRecord = {
    package_readiness_assessment_id: readinessAssessmentId,
    workspace_id: null,
    title_card_id: titleCardId,
    topic_package_id: topicPackageId,
    value_disposition_decision_id: valueDispositionDecisionRef.ref_id,
    package_trace_boundary_check_id: traceBoundaryCheckId,
    package_version: packageVersion,
    package_readiness_status: 'ready_for_promotion_review',
    blockers: [],
    warnings: [],
    required_actions: [],
    accepted_risk_refs: [],
    blocker_refs: [],
    recheck_request_refs: [],
    input_snapshot_id: `input_snapshot_readiness_${suffix}`,
    workflow_run_id: `workflow_run_readiness_${suffix}`,
    gate_result_id: `readiness_gate_result_readiness_${suffix}`,
    transition_attempt_id: `chain_transition_attempt_readiness_${suffix}`,
    artifact_refs: [ref('artifact_ref', `artifact_ref_readiness_${suffix}`, titleCardId)],
    assessed_by: 'system',
    created_at: NOW,
  };
  const bundleHash = sha256Text(stableStringify({
    check_ref: traceBoundaryCheckRef,
    package_ref: topicPackageRef,
    package_version: packageVersion,
    readiness_ref: readinessAssessmentRef,
    value_disposition_decision_ref: valueDispositionDecisionRef,
  }));
  const v1cInputBundle: TopicSelectionV1bToV1cInputBundleRecord = {
    v1b_to_v1c_input_bundle_id: v1cInputBundleId,
    workspace_id: null,
    title_card_id: titleCardId,
    topic_package_id: topicPackageId,
    package_version: packageVersion,
    package_readiness_status: 'ready_for_promotion_review',
    bundle_status: 'ready_for_promotion_review',
    topic_package_ref: topicPackageRef,
    package_trace_boundary_check_ref: traceBoundaryCheckRef,
    package_readiness_assessment_ref: readinessAssessmentRef,
    topic_value_assessment_ref: topicValueAssessmentRef,
    value_reasoning_memo_ref: valueReasoningMemoRef,
    value_disposition_decision_ref: valueDispositionDecisionRef,
    topic_question_ref: topicQuestionRef,
    topic_question_contract_ref: topicQuestionContractRef,
    answerability_plan_ref: answerabilityPlanRef,
    research_slice_ref: researchSliceRef,
    validated_need_refs: validatedNeedRefs,
    evidence_refs: evidenceRefs,
    accepted_risk_refs: [],
    blocker_refs: [],
    memory_suggestion_refs: [],
    recheck_request_refs: [],
    readiness_check_refs: [traceBoundaryCheckRef, readinessAssessmentRef],
    package_snapshot: topicPackage,
    package_draft_input_snapshot: {
      question_contract: {
        claim_ceiling: 'Can claim reviewer-aligned planning feasibility, not production superiority.',
      },
      evaluation_plan: 'Evaluate trace completeness and reviewer alignment on frozen cases.',
    } as never,
    bundle_hash: bundleHash,
    input_snapshot_id: `input_snapshot_bundle_${suffix}`,
    workflow_run_id: `workflow_run_bundle_${suffix}`,
    gate_result_id: `readiness_gate_result_bundle_${suffix}`,
    transition_attempt_id: `chain_transition_attempt_bundle_${suffix}`,
    artifact_refs: [ref('artifact_ref', `artifact_ref_bundle_${suffix}`, titleCardId)],
    created_at: NOW,
  };
  return new SeededTopicPackageRepository(
    topicPackage,
    traceBoundaryCheck,
    readinessAssessment,
    v1cInputBundle,
  );
}

async function seedReadyV1cInputBundleInPrisma(
  prisma: PrismaClient,
  suffix: string,
): Promise<SeededTopicPackageRepository> {
  const repository = makeSeededTopicPackageRepository(suffix);
  const topicPackage = repository.topicPackage;
  const traceBoundaryCheck = repository.traceBoundaryCheck;
  const readinessAssessment = repository.readinessAssessment;
  const v1cInputBundle = repository.v1cInputBundle;
  const now = new Date(NOW);
  const questionRecordId = `research_record_question_${suffix}`;
  const valueRecordId = `research_record_value_${suffix}`;

  await prisma.$transaction(async (tx) => {
    await tx.titleCard.create({
      data: {
        id: topicPackage.title_card_id,
        workingTitle: `Topic Selection v1c Prisma Smoke ${suffix}`,
        brief: 'Seeded ready v1b-to-v1c bundle for Prisma-backed v1c HTTP smoke.',
        status: 'draft',
        basketUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    });
    await tx.titleCardResearchRecord.create({
      data: {
        id: questionRecordId,
        titleCardId: topicPackage.title_card_id,
        recordType: 'research_question',
        recordStatus: 'completed',
        sourceRecordIds: toJsonValue([]),
        lineage: toJsonValue({ source: 'topic_selection_v1c_prisma_smoke_seed' }),
        summary: 'Seeded topic question for v1c Prisma smoke.',
        confidence: new Prisma.Decimal('1.000'),
        blockingIssues: toJsonValue([]),
        missingInformation: toJsonValue([]),
        nextActions: toJsonValue([]),
        evidenceRefs: toJsonValue(topicPackage.selected_evidence_refs),
        payload: toJsonValue({}),
        createdBy: 'system',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    });
    await tx.titleCardResearchQuestion.create({
      data: {
        id: topicPackage.topic_question_id,
        titleCardId: topicPackage.title_card_id,
        researchRecordId: questionRecordId,
        mainQuestion: 'Can a local-first assistant improve trace completeness for reviewer-aligned paper planning?',
        subQuestions: toJsonValue(['Which promotion bridge trace gaps remain visible?']),
        researchSlice: 'Offline reviewer-aligned evidence planning workflows.',
        contributionHypothesis: 'system',
        sourceNeedReviewIds: toJsonValue(topicPackage.validated_need_refs.map((sourceRef) => sourceRef.ref_id)),
        sourceLiteratureEvidenceIds: toJsonValue(topicPackage.selected_literature_evidence_ids),
        v1bResearchSliceId: topicPackage.research_slice_id,
        v1bResearchSliceVersion: topicPackage.research_slice_version,
        v1bSourceCandidateSetId: null,
        v1bSourceCandidateId: null,
        v1bSelectionDecisionId: null,
        v1bActiveQuestionContractId: topicPackage.topic_question_contract_id,
        v1bQuestionType: 'system',
        v1bQuestionStatus: 'active',
        createdAt: now,
        updatedAt: now,
      },
    });
    await tx.titleCardResearchRecord.create({
      data: {
        id: valueRecordId,
        titleCardId: topicPackage.title_card_id,
        recordType: 'value_assessment',
        recordStatus: 'completed',
        sourceRecordIds: toJsonValue([topicPackage.topic_question_id]),
        lineage: toJsonValue({ source: 'topic_selection_v1c_prisma_smoke_seed' }),
        summary: 'Seeded value assessment for v1c Prisma smoke.',
        confidence: new Prisma.Decimal('1.000'),
        blockingIssues: toJsonValue([]),
        missingInformation: toJsonValue([]),
        nextActions: toJsonValue([]),
        evidenceRefs: toJsonValue(topicPackage.selected_evidence_refs),
        payload: toJsonValue({}),
        createdBy: 'system',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    });
    await tx.titleCardValueAssessment.create({
      data: {
        id: topicPackage.topic_value_assessment_id,
        titleCardId: topicPackage.title_card_id,
        researchQuestionId: topicPackage.topic_question_id,
        researchRecordId: valueRecordId,
        strongestClaimIfSuccess: 'Reviewer-aligned planning feasibility in offline replay.',
        fallbackClaimIfSuccess: 'Trace gaps are surfaced earlier than manual planning.',
        hardGates: toJsonValue([]),
        scoredDimensions: toJsonValue([]),
        riskPenalty: toJsonValue({}),
        reviewerObjections: toJsonValue([]),
        ceilingCase: String(topicPackage.package_payload.claim_ceiling),
        baseCase: 'Trace completeness improves over manual planning.',
        floorCase: 'Trace boundary gaps become auditable.',
        verdict: 'promote',
        totalScore: new Prisma.Decimal('90.00'),
        v1bSourceQuestionContractId: topicPackage.topic_question_contract_id,
        v1bSourceResearchSliceId: topicPackage.research_slice_id,
        v1bSourceResearchSliceVersion: topicPackage.research_slice_version,
        v1bAssessmentRunId: null,
        v1bInputSnapshotId: null,
        v1bReasoningMemoId: topicPackage.value_reasoning_memo_id,
        v1bActiveDispositionDecisionId: topicPackage.value_disposition_decision_id,
        v1bReadinessStatus: 'ready',
        v1bFreshnessStatus: 'current',
        createdAt: now,
        updatedAt: now,
      },
    });
    await tx.titleCardResearchRecord.create({
      data: {
        id: topicPackage.research_record_id,
        titleCardId: topicPackage.title_card_id,
        recordType: 'package',
        recordStatus: 'completed',
        sourceRecordIds: toJsonValue([
          topicPackage.topic_question_id,
          topicPackage.topic_value_assessment_id,
          topicPackage.value_disposition_decision_id,
        ]),
        lineage: toJsonValue({ source: 'topic_selection_v1c_prisma_smoke_seed' }),
        summary: topicPackage.contribution_summary,
        confidence: new Prisma.Decimal('1.000'),
        blockingIssues: toJsonValue(topicPackage.blocker_refs),
        missingInformation: toJsonValue(topicPackage.key_risks),
        nextActions: toJsonValue([]),
        evidenceRefs: toJsonValue(topicPackage.selected_evidence_refs),
        payload: toJsonValue(topicPackage),
        createdBy: topicPackage.created_by,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    });
    await tx.titleCardPackage.create({
      data: {
        id: topicPackage.topic_package_id,
        titleCardId: topicPackage.title_card_id,
        researchQuestionId: topicPackage.topic_question_id,
        valueAssessmentId: topicPackage.topic_value_assessment_id,
        researchRecordId: topicPackage.research_record_id,
        titleCandidates: toJsonValue(topicPackage.title_candidates),
        researchBackground: topicPackage.research_background,
        contributionSummary: topicPackage.contribution_summary,
        candidateMethods: toJsonValue(topicPackage.candidate_methods),
        evaluationPlan: topicPackage.evaluation_plan,
        keyRisks: toJsonValue(topicPackage.key_risks),
        selectedLiteratureEvidenceIds: toJsonValue(topicPackage.selected_literature_evidence_ids),
        v1bPackageVersion: topicPackage.package_version,
        v1bReadinessStatus: topicPackage.package_readiness_status,
        v1bSourceValueDispositionDecisionId: topicPackage.value_disposition_decision_id,
        v1bSourceQuestionContractId: topicPackage.topic_question_contract_id,
        v1bSourceResearchSliceId: topicPackage.research_slice_id,
        v1bSourceResearchSliceVersion: topicPackage.research_slice_version,
        v1bValueReasoningMemoId: topicPackage.value_reasoning_memo_id,
        v1bTraceBoundaryCheckId: topicPackage.trace_boundary_check_id,
        v1bReadinessAssessmentId: topicPackage.readiness_assessment_id,
        v1bToV1cInputBundleId: topicPackage.v1c_input_bundle_id,
        v1bTraceSnapshotId: topicPackage.trace_snapshot_id,
        v1bInputSnapshotId: topicPackage.input_snapshot_id,
        v1bWorkflowRunId: topicPackage.workflow_run_id,
        v1bGateResultId: topicPackage.gate_result_id,
        v1bTransitionAttemptId: topicPackage.transition_attempt_id,
        v1bAuthorityRefs: toJsonValue([
          topicPackage.topic_value_assessment_ref,
          topicPackage.value_reasoning_memo_ref,
          topicPackage.value_disposition_decision_ref,
          topicPackage.topic_question_contract_ref,
          topicPackage.research_slice_ref,
          ...topicPackage.validated_need_refs,
          ...topicPackage.selected_evidence_refs,
        ]),
        v1bAuthorityPayload: toJsonValue(topicPackage),
        createdAt: now,
        updatedAt: now,
      },
    });
    await tx.topicSelectionPackageTraceBoundaryCheck.create({
      data: {
        id: traceBoundaryCheck.package_trace_boundary_check_id,
        workspaceId: traceBoundaryCheck.workspace_id ?? null,
        titleCardId: traceBoundaryCheck.title_card_id,
        topicPackageId: traceBoundaryCheck.topic_package_id,
        valueDispositionDecisionId: traceBoundaryCheck.value_disposition_decision_id,
        topicValueAssessmentId: traceBoundaryCheck.topic_value_assessment_id,
        topicQuestionContractId: traceBoundaryCheck.topic_question_contract_id,
        researchSliceId: traceBoundaryCheck.research_slice_id,
        checkStatus: traceBoundaryCheck.check_status,
        packageRef: toJsonValue(traceBoundaryCheck.package_ref),
        topicValueAssessmentRef: toJsonValue(traceBoundaryCheck.topic_value_assessment_ref),
        valueReasoningMemoRef: toJsonValue(traceBoundaryCheck.value_reasoning_memo_ref),
        valueDispositionDecisionRef: toJsonValue(traceBoundaryCheck.value_disposition_decision_ref),
        topicQuestionRef: toJsonValue(traceBoundaryCheck.topic_question_ref),
        topicQuestionContractRef: toJsonValue(traceBoundaryCheck.topic_question_contract_ref),
        answerabilityPlanRef: toJsonValue(traceBoundaryCheck.answerability_plan_ref),
        researchSliceRef: toJsonValue(traceBoundaryCheck.research_slice_ref),
        validatedNeedRefs: toJsonValue(traceBoundaryCheck.validated_need_refs),
        evidenceRefs: toJsonValue(traceBoundaryCheck.evidence_refs),
        acceptedRiskRefs: toJsonValue(traceBoundaryCheck.accepted_risk_refs),
        blockerRefs: toJsonValue(traceBoundaryCheck.blocker_refs),
        recheckRequestRefs: toJsonValue(traceBoundaryCheck.recheck_request_refs),
        missingRefCodes: traceBoundaryCheck.missing_ref_codes,
        newRefCodes: traceBoundaryCheck.new_ref_codes,
        boundaryConflictCodes: traceBoundaryCheck.boundary_conflict_codes,
        carryForwardCodes: traceBoundaryCheck.carry_forward_codes,
        traceIssues: toJsonValue(traceBoundaryCheck.trace_issues),
        boundaryIssues: toJsonValue(traceBoundaryCheck.boundary_issues),
        narrativeConsistency: toJsonValue(traceBoundaryCheck.narrative_consistency),
        inputSnapshotId: traceBoundaryCheck.input_snapshot_id,
        workflowRunId: traceBoundaryCheck.workflow_run_id,
        gateResultId: traceBoundaryCheck.gate_result_id,
        transitionAttemptId: traceBoundaryCheck.transition_attempt_id,
        artifactRefs: toJsonValue(traceBoundaryCheck.artifact_refs),
        createdAt: now,
      },
    });
    await tx.topicSelectionTopicPackageReadinessAssessment.create({
      data: {
        id: readinessAssessment.package_readiness_assessment_id,
        workspaceId: readinessAssessment.workspace_id ?? null,
        titleCardId: readinessAssessment.title_card_id,
        topicPackageId: readinessAssessment.topic_package_id,
        valueDispositionDecisionId: readinessAssessment.value_disposition_decision_id,
        packageTraceBoundaryCheckId: readinessAssessment.package_trace_boundary_check_id,
        packageVersion: readinessAssessment.package_version,
        packageReadinessStatus: readinessAssessment.package_readiness_status,
        blockers: toJsonValue(readinessAssessment.blockers),
        warnings: toJsonValue(readinessAssessment.warnings),
        requiredActions: readinessAssessment.required_actions,
        acceptedRiskRefs: toJsonValue(readinessAssessment.accepted_risk_refs),
        blockerRefs: toJsonValue(readinessAssessment.blocker_refs),
        recheckRequestRefs: toJsonValue(readinessAssessment.recheck_request_refs),
        inputSnapshotId: readinessAssessment.input_snapshot_id,
        workflowRunId: readinessAssessment.workflow_run_id,
        gateResultId: readinessAssessment.gate_result_id,
        transitionAttemptId: readinessAssessment.transition_attempt_id,
        artifactRefs: toJsonValue(readinessAssessment.artifact_refs),
        assessedBy: readinessAssessment.assessed_by,
        createdAt: now,
      },
    });
    await tx.topicSelectionV1bToV1cInputBundle.create({
      data: {
        id: v1cInputBundle.v1b_to_v1c_input_bundle_id,
        workspaceId: v1cInputBundle.workspace_id ?? null,
        titleCardId: v1cInputBundle.title_card_id,
        topicPackageId: v1cInputBundle.topic_package_id,
        packageVersion: v1cInputBundle.package_version,
        packageReadinessStatus: v1cInputBundle.package_readiness_status,
        bundleStatus: v1cInputBundle.bundle_status,
        topicPackageRef: toJsonValue(v1cInputBundle.topic_package_ref),
        packageTraceBoundaryCheckRef: toJsonValue(v1cInputBundle.package_trace_boundary_check_ref),
        packageReadinessAssessmentRef: toJsonValue(v1cInputBundle.package_readiness_assessment_ref),
        topicValueAssessmentRef: toJsonValue(v1cInputBundle.topic_value_assessment_ref),
        valueReasoningMemoRef: toJsonValue(v1cInputBundle.value_reasoning_memo_ref),
        valueDispositionDecisionRef: toJsonValue(v1cInputBundle.value_disposition_decision_ref),
        topicQuestionRef: toJsonValue(v1cInputBundle.topic_question_ref),
        topicQuestionContractRef: toJsonValue(v1cInputBundle.topic_question_contract_ref),
        answerabilityPlanRef: toJsonValue(v1cInputBundle.answerability_plan_ref),
        researchSliceRef: toJsonValue(v1cInputBundle.research_slice_ref),
        validatedNeedRefs: toJsonValue(v1cInputBundle.validated_need_refs),
        evidenceRefs: toJsonValue(v1cInputBundle.evidence_refs),
        acceptedRiskRefs: toJsonValue(v1cInputBundle.accepted_risk_refs),
        blockerRefs: toJsonValue(v1cInputBundle.blocker_refs),
        memorySuggestionRefs: toJsonValue(v1cInputBundle.memory_suggestion_refs),
        recheckRequestRefs: toJsonValue(v1cInputBundle.recheck_request_refs),
        readinessCheckRefs: toJsonValue(v1cInputBundle.readiness_check_refs),
        packageSnapshot: toJsonValue(v1cInputBundle.package_snapshot),
        packageDraftInputSnapshot: toJsonValue(v1cInputBundle.package_draft_input_snapshot),
        bundleHash: v1cInputBundle.bundle_hash,
        inputSnapshotId: v1cInputBundle.input_snapshot_id,
        workflowRunId: v1cInputBundle.workflow_run_id,
        gateResultId: v1cInputBundle.gate_result_id,
        transitionAttemptId: v1cInputBundle.transition_attempt_id,
        artifactRefs: toJsonValue(v1cInputBundle.artifact_refs),
        createdAt: now,
      },
    });
  });

  return repository;
}

type V1cRouteHarness = {
  app: FastifyInstance;
  offlineReplayService: TopicSelectionOfflineEvaluationReplayService;
  paperProjectGateway: RecordingPaperProjectGateway;
};

async function makeV1cRouteApp(
  topicPackageRepository: TopicSelectionV1bTopicPackageRepository,
): Promise<FastifyInstance> {
  return (await makeV1cRouteHarness(topicPackageRepository)).app;
}

async function makeV1cRouteHarness(
  topicPackageRepository: TopicSelectionV1bTopicPackageRepository,
): Promise<V1cRouteHarness> {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _request, reply) => {
    if ('validation' in error) {
      reply.status(400).send({
        error: {
          code: 'INVALID_PAYLOAD',
          message: error instanceof Error ? error.message : 'Request payload failed schema validation.',
        },
      });
      return;
    }
    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  });
  const promotionInputService = new TopicSelectionV1cPromotionInputService({
    repository: new InMemoryTopicSelectionV1cPromotionInputRepository(),
    topicPackageRepository,
    now: () => NOW,
  });
  const promotionGateService = new TopicSelectionV1cPromotionGateService({
    repository: new InMemoryTopicSelectionV1cPromotionGateRepository(),
    promotionInputService,
    now: () => NOW,
  });
  const humanPromotionDecisionService = new TopicSelectionV1cHumanPromotionDecisionService({
    repository: new InMemoryTopicSelectionV1cHumanPromotionDecisionRepository(),
    promotionGateService,
    now: () => NOW,
  });
  const paperProjectGateway = new RecordingPaperProjectGateway();
  const paperProjectBridgeService = new TopicSelectionV1cPaperProjectBridgeService({
    repository: new InMemoryTopicSelectionV1cPaperProjectBridgeRepository(),
    humanPromotionDecisionService,
    paperProjectGateway,
    now: () => NOW,
  });
  const downstreamFeedbackRecheckService = new TopicSelectionV1cDownstreamFeedbackRecheckService({
    repository: new InMemoryTopicSelectionV1cDownstreamFeedbackRecheckRepository(),
    paperProjectBridgeService,
    recheckRiskMemoryService: new NullRecheckSink(),
    now: () => NOW,
  });
  const offlineReplayService = new TopicSelectionOfflineEvaluationReplayService(
    new InMemoryTopicSelectionOfflineEvaluationReplayRepository(),
    { now: () => NOW },
  );
  const n2BoundedDebateRuntime = new TopicSelectionV1cN2BoundedDebateRuntimeService(
    new TopicSelectionControlPlaneService(new InMemoryTopicSelectionControlPlaneRepository(), { now: () => NOW }),
  );
  const n2BoundedDebateCoordinator = new TopicSelectionV1cN2BoundedDebateCoordinatorService({
    runtime: n2BoundedDebateRuntime,
    admission: new TopicSelectionV1cN2BoundedDebateAdmissionService(n2BoundedDebateRuntime),
    gateService: promotionGateService,
    promotionInputService,
  });
  const n4DelegatedRuntime = new TopicSelectionV1cN4DelegatedPromotionDecisionRuntimeService(
    new TopicSelectionControlPlaneService(new InMemoryTopicSelectionControlPlaneRepository(), { now: () => NOW }),
  );
  const n4DelegatedPromotionDecisionService = new TopicSelectionV1cN4DelegatedPromotionDecisionService({
    runtime: n4DelegatedRuntime,
    admission: new TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionService(n4DelegatedRuntime),
    gateService: promotionGateService,
    humanPromotionDecisionService,
  });
  const controller = new TopicSelectionV1cController(
    promotionInputService,
    promotionGateService,
    humanPromotionDecisionService,
    paperProjectBridgeService,
    downstreamFeedbackRecheckService,
    offlineReplayService,
    n2BoundedDebateCoordinator,
    n4DelegatedPromotionDecisionService,
  );
  await registerTopicSelectionV1cRoutes(app, controller);
  return { app, offlineReplayService, paperProjectGateway };
}

test('POST /promotion-decision-support/bounded-debate reaches the runtime+admission over HTTP (admit is NOT bypassed; the canary skipped it)', async () => {
  const repository = makeSeededTopicPackageRepository(uniqueId('bounded-debate'));
  const app = await makeV1cRouteApp(repository);
  try {
    const { snapshot } = await createReadyGate(app, repository.v1cInputBundle.v1b_to_v1c_input_bundle_id);

    // 4 structurally-minimal operator (codex_assisted) role outputs with the CORRECT schema_versions: the runtime
    // returns them verbatim, then admission rejects them (their refs/semantic layer do not match the real handoff).
    // The point is the route reaches admit at all — the dead slot previously had only the canary's bypass.
    const res = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/promotion-decision-support/bounded-debate',
      payload: {
        promotion_input_snapshot_id: snapshot.promotion_input_snapshot_id,
        created_by: 'system',
        workflow_run_id: 'workflow_run_bounded_debate_http_001',
        node_attempt_id: 'node_attempt_bounded_debate_http_001',
        debate_role_outputs: {
          'n2_bounded_micro_debate.promotion_supporter_draft': {
            schema_version: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
            role_slot: 'n2_bounded_micro_debate.promotion_supporter_draft',
            support_summary: 'minimal',
            support_points: [],
            risk_acknowledgements: [],
            recheck_obligations: [],
          },
          'n2_bounded_micro_debate.reviewer_critic_review': {
            schema_version: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
            role_slot: 'n2_bounded_micro_debate.reviewer_critic_review',
            critic_findings: [],
            required_repairs: [],
          },
          'n2_bounded_micro_debate.promotion_supporter_repair': {
            schema_version: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
            role_slot: 'n2_bounded_micro_debate.promotion_supporter_repair',
            repaired_summary: 'minimal',
            accepted_findings: [],
            rebutted_findings: [],
            repair_actions: [],
          },
          'n2_bounded_micro_debate.synthesizer_final': {
            schema_version: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_FINAL_OUTPUT_SCHEMA_VERSION,
            role_slot: 'n2_bounded_micro_debate.synthesizer_final',
            final_support_summary: 'minimal',
            dossier_markdown: 'minimal',
            reviewer_questions: [],
            risk_notes: [],
            recheck_notes: [],
            n3_semantic_layer: {},
          },
        },
      },
    });

    // The route is registered, the body passed the role outputs through unstripped, and the coordinator reached
    // the runtime + admission, which rejected the under-specified content. A 422 (admit/runtime blocker) — NOT a
    // 404/500 — proves the wiring is live and admit is on the path. (Happy-path 201 is covered by the coordinator
    // unit test with an admission-passing fixture.)
    assert.equal(res.statusCode, 422);
    const body = res.json() as { error: { code: string } };
    assert.ok(['GATE_CONSTRAINT_FAILED', 'INVALID_PAYLOAD'].includes(body.error.code), `unexpected error code: ${body.error.code}`);
  } finally {
    await app.close();
  }
});

test('POST /promotion-decisions/delegated rejects a non-human authorizer over HTTP (the agent never supplies the actor)', async () => {
  const repository = makeSeededTopicPackageRepository(uniqueId('delegated-actor'));
  const app = await makeV1cRouteApp(repository);
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/promotion-decisions/delegated',
      payload: {
        promotion_gate_check_id: 'promotion_gate_check_anything',
        workflow_run_id: 'workflow_run_delegated_http_001',
        node_attempt_id: 'node_attempt_delegated_http_001',
        human_actor: { actor_type: 'llm', actor_id: 'agent_x' },
        codex_response: { output: { decision: 'park' }, operator_label: 'op' },
      },
    });
    // the authority boundary fires (fail-fast, before any gate/runtime call) over HTTP.
    assert.equal(res.statusCode, 422);
    assert.equal((res.json() as { error: { code: string } }).error.code, 'GATE_CONSTRAINT_FAILED');
  } finally {
    await app.close();
  }
});

test('POST /promotion-decisions/delegated reaches the runtime+admission over HTTP (admit is NOT bypassed; the canary skipped it)', async () => {
  const repository = makeSeededTopicPackageRepository(uniqueId('delegated-admit'));
  const app = await makeV1cRouteApp(repository);
  try {
    const { gateBundle } = await createReadyGate(app, repository.v1cInputBundle.v1b_to_v1c_input_bundle_id);
    const res = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/promotion-decisions/delegated',
      payload: {
        promotion_gate_check_id: gateBundle.promotion_gate_check.promotion_gate_check_id,
        workflow_run_id: 'workflow_run_delegated_admit_001',
        node_attempt_id: 'node_attempt_delegated_admit_001',
        human_actor: { actor_type: 'human', actor_id: 'reviewer_001' },
        // an under-specified non-promote candidate: the runtime returns it verbatim (codex_assisted), then admission
        // rejects it -> the route reached the runtime+admission. (A fully-valid happy path is unit-tested.)
        codex_response: {
          output: { schema_version: TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_CANDIDATE_SCHEMA_VERSION, decision: 'park' },
          operator_label: 'op',
        },
      },
    });
    assert.equal(res.statusCode, 422);
    assert.ok(['GATE_CONSTRAINT_FAILED', 'INVALID_PAYLOAD'].includes((res.json() as { error: { code: string } }).error.code));
  } finally {
    await app.close();
  }
});

// T-128 W-13 provenance-integrity guard, end-to-end. The pure-human POST /promotion-decisions body schema is
// additionalProperties:true, so an unknown `delegated_decision_provenance` survives validation and reaches the
// controller/service. This proves the writer ignores it: a fully-human decision is never falsely stamped as
// agent-delegated (the marker is reserved for the N4 delegated path's admission-computed identity hash).
test('POST /promotion-decisions ignores a spoofed delegated_decision_provenance in the body (pure-human decision stays un-stamped)', async () => {
  const repository = makeSeededTopicPackageRepository(uniqueId('human-provenance-spoof'));
  const app = await makeV1cRouteApp(repository);
  try {
    const { gateBundle } = await createReadyGate(app, repository.v1cInputBundle.v1b_to_v1c_input_bundle_id);
    const res = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/promotion-decisions',
      payload: {
        promotion_gate_check_id: gateBundle.promotion_gate_check.promotion_gate_check_id,
        decision: 'promote_to_paper_project',
        human_actor: { actor_type: 'human', actor_id: 'route-reviewer' },
        rationale: 'Fully human authorization.',
        confirmed_snapshot_hash: gateBundle.promotion_gate_check.promotion_input_snapshot_hash,
        // Hostile smuggled marker — must NOT be persisted.
        delegated_decision_provenance: { source: 'codex_delegated', admission_identity_hash: 'forged_admission_identity_hash' },
      },
    });
    assertStatus(res, 201);
    const created = res.json() as {
      promotion_decision: { promotion_decision_id: string; delegated_decision_provenance?: unknown };
    };
    assert.equal(
      created.promotion_decision.delegated_decision_provenance ?? null,
      null,
      'the spoofed provenance marker must not be persisted on a pure-human decision',
    );

    // The persisted record, read back over HTTP, is also un-stamped.
    const readRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/promotion-decisions/${encodeURIComponent(created.promotion_decision.promotion_decision_id)}`,
    });
    assertStatus(readRes, 200);
    const stored = readRes.json() as { delegated_decision_provenance?: unknown };
    assert.equal(stored.delegated_decision_provenance ?? null, null);
  } finally {
    await app.close();
  }
});

async function createReadyGate(app: FastifyInstance, v1cInputBundleId: string) {
  const snapshotRes = await app.inject({
    method: 'POST',
    url: '/topic-selection/v1c/promotion-input-snapshots',
    payload: {
      v1b_to_v1c_input_bundle_id: v1cInputBundleId,
      created_by: 'system',
    },
  });
  assertStatus(snapshotRes, 201);
  const snapshot = snapshotRes.json() as {
    promotion_input_snapshot_id: string;
    closure_status: string;
    promotion_input_snapshot_hash: string;
  };
  assert.equal(snapshot.closure_status, 'ready_for_gate');

  const gateRes = await app.inject({
    method: 'POST',
    url: '/topic-selection/v1c/promotion-gate-checks',
    payload: {
      promotion_input_snapshot_id: snapshot.promotion_input_snapshot_id,
      created_by: 'system',
    },
  });
  assertStatus(gateRes, 201);
  const gateBundle = gateRes.json() as {
    promotion_decision_support: { promotion_decision_support_id: string };
    promotion_dossier: { promotion_dossier_id: string };
    argument_readiness_mini_check: { argument_readiness_mini_check_id: string };
    promotion_gate_check: {
      promotion_gate_check_id: string;
      promotion_input_snapshot_hash: string;
      disposition: string;
      promote_allowed: boolean;
      promotion_input_snapshot_ref: TopicSelectionFunctionalRef;
    };
  };
  assert.equal(gateBundle.promotion_gate_check.disposition, 'ready_for_human_decision');
  assert.equal(gateBundle.promotion_gate_check.promote_allowed, true);
  return { snapshot, gateBundle };
}

async function createActiveBridge(app: FastifyInstance, v1cInputBundleId: string) {
  const { snapshot, gateBundle } = await createReadyGate(app, v1cInputBundleId);
  const humanRes = await app.inject({
    method: 'POST',
    url: '/topic-selection/v1c/promotion-decisions',
    payload: {
      promotion_gate_check_id: gateBundle.promotion_gate_check.promotion_gate_check_id,
      decision: 'promote_to_paper_project',
      human_actor: { actor_type: 'human', actor_id: 'route-reviewer' },
      rationale: 'Authorize promotion from the exact frozen promotion input snapshot.',
      confirmed_snapshot_hash: gateBundle.promotion_gate_check.promotion_input_snapshot_hash,
    },
  });
  assertStatus(humanRes, 201);
  const human = humanRes.json() as {
    promotion_decision: { promotion_decision_id: string; bridge_eligible: boolean };
  };
  assert.equal(human.promotion_decision.bridge_eligible, true);

  const bridgeRes = await app.inject({
    method: 'POST',
    url: '/topic-selection/v1c/paper-project-bridges',
    payload: {
      promotion_decision_id: human.promotion_decision.promotion_decision_id,
      created_by: 'system',
    },
  });
  assertStatus(bridgeRes, 201);
  const bridge = bridgeRes.json() as {
    paper_project_bridge: {
      paper_project_bridge_id: string;
      bridge_status: string;
      bridge_payload_hash: string;
      working_copy_payload_hash: string;
      source_promotion_decision_id: string;
      promotion_input_snapshot_id: string;
      promotion_input_snapshot_hash: string;
      paper_project_intake_ref: null;
      target_paper_project_ref: null;
    };
  };
  assert.equal(bridge.paper_project_bridge.bridge_status, 'active');
  return { snapshot, gateBundle, human, bridge };
}

test('topic-selection v1c HTTP paper-project-intake consumes active bridge with idempotent PaperProject refs', async () => {
  const repository = makeSeededTopicPackageRepository(uniqueId('bridge-intake'));
  const { app, paperProjectGateway } = await makeV1cRouteHarness(repository);
  try {
    const { bridge } = await createActiveBridge(app, repository.v1cInputBundle.v1b_to_v1c_input_bundle_id);
    const bridgeId = bridge.paper_project_bridge.paper_project_bridge_id;
    const bridgePayloadHash = bridge.paper_project_bridge.bridge_payload_hash;
    const bridgeStableBefore = {
      bridge_status: bridge.paper_project_bridge.bridge_status,
      bridge_payload_hash: bridge.paper_project_bridge.bridge_payload_hash,
      working_copy_payload_hash: bridge.paper_project_bridge.working_copy_payload_hash,
      source_promotion_decision_id: bridge.paper_project_bridge.source_promotion_decision_id,
      promotion_input_snapshot_id: bridge.paper_project_bridge.promotion_input_snapshot_id,
      promotion_input_snapshot_hash: bridge.paper_project_bridge.promotion_input_snapshot_hash,
    };
    const intakeUrl = `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridgeId)}/paper-project-intake`;

    const malformedRes = await app.inject({
      method: 'POST',
      url: intakeUrl,
      payload: {
        created_by: 'human',
      },
    });
    assert.equal(malformedRes.statusCode, 400);
    assert.equal((malformedRes.json() as { error: { code: string } }).error.code, 'INVALID_PAYLOAD');

    const staleHashRes = await app.inject({
      method: 'POST',
      url: intakeUrl,
      payload: {
        bridge_payload_hash: 'stale_bridge_payload_hash',
        created_by: 'hybrid',
      },
    });
    assert.equal(staleHashRes.statusCode, 409);
    assert.equal((staleHashRes.json() as { error: { code: string } }).error.code, 'VERSION_CONFLICT');
    assert.equal(paperProjectGateway.createCalls.length, 0);

    const workspaceDriftRes = await app.inject({
      method: 'POST',
      url: intakeUrl,
      payload: {
        bridge_payload_hash: bridgePayloadHash,
        workspace_id: 'workspace_other',
        created_by: 'hybrid',
      },
    });
    assert.equal(workspaceDriftRes.statusCode, 409);
    assert.equal((workspaceDriftRes.json() as { error: { code: string } }).error.code, 'VERSION_CONFLICT');
    assert.equal(paperProjectGateway.createCalls.length, 0);

    const intakeRes = await app.inject({
      method: 'POST',
      url: intakeUrl,
      payload: {
        bridge_payload_hash: bridgePayloadHash,
        title: 'Downstream paper title from bridge intake',
        research_direction: 'paper engineering',
        created_by: 'hybrid',
      },
    });
    assertStatus(intakeRes, 201);
    const intake = intakeRes.json() as {
      paper_project_bridge: {
        paper_project_bridge_id: string;
        paper_project_intake_ref: TopicSelectionFunctionalRef;
        target_paper_project_ref: TopicSelectionFunctionalRef;
      };
      handoff: {
        paper_project_intake_ref: TopicSelectionFunctionalRef;
        target_paper_project_ref: TopicSelectionFunctionalRef;
      };
      paper_project_id: string;
      paper_project_ref: TopicSelectionFunctionalRef;
      paper_project_intake_ref: TopicSelectionFunctionalRef;
      paper_project_created: boolean;
      carried_literature_evidence_ids: string[];
      carried_accepted_risk_refs: TopicSelectionFunctionalRef[];
      carried_condition_refs: TopicSelectionFunctionalRef[];
    };
    assert.equal(intake.paper_project_created, true);
    assert.equal(intake.paper_project_bridge.paper_project_bridge_id, bridgeId);
    assert.equal(intake.paper_project_ref.ref_type, 'paper_project');
    assert.equal(intake.paper_project_ref.ref_id, intake.paper_project_id);
    assert.equal(intake.paper_project_ref.version_id, bridgePayloadHash);
    assert.equal(intake.paper_project_intake_ref.ref_type, 'paper_project_intake');
    assert.equal(intake.paper_project_intake_ref.version_id, bridgePayloadHash);
    assert.deepEqual(intake.carried_literature_evidence_ids, ['LIT-v1c-route']);
    assert.equal(intake.carried_accepted_risk_refs.length, 0);
    assert.equal(intake.carried_condition_refs.length, 0);
    assert.equal(paperProjectGateway.createCalls.length, 1);
    assert.equal(paperProjectGateway.deleteCalls.length, 0);
    assert.equal(paperProjectGateway.createCalls[0]?.title, 'Downstream paper title from bridge intake');
    assert.equal(paperProjectGateway.createCalls[0]?.research_direction, 'paper engineering');
    assert.equal(paperProjectGateway.createCalls[0]?.created_by, 'hybrid');
    assert.deepEqual(
      paperProjectGateway.createCalls[0]?.initial_context.literature_evidence_ids,
      ['LIT-v1c-route'],
    );
    assert.equal(paperProjectGateway.hasPaperProject(intake.paper_project_id), true);

    const bridgeReadRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridgeId)}`,
    });
    assertStatus(bridgeReadRes, 200);
    const bridgeRead = bridgeReadRes.json() as {
      bridge_status: string;
      bridge_payload_hash: string;
      working_copy_payload_hash: string;
      source_promotion_decision_id: string;
      promotion_input_snapshot_id: string;
      promotion_input_snapshot_hash: string;
      paper_project_intake_ref: TopicSelectionFunctionalRef;
      target_paper_project_ref: TopicSelectionFunctionalRef;
    };
    assert.deepEqual(
      {
        bridge_status: bridgeRead.bridge_status,
        bridge_payload_hash: bridgeRead.bridge_payload_hash,
        working_copy_payload_hash: bridgeRead.working_copy_payload_hash,
        source_promotion_decision_id: bridgeRead.source_promotion_decision_id,
        promotion_input_snapshot_id: bridgeRead.promotion_input_snapshot_id,
        promotion_input_snapshot_hash: bridgeRead.promotion_input_snapshot_hash,
      },
      bridgeStableBefore,
    );
    assert.deepEqual(bridgeRead.paper_project_intake_ref, intake.paper_project_intake_ref);
    assert.deepEqual(bridgeRead.target_paper_project_ref, intake.paper_project_ref);
    assert.deepEqual(intake.handoff.paper_project_intake_ref, intake.paper_project_intake_ref);
    assert.deepEqual(intake.handoff.target_paper_project_ref, intake.paper_project_ref);

    const duplicateRes = await app.inject({
      method: 'POST',
      url: intakeUrl,
      payload: {
        bridge_payload_hash: bridgePayloadHash,
        title: 'Attempted duplicate intake title',
        research_direction: 'should not create another project',
        created_by: 'human',
      },
    });
    assertStatus(duplicateRes, 200);
    const duplicate = duplicateRes.json() as typeof intake;
    assert.equal(duplicate.paper_project_created, false);
    assert.equal(duplicate.paper_project_id, intake.paper_project_id);
    assert.deepEqual(duplicate.paper_project_intake_ref, intake.paper_project_intake_ref);
    assert.deepEqual(duplicate.paper_project_ref, intake.paper_project_ref);
    assert.equal(paperProjectGateway.createCalls.length, 1);

    const staleDuplicateRes = await app.inject({
      method: 'POST',
      url: intakeUrl,
      payload: {
        bridge_payload_hash: 'stale_after_consumed_hash',
        title: 'Stale duplicate intake must not be accepted',
        research_direction: 'ignored',
        created_by: 'hybrid',
      },
    });
    assert.equal(staleDuplicateRes.statusCode, 409);
    assert.equal((staleDuplicateRes.json() as { error: { code: string } }).error.code, 'VERSION_CONFLICT');
    assert.equal(paperProjectGateway.createCalls.length, 1);
  } finally {
    await app.close();
  }
});

test('topic-selection v1c HTTP routes drive ready bundle to bridge and downstream recheck projection', async () => {
  const repository = makeSeededTopicPackageRepository(uniqueId('promote'));
  const app = await makeV1cRouteApp(repository);
  try {
    const { snapshot, gateBundle } = await createReadyGate(app, repository.v1cInputBundle.v1b_to_v1c_input_bundle_id);

    const earlyBridgeRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/paper-project-bridges',
      payload: {
        promotion_decision_id: 'promotion_decision_missing',
        created_by: 'system',
      },
    });
    assert.equal(earlyBridgeRes.statusCode, 404);

    for (const [url, id] of [
      ['/topic-selection/v1c/promotion-input-snapshots', snapshot.promotion_input_snapshot_id],
      ['/topic-selection/v1c/promotion-decision-support', gateBundle.promotion_decision_support.promotion_decision_support_id],
      ['/topic-selection/v1c/promotion-dossiers', gateBundle.promotion_dossier.promotion_dossier_id],
      ['/topic-selection/v1c/argument-readiness-mini-checks', gateBundle.argument_readiness_mini_check.argument_readiness_mini_check_id],
      ['/topic-selection/v1c/promotion-gate-checks', gateBundle.promotion_gate_check.promotion_gate_check_id],
    ]) {
      const readRes = await app.inject({ method: 'GET', url: `${url}/${encodeURIComponent(id)}` });
      assertStatus(readRes, 200);
    }

    const supportAliasRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/promotion-decision-support',
      payload: {
        promotion_input_snapshot_id: snapshot.promotion_input_snapshot_id,
        created_by: 'system',
      },
    });
    assertStatus(supportAliasRes, 201);
    const supportAlias = supportAliasRes.json() as {
      promotion_decision_support: { promotion_decision_support_id: string };
      promotion_gate_check?: { promotion_gate_check_id: string };
    };
    assert.equal(
      supportAlias.promotion_decision_support.promotion_decision_support_id,
      gateBundle.promotion_decision_support.promotion_decision_support_id,
    );
    assert.equal(supportAlias.promotion_gate_check, undefined);

    const gateReplayRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/promotion-gate-checks',
      payload: {
        promotion_decision_support_id: supportAlias.promotion_decision_support.promotion_decision_support_id,
        created_by: 'system',
      },
    });
    assertStatus(gateReplayRes, 201);
    const gateReplay = gateReplayRes.json() as {
      promotion_gate_check: { promotion_gate_check_id: string };
    };
    assert.equal(
      gateReplay.promotion_gate_check.promotion_gate_check_id,
      gateBundle.promotion_gate_check.promotion_gate_check_id,
    );

    const conditionRefs = [gateBundle.promotion_gate_check.promotion_input_snapshot_ref];
    const humanRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/promotion-decisions',
      payload: {
        promotion_gate_check_id: gateBundle.promotion_gate_check.promotion_gate_check_id,
        decision: 'promote_with_conditions',
        human_actor: { actor_type: 'human', actor_id: 'route-reviewer' },
        rationale: 'Explicitly authorize promotion with bounded claim obligations.',
        confirmed_snapshot_hash: gateBundle.promotion_gate_check.promotion_input_snapshot_hash,
        conditions: [
          {
            condition_id: 'condition_route_001',
            condition_code: 'verify_claim_ceiling',
            owner: { actor_type: 'human', actor_id: 'paper-owner' },
            required_action: requiredAction('verify_claim_ceiling', conditionRefs),
            refs: conditionRefs,
            early_check_obligations: ['Verify claim ceiling before outline lock.'],
          },
        ],
        allowed_refinements: [
          {
            refinement_code: 'tighten_claim_wording',
            scope: 'claim_wording',
            refs: conditionRefs,
            reason: 'Allow wording tightening without upstream mutation.',
          },
        ],
        stop_conditions: [
          {
            condition_code: 'evidence_invalidated',
            reason: 'Stop if selected evidence is invalidated.',
            refs: conditionRefs,
          },
        ],
        reopen_conditions: [
          {
            condition_code: 'new_supporting_evidence',
            reason: 'Reopen if new supporting evidence is added downstream.',
            refs: conditionRefs,
          },
        ],
      },
    });
    assertStatus(humanRes, 201);
    const human = humanRes.json() as {
      human_promotion_decision: { human_promotion_decision_id: string };
      promotion_decision: {
        promotion_decision_id: string;
        bridge_eligible: boolean;
        promotion_commitment_profile_id: string;
      };
      promotion_commitment_profile: { promotion_commitment_profile_id: string; conditions: unknown[] };
      bridge_handoff: unknown;
    };
    assert.equal(human.promotion_decision.bridge_eligible, true);
    assert.ok(human.bridge_handoff);
    assert.equal(human.promotion_commitment_profile.conditions.length, 1);

    for (const url of [
      `/topic-selection/v1c/human-promotion-decisions/${encodeURIComponent(human.human_promotion_decision.human_promotion_decision_id)}`,
      `/topic-selection/v1c/promotion-decisions/${encodeURIComponent(human.promotion_decision.promotion_decision_id)}`,
      `/topic-selection/v1c/promotion-decisions/${encodeURIComponent(human.promotion_decision.promotion_decision_id)}/bundle`,
      `/topic-selection/v1c/promotion-commitment-profiles/${encodeURIComponent(human.promotion_commitment_profile.promotion_commitment_profile_id)}`,
    ]) {
      const readRes = await app.inject({ method: 'GET', url });
      assertStatus(readRes, 200);
    }

    // T-087 Phase 4 — assert the 3 new list-by-title-card projections after
    // creating gate-check + decision (bridge listed further below).
    const tcGateChecksRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/title-cards/${encodeURIComponent(repository.topicPackage.title_card_id)}/promotion-gate-checks`,
    });
    assertStatus(tcGateChecksRes, 200);
    const tcGateChecks = tcGateChecksRes.json() as {
      items: Array<{ promotion_gate_check_id: string; title_card_id: string }>;
    };
    assert.ok(tcGateChecks.items.length > 0);
    assert.ok(tcGateChecks.items.every((item) => item.title_card_id === repository.topicPackage.title_card_id));

    const tcPromotionDecisionsRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/title-cards/${encodeURIComponent(repository.topicPackage.title_card_id)}/promotion-decisions`,
    });
    assertStatus(tcPromotionDecisionsRes, 200);
    const tcPromotionDecisions = tcPromotionDecisionsRes.json() as {
      items: Array<{ promotion_decision_id: string; title_card_id: string }>;
    };
    assert.ok(tcPromotionDecisions.items.length > 0);
    assert.ok(tcPromotionDecisions.items.every((item) => item.title_card_id === repository.topicPackage.title_card_id));

    const bridgeRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/paper-project-bridges',
      payload: {
        promotion_decision_id: human.promotion_decision.promotion_decision_id,
        created_by: 'system',
      },
    });
    assertStatus(bridgeRes, 201);
    const bridge = bridgeRes.json() as {
      paper_project_bridge: {
        paper_project_bridge_id: string;
        bridge_status: string;
        paper_project_intake_ref: null;
        target_paper_project_ref: null;
        source_promotion_decision_id: string;
        promotion_input_snapshot_id: string;
        promotion_input_snapshot_hash: string;
        conditions: Array<{ condition_code: string; early_check_obligations: string[] }>;
        early_check_obligations: string[];
        working_copy_payload: {
          claim_ceiling: string;
          conditions: Array<{ condition_code: string }>;
          early_check_obligations: string[];
          initial_planning_notes: string[];
          source_lineage_summary: {
            promotion_decision_id: string;
            promotion_input_snapshot_id: string;
            snapshot_hashes: { promotion_input_snapshot_hash: string };
          };
        };
      };
      handoff: {
        paper_project_intake_ref: null;
        target_paper_project_ref: null;
        working_copy_payload_hash: string;
      };
    };
    assert.equal(bridge.paper_project_bridge.bridge_status, 'active');
    assert.equal(bridge.paper_project_bridge.paper_project_intake_ref, null);
    assert.equal(bridge.paper_project_bridge.target_paper_project_ref, null);
    assert.equal(bridge.paper_project_bridge.source_promotion_decision_id, human.promotion_decision.promotion_decision_id);

    // T-087 Phase 4 — bridges list-by-title-card projection (after bridge creation).
    const tcBridgesRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/title-cards/${encodeURIComponent(repository.topicPackage.title_card_id)}/paper-project-bridges`,
    });
    assertStatus(tcBridgesRes, 200);
    const tcBridges = tcBridgesRes.json() as {
      items: Array<{ paper_project_bridge_id: string; title_card_id: string }>;
    };
    assert.ok(tcBridges.items.length > 0);
    assert.ok(tcBridges.items.every((item) => item.title_card_id === repository.topicPackage.title_card_id));

    assert.equal(bridge.paper_project_bridge.promotion_input_snapshot_id, snapshot.promotion_input_snapshot_id);
    assert.equal(bridge.paper_project_bridge.promotion_input_snapshot_hash, snapshot.promotion_input_snapshot_hash);
    assert.equal(bridge.paper_project_bridge.conditions[0]?.condition_code, 'verify_claim_ceiling');
    assert.equal(
      bridge.paper_project_bridge.early_check_obligations.includes('Verify claim ceiling before outline lock.'),
      true,
    );
    assert.equal(
      bridge.paper_project_bridge.working_copy_payload.claim_ceiling,
      'Can claim reviewer-aligned planning feasibility, not production superiority.',
    );
    assert.equal(bridge.paper_project_bridge.working_copy_payload.conditions[0]?.condition_code, 'verify_claim_ceiling');
    assert.equal(
      bridge.paper_project_bridge.working_copy_payload.early_check_obligations.includes(
        'Verify claim ceiling before outline lock.',
      ),
      true,
    );
    assert.equal(
      bridge.paper_project_bridge.working_copy_payload.initial_planning_notes.some((note) =>
        note.includes('Condition verify_claim_ceiling')),
      true,
    );
    assert.equal(
      bridge.paper_project_bridge.working_copy_payload.source_lineage_summary.promotion_decision_id,
      human.promotion_decision.promotion_decision_id,
    );
    assert.equal(
      bridge.paper_project_bridge.working_copy_payload.source_lineage_summary.promotion_input_snapshot_id,
      snapshot.promotion_input_snapshot_id,
    );
    assert.equal(
      bridge.paper_project_bridge.working_copy_payload.source_lineage_summary.snapshot_hashes.promotion_input_snapshot_hash,
      snapshot.promotion_input_snapshot_hash,
    );
    assert.equal(bridge.handoff.paper_project_intake_ref, null);
    assert.equal(bridge.handoff.target_paper_project_ref, null);

    const bridgeReadRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridge.paper_project_bridge.paper_project_bridge_id)}`,
    });
    assertStatus(bridgeReadRes, 200);
    assert.equal(
      (bridgeReadRes.json() as { paper_project_bridge_id: string }).paper_project_bridge_id,
      bridge.paper_project_bridge.paper_project_bridge_id,
    );

    const duplicateBridgeRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/paper-project-bridges',
      payload: {
        promotion_decision_id: human.promotion_decision.promotion_decision_id,
        created_by: 'system',
      },
    });
    assertStatus(duplicateBridgeRes, 201);
    assert.equal(
      (duplicateBridgeRes.json() as { paper_project_bridge: { paper_project_bridge_id: string } }).paper_project_bridge.paper_project_bridge_id,
      bridge.paper_project_bridge.paper_project_bridge_id,
    );

    const feedbackRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/downstream-feedback',
      payload: {
        paper_project_bridge_id: bridge.paper_project_bridge.paper_project_bridge_id,
        downstream_source_kind: 'paper_project',
        downstream_source_ref: ref('paper_project_section', 'introduction'),
        feedback_signal: 'overclaim',
        severity: 'blocking',
        summary: 'Draft introduction overclaims beyond the frozen promotion commitment.',
        required_action: 'Reassess value claim ceiling before continuing the paper draft.',
        created_by: 'human',
      },
    });
    assertStatus(feedbackRes, 201);
    const feedback = feedbackRes.json() as {
      downstream_topic_feedback: { downstream_topic_feedback_id: string; recheck_request: { downstream_recheck_request_id: string } };
      classification: { loopback_target: string; loopback_cause: string; requires_recheck: boolean };
    };
    assert.equal(feedback.classification.loopback_target, 'value_assessment');
    assert.equal(feedback.classification.loopback_cause, 'overclaim');
    assert.equal(feedback.classification.requires_recheck, true);

    const feedbackReadRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/downstream-feedback/${encodeURIComponent(feedback.downstream_topic_feedback.downstream_topic_feedback_id)}`,
    });
    assertStatus(feedbackReadRes, 200);
    assert.equal(
      (feedbackReadRes.json() as { downstream_topic_feedback_id: string }).downstream_topic_feedback_id,
      feedback.downstream_topic_feedback.downstream_topic_feedback_id,
    );

    const recheckByFeedbackRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/downstream-feedback/${encodeURIComponent(feedback.downstream_topic_feedback.downstream_topic_feedback_id)}/recheck-request`,
    });
    assertStatus(recheckByFeedbackRes, 200);
    const recheckByIdRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/recheck-requests/${encodeURIComponent(feedback.downstream_topic_feedback.recheck_request.downstream_recheck_request_id)}`,
    });
    assertStatus(recheckByIdRes, 200);
    const listRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridge.paper_project_bridge.paper_project_bridge_id)}/downstream-feedback`,
    });
    assertStatus(listRes, 200);
    assert.equal((listRes.json() as { items: unknown[] }).items.length, 1);

    const noRecheckFeedbackRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/downstream-feedback',
      payload: {
        paper_project_bridge_id: bridge.paper_project_bridge.paper_project_bridge_id,
        downstream_source_kind: 'paper_project',
        downstream_source_ref: ref('paper_project_section', 'related_work'),
        feedback_signal: 'no_recheck_needed',
        severity: 'info',
        summary: 'Downstream note is recorded for lineage only.',
        created_by: 'human',
      },
    });
    assertStatus(noRecheckFeedbackRes, 201);
    const noRecheckFeedback = noRecheckFeedbackRes.json() as {
      downstream_topic_feedback: { downstream_topic_feedback_id: string; recheck_request: null };
      classification: { requires_recheck: boolean };
      recheck_request: null;
    };
    assert.equal(noRecheckFeedback.classification.requires_recheck, false);
    assert.equal(noRecheckFeedback.downstream_topic_feedback.recheck_request, null);
    assert.equal(noRecheckFeedback.recheck_request, null);
    const missingRecheckProjectionRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/downstream-feedback/${encodeURIComponent(noRecheckFeedback.downstream_topic_feedback.downstream_topic_feedback_id)}/recheck-request`,
    });
    assert.equal(missingRecheckProjectionRes.statusCode, 404);
    const listAfterNoRecheckRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridge.paper_project_bridge.paper_project_bridge_id)}/downstream-feedback`,
    });
    assertStatus(listAfterNoRecheckRes, 200);
    assert.equal((listAfterNoRecheckRes.json() as { items: unknown[] }).items.length, 2);

    // T-127 W-08: the scoped, ranked recheck-advisory surface returns ONLY the recheck-requiring record
    // (1 of the 2 on this bridge), carrying its deterministic advisory ranking. Record-only GET; { items } envelope.
    const advisoriesRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridge.paper_project_bridge.paper_project_bridge_id)}/recheck-advisories`,
    });
    assertStatus(advisoriesRes, 200);
    const advisories = (advisoriesRes.json() as {
      items: Array<{ impact_summary: { requires_recheck: boolean; advisory_priority: number | null; advisory_rank_reason: string | null } }>;
    }).items;
    assert.equal(advisories.length, 1);
    assert.equal(advisories[0]!.impact_summary.requires_recheck, true);
    // The seeded feedback is overclaim+blocking: blocking(45) + recheck_required(18) + overclaim(6) = 69.
    assert.equal(advisories[0]!.impact_summary.advisory_priority, 69);
    assert.equal(advisories[0]!.impact_summary.advisory_rank_reason, 'blocking+recheck_required+overclaim');
  } finally {
    await app.close();
  }
});

test('topic-selection v1c HTTP downstream feedback maps loopbacks append-only without mutating bridge', async () => {
  const repository = makeSeededTopicPackageRepository(uniqueId('downstream-loopback'));
  const app = await makeV1cRouteApp(repository);
  try {
    const { bridge } = await createActiveBridge(app, repository.v1cInputBundle.v1b_to_v1c_input_bundle_id);
    const bridgeId = bridge.paper_project_bridge.paper_project_bridge_id;
    const bridgeBeforeRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridgeId)}`,
    });
    assertStatus(bridgeBeforeRes, 200);
    const bridgeBefore = bridgeBeforeRes.json() as {
      bridge_status: string;
      bridge_payload_hash: string;
      working_copy_payload_hash: string;
      source_promotion_decision_id: string;
      promotion_input_snapshot_id: string;
      promotion_input_snapshot_hash: string;
      paper_project_intake_ref: null;
      target_paper_project_ref: null;
    };
    const bridgeBeforeStableFields = {
      bridge_status: bridgeBefore.bridge_status,
      bridge_payload_hash: bridgeBefore.bridge_payload_hash,
      working_copy_payload_hash: bridgeBefore.working_copy_payload_hash,
      source_promotion_decision_id: bridgeBefore.source_promotion_decision_id,
      promotion_input_snapshot_id: bridgeBefore.promotion_input_snapshot_id,
      promotion_input_snapshot_hash: bridgeBefore.promotion_input_snapshot_hash,
      paper_project_intake_ref: bridgeBefore.paper_project_intake_ref,
      target_paper_project_ref: bridgeBefore.target_paper_project_ref,
    };

    const missingActionRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/downstream-feedback',
      payload: {
        paper_project_bridge_id: bridgeId,
        downstream_source_kind: 'reviewer_check',
        downstream_source_ref: ref('reviewer_check', 'missing_required_action'),
        feedback_signal: 'stale_evidence',
        severity: 'blocking',
        summary: 'A recheck-producing feedback signal must explain the required action.',
        created_by: 'human',
      },
    });
    assert.equal(missingActionRes.statusCode, 400);
    assert.equal((missingActionRes.json() as { error: { code: string } }).error.code, 'INVALID_PAYLOAD');

    const workspaceDriftRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/downstream-feedback',
      payload: {
        paper_project_bridge_id: bridgeId,
        workspace_id: 'workspace_other',
        downstream_source_kind: 'reviewer_check',
        downstream_source_ref: ref('reviewer_check', 'workspace_drift'),
        feedback_signal: 'stale_evidence',
        severity: 'blocking',
        summary: 'Workspace drift must not create feedback.',
        required_action: 'Recheck evidence only inside the owning workspace.',
        created_by: 'human',
      },
    });
    assert.equal(workspaceDriftRes.statusCode, 409);
    assert.equal((workspaceDriftRes.json() as { error: { code: string } }).error.code, 'VERSION_CONFLICT');

    const cases = [
      ['stale_evidence', 'evidence_or_search', 'warning', 'stale'],
      ['overclaim', 'value_assessment', 'blocking', 'recheck_required'],
      ['unanswerable_question', 'topic_question', 'blocking', 'recheck_required'],
      ['boundary_drift', 'research_slice', 'blocking', 'recheck_required'],
      ['need_invalidated', 'validated_need', 'critical', 'invalidated'],
      ['package_narrative_gap', 'package', 'blocking', 'recheck_required'],
      ['promotion_authorization_gap', 'promotion', 'blocking', 'recheck_required'],
      ['bridge_trace_gap', 'paper_project_bridge', 'blocking', 'recheck_required'],
      ['commitment_gap', 'paper_project_bridge', 'blocking', 'recheck_required'],
      ['merge_candidate_conflict', 'merge_candidate', 'blocking', 'recheck_required'],
      ['paper_project_constraint_conflict', 'paper_project_intake', 'blocking', 'recheck_required'],
      ['downstream_mutation_attempt', 'paper_project_bridge', 'critical', 'invalidated'],
      ['no_recheck_needed', 'paper_project_bridge', 'info', 'no_impact'],
    ] as const;
    const expectedAffectedRefTypes: Record<string, string> = {
      evidence_or_search: 'evidence_unit',
      value_assessment: 'topic_value_assessment',
      topic_question: 'topic_question',
      research_slice: 'research_slice',
      validated_need: 'validated_need',
      package: 'topic_package',
      promotion: 'promotion_decision',
      paper_project_bridge: 'paper_project_bridge',
      merge_candidate: 'merge_candidate',
      paper_project_intake: 'paper_project_intake',
    };
    const feedbackIds: string[] = [];
    const recheckIds: string[] = [];

    for (const [feedbackSignal, expectedTarget, severity, expectedImpact] of cases) {
      const requiresRecheck = feedbackSignal !== 'no_recheck_needed';
      const feedbackRes = await app.inject({
        method: 'POST',
        url: '/topic-selection/v1c/downstream-feedback',
        payload: {
          paper_project_bridge_id: bridgeId,
          downstream_source_kind: 'reviewer_check',
          downstream_source_ref: ref('reviewer_check', `reviewer_check_${feedbackSignal}`),
          source_feedback_refs: [ref('review_comment', `review_comment_${feedbackSignal}`)],
          observed_blocker_refs: [ref('topic_selection_blocker', `blocker_${feedbackSignal}`)],
          feedback_signal: feedbackSignal,
          severity,
          summary: `Route-level downstream feedback for ${feedbackSignal}.`,
          required_action: requiresRecheck
            ? `Resolve ${feedbackSignal} before continuing PaperProject drafting.`
            : null,
          feedback_payload: {
            route_test_signal: feedbackSignal,
          },
          created_by: 'human',
        },
      });
      assertStatus(feedbackRes, 201);
      const feedback = feedbackRes.json() as {
        downstream_topic_feedback: {
          downstream_topic_feedback_id: string;
          paper_project_bridge_id: string;
          source_promotion_decision_ref: TopicSelectionFunctionalRef;
          promotion_input_snapshot_id: string;
          promotion_input_snapshot_hash: string;
          recheck_request: {
            downstream_recheck_request_id: string;
            loopback_target: string;
            loopback_cause: string;
            affected_ref: TopicSelectionFunctionalRef;
            required_actions: string[];
            reason_codes: string[];
            source_refs: TopicSelectionFunctionalRef[];
          } | null;
        };
        classification: {
          loopback_target: string;
          loopback_cause: string;
          requires_recheck: boolean;
          affected_ref: TopicSelectionFunctionalRef;
          affected_stage: string;
          required_actions: string[];
        };
        impact_summary: { impact_level: string; requires_recheck: boolean };
        recheck_request: {
          downstream_recheck_request_id: string;
          loopback_target: string;
          loopback_cause: string;
          affected_ref: TopicSelectionFunctionalRef;
          required_actions: string[];
          reason_codes: string[];
          source_refs: TopicSelectionFunctionalRef[];
        } | null;
      };

      feedbackIds.push(feedback.downstream_topic_feedback.downstream_topic_feedback_id);
      assert.equal(feedback.downstream_topic_feedback.paper_project_bridge_id, bridgeId);
      assert.equal(
        feedback.downstream_topic_feedback.source_promotion_decision_ref.ref_id,
        bridge.paper_project_bridge.source_promotion_decision_id,
      );
      assert.equal(
        feedback.downstream_topic_feedback.promotion_input_snapshot_id,
        bridge.paper_project_bridge.promotion_input_snapshot_id,
      );
      assert.equal(
        feedback.downstream_topic_feedback.promotion_input_snapshot_hash,
        bridge.paper_project_bridge.promotion_input_snapshot_hash,
      );
      assert.equal(feedback.classification.loopback_target, expectedTarget);
      assert.equal(feedback.classification.loopback_cause, feedbackSignal);
      assert.equal(feedback.classification.requires_recheck, requiresRecheck);
      assert.equal(feedback.classification.affected_ref.ref_type, expectedAffectedRefTypes[expectedTarget]);
      assert.equal(feedback.impact_summary.impact_level, expectedImpact);
      assert.equal(feedback.impact_summary.requires_recheck, requiresRecheck);
      assert.equal(feedback.classification.required_actions.length, requiresRecheck ? 1 : 0);

      const feedbackReadRes = await app.inject({
        method: 'GET',
        url: `/topic-selection/v1c/downstream-feedback/${encodeURIComponent(feedback.downstream_topic_feedback.downstream_topic_feedback_id)}`,
      });
      assertStatus(feedbackReadRes, 200);

      const recheckByFeedbackRes = await app.inject({
        method: 'GET',
        url: `/topic-selection/v1c/downstream-feedback/${encodeURIComponent(feedback.downstream_topic_feedback.downstream_topic_feedback_id)}/recheck-request`,
      });
      if (requiresRecheck) {
        assertStatus(recheckByFeedbackRes, 200);
        assert.ok(feedback.recheck_request);
        assert.equal(feedback.recheck_request.loopback_target, expectedTarget);
        assert.equal(feedback.recheck_request.loopback_cause, feedbackSignal);
        assert.equal(feedback.recheck_request.affected_ref.ref_type, expectedAffectedRefTypes[expectedTarget]);
        assert.deepEqual(feedback.recheck_request.required_actions, feedback.classification.required_actions);
        assert.deepEqual(feedback.recheck_request.reason_codes, [feedbackSignal]);
        assert.ok(
          feedback.recheck_request.source_refs.some((sourceRef) => sourceRef.ref_type === 'paper_project_bridge'),
        );
        assert.ok(
          feedback.recheck_request.source_refs.some((sourceRef) => sourceRef.ref_type === 'promotion_decision'),
        );
        assert.ok(
          feedback.recheck_request.source_refs.some((sourceRef) => sourceRef.ref_type === 'promotion_input_snapshot'),
        );
        recheckIds.push(feedback.recheck_request.downstream_recheck_request_id);
        const recheckByFeedback = recheckByFeedbackRes.json() as {
          recheck_request: {
            downstream_recheck_request_id: string;
            loopback_target: string;
            affected_ref: TopicSelectionFunctionalRef;
          };
        };
        assert.equal(
          recheckByFeedback.recheck_request.downstream_recheck_request_id,
          feedback.recheck_request.downstream_recheck_request_id,
        );
        assert.equal(recheckByFeedback.recheck_request.loopback_target, expectedTarget);
        assert.equal(recheckByFeedback.recheck_request.affected_ref.ref_type, expectedAffectedRefTypes[expectedTarget]);
        const recheckByIdRes = await app.inject({
          method: 'GET',
          url: `/topic-selection/v1c/recheck-requests/${encodeURIComponent(feedback.recheck_request.downstream_recheck_request_id)}`,
        });
        assertStatus(recheckByIdRes, 200);
        const recheckById = recheckByIdRes.json() as typeof recheckByFeedback;
        assert.equal(
          recheckById.recheck_request.downstream_recheck_request_id,
          feedback.recheck_request.downstream_recheck_request_id,
        );
        assert.equal(recheckById.recheck_request.loopback_target, expectedTarget);
        assert.equal(recheckById.recheck_request.affected_ref.ref_type, expectedAffectedRefTypes[expectedTarget]);
      } else {
        assert.equal(recheckByFeedbackRes.statusCode, 404);
        assert.equal(feedback.recheck_request, null);
      }
    }

    assert.equal(feedbackIds.length, cases.length);
    assert.equal(recheckIds.length, cases.length - 1);

    const listRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridgeId)}/downstream-feedback`,
    });
    assertStatus(listRes, 200);
    const listed = listRes.json() as { items: Array<{ downstream_topic_feedback_id: string }> };
    assert.equal(listed.items.length, cases.length);
    assert.deepEqual(
      new Set(listed.items.map((item) => item.downstream_topic_feedback_id)),
      new Set(feedbackIds),
    );

    const bridgeAfterRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridgeId)}`,
    });
    assertStatus(bridgeAfterRes, 200);
    const bridgeAfter = bridgeAfterRes.json() as typeof bridgeBefore;
    assert.deepEqual(
      {
        bridge_status: bridgeAfter.bridge_status,
        bridge_payload_hash: bridgeAfter.bridge_payload_hash,
        working_copy_payload_hash: bridgeAfter.working_copy_payload_hash,
        source_promotion_decision_id: bridgeAfter.source_promotion_decision_id,
        promotion_input_snapshot_id: bridgeAfter.promotion_input_snapshot_id,
        promotion_input_snapshot_hash: bridgeAfter.promotion_input_snapshot_hash,
        paper_project_intake_ref: bridgeAfter.paper_project_intake_ref,
        target_paper_project_ref: bridgeAfter.target_paper_project_ref,
      },
      bridgeBeforeStableFields,
    );
  } finally {
    await app.close();
  }
});

test('topic-selection v1c HTTP routes enforce frozen snapshot and single-current promotion boundaries', async () => {
  const repository = makeSeededTopicPackageRepository(uniqueId('frozen-boundary'));
  const app = await makeV1cRouteApp(repository);
  try {
    const { gateBundle } = await createReadyGate(app, repository.v1cInputBundle.v1b_to_v1c_input_bundle_id);
    const actionRefs = [gateBundle.promotion_gate_check.promotion_input_snapshot_ref];

    const staleDecisionRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/promotion-decisions',
      payload: {
        promotion_gate_check_id: gateBundle.promotion_gate_check.promotion_gate_check_id,
        decision: 'promote_to_paper_project',
        human_actor: { actor_type: 'human', actor_id: 'route-reviewer' },
        rationale: 'This should not pass because the confirmed snapshot hash is stale.',
        confirmed_snapshot_hash: 'stale_snapshot_hash',
      },
    });
    assert.equal(staleDecisionRes.statusCode, 409);
    assert.equal((staleDecisionRes.json() as { error: { code: string } }).error.code, 'VERSION_CONFLICT');

    const malformedConditionRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/promotion-decisions',
      payload: {
        promotion_gate_check_id: gateBundle.promotion_gate_check.promotion_gate_check_id,
        decision: 'promote_with_conditions',
        human_actor: { actor_type: 'human', actor_id: 'route-reviewer' },
        rationale: 'This should not pass because the condition is not human-verifiable.',
        confirmed_snapshot_hash: gateBundle.promotion_gate_check.promotion_input_snapshot_hash,
        conditions: [
          {
            condition_id: 'condition_route_malformed',
            condition_code: 'verify_claim_ceiling',
            owner: { actor_type: 'human', actor_id: 'paper-owner' },
            required_action: requiredAction('verify_claim_ceiling', actionRefs),
            refs: actionRefs,
          },
        ],
      },
    });
    assert.equal(malformedConditionRes.statusCode, 400);
    assert.equal((malformedConditionRes.json() as { error: { code: string } }).error.code, 'INVALID_PAYLOAD');

    const humanRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/promotion-decisions',
      payload: {
        promotion_gate_check_id: gateBundle.promotion_gate_check.promotion_gate_check_id,
        decision: 'promote_to_paper_project',
        human_actor: { actor_type: 'human', actor_id: 'route-reviewer' },
        rationale: 'Authorize promotion from the exact frozen promotion input snapshot.',
        confirmed_snapshot_hash: gateBundle.promotion_gate_check.promotion_input_snapshot_hash,
      },
    });
    assertStatus(humanRes, 201);
    const human = humanRes.json() as {
      promotion_decision: { promotion_decision_id: string; bridge_eligible: boolean };
    };
    assert.equal(human.promotion_decision.bridge_eligible, true);

    const secondDecisionRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/promotion-decisions',
      payload: {
        promotion_gate_check_id: gateBundle.promotion_gate_check.promotion_gate_check_id,
        decision: 'park',
        human_actor: { actor_type: 'human', actor_id: 'route-reviewer' },
        rationale: 'A second current decision for the same snapshot must not overwrite promotion authority.',
        confirmed_snapshot_hash: gateBundle.promotion_gate_check.promotion_input_snapshot_hash,
      },
    });
    assert.equal(secondDecisionRes.statusCode, 409);
    assert.equal((secondDecisionRes.json() as { error: { code: string } }).error.code, 'VERSION_CONFLICT');

    const workspaceDriftBridgeRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/paper-project-bridges',
      payload: {
        promotion_decision_id: human.promotion_decision.promotion_decision_id,
        workspace_id: 'workspace_other',
        created_by: 'system',
      },
    });
    assert.equal(workspaceDriftBridgeRes.statusCode, 409);
    assert.equal(
      (workspaceDriftBridgeRes.json() as { error: { code: string } }).error.code,
      'VERSION_CONFLICT',
    );

    const bridgeRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/paper-project-bridges',
      payload: {
        promotion_decision_id: human.promotion_decision.promotion_decision_id,
        created_by: 'system',
      },
    });
    assertStatus(bridgeRes, 201);
    const bridge = bridgeRes.json() as {
      paper_project_bridge: {
        bridge_status: string;
        paper_project_intake_ref: null;
        target_paper_project_ref: null;
        source_promotion_decision_id: string;
      };
    };
    assert.equal(bridge.paper_project_bridge.bridge_status, 'active');
    assert.equal(bridge.paper_project_bridge.paper_project_intake_ref, null);
    assert.equal(bridge.paper_project_bridge.target_paper_project_ref, null);
    assert.equal(bridge.paper_project_bridge.source_promotion_decision_id, human.promotion_decision.promotion_decision_id);
  } finally {
    await app.close();
  }
});

test('topic-selection v1c HTTP routes keep non-promote decisions out of bridge creation', async () => {
  const repository = makeSeededTopicPackageRepository(uniqueId('non-promote'));
  const app = await makeV1cRouteApp(repository);
  try {
    const { gateBundle } = await createReadyGate(app, repository.v1cInputBundle.v1b_to_v1c_input_bundle_id);
    const actionRefs = [gateBundle.promotion_gate_check.promotion_input_snapshot_ref];
    const decisionRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/promotion-decisions',
      payload: {
        promotion_gate_check_id: gateBundle.promotion_gate_check.promotion_gate_check_id,
        decision: 'refine_package',
        human_actor: { actor_type: 'human', actor_id: 'route-reviewer' },
        rationale: 'Do not promote until the package narrative is refined.',
        confirmed_snapshot_hash: gateBundle.promotion_gate_check.promotion_input_snapshot_hash,
        required_actions: [requiredAction('refine_package_narrative', actionRefs)],
        loopback_target: 'package',
      },
    });
    assertStatus(decisionRes, 201);
    const decision = decisionRes.json() as {
      promotion_decision: { promotion_decision_id: string; bridge_eligible: boolean; loopback_target: string };
      bridge_handoff: null;
    };
    assert.equal(decision.promotion_decision.bridge_eligible, false);
    assert.equal(decision.promotion_decision.loopback_target, 'package');
    assert.equal(decision.bridge_handoff, null);

    const bridgeRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/paper-project-bridges',
      payload: {
        promotion_decision_id: decision.promotion_decision.promotion_decision_id,
      },
    });
    assert.equal(bridgeRes.statusCode, 409);
    assert.equal((bridgeRes.json() as { error: { code: string } }).error.code, 'GATE_CONSTRAINT_FAILED');
  } finally {
    await app.close();
  }
});

test('topic-selection v1c offline replay routes force v1c stage and reject incompatible cases or metrics', async () => {
  const repository = makeSeededTopicPackageRepository(uniqueId('replay'));
  const { app, offlineReplayService } = await makeV1cRouteHarness(repository);
  try {
    const invalidDatasetStageRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/offline-evaluation/datasets',
      payload: {
        dataset_key: 'attempt-v1a-through-v1c-route',
        dataset_version: '1',
        stage: 'v1a',
      },
    });
    assert.equal(invalidDatasetStageRes.statusCode, 400);

    const validDatasetStageRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/offline-evaluation/datasets',
      payload: {
        dataset_key: uniqueId('explicit-v1c-dataset'),
        dataset_version: '1',
        stage: 'v1c',
      },
    });
    assertStatus(validDatasetStageRes, 201);
    assert.equal((validDatasetStageRes.json() as { stage: string }).stage, 'v1c');

    const syntheticRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/offline-evaluation/datasets/synthetic-baseline',
    });
    assertStatus(syntheticRes, 201);
    const synthetic = syntheticRes.json() as {
      dataset: { offline_evaluation_dataset_id: string; stage: string; case_count: number };
      cases: TopicSelectionOfflineEvaluationCaseRecord[];
    };
    assert.equal(synthetic.dataset.stage, 'v1c');
    assert.equal(synthetic.dataset.case_count, TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_CASE_TYPES.length);
    assert.deepEqual(
      new Set(synthetic.cases.map((record) => record.case_type)),
      new Set(TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_CASE_TYPES),
    );

    const invalidCaseTypeRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/offline-evaluation/cases',
      payload: {
        dataset_id: synthetic.dataset.offline_evaluation_dataset_id,
        case_key: 'v1b-case-type-through-v1c-api',
        case_type: TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_CASE_TYPES[0],
        frozen_input_bundle: {
          stage: 'v1c',
          frozen_at: NOW,
          source_refs: [],
          artifact_refs: [],
          stage_snapshots: {},
          payload: {},
        },
        gold_expectation: {
          expected_unmet_need: false,
          expected_key_evidence_refs: [],
          expected_counter_evidence_refs: [],
          expected_blocker_codes: [],
          required_trace_refs: [],
          expected_recheck_action_refs: [],
          expected_negative_memory_refs: [],
          expected_downstream_rework_causes: [],
          notes: [],
        },
      },
    });
    assert.equal(invalidCaseTypeRes.statusCode, 400);

    const invalidMetricRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/offline-evaluation/runs',
      payload: {
        dataset_id: synthetic.dataset.offline_evaluation_dataset_id,
        workflow_profile_key: 'topic-selection-v1c-frozen-fixture',
        metric_keys: ['false_gap_rate'],
      },
    });
    assert.equal(invalidMetricRes.statusCode, 400);

    const v1bDataset = await offlineReplayService.createSyntheticV1bBaselineDataset({
      dataset_key: uniqueId('v1b-run-via-v1c-guard'),
    });
    const wrongStageRunCreateRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/offline-evaluation/runs',
      payload: {
        dataset_id: v1bDataset.dataset.offline_evaluation_dataset_id,
        workflow_profile_key: 'topic-selection-v1b-frozen-fixture',
      },
    });
    assert.equal(wrongStageRunCreateRes.statusCode, 404);

    const v1bRun = await offlineReplayService.startRun({
      dataset_id: v1bDataset.dataset.offline_evaluation_dataset_id,
      workflow_profile_key: 'topic-selection-v1b-frozen-fixture',
    });
    const wrongStageCaseResultRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/offline-evaluation/case-results',
      payload: {
        run_id: v1bRun.offline_evaluation_run_id,
        case_id: v1bDataset.cases[0]?.offline_evaluation_case_id,
        observed_output: v1bDataset.cases[0]?.frozen_input_bundle.payload.fixture_observed_output,
      },
    });
    assert.equal(wrongStageCaseResultRes.statusCode, 404);

    const wrongStageCompleteRes = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1c/offline-evaluation/runs/${encodeURIComponent(v1bRun.offline_evaluation_run_id)}/complete`,
    });
    assert.equal(wrongStageCompleteRes.statusCode, 404);
    const wrongStageMetricsRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/offline-evaluation/runs/${encodeURIComponent(v1bRun.offline_evaluation_run_id)}/metrics`,
    });
    assert.equal(wrongStageMetricsRes.statusCode, 404);
    const wrongStageDiffsRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/offline-evaluation/runs/${encodeURIComponent(v1bRun.offline_evaluation_run_id)}/diffs`,
    });
    assert.equal(wrongStageDiffsRes.statusCode, 404);

    const runRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/offline-evaluation/runs',
      payload: {
        dataset_id: synthetic.dataset.offline_evaluation_dataset_id,
        workflow_profile_key: 'topic-selection-v1c-frozen-fixture',
      },
    });
    assertStatus(runRes, 201);
    const run = runRes.json() as { offline_evaluation_run_id: string; metric_keys: string[] };
    assert.deepEqual(new Set(run.metric_keys), new Set(TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_METRIC_KEYS));

    for (const evaluationCase of synthetic.cases) {
      const resultRes = await app.inject({
        method: 'POST',
        url: '/topic-selection/v1c/offline-evaluation/case-results',
        payload: {
          run_id: run.offline_evaluation_run_id,
          case_id: evaluationCase.offline_evaluation_case_id,
          observed_output: evaluationCase.frozen_input_bundle.payload.fixture_observed_output as TopicSelectionOfflineEvaluationObservedOutput,
        },
      });
      assertStatus(resultRes, 201);
    }

    const completeRes = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1c/offline-evaluation/runs/${encodeURIComponent(run.offline_evaluation_run_id)}/complete`,
    });
    assertStatus(completeRes, 200);

    const metricsRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/offline-evaluation/runs/${encodeURIComponent(run.offline_evaluation_run_id)}/metrics`,
    });
    assertStatus(metricsRes, 200);
    const metricKeys = new Set((metricsRes.json() as { items: Array<{ metric_key: string }> }).items.map((item) => item.metric_key));
    assert.deepEqual(metricKeys, new Set(TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_METRIC_KEYS));

    const diffRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/offline-evaluation/runs/${encodeURIComponent(run.offline_evaluation_run_id)}/diffs`,
    });
    assertStatus(diffRes, 200);
    const changedDimensions = new Set(
      (diffRes.json() as { items: Array<{ changed_dimensions: string[] }> }).items.flatMap((item) => item.changed_dimensions),
    );
    for (const dimension of [
      'promotion_input_currentness',
      'promotion_gate_blocker',
      'human_authorization',
      'promotion_gate',
      'bridge_trace',
      'commitment_profile',
      'loopback_target',
      'downstream_feedback',
    ]) {
      assert.equal(changedDimensions.has(dimension), true, `missing replay diff dimension ${dimension}`);
    }
  } finally {
    await app.close();
  }
});

test('T-067 Prisma HTTP smoke requires DATABASE_URL and drives v1c routes against Prisma repositories', async () => {
  await assertPrismaHttpSmokeDatabaseReady();
  const suffix = uniqueId('v1c-prisma');
  const prisma = new PrismaClient();
  let repository: SeededTopicPackageRepository | null = null;
  try {
    repository = await seedReadyV1cInputBundleInPrisma(prisma, suffix);
  } finally {
    await prisma.$disconnect();
  }
  assert.ok(repository);

  const previousEnv = {
    TITLE_CARD_REPOSITORY: process.env.TITLE_CARD_REPOSITORY,
    RESEARCH_LIFECYCLE_REPOSITORY: process.env.RESEARCH_LIFECYCLE_REPOSITORY,
    AUTO_PULL_REPOSITORY: process.env.AUTO_PULL_REPOSITORY,
    APPLICATION_SETTINGS_REPOSITORY: process.env.APPLICATION_SETTINGS_REPOSITORY,
    AUTO_PULL_SCHEDULER_ENABLED: process.env.AUTO_PULL_SCHEDULER_ENABLED,
  };
  process.env.TITLE_CARD_REPOSITORY = 'prisma';
  process.env.RESEARCH_LIFECYCLE_REPOSITORY = 'prisma';
  process.env.AUTO_PULL_REPOSITORY = 'prisma';
  process.env.APPLICATION_SETTINGS_REPOSITORY = 'prisma';
  process.env.AUTO_PULL_SCHEDULER_ENABLED = 'false';

  const app = buildApp();
  try {
    const { snapshot, gateBundle } = await createReadyGate(
      app,
      repository.v1cInputBundle.v1b_to_v1c_input_bundle_id,
    );
    const humanRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/promotion-decisions',
      payload: {
        promotion_gate_check_id: gateBundle.promotion_gate_check.promotion_gate_check_id,
        decision: 'promote_to_paper_project',
        human_actor: { actor_type: 'human', actor_id: 'route-prisma-reviewer' },
        rationale: 'Explicitly authorize Prisma-backed promotion bridge smoke.',
        confirmed_snapshot_hash: gateBundle.promotion_gate_check.promotion_input_snapshot_hash,
      },
    });
    assertStatus(humanRes, 201);
    const human = humanRes.json() as {
      promotion_decision: {
        promotion_decision_id: string;
        bridge_eligible: boolean;
        promotion_commitment_profile_id: string;
      };
      promotion_commitment_profile: { promotion_commitment_profile_id: string };
    };
    assert.equal(human.promotion_decision.bridge_eligible, true);
    assert.ok(human.promotion_decision.promotion_commitment_profile_id);

    const bridgeRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/paper-project-bridges',
      payload: {
        promotion_decision_id: human.promotion_decision.promotion_decision_id,
        created_by: 'system',
      },
    });
    assertStatus(bridgeRes, 201);
    const bridge = bridgeRes.json() as {
      paper_project_bridge: {
        paper_project_bridge_id: string;
        bridge_status: string;
        bridge_payload_hash: string;
        promotion_input_snapshot_id: string;
      };
    };
    assert.equal(bridge.paper_project_bridge.bridge_status, 'active');
    assert.equal(bridge.paper_project_bridge.promotion_input_snapshot_id, snapshot.promotion_input_snapshot_id);

    const intakeRes = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridge.paper_project_bridge.paper_project_bridge_id)}/paper-project-intake`,
      payload: {
        bridge_payload_hash: bridge.paper_project_bridge.bridge_payload_hash,
        title: `Prisma-backed PaperProject from ${suffix}`,
        research_direction: 'paper engineering',
        created_by: 'hybrid',
      },
    });
    assertStatus(intakeRes, 201);
    const intake = intakeRes.json() as {
      paper_project_id: string;
      paper_project_created: boolean;
      paper_project_ref: TopicSelectionFunctionalRef;
      paper_project_intake_ref: TopicSelectionFunctionalRef;
      carried_literature_evidence_ids: string[];
    };
    assert.equal(intake.paper_project_created, true);
    assert.equal(intake.paper_project_ref.ref_id, intake.paper_project_id);
    assert.equal(intake.paper_project_ref.version_id, bridge.paper_project_bridge.bridge_payload_hash);
    assert.equal(intake.paper_project_intake_ref.version_id, bridge.paper_project_bridge.bridge_payload_hash);
    assert.deepEqual(
      intake.carried_literature_evidence_ids,
      repository.topicPackage.selected_literature_evidence_ids,
    );

    const duplicateIntakeRes = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridge.paper_project_bridge.paper_project_bridge_id)}/paper-project-intake`,
      payload: {
        bridge_payload_hash: bridge.paper_project_bridge.bridge_payload_hash,
        title: `Duplicate intake should not create another paper ${suffix}`,
        research_direction: 'ignored',
        created_by: 'human',
      },
    });
    assertStatus(duplicateIntakeRes, 200);
    const duplicateIntake = duplicateIntakeRes.json() as typeof intake;
    assert.equal(duplicateIntake.paper_project_created, false);
    assert.equal(duplicateIntake.paper_project_id, intake.paper_project_id);

    const feedbackRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/downstream-feedback',
      payload: {
        paper_project_bridge_id: bridge.paper_project_bridge.paper_project_bridge_id,
        downstream_source_kind: 'paper_project',
        downstream_source_ref: ref('paper_project', intake.paper_project_id, repository.topicPackage.title_card_id),
        feedback_signal: 'overclaim',
        severity: 'blocking',
        summary: 'Prisma-backed draft introduction exceeds the frozen promotion claim ceiling.',
        required_action: 'Reassess value claim ceiling before continuing the Prisma-backed paper draft.',
        created_by: 'human',
      },
    });
    assertStatus(feedbackRes, 201);
    const feedback = feedbackRes.json() as {
      downstream_topic_feedback: {
        downstream_topic_feedback_id: string;
        recheck_request: { downstream_recheck_request_id: string };
      };
      classification: { loopback_target: string; requires_recheck: boolean };
    };
    assert.equal(feedback.classification.loopback_target, 'value_assessment');
    assert.equal(feedback.classification.requires_recheck, true);

    const recheckRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1c/recheck-requests/${encodeURIComponent(feedback.downstream_topic_feedback.recheck_request.downstream_recheck_request_id)}`,
    });
    assertStatus(recheckRes, 200);

    const persisted = new PrismaClient();
    try {
      const persistedBridge = await persisted.topicSelectionPaperProjectBridge.findUnique({
        where: { id: bridge.paper_project_bridge.paper_project_bridge_id },
      });
      assert.ok(persistedBridge);
      assert.ok(persistedBridge.paperProjectIntakeRef);
      assert.ok(persistedBridge.targetPaperProjectRef);
      const persistedPaper = await persisted.paperProject.findUnique({
        where: { id: intake.paper_project_id },
      });
      assert.ok(persistedPaper);
      assert.equal(persistedPaper.title, `Prisma-backed PaperProject from ${suffix}`);
      assert.equal(persistedPaper.researchDirection, 'paper engineering');
      const persistedFeedback = await persisted.topicSelectionDownstreamTopicFeedback.findUnique({
        where: { id: feedback.downstream_topic_feedback.downstream_topic_feedback_id },
      });
      assert.ok(persistedFeedback);
    } finally {
      await persisted.$disconnect();
    }
  } finally {
    await app.close();
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[key as keyof NodeJS.ProcessEnv];
      } else {
        process.env[key as keyof NodeJS.ProcessEnv] = value;
      }
    }
  }
});

test('buildApp registers topic-selection v1c routes', async () => {
  const app = buildApp();
  try {
    const res = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1c/offline-evaluation/datasets/synthetic-baseline',
    });
    assertStatus(res, 201);
    assert.equal((res.json() as { dataset: { stage: string } }).dataset.stage, 'v1c');
  } finally {
    await app.close();
  }
});
