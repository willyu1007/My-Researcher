import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  type TopicSelectionV1bAcceptedConstraintProfilePayload,
  type TopicSelectionV1bAcceptedSliceSelectionPayload,
  type TopicSelectionV1bN1HarnessFrozenInputPayload,
  type TopicSelectionV1bN2HarnessFrozenInputPayload,
  type TopicSelectionV1bN3HarnessFrozenInputPayload,
  type TopicSelectionV1bN4HarnessFrozenInputPayload,
  type TopicSelectionV1bN5HarnessFrozenInputPayload,
  type TopicSelectionV1bN6DivergentDebateRoleSlotId,
  type TopicSelectionV1bN6HarnessFrozenInputPayload,
  type TopicSelectionV1bN6LoopbackTriageSupportPayload,
  type TopicSelectionV1bN7HarnessFrozenInputPayload,
  type TopicSelectionV1bN7ToN6FailedTrialLoopbackContextProjection,
  type TopicSelectionV1bCandidateGroupingSupportPayload,
  type TopicSelectionV1bN8DebateAdmissionReviewSupportPayload,
  type TopicSelectionV1bN8FailedTrialSynthesisSupportPayload,
  type TopicSelectionV1bN8HarnessFrozenInputPayload,
  type TopicSelectionV1bN8ToN7FeedbackPayload,
  type TopicSelectionV1bN9HarnessFrozenInputPayload,
  type TopicSelectionV1bN10HarnessFrozenInputPayload,
  type TopicSelectionV1bN11HarnessFrozenInputPayload,
  type TopicSelectionV1bResearchSliceOptionSetDraftPayload,
  type TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
  type TopicSelectionV1bTopicValueAssessmentDraftPayload,
  type TopicSelectionV1bWorkflowHarnessNodePolicy,
  type TopicSelectionV1bWorkflowHarnessNodeId,
  type TopicSelectionV1bWorkflowHarnessHandoff,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessRunResult,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type {
  TopicSelectionResearchSliceOptionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import {
  TOPIC_SELECTION_VALUE_DIMENSIONS,
  TOPIC_SELECTION_VALUE_GATE_KEYS,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import type {
  TopicSelectionActorRef,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidenceRoleBundle,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionNeedCandidateRecord,
  TopicSelectionV1aToV1bInputBundleRecord,
  TopicSelectionValidateNeedAdjudicationResultRecord,
  TopicSelectionValidatedNeedRecord,
  TopicSelectionValidationDecisionSupportPacketRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionAcceptedRiskRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-recheck-risk-memory-contracts';
import type {
  TopicSelectionLiteratureResourcePoolSnapshotRecord,
  TopicSelectionSearchPlanRecord,
  TopicSelectionSearchPlanRecheckRequestRecord,
  TopicSelectionSearchRunRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionEvidenceMapRepository } from '../repositories/in-memory-topic-selection-evidence-map-repository.js';
import { InMemoryTopicSelectionNeedValidationRepository } from '../repositories/in-memory-topic-selection-need-validation-repository.js';
import { InMemoryTopicSelectionRecheckRiskMemoryRepository } from '../repositories/in-memory-topic-selection-recheck-risk-memory-repository.js';
import { InMemoryTopicSelectionResearchCheckpointRepository } from '../repositories/in-memory-topic-selection-research-checkpoint-repository.js';
import { InMemoryTopicSelectionSearchResourceRepository } from '../repositories/in-memory-topic-selection-search-resource-repository.js';
import { InMemoryTopicSelectionV1bIntakeRepository } from '../repositories/in-memory-topic-selection-v1b-intake-repository.js';
import { InMemoryTopicSelectionV1bResearchSliceRepository } from '../repositories/in-memory-topic-selection-v1b-research-slice-repository.js';
import { InMemoryTopicSelectionV1bTopicQuestionRepository } from '../repositories/in-memory-topic-selection-v1b-topic-question-repository.js';
import { InMemoryTopicSelectionV1bValueAssessmentRepository } from '../repositories/in-memory-topic-selection-v1b-value-assessment-repository.js';
import { InMemoryTopicSelectionV1bTopicPackageRepository } from '../repositories/in-memory-topic-selection-v1b-topic-package-repository.js';
import { AppError } from '../errors/app-error.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';
import { TopicSelectionV1bWorkflowHarnessService } from './topic-selection-v1b-workflow-harness-service.js';
import {
  TopicSelectionV1bEarlySemanticSupportRuntimeService,
  type TopicSelectionV1bEarlySemanticSupportPayload,
  type TopicSelectionV1bIntakeReadinessClassificationSupportPayload,
} from './topic-selection-v1b-early-semantic-support-runtime-service.js';
import type {
  TopicSelectionV1bEarlySemanticSupportSlotId,
} from './topic-selection-v1b-early-semantic-support-admission-service.js';
import {
  TopicSelectionV1bN6DraftRuntimeService,
  type TopicSelectionV1bN6DraftGenerationMode,
} from './topic-selection-v1b-n6-draft-runtime-service.js';
import {
  TopicSelectionV1bN6DivergentDebateRuntimeService,
  type V1bN6DebateInputs,
} from './topic-selection-v1b-n6-divergent-debate-runtime-service.js';
import { TopicSelectionV1bN4ResearchSliceRuntimeService } from './topic-selection-v1b-n4-research-slice-runtime-service.js';
import { TopicSelectionV1bN6LoopbackTriageRuntimeService } from './topic-selection-v1b-n6-loopback-triage-runtime-service.js';
import {
  TopicSelectionV1bN7SupportRuntimeService,
  type TopicSelectionV1bN7RuntimeSupportPayload,
} from './topic-selection-v1b-n7-support-runtime-service.js';
import type {
  TopicSelectionV1bN7SupportSlotId,
} from './topic-selection-v1b-n7-support-admission-service.js';
import { TopicSelectionV1bN8ValueAssessmentRuntimeService } from './topic-selection-v1b-n8-value-assessment-runtime-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const NOW = '2026-05-26T00:00:00.000Z';
const TITLE_CARD_ID = 'title_card_v1b_harness';

function makeContext(options: { withRunnerDependencies?: boolean } = {}) {
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const evidenceRepository = new InMemoryTopicSelectionEvidenceMapRepository();
  const needRepository = new InMemoryTopicSelectionNeedValidationRepository();
  const recheckRepository = new InMemoryTopicSelectionRecheckRiskMemoryRepository();
  const researchCheckpointRepository = new InMemoryTopicSelectionResearchCheckpointRepository();
  const searchRepository = new InMemoryTopicSelectionSearchResourceRepository();
  const v1bRepository = new InMemoryTopicSelectionV1bIntakeRepository();
  const researchSliceRepository = new InMemoryTopicSelectionV1bResearchSliceRepository();
  const topicQuestionRepository = new InMemoryTopicSelectionV1bTopicQuestionRepository();
  const valueAssessmentRepository = new InMemoryTopicSelectionV1bValueAssessmentRepository();
  const topicPackageRepository = new InMemoryTopicSelectionV1bTopicPackageRepository(valueAssessmentRepository);
  const controlPlane = new TopicSelectionControlPlaneService(controlPlaneRepository, {
    idFactory,
    now: () => NOW,
  });
  const researchCheckpointService = new TopicSelectionResearchCheckpointService(
    researchCheckpointRepository,
    controlPlane,
    { idFactory, now: () => NOW },
  );
  const service = new TopicSelectionV1bWorkflowHarnessService(controlPlane, {
    idFactory,
    now: () => NOW,
    runnerDependencies: options.withRunnerDependencies
      ? {
        evidenceMapRepository: evidenceRepository,
        needValidationRepository: needRepository,
        recheckRiskMemoryRepository: recheckRepository,
        researchCheckpointService,
        researchSliceRepository,
        searchResourceRepository: searchRepository,
        topicQuestionRepository,
        topicPackageRepository,
        valueAssessmentRepository,
        v1bIntakeRepository: v1bRepository,
      }
      : undefined,
  });

  return {
    controlPlane,
    controlPlaneRepository,
    evidenceRepository,
    needRepository,
    recheckRepository,
    researchCheckpointRepository,
    researchCheckpointService,
    researchSliceRepository,
    searchRepository,
    service,
    topicQuestionRepository,
    topicPackageRepository,
    valueAssessmentRepository,
    v1bRepository,
  };
}

function ref(
  refType: string,
  refId: string,
  titleCardId: string | null = TITLE_CARD_ID,
  versionId: string | null = null,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: titleCardId,
    version_id: versionId,
  };
}

function frozenInputHash(payload: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input']): string {
  return sha256Text(stableStringify({
    input_contract: payload.input_contract,
    payload: payload.payload,
    snapshot_kind: payload.snapshot_kind,
    source_refs: payload.source_refs,
  }));
}

function policyForNode(nodeId: TopicSelectionV1bWorkflowHarnessNodeId): TopicSelectionV1bWorkflowHarnessNodePolicy {
  const policy = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES.find((item) => item.node_id === nodeId);
  if (!policy) {
    throw new Error(`Unknown test node policy: ${nodeId}.`);
  }
  return policy;
}

function slotSpecForNode(nodeId: TopicSelectionV1bWorkflowHarnessNodeId): Pick<
  TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  'slot_id' | 'allowed_effect' | 'output_contract' | 'execution_mode' | 'profile_id'
> {
  const policy = policyForNode(nodeId);
  const slot = policy.semantic_support_slots.find((item) => item.required_for_progress)
    ?? policy.semantic_support_slots[0];
  if (!slot) {
    throw new Error(`No semantic slot fixture for ${nodeId}.`);
  }
  return {
    slot_id: slot.slot_id,
    allowed_effect: slot.allowed_effect,
    output_contract: slot.output_contract,
    execution_mode: slot.allowed_execution_modes.includes('codex_assisted') ? 'codex_assisted' : slot.allowed_execution_modes[0]!,
    profile_id: slot.default_profile_id,
  };
}

function requiredSlotForNode(
  nodeId: TopicSelectionV1bWorkflowHarnessNodeId,
) {
  const policy = policyForNode(nodeId);
  return policy.semantic_support_slots.find((slot) => (
    slot.required_for_progress && slot.allowed_effect === 'model_draft_for_gate'
  )) ?? policy.semantic_support_slots[0] ?? null;
}

function providerModelOptionId(nodeId: TopicSelectionV1bWorkflowHarnessNodeId): string {
  const slot = requiredSlotForNode(nodeId);
  if (!slot) {
    throw new Error(`No provider slot fixture for ${nodeId}.`);
  }
  return `${slot.default_profile_id}.openai-balanced`;
}

function semanticArtifact(
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  overrides: Partial<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> = {},
): TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef {
  const slot = slotSpecForNode(input.node_id);
  return {
    ...slot,
    node_id: input.node_id,
    run_mode: input.run_mode ?? 'acceptance',
    support_artifact_ref: ref('artifact_ref', `${input.node_attempt_id}_support`),
    support_artifact_hash: 'a'.repeat(64),
    normalized_output_ref: ref('artifact_ref', `${input.node_attempt_id}_normalized`),
    normalized_output_hash: 'b'.repeat(64),
    profile_id: slot.profile_id,
    model_option_id: null,
    input_hash: input.frozen_input.frozen_input_hash!,
    prompt_packet_hash: 'c'.repeat(64),
    structured_output_hash: 'd'.repeat(64),
    adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
    slot_spec_hash: 'e'.repeat(64),
    provenance_ref: ref('artifact_ref', `${input.node_attempt_id}_provenance`),
    runtime_provenance_class: 'fixture_replay',
    context_policy_profile_id: null,
    context_policy_profile_version: null,
    context_policy_profile_hash: null,
    prompt_variant_key: null,
    runtime_invocation_context_hash: null,
    redaction_policy: null,
    source_hashes: {},
    runtime_audit_ref: null,
    runtime_audit_hash: null,
    compression_report_ref: null,
    compression_report_hash: null,
    compressed_context_hash: null,
    ...overrides,
  };
}

function request(
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): TopicSelectionV1bWorkflowHarnessRunRequest {
  const nodeId = overrides.node_id ?? 'topic-selection.v1b.generate-research-slice-options.v1';
  const policy = policyForNode(nodeId);
  const frozenInput: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input'] = {
    input_contract: policy.input_contract,
    snapshot_kind: policy.required_frozen_snapshot_kind,
    source_refs: [ref(policy.required_frozen_snapshot_kind, 'frozen_source_001')],
    payload: {
      source_object_id: 'frozen_source_001',
      warning_context: ['accepted_risk_carried_forward'],
    },
  };
  const selectedFrozenInput = overrides.frozen_input ?? frozenInput;
  const restOverrides = { ...overrides };
  delete restOverrides.frozen_input;
  delete restOverrides.node_id;
  const requiredSlot = requiredSlotForNode(nodeId);
  const runtimeDefaults: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = policy.execution_kind === 'model_like' && requiredSlot
    ? {
      run_mode: 'acceptance',
      profile_id: requiredSlot.default_profile_id,
      execution_spec: {
        execution_mode: 'codex_assisted',
        model_option_id: null,
      },
    }
    : {};
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    workflow_run_id: 'workflow_run_v1b_harness_001',
    node_attempt_id: 'node_attempt_v1b_harness_001',
    node_id: nodeId,
    policy_version: 'topic-selection-v1b-node-policy-v1',
    frozen_input: {
      ...selectedFrozenInput,
      frozen_input_hash: selectedFrozenInput.frozen_input_hash ?? frozenInputHash(selectedFrozenInput),
    },
    created_by: 'system',
    ...runtimeDefaults,
    ...restOverrides,
  };
}

function bundleRef(bundle: TopicSelectionV1aToV1bInputBundleRecord): TopicSelectionFunctionalRef {
  return ref('v1a_to_v1b_input_bundle', bundle.v1b_input_bundle_id, bundle.title_card_id, bundle.bundle_version);
}

function v1aBundleSourceRefs(bundle: TopicSelectionV1aToV1bInputBundleRecord): TopicSelectionFunctionalRef[] {
  return uniqueRefs([
    bundleRef(bundle),
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

function uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
  const seen = new Set<string>();
  const result: TopicSelectionFunctionalRef[] = [];
  for (const item of refs) {
    const key = [item.ref_type, item.ref_id, item.title_card_id ?? '', item.version_id ?? ''].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function acceptedConstraintProfilePayload(
  overrides: Partial<TopicSelectionV1bAcceptedConstraintProfilePayload> = {},
): TopicSelectionV1bAcceptedConstraintProfilePayload {
  return {
    target_community: 'CS paper engineering researchers',
    target_venue_class: null,
    intended_contribution_style: 'workflow_system',
    method_constraints: ['local-first workflow instrumentation'],
    resource_constraints: ['no live provider calls in fixture runs'],
    available_assets: ['v1a evidence map'],
    feasibility_budget: {
      maximum_slice_count: 3,
    },
    non_goals: ['promotion decision'],
    claim_ceiling: 'A bounded workflow claim about evidence-to-need traceability.',
    human_constraint_notes: null,
    constraint_payload: {
      source: 'fixture',
    },
    ...overrides,
  };
}

function n1Request(
  bundle: TopicSelectionV1aToV1bInputBundleRecord,
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): TopicSelectionV1bWorkflowHarnessRunRequest {
  const payload: TopicSelectionV1bN1HarnessFrozenInputPayload = {
    v1b_input_bundle_id: bundle.v1b_input_bundle_id,
    v1a_bundle_ref: bundleRef(bundle),
    v1a_bundle_hash: sha256Text(stableStringify(bundle)),
    source_refs_hash: sha256Text(stableStringify(v1aBundleSourceRefs(bundle))),
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n1',
    node_attempt_id: 'node_attempt_v1b_n1',
    node_id: 'topic-selection.v1b.create-intake-snapshot.v1',
    title_card_id: bundle.title_card_id,
    frozen_input: {
      input_contract: 'V1aToV1bInputBundleFrozenRef@v1',
      snapshot_kind: 'v1a_valid_need_bundle',
      source_refs: [ref('v1a_valid_need_bundle', bundle.v1b_input_bundle_id, bundle.title_card_id, bundle.bundle_version)],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

function n2Request(
  bundle: TopicSelectionV1aToV1bInputBundleRecord,
  n1Result: { authority_ref: TopicSelectionFunctionalRef | null; hashes: { authority_hash: string | null } },
  acceptedPayload: TopicSelectionV1bAcceptedConstraintProfilePayload = acceptedConstraintProfilePayload(),
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): TopicSelectionV1bWorkflowHarnessRunRequest {
  if (!n1Result.authority_ref || !n1Result.hashes.authority_hash) {
    throw new Error('N2 fixture requires admitted N1 result.');
  }
  const acceptedHash = sha256Text(stableStringify(acceptedPayload));
  const payload: TopicSelectionV1bN2HarnessFrozenInputPayload = {
    intake_snapshot_ref: n1Result.authority_ref,
    intake_snapshot_hash: n1Result.hashes.authority_hash,
    v1a_bundle_ref: bundleRef(bundle),
    v1a_bundle_hash: sha256Text(stableStringify(bundle)),
    authority_input_provider: 'codex_delegated',
    accepted_constraint_profile_payload: acceptedPayload,
    accepted_constraint_profile_payload_hash: acceptedHash,
    delegation_artifact_hash: acceptedHash,
    previous_profile_ref: null,
    previous_profile_hash: null,
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n2',
    node_attempt_id: 'node_attempt_v1b_n2',
    node_id: 'topic-selection.v1b.record-research-constraint-profile.v1',
    title_card_id: bundle.title_card_id,
    run_mode: 'acceptance',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.constraint_profile_support,
    frozen_input: {
      input_contract: 'N1ToN2Handoff@v1',
      snapshot_kind: 'v1b_intake_snapshot',
      source_refs: [n1Result.authority_ref],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

function n3Request(
  n1Result: { authority_ref: TopicSelectionFunctionalRef | null; hashes: { authority_hash: string | null } },
  n2Result: { authority_ref: TopicSelectionFunctionalRef | null; hashes: { authority_hash: string | null; handoff_hash: string | null } },
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): TopicSelectionV1bWorkflowHarnessRunRequest {
  if (!n1Result.authority_ref || !n1Result.hashes.authority_hash || !n2Result.authority_ref || !n2Result.hashes.authority_hash) {
    throw new Error('N3 fixture requires admitted N1/N2 results.');
  }
  const payload: TopicSelectionV1bN3HarnessFrozenInputPayload = {
    intake_snapshot_ref: n1Result.authority_ref,
    intake_snapshot_hash: n1Result.hashes.authority_hash,
    constraint_profile_ref: n2Result.authority_ref,
    constraint_profile_hash: n2Result.hashes.authority_hash,
    n2_handoff_hash: n2Result.hashes.handoff_hash ?? 'f'.repeat(64),
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n3',
    node_attempt_id: 'node_attempt_v1b_n3',
    node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
    title_card_id: n1Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    frozen_input: {
      input_contract: 'N2ToN3Handoff@v1',
      snapshot_kind: 'research_constraint_profile',
      source_refs: [n2Result.authority_ref],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

function n3ReadinessClassificationSupport(
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
): TopicSelectionV1bIntakeReadinessClassificationSupportPayload {
  return {
    schema_version: 'IntakeReadinessClassificationSupport@v1',
    readiness_recommendation: 'ready',
    blocker_codes: [],
    warning_codes: [],
    loopback_target_code: null,
    cited_refs: input.frozen_input.source_refs,
    rationale: 'Unit-test runtime support mirrors deterministic readiness without writing authority.',
    no_authority_write_confirmed: true,
  };
}

function n4Request(
  n1Result: { authority_ref: TopicSelectionFunctionalRef | null; hashes: { authority_hash: string | null } },
  n2Result: { authority_ref: TopicSelectionFunctionalRef | null; hashes: { authority_hash: string | null; handoff_hash: string | null } },
  n3Result: { authority_ref: TopicSelectionFunctionalRef | null; hashes: { authority_hash: string | null; handoff_hash: string | null } },
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): TopicSelectionV1bWorkflowHarnessRunRequest {
  if (
    !n1Result.authority_ref
    || !n1Result.hashes.authority_hash
    || !n2Result.authority_ref
    || !n2Result.hashes.authority_hash
    || !n2Result.hashes.handoff_hash
    || !n3Result.authority_ref
    || !n3Result.hashes.authority_hash
    || !n3Result.hashes.handoff_hash
  ) {
    throw new Error('N4 fixture requires admitted N1/N2/N3 results.');
  }
  const payload: TopicSelectionV1bN4HarnessFrozenInputPayload = {
    intake_snapshot_ref: n1Result.authority_ref,
    intake_snapshot_hash: n1Result.hashes.authority_hash,
    constraint_profile_ref: n2Result.authority_ref,
    constraint_profile_hash: n2Result.hashes.authority_hash,
    intake_readiness_ref: n3Result.authority_ref,
    intake_readiness_hash: n3Result.hashes.authority_hash,
    n2_handoff_hash: n2Result.hashes.handoff_hash,
    n3_handoff_hash: n3Result.hashes.handoff_hash,
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n4',
    node_attempt_id: 'node_attempt_v1b_n4',
    node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
    title_card_id: n1Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    execution_spec: null,
    profile_id: null,
    run_mode: null,
    frozen_input: {
      input_contract: 'N3ToN4Handoff@v1',
      snapshot_kind: 'v1b_intake_readiness_assessment',
      source_refs: [n3Result.authority_ref, n2Result.authority_ref, n1Result.authority_ref],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

function n4Draft(
  overrides: Partial<TopicSelectionV1bResearchSliceOptionSetDraftPayload> = {},
): TopicSelectionV1bResearchSliceOptionSetDraftPayload {
  const supportUnitRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const validatedNeedRef = ref('validated_need', 'validated_need_1', TITLE_CARD_ID);
  return {
    recommended_option_key: 'traceable_workflow_slice',
    comparison_axes: ['method feasibility', 'evidence traceability'],
    comparison_summary: 'The recommended slice keeps the claim bounded to workflow traceability.',
    missing_option_types: [],
    unresolved_disagreements: [],
    human_review_triggers: [],
    options: [
      {
        option_key: 'traceable_workflow_slice',
        source_validated_need_refs: [validatedNeedRef],
        slice_statement: 'Build a bounded evidence-to-need traceability workflow for topic selection.',
        problem_space: 'Reviewer-aligned topic selection traceability.',
        target_setting: 'Local-first CS paper engineering assistant workflows.',
        target_community: 'CS paper engineering researchers',
        included_boundaries: ['v1a evidence-to-need trace preservation'],
        excluded_boundaries: ['promotion decision', 'full paper implementation'],
        contribution_type_candidate: 'workflow_system',
        support_evidence_refs: [supportUnitRef],
        challenge_evidence_refs: [],
        baseline_evidence_refs: [],
        context_evidence_refs: [],
        resource_assumptions: ['Fixture run uses existing v1a evidence map.'],
        data_assumptions: ['Evidence units remain frozen during slice generation.'],
        evaluation_path: 'Replay the harness and inspect deterministic trace hashes.',
        baseline_assumptions: ['Route-only smoke tests are insufficient as a baseline.'],
        hard_blockers: [],
        dependency_risks: ['Downstream selection may request more options.'],
        slice_budget: {
          max_nodes: 4,
        },
        expected_claim: 'A bounded workflow can preserve evidence-to-need traceability.',
        fallback_claim: 'A harness-native workflow improves traceability checks.',
        observable_success_criteria: ['N4 emits option set refs and hashes through handoff.'],
        main_risks: ['Evidence coverage may still need review.'],
        baseline_risk: 'medium',
        execution_risk: 'medium',
        scope_risk: 'low',
        claim_ceiling_alignment: {
          status: 'aligned',
          rationale: 'The claim is bounded to traceability workflow behavior.',
          confidence: 0.8,
        },
        confidence: 0.82,
        requires_human_review: false,
        human_review_triggers: [],
        details_payload: {
          fixture: true,
        },
      },
    ],
    ...overrides,
  };
}

async function recordN4DraftArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  draft: TopicSelectionV1bResearchSliceOptionSetDraftPayload,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const support = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: draft as unknown as Record<string, unknown>,
    created_by: 'system',
  });
  const normalized = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: draft as unknown as Record<string, unknown>,
    created_by: 'system',
  });
  const provenance = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: {
      adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
      source: 'fixture',
    },
    created_by: 'system',
  });
  const draftHash = sha256Text(stableStringify(draft));
  return semanticArtifact(input, {
    slot_id: 'n4_research_slice_option_draft',
    allowed_effect: 'model_draft_for_gate',
    output_contract: 'ResearchSliceOptionSetDraft@v1',
    execution_mode: 'codex_assisted',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
    support_artifact_ref: ref('artifact_ref', support.artifact_ref_id, TITLE_CARD_ID),
    support_artifact_hash: draftHash,
    normalized_output_ref: ref('artifact_ref', normalized.artifact_ref_id, TITLE_CARD_ID),
    normalized_output_hash: draftHash,
    structured_output_hash: draftHash,
    provenance_ref: ref('artifact_ref', provenance.artifact_ref_id, TITLE_CARD_ID),
  });
}

async function generateEarlySemanticSupportArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  slotId: TopicSelectionV1bEarlySemanticSupportSlotId,
  payload: TopicSelectionV1bEarlySemanticSupportPayload,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const runtime = new TopicSelectionV1bEarlySemanticSupportRuntimeService(ctx.controlPlane);
  const generated = await runtime.generateSupportArtifact({
    request: input,
    slot_id: slotId,
    execution_mode: 'codex_assisted',
    run_mode: input.run_mode ?? 'acceptance',
    codex_response: {
      output: payload,
      operator_label: 'unit-test-early-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error(`Expected early semantic runtime support generation to succeed for ${slotId}.`);
  }
  return generated.semantic_artifact;
}

async function invokeN2WithRuntimeSupport(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  payload: TopicSelectionV1bAcceptedConstraintProfilePayload,
): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
  return ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      await generateEarlySemanticSupportArtifact(
        ctx,
        input,
        'n2_constraint_profile_semantic_support',
        payload,
      ),
    ],
  });
}

async function n4RuntimePlanningInput(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
) {
  const payload = input.frozen_input.payload as unknown as TopicSelectionV1bN4HarnessFrozenInputPayload;
  const [snapshot, profile, readiness] = await Promise.all([
    ctx.v1bRepository.findIntakeSnapshotById(payload.intake_snapshot_ref.ref_id),
    ctx.v1bRepository.findResearchConstraintProfileById(payload.constraint_profile_ref.ref_id),
    ctx.v1bRepository.findReadinessAssessmentById(payload.intake_readiness_ref.ref_id),
  ]);
  if (!snapshot || !profile || !readiness) {
    throw new Error('N4 runtime fixture requires persisted N1/N2/N3 authorities.');
  }
  return {
    v1b_input_bundle_ref: snapshot.v1b_input_bundle_ref,
    v1b_intake_snapshot_ref: ref(
      'v1b_intake_snapshot',
      snapshot.v1b_intake_snapshot_id,
      snapshot.title_card_id,
      snapshot.snapshot_version,
    ),
    research_constraint_profile_ref: ref(
      'research_constraint_profile',
      profile.research_constraint_profile_id,
      profile.title_card_id,
      profile.profile_version,
    ),
    readiness_assessment_ref: ref(
      'v1b_intake_readiness_assessment',
      readiness.v1b_intake_readiness_assessment_id,
      readiness.title_card_id,
    ),
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

async function generateN4RuntimeDraftArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  draft: TopicSelectionV1bResearchSliceOptionSetDraftPayload,
  options: {
    runMode?: NonNullable<TopicSelectionV1bWorkflowHarnessRunRequest['run_mode']>;
  } = {},
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const runtime = new TopicSelectionV1bN4ResearchSliceRuntimeService(ctx.controlPlane);
  const generated = await runtime.generateDraftArtifact({
    request: input,
    planning_input: await n4RuntimePlanningInput(ctx, input),
    execution_mode: 'codex_assisted',
    run_mode: options.runMode ?? input.run_mode ?? 'acceptance',
    codex_response: {
      output: draft,
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected N4 runtime draft generation to succeed.');
  }
  return generated.semantic_artifact;
}

async function runReadyN3(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>) {
  const n1 = await ctx.service.invokeNode(n1Request(ctx.bundle));
  const acceptedPayload = acceptedConstraintProfilePayload();
  const n2Input = n2Request(ctx.bundle, n1, acceptedPayload);
  const n2 = await invokeN2WithRuntimeSupport(ctx, n2Input, acceptedPayload);
  const n3Input = n3Request(n1, n2);
  const n3 = await ctx.service.invokeNode({
    ...n3Input,
    semantic_artifacts: [
      await generateEarlySemanticSupportArtifact(
        ctx,
        n3Input,
        'n3_readiness_classification',
        n3ReadinessClassificationSupport(n3Input),
      ),
    ],
  });
  return { n1, n2, n3 };
}

async function runReadyN4(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>) {
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const n4 = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, n4Draft())],
  });
  return { n1, n2, n3, n4 };
}

function hashOptionForN5(option: TopicSelectionResearchSliceOptionRecord): string {
  return sha256Text(stableStringify({
    claim_ceiling_alignment: option.claim_ceiling_alignment,
    dependency_risks: option.dependency_risks,
    evaluation_path: option.evaluation_path,
    excluded_boundaries: option.excluded_boundaries,
    expected_claim: option.expected_claim,
    fallback_claim: option.fallback_claim,
    hard_blockers: option.hard_blockers,
    included_boundaries: option.included_boundaries,
    main_risks: option.main_risks,
    option_key: option.option_key,
    option_ref: ref('research_slice_option', option.research_slice_option_id, option.title_card_id),
    option_set_id: option.research_slice_option_set_id,
    problem_space: option.problem_space,
    risk_levels: {
      baseline: option.baseline_risk,
      execution: option.execution_risk,
      scope: option.scope_risk,
    },
    slice_statement: option.slice_statement,
    source_validated_need_refs: option.source_validated_need_refs,
    status: option.status,
    target_community: option.target_community,
    target_setting: option.target_setting,
  }));
}

function acceptedSliceSelectionPayload(
  option: TopicSelectionResearchSliceOptionRecord,
  overrides: Partial<TopicSelectionV1bAcceptedSliceSelectionPayload> = {},
): TopicSelectionV1bAcceptedSliceSelectionPayload {
  return {
    decision: 'select',
    selected_option_ref: ref('research_slice_option', option.research_slice_option_id, option.title_card_id),
    selected_option_hash: hashOptionForN5(option),
    selection_rationale: 'Select the traceable workflow slice with the strongest bounded fit.',
    decision_basis: {
      selected_option_key: option.option_key,
    },
    rejected_option_reasons: [],
    required_actions: [],
    accepted_risk_refs: [],
    confidence: 0.82,
    requires_human_review: false,
    human_review_reason: null,
    loopback_target: null,
    loopback_target_ref: null,
    loopback_reason_code: null,
    ...overrides,
  };
}

async function selectedN4Option(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>, n4: {
  authority_ref: TopicSelectionFunctionalRef | null;
}) {
  if (!n4.authority_ref) {
    throw new Error('N5 fixture requires admitted N4 result.');
  }
  const options = await ctx.researchSliceRepository.listOptionsByOptionSetId(n4.authority_ref.ref_id);
  const selected = options.find((option) => option.status === 'recommended') ?? options[0];
  if (!selected) {
    throw new Error('N5 fixture requires at least one N4 option.');
  }
  return selected;
}

function n5Request(
  n4Result: {
    authority_ref: TopicSelectionFunctionalRef | null;
    hashes: { authority_hash: string | null; handoff_hash: string | null };
  },
  acceptedPayload: TopicSelectionV1bAcceptedSliceSelectionPayload,
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): TopicSelectionV1bWorkflowHarnessRunRequest {
  if (!n4Result.authority_ref || !n4Result.hashes.authority_hash || !n4Result.hashes.handoff_hash) {
    throw new Error('N5 fixture requires admitted N4 result.');
  }
  const acceptedHash = sha256Text(stableStringify(acceptedPayload));
  const authorityInputProvider = overrides.run_mode ? 'codex_delegated' : 'fixture';
  const payload: TopicSelectionV1bN5HarnessFrozenInputPayload = {
    research_slice_option_set_ref: n4Result.authority_ref,
    research_slice_option_set_hash: n4Result.hashes.authority_hash,
    n4_handoff_hash: n4Result.hashes.handoff_hash,
    authority_input_provider: authorityInputProvider,
    accepted_selection_payload: acceptedPayload,
    accepted_selection_payload_hash: acceptedHash,
    delegation_artifact_hash: authorityInputProvider === 'codex_delegated' ? acceptedHash : null,
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n5',
    node_attempt_id: 'node_attempt_v1b_n5',
    node_id: 'topic-selection.v1b.select-research-slice.v1',
    title_card_id: n4Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    frozen_input: {
      input_contract: 'N4ToN5Handoff@v1',
      snapshot_kind: 'research_slice_option_set',
      source_refs: [n4Result.authority_ref],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

async function runReadyN5(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>) {
  const { n1, n2, n3, n4 } = await runReadyN4(ctx);
  const option = await selectedN4Option(ctx, n4);
  const n5 = await ctx.service.invokeNode(n5Request(n4, acceptedSliceSelectionPayload(option)));
  return { n1, n2, n3, n4, n5, option };
}

async function n6Request(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  n5Result: {
    authority_ref: TopicSelectionFunctionalRef | null;
    handoff_ref: TopicSelectionFunctionalRef | null;
    hashes: { handoff_hash: string | null };
  },
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  if (!n5Result.authority_ref || !n5Result.handoff_ref || !n5Result.hashes.handoff_hash) {
    throw new Error('N6 fixture requires admitted N5 result.');
  }
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n5Result.handoff_ref.ref_id);
  const handoff = handoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff | null;
  if (!handoff || handoff.envelope.handoff_kind !== 'N5ToN6Handoff') {
    throw new Error('N6 fixture requires N5ToN6 handoff artifact.');
  }
  const payload: TopicSelectionV1bN6HarnessFrozenInputPayload = {
    ...(handoff.payload as Omit<TopicSelectionV1bN6HarnessFrozenInputPayload, 'n5_handoff_hash'>),
    n5_handoff_hash: n5Result.hashes.handoff_hash,
  };
  const selectionSnapshotRef = ref(
    'research_slice_selection_decision',
    n5Result.authority_ref.ref_id,
    n5Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    n5Result.authority_ref.version_id ?? null,
  );
  return request({
    workflow_run_id: 'workflow_run_v1b_n6',
    node_attempt_id: 'node_attempt_v1b_n6',
    node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
    title_card_id: n5Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    execution_spec: null,
    profile_id: null,
    run_mode: null,
    frozen_input: {
      input_contract: 'N5ToN6Handoff@v1',
      snapshot_kind: 'research_slice_selection_decision',
      source_refs: [selectionSnapshotRef, n5Result.handoff_ref, ...handoff.required_refs],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

async function n6Draft(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  overrides: Partial<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload> = {},
): Promise<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload> {
  const payload = input.frozen_input.payload as unknown as TopicSelectionV1bN6HarnessFrozenInputPayload;
  const evidenceRows = await ctx.researchSliceRepository.listEvidenceRefsByResearchSliceId(payload.research_slice_ref.ref_id);
  const boundaries = await ctx.researchSliceRepository.listBoundariesByResearchSliceId(payload.research_slice_ref.ref_id);
  const evidenceRef = evidenceRows[0]?.evidence_ref ?? ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const includedBoundary = boundaries.find((boundary) => boundary.boundary_kind === 'included') ?? boundaries[0];
  const excludedBoundary = boundaries.find((boundary) => boundary.boundary_kind === 'excluded') ?? boundaries[0];
  const includedBoundaryRef = ref('research_slice_boundary', includedBoundary!.research_slice_boundary_id, TITLE_CARD_ID);
  const excludedBoundaryRef = ref('research_slice_boundary', excludedBoundary!.research_slice_boundary_id, TITLE_CARD_ID);
  const needRef = ref('validated_need', 'validated_need_1', TITLE_CARD_ID);
  return {
    question_frame: {
      target_setting: 'Local-first CS paper engineering assistant workflows.',
      target_community: 'CS paper engineering researchers',
      object_scope: 'v1b harness-native topic selection candidate generation',
      task_scope: 'candidate generation, deterministic gates, and replay drift checks',
      intervention_or_approach: 'WorkflowHarness-native candidate-set gate with frozen semantic artifacts',
      comparison_baseline: 'route-only smoke tests without harness-level product acceptance',
      observable_outcome: 'stable candidate-set refs and replay hashes',
      assumption_refs: [],
      evidence_refs: [evidenceRef],
      frame_payload: {
        fixture: true,
      },
    },
    recommended_candidate_keys: ['harness_candidate'],
    generation_notes: ['Candidate stays inside the selected ResearchSlice and preserves N5 lineage.'],
    human_review_triggers: [],
    candidates: [
      {
        candidate_key: 'harness_candidate',
        main_question: 'How can a WorkflowHarness-native candidate gate improve replayable v1b topic selection?',
        sub_questions: ['Which N5 lineage hashes must remain frozen before N7 admission?'],
        question_type: 'system',
        contribution_hypothesis: 'system',
        source_validated_need_refs: [needRef],
        answerability_plan: {
          datasets_or_resources: ['v1b harness trace fixtures'],
          metrics: ['hash drift detection rate'],
          baselines: ['route-only smoke coverage'],
          ablations_or_comparisons: ['without frozen semantic artifact admission'],
          evaluation_setting: 'local deterministic harness acceptance tests',
          dependency_risks: ['provider canary behavior is not exercised in this fixture'],
          open_dependencies: [],
          known_gaps: [],
          required_evidence_refs: [evidenceRef],
        },
        answerability_verdict: 'answerable',
        expected_claim: 'A harness-native candidate gate improves replayable v1b topic selection.',
        fallback_claim: 'The gate preserves candidate lineage for downstream review.',
        max_claim_strength: 'Bounded workflow claim about candidate lineage and replay.',
        observable_success_criteria: ['N6 emits candidate set refs and hashes.'],
        boundary_check: {
          preserved_boundary_refs: [includedBoundaryRef],
          excluded_boundary_refs: [excludedBoundaryRef],
          boundary_violations: [],
          prohibited_claims: ['promotion decision'],
          allowed_refinements: ['tighten candidate wording'],
        },
        traceability_check: {
          support_evidence_refs: [evidenceRef],
          challenge_evidence_refs: [evidenceRef],
          baseline_evidence_refs: [evidenceRef],
          context_evidence_refs: [evidenceRef],
          mapped_evidence_refs: [evidenceRef],
          unmapped_assumptions: [],
        },
        falsification_conditions: [
          {
            condition_type: 'claim_overstrong',
            severity: 'hard',
            statement: 'If changed frozen N5 lineage hashes are not detected, the candidate claim must be lowered.',
            trigger_evidence_refs: [evidenceRef],
            trigger_source_refs: [payload.research_slice_ref],
            related_contract_fields: ['expected_claim'],
            expected_action: 'lower_claim_strength',
            check_timing: 'before_value_assessment',
            confidence: 'high',
          },
        ],
        risk_notes: [],
        blockers: [],
        objections: [],
        human_review_triggers: [],
        confidence: 0.84,
      },
    ],
    ...overrides,
  };
}

async function recordN6DraftArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  draft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const support = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: draft as unknown as Record<string, unknown>,
    created_by: 'system',
  });
  const normalized = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: draft as unknown as Record<string, unknown>,
    created_by: 'system',
  });
  const provenance = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: {
      adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
      source: 'fixture',
    },
    created_by: 'system',
  });
  const draftHash = sha256Text(stableStringify(draft));
  return semanticArtifact(input, {
    slot_id: 'n6_question_candidate_draft',
    allowed_effect: 'model_draft_for_gate',
    output_contract: 'TopicQuestionCandidateSetDraft@v1',
    execution_mode: 'codex_assisted',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
    support_artifact_ref: ref('artifact_ref', support.artifact_ref_id, TITLE_CARD_ID),
    support_artifact_hash: draftHash,
    normalized_output_ref: ref('artifact_ref', normalized.artifact_ref_id, TITLE_CARD_ID),
    normalized_output_hash: draftHash,
    structured_output_hash: draftHash,
    provenance_ref: ref('artifact_ref', provenance.artifact_ref_id, TITLE_CARD_ID),
  });
}

async function generateN6RuntimeDraftArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  draft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
  generationMode: TopicSelectionV1bN6DraftGenerationMode = 'initial_from_n5',
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const runtime = new TopicSelectionV1bN6DraftRuntimeService(ctx.controlPlane);
  const generated = await runtime.generateDraftArtifact({
    request: input,
    generation_mode: generationMode,
    execution_mode: 'codex_assisted',
    run_mode: input.run_mode ?? 'acceptance',
    codex_response: {
      output: draft,
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected N6 runtime draft generation to succeed.');
  }
  return generated.semantic_artifact;
}

async function runReadyN6(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  draftOverrides: Partial<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload> = {},
) {
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, input, draftOverrides);
  const n6 = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, input, draft)],
  });
  return { n5, n6, draft };
}

