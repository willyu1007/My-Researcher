import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {
  createNeedReviewRequestSchema,
  createPromotionDecisionRequestSchema,
  createResearchQuestionRequestSchema,
  createTitleCardRequestSchema,
} from './title-card-management-contracts.js';
// NOTE: only the namespaces referenced by OTHER tests in this file are imported here.
// The 'barrel re-exports the runtime value surface' test below derives the full module
// set programmatically from index.ts, so it needs no per-module import.
import * as researchLifecycleContracts from './index.js';
import * as topicSelectionControlPlaneContracts from './topic-selection-control-plane-contracts.js';
import * as topicSelectionAgentInvocationContracts from './topic-selection-agent-invocation-contracts.js';
import * as topicSelectionDebateScenarioContracts from './topic-selection-debate-scenario-contracts.js';
import * as topicSelectionEvidenceMapContracts from './topic-selection-evidence-map-contracts.js';
import * as topicSelectionNeedValidationContracts from './topic-selection-need-validation-contracts.js';
import * as topicSelectionOfflineEvaluationReplayContracts from './topic-selection-offline-evaluation-replay-contracts.js';
import * as topicSelectionRecheckRiskMemoryContracts from './topic-selection-recheck-risk-memory-contracts.js';
import * as topicSelectionResourceSamplingContracts from './topic-selection-resource-sampling-contracts.js';
import * as topicSelectionSearchResourceContracts from './topic-selection-search-resource-contracts.js';
import * as topicSelectionV1bIntakeContracts from './topic-selection-v1b-intake-contracts.js';
import * as topicSelectionV1bResearchSliceContracts from './topic-selection-v1b-research-slice-contracts.js';
import * as topicSelectionV1bTopicQuestionContracts from './topic-selection-v1b-topic-question-contracts.js';
import * as topicSelectionV1bTopicPackageContracts from './topic-selection-v1b-topic-package-contracts.js';
import * as topicSelectionV1bValueAssessmentContracts from './topic-selection-v1b-value-assessment-contracts.js';
import * as topicSelectionV1cPromotionGateContracts from './topic-selection-v1c-promotion-gate-contracts.js';
import * as topicSelectionV1cHumanPromotionDecisionContracts from './topic-selection-v1c-human-promotion-decision-contracts.js';
import * as topicSelectionV1cPaperProjectBridgeContracts from './topic-selection-v1c-paper-project-bridge-contracts.js';
import * as topicSelectionV1cDownstreamFeedbackRecheckContracts from './topic-selection-v1c-downstream-feedback-recheck-contracts.js';
import * as topicSelectionV1cPromotionInputContracts from './topic-selection-v1c-promotion-input-contracts.js';
import type {
  ReleaseGateReviewResponse,
  StageGateVerifyRequest,
} from './paper-project-contracts.js';
import type {
  LiteratureContentProcessingRunDTO,
  PaperLiteratureLinkView,
  UpdatePaperLiteratureLinkResponse,
} from './literature-contracts.js';
import type {
  CreateAutoPullRunRequest,
  TopicProfileDTO,
} from './auto-pull-contracts.js';
const directModuleTypeSmoke:
  | [
      StageGateVerifyRequest,
      ReleaseGateReviewResponse,
      PaperLiteratureLinkView,
      UpdatePaperLiteratureLinkResponse,
      CreateAutoPullRunRequest,
      TopicProfileDTO,
      LiteratureContentProcessingRunDTO,
    ]
  | null = null;

void directModuleTypeSmoke;

function functionalRefForSchema(refType: string, refId: string) {
  return {
    ref_type: refType,
    ref_id: refId,
  };
}

function topicQuestionEvidenceRefForSchema() {
  return {
    topic_question_evidence_ref_id: 'topic_question_evidence_ref_001',
    title_card_id: 'title_card_001',
    topic_question_id: 'topic_question_001',
    topic_question_contract_id: 'topic_question_contract_001',
    evidence_ref: functionalRefForSchema('evidence_unit', 'evidence_unit_001'),
    evidence_role: 'support',
    mapped_question_part: 'main_question',
    rationale: 'Supports the selected topic package.',
    source_locator_snapshot: {},
    created_at: '2026-05-15T00:00:00.000Z',
  };
}

test('title-card management schemas load', () => {
  assert.ok(createTitleCardRequestSchema);
  assert.ok(createResearchQuestionRequestSchema);
  assert.ok(createPromotionDecisionRequestSchema);
});

test('topic-selection control-plane schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionControlPlaneContracts.topicSelectionContextPolicyVersionRecordSchema);
  assert.ok(topicSelectionControlPlaneContracts.topicSelectionWorkflowProfilePolicyRecordSchema);
  assert.ok(topicSelectionControlPlaneContracts.topicSelectionTransitionPolicyVersionRecordSchema);
  assert.ok(topicSelectionControlPlaneContracts.topicSelectionInputSnapshotRecordSchema);
  assert.ok(topicSelectionControlPlaneContracts.topicSelectionArtifactRefRecordSchema);
  assert.ok(topicSelectionControlPlaneContracts.topicSelectionLlmWorkflowRunRecordSchema);
  assert.ok(topicSelectionControlPlaneContracts.topicSelectionQualitySignalRecordSchema);
  assert.ok(topicSelectionControlPlaneContracts.topicSelectionReadinessGateResultRecordSchema);
  assert.ok(topicSelectionControlPlaneContracts.topicSelectionChainTransitionAttemptRecordSchema);
  assert.ok(topicSelectionControlPlaneContracts.topicSelectionFunctionalLineageLinkRecordSchema);
  assert.ok(topicSelectionControlPlaneContracts.topicSelectionTraceSnapshotRecordSchema);
  assert.ok(topicSelectionControlPlaneContracts.topicSelectionHumanConfirmedDecisionRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionInputSnapshotRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionHumanConfirmedDecisionRecordSchema);
});

test('topic-selection search/resource schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionSearchResourceContracts.topicSelectionTopicSeedRecordSchema);
  assert.ok(topicSelectionSearchResourceContracts.topicSelectionLiteratureResourcePoolSnapshotRecordSchema);
  assert.ok(topicSelectionSearchResourceContracts.topicSelectionSearchPlanBlueprintSchema);
  assert.ok(topicSelectionSearchResourceContracts.topicSelectionSearchPlanBlueprintCoverageIntentSchema);
  assert.equal(
    topicSelectionSearchResourceContracts.topicSelectionSearchPlanBlueprintSchema.properties.schema_version.const,
    topicSelectionSearchResourceContracts.TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_SCHEMA_VERSION,
  );
  assert.equal(
    topicSelectionSearchResourceContracts.topicSelectionSearchPlanBlueprintSchema.properties.query_intents.minItems,
    1,
  );
  assert.equal(
    topicSelectionSearchResourceContracts.topicSelectionSearchPlanBlueprintSchema.properties.coverage_intents.minItems,
    1,
  );
  assert.ok(topicSelectionSearchResourceContracts.topicSelectionSearchPlanRecordSchema);
  assert.ok(topicSelectionSearchResourceContracts.topicSelectionCoverageRowIntentRecordSchema);
  assert.ok(topicSelectionSearchResourceContracts.topicSelectionCoverageExecutionObservationRecordSchema);
  assert.ok(topicSelectionSearchResourceContracts.topicSelectionCoverageEvidenceBindingRecordSchema);
  assert.ok(topicSelectionSearchResourceContracts.topicSelectionCoverageAssessmentRecordSchema);
  assert.ok(topicSelectionSearchResourceContracts.topicSelectionCoverageRiskAcceptanceRecordSchema);
  assert.ok(topicSelectionSearchResourceContracts.topicSelectionSearchRunRecordSchema);
  assert.ok(topicSelectionSearchResourceContracts.topicSelectionSearchPlanRecheckRequestRecordSchema);
  assert.ok(topicSelectionSearchResourceContracts.topicSelectionSearchPlanCoverageMatrixSchema);
  assert.ok(researchLifecycleContracts.topicSelectionSearchRunRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionSearchPlanCoverageMatrixSchema);
});

test('topic-selection resource sampling schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionResourceSamplingContracts.topicSelectionResourceSampleSetRecordSchema);
  assert.ok(topicSelectionResourceSamplingContracts.topicSelectionResourceSampleItemRecordSchema);
  assert.ok(topicSelectionResourceSamplingContracts.topicSelectionResourceSamplingAuditRecordSchema);
  assert.ok(topicSelectionResourceSamplingContracts.createTopicSelectionResourceSampleRequestSchema);
  assert.ok(topicSelectionResourceSamplingContracts.topicSelectionResourceSampleResultSchema);
  assert.ok(researchLifecycleContracts.topicSelectionResourceSampleSetRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionResourceSampleResultSchema);
});

test('topic-selection evidence-map schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionEvidenceMapContracts.topicSelectionEvidenceMapRecordSchema);
  assert.ok(topicSelectionEvidenceMapContracts.topicSelectionEvidenceUnitRecordSchema);
  assert.ok(topicSelectionEvidenceMapContracts.topicSelectionEvidenceSourceLocatorSchema);
  assert.ok(topicSelectionEvidenceMapContracts.topicSelectionEvidenceTypedLinkRecordSchema);
  assert.ok(topicSelectionEvidenceMapContracts.topicSelectionEvidenceClusterRecordSchema);
  assert.ok(topicSelectionEvidenceMapContracts.topicSelectionEvidencePatternRecordSchema);
  assert.ok(topicSelectionEvidenceMapContracts.topicSelectionEvidenceConflictSetRecordSchema);
  assert.ok(topicSelectionEvidenceMapContracts.topicSelectionEvidenceStrengthAssessmentRecordSchema);
  assert.ok(topicSelectionEvidenceMapContracts.topicSelectionNeedValidationEvidenceBundleSchema);
  assert.ok(researchLifecycleContracts.topicSelectionEvidenceMapRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionEvidenceStrengthAssessmentRecordSchema);
});

test('topic-selection need-validation schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionNeedCandidateRecordSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionNeedCandidateReadinessAssessmentRecordSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionValidationDecisionSupportPacketRecordSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionValidateNeedAdjudicationResultRecordSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionValidatedNeedRecordSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionCandidateDecisionMemorySuggestionRecordSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionV1aToV1bInputBundleRecordSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionGenerateNeedCandidateNodeInputSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionRankedCandidateDraftBatchSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionRankedCandidateDraftBatchMinimumValidationReportSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionCandidateDraftAdmissionReportSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionSupplementalRoundRoutingDecisionSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionPersistNeedCandidateBatchCommandSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionGenerateNeedCandidateNodeResultSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryContextCompressionSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryExplorationContextPayloadSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryArbiterContextPayloadSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryExplorerNotesSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryDeepCriticNotesSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryRoleLevelSummarySchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryDebateIssueFrameSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryDebateFinalSynthesisArtifactSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryContextPacketSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryCompiledContextPairSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionGenerateNeedCandidateArtifactSnapshotSchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionGenerateNeedCandidateArtifactRefEntrySchema);
  assert.ok(topicSelectionNeedValidationContracts.topicSelectionGenerateNeedCandidateArtifactRefBundleSchema);
  assert.deepEqual([...topicSelectionNeedValidationContracts.TOPIC_SELECTION_AGENT_EXECUTION_MODES], [
    'mocked_llm',
    'codex_assisted',
    'provider_llm',
  ]);
  assert.deepEqual([...topicSelectionNeedValidationContracts.TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_ARTIFACT_KEYS], [
    'exploration_context_packet',
    'arbiter_context_packet',
    'debate_role_output',
    'debate_role_level_summary',
    'debate_issue_frame',
    'debate_final_synthesis',
    'context_compression_report',
    'ranked_candidate_draft_batch',
    'minimum_schema_validation_report',
    'candidate_draft_admission_report',
    'supplemental_round_routing_decision',
    'persist_need_candidate_batch_command',
    'discovery_audit',
  ]);
  assert.deepEqual([...topicSelectionNeedValidationContracts.TOPIC_SELECTION_CANDIDATE_MEMORY_SUGGESTION_STATUSES], [
    'suggested',
  ]);
  assert.ok(researchLifecycleContracts.topicSelectionNeedCandidateRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionV1aToV1bInputBundleRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionGenerateNeedCandidateNodeResultSchema);
  assert.ok(researchLifecycleContracts.topicSelectionNeedDiscoveryContextPacketSchema);
  assert.ok(researchLifecycleContracts.topicSelectionGenerateNeedCandidateArtifactSnapshotSchema);
});

test('topic-selection agent invocation schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionAgentInvocationContracts.topicSelectionAgentInvocationProvenanceSchema);
  assert.ok(topicSelectionAgentInvocationContracts.topicSelectionAgentInvocationAuditSnapshotSchema);
  assert.deepEqual([...topicSelectionAgentInvocationContracts.TOPIC_SELECTION_AGENT_EXECUTOR_KINDS], [
    'single_agent',
    'multi_agent_debate',
    'codex_assisted',
  ]);
  assert.deepEqual([...topicSelectionAgentInvocationContracts.TOPIC_SELECTION_AGENT_OUTPUT_SOURCE_KINDS], [
    'mock_fixture',
    'codex_response',
    'provider_response',
  ]);
  assert.ok(researchLifecycleContracts.topicSelectionAgentInvocationProvenanceSchema);
  assert.ok(researchLifecycleContracts.topicSelectionAgentInvocationAuditSnapshotSchema);
});

test('topic-selection debate scenario schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionDebateScenarioContracts.topicSelectionDebateScenarioContractSchema);
  assert.ok(topicSelectionDebateScenarioContracts.topicSelectionDebateRoleStageSlotSchema);
  assert.equal(
    topicSelectionDebateScenarioContracts.createTopicSelectionV1aGenerateNeedCandidateDebateScenarioContract()
      .scenario_id,
    'topic-selection.debate.v1a-need-discovery.v1',
  );
  assert.ok(researchLifecycleContracts.topicSelectionDebateScenarioContractSchema);
});

