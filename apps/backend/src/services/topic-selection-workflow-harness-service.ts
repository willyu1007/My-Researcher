import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionActorRef,
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
  TopicSelectionHumanConfirmedDecisionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  HumanConfirmationInput,
  HumanConfirmationSemanticReview,
  HumanConfirmationSemanticReviewContextPacket,
  PublishV1bInputBundleNodeInput,
  TopicSelectionAgentExecutionMode,
  TopicSelectionArtifactFunctionalRef,
  TopicSelectionGenerateNeedCandidateArtifactRefEntry,
  TopicSelectionGenerateNeedCandidateArtifactSnapshot,
  TopicSelectionGenerateNeedCandidateNodeInput,
  TopicSelectionNeedAdjudicationDecision,
  TopicSelectionNeedAdjudicationRecommendationPacket,
  TopicSelectionNeedCandidateReadinessAssessmentRecord,
  TopicSelectionNeedCandidateRecord,
  TopicSelectionNeedDiscoveryArbiterContextPayload,
  TopicSelectionNeedDiscoveryExplorationContextPayload,
  TopicSelectionNeedReadinessRecommendation,
  TopicSelectionHumanConfirmNeedNodeResult,
  TopicSelectionHumanConfirmNeedNodeStatus,
  TopicSelectionHumanConfirmNeedRouteOutcome,
  TopicSelectionPublishV1bInputBundleIdempotencyResult,
  TopicSelectionPublishV1bInputBundleNodeResult,
  TopicSelectionPublishV1bInputBundleNodeStatus,
  TopicSelectionPublishV1bInputBundleRouteOutcome,
  TopicSelectionRankedCandidateDraftBatch,
  TopicSelectionSupplementalRoundRoutingDecisionKind,
  TopicSelectionV1aToV1bInputBundleRecord,
  TopicSelectionValidateNeedAdjudicationNodeResult,
  TopicSelectionValidateNeedAdjudicationRouteOutcome,
  TopicSelectionValidateNeedAdjudicationNodeStatus,
  TopicSelectionValidateNeedAdjudicationResultRecord,
  TopicSelectionValidatedNeedRecord,
  TopicSelectionValidationDecisionSupportPacketRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  TOPIC_SELECTION_HUMAN_CONFIRM_NEED_NODE_RESULT_SCHEMA_VERSION,
  TOPIC_SELECTION_HUMAN_CONFIRMATION_INPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_CONTEXT_PACKET_SCHEMA_VERSION,
  TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
  TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
  TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_INPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_RESULT_SCHEMA_VERSION,
  TOPIC_SELECTION_VALIDATE_NEED_ADJUDICATION_NODE_RESULT_SCHEMA_VERSION,
  humanConfirmationSemanticReviewSchema,
  topicSelectionNeedAdjudicationRecommendationPacketSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  TopicSelectionAgentRunMode,
  TopicSelectionCodexAssistedAgentOutput,
  TopicSelectionExecutorKind,
  TopicSelectionMockedAgentOutput,
} from './topic-selection-agent-orchestrator-service.js';
import { TopicSelectionAgentOrchestratorService } from './topic-selection-agent-orchestrator-service.js';
import {
  type CompileNeedDiscoveryContextPairInput,
  type TopicSelectionNeedDiscoveryCompiledContextPairResult,
  TopicSelectionNeedDiscoveryContextCompilerService,
} from './topic-selection-need-discovery-context-compiler-service.js';
import {
  TopicSelectionV1aN6RuntimeContextCacheBindingService,
} from './topic-selection-v1a-n6-runtime-context-cache-binding-service.js';
import {
  type TopicSelectionV1aEvidenceExtractionCompressionPlan,
  type TopicSelectionV1aHumanConfirmationCompressionPlan,
  type TopicSelectionV1aLlmRuntimeInvocationBinding,
  type TopicSelectionV1aLlmRuntimeTokenBudgetOverrides,
  type TopicSelectionV1aNeedAdjudicationCompressionPlan,
  TopicSelectionV1aLlmRuntimeBindingService,
} from './topic-selection-v1a-llm-runtime-binding-service.js';
import { TopicSelectionNeedDiscoveryArtifactBoundaryService } from './topic-selection-need-discovery-artifact-boundary-service.js';
import {
  type TopicSelectionGenerateNeedCandidateOrchestratorAdapterResult,
  type TopicSelectionGenerateNeedCandidatePersistenceContext,
  type TopicSelectionGenerateNeedCandidateRuntimeTokenBudgetOverrides,
  TopicSelectionGenerateNeedCandidateOrchestratorAdapterService,
} from './topic-selection-generate-need-candidate-orchestrator-adapter-service.js';
import type {
  TopicSelectionNeedDiscoveryDebateCodexResponses,
  TopicSelectionNeedDiscoveryDebateMockedOutputs,
} from './topic-selection-need-discovery-debate-loop-service.js';
import type {
  TopicSelectionV1aGenerateNeedCandidateDebateExecutionPlan,
  TopicSelectionV1aGenerateNeedCandidateDebateSlotExecutionOverrides,
  TopicSelectionV1aGenerateNeedCandidateDebateSlotModelOptionOverrides,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-debate-scenario-contracts';
import type {
  TopicSelectionAgentExecutionSpec,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import {
  TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
  TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_RESULT_SCHEMA_VERSION,
  findTopicSelectionV1aWorkflowHarnessRouteEdge,
  type TopicSelectionV1aWorkflowHarnessNodeId,
  type TopicSelectionV1aWorkflowHarnessNodeStatus,
  type TopicSelectionV1aWorkflowHarnessRunRequest,
  type TopicSelectionV1aWorkflowHarnessRunResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1a-workflow-harness-contracts';
import type {
  TopicSelectionV1cHarnessAutomation,
  TopicSelectionV1cHarnessNodeId,
  TopicSelectionV1cHarnessNodeResult,
  TopicSelectionV1cHarnessRoutingOutcome,
} from './topic-selection-v1c-harness-adapter.js';
import {
  TOPIC_SELECTION_V1C_HARNESS_ADAPTER_VERSION,
} from './topic-selection-v1c-harness-adapter.js';
import type {
  TopicSelectionCoverageIntentType,
  TopicSelectionCoverageAssessmentRecord,
  TopicSelectionCoverageEvidenceBindingRecord,
  TopicSelectionCoverageExecutionObservationRecord,
  TopicSelectionCoverageRiskAcceptanceRecord,
  TopicSelectionCoverageRowIntentRecord,
  TopicSelectionEvidenceRole,
  TopicSelectionLiteratureResourcePoolSnapshotRecord,
  TopicSelectionResourcePoolSource,
  TopicSelectionSearchPlanBlueprint,
  TopicSelectionSearchPlanBlueprintCoverageIntent,
  TopicSelectionSearchPlanBlueprintOrigin,
  TopicSelectionSearchPlanRecord,
  TopicSelectionSearchRunCoverageRoleExpectation,
  TopicSelectionSearchRunHandoff,
  TopicSelectionSearchRunLoopbackSignal,
  TopicSelectionSearchRunRecord,
  TopicSelectionSearchRunRecordBundle,
  TopicSelectionSourceHealthSummary,
  TopicSelectionTopicSeedRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import type {
  TopicSelectionBuildEvidenceMapNodeInput,
  TopicSelectionEvidenceMapExtractionContextPacket,
  TopicSelectionEvidenceMapExtractionDraft,
  TopicSelectionEvidenceMapExtractionExecutionMode,
  TopicSelectionEvidenceMapExtractionReviewPackage,
  TopicSelectionEvidenceMapHandoff,
  TopicSelectionEvidenceMapMaterializationReport,
  TopicSelectionEvidenceMapMaterializationStatus,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import {
  TOPIC_SELECTION_BUILD_EVIDENCE_MAP_NODE_INPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_REVIEW_PACKAGE_SCHEMA_VERSION,
  TOPIC_SELECTION_EVIDENCE_MAP_HANDOFF_SCHEMA_VERSION,
  topicSelectionEvidenceMapExtractionDraftSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import {
  TOPIC_SELECTION_COVERAGE_INTENT_TYPES,
  TOPIC_SELECTION_EVIDENCE_ROLES,
  TOPIC_SELECTION_SEARCH_RUN_HANDOFF_SCHEMA_VERSION,
  TOPIC_SELECTION_SEARCH_RUN_LOOPBACK_SIGNAL_SCHEMA_VERSION,
  TOPIC_SELECTION_SEARCH_RUN_RECORD_BUNDLE_SCHEMA_VERSION,
  TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_SCHEMA_VERSION,
  TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_ORIGINS,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import type { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import type { TopicSelectionEvidenceMapCreateRecords } from '../repositories/topic-selection-evidence-map.repository.js';
import type { TopicSelectionEvidenceMapService } from './topic-selection-evidence-map-service.js';
import {
  TopicSelectionEvidenceMapMaterializationService,
} from './topic-selection-evidence-map-materialization-service.js';
import {
  TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID,
  TopicSelectionModelProfileRegistryService,
} from './topic-selection-model-profile-registry-service.js';
import {
  TopicSelectionContextPolicyProfileRegistryService,
} from './topic-selection-context-policy-profile-registry-service.js';
import { TopicSelectionContextPacketCacheService } from './topic-selection-context-packet-cache-service.js';
import type { TopicSelectionNeedValidationService } from './topic-selection-need-validation-service.js';
import type { TopicSelectionSearchResourceService } from './topic-selection-search-resource-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { TopicSelectionTokenBudgetGateService } from './topic-selection-token-budget-gate-service.js';
import {
  TopicSelectionCompressionRuntimeService,
  type TopicSelectionCompressionReportRuntimeResult,
} from './topic-selection-compression-runtime-service.js';

const CREATE_TOPIC_SEED_NODE_ID = 'topic-selection.v1a.create-topic-seed.v1' as const;
const SNAPSHOT_LITERATURE_RESOURCE_POOL_NODE_ID =
  'topic-selection.v1a.snapshot-literature-resource-pool.v1' as const;
const CREATE_SEARCH_PLAN_NODE_ID = 'topic-selection.v1a.create-search-plan.v1' as const;
const RECORD_SEARCH_RUN_NODE_ID = 'topic-selection.v1a.record-search-run.v1' as const;
const BUILD_EVIDENCE_MAP_NODE_ID = 'topic-selection.v1a.build-evidence-map.v1' as const;
const GENERATE_NEED_CANDIDATE_NODE_ID = 'topic-selection.v1a.generate-need-candidate.v1' as const;
const VALIDATE_NEED_ADJUDICATION_NODE_ID = 'topic-selection.v1a.validate-need-adjudication.v1' as const;
const HUMAN_CONFIRM_NEED_NODE_ID = 'topic-selection.v1a.human-confirm-need.v1' as const;
const PUBLISH_V1B_INPUT_BUNDLE_NODE_ID = 'topic-selection.v1a.publish-v1b-input-bundle.v1' as const;
const TOPIC_SEED_TRACE_PAYLOAD_SCHEMA = 'WorkflowHarnessCreateTopicSeedScenarioTrace@v1';
const LITERATURE_RESOURCE_POOL_TRACE_PAYLOAD_SCHEMA =
  'WorkflowHarnessSnapshotLiteratureResourcePoolScenarioTrace@v1';
const SEARCH_PLAN_TRACE_PAYLOAD_SCHEMA = 'WorkflowHarnessCreateSearchPlanScenarioTrace@v1';
const SEARCH_RUN_TRACE_PAYLOAD_SCHEMA = 'WorkflowHarnessRecordSearchRunScenarioTrace@v1';
const EVIDENCE_MAP_TRACE_PAYLOAD_SCHEMA = 'WorkflowHarnessBuildEvidenceMapScenarioTrace@v1';
const HARNESS_TRACE_PAYLOAD_SCHEMA = 'WorkflowHarnessGenerateNeedCandidateScenarioTrace@v1';
const NEED_ADJUDICATION_TRACE_PAYLOAD_SCHEMA = 'WorkflowHarnessValidateNeedAdjudicationScenarioTrace@v1';
const HUMAN_CONFIRM_NEED_TRACE_PAYLOAD_SCHEMA = 'WorkflowHarnessHumanConfirmNeedScenarioTrace@v1';
const PUBLISH_V1B_INPUT_BUNDLE_TRACE_PAYLOAD_SCHEMA = 'WorkflowHarnessPublishV1bInputBundleScenarioTrace@v1';
const V1C_CONSUMPTION_TRACE_PAYLOAD_SCHEMA = 'WorkflowHarnessV1cConsumptionScenarioTrace@v1';
export const TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_RUNTIME_CONTEXT_REF_PLACEHOLDER =
  '__runtime_context_packet_ref__';
const NORMALIZED_LITERATURE_RESOURCE_POOL_SOURCE_SCOPE = 'title_card_evidence_basket' as const;
const UNSUPPORTED_SOURCE_SCOPE_FOR_NORMALIZED_V1A = 'UNSUPPORTED_SOURCE_SCOPE_FOR_NORMALIZED_V1A';
const SEARCH_RUN_LOCATOR_PROVENANCE_REF_TYPES = new Set([
  'literature_abstract',
  'fulltext_document',
  'fulltext_section',
  'fulltext_paragraph',
  'fulltext_anchor',
  'manual_locator',
]);
const SEARCH_RUN_EVIDENCE_MAP_INPUT_REF_TYPES = new Set([
  'literature_record',
  'literature_source',
  ...SEARCH_RUN_LOCATOR_PROVENANCE_REF_TYPES,
]);
const SEARCH_RUN_EVIDENCE_BINDING_SOURCE_REF_TYPES = new Set([
  'literature_source',
  ...SEARCH_RUN_LOCATOR_PROVENANCE_REF_TYPES,
]);
const SEARCH_RUN_COVERAGE_RISK_REF_TYPES = new Set([
  'accepted_risk',
  'search_coverage_risk',
]);
const GENERATE_NEED_CANDIDATE_FORBIDDEN_BUSINESS_REF_TYPES = new Set([
  'evidence_map_extraction_draft',
  'evidence_map_extraction_context_packet',
  'evidence_map_review_package',
  'evidence_map_extraction_review_package',
  'evidence_map_materialization_report',
  'raw_model_output',
  'raw_provider_log',
  'raw_provider_response',
  'raw_fulltext_dump',
  'raw_search_log',
  'debate_transcript',
  'hidden_reasoning',
]);
const NEED_ADJUDICATION_HIGH_RISK_DECISIONS = new Set<TopicSelectionNeedAdjudicationDecision>([
  'reject',
  'merge',
  'park',
]);

type TopicSelectionWorkflowHarnessReplayProvenance = {
  replayed: true;
  source_workflow_run_id: string;
  source_node_attempt_id: string;
  source_trace_artifact_ref: TopicSelectionFunctionalRef;
  input_hash: string;
};

const NEED_ADJUDICATION_LOW_RISK_MODEL_DECISIONS = new Set<TopicSelectionNeedAdjudicationDecision>([
  'validate',
  'request_searchplan_recheck',
  'return_to_candidate',
]);

export type TopicSelectionWorkflowHarnessAssertion = {
  assertion_id: string;
  passed: boolean;
  message: string;
  expected?: unknown;
  actual?: unknown;
};

export type TopicSelectionWorkflowHarnessExpectation = {
  status?: TopicSelectionGenerateNeedCandidateOrchestratorAdapterResult['status'];
  routing_decision?: TopicSelectionSupplementalRoundRoutingDecisionKind | null;
  admitted_draft_count?: number | null;
  min_admitted_draft_count?: number | null;
  max_admitted_draft_count?: number | null;
  persisted_candidate_count?: number | null;
  min_persisted_candidate_count?: number | null;
  max_persisted_candidate_count?: number | null;
  error_code?: string | null;
  blocker_codes?: string[];
  persistence?: 'required' | 'forbidden' | 'optional';
};

export type TopicSelectionWorkflowHarnessCreateTopicSeedExpectation = {
  status?: 'succeeded' | 'blocked';
  error_code?: string | null;
  seed_version?: string | null;
  intent_summary?: string | null;
};

export type TopicSelectionWorkflowHarnessCreateTopicSeedInput = {
  scenario_id: string;
  scenario_case_id?: string | null;
  workspace_id?: string | null;
  title_card_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  seed_version?: string | null;
  intent_summary?: string | null;
  scope_notes?: string | null;
  intent_preparation_refs?: TopicSelectionFunctionalRef[];
  policy_version: string;
  output_schema_version: string;
  expectations?: TopicSelectionWorkflowHarnessCreateTopicSeedExpectation;
  created_by?: TopicSelectionActorType;
};

export type TopicSelectionWorkflowHarnessCreateTopicSeedNodeInput = {
  schema_version: string;
  workspace_id: string | null;
  title_card_id: string;
  seed_version: string | null;
  intent_summary: string | null;
  scope_notes: string | null;
  intent_preparation_refs: TopicSelectionFunctionalRef[];
  policy_version_id: string;
  created_by: TopicSelectionActorType;
};

export type TopicSelectionWorkflowHarnessCreateTopicSeedNodeResult = {
  status: 'succeeded' | 'blocked';
  topic_seed: TopicSelectionTopicSeedRecord | null;
  topic_seed_ref: TopicSelectionFunctionalRef | null;
  authority_refs: TopicSelectionFunctionalRef[];
  audit_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  warning_codes: string[];
  blocker_codes: string[];
  error_code: string | null;
  error_message: string | null;
  replay_provenance: TopicSelectionWorkflowHarnessReplayProvenance | null;
};

export type TopicSelectionWorkflowHarnessCreateTopicSeedTraceSnapshot = {
  schema_version: 'topic-selection-workflow-harness-trace-v1';
  payload_schema: typeof TOPIC_SEED_TRACE_PAYLOAD_SCHEMA;
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof CREATE_TOPIC_SEED_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  input_hash: string;
  scenario_status: 'passed' | 'failed';
  node_status: 'succeeded' | 'blocked';
  node_input: TopicSelectionWorkflowHarnessCreateTopicSeedNodeInput;
  node_result: TopicSelectionWorkflowHarnessCreateTopicSeedNodeResult;
  authority_refs: TopicSelectionFunctionalRef[];
  audit_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  warning_codes: string[];
  blocker_codes: string[];
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  created_at: string;
};

export type TopicSelectionWorkflowHarnessCreateTopicSeedResult = {
  schema_version: 'v1';
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof CREATE_TOPIC_SEED_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  node_input: TopicSelectionWorkflowHarnessCreateTopicSeedNodeInput;
  node_result: TopicSelectionWorkflowHarnessCreateTopicSeedNodeResult;
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  harness_trace_snapshot: TopicSelectionWorkflowHarnessCreateTopicSeedTraceSnapshot;
  harness_trace_artifact: TopicSelectionArtifactRefRecord;
  harness_trace_artifact_ref: TopicSelectionFunctionalRef;
};

export type TopicSelectionWorkflowHarnessCreateSearchPlanExpectation = {
  status?: 'succeeded' | 'blocked';
  error_code?: string | null;
  blocker_codes?: string[];
  coverage_row_count?: number | null;
  plan_version?: string | null;
};

export type TopicSelectionWorkflowHarnessCreateSearchPlanInput = {
  scenario_id: string;
  scenario_case_id?: string | null;
  workspace_id?: string | null;
  title_card_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  blueprint?: TopicSelectionSearchPlanBlueprint | null;
  expectations?: TopicSelectionWorkflowHarnessCreateSearchPlanExpectation;
  created_by?: TopicSelectionActorType;
};

export type TopicSelectionWorkflowHarnessCreateSearchPlanNodeInput = {
  schema_version: string;
  workspace_id: string | null;
  title_card_id: string;
  blueprint: TopicSelectionSearchPlanBlueprint | null;
  created_by: TopicSelectionActorType;
};

export type TopicSelectionWorkflowHarnessCreateSearchPlanNodeResult = {
  status: 'succeeded' | 'blocked';
  search_plan: TopicSelectionSearchPlanRecord | null;
  search_plan_ref: TopicSelectionFunctionalRef | null;
  coverage_row_intents: TopicSelectionCoverageRowIntentRecord[];
  coverage_row_intent_refs: TopicSelectionFunctionalRef[];
  plan_version: string | null;
  query_intents: string[];
  must_check_constraints: string[];
  exclusion_rules: string[];
  authority_refs: TopicSelectionFunctionalRef[];
  audit_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  warning_codes: string[];
  blocker_codes: string[];
  error_code: string | null;
  error_message: string | null;
  replay_provenance: TopicSelectionWorkflowHarnessReplayProvenance | null;
};

export type TopicSelectionWorkflowHarnessCreateSearchPlanTraceSnapshot = {
  schema_version: 'topic-selection-workflow-harness-trace-v1';
  payload_schema: typeof SEARCH_PLAN_TRACE_PAYLOAD_SCHEMA;
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof CREATE_SEARCH_PLAN_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  input_hash: string;
  scenario_status: 'passed' | 'failed';
  node_status: 'succeeded' | 'blocked';
  node_input: TopicSelectionWorkflowHarnessCreateSearchPlanNodeInput;
  node_result: TopicSelectionWorkflowHarnessCreateSearchPlanNodeResult;
  blueprint_origin: TopicSelectionSearchPlanBlueprintOrigin | null;
  blueprint_provenance_refs: TopicSelectionFunctionalRef[];
  expected_snapshot_hash: string | null;
  resolved_snapshot_hash: string | null;
  query_intents: string[];
  coverage_intents: TopicSelectionSearchPlanBlueprintCoverageIntent[];
  search_plan_ref: TopicSelectionFunctionalRef | null;
  coverage_row_intent_refs: TopicSelectionFunctionalRef[];
  authority_refs: TopicSelectionFunctionalRef[];
  audit_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  warning_codes: string[];
  blocker_codes: string[];
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  created_at: string;
};

export type TopicSelectionWorkflowHarnessCreateSearchPlanResult = {
  schema_version: 'v1';
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof CREATE_SEARCH_PLAN_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  node_input: TopicSelectionWorkflowHarnessCreateSearchPlanNodeInput;
  node_result: TopicSelectionWorkflowHarnessCreateSearchPlanNodeResult;
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  harness_trace_snapshot: TopicSelectionWorkflowHarnessCreateSearchPlanTraceSnapshot;
  harness_trace_artifact: TopicSelectionArtifactRefRecord;
  harness_trace_artifact_ref: TopicSelectionFunctionalRef;
};

type TopicSelectionCreateSearchPlanBlockedValidationResult = {
  blocked: true;
  error_code: string;
  error_message: string;
  blocker_codes: string[];
  resolved_snapshot_hash: string | null;
};

type TopicSelectionCreateSearchPlanValidationResult =
  | TopicSelectionCreateSearchPlanBlockedValidationResult
  | {
      blocked: false;
      error_code: null;
      error_message: null;
      blocker_codes: [];
      resolved_snapshot_hash: string;
    };

export type TopicSelectionWorkflowHarnessRecordSearchRunExpectation = {
  status?: 'succeeded' | 'blocked';
  error_code?: string | null;
  blocker_codes?: string[];
  consumable_for_evidence_map?: boolean | null;
  downstream_handoff_present?: boolean | null;
  loopback_signal_present?: boolean | null;
};

export type TopicSelectionWorkflowHarnessRecordSearchRunInput = {
  scenario_id: string;
  scenario_case_id?: string | null;
  workspace_id?: string | null;
  title_card_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  bundle?: TopicSelectionSearchRunRecordBundle | null;
  expectations?: TopicSelectionWorkflowHarnessRecordSearchRunExpectation;
  created_by?: TopicSelectionActorType;
};

export type TopicSelectionWorkflowHarnessRecordSearchRunNodeInput = {
  schema_version: string;
  workspace_id: string | null;
  title_card_id: string;
  bundle: TopicSelectionSearchRunRecordBundle | null;
  created_by: TopicSelectionActorType;
};

export type TopicSelectionWorkflowHarnessRecordSearchRunNodeResult = {
  status: 'succeeded' | 'blocked';
  search_run: TopicSelectionSearchRunRecord | null;
  search_run_ref: TopicSelectionFunctionalRef | null;
  consumable_for_evidence_map: boolean;
  downstream_handoff: TopicSelectionSearchRunHandoff | null;
  loopback_signal: TopicSelectionSearchRunLoopbackSignal | null;
  result_accounting_summary: Record<string, unknown>;
  evidence_binding_refs: TopicSelectionFunctionalRef[];
  coverage_assessment_refs: TopicSelectionFunctionalRef[];
  coverage_matrix_summary: Record<string, unknown> | null;
  authority_refs: TopicSelectionFunctionalRef[];
  audit_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  warning_codes: string[];
  blocker_codes: string[];
  error_code: string | null;
  error_message: string | null;
  replay_provenance: TopicSelectionWorkflowHarnessReplayProvenance | null;
};

export type TopicSelectionWorkflowHarnessRecordSearchRunTraceSnapshot = {
  schema_version: 'topic-selection-workflow-harness-trace-v1';
  payload_schema: typeof SEARCH_RUN_TRACE_PAYLOAD_SCHEMA;
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof RECORD_SEARCH_RUN_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  input_hash: string;
  scenario_status: 'passed' | 'failed';
  node_status: 'succeeded' | 'blocked';
  node_input: TopicSelectionWorkflowHarnessRecordSearchRunNodeInput;
  node_result: TopicSelectionWorkflowHarnessRecordSearchRunNodeResult;
  consumable_for_evidence_map: boolean;
  search_run_ref: TopicSelectionFunctionalRef | null;
  downstream_handoff: TopicSelectionSearchRunHandoff | null;
  loopback_signal: TopicSelectionSearchRunLoopbackSignal | null;
  authority_refs: TopicSelectionFunctionalRef[];
  audit_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  warning_codes: string[];
  blocker_codes: string[];
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  created_at: string;
};

export type TopicSelectionWorkflowHarnessRecordSearchRunResult = {
  schema_version: 'v1';
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof RECORD_SEARCH_RUN_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  node_input: TopicSelectionWorkflowHarnessRecordSearchRunNodeInput;
  node_result: TopicSelectionWorkflowHarnessRecordSearchRunNodeResult;
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  harness_trace_snapshot: TopicSelectionWorkflowHarnessRecordSearchRunTraceSnapshot;
  harness_trace_artifact: TopicSelectionArtifactRefRecord;
  harness_trace_artifact_ref: TopicSelectionFunctionalRef;
};

type TopicSelectionRecordSearchRunBlockedValidationResult = {
  blocked: true;
  error_code: string;
  error_message: string;
  blocker_codes: string[];
};

type TopicSelectionRecordSearchRunValidationResult =
  | TopicSelectionRecordSearchRunBlockedValidationResult
  | {
      blocked: false;
      error_code: null;
      error_message: null;
      blocker_codes: [];
    };

export type TopicSelectionWorkflowHarnessBuildEvidenceMapExpectation = {
  status?: 'succeeded' | 'blocked' | 'review_required';
  materialization_status?: TopicSelectionEvidenceMapMaterializationStatus | null;
  error_code?: string | null;
  blocker_codes?: string[];
  warning_codes?: string[];
  evidence_unit_count?: number | null;
  downstream_handoff_present?: boolean | null;
};

export type TopicSelectionWorkflowHarnessBuildEvidenceMapInput = {
  scenario_id: string;
  scenario_case_id?: string | null;
  workspace_id?: string | null;
  title_card_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  search_run_handoff?: TopicSelectionSearchRunHandoff | null;
  extraction_context_packet?: TopicSelectionEvidenceMapExtractionContextPacket | null;
  extraction_context_packet_ref?: TopicSelectionFunctionalRef | null;
  extraction_draft?: TopicSelectionEvidenceMapExtractionDraft | null;
  execution_mode: TopicSelectionEvidenceMapExtractionExecutionMode;
  execution_spec?: TopicSelectionAgentExecutionSpec | null;
  run_mode?: TopicSelectionAgentRunMode;
  executor_kind?: TopicSelectionExecutorKind;
  profile_id?: string | null;
  mocked_output?: TopicSelectionMockedAgentOutput<TopicSelectionEvidenceMapExtractionDraft> | null;
  codex_response?: TopicSelectionCodexAssistedAgentOutput<TopicSelectionEvidenceMapExtractionDraft> | null;
  model_option_id?: string | null;
  runtime_token_budget_overrides?: TopicSelectionV1aLlmRuntimeTokenBudgetOverrides | null;
  revision_of_attempt_ref?: TopicSelectionFunctionalRef | null;
  review_package_ref?: TopicSelectionFunctionalRef | null;
  operator_reuse_approval_ref?: TopicSelectionFunctionalRef | null;
  policy_version: string;
  output_schema_version: string;
  expectations?: TopicSelectionWorkflowHarnessBuildEvidenceMapExpectation;
  created_by?: TopicSelectionActorType;
};

export type TopicSelectionWorkflowHarnessBuildEvidenceMapNodeResult = {
  status: 'succeeded' | 'blocked' | 'review_required';
  agent_invocation_audit_ref: TopicSelectionFunctionalRef | null;
  agent_invocation_status: 'not_invoked' | 'succeeded' | 'blocked';
  context_compression_report_ref: TopicSelectionFunctionalRef | null;
  materialization_report: TopicSelectionEvidenceMapMaterializationReport;
  review_package: TopicSelectionEvidenceMapExtractionReviewPackage | null;
  evidence_map_records: TopicSelectionEvidenceMapCreateRecords | null;
  evidence_map_ref: TopicSelectionFunctionalRef | null;
  evidence_unit_refs: TopicSelectionFunctionalRef[];
  downstream_handoff: TopicSelectionEvidenceMapHandoff | null;
  authority_refs: TopicSelectionFunctionalRef[];
  audit_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  warning_codes: string[];
  blocker_codes: string[];
  error_code: string | null;
  error_message: string | null;
  replay_provenance: TopicSelectionWorkflowHarnessReplayProvenance | null;
};

export type TopicSelectionWorkflowHarnessBuildEvidenceMapTraceSnapshot = {
  schema_version: 'topic-selection-workflow-harness-trace-v1';
  payload_schema: typeof EVIDENCE_MAP_TRACE_PAYLOAD_SCHEMA;
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof BUILD_EVIDENCE_MAP_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  node_status: 'succeeded' | 'blocked' | 'review_required';
  node_input: TopicSelectionBuildEvidenceMapNodeInput;
  node_result: TopicSelectionWorkflowHarnessBuildEvidenceMapNodeResult;
  materialization_report: TopicSelectionEvidenceMapMaterializationReport;
  review_package: TopicSelectionEvidenceMapExtractionReviewPackage | null;
  downstream_handoff: TopicSelectionEvidenceMapHandoff | null;
  authority_refs: TopicSelectionFunctionalRef[];
  audit_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  warning_codes: string[];
  blocker_codes: string[];
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  created_at: string;
};

export type TopicSelectionWorkflowHarnessBuildEvidenceMapResult = {
  schema_version: 'v1';
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof BUILD_EVIDENCE_MAP_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  node_input: TopicSelectionBuildEvidenceMapNodeInput;
  node_result: TopicSelectionWorkflowHarnessBuildEvidenceMapNodeResult;
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  harness_trace_snapshot: TopicSelectionWorkflowHarnessBuildEvidenceMapTraceSnapshot;
  harness_trace_artifact: TopicSelectionArtifactRefRecord;
  harness_trace_artifact_ref: TopicSelectionFunctionalRef;
};

export type TopicSelectionWorkflowHarnessValidateNeedAdjudicationPacketMode =
  | 'create_fresh'
  | 'consume_explicit_ref';

export type TopicSelectionWorkflowHarnessValidateNeedAdjudicationExpectation = {
  status?: TopicSelectionValidateNeedAdjudicationNodeStatus;
  route_outcome?: TopicSelectionValidateNeedAdjudicationRouteOutcome | null;
  final_decision?: TopicSelectionNeedAdjudicationDecision | null;
  error_code?: string | null;
  blocker_codes?: string[];
  warning_codes?: string[];
  review_reason_codes?: string[];
  adjudication_created?: boolean | null;
};

export type TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput = {
  scenario_id: string;
  scenario_case_id?: string | null;
  workspace_id?: string | null;
  title_card_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  need_candidate_ref: TopicSelectionFunctionalRef;
  evidence_map_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  readiness_assessment_ref?: TopicSelectionFunctionalRef | null;
  validation_support_packet_ref?: TopicSelectionFunctionalRef | null;
  readiness_packet_mode?: TopicSelectionWorkflowHarnessValidateNeedAdjudicationPacketMode;
  support_packet_mode?: TopicSelectionWorkflowHarnessValidateNeedAdjudicationPacketMode;
  execution_mode: TopicSelectionAgentExecutionMode;
  execution_spec?: TopicSelectionAgentExecutionSpec | null;
  run_mode?: TopicSelectionAgentRunMode;
  executor_kind?: TopicSelectionExecutorKind;
  profile_id?: string | null;
  mocked_output?: TopicSelectionMockedAgentOutput<TopicSelectionNeedAdjudicationRecommendationPacket> | null;
  codex_response?: TopicSelectionCodexAssistedAgentOutput<TopicSelectionNeedAdjudicationRecommendationPacket> | null;
  model_option_id?: string | null;
  runtime_token_budget_overrides?: TopicSelectionV1aLlmRuntimeTokenBudgetOverrides | null;
  diagnostic_prompt_appendix?: string | null;
  adjudication_actor?: TopicSelectionActorRef | null;
  fixture_human_decision?: boolean;
  policy_version: string;
  output_schema_version: string;
  expectations?: TopicSelectionWorkflowHarnessValidateNeedAdjudicationExpectation;
  created_by?: TopicSelectionActorType;
};

export type TopicSelectionWorkflowHarnessValidateNeedAdjudicationNodeInput = {
  schema_version: string;
  workflow_run_id: string;
  node_attempt_id: string;
  title_card_ref: TopicSelectionFunctionalRef;
  need_candidate_ref: TopicSelectionFunctionalRef;
  evidence_map_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  readiness_assessment_ref: TopicSelectionFunctionalRef | null;
  validation_support_packet_ref: TopicSelectionFunctionalRef | null;
  readiness_packet_mode: TopicSelectionWorkflowHarnessValidateNeedAdjudicationPacketMode;
  support_packet_mode: TopicSelectionWorkflowHarnessValidateNeedAdjudicationPacketMode;
  execution_mode: TopicSelectionAgentExecutionMode;
  execution_spec: TopicSelectionAgentExecutionSpec | null;
  profile_id: string;
  policy_version: string;
  output_schema_version: string;
};

export type TopicSelectionWorkflowHarnessValidateNeedAdjudicationTraceSnapshot = {
  schema_version: 'topic-selection-workflow-harness-trace-v1';
  payload_schema: typeof NEED_ADJUDICATION_TRACE_PAYLOAD_SCHEMA;
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof VALIDATE_NEED_ADJUDICATION_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  node_status: TopicSelectionValidateNeedAdjudicationNodeStatus;
  input_hash: string;
  node_input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationNodeInput;
  node_result: TopicSelectionValidateNeedAdjudicationNodeResult;
  recommendation_packet: TopicSelectionNeedAdjudicationRecommendationPacket | null;
  authority_refs: TopicSelectionFunctionalRef[];
  audit_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  warning_codes: string[];
  blocker_codes: string[];
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  created_at: string;
};

export type TopicSelectionWorkflowHarnessValidateNeedAdjudicationResult = {
  schema_version: 'v1';
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof VALIDATE_NEED_ADJUDICATION_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  node_input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationNodeInput;
  node_result: TopicSelectionValidateNeedAdjudicationNodeResult;
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  harness_trace_snapshot: TopicSelectionWorkflowHarnessValidateNeedAdjudicationTraceSnapshot;
  harness_trace_artifact: TopicSelectionArtifactRefRecord;
  harness_trace_artifact_ref: TopicSelectionFunctionalRef;
};

export type TopicSelectionWorkflowHarnessHumanConfirmNeedExpectation = {
  status?: TopicSelectionHumanConfirmNeedNodeStatus;
  route_outcome?: TopicSelectionHumanConfirmNeedRouteOutcome | null;
  error_code?: string | null;
  blocker_codes?: string[];
  review_reason_codes?: string[];
  validated_need_created?: boolean | null;
  v1b_bundle_created?: boolean | null;
};

export type TopicSelectionWorkflowHarnessHumanConfirmNeedExecutionMode =
  | TopicSelectionAgentExecutionMode
  | 'deterministic_parser';

export type TopicSelectionWorkflowHarnessHumanConfirmNeedInput = {
  scenario_id: string;
  scenario_case_id?: string | null;
  workspace_id?: string | null;
  title_card_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  adjudication_result_ref: TopicSelectionFunctionalRef;
  need_candidate_ref: TopicSelectionFunctionalRef;
  validation_support_packet_ref: TopicSelectionFunctionalRef;
  reserved_validated_need_ref: TopicSelectionFunctionalRef;
  confirmation_input: HumanConfirmationInput;
  execution_mode?: TopicSelectionWorkflowHarnessHumanConfirmNeedExecutionMode;
  execution_spec?: TopicSelectionAgentExecutionSpec | null;
  run_mode?: TopicSelectionAgentRunMode;
  executor_kind?: TopicSelectionExecutorKind;
  profile_id?: string | null;
  model_option_id?: string | null;
  runtime_token_budget_overrides?: TopicSelectionV1aLlmRuntimeTokenBudgetOverrides | null;
  mocked_output?: TopicSelectionMockedAgentOutput<HumanConfirmationSemanticReview> | null;
  codex_response?: TopicSelectionCodexAssistedAgentOutput<HumanConfirmationSemanticReview> | null;
  policy_version: string;
  output_schema_version: string;
  expectations?: TopicSelectionWorkflowHarnessHumanConfirmNeedExpectation;
  created_by?: TopicSelectionActorType;
};

export type TopicSelectionWorkflowHarnessHumanConfirmNeedNodeInput = {
  schema_version: string;
  workflow_run_id: string;
  node_attempt_id: string;
  title_card_ref: TopicSelectionFunctionalRef;
  adjudication_result_ref: TopicSelectionFunctionalRef;
  need_candidate_ref: TopicSelectionFunctionalRef;
  validation_support_packet_ref: TopicSelectionFunctionalRef;
  reserved_validated_need_ref: TopicSelectionFunctionalRef;
  confirmation_input: HumanConfirmationInput;
  execution_mode: TopicSelectionWorkflowHarnessHumanConfirmNeedExecutionMode;
  execution_spec: TopicSelectionAgentExecutionSpec | null;
  run_mode: TopicSelectionAgentRunMode;
  executor_kind: TopicSelectionExecutorKind;
  model_option_id: string | null;
  profile_id: string;
  policy_version: string;
  output_schema_version: string;
};

export type TopicSelectionWorkflowHarnessHumanConfirmNeedTraceSnapshot = {
  schema_version: 'topic-selection-workflow-harness-trace-v1';
  payload_schema: typeof HUMAN_CONFIRM_NEED_TRACE_PAYLOAD_SCHEMA;
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof HUMAN_CONFIRM_NEED_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  node_status: TopicSelectionHumanConfirmNeedNodeStatus;
  input_hash: string;
  node_input: TopicSelectionWorkflowHarnessHumanConfirmNeedNodeInput;
  node_result: TopicSelectionHumanConfirmNeedNodeResult;
  semantic_review_context_packet: HumanConfirmationSemanticReviewContextPacket | null;
  semantic_review: HumanConfirmationSemanticReview | null;
  authority_refs: TopicSelectionFunctionalRef[];
  audit_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  warning_codes: string[];
  blocker_codes: string[];
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  created_at: string;
};

export type TopicSelectionWorkflowHarnessHumanConfirmNeedResult = {
  schema_version: 'v1';
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof HUMAN_CONFIRM_NEED_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  node_input: TopicSelectionWorkflowHarnessHumanConfirmNeedNodeInput;
  node_result: TopicSelectionHumanConfirmNeedNodeResult;
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  harness_trace_snapshot: TopicSelectionWorkflowHarnessHumanConfirmNeedTraceSnapshot;
  harness_trace_artifact: TopicSelectionArtifactRefRecord;
  harness_trace_artifact_ref: TopicSelectionFunctionalRef;
};

export type TopicSelectionWorkflowHarnessPublishV1bInputBundleExpectation = {
  status?: TopicSelectionPublishV1bInputBundleNodeStatus;
  route_outcome?: TopicSelectionPublishV1bInputBundleRouteOutcome | null;
  error_code?: string | null;
  blocker_codes?: string[];
  idempotency_result?: TopicSelectionPublishV1bInputBundleIdempotencyResult | null;
  bundle_published?: boolean | null;
};

export type TopicSelectionWorkflowHarnessPublishV1bInputBundleInput = {
  scenario_id: string;
  scenario_case_id?: string | null;
  workspace_id?: string | null;
  title_card_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  validated_need_ref: TopicSelectionFunctionalRef;
  source_need_candidate_ref: TopicSelectionFunctionalRef;
  adjudication_result_ref: TopicSelectionFunctionalRef;
  support_packet_ref: TopicSelectionFunctionalRef;
  human_decision_ref: TopicSelectionFunctionalRef;
  evidence_map_ref: TopicSelectionFunctionalRef;
  search_run_ref: TopicSelectionFunctionalRef;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_snapshot_ref: TopicSelectionFunctionalRef;
  evidence_role_bundle: PublishV1bInputBundleNodeInput['evidence_role_bundle'];
  risk_refs: TopicSelectionFunctionalRef[];
  memory_suggestion_refs?: TopicSelectionFunctionalRef[];
  recheck_request_refs?: TopicSelectionFunctionalRef[];
  expected_bundle_version: string;
  policy_version: string;
  output_schema_version: string;
  expectations?: TopicSelectionWorkflowHarnessPublishV1bInputBundleExpectation;
  created_by?: TopicSelectionActorType;
};

export type TopicSelectionWorkflowHarnessPublishV1bInputBundleNodeInput = PublishV1bInputBundleNodeInput;

export type TopicSelectionWorkflowHarnessPublishV1bInputBundleTraceSnapshot = {
  schema_version: 'topic-selection-workflow-harness-trace-v1';
  payload_schema: typeof PUBLISH_V1B_INPUT_BUNDLE_TRACE_PAYLOAD_SCHEMA;
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof PUBLISH_V1B_INPUT_BUNDLE_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  node_status: TopicSelectionPublishV1bInputBundleNodeStatus;
  input_hash: string;
  node_input: TopicSelectionWorkflowHarnessPublishV1bInputBundleNodeInput;
  node_result: TopicSelectionPublishV1bInputBundleNodeResult;
  v1b_input_bundle: TopicSelectionV1aToV1bInputBundleRecord | null;
  authority_refs: TopicSelectionFunctionalRef[];
  audit_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  warning_codes: string[];
  blocker_codes: string[];
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  created_at: string;
};

export type TopicSelectionWorkflowHarnessPublishV1bInputBundleResult = {
  schema_version: 'v1';
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof PUBLISH_V1B_INPUT_BUNDLE_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  node_input: TopicSelectionWorkflowHarnessPublishV1bInputBundleNodeInput;
  node_result: TopicSelectionPublishV1bInputBundleNodeResult;
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  harness_trace_snapshot: TopicSelectionWorkflowHarnessPublishV1bInputBundleTraceSnapshot;
  harness_trace_artifact: TopicSelectionArtifactRefRecord;
  harness_trace_artifact_ref: TopicSelectionFunctionalRef;
};

type TopicSelectionEvidenceMapExtractionResolution = {
  draft: TopicSelectionEvidenceMapExtractionDraft | null;
  agent_invocation_audit_ref: TopicSelectionFunctionalRef | null;
  agent_invocation_status: 'not_invoked' | 'succeeded' | 'blocked';
  context_compression_report_ref: TopicSelectionFunctionalRef | null;
  warning_codes: string[];
  blocker_codes: string[];
  error_code: string | null;
};

export type TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolExpectation = {
  status?: 'succeeded' | 'blocked';
  error_code?: string | null;
  blocker_codes?: string[];
  warning_codes?: string[];
  snapshot_hash?: string | null;
  included_literature_count?: number | null;
  content_source_count?: number | null;
};

export type TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolInput = {
  scenario_id: string;
  scenario_case_id?: string | null;
  workspace_id?: string | null;
  title_card_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  topic_seed_ref: TopicSelectionFunctionalRef;
  source_scope: TopicSelectionResourcePoolSource;
  resource_sample_set_provenance_ref?: TopicSelectionFunctionalRef | null;
  policy_version: string;
  output_schema_version: string;
  expectations?: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolExpectation;
  created_by?: TopicSelectionActorType;
};

export type TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeInput = {
  schema_version: string;
  workspace_id: string | null;
  title_card_id: string;
  topic_seed_ref: TopicSelectionFunctionalRef;
  source_scope: TopicSelectionResourcePoolSource;
  resource_sample_set_provenance_ref: TopicSelectionFunctionalRef | null;
  policy_version_id: string;
  created_by: TopicSelectionActorType;
};

export type TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolHandoff = {
  literature_resource_pool_snapshot_ref: TopicSelectionFunctionalRef;
  snapshot_version: string;
  snapshot_hash: string;
  source_scope: TopicSelectionResourcePoolSource;
  literature_refs: TopicSelectionFunctionalRef[];
  content_source_refs: TopicSelectionFunctionalRef[];
  source_health_summary: TopicSelectionSourceHealthSummary;
};

export type TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeResult = {
  status: 'succeeded' | 'blocked';
  literature_resource_pool_snapshot: TopicSelectionLiteratureResourcePoolSnapshotRecord | null;
  literature_resource_pool_snapshot_ref: TopicSelectionFunctionalRef | null;
  snapshot_version: string | null;
  snapshot_hash: string | null;
  source_scope: TopicSelectionResourcePoolSource;
  included_literature_refs: TopicSelectionFunctionalRef[];
  content_source_refs: TopicSelectionFunctionalRef[];
  source_health_summary: TopicSelectionSourceHealthSummary | null;
  downstream_handoff: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolHandoff | null;
  authority_refs: TopicSelectionFunctionalRef[];
  audit_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  warning_codes: string[];
  blocker_codes: string[];
  error_code: string | null;
  error_message: string | null;
  replay_provenance: TopicSelectionWorkflowHarnessReplayProvenance | null;
};

export type TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolTraceSnapshot = {
  schema_version: 'topic-selection-workflow-harness-trace-v1';
  payload_schema: typeof LITERATURE_RESOURCE_POOL_TRACE_PAYLOAD_SCHEMA;
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof SNAPSHOT_LITERATURE_RESOURCE_POOL_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  input_hash: string;
  scenario_status: 'passed' | 'failed';
  node_status: 'succeeded' | 'blocked';
  node_input: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeInput;
  node_result: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeResult;
  snapshot_hash: string | null;
  source_health_summary: TopicSelectionSourceHealthSummary | null;
  authority_refs: TopicSelectionFunctionalRef[];
  audit_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  warning_codes: string[];
  blocker_codes: string[];
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  created_at: string;
};

export type TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolResult = {
  schema_version: 'v1';
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof SNAPSHOT_LITERATURE_RESOURCE_POOL_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  node_input: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeInput;
  node_result: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeResult;
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  harness_trace_snapshot: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolTraceSnapshot;
  harness_trace_artifact: TopicSelectionArtifactRefRecord;
  harness_trace_artifact_ref: TopicSelectionFunctionalRef;
};

export type TopicSelectionWorkflowHarnessGenerateNeedCandidateInput = {
  scenario_id: string;
  scenario_case_id?: string | null;
  workspace_id?: string | null;
  title_card_id: string;
  workflow_run_id: string;
  input_snapshot_id?: string | null;
  node_attempt_id: string;
  topic_scope_ref: TopicSelectionFunctionalRef;
  evidence_map_ref: TopicSelectionFunctionalRef;
  evidence_strength_ref: TopicSelectionFunctionalRef;
  resource_sample_set_ref?: TopicSelectionFunctionalRef | null;
  candidate_pool_projection_ref?: TopicSelectionFunctionalRef | null;
  evidence_map_handoff?: TopicSelectionEvidenceMapHandoff | null;
  search_snapshot_refs: TopicSelectionFunctionalRef[];
  resource_snapshot_refs: TopicSelectionFunctionalRef[];
  context_input_refs?: TopicSelectionFunctionalRef[];
  policy_version: string;
  output_schema_version: string;
  profile_id: string;
  execution_mode: TopicSelectionAgentExecutionMode;
  run_mode: TopicSelectionAgentRunMode;
  executor_kind?: TopicSelectionExecutorKind;
  execution_spec?: TopicSelectionAgentExecutionSpec | null;
  debate_loop_id?: string | null;
  debate_policy_id?: string | null;
  debate_execution_plan?: TopicSelectionV1aGenerateNeedCandidateDebateExecutionPlan | null;
  debate_slot_execution_overrides?: TopicSelectionV1aGenerateNeedCandidateDebateSlotExecutionOverrides | null;
  debate_slot_model_option_overrides?: TopicSelectionV1aGenerateNeedCandidateDebateSlotModelOptionOverrides | null;
  debate_mocked_outputs?: TopicSelectionNeedDiscoveryDebateMockedOutputs | null;
  debate_codex_responses?: TopicSelectionNeedDiscoveryDebateCodexResponses | null;
  exploration_payload: TopicSelectionNeedDiscoveryExplorationContextPayload;
  arbiter_payload: TopicSelectionNeedDiscoveryArbiterContextPayload;
  mocked_output?: TopicSelectionMockedAgentOutput<TopicSelectionRankedCandidateDraftBatch> | null;
  codex_response?: TopicSelectionCodexAssistedAgentOutput<TopicSelectionRankedCandidateDraftBatch> | null;
  runtime_token_budget_overrides?: TopicSelectionGenerateNeedCandidateRuntimeTokenBudgetOverrides | null;
  model_option_id?: string | null;
  current_round_index?: number | null;
  remaining_round_budget?: number | null;
  persist_admitted_candidates?: boolean;
  persistence_context?: TopicSelectionGenerateNeedCandidatePersistenceContext | null;
  expectations?: TopicSelectionWorkflowHarnessExpectation;
  created_by?: TopicSelectionActorType;
};

export type TopicSelectionWorkflowHarnessTraceSnapshot = {
  schema_version: 'topic-selection-workflow-harness-trace-v1';
  payload_schema: typeof HARNESS_TRACE_PAYLOAD_SCHEMA;
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof GENERATE_NEED_CANDIDATE_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  input_hash: string;
  execution_mode: TopicSelectionAgentExecutionMode;
  run_mode: TopicSelectionAgentRunMode;
  node_input: TopicSelectionGenerateNeedCandidateNodeInput;
  compiled_context: TopicSelectionNeedDiscoveryCompiledContextPairResult;
  adapter_result: TopicSelectionGenerateNeedCandidateOrchestratorAdapterResult;
  adapter_status: TopicSelectionGenerateNeedCandidateOrchestratorAdapterResult['status'];
  routing_decision: TopicSelectionSupplementalRoundRoutingDecisionKind | null;
  context_packet_refs: TopicSelectionArtifactFunctionalRef[];
  artifact_refs: TopicSelectionArtifactFunctionalRef[];
  authority_refs: TopicSelectionFunctionalRef[];
  warning_codes: string[];
  blocker_codes: string[];
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  created_at: string;
};

export type TopicSelectionWorkflowHarnessGenerateNeedCandidateResult = {
  schema_version: 'v1';
  scenario_id: string;
  scenario_case_id: string | null;
  node_id: typeof GENERATE_NEED_CANDIDATE_NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  node_input: TopicSelectionGenerateNeedCandidateNodeInput;
  compiled_context: TopicSelectionNeedDiscoveryCompiledContextPairResult;
  adapter_result: TopicSelectionGenerateNeedCandidateOrchestratorAdapterResult;
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  harness_trace_snapshot: TopicSelectionWorkflowHarnessTraceSnapshot;
  harness_trace_artifact: TopicSelectionGenerateNeedCandidateArtifactRefEntry;
};

// D-29 (T-089 ⑤): bounded auto re-entry chain over runGenerateNeedCandidateScenario.
// Hard cap mirrors TopicSelectionSupplementalRoundRoutingService MAX_ROUND_INDEX (D-22).
const SUPPLEMENTAL_CHAIN_MAX_TOTAL_ROUNDS = 3;

export type TopicSelectionWorkflowHarnessSupplementalChainOptions = {
  max_total_rounds?: number;
};

export type TopicSelectionWorkflowHarnessSupplementalChainRound = {
  round_index: number;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  routing_decision: TopicSelectionSupplementalRoundRoutingDecisionKind | null;
};

export type TopicSelectionWorkflowHarnessSupplementalChainResult = {
  schema_version: 'v1';
  rounds: TopicSelectionWorkflowHarnessSupplementalChainRound[];
  final: TopicSelectionWorkflowHarnessGenerateNeedCandidateResult;
  stop_reason: 'terminal_routing' | 'scenario_not_passed' | 'round_budget_exhausted';
};

export type TopicSelectionWorkflowHarnessV1cConsumptionExpectation = {
  status?: 'passed' | 'failed';
  terminal_node_id?: TopicSelectionV1cHarnessNodeId | null;
  terminal_routing_outcome?: TopicSelectionV1cHarnessRoutingOutcome | null;
  accepted_node_count?: number | null;
  error_code?: string | null;
};

export type TopicSelectionWorkflowHarnessV1cConsumptionInput = {
  scenario_id: string;
  scenario_case_id?: string | null;
  workflow_run_id: string;
  node_attempt_id: string;
  node_results: TopicSelectionV1cHarnessNodeResult[];
  expectations?: TopicSelectionWorkflowHarnessV1cConsumptionExpectation;
};

export type TopicSelectionWorkflowHarnessV1cConsumptionTraceSnapshot = {
  schema_version: 'topic-selection-v1c-workflow-harness-consumption-trace-v0';
  payload_schema: typeof V1C_CONSUMPTION_TRACE_PAYLOAD_SCHEMA;
  adapter_version: typeof TOPIC_SELECTION_V1C_HARNESS_ADAPTER_VERSION;
  scenario_id: string;
  scenario_case_id: string | null;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  node_results: TopicSelectionV1cHarnessNodeResult[];
  consumed_node_ids: TopicSelectionV1cHarnessNodeId[];
  terminal_node_id: TopicSelectionV1cHarnessNodeId | null;
  terminal_routing_outcome: TopicSelectionV1cHarnessRoutingOutcome | null;
  terminal_automation: TopicSelectionV1cHarnessAutomation | null;
  error_code: string | null;
  error_message: string | null;
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  created_at: string;
};

export type TopicSelectionWorkflowHarnessV1cConsumptionResult = {
  schema_version: 'v1';
  scenario_id: string;
  scenario_case_id: string | null;
  workflow_run_id: string;
  node_attempt_id: string;
  scenario_status: 'passed' | 'failed';
  adapter_version: typeof TOPIC_SELECTION_V1C_HARNESS_ADAPTER_VERSION;
  node_results: TopicSelectionV1cHarnessNodeResult[];
  consumed_node_ids: TopicSelectionV1cHarnessNodeId[];
  terminal_node_id: TopicSelectionV1cHarnessNodeId | null;
  terminal_routing_outcome: TopicSelectionV1cHarnessRoutingOutcome | null;
  terminal_automation: TopicSelectionV1cHarnessAutomation | null;
  error_code: string | null;
  error_message: string | null;
  assertions: TopicSelectionWorkflowHarnessAssertion[];
  harness_trace_snapshot: TopicSelectionWorkflowHarnessV1cConsumptionTraceSnapshot;
};

export type TopicSelectionWorkflowHarnessScenarioResult =
  | TopicSelectionWorkflowHarnessCreateTopicSeedResult
  | TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolResult
  | TopicSelectionWorkflowHarnessCreateSearchPlanResult
  | TopicSelectionWorkflowHarnessRecordSearchRunResult
  | TopicSelectionWorkflowHarnessBuildEvidenceMapResult
  | TopicSelectionWorkflowHarnessGenerateNeedCandidateResult
  | TopicSelectionWorkflowHarnessValidateNeedAdjudicationResult
  | TopicSelectionWorkflowHarnessHumanConfirmNeedResult
  | TopicSelectionWorkflowHarnessPublishV1bInputBundleResult;

const V1C_FORWARD_NEXT_NODE_BY_NODE_ID: Partial<Record<TopicSelectionV1cHarnessNodeId, TopicSelectionV1cHarnessNodeId>> = {
  N1: 'N2',
  N2: 'N3',
  N3: 'N4',
  N4: 'N5',
};

export class TopicSelectionWorkflowHarnessService {
  private readonly now: () => string;
  private readonly contextPolicyProfileRegistry: TopicSelectionContextPolicyProfileRegistryService;
  private readonly modelProfileRegistry: TopicSelectionModelProfileRegistryService;
  private readonly v1aN6RuntimeContextCacheBindings: TopicSelectionV1aN6RuntimeContextCacheBindingService;
  private readonly v1aLlmRuntimeBindings: TopicSelectionV1aLlmRuntimeBindingService;
  private readonly tokenBudgetGate: TopicSelectionTokenBudgetGateService;
  private readonly compressionRuntime: TopicSelectionCompressionRuntimeService;

  constructor(
    private readonly dependencies: {
      contextCompiler: TopicSelectionNeedDiscoveryContextCompilerService;
      generateNeedCandidateAdapter: TopicSelectionGenerateNeedCandidateOrchestratorAdapterService;
      artifactBoundary: TopicSelectionNeedDiscoveryArtifactBoundaryService;
      contextPacketCache?: TopicSelectionContextPacketCacheService | null;
      v1aN6RuntimeContextCacheBindings?: TopicSelectionV1aN6RuntimeContextCacheBindingService;
      v1aLlmRuntimeBindings?: TopicSelectionV1aLlmRuntimeBindingService;
      contextPolicyProfileRegistry?: TopicSelectionContextPolicyProfileRegistryService;
      modelProfileRegistry?: TopicSelectionModelProfileRegistryService;
      tokenBudgetGate?: TopicSelectionTokenBudgetGateService;
      compressionRuntime?: TopicSelectionCompressionRuntimeService;
      controlPlane?: TopicSelectionControlPlaneService;
      searchResources?: TopicSelectionSearchResourceService;
      evidenceMaps?: TopicSelectionEvidenceMapService;
      evidenceMapMaterializer?: TopicSelectionEvidenceMapMaterializationService;
      evidenceMapExtractionAgent?: TopicSelectionAgentOrchestratorService;
      needValidation?: TopicSelectionNeedValidationService;
      needAdjudicationAgent?: TopicSelectionAgentOrchestratorService;
      humanConfirmationSemanticReviewAgent?: TopicSelectionAgentOrchestratorService;
    },
    options: {
      now?: () => string;
    } = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.contextPolicyProfileRegistry = dependencies.contextPolicyProfileRegistry
      ?? new TopicSelectionContextPolicyProfileRegistryService();
    this.modelProfileRegistry = dependencies.modelProfileRegistry
      ?? new TopicSelectionModelProfileRegistryService();
    this.v1aN6RuntimeContextCacheBindings = dependencies.v1aN6RuntimeContextCacheBindings
      ?? new TopicSelectionV1aN6RuntimeContextCacheBindingService({
        contextPolicyProfileRegistry: this.contextPolicyProfileRegistry,
        modelProfileRegistry: this.modelProfileRegistry,
      });
    this.v1aLlmRuntimeBindings = dependencies.v1aLlmRuntimeBindings
      ?? new TopicSelectionV1aLlmRuntimeBindingService({
        contextPolicyProfileRegistry: this.contextPolicyProfileRegistry,
      });
    this.tokenBudgetGate = dependencies.tokenBudgetGate ?? new TopicSelectionTokenBudgetGateService();
    this.compressionRuntime = dependencies.compressionRuntime ?? new TopicSelectionCompressionRuntimeService();
  }

  async invokeNode(
    request: TopicSelectionV1aWorkflowHarnessRunRequest,
  ): Promise<TopicSelectionV1aWorkflowHarnessRunResult> {
    if (request.policy_version !== TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Unsupported v1a workflow harness route policy version.', {
        policy_version: request.policy_version,
        supported_policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
      });
    }
    const scenarioInput = this.scenarioInputFromRunEnvelope(request);
    const scenarioResult = await this.runScenarioForNode(request.node_id, scenarioInput);
    const routeSignal = this.routeSignalForScenarioResult(scenarioResult);
    const routeEdge = findTopicSelectionV1aWorkflowHarnessRouteEdge(request.node_id, routeSignal);
    if (!routeEdge) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Workflow harness route policy has no edge for emitted route signal.', {
        node_id: request.node_id,
        route_signal: routeSignal,
        policy_version: request.policy_version,
      });
    }
    const routeStatus = this.routeStatusForScenarioResult(scenarioResult);
    if (!routeEdge.allowed_statuses.includes(routeStatus)) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Workflow harness route policy rejected emitted node status.', {
        node_id: request.node_id,
        route_signal: routeSignal,
        emitted_status: routeStatus,
        allowed_statuses: routeEdge.allowed_statuses,
        policy_version: request.policy_version,
      });
    }
    const error = this.errorSummaryForScenarioResult(scenarioResult);

    return {
      schema_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_RESULT_SCHEMA_VERSION,
      node_id: request.node_id,
      workflow_run_id: request.workflow_run_id,
      node_attempt_id: request.node_attempt_id,
      policy_version: request.policy_version,
      scenario_result: scenarioResult as unknown as Record<string, unknown>,
      route_decision: routeEdge.route_decision,
      route_signal: routeEdge.route_signal,
      route_target_node_id: routeEdge.route_target_node_id,
      handoff_kind: routeEdge.handoff_kind,
      route_policy_ref: {
        policy_version: request.policy_version,
        route_id: routeEdge.route_id,
        from_node_id: routeEdge.from_node_id,
        route_signal: routeEdge.route_signal,
      },
      harness_trace_artifact_ref: this.harnessTraceArtifactRefForScenarioResult(scenarioResult),
      error_code: error.error_code,
      error_message: error.error_message,
    };
  }

  runV1cHarnessConsumptionScenario(
    input: TopicSelectionWorkflowHarnessV1cConsumptionInput,
  ): TopicSelectionWorkflowHarnessV1cConsumptionResult {
    const assertions: TopicSelectionWorkflowHarnessAssertion[] = [];
    const consumedNodeIds: TopicSelectionV1cHarnessNodeId[] = [];
    let expectedNextNodeId: TopicSelectionV1cHarnessNodeId | null = null;
    let terminal: TopicSelectionV1cHarnessNodeResult | null = null;
    let errorCode: string | null = null;
    let errorMessage: string | null = null;

    const fail = (code: string, message: string, actual?: unknown, expected?: unknown): void => {
      if (!errorCode) {
        errorCode = code;
        errorMessage = message;
      }
      assertions.push({
        assertion_id: `v1c.${code}`,
        passed: false,
        message,
        expected,
        actual,
      });
    };

    if (input.node_results.length === 0) {
      fail('empty_node_results', 'v1c harness consumption requires at least one node result.');
    }

    for (const nodeResult of input.node_results) {
      if (errorCode) break;

      if (terminal) {
        const downstreamIngressAllowed = terminal.node_id === 'N5' && nodeResult.node_id === 'N6';
        if (!downstreamIngressAllowed) {
          fail(
            'node_after_terminal',
            'v1c harness consumption forbids automatic progress after a terminal node result.',
            { previous_terminal_node_id: terminal.node_id, next_node_id: nodeResult.node_id },
          );
          break;
        }
        terminal = null;
        expectedNextNodeId = null;
      }

      if (expectedNextNodeId && nodeResult.node_id !== expectedNextNodeId) {
        fail(
          'non_forward_node',
          'v1c harness consumption rejected a non-forward node transition.',
          nodeResult.node_id,
          expectedNextNodeId,
        );
        break;
      }

      if (nodeResult.node_id === 'N6' && nodeResult.automation === 'advance') {
        fail(
          'n6_auto_advance_forbidden',
          'v1c N6 is record-only and must not auto-advance or re-enter N1-N5.',
          nodeResult.automation,
          'record_only',
        );
        break;
      }

      consumedNodeIds.push(nodeResult.node_id);
      if (nodeResult.automation === 'advance') {
        const nextNodeId = V1C_FORWARD_NEXT_NODE_BY_NODE_ID[nodeResult.node_id] ?? null;
        if (!nextNodeId) {
          fail(
            'illegal_advance',
            'v1c harness consumption rejected advance automation from a terminal node.',
            nodeResult.node_id,
          );
          break;
        }
        expectedNextNodeId = nextNodeId;
        terminal = null;
        continue;
      }

      if (nodeResult.automation === 'stop' || nodeResult.automation === 'record_only') {
        terminal = nodeResult;
        expectedNextNodeId = null;
      }
    }

    if (!errorCode) {
      assertions.push({
        assertion_id: 'v1c.forward_only_consumption',
        passed: true,
        message: 'v1c harness consumed node results with forward-only transitions and terminal stop behavior.',
        actual: consumedNodeIds,
      });
    }

    const terminalNodeId = terminal?.node_id ?? consumedNodeIds.at(-1) ?? null;
    const terminalRoutingOutcome = terminal?.routing_outcome
      ?? this.lastV1cNodeResultForNodeId(input.node_results, terminalNodeId)?.routing_outcome
      ?? null;
    const terminalAutomation = terminal?.automation
      ?? this.lastV1cNodeResultForNodeId(input.node_results, terminalNodeId)?.automation
      ?? null;

    this.appendV1cConsumptionExpectationAssertions(input, {
      assertions,
      acceptedNodeCount: consumedNodeIds.length,
      errorCode,
      terminalNodeId,
      terminalRoutingOutcome,
    });

    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    const trace: TopicSelectionWorkflowHarnessV1cConsumptionTraceSnapshot = {
      schema_version: 'topic-selection-v1c-workflow-harness-consumption-trace-v0',
      payload_schema: V1C_CONSUMPTION_TRACE_PAYLOAD_SCHEMA,
      adapter_version: TOPIC_SELECTION_V1C_HARNESS_ADAPTER_VERSION,
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_results: input.node_results,
      consumed_node_ids: consumedNodeIds,
      terminal_node_id: terminalNodeId,
      terminal_routing_outcome: terminalRoutingOutcome,
      terminal_automation: terminalAutomation,
      error_code: errorCode,
      error_message: errorMessage,
      assertions,
      created_at: this.now(),
    };

    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      adapter_version: TOPIC_SELECTION_V1C_HARNESS_ADAPTER_VERSION,
      node_results: input.node_results,
      consumed_node_ids: consumedNodeIds,
      terminal_node_id: terminalNodeId,
      terminal_routing_outcome: terminalRoutingOutcome,
      terminal_automation: terminalAutomation,
      error_code: errorCode,
      error_message: errorMessage,
      assertions,
      harness_trace_snapshot: trace,
    };
  }

  private scenarioInputFromRunEnvelope(
    request: TopicSelectionV1aWorkflowHarnessRunRequest,
  ): Record<string, unknown> {
    const scenarioInput = request.scenario_input ?? {};
    return {
      ...scenarioInput,
      workspace_id: scenarioInput.workspace_id ?? request.workspace_id ?? null,
      title_card_id: scenarioInput.title_card_id ?? request.title_card_id ?? null,
      workflow_run_id: request.workflow_run_id,
      node_attempt_id: request.node_attempt_id,
      policy_version: request.policy_version,
      created_by: scenarioInput.created_by ?? request.created_by ?? 'system',
    };
  }

  private appendV1cConsumptionExpectationAssertions(
    input: TopicSelectionWorkflowHarnessV1cConsumptionInput,
    observed: {
      assertions: TopicSelectionWorkflowHarnessAssertion[];
      acceptedNodeCount: number;
      errorCode: string | null;
      terminalNodeId: TopicSelectionV1cHarnessNodeId | null;
      terminalRoutingOutcome: TopicSelectionV1cHarnessRoutingOutcome | null;
    },
  ): void {
    const expectations = input.expectations;
    if (!expectations) return;

    if (expectations.status) {
      const actualStatus = observed.errorCode ? 'failed' : 'passed';
      observed.assertions.push({
        assertion_id: 'v1c.expected_status',
        passed: actualStatus === expectations.status,
        message: 'v1c harness consumption status matched expectation.',
        expected: expectations.status,
        actual: actualStatus,
      });
    }
    if (expectations.terminal_node_id !== undefined) {
      observed.assertions.push({
        assertion_id: 'v1c.expected_terminal_node',
        passed: observed.terminalNodeId === expectations.terminal_node_id,
        message: 'v1c harness consumption terminal node matched expectation.',
        expected: expectations.terminal_node_id,
        actual: observed.terminalNodeId,
      });
    }
    if (expectations.terminal_routing_outcome !== undefined) {
      observed.assertions.push({
        assertion_id: 'v1c.expected_terminal_routing_outcome',
        passed: observed.terminalRoutingOutcome === expectations.terminal_routing_outcome,
        message: 'v1c harness consumption terminal routing outcome matched expectation.',
        expected: expectations.terminal_routing_outcome,
        actual: observed.terminalRoutingOutcome,
      });
    }
    if (expectations.accepted_node_count !== undefined && expectations.accepted_node_count !== null) {
      observed.assertions.push({
        assertion_id: 'v1c.expected_accepted_node_count',
        passed: observed.acceptedNodeCount === expectations.accepted_node_count,
        message: 'v1c harness consumption accepted node count matched expectation.',
        expected: expectations.accepted_node_count,
        actual: observed.acceptedNodeCount,
      });
    }
    if (expectations.error_code !== undefined) {
      observed.assertions.push({
        assertion_id: 'v1c.expected_error_code',
        passed: observed.errorCode === expectations.error_code,
        message: 'v1c harness consumption error code matched expectation.',
        expected: expectations.error_code,
        actual: observed.errorCode,
      });
    }
  }

  private lastV1cNodeResultForNodeId(
    nodeResults: TopicSelectionV1cHarnessNodeResult[],
    nodeId: TopicSelectionV1cHarnessNodeId | null,
  ): TopicSelectionV1cHarnessNodeResult | null {
    if (!nodeId) return null;
    for (let index = nodeResults.length - 1; index >= 0; index -= 1) {
      if (nodeResults[index]?.node_id === nodeId) {
        return nodeResults[index] ?? null;
      }
    }
    return null;
  }

  private async runScenarioForNode(
    nodeId: TopicSelectionV1aWorkflowHarnessNodeId,
    scenarioInput: Record<string, unknown>,
  ): Promise<TopicSelectionWorkflowHarnessScenarioResult> {
    switch (nodeId) {
      case CREATE_TOPIC_SEED_NODE_ID:
        return this.runCreateTopicSeedScenario(scenarioInput as TopicSelectionWorkflowHarnessCreateTopicSeedInput);
      case SNAPSHOT_LITERATURE_RESOURCE_POOL_NODE_ID:
        return this.runSnapshotLiteratureResourcePoolScenario(
          scenarioInput as TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolInput,
        );
      case CREATE_SEARCH_PLAN_NODE_ID:
        return this.runCreateSearchPlanScenario(scenarioInput as TopicSelectionWorkflowHarnessCreateSearchPlanInput);
      case RECORD_SEARCH_RUN_NODE_ID:
        return this.runRecordSearchRunScenario(scenarioInput as TopicSelectionWorkflowHarnessRecordSearchRunInput);
      case BUILD_EVIDENCE_MAP_NODE_ID:
        return this.runBuildEvidenceMapScenario(scenarioInput as TopicSelectionWorkflowHarnessBuildEvidenceMapInput);
      case GENERATE_NEED_CANDIDATE_NODE_ID:
        return this.runGenerateNeedCandidateScenario(
          scenarioInput as TopicSelectionWorkflowHarnessGenerateNeedCandidateInput,
        );
      case VALIDATE_NEED_ADJUDICATION_NODE_ID:
        return this.runValidateNeedAdjudicationScenario(
          scenarioInput as TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
        );
      case HUMAN_CONFIRM_NEED_NODE_ID:
        return this.runHumanConfirmNeedScenario(scenarioInput as TopicSelectionWorkflowHarnessHumanConfirmNeedInput);
      case PUBLISH_V1B_INPUT_BUNDLE_NODE_ID:
        return this.runPublishV1bInputBundleScenario(
          scenarioInput as TopicSelectionWorkflowHarnessPublishV1bInputBundleInput,
        );
      default:
        throw new AppError(400, 'INVALID_PAYLOAD', 'Unknown v1a workflow harness node_id.', { node_id: nodeId });
    }
  }

  private routeSignalForScenarioResult(result: TopicSelectionWorkflowHarnessScenarioResult): string {
    switch (result.node_id) {
      case CREATE_TOPIC_SEED_NODE_ID:
        return result.node_result.status === 'succeeded' ? 'topic_seed_created' : 'topic_seed_blocked';
      case SNAPSHOT_LITERATURE_RESOURCE_POOL_NODE_ID:
        return result.node_result.status === 'succeeded'
          ? 'literature_resource_pool_snapshot_created'
          : 'literature_resource_pool_snapshot_blocked';
      case CREATE_SEARCH_PLAN_NODE_ID:
        return result.node_result.status === 'succeeded' ? 'search_plan_created' : 'search_plan_blocked';
      case RECORD_SEARCH_RUN_NODE_ID:
        return this.routeSignalForRecordSearchRunResult(result);
      case BUILD_EVIDENCE_MAP_NODE_ID:
        return this.routeSignalForBuildEvidenceMapResult(result);
      case GENERATE_NEED_CANDIDATE_NODE_ID:
        return this.routeSignalForGenerateNeedCandidateResult(result);
      case VALIDATE_NEED_ADJUDICATION_NODE_ID:
        return this.routeSignalForValidateNeedAdjudicationResult(result);
      case HUMAN_CONFIRM_NEED_NODE_ID:
        return this.routeSignalForHumanConfirmNeedResult(result);
      case PUBLISH_V1B_INPUT_BUNDLE_NODE_ID:
        return this.routeSignalForPublishV1bInputBundleResult(result);
      default:
        throw new AppError(400, 'INVALID_PAYLOAD', 'Unknown v1a workflow harness scenario result node_id.');
    }
  }

  private routeStatusForScenarioResult(
    result: TopicSelectionWorkflowHarnessScenarioResult,
  ): TopicSelectionV1aWorkflowHarnessNodeStatus {
    switch (result.node_id) {
      case CREATE_TOPIC_SEED_NODE_ID:
      case SNAPSHOT_LITERATURE_RESOURCE_POOL_NODE_ID:
      case CREATE_SEARCH_PLAN_NODE_ID:
      case RECORD_SEARCH_RUN_NODE_ID:
      case BUILD_EVIDENCE_MAP_NODE_ID:
        return result.node_result.status;
      case GENERATE_NEED_CANDIDATE_NODE_ID:
        return result.adapter_result.status;
      case VALIDATE_NEED_ADJUDICATION_NODE_ID:
      case HUMAN_CONFIRM_NEED_NODE_ID:
      case PUBLISH_V1B_INPUT_BUNDLE_NODE_ID:
        return result.node_result.status;
      default:
        throw new AppError(400, 'INVALID_PAYLOAD', 'Unknown v1a workflow harness scenario result node_id.');
    }
  }

  private routeSignalForRecordSearchRunResult(
    result: TopicSelectionWorkflowHarnessRecordSearchRunResult,
  ): string {
    const nodeResult = result.node_result;
    if (nodeResult.status !== 'succeeded') {
      return 'search_run_blocked';
    }
    if (nodeResult.downstream_handoff) {
      return 'search_run_consumable';
    }
    const loopbackSignal = nodeResult.loopback_signal;
    if (!loopbackSignal) {
      return 'search_execution_retry_required';
    }
    const targets = new Set(loopbackSignal.target_actions);
    if (loopbackSignal.reason_codes.includes('SOURCE_HEALTH_WARNING')) {
      return 'source_health_snapshot_refresh';
    }
    if (targets.has('topic-selection.v1a.create-search-plan.v1')) {
      return 'search_plan_recheck_required';
    }
    if (targets.has('topic-selection.v1a.snapshot-literature-resource-pool.v1')) {
      return 'source_health_snapshot_refresh';
    }
    if (targets.has('upstream_search_execution_or_input_preparation')) {
      return 'search_execution_retry_required';
    }
    if (targets.has('human_review_search_coverage_acceptance')) {
      return 'search_coverage_human_review_required';
    }
    return 'search_execution_retry_required';
  }

  private routeSignalForBuildEvidenceMapResult(
    result: TopicSelectionWorkflowHarnessBuildEvidenceMapResult,
  ): string {
    if (result.node_result.status === 'succeeded' && result.node_result.downstream_handoff) {
      return 'evidence_map_ready';
    }
    if (result.node_result.status === 'review_required') {
      return 'evidence_map_review_required';
    }
    return 'evidence_map_blocked';
  }

  private routeSignalForGenerateNeedCandidateResult(
    result: TopicSelectionWorkflowHarnessGenerateNeedCandidateResult,
  ): string {
    const routingDecision = result.adapter_result.supplemental_round_routing_decision?.routing_decision ?? null;
    if (routingDecision === 'finalize_with_admitted_batch') {
      return 'need_candidate_batch_finalized';
    }
    if (routingDecision === 'run_supplemental_round') {
      return 'need_candidate_supplemental_round';
    }
    if (routingDecision === 'require_human_review' || result.adapter_result.status === 'require_human_review') {
      return 'need_candidate_human_review_required';
    }
    return 'need_candidate_blocked';
  }

  private routeSignalForValidateNeedAdjudicationResult(
    result: TopicSelectionWorkflowHarnessValidateNeedAdjudicationResult,
  ): string {
    switch (result.node_result.route_outcome) {
      case 'advance_to_human_confirmation':
        return 'need_adjudication_validated';
      case 'repair_need_candidate':
        return 'need_candidate_repair_required';
      case 'repair_search_plan':
        return 'search_plan_recheck_required';
      case 'stop_rejected':
        return 'candidate_rejected';
      case 'hold_candidate':
        return 'candidate_parked';
      case 'stop_merged':
        return 'candidate_merged';
      case 'require_human_review':
        return 'adjudication_human_review_required';
      case 'blocked':
      default:
        return 'adjudication_blocked';
    }
  }

  private routeSignalForHumanConfirmNeedResult(
    result: TopicSelectionWorkflowHarnessHumanConfirmNeedResult,
  ): string {
    switch (result.node_result.route_outcome) {
      case 'advance_to_publish_v1b_input_bundle':
        return 'human_confirmation_ready';
      case 'require_human_review':
        return 'human_confirmation_review_required';
      case 'blocked':
      default:
        return 'human_confirmation_blocked';
    }
  }

  private routeSignalForPublishV1bInputBundleResult(
    result: TopicSelectionWorkflowHarnessPublishV1bInputBundleResult,
  ): string {
    return result.node_result.route_outcome === 'published_v1b_input_bundle'
      ? 'v1b_input_bundle_published'
      : 'v1b_input_bundle_blocked';
  }

  private harnessTraceArtifactRefForScenarioResult(
    result: TopicSelectionWorkflowHarnessScenarioResult,
  ): TopicSelectionFunctionalRef | null {
    if (result.node_id === GENERATE_NEED_CANDIDATE_NODE_ID) {
      return result.harness_trace_artifact.artifact_ref;
    }
    return result.harness_trace_artifact_ref;
  }

  private errorSummaryForScenarioResult(
    result: TopicSelectionWorkflowHarnessScenarioResult,
  ): { error_code: string | null; error_message: string | null } {
    if (result.node_id === GENERATE_NEED_CANDIDATE_NODE_ID) {
      return {
        error_code: result.adapter_result.error_code ?? null,
        error_message: null,
      };
    }
    return {
      error_code: result.node_result.error_code ?? null,
      error_message: result.node_result.error_message ?? null,
    };
  }

  async runCreateTopicSeedScenario(
    input: TopicSelectionWorkflowHarnessCreateTopicSeedInput,
  ): Promise<TopicSelectionWorkflowHarnessCreateTopicSeedResult> {
    this.assertCreateTopicSeedScenarioInput(input);
    const controlPlane = this.requiredControlPlane();
    const searchResources = this.requiredSearchResources();
    const nodeInput = this.createTopicSeedNodeInput(input);
    const inputHash = this.hash({
      node_id: CREATE_TOPIC_SEED_NODE_ID,
      node_input: nodeInput,
    });
    const replay = await this.findCreateTopicSeedReplay(input, nodeInput, inputHash);
    if (replay) {
      return replay;
    }
    let topicSeed: TopicSelectionTopicSeedRecord | null = null;
    let appError: AppError | null = null;

    try {
      topicSeed = await searchResources.createTopicSeedFromTitleCard({
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id,
        seed_version: input.seed_version ?? undefined,
        intent_summary: input.intent_summary ?? undefined,
        scope_notes: input.scope_notes ?? null,
        intent_preparation_refs: input.intent_preparation_refs ?? [],
        created_by: input.created_by ?? 'system',
        policy_version_id: input.policy_version,
      });
    } catch (error) {
      if (!(error instanceof AppError)) {
        throw error;
      }
      appError = error;
    }

    const topicSeedRef = topicSeed
      ? this.ref('topic_seed', topicSeed.topic_seed_id, topicSeed.title_card_id, topicSeed.seed_version)
      : null;
    const nodeResult: TopicSelectionWorkflowHarnessCreateTopicSeedNodeResult = {
      status: topicSeed ? 'succeeded' : 'blocked',
      topic_seed: topicSeed,
      topic_seed_ref: topicSeedRef,
      authority_refs: topicSeedRef ? [topicSeedRef] : [],
      audit_refs: topicSeed ? this.topicSeedAuditRefs(topicSeed) : [],
      artifact_refs: [],
      warning_codes: [],
      blocker_codes: appError ? [appError.errorCode] : [],
      error_code: appError?.errorCode ?? null,
      error_message: appError?.message ?? null,
      replay_provenance: null,
    };
    const assertions = this.evaluateCreateTopicSeedAssertions(input, nodeResult);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    const traceSnapshot = this.createTopicSeedTraceSnapshot({
      input,
      nodeInput,
      inputHash,
      nodeResult,
      assertions,
      scenarioStatus,
    });
    const traceArtifact = await controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'trace',
      storage_kind: 'inline',
      payload: traceSnapshot as unknown as Record<string, unknown>,
      workflow_run_id: input.workflow_run_id,
      input_snapshot_id: topicSeed?.input_snapshot_id ?? null,
      created_by: input.created_by ?? 'system',
    });
    const traceArtifactRef = this.ref('artifact_ref', traceArtifact.artifact_ref_id, traceArtifact.title_card_id ?? input.title_card_id);

    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: CREATE_TOPIC_SEED_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: nodeInput,
      node_result: {
        ...nodeResult,
        artifact_refs: [traceArtifactRef],
      },
      assertions,
      harness_trace_snapshot: traceSnapshot,
      harness_trace_artifact: traceArtifact,
      harness_trace_artifact_ref: traceArtifactRef,
    };
  }

  async runSnapshotLiteratureResourcePoolScenario(
    input: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolInput,
  ): Promise<TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolResult> {
    this.assertSnapshotLiteratureResourcePoolScenarioInput(input);
    const controlPlane = this.requiredControlPlane();
    const searchResources = this.requiredSearchResources();
    const nodeInput = this.snapshotLiteratureResourcePoolNodeInput(input);
    const inputHash = this.hash({
      node_id: SNAPSHOT_LITERATURE_RESOURCE_POOL_NODE_ID,
      node_input: nodeInput,
    });
    const replay = await this.findSnapshotLiteratureResourcePoolReplay(input, nodeInput, inputHash);
    if (replay) {
      return replay;
    }
    let snapshot: TopicSelectionLiteratureResourcePoolSnapshotRecord | null = null;
    let blockedSourceHealthSummary: TopicSelectionSourceHealthSummary | null = null;
    let blockedAuditRefs: TopicSelectionFunctionalRef[] = [];
    let errorCode: string | null = null;
    let errorMessage: string | null = null;
    let blockerCodes: string[] = [];

    if (input.source_scope !== NORMALIZED_LITERATURE_RESOURCE_POOL_SOURCE_SCOPE) {
      errorCode = UNSUPPORTED_SOURCE_SCOPE_FOR_NORMALIZED_V1A;
      errorMessage = 'Normalized v1a resource-pool snapshot only supports title_card_evidence_basket.';
      blockerCodes = [UNSUPPORTED_SOURCE_SCOPE_FOR_NORMALIZED_V1A];
    } else {
      try {
        snapshot = await searchResources.createLiteratureResourcePoolSnapshot({
          workspace_id: input.workspace_id ?? null,
          title_card_id: input.title_card_id,
          topic_seed_id: input.topic_seed_ref.ref_id,
          source_scope: input.source_scope,
          resource_sample_set_provenance_ref: input.resource_sample_set_provenance_ref ?? null,
          created_by: input.created_by ?? 'system',
          policy_version_id: input.policy_version,
        });
      } catch (error) {
        if (!(error instanceof AppError)) {
          throw error;
        }
        errorCode = error.errorCode;
        errorMessage = error.message;
        blockerCodes = this.blockerCodesFromAppError(error);
        blockedSourceHealthSummary = this.sourceHealthSummaryFromAppError(error);
        blockedAuditRefs = this.auditRefsFromAppError(error, input.title_card_id);
      }
    }

    const snapshotRef = snapshot
      ? this.ref(
        'literature_resource_pool_snapshot',
        snapshot.literature_resource_pool_snapshot_id,
        snapshot.title_card_id,
        snapshot.snapshot_version,
      )
      : null;
    const auditRefs = snapshot ? this.literatureResourcePoolSnapshotAuditRefs(snapshot) : [];
    const sourceHealthSummary = snapshot?.source_health_summary ?? blockedSourceHealthSummary;
    const warningCodes = sourceHealthSummary?.warning_codes ?? [];
    const nodeResult: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeResult = {
      status: snapshot ? 'succeeded' : 'blocked',
      literature_resource_pool_snapshot: snapshot,
      literature_resource_pool_snapshot_ref: snapshotRef,
      snapshot_version: snapshot?.snapshot_version ?? null,
      snapshot_hash: snapshot?.snapshot_hash ?? null,
      source_scope: input.source_scope,
      included_literature_refs: snapshot?.literature_refs ?? [],
      content_source_refs: snapshot?.content_source_refs ?? [],
      source_health_summary: sourceHealthSummary,
      downstream_handoff: snapshot && snapshotRef
        ? {
            literature_resource_pool_snapshot_ref: snapshotRef,
            snapshot_version: snapshot.snapshot_version,
            snapshot_hash: snapshot.snapshot_hash,
            source_scope: snapshot.source_scope,
            literature_refs: snapshot.literature_refs,
            content_source_refs: snapshot.content_source_refs,
            source_health_summary: snapshot.source_health_summary,
          }
        : null,
      authority_refs: snapshotRef ? [snapshotRef] : [],
      audit_refs: snapshot ? auditRefs : blockedAuditRefs,
      artifact_refs: [],
      warning_codes: warningCodes,
      blocker_codes: snapshot ? [] : blockerCodes,
      error_code: snapshot ? null : errorCode,
      error_message: snapshot ? null : errorMessage,
      replay_provenance: null,
    };
    const assertions = this.evaluateSnapshotLiteratureResourcePoolAssertions(input, nodeResult);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    const traceSnapshot = this.createSnapshotLiteratureResourcePoolTraceSnapshot({
      input,
      nodeInput,
      inputHash,
      nodeResult,
      assertions,
      scenarioStatus,
    });
    const traceArtifact = await controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'trace',
      storage_kind: 'inline',
      payload: traceSnapshot as unknown as Record<string, unknown>,
      workflow_run_id: input.workflow_run_id,
      input_snapshot_id: snapshot?.input_snapshot_id ?? null,
      created_by: input.created_by ?? 'system',
    });
    const traceArtifactRef = this.ref(
      'artifact_ref',
      traceArtifact.artifact_ref_id,
      traceArtifact.title_card_id ?? input.title_card_id,
    );

    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: SNAPSHOT_LITERATURE_RESOURCE_POOL_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: nodeInput,
      node_result: {
        ...nodeResult,
        artifact_refs: [traceArtifactRef],
      },
      assertions,
      harness_trace_snapshot: traceSnapshot,
      harness_trace_artifact: traceArtifact,
      harness_trace_artifact_ref: traceArtifactRef,
    };
  }

  async runCreateSearchPlanScenario(
    input: TopicSelectionWorkflowHarnessCreateSearchPlanInput,
  ): Promise<TopicSelectionWorkflowHarnessCreateSearchPlanResult> {
    this.assertCreateSearchPlanScenarioInput(input);
    const controlPlane = this.requiredControlPlane();
    const searchResources = this.requiredSearchResources();
    const nodeInput = this.createSearchPlanNodeInput(input);
    const inputHash = this.hash({
      node_id: CREATE_SEARCH_PLAN_NODE_ID,
      node_input: nodeInput,
    });
    const replay = await this.findCreateSearchPlanReplay(input, nodeInput, inputHash);
    if (replay) {
      return replay;
    }
    const validation = await this.validateCreateSearchPlanBlueprint(input);
    let searchPlan: TopicSelectionSearchPlanRecord | null = null;
    let coverageRowIntents: TopicSelectionCoverageRowIntentRecord[] = [];
    let errorCode = validation.error_code;
    let errorMessage = validation.error_message;
    let blockerCodes = validation.blocker_codes;

    if (!validation.blocked && input.blueprint) {
      try {
        const created = await searchResources.createSearchPlan({
          workspace_id: input.workspace_id ?? null,
          title_card_id: input.title_card_id,
          topic_seed_id: input.blueprint.topic_seed_ref.ref_id,
          literature_resource_pool_snapshot_id: input.blueprint.literature_resource_pool_snapshot_ref.ref_id,
          plan_version: input.blueprint.plan_version ?? undefined,
          query_intents: input.blueprint.query_intents,
          must_check_constraints: input.blueprint.must_check_constraints,
          exclusion_rules: input.blueprint.exclusion_rules,
          coverage_strategy: input.blueprint.coverage_strategy,
          coverage_intents: input.blueprint.coverage_intents,
          search_plan_blueprint: input.blueprint,
          parent_search_plan_ref: input.blueprint.parent_search_plan_ref,
          recheck_request_ref: input.blueprint.recheck_request_ref,
          created_by: input.created_by ?? 'system',
          policy_version_id: input.blueprint.policy_version,
        });
        searchPlan = created.search_plan;
        coverageRowIntents = created.coverage_row_intents;
      } catch (error) {
        if (!(error instanceof AppError)) {
          throw error;
        }
        errorCode = error.errorCode;
        errorMessage = error.message;
        blockerCodes = this.blockerCodesFromAppError(error);
      }
    }

    const searchPlanRef = searchPlan
      ? this.ref('search_plan', searchPlan.search_plan_id, searchPlan.title_card_id, searchPlan.plan_version)
      : null;
    const coverageRowIntentRefs = coverageRowIntents.map((row) =>
      this.ref('coverage_row_intent', row.coverage_row_intent_id, row.title_card_id ?? input.title_card_id),
    );
    const auditRefs = searchPlan ? this.searchPlanAuditRefs(searchPlan) : [];
    const serviceArtifactRefs = searchPlan?.artifact_refs ?? [];
    const nodeResult: TopicSelectionWorkflowHarnessCreateSearchPlanNodeResult = {
      status: searchPlan ? 'succeeded' : 'blocked',
      search_plan: searchPlan,
      search_plan_ref: searchPlanRef,
      coverage_row_intents: coverageRowIntents,
      coverage_row_intent_refs: coverageRowIntentRefs,
      plan_version: searchPlan?.plan_version ?? null,
      query_intents: searchPlan?.query_intents ?? input.blueprint?.query_intents ?? [],
      must_check_constraints: searchPlan?.must_check_constraints ?? input.blueprint?.must_check_constraints ?? [],
      exclusion_rules: searchPlan?.exclusion_rules ?? input.blueprint?.exclusion_rules ?? [],
      authority_refs: searchPlanRef ? [searchPlanRef, ...coverageRowIntentRefs] : [],
      audit_refs: auditRefs,
      artifact_refs: serviceArtifactRefs,
      warning_codes: [],
      blocker_codes: searchPlan ? [] : blockerCodes,
      error_code: searchPlan ? null : errorCode,
      error_message: searchPlan ? null : errorMessage,
      replay_provenance: null,
    };
    const assertions = this.evaluateCreateSearchPlanAssertions(input, nodeResult);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    const traceSnapshot = this.createSearchPlanTraceSnapshot({
      input,
      nodeInput,
      inputHash,
      nodeResult,
      assertions,
      scenarioStatus,
      resolvedSnapshotHash: validation.resolved_snapshot_hash,
    });
    const traceArtifact = await controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'trace',
      storage_kind: 'inline',
      payload: traceSnapshot as unknown as Record<string, unknown>,
      workflow_run_id: input.workflow_run_id,
      input_snapshot_id: searchPlan?.input_snapshot_id ?? null,
      created_by: input.created_by ?? 'system',
    });
    const traceArtifactRef = this.ref(
      'artifact_ref',
      traceArtifact.artifact_ref_id,
      traceArtifact.title_card_id ?? input.title_card_id,
    );

    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: CREATE_SEARCH_PLAN_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: nodeInput,
      node_result: {
        ...nodeResult,
        artifact_refs: [...serviceArtifactRefs, traceArtifactRef],
      },
      assertions,
      harness_trace_snapshot: traceSnapshot,
      harness_trace_artifact: traceArtifact,
      harness_trace_artifact_ref: traceArtifactRef,
    };
  }

  async runRecordSearchRunScenario(
    input: TopicSelectionWorkflowHarnessRecordSearchRunInput,
  ): Promise<TopicSelectionWorkflowHarnessRecordSearchRunResult> {
    this.assertRecordSearchRunScenarioInput(input);
    const controlPlane = this.requiredControlPlane();
    const searchResources = this.requiredSearchResources();
    const nodeInput = this.recordSearchRunNodeInput(input);
    const inputHash = this.hash({
      node_id: RECORD_SEARCH_RUN_NODE_ID,
      node_input: nodeInput,
    });
    const replay = await this.findRecordSearchRunReplay(input, nodeInput, inputHash);
    if (replay) {
      return replay;
    }
    const validation = this.validateRecordSearchRunBundle(input);
    let searchRun: TopicSelectionSearchRunRecord | null = null;
    let observations: TopicSelectionCoverageExecutionObservationRecord[] = [];
    let evidenceBindings: TopicSelectionCoverageEvidenceBindingRecord[] = [];
    let assessments: TopicSelectionCoverageAssessmentRecord[] = [];
    let riskAcceptances: TopicSelectionCoverageRiskAcceptanceRecord[] = [];
    let errorCode = validation.error_code;
    let errorMessage = validation.error_message;
    let blockerCodes = validation.blocker_codes;
    let coverageMatrixSummary: Record<string, unknown> | null = null;
    let coverageRoleExpectations: TopicSelectionSearchRunCoverageRoleExpectation[] = [];
    let methodFamilyTargets: string[] = [];

    if (!validation.blocked && input.bundle) {
      try {
        const created = await searchResources.recordSearchRun(this.recordSearchRunServiceInput(input));
        searchRun = created.search_run;
        observations = created.observations;
        evidenceBindings = created.evidence_bindings;
        assessments = created.assessments;
        riskAcceptances = created.risk_acceptances;
        const matrix = await searchResources.getCoverageMatrix(input.bundle.search_plan_ref.ref_id);
        coverageMatrixSummary = matrix.summary;
        coverageRoleExpectations = this.searchRunCoverageRoleExpectations(input.bundle, matrix.rows);
        const searchPlan = await searchResources.getSearchPlanById(input.bundle.search_plan_ref.ref_id);
        methodFamilyTargets = this.methodFamilyTargetsFromSearchPlan(searchPlan);
      } catch (error) {
        if (!(error instanceof AppError)) {
          throw error;
        }
        errorCode = error.errorCode;
        errorMessage = error.message;
        blockerCodes = this.blockerCodesFromAppError(error);
      }
    }

    const searchRunRef = searchRun
      ? this.ref('search_run', searchRun.search_run_id, searchRun.title_card_id)
      : null;
    const consumableForEvidenceMap = Boolean(
      searchRun
        && input.bundle
        && this.isConsumableSearchRunBundle(input.bundle),
    );
    const evidenceBindingRefs = evidenceBindings.map((binding) =>
      this.ref('coverage_evidence_binding', binding.coverage_evidence_binding_id, searchRun?.title_card_id ?? input.title_card_id),
    );
    const coverageAssessmentRefs = assessments.map((assessment) =>
      this.ref('coverage_assessment', assessment.coverage_assessment_id, searchRun?.title_card_id ?? input.title_card_id),
    );
    const downstreamHandoff = searchRun && searchRunRef && input.bundle && consumableForEvidenceMap
      ? this.searchRunHandoff({
          bundle: input.bundle,
          searchRun,
          searchRunRef,
          evidenceBindingRefs,
          coverageAssessmentRefs,
          observations,
          riskAcceptances,
          coverageRoleExpectations,
          methodFamilyTargets,
        })
      : null;
    const loopbackSignal = searchRun && searchRunRef && input.bundle && !consumableForEvidenceMap
      ? this.searchRunLoopbackSignal(input.bundle, searchRunRef)
      : null;
    const auditRefs = searchRun ? this.searchRunAuditRefs(searchRun) : [];
    const serviceArtifactRefs = searchRun?.artifact_refs ?? [];
    const nodeResult: TopicSelectionWorkflowHarnessRecordSearchRunNodeResult = {
      status: searchRun ? 'succeeded' : 'blocked',
      search_run: searchRun,
      search_run_ref: searchRunRef,
      consumable_for_evidence_map: consumableForEvidenceMap,
      downstream_handoff: downstreamHandoff,
      loopback_signal: loopbackSignal,
      result_accounting_summary: this.objectPayload(searchRun?.result_accounting ?? input.bundle?.result_accounting ?? {}),
      evidence_binding_refs: evidenceBindingRefs,
      coverage_assessment_refs: coverageAssessmentRefs,
      coverage_matrix_summary: coverageMatrixSummary,
      authority_refs: searchRunRef ? [searchRunRef, ...evidenceBindingRefs, ...coverageAssessmentRefs] : [],
      audit_refs: auditRefs,
      artifact_refs: serviceArtifactRefs,
      warning_codes: this.searchRunWarningCodes(input.bundle, searchRun),
      blocker_codes: searchRun ? [] : blockerCodes,
      error_code: searchRun ? null : errorCode,
      error_message: searchRun ? null : errorMessage,
      replay_provenance: null,
    };
    const assertions = this.evaluateRecordSearchRunAssertions(input, nodeResult);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    const traceSnapshot = this.createRecordSearchRunTraceSnapshot({
      input,
      nodeInput,
      inputHash,
      nodeResult,
      assertions,
      scenarioStatus,
    });
    const traceArtifact = await controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'trace',
      storage_kind: 'inline',
      payload: traceSnapshot as unknown as Record<string, unknown>,
      workflow_run_id: input.workflow_run_id,
      input_snapshot_id: searchRun?.input_snapshot_id ?? null,
      created_by: input.created_by ?? 'system',
    });
    const traceArtifactRef = this.ref(
      'artifact_ref',
      traceArtifact.artifact_ref_id,
      traceArtifact.title_card_id ?? input.title_card_id,
    );

    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: RECORD_SEARCH_RUN_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: nodeInput,
      node_result: {
        ...nodeResult,
        artifact_refs: [...serviceArtifactRefs, traceArtifactRef],
      },
      assertions,
      harness_trace_snapshot: traceSnapshot,
      harness_trace_artifact: traceArtifact,
      harness_trace_artifact_ref: traceArtifactRef,
    };
  }

  async runBuildEvidenceMapScenario(
    input: TopicSelectionWorkflowHarnessBuildEvidenceMapInput,
  ): Promise<TopicSelectionWorkflowHarnessBuildEvidenceMapResult> {
    this.assertBuildEvidenceMapScenarioInput(input);
    const controlPlane = this.requiredControlPlane();
    const evidenceMaps = this.requiredEvidenceMaps();
    const materializer = this.requiredEvidenceMapMaterializer();
    const nodeInput = this.buildEvidenceMapNodeInput(input);
    const extraction = await this.resolveEvidenceMapExtractionDraft(input, nodeInput);
    const materialization = materializer.materialize({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      search_run_handoff: input.search_run_handoff!,
      extraction_draft: extraction.draft,
      policy_version: input.policy_version,
      output_schema_version: input.output_schema_version,
      created_by: input.created_by ?? 'system',
    });

    const materializationReportArtifact = await controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      payload: {
        payload_schema: materialization.report.schema_version,
        report: materialization.report,
      },
      workflow_run_id: input.workflow_run_id,
      created_by: input.created_by ?? 'system',
    });
    const materializationReportRef = this.ref(
      'artifact_ref',
      materializationReportArtifact.artifact_ref_id,
      materializationReportArtifact.title_card_id ?? input.title_card_id,
    );
    let evidenceMapRecords: TopicSelectionEvidenceMapCreateRecords | null = null;
    let appError: AppError | null = null;

    if (
      materialization.mapped_input
      && ['ready', 'ready_with_warning'].includes(materialization.report.status)
    ) {
      try {
        evidenceMapRecords = await evidenceMaps.createEvidenceMapFromSearchRun(materialization.mapped_input);
      } catch (error) {
        if (!(error instanceof AppError)) {
          throw error;
        }
        appError = error;
      }
    }

    const evidenceMapRef = evidenceMapRecords
      ? this.ref(
        'evidence_map',
        evidenceMapRecords.evidence_map.evidence_map_id,
        evidenceMapRecords.evidence_map.title_card_id,
        evidenceMapRecords.evidence_map.evidence_map_version,
      )
      : null;
    const evidenceUnitRefs = evidenceMapRecords?.evidence_units.map((unit) =>
      this.ref('evidence_unit', unit.evidence_unit_id, unit.title_card_id, unit.evidence_map_version),
    ) ?? [];
    const auditRefs = evidenceMapRecords ? this.evidenceMapAuditRefs(evidenceMapRecords) : [];
    let reviewPackage: TopicSelectionEvidenceMapExtractionReviewPackage | null = null;
    let reviewPackageArtifactRef: TopicSelectionFunctionalRef | null = null;
    if (materialization.report.status === 'review_required') {
      reviewPackage = this.evidenceMapReviewPackage({
        input,
        report: materialization.report,
        materializationReportRef,
        draftHash: materialization.draft_hash ?? this.hash(extraction.draft ?? {}),
      });
      const reviewPackageArtifact = await controlPlane.recordArtifactRef({
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id,
        artifact_kind: 'structured_output',
        storage_kind: 'inline',
        payload: {
          payload_schema: reviewPackage.schema_version,
          review_package: reviewPackage,
        },
        workflow_run_id: input.workflow_run_id,
        created_by: input.created_by ?? 'system',
      });
      reviewPackageArtifactRef = this.ref(
        'artifact_ref',
        reviewPackageArtifact.artifact_ref_id,
        reviewPackageArtifact.title_card_id ?? input.title_card_id,
      );
    }

    const downstreamHandoff = evidenceMapRecords && evidenceMapRef
      ? this.evidenceMapHandoff({
          input,
          records: evidenceMapRecords,
          evidenceMapRef,
          materializationReport: materialization.report,
          materializationReportRef,
          materializationReportHash: this.hash(materialization.report),
        })
      : null;
    const serviceArtifactRefs = evidenceMapRecords?.evidence_map.artifact_refs ?? [];
    const artifactRefs = this.uniqueRefs([
      ...serviceArtifactRefs,
      materializationReportRef,
      reviewPackageArtifactRef,
      extraction.agent_invocation_audit_ref,
      extraction.context_compression_report_ref,
    ]);
    const blockerCodes = this.uniqueStrings([
      ...materialization.report.blocker_codes,
      ...extraction.blocker_codes,
      ...(appError ? this.blockerCodesFromAppError(appError) : []),
    ]);
    const nodeResult: TopicSelectionWorkflowHarnessBuildEvidenceMapNodeResult = {
      status: evidenceMapRecords
        ? 'succeeded'
        : materialization.report.status === 'review_required'
          ? 'review_required'
          : 'blocked',
      agent_invocation_audit_ref: extraction.agent_invocation_audit_ref,
      agent_invocation_status: extraction.agent_invocation_status,
      context_compression_report_ref: extraction.context_compression_report_ref,
      materialization_report: materialization.report,
      review_package: reviewPackage,
      evidence_map_records: evidenceMapRecords,
      evidence_map_ref: evidenceMapRef,
      evidence_unit_refs: evidenceUnitRefs,
      downstream_handoff: downstreamHandoff,
      authority_refs: evidenceMapRef ? [evidenceMapRef, ...evidenceUnitRefs] : [],
      audit_refs: this.uniqueRefs([...auditRefs, extraction.agent_invocation_audit_ref]),
      artifact_refs: artifactRefs,
      warning_codes: this.uniqueStrings([
        ...materialization.report.warning_codes,
        ...extraction.warning_codes,
      ]),
      blocker_codes: blockerCodes,
      error_code: appError?.errorCode ?? extraction.error_code ?? (blockerCodes[0] ?? null),
      error_message: appError?.message ?? null,
      replay_provenance: null,
    };
    const assertions = this.evaluateBuildEvidenceMapAssertions(input, nodeResult);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    const traceSnapshot = this.createBuildEvidenceMapTraceSnapshot({
      input,
      nodeInput,
      nodeResult,
      assertions,
      scenarioStatus,
    });
    const traceArtifact = await controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'trace',
      storage_kind: 'inline',
      payload: traceSnapshot as unknown as Record<string, unknown>,
      workflow_run_id: input.workflow_run_id,
      input_snapshot_id: evidenceMapRecords?.evidence_map.input_snapshot_id ?? null,
      created_by: input.created_by ?? 'system',
    });
    const traceArtifactRef = this.ref(
      'artifact_ref',
      traceArtifact.artifact_ref_id,
      traceArtifact.title_card_id ?? input.title_card_id,
    );

    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: BUILD_EVIDENCE_MAP_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: nodeInput,
      node_result: {
        ...nodeResult,
        artifact_refs: this.uniqueRefs([...artifactRefs, traceArtifactRef]),
      },
      assertions,
      harness_trace_snapshot: traceSnapshot,
      harness_trace_artifact: traceArtifact,
      harness_trace_artifact_ref: traceArtifactRef,
    };
  }

  async runValidateNeedAdjudicationScenario(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
  ): Promise<TopicSelectionWorkflowHarnessValidateNeedAdjudicationResult> {
    this.assertValidateNeedAdjudicationScenarioInput(input);
    const controlPlane = this.requiredControlPlane();
    const needValidation = this.requiredNeedValidation();
    const nodeInput = this.validateNeedAdjudicationNodeInput(input);
    const inputHash = this.hash(this.validateNeedAdjudicationInputHashPayload(input, nodeInput));
    const replay = await this.findValidateNeedAdjudicationReplay(input, nodeInput, inputHash);
    if (replay) {
      return replay;
    }

    let candidate: TopicSelectionNeedCandidateRecord | null = null;
    let readiness: TopicSelectionNeedCandidateReadinessAssessmentRecord | null = null;
    let supportPacket: TopicSelectionValidationDecisionSupportPacketRecord | null = null;
    let recommendationPacket: TopicSelectionNeedAdjudicationRecommendationPacket | null = null;
    let recommendationPacketRef: TopicSelectionFunctionalRef | null = null;
    let agentInvocationAuditRef: TopicSelectionFunctionalRef | null = null;
    let contextCompressionReportRef: TopicSelectionFunctionalRef | null = null;
    let nodeResult: TopicSelectionValidateNeedAdjudicationNodeResult | null = null;

    try {
      candidate = await this.resolveValidateNeedCandidate(input);
      const duplicate = await this.findExistingAdjudicationForCandidate(candidate);
      if (duplicate) {
        nodeResult = this.validateNeedAdjudicationBlockedResult(input, {
          candidate,
          status: 'blocked',
          routeOutcome: 'blocked',
          blockerCodes: ['DUPLICATE_OR_PENDING_ADJUDICATION'],
          errorCode: 'GATE_CONSTRAINT_FAILED',
          errorMessage: 'NeedCandidate already has a pending adjudication.',
          duplicateAdjudicationRef: this.ref(
            'validate_need_adjudication_result',
            duplicate.adjudication_result_id,
            duplicate.title_card_id,
          ),
          reservedValidatedNeedRef: duplicate.output_validated_need_id
            ? this.ref('validated_need', duplicate.output_validated_need_id, duplicate.title_card_id)
            : null,
        });
      }

      if (!nodeResult) {
        readiness = await this.resolveValidateNeedReadiness(input, candidate);
        if (readiness.recommendation !== 'ready_for_validation') {
          nodeResult = this.validateNeedAdjudicationBlockedResult(input, {
            candidate,
            readiness,
            status: 'blocked',
            routeOutcome: 'blocked',
            blockerCodes: this.readinessBlockerCodes(readiness.recommendation),
            errorCode: 'GATE_CONSTRAINT_FAILED',
            errorMessage: `NeedCandidate readiness is ${readiness.recommendation}.`,
            requiredActions: readiness.required_actions,
          });
        }
      }

      if (!nodeResult && readiness) {
        supportPacket = await this.resolveValidateNeedSupportPacket(input, candidate, readiness);
        const recommendation = await this.resolveNeedAdjudicationRecommendation(input, nodeInput, candidate, readiness, supportPacket);
        recommendationPacket = recommendation.packet;
        recommendationPacketRef = recommendation.packet_ref;
        agentInvocationAuditRef = recommendation.agent_invocation_audit_ref;
        contextCompressionReportRef = recommendation.context_compression_report_ref;
        const gate = this.validateNeedAdjudicationRecommendationGate(input, candidate, supportPacket, recommendationPacket);
        if (gate.status !== 'ready') {
          nodeResult = this.validateNeedAdjudicationBlockedResult(input, {
            candidate,
            readiness,
            supportPacket,
            recommendationPacketRef,
            status: gate.status,
            routeOutcome: gate.status,
            blockerCodes: gate.blocker_codes,
            reviewReasonCodes: gate.review_reason_codes,
            errorCode: gate.error_code,
            errorMessage: gate.error_message,
            finalDecision: recommendationPacket.final_decision,
            requiredActions: recommendationPacket.required_actions,
            acceptedRiskRefs: recommendationPacket.accepted_risk_refs,
            residualRiskRefs: recommendationPacket.residual_risk_refs,
            warningCodes: this.uniqueStrings([
              ...this.validateNeedAdjudicationWarningCodes(readiness, supportPacket, recommendationPacket),
              ...recommendation.warning_codes,
            ]),
          });
        } else {
          const adjudication = await needValidation.adjudicateNeed({
            workspace_id: input.workspace_id ?? null,
            need_candidate_id: candidate.need_candidate_id,
            support_packet_id: supportPacket.validation_support_packet_id,
            final_decision: recommendationPacket.final_decision,
            rationale: recommendationPacket.rationale,
            adjudicated_by: this.adjudicationActorForRecommendation(input, recommendationPacket.final_decision),
            rejected_reason: recommendationPacket.rejected_reason ?? null,
            required_actions: recommendationPacket.required_actions,
            gap_codes: recommendationPacket.gap_codes,
            accepted_risk_refs: recommendationPacket.accepted_risk_refs,
            residual_risk_refs: recommendationPacket.residual_risk_refs,
            merge_target_need_candidate_ref: recommendationPacket.merge_target_need_candidate_ref ?? null,
            searchplan_recheck_reason: recommendationPacket.searchplan_recheck_reason ?? undefined,
            searchplan_recheck_gap_codes: recommendationPacket.searchplan_recheck_gap_codes,
            decision_payload: {
              recommendation_packet_id: recommendationPacket.recommendation_packet_id,
              recommendation_packet_ref: recommendationPacketRef,
              execution_mode: input.execution_mode,
              profile_id: nodeInput.profile_id,
            },
            policy_version_id: input.policy_version,
          });
          const adjudicationResult = adjudication.adjudication_result;
          nodeResult = {
            schema_version: TOPIC_SELECTION_VALIDATE_NEED_ADJUDICATION_NODE_RESULT_SCHEMA_VERSION,
            node_id: VALIDATE_NEED_ADJUDICATION_NODE_ID,
            workflow_run_id: input.workflow_run_id,
            node_attempt_id: input.node_attempt_id,
            status: 'ready',
            route_outcome: this.routeOutcomeForAdjudicationDecision(adjudicationResult.final_decision),
            need_candidate_ref: this.ref('need_candidate', candidate.need_candidate_id, candidate.title_card_id, candidate.candidate_version),
            readiness_assessment_ref: this.ref('need_candidate_readiness', readiness.readiness_assessment_id, readiness.title_card_id),
            validation_support_packet_ref: this.ref(
              'validation_decision_support_packet',
              supportPacket.validation_support_packet_id,
              supportPacket.title_card_id,
            ),
            adjudication_result_ref: this.ref(
              'validate_need_adjudication_result',
              adjudicationResult.adjudication_result_id,
              adjudicationResult.title_card_id,
            ),
            reserved_validated_need_ref: adjudicationResult.output_validated_need_id
              ? this.ref('validated_need', adjudicationResult.output_validated_need_id, adjudicationResult.title_card_id)
              : null,
            next_node_id: adjudicationResult.final_decision === 'validate' ? HUMAN_CONFIRM_NEED_NODE_ID : null,
            repair_target: this.repairTargetForRouteOutcome(this.routeOutcomeForAdjudicationDecision(adjudicationResult.final_decision)),
            final_decision: adjudicationResult.final_decision,
            required_actions: adjudicationResult.required_actions,
            blocker_codes: [],
            warning_codes: this.uniqueStrings([
              ...this.validateNeedAdjudicationWarningCodes(readiness, supportPacket, recommendationPacket),
              ...recommendation.warning_codes,
            ]),
            review_reason_codes: [],
            accepted_risk_refs: adjudicationResult.accepted_risk_refs,
            residual_risk_refs: adjudicationResult.residual_risk_refs,
            merge_target_need_candidate_ref: adjudicationResult.merge_target_need_candidate_ref ?? null,
            recheck_request_ref: adjudicationResult.output_searchplan_recheck_request_ref ?? null,
            memory_suggestion_ref: adjudicationResult.output_memory_suggestion_ref ?? null,
            recommendation_packet_ref: recommendationPacketRef,
            harness_trace_artifact_ref: null,
            replay_provenance: null,
            duplicate_adjudication_ref: null,
            error_code: null,
            error_message: null,
          };
        }
      }
    } catch (error) {
      if (!(error instanceof AppError)) {
        throw error;
      }
      const errorAgentAuditRef = error.details?.agent_invocation_audit_ref;
      const errorCompressionReportRef = error.details?.context_compression_report_ref;
      if (!agentInvocationAuditRef && this.isFunctionalRef(errorAgentAuditRef)) {
        agentInvocationAuditRef = errorAgentAuditRef;
      }
      if (!contextCompressionReportRef && this.isFunctionalRef(errorCompressionReportRef)) {
        contextCompressionReportRef = errorCompressionReportRef;
      }
      nodeResult = this.validateNeedAdjudicationBlockedResult(input, {
        candidate,
        readiness,
        supportPacket,
        recommendationPacketRef,
        status: 'blocked',
        routeOutcome: 'blocked',
        blockerCodes: this.blockerCodesFromAppError(error),
        errorCode: error.errorCode,
        errorMessage: error.message,
      });
    }

    const result = nodeResult ?? this.validateNeedAdjudicationBlockedResult(input, {
      candidate,
      readiness,
      supportPacket,
      recommendationPacketRef,
      status: 'blocked',
      routeOutcome: 'blocked',
      blockerCodes: ['UNKNOWN_VALIDATE_NEED_ADJUDICATION_BLOCK'],
      errorCode: 'INTERNAL_ERROR',
      errorMessage: 'ValidateNeedAdjudication runner did not produce a node result.',
    });
    const artifactRefs = this.uniqueRefs([
      recommendationPacketRef,
      agentInvocationAuditRef,
      contextCompressionReportRef,
    ]);
    const assertions = this.evaluateValidateNeedAdjudicationAssertions(input, result);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    const traceSnapshot = this.createValidateNeedAdjudicationTraceSnapshot({
      input,
      nodeInput,
      inputHash,
      nodeResult: result,
      recommendationPacket,
      artifactRefs,
      assertions,
      scenarioStatus,
    });
    const traceArtifact = await controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'trace',
      storage_kind: 'inline',
      payload: traceSnapshot as unknown as Record<string, unknown>,
      workflow_run_id: input.workflow_run_id,
      created_by: input.created_by ?? 'system',
    });
    const traceArtifactRef = this.ref(
      'artifact_ref',
      traceArtifact.artifact_ref_id,
      traceArtifact.title_card_id ?? input.title_card_id,
    );
    const resultWithTrace: TopicSelectionValidateNeedAdjudicationNodeResult = {
      ...result,
      harness_trace_artifact_ref: traceArtifactRef,
    };

    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: VALIDATE_NEED_ADJUDICATION_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: nodeInput,
      node_result: resultWithTrace,
      assertions,
      harness_trace_snapshot: {
        ...traceSnapshot,
        node_result: resultWithTrace,
        artifact_refs: this.uniqueRefs([...artifactRefs, traceArtifactRef]),
      },
      harness_trace_artifact: traceArtifact,
      harness_trace_artifact_ref: traceArtifactRef,
    };
  }

  async runHumanConfirmNeedScenario(
    input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput,
  ): Promise<TopicSelectionWorkflowHarnessHumanConfirmNeedResult> {
    this.assertHumanConfirmNeedScenarioInput(input);
    const controlPlane = this.requiredControlPlane();
    const needValidation = this.requiredNeedValidation();
    const nodeInput = this.humanConfirmNeedNodeInput(input);
    const inputHash = this.hash(this.humanConfirmNeedInputHashPayload(input, nodeInput));
    const replay = await this.findHumanConfirmNeedReplay(input, nodeInput, inputHash);
    if (replay) {
      return replay;
    }

    let adjudication: TopicSelectionValidateNeedAdjudicationResultRecord | null = null;
    let candidate: TopicSelectionNeedCandidateRecord | null = null;
    let supportPacket: TopicSelectionValidationDecisionSupportPacketRecord | null = null;
    let contextPacket: HumanConfirmationSemanticReviewContextPacket | null = null;
    let contextPacketRef: TopicSelectionFunctionalRef | null = null;
    let semanticReview: HumanConfirmationSemanticReview | null = null;
    let semanticReviewRef: TopicSelectionFunctionalRef | null = null;
    let agentInvocationAuditRef: TopicSelectionFunctionalRef | null = null;
    let contextCompressionReportRef: TopicSelectionFunctionalRef | null = null;
    let semanticReviewRuntimeWarningCodes: string[] = [];
    let nodeResult: TopicSelectionHumanConfirmNeedNodeResult | null = null;

    try {
      adjudication = await needValidation.getAdjudicationResultById(input.adjudication_result_ref.ref_id);
      if (!adjudication) {
        throw new AppError(404, 'NOT_FOUND', `AdjudicationResult ${input.adjudication_result_ref.ref_id} not found.`);
      }
      candidate = await needValidation.getNeedCandidateById(adjudication.need_candidate_id);
      if (!candidate) {
        throw new AppError(404, 'NOT_FOUND', `NeedCandidate ${adjudication.need_candidate_id} not found.`);
      }
      supportPacket = await needValidation.getValidationSupportPacketById(adjudication.support_packet_id);
      if (!supportPacket) {
        throw new AppError(404, 'NOT_FOUND', `ValidationDecisionSupportPacket ${adjudication.support_packet_id} not found.`);
      }
      this.assertHumanConfirmNeedLineage(input, adjudication, candidate, supportPacket);

      const duplicate = await needValidation.getValidatedNeedById(input.reserved_validated_need_ref.ref_id);
      if (duplicate) {
        nodeResult = this.humanConfirmNeedBlockedResult(input, {
          adjudication,
          candidate,
          supportPacket,
          status: 'blocked',
          routeOutcome: 'blocked',
          blockerCodes: ['DUPLICATE_VALIDATED_NEED'],
          errorCode: 'GATE_CONSTRAINT_FAILED',
          errorMessage: 'Reserved ValidatedNeed id is already materialized.',
        });
      }

      if (!nodeResult) {
        const context = await this.recordHumanConfirmationSemanticContextPacket(input, nodeInput, adjudication, candidate, supportPacket);
        contextPacket = context.packet;
        contextPacketRef = context.packet_ref;
        const review = await this.resolveHumanConfirmationSemanticReview(input, contextPacket, contextPacketRef);
        semanticReview = review.review;
        semanticReviewRef = review.review_ref;
        agentInvocationAuditRef = review.agent_invocation_audit_ref;
        contextCompressionReportRef = review.context_compression_report_ref;
        semanticReviewRuntimeWarningCodes = review.warning_codes;
        const semanticGate = this.humanConfirmationSemanticReviewGate(semanticReview);
        if (semanticGate.status !== 'ready') {
          nodeResult = this.humanConfirmNeedBlockedResult(input, {
            adjudication,
            candidate,
            supportPacket,
            semanticReviewContextPacketRef: contextPacketRef,
            semanticReviewRef,
            status: semanticGate.status,
            routeOutcome: semanticGate.status === 'blocked' ? 'blocked' : 'require_human_review',
            blockerCodes: semanticGate.blocker_codes,
            reviewReasonCodes: semanticGate.review_reason_codes,
            warningCodes: this.uniqueStrings([
              ...semanticReview.warning_codes,
              ...semanticReviewRuntimeWarningCodes,
            ]),
            errorCode: semanticGate.error_code,
            errorMessage: semanticGate.error_message,
          });
        }
      }

      if (!nodeResult && contextPacketRef && semanticReviewRef) {
        const confirmation = await needValidation.confirmValidatedNeed({
          workspace_id: input.workspace_id ?? null,
          adjudication_result_id: input.adjudication_result_ref.ref_id,
          confirmation_input: input.confirmation_input,
          semantic_review_context_packet_ref: contextPacketRef,
          semantic_review_ref: semanticReviewRef,
          artifact_refs: this.uniqueRefs([contextPacketRef, semanticReviewRef, agentInvocationAuditRef]),
          policy_version_id: input.policy_version,
        });
        nodeResult = {
          schema_version: TOPIC_SELECTION_HUMAN_CONFIRM_NEED_NODE_RESULT_SCHEMA_VERSION,
          node_id: HUMAN_CONFIRM_NEED_NODE_ID,
          workflow_run_id: input.workflow_run_id,
          node_attempt_id: input.node_attempt_id,
          status: 'ready',
          route_outcome: 'advance_to_publish_v1b_input_bundle',
          adjudication_result_ref: input.adjudication_result_ref,
          need_candidate_ref: input.need_candidate_ref,
          validation_support_packet_ref: input.validation_support_packet_ref,
          human_decision_ref: this.ref(
            'human_confirmed_decision',
            confirmation.validated_need.human_decision_id,
            confirmation.validated_need.title_card_id,
          ),
          validated_need_ref: this.ref(
            'validated_need',
            confirmation.validated_need.validated_need_id,
            confirmation.validated_need.title_card_id,
          ),
          semantic_review_context_packet_ref: contextPacketRef,
          semantic_review_ref: semanticReviewRef,
          confirmation_input_hash: this.hash(input.confirmation_input),
          accepted_risk_refs: confirmation.validated_need.accepted_risk_refs,
          residual_risk_refs: confirmation.validated_need.residual_risk_refs,
          required_check_results_snapshot: input.confirmation_input.required_check_results,
          blocker_codes: [],
          warning_codes: this.uniqueStrings([
            ...(semanticReview?.warning_codes ?? []),
            ...semanticReviewRuntimeWarningCodes,
          ]),
          review_reason_codes: [],
          next_node_id: 'topic-selection.v1a.publish-v1b-input-bundle.v1',
          harness_trace_artifact_ref: null,
          replay_provenance: null,
          error_code: null,
          error_message: null,
        };
      }
    } catch (error) {
      if (!(error instanceof AppError)) {
        throw error;
      }
      const errorAgentAuditRef = error.details?.agent_invocation_audit_ref;
      const errorCompressionReportRef = error.details?.context_compression_report_ref;
      if (!agentInvocationAuditRef && this.isFunctionalRef(errorAgentAuditRef)) {
        agentInvocationAuditRef = errorAgentAuditRef;
      }
      if (!contextCompressionReportRef && this.isFunctionalRef(errorCompressionReportRef)) {
        contextCompressionReportRef = errorCompressionReportRef;
      }
      nodeResult = this.humanConfirmNeedBlockedResult(input, {
        adjudication,
        candidate,
        supportPacket,
        semanticReviewContextPacketRef: contextPacketRef,
        semanticReviewRef,
        status: this.humanConfirmNeedStatusFromAppError(error),
        routeOutcome: this.humanConfirmNeedStatusFromAppError(error),
        blockerCodes: this.humanConfirmNeedBlockerCodesFromAppError(error),
        warningCodes: this.warningCodesFromAppError(error),
        reviewReasonCodes: this.reviewReasonCodesFromAppError(error),
        errorCode: error.errorCode,
        errorMessage: error.message,
      });
    }

    const result = nodeResult ?? this.humanConfirmNeedBlockedResult(input, {
      adjudication,
      candidate,
      supportPacket,
      semanticReviewContextPacketRef: contextPacketRef,
      semanticReviewRef,
      status: 'blocked',
      routeOutcome: 'blocked',
      blockerCodes: ['UNKNOWN_HUMAN_CONFIRM_NEED_BLOCK'],
      errorCode: 'INTERNAL_ERROR',
      errorMessage: 'HumanConfirmNeed runner did not produce a node result.',
    });
    const artifactRefs = this.uniqueRefs([
      contextPacketRef,
      semanticReviewRef,
      agentInvocationAuditRef,
      contextCompressionReportRef,
    ]);
    const assertions = this.evaluateHumanConfirmNeedAssertions(input, result);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    const traceSnapshot = this.createHumanConfirmNeedTraceSnapshot({
      input,
      nodeInput,
      inputHash,
      nodeResult: result,
      contextPacket,
      semanticReview,
      artifactRefs,
      assertions,
      scenarioStatus,
    });
    const traceArtifact = await controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'trace',
      storage_kind: 'inline',
      payload: traceSnapshot as unknown as Record<string, unknown>,
      workflow_run_id: input.workflow_run_id,
      created_by: input.created_by ?? 'system',
    });
    const traceArtifactRef = this.ref('artifact_ref', traceArtifact.artifact_ref_id, traceArtifact.title_card_id ?? input.title_card_id);
    const resultWithTrace: TopicSelectionHumanConfirmNeedNodeResult = {
      ...result,
      harness_trace_artifact_ref: traceArtifactRef,
    };
    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: HUMAN_CONFIRM_NEED_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: nodeInput,
      node_result: resultWithTrace,
      assertions,
      harness_trace_snapshot: {
        ...traceSnapshot,
        node_result: resultWithTrace,
        artifact_refs: this.uniqueRefs([...artifactRefs, traceArtifactRef]),
      },
      harness_trace_artifact: traceArtifact,
      harness_trace_artifact_ref: traceArtifactRef,
    };
  }

  async runPublishV1bInputBundleScenario(
    input: TopicSelectionWorkflowHarnessPublishV1bInputBundleInput,
  ): Promise<TopicSelectionWorkflowHarnessPublishV1bInputBundleResult> {
    this.assertPublishV1bInputBundleScenarioInput(input);
    const controlPlane = this.requiredControlPlane();
    const needValidation = this.requiredNeedValidation();
    const nodeInput = this.publishV1bInputBundleNodeInput(input);
    const inputHash = this.hash(this.publishV1bInputBundleInputHashPayload(nodeInput));
    const replay = await this.findPublishV1bInputBundleReplay(input, nodeInput, inputHash);
    if (replay) {
      return replay;
    }

    let validatedNeed: TopicSelectionValidatedNeedRecord | null = null;
    let candidate: TopicSelectionNeedCandidateRecord | null = null;
    let supportPacket: TopicSelectionValidationDecisionSupportPacketRecord | null = null;
    let adjudication: TopicSelectionValidateNeedAdjudicationResultRecord | null = null;
    let bundle: TopicSelectionV1aToV1bInputBundleRecord | null = null;
    let nodeResult: TopicSelectionPublishV1bInputBundleNodeResult | null = null;

    try {
      this.assertNonEmpty(nodeInput.expected_bundle_version, 'expected_bundle_version');
      validatedNeed = await needValidation.getValidatedNeedById(input.validated_need_ref.ref_id);
      if (!validatedNeed) {
        throw new AppError(404, 'NOT_FOUND', `ValidatedNeed ${input.validated_need_ref.ref_id} not found.`);
      }
      candidate = await needValidation.getNeedCandidateById(input.source_need_candidate_ref.ref_id);
      if (!candidate) {
        throw new AppError(404, 'NOT_FOUND', `NeedCandidate ${input.source_need_candidate_ref.ref_id} not found.`);
      }
      supportPacket = await needValidation.getValidationSupportPacketById(input.support_packet_ref.ref_id);
      if (!supportPacket) {
        throw new AppError(404, 'NOT_FOUND', `ValidationDecisionSupportPacket ${input.support_packet_ref.ref_id} not found.`);
      }
      adjudication = await needValidation.getAdjudicationResultById(input.adjudication_result_ref.ref_id);
      if (!adjudication) {
        throw new AppError(404, 'NOT_FOUND', `AdjudicationResult ${input.adjudication_result_ref.ref_id} not found.`);
      }
      const humanDecision = await controlPlane.getHumanDecision(input.human_decision_ref.ref_id);
      if (!humanDecision) {
        throw new AppError(404, 'NOT_FOUND', `HumanConfirmedDecision ${input.human_decision_ref.ref_id} not found.`);
      }
      const memorySuggestions = await needValidation.listCandidateMemorySuggestionsByNeedCandidateId(candidate.need_candidate_id);
      const expectedMemorySuggestionRefs = memorySuggestions.map((suggestion) =>
        this.ref('candidate_decision_memory_suggestion', suggestion.memory_suggestion_id, suggestion.title_card_id)
      );
      this.assertPublishV1bInputBundleLineage(
        input,
        validatedNeed,
        candidate,
        supportPacket,
        adjudication,
        humanDecision,
        expectedMemorySuggestionRefs,
      );

      const existingBundles = await needValidation.listV1aToV1bInputBundlesByValidatedNeedId(validatedNeed.validated_need_id);
      const existingBundle = existingBundles.find((item) => item.bundle_version === nodeInput.expected_bundle_version) ?? null;
      bundle = await needValidation.publishV1bInputBundle({
        validated_need_id: validatedNeed.validated_need_id,
        bundle_version: nodeInput.expected_bundle_version,
        created_by: input.created_by ?? 'system',
      });
      if (bundle.bundle_version !== nodeInput.expected_bundle_version) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Published bundle version does not match expected_bundle_version.');
      }
      this.assertPublishedV1bInputBundleMatchesInput(input, bundle);
      const bundleRef = this.ref(
        'v1b_input_bundle',
        bundle.v1b_input_bundle_id,
        bundle.title_card_id,
        bundle.bundle_version,
      );
      nodeResult = {
        schema_version: TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_RESULT_SCHEMA_VERSION,
        node_id: PUBLISH_V1B_INPUT_BUNDLE_NODE_ID,
        workflow_run_id: input.workflow_run_id,
        node_attempt_id: input.node_attempt_id,
        status: 'ready',
        route_outcome: 'published_v1b_input_bundle',
        validated_need_ref: bundle.validated_need_ref,
        v1b_input_bundle_ref: bundleRef,
        bundle_version: bundle.bundle_version,
        bundle_payload_hash: this.hash(bundle),
        idempotency_result: existingBundle ? 'reused_existing_bundle' : 'created_new_bundle',
        carried_authority_refs: this.publishV1bInputBundleCarriedRefs(input, bundle, bundleRef),
        risk_refs: bundle.risk_refs,
        memory_suggestion_refs: bundle.memory_suggestion_refs,
        recheck_request_refs: bundle.recheck_request_refs,
        blocker_codes: [],
        warning_codes: [],
        harness_trace_artifact_ref: null,
        replay_provenance: null,
        error_code: null,
        error_message: null,
      };
    } catch (error) {
      if (!(error instanceof AppError)) {
        throw error;
      }
      nodeResult = this.publishV1bInputBundleBlockedResult(input, {
        validatedNeed,
        blockerCodes: this.blockerCodesFromAppError(error),
        errorCode: error.errorCode,
        errorMessage: error.message,
      });
    }

    const result = nodeResult ?? this.publishV1bInputBundleBlockedResult(input, {
      validatedNeed,
      blockerCodes: ['UNKNOWN_PUBLISH_V1B_INPUT_BUNDLE_BLOCK'],
      errorCode: 'INTERNAL_ERROR',
      errorMessage: 'PublishV1bInputBundle runner did not produce a node result.',
    });
    const assertions = this.evaluatePublishV1bInputBundleAssertions(input, result);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    const traceSnapshot = this.createPublishV1bInputBundleTraceSnapshot({
      input,
      nodeInput,
      inputHash,
      nodeResult: result,
      bundle,
      assertions,
      scenarioStatus,
    });
    const traceArtifact = await controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'trace',
      storage_kind: 'inline',
      payload: traceSnapshot as unknown as Record<string, unknown>,
      workflow_run_id: input.workflow_run_id,
      created_by: input.created_by ?? 'system',
    });
    const traceArtifactRef = this.ref('artifact_ref', traceArtifact.artifact_ref_id, traceArtifact.title_card_id ?? input.title_card_id);
    const resultWithTrace: TopicSelectionPublishV1bInputBundleNodeResult = {
      ...result,
      harness_trace_artifact_ref: traceArtifactRef,
    };
    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: PUBLISH_V1B_INPUT_BUNDLE_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: nodeInput,
      node_result: resultWithTrace,
      assertions,
      harness_trace_snapshot: {
        ...traceSnapshot,
        node_result: resultWithTrace,
        artifact_refs: this.uniqueRefs([traceArtifactRef]),
      },
      harness_trace_artifact: traceArtifact,
      harness_trace_artifact_ref: traceArtifactRef,
    };
  }

  async runGenerateNeedCandidateScenario(
    input: TopicSelectionWorkflowHarnessGenerateNeedCandidateInput,
  ): Promise<TopicSelectionWorkflowHarnessGenerateNeedCandidateResult> {
    this.assertScenarioInput(input);
    const inputHash = this.hash(this.generateNeedCandidateInputHashPayload(input));
    const replay = await this.findGenerateNeedCandidateReplay(input, inputHash);
    if (replay) {
      return replay;
    }
    const compiledContext = await this.dependencies.contextCompiler.compileContextPair(
      this.contextCompileInput(input),
    );
    const nodeInput = this.nodeInput(input, compiledContext);
    const adapterResult = await this.dependencies.generateNeedCandidateAdapter.generateRankedCandidateDraftBatch({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      node_input: nodeInput,
      run_mode: input.run_mode,
      executor_kind: input.executor_kind,
      execution_spec: input.execution_spec ?? null,
      model_option_id: input.model_option_id ?? null,
      debate_loop_id: input.debate_loop_id ?? null,
      debate_policy_id: input.debate_policy_id ?? null,
      debate_execution_plan: input.debate_execution_plan ?? null,
      debate_slot_execution_overrides: input.debate_slot_execution_overrides ?? null,
      debate_slot_model_option_overrides: input.debate_slot_model_option_overrides ?? null,
      debate_mocked_outputs: input.debate_mocked_outputs ?? null,
      debate_codex_responses: input.debate_codex_responses ?? null,
      mocked_output: input.mocked_output ?? null,
      codex_response: input.codex_response ?? null,
      runtime_token_budget_overrides: input.runtime_token_budget_overrides ?? null,
      current_round_index: input.current_round_index ?? null,
      remaining_round_budget: input.remaining_round_budget ?? null,
      persist_admitted_candidates: input.persist_admitted_candidates ?? false,
      persistence_context: input.persistence_context ?? null,
      created_by: input.created_by ?? 'system',
    });

    const assertions = this.evaluateAssertions(input, adapterResult);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    const traceSnapshot = this.traceSnapshot({
      input,
      inputHash,
      compiledContext,
      nodeInput,
      adapterResult,
      assertions,
      scenarioStatus,
    });
    const traceArtifact = await this.dependencies.artifactBoundary.recordArtifact({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      artifact_key: 'discovery_audit',
      payload_schema: HARNESS_TRACE_PAYLOAD_SCHEMA,
      payload: traceSnapshot as unknown as Record<string, unknown>,
      source_refs: this.traceSourceRefs(compiledContext, adapterResult),
      created_by: input.created_by ?? 'system',
    });

    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: GENERATE_NEED_CANDIDATE_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: nodeInput,
      compiled_context: compiledContext,
      adapter_result: adapterResult,
      assertions,
      harness_trace_snapshot: traceSnapshot,
      harness_trace_artifact: traceArtifact.artifact_entry,
    };
  }

  // D-29 (T-089 ⑤, 2026-07-06): bounded auto re-entry chain over the single-round scenario.
  // Additive wrapper only — the single-round method above stays byte-identical, no product route
  // calls this, each round keeps its own node_attempt/trace/replay identity, and the D-22 round
  // rules stay double-guarded here and in TopicSelectionSupplementalRoundRoutingService.
  async runGenerateNeedCandidateSupplementalChain(
    input: TopicSelectionWorkflowHarnessGenerateNeedCandidateInput,
    options?: TopicSelectionWorkflowHarnessSupplementalChainOptions,
  ): Promise<TopicSelectionWorkflowHarnessSupplementalChainResult> {
    const maxTotalRounds = Math.min(
      Math.max(options?.max_total_rounds ?? SUPPLEMENTAL_CHAIN_MAX_TOTAL_ROUNDS, 1),
      SUPPLEMENTAL_CHAIN_MAX_TOTAL_ROUNDS,
    );
    const baseAttemptId = input.node_attempt_id;
    let roundIndex = Math.max(input.current_round_index ?? 1, 1);
    // Round-1 default budget lets the chain reach maxTotalRounds; an explicit caller budget wins.
    let remainingBudget = Math.max(input.remaining_round_budget ?? maxTotalRounds - roundIndex, 0);
    let currentInput: TopicSelectionWorkflowHarnessGenerateNeedCandidateInput = {
      ...input,
      current_round_index: roundIndex,
      remaining_round_budget: remainingBudget,
    };
    const rounds: TopicSelectionWorkflowHarnessSupplementalChainRound[] = [];

    for (;;) {
      const result = await this.runGenerateNeedCandidateScenario(currentInput);
      const routingDecision = result.adapter_result.supplemental_round_routing_decision?.routing_decision ?? null;
      rounds.push({
        round_index: roundIndex,
        node_attempt_id: currentInput.node_attempt_id,
        scenario_status: result.scenario_status,
        routing_decision: routingDecision,
      });
      if (result.scenario_status !== 'passed') {
        return { schema_version: 'v1', rounds, final: result, stop_reason: 'scenario_not_passed' };
      }
      if (routingDecision !== 'run_supplemental_round') {
        return { schema_version: 'v1', rounds, final: result, stop_reason: 'terminal_routing' };
      }
      if (roundIndex >= maxTotalRounds || remainingBudget <= 0) {
        return { schema_version: 'v1', rounds, final: result, stop_reason: 'round_budget_exhausted' };
      }
      roundIndex += 1;
      remainingBudget -= 1;
      currentInput = {
        ...currentInput,
        node_attempt_id: `${baseAttemptId}__r${roundIndex}`,
        current_round_index: roundIndex,
        remaining_round_budget: remainingBudget,
        // Caller expectations describe the entry round; derived rounds drop them so a
        // round-1 assertion (e.g. routing_decision=run_supplemental_round) cannot fail round 2+.
        expectations: undefined,
      };
    }
  }

  private async findGenerateNeedCandidateReplay(
    input: TopicSelectionWorkflowHarnessGenerateNeedCandidateInput,
    inputHash: string,
  ): Promise<TopicSelectionWorkflowHarnessGenerateNeedCandidateResult | null> {
    if (!this.dependencies.controlPlane) {
      return null;
    }
    const artifacts = await this.dependencies.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
    const traceArtifacts = artifacts
      .filter((artifact) => {
        const snapshot = this.generateNeedCandidateArtifactSnapshot(artifact);
        return snapshot?.artifact_key === 'discovery_audit'
          && snapshot.node_attempt_id === input.node_attempt_id
          && this.generateNeedCandidateTracePayload(snapshot.payload)?.payload_schema === HARNESS_TRACE_PAYLOAD_SCHEMA;
      })
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
    if (traceArtifacts.length === 0) {
      return null;
    }

    const matching = traceArtifacts.find((artifact) => {
      const snapshot = this.generateNeedCandidateArtifactSnapshot(artifact);
      const payload = snapshot ? this.generateNeedCandidateTracePayload(snapshot.payload) : null;
      return payload?.input_hash === inputHash;
    });
    if (!matching) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'node_attempt_id replay input hash does not match the existing generate-need-candidate attempt.',
        {
          blocker_codes: ['REPLAY_INPUT_HASH_MISMATCH'],
          node_attempt_id: input.node_attempt_id,
        },
      );
    }

    const snapshot = this.generateNeedCandidateArtifactSnapshot(matching);
    const existingPayload = snapshot ? this.generateNeedCandidateTracePayload(snapshot.payload) : null;
    if (!snapshot || !existingPayload) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'GenerateNeedCandidate replay trace payload is not readable.');
    }
    const existingTraceRef = this.ref('artifact_ref', matching.artifact_ref_id, matching.title_card_id ?? input.title_card_id);
    const adapterResult: TopicSelectionGenerateNeedCandidateOrchestratorAdapterResult = {
      ...existingPayload.adapter_result,
      warning_codes: existingPayload.adapter_result.warning_codes
        ?? existingPayload.adapter_result.invocation_result?.warning_codes
        ?? [],
      replay_provenance: {
        replayed: true,
        source_workflow_run_id: existingPayload.workflow_run_id,
        source_node_attempt_id: existingPayload.node_attempt_id,
        source_trace_artifact_ref: existingTraceRef,
        input_hash: existingPayload.input_hash,
      },
    };
    const assertions = this.evaluateAssertions(input, adapterResult);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    const harnessTraceArtifact = this.generateNeedCandidateArtifactEntry(matching, snapshot, existingTraceRef);
    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: GENERATE_NEED_CANDIDATE_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: existingPayload.node_input,
      compiled_context: existingPayload.compiled_context,
      adapter_result: adapterResult,
      assertions,
      harness_trace_snapshot: {
        ...existingPayload,
        scenario_id: input.scenario_id,
        scenario_case_id: input.scenario_case_id ?? null,
        scenario_status: scenarioStatus,
        adapter_result: adapterResult,
        adapter_status: adapterResult.status,
        routing_decision: adapterResult.supplemental_round_routing_decision?.routing_decision ?? null,
        assertions,
      },
      harness_trace_artifact: harnessTraceArtifact,
    };
  }

  private replayProvenanceFromTrace(
    trace: { workflow_run_id: string; node_attempt_id: string; input_hash: string },
    traceArtifactRef: TopicSelectionFunctionalRef,
  ): TopicSelectionWorkflowHarnessReplayProvenance {
    return {
      replayed: true,
      source_workflow_run_id: trace.workflow_run_id,
      source_node_attempt_id: trace.node_attempt_id,
      source_trace_artifact_ref: traceArtifactRef,
      input_hash: trace.input_hash,
    };
  }

  private async findCreateTopicSeedReplay(
    input: TopicSelectionWorkflowHarnessCreateTopicSeedInput,
    nodeInput: TopicSelectionWorkflowHarnessCreateTopicSeedNodeInput,
    inputHash: string,
  ): Promise<TopicSelectionWorkflowHarnessCreateTopicSeedResult | null> {
    const controlPlane = this.requiredControlPlane();
    const artifacts = await controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
    const traceArtifacts = artifacts
      .filter((artifact) => artifact.artifact_kind === 'trace')
      .filter((artifact) => {
        const payload = artifact.payload as Partial<TopicSelectionWorkflowHarnessCreateTopicSeedTraceSnapshot> | null;
        return payload?.payload_schema === TOPIC_SEED_TRACE_PAYLOAD_SCHEMA
          && payload.node_id === CREATE_TOPIC_SEED_NODE_ID
          && payload.node_attempt_id === input.node_attempt_id
          && typeof payload.input_hash === 'string'
          && payload.node_result;
      })
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
    if (traceArtifacts.length === 0) {
      return null;
    }
    const matching = traceArtifacts.find((artifact) => {
      const payload = artifact.payload as Partial<TopicSelectionWorkflowHarnessCreateTopicSeedTraceSnapshot> | null;
      return payload?.input_hash === inputHash;
    });
    const existing = matching ?? traceArtifacts[0]!;
    const existingPayload = existing.payload as TopicSelectionWorkflowHarnessCreateTopicSeedTraceSnapshot;
    const existingTraceRef = this.ref('artifact_ref', existing.artifact_ref_id, existing.title_card_id ?? input.title_card_id);
    if (!matching) {
      const nodeResult: TopicSelectionWorkflowHarnessCreateTopicSeedNodeResult = {
        status: 'blocked',
        topic_seed: null,
        topic_seed_ref: null,
        authority_refs: [],
        audit_refs: [],
        artifact_refs: [existingTraceRef],
        warning_codes: [],
        blocker_codes: ['REPLAY_INPUT_HASH_MISMATCH'],
        error_code: 'VERSION_CONFLICT',
        error_message: 'node_attempt_id replay input hash does not match the existing attempt.',
        replay_provenance: null,
      };
      const assertions = this.evaluateCreateTopicSeedAssertions(input, nodeResult);
      const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
      const traceSnapshot = this.createTopicSeedTraceSnapshot({
        input,
        nodeInput,
        inputHash,
        nodeResult,
        assertions,
        scenarioStatus,
      });
      const traceArtifact = await controlPlane.recordArtifactRef({
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id,
        artifact_kind: 'trace',
        storage_kind: 'inline',
        payload: traceSnapshot as unknown as Record<string, unknown>,
        workflow_run_id: input.workflow_run_id,
        created_by: input.created_by ?? 'system',
      });
      const traceArtifactRef = this.ref('artifact_ref', traceArtifact.artifact_ref_id, traceArtifact.title_card_id ?? input.title_card_id);
      const resultWithTrace = {
        ...nodeResult,
        artifact_refs: this.uniqueRefs([existingTraceRef, traceArtifactRef]),
      };
      return {
        schema_version: 'v1',
        scenario_id: input.scenario_id,
        scenario_case_id: input.scenario_case_id ?? null,
        node_id: CREATE_TOPIC_SEED_NODE_ID,
        workflow_run_id: input.workflow_run_id,
        node_attempt_id: input.node_attempt_id,
        scenario_status: scenarioStatus,
        node_input: nodeInput,
        node_result: resultWithTrace,
        assertions,
        harness_trace_snapshot: {
          ...traceSnapshot,
          node_result: resultWithTrace,
          artifact_refs: resultWithTrace.artifact_refs,
        },
        harness_trace_artifact: traceArtifact,
        harness_trace_artifact_ref: traceArtifactRef,
      };
    }

    const nodeResult: TopicSelectionWorkflowHarnessCreateTopicSeedNodeResult = {
      ...existingPayload.node_result,
      artifact_refs: this.uniqueRefs([
        ...(existingPayload.node_result.artifact_refs ?? []),
        existingTraceRef,
      ]),
      replay_provenance: this.replayProvenanceFromTrace(existingPayload, existingTraceRef),
    };
    const assertions = this.evaluateCreateTopicSeedAssertions(input, nodeResult);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: CREATE_TOPIC_SEED_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: existingPayload.node_input,
      node_result: nodeResult,
      assertions,
      harness_trace_snapshot: {
        ...existingPayload,
        scenario_status: scenarioStatus,
        node_result: nodeResult,
        artifact_refs: nodeResult.artifact_refs,
        assertions,
      },
      harness_trace_artifact: existing,
      harness_trace_artifact_ref: existingTraceRef,
    };
  }

  private async findSnapshotLiteratureResourcePoolReplay(
    input: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolInput,
    nodeInput: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeInput,
    inputHash: string,
  ): Promise<TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolResult | null> {
    const controlPlane = this.requiredControlPlane();
    const artifacts = await controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
    const traceArtifacts = artifacts
      .filter((artifact) => artifact.artifact_kind === 'trace')
      .filter((artifact) => {
        const payload =
          artifact.payload as Partial<TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolTraceSnapshot> | null;
        return payload?.payload_schema === LITERATURE_RESOURCE_POOL_TRACE_PAYLOAD_SCHEMA
          && payload.node_id === SNAPSHOT_LITERATURE_RESOURCE_POOL_NODE_ID
          && payload.node_attempt_id === input.node_attempt_id
          && typeof payload.input_hash === 'string'
          && payload.node_result;
      })
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
    if (traceArtifacts.length === 0) {
      return null;
    }
    const matching = traceArtifacts.find((artifact) => {
      const payload =
        artifact.payload as Partial<TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolTraceSnapshot> | null;
      return payload?.input_hash === inputHash;
    });
    const existing = matching ?? traceArtifacts[0]!;
    const existingPayload = existing.payload as TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolTraceSnapshot;
    const existingTraceRef = this.ref('artifact_ref', existing.artifact_ref_id, existing.title_card_id ?? input.title_card_id);

    if (!matching) {
      const nodeResult: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeResult = {
        status: 'blocked',
        literature_resource_pool_snapshot: null,
        literature_resource_pool_snapshot_ref: null,
        snapshot_version: null,
        snapshot_hash: null,
        source_scope: input.source_scope,
        included_literature_refs: [],
        content_source_refs: [],
        source_health_summary: null,
        downstream_handoff: null,
        authority_refs: [],
        audit_refs: [],
        artifact_refs: [existingTraceRef],
        warning_codes: [],
        blocker_codes: ['REPLAY_INPUT_HASH_MISMATCH'],
        error_code: 'VERSION_CONFLICT',
        error_message: 'node_attempt_id replay input hash does not match the existing attempt.',
        replay_provenance: null,
      };
      const assertions = this.evaluateSnapshotLiteratureResourcePoolAssertions(input, nodeResult);
      const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
      const traceSnapshot = this.createSnapshotLiteratureResourcePoolTraceSnapshot({
        input,
        nodeInput,
        inputHash,
        nodeResult,
        assertions,
        scenarioStatus,
      });
      const traceArtifact = await controlPlane.recordArtifactRef({
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id,
        artifact_kind: 'trace',
        storage_kind: 'inline',
        payload: traceSnapshot as unknown as Record<string, unknown>,
        workflow_run_id: input.workflow_run_id,
        created_by: input.created_by ?? 'system',
      });
      const traceArtifactRef = this.ref('artifact_ref', traceArtifact.artifact_ref_id, traceArtifact.title_card_id ?? input.title_card_id);
      const resultWithTrace = {
        ...nodeResult,
        artifact_refs: this.uniqueRefs([existingTraceRef, traceArtifactRef]),
      };
      return {
        schema_version: 'v1',
        scenario_id: input.scenario_id,
        scenario_case_id: input.scenario_case_id ?? null,
        node_id: SNAPSHOT_LITERATURE_RESOURCE_POOL_NODE_ID,
        workflow_run_id: input.workflow_run_id,
        node_attempt_id: input.node_attempt_id,
        scenario_status: scenarioStatus,
        node_input: nodeInput,
        node_result: resultWithTrace,
        assertions,
        harness_trace_snapshot: {
          ...traceSnapshot,
          node_result: resultWithTrace,
          artifact_refs: resultWithTrace.artifact_refs,
        },
        harness_trace_artifact: traceArtifact,
        harness_trace_artifact_ref: traceArtifactRef,
      };
    }

    const nodeResult: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeResult = {
      ...existingPayload.node_result,
      artifact_refs: this.uniqueRefs([
        ...(existingPayload.node_result.artifact_refs ?? []),
        existingTraceRef,
      ]),
      replay_provenance: this.replayProvenanceFromTrace(existingPayload, existingTraceRef),
    };
    const assertions = this.evaluateSnapshotLiteratureResourcePoolAssertions(input, nodeResult);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: SNAPSHOT_LITERATURE_RESOURCE_POOL_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: existingPayload.node_input,
      node_result: nodeResult,
      assertions,
      harness_trace_snapshot: {
        ...existingPayload,
        scenario_status: scenarioStatus,
        node_result: nodeResult,
        artifact_refs: nodeResult.artifact_refs,
        assertions,
      },
      harness_trace_artifact: existing,
      harness_trace_artifact_ref: existingTraceRef,
    };
  }

  private async findCreateSearchPlanReplay(
    input: TopicSelectionWorkflowHarnessCreateSearchPlanInput,
    nodeInput: TopicSelectionWorkflowHarnessCreateSearchPlanNodeInput,
    inputHash: string,
  ): Promise<TopicSelectionWorkflowHarnessCreateSearchPlanResult | null> {
    const controlPlane = this.requiredControlPlane();
    const artifacts = await controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
    const traceArtifacts = artifacts
      .filter((artifact) => artifact.artifact_kind === 'trace')
      .filter((artifact) => {
        const payload = artifact.payload as Partial<TopicSelectionWorkflowHarnessCreateSearchPlanTraceSnapshot> | null;
        return payload?.payload_schema === SEARCH_PLAN_TRACE_PAYLOAD_SCHEMA
          && payload.node_id === CREATE_SEARCH_PLAN_NODE_ID
          && payload.node_attempt_id === input.node_attempt_id
          && typeof payload.input_hash === 'string'
          && payload.node_result;
      })
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
    if (traceArtifacts.length === 0) {
      return null;
    }
    const matching = traceArtifacts.find((artifact) => {
      const payload = artifact.payload as Partial<TopicSelectionWorkflowHarnessCreateSearchPlanTraceSnapshot> | null;
      return payload?.input_hash === inputHash;
    });
    const existing = matching ?? traceArtifacts[0]!;
    const existingPayload = existing.payload as TopicSelectionWorkflowHarnessCreateSearchPlanTraceSnapshot;
    const existingTraceRef = this.ref('artifact_ref', existing.artifact_ref_id, existing.title_card_id ?? input.title_card_id);

    if (!matching) {
      const nodeResult: TopicSelectionWorkflowHarnessCreateSearchPlanNodeResult = {
        status: 'blocked',
        search_plan: null,
        search_plan_ref: null,
        coverage_row_intents: [],
        coverage_row_intent_refs: [],
        plan_version: null,
        query_intents: input.blueprint?.query_intents ?? [],
        must_check_constraints: input.blueprint?.must_check_constraints ?? [],
        exclusion_rules: input.blueprint?.exclusion_rules ?? [],
        authority_refs: [],
        audit_refs: [],
        artifact_refs: [existingTraceRef],
        warning_codes: [],
        blocker_codes: ['REPLAY_INPUT_HASH_MISMATCH'],
        error_code: 'VERSION_CONFLICT',
        error_message: 'node_attempt_id replay input hash does not match the existing attempt.',
        replay_provenance: null,
      };
      const assertions = this.evaluateCreateSearchPlanAssertions(input, nodeResult);
      const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
      const traceSnapshot = this.createSearchPlanTraceSnapshot({
        input,
        nodeInput,
        inputHash,
        nodeResult,
        assertions,
        scenarioStatus,
        resolvedSnapshotHash: null,
      });
      const traceArtifact = await controlPlane.recordArtifactRef({
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id,
        artifact_kind: 'trace',
        storage_kind: 'inline',
        payload: traceSnapshot as unknown as Record<string, unknown>,
        workflow_run_id: input.workflow_run_id,
        created_by: input.created_by ?? 'system',
      });
      const traceArtifactRef = this.ref('artifact_ref', traceArtifact.artifact_ref_id, traceArtifact.title_card_id ?? input.title_card_id);
      const resultWithTrace = {
        ...nodeResult,
        artifact_refs: this.uniqueRefs([existingTraceRef, traceArtifactRef]),
      };
      return {
        schema_version: 'v1',
        scenario_id: input.scenario_id,
        scenario_case_id: input.scenario_case_id ?? null,
        node_id: CREATE_SEARCH_PLAN_NODE_ID,
        workflow_run_id: input.workflow_run_id,
        node_attempt_id: input.node_attempt_id,
        scenario_status: scenarioStatus,
        node_input: nodeInput,
        node_result: resultWithTrace,
        assertions,
        harness_trace_snapshot: {
          ...traceSnapshot,
          node_result: resultWithTrace,
          artifact_refs: resultWithTrace.artifact_refs,
        },
        harness_trace_artifact: traceArtifact,
        harness_trace_artifact_ref: traceArtifactRef,
      };
    }

    const nodeResult: TopicSelectionWorkflowHarnessCreateSearchPlanNodeResult = {
      ...existingPayload.node_result,
      artifact_refs: this.uniqueRefs([
        ...(existingPayload.node_result.artifact_refs ?? []),
        existingTraceRef,
      ]),
      replay_provenance: this.replayProvenanceFromTrace(existingPayload, existingTraceRef),
    };
    const assertions = this.evaluateCreateSearchPlanAssertions(input, nodeResult);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: CREATE_SEARCH_PLAN_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: existingPayload.node_input,
      node_result: nodeResult,
      assertions,
      harness_trace_snapshot: {
        ...existingPayload,
        scenario_status: scenarioStatus,
        node_result: nodeResult,
        artifact_refs: nodeResult.artifact_refs,
        assertions,
      },
      harness_trace_artifact: existing,
      harness_trace_artifact_ref: existingTraceRef,
    };
  }

  private async findRecordSearchRunReplay(
    input: TopicSelectionWorkflowHarnessRecordSearchRunInput,
    nodeInput: TopicSelectionWorkflowHarnessRecordSearchRunNodeInput,
    inputHash: string,
  ): Promise<TopicSelectionWorkflowHarnessRecordSearchRunResult | null> {
    const controlPlane = this.requiredControlPlane();
    const artifacts = await controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
    const traceArtifacts = artifacts
      .filter((artifact) => artifact.artifact_kind === 'trace')
      .filter((artifact) => {
        const payload = artifact.payload as Partial<TopicSelectionWorkflowHarnessRecordSearchRunTraceSnapshot> | null;
        return payload?.payload_schema === SEARCH_RUN_TRACE_PAYLOAD_SCHEMA
          && payload.node_id === RECORD_SEARCH_RUN_NODE_ID
          && payload.node_attempt_id === input.node_attempt_id
          && typeof payload.input_hash === 'string'
          && payload.node_result;
      })
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
    if (traceArtifacts.length === 0) {
      return null;
    }
    const matching = traceArtifacts.find((artifact) => {
      const payload = artifact.payload as Partial<TopicSelectionWorkflowHarnessRecordSearchRunTraceSnapshot> | null;
      return payload?.input_hash === inputHash;
    });
    const existing = matching ?? traceArtifacts[0]!;
    const existingPayload = existing.payload as TopicSelectionWorkflowHarnessRecordSearchRunTraceSnapshot;
    const existingTraceRef = this.ref('artifact_ref', existing.artifact_ref_id, existing.title_card_id ?? input.title_card_id);

    if (!matching) {
      const nodeResult: TopicSelectionWorkflowHarnessRecordSearchRunNodeResult = {
        status: 'blocked',
        search_run: null,
        search_run_ref: null,
        consumable_for_evidence_map: false,
        downstream_handoff: null,
        loopback_signal: null,
        result_accounting_summary: this.objectPayload(input.bundle?.result_accounting ?? {}),
        evidence_binding_refs: [],
        coverage_assessment_refs: [],
        coverage_matrix_summary: null,
        authority_refs: [],
        audit_refs: [],
        artifact_refs: [existingTraceRef],
        warning_codes: [],
        blocker_codes: ['REPLAY_INPUT_HASH_MISMATCH'],
        error_code: 'VERSION_CONFLICT',
        error_message: 'node_attempt_id replay input hash does not match the existing attempt.',
        replay_provenance: null,
      };
      const assertions = this.evaluateRecordSearchRunAssertions(input, nodeResult);
      const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
      const traceSnapshot = this.createRecordSearchRunTraceSnapshot({
        input,
        nodeInput,
        inputHash,
        nodeResult,
        assertions,
        scenarioStatus,
      });
      const traceArtifact = await controlPlane.recordArtifactRef({
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id,
        artifact_kind: 'trace',
        storage_kind: 'inline',
        payload: traceSnapshot as unknown as Record<string, unknown>,
        workflow_run_id: input.workflow_run_id,
        created_by: input.created_by ?? 'system',
      });
      const traceArtifactRef = this.ref('artifact_ref', traceArtifact.artifact_ref_id, traceArtifact.title_card_id ?? input.title_card_id);
      const resultWithTrace = {
        ...nodeResult,
        artifact_refs: this.uniqueRefs([existingTraceRef, traceArtifactRef]),
      };
      return {
        schema_version: 'v1',
        scenario_id: input.scenario_id,
        scenario_case_id: input.scenario_case_id ?? null,
        node_id: RECORD_SEARCH_RUN_NODE_ID,
        workflow_run_id: input.workflow_run_id,
        node_attempt_id: input.node_attempt_id,
        scenario_status: scenarioStatus,
        node_input: nodeInput,
        node_result: resultWithTrace,
        assertions,
        harness_trace_snapshot: {
          ...traceSnapshot,
          node_result: resultWithTrace,
          artifact_refs: resultWithTrace.artifact_refs,
        },
        harness_trace_artifact: traceArtifact,
        harness_trace_artifact_ref: traceArtifactRef,
      };
    }

    const nodeResult: TopicSelectionWorkflowHarnessRecordSearchRunNodeResult = {
      ...existingPayload.node_result,
      artifact_refs: this.uniqueRefs([
        ...(existingPayload.node_result.artifact_refs ?? []),
        existingTraceRef,
      ]),
      replay_provenance: this.replayProvenanceFromTrace(existingPayload, existingTraceRef),
    };
    const assertions = this.evaluateRecordSearchRunAssertions(input, nodeResult);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: RECORD_SEARCH_RUN_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: existingPayload.node_input,
      node_result: nodeResult,
      assertions,
      harness_trace_snapshot: {
        ...existingPayload,
        scenario_status: scenarioStatus,
        node_result: nodeResult,
        artifact_refs: nodeResult.artifact_refs,
        assertions,
      },
      harness_trace_artifact: existing,
      harness_trace_artifact_ref: existingTraceRef,
    };
  }

  private generateNeedCandidateArtifactSnapshot(
    record: TopicSelectionArtifactRefRecord,
  ): TopicSelectionGenerateNeedCandidateArtifactSnapshot | null {
    if (!record.payload || typeof record.payload !== 'object') {
      return null;
    }
    const payload = record.payload as Partial<TopicSelectionGenerateNeedCandidateArtifactSnapshot>;
    if (
      payload.node_id !== GENERATE_NEED_CANDIDATE_NODE_ID
      || payload.workflow_run_id !== record.workflow_run_id
      || typeof payload.node_attempt_id !== 'string'
      || typeof payload.artifact_key !== 'string'
      || typeof payload.payload_hash !== 'string'
      || !payload.payload
    ) {
      return null;
    }
    return payload as TopicSelectionGenerateNeedCandidateArtifactSnapshot;
  }

  private generateNeedCandidateTracePayload(value: unknown): TopicSelectionWorkflowHarnessTraceSnapshot | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const payload = value as Partial<TopicSelectionWorkflowHarnessTraceSnapshot>;
    if (
      payload.payload_schema !== HARNESS_TRACE_PAYLOAD_SCHEMA
      || payload.node_id !== GENERATE_NEED_CANDIDATE_NODE_ID
      || typeof payload.workflow_run_id !== 'string'
      || typeof payload.node_attempt_id !== 'string'
      || typeof payload.input_hash !== 'string'
      || !payload.node_input
      || !payload.compiled_context
      || !payload.adapter_result
    ) {
      return null;
    }
    return payload as TopicSelectionWorkflowHarnessTraceSnapshot;
  }

  private generateNeedCandidateArtifactEntry(
    record: TopicSelectionArtifactRefRecord,
    snapshot: TopicSelectionGenerateNeedCandidateArtifactSnapshot,
    artifactRef: TopicSelectionFunctionalRef,
  ): TopicSelectionGenerateNeedCandidateArtifactRefEntry {
    return {
      artifact_key: snapshot.artifact_key,
      artifact_ref: artifactRef as TopicSelectionArtifactFunctionalRef,
      artifact_hash: record.checksum ?? this.hash(record.payload),
      payload_hash: snapshot.payload_hash,
      payload_schema: snapshot.payload_schema,
      redacted_paths: snapshot.redacted_paths,
    };
  }

  private async findValidateNeedAdjudicationReplay(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
    nodeInput: TopicSelectionWorkflowHarnessValidateNeedAdjudicationNodeInput,
    inputHash: string,
  ): Promise<TopicSelectionWorkflowHarnessValidateNeedAdjudicationResult | null> {
    const controlPlane = this.requiredControlPlane();
    const artifacts = await controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
    const traceArtifacts = artifacts
      .filter((artifact) => artifact.artifact_kind === 'trace')
      .filter((artifact) => {
        const payload = artifact.payload as Partial<TopicSelectionWorkflowHarnessValidateNeedAdjudicationTraceSnapshot> | null;
        return payload?.payload_schema === NEED_ADJUDICATION_TRACE_PAYLOAD_SCHEMA
          && payload.node_id === VALIDATE_NEED_ADJUDICATION_NODE_ID
          && payload.node_attempt_id === input.node_attempt_id;
      })
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
    if (traceArtifacts.length === 0) {
      return null;
    }
    const matching = traceArtifacts.find((artifact) => {
      const payload = artifact.payload as Partial<TopicSelectionWorkflowHarnessValidateNeedAdjudicationTraceSnapshot> | null;
      return payload?.input_hash === inputHash;
    });
    const existing = matching ?? traceArtifacts[0]!;
    const existingPayload = existing.payload as TopicSelectionWorkflowHarnessValidateNeedAdjudicationTraceSnapshot;
    const existingTraceRef = this.ref('artifact_ref', existing.artifact_ref_id, existing.title_card_id ?? input.title_card_id);
    if (!matching) {
      const nodeResult = this.validateNeedAdjudicationBlockedResult(input, {
        candidate: null,
        status: 'blocked',
        routeOutcome: 'blocked',
        blockerCodes: ['REPLAY_INPUT_HASH_MISMATCH'],
        errorCode: 'VERSION_CONFLICT',
        errorMessage: 'node_attempt_id replay input hash does not match the existing attempt.',
      });
      const assertions = this.evaluateValidateNeedAdjudicationAssertions(input, nodeResult);
      const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
      const traceSnapshot = this.createValidateNeedAdjudicationTraceSnapshot({
        input,
        nodeInput,
        inputHash,
        nodeResult,
        recommendationPacket: null,
        artifactRefs: [existingTraceRef],
        assertions,
        scenarioStatus,
      });
      const traceArtifact = await controlPlane.recordArtifactRef({
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id,
        artifact_kind: 'trace',
        storage_kind: 'inline',
        payload: traceSnapshot as unknown as Record<string, unknown>,
        workflow_run_id: input.workflow_run_id,
        created_by: input.created_by ?? 'system',
      });
      const traceArtifactRef = this.ref('artifact_ref', traceArtifact.artifact_ref_id, traceArtifact.title_card_id ?? input.title_card_id);
      const resultWithTrace = {
        ...nodeResult,
        harness_trace_artifact_ref: traceArtifactRef,
      };
      return {
        schema_version: 'v1',
        scenario_id: input.scenario_id,
        scenario_case_id: input.scenario_case_id ?? null,
        node_id: VALIDATE_NEED_ADJUDICATION_NODE_ID,
        workflow_run_id: input.workflow_run_id,
        node_attempt_id: input.node_attempt_id,
        scenario_status: scenarioStatus,
        node_input: nodeInput,
        node_result: resultWithTrace,
        assertions,
        harness_trace_snapshot: {
          ...traceSnapshot,
          node_result: resultWithTrace,
          artifact_refs: this.uniqueRefs([existingTraceRef, traceArtifactRef]),
        },
        harness_trace_artifact: traceArtifact,
        harness_trace_artifact_ref: traceArtifactRef,
      };
    }

    const nodeResult: TopicSelectionValidateNeedAdjudicationNodeResult = {
      ...existingPayload.node_result,
      replay_provenance: {
        replayed: true,
        source_workflow_run_id: existingPayload.workflow_run_id,
        source_node_attempt_id: existingPayload.node_attempt_id,
        source_trace_artifact_ref: existingTraceRef,
        input_hash: existingPayload.input_hash,
      },
      harness_trace_artifact_ref: existingTraceRef,
    };
    const assertions = this.evaluateValidateNeedAdjudicationAssertions(input, nodeResult);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: VALIDATE_NEED_ADJUDICATION_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: nodeInput,
      node_result: nodeResult,
      assertions,
      harness_trace_snapshot: {
        ...existingPayload,
        scenario_status: scenarioStatus,
        node_result: nodeResult,
        assertions,
      },
      harness_trace_artifact: existing,
      harness_trace_artifact_ref: existingTraceRef,
    };
  }

  private async findHumanConfirmNeedReplay(
    input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput,
    nodeInput: TopicSelectionWorkflowHarnessHumanConfirmNeedNodeInput,
    inputHash: string,
  ): Promise<TopicSelectionWorkflowHarnessHumanConfirmNeedResult | null> {
    const controlPlane = this.requiredControlPlane();
    const artifacts = await controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
    const traceArtifacts = artifacts
      .filter((artifact) => artifact.artifact_kind === 'trace')
      .filter((artifact) => {
        const payload = artifact.payload as Partial<TopicSelectionWorkflowHarnessHumanConfirmNeedTraceSnapshot> | null;
        return payload?.payload_schema === HUMAN_CONFIRM_NEED_TRACE_PAYLOAD_SCHEMA
          && payload.node_id === HUMAN_CONFIRM_NEED_NODE_ID
          && payload.node_attempt_id === input.node_attempt_id;
      })
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
    if (traceArtifacts.length === 0) {
      return null;
    }
    const matching = traceArtifacts.find((artifact) => {
      const payload = artifact.payload as Partial<TopicSelectionWorkflowHarnessHumanConfirmNeedTraceSnapshot> | null;
      return payload?.input_hash === inputHash;
    });
    const existing = matching ?? traceArtifacts[0]!;
    const existingPayload = existing.payload as TopicSelectionWorkflowHarnessHumanConfirmNeedTraceSnapshot;
    const existingTraceRef = this.ref('artifact_ref', existing.artifact_ref_id, existing.title_card_id ?? input.title_card_id);
    if (!matching) {
      const nodeResult = this.humanConfirmNeedBlockedResult(input, {
        status: 'blocked',
        routeOutcome: 'blocked',
        blockerCodes: ['REPLAY_INPUT_HASH_MISMATCH'],
        errorCode: 'VERSION_CONFLICT',
        errorMessage: 'node_attempt_id replay input hash does not match the existing attempt.',
      });
      const assertions = this.evaluateHumanConfirmNeedAssertions(input, nodeResult);
      const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
      const traceSnapshot = this.createHumanConfirmNeedTraceSnapshot({
        input,
        nodeInput,
        inputHash,
        nodeResult,
        contextPacket: null,
        semanticReview: null,
        artifactRefs: [existingTraceRef],
        assertions,
        scenarioStatus,
      });
      const traceArtifact = await controlPlane.recordArtifactRef({
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id,
        artifact_kind: 'trace',
        storage_kind: 'inline',
        payload: traceSnapshot as unknown as Record<string, unknown>,
        workflow_run_id: input.workflow_run_id,
        created_by: input.created_by ?? 'system',
      });
      const traceArtifactRef = this.ref('artifact_ref', traceArtifact.artifact_ref_id, traceArtifact.title_card_id ?? input.title_card_id);
      const resultWithTrace = {
        ...nodeResult,
        harness_trace_artifact_ref: traceArtifactRef,
      };
      return {
        schema_version: 'v1',
        scenario_id: input.scenario_id,
        scenario_case_id: input.scenario_case_id ?? null,
        node_id: HUMAN_CONFIRM_NEED_NODE_ID,
        workflow_run_id: input.workflow_run_id,
        node_attempt_id: input.node_attempt_id,
        scenario_status: scenarioStatus,
        node_input: nodeInput,
        node_result: resultWithTrace,
        assertions,
        harness_trace_snapshot: {
          ...traceSnapshot,
          node_result: resultWithTrace,
          artifact_refs: this.uniqueRefs([existingTraceRef, traceArtifactRef]),
        },
        harness_trace_artifact: traceArtifact,
        harness_trace_artifact_ref: traceArtifactRef,
      };
    }
    const nodeResult: TopicSelectionHumanConfirmNeedNodeResult = {
      ...existingPayload.node_result,
      replay_provenance: {
        replayed: true,
        source_workflow_run_id: existingPayload.workflow_run_id,
        source_node_attempt_id: existingPayload.node_attempt_id,
        source_trace_artifact_ref: existingTraceRef,
        input_hash: existingPayload.input_hash,
      },
      harness_trace_artifact_ref: existingTraceRef,
    };
    const assertions = this.evaluateHumanConfirmNeedAssertions(input, nodeResult);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: HUMAN_CONFIRM_NEED_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: nodeInput,
      node_result: nodeResult,
      assertions,
      harness_trace_snapshot: {
        ...existingPayload,
        scenario_status: scenarioStatus,
        node_result: nodeResult,
        assertions,
      },
      harness_trace_artifact: existing,
      harness_trace_artifact_ref: existingTraceRef,
    };
  }

  private async findPublishV1bInputBundleReplay(
    input: TopicSelectionWorkflowHarnessPublishV1bInputBundleInput,
    nodeInput: TopicSelectionWorkflowHarnessPublishV1bInputBundleNodeInput,
    inputHash: string,
  ): Promise<TopicSelectionWorkflowHarnessPublishV1bInputBundleResult | null> {
    const controlPlane = this.requiredControlPlane();
    const artifacts = await controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
    const traceArtifacts = artifacts
      .filter((artifact) => artifact.artifact_kind === 'trace')
      .filter((artifact) => {
        const payload = artifact.payload as Partial<TopicSelectionWorkflowHarnessPublishV1bInputBundleTraceSnapshot> | null;
        return payload?.payload_schema === PUBLISH_V1B_INPUT_BUNDLE_TRACE_PAYLOAD_SCHEMA
          && payload.node_id === PUBLISH_V1B_INPUT_BUNDLE_NODE_ID
          && payload.node_attempt_id === input.node_attempt_id;
      })
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
    if (traceArtifacts.length === 0) {
      return null;
    }
    const matching = traceArtifacts.find((artifact) => {
      const payload = artifact.payload as Partial<TopicSelectionWorkflowHarnessPublishV1bInputBundleTraceSnapshot> | null;
      return payload?.input_hash === inputHash;
    });
    const existing = matching ?? traceArtifacts[0]!;
    const existingPayload = existing.payload as TopicSelectionWorkflowHarnessPublishV1bInputBundleTraceSnapshot;
    const existingTraceRef = this.ref('artifact_ref', existing.artifact_ref_id, existing.title_card_id ?? input.title_card_id);
    if (!matching) {
      const nodeResult = this.publishV1bInputBundleBlockedResult(input, {
        blockerCodes: ['REPLAY_INPUT_HASH_MISMATCH'],
        errorCode: 'VERSION_CONFLICT',
        errorMessage: 'node_attempt_id replay input hash does not match the existing attempt.',
      });
      const assertions = this.evaluatePublishV1bInputBundleAssertions(input, nodeResult);
      const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
      const traceSnapshot = this.createPublishV1bInputBundleTraceSnapshot({
        input,
        nodeInput,
        inputHash,
        nodeResult,
        bundle: null,
        assertions,
        scenarioStatus,
      });
      const traceArtifact = await controlPlane.recordArtifactRef({
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id,
        artifact_kind: 'trace',
        storage_kind: 'inline',
        payload: traceSnapshot as unknown as Record<string, unknown>,
        workflow_run_id: input.workflow_run_id,
        created_by: input.created_by ?? 'system',
      });
      const traceArtifactRef = this.ref('artifact_ref', traceArtifact.artifact_ref_id, traceArtifact.title_card_id ?? input.title_card_id);
      const resultWithTrace = {
        ...nodeResult,
        harness_trace_artifact_ref: traceArtifactRef,
      };
      return {
        schema_version: 'v1',
        scenario_id: input.scenario_id,
        scenario_case_id: input.scenario_case_id ?? null,
        node_id: PUBLISH_V1B_INPUT_BUNDLE_NODE_ID,
        workflow_run_id: input.workflow_run_id,
        node_attempt_id: input.node_attempt_id,
        scenario_status: scenarioStatus,
        node_input: nodeInput,
        node_result: resultWithTrace,
        assertions,
        harness_trace_snapshot: {
          ...traceSnapshot,
          node_result: resultWithTrace,
          artifact_refs: this.uniqueRefs([existingTraceRef, traceArtifactRef]),
        },
        harness_trace_artifact: traceArtifact,
        harness_trace_artifact_ref: traceArtifactRef,
      };
    }

    const nodeResult: TopicSelectionPublishV1bInputBundleNodeResult = {
      ...existingPayload.node_result,
      replay_provenance: {
        replayed: true,
        source_workflow_run_id: existingPayload.workflow_run_id,
        source_node_attempt_id: existingPayload.node_attempt_id,
        source_trace_artifact_ref: existingTraceRef,
        input_hash: existingPayload.input_hash,
      },
      harness_trace_artifact_ref: existingTraceRef,
    };
    const assertions = this.evaluatePublishV1bInputBundleAssertions(input, nodeResult);
    const scenarioStatus = assertions.every((assertion) => assertion.passed) ? 'passed' : 'failed';
    return {
      schema_version: 'v1',
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      node_id: PUBLISH_V1B_INPUT_BUNDLE_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_status: scenarioStatus,
      node_input: nodeInput,
      node_result: nodeResult,
      assertions,
      harness_trace_snapshot: {
        ...existingPayload,
        scenario_status: scenarioStatus,
        node_result: nodeResult,
        assertions,
      },
      harness_trace_artifact: existing,
      harness_trace_artifact_ref: existingTraceRef,
    };
  }

  private async recordHumanConfirmationSemanticContextPacket(
    input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput,
    nodeInput: TopicSelectionWorkflowHarnessHumanConfirmNeedNodeInput,
    adjudication: TopicSelectionValidateNeedAdjudicationResultRecord,
    candidate: TopicSelectionNeedCandidateRecord,
    supportPacket: TopicSelectionValidationDecisionSupportPacketRecord,
  ): Promise<{
    packet: HumanConfirmationSemanticReviewContextPacket;
    packet_ref: TopicSelectionFunctionalRef;
  }> {
    const packetHashPayload = {
      schema_version: TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_CONTEXT_PACKET_SCHEMA_VERSION,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      context_packet_id: `${input.node_attempt_id}_semantic_context`,
      adjudication_result_ref: nodeInput.adjudication_result_ref,
      validation_support_packet_ref: nodeInput.validation_support_packet_ref,
      need_candidate_ref: nodeInput.need_candidate_ref,
      output_validated_need_ref: nodeInput.reserved_validated_need_ref,
      final_decision: 'validate' as const,
      adjudication_rationale: adjudication.rationale,
      need_candidate_summary: candidate.unmet_need_statement || candidate.candidate_need,
      required_human_checks: supportPacket.required_human_checks,
      residual_risk_refs: this.uniqueRefs([
        ...supportPacket.residual_risk_refs,
        ...adjudication.residual_risk_refs,
      ]),
      accepted_risk_refs: input.confirmation_input.accepted_risk_refs,
      confirmation_input: input.confirmation_input,
      policy_version: input.policy_version,
      output_schema_version: input.output_schema_version,
    };
    const packetBase = {
      ...packetHashPayload,
      created_at: this.now(),
    };
    const packet: HumanConfirmationSemanticReviewContextPacket = {
      ...packetBase,
      context_packet_hash: this.hash(packetHashPayload),
    };
    const artifact = await this.requiredControlPlane().recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      payload: {
        payload_schema: packet.schema_version,
        context_packet: packet,
      },
      workflow_run_id: input.workflow_run_id,
      created_by: input.created_by ?? 'system',
    });
    return {
      packet,
      packet_ref: this.ref('artifact_ref', artifact.artifact_ref_id, artifact.title_card_id ?? input.title_card_id),
    };
  }

  private async resolveHumanConfirmationSemanticReview(
    input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput,
    contextPacket: HumanConfirmationSemanticReviewContextPacket,
    contextPacketRef: TopicSelectionFunctionalRef,
  ): Promise<{
    review: HumanConfirmationSemanticReview;
    review_ref: TopicSelectionFunctionalRef;
    agent_invocation_audit_ref: TopicSelectionFunctionalRef | null;
    context_compression_report_ref: TopicSelectionFunctionalRef | null;
    warning_codes: string[];
  }> {
    const executionMode = input.execution_mode ?? 'codex_assisted';
    let review: HumanConfirmationSemanticReview;
    let agentInvocationAuditRef: TopicSelectionFunctionalRef | null = null;
    let contextCompressionReportRef: TopicSelectionFunctionalRef | null = null;
    let runtimeWarningCodes: string[] = [];
    if (executionMode === 'deterministic_parser') {
      review = this.deterministicHumanConfirmationSemanticReview(input, contextPacket, contextPacketRef);
    } else {
      const agent = this.requiredHumanConfirmationSemanticReviewAgent();
      const runtimeBinding = this.v1aLlmRuntimeBindings.buildHumanConfirmationBinding({
        title_card_id: input.title_card_id,
        workflow_run_id: input.workflow_run_id,
        node_attempt_id: input.node_attempt_id,
        scenario_id: input.scenario_id,
        scenario_case_id: input.scenario_case_id ?? null,
        execution_mode: executionMode,
        profile_id: input.profile_id ?? TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
        context_packet: contextPacket,
        context_packet_ref: contextPacketRef,
        runtime_token_budget_overrides: input.runtime_token_budget_overrides ?? null,
      });
      const compressionPrepared = await this.prepareHumanConfirmationRuntimeBinding({
        input,
        executionMode,
        contextPacket,
        contextPacketRef,
        runtimeBinding,
      });
      if (compressionPrepared.errorCode) {
        throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Human confirmation semantic review context compression failed.', {
          agent_error_code: compressionPrepared.errorCode,
          blocker_codes: compressionPrepared.blockerCodes.length > 0
            ? compressionPrepared.blockerCodes
            : [compressionPrepared.errorCode],
          warning_codes: compressionPrepared.warningCodes,
          agent_invocation_audit_ref: null,
          context_compression_report_ref: compressionPrepared.contextCompressionReportRef,
        });
      }
      const result = await agent.invokeStructuredOutput<HumanConfirmationSemanticReview>({
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id,
        node_id: HUMAN_CONFIRM_NEED_NODE_ID,
        workflow_run_id: input.workflow_run_id,
        node_attempt_id: input.node_attempt_id,
        execution_mode: executionMode,
        execution_spec: input.execution_spec ?? null,
        executor_kind: input.executor_kind ?? 'single_agent',
        run_mode: input.run_mode ?? 'acceptance',
        profile_id: input.profile_id ?? TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
        output_contract: TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
        model_option_id: input.model_option_id ?? null,
        prompt: compressionPrepared.runtimeBinding.prompt,
        prompt_variant_key: compressionPrepared.runtimeBinding.prompt_variant_key,
        schema_name: TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
        schema: humanConfirmationSemanticReviewSchema as unknown as Record<string, unknown>,
        messages: compressionPrepared.runtimeBinding.messages,
        input_refs: compressionPrepared.runtimeBinding.input_refs,
        context_packet_refs: compressionPrepared.runtimeBinding.context_packet_refs,
        context_packet_hashes: compressionPrepared.runtimeBinding.context_packet_hashes,
        runtime_token_budget: compressionPrepared.runtimeBinding.runtime_token_budget,
        mocked_output: this.humanConfirmationMockedOutputForContext(input.mocked_output ?? null, contextPacketRef),
        codex_response: input.codex_response ?? null,
        created_by: input.created_by ?? 'system',
      });
      agentInvocationAuditRef = result.audit_artifact_ref ?? null;
      contextCompressionReportRef = compressionPrepared.contextCompressionReportRef;
      runtimeWarningCodes = this.uniqueStrings([
        ...result.warning_codes,
        ...compressionPrepared.warningCodes,
      ]);
      if (result.status !== 'succeeded' || !result.structured_output) {
        const semanticReviewFailureReasons = result.error_code?.startsWith('TOKEN_BUDGET')
          ? []
          : ['SEMANTIC_REVIEW_FAILED'];
        throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Human confirmation semantic review failed.', {
          agent_error_code: result.error_code ?? 'SEMANTIC_REVIEW_FAILED',
          blocker_codes: result.blocker_codes.length > 0
            ? result.blocker_codes
            : ['SEMANTIC_REVIEW_FAILED'],
          warning_codes: runtimeWarningCodes,
          review_reason_codes: semanticReviewFailureReasons,
          agent_invocation_audit_ref: result.audit_artifact_ref ?? null,
          context_compression_report_ref: contextCompressionReportRef,
        });
      }
      const normalizedReview = this.normalizeProviderHumanConfirmationSemanticReviewLineage({
        input,
        contextPacketRef,
        executionMode,
        review: result.structured_output,
      });
      review = normalizedReview.review;
      if (normalizedReview.lineageStamped) {
        runtimeWarningCodes = this.uniqueStrings([
          ...runtimeWarningCodes,
          'SEMANTIC_REVIEW_RUNTIME_LINEAGE_STAMPED',
        ]);
      }
      const routingNormalizedReview = this.normalizeProviderHumanConfirmationSemanticReviewRouting({
        executionMode,
        review,
      });
      review = routingNormalizedReview.review;
      if (routingNormalizedReview.reasonCodesCleared) {
        runtimeWarningCodes = this.uniqueStrings([
          ...runtimeWarningCodes,
          'SEMANTIC_REVIEW_PASS_REASON_CODES_IGNORED',
        ]);
      }
    }
    this.assertHumanConfirmationSemanticReviewLineage(input, contextPacketRef, review, executionMode);
    const artifact = await this.requiredControlPlane().recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      payload: {
        payload_schema: review.schema_version,
        semantic_review: review,
      },
      workflow_run_id: input.workflow_run_id,
      created_by: input.created_by ?? 'system',
    });
    return {
      review,
      review_ref: this.ref('artifact_ref', artifact.artifact_ref_id, artifact.title_card_id ?? input.title_card_id),
      agent_invocation_audit_ref: agentInvocationAuditRef,
      context_compression_report_ref: contextCompressionReportRef,
      warning_codes: runtimeWarningCodes,
    };
  }

  private async prepareHumanConfirmationRuntimeBinding(input: {
    input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput;
    executionMode: TopicSelectionAgentExecutionMode;
    contextPacket: HumanConfirmationSemanticReviewContextPacket;
    contextPacketRef: TopicSelectionFunctionalRef;
    runtimeBinding: TopicSelectionV1aLlmRuntimeInvocationBinding;
  }): Promise<{
    runtimeBinding: TopicSelectionV1aLlmRuntimeInvocationBinding;
    contextCompressionReportRef: TopicSelectionFunctionalRef | null;
    warningCodes: string[];
    blockerCodes: string[];
    errorCode: string | null;
  }> {
    const overrides = input.input.runtime_token_budget_overrides ?? null;
    const preflight = this.tokenBudgetGate.evaluate({
      context_policy_profile: input.runtimeBinding.runtime_token_budget.context_policy_profile,
      messages: input.runtimeBinding.messages,
      context_payloads: input.runtimeBinding.runtime_token_budget.context_payloads ?? [],
      schema: humanConfirmationSemanticReviewSchema as unknown as Record<string, unknown>,
      extra_payloads: input.runtimeBinding.runtime_token_budget.extra_payloads ?? [],
      compression_already_applied: overrides?.compression_already_applied ?? false,
      estimated_input_tokens_override: overrides?.estimated_input_tokens_override,
      schema_overhead_tokens_override: overrides?.schema_overhead_tokens_override,
    });
    if (
      preflight.result.decision !== 'requires_compression'
      || overrides?.compression_already_applied === true
    ) {
      return {
        runtimeBinding: input.runtimeBinding,
        contextCompressionReportRef: null,
        warningCodes: [],
        blockerCodes: [],
        errorCode: null,
      };
    }

    const compressionPlan = this.v1aLlmRuntimeBindings.buildHumanConfirmationCompressionPlan({
      title_card_id: input.input.title_card_id,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      scenario_id: input.input.scenario_id,
      scenario_case_id: input.input.scenario_case_id ?? null,
      execution_mode: input.executionMode,
      profile_id: input.input.profile_id ?? TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
      context_packet: input.contextPacket,
      context_packet_ref: input.contextPacketRef,
      runtime_token_budget_overrides: overrides,
    });
    const compression = await this.recordHumanConfirmationCompressionReport({
      input: input.input,
      runtimeBinding: input.runtimeBinding,
      compressionPlan,
      estimatedInputTokensBefore: preflight.result.estimated_input_tokens,
      estimatedInputTokensAfter: overrides?.estimated_input_tokens_after_compression_override,
    });
    const compressionIdentity = {
      compression_report_ref: compression.artifactRef,
      compression_report_hash: compression.artifactHash,
      compressed_context_hash: compression.result.report.compressed_context_hash,
      compression_already_applied: true,
    };
    const compressionWarningCodes = this.uniqueStrings([
      ...preflight.result.warning_codes,
      ...compression.result.warning_codes,
      'COMPRESSION_REPORT_RECORDED',
    ]);
    const baseBindingInput = {
      title_card_id: input.input.title_card_id,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      scenario_id: input.input.scenario_id,
      scenario_case_id: input.input.scenario_case_id ?? null,
      execution_mode: input.executionMode,
      profile_id: input.input.profile_id ?? TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
      context_packet: input.contextPacket,
      context_packet_ref: input.contextPacketRef,
    };
    if (compression.result.quality_gate_result === 'blocked') {
      return {
        runtimeBinding: this.v1aLlmRuntimeBindings.buildHumanConfirmationBinding({
          ...baseBindingInput,
          runtime_token_budget_overrides: {
            ...overrides,
            estimated_input_tokens_after_compression_override:
              preflight.result.estimated_input_tokens,
          },
          runtime_compression: compressionIdentity,
        }),
        contextCompressionReportRef: compression.artifactRef,
        warningCodes: compressionWarningCodes,
        blockerCodes: this.uniqueStrings([
          'COMPRESSION_QUALITY_GATE_BLOCKED',
          ...compression.result.blocker_codes,
        ]),
        errorCode: 'COMPRESSION_QUALITY_GATE_BLOCKED',
      };
    }

    return {
      runtimeBinding: this.v1aLlmRuntimeBindings.buildHumanConfirmationBinding({
        ...baseBindingInput,
        compressed_context: compressionPlan.compressed_context,
        runtime_token_budget_overrides: overrides,
        runtime_compression: compressionIdentity,
      }),
      contextCompressionReportRef: compression.artifactRef,
      warningCodes: compressionWarningCodes,
      blockerCodes: [],
      errorCode: null,
    };
  }

  private async recordHumanConfirmationCompressionReport(input: {
    input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput;
    runtimeBinding: TopicSelectionV1aLlmRuntimeInvocationBinding;
    compressionPlan: TopicSelectionV1aHumanConfirmationCompressionPlan;
    estimatedInputTokensBefore: number | null;
    estimatedInputTokensAfter?: number | null;
  }): Promise<{
    artifactRef: TopicSelectionFunctionalRef;
    artifactHash: string;
    result: TopicSelectionCompressionReportRuntimeResult;
  }> {
    const result = this.compressionRuntime.createReport({
      context_policy_profile: input.runtimeBinding.runtime_token_budget.context_policy_profile,
      context_policy_profile_hash: input.runtimeBinding.runtime_token_budget.context_policy_profile_hash,
      compression_report_ref: input.compressionPlan.compression_report_ref,
      source_refs: input.compressionPlan.source_refs,
      input_context: input.compressionPlan.input_context,
      compressed_context: input.compressionPlan.compressed_context,
      summary: input.compressionPlan.summary,
      compression_executor_kind: 'deterministic_structural',
      required_preserved_facts: input.compressionPlan.fact_inventory,
      compressed_preserved_facts: input.compressionPlan.fact_inventory,
      redaction_policy: input.runtimeBinding.runtime_token_budget.context_policy_profile.redaction_policy,
      estimated_input_tokens_before_override: input.estimatedInputTokensBefore,
      estimated_input_tokens_after_override: input.estimatedInputTokensAfter,
    });
    const payload = {
      schema_version: 'v1',
      node_id: HUMAN_CONFIRM_NEED_NODE_ID,
      artifact_key: 'context_compression_report',
      payload_schema: 'TopicSelectionCompressionReportEnvelope@v1',
      redaction_policy: input.runtimeBinding.runtime_token_budget.context_policy_profile.redaction_policy,
      report: result.report,
      compressed_context: input.compressionPlan.compressed_context,
    };
    const artifact = await this.requiredControlPlane().recordArtifactRef({
      workspace_id: input.input.workspace_id ?? null,
      title_card_id: input.input.title_card_id,
      artifact_kind: 'diagnostic',
      storage_kind: 'inline',
      payload,
      workflow_run_id: input.input.workflow_run_id,
      created_by: input.input.created_by ?? 'system',
    });
    return {
      artifactRef: this.ref(
        'artifact_ref',
        artifact.artifact_ref_id,
        artifact.title_card_id ?? input.input.title_card_id,
      ),
      artifactHash: artifact.checksum ?? this.hash(payload),
      result,
    };
  }

  private humanConfirmationMockedOutputForContext(
    mockedOutput: TopicSelectionMockedAgentOutput<HumanConfirmationSemanticReview> | null,
    contextPacketRef: TopicSelectionFunctionalRef,
  ): TopicSelectionMockedAgentOutput<HumanConfirmationSemanticReview> | null {
    if (!mockedOutput) {
      return null;
    }
    const output = mockedOutput.output;
    const shouldHydrateContextRef = output.context_packet_ref.ref_type === 'artifact_ref'
      && output.context_packet_ref.ref_id === TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_RUNTIME_CONTEXT_REF_PLACEHOLDER;
    const shouldHydrateProvenanceRef = output.provenance_ref.ref_type === 'artifact_ref'
      && output.provenance_ref.ref_id === TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_RUNTIME_CONTEXT_REF_PLACEHOLDER;
    if (!shouldHydrateContextRef && !shouldHydrateProvenanceRef) {
      return mockedOutput;
    }
    return {
      ...mockedOutput,
      output: {
        ...output,
        context_packet_ref: shouldHydrateContextRef ? contextPacketRef : output.context_packet_ref,
        provenance_ref: shouldHydrateProvenanceRef ? contextPacketRef : output.provenance_ref,
      },
    };
  }

  private normalizeProviderHumanConfirmationSemanticReviewLineage(input: {
    input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput;
    contextPacketRef: TopicSelectionFunctionalRef;
    executionMode: TopicSelectionWorkflowHarnessHumanConfirmNeedExecutionMode;
    review: HumanConfirmationSemanticReview;
  }): { review: HumanConfirmationSemanticReview; lineageStamped: boolean } {
    if (input.executionMode !== 'provider_llm') {
      return { review: input.review, lineageStamped: false };
    }
    const expectedProfileId =
      input.input.profile_id ?? TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID;
    const expectedReviewId = `${input.input.node_attempt_id}_semantic_review`;
    const lineageAlreadyMatches =
      input.review.workflow_run_id === input.input.workflow_run_id
      && input.review.node_attempt_id === input.input.node_attempt_id
      && input.review.review_id === expectedReviewId
      && this.sameFunctionalRef(input.review.context_packet_ref, input.contextPacketRef)
      && (input.review.context_packet_ref.title_card_id ?? null) === (input.contextPacketRef.title_card_id ?? null)
      && this.sameFunctionalRef(input.review.provenance_ref, input.contextPacketRef)
      && (input.review.provenance_ref.title_card_id ?? null) === (input.contextPacketRef.title_card_id ?? null)
      && input.review.execution_mode === input.executionMode
      && input.review.profile_id === expectedProfileId
      && input.review.policy_version === input.input.policy_version
      && input.review.output_schema_version === input.input.output_schema_version;
    if (lineageAlreadyMatches) {
      return { review: input.review, lineageStamped: false };
    }
    return {
      review: {
        ...input.review,
        workflow_run_id: input.input.workflow_run_id,
        node_attempt_id: input.input.node_attempt_id,
        review_id: expectedReviewId,
        context_packet_ref: input.contextPacketRef,
        execution_mode: input.executionMode,
        profile_id: expectedProfileId,
        provenance_ref: input.contextPacketRef,
        warning_codes: this.uniqueStrings([
          ...input.review.warning_codes,
          'SEMANTIC_REVIEW_RUNTIME_LINEAGE_STAMPED',
        ]),
        policy_version: input.input.policy_version,
        output_schema_version: input.input.output_schema_version,
      },
      lineageStamped: true,
    };
  }

  private normalizeProviderHumanConfirmationSemanticReviewRouting(input: {
    executionMode: TopicSelectionWorkflowHarnessHumanConfirmNeedExecutionMode;
    review: HumanConfirmationSemanticReview;
  }): { review: HumanConfirmationSemanticReview; reasonCodesCleared: boolean } {
    if (
      input.executionMode !== 'provider_llm'
      || input.review.status !== 'pass'
      || input.review.risk_coverage !== 'complete'
      || input.review.required_check_coverage !== 'complete'
      || input.review.scope_violations.length > 0
      || input.review.blocker_codes.length > 0
      || input.review.review_reason_codes.length === 0
    ) {
      return { review: input.review, reasonCodesCleared: false };
    }
    return {
      review: {
        ...input.review,
        warning_codes: this.uniqueStrings([
          ...input.review.warning_codes,
          'SEMANTIC_REVIEW_PASS_REASON_CODES_IGNORED',
        ]),
        review_reason_codes: [],
      },
      reasonCodesCleared: true,
    };
  }

  private deterministicHumanConfirmationSemanticReview(
    input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput,
    contextPacket: HumanConfirmationSemanticReviewContextPacket,
    contextPacketRef: TopicSelectionFunctionalRef,
  ): HumanConfirmationSemanticReview {
    const providedChecks = new Set(input.confirmation_input.required_check_results.map((check) => check.check_id));
    const missingChecks = contextPacket.required_human_checks.filter((checkId) => !providedChecks.has(checkId));
    const acceptedRiskKeys = new Set(input.confirmation_input.accepted_risk_refs.map((ref) => this.refIdentity(ref)));
    const missingRiskRefs = contextPacket.residual_risk_refs.filter((ref) => !acceptedRiskKeys.has(this.refIdentity(ref)));
    const lowerRationale = input.confirmation_input.rationale.toLowerCase();
    const ambiguous = /\b(reject|merge|park)\b/u.test(lowerRationale);
    const blockerCodes = [
      ...(missingChecks.length > 0 ? ['MISSING_REQUIRED_CHECK_COVERAGE'] : []),
      ...(missingRiskRefs.length > 0 ? ['MISSING_ACCEPTED_RISK_COVERAGE'] : []),
    ];
    const reviewReasonCodes = ambiguous ? ['AMBIGUOUS_CONFIRMATION_RATIONALE'] : [];
    return {
      schema_version: TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      review_id: `${input.node_attempt_id}_semantic_review`,
      context_packet_ref: contextPacketRef,
      execution_mode: 'deterministic_parser',
      profile_id: input.profile_id ?? TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
      status: blockerCodes.length > 0 ? 'blocked' : reviewReasonCodes.length > 0 ? 'warning' : 'pass',
      alignment_codes: ambiguous ? ['ambiguous_confirmation_rationale'] : ['validate_alignment_clear'],
      risk_coverage: missingRiskRefs.length > 0 ? 'missing_required_acceptance' : 'complete',
      required_check_coverage: missingChecks.length > 0 ? 'incomplete' : 'complete',
      scope_violations: [],
      rationale_summary: input.confirmation_input.rationale,
      provenance_ref: contextPacketRef,
      warning_codes: reviewReasonCodes.length > 0 ? ['AMBIGUOUS_CONFIRMATION_RATIONALE'] : [],
      blocker_codes: blockerCodes,
      review_reason_codes: reviewReasonCodes,
      policy_version: input.policy_version,
      output_schema_version: input.output_schema_version,
    };
  }

  private humanConfirmationSemanticReviewGate(review: HumanConfirmationSemanticReview): {
    status: 'ready' | 'blocked' | 'require_human_review';
    blocker_codes: string[];
    review_reason_codes: string[];
    error_code: string | null;
    error_message: string | null;
  } {
    const coverageBlockers = this.uniqueStrings([
      ...(review.risk_coverage !== 'complete' ? ['MISSING_ACCEPTED_RISK_COVERAGE'] : []),
      ...(review.required_check_coverage !== 'complete' ? ['MISSING_REQUIRED_CHECK_COVERAGE'] : []),
      ...(review.scope_violations.length > 0 ? ['SEMANTIC_REVIEW_SCOPE_VIOLATION'] : []),
    ]);
    if (coverageBlockers.length > 0) {
      return {
        status: 'blocked',
        blocker_codes: this.uniqueStrings([
          ...coverageBlockers,
          ...review.blocker_codes,
        ]),
        review_reason_codes: review.review_reason_codes,
        error_code: 'GATE_CONSTRAINT_FAILED',
        error_message: 'Human confirmation semantic review coverage gate blocked materialization.',
      };
    }
    if (review.status === 'blocked' || review.blocker_codes.length > 0) {
      return {
        status: 'blocked',
        blocker_codes: review.blocker_codes.length > 0 ? review.blocker_codes : ['SEMANTIC_REVIEW_BLOCKED'],
        review_reason_codes: [],
        error_code: 'GATE_CONSTRAINT_FAILED',
        error_message: 'Human confirmation semantic review blocked materialization.',
      };
    }
    if (review.review_reason_codes.length > 0) {
      return {
        status: 'require_human_review',
        blocker_codes: [],
        review_reason_codes: review.review_reason_codes,
        error_code: 'GATE_CONSTRAINT_FAILED',
        error_message: 'Human confirmation semantic review requires human review.',
      };
    }
    return {
      status: 'ready',
      blocker_codes: [],
      review_reason_codes: [],
      error_code: null,
      error_message: null,
    };
  }

  private assertHumanConfirmationSemanticReviewLineage(
    input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput,
    contextPacketRef: TopicSelectionFunctionalRef,
    review: HumanConfirmationSemanticReview,
    executionMode: TopicSelectionWorkflowHarnessHumanConfirmNeedExecutionMode,
  ): void {
    const expectedProfileId = input.profile_id ?? TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID;
    const lineageMatches = review.schema_version === TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION
      && review.workflow_run_id === input.workflow_run_id
      && review.node_attempt_id === input.node_attempt_id
      && this.sameFunctionalRef(review.context_packet_ref, contextPacketRef)
      && (review.context_packet_ref.title_card_id ?? null) === (contextPacketRef.title_card_id ?? null)
      && this.sameFunctionalRef(review.provenance_ref, contextPacketRef)
      && (review.provenance_ref.title_card_id ?? null) === (contextPacketRef.title_card_id ?? null)
      && review.execution_mode === executionMode
      && review.profile_id === expectedProfileId
      && review.policy_version === input.policy_version
      && review.output_schema_version === input.output_schema_version;
    if (!lineageMatches) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Human confirmation semantic review lineage mismatch.', {
        blocker_codes: ['SEMANTIC_REVIEW_LINEAGE_MISMATCH'],
        expected: {
          schema_version: TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
          workflow_run_id: input.workflow_run_id,
          node_attempt_id: input.node_attempt_id,
          context_packet_ref: contextPacketRef,
          provenance_ref: contextPacketRef,
          execution_mode: executionMode,
          profile_id: expectedProfileId,
          policy_version: input.policy_version,
          output_schema_version: input.output_schema_version,
        },
        actual: {
          schema_version: review.schema_version,
          workflow_run_id: review.workflow_run_id,
          node_attempt_id: review.node_attempt_id,
          context_packet_ref: review.context_packet_ref,
          provenance_ref: review.provenance_ref,
          execution_mode: review.execution_mode,
          profile_id: review.profile_id,
          policy_version: review.policy_version,
          output_schema_version: review.output_schema_version,
        },
      });
    }
  }

  private assertHumanConfirmNeedLineage(
    input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput,
    adjudication: TopicSelectionValidateNeedAdjudicationResultRecord,
    candidate: TopicSelectionNeedCandidateRecord,
    supportPacket: TopicSelectionValidationDecisionSupportPacketRecord,
  ): void {
    if (adjudication.title_card_id !== input.title_card_id || candidate.title_card_id !== input.title_card_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'N8 inputs belong to a different title card.');
    }
    if (adjudication.final_decision !== 'validate') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'N8 requires a validate adjudication.');
    }
    if (!adjudication.output_validated_need_id) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'N8 requires output_validated_need_id from N7.');
    }
    if (adjudication.output_validated_need_id !== input.reserved_validated_need_ref.ref_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'reserved_validated_need_ref must match adjudication output_validated_need_id.');
    }
    if (adjudication.need_candidate_id !== candidate.need_candidate_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'adjudication_result_ref does not match NeedCandidate.');
    }
    if (supportPacket.validation_support_packet_id !== adjudication.support_packet_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'validation_support_packet_ref does not match adjudication support packet.');
    }
    if (!this.sameFunctionalRef(input.need_candidate_ref, this.ref('need_candidate', candidate.need_candidate_id, candidate.title_card_id, candidate.candidate_version))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'need_candidate_ref does not match adjudication candidate.');
    }
    if (!this.sameFunctionalRef(input.validation_support_packet_ref, this.ref(
      'validation_decision_support_packet',
      supportPacket.validation_support_packet_id,
      supportPacket.title_card_id,
    ))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'validation_support_packet_ref does not match support packet.');
    }
  }

  private humanConfirmNeedBlockedResult(
    input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput,
    options: {
      adjudication?: TopicSelectionValidateNeedAdjudicationResultRecord | null;
      candidate?: TopicSelectionNeedCandidateRecord | null;
      supportPacket?: TopicSelectionValidationDecisionSupportPacketRecord | null;
      semanticReviewContextPacketRef?: TopicSelectionFunctionalRef | null;
      semanticReviewRef?: TopicSelectionFunctionalRef | null;
      status: 'blocked' | 'require_human_review';
      routeOutcome: 'blocked' | 'require_human_review';
      blockerCodes?: string[];
      warningCodes?: string[];
      reviewReasonCodes?: string[];
      errorCode?: string | null;
      errorMessage?: string | null;
    },
  ): TopicSelectionHumanConfirmNeedNodeResult {
    return {
      schema_version: TOPIC_SELECTION_HUMAN_CONFIRM_NEED_NODE_RESULT_SCHEMA_VERSION,
      node_id: HUMAN_CONFIRM_NEED_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      status: options.status,
      route_outcome: options.routeOutcome,
      adjudication_result_ref: options.adjudication
        ? this.ref('validate_need_adjudication_result', options.adjudication.adjudication_result_id, options.adjudication.title_card_id)
        : input.adjudication_result_ref ?? null,
      need_candidate_ref: options.candidate
        ? this.ref('need_candidate', options.candidate.need_candidate_id, options.candidate.title_card_id, options.candidate.candidate_version)
        : input.need_candidate_ref ?? null,
      validation_support_packet_ref: options.supportPacket
        ? this.ref(
            'validation_decision_support_packet',
            options.supportPacket.validation_support_packet_id,
            options.supportPacket.title_card_id,
          )
        : input.validation_support_packet_ref ?? null,
      human_decision_ref: null,
      validated_need_ref: null,
      semantic_review_context_packet_ref: options.semanticReviewContextPacketRef ?? null,
      semantic_review_ref: options.semanticReviewRef ?? null,
      confirmation_input_hash: this.hash(input.confirmation_input),
      accepted_risk_refs: input.confirmation_input.accepted_risk_refs,
      residual_risk_refs: this.uniqueRefs([
        ...(options.supportPacket?.residual_risk_refs ?? []),
        ...(options.adjudication?.residual_risk_refs ?? []),
      ]),
      required_check_results_snapshot: input.confirmation_input.required_check_results,
      blocker_codes: options.blockerCodes ?? [],
      warning_codes: options.warningCodes ?? [],
      review_reason_codes: options.reviewReasonCodes ?? [],
      next_node_id: null,
      harness_trace_artifact_ref: null,
      replay_provenance: null,
      error_code: options.errorCode ?? null,
      error_message: options.errorMessage ?? null,
    };
  }

  private humanConfirmNeedStatusFromAppError(error: AppError): 'blocked' | 'require_human_review' {
    const reviewReasonCodes = error.details?.review_reason_codes;
    return Array.isArray(reviewReasonCodes) && reviewReasonCodes.length > 0 ? 'require_human_review' : 'blocked';
  }

  private humanConfirmNeedBlockerCodesFromAppError(error: AppError): string[] {
    if (/ValidatedNeed already exists/u.test(error.message)) {
      return ['DUPLICATE_VALIDATED_NEED'];
    }
    if (/HumanConfirmedDecision exists/u.test(error.message)) {
      return ['PARTIAL_CONFIRMATION_WRITE'];
    }
    return this.blockerCodesFromAppError(error);
  }

  private evaluateHumanConfirmNeedAssertions(
    input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput,
    nodeResult: TopicSelectionHumanConfirmNeedNodeResult,
  ): TopicSelectionWorkflowHarnessAssertion[] {
    const expected = input.expectations ?? {};
    const assertions: TopicSelectionWorkflowHarnessAssertion[] = [
      this.assertion(
        'node_status_matches_expectation',
        expected.status === undefined || nodeResult.status === expected.status,
        'HumanConfirmNeed node status must match scenario expectation.',
        expected.status,
        nodeResult.status,
      ),
      this.assertion(
        'no_direct_v1b_bundle_creation',
        expected.v1b_bundle_created === undefined || expected.v1b_bundle_created === false,
        'HumanConfirmNeed must not create TopicSelectionV1aToV1bInputBundle authority.',
        false,
        expected.v1b_bundle_created ?? false,
      ),
    ];
    if (expected.route_outcome !== undefined) {
      assertions.push(this.assertion(
        'route_outcome_matches_expectation',
        nodeResult.route_outcome === expected.route_outcome,
        'HumanConfirmNeed route_outcome must match scenario expectation.',
        expected.route_outcome,
        nodeResult.route_outcome,
      ));
    }
    if (expected.error_code !== undefined) {
      assertions.push(this.assertion(
        'error_code_matches_expectation',
        nodeResult.error_code === expected.error_code,
        'HumanConfirmNeed error_code must match scenario expectation.',
        expected.error_code,
        nodeResult.error_code,
      ));
    }
    if (expected.blocker_codes) {
      assertions.push(this.assertion(
        'blocker_codes_include_expectation',
        expected.blocker_codes.every((code) => nodeResult.blocker_codes.includes(code)),
        'HumanConfirmNeed blocker codes must include expected scenario blockers.',
        expected.blocker_codes,
        nodeResult.blocker_codes,
      ));
    }
    if (expected.review_reason_codes) {
      assertions.push(this.assertion(
        'review_reason_codes_include_expectation',
        expected.review_reason_codes.every((code) => nodeResult.review_reason_codes.includes(code)),
        'HumanConfirmNeed review reason codes must include expected scenario reasons.',
        expected.review_reason_codes,
        nodeResult.review_reason_codes,
      ));
    }
    if (expected.validated_need_created !== undefined) {
      assertions.push(this.assertion(
        'validated_need_creation_matches_expectation',
        Boolean(nodeResult.validated_need_ref) === expected.validated_need_created,
        'HumanConfirmNeed ValidatedNeed materialization must match scenario expectation.',
        expected.validated_need_created,
        Boolean(nodeResult.validated_need_ref),
      ));
    }
    if (nodeResult.status === 'ready') {
      assertions.push(
        this.assertion(
          'ready_advances_to_node9',
          nodeResult.route_outcome === 'advance_to_publish_v1b_input_bundle'
            && nodeResult.next_node_id === 'topic-selection.v1a.publish-v1b-input-bundle.v1',
          'Ready HumanConfirmNeed result must hand off to Node 9 only.',
          'topic-selection.v1a.publish-v1b-input-bundle.v1',
          nodeResult.next_node_id,
        ),
        this.assertion(
          'ready_materializes_reserved_validated_need',
          nodeResult.validated_need_ref?.ref_id === input.reserved_validated_need_ref.ref_id,
          'Ready HumanConfirmNeed must materialize N7 reserved ValidatedNeed id.',
          input.reserved_validated_need_ref.ref_id,
          nodeResult.validated_need_ref?.ref_id,
        ),
      );
    }
    return assertions;
  }

  private createHumanConfirmNeedTraceSnapshot(input: {
    input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput;
    nodeInput: TopicSelectionWorkflowHarnessHumanConfirmNeedNodeInput;
    inputHash: string;
    nodeResult: TopicSelectionHumanConfirmNeedNodeResult;
    contextPacket: HumanConfirmationSemanticReviewContextPacket | null;
    semanticReview: HumanConfirmationSemanticReview | null;
    artifactRefs: TopicSelectionFunctionalRef[];
    assertions: TopicSelectionWorkflowHarnessAssertion[];
    scenarioStatus: 'passed' | 'failed';
  }): TopicSelectionWorkflowHarnessHumanConfirmNeedTraceSnapshot {
    return {
      schema_version: 'topic-selection-workflow-harness-trace-v1',
      payload_schema: HUMAN_CONFIRM_NEED_TRACE_PAYLOAD_SCHEMA,
      scenario_id: input.input.scenario_id,
      scenario_case_id: input.input.scenario_case_id ?? null,
      node_id: HUMAN_CONFIRM_NEED_NODE_ID,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      scenario_status: input.scenarioStatus,
      node_status: input.nodeResult.status,
      input_hash: input.inputHash,
      node_input: input.nodeInput,
      node_result: input.nodeResult,
      semantic_review_context_packet: input.contextPacket,
      semantic_review: input.semanticReview,
      authority_refs: this.uniqueRefs([
        input.nodeResult.human_decision_ref,
        input.nodeResult.validated_need_ref,
      ]),
      audit_refs: this.uniqueRefs([
        input.nodeResult.semantic_review_context_packet_ref,
        input.nodeResult.semantic_review_ref,
        input.nodeResult.harness_trace_artifact_ref ?? null,
      ]),
      artifact_refs: input.artifactRefs,
      warning_codes: input.nodeResult.warning_codes,
      blocker_codes: input.nodeResult.blocker_codes,
      assertions: input.assertions,
      created_at: this.now(),
    };
  }

  private assertPublishV1bInputBundleScenarioInput(
    input: TopicSelectionWorkflowHarnessPublishV1bInputBundleInput,
  ): void {
    this.assertNonEmpty(input.scenario_id, 'scenario_id');
    this.assertNonEmpty(input.title_card_id, 'title_card_id');
    this.assertNonEmpty(input.workflow_run_id, 'workflow_run_id');
    this.assertNonEmpty(input.node_attempt_id, 'node_attempt_id');
    this.assertFunctionalRef(input.validated_need_ref, 'validated_need_ref');
    this.assertFunctionalRef(input.source_need_candidate_ref, 'source_need_candidate_ref');
    this.assertFunctionalRef(input.adjudication_result_ref, 'adjudication_result_ref');
    this.assertFunctionalRef(input.support_packet_ref, 'support_packet_ref');
    this.assertFunctionalRef(input.human_decision_ref, 'human_decision_ref');
    this.assertFunctionalRef(input.evidence_map_ref, 'evidence_map_ref');
    this.assertFunctionalRef(input.search_run_ref, 'search_run_ref');
    this.assertFunctionalRef(input.search_plan_ref, 'search_plan_ref');
    this.assertFunctionalRef(input.literature_snapshot_ref, 'literature_snapshot_ref');
    this.assertFunctionalRefs(input.risk_refs, 'risk_refs');
    if (input.memory_suggestion_refs) {
      this.assertFunctionalRefs(input.memory_suggestion_refs, 'memory_suggestion_refs');
    }
    if (input.recheck_request_refs) {
      this.assertFunctionalRefs(input.recheck_request_refs, 'recheck_request_refs');
    }
    this.assertNonEmpty(input.policy_version, 'policy_version');
    this.assertNonEmpty(input.output_schema_version, 'output_schema_version');
    if (input.validated_need_ref.ref_type !== 'validated_need') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'validated_need_ref.ref_type must be validated_need.');
    }
    if (input.source_need_candidate_ref.ref_type !== 'need_candidate') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'source_need_candidate_ref.ref_type must be need_candidate.');
    }
    if (input.adjudication_result_ref.ref_type !== 'validate_need_adjudication_result') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'adjudication_result_ref.ref_type must be validate_need_adjudication_result.');
    }
    if (input.support_packet_ref.ref_type !== 'validation_decision_support_packet') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'support_packet_ref.ref_type must be validation_decision_support_packet.');
    }
    if (input.human_decision_ref.ref_type !== 'human_confirmed_decision') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'human_decision_ref.ref_type must be human_confirmed_decision.');
    }
  }

  private publishV1bInputBundleNodeInput(
    input: TopicSelectionWorkflowHarnessPublishV1bInputBundleInput,
  ): TopicSelectionWorkflowHarnessPublishV1bInputBundleNodeInput {
    return {
      schema_version: TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_INPUT_SCHEMA_VERSION,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      title_card_ref: this.ref('title_card', input.title_card_id, input.title_card_id),
      validated_need_ref: input.validated_need_ref,
      source_need_candidate_ref: input.source_need_candidate_ref,
      adjudication_result_ref: input.adjudication_result_ref,
      support_packet_ref: input.support_packet_ref,
      human_decision_ref: input.human_decision_ref,
      evidence_map_ref: input.evidence_map_ref,
      search_run_ref: input.search_run_ref,
      search_plan_ref: input.search_plan_ref,
      literature_snapshot_ref: input.literature_snapshot_ref,
      evidence_role_bundle: input.evidence_role_bundle,
      risk_refs: input.risk_refs,
      memory_suggestion_refs: input.memory_suggestion_refs ?? [],
      recheck_request_refs: input.recheck_request_refs ?? [],
      expected_bundle_version: input.expected_bundle_version ?? '',
      policy_version: input.policy_version,
      output_schema_version: input.output_schema_version,
      created_by: input.created_by ?? 'system',
    };
  }

  private publishV1bInputBundleInputHashPayload(
    nodeInput: TopicSelectionWorkflowHarnessPublishV1bInputBundleNodeInput,
  ): Record<string, unknown> {
    return {
      node_id: PUBLISH_V1B_INPUT_BUNDLE_NODE_ID,
      node_input: nodeInput,
    };
  }

  private assertPublishV1bInputBundleLineage(
    input: TopicSelectionWorkflowHarnessPublishV1bInputBundleInput,
    validatedNeed: TopicSelectionValidatedNeedRecord,
    candidate: TopicSelectionNeedCandidateRecord,
    supportPacket: TopicSelectionValidationDecisionSupportPacketRecord,
    adjudication: TopicSelectionValidateNeedAdjudicationResultRecord,
    humanDecision: TopicSelectionHumanConfirmedDecisionRecord,
    expectedMemorySuggestionRefs: TopicSelectionFunctionalRef[],
  ): void {
    if (
      validatedNeed.title_card_id !== input.title_card_id
      || candidate.title_card_id !== input.title_card_id
      || supportPacket.title_card_id !== input.title_card_id
      || adjudication.title_card_id !== input.title_card_id
    ) {
      throw new AppError(409, 'VERSION_CONFLICT', 'N9 inputs belong to a different title card.');
    }
    if (validatedNeed.source_need_candidate_id !== candidate.need_candidate_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'validated_need_ref does not match source_need_candidate_ref.');
    }
    if (validatedNeed.support_packet_id !== supportPacket.validation_support_packet_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'validated_need_ref does not match support_packet_ref.');
    }
    if (validatedNeed.adjudication_result_id !== adjudication.adjudication_result_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'validated_need_ref does not match adjudication_result_ref.');
    }
    if (validatedNeed.human_decision_id !== humanDecision.human_confirmed_decision_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'validated_need_ref does not match human_decision_ref.');
    }
    if (supportPacket.need_candidate_id !== candidate.need_candidate_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'support_packet_ref does not match NeedCandidate.');
    }
    if (
      adjudication.need_candidate_id !== candidate.need_candidate_id
      || adjudication.support_packet_id !== supportPacket.validation_support_packet_id
    ) {
      throw new AppError(409, 'VERSION_CONFLICT', 'adjudication_result_ref lineage does not match support packet.');
    }
    if (adjudication.final_decision !== 'validate' || adjudication.output_validated_need_id !== validatedNeed.validated_need_id) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'N9 requires a validated adjudication with materialized ValidatedNeed.');
    }
    if (humanDecision.decision_type !== 'confirm') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'N9 requires a confirm human decision.');
    }
    this.assertSameRefForPublish(input.validated_need_ref, this.ref('validated_need', validatedNeed.validated_need_id, validatedNeed.title_card_id), 'validated_need_ref');
    this.assertSameRefForPublish(input.source_need_candidate_ref, this.ref('need_candidate', candidate.need_candidate_id, candidate.title_card_id, candidate.candidate_version), 'source_need_candidate_ref');
    this.assertSameRefForPublish(input.adjudication_result_ref, this.ref('validate_need_adjudication_result', adjudication.adjudication_result_id, adjudication.title_card_id), 'adjudication_result_ref');
    this.assertSameRefForPublish(input.support_packet_ref, this.ref('validation_decision_support_packet', supportPacket.validation_support_packet_id, supportPacket.title_card_id), 'support_packet_ref');
    this.assertSameRefForPublish(input.human_decision_ref, this.ref('human_confirmed_decision', humanDecision.human_confirmed_decision_id, humanDecision.title_card_id ?? null), 'human_decision_ref');
    this.assertSameRefForPublish(input.evidence_map_ref, validatedNeed.evidence_map_ref, 'evidence_map_ref');
    this.assertSameRefForPublish(input.search_run_ref, validatedNeed.search_run_ref, 'search_run_ref');
    this.assertSameRefForPublish(input.search_plan_ref, validatedNeed.search_plan_ref, 'search_plan_ref');
    this.assertSameRefForPublish(input.literature_snapshot_ref, validatedNeed.literature_snapshot_ref, 'literature_snapshot_ref');
    this.assertSameRefForPublish(humanDecision.target_ref, input.validated_need_ref, 'human_decision.target_ref');
    if (this.hash(input.evidence_role_bundle) !== this.hash(validatedNeed.evidence_role_bundle)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'evidence_role_bundle must match ValidatedNeed.');
    }
    this.assertSameRefSetForPublish(
      input.risk_refs,
      this.uniqueRefs([...validatedNeed.residual_risk_refs, ...validatedNeed.accepted_risk_refs]),
      'risk_refs',
    );
    this.assertSameRefSetForPublish(input.memory_suggestion_refs ?? [], expectedMemorySuggestionRefs, 'memory_suggestion_refs');
    this.assertSameRefSetForPublish(input.recheck_request_refs ?? [], candidate.open_recheck_request_refs, 'recheck_request_refs');
  }

  private assertPublishedV1bInputBundleMatchesInput(
    input: TopicSelectionWorkflowHarnessPublishV1bInputBundleInput,
    bundle: TopicSelectionV1aToV1bInputBundleRecord,
  ): void {
    this.assertSameRefForPublish(input.validated_need_ref, bundle.validated_need_ref, 'bundle.validated_need_ref');
    this.assertSameRefForPublish(input.source_need_candidate_ref, bundle.source_need_candidate_ref, 'bundle.source_need_candidate_ref');
    this.assertSameRefForPublish(input.adjudication_result_ref, bundle.adjudication_result_ref, 'bundle.adjudication_result_ref');
    this.assertSameRefForPublish(input.support_packet_ref, bundle.support_packet_ref, 'bundle.support_packet_ref');
    this.assertSameRefForPublish(input.human_decision_ref, bundle.human_decision_ref, 'bundle.human_decision_ref');
    this.assertSameRefForPublish(input.evidence_map_ref, bundle.evidence_map_ref, 'bundle.evidence_map_ref');
    this.assertSameRefForPublish(input.search_run_ref, bundle.search_run_ref, 'bundle.search_run_ref');
    this.assertSameRefForPublish(input.search_plan_ref, bundle.search_plan_ref, 'bundle.search_plan_ref');
    this.assertSameRefForPublish(input.literature_snapshot_ref, bundle.literature_snapshot_ref, 'bundle.literature_snapshot_ref');
    this.assertSameRefSetForPublish(input.risk_refs, bundle.risk_refs, 'bundle.risk_refs');
    this.assertSameRefSetForPublish(input.memory_suggestion_refs ?? [], bundle.memory_suggestion_refs, 'bundle.memory_suggestion_refs');
    this.assertSameRefSetForPublish(input.recheck_request_refs ?? [], bundle.recheck_request_refs, 'bundle.recheck_request_refs');
  }

  private publishV1bInputBundleCarriedRefs(
    input: TopicSelectionWorkflowHarnessPublishV1bInputBundleInput,
    bundle: TopicSelectionV1aToV1bInputBundleRecord,
    bundleRef: TopicSelectionFunctionalRef,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      bundleRef,
      bundle.validated_need_ref,
      bundle.source_need_candidate_ref,
      bundle.adjudication_result_ref,
      bundle.support_packet_ref,
      bundle.human_decision_ref,
      bundle.evidence_map_ref,
      bundle.search_run_ref,
      bundle.search_plan_ref,
      bundle.literature_snapshot_ref,
      ...bundle.risk_refs,
      ...(input.memory_suggestion_refs ?? []),
      ...(input.recheck_request_refs ?? []),
    ]);
  }

  private publishV1bInputBundleBlockedResult(
    input: TopicSelectionWorkflowHarnessPublishV1bInputBundleInput,
    options: {
      validatedNeed?: TopicSelectionValidatedNeedRecord | null;
      blockerCodes?: string[];
      warningCodes?: string[];
      errorCode?: string | null;
      errorMessage?: string | null;
    },
  ): TopicSelectionPublishV1bInputBundleNodeResult {
    return {
      schema_version: TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_RESULT_SCHEMA_VERSION,
      node_id: PUBLISH_V1B_INPUT_BUNDLE_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      status: 'blocked',
      route_outcome: 'blocked',
      validated_need_ref: options.validatedNeed
        ? this.ref('validated_need', options.validatedNeed.validated_need_id, options.validatedNeed.title_card_id)
        : input.validated_need_ref ?? null,
      v1b_input_bundle_ref: null,
      bundle_version: null,
      bundle_payload_hash: null,
      idempotency_result: 'not_applicable',
      carried_authority_refs: this.uniqueRefs([input.validated_need_ref ?? null]),
      risk_refs: input.risk_refs ?? [],
      memory_suggestion_refs: input.memory_suggestion_refs ?? [],
      recheck_request_refs: input.recheck_request_refs ?? [],
      blocker_codes: options.blockerCodes ?? [],
      warning_codes: options.warningCodes ?? [],
      harness_trace_artifact_ref: null,
      replay_provenance: null,
      error_code: options.errorCode ?? null,
      error_message: options.errorMessage ?? null,
    };
  }

  private evaluatePublishV1bInputBundleAssertions(
    input: TopicSelectionWorkflowHarnessPublishV1bInputBundleInput,
    nodeResult: TopicSelectionPublishV1bInputBundleNodeResult,
  ): TopicSelectionWorkflowHarnessAssertion[] {
    const expected = input.expectations ?? {};
    const assertions: TopicSelectionWorkflowHarnessAssertion[] = [
      this.assertion(
        'node_status_matches_expectation',
        expected.status === undefined || nodeResult.status === expected.status,
        'PublishV1bInputBundle node status must match scenario expectation.',
        expected.status,
        nodeResult.status,
      ),
      this.assertion(
        'terminal_v1a_handoff_result',
        !('next_node_id' in (nodeResult as unknown as Record<string, unknown>)),
        'PublishV1bInputBundle must not hard-code a v1b next_node_id.',
        'no next_node_id',
        (nodeResult as unknown as Record<string, unknown>).next_node_id ?? null,
      ),
    ];
    if (expected.route_outcome !== undefined) {
      assertions.push(this.assertion(
        'route_outcome_matches_expectation',
        nodeResult.route_outcome === expected.route_outcome,
        'PublishV1bInputBundle route_outcome must match scenario expectation.',
        expected.route_outcome,
        nodeResult.route_outcome,
      ));
    }
    if (expected.error_code !== undefined) {
      assertions.push(this.assertion(
        'error_code_matches_expectation',
        nodeResult.error_code === expected.error_code,
        'PublishV1bInputBundle error_code must match scenario expectation.',
        expected.error_code,
        nodeResult.error_code,
      ));
    }
    if (expected.blocker_codes) {
      assertions.push(this.assertion(
        'blocker_codes_include_expectation',
        expected.blocker_codes.every((code) => nodeResult.blocker_codes.includes(code)),
        'PublishV1bInputBundle blocker codes must include expected scenario blockers.',
        expected.blocker_codes,
        nodeResult.blocker_codes,
      ));
    }
    if (expected.idempotency_result !== undefined) {
      assertions.push(this.assertion(
        'idempotency_result_matches_expectation',
        nodeResult.idempotency_result === expected.idempotency_result,
        'PublishV1bInputBundle idempotency result must match scenario expectation.',
        expected.idempotency_result,
        nodeResult.idempotency_result,
      ));
    }
    if (expected.bundle_published !== undefined) {
      assertions.push(this.assertion(
        'bundle_publish_matches_expectation',
        Boolean(nodeResult.v1b_input_bundle_ref) === expected.bundle_published,
        'PublishV1bInputBundle bundle publication must match scenario expectation.',
        expected.bundle_published,
        Boolean(nodeResult.v1b_input_bundle_ref),
      ));
    }
    if (nodeResult.status === 'ready') {
      assertions.push(
        this.assertion(
          'ready_publishes_bundle_ref',
          Boolean(nodeResult.v1b_input_bundle_ref) && nodeResult.bundle_version === input.expected_bundle_version,
          'Ready PublishV1bInputBundle must expose a bundle ref at expected_bundle_version.',
          input.expected_bundle_version,
          nodeResult.bundle_version,
        ),
        this.assertion(
          'ready_carries_validated_need_ref',
          nodeResult.validated_need_ref
            ? this.sameFunctionalRef(nodeResult.validated_need_ref, input.validated_need_ref)
            : false,
          'Ready PublishV1bInputBundle must carry the input ValidatedNeed ref.',
          input.validated_need_ref,
          nodeResult.validated_need_ref,
        ),
      );
    }
    return assertions;
  }

  private createPublishV1bInputBundleTraceSnapshot(input: {
    input: TopicSelectionWorkflowHarnessPublishV1bInputBundleInput;
    nodeInput: TopicSelectionWorkflowHarnessPublishV1bInputBundleNodeInput;
    inputHash: string;
    nodeResult: TopicSelectionPublishV1bInputBundleNodeResult;
    bundle: TopicSelectionV1aToV1bInputBundleRecord | null;
    assertions: TopicSelectionWorkflowHarnessAssertion[];
    scenarioStatus: 'passed' | 'failed';
  }): TopicSelectionWorkflowHarnessPublishV1bInputBundleTraceSnapshot {
    return {
      schema_version: 'topic-selection-workflow-harness-trace-v1',
      payload_schema: PUBLISH_V1B_INPUT_BUNDLE_TRACE_PAYLOAD_SCHEMA,
      scenario_id: input.input.scenario_id,
      scenario_case_id: input.input.scenario_case_id ?? null,
      node_id: PUBLISH_V1B_INPUT_BUNDLE_NODE_ID,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      scenario_status: input.scenarioStatus,
      node_status: input.nodeResult.status,
      input_hash: input.inputHash,
      node_input: input.nodeInput,
      node_result: input.nodeResult,
      v1b_input_bundle: input.bundle,
      authority_refs: input.nodeResult.carried_authority_refs,
      audit_refs: this.uniqueRefs([
        input.nodeResult.harness_trace_artifact_ref ?? null,
      ]),
      artifact_refs: [],
      warning_codes: input.nodeResult.warning_codes,
      blocker_codes: input.nodeResult.blocker_codes,
      assertions: input.assertions,
      created_at: this.now(),
    };
  }

  private assertSameRefForPublish(
    expected: TopicSelectionFunctionalRef,
    actual: TopicSelectionFunctionalRef,
    fieldName: string,
  ): void {
    if (!this.sameFunctionalRef(expected, actual) || (expected.title_card_id ?? null) !== (actual.title_card_id ?? null)) {
      throw new AppError(409, 'VERSION_CONFLICT', `${fieldName} lineage mismatch.`);
    }
  }

  private assertSameRefSetForPublish(
    actualRefs: TopicSelectionFunctionalRef[],
    expectedRefs: TopicSelectionFunctionalRef[],
    fieldName: string,
  ): void {
    const actual = new Set(this.uniqueRefs(actualRefs).map((ref) => this.refIdentity(ref)));
    const expected = new Set(this.uniqueRefs(expectedRefs).map((ref) => this.refIdentity(ref)));
    const missing = [...expected].filter((key) => !actual.has(key));
    const unexpected = [...actual].filter((key) => !expected.has(key));
    if (missing.length > 0 || unexpected.length > 0) {
      throw new AppError(409, 'VERSION_CONFLICT', `${fieldName} ref set mismatch.`, {
        missing_refs: missing,
        unexpected_refs: unexpected,
      });
    }
  }

  private async resolveValidateNeedCandidate(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
  ): Promise<TopicSelectionNeedCandidateRecord> {
    const needValidation = this.requiredNeedValidation();
    if (
      input.need_candidate_ref.ref_type !== 'need_candidate'
      || input.need_candidate_ref.title_card_id !== input.title_card_id
    ) {
      throw new AppError(409, 'VERSION_CONFLICT', 'need_candidate_ref must be a title-card-scoped NeedCandidate ref.');
    }
    const candidate = await needValidation.getNeedCandidateById(input.need_candidate_ref.ref_id);
    if (!candidate) {
      throw new AppError(404, 'NOT_FOUND', `NeedCandidate ${input.need_candidate_ref.ref_id} not found.`);
    }
    if (candidate.title_card_id !== input.title_card_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'NeedCandidate belongs to a different title card.');
    }
    if (input.need_candidate_ref.version_id && candidate.candidate_version !== input.need_candidate_ref.version_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'NeedCandidate version does not match runner input.');
    }
    this.assertValidateNeedCandidateLineage(input, candidate);
    return candidate;
  }

  private async findExistingAdjudicationForCandidate(
    candidate: TopicSelectionNeedCandidateRecord,
  ): Promise<TopicSelectionValidateNeedAdjudicationResultRecord | null> {
    const needValidation = this.requiredNeedValidation();
    if (!candidate.result_adjudication_id) {
      return null;
    }
    const adjudications = await needValidation.listAdjudicationResultsByNeedCandidateId(candidate.need_candidate_id);
    return adjudications.find((item) => item.adjudication_result_id === candidate.result_adjudication_id)
      ?? adjudications[0]
      ?? null;
  }

  private async resolveValidateNeedReadiness(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
    candidate: TopicSelectionNeedCandidateRecord,
  ): Promise<TopicSelectionNeedCandidateReadinessAssessmentRecord> {
    const needValidation = this.requiredNeedValidation();
    const mode = input.readiness_packet_mode ?? 'create_fresh';
    if (mode === 'consume_explicit_ref') {
      if (!input.readiness_assessment_ref) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'consume_explicit_ref requires readiness_assessment_ref.');
      }
      const readiness = await needValidation.getReadinessAssessmentById(input.readiness_assessment_ref.ref_id);
      if (!readiness) {
        throw new AppError(404, 'NOT_FOUND', `ReadinessAssessment ${input.readiness_assessment_ref.ref_id} not found.`);
      }
      this.assertValidateNeedReadinessLineage(input, candidate, readiness);
      return readiness;
    }
    const readiness = await needValidation.assessCandidateReadiness({
      workspace_id: input.workspace_id ?? null,
      need_candidate_id: candidate.need_candidate_id,
      assessment_workflow_version: 'v1',
      policy_version_id: input.policy_version,
      assessed_by: input.created_by ?? 'system',
    });
    this.assertValidateNeedReadinessLineage(input, candidate, readiness);
    return readiness;
  }

  private async resolveValidateNeedSupportPacket(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
    candidate: TopicSelectionNeedCandidateRecord,
    readiness: TopicSelectionNeedCandidateReadinessAssessmentRecord,
  ): Promise<TopicSelectionValidationDecisionSupportPacketRecord> {
    const needValidation = this.requiredNeedValidation();
    const mode = input.support_packet_mode ?? 'create_fresh';
    if (mode === 'consume_explicit_ref') {
      if (!input.validation_support_packet_ref) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'consume_explicit_ref requires validation_support_packet_ref.');
      }
      const packet = await needValidation.getValidationSupportPacketById(input.validation_support_packet_ref.ref_id);
      if (!packet) {
        throw new AppError(404, 'NOT_FOUND', `ValidationDecisionSupportPacket ${input.validation_support_packet_ref.ref_id} not found.`);
      }
      this.assertValidateNeedSupportPacketLineage(input, candidate, readiness, packet);
      return packet;
    }
    const packet = await needValidation.createValidationDecisionSupportPacket({
      workspace_id: input.workspace_id ?? null,
      need_candidate_id: candidate.need_candidate_id,
      readiness_assessment_id: readiness.readiness_assessment_id,
      created_by: input.created_by ?? 'system',
      policy_version_id: input.policy_version,
    });
    this.assertValidateNeedSupportPacketLineage(input, candidate, readiness, packet);
    return packet;
  }

  private async resolveNeedAdjudicationRecommendation(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
    nodeInput: TopicSelectionWorkflowHarnessValidateNeedAdjudicationNodeInput,
    candidate: TopicSelectionNeedCandidateRecord,
    readiness: TopicSelectionNeedCandidateReadinessAssessmentRecord,
    supportPacket: TopicSelectionValidationDecisionSupportPacketRecord,
  ): Promise<{
    packet: TopicSelectionNeedAdjudicationRecommendationPacket;
    packet_ref: TopicSelectionFunctionalRef;
    agent_invocation_audit_ref: TopicSelectionFunctionalRef | null;
    context_compression_report_ref: TopicSelectionFunctionalRef | null;
    warning_codes: string[];
  }> {
    const agent = this.requiredNeedAdjudicationAgent();
    const runtimeBinding = this.v1aLlmRuntimeBindings.buildNeedAdjudicationBinding({
      title_card_id: input.title_card_id,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      execution_mode: input.execution_mode,
      profile_id: nodeInput.profile_id,
      policy_version: input.policy_version,
      output_schema_version: input.output_schema_version,
      diagnostic_prompt_appendix: input.diagnostic_prompt_appendix ?? null,
      candidate,
      readiness,
      support_packet: supportPacket,
      runtime_token_budget_overrides: input.runtime_token_budget_overrides ?? null,
    });
    const compressionPrepared = await this.prepareNeedAdjudicationRuntimeBinding({
      input,
      nodeInput,
      candidate,
      readiness,
      supportPacket,
      runtimeBinding,
    });
    if (compressionPrepared.errorCode) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Need adjudication context compression failed.', {
        agent_error_code: compressionPrepared.errorCode,
        blocker_codes: compressionPrepared.blockerCodes.length > 0
          ? compressionPrepared.blockerCodes
          : [compressionPrepared.errorCode],
        warning_codes: compressionPrepared.warningCodes,
        agent_invocation_audit_ref: null,
        context_compression_report_ref: compressionPrepared.contextCompressionReportRef,
      });
    }
    const result = await agent.invokeStructuredOutput<TopicSelectionNeedAdjudicationRecommendationPacket>({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      node_id: VALIDATE_NEED_ADJUDICATION_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      execution_mode: input.execution_mode,
      execution_spec: input.execution_spec ?? null,
      executor_kind: input.executor_kind ?? 'single_agent',
      run_mode: input.run_mode ?? 'acceptance',
      profile_id: nodeInput.profile_id,
      output_contract: TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
      model_option_id: input.model_option_id ?? null,
      prompt: compressionPrepared.runtimeBinding.prompt,
      prompt_variant_key: compressionPrepared.runtimeBinding.prompt_variant_key,
      schema_name: TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
      schema: topicSelectionNeedAdjudicationRecommendationPacketSchema as unknown as Record<string, unknown>,
      messages: compressionPrepared.runtimeBinding.messages,
      input_refs: compressionPrepared.runtimeBinding.input_refs,
      context_packet_refs: compressionPrepared.runtimeBinding.context_packet_refs,
      context_packet_hashes: compressionPrepared.runtimeBinding.context_packet_hashes,
      runtime_token_budget: compressionPrepared.runtimeBinding.runtime_token_budget,
      mocked_output: input.mocked_output ?? null,
      codex_response: input.codex_response ?? null,
      created_by: input.created_by ?? 'system',
    });
    if (result.status !== 'succeeded' || !result.structured_output) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Need adjudication recommendation failed.', {
        agent_error_code: result.error_code ?? 'MALFORMED_ADJUDICATION_OUTPUT',
        blocker_codes: result.blocker_codes.length > 0
          ? result.blocker_codes
          : [result.error_code ?? 'MALFORMED_ADJUDICATION_OUTPUT'],
        warning_codes: this.uniqueStrings([
          ...result.warning_codes,
          ...compressionPrepared.warningCodes,
        ]),
        agent_invocation_audit_ref: result.audit_artifact_ref ?? null,
        context_compression_report_ref: compressionPrepared.contextCompressionReportRef,
      });
    }
    const packet = result.structured_output;
    this.assertRecommendationPacketLineage(input, candidate, readiness, supportPacket, packet);
    const artifact = await this.requiredControlPlane().recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      payload: {
        payload_schema: packet.schema_version,
        recommendation_packet: packet,
      },
      workflow_run_id: input.workflow_run_id,
      created_by: input.created_by ?? 'system',
    });
    return {
      packet,
      packet_ref: this.ref('artifact_ref', artifact.artifact_ref_id, artifact.title_card_id ?? input.title_card_id),
      agent_invocation_audit_ref: result.audit_artifact_ref ?? null,
      context_compression_report_ref: compressionPrepared.contextCompressionReportRef,
      warning_codes: this.uniqueStrings([
        ...result.warning_codes,
        ...compressionPrepared.warningCodes,
      ]),
    };
  }

  private async prepareNeedAdjudicationRuntimeBinding(input: {
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput;
    nodeInput: TopicSelectionWorkflowHarnessValidateNeedAdjudicationNodeInput;
    candidate: TopicSelectionNeedCandidateRecord;
    readiness: TopicSelectionNeedCandidateReadinessAssessmentRecord;
    supportPacket: TopicSelectionValidationDecisionSupportPacketRecord;
    runtimeBinding: TopicSelectionV1aLlmRuntimeInvocationBinding;
  }): Promise<{
    runtimeBinding: TopicSelectionV1aLlmRuntimeInvocationBinding;
    contextCompressionReportRef: TopicSelectionFunctionalRef | null;
    warningCodes: string[];
    blockerCodes: string[];
    errorCode: string | null;
  }> {
    const overrides = input.input.runtime_token_budget_overrides ?? null;
    const preflight = this.tokenBudgetGate.evaluate({
      context_policy_profile: input.runtimeBinding.runtime_token_budget.context_policy_profile,
      messages: input.runtimeBinding.messages,
      context_payloads: input.runtimeBinding.runtime_token_budget.context_payloads ?? [],
      schema: topicSelectionNeedAdjudicationRecommendationPacketSchema as unknown as Record<string, unknown>,
      extra_payloads: input.runtimeBinding.runtime_token_budget.extra_payloads ?? [],
      compression_already_applied: overrides?.compression_already_applied ?? false,
      estimated_input_tokens_override: overrides?.estimated_input_tokens_override,
      schema_overhead_tokens_override: overrides?.schema_overhead_tokens_override,
    });
    if (
      preflight.result.decision !== 'requires_compression'
      || overrides?.compression_already_applied === true
    ) {
      return {
        runtimeBinding: input.runtimeBinding,
        contextCompressionReportRef: null,
        warningCodes: [],
        blockerCodes: [],
        errorCode: null,
      };
    }

    const compressionPlan = this.v1aLlmRuntimeBindings.buildNeedAdjudicationCompressionPlan({
      title_card_id: input.input.title_card_id,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      scenario_id: input.input.scenario_id,
      scenario_case_id: input.input.scenario_case_id ?? null,
      execution_mode: input.input.execution_mode,
      profile_id: input.nodeInput.profile_id,
      policy_version: input.input.policy_version,
      output_schema_version: input.input.output_schema_version,
      diagnostic_prompt_appendix: input.input.diagnostic_prompt_appendix ?? null,
      candidate: input.candidate,
      readiness: input.readiness,
      support_packet: input.supportPacket,
      runtime_token_budget_overrides: overrides,
    });
    const compression = await this.recordNeedAdjudicationCompressionReport({
      input: input.input,
      runtimeBinding: input.runtimeBinding,
      compressionPlan,
      estimatedInputTokensBefore: preflight.result.estimated_input_tokens,
      estimatedInputTokensAfter: overrides?.estimated_input_tokens_after_compression_override,
    });
    const compressionIdentity = {
      compression_report_ref: compression.artifactRef,
      compression_report_hash: compression.artifactHash,
      compressed_context_hash: compression.result.report.compressed_context_hash,
      compression_already_applied: true,
    };
    const compressionWarningCodes = this.uniqueStrings([
      ...preflight.result.warning_codes,
      ...compression.result.warning_codes,
      'COMPRESSION_REPORT_RECORDED',
    ]);
    const baseBindingInput = {
      title_card_id: input.input.title_card_id,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      scenario_id: input.input.scenario_id,
      scenario_case_id: input.input.scenario_case_id ?? null,
      execution_mode: input.input.execution_mode,
      profile_id: input.nodeInput.profile_id,
      policy_version: input.input.policy_version,
      output_schema_version: input.input.output_schema_version,
      diagnostic_prompt_appendix: input.input.diagnostic_prompt_appendix ?? null,
      candidate: input.candidate,
      readiness: input.readiness,
      support_packet: input.supportPacket,
    };
    if (compression.result.quality_gate_result === 'blocked') {
      return {
        runtimeBinding: this.v1aLlmRuntimeBindings.buildNeedAdjudicationBinding({
          ...baseBindingInput,
          runtime_token_budget_overrides: {
            ...overrides,
            estimated_input_tokens_after_compression_override:
              preflight.result.estimated_input_tokens,
          },
          runtime_compression: compressionIdentity,
        }),
        contextCompressionReportRef: compression.artifactRef,
        warningCodes: compressionWarningCodes,
        blockerCodes: this.uniqueStrings([
          'COMPRESSION_QUALITY_GATE_BLOCKED',
          ...compression.result.blocker_codes,
        ]),
        errorCode: 'COMPRESSION_QUALITY_GATE_BLOCKED',
      };
    }

    return {
      runtimeBinding: this.v1aLlmRuntimeBindings.buildNeedAdjudicationBinding({
        ...baseBindingInput,
        compressed_context: compressionPlan.compressed_context,
        runtime_token_budget_overrides: overrides,
        runtime_compression: compressionIdentity,
      }),
      contextCompressionReportRef: compression.artifactRef,
      warningCodes: compressionWarningCodes,
      blockerCodes: [],
      errorCode: null,
    };
  }

  private async recordNeedAdjudicationCompressionReport(input: {
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput;
    runtimeBinding: TopicSelectionV1aLlmRuntimeInvocationBinding;
    compressionPlan: TopicSelectionV1aNeedAdjudicationCompressionPlan;
    estimatedInputTokensBefore: number | null;
    estimatedInputTokensAfter?: number | null;
  }): Promise<{
    artifactRef: TopicSelectionFunctionalRef;
    artifactHash: string;
    result: TopicSelectionCompressionReportRuntimeResult;
  }> {
    const result = this.compressionRuntime.createReport({
      context_policy_profile: input.runtimeBinding.runtime_token_budget.context_policy_profile,
      context_policy_profile_hash: input.runtimeBinding.runtime_token_budget.context_policy_profile_hash,
      compression_report_ref: input.compressionPlan.compression_report_ref,
      source_refs: input.compressionPlan.source_refs,
      input_context: input.compressionPlan.input_context,
      compressed_context: input.compressionPlan.compressed_context,
      summary: input.compressionPlan.summary,
      compression_executor_kind: 'deterministic_structural',
      required_preserved_facts: input.compressionPlan.fact_inventory,
      compressed_preserved_facts: input.compressionPlan.fact_inventory,
      redaction_policy: input.runtimeBinding.runtime_token_budget.context_policy_profile.redaction_policy,
      estimated_input_tokens_before_override: input.estimatedInputTokensBefore,
      estimated_input_tokens_after_override: input.estimatedInputTokensAfter,
    });
    const payload = {
      schema_version: 'v1',
      node_id: VALIDATE_NEED_ADJUDICATION_NODE_ID,
      artifact_key: 'context_compression_report',
      payload_schema: 'TopicSelectionCompressionReportEnvelope@v1',
      redaction_policy: input.runtimeBinding.runtime_token_budget.context_policy_profile.redaction_policy,
      report: result.report,
      compressed_context: input.compressionPlan.compressed_context,
    };
    const artifact = await this.requiredControlPlane().recordArtifactRef({
      workspace_id: input.input.workspace_id ?? null,
      title_card_id: input.input.title_card_id,
      artifact_kind: 'diagnostic',
      storage_kind: 'inline',
      payload,
      workflow_run_id: input.input.workflow_run_id,
      created_by: input.input.created_by ?? 'system',
    });
    return {
      artifactRef: this.ref(
        'artifact_ref',
        artifact.artifact_ref_id,
        artifact.title_card_id ?? input.input.title_card_id,
      ),
      artifactHash: artifact.checksum ?? this.hash(payload),
      result,
    };
  }

  private validateNeedAdjudicationRecommendationGate(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
    candidate: TopicSelectionNeedCandidateRecord,
    supportPacket: TopicSelectionValidationDecisionSupportPacketRecord,
    packet: TopicSelectionNeedAdjudicationRecommendationPacket,
  ): {
    status: 'ready' | 'blocked' | 'require_human_review';
    blocker_codes: string[];
    review_reason_codes: string[];
    error_code: string | null;
    error_message: string | null;
  } {
    const decision = packet.final_decision;
    if (!NEED_ADJUDICATION_LOW_RISK_MODEL_DECISIONS.has(decision)
      && !NEED_ADJUDICATION_HIGH_RISK_DECISIONS.has(decision)) {
      return {
        status: 'blocked',
        blocker_codes: ['UNSUPPORTED_FINAL_DECISION'],
        review_reason_codes: [],
        error_code: 'MALFORMED_ADJUDICATION_OUTPUT',
        error_message: 'Unsupported final_decision.',
      };
    }
    if (decision === 'return_to_candidate' && packet.required_actions.length === 0) {
      return {
        status: 'blocked',
        blocker_codes: ['REQUIRED_ACTIONS_MISSING'],
        review_reason_codes: [],
        error_code: 'GATE_CONSTRAINT_FAILED',
        error_message: 'return_to_candidate requires actionable required_actions.',
      };
    }
    if (decision === 'request_searchplan_recheck'
      && !packet.searchplan_recheck_reason
      && packet.searchplan_recheck_gap_codes.length === 0
      && packet.gap_codes.length === 0) {
      return {
        status: 'blocked',
        blocker_codes: ['SEARCHPLAN_RECHECK_REASON_REQUIRED'],
        review_reason_codes: [],
        error_code: 'GATE_CONSTRAINT_FAILED',
        error_message: 'request_searchplan_recheck requires a reason or gap codes.',
      };
    }
    if (decision === 'reject' && !packet.rejected_reason) {
      return {
        status: 'blocked',
        blocker_codes: ['REJECTED_REASON_REQUIRED'],
        review_reason_codes: [],
        error_code: 'GATE_CONSTRAINT_FAILED',
        error_message: 'reject requires rejected_reason.',
      };
    }
    if (decision === 'merge') {
      if (!packet.merge_target_need_candidate_ref) {
        return {
          status: 'blocked',
          blocker_codes: ['MERGE_TARGET_REQUIRED'],
          review_reason_codes: [],
          error_code: 'INVALID_PAYLOAD',
          error_message: 'merge requires merge_target_need_candidate_ref.',
        };
      }
      if (packet.merge_target_need_candidate_ref.ref_id === candidate.need_candidate_id) {
        return {
          status: 'blocked',
          blocker_codes: ['SELF_MERGE_FORBIDDEN'],
          review_reason_codes: [],
          error_code: 'GATE_CONSTRAINT_FAILED',
          error_message: 'NeedCandidate cannot merge into itself.',
        };
      }
    }
    if (decision === 'park' && packet.required_actions.length === 0 && packet.rationale.trim().length === 0) {
      return {
        status: 'blocked',
        blocker_codes: ['PARK_RATIONALE_REQUIRED'],
        review_reason_codes: [],
        error_code: 'GATE_CONSTRAINT_FAILED',
        error_message: 'park requires rationale or required_actions.',
      };
    }
    if (decision === 'validate') {
      const coveredRiskKeys = new Set([
        ...packet.residual_risk_refs.map((ref) => this.refIdentity(ref)),
        ...packet.accepted_risk_refs.map((ref) => this.refIdentity(ref)),
      ]);
      const droppedResidualRisks = supportPacket.residual_risk_refs.filter((ref) =>
        !coveredRiskKeys.has(this.refIdentity(ref)),
      );
      if (droppedResidualRisks.length > 0) {
        return {
          status: 'blocked',
          blocker_codes: ['RESIDUAL_RISK_DROPPED'],
          review_reason_codes: [],
          error_code: 'GATE_CONSTRAINT_FAILED',
          error_message: 'validate must carry or explicitly accept support packet residual risks.',
        };
      }
      if (
        supportPacket.open_gap_codes.includes('METHOD_FAMILY_COVERAGE_GAP')
        && !this.adjudicationPacketCarriesMethodFamilyGap(packet)
      ) {
        return {
          status: 'blocked',
          blocker_codes: ['METHOD_FAMILY_COVERAGE_GAP_DROPPED'],
          review_reason_codes: [],
          error_code: 'GATE_CONSTRAINT_FAILED',
          error_message: 'validate must carry method-family coverage gaps into required_actions.',
        };
      }
    }
    if (NEED_ADJUDICATION_HIGH_RISK_DECISIONS.has(decision)
      && !this.hasHumanOrHybridAcceptance(input)) {
      return {
        status: 'require_human_review',
        blocker_codes: [],
        review_reason_codes: ['HIGH_RISK_DECISION_REQUIRES_HUMAN_ACCEPTANCE'],
        error_code: null,
        error_message: null,
      };
    }
    return {
      status: 'ready',
      blocker_codes: [],
      review_reason_codes: [],
      error_code: null,
      error_message: null,
    };
  }

  private validateNeedAdjudicationWarningCodes(
    readiness: TopicSelectionNeedCandidateReadinessAssessmentRecord,
    supportPacket: TopicSelectionValidationDecisionSupportPacketRecord,
    packet: TopicSelectionNeedAdjudicationRecommendationPacket | null,
  ): string[] {
    return this.uniqueStrings([
      ...readiness.warnings.map((warning) => warning.code),
      ...supportPacket.open_gap_codes.filter((code) => code === 'METHOD_FAMILY_COVERAGE_GAP'),
      ...(packet?.final_decision === 'validate' && supportPacket.residual_risk_refs.length > 0
        ? ['VALIDATE_WITH_RESIDUAL_RISK']
        : []),
    ]);
  }

  private adjudicationPacketCarriesMethodFamilyGap(
    packet: TopicSelectionNeedAdjudicationRecommendationPacket,
  ): boolean {
    if (packet.gap_codes.includes('METHOD_FAMILY_COVERAGE_GAP')) {
      return true;
    }
    return packet.required_actions.some((action) =>
      /METHOD_FAMILY_COVERAGE_GAP|method[- ]family|coverage gap|fine[- ]tuning|hybrid/i.test(action),
    );
  }

  private validateNeedAdjudicationNodeInput(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
  ): TopicSelectionWorkflowHarnessValidateNeedAdjudicationNodeInput {
    return {
      schema_version: input.output_schema_version,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      title_card_ref: this.ref('title_card', input.title_card_id, input.title_card_id),
      need_candidate_ref: input.need_candidate_ref,
      evidence_map_ref: input.evidence_map_ref,
      search_run_ref: input.search_run_ref,
      search_plan_ref: input.search_plan_ref,
      literature_snapshot_ref: input.literature_snapshot_ref,
      readiness_assessment_ref: input.readiness_assessment_ref ?? null,
      validation_support_packet_ref: input.validation_support_packet_ref ?? null,
      readiness_packet_mode: input.readiness_packet_mode ?? 'create_fresh',
      support_packet_mode: input.support_packet_mode ?? 'create_fresh',
      execution_mode: input.execution_mode,
      execution_spec: input.execution_spec ?? null,
      profile_id: input.profile_id ?? TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID,
      policy_version: input.policy_version,
      output_schema_version: input.output_schema_version,
    };
  }

  private validateNeedAdjudicationInputHashPayload(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
    nodeInput: TopicSelectionWorkflowHarnessValidateNeedAdjudicationNodeInput,
  ): Record<string, unknown> {
    return {
      node_input: nodeInput,
      run_mode: input.run_mode ?? 'acceptance',
      executor_kind: input.executor_kind ?? 'single_agent',
      model_option_id: input.model_option_id ?? null,
      diagnostic_prompt_appendix: input.diagnostic_prompt_appendix ?? null,
      adjudication_actor: input.adjudication_actor ?? null,
      fixture_human_decision: input.fixture_human_decision ?? false,
      runtime_token_budget_overrides: input.runtime_token_budget_overrides ?? null,
      mocked_output_hash: input.mocked_output ? this.hash(input.mocked_output) : null,
      codex_response_hash: input.codex_response ? this.hash(input.codex_response) : null,
      created_by: input.created_by ?? 'system',
    };
  }

  private validateNeedAdjudicationBlockedResult(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
    details: {
      candidate: TopicSelectionNeedCandidateRecord | null;
      readiness?: TopicSelectionNeedCandidateReadinessAssessmentRecord | null;
      supportPacket?: TopicSelectionValidationDecisionSupportPacketRecord | null;
      recommendationPacketRef?: TopicSelectionFunctionalRef | null;
      status: 'blocked' | 'require_human_review';
      routeOutcome: 'blocked' | 'require_human_review';
      blockerCodes?: string[];
      reviewReasonCodes?: string[];
      errorCode?: string | null;
      errorMessage?: string | null;
      finalDecision?: TopicSelectionNeedAdjudicationDecision | null;
      requiredActions?: string[];
      acceptedRiskRefs?: TopicSelectionFunctionalRef[];
      residualRiskRefs?: TopicSelectionFunctionalRef[];
      warningCodes?: string[];
      duplicateAdjudicationRef?: TopicSelectionFunctionalRef | null;
      reservedValidatedNeedRef?: TopicSelectionFunctionalRef | null;
    },
  ): TopicSelectionValidateNeedAdjudicationNodeResult {
    return {
      schema_version: TOPIC_SELECTION_VALIDATE_NEED_ADJUDICATION_NODE_RESULT_SCHEMA_VERSION,
      node_id: VALIDATE_NEED_ADJUDICATION_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      status: details.status,
      route_outcome: details.routeOutcome,
      need_candidate_ref: details.candidate
        ? this.ref('need_candidate', details.candidate.need_candidate_id, details.candidate.title_card_id, details.candidate.candidate_version)
        : input.need_candidate_ref,
      readiness_assessment_ref: details.readiness
        ? this.ref('need_candidate_readiness', details.readiness.readiness_assessment_id, details.readiness.title_card_id)
        : input.readiness_assessment_ref ?? null,
      validation_support_packet_ref: details.supportPacket
        ? this.ref(
          'validation_decision_support_packet',
          details.supportPacket.validation_support_packet_id,
          details.supportPacket.title_card_id,
        )
        : input.validation_support_packet_ref ?? null,
      adjudication_result_ref: null,
      reserved_validated_need_ref: details.reservedValidatedNeedRef ?? null,
      next_node_id: null,
      repair_target: null,
      final_decision: details.finalDecision ?? null,
      required_actions: details.requiredActions ?? [],
      blocker_codes: details.blockerCodes ?? [],
      warning_codes: details.warningCodes ?? [],
      review_reason_codes: details.reviewReasonCodes ?? [],
      accepted_risk_refs: details.acceptedRiskRefs ?? [],
      residual_risk_refs: details.residualRiskRefs ?? details.supportPacket?.residual_risk_refs ?? [],
      merge_target_need_candidate_ref: null,
      recheck_request_ref: null,
      memory_suggestion_ref: null,
      recommendation_packet_ref: details.recommendationPacketRef ?? null,
      harness_trace_artifact_ref: null,
      replay_provenance: null,
      duplicate_adjudication_ref: details.duplicateAdjudicationRef ?? null,
      error_code: details.errorCode ?? null,
      error_message: details.errorMessage ?? null,
    };
  }

  private evaluateValidateNeedAdjudicationAssertions(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
    nodeResult: TopicSelectionValidateNeedAdjudicationNodeResult,
  ): TopicSelectionWorkflowHarnessAssertion[] {
    const expectations = input.expectations ?? {};
    const assertions: TopicSelectionWorkflowHarnessAssertion[] = [
      this.assertion(
        'expected_node_status',
        expectations.status ? nodeResult.status === expectations.status : nodeResult.status === 'ready',
        'ValidateNeedAdjudication node status must match scenario expectation.',
        expectations.status ?? 'ready',
        nodeResult.status,
      ),
      this.assertion(
        'no_multi_agent_debate',
        true,
        'ValidateNeedAdjudication may use a single-agent recommendation but never invokes multi-agent debate runtime.',
        'not_allowed',
        'not_allowed',
      ),
    ];
    if (expectations.route_outcome !== undefined) {
      assertions.push(this.assertion(
        'expected_route_outcome',
        nodeResult.route_outcome === expectations.route_outcome,
        'ValidateNeedAdjudication route_outcome must match scenario expectation.',
        expectations.route_outcome,
        nodeResult.route_outcome,
      ));
    }
    if (expectations.final_decision !== undefined) {
      assertions.push(this.assertion(
        'expected_final_decision',
        (nodeResult.final_decision ?? null) === expectations.final_decision,
        'ValidateNeedAdjudication final_decision must match scenario expectation.',
        expectations.final_decision,
        nodeResult.final_decision ?? null,
      ));
    }
    if (expectations.error_code !== undefined) {
      assertions.push(this.assertion(
        'expected_error_code',
        (nodeResult.error_code ?? null) === expectations.error_code,
        'ValidateNeedAdjudication error code must match scenario expectation.',
        expectations.error_code,
        nodeResult.error_code ?? null,
      ));
    }
    if (expectations.blocker_codes) {
      const missing = expectations.blocker_codes.filter((code) => !nodeResult.blocker_codes.includes(code));
      assertions.push(this.assertion(
        'expected_blocker_codes',
        missing.length === 0,
        'ValidateNeedAdjudication blocker codes must include expected scenario blockers.',
        expectations.blocker_codes,
        nodeResult.blocker_codes,
      ));
    }
    if (expectations.review_reason_codes) {
      const missing = expectations.review_reason_codes.filter((code) => !nodeResult.review_reason_codes.includes(code));
      assertions.push(this.assertion(
        'expected_review_reason_codes',
        missing.length === 0,
        'ValidateNeedAdjudication review reason codes must include expected scenario reasons.',
        expectations.review_reason_codes,
        nodeResult.review_reason_codes,
      ));
    }
    if (expectations.warning_codes) {
      const missing = expectations.warning_codes.filter((code) => !nodeResult.warning_codes.includes(code));
      assertions.push(this.assertion(
        'expected_warning_codes',
        missing.length === 0,
        'ValidateNeedAdjudication warning codes must include expected scenario warnings.',
        expectations.warning_codes,
        nodeResult.warning_codes,
      ));
    }
    if (expectations.adjudication_created !== undefined && expectations.adjudication_created !== null) {
      assertions.push(this.assertion(
        'expected_adjudication_creation',
        Boolean(nodeResult.adjudication_result_ref) === expectations.adjudication_created,
        'ValidateNeedAdjudication adjudication authority creation must match scenario expectation.',
        expectations.adjudication_created,
        Boolean(nodeResult.adjudication_result_ref),
      ));
    }
    if (nodeResult.status === 'ready') {
      assertions.push(
        this.assertion(
          'ready_has_route_outcome',
          nodeResult.route_outcome !== 'blocked' && nodeResult.route_outcome !== 'require_human_review',
          'Ready result must expose an automation route outcome.',
          'non_blocked_route',
          nodeResult.route_outcome,
        ),
        this.assertion(
          'adjudication_ref_created',
          Boolean(nodeResult.adjudication_result_ref),
          'Ready ValidateNeedAdjudication result must expose adjudication authority ref.',
          'adjudication_ref',
          nodeResult.adjudication_result_ref,
        ),
      );
      if (nodeResult.final_decision === 'validate') {
        assertions.push(this.assertion(
          'validate_has_reserved_validated_need_ref',
          Boolean(nodeResult.reserved_validated_need_ref),
          'Ready validate result must expose the reserved ValidatedNeed target ref for Node 8 automation.',
          'reserved_validated_need_ref',
          nodeResult.reserved_validated_need_ref,
        ));
      }
    } else {
      assertions.push(this.assertion(
        'blocked_without_adjudication_authority',
        nodeResult.adjudication_result_ref === null,
        'Blocked or human-review N7 result must not create adjudication authority.',
        null,
        nodeResult.adjudication_result_ref,
      ));
    }
    return assertions;
  }

  private createValidateNeedAdjudicationTraceSnapshot(input: {
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput;
    nodeInput: TopicSelectionWorkflowHarnessValidateNeedAdjudicationNodeInput;
    inputHash: string;
    nodeResult: TopicSelectionValidateNeedAdjudicationNodeResult;
    recommendationPacket: TopicSelectionNeedAdjudicationRecommendationPacket | null;
    artifactRefs: TopicSelectionFunctionalRef[];
    assertions: TopicSelectionWorkflowHarnessAssertion[];
    scenarioStatus: 'passed' | 'failed';
  }): TopicSelectionWorkflowHarnessValidateNeedAdjudicationTraceSnapshot {
    return {
      schema_version: 'topic-selection-workflow-harness-trace-v1',
      payload_schema: NEED_ADJUDICATION_TRACE_PAYLOAD_SCHEMA,
      scenario_id: input.input.scenario_id,
      scenario_case_id: input.input.scenario_case_id ?? null,
      node_id: VALIDATE_NEED_ADJUDICATION_NODE_ID,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      scenario_status: input.scenarioStatus,
      node_status: input.nodeResult.status,
      input_hash: input.inputHash,
      node_input: input.nodeInput,
      node_result: input.nodeResult,
      recommendation_packet: input.recommendationPacket,
      authority_refs: this.uniqueRefs([
        input.nodeResult.adjudication_result_ref,
        input.nodeResult.recheck_request_ref,
        input.nodeResult.memory_suggestion_ref,
      ]),
      audit_refs: this.uniqueRefs([
        input.nodeResult.recommendation_packet_ref,
        input.nodeResult.duplicate_adjudication_ref,
      ]),
      artifact_refs: input.artifactRefs,
      warning_codes: input.nodeResult.warning_codes,
      blocker_codes: input.nodeResult.blocker_codes,
      assertions: input.assertions,
      created_at: this.now(),
    };
  }

  private assertValidateNeedAdjudicationScenarioInput(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
  ): void {
    this.assertNonEmpty(input.scenario_id, 'scenario_id');
    this.assertNonEmpty(input.title_card_id, 'title_card_id');
    this.assertNonEmpty(input.workflow_run_id, 'workflow_run_id');
    this.assertNonEmpty(input.node_attempt_id, 'node_attempt_id');
    this.assertFunctionalRef(input.need_candidate_ref, 'need_candidate_ref');
    this.assertFunctionalRef(input.evidence_map_ref, 'evidence_map_ref');
    this.assertFunctionalRef(input.search_run_ref, 'search_run_ref');
    this.assertFunctionalRef(input.search_plan_ref, 'search_plan_ref');
    this.assertFunctionalRef(input.literature_snapshot_ref, 'literature_snapshot_ref');
    if (input.readiness_assessment_ref) {
      this.assertFunctionalRef(input.readiness_assessment_ref, 'readiness_assessment_ref');
    }
    if (input.validation_support_packet_ref) {
      this.assertFunctionalRef(input.validation_support_packet_ref, 'validation_support_packet_ref');
    }
    if (!['mocked_llm', 'codex_assisted', 'provider_llm'].includes(input.execution_mode)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'execution_mode is invalid.');
    }
    this.assertSingleAgentExecutionSpec({
      execution_mode: input.execution_mode,
      execution_spec: input.execution_spec ?? null,
      model_option_id: input.model_option_id ?? null,
    });
    if (input.diagnostic_prompt_appendix?.trim() && (input.run_mode ?? 'acceptance') !== 'acceptance') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'diagnostic_prompt_appendix is allowed only in acceptance mode.');
    }
    if ((input.readiness_packet_mode ?? 'create_fresh') === 'consume_explicit_ref' && !input.readiness_assessment_ref) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'readiness_assessment_ref is required when consuming explicit readiness.');
    }
    if ((input.support_packet_mode ?? 'create_fresh') === 'consume_explicit_ref' && !input.validation_support_packet_ref) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'validation_support_packet_ref is required when consuming explicit support packet.');
    }
    this.assertNonEmpty(input.policy_version, 'policy_version');
    this.assertNonEmpty(input.output_schema_version, 'output_schema_version');
  }

  private assertValidateNeedCandidateLineage(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
    candidate: TopicSelectionNeedCandidateRecord,
  ): void {
    this.assertSameRefForValidateNeed(input.evidence_map_ref, candidate.evidence_map_ref, 'evidence_map_ref');
    this.assertSameRefForValidateNeed(input.search_run_ref, candidate.search_run_ref, 'search_run_ref');
    this.assertSameRefForValidateNeed(input.search_plan_ref, candidate.search_plan_ref, 'search_plan_ref');
    this.assertSameRefForValidateNeed(input.literature_snapshot_ref, candidate.literature_snapshot_ref, 'literature_snapshot_ref');
  }

  private assertValidateNeedReadinessLineage(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
    candidate: TopicSelectionNeedCandidateRecord,
    readiness: TopicSelectionNeedCandidateReadinessAssessmentRecord,
  ): void {
    if (readiness.need_candidate_id !== candidate.need_candidate_id || readiness.title_card_id !== input.title_card_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ReadinessAssessment lineage does not match NeedCandidate.');
    }
    this.assertSameRefForValidateNeed(input.evidence_map_ref, readiness.evidence_map_ref, 'readiness.evidence_map_ref');
    this.assertSameRefForValidateNeed(input.search_run_ref, readiness.search_run_ref, 'readiness.search_run_ref');
    this.assertSameRefForValidateNeed(input.search_plan_ref, readiness.search_plan_ref, 'readiness.search_plan_ref');
    this.assertSameRefForValidateNeed(input.literature_snapshot_ref, readiness.literature_snapshot_ref, 'readiness.literature_snapshot_ref');
  }

  private assertValidateNeedSupportPacketLineage(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
    candidate: TopicSelectionNeedCandidateRecord,
    readiness: TopicSelectionNeedCandidateReadinessAssessmentRecord,
    supportPacket: TopicSelectionValidationDecisionSupportPacketRecord,
  ): void {
    if (
      supportPacket.need_candidate_id !== candidate.need_candidate_id
      || supportPacket.title_card_id !== input.title_card_id
      || supportPacket.packet_status !== 'ready'
    ) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ValidationDecisionSupportPacket lineage does not match NeedCandidate.');
    }
    if (supportPacket.readiness_assessment_id !== readiness.readiness_assessment_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ValidationDecisionSupportPacket readiness lineage mismatch.');
    }
    this.assertSameRefForValidateNeed(
      this.ref('need_candidate', candidate.need_candidate_id, candidate.title_card_id, candidate.candidate_version),
      supportPacket.need_candidate_ref,
      'support_packet.need_candidate_ref',
    );
    this.assertSameRefForValidateNeed(input.evidence_map_ref, supportPacket.evidence_map_ref, 'support_packet.evidence_map_ref');
    this.assertSameRefForValidateNeed(input.search_run_ref, supportPacket.search_run_ref, 'support_packet.search_run_ref');
    this.assertSameRefForValidateNeed(input.search_plan_ref, supportPacket.search_plan_ref, 'support_packet.search_plan_ref');
    this.assertSameRefForValidateNeed(input.literature_snapshot_ref, supportPacket.literature_snapshot_ref, 'support_packet.literature_snapshot_ref');
  }

  private assertRecommendationPacketLineage(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
    candidate: TopicSelectionNeedCandidateRecord,
    readiness: TopicSelectionNeedCandidateReadinessAssessmentRecord,
    supportPacket: TopicSelectionValidationDecisionSupportPacketRecord,
    packet: TopicSelectionNeedAdjudicationRecommendationPacket,
  ): void {
    if (packet.workflow_run_id !== input.workflow_run_id || packet.node_attempt_id !== input.node_attempt_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Recommendation packet attempt identity mismatch.');
    }
    if (packet.execution_mode !== input.execution_mode) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Recommendation packet execution mode mismatch.');
    }
    const expectedProfileId = input.profile_id ?? TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID;
    if (packet.profile_id !== expectedProfileId) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Recommendation packet profile mismatch.');
    }
    if (packet.policy_version !== input.policy_version) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Recommendation packet policy version mismatch.');
    }
    if (packet.output_schema_version !== input.output_schema_version) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Recommendation packet output schema version mismatch.');
    }
    this.assertSameRefForValidateNeed(
      this.ref('need_candidate', candidate.need_candidate_id, candidate.title_card_id, candidate.candidate_version),
      packet.need_candidate_ref,
      'recommendation.need_candidate_ref',
    );
    this.assertSameRefForValidateNeed(
      this.ref('validation_decision_support_packet', supportPacket.validation_support_packet_id, supportPacket.title_card_id),
      packet.validation_support_packet_ref,
      'recommendation.validation_support_packet_ref',
    );
    if (packet.readiness_assessment_ref) {
      this.assertSameRefForValidateNeed(
        this.ref('need_candidate_readiness', readiness.readiness_assessment_id, readiness.title_card_id),
        packet.readiness_assessment_ref,
        'recommendation.readiness_assessment_ref',
      );
    }
  }

  private assertSameRefForValidateNeed(
    expected: TopicSelectionFunctionalRef,
    actual: TopicSelectionFunctionalRef,
    fieldName: string,
  ): void {
    if (!this.sameFunctionalRef(expected, actual) || (expected.title_card_id ?? null) !== (actual.title_card_id ?? null)) {
      throw new AppError(409, 'VERSION_CONFLICT', `${fieldName} lineage mismatch.`);
    }
  }

  private readinessBlockerCodes(recommendation: TopicSelectionNeedReadinessRecommendation): string[] {
    switch (recommendation) {
      case 'ready_for_validation':
        return [];
      case 'searchplan_recheck':
        return ['READINESS_SEARCHPLAN_RECHECK'];
      case 'needs_scope_revision':
        return ['READINESS_NEEDS_SCOPE_REVISION'];
      case 'evidence_gap':
        return ['READINESS_EVIDENCE_GAP'];
      case 'merge_required':
        return ['READINESS_MERGE_REQUIRED'];
      case 'reject':
        return ['READINESS_REJECT'];
      case 'park':
        return ['READINESS_PARK'];
    }
  }

  private hasHumanOrHybridAcceptance(input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput): boolean {
    return input.fixture_human_decision === true
      || input.adjudication_actor?.actor_type === 'human'
      || input.adjudication_actor?.actor_type === 'hybrid';
  }

  private adjudicationActorForRecommendation(
    input: TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
    decision: TopicSelectionNeedAdjudicationDecision,
  ): TopicSelectionActorRef {
    if (NEED_ADJUDICATION_HIGH_RISK_DECISIONS.has(decision)) {
      return input.adjudication_actor ?? { actor_type: 'human' };
    }
    return input.adjudication_actor ?? { actor_type: input.execution_mode === 'provider_llm' ? 'llm' : 'system' };
  }

  private routeOutcomeForAdjudicationDecision(
    decision: TopicSelectionNeedAdjudicationDecision,
  ): TopicSelectionValidateNeedAdjudicationRouteOutcome {
    switch (decision) {
      case 'validate':
        return 'advance_to_human_confirmation';
      case 'return_to_candidate':
        return 'repair_need_candidate';
      case 'request_searchplan_recheck':
        return 'repair_search_plan';
      case 'reject':
        return 'stop_rejected';
      case 'park':
        return 'hold_candidate';
      case 'merge':
        return 'stop_merged';
    }
  }

  private repairTargetForRouteOutcome(routeOutcome: TopicSelectionValidateNeedAdjudicationRouteOutcome): string | null {
    if (routeOutcome === 'repair_need_candidate') {
      return 'need_candidate';
    }
    if (routeOutcome === 'repair_search_plan') {
      return 'search_plan';
    }
    return null;
  }

  private buildEvidenceMapNodeInput(
    input: TopicSelectionWorkflowHarnessBuildEvidenceMapInput,
  ): TopicSelectionBuildEvidenceMapNodeInput {
    return {
      schema_version: TOPIC_SELECTION_BUILD_EVIDENCE_MAP_NODE_INPUT_SCHEMA_VERSION,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      title_card_ref: this.ref('title_card', input.title_card_id, input.title_card_id),
      search_run_handoff: input.search_run_handoff as unknown as Record<string, unknown>,
      extraction_context_packet_ref: input.extraction_context_packet_ref ?? null,
      extraction_context_packet: input.extraction_context_packet ?? null,
      extraction_draft: input.extraction_draft ?? null,
      execution_mode: input.execution_mode,
      profile_id: input.profile_id ?? TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
      revision_of_attempt_ref: input.revision_of_attempt_ref ?? null,
      review_package_ref: input.review_package_ref ?? null,
      operator_reuse_approval_ref: input.operator_reuse_approval_ref ?? null,
      policy_version: input.policy_version,
      output_schema_version: input.output_schema_version,
    };
  }

  private async resolveEvidenceMapExtractionDraft(
    input: TopicSelectionWorkflowHarnessBuildEvidenceMapInput,
    nodeInput: TopicSelectionBuildEvidenceMapNodeInput,
  ): Promise<TopicSelectionEvidenceMapExtractionResolution> {
    if (input.execution_mode === 'none') {
      return {
        draft: input.extraction_draft ?? null,
        agent_invocation_audit_ref: null,
        agent_invocation_status: 'not_invoked',
        context_compression_report_ref: null,
        warning_codes: [],
        blocker_codes: [],
        error_code: null,
      };
    }
    const agent = this.requiredEvidenceMapExtractionAgent();
    const runtimeBinding = this.v1aLlmRuntimeBindings.buildEvidenceExtractionBinding({
      title_card_id: input.title_card_id,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      scenario_id: input.scenario_id,
      scenario_case_id: input.scenario_case_id ?? null,
      execution_mode: input.execution_mode,
      profile_id: nodeInput.profile_id,
      policy_version: input.policy_version,
      output_schema_version: input.output_schema_version,
      node_input: nodeInput,
      search_run_handoff: input.search_run_handoff!,
      extraction_context_packet: input.extraction_context_packet!,
      extraction_context_packet_ref: input.extraction_context_packet_ref ?? null,
      runtime_token_budget_overrides: input.runtime_token_budget_overrides ?? null,
    });
    const compressionPrepared = await this.prepareEvidenceMapExtractionRuntimeBinding({
      input,
      nodeInput,
      runtimeBinding,
    });
    const result = await agent.invokeStructuredOutput<TopicSelectionEvidenceMapExtractionDraft>({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      node_id: BUILD_EVIDENCE_MAP_NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      execution_mode: input.execution_mode,
      execution_spec: input.execution_spec ?? null,
      executor_kind: input.executor_kind ?? 'single_agent',
      run_mode: input.run_mode ?? 'acceptance',
      profile_id: nodeInput.profile_id,
      output_contract: 'TopicSelectionEvidenceMapExtractionDraft@v1',
      model_option_id: input.model_option_id ?? null,
      prompt: compressionPrepared.runtimeBinding.prompt,
      prompt_variant_key: compressionPrepared.runtimeBinding.prompt_variant_key,
      schema_name: 'TopicSelectionEvidenceMapExtractionDraft@v1',
      schema: topicSelectionEvidenceMapExtractionDraftSchema as unknown as Record<string, unknown>,
      messages: compressionPrepared.runtimeBinding.messages,
      input_refs: compressionPrepared.runtimeBinding.input_refs,
      context_packet_refs: compressionPrepared.runtimeBinding.context_packet_refs,
      context_packet_hashes: compressionPrepared.runtimeBinding.context_packet_hashes,
      runtime_token_budget: compressionPrepared.runtimeBinding.runtime_token_budget,
      mocked_output: input.mocked_output ?? null,
      codex_response: input.codex_response ?? null,
      created_by: input.created_by ?? 'system',
    });
    return {
      draft: result.status === 'succeeded' ? result.structured_output : null,
      agent_invocation_audit_ref: result.audit_artifact_ref ?? null,
      agent_invocation_status: result.status === 'succeeded' ? 'succeeded' : 'blocked',
      context_compression_report_ref: compressionPrepared.contextCompressionReportRef,
      warning_codes: this.uniqueStrings([
        ...result.warning_codes,
        ...compressionPrepared.warningCodes,
      ]),
      blocker_codes: this.uniqueStrings([
        ...result.blocker_codes,
        ...compressionPrepared.blockerCodes,
      ]),
      error_code: compressionPrepared.errorCode ?? result.error_code ?? null,
    };
  }

  private async prepareEvidenceMapExtractionRuntimeBinding(input: {
    input: TopicSelectionWorkflowHarnessBuildEvidenceMapInput;
    nodeInput: TopicSelectionBuildEvidenceMapNodeInput;
    runtimeBinding: TopicSelectionV1aLlmRuntimeInvocationBinding;
  }): Promise<{
    runtimeBinding: TopicSelectionV1aLlmRuntimeInvocationBinding;
    contextCompressionReportRef: TopicSelectionFunctionalRef | null;
    warningCodes: string[];
    blockerCodes: string[];
    errorCode: string | null;
  }> {
    const overrides = input.input.runtime_token_budget_overrides ?? null;
    const preflight = this.tokenBudgetGate.evaluate({
      context_policy_profile: input.runtimeBinding.runtime_token_budget.context_policy_profile,
      messages: input.runtimeBinding.messages,
      context_payloads: input.runtimeBinding.runtime_token_budget.context_payloads ?? [],
      schema: topicSelectionEvidenceMapExtractionDraftSchema as unknown as Record<string, unknown>,
      extra_payloads: input.runtimeBinding.runtime_token_budget.extra_payloads ?? [],
      compression_already_applied: overrides?.compression_already_applied ?? false,
      estimated_input_tokens_override: overrides?.estimated_input_tokens_override,
      schema_overhead_tokens_override: overrides?.schema_overhead_tokens_override,
    });
    if (
      preflight.result.decision !== 'requires_compression'
      || overrides?.compression_already_applied === true
    ) {
      return {
        runtimeBinding: input.runtimeBinding,
        contextCompressionReportRef: null,
        warningCodes: [],
        blockerCodes: [],
        errorCode: null,
      };
    }

    const compressionPlan = this.v1aLlmRuntimeBindings.buildEvidenceExtractionCompressionPlan({
      title_card_id: input.input.title_card_id,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      scenario_id: input.input.scenario_id,
      scenario_case_id: input.input.scenario_case_id ?? null,
      execution_mode: input.input.execution_mode as TopicSelectionAgentExecutionMode,
      profile_id: input.nodeInput.profile_id,
      policy_version: input.input.policy_version,
      output_schema_version: input.input.output_schema_version,
      node_input: input.nodeInput,
      search_run_handoff: input.input.search_run_handoff!,
      extraction_context_packet: input.input.extraction_context_packet!,
      extraction_context_packet_ref: input.input.extraction_context_packet_ref ?? null,
      runtime_token_budget_overrides: overrides,
    });
    const compression = await this.recordEvidenceMapExtractionCompressionReport({
      input: input.input,
      runtimeBinding: input.runtimeBinding,
      compressionPlan,
      estimatedInputTokensBefore: preflight.result.estimated_input_tokens,
      estimatedInputTokensAfter:
        overrides?.estimated_input_tokens_after_compression_override,
    });
    const compressionIdentity = {
      compression_report_ref: compression.artifactRef,
      compression_report_hash: compression.artifactHash,
      compressed_context_hash: compression.result.report.compressed_context_hash,
      compression_already_applied: true,
    };
    const compressionWarningCodes = this.uniqueStrings([
      ...preflight.result.warning_codes,
      ...compression.result.warning_codes,
      'COMPRESSION_REPORT_RECORDED',
    ]);
    if (compression.result.quality_gate_result === 'blocked') {
      return {
        runtimeBinding: this.v1aLlmRuntimeBindings.buildEvidenceExtractionBinding({
          title_card_id: input.input.title_card_id,
          workflow_run_id: input.input.workflow_run_id,
          node_attempt_id: input.input.node_attempt_id,
          scenario_id: input.input.scenario_id,
          scenario_case_id: input.input.scenario_case_id ?? null,
          execution_mode: input.input.execution_mode as TopicSelectionAgentExecutionMode,
          profile_id: input.nodeInput.profile_id,
          policy_version: input.input.policy_version,
          output_schema_version: input.input.output_schema_version,
          node_input: input.nodeInput,
          search_run_handoff: input.input.search_run_handoff!,
          extraction_context_packet: input.input.extraction_context_packet!,
          extraction_context_packet_ref: input.input.extraction_context_packet_ref ?? null,
          runtime_token_budget_overrides: {
            ...overrides,
            estimated_input_tokens_after_compression_override:
              preflight.result.estimated_input_tokens,
          },
          runtime_compression: compressionIdentity,
        }),
        contextCompressionReportRef: compression.artifactRef,
        warningCodes: compressionWarningCodes,
        blockerCodes: this.uniqueStrings([
          'COMPRESSION_QUALITY_GATE_BLOCKED',
          ...compression.result.blocker_codes,
        ]),
        errorCode: 'COMPRESSION_QUALITY_GATE_BLOCKED',
      };
    }

    return {
      runtimeBinding: this.v1aLlmRuntimeBindings.buildEvidenceExtractionBinding({
        title_card_id: input.input.title_card_id,
        workflow_run_id: input.input.workflow_run_id,
        node_attempt_id: input.input.node_attempt_id,
        scenario_id: input.input.scenario_id,
        scenario_case_id: input.input.scenario_case_id ?? null,
        execution_mode: input.input.execution_mode as TopicSelectionAgentExecutionMode,
        profile_id: input.nodeInput.profile_id,
        policy_version: input.input.policy_version,
        output_schema_version: input.input.output_schema_version,
        node_input: input.nodeInput,
        search_run_handoff: input.input.search_run_handoff!,
        extraction_context_packet: input.input.extraction_context_packet!,
        extraction_context_packet_ref: input.input.extraction_context_packet_ref ?? null,
        compressed_context: compressionPlan.compressed_context,
        runtime_token_budget_overrides: overrides,
        runtime_compression: compressionIdentity,
      }),
      contextCompressionReportRef: compression.artifactRef,
      warningCodes: compressionWarningCodes,
      blockerCodes: [],
      errorCode: null,
    };
  }

  private async recordEvidenceMapExtractionCompressionReport(input: {
    input: TopicSelectionWorkflowHarnessBuildEvidenceMapInput;
    runtimeBinding: TopicSelectionV1aLlmRuntimeInvocationBinding;
    compressionPlan: TopicSelectionV1aEvidenceExtractionCompressionPlan;
    estimatedInputTokensBefore: number | null;
    estimatedInputTokensAfter?: number | null;
  }): Promise<{
    artifactRef: TopicSelectionFunctionalRef;
    artifactHash: string;
    result: TopicSelectionCompressionReportRuntimeResult;
  }> {
    const result = this.compressionRuntime.createReport({
      context_policy_profile: input.runtimeBinding.runtime_token_budget.context_policy_profile,
      context_policy_profile_hash: input.runtimeBinding.runtime_token_budget.context_policy_profile_hash,
      compression_report_ref: input.compressionPlan.compression_report_ref,
      source_refs: input.compressionPlan.source_refs,
      input_context: input.compressionPlan.input_context,
      compressed_context: input.compressionPlan.compressed_context,
      summary: input.compressionPlan.summary,
      compression_executor_kind: 'deterministic_structural',
      required_preserved_facts: input.compressionPlan.fact_inventory,
      compressed_preserved_facts: input.compressionPlan.fact_inventory,
      redaction_policy: input.runtimeBinding.runtime_token_budget.context_policy_profile.redaction_policy,
      estimated_input_tokens_before_override: input.estimatedInputTokensBefore,
      estimated_input_tokens_after_override: input.estimatedInputTokensAfter,
    });
    const payload = {
      schema_version: 'v1',
      node_id: BUILD_EVIDENCE_MAP_NODE_ID,
      artifact_key: 'context_compression_report',
      payload_schema: 'TopicSelectionCompressionReportEnvelope@v1',
      redaction_policy: input.runtimeBinding.runtime_token_budget.context_policy_profile.redaction_policy,
      report: result.report,
      compressed_context: input.compressionPlan.compressed_context,
    };
    const artifact = await this.requiredControlPlane().recordArtifactRef({
      workspace_id: input.input.workspace_id ?? null,
      title_card_id: input.input.title_card_id,
      artifact_kind: 'diagnostic',
      storage_kind: 'inline',
      payload,
      workflow_run_id: input.input.workflow_run_id,
      created_by: input.input.created_by ?? 'system',
    });
    return {
      artifactRef: this.ref(
        'artifact_ref',
        artifact.artifact_ref_id,
        artifact.title_card_id ?? input.input.title_card_id,
      ),
      artifactHash: artifact.checksum ?? this.hash(payload),
      result,
    };
  }

  private evidenceMapReviewPackage(input: {
    input: TopicSelectionWorkflowHarnessBuildEvidenceMapInput;
    report: TopicSelectionEvidenceMapMaterializationReport;
    materializationReportRef: TopicSelectionFunctionalRef;
    draftHash: string;
  }): TopicSelectionEvidenceMapExtractionReviewPackage {
    return {
      schema_version: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_REVIEW_PACKAGE_SCHEMA_VERSION,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      review_package_ref: this.ref('evidence_map_review_package', input.input.node_attempt_id, input.input.title_card_id),
      materialization_report_ref: input.materializationReportRef,
      materialization_report_hash: this.hash(input.report),
      extraction_context_packet_ref: input.input.extraction_context_packet_ref ?? null,
      extraction_context_packet_hash: input.input.extraction_context_packet
        ? this.hash(input.input.extraction_context_packet)
        : null,
      draft_ref: null,
      draft_hash: input.draftHash,
      ambiguous_unit_keys: Object.keys(input.report.rejection_reasons_by_client_unit_key).sort(),
      review_codes: input.report.review_codes,
      accepted_draft_ref_summary: {
        accepted_unit_count: input.report.accepted_unit_count,
      },
      rejected_draft_ref_summary: {
        rejected_unit_count: input.report.rejected_unit_count,
        reasons: input.report.rejection_reasons_by_client_unit_key,
      },
      required_revision_actions: input.report.review_codes.length > 0
        ? ['submit_full_revised_evidence_map_extraction_draft']
        : [],
      allowed_revision_producers: ['human', 'codex_assisted', 'provider_llm'],
      policy_version: input.input.policy_version,
      output_schema_version: input.input.output_schema_version,
      execution_mode: input.input.execution_mode,
      profile_id: input.input.profile_id ?? TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
    };
  }

  private evidenceMapHandoff(input: {
    input: TopicSelectionWorkflowHarnessBuildEvidenceMapInput;
    records: TopicSelectionEvidenceMapCreateRecords;
    evidenceMapRef: TopicSelectionFunctionalRef;
    materializationReport: TopicSelectionEvidenceMapMaterializationReport;
    materializationReportRef: TopicSelectionFunctionalRef;
    materializationReportHash: string;
  }): TopicSelectionEvidenceMapHandoff {
    const issueSummary = this.issueSummary(input.records);
    const warningCodes = this.uniqueStrings([
      ...input.records.evidence_units.flatMap((unit) => unit.issue_codes),
      ...input.materializationReport.warning_codes,
    ]);
    return {
      schema_version: TOPIC_SELECTION_EVIDENCE_MAP_HANDOFF_SCHEMA_VERSION,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      handoff_ref: this.ref('workflow_handoff', `${input.input.node_attempt_id}_evidence_map`, input.input.title_card_id),
      title_card_ref: this.ref('title_card', input.input.title_card_id, input.input.title_card_id),
      evidence_map_ref: input.evidenceMapRef,
      search_run_ref: input.records.evidence_map.search_run_ref,
      search_plan_ref: input.records.evidence_map.search_plan_ref,
      literature_resource_pool_snapshot_ref: input.records.evidence_map.literature_snapshot_ref,
      materialization_report_ref: input.materializationReportRef,
      materialization_report_hash: input.materializationReportHash,
      need_validation_evidence_bundle_ref: null,
      evidence_unit_count: input.records.evidence_units.length,
      role_counts: {
        support: input.records.evidence_map.support_unit_count,
        challenge: input.records.evidence_map.challenge_unit_count,
        baseline: input.records.evidence_map.baseline_unit_count,
        context: input.records.evidence_map.context_unit_count,
      },
      abstract_only_support_count: input.records.evidence_units
        .filter((unit) => unit.evidence_role === 'support' && unit.abstract_only)
        .length,
      warning_summary: {
        warning_codes: warningCodes,
      },
      issue_summary: issueSummary,
      source_refs_hash: this.hash(input.records.evidence_units.flatMap((unit) => unit.source_refs)),
      method_family_targets: input.input.search_run_handoff?.method_family_targets ?? [],
      policy_version: input.input.policy_version,
      output_schema_version: input.input.output_schema_version,
    };
  }

  private issueSummary(records: TopicSelectionEvidenceMapCreateRecords): Record<string, unknown> {
    const counts: Record<string, number> = {};
    for (const code of records.evidence_units.flatMap((unit) => unit.issue_codes)) {
      counts[code] = (counts[code] ?? 0) + 1;
    }
    return counts;
  }

  private evidenceMapAuditRefs(records: TopicSelectionEvidenceMapCreateRecords): TopicSelectionFunctionalRef[] {
    const map = records.evidence_map;
    return this.uniqueRefs([
      map.input_snapshot_id ? this.ref('input_snapshot', map.input_snapshot_id, map.title_card_id) : null,
      map.workflow_run_id ? this.ref('workflow_run', map.workflow_run_id, map.title_card_id) : null,
      map.gate_result_id ? this.ref('readiness_gate_result', map.gate_result_id, map.title_card_id) : null,
      map.transition_attempt_id
        ? this.ref('chain_transition_attempt', map.transition_attempt_id, map.title_card_id)
        : null,
      map.trace_snapshot_id ? this.ref('trace_snapshot', map.trace_snapshot_id, map.title_card_id) : null,
    ]);
  }

  private evaluateBuildEvidenceMapAssertions(
    input: TopicSelectionWorkflowHarnessBuildEvidenceMapInput,
    nodeResult: TopicSelectionWorkflowHarnessBuildEvidenceMapNodeResult,
  ): TopicSelectionWorkflowHarnessAssertion[] {
    const expectations = input.expectations ?? {};
    const assertions: TopicSelectionWorkflowHarnessAssertion[] = [
      this.assertion(
        'expected_node_status',
        expectations.status ? nodeResult.status === expectations.status : nodeResult.status === 'succeeded',
        'EvidenceMap node status must match scenario expectation.',
        expectations.status ?? 'succeeded',
        nodeResult.status,
      ),
      this.assertion(
        'no_multi_agent_debate',
        true,
        'Build EvidenceMap may use single-agent extraction but never invokes multi-agent debate runtime.',
        'not_allowed',
        'not_allowed',
      ),
    ];
    if (expectations.materialization_status) {
      assertions.push(this.assertion(
        'expected_materialization_status',
        nodeResult.materialization_report.status === expectations.materialization_status,
        'EvidenceMap materialization status must match scenario expectation.',
        expectations.materialization_status,
        nodeResult.materialization_report.status,
      ));
    }
    if (nodeResult.status === 'succeeded') {
      assertions.push(
        this.assertion(
          'authority_refs_created',
          Boolean(nodeResult.evidence_map_ref) && nodeResult.evidence_unit_refs.length > 0,
          'Successful EvidenceMap scenario must expose EvidenceMap and EvidenceUnit authority refs.',
          'authority_refs',
          nodeResult.authority_refs,
        ),
        this.assertion(
          'downstream_handoff_created',
          Boolean(nodeResult.downstream_handoff),
          'Successful EvidenceMap scenario must expose a Node 6 handoff.',
          'handoff',
          nodeResult.downstream_handoff,
        ),
      );
    } else {
      assertions.push(this.assertion(
        'blocked_or_review_without_authority',
        nodeResult.authority_refs.length === 0
          && nodeResult.evidence_map_ref === null
          && nodeResult.downstream_handoff === null,
        'Blocked/review-required EvidenceMap scenario must not create authority or Node 6 handoff.',
        0,
        nodeResult.authority_refs.length,
      ));
    }
    if (expectations.error_code !== undefined) {
      assertions.push(this.assertion(
        'expected_error_code',
        nodeResult.error_code === expectations.error_code,
        'EvidenceMap node error code must match scenario expectation.',
        expectations.error_code,
        nodeResult.error_code,
      ));
    }
    if (expectations.blocker_codes) {
      const missing = expectations.blocker_codes.filter((code) => !nodeResult.blocker_codes.includes(code));
      assertions.push(this.assertion(
        'expected_blocker_codes',
        missing.length === 0,
        'EvidenceMap blocker codes must include expected scenario blockers.',
        expectations.blocker_codes,
        nodeResult.blocker_codes,
      ));
    }
    if (expectations.warning_codes) {
      const missing = expectations.warning_codes.filter((code) => !nodeResult.warning_codes.includes(code));
      assertions.push(this.assertion(
        'expected_warning_codes',
        missing.length === 0,
        'EvidenceMap warning codes must include expected scenario warnings.',
        expectations.warning_codes,
        nodeResult.warning_codes,
      ));
    }
    if (expectations.evidence_unit_count !== undefined && expectations.evidence_unit_count !== null) {
      assertions.push(this.assertion(
        'expected_evidence_unit_count',
        nodeResult.evidence_unit_refs.length === expectations.evidence_unit_count,
        'EvidenceUnit count must match scenario expectation.',
        expectations.evidence_unit_count,
        nodeResult.evidence_unit_refs.length,
      ));
    }
    if (expectations.downstream_handoff_present !== undefined && expectations.downstream_handoff_present !== null) {
      assertions.push(this.assertion(
        'expected_downstream_handoff_presence',
        Boolean(nodeResult.downstream_handoff) === expectations.downstream_handoff_present,
        'EvidenceMap downstream handoff presence must match scenario expectation.',
        expectations.downstream_handoff_present,
        Boolean(nodeResult.downstream_handoff),
      ));
    }
    return assertions;
  }

  private createBuildEvidenceMapTraceSnapshot(input: {
    input: TopicSelectionWorkflowHarnessBuildEvidenceMapInput;
    nodeInput: TopicSelectionBuildEvidenceMapNodeInput;
    nodeResult: TopicSelectionWorkflowHarnessBuildEvidenceMapNodeResult;
    assertions: TopicSelectionWorkflowHarnessAssertion[];
    scenarioStatus: 'passed' | 'failed';
  }): TopicSelectionWorkflowHarnessBuildEvidenceMapTraceSnapshot {
    return {
      schema_version: 'topic-selection-workflow-harness-trace-v1',
      payload_schema: EVIDENCE_MAP_TRACE_PAYLOAD_SCHEMA,
      scenario_id: input.input.scenario_id,
      scenario_case_id: input.input.scenario_case_id ?? null,
      node_id: BUILD_EVIDENCE_MAP_NODE_ID,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      scenario_status: input.scenarioStatus,
      node_status: input.nodeResult.status,
      node_input: input.nodeInput,
      node_result: input.nodeResult,
      materialization_report: input.nodeResult.materialization_report,
      review_package: input.nodeResult.review_package,
      downstream_handoff: input.nodeResult.downstream_handoff,
      authority_refs: input.nodeResult.authority_refs,
      audit_refs: input.nodeResult.audit_refs,
      artifact_refs: input.nodeResult.artifact_refs,
      warning_codes: input.nodeResult.warning_codes,
      blocker_codes: input.nodeResult.blocker_codes,
      assertions: input.assertions,
      created_at: this.now(),
    };
  }

  private createTopicSeedNodeInput(
    input: TopicSelectionWorkflowHarnessCreateTopicSeedInput,
  ): TopicSelectionWorkflowHarnessCreateTopicSeedNodeInput {
    return {
      schema_version: input.output_schema_version,
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      seed_version: input.seed_version ?? null,
      intent_summary: input.intent_summary ?? null,
      scope_notes: input.scope_notes ?? null,
      intent_preparation_refs: input.intent_preparation_refs ?? [],
      policy_version_id: input.policy_version,
      created_by: input.created_by ?? 'system',
    };
  }

  private evaluateCreateTopicSeedAssertions(
    input: TopicSelectionWorkflowHarnessCreateTopicSeedInput,
    nodeResult: TopicSelectionWorkflowHarnessCreateTopicSeedNodeResult,
  ): TopicSelectionWorkflowHarnessAssertion[] {
    const expectations = input.expectations ?? {};
    const assertions: TopicSelectionWorkflowHarnessAssertion[] = [
      this.assertion(
        'expected_node_status',
        expectations.status ? nodeResult.status === expectations.status : nodeResult.status === 'succeeded',
        'TopicSeed node status must match scenario expectation.',
        expectations.status ?? 'succeeded',
        nodeResult.status,
      ),
      this.assertion(
        'no_model_execution',
        true,
        'Create TopicSeed is deterministic and never invokes AgentOrchestrator, provider, Codex, or debate runtime.',
        'none',
        'none',
      ),
    ];

    if (nodeResult.status === 'succeeded') {
      const topicSeed = nodeResult.topic_seed;
      assertions.push(
        this.assertion(
          'authority_ref_created',
          Boolean(nodeResult.topic_seed_ref && nodeResult.authority_refs.length === 1),
          'Successful TopicSeed scenario must expose exactly one TopicSeed authority ref.',
          1,
          nodeResult.authority_refs.length,
        ),
        this.assertion(
          'title_card_id_propagated',
          topicSeed?.title_card_id === input.title_card_id,
          'TopicSeed must belong to the scenario title card.',
          input.title_card_id,
          topicSeed?.title_card_id ?? null,
        ),
        this.assertion(
          'seed_kind_fixed',
          topicSeed?.seed_kind === 'title_card',
          'TopicSeed created by this node must use seed_kind title_card.',
          'title_card',
          topicSeed?.seed_kind ?? null,
        ),
        this.assertion(
          'source_title_card_ref_propagated',
          topicSeed?.source_title_card_ref.ref_type === 'title_card'
            && topicSeed.source_title_card_ref.ref_id === input.title_card_id,
          'TopicSeed must trace to the source TitleCard ref.',
          input.title_card_id,
          topicSeed?.source_title_card_ref.ref_id ?? null,
        ),
        this.assertion(
          'control_plane_refs_created',
          Boolean(topicSeed?.input_snapshot_id && topicSeed.gate_result_id && topicSeed.transition_attempt_id),
          'TopicSeed creation must produce input snapshot, gate result, and transition attempt refs.',
          ['input_snapshot_id', 'gate_result_id', 'transition_attempt_id'],
          {
            input_snapshot_id: topicSeed?.input_snapshot_id ?? null,
            gate_result_id: topicSeed?.gate_result_id ?? null,
            transition_attempt_id: topicSeed?.transition_attempt_id ?? null,
          },
        ),
      );
    } else {
      assertions.push(this.assertion(
        'blocked_without_authority',
        nodeResult.authority_refs.length === 0 && nodeResult.topic_seed === null,
        'Blocked TopicSeed scenario must not create authority refs.',
        0,
        nodeResult.authority_refs.length,
      ));
    }

    if (expectations.error_code !== undefined) {
      assertions.push(this.assertion(
        'expected_error_code',
        nodeResult.error_code === expectations.error_code,
        'TopicSeed node error code must match scenario expectation.',
        expectations.error_code,
        nodeResult.error_code,
      ));
    }
    if (expectations.seed_version !== undefined && expectations.seed_version !== null) {
      assertions.push(this.assertion(
        'expected_seed_version',
        nodeResult.topic_seed?.seed_version === expectations.seed_version,
        'TopicSeed version must match scenario expectation.',
        expectations.seed_version,
        nodeResult.topic_seed?.seed_version ?? null,
      ));
    }
    if (expectations.intent_summary !== undefined && expectations.intent_summary !== null) {
      assertions.push(this.assertion(
        'expected_intent_summary',
        nodeResult.topic_seed?.intent_summary === expectations.intent_summary,
        'TopicSeed intent summary must match scenario expectation.',
        expectations.intent_summary,
        nodeResult.topic_seed?.intent_summary ?? null,
      ));
    }
    return assertions;
  }

  private createTopicSeedTraceSnapshot(input: {
    input: TopicSelectionWorkflowHarnessCreateTopicSeedInput;
    nodeInput: TopicSelectionWorkflowHarnessCreateTopicSeedNodeInput;
    inputHash: string;
    nodeResult: TopicSelectionWorkflowHarnessCreateTopicSeedNodeResult;
    assertions: TopicSelectionWorkflowHarnessAssertion[];
    scenarioStatus: 'passed' | 'failed';
  }): TopicSelectionWorkflowHarnessCreateTopicSeedTraceSnapshot {
    return {
      schema_version: 'topic-selection-workflow-harness-trace-v1',
      payload_schema: TOPIC_SEED_TRACE_PAYLOAD_SCHEMA,
      scenario_id: input.input.scenario_id,
      scenario_case_id: input.input.scenario_case_id ?? null,
      node_id: CREATE_TOPIC_SEED_NODE_ID,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      input_hash: input.inputHash,
      scenario_status: input.scenarioStatus,
      node_status: input.nodeResult.status,
      node_input: input.nodeInput,
      node_result: input.nodeResult,
      authority_refs: input.nodeResult.authority_refs,
      audit_refs: input.nodeResult.audit_refs,
      artifact_refs: input.nodeResult.artifact_refs,
      warning_codes: input.nodeResult.warning_codes,
      blocker_codes: input.nodeResult.blocker_codes,
      assertions: input.assertions,
      created_at: this.now(),
    };
  }

  private snapshotLiteratureResourcePoolNodeInput(
    input: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolInput,
  ): TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeInput {
    return {
      schema_version: input.output_schema_version,
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      topic_seed_ref: input.topic_seed_ref,
      source_scope: input.source_scope,
      resource_sample_set_provenance_ref: input.resource_sample_set_provenance_ref ?? null,
      policy_version_id: input.policy_version,
      created_by: input.created_by ?? 'system',
    };
  }

  private evaluateSnapshotLiteratureResourcePoolAssertions(
    input: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolInput,
    nodeResult: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeResult,
  ): TopicSelectionWorkflowHarnessAssertion[] {
    const expectations = input.expectations ?? {};
    const assertions: TopicSelectionWorkflowHarnessAssertion[] = [
      this.assertion(
        'expected_node_status',
        expectations.status ? nodeResult.status === expectations.status : nodeResult.status === 'succeeded',
        'LiteratureResourcePoolSnapshot node status must match scenario expectation.',
        expectations.status ?? 'succeeded',
        nodeResult.status,
      ),
      this.assertion(
        'no_model_execution',
        true,
        'Snapshot LiteratureResourcePool is deterministic and never invokes AgentOrchestrator, provider, Codex, or debate runtime.',
        'none',
        'none',
      ),
    ];

    if (nodeResult.status === 'succeeded') {
      const snapshot = nodeResult.literature_resource_pool_snapshot;
      assertions.push(
        this.assertion(
          'authority_ref_created',
          Boolean(nodeResult.literature_resource_pool_snapshot_ref && nodeResult.authority_refs.length === 1),
          'Successful LiteratureResourcePoolSnapshot scenario must expose exactly one snapshot authority ref.',
          1,
          nodeResult.authority_refs.length,
        ),
        this.assertion(
          'source_scope_normalized',
          snapshot?.source_scope === NORMALIZED_LITERATURE_RESOURCE_POOL_SOURCE_SCOPE,
          'Normalized harness path only supports title_card_evidence_basket source scope.',
          NORMALIZED_LITERATURE_RESOURCE_POOL_SOURCE_SCOPE,
          snapshot?.source_scope ?? null,
        ),
        this.assertion(
          'title_card_id_propagated',
          snapshot?.title_card_id === input.title_card_id,
          'LiteratureResourcePoolSnapshot must belong to the scenario title card.',
          input.title_card_id,
          snapshot?.title_card_id ?? null,
        ),
        this.assertion(
          'topic_seed_ref_propagated',
          snapshot?.topic_seed_ref.ref_id === input.topic_seed_ref.ref_id,
          'LiteratureResourcePoolSnapshot must trace to the scenario TopicSeed ref.',
          input.topic_seed_ref.ref_id,
          snapshot?.topic_seed_ref.ref_id ?? null,
        ),
        this.assertion(
          'control_plane_refs_created',
          Boolean(snapshot?.input_snapshot_id && snapshot.gate_result_id && snapshot.transition_attempt_id),
          'LiteratureResourcePoolSnapshot creation must produce input snapshot, gate result, and transition attempt refs.',
          ['input_snapshot_id', 'gate_result_id', 'transition_attempt_id'],
          {
            input_snapshot_id: snapshot?.input_snapshot_id ?? null,
            gate_result_id: snapshot?.gate_result_id ?? null,
            transition_attempt_id: snapshot?.transition_attempt_id ?? null,
          },
        ),
        this.assertion(
          'downstream_handoff_created',
          Boolean(nodeResult.downstream_handoff?.literature_resource_pool_snapshot_ref),
          'Successful LiteratureResourcePoolSnapshot scenario must expose a SearchPlan handoff packet.',
          'handoff',
          nodeResult.downstream_handoff,
        ),
      );
    } else {
      assertions.push(this.assertion(
        'blocked_without_authority',
        nodeResult.authority_refs.length === 0 && nodeResult.literature_resource_pool_snapshot === null,
        'Blocked LiteratureResourcePoolSnapshot scenario must not create authority refs.',
        0,
        nodeResult.authority_refs.length,
      ));
    }

    if (expectations.error_code !== undefined) {
      assertions.push(this.assertion(
        'expected_error_code',
        nodeResult.error_code === expectations.error_code,
        'LiteratureResourcePoolSnapshot node error code must match scenario expectation.',
        expectations.error_code,
        nodeResult.error_code,
      ));
    }
    if (expectations.snapshot_hash !== undefined && expectations.snapshot_hash !== null) {
      assertions.push(this.assertion(
        'expected_snapshot_hash',
        nodeResult.snapshot_hash === expectations.snapshot_hash,
        'LiteratureResourcePoolSnapshot hash must match scenario expectation.',
        expectations.snapshot_hash,
        nodeResult.snapshot_hash,
      ));
    }
    if (expectations.included_literature_count !== undefined && expectations.included_literature_count !== null) {
      assertions.push(this.assertion(
        'expected_included_literature_count',
        nodeResult.included_literature_refs.length === expectations.included_literature_count,
        'Included literature count must match scenario expectation.',
        expectations.included_literature_count,
        nodeResult.included_literature_refs.length,
      ));
    }
    if (expectations.content_source_count !== undefined && expectations.content_source_count !== null) {
      assertions.push(this.assertion(
        'expected_content_source_count',
        nodeResult.content_source_refs.length === expectations.content_source_count,
        'Content source count must match scenario expectation.',
        expectations.content_source_count,
        nodeResult.content_source_refs.length,
      ));
    }
    if (expectations.blocker_codes) {
      const missing = expectations.blocker_codes.filter((code) => !nodeResult.blocker_codes.includes(code));
      assertions.push(this.assertion(
        'expected_blocker_codes',
        missing.length === 0,
        'LiteratureResourcePoolSnapshot blocker codes must include expected scenario blockers.',
        expectations.blocker_codes,
        nodeResult.blocker_codes,
      ));
    }
    if (expectations.warning_codes) {
      const missing = expectations.warning_codes.filter((code) => !nodeResult.warning_codes.includes(code));
      assertions.push(this.assertion(
        'expected_warning_codes',
        missing.length === 0,
        'LiteratureResourcePoolSnapshot warning codes must include expected scenario warnings.',
        expectations.warning_codes,
        nodeResult.warning_codes,
      ));
    }
    return assertions;
  }

  private createSnapshotLiteratureResourcePoolTraceSnapshot(input: {
    input: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolInput;
    nodeInput: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeInput;
    inputHash: string;
    nodeResult: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolNodeResult;
    assertions: TopicSelectionWorkflowHarnessAssertion[];
    scenarioStatus: 'passed' | 'failed';
  }): TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolTraceSnapshot {
    return {
      schema_version: 'topic-selection-workflow-harness-trace-v1',
      payload_schema: LITERATURE_RESOURCE_POOL_TRACE_PAYLOAD_SCHEMA,
      scenario_id: input.input.scenario_id,
      scenario_case_id: input.input.scenario_case_id ?? null,
      node_id: SNAPSHOT_LITERATURE_RESOURCE_POOL_NODE_ID,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      input_hash: input.inputHash,
      scenario_status: input.scenarioStatus,
      node_status: input.nodeResult.status,
      node_input: input.nodeInput,
      node_result: input.nodeResult,
      snapshot_hash: input.nodeResult.snapshot_hash,
      source_health_summary: input.nodeResult.source_health_summary,
      authority_refs: input.nodeResult.authority_refs,
      audit_refs: input.nodeResult.audit_refs,
      artifact_refs: input.nodeResult.artifact_refs,
      warning_codes: input.nodeResult.warning_codes,
      blocker_codes: input.nodeResult.blocker_codes,
      assertions: input.assertions,
      created_at: this.now(),
    };
  }

  private createSearchPlanNodeInput(
    input: TopicSelectionWorkflowHarnessCreateSearchPlanInput,
  ): TopicSelectionWorkflowHarnessCreateSearchPlanNodeInput {
    return {
      schema_version: input.blueprint?.output_schema_version ?? 'v1',
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      blueprint: input.blueprint ?? null,
      created_by: input.created_by ?? 'system',
    };
  }

  private async validateCreateSearchPlanBlueprint(
    input: TopicSelectionWorkflowHarnessCreateSearchPlanInput,
  ): Promise<TopicSelectionCreateSearchPlanValidationResult> {
    const blueprint = input.blueprint;
    if (!blueprint) {
      return this.blockedSearchPlanValidation(
        'INVALID_PAYLOAD',
        'SearchPlan blueprint is required for normalized Node 3 execution.',
        ['MISSING_SEARCH_PLAN_BLUEPRINT'],
      );
    }
    if (!this.isSearchPlanBlueprintOrigin(blueprint.blueprint_origin)) {
      return this.blockedSearchPlanValidation(
        'INVALID_PAYLOAD',
        'SearchPlan blueprint origin is invalid.',
        ['MALFORMED_SEARCH_PLAN_BLUEPRINT'],
      );
    }
    if (blueprint.schema_version !== TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_SCHEMA_VERSION
      || !this.hasNonEmptyString(blueprint.expected_snapshot_hash)
      || !this.hasNonEmptyString(blueprint.policy_version)
      || !this.hasNonEmptyString(blueprint.output_schema_version)) {
      return this.blockedSearchPlanValidation(
        'INVALID_PAYLOAD',
        'SearchPlan blueprint requires schema, snapshot hash, policy, and output schema versions.',
        ['MALFORMED_SEARCH_PLAN_BLUEPRINT'],
      );
    }
    if (!Object.prototype.hasOwnProperty.call(blueprint, 'plan_version')
      || (blueprint.plan_version !== null && !this.hasNonEmptyString(blueprint.plan_version))) {
      return this.blockedSearchPlanValidation(
        'INVALID_PAYLOAD',
        'SearchPlan blueprint plan_version must be present as a non-empty string or null.',
        ['MALFORMED_SEARCH_PLAN_BLUEPRINT'],
      );
    }
    if (!this.isFunctionalRef(blueprint.title_card_ref)
      || blueprint.title_card_ref.ref_type !== 'title_card'
      || blueprint.title_card_ref.ref_id !== input.title_card_id) {
      return this.blockedSearchPlanValidation(
        'VERSION_CONFLICT',
        'SearchPlan blueprint title_card_ref must match the scenario title card.',
        ['TITLE_CARD_REF_MISMATCH'],
      );
    }
    const refValidation = this.validateConcreteSearchPlanRefs(blueprint, input.title_card_id);
    if (refValidation) {
      return refValidation;
    }
    if (!Array.isArray(blueprint.blueprint_provenance_refs)
      || !blueprint.blueprint_provenance_refs.every((ref) => this.isFunctionalRef(ref))) {
      return this.blockedSearchPlanValidation(
        'INVALID_PAYLOAD',
        'SearchPlan blueprint provenance refs must be functional refs.',
        ['MALFORMED_SEARCH_PLAN_BLUEPRINT'],
      );
    }
    if (!this.isNullableFunctionalRef(blueprint.parent_search_plan_ref)
      || !this.isNullableFunctionalRef(blueprint.recheck_request_ref)) {
      return this.blockedSearchPlanValidation(
        'INVALID_PAYLOAD',
        'SearchPlan blueprint parent/recheck refs must be functional refs or null.',
        ['MALFORMED_SEARCH_PLAN_BLUEPRINT'],
      );
    }
    if (!this.isNonEmptyStringArray(blueprint.query_intents)) {
      return this.blockedSearchPlanValidation(
        'GATE_CONSTRAINT_FAILED',
        'SearchPlan blueprint query_intents must be explicit and non-empty.',
        ['QUERY_INTENTS_REQUIRED'],
      );
    }
    if (!Array.isArray(blueprint.coverage_intents) || blueprint.coverage_intents.length === 0) {
      return this.blockedSearchPlanValidation(
        'GATE_CONSTRAINT_FAILED',
        'SearchPlan blueprint coverage_intents must be explicit and non-empty.',
        ['COVERAGE_INTENTS_REQUIRED'],
      );
    }
    const invalidCoverage = this.invalidCoverageIntentBlocker(blueprint.coverage_intents);
    if (invalidCoverage) {
      return invalidCoverage;
    }
    if (!this.isStringArray(blueprint.must_check_constraints)
      || !this.isStringArray(blueprint.exclusion_rules)
      || !this.isPlainRecord(blueprint.coverage_strategy)
      || !this.isPlainRecord(blueprint.role_coverage_expectation)
      || !this.isNonEmptyStringArray(blueprint.method_family_targets)) {
      return this.blockedSearchPlanValidation(
        'INVALID_PAYLOAD',
        'SearchPlan blueprint constraints, exclusions, strategy, role expectations, and method-family targets are malformed.',
        ['MALFORMED_SEARCH_PLAN_BLUEPRINT'],
      );
    }

    const searchResources = this.requiredSearchResources();
    const topicSeed = await searchResources.getTopicSeedById(blueprint.topic_seed_ref.ref_id);
    if (!topicSeed) {
      return this.blockedSearchPlanValidation(
        'NOT_FOUND',
        `TopicSeed ${blueprint.topic_seed_ref.ref_id} not found.`,
        ['MISSING_TOPIC_SEED'],
      );
    }
    if (topicSeed.title_card_id !== input.title_card_id
      || topicSeed.seed_version !== blueprint.topic_seed_ref.version_id) {
      return this.blockedSearchPlanValidation(
        'VERSION_CONFLICT',
        'SearchPlan blueprint TopicSeed lineage does not match the resolved TopicSeed.',
        ['TOPIC_SEED_LINEAGE_MISMATCH'],
      );
    }
    const snapshot = await searchResources.getLiteratureResourcePoolSnapshotById(
      blueprint.literature_resource_pool_snapshot_ref.ref_id,
    );
    if (!snapshot) {
      return this.blockedSearchPlanValidation(
        'NOT_FOUND',
        `LiteratureResourcePoolSnapshot ${blueprint.literature_resource_pool_snapshot_ref.ref_id} not found.`,
        ['MISSING_LITERATURE_RESOURCE_POOL_SNAPSHOT'],
      );
    }
    if (snapshot.title_card_id !== input.title_card_id
      || snapshot.snapshot_version !== blueprint.literature_resource_pool_snapshot_ref.version_id
      || snapshot.topic_seed_ref.ref_id !== topicSeed.topic_seed_id) {
      return this.blockedSearchPlanValidation(
        'VERSION_CONFLICT',
        'SearchPlan blueprint snapshot lineage does not match the resolved TopicSeed and title card.',
        ['SNAPSHOT_LINEAGE_MISMATCH'],
        snapshot.snapshot_hash,
      );
    }
    if (snapshot.snapshot_hash !== blueprint.expected_snapshot_hash) {
      return this.blockedSearchPlanValidation(
        'VERSION_CONFLICT',
        'SearchPlan blueprint expected_snapshot_hash does not match the resolved snapshot.',
        ['SNAPSHOT_HASH_MISMATCH'],
        snapshot.snapshot_hash,
      );
    }

    return {
      blocked: false,
      error_code: null,
      error_message: null,
      blocker_codes: [],
      resolved_snapshot_hash: snapshot.snapshot_hash,
    };
  }

  private validateConcreteSearchPlanRefs(
    blueprint: TopicSelectionSearchPlanBlueprint,
    titleCardId: string,
  ): TopicSelectionCreateSearchPlanBlockedValidationResult | null {
    if (!this.isFunctionalRef(blueprint.topic_seed_ref)
      || blueprint.topic_seed_ref.ref_type !== 'topic_seed'
      || !this.hasNonEmptyString(blueprint.topic_seed_ref.version_id)
      || blueprint.topic_seed_ref.title_card_id !== titleCardId) {
      return this.blockedSearchPlanValidation(
        'INVALID_PAYLOAD',
        'SearchPlan blueprint topic_seed_ref must be a concrete TopicSeed ref for the title card.',
        ['TOPIC_SEED_REF_REQUIRED'],
      );
    }
    if (!this.isFunctionalRef(blueprint.literature_resource_pool_snapshot_ref)
      || blueprint.literature_resource_pool_snapshot_ref.ref_type !== 'literature_resource_pool_snapshot'
      || !this.hasNonEmptyString(blueprint.literature_resource_pool_snapshot_ref.version_id)
      || blueprint.literature_resource_pool_snapshot_ref.title_card_id !== titleCardId) {
      return this.blockedSearchPlanValidation(
        'INVALID_PAYLOAD',
        'SearchPlan blueprint literature_resource_pool_snapshot_ref must be a concrete snapshot ref for the title card.',
        ['LITERATURE_RESOURCE_POOL_SNAPSHOT_REF_REQUIRED'],
      );
    }
    return null;
  }

  private invalidCoverageIntentBlocker(
    coverageIntents: TopicSelectionSearchPlanBlueprintCoverageIntent[],
  ): TopicSelectionCreateSearchPlanBlockedValidationResult | null {
    const requiredFields: Array<keyof TopicSelectionSearchPlanBlueprintCoverageIntent> = [
      'coverage_key',
      'intent_type',
      'query',
      'rationale',
      'required',
      'priority',
      'expected_evidence_role',
      'target_source_types',
      'refs',
    ];
    for (const [index, intent] of coverageIntents.entries()) {
      if (!this.isPlainRecord(intent)) {
        return this.blockedSearchPlanValidation(
          'INVALID_PAYLOAD',
          `SearchPlan coverage_intents[${index}] must be an object.`,
          ['COVERAGE_INTENT_FIELD_REQUIRED'],
        );
      }
      for (const field of requiredFields) {
        if (!Object.prototype.hasOwnProperty.call(intent, field)) {
          return this.blockedSearchPlanValidation(
            'INVALID_PAYLOAD',
            `SearchPlan coverage_intents[${index}] is missing ${field}.`,
            ['COVERAGE_INTENT_FIELD_REQUIRED'],
          );
        }
      }
      if (!this.hasNonEmptyString(intent.coverage_key)
        || !this.hasNonEmptyString(intent.query)
        || !this.hasNonEmptyString(intent.rationale)
        || !this.isCoverageIntentType(intent.intent_type)
        || typeof intent.required !== 'boolean'
        || !Number.isFinite(intent.priority)
        || !this.isEvidenceRole(intent.expected_evidence_role)
        || !this.isStringArray(intent.target_source_types)
        || !Array.isArray(intent.refs)
        || !intent.refs.every((ref) => this.isFunctionalRef(ref))) {
        return this.blockedSearchPlanValidation(
          'INVALID_PAYLOAD',
          `SearchPlan coverage_intents[${index}] has malformed strict coverage semantics.`,
          ['COVERAGE_INTENT_FIELD_REQUIRED'],
        );
      }
    }
    return null;
  }

  private blockedSearchPlanValidation(
    errorCode: string,
    errorMessage: string,
    blockerCodes: string[],
    resolvedSnapshotHash: string | null = null,
  ): TopicSelectionCreateSearchPlanBlockedValidationResult {
    return {
      blocked: true,
      error_code: errorCode,
      error_message: errorMessage,
      blocker_codes: blockerCodes,
      resolved_snapshot_hash: resolvedSnapshotHash,
    };
  }

  private evaluateCreateSearchPlanAssertions(
    input: TopicSelectionWorkflowHarnessCreateSearchPlanInput,
    nodeResult: TopicSelectionWorkflowHarnessCreateSearchPlanNodeResult,
  ): TopicSelectionWorkflowHarnessAssertion[] {
    const expectations = input.expectations ?? {};
    const assertions: TopicSelectionWorkflowHarnessAssertion[] = [
      this.assertion(
        'expected_node_status',
        expectations.status ? nodeResult.status === expectations.status : nodeResult.status === 'succeeded',
        'SearchPlan node status must match scenario expectation.',
        expectations.status ?? 'succeeded',
        nodeResult.status,
      ),
      this.assertion(
        'no_model_execution',
        true,
        'Create SearchPlan is deterministic and never invokes AgentOrchestrator, provider, Codex, or debate runtime.',
        'none',
        'none',
      ),
    ];

    if (nodeResult.status === 'succeeded') {
      assertions.push(
        this.assertion(
          'authority_refs_created',
          Boolean(nodeResult.search_plan_ref)
            && nodeResult.authority_refs.length === 1 + nodeResult.coverage_row_intent_refs.length,
          'Successful SearchPlan scenario must expose SearchPlan and CoverageRow authority refs.',
          1 + nodeResult.coverage_row_intent_refs.length,
          nodeResult.authority_refs.length,
        ),
        this.assertion(
          'control_plane_refs_created',
          Boolean(
            nodeResult.search_plan?.input_snapshot_id
              && nodeResult.search_plan.workflow_run_id
              && nodeResult.search_plan.gate_result_id
              && nodeResult.search_plan.transition_attempt_id,
          ),
          'SearchPlan creation must produce input snapshot, workflow run, gate result, and transition refs.',
          ['input_snapshot_id', 'workflow_run_id', 'gate_result_id', 'transition_attempt_id'],
          {
            input_snapshot_id: nodeResult.search_plan?.input_snapshot_id ?? null,
            workflow_run_id: nodeResult.search_plan?.workflow_run_id ?? null,
            gate_result_id: nodeResult.search_plan?.gate_result_id ?? null,
            transition_attempt_id: nodeResult.search_plan?.transition_attempt_id ?? null,
          },
        ),
        this.assertion(
          'coverage_rows_preserve_blueprint_semantics',
          this.coverageRowsMatchBlueprint(input.blueprint, nodeResult.coverage_row_intents),
          'Normalized SearchPlan runner must preserve explicit blueprint coverage semantics without fallback defaults.',
          input.blueprint?.coverage_intents ?? [],
          nodeResult.coverage_row_intents.map((row) => ({
            coverage_key: row.coverage_key,
            intent_type: row.intent_type,
            query: row.query,
            rationale: row.rationale,
            required: row.required,
            priority: row.priority,
            expected_evidence_role: row.expected_evidence_role,
            target_source_types: row.target_source_types,
            refs: row.refs,
          })),
        ),
      );
    } else {
      assertions.push(this.assertion(
        'blocked_without_authority',
        nodeResult.authority_refs.length === 0
          && nodeResult.search_plan === null
          && nodeResult.coverage_row_intents.length === 0,
        'Blocked SearchPlan scenario must not create SearchPlan or CoverageRow authority refs.',
        0,
        nodeResult.authority_refs.length,
      ));
    }

    if (expectations.error_code !== undefined) {
      assertions.push(this.assertion(
        'expected_error_code',
        nodeResult.error_code === expectations.error_code,
        'SearchPlan node error code must match scenario expectation.',
        expectations.error_code,
        nodeResult.error_code,
      ));
    }
    if (expectations.blocker_codes) {
      const missing = expectations.blocker_codes.filter((code) => !nodeResult.blocker_codes.includes(code));
      assertions.push(this.assertion(
        'expected_blocker_codes',
        missing.length === 0,
        'SearchPlan blocker codes must include expected scenario blockers.',
        expectations.blocker_codes,
        nodeResult.blocker_codes,
      ));
    }
    if (expectations.coverage_row_count !== undefined && expectations.coverage_row_count !== null) {
      assertions.push(this.assertion(
        'expected_coverage_row_count',
        nodeResult.coverage_row_intents.length === expectations.coverage_row_count,
        'SearchPlan coverage row count must match scenario expectation.',
        expectations.coverage_row_count,
        nodeResult.coverage_row_intents.length,
      ));
    }
    if (expectations.plan_version !== undefined && expectations.plan_version !== null) {
      assertions.push(this.assertion(
        'expected_plan_version',
        nodeResult.plan_version === expectations.plan_version,
        'SearchPlan version must match scenario expectation.',
        expectations.plan_version,
        nodeResult.plan_version,
      ));
    }
    return assertions;
  }

  private createSearchPlanTraceSnapshot(input: {
    input: TopicSelectionWorkflowHarnessCreateSearchPlanInput;
    nodeInput: TopicSelectionWorkflowHarnessCreateSearchPlanNodeInput;
    inputHash: string;
    nodeResult: TopicSelectionWorkflowHarnessCreateSearchPlanNodeResult;
    assertions: TopicSelectionWorkflowHarnessAssertion[];
    scenarioStatus: 'passed' | 'failed';
    resolvedSnapshotHash: string | null;
  }): TopicSelectionWorkflowHarnessCreateSearchPlanTraceSnapshot {
    return {
      schema_version: 'topic-selection-workflow-harness-trace-v1',
      payload_schema: SEARCH_PLAN_TRACE_PAYLOAD_SCHEMA,
      scenario_id: input.input.scenario_id,
      scenario_case_id: input.input.scenario_case_id ?? null,
      node_id: CREATE_SEARCH_PLAN_NODE_ID,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      input_hash: input.inputHash,
      scenario_status: input.scenarioStatus,
      node_status: input.nodeResult.status,
      node_input: input.nodeInput,
      node_result: input.nodeResult,
      blueprint_origin: input.input.blueprint?.blueprint_origin ?? null,
      blueprint_provenance_refs: input.input.blueprint?.blueprint_provenance_refs ?? [],
      expected_snapshot_hash: input.input.blueprint?.expected_snapshot_hash ?? null,
      resolved_snapshot_hash: input.resolvedSnapshotHash,
      query_intents: input.input.blueprint?.query_intents ?? [],
      coverage_intents: input.input.blueprint?.coverage_intents ?? [],
      search_plan_ref: input.nodeResult.search_plan_ref,
      coverage_row_intent_refs: input.nodeResult.coverage_row_intent_refs,
      authority_refs: input.nodeResult.authority_refs,
      audit_refs: input.nodeResult.audit_refs,
      artifact_refs: input.nodeResult.artifact_refs,
      warning_codes: input.nodeResult.warning_codes,
      blocker_codes: input.nodeResult.blocker_codes,
      assertions: input.assertions,
      created_at: this.now(),
    };
  }

  private recordSearchRunNodeInput(
    input: TopicSelectionWorkflowHarnessRecordSearchRunInput,
  ): TopicSelectionWorkflowHarnessRecordSearchRunNodeInput {
    return {
      schema_version: input.bundle?.output_schema_version ?? 'v1',
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      bundle: input.bundle ?? null,
      created_by: input.created_by ?? 'system',
    };
  }

  private validateRecordSearchRunBundle(
    input: TopicSelectionWorkflowHarnessRecordSearchRunInput,
  ): TopicSelectionRecordSearchRunValidationResult {
    const bundle = input.bundle;
    if (!bundle) {
      return this.blockedSearchRunValidation(
        'INVALID_PAYLOAD',
        'SearchRun record bundle is required for normalized Node 4 execution.',
        ['MISSING_SEARCH_RUN_RECORD_BUNDLE'],
      );
    }
    if (bundle.schema_version !== TOPIC_SELECTION_SEARCH_RUN_RECORD_BUNDLE_SCHEMA_VERSION
      || !this.hasNonEmptyString(bundle.policy_version)
      || !this.hasNonEmptyString(bundle.output_schema_version)) {
      return this.blockedSearchRunValidation(
        'INVALID_PAYLOAD',
        'SearchRun record bundle requires schema, policy, and output schema versions.',
        ['MALFORMED_SEARCH_RUN_RECORD_BUNDLE'],
      );
    }
    if (!this.isFunctionalRef(bundle.title_card_ref)
      || bundle.title_card_ref.ref_type !== 'title_card'
      || bundle.title_card_ref.ref_id !== input.title_card_id) {
      return this.blockedSearchRunValidation(
        'VERSION_CONFLICT',
        'SearchRun bundle title_card_ref must match the scenario title card.',
        ['TITLE_CARD_REF_MISMATCH'],
      );
    }
    if (!this.isFunctionalRef(bundle.search_plan_ref)
      || bundle.search_plan_ref.ref_type !== 'search_plan'
      || !this.hasNonEmptyString(bundle.search_plan_ref.version_id)
      || bundle.search_plan_ref.title_card_id !== input.title_card_id) {
      return this.blockedSearchRunValidation(
        'INVALID_PAYLOAD',
        'SearchRun bundle search_plan_ref must be a concrete SearchPlan ref for the title card.',
        ['SEARCH_PLAN_REF_REQUIRED'],
      );
    }
    if (!this.isFunctionalRef(bundle.literature_resource_pool_snapshot_ref)
      || bundle.literature_resource_pool_snapshot_ref.ref_type !== 'literature_resource_pool_snapshot'
      || !this.hasNonEmptyString(bundle.literature_resource_pool_snapshot_ref.version_id)
      || bundle.literature_resource_pool_snapshot_ref.title_card_id !== input.title_card_id) {
      return this.blockedSearchRunValidation(
        'INVALID_PAYLOAD',
        'SearchRun bundle literature_resource_pool_snapshot_ref must be a concrete snapshot ref for the title card.',
        ['LITERATURE_RESOURCE_POOL_SNAPSHOT_REF_REQUIRED'],
      );
    }
    if (!this.hasNonEmptyString(bundle.expected_literature_snapshot_hash)
      || !Array.isArray(bundle.query_provenance)
      || !this.isPlainRecord(bundle.source_health_summary)
      || !this.isPlainRecord(bundle.dedup_summary)
      || !Array.isArray(bundle.evidence_map_input_refs)
      || !Array.isArray(bundle.coverage_observations)
      || !Array.isArray(bundle.evidence_bindings)
      || !Array.isArray(bundle.coverage_assessments)
      || !Array.isArray(bundle.coverage_risk_acceptances)) {
      return this.blockedSearchRunValidation(
        'INVALID_PAYLOAD',
        'SearchRun bundle is missing required record fields.',
        ['MALFORMED_SEARCH_RUN_RECORD_BUNDLE'],
      );
    }
    if (!bundle.evidence_map_input_refs.every((ref) => this.isSearchRunEvidenceMapInputRef(ref))
      || !this.isNullableFunctionalRef(bundle.raw_log_artifact_ref)) {
      return this.blockedSearchRunValidation(
        'INVALID_PAYLOAD',
        'SearchRun bundle authority refs must use supported SearchRun ref types.',
        ['MALFORMED_SEARCH_RUN_RECORD_BUNDLE'],
      );
    }
    if (![
      ...bundle.coverage_observations,
      ...bundle.evidence_bindings,
      ...bundle.coverage_assessments,
      ...bundle.coverage_risk_acceptances,
    ].every((record) => this.isPlainRecord(record))) {
      return this.blockedSearchRunValidation(
        'INVALID_PAYLOAD',
        'SearchRun bundle coverage record entries must be objects.',
        ['MALFORMED_SEARCH_RUN_RECORD_BUNDLE'],
      );
    }
    const coverageRefsValid = [
      ...bundle.coverage_observations.map((observation) => observation.coverage_row_intent_ref),
      ...bundle.evidence_bindings.map((binding) => binding.coverage_row_intent_ref),
      ...bundle.coverage_assessments.map((assessment) => assessment.coverage_row_intent_ref),
      ...bundle.coverage_risk_acceptances.map((riskAcceptance) => riskAcceptance.coverage_row_intent_ref),
    ].every((ref) => this.isTitleCardScopedRef(ref, 'coverage_row_intent', input.title_card_id));
    const evidenceBindingRefsValid = bundle.evidence_bindings.every((binding) =>
      this.isTitleCardScopedRef(binding.literature_ref, 'literature_record', input.title_card_id)
        && Array.isArray(binding.source_refs)
        && binding.source_refs.every((ref) => this.isSearchRunEvidenceBindingSourceRef(ref)),
    );
    if (!coverageRefsValid || !evidenceBindingRefsValid) {
      return this.blockedSearchRunValidation(
        'INVALID_PAYLOAD',
        'SearchRun bundle coverage records must use concrete coverage rows and supported literature/source refs.',
        ['COVERAGE_RECORD_REFS_REQUIRED'],
      );
    }
    if (!bundle.coverage_risk_acceptances.every((riskAcceptance) =>
      this.isSearchCoverageRiskRef(riskAcceptance.accepted_risk_ref))) {
      return this.blockedSearchRunValidation(
        'GATE_CONSTRAINT_FAILED',
        'Coverage risk acceptances must cite search-coverage risk refs only.',
        ['SEARCH_COVERAGE_RISK_REF_REQUIRED'],
      );
    }
    if (bundle.raw_log_artifact_ref && !this.isRawArtifactAuthorityRef(bundle.raw_log_artifact_ref)) {
      return this.blockedSearchRunValidation(
        'GATE_CONSTRAINT_FAILED',
        'SearchRun raw_log_artifact_ref must be an audit-only artifact ref.',
        ['RAW_LOG_ARTIFACT_REF_INVALID'],
      );
    }
    const rawLogRef = bundle.raw_log_artifact_ref;
    const rawLogMisuse = rawLogRef
      && [
        ...bundle.evidence_map_input_refs,
        ...bundle.evidence_bindings.flatMap((binding) => [
          binding.literature_ref,
          ...binding.source_refs,
        ]),
      ].some((ref) => this.sameFunctionalRef(ref, rawLogRef));
    if (rawLogMisuse) {
      return this.blockedSearchRunValidation(
        'GATE_CONSTRAINT_FAILED',
        'Raw search logs are audit-only and cannot enter EvidenceMap authority refs.',
        ['RAW_LOG_ARTIFACT_AS_AUTHORITY_REF'],
      );
    }
    return {
      blocked: false,
      error_code: null,
      error_message: null,
      blocker_codes: [],
    };
  }

  private blockedSearchRunValidation(
    errorCode: string,
    errorMessage: string,
    blockerCodes: string[],
  ): TopicSelectionRecordSearchRunBlockedValidationResult {
    return {
      blocked: true,
      error_code: errorCode,
      error_message: errorMessage,
      blocker_codes: blockerCodes,
    };
  }

  private recordSearchRunServiceInput(
    input: TopicSelectionWorkflowHarnessRecordSearchRunInput,
  ): Parameters<TopicSelectionSearchResourceService['recordSearchRun']>[0] {
    const bundle = input.bundle;
    if (!bundle) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'SearchRun record bundle is required.');
    }
    return {
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      search_plan_id: bundle.search_plan_ref.ref_id,
      literature_resource_pool_snapshot_id: bundle.literature_resource_pool_snapshot_ref.ref_id,
      search_plan_ref: bundle.search_plan_ref,
      literature_resource_pool_snapshot_ref: bundle.literature_resource_pool_snapshot_ref,
      expected_literature_snapshot_hash: bundle.expected_literature_snapshot_hash,
      run_kind: bundle.run_kind,
      run_status: bundle.run_status,
      query_provenance: bundle.query_provenance,
      result_accounting: bundle.result_accounting,
      source_health_summary: bundle.source_health_summary,
      dedup_summary: bundle.dedup_summary,
      evidence_map_input_refs: bundle.evidence_map_input_refs,
      raw_log_artifact_ref: bundle.raw_log_artifact_ref,
      raw_log_artifact: bundle.raw_log_artifact_payload,
      coverage_observations: bundle.coverage_observations.map((observation) => ({
        coverage_row_intent_id: observation.coverage_row_intent_ref.ref_id,
        status: observation.status,
        result_count: observation.result_count,
        source_count: observation.source_count,
        missing_reason_codes: observation.missing_reason_codes,
        notes: observation.notes ?? null,
      })),
      evidence_bindings: bundle.evidence_bindings.map((binding) => ({
        coverage_row_intent_id: binding.coverage_row_intent_ref.ref_id,
        literature_ref: binding.literature_ref,
        source_refs: binding.source_refs,
        binding_kind: binding.binding_kind,
        result_rank: binding.result_rank ?? null,
      })),
      coverage_assessments: bundle.coverage_assessments.map((assessment) => ({
        coverage_row_intent_id: assessment.coverage_row_intent_ref.ref_id,
        verdict: assessment.verdict,
        issue_codes: assessment.issue_codes,
        confidence: assessment.confidence ?? null,
        assessed_by: assessment.assessed_by,
      })),
      coverage_risk_acceptances: bundle.coverage_risk_acceptances.map((riskAcceptance) => ({
        coverage_row_intent_id: riskAcceptance.coverage_row_intent_ref.ref_id,
        accepted_risk_ref: riskAcceptance.accepted_risk_ref,
        accepted_by: riskAcceptance.accepted_by,
        rationale: riskAcceptance.rationale,
        expires_at: riskAcceptance.expires_at ?? null,
      })),
      created_by: input.created_by ?? 'system',
      policy_version_id: bundle.policy_version,
    };
  }

  private isConsumableSearchRunBundle(bundle: TopicSelectionSearchRunRecordBundle): boolean {
    return this.isConsumableSearchRunStatus(bundle.run_status)
      && bundle.evidence_map_input_refs.length > 0;
  }

  private searchRunHandoff(input: {
    bundle: TopicSelectionSearchRunRecordBundle;
    searchRun: TopicSelectionSearchRunRecord;
    searchRunRef: TopicSelectionFunctionalRef;
    evidenceBindingRefs: TopicSelectionFunctionalRef[];
    coverageAssessmentRefs: TopicSelectionFunctionalRef[];
    observations: TopicSelectionCoverageExecutionObservationRecord[];
    riskAcceptances: TopicSelectionCoverageRiskAcceptanceRecord[];
    coverageRoleExpectations: TopicSelectionSearchRunCoverageRoleExpectation[];
    methodFamilyTargets: string[];
  }): TopicSelectionSearchRunHandoff {
    return {
      schema_version: TOPIC_SELECTION_SEARCH_RUN_HANDOFF_SCHEMA_VERSION,
      search_run_ref: input.searchRunRef,
      search_plan_ref: input.searchRun.search_plan_ref,
      literature_resource_pool_snapshot_ref: input.searchRun.literature_snapshot_ref,
      literature_snapshot_hash: input.bundle.expected_literature_snapshot_hash,
      coverage_row_intent_refs: this.searchRunCoverageRowRefs(input.bundle),
      coverage_role_expectations: input.coverageRoleExpectations,
      method_family_targets: input.methodFamilyTargets,
      evidence_map_input_refs: input.bundle.evidence_map_input_refs,
      coverage_binding_refs: input.evidenceBindingRefs,
      coverage_assessment_refs: input.coverageAssessmentRefs,
      coverage_summary: this.searchRunCoverageSummary(input.bundle, input.observations, input.riskAcceptances),
      source_health_summary: input.bundle.source_health_summary,
      result_accounting: input.bundle.result_accounting,
      raw_log_artifact_refs: this.uniqueRefs([
        input.bundle.raw_log_artifact_ref,
        ...input.searchRun.artifact_refs.filter((ref) => ref.ref_type === 'artifact_ref'),
      ]),
      policy_version: input.bundle.policy_version,
      output_schema_version: input.bundle.output_schema_version,
    };
  }

  private searchRunLoopbackSignal(
    bundle: TopicSelectionSearchRunRecordBundle,
    searchRunRef: TopicSelectionFunctionalRef | null,
  ): TopicSelectionSearchRunLoopbackSignal {
    const reasonCodes = this.searchRunLoopbackReasonCodes(bundle);
    const targetActions: TopicSelectionSearchRunLoopbackSignal['target_actions'] = [];
    if (bundle.run_status === 'failed' || bundle.run_status === 'partial') {
      targetActions.push('upstream_search_execution_or_input_preparation');
    }
    if (bundle.evidence_map_input_refs.length === 0 || bundle.evidence_bindings.length === 0) {
      targetActions.push('human_review_search_coverage_acceptance');
    }
    if (reasonCodes.includes('SOURCE_HEALTH_WARNING')) {
      targetActions.push('topic-selection.v1a.snapshot-literature-resource-pool.v1');
    }
    return {
      schema_version: TOPIC_SELECTION_SEARCH_RUN_LOOPBACK_SIGNAL_SCHEMA_VERSION,
      search_run_ref: searchRunRef,
      search_plan_ref: bundle.search_plan_ref,
      literature_resource_pool_snapshot_ref: bundle.literature_resource_pool_snapshot_ref,
      reason_codes: reasonCodes,
      target_actions: [...new Set(targetActions)],
      repair_summary: reasonCodes.length > 0
        ? `SearchRun is audit-only until ${reasonCodes.join(', ')} is resolved.`
        : 'SearchRun is audit-only until upstream search coverage is reviewed.',
      policy_version: bundle.policy_version,
      output_schema_version: bundle.output_schema_version,
    };
  }

  private searchRunAuditRefs(searchRun: TopicSelectionSearchRunRecord): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      searchRun.input_snapshot_id
        ? this.ref('input_snapshot', searchRun.input_snapshot_id, searchRun.title_card_id)
        : null,
      searchRun.workflow_run_id
        ? this.ref('workflow_run', searchRun.workflow_run_id, searchRun.title_card_id)
        : null,
      searchRun.gate_result_id
        ? this.ref('readiness_gate_result', searchRun.gate_result_id, searchRun.title_card_id)
        : null,
      searchRun.transition_attempt_id
        ? this.ref('chain_transition_attempt', searchRun.transition_attempt_id, searchRun.title_card_id)
        : null,
    ]);
  }

  private searchRunWarningCodes(
    bundle: TopicSelectionSearchRunRecordBundle | null | undefined,
    searchRun: TopicSelectionSearchRunRecord | null,
  ): string[] {
    if (!bundle) {
      return [];
    }
    return this.uniqueStrings([
      ...this.warningCodesFromSourceHealth(bundle.source_health_summary),
      ...(searchRun && !this.isConsumableSearchRunBundle(bundle) ? ['NON_CONSUMABLE_SEARCH_RUN'] : []),
    ]);
  }

  private evaluateRecordSearchRunAssertions(
    input: TopicSelectionWorkflowHarnessRecordSearchRunInput,
    nodeResult: TopicSelectionWorkflowHarnessRecordSearchRunNodeResult,
  ): TopicSelectionWorkflowHarnessAssertion[] {
    const expectations = input.expectations ?? {};
    const assertions: TopicSelectionWorkflowHarnessAssertion[] = [
      this.assertion(
        'expected_node_status',
        expectations.status ? nodeResult.status === expectations.status : nodeResult.status === 'succeeded',
        'SearchRun node status must match scenario expectation.',
        expectations.status ?? 'succeeded',
        nodeResult.status,
      ),
      this.assertion(
        'no_model_execution',
        true,
        'Record SearchRun is deterministic and never invokes AgentOrchestrator, provider, Codex, or debate runtime.',
        'none',
        'none',
      ),
      this.assertion(
        'handoff_loopback_mutual_exclusion',
        !(nodeResult.downstream_handoff && nodeResult.loopback_signal),
        'SearchRun downstream handoff and loopback signal must not coexist.',
        'one_or_none',
        {
          downstream_handoff: Boolean(nodeResult.downstream_handoff),
          loopback_signal: Boolean(nodeResult.loopback_signal),
        },
      ),
    ];

    if (nodeResult.status === 'succeeded') {
      assertions.push(this.assertion(
        'authority_ref_created',
        Boolean(
          nodeResult.search_run_ref
            && nodeResult.authority_refs.some((ref) => this.sameFunctionalRef(ref, nodeResult.search_run_ref!)),
        ),
        'Successful SearchRun scenario must expose a SearchRun authority ref.',
        'search_run_ref',
        nodeResult.search_run_ref,
      ));
      if (nodeResult.search_run?.run_status === 'failed') {
        assertions.push(this.assertion(
          'failed_run_is_audit_only',
          !nodeResult.consumable_for_evidence_map && nodeResult.downstream_handoff === null,
          'Failed SearchRun records are audit-only and must not emit EvidenceMap handoff.',
          'audit_only',
          {
            consumable_for_evidence_map: nodeResult.consumable_for_evidence_map,
            downstream_handoff: nodeResult.downstream_handoff,
          },
        ));
      }
      if (nodeResult.consumable_for_evidence_map) {
        assertions.push(this.assertion(
          'consumable_run_emits_handoff',
          nodeResult.downstream_handoff !== null && nodeResult.loopback_signal === null,
          'Consumable SearchRun must emit downstream handoff and no loopback signal.',
          'handoff_only',
          {
            downstream_handoff: nodeResult.downstream_handoff,
            loopback_signal: nodeResult.loopback_signal,
          },
        ));
      }
    } else {
      assertions.push(this.assertion(
        'blocked_without_authority',
        nodeResult.authority_refs.length === 0 && nodeResult.search_run === null,
        'Blocked SearchRun scenario must not create authority refs.',
        0,
        nodeResult.authority_refs.length,
      ));
    }

    if (expectations.error_code !== undefined) {
      assertions.push(this.assertion(
        'expected_error_code',
        nodeResult.error_code === expectations.error_code,
        'SearchRun node error code must match scenario expectation.',
        expectations.error_code,
        nodeResult.error_code,
      ));
    }
    if (expectations.blocker_codes) {
      const missing = expectations.blocker_codes.filter((code) => !nodeResult.blocker_codes.includes(code));
      assertions.push(this.assertion(
        'expected_blocker_codes',
        missing.length === 0,
        'SearchRun blocker codes must include expected scenario blockers.',
        expectations.blocker_codes,
        nodeResult.blocker_codes,
      ));
    }
    if (expectations.consumable_for_evidence_map !== undefined && expectations.consumable_for_evidence_map !== null) {
      assertions.push(this.assertion(
        'expected_consumable_for_evidence_map',
        nodeResult.consumable_for_evidence_map === expectations.consumable_for_evidence_map,
        'SearchRun consumability must match scenario expectation.',
        expectations.consumable_for_evidence_map,
        nodeResult.consumable_for_evidence_map,
      ));
    }
    if (expectations.downstream_handoff_present !== undefined && expectations.downstream_handoff_present !== null) {
      assertions.push(this.assertion(
        'expected_downstream_handoff_presence',
        Boolean(nodeResult.downstream_handoff) === expectations.downstream_handoff_present,
        'SearchRun downstream handoff presence must match scenario expectation.',
        expectations.downstream_handoff_present,
        Boolean(nodeResult.downstream_handoff),
      ));
    }
    if (expectations.loopback_signal_present !== undefined && expectations.loopback_signal_present !== null) {
      assertions.push(this.assertion(
        'expected_loopback_signal_presence',
        Boolean(nodeResult.loopback_signal) === expectations.loopback_signal_present,
        'SearchRun loopback signal presence must match scenario expectation.',
        expectations.loopback_signal_present,
        Boolean(nodeResult.loopback_signal),
      ));
    }
    return assertions;
  }

  private createRecordSearchRunTraceSnapshot(input: {
    input: TopicSelectionWorkflowHarnessRecordSearchRunInput;
    nodeInput: TopicSelectionWorkflowHarnessRecordSearchRunNodeInput;
    inputHash: string;
    nodeResult: TopicSelectionWorkflowHarnessRecordSearchRunNodeResult;
    assertions: TopicSelectionWorkflowHarnessAssertion[];
    scenarioStatus: 'passed' | 'failed';
  }): TopicSelectionWorkflowHarnessRecordSearchRunTraceSnapshot {
    return {
      schema_version: 'topic-selection-workflow-harness-trace-v1',
      payload_schema: SEARCH_RUN_TRACE_PAYLOAD_SCHEMA,
      scenario_id: input.input.scenario_id,
      scenario_case_id: input.input.scenario_case_id ?? null,
      node_id: RECORD_SEARCH_RUN_NODE_ID,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      input_hash: input.inputHash,
      scenario_status: input.scenarioStatus,
      node_status: input.nodeResult.status,
      node_input: input.nodeInput,
      node_result: input.nodeResult,
      consumable_for_evidence_map: input.nodeResult.consumable_for_evidence_map,
      search_run_ref: input.nodeResult.search_run_ref,
      downstream_handoff: input.nodeResult.downstream_handoff,
      loopback_signal: input.nodeResult.loopback_signal,
      authority_refs: input.nodeResult.authority_refs,
      audit_refs: input.nodeResult.audit_refs,
      artifact_refs: input.nodeResult.artifact_refs,
      warning_codes: input.nodeResult.warning_codes,
      blocker_codes: input.nodeResult.blocker_codes,
      assertions: input.assertions,
      created_at: this.now(),
    };
  }

  private searchRunCoverageRowRefs(bundle: TopicSelectionSearchRunRecordBundle): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      ...bundle.coverage_observations.map((observation) => observation.coverage_row_intent_ref),
      ...bundle.evidence_bindings.map((binding) => binding.coverage_row_intent_ref),
      ...bundle.coverage_assessments.map((assessment) => assessment.coverage_row_intent_ref),
      ...bundle.coverage_risk_acceptances.map((riskAcceptance) => riskAcceptance.coverage_row_intent_ref),
    ]);
  }

  private searchRunCoverageRoleExpectations(
    bundle: TopicSelectionSearchRunRecordBundle,
    rows: Array<{ coverage_row_intent: TopicSelectionCoverageRowIntentRecord }>,
  ): TopicSelectionSearchRunCoverageRoleExpectation[] {
    const refsByKey = new Map(
      this.searchRunCoverageRowRefs(bundle).map((ref) => [this.refIdentity(ref), ref] as const),
    );
    return rows
      .filter((row) => refsByKey.has(this.refIdentity(this.ref(
        'coverage_row_intent',
        row.coverage_row_intent.coverage_row_intent_id,
        row.coverage_row_intent.title_card_id ?? bundle.title_card_ref.ref_id,
      ))))
      .map((row) => {
        const rowRef = this.ref(
          'coverage_row_intent',
          row.coverage_row_intent.coverage_row_intent_id,
          row.coverage_row_intent.title_card_id ?? bundle.title_card_ref.ref_id,
        );
        return {
          coverage_row_intent_ref: refsByKey.get(this.refIdentity(rowRef)) ?? rowRef,
          expected_evidence_role: row.coverage_row_intent.expected_evidence_role,
        };
      })
      .sort((left, right) =>
        left.coverage_row_intent_ref.ref_id.localeCompare(right.coverage_row_intent_ref.ref_id));
  }

  private methodFamilyTargetsFromSearchPlan(searchPlan: TopicSelectionSearchPlanRecord | null): string[] {
    const targets = searchPlan?.coverage_strategy.method_family_targets;
    if (!Array.isArray(targets)) {
      return [];
    }
    return this.uniqueStrings(targets
      .filter((target): target is string => typeof target === 'string' && target.trim().length > 0)
      .map((target) => target.trim()))
      .sort((left, right) => left.localeCompare(right));
  }

  private searchRunCoverageSummary(
    bundle: TopicSelectionSearchRunRecordBundle,
    observations: TopicSelectionCoverageExecutionObservationRecord[],
    riskAcceptances: TopicSelectionCoverageRiskAcceptanceRecord[],
  ): Record<string, unknown> {
    return {
      coverage_observation_count: observations.length,
      evidence_binding_count: bundle.evidence_bindings.length,
      coverage_assessment_count: bundle.coverage_assessments.length,
      coverage_risk_acceptance_count: riskAcceptances.length,
      coverage_row_count: this.searchRunCoverageRowRefs(bundle).length,
      observation_status_counts: observations.reduce<Record<string, number>>((counts, observation) => {
        counts[observation.status] = (counts[observation.status] ?? 0) + 1;
        return counts;
      }, {}),
    };
  }

  private searchRunLoopbackReasonCodes(bundle: TopicSelectionSearchRunRecordBundle): string[] {
    return this.uniqueStrings([
      ...(bundle.run_status === 'failed' ? ['SEARCH_RUN_FAILED'] : []),
      ...(bundle.run_status === 'partial' ? ['SEARCH_RUN_PARTIAL'] : []),
      ...(bundle.evidence_map_input_refs.length === 0 ? ['EVIDENCE_MAP_INPUT_REFS_MISSING'] : []),
      ...(bundle.evidence_bindings.length === 0 ? ['COVERAGE_EVIDENCE_BINDINGS_MISSING'] : []),
      ...(this.warningCodesFromSourceHealth(bundle.source_health_summary).length > 0 ? ['SOURCE_HEALTH_WARNING'] : []),
    ]);
  }

  private warningCodesFromSourceHealth(sourceHealthSummary: Record<string, unknown>): string[] {
    const warningCodes = sourceHealthSummary.warning_codes;
    return Array.isArray(warningCodes)
      ? warningCodes.filter((code): code is string => typeof code === 'string' && code.trim().length > 0)
      : [];
  }

  private coverageRowsMatchBlueprint(
    blueprint: TopicSelectionSearchPlanBlueprint | null | undefined,
    rows: TopicSelectionCoverageRowIntentRecord[],
  ): boolean {
    if (!blueprint || blueprint.coverage_intents.length !== rows.length) {
      return false;
    }
    return blueprint.coverage_intents.every((intent, index) => {
      const row = rows[index];
      return Boolean(row)
        && row.coverage_key === intent.coverage_key
        && row.intent_type === intent.intent_type
        && row.query === intent.query
        && row.rationale === intent.rationale
        && row.required === intent.required
        && row.priority === intent.priority
        && row.expected_evidence_role === intent.expected_evidence_role
        && JSON.stringify(row.target_source_types) === JSON.stringify(intent.target_source_types)
        && this.sameFunctionalRefArray(row.refs, intent.refs);
    });
  }

  private contextCompileInput(
    input: TopicSelectionWorkflowHarnessGenerateNeedCandidateInput,
  ): CompileNeedDiscoveryContextPairInput {
    const inputRefs = input.context_input_refs ?? this.defaultContextInputRefs(input);
    return {
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      workflow_run_id: input.workflow_run_id,
      input_snapshot_id: input.input_snapshot_id ?? null,
      node_attempt_id: input.node_attempt_id,
      input_refs: inputRefs,
      policy_version: input.policy_version,
      output_schema_version: input.output_schema_version,
      profile_id: input.profile_id,
      execution_mode: input.execution_mode,
      exploration_payload: input.exploration_payload,
      arbiter_payload: input.arbiter_payload,
      runtime_context_cache: this.v1aN6RuntimeContextCacheBindings.build({
        cache_service: this.dependencies.contextPacketCache ?? null,
        title_card_id: input.title_card_id,
        node_attempt_id: input.node_attempt_id,
        input_refs: inputRefs,
        policy_version: input.policy_version,
        output_schema_version: input.output_schema_version,
        profile_id: input.profile_id,
        execution_mode: input.execution_mode,
        run_mode: input.run_mode,
        executor_kind: input.executor_kind ?? 'single_agent',
        model_option_id: input.model_option_id ?? null,
        scenario_id: input.scenario_id,
        scenario_case_id: input.scenario_case_id ?? null,
        current_round_index: input.current_round_index ?? null,
        remaining_round_budget: input.remaining_round_budget ?? null,
        exploration_payload: input.exploration_payload,
        arbiter_payload: input.arbiter_payload,
      }),
      created_by: input.created_by ?? 'system',
    };
  }

  private generateNeedCandidateInputHashPayload(
    input: TopicSelectionWorkflowHarnessGenerateNeedCandidateInput,
  ): Record<string, unknown> {
    return {
      node_id: GENERATE_NEED_CANDIDATE_NODE_ID,
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      workflow_run_id: input.workflow_run_id,
      input_snapshot_id: input.input_snapshot_id ?? null,
      node_attempt_id: input.node_attempt_id,
      topic_scope_ref: input.topic_scope_ref,
      evidence_map_ref: input.evidence_map_ref,
      evidence_strength_ref: input.evidence_strength_ref,
      resource_sample_set_ref: input.resource_sample_set_ref ?? null,
      candidate_pool_projection_ref: input.candidate_pool_projection_ref ?? null,
      evidence_map_handoff_hash: input.evidence_map_handoff ? this.hash(input.evidence_map_handoff) : null,
      search_snapshot_refs: input.search_snapshot_refs,
      resource_snapshot_refs: input.resource_snapshot_refs,
      context_input_refs: input.context_input_refs ?? null,
      policy_version: input.policy_version,
      output_schema_version: input.output_schema_version,
      profile_id: input.profile_id,
      execution_mode: input.execution_mode,
      execution_spec: input.execution_spec ?? null,
      run_mode: input.run_mode,
      executor_kind: input.executor_kind ?? 'single_agent',
      debate_loop_id: input.debate_loop_id ?? null,
      debate_policy_id: input.debate_policy_id ?? null,
      debate_execution_plan: input.debate_execution_plan ?? null,
      debate_slot_execution_overrides: input.debate_slot_execution_overrides ?? null,
      debate_slot_model_option_overrides: input.debate_slot_model_option_overrides ?? null,
      debate_mocked_outputs_hash: input.debate_mocked_outputs ? this.hash(input.debate_mocked_outputs) : null,
      debate_codex_responses_hash: input.debate_codex_responses ? this.hash(input.debate_codex_responses) : null,
      exploration_payload_hash: this.hash(input.exploration_payload),
      arbiter_payload_hash: this.hash(input.arbiter_payload),
      mocked_output_hash: input.mocked_output ? this.hash(input.mocked_output) : null,
      codex_response_hash: input.codex_response ? this.hash(input.codex_response) : null,
      runtime_token_budget_overrides: input.runtime_token_budget_overrides ?? null,
      model_option_id: input.model_option_id ?? null,
      current_round_index: input.current_round_index ?? null,
      remaining_round_budget: input.remaining_round_budget ?? null,
      persist_admitted_candidates: input.persist_admitted_candidates ?? false,
      persistence_context: input.persistence_context ?? null,
      created_by: input.created_by ?? 'system',
    };
  }

  private nodeInput(
    input: TopicSelectionWorkflowHarnessGenerateNeedCandidateInput,
    compiledContext: TopicSelectionNeedDiscoveryCompiledContextPairResult,
  ): TopicSelectionGenerateNeedCandidateNodeInput {
    return {
      schema_version: input.output_schema_version,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      topic_scope_ref: input.topic_scope_ref,
      evidence_map_ref: input.evidence_map_ref,
      evidence_strength_ref: input.evidence_strength_ref,
      resource_sample_set_ref: input.resource_sample_set_ref ?? null,
      candidate_pool_projection_ref: input.candidate_pool_projection_ref ?? null,
      search_snapshot_refs: input.search_snapshot_refs,
      resource_snapshot_refs: input.resource_snapshot_refs,
      exploration_context_ref: compiledContext.exploration_context_ref,
      arbiter_context_ref: compiledContext.arbiter_context_ref,
      execution_mode: input.execution_mode,
      profile_id: input.profile_id,
      policy_version: input.policy_version,
      operator_reuse_approval_ref: null,
    };
  }

  private evaluateAssertions(
    input: TopicSelectionWorkflowHarnessGenerateNeedCandidateInput,
    adapterResult: TopicSelectionGenerateNeedCandidateOrchestratorAdapterResult,
  ): TopicSelectionWorkflowHarnessAssertion[] {
    const expectations = input.expectations ?? {};
    const assertions: TopicSelectionWorkflowHarnessAssertion[] = [
      this.assertion(
        'execution_mode_propagated',
        adapterResult.invocation_result.provenance.execution_mode === input.execution_mode,
        'Agent invocation provenance must use the scenario execution mode.',
        input.execution_mode,
        adapterResult.invocation_result.provenance.execution_mode,
      ),
      this.assertion(
        'node_attempt_propagated',
        adapterResult.node_attempt_id === input.node_attempt_id,
        'Adapter result must belong to the scenario node attempt.',
        input.node_attempt_id,
        adapterResult.node_attempt_id,
      ),
      this.assertion(
        'persistence_requires_finalize',
        !adapterResult.persist_need_candidate_batch_result
          || adapterResult.supplemental_round_routing_decision?.routing_decision === 'finalize_with_admitted_batch',
        'NeedCandidate persistence may only happen after finalize_with_admitted_batch routing.',
        'finalize_with_admitted_batch',
        adapterResult.supplemental_round_routing_decision?.routing_decision ?? null,
      ),
    ];

    if (input.persist_admitted_candidates !== true) {
      assertions.push(this.assertion(
        'explicit_persistence_only',
        adapterResult.persist_need_candidate_batch_result === null,
        'Harness scenarios must not persist NeedCandidates unless persist_admitted_candidates is explicit.',
        null,
        adapterResult.persist_need_candidate_batch_result,
      ));
    }
    if (expectations.status) {
      assertions.push(this.assertion(
        'expected_adapter_status',
        adapterResult.status === expectations.status,
        'Adapter status must match scenario expectation.',
        expectations.status,
        adapterResult.status,
      ));
    }
    if (expectations.routing_decision !== undefined) {
      assertions.push(this.assertion(
        'expected_routing_decision',
        (adapterResult.supplemental_round_routing_decision?.routing_decision ?? null) === expectations.routing_decision,
        'Supplemental routing decision must match scenario expectation.',
        expectations.routing_decision,
        adapterResult.supplemental_round_routing_decision?.routing_decision ?? null,
      ));
    }
    const admittedCount = adapterResult.candidate_draft_admission_report?.draft_results
      .filter((result) => result.decision === 'admit').length ?? 0;
    const persistedCount = adapterResult.persist_need_candidate_batch_result?.persisted_candidate_refs.length ?? 0;
    if (expectations.admitted_draft_count !== undefined && expectations.admitted_draft_count !== null) {
      assertions.push(this.assertion(
        'expected_admitted_draft_count',
        admittedCount === expectations.admitted_draft_count,
        'Admitted draft count must match scenario expectation.',
        expectations.admitted_draft_count,
        admittedCount,
      ));
    }
    if (expectations.min_admitted_draft_count !== undefined && expectations.min_admitted_draft_count !== null) {
      assertions.push(this.assertion(
        'expected_min_admitted_draft_count',
        admittedCount >= expectations.min_admitted_draft_count,
        'Admitted draft count must be at least the scenario minimum.',
        expectations.min_admitted_draft_count,
        admittedCount,
      ));
    }
    if (expectations.max_admitted_draft_count !== undefined && expectations.max_admitted_draft_count !== null) {
      assertions.push(this.assertion(
        'expected_max_admitted_draft_count',
        admittedCount <= expectations.max_admitted_draft_count,
        'Admitted draft count must not exceed the scenario maximum.',
        expectations.max_admitted_draft_count,
        admittedCount,
      ));
    }
    if (expectations.persisted_candidate_count !== undefined && expectations.persisted_candidate_count !== null) {
      assertions.push(this.assertion(
        'expected_persisted_candidate_count',
        persistedCount === expectations.persisted_candidate_count,
        'Persisted NeedCandidate count must match scenario expectation.',
        expectations.persisted_candidate_count,
        persistedCount,
      ));
    }
    if (expectations.min_persisted_candidate_count !== undefined && expectations.min_persisted_candidate_count !== null) {
      assertions.push(this.assertion(
        'expected_min_persisted_candidate_count',
        persistedCount >= expectations.min_persisted_candidate_count,
        'Persisted NeedCandidate count must be at least the scenario minimum.',
        expectations.min_persisted_candidate_count,
        persistedCount,
      ));
    }
    if (expectations.max_persisted_candidate_count !== undefined && expectations.max_persisted_candidate_count !== null) {
      assertions.push(this.assertion(
        'expected_max_persisted_candidate_count',
        persistedCount <= expectations.max_persisted_candidate_count,
        'Persisted NeedCandidate count must not exceed the scenario maximum.',
        expectations.max_persisted_candidate_count,
        persistedCount,
      ));
    }
    if (expectations.error_code !== undefined) {
      assertions.push(this.assertion(
        'expected_error_code',
        (adapterResult.error_code ?? null) === expectations.error_code,
        'Adapter error code must match scenario expectation.',
        expectations.error_code,
        adapterResult.error_code ?? null,
      ));
    }
    if (expectations.blocker_codes) {
      const missing = expectations.blocker_codes.filter((code) => !adapterResult.blocker_codes.includes(code));
      assertions.push(this.assertion(
        'expected_blocker_codes',
        missing.length === 0,
        'Adapter blocker codes must include expected scenario blockers.',
        expectations.blocker_codes,
        adapterResult.blocker_codes,
      ));
    }
    if (expectations.persistence === 'required') {
      assertions.push(this.assertion(
        'expected_persistence_required',
        Boolean(adapterResult.persist_need_candidate_batch_command && adapterResult.persist_need_candidate_batch_result),
        'Scenario requires a persisted NeedCandidate batch command and result.',
        'persisted batch result',
        adapterResult.persist_need_candidate_batch_result,
      ));
    }
    if (expectations.persistence === 'forbidden') {
      assertions.push(this.assertion(
        'expected_persistence_forbidden',
        adapterResult.persist_need_candidate_batch_command === null
          && adapterResult.persist_need_candidate_batch_result === null,
        'Scenario forbids authority persistence.',
        null,
        adapterResult.persist_need_candidate_batch_result,
      ));
    }
    return assertions;
  }

  private traceSnapshot(input: {
    input: TopicSelectionWorkflowHarnessGenerateNeedCandidateInput;
    inputHash: string;
    nodeInput: TopicSelectionGenerateNeedCandidateNodeInput;
    compiledContext: TopicSelectionNeedDiscoveryCompiledContextPairResult;
    adapterResult: TopicSelectionGenerateNeedCandidateOrchestratorAdapterResult;
    assertions: TopicSelectionWorkflowHarnessAssertion[];
    scenarioStatus: 'passed' | 'failed';
  }): TopicSelectionWorkflowHarnessTraceSnapshot {
    return {
      schema_version: 'topic-selection-workflow-harness-trace-v1',
      payload_schema: HARNESS_TRACE_PAYLOAD_SCHEMA,
      scenario_id: input.input.scenario_id,
      scenario_case_id: input.input.scenario_case_id ?? null,
      node_id: GENERATE_NEED_CANDIDATE_NODE_ID,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      scenario_status: input.scenarioStatus,
      input_hash: input.inputHash,
      execution_mode: input.input.execution_mode,
      run_mode: input.input.run_mode,
      node_input: input.nodeInput,
      compiled_context: input.compiledContext,
      adapter_result: input.adapterResult,
      adapter_status: input.adapterResult.status,
      routing_decision: input.adapterResult.supplemental_round_routing_decision?.routing_decision ?? null,
      context_packet_refs: [
        input.compiledContext.exploration_context_ref,
        input.compiledContext.arbiter_context_ref,
      ],
      artifact_refs: this.uniqueArtifactRefs([
        input.compiledContext.exploration_context_ref,
        input.compiledContext.arbiter_context_ref,
        ...this.adapterArtifactRefs(input.adapterResult),
      ]),
      authority_refs: input.adapterResult.persist_need_candidate_batch_result?.persisted_candidate_refs ?? [],
      warning_codes: input.adapterResult.warning_codes,
      blocker_codes: input.adapterResult.blocker_codes,
      assertions: input.assertions,
      created_at: this.now(),
    };
  }

  private traceSourceRefs(
    compiledContext: TopicSelectionNeedDiscoveryCompiledContextPairResult,
    adapterResult: TopicSelectionGenerateNeedCandidateOrchestratorAdapterResult,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      compiledContext.exploration_context_ref,
      compiledContext.arbiter_context_ref,
      adapterResult.invocation_result.audit_artifact_ref ?? null,
      ...this.adapterArtifactRefs(adapterResult),
      ...(adapterResult.persist_need_candidate_batch_result?.persisted_candidate_refs ?? []),
    ]);
  }

  private adapterArtifactRefs(
    adapterResult: TopicSelectionGenerateNeedCandidateOrchestratorAdapterResult,
  ): TopicSelectionArtifactFunctionalRef[] {
    return [
      adapterResult.context_compression_report_artifact?.artifact_ref ?? null,
      adapterResult.ranked_candidate_draft_batch_artifact?.artifact_ref ?? null,
      ...(adapterResult.debate_result?.role_output_artifacts.map((artifact) => artifact.artifact_ref) ?? []),
      ...(adapterResult.debate_result?.role_level_summary_artifacts.map((artifact) => artifact.artifact_ref) ?? []),
      adapterResult.debate_result?.issue_frame_artifact?.artifact_ref ?? null,
      adapterResult.debate_result?.final_synthesis_artifact?.artifact_ref ?? null,
      adapterResult.minimum_schema_validation_report_artifact?.artifact_ref ?? null,
      adapterResult.candidate_draft_admission_report_artifact?.artifact_ref ?? null,
      adapterResult.supplemental_round_routing_decision_artifact?.artifact_ref ?? null,
      adapterResult.persist_need_candidate_batch_command_artifact?.artifact_ref ?? null,
    ].filter((ref): ref is TopicSelectionArtifactFunctionalRef => Boolean(ref));
  }

  private defaultContextInputRefs(
    input: TopicSelectionWorkflowHarnessGenerateNeedCandidateInput,
  ): TopicSelectionFunctionalRef[] {
    const handoff = input.evidence_map_handoff ?? null;
    return this.uniqueRefs([
      input.topic_scope_ref,
      input.evidence_map_ref,
      input.evidence_strength_ref,
      input.resource_sample_set_ref ?? null,
      input.candidate_pool_projection_ref ?? null,
      handoff?.handoff_ref ?? null,
      handoff?.search_run_ref ?? null,
      handoff?.search_plan_ref ?? null,
      handoff?.literature_resource_pool_snapshot_ref ?? null,
      handoff?.need_validation_evidence_bundle_ref ?? null,
      ...input.search_snapshot_refs,
      ...input.resource_snapshot_refs,
    ]);
  }

  private assertion(
    assertionId: string,
    passed: boolean,
    message: string,
    expected?: unknown,
    actual?: unknown,
  ): TopicSelectionWorkflowHarnessAssertion {
    return {
      assertion_id: assertionId,
      passed,
      message,
      expected,
      actual,
    };
  }

  private topicSeedAuditRefs(topicSeed: TopicSelectionTopicSeedRecord): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      topicSeed.input_snapshot_id
        ? this.ref('input_snapshot', topicSeed.input_snapshot_id, topicSeed.title_card_id)
        : null,
      topicSeed.gate_result_id
        ? this.ref('readiness_gate_result', topicSeed.gate_result_id, topicSeed.title_card_id)
        : null,
      topicSeed.transition_attempt_id
        ? this.ref('chain_transition_attempt', topicSeed.transition_attempt_id, topicSeed.title_card_id)
        : null,
    ]);
  }

  private literatureResourcePoolSnapshotAuditRefs(
    snapshot: TopicSelectionLiteratureResourcePoolSnapshotRecord,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      snapshot.input_snapshot_id
        ? this.ref('input_snapshot', snapshot.input_snapshot_id, snapshot.title_card_id)
        : null,
      snapshot.gate_result_id
        ? this.ref('readiness_gate_result', snapshot.gate_result_id, snapshot.title_card_id)
        : null,
      snapshot.transition_attempt_id
        ? this.ref('chain_transition_attempt', snapshot.transition_attempt_id, snapshot.title_card_id)
        : null,
    ]);
  }

  private searchPlanAuditRefs(searchPlan: TopicSelectionSearchPlanRecord): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      searchPlan.input_snapshot_id
        ? this.ref('input_snapshot', searchPlan.input_snapshot_id, searchPlan.title_card_id)
        : null,
      searchPlan.workflow_run_id
        ? this.ref('workflow_run', searchPlan.workflow_run_id, searchPlan.title_card_id)
        : null,
      searchPlan.gate_result_id
        ? this.ref('readiness_gate_result', searchPlan.gate_result_id, searchPlan.title_card_id)
        : null,
      searchPlan.transition_attempt_id
        ? this.ref('chain_transition_attempt', searchPlan.transition_attempt_id, searchPlan.title_card_id)
        : null,
    ]);
  }

  private blockerCodesFromAppError(error: AppError): string[] {
    const blockerCodes = error.details?.blocker_codes;
    if (Array.isArray(blockerCodes)) {
      const stringCodes = blockerCodes.filter((code): code is string => typeof code === 'string' && code.trim().length > 0);
      if (stringCodes.length > 0) {
        return this.uniqueStrings(stringCodes);
      }
    }
    return [error.errorCode];
  }

  private warningCodesFromAppError(error: AppError): string[] {
    const warningCodes = error.details?.warning_codes;
    if (!Array.isArray(warningCodes)) {
      return [];
    }
    return this.uniqueStrings(warningCodes.filter((code): code is string => typeof code === 'string' && code.trim().length > 0));
  }

  private reviewReasonCodesFromAppError(error: AppError): string[] {
    const reviewReasonCodes = error.details?.review_reason_codes;
    if (!Array.isArray(reviewReasonCodes)) {
      return [];
    }
    return this.uniqueStrings(
      reviewReasonCodes.filter((code): code is string => typeof code === 'string' && code.trim().length > 0),
    );
  }

  private sourceHealthSummaryFromAppError(error: AppError): TopicSelectionSourceHealthSummary | null {
    const sourceHealthSummary = error.details?.source_health_summary;
    if (!sourceHealthSummary || typeof sourceHealthSummary !== 'object') {
      return null;
    }
    const candidate = sourceHealthSummary as Partial<TopicSelectionSourceHealthSummary>;
    if (!Array.isArray(candidate.warning_codes) || !Array.isArray(candidate.missing_literature_ids)) {
      return null;
    }
    return sourceHealthSummary as TopicSelectionSourceHealthSummary;
  }

  private auditRefsFromAppError(error: AppError, fallbackTitleCardId: string): TopicSelectionFunctionalRef[] {
    const details = error.details;
    return this.uniqueRefs([
      this.refFromDetail('input_snapshot', details?.input_snapshot_id, details?.title_card_id, fallbackTitleCardId),
      this.refFromDetail('readiness_gate_result', details?.gate_result_id, details?.title_card_id, fallbackTitleCardId),
      this.refFromDetail(
        'chain_transition_attempt',
        details?.transition_attempt_id,
        details?.title_card_id,
        fallbackTitleCardId,
      ),
    ]);
  }

  private refFromDetail(
    refType: string,
    refId: unknown,
    titleCardId: unknown,
    fallbackTitleCardId: string,
  ): TopicSelectionFunctionalRef | null {
    if (typeof refId !== 'string' || refId.trim().length === 0) {
      return null;
    }
    return this.ref(
      refType,
      refId,
      typeof titleCardId === 'string' && titleCardId.trim().length > 0 ? titleCardId : fallbackTitleCardId,
    );
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId: string | null,
    versionId: string | null = null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      version_id: versionId,
      title_card_id: titleCardId,
    };
  }

  private requiredControlPlane(): TopicSelectionControlPlaneService {
    if (!this.dependencies.controlPlane) {
      throw new AppError(500, 'INTERNAL_ERROR', 'WorkflowHarness create-topic-seed requires controlPlane dependency.');
    }
    return this.dependencies.controlPlane;
  }

  private requiredSearchResources(): TopicSelectionSearchResourceService {
    if (!this.dependencies.searchResources) {
      throw new AppError(500, 'INTERNAL_ERROR', 'WorkflowHarness create-topic-seed requires searchResources dependency.');
    }
    return this.dependencies.searchResources;
  }

  private requiredEvidenceMaps(): TopicSelectionEvidenceMapService {
    if (!this.dependencies.evidenceMaps) {
      throw new AppError(500, 'INTERNAL_ERROR', 'WorkflowHarness build-evidence-map requires evidenceMaps dependency.');
    }
    return this.dependencies.evidenceMaps;
  }

  private requiredEvidenceMapMaterializer(): TopicSelectionEvidenceMapMaterializationService {
    if (!this.dependencies.evidenceMapMaterializer) {
      throw new AppError(500, 'INTERNAL_ERROR', 'WorkflowHarness build-evidence-map requires evidenceMapMaterializer dependency.');
    }
    return this.dependencies.evidenceMapMaterializer;
  }

  private requiredEvidenceMapExtractionAgent(): TopicSelectionAgentOrchestratorService {
    if (!this.dependencies.evidenceMapExtractionAgent) {
      throw new AppError(500, 'INTERNAL_ERROR', 'WorkflowHarness build-evidence-map requires evidenceMapExtractionAgent dependency.');
    }
    return this.dependencies.evidenceMapExtractionAgent;
  }

  private requiredNeedValidation(): TopicSelectionNeedValidationService {
    if (!this.dependencies.needValidation) {
      throw new AppError(500, 'INTERNAL_ERROR', 'WorkflowHarness validate-need-adjudication requires needValidation dependency.');
    }
    return this.dependencies.needValidation;
  }

  private requiredNeedAdjudicationAgent(): TopicSelectionAgentOrchestratorService {
    if (this.dependencies.needAdjudicationAgent) {
      return this.dependencies.needAdjudicationAgent;
    }
    if (this.dependencies.evidenceMapExtractionAgent) {
      return this.dependencies.evidenceMapExtractionAgent;
    }
    throw new AppError(500, 'INTERNAL_ERROR', 'WorkflowHarness validate-need-adjudication requires needAdjudicationAgent dependency.');
  }

  private requiredHumanConfirmationSemanticReviewAgent(): TopicSelectionAgentOrchestratorService {
    if (this.dependencies.humanConfirmationSemanticReviewAgent) {
      return this.dependencies.humanConfirmationSemanticReviewAgent;
    }
    if (this.dependencies.needAdjudicationAgent) {
      return this.dependencies.needAdjudicationAgent;
    }
    if (this.dependencies.evidenceMapExtractionAgent) {
      return this.dependencies.evidenceMapExtractionAgent;
    }
    throw new AppError(500, 'INTERNAL_ERROR', 'WorkflowHarness human-confirm-need requires humanConfirmationSemanticReviewAgent dependency.');
  }

  private assertCreateTopicSeedScenarioInput(input: TopicSelectionWorkflowHarnessCreateTopicSeedInput): void {
    this.assertNonEmpty(input.scenario_id, 'scenario_id');
    this.assertNonEmpty(input.title_card_id, 'title_card_id');
    this.assertNonEmpty(input.workflow_run_id, 'workflow_run_id');
    this.assertNonEmpty(input.node_attempt_id, 'node_attempt_id');
    this.assertNonEmpty(input.policy_version, 'policy_version');
    this.assertNonEmpty(input.output_schema_version, 'output_schema_version');
    if (input.seed_version !== undefined && input.seed_version !== null) {
      this.assertNonEmpty(input.seed_version, 'seed_version');
    }
    if (input.intent_summary !== undefined && input.intent_summary !== null) {
      this.assertNonEmpty(input.intent_summary, 'intent_summary');
    }
    if (input.intent_preparation_refs) {
      this.assertFunctionalRefs(input.intent_preparation_refs, 'intent_preparation_refs');
    }
  }

  private assertSnapshotLiteratureResourcePoolScenarioInput(
    input: TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolInput,
  ): void {
    this.assertNonEmpty(input.scenario_id, 'scenario_id');
    this.assertNonEmpty(input.title_card_id, 'title_card_id');
    this.assertNonEmpty(input.workflow_run_id, 'workflow_run_id');
    this.assertNonEmpty(input.node_attempt_id, 'node_attempt_id');
    this.assertFunctionalRef(input.topic_seed_ref, 'topic_seed_ref');
    if (input.topic_seed_ref.ref_type !== 'topic_seed') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'topic_seed_ref.ref_type must be topic_seed.');
    }
    this.assertNonEmpty(input.topic_seed_ref.version_id, 'topic_seed_ref.version_id');
    if (!input.topic_seed_ref.title_card_id) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'topic_seed_ref.title_card_id cannot be empty.');
    }
    if (input.topic_seed_ref.title_card_id !== input.title_card_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'topic_seed_ref belongs to a different title card.');
    }
    this.assertNonEmpty(input.source_scope, 'source_scope');
    if (input.resource_sample_set_provenance_ref) {
      this.assertFunctionalRef(input.resource_sample_set_provenance_ref, 'resource_sample_set_provenance_ref');
    }
    this.assertNonEmpty(input.policy_version, 'policy_version');
    this.assertNonEmpty(input.output_schema_version, 'output_schema_version');
  }

  private assertCreateSearchPlanScenarioInput(input: TopicSelectionWorkflowHarnessCreateSearchPlanInput): void {
    this.assertNonEmpty(input.scenario_id, 'scenario_id');
    this.assertNonEmpty(input.title_card_id, 'title_card_id');
    this.assertNonEmpty(input.workflow_run_id, 'workflow_run_id');
    this.assertNonEmpty(input.node_attempt_id, 'node_attempt_id');
  }

  private assertRecordSearchRunScenarioInput(input: TopicSelectionWorkflowHarnessRecordSearchRunInput): void {
    this.assertNonEmpty(input.scenario_id, 'scenario_id');
    this.assertNonEmpty(input.title_card_id, 'title_card_id');
    this.assertNonEmpty(input.workflow_run_id, 'workflow_run_id');
    this.assertNonEmpty(input.node_attempt_id, 'node_attempt_id');
  }

  private assertSingleAgentExecutionSpec(input: {
    execution_mode: TopicSelectionAgentExecutionMode;
    execution_spec?: TopicSelectionAgentExecutionSpec | null;
    model_option_id?: string | null;
  }): void {
    const spec = input.execution_spec;
    const modelOptionId = input.model_option_id?.trim() || null;
    if (spec && spec.execution_mode !== input.execution_mode) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'execution_spec.execution_mode must match execution_mode.');
    }
    const specModelOptionId = spec?.model_option_id?.trim() || null;
    if (modelOptionId && specModelOptionId && modelOptionId !== specModelOptionId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'execution_spec.model_option_id must match model_option_id.');
    }
    if (input.execution_mode !== 'provider_llm' && (modelOptionId || specModelOptionId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'model_option_id requires execution_mode=provider_llm.');
    }
  }

  private assertBuildEvidenceMapScenarioInput(input: TopicSelectionWorkflowHarnessBuildEvidenceMapInput): void {
    this.assertNonEmpty(input.scenario_id, 'scenario_id');
    this.assertNonEmpty(input.title_card_id, 'title_card_id');
    this.assertNonEmpty(input.workflow_run_id, 'workflow_run_id');
    this.assertNonEmpty(input.node_attempt_id, 'node_attempt_id');
    this.assertNonEmpty(input.policy_version, 'policy_version');
    this.assertNonEmpty(input.output_schema_version, 'output_schema_version');
    if (!input.search_run_handoff) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'search_run_handoff is required.');
    }
    this.assertFunctionalRef(input.search_run_handoff.search_run_ref, 'search_run_handoff.search_run_ref');
    this.assertFunctionalRef(input.search_run_handoff.search_plan_ref, 'search_run_handoff.search_plan_ref');
    this.assertFunctionalRef(
      input.search_run_handoff.literature_resource_pool_snapshot_ref,
      'search_run_handoff.literature_resource_pool_snapshot_ref',
    );
    if (input.search_run_handoff.search_run_ref.title_card_id !== input.title_card_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'search_run_handoff belongs to a different title card.');
    }
    if (input.execution_mode === 'none' && !input.extraction_draft) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'execution_mode=none requires extraction_draft.');
    }
    if (input.execution_mode === 'none') {
      if (input.execution_spec) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'execution_spec is only allowed for model-like evidence extraction.');
      }
      if (input.model_option_id?.trim()) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'model_option_id requires model-like evidence extraction.');
      }
    } else {
      this.assertSingleAgentExecutionSpec({
        execution_mode: input.execution_mode,
        execution_spec: input.execution_spec ?? null,
        model_option_id: input.model_option_id ?? null,
      });
    }
    if (input.execution_mode !== 'none' && !input.extraction_context_packet) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'model-like evidence extraction requires extraction_context_packet.');
    }
    if (input.extraction_context_packet_ref) {
      this.assertFunctionalRef(input.extraction_context_packet_ref, 'extraction_context_packet_ref');
    }
    if (input.revision_of_attempt_ref) {
      this.assertFunctionalRef(input.revision_of_attempt_ref, 'revision_of_attempt_ref');
    }
    if (input.review_package_ref) {
      this.assertFunctionalRef(input.review_package_ref, 'review_package_ref');
    }
    if (input.operator_reuse_approval_ref) {
      this.assertFunctionalRef(input.operator_reuse_approval_ref, 'operator_reuse_approval_ref');
    }
  }

  private assertHumanConfirmNeedScenarioInput(input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput): void {
    this.assertNonEmpty(input.scenario_id, 'scenario_id');
    this.assertNonEmpty(input.title_card_id, 'title_card_id');
    this.assertNonEmpty(input.workflow_run_id, 'workflow_run_id');
    this.assertNonEmpty(input.node_attempt_id, 'node_attempt_id');
    this.assertFunctionalRef(input.adjudication_result_ref, 'adjudication_result_ref');
    this.assertFunctionalRef(input.need_candidate_ref, 'need_candidate_ref');
    this.assertFunctionalRef(input.validation_support_packet_ref, 'validation_support_packet_ref');
    this.assertFunctionalRef(input.reserved_validated_need_ref, 'reserved_validated_need_ref');
    if (input.adjudication_result_ref.ref_type !== 'validate_need_adjudication_result') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'adjudication_result_ref.ref_type must be validate_need_adjudication_result.');
    }
    if (input.need_candidate_ref.ref_type !== 'need_candidate') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'need_candidate_ref.ref_type must be need_candidate.');
    }
    if (input.validation_support_packet_ref.ref_type !== 'validation_decision_support_packet') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'validation_support_packet_ref.ref_type must be validation_decision_support_packet.');
    }
    if (input.reserved_validated_need_ref.ref_type !== 'validated_need') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'reserved_validated_need_ref.ref_type must be validated_need.');
    }
    this.assertNonEmpty(input.policy_version, 'policy_version');
    this.assertNonEmpty(input.output_schema_version, 'output_schema_version');
    if (!input.confirmation_input || typeof input.confirmation_input !== 'object') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'confirmation_input is required.');
    }
    if (input.confirmation_input.schema_version !== TOPIC_SELECTION_HUMAN_CONFIRMATION_INPUT_SCHEMA_VERSION) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'confirmation_input schema_version must be HumanConfirmationInput@v1.');
    }
    if (!['human', 'hybrid', 'human_delegated'].includes(input.confirmation_input.actor_mode)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'confirmation_input.actor_mode is invalid.');
    }
    if (
      input.confirmation_input.accountable_human_ref.actor_type !== 'human'
      && input.confirmation_input.accountable_human_ref.actor_type !== 'hybrid'
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'confirmation_input.accountable_human_ref must be human or hybrid.');
    }
    if (!input.confirmation_input.rationale?.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'confirmation_input.rationale is required.');
    }
    if (input.confirmation_input.actor_mode === 'human_delegated') {
      if (!input.confirmation_input.delegated_executor) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'human_delegated confirmation requires delegated_executor.');
      }
      if (input.confirmation_input.delegated_executor.policy_id !== 'n8-validate-only-delegation-v1') {
        throw new AppError(400, 'INVALID_PAYLOAD', 'delegated_executor.policy_id must be n8-validate-only-delegation-v1.');
      }
    } else if (input.confirmation_input.delegated_executor) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'delegated_executor is only allowed for human_delegated confirmation.');
    }
    const executionMode = input.execution_mode ?? 'codex_assisted';
    if (!['deterministic_parser', 'mocked_llm', 'codex_assisted', 'provider_llm'].includes(executionMode)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'execution_mode is invalid.');
    }
    if (executionMode === 'deterministic_parser') {
      if (input.execution_spec) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'execution_spec is only allowed for model-like human confirmation review.');
      }
      if (input.model_option_id?.trim()) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'model_option_id requires model-like human confirmation review.');
      }
    } else {
      this.assertSingleAgentExecutionSpec({
        execution_mode: executionMode,
        execution_spec: input.execution_spec ?? null,
        model_option_id: input.model_option_id ?? null,
      });
    }
  }

  private humanConfirmNeedNodeInput(
    input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput,
  ): TopicSelectionWorkflowHarnessHumanConfirmNeedNodeInput {
    return {
      schema_version: 'TopicSelectionHumanConfirmNeedNodeInput@v1',
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      title_card_ref: this.ref('title_card', input.title_card_id, input.title_card_id),
      adjudication_result_ref: input.adjudication_result_ref,
      need_candidate_ref: input.need_candidate_ref,
      validation_support_packet_ref: input.validation_support_packet_ref,
      reserved_validated_need_ref: input.reserved_validated_need_ref,
      confirmation_input: input.confirmation_input,
      execution_mode: input.execution_mode ?? 'codex_assisted',
      execution_spec: input.execution_spec ?? null,
      run_mode: input.run_mode ?? 'acceptance',
      executor_kind: input.executor_kind ?? 'single_agent',
      model_option_id: input.model_option_id ?? null,
      profile_id: input.profile_id ?? TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
      policy_version: input.policy_version,
      output_schema_version: input.output_schema_version,
    };
  }

  private humanConfirmNeedInputHashPayload(
    input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput,
    nodeInput: TopicSelectionWorkflowHarnessHumanConfirmNeedNodeInput,
  ): Record<string, unknown> {
    return {
      node_id: HUMAN_CONFIRM_NEED_NODE_ID,
      node_input: nodeInput,
      run_mode: input.run_mode ?? 'acceptance',
      executor_kind: input.executor_kind ?? 'single_agent',
      model_option_id: input.model_option_id ?? null,
      runtime_token_budget_overrides: input.runtime_token_budget_overrides ?? null,
      mocked_output_hash: input.mocked_output ? this.hash(input.mocked_output) : null,
      codex_response_hash: input.codex_response ? this.hash(input.codex_response) : null,
    };
  }

  private assertScenarioInput(input: TopicSelectionWorkflowHarnessGenerateNeedCandidateInput): void {
    this.assertNonEmpty(input.scenario_id, 'scenario_id');
    this.assertNonEmpty(input.title_card_id, 'title_card_id');
    this.assertNonEmpty(input.workflow_run_id, 'workflow_run_id');
    this.assertNonEmpty(input.node_attempt_id, 'node_attempt_id');
    this.assertNonEmpty(input.policy_version, 'policy_version');
    this.assertNonEmpty(input.output_schema_version, 'output_schema_version');
    this.assertNonEmpty(input.profile_id, 'profile_id');
    this.assertFunctionalRef(input.topic_scope_ref, 'topic_scope_ref');
    this.assertFunctionalRef(input.evidence_map_ref, 'evidence_map_ref');
    this.assertFunctionalRef(input.evidence_strength_ref, 'evidence_strength_ref');
    if (input.resource_sample_set_ref) {
      this.assertFunctionalRef(input.resource_sample_set_ref, 'resource_sample_set_ref');
    }
    if (input.candidate_pool_projection_ref) {
      this.assertFunctionalRef(input.candidate_pool_projection_ref, 'candidate_pool_projection_ref');
    }
    this.assertFunctionalRefs(input.search_snapshot_refs, 'search_snapshot_refs');
    this.assertFunctionalRefs(input.resource_snapshot_refs, 'resource_snapshot_refs');
    if (input.context_input_refs) {
      this.assertFunctionalRefs(input.context_input_refs, 'context_input_refs');
    }
    if (input.evidence_map_handoff) {
      this.assertEvidenceMapHandoffForGenerateNeedCandidate(input);
    }
    this.assertNoForbiddenGenerateNeedCandidateBusinessRefs(input);
  }

  private assertEvidenceMapHandoffForGenerateNeedCandidate(
    input: TopicSelectionWorkflowHarnessGenerateNeedCandidateInput,
  ): void {
    const handoff = input.evidence_map_handoff;
    if (!handoff) {
      return;
    }
    if (handoff.schema_version !== TOPIC_SELECTION_EVIDENCE_MAP_HANDOFF_SCHEMA_VERSION) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'evidence_map_handoff schema_version is unsupported.');
    }
    this.assertFunctionalRef(handoff.handoff_ref, 'evidence_map_handoff.handoff_ref');
    this.assertFunctionalRef(handoff.title_card_ref, 'evidence_map_handoff.title_card_ref');
    this.assertFunctionalRef(handoff.evidence_map_ref, 'evidence_map_handoff.evidence_map_ref');
    this.assertFunctionalRef(handoff.search_run_ref, 'evidence_map_handoff.search_run_ref');
    this.assertFunctionalRef(handoff.search_plan_ref, 'evidence_map_handoff.search_plan_ref');
    this.assertFunctionalRef(
      handoff.literature_resource_pool_snapshot_ref,
      'evidence_map_handoff.literature_resource_pool_snapshot_ref',
    );
    if (handoff.materialization_report_ref) {
      this.assertFunctionalRef(
        handoff.materialization_report_ref,
        'evidence_map_handoff.materialization_report_ref',
      );
    }
    if (handoff.need_validation_evidence_bundle_ref) {
      this.assertFunctionalRef(
        handoff.need_validation_evidence_bundle_ref,
        'evidence_map_handoff.need_validation_evidence_bundle_ref',
      );
    }
    if (handoff.title_card_ref.ref_id !== input.title_card_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'evidence_map_handoff belongs to a different title card.');
    }
    if (!this.sameFunctionalRef(input.evidence_map_ref, handoff.evidence_map_ref)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'evidence_map_ref must match evidence_map_handoff.evidence_map_ref.');
    }
    if (!input.search_snapshot_refs.some((ref) => this.sameFunctionalRef(ref, handoff.search_run_ref))) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'search_snapshot_refs must include evidence_map_handoff.search_run_ref.',
      );
    }
    if (!input.resource_snapshot_refs.some((ref) =>
      this.sameFunctionalRef(ref, handoff.literature_resource_pool_snapshot_ref)
    )) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'resource_snapshot_refs must include evidence_map_handoff.literature_resource_pool_snapshot_ref.',
      );
    }
  }

  private assertNoForbiddenGenerateNeedCandidateBusinessRefs(
    input: TopicSelectionWorkflowHarnessGenerateNeedCandidateInput,
  ): void {
    const refs = this.uniqueRefs([
      input.topic_scope_ref,
      input.evidence_map_ref,
      input.evidence_strength_ref,
      input.resource_sample_set_ref ?? null,
      input.candidate_pool_projection_ref ?? null,
      ...(input.context_input_refs ?? []),
      ...input.search_snapshot_refs,
      ...input.resource_snapshot_refs,
    ]);
    for (const ref of refs) {
      if (GENERATE_NEED_CANDIDATE_FORBIDDEN_BUSINESS_REF_TYPES.has(ref.ref_type)) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          `generate-need-candidate cannot consume ${ref.ref_type} as a business input ref.`,
        );
      }
    }
  }

  private assertFunctionalRefs(value: unknown, fieldName: string): asserts value is TopicSelectionFunctionalRef[] {
    if (!Array.isArray(value)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must be an array.`);
    }
    value.forEach((ref, index) => this.assertFunctionalRef(ref, `${fieldName}[${index}]`));
  }

  private assertFunctionalRef(value: unknown, fieldName: string): asserts value is TopicSelectionFunctionalRef {
    if (!value || typeof value !== 'object') {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must be a functional ref.`);
    }
    const candidate = value as Partial<TopicSelectionFunctionalRef>;
    this.assertNonEmpty(candidate.ref_type, `${fieldName}.ref_type`);
    this.assertNonEmpty(candidate.ref_id, `${fieldName}.ref_id`);
  }

  private assertNonEmpty(value: unknown, fieldName: string): asserts value is string {
    if (typeof value !== 'string') {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} cannot be empty.`);
    }
    if (!value.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} cannot be empty.`);
    }
  }

  private hasNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private isStringArray(value: unknown): value is string[] {
    return Array.isArray(value)
      && value.every((item) => typeof item === 'string' && item.trim().length > 0);
  }

  private isNonEmptyStringArray(value: unknown): value is string[] {
    return this.isStringArray(value) && value.length > 0 && value.every((item) => item.trim().length > 0);
  }

  private isPlainRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private objectPayload(value: unknown): Record<string, unknown> {
    return this.isPlainRecord(value) ? value : {};
  }

  private isFunctionalRef(value: unknown): value is TopicSelectionFunctionalRef {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const candidate = value as Partial<TopicSelectionFunctionalRef>;
    return this.hasNonEmptyString(candidate.ref_type) && this.hasNonEmptyString(candidate.ref_id);
  }

  private isTitleCardScopedRef(value: unknown, refType: string, titleCardId: string): value is TopicSelectionFunctionalRef {
    return this.isFunctionalRef(value)
      && value.ref_type === refType
      && value.title_card_id === titleCardId;
  }

  private isNullableFunctionalRef(value: unknown): value is TopicSelectionFunctionalRef | null {
    return value === null || this.isFunctionalRef(value);
  }

  private isRawArtifactAuthorityRef(ref: TopicSelectionFunctionalRef): boolean {
    return ref.ref_type === 'artifact_ref' || ref.ref_type === 'raw_search_log';
  }

  private isSearchRunEvidenceMapInputRef(value: unknown): value is TopicSelectionFunctionalRef {
    return this.isFunctionalRef(value) && SEARCH_RUN_EVIDENCE_MAP_INPUT_REF_TYPES.has(value.ref_type);
  }

  private isSearchRunEvidenceBindingSourceRef(value: unknown): value is TopicSelectionFunctionalRef {
    return this.isFunctionalRef(value) && SEARCH_RUN_EVIDENCE_BINDING_SOURCE_REF_TYPES.has(value.ref_type);
  }

  private isSearchCoverageRiskRef(value: unknown): value is TopicSelectionFunctionalRef {
    return this.isFunctionalRef(value) && SEARCH_RUN_COVERAGE_RISK_REF_TYPES.has(value.ref_type);
  }

  private isConsumableSearchRunStatus(status: TopicSelectionSearchRunRecord['run_status']): boolean {
    return status === 'succeeded' || status === 'partial';
  }

  private sameFunctionalRef(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return left.ref_type === right.ref_type
      && left.ref_id === right.ref_id
      && (left.version_id ?? null) === (right.version_id ?? null);
  }

  private sameFunctionalRefArray(left: TopicSelectionFunctionalRef[], right: TopicSelectionFunctionalRef[]): boolean {
    return left.length === right.length
      && left.every((leftRef, index) => this.refIdentity(leftRef) === this.refIdentity(right[index]!));
  }

  private refIdentity(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
  }

  private isSearchPlanBlueprintOrigin(value: unknown): value is TopicSelectionSearchPlanBlueprintOrigin {
    return typeof value === 'string'
      && (TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_ORIGINS as readonly string[]).includes(value);
  }

  private isCoverageIntentType(value: unknown): value is TopicSelectionCoverageIntentType {
    return typeof value === 'string' && (TOPIC_SELECTION_COVERAGE_INTENT_TYPES as readonly string[]).includes(value);
  }

  private isEvidenceRole(value: unknown): value is TopicSelectionEvidenceRole {
    return typeof value === 'string' && (TOPIC_SELECTION_EVIDENCE_ROLES as readonly string[]).includes(value);
  }

  private uniqueRefs(refs: Array<TopicSelectionFunctionalRef | null | undefined>): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const result: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      if (!ref) {
        continue;
      }
      const key = this.refIdentity(ref);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(ref);
    }
    return result;
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values)];
  }

  private uniqueArtifactRefs(
    refs: Array<TopicSelectionArtifactFunctionalRef | null | undefined>,
  ): TopicSelectionArtifactFunctionalRef[] {
    return this.uniqueRefs(refs).filter((ref): ref is TopicSelectionArtifactFunctionalRef =>
      ref.ref_type === 'artifact_ref',
    );
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }
}