async function n7Request(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  n6Result: {
    authority_ref: TopicSelectionFunctionalRef | null;
    handoff_ref: TopicSelectionFunctionalRef | null;
    hashes: { authority_hash: string | null; handoff_hash: string | null };
  },
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  if (!n6Result.authority_ref || !n6Result.handoff_ref || !n6Result.hashes.handoff_hash) {
    throw new Error('N7 fixture requires admitted N6 result.');
  }
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n6Result.handoff_ref.ref_id);
  const handoff = handoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff | null;
  if (!handoff || handoff.envelope.handoff_kind !== 'N6ToN7Handoff') {
    throw new Error('N7 fixture requires N6ToN7 handoff artifact.');
  }
  const payload: TopicSelectionV1bN7HarnessFrozenInputPayload = {
    ...(handoff.payload as Omit<TopicSelectionV1bN7HarnessFrozenInputPayload, 'input_mode' | 'n6_handoff_hash'>),
    input_mode: 'initial_from_n6',
    n6_handoff_hash: n6Result.hashes.handoff_hash,
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n7',
    node_attempt_id: 'node_attempt_v1b_n7',
    node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
    title_card_id: n6Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    run_mode: null,
    profile_id: null,
    execution_spec: null,
    frozen_input: {
      input_contract: 'N6ToN7Handoff@v1',
      snapshot_kind: 'topic_question_candidate_set',
      source_refs: [n6Result.authority_ref, n6Result.handoff_ref, ...handoff.required_refs],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

async function recordN7SupportArtifact<T extends Record<string, unknown>>(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  slot: {
    slot_id: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['slot_id'];
    allowed_effect: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['allowed_effect'];
    output_contract: string;
    profile_id: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['profile_id'];
  },
  payload: T,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const support = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload,
    created_by: 'system',
  });
  const normalized = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload,
    created_by: 'system',
  });
  const provenance = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: {
      adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
      source: 'fixture',
    },
    created_by: 'system',
  });
  const payloadHash = sha256Text(stableStringify(payload));
  return semanticArtifact(input, {
    slot_id: slot.slot_id,
    allowed_effect: slot.allowed_effect,
    output_contract: slot.output_contract,
    execution_mode: 'codex_assisted',
    profile_id: slot.profile_id,
    support_artifact_ref: ref('artifact_ref', support.artifact_ref_id, TITLE_CARD_ID),
    support_artifact_hash: payloadHash,
    normalized_output_ref: ref('artifact_ref', normalized.artifact_ref_id, TITLE_CARD_ID),
    normalized_output_hash: payloadHash,
    structured_output_hash: payloadHash,
    provenance_ref: ref('artifact_ref', provenance.artifact_ref_id, TITLE_CARD_ID),
  });
}

async function recordN6LoopbackTriageArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  payload: TopicSelectionV1bN6LoopbackTriageSupportPayload,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  return recordN7SupportArtifact(ctx, input, {
    slot_id: 'n6_loopback_triage',
    allowed_effect: 'support_only',
    output_contract: 'N6LoopbackTriageSupport@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n6_loopback_triage_support,
  }, payload as unknown as Record<string, unknown>);
}

async function generateN6RuntimeLoopbackTriageArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  failedDraftArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  failedDraftHash: string,
  payload: TopicSelectionV1bN6LoopbackTriageSupportPayload,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const runtime = new TopicSelectionV1bN6LoopbackTriageRuntimeService(ctx.controlPlane);
  const generated = await runtime.generateSupportArtifact({
    request: input,
    failed_draft_artifact: failedDraftArtifact,
    failed_draft_hash: failedDraftHash,
    execution_mode: 'codex_assisted',
    run_mode: input.run_mode ?? 'acceptance',
    codex_response: {
      output: payload,
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected N6 loopback triage runtime support generation to succeed.');
  }
  return generated.semantic_artifact;
}

function n6LoopbackTriagePayload(
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  overrides: Partial<TopicSelectionV1bN6LoopbackTriageSupportPayload> = {},
): TopicSelectionV1bN6LoopbackTriageSupportPayload {
  const payload = input.frozen_input.payload as unknown as TopicSelectionV1bN6HarnessFrozenInputPayload;
  return {
    loopback_target_code: 'n6_regenerate_candidates',
    failure_scope: 'candidate_level',
    dominant_reason_codes: ['not_answerable'],
    affected_refs: [payload.research_slice_ref],
    regeneration_hints: ['Regenerate a bounded candidate that stays inside the selected ResearchSlice.'],
    debate_escalation: null,
    upstream_rollback: null,
    rationale: 'All generated candidates failed N6 deterministic semantic admission.',
    ...overrides,
  };
}

async function invokeN6WithFailedDraftAndTriage(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  triagePayload: TopicSelectionV1bN6LoopbackTriageSupportPayload,
) {
  const draft = await n6Draft(ctx, input);
  return ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, input, {
        ...draft,
        candidates: [
          {
            ...draft.candidates[0]!,
            answerability_verdict: 'not_answerable',
            main_question: 'How can AI improve research?',
          },
        ],
      }),
      await recordN6LoopbackTriageArtifact(ctx, input, triagePayload),
    ],
  });
}

function n7GroupingPayload(input: TopicSelectionV1bWorkflowHarnessRunRequest): TopicSelectionV1bCandidateGroupingSupportPayload {
  const payload = input.frozen_input.payload as unknown as TopicSelectionV1bN7HarnessFrozenInputPayload;
  return {
    selected_candidate_ref: payload.admissible_candidate_refs[1] ?? payload.admissible_candidate_refs[0]!,
    selected_candidate_hash: payload.admissible_candidate_hashes[1] ?? payload.admissible_candidate_hashes[0]!,
    priority_order: payload.admissible_candidate_refs.length > 1
      ? [payload.admissible_candidate_refs[1]!, payload.admissible_candidate_refs[0]!]
      : [payload.admissible_candidate_refs[0]!],
    duplicate_or_overlap_groups: [],
    candidate_relationships: {
      ordered_by: 'codex_fixture',
    },
    grouping_summary: 'Codex support prioritizes the higher-value non-overlapping candidate.',
  };
}

function n7DebateAdmissionPayload(
  overrides: Partial<TopicSelectionV1bN8DebateAdmissionReviewSupportPayload> = {},
): TopicSelectionV1bN8DebateAdmissionReviewSupportPayload {
  return {
    debate_level: 'compact_assessment_debate',
    recommended_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    high_value_signal_codes: ['bounded_replay_claim'],
    risk_signal_codes: [],
    rationale: 'The candidate is bounded enough for compact assessment debate.',
    ...overrides,
  };
}

async function generateN7RuntimeSupportArtifact<T extends TopicSelectionV1bN7RuntimeSupportPayload>(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  slotId: TopicSelectionV1bN7SupportSlotId,
  output: T,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const runtime = new TopicSelectionV1bN7SupportRuntimeService(ctx.controlPlane);
  const generated = await runtime.generateSupportArtifact({
    request: input,
    slot_id: slotId,
    execution_mode: 'codex_assisted',
    run_mode: input.run_mode ?? 'acceptance',
    codex_response: {
      output,
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected N7 runtime support generation to succeed.');
  }
  return generated.semantic_artifact;
}

async function recordN8FeedbackArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  feedback: TopicSelectionV1bN8ToN7FeedbackPayload,
): Promise<{
  artifact_ref: TopicSelectionFunctionalRef;
  artifact_hash: string;
  payload_hash: string;
}> {
  const artifact = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: feedback as unknown as Record<string, unknown>,
    created_by: 'system',
  });
  return {
    artifact_ref: ref('artifact_ref', artifact.artifact_ref_id, TITLE_CARD_ID),
    artifact_hash: sha256Text(stableStringify(artifact)),
    payload_hash: sha256Text(stableStringify(feedback)),
  };
}

async function n7FeedbackRequest(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  initialInput: TopicSelectionV1bWorkflowHarnessRunRequest,
  n7Result: {
    authority_ref: TopicSelectionFunctionalRef | null;
    handoff_ref: TopicSelectionFunctionalRef | null;
    hashes: { authority_hash: string | null; handoff_hash: string | null };
  },
  feedbackClass: TopicSelectionV1bN8ToN7FeedbackPayload['feedback_class'] = 'semantic_candidate_failure',
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  if (!n7Result.authority_ref || !n7Result.handoff_ref || !n7Result.hashes.handoff_hash || !n7Result.hashes.authority_hash) {
    throw new Error('N7 feedback fixture requires admitted N7 result.');
  }
  const n7HandoffArtifact = await ctx.controlPlane.getArtifactRef(n7Result.handoff_ref.ref_id);
  const n7Handoff = n7HandoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
  const n7HandoffPayload = n7Handoff.payload as {
    active_candidate_ref: TopicSelectionFunctionalRef;
    active_candidate_hash: string;
    topic_question_candidate_set_ref: TopicSelectionFunctionalRef;
    topic_question_candidate_set_hash: string;
    trial_ledger_ref: TopicSelectionFunctionalRef;
    trial_ledger_hash: string;
  };
  const initialPayload = initialInput.frozen_input.payload as unknown as TopicSelectionV1bN7HarnessFrozenInputPayload;
  const feedback: TopicSelectionV1bN8ToN7FeedbackPayload = {
    feedback_class: feedbackClass,
    failure_reason_code: feedbackClass === 'gate_rejected' ? 'debate_admission_too_weak' : 'value_not_supported',
    feedback_summary: 'Fixture N8 feedback rejected the active candidate trial.',
    affected_refs: [n7HandoffPayload.active_candidate_ref],
    previous_n7_handoff_ref: n7Result.handoff_ref,
    previous_n7_handoff_hash: n7Result.hashes.handoff_hash,
    previous_trial_ledger_ref: n7HandoffPayload.trial_ledger_ref,
    previous_trial_ledger_hash: n7HandoffPayload.trial_ledger_hash,
    failed_topic_question_contract_ref: n7Result.authority_ref,
    failed_topic_question_contract_hash: n7Result.hashes.authority_hash,
    failed_candidate_ref: n7HandoffPayload.active_candidate_ref,
    failed_candidate_hash: n7HandoffPayload.active_candidate_hash,
    topic_question_candidate_set_ref: n7HandoffPayload.topic_question_candidate_set_ref,
    topic_question_candidate_set_hash: n7HandoffPayload.topic_question_candidate_set_hash,
    n8_gate_result_hash: 'f'.repeat(64),
    value_assessment_ref: null,
    value_assessment_hash: null,
  };
  const feedbackArtifact = await recordN8FeedbackArtifact(ctx, initialInput, feedback);
  const payload: TopicSelectionV1bN7HarnessFrozenInputPayload = {
    ...initialPayload,
    input_mode: 'feedback_from_n8',
    n8_feedback_ref: feedbackArtifact.artifact_ref,
    n8_feedback_hash: feedbackArtifact.artifact_hash,
    n8_feedback_payload_hash: feedbackArtifact.payload_hash,
  };
  return request({
    workflow_run_id: `workflow_run_v1b_n7_feedback_${n7Result.authority_ref.ref_id}`,
    node_attempt_id: `node_attempt_v1b_n7_feedback_${n7Result.authority_ref.ref_id}`,
    node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
    title_card_id: TITLE_CARD_ID,
    run_mode: null,
    profile_id: null,
    execution_spec: null,
    frozen_input: {
      input_contract: 'N8ToN7Feedback@v1',
      snapshot_kind: 'topic_question_candidate_set',
      source_refs: [
        n7HandoffPayload.topic_question_candidate_set_ref,
        feedbackArtifact.artifact_ref,
        initialInput.frozen_input.source_refs.find((sourceRef) => sourceRef.ref_type === 'artifact_ref')!,
        n7Result.handoff_ref,
      ],
      payload: payload as unknown as Record<string, unknown>,
    },
  });
}

async function runReadyN7(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>) {
  const { n6 } = await runReadyN6(ctx);
  const input = await n7Request(ctx, n6);
  const n7 = await ctx.service.invokeNode(input);
  return { n6, n7 };
}

async function runN7ExhaustionLoopbackFixture(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  suffix: string,
) {
  const { n5 } = await runReadyN5(ctx);
  const n6Input = await n6Request(ctx, n5, {
    workflow_run_id: `workflow_run_v1b_n6_${suffix}`,
    node_attempt_id: `node_attempt_v1b_n6_${suffix}`,
  });
  const draft = await n6Draft(ctx, n6Input);
  const second = {
    ...draft.candidates[0]!,
    candidate_key: `second_${suffix}_candidate`,
    main_question: 'How can a second candidate preserve N7 exhaustion context for N6 regeneration?',
    expected_claim: 'The second candidate lets N7 exhaust trials before N6 regenerates.',
  };
  const n6 = await ctx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, n6Input, {
        ...draft,
        recommended_candidate_keys: ['harness_candidate', second.candidate_key],
        candidates: [draft.candidates[0]!, second],
      }),
    ],
  });
  const initialInput = await n7Request(ctx, n6, {
    workflow_run_id: `workflow_run_v1b_n7_${suffix}_first`,
    node_attempt_id: `node_attempt_v1b_n7_${suffix}_first`,
  });
  const first = await ctx.service.invokeNode(initialInput);
  const secondTrial = await ctx.service.invokeNode(await n7FeedbackRequest(ctx, initialInput, first));
  const exhaustedInput = await n7FeedbackRequest(ctx, initialInput, secondTrial);
  const exhaustedCandidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(n6.authority_ref!.ref_id);
  const synthesis: TopicSelectionV1bN8FailedTrialSynthesisSupportPayload = {
    exhausted_candidate_refs: exhaustedCandidates.map((candidate) =>
      ref('topic_question_candidate', candidate.topic_question_candidate_id, TITLE_CARD_ID)),
    failure_reason_codes: ['value_not_supported'],
    synthesis_summary: 'All current candidate trials failed value support and require N6 regeneration.',
    n6_regeneration_hints: ['Regenerate with a narrower value-support claim and stronger evidence linkage.'],
    affected_refs: [n6.authority_ref!],
  };
  const exhausted = await ctx.service.invokeNode({
    ...exhaustedInput,
    semantic_artifacts: [
      await generateN7RuntimeSupportArtifact(
        ctx,
        exhaustedInput,
        'n7_failed_trial_synthesis',
        synthesis,
      ),
    ],
  });
  assert.equal(exhausted.gate_status, 'blocked');
  assert.equal(exhausted.route_decision, 'loopback');
  assert.equal(exhausted.error_code, 'N7_CANDIDATE_TRIALS_EXHAUSTED');
  const projectionRef = await n7LoopbackProjectionRef(ctx, exhausted);
  const projectionArtifact = await ctx.controlPlane.getArtifactRef(projectionRef.ref_id);
  assert.ok(projectionArtifact);
  return {
    n5,
    n6,
    exhausted,
    projectionRef,
    projectionArtifact,
    projection: projectionArtifact.payload as unknown as TopicSelectionV1bN7ToN6FailedTrialLoopbackContextProjection,
  };
}

async function n8Request(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  n7Result: {
    authority_ref: TopicSelectionFunctionalRef | null;
    handoff_ref: TopicSelectionFunctionalRef | null;
    trace_snapshot_ref?: TopicSelectionFunctionalRef | null;
    hashes: { authority_hash: string | null; handoff_hash: string | null };
  },
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
  options: { confirmQuestionCheckpoint?: boolean } = {},
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  if (!n7Result.authority_ref || !n7Result.handoff_ref || !n7Result.hashes.handoff_hash) {
    throw new Error('N8 fixture requires admitted N7 result.');
  }
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n7Result.handoff_ref.ref_id);
  const handoff = handoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff | null;
  if (!handoff || handoff.envelope.handoff_kind !== 'N7ToN8Handoff') {
    throw new Error('N8 fixture requires N7ToN8 handoff artifact.');
  }
  const payload: TopicSelectionV1bN8HarnessFrozenInputPayload = {
    ...(handoff.payload as Omit<TopicSelectionV1bN8HarnessFrozenInputPayload, 'n7_handoff_hash'>),
    n7_handoff_hash: n7Result.hashes.handoff_hash,
  };
  if (options.confirmQuestionCheckpoint !== false) {
    await confirmQuestionCheckpoint(ctx, n7Result.authority_ref.title_card_id ?? TITLE_CARD_ID);
  }
  const projectionRef = await n7ToN8ProjectionRef(ctx, n7Result);
  return request({
    workflow_run_id: 'workflow_run_v1b_n8',
    node_attempt_id: 'node_attempt_v1b_n8',
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
    title_card_id: n7Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    execution_spec: null,
    profile_id: null,
    run_mode: null,
    frozen_input: {
      input_contract: 'N7ToN8Handoff@v1',
      snapshot_kind: 'topic_question_contract',
      source_refs: uniqueRefs([n7Result.authority_ref, n7Result.handoff_ref, projectionRef, ...handoff.required_refs]),
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

async function confirmQuestionCheckpoint(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  titleCardId = TITLE_CARD_ID,
): Promise<void> {
  const checkpoint = await ctx.researchCheckpointRepository.findCurrentCheckpoint(titleCardId, 'question_contract');
  if (!checkpoint) throw new Error('N8 fixture requires the N7 question checkpoint.');
  if (checkpoint.status === 'decided') return;
  await ctx.researchCheckpointService.recordDecision(checkpoint.research_checkpoint_id, {
    decision_key: `question_confirmation_${checkpoint.research_checkpoint_id}`,
    decision: 'advance',
    actor: { actor_type: 'human', actor_id: 'unit_test_researcher' },
    confirmed_snapshot_hash: checkpoint.target_snapshot_hash,
    rationale: 'The researcher confirms the identifiable, operationalized, falsifiable, and bounded design.',
    review_payload: {
      review_kind: 'question_contract',
      mechanism_identifiable: true,
      proxy_operationalized: true,
      confounds_reviewed: true,
      falsification_reviewed: true,
      claim_ceiling_reviewed: true,
      objections_reviewed: true,
      review_notes: ['Qualified fixture confirmation for the exact N7 contract snapshot.'],
    },
  });
}

async function n7ToN8ProjectionRef(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  n7Result: { trace_snapshot_ref?: TopicSelectionFunctionalRef | null },
): Promise<TopicSelectionFunctionalRef> {
  if (!n7Result.trace_snapshot_ref) {
    throw new Error('N8 fixture requires the N7 trace snapshot with runtime context projection.');
  }
  const trace = await ctx.controlPlane.getTraceSnapshot(n7Result.trace_snapshot_ref.ref_id);
  const projectionRef = trace?.payload.runtime_context_projection_ref as TopicSelectionFunctionalRef | null | undefined;
  if (!projectionRef || projectionRef.ref_type !== 'artifact_ref') {
    throw new Error('N8 fixture requires the N7-to-N8 runtime context projection artifact.');
  }
  return projectionRef;
}

function n8ValueDraft(
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  overrides: Partial<TopicSelectionV1bTopicValueAssessmentDraftPayload> = {},
): TopicSelectionV1bTopicValueAssessmentDraftPayload {
  const payload = input.frozen_input.payload as unknown as TopicSelectionV1bN8HarnessFrozenInputPayload;
  const evidenceRef = payload.topic_question_contract_ref;
  const hardGates = TOPIC_SELECTION_VALUE_GATE_KEYS.map((gateKey) => ({
    gate_key: gateKey,
    verdict: 'pass' as const,
    severity: 'info' as const,
    overridable_with_risk: false,
    rationale: `${gateKey} passes in the deterministic value fixture.`,
    refs: [evidenceRef],
  }));
  const dimensionScores = TOPIC_SELECTION_VALUE_DIMENSIONS.map((dimensionKey) => ({
    dimension_key: dimensionKey,
    score: dimensionKey === 'reviewer_risk' ? 72 : 84,
    rationale: `${dimensionKey} is sufficiently supported for the fixture.`,
    evidence_refs: [evidenceRef],
    uncertainty: 'medium',
  }));
  return {
    readiness_status: 'ready',
    strongest_claim_if_success: 'A harness-native topic-selection flow preserves replayable authority boundaries.',
    fallback_claim_if_success: 'Harness-level acceptance exposes route-only smoke gaps.',
    hard_gates: hardGates,
    dimension_scores: dimensionScores,
    risk_penalty: {
      residual_risk: 'bounded',
    },
    reviewer_objections: ['Provider canary behavior is outside this fixture run.'],
    ceiling_case: 'The topic can support a bounded workflow claim with deterministic trace evidence.',
    base_case: 'The topic supports harness-native acceptance and replay validation.',
    floor_case: 'The topic still yields useful negative gate coverage.',
    recommended_disposition: 'advance_to_package',
    total_score: 83,
    value_summary: 'The active TopicQuestionContract has enough value and answerability for draft packaging.',
    confidence: 0.82,
    accepted_risk_refs: [],
    blocker_refs: [],
    risk_notes: ['Provider canary and output quality review remain downstream checks.'],
    reasoning_memo: {
      recommendation: 'advance_to_package',
      value_thesis: 'Harness-native v1b topic selection is valuable because it closes automation, replay, and authority boundaries.',
      significance: 'It turns route-testable workflow fragments into a product-level repeatable process.',
      originality: 'The contribution is a deterministic gate and handoff workflow around LLM-assisted semantic drafts.',
      claim_leverage: 'The claim remains bounded to workflow robustness and replay evidence.',
      reviewer_risks: ['The implementation needs downstream provider canary validation.'],
      effort_to_value: 'The fixture chain gives high value for moderate implementation effort.',
      strategic_fit: 'It aligns with reviewer-aligned paper engineering workflows.',
      negative_memory_check: 'No prior negative memory blocks this topic.',
      evidence_backed_rationale: 'The N7 contract and candidate lineage provide frozen trace evidence.',
      top_objections: ['The fixture does not prove live provider quality.'],
      uncertainty: 'Medium uncertainty until provider canary is added.',
      disposition_bridge: 'Advance to package with residual risks carried into v1c.',
      requires_critic_review: false,
      critic_triggers: [],
      cited_refs: [evidenceRef],
    },
    ...overrides,
  };
}

async function recordN8ValueDraftArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  draft: TopicSelectionV1bTopicValueAssessmentDraftPayload,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const support = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: draft as unknown as Record<string, unknown>,
    created_by: 'system',
  });
  const normalized = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: draft as unknown as Record<string, unknown>,
    created_by: 'system',
  });
  const provenance = await ctx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: input.workflow_run_id,
    payload: {
      adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
      source: 'fixture',
    },
    created_by: 'system',
  });
  const draftHash = sha256Text(stableStringify(draft));
  return semanticArtifact(input, {
    slot_id: 'n8_value_assessment_draft',
    allowed_effect: 'model_draft_for_gate',
    output_contract: 'TopicValueAssessmentDraft@v1',
    execution_mode: 'codex_assisted',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    support_artifact_ref: ref('artifact_ref', support.artifact_ref_id, TITLE_CARD_ID),
    support_artifact_hash: draftHash,
    normalized_output_ref: ref('artifact_ref', normalized.artifact_ref_id, TITLE_CARD_ID),
    normalized_output_hash: draftHash,
    structured_output_hash: draftHash,
    provenance_ref: ref('artifact_ref', provenance.artifact_ref_id, TITLE_CARD_ID),
  });
}

async function generateN8RuntimeValueDraftArtifact(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  draft: TopicSelectionV1bTopicValueAssessmentDraftPayload,
  options: {
    runMode?: NonNullable<TopicSelectionV1bWorkflowHarnessRunRequest['run_mode']>;
  } = {},
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const runtime = new TopicSelectionV1bN8ValueAssessmentRuntimeService(ctx.controlPlane);
  const runMode = options.runMode ?? input.run_mode ?? 'acceptance';
  const generated = await runtime.generateDraftArtifact({
    request: input,
    execution_mode: 'codex_assisted',
    run_mode: runMode,
    codex_response: {
      output: draft,
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected N8 runtime value draft generation to succeed.');
  }
  return generated.semantic_artifact;
}

async function runReadyN8(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  draftOverrides: Partial<TopicSelectionV1bTopicValueAssessmentDraftPayload> = {},
) {
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7);
  const draft = n8ValueDraft(input, draftOverrides);
  const n8 = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, input, draft)],
  });
  return { n7, n8, draft };
}

function hashValueMemoForHarness(memo: {
  cited_refs: TopicSelectionFunctionalRef[];
  recommendation: string;
  requires_critic_review: boolean;
  topic_question_contract_id: string;
  topic_value_assessment_id: string;
  value_reasoning_memo_id: string;
  value_thesis: string;
}): string {
  return sha256Text(stableStringify({
    cited_refs: memo.cited_refs,
    recommendation: memo.recommendation,
    requires_critic_review: memo.requires_critic_review,
    topic_question_contract_id: memo.topic_question_contract_id,
    topic_value_assessment_id: memo.topic_value_assessment_id,
    value_reasoning_memo_id: memo.value_reasoning_memo_id,
    value_thesis: memo.value_thesis,
  }));
}