test('topic-selection generate-need-candidate contracts validate v1a-only node payloads', async () => {
  const app = Fastify();
  app.post(
    '/input',
    { schema: { body: topicSelectionNeedValidationContracts.topicSelectionGenerateNeedCandidateNodeInputSchema } },
    async () => ({ ok: true }),
  );
  app.post(
    '/batch',
    { schema: { body: topicSelectionNeedValidationContracts.topicSelectionRankedCandidateDraftBatchSchema } },
    async () => ({ ok: true }),
  );
  app.post(
    '/minimum-validation',
    {
      schema: {
        body: topicSelectionNeedValidationContracts.topicSelectionRankedCandidateDraftBatchMinimumValidationReportSchema,
      },
    },
    async () => ({ ok: true }),
  );
  app.post(
    '/admission',
    { schema: { body: topicSelectionNeedValidationContracts.topicSelectionCandidateDraftAdmissionReportSchema } },
    async () => ({ ok: true }),
  );
  app.post(
    '/supplemental',
    { schema: { body: topicSelectionNeedValidationContracts.topicSelectionSupplementalRoundRoutingDecisionSchema } },
    async () => ({ ok: true }),
  );
  app.post(
    '/persist',
    { schema: { body: topicSelectionNeedValidationContracts.topicSelectionPersistNeedCandidateBatchCommandSchema } },
    async () => ({ ok: true }),
  );
  app.post(
    '/result',
    { schema: { body: topicSelectionNeedValidationContracts.topicSelectionGenerateNeedCandidateNodeResultSchema } },
    async () => ({ ok: true }),
  );
  app.post(
    '/context-packet',
    { schema: { body: topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryContextPacketSchema } },
    async () => ({ ok: true }),
  );
  app.post(
    '/context-pair',
    { schema: { body: topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryCompiledContextPairSchema } },
    async () => ({ ok: true }),
  );
  app.post(
    '/artifact',
    {
      schema: {
        body: topicSelectionNeedValidationContracts.topicSelectionGenerateNeedCandidateArtifactSnapshotSchema,
      },
    },
    async () => ({ ok: true }),
  );
  app.post(
    '/artifact-bundle',
    {
      schema: {
        body: topicSelectionNeedValidationContracts.topicSelectionGenerateNeedCandidateArtifactRefBundleSchema,
      },
    },
    async () => ({ ok: true }),
  );
  app.post(
    '/debate-explorer-notes',
    { schema: { body: topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryExplorerNotesSchema } },
    async () => ({ ok: true }),
  );
  app.post(
    '/debate-deep-critic-notes',
    { schema: { body: topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryDeepCriticNotesSchema } },
    async () => ({ ok: true }),
  );
  app.post(
    '/debate-role-level-summary',
    { schema: { body: topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryRoleLevelSummarySchema } },
    async () => ({ ok: true }),
  );
  app.post(
    '/debate-issue-frame',
    { schema: { body: topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryDebateIssueFrameSchema } },
    async () => ({ ok: true }),
  );
  app.post(
    '/debate-final-synthesis',
    {
      schema: {
        body: topicSelectionNeedValidationContracts.topicSelectionNeedDiscoveryDebateFinalSynthesisArtifactSchema,
      },
    },
    async () => ({ ok: true }),
  );
  await app.ready();

  const ref = functionalRefForSchema;
  const evidenceRoleBundle = {
    support_unit_refs: [ref('evidence_unit', 'support_001')],
    challenge_unit_refs: [ref('evidence_unit', 'challenge_001')],
    baseline_unit_refs: [],
    context_unit_refs: [],
  };
  const draft = {
    draft_id: 'draft_001',
    rank: 1,
    candidate_need: 'Need a robust way to evaluate retrieval-augmented fine-tuning risk.',
    unmet_need_statement: 'Existing studies do not isolate retrieval risk during fine-tuning.',
    mechanism_type: 'evaluation_gap',
    mechanism_summary: 'Risk-aware evaluation gap.',
    mechanism_payload: { axis: 'retrieval-risk' },
    scope_notes: 'CS literature workflow only.',
    non_goal_notes: null,
    prior_art_status: 'partial_solution_known',
    evidence_role_bundle: evidenceRoleBundle,
    conflict_refs: [ref('evidence_conflict', 'conflict_001')],
    strength_assessment_refs: [ref('evidence_strength_assessment', 'strength_001')],
    accepted_risk_refs: [],
    gap_codes: ['risk_evaluation_gap'],
    speculative: false,
    confidence: 0.78,
  };

  const inputRes = await app.inject({
    method: 'POST',
    url: '/input',
    payload: {
      schema_version: 'v1',
      workflow_run_id: 'workflow_run_001',
      node_attempt_id: 'node_attempt_001',
      topic_scope_ref: ref('topic_scope', 'topic_scope_001'),
      evidence_map_ref: ref('evidence_map', 'evidence_map_001'),
      evidence_strength_ref: ref('evidence_strength_assessment', 'strength_001'),
      resource_sample_set_ref: ref('resource_sample_set', 'sample_set_001'),
      candidate_pool_projection_ref: null,
      search_snapshot_refs: [ref('search_run', 'search_run_001')],
      resource_snapshot_refs: [ref('literature_snapshot', 'snapshot_001')],
      exploration_context_ref: ref('artifact_ref', 'exploration_context_001'),
      arbiter_context_ref: ref('artifact_ref', 'arbiter_context_001'),
      execution_mode: 'mocked_llm',
      profile_id: 'topic-selection.generate-need-candidate.single-agent.v1',
      policy_version: 'v1',
      operator_reuse_approval_ref: null,
    },
  });

  const batchRes = await app.inject({
    method: 'POST',
    url: '/batch',
    payload: {
      schema_version: 'v1',
      draft_batch: {
        batch_id: 'draft_batch_001',
        node_attempt_id: 'node_attempt_001',
        terminal_result: 'finalize',
        ranking_rationale: 'Draft is grounded and has both support and challenge evidence.',
        max_persisted_candidates: 5,
      },
      drafts: [draft],
      rejected_framings: [
        {
          framing_id: 'rejected_001',
          reason_code: 'pseudo_gap',
          summary: 'Rejected because it was a generic benchmark complaint.',
          source_draft_id: null,
          refs: [],
        },
      ],
      unresolved_points: [],
    },
  });
  const minimumValidationRes = await app.inject({
    method: 'POST',
    url: '/minimum-validation',
    payload: {
      schema_version: 'v1',
      batch_id: 'draft_batch_001',
      node_attempt_id: 'node_attempt_001',
      valid: true,
      terminal_result: 'finalize',
      batch_payload_hash: 'sha256:ranked-batch',
      draft_count: 1,
      max_persisted_candidates: 5,
      checked_at: '2026-05-19T00:00:00.000Z',
      issue_count: 0,
      blocking_issue_count: 0,
      warning_issue_count: 0,
      blocking_reason_codes: [],
      warning_codes: [],
      issues: [],
    },
  });
  const invalidMinimumValidationRes = await app.inject({
    method: 'POST',
    url: '/minimum-validation',
    payload: {
      schema_version: 'v1',
      batch_id: 'draft_batch_001',
      node_attempt_id: 'node_attempt_001',
      valid: false,
      terminal_result: 'finalize',
      batch_payload_hash: 'sha256:ranked-batch',
      draft_count: 0,
      max_persisted_candidates: 5,
      checked_at: '2026-05-19T00:00:00.000Z',
      issue_count: 1,
      blocking_issue_count: 1,
      warning_issue_count: 0,
      blocking_reason_codes: ['INVALID_RANKED_CANDIDATE_DRAFT_BATCH'],
      warning_codes: [],
      issues: [
        {
          issue_code: 'FINALIZE_WITHOUT_DRAFTS',
          severity: 'debug',
          message: 'finalize requires at least one grounded draft.',
          draft_id: null,
          field_path: 'drafts',
          refs: [],
        },
      ],
      raw_debate_transcript: 'not allowed',
    },
  });

  const admissionRes = await app.inject({
    method: 'POST',
    url: '/admission',
    payload: {
      schema_version: 'v1',
      batch_id: 'draft_batch_001',
      node_attempt_id: 'node_attempt_001',
      terminal_result: 'finalize',
      draft_results: [
        {
          draft_id: 'draft_001',
          rank: 1,
          decision: 'admit',
          reason_codes: ['grounded'],
          blocking_reason_codes: [],
          resolved_ref_counts: {
            support: 1,
            challenge: 1,
            baseline: 0,
            context: 0,
          },
          normalized_candidate_key: 'risk-aware-retrieval-finetuning-eval',
          duplicate_candidate_refs: [],
          required_human_review_points: [],
          supplemental_questions: [],
          admitted_draft_ref: ref('candidate_draft', 'draft_001'),
          merge_target_ref: null,
        },
      ],
      valid_draft_count: 1,
      rejected_draft_count: 0,
      merge_hint_count: 0,
      blocking_reason_codes: [],
    },
  });

  const supplementalRes = await app.inject({
    method: 'POST',
    url: '/supplemental',
    payload: {
      schema_version: 'v1',
      batch_id: 'draft_batch_001',
      node_attempt_id: 'node_attempt_001',
      current_round_index: 1,
      remaining_round_budget: 2,
      routing_decision: 'finalize_with_admitted_batch',
      source_draft_ids: ['draft_001'],
      trigger_reason_codes: [],
      supplemental_questions: [],
      allowed_roles: [],
      forbidden_actions: ['broad_re_exploration'],
      stop_condition: 'admitted_batch_ready',
    },
  });

  const persistRes = await app.inject({
    method: 'POST',
    url: '/persist',
    payload: {
      schema_version: 'v1',
      node_attempt_id: 'node_attempt_001',
      workflow_run_id: 'workflow_run_001',
      topic_scope_ref: ref('topic_scope', 'topic_scope_001'),
      evidence_map_ref: ref('evidence_map', 'evidence_map_001'),
      resource_sample_set_ref: ref('resource_sample_set', 'sample_set_001'),
      ranked_candidate_draft_batch_artifact_ref: ref('artifact_ref', 'ranked_batch_001'),
      admission_report_artifact_ref: ref('artifact_ref', 'admission_report_001'),
      supplemental_routing_artifact_refs: [ref('artifact_ref', 'supplemental_routing_001')],
      admitted_drafts: [
        {
          ...draft,
          normalized_candidate_key: 'risk-aware-retrieval-finetuning-eval',
          source_admission_decision_ref: ref('candidate_draft_admission', 'draft_001'),
        },
      ],
      idempotency_key: 'workflow_run_001:node_attempt_001:draft_001',
    },
  });

  const resultPayload = {
    schema_version: 'v1',
    workflow_run_id: 'workflow_run_001',
    node_attempt_id: 'node_attempt_001',
    status: 'succeeded',
    terminal_result: 'finalize',
    persisted_candidate_refs: [ref('need_candidate', 'need_candidate_001')],
    candidate_pool_projection_ref: ref('candidate_pool_projection', 'projection_001'),
    candidate_pool_projection_hash: 'hash_001',
    artifact_refs: {
      ranked_candidate_draft_batch: ref('artifact_ref', 'ranked_batch_001'),
      minimum_schema_validation_report: ref('artifact_ref', 'schema_validation_001'),
      candidate_draft_admission_report: ref('artifact_ref', 'admission_report_001'),
      supplemental_round_routing_decisions: [ref('artifact_ref', 'supplemental_routing_001')],
      persist_need_candidate_batch_command: ref('artifact_ref', 'persist_command_001'),
      discovery_audit: ref('artifact_ref', 'discovery_audit_001'),
    },
    warning_codes: [],
    error_code: null,
  };

  const resultRes = await app.inject({
    method: 'POST',
    url: '/result',
    payload: resultPayload,
  });
  const invalidErrorCodeRes = await app.inject({
    method: 'POST',
    url: '/result',
    payload: {
      ...resultPayload,
      error_code: 'TOPIC_QUESTION_CONTRACT_REQUIRED',
    },
  });
  const badModeRes = await app.inject({
    method: 'POST',
    url: '/input',
    payload: {
      schema_version: 'v1',
      workflow_run_id: 'workflow_run_001',
      node_attempt_id: 'node_attempt_001',
      topic_scope_ref: ref('topic_scope', 'topic_scope_001'),
      evidence_map_ref: ref('evidence_map', 'evidence_map_001'),
      evidence_strength_ref: ref('evidence_strength_assessment', 'strength_001'),
      search_snapshot_refs: [],
      resource_snapshot_refs: [],
      exploration_context_ref: ref('artifact_ref', 'exploration_context_001'),
      arbiter_context_ref: ref('artifact_ref', 'arbiter_context_001'),
      execution_mode: 'cached_provider_response',
      profile_id: 'topic-selection.generate-need-candidate.single-agent.v1',
      policy_version: 'v1',
    },
  });
  const badContextRefRes = await app.inject({
    method: 'POST',
    url: '/input',
    payload: {
      schema_version: 'v1',
      workflow_run_id: 'workflow_run_001',
      node_attempt_id: 'node_attempt_001',
      topic_scope_ref: ref('topic_scope', 'topic_scope_001'),
      evidence_map_ref: ref('evidence_map', 'evidence_map_001'),
      evidence_strength_ref: ref('evidence_strength_assessment', 'strength_001'),
      search_snapshot_refs: [],
      resource_snapshot_refs: [],
      exploration_context_ref: ref('context_packet', 'exploration_context_001'),
      arbiter_context_ref: ref('artifact_ref', 'arbiter_context_001'),
      execution_mode: 'mocked_llm',
      profile_id: 'topic-selection.generate-need-candidate.single-agent.v1',
      policy_version: 'v1',
    },
  });
  const artifactSnapshot = {
    schema_version: 'v1',
    node_id: 'topic-selection.v1a.generate-need-candidate.v1',
    workflow_run_id: 'workflow_run_001',
    node_attempt_id: 'node_attempt_001',
    artifact_key: 'ranked_candidate_draft_batch',
    payload_schema: 'RankedCandidateDraftBatch@v1',
    redaction_policy: 'topic_selection_generate_need_candidate_artifact_redaction_v1',
    redacted: true,
    redacted_paths: ['payload.hidden_reasoning'],
    source_refs: [ref('evidence_map', 'evidence_map_001')],
    payload_hash: 'sha256:redacted-payload',
    payload: {
      draft_count: 1,
      hidden_reasoning: '[REDACTED]',
    },
  };
  const artifactRes = await app.inject({
    method: 'POST',
    url: '/artifact',
    payload: artifactSnapshot,
  });
  const invalidArtifactKeyRes = await app.inject({
    method: 'POST',
    url: '/artifact',
    payload: {
      ...artifactSnapshot,
      artifact_key: 'topic_question_contract',
    },
  });
  const explorationContextPacket = {
    schema_version: 'v1',
    node_id: 'topic-selection.v1a.generate-need-candidate.v1',
    workflow_run_id: 'workflow_run_001',
    node_attempt_id: 'node_attempt_001',
    context_family: 'exploration_context',
    input_refs: [ref('evidence_map', 'evidence_map_001')],
    input_refs_hash: 'sha256:input-refs',
    context_compiler_version: 'topic-selection-need-discovery-context-compiler-v1',
    policy_version: 'v1',
    output_schema_version: 'v1',
    profile_id: 'topic-selection.generate-need-candidate.single-agent.v1',
    execution_mode: 'mocked_llm',
    cache_key: 'sha256:exploration-cache-key',
    cache_hit: false,
    redaction_policy: 'topic_selection_need_discovery_context_redaction_v1',
    created_at: '2026-05-19T00:00:00.000Z',
    memory_digest_hash: 'sha256:memory',
    candidate_pool_hash: 'sha256:candidate-pool',
    payload_hash: 'sha256:exploration-payload',
    compression: {
      compression_version: 'topic-selection-need-discovery-context-compression-v1',
      layer_keys: ['evidence_resource_digest', 'candidate_memory_digest'],
      source_token_estimate: null,
      compressed_token_estimate: null,
    },
    payload: {
      topic_scope: { title_card_id: 'title_card_001' },
      evidence_signal_digest: { support_count: 2 },
      resource_sample_digest: { sample_set_id: 'sample_set_001' },
      search_coverage_digest: { coverage: 'partial' },
      sibling_candidate_digest: { candidate_count: 0 },
      decision_memory_digest: { warnings: [] },
      exploration_prompts: ['Find grounded need candidates.'],
      challenge_prompts: ['Identify pseudo-gaps.'],
      allowed_outputs: ['ranked_candidate_draft_batch'],
      forbidden_outputs: ['need_candidate_authority_write'],
    },
  };
  const arbiterContextPacket = {
    ...explorationContextPacket,
    context_family: 'arbiter_context',
    cache_key: 'sha256:arbiter-cache-key',
    payload_hash: 'sha256:arbiter-payload',
    payload: {
      node_policy_ref: ref('node_policy', 'generate_need_candidate_v1'),
      output_schema_ref: ref('schema', 'ranked_candidate_draft_batch_v1'),
      authority_boundary: { writes: ['NeedCandidate'], forbidden: ['ValidatedNeed'] },
      max_persisted_candidates: 5,
      deterministic_gate_checklist: ['schema_validation', 'admission_gates'],
      role_level_summaries: [{ role: 'explorer', summary_ref: 'artifact_ref_001' }],
      candidate_pool_digest: { candidate_count: 0 },
      evidence_ref_table: [{ evidence_ref: ref('evidence_unit', 'support_001') }],
      rejected_framing_table: [],
      unresolved_points: [],
      batch_ranking_rules: ['rank grounded drafts first'],
      persistence_rules: ['persist admitted drafts only'],
      failure_rules: ['block when no admitted drafts'],
    },
  };
  const explorationContextRes = await app.inject({
    method: 'POST',
    url: '/context-packet',
    payload: explorationContextPacket,
  });
  const arbiterContextRes = await app.inject({
    method: 'POST',
    url: '/context-packet',
    payload: arbiterContextPacket,
  });
  const malformedContextRes = await app.inject({
    method: 'POST',
    url: '/context-packet',
    payload: {
      ...explorationContextPacket,
      context_family: 'arbiter_context',
    },
  });
  const contextPairRes = await app.inject({
    method: 'POST',
    url: '/context-pair',
    payload: {
      schema_version: 'v1',
      node_id: 'topic-selection.v1a.generate-need-candidate.v1',
      workflow_run_id: 'workflow_run_001',
      node_attempt_id: 'node_attempt_001',
      exploration_context_ref: ref('artifact_ref', 'exploration_context_001'),
      arbiter_context_ref: ref('artifact_ref', 'arbiter_context_001'),
      exploration_context_hash: 'sha256:exploration',
      arbiter_context_hash: 'sha256:arbiter',
      exploration_cache_key: 'sha256:exploration-cache',
      arbiter_cache_key: 'sha256:arbiter-cache',
      artifact_refs: [
        {
          artifact_key: 'exploration_context_packet',
          artifact_ref: ref('artifact_ref', 'exploration_context_001'),
          artifact_hash: 'sha256:artifact',
          payload_hash: 'sha256:exploration-payload',
          payload_schema: 'TopicSelectionNeedDiscoveryContextPacket@v1',
          redacted_paths: [],
        },
      ],
    },
  });
  const artifactBundleRes = await app.inject({
    method: 'POST',
    url: '/artifact-bundle',
    payload: {
      schema_version: 'v1',
      node_id: 'topic-selection.v1a.generate-need-candidate.v1',
      workflow_run_id: 'workflow_run_001',
      node_attempt_id: 'node_attempt_001',
      artifact_refs: [
        {
          artifact_key: 'ranked_candidate_draft_batch',
          artifact_ref: ref('artifact_ref', 'artifact_ref_001'),
          artifact_hash: 'sha256:artifact',
          payload_hash: 'sha256:redacted-payload',
          payload_schema: 'RankedCandidateDraftBatch@v1',
          redacted_paths: ['payload.hidden_reasoning'],
        },
      ],
    },
  });
  const debateExplorerNotesRes = await app.inject({
    method: 'POST',
    url: '/debate-explorer-notes',
    payload: {
      schema_version: 'v1',
      debate_loop_id: 'debate_loop_001',
      round_index: 1,
      role: 'explorer',
      stage: 'round_1_discovery',
      agent_instance_id: 'explorer_1',
      candidate_angles: [
        {
          angle_id: 'angle_001',
          summary: 'Evaluate retrieval-risk effects during fine-tuning.',
          candidate_need_hint: 'Need risk-aware RAG fine-tuning evaluation.',
          evidence_refs: [ref('evidence_unit', 'support_001')],
        },
      ],
      evidence_refs: [ref('evidence_unit', 'support_001')],
      unresolved_questions: ['Which risk survives fine-tuning?'],
      warnings: [],
    },
  });
  const debateDeepCriticNotesRes = await app.inject({
    method: 'POST',
    url: '/debate-deep-critic-notes',
    payload: {
      schema_version: 'v1',
      debate_loop_id: 'debate_loop_001',
      round_index: 1,
      role: 'deep_critic',
      stage: 'round_1_discovery',
      agent_instance_id: 'deep_critic_1',
      critique_points: [
        {
          critique_id: 'critique_001',
          summary: 'Pseudo-gap risk unless challenge evidence is retained.',
          severity: 'high',
          evidence_refs: [ref('evidence_unit', 'challenge_001')],
        },
      ],
      failure_modes: ['overstated novelty'],
      missing_evidence_questions: ['Which benchmark baseline exists?'],
      evidence_refs: [ref('evidence_unit', 'challenge_001')],
      warnings: ['baseline coverage is thin'],
    },
  });
  const debateRoleSummaryRes = await app.inject({
    method: 'POST',
    url: '/debate-role-level-summary',
    payload: {
      schema_version: 'v1',
      debate_loop_id: 'debate_loop_001',
      round_index: 1,
      role: 'explorer',
      source_invocation_attempt_ids: ['node_attempt_001.debate_loop_001.explorer.round_1_discovery.explorer_1'],
      source_artifact_refs: [ref('artifact_ref', 'debate_role_output_001')],
      summary: 'Explorer surfaced one grounded candidate angle.',
      candidate_need_signals: ['Need risk-aware RAG fine-tuning evaluation.'],
      risk_signals: [],
      evidence_refs: [ref('evidence_unit', 'support_001')],
      unresolved_questions: ['Which risk survives fine-tuning?'],
    },
  });
  const debateIssueFrameRes = await app.inject({
    method: 'POST',
    url: '/debate-issue-frame',
    payload: {
      schema_version: 'v1',
      debate_loop_id: 'debate_loop_001',
      round_index: 1,
      role: 'arbiter',
      stage: 'issue_framing',
      frame_id: 'issue_frame_001',
      focused_questions: ['Can the final candidate retain challenge evidence?'],
      requested_roles: ['explorer', 'deep_critic'],
      source_role_summary_refs: [ref('artifact_ref', 'debate_role_summary_001')],
      stop_condition: null,
    },
  });
  const invalidDebateIssueFrameRes = await app.inject({
    method: 'POST',
    url: '/debate-issue-frame',
    payload: {
      schema_version: 'v1',
      debate_loop_id: 'debate_loop_001',
      round_index: 1,
      role: 'arbiter',
      stage: 'issue_framing',
      frame_id: 'issue_frame_001',
      focused_questions: ['Can the final candidate retain challenge evidence?'],
      requested_roles: ['grounding_auditor'],
      source_role_summary_refs: [ref('artifact_ref', 'debate_role_summary_001')],
    },
  });
  const debateFinalSynthesisRes = await app.inject({
    method: 'POST',
    url: '/debate-final-synthesis',
    payload: {
      schema_version: 'v1',
      debate_loop_id: 'debate_loop_001',
      round_index: 1,
      role: 'arbiter',
      stage: 'final_synthesis',
      final_invocation_attempt_id: 'node_attempt_001.debate_loop_001.arbiter.final_synthesis.arbiter_final',
      final_invocation_audit_ref: ref('artifact_ref', 'agent_audit_001'),
      issue_frame_ref: ref('artifact_ref', 'debate_issue_frame_001'),
      role_level_summary_refs: [ref('artifact_ref', 'debate_role_summary_001')],
      ranked_candidate_draft_batch_hash: 'sha256:ranked-batch',
      terminal_result: 'finalize',
      draft_count: 1,
      rejected_framing_count: 0,
      unresolved_point_count: 0,
    },
  });

  await app.close();
  assert.equal(inputRes.statusCode, 200);
  assert.equal(batchRes.statusCode, 200);
  assert.equal(minimumValidationRes.statusCode, 200);
  assert.equal(invalidMinimumValidationRes.statusCode, 400);
  assert.equal(admissionRes.statusCode, 200);
  assert.equal(supplementalRes.statusCode, 200);
  assert.equal(persistRes.statusCode, 200);
  assert.equal(resultRes.statusCode, 200);
  assert.equal(invalidErrorCodeRes.statusCode, 400);
  assert.equal(badModeRes.statusCode, 400);
  assert.equal(badContextRefRes.statusCode, 400);
  assert.equal(artifactRes.statusCode, 200);
  assert.equal(invalidArtifactKeyRes.statusCode, 400);
  assert.equal(debateExplorerNotesRes.statusCode, 200);
  assert.equal(debateDeepCriticNotesRes.statusCode, 200);
  assert.equal(debateRoleSummaryRes.statusCode, 200);
  assert.equal(debateIssueFrameRes.statusCode, 200);
  assert.equal(invalidDebateIssueFrameRes.statusCode, 400);
  assert.equal(debateFinalSynthesisRes.statusCode, 200);
  assert.equal(explorationContextRes.statusCode, 200);
  assert.equal(arbiterContextRes.statusCode, 200);
  assert.equal(malformedContextRes.statusCode, 400);
  assert.equal(contextPairRes.statusCode, 200);
  assert.equal(artifactBundleRes.statusCode, 200);
  const resultProperties =
    topicSelectionNeedValidationContracts.topicSelectionGenerateNeedCandidateNodeResultSchema.properties;
  const persistProperties =
    topicSelectionNeedValidationContracts.topicSelectionPersistNeedCandidateBatchCommandSchema.properties;
  assert.equal(Object.hasOwn(resultProperties, 'topic_question_contract_ref'), false);
  assert.equal(Object.hasOwn(resultProperties, 'raw_debate_transcript'), false);
  assert.equal(Object.hasOwn(persistProperties, 'topic_question_contract_ref'), false);
});

