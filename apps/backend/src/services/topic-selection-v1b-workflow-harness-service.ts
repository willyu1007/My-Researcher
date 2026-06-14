import crypto from 'node:crypto';
import {
  TOPIC_SELECTION_AGENT_RUN_MODES,
  type TopicSelectionAgentRunMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import type {
  TopicSelectionAgentExecutionMode,
  TopicSelectionNeedCandidateRecord,
  TopicSelectionV1aToV1bInputBundleRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  TOPIC_SELECTION_ACTOR_TYPES,
  type TopicSelectionActorType,
  type TopicSelectionArtifactRefRecord,
  type TopicSelectionFunctionalRef,
  type TopicSelectionGateIssue,
  type TopicSelectionHumanConfirmedDecisionRecord,
  type TopicSelectionInputSnapshotRecord,
  type TopicSelectionReadinessGateResultRecord,
  type TopicSelectionTraceSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceFreshnessStatus,
  TopicSelectionEvidenceRoleBundle,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionAcceptedRiskRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-recheck-risk-memory-contracts';
import type {
  TopicSelectionSearchPlanRecheckRequestRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import type {
  TopicSelectionResearchConstraintProfileRecord,
  TopicSelectionV1bIntakeReadinessRecommendation,
  TopicSelectionV1bIntakeReadinessAssessmentRecord,
  TopicSelectionV1bIntakeSnapshotRecord,
  TopicSelectionV1bResearchSlicePlanningInput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-intake-contracts';
import type {
  TopicSelectionPlanResearchSliceRunRecord,
  TopicSelectionRejectedSliceOptionReason,
  TopicSelectionResearchSliceAssumptionType,
  TopicSelectionResearchSliceAssumptionRecord,
  TopicSelectionResearchSliceBoundaryKind,
  TopicSelectionResearchSliceBoundaryRecord,
  TopicSelectionResearchSliceEvidenceRole,
  TopicSelectionResearchSliceEvidenceRefRecord,
  TopicSelectionResearchSliceOptionDraft,
  TopicSelectionResearchSliceOptionRecord,
  TopicSelectionResearchSliceOptionSetLlmOutput,
  TopicSelectionResearchSliceOptionSetRecord,
  TopicSelectionResearchSliceRecord,
  TopicSelectionSliceLoopbackTarget,
  TopicSelectionSliceSelectionDecision,
  TopicSelectionSliceSelectionDecisionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import type {
  TopicSelectionTopicQuestionAnswerabilityPlanRecord,
  TopicSelectionTopicQuestionAssumptionRefRecord,
  TopicSelectionTopicQuestionBoundaryRefRecord,
  TopicSelectionFormTopicQuestionRunRecord,
  TopicSelectionQuestionFrameRecord,
  TopicSelectionTopicQuestionCandidateRecord,
  TopicSelectionTopicQuestionCandidateSetRecord,
  TopicSelectionTopicQuestionCandidateDraft,
  TopicSelectionTopicQuestionContractRecord,
  TopicSelectionTopicQuestionEvidenceRefRecord,
  TopicSelectionTopicQuestionFalsificationConditionRecord,
  TopicSelectionTopicQuestionFalsificationConditionDraft,
  TopicSelectionTopicQuestionNeedRefRecord,
  TopicSelectionTopicQuestionRecord,
  TopicSelectionTopicQuestionSelectionDecisionRecord,
  TopicSelectionV1bTopicQuestionMaterialization,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-question-contracts';
import {
  TOPIC_SELECTION_VALUE_DIMENSIONS,
  TOPIC_SELECTION_VALUE_GATE_KEYS,
  TOPIC_SELECTION_VALUE_GATE_VERDICTS,
  type TopicSelectionAssessTopicValueLlmOutput,
  type TopicSelectionTopicValueAssessmentInputSnapshotRecord,
  type TopicSelectionTopicValueAssessmentRecord,
  type TopicSelectionTopicValueEvidenceRefRecord,
  type TopicSelectionValueDisposition,
  type TopicSelectionValueDispositionDecisionRecord,
  type TopicSelectionValueReasoningMemoRecord,
  type TopicSelectionV1bPackageDraftInput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import type {
  TopicSelectionPackageTraceBoundaryCheckRecord,
  TopicSelectionTopicPackageReadinessAssessmentRecord,
  TopicSelectionTopicPackageRecord,
  TopicSelectionV1bToV1cInputBundleRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-package-contracts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_GATE_STATUSES,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUNTIME_PROVENANCE_CLASSES,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_RESULT_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_ALLOWED_EFFECTS,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_EXECUTION_MODES,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_SLOT_IDS,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_TRACE_PAYLOAD_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_N6_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION,
  type TopicSelectionV1bN6GateFailureRetryContextProjection,
  type TopicSelectionV1bN1HarnessFrozenInputPayload,
  type TopicSelectionV1bN2HarnessFrozenInputPayload,
  type TopicSelectionV1bN3HarnessFrozenInputPayload,
  type TopicSelectionV1bN4HarnessFrozenInputPayload,
  type TopicSelectionV1bN5HarnessFrozenInputPayload,
  type TopicSelectionV1bN5ToN6HandoffPayload,
  type TopicSelectionV1bN6HarnessFrozenInputPayload,
  type TopicSelectionV1bN6LoopbackTriageSupportPayload,
  type TopicSelectionV1bN6RuntimeContextProjection,
  type TopicSelectionV1bN6ToN7HandoffPayload,
  type TopicSelectionV1bN7HarnessFrozenInputPayload,
  type TopicSelectionV1bN7HarnessFeedbackFrozenInputPayload,
  type TopicSelectionV1bN7RuntimeContextProjection,
  type TopicSelectionV1bN7ToN8HandoffPayload,
  type TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection,
  type TopicSelectionV1bN7ToN6FailedTrialLoopbackContextProjection,
  type TopicSelectionV1bCandidateGroupingSupportPayload,
  type TopicSelectionV1bN8DebateAdmissionReviewSupportPayload,
  type TopicSelectionV1bN8DebateTriggerThresholds,
  type TopicSelectionV1bN8FailedTrialSynthesisSupportPayload,
  type TopicSelectionV1bN8HarnessFrozenInputPayload,
  type TopicSelectionV1bN8ToN7FeedbackPayload,
  type TopicSelectionV1bN8ToN9HandoffPayload,
  type TopicSelectionV1bN9HarnessFrozenInputPayload,
  type TopicSelectionV1bN9ToN10HandoffPayload,
  type TopicSelectionV1bN10HarnessFrozenInputPayload,
  type TopicSelectionV1bN10ToN11HandoffPayload,
  type TopicSelectionV1bN11HarnessFrozenInputPayload,
  type TopicSelectionV1bAcceptedConstraintProfilePayload,
  type TopicSelectionV1bAcceptedSliceSelectionPayload,
  type TopicSelectionV1bResearchSliceOptionSetDraftPayload,
  type TopicSelectionV1bTopicValueAssessmentDraftPayload,
  type TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
  type TopicSelectionV1bWorkflowHarnessHashes,
  type TopicSelectionV1bWorkflowHarnessHandoff,
  type TopicSelectionV1bWorkflowHarnessHandoffKind,
  type TopicSelectionV1bWorkflowHarnessHandoffPayload,
  type TopicSelectionV1bWorkflowHarnessNodeId,
  type TopicSelectionV1bWorkflowHarnessNodePolicy,
  type TopicSelectionV1bWorkflowHarnessReplayIdentity,
  type TopicSelectionV1bWorkflowHarnessProfileId,
  type TopicSelectionV1bWorkflowHarnessRouteDecision,
  type TopicSelectionV1bWorkflowHarnessGateStatus,
  type TopicSelectionV1bWorkflowHarnessFailureClass,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessRunResult,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportSlotSpec,
  type TopicSelectionV1bWorkflowHarnessTracePayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type { TopicSelectionEvidenceMapRepository } from '../repositories/topic-selection-evidence-map.repository.js';
import type { TopicSelectionNeedValidationRepository } from '../repositories/topic-selection-need-validation.repository.js';
import type { TopicSelectionRecheckRiskMemoryRepository } from '../repositories/topic-selection-recheck-risk-memory.repository.js';
import type { TopicSelectionSearchResourceRepository } from '../repositories/topic-selection-search-resource.repository.js';
import type { TopicSelectionV1bIntakeRepository } from '../repositories/topic-selection-v1b-intake.repository.js';
import type { TopicSelectionV1bResearchSliceRepository } from '../repositories/topic-selection-v1b-research-slice.repository.js';
import type { TopicSelectionV1bTopicQuestionRepository } from '../repositories/topic-selection-v1b-topic-question.repository.js';
import type { TopicSelectionV1bValueAssessmentRepository } from '../repositories/topic-selection-v1b-value-assessment.repository.js';
import type { TopicSelectionV1bTopicPackageRepository } from '../repositories/topic-selection-v1b-topic-package.repository.js';
import { AppError } from '../errors/app-error.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  computeDecisionMemoryDedupWarnings,
  resolveDecisionMemoryPacketFromSourceRefs,
  type ResolvedTopicSelectionDecisionMemoryPacket,
} from './topic-selection-decision-memory-projection-service.js';
import { assertTopicSelectionAcceptedRiskUsableForTarget } from './topic-selection-recheck-risk-memory-service.js';
import {
  type TopicSelectionResolvedModelProfile,
  TopicSelectionModelProfileRegistryService,
} from './topic-selection-model-profile-registry-service.js';
import {
  TopicSelectionV1bN6DraftAdmissionService,
  type TopicSelectionV1bN6DraftAdmissionExpectedIdentity,
} from './topic-selection-v1b-n6-draft-admission-service.js';
import {
  TopicSelectionV1bN6DraftRuntimeService,
  type TopicSelectionV1bN6DraftGenerationMode,
} from './topic-selection-v1b-n6-draft-runtime-service.js';
import {
  TopicSelectionV1bN4ResearchSliceAdmissionService,
  type TopicSelectionV1bN4ResearchSliceAdmissionExpectedIdentity,
} from './topic-selection-v1b-n4-research-slice-admission-service.js';
import { TopicSelectionV1bN4ResearchSliceRuntimeService } from './topic-selection-v1b-n4-research-slice-runtime-service.js';
import {
  TopicSelectionV1bEarlySemanticSupportAdmissionService,
  type TopicSelectionV1bEarlySemanticSupportSlotId,
} from './topic-selection-v1b-early-semantic-support-admission-service.js';
import {
  TopicSelectionV1bEarlySemanticSupportRuntimeService,
  type TopicSelectionV1bEarlySemanticSupportPayload,
  type TopicSelectionV1bIntakeReadinessClassificationSupportPayload,
} from './topic-selection-v1b-early-semantic-support-runtime-service.js';
import { TopicSelectionV1bN6LoopbackTriageAdmissionService } from './topic-selection-v1b-n6-loopback-triage-admission-service.js';
import { TopicSelectionV1bN6LoopbackTriageRuntimeService } from './topic-selection-v1b-n6-loopback-triage-runtime-service.js';
import {
  TopicSelectionV1bN7SupportAdmissionService,
  type TopicSelectionV1bN7SupportSlotId,
} from './topic-selection-v1b-n7-support-admission-service.js';
import { TopicSelectionV1bN7SupportRuntimeService } from './topic-selection-v1b-n7-support-runtime-service.js';
import {
  TopicSelectionV1bN8ValueAssessmentAdmissionService,
  type TopicSelectionV1bN8ValueAssessmentAdmissionExpectedIdentity,
} from './topic-selection-v1b-n8-value-assessment-admission-service.js';
import { TopicSelectionV1bN8ValueAssessmentRuntimeService } from './topic-selection-v1b-n8-value-assessment-runtime-service.js';
import {
  canonicalHash,
  hashResearchSliceOptionAuthority as sharedHashResearchSliceOptionAuthority,
  hashV1bFrozenInput,
} from './topic-selection-v1b-harness-authority-hash.js';
import {
  uniqueIssues,
  uniqueRefs,
  uniqueStrings,
} from './topic-selection-v1b-harness-dedup-utils.js';

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const ALLOWED_REQUEST_KEYS = new Set([
  'schema_version',
  'workspace_id',
  'title_card_id',
  'workflow_run_id',
  'node_attempt_id',
  'node_id',
  'attempt_family_key',
  'policy_version',
  'frozen_input',
  'run_mode',
  'profile_id',
  'execution_spec',
  'semantic_artifacts',
  'actor',
  'created_by',
]);

type HashContext = {
  frozenInputHash: string;
  executionSpecHash: string;
  semanticArtifactHash: string | null;
  runtimeAdmissionHash: string | null;
  attemptFamilyKey: string;
  nodeReplayKey: string;
};

type RuntimeAdmissionResult = {
  runtimeAdmissionHash: string | null;
  blocker: {
    code: string;
    message: string;
  } | null;
};

type ReplayLookup = {
  exact: TopicSelectionV1bWorkflowHarnessRunResult | null;
  driftBlocker: {
    code: string;
    message: string;
  } | null;
};

type ReplayDriftField =
  | 'attempt_family_key'
  | 'execution_spec_hash'
  | 'frozen_input_hash'
  | 'policy_version'
  | 'runtime_admission_hash'
  | 'semantic_artifact_hash';

type IdFactory = (prefix: string) => string;

type HarnessRunnerDependencies = {
  v1bIntakeRepository?: TopicSelectionV1bIntakeRepository;
  needValidationRepository?: TopicSelectionNeedValidationRepository;
  evidenceMapRepository?: TopicSelectionEvidenceMapRepository;
  searchResourceRepository?: TopicSelectionSearchResourceRepository;
  recheckRiskMemoryRepository?: TopicSelectionRecheckRiskMemoryRepository;
  researchSliceRepository?: TopicSelectionV1bResearchSliceRepository;
  topicQuestionRepository?: TopicSelectionV1bTopicQuestionRepository;
  valueAssessmentRepository?: TopicSelectionV1bValueAssessmentRepository;
  topicPackageRepository?: TopicSelectionV1bTopicPackageRepository;
};

type RecheckResolution = {
  missing_recheck_refs: TopicSelectionFunctionalRef[];
  open_recheck_requests: TopicSelectionSearchPlanRecheckRequestRecord[];
};

type TraceRefResolution = {
  invalid_trace_refs: TopicSelectionFunctionalRef[];
  missing_trace_refs: TopicSelectionFunctionalRef[];
  trace_snapshots: TopicSelectionTraceSnapshotRecord[];
};

type RunnerPersistInput = {
  gateStatus: TopicSelectionV1bWorkflowHarnessGateStatus;
  failureClass: TopicSelectionV1bWorkflowHarnessFailureClass | null;
  routeDecision: TopicSelectionV1bWorkflowHarnessRouteDecision;
  authorityRef: TopicSelectionFunctionalRef | null;
  additionalAuthorityRefs?: TopicSelectionFunctionalRef[];
  authorityHash: string | null;
  handoff: TopicSelectionV1bWorkflowHarnessHandoff | null;
  handoffHash: string | null;
  blockers: TopicSelectionGateIssue[];
  warnings: TopicSelectionGateIssue[];
  sourceRef: TopicSelectionFunctionalRef;
  targetRef: TopicSelectionFunctionalRef;
  requiredActions?: string[];
  acceptedRiskRefs?: TopicSelectionFunctionalRef[];
  transitionKey: string;
  tracePhase: string;
  tracePayload?: Record<string, unknown>;
  runtimeContextProjection?: {
    build: (input: {
      handoffRef: TopicSelectionFunctionalRef | null;
      inputSnapshotId: string;
    }) => TopicSelectionV1bN6RuntimeContextProjection | TopicSelectionV1bN7RuntimeContextProjection;
  };
  loopbackTargetCode?: string | null;
  routeTargetNodeId?: TopicSelectionV1bWorkflowHarnessNodeId | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

type PreparedAdmittedControlPlane = {
  createdBy: TopicSelectionActorType;
  gate: TopicSelectionReadinessGateResultRecord;
  gateResultRef: TopicSelectionFunctionalRef;
  handoffArtifact: TopicSelectionArtifactRefRecord | null;
  handoffRef: TopicSelectionFunctionalRef | null;
  inputSnapshot: TopicSelectionInputSnapshotRecord;
  runtimeContextProjectionArtifact: TopicSelectionArtifactRefRecord | null;
  runtimeContextProjectionHash: string | null;
  runtimeContextProjectionRef: TopicSelectionFunctionalRef | null;
};

type N4ValidatedOptionSet = {
  highRiskOptionCount: number;
  options: TopicSelectionResearchSliceOptionRecord[];
  qualityFlags: string[];
  recommendedOptionId: string | null;
  requiresHumanReview: boolean;
  warnings: TopicSelectionGateIssue[];
};

type N4DraftResolution = {
  artifactRefs: TopicSelectionFunctionalRef[];
  draft: TopicSelectionV1bResearchSliceOptionSetDraftPayload;
  draftHash: string;
  semanticArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
};

type N5LoadedOptionSet = {
  optionSet: TopicSelectionResearchSliceOptionSetRecord;
  options: TopicSelectionResearchSliceOptionRecord[];
  planRun: TopicSelectionPlanResearchSliceRunRecord;
};

type N6LoadedContext = {
  assumptions: TopicSelectionResearchSliceAssumptionRecord[];
  boundaries: TopicSelectionResearchSliceBoundaryRecord[];
  evidenceRefs: TopicSelectionResearchSliceEvidenceRefRecord[];
  optionSet: TopicSelectionResearchSliceOptionSetRecord;
  researchSlice: TopicSelectionResearchSliceRecord;
  selectedOption: TopicSelectionResearchSliceOptionRecord;
  selectionDecision: TopicSelectionSliceSelectionDecisionRecord;
};

type N6DraftResolution = {
  artifactRefs: TopicSelectionFunctionalRef[];
  draft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload;
  draftHash: string;
  semanticArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
};

type N6LoopbackTriageResolution = {
  artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
  payload: TopicSelectionV1bN6LoopbackTriageSupportPayload;
  payloadHash: string;
} | null;

type N6LoopbackPlan = {
  affectedRefs: TopicSelectionFunctionalRef[];
  debateEscalation: TopicSelectionV1bN6LoopbackTriageSupportPayload['debate_escalation'];
  failureScope: TopicSelectionV1bN6LoopbackTriageSupportPayload['failure_scope'];
  loopbackTargetCode: TopicSelectionV1bN6LoopbackTriageSupportPayload['loopback_target_code'];
  rationale: string;
  reasonCodes: string[];
  regenerationHints: string[];
  routeTargetNodeId: TopicSelectionV1bWorkflowHarnessNodeId;
  triageArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef | null;
  triagePayloadHash: string | null;
  upstreamRollback: TopicSelectionV1bN6LoopbackTriageSupportPayload['upstream_rollback'];
};

type N6CandidateValidationResult = {
  blockedCandidateContexts: Record<string, unknown>[];
  candidateHashes: string[];
  candidateRefs: TopicSelectionFunctionalRef[];
  candidates: TopicSelectionTopicQuestionCandidateRecord[];
  candidateSet: TopicSelectionTopicQuestionCandidateSetRecord;
  questionFrame: TopicSelectionQuestionFrameRecord;
  qualityFlags: string[];
  recommendedCandidateIds: string[];
  warnings: TopicSelectionGateIssue[];
};

type N7LoadedContext = {
  candidateSet: TopicSelectionTopicQuestionCandidateSetRecord;
  candidates: TopicSelectionTopicQuestionCandidateRecord[];
  frame: TopicSelectionQuestionFrameRecord;
  run: TopicSelectionFormTopicQuestionRunRecord;
  n6Handoff: TopicSelectionV1bWorkflowHarnessHandoff;
  feedback: TopicSelectionV1bN8ToN7FeedbackPayload | null;
};

type N7SupportContext = {
  grouping: {
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    payload: TopicSelectionV1bCandidateGroupingSupportPayload;
    payloadHash: string;
  } | null;
  debateAdmission: {
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    payload: TopicSelectionV1bN8DebateAdmissionReviewSupportPayload;
    payloadHash: string;
  } | null;
  failedTrialSynthesis: {
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    payload: TopicSelectionV1bN8FailedTrialSynthesisSupportPayload;
    payloadHash: string;
  } | null;
};

type N7CandidateChoice = {
  candidate: TopicSelectionTopicQuestionCandidateRecord;
  candidateHash: string;
  priorityOrder: string[];
  failedCandidateIds: string[];
  routeNote: string;
};

type N8LoadedContext = {
  answerabilityPlan: TopicSelectionTopicQuestionAnswerabilityPlanRecord;
  assumptionRefs: TopicSelectionTopicQuestionAssumptionRefRecord[];
  boundaryRefs: TopicSelectionTopicQuestionBoundaryRefRecord[];
  candidate: TopicSelectionTopicQuestionCandidateRecord;
  candidateSet: TopicSelectionTopicQuestionCandidateSetRecord;
  contract: TopicSelectionTopicQuestionContractRecord;
  evidenceRefs: TopicSelectionTopicQuestionEvidenceRefRecord[];
  falsificationConditions: TopicSelectionTopicQuestionFalsificationConditionRecord[];
  needRefs: TopicSelectionTopicQuestionNeedRefRecord[];
  n7Handoff: TopicSelectionV1bWorkflowHarnessHandoff;
  question: TopicSelectionTopicQuestionRecord;
  researchSlice: TopicSelectionResearchSliceRecord;
  selectionDecision: TopicSelectionTopicQuestionSelectionDecisionRecord;
};

type N8DraftResolution = {
  artifactRefs: TopicSelectionFunctionalRef[];
  draft: TopicSelectionV1bTopicValueAssessmentDraftPayload;
  draftHash: string;
  semanticArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
};

type N9LoadedContext = {
  assessment: TopicSelectionTopicValueAssessmentRecord;
  evidenceRefs: TopicSelectionTopicValueEvidenceRefRecord[];
  inputSnapshot: TopicSelectionTopicValueAssessmentInputSnapshotRecord;
  memo: TopicSelectionValueReasoningMemoRecord;
  n8Handoff: TopicSelectionV1bWorkflowHarnessHandoff;
};

type N10LoadedContext = {
  decision: TopicSelectionValueDispositionDecisionRecord;
  n9Handoff: TopicSelectionV1bWorkflowHarnessHandoff;
};

type N11LoadedContext = {
  bundle: TopicSelectionV1bToV1cInputBundleRecord;
  n10Handoff: TopicSelectionV1bWorkflowHarnessHandoff;
  packageRecord: TopicSelectionTopicPackageRecord;
};

type N6KnownContext = {
  assumptionRefKeys: Set<string>;
  boundaryRefKeys: Set<string>;
  claimCeiling: string;
  evidenceRefKeys: Set<string>;
  sourceRefKeys: Set<string>;
  targetCommunity: string;
  validatedNeedRefKey: string;
};

type InheritedConstraints = {
  claim_ceiling: string;
  non_goals: string[];
};

const ACTOR_TYPE_SET = new Set<string>(TOPIC_SELECTION_ACTOR_TYPES);
const AGENT_RUN_MODE_SET = new Set<string>(TOPIC_SELECTION_AGENT_RUN_MODES);
const SEMANTIC_ARTIFACT_EXECUTION_MODE_SET = new Set<string>(
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_EXECUTION_MODES.filter((mode) => mode !== 'none'),
);
const SEMANTIC_ALLOWED_EFFECT_SET = new Set<string>(TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_ALLOWED_EFFECTS);
const SEMANTIC_SLOT_ID_SET = new Set<string>(TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_SLOT_IDS);
const RUNTIME_PROVENANCE_CLASS_SET = new Set<string>(
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUNTIME_PROVENANCE_CLASSES,
);

/**
 * T-123 Phase 3 (D2) — deterministic T1 borderline / T3 dimension-conflict debate
 * triggers. Pure code over node-policy thresholds (provisional values, DP-3.3); no
 * engine. Exported for direct boundary-value unit testing.
 */
export function computeTopicSelectionV1bN8DebateTriggers(
  draft: {
    total_score: number;
    confidence: number;
    dimension_scores: ReadonlyArray<{ dimension_key: string; score: number }>;
  },
  thresholds: TopicSelectionV1bN8DebateTriggerThresholds | null,
): Array<{ code: string; message: string }> {
  if (!thresholds) {
    return [];
  }
  const issues: Array<{ code: string; message: string }> = [];
  const t1Band = draft.total_score >= thresholds.t1_total_score_min
    && draft.total_score < thresholds.t1_total_score_max_exclusive;
  const t1Confidence = draft.confidence < thresholds.t1_confidence_min;
  if (t1Band || t1Confidence) {
    issues.push({
      code: 'N8_VALUE_BORDERLINE_DEBATE_TRIGGER',
      message: `N8 value signal is borderline (total_score=${draft.total_score}, confidence=${draft.confidence}); bounded debate re-assessment is required (T1).`,
    });
  }
  // T3 only applies to a draft that is otherwise value-admissible (total_score >= floor):
  // a low-total draft is handled by the readiness/score gate, not by debate. Both the spread
  // and the weak-single-dimension branches respect the floor so the trigger is symmetric.
  const t3Admissible = draft.total_score >= thresholds.t3_total_score_min;
  const scores = draft.dimension_scores.map((score) => score.score);
  const spread = scores.length > 0 ? Math.max(...scores) - Math.min(...scores) : 0;
  const weakDimension = t3Admissible
    ? draft.dimension_scores.find((score) => score.score < thresholds.t3_single_dimension_floor)
    : undefined;
  if (t3Admissible && (spread >= thresholds.t3_dimension_spread_min || weakDimension)) {
    issues.push({
      code: 'N8_DIMENSION_CONFLICT_DEBATE_TRIGGER',
      message: `N8 dimension scores conflict (spread=${spread}${weakDimension ? `, ${weakDimension.dimension_key}=${weakDimension.score}` : ''}); bounded debate re-assessment is required (T3).`,
    });
  }
  return issues;
}

export class TopicSelectionV1bWorkflowHarnessService {
  private readonly idFactory: IdFactory;
  private readonly now: () => string;
  private readonly modelProfileRegistry: TopicSelectionModelProfileRegistryService;
  private readonly n4ResearchSliceAdmission = new TopicSelectionV1bN4ResearchSliceAdmissionService();
  private readonly n4ResearchSliceRuntime: TopicSelectionV1bN4ResearchSliceRuntimeService;
  private readonly earlySemanticSupportAdmission = new TopicSelectionV1bEarlySemanticSupportAdmissionService();
  private readonly earlySemanticSupportRuntime: TopicSelectionV1bEarlySemanticSupportRuntimeService;
  private readonly n6DraftAdmission = new TopicSelectionV1bN6DraftAdmissionService();
  private readonly n6DraftRuntime: TopicSelectionV1bN6DraftRuntimeService;
  private readonly n6LoopbackTriageAdmission = new TopicSelectionV1bN6LoopbackTriageAdmissionService();
  private readonly n6LoopbackTriageRuntime: TopicSelectionV1bN6LoopbackTriageRuntimeService;
  private readonly n7SupportAdmission = new TopicSelectionV1bN7SupportAdmissionService();
  private readonly n7SupportRuntime: TopicSelectionV1bN7SupportRuntimeService;
  private readonly n8ValueAssessmentAdmission = new TopicSelectionV1bN8ValueAssessmentAdmissionService();
  private readonly n8ValueAssessmentRuntime: TopicSelectionV1bN8ValueAssessmentRuntimeService;
  private readonly runnerDependencies: HarnessRunnerDependencies;

  constructor(
    private readonly controlPlane: TopicSelectionControlPlaneService,
    options: {
      idFactory?: IdFactory;
      now?: () => string;
      modelProfileRegistry?: TopicSelectionModelProfileRegistryService;
      runnerDependencies?: HarnessRunnerDependencies;
    } = {},
  ) {
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
    this.modelProfileRegistry = options.modelProfileRegistry ?? new TopicSelectionModelProfileRegistryService();
    this.n4ResearchSliceRuntime = new TopicSelectionV1bN4ResearchSliceRuntimeService(controlPlane, {
      modelProfileRegistry: this.modelProfileRegistry,
    });
    this.earlySemanticSupportRuntime = new TopicSelectionV1bEarlySemanticSupportRuntimeService(controlPlane, {
      modelProfileRegistry: this.modelProfileRegistry,
    });
    this.n6DraftRuntime = new TopicSelectionV1bN6DraftRuntimeService(controlPlane, {
      modelProfileRegistry: this.modelProfileRegistry,
    });
    this.n6LoopbackTriageRuntime = new TopicSelectionV1bN6LoopbackTriageRuntimeService(controlPlane, {
      modelProfileRegistry: this.modelProfileRegistry,
    });
    this.n7SupportRuntime = new TopicSelectionV1bN7SupportRuntimeService(controlPlane, {
      modelProfileRegistry: this.modelProfileRegistry,
    });
    this.n8ValueAssessmentRuntime = new TopicSelectionV1bN8ValueAssessmentRuntimeService(controlPlane, {
      modelProfileRegistry: this.modelProfileRegistry,
    });
    this.runnerDependencies = options.runnerDependencies ?? {};
  }

  getNodePolicies(): readonly TopicSelectionV1bWorkflowHarnessNodePolicy[] {
    return TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES;
  }

  getNodePolicy(nodeId: TopicSelectionV1bWorkflowHarnessNodeId): TopicSelectionV1bWorkflowHarnessNodePolicy {
    const policy = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES.find((item) => item.node_id === nodeId);
    if (!policy) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Unknown v1b workflow harness node_id: ${nodeId}.`);
    }
    return policy;
  }

  async invokeNode(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    this.assertRequest(input);
    const policy = this.getNodePolicy(input.node_id);
    const runtimeAdmission = this.runtimeAdmission(policy, input);
    const hashContext = this.hashContext(input, runtimeAdmission.runtimeAdmissionHash);
    const replay = await this.findReplay(input, hashContext.nodeReplayKey);
    if (replay.exact) {
      const replayAuthorityBlocker = await this.replayAuthorityBlocker(replay.exact);
      if (replayAuthorityBlocker) {
        return this.persistBlockedResult(input, hashContext, {
          blockerCode: replayAuthorityBlocker.code,
          message: replayAuthorityBlocker.message,
        });
      }
      return this.assertResult(replay.exact);
    }

    if (replay.driftBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: replay.driftBlocker.code,
        message: replay.driftBlocker.message,
      });
    }

    const policyBlocker = this.policyBlocker(policy, input, hashContext);
    if (policyBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: policyBlocker.code,
        message: policyBlocker.message,
      });
    }
    if (runtimeAdmission.blocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: runtimeAdmission.blocker.code,
        message: runtimeAdmission.blocker.message,
      });
    }

    return this.invokeImplementedRunner(policy, input, hashContext);
  }

  private assertRequest(input: TopicSelectionV1bWorkflowHarnessRunRequest): void {
    if (!this.isRecord(input)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'TopicSelection v1b workflow harness request must be an object.');
    }
    const record = input as unknown as Record<string, unknown>;
    const unknownKeys = Object.keys(record).filter((key) => !ALLOWED_REQUEST_KEYS.has(key));
    if (unknownKeys.length > 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'TopicSelection v1b workflow harness request contains unsupported fields.', {
        unsupported_fields: unknownKeys,
      });
    }
    if (input.schema_version !== TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'schema_version is invalid.');
    }
    this.assertNonEmpty(input.workflow_run_id, 'workflow_run_id');
    this.assertNonEmpty(input.node_attempt_id, 'node_attempt_id');
    this.assertNonEmpty(input.policy_version, 'policy_version');
    this.assertOptionalStringId(input.workspace_id, 'workspace_id');
    this.assertOptionalStringId(input.title_card_id, 'title_card_id');
    this.assertOptionalStringId(input.attempt_family_key, 'attempt_family_key');
    this.assertOptionalRunMode(input.run_mode, 'run_mode');
    this.assertOptionalStringId(input.profile_id, 'profile_id');
    this.getNodePolicy(input.node_id);
    if (!input.frozen_input || typeof input.frozen_input !== 'object') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'frozen_input is required.');
    }
    const frozenInputRecord = input.frozen_input as unknown as Record<string, unknown>;
    const unknownFrozenInputKeys = Object.keys(frozenInputRecord)
      .filter((key) => (
        key !== 'input_contract'
        && key !== 'snapshot_kind'
        && key !== 'source_refs'
        && key !== 'payload'
        && key !== 'frozen_input_hash'
      ));
    if (unknownFrozenInputKeys.length > 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'frozen_input contains unsupported fields.', {
        unsupported_fields: unknownFrozenInputKeys,
      });
    }
    this.assertNonEmpty(input.frozen_input.input_contract, 'frozen_input.input_contract');
    this.assertNonEmpty(input.frozen_input.snapshot_kind, 'frozen_input.snapshot_kind');
    if (!Array.isArray(input.frozen_input.source_refs)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'frozen_input.source_refs must be an array.');
    }
    if (input.frozen_input.source_refs.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'frozen_input.source_refs must include at least one frozen source ref.');
    }
    input.frozen_input.source_refs.forEach((sourceRef, index) => {
      this.assertFunctionalRef(sourceRef, `frozen_input.source_refs[${index}]`);
    });
    if (!this.isRecord(input.frozen_input.payload)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'frozen_input.payload must be an object.');
    }
    const declaredHash = input.frozen_input.frozen_input_hash?.trim() || null;
    if (declaredHash && !HASH_PATTERN.test(declaredHash)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'frozen_input_hash must be a sha256 hex hash.');
    }
    if (input.execution_spec) {
      if (!this.isRecord(input.execution_spec)) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'execution_spec must be an object.');
      }
      const specRecord = input.execution_spec as unknown as Record<string, unknown>;
      const specKeys = Object.keys(specRecord);
      const unknownSpecKeys = specKeys.filter((key) => key !== 'execution_mode' && key !== 'model_option_id');
      if (unknownSpecKeys.length > 0) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'execution_spec contains unsupported fields.', {
          unsupported_fields: unknownSpecKeys,
        });
      }
      if (!['mocked_llm', 'codex_assisted', 'provider_llm'].includes(input.execution_spec.execution_mode)) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'execution_spec.execution_mode is invalid.');
      }
      this.assertOptionalStringId(input.execution_spec.model_option_id, 'execution_spec.model_option_id');
      if (input.execution_spec.model_option_id && input.execution_spec.execution_mode !== 'provider_llm') {
        throw new AppError(400, 'INVALID_PAYLOAD', 'model_option_id requires execution_mode=provider_llm.');
      }
    }
    if (input.semantic_artifacts !== undefined && input.semantic_artifacts !== null) {
      if (!Array.isArray(input.semantic_artifacts)) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'semantic_artifacts must be an array or null.');
      }
      input.semantic_artifacts.forEach((artifact, index) => {
        this.assertSemanticSupportArtifact(artifact, `semantic_artifacts[${index}]`);
      });
    }
    if (input.actor !== undefined && input.actor !== null) {
      this.assertActorRef(input.actor, 'actor');
    }
    if (input.created_by !== undefined && !ACTOR_TYPE_SET.has(input.created_by)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'created_by is invalid.');
    }
  }

  private assertResult(
    result: TopicSelectionV1bWorkflowHarnessRunResult,
  ): TopicSelectionV1bWorkflowHarnessRunResult {
    if (
      result.schema_version !== TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_RESULT_SCHEMA_VERSION
      || !TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_GATE_STATUSES.includes(result.gate_status)
      || !HASH_PATTERN.test(result.replay_identity.node_replay_key)
      || !HASH_PATTERN.test(result.hashes.frozen_input_hash)
      || !HASH_PATTERN.test(result.hashes.execution_spec_hash)
      || (
        result.hashes.runtime_admission_hash != null
        && !HASH_PATTERN.test(result.hashes.runtime_admission_hash)
      )
      || !HASH_PATTERN.test(result.hashes.gate_result_hash)
      || !HASH_PATTERN.test(result.hashes.route_hash)
      || (
        result.replay_provenance?.node_replay_key != null
        && !HASH_PATTERN.test(result.replay_provenance.node_replay_key)
      )
    ) {
      throw new AppError(500, 'INTERNAL_ERROR', 'TopicSelection v1b workflow harness result is invalid.', {
        node_id: result.node_id,
        node_attempt_id: result.node_attempt_id,
      });
    }
    return result;
  }

  private assertNonEmpty(value: string | null | undefined, fieldName: string): void {
    if (typeof value !== 'string' || !value.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} cannot be empty.`);
    }
  }

  private assertOptionalStringId(value: string | null | undefined, fieldName: string): void {
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value !== 'string' || !value.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must be a non-empty string or null.`);
    }
  }

  private assertOptionalRunMode(
    value: TopicSelectionAgentRunMode | null | undefined,
    fieldName: string,
  ): void {
    if (value === undefined || value === null) {
      return;
    }
    if (!AGENT_RUN_MODE_SET.has(value)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} is invalid.`);
    }
  }

  private assertFunctionalRef(
    value: unknown,
    fieldName: string,
    options: { allowLegacyRef?: boolean } = {},
  ): asserts value is TopicSelectionFunctionalRef {
    if (!this.isRecord(value)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must be an object.`);
    }
    const allowLegacyRef = options.allowLegacyRef ?? true;
    const allowedKeys = allowLegacyRef
      ? ['ref_type', 'ref_id', 'version_id', 'title_card_id', 'legacy_ref']
      : ['ref_type', 'ref_id', 'version_id', 'title_card_id'];
    const unknownKeys = Object.keys(value)
      .filter((key) => !allowedKeys.includes(key));
    if (unknownKeys.length > 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} contains unsupported fields.`, {
        unsupported_fields: unknownKeys,
      });
    }
    this.assertNonEmpty(value.ref_type as string | null | undefined, `${fieldName}.ref_type`);
    this.assertNonEmpty(value.ref_id as string | null | undefined, `${fieldName}.ref_id`);
    this.assertOptionalStringId(value.version_id as string | null | undefined, `${fieldName}.version_id`);
    this.assertOptionalStringId(value.title_card_id as string | null | undefined, `${fieldName}.title_card_id`);
    if (
      allowLegacyRef
      && value.legacy_ref !== undefined
      && value.legacy_ref !== null
      && !this.isRecord(value.legacy_ref)
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.legacy_ref must be an object or null.`);
    }
  }

  private assertActorRef(value: unknown, fieldName: string): void {
    if (!this.isRecord(value)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must be an object.`);
    }
    const unknownKeys = Object.keys(value).filter((key) => key !== 'actor_type' && key !== 'actor_id');
    if (unknownKeys.length > 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} contains unsupported fields.`, {
        unsupported_fields: unknownKeys,
      });
    }
    if (!ACTOR_TYPE_SET.has(value.actor_type as string)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.actor_type is invalid.`);
    }
    this.assertOptionalStringId(value.actor_id as string | null | undefined, `${fieldName}.actor_id`);
  }

  private assertSemanticSupportArtifact(
    value: unknown,
    fieldName: string,
  ): asserts value is TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef {
    if (!this.isRecord(value)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must be an object.`);
    }
    const allowedKeys = new Set([
      'slot_id',
      'node_id',
      'execution_mode',
      'run_mode',
      'allowed_effect',
      'support_artifact_ref',
      'support_artifact_hash',
      'normalized_output_ref',
      'normalized_output_hash',
      'output_contract',
      'profile_id',
      'model_option_id',
      'input_hash',
      'prompt_packet_hash',
      'structured_output_hash',
      'adapter_policy_version',
      'slot_spec_hash',
      'provenance_ref',
      'runtime_provenance_class',
      'context_policy_profile_id',
      'context_policy_profile_version',
      'context_policy_profile_hash',
      'prompt_variant_key',
      'runtime_invocation_context_hash',
      'redaction_policy',
      'source_hashes',
      'runtime_audit_ref',
      'runtime_audit_hash',
      'compression_report_ref',
      'compression_report_hash',
      'compressed_context_hash',
    ]);
    const unknownKeys = Object.keys(value).filter((key) => !allowedKeys.has(key));
    if (unknownKeys.length > 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} contains unsupported fields.`, {
        unsupported_fields: unknownKeys,
      });
    }
    if (!SEMANTIC_SLOT_ID_SET.has(value.slot_id as string)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.slot_id is invalid.`);
    }
    this.getNodePolicy(value.node_id as TopicSelectionV1bWorkflowHarnessNodeId);
    if (!SEMANTIC_ARTIFACT_EXECUTION_MODE_SET.has(value.execution_mode as string)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.execution_mode is invalid.`);
    }
    if (value.run_mode === undefined || value.run_mode === null) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.run_mode is required.`);
    }
    this.assertOptionalRunMode(value.run_mode as TopicSelectionAgentRunMode | null | undefined, `${fieldName}.run_mode`);
    if (!SEMANTIC_ALLOWED_EFFECT_SET.has(value.allowed_effect as string)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.allowed_effect is invalid.`);
    }
    this.assertFunctionalRef(value.support_artifact_ref, `${fieldName}.support_artifact_ref`, { allowLegacyRef: false });
    this.assertHash(value.support_artifact_hash as string | null | undefined, `${fieldName}.support_artifact_hash`);
    if (value.normalized_output_ref !== null) {
      this.assertFunctionalRef(value.normalized_output_ref, `${fieldName}.normalized_output_ref`, { allowLegacyRef: false });
    }
    this.assertHash(value.normalized_output_hash as string | null | undefined, `${fieldName}.normalized_output_hash`);
    this.assertNonEmpty(value.output_contract as string | null | undefined, `${fieldName}.output_contract`);
    this.assertNonEmpty(value.profile_id as string | null | undefined, `${fieldName}.profile_id`);
    if (value.model_option_id === undefined) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.model_option_id is required.`);
    }
    this.assertOptionalStringId(value.model_option_id as string | null | undefined, `${fieldName}.model_option_id`);
    if (value.execution_mode === 'provider_llm' && !value.model_option_id) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.model_option_id is required for provider_llm.`);
    }
    if (value.execution_mode !== 'provider_llm' && value.model_option_id) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.model_option_id requires execution_mode=provider_llm.`);
    }
    this.assertHash(value.input_hash as string | null | undefined, `${fieldName}.input_hash`);
    this.assertHash(value.prompt_packet_hash as string | null | undefined, `${fieldName}.prompt_packet_hash`);
    this.assertHash(value.structured_output_hash as string | null | undefined, `${fieldName}.structured_output_hash`);
    this.assertNonEmpty(value.adapter_policy_version as string | null | undefined, `${fieldName}.adapter_policy_version`);
    this.assertHash(value.slot_spec_hash as string | null | undefined, `${fieldName}.slot_spec_hash`);
    this.assertFunctionalRef(value.provenance_ref, `${fieldName}.provenance_ref`, { allowLegacyRef: false });
    if (!RUNTIME_PROVENANCE_CLASS_SET.has(value.runtime_provenance_class as string)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.runtime_provenance_class is invalid.`);
    }
    this.assertOptionalStringId(
      value.context_policy_profile_id as string | null | undefined,
      `${fieldName}.context_policy_profile_id`,
    );
    this.assertOptionalStringId(
      value.context_policy_profile_version as string | null | undefined,
      `${fieldName}.context_policy_profile_version`,
    );
    this.assertOptionalHash(
      value.context_policy_profile_hash as string | null | undefined,
      `${fieldName}.context_policy_profile_hash`,
    );
    this.assertOptionalStringId(value.prompt_variant_key as string | null | undefined, `${fieldName}.prompt_variant_key`);
    this.assertOptionalHash(
      value.runtime_invocation_context_hash as string | null | undefined,
      `${fieldName}.runtime_invocation_context_hash`,
    );
    this.assertOptionalStringId(value.redaction_policy as string | null | undefined, `${fieldName}.redaction_policy`);
    this.assertSourceHashMap(value.source_hashes, `${fieldName}.source_hashes`);
    if (value.runtime_audit_ref !== null) {
      this.assertFunctionalRef(value.runtime_audit_ref, `${fieldName}.runtime_audit_ref`, { allowLegacyRef: false });
    }
    this.assertOptionalHash(value.runtime_audit_hash as string | null | undefined, `${fieldName}.runtime_audit_hash`);
    if (value.compression_report_ref !== null) {
      this.assertFunctionalRef(value.compression_report_ref, `${fieldName}.compression_report_ref`, { allowLegacyRef: false });
    }
    this.assertOptionalHash(
      value.compression_report_hash as string | null | undefined,
      `${fieldName}.compression_report_hash`,
    );
    this.assertOptionalHash(
      value.compressed_context_hash as string | null | undefined,
      `${fieldName}.compressed_context_hash`,
    );
    if (value.runtime_provenance_class === 'runtime_verified') {
      this.assertRuntimeVerifiedSupportArtifact(
        value as unknown as TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
        fieldName,
      );
    }
  }

  private assertHash(value: string | null | undefined, fieldName: string): void {
    if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must be a sha256 hex hash.`);
    }
  }

  private assertOptionalHash(value: string | null | undefined, fieldName: string): void {
    if (value === null || value === undefined) {
      return;
    }
    this.assertHash(value, fieldName);
  }

  private assertSourceHashMap(value: unknown, fieldName: string): void {
    if (!this.isRecord(value)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must be an object.`);
    }
    for (const [key, hash] of Object.entries(value)) {
      this.assertNonEmpty(key, `${fieldName} key`);
      this.assertHash(hash as string | null | undefined, `${fieldName}.${key}`);
    }
  }

  private assertRuntimeVerifiedSupportArtifact(
    value: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
    fieldName: string,
  ): void {
    this.assertNonEmpty(value.context_policy_profile_id, `${fieldName}.context_policy_profile_id`);
    this.assertNonEmpty(value.context_policy_profile_version, `${fieldName}.context_policy_profile_version`);
    this.assertHash(value.context_policy_profile_hash, `${fieldName}.context_policy_profile_hash`);
    this.assertNonEmpty(value.prompt_variant_key, `${fieldName}.prompt_variant_key`);
    this.assertHash(value.runtime_invocation_context_hash, `${fieldName}.runtime_invocation_context_hash`);
    this.assertNonEmpty(value.redaction_policy, `${fieldName}.redaction_policy`);
    if (Object.keys(value.source_hashes).length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.source_hashes must not be empty for runtime_verified.`);
    }
    if (!value.runtime_audit_ref) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.runtime_audit_ref is required for runtime_verified.`);
    }
    if (value.runtime_audit_ref.ref_type !== 'artifact_ref') {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.runtime_audit_ref must be an artifact_ref for runtime_verified.`);
    }
    if (!this.refsEqual(value.provenance_ref, value.runtime_audit_ref)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName}.provenance_ref must match runtime_audit_ref for runtime_verified.`);
    }
    this.assertHash(value.runtime_audit_hash, `${fieldName}.runtime_audit_hash`);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private hashContext(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    runtimeAdmissionHash: string | null,
  ): HashContext {
    // Single source of truth (T-115): frozen-input envelope hash shape shared
    // with V1bSliceHumanSelectionService via the harness-authority-hash module.
    const computedFrozenInputHash = hashV1bFrozenInput(input.frozen_input);
    const declaredFrozenInputHash = input.frozen_input.frozen_input_hash?.trim() || null;
    if (declaredFrozenInputHash && declaredFrozenInputHash !== computedFrozenInputHash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'frozen_input_hash does not match frozen_input payload.');
    }
    const frozenInputHash = declaredFrozenInputHash ?? computedFrozenInputHash;
    const executionSpecHash = this.hash(input.execution_spec ?? null);
    const semanticArtifacts = input.semantic_artifacts ?? [];
    const semanticArtifactHash = semanticArtifacts.length > 0 ? this.hash(semanticArtifacts) : null;
    const attemptFamilyKey = input.attempt_family_key?.trim() || this.hash({
      node_id: input.node_id,
      policy_version: input.policy_version,
      source_refs: input.frozen_input.source_refs,
    });
    const nodeReplayKey = this.hash({
      attempt_family_key: attemptFamilyKey,
      execution_spec_hash: executionSpecHash,
      frozen_input_hash: frozenInputHash,
      node_attempt_id: input.node_attempt_id,
      node_id: input.node_id,
      output_schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_RESULT_SCHEMA_VERSION,
      policy_version: input.policy_version,
      runtime_admission_hash: runtimeAdmissionHash,
      semantic_artifact_hash: semanticArtifactHash,
    });
    return {
      frozenInputHash,
      executionSpecHash,
      semanticArtifactHash,
      runtimeAdmissionHash,
      attemptFamilyKey,
      nodeReplayKey,
    };
  }

  private async findReplay(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    nodeReplayKey: string,
  ): Promise<ReplayLookup> {
    const artifacts = await this.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
    const traceArtifacts = artifacts
      .filter((artifact) => artifact.artifact_kind === 'trace')
      .filter((artifact) => {
        const payload = artifact.payload as Partial<TopicSelectionV1bWorkflowHarnessTracePayload> | null;
        return payload?.payload_schema === TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_TRACE_PAYLOAD_SCHEMA_VERSION
          && payload.node_id === input.node_id
          && payload.node_attempt_id === input.node_attempt_id;
      })
      .sort((left, right) => right.created_at.localeCompare(left.created_at));

    for (const artifact of traceArtifacts) {
      const payload = artifact.payload as unknown as TopicSelectionV1bWorkflowHarnessTracePayload;
      if (payload.node_replay_key !== nodeReplayKey) {
        continue;
      }
      const traceArtifactRef = this.ref(
        'artifact_ref',
        artifact.artifact_ref_id,
        artifact.title_card_id ?? input.title_card_id ?? null,
      );
      return {
        exact: {
          ...payload.result,
          harness_trace_artifact_ref: traceArtifactRef,
          replay_provenance: {
            replayed: true,
            source_workflow_run_id: payload.workflow_run_id,
            source_node_attempt_id: payload.node_attempt_id,
            source_trace_artifact_ref: traceArtifactRef,
            node_replay_key: payload.node_replay_key,
          },
        },
        driftBlocker: null,
      };
    }

    const driftBlocker = traceArtifacts.length > 0
      ? this.replayDriftBlocker(traceArtifacts[0]!.payload as unknown as TopicSelectionV1bWorkflowHarnessTracePayload, input)
      : null;
    return {
      exact: null,
      driftBlocker,
    };
  }

  private async replayAuthorityBlocker(
    result: TopicSelectionV1bWorkflowHarnessRunResult,
  ): Promise<{ code: string; message: string } | null> {
    const refsToVerify: TopicSelectionFunctionalRef[] = [];
    if (result.authority_ref) {
      refsToVerify.push(result.authority_ref);
    }
    if (result.handoff_ref?.ref_type === 'artifact_ref') {
      const handoffArtifact = await this.controlPlane.getArtifactRef(result.handoff_ref.ref_id);
      if (!handoffArtifact) {
        return {
          code: 'REPLAY_HANDOFF_ARTIFACT_NOT_FOUND',
          message: 'Replay trace references a handoff artifact that no longer exists.',
        };
      }
      if (this.isRecord(handoffArtifact.payload) && this.isFunctionalRefArray(handoffArtifact.payload.required_refs)) {
        refsToVerify.push(...handoffArtifact.payload.required_refs);
      }
    }

    for (const ref of uniqueRefs(refsToVerify)) {
      const exists = await this.authorityRefExists(ref);
      if (exists === false) {
        return {
          code: 'REPLAY_AUTHORITY_REF_NOT_FOUND',
          message: `Replay trace references missing authority ${ref.ref_type}:${ref.ref_id}.`,
        };
      }
    }
    return null;
  }

  private async authorityRefExists(ref: TopicSelectionFunctionalRef): Promise<boolean | null> {
    switch (ref.ref_type) {
      case 'artifact_ref':
        return Boolean(await this.controlPlane.getArtifactRef(ref.ref_id));
      case 'readiness_gate_result':
        return Boolean(await this.controlPlane.getReadinessGateResult(ref.ref_id));
      case 'trace_snapshot':
        return Boolean(await this.controlPlane.getTraceSnapshot(ref.ref_id));
      case 'v1a_to_v1b_input_bundle':
        return this.runnerDependencies.needValidationRepository
          ? Boolean(await this.runnerDependencies.needValidationRepository.findV1aToV1bInputBundleById(ref.ref_id))
          : null;
      case 'v1b_intake_snapshot':
        return this.runnerDependencies.v1bIntakeRepository
          ? Boolean(await this.runnerDependencies.v1bIntakeRepository.findIntakeSnapshotById(ref.ref_id))
          : null;
      case 'research_constraint_profile':
        return this.runnerDependencies.v1bIntakeRepository
          ? Boolean(await this.runnerDependencies.v1bIntakeRepository.findResearchConstraintProfileById(ref.ref_id))
          : null;
      case 'v1b_intake_readiness_assessment':
        return this.runnerDependencies.v1bIntakeRepository
          ? Boolean(await this.runnerDependencies.v1bIntakeRepository.findReadinessAssessmentById(ref.ref_id))
          : null;
      case 'plan_research_slice_run':
        return this.runnerDependencies.researchSliceRepository
          ? Boolean(await this.runnerDependencies.researchSliceRepository.findPlanRunById(ref.ref_id))
          : null;
      case 'research_slice_option_set':
        return this.runnerDependencies.researchSliceRepository
          ? Boolean(await this.runnerDependencies.researchSliceRepository.findOptionSetById(ref.ref_id))
          : null;
      case 'research_slice_option':
        return this.runnerDependencies.researchSliceRepository
          ? Boolean(await this.runnerDependencies.researchSliceRepository.findOptionById(ref.ref_id))
          : null;
      case 'slice_selection_decision':
      case 'research_slice_selection_decision':
        return this.runnerDependencies.researchSliceRepository
          ? Boolean(await this.runnerDependencies.researchSliceRepository.findSelectionDecisionById(ref.ref_id))
          : null;
      case 'research_slice':
        return this.runnerDependencies.researchSliceRepository
          ? Boolean(await this.runnerDependencies.researchSliceRepository.findResearchSliceById(ref.ref_id))
          : null;
      case 'form_topic_question_run':
        return this.runnerDependencies.topicQuestionRepository
          ? Boolean(await this.runnerDependencies.topicQuestionRepository.findFormationRunById(ref.ref_id))
          : null;
      case 'topic_question_frame':
        return this.runnerDependencies.topicQuestionRepository
          ? Boolean(await this.runnerDependencies.topicQuestionRepository.findQuestionFrameById(ref.ref_id))
          : null;
      case 'topic_question_candidate_set':
        return this.runnerDependencies.topicQuestionRepository
          ? Boolean(await this.runnerDependencies.topicQuestionRepository.findCandidateSetById(ref.ref_id))
          : null;
      case 'topic_question_candidate':
        return this.runnerDependencies.topicQuestionRepository
          ? Boolean(await this.runnerDependencies.topicQuestionRepository.findCandidateById(ref.ref_id))
          : null;
      case 'topic_question_selection_decision':
        return this.runnerDependencies.topicQuestionRepository
          ? Boolean(await this.runnerDependencies.topicQuestionRepository.findSelectionDecisionById(ref.ref_id))
          : null;
      case 'topic_question':
        return this.runnerDependencies.topicQuestionRepository
          ? Boolean(await this.runnerDependencies.topicQuestionRepository.findTopicQuestionById(ref.ref_id))
          : null;
      case 'topic_question_contract':
        return this.runnerDependencies.topicQuestionRepository
          ? Boolean(await this.runnerDependencies.topicQuestionRepository.findTopicQuestionContractById(ref.ref_id))
          : null;
      case 'topic_question_answerability_plan':
        return this.runnerDependencies.topicQuestionRepository
          ? Boolean(await this.runnerDependencies.topicQuestionRepository.findAnswerabilityPlanById(ref.ref_id))
          : null;
      case 'assess_topic_value_run':
        return this.runnerDependencies.valueAssessmentRepository
          ? Boolean(await this.runnerDependencies.valueAssessmentRepository.findAssessmentRunById(ref.ref_id))
          : null;
      case 'topic_value_input_snapshot':
        return this.runnerDependencies.valueAssessmentRepository
          ? Boolean(await this.runnerDependencies.valueAssessmentRepository.findInputSnapshotById(ref.ref_id))
          : null;
      case 'topic_value_assessment':
        return this.runnerDependencies.valueAssessmentRepository
          ? Boolean(await this.runnerDependencies.valueAssessmentRepository.findAssessmentById(ref.ref_id))
          : null;
      case 'value_reasoning_memo':
        return this.runnerDependencies.valueAssessmentRepository
          ? Boolean(await this.runnerDependencies.valueAssessmentRepository.findReasoningMemoById(ref.ref_id))
          : null;
      case 'value_disposition_decision':
        return this.runnerDependencies.valueAssessmentRepository
          ? Boolean(await this.runnerDependencies.valueAssessmentRepository.findDispositionDecisionById(ref.ref_id))
          : null;
      case 'topic_package':
        return this.runnerDependencies.topicPackageRepository
          ? Boolean(await this.runnerDependencies.topicPackageRepository.findPackageById(ref.ref_id))
          : null;
      case 'package_trace_boundary_check':
        return this.runnerDependencies.topicPackageRepository
          ? Boolean(await this.runnerDependencies.topicPackageRepository.findTraceBoundaryCheckById(ref.ref_id))
          : null;
      case 'package_readiness_assessment':
      case 'topic_package_readiness_assessment':
        return this.runnerDependencies.topicPackageRepository
          ? Boolean(await this.runnerDependencies.topicPackageRepository.findReadinessAssessmentById(ref.ref_id))
          : null;
      case 'v1b_to_v1c_input_bundle':
        return this.runnerDependencies.topicPackageRepository
          ? Boolean(await this.runnerDependencies.topicPackageRepository.findV1cInputBundleById(ref.ref_id))
          : null;
      default:
        return null;
    }
  }

  private replayDriftBlocker(
    existingPayload: TopicSelectionV1bWorkflowHarnessTracePayload,
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
  ): { code: string; message: string } {
    const policy = this.getNodePolicy(input.node_id);
    const runtimeAdmission = this.runtimeAdmission(policy, input);
    const hashContext = this.hashContext(input, runtimeAdmission.runtimeAdmissionHash);
    const mismatchFields: ReplayDriftField[] = [];
    if (existingPayload.result.hashes.frozen_input_hash !== hashContext.frozenInputHash) {
      mismatchFields.push('frozen_input_hash');
    }
    if (existingPayload.result.hashes.execution_spec_hash !== hashContext.executionSpecHash) {
      mismatchFields.push('execution_spec_hash');
    }
    if ((existingPayload.result.hashes.semantic_artifact_hash ?? null) !== hashContext.semanticArtifactHash) {
      mismatchFields.push('semantic_artifact_hash');
    }
    if ((existingPayload.result.hashes.runtime_admission_hash ?? null) !== hashContext.runtimeAdmissionHash) {
      mismatchFields.push('runtime_admission_hash');
    }
    if (existingPayload.result.replay_identity.attempt_family_key !== hashContext.attemptFamilyKey) {
      mismatchFields.push('attempt_family_key');
    }
    if (existingPayload.request.policy_version !== input.policy_version) {
      mismatchFields.push('policy_version');
    }

    const code = this.replayDriftCode(mismatchFields);
    return {
      code,
      message: `node_attempt_id replay identity does not match the existing attempt: ${mismatchFields.join(', ') || 'node_replay_key'}.`,
    };
  }

  private replayDriftCode(mismatchFields: ReplayDriftField[]): string {
    if (
      mismatchFields.includes('execution_spec_hash')
      && mismatchFields.every((field) => field === 'execution_spec_hash' || field === 'runtime_admission_hash')
    ) {
      return 'REPLAY_EXECUTION_SPEC_HASH_MISMATCH';
    }
    if (mismatchFields.length !== 1) {
      return 'REPLAY_IDENTITY_MISMATCH';
    }
    switch (mismatchFields[0]) {
      case 'frozen_input_hash':
        return 'REPLAY_INPUT_HASH_MISMATCH';
      case 'execution_spec_hash':
        return 'REPLAY_EXECUTION_SPEC_HASH_MISMATCH';
      case 'semantic_artifact_hash':
        return 'REPLAY_SEMANTIC_ARTIFACT_HASH_MISMATCH';
      case 'runtime_admission_hash':
        return 'REPLAY_RUNTIME_ADMISSION_HASH_MISMATCH';
      case 'attempt_family_key':
        return 'REPLAY_ATTEMPT_FAMILY_MISMATCH';
      case 'policy_version':
        return 'REPLAY_POLICY_VERSION_MISMATCH';
    }
  }

  private runtimeAdmission(
    policy: TopicSelectionV1bWorkflowHarnessNodePolicy,
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
  ): RuntimeAdmissionResult {
    const semanticArtifacts = input.semantic_artifacts ?? [];
    const admissionRecords: Record<string, unknown>[] = [];
    const blocker = this.runtimeAdmissionBlocker(policy, input, admissionRecords);
    const runtimeSurfacePresent = policy.execution_kind === 'model_like'
      || input.run_mode != null
      || input.profile_id != null
      || input.execution_spec != null
      || semanticArtifacts.length > 0;

    return {
      runtimeAdmissionHash: runtimeSurfacePresent
        ? this.hash({
          node_id: input.node_id,
          policy_version: input.policy_version,
          requested_profile_id: input.profile_id ?? null,
          requested_run_mode: input.run_mode ?? null,
          execution_spec: input.execution_spec ?? null,
          semantic_artifact_count: semanticArtifacts.length,
          admissions: admissionRecords,
          blocker_code: blocker?.code ?? null,
        })
        : null,
      blocker,
    };
  }

  private runtimeAdmissionBlocker(
    policy: TopicSelectionV1bWorkflowHarnessNodePolicy,
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    admissionRecords: Record<string, unknown>[],
  ): { code: string; message: string } | null {
    const semanticArtifacts = input.semantic_artifacts ?? [];
    const deterministicOnlyNode = policy.execution_kind === 'deterministic'
      && policy.semantic_support_slots.length === 0;
    if (deterministicOnlyNode && (input.run_mode != null || input.profile_id != null)) {
      return {
        code: 'INVALID_NODE_RUNTIME_SPEC',
        message: 'Deterministic-only v1b nodes do not accept run_mode or profile_id.',
      };
    }
    if (
      policy.execution_kind !== 'model_like'
      && (input.run_mode != null || input.profile_id != null)
      && semanticArtifacts.length === 0
    ) {
      return {
        code: 'RUNTIME_FIELDS_REQUIRE_SEMANTIC_ARTIFACT',
        message: 'run_mode/profile_id are only meaningful with an admitted semantic support artifact on this node.',
      };
    }

    const artifactBlocker = this.semanticArtifactRuntimeAdmissionBlocker(policy, input, admissionRecords);
    if (artifactBlocker) {
      return artifactBlocker;
    }
    if (policy.execution_kind !== 'model_like') {
      return null;
    }

    const requiredSlot = this.requiredModelLikeSlot(policy);
    if (!requiredSlot) {
      return {
        code: 'MISSING_INVOCATION_SLOT_POLICY',
        message: 'Model-like node policy does not declare a required model draft slot.',
      };
    }
    const hasRequiredSlotArtifact = semanticArtifacts.some((artifact) => artifact.slot_id === requiredSlot.slot_id);
    if (!input.execution_spec && !hasRequiredSlotArtifact) {
      return {
        code: 'MISSING_INVOCATION_SLOT_INPUT',
        message: 'Model-like v1b nodes require an execution_spec admission or a frozen semantic artifact for the required slot.',
      };
    }
    if (!input.execution_spec) {
      return null;
    }

    const runMode = this.effectiveRunMode(input.run_mode ?? null, input.execution_spec.execution_mode);
    const profileId = input.profile_id ?? requiredSlot.default_profile_id;
    return this.resolveSlotProfileAdmission(requiredSlot, {
      executionMode: input.execution_spec.execution_mode,
      modelOptionId: input.execution_spec.model_option_id ?? null,
      outputContract: requiredSlot.output_contract,
      profileId,
      runMode,
      source: 'execution_spec',
    }, admissionRecords);
  }

  private semanticArtifactRuntimeAdmissionBlocker(
    policy: TopicSelectionV1bWorkflowHarnessNodePolicy,
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    admissionRecords: Record<string, unknown>[],
  ): { code: string; message: string } | null {
    for (const artifact of input.semantic_artifacts ?? []) {
      const slot = policy.semantic_support_slots.find((item) => item.slot_id === artifact.slot_id);
      if (!slot) {
        admissionRecords.push({
          source: 'semantic_artifact',
          slot_id: artifact.slot_id,
          admitted: false,
          blocker_code: 'UNKNOWN_SEMANTIC_SUPPORT_SLOT',
        });
        return {
          code: 'UNKNOWN_SEMANTIC_SUPPORT_SLOT',
          message: 'Semantic support artifact slot_id is not allowed by this node policy.',
        };
      }
      if (input.run_mode != null && artifact.run_mode !== input.run_mode) {
        return {
          code: 'RUNTIME_ADMISSION_ARTIFACT_MISMATCH',
          message: 'Semantic support artifact run_mode does not match the requested runtime admission.',
        };
      }
      if (input.profile_id != null && artifact.profile_id !== input.profile_id) {
        return {
          code: 'RUNTIME_ADMISSION_ARTIFACT_MISMATCH',
          message: 'Semantic support artifact profile_id does not match the requested runtime admission.',
        };
      }
      if (input.execution_spec && artifact.execution_mode !== input.execution_spec.execution_mode) {
        return {
          code: 'RUNTIME_ADMISSION_ARTIFACT_MISMATCH',
          message: 'Semantic support artifact execution_mode does not match execution_spec.',
        };
      }
      if (
        input.execution_spec
        && (artifact.model_option_id ?? null) !== (input.execution_spec.model_option_id ?? null)
      ) {
        return {
          code: 'RUNTIME_ADMISSION_ARTIFACT_MISMATCH',
          message: 'Semantic support artifact model_option_id does not match execution_spec.',
        };
      }

      const blocker = this.resolveSlotProfileAdmission(slot, {
        executionMode: artifact.execution_mode,
        modelOptionId: artifact.model_option_id,
        outputContract: artifact.output_contract,
        profileId: artifact.profile_id,
        runMode: artifact.run_mode,
        source: 'semantic_artifact',
      }, admissionRecords);
      if (blocker) {
        return blocker;
      }
    }
    return null;
  }

  private resolveSlotProfileAdmission(
    slot: TopicSelectionV1bWorkflowHarnessSemanticSupportSlotSpec,
    input: {
      executionMode: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['execution_mode'];
      modelOptionId: string | null;
      outputContract: string;
      profileId: string;
      runMode: TopicSelectionAgentRunMode;
      source: 'execution_spec' | 'semantic_artifact';
    },
    admissionRecords: Record<string, unknown>[],
  ): { code: string; message: string } | null {
    const baseRecord = {
      source: input.source,
      slot_id: slot.slot_id,
      execution_mode: input.executionMode,
      run_mode: input.runMode,
      profile_id: input.profileId,
      model_option_id: input.modelOptionId,
      output_contract: input.outputContract,
    };
    if (!slot.allowed_profile_ids.includes(input.profileId as TopicSelectionV1bWorkflowHarnessProfileId)) {
      admissionRecords.push({
        ...baseRecord,
        admitted: false,
        blocker_code: 'RUNTIME_PROFILE_NOT_ALLOWED',
      });
      return {
        code: 'RUNTIME_PROFILE_NOT_ALLOWED',
        message: 'Requested profile_id is not allowed by the semantic slot policy.',
      };
    }
    if (!slot.allowed_run_modes.includes(input.runMode)) {
      admissionRecords.push({
        ...baseRecord,
        admitted: false,
        blocker_code: 'RUNTIME_RUN_MODE_NOT_ALLOWED',
      });
      return {
        code: 'RUNTIME_RUN_MODE_NOT_ALLOWED',
        message: 'Requested run_mode is not allowed by the semantic slot policy.',
      };
    }
    if (input.executionMode === 'provider_llm' && !input.modelOptionId) {
      admissionRecords.push({
        ...baseRecord,
        admitted: false,
        blocker_code: 'RUNTIME_MODEL_OPTION_REQUIRED',
      });
      return {
        code: 'RUNTIME_MODEL_OPTION_REQUIRED',
        message: 'provider_llm runtime admission requires model_option_id.',
      };
    }
    if (input.executionMode !== 'provider_llm' && input.modelOptionId) {
      admissionRecords.push({
        ...baseRecord,
        admitted: false,
        blocker_code: 'RUNTIME_MODEL_OPTION_NOT_ALLOWED',
      });
      return {
        code: 'RUNTIME_MODEL_OPTION_NOT_ALLOWED',
        message: 'model_option_id is only valid for provider_llm runtime admission.',
      };
    }
    if (input.executionMode === 'human_delegated') {
      admissionRecords.push({
        ...baseRecord,
        admitted: true,
        profile_hash: null,
        normalized_params_hash: null,
      });
      return null;
    }
    if (!this.isRegistryExecutionMode(input.executionMode)) {
      admissionRecords.push({
        ...baseRecord,
        admitted: false,
        blocker_code: 'RUNTIME_EXECUTION_MODE_NOT_REGISTRY_BACKED',
      });
      return {
        code: 'RUNTIME_EXECUTION_MODE_NOT_REGISTRY_BACKED',
        message: 'Execution mode is not backed by the model profile registry.',
      };
    }

    const executionMode: TopicSelectionAgentExecutionMode = input.executionMode;
    const resolvedProfile = this.resolveRegistryProfile({
      executionMode,
      modelOptionId: input.modelOptionId,
      profileId: input.profileId,
      runMode: input.runMode,
    }, baseRecord, admissionRecords);
    if (!resolvedProfile) {
      return {
        code: 'RUNTIME_PROFILE_REGISTRY_REJECTED',
        message: 'Requested runtime profile could not be resolved by the model profile registry.',
      };
    }
    if (resolvedProfile.profile.output_contract !== slot.output_contract
      || resolvedProfile.profile.output_contract !== input.outputContract) {
      admissionRecords.push({
        ...baseRecord,
        admitted: false,
        blocker_code: 'RUNTIME_PROFILE_CONTRACT_MISMATCH',
        profile_output_contract: resolvedProfile.profile.output_contract,
      });
      return {
        code: 'RUNTIME_PROFILE_CONTRACT_MISMATCH',
        message: 'Resolved model profile output contract does not match the semantic slot contract.',
      };
    }
    admissionRecords.push({
      ...baseRecord,
      admitted: true,
      profile_hash: resolvedProfile.profile_hash,
      resolved_model_option_id: resolvedProfile.selected_model_option?.option_id ?? null,
      normalized_params_hash: resolvedProfile.normalized_params_hash,
    });
    return null;
  }

  private resolveRegistryProfile(
    input: {
      executionMode: TopicSelectionAgentExecutionMode;
      modelOptionId: string | null;
      profileId: string;
      runMode: TopicSelectionAgentRunMode;
    },
    baseRecord: Record<string, unknown>,
    admissionRecords: Record<string, unknown>[],
  ): TopicSelectionResolvedModelProfile | null {
    try {
      return this.modelProfileRegistry.resolveProfile({
        profile_id: input.profileId,
        execution_mode: input.executionMode,
        run_mode: input.runMode,
        model_option_id: input.modelOptionId,
      });
    } catch (error: unknown) {
      admissionRecords.push({
        ...baseRecord,
        admitted: false,
        blocker_code: 'RUNTIME_PROFILE_REGISTRY_REJECTED',
        registry_error: error instanceof Error ? error.message : 'unknown registry error',
      });
      return null;
    }
  }

  private requiredModelLikeSlot(
    policy: TopicSelectionV1bWorkflowHarnessNodePolicy,
  ): TopicSelectionV1bWorkflowHarnessSemanticSupportSlotSpec | null {
    return policy.semantic_support_slots.find((slot) => (
      slot.required_for_progress && slot.allowed_effect === 'model_draft_for_gate'
    )) ?? null;
  }

  private effectiveRunMode(
    runMode: TopicSelectionAgentRunMode | null,
    executionMode: TopicSelectionAgentExecutionMode,
  ): TopicSelectionAgentRunMode {
    if (runMode) {
      return runMode;
    }
    return executionMode === 'mocked_llm' ? 'test' : 'acceptance';
  }

  private isRegistryExecutionMode(
    executionMode: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['execution_mode'],
  ): executionMode is TopicSelectionAgentExecutionMode {
    return executionMode === 'mocked_llm'
      || executionMode === 'codex_assisted'
      || executionMode === 'provider_llm';
  }

  private policyBlocker(
    policy: TopicSelectionV1bWorkflowHarnessNodePolicy,
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
  ): { code: string; message: string } | null {
    const allowedInputContracts = policy.allowed_input_contracts ?? [policy.input_contract];
    if (!allowedInputContracts.includes(input.frozen_input.input_contract)) {
      return {
        code: 'FROZEN_INPUT_CONTRACT_MISMATCH',
        message: 'frozen_input.input_contract does not match the invoked node policy.',
      };
    }
    if (input.frozen_input.snapshot_kind !== policy.required_frozen_snapshot_kind) {
      return {
        code: 'FROZEN_INPUT_SNAPSHOT_KIND_MISMATCH',
        message: 'frozen_input.snapshot_kind does not match the invoked node policy.',
      };
    }
    if (!input.frozen_input.source_refs.some((sourceRef) => sourceRef.ref_type === input.frozen_input.snapshot_kind)) {
      return {
        code: 'FROZEN_INPUT_SOURCE_REF_KIND_MISMATCH',
        message: 'frozen_input.source_refs must include a ref matching frozen_input.snapshot_kind.',
      };
    }
    if (!policy.execution_spec_allowed && input.execution_spec) {
      return {
        code: 'INVALID_NODE_PROVIDER_SPEC',
        message: 'This v1b node policy does not allow model-like execution_spec or provider configuration.',
      };
    }
    if (input.execution_spec?.model_option_id && input.execution_spec.execution_mode !== 'provider_llm') {
      return {
        code: 'INVALID_NODE_PROVIDER_SPEC',
        message: 'model_option_id is only valid when execution_mode is provider_llm.',
      };
    }
    if (input.execution_spec?.model_option_id && !policy.model_option_id_allowed) {
      return {
        code: 'INVALID_NODE_PROVIDER_SPEC',
        message: 'This v1b node policy does not allow model_option_id.',
      };
    }
    if (
      input.execution_spec
      && !policy.allowed_execution_modes.includes(input.execution_spec.execution_mode)
    ) {
      return {
        code: 'INVALID_NODE_EXECUTION_MODE',
        message: 'This v1b node policy does not allow the requested execution mode.',
      };
    }
    const semanticArtifacts = input.semantic_artifacts ?? [];
    if (semanticArtifacts.length > 0 && policy.semantic_support_slots.length === 0) {
      return {
        code: 'SEMANTIC_ARTIFACT_NOT_ALLOWED',
        message: 'This v1b node policy does not allow semantic support artifacts.',
      };
    }
    for (const artifact of semanticArtifacts) {
      if (artifact.node_id !== input.node_id) {
        return {
          code: 'SEMANTIC_ARTIFACT_NODE_MISMATCH',
          message: 'Semantic support artifact node_id does not match the invoked node.',
        };
      }
      const slot = policy.semantic_support_slots.find((item) => item.slot_id === artifact.slot_id);
      if (!slot) {
        return {
          code: 'UNKNOWN_SEMANTIC_SUPPORT_SLOT',
          message: 'Semantic support artifact slot_id is not allowed by this node policy.',
        };
      }
      if (artifact.allowed_effect !== slot.allowed_effect) {
        return {
          code: 'SEMANTIC_ARTIFACT_EFFECT_NOT_ALLOWED',
          message: 'Semantic support artifact effect does not match the node slot policy.',
        };
      }
      if (!slot.allowed_execution_modes.includes(artifact.execution_mode)) {
        return {
          code: 'SEMANTIC_ARTIFACT_EXECUTION_MODE_NOT_ALLOWED',
          message: 'Semantic support artifact execution mode is not allowed by the node slot policy.',
        };
      }
      if (artifact.output_contract !== slot.output_contract) {
        return {
          code: 'SEMANTIC_ARTIFACT_CONTRACT_MISMATCH',
          message: 'Semantic support artifact output contract does not match the node slot policy.',
        };
      }
      if (artifact.input_hash !== hashContext.frozenInputHash) {
        return {
          code: 'SEMANTIC_ARTIFACT_INPUT_HASH_MISMATCH',
          message: 'Semantic support artifact input_hash does not match frozen input hash.',
        };
      }
    }
    return null;
  }

  private async invokeImplementedRunner(
    policy: TopicSelectionV1bWorkflowHarnessNodePolicy,
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    switch (policy.node_id) {
      case 'topic-selection.v1b.create-intake-snapshot.v1':
        return this.runN1CreateIntakeSnapshot(input, hashContext);
      case 'topic-selection.v1b.record-research-constraint-profile.v1':
        return this.runN2RecordConstraintProfile(input, hashContext);
      case 'topic-selection.v1b.assess-intake-readiness.v1':
        return this.runN3AssessIntakeReadiness(input, hashContext);
      case 'topic-selection.v1b.generate-research-slice-options.v1':
        return this.runN4GenerateResearchSliceOptions(input, hashContext);
      case 'topic-selection.v1b.select-research-slice.v1':
        return this.runN5SelectResearchSlice(input, hashContext);
      case 'topic-selection.v1b.generate-topic-question-candidates.v1':
        return this.runN6GenerateTopicQuestionCandidates(input, hashContext);
      case 'topic-selection.v1b.materialize-topic-question-contract.v1':
        return this.runN7MaterializeTopicQuestionContract(input, hashContext);
      case 'topic-selection.v1b.assess-topic-value.v1':
        return this.runN8AssessTopicValue(input, hashContext);
      case 'topic-selection.v1b.decide-value-disposition.v1':
        return this.runN9DecideValueDisposition(input, hashContext);
      case 'topic-selection.v1b.create-draft-topic-package.v1':
        return this.runN10CreateDraftTopicPackage(input, hashContext);
      case 'topic-selection.v1b.publish-v1c-input-bundle.v1':
        return this.runN11PublishV1cInputBundle(input, hashContext);
      default:
        throw new AppError(500, 'INTERNAL_ERROR', `No v1b workflow harness runner is registered for node ${policy.node_id}.`);
    }
  }

  private runnerDependencyBlocker(
    nodeId: TopicSelectionV1bWorkflowHarnessNodeId,
  ): { code: string; message: string } | null {
    const missing: string[] = [];
    const requireV1bIntake =
      nodeId === 'topic-selection.v1b.create-intake-snapshot.v1'
      || nodeId === 'topic-selection.v1b.record-research-constraint-profile.v1'
      || nodeId === 'topic-selection.v1b.assess-intake-readiness.v1'
      || nodeId === 'topic-selection.v1b.generate-research-slice-options.v1';
    const requireNeedValidation =
      nodeId === 'topic-selection.v1b.create-intake-snapshot.v1'
      || nodeId === 'topic-selection.v1b.record-research-constraint-profile.v1';
    const requireEvidenceMap = nodeId === 'topic-selection.v1b.create-intake-snapshot.v1';
    const requireSearchResource =
      nodeId === 'topic-selection.v1b.create-intake-snapshot.v1'
      || nodeId === 'topic-selection.v1b.assess-intake-readiness.v1';
    const requireRecheckRisk =
      nodeId === 'topic-selection.v1b.create-intake-snapshot.v1'
      || nodeId === 'topic-selection.v1b.assess-intake-readiness.v1';
    const requireResearchSlice =
      nodeId === 'topic-selection.v1b.generate-research-slice-options.v1'
      || nodeId === 'topic-selection.v1b.select-research-slice.v1'
      || nodeId === 'topic-selection.v1b.generate-topic-question-candidates.v1'
      || nodeId === 'topic-selection.v1b.assess-topic-value.v1';
    const requireTopicQuestion =
      nodeId === 'topic-selection.v1b.generate-topic-question-candidates.v1'
      || nodeId === 'topic-selection.v1b.materialize-topic-question-contract.v1'
      || nodeId === 'topic-selection.v1b.assess-topic-value.v1';
    const requireValueAssessment =
      nodeId === 'topic-selection.v1b.assess-topic-value.v1'
      || nodeId === 'topic-selection.v1b.decide-value-disposition.v1'
      || nodeId === 'topic-selection.v1b.create-draft-topic-package.v1';
    const requireTopicPackage =
      nodeId === 'topic-selection.v1b.create-draft-topic-package.v1'
      || nodeId === 'topic-selection.v1b.publish-v1c-input-bundle.v1';
    if (requireV1bIntake && !this.runnerDependencies.v1bIntakeRepository) {
      missing.push('v1bIntakeRepository');
    }
    if (requireNeedValidation && !this.runnerDependencies.needValidationRepository) {
      missing.push('needValidationRepository');
    }
    if (requireEvidenceMap && !this.runnerDependencies.evidenceMapRepository) {
      missing.push('evidenceMapRepository');
    }
    if (requireSearchResource && !this.runnerDependencies.searchResourceRepository) {
      missing.push('searchResourceRepository');
    }
    if (requireRecheckRisk && !this.runnerDependencies.recheckRiskMemoryRepository) {
      missing.push('recheckRiskMemoryRepository');
    }
    if (requireResearchSlice && !this.runnerDependencies.researchSliceRepository) {
      missing.push('researchSliceRepository');
    }
    if (requireTopicQuestion && !this.runnerDependencies.topicQuestionRepository) {
      missing.push('topicQuestionRepository');
    }
    if (requireValueAssessment && !this.runnerDependencies.valueAssessmentRepository) {
      missing.push('valueAssessmentRepository');
    }
    if (requireTopicPackage && !this.runnerDependencies.topicPackageRepository) {
      missing.push('topicPackageRepository');
    }
    if (missing.length === 0) {
      return null;
    }
    const installedNodeCount = nodeId === 'topic-selection.v1b.publish-v1c-input-bundle.v1'
      ? 'N11'
      : nodeId === 'topic-selection.v1b.create-draft-topic-package.v1'
        ? 'N10'
        : nodeId === 'topic-selection.v1b.decide-value-disposition.v1'
          ? 'N9'
          : nodeId === 'topic-selection.v1b.assess-topic-value.v1'
            ? 'N8'
            : nodeId === 'topic-selection.v1b.materialize-topic-question-contract.v1'
              ? 'N7'
              : nodeId === 'topic-selection.v1b.generate-topic-question-candidates.v1'
                ? 'N6'
                : nodeId === 'topic-selection.v1b.select-research-slice.v1'
                  ? 'N5'
                  : nodeId === 'topic-selection.v1b.generate-research-slice-options.v1'
                    ? 'N4'
                    : 'N1-N3';
    return {
      code: 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED',
      message: `The v1b ${installedNodeCount} harness runner is missing repository dependencies: ${missing.join(', ')}.`,
    };
  }

  private async runN1CreateIntakeSnapshot(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    const dependencyBlocker = this.runnerDependencyBlocker(input.node_id);
    if (dependencyBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: dependencyBlocker.code,
        message: dependencyBlocker.message,
      });
    }
    const payload = this.parseN1Payload(input.frozen_input.payload);
    if (!payload.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: payload.code,
        message: payload.message,
      });
    }

    const needRepository = this.runnerDependencies.needValidationRepository!;
    const evidenceRepository = this.runnerDependencies.evidenceMapRepository!;
    const searchRepository = this.runnerDependencies.searchResourceRepository!;
    const v1bRepository = this.runnerDependencies.v1bIntakeRepository!;
    const bundle = await needRepository.findV1aToV1bInputBundleById(payload.value.v1b_input_bundle_id);
    if (!bundle) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N1_V1A_BUNDLE_NOT_FOUND',
        message: 'N1 requires an explicit frozen v1a to v1b input bundle.',
      });
    }

    const bundleRef = this.bundleRef(bundle);
    const expectedBundleHash = this.hash(bundle);
    const sourceRefs = this.v1aBundleSourceRefs(bundle, bundleRef);
    const expectedSourceRefsHash = this.hash(sourceRefs);
    const metadataBlocker = this.n1MetadataBlocker(payload.value, bundleRef, expectedBundleHash, expectedSourceRefsHash);
    if (metadataBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: metadataBlocker.code,
        message: metadataBlocker.message,
      });
    }

    const [
      validatedNeed,
      needCandidate,
      supportPacket,
      adjudication,
      traceResolution,
      evidenceMap,
      searchRun,
      searchPlan,
      literatureSnapshot,
    ] = await Promise.all([
      needRepository.findValidatedNeedById(bundle.validated_need_id),
      needRepository.findNeedCandidateById(bundle.source_need_candidate_id),
      needRepository.findValidationDecisionSupportPacketById(bundle.support_packet_id),
      needRepository.findAdjudicationResultById(bundle.adjudication_result_id),
      this.resolveTraceRefs(bundle.trace_refs),
      evidenceRepository.findEvidenceMapById(bundle.evidence_map_ref.ref_id),
      searchRepository.findSearchRunById(bundle.search_run_ref.ref_id),
      searchRepository.findSearchPlanById(bundle.search_plan_ref.ref_id),
      searchRepository.findLiteratureResourcePoolSnapshotById(bundle.literature_snapshot_ref.ref_id),
    ]);
    const humanDecision = this.isHumanDecisionRef(bundle.human_decision_ref)
      ? await this.controlPlane.getHumanDecision(bundle.human_decision_ref.ref_id)
      : null;
    const traceIssues = this.intakeTraceIssues({
      bundle,
      validatedNeed,
      needCandidate,
      supportPacket,
      adjudication,
      humanDecision,
      traceRefResolution: traceResolution,
      evidenceMapExists: Boolean(evidenceMap),
      evidenceMapFreshnessStatus: evidenceMap?.freshness_status ?? null,
      searchRunExists: Boolean(searchRun),
      searchPlanExists: Boolean(searchPlan),
      literatureSnapshotExists: Boolean(literatureSnapshot),
    });
    if (traceIssues.length > 0) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N1_STALE_OR_INVALID_V1A_TRACE',
        message: 'N1 intake snapshot requires a current and internally consistent frozen v1a bundle.',
      });
    }

    const createdBy = input.created_by ?? 'system';
    const snapshotId = this.idFactory('v1b_intake_snapshot');
    const snapshotVersion = this.versionFromId(snapshotId);
    const snapshotRef = this.ref('v1b_intake_snapshot', snapshotId, bundle.title_card_id, snapshotVersion);
    const snapshotAuthoritySeed = {
      bundle_ref: bundleRef,
      evidence_map_freshness_status: evidenceMap?.freshness_status ?? null,
      source_refs_hash: expectedSourceRefsHash,
      trace_issue_codes: [],
      trace_status: 'passed',
    };
    const authorityHash = this.hash(snapshotAuthoritySeed);
    const gateResultHash = this.outcomeGateResultHash(input, hashContext, {
      authorityHash,
      blockerCodes: [],
      gateStatus: 'admitted',
      routeDecision: 'invoke_next',
      warningCodes: [],
    });
    const handoffPayload: TopicSelectionV1bWorkflowHarnessHandoffPayload = {
      intake_snapshot_ref: snapshotRef,
      intake_snapshot_hash: authorityHash,
      v1a_bundle_ref: bundleRef,
      v1a_bundle_hash: expectedBundleHash,
    };
    const handoff = this.buildHandoff(input, {
      handoffKind: 'N1ToN2Handoff',
      payload: handoffPayload,
      requiredRefs: [snapshotRef, bundleRef],
      residualRiskRefs: bundle.risk_refs,
      sourceAuthorityHash: authorityHash,
      sourceAuthorityRef: snapshotRef,
      sourceGateResultHash: gateResultHash,
      upstreamLineageHash: this.hash({
        bundle_hash: expectedBundleHash,
        source_refs_hash: expectedSourceRefsHash,
      }),
      warningCodes: [],
    });
    const handoffHash = this.hash(handoff);
    const result = await this.persistAdmittedResult(input, hashContext, {
      acceptedRiskRefs: [],
      authorityHash,
      authorityRef: snapshotRef,
      blockers: [],
      errorCode: null,
      errorMessage: null,
      failureClass: null,
      gateStatus: 'admitted',
      handoff,
      handoffHash,
      routeDecision: 'invoke_next',
      sourceRef: bundleRef,
      targetRef: snapshotRef,
      tracePhase: 'T-107 N1 intake snapshot runner',
      tracePayload: {
        v1b_input_bundle_id: bundle.v1b_input_bundle_id,
        trace_status: 'passed',
      },
      transitionKey: 'topic-selection.v1b.harness.n1-intake-snapshot',
      warnings: [],
    }, {
      writeAuthority: async (prepared) => {
        await v1bRepository.createIntakeSnapshot({
          v1b_intake_snapshot_id: snapshotId,
          workspace_id: input.workspace_id ?? bundle.workspace_id ?? null,
          title_card_id: bundle.title_card_id,
          v1b_input_bundle_id: bundle.v1b_input_bundle_id,
          validated_need_id: bundle.validated_need_id,
          snapshot_version: snapshotVersion,
          v1b_input_bundle_ref: bundleRef,
          validated_need_ref: bundle.validated_need_ref,
          source_need_candidate_ref: bundle.source_need_candidate_ref,
          adjudication_result_ref: bundle.adjudication_result_ref,
          support_packet_ref: bundle.support_packet_ref,
          human_decision_ref: bundle.human_decision_ref,
          evidence_map_ref: bundle.evidence_map_ref,
          search_run_ref: bundle.search_run_ref,
          search_plan_ref: bundle.search_plan_ref,
          literature_snapshot_ref: bundle.literature_snapshot_ref,
          evidence_role_bundle: bundle.evidence_role_bundle,
          trace_refs: bundle.trace_refs,
          risk_refs: bundle.risk_refs,
          gap_codes: bundle.gap_codes,
          memory_suggestion_refs: bundle.memory_suggestion_refs,
          recheck_request_refs: bundle.recheck_request_refs,
          handoff_payload: bundle.handoff_payload,
          trace_status: 'passed',
          trace_issues: [],
          evidence_map_freshness_status: evidenceMap?.freshness_status ?? null,
          input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
          workflow_run_id: input.workflow_run_id,
          gate_result_id: prepared.gateResultRef.ref_id,
          transition_attempt_id: null,
          trace_snapshot_id: null,
          artifact_refs: uniqueRefs([prepared.handoffRef]),
          created_by: createdBy,
          created_at: this.now(),
        });
      },
    });
    return result;
  }

  private async runN2RecordConstraintProfile(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    const dependencyBlocker = this.runnerDependencyBlocker(input.node_id);
    if (dependencyBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: dependencyBlocker.code,
        message: dependencyBlocker.message,
      });
    }
    const payload = this.parseN2Payload(input.frozen_input.payload);
    if (!payload.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: payload.code,
        message: payload.message,
      });
    }
    const acceptedPayloadHash = this.hash(payload.value.accepted_constraint_profile_payload);
    if (acceptedPayloadHash !== payload.value.accepted_constraint_profile_payload_hash) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N2_ACCEPTED_PROFILE_PAYLOAD_HASH_MISMATCH',
        message: 'N2 accepted constraint profile payload hash does not match the frozen payload.',
      });
    }
    const codexBlocker = this.n2CodexDelegationBlocker(input, payload.value, acceptedPayloadHash);
    if (codexBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: codexBlocker.code,
        message: codexBlocker.message,
      });
    }
    const semanticSupport = await this.resolveEarlySemanticSupportPayload<TopicSelectionV1bAcceptedConstraintProfilePayload>(
      input,
      'n2_constraint_profile_semantic_support',
      (value): value is TopicSelectionV1bAcceptedConstraintProfilePayload =>
        this.isRecord(value) && this.acceptedConstraintProfilePayloadIsValid(value),
    );
    if (!semanticSupport.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: semanticSupport.code,
        message: semanticSupport.message,
      });
    }

    const v1bRepository = this.runnerDependencies.v1bIntakeRepository!;
    const snapshot = await v1bRepository.findIntakeSnapshotById(payload.value.intake_snapshot_ref.ref_id);
    if (!snapshot) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N2_INTAKE_SNAPSHOT_NOT_FOUND',
        message: 'N2 requires the frozen N1 intake snapshot authority.',
      });
    }
    const expectedSnapshotRef = this.snapshotRef(snapshot);
    const expectedSnapshotHash = this.hashSnapshotAuthority(snapshot);
    if (!this.refsEqual(payload.value.intake_snapshot_ref, expectedSnapshotRef)
      || payload.value.intake_snapshot_hash !== expectedSnapshotHash) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N2_INTAKE_SNAPSHOT_HASH_MISMATCH',
        message: 'N2 frozen intake snapshot ref/hash does not match persisted N1 authority.',
      });
    }
    if (!this.refsEqual(payload.value.v1a_bundle_ref, snapshot.v1b_input_bundle_ref)
      || payload.value.v1a_bundle_hash !== this.hash(await this.runnerDependencies.needValidationRepository!.findV1aToV1bInputBundleById(snapshot.v1b_input_bundle_id))) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N2_V1A_BUNDLE_HASH_MISMATCH',
        message: 'N2 frozen v1a bundle ref/hash does not match the snapshot lineage.',
      });
    }

    const previousProfile = payload.value.previous_profile_ref
      ? await v1bRepository.findResearchConstraintProfileById(payload.value.previous_profile_ref.ref_id)
      : null;
    if (payload.value.previous_profile_ref && !previousProfile) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N2_PREVIOUS_PROFILE_NOT_FOUND',
        message: 'N2 previous profile ref is frozen but the profile cannot be loaded.',
      });
    }
    if (
      previousProfile
      && (
        previousProfile.v1b_input_bundle_id !== snapshot.v1b_input_bundle_id
        || payload.value.previous_profile_hash !== this.hashProfileAuthority(previousProfile)
      )
    ) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N2_PREVIOUS_PROFILE_HASH_MISMATCH',
        message: 'N2 previous profile ref/hash does not match the snapshot lineage.',
      });
    }

    const profileId = this.idFactory('research_constraint_profile');
    const profileVersion = this.versionFromId(profileId);
    const profileRef = this.ref('research_constraint_profile', profileId, snapshot.title_card_id, profileVersion);
    const authorityHash = this.hash({
      accepted_profile_payload_hash: acceptedPayloadHash,
      intake_snapshot_hash: this.hash({
        intake_snapshot_ref: expectedSnapshotRef,
        v1b_input_bundle_ref: snapshot.v1b_input_bundle_ref,
      }),
      previous_profile_ref: previousProfile ? this.profileRef(previousProfile) : null,
      profile_ref: profileRef,
    });
    const gateResultHash = this.outcomeGateResultHash(input, hashContext, {
      authorityHash,
      blockerCodes: [],
      gateStatus: 'admitted',
      routeDecision: 'invoke_next',
      warningCodes: [],
    });
    const handoffPayload: TopicSelectionV1bWorkflowHarnessHandoffPayload = {
      constraint_profile_ref: profileRef,
      constraint_profile_hash: authorityHash,
      intake_snapshot_ref: expectedSnapshotRef,
      intake_snapshot_hash: expectedSnapshotHash,
    };
    const handoff = this.buildHandoff(input, {
      handoffKind: 'N2ToN3Handoff',
      payload: handoffPayload,
      requiredRefs: [profileRef, expectedSnapshotRef],
      residualRiskRefs: snapshot.risk_refs,
      sourceAuthorityHash: authorityHash,
      sourceAuthorityRef: profileRef,
      sourceGateResultHash: gateResultHash,
      upstreamLineageHash: this.hash({
        accepted_profile_payload_hash: acceptedPayloadHash,
        intake_snapshot_hash: expectedSnapshotHash,
      }),
      warningCodes: [],
    });
    const handoffHash = this.hash(handoff);
    const createdBy = this.n2CreatedBy(input.created_by, payload.value.authority_input_provider);
    const result = await this.persistAdmittedResult(input, hashContext, {
      authorityHash,
      authorityRef: profileRef,
      blockers: [],
      failureClass: null,
      gateStatus: 'admitted',
      handoff,
      handoffHash,
      routeDecision: 'invoke_next',
      sourceRef: expectedSnapshotRef,
      targetRef: profileRef,
      tracePhase: 'T-107 N2 constraint profile runner',
      tracePayload: {
        accepted_profile_payload_hash: acceptedPayloadHash,
        authority_input_provider: payload.value.authority_input_provider,
      },
      transitionKey: 'topic-selection.v1b.harness.n2-constraint-profile',
      warnings: [],
    }, {
      writeAuthority: async (prepared) => {
        const accepted = payload.value.accepted_constraint_profile_payload;
        await v1bRepository.createResearchConstraintProfile({
          research_constraint_profile_id: profileId,
          workspace_id: input.workspace_id ?? snapshot.workspace_id ?? null,
          title_card_id: snapshot.title_card_id,
          v1b_intake_snapshot_id: snapshot.v1b_intake_snapshot_id,
          v1b_input_bundle_id: snapshot.v1b_input_bundle_id,
          validated_need_id: snapshot.validated_need_id,
          profile_version: profileVersion,
          v1b_intake_snapshot_ref: expectedSnapshotRef,
          v1b_input_bundle_ref: snapshot.v1b_input_bundle_ref,
          validated_need_ref: snapshot.validated_need_ref,
          supersedes_profile_ref: previousProfile ? this.profileRef(previousProfile) : null,
          target_community: accepted.target_community,
          target_venue_class: accepted.target_venue_class,
          intended_contribution_style: accepted.intended_contribution_style,
          method_constraints: accepted.method_constraints,
          resource_constraints: accepted.resource_constraints,
          available_assets: accepted.available_assets,
          feasibility_budget: accepted.feasibility_budget,
          non_goals: accepted.non_goals,
          claim_ceiling: accepted.claim_ceiling,
          human_constraint_notes: accepted.human_constraint_notes,
          constraint_payload: accepted.constraint_payload,
          input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
          workflow_run_id: input.workflow_run_id,
          gate_result_id: prepared.gateResultRef.ref_id,
          transition_attempt_id: null,
          trace_snapshot_id: null,
          artifact_refs: uniqueRefs([prepared.handoffRef]),
          created_by: createdBy,
          created_at: this.now(),
        });
      },
    });
    return result;
  }

  private async runN3AssessIntakeReadiness(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    const dependencyBlocker = this.runnerDependencyBlocker(input.node_id);
    if (dependencyBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: dependencyBlocker.code,
        message: dependencyBlocker.message,
      });
    }
    const payload = this.parseN3Payload(input.frozen_input.payload);
    if (!payload.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: payload.code,
        message: payload.message,
      });
    }
    const semanticSupport = await this.resolveEarlySemanticSupportPayload<TopicSelectionV1bIntakeReadinessClassificationSupportPayload>(
      input,
      'n3_readiness_classification',
      this.isN3ReadinessClassificationSupportPayload.bind(this),
    );
    if (!semanticSupport.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: semanticSupport.code,
        message: semanticSupport.message,
      });
    }

    const v1bRepository = this.runnerDependencies.v1bIntakeRepository!;
    const [snapshot, profile] = await Promise.all([
      v1bRepository.findIntakeSnapshotById(payload.value.intake_snapshot_ref.ref_id),
      v1bRepository.findResearchConstraintProfileById(payload.value.constraint_profile_ref.ref_id),
    ]);
    if (!snapshot || !profile) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N3_FROZEN_AUTHORITY_NOT_FOUND',
        message: 'N3 requires frozen N1 snapshot and N2 constraint profile authorities.',
      });
    }
    if (profile.v1b_intake_snapshot_id !== snapshot.v1b_intake_snapshot_id) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N3_PROFILE_SNAPSHOT_MISMATCH',
        message: 'N3 constraint profile belongs to a different intake snapshot.',
      });
    }
    const snapshotHash = this.hashSnapshotAuthority(snapshot);
    const profileHash = this.hashProfileAuthority(profile);
    if (!this.refsEqual(payload.value.intake_snapshot_ref, this.snapshotRef(snapshot))
      || payload.value.intake_snapshot_hash !== snapshotHash) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N3_INTAKE_SNAPSHOT_HASH_MISMATCH',
        message: 'N3 frozen intake snapshot ref/hash does not match persisted N1 authority.',
      });
    }
    if (!this.refsEqual(payload.value.constraint_profile_ref, this.profileRef(profile))
      || payload.value.constraint_profile_hash !== profileHash) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N3_CONSTRAINT_PROFILE_HASH_MISMATCH',
        message: 'N3 frozen constraint profile ref/hash does not match persisted N2 authority.',
      });
    }

    const readiness = await this.computeReadiness(snapshot, profile);
    const readinessId = this.idFactory('v1b_intake_readiness');
    const readinessRef = this.ref('v1b_intake_readiness_assessment', readinessId, snapshot.title_card_id);
    const authorityHash = this.hash({
      accepted_risk_refs: readiness.acceptedRiskRefs,
      blocker_codes: readiness.blockers.map((blocker) => blocker.code),
      constraint_profile_hash: profileHash,
      missing_constraint_codes: readiness.missingConstraintCodes,
      n2_handoff_hash: payload.value.n2_handoff_hash,
      recommendation: readiness.recommendation,
      readiness_ref: readinessRef,
      snapshot_hash: snapshotHash,
      stale_ref_codes: readiness.staleRefCodes,
      uncovered_recheck_refs: readiness.uncoveredOpenRechecks.map((request) => request.search_plan_recheck_request_id),
      warning_codes: readiness.warnings.map((warning) => warning.code),
    });
    const ready = readiness.blockers.length === 0 && readiness.recommendation === 'ready_for_slice';
    const gateStatus: TopicSelectionV1bWorkflowHarnessGateStatus = readiness.blockers.length > 0
      ? 'blocked'
      : readiness.warnings.length > 0
        ? 'admitted_with_warnings'
        : 'admitted';
    const routeDecision: TopicSelectionV1bWorkflowHarnessRouteDecision = ready ? 'invoke_next' : 'loopback';
    const gateResultHash = this.outcomeGateResultHash(input, hashContext, {
      authorityHash,
      blockerCodes: readiness.blockers.map((blocker) => blocker.code),
      gateStatus,
      routeDecision,
      warningCodes: readiness.warnings.map((warning) => warning.code),
    });
    const handoff = ready
      ? this.buildHandoff(input, {
        handoffKind: 'N3ToN4Handoff',
        payload: {
          intake_readiness_ref: readinessRef,
          intake_readiness_hash: authorityHash,
          constraint_profile_ref: this.profileRef(profile),
          constraint_profile_hash: profileHash,
        },
        requiredRefs: [readinessRef, this.profileRef(profile), this.snapshotRef(snapshot)],
        residualRiskRefs: readiness.acceptedRiskRefs,
        sourceAuthorityHash: authorityHash,
        sourceAuthorityRef: readinessRef,
        sourceGateResultHash: gateResultHash,
        upstreamLineageHash: this.hash({
          constraint_profile_hash: profileHash,
          n2_handoff_hash: payload.value.n2_handoff_hash,
          snapshot_hash: snapshotHash,
        }),
        warningCodes: readiness.warnings.map((warning) => warning.code),
      })
      : null;
    const handoffHash = handoff ? this.hash(handoff) : null;
    const result = await this.persistAdmittedResult(input, hashContext, {
      acceptedRiskRefs: readiness.acceptedRiskRefs,
      authorityHash,
      authorityRef: readinessRef,
      blockers: readiness.blockers,
      errorCode: readiness.blockers[0]?.code ?? null,
      errorMessage: readiness.blockers[0]?.message ?? null,
      failureClass: readiness.blockers.length > 0 ? 'policy_block' : null,
      gateStatus,
      handoff,
      handoffHash,
      requiredActions: readiness.blockers.map((blocker) => blocker.code),
      routeDecision,
      sourceRef: this.profileRef(profile),
      targetRef: readinessRef,
      tracePhase: 'T-107 N3 intake readiness runner',
      tracePayload: {
        missing_constraint_codes: readiness.missingConstraintCodes,
        recommendation: readiness.recommendation,
        stale_ref_codes: readiness.staleRefCodes,
      },
      transitionKey: 'topic-selection.v1b.harness.n3-intake-readiness',
      warnings: readiness.warnings,
    }, {
      writeAuthority: async (prepared) => {
        await v1bRepository.createReadinessAssessment({
          v1b_intake_readiness_assessment_id: readinessId,
          workspace_id: input.workspace_id ?? snapshot.workspace_id ?? null,
          title_card_id: snapshot.title_card_id,
          v1b_intake_snapshot_id: snapshot.v1b_intake_snapshot_id,
          research_constraint_profile_id: profile.research_constraint_profile_id,
          v1b_input_bundle_id: snapshot.v1b_input_bundle_id,
          validated_need_id: snapshot.validated_need_id,
          profile_version: profile.profile_version,
          recommendation: readiness.recommendation,
          blockers: readiness.blockers,
          warnings: readiness.warnings,
          required_actions: readiness.blockers.map((blocker) => blocker.code),
          v1b_intake_snapshot_ref: this.snapshotRef(snapshot),
          research_constraint_profile_ref: this.profileRef(profile),
          v1b_input_bundle_ref: snapshot.v1b_input_bundle_ref,
          validated_need_ref: snapshot.validated_need_ref,
          evidence_map_ref: snapshot.evidence_map_ref,
          search_run_ref: snapshot.search_run_ref,
          search_plan_ref: snapshot.search_plan_ref,
          literature_snapshot_ref: snapshot.literature_snapshot_ref,
          open_recheck_request_refs: readiness.openRechecks.map((request) =>
            this.ref('search_plan_recheck_request', request.search_plan_recheck_request_id, request.title_card_id)
          ),
          accepted_risk_refs: readiness.acceptedRiskRefs,
          uncovered_recheck_request_refs: readiness.uncoveredOpenRechecks.map((request) =>
            this.ref('search_plan_recheck_request', request.search_plan_recheck_request_id, request.title_card_id)
          ),
          stale_ref_codes: readiness.staleRefCodes,
          missing_constraint_codes: readiness.missingConstraintCodes,
          input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
          workflow_run_id: input.workflow_run_id,
          gate_result_id: prepared.gateResultRef.ref_id,
          transition_attempt_id: null,
          policy_version_id: input.policy_version,
          assessed_by: input.created_by ?? 'system',
          created_at: this.now(),
        });
      },
    });
    return result;
  }

  private async runN4GenerateResearchSliceOptions(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    const dependencyBlocker = this.runnerDependencyBlocker(input.node_id);
    if (dependencyBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: dependencyBlocker.code,
        message: dependencyBlocker.message,
      });
    }
    const payload = this.parseN4Payload(input.frozen_input.payload);
    if (!payload.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: payload.code,
        message: payload.message,
      });
    }

    const v1bRepository = this.runnerDependencies.v1bIntakeRepository!;
    const researchSliceRepository = this.runnerDependencies.researchSliceRepository!;
    const [snapshot, profile, readiness] = await Promise.all([
      v1bRepository.findIntakeSnapshotById(payload.value.intake_snapshot_ref.ref_id),
      v1bRepository.findResearchConstraintProfileById(payload.value.constraint_profile_ref.ref_id),
      v1bRepository.findReadinessAssessmentById(payload.value.intake_readiness_ref.ref_id),
    ]);
    if (!snapshot || !profile || !readiness) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N4_FROZEN_AUTHORITY_NOT_FOUND',
        message: 'N4 requires frozen N1 snapshot, N2 constraint profile, and N3 readiness authorities.',
      });
    }
    const snapshotHash = this.hashSnapshotAuthority(snapshot);
    const profileHash = this.hashProfileAuthority(profile);
    const readinessHash = this.hashReadinessAuthority(readiness, {
      constraintProfileHash: profileHash,
      n2HandoffHash: payload.value.n2_handoff_hash,
      snapshotHash,
    });
    const lineageBlocker = this.n4LineageBlocker(payload.value, snapshot, profile, readiness, {
      profileHash,
      readinessHash,
      snapshotHash,
    });
    if (lineageBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: lineageBlocker.code,
        message: lineageBlocker.message,
      });
    }
    if (readiness.recommendation !== 'ready_for_slice' || readiness.blockers.length > 0) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N4_UPSTREAM_NOT_READY',
        message: 'N4 can only generate ResearchSlice options from an N3 ready_for_slice handoff.',
      });
    }

    const planningInput = this.buildN4PlanningInput(snapshot, profile, readiness);
    const draftResolution = await this.resolveN4DraftPayload(input, payload.value, planningInput);
    if (!draftResolution.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: draftResolution.code,
        message: draftResolution.message,
      });
    }
    const resolvedDraft = draftResolution.value;

    const planRunId = this.idFactory('plan_research_slice_run');
    const optionSetId = this.idFactory('research_slice_option_set');
    const optionSetRef = this.ref('research_slice_option_set', optionSetId, snapshot.title_card_id);
    const planRunRef = this.ref('plan_research_slice_run', planRunId, snapshot.title_card_id);
    const validation = this.validateAndBuildN4Options({
      draft: resolvedDraft.draft,
      optionSetId,
      planningInput,
      titleCardId: snapshot.title_card_id,
      workspaceId: input.workspace_id ?? snapshot.workspace_id ?? null,
    });
    if (!validation.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: validation.code,
        message: validation.message,
      });
    }

    const authorityHash = this.hash({
      draft_hash: resolvedDraft.draftHash,
      intake_readiness_hash: readinessHash,
      n3_handoff_hash: payload.value.n3_handoff_hash,
      option_keys: validation.value.options.map((option) => option.option_key),
      option_set_ref: optionSetRef,
      plan_run_ref: planRunRef,
      recommended_option_id: validation.value.recommendedOptionId,
      warning_codes: validation.value.warnings.map((warning) => warning.code),
    });
    const gateStatus: TopicSelectionV1bWorkflowHarnessGateStatus = validation.value.warnings.length > 0
      ? 'admitted_with_warnings'
      : 'admitted';
    const gateResultHash = this.outcomeGateResultHash(input, hashContext, {
      authorityHash,
      blockerCodes: [],
      gateStatus,
      routeDecision: 'invoke_next',
      warningCodes: validation.value.warnings.map((warning) => warning.code),
    });
    const handoffPayload: TopicSelectionV1bWorkflowHarnessHandoffPayload = {
      research_slice_option_set_ref: optionSetRef,
      research_slice_option_set_hash: authorityHash,
    };
    const handoff = this.buildHandoff(input, {
      handoffKind: 'N4ToN5Handoff',
      payload: handoffPayload,
      requiredRefs: [
        optionSetRef,
        planRunRef,
        this.readinessRef(readiness),
        this.profileRef(profile),
        this.snapshotRef(snapshot),
      ],
      residualRiskRefs: readiness.accepted_risk_refs,
      sourceAuthorityHash: authorityHash,
      sourceAuthorityRef: optionSetRef,
      sourceGateResultHash: gateResultHash,
      upstreamLineageHash: this.hash({
        constraint_profile_hash: profileHash,
        draft_hash: resolvedDraft.draftHash,
        intake_readiness_hash: readinessHash,
        n3_handoff_hash: payload.value.n3_handoff_hash,
        snapshot_hash: snapshotHash,
      }),
      warningCodes: validation.value.warnings.map((warning) => warning.code),
    });
    const handoffHash = this.hash(handoff);
    const result = await this.persistAdmittedResult(input, hashContext, {
      acceptedRiskRefs: readiness.accepted_risk_refs,
      authorityHash,
      authorityRef: optionSetRef,
      blockers: [],
      failureClass: null,
      gateStatus,
      handoff,
      handoffHash,
      routeDecision: 'invoke_next',
      sourceRef: this.readinessRef(readiness),
      targetRef: optionSetRef,
      tracePhase: 'T-107 N4 research slice option runner',
      tracePayload: {
        draft_hash: resolvedDraft.draftHash,
        high_risk_option_count: validation.value.highRiskOptionCount,
        option_count: validation.value.options.length,
        recommended_option_id: validation.value.recommendedOptionId,
      },
      transitionKey: 'topic-selection.v1b.harness.n4-research-slice-options',
      warnings: validation.value.warnings,
    }, {
      writeAuthority: async (prepared) => {
        const artifactRefs = uniqueRefs([
          ...resolvedDraft.artifactRefs,
          prepared.handoffRef,
        ]);
        const now = this.now();
        const planRun: TopicSelectionPlanResearchSliceRunRecord = {
          plan_research_slice_run_id: planRunId,
          workspace_id: input.workspace_id ?? snapshot.workspace_id ?? null,
          title_card_id: snapshot.title_card_id,
          v1b_intake_readiness_assessment_id: readiness.v1b_intake_readiness_assessment_id,
          v1b_intake_snapshot_id: snapshot.v1b_intake_snapshot_id,
          research_constraint_profile_id: profile.research_constraint_profile_id,
          v1b_input_bundle_id: snapshot.v1b_input_bundle_id,
          validated_need_id: snapshot.validated_need_id,
          status: 'succeeded',
          triggered_by: input.created_by ?? 'system',
          v1b_input_bundle_ref: snapshot.v1b_input_bundle_ref,
          v1b_intake_snapshot_ref: this.snapshotRef(snapshot),
          research_constraint_profile_ref: this.profileRef(profile),
          readiness_assessment_ref: this.readinessRef(readiness),
          validated_need_ref: snapshot.validated_need_ref,
          evidence_map_ref: snapshot.evidence_map_ref,
          search_run_ref: snapshot.search_run_ref,
          search_plan_ref: snapshot.search_plan_ref,
          literature_snapshot_ref: snapshot.literature_snapshot_ref,
          accepted_risk_refs: readiness.accepted_risk_refs,
          memory_suggestion_refs: snapshot.memory_suggestion_refs,
          recheck_request_refs: snapshot.recheck_request_refs,
          gap_codes: snapshot.gap_codes,
          workflow_profile_key: resolvedDraft.semanticArtifact.profile_id,
          workflow_profile_version: input.policy_version,
          provider_id: null,
          model_id: null,
          prompt_template_id: resolvedDraft.semanticArtifact.output_contract,
          prompt_template_version: resolvedDraft.semanticArtifact.adapter_policy_version,
          input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
          workflow_run_id: input.workflow_run_id,
          option_set_id: optionSetId,
          artifact_refs: artifactRefs,
          quality_flags: validation.value.qualityFlags,
          failure_reason: null,
          created_at: now,
          updated_at: now,
        };
        const optionSet: TopicSelectionResearchSliceOptionSetRecord = {
          research_slice_option_set_id: optionSetId,
          workspace_id: input.workspace_id ?? snapshot.workspace_id ?? null,
          title_card_id: snapshot.title_card_id,
          plan_research_slice_run_id: planRunId,
          v1b_intake_readiness_assessment_id: readiness.v1b_intake_readiness_assessment_id,
          v1b_intake_snapshot_id: snapshot.v1b_intake_snapshot_id,
          research_constraint_profile_id: profile.research_constraint_profile_id,
          v1b_input_bundle_id: snapshot.v1b_input_bundle_id,
          validated_need_ids: uniqueStrings([
            snapshot.validated_need_id,
            ...validation.value.options.flatMap((option) =>
              option.source_validated_need_refs.map((sourceRef) => sourceRef.ref_id),
            ),
          ]),
          status: 'ready_for_selection',
          recommended_option_id: validation.value.recommendedOptionId,
          selected_option_id: null,
          option_count: validation.value.options.length,
          high_risk_option_count: validation.value.highRiskOptionCount,
          requires_human_review: validation.value.requiresHumanReview,
          comparison_axes: resolvedDraft.draft.comparison_axes,
          comparison_summary: resolvedDraft.draft.comparison_summary,
          missing_option_types: resolvedDraft.draft.missing_option_types,
          unresolved_disagreements: resolvedDraft.draft.unresolved_disagreements,
          human_review_triggers: resolvedDraft.draft.human_review_triggers,
          options_payload: { options: resolvedDraft.draft.options },
          comparison_payload: {
            authority_hash: authorityHash,
            constraint_profile_hash: profileHash,
            draft_hash: resolvedDraft.draftHash,
            intake_readiness_hash: readinessHash,
            n3_handoff_hash: payload.value.n3_handoff_hash,
            // T-115 Phase 2: persist the N4->N5 handoff hash so a human-driven N5
            // selection can reconstruct a valid frozen_input from persisted state
            // (read by V1bSliceHumanSelectionService). Harness-internal N5 uses
            // the in-memory handoff; this makes it retrievable by option-set id.
            n4_handoff_hash: handoffHash,
            recommended_option_key: resolvedDraft.draft.recommended_option_key ?? null,
            semantic_artifact_ref: resolvedDraft.semanticArtifact.normalized_output_ref,
            warning_codes: validation.value.warnings.map((warning) => warning.code),
          },
          input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
          workflow_run_id: input.workflow_run_id,
          artifact_refs: artifactRefs,
          created_at: now,
          updated_at: now,
        };
        await researchSliceRepository.createPlanRunWithOptionSet({
          plan_run: planRun,
          option_set: optionSet,
          options: validation.value.options,
        });
      },
    });
    return result;
  }

  private async runN5SelectResearchSlice(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    const dependencyBlocker = this.runnerDependencyBlocker(input.node_id);
    if (dependencyBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: dependencyBlocker.code,
        message: dependencyBlocker.message,
      });
    }
    const payload = this.parseN5Payload(input.frozen_input.payload);
    if (!payload.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: payload.code,
        message: payload.message,
      });
    }
    const acceptedPayloadHash = this.hash(payload.value.accepted_selection_payload);
    if (acceptedPayloadHash !== payload.value.accepted_selection_payload_hash) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N5_ACCEPTED_SELECTION_PAYLOAD_HASH_MISMATCH',
        message: 'N5 accepted selection payload hash does not match the frozen payload.',
      });
    }
    const codexBlocker = this.n5CodexDelegationBlocker(input, payload.value, acceptedPayloadHash);
    if (codexBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: codexBlocker.code,
        message: codexBlocker.message,
      });
    }
    const semanticSupport = await this.resolveEarlySemanticSupportPayload<TopicSelectionV1bAcceptedSliceSelectionPayload>(
      input,
      'n5_slice_selection_review',
      (value): value is TopicSelectionV1bAcceptedSliceSelectionPayload =>
        this.isRecord(value) && this.acceptedSliceSelectionPayloadIsValid(value),
    );
    if (!semanticSupport.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: semanticSupport.code,
        message: semanticSupport.message,
      });
    }

    const loaded = await this.loadN5OptionSet(payload.value.research_slice_option_set_ref.ref_id);
    if (!loaded.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: loaded.code,
        message: loaded.message,
      });
    }
    const optionSetRef = this.optionSetRef(loaded.value.optionSet);
    if (!this.refsEqual(payload.value.research_slice_option_set_ref, optionSetRef)) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N5_OPTION_SET_REF_MISMATCH',
        message: 'N5 frozen ResearchSliceOptionSet ref does not match the persisted option set.',
      });
    }
    const storedOptionSetHash = this.recordString(loaded.value.optionSet.comparison_payload.authority_hash);
    if (!storedOptionSetHash || storedOptionSetHash !== payload.value.research_slice_option_set_hash) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N5_OPTION_SET_HASH_MISMATCH',
        message: 'N5 frozen ResearchSliceOptionSet hash does not match the persisted N4 authority hash.',
      });
    }
    if (loaded.value.optionSet.status !== 'ready_for_selection') {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N5_OPTION_SET_NOT_READY_FOR_SELECTION',
        message: 'N5 can only select from a ready_for_selection ResearchSliceOptionSet.',
      });
    }

    const accepted = payload.value.accepted_selection_payload;
    const selectedOption = accepted.decision === 'select'
      ? this.n5SelectedOption(accepted, loaded.value.options)
      : null;
    const selectionBlocker = this.n5SelectionGateBlocker(payload.value, loaded.value, selectedOption);
    if (selectionBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: selectionBlocker.code,
        message: selectionBlocker.message,
      });
    }
    const lineageHashes = this.n5OptionSetLineageHashes(loaded.value.optionSet);
    if (!lineageHashes.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: lineageHashes.code,
        message: lineageHashes.message,
      });
    }

    const repository = this.runnerDependencies.researchSliceRepository!;
    const now = this.now();
    const decidedBy = this.n5CreatedBy(input.created_by, payload.value.authority_input_provider);
    const decisionId = this.idFactory('slice_selection_decision');
    const decisionRef = this.ref('slice_selection_decision', decisionId, loaded.value.optionSet.title_card_id);
    const decisionHash = this.hashN5DecisionAuthority({
      acceptedPayloadHash,
      decisionRef,
      n4HandoffHash: payload.value.n4_handoff_hash,
      optionSetHash: payload.value.research_slice_option_set_hash,
      selectedOptionHash: accepted.selected_option_hash,
    });
    const warnings = this.n5SelectionWarnings(accepted, loaded.value, selectedOption);
    const artifactRefs = this.n5ArtifactRefs(input);

    if (accepted.decision !== 'select') {
      const nonSelectDecision: Exclude<TopicSelectionSliceSelectionDecision, 'select'> = accepted.decision;
      const result = await this.persistAdmittedResult(input, hashContext, {
        acceptedRiskRefs: accepted.accepted_risk_refs,
        authorityHash: decisionHash,
        authorityRef: decisionRef,
        blockers: [],
        failureClass: 'terminal_no_advance',
        gateStatus: 'terminal_no_advance',
        handoff: null,
        handoffHash: null,
        routeDecision: nonSelectDecision === 'request_more_options' ? 'loopback' : 'wait',
        sourceRef: optionSetRef,
        targetRef: decisionRef,
        requiredActions: accepted.required_actions,
        tracePhase: 'T-107 N5 research slice selection runner',
        tracePayload: {
          accepted_selection_payload_hash: acceptedPayloadHash,
          authority_input_provider: payload.value.authority_input_provider,
          decision: accepted.decision,
          selected_option_id: null,
        },
        transitionKey: 'topic-selection.v1b.harness.n5-research-slice-selection',
        warnings,
      }, {
        writeAuthority: async (prepared) => {
          await repository.createSelectionDecision(this.buildN5DecisionRecord({
            accepted,
            artifactRefs,
            controlPlaneRefs: prepared,
            decisionId,
            decisionRef,
            decidedBy,
            input,
            loaded: loaded.value,
            now,
            selectedOption: null,
            sliceRef: null,
          }));
          await repository.updateOptionSet(loaded.value.optionSet.research_slice_option_set_id, {
            status: this.n5OptionSetStatusForNonSelectDecision(nonSelectDecision),
            selected_option_id: null,
            updated_at: now,
          });
        },
      });
      return result;
    }

    if (!selectedOption || !accepted.selected_option_ref || !accepted.selected_option_hash) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N5_SELECTED_OPTION_REQUIRED',
        message: 'N5 select decision requires a frozen selected option ref and hash.',
      });
    }
    const sliceId = this.idFactory('research_slice');
    const sliceVersion = this.versionFromId(sliceId);
    const sliceRef = this.ref('research_slice', sliceId, loaded.value.optionSet.title_card_id, sliceVersion);
    const researchSliceHash = this.hashN5ResearchSliceAuthority({
      acceptedPayloadHash,
      decisionHash,
      n4HandoffHash: payload.value.n4_handoff_hash,
      optionSetHash: payload.value.research_slice_option_set_hash,
      researchSliceRef: sliceRef,
      selectedOptionHash: accepted.selected_option_hash,
    });
    const gateStatus: TopicSelectionV1bWorkflowHarnessGateStatus = warnings.length > 0
      ? 'admitted_with_warnings'
      : 'admitted';
    const gateResultHash = this.outcomeGateResultHash(input, hashContext, {
      authorityHash: decisionHash,
      blockerCodes: [],
      gateStatus,
      routeDecision: 'invoke_next',
      warningCodes: warnings.map((warning) => warning.code),
    });
    const handoffPayload: TopicSelectionV1bWorkflowHarnessHandoffPayload = {
      constraint_profile_ref: loaded.value.planRun.research_constraint_profile_ref,
      constraint_profile_hash: lineageHashes.value.constraintProfileHash,
      intake_readiness_ref: loaded.value.planRun.readiness_assessment_ref,
      intake_readiness_hash: lineageHashes.value.readinessHash,
      research_slice_ref: sliceRef,
      research_slice_hash: researchSliceHash,
      research_slice_selection_ref: decisionRef,
      research_slice_selection_hash: decisionHash,
      research_slice_option_set_ref: optionSetRef,
      research_slice_option_set_hash: payload.value.research_slice_option_set_hash,
      selected_slice_option_ref: accepted.selected_option_ref,
      selected_slice_option_hash: accepted.selected_option_hash,
    };
    const handoff = this.buildHandoff(input, {
      handoffKind: 'N5ToN6Handoff',
      payload: handoffPayload,
      requiredRefs: [
        decisionRef,
        sliceRef,
        optionSetRef,
        accepted.selected_option_ref,
        loaded.value.planRun.research_constraint_profile_ref,
        loaded.value.planRun.readiness_assessment_ref,
      ],
      residualRiskRefs: uniqueRefs([
        ...loaded.value.planRun.accepted_risk_refs,
        ...accepted.accepted_risk_refs,
      ]),
      sourceAuthorityHash: decisionHash,
      sourceAuthorityRef: decisionRef,
      sourceGateResultHash: gateResultHash,
      upstreamLineageHash: this.hash({
        accepted_selection_payload_hash: acceptedPayloadHash,
        constraint_profile_hash: lineageHashes.value.constraintProfileHash,
        intake_readiness_hash: lineageHashes.value.readinessHash,
        n4_handoff_hash: payload.value.n4_handoff_hash,
        option_set_hash: payload.value.research_slice_option_set_hash,
        research_slice_hash: researchSliceHash,
        selected_option_hash: accepted.selected_option_hash,
      }),
      warningCodes: warnings.map((warning) => warning.code),
    });
    const handoffHash = this.hash(handoff);
    const result = await this.persistAdmittedResult(input, hashContext, {
      acceptedRiskRefs: uniqueRefs([
        ...loaded.value.planRun.accepted_risk_refs,
        ...accepted.accepted_risk_refs,
      ]),
      additionalAuthorityRefs: [sliceRef],
      authorityHash: decisionHash,
      authorityRef: decisionRef,
      blockers: [],
      failureClass: null,
      gateStatus,
      handoff,
      handoffHash,
      routeDecision: 'invoke_next',
      sourceRef: optionSetRef,
      targetRef: sliceRef,
      requiredActions: accepted.required_actions,
      tracePhase: 'T-107 N5 research slice selection runner',
      tracePayload: {
        accepted_selection_payload_hash: acceptedPayloadHash,
        authority_input_provider: payload.value.authority_input_provider,
        decision: accepted.decision,
        research_slice_hash: researchSliceHash,
        selected_option_id: selectedOption.research_slice_option_id,
        selected_option_hash: accepted.selected_option_hash,
      },
      transitionKey: 'topic-selection.v1b.harness.n5-research-slice-selection',
      warnings,
    }, {
      writeAuthority: async (prepared) => {
        const finalArtifactRefs = uniqueRefs([
          ...artifactRefs,
          prepared.handoffRef,
        ]);
        const decision = this.buildN5DecisionRecord({
          accepted,
          artifactRefs: finalArtifactRefs,
          controlPlaneRefs: prepared,
          decisionId,
          decisionRef,
          decidedBy,
          input,
          loaded: loaded.value,
          now,
          selectedOption,
          sliceRef,
        });
        const researchSlice = this.buildN5ResearchSliceRecord({
          accepted,
          artifactRefs: finalArtifactRefs,
          controlPlaneRefs: prepared,
          decisionRef,
          input,
          loaded: loaded.value,
          now,
          selectedOption,
          sliceId,
          sliceRef,
          sliceVersion,
          decidedBy,
        });
        await repository.createSelectionDecisionWithSlice({
          decision,
          research_slice: researchSlice,
          evidence_refs: this.buildN5EvidenceRows(researchSlice, selectedOption),
          boundaries: this.buildN5BoundaryRows(researchSlice, selectedOption, this.inheritedConstraints(selectedOption)),
          assumptions: this.buildN5AssumptionRows(researchSlice, selectedOption),
          option_set_patch: {
            status: 'selected',
            selected_option_id: selectedOption.research_slice_option_id,
            updated_at: now,
          },
        });
      },
    });
    return result;
  }

  private async runN6GenerateTopicQuestionCandidates(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    const dependencyBlocker = this.runnerDependencyBlocker(input.node_id);
    if (dependencyBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: dependencyBlocker.code,
        message: dependencyBlocker.message,
      });
    }
    const payload = this.parseN6Payload(input.frozen_input.payload);
    if (!payload.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: payload.code,
        message: payload.message,
      });
    }
    const loaded = await this.loadN6Context(payload.value);
    if (!loaded.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: loaded.code,
        message: loaded.message,
      });
    }
    const lineageBlocker = await this.n6LineageBlocker(input, payload.value, loaded.value);
    if (lineageBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: lineageBlocker.code,
        message: lineageBlocker.message,
      });
    }
    const draftResolution = await this.resolveN6DraftPayload(input, payload.value);
    if (!draftResolution.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: draftResolution.code,
        message: draftResolution.message,
      });
    }

    const runId = this.idFactory('form_topic_question_run');
    const questionFrameId = this.idFactory('topic_question_frame');
    const candidateSetId = this.idFactory('topic_question_candidate_set');
    const candidateSetRef = this.ref('topic_question_candidate_set', candidateSetId, loaded.value.researchSlice.title_card_id);
    const runRef = this.ref('form_topic_question_run', runId, loaded.value.researchSlice.title_card_id);
    const frameRef = this.ref('topic_question_frame', questionFrameId, loaded.value.researchSlice.title_card_id);
    const decisionMemory = await resolveDecisionMemoryPacketFromSourceRefs({
      sourceRefs: input.frozen_input.source_refs,
      getArtifactRef: (refId) => this.controlPlane.getArtifactRef(refId),
      expectedTitleCardId: input.title_card_id ?? null,
    });
    const validation = this.validateAndBuildN6Candidates({
      candidateSetId,
      decisionMemory,
      draft: draftResolution.draft,
      draftHash: draftResolution.draftHash,
      input,
      loaded: loaded.value,
      payload: payload.value,
      questionFrameId,
      runId,
    });
    if (!validation.ok) {
      if (validation.routeDecision === 'loopback') {
        const loopbackPlan = await this.resolveN6LoopbackPlan(input, {
          blockedCandidateContexts: validation.blockedCandidateContexts ?? [],
          defaultAffectedRef: payload.value.research_slice_ref,
          draftArtifact: draftResolution.semanticArtifact,
          draftHash: draftResolution.draftHash,
          frozenPayload: payload.value,
        });
        if (!loopbackPlan.ok) {
          return this.persistBlockedResult(input, hashContext, {
            blockerCode: loopbackPlan.code,
            message: loopbackPlan.message,
          });
        }
        return this.persistAdmittedResult(input, hashContext, {
          authorityHash: null,
          authorityRef: null,
          blockers: [this.blocker(validation.code, validation.message, input.frozen_input.source_refs)],
          errorCode: validation.code,
          failureClass: 'semantic_non_pass',
          gateStatus: 'blocked',
          handoff: null,
          handoffHash: null,
          loopbackTargetCode: loopbackPlan.value.loopbackTargetCode,
          routeDecision: 'loopback',
          routeTargetNodeId: loopbackPlan.value.routeTargetNodeId,
          sourceRef: payload.value.research_slice_ref,
          targetRef: this.nodeAttemptRef(input),
          tracePhase: 'T-107 N6 topic question candidate runner',
          tracePayload: {
            blocked_candidate_context: validation.blockedCandidateContexts ?? [],
            debate_escalation: loopbackPlan.value.debateEscalation,
            draft_hash: draftResolution.draftHash,
            loopback_affected_refs: loopbackPlan.value.affectedRefs,
            loopback_failure_scope: loopbackPlan.value.failureScope,
            loopback_rationale: loopbackPlan.value.rationale,
            loopback_reason_codes: loopbackPlan.value.reasonCodes,
            loopback_target_code: loopbackPlan.value.loopbackTargetCode,
            regeneration_hints: loopbackPlan.value.regenerationHints,
            route_target_node_id: loopbackPlan.value.routeTargetNodeId,
            triage_artifact_ref: loopbackPlan.value.triageArtifact?.normalized_output_ref ?? null,
            triage_artifact_hash: loopbackPlan.value.triageArtifact?.normalized_output_hash ?? null,
            triage_payload_hash: loopbackPlan.value.triagePayloadHash,
            upstream_rollback: loopbackPlan.value.upstreamRollback,
          },
          runtimeContextProjection: loopbackPlan.value.loopbackTargetCode === 'n6_regenerate_candidates'
            ? {
              build: () => this.buildN6GateFailureRetryContextProjection({
                request: input,
                frozenPayload: payload.value,
                blockedCandidateContexts: validation.blockedCandidateContexts ?? [],
                loopbackPlan: loopbackPlan.value,
                draftArtifact: draftResolution.semanticArtifact,
                draftHash: draftResolution.draftHash,
              }),
            }
            : undefined,
          transitionKey: 'topic-selection.v1b.harness.n6-topic-question-candidates',
          warnings: [
            ...(validation.warnings ?? []),
            ...this.n6LoopbackWarnings(loopbackPlan.value),
          ],
        }, {
          writeAuthority: async () => {},
        });
      }
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: validation.code,
        message: validation.message,
      });
    }

    const candidateSetHash = this.hash({
      candidate_hashes: validation.value.candidateHashes,
      candidate_set_ref: candidateSetRef,
      draft_hash: draftResolution.draftHash,
      n5_handoff_hash: payload.value.n5_handoff_hash,
      recommended_candidate_ids: validation.value.recommendedCandidateIds,
      research_slice_hash: payload.value.research_slice_hash,
      warning_codes: validation.value.warnings.map((warning) => warning.code),
    });
    const gateStatus: TopicSelectionV1bWorkflowHarnessGateStatus = validation.value.warnings.length > 0
      ? 'admitted_with_warnings'
      : 'admitted';
    const gateResultHash = this.outcomeGateResultHash(input, hashContext, {
      authorityHash: candidateSetHash,
      blockerCodes: [],
      gateStatus,
      routeDecision: 'invoke_next',
      warningCodes: validation.value.warnings.map((warning) => warning.code),
    });
    const handoffPayload: TopicSelectionV1bWorkflowHarnessHandoffPayload = {
      topic_question_candidate_set_ref: candidateSetRef,
      topic_question_candidate_set_hash: candidateSetHash,
      admissible_candidate_refs: validation.value.candidateRefs,
      admissible_candidate_hashes: validation.value.candidateHashes,
      selected_research_slice_ref: payload.value.research_slice_ref,
      selected_research_slice_hash: payload.value.research_slice_hash,
      generation_artifact_ref: draftResolution.semanticArtifact.normalized_output_ref!,
      generation_artifact_hash: draftResolution.draftHash,
      candidate_gate_hash: gateResultHash,
      candidate_grouping_ref: null,
      candidate_grouping_hash: null,
    };
    const handoff = this.buildHandoff(input, {
      handoffKind: 'N6ToN7Handoff',
      payload: handoffPayload,
      requiredRefs: [
        candidateSetRef,
        ...validation.value.candidateRefs,
        payload.value.research_slice_ref,
        payload.value.research_slice_selection_ref,
        draftResolution.semanticArtifact.normalized_output_ref!,
      ],
      residualRiskRefs: loaded.value.researchSlice.accepted_risk_refs,
      sourceAuthorityHash: candidateSetHash,
      sourceAuthorityRef: candidateSetRef,
      sourceGateResultHash: gateResultHash,
      upstreamLineageHash: this.hash({
        candidate_hashes: validation.value.candidateHashes,
        draft_hash: draftResolution.draftHash,
        n5_handoff_hash: payload.value.n5_handoff_hash,
        research_slice_hash: payload.value.research_slice_hash,
        selected_option_hash: payload.value.selected_slice_option_hash,
      }),
      warningCodes: validation.value.warnings.map((warning) => warning.code),
    });
    const handoffHash = this.hash(handoff);
    const result = await this.persistAdmittedResult(input, hashContext, {
      acceptedRiskRefs: loaded.value.researchSlice.accepted_risk_refs,
      additionalAuthorityRefs: [
        runRef,
        frameRef,
        ...validation.value.candidateRefs,
      ],
      authorityHash: candidateSetHash,
      authorityRef: candidateSetRef,
      blockers: [],
      failureClass: null,
      gateStatus,
      handoff,
      handoffHash,
      routeDecision: 'invoke_next',
      sourceRef: payload.value.research_slice_ref,
      targetRef: candidateSetRef,
      tracePhase: 'T-107 N6 topic question candidate runner',
      tracePayload: {
        blocked_candidate_context: validation.value.blockedCandidateContexts,
        candidate_count: validation.value.candidates.length,
        candidate_hashes: validation.value.candidateHashes,
        draft_hash: draftResolution.draftHash,
        recommended_candidate_ids: validation.value.recommendedCandidateIds,
      },
      transitionKey: 'topic-selection.v1b.harness.n6-topic-question-candidates',
      warnings: validation.value.warnings,
    }, {
      writeAuthority: async (prepared) => {
        const artifactRefs = uniqueRefs([
          ...draftResolution.artifactRefs,
          prepared.handoffRef,
        ]);
        const now = this.now();
        const run: TopicSelectionFormTopicQuestionRunRecord = {
          form_topic_question_run_id: runId,
          workspace_id: input.workspace_id ?? loaded.value.researchSlice.workspace_id ?? null,
          title_card_id: loaded.value.researchSlice.title_card_id,
          research_slice_id: loaded.value.researchSlice.research_slice_id,
          research_slice_version: loaded.value.researchSlice.slice_version,
          status: 'succeeded',
          triggered_by: input.created_by ?? 'system',
          research_slice_ref: payload.value.research_slice_ref,
          slice_selection_decision_ref: payload.value.research_slice_selection_ref,
          source_option_set_ref: payload.value.research_slice_option_set_ref,
          source_option_ref: payload.value.selected_slice_option_ref,
          validated_need_ref: loaded.value.researchSlice.validated_need_ref,
          v1b_intake_snapshot_ref: loaded.value.researchSlice.v1b_intake_snapshot_ref,
          research_constraint_profile_ref: payload.value.constraint_profile_ref,
          readiness_assessment_ref: payload.value.intake_readiness_ref,
          evidence_map_ref: loaded.value.researchSlice.evidence_map_ref,
          search_run_ref: loaded.value.researchSlice.search_run_ref,
          search_plan_ref: loaded.value.researchSlice.search_plan_ref,
          literature_snapshot_ref: loaded.value.researchSlice.literature_snapshot_ref,
          accepted_risk_refs: loaded.value.researchSlice.accepted_risk_refs,
          memory_suggestion_refs: loaded.value.researchSlice.memory_suggestion_refs,
          recheck_request_refs: loaded.value.researchSlice.recheck_request_refs,
          gap_codes: loaded.value.researchSlice.gap_codes,
          workflow_profile_key: draftResolution.semanticArtifact.profile_id,
          workflow_profile_version: input.policy_version,
          provider_id: null,
          model_id: null,
          prompt_template_id: draftResolution.semanticArtifact.output_contract,
          prompt_template_version: draftResolution.semanticArtifact.adapter_policy_version,
          input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
          workflow_run_id: input.workflow_run_id,
          question_frame_id: questionFrameId,
          candidate_set_id: candidateSetId,
          artifact_refs: artifactRefs,
          quality_flags: validation.value.qualityFlags,
          failure_reason: null,
          created_at: now,
          updated_at: now,
        };
        await this.runnerDependencies.topicQuestionRepository!.createFormationRunWithCandidates({
          form_topic_question_run: run,
          question_frame: {
            ...validation.value.questionFrame,
            created_at: now,
          },
          candidate_set: {
            ...validation.value.candidateSet,
            artifact_refs: artifactRefs,
            input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
            workflow_run_id: input.workflow_run_id,
            created_at: now,
            updated_at: now,
          },
          candidates: validation.value.candidates.map((candidate) => ({
            ...candidate,
            created_at: now,
          })),
        });
      },
    });
    return result;
  }

  private async runN7MaterializeTopicQuestionContract(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    const dependencyBlocker = this.runnerDependencyBlocker(input.node_id);
    if (dependencyBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: dependencyBlocker.code,
        message: dependencyBlocker.message,
      });
    }
    const payload = this.parseN7Payload(input.frozen_input.payload);
    if (!payload.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: payload.code,
        message: payload.message,
      });
    }
    const loaded = await this.loadN7Context(input, payload.value);
    if (!loaded.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: loaded.code,
        message: loaded.message,
      });
    }
    const support = await this.resolveN7SupportContext(input, payload.value);
    if (!support.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: support.code,
        message: support.message,
      });
    }
    const lineageBlocker = this.n7LineageBlocker(payload.value, loaded.value);
    if (lineageBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: lineageBlocker.code,
        message: lineageBlocker.message,
      });
    }
    if (loaded.value.feedback?.feedback_class === 'technical_failure') {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N7_TECHNICAL_FEEDBACK_WRONG_TARGET',
        message: 'N7 does not consume pure N8 technical failures; N8 must retry or block without changing candidate trial state.',
      });
    }
    if (loaded.value.feedback?.feedback_class === 'gate_rejected' && !support.value.debateAdmission) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N7_REQUIRED_SUPPORT_ARTIFACT_MISSING',
        message: 'N7 gate-rejected feedback requires frozen N8 debate-admission support before readmission.',
      });
    }
    if (loaded.value.feedback?.feedback_class === 'gate_rejected') {
      return this.runN7GateReadmission(input, hashContext, payload.value, loaded.value, support.value);
    }

    const choice = this.chooseN7Candidate(payload.value, loaded.value, support.value);
    if (!choice.ok) {
      if (choice.code !== 'N7_CANDIDATE_TRIALS_EXHAUSTED') {
        return this.persistBlockedResult(input, hashContext, {
          blockerCode: choice.code,
          message: choice.message,
        });
      }
      return this.runN7CandidateTrialsExhausted(input, hashContext, payload.value, loaded.value, support.value, choice);
    }
    const admissionBlocker = this.n7CandidateAdmissionBlocker(choice.value.candidate, loaded.value.frame);
    if (admissionBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: admissionBlocker.code,
        message: admissionBlocker.message,
      });
    }

    const decisionId = this.idFactory('topic_question_selection_decision');
    const decisionRef = this.ref('topic_question_selection_decision', decisionId, loaded.value.candidateSet.title_card_id);
    const materialization = this.materializeN7TopicQuestion({
      acceptedRiskRefs: loaded.value.run.accepted_risk_refs,
      candidate: choice.value.candidate,
      candidateSet: loaded.value.candidateSet,
      decisionId,
      frame: loaded.value.frame,
      run: loaded.value.run,
      workflowRunId: input.workflow_run_id,
    });
    const questionRef = this.ref(
      'topic_question',
      materialization.topic_question.topic_question_id,
      materialization.topic_question.title_card_id,
    );
    const contractRef = this.ref(
      'topic_question_contract',
      materialization.topic_question_contract.topic_question_contract_id,
      materialization.topic_question_contract.title_card_id,
      materialization.topic_question_contract.version,
    );
    const answerabilityPlanRef = this.ref(
      'topic_question_answerability_plan',
      materialization.answerability_plan.topic_question_answerability_plan_id,
      materialization.answerability_plan.title_card_id,
    );
    const questionHash = this.hashN7TopicQuestionAuthority(materialization.topic_question);
    const contractHash = this.hashN7ContractAuthority(materialization.topic_question_contract);
    const answerabilityPlanHash = this.hashN7AnswerabilityPlanAuthority(materialization.answerability_plan);
    const debateAdmission = await this.recordN7DebateAdmissionArtifact(input, payload.value, choice.value, support.value);
    const trialLedgerHash = this.hash({
      active_candidate_hash: choice.value.candidateHash,
      candidate_set_hash: payload.value.topic_question_candidate_set_hash,
      decision_id: decisionId,
      failed_candidate_ids: choice.value.failedCandidateIds,
      input_mode: payload.value.input_mode,
      n6_handoff_hash: payload.value.n6_handoff_hash,
      n8_debate_admission_hash: debateAdmission.hash,
      priority_order: choice.value.priorityOrder,
      topic_question_contract_hash: contractHash,
    });
    const gateStatus: TopicSelectionV1bWorkflowHarnessGateStatus =
      choice.value.candidate.risk_notes.length > 0
        || choice.value.candidate.human_review_triggers.length > 0
        || support.value.grouping
        || support.value.debateAdmission
        ? 'admitted_with_warnings'
        : 'admitted';
    const warnings = this.n7Warnings(choice.value, support.value);
    const gateResultHash = this.outcomeGateResultHash(input, hashContext, {
      authorityHash: contractHash,
      blockerCodes: [],
      gateStatus,
      routeDecision: 'invoke_next',
      warningCodes: warnings.map((warning) => warning.code),
    });
    const candidateSetRef = this.ref(
      'topic_question_candidate_set',
      loaded.value.candidateSet.topic_question_candidate_set_id,
      loaded.value.candidateSet.title_card_id,
    );
    const handoffPayload: TopicSelectionV1bWorkflowHarnessHandoffPayload = {
      topic_question_ref: questionRef,
      topic_question_hash: questionHash,
      topic_question_contract_ref: contractRef,
      topic_question_contract_hash: contractHash,
      answerability_plan_ref: answerabilityPlanRef,
      answerability_plan_hash: answerabilityPlanHash,
      trial_ledger_ref: decisionRef,
      trial_ledger_hash: trialLedgerHash,
      topic_question_candidate_set_ref: candidateSetRef,
      topic_question_candidate_set_hash: payload.value.topic_question_candidate_set_hash,
      active_candidate_ref: this.ref(
        'topic_question_candidate',
        choice.value.candidate.topic_question_candidate_id,
        choice.value.candidate.title_card_id,
      ),
      active_candidate_hash: choice.value.candidateHash,
      selected_research_slice_ref: payload.value.selected_research_slice_ref,
      selected_research_slice_hash: payload.value.selected_research_slice_hash,
      n8_debate_admission_ref: debateAdmission.ref,
      n8_debate_admission_hash: debateAdmission.hash,
      candidate_grouping_ref: support.value.grouping?.artifact.normalized_output_ref ?? null,
      candidate_grouping_hash: support.value.grouping?.payloadHash ?? null,
    };
    const handoff = this.buildHandoff(input, {
      handoffKind: 'N7ToN8Handoff',
      payload: handoffPayload,
      requiredRefs: [
        candidateSetRef,
        this.ref('topic_question_candidate', choice.value.candidate.topic_question_candidate_id, choice.value.candidate.title_card_id),
        questionRef,
        contractRef,
        answerabilityPlanRef,
        decisionRef,
        debateAdmission.ref,
        payload.value.selected_research_slice_ref,
      ],
      residualRiskRefs: loaded.value.run.accepted_risk_refs,
      sourceAuthorityHash: contractHash,
      sourceAuthorityRef: contractRef,
      sourceGateResultHash: gateResultHash,
      upstreamLineageHash: this.hash({
        active_candidate_hash: choice.value.candidateHash,
        candidate_set_hash: payload.value.topic_question_candidate_set_hash,
        n6_handoff_hash: payload.value.n6_handoff_hash,
        n8_feedback_hash: payload.value.input_mode === 'feedback_from_n8' ? payload.value.n8_feedback_hash : null,
        selected_research_slice_hash: payload.value.selected_research_slice_hash,
      }),
      warningCodes: warnings.map((warning) => warning.code),
    });
    const handoffHash = this.hash(handoff);
    return this.persistAdmittedResult(input, hashContext, {
      acceptedRiskRefs: loaded.value.run.accepted_risk_refs,
      additionalAuthorityRefs: [
        decisionRef,
        questionRef,
        answerabilityPlanRef,
      ],
      authorityHash: contractHash,
      authorityRef: contractRef,
      blockers: [],
      failureClass: null,
      gateStatus,
      handoff,
      handoffHash,
      routeDecision: 'invoke_next',
      sourceRef: candidateSetRef,
      targetRef: contractRef,
      tracePhase: 'T-107 N7 topic question contract materialization runner',
      tracePayload: {
        active_candidate_hash: choice.value.candidateHash,
        active_candidate_id: choice.value.candidate.topic_question_candidate_id,
        debate_admission_hash: debateAdmission.hash,
        input_mode: payload.value.input_mode,
        priority_order: choice.value.priorityOrder,
        trial_ledger_hash: trialLedgerHash,
      },
      runtimeContextProjection: {
        build: ({ handoffRef }) => {
          if (!handoffRef) {
            throw new AppError(500, 'INTERNAL_ERROR', 'N7-to-N8 projection requires a persisted N7 handoff ref.');
          }
          return this.buildN7ToN8TopicQuestionContractContextProjection({
            request: input,
            frozenPayload: payload.value,
            handoffPayload: handoffPayload as TopicSelectionV1bN7ToN8HandoffPayload,
            handoffRef,
            handoffHash,
            support: support.value,
          });
        },
      },
      transitionKey: 'topic-selection.v1b.harness.n7-topic-question-contract',
      warnings,
    }, {
      writeAuthority: async (prepared) => {
        const now = this.now();
        const decision: TopicSelectionTopicQuestionSelectionDecisionRecord = {
          topic_question_selection_decision_id: decisionId,
          workspace_id: loaded.value.candidateSet.workspace_id ?? null,
          title_card_id: loaded.value.candidateSet.title_card_id,
          candidate_set_id: loaded.value.candidateSet.topic_question_candidate_set_id,
          form_topic_question_run_id: loaded.value.candidateSet.form_topic_question_run_id,
          research_slice_id: loaded.value.candidateSet.research_slice_id,
          research_slice_version: loaded.value.candidateSet.research_slice_version,
          input_snapshot_ref: this.ref('input_snapshot', prepared.inputSnapshot.input_snapshot_id, loaded.value.candidateSet.title_card_id),
          decision: 'admit',
          decided_by: input.created_by ?? 'system',
          selection_policy_version: input.policy_version,
          admitted_candidate_ids: [choice.value.candidate.topic_question_candidate_id],
          created_topic_question_ids: [materialization.topic_question.topic_question_id],
          merged_candidate_groups: support.value.grouping?.payload.duplicate_or_overlap_groups ?? [],
          hard_gate_results: this.n7HardGateResults(loaded.value.candidates),
          admission_review: {
            answerability: 'passed',
            boundary_fit: 'passed',
            evidence_trace_strength: 'passed',
            claim_fit: 'passed',
            debate_admission_hash: debateAdmission.hash,
            input_mode: payload.value.input_mode,
            previous_feedback_hash: payload.value.input_mode === 'feedback_from_n8' ? payload.value.n8_feedback_hash : null,
            route_note: choice.value.routeNote,
          },
          candidate_relationships: support.value.grouping?.payload.candidate_relationships ?? {},
          priority_order: choice.value.priorityOrder,
          rejected_candidate_reasons: this.n7RejectedCandidateReasons(loaded.value.candidates, [choice.value.candidate], choice.value.failedCandidateIds),
          blocking_contexts: loaded.value.feedback ? [{
            feedback_class: loaded.value.feedback.feedback_class,
            failure_reason_code: loaded.value.feedback.failure_reason_code,
            failed_candidate_ref: loaded.value.feedback.failed_candidate_ref,
          }] : [],
          decision_rationale: `N7 selected ${choice.value.candidate.candidate_key} for deterministic contract materialization.`,
          requires_human_review: choice.value.candidate.human_review_triggers.length > 0,
          human_review_triggers: choice.value.candidate.human_review_triggers,
          accepted_risk_refs: loaded.value.run.accepted_risk_refs,
          confidence: choice.value.candidate.confidence ?? null,
          input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
          workflow_run_id: input.workflow_run_id,
          gate_result_id: prepared.gate.readiness_gate_result_id,
          transition_attempt_id: null,
          artifact_refs: uniqueRefs([
            ...loaded.value.run.artifact_refs,
            prepared.handoffRef,
            debateAdmission.ref,
            support.value.grouping?.artifact.normalized_output_ref,
            support.value.debateAdmission?.artifact.normalized_output_ref,
          ]),
          created_at: now,
        };
        await this.runnerDependencies.topicQuestionRepository!.createSelectionDecisionWithMaterializations({
          decision,
          candidate_set_patch: {
            status: 'selected',
            updated_at: now,
          },
          candidate_status_patches: [
            ...choice.value.failedCandidateIds.map((candidateId) => ({
              candidate_id: candidateId,
              status: 'rejected' as const,
            })),
            {
              candidate_id: choice.value.candidate.topic_question_candidate_id,
              status: 'admitted' as const,
            },
          ],
          materializations: [materialization],
        });
      },
    });
  }

  private async persistAdmittedResult(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
    outcome: RunnerPersistInput,
    options: {
      writeAuthority: (prepared: PreparedAdmittedControlPlane) => Promise<void>;
    },
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    let prepared = await this.prepareAdmittedControlPlane(input, hashContext, outcome);
    await options.writeAuthority(prepared);
    prepared = await this.recordRuntimeContextProjection(input, outcome, prepared);
    return this.finalizeAdmittedResult(input, hashContext, outcome, prepared);
  }

  private async prepareAdmittedControlPlane(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
    outcome: RunnerPersistInput,
  ): Promise<PreparedAdmittedControlPlane> {
    const createdBy = input.created_by ?? 'system';
    const inputSnapshot = await this.controlPlane.compileInputSnapshot({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? outcome.targetRef.title_card_id ?? null,
      target_ref: outcome.targetRef,
      source_refs: input.frozen_input.source_refs,
      payload: {
        authority_hash: outcome.authorityHash,
        blocker_codes: outcome.blockers.map((blocker) => blocker.code),
        execution_spec_hash: hashContext.executionSpecHash,
        frozen_input_hash: hashContext.frozenInputHash,
        gate_status: outcome.gateStatus,
        handoff_hash: outcome.handoffHash,
        input_contract: input.frozen_input.input_contract,
        ...(outcome.loopbackTargetCode ? { loopback_target_code: outcome.loopbackTargetCode } : {}),
        node_id: input.node_id,
        node_replay_key: hashContext.nodeReplayKey,
        policy_version: input.policy_version,
        profile_id: input.profile_id ?? null,
        route_decision: outcome.routeDecision,
        route_target_node_id: outcome.routeTargetNodeId ?? this.routeTargetNode(input.node_id, outcome.routeDecision),
        run_mode: input.run_mode ?? null,
        runtime_admission_hash: hashContext.runtimeAdmissionHash,
        semantic_artifact_count: input.semantic_artifacts?.length ?? 0,
        semantic_artifact_hash: hashContext.semanticArtifactHash,
        snapshot_kind: input.frozen_input.snapshot_kind,
        warning_codes: outcome.warnings.map((warning) => warning.code),
      },
      policy_version: input.policy_version,
      created_by: createdBy,
    });
    const handoffArtifact = outcome.handoff
      ? await this.controlPlane.recordArtifactRef({
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id ?? outcome.targetRef.title_card_id ?? null,
        artifact_kind: 'structured_output',
        storage_kind: 'inline',
        workflow_run_id: input.workflow_run_id,
        input_snapshot_id: inputSnapshot.input_snapshot_id,
        payload: outcome.handoff as unknown as Record<string, unknown>,
        created_by: createdBy,
      })
      : null;
    const handoffRef = handoffArtifact
      ? this.ref('artifact_ref', handoffArtifact.artifact_ref_id, handoffArtifact.title_card_id ?? input.title_card_id ?? null)
      : null;
    const gate = await this.controlPlane.runDeterministicGate({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? outcome.targetRef.title_card_id ?? null,
      gate_key: `${input.node_id}.phase4a-harness-gate`,
      target_ref: outcome.targetRef,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: input.workflow_run_id,
      policy_version_id: input.policy_version,
      verdict: outcome.blockers.length === 0 && outcome.warnings.length > 0 ? 'pass_with_risk' : undefined,
      blockers: outcome.blockers,
      warnings: outcome.warnings,
      required_actions: outcome.requiredActions ?? outcome.blockers.map((blocker) => blocker.code),
      accepted_risk_refs: outcome.acceptedRiskRefs ?? [],
      created_by: createdBy,
    });
    const gateResultRef = this.ref(
      'readiness_gate_result',
      gate.readiness_gate_result_id,
      gate.title_card_id ?? input.title_card_id ?? null,
    );
    return {
      createdBy,
      gate,
      gateResultRef,
      handoffArtifact,
      handoffRef,
      inputSnapshot,
      runtimeContextProjectionArtifact: null,
      runtimeContextProjectionHash: null,
      runtimeContextProjectionRef: null,
    };
  }

  private async recordRuntimeContextProjection(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    outcome: RunnerPersistInput,
    prepared: PreparedAdmittedControlPlane,
  ): Promise<PreparedAdmittedControlPlane> {
    const runtimeContextProjection = outcome.runtimeContextProjection?.build({
      handoffRef: prepared.handoffRef,
      inputSnapshotId: prepared.inputSnapshot.input_snapshot_id,
    }) ?? null;
    if (!runtimeContextProjection) {
      return prepared;
    }
    const runtimeContextProjectionHash = this.hash(runtimeContextProjection);
    const runtimeContextProjectionArtifact = await this.controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? outcome.targetRef.title_card_id ?? null,
      artifact_kind: 'diagnostic',
      storage_kind: 'inline',
      workflow_run_id: input.workflow_run_id,
      input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
      payload: runtimeContextProjection as unknown as Record<string, unknown>,
      checksum: runtimeContextProjectionHash,
      created_by: prepared.createdBy,
    });
    return {
      ...prepared,
      runtimeContextProjectionArtifact,
      runtimeContextProjectionHash,
      runtimeContextProjectionRef: this.ref(
        'artifact_ref',
        runtimeContextProjectionArtifact.artifact_ref_id,
        runtimeContextProjectionArtifact.title_card_id ?? input.title_card_id ?? null,
      ),
    };
  }

  private async finalizeAdmittedResult(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
    outcome: RunnerPersistInput,
    prepared: PreparedAdmittedControlPlane,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    const createdBy = prepared.createdBy;
    const createdAuthorityRefs = uniqueRefs([outcome.authorityRef, ...(outcome.additionalAuthorityRefs ?? [])]);
    const transition = await this.controlPlane.attemptTransition({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? outcome.targetRef.title_card_id ?? null,
      transition_key: outcome.transitionKey,
      source_ref: outcome.sourceRef,
      target_ref: outcome.targetRef,
      gate_result_id: prepared.gate.readiness_gate_result_id,
      workflow_run_id: input.workflow_run_id,
      input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
      policy_version_id: input.policy_version,
      actor: input.actor ?? { actor_type: createdBy },
      accepted_risk_refs: outcome.acceptedRiskRefs ?? [],
      created_authority_refs: createdAuthorityRefs,
      allow_audit_authority_refs_on_blocked: outcome.gateStatus === 'blocked',
    });
    const transitionRef = this.ref(
      'chain_transition_attempt',
      transition.chain_transition_attempt_id,
      transition.title_card_id ?? input.title_card_id ?? null,
    );
    const traceSnapshot = await this.controlPlane.buildTraceSnapshot({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? outcome.targetRef.title_card_id ?? null,
      target_ref: outcome.targetRef,
      object_refs: uniqueRefs([
        outcome.targetRef,
        outcome.sourceRef,
        outcome.authorityRef,
        ...(outcome.additionalAuthorityRefs ?? []),
        ...input.frozen_input.source_refs,
      ]),
      artifact_refs: uniqueRefs([prepared.handoffRef, prepared.runtimeContextProjectionRef]),
      transition_attempt_refs: [transitionRef],
      payload: {
        ...outcome.tracePayload,
        blocker_codes: outcome.blockers.map((blocker) => blocker.code),
        gate_status: outcome.gateStatus,
        runtime_context_projection_hash: prepared.runtimeContextProjectionHash,
        runtime_context_projection_ref: prepared.runtimeContextProjectionRef,
        ...((outcome.loopbackTargetCode ?? outcome.tracePayload?.loopback_target_code)
          ? { loopback_target_code: outcome.loopbackTargetCode ?? outcome.tracePayload?.loopback_target_code }
          : {}),
        node_id: input.node_id,
        node_replay_key: hashContext.nodeReplayKey,
        phase: outcome.tracePhase,
        route_decision: outcome.routeDecision,
        route_target_node_id: outcome.routeTargetNodeId ?? this.routeTargetNode(input.node_id, outcome.routeDecision),
        warning_codes: outcome.warnings.map((warning) => warning.code),
      },
      created_by: createdBy,
    });
    const traceSnapshotRef = this.ref(
      'trace_snapshot',
      traceSnapshot.trace_snapshot_id,
      traceSnapshot.title_card_id ?? input.title_card_id ?? null,
    );
    const replayIdentity: TopicSelectionV1bWorkflowHarnessReplayIdentity = {
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      attempt_family_key: hashContext.attemptFamilyKey,
      node_replay_key: hashContext.nodeReplayKey,
    };
    const hashes = this.resultHashesForOutcome(input, hashContext, {
      authorityHash: outcome.authorityHash,
      blockerCodes: outcome.blockers.map((blocker) => blocker.code),
      gateStatus: outcome.gateStatus,
      handoffHash: outcome.handoffHash,
      loopbackTargetCode: outcome.loopbackTargetCode ?? null,
      routeDecision: outcome.routeDecision,
      routeReasonCode: outcome.errorCode ?? outcome.blockers[0]?.code ?? null,
      routeTargetNodeId: outcome.routeTargetNodeId ?? null,
      warningCodes: outcome.warnings.map((warning) => warning.code),
    });
    const resultWithoutTraceArtifact: TopicSelectionV1bWorkflowHarnessRunResult = {
      schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_RESULT_SCHEMA_VERSION,
      node_id: input.node_id,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      gate_status: outcome.gateStatus,
      failure_class: outcome.failureClass,
      route_decision: outcome.routeDecision,
      replay_identity: replayIdentity,
      hashes,
      blockers: outcome.blockers,
      warnings: outcome.warnings,
      authority_ref: outcome.authorityRef,
      handoff_ref: prepared.handoffRef,
      gate_result_ref: prepared.gateResultRef,
      transition_attempt_ref: transitionRef,
      trace_snapshot_ref: traceSnapshotRef,
      harness_trace_artifact_ref: null,
      replay_provenance: null,
      error_code: outcome.errorCode ?? null,
      error_message: outcome.errorMessage ?? null,
    };
    const tracePayload = {
      payload_schema: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_TRACE_PAYLOAD_SCHEMA_VERSION,
      node_id: input.node_id,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      node_replay_key: hashContext.nodeReplayKey,
      input_hash: hashContext.frozenInputHash,
      request: input,
      result: resultWithoutTraceArtifact,
      created_at: this.now(),
    } satisfies TopicSelectionV1bWorkflowHarnessTracePayload;
    const traceArtifact = await this.controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? outcome.targetRef.title_card_id ?? null,
      artifact_kind: 'trace',
      storage_kind: 'inline',
      workflow_run_id: input.workflow_run_id,
      input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
      payload: tracePayload as unknown as Record<string, unknown>,
      created_by: createdBy,
    });
    const result: TopicSelectionV1bWorkflowHarnessRunResult = {
      ...resultWithoutTraceArtifact,
      harness_trace_artifact_ref: this.ref(
        'artifact_ref',
        traceArtifact.artifact_ref_id,
        traceArtifact.title_card_id ?? input.title_card_id ?? null,
      ),
    };
    return this.assertResult(result);
  }

  private resultHashesForOutcome(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
    outcome: {
      authorityHash: string | null;
      blockerCodes: string[];
      gateStatus: TopicSelectionV1bWorkflowHarnessGateStatus;
      handoffHash: string | null;
      loopbackTargetCode: string | null;
      routeDecision: TopicSelectionV1bWorkflowHarnessRouteDecision;
      routeReasonCode: string | null;
      routeTargetNodeId: TopicSelectionV1bWorkflowHarnessNodeId | null;
      warningCodes: string[];
    },
  ): TopicSelectionV1bWorkflowHarnessHashes {
    const gateResultHash = this.outcomeGateResultHash(input, hashContext, {
      authorityHash: outcome.authorityHash,
      blockerCodes: outcome.blockerCodes,
      gateStatus: outcome.gateStatus,
      loopbackTargetCode: outcome.loopbackTargetCode,
      routeDecision: outcome.routeDecision,
      warningCodes: outcome.warningCodes,
    });
    const routeHash = this.hash({
      gate_result_hash: gateResultHash,
      handoff_hash: outcome.handoffHash,
      next_action: outcome.routeDecision,
      node_attempt_id: input.node_attempt_id,
      node_id: input.node_id,
      route_decision: outcome.routeDecision,
      loopback_target_code: outcome.loopbackTargetCode,
      route_policy_version: input.policy_version,
      route_reason_code: outcome.routeReasonCode,
      target_node_id: outcome.routeTargetNodeId ?? this.routeTargetNode(input.node_id, outcome.routeDecision),
    });
    return {
      frozen_input_hash: hashContext.frozenInputHash,
      execution_spec_hash: hashContext.executionSpecHash,
      semantic_artifact_hash: hashContext.semanticArtifactHash,
      runtime_admission_hash: hashContext.runtimeAdmissionHash,
      gate_result_hash: gateResultHash,
      authority_hash: outcome.authorityHash,
      handoff_hash: outcome.handoffHash,
      route_hash: routeHash,
    };
  }

  private outcomeGateResultHash(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
    outcome: {
      authorityHash: string | null;
      blockerCodes: string[];
      gateStatus: TopicSelectionV1bWorkflowHarnessGateStatus;
      loopbackTargetCode?: string | null;
      routeDecision: TopicSelectionV1bWorkflowHarnessRouteDecision;
      warningCodes: string[];
    },
  ): string {
    return this.hash({
      authority_hash: outcome.authorityHash,
      authority_kind: this.getNodePolicy(input.node_id).authority_kind,
      blocker_codes: outcome.blockerCodes,
      frozen_input_hash: hashContext.frozenInputHash,
      gate_status: outcome.gateStatus,
      loopback_target_code: outcome.loopbackTargetCode ?? null,
      node_id: input.node_id,
      node_replay_key: hashContext.nodeReplayKey,
      output_schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_RESULT_SCHEMA_VERSION,
      policy_version: input.policy_version,
      route_decision: outcome.routeDecision,
      runtime_admission_hash: hashContext.runtimeAdmissionHash,
      semantic_artifact_hash: hashContext.semanticArtifactHash,
      warning_codes: outcome.warningCodes,
    });
  }

  private buildHandoff(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    options: {
      handoffKind: TopicSelectionV1bWorkflowHarnessHandoffKind;
      payload: TopicSelectionV1bWorkflowHarnessHandoffPayload;
      requiredRefs: TopicSelectionFunctionalRef[];
      residualRiskRefs: TopicSelectionFunctionalRef[];
      sourceAuthorityHash: string;
      sourceAuthorityRef: TopicSelectionFunctionalRef;
      sourceGateResultHash: string;
      upstreamLineageHash: string;
      warningCodes: string[];
    },
  ): TopicSelectionV1bWorkflowHarnessHandoff {
    const edge = this.handoffEdge(options.handoffKind);
    const payloadHash = this.hash(options.payload);
    return {
      envelope: {
        handoff_kind: options.handoffKind,
        source_node_id: input.node_id,
        source_node_attempt_id: input.node_attempt_id,
        source_authority_ref: options.sourceAuthorityRef,
        source_authority_hash: options.sourceAuthorityHash,
        source_gate_result_hash: options.sourceGateResultHash,
        upstream_lineage_hash: options.upstreamLineageHash,
        policy_version: input.policy_version,
        schema_version: edge.payload_schema_version,
        warning_codes: options.warningCodes,
        residual_risk_refs: options.residualRiskRefs,
      },
      target_node_id: edge.target_node_id,
      route_signal: edge.route_signal,
      payload_hash: payloadHash,
      required_refs: options.requiredRefs,
      payload: options.payload,
    };
  }

  private handoffEdge(
    handoffKind: TopicSelectionV1bWorkflowHarnessHandoffKind,
  ): {
    target_node_id: TopicSelectionV1bWorkflowHarnessNodeId | 'v1c.entry';
    route_signal: string;
    payload_schema_version: string;
  } {
    switch (handoffKind) {
      case 'N1ToN2Handoff':
        return {
          target_node_id: 'topic-selection.v1b.record-research-constraint-profile.v1',
          route_signal: 'snapshot_created',
          payload_schema_version: 'N1ToN2Handoff@v1',
        };
      case 'N2ToN3Handoff':
        return {
          target_node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
          route_signal: 'constraint_profile_recorded',
          payload_schema_version: 'N2ToN3Handoff@v1',
        };
      case 'N3ToN4Handoff':
        return {
          target_node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
          route_signal: 'intake_ready_for_slice_generation',
          payload_schema_version: 'N3ToN4Handoff@v1',
        };
      case 'N4ToN5Handoff':
        return {
          target_node_id: 'topic-selection.v1b.select-research-slice.v1',
          route_signal: 'slice_options_generated',
          payload_schema_version: 'N4ToN5Handoff@v1',
        };
      case 'N5ToN6Handoff':
        return {
          target_node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
          route_signal: 'slice_selected',
          payload_schema_version: 'N5ToN6Handoff@v1',
        };
      case 'N6ToN7Handoff':
        return {
          target_node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
          route_signal: 'question_candidates_generated',
          payload_schema_version: 'N6ToN7Handoff@v1',
        };
      case 'N7ToN8Handoff':
        return {
          target_node_id: 'topic-selection.v1b.assess-topic-value.v1',
          route_signal: 'topic_question_contract_materialized',
          payload_schema_version: 'N7ToN8Handoff@v1',
        };
      case 'N8ToN9Handoff':
        return {
          target_node_id: 'topic-selection.v1b.decide-value-disposition.v1',
          route_signal: 'topic_value_assessed',
          payload_schema_version: 'N8ToN9Handoff@v1',
        };
      case 'N9ToN10Handoff':
        return {
          target_node_id: 'topic-selection.v1b.create-draft-topic-package.v1',
          route_signal: 'advance_to_package_candidate',
          payload_schema_version: 'N9ToN10Handoff@v1',
        };
      case 'N10ToN11Handoff':
        return {
          target_node_id: 'topic-selection.v1b.publish-v1c-input-bundle.v1',
          route_signal: 'package_created',
          payload_schema_version: 'N10ToN11Handoff@v1',
        };
      case 'V1cInputBundle':
        return {
          target_node_id: 'v1c.entry',
          route_signal: 'v1c_bundle_published',
          payload_schema_version: 'V1cInputBundle@v1',
        };
      default:
        throw new AppError(500, 'INTERNAL_ERROR', `T-107 harness closure cannot build handoff kind ${handoffKind}.`);
    }
  }

  private nextNodeForImplementedHandoff(
    nodeId: TopicSelectionV1bWorkflowHarnessNodeId,
  ): TopicSelectionV1bWorkflowHarnessNodeId | null {
    switch (nodeId) {
      case 'topic-selection.v1b.create-intake-snapshot.v1':
        return 'topic-selection.v1b.record-research-constraint-profile.v1';
      case 'topic-selection.v1b.record-research-constraint-profile.v1':
        return 'topic-selection.v1b.assess-intake-readiness.v1';
      case 'topic-selection.v1b.assess-intake-readiness.v1':
        return 'topic-selection.v1b.generate-research-slice-options.v1';
      case 'topic-selection.v1b.generate-research-slice-options.v1':
        return 'topic-selection.v1b.select-research-slice.v1';
      case 'topic-selection.v1b.select-research-slice.v1':
        return 'topic-selection.v1b.generate-topic-question-candidates.v1';
      case 'topic-selection.v1b.generate-topic-question-candidates.v1':
        return 'topic-selection.v1b.materialize-topic-question-contract.v1';
      case 'topic-selection.v1b.materialize-topic-question-contract.v1':
        return 'topic-selection.v1b.assess-topic-value.v1';
      case 'topic-selection.v1b.assess-topic-value.v1':
        return 'topic-selection.v1b.decide-value-disposition.v1';
      case 'topic-selection.v1b.decide-value-disposition.v1':
        return 'topic-selection.v1b.create-draft-topic-package.v1';
      case 'topic-selection.v1b.create-draft-topic-package.v1':
        return 'topic-selection.v1b.publish-v1c-input-bundle.v1';
      default:
        return null;
    }
  }

  private routeTargetNode(
    nodeId: TopicSelectionV1bWorkflowHarnessNodeId,
    routeDecision: TopicSelectionV1bWorkflowHarnessRouteDecision,
  ): TopicSelectionV1bWorkflowHarnessNodeId | null {
    if (routeDecision === 'invoke_next') {
      return this.nextNodeForImplementedHandoff(nodeId);
    }
    if (nodeId === 'topic-selection.v1b.select-research-slice.v1' && routeDecision === 'loopback') {
      return 'topic-selection.v1b.generate-research-slice-options.v1';
    }
    if (nodeId === 'topic-selection.v1b.generate-topic-question-candidates.v1' && routeDecision === 'loopback') {
      return 'topic-selection.v1b.generate-topic-question-candidates.v1';
    }
    if (nodeId === 'topic-selection.v1b.materialize-topic-question-contract.v1' && routeDecision === 'loopback') {
      return 'topic-selection.v1b.generate-topic-question-candidates.v1';
    }
    if (nodeId === 'topic-selection.v1b.assess-topic-value.v1' && routeDecision === 'loopback') {
      return 'topic-selection.v1b.materialize-topic-question-contract.v1';
    }
    return null;
  }

  private parseN7Payload(
    payload: Record<string, unknown>,
  ): { ok: true; value: TopicSelectionV1bN7HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
    const baseKeys = [
      'input_mode',
      'n6_handoff_hash',
      'topic_question_candidate_set_ref',
      'topic_question_candidate_set_hash',
      'admissible_candidate_refs',
      'admissible_candidate_hashes',
      'selected_research_slice_ref',
      'selected_research_slice_hash',
      'generation_artifact_ref',
      'generation_artifact_hash',
      'candidate_gate_hash',
      'candidate_grouping_ref',
      'candidate_grouping_hash',
    ];
    const feedbackKeys = [
      ...baseKeys,
      'n8_feedback_ref',
      'n8_feedback_hash',
      'n8_feedback_payload_hash',
    ];
    const mode = payload.input_mode;
    const allowedKeys = mode === 'feedback_from_n8' ? feedbackKeys : baseKeys;
    if (!this.hasOnlyKeys(payload, allowedKeys)
      || (mode !== 'initial_from_n6' && mode !== 'feedback_from_n8')
      || !this.isHash(payload.n6_handoff_hash)
      || !this.isFunctionalRefValue(payload.topic_question_candidate_set_ref)
      || !this.isHash(payload.topic_question_candidate_set_hash)
      || !this.isFunctionalRefArray(payload.admissible_candidate_refs)
      || (payload.admissible_candidate_refs as unknown[]).length === 0
      || !this.isStringArray(payload.admissible_candidate_hashes)
      || !(payload.admissible_candidate_hashes as string[]).every((hash) => this.isHash(hash))
      || (payload.admissible_candidate_hashes as string[]).length !== (payload.admissible_candidate_refs as unknown[]).length
      || !this.isFunctionalRefValue(payload.selected_research_slice_ref)
      || !this.isHash(payload.selected_research_slice_hash)
      || !this.isFunctionalRefValue(payload.generation_artifact_ref)
      || !this.isHash(payload.generation_artifact_hash)
      || !this.isHash(payload.candidate_gate_hash)
      || !this.isNullableFunctionalRefValue(payload.candidate_grouping_ref)
      || !this.isNullableHash(payload.candidate_grouping_hash)) {
      return {
        ok: false,
        code: 'N7_FROZEN_PAYLOAD_INVALID',
        message: 'N7 requires frozen N6 candidate-set lineage refs, hashes, and candidate hash pairs.',
      };
    }
    if (mode === 'feedback_from_n8'
      && (!this.isFunctionalRefValue(payload.n8_feedback_ref)
        || !this.isHash(payload.n8_feedback_hash)
        || !this.isHash(payload.n8_feedback_payload_hash))) {
      return {
        ok: false,
        code: 'N7_FEEDBACK_PAYLOAD_INVALID',
        message: 'N7 feedback mode requires frozen N8 feedback refs and hashes.',
      };
    }
    return {
      ok: true,
      value: payload as unknown as TopicSelectionV1bN7HarnessFrozenInputPayload,
    };
  }

  private async loadN7Context(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN7HarnessFrozenInputPayload,
  ): Promise<{ ok: true; value: N7LoadedContext } | { ok: false; code: string; message: string }> {
    const repository = this.runnerDependencies.topicQuestionRepository!;
    const n6Handoff = await this.resolveN7SourceHandoff(input, payload);
    if (!n6Handoff.ok) {
      return n6Handoff;
    }
    const candidateSet = await repository.findCandidateSetById(payload.topic_question_candidate_set_ref.ref_id);
    if (!candidateSet) {
      return {
        ok: false,
        code: 'N7_CANDIDATE_SET_NOT_FOUND',
        message: 'N7 frozen candidate-set ref does not resolve.',
      };
    }
    const [run, frame, candidates, feedback] = await Promise.all([
      repository.findFormationRunById(candidateSet.form_topic_question_run_id),
      repository.findQuestionFrameById(candidateSet.question_frame_id),
      repository.listCandidatesByCandidateSetId(candidateSet.topic_question_candidate_set_id),
      payload.input_mode === 'feedback_from_n8' ? this.resolveN7FeedbackPayload(payload) : Promise.resolve(null),
    ]);
    if (!run || !frame) {
      return {
        ok: false,
        code: 'N7_CANDIDATE_SET_CONTEXT_MISSING',
        message: 'N7 candidate set is missing its formation run or question frame.',
      };
    }
    if (payload.input_mode === 'initial_from_n6' && candidateSet.status !== 'ready_for_selection') {
      return {
        ok: false,
        code: 'N7_CANDIDATE_SET_NOT_READY',
        message: 'Initial N7 materialization requires a ready_for_selection candidate set.',
      };
    }
    if (payload.input_mode === 'feedback_from_n8' && candidateSet.status !== 'selected') {
      return {
        ok: false,
        code: 'N7_FEEDBACK_CANDIDATE_SET_NOT_SELECTED',
        message: 'N7 feedback mode requires the candidate set selected by a previous N7 trial.',
      };
    }
    if (payload.input_mode === 'feedback_from_n8' && !feedback) {
      return {
        ok: false,
        code: 'N7_FEEDBACK_ARTIFACT_INVALID',
        message: 'N7 could not resolve the frozen N8 feedback payload.',
      };
    }
    return {
      ok: true,
      value: {
        candidateSet,
        candidates,
        feedback,
        frame,
        n6Handoff: n6Handoff.value,
        run,
      },
    };
  }

  private async resolveN7SourceHandoff(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN7HarnessFrozenInputPayload,
  ): Promise<{ ok: true; value: TopicSelectionV1bWorkflowHarnessHandoff } | { ok: false; code: string; message: string }> {
    for (const sourceRef of input.frozen_input.source_refs) {
      if (sourceRef.ref_type !== 'artifact_ref') {
        continue;
      }
      const artifact = await this.controlPlane.getArtifactRef(sourceRef.ref_id);
      const handoff = this.isN6ToN7HandoffArtifactPayload(artifact?.payload)
        ? artifact.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff
        : null;
      if (!handoff) {
        continue;
      }
      if (this.hash(handoff) !== payload.n6_handoff_hash) {
        return {
          ok: false,
          code: 'N7_N6_HANDOFF_HASH_MISMATCH',
          message: 'N7 n6_handoff_hash does not match the persisted N6-to-N7 handoff artifact.',
        };
      }
      return { ok: true, value: handoff };
    }
    return {
      ok: false,
      code: 'N7_N6_HANDOFF_NOT_FOUND',
      message: 'N7 frozen input source_refs must include the persisted N6-to-N7 handoff artifact.',
    };
  }

  private isN6ToN7HandoffArtifactPayload(value: unknown): value is TopicSelectionV1bWorkflowHarnessHandoff {
    return this.isRecord(value)
      && this.isRecord(value.envelope)
      && value.envelope.handoff_kind === 'N6ToN7Handoff'
      && this.isRecord(value.payload);
  }

  private async resolveN7FeedbackPayload(
    payload: TopicSelectionV1bN7HarnessFeedbackFrozenInputPayload,
  ): Promise<TopicSelectionV1bN8ToN7FeedbackPayload | null> {
    const artifact = await this.controlPlane.getArtifactRef(payload.n8_feedback_ref.ref_id);
    if (!artifact || this.hash(artifact) !== payload.n8_feedback_hash || !this.isN8ToN7FeedbackPayload(artifact.payload)) {
      return null;
    }
    const feedback = artifact.payload as unknown as TopicSelectionV1bN8ToN7FeedbackPayload;
    if (this.hash(feedback) !== payload.n8_feedback_payload_hash) {
      return null;
    }
    return feedback;
  }

  private isN8ToN7FeedbackPayload(value: unknown): value is TopicSelectionV1bN8ToN7FeedbackPayload {
    return this.isRecord(value)
      && this.hasOnlyKeys(value, [
        'affected_refs',
        'failed_candidate_hash',
        'failed_candidate_ref',
        'failed_topic_question_contract_hash',
        'failed_topic_question_contract_ref',
        'failure_reason_code',
        'feedback_class',
        'feedback_summary',
        'n8_gate_result_hash',
        'previous_n7_handoff_hash',
        'previous_n7_handoff_ref',
        'previous_trial_ledger_hash',
        'previous_trial_ledger_ref',
        'topic_question_candidate_set_hash',
        'topic_question_candidate_set_ref',
        'value_assessment_hash',
        'value_assessment_ref',
      ])
      && ['semantic_candidate_failure', 'gate_rejected', 'technical_failure'].includes(value.feedback_class as string)
      && typeof value.failure_reason_code === 'string'
      && value.failure_reason_code.trim().length > 0
      && typeof value.feedback_summary === 'string'
      && value.feedback_summary.trim().length > 0
      && this.isFunctionalRefArray(value.affected_refs)
      && (value.affected_refs as unknown[]).length > 0
      && this.isFunctionalRefValue(value.previous_n7_handoff_ref)
      && this.isHash(value.previous_n7_handoff_hash)
      && this.isFunctionalRefValue(value.previous_trial_ledger_ref)
      && this.isHash(value.previous_trial_ledger_hash)
      && this.isFunctionalRefValue(value.failed_topic_question_contract_ref)
      && this.isHash(value.failed_topic_question_contract_hash)
      && this.isFunctionalRefValue(value.failed_candidate_ref)
      && this.isHash(value.failed_candidate_hash)
      && this.isFunctionalRefValue(value.topic_question_candidate_set_ref)
      && this.isHash(value.topic_question_candidate_set_hash)
      && this.isHash(value.n8_gate_result_hash)
      && this.isNullableFunctionalRefValue(value.value_assessment_ref)
      && this.isNullableHash(value.value_assessment_hash);
  }

  private async resolveEarlySemanticSupportPayload<T extends TopicSelectionV1bEarlySemanticSupportPayload>(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    slotId: TopicSelectionV1bEarlySemanticSupportSlotId,
    guard: (value: unknown) => value is T,
  ): Promise<{
    ok: true;
    value: { artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef; payload: T; payloadHash: string } | null;
  } | { ok: false; code: string; message: string }> {
    const artifact = (input.semantic_artifacts ?? []).find((item) => item.slot_id === slotId);
    if (!artifact) {
      return { ok: true, value: null };
    }
    if (artifact.execution_mode !== 'codex_assisted' && artifact.execution_mode !== 'mocked_llm') {
      return {
        ok: false,
        code: 'V1B_EARLY_SUPPORT_ARTIFACT_PROVENANCE_CLASS_INVALID',
        message: 'Promoted v1b N2/N3/N5 semantic support artifacts must be generated by runtime codex_assisted or mocked_llm paths.',
      };
    }
    if (!artifact.normalized_output_ref) {
      return {
        ok: false,
        code: 'V1B_EARLY_SUPPORT_ARTIFACT_NOT_FOUND',
        message: 'v1b N2/N3/N5 semantic support artifact must provide a frozen normalized_output_ref.',
      };
    }
    const normalized = await this.controlPlane.getArtifactRef(artifact.normalized_output_ref.ref_id);
    if (!normalized || !guard(normalized.payload)) {
      return {
        ok: false,
        code: 'V1B_EARLY_SUPPORT_ARTIFACT_INVALID',
        message: 'v1b N2/N3/N5 semantic support artifact normalized payload does not match its output contract.',
      };
    }
    const payloadHash = this.hash(normalized.payload);
    if (
      payloadHash !== artifact.normalized_output_hash
      || payloadHash !== artifact.structured_output_hash
      || payloadHash !== artifact.support_artifact_hash
    ) {
      return {
        ok: false,
        code: 'V1B_EARLY_SUPPORT_ARTIFACT_PAYLOAD_HASH_MISMATCH',
        message: 'v1b N2/N3/N5 semantic support artifact payload hash does not match frozen provenance.',
      };
    }
    if (artifact.runtime_provenance_class === 'runtime_verified') {
      const auditVerification = await this.verifyEarlyRuntimeVerifiedSupportAuditArtifact(input, artifact);
      if (!auditVerification.ok) {
        return auditVerification;
      }
    }
    let expectedIdentity;
    try {
      expectedIdentity = this.earlySemanticSupportRuntime.buildAdmissionExpectedIdentity({
        request: input,
        slotId,
        normalizedPayloadHash: payloadHash,
        executionMode: artifact.execution_mode,
        runMode: artifact.run_mode,
        profileId: artifact.profile_id,
        modelOptionId: artifact.model_option_id,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return {
          ok: false,
          code: 'V1B_EARLY_SUPPORT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
          message: error.message,
        };
      }
      throw error;
    }
    const admission = this.earlySemanticSupportAdmission.admit({
      artifact,
      expected: expectedIdentity,
      allow_fixture_replay: input.run_mode !== 'product',
    });
    if (!admission.admitted) {
      return {
        ok: false,
        code: admission.blocker.code,
        message: admission.blocker.message,
      };
    }
    return {
      ok: true,
      value: {
        artifact,
        payload: normalized.payload as unknown as T,
        payloadHash,
      },
    };
  }

  private async verifyEarlyRuntimeVerifiedSupportAuditArtifact(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  ): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
    if (
      !artifact.runtime_audit_ref
      || artifact.runtime_audit_ref.ref_type !== 'artifact_ref'
      || !this.refsEqual(artifact.provenance_ref, artifact.runtime_audit_ref)
    ) {
      return this.earlyRuntimeAuditDrift('v1b N2/N3/N5 runtime support provenance must point to its audit artifact_ref.');
    }
    const auditArtifact = await this.controlPlane.getArtifactRef(artifact.runtime_audit_ref.ref_id);
    if (
      !auditArtifact
      || auditArtifact.artifact_kind !== 'diagnostic'
      || auditArtifact.checksum !== artifact.runtime_audit_hash
      || auditArtifact.workflow_run_id !== input.workflow_run_id
    ) {
      return this.earlyRuntimeAuditDrift('v1b N2/N3/N5 runtime support audit artifact is missing or checksum-drifted.');
    }
    const auditPayload = auditArtifact.payload;
    if (!this.isRecord(auditPayload) || !this.isRecord(auditPayload.provenance)) {
      return this.earlyRuntimeAuditDrift('v1b N2/N3/N5 runtime support audit payload is not a valid invocation audit snapshot.');
    }
    const provenance = auditPayload.provenance;
    const expectedSourceKind = artifact.execution_mode === 'mocked_llm' ? 'mock_fixture' : 'codex_response';
    if (
      auditPayload.node_id !== input.node_id
      || auditPayload.workflow_run_id !== input.workflow_run_id
      || auditPayload.node_attempt_id !== input.node_attempt_id
      || auditPayload.status !== 'succeeded'
      || provenance.workflow_run_id !== input.workflow_run_id
      || provenance.node_id !== input.node_id
      || provenance.node_attempt_id !== input.node_attempt_id
      || provenance.execution_mode !== artifact.execution_mode
      || provenance.source_kind !== expectedSourceKind
      || provenance.non_provider !== true
      || provenance.run_mode !== artifact.run_mode
      || provenance.profile_id !== artifact.profile_id
      || provenance.model_option_id !== artifact.model_option_id
      || provenance.output_contract !== artifact.output_contract
      || provenance.prompt_packet_hash !== artifact.prompt_packet_hash
      || provenance.structured_output_hash !== artifact.structured_output_hash
      || provenance.cache_status !== 'not_applicable'
      || provenance.response_reuse_ref !== null
      || provenance.telemetry !== null
    ) {
      return this.earlyRuntimeAuditDrift('v1b N2/N3/N5 runtime support audit provenance does not match the support artifact identity.');
    }
    return { ok: true };
  }

  private earlyRuntimeAuditDrift(message: string): { ok: false; code: string; message: string } {
    return {
      ok: false,
      code: 'V1B_EARLY_SUPPORT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
      message,
    };
  }

  private async resolveN7SupportContext(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN7HarnessFrozenInputPayload,
  ): Promise<{ ok: true; value: N7SupportContext } | { ok: false; code: string; message: string }> {
    const grouping = await this.resolveN7SemanticPayload<TopicSelectionV1bCandidateGroupingSupportPayload>(
      input,
      payload,
      'n7_candidate_grouping',
      this.isN7CandidateGroupingSupportPayload.bind(this),
    );
    if (!grouping.ok) return grouping;
    const debateAdmission = await this.resolveN7SemanticPayload<TopicSelectionV1bN8DebateAdmissionReviewSupportPayload>(
      input,
      payload,
      'n7_n8_debate_admission_review',
      this.isN7DebateAdmissionSupportPayload.bind(this),
    );
    if (!debateAdmission.ok) return debateAdmission;
    const failedTrialSynthesis = await this.resolveN7SemanticPayload<TopicSelectionV1bN8FailedTrialSynthesisSupportPayload>(
      input,
      payload,
      'n7_failed_trial_synthesis',
      this.isN7FailedTrialSynthesisSupportPayload.bind(this),
    );
    if (!failedTrialSynthesis.ok) return failedTrialSynthesis;
    if (payload.input_mode === 'initial_from_n6' && failedTrialSynthesis.value) {
      return {
        ok: false,
        code: 'N7_FAILED_TRIAL_SYNTHESIS_NOT_ALLOWED_FOR_INITIAL_TRIAL',
        message: 'Failed-trial synthesis support is only valid after N8 feedback.',
      };
    }
    return {
      ok: true,
      value: {
        debateAdmission: debateAdmission.value,
        failedTrialSynthesis: failedTrialSynthesis.value,
        grouping: grouping.value,
      },
    };
  }

  private async resolveN7SemanticPayload<T>(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN7HarnessFrozenInputPayload,
    slotId: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['slot_id'],
    guard: (value: unknown) => value is T,
  ): Promise<{
    ok: true;
    value: { artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef; payload: T; payloadHash: string } | null;
  } | { ok: false; code: string; message: string }> {
    const artifact = (input.semantic_artifacts ?? []).find((item) => item.slot_id === slotId);
    if (!artifact) {
      return { ok: true, value: null };
    }
    if (!artifact.normalized_output_ref) {
      return {
        ok: false,
        code: 'N7_SEMANTIC_SUPPORT_ARTIFACT_NOT_FOUND',
        message: 'N7 semantic support artifact must provide a frozen normalized_output_ref.',
      };
    }
    const normalized = await this.controlPlane.getArtifactRef(artifact.normalized_output_ref.ref_id);
    if (!normalized || !guard(normalized.payload)) {
      return {
        ok: false,
        code: 'N7_SEMANTIC_SUPPORT_ARTIFACT_INVALID',
        message: 'N7 semantic support artifact normalized payload does not match its output contract.',
      };
    }
    const payloadHash = this.hash(normalized.payload);
    if (
      payloadHash !== artifact.normalized_output_hash
      || payloadHash !== artifact.structured_output_hash
      || payloadHash !== artifact.support_artifact_hash
    ) {
      return {
        ok: false,
        code: 'N7_SEMANTIC_SUPPORT_ARTIFACT_HASH_MISMATCH',
        message: 'N7 semantic support artifact payload hash does not match frozen provenance.',
      };
    }
    if (artifact.runtime_provenance_class === 'runtime_verified') {
      const auditVerification = await this.verifyN7RuntimeVerifiedSupportAuditArtifact(input, artifact);
      if (!auditVerification.ok) {
        return auditVerification;
      }
    }
    const admission = this.n7SupportAdmission.admit({
      artifact,
      expected: this.n7SupportRuntime.buildAdmissionExpectedIdentity({
        request: input,
        frozenPayload: payload,
        slotId: slotId as TopicSelectionV1bN7SupportSlotId,
        normalizedPayloadHash: payloadHash,
        executionMode: artifact.execution_mode as Extract<typeof artifact.execution_mode, 'codex_assisted' | 'mocked_llm'>,
        runMode: artifact.run_mode,
        profileId: artifact.profile_id,
        modelOptionId: artifact.model_option_id,
      }),
      required: false,
      allow_fixture_replay: input.run_mode !== 'product',
    });
    if (!admission.admitted) {
      return {
        ok: false,
        code: admission.blocker.code,
        message: admission.blocker.message,
      };
    }
    return {
      ok: true,
      value: {
        artifact,
        payload: normalized.payload as unknown as T,
        payloadHash,
      },
    };
  }

  private async verifyN7RuntimeVerifiedSupportAuditArtifact(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  ): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
    if (
      !artifact.runtime_audit_ref
      || artifact.runtime_audit_ref.ref_type !== 'artifact_ref'
      || !this.refsEqual(artifact.provenance_ref, artifact.runtime_audit_ref)
    ) {
      return this.n7RuntimeAuditDrift('N7 runtime support provenance must point to its audit artifact_ref.');
    }
    const auditArtifact = await this.controlPlane.getArtifactRef(artifact.runtime_audit_ref.ref_id);
    if (
      !auditArtifact
      || auditArtifact.artifact_kind !== 'diagnostic'
      || auditArtifact.checksum !== artifact.runtime_audit_hash
      || auditArtifact.workflow_run_id !== input.workflow_run_id
    ) {
      return this.n7RuntimeAuditDrift('N7 runtime support audit artifact is missing or checksum-drifted.');
    }
    const auditPayload = auditArtifact.payload;
    if (!this.isRecord(auditPayload) || !this.isRecord(auditPayload.provenance)) {
      return this.n7RuntimeAuditDrift('N7 runtime support audit payload is not a valid invocation audit snapshot.');
    }
    const provenance = auditPayload.provenance;
    const expectedSourceKind = artifact.execution_mode === 'mocked_llm' ? 'mock_fixture' : 'codex_response';
    if (
      auditPayload.node_id !== input.node_id
      || auditPayload.workflow_run_id !== input.workflow_run_id
      || auditPayload.node_attempt_id !== input.node_attempt_id
      || auditPayload.status !== 'succeeded'
      || provenance.workflow_run_id !== input.workflow_run_id
      || provenance.node_id !== input.node_id
      || provenance.node_attempt_id !== input.node_attempt_id
      || provenance.execution_mode !== artifact.execution_mode
      || provenance.source_kind !== expectedSourceKind
      || provenance.non_provider !== true
      || provenance.run_mode !== artifact.run_mode
      || provenance.profile_id !== artifact.profile_id
      || provenance.model_option_id !== artifact.model_option_id
      || provenance.output_contract !== artifact.output_contract
      || provenance.prompt_packet_hash !== artifact.prompt_packet_hash
      || provenance.structured_output_hash !== artifact.structured_output_hash
      || provenance.cache_status !== 'not_applicable'
      || provenance.response_reuse_ref !== null
      || provenance.telemetry !== null
    ) {
      return this.n7RuntimeAuditDrift('N7 runtime support audit provenance does not match the support artifact identity.');
    }
    return { ok: true };
  }

  private n7RuntimeAuditDrift(message: string): { ok: false; code: string; message: string } {
    return {
      ok: false,
      code: 'N7_SUPPORT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
      message,
    };
  }

  private isN7CandidateGroupingSupportPayload(value: unknown): value is TopicSelectionV1bCandidateGroupingSupportPayload {
    if (!this.isRecord(value) || !this.hasOnlyKeys(value, [
      'candidate_relationships',
      'duplicate_or_overlap_groups',
      'grouping_summary',
      'priority_order',
      'selected_candidate_hash',
      'selected_candidate_ref',
    ])) {
      return false;
    }
    const groups = value.duplicate_or_overlap_groups;
    return this.isFunctionalRefValue(value.selected_candidate_ref)
      && this.isHash(value.selected_candidate_hash)
      && this.isFunctionalRefArray(value.priority_order)
      && (value.priority_order as unknown[]).length > 0
      && Array.isArray(groups)
      && groups.every((group) => this.isRecord(group)
        && this.hasOnlyKeys(group, ['group_key', 'candidate_refs', 'canonical_candidate_ref', 'rationale'])
        && typeof group.group_key === 'string'
        && this.isFunctionalRefArray(group.candidate_refs)
        && this.isFunctionalRefValue(group.canonical_candidate_ref)
        && typeof group.rationale === 'string')
      && this.isRecord(value.candidate_relationships)
      && typeof value.grouping_summary === 'string';
  }

  private isN7DebateAdmissionSupportPayload(value: unknown): value is TopicSelectionV1bN8DebateAdmissionReviewSupportPayload {
    return this.isRecord(value)
      && this.hasOnlyKeys(value, [
        'debate_level',
        'high_value_signal_codes',
        'rationale',
        'recommended_profile_id',
        'risk_signal_codes',
      ])
      && ['compact_assessment_debate', 'provider_diverse_deep_debate'].includes(value.debate_level as string)
      && typeof value.recommended_profile_id === 'string'
      && this.isStringArray(value.high_value_signal_codes)
      && this.isStringArray(value.risk_signal_codes)
      && typeof value.rationale === 'string';
  }

  private isN7FailedTrialSynthesisSupportPayload(value: unknown): value is TopicSelectionV1bN8FailedTrialSynthesisSupportPayload {
    return this.isRecord(value)
      && this.hasOnlyKeys(value, [
        'affected_refs',
        'exhausted_candidate_refs',
        'failure_reason_codes',
        'n6_regeneration_hints',
        'synthesis_summary',
      ])
      && this.isFunctionalRefArray(value.exhausted_candidate_refs)
      && (value.exhausted_candidate_refs as unknown[]).length > 0
      && this.isStringArray(value.failure_reason_codes)
      && typeof value.synthesis_summary === 'string'
      && this.isStringArray(value.n6_regeneration_hints)
      && this.isFunctionalRefArray(value.affected_refs)
      && (value.affected_refs as unknown[]).length > 0;
  }

  private n7LineageBlocker(
    payload: TopicSelectionV1bN7HarnessFrozenInputPayload,
    loaded: N7LoadedContext,
  ): { code: string; message: string } | null {
    const handoffPayload = loaded.n6Handoff.payload as TopicSelectionV1bN6ToN7HandoffPayload;
    if (!this.n7PayloadMatchesN6Handoff(payload, handoffPayload)) {
      return {
        code: 'N7_N6_HANDOFF_PAYLOAD_MISMATCH',
        message: 'N7 frozen payload does not match the persisted N6-to-N7 handoff artifact.',
      };
    }
    if (!this.refsEqual(payload.topic_question_candidate_set_ref, this.ref(
      'topic_question_candidate_set',
      loaded.candidateSet.topic_question_candidate_set_id,
      loaded.candidateSet.title_card_id,
    ))) {
      return {
        code: 'N7_CANDIDATE_SET_REF_MISMATCH',
        message: 'N7 frozen candidate-set ref does not match the loaded candidate set.',
      };
    }
    const candidateHashByRef = new Map(loaded.candidates.map((candidate) => [
      this.refKey(this.ref('topic_question_candidate', candidate.topic_question_candidate_id, candidate.title_card_id)),
      this.hashN6CandidateAuthority(candidate),
    ]));
    for (const [index, candidateRef] of payload.admissible_candidate_refs.entries()) {
      const frozenHash = payload.admissible_candidate_hashes[index];
      const currentHash = candidateHashByRef.get(this.refKey(candidateRef));
      if (!currentHash) {
        return {
          code: 'N7_ADMISSIBLE_CANDIDATE_NOT_FOUND',
          message: 'N7 admissible candidate ref does not resolve under the frozen candidate set.',
        };
      }
      if (payload.input_mode === 'initial_from_n6' && currentHash !== frozenHash) {
        return {
          code: 'N7_ADMISSIBLE_CANDIDATE_HASH_MISMATCH',
          message: 'N7 admissible candidate hash does not match the current persisted candidate.',
        };
      }
    }
    const feedback = loaded.feedback;
    if (feedback) {
      if (!this.refsEqual(feedback.topic_question_candidate_set_ref, payload.topic_question_candidate_set_ref)
        || feedback.topic_question_candidate_set_hash !== payload.topic_question_candidate_set_hash) {
        return {
          code: 'N7_FEEDBACK_CANDIDATE_SET_MISMATCH',
          message: 'N8 feedback does not target the frozen N7 candidate set.',
        };
      }
      if (!payload.admissible_candidate_refs.some((candidateRef) =>
        this.refsEqual(candidateRef, feedback.failed_candidate_ref))) {
        return {
          code: 'N7_FEEDBACK_FAILED_CANDIDATE_NOT_IN_FROZEN_SET',
          message: 'N8 feedback failed_candidate_ref is not in the frozen admissible candidate set.',
        };
      }
    }
    return null;
  }

  private n7PayloadMatchesN6Handoff(
    payload: TopicSelectionV1bN7HarnessFrozenInputPayload,
    handoffPayload: TopicSelectionV1bN6ToN7HandoffPayload,
  ): boolean {
    return payload.topic_question_candidate_set_hash === handoffPayload.topic_question_candidate_set_hash
      && payload.selected_research_slice_hash === handoffPayload.selected_research_slice_hash
      && payload.generation_artifact_hash === handoffPayload.generation_artifact_hash
      && payload.candidate_gate_hash === handoffPayload.candidate_gate_hash
      && payload.candidate_grouping_hash === handoffPayload.candidate_grouping_hash
      && this.refsEqual(payload.topic_question_candidate_set_ref, handoffPayload.topic_question_candidate_set_ref)
      && this.refsEqual(payload.selected_research_slice_ref, handoffPayload.selected_research_slice_ref)
      && this.refsEqual(payload.generation_artifact_ref, handoffPayload.generation_artifact_ref)
      && this.nullableRefsEqual(payload.candidate_grouping_ref, handoffPayload.candidate_grouping_ref)
      && this.refArraysEqual(payload.admissible_candidate_refs, handoffPayload.admissible_candidate_refs)
      && this.stringArraysEqual(payload.admissible_candidate_hashes, handoffPayload.admissible_candidate_hashes);
  }

  private chooseN7Candidate(
    payload: TopicSelectionV1bN7HarnessFrozenInputPayload,
    loaded: N7LoadedContext,
    support: N7SupportContext,
  ): { ok: true; value: N7CandidateChoice } | {
    ok: false;
    code: string;
    message: string;
    failedCandidateIds: string[];
  } {
    const admissibleById = new Map(payload.admissible_candidate_refs.map((candidateRef, index) => [
      candidateRef.ref_id,
      {
        hash: payload.admissible_candidate_hashes[index]!,
        ref: candidateRef,
      },
    ]));
    const failedCandidateIds = loaded.feedback
      ? uniqueStrings([
        loaded.feedback.failed_candidate_ref.ref_id,
        ...this.n7FailedCandidateIdsFromCurrentState(loaded.candidates),
      ])
      : [];
    const failedSet = new Set(failedCandidateIds);
    const candidatesById = new Map(loaded.candidates.map((candidate) => [candidate.topic_question_candidate_id, candidate]));
    if (support.grouping) {
      const groupingDuplicate = this.firstDuplicate(
        support.grouping.payload.priority_order.map((candidateRef) => candidateRef.ref_id),
      );
      if (groupingDuplicate) {
        return {
          ok: false,
          code: 'N7_DUPLICATE_PRIORITY_CANDIDATE',
          failedCandidateIds,
          message: `N7 candidate grouping support repeats candidate ${groupingDuplicate}.`,
        };
      }
    }
    const priorityOrder = this.n7PriorityOrder(payload, loaded, support);
    const duplicate = this.firstDuplicate(priorityOrder);
    if (duplicate) {
      return {
        ok: false,
        code: 'N7_DUPLICATE_PRIORITY_CANDIDATE',
        failedCandidateIds,
        message: `N7 candidate priority order contains duplicate candidate ${duplicate}.`,
      };
    }
    if (support.grouping) {
      const unknownSelected = !admissibleById.has(support.grouping.payload.selected_candidate_ref.ref_id);
      const unknownPriority = support.grouping.payload.priority_order
        .find((candidateRef) => !admissibleById.has(candidateRef.ref_id));
      if (unknownSelected || unknownPriority) {
        return {
          ok: false,
          code: 'N7_GROUPING_UNKNOWN_CANDIDATE_REF',
          failedCandidateIds,
          message: 'N7 candidate grouping support references a candidate outside the frozen admissible set.',
        };
      }
    }
    for (const candidateId of priorityOrder) {
      const candidate = candidatesById.get(candidateId);
      const frozen = admissibleById.get(candidateId);
      if (!candidate || !frozen || failedSet.has(candidateId)) {
        continue;
      }
      if (support.grouping && support.grouping.payload.selected_candidate_ref.ref_id === candidateId
        && support.grouping.payload.selected_candidate_hash !== frozen.hash) {
        return {
          ok: false,
          code: 'N7_GROUPING_SELECTED_CANDIDATE_HASH_MISMATCH',
          failedCandidateIds,
          message: 'N7 grouping support selected_candidate_hash does not match frozen candidate hash.',
        };
      }
      if (candidate.status === 'blocked' || candidate.status === 'rejected' || candidate.status === 'parked') {
        continue;
      }
      return {
        ok: true,
        value: {
          candidate,
          candidateHash: frozen.hash,
          failedCandidateIds,
          priorityOrder,
          routeNote: loaded.feedback ? 'feedback_selected_next_candidate' : 'initial_candidate_selected',
        },
      };
    }
    return {
      ok: false,
      code: 'N7_CANDIDATE_TRIALS_EXHAUSTED',
      failedCandidateIds,
      message: 'N7 found no remaining admissible candidate after applying frozen feedback and priority order.',
    };
  }

  private n7PriorityOrder(
    payload: TopicSelectionV1bN7HarnessFrozenInputPayload,
    loaded: N7LoadedContext,
    support: N7SupportContext,
  ): string[] {
    if (support.grouping) {
      const groupingIds = support.grouping.payload.priority_order.map((candidateRef) => candidateRef.ref_id);
      const selectedId = support.grouping.payload.selected_candidate_ref.ref_id;
      return uniqueStrings([selectedId, ...groupingIds, ...payload.admissible_candidate_refs.map((ref) => ref.ref_id)]);
    }
    const recommendedIds = loaded.candidateSet.recommended_candidate_ids
      .filter((candidateId) => payload.admissible_candidate_refs.some((candidateRef) => candidateRef.ref_id === candidateId));
    return uniqueStrings([
      ...recommendedIds,
      ...payload.admissible_candidate_refs.map((candidateRef) => candidateRef.ref_id),
    ]);
  }

  private n7FailedCandidateIdsFromCurrentState(
    candidates: TopicSelectionTopicQuestionCandidateRecord[],
  ): string[] {
    return candidates
      .filter((candidate) => candidate.status === 'rejected')
      .map((candidate) => candidate.topic_question_candidate_id);
  }

  private async runN7CandidateTrialsExhausted(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
    payload: TopicSelectionV1bN7HarnessFrozenInputPayload,
    loaded: N7LoadedContext,
    support: N7SupportContext,
    choice: { ok: false; code: string; message: string; failedCandidateIds: string[] },
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    if (!support.failedTrialSynthesis) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N7_REQUIRED_SUPPORT_ARTIFACT_MISSING',
        message: 'N7 requires frozen failed-trial synthesis support before looping back to N6.',
      });
    }
    const synthesis = support.failedTrialSynthesis;
    const exhaustedRefs = synthesis.payload.exhausted_candidate_refs.map((candidateRef) => candidateRef.ref_id);
    const missingFailedCoverage = choice.failedCandidateIds.filter((candidateId) => !exhaustedRefs.includes(candidateId));
    if (missingFailedCoverage.length > 0) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N7_FAILED_TRIAL_SYNTHESIS_INCOMPLETE',
        message: 'N7 failed-trial synthesis does not cover all failed candidate trials.',
      });
    }
    const admissibleRefKeys = new Set(payload.admissible_candidate_refs.map((candidateRef) => this.refKey(candidateRef)));
    const unknownExhaustedRef = synthesis.payload.exhausted_candidate_refs
      .find((candidateRef) => !admissibleRefKeys.has(this.refKey(candidateRef)));
    const knownAffectedRefKeys = new Set(uniqueRefs([
      ...input.frozen_input.source_refs,
      payload.topic_question_candidate_set_ref,
      ...payload.admissible_candidate_refs,
      payload.selected_research_slice_ref,
      payload.generation_artifact_ref,
      payload.candidate_grouping_ref,
      payload.input_mode === 'feedback_from_n8' ? payload.n8_feedback_ref : null,
    ]).map((ref) => this.refKey(ref)));
    const unknownAffectedRef = synthesis.payload.affected_refs
      .find((affectedRef) => !knownAffectedRefKeys.has(this.refKey(affectedRef)));
    if (unknownExhaustedRef || unknownAffectedRef) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N7_FAILED_TRIAL_SYNTHESIS_UNKNOWN_REF',
        message: 'N7 failed-trial synthesis references context outside the frozen N7/N8 handoff boundary.',
      });
    }
    const candidateSetRef = this.ref(
      'topic_question_candidate_set',
      loaded.candidateSet.topic_question_candidate_set_id,
      loaded.candidateSet.title_card_id,
    );
    const decisionId = this.idFactory('topic_question_selection_decision');
    const decisionRef = this.ref('topic_question_selection_decision', decisionId, loaded.candidateSet.title_card_id);
    const trialLedgerHash = this.hash({
      candidate_set_hash: payload.topic_question_candidate_set_hash,
      decision: 'no_admissible_candidate',
      failed_candidate_ids: choice.failedCandidateIds,
      n6_handoff_hash: payload.n6_handoff_hash,
      n8_feedback_hash: payload.input_mode === 'feedback_from_n8' ? payload.n8_feedback_hash : null,
      synthesis_hash: synthesis.payloadHash,
    });
    const blocker = this.blocker(choice.code, choice.message, [
      candidateSetRef,
      ...payload.admissible_candidate_refs,
      synthesis.artifact.normalized_output_ref!,
    ]);
    return this.persistAdmittedResult(input, hashContext, {
      additionalAuthorityRefs: [],
      authorityHash: trialLedgerHash,
      authorityRef: decisionRef,
      blockers: [blocker],
      errorCode: choice.code,
      errorMessage: choice.message,
      failureClass: 'semantic_non_pass',
      gateStatus: 'blocked',
      handoff: null,
      handoffHash: null,
      routeDecision: 'loopback',
      sourceRef: candidateSetRef,
      targetRef: decisionRef,
      tracePhase: 'T-107 N7 candidate trial exhaustion',
      tracePayload: {
        failed_candidate_ids: choice.failedCandidateIds,
        loopback_target_code: 'n7_loopback_to_n6',
        synthesis_hash: synthesis.payloadHash,
        trial_ledger_hash: trialLedgerHash,
      },
      runtimeContextProjection: {
        build: () => this.buildN7ToN6FailedTrialLoopbackContextProjection({
          request: input,
          frozenPayload: payload,
          candidateSetRef,
          support,
          choice,
        }),
      },
      transitionKey: 'topic-selection.v1b.harness.n7-topic-question-contract-loopback',
      warnings: [
        this.warning(
          'N7_FAILED_TRIAL_SYNTHESIS_CARRIED_TO_N6',
          'N7 preserved failed-candidate synthesis for N6 regeneration.',
          [synthesis.artifact.normalized_output_ref!],
        ),
      ],
    }, {
      writeAuthority: async (prepared) => {
        const now = this.now();
        const decision: TopicSelectionTopicQuestionSelectionDecisionRecord = {
          topic_question_selection_decision_id: decisionId,
          workspace_id: loaded.candidateSet.workspace_id ?? null,
          title_card_id: loaded.candidateSet.title_card_id,
          candidate_set_id: loaded.candidateSet.topic_question_candidate_set_id,
          form_topic_question_run_id: loaded.candidateSet.form_topic_question_run_id,
          research_slice_id: loaded.candidateSet.research_slice_id,
          research_slice_version: loaded.candidateSet.research_slice_version,
          input_snapshot_ref: this.ref('input_snapshot', prepared.inputSnapshot.input_snapshot_id, loaded.candidateSet.title_card_id),
          decision: 'no_admissible_candidate',
          decided_by: input.created_by ?? 'system',
          selection_policy_version: input.policy_version,
          admitted_candidate_ids: [],
          created_topic_question_ids: [],
          merged_candidate_groups: [],
          hard_gate_results: this.n7HardGateResults(loaded.candidates),
          admission_review: {
            failed_trial_synthesis_hash: synthesis.payloadHash,
            input_mode: payload.input_mode,
            loopback_target_code: 'n7_loopback_to_n6',
          },
          candidate_relationships: {},
          priority_order: this.n7PriorityOrder(payload, loaded, support),
          rejected_candidate_reasons: choice.failedCandidateIds.map((candidateId) => ({
            candidate_id: candidateId,
            reason: 'N8 feedback rejected this candidate trial.',
          })),
          blocking_contexts: [{
            failure_reason_codes: synthesis.payload.failure_reason_codes,
            synthesis_summary: synthesis.payload.synthesis_summary,
          }],
          decision_rationale: synthesis.payload.synthesis_summary,
          requires_human_review: false,
          human_review_triggers: [],
          accepted_risk_refs: loaded.run.accepted_risk_refs,
          confidence: null,
          input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
          workflow_run_id: input.workflow_run_id,
          gate_result_id: prepared.gate.readiness_gate_result_id,
          transition_attempt_id: null,
          artifact_refs: uniqueRefs([
            prepared.handoffRef,
            synthesis.artifact.normalized_output_ref,
          ]),
          created_at: now,
        };
        await this.runnerDependencies.topicQuestionRepository!.createSelectionDecisionWithMaterializations({
          decision,
          candidate_set_patch: {
            status: 'no_admissible_candidate',
            updated_at: now,
          },
          candidate_status_patches: choice.failedCandidateIds.map((candidateId) => ({
            candidate_id: candidateId,
            status: 'rejected' as const,
          })),
          materializations: [],
        });
      },
    });
  }

  private async runN7GateReadmission(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
    payload: TopicSelectionV1bN7HarnessFrozenInputPayload,
    loaded: N7LoadedContext,
    support: N7SupportContext,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    const feedback = loaded.feedback!;
    const repository = this.runnerDependencies.topicQuestionRepository!;
    const [contract, decision, previousHandoffArtifact] = await Promise.all([
      repository.findTopicQuestionContractById(feedback.failed_topic_question_contract_ref.ref_id),
      repository.findSelectionDecisionById(feedback.previous_trial_ledger_ref.ref_id),
      this.controlPlane.getArtifactRef(feedback.previous_n7_handoff_ref.ref_id),
    ]);
    const previousHandoff = previousHandoffArtifact?.payload as TopicSelectionV1bWorkflowHarnessHandoff | null;
    if (!contract || !decision || !previousHandoff || this.hash(previousHandoff) !== feedback.previous_n7_handoff_hash) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N7_GATE_READMISSION_CONTEXT_MISSING',
        message: 'N7 gate-rejected feedback references missing previous contract, ledger, or handoff context.',
      });
    }
    const question = await repository.findTopicQuestionById(contract.topic_question_id);
    const answerabilityPlan = await repository.findAnswerabilityPlanByContractId(contract.topic_question_contract_id);
    if (!question || !answerabilityPlan) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N7_GATE_READMISSION_MATERIALIZATION_MISSING',
        message: 'N7 cannot re-emit N8 handoff because previous contract materialization is incomplete.',
      });
    }
    const candidate = loaded.candidates.find((item) => item.topic_question_candidate_id === feedback.failed_candidate_ref.ref_id);
    if (!candidate) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N7_GATE_READMISSION_CANDIDATE_MISSING',
        message: 'N7 gate-rejected feedback failed candidate does not resolve.',
      });
    }
    const candidateHash = payload.admissible_candidate_hashes[
      payload.admissible_candidate_refs.findIndex((candidateRef) => candidateRef.ref_id === candidate.topic_question_candidate_id)
    ] ?? feedback.failed_candidate_hash;
    const choice: N7CandidateChoice = {
      candidate,
      candidateHash,
      failedCandidateIds: [],
      priorityOrder: this.n7PriorityOrder(payload, loaded, support),
      routeNote: 'gate_rejected_reemit_same_contract_with_updated_debate_admission',
    };
    const debateAdmission = await this.recordN7DebateAdmissionArtifact(input, payload, choice, support);
    const questionRef = this.ref('topic_question', question.topic_question_id, question.title_card_id);
    const contractRef = this.ref('topic_question_contract', contract.topic_question_contract_id, contract.title_card_id, contract.version);
    const answerabilityPlanRef = this.ref(
      'topic_question_answerability_plan',
      answerabilityPlan.topic_question_answerability_plan_id,
      answerabilityPlan.title_card_id,
    );
    const decisionRef = this.ref('topic_question_selection_decision', decision.topic_question_selection_decision_id, decision.title_card_id);
    const candidateSetRef = this.ref('topic_question_candidate_set', loaded.candidateSet.topic_question_candidate_set_id, loaded.candidateSet.title_card_id);
    const contractHash = this.hashN7ContractAuthority(contract);
    const warnings = this.n7Warnings(choice, support);
    const gateResultHash = this.outcomeGateResultHash(input, hashContext, {
      authorityHash: contractHash,
      blockerCodes: [],
      gateStatus: 'admitted_with_warnings',
      routeDecision: 'invoke_next',
      warningCodes: warnings.map((warning) => warning.code),
    });
    const handoffPayload: TopicSelectionV1bWorkflowHarnessHandoffPayload = {
      topic_question_ref: questionRef,
      topic_question_hash: this.hashN7TopicQuestionAuthority(question),
      topic_question_contract_ref: contractRef,
      topic_question_contract_hash: contractHash,
      answerability_plan_ref: answerabilityPlanRef,
      answerability_plan_hash: this.hashN7AnswerabilityPlanAuthority(answerabilityPlan),
      trial_ledger_ref: decisionRef,
      trial_ledger_hash: feedback.previous_trial_ledger_hash,
      topic_question_candidate_set_ref: candidateSetRef,
      topic_question_candidate_set_hash: payload.topic_question_candidate_set_hash,
      active_candidate_ref: feedback.failed_candidate_ref,
      active_candidate_hash: candidateHash,
      selected_research_slice_ref: payload.selected_research_slice_ref,
      selected_research_slice_hash: payload.selected_research_slice_hash,
      n8_debate_admission_ref: debateAdmission.ref,
      n8_debate_admission_hash: debateAdmission.hash,
      candidate_grouping_ref: support.grouping?.artifact.normalized_output_ref ?? null,
      candidate_grouping_hash: support.grouping?.payloadHash ?? null,
    };
    const handoff = this.buildHandoff(input, {
      handoffKind: 'N7ToN8Handoff',
      payload: handoffPayload,
      requiredRefs: [
        candidateSetRef,
        feedback.failed_candidate_ref,
        questionRef,
        contractRef,
        answerabilityPlanRef,
        decisionRef,
        debateAdmission.ref,
      ],
      residualRiskRefs: loaded.run.accepted_risk_refs,
      sourceAuthorityHash: contractHash,
      sourceAuthorityRef: contractRef,
      sourceGateResultHash: gateResultHash,
      upstreamLineageHash: this.hash({
        n8_feedback_hash: payload.input_mode === 'feedback_from_n8' ? payload.n8_feedback_hash : null,
        previous_n7_handoff_hash: feedback.previous_n7_handoff_hash,
        readmission: true,
      }),
      warningCodes: warnings.map((warning) => warning.code),
    });
    const handoffHash = this.hash(handoff);
    return this.persistAdmittedResult(input, hashContext, {
      additionalAuthorityRefs: [decisionRef, questionRef, answerabilityPlanRef],
      authorityHash: contractHash,
      authorityRef: contractRef,
      blockers: [],
      failureClass: null,
      gateStatus: 'admitted_with_warnings',
      handoff,
      handoffHash,
      routeDecision: 'invoke_next',
      sourceRef: candidateSetRef,
      targetRef: contractRef,
      tracePhase: 'T-107 N7 N8 gate readmission',
      tracePayload: {
        debate_admission_hash: debateAdmission.hash,
        feedback_hash: payload.input_mode === 'feedback_from_n8' ? payload.n8_feedback_hash : null,
        previous_n7_handoff_hash: feedback.previous_n7_handoff_hash,
      },
      runtimeContextProjection: {
        build: ({ handoffRef }) => {
          if (!handoffRef) {
            throw new AppError(500, 'INTERNAL_ERROR', 'N7-to-N8 projection requires a persisted N7 handoff ref.');
          }
          return this.buildN7ToN8TopicQuestionContractContextProjection({
            request: input,
            frozenPayload: payload,
            handoffPayload: handoffPayload as TopicSelectionV1bN7ToN8HandoffPayload,
            handoffRef,
            handoffHash,
            support,
          });
        },
      },
      transitionKey: 'topic-selection.v1b.harness.n7-topic-question-contract-readmission',
      warnings,
    }, {
      writeAuthority: async () => {},
    });
  }

  private async runN8AssessTopicValue(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    const dependencyBlocker = this.runnerDependencyBlocker(input.node_id);
    if (dependencyBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: dependencyBlocker.code,
        message: dependencyBlocker.message,
      });
    }
    const payload = this.parseN8Payload(input.frozen_input.payload);
    if (!payload.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: payload.code,
        message: payload.message,
      });
    }
    const loaded = await this.loadN8Context(input, payload.value);
    if (!loaded.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: loaded.code,
        message: loaded.message,
      });
    }
    const lineageBlocker = this.n8LineageBlocker(payload.value, loaded.value);
    if (lineageBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: lineageBlocker.code,
        message: lineageBlocker.message,
      });
    }
    const draftResolution = await this.resolveN8DraftPayload(input, payload.value);
    if (!draftResolution.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: draftResolution.code,
        message: draftResolution.message,
      });
    }
    const draftBlocker = this.n8DraftGateBlocker(draftResolution.value, loaded.value);
    if (draftBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: draftBlocker.code,
        message: draftBlocker.message,
      });
    }
    // T-123 Phase 3 (D2/DP-3.2): deterministic debate triggers. The harness does trigger
    // DETECTION + the N6-isomorphic loopback gate; the bounded-debate EXECUTION (the 4-role
    // re-assessment that produces a better draft) is caller-side (the v1b N8 debate runtime),
    // exactly as v1c N2 runs its debate caller-side before its gate. On a first pass that hits
    // T1/T3 we loop back to N7 for debate admission; on any non-first-pass the trigger is
    // downgraded to a warning (DP-3.2 anti-oscillation).
    const debateAdmission = await this.resolveN8DebateAdmission(payload.value);
    if (!debateAdmission.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: debateAdmission.code,
        message: debateAdmission.message,
      });
    }
    const debateThresholds = this.getNodePolicy('topic-selection.v1b.assess-topic-value.v1').debate_trigger_thresholds ?? null;
    const debateTriggers = computeTopicSelectionV1bN8DebateTriggers(draftResolution.value.draft, debateThresholds);
    // Anti-loop: only the EXPLICIT first-pass marker arms the loopback. A missing/unknown
    // input_mode (stale/older-schema/hand-built admission) falls through to warnings, never
    // re-arming an N8<->N7 oscillation. The intended feedback re-entry carries 'feedback_from_n8'.
    const firstPass = debateAdmission.value.input_mode === 'initial_from_n6';
    if (debateTriggers.length > 0 && firstPass) {
      return this.persistN8DebateLoopback(input, hashContext, payload.value, draftResolution.value, debateTriggers);
    }
    const postDebateTriggerWarnings = firstPass ? [] : debateTriggers;
    // DP-3.3 tripwire: provisional, un-calibrated thresholds must not silently govern a product run.
    const provisionalThresholdsInProduct = Boolean(debateThresholds?.provisional) && input.run_mode === 'product';

    const now = this.now();
    const runId = this.idFactory('assess_topic_value_run');
    const snapshotId = this.idFactory('topic_value_input_snapshot');
    const assessmentId = this.idFactory('topic_value_assessment');
    const memoId = this.idFactory('value_reasoning_memo');
    const titleCardId = loaded.value.contract.title_card_id;
    const questionRef = this.ref('topic_question', loaded.value.question.topic_question_id, titleCardId);
    const contractRef = this.ref(
      'topic_question_contract',
      loaded.value.contract.topic_question_contract_id,
      titleCardId,
      loaded.value.contract.version,
    );
    const answerabilityPlanRef = this.ref(
      'topic_question_answerability_plan',
      loaded.value.answerabilityPlan.topic_question_answerability_plan_id,
      titleCardId,
    );
    const researchSliceRef = this.ref(
      'research_slice',
      loaded.value.researchSlice.research_slice_id,
      titleCardId,
      loaded.value.researchSlice.slice_version,
    );
    const selectionDecisionRef = this.ref(
      'topic_question_selection_decision',
      loaded.value.selectionDecision.topic_question_selection_decision_id,
      titleCardId,
    );
    const assessmentRef = this.ref('topic_value_assessment', assessmentId, titleCardId);
    const memoRef = this.ref('value_reasoning_memo', memoId, titleCardId);
    const artifactRefs = uniqueRefs([
      ...draftResolution.value.artifactRefs,
      payload.value.n8_debate_admission_ref,
      payload.value.candidate_grouping_ref,
    ]);
    const snapshot: TopicSelectionTopicValueAssessmentInputSnapshotRecord = {
      topic_value_input_snapshot_id: snapshotId,
      workspace_id: loaded.value.contract.workspace_id ?? null,
      title_card_id: titleCardId,
      topic_question_contract_id: loaded.value.contract.topic_question_contract_id,
      topic_question_id: loaded.value.question.topic_question_id,
      research_slice_id: loaded.value.researchSlice.research_slice_id,
      research_slice_version: loaded.value.researchSlice.slice_version,
      topic_question_ref: questionRef,
      topic_question_contract_ref: contractRef,
      answerability_plan_ref: answerabilityPlanRef,
      research_slice_ref: researchSliceRef,
      validated_need_refs: loaded.value.needRefs.map((record) => record.validated_need_ref),
      evidence_refs: loaded.value.evidenceRefs,
      need_refs: loaded.value.needRefs,
      boundary_refs: loaded.value.boundaryRefs,
      assumption_refs: loaded.value.assumptionRefs,
      falsification_conditions: loaded.value.falsificationConditions,
      accepted_risk_refs: loaded.value.contract.accepted_risk_refs,
      memory_suggestion_refs: loaded.value.researchSlice.memory_suggestion_refs,
      recheck_request_refs: loaded.value.researchSlice.recheck_request_refs,
      question_contract: loaded.value.contract,
      answerability_plan: loaded.value.answerabilityPlan,
      research_slice_snapshot: this.n8ResearchSliceSnapshot(loaded.value.researchSlice),
      snapshot_hash: this.hash({
        answerability_plan_hash: payload.value.answerability_plan_hash,
        contract_hash: payload.value.topic_question_contract_hash,
        evidence_ref_count: loaded.value.evidenceRefs.length,
        n7_handoff_hash: payload.value.n7_handoff_hash,
        research_slice_hash: payload.value.selected_research_slice_hash,
      }),
      control_plane_input_snapshot_id: null,
      created_at: now,
    };
    const memo: TopicSelectionValueReasoningMemoRecord = {
      ...draftResolution.value.draft.reasoning_memo,
      value_reasoning_memo_id: memoId,
      workspace_id: loaded.value.contract.workspace_id ?? null,
      title_card_id: titleCardId,
      topic_value_assessment_id: assessmentId,
      topic_question_contract_id: loaded.value.contract.topic_question_contract_id,
      created_by_workflow_run_id: input.workflow_run_id,
      artifact_refs: artifactRefs,
      created_at: now,
    };
    const assessment: TopicSelectionTopicValueAssessmentRecord = {
      topic_value_assessment_id: assessmentId,
      workspace_id: loaded.value.contract.workspace_id ?? null,
      title_card_id: titleCardId,
      topic_question_id: loaded.value.question.topic_question_id,
      topic_question_contract_id: loaded.value.contract.topic_question_contract_id,
      research_record_id: this.idFactory('topic_value_research_record'),
      source_research_slice_id: loaded.value.researchSlice.research_slice_id,
      source_research_slice_version: loaded.value.researchSlice.slice_version,
      assess_topic_value_run_id: runId,
      topic_value_input_snapshot_id: snapshotId,
      value_reasoning_memo_id: memoId,
      active_disposition_decision_id: null,
      readiness_status: draftResolution.value.draft.readiness_status,
      freshness_status: 'current',
      strongest_claim_if_success: draftResolution.value.draft.strongest_claim_if_success,
      fallback_claim_if_success: draftResolution.value.draft.fallback_claim_if_success ?? null,
      hard_gates: draftResolution.value.draft.hard_gates,
      dimension_scores: draftResolution.value.draft.dimension_scores,
      risk_penalty: draftResolution.value.draft.risk_penalty,
      reviewer_objections: draftResolution.value.draft.reviewer_objections,
      ceiling_case: draftResolution.value.draft.ceiling_case,
      base_case: draftResolution.value.draft.base_case,
      floor_case: draftResolution.value.draft.floor_case,
      legacy_verdict: this.legacyValueVerdict(draftResolution.value.draft.recommended_disposition),
      total_score: draftResolution.value.draft.total_score,
      value_summary: draftResolution.value.draft.value_summary,
      confidence: draftResolution.value.draft.confidence,
      accepted_risk_refs: draftResolution.value.draft.accepted_risk_refs,
      blocker_refs: draftResolution.value.draft.blocker_refs,
      risk_notes: draftResolution.value.draft.risk_notes,
      trace_snapshot_id: null,
      workflow_run_id: input.workflow_run_id,
      gate_result_id: null,
      transition_attempt_id: null,
      artifact_refs: artifactRefs,
      created_at: now,
      updated_at: now,
    };
    const assessmentHash = this.hashN8ValueAssessmentAuthority(assessment);
    const warnings = this.n8Warnings(
      draftResolution.value.draft,
      loaded.value,
      postDebateTriggerWarnings,
      provisionalThresholdsInProduct,
    );
    const gateStatus: TopicSelectionV1bWorkflowHarnessGateStatus =
      warnings.length > 0
        ? 'admitted_with_warnings'
        : 'admitted';
    const gateResultHash = this.outcomeGateResultHash(input, hashContext, {
      authorityHash: assessmentHash,
      blockerCodes: [],
      gateStatus,
      routeDecision: 'invoke_next',
      warningCodes: warnings.map((warning) => warning.code),
    });
    const handoffPayload: TopicSelectionV1bWorkflowHarnessHandoffPayload = {
      topic_value_assessment_ref: assessmentRef,
      topic_value_assessment_hash: assessmentHash,
      topic_question_contract_ref: contractRef,
      topic_question_contract_hash: payload.value.topic_question_contract_hash,
      value_reasoning_memo_ref: memoRef,
      value_reasoning_memo_hash: this.hashN8ValueReasoningMemoAuthority(memo),
      recommended_disposition: draftResolution.value.draft.recommended_disposition,
    };
    const handoff = this.buildHandoff(input, {
      handoffKind: 'N8ToN9Handoff',
      payload: handoffPayload,
      requiredRefs: [assessmentRef, contractRef],
      residualRiskRefs: assessment.accepted_risk_refs,
      sourceAuthorityHash: assessmentHash,
      sourceAuthorityRef: assessmentRef,
      sourceGateResultHash: gateResultHash,
      upstreamLineageHash: this.hash({
        draft_hash: draftResolution.value.draftHash,
        n7_handoff_hash: payload.value.n7_handoff_hash,
        topic_question_contract_hash: payload.value.topic_question_contract_hash,
      }),
      warningCodes: warnings.map((warning) => warning.code),
    });
    const handoffHash = this.hash(handoff);
    return this.persistAdmittedResult(input, hashContext, {
      acceptedRiskRefs: assessment.accepted_risk_refs,
      additionalAuthorityRefs: [
        this.ref('assess_topic_value_run', runId, titleCardId),
        this.ref('topic_value_input_snapshot', snapshotId, titleCardId),
        memoRef,
      ],
      authorityHash: assessmentHash,
      authorityRef: assessmentRef,
      blockers: [],
      failureClass: null,
      gateStatus,
      handoff,
      handoffHash,
      routeDecision: 'invoke_next',
      sourceRef: contractRef,
      targetRef: assessmentRef,
      tracePhase: 'T-107 v1b N8 topic value assessment runner',
      tracePayload: {
        draft_hash: draftResolution.value.draftHash,
        recommended_disposition: draftResolution.value.draft.recommended_disposition,
        topic_value_assessment_hash: assessmentHash,
        value_reasoning_memo_hash: this.hashN8ValueReasoningMemoAuthority(memo),
      },
      transitionKey: 'topic-selection.v1b.harness.n8-topic-value-assessment',
      warnings,
    }, {
      writeAuthority: async (prepared) => {
        const persistedArtifactRefs = uniqueRefs([...artifactRefs, prepared.handoffRef]);
        await this.runnerDependencies.valueAssessmentRepository!.createAssessmentWithMemo({
          assess_topic_value_run: {
            assess_topic_value_run_id: runId,
            workspace_id: loaded.value.contract.workspace_id ?? null,
            title_card_id: titleCardId,
            topic_question_contract_id: loaded.value.contract.topic_question_contract_id,
            topic_question_id: loaded.value.question.topic_question_id,
            research_slice_id: loaded.value.researchSlice.research_slice_id,
            research_slice_version: loaded.value.researchSlice.slice_version,
            topic_value_assessment_id: assessmentId,
            value_reasoning_memo_id: memoId,
            status: 'succeeded',
            triggered_by: input.created_by ?? 'system',
            topic_question_ref: questionRef,
            topic_question_contract_ref: contractRef,
            answerability_plan_ref: answerabilityPlanRef,
            research_slice_ref: researchSliceRef,
            selection_decision_ref: selectionDecisionRef,
            validated_need_refs: snapshot.validated_need_refs,
            evidence_refs: loaded.value.evidenceRefs.map((record) => record.evidence_ref),
            accepted_risk_refs: assessment.accepted_risk_refs,
            memory_suggestion_refs: snapshot.memory_suggestion_refs,
            recheck_request_refs: snapshot.recheck_request_refs,
            workflow_profile_key: draftResolution.value.semanticArtifact.profile_id,
            workflow_profile_version: input.policy_version,
            provider_id: null,
            model_id: null,
            prompt_template_id: draftResolution.value.semanticArtifact.output_contract,
            prompt_template_version: draftResolution.value.semanticArtifact.adapter_policy_version,
            topic_value_input_snapshot_id: snapshotId,
            input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
            workflow_run_id: input.workflow_run_id,
            gate_result_id: prepared.gate.readiness_gate_result_id,
            transition_attempt_id: null,
            artifact_refs: persistedArtifactRefs,
            quality_flags: this.n8QualityFlags(draftResolution.value.draft),
            failure_reason: null,
            created_at: now,
            updated_at: now,
          },
          topic_value_input_snapshot: {
            ...snapshot,
            control_plane_input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
          },
          topic_value_assessment: {
            ...assessment,
            gate_result_id: prepared.gate.readiness_gate_result_id,
            artifact_refs: persistedArtifactRefs,
          },
          value_reasoning_memo: {
            ...memo,
            artifact_refs: persistedArtifactRefs,
          },
          evidence_refs: this.buildN8ValueEvidenceRefs({
            assessmentId,
            contractId: loaded.value.contract.topic_question_contract_id,
            evidenceRefs: loaded.value.evidenceRefs,
            titleCardId,
            workspaceId: loaded.value.contract.workspace_id ?? null,
          }),
        });
      },
    });
  }

  private async runN9DecideValueDisposition(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    const dependencyBlocker = this.runnerDependencyBlocker(input.node_id);
    if (dependencyBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: dependencyBlocker.code,
        message: dependencyBlocker.message,
      });
    }
    const payload = this.parseN9Payload(input.frozen_input.payload);
    if (!payload.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: payload.code,
        message: payload.message,
      });
    }
    const loaded = await this.loadN9Context(input, payload.value);
    if (!loaded.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: loaded.code,
        message: loaded.message,
      });
    }
    const lineageBlocker = this.n9LineageBlocker(payload.value, loaded.value);
    if (lineageBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: lineageBlocker.code,
        message: lineageBlocker.message,
      });
    }

    const now = this.now();
    const decisionId = this.idFactory('value_disposition_decision');
    const decisionRef = this.ref('value_disposition_decision', decisionId, loaded.value.assessment.title_card_id);
    const assessmentRef = this.ref(
      'topic_value_assessment',
      loaded.value.assessment.topic_value_assessment_id,
      loaded.value.assessment.title_card_id,
    );
    const memoRef = this.ref(
      'value_reasoning_memo',
      loaded.value.memo.value_reasoning_memo_id,
      loaded.value.memo.title_card_id,
    );
    const disposition = payload.value.recommended_disposition;
    const advanceBlocker = disposition === 'advance_to_package'
      ? this.n9AdvanceBlocker(loaded.value)
      : {
        code: 'N9_NON_ADVANCE_DISPOSITION',
        message: `N9 disposition ${disposition} does not advance to package creation.`,
      };
    const decisionWithoutDraft: Omit<TopicSelectionValueDispositionDecisionRecord, 'package_draft_input'> = {
      value_disposition_decision_id: decisionId,
      workspace_id: loaded.value.assessment.workspace_id ?? null,
      title_card_id: loaded.value.assessment.title_card_id,
      topic_value_assessment_id: loaded.value.assessment.topic_value_assessment_id,
      topic_question_contract_id: loaded.value.assessment.topic_question_contract_id,
      value_reasoning_memo_id: loaded.value.memo.value_reasoning_memo_id,
      decision: disposition,
      decided_by: input.created_by ?? 'system',
      decision_rationale: loaded.value.memo.disposition_bridge,
      required_actions: advanceBlocker ? [advanceBlocker.code] : [],
      loopback_target_ref: advanceBlocker ? this.n9LoopbackTargetRef(disposition, loaded.value) : null,
      blocking_contexts: advanceBlocker ? [{
        code: advanceBlocker.code,
        message: advanceBlocker.message,
        recommended_disposition: disposition,
      }] : [],
      accepted_risk_refs: loaded.value.assessment.accepted_risk_refs,
      blocker_refs: loaded.value.assessment.blocker_refs,
      output_topic_package_id: null,
      status: disposition === 'recheck_evidence_or_search' ? 'recheck_required' : 'active',
      is_current: true,
      input_snapshot_id: null,
      workflow_run_id: input.workflow_run_id,
      gate_result_id: null,
      transition_attempt_id: null,
      artifact_refs: uniqueRefs([input.frozen_input.source_refs.find((ref) => ref.ref_type === 'artifact_ref')]),
      created_at: now,
    };
    const packageDraftInput = advanceBlocker ? null : this.buildN9PackageDraftInput({
      decision: decisionWithoutDraft,
      loaded: loaded.value,
      memoRef,
      decisionRef,
    });
    const decision: TopicSelectionValueDispositionDecisionRecord = {
      ...decisionWithoutDraft,
      package_draft_input: packageDraftInput,
    };
    const decisionHash = this.hashN9DispositionAuthority(decision);
    const warnings = this.n9Warnings(decision, loaded.value);
    if (advanceBlocker) {
      const blocker = this.blocker(advanceBlocker.code, advanceBlocker.message, [assessmentRef, memoRef]);
      return this.persistAdmittedResult(input, hashContext, {
        acceptedRiskRefs: decision.accepted_risk_refs,
        authorityHash: decisionHash,
        authorityRef: decisionRef,
        blockers: [blocker],
        errorCode: advanceBlocker.code,
        errorMessage: advanceBlocker.message,
        failureClass: 'terminal_no_advance',
        gateStatus: 'terminal_no_advance',
        handoff: null,
        handoffHash: null,
        routeDecision: 'blocked',
        sourceRef: assessmentRef,
        targetRef: decisionRef,
        tracePhase: 'T-107 v1b N9 value disposition terminal decision',
        tracePayload: {
          disposition,
          disposition_hash: decisionHash,
          n8_handoff_hash: payload.value.n8_handoff_hash,
        },
        transitionKey: 'topic-selection.v1b.harness.n9-value-disposition-terminal',
        warnings,
      }, {
        writeAuthority: async (prepared) => {
          await this.runnerDependencies.valueAssessmentRepository!.createDispositionDecision({
            decision: {
              ...decision,
              input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
              gate_result_id: prepared.gate.readiness_gate_result_id,
            },
            topic_value_assessment_patch: {
              active_disposition_decision_id: decisionId,
              updated_at: now,
            },
          });
        },
      });
    }

    const gateStatus: TopicSelectionV1bWorkflowHarnessGateStatus = warnings.length > 0 ? 'admitted_with_warnings' : 'admitted';
    const gateResultHash = this.outcomeGateResultHash(input, hashContext, {
      authorityHash: decisionHash,
      blockerCodes: [],
      gateStatus,
      routeDecision: 'invoke_next',
      warningCodes: warnings.map((warning) => warning.code),
    });
    const handoffPayload: TopicSelectionV1bWorkflowHarnessHandoffPayload = {
      value_disposition_ref: decisionRef,
      value_disposition_hash: decisionHash,
      advance_disposition: true,
      topic_value_assessment_ref: assessmentRef,
      topic_value_assessment_hash: payload.value.topic_value_assessment_hash,
    };
    const handoff = this.buildHandoff(input, {
      handoffKind: 'N9ToN10Handoff',
      payload: handoffPayload,
      requiredRefs: [decisionRef, assessmentRef],
      residualRiskRefs: decision.accepted_risk_refs,
      sourceAuthorityHash: decisionHash,
      sourceAuthorityRef: decisionRef,
      sourceGateResultHash: gateResultHash,
      upstreamLineageHash: this.hash({
        n8_handoff_hash: payload.value.n8_handoff_hash,
        topic_value_assessment_hash: payload.value.topic_value_assessment_hash,
        value_reasoning_memo_hash: payload.value.value_reasoning_memo_hash,
      }),
      warningCodes: warnings.map((warning) => warning.code),
    });
    return this.persistAdmittedResult(input, hashContext, {
      acceptedRiskRefs: decision.accepted_risk_refs,
      authorityHash: decisionHash,
      authorityRef: decisionRef,
      blockers: [],
      failureClass: null,
      gateStatus,
      handoff,
      handoffHash: this.hash(handoff),
      routeDecision: 'invoke_next',
      sourceRef: assessmentRef,
      targetRef: decisionRef,
      tracePhase: 'T-107 v1b N9 value disposition advance decision',
      tracePayload: {
        disposition,
        disposition_hash: decisionHash,
        n8_handoff_hash: payload.value.n8_handoff_hash,
      },
      transitionKey: 'topic-selection.v1b.harness.n9-value-disposition',
      warnings,
    }, {
      writeAuthority: async (prepared) => {
        await this.runnerDependencies.valueAssessmentRepository!.createDispositionDecision({
          decision: {
            ...decision,
            input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
            gate_result_id: prepared.gate.readiness_gate_result_id,
          },
          topic_value_assessment_patch: {
            active_disposition_decision_id: decisionId,
            updated_at: now,
          },
        });
      },
    });
  }

  private async runN10CreateDraftTopicPackage(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    const dependencyBlocker = this.runnerDependencyBlocker(input.node_id);
    if (dependencyBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: dependencyBlocker.code,
        message: dependencyBlocker.message,
      });
    }
    const payload = this.parseN10Payload(input.frozen_input.payload);
    if (!payload.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: payload.code,
        message: payload.message,
      });
    }
    const loaded = await this.loadN10Context(input, payload.value);
    if (!loaded.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: loaded.code,
        message: loaded.message,
      });
    }
    const lineageBlocker = this.n10LineageBlocker(payload.value, loaded.value);
    if (lineageBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: lineageBlocker.code,
        message: lineageBlocker.message,
      });
    }
    const existing = await this.runnerDependencies.topicPackageRepository!
      .findPackageByValueDispositionDecisionId(loaded.value.decision.value_disposition_decision_id);
    if (existing) {
      const packageRef = this.ref('topic_package', existing.topic_package_id, existing.title_card_id, existing.package_version);
      const packageHash = this.hashN10PackageAuthority(existing);
      const existingBundle = await this.runnerDependencies.topicPackageRepository!
        .findV1cInputBundleByPackageId(existing.topic_package_id);
      if (!existingBundle) {
        return this.persistBlockedResult(input, hashContext, {
          blockerCode: 'N10_EXISTING_V1C_BUNDLE_MISSING',
          message: 'N10 existing package is missing its v1c input bundle authority.',
        });
      }
      const v1cInputBundleRef = this.ref(
        'v1b_to_v1c_input_bundle',
        existingBundle.v1b_to_v1c_input_bundle_id,
        existingBundle.title_card_id,
      );
      const v1cInputBundleHash = this.hashN10V1cInputBundleAuthority(existingBundle);
      const warning = this.warning('N10_PACKAGE_EXISTING_RETURNED', 'N10 returned the existing package for this disposition decision.', [packageRef]);
      const gateResultHash = this.outcomeGateResultHash(input, hashContext, {
        authorityHash: packageHash,
        blockerCodes: [],
        gateStatus: 'admitted_with_warnings',
        routeDecision: 'invoke_next',
        warningCodes: [warning.code],
      });
      const handoffPayload: TopicSelectionV1bWorkflowHarnessHandoffPayload = {
        draft_topic_package_ref: packageRef,
        draft_topic_package_hash: packageHash,
        value_disposition_ref: payload.value.value_disposition_ref,
        value_disposition_hash: payload.value.value_disposition_hash,
        v1c_input_bundle_ref: v1cInputBundleRef,
        v1c_input_bundle_hash: v1cInputBundleHash,
      };
      const handoff = this.buildHandoff(input, {
        handoffKind: 'N10ToN11Handoff',
        payload: handoffPayload,
        requiredRefs: [packageRef, payload.value.value_disposition_ref],
        residualRiskRefs: existing.accepted_risk_refs,
        sourceAuthorityHash: packageHash,
        sourceAuthorityRef: packageRef,
        sourceGateResultHash: gateResultHash,
        upstreamLineageHash: this.hash({
          existing_package: true,
          n9_handoff_hash: payload.value.n9_handoff_hash,
          value_disposition_hash: payload.value.value_disposition_hash,
        }),
        warningCodes: [warning.code],
      });
      return this.persistAdmittedResult(input, hashContext, {
        acceptedRiskRefs: existing.accepted_risk_refs,
        authorityHash: packageHash,
        authorityRef: packageRef,
        blockers: [],
        failureClass: null,
        gateStatus: 'admitted_with_warnings',
        handoff,
        handoffHash: this.hash(handoff),
        routeDecision: 'invoke_next',
        sourceRef: payload.value.value_disposition_ref,
        targetRef: packageRef,
        tracePhase: 'T-107 v1b N10 existing draft topic package',
        transitionKey: 'topic-selection.v1b.harness.n10-draft-topic-package-existing',
        warnings: [warning],
      }, {
        writeAuthority: async () => {},
      });
    }

    const built = this.buildN10PackagePersistence(input, loaded.value.decision);
    if (!built.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: built.code,
        message: built.message,
      });
    }
    const packageHash = this.hashN10PackageAuthority(built.value.topicPackage);
    const warnings = this.n10Warnings(built.value.topicPackage);
    const gateStatus: TopicSelectionV1bWorkflowHarnessGateStatus =
      warnings.length > 0 ? 'admitted_with_warnings' : 'admitted';
    const gateResultHash = this.outcomeGateResultHash(input, hashContext, {
      authorityHash: packageHash,
      blockerCodes: [],
      gateStatus,
      routeDecision: 'invoke_next',
      warningCodes: warnings.map((warning) => warning.code),
    });
    const packageRef = built.value.topicPackage.topic_package_ref;
    const v1cInputBundleRef = this.ref(
      'v1b_to_v1c_input_bundle',
      built.value.v1cInputBundle!.v1b_to_v1c_input_bundle_id,
      built.value.topicPackage.title_card_id,
    );
    const v1cInputBundleHash = this.hashN10V1cInputBundleAuthority(built.value.v1cInputBundle!);
    const handoffPayload: TopicSelectionV1bWorkflowHarnessHandoffPayload = {
      draft_topic_package_ref: packageRef,
      draft_topic_package_hash: packageHash,
      value_disposition_ref: payload.value.value_disposition_ref,
      value_disposition_hash: payload.value.value_disposition_hash,
      v1c_input_bundle_ref: v1cInputBundleRef,
      v1c_input_bundle_hash: v1cInputBundleHash,
    };
    const handoff = this.buildHandoff(input, {
      handoffKind: 'N10ToN11Handoff',
      payload: handoffPayload,
      requiredRefs: [packageRef, payload.value.value_disposition_ref],
      residualRiskRefs: built.value.topicPackage.accepted_risk_refs,
      sourceAuthorityHash: packageHash,
      sourceAuthorityRef: packageRef,
      sourceGateResultHash: gateResultHash,
      upstreamLineageHash: this.hash({
        n9_handoff_hash: payload.value.n9_handoff_hash,
        topic_value_assessment_hash: payload.value.topic_value_assessment_hash,
        value_disposition_hash: payload.value.value_disposition_hash,
      }),
      warningCodes: warnings.map((warning) => warning.code),
    });
    return this.persistAdmittedResult(input, hashContext, {
      acceptedRiskRefs: built.value.topicPackage.accepted_risk_refs,
      additionalAuthorityRefs: uniqueRefs([
        this.ref('package_trace_boundary_check', built.value.traceCheck.package_trace_boundary_check_id, built.value.topicPackage.title_card_id),
        this.ref('topic_package_readiness_assessment', built.value.readiness.package_readiness_assessment_id, built.value.topicPackage.title_card_id),
        built.value.v1cInputBundle
          ? this.ref('v1b_to_v1c_input_bundle', built.value.v1cInputBundle.v1b_to_v1c_input_bundle_id, built.value.topicPackage.title_card_id)
          : null,
      ]),
      authorityHash: packageHash,
      authorityRef: packageRef,
      blockers: [],
      failureClass: null,
      gateStatus,
      handoff,
      handoffHash: this.hash(handoff),
      routeDecision: 'invoke_next',
      sourceRef: payload.value.value_disposition_ref,
      targetRef: packageRef,
      tracePhase: 'T-107 v1b N10 draft topic package runner',
      tracePayload: {
        draft_topic_package_hash: packageHash,
        n9_handoff_hash: payload.value.n9_handoff_hash,
        v1c_input_bundle_hash: built.value.v1cInputBundle ? this.hashN10V1cInputBundleAuthority(built.value.v1cInputBundle) : null,
      },
      transitionKey: 'topic-selection.v1b.harness.n10-draft-topic-package',
      warnings,
    }, {
      writeAuthority: async (prepared) => {
        const artifactRefs = uniqueRefs([prepared.handoffRef]);
        const topicPackage = {
          ...built.value.topicPackage,
          input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
          gate_result_id: prepared.gate.readiness_gate_result_id,
          artifact_refs: artifactRefs,
        };
        const traceCheck = {
          ...built.value.traceCheck,
          input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
          gate_result_id: prepared.gate.readiness_gate_result_id,
          artifact_refs: artifactRefs,
        };
        const readiness = {
          ...built.value.readiness,
          input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
          gate_result_id: prepared.gate.readiness_gate_result_id,
          artifact_refs: artifactRefs,
        };
        const v1cInputBundle = built.value.v1cInputBundle
          ? {
            ...built.value.v1cInputBundle,
            package_snapshot: topicPackage,
            input_snapshot_id: prepared.inputSnapshot.input_snapshot_id,
            gate_result_id: prepared.gate.readiness_gate_result_id,
            artifact_refs: artifactRefs,
          }
          : null;
        await this.runnerDependencies.topicPackageRepository!.createDraftPackageAuthority({
          topic_package: topicPackage,
          package_trace_boundary_check: traceCheck,
          package_readiness_assessment: readiness,
          v1c_input_bundle: v1cInputBundle,
        });
      },
    });
  }

  private async runN11PublishV1cInputBundle(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    const dependencyBlocker = this.runnerDependencyBlocker(input.node_id);
    if (dependencyBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: dependencyBlocker.code,
        message: dependencyBlocker.message,
      });
    }
    const payload = this.parseN11Payload(input.frozen_input.payload);
    if (!payload.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: payload.code,
        message: payload.message,
      });
    }
    const loaded = await this.loadN11Context(input, payload.value);
    if (!loaded.ok) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: loaded.code,
        message: loaded.message,
      });
    }
    const lineageBlocker = this.n11LineageBlocker(payload.value, loaded.value);
    if (lineageBlocker) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: lineageBlocker.code,
        message: lineageBlocker.message,
      });
    }
    const bundleRef = this.ref(
      'v1b_to_v1c_input_bundle',
      loaded.value.bundle.v1b_to_v1c_input_bundle_id,
      loaded.value.bundle.title_card_id,
    );
    const packageRef = loaded.value.packageRecord.topic_package_ref;
    const bundleHash = this.hashN10V1cInputBundleAuthority(loaded.value.bundle);
    const packageHash = this.hashN10PackageAuthority(loaded.value.packageRecord);
    const warnings = uniqueIssues([
      ...(loaded.value.bundle.accepted_risk_refs.length > 0
        ? [this.warning('N11_RESIDUAL_RISK_CARRIED_FORWARD', 'N11 v1c input bundle carries residual risk refs.', loaded.value.bundle.accepted_risk_refs)]
        : []),
      ...(loaded.value.bundle.package_snapshot.key_risks.length > 0
        ? [this.warning('N11_PACKAGE_RISKS_CARRIED_FORWARD', 'N11 v1c input bundle carries package key risks forward.', [loaded.value.bundle.topic_value_assessment_ref])]
        : []),
    ]);
    const gateStatus: TopicSelectionV1bWorkflowHarnessGateStatus =
      warnings.length > 0 ? 'admitted_with_warnings' : 'admitted';
    const gateResultHash = this.outcomeGateResultHash(input, hashContext, {
      authorityHash: bundleHash,
      blockerCodes: [],
      gateStatus,
      routeDecision: 'stop_v1b_complete',
      warningCodes: warnings.map((warning) => warning.code),
    });
    const handoffPayload: TopicSelectionV1bWorkflowHarnessHandoffPayload = {
      v1c_input_bundle_ref: bundleRef,
      v1c_input_bundle_hash: bundleHash,
      draft_topic_package_ref: packageRef,
      draft_topic_package_hash: packageHash,
    };
    const handoff = this.buildHandoff(input, {
      handoffKind: 'V1cInputBundle',
      payload: handoffPayload,
      requiredRefs: [bundleRef, packageRef],
      residualRiskRefs: loaded.value.bundle.accepted_risk_refs,
      sourceAuthorityHash: bundleHash,
      sourceAuthorityRef: bundleRef,
      sourceGateResultHash: gateResultHash,
      upstreamLineageHash: this.hash({
        draft_topic_package_hash: payload.value.draft_topic_package_hash,
        n10_handoff_hash: payload.value.n10_handoff_hash,
        v1c_input_bundle_hash: payload.value.v1c_input_bundle_hash,
      }),
      warningCodes: warnings.map((warning) => warning.code),
    });
    return this.persistAdmittedResult(input, hashContext, {
      acceptedRiskRefs: loaded.value.bundle.accepted_risk_refs,
      authorityHash: bundleHash,
      authorityRef: bundleRef,
      blockers: [],
      failureClass: null,
      gateStatus,
      handoff,
      handoffHash: this.hash(handoff),
      routeDecision: 'stop_v1b_complete',
      sourceRef: packageRef,
      targetRef: bundleRef,
      tracePhase: 'T-107 v1b N11 v1c input bundle publication runner',
      tracePayload: {
        draft_topic_package_hash: packageHash,
        n10_handoff_hash: payload.value.n10_handoff_hash,
        v1c_input_bundle_hash: bundleHash,
      },
      transitionKey: 'topic-selection.v1b.harness.n11-v1c-input-bundle-publication',
      warnings,
    }, {
      writeAuthority: async () => {},
    });
  }

  private parseN8Payload(
    payload: Record<string, unknown>,
  ): { ok: true; value: TopicSelectionV1bN8HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
    if (!this.hasOnlyKeys(payload, [
      'n7_handoff_hash',
      'topic_question_ref',
      'topic_question_hash',
      'topic_question_contract_ref',
      'topic_question_contract_hash',
      'answerability_plan_ref',
      'answerability_plan_hash',
      'trial_ledger_ref',
      'trial_ledger_hash',
      'topic_question_candidate_set_ref',
      'topic_question_candidate_set_hash',
      'active_candidate_ref',
      'active_candidate_hash',
      'selected_research_slice_ref',
      'selected_research_slice_hash',
      'n8_debate_admission_ref',
      'n8_debate_admission_hash',
      'candidate_grouping_ref',
      'candidate_grouping_hash',
    ])
      || !this.isHash(payload.n7_handoff_hash)
      || !this.isFunctionalRefValue(payload.topic_question_ref)
      || !this.isHash(payload.topic_question_hash)
      || !this.isFunctionalRefValue(payload.topic_question_contract_ref)
      || !this.isHash(payload.topic_question_contract_hash)
      || !this.isFunctionalRefValue(payload.answerability_plan_ref)
      || !this.isHash(payload.answerability_plan_hash)
      || !this.isFunctionalRefValue(payload.trial_ledger_ref)
      || !this.isHash(payload.trial_ledger_hash)
      || !this.isFunctionalRefValue(payload.topic_question_candidate_set_ref)
      || !this.isHash(payload.topic_question_candidate_set_hash)
      || !this.isFunctionalRefValue(payload.active_candidate_ref)
      || !this.isHash(payload.active_candidate_hash)
      || !this.isFunctionalRefValue(payload.selected_research_slice_ref)
      || !this.isHash(payload.selected_research_slice_hash)
      || !this.isFunctionalRefValue(payload.n8_debate_admission_ref)
      || !this.isHash(payload.n8_debate_admission_hash)
      || !this.isNullableFunctionalRefValue(payload.candidate_grouping_ref)
      || !this.isNullableHash(payload.candidate_grouping_hash)) {
      return {
        ok: false,
        code: 'N8_FROZEN_PAYLOAD_INVALID',
        message: 'N8 requires a frozen N7-to-N8 handoff payload with contract, candidate, and debate admission hashes.',
      };
    }
    return { ok: true, value: payload as unknown as TopicSelectionV1bN8HarnessFrozenInputPayload };
  }

  private async loadN8Context(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN8HarnessFrozenInputPayload,
  ): Promise<{ ok: true; value: N8LoadedContext } | { ok: false; code: string; message: string }> {
    const n7Handoff = await this.resolveSourceHandoff(input, 'N7ToN8Handoff', payload.n7_handoff_hash, 'N8');
    if (!n7Handoff.ok) return n7Handoff;
    const topicQuestionRepository = this.runnerDependencies.topicQuestionRepository!;
    const [
      answerabilityPlan,
      assumptionRefs,
      boundaryRefs,
      candidate,
      candidateSet,
      contract,
      evidenceRefs,
      falsificationConditions,
      needRefs,
      question,
      researchSlice,
      selectionDecision,
    ] = await Promise.all([
      topicQuestionRepository.findAnswerabilityPlanById(payload.answerability_plan_ref.ref_id),
      topicQuestionRepository.listAssumptionRefsByContractId(payload.topic_question_contract_ref.ref_id),
      topicQuestionRepository.listBoundaryRefsByContractId(payload.topic_question_contract_ref.ref_id),
      topicQuestionRepository.findCandidateById(payload.active_candidate_ref.ref_id),
      topicQuestionRepository.findCandidateSetById(payload.topic_question_candidate_set_ref.ref_id),
      topicQuestionRepository.findTopicQuestionContractById(payload.topic_question_contract_ref.ref_id),
      topicQuestionRepository.listEvidenceRefsByContractId(payload.topic_question_contract_ref.ref_id),
      topicQuestionRepository.listFalsificationConditionsByContractId(payload.topic_question_contract_ref.ref_id),
      topicQuestionRepository.listNeedRefsByContractId(payload.topic_question_contract_ref.ref_id),
      topicQuestionRepository.findTopicQuestionById(payload.topic_question_ref.ref_id),
      this.runnerDependencies.researchSliceRepository!.findResearchSliceById(payload.selected_research_slice_ref.ref_id),
      topicQuestionRepository.findSelectionDecisionById(payload.trial_ledger_ref.ref_id),
    ]);
    if (
      !answerabilityPlan
      || !candidate
      || !candidateSet
      || !contract
      || !question
      || !researchSlice
      || !selectionDecision
    ) {
      return {
        ok: false,
        code: 'N8_CONTEXT_NOT_FOUND',
        message: 'N8 frozen N7 handoff refs must resolve to persisted TopicQuestionContract context.',
      };
    }
    return {
      ok: true,
      value: {
        answerabilityPlan,
        assumptionRefs,
        boundaryRefs,
        candidate,
        candidateSet,
        contract,
        evidenceRefs,
        falsificationConditions,
        needRefs,
        n7Handoff: n7Handoff.value,
        question,
        researchSlice,
        selectionDecision,
      },
    };
  }

  private n8LineageBlocker(
    payload: TopicSelectionV1bN8HarnessFrozenInputPayload,
    loaded: N8LoadedContext,
  ): { code: string; message: string } | null {
    const handoffPayload = loaded.n7Handoff.payload as TopicSelectionV1bN7ToN8HandoffPayload;
    if (!this.n8PayloadMatchesN7Handoff(payload, handoffPayload)) {
      return {
        code: 'N8_N7_HANDOFF_PAYLOAD_MISMATCH',
        message: 'N8 frozen payload does not match the persisted N7-to-N8 handoff artifact.',
      };
    }
    if (this.hashN7TopicQuestionAuthority(loaded.question) !== payload.topic_question_hash) {
      return {
        code: 'N8_TOPIC_QUESTION_HASH_MISMATCH',
        message: 'N8 topic question hash does not match persisted TopicQuestion authority.',
      };
    }
    if (this.hashN7ContractAuthority(loaded.contract) !== payload.topic_question_contract_hash) {
      return {
        code: 'N8_TOPIC_QUESTION_CONTRACT_HASH_MISMATCH',
        message: 'N8 contract hash does not match persisted TopicQuestionContract authority.',
      };
    }
    if (this.hashN7AnswerabilityPlanAuthority(loaded.answerabilityPlan) !== payload.answerability_plan_hash) {
      return {
        code: 'N8_ANSWERABILITY_PLAN_HASH_MISMATCH',
        message: 'N8 answerability plan hash does not match persisted plan authority.',
      };
    }
    if (loaded.candidate.topic_question_candidate_id !== payload.active_candidate_ref.ref_id) {
      return {
        code: 'N8_ACTIVE_CANDIDATE_REF_MISMATCH',
        message: 'N8 active candidate ref does not match the persisted candidate authority.',
      };
    }
    if (
      loaded.researchSlice.research_slice_id !== payload.selected_research_slice_ref.ref_id
      || loaded.researchSlice.slice_version !== (payload.selected_research_slice_ref.version_id ?? loaded.researchSlice.slice_version)
    ) {
      return {
        code: 'N8_RESEARCH_SLICE_HASH_MISMATCH',
        message: 'N8 selected ResearchSlice ref does not match persisted slice authority.',
      };
    }
    if (
      loaded.contract.topic_question_id !== loaded.question.topic_question_id
      || loaded.contract.answerability_plan_id !== loaded.answerabilityPlan.topic_question_answerability_plan_id
      || loaded.contract.source_candidate_id !== loaded.candidate.topic_question_candidate_id
      || loaded.contract.selection_decision_id !== loaded.selectionDecision.topic_question_selection_decision_id
    ) {
      return {
        code: 'N8_CONTRACT_LINEAGE_MISMATCH',
        message: 'N8 loaded TopicQuestionContract lineage does not match the frozen N7 materialization.',
      };
    }
    return null;
  }

  private n8PayloadMatchesN7Handoff(
    payload: TopicSelectionV1bN8HarnessFrozenInputPayload,
    handoffPayload: TopicSelectionV1bN7ToN8HandoffPayload,
  ): boolean {
    return payload.topic_question_hash === handoffPayload.topic_question_hash
      && payload.topic_question_contract_hash === handoffPayload.topic_question_contract_hash
      && payload.answerability_plan_hash === handoffPayload.answerability_plan_hash
      && payload.trial_ledger_hash === handoffPayload.trial_ledger_hash
      && payload.topic_question_candidate_set_hash === handoffPayload.topic_question_candidate_set_hash
      && payload.active_candidate_hash === handoffPayload.active_candidate_hash
      && payload.selected_research_slice_hash === handoffPayload.selected_research_slice_hash
      && payload.n8_debate_admission_hash === handoffPayload.n8_debate_admission_hash
      && payload.candidate_grouping_hash === handoffPayload.candidate_grouping_hash
      && this.refsEqual(payload.topic_question_ref, handoffPayload.topic_question_ref)
      && this.refsEqual(payload.topic_question_contract_ref, handoffPayload.topic_question_contract_ref)
      && this.refsEqual(payload.answerability_plan_ref, handoffPayload.answerability_plan_ref)
      && this.refsEqual(payload.trial_ledger_ref, handoffPayload.trial_ledger_ref)
      && this.refsEqual(payload.topic_question_candidate_set_ref, handoffPayload.topic_question_candidate_set_ref)
      && this.refsEqual(payload.active_candidate_ref, handoffPayload.active_candidate_ref)
      && this.refsEqual(payload.selected_research_slice_ref, handoffPayload.selected_research_slice_ref)
      && this.refsEqual(payload.n8_debate_admission_ref, handoffPayload.n8_debate_admission_ref)
      && this.nullableRefsEqual(payload.candidate_grouping_ref, handoffPayload.candidate_grouping_ref);
  }

  private async verifyN8RuntimeVerifiedDraftAuditArtifact(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  ): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
    if (
      !artifact.runtime_audit_ref
      || artifact.runtime_audit_ref.ref_type !== 'artifact_ref'
      || !this.refsEqual(artifact.provenance_ref, artifact.runtime_audit_ref)
    ) {
      return this.n8RuntimeAuditDrift('N8 runtime value draft provenance must point to its audit artifact_ref.');
    }
    const auditArtifact = await this.controlPlane.getArtifactRef(artifact.runtime_audit_ref.ref_id);
    if (
      !auditArtifact
      || auditArtifact.artifact_kind !== 'diagnostic'
      || auditArtifact.checksum !== artifact.runtime_audit_hash
      || auditArtifact.workflow_run_id !== input.workflow_run_id
    ) {
      return this.n8RuntimeAuditDrift('N8 runtime value draft audit artifact is missing or checksum-drifted.');
    }
    const auditPayload = auditArtifact.payload;
    if (!this.isRecord(auditPayload) || !this.isRecord(auditPayload.provenance)) {
      return this.n8RuntimeAuditDrift('N8 runtime value draft audit payload is not a valid invocation audit snapshot.');
    }
    const provenance = auditPayload.provenance;
    const expectedSourceKind = artifact.execution_mode === 'mocked_llm' ? 'mock_fixture' : 'codex_response';
    if (
      auditPayload.node_id !== input.node_id
      || auditPayload.workflow_run_id !== input.workflow_run_id
      || auditPayload.node_attempt_id !== input.node_attempt_id
      || auditPayload.status !== 'succeeded'
      || provenance.workflow_run_id !== input.workflow_run_id
      || provenance.node_id !== input.node_id
      || provenance.node_attempt_id !== input.node_attempt_id
      || provenance.execution_mode !== artifact.execution_mode
      || provenance.source_kind !== expectedSourceKind
      || provenance.non_provider !== true
      || provenance.run_mode !== artifact.run_mode
      || provenance.profile_id !== artifact.profile_id
      || provenance.model_option_id !== artifact.model_option_id
      || provenance.output_contract !== artifact.output_contract
      || provenance.prompt_packet_hash !== artifact.prompt_packet_hash
      || provenance.structured_output_hash !== artifact.structured_output_hash
      || provenance.cache_status !== 'not_applicable'
      || provenance.response_reuse_ref !== null
      || provenance.telemetry !== null
    ) {
      return this.n8RuntimeAuditDrift('N8 runtime value draft audit provenance does not match the draft artifact identity.');
    }
    return { ok: true };
  }

  private n8RuntimeAuditDrift(message: string): { ok: false; code: string; message: string } {
    return {
      ok: false,
      code: 'N8_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
      message,
    };
  }

  private async resolveN8ValueAssessmentAdmissionExpectedIdentity(input: {
    input: TopicSelectionV1bWorkflowHarnessRunRequest;
    payload: TopicSelectionV1bN8HarnessFrozenInputPayload;
    draftHash: string;
    semanticArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    admissionExecutionMode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
  }): Promise<{
    ok: true;
    value: TopicSelectionV1bN8ValueAssessmentAdmissionExpectedIdentity;
  } | { ok: false; code: string; message: string }> {
    try {
      const value = await this.n8ValueAssessmentRuntime.buildAdmissionExpectedIdentity({
        request: input.input,
        frozenPayload: input.payload,
        normalizedPayloadHash: input.draftHash,
        executionMode: input.admissionExecutionMode,
        runMode: input.input.run_mode ?? input.semanticArtifact.run_mode,
        profileId: input.semanticArtifact.profile_id,
        modelOptionId: input.semanticArtifact.model_option_id,
      });
      return { ok: true, value };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          ok: false,
          code: 'N8_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
          message: error.message,
        };
      }
      throw error;
    }
  }

  private async resolveN8DraftPayload(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN8HarnessFrozenInputPayload,
  ): Promise<{ ok: true; value: N8DraftResolution } | { ok: false; code: string; message: string }> {
    const semanticArtifact = (input.semantic_artifacts ?? []).find((artifact) =>
      artifact.slot_id === 'n8_value_assessment_draft'
      && artifact.allowed_effect === 'model_draft_for_gate'
    );
    if (!semanticArtifact || !semanticArtifact.normalized_output_ref) {
      return {
        ok: false,
        code: 'N8_FROZEN_VALUE_DRAFT_ARTIFACT_REQUIRED',
        message: 'N8 requires a frozen normalized TopicValueAssessmentDraft semantic artifact.',
      };
    }
    const [supportArtifact, normalizedArtifact, provenanceArtifact] = await Promise.all([
      this.controlPlane.getArtifactRef(semanticArtifact.support_artifact_ref.ref_id),
      this.controlPlane.getArtifactRef(semanticArtifact.normalized_output_ref.ref_id),
      this.controlPlane.getArtifactRef(semanticArtifact.provenance_ref.ref_id),
    ]);
    if (!supportArtifact || !normalizedArtifact || !provenanceArtifact) {
      return {
        ok: false,
        code: 'N8_FROZEN_VALUE_DRAFT_ARTIFACT_NOT_FOUND',
        message: 'N8 semantic artifact refs must resolve to frozen control-plane ArtifactRef records.',
      };
    }
    if (
      supportArtifact.checksum !== semanticArtifact.support_artifact_hash
      || normalizedArtifact.checksum !== semanticArtifact.normalized_output_hash
    ) {
      return {
        ok: false,
        code: 'N8_FROZEN_VALUE_DRAFT_ARTIFACT_HASH_MISMATCH',
        message: 'N8 semantic artifact hashes do not match persisted ArtifactRef checksums.',
      };
    }
    const draftPayload = this.extractN8DraftPayload(normalizedArtifact.payload);
    if (!draftPayload) {
      return {
        ok: false,
        code: 'N8_TOPIC_VALUE_ASSESSMENT_DRAFT_INVALID',
        message: 'N8 normalized semantic artifact must contain a TopicValueAssessmentDraft payload.',
      };
    }
    const draftHash = this.hash(draftPayload);
    if (
      draftHash !== semanticArtifact.normalized_output_hash
      || draftHash !== semanticArtifact.structured_output_hash
    ) {
      return {
        ok: false,
        code: 'N8_FROZEN_VALUE_DRAFT_ARTIFACT_HASH_MISMATCH',
        message: 'N8 TopicValueAssessmentDraft payload hash does not match semantic artifact provenance.',
      };
    }
    if (
      semanticArtifact.runtime_provenance_class === 'runtime_verified'
      && semanticArtifact.execution_mode !== 'codex_assisted'
      && semanticArtifact.execution_mode !== 'mocked_llm'
    ) {
      return {
        ok: false,
        code: 'N8_DRAFT_ARTIFACT_PROVENANCE_CLASS_INVALID',
        message: 'runtime_verified v1b N8 value draft artifacts must be generated by the N8 value runtime.',
      };
    }
    if (semanticArtifact.runtime_provenance_class === 'runtime_verified') {
      const auditVerification = await this.verifyN8RuntimeVerifiedDraftAuditArtifact(input, semanticArtifact);
      if (!auditVerification.ok) {
        return auditVerification;
      }
    }
    const admissionExecutionMode = semanticArtifact.execution_mode === 'mocked_llm'
      ? 'mocked_llm'
      : 'codex_assisted';
    const expectedIdentity = await this.resolveN8ValueAssessmentAdmissionExpectedIdentity({
      input,
      payload,
      draftHash,
      semanticArtifact,
      admissionExecutionMode,
    });
    if (!expectedIdentity.ok) {
      return expectedIdentity;
    }
    const admission = this.n8ValueAssessmentAdmission.admit({
      artifact: semanticArtifact,
      expected: expectedIdentity.value,
      allow_fixture_replay: input.run_mode !== 'product',
    });
    if (!admission.admitted) {
      return {
        ok: false,
        code: admission.blocker.code,
        message: admission.blocker.message,
      };
    }
    return {
      ok: true,
      value: {
        artifactRefs: uniqueRefs([
          semanticArtifact.support_artifact_ref,
          semanticArtifact.normalized_output_ref,
          semanticArtifact.provenance_ref,
        ]),
        draft: draftPayload,
        draftHash,
        semanticArtifact,
      },
    };
  }

  private extractN8DraftPayload(
    payload: Record<string, unknown> | null | undefined,
  ): TopicSelectionV1bTopicValueAssessmentDraftPayload | null {
    if (!this.isRecord(payload)) {
      return null;
    }
    const candidate = this.isRecord(payload.normalized_output)
      ? payload.normalized_output
      : payload;
    return this.isN8DraftPayload(candidate)
      ? candidate as unknown as TopicSelectionV1bTopicValueAssessmentDraftPayload
      : null;
  }

  private isN8DraftPayload(value: Record<string, unknown>): boolean {
    return this.hasOnlyKeys(value, [
      'accepted_risk_refs',
      'base_case',
      'blocker_refs',
      'ceiling_case',
      'confidence',
      'dimension_scores',
      'fallback_claim_if_success',
      'floor_case',
      'hard_gates',
      'readiness_status',
      'reasoning_memo',
      'recommended_disposition',
      'reviewer_objections',
      'risk_notes',
      'risk_penalty',
      'strongest_claim_if_success',
      'total_score',
      'value_summary',
    ])
      && ['ready', 'ready_with_accepted_risk', 'needs_refinement', 'recheck_required', 'blocked', 'parked', 'dropped']
        .includes(value.readiness_status as string)
      && typeof value.strongest_claim_if_success === 'string'
      && (value.fallback_claim_if_success === null || value.fallback_claim_if_success === undefined || typeof value.fallback_claim_if_success === 'string')
      && Array.isArray(value.hard_gates)
      && Array.isArray(value.dimension_scores)
      && this.isRecord(value.risk_penalty)
      && this.isStringArray(value.reviewer_objections)
      && typeof value.ceiling_case === 'string'
      && typeof value.base_case === 'string'
      && typeof value.floor_case === 'string'
      && ['advance_to_package', 'refine_question', 'refine_slice', 'recheck_evidence_or_search', 'park', 'drop']
        .includes(value.recommended_disposition as string)
      && typeof value.total_score === 'number'
      && typeof value.value_summary === 'string'
      && typeof value.confidence === 'number'
      && this.isFunctionalRefArray(value.accepted_risk_refs)
      && this.isFunctionalRefArray(value.blocker_refs)
      && this.isStringArray(value.risk_notes)
      && this.isN8ReasoningMemoDraft(value.reasoning_memo);
  }

  private isN8ReasoningMemoDraft(value: unknown): boolean {
    return this.isRecord(value)
      && this.hasOnlyKeys(value, [
        'cited_refs',
        'claim_leverage',
        'critic_triggers',
        'disposition_bridge',
        'effort_to_value',
        'evidence_backed_rationale',
        'negative_memory_check',
        'originality',
        'recommendation',
        'requires_critic_review',
        'reviewer_risks',
        'significance',
        'strategic_fit',
        'top_objections',
        'uncertainty',
        'value_thesis',
      ])
      && ['advance_to_package', 'refine_question', 'refine_slice', 'recheck_evidence_or_search', 'park', 'drop']
        .includes(value.recommendation as string)
      && typeof value.value_thesis === 'string'
      && typeof value.significance === 'string'
      && typeof value.originality === 'string'
      && typeof value.claim_leverage === 'string'
      && this.isStringArray(value.reviewer_risks)
      && typeof value.effort_to_value === 'string'
      && typeof value.strategic_fit === 'string'
      && typeof value.negative_memory_check === 'string'
      && typeof value.evidence_backed_rationale === 'string'
      && this.isStringArray(value.top_objections)
      && typeof value.uncertainty === 'string'
      && typeof value.disposition_bridge === 'string'
      && typeof value.requires_critic_review === 'boolean'
      && this.isStringArray(value.critic_triggers)
      && this.isFunctionalRefArray(value.cited_refs);
  }

  private n8DraftGateBlocker(
    draftResolution: N8DraftResolution,
    loaded: N8LoadedContext,
  ): { code: string; message: string } | null {
    const draft = draftResolution.draft;
    const gateKeys = draft.hard_gates.map((gate) => gate.gate_key);
    const dimensionKeys = draft.dimension_scores.map((score) => score.dimension_key);
    const missingGate = TOPIC_SELECTION_VALUE_GATE_KEYS.find((key) => !gateKeys.includes(key));
    const missingDimension = TOPIC_SELECTION_VALUE_DIMENSIONS.find((key) => !dimensionKeys.includes(key));
    if (
      gateKeys.length !== TOPIC_SELECTION_VALUE_GATE_KEYS.length
      || missingGate
      || this.firstDuplicate(gateKeys)
      || draft.hard_gates.some((gate) => !this.isN8ValueGateResult(gate))
    ) {
      return {
        code: 'N8_VALUE_GATE_COVERAGE_INVALID',
        message: 'N8 TopicValueAssessmentDraft must contain exactly one result for each value gate.',
      };
    }
    if (
      dimensionKeys.length !== TOPIC_SELECTION_VALUE_DIMENSIONS.length
      || missingDimension
      || this.firstDuplicate(dimensionKeys)
      || draft.dimension_scores.some((score) => !this.isN8ValueDimensionScore(score))
    ) {
      return {
        code: 'N8_VALUE_DIMENSION_COVERAGE_INVALID',
        message: 'N8 TopicValueAssessmentDraft must contain exactly one score for each value dimension.',
      };
    }
    if (draft.recommended_disposition !== draft.reasoning_memo.recommendation) {
      return {
        code: 'N8_VALUE_MEMO_DISPOSITION_MISMATCH',
        message: 'N8 recommended_disposition must match reasoning_memo.recommendation.',
      };
    }
    const missingAcceptedRisk = loaded.contract.accepted_risk_refs
      .find((riskRef) => !draft.accepted_risk_refs.some((draftRiskRef) => this.refsEqual(riskRef, draftRiskRef)));
    if (missingAcceptedRisk) {
      return {
        code: 'N8_VALUE_ASSESSMENT_DROPS_RISKS',
        message: 'N8 TopicValueAssessmentDraft dropped an accepted risk inherited from the TopicQuestionContract.',
      };
    }
    const knownRefKeys = new Set(this.n8KnownRefs(loaded).map((ref) => this.refKey(ref)));
    const unknownRef = this.n8DraftRefs(draft)
      .find((ref) => !knownRefKeys.has(this.refKey(ref)));
    if (unknownRef) {
      return {
        code: 'N8_UNKNOWN_VALUE_TRACE_REF',
        message: `N8 TopicValueAssessmentDraft references unknown frozen context ref ${unknownRef.ref_type}:${unknownRef.ref_id}.`,
      };
    }
    const blockingGateOnAdvance = draft.recommended_disposition === 'advance_to_package'
      && draft.hard_gates.some((gate) => gate.verdict === 'fail' && gate.severity === 'blocking');
    if (blockingGateOnAdvance) {
      return {
        code: 'N8_ADVANCE_WITH_BLOCKING_GATE',
        message: 'N8 cannot recommend advance_to_package while a blocking hard gate fails.',
      };
    }
    if (draft.recommended_disposition === 'advance_to_package'
      && !['ready', 'ready_with_accepted_risk'].includes(draft.readiness_status)) {
      return {
        code: 'N8_ADVANCE_WITH_NON_READY_VALUE',
        message: 'N8 cannot recommend advance_to_package unless value readiness is ready or ready_with_accepted_risk.',
      };
    }
    if (draft.recommended_disposition === 'advance_to_package' && draft.total_score < 60) {
      return {
        code: 'N8_ADVANCE_SCORE_TOO_LOW',
        message: 'N8 cannot recommend advance_to_package below the deterministic value score floor.',
      };
    }
    if (draft.reasoning_memo.cited_refs.length === 0) {
      return {
        code: 'N8_VALUE_MEMO_CITATIONS_REQUIRED',
        message: 'N8 value reasoning memo must cite at least one frozen ref.',
      };
    }
    return null;
  }

  /**
   * T-123 Phase 3 (D-T123-02) — resolve the frozen debate-admission artifact the N7
   * handoff pinned. Its `input_mode` is the deterministic first-pass vs post-feedback
   * discriminator (DP-3.2): N7 records it from its own frozen input on both paths.
   */
  private async resolveN8DebateAdmission(
    payload: TopicSelectionV1bN8HarnessFrozenInputPayload,
  ): Promise<
    | { ok: true; value: { input_mode: string; debate_level: string; recommended_profile_id: string } }
    | { ok: false; code: string; message: string }
  > {
    const artifact = await this.controlPlane.getArtifactRef(payload.n8_debate_admission_ref.ref_id);
    const admission = artifact?.payload;
    if (!artifact || !this.isRecord(admission) || this.hash(admission) !== payload.n8_debate_admission_hash) {
      return {
        ok: false,
        code: 'N8_DEBATE_ADMISSION_UNRESOLVED',
        message: 'N8 frozen debate-admission ref does not resolve to the hashed admission artifact.',
      };
    }
    return {
      ok: true,
      value: {
        input_mode: String(admission.input_mode ?? 'initial_from_n6'),
        debate_level: String(admission.debate_level ?? 'compact_assessment_debate'),
        recommended_profile_id: String(admission.recommended_profile_id ?? ''),
      },
    };
  }

  /**
   * T-123 Phase 3 — first-pass T1/T3 hit: persist a loopback result (route RB_N8_N7,
   * declared loopback_target_code n8_feedback_to_n7) and record the N8ToN7Feedback
   * artifact the N7 feedback_from_n8 re-entry consumes. Mirrors the N7→N6 exhaustion
   * loopback form; no authority is written (the feedback packet is this attempt's record).
   */
  private async persistN8DebateLoopback(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
    payload: TopicSelectionV1bN8HarnessFrozenInputPayload,
    draftResolution: N8DraftResolution,
    triggers: Array<{ code: string; message: string }>,
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    let previousN7HandoffRef: TopicSelectionFunctionalRef | null = null;
    for (const sourceRef of input.frozen_input.source_refs) {
      if (sourceRef.ref_type !== 'artifact_ref') {
        continue;
      }
      const artifact = await this.controlPlane.getArtifactRef(sourceRef.ref_id);
      if (this.isHandoffArtifactPayload(artifact?.payload, 'N7ToN8Handoff')
        && this.hash(artifact!.payload) === payload.n7_handoff_hash) {
        previousN7HandoffRef = sourceRef;
        break;
      }
    }
    if (!previousN7HandoffRef) {
      return this.persistBlockedResult(input, hashContext, {
        blockerCode: 'N8_DEBATE_LOOPBACK_HANDOFF_REF_MISSING',
        message: 'N8 debate loopback requires the persisted N7ToN8 handoff artifact in frozen source_refs.',
      });
    }
    // n8_gate_result_hash is a digest of THIS loopback gate decision (route + trigger codes),
    // so it includes loopback_target_code to match the decision the attempt actually records.
    // It is a triggering-decision digest, not the attempt's final gate_result_hash (that hash
    // takes the feedback artifact as authority, so it can't be embedded in the feedback itself).
    const gateResultHash = this.outcomeGateResultHash(input, hashContext, {
      authorityHash: draftResolution.draftHash,
      blockerCodes: triggers.map((trigger) => trigger.code),
      gateStatus: 'blocked',
      loopbackTargetCode: 'n8_feedback_to_n7',
      routeDecision: 'loopback',
      warningCodes: [],
    });
    const feedbackPayload: TopicSelectionV1bN8ToN7FeedbackPayload = {
      feedback_class: 'gate_rejected',
      failure_reason_code: triggers[0]!.code,
      feedback_summary: triggers.map((trigger) => trigger.message).join(' '),
      affected_refs: uniqueRefs([
        payload.topic_question_contract_ref,
        payload.active_candidate_ref,
        payload.topic_question_candidate_set_ref,
      ]),
      previous_n7_handoff_ref: previousN7HandoffRef,
      previous_n7_handoff_hash: payload.n7_handoff_hash,
      previous_trial_ledger_ref: payload.trial_ledger_ref,
      previous_trial_ledger_hash: payload.trial_ledger_hash,
      failed_topic_question_contract_ref: payload.topic_question_contract_ref,
      failed_topic_question_contract_hash: payload.topic_question_contract_hash,
      failed_candidate_ref: payload.active_candidate_ref,
      failed_candidate_hash: payload.active_candidate_hash,
      topic_question_candidate_set_ref: payload.topic_question_candidate_set_ref,
      topic_question_candidate_set_hash: payload.topic_question_candidate_set_hash,
      n8_gate_result_hash: gateResultHash,
      value_assessment_ref: null,
      value_assessment_hash: null,
    };
    // Validate the producer against the SAME predicate N7's feedback_from_n8 re-entry uses
    // (resolveN7FeedbackPayload -> isN8ToN7FeedbackPayload), so a producer/validator key-set
    // drift fails loudly here at write time instead of silently dead-ending the loopback at N7.
    if (!this.isN8ToN7FeedbackPayload(feedbackPayload)) {
      throw new AppError(500, 'INTERNAL_ERROR', 'N8 debate loopback feedback payload does not satisfy the N8ToN7Feedback contract.');
    }
    const feedbackPayloadHash = this.hash(feedbackPayload);
    const artifact = await this.controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? payload.topic_question_contract_ref.title_card_id ?? null,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      workflow_run_id: input.workflow_run_id,
      payload: feedbackPayload as unknown as Record<string, unknown>,
      created_by: input.created_by ?? 'system',
    });
    const feedbackRef = this.ref('artifact_ref', artifact.artifact_ref_id, artifact.title_card_id ?? input.title_card_id ?? null);
    return this.persistAdmittedResult(input, hashContext, {
      additionalAuthorityRefs: [],
      authorityHash: feedbackPayloadHash,
      authorityRef: feedbackRef,
      blockers: triggers.map((trigger) => this.blocker(
        trigger.code,
        trigger.message,
        [payload.topic_question_contract_ref, payload.active_candidate_ref],
      )),
      errorCode: triggers[0]!.code,
      errorMessage: triggers[0]!.message,
      failureClass: 'semantic_non_pass',
      gateStatus: 'blocked',
      handoff: null,
      handoffHash: null,
      loopbackTargetCode: 'n8_feedback_to_n7',
      routeDecision: 'loopback',
      sourceRef: payload.topic_question_contract_ref,
      targetRef: feedbackRef,
      tracePhase: 'T-123 N8 debate trigger loopback',
      tracePayload: {
        loopback_target_code: 'n8_feedback_to_n7',
        n8_feedback_ref: feedbackRef,
        n8_feedback_record_hash: this.hash(artifact),
        n8_feedback_payload_hash: feedbackPayloadHash,
        trigger_codes: triggers.map((trigger) => trigger.code),
      },
      transitionKey: 'topic-selection.v1b.harness.n8-debate-trigger-loopback',
      warnings: [],
    }, {
      writeAuthority: async () => {},
    });
  }

  private isN8ValueGateResult(value: unknown): boolean {
    if (!this.isRecord(value)) {
      return false;
    }
    return this.hasOnlyKeys(value, ['gate_key', 'verdict', 'severity', 'overridable_with_risk', 'rationale', 'refs'])
      && (TOPIC_SELECTION_VALUE_GATE_KEYS as readonly string[]).includes(value.gate_key as string)
      && (TOPIC_SELECTION_VALUE_GATE_VERDICTS as readonly string[]).includes(value.verdict as string)
      && ['info', 'warning', 'blocking'].includes(value.severity as string)
      && typeof value.overridable_with_risk === 'boolean'
      && typeof value.rationale === 'string'
      && this.isFunctionalRefArray(value.refs);
  }

  private isN8ValueDimensionScore(value: unknown): boolean {
    if (!this.isRecord(value)) {
      return false;
    }
    return this.hasOnlyKeys(value, ['dimension_key', 'score', 'rationale', 'evidence_refs', 'uncertainty'])
      && (TOPIC_SELECTION_VALUE_DIMENSIONS as readonly string[]).includes(value.dimension_key as string)
      && typeof value.score === 'number'
      && Number.isFinite(value.score)
      && value.score >= 0
      && value.score <= 100
      && typeof value.rationale === 'string'
      && this.isFunctionalRefArray(value.evidence_refs)
      && typeof value.uncertainty === 'string';
  }

  private n8KnownRefs(loaded: N8LoadedContext): TopicSelectionFunctionalRef[] {
    return uniqueRefs([
      this.ref('topic_question', loaded.question.topic_question_id, loaded.question.title_card_id),
      this.ref('topic_question_contract', loaded.contract.topic_question_contract_id, loaded.contract.title_card_id, loaded.contract.version),
      this.ref('topic_question_answerability_plan', loaded.answerabilityPlan.topic_question_answerability_plan_id, loaded.answerabilityPlan.title_card_id),
      this.ref('topic_question_selection_decision', loaded.selectionDecision.topic_question_selection_decision_id, loaded.selectionDecision.title_card_id),
      this.ref('topic_question_candidate_set', loaded.candidateSet.topic_question_candidate_set_id, loaded.candidateSet.title_card_id),
      this.ref('topic_question_candidate', loaded.candidate.topic_question_candidate_id, loaded.candidate.title_card_id),
      this.ref('research_slice', loaded.researchSlice.research_slice_id, loaded.researchSlice.title_card_id, loaded.researchSlice.slice_version),
      ...loaded.needRefs.map((record) => record.validated_need_ref),
      ...loaded.evidenceRefs.map((record) => record.evidence_ref),
      ...loaded.evidenceRefs.map((record) => this.ref('topic_question_evidence_ref', record.topic_question_evidence_ref_id, record.title_card_id)),
      ...loaded.contract.accepted_risk_refs,
      ...loaded.researchSlice.memory_suggestion_refs,
      ...loaded.researchSlice.recheck_request_refs,
    ]);
  }

  private n8DraftRefs(draft: TopicSelectionAssessTopicValueLlmOutput): TopicSelectionFunctionalRef[] {
    return uniqueRefs([
      ...draft.accepted_risk_refs,
      ...draft.blocker_refs,
      ...draft.hard_gates.flatMap((gate) => gate.refs),
      ...draft.dimension_scores.flatMap((score) => score.evidence_refs),
      ...draft.reasoning_memo.cited_refs,
    ]);
  }

  /** Maps a debate-trigger code to its post-debate warning code; exhaustive (no catch-all). */
  private static readonly N8_AFTER_DEBATE_WARNING_BY_TRIGGER: Record<string, string> = {
    N8_VALUE_BORDERLINE_DEBATE_TRIGGER: 'N8_VALUE_BORDERLINE_AFTER_DEBATE',
    N8_DIMENSION_CONFLICT_DEBATE_TRIGGER: 'N8_DIMENSION_CONFLICT_AFTER_DEBATE',
  };

  private n8Warnings(
    draft: TopicSelectionAssessTopicValueLlmOutput,
    loaded: N8LoadedContext,
    postDebateTriggers: Array<{ code: string; message: string }> = [],
    provisionalThresholdsInProduct = false,
  ): TopicSelectionGateIssue[] {
    const warnings: TopicSelectionGateIssue[] = [];
    if (provisionalThresholdsInProduct) {
      warnings.push(this.warning(
        'N8_DEBATE_THRESHOLDS_PROVISIONAL',
        'N8 debate-trigger thresholds are still provisional (DP-3.3) and governed a product run; calibrate against near-prod deep-test data.',
      ));
    }
    // DP-3.2: a non-first-pass re-assessment still inside a trigger band admits with a warning
    // (no further loopback). Exhaustive code map — an unknown trigger throws rather than being
    // silently relabeled as a dimension-conflict warning.
    for (const trigger of postDebateTriggers) {
      const warningCode = TopicSelectionV1bWorkflowHarnessService.N8_AFTER_DEBATE_WARNING_BY_TRIGGER[trigger.code];
      if (!warningCode) {
        throw new AppError(500, 'INTERNAL_ERROR', `N8 has no after-debate warning code for trigger ${trigger.code}.`);
      }
      warnings.push(this.warning(warningCode, trigger.message));
    }
    if (draft.accepted_risk_refs.length > 0 || loaded.contract.accepted_risk_refs.length > 0) {
      warnings.push(this.warning('N8_RESIDUAL_RISK_CARRIED_FORWARD', 'N8 value assessment carries accepted risk refs forward.', draft.accepted_risk_refs));
    }
    if (draft.hard_gates.some((gate) => gate.verdict !== 'pass') || !['ready', 'ready_with_accepted_risk'].includes(draft.readiness_status)) {
      warnings.push(this.warning('N8_VALUE_GAP_CARRIED_FORWARD', 'N8 value assessment carries value gate gaps or non-ready readiness forward.'));
    }
    if (draft.risk_notes.length > 0 || draft.reasoning_memo.reviewer_risks.length > 0) {
      warnings.push(this.warning('N8_VALUE_RISK_NOTES_CARRIED_FORWARD', 'N8 value assessment carries risk notes forward.', draft.reasoning_memo.cited_refs));
    }
    if (draft.reasoning_memo.requires_critic_review || draft.reasoning_memo.critic_triggers.length > 0) {
      warnings.push(this.warning('N8_CRITIC_REVIEW_TRIGGERED', 'N8 value memo requested critic review.', draft.reasoning_memo.cited_refs));
    }
    return uniqueIssues(warnings);
  }

  private n8QualityFlags(draft: TopicSelectionAssessTopicValueLlmOutput): string[] {
    return uniqueStrings([
      draft.readiness_status !== 'ready' ? `readiness:${draft.readiness_status}` : '',
      draft.recommended_disposition !== 'advance_to_package' ? `disposition:${draft.recommended_disposition}` : '',
      ...draft.hard_gates.filter((gate) => gate.verdict !== 'pass').map((gate) => `gate:${gate.gate_key}:${gate.verdict}`),
    ].filter(Boolean));
  }

  private buildN8ValueEvidenceRefs(input: {
    assessmentId: string;
    contractId: string;
    evidenceRefs: TopicSelectionTopicQuestionEvidenceRefRecord[];
    titleCardId: string;
    workspaceId: string | null;
  }): TopicSelectionTopicValueEvidenceRefRecord[] {
    return input.evidenceRefs.map((evidenceRef) => ({
      topic_value_evidence_ref_id: this.idFactory('topic_value_evidence_ref'),
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      topic_value_assessment_id: input.assessmentId,
      topic_question_contract_id: input.contractId,
      evidence_ref: evidenceRef.evidence_ref,
      evidence_role: evidenceRef.evidence_role,
      value_use: evidenceRef.mapped_question_part,
      rationale: evidenceRef.rationale,
      created_at: this.now(),
    }));
  }

  private n8ResearchSliceSnapshot(slice: TopicSelectionResearchSliceRecord): Record<string, unknown> {
    return {
      research_slice_id: slice.research_slice_id,
      slice_version: slice.slice_version,
      slice_statement: slice.slice_statement,
      target_setting: slice.target_setting,
      target_community: slice.target_community,
      contribution_type_candidate: slice.preferred_contribution_type ?? slice.candidate_contribution_types[0] ?? null,
      evaluation_path: slice.evaluation_path,
      expected_claim: slice.expected_claim,
      fallback_claim: slice.fallback_claim,
      accepted_risk_refs: slice.accepted_risk_refs,
      memory_suggestion_refs: slice.memory_suggestion_refs,
      recheck_request_refs: slice.recheck_request_refs,
      non_goals: slice.non_goals,
    };
  }

  private parseN9Payload(
    payload: Record<string, unknown>,
  ): { ok: true; value: TopicSelectionV1bN9HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
    if (!this.hasOnlyKeys(payload, [
      'n8_handoff_hash',
      'topic_value_assessment_ref',
      'topic_value_assessment_hash',
      'topic_question_contract_ref',
      'topic_question_contract_hash',
      'value_reasoning_memo_ref',
      'value_reasoning_memo_hash',
      'recommended_disposition',
    ])
      || !this.isHash(payload.n8_handoff_hash)
      || !this.isFunctionalRefValue(payload.topic_value_assessment_ref)
      || !this.isHash(payload.topic_value_assessment_hash)
      || !this.isFunctionalRefValue(payload.topic_question_contract_ref)
      || !this.isHash(payload.topic_question_contract_hash)
      || !this.isFunctionalRefValue(payload.value_reasoning_memo_ref)
      || !this.isHash(payload.value_reasoning_memo_hash)
      || !['advance_to_package', 'refine_question', 'refine_slice', 'recheck_evidence_or_search', 'park', 'drop']
        .includes(payload.recommended_disposition as string)) {
      return {
        ok: false,
        code: 'N9_FROZEN_PAYLOAD_INVALID',
        message: 'N9 requires frozen N8 assessment, memo, and disposition hashes.',
      };
    }
    return { ok: true, value: payload as unknown as TopicSelectionV1bN9HarnessFrozenInputPayload };
  }

  private async loadN9Context(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN9HarnessFrozenInputPayload,
  ): Promise<{ ok: true; value: N9LoadedContext } | { ok: false; code: string; message: string }> {
    const n8Handoff = await this.resolveSourceHandoff(input, 'N8ToN9Handoff', payload.n8_handoff_hash, 'N9');
    if (!n8Handoff.ok) return n8Handoff;
    const repository = this.runnerDependencies.valueAssessmentRepository!;
    const [assessment, memo] = await Promise.all([
      repository.findAssessmentById(payload.topic_value_assessment_ref.ref_id),
      repository.findReasoningMemoById(payload.value_reasoning_memo_ref.ref_id),
    ]);
    if (!assessment || !memo) {
      return {
        ok: false,
        code: 'N9_VALUE_ASSESSMENT_CONTEXT_NOT_FOUND',
        message: 'N9 frozen assessment or memo refs do not resolve.',
      };
    }
    const [inputSnapshot, evidenceRefs] = await Promise.all([
      repository.findInputSnapshotById(assessment.topic_value_input_snapshot_id),
      repository.listEvidenceRefsByAssessmentId(assessment.topic_value_assessment_id),
    ]);
    if (!inputSnapshot) {
      return {
        ok: false,
        code: 'N9_VALUE_INPUT_SNAPSHOT_NOT_FOUND',
        message: 'N9 value assessment is missing its frozen input snapshot.',
      };
    }
    return {
      ok: true,
      value: {
        assessment,
        evidenceRefs,
        inputSnapshot,
        memo,
        n8Handoff: n8Handoff.value,
      },
    };
  }

  private n9LineageBlocker(
    payload: TopicSelectionV1bN9HarnessFrozenInputPayload,
    loaded: N9LoadedContext,
  ): { code: string; message: string } | null {
    const handoffPayload = loaded.n8Handoff.payload as TopicSelectionV1bN8ToN9HandoffPayload;
    if (
      handoffPayload.topic_value_assessment_hash !== payload.topic_value_assessment_hash
      || handoffPayload.topic_question_contract_hash !== payload.topic_question_contract_hash
      || !this.refsEqual(handoffPayload.topic_value_assessment_ref, payload.topic_value_assessment_ref)
      || !this.refsEqual(handoffPayload.topic_question_contract_ref, payload.topic_question_contract_ref)
    ) {
      return {
        code: 'N9_N8_HANDOFF_PAYLOAD_MISMATCH',
        message: 'N9 frozen payload does not match the persisted N8-to-N9 handoff artifact.',
      };
    }
    if (this.hashN8ValueAssessmentAuthority(loaded.assessment) !== payload.topic_value_assessment_hash) {
      return {
        code: 'N9_VALUE_ASSESSMENT_HASH_MISMATCH',
        message: 'N9 assessment hash does not match persisted TopicValueAssessment authority.',
      };
    }
    if (this.hashN8ValueReasoningMemoAuthority(loaded.memo) !== payload.value_reasoning_memo_hash) {
      return {
        code: 'N9_VALUE_REASONING_MEMO_HASH_MISMATCH',
        message: 'N9 value memo hash does not match persisted memo authority.',
      };
    }
    if (loaded.memo.recommendation !== payload.recommended_disposition) {
      return {
        code: 'N9_MEMO_RECOMMENDATION_MISMATCH',
        message: 'N9 frozen recommended disposition must match the persisted reasoning memo recommendation.',
      };
    }
    if (loaded.assessment.topic_question_contract_id !== payload.topic_question_contract_ref.ref_id
      || loaded.memo.topic_question_contract_id !== payload.topic_question_contract_ref.ref_id
      || loaded.memo.topic_value_assessment_id !== loaded.assessment.topic_value_assessment_id) {
      return {
        code: 'N9_VALUE_LINEAGE_MISMATCH',
        message: 'N9 assessment, memo, and contract lineage does not match the frozen N8 handoff.',
      };
    }
    return null;
  }

  private n9AdvanceBlocker(
    loaded: N9LoadedContext,
  ): { code: string; message: string } | null {
    if (!['ready', 'ready_with_accepted_risk'].includes(loaded.assessment.readiness_status)) {
      return {
        code: 'N9_VALUE_NOT_READY_FOR_PACKAGE',
        message: 'N9 cannot advance a non-ready TopicValueAssessment to package creation.',
      };
    }
    const blockingGate = loaded.assessment.hard_gates.find((gate) => gate.verdict === 'fail' && gate.severity === 'blocking');
    if (blockingGate) {
      return {
        code: 'N9_BLOCKING_VALUE_GATE',
        message: `N9 cannot advance while value gate ${blockingGate.gate_key} has a blocking failure.`,
      };
    }
    if (loaded.assessment.blocker_refs.length > 0) {
      return {
        code: 'N9_VALUE_BLOCKER_REFS_PRESENT',
        message: 'N9 cannot advance when TopicValueAssessment carries blocker refs.',
      };
    }
    return null;
  }

  private n9LoopbackTargetRef(
    disposition: TopicSelectionValueDisposition,
    loaded: N9LoadedContext,
  ): TopicSelectionFunctionalRef | null {
    switch (disposition) {
      case 'refine_question':
        return loaded.inputSnapshot.topic_question_contract_ref;
      case 'refine_slice':
        return loaded.inputSnapshot.research_slice_ref;
      case 'recheck_evidence_or_search':
        return loaded.inputSnapshot.recheck_request_refs[0] ?? loaded.inputSnapshot.topic_question_contract_ref;
      case 'park':
      case 'drop':
      case 'advance_to_package':
        return null;
    }
  }

  private buildN9PackageDraftInput(input: {
    decision: Omit<TopicSelectionValueDispositionDecisionRecord, 'package_draft_input'>;
    loaded: N9LoadedContext;
    memoRef: TopicSelectionFunctionalRef;
    decisionRef: TopicSelectionFunctionalRef;
  }): TopicSelectionV1bPackageDraftInput {
    const { decision, loaded } = input;
    return {
      topic_value_assessment_ref: this.ref('topic_value_assessment', loaded.assessment.topic_value_assessment_id, loaded.assessment.title_card_id),
      value_reasoning_memo_ref: input.memoRef,
      value_disposition_decision_ref: input.decisionRef,
      topic_question_ref: loaded.inputSnapshot.topic_question_ref,
      topic_question_contract_ref: loaded.inputSnapshot.topic_question_contract_ref,
      answerability_plan_ref: loaded.inputSnapshot.answerability_plan_ref,
      research_slice_ref: loaded.inputSnapshot.research_slice_ref,
      validated_need_refs: loaded.inputSnapshot.validated_need_refs,
      evidence_refs: loaded.inputSnapshot.evidence_refs,
      boundary_refs: loaded.inputSnapshot.boundary_refs,
      assumption_refs: loaded.inputSnapshot.assumption_refs,
      falsification_conditions: loaded.inputSnapshot.falsification_conditions,
      accepted_risk_refs: loaded.assessment.accepted_risk_refs,
      memory_suggestion_refs: loaded.inputSnapshot.memory_suggestion_refs,
      recheck_request_refs: loaded.inputSnapshot.recheck_request_refs,
      topic_value_assessment: loaded.assessment,
      value_reasoning_memo: loaded.memo,
      value_disposition_decision: decision,
      question_contract: loaded.inputSnapshot.question_contract,
      answerability_plan: loaded.inputSnapshot.answerability_plan,
      research_slice_snapshot: loaded.inputSnapshot.research_slice_snapshot,
    };
  }

  private n9Warnings(
    decision: TopicSelectionValueDispositionDecisionRecord,
    loaded: N9LoadedContext,
  ): TopicSelectionGateIssue[] {
    const warnings: TopicSelectionGateIssue[] = [];
    if (decision.accepted_risk_refs.length > 0) {
      warnings.push(this.warning('N9_ACCEPTED_RISK_CARRIED_FORWARD', 'N9 disposition carries accepted risk refs forward.', decision.accepted_risk_refs));
    }
    if (loaded.assessment.hard_gates.some((gate) => gate.verdict === 'pass_with_risk')) {
      warnings.push(this.warning('N9_ADVANCE_WITH_VALUE_GATE_RISK', 'N9 disposition advances with pass_with_risk value gates.'));
    }
    if (loaded.assessment.risk_notes.length > 0 || loaded.memo.reviewer_risks.length > 0) {
      warnings.push(this.warning('N9_VALUE_RISK_NOTES_CARRIED_FORWARD', 'N9 disposition carries value risk notes forward.', decision.accepted_risk_refs));
    }
    return warnings;
  }

  private parseN10Payload(
    payload: Record<string, unknown>,
  ): { ok: true; value: TopicSelectionV1bN10HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
    if (!this.hasOnlyKeys(payload, [
      'n9_handoff_hash',
      'value_disposition_ref',
      'value_disposition_hash',
      'advance_disposition',
      'topic_value_assessment_ref',
      'topic_value_assessment_hash',
    ])
      || !this.isHash(payload.n9_handoff_hash)
      || !this.isFunctionalRefValue(payload.value_disposition_ref)
      || !this.isHash(payload.value_disposition_hash)
      || payload.advance_disposition !== true
      || !this.isFunctionalRefValue(payload.topic_value_assessment_ref)
      || !this.isHash(payload.topic_value_assessment_hash)) {
      return {
        ok: false,
        code: 'N10_FROZEN_PAYLOAD_INVALID',
        message: 'N10 requires frozen advance disposition and value assessment lineage.',
      };
    }
    return { ok: true, value: payload as unknown as TopicSelectionV1bN10HarnessFrozenInputPayload };
  }

  private async loadN10Context(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN10HarnessFrozenInputPayload,
  ): Promise<{ ok: true; value: N10LoadedContext } | { ok: false; code: string; message: string }> {
    const n9Handoff = await this.resolveSourceHandoff(input, 'N9ToN10Handoff', payload.n9_handoff_hash, 'N10');
    if (!n9Handoff.ok) return n9Handoff;
    const decision = await this.runnerDependencies.valueAssessmentRepository!
      .findDispositionDecisionById(payload.value_disposition_ref.ref_id);
    if (!decision) {
      return {
        ok: false,
        code: 'N10_VALUE_DISPOSITION_NOT_FOUND',
        message: 'N10 frozen value disposition ref does not resolve.',
      };
    }
    return {
      ok: true,
      value: {
        decision,
        n9Handoff: n9Handoff.value,
      },
    };
  }

  private n10LineageBlocker(
    payload: TopicSelectionV1bN10HarnessFrozenInputPayload,
    loaded: N10LoadedContext,
  ): { code: string; message: string } | null {
    const handoffPayload = loaded.n9Handoff.payload as TopicSelectionV1bN9ToN10HandoffPayload;
    if (
      handoffPayload.value_disposition_hash !== payload.value_disposition_hash
      || handoffPayload.topic_value_assessment_hash !== payload.topic_value_assessment_hash
      || handoffPayload.advance_disposition !== true
      || !this.refsEqual(handoffPayload.value_disposition_ref, payload.value_disposition_ref)
      || !this.refsEqual(handoffPayload.topic_value_assessment_ref, payload.topic_value_assessment_ref)
    ) {
      return {
        code: 'N10_N9_HANDOFF_PAYLOAD_MISMATCH',
        message: 'N10 frozen payload does not match the persisted N9-to-N10 handoff artifact.',
      };
    }
    if (loaded.decision.decision !== 'advance_to_package' || !loaded.decision.package_draft_input) {
      return {
        code: 'N10_NON_ADVANCE_DISPOSITION',
        message: 'N10 can only create a draft package from an advance_to_package disposition with package draft input.',
      };
    }
    if (this.hashN9DispositionAuthority(loaded.decision) !== payload.value_disposition_hash) {
      return {
        code: 'N10_VALUE_DISPOSITION_HASH_MISMATCH',
        message: 'N10 value disposition hash does not match persisted authority.',
      };
    }
    return null;
  }

  private buildN10PackagePersistence(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    decision: TopicSelectionValueDispositionDecisionRecord,
  ): { ok: true; value: {
    readiness: TopicSelectionTopicPackageReadinessAssessmentRecord;
    topicPackage: TopicSelectionTopicPackageRecord;
    traceCheck: TopicSelectionPackageTraceBoundaryCheckRecord;
    v1cInputBundle: TopicSelectionV1bToV1cInputBundleRecord | null;
  } } | { ok: false; code: string; message: string } {
    const packageInput = decision.package_draft_input;
    if (!packageInput) {
      return {
        ok: false,
        code: 'N10_PACKAGE_DRAFT_INPUT_MISSING',
        message: 'N10 advance disposition is missing package_draft_input.',
      };
    }
    const now = this.now();
    const titleCardId = decision.title_card_id;
    const workspaceId = decision.workspace_id ?? null;
    const topicPackageId = this.idFactory('topic_package');
    const researchRecordId = this.idFactory('topic_research_record');
    const traceCheckId = this.idFactory('package_trace_boundary_check');
    const readinessId = this.idFactory('package_readiness_assessment');
    const bundleId = this.idFactory('v1b_to_v1c_input_bundle');
    const packageVersion = 'v1';
    const packageRef = this.ref('topic_package', topicPackageId, titleCardId, packageVersion);
    const selectedEvidenceRefs = uniqueRefs(packageInput.evidence_refs.map((record) => record.evidence_ref));
    const narrative = this.n10Narrative(packageInput);
    const topicPackage: TopicSelectionTopicPackageRecord = {
      topic_package_id: topicPackageId,
      workspace_id: workspaceId,
      title_card_id: titleCardId,
      research_record_id: researchRecordId,
      topic_question_id: packageInput.topic_question_ref.ref_id,
      topic_question_contract_id: packageInput.topic_question_contract_ref.ref_id,
      topic_value_assessment_id: packageInput.topic_value_assessment_ref.ref_id,
      value_reasoning_memo_id: packageInput.value_reasoning_memo_ref.ref_id,
      value_disposition_decision_id: decision.value_disposition_decision_id,
      research_slice_id: packageInput.research_slice_ref.ref_id,
      research_slice_version: packageInput.research_slice_ref.version_id ?? 'v1',
      package_version: packageVersion,
      package_readiness_status: 'ready_for_promotion_review',
      topic_package_ref: packageRef,
      topic_value_assessment_ref: packageInput.topic_value_assessment_ref,
      value_reasoning_memo_ref: packageInput.value_reasoning_memo_ref,
      value_disposition_decision_ref: packageInput.value_disposition_decision_ref,
      topic_question_ref: packageInput.topic_question_ref,
      topic_question_contract_ref: packageInput.topic_question_contract_ref,
      answerability_plan_ref: packageInput.answerability_plan_ref,
      research_slice_ref: packageInput.research_slice_ref,
      validated_need_refs: packageInput.validated_need_refs,
      evidence_refs: packageInput.evidence_refs,
      selected_evidence_refs: selectedEvidenceRefs,
      accepted_risk_refs: packageInput.accepted_risk_refs,
      blocker_refs: packageInput.topic_value_assessment.blocker_refs,
      memory_suggestion_refs: packageInput.memory_suggestion_refs,
      recheck_request_refs: packageInput.recheck_request_refs,
      title_candidates: narrative.titleCandidates,
      research_background: narrative.researchBackground,
      contribution_summary: narrative.contributionSummary,
      candidate_methods: narrative.candidateMethods,
      evaluation_plan: narrative.evaluationPlan,
      key_risks: narrative.keyRisks,
      non_goals: narrative.nonGoals,
      selected_literature_evidence_ids: selectedEvidenceRefs.map((ref) => ref.ref_id),
      package_payload: {
        deterministic_source: 'topic_selection_v1b_harness_n10',
        package_draft_input_hash: this.hash(packageInput),
        workflow_run_id: input.workflow_run_id,
      },
      trace_boundary_check_id: traceCheckId,
      readiness_assessment_id: readinessId,
      v1c_input_bundle_id: bundleId,
      trace_snapshot_id: null,
      input_snapshot_id: null,
      workflow_run_id: input.workflow_run_id,
      gate_result_id: null,
      transition_attempt_id: null,
      artifact_refs: [],
      created_by: input.created_by ?? 'system',
      created_at: now,
      updated_at: now,
    };
    const packageTraceRef = this.ref('package_trace_boundary_check', traceCheckId, titleCardId);
    const readinessRef = this.ref('topic_package_readiness_assessment', readinessId, titleCardId);
    const traceCheck: TopicSelectionPackageTraceBoundaryCheckRecord = {
      package_trace_boundary_check_id: traceCheckId,
      workspace_id: workspaceId,
      title_card_id: titleCardId,
      topic_package_id: topicPackageId,
      value_disposition_decision_id: decision.value_disposition_decision_id,
      topic_value_assessment_id: packageInput.topic_value_assessment_ref.ref_id,
      topic_question_contract_id: packageInput.topic_question_contract_ref.ref_id,
      research_slice_id: packageInput.research_slice_ref.ref_id,
      check_status: 'passed',
      package_ref: packageRef,
      topic_value_assessment_ref: packageInput.topic_value_assessment_ref,
      value_reasoning_memo_ref: packageInput.value_reasoning_memo_ref,
      value_disposition_decision_ref: packageInput.value_disposition_decision_ref,
      topic_question_ref: packageInput.topic_question_ref,
      topic_question_contract_ref: packageInput.topic_question_contract_ref,
      answerability_plan_ref: packageInput.answerability_plan_ref,
      research_slice_ref: packageInput.research_slice_ref,
      validated_need_refs: packageInput.validated_need_refs,
      evidence_refs: selectedEvidenceRefs,
      accepted_risk_refs: packageInput.accepted_risk_refs,
      blocker_refs: packageInput.topic_value_assessment.blocker_refs,
      recheck_request_refs: packageInput.recheck_request_refs,
      missing_ref_codes: [],
      new_ref_codes: [],
      boundary_conflict_codes: [],
      carry_forward_codes: this.n10CarryForwardCodes(topicPackage),
      trace_issues: [],
      boundary_issues: [],
      narrative_consistency: {
        deterministic: true,
        evidence_ref_count: selectedEvidenceRefs.length,
      },
      input_snapshot_id: null,
      workflow_run_id: input.workflow_run_id,
      gate_result_id: null,
      transition_attempt_id: null,
      artifact_refs: [],
      created_at: now,
    };
    const readiness: TopicSelectionTopicPackageReadinessAssessmentRecord = {
      package_readiness_assessment_id: readinessId,
      workspace_id: workspaceId,
      title_card_id: titleCardId,
      topic_package_id: topicPackageId,
      value_disposition_decision_id: decision.value_disposition_decision_id,
      package_trace_boundary_check_id: traceCheckId,
      package_version: packageVersion,
      package_readiness_status: 'ready_for_promotion_review',
      blockers: [],
      warnings: this.n10Warnings(topicPackage),
      required_actions: [],
      accepted_risk_refs: topicPackage.accepted_risk_refs,
      blocker_refs: topicPackage.blocker_refs,
      recheck_request_refs: topicPackage.recheck_request_refs,
      input_snapshot_id: null,
      workflow_run_id: input.workflow_run_id,
      gate_result_id: null,
      transition_attempt_id: null,
      artifact_refs: [],
      assessed_by: input.created_by ?? 'system',
      created_at: now,
    };
    const v1cInputBundle: TopicSelectionV1bToV1cInputBundleRecord = {
      v1b_to_v1c_input_bundle_id: bundleId,
      workspace_id: workspaceId,
      title_card_id: titleCardId,
      topic_package_id: topicPackageId,
      package_version: packageVersion,
      package_readiness_status: 'ready_for_promotion_review',
      bundle_status: 'ready_for_promotion_review',
      topic_package_ref: packageRef,
      package_trace_boundary_check_ref: packageTraceRef,
      package_readiness_assessment_ref: readinessRef,
      topic_value_assessment_ref: packageInput.topic_value_assessment_ref,
      value_reasoning_memo_ref: packageInput.value_reasoning_memo_ref,
      value_disposition_decision_ref: packageInput.value_disposition_decision_ref,
      topic_question_ref: packageInput.topic_question_ref,
      topic_question_contract_ref: packageInput.topic_question_contract_ref,
      answerability_plan_ref: packageInput.answerability_plan_ref,
      research_slice_ref: packageInput.research_slice_ref,
      validated_need_refs: packageInput.validated_need_refs,
      evidence_refs: packageInput.evidence_refs,
      accepted_risk_refs: packageInput.accepted_risk_refs,
      blocker_refs: packageInput.topic_value_assessment.blocker_refs,
      memory_suggestion_refs: packageInput.memory_suggestion_refs,
      recheck_request_refs: packageInput.recheck_request_refs,
      readiness_check_refs: [packageTraceRef, readinessRef],
      package_snapshot: topicPackage,
      package_draft_input_snapshot: packageInput,
      bundle_hash: this.hash({
        package_ref: packageRef,
        package_readiness_assessment_ref: readinessRef,
        package_trace_boundary_check_ref: packageTraceRef,
        value_disposition_decision_ref: packageInput.value_disposition_decision_ref,
      }),
      input_snapshot_id: null,
      workflow_run_id: input.workflow_run_id,
      gate_result_id: null,
      transition_attempt_id: null,
      artifact_refs: [],
      created_at: now,
    };
    return {
      ok: true,
      value: {
        readiness,
        topicPackage,
        traceCheck,
        v1cInputBundle,
      },
    };
  }

  private n10Narrative(input: TopicSelectionV1bPackageDraftInput): {
    candidateMethods: string[];
    contributionSummary: string;
    evaluationPlan: string;
    keyRisks: string[];
    nonGoals: string[];
    researchBackground: string;
    titleCandidates: string[];
  } {
    return {
      titleCandidates: uniqueStrings([
        input.question_contract.main_question.replace(/\?$/u, ''),
        `${input.question_contract.contribution_hypothesis}: ${input.question_contract.expected_claim}`,
      ]).slice(0, 3),
      researchBackground: [
        `Target setting: ${input.question_contract.target_setting}.`,
        `Target community: ${input.question_contract.target_community}.`,
        input.value_reasoning_memo.significance,
        input.value_reasoning_memo.originality,
      ].join(' '),
      contributionSummary: [
        input.value_reasoning_memo.value_thesis,
        `Strongest claim: ${input.topic_value_assessment.strongest_claim_if_success}.`,
        input.topic_value_assessment.fallback_claim_if_success
          ? `Fallback claim: ${input.topic_value_assessment.fallback_claim_if_success}.`
          : '',
      ].filter(Boolean).join(' '),
      candidateMethods: uniqueStrings([
        ...input.answerability_plan.datasets_or_resources.map((item) => `Resource: ${item}`),
        ...input.answerability_plan.metrics.map((item) => `Metric: ${item}`),
        ...input.answerability_plan.baselines.map((item) => `Baseline: ${item}`),
        ...input.answerability_plan.ablations_or_comparisons.map((item) => `Comparison: ${item}`),
        input.answerability_plan.evaluation_setting,
      ].filter(Boolean)),
      evaluationPlan: [
        input.answerability_plan.evaluation_setting,
        input.answerability_plan.datasets_or_resources.length > 0
          ? `Datasets/resources: ${input.answerability_plan.datasets_or_resources.join('; ')}.`
          : '',
        input.answerability_plan.metrics.length > 0
          ? `Metrics: ${input.answerability_plan.metrics.join('; ')}.`
          : '',
        input.answerability_plan.baselines.length > 0
          ? `Baselines: ${input.answerability_plan.baselines.join('; ')}.`
          : '',
      ].filter(Boolean).join(' '),
      keyRisks: uniqueStrings([
        ...input.topic_value_assessment.risk_notes,
        ...input.value_reasoning_memo.reviewer_risks,
        ...input.value_reasoning_memo.top_objections,
        ...input.answerability_plan.dependency_risks,
        ...input.answerability_plan.open_dependencies,
        ...input.answerability_plan.known_gaps,
        ...input.falsification_conditions.map((condition) => `${condition.condition_type}: ${condition.statement}`),
      ]),
      nonGoals: uniqueStrings(input.question_contract.prohibited_claims),
    };
  }

  private n10CarryForwardCodes(pkg: TopicSelectionTopicPackageRecord): string[] {
    return [
      pkg.accepted_risk_refs.length > 0 ? 'accepted_risks_carried_forward' : '',
      pkg.blocker_refs.length > 0 ? 'blockers_carried_forward' : '',
      pkg.recheck_request_refs.length > 0 ? 'recheck_requests_carried_forward' : '',
    ].filter(Boolean);
  }

  private n10Warnings(pkg: TopicSelectionTopicPackageRecord): TopicSelectionGateIssue[] {
    const warnings: TopicSelectionGateIssue[] = [];
    if (pkg.accepted_risk_refs.length > 0) {
      warnings.push(this.warning('N10_ACCEPTED_RISK_CARRIED_FORWARD', 'N10 package carries accepted risk refs forward.', pkg.accepted_risk_refs));
    }
    if (pkg.recheck_request_refs.length > 0) {
      warnings.push(this.warning('N10_RECHECK_REFS_CARRIED_FORWARD', 'N10 package carries recheck request refs forward.', pkg.recheck_request_refs));
    }
    if (pkg.key_risks.length > 0) {
      warnings.push(this.warning('N10_PACKAGE_RISKS_CARRIED_FORWARD', 'N10 package carries key risks forward.', pkg.topic_value_assessment_ref ? [pkg.topic_value_assessment_ref] : []));
    }
    return warnings;
  }

  private parseN11Payload(
    payload: Record<string, unknown>,
  ): { ok: true; value: TopicSelectionV1bN11HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
    if (!this.hasOnlyKeys(payload, [
      'n10_handoff_hash',
      'draft_topic_package_ref',
      'draft_topic_package_hash',
      'value_disposition_ref',
      'value_disposition_hash',
      'v1c_input_bundle_ref',
      'v1c_input_bundle_hash',
    ])
      || !this.isHash(payload.n10_handoff_hash)
      || !this.isFunctionalRefValue(payload.draft_topic_package_ref)
      || !this.isHash(payload.draft_topic_package_hash)
      || !this.isFunctionalRefValue(payload.value_disposition_ref)
      || !this.isHash(payload.value_disposition_hash)
      || !this.isFunctionalRefValue(payload.v1c_input_bundle_ref)
      || !this.isHash(payload.v1c_input_bundle_hash)) {
      return {
        ok: false,
        code: 'N11_FROZEN_PAYLOAD_INVALID',
        message: 'N11 requires frozen package, disposition, and v1c input bundle refs and hashes.',
      };
    }
    return { ok: true, value: payload as unknown as TopicSelectionV1bN11HarnessFrozenInputPayload };
  }

  private async loadN11Context(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN11HarnessFrozenInputPayload,
  ): Promise<{ ok: true; value: N11LoadedContext } | { ok: false; code: string; message: string }> {
    const n10Handoff = await this.resolveSourceHandoff(input, 'N10ToN11Handoff', payload.n10_handoff_hash, 'N11');
    if (!n10Handoff.ok) return n10Handoff;
    const repository = this.runnerDependencies.topicPackageRepository!;
    const [packageRecord, bundle] = await Promise.all([
      repository.findPackageById(payload.draft_topic_package_ref.ref_id),
      repository.findV1cInputBundleById(payload.v1c_input_bundle_ref.ref_id),
    ]);
    if (!packageRecord || !bundle) {
      return {
        ok: false,
        code: 'N11_PACKAGE_OR_BUNDLE_NOT_FOUND',
        message: 'N11 frozen package or v1c input bundle refs do not resolve.',
      };
    }
    return {
      ok: true,
      value: {
        bundle,
        n10Handoff: n10Handoff.value,
        packageRecord,
      },
    };
  }

  private n11LineageBlocker(
    payload: TopicSelectionV1bN11HarnessFrozenInputPayload,
    loaded: N11LoadedContext,
  ): { code: string; message: string } | null {
    const handoffPayload = loaded.n10Handoff.payload as TopicSelectionV1bN10ToN11HandoffPayload;
    if (
      handoffPayload.draft_topic_package_hash !== payload.draft_topic_package_hash
      || handoffPayload.value_disposition_hash !== payload.value_disposition_hash
      || !this.refsEqual(handoffPayload.draft_topic_package_ref, payload.draft_topic_package_ref)
      || !this.refsEqual(handoffPayload.value_disposition_ref, payload.value_disposition_ref)
    ) {
      return {
        code: 'N11_N10_HANDOFF_PAYLOAD_MISMATCH',
        message: 'N11 frozen payload does not match the persisted N10-to-N11 handoff artifact.',
      };
    }
    if (loaded.packageRecord.package_readiness_status !== 'ready_for_promotion_review'
      || loaded.bundle.bundle_status !== 'ready_for_promotion_review') {
      return {
        code: 'N11_NON_PUBLISHABLE_PACKAGE',
        message: 'N11 can only publish ready draft packages and ready v1c input bundles.',
      };
    }
    if (this.hashN10PackageAuthority(loaded.packageRecord) !== payload.draft_topic_package_hash) {
      return {
        code: 'N11_DRAFT_TOPIC_PACKAGE_HASH_MISMATCH',
        message: 'N11 draft topic package hash does not match persisted authority.',
      };
    }
    if (this.hashN10V1cInputBundleAuthority(loaded.bundle) !== payload.v1c_input_bundle_hash) {
      return {
        code: 'N11_V1C_INPUT_BUNDLE_HASH_MISMATCH',
        message: 'N11 v1c input bundle hash does not match persisted authority.',
      };
    }
    if (loaded.bundle.topic_package_id !== loaded.packageRecord.topic_package_id
      || loaded.packageRecord.v1c_input_bundle_id !== loaded.bundle.v1b_to_v1c_input_bundle_id) {
      return {
        code: 'N11_MISSING_PACKAGE_LINEAGE',
        message: 'N11 v1c input bundle does not point back to the frozen draft package.',
      };
    }
    return null;
  }

  private async resolveSourceHandoff(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    handoffKind: TopicSelectionV1bWorkflowHarnessHandoffKind,
    expectedHash: string,
    codePrefix: string,
  ): Promise<{ ok: true; value: TopicSelectionV1bWorkflowHarnessHandoff } | { ok: false; code: string; message: string }> {
    for (const sourceRef of input.frozen_input.source_refs) {
      if (sourceRef.ref_type !== 'artifact_ref') {
        continue;
      }
      const artifact = await this.controlPlane.getArtifactRef(sourceRef.ref_id);
      if (!this.isHandoffArtifactPayload(artifact?.payload, handoffKind)) {
        continue;
      }
      const handoff = artifact.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
      if (this.hash(handoff) !== expectedHash) {
        return {
          ok: false,
          code: `${codePrefix}_${handoffKind.toUpperCase()}_HASH_MISMATCH`,
          message: `${codePrefix} source handoff hash does not match the persisted ${handoffKind} artifact.`,
        };
      }
      return { ok: true, value: handoff };
    }
    return {
      ok: false,
      code: `${codePrefix}_${handoffKind.toUpperCase()}_NOT_FOUND`,
      message: `${codePrefix} frozen input source_refs must include the persisted ${handoffKind} artifact.`,
    };
  }

  private isHandoffArtifactPayload(
    value: unknown,
    handoffKind: TopicSelectionV1bWorkflowHarnessHandoffKind,
  ): value is TopicSelectionV1bWorkflowHarnessHandoff {
    return this.isRecord(value)
      && this.isRecord(value.envelope)
      && value.envelope.handoff_kind === handoffKind
      && this.isRecord(value.payload);
  }

  private legacyValueVerdict(disposition: TopicSelectionValueDisposition): TopicSelectionTopicValueAssessmentRecord['legacy_verdict'] {
    switch (disposition) {
      case 'advance_to_package':
        return 'promote';
      case 'refine_question':
      case 'refine_slice':
      case 'recheck_evidence_or_search':
        return 'refine';
      case 'park':
        return 'park';
      case 'drop':
        return 'drop';
    }
  }

  private hashN8ValueAssessmentAuthority(assessment: TopicSelectionTopicValueAssessmentRecord): string {
    return this.hash({
      accepted_risk_refs: assessment.accepted_risk_refs,
      blocker_refs: assessment.blocker_refs,
      confidence: assessment.confidence,
      dimension_scores: assessment.dimension_scores,
      freshness_status: assessment.freshness_status,
      hard_gates: assessment.hard_gates,
      readiness_status: assessment.readiness_status,
      source_research_slice_id: assessment.source_research_slice_id,
      source_research_slice_version: assessment.source_research_slice_version,
      strongest_claim_if_success: assessment.strongest_claim_if_success,
      topic_question_contract_id: assessment.topic_question_contract_id,
      topic_value_assessment_id: assessment.topic_value_assessment_id,
      total_score: assessment.total_score,
      value_reasoning_memo_id: assessment.value_reasoning_memo_id,
      value_summary: assessment.value_summary,
    });
  }

  private hashN8ValueReasoningMemoAuthority(memo: TopicSelectionValueReasoningMemoRecord): string {
    return this.hash({
      cited_refs: memo.cited_refs,
      recommendation: memo.recommendation,
      requires_critic_review: memo.requires_critic_review,
      topic_question_contract_id: memo.topic_question_contract_id,
      topic_value_assessment_id: memo.topic_value_assessment_id,
      value_reasoning_memo_id: memo.value_reasoning_memo_id,
      value_thesis: memo.value_thesis,
    });
  }

  private hashN9DispositionAuthority(decision: TopicSelectionValueDispositionDecisionRecord): string {
    return this.hash({
      accepted_risk_refs: decision.accepted_risk_refs,
      blocker_refs: decision.blocker_refs,
      decision: decision.decision,
      is_current: decision.is_current,
      package_draft_input_hash: decision.package_draft_input ? this.hash(decision.package_draft_input) : null,
      status: decision.status,
      topic_question_contract_id: decision.topic_question_contract_id,
      topic_value_assessment_id: decision.topic_value_assessment_id,
      value_disposition_decision_id: decision.value_disposition_decision_id,
      value_reasoning_memo_id: decision.value_reasoning_memo_id,
    });
  }

  private hashN10PackageAuthority(pkg: TopicSelectionTopicPackageRecord): string {
    return this.hash({
      package_payload: pkg.package_payload,
      package_readiness_status: pkg.package_readiness_status,
      package_version: pkg.package_version,
      research_slice_id: pkg.research_slice_id,
      selected_evidence_refs: pkg.selected_evidence_refs,
      title_candidates: pkg.title_candidates,
      topic_package_id: pkg.topic_package_id,
      topic_question_contract_id: pkg.topic_question_contract_id,
      topic_value_assessment_id: pkg.topic_value_assessment_id,
      value_disposition_decision_id: pkg.value_disposition_decision_id,
      v1c_input_bundle_id: pkg.v1c_input_bundle_id,
    });
  }

  private hashN10V1cInputBundleAuthority(bundle: TopicSelectionV1bToV1cInputBundleRecord): string {
    return this.hash({
      bundle_hash: bundle.bundle_hash,
      bundle_status: bundle.bundle_status,
      package_readiness_status: bundle.package_readiness_status,
      package_version: bundle.package_version,
      topic_package_id: bundle.topic_package_id,
      v1b_to_v1c_input_bundle_id: bundle.v1b_to_v1c_input_bundle_id,
    });
  }

  private n7CandidateAdmissionBlocker(
    candidate: TopicSelectionTopicQuestionCandidateRecord,
    frame: TopicSelectionQuestionFrameRecord,
  ): { code: string; message: string } | null {
    if (candidate.status === 'blocked' || candidate.blockers.length > 0) {
      return {
        code: 'N7_ACTIVE_CANDIDATE_BLOCKED',
        message: 'N7 active candidate is blocked and cannot be materialized.',
      };
    }
    if (candidate.boundary_check_payload.boundary_violations.length > 0) {
      return {
        code: 'N7_ACTIVE_CANDIDATE_BOUNDARY_VIOLATION',
        message: 'N7 active candidate has boundary violations.',
      };
    }
    if (candidate.answerability_verdict === 'not_answerable'
      || candidate.answerability_verdict === 'needs_slice_refinement') {
      return {
        code: 'N7_ACTIVE_CANDIDATE_NOT_ANSWERABLE',
        message: 'N7 active candidate is not answerable within the selected slice.',
      };
    }
    if (candidate.answerability_plan_payload.datasets_or_resources.length === 0
      || candidate.answerability_plan_payload.metrics.length === 0
      || candidate.answerability_plan_payload.baselines.length === 0
      || candidate.answerability_plan_payload.required_evidence_refs.length === 0
      || candidate.answerability_plan_payload.evaluation_setting.trim().length === 0) {
      return {
        code: 'N7_ACTIVE_CANDIDATE_ANSWERABILITY_PLAN_INVALID',
        message: 'N7 active candidate is missing a minimum answerability plan.',
      };
    }
    const claimCeiling = this.n7FrameClaimCeiling(frame);
    const claimText = [
      candidate.expected_claim,
      candidate.fallback_claim,
      candidate.max_claim_strength,
    ].join(' ').toLowerCase();
    if (claimCeiling.toLowerCase().includes('bounded') && /\bprove\b|\bguarantee\b|\balways\b/u.test(claimText)) {
      return {
        code: 'N7_ACTIVE_CANDIDATE_CLAIM_CEILING_DRIFT',
        message: 'N7 active candidate exceeds the frozen claim ceiling.',
      };
    }
    return null;
  }

  private materializeN7TopicQuestion(input: {
    acceptedRiskRefs: TopicSelectionFunctionalRef[];
    candidate: TopicSelectionTopicQuestionCandidateRecord;
    candidateSet: TopicSelectionTopicQuestionCandidateSetRecord;
    decisionId: string;
    frame: TopicSelectionQuestionFrameRecord;
    run: TopicSelectionFormTopicQuestionRunRecord;
    workflowRunId: string | null;
  }): TopicSelectionV1bTopicQuestionMaterialization {
    const { acceptedRiskRefs, candidate, candidateSet, decisionId, frame, run } = input;
    const now = this.now();
    const questionId = this.idFactory('topic_question');
    const researchRecordId = this.idFactory('topic_record');
    const contractId = this.idFactory('topic_question_contract');
    const answerabilityPlanId = this.idFactory('topic_question_answerability_plan');
    const contractVersion = this.versionFromId(contractId);
    const question: TopicSelectionTopicQuestionRecord = {
      topic_question_id: questionId,
      workspace_id: candidate.workspace_id ?? null,
      title_card_id: candidate.title_card_id,
      research_record_id: researchRecordId,
      research_slice_id: candidate.research_slice_id,
      research_slice_version: candidate.research_slice_version,
      source_validated_need_ids: candidate.source_validated_need_refs.map((ref) => ref.ref_id),
      source_candidate_set_id: candidateSet.topic_question_candidate_set_id,
      source_candidate_id: candidate.topic_question_candidate_id,
      selection_decision_id: decisionId,
      active_question_contract_id: contractId,
      main_question: candidate.main_question,
      sub_questions: candidate.sub_questions,
      question_type: candidate.question_type,
      contribution_hypothesis: candidate.contribution_hypothesis,
      status: 'active',
      created_at: now,
      updated_at: now,
    };
    const evidenceRefs = this.n7BuildEvidenceRefs({
      candidate,
      contractId,
      questionId,
      titleCardId: candidate.title_card_id,
      workspaceId: candidate.workspace_id ?? null,
    });
    const contractPayload = {
      accepted_risk_refs: acceptedRiskRefs,
      answerability_plan_id: answerabilityPlanId,
      candidate_hash: this.hashN6CandidateAuthority(candidate),
      contract_id: contractId,
      frame_hash: this.hash(frame),
      selection_decision_id: decisionId,
    };
    const contract: TopicSelectionTopicQuestionContractRecord = {
      topic_question_contract_id: contractId,
      workspace_id: candidate.workspace_id ?? null,
      title_card_id: candidate.title_card_id,
      topic_question_id: questionId,
      version: contractVersion,
      answerability_plan_id: answerabilityPlanId,
      source_research_slice_id: candidate.research_slice_id,
      source_research_slice_version: candidate.research_slice_version,
      source_candidate_id: candidate.topic_question_candidate_id,
      selection_decision_id: decisionId,
      input_snapshot_ref: this.ref('input_snapshot', run.input_snapshot_id ?? run.form_topic_question_run_id, candidate.title_card_id),
      contract_hash: this.hash(contractPayload),
      main_question: candidate.main_question,
      question_type: candidate.question_type,
      contribution_hypothesis: candidate.contribution_hypothesis,
      target_setting: frame.target_setting,
      target_community: frame.target_community,
      expected_claim: candidate.expected_claim,
      fallback_claim: candidate.fallback_claim,
      max_claim_strength: candidate.max_claim_strength,
      evaluation_route: candidate.answerability_plan_payload.evaluation_setting,
      claim_ceiling: this.n7FrameClaimCeiling(frame),
      prohibited_claims: uniqueStrings([
        ...candidate.boundary_check_payload.prohibited_claims,
        ...this.n7FrameStringArray(frame, 'inherited_non_goals'),
      ]),
      required_evidence_categories: this.n7RequiredEvidenceCategories(evidenceRefs),
      allowed_refinements: candidate.boundary_check_payload.allowed_refinements,
      stop_reopen_conditions: candidate.falsification_conditions_payload.map((condition) => condition.statement),
      accepted_risk_refs: acceptedRiskRefs,
      risk_notes: candidate.risk_notes,
      status: 'active',
      created_by_workflow_run_id: input.workflowRunId,
      artifact_refs: run.artifact_refs,
      created_at: now,
      updated_at: now,
    };
    const answerabilityPlan: TopicSelectionTopicQuestionAnswerabilityPlanRecord = {
      topic_question_answerability_plan_id: answerabilityPlanId,
      workspace_id: candidate.workspace_id ?? null,
      title_card_id: candidate.title_card_id,
      topic_question_id: questionId,
      topic_question_contract_id: contractId,
      answerability_verdict: candidate.answerability_verdict,
      datasets_or_resources: candidate.answerability_plan_payload.datasets_or_resources,
      metrics: candidate.answerability_plan_payload.metrics,
      baselines: candidate.answerability_plan_payload.baselines,
      ablations_or_comparisons: candidate.answerability_plan_payload.ablations_or_comparisons,
      evaluation_setting: candidate.answerability_plan_payload.evaluation_setting,
      dependency_risks: candidate.answerability_plan_payload.dependency_risks,
      open_dependencies: candidate.answerability_plan_payload.open_dependencies,
      known_gaps: candidate.answerability_plan_payload.known_gaps,
      required_evidence_refs: candidate.answerability_plan_payload.required_evidence_refs,
      created_at: now,
    };
    return {
      answerability_plan: answerabilityPlan,
      assumption_refs: this.n7BuildAssumptionRefs({
        candidate,
        contractId,
        frame,
        questionId,
        titleCardId: candidate.title_card_id,
        workspaceId: candidate.workspace_id ?? null,
      }),
      boundary_refs: this.n7BuildBoundaryRefs({
        candidate,
        contractId,
        questionId,
        titleCardId: candidate.title_card_id,
        workspaceId: candidate.workspace_id ?? null,
      }),
      evidence_refs: evidenceRefs,
      falsification_conditions: candidate.falsification_conditions_payload.map((condition) => ({
        topic_question_falsification_condition_id: this.idFactory('topic_question_falsification_condition'),
        workspace_id: candidate.workspace_id ?? null,
        title_card_id: candidate.title_card_id,
        topic_question_contract_id: contractId,
        condition_type: condition.condition_type,
        severity: condition.severity,
        statement: condition.statement,
        trigger_evidence_refs: condition.trigger_evidence_refs,
        trigger_source_refs: condition.trigger_source_refs,
        related_contract_fields: condition.related_contract_fields,
        expected_action: condition.expected_action,
        check_timing: condition.check_timing,
        confidence: condition.confidence,
        status: 'active',
        created_at: now,
      })),
      need_refs: candidate.source_validated_need_refs.map((needRef) => ({
        topic_question_need_ref_id: this.idFactory('topic_question_need_ref'),
        workspace_id: candidate.workspace_id ?? null,
        title_card_id: candidate.title_card_id,
        topic_question_id: questionId,
        topic_question_contract_id: contractId,
        validated_need_ref: needRef,
        source_need_candidate_ref: null,
        role: needRef.ref_id === run.validated_need_ref.ref_id ? 'primary' : 'supporting',
        inherited_from_research_slice_id: candidate.research_slice_id,
        coverage_note: 'Inherited through selected ResearchSlice; N7 does not revalidate mutable need state.',
        created_at: now,
      })),
      topic_question: question,
      topic_question_contract: contract,
    };
  }

  private n7BuildEvidenceRefs(input: {
    candidate: TopicSelectionTopicQuestionCandidateRecord;
    questionId: string;
    contractId: string;
    titleCardId: string;
    workspaceId: string | null;
  }): TopicSelectionTopicQuestionEvidenceRefRecord[] {
    const now = this.now();
    const byRole = [
      ['support', input.candidate.traceability_check_payload.support_evidence_refs],
      ['challenge', input.candidate.traceability_check_payload.challenge_evidence_refs],
      ['claim', uniqueRefs([
        ...input.candidate.answerability_plan_payload.required_evidence_refs,
        ...input.candidate.traceability_check_payload.mapped_evidence_refs,
      ])],
      ['baseline', input.candidate.traceability_check_payload.baseline_evidence_refs],
      ['context', input.candidate.traceability_check_payload.context_evidence_refs],
    ] as const;
    return byRole.flatMap(([role, refs]) => refs.map((evidenceRef) => ({
      topic_question_evidence_ref_id: this.idFactory('topic_question_evidence_ref'),
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      topic_question_id: input.questionId,
      topic_question_contract_id: input.contractId,
      evidence_ref: evidenceRef,
      evidence_role: role,
      mapped_question_part: input.candidate.main_question,
      rationale: `Mapped as ${role} evidence for the N7 materialized TopicQuestionContract.`,
      source_locator_snapshot: {},
      created_at: now,
    } satisfies TopicSelectionTopicQuestionEvidenceRefRecord)));
  }

  private n7BuildBoundaryRefs(input: {
    candidate: TopicSelectionTopicQuestionCandidateRecord;
    questionId: string;
    contractId: string;
    titleCardId: string;
    workspaceId: string | null;
  }): TopicSelectionTopicQuestionBoundaryRefRecord[] {
    const now = this.now();
    const preserved = input.candidate.boundary_check_payload.preserved_boundary_refs.map((ref) => ({
      ref,
      kind: 'preserved' as const,
    }));
    const excluded = input.candidate.boundary_check_payload.excluded_boundary_refs.map((ref) => ({
      ref,
      kind: 'excluded' as const,
    }));
    return [...preserved, ...excluded].map(({ ref, kind }) => ({
      topic_question_boundary_ref_id: this.idFactory('topic_question_boundary_ref'),
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      topic_question_id: input.questionId,
      topic_question_contract_id: input.contractId,
      research_slice_boundary_id: ref.ref_id,
      boundary_kind: kind,
      question_part: input.candidate.main_question,
      note: kind === 'excluded'
        ? 'Excluded boundary preserved by the TopicQuestionContract.'
        : 'Included boundary preserved by the TopicQuestionContract.',
      created_at: now,
    }));
  }

  private n7BuildAssumptionRefs(input: {
    candidate: TopicSelectionTopicQuestionCandidateRecord;
    frame: TopicSelectionQuestionFrameRecord;
    questionId: string;
    contractId: string;
    titleCardId: string;
    workspaceId: string | null;
  }): TopicSelectionTopicQuestionAssumptionRefRecord[] {
    const now = this.now();
    const selectedAssumptionKeys = new Set(input.frame.assumption_refs.map((ref) => this.refKey(ref)));
    const inheritedAssumptions = Array.isArray(input.frame.frame_payload.inherited_assumptions)
      ? input.frame.frame_payload.inherited_assumptions
      : [];
    const inheritedRefs = inheritedAssumptions
      .filter((value): value is TopicSelectionResearchSliceAssumptionRecord => this.isRecord(value)
        && typeof value.research_slice_assumption_id === 'string')
      .filter((assumption) => selectedAssumptionKeys.has(this.refKey(
        this.ref('research_slice_assumption', assumption.research_slice_assumption_id, assumption.title_card_id),
      )))
      .map((assumption) => ({
        topic_question_assumption_ref_id: this.idFactory('topic_question_assumption_ref'),
        workspace_id: input.workspaceId,
        title_card_id: input.titleCardId,
        topic_question_id: input.questionId,
        topic_question_contract_id: input.contractId,
        assumption_type: assumption.assumption_type,
        statement: assumption.statement,
        source_assumption_id: assumption.research_slice_assumption_id,
        evidence_refs: assumption.evidence_refs,
        risk_level: assumption.risk_level,
        status: assumption.status,
        created_at: now,
      } satisfies TopicSelectionTopicQuestionAssumptionRefRecord));
    const unmapped = input.candidate.traceability_check_payload.unmapped_assumptions.map((statement) => ({
      topic_question_assumption_ref_id: this.idFactory('topic_question_assumption_ref'),
      workspace_id: input.workspaceId,
      title_card_id: input.titleCardId,
      topic_question_id: input.questionId,
      topic_question_contract_id: input.contractId,
      assumption_type: 'dependency',
      statement,
      source_assumption_id: null,
      evidence_refs: [],
      risk_level: 'unknown',
      status: 'open',
      created_at: now,
    } satisfies TopicSelectionTopicQuestionAssumptionRefRecord));
    return [...inheritedRefs, ...unmapped];
  }

  private n7FrameClaimCeiling(frame: TopicSelectionQuestionFrameRecord): string {
    const value = frame.frame_payload.inherited_claim_ceiling;
    return typeof value === 'string' && value.trim().length > 0 ? value : 'Bounded workflow claim.';
  }

  private n7FrameStringArray(frame: TopicSelectionQuestionFrameRecord, key: string): string[] {
    const value = frame.frame_payload[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private n7RequiredEvidenceCategories(evidenceRefs: TopicSelectionTopicQuestionEvidenceRefRecord[]): string[] {
    const roles = new Set(evidenceRefs.map((ref) => ref.evidence_role));
    return ['support', 'challenge', 'claim', 'baseline', 'context'].filter((role) =>
      roles.has(role as TopicSelectionTopicQuestionEvidenceRefRecord['evidence_role']));
  }

  private hashN7TopicQuestionAuthority(question: TopicSelectionTopicQuestionRecord): string {
    return this.hash({
      active_question_contract_id: question.active_question_contract_id,
      main_question: question.main_question,
      research_slice_id: question.research_slice_id,
      research_slice_version: question.research_slice_version,
      selection_decision_id: question.selection_decision_id,
      source_candidate_id: question.source_candidate_id,
      source_candidate_set_id: question.source_candidate_set_id,
      status: question.status,
      sub_questions: question.sub_questions,
      topic_question_id: question.topic_question_id,
    });
  }

  private hashN7ContractAuthority(contract: TopicSelectionTopicQuestionContractRecord): string {
    return this.hash({
      accepted_risk_refs: contract.accepted_risk_refs,
      answerability_plan_id: contract.answerability_plan_id,
      contract_hash: contract.contract_hash,
      expected_claim: contract.expected_claim,
      fallback_claim: contract.fallback_claim,
      main_question: contract.main_question,
      max_claim_strength: contract.max_claim_strength,
      required_evidence_categories: contract.required_evidence_categories,
      source_candidate_id: contract.source_candidate_id,
      source_research_slice_id: contract.source_research_slice_id,
      source_research_slice_version: contract.source_research_slice_version,
      status: contract.status,
      topic_question_contract_id: contract.topic_question_contract_id,
      version: contract.version,
    });
  }

  private hashN7AnswerabilityPlanAuthority(plan: TopicSelectionTopicQuestionAnswerabilityPlanRecord): string {
    return this.hash({
      answerability_verdict: plan.answerability_verdict,
      baselines: plan.baselines,
      datasets_or_resources: plan.datasets_or_resources,
      evaluation_setting: plan.evaluation_setting,
      metrics: plan.metrics,
      required_evidence_refs: plan.required_evidence_refs,
      topic_question_answerability_plan_id: plan.topic_question_answerability_plan_id,
      topic_question_contract_id: plan.topic_question_contract_id,
    });
  }

  private async recordN7DebateAdmissionArtifact(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN7HarnessFrozenInputPayload,
    choice: N7CandidateChoice,
    support: N7SupportContext,
  ): Promise<{ ref: TopicSelectionFunctionalRef; hash: string; payload: Record<string, unknown> }> {
    const review = support.debateAdmission?.payload;
    const admissionPayload = {
      active_candidate_hash: choice.candidateHash,
      active_candidate_ref: this.ref('topic_question_candidate', choice.candidate.topic_question_candidate_id, choice.candidate.title_card_id),
      debate_level: review?.debate_level ?? 'compact_assessment_debate',
      high_value_signal_codes: review?.high_value_signal_codes ?? [],
      input_mode: payload.input_mode,
      n6_handoff_hash: payload.n6_handoff_hash,
      recommended_profile_id: review?.recommended_profile_id
        ?? TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
      risk_signal_codes: review?.risk_signal_codes ?? [],
      source_support_hash: support.debateAdmission?.payloadHash ?? null,
    };
    const hash = this.hash(admissionPayload);
    const artifact = await this.controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? choice.candidate.title_card_id,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      workflow_run_id: input.workflow_run_id,
      payload: admissionPayload,
      created_by: input.created_by ?? 'system',
    });
    return {
      hash,
      payload: admissionPayload,
      ref: this.ref('artifact_ref', artifact.artifact_ref_id, artifact.title_card_id ?? input.title_card_id ?? null),
    };
  }

  private buildN7ToN8TopicQuestionContractContextProjection(input: {
    request: TopicSelectionV1bWorkflowHarnessRunRequest;
    frozenPayload: TopicSelectionV1bN7HarnessFrozenInputPayload;
    handoffPayload: TopicSelectionV1bN7ToN8HandoffPayload;
    handoffRef: TopicSelectionFunctionalRef;
    handoffHash: string;
    support: N7SupportContext;
  }): TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection {
    const supportRefs = this.n7SupportRefs(input.support);
    return {
      schema_version: TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION,
      projection_kind: 'v1b_n7_to_n8_topic_question_contract_context',
      node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
      workflow_run_id: input.request.workflow_run_id,
      node_attempt_id: input.request.node_attempt_id,
      route_decision: 'invoke_next',
      non_authority: true,
      context_cache_scope: 'process_local_runtime_only',
      context_authority: 'non_authority_runtime_context',
      source_refs: uniqueRefs([
        ...input.request.frozen_input.source_refs,
        input.handoffRef,
        input.handoffPayload.topic_question_ref,
        input.handoffPayload.topic_question_contract_ref,
        input.handoffPayload.answerability_plan_ref,
        input.handoffPayload.trial_ledger_ref,
        input.handoffPayload.topic_question_candidate_set_ref,
        input.handoffPayload.active_candidate_ref,
        input.handoffPayload.selected_research_slice_ref,
        input.handoffPayload.n8_debate_admission_ref,
        input.handoffPayload.candidate_grouping_ref,
      ]),
      source_hashes: {
        frozen_input_hash: input.request.frozen_input.frozen_input_hash ?? this.hash(input.request.frozen_input),
        n6_handoff_hash: input.frozenPayload.n6_handoff_hash,
        n7_handoff_hash: input.handoffHash,
        topic_question_hash: input.handoffPayload.topic_question_hash,
        topic_question_contract_hash: input.handoffPayload.topic_question_contract_hash,
        answerability_plan_hash: input.handoffPayload.answerability_plan_hash,
        trial_ledger_hash: input.handoffPayload.trial_ledger_hash,
        topic_question_candidate_set_hash: input.handoffPayload.topic_question_candidate_set_hash,
        active_candidate_hash: input.handoffPayload.active_candidate_hash,
        selected_research_slice_hash: input.handoffPayload.selected_research_slice_hash,
        n8_debate_admission_hash: input.handoffPayload.n8_debate_admission_hash,
        ...(input.handoffPayload.candidate_grouping_hash
          ? { candidate_grouping_hash: input.handoffPayload.candidate_grouping_hash }
          : {}),
      },
      support_refs: supportRefs,
      support_hashes: this.n7SupportHashes(input.support),
      preserved_fact_kinds: [
        'topic_question_contract',
        'answerability_plan',
        'active_candidate_identity',
        'candidate_set_identity',
        'trial_ledger',
        'n8_debate_admission',
        'candidate_grouping',
        'accepted_risk_refs',
        'risk_gap_recheck_hints',
      ],
      n7_handoff_ref: input.handoffRef,
      n7_handoff_hash: input.handoffHash,
      topic_question_ref: input.handoffPayload.topic_question_ref,
      topic_question_hash: input.handoffPayload.topic_question_hash,
      topic_question_contract_ref: input.handoffPayload.topic_question_contract_ref,
      topic_question_contract_hash: input.handoffPayload.topic_question_contract_hash,
      answerability_plan_ref: input.handoffPayload.answerability_plan_ref,
      answerability_plan_hash: input.handoffPayload.answerability_plan_hash,
      trial_ledger_ref: input.handoffPayload.trial_ledger_ref,
      trial_ledger_hash: input.handoffPayload.trial_ledger_hash,
      topic_question_candidate_set_ref: input.handoffPayload.topic_question_candidate_set_ref,
      topic_question_candidate_set_hash: input.handoffPayload.topic_question_candidate_set_hash,
      active_candidate_ref: input.handoffPayload.active_candidate_ref,
      active_candidate_hash: input.handoffPayload.active_candidate_hash,
      selected_research_slice_ref: input.handoffPayload.selected_research_slice_ref,
      selected_research_slice_hash: input.handoffPayload.selected_research_slice_hash,
      n8_debate_admission_ref: input.handoffPayload.n8_debate_admission_ref,
      n8_debate_admission_hash: input.handoffPayload.n8_debate_admission_hash,
      candidate_grouping_ref: input.handoffPayload.candidate_grouping_ref,
      candidate_grouping_hash: input.handoffPayload.candidate_grouping_hash,
    };
  }

  private buildN7ToN6FailedTrialLoopbackContextProjection(input: {
    request: TopicSelectionV1bWorkflowHarnessRunRequest;
    frozenPayload: TopicSelectionV1bN7HarnessFrozenInputPayload;
    candidateSetRef: TopicSelectionFunctionalRef;
    support: N7SupportContext;
    choice: { failedCandidateIds: string[] };
  }): TopicSelectionV1bN7ToN6FailedTrialLoopbackContextProjection {
    const synthesis = input.support.failedTrialSynthesis;
    if (!synthesis?.artifact.normalized_output_ref) {
      throw new AppError(500, 'INTERNAL_ERROR', 'N7 loopback projection requires failed-trial synthesis support.');
    }
    const exhaustedCandidateHashes = synthesis.payload.exhausted_candidate_refs.map((candidateRef) => {
      const index = input.frozenPayload.admissible_candidate_refs.findIndex((ref) =>
        this.refsEqual(ref, candidateRef));
      const candidateHash = input.frozenPayload.admissible_candidate_hashes[index];
      if (!candidateHash) {
        throw new AppError(500, 'INTERNAL_ERROR', 'N7 loopback projection cannot hash an unknown exhausted candidate ref.');
      }
      return candidateHash;
    });
    const sourceHashes: Record<string, string> = {
      frozen_input_hash: input.request.frozen_input.frozen_input_hash ?? this.hash(input.request.frozen_input),
      n6_handoff_hash: input.frozenPayload.n6_handoff_hash,
      topic_question_candidate_set_hash: input.frozenPayload.topic_question_candidate_set_hash,
      failed_trial_synthesis_hash: synthesis.payloadHash,
      selected_research_slice_hash: input.frozenPayload.selected_research_slice_hash,
    };
    if (input.frozenPayload.input_mode === 'feedback_from_n8') {
      sourceHashes.n8_feedback_hash = input.frozenPayload.n8_feedback_hash;
      sourceHashes.n8_feedback_payload_hash = input.frozenPayload.n8_feedback_payload_hash;
    }
    return {
      schema_version: TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION,
      projection_kind: 'v1b_n7_to_n6_failed_trial_loopback_context',
      node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
      workflow_run_id: input.request.workflow_run_id,
      node_attempt_id: input.request.node_attempt_id,
      route_decision: 'loopback',
      non_authority: true,
      context_cache_scope: 'process_local_runtime_only',
      context_authority: 'non_authority_runtime_context',
      source_refs: uniqueRefs([
        ...input.request.frozen_input.source_refs,
        input.candidateSetRef,
        input.frozenPayload.selected_research_slice_ref,
        input.frozenPayload.input_mode === 'feedback_from_n8' ? input.frozenPayload.n8_feedback_ref : null,
        synthesis.artifact.normalized_output_ref,
        ...synthesis.payload.exhausted_candidate_refs,
        ...synthesis.payload.affected_refs,
      ]),
      source_hashes: sourceHashes,
      support_refs: this.n7SupportRefs(input.support),
      support_hashes: this.n7SupportHashes(input.support),
      preserved_fact_kinds: [
        'failure_reason_codes',
        'failed_candidate_identity',
        'failed_candidate_hashes',
        'n8_feedback',
        'previous_n7_handoff',
        'regeneration_hints',
        'loopback_target',
        'risk_gap_recheck_hints',
      ],
      loopback_target_code: 'n7_loopback_to_n6',
      topic_question_candidate_set_ref: input.candidateSetRef,
      topic_question_candidate_set_hash: input.frozenPayload.topic_question_candidate_set_hash,
      n6_handoff_hash: input.frozenPayload.n6_handoff_hash,
      n8_feedback_ref: input.frozenPayload.input_mode === 'feedback_from_n8' ? input.frozenPayload.n8_feedback_ref : null,
      n8_feedback_hash: input.frozenPayload.input_mode === 'feedback_from_n8' ? input.frozenPayload.n8_feedback_hash : null,
      failed_trial_synthesis_ref: synthesis.artifact.normalized_output_ref,
      failed_trial_synthesis_hash: synthesis.payloadHash,
      exhausted_candidate_refs: synthesis.payload.exhausted_candidate_refs,
      exhausted_candidate_hashes: exhaustedCandidateHashes,
      failure_reason_codes: synthesis.payload.failure_reason_codes,
      n6_regeneration_hints: synthesis.payload.n6_regeneration_hints,
      synthesis_summary: synthesis.payload.synthesis_summary,
    };
  }

  private buildN6GateFailureRetryContextProjection(input: {
    request: TopicSelectionV1bWorkflowHarnessRunRequest;
    frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload;
    blockedCandidateContexts: Record<string, unknown>[];
    loopbackPlan: N6LoopbackPlan;
    draftArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    draftHash: string;
  }): TopicSelectionV1bN6GateFailureRetryContextProjection {
    if (!input.draftArtifact.normalized_output_ref) {
      throw new AppError(500, 'INTERNAL_ERROR', 'N6 gate-failure retry projection requires a failed draft output ref.');
    }
    const blockedCandidateContextHash = this.hash(input.blockedCandidateContexts);
    const failedDraftSourceHashesHash = this.hash(input.draftArtifact.source_hashes);
    const triageArtifactRef = input.loopbackPlan.triageArtifact?.normalized_output_ref ?? null;
    const triageArtifactHash = input.loopbackPlan.triageArtifact?.normalized_output_hash ?? null;
    const sourceHashes: Record<string, string> = {
      frozen_input_hash: input.request.frozen_input.frozen_input_hash ?? this.hash(input.request.frozen_input),
      n5_handoff_hash: input.frozenPayload.n5_handoff_hash,
      selected_research_slice_hash: input.frozenPayload.research_slice_hash,
      failed_draft_hash: input.draftHash,
      failed_draft_prompt_packet_hash: input.draftArtifact.prompt_packet_hash,
      failed_draft_source_hashes_hash: failedDraftSourceHashesHash,
      blocked_candidate_context_hash: blockedCandidateContextHash,
      failure_reason_codes_hash: this.hash(input.loopbackPlan.reasonCodes),
      regeneration_hints_hash: this.hash(input.loopbackPlan.regenerationHints),
    };
    if (input.loopbackPlan.triagePayloadHash) {
      sourceHashes.triage_payload_hash = input.loopbackPlan.triagePayloadHash;
    }
    return {
      schema_version: TOPIC_SELECTION_V1B_N6_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION,
      projection_kind: 'v1b_n6_gate_failure_retry_context',
      node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
      workflow_run_id: input.request.workflow_run_id,
      node_attempt_id: input.request.node_attempt_id,
      route_decision: 'loopback',
      loopback_target_code: 'n6_regenerate_candidates',
      non_authority: true,
      context_cache_scope: 'process_local_runtime_only',
      context_authority: 'non_authority_runtime_context',
      source_refs: uniqueRefs([
        ...input.request.frozen_input.source_refs,
        input.frozenPayload.research_slice_ref,
        input.frozenPayload.research_slice_selection_ref,
        input.frozenPayload.research_slice_option_set_ref,
        input.frozenPayload.selected_slice_option_ref,
        input.draftArtifact.normalized_output_ref,
        triageArtifactRef,
        ...input.loopbackPlan.affectedRefs,
      ]),
      source_hashes: sourceHashes,
      support_refs: uniqueRefs([
        input.draftArtifact.normalized_output_ref,
        triageArtifactRef,
      ]),
      support_hashes: {
        failed_draft_hash: input.draftHash,
        failed_draft_prompt_packet_hash: input.draftArtifact.prompt_packet_hash,
        failed_draft_source_hashes_hash: failedDraftSourceHashesHash,
        blocked_candidate_context_hash: blockedCandidateContextHash,
        ...(triageArtifactHash ? { triage_artifact_hash: triageArtifactHash } : {}),
        ...(input.loopbackPlan.triagePayloadHash ? { triage_payload_hash: input.loopbackPlan.triagePayloadHash } : {}),
      },
      preserved_fact_kinds: [
        'failed_draft_identity',
        'blocked_candidate_context',
        'failure_reason_code',
        'regeneration_hint',
        'selected_slice_identity',
        'n5_handoff',
        'loopback_target',
        'risk_gap_recheck_hints',
      ],
      selected_research_slice_ref: input.frozenPayload.research_slice_ref,
      selected_research_slice_hash: input.frozenPayload.research_slice_hash,
      n5_handoff_hash: input.frozenPayload.n5_handoff_hash,
      failed_draft_ref: input.draftArtifact.normalized_output_ref,
      failed_draft_hash: input.draftHash,
      failed_draft_prompt_packet_hash: input.draftArtifact.prompt_packet_hash,
      failed_draft_source_hashes_hash: failedDraftSourceHashesHash,
      blocked_candidate_context: input.blockedCandidateContexts,
      blocked_candidate_context_hash: blockedCandidateContextHash,
      failure_reason_codes: input.loopbackPlan.reasonCodes,
      regeneration_hints: input.loopbackPlan.regenerationHints,
      triage_artifact_ref: triageArtifactRef,
      triage_artifact_hash: triageArtifactHash,
      triage_payload_hash: input.loopbackPlan.triagePayloadHash,
    };
  }

  private n7SupportRefs(support: N7SupportContext): TopicSelectionFunctionalRef[] {
    return uniqueRefs([
      support.grouping?.artifact.normalized_output_ref,
      support.debateAdmission?.artifact.normalized_output_ref,
      support.failedTrialSynthesis?.artifact.normalized_output_ref,
    ]);
  }

  private n7SupportHashes(support: N7SupportContext): Record<string, string> {
    return {
      ...(support.grouping ? { n7_candidate_grouping: support.grouping.payloadHash } : {}),
      ...(support.debateAdmission ? { n7_n8_debate_admission_review: support.debateAdmission.payloadHash } : {}),
      ...(support.failedTrialSynthesis ? { n7_failed_trial_synthesis: support.failedTrialSynthesis.payloadHash } : {}),
    };
  }

  private n7Warnings(
    choice: N7CandidateChoice,
    support: N7SupportContext,
  ): TopicSelectionGateIssue[] {
    const warnings: TopicSelectionGateIssue[] = [];
    if (support.grouping) {
      warnings.push(this.warning(
        'candidate_grouping_preserved',
        'N7 consumed frozen candidate grouping support before deterministic selection.',
        [support.grouping.artifact.normalized_output_ref!],
      ));
    }
    if (support.debateAdmission) {
      warnings.push(this.warning(
        'n8_debate_level_selected',
        'N7 consumed frozen N8 debate-admission support.',
        [support.debateAdmission.artifact.normalized_output_ref!],
      ));
    }
    for (const trigger of choice.candidate.human_review_triggers) {
      warnings.push(this.warning(
        trigger,
        `N7 active candidate carries human review trigger ${trigger}.`,
        [this.ref('topic_question_candidate', choice.candidate.topic_question_candidate_id, choice.candidate.title_card_id)],
      ));
    }
    for (const risk of choice.candidate.risk_notes) {
      warnings.push(this.warning(
        'N7_ACTIVE_CANDIDATE_RISK_NOTE',
        risk,
        [this.ref('topic_question_candidate', choice.candidate.topic_question_candidate_id, choice.candidate.title_card_id)],
      ));
    }
    return warnings;
  }

  private n7HardGateResults(candidates: TopicSelectionTopicQuestionCandidateRecord[]): Record<string, unknown>[] {
    return candidates.map((candidate) => ({
      answerability_verdict: candidate.answerability_verdict,
      blockers: candidate.blockers,
      candidate_id: candidate.topic_question_candidate_id,
      passed: candidate.status !== 'blocked' && candidate.blockers.length === 0,
    }));
  }

  private n7RejectedCandidateReasons(
    candidates: TopicSelectionTopicQuestionCandidateRecord[],
    admittedCandidates: TopicSelectionTopicQuestionCandidateRecord[],
    failedCandidateIds: string[],
  ): Record<string, unknown>[] {
    const admittedIds = new Set(admittedCandidates.map((candidate) => candidate.topic_question_candidate_id));
    const failedIds = new Set(failedCandidateIds);
    return candidates
      .filter((candidate) => !admittedIds.has(candidate.topic_question_candidate_id))
      .map((candidate) => ({
        candidate_id: candidate.topic_question_candidate_id,
        reason: failedIds.has(candidate.topic_question_candidate_id)
          ? 'Rejected by frozen N8 feedback.'
          : 'Preserved for possible later trial.',
      }));
  }

  private parseN1Payload(
    payload: Record<string, unknown>,
  ): { ok: true; value: TopicSelectionV1bN1HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
    const allowedKeys = ['v1b_input_bundle_id', 'v1a_bundle_ref', 'v1a_bundle_hash', 'source_refs_hash'];
    if (!this.hasOnlyKeys(payload, allowedKeys)
      || typeof payload.v1b_input_bundle_id !== 'string'
      || !payload.v1b_input_bundle_id.trim()
      || !this.isHash(payload.v1a_bundle_hash)
      || !this.isHash(payload.source_refs_hash)
      || !this.isFunctionalRefValue(payload.v1a_bundle_ref)) {
      return {
        ok: false,
        code: 'N1_FROZEN_PAYLOAD_INVALID',
        message: 'N1 requires frozen v1b input bundle id and expected bundle/source hash metadata.',
      };
    }
    return {
      ok: true,
      value: payload as unknown as TopicSelectionV1bN1HarnessFrozenInputPayload,
    };
  }

  private parseN2Payload(
    payload: Record<string, unknown>,
  ): { ok: true; value: TopicSelectionV1bN2HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
    const allowedKeys = [
      'accepted_constraint_profile_payload',
      'accepted_constraint_profile_payload_hash',
      'authority_input_provider',
      'delegation_artifact_hash',
      'intake_snapshot_hash',
      'intake_snapshot_ref',
      'previous_profile_hash',
      'previous_profile_ref',
      'v1a_bundle_hash',
      'v1a_bundle_ref',
    ];
    if (!this.hasOnlyKeys(payload, allowedKeys)
      || !this.isFunctionalRefValue(payload.intake_snapshot_ref)
      || !this.isHash(payload.intake_snapshot_hash)
      || !this.isFunctionalRefValue(payload.v1a_bundle_ref)
      || !this.isHash(payload.v1a_bundle_hash)
      || !['human_delegated', 'codex_delegated', 'fixture'].includes(payload.authority_input_provider as string)
      || !this.isRecord(payload.accepted_constraint_profile_payload)
      || !this.isHash(payload.accepted_constraint_profile_payload_hash)
      || !this.isNullableHash(payload.delegation_artifact_hash)
      || !this.isNullableFunctionalRefValue(payload.previous_profile_ref)
      || !this.isNullableHash(payload.previous_profile_hash)) {
      return {
        ok: false,
        code: 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID',
        message: 'N2 requires a frozen accepted ResearchConstraintProfile payload with refs and hashes.',
      };
    }
    const accepted = payload.accepted_constraint_profile_payload;
    if (!this.acceptedConstraintProfilePayloadIsValid(accepted)) {
      return {
        ok: false,
        code: 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID',
        message: 'N2 accepted ResearchConstraintProfile payload is malformed.',
      };
    }
    if (payload.authority_input_provider === 'codex_delegated' && !this.isHash(payload.delegation_artifact_hash)) {
      return {
        ok: false,
        code: 'N2_CODEX_DELEGATION_ARTIFACT_REQUIRED',
        message: 'N2 codex_delegated authority input requires frozen matching semantic artifact provenance.',
      };
    }
    if (payload.authority_input_provider !== 'codex_delegated' && payload.delegation_artifact_hash !== null) {
      return {
        ok: false,
        code: 'N2_DELEGATION_ARTIFACT_NOT_ALLOWED',
        message: 'N2 non-Codex delegated authority input must not carry delegation_artifact_hash.',
      };
    }
    return {
      ok: true,
      value: payload as unknown as TopicSelectionV1bN2HarnessFrozenInputPayload,
    };
  }

  private parseN3Payload(
    payload: Record<string, unknown>,
  ): { ok: true; value: TopicSelectionV1bN3HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
    const allowedKeys = [
      'constraint_profile_hash',
      'constraint_profile_ref',
      'intake_snapshot_hash',
      'intake_snapshot_ref',
      'n2_handoff_hash',
    ];
    if (!this.hasOnlyKeys(payload, allowedKeys)
      || !this.isFunctionalRefValue(payload.intake_snapshot_ref)
      || !this.isHash(payload.intake_snapshot_hash)
      || !this.isFunctionalRefValue(payload.constraint_profile_ref)
      || !this.isHash(payload.constraint_profile_hash)
      || !this.isHash(payload.n2_handoff_hash)) {
      return {
        ok: false,
        code: 'N3_FROZEN_PAYLOAD_INVALID',
        message: 'N3 requires frozen N1/N2 authority refs and hashes.',
      };
    }
    return {
      ok: true,
      value: payload as unknown as TopicSelectionV1bN3HarnessFrozenInputPayload,
    };
  }

  private parseN4Payload(
    payload: Record<string, unknown>,
  ): { ok: true; value: TopicSelectionV1bN4HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
    const allowedKeys = [
      'constraint_profile_hash',
      'constraint_profile_ref',
      'intake_readiness_hash',
      'intake_readiness_ref',
      'intake_snapshot_hash',
      'intake_snapshot_ref',
      'n2_handoff_hash',
      'n3_handoff_hash',
    ];
    if (!this.hasOnlyKeys(payload, allowedKeys)
      || !this.isFunctionalRefValue(payload.intake_snapshot_ref)
      || !this.isHash(payload.intake_snapshot_hash)
      || !this.isFunctionalRefValue(payload.constraint_profile_ref)
      || !this.isHash(payload.constraint_profile_hash)
      || !this.isFunctionalRefValue(payload.intake_readiness_ref)
      || !this.isHash(payload.intake_readiness_hash)
      || !this.isHash(payload.n2_handoff_hash)
      || !this.isHash(payload.n3_handoff_hash)) {
      return {
        ok: false,
        code: 'N4_FROZEN_PAYLOAD_INVALID',
        message: 'N4 requires frozen N1/N2/N3 authority refs and replay lineage hashes.',
      };
    }
    return {
      ok: true,
      value: payload as unknown as TopicSelectionV1bN4HarnessFrozenInputPayload,
    };
  }

  private parseN5Payload(
    payload: Record<string, unknown>,
  ): { ok: true; value: TopicSelectionV1bN5HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
    const allowedKeys = [
      'accepted_selection_payload',
      'accepted_selection_payload_hash',
      'authority_input_provider',
      'delegation_artifact_hash',
      'n4_handoff_hash',
      'research_slice_option_set_hash',
      'research_slice_option_set_ref',
    ];
    if (!this.hasOnlyKeys(payload, allowedKeys)
      || !this.isFunctionalRefValue(payload.research_slice_option_set_ref)
      || !this.isHash(payload.research_slice_option_set_hash)
      || !this.isHash(payload.n4_handoff_hash)
      || !['human_delegated', 'codex_delegated', 'fixture'].includes(payload.authority_input_provider as string)
      || !this.isRecord(payload.accepted_selection_payload)
      || !this.isHash(payload.accepted_selection_payload_hash)
      || !this.isNullableHash(payload.delegation_artifact_hash)) {
      return {
        ok: false,
        code: 'N5_ACCEPTED_SELECTION_PAYLOAD_INVALID',
        message: 'N5 requires a frozen accepted ResearchSlice selection payload with option-set refs and hashes.',
      };
    }
    if (!this.acceptedSliceSelectionPayloadIsValid(payload.accepted_selection_payload)) {
      return {
        ok: false,
        code: 'N5_ACCEPTED_SELECTION_PAYLOAD_INVALID',
        message: 'N5 accepted ResearchSlice selection payload is malformed.',
      };
    }
    if (payload.authority_input_provider === 'codex_delegated' && !this.isHash(payload.delegation_artifact_hash)) {
      return {
        ok: false,
        code: 'N5_CODEX_DELEGATION_ARTIFACT_REQUIRED',
        message: 'N5 codex_delegated authority input requires frozen matching semantic artifact provenance.',
      };
    }
    if (payload.authority_input_provider !== 'codex_delegated' && payload.delegation_artifact_hash !== null) {
      return {
        ok: false,
        code: 'N5_DELEGATION_ARTIFACT_NOT_ALLOWED',
        message: 'N5 non-Codex delegated authority input must not carry delegation_artifact_hash.',
      };
    }
    return {
      ok: true,
      value: payload as unknown as TopicSelectionV1bN5HarnessFrozenInputPayload,
    };
  }

  private parseN6Payload(
    payload: Record<string, unknown>,
  ): { ok: true; value: TopicSelectionV1bN6HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
    const allowedKeys = [
      'constraint_profile_hash',
      'constraint_profile_ref',
      'intake_readiness_hash',
      'intake_readiness_ref',
      'n5_handoff_hash',
      'research_slice_hash',
      'research_slice_option_set_hash',
      'research_slice_option_set_ref',
      'research_slice_ref',
      'research_slice_selection_hash',
      'research_slice_selection_ref',
      'selected_slice_option_hash',
      'selected_slice_option_ref',
    ];
    if (!this.hasOnlyKeys(payload, allowedKeys)
      || !this.isHash(payload.n5_handoff_hash)
      || !this.isFunctionalRefValue(payload.constraint_profile_ref)
      || !this.isHash(payload.constraint_profile_hash)
      || !this.isFunctionalRefValue(payload.intake_readiness_ref)
      || !this.isHash(payload.intake_readiness_hash)
      || !this.isFunctionalRefValue(payload.research_slice_ref)
      || !this.isHash(payload.research_slice_hash)
      || !this.isFunctionalRefValue(payload.research_slice_selection_ref)
      || !this.isHash(payload.research_slice_selection_hash)
      || !this.isFunctionalRefValue(payload.research_slice_option_set_ref)
      || !this.isHash(payload.research_slice_option_set_hash)
      || !this.isFunctionalRefValue(payload.selected_slice_option_ref)
      || !this.isHash(payload.selected_slice_option_hash)) {
      return {
        ok: false,
        code: 'N6_FROZEN_PAYLOAD_INVALID',
        message: 'N6 requires a frozen N5 selected ResearchSlice handoff payload with explicit refs and hashes.',
      };
    }
    return {
      ok: true,
      value: payload as unknown as TopicSelectionV1bN6HarnessFrozenInputPayload,
    };
  }

  private acceptedConstraintProfilePayloadIsValid(value: Record<string, unknown>): boolean {
    return this.hasOnlyKeys(value, [
      'available_assets',
      'claim_ceiling',
      'constraint_payload',
      'feasibility_budget',
      'human_constraint_notes',
      'intended_contribution_style',
      'method_constraints',
      'non_goals',
      'resource_constraints',
      'target_community',
      'target_venue_class',
    ])
      && typeof value.target_community === 'string'
      && this.isNullableString(value.target_venue_class)
      && this.isNullableString(value.intended_contribution_style)
      && this.isStringArray(value.method_constraints)
      && this.isStringArray(value.resource_constraints)
      && this.isStringArray(value.available_assets)
      && this.isRecord(value.feasibility_budget)
      && this.isStringArray(value.non_goals)
      && typeof value.claim_ceiling === 'string'
      && this.isNullableString(value.human_constraint_notes)
      && this.isRecord(value.constraint_payload);
  }

  private acceptedSliceSelectionPayloadIsValid(value: Record<string, unknown>): boolean {
    if (!this.hasOnlyKeys(value, [
      'accepted_risk_refs',
      'confidence',
      'decision',
      'decision_basis',
      'human_review_reason',
      'loopback_reason_code',
      'loopback_target',
      'loopback_target_ref',
      'rejected_option_reasons',
      'required_actions',
      'requires_human_review',
      'selected_option_hash',
      'selected_option_ref',
      'selection_rationale',
    ])
      || !this.isSliceSelectionDecision(value.decision)
      || !this.isNullableFunctionalRefValue(value.selected_option_ref)
      || !this.isNullableHash(value.selected_option_hash)
      || typeof value.selection_rationale !== 'string'
      || value.selection_rationale.trim().length === 0
      || !this.isRecord(value.decision_basis)
      || !this.isRejectedOptionReasonArray(value.rejected_option_reasons)
      || !this.isStringArray(value.required_actions)
      || !this.isFunctionalRefArray(value.accepted_risk_refs)
      || !(value.confidence === null || typeof value.confidence === 'number')
      || typeof value.requires_human_review !== 'boolean'
      || !this.isNullableString(value.human_review_reason)
      || !this.isNullableSliceLoopbackTarget(value.loopback_target)
      || !this.isNullableFunctionalRefValue(value.loopback_target_ref)
      || !this.isNullableString(value.loopback_reason_code)) {
      return false;
    }
    if (value.decision === 'select') {
      return this.isFunctionalRefValue(value.selected_option_ref)
        && this.isHash(value.selected_option_hash)
        && value.loopback_target === null
        && value.loopback_target_ref === null
        && value.loopback_reason_code === null;
    }
    if (value.selected_option_ref !== null || value.selected_option_hash !== null) {
      return false;
    }
    if (value.decision === 'request_more_options') {
      return this.isSliceLoopbackTarget(value.loopback_target)
        && typeof value.loopback_reason_code === 'string'
        && value.loopback_reason_code.trim().length > 0;
    }
    return true;
  }

  private isN3ReadinessClassificationSupportPayload(
    value: unknown,
  ): value is TopicSelectionV1bIntakeReadinessClassificationSupportPayload {
    return this.isRecord(value)
      && this.hasOnlyKeys(value, [
        'blocker_codes',
        'cited_refs',
        'loopback_target_code',
        'no_authority_write_confirmed',
        'rationale',
        'readiness_recommendation',
        'schema_version',
        'warning_codes',
      ])
      && value.schema_version === 'IntakeReadinessClassificationSupport@v1'
      && ['ready', 'needs_refinement', 'blocked'].includes(value.readiness_recommendation as string)
      && this.isStringArray(value.blocker_codes)
      && this.isStringArray(value.warning_codes)
      && (
        value.loopback_target_code === null
        || value.loopback_target_code === 'n3_snapshot_refresh'
        || value.loopback_target_code === 'n3_profile_repair'
      )
      && this.isFunctionalRefArray(value.cited_refs)
      && typeof value.rationale === 'string'
      && value.rationale.trim().length > 0
      && value.no_authority_write_confirmed === true;
  }

  private n1MetadataBlocker(
    payload: TopicSelectionV1bN1HarnessFrozenInputPayload,
    bundleRef: TopicSelectionFunctionalRef,
    expectedBundleHash: string,
    expectedSourceRefsHash: string,
  ): { code: string; message: string } | null {
    if (!this.refsEqual(payload.v1a_bundle_ref, bundleRef)) {
      return {
        code: 'N1_V1A_BUNDLE_REF_MISMATCH',
        message: 'N1 v1a_bundle_ref does not match the explicit persisted v1a bundle.',
      };
    }
    if (payload.v1a_bundle_hash !== expectedBundleHash) {
      return {
        code: 'N1_V1A_BUNDLE_HASH_MISMATCH',
        message: 'N1 v1a_bundle_hash does not match the persisted v1a bundle.',
      };
    }
    if (payload.source_refs_hash !== expectedSourceRefsHash) {
      return {
        code: 'N1_SOURCE_REFS_HASH_MISMATCH',
        message: 'N1 source_refs_hash does not match the persisted v1a bundle lineage refs.',
      };
    }
    return null;
  }

  private n2CodexDelegationBlocker(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN2HarnessFrozenInputPayload,
    acceptedPayloadHash: string,
  ): { code: string; message: string } | null {
    if (payload.authority_input_provider !== 'codex_delegated') {
      return null;
    }
    if (payload.delegation_artifact_hash !== acceptedPayloadHash) {
      return {
        code: 'N2_CODEX_DELEGATION_ARTIFACT_MISMATCH',
        message: 'N2 codex_delegated payload must bind delegation_artifact_hash to accepted profile payload hash.',
      };
    }
    const artifact = (input.semantic_artifacts ?? []).find((item) =>
      item.slot_id === 'n2_constraint_profile_semantic_support'
      && item.allowed_effect === 'delegated_payload_candidate'
    );
    if (!artifact) {
      return {
        code: 'N2_CODEX_DELEGATION_ARTIFACT_REQUIRED',
        message: 'N2 codex_delegated payload requires matching frozen semantic support artifact provenance.',
      };
    }
    if (
      artifact.normalized_output_hash !== payload.delegation_artifact_hash
      && artifact.structured_output_hash !== payload.delegation_artifact_hash
    ) {
      return {
        code: 'N2_CODEX_DELEGATION_ARTIFACT_MISMATCH',
        message: 'N2 Codex semantic artifact hash does not match the accepted authority payload hash.',
      };
    }
    return null;
  }

  private n5CodexDelegationBlocker(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN5HarnessFrozenInputPayload,
    acceptedPayloadHash: string,
  ): { code: string; message: string } | null {
    if (payload.authority_input_provider !== 'codex_delegated') {
      return null;
    }
    if (payload.delegation_artifact_hash !== acceptedPayloadHash) {
      return {
        code: 'N5_CODEX_DELEGATION_ARTIFACT_MISMATCH',
        message: 'N5 codex_delegated payload must bind delegation_artifact_hash to accepted selection payload hash.',
      };
    }
    const artifact = (input.semantic_artifacts ?? []).find((item) =>
      item.slot_id === 'n5_slice_selection_review'
      && item.allowed_effect === 'delegated_payload_candidate'
    );
    if (!artifact) {
      return {
        code: 'N5_CODEX_DELEGATION_ARTIFACT_REQUIRED',
        message: 'N5 codex_delegated payload requires matching frozen semantic support artifact provenance.',
      };
    }
    if (
      artifact.normalized_output_hash !== payload.delegation_artifact_hash
      && artifact.structured_output_hash !== payload.delegation_artifact_hash
    ) {
      return {
        code: 'N5_CODEX_DELEGATION_ARTIFACT_MISMATCH',
        message: 'N5 Codex semantic artifact hash does not match the accepted authority payload hash.',
      };
    }
    return null;
  }

  private async loadN5OptionSet(
    optionSetId: string,
  ): Promise<{ ok: true; value: N5LoadedOptionSet } | { ok: false; code: string; message: string }> {
    const repository = this.runnerDependencies.researchSliceRepository!;
    const optionSet = await repository.findOptionSetById(optionSetId);
    if (!optionSet) {
      return {
        ok: false,
        code: 'N5_OPTION_SET_NOT_FOUND',
        message: 'N5 requires the frozen N4 ResearchSliceOptionSet authority.',
      };
    }
    const [options, planRun] = await Promise.all([
      repository.listOptionsByOptionSetId(optionSet.research_slice_option_set_id),
      repository.findPlanRunById(optionSet.plan_research_slice_run_id),
    ]);
    if (!planRun) {
      return {
        ok: false,
        code: 'N5_PLAN_RUN_NOT_FOUND',
        message: 'N5 requires the N4 PlanResearchSliceRun lineage for selected-slice handoff.',
      };
    }
    if (options.length !== optionSet.option_count) {
      return {
        ok: false,
        code: 'N5_OPTION_SET_OPTION_COUNT_MISMATCH',
        message: 'N5 persisted ResearchSliceOption count does not match the option set authority.',
      };
    }
    return {
      ok: true,
      value: {
        optionSet,
        options,
        planRun,
      },
    };
  }

  private n5OptionSetLineageHashes(
    optionSet: TopicSelectionResearchSliceOptionSetRecord,
  ): { ok: true; value: { constraintProfileHash: string; readinessHash: string } } | { ok: false; code: string; message: string } {
    const constraintProfileHash = optionSet.comparison_payload.constraint_profile_hash;
    const readinessHash = optionSet.comparison_payload.intake_readiness_hash;
    if (!this.isHash(constraintProfileHash) || !this.isHash(readinessHash)) {
      return {
        ok: false,
        code: 'N5_OPTION_SET_LINEAGE_HASH_MISSING',
        message: 'N5 requires N4 option set lineage hashes for constraint profile and readiness authorities.',
      };
    }
    return {
      ok: true,
      value: {
        constraintProfileHash,
        readinessHash,
      },
    };
  }

  private n5SelectedOption(
    accepted: TopicSelectionV1bAcceptedSliceSelectionPayload,
    options: TopicSelectionResearchSliceOptionRecord[],
  ): TopicSelectionResearchSliceOptionRecord | null {
    if (!accepted.selected_option_ref) {
      return null;
    }
    return options.find((option) =>
      option.research_slice_option_id === accepted.selected_option_ref?.ref_id
    ) ?? null;
  }

  private n5SelectionGateBlocker(
    payload: TopicSelectionV1bN5HarnessFrozenInputPayload,
    loaded: N5LoadedOptionSet,
    selectedOption: TopicSelectionResearchSliceOptionRecord | null,
  ): { code: string; message: string } | null {
    const accepted = payload.accepted_selection_payload;
    if (accepted.decision !== 'select') {
      return this.n5NonSelectGateBlocker(accepted);
    }
    if (!accepted.selected_option_ref || !accepted.selected_option_hash || !selectedOption) {
      return {
        code: 'N5_SELECTED_OPTION_NOT_FOUND',
        message: 'N5 selected option ref must resolve inside the frozen ResearchSliceOptionSet.',
      };
    }
    if (selectedOption.research_slice_option_set_id !== loaded.optionSet.research_slice_option_set_id) {
      return {
        code: 'N5_SELECTED_OPTION_SET_MISMATCH',
        message: 'N5 selected option belongs to a different ResearchSliceOptionSet.',
      };
    }
    if (!this.refsEqual(accepted.selected_option_ref, this.optionRef(selectedOption))) {
      return {
        code: 'N5_SELECTED_OPTION_REF_MISMATCH',
        message: 'N5 selected_option_ref does not match the persisted ResearchSliceOption.',
      };
    }
    const selectedOptionHash = this.hashResearchSliceOptionAuthority(selectedOption);
    if (accepted.selected_option_hash !== selectedOptionHash) {
      return {
        code: 'N5_SELECTED_OPTION_HASH_MISMATCH',
        message: 'N5 selected option hash does not match the persisted ResearchSliceOption authority.',
      };
    }
    if (selectedOption.status === 'blocked' || selectedOption.hard_blockers.length > 0) {
      return {
        code: 'N5_SELECTED_OPTION_BLOCKED',
        message: 'N5 cannot select a hard-blocked ResearchSlice option.',
      };
    }
    if (
      (this.isHighRiskOption(selectedOption) || selectedOption.requires_human_review)
      && payload.authority_input_provider !== 'human_delegated'
      && accepted.accepted_risk_refs.length === 0
    ) {
      return {
        code: 'N5_HIGH_RISK_SELECTION_REQUIRES_ACCEPTED_RISK',
        message: 'N5 high-risk or human-review selections require human delegation or frozen accepted risk refs.',
      };
    }
    return null;
  }

  private n5NonSelectGateBlocker(
    accepted: TopicSelectionV1bAcceptedSliceSelectionPayload,
  ): { code: string; message: string } | null {
    if (accepted.selected_option_ref !== null || accepted.selected_option_hash !== null) {
      return {
        code: 'N5_NON_SELECT_SELECTED_OPTION_FORBIDDEN',
        message: 'N5 non-select decisions must not carry selected option refs or hashes.',
      };
    }
    if (accepted.decision === 'request_more_options' && (!accepted.loopback_target || !accepted.loopback_reason_code)) {
      return {
        code: 'N5_REQUEST_MORE_OPTIONS_LOOPBACK_REQUIRED',
        message: 'N5 request_more_options requires explicit loopback target and reason code.',
      };
    }
    return null;
  }

  private n5SelectionWarnings(
    accepted: TopicSelectionV1bAcceptedSliceSelectionPayload,
    loaded: N5LoadedOptionSet,
    selectedOption: TopicSelectionResearchSliceOptionRecord | null,
  ): TopicSelectionGateIssue[] {
    const warnings: TopicSelectionGateIssue[] = [];
    if (accepted.accepted_risk_refs.length > 0) {
      warnings.push(this.warning(
        'SELECTION_RISK_ACCEPTED',
        'N5 selection carries accepted risk refs forward.',
        accepted.accepted_risk_refs,
      ));
    }
    if (selectedOption?.requires_human_review) {
      warnings.push(this.warning(
        'SELECTION_HUMAN_REVIEW_CONTEXT_CARRIED_FORWARD',
        'N5 selected option carries human-review context into downstream generation.',
        [this.optionRef(selectedOption)],
      ));
    }
    if (accepted.decision === 'select' && loaded.options.some((option) => option.research_slice_option_id !== selectedOption?.research_slice_option_id)) {
      warnings.push(this.warning(
        'DEFERRED_CANDIDATE_PRESERVED',
        'N5 leaves non-selected ResearchSlice options preserved for explicit loopback instead of mutating them.',
        [this.optionSetRef(loaded.optionSet)],
      ));
    }
    return uniqueIssues(warnings);
  }

  private buildN5DecisionRecord(input: {
    accepted: TopicSelectionV1bAcceptedSliceSelectionPayload;
    artifactRefs: TopicSelectionFunctionalRef[];
    controlPlaneRefs: PreparedAdmittedControlPlane;
    decisionId: string;
    decisionRef: TopicSelectionFunctionalRef;
    decidedBy: TopicSelectionActorType;
    input: TopicSelectionV1bWorkflowHarnessRunRequest;
    loaded: N5LoadedOptionSet;
    now: string;
    selectedOption: TopicSelectionResearchSliceOptionRecord | null;
    sliceRef: TopicSelectionFunctionalRef | null;
  }): TopicSelectionSliceSelectionDecisionRecord {
    const { accepted, loaded, selectedOption } = input;
    return {
      slice_selection_decision_id: input.decisionId,
      workspace_id: input.input.workspace_id ?? loaded.optionSet.workspace_id ?? null,
      title_card_id: loaded.optionSet.title_card_id,
      research_slice_option_set_id: loaded.optionSet.research_slice_option_set_id,
      selected_option_id: selectedOption?.research_slice_option_id ?? null,
      decision: accepted.decision,
      decided_by: input.decidedBy,
      selection_policy_version: input.input.policy_version,
      decision_basis: {
        ...accepted.decision_basis,
        option_count: loaded.options.length,
        option_set_ref: this.optionSetRef(loaded.optionSet),
      },
      selection_rationale: accepted.selection_rationale,
      rejected_option_reasons: accepted.rejected_option_reasons.length > 0
        ? accepted.rejected_option_reasons
        : selectedOption
          ? this.defaultRejectedReasons(loaded.options, selectedOption)
          : [],
      hard_blockers: selectedOption?.hard_blockers ?? [],
      open_risks: selectedOption?.main_risks ?? [],
      unresolved_disagreements: loaded.optionSet.unresolved_disagreements,
      loopback_target: accepted.decision === 'select'
        ? null
        : accepted.loopback_target ?? this.defaultN5Loopback(accepted.decision),
      loopback_target_ref: accepted.loopback_target_ref,
      required_actions: accepted.required_actions,
      loopback_reason_code: accepted.decision === 'select'
        ? null
        : accepted.loopback_reason_code ?? accepted.decision,
      source_downstream_object_ref: null,
      creates_new_run_or_version: accepted.decision === 'request_more_options',
      confidence: accepted.confidence ?? selectedOption?.confidence ?? null,
      requires_human_review: accepted.requires_human_review || (selectedOption?.requires_human_review ?? false),
      human_review_reason: accepted.human_review_reason ?? (selectedOption ? this.humanReviewReason(selectedOption) : null),
      output_research_slice_ref: input.sliceRef,
      input_snapshot_id: input.controlPlaneRefs.inputSnapshot.input_snapshot_id,
      workflow_run_id: input.input.workflow_run_id,
      gate_result_id: input.controlPlaneRefs.gateResultRef.ref_id,
      transition_attempt_id: null,
      artifact_refs: input.artifactRefs,
      created_at: input.now,
    };
  }

  private buildN5ResearchSliceRecord(input: {
    accepted: TopicSelectionV1bAcceptedSliceSelectionPayload;
    artifactRefs: TopicSelectionFunctionalRef[];
    controlPlaneRefs: PreparedAdmittedControlPlane;
    decisionRef: TopicSelectionFunctionalRef;
    decidedBy: TopicSelectionActorType;
    input: TopicSelectionV1bWorkflowHarnessRunRequest;
    loaded: N5LoadedOptionSet;
    now: string;
    selectedOption: TopicSelectionResearchSliceOptionRecord;
    sliceId: string;
    sliceRef: TopicSelectionFunctionalRef;
    sliceVersion: string;
  }): TopicSelectionResearchSliceRecord {
    const inherited = this.inheritedConstraints(input.selectedOption);
    return {
      research_slice_id: input.sliceId,
      workspace_id: input.input.workspace_id ?? input.loaded.optionSet.workspace_id ?? null,
      title_card_id: input.loaded.optionSet.title_card_id,
      v1b_intake_snapshot_id: input.loaded.planRun.v1b_intake_snapshot_id,
      research_constraint_profile_id: input.loaded.planRun.research_constraint_profile_id,
      v1b_input_bundle_id: input.loaded.planRun.v1b_input_bundle_id,
      validated_need_id: input.loaded.planRun.validated_need_id,
      slice_version: input.sliceVersion,
      status: 'selected',
      v1b_intake_snapshot_ref: input.loaded.planRun.v1b_intake_snapshot_ref,
      research_constraint_profile_ref: input.loaded.planRun.research_constraint_profile_ref,
      readiness_assessment_ref: input.loaded.planRun.readiness_assessment_ref,
      v1b_input_bundle_ref: input.loaded.planRun.v1b_input_bundle_ref,
      validated_need_ref: input.loaded.planRun.validated_need_ref,
      evidence_map_ref: input.loaded.planRun.evidence_map_ref,
      search_run_ref: input.loaded.planRun.search_run_ref,
      search_plan_ref: input.loaded.planRun.search_plan_ref,
      literature_snapshot_ref: input.loaded.planRun.literature_snapshot_ref,
      source_option_set_ref: this.optionSetRef(input.loaded.optionSet),
      source_option_ref: this.optionRef(input.selectedOption),
      slice_selection_decision_ref: input.decisionRef,
      problem_space: input.selectedOption.problem_space,
      slice_statement: input.selectedOption.slice_statement,
      target_setting: input.selectedOption.target_setting,
      target_community: input.selectedOption.target_community,
      included_boundaries: input.selectedOption.included_boundaries,
      excluded_boundaries: input.selectedOption.excluded_boundaries,
      candidate_contribution_types: [input.selectedOption.contribution_type_candidate],
      preferred_contribution_type: input.selectedOption.contribution_type_candidate,
      contribution_rationale: input.accepted.selection_rationale,
      expected_claim: input.selectedOption.expected_claim,
      fallback_claim: input.selectedOption.fallback_claim,
      observable_success_criteria: input.selectedOption.observable_success_criteria,
      resource_assumptions: input.selectedOption.resource_assumptions,
      data_assumptions: input.selectedOption.data_assumptions,
      evaluation_path: input.selectedOption.evaluation_path,
      baseline_assumptions: input.selectedOption.baseline_assumptions,
      dependency_risks: input.selectedOption.dependency_risks,
      slice_budget: input.selectedOption.slice_budget,
      topic_question_guardrails: this.topicQuestionGuardrails(input.selectedOption, inherited),
      value_assessment_inputs: this.valueAssessmentInputs(input.selectedOption),
      must_preserve_boundaries: this.mustPreserveBoundaries(input.selectedOption, inherited),
      accepted_risk_refs: uniqueRefs([
        ...input.loaded.planRun.accepted_risk_refs,
        ...input.accepted.accepted_risk_refs,
      ]),
      memory_suggestion_refs: input.loaded.planRun.memory_suggestion_refs,
      recheck_request_refs: input.loaded.planRun.recheck_request_refs,
      gap_codes: input.loaded.planRun.gap_codes,
      non_goals: inherited.non_goals,
      claim_ceiling: inherited.claim_ceiling,
      decision_reason: input.accepted.selection_rationale,
      supersedes_research_slice_ref: null,
      superseded_by_research_slice_ref: null,
      input_snapshot_id: input.controlPlaneRefs.inputSnapshot.input_snapshot_id,
      workflow_run_id: input.input.workflow_run_id,
      gate_result_id: input.controlPlaneRefs.gateResultRef.ref_id,
      transition_attempt_id: null,
      trace_snapshot_id: null,
      artifact_refs: input.artifactRefs,
      created_by: input.decidedBy,
      created_at: input.now,
      updated_at: input.now,
    };
  }

  private buildN5EvidenceRows(
    researchSlice: TopicSelectionResearchSliceRecord,
    option: TopicSelectionResearchSliceOptionRecord,
  ): TopicSelectionResearchSliceEvidenceRefRecord[] {
    const rows: TopicSelectionResearchSliceEvidenceRefRecord[] = [];
    const push = (
      evidenceRefs: TopicSelectionFunctionalRef[],
      evidenceRole: TopicSelectionResearchSliceEvidenceRole,
      rationale: string,
    ) => {
      for (const evidenceRef of evidenceRefs) {
        rows.push({
          research_slice_evidence_ref_id: this.idFactory('research_slice_evidence_ref'),
          workspace_id: researchSlice.workspace_id ?? null,
          title_card_id: researchSlice.title_card_id,
          research_slice_id: researchSlice.research_slice_id,
          evidence_ref: evidenceRef,
          evidence_role: evidenceRole,
          rationale,
          evidence_strength_snapshot: {},
          source_locator_snapshot: {},
          created_at: this.now(),
        });
      }
    };
    push(option.support_evidence_refs, 'support', 'Selected option support evidence.');
    push(option.challenge_evidence_refs, 'challenge', 'Selected option challenge evidence.');
    push(option.baseline_evidence_refs, 'baseline', 'Selected option baseline evidence.');
    push(option.context_evidence_refs, 'context', 'Selected option context evidence.');
    return rows;
  }

  private buildN5BoundaryRows(
    researchSlice: TopicSelectionResearchSliceRecord,
    option: TopicSelectionResearchSliceOptionRecord,
    inherited: InheritedConstraints,
  ): TopicSelectionResearchSliceBoundaryRecord[] {
    return [
      ...option.included_boundaries.map((boundary) =>
        this.n5BoundaryRow(researchSlice, 'included', 'selected_option', boundary, 'Included by selected ResearchSlice option.', option.support_evidence_refs)
      ),
      ...option.excluded_boundaries.map((boundary) =>
        this.n5BoundaryRow(researchSlice, 'excluded', 'selected_option', boundary, 'Excluded by selected ResearchSlice option.', option.challenge_evidence_refs)
      ),
      ...inherited.non_goals.map((nonGoal) =>
        this.n5BoundaryRow(researchSlice, 'excluded', 'constraint_non_goal', nonGoal, 'Inherited ResearchConstraintProfile non-goal.', [])
      ),
    ];
  }

  private buildN5AssumptionRows(
    researchSlice: TopicSelectionResearchSliceRecord,
    option: TopicSelectionResearchSliceOptionRecord,
  ): TopicSelectionResearchSliceAssumptionRecord[] {
    return [
      ...option.resource_assumptions.map((assumption) =>
        this.n5AssumptionRow(researchSlice, 'resource', assumption, option.execution_risk)
      ),
      ...option.data_assumptions.map((assumption) =>
        this.n5AssumptionRow(researchSlice, 'data', assumption, option.execution_risk)
      ),
      ...option.baseline_assumptions.map((assumption) =>
        this.n5AssumptionRow(researchSlice, 'baseline', assumption, option.baseline_risk)
      ),
      this.n5AssumptionRow(researchSlice, 'evaluation', option.evaluation_path, option.scope_risk),
      ...option.dependency_risks.map((risk) =>
        this.n5AssumptionRow(researchSlice, 'dependency', risk, option.execution_risk)
      ),
    ];
  }

  private n5BoundaryRow(
    researchSlice: TopicSelectionResearchSliceRecord,
    boundaryKind: TopicSelectionResearchSliceBoundaryKind,
    boundaryType: string,
    statement: string,
    reason: string,
    evidenceRefs: TopicSelectionFunctionalRef[],
  ): TopicSelectionResearchSliceBoundaryRecord {
    return {
      research_slice_boundary_id: this.idFactory('research_slice_boundary'),
      workspace_id: researchSlice.workspace_id ?? null,
      title_card_id: researchSlice.title_card_id,
      research_slice_id: researchSlice.research_slice_id,
      boundary_kind: boundaryKind,
      boundary_type: boundaryType,
      statement,
      reason,
      evidence_refs: evidenceRefs,
      created_at: this.now(),
    };
  }

  private n5AssumptionRow(
    researchSlice: TopicSelectionResearchSliceRecord,
    assumptionType: TopicSelectionResearchSliceAssumptionType,
    statement: string,
    riskLevel: TopicSelectionResearchSliceOptionRecord['execution_risk'],
  ): TopicSelectionResearchSliceAssumptionRecord {
    return {
      research_slice_assumption_id: this.idFactory('research_slice_assumption'),
      workspace_id: researchSlice.workspace_id ?? null,
      title_card_id: researchSlice.title_card_id,
      research_slice_id: researchSlice.research_slice_id,
      assumption_type: assumptionType,
      statement,
      status: 'active',
      evidence_refs: [],
      risk_level: riskLevel,
      created_at: this.now(),
    };
  }

  private async loadN6Context(
    payload: TopicSelectionV1bN6HarnessFrozenInputPayload,
  ): Promise<{ ok: true; value: N6LoadedContext } | { ok: false; code: string; message: string }> {
    const repository = this.runnerDependencies.researchSliceRepository!;
    const [
      researchSlice,
      selectionDecision,
      optionSet,
      selectedOption,
      evidenceRefs,
      boundaries,
      assumptions,
    ] = await Promise.all([
      repository.findResearchSliceById(payload.research_slice_ref.ref_id),
      repository.findSelectionDecisionById(payload.research_slice_selection_ref.ref_id),
      repository.findOptionSetById(payload.research_slice_option_set_ref.ref_id),
      repository.findOptionById(payload.selected_slice_option_ref.ref_id),
      repository.listEvidenceRefsByResearchSliceId(payload.research_slice_ref.ref_id),
      repository.listBoundariesByResearchSliceId(payload.research_slice_ref.ref_id),
      repository.listAssumptionsByResearchSliceId(payload.research_slice_ref.ref_id),
    ]);
    if (!researchSlice || !selectionDecision || !optionSet || !selectedOption) {
      return {
        ok: false,
        code: 'N6_FROZEN_AUTHORITY_NOT_FOUND',
        message: 'N6 requires frozen ResearchSlice, selection decision, option set, and selected option authorities.',
      };
    }
    return {
      ok: true,
      value: {
        assumptions,
        boundaries,
        evidenceRefs,
        optionSet,
        researchSlice,
        selectedOption,
        selectionDecision,
      },
    };
  }

  private async n6LineageBlocker(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN6HarnessFrozenInputPayload,
    loaded: N6LoadedContext,
  ): Promise<{ code: string; message: string } | null> {
    const handoff = await this.resolveN6SourceHandoff(input, payload);
    if (!handoff.ok) {
      return {
        code: handoff.code,
        message: handoff.message,
      };
    }
    const researchSliceRef = this.ref(
      'research_slice',
      loaded.researchSlice.research_slice_id,
      loaded.researchSlice.title_card_id,
      loaded.researchSlice.slice_version,
    );
    const optionSetRef = this.optionSetRef(loaded.optionSet);
    const selectedOptionRef = this.optionRef(loaded.selectedOption);
    const selectionRef = this.ref(
      'slice_selection_decision',
      loaded.selectionDecision.slice_selection_decision_id,
      loaded.selectionDecision.title_card_id,
    );
    if (!this.refsEqual(payload.research_slice_ref, researchSliceRef)) {
      return {
        code: 'N6_RESEARCH_SLICE_REF_MISMATCH',
        message: 'N6 frozen ResearchSlice ref does not match the persisted selected ResearchSlice.',
      };
    }
    if (!this.refsEqual(payload.research_slice_option_set_ref, optionSetRef)) {
      return {
        code: 'N6_OPTION_SET_REF_MISMATCH',
        message: 'N6 frozen option-set ref does not match the persisted option set.',
      };
    }
    if (!this.refsEqual(payload.selected_slice_option_ref, selectedOptionRef)) {
      return {
        code: 'N6_SELECTED_OPTION_REF_MISMATCH',
        message: 'N6 frozen selected option ref does not match the persisted selected option.',
      };
    }
    if (!this.refsEqual(payload.research_slice_selection_ref, selectionRef)) {
      return {
        code: 'N6_SELECTION_DECISION_REF_MISMATCH',
        message: 'N6 frozen selection decision ref does not match the persisted selection decision.',
      };
    }
    const handoffPayload = handoff.value.payload as TopicSelectionV1bN5ToN6HandoffPayload;
    if (!this.n6HandoffPayloadMatches(payload, handoffPayload)) {
      return {
        code: 'N6_N5_HANDOFF_PAYLOAD_MISMATCH',
        message: 'N6 frozen payload does not match the persisted N5-to-N6 handoff artifact.',
      };
    }
    if (handoff.value.envelope.source_authority_hash !== payload.research_slice_selection_hash) {
      return {
        code: 'N6_SELECTION_DECISION_HASH_MISMATCH',
        message: 'N6 selection decision hash does not match the N5 handoff source authority hash.',
      };
    }
    if (loaded.researchSlice.status !== 'selected' || loaded.optionSet.status !== 'selected') {
      return {
        code: 'N6_SELECTED_SLICE_NOT_CURRENT_IN_FROZEN_LINEAGE',
        message: 'N6 requires a selected ResearchSlice and selected source option set in the frozen N5 lineage.',
      };
    }
    if (!this.refsEqual(loaded.researchSlice.source_option_set_ref, optionSetRef)
      || !this.refsEqual(loaded.researchSlice.source_option_ref, selectedOptionRef)
      || loaded.optionSet.selected_option_id !== loaded.selectedOption.research_slice_option_id
      || loaded.selectionDecision.selected_option_id !== loaded.selectedOption.research_slice_option_id
      || !loaded.selectionDecision.output_research_slice_ref
      || !this.refsEqual(loaded.selectionDecision.output_research_slice_ref, researchSliceRef)) {
      return {
        code: 'N6_SELECTED_SLICE_LINEAGE_MISMATCH',
        message: 'N6 ResearchSlice, selected option, option set, and selection decision lineage do not match.',
      };
    }
    const storedOptionSetHash = this.recordString(loaded.optionSet.comparison_payload.authority_hash);
    if (storedOptionSetHash !== payload.research_slice_option_set_hash) {
      return {
        code: 'N6_OPTION_SET_HASH_MISMATCH',
        message: 'N6 option-set hash does not match the persisted N4 option-set authority hash.',
      };
    }
    const selectedOptionHash = this.hashResearchSliceOptionAuthority({
      ...loaded.selectedOption,
      status: loaded.optionSet.recommended_option_id === loaded.selectedOption.research_slice_option_id
        ? 'recommended'
        : 'candidate',
    });
    if (selectedOptionHash !== payload.selected_slice_option_hash) {
      return {
        code: 'N6_SELECTED_OPTION_HASH_MISMATCH',
        message: 'N6 selected option hash does not match the frozen N5 selected-option authority.',
      };
    }
    if (!this.refsEqual(loaded.researchSlice.research_constraint_profile_ref, payload.constraint_profile_ref)
      || !this.refsEqual(loaded.researchSlice.readiness_assessment_ref, payload.intake_readiness_ref)) {
      return {
        code: 'N6_UPSTREAM_REF_MISMATCH',
        message: 'N6 ResearchSlice upstream profile/readiness refs do not match the frozen N5 handoff.',
      };
    }
    if (
      this.recordString(loaded.optionSet.comparison_payload.constraint_profile_hash) !== payload.constraint_profile_hash
      || this.recordString(loaded.optionSet.comparison_payload.intake_readiness_hash) !== payload.intake_readiness_hash
    ) {
      return {
        code: 'N6_UPSTREAM_HASH_MISMATCH',
        message: 'N6 profile/readiness hashes do not match the persisted option-set lineage.',
      };
    }
    return null;
  }

  private async resolveN6SourceHandoff(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN6HarnessFrozenInputPayload,
  ): Promise<{ ok: true; value: TopicSelectionV1bWorkflowHarnessHandoff } | { ok: false; code: string; message: string }> {
    for (const sourceRef of input.frozen_input.source_refs) {
      if (sourceRef.ref_type !== 'artifact_ref') {
        continue;
      }
      const artifact = await this.controlPlane.getArtifactRef(sourceRef.ref_id);
      const handoff = this.isN5ToN6HandoffArtifactPayload(artifact?.payload)
        ? artifact!.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff
        : null;
      if (!handoff) {
        continue;
      }
      if (this.hash(handoff) !== payload.n5_handoff_hash) {
        return {
          ok: false,
          code: 'N6_N5_HANDOFF_HASH_MISMATCH',
          message: 'N6 n5_handoff_hash does not match the persisted N5 handoff artifact.',
        };
      }
      return {
        ok: true,
        value: handoff,
      };
    }
    return {
      ok: false,
      code: 'N6_N5_HANDOFF_ARTIFACT_REQUIRED',
      message: 'N6 frozen input source_refs must include the persisted N5-to-N6 handoff artifact.',
    };
  }

  private isN5ToN6HandoffArtifactPayload(value: unknown): value is TopicSelectionV1bWorkflowHarnessHandoff {
    if (!this.isRecord(value) || !this.isRecord(value.envelope) || !this.isRecord(value.payload)) {
      return false;
    }
    return value.envelope.handoff_kind === 'N5ToN6Handoff'
      && value.envelope.source_node_id === 'topic-selection.v1b.select-research-slice.v1'
      && value.target_node_id === 'topic-selection.v1b.generate-topic-question-candidates.v1';
  }

  private n6HandoffPayloadMatches(
    payload: TopicSelectionV1bN6HarnessFrozenInputPayload,
    handoffPayload: TopicSelectionV1bN5ToN6HandoffPayload,
  ): boolean {
    return payload.constraint_profile_hash === handoffPayload.constraint_profile_hash
      && payload.intake_readiness_hash === handoffPayload.intake_readiness_hash
      && payload.research_slice_hash === handoffPayload.research_slice_hash
      && payload.research_slice_selection_hash === handoffPayload.research_slice_selection_hash
      && payload.research_slice_option_set_hash === handoffPayload.research_slice_option_set_hash
      && payload.selected_slice_option_hash === handoffPayload.selected_slice_option_hash
      && this.refsEqual(payload.constraint_profile_ref, handoffPayload.constraint_profile_ref)
      && this.refsEqual(payload.intake_readiness_ref, handoffPayload.intake_readiness_ref)
      && this.refsEqual(payload.research_slice_ref, handoffPayload.research_slice_ref)
      && this.refsEqual(payload.research_slice_selection_ref, handoffPayload.research_slice_selection_ref)
      && this.refsEqual(payload.research_slice_option_set_ref, handoffPayload.research_slice_option_set_ref)
      && this.refsEqual(payload.selected_slice_option_ref, handoffPayload.selected_slice_option_ref);
  }

  private async verifyN6RuntimeVerifiedDraftAuditArtifact(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  ): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
    if (
      !artifact.runtime_audit_ref
      || artifact.runtime_audit_ref.ref_type !== 'artifact_ref'
      || !this.refsEqual(artifact.provenance_ref, artifact.runtime_audit_ref)
    ) {
      return this.n6RuntimeAuditDrift('N6 runtime draft provenance must point to its audit artifact_ref.');
    }
    const auditArtifact = await this.controlPlane.getArtifactRef(artifact.runtime_audit_ref.ref_id);
    if (
      !auditArtifact
      || auditArtifact.artifact_kind !== 'diagnostic'
      || auditArtifact.checksum !== artifact.runtime_audit_hash
      || auditArtifact.workflow_run_id !== input.workflow_run_id
    ) {
      return this.n6RuntimeAuditDrift('N6 runtime draft audit artifact is missing or checksum-drifted.');
    }
    const auditPayload = auditArtifact.payload;
    if (!this.isRecord(auditPayload) || !this.isRecord(auditPayload.provenance)) {
      return this.n6RuntimeAuditDrift('N6 runtime draft audit payload is not a valid invocation audit snapshot.');
    }
    const provenance = auditPayload.provenance;
    const expectedSourceKind = artifact.execution_mode === 'mocked_llm' ? 'mock_fixture' : 'codex_response';
    if (
      auditPayload.node_id !== input.node_id
      || auditPayload.workflow_run_id !== input.workflow_run_id
      || auditPayload.node_attempt_id !== input.node_attempt_id
      || auditPayload.status !== 'succeeded'
      || provenance.workflow_run_id !== input.workflow_run_id
      || provenance.node_id !== input.node_id
      || provenance.node_attempt_id !== input.node_attempt_id
      || provenance.execution_mode !== artifact.execution_mode
      || provenance.source_kind !== expectedSourceKind
      || provenance.non_provider !== true
      || provenance.run_mode !== artifact.run_mode
      || provenance.profile_id !== artifact.profile_id
      || provenance.model_option_id !== artifact.model_option_id
      || provenance.output_contract !== artifact.output_contract
      || provenance.prompt_packet_hash !== artifact.prompt_packet_hash
      || provenance.structured_output_hash !== artifact.structured_output_hash
      || provenance.cache_status !== 'not_applicable'
      || provenance.response_reuse_ref !== null
      || provenance.telemetry !== null
    ) {
      return this.n6RuntimeAuditDrift('N6 runtime draft audit provenance does not match the draft artifact identity.');
    }
    return { ok: true };
  }

  private n6RuntimeAuditDrift(message: string): { ok: false; code: string; message: string } {
    return {
      ok: false,
      code: 'N6_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
      message,
    };
  }

  private async resolveN6DraftPayload(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN6HarnessFrozenInputPayload,
  ): Promise<{ ok: true } & N6DraftResolution | { ok: false; code: string; message: string }> {
    const semanticArtifact = (input.semantic_artifacts ?? []).find((artifact) =>
      artifact.slot_id === 'n6_question_candidate_draft'
      && artifact.allowed_effect === 'model_draft_for_gate'
    );
    if (!semanticArtifact || !semanticArtifact.normalized_output_ref) {
      return {
        ok: false,
        code: 'N6_FROZEN_DRAFT_ARTIFACT_REQUIRED',
        message: 'N6 requires a frozen normalized TopicQuestionCandidateSetDraft semantic artifact.',
      };
    }
    const [supportArtifact, normalizedArtifact, provenanceArtifact] = await Promise.all([
      this.controlPlane.getArtifactRef(semanticArtifact.support_artifact_ref.ref_id),
      this.controlPlane.getArtifactRef(semanticArtifact.normalized_output_ref.ref_id),
      this.controlPlane.getArtifactRef(semanticArtifact.provenance_ref.ref_id),
    ]);
    if (!supportArtifact || !normalizedArtifact || !provenanceArtifact) {
      return {
        ok: false,
        code: 'N6_FROZEN_DRAFT_ARTIFACT_NOT_FOUND',
        message: 'N6 semantic artifact refs must resolve to frozen control-plane ArtifactRef records.',
      };
    }
    if (
      supportArtifact.checksum !== semanticArtifact.support_artifact_hash
      || normalizedArtifact.checksum !== semanticArtifact.normalized_output_hash
    ) {
      return {
        ok: false,
        code: 'N6_FROZEN_DRAFT_ARTIFACT_HASH_MISMATCH',
        message: 'N6 semantic artifact hashes do not match persisted ArtifactRef checksums.',
      };
    }
    const draftPayload = this.extractN6DraftPayload(normalizedArtifact.payload);
    if (!draftPayload) {
      return {
        ok: false,
        code: 'N6_TOPIC_QUESTION_CANDIDATE_DRAFT_INVALID',
        message: 'N6 normalized semantic artifact must contain a TopicQuestionCandidateSetDraft payload.',
      };
    }
    const draftHash = this.hash(draftPayload);
    if (
      draftHash !== semanticArtifact.normalized_output_hash
      || draftHash !== semanticArtifact.structured_output_hash
    ) {
      return {
        ok: false,
        code: 'N6_FROZEN_DRAFT_ARTIFACT_HASH_MISMATCH',
        message: 'N6 TopicQuestionCandidateSetDraft payload hash does not match semantic artifact provenance.',
      };
    }
    if (
      semanticArtifact.runtime_provenance_class === 'runtime_verified'
      && semanticArtifact.execution_mode !== 'codex_assisted'
      && semanticArtifact.execution_mode !== 'mocked_llm'
    ) {
      return {
        ok: false,
        code: 'N6_DRAFT_ARTIFACT_PROVENANCE_CLASS_INVALID',
        message: 'runtime_verified v1b N6 draft artifacts must be generated by the N6 draft runtime.',
      };
    }
    if (semanticArtifact.runtime_provenance_class === 'runtime_verified') {
      const auditVerification = await this.verifyN6RuntimeVerifiedDraftAuditArtifact(input, semanticArtifact);
      if (!auditVerification.ok) {
        return auditVerification;
      }
    }
    const admissionExecutionMode = semanticArtifact.execution_mode === 'mocked_llm'
      ? 'mocked_llm'
      : 'codex_assisted';
    const generationMode = await this.resolveN6DraftGenerationMode(input, semanticArtifact);
    if (!generationMode.ok) {
      return generationMode;
    }
    const expectedIdentity = await this.resolveN6DraftAdmissionExpectedIdentity({
      input,
      payload,
      draftHash,
      semanticArtifact,
      admissionExecutionMode,
      generationMode: generationMode.value,
    });
    if (!expectedIdentity.ok) {
      return expectedIdentity;
    }
    const admission = this.n6DraftAdmission.admit({
      artifact: semanticArtifact,
      expected: expectedIdentity.value,
      allow_fixture_replay: input.run_mode !== 'product',
    });
    if (!admission.admitted) {
      return {
        ok: false,
        code: admission.blocker.code,
        message: admission.blocker.message,
      };
    }
    return {
      ok: true,
      artifactRefs: uniqueRefs([
        semanticArtifact.support_artifact_ref,
        semanticArtifact.normalized_output_ref,
        semanticArtifact.provenance_ref,
      ]),
      draft: draftPayload,
      draftHash,
      semanticArtifact,
    };
  }

  private async resolveN6DraftAdmissionExpectedIdentity(input: {
    input: TopicSelectionV1bWorkflowHarnessRunRequest;
    payload: TopicSelectionV1bN6HarnessFrozenInputPayload;
    draftHash: string;
    semanticArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    admissionExecutionMode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
    generationMode: TopicSelectionV1bN6DraftGenerationMode;
  }): Promise<{
    ok: true;
    value: TopicSelectionV1bN6DraftAdmissionExpectedIdentity;
  } | { ok: false; code: string; message: string }> {
    try {
      const value = await this.n6DraftRuntime.buildAdmissionExpectedIdentity({
        request: input.input,
        frozenPayload: input.payload,
        generationMode: input.generationMode,
        normalizedPayloadHash: input.draftHash,
        executionMode: input.admissionExecutionMode,
        runMode: input.semanticArtifact.run_mode,
        profileId: input.semanticArtifact.profile_id,
        modelOptionId: input.semanticArtifact.model_option_id,
      });
      return { ok: true, value };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          ok: false,
          code: 'N6_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
          message: error.message,
        };
      }
      throw error;
    }
  }

  private async resolveN6DraftGenerationMode(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  ): Promise<{ ok: true; value: TopicSelectionV1bN6DraftGenerationMode } | {
    ok: false;
    code: string;
    message: string;
  }> {
    const carriesN7LoopbackProjection = await this.n6InputCarriesN7LoopbackProjection(input);
    if (!carriesN7LoopbackProjection.ok) {
      return carriesN7LoopbackProjection;
    }
    const carriesN6GateFailureProjection = await this.n6InputCarriesN6GateFailureProjection(input);
    if (!carriesN6GateFailureProjection.ok) {
      return carriesN6GateFailureProjection;
    }
    if (artifact.prompt_variant_key === 'n6_question_candidate_draft.regeneration_after_n7_loopback') {
      if (!carriesN7LoopbackProjection.value || carriesN6GateFailureProjection.value) {
        return {
          ok: false,
          code: 'N6_N7_LOOPBACK_PROJECTION_REQUIRED',
          message: 'N6 regeneration_after_n7_loopback requires exactly one N7 failed-trial loopback projection source artifact and no N6 gate-failure retry projection.',
        };
      }
      return { ok: true, value: 'regeneration_after_n7_loopback' };
    }
    if (artifact.prompt_variant_key === 'n6_question_candidate_draft.regeneration_after_n6_gate_failure') {
      if (!carriesN6GateFailureProjection.value || carriesN7LoopbackProjection.value) {
        return {
          ok: false,
          code: 'N6_GATE_FAILURE_RETRY_PROJECTION_REQUIRED',
          message: 'N6 regeneration_after_n6_gate_failure requires exactly one N6 gate-failure retry projection source artifact and no N7 failed-trial loopback projection.',
        };
      }
      return { ok: true, value: 'regeneration_after_n6_gate_failure' };
    }
    if (carriesN7LoopbackProjection.value || carriesN6GateFailureProjection.value) {
      return {
        ok: false,
        code: 'N6_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT',
        message: 'N6 input carries loopback/retry projection context, but the draft prompt identity does not match that projection mode.',
      };
    }
    return { ok: true, value: 'initial_from_n5' };
  }

  private async n6InputCarriesN7LoopbackProjection(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
  ): Promise<{ ok: true; value: boolean } | { ok: false; code: string; message: string }> {
    let projectionCount = 0;
    for (const sourceRef of input.frozen_input.source_refs) {
      if (sourceRef.ref_type !== 'artifact_ref') {
        continue;
      }
      const artifact = await this.controlPlane.getArtifactRef(sourceRef.ref_id);
      if (
        !this.isRecord(artifact?.payload)
        || artifact.payload.projection_kind !== 'v1b_n7_to_n6_failed_trial_loopback_context'
      ) {
        continue;
      }
      projectionCount += 1;
      if (!artifact.checksum || artifact.checksum !== this.hash(artifact.payload)) {
        return {
          ok: false,
          code: 'N6_N7_LOOPBACK_PROJECTION_HASH_MISMATCH',
          message: 'N6 N7 loopback projection source artifact checksum is missing or drifted.',
        };
      }
    }
    if (projectionCount > 1) {
      return {
        ok: false,
        code: 'N6_N7_LOOPBACK_PROJECTION_AMBIGUOUS',
        message: 'N6 regeneration accepts exactly one N7 failed-trial loopback projection source artifact.',
      };
    }
    return { ok: true, value: projectionCount === 1 };
  }

  private async n6InputCarriesN6GateFailureProjection(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
  ): Promise<{ ok: true; value: boolean } | { ok: false; code: string; message: string }> {
    let projectionCount = 0;
    for (const sourceRef of input.frozen_input.source_refs) {
      if (sourceRef.ref_type !== 'artifact_ref') {
        continue;
      }
      const artifact = await this.controlPlane.getArtifactRef(sourceRef.ref_id);
      if (
        !this.isRecord(artifact?.payload)
        || artifact.payload.projection_kind !== 'v1b_n6_gate_failure_retry_context'
      ) {
        continue;
      }
      projectionCount += 1;
      if (!artifact.checksum || artifact.checksum !== this.hash(artifact.payload)) {
        return {
          ok: false,
          code: 'N6_GATE_FAILURE_RETRY_PROJECTION_HASH_MISMATCH',
          message: 'N6 gate-failure retry projection source artifact checksum is missing or drifted.',
        };
      }
    }
    if (projectionCount > 1) {
      return {
        ok: false,
        code: 'N6_GATE_FAILURE_RETRY_PROJECTION_AMBIGUOUS',
        message: 'N6 regeneration accepts exactly one N6 gate-failure retry projection source artifact.',
      };
    }
    return { ok: true, value: projectionCount === 1 };
  }

  private async resolveN6LoopbackPlan(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    context: {
      blockedCandidateContexts: Record<string, unknown>[];
      defaultAffectedRef: TopicSelectionFunctionalRef;
      draftArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
      draftHash: string;
      frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload;
    },
  ): Promise<{ ok: true; value: N6LoopbackPlan } | { ok: false; code: string; message: string }> {
    const triage = await this.resolveN6LoopbackTriage(input, {
      draftArtifact: context.draftArtifact,
      draftHash: context.draftHash,
      frozenPayload: context.frozenPayload,
    });
    if (!triage.ok) {
      return triage;
    }
    if (!triage.value) {
      return {
        ok: true,
        value: {
          affectedRefs: [context.defaultAffectedRef],
          debateEscalation: null,
          failureScope: 'candidate_level',
          loopbackTargetCode: 'n6_regenerate_candidates',
          rationale: 'N6 deterministic gate found no admissible candidates, so the harness requests candidate regeneration.',
          reasonCodes: this.n6LoopbackReasonCodes(context.blockedCandidateContexts),
          regenerationHints: [],
          routeTargetNodeId: 'topic-selection.v1b.generate-topic-question-candidates.v1',
          triageArtifact: null,
          triagePayloadHash: null,
          upstreamRollback: null,
        },
      };
    }

    const policyBlocker = this.n6LoopbackTriagePolicyBlocker(triage.value.payload, context.frozenPayload);
    if (policyBlocker) {
      return policyBlocker;
    }
    return {
      ok: true,
      value: {
        affectedRefs: triage.value.payload.affected_refs,
        debateEscalation: triage.value.payload.debate_escalation,
        failureScope: triage.value.payload.failure_scope,
        loopbackTargetCode: triage.value.payload.loopback_target_code,
        rationale: triage.value.payload.rationale,
        reasonCodes: triage.value.payload.dominant_reason_codes,
        regenerationHints: triage.value.payload.regeneration_hints,
        routeTargetNodeId: this.n6LoopbackRouteTargetNode(triage.value.payload.loopback_target_code),
        triageArtifact: triage.value.artifact,
        triagePayloadHash: triage.value.payloadHash,
        upstreamRollback: triage.value.payload.upstream_rollback,
      },
    };
  }

  private async resolveN6LoopbackTriage(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    context: {
      draftArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
      draftHash: string;
      frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload;
    },
  ): Promise<{ ok: true; value: N6LoopbackTriageResolution } | { ok: false; code: string; message: string }> {
    const artifact = (input.semantic_artifacts ?? []).find((item) => item.slot_id === 'n6_loopback_triage');
    if (!artifact) {
      return { ok: true, value: null };
    }
    if (!artifact.normalized_output_ref) {
      return {
        ok: false,
        code: 'N6_LOOPBACK_TRIAGE_ARTIFACT_NOT_FOUND',
        message: 'N6 loopback triage support artifact must provide a frozen normalized_output_ref.',
      };
    }
    const [support, normalized, provenance] = await Promise.all([
      this.controlPlane.getArtifactRef(artifact.support_artifact_ref.ref_id),
      this.controlPlane.getArtifactRef(artifact.normalized_output_ref.ref_id),
      this.controlPlane.getArtifactRef(artifact.provenance_ref.ref_id),
    ]);
    if (!support || !normalized || !provenance) {
      return {
        ok: false,
        code: 'N6_LOOPBACK_TRIAGE_ARTIFACT_NOT_FOUND',
        message: 'N6 loopback triage artifact refs must resolve to frozen control-plane ArtifactRef records.',
      };
    }
    if (
      support.checksum !== artifact.support_artifact_hash
      || normalized.checksum !== artifact.normalized_output_hash
    ) {
      return {
        ok: false,
        code: 'N6_LOOPBACK_TRIAGE_ARTIFACT_HASH_MISMATCH',
        message: 'N6 loopback triage artifact hashes do not match persisted ArtifactRef checksums.',
      };
    }
    if (!this.isN6LoopbackTriageSupportPayload(normalized.payload)) {
      return {
        ok: false,
        code: 'N6_LOOPBACK_TRIAGE_ARTIFACT_INVALID',
        message: 'N6 loopback triage normalized payload does not match N6LoopbackTriageSupport@v1.',
      };
    }
    const payloadHash = this.hash(normalized.payload);
    if (
      payloadHash !== artifact.normalized_output_hash
      || payloadHash !== artifact.structured_output_hash
      || payloadHash !== artifact.support_artifact_hash
    ) {
      return {
        ok: false,
        code: 'N6_LOOPBACK_TRIAGE_ARTIFACT_HASH_MISMATCH',
        message: 'N6 loopback triage payload hash does not match frozen provenance.',
      };
    }
    if (artifact.runtime_provenance_class === 'runtime_verified') {
      const auditVerification = await this.verifyN6RuntimeVerifiedLoopbackTriageAuditArtifact(input, artifact);
      if (!auditVerification.ok) {
        return auditVerification;
      }
    }
    const admissionExecutionMode = artifact.execution_mode === 'mocked_llm'
      ? 'mocked_llm'
      : 'codex_assisted';
    let expectedIdentity;
    try {
      expectedIdentity = this.n6LoopbackTriageRuntime.buildAdmissionExpectedIdentity({
        request: input,
        frozenPayload: context.frozenPayload,
        failedDraftArtifact: context.draftArtifact,
        failedDraftHash: context.draftHash,
        normalizedPayloadHash: payloadHash,
        executionMode: admissionExecutionMode,
        runMode: artifact.run_mode,
        profileId: artifact.profile_id,
        modelOptionId: artifact.model_option_id,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return {
          ok: false,
          code: 'N6_LOOPBACK_TRIAGE_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
          message: error.message,
        };
      }
      throw error;
    }
    const admission = this.n6LoopbackTriageAdmission.admit({
      artifact,
      expected: expectedIdentity,
      allow_fixture_replay: input.run_mode !== 'product',
    });
    if (!admission.admitted) {
      return {
        ok: false,
        code: admission.blocker.code,
        message: admission.blocker.message,
      };
    }
    return {
      ok: true,
      value: {
        artifact,
        payload: normalized.payload as unknown as TopicSelectionV1bN6LoopbackTriageSupportPayload,
        payloadHash,
      },
    };
  }

  private n6LoopbackTriagePolicyBlocker(
    payload: TopicSelectionV1bN6LoopbackTriageSupportPayload,
    frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload,
  ): { ok: false; code: string; message: string } | null {
    const affectedRefsBlocker = this.n6LoopbackTriageAffectedRefsBlocker(payload, frozenPayload);
    if (affectedRefsBlocker) {
      return affectedRefsBlocker;
    }
    if (payload.loopback_target_code === 'n6_debate_escalation') {
      if (!this.isN6CandidateRetryScope(payload.failure_scope)) {
        return {
          ok: false,
          code: 'N6_LOOPBACK_TRIAGE_POLICY_MISMATCH',
          message: 'N6 debate escalation triage requires candidate-level or question-frame-level failure_scope.',
        };
      }
      if (!payload.debate_escalation || payload.upstream_rollback) {
        return {
          ok: false,
          code: 'N6_LOOPBACK_TRIAGE_POLICY_MISMATCH',
          message: 'N6 debate escalation triage requires debate_escalation and forbids upstream_rollback.',
        };
      }
      return null;
    }
    if (payload.loopback_target_code === 'n6_loopback_to_n5_select_different_slice') {
      if (!this.isN6UpstreamRollbackScope(payload.failure_scope)) {
        return {
          ok: false,
          code: 'N6_LOOPBACK_TRIAGE_POLICY_MISMATCH',
          message: 'N6 upstream rollback triage requires slice-level or upstream-context-level failure_scope.',
        };
      }
      if (!payload.upstream_rollback || payload.debate_escalation) {
        return {
          ok: false,
          code: 'N6_LOOPBACK_TRIAGE_POLICY_MISMATCH',
          message: 'N6 upstream rollback triage requires upstream_rollback and forbids debate_escalation.',
        };
      }
      return null;
    }
    if (!this.isN6CandidateRetryScope(payload.failure_scope)) {
      return {
        ok: false,
        code: 'N6_LOOPBACK_TRIAGE_POLICY_MISMATCH',
        message: 'N6 regeneration triage requires candidate-level or question-frame-level failure_scope.',
      };
    }
    if (payload.debate_escalation || payload.upstream_rollback) {
      return {
        ok: false,
        code: 'N6_LOOPBACK_TRIAGE_POLICY_MISMATCH',
        message: 'N6 regeneration triage must not include debate_escalation or upstream_rollback.',
      };
    }
    return null;
  }

  private async verifyN6RuntimeVerifiedLoopbackTriageAuditArtifact(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  ): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
    if (
      !artifact.runtime_audit_ref
      || artifact.runtime_audit_ref.ref_type !== 'artifact_ref'
      || !this.refsEqual(artifact.provenance_ref, artifact.runtime_audit_ref)
    ) {
      return this.n6LoopbackTriageRuntimeAuditDrift(
        'N6 loopback triage runtime provenance must point to its audit artifact_ref.',
      );
    }
    const auditArtifact = await this.controlPlane.getArtifactRef(artifact.runtime_audit_ref.ref_id);
    if (
      !auditArtifact
      || auditArtifact.artifact_kind !== 'diagnostic'
      || auditArtifact.checksum !== artifact.runtime_audit_hash
      || auditArtifact.workflow_run_id !== input.workflow_run_id
    ) {
      return this.n6LoopbackTriageRuntimeAuditDrift(
        'N6 loopback triage runtime audit artifact is missing or checksum-drifted.',
      );
    }
    const auditPayload = auditArtifact.payload;
    if (!this.isRecord(auditPayload) || !this.isRecord(auditPayload.provenance)) {
      return this.n6LoopbackTriageRuntimeAuditDrift(
        'N6 loopback triage runtime audit payload is not a valid invocation audit snapshot.',
      );
    }
    const provenance = auditPayload.provenance;
    const expectedSourceKind = artifact.execution_mode === 'mocked_llm' ? 'mock_fixture' : 'codex_response';
    if (
      auditPayload.node_id !== input.node_id
      || auditPayload.workflow_run_id !== input.workflow_run_id
      || auditPayload.node_attempt_id !== input.node_attempt_id
      || auditPayload.status !== 'succeeded'
      || provenance.workflow_run_id !== input.workflow_run_id
      || provenance.node_id !== input.node_id
      || provenance.node_attempt_id !== input.node_attempt_id
      || provenance.execution_mode !== artifact.execution_mode
      || provenance.source_kind !== expectedSourceKind
      || provenance.non_provider !== true
      || provenance.run_mode !== artifact.run_mode
      || provenance.profile_id !== artifact.profile_id
      || provenance.model_option_id !== artifact.model_option_id
      || provenance.output_contract !== artifact.output_contract
      || provenance.prompt_packet_hash !== artifact.prompt_packet_hash
      || provenance.structured_output_hash !== artifact.structured_output_hash
      || provenance.cache_status !== 'not_applicable'
      || provenance.response_reuse_ref !== null
      || provenance.telemetry !== null
    ) {
      return this.n6LoopbackTriageRuntimeAuditDrift(
        'N6 loopback triage runtime audit provenance does not match the support artifact identity.',
      );
    }
    return { ok: true };
  }

  private n6LoopbackTriageRuntimeAuditDrift(
    message: string,
  ): { ok: false; code: string; message: string } {
    return {
      ok: false,
      code: 'N6_LOOPBACK_TRIAGE_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
      message,
    };
  }

  private n6LoopbackTriageAffectedRefsBlocker(
    payload: TopicSelectionV1bN6LoopbackTriageSupportPayload,
    frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload,
  ): { ok: false; code: string; message: string } | null {
    const allowedLineageRefs = uniqueRefs([
      frozenPayload.constraint_profile_ref,
      frozenPayload.intake_readiness_ref,
      frozenPayload.research_slice_ref,
      frozenPayload.research_slice_selection_ref,
      frozenPayload.research_slice_option_set_ref,
      frozenPayload.selected_slice_option_ref,
    ]);
    const allowedLineageRefKeys = new Set(allowedLineageRefs.map((ref) => this.refKey(ref)));
    const outsideLineageRef = payload.affected_refs
      .find((affectedRef) => !allowedLineageRefKeys.has(this.refKey(affectedRef)));
    const includesSelectedSlice = payload.affected_refs
      .some((affectedRef) => this.refsEqual(affectedRef, frozenPayload.research_slice_ref));
    if (outsideLineageRef || !includesSelectedSlice) {
      return {
        ok: false,
        code: 'N6_LOOPBACK_TRIAGE_AFFECTED_REFS_MISMATCH',
        message: 'N6 loopback triage affected_refs must stay within the frozen N6 lineage and include the selected ResearchSlice ref.',
      };
    }
    return null;
  }

  private isN6CandidateRetryScope(
    failureScope: TopicSelectionV1bN6LoopbackTriageSupportPayload['failure_scope'],
  ): boolean {
    return failureScope === 'candidate_level' || failureScope === 'question_frame_level';
  }

  private isN6UpstreamRollbackScope(
    failureScope: TopicSelectionV1bN6LoopbackTriageSupportPayload['failure_scope'],
  ): boolean {
    return failureScope === 'slice_level' || failureScope === 'upstream_context_level';
  }

  private n6LoopbackRouteTargetNode(
    loopbackTargetCode: TopicSelectionV1bN6LoopbackTriageSupportPayload['loopback_target_code'],
  ): TopicSelectionV1bWorkflowHarnessNodeId {
    if (loopbackTargetCode === 'n6_loopback_to_n5_select_different_slice') {
      return 'topic-selection.v1b.select-research-slice.v1';
    }
    return 'topic-selection.v1b.generate-topic-question-candidates.v1';
  }

  private n6LoopbackWarnings(plan: N6LoopbackPlan): TopicSelectionGateIssue[] {
    if (plan.loopbackTargetCode !== 'n6_debate_escalation') {
      return [];
    }
    return [
      this.warning(
        'N6_DEBATE_ESCALATION_RECOMMENDED',
        'N6 loopback triage recommends debate escalation before retrying candidate generation.',
        plan.affectedRefs,
      ),
    ];
  }

  private n6LoopbackReasonCodes(blockedCandidateContexts: Record<string, unknown>[]): string[] {
    return uniqueStrings(
      blockedCandidateContexts
        .map((context) => typeof context.dominant_reason === 'string' ? context.dominant_reason : null)
        .filter((reason): reason is string => Boolean(reason)),
    );
  }

  private isN6LoopbackTriageSupportPayload(value: unknown): value is TopicSelectionV1bN6LoopbackTriageSupportPayload {
    if (!this.isRecord(value) || !this.hasOnlyKeys(value, [
      'affected_refs',
      'debate_escalation',
      'dominant_reason_codes',
      'failure_scope',
      'loopback_target_code',
      'rationale',
      'regeneration_hints',
      'upstream_rollback',
    ])) {
      return false;
    }
    return [
      'n6_regenerate_candidates',
      'n6_debate_escalation',
      'n6_loopback_to_n5_select_different_slice',
    ].includes(value.loopback_target_code as string)
      && ['candidate_level', 'question_frame_level', 'slice_level', 'upstream_context_level'].includes(value.failure_scope as string)
      && this.isStringArray(value.dominant_reason_codes)
      && (value.dominant_reason_codes as string[]).length > 0
      && this.isFunctionalRefArray(value.affected_refs)
      && (value.affected_refs as unknown[]).length > 0
      && this.isStringArray(value.regeneration_hints)
      && typeof value.rationale === 'string'
      && value.rationale.trim().length > 0
      && this.isN6DebateEscalationPayload(value.debate_escalation)
      && this.isN6UpstreamRollbackPayload(value.upstream_rollback);
  }

  private isN6DebateEscalationPayload(
    value: unknown,
  ): value is TopicSelectionV1bN6LoopbackTriageSupportPayload['debate_escalation'] {
    return value === null || (
      this.isRecord(value)
      && this.hasOnlyKeys(value, ['debate_level', 'recommended_profile_id', 'sticky', 'rationale'])
      && ['mixed_cost_control', 'provider_diverse_deep'].includes(value.debate_level as string)
      && typeof value.recommended_profile_id === 'string'
      && value.recommended_profile_id.trim().length > 0
      && typeof value.sticky === 'boolean'
      && typeof value.rationale === 'string'
      && value.rationale.trim().length > 0
    );
  }

  private isN6UpstreamRollbackPayload(
    value: unknown,
  ): value is TopicSelectionV1bN6LoopbackTriageSupportPayload['upstream_rollback'] {
    return value === null || (
      this.isRecord(value)
      && this.hasOnlyKeys(value, ['target_node_id', 'repair_action', 'rationale'])
      && value.target_node_id === 'topic-selection.v1b.select-research-slice.v1'
      && value.repair_action === 'select_different_slice'
      && typeof value.rationale === 'string'
      && value.rationale.trim().length > 0
    );
  }

  private extractN6DraftPayload(
    payload: Record<string, unknown> | null | undefined,
  ): TopicSelectionV1bTopicQuestionCandidateSetDraftPayload | null {
    if (!this.isRecord(payload)) {
      return null;
    }
    const candidate = this.isRecord(payload.normalized_output)
      ? payload.normalized_output
      : payload;
    return this.isN6DraftPayload(candidate)
      ? candidate as unknown as TopicSelectionV1bTopicQuestionCandidateSetDraftPayload
      : null;
  }

  private isN6DraftPayload(value: Record<string, unknown>): boolean {
    return this.hasOnlyKeys(value, [
      'candidates',
      'generation_notes',
      'human_review_triggers',
      'question_frame',
      'recommended_candidate_keys',
    ])
      && this.isRecord(value.question_frame)
      && this.isStringArray(value.recommended_candidate_keys)
      && this.isStringArray(value.generation_notes)
      && this.isStringArray(value.human_review_triggers)
      && Array.isArray(value.candidates);
  }

  private validateAndBuildN6Candidates(input: {
    decisionMemory: ResolvedTopicSelectionDecisionMemoryPacket | null;
    candidateSetId: string;
    draft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload;
    draftHash: string;
    input: TopicSelectionV1bWorkflowHarnessRunRequest;
    loaded: N6LoadedContext;
    payload: TopicSelectionV1bN6HarnessFrozenInputPayload;
    questionFrameId: string;
    runId: string;
  }): { ok: true; value: N6CandidateValidationResult } | {
    ok: false;
    blockedCandidateContexts?: Record<string, unknown>[];
    code: string;
    message: string;
    routeDecision: 'blocked' | 'loopback';
    warnings?: TopicSelectionGateIssue[];
  } {
    const { draft, loaded, payload } = input;
    if (draft.candidates.length === 0) {
      return {
        ok: false,
        code: 'N6_NO_TOPIC_QUESTION_CANDIDATES',
        message: 'N6 TopicQuestionCandidateSetDraft must include at least one candidate.',
        routeDecision: 'blocked',
      };
    }
    if (draft.candidates.length > 5) {
      return {
        ok: false,
        code: 'N6_TOO_MANY_TOPIC_QUESTION_CANDIDATES',
        message: 'N6 TopicQuestionCandidateSetDraft must contain no more than five candidates.',
        routeDecision: 'blocked',
      };
    }
    const duplicateKey = this.firstDuplicate(draft.candidates.map((candidate) => candidate.candidate_key));
    if (duplicateKey) {
      return {
        ok: false,
        code: 'N6_DUPLICATE_TOPIC_QUESTION_CANDIDATE_KEY',
        message: `N6 TopicQuestionCandidateSetDraft contains duplicate candidate_key ${duplicateKey}.`,
        routeDecision: 'blocked',
      };
    }
    const malformedIndex = draft.candidates.findIndex((candidate) => !this.isN6CandidateDraft(candidate));
    if (malformedIndex >= 0 || !this.isN6QuestionFrameDraft(draft.question_frame)) {
      return {
        ok: false,
        code: 'N6_TOPIC_QUESTION_CANDIDATE_DRAFT_INVALID',
        message: 'N6 TopicQuestionCandidateSetDraft contains malformed question frame or candidate payload.',
        routeDecision: 'blocked',
      };
    }
    const context = this.n6KnownContext(loaded, payload);
    const frameBlocker = this.n6FrameBlocker(draft, context);
    if (frameBlocker) {
      return {
        ok: false,
        code: frameBlocker.code,
        message: frameBlocker.message,
        routeDecision: 'blocked',
      };
    }

    const now = this.now();
    const titleCardId = loaded.researchSlice.title_card_id;
    const workspaceId = input.input.workspace_id ?? loaded.researchSlice.workspace_id ?? null;
    const questionFrame: TopicSelectionQuestionFrameRecord = {
      question_frame_id: input.questionFrameId,
      workspace_id: workspaceId,
      title_card_id: titleCardId,
      form_topic_question_run_id: input.runId,
      research_slice_id: loaded.researchSlice.research_slice_id,
      research_slice_version: loaded.researchSlice.slice_version,
      source_validated_need_refs: [loaded.researchSlice.validated_need_ref],
      target_setting: draft.question_frame.target_setting,
      target_community: draft.question_frame.target_community,
      object_scope: draft.question_frame.object_scope,
      task_scope: draft.question_frame.task_scope,
      intervention_or_approach: draft.question_frame.intervention_or_approach,
      comparison_baseline: draft.question_frame.comparison_baseline,
      observable_outcome: draft.question_frame.observable_outcome,
      assumption_refs: draft.question_frame.assumption_refs,
      evidence_refs: draft.question_frame.evidence_refs,
      frame_payload: {
        ...draft.question_frame.frame_payload,
        inherited_claim_ceiling: loaded.researchSlice.claim_ceiling,
        inherited_non_goals: loaded.researchSlice.non_goals,
        n5_handoff_hash: payload.n5_handoff_hash,
        value_assessment_inputs: loaded.researchSlice.value_assessment_inputs,
      },
      checksum: this.hash(draft.question_frame),
      created_at: now,
    };
    const blockedCandidateContexts: Record<string, unknown>[] = [];
    const candidates: TopicSelectionTopicQuestionCandidateRecord[] = [];
    for (const [index, candidate] of draft.candidates.entries()) {
      const structuralBlocker = this.n6CandidateStructuralBlocker(candidate, context, index);
      if (structuralBlocker) {
        return {
          ok: false,
          code: structuralBlocker.code,
          message: structuralBlocker.message,
          routeDecision: 'blocked',
        };
      }
      const semanticBlocker = this.n6CandidateSemanticBlocker(candidate, context);
      if (semanticBlocker) {
        blockedCandidateContexts.push({
          affected_refs: [payload.research_slice_ref],
          candidate_key: candidate.candidate_key,
          dominant_reason: semanticBlocker.reason,
          message: semanticBlocker.message,
          scope: 'candidate_level',
        });
        continue;
      }
      const candidateId = this.idFactory('topic_question_candidate');
      candidates.push({
        topic_question_candidate_id: candidateId,
        workspace_id: workspaceId,
        title_card_id: titleCardId,
        candidate_set_id: input.candidateSetId,
        question_frame_id: input.questionFrameId,
        research_slice_id: loaded.researchSlice.research_slice_id,
        research_slice_version: loaded.researchSlice.slice_version,
        candidate_ordinal: index + 1,
        candidate_key: candidate.candidate_key,
        status: draft.recommended_candidate_keys.includes(candidate.candidate_key) ? 'recommended' : 'candidate',
        main_question: candidate.main_question,
        sub_questions: candidate.sub_questions,
        question_type: candidate.question_type,
        contribution_hypothesis: candidate.contribution_hypothesis,
        source_validated_need_refs: candidate.source_validated_need_refs,
        answerability_verdict: candidate.answerability_verdict,
        answerability_plan_payload: candidate.answerability_plan,
        boundary_check_payload: candidate.boundary_check,
        traceability_check_payload: candidate.traceability_check,
        expected_claim: candidate.expected_claim,
        fallback_claim: candidate.fallback_claim,
        max_claim_strength: candidate.max_claim_strength,
        observable_success_criteria: candidate.observable_success_criteria,
        falsification_conditions_payload: candidate.falsification_conditions,
        risk_notes: candidate.risk_notes,
        blockers: candidate.blockers,
        objections: candidate.objections,
        human_review_triggers: candidate.human_review_triggers,
        confidence: candidate.confidence ?? null,
        created_at: now,
      });
    }
    if (candidates.length === 0) {
      return {
        ok: false,
        blockedCandidateContexts,
        code: 'N6_NO_ADMISSIBLE_TOPIC_QUESTION_CANDIDATE',
        message: 'N6 deterministic gate found no admissible TopicQuestion candidates.',
        routeDecision: 'loopback',
        warnings: [
          this.warning(
            'N6_BLOCKED_CANDIDATES_PRESERVED_FOR_LOOPBACK',
            'N6 preserved compact blocked-candidate context for loopback routing.',
            [payload.research_slice_ref],
          ),
        ],
      };
    }
    const candidateRefs = candidates.map((candidate) =>
      this.ref('topic_question_candidate', candidate.topic_question_candidate_id, candidate.title_card_id),
    );
    const candidateHashes = candidates.map((candidate) => this.hashN6CandidateAuthority(candidate));
    const recommendedCandidateIds = draft.recommended_candidate_keys
      .map((key) => candidates.find((candidate) => candidate.candidate_key === key)?.topic_question_candidate_id)
      .filter((candidateId): candidateId is string => Boolean(candidateId));
    const qualityFlags = uniqueStrings([
      ...(blockedCandidateContexts.length > 0 ? ['BLOCKED_CANDIDATES_PRESENT'] : []),
      ...(recommendedCandidateIds.length === 0 ? ['NO_RECOMMENDED_TOPIC_QUESTION_CANDIDATE'] : []),
      ...(draft.human_review_triggers.length > 0 || candidates.some((candidate) => candidate.human_review_triggers.length > 0)
        ? ['HUMAN_REVIEW_TRIGGERED']
        : []),
      ...(candidates.some((candidate) => candidate.risk_notes.length > 0) ? ['CANDIDATE_RISK_NOTE_PRESENT'] : []),
      ...(candidates.some((candidate) => (candidate.confidence ?? 1) < 0.6) ? ['LOW_CONFIDENCE_CANDIDATE_PRESENT'] : []),
    ]);
    const warnings = qualityFlags.map((flag) =>
      this.warning(flag, `N6 TopicQuestion candidate generation emitted ${flag}.`, [payload.research_slice_ref]),
    );
    if (input.decisionMemory) {
      for (const dedup of computeDecisionMemoryDedupWarnings(input.decisionMemory.packet, candidates)) {
        warnings.push(this.warning(dedup.code, dedup.message, dedup.refs));
      }
    }
    const candidateSet: TopicSelectionTopicQuestionCandidateSetRecord = {
      topic_question_candidate_set_id: input.candidateSetId,
      workspace_id: workspaceId,
      title_card_id: titleCardId,
      form_topic_question_run_id: input.runId,
      question_frame_id: input.questionFrameId,
      research_slice_id: loaded.researchSlice.research_slice_id,
      research_slice_version: loaded.researchSlice.slice_version,
      status: 'ready_for_selection',
      candidate_count: candidates.length,
      recommended_candidate_ids: recommendedCandidateIds,
      admission_readiness: {
        blocked_candidate_context: blockedCandidateContexts,
        candidate_hashes: candidateHashes,
        draft_hash: input.draftHash,
        n5_handoff_hash: payload.n5_handoff_hash,
        selected_research_slice_hash: payload.research_slice_hash,
      },
      hard_blockers: [],
      human_review_triggers: uniqueStrings([
        ...draft.human_review_triggers,
        ...candidates.flatMap((candidate) => candidate.human_review_triggers),
      ]),
      generation_notes: draft.generation_notes,
      input_snapshot_id: null,
      workflow_run_id: null,
      artifact_refs: [],
      created_at: now,
      updated_at: now,
    };
    return {
      ok: true,
      value: {
        blockedCandidateContexts,
        candidateHashes,
        candidateRefs,
        candidates,
        candidateSet,
        questionFrame,
        qualityFlags,
        recommendedCandidateIds,
        warnings,
      },
    };
  }

  private n6KnownContext(
    loaded: N6LoadedContext,
    payload: TopicSelectionV1bN6HarnessFrozenInputPayload,
  ): N6KnownContext {
    const boundaryRefs = loaded.boundaries.map((boundary) =>
      this.ref('research_slice_boundary', boundary.research_slice_boundary_id, boundary.title_card_id),
    );
    const assumptionRefs = loaded.assumptions.map((assumption) =>
      this.ref('research_slice_assumption', assumption.research_slice_assumption_id, assumption.title_card_id),
    );
    const evidenceRefs = loaded.evidenceRefs.map((evidenceRef) => evidenceRef.evidence_ref);
    const sourceRefs = uniqueRefs([
      payload.research_slice_ref,
      payload.research_slice_selection_ref,
      payload.research_slice_option_set_ref,
      payload.selected_slice_option_ref,
      loaded.researchSlice.validated_need_ref,
      loaded.researchSlice.evidence_map_ref,
      loaded.researchSlice.search_run_ref,
      loaded.researchSlice.search_plan_ref,
      loaded.researchSlice.literature_snapshot_ref,
      ...evidenceRefs,
      ...boundaryRefs,
      ...assumptionRefs,
    ]);
    return {
      assumptionRefKeys: new Set(assumptionRefs.map((ref) => this.refKey(ref))),
      boundaryRefKeys: new Set(boundaryRefs.map((ref) => this.refKey(ref))),
      claimCeiling: loaded.researchSlice.claim_ceiling,
      evidenceRefKeys: new Set(evidenceRefs.map((ref) => this.refKey(ref))),
      sourceRefKeys: new Set(sourceRefs.map((ref) => this.refKey(ref))),
      targetCommunity: loaded.researchSlice.target_community,
      validatedNeedRefKey: this.refKey(loaded.researchSlice.validated_need_ref),
    };
  }

  private n6FrameBlocker(
    draft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
    context: N6KnownContext,
  ): { code: string; message: string } | null {
    if (!this.aligns(draft.question_frame.target_community, context.targetCommunity)) {
      return {
        code: 'N6_QUESTION_FRAME_TARGET_COMMUNITY_DRIFT',
        message: 'N6 QuestionFrame target community drifts from the frozen selected ResearchSlice.',
      };
    }
    const unknownEvidence = draft.question_frame.evidence_refs.find((ref) => !context.evidenceRefKeys.has(this.refKey(ref)));
    if (unknownEvidence) {
      return {
        code: 'N6_UNKNOWN_EVIDENCE_REF',
        message: `N6 QuestionFrame cites unknown evidence ref ${unknownEvidence.ref_id}.`,
      };
    }
    const unknownAssumption = draft.question_frame.assumption_refs.find((ref) => !context.assumptionRefKeys.has(this.refKey(ref)));
    if (unknownAssumption) {
      return {
        code: 'N6_UNKNOWN_ASSUMPTION_REF',
        message: `N6 QuestionFrame cites unknown assumption ref ${unknownAssumption.ref_id}.`,
      };
    }
    return null;
  }

  private n6CandidateStructuralBlocker(
    candidate: TopicSelectionTopicQuestionCandidateDraft,
    context: N6KnownContext,
    index: number,
  ): { code: string; message: string } | null {
    const ordinal = index + 1;
    if (candidate.source_validated_need_refs.length === 0
      || candidate.source_validated_need_refs.some((ref) => this.refKey(ref) !== context.validatedNeedRefKey)) {
      return {
        code: 'N6_VALIDATED_NEED_REF_MISMATCH',
        message: `N6 TopicQuestion candidate ${ordinal} must inherit only the frozen selected ResearchSlice ValidatedNeed ref.`,
      };
    }
    const unknownBoundary = [
      ...candidate.boundary_check.preserved_boundary_refs,
      ...candidate.boundary_check.excluded_boundary_refs,
    ].find((ref) => !context.boundaryRefKeys.has(this.refKey(ref)));
    if (unknownBoundary) {
      return {
        code: 'N6_UNKNOWN_BOUNDARY_REF',
        message: `N6 TopicQuestion candidate ${ordinal} cites unknown boundary ref ${unknownBoundary.ref_id}.`,
      };
    }
    const unknownEvidence = this.n6CandidateEvidenceRefs(candidate)
      .find((ref) => !context.evidenceRefKeys.has(this.refKey(ref)));
    if (unknownEvidence) {
      return {
        code: 'N6_UNKNOWN_EVIDENCE_REF',
        message: `N6 TopicQuestion candidate ${ordinal} cites unknown evidence ref ${unknownEvidence.ref_id}.`,
      };
    }
    const unknownSource = candidate.falsification_conditions
      .flatMap((condition) => condition.trigger_source_refs)
      .find((ref) => !context.sourceRefKeys.has(this.refKey(ref)));
    if (unknownSource) {
      return {
        code: 'N6_UNKNOWN_SOURCE_REF',
        message: `N6 TopicQuestion candidate ${ordinal} cites unknown source ref ${unknownSource.ref_id}.`,
      };
    }
    return null;
  }

  private n6CandidateSemanticBlocker(
    candidate: TopicSelectionTopicQuestionCandidateDraft,
    context: N6KnownContext,
  ): { reason: string; message: string } | null {
    if (candidate.answerability_verdict !== 'answerable' && candidate.answerability_verdict !== 'answerable_with_risk') {
      return {
        reason: 'answerability_weak',
        message: `Candidate ${candidate.candidate_key} is not answerable.`,
      };
    }
    if (candidate.blockers.length > 0) {
      return {
        reason: 'schema_or_format',
        message: `Candidate ${candidate.candidate_key} carries hard blockers.`,
      };
    }
    if (candidate.boundary_check.boundary_violations.length > 0) {
      return {
        reason: 'boundary_violation',
        message: `Candidate ${candidate.candidate_key} violates ResearchSlice boundaries.`,
      };
    }
    if (!this.isSpecificQuestion(candidate.main_question)) {
      return {
        reason: 'answerability_weak',
        message: `Candidate ${candidate.candidate_key} is too broad or underspecified.`,
      };
    }
    if (this.missingN6TraceabilityEvidenceRoles(candidate).length > 0) {
      return {
        reason: 'evidence_relevance_weak',
        message: `Candidate ${candidate.candidate_key} is missing required traceability evidence roles.`,
      };
    }
    if (
      candidate.answerability_plan.datasets_or_resources.length === 0
      || candidate.answerability_plan.metrics.length === 0
      || candidate.answerability_plan.baselines.length === 0
      || candidate.answerability_plan.evaluation_setting.trim().length === 0
    ) {
      return {
        reason: 'answerability_weak',
        message: `Candidate ${candidate.candidate_key} has an incomplete method or evaluation path.`,
      };
    }
    if (this.explicitClaimCeilingViolations(context.claimCeiling, [
      candidate.expected_claim,
      candidate.fallback_claim,
      candidate.max_claim_strength,
    ]).length > 0) {
      return {
        reason: 'claim_ceiling_mismatch',
        message: `Candidate ${candidate.candidate_key} exceeds the selected ResearchSlice claim ceiling.`,
      };
    }
    if (candidate.observable_success_criteria.length === 0) {
      return {
        reason: 'answerability_weak',
        message: `Candidate ${candidate.candidate_key} does not define observable success criteria.`,
      };
    }
    if (candidate.falsification_conditions.length === 0
      || candidate.falsification_conditions.some((condition) => this.n6FalsificationConditionWeak(condition))) {
      return {
        reason: 'falsification_weak',
        message: `Candidate ${candidate.candidate_key} has weak falsification conditions.`,
      };
    }
    return null;
  }

  private n6CandidateEvidenceRefs(candidate: TopicSelectionTopicQuestionCandidateDraft): TopicSelectionFunctionalRef[] {
    return [
      ...candidate.answerability_plan.required_evidence_refs,
      ...candidate.traceability_check.support_evidence_refs,
      ...candidate.traceability_check.challenge_evidence_refs,
      ...candidate.traceability_check.baseline_evidence_refs,
      ...candidate.traceability_check.context_evidence_refs,
      ...candidate.traceability_check.mapped_evidence_refs,
      ...candidate.falsification_conditions.flatMap((condition) => condition.trigger_evidence_refs),
    ];
  }

  private missingN6TraceabilityEvidenceRoles(candidate: TopicSelectionTopicQuestionCandidateDraft): string[] {
    const refsByRole = {
      baseline: candidate.traceability_check.baseline_evidence_refs,
      challenge: candidate.traceability_check.challenge_evidence_refs,
      context: candidate.traceability_check.context_evidence_refs,
      support: candidate.traceability_check.support_evidence_refs,
    };
    return (['support', 'challenge', 'baseline', 'context'] as const)
      .filter((role) => refsByRole[role].length === 0);
  }

  private n6FalsificationConditionWeak(condition: TopicSelectionTopicQuestionFalsificationConditionDraft): boolean {
    return condition.statement.trim().length < 24
      || (
        condition.trigger_evidence_refs.length === 0
        && condition.trigger_source_refs.length === 0
      )
      || condition.related_contract_fields.length === 0
      || condition.expected_action.trim().length === 0;
  }

  private hashN6CandidateAuthority(candidate: TopicSelectionTopicQuestionCandidateRecord): string {
    return this.hash({
      answerability_verdict: candidate.answerability_verdict,
      boundary_check_payload: candidate.boundary_check_payload,
      candidate_key: candidate.candidate_key,
      candidate_ref: this.ref('topic_question_candidate', candidate.topic_question_candidate_id, candidate.title_card_id),
      expected_claim: candidate.expected_claim,
      falsification_conditions_payload: candidate.falsification_conditions_payload,
      main_question: candidate.main_question,
      max_claim_strength: candidate.max_claim_strength,
      research_slice_id: candidate.research_slice_id,
      status: candidate.status,
      traceability_check_payload: candidate.traceability_check_payload,
    });
  }

  private firstDuplicate(values: string[]): string | null {
    const seen = new Set<string>();
    for (const value of values) {
      if (seen.has(value)) {
        return value;
      }
      seen.add(value);
    }
    return null;
  }

  private isN6QuestionFrameDraft(value: unknown): boolean {
    return this.isRecord(value)
      && this.hasOnlyKeys(value, [
        'assumption_refs',
        'comparison_baseline',
        'evidence_refs',
        'frame_payload',
        'intervention_or_approach',
        'object_scope',
        'observable_outcome',
        'target_community',
        'target_setting',
        'task_scope',
      ])
      && typeof value.target_setting === 'string'
      && typeof value.target_community === 'string'
      && typeof value.object_scope === 'string'
      && typeof value.task_scope === 'string'
      && typeof value.intervention_or_approach === 'string'
      && typeof value.comparison_baseline === 'string'
      && typeof value.observable_outcome === 'string'
      && this.isFunctionalRefArray(value.assumption_refs)
      && this.isFunctionalRefArray(value.evidence_refs)
      && this.isRecord(value.frame_payload);
  }

  private isN6CandidateDraft(value: unknown): value is TopicSelectionTopicQuestionCandidateDraft {
    if (!this.isRecord(value) || !this.hasOnlyKeys(value, [
      'answerability_plan',
      'answerability_verdict',
      'blockers',
      'boundary_check',
      'candidate_key',
      'confidence',
      'contribution_hypothesis',
      'expected_claim',
      'fallback_claim',
      'falsification_conditions',
      'human_review_triggers',
      'main_question',
      'max_claim_strength',
      'observable_success_criteria',
      'objections',
      'question_type',
      'risk_notes',
      'source_validated_need_refs',
      'sub_questions',
      'traceability_check',
    ])) {
      return false;
    }
    return typeof value.candidate_key === 'string'
      && typeof value.main_question === 'string'
      && this.isStringArray(value.sub_questions)
      && ['method', 'benchmark', 'analysis', 'resource', 'system'].includes(value.question_type as string)
      && ['method', 'benchmark', 'analysis', 'resource', 'system'].includes(value.contribution_hypothesis as string)
      && this.isFunctionalRefArray(value.source_validated_need_refs)
      && this.isN6AnswerabilityPlanDraft(value.answerability_plan)
      && ['answerable', 'answerable_with_risk', 'needs_slice_refinement', 'not_answerable'].includes(value.answerability_verdict as string)
      && typeof value.expected_claim === 'string'
      && typeof value.fallback_claim === 'string'
      && typeof value.max_claim_strength === 'string'
      && this.isStringArray(value.observable_success_criteria)
      && this.isN6BoundaryCheckDraft(value.boundary_check)
      && this.isN6TraceabilityCheckDraft(value.traceability_check)
      && Array.isArray(value.falsification_conditions)
      && value.falsification_conditions.every((condition) => this.isN6FalsificationConditionDraft(condition))
      && this.isStringArray(value.risk_notes)
      && this.isStringArray(value.blockers)
      && this.isStringArray(value.objections)
      && this.isStringArray(value.human_review_triggers)
      && (value.confidence === null || typeof value.confidence === 'number');
  }

  private isN6AnswerabilityPlanDraft(value: unknown): boolean {
    return this.isRecord(value)
      && this.hasOnlyKeys(value, [
        'ablations_or_comparisons',
        'baselines',
        'datasets_or_resources',
        'dependency_risks',
        'evaluation_setting',
        'known_gaps',
        'metrics',
        'open_dependencies',
        'required_evidence_refs',
      ])
      && this.isStringArray(value.datasets_or_resources)
      && this.isStringArray(value.metrics)
      && this.isStringArray(value.baselines)
      && this.isStringArray(value.ablations_or_comparisons)
      && typeof value.evaluation_setting === 'string'
      && this.isStringArray(value.dependency_risks)
      && this.isStringArray(value.open_dependencies)
      && this.isStringArray(value.known_gaps)
      && this.isFunctionalRefArray(value.required_evidence_refs);
  }

  private isN6BoundaryCheckDraft(value: unknown): boolean {
    return this.isRecord(value)
      && this.hasOnlyKeys(value, [
        'allowed_refinements',
        'boundary_violations',
        'excluded_boundary_refs',
        'preserved_boundary_refs',
        'prohibited_claims',
      ])
      && this.isFunctionalRefArray(value.preserved_boundary_refs)
      && this.isFunctionalRefArray(value.excluded_boundary_refs)
      && this.isStringArray(value.boundary_violations)
      && this.isStringArray(value.prohibited_claims)
      && this.isStringArray(value.allowed_refinements);
  }

  private isN6TraceabilityCheckDraft(value: unknown): boolean {
    return this.isRecord(value)
      && this.hasOnlyKeys(value, [
        'baseline_evidence_refs',
        'challenge_evidence_refs',
        'context_evidence_refs',
        'mapped_evidence_refs',
        'support_evidence_refs',
        'unmapped_assumptions',
      ])
      && this.isFunctionalRefArray(value.support_evidence_refs)
      && this.isFunctionalRefArray(value.challenge_evidence_refs)
      && this.isFunctionalRefArray(value.baseline_evidence_refs)
      && this.isFunctionalRefArray(value.context_evidence_refs)
      && this.isFunctionalRefArray(value.mapped_evidence_refs)
      && this.isStringArray(value.unmapped_assumptions);
  }

  private isN6FalsificationConditionDraft(value: unknown): value is TopicSelectionTopicQuestionFalsificationConditionDraft {
    return this.isRecord(value)
      && this.hasOnlyKeys(value, [
        'check_timing',
        'condition_type',
        'confidence',
        'expected_action',
        'related_contract_fields',
        'severity',
        'statement',
        'trigger_evidence_refs',
        'trigger_source_refs',
      ])
      && [
        'solved_by_baseline',
        'contradicted_by_evidence',
        'out_of_boundary',
        'data_unavailable',
        'baseline_unreproducible',
        'metric_invalid',
        'evaluation_infeasible',
        'claim_overstrong',
        'resource_blocked',
        'need_invalidated',
      ].includes(value.condition_type as string)
      && ['hard', 'soft', 'answerability'].includes(value.severity as string)
      && typeof value.statement === 'string'
      && this.isFunctionalRefArray(value.trigger_evidence_refs)
      && this.isFunctionalRefArray(value.trigger_source_refs)
      && this.isStringArray(value.related_contract_fields)
      && ['revise_question', 'revise_slice', 'recheck_evidence', 'lower_claim_strength', 'park', 'drop'].includes(value.expected_action as string)
      && [
        'before_value_assessment',
        'during_value_assessment',
        'before_package',
        'before_promotion',
        'on_new_evidence',
      ].includes(value.check_timing as string)
      && ['low', 'medium', 'high'].includes(value.confidence as string);
  }

  private isSpecificQuestion(question: string): boolean {
    const normalized = question.trim().toLowerCase();
    if (normalized.length < 40 || !normalized.endsWith('?')) {
      return false;
    }
    const broadPatterns = [
      /^how can (ai|llms?|rag|systems?) (help|improve|impact|benefit)\b/u,
      /^what is the (impact|effect|role|future) of\b/u,
      /^can (ai|llms?|rag|systems?) improve\b/u,
    ];
    return !broadPatterns.some((pattern) => pattern.test(normalized));
  }

  private async resolveN4DraftPayload(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN4HarnessFrozenInputPayload,
    planningInput: TopicSelectionV1bResearchSlicePlanningInput,
  ): Promise<{ ok: true; value: N4DraftResolution } | { ok: false; code: string; message: string }> {
    const semanticArtifact = (input.semantic_artifacts ?? []).find((artifact) =>
      artifact.slot_id === 'n4_research_slice_option_draft'
      && artifact.allowed_effect === 'model_draft_for_gate'
    );
    if (!semanticArtifact || !semanticArtifact.normalized_output_ref) {
      return {
        ok: false,
        code: 'N4_FROZEN_DRAFT_ARTIFACT_REQUIRED',
        message: 'N4 requires a frozen normalized ResearchSliceOptionSetDraft semantic artifact.',
      };
    }
    const [supportArtifact, normalizedArtifact, provenanceArtifact] = await Promise.all([
      this.controlPlane.getArtifactRef(semanticArtifact.support_artifact_ref.ref_id),
      this.controlPlane.getArtifactRef(semanticArtifact.normalized_output_ref.ref_id),
      this.controlPlane.getArtifactRef(semanticArtifact.provenance_ref.ref_id),
    ]);
    if (!supportArtifact || !normalizedArtifact || !provenanceArtifact) {
      return {
        ok: false,
        code: 'N4_FROZEN_DRAFT_ARTIFACT_NOT_FOUND',
        message: 'N4 semantic artifact refs must resolve to frozen control-plane ArtifactRef records.',
      };
    }
    if (
      supportArtifact.checksum !== semanticArtifact.support_artifact_hash
      || normalizedArtifact.checksum !== semanticArtifact.normalized_output_hash
    ) {
      return {
        ok: false,
        code: 'N4_FROZEN_DRAFT_ARTIFACT_HASH_MISMATCH',
        message: 'N4 semantic artifact hashes do not match persisted ArtifactRef checksums.',
      };
    }
    const draftPayload = this.extractN4DraftPayload(normalizedArtifact.payload);
    if (!draftPayload) {
      return {
        ok: false,
        code: 'N4_RESEARCH_SLICE_OPTION_DRAFT_INVALID',
        message: 'N4 normalized semantic artifact must contain a ResearchSliceOptionSetDraft payload.',
      };
    }
    const draftHash = this.hash(draftPayload);
    if (
      draftHash !== semanticArtifact.normalized_output_hash
      || draftHash !== semanticArtifact.structured_output_hash
      || draftHash !== semanticArtifact.support_artifact_hash
    ) {
      return {
        ok: false,
        code: 'N4_FROZEN_DRAFT_ARTIFACT_HASH_MISMATCH',
        message: 'N4 ResearchSliceOptionSetDraft payload hash does not match semantic artifact provenance.',
      };
    }
    if (
      semanticArtifact.runtime_provenance_class === 'runtime_verified'
      && semanticArtifact.execution_mode !== 'codex_assisted'
      && semanticArtifact.execution_mode !== 'mocked_llm'
    ) {
      return {
        ok: false,
        code: 'N4_DRAFT_ARTIFACT_PROVENANCE_CLASS_INVALID',
        message: 'runtime_verified v1b N4 research-slice draft artifacts must be generated by the N4 runtime.',
      };
    }
    if (semanticArtifact.runtime_provenance_class === 'runtime_verified') {
      const auditVerification = await this.verifyN4RuntimeVerifiedDraftAuditArtifact(input, semanticArtifact);
      if (!auditVerification.ok) {
        return auditVerification;
      }
    }
    const admissionExecutionMode = semanticArtifact.execution_mode === 'mocked_llm'
      ? 'mocked_llm'
      : 'codex_assisted';
    const expectedIdentity = this.resolveN4ResearchSliceAdmissionExpectedIdentity({
      input,
      payload,
      planningInput,
      draftHash,
      semanticArtifact,
      admissionExecutionMode,
    });
    if (!expectedIdentity.ok) {
      return expectedIdentity;
    }
    const admission = this.n4ResearchSliceAdmission.admit({
      artifact: semanticArtifact,
      expected: expectedIdentity.value,
      allow_fixture_replay: input.run_mode !== 'product',
    });
    if (!admission.admitted) {
      return {
        ok: false,
        code: admission.blocker.code,
        message: admission.blocker.message,
      };
    }
    return {
      ok: true,
      value: {
        artifactRefs: uniqueRefs([
          semanticArtifact.support_artifact_ref,
          semanticArtifact.normalized_output_ref,
          semanticArtifact.provenance_ref,
        ]),
        draft: draftPayload,
        draftHash,
        semanticArtifact,
      },
    };
  }

  private async verifyN4RuntimeVerifiedDraftAuditArtifact(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  ): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
    if (
      !artifact.runtime_audit_ref
      || artifact.runtime_audit_ref.ref_type !== 'artifact_ref'
      || !this.refsEqual(artifact.provenance_ref, artifact.runtime_audit_ref)
    ) {
      return this.n4RuntimeAuditDrift('N4 runtime research-slice draft provenance must point to its audit artifact_ref.');
    }
    const auditArtifact = await this.controlPlane.getArtifactRef(artifact.runtime_audit_ref.ref_id);
    if (
      !auditArtifact
      || auditArtifact.artifact_kind !== 'diagnostic'
      || auditArtifact.checksum !== artifact.runtime_audit_hash
      || auditArtifact.workflow_run_id !== input.workflow_run_id
    ) {
      return this.n4RuntimeAuditDrift('N4 runtime research-slice draft audit artifact is missing or checksum-drifted.');
    }
    const auditPayload = auditArtifact.payload;
    if (!this.isRecord(auditPayload) || !this.isRecord(auditPayload.provenance)) {
      return this.n4RuntimeAuditDrift('N4 runtime research-slice draft audit payload is not a valid invocation audit snapshot.');
    }
    const provenance = auditPayload.provenance;
    const expectedSourceKind = artifact.execution_mode === 'mocked_llm' ? 'mock_fixture' : 'codex_response';
    if (
      auditPayload.node_id !== input.node_id
      || auditPayload.workflow_run_id !== input.workflow_run_id
      || auditPayload.node_attempt_id !== input.node_attempt_id
      || auditPayload.status !== 'succeeded'
      || provenance.workflow_run_id !== input.workflow_run_id
      || provenance.node_id !== input.node_id
      || provenance.node_attempt_id !== input.node_attempt_id
      || provenance.execution_mode !== artifact.execution_mode
      || provenance.source_kind !== expectedSourceKind
      || provenance.non_provider !== true
      || provenance.run_mode !== artifact.run_mode
      || provenance.profile_id !== artifact.profile_id
      || provenance.model_option_id !== artifact.model_option_id
      || provenance.output_contract !== artifact.output_contract
      || provenance.prompt_packet_hash !== artifact.prompt_packet_hash
      || provenance.structured_output_hash !== artifact.structured_output_hash
      || provenance.cache_status !== 'not_applicable'
      || provenance.response_reuse_ref !== null
      || provenance.telemetry !== null
    ) {
      return this.n4RuntimeAuditDrift('N4 runtime research-slice draft audit provenance does not match the draft artifact identity.');
    }
    return { ok: true };
  }

  private n4RuntimeAuditDrift(message: string): { ok: false; code: string; message: string } {
    return {
      ok: false,
      code: 'N4_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
      message,
    };
  }

  private resolveN4ResearchSliceAdmissionExpectedIdentity(input: {
    input: TopicSelectionV1bWorkflowHarnessRunRequest;
    payload: TopicSelectionV1bN4HarnessFrozenInputPayload;
    planningInput: TopicSelectionV1bResearchSlicePlanningInput;
    draftHash: string;
    semanticArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    admissionExecutionMode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
  }): { ok: true; value: TopicSelectionV1bN4ResearchSliceAdmissionExpectedIdentity } | {
    ok: false;
    code: string;
    message: string;
  } {
    try {
      const value = this.n4ResearchSliceRuntime.buildAdmissionExpectedIdentity({
        request: input.input,
        frozenPayload: input.payload,
        planningInput: input.planningInput,
        normalizedPayloadHash: input.draftHash,
        executionMode: input.admissionExecutionMode,
        runMode: input.input.run_mode ?? input.semanticArtifact.run_mode,
        profileId: input.semanticArtifact.profile_id,
        modelOptionId: input.semanticArtifact.model_option_id,
      });
      return { ok: true, value };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          ok: false,
          code: 'N4_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
          message: error.message,
        };
      }
      throw error;
    }
  }

  private extractN4DraftPayload(
    payload: Record<string, unknown> | null | undefined,
  ): TopicSelectionV1bResearchSliceOptionSetDraftPayload | null {
    if (!this.isRecord(payload)) {
      return null;
    }
    const candidate = this.isRecord(payload.normalized_output)
      ? payload.normalized_output
      : payload;
    return this.isN4DraftPayload(candidate)
      ? candidate as unknown as TopicSelectionV1bResearchSliceOptionSetDraftPayload
      : null;
  }

  private isN4DraftPayload(value: Record<string, unknown>): boolean {
    return this.hasOnlyKeys(value, [
      'comparison_axes',
      'comparison_summary',
      'human_review_triggers',
      'missing_option_types',
      'options',
      'recommended_option_key',
      'unresolved_disagreements',
    ])
      && this.isNullableString(value.recommended_option_key)
      && this.isStringArray(value.comparison_axes)
      && typeof value.comparison_summary === 'string'
      && value.comparison_summary.trim().length > 0
      && this.isStringArray(value.missing_option_types)
      && this.isStringArray(value.unresolved_disagreements)
      && this.isStringArray(value.human_review_triggers)
      && Array.isArray(value.options)
      && value.options.length > 0
      && value.options.every((option) => this.isN4DraftOption(option));
  }

  private isN4DraftOption(value: unknown): value is TopicSelectionResearchSliceOptionDraft {
    if (!this.isRecord(value)) {
      return false;
    }
    return this.hasOnlyKeys(value, [
      'baseline_assumptions',
      'baseline_evidence_refs',
      'baseline_risk',
      'challenge_evidence_refs',
      'claim_ceiling_alignment',
      'confidence',
      'context_evidence_refs',
      'contribution_type_candidate',
      'data_assumptions',
      'dependency_risks',
      'details_payload',
      'evaluation_path',
      'excluded_boundaries',
      'execution_risk',
      'expected_claim',
      'fallback_claim',
      'hard_blockers',
      'human_review_triggers',
      'included_boundaries',
      'main_risks',
      'observable_success_criteria',
      'option_key',
      'problem_space',
      'requires_human_review',
      'resource_assumptions',
      'scope_risk',
      'slice_budget',
      'slice_statement',
      'source_validated_need_refs',
      'support_evidence_refs',
      'target_community',
      'target_setting',
    ])
      && typeof value.option_key === 'string'
      && value.option_key.trim().length > 0
      && this.isFunctionalRefArray(value.source_validated_need_refs)
      && typeof value.slice_statement === 'string'
      && value.slice_statement.trim().length > 0
      && typeof value.problem_space === 'string'
      && value.problem_space.trim().length > 0
      && typeof value.target_setting === 'string'
      && value.target_setting.trim().length > 0
      && typeof value.target_community === 'string'
      && value.target_community.trim().length > 0
      && this.isStringArray(value.included_boundaries)
      && this.isStringArray(value.excluded_boundaries)
      && typeof value.contribution_type_candidate === 'string'
      && value.contribution_type_candidate.trim().length > 0
      && this.isFunctionalRefArray(value.support_evidence_refs)
      && this.isFunctionalRefArray(value.challenge_evidence_refs)
      && this.isFunctionalRefArray(value.baseline_evidence_refs)
      && this.isFunctionalRefArray(value.context_evidence_refs)
      && this.isStringArray(value.resource_assumptions)
      && this.isStringArray(value.data_assumptions)
      && typeof value.evaluation_path === 'string'
      && value.evaluation_path.trim().length > 0
      && this.isStringArray(value.baseline_assumptions)
      && this.isStringArray(value.hard_blockers)
      && this.isStringArray(value.dependency_risks)
      && this.isRecord(value.slice_budget)
      && typeof value.expected_claim === 'string'
      && value.expected_claim.trim().length > 0
      && typeof value.fallback_claim === 'string'
      && value.fallback_claim.trim().length > 0
      && this.isStringArray(value.observable_success_criteria)
      && this.isStringArray(value.main_risks)
      && this.isRiskLevel(value.baseline_risk)
      && this.isRiskLevel(value.execution_risk)
      && this.isRiskLevel(value.scope_risk)
      && this.isClaimCeilingAlignment(value.claim_ceiling_alignment)
      && (value.confidence === null || value.confidence === undefined || typeof value.confidence === 'number')
      && typeof value.requires_human_review === 'boolean'
      && this.isStringArray(value.human_review_triggers)
      && this.isRecord(value.details_payload);
  }

  private n4LineageBlocker(
    payload: TopicSelectionV1bN4HarnessFrozenInputPayload,
    snapshot: TopicSelectionV1bIntakeSnapshotRecord,
    profile: TopicSelectionResearchConstraintProfileRecord,
    readiness: TopicSelectionV1bIntakeReadinessAssessmentRecord,
    hashes: {
      profileHash: string;
      readinessHash: string;
      snapshotHash: string;
    },
  ): { code: string; message: string } | null {
    if (!this.refsEqual(payload.intake_snapshot_ref, this.snapshotRef(snapshot))
      || payload.intake_snapshot_hash !== hashes.snapshotHash) {
      return {
        code: 'N4_INTAKE_SNAPSHOT_HASH_MISMATCH',
        message: 'N4 frozen intake snapshot ref/hash does not match persisted N1 authority.',
      };
    }
    if (!this.refsEqual(payload.constraint_profile_ref, this.profileRef(profile))
      || payload.constraint_profile_hash !== hashes.profileHash) {
      return {
        code: 'N4_CONSTRAINT_PROFILE_HASH_MISMATCH',
        message: 'N4 frozen constraint profile ref/hash does not match persisted N2 authority.',
      };
    }
    if (!this.refsEqual(payload.intake_readiness_ref, this.readinessRef(readiness))
      || payload.intake_readiness_hash !== hashes.readinessHash) {
      return {
        code: 'N4_INTAKE_READINESS_HASH_MISMATCH',
        message: 'N4 frozen readiness ref/hash does not match persisted N3 authority.',
      };
    }
    if (
      profile.v1b_intake_snapshot_id !== snapshot.v1b_intake_snapshot_id
      || readiness.v1b_intake_snapshot_id !== snapshot.v1b_intake_snapshot_id
      || readiness.research_constraint_profile_id !== profile.research_constraint_profile_id
    ) {
      return {
        code: 'N4_UPSTREAM_AUTHORITY_LINEAGE_MISMATCH',
        message: 'N4 upstream snapshot, profile, and readiness authorities do not share lineage.',
      };
    }
    return null;
  }

  private buildN4PlanningInput(
    snapshot: TopicSelectionV1bIntakeSnapshotRecord,
    profile: TopicSelectionResearchConstraintProfileRecord,
    readiness: TopicSelectionV1bIntakeReadinessAssessmentRecord,
  ): TopicSelectionV1bResearchSlicePlanningInput {
    return {
      v1b_input_bundle_ref: snapshot.v1b_input_bundle_ref,
      v1b_intake_snapshot_ref: this.snapshotRef(snapshot),
      research_constraint_profile_ref: this.profileRef(profile),
      readiness_assessment_ref: this.readinessRef(readiness),
      validated_need_ref: snapshot.validated_need_ref,
      evidence_map_ref: snapshot.evidence_map_ref,
      search_run_ref: snapshot.search_run_ref,
      search_plan_ref: snapshot.search_plan_ref,
      literature_snapshot_ref: snapshot.literature_snapshot_ref,
      evidence_role_bundle: snapshot.evidence_role_bundle,
      target_community: profile.target_community,
      target_venue_class: profile.target_venue_class ?? null,
      intended_contribution_style: profile.intended_contribution_style ?? null,
      method_constraints: profile.method_constraints,
      resource_constraints: profile.resource_constraints,
      available_assets: profile.available_assets,
      feasibility_budget: profile.feasibility_budget,
      non_goals: profile.non_goals,
      claim_ceiling: profile.claim_ceiling,
      accepted_risk_refs: readiness.accepted_risk_refs,
      gap_codes: snapshot.gap_codes,
      memory_suggestion_refs: snapshot.memory_suggestion_refs,
      recheck_request_refs: snapshot.recheck_request_refs,
      handoff_payload: snapshot.handoff_payload,
    };
  }

  private validateAndBuildN4Options(input: {
    draft: TopicSelectionResearchSliceOptionSetLlmOutput;
    optionSetId: string;
    planningInput: TopicSelectionV1bResearchSlicePlanningInput;
    titleCardId: string;
    workspaceId: string | null;
  }): { ok: true; value: N4ValidatedOptionSet } | { ok: false; code: string; message: string } {
    const optionKeys = input.draft.options.map((option) => option.option_key);
    if (new Set(optionKeys).size !== optionKeys.length) {
      return {
        ok: false,
        code: 'N4_DUPLICATE_RESEARCH_SLICE_OPTION_KEY',
        message: 'N4 ResearchSliceOptionSetDraft contains duplicate option_key values.',
      };
    }
    if (input.draft.comparison_axes.length === 0) {
      return {
        ok: false,
        code: 'N4_MISSING_COMPARISON_AXIS',
        message: 'N4 ResearchSliceOptionSetDraft must include comparison axes for downstream selection.',
      };
    }

    const knownEvidenceRefs = this.flattenEvidenceRoleBundle(input.planningInput.evidence_role_bundle);
    const knownEvidenceIds = new Set(knownEvidenceRefs.map((ref) => ref.ref_id));
    const qualityFlags: string[] = [];
    const warnings: TopicSelectionGateIssue[] = [];
    let highRiskOptionCount = 0;
    const now = this.now();
    const options: TopicSelectionResearchSliceOptionRecord[] = [];

    for (let index = 0; index < input.draft.options.length; index += 1) {
      const draft = input.draft.options[index]!;
      const blocker = this.n4DraftGateBlocker(draft, input.planningInput, knownEvidenceIds, index);
      if (blocker) {
        return blocker;
      }
      const optionId = this.idFactory('research_slice_option');
      const hasHardBlocker = draft.hard_blockers.length > 0;
      const isHighRisk = this.isHighRiskDraft(draft);
      const uncertainClaimAlignment =
        draft.claim_ceiling_alignment.status === 'uncertain'
        || draft.claim_ceiling_alignment.confidence === null
        || draft.claim_ceiling_alignment.confidence === undefined
        || draft.claim_ceiling_alignment.confidence < 0.6;
      const lowConfidence = draft.confidence === null
        || draft.confidence === undefined
        || draft.confidence < 0.6;
      const requiresHumanReview =
        draft.requires_human_review
        || isHighRisk
        || uncertainClaimAlignment
        || lowConfidence;
      if (hasHardBlocker) {
        qualityFlags.push('HARD_BLOCKED_OPTIONS_PRESENT');
      }
      if (isHighRisk) {
        highRiskOptionCount += 1;
        qualityFlags.push('HIGH_RISK_OPTION_PRESENT');
      }
      if (requiresHumanReview) {
        qualityFlags.push('HUMAN_REVIEW_REQUIRED');
      }
      options.push({
        research_slice_option_id: optionId,
        workspace_id: input.workspaceId,
        title_card_id: input.titleCardId,
        research_slice_option_set_id: input.optionSetId,
        option_ordinal: index + 1,
        option_key: draft.option_key,
        status: hasHardBlocker
          ? 'blocked'
          : draft.option_key === input.draft.recommended_option_key
            ? 'recommended'
            : 'candidate',
        source_validated_need_refs: draft.source_validated_need_refs,
        slice_statement: draft.slice_statement,
        problem_space: draft.problem_space,
        target_setting: draft.target_setting,
        target_community: draft.target_community,
        included_boundaries: draft.included_boundaries,
        excluded_boundaries: draft.excluded_boundaries,
        contribution_type_candidate: draft.contribution_type_candidate,
        support_evidence_refs: draft.support_evidence_refs,
        challenge_evidence_refs: draft.challenge_evidence_refs,
        baseline_evidence_refs: draft.baseline_evidence_refs,
        context_evidence_refs: draft.context_evidence_refs,
        resource_assumptions: draft.resource_assumptions,
        data_assumptions: draft.data_assumptions,
        evaluation_path: draft.evaluation_path,
        baseline_assumptions: draft.baseline_assumptions,
        hard_blockers: draft.hard_blockers,
        dependency_risks: draft.dependency_risks,
        slice_budget: draft.slice_budget,
        expected_claim: draft.expected_claim,
        fallback_claim: draft.fallback_claim,
        observable_success_criteria: draft.observable_success_criteria,
        main_risks: draft.main_risks,
        baseline_risk: draft.baseline_risk,
        execution_risk: draft.execution_risk,
        scope_risk: draft.scope_risk,
        claim_ceiling_alignment: draft.claim_ceiling_alignment,
        confidence: draft.confidence ?? null,
        requires_human_review: requiresHumanReview,
        human_review_triggers: uniqueStrings([
          ...draft.human_review_triggers,
          ...(isHighRisk ? ['high_risk_option'] : []),
          ...(uncertainClaimAlignment ? ['uncertain_claim_ceiling_alignment'] : []),
          ...(lowConfidence ? ['low_option_confidence'] : []),
        ]),
        details_payload: {
          ...draft.details_payload,
          inherited_constraints: {
            available_assets: input.planningInput.available_assets,
            claim_ceiling: input.planningInput.claim_ceiling,
            feasibility_budget: input.planningInput.feasibility_budget,
            method_constraints: input.planningInput.method_constraints,
            non_goals: input.planningInput.non_goals,
            resource_constraints: input.planningInput.resource_constraints,
          },
        },
        created_at: now,
      });
    }

    const selectableOptions = options.filter((option) => option.status !== 'blocked');
    if (selectableOptions.length === 0) {
      return {
        ok: false,
        code: 'N4_NO_SELECTABLE_RESEARCH_SLICE_OPTION',
        message: 'N4 ResearchSliceOptionSetDraft must contain at least one selectable option.',
      };
    }
    const recommendedOption = input.draft.recommended_option_key
      ? options.find((option) => option.option_key === input.draft.recommended_option_key)
      : null;
    if (input.draft.recommended_option_key && !recommendedOption) {
      return {
        ok: false,
        code: 'N4_RECOMMENDED_OPTION_NOT_FOUND',
        message: 'N4 recommended_option_key must reference a generated option.',
      };
    }
    if (recommendedOption?.status === 'blocked') {
      return {
        ok: false,
        code: 'N4_RECOMMENDED_OPTION_BLOCKED',
        message: 'N4 recommended_option_key must not reference a hard-blocked option.',
      };
    }
    if (input.draft.missing_option_types.length > 0) {
      warnings.push(this.warning(
        'MISSING_OPTION_TYPE_CARRIED_FORWARD',
        'N4 ResearchSliceOptionSetDraft carries missing option type notes for N5.',
      ));
      qualityFlags.push('MISSING_OPTION_TYPE_CARRIED_FORWARD');
    }
    if (input.draft.unresolved_disagreements.length > 0) {
      warnings.push(this.warning(
        'UNRESOLVED_OPTION_DISAGREEMENT_CARRIED_FORWARD',
        'N4 ResearchSliceOptionSetDraft carries unresolved disagreements for N5.',
      ));
      qualityFlags.push('UNRESOLVED_OPTION_DISAGREEMENT_CARRIED_FORWARD');
    }
    if (highRiskOptionCount > 0) {
      warnings.push(this.warning(
        'HIGH_RISK_OPTION_PRESENT',
        'N4 generated at least one high-risk ResearchSlice option.',
      ));
    }
    if (options.some((option) => option.requires_human_review)) {
      warnings.push(this.warning(
        'HUMAN_REVIEW_REQUIRED',
        'N4 generated ResearchSlice options that require downstream review before selection.',
      ));
    }
    return {
      ok: true,
      value: {
        highRiskOptionCount,
        options,
        qualityFlags: uniqueStrings(qualityFlags),
        recommendedOptionId: recommendedOption?.research_slice_option_id ?? null,
        requiresHumanReview: options.some((option) => option.requires_human_review),
        warnings: uniqueIssues(warnings),
      },
    };
  }

  private n4DraftGateBlocker(
    draft: TopicSelectionResearchSliceOptionDraft,
    planningInput: TopicSelectionV1bResearchSlicePlanningInput,
    knownEvidenceIds: Set<string>,
    index: number,
  ): { ok: false; code: string; message: string } | null {
    const ordinal = index + 1;
    if (draft.source_validated_need_refs.every((ref) => !this.refsEqual(ref, planningInput.validated_need_ref))) {
      return {
        ok: false,
        code: 'N4_VALIDATED_NEED_REF_MISSING',
        message: `N4 ResearchSlice option ${ordinal} must reference the inherited ValidatedNeed.`,
      };
    }
    if (draft.included_boundaries.length === 0 || draft.excluded_boundaries.length === 0) {
      return {
        ok: false,
        code: 'N4_SCOPE_BOUNDARY_MISSING',
        message: `N4 ResearchSlice option ${ordinal} must include both included and excluded boundaries.`,
      };
    }
    if (!this.aligns(draft.target_community, planningInput.target_community)) {
      return {
        ok: false,
        code: 'N4_TARGET_COMMUNITY_DRIFT',
        message: `N4 ResearchSlice option ${ordinal} target community drifts from ResearchConstraintProfile.`,
      };
    }
    if (!this.nonGoalsRemainExcluded(draft, planningInput.non_goals)) {
      return {
        ok: false,
        code: 'N4_NON_GOAL_NOT_EXCLUDED',
        message: `N4 ResearchSlice option ${ordinal} does not preserve ResearchConstraintProfile non-goals.`,
      };
    }
    const optionEvidenceRefs = this.draftEvidenceRefs(draft);
    if (optionEvidenceRefs.length === 0) {
      return {
        ok: false,
        code: 'N4_EVIDENCE_REF_MISSING',
        message: `N4 ResearchSlice option ${ordinal} must cite inherited evidence refs.`,
      };
    }
    const unknownEvidence = optionEvidenceRefs.find((ref) => !knownEvidenceIds.has(ref.ref_id));
    if (unknownEvidence) {
      return {
        ok: false,
        code: 'N4_UNKNOWN_EVIDENCE_REF',
        message: `N4 ResearchSlice option ${ordinal} cites unknown evidence ref ${unknownEvidence.ref_id}.`,
      };
    }
    const explicitClaimViolations = this.explicitClaimCeilingViolations(
      planningInput.claim_ceiling,
      [draft.expected_claim, draft.fallback_claim],
    );
    if (draft.claim_ceiling_alignment.status === 'exceeds' || explicitClaimViolations.length > 0) {
      return {
        ok: false,
        code: 'N4_CLAIM_CEILING_EXCEEDED',
        message: `N4 ResearchSlice option ${ordinal} exceeds the ResearchConstraintProfile claim ceiling.`,
      };
    }
    return null;
  }

  private async computeReadiness(
    snapshot: TopicSelectionV1bIntakeSnapshotRecord,
    profile: TopicSelectionResearchConstraintProfileRecord,
  ): Promise<{
    acceptedRiskRefs: TopicSelectionFunctionalRef[];
    blockers: TopicSelectionGateIssue[];
    missingConstraintCodes: string[];
    openRechecks: TopicSelectionSearchPlanRecheckRequestRecord[];
    recommendation: TopicSelectionV1bIntakeReadinessRecommendation;
    staleRefCodes: string[];
    uncoveredOpenRechecks: TopicSelectionSearchPlanRecheckRequestRecord[];
    warnings: TopicSelectionGateIssue[];
  }> {
    const rechecks = await this.resolveOpenRechecks(snapshot.recheck_request_refs);
    const acceptedRisks = await this.resolveUsableAcceptedRisks(snapshot.risk_refs, snapshot);
    const coveredOpenRechecks = rechecks.open_recheck_requests.filter((request) =>
      acceptedRisks.some((risk) => this.riskCoversRecheck(risk, request, snapshot))
    );
    const uncoveredOpenRechecks = rechecks.open_recheck_requests.filter((request) =>
      !coveredOpenRechecks.some((covered) =>
        covered.search_plan_recheck_request_id === request.search_plan_recheck_request_id
      )
    );
    const staleRefCodes = uniqueStrings([
      ...snapshot.trace_issues.map((issue) => issue.code),
      ...rechecks.missing_recheck_refs.map((ref) => `MISSING_RECHECK_REF:${ref.ref_id}`),
      ...(snapshot.evidence_map_freshness_status && snapshot.evidence_map_freshness_status !== 'current'
        ? ['EVIDENCE_MAP_CURRENT_REQUIRED']
        : []),
    ]);
    const missingConstraintCodes = this.missingConstraintCodes(profile);
    const parkReason = this.profileParkReason(profile);
    const blockers = this.readinessBlockers(snapshot, staleRefCodes, missingConstraintCodes, uncoveredOpenRechecks, parkReason);
    const acceptedRiskRefs = acceptedRisks.map((risk) =>
      this.ref('accepted_risk', risk.accepted_risk_id, risk.title_card_id ?? snapshot.title_card_id)
    );
    const warnings = acceptedRiskRefs.length > 0
      ? [this.warning('ACCEPTED_RISK_CARRIED_FORWARD', 'v1b intake carries active accepted risk refs.', acceptedRiskRefs)]
      : [];
    return {
      acceptedRiskRefs,
      blockers,
      missingConstraintCodes,
      openRechecks: rechecks.open_recheck_requests,
      recommendation: this.readinessRecommendation(
        snapshot.trace_status,
        staleRefCodes,
        uncoveredOpenRechecks,
        missingConstraintCodes,
        parkReason,
      ),
      staleRefCodes,
      uncoveredOpenRechecks,
      warnings,
    };
  }

  private intakeTraceIssues(input: {
    bundle: TopicSelectionV1aToV1bInputBundleRecord;
    validatedNeed: Awaited<ReturnType<TopicSelectionNeedValidationRepository['findValidatedNeedById']>>;
    needCandidate: TopicSelectionNeedCandidateRecord | null;
    supportPacket: Awaited<ReturnType<TopicSelectionNeedValidationRepository['findValidationDecisionSupportPacketById']>>;
    adjudication: Awaited<ReturnType<TopicSelectionNeedValidationRepository['findAdjudicationResultById']>>;
    humanDecision: TopicSelectionHumanConfirmedDecisionRecord | null;
    traceRefResolution: TraceRefResolution;
    evidenceMapExists: boolean;
    evidenceMapFreshnessStatus: TopicSelectionEvidenceFreshnessStatus | null;
    searchRunExists: boolean;
    searchPlanExists: boolean;
    literatureSnapshotExists: boolean;
  }): TopicSelectionGateIssue[] {
    const issues: TopicSelectionGateIssue[] = [];
    const { bundle, validatedNeed, needCandidate, supportPacket, adjudication, humanDecision, traceRefResolution } = input;
    if (!needCandidate) {
      issues.push(this.blocker('SOURCE_NEED_CANDIDATE_NOT_FOUND', 'v1b intake requires the source NeedCandidate.', [bundle.source_need_candidate_ref]));
    } else {
      this.pushRefMismatchIssue(issues, 'SOURCE_NEED_CANDIDATE_REF_MISMATCH', bundle.source_need_candidate_ref, this.ref('need_candidate', needCandidate.need_candidate_id, needCandidate.title_card_id, needCandidate.candidate_version));
      this.pushRefMismatchIssue(issues, 'SOURCE_CANDIDATE_EVIDENCE_MAP_REF_MISMATCH', bundle.evidence_map_ref, needCandidate.evidence_map_ref);
      this.pushRefMismatchIssue(issues, 'SOURCE_CANDIDATE_SEARCH_RUN_REF_MISMATCH', bundle.search_run_ref, needCandidate.search_run_ref);
      this.pushRefMismatchIssue(issues, 'SOURCE_CANDIDATE_SEARCH_PLAN_REF_MISMATCH', bundle.search_plan_ref, needCandidate.search_plan_ref);
      this.pushRefMismatchIssue(issues, 'SOURCE_CANDIDATE_LITERATURE_SNAPSHOT_REF_MISMATCH', bundle.literature_snapshot_ref, needCandidate.literature_snapshot_ref);
    }
    if (!validatedNeed) {
      issues.push(this.blocker('VALIDATED_NEED_NOT_FOUND', 'v1b intake requires a persisted ValidatedNeed.', [bundle.validated_need_ref]));
    } else {
      this.pushRefMismatchIssue(issues, 'VALIDATED_NEED_REF_MISMATCH', bundle.validated_need_ref, this.ref('validated_need', validatedNeed.validated_need_id, validatedNeed.title_card_id));
      this.pushRefMismatchIssue(issues, 'HUMAN_DECISION_REF_MISMATCH', bundle.human_decision_ref, validatedNeed.human_decision_ref);
      this.pushRefMismatchIssue(issues, 'SUPPORT_PACKET_REF_MISMATCH', bundle.support_packet_ref, validatedNeed.support_packet_ref);
      this.pushRefMismatchIssue(issues, 'ADJUDICATION_RESULT_REF_MISMATCH', bundle.adjudication_result_ref, validatedNeed.adjudication_result_ref);
      this.pushRefMismatchIssue(issues, 'EVIDENCE_MAP_REF_MISMATCH', bundle.evidence_map_ref, validatedNeed.evidence_map_ref);
      this.pushRefMismatchIssue(issues, 'SEARCH_RUN_REF_MISMATCH', bundle.search_run_ref, validatedNeed.search_run_ref);
      this.pushRefMismatchIssue(issues, 'SEARCH_PLAN_REF_MISMATCH', bundle.search_plan_ref, validatedNeed.search_plan_ref);
      this.pushRefMismatchIssue(issues, 'LITERATURE_SNAPSHOT_REF_MISMATCH', bundle.literature_snapshot_ref, validatedNeed.literature_snapshot_ref);
    }
    if (!this.isHumanDecisionRef(bundle.human_decision_ref)) {
      issues.push(this.blocker('HUMAN_DECISION_REF_TYPE_INVALID', 'v1b intake requires a human confirmed decision ref.', [bundle.human_decision_ref]));
    } else if (!humanDecision) {
      issues.push(this.blocker('HUMAN_DECISION_NOT_FOUND', 'v1b intake requires the persisted human confirmed decision.', [bundle.human_decision_ref]));
    } else {
      this.pushRefMismatchIssue(issues, 'HUMAN_DECISION_TARGET_MISMATCH', humanDecision.target_ref, bundle.validated_need_ref);
      if (humanDecision.decision_type !== 'confirm') {
        issues.push(this.blocker('HUMAN_DECISION_CONFIRM_REQUIRED', 'v1b intake requires a confirming human decision.', [bundle.human_decision_ref]));
      }
      if (!this.isHumanActor(humanDecision.actor.actor_type)) {
        issues.push(this.blocker('HUMAN_DECISION_HUMAN_ACTOR_REQUIRED', 'v1b intake requires a human or hybrid decision actor.', [bundle.human_decision_ref]));
      }
    }
    if (!supportPacket) {
      issues.push(this.blocker('SUPPORT_PACKET_NOT_FOUND', 'v1b intake requires the v1a validation support packet.', [bundle.support_packet_ref]));
    } else {
      this.pushRefMismatchIssue(issues, 'SUPPORT_PACKET_REF_MISMATCH', bundle.support_packet_ref, this.ref('validation_decision_support_packet', supportPacket.validation_support_packet_id, supportPacket.title_card_id));
      this.pushRefMismatchIssue(issues, 'SUPPORT_PACKET_EVIDENCE_MAP_REF_MISMATCH', bundle.evidence_map_ref, supportPacket.evidence_map_ref);
      this.pushRefMismatchIssue(issues, 'SUPPORT_PACKET_SEARCH_RUN_REF_MISMATCH', bundle.search_run_ref, supportPacket.search_run_ref);
      this.pushRefMismatchIssue(issues, 'SUPPORT_PACKET_SEARCH_PLAN_REF_MISMATCH', bundle.search_plan_ref, supportPacket.search_plan_ref);
      this.pushRefMismatchIssue(issues, 'SUPPORT_PACKET_LITERATURE_SNAPSHOT_REF_MISMATCH', bundle.literature_snapshot_ref, supportPacket.literature_snapshot_ref);
    }
    if (!adjudication) {
      issues.push(this.blocker('ADJUDICATION_RESULT_NOT_FOUND', 'v1b intake requires the v1a adjudication result.', [bundle.adjudication_result_ref]));
    } else {
      this.pushRefMismatchIssue(issues, 'ADJUDICATION_RESULT_REF_MISMATCH', bundle.adjudication_result_ref, this.ref('validate_need_adjudication_result', adjudication.adjudication_result_id, adjudication.title_card_id));
      if (adjudication.final_decision !== 'validate') {
        issues.push(this.blocker('ADJUDICATION_NOT_VALIDATED', 'v1b only accepts validated need adjudications.', [bundle.adjudication_result_ref]));
      }
      if (adjudication.output_validated_need_id !== bundle.validated_need_id) {
        issues.push(this.blocker('ADJUDICATION_OUTPUT_MISMATCH', 'Adjudication output does not match the bundle ValidatedNeed.', [bundle.adjudication_result_ref, bundle.validated_need_ref]));
      }
    }
    if (!input.evidenceMapExists) {
      issues.push(this.blocker('EVIDENCE_MAP_NOT_FOUND', 'v1b intake requires a traceable EvidenceMap.', [bundle.evidence_map_ref]));
    }
    if (input.evidenceMapFreshnessStatus && input.evidenceMapFreshnessStatus !== 'current') {
      issues.push(this.blocker('EVIDENCE_MAP_CURRENT_REQUIRED', 'v1b intake requires a current EvidenceMap.', [bundle.evidence_map_ref]));
    }
    if (!input.searchRunExists) {
      issues.push(this.blocker('SEARCH_RUN_NOT_FOUND', 'v1b intake requires a traceable SearchRun.', [bundle.search_run_ref]));
    }
    if (!input.searchPlanExists) {
      issues.push(this.blocker('SEARCH_PLAN_NOT_FOUND', 'v1b intake requires a traceable SearchPlan.', [bundle.search_plan_ref]));
    }
    if (!input.literatureSnapshotExists) {
      issues.push(this.blocker('LITERATURE_SNAPSHOT_NOT_FOUND', 'v1b intake requires a traceable literature resource pool snapshot.', [bundle.literature_snapshot_ref]));
    }
    if (bundle.trace_refs.length === 0) {
      issues.push(this.blocker('TRACE_REFS_REQUIRED', 'v1b intake requires inherited v1a trace refs.', [bundle.validated_need_ref]));
    }
    if (traceRefResolution.invalid_trace_refs.length > 0) {
      issues.push(this.blocker('TRACE_REF_TYPE_INVALID', 'v1b intake trace refs must reference trace snapshots.', traceRefResolution.invalid_trace_refs));
    }
    if (traceRefResolution.missing_trace_refs.length > 0) {
      issues.push(this.blocker('TRACE_REF_NOT_FOUND', 'v1b intake requires persisted inherited trace snapshots.', traceRefResolution.missing_trace_refs));
    }
    return issues;
  }

  private async resolveTraceRefs(traceRefs: TopicSelectionFunctionalRef[]): Promise<TraceRefResolution> {
    const invalid: TopicSelectionFunctionalRef[] = [];
    const missing: TopicSelectionFunctionalRef[] = [];
    const snapshots: TopicSelectionTraceSnapshotRecord[] = [];
    for (const traceRef of traceRefs) {
      if (traceRef.ref_type !== 'trace_snapshot') {
        invalid.push(traceRef);
        continue;
      }
      const traceSnapshot = await this.controlPlane.getTraceSnapshot(traceRef.ref_id);
      if (!traceSnapshot) {
        missing.push(traceRef);
        continue;
      }
      snapshots.push(traceSnapshot);
    }
    return {
      invalid_trace_refs: invalid,
      missing_trace_refs: missing,
      trace_snapshots: snapshots,
    };
  }

  private async resolveOpenRechecks(recheckRefs: TopicSelectionFunctionalRef[]): Promise<RecheckResolution> {
    const missing: TopicSelectionFunctionalRef[] = [];
    const open: TopicSelectionSearchPlanRecheckRequestRecord[] = [];
    for (const recheckRef of recheckRefs) {
      if (recheckRef.ref_type !== 'search_plan_recheck_request') {
        continue;
      }
      const request = await this.runnerDependencies.searchResourceRepository!.findSearchPlanRecheckRequestById(recheckRef.ref_id);
      if (!request) {
        missing.push(recheckRef);
        continue;
      }
      if (request.status === 'open') {
        open.push(request);
      }
    }
    return {
      missing_recheck_refs: missing,
      open_recheck_requests: open,
    };
  }

  private async resolveUsableAcceptedRisks(
    riskRefs: TopicSelectionFunctionalRef[],
    snapshot: TopicSelectionV1bIntakeSnapshotRecord,
  ): Promise<TopicSelectionAcceptedRiskRecord[]> {
    const usableRisks: TopicSelectionAcceptedRiskRecord[] = [];
    for (const riskRef of riskRefs) {
      if (riskRef.ref_type !== 'accepted_risk') {
        continue;
      }
      const risk = await this.runnerDependencies.recheckRiskMemoryRepository!.findAcceptedRiskById(riskRef.ref_id);
      if (!risk) {
        continue;
      }
      try {
        assertTopicSelectionAcceptedRiskUsableForTarget(risk, snapshot.validated_need_ref, {
          now: this.now(),
          workspace_id: snapshot.workspace_id ?? null,
          title_card_id: snapshot.title_card_id,
        });
        usableRisks.push(risk);
      } catch (error: unknown) {
        if (!(error instanceof AppError)) {
          throw error;
        }
      }
    }
    return usableRisks;
  }

  private riskCoversRecheck(
    risk: TopicSelectionAcceptedRiskRecord,
    recheck: TopicSelectionSearchPlanRecheckRequestRecord,
    snapshot: TopicSelectionV1bIntakeSnapshotRecord,
  ): boolean {
    const recheckRef = this.ref('search_plan_recheck_request', recheck.search_plan_recheck_request_id, recheck.title_card_id);
    const coverageRefs = uniqueRefs([
      risk.source_ref ?? null,
      risk.target_ref,
      ...risk.scope_refs,
      ...risk.affected_object_refs,
    ]);
    return coverageRefs.some((ref) =>
      this.refsEqual(ref, recheckRef)
      || this.refsEqual(ref, recheck.target_search_plan_ref)
      || this.refsEqual(ref, snapshot.search_plan_ref)
      || this.refsEqual(ref, snapshot.validated_need_ref)
    );
  }

  private missingConstraintCodes(profile: TopicSelectionResearchConstraintProfileRecord): string[] {
    const missing: string[] = [];
    if (!profile.target_community.trim()) {
      missing.push('TARGET_COMMUNITY_REQUIRED');
    }
    if (!profile.claim_ceiling.trim()) {
      missing.push('CLAIM_CEILING_REQUIRED');
    }
    if (!profile.non_goals.some((item) => item.trim())) {
      missing.push('NON_GOALS_REQUIRED');
    }
    if (
      !profile.method_constraints.some((item) => item.trim())
      && !profile.resource_constraints.some((item) => item.trim())
    ) {
      missing.push('METHOD_OR_RESOURCE_CONSTRAINT_REQUIRED');
    }
    return missing;
  }

  private readinessBlockers(
    snapshot: TopicSelectionV1bIntakeSnapshotRecord,
    staleRefCodes: string[],
    missingConstraintCodes: string[],
    uncoveredRechecks: TopicSelectionSearchPlanRecheckRequestRecord[],
    parkReason: string | null,
  ): TopicSelectionGateIssue[] {
    const blockers: TopicSelectionGateIssue[] = [];
    if (snapshot.trace_status !== 'passed' || staleRefCodes.length > 0) {
      blockers.push(this.blocker('STALE_OR_INVALID_V1A_TRACE', 'v1b intake has stale, missing, or mismatched upstream trace refs.', [
        snapshot.v1b_input_bundle_ref,
        snapshot.validated_need_ref,
      ]));
    }
    if (uncoveredRechecks.length > 0) {
      blockers.push(this.blocker(
        'OPEN_HIGH_PRIORITY_RECHECK',
        'Open SearchPlan recheck must be resolved or covered by active accepted risk before slice planning.',
        uncoveredRechecks.map((request) =>
          this.ref('search_plan_recheck_request', request.search_plan_recheck_request_id, request.title_card_id)
        ),
      ));
    }
    if (parkReason) {
      blockers.push(this.blocker('INTAKE_PARKED', 'v1b intake is explicitly parked before ResearchSlice planning.', [
        snapshot.v1b_input_bundle_ref,
      ]));
    }
    if (missingConstraintCodes.length > 0) {
      blockers.push(this.blocker(
        'RESEARCH_CONSTRAINT_PROFILE_INCOMPLETE',
        'ResearchConstraintProfile is missing fields required to bound ResearchSlice planning.',
        [snapshot.validated_need_ref],
      ));
    }
    return blockers;
  }

  private readinessRecommendation(
    traceStatus: TopicSelectionV1bIntakeSnapshotRecord['trace_status'],
    staleRefCodes: string[],
    uncoveredRechecks: TopicSelectionSearchPlanRecheckRequestRecord[],
    missingConstraintCodes: string[],
    parkReason: string | null,
  ): TopicSelectionV1bIntakeReadinessRecommendation {
    if (traceStatus !== 'passed' || staleRefCodes.length > 0) {
      return 'blocked_by_stale_trace';
    }
    if (uncoveredRechecks.length > 0) {
      return 'blocked_by_recheck';
    }
    if (parkReason) {
      return 'park';
    }
    if (missingConstraintCodes.length > 0) {
      return 'needs_constraint_clarification';
    }
    return 'ready_for_slice';
  }

  private profileParkReason(profile: TopicSelectionResearchConstraintProfileRecord): string | null {
    const disposition = profile.constraint_payload.v1b_intake_disposition;
    if (disposition === 'park') {
      return typeof profile.constraint_payload.park_reason === 'string'
        ? profile.constraint_payload.park_reason
        : 'ResearchConstraintProfile requested park.';
    }
    return null;
  }

  private hashSnapshotAuthority(snapshot: TopicSelectionV1bIntakeSnapshotRecord): string {
    return this.hash({
      bundle_ref: snapshot.v1b_input_bundle_ref,
      evidence_map_freshness_status: snapshot.evidence_map_freshness_status ?? null,
      source_refs_hash: this.hash(uniqueRefs([
        snapshot.v1b_input_bundle_ref,
        snapshot.validated_need_ref,
        snapshot.source_need_candidate_ref,
        snapshot.adjudication_result_ref,
        snapshot.support_packet_ref,
        snapshot.human_decision_ref,
        snapshot.evidence_map_ref,
        snapshot.search_run_ref,
        snapshot.search_plan_ref,
        snapshot.literature_snapshot_ref,
        ...snapshot.trace_refs,
        ...snapshot.risk_refs,
        ...snapshot.memory_suggestion_refs,
        ...snapshot.recheck_request_refs,
      ])),
      trace_issue_codes: snapshot.trace_issues.map((issue) => issue.code),
      trace_status: snapshot.trace_status,
    });
  }

  /**
   * T-115 — public accessors for the human N2 path (V1bConstraintProfileHumanService).
   * Reusing these (Option B) lets the human service reproduce the EXACT intake-snapshot
   * authority ref + (uniqueRefs-nested) hash this harness re-derives, and read the same
   * lineage records, with ZERO duplication of the hash shape.
   */
  computeIntakeSnapshotAuthority(
    snapshot: TopicSelectionV1bIntakeSnapshotRecord,
  ): { ref: TopicSelectionFunctionalRef; hash: string } {
    return { ref: this.snapshotRef(snapshot), hash: this.hashSnapshotAuthority(snapshot) };
  }

  async findIntakeSnapshotById(
    intakeSnapshotId: string,
  ): Promise<TopicSelectionV1bIntakeSnapshotRecord | null> {
    return this.runnerDependencies.v1bIntakeRepository?.findIntakeSnapshotById(intakeSnapshotId) ?? null;
  }

  async findV1aToV1bInputBundleById(
    bundleId: string,
  ): Promise<TopicSelectionV1aToV1bInputBundleRecord | null> {
    return this.runnerDependencies.needValidationRepository?.findV1aToV1bInputBundleById(bundleId) ?? null;
  }

  async listIntakeSnapshotsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionV1bIntakeSnapshotRecord[]> {
    return this.runnerDependencies.v1bIntakeRepository?.listIntakeSnapshotsByTitleCardId(titleCardId) ?? [];
  }

  private hashProfileAuthority(profile: TopicSelectionResearchConstraintProfileRecord): string {
    return this.hash({
      accepted_profile_payload_hash: this.hash({
        available_assets: profile.available_assets,
        claim_ceiling: profile.claim_ceiling,
        constraint_payload: profile.constraint_payload,
        feasibility_budget: profile.feasibility_budget,
        human_constraint_notes: profile.human_constraint_notes ?? null,
        intended_contribution_style: profile.intended_contribution_style ?? null,
        method_constraints: profile.method_constraints,
        non_goals: profile.non_goals,
        resource_constraints: profile.resource_constraints,
        target_community: profile.target_community,
        target_venue_class: profile.target_venue_class ?? null,
      }),
      intake_snapshot_hash: this.hash({
        intake_snapshot_ref: profile.v1b_intake_snapshot_ref,
        v1b_input_bundle_ref: profile.v1b_input_bundle_ref,
      }),
      previous_profile_ref: profile.supersedes_profile_ref ?? null,
      profile_ref: this.profileRef(profile),
    });
  }

  private hashReadinessAuthority(
    readiness: TopicSelectionV1bIntakeReadinessAssessmentRecord,
    hashes: {
      constraintProfileHash: string;
      n2HandoffHash: string;
      snapshotHash: string;
    },
  ): string {
    return this.hash({
      accepted_risk_refs: readiness.accepted_risk_refs,
      blocker_codes: readiness.blockers.map((blocker) => blocker.code),
      constraint_profile_hash: hashes.constraintProfileHash,
      missing_constraint_codes: readiness.missing_constraint_codes,
      n2_handoff_hash: hashes.n2HandoffHash,
      recommendation: readiness.recommendation,
      readiness_ref: this.readinessRef(readiness),
      snapshot_hash: hashes.snapshotHash,
      stale_ref_codes: readiness.stale_ref_codes,
      uncovered_recheck_refs: readiness.uncovered_recheck_request_refs.map((ref) => ref.ref_id),
      warning_codes: readiness.warnings.map((warning) => warning.code),
    });
  }

  private bundleRef(bundle: TopicSelectionV1aToV1bInputBundleRecord): TopicSelectionFunctionalRef {
    return this.ref('v1a_to_v1b_input_bundle', bundle.v1b_input_bundle_id, bundle.title_card_id, bundle.bundle_version);
  }

  private v1aBundleSourceRefs(
    bundle: TopicSelectionV1aToV1bInputBundleRecord,
    bundleRef: TopicSelectionFunctionalRef,
  ): TopicSelectionFunctionalRef[] {
    return uniqueRefs([
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
      ...bundle.trace_refs,
      ...bundle.risk_refs,
      ...bundle.memory_suggestion_refs,
      ...bundle.recheck_request_refs,
    ]);
  }

  private n2CreatedBy(
    requested: TopicSelectionActorType | undefined,
    provider: TopicSelectionV1bN2HarnessFrozenInputPayload['authority_input_provider'],
  ): TopicSelectionActorType {
    if (requested) {
      return requested;
    }
    switch (provider) {
      case 'codex_delegated':
        return 'hybrid';
      case 'fixture':
        return 'system';
      case 'human_delegated':
        return 'human';
    }
  }

  private async persistBlockedResult(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
    blocker: { blockerCode: string; message: string },
  ): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
    const createdBy = input.created_by ?? 'system';
    const targetRef = this.nodeAttemptRef(input);
    const sourceRef = input.frozen_input.source_refs[0] ?? targetRef;
    const blockerIssue = this.blocker(blocker.blockerCode, blocker.message, input.frozen_input.source_refs);
    const inputSnapshot = await this.controlPlane.compileInputSnapshot({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      target_ref: targetRef,
      source_refs: input.frozen_input.source_refs,
      payload: {
        execution_spec_hash: hashContext.executionSpecHash,
        frozen_input_hash: hashContext.frozenInputHash,
        input_contract: input.frozen_input.input_contract,
        node_id: input.node_id,
        node_replay_key: hashContext.nodeReplayKey,
        policy_version: input.policy_version,
        profile_id: input.profile_id ?? null,
        run_mode: input.run_mode ?? null,
        runtime_admission_hash: hashContext.runtimeAdmissionHash,
        semantic_artifact_count: input.semantic_artifacts?.length ?? 0,
        semantic_artifact_hash: hashContext.semanticArtifactHash,
        snapshot_kind: input.frozen_input.snapshot_kind,
      },
      policy_version: input.policy_version,
      created_by: createdBy,
    });
    const gate = await this.controlPlane.runDeterministicGate({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      gate_key: `${input.node_id}.phase3-harness-gate`,
      target_ref: targetRef,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: input.workflow_run_id,
      policy_version_id: input.policy_version,
      blockers: [blockerIssue],
      required_actions: [blocker.blockerCode],
      created_by: createdBy,
    });
    const transition = await this.controlPlane.attemptTransition({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      transition_key: `${input.node_id}.phase3-harness-transition`,
      source_ref: sourceRef,
      target_ref: targetRef,
      gate_result_id: gate.readiness_gate_result_id,
      workflow_run_id: input.workflow_run_id,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      policy_version_id: input.policy_version,
      actor: input.actor ?? { actor_type: createdBy },
      created_authority_refs: [],
    });
    const gateResultRef = this.ref('readiness_gate_result', gate.readiness_gate_result_id, gate.title_card_id ?? input.title_card_id ?? null);
    const transitionRef = this.ref(
      'chain_transition_attempt',
      transition.chain_transition_attempt_id,
      transition.title_card_id ?? input.title_card_id ?? null,
    );
    const traceSnapshot = await this.controlPlane.buildTraceSnapshot({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      target_ref: targetRef,
      object_refs: [targetRef, ...input.frozen_input.source_refs],
      transition_attempt_refs: [transitionRef],
      payload: {
        blocker_codes: [blocker.blockerCode],
        gate_status: 'blocked',
        node_id: input.node_id,
        node_replay_key: hashContext.nodeReplayKey,
        phase: 'T-107 v1b workflow harness blocked result',
      },
      created_by: createdBy,
    });
    const traceSnapshotRef = this.ref(
      'trace_snapshot',
      traceSnapshot.trace_snapshot_id,
      traceSnapshot.title_card_id ?? input.title_card_id ?? null,
    );
    const replayIdentity: TopicSelectionV1bWorkflowHarnessReplayIdentity = {
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      attempt_family_key: hashContext.attemptFamilyKey,
      node_replay_key: hashContext.nodeReplayKey,
    };
    const hashes = this.resultHashes(input, hashContext, blocker.blockerCode);
    const resultWithoutTraceArtifact: TopicSelectionV1bWorkflowHarnessRunResult = {
      schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_RESULT_SCHEMA_VERSION,
      node_id: input.node_id,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      gate_status: 'blocked',
      failure_class: 'policy_block',
      route_decision: 'blocked',
      replay_identity: replayIdentity,
      hashes,
      blockers: [blockerIssue],
      warnings: [],
      authority_ref: null,
      handoff_ref: null,
      gate_result_ref: gateResultRef,
      transition_attempt_ref: transitionRef,
      trace_snapshot_ref: traceSnapshotRef,
      harness_trace_artifact_ref: null,
      replay_provenance: null,
      error_code: blocker.blockerCode,
      error_message: blocker.message,
    };
    const tracePayload = {
      payload_schema: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_TRACE_PAYLOAD_SCHEMA_VERSION,
      node_id: input.node_id,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      node_replay_key: hashContext.nodeReplayKey,
      input_hash: hashContext.frozenInputHash,
      request: input,
      result: resultWithoutTraceArtifact,
      created_at: this.now(),
    } satisfies TopicSelectionV1bWorkflowHarnessTracePayload;
    const traceArtifact = await this.controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      artifact_kind: 'trace',
      storage_kind: 'inline',
      workflow_run_id: input.workflow_run_id,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      payload: tracePayload as unknown as Record<string, unknown>,
      created_by: createdBy,
    });
    const result: TopicSelectionV1bWorkflowHarnessRunResult = {
      ...resultWithoutTraceArtifact,
      harness_trace_artifact_ref: this.ref(
        'artifact_ref',
        traceArtifact.artifact_ref_id,
        traceArtifact.title_card_id ?? input.title_card_id ?? null,
      ),
    };
    return this.assertResult(result);
  }

  private resultHashes(
    input: TopicSelectionV1bWorkflowHarnessRunRequest,
    hashContext: HashContext,
    blockerCode: string,
  ): TopicSelectionV1bWorkflowHarnessHashes {
    const gateResultHash = this.hash({
      authority_kind: null,
      blocker_codes: [blockerCode],
      frozen_input_hash: hashContext.frozenInputHash,
      gate_status: 'blocked',
      node_id: input.node_id,
      node_replay_key: hashContext.nodeReplayKey,
      output_schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_RESULT_SCHEMA_VERSION,
      policy_version: input.policy_version,
      route_decision: 'blocked',
      runtime_admission_hash: hashContext.runtimeAdmissionHash,
      semantic_artifact_hash: hashContext.semanticArtifactHash,
      warning_codes: [],
    });
    const routeHash = this.hash({
      gate_result_hash: gateResultHash,
      handoff_hash: null,
      next_action: 'blocked',
      node_attempt_id: input.node_attempt_id,
      node_id: input.node_id,
      route_decision: 'blocked',
      route_policy_version: input.policy_version,
      route_reason_code: blockerCode,
      target_node_id: null,
    });
    return {
      frozen_input_hash: hashContext.frozenInputHash,
      execution_spec_hash: hashContext.executionSpecHash,
      semantic_artifact_hash: hashContext.semanticArtifactHash,
      runtime_admission_hash: hashContext.runtimeAdmissionHash,
      gate_result_hash: gateResultHash,
      authority_hash: null,
      handoff_hash: null,
      route_hash: routeHash,
    };
  }

  private hasOnlyKeys(value: Record<string, unknown>, allowedKeys: string[]): boolean {
    const allowed = new Set(allowedKeys);
    return Object.keys(value).every((key) => allowed.has(key));
  }

  private isHash(value: unknown): value is string {
    return typeof value === 'string' && HASH_PATTERN.test(value);
  }

  private recordString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private isNullableHash(value: unknown): value is string | null | undefined {
    return value === undefined || value === null || this.isHash(value);
  }

  private isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
  }

  private isFunctionalRefArray(value: unknown): value is TopicSelectionFunctionalRef[] {
    return Array.isArray(value) && value.every((item) => this.isFunctionalRefValue(item));
  }

  private isNullableString(value: unknown): value is string | null | undefined {
    return value === undefined || value === null || typeof value === 'string';
  }

  private isRiskLevel(value: unknown): value is TopicSelectionResearchSliceOptionDraft['baseline_risk'] {
    return value === 'low' || value === 'medium' || value === 'high' || value === 'unknown';
  }

  private isSliceSelectionDecision(value: unknown): value is TopicSelectionSliceSelectionDecision {
    return value === 'select' || value === 'request_more_options' || value === 'park' || value === 'reject';
  }

  private isSliceLoopbackTarget(value: unknown): value is TopicSelectionSliceLoopbackTarget {
    return value === 'plan_research_slice_run'
      || value === 'research_constraint_profile'
      || value === 'validated_need'
      || value === 'evidence_map'
      || value === 'search_plan';
  }

  private isNullableSliceLoopbackTarget(value: unknown): value is TopicSelectionSliceLoopbackTarget | null {
    return value === null || this.isSliceLoopbackTarget(value);
  }

  private isRejectedOptionReasonArray(value: unknown): value is TopicSelectionRejectedSliceOptionReason[] {
    return Array.isArray(value) && value.every((item) => this.isRecord(item)
      && typeof item.option_id === 'string'
      && item.option_id.trim().length > 0
      && typeof item.reason === 'string'
      && item.reason.trim().length > 0
      && (
        item.reason_code === 'hard_blocker'
        || item.reason_code === 'weaker_fit'
        || item.reason_code === 'higher_risk'
        || item.reason_code === 'duplicate'
        || item.reason_code === 'out_of_scope'
        || item.reason_code === 'insufficient_evidence'
        || item.reason_code === 'resource_blocked'
        || item.reason_code === 'baseline_blocked'
        || item.reason_code === 'other'
      ));
  }

  private isClaimCeilingAlignment(value: unknown): value is TopicSelectionResearchSliceOptionDraft['claim_ceiling_alignment'] {
    if (!this.isRecord(value)) {
      return false;
    }
    return this.hasOnlyKeys(value, ['confidence', 'rationale', 'status'])
      && (value.status === 'aligned' || value.status === 'uncertain' || value.status === 'exceeds')
      && typeof value.rationale === 'string'
      && value.rationale.trim().length > 0
      && (value.confidence === null || value.confidence === undefined || typeof value.confidence === 'number');
  }

  private isFunctionalRefValue(value: unknown): value is TopicSelectionFunctionalRef {
    return this.isRecord(value)
      && typeof value.ref_type === 'string'
      && value.ref_type.trim().length > 0
      && typeof value.ref_id === 'string'
      && value.ref_id.trim().length > 0
      && (value.version_id === undefined || value.version_id === null || typeof value.version_id === 'string')
      && (value.title_card_id === undefined || value.title_card_id === null || typeof value.title_card_id === 'string');
  }

  private isNullableFunctionalRefValue(value: unknown): value is TopicSelectionFunctionalRef | null | undefined {
    return value === undefined || value === null || this.isFunctionalRefValue(value);
  }

  private pushRefMismatchIssue(
    issues: TopicSelectionGateIssue[],
    code: string,
    actual: TopicSelectionFunctionalRef,
    expected: TopicSelectionFunctionalRef,
  ): void {
    if (!this.refsEqual(actual, expected)) {
      issues.push(this.blocker(code, `${code} blocks v1b intake readiness.`, [actual, expected]));
    }
  }

  private isHumanDecisionRef(ref: TopicSelectionFunctionalRef): boolean {
    return ref.ref_type === 'human_confirmed_decision' || ref.ref_type === 'human_decision';
  }

  private isHumanActor(actorType: string): boolean {
    return actorType === 'human' || actorType === 'hybrid';
  }

  private snapshotRef(snapshot: TopicSelectionV1bIntakeSnapshotRecord): TopicSelectionFunctionalRef {
    return this.ref(
      'v1b_intake_snapshot',
      snapshot.v1b_intake_snapshot_id,
      snapshot.title_card_id,
      snapshot.snapshot_version,
    );
  }

  private profileRef(profile: TopicSelectionResearchConstraintProfileRecord): TopicSelectionFunctionalRef {
    return this.ref(
      'research_constraint_profile',
      profile.research_constraint_profile_id,
      profile.title_card_id,
      profile.profile_version,
    );
  }

  private readinessRef(readiness: TopicSelectionV1bIntakeReadinessAssessmentRecord): TopicSelectionFunctionalRef {
    return this.ref(
      'v1b_intake_readiness_assessment',
      readiness.v1b_intake_readiness_assessment_id,
      readiness.title_card_id,
    );
  }

  private flattenEvidenceRoleBundle(
    roleBundle: TopicSelectionEvidenceRoleBundle,
  ): TopicSelectionFunctionalRef[] {
    return [
      ...roleBundle.support_unit_refs,
      ...roleBundle.challenge_unit_refs,
      ...roleBundle.baseline_unit_refs,
      ...roleBundle.context_unit_refs,
    ];
  }

  private draftEvidenceRefs(draft: TopicSelectionResearchSliceOptionDraft): TopicSelectionFunctionalRef[] {
    return [
      ...draft.support_evidence_refs,
      ...draft.challenge_evidence_refs,
      ...draft.baseline_evidence_refs,
      ...draft.context_evidence_refs,
    ];
  }

  private n5ArtifactRefs(input: TopicSelectionV1bWorkflowHarnessRunRequest): TopicSelectionFunctionalRef[] {
    return uniqueRefs((input.semantic_artifacts ?? []).flatMap((artifact) => [
      artifact.support_artifact_ref,
      artifact.normalized_output_ref,
      artifact.provenance_ref,
    ]));
  }

  private optionSetRef(optionSet: TopicSelectionResearchSliceOptionSetRecord): TopicSelectionFunctionalRef {
    return this.ref('research_slice_option_set', optionSet.research_slice_option_set_id, optionSet.title_card_id);
  }

  private optionRef(option: TopicSelectionResearchSliceOptionRecord): TopicSelectionFunctionalRef {
    return this.ref('research_slice_option', option.research_slice_option_id, option.title_card_id);
  }

  private hashResearchSliceOptionAuthority(option: TopicSelectionResearchSliceOptionRecord): string {
    // Single source of truth (T-115): the option-authority hash shape lives in
    // topic-selection-v1b-harness-authority-hash so the human N5 path
    // (V1bSliceHumanSelectionService) and this harness re-derivation cannot drift.
    return sharedHashResearchSliceOptionAuthority(option);
  }

  private hashN5DecisionAuthority(input: {
    acceptedPayloadHash: string;
    decisionRef: TopicSelectionFunctionalRef;
    n4HandoffHash: string;
    optionSetHash: string;
    selectedOptionHash: string | null;
  }): string {
    return this.hash({
      accepted_selection_payload_hash: input.acceptedPayloadHash,
      decision_ref: input.decisionRef,
      n4_handoff_hash: input.n4HandoffHash,
      option_set_hash: input.optionSetHash,
      selected_option_hash: input.selectedOptionHash,
    });
  }

  private hashN5ResearchSliceAuthority(input: {
    acceptedPayloadHash: string;
    decisionHash: string;
    n4HandoffHash: string;
    optionSetHash: string;
    researchSliceRef: TopicSelectionFunctionalRef;
    selectedOptionHash: string;
  }): string {
    return this.hash({
      accepted_selection_payload_hash: input.acceptedPayloadHash,
      decision_hash: input.decisionHash,
      n4_handoff_hash: input.n4HandoffHash,
      option_set_hash: input.optionSetHash,
      research_slice_ref: input.researchSliceRef,
      selected_option_hash: input.selectedOptionHash,
    });
  }

  private defaultRejectedReasons(
    options: TopicSelectionResearchSliceOptionRecord[],
    selectedOption: TopicSelectionResearchSliceOptionRecord,
  ): TopicSelectionRejectedSliceOptionReason[] {
    return options
      .filter((option) => option.research_slice_option_id !== selectedOption.research_slice_option_id)
      .map((option) => ({
        option_id: option.research_slice_option_id,
        reason: option.status === 'blocked'
          ? 'Option carried hard blockers.'
          : 'Option was not selected in this decision.',
        reason_code: option.status === 'blocked' ? 'hard_blocker' : 'weaker_fit',
      }));
  }

  private inheritedConstraints(option: TopicSelectionResearchSliceOptionRecord): InheritedConstraints {
    const inherited = this.isRecord(option.details_payload.inherited_constraints)
      ? option.details_payload.inherited_constraints
      : {};
    const claimCeiling = typeof inherited.claim_ceiling === 'string'
      ? inherited.claim_ceiling
      : 'No claim beyond the selected ResearchSlice option.';
    const nonGoals = this.isStringArray(inherited.non_goals) ? inherited.non_goals : [];
    return {
      claim_ceiling: claimCeiling,
      non_goals: nonGoals,
    };
  }

  private topicQuestionGuardrails(
    option: TopicSelectionResearchSliceOptionRecord,
    inherited: InheritedConstraints,
  ): string[] {
    return uniqueStrings([
      `Do not exceed claim ceiling: ${inherited.claim_ceiling}`,
      ...option.excluded_boundaries.map((boundary) => `Exclude: ${boundary}`),
      ...inherited.non_goals.map((nonGoal) => `Non-goal: ${nonGoal}`),
    ]);
  }

  private valueAssessmentInputs(option: TopicSelectionResearchSliceOptionRecord): string[] {
    return uniqueStrings([
      option.expected_claim,
      option.fallback_claim,
      option.evaluation_path,
      ...option.observable_success_criteria,
    ]);
  }

  private mustPreserveBoundaries(
    option: TopicSelectionResearchSliceOptionRecord,
    inherited: InheritedConstraints,
  ): string[] {
    return uniqueStrings([
      inherited.claim_ceiling,
      ...option.included_boundaries,
      ...option.excluded_boundaries,
      ...inherited.non_goals,
    ]);
  }

  private humanReviewReason(option: TopicSelectionResearchSliceOptionRecord): string | null {
    if (!option.requires_human_review) {
      return null;
    }
    return uniqueStrings(option.human_review_triggers).join('; ') || 'ResearchSlice option requires human review.';
  }

  private defaultN5Loopback(
    decision: Exclude<TopicSelectionSliceSelectionDecision, 'select'>,
  ): TopicSelectionSliceLoopbackTarget {
    if (decision === 'request_more_options') {
      return 'plan_research_slice_run';
    }
    if (decision === 'park') {
      return 'research_constraint_profile';
    }
    return 'validated_need';
  }

  private n5OptionSetStatusForNonSelectDecision(
    decision: Exclude<TopicSelectionSliceSelectionDecision, 'select'>,
  ): TopicSelectionResearchSliceOptionSetRecord['status'] {
    if (decision === 'request_more_options') {
      return 'needs_more_options';
    }
    if (decision === 'park') {
      return 'parked';
    }
    return 'rejected';
  }

  private n5CreatedBy(
    requested: TopicSelectionActorType | undefined,
    provider: TopicSelectionV1bN5HarnessFrozenInputPayload['authority_input_provider'],
  ): TopicSelectionActorType {
    if (requested) {
      return requested;
    }
    switch (provider) {
      case 'codex_delegated':
        return 'hybrid';
      case 'fixture':
        return 'system';
      case 'human_delegated':
        return 'human';
    }
  }

  private isHighRiskDraft(draft: TopicSelectionResearchSliceOptionDraft): boolean {
    return draft.baseline_risk === 'high'
      || draft.execution_risk === 'high'
      || draft.scope_risk === 'high';
  }

  private isHighRiskOption(option: TopicSelectionResearchSliceOptionRecord): boolean {
    return option.baseline_risk === 'high'
      || option.execution_risk === 'high'
      || option.scope_risk === 'high';
  }

  private nonGoalsRemainExcluded(
    draft: TopicSelectionResearchSliceOptionDraft,
    nonGoals: string[],
  ): boolean {
    const excludedText = draft.excluded_boundaries.map((value) => this.normalize(value)).join(' ');
    return nonGoals.every((nonGoal) => excludedText.includes(this.normalize(nonGoal)));
  }

  private explicitClaimCeilingViolations(claimCeiling: string, claims: string[]): string[] {
    const claimText = claims.map((claim) => this.normalize(claim)).join(' ');
    const ceilingText = this.normalize(claimCeiling);
    const blockedPhrases = [
      ...ceilingText.matchAll(/\b(?:not|cannot|can't|do not|should not)\s+([^.;,]+)/g),
    ]
      .map((match) => match[1]?.trim() ?? '')
      .filter((phrase) => phrase.length >= 4);
    return blockedPhrases.filter((phrase) => claimText.includes(phrase));
  }

  private aligns(left: string, right: string): boolean {
    const normalizedLeft = this.normalize(left);
    const normalizedRight = this.normalize(right);
    return normalizedLeft === normalizedRight
      || normalizedLeft.includes(normalizedRight)
      || normalizedRight.includes(normalizedLeft);
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private refsEqual(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return left.ref_type === right.ref_type
      && left.ref_id === right.ref_id
      && (left.version_id ?? null) === (right.version_id ?? null)
      && (left.title_card_id ?? null) === (right.title_card_id ?? null);
  }

  private nullableRefsEqual(
    left: TopicSelectionFunctionalRef | null | undefined,
    right: TopicSelectionFunctionalRef | null | undefined,
  ): boolean {
    if (!left && !right) {
      return true;
    }
    if (!left || !right) {
      return false;
    }
    return this.refsEqual(left, right);
  }

  private refArraysEqual(left: TopicSelectionFunctionalRef[], right: TopicSelectionFunctionalRef[]): boolean {
    return left.length === right.length
      && left.every((leftRef, index) => this.refsEqual(leftRef, right[index]!));
  }

  private stringArraysEqual(left: string[], right: string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return [
      ref.ref_type,
      ref.ref_id,
      ref.version_id ?? '',
      ref.title_card_id ?? '',
    ].join(':');
  }

  // uniqueRefs / uniqueStrings / uniqueIssues relocated to topic-selection-v1b-harness-dedup-utils.ts
  // (Phase 5.1 split, D-T123-03) — imported above; call sites unchanged except dropping `this.`.

  private versionFromId(id: string): string {
    return `v_${id.split('_').at(-1) ?? '1'}`;
  }

  private nodeAttemptRef(input: TopicSelectionV1bWorkflowHarnessRunRequest): TopicSelectionFunctionalRef {
    return this.ref('v1b_workflow_harness_node_attempt', input.node_attempt_id, input.title_card_id ?? null);
  }

  private blocker(
    code: string,
    message: string,
    refs: TopicSelectionFunctionalRef[],
  ): TopicSelectionGateIssue {
    return {
      code,
      message,
      severity: 'blocking',
      refs,
    };
  }

  private warning(
    code: string,
    message: string,
    refs?: TopicSelectionFunctionalRef[],
  ): TopicSelectionGateIssue {
    return {
      code,
      message,
      severity: 'warning',
      refs,
    };
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

  private hash(value: unknown): string {
    // Single-source with the human-path services + frozen-input hashing: both
    // derive from `canonicalHash` (sha256(stableStringify)) so the harness and
    // the N2/N5 human services can never drift apart. (D1 consolidation.)
    return canonicalHash(value);
  }
}