async function n9Request(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  n8Result: {
    authority_ref: TopicSelectionFunctionalRef | null;
    handoff_ref: TopicSelectionFunctionalRef | null;
    hashes: { authority_hash: string | null; handoff_hash: string | null };
  },
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  if (!n8Result.authority_ref || !n8Result.handoff_ref || !n8Result.hashes.authority_hash || !n8Result.hashes.handoff_hash) {
    throw new Error('N9 fixture requires admitted N8 result.');
  }
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n8Result.handoff_ref.ref_id);
  const handoff = handoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff | null;
  if (!handoff || handoff.envelope.handoff_kind !== 'N8ToN9Handoff') {
    throw new Error('N9 fixture requires N8ToN9 handoff artifact.');
  }
  const assessment = await ctx.valueAssessmentRepository.findAssessmentById(n8Result.authority_ref.ref_id);
  if (!assessment) {
    throw new Error('N9 fixture requires persisted assessment.');
  }
  const memo = await ctx.valueAssessmentRepository.findReasoningMemoById(assessment.value_reasoning_memo_id);
  if (!memo) {
    throw new Error('N9 fixture requires persisted value memo.');
  }
  const payload: TopicSelectionV1bN9HarnessFrozenInputPayload = {
    ...(handoff.payload as Omit<TopicSelectionV1bN9HarnessFrozenInputPayload, 'n8_handoff_hash' | 'value_reasoning_memo_ref' | 'value_reasoning_memo_hash' | 'recommended_disposition'>),
    n8_handoff_hash: n8Result.hashes.handoff_hash,
    value_reasoning_memo_ref: ref('value_reasoning_memo', memo.value_reasoning_memo_id, memo.title_card_id),
    value_reasoning_memo_hash: hashValueMemoForHarness(memo),
    recommended_disposition: memo.recommendation,
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n9',
    node_attempt_id: 'node_attempt_v1b_n9',
    node_id: 'topic-selection.v1b.decide-value-disposition.v1',
    title_card_id: n8Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    frozen_input: {
      input_contract: 'N8ToN9Handoff@v1',
      snapshot_kind: 'topic_value_assessment',
      source_refs: [n8Result.authority_ref, payload.value_reasoning_memo_ref, n8Result.handoff_ref, ...handoff.required_refs],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

async function runReadyN9(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>) {
  const { n8 } = await runReadyN8(ctx);
  const input = await n9Request(ctx, n8);
  const n9 = await ctx.service.invokeNode(input);
  return { n8, n9 };
}

async function n10Request(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  n9Result: {
    authority_ref: TopicSelectionFunctionalRef | null;
    handoff_ref: TopicSelectionFunctionalRef | null;
    hashes: { handoff_hash: string | null };
  },
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  if (!n9Result.authority_ref || !n9Result.handoff_ref || !n9Result.hashes.handoff_hash) {
    throw new Error('N10 fixture requires admitted N9 result.');
  }
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n9Result.handoff_ref.ref_id);
  const handoff = handoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff | null;
  if (!handoff || handoff.envelope.handoff_kind !== 'N9ToN10Handoff') {
    throw new Error('N10 fixture requires N9ToN10 handoff artifact.');
  }
  const payload: TopicSelectionV1bN10HarnessFrozenInputPayload = {
    ...(handoff.payload as Omit<TopicSelectionV1bN10HarnessFrozenInputPayload, 'n9_handoff_hash'>),
    n9_handoff_hash: n9Result.hashes.handoff_hash,
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n10',
    node_attempt_id: 'node_attempt_v1b_n10',
    node_id: 'topic-selection.v1b.create-draft-topic-package.v1',
    title_card_id: n9Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    frozen_input: {
      input_contract: 'N9ToN10Handoff@v1',
      snapshot_kind: 'value_disposition_decision',
      source_refs: [n9Result.authority_ref, n9Result.handoff_ref, ...handoff.required_refs],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

async function runReadyN10(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>) {
  const { n9 } = await runReadyN9(ctx);
  const input = await n10Request(ctx, n9);
  const n10 = await ctx.service.invokeNode(input);
  return { n9, n10 };
}

function hashPackageForHarness(pkg: {
  package_payload: Record<string, unknown>;
  package_readiness_status: string;
  package_version: string;
  research_slice_id: string;
  selected_evidence_refs: TopicSelectionFunctionalRef[];
  title_candidates: string[];
  topic_package_id: string;
  topic_question_contract_id: string;
  topic_value_assessment_id: string;
  value_disposition_decision_id: string;
  v1c_input_bundle_id?: string | null;
}): string {
  return sha256Text(stableStringify({
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
  }));
}

function hashV1cBundleForHarness(bundle: {
  bundle_hash: string;
  bundle_status: string;
  package_readiness_status: string;
  package_version: string;
  topic_package_id: string;
  v1b_to_v1c_input_bundle_id: string;
}): string {
  return sha256Text(stableStringify({
    bundle_hash: bundle.bundle_hash,
    bundle_status: bundle.bundle_status,
    package_readiness_status: bundle.package_readiness_status,
    package_version: bundle.package_version,
    topic_package_id: bundle.topic_package_id,
    v1b_to_v1c_input_bundle_id: bundle.v1b_to_v1c_input_bundle_id,
  }));
}

async function n11Request(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  n10Result: {
    authority_ref: TopicSelectionFunctionalRef | null;
    handoff_ref: TopicSelectionFunctionalRef | null;
    hashes: { authority_hash: string | null; handoff_hash: string | null };
  },
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  if (!n10Result.authority_ref || !n10Result.handoff_ref || !n10Result.hashes.authority_hash || !n10Result.hashes.handoff_hash) {
    throw new Error('N11 fixture requires admitted N10 result.');
  }
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n10Result.handoff_ref.ref_id);
  const handoff = handoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff | null;
  if (!handoff || handoff.envelope.handoff_kind !== 'N10ToN11Handoff') {
    throw new Error('N11 fixture requires N10ToN11 handoff artifact.');
  }
  const pkg = await ctx.topicPackageRepository.findPackageById(n10Result.authority_ref.ref_id);
  if (!pkg) {
    throw new Error('N11 fixture requires persisted draft package.');
  }
  const bundle = await ctx.topicPackageRepository.findV1cInputBundleByPackageId(pkg.topic_package_id);
  if (!bundle) {
    throw new Error('N11 fixture requires persisted v1c input bundle.');
  }
  const payload: TopicSelectionV1bN11HarnessFrozenInputPayload = {
    ...(handoff.payload as Omit<TopicSelectionV1bN11HarnessFrozenInputPayload, 'n10_handoff_hash' | 'v1c_input_bundle_ref' | 'v1c_input_bundle_hash'>),
    n10_handoff_hash: n10Result.hashes.handoff_hash,
    v1c_input_bundle_ref: ref('v1b_to_v1c_input_bundle', bundle.v1b_to_v1c_input_bundle_id, bundle.title_card_id),
    v1c_input_bundle_hash: hashV1cBundleForHarness(bundle),
  };
  return request({
    workflow_run_id: 'workflow_run_v1b_n11',
    node_attempt_id: 'node_attempt_v1b_n11',
    node_id: 'topic-selection.v1b.publish-v1c-input-bundle.v1',
    title_card_id: n10Result.authority_ref.title_card_id ?? TITLE_CARD_ID,
    frozen_input: {
      input_contract: 'N10ToN11Handoff@v1',
      snapshot_kind: 'topic_package',
      source_refs: [n10Result.authority_ref, payload.v1c_input_bundle_ref, n10Result.handoff_ref, ...handoff.required_refs],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  });
}

async function runReadyN11(ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>) {
  const { n10 } = await runReadyN10(ctx);
  const input = await n11Request(ctx, n10);
  const n11 = await ctx.service.invokeNode(input);
  return { n10, n11 };
}

async function runTerminalPackageFromN8(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  n8Result: TopicSelectionV1bWorkflowHarnessRunResult,
  suffix: string,
) {
  const n9 = await ctx.service.invokeNode(await n9Request(ctx, n8Result, {
    workflow_run_id: `workflow_run_v1b_n9_${suffix}`,
    node_attempt_id: `node_attempt_v1b_n9_${suffix}`,
  }));
  assert.equal(n9.gate_status, 'admitted_with_warnings');
  assert.equal(n9.route_decision, 'invoke_next');

  const n10 = await ctx.service.invokeNode(await n10Request(ctx, n9, {
    workflow_run_id: `workflow_run_v1b_n10_${suffix}`,
    node_attempt_id: `node_attempt_v1b_n10_${suffix}`,
  }));
  assert.equal(n10.gate_status, 'admitted_with_warnings');
  assert.equal(n10.route_decision, 'invoke_next');

  const n11 = await ctx.service.invokeNode(await n11Request(ctx, n10, {
    workflow_run_id: `workflow_run_v1b_n11_${suffix}`,
    node_attempt_id: `node_attempt_v1b_n11_${suffix}`,
  }));
  assert.equal(n11.gate_status, 'admitted_with_warnings');
  assert.equal(n11.route_decision, 'stop_v1b_complete');
  assert.equal(n11.authority_ref?.ref_type, 'v1b_to_v1c_input_bundle');
  return { n9, n10, n11 };
}

async function assertTraceLoopbackTargetCode(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  result: TopicSelectionV1bWorkflowHarnessRunResult,
  expected: string,
  expectedTargetNodeId?: TopicSelectionV1bWorkflowHarnessNodeId,
) {
  assert.ok(result.trace_snapshot_ref);
  const trace = await ctx.controlPlane.getTraceSnapshot(result.trace_snapshot_ref.ref_id);
  assert.ok(trace);
  assert.equal(trace.payload.loopback_target_code, expected);
  if (expectedTargetNodeId) {
    assert.equal(trace.payload.route_target_node_id, expectedTargetNodeId);
  }
  assert.equal(trace.payload.loopback_target, undefined);
  const policy = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES.find((item) => item.node_id === result.node_id);
  assert.ok((policy?.loopback_target_codes as readonly string[] | undefined)?.includes(expected));
  return trace;
}

async function n7LoopbackProjectionRef(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  result: TopicSelectionV1bWorkflowHarnessRunResult,
): Promise<TopicSelectionFunctionalRef> {
  const trace = await assertTraceLoopbackTargetCode(ctx, result, 'n7_loopback_to_n6');
  const projectionRef = trace.payload.runtime_context_projection_ref as TopicSelectionFunctionalRef | null;
  assert.equal(projectionRef?.ref_type, 'artifact_ref');
  return projectionRef!;
}

async function n6GateFailureRetryProjectionRef(
  ctx: Awaited<ReturnType<typeof seedHarnessV1aBundle>>,
  result: TopicSelectionV1bWorkflowHarnessRunResult,
): Promise<TopicSelectionFunctionalRef> {
  const trace = await assertTraceLoopbackTargetCode(ctx, result, 'n6_regenerate_candidates');
  const projectionRef = trace.payload.runtime_context_projection_ref as TopicSelectionFunctionalRef | null;
  assert.equal(projectionRef?.ref_type, 'artifact_ref');
  return projectionRef!;
}

function n6InputWithN7LoopbackProjection(
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  projectionRef: TopicSelectionFunctionalRef,
): TopicSelectionV1bWorkflowHarnessRunRequest {
  const frozenInput = {
    ...input.frozen_input,
    source_refs: [...input.frozen_input.source_refs, projectionRef],
  };
  return {
    ...input,
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
  };
}

function n6InputWithN6GateFailureProjection(
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  projectionRef: TopicSelectionFunctionalRef,
): TopicSelectionV1bWorkflowHarnessRunRequest {
  const frozenInput = {
    ...input.frozen_input,
    source_refs: [...input.frozen_input.source_refs, projectionRef],
  };
  return {
    ...input,
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
  };
}

async function assertNoTraceArtifactForAttempt(
  ctx: ReturnType<typeof makeContext>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
): Promise<void> {
  const failedAttemptArtifacts = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
  const failedTraceArtifacts = failedAttemptArtifacts.filter((artifact) =>
    artifact.artifact_kind === 'trace'
    && (artifact.payload as { node_id?: string } | null)?.node_id === input.node_id
  );
  assert.equal(failedTraceArtifacts.length, 0);
}

async function assertNoRuntimeContextProjectionForAttempt(
  ctx: ReturnType<typeof makeContext>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
): Promise<void> {
  const artifacts = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
  const projections = artifacts.filter((artifact) =>
    artifact.artifact_kind === 'diagnostic'
    && (artifact.payload as { schema_version?: string } | null)?.schema_version
      === TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION
    && (artifact.payload as { node_attempt_id?: string } | null)?.node_attempt_id === input.node_attempt_id);
  assert.equal(projections.length, 0);
}

async function assertAuthorityWriteFailureCanRetry(
  ctx: ReturnType<typeof makeContext>,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  expectedError: RegExp,
  assertNoAuthority: () => Promise<void>,
): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
  await assert.rejects(
    () => ctx.service.invokeNode(input),
    expectedError,
  );
  await assertNoTraceArtifactForAttempt(ctx, input);
  await assertNoAuthority();

  const result = await ctx.service.invokeNode(input);
  assert.notEqual(result.gate_status, 'blocked');
  assert.equal(result.replay_provenance, null);
  assert.ok(result.authority_ref);

  const replay = await ctx.service.invokeNode(input);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.authority_ref?.ref_id, result.authority_ref?.ref_id);
  return result;
}

async function seedHarnessV1aBundle(options: {
  openRecheck?: boolean;
  acceptedRiskCoversRecheck?: boolean;
  acceptedRiskExpiresAt?: string | null;
} = {}) {
  const ctx = makeContext({ withRunnerDependencies: true });
  const actor: TopicSelectionActorRef = { actor_type: 'human', actor_id: 'reviewer_1' };
  const evidenceMapRef = ref('evidence_map', 'evidence_map_1', TITLE_CARD_ID, 'v1');
  const searchRunRef = ref('search_run', 'search_run_1', TITLE_CARD_ID);
  const searchPlanRef = ref('search_plan', 'search_plan_1', TITLE_CARD_ID, 'v1');
  const literatureSnapshotRef = ref('literature_resource_pool_snapshot', 'literature_snapshot_1', TITLE_CARD_ID, 'v1');
  const supportUnitRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const roleBundle: TopicSelectionEvidenceRoleBundle = {
    support_unit_refs: [supportUnitRef],
    challenge_unit_refs: [],
    baseline_unit_refs: [ref('evidence_unit', 'evidence_unit_baseline_1', TITLE_CARD_ID)],
    context_unit_refs: [],
  };
  const humanDecisionRef = ref('human_confirmed_decision', 'human_decision_1', TITLE_CARD_ID);
  const validatedNeedRef = ref('validated_need', 'validated_need_1', TITLE_CARD_ID);
  const sourceCandidateRef = ref('need_candidate', 'need_candidate_1', TITLE_CARD_ID, 'v1');
  const supportPacketRef = ref('validation_decision_support_packet', 'support_packet_1', TITLE_CARD_ID);
  const adjudicationRef = ref('validate_need_adjudication_result', 'adjudication_1', TITLE_CARD_ID);
  const traceRef = ref('trace_snapshot', 'trace_1', TITLE_CARD_ID);
  const recheckRef = ref('search_plan_recheck_request', 'search_recheck_1', TITLE_CARD_ID);
  await ctx.controlPlaneRepository.createTraceSnapshot({
    trace_snapshot_id: traceRef.ref_id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    target_ref: validatedNeedRef,
    snapshot_hash: 'trace_hash_1',
    object_refs: [validatedNeedRef, sourceCandidateRef, supportPacketRef, adjudicationRef],
    lineage_link_refs: [],
    artifact_refs: [],
    quality_signal_refs: [],
    transition_attempt_refs: [],
    payload: { stage: 'v1a' },
    created_by: 'system',
    created_at: NOW,
  });
  await ctx.searchRepository.createLiteratureResourcePoolSnapshot({
    literature_resource_pool_snapshot_id: literatureSnapshotRef.ref_id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    snapshot_version: 'v1',
    source_scope: 'title_card_evidence_basket',
    topic_seed_ref: ref('topic_seed', 'topic_seed_1', TITLE_CARD_ID),
    literature_refs: [ref('literature_record', 'lit_1', TITLE_CARD_ID)],
    content_source_refs: [],
    source_health_summary: {
      total_literature_count: 1,
      missing_literature_ids: [],
      rights_class_counts: {},
      pipeline_ready_count: 1,
      abstract_ready_count: 1,
      key_content_ready_count: 1,
      fulltext_ready_count: 1,
      source_count: 1,
      stale_count: 0,
      blocked_count: 0,
      warning_codes: [],
    },
    snapshot_hash: 'snapshot_hash_1',
    created_by: 'system',
    created_at: NOW,
  } satisfies TopicSelectionLiteratureResourcePoolSnapshotRecord);
  await ctx.searchRepository.createSearchPlanWithCoverageIntents({
    search_plan_id: searchPlanRef.ref_id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    plan_version: 'v1',
    status: 'ready',
    topic_seed_ref: ref('topic_seed', 'topic_seed_1', TITLE_CARD_ID),
    literature_snapshot_ref: literatureSnapshotRef,
    query_intents: ['reviewer traceability'],
    must_check_constraints: [],
    exclusion_rules: [],
    coverage_strategy: {},
    artifact_refs: [],
    created_by: 'system',
    created_at: NOW,
  } satisfies TopicSelectionSearchPlanRecord, []);
  await ctx.searchRepository.createSearchRunWithCoverageRecords({
    search_run_id: searchRunRef.ref_id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    search_plan_ref: searchPlanRef,
    literature_snapshot_ref: literatureSnapshotRef,
    run_kind: 'planned_search',
    run_status: 'succeeded',
    query_provenance: [],
    result_accounting: {
      total_result_count: 1,
      unique_literature_count: 1,
      duplicate_result_count: 0,
      failed_source_count: 0,
      skipped_source_count: 0,
    },
    source_health_summary: {},
    dedup_summary: {},
    evidence_map_input_refs: [ref('literature_record', 'lit_1', TITLE_CARD_ID)],
    artifact_refs: [],
    started_at: NOW,
    finished_at: NOW,
    created_by: 'system',
    created_at: NOW,
  } satisfies TopicSelectionSearchRunRecord, {
    observations: [],
    evidence_bindings: [],
    assessments: [],
    risk_acceptances: [],
  });
  await ctx.evidenceRepository.createEvidenceMapWithRecords({
    evidence_map: {
      evidence_map_id: evidenceMapRef.ref_id,
      workspace_id: null,
      title_card_id: TITLE_CARD_ID,
      evidence_map_version: 'v1',
      status: 'ready',
      review_status: 'machine_checked',
      freshness_status: 'current',
      search_run_ref: searchRunRef,
      search_plan_ref: searchPlanRef,
      literature_snapshot_ref: literatureSnapshotRef,
      unit_count: 1,
      support_unit_count: 1,
      challenge_unit_count: 0,
      baseline_unit_count: 1,
      context_unit_count: 0,
      digest_payload: {},
      stale_reason_codes: [],
      artifact_refs: [],
      created_by: 'system',
      created_at: NOW,
    } satisfies TopicSelectionEvidenceMapRecord,
    evidence_units: [],
    typed_links: [],
    clusters: [],
    patterns: [],
    conflict_sets: [],
  });
  const candidate: TopicSelectionNeedCandidateRecord = {
    need_candidate_id: sourceCandidateRef.ref_id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    evidence_map_id: evidenceMapRef.ref_id,
    candidate_version: 'v1',
    lifecycle_status: 'closed',
    decision_status: 'resulted_in_validated_need',
    review_status: 'human_confirmed',
    freshness_status: 'current',
    candidate_need: 'Evidence-to-need traceability is hard to audit.',
    unmet_need_statement: 'Reviewer-aligned topic selection needs stronger evidence-to-need traceability.',
    mechanism_type: 'workflow_gap',
    mechanism_summary: 'Traceability is brittle.',
    mechanism_payload: {},
    scope_notes: 'CS paper engineering assistants.',
    non_goal_notes: 'Do not solve final paper planning.',
    prior_art_status: 'no_strong_solution_found',
    evidence_map_ref: evidenceMapRef,
    search_run_ref: searchRunRef,
    search_plan_ref: searchPlanRef,
    literature_snapshot_ref: literatureSnapshotRef,
    evidence_role_bundle: roleBundle,
    conflict_refs: [],
    strength_assessment_refs: [],
    open_recheck_request_refs: options.openRecheck ? [recheckRef] : [],
    unresolved_challenge_refs: [],
    accepted_risk_refs: [],
    gap_codes: [],
    speculative: false,
    confidence: 0.8,
    artifact_refs: [],
    result_adjudication_id: adjudicationRef.ref_id,
    result_validated_need_id: validatedNeedRef.ref_id,
    merged_into_need_candidate_ref: null,
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };
  await ctx.needRepository.createNeedCandidate(candidate);
  const supportPacket: TopicSelectionValidationDecisionSupportPacketRecord = {
    validation_support_packet_id: supportPacketRef.ref_id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    need_candidate_id: sourceCandidateRef.ref_id,
    evidence_map_id: evidenceMapRef.ref_id,
    readiness_assessment_id: null,
    packet_status: 'ready',
    evidence_map_ref: evidenceMapRef,
    search_run_ref: searchRunRef,
    search_plan_ref: searchPlanRef,
    literature_snapshot_ref: literatureSnapshotRef,
    need_candidate_ref: sourceCandidateRef,
    readiness_assessment_ref: null,
    evidence_role_bundle: roleBundle,
    conflict_refs: [],
    strength_assessment_refs: [],
    coverage_refs: [searchPlanRef, searchRunRef, literatureSnapshotRef],
    residual_risk_refs: [],
    open_gap_codes: [],
    required_human_checks: ['confirm_unmet_need'],
    prior_art_status: 'no_strong_solution_found',
    already_solved_review: {},
    packet_payload: {},
    artifact_refs: [],
    created_by: 'system',
    created_at: NOW,
  };
  await ctx.needRepository.createValidationDecisionSupportPacket(supportPacket);

  let riskRef: TopicSelectionFunctionalRef | null = null;
  if (options.acceptedRiskCoversRecheck) {
    riskRef = ref('accepted_risk', 'accepted_risk_1', TITLE_CARD_ID);
    await ctx.recheckRepository.createAcceptedRisk({
      accepted_risk_id: riskRef.ref_id,
      workspace_id: null,
      title_card_id: TITLE_CARD_ID,
      risk_type: 'open_recheck_accepted_for_v1b_intake',
      source_type: 'manual',
      source_ref: recheckRef,
      target_ref: validatedNeedRef,
      scope_refs: [recheckRef, searchPlanRef],
      affected_object_refs: [validatedNeedRef],
      severity: 'blocking',
      status: 'active',
      rationale: 'Reviewer accepts this recheck as bounded for slice planning.',
      accepted_by: actor,
      recheck_condition: 'new counter evidence appears',
      expires_at: options.acceptedRiskExpiresAt ?? null,
      created_at: NOW,
      updated_at: NOW,
    } satisfies TopicSelectionAcceptedRiskRecord);
  }
  if (options.openRecheck) {
    await ctx.searchRepository.createSearchPlanRecheckRequest({
      search_plan_recheck_request_id: recheckRef.ref_id,
      workspace_id: null,
      title_card_id: TITLE_CARD_ID,
      source_ref: sourceCandidateRef,
      target_search_plan_ref: searchPlanRef,
      target_literature_snapshot_ref: literatureSnapshotRef,
      reason: 'Counter evidence should be rechecked.',
      gap_codes: ['COUNTER_EVIDENCE_COVERAGE_GAP'],
      requested_by: 'human',
      status: 'open',
      decision_summary: null,
      accepted_risk_refs: riskRef ? [riskRef] : [],
      resulting_search_plan_ref: null,
      resulting_search_run_ref: null,
      created_at: NOW,
      resolved_at: null,
    } satisfies TopicSelectionSearchPlanRecheckRequestRecord);
  }
  const adjudication: TopicSelectionValidateNeedAdjudicationResultRecord = {
    adjudication_result_id: adjudicationRef.ref_id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    need_candidate_id: sourceCandidateRef.ref_id,
    support_packet_id: supportPacketRef.ref_id,
    final_decision: 'validate',
    output_validated_need_id: validatedNeedRef.ref_id,
    human_decision_id: humanDecisionRef.ref_id,
    loopback_target: 'none',
    rejected_reason: null,
    merge_target_need_candidate_ref: null,
    output_searchplan_recheck_request_ref: null,
    output_memory_suggestion_ref: null,
    rationale: 'Human confirmed the need.',
    required_actions: [],
    accepted_risk_refs: riskRef ? [riskRef] : [],
    residual_risk_refs: [],
    gap_codes: [],
    decision_payload: {},
    artifact_refs: [],
    adjudicated_by: actor,
    created_at: NOW,
  };
  await ctx.controlPlane.recordHumanDecision({
    title_card_id: TITLE_CARD_ID,
    target_ref: validatedNeedRef,
    decision_type: 'confirm',
    actor,
    rationale: 'Human confirmed the validated need.',
    resulting_authority_refs: [validatedNeedRef],
  });
  const validatedNeed: TopicSelectionValidatedNeedRecord = {
    validated_need_id: validatedNeedRef.ref_id,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    source_need_candidate_id: sourceCandidateRef.ref_id,
    adjudication_result_id: adjudicationRef.ref_id,
    support_packet_id: supportPacketRef.ref_id,
    human_decision_id: humanDecisionRef.ref_id,
    validated_need_statement: 'Reviewer-aligned topic selection needs stronger evidence-to-need traceability.',
    mechanism_type: 'workflow_gap',
    mechanism_summary: 'Traceability is brittle.',
    mechanism_payload: {},
    scope_notes: 'CS paper engineering assistants.',
    non_goal_notes: 'Do not solve final paper planning.',
    prior_art_status: 'no_strong_solution_found',
    evidence_map_ref: evidenceMapRef,
    search_run_ref: searchRunRef,
    search_plan_ref: searchPlanRef,
    literature_snapshot_ref: literatureSnapshotRef,
    support_packet_ref: supportPacketRef,
    adjudication_result_ref: adjudicationRef,
    human_decision_ref: humanDecisionRef,
    evidence_role_bundle: roleBundle,
    strength_assessment_refs: [],
    conflict_refs: [],
    residual_risk_refs: [],
    accepted_risk_refs: riskRef ? [riskRef] : [],
    trace_refs: [traceRef],
    created_by: 'human',
    created_at: NOW,
  };
  const bundle: TopicSelectionV1aToV1bInputBundleRecord = {
    v1b_input_bundle_id: 'v1b_input_bundle_1',
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    validated_need_id: validatedNeedRef.ref_id,
    source_need_candidate_id: sourceCandidateRef.ref_id,
    adjudication_result_id: adjudicationRef.ref_id,
    support_packet_id: supportPacketRef.ref_id,
    bundle_version: 'v1',
    validated_need_ref: validatedNeedRef,
    source_need_candidate_ref: sourceCandidateRef,
    adjudication_result_ref: adjudicationRef,
    support_packet_ref: supportPacketRef,
    human_decision_ref: humanDecisionRef,
    evidence_map_ref: evidenceMapRef,
    search_run_ref: searchRunRef,
    search_plan_ref: searchPlanRef,
    literature_snapshot_ref: literatureSnapshotRef,
    evidence_role_bundle: roleBundle,
    trace_refs: [traceRef],
    risk_refs: riskRef ? [riskRef] : [],
    gap_codes: [],
    memory_suggestion_refs: [],
    recheck_request_refs: options.openRecheck ? [recheckRef] : [],
    handoff_payload: {
      validated_need_statement: validatedNeed.validated_need_statement,
    },
    created_by: 'system',
    created_at: NOW,
  };
  await ctx.needRepository.adjudicateWithSideEffects({
    adjudication_result: adjudication,
    candidate_patch: {
      lifecycle_status: 'closed',
      decision_status: 'resulted_in_validated_need',
      review_status: 'human_confirmed',
      freshness_status: 'current',
      result_adjudication_id: adjudication.adjudication_result_id,
      result_validated_need_id: validatedNeed.validated_need_id,
      updated_at: NOW,
    },
    validated_need: validatedNeed,
    v1b_input_bundle: bundle,
  });

  return { ...ctx, bundle, riskRef };
}

test('v1b workflow harness node policy registry covers all N1-N11 nodes with expected execution classes', () => {
  const ctx = makeContext();
  const policies = ctx.service.getNodePolicies();
  assert.deepEqual(
    policies.map((policy) => policy.node_id),
    [...TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS],
  );
  assert.equal(policies.length, 11);

  const deterministic = policies.filter((policy) => policy.execution_kind === 'deterministic').map((policy) => policy.node_id);
  const delegated = policies.filter((policy) => policy.execution_kind === 'delegated').map((policy) => policy.node_id);
  const modelLike = policies.filter((policy) => policy.execution_kind === 'model_like').map((policy) => policy.node_id);

  assert.deepEqual(deterministic, [
    'topic-selection.v1b.create-intake-snapshot.v1',
    'topic-selection.v1b.assess-intake-readiness.v1',
    'topic-selection.v1b.decide-value-disposition.v1',
    'topic-selection.v1b.create-draft-topic-package.v1',
    'topic-selection.v1b.publish-v1c-input-bundle.v1',
  ]);
  assert.deepEqual(delegated, [
    'topic-selection.v1b.record-research-constraint-profile.v1',
    'topic-selection.v1b.select-research-slice.v1',
    'topic-selection.v1b.materialize-topic-question-contract.v1',
  ]);
  assert.deepEqual(modelLike, [
    'topic-selection.v1b.generate-research-slice-options.v1',
    'topic-selection.v1b.generate-topic-question-candidates.v1',
    'topic-selection.v1b.assess-topic-value.v1',
  ]);
  assert.equal(policies.every((policy) => policy.gate_id && policy.input_contract), true);
  assert.equal(policies.every((policy) => policy.replay_hash_components.includes('frozen_input_hash')), true);
  assert.deepEqual(
    policies.filter((policy) => policy.semantic_support_slots.length > 0).map((policy) => policy.node_id),
    [
      'topic-selection.v1b.record-research-constraint-profile.v1',
      'topic-selection.v1b.assess-intake-readiness.v1',
      'topic-selection.v1b.generate-research-slice-options.v1',
      'topic-selection.v1b.select-research-slice.v1',
      'topic-selection.v1b.generate-topic-question-candidates.v1',
      'topic-selection.v1b.materialize-topic-question-contract.v1',
      'topic-selection.v1b.assess-topic-value.v1',
    ],
  );
});

test('v1b workflow harness shell blocks before runner when dependencies are not configured', async () => {
  const ctx = makeContext();
  const result = await ctx.service.invokeNode(request({
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
  }));

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.route_decision, 'blocked');
  assert.equal(result.error_code, 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.ok(result.gate_result_ref);
  assert.ok(result.transition_attempt_ref);
  assert.ok(result.trace_snapshot_ref);
  assert.ok(result.harness_trace_artifact_ref);

  const transition = await ctx.controlPlane.getTraceSnapshot(result.trace_snapshot_ref.ref_id);
  assert.ok(transition);
  const attempts = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(result.workflow_run_id);
  assert.equal(attempts.some((artifact) => artifact.artifact_kind === 'trace'), true);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, []);
});

test('v1b workflow harness N1 creates intake snapshot authority and N1 handoff from frozen v1a bundle', async () => {
  const ctx = await seedHarnessV1aBundle();
  const result = await ctx.service.invokeNode(n1Request(ctx.bundle));

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref?.ref_type, 'v1b_intake_snapshot');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
  assert.equal(result.hashes.authority_hash?.length, 64);
  assert.equal(result.hashes.handoff_hash?.length, 64);

  const snapshot = await ctx.v1bRepository.findIntakeSnapshotById(result.authority_ref!.ref_id);
  assert.equal(snapshot?.trace_status, 'passed');
  assert.equal(snapshot?.v1b_input_bundle_id, ctx.bundle.v1b_input_bundle_id);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, [result.authority_ref]);
});

test('v1b workflow harness N2 creates constraint profile from Codex delegated accepted payload with matching provenance', async () => {
  const ctx = await seedHarnessV1aBundle();
  const n1 = await ctx.service.invokeNode(n1Request(ctx.bundle));
  const acceptedPayload = acceptedConstraintProfilePayload();
  const n2Input = n2Request(ctx.bundle, n1, acceptedPayload);
  const result = await invokeN2WithRuntimeSupport(ctx, n2Input, acceptedPayload);

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.authority_ref?.ref_type, 'research_constraint_profile');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
  const profile = await ctx.v1bRepository.findResearchConstraintProfileById(result.authority_ref!.ref_id);
  assert.equal(profile?.target_community, acceptedPayload.target_community);
  assert.deepEqual(profile?.method_constraints, acceptedPayload.method_constraints);
});

test('v1b workflow harness N2 blocks Codex support without accepted payload authority input', async () => {
  const ctx = await seedHarnessV1aBundle();
  const n1 = await ctx.service.invokeNode(n1Request(ctx.bundle));
  const acceptedPayload = acceptedConstraintProfilePayload();
  const n2Input = n2Request(ctx.bundle, n1, acceptedPayload);
  const brokenPayload = { ...n2Input.frozen_input.payload };
  delete brokenPayload.accepted_constraint_profile_payload;
  const brokenInput: TopicSelectionV1bWorkflowHarnessRunRequest = {
    ...n2Input,
    run_mode: null,
    profile_id: null,
    frozen_input: {
      ...n2Input.frozen_input,
      payload: brokenPayload,
      frozen_input_hash: frozenInputHash({
        ...n2Input.frozen_input,
        payload: brokenPayload,
        frozen_input_hash: null,
      }),
    },
  };
  const result = await ctx.service.invokeNode(brokenInput);

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N3 ready profile emits readiness authority and N3 handoff', async () => {
  const ctx = await seedHarnessV1aBundle();
  const n1 = await ctx.service.invokeNode(n1Request(ctx.bundle));
  const acceptedPayload = acceptedConstraintProfilePayload();
  const n2Input = n2Request(ctx.bundle, n1, acceptedPayload);
  const n2 = await invokeN2WithRuntimeSupport(ctx, n2Input, acceptedPayload);
  const result = await ctx.service.invokeNode(n3Request(n1, n2));

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.authority_ref?.ref_type, 'v1b_intake_readiness_assessment');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
  const readiness = await ctx.v1bRepository.findReadinessAssessmentById(result.authority_ref!.ref_id);
  assert.equal(readiness?.recommendation, 'ready_for_slice');
  assert.equal(readiness?.blockers.length, 0);
});

test('v1b workflow harness N3 blocks missing constraints without N4 handoff', async () => {
  const ctx = await seedHarnessV1aBundle();
  const n1 = await ctx.service.invokeNode(n1Request(ctx.bundle));
  const acceptedPayload = acceptedConstraintProfilePayload({
    target_community: '',
    method_constraints: [],
    resource_constraints: [],
    non_goals: [],
    claim_ceiling: '',
  });
  const n2Input = n2Request(ctx.bundle, n1, acceptedPayload);
  const n2 = await invokeN2WithRuntimeSupport(ctx, n2Input, acceptedPayload);
  const result = await ctx.service.invokeNode(n3Request(n1, n2));

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.route_decision, 'loopback');
  assert.equal(result.handoff_ref, null);
  assert.equal(result.error_code, 'RESEARCH_CONSTRAINT_PROFILE_INCOMPLETE');
  const readiness = await ctx.v1bRepository.findReadinessAssessmentById(result.authority_ref!.ref_id);
  assert.equal(readiness?.recommendation, 'needs_constraint_clarification');
  assert.ok(readiness?.missing_constraint_codes.includes('TARGET_COMMUNITY_REQUIRED'));
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, [result.authority_ref]);
});

test('v1b workflow harness N3 blocks drifted frozen authority hash before N4 handoff', async () => {
  const ctx = await seedHarnessV1aBundle();
  const n1 = await ctx.service.invokeNode(n1Request(ctx.bundle));
  const acceptedPayload = acceptedConstraintProfilePayload();
  const n2Input = n2Request(ctx.bundle, n1, acceptedPayload);
  const n2 = await invokeN2WithRuntimeSupport(ctx, n2Input, acceptedPayload);
  const input = n3Request(n1, n2);
  const result = await ctx.service.invokeNode({
    ...input,
    frozen_input: {
      ...input.frozen_input,
      payload: {
        ...input.frozen_input.payload,
        constraint_profile_hash: 'b'.repeat(64),
      },
      frozen_input_hash: null,
    },
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N3_CONSTRAINT_PROFILE_HASH_MISMATCH');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N3 carries accepted risk warning into result and handoff evidence', async () => {
  const ctx = await seedHarnessV1aBundle({ openRecheck: true, acceptedRiskCoversRecheck: true });
  const n1 = await ctx.service.invokeNode(n1Request(ctx.bundle));
  const acceptedPayload = acceptedConstraintProfilePayload();
  const n2Input = n2Request(ctx.bundle, n1, acceptedPayload);
  const n2 = await invokeN2WithRuntimeSupport(ctx, n2Input, acceptedPayload);
  const result = await ctx.service.invokeNode(n3Request(n1, n2));

  assert.equal(result.gate_status, 'admitted_with_warnings');
  assert.equal(result.route_decision, 'invoke_next');
  assert.ok(result.warnings.some((warning) => warning.code === 'ACCEPTED_RISK_CARRIED_FORWARD'));
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
  const readiness = await ctx.v1bRepository.findReadinessAssessmentById(result.authority_ref!.ref_id);
  assert.equal(readiness?.accepted_risk_refs.length, 1);
});

test('v1b workflow harness N4 creates research slice option set from frozen semantic draft artifact', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const draft = n4Draft();
  const requestWithDraft = {
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  };
  const result = await ctx.service.invokeNode(requestWithDraft);

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref?.ref_type, 'research_slice_option_set');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
  assert.equal(result.hashes.authority_hash?.length, 64);
  assert.equal(result.hashes.handoff_hash?.length, 64);

  const optionSet = await ctx.researchSliceRepository.findOptionSetById(result.authority_ref!.ref_id);
  assert.equal(optionSet?.status, 'ready_for_selection');
  assert.equal(optionSet?.option_count, 1);
  assert.ok(optionSet?.recommended_option_id);
  const options = await ctx.researchSliceRepository.listOptionsByOptionSetId(result.authority_ref!.ref_id);
  assert.equal(options.length, 1);
  assert.equal(options[0]?.option_key, 'traceable_workflow_slice');
  assert.equal(options[0]?.status, 'recommended');
  assert.equal('portfolio_disposition' in (options[0]?.details_payload ?? {}), false);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, [result.authority_ref]);
});

test('v1b workflow harness N4 successfully stops an evidence-grounded no-viable portfolio without candidate authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const evidenceRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const draft = n4Draft({
    recommended_option_key: null,
    options: [],
    portfolio_disposition: {
      outcome: 'none_viable',
      rationale: 'Every visible research slice is defeated by the frozen evidence.',
      confidence: 0.86,
      evidence_refs: [evidenceRef],
      rejection_reasons: [
        {
          reason_code: 'claim_defeating_data_or_evaluation',
          summary: 'The available data cannot support the bounded claim.',
          evidence_refs: [evidenceRef],
        },
      ],
      reopening_conditions: ['Reopen when a claim-supporting dataset becomes available.'],
      candidate_dispositions: [],
    },
  });
  const requestWithDraft = {
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  };
  const result = await ctx.service.invokeNode(requestWithDraft);

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'stop_v1b_complete');
  assert.equal(result.failure_class, null);
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, []);
  const replay = await ctx.service.invokeNode(requestWithDraft);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.route_decision, 'stop_v1b_complete');
  assert.equal(replay.authority_ref, null);
});

test('v1b workflow harness N4 blocks an evidence-free no-viable portfolio before candidate authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const draft = n4Draft({
    recommended_option_key: null,
    options: [],
    portfolio_disposition: {
      outcome: 'none_viable',
      rationale: 'No visible slice should advance.',
      confidence: 0.86,
      evidence_refs: [],
      rejection_reasons: [
        {
          reason_code: 'claim_defeating_data_or_evaluation',
          summary: 'The available data cannot support the bounded claim.',
          evidence_refs: [],
        },
      ],
      reopening_conditions: ['Reopen when a claim-supporting dataset becomes available.'],
      candidate_dispositions: [],
    },
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.route_decision, 'blocked');
  assert.equal(result.error_code, 'N4_NON_SELECTED_PORTFOLIO_INVALID');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N4 routes an evidence-expansion portfolio without manufacturing slice authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const evidenceRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const draft = n4Draft({
    recommended_option_key: null,
    options: [],
    portfolio_disposition: {
      outcome: 'evidence_expansion_required',
      rationale: 'The visible evidence cannot distinguish the plausible slice directions.',
      confidence: 0.78,
      evidence_refs: [evidenceRef],
      rejection_reasons: [
        {
          reason_code: 'evidence_coverage_insufficient',
          summary: 'Nearest-work coverage is insufficient for a bounded slice decision.',
          evidence_refs: [evidenceRef],
        },
      ],
      reopening_conditions: ['Re-enter N4 only after a new v1a evidence bundle is current.'],
      candidate_dispositions: [],
    },
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'expand_evidence');
  assert.equal(result.failure_class, null);
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N4 routes a scope-reframe portfolio without manufacturing slice authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const evidenceRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const draft = n4Draft({
    recommended_option_key: null,
    options: [],
    portfolio_disposition: {
      outcome: 'reframe_required',
      rationale: 'The inherited research scope cannot express a falsifiable contribution.',
      confidence: 0.81,
      evidence_refs: [evidenceRef],
      rejection_reasons: [
        {
          reason_code: 'research_scope_misaligned',
          summary: 'The current scope conflicts with the bounded claim and evaluation constraints.',
          evidence_refs: [evidenceRef],
        },
      ],
      reopening_conditions: ['Revise the N2 research constraint profile before generating slices again.'],
      candidate_dispositions: [],
    },
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'reframe_scope');
  assert.equal(result.failure_class, null);
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N4 blocks an expansion portfolio that leaves an option undisposed', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const evidenceRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const draft = n4Draft({
    recommended_option_key: null,
    portfolio_disposition: {
      outcome: 'evidence_expansion_required',
      rationale: 'The visible evidence cannot distinguish the existing option.',
      confidence: 0.78,
      evidence_refs: [evidenceRef],
      rejection_reasons: [
        {
          reason_code: 'evidence_coverage_insufficient',
          summary: 'Nearest-work coverage is insufficient for a bounded slice decision.',
          evidence_refs: [evidenceRef],
        },
      ],
      reopening_conditions: ['Re-enter N4 only after a new v1a evidence bundle is current.'],
      candidate_dispositions: [],
    },
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N4_NON_SELECTED_PORTFOLIO_INVALID');
  assert.equal(result.authority_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N4 rejects a selected portfolio without exactly one selected option disposition', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const evidenceRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const draft = n4Draft({
    portfolio_disposition: {
      outcome: 'selected',
      rationale: 'The visible portfolio contains one preferred slice.',
      confidence: 0.84,
      evidence_refs: [evidenceRef],
      rejection_reasons: [],
      reopening_conditions: [],
      candidate_dispositions: [
        {
          candidate_key: 'traceable_workflow_slice',
          disposition: 'dropped',
          rationale: 'The only option is incorrectly marked dropped for this negative fixture.',
          evidence_refs: [evidenceRef],
          drop_reason_code: 'strictly_dominated_by_visible_candidate',
          reopening_conditions: [],
        },
      ],
    },
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.route_decision, 'blocked');
  assert.equal(result.error_code, 'N4_SELECTED_PORTFOLIO_INVALID');
  assert.equal(result.authority_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N4 preserves selected parked and dropped option dispositions', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const evidenceRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const baseOption = n4Draft().options[0]!;
  const draft = n4Draft({
    options: [
      baseOption,
      {
        ...baseOption,
        option_key: 'parked_data_slice',
        slice_statement: 'Park a data-dependent traceability slice.',
      },
      {
        ...baseOption,
        option_key: 'dropped_duplicate_slice',
        slice_statement: 'Drop a strictly dominated traceability slice.',
      },
    ],
    portfolio_disposition: {
      outcome: 'selected',
      rationale: 'One slice dominates while two alternatives remain explicit.',
      confidence: 0.84,
      evidence_refs: [evidenceRef],
      rejection_reasons: [],
      reopening_conditions: [],
      candidate_dispositions: [
        {
          candidate_key: 'traceable_workflow_slice',
          disposition: 'selected',
          rationale: 'This slice best fits the bounded evidence and execution constraints.',
          evidence_refs: [evidenceRef],
          reopening_conditions: [],
        },
        {
          candidate_key: 'parked_data_slice',
          disposition: 'parked',
          rationale: 'The direction becomes useful only when the missing dataset is available.',
          evidence_refs: [evidenceRef],
          reopening_conditions: ['Reopen after the required dataset is current.'],
        },
        {
          candidate_key: 'dropped_duplicate_slice',
          disposition: 'dropped',
          rationale: 'The direction is strictly dominated by the selected slice.',
          evidence_refs: [evidenceRef],
          drop_reason_code: 'strictly_dominated_by_visible_candidate',
          reopening_conditions: [],
        },
      ],
    },
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  const options = await ctx.researchSliceRepository.listOptionsByOptionSetId(result.authority_ref!.ref_id);
  assert.equal(options.find((option) => option.option_key === 'traceable_workflow_slice')?.status, 'recommended');
  assert.equal(options.find((option) => option.option_key === 'parked_data_slice')?.status, 'deferred');
  assert.equal(options.find((option) => option.option_key === 'dropped_duplicate_slice')?.status, 'rejected');
  assert.equal(
    (options.find((option) => option.option_key === 'dropped_duplicate_slice')?.details_payload
      .portfolio_disposition as { drop_reason_code?: string } | undefined)?.drop_reason_code,
    'strictly_dominated_by_visible_candidate',
  );
  const optionSet = await ctx.researchSliceRepository.findOptionSetById(result.authority_ref!.ref_id);
  assert.equal(
    (optionSet?.options_payload.portfolio_disposition as { outcome?: string } | undefined)?.outcome,
    'selected',
  );
});

test('v1b workflow harness N5 cannot select an option dropped by the N4 portfolio disposition', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const evidenceRef = ref('evidence_unit', 'evidence_unit_support_1', TITLE_CARD_ID);
  const baseOption = n4Draft().options[0]!;
  const draft = n4Draft({
    options: [
      baseOption,
      {
        ...baseOption,
        option_key: 'dropped_duplicate_slice',
        slice_statement: 'Drop a strictly dominated traceability slice.',
      },
    ],
    portfolio_disposition: {
      outcome: 'selected',
      rationale: 'One slice dominates the alternative.',
      confidence: 0.84,
      evidence_refs: [evidenceRef],
      rejection_reasons: [],
      reopening_conditions: [],
      candidate_dispositions: [
        {
          candidate_key: 'traceable_workflow_slice',
          disposition: 'selected',
          rationale: 'This slice best fits the bounded evidence and execution constraints.',
          evidence_refs: [evidenceRef],
          reopening_conditions: [],
        },
        {
          candidate_key: 'dropped_duplicate_slice',
          disposition: 'dropped',
          rationale: 'The direction is strictly dominated by the selected slice.',
          evidence_refs: [evidenceRef],
          drop_reason_code: 'strictly_dominated_by_visible_candidate',
          reopening_conditions: [],
        },
      ],
    },
  });
  const n4 = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });
  const droppedOption = (await ctx.researchSliceRepository.listOptionsByOptionSetId(n4.authority_ref!.ref_id))
    .find((option) => option.option_key === 'dropped_duplicate_slice')!;
  const result = await ctx.service.invokeNode(n5Request(n4, acceptedSliceSelectionPayload(droppedOption)));

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N5_SELECTED_OPTION_NON_SELECTABLE');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N4 admits runtime-verified Codex research-slice draft in product mode', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3, {
    workflow_run_id: 'workflow_run_v1b_n4_runtime_product',
    node_attempt_id: 'node_attempt_v1b_n4_runtime_product',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
    run_mode: 'product',
  });
  const draft = n4Draft();
  const semanticArtifact = await generateN4RuntimeDraftArtifact(ctx, input, draft);

  assert.equal(semanticArtifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(semanticArtifact.prompt_variant_key, 'n4_research_slice_option_draft.initial_from_n3');
  assert.equal(
    semanticArtifact.context_policy_profile_id,
    'topic-selection.v1b.n4.research-slice-options.context-runtime@v1',
  );
  assert.match(semanticArtifact.source_hashes.n3_handoff_hash ?? '', /^[a-f0-9]{64}$/);
  assert.match(semanticArtifact.source_hashes.planning_input_hash ?? '', /^[a-f0-9]{64}$/);

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifact],
  });
  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref?.ref_type, 'research_slice_option_set');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
});