test('topic-selection recheck/risk/memory schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionRecheckRiskMemoryContracts.topicSelectionRecheckEventRecordSchema);
  assert.ok(topicSelectionRecheckRiskMemoryContracts.topicSelectionRecheckImpactRecordSchema);
  assert.ok(topicSelectionRecheckRiskMemoryContracts.topicSelectionRecheckResolutionRecordSchema);
  assert.ok(topicSelectionRecheckRiskMemoryContracts.topicSelectionAcceptedRiskRecordSchema);
  assert.ok(topicSelectionRecheckRiskMemoryContracts.topicSelectionHumanOverrideRecordSchema);
  assert.ok(topicSelectionRecheckRiskMemoryContracts.topicSelectionBlockerPolicyRecordSchema);
  assert.ok(topicSelectionRecheckRiskMemoryContracts.topicSelectionDecisionMemoryEntryRecordSchema);
  assert.ok(topicSelectionRecheckRiskMemoryContracts.topicSelectionCandidateDecisionMemoryRecordSchema);
  assert.ok(topicSelectionRecheckRiskMemoryContracts.topicSelectionDecisionWorkQueueItemRecordSchema);
  assert.deepEqual(topicSelectionRecheckRiskMemoryContracts.TOPIC_SELECTION_IMPACT_LEVELS, [
    'no_impact',
    'stale',
    'recheck_required',
    'invalidated',
  ]);
  assert.ok(researchLifecycleContracts.topicSelectionDecisionWorkQueueItemRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionAcceptedRiskRecordSchema);
});

test('topic-selection offline-evaluation/replay schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionOfflineEvaluationReplayContracts.topicSelectionOfflineEvaluationDatasetRecordSchema);
  assert.ok(topicSelectionOfflineEvaluationReplayContracts.topicSelectionOfflineEvaluationCaseRecordSchema);
  assert.ok(topicSelectionOfflineEvaluationReplayContracts.topicSelectionOfflineEvaluationRunRecordSchema);
  assert.ok(topicSelectionOfflineEvaluationReplayContracts.topicSelectionOfflineEvaluationCaseResultRecordSchema);
  assert.ok(topicSelectionOfflineEvaluationReplayContracts.topicSelectionOfflineEvaluationMetricResultRecordSchema);
  assert.ok(topicSelectionOfflineEvaluationReplayContracts.topicSelectionReplayDiffRecordSchema);
  assert.ok(topicSelectionOfflineEvaluationReplayContracts.topicSelectionOfflineEvaluationObservedSnapshotSchema);
  assert.deepEqual(topicSelectionOfflineEvaluationReplayContracts.TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_CASE_TYPES, [
    'true_unmet_need',
    'pseudo_gap',
    'strong_baseline_solved',
    'author_future_work_misleading',
    'abstract_overclaim_body_unsupported',
    'terminology_shift_same_task',
    'same_team_duplicate_claim',
    'source_health_or_missing_fulltext',
    'downstream_failure_feedback',
  ]);
  assert.deepEqual(topicSelectionOfflineEvaluationReplayContracts.TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_CASE_TYPES, [
    'slice_boundary_drift',
    'answerability_false_pass',
    'value_overclaim',
    'package_trace_gap',
    'package_readiness_false_pass',
    'downstream_loopback_feedback',
  ]);
  assert.deepEqual(topicSelectionOfflineEvaluationReplayContracts.TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_CASE_TYPES, [
    'promotion_input_staleness_false_pass',
    'promotion_gate_blocker_false_pass',
    'human_promotion_bypass',
    'promotion_false_pass',
    'bridge_trace_gap',
    'commitment_profile_gap',
    'loopback_target_misroute',
    'downstream_mutation_attempt',
  ]);
  assert.deepEqual(topicSelectionOfflineEvaluationReplayContracts.TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_METRIC_KEYS, [
    'false_gap_rate',
    'baseline_miss_rate',
    'counter_evidence_recall',
    'trace_completeness',
    'readiness_false_pass_rate',
    'human_override_rate',
    'rerun_instability',
    'recheck_precision',
    'negative_memory_usefulness',
    'downstream_rework_cause',
  ]);
  assert.deepEqual(topicSelectionOfflineEvaluationReplayContracts.TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_METRIC_KEYS, [
    'slice_boundary_drift_rate',
    'answerability_false_pass_rate',
    'value_overclaim_rate',
    'package_trace_completeness',
    'package_readiness_false_pass_rate',
    'downstream_loopback_cause_distribution',
  ]);
  assert.deepEqual(topicSelectionOfflineEvaluationReplayContracts.TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_METRIC_KEYS, [
    'promotion_input_staleness_false_pass_rate',
    'promotion_gate_blocker_false_pass_rate',
    'human_promotion_bypass_rate',
    'promotion_false_pass_rate',
    'bridge_trace_completeness',
    'commitment_profile_completeness',
    'loopback_target_accuracy',
    'downstream_mutation_guard_rate',
  ]);
  assert.equal(topicSelectionOfflineEvaluationReplayContracts.TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_TYPES.includes('package_trace_gap'), true);
  assert.equal(topicSelectionOfflineEvaluationReplayContracts.TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_TYPES.includes('promotion_false_pass'), true);
  assert.equal(topicSelectionOfflineEvaluationReplayContracts.TOPIC_SELECTION_OFFLINE_EVALUATION_METRIC_KEYS.includes('package_trace_completeness'), true);
  assert.equal(topicSelectionOfflineEvaluationReplayContracts.TOPIC_SELECTION_OFFLINE_EVALUATION_METRIC_KEYS.includes('bridge_trace_completeness'), true);
  assert.equal(topicSelectionOfflineEvaluationReplayContracts.TOPIC_SELECTION_REPLAY_DIFF_DIMENSIONS.includes('package_readiness'), true);
  assert.equal(topicSelectionOfflineEvaluationReplayContracts.TOPIC_SELECTION_REPLAY_DIFF_DIMENSIONS.includes('downstream_feedback'), true);
  assert.ok(researchLifecycleContracts.topicSelectionOfflineEvaluationDatasetRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionReplayDiffRecordSchema);
});

test('topic-selection v1b intake schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionV1bIntakeContracts.topicSelectionV1bIntakeSnapshotRecordSchema);
  assert.ok(topicSelectionV1bIntakeContracts.topicSelectionResearchConstraintProfileRecordSchema);
  assert.ok(topicSelectionV1bIntakeContracts.topicSelectionV1bIntakeReadinessAssessmentRecordSchema);
  assert.ok(topicSelectionV1bIntakeContracts.topicSelectionV1bResearchSlicePlanningInputSchema);
  assert.deepEqual([...topicSelectionV1bIntakeContracts.TOPIC_SELECTION_V1B_INTAKE_READINESS_RECOMMENDATIONS], [
    'ready_for_slice',
    'blocked_by_recheck',
    'blocked_by_stale_trace',
    'needs_constraint_clarification',
    'park',
  ]);
  assert.ok(researchLifecycleContracts.topicSelectionV1bIntakeSnapshotRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionV1bResearchSlicePlanningInputSchema);
});

test('topic-selection v1b research-slice schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionV1bResearchSliceContracts.topicSelectionPlanResearchSliceRunRecordSchema);
  assert.ok(topicSelectionV1bResearchSliceContracts.topicSelectionResearchSliceOptionSetRecordSchema);
  assert.ok(topicSelectionV1bResearchSliceContracts.topicSelectionResearchSliceOptionRecordSchema);
  assert.ok(topicSelectionV1bResearchSliceContracts.topicSelectionSliceSelectionDecisionRecordSchema);
  assert.ok(topicSelectionV1bResearchSliceContracts.topicSelectionResearchSliceRecordSchema);
  assert.ok(topicSelectionV1bResearchSliceContracts.topicSelectionResearchSliceEvidenceRefRecordSchema);
  assert.ok(topicSelectionV1bResearchSliceContracts.topicSelectionResearchSliceBoundaryRecordSchema);
  assert.ok(topicSelectionV1bResearchSliceContracts.topicSelectionResearchSliceAssumptionRecordSchema);
  assert.ok(topicSelectionV1bResearchSliceContracts.topicSelectionV1bTopicQuestionFormationInputSchema);
  assert.ok(topicSelectionV1bResearchSliceContracts.topicSelectionResearchSliceOptionSetLlmOutputSchema);
  assert.deepEqual([...topicSelectionV1bResearchSliceContracts.TOPIC_SELECTION_SLICE_SELECTION_DECISIONS], [
    'select',
    'request_more_options',
    'park',
    'reject',
  ]);
  assert.ok(researchLifecycleContracts.topicSelectionPlanResearchSliceRunRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionV1bTopicQuestionFormationInputSchema);
});

test('topic-selection v1b topic-question schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionV1bTopicQuestionContracts.topicSelectionFormTopicQuestionRunRecordSchema);
  assert.ok(topicSelectionV1bTopicQuestionContracts.topicSelectionQuestionFrameRecordSchema);
  assert.ok(topicSelectionV1bTopicQuestionContracts.topicSelectionTopicQuestionCandidateSetRecordSchema);
  assert.ok(topicSelectionV1bTopicQuestionContracts.topicSelectionTopicQuestionCandidateRecordSchema);
  assert.ok(topicSelectionV1bTopicQuestionContracts.topicSelectionTopicQuestionSelectionDecisionRecordSchema);
  assert.ok(topicSelectionV1bTopicQuestionContracts.topicSelectionTopicQuestionRecordSchema);
  assert.ok(topicSelectionV1bTopicQuestionContracts.topicSelectionTopicQuestionContractRecordSchema);
  assert.ok(topicSelectionV1bTopicQuestionContracts.topicSelectionTopicQuestionAnswerabilityPlanRecordSchema);
  assert.ok(topicSelectionV1bTopicQuestionContracts.topicSelectionTopicQuestionNeedRefRecordSchema);
  assert.ok(topicSelectionV1bTopicQuestionContracts.topicSelectionTopicQuestionEvidenceRefRecordSchema);
  assert.ok(topicSelectionV1bTopicQuestionContracts.topicSelectionTopicQuestionBoundaryRefRecordSchema);
  assert.ok(topicSelectionV1bTopicQuestionContracts.topicSelectionTopicQuestionAssumptionRefRecordSchema);
  assert.ok(topicSelectionV1bTopicQuestionContracts.topicSelectionTopicQuestionFalsificationConditionRecordSchema);
  assert.ok(topicSelectionV1bTopicQuestionContracts.topicSelectionV1bValueAssessmentInputSchema);
  assert.ok(topicSelectionV1bTopicQuestionContracts.topicSelectionFormTopicQuestionLlmOutputSchema);
  assert.deepEqual([...topicSelectionV1bTopicQuestionContracts.TOPIC_SELECTION_TOPIC_QUESTION_SELECTION_DECISIONS], [
    'admit',
    'admit_multiple',
    'merge_then_admit',
    'park',
    'reject_all',
    'no_admissible_candidate',
  ]);
  assert.ok(researchLifecycleContracts.topicSelectionFormTopicQuestionRunRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionV1bValueAssessmentInputSchema);
});

test('topic-selection v1b value-assessment schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionV1bValueAssessmentContracts.topicSelectionAssessTopicValueRunRecordSchema);
  assert.ok(topicSelectionV1bValueAssessmentContracts.topicSelectionTopicValueAssessmentInputSnapshotRecordSchema);
  assert.ok(topicSelectionV1bValueAssessmentContracts.topicSelectionTopicValueAssessmentRecordSchema);
  assert.ok(topicSelectionV1bValueAssessmentContracts.topicSelectionTopicValueGateResultSchema);
  assert.ok(topicSelectionV1bValueAssessmentContracts.topicSelectionTopicValueDimensionScoreSchema);
  assert.ok(topicSelectionV1bValueAssessmentContracts.topicSelectionValueReasoningMemoRecordSchema);
  assert.ok(topicSelectionV1bValueAssessmentContracts.topicSelectionValueDispositionDecisionRecordSchema);
  assert.ok(topicSelectionV1bValueAssessmentContracts.topicSelectionV1bPackageDraftInputSchema);
  assert.ok(topicSelectionV1bValueAssessmentContracts.topicSelectionAssessTopicValueLlmOutputSchema);
  assert.deepEqual([...topicSelectionV1bValueAssessmentContracts.TOPIC_SELECTION_VALUE_DISPOSITIONS], [
    'advance_to_package',
    'refine_question',
    'refine_slice',
    'recheck_evidence_or_search',
    'park',
    'drop',
  ]);
  assert.deepEqual([...topicSelectionV1bValueAssessmentContracts.TOPIC_SELECTION_VALUE_DIMENSIONS], [
    'significance',
    'originality',
    'answerability',
    'feasibility',
    'claim_ceiling_fit',
    'reviewer_risk',
    'effort_to_value_fit',
    'strategic_fit',
    'negative_memory_check',
  ]);
  const assessmentSchemaProperties = topicSelectionV1bValueAssessmentContracts
    .topicSelectionAssessTopicValueLlmOutputSchema.properties as Record<string, { minItems?: number; maxItems?: number }>;
  assert.equal(
    assessmentSchemaProperties.hard_gates?.minItems,
    topicSelectionV1bValueAssessmentContracts.TOPIC_SELECTION_VALUE_GATE_KEYS.length,
  );
  assert.equal(
    assessmentSchemaProperties.hard_gates?.maxItems,
    topicSelectionV1bValueAssessmentContracts.TOPIC_SELECTION_VALUE_GATE_KEYS.length,
  );
  assert.equal(
    assessmentSchemaProperties.dimension_scores?.minItems,
    topicSelectionV1bValueAssessmentContracts.TOPIC_SELECTION_VALUE_DIMENSIONS.length,
  );
  assert.equal(
    assessmentSchemaProperties.dimension_scores?.maxItems,
    topicSelectionV1bValueAssessmentContracts.TOPIC_SELECTION_VALUE_DIMENSIONS.length,
  );
  assert.ok(researchLifecycleContracts.topicSelectionTopicValueAssessmentRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionV1bPackageDraftInputSchema);
});

test('topic-selection v1b topic-package schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionV1bTopicPackageContracts.topicSelectionTopicPackageRecordSchema);
  assert.ok(topicSelectionV1bTopicPackageContracts.topicSelectionPackageTraceBoundaryCheckRecordSchema);
  assert.ok(topicSelectionV1bTopicPackageContracts.topicSelectionTopicPackageReadinessAssessmentRecordSchema);
  assert.ok(topicSelectionV1bTopicPackageContracts.topicSelectionV1bToV1cInputBundleRecordSchema);
  assert.deepEqual([...topicSelectionV1bTopicPackageContracts.TOPIC_SELECTION_TOPIC_PACKAGE_READINESS_STATUSES], [
    'draft',
    'ready_for_promotion_review',
    'blocked',
    'needs_revision',
    'superseded',
  ]);
  assert.ok(researchLifecycleContracts.topicSelectionTopicPackageRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionV1bToV1cInputBundleRecordSchema);
});

test('topic-selection v1c promotion-input schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionV1cPromotionInputContracts.topicSelectionPromotionInputSnapshotCheckDetailSchema);
  assert.ok(topicSelectionV1cPromotionInputContracts.topicSelectionPromotionInputSnapshotRecordSchema);
  assert.ok(topicSelectionV1cPromotionInputContracts.topicSelectionPromotionInputSnapshotHandoffSchema);
  assert.deepEqual(
    [...topicSelectionV1cPromotionInputContracts.TOPIC_SELECTION_PROMOTION_INPUT_SNAPSHOT_CLOSURE_STATUSES],
    ['ready_for_gate', 'blocked', 'needs_upstream_refresh', 'superseded'],
  );
  assert.ok(researchLifecycleContracts.topicSelectionPromotionInputSnapshotRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionPromotionInputSnapshotHandoffSchema);
});

test('topic-selection v1c promotion-input schemas validate snapshot and handoff payloads', async () => {
  const app = Fastify();
  app.post(
    '/v',
    {
      schema: {
        body: topicSelectionV1cPromotionInputContracts.topicSelectionPromotionInputSnapshotRecordSchema,
      },
    },
    async () => ({ ok: true }),
  );
  app.post(
    '/handoff',
    {
      schema: {
        body: topicSelectionV1cPromotionInputContracts.topicSelectionPromotionInputSnapshotHandoffSchema,
      },
    },
    async () => ({ ok: true }),
  );
  await app.ready();
  const base = {
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    title_card_id: 'title_card_001',
    v1b_to_v1c_input_bundle_id: 'v1b_to_v1c_input_bundle_001',
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    closure_status: 'ready_for_gate',
    required_actions: [],
    blockers: [],
    warnings: [],
    check_details: [],
    bundle_hash: 'bundle_hash_001',
    package_snapshot_hash: 'package_hash_001',
    package_draft_input_snapshot_hash: 'draft_hash_001',
    promotion_input_snapshot_hash: 'promotion_hash_001',
    source_bundle_ref: functionalRefForSchema('v1b_to_v1c_input_bundle', 'v1b_to_v1c_input_bundle_001'),
    promotion_input_snapshot_ref: functionalRefForSchema('promotion_input_snapshot', 'promotion_input_snapshot_001'),
    topic_package_ref: functionalRefForSchema('topic_package', 'topic_package_001'),
    package_trace_boundary_check_ref: functionalRefForSchema(
      'package_trace_boundary_check',
      'package_trace_boundary_check_001',
    ),
    package_readiness_assessment_ref: functionalRefForSchema(
      'topic_package_readiness_assessment',
      'package_readiness_assessment_001',
    ),
    topic_value_assessment_ref: functionalRefForSchema('topic_value_assessment', 'topic_value_assessment_001'),
    value_reasoning_memo_ref: functionalRefForSchema('value_reasoning_memo', 'value_reasoning_memo_001'),
    value_disposition_decision_ref: functionalRefForSchema(
      'value_disposition_decision',
      'value_disposition_decision_001',
    ),
    topic_question_ref: functionalRefForSchema('topic_question', 'topic_question_001'),
    topic_question_contract_ref: functionalRefForSchema('topic_question_contract', 'topic_question_contract_001'),
    answerability_plan_ref: functionalRefForSchema('topic_question_answerability_plan', 'answerability_plan_001'),
    research_slice_ref: functionalRefForSchema('research_slice', 'research_slice_001'),
    validated_need_refs: [functionalRefForSchema('validated_need', 'validated_need_001')],
    evidence_refs: [topicQuestionEvidenceRefForSchema()],
    accepted_risk_refs: [],
    blocker_refs: [],
    memory_suggestion_refs: [],
    recheck_request_refs: [],
    readiness_check_refs: [
      functionalRefForSchema('package_trace_boundary_check', 'package_trace_boundary_check_001'),
      functionalRefForSchema('topic_package_readiness_assessment', 'package_readiness_assessment_001'),
    ],
    source_bundle_snapshot: {},
    package_snapshot: {},
    package_draft_input_snapshot: {},
    artifact_refs: [],
    created_by: 'system',
    created_at: '2026-05-15T00:00:00.000Z',
  };
  const valid = await app.inject({ method: 'POST', url: '/v', payload: base });
  const handoff = await app.inject({
    method: 'POST',
    url: '/handoff',
    payload: {
      promotion_input_snapshot_id: base.promotion_input_snapshot_id,
      promotion_input_snapshot_ref: base.promotion_input_snapshot_ref,
      v1b_to_v1c_input_bundle_id: base.v1b_to_v1c_input_bundle_id,
      topic_package_id: base.topic_package_id,
      package_version: base.package_version,
      closure_status: 'ready_for_gate',
      topic_package_ref: base.topic_package_ref,
      package_trace_boundary_check_ref: base.package_trace_boundary_check_ref,
      package_readiness_assessment_ref: base.package_readiness_assessment_ref,
      topic_value_assessment_ref: base.topic_value_assessment_ref,
      value_reasoning_memo_ref: base.value_reasoning_memo_ref,
      value_disposition_decision_ref: base.value_disposition_decision_ref,
      topic_question_ref: base.topic_question_ref,
      topic_question_contract_ref: base.topic_question_contract_ref,
      answerability_plan_ref: base.answerability_plan_ref,
      research_slice_ref: base.research_slice_ref,
      validated_need_refs: base.validated_need_refs,
      evidence_refs: base.evidence_refs,
      accepted_risk_refs: base.accepted_risk_refs,
      blocker_refs: base.blocker_refs,
      memory_suggestion_refs: base.memory_suggestion_refs,
      recheck_request_refs: base.recheck_request_refs,
      readiness_check_refs: base.readiness_check_refs,
      snapshot_hashes: {
        bundle_hash: base.bundle_hash,
        package_snapshot_hash: base.package_snapshot_hash,
        package_draft_input_snapshot_hash: base.package_draft_input_snapshot_hash,
        promotion_input_snapshot_hash: base.promotion_input_snapshot_hash,
      },
      snapshot: base,
    },
  });
  const invalid = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      ...base,
      readiness_check_refs: undefined,
    },
  });
  const invalidEvidence = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      ...base,
      evidence_refs: [{}],
    },
  });
  await app.close();

  assert.equal(valid.statusCode, 200);
  assert.equal(handoff.statusCode, 200);
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalidEvidence.statusCode, 400);
});

test('topic-selection v1c promotion-gate schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionV1cPromotionGateContracts.topicSelectionPromotionDecisionSupportRecordSchema);
  assert.ok(topicSelectionV1cPromotionGateContracts.topicSelectionPromotionDossierRecordSchema);
  assert.ok(topicSelectionV1cPromotionGateContracts.topicSelectionArgumentReadinessMiniCheckRecordSchema);
  assert.ok(topicSelectionV1cPromotionGateContracts.topicSelectionPromotionGateCheckRecordSchema);
  assert.ok(topicSelectionV1cPromotionGateContracts.topicSelectionPromotionGateHandoffSchema);
  assert.deepEqual(
    [...topicSelectionV1cPromotionGateContracts.TOPIC_SELECTION_PROMOTION_GATE_DISPOSITIONS],
    ['ready_for_human_decision', 'blocked', 'needs_revision', 'recheck_required', 'park'],
  );
  assert.ok(researchLifecycleContracts.topicSelectionPromotionDecisionSupportRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionPromotionGateHandoffSchema);
});

test('topic-selection v1c promotion-gate schemas validate support, dossier, mini-check, gate, and handoff payloads', async () => {
  const app = Fastify();
  app.post('/support', {
    schema: {
      body: topicSelectionV1cPromotionGateContracts.topicSelectionPromotionDecisionSupportRecordSchema,
    },
  }, async () => ({ ok: true }));
  app.post('/dossier', {
    schema: {
      body: topicSelectionV1cPromotionGateContracts.topicSelectionPromotionDossierRecordSchema,
    },
  }, async () => ({ ok: true }));
  app.post('/mini', {
    schema: {
      body: topicSelectionV1cPromotionGateContracts.topicSelectionArgumentReadinessMiniCheckRecordSchema,
    },
  }, async () => ({ ok: true }));
  app.post('/gate', {
    schema: {
      body: topicSelectionV1cPromotionGateContracts.topicSelectionPromotionGateCheckRecordSchema,
    },
  }, async () => ({ ok: true }));
  app.post('/handoff', {
    schema: {
      body: topicSelectionV1cPromotionGateContracts.topicSelectionPromotionGateHandoffSchema,
    },
  }, async () => ({ ok: true }));
  await app.ready();

  const now = '2026-05-15T00:00:00.000Z';
  const promotionInputSnapshotRef = functionalRefForSchema(
    'promotion_input_snapshot',
    'promotion_input_snapshot_001',
  );
  const support = {
    promotion_decision_support_id: 'promotion_decision_support_001',
    support_run_key: 'support_run_key_001',
    title_card_id: 'title_card_001',
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_ref: promotionInputSnapshotRef,
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    support_generation_mode: 'deterministic',
    support_status: 'succeeded',
    summary: 'Package is ready for human promotion review.',
    reviewer_questions: [],
    risk_notes: [],
    recheck_notes: [],
    source_refs: [promotionInputSnapshotRef],
    accepted_risk_refs: [],
    blocker_refs: [],
    recheck_request_refs: [],
    memory_suggestion_refs: [],
    warnings: [],
    artifact_refs: [],
    created_by: 'system',
    created_at: now,
  };
  const dossierArtifactRef = functionalRefForSchema('artifact_ref', 'artifact_ref_dossier_001');
  const dossier = {
    promotion_dossier_id: 'promotion_dossier_001',
    support_run_key: support.support_run_key,
    title_card_id: support.title_card_id,
    promotion_decision_support_id: support.promotion_decision_support_id,
    promotion_input_snapshot_id: support.promotion_input_snapshot_id,
    topic_package_id: support.topic_package_id,
    package_version: support.package_version,
    summary: 'Reviewer packet summary.',
    reviewer_packet_artifact_ref: dossierArtifactRef,
    dossier_payload: {
      sections: ['lineage', 'argument mini-check'],
    },
    source_refs: support.source_refs,
    artifact_refs: [dossierArtifactRef],
    created_by: 'system',
    created_at: now,
  };
  const miniCheck = {
    argument_readiness_mini_check_id: 'argument_readiness_mini_check_001',
    support_run_key: support.support_run_key,
    title_card_id: support.title_card_id,
    promotion_decision_support_id: support.promotion_decision_support_id,
    promotion_input_snapshot_id: support.promotion_input_snapshot_id,
    check_status: 'passed',
    check_items: [
      {
        check_key: 'claim_ceiling_visible',
        status: 'passed',
        message: 'Claim ceiling is visible.',
        refs: [functionalRefForSchema('topic_question_contract', 'topic_question_contract_001')],
      },
    ],
    blockers: [],
    warnings: [],
    required_actions: [],
    early_check_obligations: [],
    source_refs: support.source_refs,
    artifact_refs: [],
    created_by: 'system',
    created_at: now,
  };
  const snapshotHashes = {
    bundle_hash: 'bundle_hash_001',
    package_snapshot_hash: 'package_hash_001',
    package_draft_input_snapshot_hash: 'draft_hash_001',
    promotion_input_snapshot_hash: support.promotion_input_snapshot_hash,
  };
  const gate = {
    promotion_gate_check_id: 'promotion_gate_check_001',
    support_run_key: support.support_run_key,
    title_card_id: support.title_card_id,
    promotion_decision_support_id: support.promotion_decision_support_id,
    promotion_dossier_id: dossier.promotion_dossier_id,
    argument_readiness_mini_check_id: miniCheck.argument_readiness_mini_check_id,
    promotion_input_snapshot_id: support.promotion_input_snapshot_id,
    promotion_input_snapshot_ref: promotionInputSnapshotRef,
    promotion_input_snapshot_hash: support.promotion_input_snapshot_hash,
    disposition: 'ready_for_human_decision',
    promote_allowed: true,
    blockers: [],
    warnings: [],
    required_actions: [],
    loopback_hints: [],
    accepted_risk_refs: [],
    blocker_refs: [],
    recheck_request_refs: [],
    memory_suggestion_refs: [],
    source_refs: support.source_refs,
    snapshot_hashes: snapshotHashes,
    artifact_refs: [],
    created_by: 'system',
    created_at: now,
  };
  const handoff = {
    promotion_gate_check_id: gate.promotion_gate_check_id,
    promotion_gate_check_ref: functionalRefForSchema('promotion_gate_check', gate.promotion_gate_check_id),
    promotion_decision_support_ref: functionalRefForSchema(
      'promotion_decision_support',
      support.promotion_decision_support_id,
    ),
    promotion_dossier_ref: functionalRefForSchema('promotion_dossier', dossier.promotion_dossier_id),
    argument_readiness_mini_check_ref: functionalRefForSchema(
      'argument_readiness_mini_check',
      miniCheck.argument_readiness_mini_check_id,
    ),
    promotion_input_snapshot_id: support.promotion_input_snapshot_id,
    promotion_input_snapshot_ref: promotionInputSnapshotRef,
    promotion_input_snapshot_hash: support.promotion_input_snapshot_hash,
    topic_package_id: support.topic_package_id,
    package_version: support.package_version,
    disposition: gate.disposition,
    promote_allowed: true,
    required_actions: [],
    loopback_hints: [],
    accepted_risk_refs: [],
    blocker_refs: [],
    recheck_request_refs: [],
    memory_suggestion_refs: [],
    snapshot_hashes: snapshotHashes,
    support,
    dossier,
    argument_readiness_mini_check: miniCheck,
    gate_check: gate,
  };
  const typedRequiredAction = {
    action_code: 'resolve_recheck_before_promotion',
    severity: 'blocking',
    loopback_target: 'evidence_or_search',
    refs: [functionalRefForSchema('recheck_request', 'recheck_request_001')],
    reason: 'Carried recheck must be resolved before promotion.',
  };

  const validSupport = await app.inject({ method: 'POST', url: '/support', payload: support });
  const validDossier = await app.inject({ method: 'POST', url: '/dossier', payload: dossier });
  const validMini = await app.inject({ method: 'POST', url: '/mini', payload: miniCheck });
  const validGate = await app.inject({ method: 'POST', url: '/gate', payload: gate });
  const validHandoff = await app.inject({ method: 'POST', url: '/handoff', payload: handoff });
  const invalidPromoteAllowed = await app.inject({
    method: 'POST',
    url: '/handoff',
    payload: {
      ...handoff,
      disposition: 'blocked',
      promote_allowed: true,
      gate_check: {
        ...gate,
        disposition: 'blocked',
        promote_allowed: true,
      },
    },
  });
  const invalidRequiredAction = await app.inject({
    method: 'POST',
    url: '/gate',
    payload: {
      ...gate,
      disposition: 'recheck_required',
      promote_allowed: false,
      required_actions: [
        {
          ...typedRequiredAction,
          reason: undefined,
        },
      ],
      loopback_hints: [
        {
          loopback_target: 'evidence_or_search',
          loopback_cause: 'carried_recheck',
          required_actions: [typedRequiredAction],
          refs: typedRequiredAction.refs,
        },
      ],
    },
  });
  await app.close();

  assert.equal(validSupport.statusCode, 200);
  assert.equal(validDossier.statusCode, 200);
  assert.equal(validMini.statusCode, 200);
  assert.equal(validGate.statusCode, 200);
  assert.equal(validHandoff.statusCode, 200);
  assert.equal(invalidPromoteAllowed.statusCode, 400);
  assert.equal(invalidRequiredAction.statusCode, 400);
});