test('v1b workflow harness N4 blocks runtime research-slice draft source drift before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3, {
    workflow_run_id: 'workflow_run_v1b_n4_runtime_source_drift',
    node_attempt_id: 'node_attempt_v1b_n4_runtime_source_drift',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
    run_mode: 'product',
  });
  const semanticArtifact = await generateN4RuntimeDraftArtifact(ctx, input, n4Draft());
  const driftedArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef = {
    ...semanticArtifact,
    source_hashes: {
      ...semanticArtifact.source_hashes,
      planning_input_hash: '9'.repeat(64),
    },
  };

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [driftedArtifact],
  });
  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N4_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b N4 runtime compression quality gate blocks dropped required planning facts before draft output', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3, {
    workflow_run_id: 'workflow_run_v1b_n4_runtime_compression_blocked',
    node_attempt_id: 'node_attempt_v1b_n4_runtime_compression_blocked',
  });
  const runtime = new TopicSelectionV1bN4ResearchSliceRuntimeService(ctx.controlPlane);
  const generated = await runtime.generateDraftArtifact({
    request: input,
    planning_input: await n4RuntimePlanningInput(ctx, input),
    execution_mode: 'codex_assisted',
    run_mode: 'acceptance',
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 120_000,
      estimated_input_tokens_after_compression_override: 12_000,
    },
    compression_attempt: {
      compression_executor_kind: 'deterministic_structural',
      compressed_context: {
        summary: 'Intentionally incomplete N4 compressed context for quality-gate regression.',
        raw_provider_logs: ['must not be persisted in compressed runtime context'],
      },
      summary: {
        preserved_fact_kinds: ['planning_input'],
      },
      compressed_preserved_facts: {
        planning_input: ['incomplete'],
      },
    },
    codex_response: {
      output: n4Draft(),
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });

  assert.equal(generated.status, 'blocked');
  assert.equal(generated.invocation_result.status, 'blocked');
  assert.equal(generated.invocation_result.error_code, 'COMPRESSION_QUALITY_GATE_BLOCKED');
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_QUALITY_GATE_BLOCKED'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_REQUIRED_N3_HANDOFF_DROPPED'));
  assert.equal(generated.invocation_result.structured_output, null);
});

test('v1b workflow harness N4 blocks fixture replay research-slice draft in product mode', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3, {
    workflow_run_id: 'workflow_run_v1b_n4_fixture_product',
    node_attempt_id: 'node_attempt_v1b_n4_fixture_product',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
    run_mode: 'product',
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, n4Draft())],
  });
  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N4_DRAFT_ARTIFACT_PROVENANCE_CLASS_INVALID');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N4 requires frozen semantic draft artifact and never live-executes execution_spec alone', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3, {
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
    run_mode: 'acceptance',
  });
  const result = await ctx.service.invokeNode(input);

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N4_FROZEN_DRAFT_ARTIFACT_REQUIRED');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N4 blocks malformed option drafts before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const draft = n4Draft({
    options: [
      n4Draft().options[0]!,
      {
        ...n4Draft().options[0]!,
        included_boundaries: [],
      },
    ],
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N4_DUPLICATE_RESEARCH_SLICE_OPTION_KEY');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N4 blocks semantic artifact hash drift before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const artifact = await recordN4DraftArtifact(ctx, input, n4Draft());
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      {
        ...artifact,
        normalized_output_hash: 'f'.repeat(64),
      },
    ],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N4_FROZEN_DRAFT_ARTIFACT_HASH_MISMATCH');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N4 blocks frozen readiness hash drift before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(ctx);
  const input = n4Request(n1, n2, n3);
  const driftedInput: TopicSelectionV1bWorkflowHarnessRunRequest = {
    ...input,
    frozen_input: {
      ...input.frozen_input,
      payload: {
        ...input.frozen_input.payload,
        intake_readiness_hash: 'b'.repeat(64),
      },
      frozen_input_hash: frozenInputHash({
        ...input.frozen_input,
        payload: {
          ...input.frozen_input.payload,
          intake_readiness_hash: 'b'.repeat(64),
        },
        frozen_input_hash: null,
      }),
    },
  };
  const result = await ctx.service.invokeNode({
    ...driftedInput,
    semantic_artifacts: [await recordN4DraftArtifact(ctx, driftedInput, n4Draft())],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N4_INTAKE_READINESS_HASH_MISMATCH');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.researchSliceRepository.listOptionSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N5 selects a research slice and emits N5 handoff', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n4 } = await runReadyN4(ctx);
  const option = await selectedN4Option(ctx, n4);
  const accepted = acceptedSliceSelectionPayload(option);
  const result = await ctx.service.invokeNode(n5Request(n4, accepted));

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref?.ref_type, 'slice_selection_decision');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');

  const decision = await ctx.researchSliceRepository.findSelectionDecisionById(result.authority_ref!.ref_id);
  assert.equal(decision?.decision, 'select');
  assert.equal(decision?.selected_option_id, option.research_slice_option_id);
  assert.equal(decision?.output_research_slice_ref?.ref_type, 'research_slice');
  const researchSlice = await ctx.researchSliceRepository.findResearchSliceById(
    decision!.output_research_slice_ref!.ref_id,
  );
  assert.equal(researchSlice?.source_option_ref.ref_id, option.research_slice_option_id);
  assert.equal(researchSlice?.slice_selection_decision_ref.ref_id, result.authority_ref!.ref_id);

  const optionSet = await ctx.researchSliceRepository.findOptionSetById(n4.authority_ref!.ref_id);
  assert.equal(optionSet?.status, 'selected');
  assert.equal(optionSet?.selected_option_id, option.research_slice_option_id);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, [
    result.authority_ref,
    decision?.output_research_slice_ref,
  ]);
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(result.handoff_ref!.ref_id);
  const handoffPayload = handoffArtifact?.payload as {
    payload?: {
      constraint_profile_hash?: string;
      constraint_profile_ref?: TopicSelectionFunctionalRef;
      intake_readiness_hash?: string;
      intake_readiness_ref?: TopicSelectionFunctionalRef;
      research_slice_ref?: TopicSelectionFunctionalRef;
    };
  } | null;
  assert.equal(handoffPayload?.payload?.constraint_profile_ref?.ref_type, 'research_constraint_profile');
  assert.match(handoffPayload?.payload?.constraint_profile_hash ?? '', /^[a-f0-9]{64}$/);
  assert.equal(handoffPayload?.payload?.intake_readiness_ref?.ref_type, 'v1b_intake_readiness_assessment');
  assert.match(handoffPayload?.payload?.intake_readiness_hash ?? '', /^[a-f0-9]{64}$/);
  assert.equal(
    handoffPayload?.payload?.research_slice_ref?.ref_id,
    decision?.output_research_slice_ref?.ref_id,
  );
});

test('v1b workflow harness N5 authority write failure does not leave replayable admitted trace', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n4 } = await runReadyN4(ctx);
  const option = await selectedN4Option(ctx, n4);
  const input = n5Request(n4, acceptedSliceSelectionPayload(option));
  const originalCreate = ctx.researchSliceRepository.createSelectionDecisionWithSlice.bind(ctx.researchSliceRepository);
  let failNextWrite = true;
  ctx.researchSliceRepository.createSelectionDecisionWithSlice = async (creation) => {
    if (failNextWrite) {
      failNextWrite = false;
      throw new Error('injected N5 authority write failure');
    }
    return originalCreate(creation);
  };

  await assert.rejects(
    () => ctx.service.invokeNode(input),
    /injected N5 authority write failure/,
  );
  const failedAttemptArtifacts = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
  const failedN5TraceArtifacts = failedAttemptArtifacts.filter((artifact) =>
    artifact.artifact_kind === 'trace'
    && (artifact.payload as { node_id?: string } | null)?.node_id === input.node_id
  );
  assert.equal(failedN5TraceArtifacts.length, 0);

  const result = await ctx.service.invokeNode(input);
  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.replay_provenance, null);
  const replay = await ctx.service.invokeNode(input);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.authority_ref?.ref_id, result.authority_ref?.ref_id);
});

test('v1b workflow harness multi-record authority write failures do not leave replayable admitted traces', async () => {
  {
    const ctx = await seedHarnessV1aBundle();
    const { n1, n2, n3 } = await runReadyN3(ctx);
    const baseInput = n4Request(n1, n2, n3);
    const input = {
      ...baseInput,
      semantic_artifacts: [await recordN4DraftArtifact(ctx, baseInput, n4Draft())],
    };
    const originalCreate = ctx.researchSliceRepository.createPlanRunWithOptionSet.bind(ctx.researchSliceRepository);
    let captured: Parameters<typeof ctx.researchSliceRepository.createPlanRunWithOptionSet>[0] | null = null;
    let failNextWrite = true;
    ctx.researchSliceRepository.createPlanRunWithOptionSet = async (creation) => {
      if (failNextWrite) {
        failNextWrite = false;
        captured = creation;
        throw new Error('injected N4 authority write failure');
      }
      return originalCreate(creation);
    };

    await assertAuthorityWriteFailureCanRetry(ctx, input, /injected N4 authority write failure/, async () => {
      assert.ok(captured);
      assert.equal(await ctx.researchSliceRepository.findPlanRunById(captured.plan_run.plan_research_slice_run_id), null);
      assert.equal(await ctx.researchSliceRepository.findOptionSetById(captured.option_set.research_slice_option_set_id), null);
      assert.equal((await ctx.researchSliceRepository.listOptionsByOptionSetId(captured.option_set.research_slice_option_set_id)).length, 0);
    });
  }

  {
    const ctx = await seedHarnessV1aBundle();
    const { n5 } = await runReadyN5(ctx);
    const baseInput = await n6Request(ctx, n5);
    const draft = await n6Draft(ctx, baseInput);
    const input = {
      ...baseInput,
      semantic_artifacts: [await recordN6DraftArtifact(ctx, baseInput, draft)],
    };
    const originalCreate = ctx.topicQuestionRepository.createFormationRunWithCandidates.bind(ctx.topicQuestionRepository);
    let captured: Parameters<typeof ctx.topicQuestionRepository.createFormationRunWithCandidates>[0] | null = null;
    let failNextWrite = true;
    ctx.topicQuestionRepository.createFormationRunWithCandidates = async (creation) => {
      if (failNextWrite) {
        failNextWrite = false;
        captured = creation;
        throw new Error('injected N6 authority write failure');
      }
      return originalCreate(creation);
    };

    await assertAuthorityWriteFailureCanRetry(ctx, input, /injected N6 authority write failure/, async () => {
      assert.ok(captured);
      assert.equal(await ctx.topicQuestionRepository.findFormationRunById(captured.form_topic_question_run.form_topic_question_run_id), null);
      assert.equal(await ctx.topicQuestionRepository.findQuestionFrameById(captured.question_frame.question_frame_id), null);
      assert.equal(await ctx.topicQuestionRepository.findCandidateSetById(captured.candidate_set.topic_question_candidate_set_id), null);
      assert.equal(await ctx.topicQuestionRepository.findCandidateById(captured.candidates[0]!.topic_question_candidate_id), null);
    });
  }

  {
    const ctx = await seedHarnessV1aBundle();
    const { n6 } = await runReadyN6(ctx);
    const input = await n7Request(ctx, n6);
    const originalCreate = ctx.topicQuestionRepository.createSelectionDecisionWithMaterializations.bind(ctx.topicQuestionRepository);
    let captured: Parameters<typeof ctx.topicQuestionRepository.createSelectionDecisionWithMaterializations>[0] | null = null;
    let failNextWrite = true;
    ctx.topicQuestionRepository.createSelectionDecisionWithMaterializations = async (creation) => {
      if (failNextWrite) {
        failNextWrite = false;
        captured = creation;
        throw new Error('injected N7 authority write failure');
      }
      return originalCreate(creation);
    };

    const recovered = await assertAuthorityWriteFailureCanRetry(ctx, input, /injected N7 authority write failure/, async () => {
      assert.ok(captured);
      const materialization = captured.materializations[0]!;
      assert.equal(await ctx.topicQuestionRepository.findSelectionDecisionById(captured.decision.topic_question_selection_decision_id), null);
      assert.equal(await ctx.topicQuestionRepository.findTopicQuestionById(materialization.topic_question.topic_question_id), null);
      assert.equal(
        await ctx.topicQuestionRepository.findTopicQuestionContractById(
          materialization.topic_question_contract.topic_question_contract_id,
        ),
        null,
      );
      assert.equal(
        await ctx.topicQuestionRepository.findAnswerabilityPlanById(
          materialization.answerability_plan.topic_question_answerability_plan_id,
        ),
        null,
      );
      await assertNoRuntimeContextProjectionForAttempt(ctx, input);
    });
    const currentCheckpoint = await ctx.researchCheckpointRepository.findCurrentCheckpoint(
      TITLE_CARD_ID,
      'question_contract',
    );
    assert.equal(currentCheckpoint?.target_ref.ref_id, recovered.authority_ref?.ref_id);
    const checkpointHistory = await ctx.researchCheckpointRepository.listCheckpointsByTitleCardId(TITLE_CARD_ID);
    assert.equal(checkpointHistory.filter((checkpoint) => checkpoint.checkpoint_kind === 'question_contract').length, 2);
    assert.equal(checkpointHistory[0]?.status, 'superseded');
  }

  {
    const ctx = await seedHarnessV1aBundle();
    const { n7 } = await runReadyN7(ctx);
    const baseInput = await n8Request(ctx, n7);
    const draft = n8ValueDraft(baseInput);
    const input = {
      ...baseInput,
      semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, baseInput, draft)],
    };
    const originalCreate = ctx.valueAssessmentRepository.createAssessmentWithMemo.bind(ctx.valueAssessmentRepository);
    let captured: Parameters<typeof ctx.valueAssessmentRepository.createAssessmentWithMemo>[0] | null = null;
    let failNextWrite = true;
    ctx.valueAssessmentRepository.createAssessmentWithMemo = async (creation) => {
      if (failNextWrite) {
        failNextWrite = false;
        captured = creation;
        throw new Error('injected N8 authority write failure');
      }
      return originalCreate(creation);
    };

    await assertAuthorityWriteFailureCanRetry(ctx, input, /injected N8 authority write failure/, async () => {
      assert.ok(captured);
      assert.equal(
        await ctx.valueAssessmentRepository.findAssessmentRunById(
          captured.assess_topic_value_run.assess_topic_value_run_id,
        ),
        null,
      );
      assert.equal(
        await ctx.valueAssessmentRepository.findInputSnapshotById(
          captured.topic_value_input_snapshot.topic_value_input_snapshot_id,
        ),
        null,
      );
      assert.equal(
        await ctx.valueAssessmentRepository.findAssessmentById(
          captured.topic_value_assessment.topic_value_assessment_id,
        ),
        null,
      );
      assert.equal(
        await ctx.valueAssessmentRepository.findReasoningMemoById(
          captured.value_reasoning_memo.value_reasoning_memo_id,
        ),
        null,
      );
    });
  }

  {
    const ctx = await seedHarnessV1aBundle();
    const { n9 } = await runReadyN9(ctx);
    const input = await n10Request(ctx, n9);
    const originalCreate = ctx.topicPackageRepository.createDraftPackageAuthority.bind(ctx.topicPackageRepository);
    let captured: Parameters<typeof ctx.topicPackageRepository.createDraftPackageAuthority>[0] | null = null;
    let failNextWrite = true;
    ctx.topicPackageRepository.createDraftPackageAuthority = async (creation) => {
      if (failNextWrite) {
        failNextWrite = false;
        captured = creation;
        throw new Error('injected N10 authority write failure');
      }
      return originalCreate(creation);
    };

    await assertAuthorityWriteFailureCanRetry(ctx, input, /injected N10 authority write failure/, async () => {
      assert.ok(captured);
      assert.equal(await ctx.topicPackageRepository.findPackageById(captured.topic_package.topic_package_id), null);
      assert.equal(
        await ctx.topicPackageRepository.findTraceBoundaryCheckById(
          captured.package_trace_boundary_check.package_trace_boundary_check_id,
        ),
        null,
      );
      assert.equal(
        await ctx.topicPackageRepository.findReadinessAssessmentById(
          captured.package_readiness_assessment.package_readiness_assessment_id,
        ),
        null,
      );
      if (captured.v1c_input_bundle) {
        assert.equal(
          await ctx.topicPackageRepository.findV1cInputBundleById(
            captured.v1c_input_bundle.v1b_to_v1c_input_bundle_id,
          ),
          null,
        );
      }
    });
  }
});

test('v1b workflow harness N5 accepts Codex delegated selection only with matching semantic provenance', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n4 } = await runReadyN4(ctx);
  const option = await selectedN4Option(ctx, n4);
  const accepted = acceptedSliceSelectionPayload(option);
  const input = n5Request(n4, accepted, {
    workflow_run_id: 'workflow_run_v1b_n5_codex',
    node_attempt_id: 'node_attempt_v1b_n5_codex',
    run_mode: 'acceptance',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.slice_selection_support,
  });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      await generateEarlySemanticSupportArtifact(
        ctx,
        input,
        'n5_slice_selection_review',
        accepted,
      ),
    ],
  });

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.error_code, null);
  assert.equal(result.hashes.semantic_artifact_hash?.length, 64);
});

test('v1b workflow harness N5 blocks Codex delegated payload without matching artifact before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n4 } = await runReadyN4(ctx);
  const option = await selectedN4Option(ctx, n4);
  const accepted = acceptedSliceSelectionPayload(option);
  const input = n5Request(n4, accepted);
  const acceptedHash = sha256Text(stableStringify(accepted));
  const result = await ctx.service.invokeNode({
    ...input,
    frozen_input: {
      ...input.frozen_input,
      payload: {
        ...input.frozen_input.payload,
        authority_input_provider: 'codex_delegated',
        delegation_artifact_hash: acceptedHash,
      },
      frozen_input_hash: null,
    },
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N5_CODEX_DELEGATION_ARTIFACT_REQUIRED');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N5 request_more_options writes only decision and loops back without N6 handoff', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n4 } = await runReadyN4(ctx);
  const option = await selectedN4Option(ctx, n4);
  const accepted = acceptedSliceSelectionPayload(option, {
    decision: 'request_more_options',
    selected_option_ref: null,
    selected_option_hash: null,
    selection_rationale: 'The option set is too narrow for downstream candidate generation.',
    required_actions: ['regenerate broader research slice options'],
    loopback_target: 'plan_research_slice_run',
    loopback_reason_code: 'insufficient_option_coverage',
  });
  const result = await ctx.service.invokeNode(n5Request(n4, accepted));

  assert.equal(result.gate_status, 'terminal_no_advance');
  assert.equal(result.failure_class, 'terminal_no_advance');
  assert.equal(result.route_decision, 'loopback');
  assert.equal(result.authority_ref?.ref_type, 'slice_selection_decision');
  assert.equal(result.handoff_ref, null);
  const decision = await ctx.researchSliceRepository.findSelectionDecisionById(result.authority_ref!.ref_id);
  assert.equal(decision?.decision, 'request_more_options');
  assert.equal(decision?.output_research_slice_ref, null);
  const optionSet = await ctx.researchSliceRepository.findOptionSetById(n4.authority_ref!.ref_id);
  assert.equal(optionSet?.status, 'needs_more_options');
  assert.equal(optionSet?.selected_option_id, null);
});

test('v1b workflow harness N5 blocks option hash drift and high-risk selection without delegation', async () => {
  const driftCtx = await seedHarnessV1aBundle();
  const { n4: driftN4 } = await runReadyN4(driftCtx);
  const option = await selectedN4Option(driftCtx, driftN4);
  const driftResult = await driftCtx.service.invokeNode(n5Request(driftN4, acceptedSliceSelectionPayload(option, {
    selected_option_hash: 'f'.repeat(64),
  })));
  assert.equal(driftResult.gate_status, 'blocked');
  assert.equal(driftResult.error_code, 'N5_SELECTED_OPTION_HASH_MISMATCH');
  assert.equal(driftResult.authority_ref, null);
  assert.equal(driftResult.handoff_ref, null);

  const riskCtx = await seedHarnessV1aBundle();
  const { n1, n2, n3 } = await runReadyN3(riskCtx);
  const n4Input = n4Request(n1, n2, n3);
  const highRiskDraft = n4Draft({
    options: [
      {
        ...n4Draft().options[0]!,
        baseline_risk: 'high',
        human_review_triggers: ['high baseline risk'],
      },
    ],
  });
  const highRiskN4 = await riskCtx.service.invokeNode({
    ...n4Input,
    semantic_artifacts: [await recordN4DraftArtifact(riskCtx, n4Input, highRiskDraft)],
  });
  const highRiskOption = await selectedN4Option(riskCtx, highRiskN4);
  const highRiskResult = await riskCtx.service.invokeNode(
    n5Request(highRiskN4, acceptedSliceSelectionPayload(highRiskOption)),
  );
  assert.equal(highRiskResult.gate_status, 'blocked');
  assert.equal(highRiskResult.error_code, 'N5_HIGH_RISK_SELECTION_REQUIRES_ACCEPTED_RISK');
  assert.equal(highRiskResult.authority_ref, null);
  assert.equal(highRiskResult.handoff_ref, null);
});

test('v1b workflow harness N6 creates candidate set from frozen semantic draft artifact', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, input);
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref?.ref_type, 'topic_question_candidate_set');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
  assert.match(result.hashes.authority_hash ?? '', /^[a-f0-9]{64}$/);

  const candidateSet = await ctx.topicQuestionRepository.findCandidateSetById(result.authority_ref!.ref_id);
  assert.equal(candidateSet?.status, 'ready_for_selection');
  assert.equal(candidateSet?.candidate_count, 1);
  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(result.authority_ref!.ref_id);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.candidate_key, 'harness_candidate');
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(result.handoff_ref!.ref_id);
  const handoff = handoffArtifact?.payload as TopicSelectionV1bWorkflowHarnessHandoff | null;
  const handoffPayload = handoff?.payload as {
    admissible_candidate_hashes?: string[];
    admissible_candidate_refs?: TopicSelectionFunctionalRef[];
    topic_question_candidate_set_hash?: string;
  } | null;
  assert.equal(handoffPayload?.topic_question_candidate_set_hash, result.hashes.authority_hash);
  assert.equal(handoffPayload?.admissible_candidate_refs?.length, handoffPayload?.admissible_candidate_hashes?.length);
  assert.equal(handoffPayload?.admissible_candidate_refs?.[0]?.ref_id, candidates[0]?.topic_question_candidate_id);
  assert.match(handoffPayload?.admissible_candidate_hashes?.[0] ?? '', /^[a-f0-9]{64}$/);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.equal(
    transitionRecord?.created_authority_refs.some((authorityRef) => authorityRef.ref_type === 'topic_question_contract') ?? false,
    false,
  );
});

test('v1b workflow harness N6 successfully stops an evidence-grounded no-viable portfolio without candidate authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, input);
  const evidenceRef = draft.question_frame.evidence_refs[0]!;
  const noViableDraft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload = {
    ...draft,
    recommended_candidate_keys: [],
    candidates: [],
    portfolio_disposition: {
      outcome: 'none_viable',
      rationale: 'Every visible question framing is defeated by the frozen evidence.',
      confidence: 0.87,
      evidence_refs: [evidenceRef],
      rejection_reasons: [
        {
          reason_code: 'unidentifiable_or_unfalsifiable_mechanism',
          summary: 'The selected slice cannot support a falsifiable research question.',
          evidence_refs: [evidenceRef],
        },
      ],
      reopening_conditions: ['Reopen when evidence supports a falsifiable mechanism.'],
      candidate_dispositions: [],
    },
  };
  const requestWithDraft = {
    ...input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, input, noViableDraft)],
  };
  const result = await ctx.service.invokeNode(requestWithDraft);

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'stop_v1b_complete');
  assert.equal(result.failure_class, null);
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, []);
  const replay = await ctx.service.invokeNode(requestWithDraft);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.route_decision, 'stop_v1b_complete');
  assert.equal(replay.authority_ref, null);
});

test('v1b workflow harness N6 blocks an evidence-free no-viable portfolio before candidate authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, input);
  const noViableDraft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload = {
    ...draft,
    recommended_candidate_keys: [],
    candidates: [],
    portfolio_disposition: {
      outcome: 'none_viable',
      rationale: 'No visible question should advance.',
      confidence: 0.87,
      evidence_refs: [],
      rejection_reasons: [
        {
          reason_code: 'unidentifiable_or_unfalsifiable_mechanism',
          summary: 'The selected slice cannot support a falsifiable research question.',
          evidence_refs: [],
        },
      ],
      reopening_conditions: ['Reopen when evidence supports a falsifiable mechanism.'],
      candidate_dispositions: [],
    },
  };
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, input, noViableDraft)],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.route_decision, 'blocked');
  assert.equal(result.error_code, 'N6_NON_SELECTED_PORTFOLIO_INVALID');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N6 routes evidence expansion without manufacturing candidate authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, input);
  const evidenceRef = draft.question_frame.evidence_refs[0]!;
  const expansionDraft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload = {
    ...draft,
    recommended_candidate_keys: [],
    candidates: [],
    portfolio_disposition: {
      outcome: 'evidence_expansion_required',
      rationale: 'The visible evidence cannot distinguish viable question framings.',
      confidence: 0.76,
      evidence_refs: [evidenceRef],
      rejection_reasons: [
        {
          reason_code: 'evidence_coverage_insufficient',
          summary: 'Nearest-work coverage is insufficient for a bounded question decision.',
          evidence_refs: [evidenceRef],
        },
      ],
      reopening_conditions: ['Re-enter N6 only after a refreshed v1a evidence bundle is current.'],
      candidate_dispositions: [],
    },
  };
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, input, expansionDraft)],
  });

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'expand_evidence');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N6 routes question-scope reframe to slice selection without candidate authority', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, input);
  const evidenceRef = draft.question_frame.evidence_refs[0]!;
  const reframeDraft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload = {
    ...draft,
    recommended_candidate_keys: [],
    candidates: [],
    portfolio_disposition: {
      outcome: 'reframe_required',
      rationale: 'The selected research slice cannot express a falsifiable question.',
      confidence: 0.83,
      evidence_refs: [evidenceRef],
      rejection_reasons: [
        {
          reason_code: 'research_scope_misaligned',
          summary: 'The selected slice conflicts with the bounded mechanism and evaluation constraints.',
          evidence_refs: [evidenceRef],
        },
      ],
      reopening_conditions: ['Select a different N5 research slice before regenerating questions.'],
      candidate_dispositions: [],
    },
  };
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, input, reframeDraft)],
  });

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'reframe_scope');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N6 preserves selected parked and dropped candidate dispositions', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, input);
  const evidenceRef = draft.question_frame.evidence_refs[0]!;
  const baseCandidate = draft.candidates[0]!;
  const dispositionDraft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload = {
    ...draft,
    candidates: [
      baseCandidate,
      {
        ...baseCandidate,
        candidate_key: 'parked_data_question',
        main_question: 'Can a data-dependent question improve replayable v1b topic selection?',
      },
      {
        ...baseCandidate,
        candidate_key: 'dropped_duplicate_question',
        main_question: 'Can a dominated question improve replayable v1b topic selection?',
      },
    ],
    portfolio_disposition: {
      outcome: 'selected',
      rationale: 'One question dominates while two alternatives remain explicitly classified.',
      confidence: 0.85,
      evidence_refs: [evidenceRef],
      rejection_reasons: [],
      reopening_conditions: [],
      candidate_dispositions: [
        {
          candidate_key: 'harness_candidate',
          disposition: 'selected',
          rationale: 'This question best fits the bounded evidence and execution constraints.',
          evidence_refs: [evidenceRef],
          reopening_conditions: [],
        },
        {
          candidate_key: 'parked_data_question',
          disposition: 'parked',
          rationale: 'This question becomes useful only when the missing dataset is available.',
          evidence_refs: [evidenceRef],
          reopening_conditions: ['Reopen after the required dataset is current.'],
        },
        {
          candidate_key: 'dropped_duplicate_question',
          disposition: 'dropped',
          rationale: 'This question is strictly dominated by the selected framing.',
          evidence_refs: [evidenceRef],
          drop_reason_code: 'strictly_dominated_by_visible_candidate',
          reopening_conditions: [],
        },
      ],
    },
  };
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, input, dispositionDraft)],
  });

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(result.authority_ref!.ref_id);
  assert.equal(candidates.find((candidate) => candidate.candidate_key === 'harness_candidate')?.status, 'recommended');
  assert.equal(candidates.find((candidate) => candidate.candidate_key === 'parked_data_question')?.status, 'parked');
  assert.equal(candidates.find((candidate) => candidate.candidate_key === 'dropped_duplicate_question')?.status, 'rejected');
  const candidateSet = await ctx.topicQuestionRepository.findCandidateSetById(result.authority_ref!.ref_id);
  assert.equal(
    (candidateSet?.admission_readiness.portfolio_disposition as { outcome?: string } | undefined)?.outcome,
    'selected',
  );
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(result.handoff_ref!.ref_id);
  const handoff = handoffArtifact?.payload as TopicSelectionV1bWorkflowHarnessHandoff | null;
  const handoffPayload = handoff?.payload as {
    admissible_candidate_refs?: TopicSelectionFunctionalRef[];
  } | null;
  assert.deepEqual(
    handoffPayload?.admissible_candidate_refs?.map((candidateRef) => candidateRef.ref_id),
    [candidates.find((candidate) => candidate.candidate_key === 'harness_candidate')?.topic_question_candidate_id],
  );
});

test('v1b workflow harness N6 rejects ambiguous selected and incomplete non-selected portfolios', async () => {
  const selectedCtx = await seedHarnessV1aBundle();
  const { n5: selectedN5 } = await runReadyN5(selectedCtx);
  const selectedInput = await n6Request(selectedCtx, selectedN5);
  const selectedDraft = await n6Draft(selectedCtx, selectedInput);
  const selectedEvidenceRef = selectedDraft.question_frame.evidence_refs[0]!;
  const ambiguousResult = await selectedCtx.service.invokeNode({
    ...selectedInput,
    semantic_artifacts: [await recordN6DraftArtifact(selectedCtx, selectedInput, {
      ...selectedDraft,
      portfolio_disposition: {
        outcome: 'selected',
        rationale: 'The portfolio claims selection but does not classify a selected question.',
        confidence: 0.81,
        evidence_refs: [selectedEvidenceRef],
        rejection_reasons: [],
        reopening_conditions: [],
        candidate_dispositions: [
          {
            candidate_key: 'harness_candidate',
            disposition: 'dropped',
            rationale: 'This deliberately contradicts the set-level selected outcome.',
            evidence_refs: [selectedEvidenceRef],
            drop_reason_code: 'strictly_dominated_by_visible_candidate',
            reopening_conditions: [],
          },
        ],
      },
    })],
  });
  assert.equal(ambiguousResult.gate_status, 'blocked');
  assert.equal(ambiguousResult.error_code, 'N6_SELECTED_PORTFOLIO_INVALID');
  assert.equal(ambiguousResult.authority_ref, null);

  const expansionCtx = await seedHarnessV1aBundle();
  const { n5: expansionN5 } = await runReadyN5(expansionCtx);
  const expansionInput = await n6Request(expansionCtx, expansionN5);
  const expansionDraft = await n6Draft(expansionCtx, expansionInput);
  const expansionEvidenceRef = expansionDraft.question_frame.evidence_refs[0]!;
  const incompleteResult = await expansionCtx.service.invokeNode({
    ...expansionInput,
    semantic_artifacts: [await recordN6DraftArtifact(expansionCtx, expansionInput, {
      ...expansionDraft,
      recommended_candidate_keys: [],
      portfolio_disposition: {
        outcome: 'evidence_expansion_required',
        rationale: 'The current evidence cannot distinguish the existing question candidate.',
        confidence: 0.74,
        evidence_refs: [expansionEvidenceRef],
        rejection_reasons: [
          {
            reason_code: 'evidence_coverage_insufficient',
            summary: 'The visible evidence leaves the question candidate unresolved.',
            evidence_refs: [expansionEvidenceRef],
          },
        ],
        reopening_conditions: ['Refresh evidence before returning to the question portfolio.'],
        candidate_dispositions: [],
      },
    })],
  });
  assert.equal(incompleteResult.gate_status, 'blocked');
  assert.equal(incompleteResult.error_code, 'N6_NON_SELECTED_PORTFOLIO_INVALID');
  assert.equal(incompleteResult.authority_ref, null);
});

test('v1b workflow harness N6 requires frozen draft artifact and does not live execute execution_spec alone', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
    run_mode: 'acceptance',
  });
  const result = await ctx.service.invokeNode(input);

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N6_FROZEN_DRAFT_ARTIFACT_REQUIRED');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N6 blocks malformed or structurally drifting candidate drafts', async () => {
  const duplicateCtx = await seedHarnessV1aBundle();
  const { n5: duplicateN5 } = await runReadyN5(duplicateCtx);
  const duplicateInput = await n6Request(duplicateCtx, duplicateN5);
  const baseDraft = await n6Draft(duplicateCtx, duplicateInput);
  const duplicateResult = await duplicateCtx.service.invokeNode({
    ...duplicateInput,
    semantic_artifacts: [
      await recordN6DraftArtifact(duplicateCtx, duplicateInput, {
        ...baseDraft,
        candidates: [
          baseDraft.candidates[0]!,
          {
            ...baseDraft.candidates[0]!,
            main_question: 'How can a second candidate test duplicate candidate-key blocking in N6?',
          },
        ],
      }),
    ],
  });
  assert.equal(duplicateResult.gate_status, 'blocked');
  assert.equal(duplicateResult.error_code, 'N6_DUPLICATE_TOPIC_QUESTION_CANDIDATE_KEY');
  assert.equal(duplicateResult.authority_ref, null);

  const driftCtx = await seedHarnessV1aBundle();
  const { n5: driftN5 } = await runReadyN5(driftCtx);
  const driftInput = await n6Request(driftCtx, driftN5);
  const driftDraft = await n6Draft(driftCtx, driftInput);
  const driftResult = await driftCtx.service.invokeNode({
    ...driftInput,
    semantic_artifacts: [
      await recordN6DraftArtifact(driftCtx, driftInput, {
        ...driftDraft,
        candidates: [
          {
            ...driftDraft.candidates[0]!,
            traceability_check: {
              ...driftDraft.candidates[0]!.traceability_check,
              support_evidence_refs: [ref('evidence_unit', 'unknown_evidence_unit', TITLE_CARD_ID)],
            },
          },
        ],
      }),
    ],
  });
  assert.equal(driftResult.gate_status, 'blocked');
  assert.equal(driftResult.error_code, 'N6_UNKNOWN_EVIDENCE_REF');
  assert.equal(driftResult.authority_ref, null);

  const hashCtx = await seedHarnessV1aBundle();
  const { n5: hashN5 } = await runReadyN5(hashCtx);
  const hashInput = await n6Request(hashCtx, hashN5);
  const hashDraft = await n6Draft(hashCtx, hashInput);
  const hashArtifact = await recordN6DraftArtifact(hashCtx, hashInput, hashDraft);
  const hashResult = await hashCtx.service.invokeNode({
    ...hashInput,
    semantic_artifacts: [
      {
        ...hashArtifact,
        structured_output_hash: 'f'.repeat(64),
      },
    ],
  });
  assert.equal(hashResult.gate_status, 'blocked');
  assert.equal(hashResult.error_code, 'N6_FROZEN_DRAFT_ARTIFACT_HASH_MISMATCH');
  assert.equal(hashResult.authority_ref, null);
});