test('topic-selection v1c human-promotion-decision schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionV1cHumanPromotionDecisionContracts.topicSelectionHumanPromotionDecisionRecordSchema);
  assert.ok(topicSelectionV1cHumanPromotionDecisionContracts.topicSelectionPromotionDecisionRecordSchema);
  assert.ok(topicSelectionV1cHumanPromotionDecisionContracts.topicSelectionPromotionCommitmentProfileRecordSchema);
  assert.ok(topicSelectionV1cHumanPromotionDecisionContracts.topicSelectionPromotionDecisionBundleSchema);
  assert.ok(topicSelectionV1cHumanPromotionDecisionContracts.topicSelectionPromotionBridgeHandoffSchema);
  assert.ok(topicSelectionV1cHumanPromotionDecisionContracts.topicSelectionV1cDelegatedPromotionDecisionCandidateSchema);
  assert.deepEqual(
    [...topicSelectionV1cHumanPromotionDecisionContracts.TOPIC_SELECTION_HUMAN_PROMOTION_DECISIONS],
    [
      'promote_to_paper_project',
      'promote_with_conditions',
      'merge_packages',
      'refine_package',
      'reassess_value',
      'revise_question',
      'revise_slice',
      'recheck_evidence_or_search',
      'park',
      'drop',
    ],
  );
  assert.ok(researchLifecycleContracts.topicSelectionHumanPromotionDecisionRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionPromotionBridgeHandoffSchema);
  assert.ok(researchLifecycleContracts.topicSelectionV1cDelegatedPromotionDecisionCandidateSchema);
});

test('topic-selection v1c human-promotion-decision schemas validate decisions and handoff invariants', async () => {
  const app = Fastify();
  app.post('/human', {
    schema: {
      body: topicSelectionV1cHumanPromotionDecisionContracts.topicSelectionHumanPromotionDecisionRecordSchema,
    },
  }, async () => ({ ok: true }));
  app.post('/decision', {
    schema: {
      body: topicSelectionV1cHumanPromotionDecisionContracts.topicSelectionPromotionDecisionRecordSchema,
    },
  }, async () => ({ ok: true }));
  app.post('/commitment', {
    schema: {
      body: topicSelectionV1cHumanPromotionDecisionContracts.topicSelectionPromotionCommitmentProfileRecordSchema,
    },
  }, async () => ({ ok: true }));
  app.post('/bundle', {
    schema: {
      body: topicSelectionV1cHumanPromotionDecisionContracts.topicSelectionPromotionDecisionBundleSchema,
    },
  }, async () => ({ ok: true }));
  app.post('/bridge', {
    schema: {
      body: topicSelectionV1cHumanPromotionDecisionContracts.topicSelectionPromotionBridgeHandoffSchema,
    },
  }, async () => ({ ok: true }));
  app.post('/delegated-candidate', {
    schema: {
      body: topicSelectionV1cHumanPromotionDecisionContracts
        .topicSelectionV1cDelegatedPromotionDecisionCandidateSchema,
    },
  }, async () => ({ ok: true }));
  await app.ready();

  const now = '2026-05-15T00:00:00.000Z';
  const gateRef = functionalRefForSchema('promotion_gate_check', 'promotion_gate_check_001');
  const inputRef = functionalRefForSchema('promotion_input_snapshot', 'promotion_input_snapshot_001');
  const humanRef = functionalRefForSchema('human_promotion_decision', 'human_promotion_decision_001');
  const humanConfirmedRef = functionalRefForSchema('human_confirmed_decision', 'human_confirmed_decision_001');
  const decisionRef = functionalRefForSchema('promotion_decision', 'promotion_decision_001');
  const commitmentRef = functionalRefForSchema('promotion_commitment_profile', 'promotion_commitment_profile_001');
  const artifactRef = functionalRefForSchema('artifact_ref', 'artifact_ref_001');
  const snapshotHashes = {
    bundle_hash: 'bundle_hash_001',
    package_snapshot_hash: 'package_hash_001',
    package_draft_input_snapshot_hash: 'draft_hash_001',
    promotion_input_snapshot_hash: 'promotion_hash_001',
  };
  const requiredAction = {
    action_code: 'resolve_condition_before_outline_lock',
    severity: 'warning',
    loopback_target: 'package',
    refs: [functionalRefForSchema('topic_package', 'topic_package_001')],
    reason: 'Clarify the contribution wording before outline lock.',
  };
  const condition = {
    condition_id: 'promotion_condition_001',
    condition_code: 'clarify_contribution_claim',
    owner: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    required_action: requiredAction,
    refs: requiredAction.refs,
    early_check_obligations: ['Re-check contribution claim before outline lock.'],
    verification_note: 'Condition is reviewer-visible.',
  };
  const humanDecision = {
    human_promotion_decision_id: 'human_promotion_decision_001',
    human_confirmed_decision_id: 'human_confirmed_decision_001',
    human_promotion_decision_key: 'decision_key_001',
    title_card_id: 'title_card_001',
    promotion_gate_check_id: 'promotion_gate_check_001',
    promotion_gate_check_ref: gateRef,
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_hash: 'promotion_hash_001',
    decision: 'promote_with_conditions',
    decision_class: 'promote',
    actor: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    decision_timestamp: now,
    confirmed_snapshot_hash: 'promotion_hash_001',
    rationale: 'Ready to promote with one explicit condition.',
    conditions: [condition],
    required_actions: [],
    loopback_refs: [],
    accepted_risk_refs: [functionalRefForSchema('accepted_risk', 'accepted_risk_001')],
    allowed_refinements: [
      {
        refinement_code: 'wording_only',
        scope: 'title_and_abstract_claim_wording',
        refs: [functionalRefForSchema('topic_package', 'topic_package_001')],
      },
    ],
    stop_conditions: [
      {
        condition_code: 'new_blocker_found',
        reason: 'Stop if a new blocking evidence conflict appears.',
        refs: [functionalRefForSchema('evidence_unit', 'evidence_unit_001')],
      },
    ],
    reopen_conditions: [],
    source_refs: [gateRef, inputRef],
    artifact_refs: [artifactRef],
    created_at: now,
  };
  const promotionDecision = {
    promotion_decision_id: 'promotion_decision_001',
    promotion_decision_status: 'current',
    current_promotion_input_snapshot_key: 'promotion_input_snapshot_001',
    human_promotion_decision_id: humanDecision.human_promotion_decision_id,
    human_confirmed_decision_id: humanDecision.human_confirmed_decision_id,
    title_card_id: humanDecision.title_card_id,
    promotion_gate_check_id: humanDecision.promotion_gate_check_id,
    promotion_input_snapshot_id: humanDecision.promotion_input_snapshot_id,
    promotion_input_snapshot_hash: humanDecision.promotion_input_snapshot_hash,
    gate_disposition: 'ready_for_human_decision',
    decision: humanDecision.decision,
    decision_class: humanDecision.decision_class,
    bridge_eligible: true,
    promotion_commitment_profile_id: 'promotion_commitment_profile_001',
    required_actions: [],
    accepted_risk_refs: humanDecision.accepted_risk_refs,
    conditions: humanDecision.conditions,
    source_refs: humanDecision.source_refs,
    snapshot_hashes: snapshotHashes,
    artifact_refs: [artifactRef],
    created_at: now,
  };
  const commitment = {
    promotion_commitment_profile_id: 'promotion_commitment_profile_001',
    promotion_decision_id: promotionDecision.promotion_decision_id,
    human_promotion_decision_id: humanDecision.human_promotion_decision_id,
    human_confirmed_decision_id: humanDecision.human_confirmed_decision_id,
    title_card_id: humanDecision.title_card_id,
    promotion_gate_check_id: humanDecision.promotion_gate_check_id,
    promotion_input_snapshot_id: humanDecision.promotion_input_snapshot_id,
    promotion_input_snapshot_hash: humanDecision.promotion_input_snapshot_hash,
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    scope: {
      contribution_summary: 'A focused contribution summary.',
    },
    claim_ceiling: 'Correlation and mechanism claims only.',
    prohibited_claims: ['Do not claim causal proof.'],
    accepted_risk_refs: humanDecision.accepted_risk_refs,
    conditions: [condition],
    allowed_refinements: humanDecision.allowed_refinements,
    early_check_obligations: ['Re-check contribution claim before outline lock.'],
    stop_conditions: humanDecision.stop_conditions,
    reopen_conditions: [],
    source_refs: humanDecision.source_refs,
    snapshot_hashes: snapshotHashes,
    artifact_refs: [artifactRef],
    created_at: now,
  };
  const bridgeHandoff = {
    promotion_decision_id: promotionDecision.promotion_decision_id,
    promotion_decision_ref: decisionRef,
    human_promotion_decision_ref: humanRef,
    human_confirmed_decision_ref: humanConfirmedRef,
    promotion_commitment_profile_ref: commitmentRef,
    promotion_gate_check_ref: gateRef,
    promotion_input_snapshot_id: humanDecision.promotion_input_snapshot_id,
    promotion_input_snapshot_ref: inputRef,
    promotion_input_snapshot_hash: humanDecision.promotion_input_snapshot_hash,
    topic_package_id: commitment.topic_package_id,
    package_version: commitment.package_version,
    decision: 'promote_with_conditions',
    promotion_decision_status: 'current',
    conditions: [condition],
    accepted_risk_refs: humanDecision.accepted_risk_refs,
    allowed_refinements: humanDecision.allowed_refinements,
    early_check_obligations: commitment.early_check_obligations,
    stop_conditions: humanDecision.stop_conditions,
    reopen_conditions: [],
    source_refs: humanDecision.source_refs,
    snapshot_hashes: snapshotHashes,
    artifact_refs: [artifactRef],
    human_promotion_decision: humanDecision,
    promotion_decision: promotionDecision,
    promotion_commitment_profile: commitment,
  };
  const delegatedCandidate = {
    schema_version:
      topicSelectionV1cHumanPromotionDecisionContracts
        .TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_CANDIDATE_SCHEMA_VERSION,
    promotion_gate_check_id: humanDecision.promotion_gate_check_id,
    promotion_input_snapshot_id: humanDecision.promotion_input_snapshot_id,
    promotion_input_snapshot_hash: humanDecision.promotion_input_snapshot_hash,
    title_card_id: humanDecision.title_card_id,
    decision: humanDecision.decision,
    rationale: humanDecision.rationale,
    confirmed_snapshot_hash: humanDecision.confirmed_snapshot_hash,
    conditions: [condition],
    required_actions: [],
    loopback_target: null,
    allowed_refinements: humanDecision.allowed_refinements,
    stop_conditions: humanDecision.stop_conditions,
    reopen_conditions: [],
    cited_refs: [gateRef, inputRef, ...condition.refs],
    decision_support_refs: [gateRef, inputRef],
    no_authority_write_confirmed: true,
    no_bridge_creation_confirmed: true,
    human_review_required: true,
  };
  const nonPromoteHumanDecision = {
    ...humanDecision,
    human_promotion_decision_id: 'human_promotion_decision_002',
    human_confirmed_decision_id: 'human_confirmed_decision_002',
    decision: 'recheck_evidence_or_search',
    decision_class: 'non_promote',
    conditions: [],
    required_actions: [
      {
        action_code: 'resolve_recheck_before_promotion',
        severity: 'blocking',
        loopback_target: 'evidence_or_search',
        refs: [functionalRefForSchema('recheck_request', 'recheck_request_001')],
        reason: 'Resolve carried recheck.',
      },
    ],
    loopback_target: 'evidence_or_search',
    loopback_refs: [functionalRefForSchema('recheck_request', 'recheck_request_001')],
  };

  const validHuman = await app.inject({ method: 'POST', url: '/human', payload: humanDecision });
  const validDecision = await app.inject({ method: 'POST', url: '/decision', payload: promotionDecision });
  const validCommitment = await app.inject({ method: 'POST', url: '/commitment', payload: commitment });
  const validBundle = await app.inject({
    method: 'POST',
    url: '/bundle',
    payload: {
      human_promotion_decision: humanDecision,
      promotion_decision: promotionDecision,
      promotion_commitment_profile: commitment,
    },
  });
  const validBridge = await app.inject({ method: 'POST', url: '/bridge', payload: bridgeHandoff });
  const validDelegatedCandidate = await app.inject({
    method: 'POST',
    url: '/delegated-candidate',
    payload: delegatedCandidate,
  });
  const invalidMissingCondition = await app.inject({
    method: 'POST',
    url: '/human',
    payload: {
      ...humanDecision,
      conditions: [],
    },
  });
  const invalidConditionMissingOwner = await app.inject({
    method: 'POST',
    url: '/human',
    payload: {
      ...humanDecision,
      conditions: [
        {
          ...condition,
          owner: undefined,
        },
      ],
    },
  });
  const invalidConditionMissingEarlyCheck = await app.inject({
    method: 'POST',
    url: '/human',
    payload: {
      ...humanDecision,
      conditions: [
        {
          ...condition,
          early_check_obligations: [],
        },
      ],
    },
  });
  const invalidNonPromoteActions = await app.inject({
    method: 'POST',
    url: '/human',
    payload: {
      ...nonPromoteHumanDecision,
      required_actions: [],
    },
  });
  const invalidBridgeDecision = await app.inject({
    method: 'POST',
    url: '/bridge',
    payload: {
      ...bridgeHandoff,
      decision: 'drop',
      promotion_decision: {
        ...promotionDecision,
        decision: 'drop',
        decision_class: 'non_promote',
        bridge_eligible: false,
      },
    },
  });
  const invalidBridgeNestedDecision = await app.inject({
    method: 'POST',
    url: '/bridge',
    payload: {
      ...bridgeHandoff,
      promotion_decision: {
        ...promotionDecision,
        promotion_commitment_profile_id: null,
      },
    },
  });
  const invalidDelegatedCandidateAuthorityFlag = await app.inject({
    method: 'POST',
    url: '/delegated-candidate',
    payload: {
      ...delegatedCandidate,
      no_bridge_creation_confirmed: false,
    },
  });
  await app.close();

  assert.equal(validHuman.statusCode, 200);
  assert.equal(validDecision.statusCode, 200);
  assert.equal(validCommitment.statusCode, 200);
  assert.equal(validBundle.statusCode, 200);
  assert.equal(validBridge.statusCode, 200);
  assert.equal(validDelegatedCandidate.statusCode, 200);
  assert.equal(invalidMissingCondition.statusCode, 400);
  assert.equal(invalidConditionMissingOwner.statusCode, 400);
  assert.equal(invalidConditionMissingEarlyCheck.statusCode, 400);
  assert.equal(invalidNonPromoteActions.statusCode, 400);
  assert.equal(invalidBridgeDecision.statusCode, 400);
  assert.equal(invalidBridgeNestedDecision.statusCode, 400);
  assert.equal(invalidDelegatedCandidateAuthorityFlag.statusCode, 400);
});

test('topic-selection v1c paper-project-bridge schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionV1cPaperProjectBridgeContracts.topicSelectionPaperProjectBridgeWorkingCopyPayloadSchema);
  assert.ok(topicSelectionV1cPaperProjectBridgeContracts.topicSelectionPaperProjectBridgeCreateInputSchema);
  assert.ok(topicSelectionV1cPaperProjectBridgeContracts.topicSelectionPaperProjectBridgeIntakeBodySchema);
  assert.ok(topicSelectionV1cPaperProjectBridgeContracts.topicSelectionPaperProjectBridgeRecordSchema);
  assert.ok(topicSelectionV1cPaperProjectBridgeContracts.topicSelectionPaperProjectBridgeHandoffSchema);
  assert.ok(topicSelectionV1cPaperProjectBridgeContracts.topicSelectionPaperProjectBridgeIntakeResultSchema);
  assert.deepEqual(
    [...topicSelectionV1cPaperProjectBridgeContracts.TOPIC_SELECTION_PAPER_PROJECT_BRIDGE_STATUSES],
    ['active', 'blocked', 'superseded', 'archived'],
  );
  assert.ok(researchLifecycleContracts.topicSelectionPaperProjectBridgeRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionPaperProjectBridgeHandoffSchema);
  assert.ok(researchLifecycleContracts.topicSelectionPaperProjectBridgeIntakeBodySchema);
  assert.ok(researchLifecycleContracts.topicSelectionPaperProjectBridgeIntakeResultSchema);
});

test('topic-selection v1c paper-project-bridge schemas validate bridge handoff invariants', async () => {
  const app = Fastify();
  app.post('/create', {
    schema: {
      body: topicSelectionV1cPaperProjectBridgeContracts.topicSelectionPaperProjectBridgeCreateInputSchema,
    },
  }, async () => ({ ok: true }));
  app.post('/record', {
    schema: {
      body: topicSelectionV1cPaperProjectBridgeContracts.topicSelectionPaperProjectBridgeRecordSchema,
    },
  }, async () => ({ ok: true }));
  app.post('/handoff', {
    schema: {
      body: topicSelectionV1cPaperProjectBridgeContracts.topicSelectionPaperProjectBridgeHandoffSchema,
    },
  }, async () => ({ ok: true }));
  app.post('/intake-body', {
    schema: {
      body: topicSelectionV1cPaperProjectBridgeContracts.topicSelectionPaperProjectBridgeIntakeBodySchema,
    },
  }, async () => ({ ok: true }));
  app.post('/intake-result', {
    schema: {
      body: topicSelectionV1cPaperProjectBridgeContracts.topicSelectionPaperProjectBridgeIntakeResultSchema,
    },
  }, async () => ({ ok: true }));
  await app.ready();

  const now = '2026-05-15T00:00:00.000Z';
  const artifactRef = functionalRefForSchema('artifact_ref', 'artifact_ref_001');
  const gateRef = functionalRefForSchema('promotion_gate_check', 'promotion_gate_check_001');
  const inputRef = functionalRefForSchema('promotion_input_snapshot', 'promotion_input_snapshot_001');
  const humanRef = functionalRefForSchema('human_promotion_decision', 'human_promotion_decision_001');
  const humanConfirmedRef = functionalRefForSchema('human_confirmed_decision', 'human_confirmed_decision_001');
  const decisionRef = functionalRefForSchema('promotion_decision', 'promotion_decision_001');
  const commitmentRef = functionalRefForSchema('promotion_commitment_profile', 'promotion_commitment_profile_001');
  const bridgeRef = functionalRefForSchema('paper_project_bridge', 'paper_project_bridge_001');
  const paperProjectIntakeRef = functionalRefForSchema('paper_project_intake', 'paper_project_intake_001');
  const paperProjectRef = functionalRefForSchema('paper_project', 'paper_project_001');
  const acceptedRiskRef = functionalRefForSchema('accepted_risk', 'accepted_risk_001');
  const packageRef = functionalRefForSchema('topic_package', 'topic_package_001');
  const snapshotHashes = {
    bundle_hash: 'bundle_hash_001',
    package_snapshot_hash: 'package_hash_001',
    package_draft_input_snapshot_hash: 'draft_hash_001',
    promotion_input_snapshot_hash: 'promotion_hash_001',
  };
  const requiredAction = {
    action_code: 'resolve_condition_before_outline_lock',
    severity: 'warning',
    loopback_target: 'package',
    refs: [packageRef],
    reason: 'Clarify the contribution wording before outline lock.',
  };
  const condition = {
    condition_id: 'promotion_condition_001',
    condition_code: 'clarify_contribution_claim',
    owner: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    required_action: requiredAction,
    refs: [packageRef],
    early_check_obligations: ['Re-check contribution claim before outline lock.'],
  };
  const humanDecision = {
    human_promotion_decision_id: 'human_promotion_decision_001',
    human_confirmed_decision_id: 'human_confirmed_decision_001',
    human_promotion_decision_key: 'decision_key_001',
    title_card_id: 'title_card_001',
    promotion_gate_check_id: 'promotion_gate_check_001',
    promotion_gate_check_ref: gateRef,
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_hash: 'promotion_hash_001',
    decision: 'promote_with_conditions',
    decision_class: 'promote',
    actor: {
      actor_type: 'human',
      actor_id: 'reviewer_001',
    },
    decision_timestamp: now,
    confirmed_snapshot_hash: 'promotion_hash_001',
    rationale: 'Ready to promote with one explicit condition.',
    conditions: [condition],
    required_actions: [],
    loopback_refs: [],
    accepted_risk_refs: [acceptedRiskRef],
    allowed_refinements: [
      {
        refinement_code: 'wording_only',
        scope: 'title_and_abstract_claim_wording',
        refs: [packageRef],
      },
    ],
    stop_conditions: [],
    reopen_conditions: [],
    source_refs: [gateRef, inputRef, packageRef],
    artifact_refs: [artifactRef],
    created_at: now,
  };
  const promotionDecision = {
    promotion_decision_id: 'promotion_decision_001',
    promotion_decision_status: 'current',
    current_promotion_input_snapshot_key: 'promotion_input_snapshot_001',
    human_promotion_decision_id: humanDecision.human_promotion_decision_id,
    human_confirmed_decision_id: humanDecision.human_confirmed_decision_id,
    title_card_id: humanDecision.title_card_id,
    promotion_gate_check_id: humanDecision.promotion_gate_check_id,
    promotion_input_snapshot_id: humanDecision.promotion_input_snapshot_id,
    promotion_input_snapshot_hash: humanDecision.promotion_input_snapshot_hash,
    gate_disposition: 'ready_for_human_decision',
    decision: humanDecision.decision,
    decision_class: humanDecision.decision_class,
    bridge_eligible: true,
    promotion_commitment_profile_id: 'promotion_commitment_profile_001',
    required_actions: [],
    accepted_risk_refs: humanDecision.accepted_risk_refs,
    conditions: humanDecision.conditions,
    source_refs: humanDecision.source_refs,
    snapshot_hashes: snapshotHashes,
    artifact_refs: [artifactRef],
    created_at: now,
  };
  const commitment = {
    promotion_commitment_profile_id: 'promotion_commitment_profile_001',
    promotion_decision_id: promotionDecision.promotion_decision_id,
    human_promotion_decision_id: humanDecision.human_promotion_decision_id,
    human_confirmed_decision_id: humanDecision.human_confirmed_decision_id,
    title_card_id: humanDecision.title_card_id,
    promotion_gate_check_id: humanDecision.promotion_gate_check_id,
    promotion_input_snapshot_id: humanDecision.promotion_input_snapshot_id,
    promotion_input_snapshot_hash: humanDecision.promotion_input_snapshot_hash,
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    scope: {
      contribution_summary: 'A focused contribution summary.',
    },
    claim_ceiling: 'Correlation and mechanism claims only.',
    prohibited_claims: ['Do not claim causal proof.'],
    accepted_risk_refs: humanDecision.accepted_risk_refs,
    conditions: humanDecision.conditions,
    allowed_refinements: humanDecision.allowed_refinements,
    early_check_obligations: ['Re-check contribution claim before outline lock.'],
    stop_conditions: [],
    reopen_conditions: [],
    source_refs: humanDecision.source_refs,
    snapshot_hashes: snapshotHashes,
    artifact_refs: [artifactRef],
    created_at: now,
  };
  const sourcePromotionHandoff = {
    promotion_decision_id: promotionDecision.promotion_decision_id,
    promotion_decision_ref: decisionRef,
    human_promotion_decision_ref: humanRef,
    human_confirmed_decision_ref: humanConfirmedRef,
    promotion_commitment_profile_ref: commitmentRef,
    promotion_gate_check_ref: gateRef,
    promotion_input_snapshot_id: humanDecision.promotion_input_snapshot_id,
    promotion_input_snapshot_ref: inputRef,
    promotion_input_snapshot_hash: humanDecision.promotion_input_snapshot_hash,
    topic_package_id: commitment.topic_package_id,
    package_version: commitment.package_version,
    decision: 'promote_with_conditions',
    promotion_decision_status: 'current',
    conditions: humanDecision.conditions,
    accepted_risk_refs: humanDecision.accepted_risk_refs,
    allowed_refinements: humanDecision.allowed_refinements,
    early_check_obligations: commitment.early_check_obligations,
    stop_conditions: [],
    reopen_conditions: [],
    source_refs: humanDecision.source_refs,
    snapshot_hashes: snapshotHashes,
    artifact_refs: [artifactRef],
    human_promotion_decision: humanDecision,
    promotion_decision: promotionDecision,
    promotion_commitment_profile: commitment,
  };
  const workingCopy = {
    editable_title: 'Working paper title',
    problem_statement: 'A concise problem statement.',
    contribution_summary: 'A focused contribution summary.',
    evaluation_plan: 'Run early feasibility checks.',
    initial_planning_notes: ['Preserve accepted risks during intake.'],
    claim_ceiling: commitment.claim_ceiling,
    prohibited_claims: commitment.prohibited_claims,
    conditions: [condition],
    accepted_risk_refs: humanDecision.accepted_risk_refs,
    early_check_obligations: commitment.early_check_obligations,
    source_lineage_summary: {
      topic_package_id: commitment.topic_package_id,
    },
  };
  const bridge = {
    paper_project_bridge_id: 'paper_project_bridge_001',
    bridge_status: 'active',
    title_card_id: humanDecision.title_card_id,
    source_promotion_decision_id: promotionDecision.promotion_decision_id,
    source_promotion_decision_ref: decisionRef,
    human_promotion_decision_ref: humanRef,
    human_confirmed_decision_ref: humanConfirmedRef,
    promotion_commitment_profile_id: commitment.promotion_commitment_profile_id,
    promotion_commitment_profile_ref: commitmentRef,
    promotion_gate_check_ref: gateRef,
    promotion_input_snapshot_id: humanDecision.promotion_input_snapshot_id,
    promotion_input_snapshot_ref: inputRef,
    promotion_input_snapshot_hash: humanDecision.promotion_input_snapshot_hash,
    topic_package_id: commitment.topic_package_id,
    package_version: commitment.package_version,
    decision: 'promote_with_conditions',
    conditions: [condition],
    accepted_risk_refs: humanDecision.accepted_risk_refs,
    allowed_refinements: humanDecision.allowed_refinements,
    early_check_obligations: commitment.early_check_obligations,
    stop_conditions: [],
    reopen_conditions: [],
    source_refs: humanDecision.source_refs,
    snapshot_hashes: snapshotHashes,
    working_copy_payload: workingCopy,
    working_copy_payload_hash: 'working_copy_hash_001',
    bridge_payload_hash: 'bridge_payload_hash_001',
    paper_project_intake_ref: null,
    target_paper_project_ref: null,
    source_promotion_handoff: sourcePromotionHandoff,
    artifact_refs: [artifactRef],
    created_by: 'system',
    created_at: now,
  };
  const handoff = {
    paper_project_bridge_id: bridge.paper_project_bridge_id,
    paper_project_bridge_ref: bridgeRef,
    bridge_status: 'active',
    source_promotion_decision_id: promotionDecision.promotion_decision_id,
    source_promotion_decision_ref: decisionRef,
    promotion_commitment_profile_ref: commitmentRef,
    promotion_input_snapshot_id: humanDecision.promotion_input_snapshot_id,
    promotion_input_snapshot_ref: inputRef,
    promotion_input_snapshot_hash: humanDecision.promotion_input_snapshot_hash,
    topic_package_id: commitment.topic_package_id,
    package_version: commitment.package_version,
    decision: 'promote_with_conditions',
    working_copy_payload: workingCopy,
    working_copy_payload_hash: bridge.working_copy_payload_hash,
    bridge_payload_hash: bridge.bridge_payload_hash,
    conditions: [condition],
    accepted_risk_refs: humanDecision.accepted_risk_refs,
    allowed_refinements: humanDecision.allowed_refinements,
    early_check_obligations: commitment.early_check_obligations,
    stop_conditions: [],
    reopen_conditions: [],
    source_refs: humanDecision.source_refs,
    snapshot_hashes: snapshotHashes,
    paper_project_intake_ref: null,
    target_paper_project_ref: null,
    bridge,
    source_promotion_handoff: sourcePromotionHandoff,
  };
  const consumedBridge = {
    ...bridge,
    paper_project_intake_ref: paperProjectIntakeRef,
    target_paper_project_ref: paperProjectRef,
  };
  const consumedHandoff = {
    ...handoff,
    paper_project_intake_ref: paperProjectIntakeRef,
    target_paper_project_ref: paperProjectRef,
    bridge: consumedBridge,
  };
  const intakeResult = {
    paper_project_bridge: consumedBridge,
    handoff: consumedHandoff,
    paper_project_id: paperProjectRef.ref_id,
    paper_project_ref: paperProjectRef,
    paper_project_intake_ref: paperProjectIntakeRef,
    paper_project_created: true,
    carried_literature_evidence_ids: ['literature_evidence_001'],
    carried_accepted_risk_refs: [acceptedRiskRef],
    carried_condition_refs: [packageRef],
  };

  const validCreate = await app.inject({
    method: 'POST',
    url: '/create',
    payload: { promotion_decision_id: 'promotion_decision_001', created_by: 'system' },
  });
  const validRecord = await app.inject({ method: 'POST', url: '/record', payload: bridge });
  const validHandoff = await app.inject({ method: 'POST', url: '/handoff', payload: handoff });
  const validIntakeBody = await app.inject({
    method: 'POST',
    url: '/intake-body',
    payload: {
      bridge_payload_hash: bridge.bridge_payload_hash,
      title: 'Paper title from bridge intake',
      research_direction: 'paper engineering',
      created_by: 'hybrid',
    },
  });
  const validIntakeResult = await app.inject({
    method: 'POST',
    url: '/intake-result',
    payload: intakeResult,
  });
  const invalidNestedDecision = await app.inject({
    method: 'POST',
    url: '/handoff',
    payload: {
      ...handoff,
      source_promotion_handoff: {
        ...sourcePromotionHandoff,
        promotion_decision: {
          ...promotionDecision,
          decision: 'drop',
          decision_class: 'non_promote',
          bridge_eligible: false,
        },
      },
    },
  });
  const invalidWorkingCopy = await app.inject({
    method: 'POST',
    url: '/record',
    payload: {
      ...bridge,
      working_copy_payload: {
        ...workingCopy,
        editable_title: '',
      },
    },
  });
  const invalidSourceHash = await app.inject({
    method: 'POST',
    url: '/record',
    payload: {
      ...bridge,
      snapshot_hashes: {
        ...snapshotHashes,
        promotion_input_snapshot_hash: '',
      },
    },
  });
  const invalidCreatedBy = await app.inject({
    method: 'POST',
    url: '/create',
    payload: {
      promotion_decision_id: 'promotion_decision_001',
      created_by: 'automation',
    },
  });
  const invalidIntakeMissingHash = await app.inject({
    method: 'POST',
    url: '/intake-body',
    payload: {
      created_by: 'hybrid',
    },
  });
  const invalidIntakeActor = await app.inject({
    method: 'POST',
    url: '/intake-body',
    payload: {
      bridge_payload_hash: bridge.bridge_payload_hash,
      created_by: 'system',
    },
  });
  const invalidIntakeResult = await app.inject({
    method: 'POST',
    url: '/intake-result',
    payload: {
      ...intakeResult,
      paper_project_id: '',
    },
  });
  await app.close();

  assert.equal(validCreate.statusCode, 200);
  assert.equal(validRecord.statusCode, 200);
  assert.equal(validHandoff.statusCode, 200);
  assert.equal(validIntakeBody.statusCode, 200);
  assert.equal(validIntakeResult.statusCode, 200);
  assert.equal(invalidNestedDecision.statusCode, 400);
  assert.equal(invalidWorkingCopy.statusCode, 400);
  assert.equal(invalidSourceHash.statusCode, 400);
  assert.equal(invalidCreatedBy.statusCode, 400);
  assert.equal(invalidIntakeMissingHash.statusCode, 400);
  assert.equal(invalidIntakeActor.statusCode, 400);
  assert.equal(invalidIntakeResult.statusCode, 400);
});