test('v1b workflow harness N6 emits loopback with no authority when all candidates fail semantic gate', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, input);
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, input, {
        ...draft,
        candidates: [
          {
            ...draft.candidates[0]!,
            answerability_verdict: 'not_answerable',
            main_question: 'How can AI improve research?',
          },
        ],
      }),
    ],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.failure_class, 'semantic_non_pass');
  assert.equal(result.route_decision, 'loopback');
  assert.equal(result.error_code, 'N6_NO_ADMISSIBLE_TOPIC_QUESTION_CANDIDATE');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  await assertTraceLoopbackTargetCode(ctx, result, 'n6_regenerate_candidates');
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N6 applies loopback triage for debate escalation and upstream rollback', async () => {
  const debateCtx = await seedHarnessV1aBundle();
  const { n5: debateN5 } = await runReadyN5(debateCtx);
  const debateInput = await n6Request(debateCtx, debateN5, {
    workflow_run_id: 'workflow_run_v1b_n6_debate_triage',
    node_attempt_id: 'node_attempt_v1b_n6_debate_triage',
  });
  const debateDraft = await n6Draft(debateCtx, debateInput);
  const debateResult = await debateCtx.service.invokeNode({
    ...debateInput,
    semantic_artifacts: [
      await recordN6DraftArtifact(debateCtx, debateInput, {
        ...debateDraft,
        candidates: [
          {
            ...debateDraft.candidates[0]!,
            answerability_verdict: 'not_answerable',
            main_question: 'How can AI improve research?',
          },
        ],
      }),
      await recordN6LoopbackTriageArtifact(debateCtx, debateInput, n6LoopbackTriagePayload(debateInput, {
        loopback_target_code: 'n6_debate_escalation',
        debate_escalation: {
          debate_level: 'mixed_cost_control',
          recommended_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
          sticky: true,
          rationale: 'Escalate the next candidate generation pass to debate-shaped review before retrying N6.',
        },
        upstream_rollback: null,
        rationale: 'Candidate failures look like prompt contention rather than a bad selected slice.',
      })),
    ],
  });
  assert.equal(debateResult.gate_status, 'blocked');
  assert.equal(debateResult.route_decision, 'loopback');
  assert.equal(debateResult.authority_ref, null);
  assert.equal(debateResult.handoff_ref, null);
  assert.ok(debateResult.warnings.some((warning) => warning.code === 'N6_DEBATE_ESCALATION_RECOMMENDED'));
  // D-30: no provisional tripwire on any escalation (retired; thresholds are advisory heuristics).
  assert.equal(debateResult.warnings.some((warning) => warning.code === 'N6_DEBATE_THRESHOLDS_PROVISIONAL'), false);
  const debateTrace = await assertTraceLoopbackTargetCode(
    debateCtx,
    debateResult,
    'n6_debate_escalation',
    'topic-selection.v1b.generate-topic-question-candidates.v1',
  );
  assert.equal((debateTrace.payload.debate_escalation as { sticky?: boolean } | null)?.sticky, true);
  assert.equal(debateTrace.payload.upstream_rollback, null);

  const rollbackCtx = await seedHarnessV1aBundle();
  const { n5: rollbackN5 } = await runReadyN5(rollbackCtx);
  const rollbackInput = await n6Request(rollbackCtx, rollbackN5, {
    workflow_run_id: 'workflow_run_v1b_n6_upstream_rollback',
    node_attempt_id: 'node_attempt_v1b_n6_upstream_rollback',
  });
  const rollbackDraft = await n6Draft(rollbackCtx, rollbackInput);
  const rollbackResult = await rollbackCtx.service.invokeNode({
    ...rollbackInput,
    semantic_artifacts: [
      await recordN6DraftArtifact(rollbackCtx, rollbackInput, {
        ...rollbackDraft,
        candidates: [
          {
            ...rollbackDraft.candidates[0]!,
            answerability_verdict: 'not_answerable',
            main_question: 'How can AI improve research?',
          },
        ],
      }),
      await recordN6LoopbackTriageArtifact(rollbackCtx, rollbackInput, n6LoopbackTriagePayload(rollbackInput, {
        loopback_target_code: 'n6_loopback_to_n5_select_different_slice',
        failure_scope: 'slice_level',
        debate_escalation: null,
        upstream_rollback: {
          target_node_id: 'topic-selection.v1b.select-research-slice.v1',
          repair_action: 'select_different_slice',
          rationale: 'The selected ResearchSlice is too broad to yield an admissible TopicQuestion.',
        },
        rationale: 'The failure is slice-level; retrying N6 against the same slice would repeat the same failure.',
      })),
    ],
  });
  assert.equal(rollbackResult.gate_status, 'blocked');
  assert.equal(rollbackResult.route_decision, 'loopback');
  assert.equal(rollbackResult.authority_ref, null);
  assert.equal(rollbackResult.handoff_ref, null);
  const rollbackTrace = await assertTraceLoopbackTargetCode(
    rollbackCtx,
    rollbackResult,
    'n6_loopback_to_n5_select_different_slice',
    'topic-selection.v1b.select-research-slice.v1',
  );
  assert.equal(
    (rollbackTrace.payload.upstream_rollback as { repair_action?: string } | null)?.repair_action,
    'select_different_slice',
  );
  assert.equal(rollbackTrace.payload.debate_escalation, null);
  assert.deepEqual(await rollbackCtx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N6 blocks inconsistent loopback triage before routing', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_bad_triage',
    node_attempt_id: 'node_attempt_v1b_n6_bad_triage',
  });
  const result = await invokeN6WithFailedDraftAndTriage(ctx, input, n6LoopbackTriagePayload(input, {
    loopback_target_code: 'n6_debate_escalation',
    debate_escalation: null,
  }));

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.route_decision, 'blocked');
  assert.equal(result.error_code, 'N6_LOOPBACK_TRIAGE_POLICY_MISMATCH');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);

  const scopeCtx = await seedHarnessV1aBundle();
  const { n5: scopeN5 } = await runReadyN5(scopeCtx);
  const scopeInput = await n6Request(scopeCtx, scopeN5, {
    workflow_run_id: 'workflow_run_v1b_n6_bad_triage_scope',
    node_attempt_id: 'node_attempt_v1b_n6_bad_triage_scope',
  });
  const scopeResult = await invokeN6WithFailedDraftAndTriage(scopeCtx, scopeInput, n6LoopbackTriagePayload(scopeInput, {
    loopback_target_code: 'n6_loopback_to_n5_select_different_slice',
    failure_scope: 'candidate_level',
    debate_escalation: null,
    upstream_rollback: {
      target_node_id: 'topic-selection.v1b.select-research-slice.v1',
      repair_action: 'select_different_slice',
      rationale: 'The selected ResearchSlice is too broad to yield an admissible TopicQuestion.',
    },
  }));
  assert.equal(scopeResult.gate_status, 'blocked');
  assert.equal(scopeResult.route_decision, 'blocked');
  assert.equal(scopeResult.error_code, 'N6_LOOPBACK_TRIAGE_POLICY_MISMATCH');
  assert.equal(scopeResult.authority_ref, null);
  assert.equal(scopeResult.handoff_ref, null);
  assert.deepEqual(await scopeCtx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);

  const lineageCtx = await seedHarnessV1aBundle();
  const { n5: lineageN5 } = await runReadyN5(lineageCtx);
  const lineageInput = await n6Request(lineageCtx, lineageN5, {
    workflow_run_id: 'workflow_run_v1b_n6_bad_triage_refs',
    node_attempt_id: 'node_attempt_v1b_n6_bad_triage_refs',
  });
  const lineageResult = await invokeN6WithFailedDraftAndTriage(
    lineageCtx,
    lineageInput,
    n6LoopbackTriagePayload(lineageInput, {
      affected_refs: [ref('research_slice', 'research_slice_outside_frozen_n6_lineage', TITLE_CARD_ID)],
    }),
  );
  assert.equal(lineageResult.gate_status, 'blocked');
  assert.equal(lineageResult.route_decision, 'blocked');
  assert.equal(lineageResult.error_code, 'N6_LOOPBACK_TRIAGE_AFFECTED_REFS_MISMATCH');
  assert.equal(lineageResult.authority_ref, null);
  assert.equal(lineageResult.handoff_ref, null);
  assert.deepEqual(await lineageCtx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);

  const artifactCtx = await seedHarnessV1aBundle();
  const { n5: artifactN5 } = await runReadyN5(artifactCtx);
  const artifactInput = await n6Request(artifactCtx, artifactN5, {
    workflow_run_id: 'workflow_run_v1b_n6_bad_triage_artifact',
    node_attempt_id: 'node_attempt_v1b_n6_bad_triage_artifact',
  });
  const artifactDraft = await n6Draft(artifactCtx, artifactInput);
  const triageArtifact = await recordN6LoopbackTriageArtifact(
    artifactCtx,
    artifactInput,
    n6LoopbackTriagePayload(artifactInput),
  );
  const wrongSupportArtifact = await artifactCtx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: artifactInput.workflow_run_id,
    payload: { wrong_support: true },
    created_by: 'system',
  });
  const artifactResult = await artifactCtx.service.invokeNode({
    ...artifactInput,
    semantic_artifacts: [
      await recordN6DraftArtifact(artifactCtx, artifactInput, {
        ...artifactDraft,
        candidates: [
          {
            ...artifactDraft.candidates[0]!,
            answerability_verdict: 'not_answerable',
            main_question: 'How can AI improve research?',
          },
        ],
      }),
      {
        ...triageArtifact,
        support_artifact_ref: ref('artifact_ref', wrongSupportArtifact.artifact_ref_id, TITLE_CARD_ID),
      },
    ],
  });
  assert.equal(artifactResult.gate_status, 'blocked');
  assert.equal(artifactResult.route_decision, 'blocked');
  assert.equal(artifactResult.error_code, 'N6_LOOPBACK_TRIAGE_ARTIFACT_HASH_MISMATCH');
  assert.equal(artifactResult.authority_ref, null);
  assert.equal(artifactResult.handoff_ref, null);
  assert.deepEqual(await artifactCtx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N6 admits runtime-verified loopback triage in product mode', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_triage',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_triage',
  });
  const failedDraft = await n6Draft(ctx, input);
  failedDraft.candidates[0] = {
    ...failedDraft.candidates[0]!,
    answerability_verdict: 'not_answerable',
    main_question: 'How can AI improve research?',
  };
  const draftArtifact = await generateN6RuntimeDraftArtifact(ctx, input, failedDraft);
  const draftHash = sha256Text(stableStringify(failedDraft));
  const triageArtifact = await generateN6RuntimeLoopbackTriageArtifact(
    ctx,
    input,
    draftArtifact,
    draftHash,
    n6LoopbackTriagePayload(input, {
      loopback_target_code: 'n6_debate_escalation',
      debate_escalation: {
        debate_level: 'mixed_cost_control',
        recommended_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
        sticky: true,
        rationale: 'Escalate the next candidate generation pass to runtime-supported debate before retrying N6.',
      },
      upstream_rollback: null,
      rationale: 'Runtime triage classifies the failed draft as candidate-level contention rather than a bad slice.',
    }),
  );
  assert.equal(triageArtifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(triageArtifact.prompt_variant_key, 'n6_loopback_triage');
  assert.equal(triageArtifact.source_hashes.failed_draft_hash, draftHash);

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [draftArtifact, triageArtifact],
  });
  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.route_decision, 'loopback');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  assert.ok(result.warnings.some((warning) => warning.code === 'N6_DEBATE_ESCALATION_RECOMMENDED'));
  // D-30 (2026-07-07): the former W-07 f6 provisional product tripwire is retired — thresholds are
  // advisory routing heuristics, so a product escalation carries no provisional warning any more.
  assert.equal(result.warnings.some((warning) => warning.code === 'N6_DEBATE_THRESHOLDS_PROVISIONAL'), false);
  await assertTraceLoopbackTargetCode(
    ctx,
    result,
    'n6_debate_escalation',
    'topic-selection.v1b.generate-topic-question-candidates.v1',
  );
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N6 runtime loopback triage drift and fixture product misuse block', async () => {
  const driftCtx = await seedHarnessV1aBundle();
  const { n5: driftN5 } = await runReadyN5(driftCtx);
  const driftInput = await n6Request(driftCtx, driftN5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_triage_drift',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_triage_drift',
  });
  const driftFailedDraft = await n6Draft(driftCtx, driftInput);
  driftFailedDraft.candidates[0] = {
    ...driftFailedDraft.candidates[0]!,
    answerability_verdict: 'not_answerable',
    main_question: 'How can AI improve research?',
  };
  const driftDraftArtifact = await generateN6RuntimeDraftArtifact(driftCtx, driftInput, driftFailedDraft);
  const driftDraftHash = sha256Text(stableStringify(driftFailedDraft));
  const driftTriageArtifact = await generateN6RuntimeLoopbackTriageArtifact(
    driftCtx,
    driftInput,
    driftDraftArtifact,
    driftDraftHash,
    n6LoopbackTriagePayload(driftInput),
  );
  const driftResult = await driftCtx.service.invokeNode({
    ...driftInput,
    semantic_artifacts: [
      driftDraftArtifact,
      {
        ...driftTriageArtifact,
        source_hashes: {
          ...driftTriageArtifact.source_hashes,
          failed_draft_hash: '9'.repeat(64),
        },
      },
    ],
  });
  assert.equal(driftResult.gate_status, 'blocked');
  assert.equal(driftResult.route_decision, 'blocked');
  assert.equal(driftResult.error_code, 'N6_LOOPBACK_TRIAGE_ARTIFACT_SOURCE_HASH_DRIFT');
  assert.equal(driftResult.authority_ref, null);
  assert.equal(driftResult.handoff_ref, null);

  const fixtureCtx = await seedHarnessV1aBundle();
  const { n5: fixtureN5 } = await runReadyN5(fixtureCtx);
  const fixtureInput = await n6Request(fixtureCtx, fixtureN5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_triage_fixture_misuse',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_triage_fixture_misuse',
  });
  const fixtureFailedDraft = await n6Draft(fixtureCtx, fixtureInput);
  fixtureFailedDraft.candidates[0] = {
    ...fixtureFailedDraft.candidates[0]!,
    answerability_verdict: 'not_answerable',
    main_question: 'How can AI improve research?',
  };
  const fixtureDraftArtifact = await generateN6RuntimeDraftArtifact(fixtureCtx, fixtureInput, fixtureFailedDraft);
  const fixtureTriageArtifact = await recordN6LoopbackTriageArtifact(
    fixtureCtx,
    fixtureInput,
    n6LoopbackTriagePayload(fixtureInput),
  );
  const fixtureResult = await fixtureCtx.service.invokeNode({
    ...fixtureInput,
    semantic_artifacts: [fixtureDraftArtifact, fixtureTriageArtifact],
  });
  assert.equal(fixtureResult.gate_status, 'blocked');
  assert.equal(fixtureResult.route_decision, 'blocked');
  assert.equal(fixtureResult.error_code, 'N6_LOOPBACK_TRIAGE_ARTIFACT_PROVENANCE_CLASS_INVALID');
  assert.equal(fixtureResult.authority_ref, null);
  assert.equal(fixtureResult.handoff_ref, null);
});

test('v1b workflow harness N6 carries warnings and detects replay drift', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_replay',
    node_attempt_id: 'node_attempt_v1b_n6_replay',
  });
  const draft = await n6Draft(ctx, input, {
    human_review_triggers: ['review candidate risk note'],
  });
  draft.candidates[0] = {
    ...draft.candidates[0]!,
    risk_notes: ['Evidence coverage should be checked before value assessment.'],
  };
  const semanticArtifactRef = await recordN6DraftArtifact(ctx, input, draft);
  const first = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifactRef],
  });
  assert.equal(first.gate_status, 'admitted_with_warnings');
  assert.ok(first.warnings.some((warning) => warning.code === 'CANDIDATE_RISK_NOTE_PRESENT'));

  const replay = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifactRef],
  });
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.authority_ref?.ref_id, first.authority_ref?.ref_id);

  const driftDraft = await n6Draft(ctx, input, {
    generation_notes: ['Changed semantic artifact should drift replay identity.'],
  });
  const drift = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, input, driftDraft)],
  });
  assert.equal(drift.gate_status, 'blocked');
  assert.equal(drift.error_code, 'REPLAY_SEMANTIC_ARTIFACT_HASH_MISMATCH');
});

test('v1b workflow harness N6 admits runtime-verified Codex draft in product mode', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_verified_draft',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_verified_draft',
  });
  const draft = await n6Draft(ctx, input);
  const runtime = new TopicSelectionV1bN6DraftRuntimeService(ctx.controlPlane);
  const generated = await runtime.generateDraftArtifact({
    request: input,
    generation_mode: 'initial_from_n5',
    execution_mode: 'codex_assisted',
    run_mode: 'product',
    codex_response: {
      output: draft,
      operator_label: 'test-runtime',
    },
    created_by: 'system',
  });

  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected runtime N6 draft generation to succeed.');
  }
  assert.equal(generated.semantic_artifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(generated.semantic_artifact.prompt_variant_key, 'n6_question_candidate_draft.initial_from_n5');
  assert.equal(
    generated.semantic_artifact.context_policy_profile_id,
    'topic-selection.v1b.n6.question-candidate-draft.context-runtime@v1',
  );
  assert.notEqual(generated.semantic_artifact.prompt_packet_hash, 'c'.repeat(64));
  assert.ok(generated.semantic_artifact.runtime_audit_ref);
  assert.ok(generated.semantic_artifact.runtime_audit_hash);
  assert.equal(generated.semantic_artifact.source_hashes.n5_handoff_hash, input.frozen_input.payload.n5_handoff_hash);

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [generated.semantic_artifact],
  });
  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.authority_ref?.ref_type, 'topic_question_candidate_set');
});

// ---- T-127 W-07 loop closure (the SINGLE spanning end-to-end test): the v1b N6 divergent debate is
// asserted to close back onto the harness N6 gate "by construction" (the gate bridge funnels the arbiter's
// synthesized draft through the SAME single-agent draft path the harness admits). This proves it as one
// run: a mocked_llm fan-out debate (mirroring the runtime f5 e2e) shares THIS harness's control plane, so
// the bridged gate_draft.semantic_artifact resolves through resolveN6DraftPayload and ADMITS — identical to
// the non-debate single-agent admit path above. ----
function mockedDebateRole(
  slot: TopicSelectionV1bN6DivergentDebateRoleSlotId,
  idx: number,
  body: Record<string, unknown>,
): V1bN6DebateInputs {
  return {
    codex_response: null,
    mocked_output: {
      fixture_id: `n6_debate_${slot}_${idx}`,
      output: { schema_version: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1', role_slot: slot, ...body },
    } as never,
    instance_index: idx,
  };
}

test('v1b workflow harness N6 admits a divergent-debate-bridged gate draft (T-127 W-07 loop closure)', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    run_mode: 'test',
    workflow_run_id: 'workflow_run_v1b_n6_divergent_debate_loop_closure',
    node_attempt_id: 'node_attempt_v1b_n6_divergent_debate_loop_closure',
  });
  // The arbiter synthesizes the harness-aligned candidate-set draft (same fixture the non-debate gate admits),
  // so its bridged gate draft passes the N6 product-acceptance content checks against the seeded slice.
  const draft = await n6Draft(ctx, input);

  // The debate shares THIS harness's control plane so the gate bridge's recorded ArtifactRefs resolve in N6.
  const debate = new TopicSelectionV1bN6DivergentDebateRuntimeService(ctx.controlPlane);
  const result = await debate.runDivergentDebate({
    request: input,
    generation_mode: 'initial_from_n5',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    role_outputs: {
      n6_debate_explorer: [
        mockedDebateRole('n6_debate_explorer', 0, { candidate_seeds: [{ seed_id: 's0', question_framing: 'framing 0', evidence_refs: [] }] }),
        mockedDebateRole('n6_debate_explorer', 1, { candidate_seeds: [{ seed_id: 's1', question_framing: 'framing 1', evidence_refs: [] }] }),
      ],
      n6_debate_critic: [
        mockedDebateRole('n6_debate_critic', 0, { critic_findings: [{ finding_code: 'weak_topic_question_candidate_set', severity: 'note', statement: 'thin set' }] }),
      ],
      n6_debate_arbiter: [
        mockedDebateRole('n6_debate_arbiter', 0, { synthesized_candidate_set: draft }),
      ],
    },
    created_by: 'system',
  });

  assert.equal(result.status, 'completed');
  if (result.status !== 'completed') {
    throw new Error('Expected the divergent debate run to complete.');
  }
  assert.equal(result.gate_draft.status, 'succeeded');
  if (result.gate_draft.status !== 'succeeded') {
    throw new Error('Expected the bridged single-agent gate draft to succeed.');
  }
  // The bridge funnels the arbiter's synthesized set through byte-for-byte (not a substitute), and carries
  // single-agent runtime identity — so what the harness admits below is provably THIS debate's draft.
  assert.deepEqual(result.gate_draft.structured_output, draft);
  assert.equal(result.gate_draft.semantic_artifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(result.gate_draft.semantic_artifact.execution_mode, 'mocked_llm');

  // Loop closure: the debate-produced gate draft, fed back through the harness N6 node, earns the same admit
  // verdict (gate_status / route_decision / authority ref_type) the non-debate single-agent draft earns above.
  const n6 = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [result.gate_draft.semantic_artifact],
  });
  assert.equal(n6.gate_status, 'admitted');
  assert.equal(n6.route_decision, 'invoke_next');
  assert.equal(n6.authority_ref?.ref_type, 'topic_question_candidate_set');
});

test('v1b workflow harness N6 runtime draft exact replay does not rewrite authority artifacts', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_draft_replay',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_draft_replay',
  });
  const draft = await n6Draft(ctx, input);
  const semanticArtifact = await generateN6RuntimeDraftArtifact(ctx, input, draft);
  const first = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifact],
  });
  const artifactRefsBeforeReplay = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
  const replay = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifact],
  });
  const artifactRefsAfterReplay = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);

  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.authority_ref?.ref_id, first.authority_ref?.ref_id);
  assert.equal(replay.handoff_ref?.ref_id, first.handoff_ref?.ref_id);
  assert.equal(artifactRefsAfterReplay.length, artifactRefsBeforeReplay.length);
});

test('v1b workflow harness N6 runtime draft drift blocks before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_draft_source_drift',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_draft_source_drift',
  });
  const draft = await n6Draft(ctx, input);
  const semanticArtifact = await generateN6RuntimeDraftArtifact(ctx, input, draft);
  const blocked = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [{
      ...semanticArtifact,
      source_hashes: {
        ...semanticArtifact.source_hashes,
        n5_handoff_hash: '9'.repeat(64),
      },
    }],
  });

  assert.equal(blocked.gate_status, 'blocked');
  assert.equal(blocked.error_code, 'N6_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT');
  assert.equal(blocked.authority_ref, null);
  assert.equal(blocked.handoff_ref, null);
});

test('v1b workflow harness N6 runtime draft audit drift and legacy artifacts block before authority write', async () => {
  const auditCtx = await seedHarnessV1aBundle();
  const { n5: auditN5 } = await runReadyN5(auditCtx);
  const auditInput = await n6Request(auditCtx, auditN5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_draft_audit_drift',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_draft_audit_drift',
  });
  const auditDraft = await n6Draft(auditCtx, auditInput);
  const runtimeArtifact = await generateN6RuntimeDraftArtifact(auditCtx, auditInput, auditDraft);
  const auditBlocked = await auditCtx.service.invokeNode({
    ...auditInput,
    semantic_artifacts: [{
      ...runtimeArtifact,
      runtime_audit_hash: '6'.repeat(64),
    }],
  });

  assert.equal(auditBlocked.gate_status, 'blocked');
  assert.equal(auditBlocked.error_code, 'N6_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT');
  assert.equal(auditBlocked.authority_ref, null);
  assert.equal(auditBlocked.handoff_ref, null);

  const legacyCtx = await seedHarnessV1aBundle();
  const { n5: legacyN5 } = await runReadyN5(legacyCtx);
  const legacyInput = await n6Request(legacyCtx, legacyN5, {
    workflow_run_id: 'workflow_run_v1b_n6_legacy_draft',
    node_attempt_id: 'node_attempt_v1b_n6_legacy_draft',
  });
  const legacyDraft = await n6Draft(legacyCtx, legacyInput);
  const legacyArtifact = await recordN6DraftArtifact(legacyCtx, legacyInput, legacyDraft);
  const legacyBlocked = await legacyCtx.service.invokeNode({
    ...legacyInput,
    semantic_artifacts: [{
      ...legacyArtifact,
      runtime_provenance_class: 'legacy_unverified',
    }],
  });

  assert.equal(legacyBlocked.gate_status, 'blocked');
  assert.equal(legacyBlocked.error_code, 'N6_DRAFT_ARTIFACT_LEGACY_UNVERIFIED');
  assert.equal(legacyBlocked.authority_ref, null);
  assert.equal(legacyBlocked.handoff_ref, null);
});

test('v1b workflow harness N6 runtime draft cannot bypass deterministic candidate gates', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_draft_no_authority_bypass',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_draft_no_authority_bypass',
  });
  const draft = await n6Draft(ctx, input);
  const invalidDraft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload = {
    ...draft,
    candidates: [{
      ...draft.candidates[0]!,
      traceability_check: {
        ...draft.candidates[0]!.traceability_check,
        support_evidence_refs: [ref('research_slice_evidence_ref', 'unknown_runtime_evidence', TITLE_CARD_ID)],
      },
    }],
  };
  const semanticArtifact = await generateN6RuntimeDraftArtifact(ctx, input, invalidDraft);
  const blocked = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifact],
  });

  assert.equal(blocked.gate_status, 'blocked');
  assert.equal(blocked.error_code, 'N6_UNKNOWN_EVIDENCE_REF');
  assert.equal(blocked.authority_ref, null);
  assert.equal(blocked.handoff_ref, null);
});

test('v1b workflow harness N6 partial semantic failure admits only passing candidates without upstream rollback', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n4, n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_partial_semantic_failure',
    node_attempt_id: 'node_attempt_v1b_n6_partial_semantic_failure',
  });
  const draft = await n6Draft(ctx, input);
  const failedCandidate = {
    ...draft.candidates[0]!,
    answerability_verdict: 'not_answerable' as const,
    candidate_key: 'blocked_broad_candidate',
    main_question: 'How can AI improve research?',
  };
  const admittedCandidate = {
    ...draft.candidates[0]!,
    candidate_key: 'admitted_specific_candidate',
    expected_claim: 'Partial semantic gating preserves only answerable v1b topic-question candidates.',
    main_question: 'How can partial N6 semantic gating preserve only an answerable v1b topic-question candidate?',
  };

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, input, {
        ...draft,
        candidates: [failedCandidate, admittedCandidate],
        recommended_candidate_keys: ['blocked_broad_candidate', 'admitted_specific_candidate'],
      }),
    ],
  });

  assert.equal(result.gate_status, 'admitted_with_warnings');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.error_code, null);
  assert.ok(result.warnings.some((warning) => warning.code === 'BLOCKED_CANDIDATES_PRESENT'));
  assert.equal(result.warnings.some((warning) => warning.code === 'debate_escalation_recommended'), false);

  const candidateSet = await ctx.topicQuestionRepository.findCandidateSetById(result.authority_ref!.ref_id);
  assert.equal(candidateSet?.candidate_count, 1);
  assert.equal(candidateSet?.recommended_candidate_ids.length, 1);
  const readiness = candidateSet?.admission_readiness as {
    blocked_candidate_context?: Array<{ candidate_key?: string; dominant_reason?: string }>;
  } | undefined;
  assert.equal(readiness?.blocked_candidate_context?.length, 1);
  assert.equal(readiness?.blocked_candidate_context?.[0]?.candidate_key, 'blocked_broad_candidate');
  assert.equal(readiness?.blocked_candidate_context?.[0]?.dominant_reason, 'answerability_weak');

  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(result.authority_ref!.ref_id);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.candidate_key, 'admitted_specific_candidate');

  const trace = await ctx.controlPlane.getTraceSnapshot(result.trace_snapshot_ref!.ref_id);
  assert.equal(trace?.payload.loopback_target_code, undefined);
  const optionSet = await ctx.researchSliceRepository.findOptionSetById(n4.authority_ref!.ref_id);
  assert.equal(optionSet?.status, 'selected');
  const selectionDecision = await ctx.researchSliceRepository.findSelectionDecisionById(n5.authority_ref!.ref_id);
  assert.equal(selectionDecision?.decision, 'select');
  assert.equal(selectionDecision?.output_research_slice_ref?.ref_type, 'research_slice');
});

test('v1b workflow harness N6 rejects debate execution config before persistence', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const input = await n6Request(ctx, n5, {
    execution_spec: {
      debate_config: {
        profile_id: 'topic-selection.question-candidates.debate.unimplemented',
      },
      execution_mode: 'codex_assisted',
      model_option_id: null,
    } as unknown as TopicSelectionV1bWorkflowHarnessRunRequest['execution_spec'],
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
    run_mode: 'acceptance',
    workflow_run_id: 'workflow_run_v1b_n6_reject_debate_config',
    node_attempt_id: 'node_attempt_v1b_n6_reject_debate_config',
  });

  await assert.rejects(
    () => ctx.service.invokeNode(input),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.deepEqual(await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id), []);
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N7 materializes an active TopicQuestionContract from N6 handoff', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const input = await n7Request(ctx, n6);
  const result = await ctx.service.invokeNode(input);

  assert.equal(result.gate_status, 'admitted');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref?.ref_type, 'topic_question_contract');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');

  const contract = await ctx.topicQuestionRepository.findTopicQuestionContractById(result.authority_ref!.ref_id);
  assert.equal(contract?.status, 'active');
  const question = contract ? await ctx.topicQuestionRepository.findTopicQuestionById(contract.topic_question_id) : null;
  const plan = contract
    ? await ctx.topicQuestionRepository.findAnswerabilityPlanByContractId(contract.topic_question_contract_id)
    : null;
  const decision = contract
    ? await ctx.topicQuestionRepository.findSelectionDecisionById(contract.selection_decision_id)
    : null;
  assert.equal(question?.active_question_contract_id, result.authority_ref!.ref_id);
  assert.equal(plan?.answerability_verdict, 'answerable');
  assert.equal(decision?.decision, 'admit');
  const checkpoint = await ctx.researchCheckpointRepository.findCurrentCheckpoint(TITLE_CARD_ID, 'question_contract');
  assert.equal(checkpoint?.status, 'pending');
  assert.equal(checkpoint?.target_ref.ref_id, contract?.topic_question_contract_id);
  const packet = await ctx.researchCheckpointService.getPacket(checkpoint!.research_checkpoint_id);
  assert.equal(packet.packet_payload.policy_result, 'eligible_for_human_review');
  assert.equal(packet.allowed_actions.includes('advance'), true);

  const handoffArtifact = await ctx.controlPlane.getArtifactRef(result.handoff_ref!.ref_id);
  const handoff = handoffArtifact?.payload as TopicSelectionV1bWorkflowHarnessHandoff | null;
  const handoffPayload = handoff?.payload as {
    answerability_plan_ref?: TopicSelectionFunctionalRef;
    n8_debate_admission_ref?: TopicSelectionFunctionalRef;
    topic_question_contract_ref?: TopicSelectionFunctionalRef;
    trial_ledger_ref?: TopicSelectionFunctionalRef;
  } | null;
  assert.equal(handoff?.envelope.handoff_kind, 'N7ToN8Handoff');
  assert.equal(handoffPayload?.topic_question_contract_ref?.ref_id, result.authority_ref!.ref_id);
  assert.equal(handoffPayload?.answerability_plan_ref?.ref_id, plan?.topic_question_answerability_plan_id);
  assert.equal(handoffPayload?.trial_ledger_ref?.ref_id, decision?.topic_question_selection_decision_id);
  assert.equal(handoffPayload?.n8_debate_admission_ref?.ref_type, 'artifact_ref');

  const trace = await ctx.controlPlane.getTraceSnapshot(result.trace_snapshot_ref!.ref_id);
  const projectionRef = trace?.payload.runtime_context_projection_ref as TopicSelectionFunctionalRef | null;
  assert.equal(projectionRef?.ref_type, 'artifact_ref');
  const projectionArtifact = await ctx.controlPlane.getArtifactRef(projectionRef!.ref_id);
  const projection = projectionArtifact?.payload as {
    n7_handoff_hash?: string;
    n7_handoff_ref?: TopicSelectionFunctionalRef;
    non_authority?: boolean;
    projection_kind?: string;
    topic_question_contract_ref?: TopicSelectionFunctionalRef;
  } | null;
  assert.equal(projectionArtifact?.artifact_kind, 'diagnostic');
  assert.equal(projection?.projection_kind, 'v1b_n7_to_n8_topic_question_contract_context');
  assert.equal(projection?.non_authority, true);
  assert.equal(projection?.n7_handoff_ref?.ref_id, result.handoff_ref!.ref_id);
  assert.equal(projection?.n7_handoff_hash, result.hashes.handoff_hash);
  assert.equal(projection?.topic_question_contract_ref?.ref_id, result.authority_ref!.ref_id);

  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.equal(
    transitionRecord?.created_authority_refs.some((authorityRef) => authorityRef.ref_type === 'topic_value_assessment') ?? false,
    false,
  );
});

test('v1b workflow harness N8 cannot begin before strict-human question confirmation', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7, {}, { confirmQuestionCheckpoint: false });
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, input, n8ValueDraft(input))],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N8_QUESTION_CHECKPOINT_NOT_ADVANCED');
  assert.equal(result.authority_ref, null);
  assert.deepEqual(await ctx.valueAssessmentRepository.listAssessmentsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b N7 question checkpoint requires explicit confound or alternative-explanation material', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const n6Input = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_no_confounds',
    node_attempt_id: 'node_attempt_v1b_n6_no_confounds',
  });
  const draft = await n6Draft(ctx, n6Input);
  const candidate = draft.candidates[0]!;
  const n6 = await ctx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, n6Input, {
      ...draft,
      candidates: [{
        ...candidate,
        answerability_plan: {
          ...candidate.answerability_plan,
          dependency_risks: [],
        },
        objections: [],
        risk_notes: [],
      }],
    })],
  });
  assert.notEqual(n6.gate_status, 'blocked');
  const n7 = await ctx.service.invokeNode(await n7Request(ctx, n6, {
    workflow_run_id: 'workflow_run_v1b_n7_no_confounds',
    node_attempt_id: 'node_attempt_v1b_n7_no_confounds',
  }));
  const checkpoint = await ctx.researchCheckpointRepository.findCurrentCheckpoint(TITLE_CARD_ID, 'question_contract');
  assert.ok(checkpoint);
  const packet = await ctx.researchCheckpointService.getPacket(checkpoint.research_checkpoint_id);
  assert.equal(packet.allowed_actions.includes('advance'), false);
  assert.deepEqual(packet.packet_payload.policy_issue_codes, ['MATERIAL_CONFOUND_REVIEW_REQUIRED']);
  assert.equal(n7.authority_ref?.ref_type, 'topic_question_contract');
});

test('v1b workflow harness N7 accepts Codex grouping support but blocks unknown grouping refs', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const n6Input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, n6Input);
  const second = {
    ...draft.candidates[0]!,
    candidate_key: 'second_harness_candidate',
    main_question: 'How can a second WorkflowHarness candidate improve N7 grouping robustness?',
    expected_claim: 'A second candidate exercises deterministic grouping selection.',
  };
  const n6 = await ctx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, n6Input, {
        ...draft,
        recommended_candidate_keys: ['harness_candidate', 'second_harness_candidate'],
        candidates: [draft.candidates[0]!, second],
      }),
    ],
  });
  const input = await n7Request(ctx, n6);
  const grouping = n7GroupingPayload(input);
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      await recordN7SupportArtifact(ctx, input, {
        allowed_effect: 'support_only',
        output_contract: 'CandidateGroupingSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_candidate_grouping_support,
        slot_id: 'n7_candidate_grouping',
      }, grouping as unknown as Record<string, unknown>),
      await recordN7SupportArtifact(ctx, input, {
        allowed_effect: 'support_only',
        output_contract: 'N8DebateAdmissionReviewSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_n8_debate_admission_support,
        slot_id: 'n7_n8_debate_admission_review',
      }, n7DebateAdmissionPayload({
        debate_level: 'provider_diverse_deep_debate',
        rationale: 'Escalate valuable second candidate to deep debate.',
      }) as unknown as Record<string, unknown>),
    ],
  });
  const contract = await ctx.topicQuestionRepository.findTopicQuestionContractById(result.authority_ref!.ref_id);
  assert.equal(contract?.source_candidate_id, grouping.selected_candidate_ref.ref_id);
  assert.ok(result.warnings.some((warning) => warning.code === 'candidate_grouping_preserved'));
  assert.ok(result.warnings.some((warning) => warning.code === 'n8_debate_level_selected'));

  const badCtx = await seedHarnessV1aBundle();
  const { n6: badN6 } = await runReadyN6(badCtx);
  const badInput = await n7Request(badCtx, badN6);
  const badGrouping: TopicSelectionV1bCandidateGroupingSupportPayload = {
    ...n7GroupingPayload(badInput),
    selected_candidate_ref: ref('topic_question_candidate', 'unknown_candidate', TITLE_CARD_ID),
    priority_order: [ref('topic_question_candidate', 'unknown_candidate', TITLE_CARD_ID)],
  };
  const blocked = await badCtx.service.invokeNode({
    ...badInput,
    semantic_artifacts: [
      await recordN7SupportArtifact(badCtx, badInput, {
        allowed_effect: 'support_only',
        output_contract: 'CandidateGroupingSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_candidate_grouping_support,
        slot_id: 'n7_candidate_grouping',
      }, badGrouping as unknown as Record<string, unknown>),
    ],
  });
  assert.equal(blocked.gate_status, 'blocked');
  assert.equal(blocked.error_code, 'N7_GROUPING_UNKNOWN_CANDIDATE_REF');
  assert.equal(blocked.authority_ref, null);
});