test('topic-selection v1c downstream-feedback/recheck schemas load through direct and aggregate exports', () => {
  assert.ok(topicSelectionV1cDownstreamFeedbackRecheckContracts.topicSelectionV1cDownstreamFeedbackCandidateSchema);
  assert.ok(topicSelectionV1cDownstreamFeedbackRecheckContracts.topicSelectionDownstreamTopicFeedbackCreateInputSchema);
  assert.ok(topicSelectionV1cDownstreamFeedbackRecheckContracts.topicSelectionDownstreamTopicFeedbackRecordSchema);
  assert.ok(topicSelectionV1cDownstreamFeedbackRecheckContracts.topicSelectionLoopbackClassificationSchema);
  assert.ok(topicSelectionV1cDownstreamFeedbackRecheckContracts.topicSelectionDownstreamRecheckRequestSchema);
  assert.ok(topicSelectionV1cDownstreamFeedbackRecheckContracts.topicSelectionDownstreamFeedbackImpactSummarySchema);
  assert.deepEqual(
    [...topicSelectionV1cDownstreamFeedbackRecheckContracts.TOPIC_SELECTION_DOWNSTREAM_FEEDBACK_SOURCE_KINDS],
    ['paper_project', 'paper_implementation', 'writing', 'research_argument', 'reviewer_check', 'manual'],
  );
  assert.deepEqual(
    [...topicSelectionV1cDownstreamFeedbackRecheckContracts.TOPIC_SELECTION_DOWNSTREAM_LOOPBACK_TARGETS],
    [
      'package',
      'value_assessment',
      'topic_question',
      'research_slice',
      'validated_need',
      'evidence_or_search',
      'promotion',
      'paper_project_bridge',
      'merge_candidate',
      'paper_project_intake',
    ],
  );
  assert.ok(researchLifecycleContracts.topicSelectionV1cDownstreamFeedbackCandidateSchema);
  assert.ok(researchLifecycleContracts.topicSelectionDownstreamTopicFeedbackCreateInputSchema);
  assert.ok(researchLifecycleContracts.topicSelectionDownstreamTopicFeedbackRecordSchema);
});

test('topic-selection v1c downstream-feedback/recheck schemas validate typed feedback artifacts', async () => {
  const app = Fastify();
  app.post('/create', {
    schema: {
      body: topicSelectionV1cDownstreamFeedbackRecheckContracts.topicSelectionDownstreamTopicFeedbackCreateInputSchema,
    },
  }, async () => ({ ok: true }));
  app.post('/candidate', {
    schema: {
      body: topicSelectionV1cDownstreamFeedbackRecheckContracts.topicSelectionV1cDownstreamFeedbackCandidateSchema,
    },
  }, async () => ({ ok: true }));
  app.post('/classification', {
    schema: {
      body: topicSelectionV1cDownstreamFeedbackRecheckContracts.topicSelectionLoopbackClassificationSchema,
    },
  }, async () => ({ ok: true }));
  app.post('/recheck', {
    schema: {
      body: topicSelectionV1cDownstreamFeedbackRecheckContracts.topicSelectionDownstreamRecheckRequestSchema,
    },
  }, async () => ({ ok: true }));
  app.post('/impact', {
    schema: {
      body: topicSelectionV1cDownstreamFeedbackRecheckContracts.topicSelectionDownstreamFeedbackImpactSummarySchema,
    },
  }, async () => ({ ok: true }));
  app.post('/record', {
    schema: {
      body: topicSelectionV1cDownstreamFeedbackRecheckContracts.topicSelectionDownstreamTopicFeedbackRecordSchema,
    },
  }, async () => ({ ok: true }));
  await app.ready();

  const now = '2026-05-16T00:00:00.000Z';
  const bridgeRef = functionalRefForSchema('paper_project_bridge', 'paper_project_bridge_001');
  const sourceRef = functionalRefForSchema('reviewer_check', 'reviewer_check_001');
  const feedbackRef = functionalRefForSchema('downstream_topic_feedback', 'downstream_topic_feedback_001');
  const affectedRef = functionalRefForSchema('validated_need', 'validated_need_001');
  const recheckEventRef = functionalRefForSchema('recheck_event', 'recheck_event_001');
  const recheckImpactRef = functionalRefForSchema('recheck_impact', 'recheck_impact_001');
  const queueRef = functionalRefForSchema('decision_work_queue_item', 'decision_work_queue_item_001');
  const classification = {
    loopback_target: 'validated_need',
    loopback_cause: 'need_invalidated',
    severity: 'critical',
    requires_recheck: true,
    affected_ref: affectedRef,
    affected_stage: 'validated_need',
    source_refs: [bridgeRef, sourceRef],
    rationale: 'Need invalidation must route back to the validated need authority.',
    required_actions: ['Recheck the validated need against downstream counter-evidence.'],
  };
  const recheckRequest = {
    downstream_recheck_request_id: 'downstream_recheck_request_001',
    feedback_ref: feedbackRef,
    loopback_target: 'validated_need',
    loopback_cause: 'need_invalidated',
    affected_ref: affectedRef,
    required_actions: ['Recheck the validated need against downstream counter-evidence.'],
    reason_codes: ['need_invalidated'],
    source_refs: [bridgeRef, sourceRef],
    created_at: now,
  };
  const impactSummary = {
    impact_level: 'invalidated',
    severity: 'critical',
    loopback_target: 'validated_need',
    loopback_cause: 'need_invalidated',
    requires_recheck: true,
    affected_ref: affectedRef,
    recheck_event_ref: recheckEventRef,
    recheck_impact_ref: recheckImpactRef,
    decision_work_queue_item_ref: queueRef,
    summary: 'Downstream reviewer check invalidated the claimed need.',
  };
  const record = {
    downstream_topic_feedback_id: 'downstream_topic_feedback_001',
    feedback_fingerprint: 'feedback_fingerprint_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    paper_project_bridge_id: 'paper_project_bridge_001',
    paper_project_bridge_ref: bridgeRef,
    source_promotion_decision_ref: functionalRefForSchema('promotion_decision', 'promotion_decision_001'),
    promotion_commitment_profile_ref: functionalRefForSchema('promotion_commitment_profile', 'promotion_commitment_profile_001'),
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_ref: functionalRefForSchema('promotion_input_snapshot', 'promotion_input_snapshot_001'),
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    downstream_source_kind: 'reviewer_check',
    downstream_source_ref: sourceRef,
    source_feedback_refs: [sourceRef],
    observed_blocker_refs: [],
    feedback_signal: 'need_invalidated',
    severity: 'critical',
    summary: 'Downstream reviewer check invalidated the claimed need.',
    required_action: 'Recheck the validated need against downstream counter-evidence.',
    classification,
    recheck_request: recheckRequest,
    impact_summary: impactSummary,
    recheck_event_ref: recheckEventRef,
    recheck_impact_ref: recheckImpactRef,
    decision_work_queue_item_ref: queueRef,
    artifact_refs: [functionalRefForSchema('artifact_ref', 'artifact_ref_001')],
    payload: { quoted_feedback: 'Counter-evidence changes the need status.' },
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: now,
  };
  const candidate = {
    schema_version:
      topicSelectionV1cDownstreamFeedbackRecheckContracts
        .TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_CANDIDATE_SCHEMA_VERSION,
    paper_project_bridge_id: 'paper_project_bridge_001',
    workspace_id: 'workspace_001',
    downstream_source_kind: 'reviewer_check',
    downstream_source_ref: sourceRef,
    source_feedback_refs: [sourceRef],
    observed_blocker_refs: [],
    feedback_signal: 'need_invalidated',
    severity: 'critical',
    summary: 'Downstream reviewer check invalidated the claimed need.',
    required_action: 'Recheck the validated need against downstream counter-evidence.',
    artifact_refs: [functionalRefForSchema('artifact_ref', 'artifact_ref_001')],
    feedback_payload: { quoted_feedback: 'Counter-evidence changes the need status.' },
    normalization_hints: {
      requires_recheck_hint: true,
      loopback_target_hint: 'validated_need',
      affected_ref_hint: affectedRef,
      reason_codes: ['need_invalidated'],
    },
    cited_refs: [bridgeRef, sourceRef, affectedRef],
    no_upstream_mutation_confirmed: true,
  };

  const validCreate = await app.inject({
    method: 'POST',
    url: '/create',
    payload: {
      paper_project_bridge_id: 'paper_project_bridge_001',
      workspace_id: 'workspace_001',
      downstream_source_kind: 'reviewer_check',
      downstream_source_ref: sourceRef,
      source_feedback_refs: [sourceRef],
      feedback_signal: 'need_invalidated',
      severity: 'critical',
      summary: 'Downstream reviewer check invalidated the claimed need.',
      required_action: 'Recheck the validated need against downstream counter-evidence.',
    },
  });
  const validCandidate = await app.inject({ method: 'POST', url: '/candidate', payload: candidate });
  const validClassification = await app.inject({ method: 'POST', url: '/classification', payload: classification });
  const validRecheck = await app.inject({ method: 'POST', url: '/recheck', payload: recheckRequest });
  const validImpact = await app.inject({ method: 'POST', url: '/impact', payload: impactSummary });
  const validRecord = await app.inject({ method: 'POST', url: '/record', payload: record });
  const invalidFreeTextOnly = await app.inject({
    method: 'POST',
    url: '/create',
    payload: { summary: 'Free-text feedback without typed source is not sufficient.' },
  });
  const invalidSourceKind = await app.inject({
    method: 'POST',
    url: '/create',
    payload: {
      paper_project_bridge_id: 'paper_project_bridge_001',
      downstream_source_kind: 'email',
      downstream_source_ref: sourceRef,
      feedback_signal: 'need_invalidated',
      severity: 'critical',
      summary: 'Unknown source kind should fail.',
    },
  });
  const invalidTarget = await app.inject({
    method: 'POST',
    url: '/classification',
    payload: { ...classification, loopback_target: 'unknown_target' },
  });
  const invalidCause = await app.inject({
    method: 'POST',
    url: '/classification',
    payload: { ...classification, loopback_cause: 'unknown_cause' },
  });
  const invalidSourceRef = await app.inject({
    method: 'POST',
    url: '/create',
    payload: {
      paper_project_bridge_id: 'paper_project_bridge_001',
      downstream_source_kind: 'reviewer_check',
      downstream_source_ref: { ref_type: 'reviewer_check' },
      feedback_signal: 'need_invalidated',
      severity: 'critical',
      summary: 'Malformed source ref should fail.',
    },
  });
  const invalidCandidateSchemaVersion = await app.inject({
    method: 'POST',
    url: '/candidate',
    payload: {
      ...candidate,
      schema_version: 'topic-selection-v1c-downstream-feedback-candidate.v0',
    },
  });
  await app.close();

  assert.equal(validCreate.statusCode, 200);
  assert.equal(validCandidate.statusCode, 200);
  assert.equal(validClassification.statusCode, 200);
  assert.equal(validRecheck.statusCode, 200);
  assert.equal(validImpact.statusCode, 200);
  assert.equal(validRecord.statusCode, 200);
  assert.equal(invalidFreeTextOnly.statusCode, 400);
  assert.equal(invalidSourceKind.statusCode, 400);
  assert.equal(invalidTarget.statusCode, 400);
  assert.equal(invalidCause.statusCode, 400);
  assert.equal(invalidSourceRef.statusCode, 400);
  assert.equal(invalidCandidateSchemaVersion.statusCode, 400);
});

test('topic-selection v1b constraint profile schema accepts draft constraint gaps', async () => {
  const app = Fastify();
  app.post('/v', {
    schema: {
      body: topicSelectionV1bIntakeContracts.topicSelectionResearchConstraintProfileRecordSchema,
    },
  }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      research_constraint_profile_id: 'research_constraint_profile_001',
      title_card_id: 'title_card_001',
      v1b_intake_snapshot_id: 'v1b_intake_snapshot_001',
      v1b_input_bundle_id: 'v1b_input_bundle_001',
      validated_need_id: 'validated_need_001',
      profile_version: 'v1',
      v1b_intake_snapshot_ref: functionalRefForSchema('v1b_intake_snapshot', 'v1b_intake_snapshot_001'),
      v1b_input_bundle_ref: functionalRefForSchema('v1a_to_v1b_input_bundle', 'v1b_input_bundle_001'),
      validated_need_ref: functionalRefForSchema('validated_need', 'validated_need_001'),
      target_community: '',
      method_constraints: [],
      resource_constraints: [],
      available_assets: [],
      feasibility_budget: {},
      non_goals: [],
      claim_ceiling: '',
      constraint_payload: {},
      artifact_refs: [],
      created_by: 'human',
      created_at: '2026-05-14T00:00:00.000Z',
    },
  });
  await app.close();
  assert.equal(res.statusCode, 200);
});

test('topic-selection offline-evaluation observed output rejects drifted final decision vocabulary', async () => {
  const app = Fastify();
  app.post(
    '/v',
    { schema: { body: topicSelectionOfflineEvaluationReplayContracts.topicSelectionOfflineEvaluationObservedOutputSchema } },
    async () => ({ ok: true }),
  );
  await app.ready();
  const validObservedOutput = {
    final_decision: 'validate',
    readiness_recommendation: 'ready_for_validation',
    key_evidence_refs: [],
    counter_evidence_refs: [],
    evidence_refs: [],
    blocker_codes: [],
    trace_refs: [],
    human_override_refs: [],
    recheck_action_refs: [],
    memory_refs: [],
    memory_used_as_evidence_refs: [],
    downstream_rework_causes: [],
    payload: {},
  };
  const valid = await app.inject({
    method: 'POST',
    url: '/v',
    payload: validObservedOutput,
  });
  const invalid = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      ...validObservedOutput,
      final_decision: 'promote_to_v1b',
    },
  });
  const invalidBaseline = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      ...validObservedOutput,
      baseline_observed_output: {
        ...validObservedOutput,
        final_decision: 'promote_to_v1b',
      },
    },
  });
  await app.close();

  assert.equal(valid.statusCode, 200);
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalidBaseline.statusCode, 400);
});

test('topic-selection offline-evaluation schemas accept v1b frozen replay payloads', async () => {
  const app = Fastify();
  app.post(
    '/v',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['bundle', 'gold', 'observed'],
          properties: {
            bundle: topicSelectionOfflineEvaluationReplayContracts.topicSelectionOfflineFrozenInputBundleSchema,
            gold: topicSelectionOfflineEvaluationReplayContracts.topicSelectionOfflineEvaluationGoldExpectationSchema,
            observed: topicSelectionOfflineEvaluationReplayContracts.topicSelectionOfflineEvaluationObservedOutputSchema,
          },
        },
      },
    },
    async () => ({ ok: true }),
  );
  await app.ready();
  const payload = {
    bundle: {
      stage: 'v1b',
      frozen_at: '2026-05-14T00:00:00.000Z',
      source_refs: [],
      artifact_refs: [],
      stage_snapshots: {
        v1b_intake: {},
        research_slice: {},
        topic_question_contract: {},
        topic_value_assessment: {},
        topic_package: {},
        v1c_input_bundle: {},
      },
      payload: {},
    },
    gold: {
      expected_unmet_need: true,
      expected_key_evidence_refs: [],
      expected_counter_evidence_refs: [],
      expected_blocker_codes: [],
      required_trace_refs: [],
      expected_recheck_action_refs: [],
      expected_negative_memory_refs: [],
      expected_downstream_rework_causes: [],
      allowed_slice_boundary_drift_codes: [],
      expected_answerability_passed: false,
      allowed_value_overclaim_codes: [],
      required_package_trace_refs: [functionalRefForSchema('topic_package', 'package_001')],
      expected_package_ready: false,
      expected_package_readiness_status: 'blocked',
      expected_downstream_loopback_causes: ['refine_question'],
      notes: ['v1b frozen replay fixture'],
    },
    observed: {
      key_evidence_refs: [],
      counter_evidence_refs: [],
      evidence_refs: [],
      blocker_codes: [],
      trace_refs: [],
      human_override_refs: [],
      recheck_action_refs: [],
      memory_refs: [],
      memory_used_as_evidence_refs: [],
      downstream_rework_causes: [],
      slice_boundary_drift_codes: ['target_community_expanded'],
      answerability_verdict: 'answerable',
      answerability_passed: true,
      value_overclaim_codes: ['production_superiority'],
      package_trace_refs: [],
      package_trace_verdict: 'incomplete',
      package_readiness_status: 'ready_for_promotion_review',
      package_readiness_passed: true,
      downstream_loopback_causes: ['refine_slice'],
      payload: {},
    },
  };
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload,
  });
  await app.close();

  assert.equal(res.statusCode, 200);
});

test('topic-selection offline-evaluation schemas accept v1c frozen replay payloads', async () => {
  const app = Fastify();
  app.post(
    '/v',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['bundle', 'gold', 'observed'],
          properties: {
            bundle: topicSelectionOfflineEvaluationReplayContracts.topicSelectionOfflineFrozenInputBundleSchema,
            gold: topicSelectionOfflineEvaluationReplayContracts.topicSelectionOfflineEvaluationGoldExpectationSchema,
            observed: topicSelectionOfflineEvaluationReplayContracts.topicSelectionOfflineEvaluationObservedOutputSchema,
          },
        },
      },
    },
    async () => ({ ok: true }),
  );
  await app.ready();
  const bridgeRef = functionalRefForSchema('paper_project_bridge', 'bridge_001');
  const evidenceRef = functionalRefForSchema('evidence_unit', 'evidence_001');
  const payload = {
    bundle: {
      stage: 'v1c',
      frozen_at: '2026-05-16T00:00:00.000Z',
      source_refs: [bridgeRef, evidenceRef],
      artifact_refs: [],
      stage_snapshots: {
        promotion_input_snapshot: {},
        promotion_decision_support: {},
        promotion_dossier: {},
        promotion_gate_check: {},
        argument_readiness_mini_check: {},
        human_promotion_decision: {},
        promotion_decision: {},
        promotion_commitment_profile: {},
        paper_project_bridge: {},
        downstream_feedback: {},
        downstream_recheck: {},
      },
      payload: {},
    },
    gold: {
      expected_unmet_need: true,
      expected_key_evidence_refs: [],
      expected_counter_evidence_refs: [],
      expected_blocker_codes: [],
      required_trace_refs: [],
      expected_recheck_action_refs: [],
      expected_negative_memory_refs: [],
      expected_downstream_rework_causes: [],
      expected_promotion_input_current: true,
      expected_promotion_input_closure_status: 'ready_for_gate',
      expected_promotion_gate_disposition: 'ready_for_human_decision',
      expected_promotion_gate_promote_allowed: true,
      expected_human_authorized: true,
      expected_promotion_bridge_eligible: true,
      required_bridge_trace_refs: [bridgeRef, evidenceRef],
      required_commitment_profile_fields: ['scope', 'claim_ceiling', 'conditions'],
      expected_loopback_target: 'topic_question',
      expected_loopback_cause: 'unanswerable_question',
      expected_downstream_mutation_blocked: true,
      notes: ['v1c frozen replay fixture'],
    },
    observed: {
      key_evidence_refs: [],
      counter_evidence_refs: [],
      evidence_refs: [],
      blocker_codes: [],
      trace_refs: [],
      human_override_refs: [],
      recheck_action_refs: [],
      memory_refs: [],
      memory_used_as_evidence_refs: [],
      downstream_rework_causes: [],
      promotion_input_current: true,
      promotion_input_closure_status: 'ready_for_gate',
      promotion_gate_disposition: 'ready_for_human_decision',
      promotion_gate_promote_allowed: true,
      human_promotion_authorized: true,
      human_promotion_decision: 'promote_to_paper_project',
      promotion_decision_bridge_eligible: true,
      bridge_trace_refs: [bridgeRef, evidenceRef],
      bridge_trace_verdict: 'complete',
      commitment_profile_present: true,
      commitment_profile_fields: ['scope', 'claim_ceiling', 'conditions'],
      loopback_target: 'topic_question',
      loopback_cause: 'unanswerable_question',
      downstream_mutation_attempted: true,
      downstream_mutation_blocked: true,
      payload: {},
    },
  };
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload,
  });
  const invalidDecision = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      ...payload,
      observed: {
        ...payload.observed,
        human_promotion_decision: 'auto_promote',
      },
    },
  });
  const invalidLoopbackCause = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      ...payload,
      gold: {
        ...payload.gold,
        expected_loopback_cause: 'generic_rework',
      },
    },
  });
  await app.close();

  assert.equal(res.statusCode, 200);
  assert.equal(invalidDecision.statusCode, 400);
  assert.equal(invalidLoopbackCause.statusCode, 400);
});

test('topic-selection evidence locator schema requires source_ref provenance', async () => {
  const app = Fastify();
  app.post(
    '/v',
    { schema: { body: topicSelectionEvidenceMapContracts.topicSelectionEvidenceSourceLocatorSchema } },
    async () => ({ ok: true }),
  );
  await app.ready();
  const valid = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      locator_type: 'abstract',
      locator_ref: functionalRefForSchema('literature_abstract', 'lit_001'),
      literature_ref: functionalRefForSchema('literature_record', 'lit_001'),
      source_ref: functionalRefForSchema('literature_source', 'source_001'),
    },
  });
  const invalid = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      locator_type: 'abstract',
      locator_ref: functionalRefForSchema('literature_abstract', 'lit_001'),
      literature_ref: functionalRefForSchema('literature_record', 'lit_001'),
    },
  });
  await app.close();

  assert.equal(valid.statusCode, 200);
  assert.equal(invalid.statusCode, 400);
});

test('validate with trivial schema', async () => {
  const app = Fastify();
  app.post('/v', { schema: { body: { type: 'object', required: ['x'], properties: { x: { type: 'string' } } } } }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({ method: 'POST', url: '/v', payload: { x: 'ok' } });
  await app.close();
  assert.equal(res.statusCode, 200);
});

test('title-card create schema accepts working_title and brief', async () => {
  const app = Fastify();
  app.post('/v', { schema: createTitleCardRequestSchema }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      working_title: 'Robust Retrieval for Literature Reasoning',
      brief: 'A working title card for robust retrieval direction.',
    },
  });
  await app.close();
  assert.equal(res.statusCode, 200);
});

test('need review schema accepts payload without evidence_review_refs', async () => {
  const app = Fastify();
  app.post('/v', { schema: createNeedReviewRequestSchema }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      need_statement: 'Existing methods degrade sharply under long-context retrieval settings.',
      who_needs_it: 'RAG researchers',
      scenario: 'Long-context retrieval and answer synthesis for CS literature tasks.',
      literature_ids: ['lit_001'],
      unmet_need_category: 'robustness',
      falsification_verdict: 'validated',
      significance_score: 4,
      measurability_score: 4,
      feasibility_signal: 'medium',
      validated_need: true,
      judgement_summary: 'The need is measurable and not already fully solved.',
      confidence: 0.82,
      evidence_refs: [{ literature_id: 'lit_001', source_type: 'abstract' }],
    },
  });
  await app.close();
  assert.equal(res.statusCode, 200);
});

test('research question schema requires at least one upstream source array', async () => {
  const app = Fastify();
  app.post('/v', { schema: createResearchQuestionRequestSchema }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      main_question: 'How can retrieval remain stable under long-context literature reasoning?',
      research_slice: 'robust long-context retrieval',
      contribution_hypothesis: 'method',
      judgement_summary: 'Question derived from validated robustness need.',
      confidence: 0.81,
    },
  });
  await app.close();
  assert.equal(res.statusCode, 400);
});

test('research question schema accepts canonical literature evidence ids and rejects legacy field name', async () => {
  const app = Fastify();
  app.post('/v', { schema: createResearchQuestionRequestSchema }, async () => ({ ok: true }));
  await app.ready();

  const canonicalRes = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      main_question: 'How can retrieval remain stable under long-context literature reasoning?',
      research_slice: 'robust long-context retrieval',
      contribution_hypothesis: 'method',
      source_literature_evidence_ids: ['lit_001'],
      judgement_summary: 'Question grounded in selected literature evidence.',
      confidence: 0.81,
    },
  });

  const legacyRes = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      main_question: 'How can retrieval remain stable under long-context literature reasoning?',
      research_slice: 'robust long-context retrieval',
      contribution_hypothesis: 'method',
      source_evidence_review_ids: ['lit_001'],
      judgement_summary: 'Question grounded in selected literature evidence.',
      confidence: 0.81,
    },
  });

  await app.close();
  assert.equal(canonicalRes.statusCode, 200);
  assert.equal(legacyRes.statusCode, 400);
});

test('promotion decision schema requires package_id and target_paper_title for promote verdict', async () => {
  const app = Fastify();
  app.post('/v', { schema: createPromotionDecisionRequestSchema }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      research_question_id: 'research_question_001',
      value_assessment_id: 'value_001',
      decision: 'promote',
      reason_summary: 'All gates pass.',
      created_by: 'hybrid',
    },
  });
  await app.close();
  assert.equal(res.statusCode, 400);
});

test('promotion decision schema requires loopback_target for loopback verdict', async () => {
  const app = Fastify();
  app.post('/v', { schema: createPromotionDecisionRequestSchema }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      research_question_id: 'research_question_001',
      value_assessment_id: 'value_001',
      decision: 'loopback',
      reason_summary: 'Need more evidence.',
      created_by: 'llm',
    },
  });
  await app.close();
  assert.equal(res.statusCode, 400);
});

test('promotion decision schema accepts valid promote payload', async () => {
  const app = Fastify();
  app.post('/v', { schema: createPromotionDecisionRequestSchema }, async () => ({ ok: true }));
  await app.ready();
  const res = await app.inject({
    method: 'POST',
    url: '/v',
    payload: {
      research_question_id: 'research_question_001',
      value_assessment_id: 'value_001',
      package_id: 'package_001',
      decision: 'promote',
      reason_summary: 'All gates pass and the package is aligned.',
      target_paper_title: 'Robust Retrieval for Literature Reasoning',
      created_by: 'hybrid',
    },
  });
  await app.close();
  assert.equal(res.statusCode, 200);
});

test('research-lifecycle barrel re-exports the runtime value surface of split modules', async () => {
  // Derive the expected surface straight from the barrel's own `export *` list (parsed
  // from index.ts) so this test cannot silently drift out of lockstep with the barrel.
  // Each re-exported module is dynamically imported — they are already loaded via the
  // static `index.js` import above, so this only reads cached namespaces — and the union
  // of their runtime value keys must equal the barrel's. Adding/removing a split module
  // therefore updates this expectation automatically; a module dropping out of the barrel
  // is the only way to fail.
  const exportStarSpecifiers = [
    ...readFileSync(new URL('./index.ts', import.meta.url), 'utf8').matchAll(
      /export\s+\*\s+from\s+['"](\.\/[^'"]+\.js)['"]/g,
    ),
  ].map((match) => match[1]);
  assert.ok(
    exportStarSpecifiers.length >= 40,
    `expected to parse the barrel's re-exported modules from index.ts, got ${exportStarSpecifiers.length}`,
  );

  const moduleNamespaces = await Promise.all(
    exportStarSpecifiers.map((specifier) => import(new URL(specifier, import.meta.url).href)),
  );
  const expectedKeys = new Set(
    moduleNamespaces.flatMap((namespace) => Object.keys(namespace)).filter((key) => key !== 'default'),
  );

  assert.deepEqual(Object.keys(researchLifecycleContracts).sort(), [...expectedKeys].sort());
});

test('research-lifecycle barrel keeps key contract helpers and schemas reachable', () => {
  assert.equal([...researchLifecycleContracts.AUTO_PULL_SOURCES].includes('ZOTERO'), true);
  assert.equal(
    [...researchLifecycleContracts.EXPERIMENT_FOUNDATION_DATASET_CATALOG_STATUSES].includes('active'),
    true,
  );
  assert.equal(
    [...researchLifecycleContracts.EXPERIMENT_FOUNDATION_EXECUTION_PROFILE_KINDS].includes('llm_fine_tuning'),
    true,
  );
  assert.ok(researchLifecycleContracts.experimentFoundationRunRecipeSchema);
  assert.ok(researchLifecycleContracts.experimentFoundationMaterializeTrainingTaskSpecRequestSchema);
  assert.ok(researchLifecycleContracts.experimentFoundationTrainingTaskSpecSchema);
  assert.ok(researchLifecycleContracts.experimentFoundationTrainingTaskMaterializationResultSchema);
  assert.equal(
    [...researchLifecycleContracts.EXPERIMENT_FOUNDATION_RESULT_VALIDATION_STATUSES].includes('accepted_partial'),
    true,
  );
  assert.ok(researchLifecycleContracts.experimentFoundationExperimentResultSchema);
  assert.ok(researchLifecycleContracts.experimentFoundationResultValidationReportSchema);
  assert.ok(researchLifecycleContracts.experimentFoundationEvidenceCandidateSchema);
  assert.ok(researchLifecycleContracts.experimentFoundationPaperExperimentSidecarSchema);
  assert.equal(
    [...researchLifecycleContracts.EXPERIMENT_FOUNDATION_ASSET_CANDIDATE_FAMILIES].includes('dataset'),
    true,
  );
  assert.ok(researchLifecycleContracts.experimentFoundationDatasetAssetCandidateSchema);
  assert.ok(researchLifecycleContracts.experimentFoundationAssetPromotionRequestSchema);
  assert.ok(researchLifecycleContracts.experimentFoundationAssetPromotionResultSchema);
  assert.equal(
    [...researchLifecycleContracts.EXPERIMENT_FOUNDATION_RECORD_KINDS].includes('dataset_asset'),
    true,
  );
  assert.equal(
    (researchLifecycleContracts.EXPERIMENT_FOUNDATION_RECORD_KINDS as readonly string[]).includes(
      'external_training_job',
    ),
    false,
  );
  assert.equal(
    [...researchLifecycleContracts.EXPERIMENT_FOUNDATION_EXTERNAL_TRAINING_JOB_STATUSES].includes('running'),
    true,
  );
  assert.ok(researchLifecycleContracts.createExperimentFoundationRecordRequestSchema);
  assert.ok(researchLifecycleContracts.experimentFoundationStoredRecordSchema);
  assert.ok(researchLifecycleContracts.experimentFoundationReadinessCheckRequestSchema);
  assert.ok(researchLifecycleContracts.experimentFoundationPromotionDecisionRequestSchema);
  assert.ok(researchLifecycleContracts.experimentFoundationExternalTrainingJobSchema);
  assert.ok(researchLifecycleContracts.submitExternalTrainingJobRequestSchema);
  assert.ok(researchLifecycleContracts.externalTrainingJobResponseSchema);
  assert.ok(researchLifecycleContracts.collectExternalTrainingJobRequestSchema);
  assert.equal([...researchLifecycleContracts.LITERATURE_CONTENT_PROCESSING_STAGE_CODES].includes('INDEXED'), true);
  assert.deepEqual([...researchLifecycleContracts.LITERATURE_CONTENT_PROCESSING_STAGE_CODES], [
    'CITATION_NORMALIZED',
    'ABSTRACT_READY',
    'FULLTEXT_PREPROCESSED',
    'KEY_CONTENT_READY',
    'CHUNKED',
    'EMBEDDED',
    'INDEXED',
  ]);
  assert.equal([...researchLifecycleContracts.LITERATURE_CONTENT_PROCESSING_STAGE_STATUSES].includes('STALE'), true);
  assert.deepEqual([...researchLifecycleContracts.LITERATURE_CONTENT_PROCESSING_ACTION_CODES], [
    'process_content',
    'process_to_retrievable',
    'rebuild_index',
    'reextract',
    'retry_failed',
    'view_reason',
  ]);
  assert.deepEqual([...researchLifecycleContracts.LITERATURE_CONTENT_PROCESSING_PROVIDER_IDS], ['openai', 'dashscope']);
  assert.deepEqual([...researchLifecycleContracts.LITERATURE_EMBEDDING_PROFILE_IDS], ['default', 'economy']);
  assert.deepEqual([...researchLifecycleContracts.LITERATURE_KEY_CONTENT_ITEM_PROVENANCES], ['model_generated', 'user_edited']);
  assert.deepEqual([...researchLifecycleContracts.LITERATURE_KEY_CONTENT_BACKFILL_CURATION_STATUSES], [
    'NOT_APPLICABLE',
    'CURATION_REQUIRED',
    'WAITING_FOR_DOSSIER',
    'READY_TO_IMPORT',
    'IMPORT_FAILED',
  ]);
  assert.ok(researchLifecycleContracts.updateLiteratureContentProcessingSettingsRequestSchema);
  assert.equal(
    researchLifecycleContracts.validateNoM6OverrideContext({
      candidate_node_ids: ['node-1'],
      config_version: 'cfg-1',
      reviewer_mode: 'hybrid',
      analysis_contract: 'no_m6',
      override_context: {
        skip_m6_reason: 'manual policy override',
        training_claim_allowed: false,
      },
    }).ok,
    true,
  );
  assert.ok(researchLifecycleContracts.createPaperProjectRequestSchema);
  assert.ok(researchLifecycleContracts.literatureCollectionImportRequestSchema);
  assert.ok(researchLifecycleContracts.createAutoPullRuleRequestSchema);
  assert.ok(researchLifecycleContracts.createResearchQuestionRequestSchema);
  assert.ok(researchLifecycleContracts.topicSelectionChainTransitionAttemptRecordSchema);
  assert.ok(researchLifecycleContracts.topicSelectionOfflineEvaluationMetricResultRecordSchema);
  assert.ok(researchLifecycleContracts.paperImplementationWritingEntryPacketSchema);
});