test('v1b workflow harness N7 support admission blocks fixture replay in product mode and legacy provenance', async () => {
  const productCtx = await seedHarnessV1aBundle();
  const { n6: productN6 } = await runReadyN6(productCtx);
  const productInput = await n7Request(productCtx, productN6, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n7_product_fixture_support',
    node_attempt_id: 'node_attempt_v1b_n7_product_fixture_support',
  });
  const fixtureSupport = await recordN7SupportArtifact(productCtx, productInput, {
    allowed_effect: 'support_only',
    output_contract: 'CandidateGroupingSupport@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_candidate_grouping_support,
    slot_id: 'n7_candidate_grouping',
  }, n7GroupingPayload(productInput) as unknown as Record<string, unknown>);
  const productBlocked = await productCtx.service.invokeNode({
    ...productInput,
    semantic_artifacts: [fixtureSupport],
  });
  assert.equal(productBlocked.gate_status, 'blocked');
  assert.equal(productBlocked.error_code, 'N7_SUPPORT_ARTIFACT_PROVENANCE_CLASS_INVALID');
  assert.equal(productBlocked.authority_ref, null);

  const legacyCtx = await seedHarnessV1aBundle();
  const { n6: legacyN6 } = await runReadyN6(legacyCtx);
  const legacyInput = await n7Request(legacyCtx, legacyN6, {
    workflow_run_id: 'workflow_run_v1b_n7_legacy_support',
    node_attempt_id: 'node_attempt_v1b_n7_legacy_support',
  });
  const legacySupport = await recordN7SupportArtifact(legacyCtx, legacyInput, {
    allowed_effect: 'support_only',
    output_contract: 'CandidateGroupingSupport@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_candidate_grouping_support,
    slot_id: 'n7_candidate_grouping',
  }, n7GroupingPayload(legacyInput) as unknown as Record<string, unknown>);
  const legacyBlocked = await legacyCtx.service.invokeNode({
    ...legacyInput,
    semantic_artifacts: [{
      ...legacySupport,
      runtime_provenance_class: 'legacy_unverified',
    }],
  });
  assert.equal(legacyBlocked.gate_status, 'blocked');
  assert.equal(legacyBlocked.error_code, 'N7_SUPPORT_ARTIFACT_LEGACY_UNVERIFIED');
  assert.equal(legacyBlocked.authority_ref, null);
});

test('v1b workflow harness N7 admits runtime-verified Codex support in product mode', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const input = await n7Request(ctx, n6, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n7_runtime_verified_support',
    node_attempt_id: 'node_attempt_v1b_n7_runtime_verified_support',
  });
  const runtime = new TopicSelectionV1bN7SupportRuntimeService(ctx.controlPlane);
  const grouping = n7GroupingPayload(input);
  const generated = await runtime.generateSupportArtifact({
    request: input,
    slot_id: 'n7_candidate_grouping',
    execution_mode: 'codex_assisted',
    run_mode: 'product',
    codex_response: {
      output: grouping,
      operator_label: 'test-runtime',
    },
    created_by: 'system',
  });

  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    throw new Error('Expected runtime N7 support generation to succeed.');
  }
  assert.equal(generated.semantic_artifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(generated.semantic_artifact.prompt_variant_key, 'n7_candidate_grouping');
  assert.equal(
    generated.semantic_artifact.context_policy_profile_id,
    'topic-selection.v1b.n7.candidate-grouping.context-runtime@v1',
  );
  assert.notEqual(generated.semantic_artifact.prompt_packet_hash, 'c'.repeat(64));
  assert.ok(generated.semantic_artifact.runtime_audit_ref);
  assert.ok(generated.semantic_artifact.runtime_audit_hash);
  assert.equal(generated.semantic_artifact.source_hashes.n6_handoff_hash, input.frozen_input.payload.n6_handoff_hash);

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [generated.semantic_artifact],
  });
  assert.ok(['admitted', 'admitted_with_warnings'].includes(result.gate_status));
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.authority_ref?.ref_type, 'topic_question_contract');
  assert.ok(result.warnings.some((warning) => warning.code === 'candidate_grouping_preserved'));
});

test('v1b workflow harness N7 runtime support exact replay does not rewrite authority artifacts', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const input = await n7Request(ctx, n6, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n7_runtime_support_replay',
    node_attempt_id: 'node_attempt_v1b_n7_runtime_support_replay',
  });
  const support = await generateN7RuntimeSupportArtifact(
    ctx,
    input,
    'n7_candidate_grouping',
    n7GroupingPayload(input),
  );
  const first = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [support],
  });
  const artifactRefsBeforeReplay = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
  const replay = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [support],
  });
  const artifactRefsAfterReplay = await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id);

  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.authority_ref?.ref_id, first.authority_ref?.ref_id);
  assert.equal(replay.handoff_ref?.ref_id, first.handoff_ref?.ref_id);
  assert.equal(artifactRefsAfterReplay.length, artifactRefsBeforeReplay.length);
});

test('v1b workflow harness N7 runtime support drift blocks before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const input = await n7Request(ctx, n6, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n7_runtime_support_source_drift',
    node_attempt_id: 'node_attempt_v1b_n7_runtime_support_source_drift',
  });
  const support = await generateN7RuntimeSupportArtifact(
    ctx,
    input,
    'n7_candidate_grouping',
    n7GroupingPayload(input),
  );
  const blocked = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [{
      ...support,
      source_hashes: {
        ...support.source_hashes,
        n6_handoff_hash: '9'.repeat(64),
      },
    }],
  });

  assert.equal(blocked.gate_status, 'blocked');
  assert.equal(blocked.error_code, 'N7_SUPPORT_ARTIFACT_SOURCE_HASH_DRIFT');
  assert.equal(blocked.authority_ref, null);
  assert.equal(blocked.handoff_ref, null);
});

test('v1b workflow harness N7 runtime support audit drift blocks before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const input = await n7Request(ctx, n6, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n7_runtime_support_audit_drift',
    node_attempt_id: 'node_attempt_v1b_n7_runtime_support_audit_drift',
  });
  const support = await generateN7RuntimeSupportArtifact(
    ctx,
    input,
    'n7_candidate_grouping',
    n7GroupingPayload(input),
  );
  const blocked = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [{
      ...support,
      runtime_audit_hash: '6'.repeat(64),
    }],
  });

  assert.equal(blocked.gate_status, 'blocked');
  assert.equal(blocked.error_code, 'N7_SUPPORT_ARTIFACT_RUNTIME_CONTEXT_DRIFT');
  assert.equal(blocked.authority_ref, null);
  assert.equal(blocked.handoff_ref, null);
});

test('v1b workflow harness N7 runtime support cannot bypass deterministic candidate gates', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const input = await n7Request(ctx, n6, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n7_runtime_support_no_authority_bypass',
    node_attempt_id: 'node_attempt_v1b_n7_runtime_support_no_authority_bypass',
  });
  const unknownCandidateRef = ref('topic_question_candidate', 'unknown_runtime_candidate', TITLE_CARD_ID);
  const invalidGrouping: TopicSelectionV1bCandidateGroupingSupportPayload = {
    ...n7GroupingPayload(input),
    priority_order: [unknownCandidateRef],
    selected_candidate_hash: '8'.repeat(64),
    selected_candidate_ref: unknownCandidateRef,
  };
  const support = await generateN7RuntimeSupportArtifact(
    ctx,
    input,
    'n7_candidate_grouping',
    invalidGrouping,
  );
  const blocked = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [support],
  });

  assert.equal(blocked.gate_status, 'blocked');
  assert.equal(blocked.error_code, 'N7_GROUPING_UNKNOWN_CANDIDATE_REF');
  assert.equal(blocked.authority_ref, null);
  assert.equal(blocked.handoff_ref, null);
});

test('v1b workflow harness N7 blocks duplicate grouping priority and initial failed-trial synthesis', async () => {
  const duplicateCtx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(duplicateCtx);
  const n6Input = await n6Request(duplicateCtx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_duplicate_grouping_priority',
    node_attempt_id: 'node_attempt_v1b_n6_duplicate_grouping_priority',
  });
  const draft = await n6Draft(duplicateCtx, n6Input);
  const second = {
    ...draft.candidates[0]!,
    candidate_key: 'second_harness_candidate',
    main_question: 'How can duplicate grouping priority be blocked before N7 materialization?',
    expected_claim: 'N7 blocks duplicate candidate priority before writing a contract.',
  };
  const n6 = await duplicateCtx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [
      await recordN6DraftArtifact(duplicateCtx, n6Input, {
        ...draft,
        candidates: [draft.candidates[0]!, second],
        recommended_candidate_keys: ['harness_candidate', 'second_harness_candidate'],
      }),
    ],
  });
  const input = await n7Request(duplicateCtx, n6, {
    workflow_run_id: 'workflow_run_v1b_n7_duplicate_grouping_priority',
    node_attempt_id: 'node_attempt_v1b_n7_duplicate_grouping_priority',
  });
  const grouping = n7GroupingPayload(input);
  const duplicate = await duplicateCtx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      await recordN7SupportArtifact(duplicateCtx, input, {
        allowed_effect: 'support_only',
        output_contract: 'CandidateGroupingSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_candidate_grouping_support,
        slot_id: 'n7_candidate_grouping',
      }, {
        ...grouping,
        priority_order: [grouping.selected_candidate_ref, grouping.selected_candidate_ref],
      } as unknown as Record<string, unknown>),
    ],
  });
  assert.equal(duplicate.gate_status, 'blocked');
  assert.equal(duplicate.error_code, 'N7_DUPLICATE_PRIORITY_CANDIDATE');
  assert.equal(duplicate.authority_ref, null);

  const synthesisCtx = await seedHarnessV1aBundle();
  const { n6: synthesisN6 } = await runReadyN6(synthesisCtx);
  const synthesisInput = await n7Request(synthesisCtx, synthesisN6, {
    workflow_run_id: 'workflow_run_v1b_n7_initial_failed_trial_synthesis',
    node_attempt_id: 'node_attempt_v1b_n7_initial_failed_trial_synthesis',
  });
  const candidates = await synthesisCtx.topicQuestionRepository.listCandidatesByCandidateSetId(synthesisN6.authority_ref!.ref_id);
  const initialSynthesis = await synthesisCtx.service.invokeNode({
    ...synthesisInput,
    semantic_artifacts: [
      await recordN7SupportArtifact(synthesisCtx, synthesisInput, {
        allowed_effect: 'support_only',
        output_contract: 'N8FailedTrialSynthesisSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_failed_trial_synthesis_support,
        slot_id: 'n7_failed_trial_synthesis',
      }, {
        affected_refs: [synthesisN6.authority_ref!],
        exhausted_candidate_refs: candidates.map((candidate) =>
          ref('topic_question_candidate', candidate.topic_question_candidate_id, TITLE_CARD_ID)),
        failure_reason_codes: ['value_not_supported'],
        n6_regeneration_hints: ['This support is illegal before any N8 feedback exists.'],
        synthesis_summary: 'Initial N7 trials cannot consume failed-trial synthesis.',
      } satisfies TopicSelectionV1bN8FailedTrialSynthesisSupportPayload as unknown as Record<string, unknown>),
    ],
  });
  assert.equal(initialSynthesis.gate_status, 'blocked');
  assert.equal(initialSynthesis.error_code, 'N7_FAILED_TRIAL_SYNTHESIS_NOT_ALLOWED_FOR_INITIAL_TRIAL');
  assert.equal(initialSynthesis.authority_ref, null);
});

test('v1b workflow harness N7 consumes N8 feedback to select next candidate or loop back to N6', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const n6Input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, n6Input);
  const second = {
    ...draft.candidates[0]!,
    candidate_key: 'second_harness_candidate',
    main_question: 'How can N7 select a second candidate after N8 semantic failure feedback?',
    expected_claim: 'N7 can preserve failed feedback and select another admissible candidate.',
  };
  const n6 = await ctx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, n6Input, {
        ...draft,
        recommended_candidate_keys: ['harness_candidate', 'second_harness_candidate'],
        candidates: [draft.candidates[0]!, second],
      }),
    ],
  });
  const initialInput = await n7Request(ctx, n6);
  const first = await ctx.service.invokeNode(initialInput);
  const feedbackInput = await n7FeedbackRequest(ctx, initialInput, first);
  const secondTrial = await ctx.service.invokeNode(feedbackInput);

  assert.equal(secondTrial.gate_status, 'admitted');
  assert.equal(secondTrial.route_decision, 'invoke_next');
  assert.equal(secondTrial.authority_ref?.ref_type, 'topic_question_contract');
  const firstHandoffArtifact = await ctx.controlPlane.getArtifactRef(first.handoff_ref!.ref_id);
  const firstHandoff = firstHandoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
  const firstHandoffPayload = firstHandoff.payload as { active_candidate_ref: TopicSelectionFunctionalRef };
  const secondContract = await ctx.topicQuestionRepository.findTopicQuestionContractById(secondTrial.authority_ref!.ref_id);
  assert.notEqual(secondContract?.source_candidate_id, firstHandoffPayload.active_candidate_ref.ref_id);
  const secondDecision = secondContract
    ? await ctx.topicQuestionRepository.findSelectionDecisionById(secondContract.selection_decision_id)
    : null;
  assert.equal(secondDecision?.blocking_contexts[0]?.feedback_class, 'semantic_candidate_failure');
  assert.equal(secondDecision?.blocking_contexts[0]?.failure_reason_code, 'value_not_supported');
  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(n6.authority_ref!.ref_id);
  assert.equal(candidates.filter((candidate) => candidate.status === 'admitted').length, 1);
  assert.equal(candidates.filter((candidate) => candidate.status === 'rejected').length, 1);

  const exhaustedInput = await n7FeedbackRequest(ctx, initialInput, secondTrial);
  const synthesisPayload: TopicSelectionV1bN8FailedTrialSynthesisSupportPayload = {
    exhausted_candidate_refs: candidates.map((candidate) =>
      ref('topic_question_candidate', candidate.topic_question_candidate_id, TITLE_CARD_ID)),
    failure_reason_codes: ['value_not_supported'],
    synthesis_summary: 'Both N8 trials failed value support and should regenerate candidates.',
    n6_regeneration_hints: ['Add stronger value evidence before regenerating candidates.'],
    affected_refs: [n6.authority_ref!],
  };
  const exhausted = await ctx.service.invokeNode({
    ...exhaustedInput,
    semantic_artifacts: [
      await recordN7SupportArtifact(ctx, exhaustedInput, {
        allowed_effect: 'support_only',
        output_contract: 'N8FailedTrialSynthesisSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_failed_trial_synthesis_support,
        slot_id: 'n7_failed_trial_synthesis',
      }, synthesisPayload as unknown as Record<string, unknown>),
    ],
  });
  assert.equal(exhausted.gate_status, 'blocked');
  assert.equal(exhausted.error_code, 'N7_CANDIDATE_TRIALS_EXHAUSTED');
  assert.equal(exhausted.failure_class, 'semantic_non_pass');
  assert.equal(exhausted.route_decision, 'loopback');
  assert.equal(exhausted.handoff_ref, null);
  assert.equal(exhausted.authority_ref?.ref_type, 'topic_question_selection_decision');
  await assertTraceLoopbackTargetCode(ctx, exhausted, 'n7_loopback_to_n6');
  const exhaustedTrace = await ctx.controlPlane.getTraceSnapshot(exhausted.trace_snapshot_ref!.ref_id);
  const loopbackProjectionRef = exhaustedTrace?.payload.runtime_context_projection_ref as TopicSelectionFunctionalRef | null;
  assert.equal(loopbackProjectionRef?.ref_type, 'artifact_ref');
  const loopbackProjectionArtifact = await ctx.controlPlane.getArtifactRef(loopbackProjectionRef!.ref_id);
  const loopbackProjection = loopbackProjectionArtifact?.payload as {
    failed_trial_synthesis_hash?: string;
    loopback_target_code?: string;
    non_authority?: boolean;
    projection_kind?: string;
    topic_question_candidate_set_ref?: TopicSelectionFunctionalRef;
  } | null;
  assert.equal(loopbackProjectionArtifact?.artifact_kind, 'diagnostic');
  assert.equal(loopbackProjection?.projection_kind, 'v1b_n7_to_n6_failed_trial_loopback_context');
  assert.equal(loopbackProjection?.non_authority, true);
  assert.equal(loopbackProjection?.loopback_target_code, 'n7_loopback_to_n6');
  assert.equal(loopbackProjection?.topic_question_candidate_set_ref?.ref_id, n6.authority_ref!.ref_id);
  assert.equal(loopbackProjection?.failed_trial_synthesis_hash, exhaustedTrace?.payload.synthesis_hash);
  const exhaustedDecision = await ctx.topicQuestionRepository.findSelectionDecisionById(exhausted.authority_ref!.ref_id);
  assert.equal(exhaustedDecision?.admission_review.loopback_target_code, 'n7_loopback_to_n6');
});

test('v1b workflow harness N7 readmits gate-rejected feedback with updated debate admission only', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const initialInput = await n7Request(ctx, n6);
  const first = await ctx.service.invokeNode(initialInput);
  const firstHandoffArtifact = await ctx.controlPlane.getArtifactRef(first.handoff_ref!.ref_id);
  const firstHandoff = firstHandoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
  const firstHandoffPayload = firstHandoff.payload as {
    active_candidate_ref: TopicSelectionFunctionalRef;
    n8_debate_admission_hash: string;
  };
  const feedbackInput = await n7FeedbackRequest(ctx, initialInput, first, 'gate_rejected');
  const missingAdmission = await ctx.service.invokeNode(feedbackInput);
  assert.equal(missingAdmission.gate_status, 'blocked');
  assert.equal(missingAdmission.error_code, 'N7_REQUIRED_SUPPORT_ARTIFACT_MISSING');
  assert.equal(missingAdmission.authority_ref, null);
  assert.equal(missingAdmission.handoff_ref, null);

  const readmitted = await ctx.service.invokeNode({
    ...feedbackInput,
    node_attempt_id: 'node_attempt_v1b_n7_gate_readmission_with_support',
    semantic_artifacts: [
      await recordN7SupportArtifact(ctx, feedbackInput, {
        allowed_effect: 'support_only',
        output_contract: 'N8DebateAdmissionReviewSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_n8_debate_admission_support,
        slot_id: 'n7_n8_debate_admission_review',
      }, n7DebateAdmissionPayload({
        debate_level: 'provider_diverse_deep_debate',
        rationale: 'Gate rejection requires bounded deep readmission without consuming the candidate trial.',
        risk_signal_codes: ['debate_admission_too_weak'],
      }) as unknown as Record<string, unknown>),
    ],
  });

  assert.equal(readmitted.gate_status, 'admitted_with_warnings');
  assert.equal(readmitted.route_decision, 'invoke_next');
  assert.equal(readmitted.authority_ref?.ref_id, first.authority_ref?.ref_id);
  assert.equal(readmitted.error_code, null);
  assert.ok(readmitted.warnings.some((warning) => warning.code === 'n8_debate_level_selected'));

  const readmittedHandoffArtifact = await ctx.controlPlane.getArtifactRef(readmitted.handoff_ref!.ref_id);
  const readmittedHandoff = readmittedHandoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
  const readmittedPayload = readmittedHandoff.payload as {
    active_candidate_ref: TopicSelectionFunctionalRef;
    n8_debate_admission_hash: string;
  };
  assert.equal(readmittedPayload.active_candidate_ref.ref_id, firstHandoffPayload.active_candidate_ref.ref_id);
  assert.notEqual(readmittedPayload.n8_debate_admission_hash, firstHandoffPayload.n8_debate_admission_hash);

  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(n6.authority_ref!.ref_id);
  assert.equal(candidates.filter((candidate) => candidate.status === 'rejected').length, 0);
  assert.equal(candidates.filter((candidate) => candidate.status === 'admitted').length, 1);
});

test('v1b workflow harness N7 blocks incomplete failed-trial synthesis before N6 loopback', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const n6Input = await n6Request(ctx, n5);
  const draft = await n6Draft(ctx, n6Input);
  const second = {
    ...draft.candidates[0]!,
    candidate_key: 'second_harness_candidate',
    main_question: 'How can incomplete failed-trial synthesis be detected before N6 regeneration?',
    expected_claim: 'N7 should require synthesis coverage for every failed candidate trial.',
  };
  const n6 = await ctx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, n6Input, {
        ...draft,
        recommended_candidate_keys: ['harness_candidate', 'second_harness_candidate'],
        candidates: [draft.candidates[0]!, second],
      }),
    ],
  });
  const initialInput = await n7Request(ctx, n6);
  const first = await ctx.service.invokeNode(initialInput);
  const secondTrial = await ctx.service.invokeNode(await n7FeedbackRequest(ctx, initialInput, first));
  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(n6.authority_ref!.ref_id);
  const exhaustedInput = await n7FeedbackRequest(ctx, initialInput, secondTrial);
  const missingSynthesis = await ctx.service.invokeNode({
    ...exhaustedInput,
    node_attempt_id: 'node_attempt_v1b_n7_exhausted_missing_synthesis',
  });
  assert.equal(missingSynthesis.gate_status, 'blocked');
  assert.equal(missingSynthesis.error_code, 'N7_REQUIRED_SUPPORT_ARTIFACT_MISSING');
  assert.equal(missingSynthesis.route_decision, 'blocked');
  assert.equal(missingSynthesis.authority_ref, null);
  assert.equal(missingSynthesis.handoff_ref, null);

  const unknownCandidateRef = ref('topic_question_candidate', 'unknown_failed_trial_candidate', TITLE_CARD_ID);
  const unknownRefSynthesis: TopicSelectionV1bN8FailedTrialSynthesisSupportPayload = {
    exhausted_candidate_refs: [
      ...candidates.map((candidate) => ref('topic_question_candidate', candidate.topic_question_candidate_id, TITLE_CARD_ID)),
      unknownCandidateRef,
    ],
    failure_reason_codes: ['value_not_supported'],
    synthesis_summary: 'This synthesis carries an unknown exhausted candidate and must not route to N6.',
    n6_regeneration_hints: ['Unknown failed candidates must not enter N6 regeneration context.'],
    affected_refs: [n6.authority_ref!, unknownCandidateRef],
  };
  const unknownRefResult = await ctx.service.invokeNode({
    ...exhaustedInput,
    node_attempt_id: 'node_attempt_v1b_n7_exhausted_unknown_synthesis_ref',
    semantic_artifacts: [
      await recordN7SupportArtifact(ctx, exhaustedInput, {
        allowed_effect: 'support_only',
        output_contract: 'N8FailedTrialSynthesisSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_failed_trial_synthesis_support,
        slot_id: 'n7_failed_trial_synthesis',
      }, unknownRefSynthesis as unknown as Record<string, unknown>),
    ],
  });
  assert.equal(unknownRefResult.gate_status, 'blocked');
  assert.equal(unknownRefResult.error_code, 'N7_FAILED_TRIAL_SYNTHESIS_UNKNOWN_REF');
  assert.equal(unknownRefResult.authority_ref, null);
  assert.equal(unknownRefResult.handoff_ref, null);

  const incompleteSynthesis: TopicSelectionV1bN8FailedTrialSynthesisSupportPayload = {
    exhausted_candidate_refs: [
      ref('topic_question_candidate', candidates[0]!.topic_question_candidate_id, TITLE_CARD_ID),
    ],
    failure_reason_codes: ['value_not_supported'],
    synthesis_summary: 'This synthesis intentionally omits one failed trial and must not route to N6.',
    n6_regeneration_hints: ['The missing failed trial should block regeneration.'],
    affected_refs: [n6.authority_ref!],
  };
  const result = await ctx.service.invokeNode({
    ...exhaustedInput,
    semantic_artifacts: [
      await recordN7SupportArtifact(ctx, exhaustedInput, {
        allowed_effect: 'support_only',
        output_contract: 'N8FailedTrialSynthesisSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_failed_trial_synthesis_support,
        slot_id: 'n7_failed_trial_synthesis',
      }, incompleteSynthesis as unknown as Record<string, unknown>),
    ],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N7_FAILED_TRIAL_SYNTHESIS_INCOMPLETE');
  assert.equal(result.route_decision, 'blocked');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N7 blocks technical N8 feedback and replays exact admitted result', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const input = await n7Request(ctx, n6, {
    workflow_run_id: 'workflow_run_v1b_n7_replay',
    node_attempt_id: 'node_attempt_v1b_n7_replay',
  });
  const first = await ctx.service.invokeNode(input);
  const replay = await ctx.service.invokeNode(input);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.authority_ref?.ref_id, first.authority_ref?.ref_id);

  const technicalInput = await n7FeedbackRequest(ctx, input, first, 'technical_failure');
  const technical = await ctx.service.invokeNode(technicalInput);
  assert.equal(technical.gate_status, 'blocked');
  assert.equal(technical.error_code, 'N7_TECHNICAL_FEEDBACK_WRONG_TARGET');
  assert.equal(technical.authority_ref, null);
});

test('v1b workflow harness N8 creates value assessment from frozen value draft artifact', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7);
  const draft = n8ValueDraft(input);
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'admitted_with_warnings');
  assert.equal(result.route_decision, 'invoke_next');
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref?.ref_type, 'topic_value_assessment');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
  assert.match(result.hashes.authority_hash ?? '', /^[a-f0-9]{64}$/);

  const assessment = await ctx.valueAssessmentRepository.findAssessmentById(result.authority_ref!.ref_id);
  assert.equal(assessment?.readiness_status, 'ready');
  assert.equal(assessment?.legacy_verdict, 'promote');
  assert.equal(assessment?.hard_gates.length, TOPIC_SELECTION_VALUE_GATE_KEYS.length);
  assert.equal(assessment?.dimension_scores.length, TOPIC_SELECTION_VALUE_DIMENSIONS.length);
  const memo = assessment ? await ctx.valueAssessmentRepository.findReasoningMemoById(assessment.value_reasoning_memo_id) : null;
  assert.equal(memo?.recommendation, 'advance_to_package');

  const handoffArtifact = await ctx.controlPlane.getArtifactRef(result.handoff_ref!.ref_id);
  const handoff = handoffArtifact?.payload as TopicSelectionV1bWorkflowHarnessHandoff | null;
  assert.equal(handoff?.envelope.handoff_kind, 'N8ToN9Handoff');
  assert.equal((handoff?.payload as { topic_value_assessment_ref?: TopicSelectionFunctionalRef }).topic_value_assessment_ref?.ref_id, result.authority_ref!.ref_id);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.equal(
    transitionRecord?.created_authority_refs.some((authorityRef) => authorityRef.ref_type === 'value_disposition_decision') ?? false,
    false,
  );
});

// D-30 (2026-07-07): operator_debate_request is the third N8 trigger source (T-OP) — it arms the
// SAME n8_feedback_to_n7 loopback the deterministic T1/T3 triggers arm, on a draft those triggers
// would admit (the canonical fixture: total 83, conf 0.82 — outside every band).
test('v1b workflow harness N8 operator_debate_request arms the debate loopback on a clean first pass', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7, {
    operator_debate_request: { reason: 'value story reads optimistic; stress-test before advancing', requested_by: 'reviewer_yu' },
  });
  const draft = n8ValueDraft(input);
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, input, draft)],
  });

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.route_decision, 'loopback');
  // The loopback attempt records the N8ToN7 feedback packet as its artifact authority; no handoff.
  assert.equal(result.authority_ref?.ref_type, 'artifact_ref');
  assert.equal(result.handoff_ref, null);
  assert.equal(result.error_code, 'N8_OPERATOR_FORCED_DEBATE_TRIGGER');
  assert.ok(result.blockers.some((issue) => issue.code === 'N8_OPERATOR_FORCED_DEBATE_TRIGGER'));
  // No deterministic trigger fired — the operator request alone armed the loopback.
  assert.equal(result.blockers.some((issue) => issue.code === 'N8_VALUE_BORDERLINE_DEBATE_TRIGGER'), false);
  assert.equal(result.blockers.some((issue) => issue.code === 'N8_DIMENSION_CONFLICT_DEBATE_TRIGGER'), false);
  await assertTraceLoopbackTargetCode(
    ctx,
    result,
    'n8_feedback_to_n7',
    'topic-selection.v1b.materialize-topic-question-contract.v1',
  );
  // No authority was written on the loopback attempt.
  assert.deepEqual(await ctx.valueAssessmentRepository.listAssessmentsByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness rejects operator_debate_request off N8 and with empty fields', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n8 } = await runReadyN8(ctx);
  const n9Input = await n9Request(ctx, n8, {
    operator_debate_request: { reason: 'wrong node', requested_by: 'reviewer_yu' },
  });
  await assert.rejects(
    () => ctx.service.invokeNode(n9Input),
    (error: unknown) => error instanceof AppError && error.statusCode === 400
      && /only supported on the N8/.test(error.message),
  );

  const ctx2 = await seedHarnessV1aBundle();
  const ready2 = await runReadyN7(ctx2);
  const badInput = await n8Request(ctx2, ready2.n7, {
    operator_debate_request: { reason: '   ', requested_by: 'reviewer_yu' },
  });
  await assert.rejects(
    () => ctx2.service.invokeNode(badInput),
    (error: unknown) => error instanceof AppError && error.statusCode === 400
      && /non-empty reason and requested_by/.test(error.message),
  );
});

test('v1b workflow harness N8 admits runtime-verified Codex value draft in product mode', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7, {
    workflow_run_id: 'workflow_run_v1b_n8_runtime_product',
    node_attempt_id: 'node_attempt_v1b_n8_runtime_product',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    run_mode: 'product',
  });
  const draft = n8ValueDraft(input);
  const semanticArtifact = await generateN8RuntimeValueDraftArtifact(ctx, input, draft);

  assert.equal(semanticArtifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(semanticArtifact.prompt_variant_key, 'n8_value_assessment_draft.initial_from_n7');
  assert.equal(
    semanticArtifact.context_policy_profile_id,
    'topic-selection.v1b.n8.topic-value-assessment.context-runtime@v1',
  );
  assert.match(semanticArtifact.source_hashes.n7_handoff_hash ?? '', /^[a-f0-9]{64}$/);
  assert.match(semanticArtifact.source_hashes.n7_to_n8_projection_hash ?? '', /^[a-f0-9]{64}$/);

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifact],
  });
  assert.equal(result.gate_status, 'admitted_with_warnings');
  assert.equal(result.error_code, null);
  assert.equal(result.authority_ref?.ref_type, 'topic_value_assessment');
  assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');
});

test('v1b workflow harness N8 blocks runtime value draft run-mode drift before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7, {
    workflow_run_id: 'workflow_run_v1b_n8_runtime_run_mode_drift',
    node_attempt_id: 'node_attempt_v1b_n8_runtime_run_mode_drift',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    run_mode: 'product',
  });
  const semanticArtifact = await generateN8RuntimeValueDraftArtifact(
    ctx,
    input,
    n8ValueDraft(input),
    { runMode: 'acceptance' },
  );

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifact],
  });
  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'RUNTIME_ADMISSION_ARTIFACT_MISMATCH');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N8 blocks runtime value draft source drift before authority write', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7, {
    workflow_run_id: 'workflow_run_v1b_n8_runtime_drift',
    node_attempt_id: 'node_attempt_v1b_n8_runtime_drift',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    run_mode: 'product',
  });
  const draft = n8ValueDraft(input);
  const semanticArtifact = await generateN8RuntimeValueDraftArtifact(ctx, input, draft);
  const driftedArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef = {
    ...semanticArtifact,
    source_hashes: {
      ...semanticArtifact.source_hashes,
      n7_to_n8_projection_hash: '9'.repeat(64),
    },
  };

  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [driftedArtifact],
  });
  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N8_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b N8 runtime compression quality gate blocks dropped required facts before draft output', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7, {
    workflow_run_id: 'workflow_run_v1b_n8_runtime_compression_blocked',
    node_attempt_id: 'node_attempt_v1b_n8_runtime_compression_blocked',
  });
  const runtime = new TopicSelectionV1bN8ValueAssessmentRuntimeService(ctx.controlPlane);
  const generated = await runtime.generateDraftArtifact({
    request: input,
    execution_mode: 'codex_assisted',
    run_mode: 'acceptance',
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 120_000,
      estimated_input_tokens_after_compression_override: 12_000,
    },
    compression_attempt: {
      compression_executor_kind: 'deterministic_structural',
      compressed_context: {
        summary: 'Intentionally incomplete N8 compressed context for quality-gate regression.',
        raw_provider_logs: ['must not be persisted in compressed runtime context'],
      },
      summary: {
        preserved_fact_kinds: ['topic_question_contract'],
      },
      compressed_preserved_facts: {
        topic_question_contract: ['incomplete'],
      },
    },
    codex_response: {
      output: n8ValueDraft(input),
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });

  assert.equal(generated.status, 'blocked');
  assert.equal(generated.invocation_result.status, 'blocked');
  assert.equal(generated.invocation_result.error_code, 'COMPRESSION_QUALITY_GATE_BLOCKED');
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_QUALITY_GATE_BLOCKED'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD'));
  assert.ok(generated.invocation_result.blocker_codes.includes('COMPRESSION_REQUIRED_N7_HANDOFF_DROPPED'));
  assert.equal(generated.invocation_result.structured_output, null);
});

test('v1b N8 runtime generation blocks missing N7-to-N8 context projection', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7, {
    workflow_run_id: 'workflow_run_v1b_n8_runtime_missing_projection',
    node_attempt_id: 'node_attempt_v1b_n8_runtime_missing_projection',
  });
  const projectionRef = await n7ToN8ProjectionRef(ctx, n7);
  const frozenInput = {
    ...input.frozen_input,
    source_refs: input.frozen_input.source_refs.filter((sourceRef) => (
      sourceRef.ref_type !== projectionRef.ref_type || sourceRef.ref_id !== projectionRef.ref_id
    )),
  };
  const missingProjectionInput = {
    ...input,
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
  };
  const runtime = new TopicSelectionV1bN8ValueAssessmentRuntimeService(ctx.controlPlane);
  await assert.rejects(
    () => runtime.generateDraftArtifact({
      request: missingProjectionInput,
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: n8ValueDraft(missingProjectionInput),
        operator_label: 'unit-test-runtime',
      },
      created_by: 'system',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && /requires exactly one N7-to-N8 runtime context projection/u.test(error.message),
  );
});

test('v1b workflow harness N8 blocks fixture replay value draft in product mode', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const input = await n8Request(ctx, n7, {
    workflow_run_id: 'workflow_run_v1b_n8_fixture_product',
    node_attempt_id: 'node_attempt_v1b_n8_fixture_product',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    run_mode: 'product',
  });
  const draft = n8ValueDraft(input);
  const result = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, input, draft)],
  });
  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'N8_DRAFT_ARTIFACT_PROVENANCE_CLASS_INVALID');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
});

test('v1b workflow harness N8 blocks missing value draft and risk-dropping drafts before authority write', async () => {
  const noDraftCtx = await seedHarnessV1aBundle();
  const { n7: noDraftN7 } = await runReadyN7(noDraftCtx);
  const noDraftInput = await n8Request(noDraftCtx, noDraftN7, {
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    run_mode: 'acceptance',
  });
  const noDraft = await noDraftCtx.service.invokeNode(noDraftInput);
  assert.equal(noDraft.gate_status, 'blocked');
  assert.equal(noDraft.error_code, 'N8_FROZEN_VALUE_DRAFT_ARTIFACT_REQUIRED');
  assert.equal(noDraft.authority_ref, null);

  const riskCtx = await seedHarnessV1aBundle({ openRecheck: true, acceptedRiskCoversRecheck: true });
  const { n7 } = await runReadyN7(riskCtx);
  const input = await n8Request(riskCtx, n7);
  const draft = n8ValueDraft(input, {
    accepted_risk_refs: [],
  });
  const riskDropped = await riskCtx.service.invokeNode({
    ...input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(riskCtx, input, draft)],
  });
  assert.equal(riskDropped.gate_status, 'blocked');
  assert.equal(riskDropped.error_code, 'N8_VALUE_ASSESSMENT_DROPS_RISKS');
  assert.equal(riskDropped.authority_ref, null);
});

test('v1b workflow harness N8 rejects schema-valid-looking value drafts with extra gate or dimension drift', async () => {
  const gateCtx = await seedHarnessV1aBundle();
  const { n7: gateN7 } = await runReadyN7(gateCtx);
  const gateInput = await n8Request(gateCtx, gateN7);
  const gateBaseDraft = n8ValueDraft(gateInput);
  const gateDriftDraft = {
    ...gateBaseDraft,
    hard_gates: [
      ...gateBaseDraft.hard_gates,
      {
        gate_key: 'unsupported_value_gate',
        verdict: 'pass',
        severity: 'info',
        overridable_with_risk: false,
        rationale: 'This extra gate must not be admitted into authority.',
        refs: [gateBaseDraft.reasoning_memo.cited_refs[0]!],
      },
    ],
  } as unknown as TopicSelectionV1bTopicValueAssessmentDraftPayload;
  const gateDrift = await gateCtx.service.invokeNode({
    ...gateInput,
    semantic_artifacts: [await recordN8ValueDraftArtifact(gateCtx, gateInput, gateDriftDraft)],
  });
  assert.equal(gateDrift.gate_status, 'blocked');
  assert.equal(gateDrift.error_code, 'N8_VALUE_GATE_COVERAGE_INVALID');
  assert.equal(gateDrift.authority_ref, null);

  const dimensionCtx = await seedHarnessV1aBundle();
  const { n7: dimensionN7 } = await runReadyN7(dimensionCtx);
  const dimensionInput = await n8Request(dimensionCtx, dimensionN7);
  const dimensionBaseDraft = n8ValueDraft(dimensionInput);
  const dimensionDriftDraft = {
    ...dimensionBaseDraft,
    dimension_scores: [
      ...dimensionBaseDraft.dimension_scores,
      {
        dimension_key: 'unsupported_value_dimension',
        score: 77,
        rationale: 'This extra dimension must not be admitted into authority.',
        evidence_refs: [dimensionBaseDraft.reasoning_memo.cited_refs[0]!],
        uncertainty: 'medium',
      },
    ],
  } as unknown as TopicSelectionV1bTopicValueAssessmentDraftPayload;
  const dimensionDrift = await dimensionCtx.service.invokeNode({
    ...dimensionInput,
    semantic_artifacts: [await recordN8ValueDraftArtifact(dimensionCtx, dimensionInput, dimensionDriftDraft)],
  });
  assert.equal(dimensionDrift.gate_status, 'blocked');
  assert.equal(dimensionDrift.error_code, 'N8_VALUE_DIMENSION_COVERAGE_INVALID');
  assert.equal(dimensionDrift.authority_ref, null);
});

test('v1b workflow harness N8 blocks disposition, readiness, score, citation, and ref variants before authority', async () => {
  async function assertN8DraftBlock(
    suffix: string,
    expectedErrorCode: string,
    mutate: (
      draft: TopicSelectionV1bTopicValueAssessmentDraftPayload,
    ) => TopicSelectionV1bTopicValueAssessmentDraftPayload,
  ) {
    const ctx = await seedHarnessV1aBundle();
    const { n7 } = await runReadyN7(ctx);
    const input = await n8Request(ctx, n7, {
      workflow_run_id: `workflow_run_v1b_n8_${suffix}`,
      node_attempt_id: `node_attempt_v1b_n8_${suffix}`,
    });
    const result = await ctx.service.invokeNode({
      ...input,
      semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, input, mutate(n8ValueDraft(input)))],
    });
    assert.equal(result.gate_status, 'blocked');
    assert.equal(result.error_code, expectedErrorCode);
    assert.equal(result.authority_ref, null);
    assert.equal(result.handoff_ref, null);
  }

  await assertN8DraftBlock('memo_disposition_mismatch', 'N8_VALUE_MEMO_DISPOSITION_MISMATCH', (draft) => ({
    ...draft,
    reasoning_memo: {
      ...draft.reasoning_memo,
      recommendation: 'park',
    },
  }));

  await assertN8DraftBlock('advance_blocking_gate', 'N8_ADVANCE_WITH_BLOCKING_GATE', (draft) => ({
    ...draft,
    hard_gates: [
      {
        ...draft.hard_gates[0]!,
        severity: 'blocking' as const,
        verdict: 'fail' as const,
      },
      ...draft.hard_gates.slice(1),
    ],
  }));

  await assertN8DraftBlock('advance_non_ready', 'N8_ADVANCE_WITH_NON_READY_VALUE', (draft) => ({
    ...draft,
    readiness_status: 'needs_refinement',
  }));

  await assertN8DraftBlock('advance_low_score', 'N8_ADVANCE_SCORE_TOO_LOW', (draft) => ({
    ...draft,
    total_score: 59,
  }));

  await assertN8DraftBlock('memo_citations_missing', 'N8_VALUE_MEMO_CITATIONS_REQUIRED', (draft) => ({
    ...draft,
    reasoning_memo: {
      ...draft.reasoning_memo,
      cited_refs: [],
    },
  }));

  await assertN8DraftBlock('unknown_value_ref', 'N8_UNKNOWN_VALUE_TRACE_REF', (draft) => ({
    ...draft,
    reasoning_memo: {
      ...draft.reasoning_memo,
      cited_refs: [ref('artifact_ref', 'not_allowed_in_n8_value_refs', TITLE_CARD_ID)],
    },
  }));
});

test('v1b workflow harness N6 semantic loopback can regenerate candidates and close through N11', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const failedInput = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_loopback_first',
    node_attempt_id: 'node_attempt_v1b_n6_loopback_first',
  });
  const failedDraft = await n6Draft(ctx, failedInput);
  const failed = await ctx.service.invokeNode({
    ...failedInput,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, failedInput, {
        ...failedDraft,
        candidates: [
          {
            ...failedDraft.candidates[0]!,
            answerability_verdict: 'not_answerable',
            main_question: 'How can AI improve research?',
          },
        ],
      }),
    ],
  });

  assert.equal(failed.gate_status, 'blocked');
  assert.equal(failed.route_decision, 'loopback');
  assert.equal(failed.error_code, 'N6_NO_ADMISSIBLE_TOPIC_QUESTION_CANDIDATE');
  await assertTraceLoopbackTargetCode(ctx, failed, 'n6_regenerate_candidates');
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);

  const retryInput = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_loopback_retry',
    node_attempt_id: 'node_attempt_v1b_n6_loopback_retry',
  });
  const retryDraft = await n6Draft(ctx, retryInput, {
    generation_notes: ['Regenerated after N6 semantic loopback with a bounded answerable candidate.'],
  });
  retryDraft.recommended_candidate_keys = ['regenerated_harness_candidate'];
  retryDraft.candidates[0] = {
    ...retryDraft.candidates[0]!,
    candidate_key: 'regenerated_harness_candidate',
    main_question: 'How can a regenerated WorkflowHarness candidate restore v1b topic-question viability after loopback?',
    expected_claim: 'Regenerated candidates can restore a viable v1b topic-question path after semantic loopback.',
  };
  const n6 = await ctx.service.invokeNode({
    ...retryInput,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, retryInput, retryDraft)],
  });
  assert.equal(n6.gate_status, 'admitted');
  assert.equal(n6.route_decision, 'invoke_next');

  const n7 = await ctx.service.invokeNode(await n7Request(ctx, n6, {
    workflow_run_id: 'workflow_run_v1b_n7_after_n6_regen',
    node_attempt_id: 'node_attempt_v1b_n7_after_n6_regen',
  }));
  assert.equal(n7.gate_status, 'admitted');
  const n8Input = await n8Request(ctx, n7, {
    workflow_run_id: 'workflow_run_v1b_n8_after_n6_regen',
    node_attempt_id: 'node_attempt_v1b_n8_after_n6_regen',
  });
  const n8 = await ctx.service.invokeNode({
    ...n8Input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, n8Input, n8ValueDraft(n8Input))],
  });
  assert.equal(n8.gate_status, 'admitted_with_warnings');

  const terminal = await runTerminalPackageFromN8(ctx, n8, 'after_n6_regen');
  assert.equal(terminal.n11.route_decision, 'stop_v1b_complete');
  assert.equal((await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID)).length, 1);
});

test('v1b workflow harness N7 semantic trial switch can close on the next candidate through N11', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const n6Input = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_trial_switch',
    node_attempt_id: 'node_attempt_v1b_n6_trial_switch',
  });
  const draft = await n6Draft(ctx, n6Input);
  const second = {
    ...draft.candidates[0]!,
    candidate_key: 'second_harness_candidate',
    main_question: 'How can N7 close the v1b workflow on a second candidate after N8 semantic feedback?',
    expected_claim: 'N7 can preserve failed feedback and close on the next viable candidate.',
  };
  const n6 = await ctx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, n6Input, {
        ...draft,
        recommended_candidate_keys: ['harness_candidate', 'second_harness_candidate'],
        candidates: [draft.candidates[0]!, second],
      }),
    ],
  });

  const initialInput = await n7Request(ctx, n6, {
    workflow_run_id: 'workflow_run_v1b_n7_trial_switch_first',
    node_attempt_id: 'node_attempt_v1b_n7_trial_switch_first',
  });
  const first = await ctx.service.invokeNode(initialInput);
  const secondTrial = await ctx.service.invokeNode(await n7FeedbackRequest(ctx, initialInput, first));
  assert.equal(secondTrial.gate_status, 'admitted');

  const n8Input = await n8Request(ctx, secondTrial, {
    workflow_run_id: 'workflow_run_v1b_n8_trial_switch_second',
    node_attempt_id: 'node_attempt_v1b_n8_trial_switch_second',
  });
  const n8 = await ctx.service.invokeNode({
    ...n8Input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, n8Input, n8ValueDraft(n8Input))],
  });
  assert.equal(n8.gate_status, 'admitted_with_warnings');

  const assessment = await ctx.valueAssessmentRepository.findAssessmentById(n8.authority_ref!.ref_id);
  assert.equal(assessment?.topic_question_contract_id, secondTrial.authority_ref?.ref_id);
  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(n6.authority_ref!.ref_id);
  assert.equal(candidates.filter((candidate) => candidate.status === 'rejected').length, 1);
  assert.equal(candidates.filter((candidate) => candidate.status === 'admitted').length, 1);

  const terminal = await runTerminalPackageFromN8(ctx, n8, 'trial_switch_second');
  assert.equal(terminal.n11.route_decision, 'stop_v1b_complete');
});

test('v1b workflow harness N8 gate rejection can readmit through N7 and close the same candidate through N11', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n6 } = await runReadyN6(ctx);
  const initialInput = await n7Request(ctx, n6, {
    workflow_run_id: 'workflow_run_v1b_n7_gate_readmission_first',
    node_attempt_id: 'node_attempt_v1b_n7_gate_readmission_first',
  });
  const first = await ctx.service.invokeNode(initialInput);
  const firstHandoffArtifact = await ctx.controlPlane.getArtifactRef(first.handoff_ref!.ref_id);
  const firstHandoff = firstHandoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
  const firstHandoffPayload = firstHandoff.payload as {
    active_candidate_ref: TopicSelectionFunctionalRef;
    n8_debate_admission_hash: string;
  };

  const rejectedN8Input = await n8Request(ctx, first, {
    workflow_run_id: 'workflow_run_v1b_n8_gate_rejected_before_readmission',
    node_attempt_id: 'node_attempt_v1b_n8_gate_rejected_before_readmission',
  });
  const rejectedDraft = n8ValueDraft(rejectedN8Input);
  const rejectedN8 = await ctx.service.invokeNode({
    ...rejectedN8Input,
    semantic_artifacts: [
      await recordN8ValueDraftArtifact(ctx, rejectedN8Input, {
        ...rejectedDraft,
        hard_gates: [
          ...rejectedDraft.hard_gates,
          {
            gate_key: 'unsupported_value_gate',
            verdict: 'pass',
            severity: 'info',
            overridable_with_risk: false,
            rationale: 'This gate rejection triggers N7 readmission coverage.',
            refs: [rejectedDraft.reasoning_memo.cited_refs[0]!],
          },
        ],
      } as unknown as TopicSelectionV1bTopicValueAssessmentDraftPayload),
    ],
  });
  assert.equal(rejectedN8.gate_status, 'blocked');
  assert.equal(rejectedN8.error_code, 'N8_VALUE_GATE_COVERAGE_INVALID');
  assert.equal(rejectedN8.authority_ref, null);

  const feedbackInput = await n7FeedbackRequest(ctx, initialInput, first, 'gate_rejected');
  const readmitted = await ctx.service.invokeNode({
    ...feedbackInput,
    semantic_artifacts: [
      await recordN7SupportArtifact(ctx, feedbackInput, {
        allowed_effect: 'support_only',
        output_contract: 'N8DebateAdmissionReviewSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_n8_debate_admission_support,
        slot_id: 'n7_n8_debate_admission_review',
      }, n7DebateAdmissionPayload({
        debate_level: 'provider_diverse_deep_debate',
        rationale: 'Gate rejection requires readmission before the same candidate can be reassessed.',
        risk_signal_codes: ['debate_admission_too_weak'],
      }) as unknown as Record<string, unknown>),
    ],
  });
  assert.equal(readmitted.gate_status, 'admitted_with_warnings');
  assert.equal(readmitted.authority_ref?.ref_id, first.authority_ref?.ref_id);
  const readmittedHandoffArtifact = await ctx.controlPlane.getArtifactRef(readmitted.handoff_ref!.ref_id);
  const readmittedHandoff = readmittedHandoffArtifact?.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
  const readmittedPayload = readmittedHandoff.payload as {
    active_candidate_ref: TopicSelectionFunctionalRef;
    n8_debate_admission_hash: string;
  };
  assert.equal(readmittedPayload.active_candidate_ref.ref_id, firstHandoffPayload.active_candidate_ref.ref_id);
  assert.notEqual(readmittedPayload.n8_debate_admission_hash, firstHandoffPayload.n8_debate_admission_hash);

  const n8Input = await n8Request(ctx, readmitted, {
    workflow_run_id: 'workflow_run_v1b_n8_after_gate_readmission',
    node_attempt_id: 'node_attempt_v1b_n8_after_gate_readmission',
  });
  const n8 = await ctx.service.invokeNode({
    ...n8Input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, n8Input, n8ValueDraft(n8Input))],
  });
  assert.equal(n8.gate_status, 'admitted_with_warnings');
  const assessment = await ctx.valueAssessmentRepository.findAssessmentById(n8.authority_ref!.ref_id);
  assert.equal(assessment?.topic_question_contract_id, first.authority_ref?.ref_id);

  const candidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(n6.authority_ref!.ref_id);
  assert.equal(candidates.filter((candidate) => candidate.status === 'rejected').length, 0);
  assert.equal(candidates.filter((candidate) => candidate.status === 'admitted').length, 1);
  const terminal = await runTerminalPackageFromN8(ctx, n8, 'after_gate_readmission');
  assert.equal(terminal.n11.route_decision, 'stop_v1b_complete');
});

test('v1b workflow harness N7 exhausted trials can loop back to regenerated N6 and close through N11', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const n6Input = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_exhaust_then_regen',
    node_attempt_id: 'node_attempt_v1b_n6_exhaust_then_regen',
  });
  const draft = await n6Draft(ctx, n6Input);
  const second = {
    ...draft.candidates[0]!,
    candidate_key: 'second_harness_candidate',
    main_question: 'How can a second trial exercise N7 exhaustion before N6 regeneration?',
    expected_claim: 'Multiple trials can exhaust and route back to N6 with synthesis context.',
  };
  const n6 = await ctx.service.invokeNode({
    ...n6Input,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, n6Input, {
        ...draft,
        recommended_candidate_keys: ['harness_candidate', 'second_harness_candidate'],
        candidates: [draft.candidates[0]!, second],
      }),
    ],
  });
  const initialInput = await n7Request(ctx, n6, {
    workflow_run_id: 'workflow_run_v1b_n7_exhaust_first',
    node_attempt_id: 'node_attempt_v1b_n7_exhaust_first',
  });
  const first = await ctx.service.invokeNode(initialInput);
  const secondTrial = await ctx.service.invokeNode(await n7FeedbackRequest(ctx, initialInput, first));
  const exhaustedInput = await n7FeedbackRequest(ctx, initialInput, secondTrial);
  const exhaustedCandidates = await ctx.topicQuestionRepository.listCandidatesByCandidateSetId(n6.authority_ref!.ref_id);
  const exhausted = await ctx.service.invokeNode({
    ...exhaustedInput,
    semantic_artifacts: [
      await recordN7SupportArtifact(ctx, exhaustedInput, {
        allowed_effect: 'support_only',
        output_contract: 'N8FailedTrialSynthesisSupport@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_failed_trial_synthesis_support,
        slot_id: 'n7_failed_trial_synthesis',
      }, {
        exhausted_candidate_refs: exhaustedCandidates.map((candidate) =>
          ref('topic_question_candidate', candidate.topic_question_candidate_id, TITLE_CARD_ID)),
        failure_reason_codes: ['value_not_supported'],
        synthesis_summary: 'Both candidate trials failed value support and should regenerate N6 candidates.',
        n6_regeneration_hints: ['Add a narrower method and stronger evidence link before retrying N6.'],
        affected_refs: [n6.authority_ref!],
      } satisfies TopicSelectionV1bN8FailedTrialSynthesisSupportPayload as unknown as Record<string, unknown>),
    ],
  });
  assert.equal(exhausted.gate_status, 'blocked');
  assert.equal(exhausted.route_decision, 'loopback');
  assert.equal(exhausted.error_code, 'N7_CANDIDATE_TRIALS_EXHAUSTED');
  await assertTraceLoopbackTargetCode(ctx, exhausted, 'n7_loopback_to_n6');
  const exhaustedDecision = await ctx.topicQuestionRepository.findSelectionDecisionById(exhausted.authority_ref!.ref_id);
  assert.equal(exhaustedDecision?.admission_review.loopback_target_code, 'n7_loopback_to_n6');

  const regenInput = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_after_n7_exhaustion',
    node_attempt_id: 'node_attempt_v1b_n6_after_n7_exhaustion',
  });
  const regenDraft = await n6Draft(ctx, regenInput, {
    generation_notes: ['Regenerated after N7 exhausted all prior candidate trials.'],
  });
  regenDraft.recommended_candidate_keys = ['regenerated_after_exhaustion_candidate'];
  regenDraft.candidates[0] = {
    ...regenDraft.candidates[0]!,
    candidate_key: 'regenerated_after_exhaustion_candidate',
    main_question: 'How can regenerated N6 candidates recover value support after exhausted N7 trials?',
    expected_claim: 'Regenerated candidates can recover value support after exhausted N7 trials.',
  };
  const regeneratedN6 = await ctx.service.invokeNode({
    ...regenInput,
    semantic_artifacts: [await recordN6DraftArtifact(ctx, regenInput, regenDraft)],
  });
  assert.equal(regeneratedN6.gate_status, 'admitted');
  assert.equal(regeneratedN6.route_decision, 'invoke_next');

  const n7 = await ctx.service.invokeNode(await n7Request(ctx, regeneratedN6, {
    workflow_run_id: 'workflow_run_v1b_n7_after_exhaustion_regen',
    node_attempt_id: 'node_attempt_v1b_n7_after_exhaustion_regen',
  }));
  assert.equal(n7.gate_status, 'admitted');
  const n8Input = await n8Request(ctx, n7, {
    workflow_run_id: 'workflow_run_v1b_n8_after_exhaustion_regen',
    node_attempt_id: 'node_attempt_v1b_n8_after_exhaustion_regen',
  });
  const n8 = await ctx.service.invokeNode({
    ...n8Input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, n8Input, n8ValueDraft(n8Input))],
  });
  assert.equal(n8.gate_status, 'admitted_with_warnings');

  const terminal = await runTerminalPackageFromN8(ctx, n8, 'after_exhaustion_regen');
  assert.equal(terminal.n11.route_decision, 'stop_v1b_complete');
  assert.equal((await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID)).length, 2);
});

test('v1b workflow harness N6 admits runtime regeneration from N7 loopback projection', async () => {
  const ctx = await seedHarnessV1aBundle();
  const loopback = await runN7ExhaustionLoopbackFixture(ctx, 'runtime_regen');
  const regenInputBase = await n6Request(ctx, loopback.n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_regen_after_n7',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_regen_after_n7',
  });
  const regenInput = n6InputWithN7LoopbackProjection(regenInputBase, loopback.projectionRef);
  const regenDraft = await n6Draft(ctx, regenInput, {
    generation_notes: ['Runtime regeneration consumed N7 failed-trial projection context.'],
  });
  regenDraft.recommended_candidate_keys = ['runtime_regenerated_after_n7_candidate'];
  regenDraft.candidates[0] = {
    ...regenDraft.candidates[0]!,
    candidate_key: 'runtime_regenerated_after_n7_candidate',
    main_question: 'How can runtime-regenerated N6 candidates recover after N7 failed-trial exhaustion?',
    expected_claim: 'Runtime-regenerated candidates can recover the v1b path after N7 trial exhaustion.',
  };

  const semanticArtifact = await generateN6RuntimeDraftArtifact(
    ctx,
    regenInput,
    regenDraft,
    'regeneration_after_n7_loopback',
  );
  assert.equal(semanticArtifact.prompt_variant_key, 'n6_question_candidate_draft.regeneration_after_n7_loopback');
  assert.equal(semanticArtifact.source_hashes.n7_loopback_projection_hash, loopback.projectionArtifact.checksum);
  assert.equal(
    semanticArtifact.source_hashes.n7_loopback_failed_trial_synthesis_hash,
    loopback.projection.failed_trial_synthesis_hash,
  );

  const regenerated = await ctx.service.invokeNode({
    ...regenInput,
    semantic_artifacts: [semanticArtifact],
  });
  assert.equal(regenerated.gate_status, 'admitted');
  assert.equal(regenerated.route_decision, 'invoke_next');
  assert.equal(regenerated.authority_ref?.ref_type, 'topic_question_candidate_set');
  assert.equal(regenerated.handoff_ref?.ref_type, 'artifact_ref');

  const promptMismatchBase = await n6Request(ctx, loopback.n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_regen_prompt_mismatch',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_regen_prompt_mismatch',
  });
  const promptMismatchInput = n6InputWithN7LoopbackProjection(promptMismatchBase, loopback.projectionRef);
  const promptMismatchArtifact = await generateN6RuntimeDraftArtifact(
    ctx,
    promptMismatchInput,
    await n6Draft(ctx, promptMismatchInput),
    'regeneration_after_n7_loopback',
  );
  const promptMismatch = await ctx.service.invokeNode({
    ...promptMismatchInput,
    semantic_artifacts: [{
      ...promptMismatchArtifact,
      prompt_variant_key: 'n6_question_candidate_draft.initial_from_n5',
    }],
  });
  assert.equal(promptMismatch.gate_status, 'blocked');
  assert.equal(promptMismatch.error_code, 'N6_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT');

  const sourceDriftBase = await n6Request(ctx, loopback.n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_regen_source_drift',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_regen_source_drift',
  });
  const sourceDriftInput = n6InputWithN7LoopbackProjection(sourceDriftBase, loopback.projectionRef);
  const sourceDriftArtifact = await generateN6RuntimeDraftArtifact(
    ctx,
    sourceDriftInput,
    await n6Draft(ctx, sourceDriftInput),
    'regeneration_after_n7_loopback',
  );
  const sourceDrift = await ctx.service.invokeNode({
    ...sourceDriftInput,
    semantic_artifacts: [{
      ...sourceDriftArtifact,
      source_hashes: {
        ...sourceDriftArtifact.source_hashes,
        n7_loopback_projection_hash: '9'.repeat(64),
      },
    }],
  });
  assert.equal(sourceDrift.gate_status, 'blocked');
  assert.equal(sourceDrift.error_code, 'N6_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT');
});

test('v1b N6 runtime regeneration blocks orphan and malformed N7 loopback projections', async () => {
  const orphanCtx = await seedHarnessV1aBundle();
  const { n5: orphanN5 } = await runReadyN5(orphanCtx);
  const orphanInput = await n6Request(orphanCtx, orphanN5, {
    workflow_run_id: 'workflow_run_v1b_n6_runtime_regen_orphan',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_regen_orphan',
  });
  const orphanDraft = await n6Draft(orphanCtx, orphanInput);
  const orphanRuntime = new TopicSelectionV1bN6DraftRuntimeService(orphanCtx.controlPlane);
  await assert.rejects(
    () => orphanRuntime.generateDraftArtifact({
      request: orphanInput,
      generation_mode: 'regeneration_after_n7_loopback',
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: orphanDraft,
        operator_label: 'unit-test-runtime',
      },
      created_by: 'system',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message.includes('requires an N7 failed-trial loopback projection'),
  );

  const malformedCtx = await seedHarnessV1aBundle();
  const loopback = await runN7ExhaustionLoopbackFixture(malformedCtx, 'runtime_regen_malformed_projection');
  const projection = loopback.projection;
  const firstExhaustedRef = projection.exhausted_candidate_refs[0]!;
  const malformedProjection = {
    ...projection,
    source_refs: projection.source_refs.filter((sourceRef) =>
      sourceRef.ref_id !== firstExhaustedRef.ref_id || sourceRef.ref_type !== firstExhaustedRef.ref_type),
  };
  const malformedProjectionArtifact = await malformedCtx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_regen_malformed_projection',
    payload: malformedProjection as unknown as Record<string, unknown>,
    checksum: sha256Text(stableStringify(malformedProjection)),
    created_by: 'system',
  });
  const malformedInputBase = await n6Request(malformedCtx, loopback.n5, {
    workflow_run_id: 'workflow_run_v1b_n6_runtime_regen_bad_projection',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_regen_bad_projection',
  });
  const malformedInput = n6InputWithN7LoopbackProjection(
    malformedInputBase,
    ref('artifact_ref', malformedProjectionArtifact.artifact_ref_id, TITLE_CARD_ID),
  );
  const malformedDraft = await n6Draft(malformedCtx, malformedInput);
  const malformedRuntime = new TopicSelectionV1bN6DraftRuntimeService(malformedCtx.controlPlane);
  await assert.rejects(
    () => malformedRuntime.generateDraftArtifact({
      request: malformedInput,
      generation_mode: 'regeneration_after_n7_loopback',
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: malformedDraft,
        operator_label: 'unit-test-runtime',
      },
      created_by: 'system',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message.includes('unknown exhausted candidate ref'),
  );
});

test('v1b workflow harness N6 admits runtime regeneration from N6 gate-failure retry projection', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);
  const failedInput = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_first',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_first',
  });
  const failedDraft = await n6Draft(ctx, failedInput);
  failedDraft.candidates[0] = {
    ...failedDraft.candidates[0]!,
    answerability_verdict: 'not_answerable',
    main_question: 'How can AI improve research?',
  };
  const failedDraftArtifact = await generateN6RuntimeDraftArtifact(ctx, failedInput, failedDraft);
  const failedDraftHash = sha256Text(stableStringify(failedDraft));
  const failed = await ctx.service.invokeNode({
    ...failedInput,
    semantic_artifacts: [failedDraftArtifact],
  });
  assert.equal(failed.gate_status, 'blocked');
  assert.equal(failed.route_decision, 'loopback');
  assert.equal(failed.error_code, 'N6_NO_ADMISSIBLE_TOPIC_QUESTION_CANDIDATE');
  const projectionRef = await n6GateFailureRetryProjectionRef(ctx, failed);
  const projectionArtifact = await ctx.controlPlane.getArtifactRef(projectionRef.ref_id);
  assert.ok(projectionArtifact);
  const projectionPayload = projectionArtifact.payload;
  assert.ok(projectionPayload);
  assert.equal(projectionPayload.projection_kind, 'v1b_n6_gate_failure_retry_context');
  assert.equal(projectionPayload.failed_draft_hash, failedDraftHash);
  assert.deepEqual(await ctx.topicQuestionRepository.listCandidateSetsByTitleCardId(TITLE_CARD_ID), []);

  const retryInputBase = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_retry',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_retry',
  });
  const retryInput = n6InputWithN6GateFailureProjection(retryInputBase, projectionRef);
  const retryDraft = await n6Draft(ctx, retryInput, {
    generation_notes: ['Runtime regeneration consumed N6 gate-failure retry context.'],
  });
  retryDraft.recommended_candidate_keys = ['runtime_regenerated_after_n6_gate_failure'];
  retryDraft.candidates[0] = {
    ...retryDraft.candidates[0]!,
    candidate_key: 'runtime_regenerated_after_n6_gate_failure',
    main_question: 'How can runtime-regenerated N6 candidates recover after an N6 deterministic gate failure?',
    expected_claim: 'Runtime-regenerated candidates can recover the v1b path after an N6 gate failure.',
  };
  const retryArtifact = await generateN6RuntimeDraftArtifact(
    ctx,
    retryInput,
    retryDraft,
    'regeneration_after_n6_gate_failure',
  );
  assert.equal(retryArtifact.prompt_variant_key, 'n6_question_candidate_draft.regeneration_after_n6_gate_failure');
  assert.equal(retryArtifact.source_hashes.n6_gate_failure_projection_hash, projectionArtifact.checksum);
  assert.equal(retryArtifact.source_hashes.n6_gate_failure_failed_draft_hash, failedDraftHash);
  assert.equal(
    retryArtifact.source_hashes.n6_gate_failure_blocked_candidate_context_hash,
    projectionPayload.blocked_candidate_context_hash,
  );

  const regenerated = await ctx.service.invokeNode({
    ...retryInput,
    semantic_artifacts: [retryArtifact],
  });
  assert.equal(regenerated.gate_status, 'admitted');
  assert.equal(regenerated.route_decision, 'invoke_next');
  assert.equal(regenerated.authority_ref?.ref_type, 'topic_question_candidate_set');
  assert.equal(regenerated.handoff_ref?.ref_type, 'artifact_ref');

  const promptMismatchBase = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_prompt_mismatch',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_prompt_mismatch',
  });
  const promptMismatchInput = n6InputWithN6GateFailureProjection(promptMismatchBase, projectionRef);
  const promptMismatchArtifact = await generateN6RuntimeDraftArtifact(
    ctx,
    promptMismatchInput,
    await n6Draft(ctx, promptMismatchInput),
    'regeneration_after_n6_gate_failure',
  );
  const promptMismatch = await ctx.service.invokeNode({
    ...promptMismatchInput,
    semantic_artifacts: [{
      ...promptMismatchArtifact,
      prompt_variant_key: 'n6_question_candidate_draft.initial_from_n5',
    }],
  });
  assert.equal(promptMismatch.gate_status, 'blocked');
  assert.equal(promptMismatch.error_code, 'N6_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT');

  const sourceDriftBase = await n6Request(ctx, n5, {
    run_mode: 'product',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_source_drift',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_source_drift',
  });
  const sourceDriftInput = n6InputWithN6GateFailureProjection(sourceDriftBase, projectionRef);
  const sourceDriftArtifact = await generateN6RuntimeDraftArtifact(
    ctx,
    sourceDriftInput,
    await n6Draft(ctx, sourceDriftInput),
    'regeneration_after_n6_gate_failure',
  );
  const sourceDrift = await ctx.service.invokeNode({
    ...sourceDriftInput,
    semantic_artifacts: [{
      ...sourceDriftArtifact,
      source_hashes: {
        ...sourceDriftArtifact.source_hashes,
        n6_gate_failure_projection_hash: '9'.repeat(64),
      },
    }],
  });
  assert.equal(sourceDrift.gate_status, 'blocked');
  assert.equal(sourceDrift.error_code, 'N6_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT');
});

// Local mirror of the divergent-debate test's mockedRole (that helper lives in the runtime test file).
function mockedN6DebateRole(
  slot: TopicSelectionV1bN6DivergentDebateRoleSlotId,
  idx: number,
  body: Record<string, unknown>,
): V1bN6DebateInputs {
  return {
    codex_response: null,
    mocked_output: {
      fixture_id: `n6_debate_${slot}_${idx}`,
      output: { schema_version: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1', role_slot: slot, ...body },
    } as never,
    instance_index: idx,
  };
}

// T-127 W-07 item (a) follow-up: the N6 divergent-debate escalation now runs END-TO-END against the
// REAL harness + runtime. Previously the harness recorded the gate-failure retry projection only on
// the n6_regenerate_candidates loopback, so runDivergentDebate (regeneration_after_n6_gate_failure)
// threw AppError(400) on the escalation route. This proves: harness records the projection on the
// escalation loopback → the real divergent debate consumes it → the gate admits the bridged draft.
test('v1b N6 divergent-debate escalation runs end-to-end: harness records the gate-failure projection, the real runtime consumes it, and the gate admits the debate draft', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n5 } = await runReadyN5(ctx);

  // 1. Drive the real harness N6 gate to an n6_debate_escalation loopback (failed draft + triage).
  //    run_mode stays at the n6Request default so the triage artifact's identity matches the request
  //    (an explicit run_mode here mismatches the recorded triage and blocks before routing).
  const failedInput = await n6Request(ctx, n5, {
    workflow_run_id: 'workflow_run_v1b_n6_debate_escalation_e2e_first',
    node_attempt_id: 'node_attempt_v1b_n6_debate_escalation_e2e_first',
  });
  const failedDraft = await n6Draft(ctx, failedInput);
  const escalation = await ctx.service.invokeNode({
    ...failedInput,
    semantic_artifacts: [
      await recordN6DraftArtifact(ctx, failedInput, {
        ...failedDraft,
        candidates: [{
          ...failedDraft.candidates[0]!,
          answerability_verdict: 'not_answerable',
          main_question: 'How can AI improve research?',
        }],
      }),
      await recordN6LoopbackTriageArtifact(ctx, failedInput, n6LoopbackTriagePayload(failedInput, {
        loopback_target_code: 'n6_debate_escalation',
        debate_escalation: {
          debate_level: 'mixed_cost_control',
          recommended_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
          sticky: true,
          rationale: 'Escalate candidate generation to a divergent debate before retrying N6.',
        },
        upstream_rollback: null,
        rationale: 'Candidate failures look like prompt contention rather than a bad selected slice.',
      })),
    ],
  });
  assert.equal(escalation.route_decision, 'loopback');
  assert.ok(escalation.warnings.some((warning) => warning.code === 'N6_DEBATE_ESCALATION_RECOMMENDED'));

  // 2. The harness now records a gate-failure retry projection on the escalation loopback (NEW —
  //    previously only n6_regenerate_candidates did), tagged with the escalation target code.
  const escalationTrace = await assertTraceLoopbackTargetCode(
    ctx, escalation, 'n6_debate_escalation', 'topic-selection.v1b.generate-topic-question-candidates.v1',
  );
  const projectionRef = escalationTrace.payload.runtime_context_projection_ref as TopicSelectionFunctionalRef | null;
  assert.equal(projectionRef?.ref_type, 'artifact_ref', 'escalation loopback must record a runtime context projection');
  const projectionArtifact = await ctx.controlPlane.getArtifactRef(projectionRef!.ref_id);
  assert.equal(projectionArtifact?.payload?.projection_kind, 'v1b_n6_gate_failure_retry_context');
  assert.equal(projectionArtifact?.payload?.loopback_target_code, 'n6_debate_escalation');

  // 3. Run the REAL divergent debate in regeneration_after_n6_gate_failure mode, with the escalation
  //    projection threaded into source_refs — resolveModeContext must now accept it (was throwing).
  const retryBase = await n6Request(ctx, n5, {
    run_mode: 'test',
    workflow_run_id: 'workflow_run_v1b_n6_debate_escalation_e2e_retry',
    node_attempt_id: 'node_attempt_v1b_n6_debate_escalation_e2e_retry',
  });
  const retryInput = n6InputWithN6GateFailureProjection(retryBase, projectionRef!);
  const arbiterDraft = await n6Draft(ctx, retryInput); // a valid, admissible 5-key candidate set
  const debateRuntime = new TopicSelectionV1bN6DivergentDebateRuntimeService(ctx.controlPlane);
  const debate = await debateRuntime.runDivergentDebate({
    request: retryInput,
    generation_mode: 'regeneration_after_n6_gate_failure',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    role_outputs: {
      n6_debate_explorer: [
        mockedN6DebateRole('n6_debate_explorer', 0, { candidate_seeds: [{ seed_id: 's0', question_framing: 'framing 0', evidence_refs: [] }] }),
        mockedN6DebateRole('n6_debate_explorer', 1, { candidate_seeds: [{ seed_id: 's1', question_framing: 'framing 1', evidence_refs: [] }] }),
      ],
      n6_debate_critic: [
        mockedN6DebateRole('n6_debate_critic', 0, { critic_findings: [{ finding_code: 'weak_topic_question_candidate_set', severity: 'note', statement: 'thin set' }] }),
      ],
      n6_debate_arbiter: [
        mockedN6DebateRole('n6_debate_arbiter', 0, { synthesized_candidate_set: arbiterDraft }),
      ],
    },
    created_by: 'system',
  });
  assert.equal(debate.status, 'completed', 'the divergent debate must complete with the escalation projection');
  if (debate.status !== 'completed') return;
  assert.equal(debate.gate_draft.status, 'succeeded');
  if (debate.gate_draft.status !== 'succeeded') return;
  // The bridged gate-facing draft carries single-agent runtime_verified identity under the gate-failure mode.
  assert.equal(debate.gate_draft.semantic_artifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(debate.gate_draft.semantic_artifact.allowed_effect, 'model_draft_for_gate');
  assert.equal(debate.gate_draft.semantic_artifact.prompt_variant_key, 'n6_question_candidate_draft.regeneration_after_n6_gate_failure');

  // 4. Feed the debate's bridged runtime_verified draft back through the real harness N6 gate → admit.
  const regenerated = await ctx.service.invokeNode({
    ...retryInput,
    semantic_artifacts: [debate.gate_draft.semantic_artifact],
  });
  assert.equal(regenerated.gate_status, 'admitted');
  assert.equal(regenerated.route_decision, 'invoke_next');
  assert.equal(regenerated.authority_ref?.ref_type, 'topic_question_candidate_set');
  assert.equal(regenerated.handoff_ref?.ref_type, 'artifact_ref');
});

test('v1b N6 runtime regeneration blocks orphan and malformed N6 gate-failure retry projections', async () => {
  const orphanCtx = await seedHarnessV1aBundle();
  const { n5: orphanN5 } = await runReadyN5(orphanCtx);
  const orphanInput = await n6Request(orphanCtx, orphanN5, {
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_orphan',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_orphan',
  });
  const orphanDraft = await n6Draft(orphanCtx, orphanInput);
  const orphanRuntime = new TopicSelectionV1bN6DraftRuntimeService(orphanCtx.controlPlane);
  await assert.rejects(
    () => orphanRuntime.generateDraftArtifact({
      request: orphanInput,
      generation_mode: 'regeneration_after_n6_gate_failure',
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: orphanDraft,
        operator_label: 'unit-test-runtime',
      },
      created_by: 'system',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message.includes('requires exactly one N6 gate-failure retry projection'),
  );

  const malformedCtx = await seedHarnessV1aBundle();
  const { n5: malformedN5 } = await runReadyN5(malformedCtx);
  const failedInput = await n6Request(malformedCtx, malformedN5, {
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_malformed_first',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_malformed_first',
  });
  const failedDraft = await n6Draft(malformedCtx, failedInput);
  failedDraft.candidates[0] = {
    ...failedDraft.candidates[0]!,
    answerability_verdict: 'not_answerable',
    main_question: 'How can AI improve research?',
  };
  const failedArtifact = await generateN6RuntimeDraftArtifact(malformedCtx, failedInput, failedDraft);
  const failed = await malformedCtx.service.invokeNode({
    ...failedInput,
    semantic_artifacts: [failedArtifact],
  });
  const projectionRef = await n6GateFailureRetryProjectionRef(malformedCtx, failed);
  const projectionArtifact = await malformedCtx.controlPlane.getArtifactRef(projectionRef.ref_id);
  assert.ok(projectionArtifact);
  const projectionPayload = projectionArtifact.payload;
  assert.ok(projectionPayload);
  const malformedProjection = {
    ...projectionPayload,
    source_refs: (projectionPayload.source_refs as TopicSelectionFunctionalRef[]).filter((sourceRef) =>
      sourceRef.ref_id !== (projectionPayload.failed_draft_ref as TopicSelectionFunctionalRef).ref_id),
  };
  const malformedProjectionArtifact = await malformedCtx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_malformed_projection',
    payload: malformedProjection as unknown as Record<string, unknown>,
    checksum: sha256Text(stableStringify(malformedProjection)),
    created_by: 'system',
  });
  const malformedInputBase = await n6Request(malformedCtx, malformedN5, {
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_bad_projection',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_bad_projection',
  });
  const malformedInput = n6InputWithN6GateFailureProjection(
    malformedInputBase,
    ref('artifact_ref', malformedProjectionArtifact.artifact_ref_id, TITLE_CARD_ID),
  );
  const malformedDraft = await n6Draft(malformedCtx, malformedInput);
  const malformedRuntime = new TopicSelectionV1bN6DraftRuntimeService(malformedCtx.controlPlane);
  await assert.rejects(
    () => malformedRuntime.generateDraftArtifact({
      request: malformedInput,
      generation_mode: 'regeneration_after_n6_gate_failure',
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: malformedDraft,
        operator_label: 'unit-test-runtime',
      },
      created_by: 'system',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message.includes('does not preserve required N6 lineage refs'),
  );

  const sourceHashDriftProjection = {
    ...projectionPayload,
    source_hashes: {
      ...(projectionPayload.source_hashes as Record<string, string>),
      failed_draft_prompt_packet_hash: '8'.repeat(64),
    },
  };
  const sourceHashDriftProjectionArtifact = await malformedCtx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_source_hash_drift_projection',
    payload: sourceHashDriftProjection as unknown as Record<string, unknown>,
    checksum: sha256Text(stableStringify(sourceHashDriftProjection)),
    created_by: 'system',
  });
  const sourceHashDriftInputBase = await n6Request(malformedCtx, malformedN5, {
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_bad_projection_hashes',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_bad_projection_hashes',
  });
  const sourceHashDriftInput = n6InputWithN6GateFailureProjection(
    sourceHashDriftInputBase,
    ref('artifact_ref', sourceHashDriftProjectionArtifact.artifact_ref_id, TITLE_CARD_ID),
  );
  const sourceHashDriftDraft = await n6Draft(malformedCtx, sourceHashDriftInput);
  await assert.rejects(
    () => malformedRuntime.generateDraftArtifact({
      request: sourceHashDriftInput,
      generation_mode: 'regeneration_after_n6_gate_failure',
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: sourceHashDriftDraft,
        operator_label: 'unit-test-runtime',
      },
      created_by: 'system',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message.includes('source hashes drift from frozen N6 lineage'),
  );

  const selectedSliceRefDriftProjection = {
    ...projectionPayload,
    selected_research_slice_ref: ref('research_slice', 'research_slice_outside_retry_projection', TITLE_CARD_ID),
  };
  const selectedSliceRefDriftProjectionArtifact = await malformedCtx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_selected_slice_ref_drift_projection',
    payload: selectedSliceRefDriftProjection as unknown as Record<string, unknown>,
    checksum: sha256Text(stableStringify(selectedSliceRefDriftProjection)),
    created_by: 'system',
  });
  const selectedSliceRefDriftInputBase = await n6Request(malformedCtx, malformedN5, {
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_selected_slice_ref_drift',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_selected_slice_ref_drift',
  });
  const selectedSliceRefDriftInput = n6InputWithN6GateFailureProjection(
    selectedSliceRefDriftInputBase,
    ref('artifact_ref', selectedSliceRefDriftProjectionArtifact.artifact_ref_id, TITLE_CARD_ID),
  );
  const selectedSliceRefDriftDraft = await n6Draft(malformedCtx, selectedSliceRefDriftInput);
  await assert.rejects(
    () => malformedRuntime.generateDraftArtifact({
      request: selectedSliceRefDriftInput,
      generation_mode: 'regeneration_after_n6_gate_failure',
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: selectedSliceRefDriftDraft,
        operator_label: 'unit-test-runtime',
      },
      created_by: 'system',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message.includes('source hashes drift from frozen N6 lineage'),
  );

  const rawHashMapProjection = {
    ...projectionPayload,
    source_hashes: {
      ...(projectionPayload.source_hashes as Record<string, unknown>),
      raw_context_payload: { forbidden: 'raw payload in projection hash map' },
    },
  };
  const rawHashMapProjectionArtifact = await malformedCtx.controlPlane.recordArtifactRef({
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_raw_hash_map_projection',
    payload: rawHashMapProjection as unknown as Record<string, unknown>,
    checksum: sha256Text(stableStringify(rawHashMapProjection)),
    created_by: 'system',
  });
  const rawHashMapInputBase = await n6Request(malformedCtx, malformedN5, {
    workflow_run_id: 'workflow_run_v1b_n6_runtime_gate_failure_raw_hash_map',
    node_attempt_id: 'node_attempt_v1b_n6_runtime_gate_failure_raw_hash_map',
  });
  const rawHashMapInput = n6InputWithN6GateFailureProjection(
    rawHashMapInputBase,
    ref('artifact_ref', rawHashMapProjectionArtifact.artifact_ref_id, TITLE_CARD_ID),
  );
  const rawHashMapDraft = await n6Draft(malformedCtx, rawHashMapInput);
  await assert.rejects(
    () => malformedRuntime.generateDraftArtifact({
      request: rawHashMapInput,
      generation_mode: 'regeneration_after_n6_gate_failure',
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: {
        output: rawHashMapDraft,
        operator_label: 'unit-test-runtime',
      },
      created_by: 'system',
    }),
    (error) => error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message.includes('hash maps contain non-hash or unexpected keys'),
  );
});

test('v1b workflow harness N9 creates advance disposition and N10 creates draft package plus v1c bundle', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n8 } = await runReadyN8(ctx);
  const n9Input = await n9Request(ctx, n8);
  const n9 = await ctx.service.invokeNode(n9Input);

  assert.equal(n9.gate_status, 'admitted_with_warnings');
  assert.equal(n9.route_decision, 'invoke_next');
  assert.equal(n9.authority_ref?.ref_type, 'value_disposition_decision');
  const decision = await ctx.valueAssessmentRepository.findDispositionDecisionById(n9.authority_ref!.ref_id);
  assert.equal(decision?.decision, 'advance_to_package');
  assert.ok(decision?.package_draft_input);
  assert.equal(n9.handoff_ref?.ref_type, 'artifact_ref');

  const n10Input = await n10Request(ctx, n9);
  const n10 = await ctx.service.invokeNode(n10Input);
  assert.equal(n10.gate_status, 'admitted_with_warnings');
  assert.equal(n10.route_decision, 'invoke_next');
  assert.equal(n10.authority_ref?.ref_type, 'topic_package');
  const pkg = await ctx.topicPackageRepository.findPackageById(n10.authority_ref!.ref_id);
  assert.equal(pkg?.package_readiness_status, 'ready_for_promotion_review');
  assert.equal(pkg ? hashPackageForHarness(pkg) : null, n10.hashes.authority_hash);
  const bundle = pkg ? await ctx.topicPackageRepository.findV1cInputBundleByPackageId(pkg.topic_package_id) : null;
  assert.equal(bundle?.bundle_status, 'ready_for_promotion_review');
  assert.equal(decision ? (await ctx.valueAssessmentRepository.findDispositionDecisionById(decision.value_disposition_decision_id))?.output_topic_package_id : null, pkg?.topic_package_id);
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n10.handoff_ref!.ref_id);
  const handoff = handoffArtifact?.payload as TopicSelectionV1bWorkflowHarnessHandoff | null;
  assert.equal(handoff?.envelope.handoff_kind, 'N10ToN11Handoff');

  const duplicateInput = await n10Request(ctx, n9, {
    workflow_run_id: 'workflow_run_v1b_n10_duplicate',
    node_attempt_id: 'node_attempt_v1b_n10_duplicate',
  });
  const duplicate = await ctx.service.invokeNode(duplicateInput);
  assert.equal(duplicate.gate_status, 'admitted_with_warnings');
  assert.equal(duplicate.authority_ref?.ref_id, n10.authority_ref?.ref_id);
  assert.equal(duplicate.warnings.some((warning) => warning.code === 'N10_PACKAGE_EXISTING_RETURNED'), true);
  assert.equal((await ctx.topicPackageRepository.listPackagesByTitleCardId(TITLE_CARD_ID)).length, 1);
});

test('v1b workflow harness N9 terminal non-advance prevents package creation handoff', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n7 } = await runReadyN7(ctx);
  const n8Input = await n8Request(ctx, n7);
  const draft = n8ValueDraft(n8Input, {
    readiness_status: 'needs_refinement',
    recommended_disposition: 'refine_question',
    reasoning_memo: {
      ...n8ValueDraft(n8Input).reasoning_memo,
      recommendation: 'refine_question',
      disposition_bridge: 'Refine the question before package creation.',
    },
    total_score: 58,
  });
  const n8 = await ctx.service.invokeNode({
    ...n8Input,
    semantic_artifacts: [await recordN8ValueDraftArtifact(ctx, n8Input, draft)],
  });
  assert.equal(n8.gate_status, 'admitted_with_warnings');

  const n9Input = await n9Request(ctx, n8);
  const n9 = await ctx.service.invokeNode(n9Input);
  assert.equal(n9.gate_status, 'terminal_no_advance');
  assert.equal(n9.failure_class, 'terminal_no_advance');
  assert.equal(n9.route_decision, 'blocked');
  assert.equal(n9.handoff_ref, null);
  const decision = await ctx.valueAssessmentRepository.findDispositionDecisionById(n9.authority_ref!.ref_id);
  assert.equal(decision?.decision, 'refine_question');
  assert.equal(decision?.package_draft_input, null);
  assert.deepEqual(await ctx.topicPackageRepository.listPackagesByTitleCardId(TITLE_CARD_ID), []);
});

test('v1b workflow harness N11 publishes v1c input bundle and closes N1-N11 service-level E2E', async () => {
  const ctx = await seedHarnessV1aBundle();
  const { n10, n11 } = await runReadyN11(ctx);

  assert.equal(n11.gate_status, 'admitted_with_warnings');
  assert.equal(n11.route_decision, 'stop_v1b_complete');
  assert.equal(n11.error_code, null);
  assert.equal(n11.authority_ref?.ref_type, 'v1b_to_v1c_input_bundle');
  assert.equal(n11.handoff_ref?.ref_type, 'artifact_ref');
  assert.match(n11.hashes.authority_hash ?? '', /^[a-f0-9]{64}$/);

  const pkg = await ctx.topicPackageRepository.findPackageById(n10.authority_ref!.ref_id);
  const bundle = await ctx.topicPackageRepository.findV1cInputBundleById(n11.authority_ref!.ref_id);
  assert.equal(bundle?.topic_package_id, pkg?.topic_package_id);
  assert.equal(bundle ? hashV1cBundleForHarness(bundle) : null, n11.hashes.authority_hash);
  const handoffArtifact = await ctx.controlPlane.getArtifactRef(n11.handoff_ref!.ref_id);
  const handoff = handoffArtifact?.payload as TopicSelectionV1bWorkflowHarnessHandoff | null;
  assert.equal(handoff?.envelope.handoff_kind, 'V1cInputBundle');
  assert.equal(handoff?.target_node_id, 'v1c.entry');
  const payload = handoff?.payload as {
    draft_topic_package_ref?: TopicSelectionFunctionalRef;
    v1c_input_bundle_ref?: TopicSelectionFunctionalRef;
  } | null;
  assert.equal(payload?.draft_topic_package_ref?.ref_id, pkg?.topic_package_id);
  assert.equal(payload?.v1c_input_bundle_ref?.ref_id, bundle?.v1b_to_v1c_input_bundle_id);
  assert.equal(JSON.stringify(bundle).includes('paper_project'), false);
  assert.equal(JSON.stringify(bundle).includes('promotion_decision'), false);

  const replay = await ctx.service.invokeNode(await n11Request(ctx, n10));
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.authority_ref?.ref_id, n11.authority_ref?.ref_id);

  const sideEffectInput = await n11Request(ctx, n10, {
    workflow_run_id: 'workflow_run_v1b_n11_side_effect',
    node_attempt_id: 'node_attempt_v1b_n11_side_effect',
  });
  const sideEffectFrozenInput = {
    ...sideEffectInput.frozen_input,
    frozen_input_hash: null,
    payload: {
      ...sideEffectInput.frozen_input.payload,
      paper_project_ref: ref('paper_project', 'paper_project_001', TITLE_CARD_ID),
    },
  };
  const sideEffectResult = await ctx.service.invokeNode(request({
    ...sideEffectInput,
    frozen_input: sideEffectFrozenInput,
  }));
  assert.equal(sideEffectResult.gate_status, 'blocked');
  assert.equal(sideEffectResult.error_code, 'N11_FROZEN_PAYLOAD_INVALID');
  assert.equal(sideEffectResult.authority_ref, null);
});

test('v1b workflow harness N1 admitted replay is exact and changed frozen input detects drift', async () => {
  const ctx = await seedHarnessV1aBundle();
  const input = n1Request(ctx.bundle, {
    workflow_run_id: 'workflow_run_v1b_n1_replay',
    node_attempt_id: 'node_attempt_v1b_n1_replay',
  });
  const first = await ctx.service.invokeNode(input);
  const replay = await ctx.service.invokeNode(input);
  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.hashes.authority_hash, first.hashes.authority_hash);

  const drift = await ctx.service.invokeNode({
    ...input,
    frozen_input: {
      ...input.frozen_input,
      payload: {
        ...input.frozen_input.payload,
        source_refs_hash: 'b'.repeat(64),
      },
      frozen_input_hash: null,
    },
  });
  assert.equal(drift.error_code, 'REPLAY_INPUT_HASH_MISMATCH');
});

test('v1b workflow harness blocks model-like execution specs on deterministic nodes', async () => {
  const ctx = makeContext();
  const result = await ctx.service.invokeNode(request({
    node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: 'topic-selection.v1b.readiness.invalid-provider',
    },
  }));

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'INVALID_NODE_PROVIDER_SPEC');
  assert.equal(result.authority_ref, null);
  assert.equal(result.handoff_ref, null);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, []);
});

test('v1b workflow harness rejects raw provider fields by request schema before persistence', async () => {
  const ctx = makeContext();
  const invalid = {
    ...request({
      node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
    }),
    provider_id: 'openai',
  };

  await assert.rejects(
    () => ctx.service.invokeNode(invalid as TopicSelectionV1bWorkflowHarnessRunRequest),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.deepEqual(await ctx.controlPlane.listArtifactRefsByWorkflowRunId('workflow_run_v1b_harness_001'), []);
});

test('v1b workflow harness rejects invalid actor metadata before persistence', async () => {
  const ctx = makeContext();
  const invalidCreatedBy = request({
    created_by: 'provider' as TopicSelectionV1bWorkflowHarnessRunRequest['created_by'],
  });
  const invalidActor = request({
    workflow_run_id: 'workflow_run_v1b_harness_invalid_actor',
    actor: {
      actor_type: 'provider' as NonNullable<TopicSelectionV1bWorkflowHarnessRunRequest['actor']>['actor_type'],
    },
  });

  await assert.rejects(
    () => ctx.service.invokeNode(invalidCreatedBy),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  await assert.rejects(
    () => ctx.service.invokeNode(invalidActor),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.deepEqual(await ctx.controlPlane.listArtifactRefsByWorkflowRunId('workflow_run_v1b_harness_001'), []);
  assert.deepEqual(await ctx.controlPlane.listArtifactRefsByWorkflowRunId('workflow_run_v1b_harness_invalid_actor'), []);
});

test('v1b workflow harness rejects malformed frozen source refs before persistence', async () => {
  const ctx = makeContext();
  const malformedFrozenInput: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input'] = {
    input_contract: 'N3ToN4Handoff@v1',
    snapshot_kind: 'v1b_intake_readiness_assessment',
    source_refs: [
      {
        ref_type: '',
        ref_id: 'readiness_001',
        title_card_id: TITLE_CARD_ID,
      },
    ],
    payload: {
      readiness_assessment_id: 'readiness_001',
    },
  };

  await assert.rejects(
    () => ctx.service.invokeNode(request({
      frozen_input: {
        ...malformedFrozenInput,
        frozen_input_hash: frozenInputHash(malformedFrozenInput),
      },
    })),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.deepEqual(await ctx.controlPlane.listArtifactRefsByWorkflowRunId('workflow_run_v1b_harness_001'), []);
});

test('v1b workflow harness blocks frozen input contract and snapshot drift before runner execution', async () => {
  const ctx = makeContext();
  const contractMismatch = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_contract_mismatch',
    node_attempt_id: 'node_attempt_v1b_contract_mismatch',
    frozen_input: {
      ...request().frozen_input,
      input_contract: 'N8ToN9Handoff@v1',
      frozen_input_hash: null,
    },
  }));
  assert.equal(contractMismatch.error_code, 'FROZEN_INPUT_CONTRACT_MISMATCH');
  assert.equal(contractMismatch.authority_ref, null);
  assert.equal(contractMismatch.handoff_ref, null);

  const snapshotMismatch = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_snapshot_mismatch',
    node_attempt_id: 'node_attempt_v1b_snapshot_mismatch',
    frozen_input: {
      ...request().frozen_input,
      snapshot_kind: 'topic_value_assessment',
      source_refs: [ref('topic_value_assessment', 'value_001')],
      frozen_input_hash: null,
    },
  }));
  assert.equal(snapshotMismatch.error_code, 'FROZEN_INPUT_SNAPSHOT_KIND_MISMATCH');

  const sourceRefMismatch = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_source_ref_mismatch',
    node_attempt_id: 'node_attempt_v1b_source_ref_mismatch',
    frozen_input: {
      ...request().frozen_input,
      source_refs: [ref('wrong_snapshot_kind', 'wrong_001')],
      frozen_input_hash: null,
    },
  }));
  assert.equal(sourceRefMismatch.error_code, 'FROZEN_INPUT_SOURCE_REF_KIND_MISMATCH');
});

test('v1b workflow harness rejects semantic artifact legacy refs before persistence', async () => {
  const ctx = makeContext();
  const input = request({
    workflow_run_id: 'workflow_run_v1b_semantic_legacy_ref',
    node_attempt_id: 'node_attempt_v1b_semantic_legacy_ref',
  });

  await assert.rejects(
    () => ctx.service.invokeNode({
      ...input,
      semantic_artifacts: [
        semanticArtifact(input, {
          support_artifact_ref: {
            ...ref('artifact_ref', 'support_with_legacy'),
            legacy_ref: { raw_provider_response: true },
          },
        }),
      ],
    }),
    (error) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.deepEqual(await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id), []);
});

test('v1b workflow harness accepts provider-mode execution spec shape on model-like nodes without invoking providers', async () => {
  const ctx = makeContext();
  const result = await ctx.service.invokeNode(request({
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: providerModelOptionId('topic-selection.v1b.assess-topic-value.v1'),
    },
  }));

  assert.equal(result.gate_status, 'blocked');
  assert.equal(result.error_code, 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED');
  assert.equal(result.hashes.execution_spec_hash.length, 64);
});

test('v1b workflow harness admits model-like codex mocked and provider specs through registry-backed runtime shell', async () => {
  const ctx = makeContext();
  const nodeId: TopicSelectionV1bWorkflowHarnessNodeId = 'topic-selection.v1b.assess-topic-value.v1';
  const providerOptionId = providerModelOptionId(nodeId);

  const codex = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_codex_runtime_admission',
    node_attempt_id: 'node_attempt_v1b_codex_runtime_admission',
    node_id: nodeId,
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
  }));
  assert.equal(codex.error_code, 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED');
  assert.equal(codex.hashes.runtime_admission_hash?.length, 64);

  const mocked = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_mock_runtime_admission',
    node_attempt_id: 'node_attempt_v1b_mock_runtime_admission',
    node_id: nodeId,
    run_mode: 'test',
    execution_spec: {
      execution_mode: 'mocked_llm',
      model_option_id: null,
    },
  }));
  assert.equal(mocked.error_code, 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED');
  assert.equal(mocked.hashes.runtime_admission_hash?.length, 64);

  const provider = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_provider_runtime_admission',
    node_attempt_id: 'node_attempt_v1b_provider_runtime_admission',
    node_id: nodeId,
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: providerOptionId,
    },
  }));
  assert.equal(provider.error_code, 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED');
  assert.equal(provider.hashes.runtime_admission_hash?.length, 64);
});

test('v1b workflow harness blocks missing model-like invocation and invalid provider/profile admission', async () => {
  const ctx = makeContext();
  const missingInvocation = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_missing_invocation',
    node_attempt_id: 'node_attempt_v1b_missing_invocation',
    execution_spec: null,
    run_mode: null,
    profile_id: null,
  }));
  assert.equal(missingInvocation.error_code, 'MISSING_INVOCATION_SLOT_INPUT');

  const artifactOnlyInput = request({
    workflow_run_id: 'workflow_run_v1b_artifact_only_invocation',
    node_attempt_id: 'node_attempt_v1b_artifact_only_invocation',
    node_id: 'topic-selection.v1b.assess-topic-value.v1',
    execution_spec: null,
    run_mode: null,
    profile_id: null,
  });
  const artifactOnly = await ctx.service.invokeNode({
    ...artifactOnlyInput,
    semantic_artifacts: [semanticArtifact(artifactOnlyInput)],
  });
  assert.equal(artifactOnly.error_code, 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED');

  const missingModelOption = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_missing_model_option',
    node_attempt_id: 'node_attempt_v1b_missing_model_option',
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: null,
    },
  }));
  assert.equal(missingModelOption.error_code, 'RUNTIME_MODEL_OPTION_REQUIRED');

  const disallowedProfile = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_disallowed_profile',
    node_attempt_id: 'node_attempt_v1b_disallowed_profile',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
  }));
  assert.equal(disallowedProfile.error_code, 'RUNTIME_PROFILE_NOT_ALLOWED');
});

test('v1b workflow harness deterministic-only nodes reject semantic artifacts and execution specs', async () => {
  const ctx = makeContext();
  const semanticSourceInput = request({
    workflow_run_id: 'workflow_run_v1b_semantic_source',
    node_attempt_id: 'node_attempt_v1b_semantic_source',
  });
  const deterministicOnlyNodes: TopicSelectionV1bWorkflowHarnessNodeId[] = [
    'topic-selection.v1b.create-intake-snapshot.v1',
    'topic-selection.v1b.decide-value-disposition.v1',
    'topic-selection.v1b.create-draft-topic-package.v1',
    'topic-selection.v1b.publish-v1c-input-bundle.v1',
  ];

  for (const nodeId of deterministicOnlyNodes) {
    const base = request({
      workflow_run_id: `workflow_run_${nodeId.replaceAll('.', '_')}_deterministic_only`,
      node_attempt_id: `node_attempt_${nodeId.replaceAll('.', '_')}_deterministic_only`,
      node_id: nodeId,
    });
    const semanticResult = await ctx.service.invokeNode({
      ...base,
      semantic_artifacts: [
        semanticArtifact(semanticSourceInput, {
          node_id: nodeId,
          input_hash: base.frozen_input.frozen_input_hash!,
        }),
      ],
    });
    assert.equal(semanticResult.error_code, 'SEMANTIC_ARTIFACT_NOT_ALLOWED');

    const executionResult = await ctx.service.invokeNode({
      ...base,
      workflow_run_id: `${base.workflow_run_id}_execution_spec`,
      node_attempt_id: `${base.node_attempt_id}_execution_spec`,
      execution_spec: {
        execution_mode: 'provider_llm',
        model_option_id: 'topic-selection.v1b.invalid-provider',
      },
    });
    assert.equal(executionResult.error_code, 'INVALID_NODE_PROVIDER_SPEC');

    const runtimeResult = await ctx.service.invokeNode({
      ...base,
      workflow_run_id: `${base.workflow_run_id}_runtime_profile`,
      node_attempt_id: `${base.node_attempt_id}_runtime_profile`,
      run_mode: 'acceptance',
      profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
    });
    assert.equal(runtimeResult.error_code, 'INVALID_NODE_RUNTIME_SPEC');
  }
});

test('v1b workflow harness delegated and support nodes reject provider specs but accept allowed Codex semantic artifacts', async () => {
  const ctx = makeContext();
  const nodes: TopicSelectionV1bWorkflowHarnessNodeId[] = [
    'topic-selection.v1b.record-research-constraint-profile.v1',
    'topic-selection.v1b.assess-intake-readiness.v1',
    'topic-selection.v1b.select-research-slice.v1',
    'topic-selection.v1b.materialize-topic-question-contract.v1',
  ];

  for (const nodeId of nodes) {
    const providerResult = await ctx.service.invokeNode(request({
      workflow_run_id: `workflow_run_${nodeId.replaceAll('.', '_')}_provider_reject`,
      node_attempt_id: `node_attempt_${nodeId.replaceAll('.', '_')}_provider_reject`,
      node_id: nodeId,
      execution_spec: {
        execution_mode: 'provider_llm',
        model_option_id: 'topic-selection.v1b.invalid-provider',
      },
    }));
    assert.equal(providerResult.error_code, 'INVALID_NODE_PROVIDER_SPEC');

    const input = request({
      workflow_run_id: `workflow_run_${nodeId.replaceAll('.', '_')}_codex_accept`,
      node_attempt_id: `node_attempt_${nodeId.replaceAll('.', '_')}_codex_accept`,
      node_id: nodeId,
      run_mode: 'acceptance',
      profile_id: slotSpecForNode(nodeId).profile_id,
    });
    const accepted = await ctx.service.invokeNode({
      ...input,
      semantic_artifacts: [semanticArtifact(input)],
    });
    assert.equal(accepted.error_code, 'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED');
    assert.equal(accepted.hashes.semantic_artifact_hash?.length, 64);
    assert.equal(accepted.authority_ref, null);
  }
});

test('v1b workflow harness model-like nodes accept allowed execution specs and semantic artifacts', async () => {
  const ctx = makeContext();
  const nodes: TopicSelectionV1bWorkflowHarnessNodeId[] = [
    'topic-selection.v1b.generate-research-slice-options.v1',
    'topic-selection.v1b.generate-topic-question-candidates.v1',
    'topic-selection.v1b.assess-topic-value.v1',
  ];

  for (const nodeId of nodes) {
    const modelOptionId = providerModelOptionId(nodeId);
    const input = request({
      workflow_run_id: `workflow_run_${nodeId.replaceAll('.', '_')}_model_like`,
      node_attempt_id: `node_attempt_${nodeId.replaceAll('.', '_')}_model_like`,
      node_id: nodeId,
      execution_spec: {
        execution_mode: 'provider_llm',
        model_option_id: modelOptionId,
      },
    });
    const result = await ctx.service.invokeNode({
      ...input,
      semantic_artifacts: [
        semanticArtifact(input, {
          execution_mode: 'provider_llm',
          model_option_id: modelOptionId,
        }),
      ],
    });
    assert.ok([
      'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED',
    ].includes(result.error_code ?? ''));
    assert.equal(result.hashes.execution_spec_hash.length, 64);
    assert.equal(result.hashes.semantic_artifact_hash?.length, 64);
  }
});

test('v1b workflow harness blocks wrong semantic slot node and effect with specific policy codes', async () => {
  const ctx = makeContext();
  const input = request({
    workflow_run_id: 'workflow_run_v1b_wrong_semantic_slot',
    node_attempt_id: 'node_attempt_v1b_wrong_semantic_slot',
    node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
  });

  const wrongSlot = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      semanticArtifact(input, {
        slot_id: 'n8_value_assessment_draft',
      }),
    ],
  });
  assert.equal(wrongSlot.error_code, 'UNKNOWN_SEMANTIC_SUPPORT_SLOT');

  const wrongNode = await ctx.service.invokeNode({
    ...input,
    workflow_run_id: 'workflow_run_v1b_wrong_semantic_node',
    node_attempt_id: 'node_attempt_v1b_wrong_semantic_node',
    semantic_artifacts: [
      semanticArtifact(input, {
        node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
      }),
    ],
  });
  assert.equal(wrongNode.error_code, 'SEMANTIC_ARTIFACT_NODE_MISMATCH');

  const wrongEffect = await ctx.service.invokeNode({
    ...input,
    workflow_run_id: 'workflow_run_v1b_wrong_semantic_effect',
    node_attempt_id: 'node_attempt_v1b_wrong_semantic_effect',
    semantic_artifacts: [
      semanticArtifact(input, {
        allowed_effect: 'support_only',
      }),
    ],
  });
  assert.equal(wrongEffect.error_code, 'SEMANTIC_ARTIFACT_EFFECT_NOT_ALLOWED');
});

test('v1b workflow harness exact replay returns existing trace result without writing a new trace', async () => {
  const ctx = makeContext();
  const input = request();
  const first = await ctx.service.invokeNode(input);
  const traceCountAfterFirst = (await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id)).length;
  const replay = await ctx.service.invokeNode(input);
  const traceCountAfterReplay = (await ctx.controlPlane.listArtifactRefsByWorkflowRunId(input.workflow_run_id)).length;

  assert.equal(replay.replay_provenance?.replayed, true);
  assert.equal(replay.replay_identity.node_replay_key, first.replay_identity.node_replay_key);
  assert.equal(replay.harness_trace_artifact_ref?.ref_id, first.harness_trace_artifact_ref?.ref_id);
  assert.equal(traceCountAfterReplay, traceCountAfterFirst);
});

test('v1b workflow harness blocks changed input for an existing node attempt id', async () => {
  const ctx = makeContext();
  const input = request();
  const first = await ctx.service.invokeNode(input);

  const changedFrozenInput: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input'] = {
    input_contract: input.frozen_input.input_contract,
    snapshot_kind: input.frozen_input.snapshot_kind,
    source_refs: input.frozen_input.source_refs,
    payload: {
      readiness_assessment_id: 'readiness_001',
      warning_context: ['accepted_risk_carried_forward', 'changed_input'],
    },
  };
  const mismatch = await ctx.service.invokeNode(request({
    frozen_input: {
      ...changedFrozenInput,
      frozen_input_hash: frozenInputHash(changedFrozenInput),
    },
  }));

  assert.equal(mismatch.gate_status, 'blocked');
  assert.equal(mismatch.error_code, 'REPLAY_INPUT_HASH_MISMATCH');
  assert.notEqual(mismatch.replay_identity.node_replay_key, first.replay_identity.node_replay_key);
  const transitionRecord = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    mismatch.transition_attempt_ref!.ref_id,
  );
  assert.deepEqual(transitionRecord?.created_authority_refs, []);
});

test('v1b workflow harness distinguishes execution spec replay drift from input drift', async () => {
  const ctx = makeContext();
  const input = request({
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: `${TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent}.openai-balanced`,
    },
  });
  await ctx.service.invokeNode(input);

  const mismatch = await ctx.service.invokeNode(request({
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: `${TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent}.openai-quality`,
    },
  }));

  assert.equal(mismatch.gate_status, 'blocked');
  assert.equal(mismatch.error_code, 'REPLAY_EXECUTION_SPEC_HASH_MISMATCH');
  assert.match(mismatch.error_message ?? '', /execution_spec_hash/);
});

test('v1b workflow harness distinguishes runtime admission replay drift from input drift', async () => {
  const ctx = makeContext();
  const input = request({
    workflow_run_id: 'workflow_run_v1b_runtime_replay_drift',
    node_attempt_id: 'node_attempt_v1b_runtime_replay_drift',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
  });
  await ctx.service.invokeNode(input);

  const mismatch = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_runtime_replay_drift',
    node_attempt_id: 'node_attempt_v1b_runtime_replay_drift',
    execution_spec: {
      execution_mode: 'codex_assisted',
      model_option_id: null,
    },
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
  }));

  assert.equal(mismatch.gate_status, 'blocked');
  assert.equal(mismatch.error_code, 'REPLAY_RUNTIME_ADMISSION_HASH_MISMATCH');
  assert.match(mismatch.error_message ?? '', /runtime_admission_hash/);
});

test('v1b workflow harness distinguishes semantic artifact replay drift from input drift', async () => {
  const ctx = makeContext();
  const input = request({
    workflow_run_id: 'workflow_run_v1b_semantic_replay_drift',
    node_attempt_id: 'node_attempt_v1b_semantic_replay_drift',
  });
  await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [semanticArtifact(input)],
  });

  const mismatch = await ctx.service.invokeNode({
    ...input,
    semantic_artifacts: [
      semanticArtifact(input, {
        normalized_output_hash: 'f'.repeat(64),
      }),
    ],
  });

  assert.equal(mismatch.gate_status, 'blocked');
  assert.equal(mismatch.error_code, 'REPLAY_SEMANTIC_ARTIFACT_HASH_MISMATCH');
  assert.match(mismatch.error_message ?? '', /semantic_artifact_hash/);
});

test('v1b workflow harness semantic hashes are stable across fresh persistence ids', async () => {
  const ctx = makeContext();
  const first = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_harness_stable_hash_a',
  }));
  const second = await ctx.service.invokeNode(request({
    workflow_run_id: 'workflow_run_v1b_harness_stable_hash_b',
  }));

  assert.notEqual(first.gate_result_ref?.ref_id, second.gate_result_ref?.ref_id);
  assert.equal(first.replay_identity.node_replay_key, second.replay_identity.node_replay_key);
  assert.equal(first.hashes.gate_result_hash, second.hashes.gate_result_hash);
  assert.equal(first.hashes.route_hash, second.hashes.route_hash);
});

test('v1b workflow harness validates every node id through the shell without authority writes', async () => {
  const ctx = makeContext();
  for (const nodeId of TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS) {
    const result = await ctx.service.invokeNode(request({
      workflow_run_id: `workflow_run_${nodeId.replaceAll('.', '_')}`,
      node_attempt_id: `node_attempt_${nodeId.replaceAll('.', '_')}`,
      node_id: nodeId as TopicSelectionV1bWorkflowHarnessNodeId,
    }));
    assert.equal(result.authority_ref, null);
    assert.equal(result.handoff_ref, null);
    assert.ok([
      'NODE_RUNNER_DEPENDENCY_NOT_CONFIGURED',
      'INVALID_NODE_PROVIDER_SPEC',
    ].includes(result.error_code ?? ''));
  }
});

// T-123 Phase 5.1 (F-11) REPLAY-IDENTITY GUARD: the harness split is a pure mechanical refactor that
// must keep every byte-bearing hash identical. The chain tests above thread hashes node-to-node, so a
// CONSISTENT shift in the hash machinery (hashContext / outcomeGateResultHash / authority+handoff
// hashing) would still pass them. This test pins GOLDEN literal values for a fully deterministic
// N1->N3 chain (fixed idFactory counter + fixed NOW), so any extraction that perturbs the hashing
// drifts these and fails. Re-baseline ONLY for an intentional, separately-justified hash change.
// N1 is the fully deterministic node (no semantic-support artifact generation, which on N2/N3 pulls a
// non-idFactory random element). Its byte-bearing hashes therefore pin the SHARED hash machinery the
// split most endangers: hashContext (-> node_replay_key), outcomeGateResultHash (-> gate_result_hash /
// route_hash), frozen_input_hash, the N1 authority hash, and the handoff hashing.
const GUARD_GOLDEN_N1: Record<string, string | null> = {
  frozen_input_hash: 'bd34adc0946b45ba010dea78d44b946fb36503a8cd9bf2a35710dd933c175211',
  gate_result_hash: '50587f791937d5a5beafb2c8a3804f8ebe62f41eed9052c0def921ae65554d06',
  route_hash: '15dbf67aef2d370873c6d1606f4977ef1701097494ade5bd1588ced2d4fe18dd',
  authority_hash: 'b07db403253f032c67edc21a47bb717cd48fd36e44df63d6ba7310d5de95dbab',
  handoff_hash: '64d38ce4c1056bd65fa3bceaa19ec50bb91b69c120fbaeddc38b43fd2ee95dba',
  node_replay_key: '1068d98fb5cd1fe59159384b1e98a3458872ba9e9c498e0acd078cb402a79534',
};
test('replay-identity guard: deterministic N1 pins golden byte-bearing hashes (F-11 split safety net)', async () => {
  const ctx = await seedHarnessV1aBundle();
  const n1 = await ctx.service.invokeNode(n1Request(ctx.bundle));
  const actual = {
    frozen_input_hash: n1.hashes.frozen_input_hash,
    gate_result_hash: n1.hashes.gate_result_hash,
    route_hash: n1.hashes.route_hash,
    authority_hash: n1.hashes.authority_hash,
    handoff_hash: n1.hashes.handoff_hash,
    node_replay_key: n1.replay_identity.node_replay_key,
  };
  // Re-baseline ONLY for an intentional, separately-justified hash change — NEVER for a Phase-5.1
  // extraction, which is pure mechanical relocation and must preserve every value byte-for-byte.
  assert.deepEqual(actual, GUARD_GOLDEN_N1);
});
