import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionTraceSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionV1aToV1bInputBundleRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  TOPIC_SELECTION_HUMAN_CONFIRMATION_INPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_DRAFT_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import {
  TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_METRIC_KEYS,
  type TopicSelectionOfflineEvaluationCaseRecord,
  type TopicSelectionOfflineEvaluationObservedOutput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-offline-evaluation-replay-contracts';
import {
  TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_SCHEMA_VERSION,
  TOPIC_SELECTION_SEARCH_RUN_RECORD_BUNDLE_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import {
  TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
  TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1a-workflow-harness-contracts';
import type {
  TopicSelectionResearchSliceOptionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import {
  TOPIC_SELECTION_VALUE_DIMENSIONS,
  TOPIC_SELECTION_VALUE_GATE_KEYS,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS,
  type TopicSelectionV1bAcceptedConstraintProfilePayload,
  type TopicSelectionV1bAcceptedSliceSelectionPayload,
  type TopicSelectionV1bN1HarnessFrozenInputPayload,
  type TopicSelectionV1bN3HarnessFrozenInputPayload,
  type TopicSelectionV1bN4HarnessFrozenInputPayload,
  type TopicSelectionV1bN5HarnessFrozenInputPayload,
  type TopicSelectionV1bN6HarnessFrozenInputPayload,
  type TopicSelectionV1bN7HarnessFrozenInputPayload,
  type TopicSelectionV1bN8HarnessFrozenInputPayload,
  type TopicSelectionV1bN9HarnessFrozenInputPayload,
  type TopicSelectionV1bN10HarnessFrozenInputPayload,
  type TopicSelectionV1bN11HarnessFrozenInputPayload,
  type TopicSelectionV1bN2HarnessFrozenInputPayload,
  type TopicSelectionV1bResearchSliceOptionSetDraftPayload,
  type TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
  type TopicSelectionV1bTopicValueAssessmentDraftPayload,
  type TopicSelectionV1bWorkflowHarnessHandoff,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';

import { buildApp } from '../app.js';
import type { LlmCallTelemetry, LlmStructuredOutputRequest } from '../services/llm-gateway.js';
import {
  sha256Text,
  stableStringify,
} from '../services/literature-content-processing-utils.js';
import { TopicSelectionEvidenceMapMaterializationService } from '../services/topic-selection-evidence-map-materialization-service.js';
import {
  TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID,
} from '../services/topic-selection-model-profile-registry-service.js';


function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function ref(
  refType: string,
  refId: string,
  titleCardId: string,
  versionId: string | null = null,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: versionId,
    title_card_id: titleCardId,
  };
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

function v1bBundleRef(bundle: TopicSelectionV1aToV1bInputBundleRecord): TopicSelectionFunctionalRef {
  return ref('v1a_to_v1b_input_bundle', bundle.v1b_input_bundle_id, bundle.title_card_id, bundle.bundle_version);
}

function v1aBundleSourceRefs(bundle: TopicSelectionV1aToV1bInputBundleRecord): TopicSelectionFunctionalRef[] {
  return uniqueRefs([
    v1bBundleRef(bundle),
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

function frozenInputHash(payload: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input']): string {
  return sha256Text(stableStringify({
    input_contract: payload.input_contract,
    payload: payload.payload,
    snapshot_kind: payload.snapshot_kind,
    source_refs: payload.source_refs,
  }));
}

function v1bHarnessN1Request(
  bundle: TopicSelectionV1aToV1bInputBundleRecord,
  suffix: string,
): TopicSelectionV1bWorkflowHarnessRunRequest {
  const payload: TopicSelectionV1bN1HarnessFrozenInputPayload = {
    v1b_input_bundle_id: bundle.v1b_input_bundle_id,
    v1a_bundle_ref: v1bBundleRef(bundle),
    v1a_bundle_hash: sha256Text(stableStringify(bundle)),
    source_refs_hash: sha256Text(stableStringify(v1aBundleSourceRefs(bundle))),
  };
  const frozenInput: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input'] = {
    input_contract: 'V1aToV1bInputBundleFrozenRef@v1',
    snapshot_kind: 'v1a_valid_need_bundle',
    source_refs: [ref('v1a_valid_need_bundle', bundle.v1b_input_bundle_id, bundle.title_card_id, bundle.bundle_version)],
    payload: payload as unknown as Record<string, unknown>,
  };
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    title_card_id: bundle.title_card_id,
    workflow_run_id: `workflow_run_v1b_harness_http_${suffix}`,
    node_attempt_id: `node_attempt_v1b_harness_http_n1_${suffix}`,
    node_id: 'topic-selection.v1b.create-intake-snapshot.v1',
    policy_version: 'topic-selection-v1b-node-policy-v1',
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
    created_by: 'system',
  };
}

function acceptedConstraintProfilePayload(): TopicSelectionV1bAcceptedConstraintProfilePayload {
  return {
    target_community: 'LLM systems researchers',
    target_venue_class: 'systems',
    intended_contribution_style: 'workflow_system',
    method_constraints: ['offline replay evaluation'],
    resource_constraints: ['single workstation'],
    available_assets: ['paper corpus', 'review rubric'],
    feasibility_budget: { person_weeks: 2 },
    non_goals: ['Do not target production deployment'],
    claim_ceiling: 'Can claim reviewer-aligned planning feasibility, not production superiority.',
    human_constraint_notes: null,
    constraint_payload: { source: 'codex_assisted_http_test' },
  };
}

function v1bHarnessN2Request(
  bundle: TopicSelectionV1aToV1bInputBundleRecord,
  n1Result: { authority_ref: TopicSelectionFunctionalRef | null; hashes: { authority_hash: string | null } },
  suffix: string,
  acceptedPayload: TopicSelectionV1bAcceptedConstraintProfilePayload,
): TopicSelectionV1bWorkflowHarnessRunRequest {
  assert.ok(n1Result.authority_ref, 'N2 harness HTTP fixture requires N1 authority_ref.');
  assert.ok(n1Result.hashes.authority_hash, 'N2 harness HTTP fixture requires N1 authority_hash.');
  const acceptedHash = sha256Text(stableStringify(acceptedPayload));
  const payload: TopicSelectionV1bN2HarnessFrozenInputPayload = {
    accepted_constraint_profile_payload: acceptedPayload,
    accepted_constraint_profile_payload_hash: acceptedHash,
    authority_input_provider: 'fixture',
    delegation_artifact_hash: null,
    intake_snapshot_hash: n1Result.hashes.authority_hash,
    intake_snapshot_ref: n1Result.authority_ref,
    previous_profile_hash: null,
    previous_profile_ref: null,
    v1a_bundle_hash: sha256Text(stableStringify(bundle)),
    v1a_bundle_ref: v1bBundleRef(bundle),
  };
  const frozenInput: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input'] = {
    input_contract: 'N1ToN2Handoff@v1',
    snapshot_kind: 'v1b_intake_snapshot',
    source_refs: [n1Result.authority_ref],
    payload: payload as unknown as Record<string, unknown>,
  };
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    title_card_id: bundle.title_card_id,
    workflow_run_id: `workflow_run_v1b_harness_http_${suffix}`,
    node_attempt_id: `node_attempt_v1b_harness_http_n2_${suffix}`,
    node_id: 'topic-selection.v1b.record-research-constraint-profile.v1',
    policy_version: 'topic-selection-v1b-node-policy-v1',
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
    created_by: 'system',
  };
}

type WorkflowHarnessHttpResult = {
  gate_status: string;
  route_decision: string;
  failure_class: string | null;
  authority_ref: TopicSelectionFunctionalRef | null;
  handoff_ref: TopicSelectionFunctionalRef | null;
  trace_snapshot_ref: TopicSelectionFunctionalRef | null;
  transition_attempt_ref: TopicSelectionFunctionalRef | null;
  hashes: {
    authority_hash: string | null;
    handoff_hash: string | null;
  };
};

async function invokeV1bHarnessNode(
  app: FastifyInstance,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
): Promise<WorkflowHarnessHttpResult> {
  const response = await app.inject({
    method: 'POST',
    url: `/topic-selection/v1b/workflow-harness/nodes/${encodeURIComponent(input.node_id)}/invocations`,
    payload: input,
  });
  assertStatus(response, 201);
  assert.equal(response.headers.deprecation, undefined);
  return response.json() as WorkflowHarnessHttpResult;
}

async function getWorkflowHarnessArtifact(
  app: FastifyInstance,
  artifactRef: TopicSelectionFunctionalRef,
): Promise<TopicSelectionArtifactRefRecord> {
  const response = await app.inject({
    method: 'GET',
    url: `/topic-selection/v1b/workflow-harness/artifacts/${encodeURIComponent(artifactRef.ref_id)}`,
  });
  assertStatus(response, 200);
  return response.json() as TopicSelectionArtifactRefRecord;
}

async function getWorkflowHarnessHandoff(
  app: FastifyInstance,
  artifactRef: TopicSelectionFunctionalRef | null,
): Promise<TopicSelectionV1bWorkflowHarnessHandoff> {
  assert.ok(artifactRef, 'Expected workflow harness handoff artifact ref.');
  const artifact = await getWorkflowHarnessArtifact(app, artifactRef);
  return artifact.payload as unknown as TopicSelectionV1bWorkflowHarnessHandoff;
}

async function getWorkflowHarnessTraceSnapshot(
  app: FastifyInstance,
  traceSnapshotRef: TopicSelectionFunctionalRef | null,
): Promise<TopicSelectionTraceSnapshotRecord> {
  assert.ok(traceSnapshotRef, 'Expected workflow harness trace snapshot ref.');
  const response = await app.inject({
    method: 'GET',
    url: `/topic-selection/v1b/workflow-harness/trace-snapshots/${encodeURIComponent(traceSnapshotRef.ref_id)}`,
  });
  assertStatus(response, 200);
  return response.json() as TopicSelectionTraceSnapshotRecord;
}

async function recordWorkflowHarnessArtifact(
  app: FastifyInstance,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  payload: Record<string, unknown>,
  artifactKind: TopicSelectionArtifactRefRecord['artifact_kind'] = 'structured_output',
): Promise<TopicSelectionArtifactRefRecord> {
  const response = await app.inject({
    method: 'POST',
    url: '/topic-selection/v1b/workflow-harness/artifacts',
    payload: {
      title_card_id: input.title_card_id,
      artifact_kind: artifactKind,
      storage_kind: 'inline',
      workflow_run_id: input.workflow_run_id,
      payload,
      created_by: 'system',
    },
  });
  assertStatus(response, 201);
  return response.json() as TopicSelectionArtifactRefRecord;
}

async function recordWorkflowHarnessSemanticArtifact(
  app: FastifyInstance,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  slot: Pick<
    TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
    'slot_id' | 'allowed_effect' | 'output_contract' | 'profile_id'
  >,
  payload: Record<string, unknown>,
): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
  const support = await recordWorkflowHarnessArtifact(app, input, payload);
  const normalized = await recordWorkflowHarnessArtifact(app, input, payload);
  const provenance = await recordWorkflowHarnessArtifact(app, input, {
    adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
    source: 'harness_http_fixture',
  }, 'diagnostic');
  assert.ok(support.checksum, 'Expected support artifact checksum.');
  assert.ok(normalized.checksum, 'Expected normalized artifact checksum.');
  assert.ok(provenance.checksum, 'Expected provenance artifact checksum.');
  return {
    node_id: input.node_id,
    run_mode: input.run_mode ?? 'acceptance',
    slot_id: slot.slot_id,
    allowed_effect: slot.allowed_effect,
    output_contract: slot.output_contract,
    execution_mode: 'codex_assisted',
    profile_id: slot.profile_id,
    model_option_id: null,
    input_hash: input.frozen_input.frozen_input_hash!,
    support_artifact_ref: ref('artifact_ref', support.artifact_ref_id, input.title_card_id ?? support.title_card_id ?? 'title_card_v1b_harness_http'),
    support_artifact_hash: support.checksum,
    normalized_output_ref: ref(
      'artifact_ref',
      normalized.artifact_ref_id,
      input.title_card_id ?? normalized.title_card_id ?? 'title_card_v1b_harness_http',
    ),
    normalized_output_hash: normalized.checksum,
    prompt_packet_hash: 'c'.repeat(64),
    structured_output_hash: normalized.checksum,
    adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
    slot_spec_hash: 'e'.repeat(64),
    provenance_ref: ref('artifact_ref', provenance.artifact_ref_id, input.title_card_id ?? provenance.title_card_id ?? 'title_card_v1b_harness_http'),
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
  };
}

function v1bHarnessN3Request(
  n1Result: WorkflowHarnessHttpResult,
  n2Result: WorkflowHarnessHttpResult,
  suffix: string,
): TopicSelectionV1bWorkflowHarnessRunRequest {
  assert.ok(n1Result.authority_ref && n1Result.hashes.authority_hash);
  assert.ok(n2Result.authority_ref && n2Result.hashes.authority_hash);
  const payload: TopicSelectionV1bN3HarnessFrozenInputPayload = {
    intake_snapshot_ref: n1Result.authority_ref,
    intake_snapshot_hash: n1Result.hashes.authority_hash,
    constraint_profile_ref: n2Result.authority_ref,
    constraint_profile_hash: n2Result.hashes.authority_hash,
    n2_handoff_hash: n2Result.hashes.handoff_hash ?? 'f'.repeat(64),
  };
  const frozenInput: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input'] = {
    input_contract: 'N2ToN3Handoff@v1',
    snapshot_kind: 'research_constraint_profile',
    source_refs: [n2Result.authority_ref],
    payload: payload as unknown as Record<string, unknown>,
  };
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    title_card_id: n1Result.authority_ref.title_card_id,
    workflow_run_id: `workflow_run_v1b_harness_http_${suffix}`,
    node_attempt_id: `node_attempt_v1b_harness_http_n3_${suffix}`,
    node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
    policy_version: 'topic-selection-v1b-node-policy-v1',
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
    created_by: 'system',
  };
}

function v1bHarnessN4Request(
  n1Result: WorkflowHarnessHttpResult,
  n2Result: WorkflowHarnessHttpResult,
  n3Result: WorkflowHarnessHttpResult,
  suffix: string,
): TopicSelectionV1bWorkflowHarnessRunRequest {
  assert.ok(n1Result.authority_ref && n1Result.hashes.authority_hash);
  assert.ok(n2Result.authority_ref && n2Result.hashes.authority_hash && n2Result.hashes.handoff_hash);
  assert.ok(n3Result.authority_ref && n3Result.hashes.authority_hash && n3Result.hashes.handoff_hash);
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
  const frozenInput: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input'] = {
    input_contract: 'N3ToN4Handoff@v1',
    snapshot_kind: 'v1b_intake_readiness_assessment',
    source_refs: [n3Result.authority_ref, n2Result.authority_ref, n1Result.authority_ref],
    payload: payload as unknown as Record<string, unknown>,
  };
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    title_card_id: n1Result.authority_ref.title_card_id,
    workflow_run_id: `workflow_run_v1b_harness_http_${suffix}`,
    node_attempt_id: `node_attempt_v1b_harness_http_n4_${suffix}`,
    node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
    policy_version: 'topic-selection-v1b-node-policy-v1',
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
    created_by: 'system',
  };
}

function v1bHarnessN4Draft(
  bundle: TopicSelectionV1aToV1bInputBundleRecord,
): TopicSelectionV1bResearchSliceOptionSetDraftPayload {
  const evidenceRef = bundle.evidence_role_bundle.support_unit_refs[0] ?? bundle.evidence_map_ref;
  return {
    recommended_option_key: 'traceable_workflow_slice',
    comparison_axes: ['method feasibility', 'evidence traceability'],
    comparison_summary: 'The recommended slice keeps the claim bounded to workflow traceability.',
    missing_option_types: [],
    unresolved_disagreements: [],
    human_review_triggers: [],
    options: [{
      option_key: 'traceable_workflow_slice',
      source_validated_need_refs: [bundle.validated_need_ref],
      slice_statement: 'Build a bounded evidence-to-need traceability workflow for topic selection.',
      problem_space: 'Reviewer-aligned topic selection traceability.',
      target_setting: 'Local-first CS paper engineering assistant workflows.',
      target_community: 'LLM systems researchers',
      included_boundaries: ['v1a evidence-to-need trace preservation'],
      excluded_boundaries: ['Do not target production deployment', 'promotion decision', 'full paper implementation'],
      contribution_type_candidate: 'workflow_system',
      support_evidence_refs: [evidenceRef],
      challenge_evidence_refs: [],
      baseline_evidence_refs: [],
      context_evidence_refs: [],
      resource_assumptions: ['Fixture run uses existing v1a evidence map.'],
      data_assumptions: ['Evidence units remain frozen during slice generation.'],
      evaluation_path: 'Replay the harness and inspect deterministic trace hashes.',
      baseline_assumptions: ['Route-only smoke tests are insufficient as a baseline.'],
      hard_blockers: [],
      dependency_risks: ['Downstream selection may request more options.'],
      slice_budget: { max_nodes: 4 },
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
      details_payload: { fixture: true },
    }],
  };
}

function hashV1bHarnessOption(option: TopicSelectionResearchSliceOptionRecord): string {
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

async function selectedV1bHarnessOption(
  app: FastifyInstance,
  n4Result: WorkflowHarnessHttpResult,
): Promise<TopicSelectionResearchSliceOptionRecord> {
  assert.ok(n4Result.authority_ref, 'N5 fixture requires admitted N4 authority.');
  const response = await app.inject({
    method: 'GET',
    url: `/topic-selection/v1b/research-slice-option-sets/${encodeURIComponent(n4Result.authority_ref.ref_id)}/options`,
  });
  assertStatus(response, 200);
  const payload = response.json() as { items: TopicSelectionResearchSliceOptionRecord[] };
  const selected = payload.items.find((option) => option.status === 'recommended') ?? payload.items[0];
  assert.ok(selected, 'N5 fixture requires at least one N4 option.');
  return selected;
}

function acceptedV1bHarnessSliceSelectionPayload(
  option: TopicSelectionResearchSliceOptionRecord,
): TopicSelectionV1bAcceptedSliceSelectionPayload {
  return {
    decision: 'select',
    selected_option_ref: ref('research_slice_option', option.research_slice_option_id, option.title_card_id),
    selected_option_hash: hashV1bHarnessOption(option),
    selection_rationale: 'Select the traceable workflow slice with the strongest bounded fit.',
    decision_basis: { selected_option_key: option.option_key },
    rejected_option_reasons: [],
    required_actions: [],
    accepted_risk_refs: [],
    confidence: 0.82,
    requires_human_review: false,
    human_review_reason: null,
    loopback_target: null,
    loopback_target_ref: null,
    loopback_reason_code: null,
  };
}

function v1bHarnessN5Request(
  n4Result: WorkflowHarnessHttpResult,
  acceptedPayload: TopicSelectionV1bAcceptedSliceSelectionPayload,
  suffix: string,
): TopicSelectionV1bWorkflowHarnessRunRequest {
  assert.ok(n4Result.authority_ref && n4Result.hashes.authority_hash && n4Result.hashes.handoff_hash);
  const acceptedHash = sha256Text(stableStringify(acceptedPayload));
  const payload: TopicSelectionV1bN5HarnessFrozenInputPayload = {
    research_slice_option_set_ref: n4Result.authority_ref,
    research_slice_option_set_hash: n4Result.hashes.authority_hash,
    n4_handoff_hash: n4Result.hashes.handoff_hash,
    authority_input_provider: 'fixture',
    accepted_selection_payload: acceptedPayload,
    accepted_selection_payload_hash: acceptedHash,
    delegation_artifact_hash: null,
  };
  const frozenInput: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input'] = {
    input_contract: 'N4ToN5Handoff@v1',
    snapshot_kind: 'research_slice_option_set',
    source_refs: [n4Result.authority_ref],
    payload: payload as unknown as Record<string, unknown>,
  };
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    title_card_id: n4Result.authority_ref.title_card_id,
    workflow_run_id: `workflow_run_v1b_harness_http_${suffix}`,
    node_attempt_id: `node_attempt_v1b_harness_http_n5_${suffix}`,
    node_id: 'topic-selection.v1b.select-research-slice.v1',
    policy_version: 'topic-selection-v1b-node-policy-v1',
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
    created_by: 'system',
  };
}

async function v1bHarnessRequestFromHandoff<TPayload>(
  app: FastifyInstance,
  result: WorkflowHarnessHttpResult,
  suffix: string,
  expectedHandoffKind: TopicSelectionV1bWorkflowHarnessHandoff['envelope']['handoff_kind'],
  nodeId: TopicSelectionV1bWorkflowHarnessRunRequest['node_id'],
  nodeAttemptSuffix: string,
  inputContract: string,
  snapshotKind: string,
  payloadPatch: Record<string, unknown>,
  extraSourceRefs: TopicSelectionFunctionalRef[] = [],
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  assert.ok(result.authority_ref && result.handoff_ref && result.hashes.handoff_hash);
  const handoff = await getWorkflowHarnessHandoff(app, result.handoff_ref);
  assert.equal(handoff.envelope.handoff_kind, expectedHandoffKind);
  const payload = {
    ...(handoff.payload as unknown as Record<string, unknown>),
    ...payloadPatch,
  } as unknown as TPayload;
  const frozenInput: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input'] = {
    input_contract: inputContract,
    snapshot_kind: snapshotKind,
    source_refs: uniqueRefs([result.authority_ref, result.handoff_ref, ...extraSourceRefs, ...handoff.required_refs]),
    payload: payload as unknown as Record<string, unknown>,
  };
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    title_card_id: result.authority_ref.title_card_id,
    workflow_run_id: `workflow_run_v1b_harness_http_${suffix}`,
    node_attempt_id: `node_attempt_v1b_harness_http_${nodeAttemptSuffix}_${suffix}`,
    node_id: nodeId,
    policy_version: 'topic-selection-v1b-node-policy-v1',
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
    created_by: 'system',
  };
}

async function v1bHarnessN6Request(
  app: FastifyInstance,
  n5Result: WorkflowHarnessHttpResult,
  suffix: string,
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  assert.ok(n5Result.authority_ref && n5Result.handoff_ref && n5Result.hashes.handoff_hash);
  const handoff = await getWorkflowHarnessHandoff(app, n5Result.handoff_ref);
  assert.equal(handoff.envelope.handoff_kind, 'N5ToN6Handoff');
  const payload: TopicSelectionV1bN6HarnessFrozenInputPayload = {
    ...(handoff.payload as TopicSelectionV1bN6HarnessFrozenInputPayload),
    n5_handoff_hash: n5Result.hashes.handoff_hash,
  };
  const selectionSnapshotRef = ref(
    'research_slice_selection_decision',
    n5Result.authority_ref.ref_id,
    n5Result.authority_ref.title_card_id ?? 'title_card_v1b_harness_http',
    n5Result.authority_ref.version_id ?? null,
  );
  const frozenInput: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input'] = {
    input_contract: 'N5ToN6Handoff@v1',
    snapshot_kind: 'research_slice_selection_decision',
    source_refs: [selectionSnapshotRef, n5Result.handoff_ref, ...handoff.required_refs],
    payload: payload as unknown as Record<string, unknown>,
  };
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    title_card_id: n5Result.authority_ref.title_card_id,
    workflow_run_id: `workflow_run_v1b_harness_http_${suffix}`,
    node_attempt_id: `node_attempt_v1b_harness_http_n6_${suffix}`,
    node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
    policy_version: 'topic-selection-v1b-node-policy-v1',
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
    created_by: 'system',
  };
}

function v1bHarnessN6Draft(
  bundle: TopicSelectionV1aToV1bInputBundleRecord,
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
): TopicSelectionV1bTopicQuestionCandidateSetDraftPayload {
  const payload = input.frozen_input.payload as unknown as TopicSelectionV1bN6HarnessFrozenInputPayload;
  const evidenceRef = bundle.evidence_role_bundle.support_unit_refs[0] ?? bundle.evidence_map_ref;
  return {
    question_frame: {
      target_setting: 'Local-first CS paper engineering assistant workflows.',
      target_community: 'LLM systems researchers',
      object_scope: 'v1b harness-native topic selection candidate generation',
      task_scope: 'candidate generation, deterministic gates, and replay drift checks',
      intervention_or_approach: 'WorkflowHarness-native candidate-set gate with frozen semantic artifacts',
      comparison_baseline: 'route-only smoke tests without harness-level product acceptance',
      observable_outcome: 'stable candidate-set refs and replay hashes',
      assumption_refs: [],
      evidence_refs: [evidenceRef],
      frame_payload: { fixture: true },
    },
    recommended_candidate_keys: ['harness_candidate'],
    generation_notes: ['Candidate stays inside the selected ResearchSlice and preserves N5 lineage.'],
    human_review_triggers: [],
    candidates: [{
      candidate_key: 'harness_candidate',
      main_question: 'How can a WorkflowHarness-native candidate gate improve replayable v1b topic selection?',
      sub_questions: ['Which N5 lineage hashes must remain frozen before N7 admission?'],
      question_type: 'system',
      contribution_hypothesis: 'system',
      source_validated_need_refs: [bundle.validated_need_ref],
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
        preserved_boundary_refs: [],
        excluded_boundary_refs: [],
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
      falsification_conditions: [{
        condition_type: 'claim_overstrong',
        severity: 'hard',
        statement: 'If changed frozen N5 lineage hashes are not detected, the candidate claim must be lowered.',
        trigger_evidence_refs: [evidenceRef],
        trigger_source_refs: [payload.research_slice_ref],
        related_contract_fields: ['expected_claim'],
        expected_action: 'lower_claim_strength',
        check_timing: 'before_value_assessment',
        confidence: 'high',
      }],
      risk_notes: [],
      blockers: [],
      objections: [],
      human_review_triggers: [],
      confidence: 0.84,
    }],
  };
}

async function v1bHarnessN7Request(
  app: FastifyInstance,
  n6Result: WorkflowHarnessHttpResult,
  suffix: string,
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  return v1bHarnessRequestFromHandoff<TopicSelectionV1bN7HarnessFrozenInputPayload>(
    app,
    n6Result,
    suffix,
    'N6ToN7Handoff',
    'topic-selection.v1b.materialize-topic-question-contract.v1',
    'n7',
    'N6ToN7Handoff@v1',
    'topic_question_candidate_set',
    {
      input_mode: 'initial_from_n6',
      n6_handoff_hash: n6Result.hashes.handoff_hash,
    },
  );
}

async function v1bHarnessN8Request(
  app: FastifyInstance,
  n7Result: WorkflowHarnessHttpResult,
  suffix: string,
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  const projectionRef = await n7ToN8ProjectionRef(app, n7Result);
  return v1bHarnessRequestFromHandoff<TopicSelectionV1bN8HarnessFrozenInputPayload>(
    app,
    n7Result,
    suffix,
    'N7ToN8Handoff',
    'topic-selection.v1b.assess-topic-value.v1',
    'n8',
    'N7ToN8Handoff@v1',
    'topic_question_contract',
    { n7_handoff_hash: n7Result.hashes.handoff_hash },
    [projectionRef],
  );
}

async function n7ToN8ProjectionRef(
  app: FastifyInstance,
  n7Result: WorkflowHarnessHttpResult,
): Promise<TopicSelectionFunctionalRef> {
  const trace = await getWorkflowHarnessTraceSnapshot(app, n7Result.trace_snapshot_ref);
  const projectionRef = trace.payload.runtime_context_projection_ref as TopicSelectionFunctionalRef | null | undefined;
  assert.equal(projectionRef?.ref_type, 'artifact_ref');
  return projectionRef!;
}

function v1bHarnessN8ValueDraft(
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
): TopicSelectionV1bTopicValueAssessmentDraftPayload {
  const payload = input.frozen_input.payload as unknown as TopicSelectionV1bN8HarnessFrozenInputPayload;
  const evidenceRef = payload.topic_question_contract_ref;
  return {
    readiness_status: 'ready',
    strongest_claim_if_success: 'A harness-native topic-selection flow preserves replayable authority boundaries.',
    fallback_claim_if_success: 'Harness-level acceptance exposes route-only smoke gaps.',
    hard_gates: TOPIC_SELECTION_VALUE_GATE_KEYS.map((gateKey) => ({
      gate_key: gateKey,
      verdict: 'pass' as const,
      severity: 'info' as const,
      overridable_with_risk: false,
      rationale: `${gateKey} passes in the deterministic value fixture.`,
      refs: [evidenceRef],
    })),
    dimension_scores: TOPIC_SELECTION_VALUE_DIMENSIONS.map((dimensionKey) => ({
      dimension_key: dimensionKey,
      score: dimensionKey === 'reviewer_risk' ? 72 : 84,
      rationale: `${dimensionKey} is sufficiently supported for the fixture.`,
      evidence_refs: [evidenceRef],
      uncertainty: 'medium',
    })),
    risk_penalty: { residual_risk: 'bounded' },
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
  };
}

async function v1bHarnessN9Request(
  app: FastifyInstance,
  n8Result: WorkflowHarnessHttpResult,
  suffix: string,
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  return v1bHarnessRequestFromHandoff<TopicSelectionV1bN9HarnessFrozenInputPayload>(
    app,
    n8Result,
    suffix,
    'N8ToN9Handoff',
    'topic-selection.v1b.decide-value-disposition.v1',
    'n9',
    'N8ToN9Handoff@v1',
    'topic_value_assessment',
    { n8_handoff_hash: n8Result.hashes.handoff_hash },
  );
}

async function v1bHarnessN10Request(
  app: FastifyInstance,
  n9Result: WorkflowHarnessHttpResult,
  suffix: string,
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  return v1bHarnessRequestFromHandoff<TopicSelectionV1bN10HarnessFrozenInputPayload>(
    app,
    n9Result,
    suffix,
    'N9ToN10Handoff',
    'topic-selection.v1b.create-draft-topic-package.v1',
    'n10',
    'N9ToN10Handoff@v1',
    'value_disposition_decision',
    { n9_handoff_hash: n9Result.hashes.handoff_hash },
  );
}

async function v1bHarnessN11Request(
  app: FastifyInstance,
  n10Result: WorkflowHarnessHttpResult,
  suffix: string,
): Promise<TopicSelectionV1bWorkflowHarnessRunRequest> {
  return v1bHarnessRequestFromHandoff<TopicSelectionV1bN11HarnessFrozenInputPayload>(
    app,
    n10Result,
    suffix,
    'N10ToN11Handoff',
    'topic-selection.v1b.publish-v1c-input-bundle.v1',
    'n11',
    'N10ToN11Handoff@v1',
    'topic_package',
    { n10_handoff_hash: n10Result.hashes.handoff_hash },
  );
}

async function runV1bHarnessHttpN1ToN11(
  app: FastifyInstance,
  suffix: string,
): Promise<{
  bundle: TopicSelectionV1aToV1bInputBundleRecord;
  n11: WorkflowHarnessHttpResult;
}> {
  const bundleResult = await createV1bInputBundle(app, suffix);
  const n1Input = v1bHarnessN1Request(bundleResult.v1bInputBundle, suffix);
  const n1 = await invokeV1bHarnessNode(app, n1Input);
  const acceptedProfile = acceptedConstraintProfilePayload();
  const n2Input = v1bHarnessN2Request(bundleResult.v1bInputBundle, n1, suffix, acceptedProfile);
  const n2 = await invokeV1bHarnessNode(app, n2Input);
  const n3 = await invokeV1bHarnessNode(app, v1bHarnessN3Request(n1, n2, suffix));
  const n4Input = v1bHarnessN4Request(n1, n2, n3, suffix);
  const n4 = await invokeV1bHarnessNode(app, {
    ...n4Input,
    semantic_artifacts: [
      await recordWorkflowHarnessSemanticArtifact(app, n4Input, {
        slot_id: 'n4_research_slice_option_draft',
        allowed_effect: 'model_draft_for_gate',
        output_contract: 'ResearchSliceOptionSetDraft@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
      }, v1bHarnessN4Draft(bundleResult.v1bInputBundle) as unknown as Record<string, unknown>),
    ],
  });
  assert.ok(n4.authority_ref, JSON.stringify(n4));
  const selectedOption = await selectedV1bHarnessOption(app, n4);
  const n5 = await invokeV1bHarnessNode(
    app,
    v1bHarnessN5Request(n4, acceptedV1bHarnessSliceSelectionPayload(selectedOption), suffix),
  );
  const n6Input = await v1bHarnessN6Request(app, n5, suffix);
  const n6 = await invokeV1bHarnessNode(app, {
    ...n6Input,
    semantic_artifacts: [
      await recordWorkflowHarnessSemanticArtifact(app, n6Input, {
        slot_id: 'n6_question_candidate_draft',
        allowed_effect: 'model_draft_for_gate',
        output_contract: 'TopicQuestionCandidateSetDraft@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
      }, v1bHarnessN6Draft(bundleResult.v1bInputBundle, n6Input) as unknown as Record<string, unknown>),
    ],
  });
  assert.ok(n6.handoff_ref, JSON.stringify(n6));
  const n7 = await invokeV1bHarnessNode(app, await v1bHarnessN7Request(app, n6, suffix));
  await advanceQuestionCheckpoint(app, bundleResult.v1bInputBundle.title_card_id);
  const n8Input = await v1bHarnessN8Request(app, n7, suffix);
  const n8 = await invokeV1bHarnessNode(app, {
    ...n8Input,
    semantic_artifacts: [
      await recordWorkflowHarnessSemanticArtifact(app, n8Input, {
        slot_id: 'n8_value_assessment_draft',
        allowed_effect: 'model_draft_for_gate',
        output_contract: 'TopicValueAssessmentDraft@v1',
        profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
      }, v1bHarnessN8ValueDraft(n8Input) as unknown as Record<string, unknown>),
    ],
  });
  const n9 = await invokeV1bHarnessNode(app, await v1bHarnessN9Request(app, n8, suffix));
  const n10 = await invokeV1bHarnessNode(app, await v1bHarnessN10Request(app, n9, suffix));
  const n11 = await invokeV1bHarnessNode(app, await v1bHarnessN11Request(app, n10, suffix));
  return { bundle: bundleResult.v1bInputBundle, n11 };
}

function assertStatus(response: { statusCode: number; body: string }, expected: number): void {
  if (response.statusCode !== expected) {
    assert.fail(`Expected HTTP ${expected}, received ${response.statusCode}: ${response.body}`);
  }
}

async function researchCheckpoint(
  app: FastifyInstance,
  titleCardId: string,
  expectedKind: 'evidence_landscape' | 'gap_selection' | 'question_contract',
) {
  const response = await app.inject({
    method: 'GET',
    url: `/topic-selection/title-cards/${encodeURIComponent(titleCardId)}/research-status`,
  });
  assertStatus(response, 200);
  const status = response.json() as {
    current_checkpoint: {
      research_checkpoint_id: string;
      checkpoint_kind: string;
      target_snapshot_hash: string;
      allowed_actions: string[];
      target_ref: TopicSelectionFunctionalRef;
    } | null;
  };
  assert.equal(status.current_checkpoint?.checkpoint_kind, expectedKind);
  assert.ok(status.current_checkpoint);
  return status.current_checkpoint;
}

async function advanceEvidenceCheckpoint(app: FastifyInstance, titleCardId: string): Promise<void> {
  const checkpoint = await researchCheckpoint(app, titleCardId, 'evidence_landscape');
  assert.ok(checkpoint.allowed_actions.includes('advance'));
  const response = await app.inject({
    method: 'POST',
    url: `/topic-selection/checkpoints/${encodeURIComponent(checkpoint.research_checkpoint_id)}/decisions`,
    payload: {
      decision_key: uniqueId('evidence-decision'),
      decision: 'advance',
      actor: { actor_type: 'human', actor_id: 'v1b-route-researcher' },
      confirmed_snapshot_hash: checkpoint.target_snapshot_hash,
      rationale: 'Reviewed current source quality, direct neighbors, and disconfirming evidence.',
      review_payload: {
        review_kind: 'evidence_landscape',
        nearest_work_reviewed: true,
        disconfirming_evidence_reviewed: true,
        source_quality_reviewed: true,
        limitations: [],
      },
    },
  });
  assertStatus(response, 201);
}

async function advanceQuestionCheckpoint(app: FastifyInstance, titleCardId: string): Promise<void> {
  const checkpoint = await researchCheckpoint(app, titleCardId, 'question_contract');
  assert.ok(checkpoint.allowed_actions.includes('advance'));
  const response = await app.inject({
    method: 'POST',
    url: `/topic-selection/checkpoints/${encodeURIComponent(checkpoint.research_checkpoint_id)}/decisions`,
    payload: {
      decision_key: uniqueId('question-decision'),
      decision: 'advance',
      actor: { actor_type: 'human', actor_id: 'v1b-route-researcher' },
      confirmed_snapshot_hash: checkpoint.target_snapshot_hash,
      rationale: 'Reviewed the exact mechanism, proxy, confounds, falsification conditions, and claim boundary.',
      review_payload: {
        review_kind: 'question_contract',
        mechanism_identifiable: true,
        proxy_operationalized: true,
        confounds_reviewed: true,
        falsification_reviewed: true,
        claim_ceiling_reviewed: true,
        objections_reviewed: true,
        review_notes: ['Current N7 design is suitable for value assessment.'],
      },
    },
  });
  assertStatus(response, 201);
}

function minimalReplayGoldExpectation() {
  return {
    expected_unmet_need: false,
    expected_key_evidence_refs: [],
    expected_counter_evidence_refs: [],
    expected_blocker_codes: [],
    required_trace_refs: [],
    expected_recheck_action_refs: [],
    expected_negative_memory_refs: [],
    expected_downstream_rework_causes: [],
    notes: [],
  };
}

async function assertPrismaHttpSmokeDatabaseReady(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl, 'DATABASE_URL is required for T-054 Prisma HTTP smoke test.');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$queryRaw`SELECT 1 FROM "LiteratureRecord" LIMIT 1`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert.fail(
      [
        'DATABASE_URL for T-054 Prisma HTTP smoke must point at a reachable Postgres database with repo migrations applied.',
        `Underlying Prisma error: ${message}`,
      ].join(' '),
    );
  } finally {
    await prisma.$disconnect();
  }
}

function manualLocator(input: {
  titleCardId: string;
  literatureRef: TopicSelectionFunctionalRef;
  sourceRef: TopicSelectionFunctionalRef;
  key: string;
}) {
  return {
    locator_type: 'manual',
    locator_ref: ref('manual_locator', input.key, input.titleCardId),
    literature_ref: input.literatureRef,
    source_ref: input.sourceRef,
    content_ref: null,
    section_ref: null,
    paragraph_ref: null,
    anchor_ref: null,
    manual_label: `Manual locator ${input.key}`,
  };
}

function telemetry(schemaName: string): LlmCallTelemetry {
  return {
    provider_id: 'openai',
    model_id: 'gpt-5.6-sol',
    profile_id: schemaName,
    prompt_template_id: schemaName,
    prompt_template_version: '1',
    elapsed_ms: 1,
    request_count: 1,
    retry_count: 0,
    timeout_count: 0,
    rate_limit_count: 0,
    input_tokens: 100,
    output_tokens: 100,
    embedding_input_tokens: null,
    total_tokens: 200,
    cost_usd: null,
    provider_side_cache_hit: null,
    provider_side_cache_read_tokens: null,
    provider_side_cache_write_tokens: null,
  };
}


type V1aNativeHarnessHttpResult = {
  route_decision: string;
  route_signal: string;
  route_target_node_id: string | null;
  harness_trace_artifact_ref: TopicSelectionFunctionalRef | null;
  scenario_result: any;
};

async function invokeV1aNativeHarnessNode(
  app: FastifyInstance,
  nodeId: string,
  scenarioInput: Record<string, any>,
  expectedRoute: {
    route_decision: string;
    route_signal: string;
    route_target_node_id: string | null;
  },
): Promise<V1aNativeHarnessHttpResult> {
  const response = await app.inject({
    method: 'POST',
    url: `/topic-selection/v1a/workflow-harness/nodes/${encodeURIComponent(nodeId)}/invocations`,
    payload: {
      schema_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
      node_id: nodeId,
      workflow_run_id: scenarioInput.workflow_run_id,
      node_attempt_id: scenarioInput.node_attempt_id,
      policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
      title_card_id: scenarioInput.title_card_id ?? null,
      scenario_input: scenarioInput,
      created_by: scenarioInput.created_by ?? 'system',
    },
  });
  assertStatus(response, 201);
  const body = response.json() as V1aNativeHarnessHttpResult;
  const routeDebug = JSON.stringify({
    route_signal: body.route_signal,
    error_code: body.scenario_result.adapter_result?.error_code ?? body.scenario_result.node_result?.error_code ?? null,
    error_message: body.scenario_result.adapter_result?.error_message ?? body.scenario_result.node_result?.error_message ?? null,
    blocker_codes: body.scenario_result.adapter_result?.blocker_codes ?? body.scenario_result.node_result?.blocker_codes ?? [],
  });
  assert.equal(body.route_decision, expectedRoute.route_decision, `${nodeId} route_decision ${routeDebug}`);
  assert.equal(body.route_signal, expectedRoute.route_signal, `${nodeId} route_signal ${routeDebug}`);
  assert.equal(body.route_target_node_id, expectedRoute.route_target_node_id, `${nodeId} route_target_node_id ${routeDebug}`);
  assert.equal(body.scenario_result.scenario_status, 'passed', `${nodeId} scenario_status ${routeDebug}`);
  return body;
}

class FakeTopicSelectionV1aLlmGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  async createStructuredOutput<T>(request: LlmStructuredOutputRequest) {
    this.calls.push(request);
    const userPayload = JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      node?: {
        workflow_run_id: string;
        node_attempt_id: string;
        execution_mode: string;
        profile_id: string;
        policy_version: string;
        output_schema_version: string;
      };
      candidate?: {
        need_candidate_ref: TopicSelectionFunctionalRef;
        gap_codes?: string[];
      };
      readiness?: {
        readiness_assessment_ref: TopicSelectionFunctionalRef;
      };
      support_packet?: {
        validation_support_packet_ref: TopicSelectionFunctionalRef;
        open_gap_codes?: string[];
        residual_risk_refs?: TopicSelectionFunctionalRef[];
      };
    };
    if (request.schemaName !== TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION) {
      throw new Error(`Unexpected v1a structured output schema ${request.schemaName}.`);
    }
    const sourceRefs = [
      userPayload.candidate?.need_candidate_ref,
      userPayload.readiness?.readiness_assessment_ref,
      userPayload.support_packet?.validation_support_packet_ref,
    ].filter((item): item is TopicSelectionFunctionalRef => Boolean(item));
    const parsed = {
      schema_version: TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
      workflow_run_id: userPayload.node?.workflow_run_id,
      node_attempt_id: userPayload.node?.node_attempt_id,
      recommendation_packet_id: `${userPayload.node?.node_attempt_id ?? 'node_attempt'}_recommendation`,
      need_candidate_ref: userPayload.candidate?.need_candidate_ref,
      validation_support_packet_ref: userPayload.support_packet?.validation_support_packet_ref,
      readiness_assessment_ref: userPayload.readiness?.readiness_assessment_ref,
      execution_mode: userPayload.node?.execution_mode,
      profile_id: userPayload.node?.profile_id,
      final_decision: 'validate',
      rationale: 'Fake v1a provider validates the native runner candidate while preserving support-packet risks.',
      required_actions: [
        'route result according to deterministic v1a node policy',
        ...(userPayload.support_packet?.open_gap_codes?.includes('METHOD_FAMILY_COVERAGE_GAP')
          ? ['carry METHOD_FAMILY_COVERAGE_GAP into v1b intake']
          : []),
      ],
      gap_codes: userPayload.support_packet?.open_gap_codes ?? userPayload.candidate?.gap_codes ?? [],
      accepted_risk_refs: [],
      residual_risk_refs: userPayload.support_packet?.residual_risk_refs ?? [],
      rejected_reason: null,
      merge_target_need_candidate_ref: null,
      searchplan_recheck_reason: null,
      searchplan_recheck_gap_codes: [],
      source_refs: sourceRefs,
      recommendation_payload: { fake_provider: true },
      policy_version: userPayload.node?.policy_version,
      output_schema_version: userPayload.node?.output_schema_version,
    };
    return {
      parsed: parsed as T,
      raw: { schemaName: request.schemaName, parsed },
      telemetry: telemetry(request.schemaName),
    };
  }
}

function roleCoverageRef(
  handoff: { coverage_role_expectations?: Array<{ expected_evidence_role: string; coverage_row_intent_ref: TopicSelectionFunctionalRef }> },
  role: string,
): TopicSelectionFunctionalRef {
  const row = handoff.coverage_role_expectations?.find((entry) => entry.expected_evidence_role === role);
  assert.ok(row, `missing ${role} coverage row in v1a search-run handoff`);
  return row.coverage_row_intent_ref;
}

function v1aSearchRunInputRefsHash(searchRunHandoff: any): string {
  return new TopicSelectionEvidenceMapMaterializationService().inputRefsHashForSearchRunHandoff(searchRunHandoff);
}

function buildV1aNativeEvidenceMapDraft(input: {
  titleCardId: string;
  searchRunHandoff: any;
  literatureRef: TopicSelectionFunctionalRef;
  sourceRef: TopicSelectionFunctionalRef;
}) {
  const roles = ['support', 'challenge', 'baseline', 'context'];
  return {
    schema_version: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_DRAFT_SCHEMA_VERSION,
    title_card_ref: ref('title_card', input.titleCardId, input.titleCardId),
    search_run_ref: input.searchRunHandoff.search_run_ref,
    search_plan_ref: input.searchRunHandoff.search_plan_ref,
    literature_resource_pool_snapshot_ref: input.searchRunHandoff.literature_resource_pool_snapshot_ref,
    literature_snapshot_hash: input.searchRunHandoff.literature_snapshot_hash,
    producer_kind: 'fixture',
    profile_id: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
    input_refs_hash: v1aSearchRunInputRefsHash(input.searchRunHandoff),
    draft_units: roles.map((role) => ({
      client_unit_key: role,
      coverage_row_intent_ref: roleCoverageRef(input.searchRunHandoff, role),
      evidence_role: role,
      literature_ref: input.literatureRef,
      source_refs: [input.sourceRef],
      locator: manualLocator({
        titleCardId: input.titleCardId,
        literatureRef: input.literatureRef,
        sourceRef: input.sourceRef,
        key: `native-v1a-${role}`,
      }),
      source_statement: `Native v1a ${role} evidence supports v1b handoff fixture creation.`,
      source_attribution_kind: role === 'challenge' ? 'counter_evidence' : 'source_claim',
      normalized_statement: `Normalized ${role} evidence for native v1a to v1b linkage.`,
      interpretation_payload: { role },
      confidence: 0.82,
      issue_codes: [],
    })),
    draft_links: [],
    draft_clusters: roles.map((role) => ({
      cluster_type: role === 'challenge' ? 'limitation_family' : role === 'baseline' ? 'baseline_family' : 'method_family',
      cluster_key: `${role}-cluster`,
      unit_keys: [role],
      label: `${role} evidence`,
      rationale: `Native v1a fixture cluster for ${role}.`,
      confidence: 0.82,
    })),
    draft_patterns: roles.map((role) => ({
      pattern_type: role === 'challenge' ? 'limitation' : role === 'baseline' ? 'baseline' : role === 'context' ? 'context' : 'solution',
      evidence_role: role,
      unit_keys: [role],
      pattern_statement: `${role} evidence is present for v1b handoff validation.`,
      confidence: 0.82,
    })),
    draft_conflicts: [
      {
        conflict_type: 'claim_conflict',
        severity: 'moderate',
        support_unit_keys: ['support'],
        challenge_unit_keys: ['challenge'],
        baseline_unit_keys: ['baseline'],
        context_unit_keys: ['context'],
        issue_codes: ['risk_carry_forward_required'],
      },
    ],
    warning_codes: [],
    policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
    output_schema_version: 'v1',
  };
}

function refsByV1aEvidenceRole(evidenceMapRecords: any, role: string, titleCardId: string): TopicSelectionFunctionalRef[] {
  return evidenceMapRecords.evidence_units
    .filter((unit: { evidence_role: string }) => unit.evidence_role === role)
    .map((unit: { evidence_unit_id: string; evidence_map_version?: string | null }) =>
      ref('evidence_unit', unit.evidence_unit_id, titleCardId, unit.evidence_map_version ?? null)
    );
}

function buildV1aNativeRankedBatch(input: {
  titleCardId: string;
  nodeAttemptId: string;
  evidenceMapRecords: any;
  strengthRef: TopicSelectionFunctionalRef;
}) {
  const conflictRefs = input.evidenceMapRecords.conflict_sets.map((record: { evidence_conflict_set_id: string; evidence_map_version: string }) =>
    ref('evidence_conflict', record.evidence_conflict_set_id, input.titleCardId, record.evidence_map_version)
  );
  return {
    schema_version: 'v1',
    draft_batch: {
      batch_id: `draft_batch_${input.nodeAttemptId}`,
      node_attempt_id: input.nodeAttemptId,
      terminal_result: 'finalize',
      ranking_rationale: 'Native v1a runner fixture has complete role evidence for v1b intake.',
      max_persisted_candidates: 5,
    },
    drafts: [
      {
        draft_id: `draft_${input.nodeAttemptId}`,
        rank: 1,
        candidate_need: 'Reviewer-aligned topic selection needs traceable evidence-to-need decisions.',
        unmet_need_statement: 'Topic decisions need auditable evidence, risk, and handoff boundaries.',
        mechanism_type: 'workflow_gap',
        mechanism_summary: 'Native v1a route policy must preserve evidence lineage before v1b.',
        mechanism_payload: { native_http_harness: true },
        scope_notes: 'Local-first CS paper engineering workflows.',
        non_goal_notes: 'No production deployment claim.',
        prior_art_status: 'partial_solution_known',
        evidence_role_bundle: {
          support_unit_refs: refsByV1aEvidenceRole(input.evidenceMapRecords, 'support', input.titleCardId),
          challenge_unit_refs: refsByV1aEvidenceRole(input.evidenceMapRecords, 'challenge', input.titleCardId),
          baseline_unit_refs: refsByV1aEvidenceRole(input.evidenceMapRecords, 'baseline', input.titleCardId),
          context_unit_refs: refsByV1aEvidenceRole(input.evidenceMapRecords, 'context', input.titleCardId),
        },
        conflict_refs: conflictRefs,
        strength_assessment_refs: [input.strengthRef],
        accepted_risk_refs: [],
        gap_codes: ['traceability_gap'],
        speculative: false,
        confidence: 0.82,
      },
      {
        draft_id: `draft_alternative_${input.nodeAttemptId}`,
        rank: 2,
        candidate_need: 'Adaptive evidence routing may improve reviewer-facing decision quality.',
        unmet_need_statement: 'Static evidence routing cannot adapt review pressure to unresolved objections.',
        mechanism_type: 'system_gap',
        mechanism_summary: 'An adaptive routing intervention changes which counter-evidence is prioritized.',
        mechanism_payload: {
          research_object: 'reviewer-facing evidence routing',
          intervention: 'adaptive counter-evidence routing',
          comparison: 'static role-balanced evidence routing',
          outcome: 'objection resolution quality',
        },
        scope_notes: 'A substantively different intervention within the same evidence boundary.',
        non_goal_notes: 'No claim that a top-k parameter alone is an academic contribution.',
        prior_art_status: 'no_strong_solution_found',
        evidence_role_bundle: {
          support_unit_refs: refsByV1aEvidenceRole(input.evidenceMapRecords, 'support', input.titleCardId),
          challenge_unit_refs: refsByV1aEvidenceRole(input.evidenceMapRecords, 'challenge', input.titleCardId),
          baseline_unit_refs: refsByV1aEvidenceRole(input.evidenceMapRecords, 'baseline', input.titleCardId),
          context_unit_refs: refsByV1aEvidenceRole(input.evidenceMapRecords, 'context', input.titleCardId),
        },
        conflict_refs: conflictRefs,
        strength_assessment_refs: [input.strengthRef],
        accepted_risk_refs: [],
        gap_codes: ['adaptive_routing_gap'],
        speculative: false,
        confidence: 0.76,
      },
    ],
    rejected_framings: [],
    unresolved_points: [],
  };
}

function buildV1aNativeExplorationPayload() {
  return {
    topic_scope: { domain: 'topic-selection native v1a to v1b handoff' },
    evidence_signal_digest: { support_count: 1, challenge_count: 1 },
    resource_sample_digest: { sample_set_id: 'native-v1a-v1b-sample', role_counts: { support: 1, challenge: 1, baseline: 1, context: 1 } },
    search_coverage_digest: { coverage: 'complete', method_family_targets: ['workflow_orchestration'] },
    sibling_candidate_digest: { candidate_count: 0 },
    decision_memory_digest: { required_challenges: [] },
    exploration_prompts: ['Generate one traceable candidate need.'],
    challenge_prompts: ['Carry counter-evidence into validation.'],
    allowed_outputs: ['ranked_candidate_draft_batch'],
    forbidden_outputs: ['authority_write_outside_harness'],
  };
}

function buildV1aNativeArbiterPayload(input: {
  evidenceMapRecords: any;
  titleCardId: string;
  strengthRef: TopicSelectionFunctionalRef;
}) {
  const evidenceRows = input.evidenceMapRecords.evidence_units.map(
    (unit: { evidence_unit_id: string; evidence_role: string; evidence_map_version?: string | null }) => ({
      evidence_ref: ref('evidence_unit', unit.evidence_unit_id, input.titleCardId, unit.evidence_map_version ?? null),
      role: unit.evidence_role,
    }),
  );
  const conflictRows = input.evidenceMapRecords.conflict_sets.map(
    (record: { evidence_conflict_set_id: string; evidence_map_version: string }) => ({
      evidence_ref: ref('evidence_conflict', record.evidence_conflict_set_id, input.titleCardId, record.evidence_map_version),
      role: 'conflict',
    }),
  );
  return {
    node_policy_ref: ref('node_policy', 'generate_need_candidate_v1', input.titleCardId),
    output_schema_ref: ref('schema', 'ranked_candidate_draft_batch_v1', input.titleCardId),
    authority_boundary: {
      authority_object: 'NeedCandidate',
      forbidden: ['NeedCandidateSet', 'ValidatedNeed', 'TopicQuestionContract'],
    },
    max_persisted_candidates: 5,
    deterministic_gate_checklist: ['schema_validation', 'admission_gates'],
    role_level_summaries: [{ role: 'single_agent', summary: 'native-v1a-v1b-ready' }],
    candidate_pool_digest: { candidate_count: 0 },
    evidence_ref_table: [
      ...evidenceRows,
      ...conflictRows,
      {
        evidence_ref: input.strengthRef,
        role: 'strength_assessment',
      },
    ],
    rejected_framing_table: [],
    unresolved_points: [],
    batch_ranking_rules: ['rank grounded drafts first'],
    persistence_rules: ['persist only admitted candidates'],
    failure_rules: ['block malformed drafts'],
  };
}










async function createLiterature(app: FastifyInstance, suffix: string): Promise<string> {
  const safeSuffix = suffix.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const importRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/import',
    payload: {
      items: [
        {
          provider: 'manual',
          external_id: `topic-selection-v1b-api-${safeSuffix}`,
          title: `Topic Selection v1b API Evidence ${suffix}`,
          abstract: 'Evidence workflows miss reviewer-facing traceability from claims to decisions.',
          authors: ['API Route Author'],
          year: 2026,
          doi: `10.1000/topic-selection-v1b-api-${safeSuffix}`,
          source_url: `https://example.com/topic-selection-v1b-api/${safeSuffix}`,
        },
      ],
    },
  });
  assertStatus(importRes, 200);
  const body = importRes.json() as { results: Array<{ literature_id: string }> };
  const literatureId = body.results[0]?.literature_id;
  assert.ok(literatureId);
  return literatureId;
}

async function createTitleCard(app: FastifyInstance, suffix: string): Promise<string> {
  const titleCardRes = await app.inject({
    method: 'POST',
    url: '/title-cards',
    payload: {
      working_title: `Topic Selection v1b API Title ${suffix}`,
      brief: 'Validate v1b topic package drafting through HTTP routes.',
    },
  });
  assertStatus(titleCardRes, 201);
  return (titleCardRes.json() as { title_card_id: string }).title_card_id;
}

async function createV1bInputBundle(app: FastifyInstance, suffix: string) {
  const literatureId = await createLiterature(app, suffix);
  const titleCardId = await createTitleCard(app, suffix);
  const basketRes = await app.inject({
    method: 'PATCH',
    url: `/title-cards/${encodeURIComponent(titleCardId)}/evidence-basket`,
    payload: { add_literature_ids: [literatureId] },
  });
  assertStatus(basketRes, 200);
  const n1 = await invokeV1aNativeHarnessNode(
    app,
    'topic-selection.v1a.create-topic-seed.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-fixture.v1',
      scenario_case_id: 'n1',
      title_card_id: titleCardId,
      workflow_run_id: `workflow_run_v1a_for_v1b_n1_${suffix}`,
      node_attempt_id: `node_attempt_v1a_for_v1b_n1_${suffix}`,
      intent_summary: 'Native v1a runner creates the v1b harness fixture bundle.',
      scope_notes: 'v1b HTTP harness test fixture.',
      policy_version: 'v1',
      output_schema_version: 'v1',
      expectations: { status: 'succeeded' },
      created_by: 'system',
    },
    {
      route_decision: 'invoke_next',
      route_signal: 'topic_seed_created',
      route_target_node_id: 'topic-selection.v1a.snapshot-literature-resource-pool.v1',
    },
  );
  const n2 = await invokeV1aNativeHarnessNode(
    app,
    'topic-selection.v1a.snapshot-literature-resource-pool.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-fixture.v1',
      scenario_case_id: 'n2',
      title_card_id: titleCardId,
      workflow_run_id: `workflow_run_v1a_for_v1b_n2_${suffix}`,
      node_attempt_id: `node_attempt_v1a_for_v1b_n2_${suffix}`,
      topic_seed_ref: n1.scenario_result.node_result.topic_seed_ref,
      source_scope: 'title_card_evidence_basket',
      policy_version: 'v1',
      output_schema_version: 'v1',
      expectations: { status: 'succeeded', included_literature_count: 1 },
      created_by: 'system',
    },
    {
      route_decision: 'invoke_next',
      route_signal: 'literature_resource_pool_snapshot_created',
      route_target_node_id: 'topic-selection.v1a.create-search-plan.v1',
    },
  );
  const literatureRef = n2.scenario_result.node_result.included_literature_refs[0] ?? ref('literature_record', literatureId, titleCardId);
  const sourceRef = n2.scenario_result.node_result.content_source_refs[0] ?? ref('literature_source', `manual-source-${suffix}`, titleCardId);
  const coverageIntents = [
    ['support-traceability', 'support', 'support reviewer-facing traceability gap'],
    ['challenge-freshness', 'challenge', 'challenge evidence freshness for traceability workflows'],
    ['baseline-provenance', 'baseline', 'baseline decision chain misses provenance'],
    ['context-workflow', 'context', 'context local CS paper engineering workflow'],
  ].map(([coverageKey, role, query], index) => ({
    coverage_key: coverageKey,
    intent_type: role,
    query,
    expected_evidence_role: role,
    rationale: `Native ${role} coverage for v1b handoff.`,
    required: true,
    priority: index,
    target_source_types: ['paper'],
    refs: [literatureRef],
  }));
  const n3 = await invokeV1aNativeHarnessNode(
    app,
    'topic-selection.v1a.create-search-plan.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-fixture.v1',
      scenario_case_id: 'n3',
      title_card_id: titleCardId,
      workflow_run_id: `workflow_run_v1a_for_v1b_n3_${suffix}`,
      node_attempt_id: `node_attempt_v1a_for_v1b_n3_${suffix}`,
      blueprint: {
        schema_version: TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_SCHEMA_VERSION,
        blueprint_origin: 'workflow_scenario_fixture',
        blueprint_provenance_refs: [],
        title_card_ref: ref('title_card', titleCardId, titleCardId),
        topic_seed_ref: n1.scenario_result.node_result.topic_seed_ref,
        literature_resource_pool_snapshot_ref: n2.scenario_result.node_result.literature_resource_pool_snapshot_ref,
        expected_snapshot_hash: n2.scenario_result.node_result.snapshot_hash,
        plan_version: 'v1',
        parent_search_plan_ref: null,
        recheck_request_ref: null,
        query_intents: coverageIntents.map((intent) => intent.query),
        coverage_intents: coverageIntents,
        must_check_constraints: ['Keep v1a native runner as the automatic v1b fixture producer.'],
        exclusion_rules: ['Do not seed this automatic fixture through v1a direct write routes.'],
        coverage_strategy: { breadth: 'role_balanced_fixture', sequencing: ['support', 'challenge', 'baseline', 'context'] },
        role_coverage_expectation: { support: 1, challenge: 1, baseline: 1, context: 1 },
        method_family_targets: ['workflow_orchestration'],
        policy_version: 'v1',
        output_schema_version: 'v1',
      },
      expectations: { status: 'succeeded', coverage_row_count: 4, plan_version: 'v1' },
      created_by: 'system',
    },
    {
      route_decision: 'invoke_next',
      route_signal: 'search_plan_created',
      route_target_node_id: 'topic-selection.v1a.record-search-run.v1',
    },
  );
  const coverageRowRefs = n3.scenario_result.node_result.coverage_row_intent_refs as TopicSelectionFunctionalRef[];
  const n4 = await invokeV1aNativeHarnessNode(
    app,
    'topic-selection.v1a.record-search-run.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-fixture.v1',
      scenario_case_id: 'n4',
      title_card_id: titleCardId,
      workflow_run_id: `workflow_run_v1a_for_v1b_n4_${suffix}`,
      node_attempt_id: `node_attempt_v1a_for_v1b_n4_${suffix}`,
      bundle: {
        schema_version: TOPIC_SELECTION_SEARCH_RUN_RECORD_BUNDLE_SCHEMA_VERSION,
        title_card_ref: ref('title_card', titleCardId, titleCardId),
        search_plan_ref: n3.scenario_result.node_result.search_plan_ref,
        literature_resource_pool_snapshot_ref: n2.scenario_result.node_result.literature_resource_pool_snapshot_ref,
        expected_literature_snapshot_hash: n2.scenario_result.node_result.snapshot_hash,
        run_kind: 'planned_search',
        run_status: 'succeeded',
        query_provenance: coverageIntents.map((intent) => ({ query: intent.query, coverage_key: intent.coverage_key, source: 'native_v1a_fixture' })),
        result_accounting: {
          total_result_count: 4,
          unique_literature_count: 1,
          duplicate_result_count: 0,
          failed_source_count: 0,
          skipped_source_count: 0,
        },
        source_health_summary: { source_count: 1, failed_source_count: 0, warning_codes: [] },
        dedup_summary: { duplicate_groups: 0, canonical_work_refs: [literatureRef] },
        evidence_map_input_refs: [literatureRef, sourceRef],
        coverage_observations: coverageRowRefs.map((rowRef) => ({
          coverage_row_intent_ref: rowRef,
          status: 'succeeded',
          result_count: 1,
          source_count: 1,
          missing_reason_codes: [],
        })),
        evidence_bindings: coverageRowRefs.map((rowRef, index) => ({
          coverage_row_intent_ref: rowRef,
          literature_ref: literatureRef,
          source_refs: [sourceRef],
          binding_kind: 'retrieval_hit',
          result_rank: index + 1,
        })),
        coverage_assessments: coverageRowRefs.map((rowRef) => ({
          coverage_row_intent_ref: rowRef,
          verdict: 'satisfied',
          issue_codes: [],
          confidence: 0.88,
          assessed_by: 'system',
        })),
        coverage_risk_acceptances: [],
        raw_log_artifact_ref: ref('raw_search_log', `raw_search_${suffix}`, titleCardId),
        raw_log_artifact_payload: { fixture: 'native_v1a_to_v1b' },
        policy_version: 'v1',
        output_schema_version: 'v1',
      },
      expectations: { status: 'succeeded', consumable_for_evidence_map: true, downstream_handoff_present: true },
      created_by: 'system',
    },
    {
      route_decision: 'invoke_next',
      route_signal: 'search_run_consumable',
      route_target_node_id: 'topic-selection.v1a.build-evidence-map.v1',
    },
  );
  const n5 = await invokeV1aNativeHarnessNode(
    app,
    'topic-selection.v1a.build-evidence-map.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-fixture.v1',
      scenario_case_id: 'n5',
      title_card_id: titleCardId,
      workflow_run_id: `workflow_run_v1a_for_v1b_n5_${suffix}`,
      node_attempt_id: `node_attempt_v1a_for_v1b_n5_${suffix}`,
      search_run_handoff: n4.scenario_result.node_result.downstream_handoff,
      extraction_draft: buildV1aNativeEvidenceMapDraft({
        titleCardId,
        searchRunHandoff: n4.scenario_result.node_result.downstream_handoff,
        literatureRef,
        sourceRef,
      }),
      execution_mode: 'none',
      policy_version: 'v1',
      output_schema_version: 'v1',
      expectations: { status: 'succeeded', materialization_status: 'ready', evidence_unit_count: 4, downstream_handoff_present: true },
      created_by: 'system',
    },
    {
      route_decision: 'invoke_next',
      route_signal: 'evidence_map_ready',
      route_target_node_id: 'topic-selection.v1a.generate-need-candidate.v1',
    },
  );
  const n6AttemptId = `node_attempt_v1a_for_v1b_n6_${suffix}`;
  const n6StrengthRef = ref('evidence_strength_assessment', `strength_${suffix}`, titleCardId);
  await advanceEvidenceCheckpoint(app, titleCardId);
  const n6 = await invokeV1aNativeHarnessNode(
    app,
    'topic-selection.v1a.generate-need-candidate.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-fixture.v1',
      scenario_case_id: 'n6',
      title_card_id: titleCardId,
      workflow_run_id: `workflow_run_v1a_for_v1b_n6_${suffix}`,
      node_attempt_id: n6AttemptId,
      topic_scope_ref: ref('topic_scope', `topic_${suffix}`, titleCardId),
      evidence_map_ref: n5.scenario_result.node_result.evidence_map_ref,
      evidence_strength_ref: n6StrengthRef,
      resource_sample_set_ref: ref('resource_sample_set', `sample_${suffix}`, titleCardId),
      search_snapshot_refs: [n4.scenario_result.node_result.search_run_ref],
      resource_snapshot_refs: [n2.scenario_result.node_result.literature_resource_pool_snapshot_ref],
      policy_version: 'v1',
      output_schema_version: 'v1',
      profile_id: TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
      execution_mode: 'mocked_llm',
      run_mode: 'acceptance',
      exploration_payload: buildV1aNativeExplorationPayload(),
      arbiter_payload: buildV1aNativeArbiterPayload({
        evidenceMapRecords: n5.scenario_result.node_result.evidence_map_records,
        titleCardId,
        strengthRef: n6StrengthRef,
      }),
      mocked_output: {
        fixture_id: `ranked_batch_${suffix}`,
        output: buildV1aNativeRankedBatch({
          titleCardId,
          nodeAttemptId: n6AttemptId,
          evidenceMapRecords: n5.scenario_result.node_result.evidence_map_records,
          strengthRef: n6StrengthRef,
        }),
      },
      current_round_index: 1,
      remaining_round_budget: 0,
      persist_admitted_candidates: true,
      persistence_context: {
        search_run_ref: n4.scenario_result.node_result.search_run_ref,
        search_plan_ref: n3.scenario_result.node_result.search_plan_ref,
        literature_snapshot_ref: n2.scenario_result.node_result.literature_resource_pool_snapshot_ref,
      },
      expectations: {
        status: 'succeeded',
        routing_decision: 'finalize_with_admitted_batch',
        admitted_draft_count: 2,
        persisted_candidate_count: 2,
        persistence: 'required',
      },
      created_by: 'system',
    },
    {
      route_decision: 'invoke_next',
      route_signal: 'need_candidate_batch_finalized',
      route_target_node_id: 'topic-selection.v1a.validate-need-adjudication.v1',
    },
  );
  const candidate = n6.scenario_result.adapter_result.persist_need_candidate_batch_result.persisted_candidates[0];
  const alternativeCandidate = n6.scenario_result.adapter_result.persist_need_candidate_batch_result.persisted_candidates[1];
  assert.ok(alternativeCandidate);
  const candidateRef = ref('need_candidate', candidate.need_candidate_id, titleCardId, candidate.candidate_version);
  const n7 = await invokeV1aNativeHarnessNode(
    app,
    'topic-selection.v1a.validate-need-adjudication.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-fixture.v1',
      scenario_case_id: 'n7',
      title_card_id: titleCardId,
      workflow_run_id: `workflow_run_v1a_for_v1b_n7_${suffix}`,
      node_attempt_id: `node_attempt_v1a_for_v1b_n7_${suffix}`,
      need_candidate_ref: candidateRef,
      evidence_map_ref: candidate.evidence_map_ref,
      search_run_ref: candidate.search_run_ref,
      search_plan_ref: candidate.search_plan_ref,
      literature_snapshot_ref: candidate.literature_snapshot_ref,
      execution_mode: 'provider_llm',
      run_mode: 'acceptance',
      executor_kind: 'single_agent',
      profile_id: TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID,
      fixture_human_decision: true,
      policy_version: 'v1',
      output_schema_version: 'v1',
      expectations: {
        status: 'ready',
        route_outcome: 'advance_to_human_confirmation',
        final_decision: 'validate',
        adjudication_created: true,
      },
      created_by: 'system',
    },
    {
      route_decision: 'invoke_next',
      route_signal: 'need_adjudication_validated',
      route_target_node_id: 'topic-selection.v1a.human-confirm-need.v1',
    },
  );
  const gapCheckpoint = await researchCheckpoint(app, titleCardId, 'gap_selection');
  assert.ok(gapCheckpoint.allowed_actions.includes('advance'));
  const n8 = await invokeV1aNativeHarnessNode(
    app,
    'topic-selection.v1a.human-confirm-need.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-fixture.v1',
      scenario_case_id: 'n8',
      title_card_id: titleCardId,
      workflow_run_id: `workflow_run_v1a_for_v1b_n8_${suffix}`,
      node_attempt_id: `node_attempt_v1a_for_v1b_n8_${suffix}`,
      adjudication_result_ref: n7.scenario_result.node_result.adjudication_result_ref,
      need_candidate_ref: candidateRef,
      validation_support_packet_ref: n7.scenario_result.node_result.validation_support_packet_ref,
      reserved_validated_need_ref: n7.scenario_result.node_result.reserved_validated_need_ref,
      confirmation_input: {
        schema_version: TOPIC_SELECTION_HUMAN_CONFIRMATION_INPUT_SCHEMA_VERSION,
        actor_mode: 'human',
        accountable_human_ref: { actor_type: 'human', actor_id: 'v1b-harness-runner' },
        rationale: 'Native v1a runner confirms the validated need for v1b intake.',
        accepted_risk_refs: n7.scenario_result.node_result.residual_risk_refs,
        required_check_results: [
          'confirm_unmet_need',
          'review_prior_art_status',
          'review_counter_evidence',
          'confirm_scope_and_non_goals',
          'confirm_v1b_handoff_readiness',
        ].map((checkId) => ({ check_id: checkId, result: 'accepted' })),
        delegated_executor: null,
        gap_selection_review: {
          research_checkpoint_id: gapCheckpoint.research_checkpoint_id,
          confirmed_candidate_pool_hash: gapCheckpoint.target_snapshot_hash,
          selected_candidate_ref: candidateRef,
          direct_prior_art_pressure_reviewed: true,
          disconfirming_evidence_reviewed: true,
          candidate_reviews: [
            {
              need_candidate_ref: candidateRef,
              disposition: 'selected',
              distinct_from_selected_axes: [],
              rationale: 'Most identifiable gap for the scoped study.',
            },
            {
              need_candidate_ref: ref(
                'need_candidate',
                alternativeCandidate.need_candidate_id,
                titleCardId,
                alternativeCandidate.candidate_version,
              ),
              disposition: 'viable_alternative',
              distinct_from_selected_axes: ['intervention'],
              rationale: 'Changes the intervention and outcome rather than only wording or top-k.',
            },
          ],
        },
      },
      execution_mode: 'deterministic_parser',
      policy_version: 'v1',
      output_schema_version: 'v1',
      profile_id: TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
      expectations: {
        status: 'ready',
        route_outcome: 'advance_to_publish_v1b_input_bundle',
        validated_need_created: true,
        v1b_bundle_created: false,
      },
      created_by: 'system',
    },
    {
      route_decision: 'invoke_next',
      route_signal: 'human_confirmation_ready',
      route_target_node_id: 'topic-selection.v1a.publish-v1b-input-bundle.v1',
    },
  );
  const n9 = await invokeV1aNativeHarnessNode(
    app,
    'topic-selection.v1a.publish-v1b-input-bundle.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-fixture.v1',
      scenario_case_id: 'n9',
      title_card_id: titleCardId,
      workflow_run_id: `workflow_run_v1a_for_v1b_n9_${suffix}`,
      node_attempt_id: `node_attempt_v1a_for_v1b_n9_${suffix}`,
      validated_need_ref: n8.scenario_result.node_result.validated_need_ref,
      source_need_candidate_ref: candidateRef,
      adjudication_result_ref: n8.scenario_result.node_result.adjudication_result_ref,
      support_packet_ref: n8.scenario_result.node_result.validation_support_packet_ref,
      human_decision_ref: n8.scenario_result.node_result.human_decision_ref,
      evidence_map_ref: candidate.evidence_map_ref,
      search_run_ref: candidate.search_run_ref,
      search_plan_ref: candidate.search_plan_ref,
      literature_snapshot_ref: candidate.literature_snapshot_ref,
      evidence_role_bundle: candidate.evidence_role_bundle,
      risk_refs: [...n8.scenario_result.node_result.residual_risk_refs, ...n8.scenario_result.node_result.accepted_risk_refs],
      memory_suggestion_refs: [],
      recheck_request_refs: [],
      expected_bundle_version: 'v1a-to-v1b-input-bundle-v1',
      policy_version: 'v1',
      output_schema_version: 'v1',
      expectations: {
        status: 'ready',
        route_outcome: 'published_v1b_input_bundle',
        idempotency_result: 'created_new_bundle',
        bundle_published: true,
      },
      created_by: 'system',
    },
    {
      route_decision: 'stop_v1a_complete',
      route_signal: 'v1b_input_bundle_published',
      route_target_node_id: 'v1b.entry',
    },
  );
  assert.ok(n9.harness_trace_artifact_ref, 'N9 native runner must expose a trace artifact with the published v1b bundle.');
  const n9TraceRes = await app.inject({
    method: 'GET',
    url: `/topic-selection/v1a/workflow-harness/artifacts/${encodeURIComponent(n9.harness_trace_artifact_ref.ref_id)}`,
  });
  assertStatus(n9TraceRes, 200);
  const n9Trace = n9TraceRes.json() as { payload: { v1b_input_bundle?: TopicSelectionV1aToV1bInputBundleRecord | null } };
  const v1bBundle = n9Trace.payload.v1b_input_bundle;
  assert.ok(v1bBundle, 'N9 trace payload must carry the published v1b bundle for v1b harness intake.');
  assert.equal(v1bBundle.v1b_input_bundle_id, n9.scenario_result.node_result.v1b_input_bundle_ref.ref_id);
  return {
    titleCardId,
    validatedNeedId: n8.scenario_result.node_result.validated_need_ref.ref_id,
    v1bInputBundle: v1bBundle,
    v1bInputBundleId: v1bBundle.v1b_input_bundle_id,
  };
}

const removedLegacyWriteRoutes = [
  '/topic-selection/v1b/intake-snapshots',
  '/topic-selection/v1b/research-constraint-profiles',
  '/topic-selection/v1b/intake-readiness-assessments',
  '/topic-selection/v1b/research-slice-option-sets',
  '/topic-selection/v1b/research-slice-option-sets/option-set-route/selection-decisions',
  '/topic-selection/v1b/topic-question-candidate-sets',
  '/topic-selection/v1b/topic-question-candidate-sets/candidate-set-route/selection-decisions',
  '/topic-selection/v1b/topic-value-assessments',
  '/topic-selection/v1b/topic-value-assessments/value-assessment-route/disposition-decisions',
  '/topic-selection/v1b/topic-packages/drafts',
  '/topic-selection/v1b/topic-packages/package-route/v1c-input-bundles',
] as const;

test('topic-selection v1b legacy write routes are not registered', async () => {
  const app = buildApp({
    topicSelectionV1aLlmGateway: new FakeTopicSelectionV1aLlmGateway(),
  });
  try {
    for (const route of removedLegacyWriteRoutes) {
      const response = await app.inject({
        method: 'POST',
        url: route,
        payload: {},
      });
      assert.equal(response.statusCode, 404, route);
      assert.equal(response.headers.deprecation, undefined);
    }

    const readOnlyProjection = await app.inject({
      method: 'GET',
      url: '/topic-selection/v1b/title-cards/title-card-route-noop/research-slice-option-sets',
    });
    assert.equal(readOnlyProjection.statusCode, 200);

    const offlineReplay = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1b/offline-evaluation/datasets/synthetic-baseline',
      payload: {},
    });
    assert.equal(offlineReplay.statusCode, 201);
  } finally {
    await app.close();
  }
});

test('topic-selection v1b offline replay routes reject invalid payloads', async () => {
  const app = buildApp({
    topicSelectionV1aLlmGateway: new FakeTopicSelectionV1aLlmGateway(),
  });
  try {
    const invalidReplayCaseTypeRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1b/offline-evaluation/cases',
      payload: {
        dataset_id: 'offline-evaluation-dataset-route',
        case_key: 'v1a-case-type-through-v1b-api',
        case_type: 'true_unmet_need',
        frozen_input_bundle: {
          stage: 'v1b',
          frozen_at: '2026-05-14T00:00:00.000Z',
          source_refs: [],
          artifact_refs: [],
          stage_snapshots: {},
          payload: {},
        },
        gold_expectation: minimalReplayGoldExpectation(),
      },
    });
    assert.equal(invalidReplayCaseTypeRes.statusCode, 400);
    const invalidReplayCaseType = invalidReplayCaseTypeRes.json() as { error: { code: string } };
    assert.equal(invalidReplayCaseType.error.code, 'INVALID_PAYLOAD');

    const invalidReplayMetricRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1b/offline-evaluation/runs',
      payload: {
        dataset_id: 'offline-evaluation-dataset-route',
        workflow_profile_key: 'topic-selection-v1b-frozen-fixture',
        metric_keys: ['false_gap_rate'],
      },
    });
    assert.equal(invalidReplayMetricRes.statusCode, 400);
    const invalidReplayMetric = invalidReplayMetricRes.json() as { error: { code: string } };
    assert.equal(invalidReplayMetric.error.code, 'INVALID_PAYLOAD');
  } finally {
    await app.close();
  }
});

test('topic-selection v1b advance route validates a debate execution_plan per kind (W-09 pre-provider_llm hardening)', async () => {
  const app = buildApp({
    topicSelectionV1aLlmGateway: new FakeTopicSelectionV1aLlmGateway(),
  });
  try {
    const url = `/topic-selection/v1b/workflow-runs/${encodeURIComponent('run-schema-noop')}/advance`;
    const advance = (plan: unknown) => app.inject({
      method: 'POST',
      url,
      payload: {
        node_inputs: {
          'topic-selection.v1b.assess-topic-value.v1': {
            debate: { kind: 'n8_bounded', execution_mode: 'mocked_llm', role_outputs: {}, execution_plan: plan },
          },
        },
      },
    });

    // The two route-layer ENUM/TYPE violations Fastify actually 400s on (previously the plan passed
    // permissively as additionalProperties): an unknown plan `name`, and a bad nested role `execution_mode`.
    assert.equal((await advance({ name: 'not_a_named_plan' })).statusCode, 400);
    assert.equal(
      (await advance({ name: 'codex_assisted', roles: { n8_debate_value_critic: { execution_mode: 'not_a_mode' } } })).statusCode,
      400,
    );

    // What the route does NOT reject (Fastify default Ajv runs removeAdditional:true, so additionalProperties
    // violations are STRIPPED here, not rejected). A FOREIGN role key (an N6 slot on an N8 plan) is silently
    // dropped at the route — it is NOT a 400. The coordinator's own Ajv (removeAdditional OFF) is the
    // authoritative structural reject for direct callers (pinned in the coordinator unit tests); over HTTP it
    // only ever sees the already-stripped body. This assertion documents the real boundary behavior.
    assert.notEqual(
      (await advance({ name: 'codex_assisted', roles: { n6_debate_explorer: { execution_mode: 'mocked_llm' } } })).statusCode,
      400,
    );

    // A structurally valid (empty) plan passes schema validation — NOT rejected (the run has no traces, so
    // the coordinator returns a no_frontier advance report rather than a 400).
    assert.notEqual((await advance({ name: 'codex_assisted' })).statusCode, 400);
  } finally {
    await app.close();
  }
});

test('topic-selection v1b workflow harness HTTP route invokes N1 without legacy write headers', async () => {
  const app = buildApp({
    topicSelectionV1aLlmGateway: new FakeTopicSelectionV1aLlmGateway(),
  });
  try {
    const suffix = uniqueId('v1b-harness-http');
    const bundle = await createV1bInputBundle(app, suffix);
    const request = v1bHarnessN1Request(bundle.v1bInputBundle, suffix);
    const response = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1b/workflow-harness/nodes/${encodeURIComponent(request.node_id)}/invocations`,
      payload: request,
    });
    assertStatus(response, 201);
    assert.equal(response.headers.deprecation, undefined);

    const result = response.json() as {
      gate_status: string;
      route_decision: string;
      authority_ref: TopicSelectionFunctionalRef | null;
      handoff_ref: TopicSelectionFunctionalRef | null;
      hashes: { authority_hash: string | null };
    };
    assert.equal(result.gate_status, 'admitted', JSON.stringify(result));
    assert.equal(result.route_decision, 'invoke_next');
    assert.equal(result.authority_ref?.ref_type, 'v1b_intake_snapshot');
    assert.equal(result.handoff_ref?.ref_type, 'artifact_ref');

    const n2Request = v1bHarnessN2Request(
      bundle.v1bInputBundle,
      result,
      suffix,
      acceptedConstraintProfilePayload(),
    );
    const n2Response = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1b/workflow-harness/nodes/${encodeURIComponent(n2Request.node_id)}/invocations`,
      payload: n2Request,
    });
    assertStatus(n2Response, 201);
    assert.equal(n2Response.headers.deprecation, undefined);
    const n2Result = n2Response.json() as {
      gate_status: string;
      route_decision: string;
      authority_ref: TopicSelectionFunctionalRef | null;
    };
    assert.equal(n2Result.gate_status, 'admitted', JSON.stringify(n2Result));
    assert.equal(n2Result.route_decision, 'invoke_next');
    assert.equal(n2Result.authority_ref?.ref_type, 'research_constraint_profile');

    const mismatch = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1b/workflow-harness/nodes/topic-selection.v1b.assess-intake-readiness.v1/invocations',
      payload: request,
    });
    assert.equal(mismatch.statusCode, 400);
    const mismatchPayload = mismatch.json() as { error: { code: string; message: string } };
    assert.equal(mismatchPayload.error.code, 'INVALID_PAYLOAD');
    assert.match(mismatchPayload.error.message, /node_id must match/);
  } finally {
    await app.close();
  }
});

test('topic-selection v1b workflow harness HTTP route drives N1-N11 without legacy writes', async () => {
  const app = buildApp({
    topicSelectionV1aLlmGateway: new FakeTopicSelectionV1aLlmGateway(),
  });
  try {
    const { bundle, n11 } = await runV1bHarnessHttpN1ToN11(app, uniqueId('v1b-harness-http-full'));
    assert.equal(n11.gate_status, 'admitted_with_warnings', JSON.stringify(n11));
    assert.equal(n11.route_decision, 'stop_v1b_complete');
    assert.equal(n11.authority_ref?.ref_type, 'v1b_to_v1c_input_bundle');
    assert.equal(n11.authority_ref?.title_card_id, bundle.title_card_id);
    assert.match(n11.hashes.authority_hash ?? '', /^[a-f0-9]{64}$/);

    const legacyWrite = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1b/research-slice-option-sets',
      payload: {},
    });
    assert.equal(legacyWrite.statusCode, 404);
  } finally {
    await app.close();
  }
});

test('topic-selection v1b human N5 selection (T-115) produces a ResearchSlice through the harness', async () => {
  const app = buildApp({
    topicSelectionV1aLlmGateway: new FakeTopicSelectionV1aLlmGateway(),
  });
  try {
    const suffix = uniqueId('v1b-human-n5');
    // Drive N1 -> N4 only, leaving the option set ready_for_selection.
    const bundleResult = await createV1bInputBundle(app, suffix);
    const n1 = await invokeV1bHarnessNode(app, v1bHarnessN1Request(bundleResult.v1bInputBundle, suffix));
    const acceptedProfile = acceptedConstraintProfilePayload();
    const n2 = await invokeV1bHarnessNode(
      app,
      v1bHarnessN2Request(bundleResult.v1bInputBundle, n1, suffix, acceptedProfile),
    );
    const n3 = await invokeV1bHarnessNode(app, v1bHarnessN3Request(n1, n2, suffix));
    const n4Input = v1bHarnessN4Request(n1, n2, n3, suffix);
    const n4 = await invokeV1bHarnessNode(app, {
      ...n4Input,
      semantic_artifacts: [
        await recordWorkflowHarnessSemanticArtifact(app, n4Input, {
          slot_id: 'n4_research_slice_option_draft',
          allowed_effect: 'model_draft_for_gate',
          output_contract: 'ResearchSliceOptionSetDraft@v1',
          profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
        }, v1bHarnessN4Draft(bundleResult.v1bInputBundle) as unknown as Record<string, unknown>),
      ],
    });
    assert.ok(n4.authority_ref, JSON.stringify(n4));
    const optionSetId = n4.authority_ref.ref_id;
    const option = await selectedV1bHarnessOption(app, n4);

    // Human selects a slice through the T-115 human-authority route (human_delegated,
    // routed THROUGH the harness — not a legacy direct write).
    const res = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1b/research-slice-option-sets/${encodeURIComponent(optionSetId)}/human-selection`,
      payload: {
        selected_option_id: option.research_slice_option_id,
        selection_rationale: 'Strongest bounded fit for the validated need.',
        actor: { actor_type: 'human', actor_id: 'reviewer-1' },
        confidence: 0.82,
      },
    });
    assertStatus(res, 201);
    const result = res.json() as WorkflowHarnessHttpResult;
    assert.ok(
      ['admitted', 'admitted_with_warnings'].includes(result.gate_status),
      `expected admitted N5, got ${JSON.stringify(result)}`,
    );
    assert.ok(result.authority_ref, 'human N5 selection should emit an authority ref');
    assert.ok(result.handoff_ref, 'human N5 selection should emit an N5->N6 handoff');
    assert.equal(result.authority_ref?.title_card_id, bundleResult.v1bInputBundle.title_card_id);

    // A non-human actor is rejected (400) by the service.
    const botRes = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1b/research-slice-option-sets/${encodeURIComponent(optionSetId)}/human-selection`,
      payload: {
        selected_option_id: option.research_slice_option_id,
        selection_rationale: 'bot tries',
        actor: { actor_type: 'llm', actor_id: 'bot' },
      },
    });
    assert.equal(botRes.statusCode, 400);
  } finally {
    await app.close();
  }
});

test('topic-selection v1b human N2 constraint profile (T-115) is admitted through the harness', async () => {
  const app = buildApp({
    topicSelectionV1aLlmGateway: new FakeTopicSelectionV1aLlmGateway(),
  });
  try {
    const suffix = uniqueId('v1b-human-n2');
    // Run N1 to materialise the intake snapshot (the N2 lineage authority).
    const bundleResult = await createV1bInputBundle(app, suffix);
    const n1 = await invokeV1bHarnessNode(app, v1bHarnessN1Request(bundleResult.v1bInputBundle, suffix));
    assert.ok(n1.authority_ref, JSON.stringify(n1));
    const intakeSnapshotId = n1.authority_ref.ref_id;

    // Researcher authors the constraint profile (minimal form) through the T-115 route.
    const res = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1b/intake-snapshots/${encodeURIComponent(intakeSnapshotId)}/constraint-profile/human`,
      payload: {
        actor: { actor_type: 'human', actor_id: 'reviewer-1' },
        profile: {
          target_community: 'LLM systems researchers',
          claim_ceiling: 'Can claim reviewer-aligned planning feasibility, not production superiority.',
          method_constraints: ['offline replay evaluation'],
          non_goals: ['Do not target production deployment'],
        },
      },
    });
    assertStatus(res, 201);
    const result = res.json() as WorkflowHarnessHttpResult;
    assert.ok(
      ['admitted', 'admitted_with_warnings'].includes(result.gate_status),
      `expected admitted N2, got ${JSON.stringify(result)}`,
    );
    assert.ok(result.authority_ref, 'human N2 should emit a constraint-profile authority ref');
    assert.equal(result.authority_ref?.title_card_id, bundleResult.v1bInputBundle.title_card_id);

    // Non-human actor is rejected (400) by the service.
    const botRes = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1b/intake-snapshots/${encodeURIComponent(intakeSnapshotId)}/constraint-profile/human`,
      payload: {
        actor: { actor_type: 'llm', actor_id: 'bot' },
        profile: { target_community: 'x', claim_ceiling: 'y' },
      },
    });
    assert.equal(botRes.statusCode, 400);
  } finally {
    await app.close();
  }
});

test('topic-selection v1b offline replay HTTP routes calculate metrics and expose diffs', async () => {
  const app = buildApp({
    topicSelectionV1aLlmGateway: new FakeTopicSelectionV1aLlmGateway(),
  });
  try {
    const datasetRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1b/offline-evaluation/datasets/synthetic-baseline',
    });
    assertStatus(datasetRes, 201);
    const synthetic = datasetRes.json() as {
      dataset: { offline_evaluation_dataset_id: string; stage: string; case_count: number };
      cases: TopicSelectionOfflineEvaluationCaseRecord[];
    };
    assert.equal(synthetic.dataset.stage, 'v1b');
    assert.equal(synthetic.dataset.case_count, 6);
    assert.equal(synthetic.cases.every((record) => record.frozen_input_bundle.stage === 'v1b'), true);

    const runRes = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1b/offline-evaluation/runs',
      payload: {
        dataset_id: synthetic.dataset.offline_evaluation_dataset_id,
        workflow_profile_key: 'topic-selection-v1b-frozen-fixture',
        workflow_profile_version: 'v1',
      },
    });
    assertStatus(runRes, 201);
    const run = runRes.json() as { offline_evaluation_run_id: string };

    for (const evaluationCase of synthetic.cases) {
      const resultRes = await app.inject({
        method: 'POST',
        url: '/topic-selection/v1b/offline-evaluation/case-results',
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
      url: `/topic-selection/v1b/offline-evaluation/runs/${encodeURIComponent(run.offline_evaluation_run_id)}/complete`,
    });
    assertStatus(completeRes, 200);

    const metricRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1b/offline-evaluation/runs/${encodeURIComponent(run.offline_evaluation_run_id)}/metric-results`,
    });
    assertStatus(metricRes, 200);
    const metrics = metricRes.json() as { items: Array<{ metric_key: string; numerator: number; denominator: number }> };
    assert.deepEqual(
      new Set(metrics.items.map((item) => item.metric_key)),
      new Set(TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_METRIC_KEYS),
    );

    const diffRes = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1b/offline-evaluation/runs/${encodeURIComponent(run.offline_evaluation_run_id)}/replay-diffs`,
    });
    assertStatus(diffRes, 200);
    const diffs = diffRes.json() as { items: Array<{ changed_dimensions: string[] }> };
    const changedDimensions = new Set(diffs.items.flatMap((record) => record.changed_dimensions));
    for (const dimension of [
      'slice_boundary',
      'answerability_verdict',
      'value_claim',
      'package_trace',
      'package_readiness',
      'loopback_cause',
    ]) {
      assert.equal(changedDimensions.has(dimension), true, `missing replay diff dimension ${dimension}`);
    }
  } finally {
    await app.close();
  }
});

test('T-054 Prisma HTTP smoke requires DATABASE_URL and drives v1b harness HTTP routes against Prisma repositories', async () => {
  await assertPrismaHttpSmokeDatabaseReady();
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

  const app = buildApp({
    topicSelectionV1aLlmGateway: new FakeTopicSelectionV1aLlmGateway(),
  });
  try {
    const result = await runV1bHarnessHttpN1ToN11(app, uniqueId('v1b-prisma-harness'));
    assert.equal(result.n11.gate_status, 'admitted_with_warnings', JSON.stringify(result.n11));
    assert.equal(result.n11.route_decision, 'stop_v1b_complete');
    assert.equal(result.n11.authority_ref?.ref_type, 'v1b_to_v1c_input_bundle');
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

test('v1b harness HTTP N6 emits decision-memory dedup warning when frozen input references a memory packet', async () => {
  const app = buildApp({
    topicSelectionV1aLlmGateway: new FakeTopicSelectionV1aLlmGateway(),
  });
  try {
    const suffix = uniqueId('v1b-harness-memory');
    const bundleResult = await createV1bInputBundle(app, suffix);
    const n1Input = v1bHarnessN1Request(bundleResult.v1bInputBundle, suffix);
    const n1 = await invokeV1bHarnessNode(app, n1Input);
    const acceptedProfile = acceptedConstraintProfilePayload();
    const n2 = await invokeV1bHarnessNode(app, v1bHarnessN2Request(bundleResult.v1bInputBundle, n1, suffix, acceptedProfile));
    const n3 = await invokeV1bHarnessNode(app, v1bHarnessN3Request(n1, n2, suffix));
    const n4Input = v1bHarnessN4Request(n1, n2, n3, suffix);
    const n4 = await invokeV1bHarnessNode(app, {
      ...n4Input,
      semantic_artifacts: [
        await recordWorkflowHarnessSemanticArtifact(app, n4Input, {
          slot_id: 'n4_research_slice_option_draft',
          allowed_effect: 'model_draft_for_gate',
          output_contract: 'ResearchSliceOptionSetDraft@v1',
          profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
        }, v1bHarnessN4Draft(bundleResult.v1bInputBundle) as unknown as Record<string, unknown>),
      ],
    });
    assert.ok(n4.authority_ref, JSON.stringify(n4));
    const selectedOption = await selectedV1bHarnessOption(app, n4);
    const n5 = await invokeV1bHarnessNode(
      app,
      v1bHarnessN5Request(n4, acceptedV1bHarnessSliceSelectionPayload(selectedOption), suffix),
    );
    const baseN6Input = await v1bHarnessN6Request(app, n5, suffix);
    const titleCardId = baseN6Input.title_card_id;
    assert.ok(titleCardId);

    // The fixture draft regenerates exactly this previously-parked question.
    const memoryPacket = {
      schema_version: 'TopicSelectionDecisionMemoryPacket@v1',
      title_card_id: titleCardId,
      scope: 'title_card',
      entries: [{
        source_type: 'prior_topic_question_candidate',
        source_ref: { ref_type: 'topic_question_candidate', ref_id: `tqc_prior_${suffix}`, title_card_id: titleCardId },
        title_card_id: titleCardId,
        summary: 'How can a WorkflowHarness-native candidate gate improve replayable v1b topic selection?',
        reason: 'previously generated and parked in an earlier N6 run',
        decision_kind: 'prior_generation',
        severity: null,
        status: 'parked',
        created_at: '2026-06-01T00:00:00.000Z',
        normalized_text_key: 'how can a workflowharness native candidate gate improve replayable v1b topic selection',
        related_refs: [],
      }],
      entry_counts_by_source: { prior_topic_question_candidate: 1 },
      truncated: false,
      non_authority: true,
      evidence_policy: 'not_evidence',
    };
    const memoryArtifactResponse = await app.inject({
      method: 'POST',
      url: '/topic-selection/v1b/workflow-harness/artifacts',
      payload: {
        title_card_id: titleCardId,
        artifact_kind: 'diagnostic',
        storage_kind: 'inline',
        workflow_run_id: baseN6Input.workflow_run_id,
        payload: memoryPacket,
        created_by: 'system',
      },
    });
    assertStatus(memoryArtifactResponse, 201);
    const memoryArtifact = memoryArtifactResponse.json() as TopicSelectionArtifactRefRecord;

    const frozenWithMemory: TopicSelectionV1bWorkflowHarnessRunRequest['frozen_input'] = {
      input_contract: baseN6Input.frozen_input.input_contract,
      snapshot_kind: baseN6Input.frozen_input.snapshot_kind,
      source_refs: [
        ...baseN6Input.frozen_input.source_refs,
        ref('artifact_ref', memoryArtifact.artifact_ref_id, titleCardId),
      ],
      payload: baseN6Input.frozen_input.payload,
    };
    const n6Input: TopicSelectionV1bWorkflowHarnessRunRequest = {
      ...baseN6Input,
      frozen_input: {
        ...frozenWithMemory,
        frozen_input_hash: frozenInputHash(frozenWithMemory),
      },
    };
    const n6 = await invokeV1bHarnessNode(app, {
      ...n6Input,
      semantic_artifacts: [
        await recordWorkflowHarnessSemanticArtifact(app, n6Input, {
          slot_id: 'n6_question_candidate_draft',
          allowed_effect: 'model_draft_for_gate',
          output_contract: 'TopicQuestionCandidateSetDraft@v1',
          profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
        }, v1bHarnessN6Draft(bundleResult.v1bInputBundle, n6Input) as unknown as Record<string, unknown>),
      ],
    });
    assert.ok(n6.handoff_ref, JSON.stringify(n6));
    const handoff = await getWorkflowHarnessHandoff(app, n6.handoff_ref);
    assert.ok(
      handoff.envelope.warning_codes.includes('decision_memory_duplicate_candidate'),
      `expected decision_memory_duplicate_candidate in ${JSON.stringify(handoff.envelope.warning_codes)}`,
    );
  } finally {
    await app.close();
  }
});

test('v1b run coordinator advances N1→N11 with human halts, caller drafts, and idempotent re-advance', async () => {
  const app = buildApp({
    topicSelectionV1aLlmGateway: new FakeTopicSelectionV1aLlmGateway(),
  });
  try {
    const suffix = uniqueId('v1b-coordinator');
    const bundleResult = await createV1bInputBundle(app, suffix);
    const n1Input = v1bHarnessN1Request(bundleResult.v1bInputBundle, suffix);
    const runId = n1Input.workflow_run_id;
    const N2_ID = 'topic-selection.v1b.record-research-constraint-profile.v1';
    const N4_ID = 'topic-selection.v1b.generate-research-slice-options.v1';
    const N5_ID = 'topic-selection.v1b.select-research-slice.v1';
    const N6_ID = 'topic-selection.v1b.generate-topic-question-candidates.v1';
    const N7_ID = 'topic-selection.v1b.materialize-topic-question-contract.v1';
    const N8_ID = 'topic-selection.v1b.assess-topic-value.v1';

    type CoordinatorState = {
      nodes: Array<{
        node_id: string;
        latest: {
          gate_status: string;
          route_decision: string;
          authority_ref: TopicSelectionFunctionalRef | null;
          handoff_ref: TopicSelectionFunctionalRef | null;
          trace_snapshot_ref: TopicSelectionFunctionalRef | null;
          authority_hash: string | null;
          handoff_hash: string | null;
        } | null;
      }>;
      run_complete: boolean;
    };
    type AdvanceReport = {
      steps: Array<{ node_id: string; gate_status: string }>;
      halt: { reason: string; node_id: string | null };
      run_state: CoordinatorState;
    };
    const advance = async (body: Record<string, unknown>): Promise<AdvanceReport> => {
      const response = await app.inject({
        method: 'POST',
        url: `/topic-selection/v1b/workflow-runs/${encodeURIComponent(runId)}/advance`,
        payload: body,
      });
      assertStatus(response, 200);
      return response.json() as AdvanceReport;
    };
    // TAP suppresses assert messages — dump the report on the failing path only.
    const dumpUnless = (condition: boolean, label: string, payload: unknown): void => {
      if (!condition) {
        console.error(label, JSON.stringify(payload, null, 2).slice(0, 6000));
      }
    };
    const fabricateResult = (state: CoordinatorState, nodeId: string): WorkflowHarnessHttpResult => {
      const latest = state.nodes.find((node) => node.node_id === nodeId)?.latest;
      assert.ok(latest, `expected latest result for ${nodeId}`);
      return {
        gate_status: latest.gate_status,
        route_decision: latest.route_decision,
        failure_class: null,
        authority_ref: latest.authority_ref,
        handoff_ref: latest.handoff_ref,
        trace_snapshot_ref: latest.trace_snapshot_ref,
        transition_attempt_ref: null,
        hashes: {
          authority_hash: latest.authority_hash,
          handoff_hash: latest.handoff_hash,
        },
      };
    };

    // 0) guard surfaces: unknown run id is a 404, schema rejects malformed budgets
    const missingState = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1b/workflow-runs/${encodeURIComponent(`${runId}_missing`)}/state`,
    });
    assert.equal(missingState.statusCode, 404);
    const badBudget = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1b/workflow-runs/${encodeURIComponent(runId)}/advance`,
      payload: { max_steps: 0 },
    });
    assert.equal(badBudget.statusCode, 400);

    // 1) bootstrap N1 → halt at the N2 human decision point
    const afterN1 = await advance({ bootstrap_request: n1Input });
    assert.deepEqual(afterN1.steps.map((step) => step.node_id), [n1Input.node_id]);
    dumpUnless(afterN1.halt.reason === 'human_node', 'COORD_DEBUG_AFTER_N1', afterN1);
    assert.equal(afterN1.halt.reason, 'human_node');
    assert.equal(afterN1.halt.node_id, N2_ID);

    // 2) human authors the N2 constraint profile, joining the SAME workflow run
    const intakeSnapshotId = afterN1.run_state.nodes.find(
      (node) => node.node_id === n1Input.node_id,
    )!.latest!.authority_ref!.ref_id;
    const n2Human = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1b/intake-snapshots/${encodeURIComponent(intakeSnapshotId)}/constraint-profile/human`,
      payload: {
        actor: { actor_type: 'human', actor_id: 'reviewer_coordinator_e2e' },
        workflow_run_id: runId,
        profile: acceptedConstraintProfilePayload(),
      },
    });
    assertStatus(n2Human, 201);

    // 3) advance → deterministic N3 runs, halts at model-like N4 (human-in-loop per D1)
    const afterN3 = await advance({});
    dumpUnless(afterN3.halt.reason === 'model_input_required', 'COORD_DEBUG_AFTER_N3', afterN3.halt);
    assert.equal(afterN3.halt.reason, 'model_input_required');
    assert.equal(afterN3.halt.node_id, N4_ID);

    // 4) caller supplies the N4 draft → coordinator records the semantic artifact and runs N4
    const afterN4 = await advance({
      node_inputs: {
        [N4_ID]: { draft_payload: v1bHarnessN4Draft(bundleResult.v1bInputBundle) as unknown as Record<string, unknown> },
      },
    });
    dumpUnless(afterN4.halt.reason === 'human_node', 'COORD_DEBUG_AFTER_N4', afterN4);
    assert.deepEqual(afterN4.steps.map((step) => step.node_id), [N4_ID]);
    assert.equal(afterN4.halt.reason, 'human_node');
    assert.equal(afterN4.halt.node_id, N5_ID);

    // 5) human picks the slice (same run id)
    const n4Like = fabricateResult(afterN4.run_state, N4_ID);
    const selectedOption = await selectedV1bHarnessOption(app, n4Like);
    // Binding guard: a route target that does not descend from THIS run's N4 authority
    // is rejected before any harness write (cross-run contamination protection).
    const wrongTarget = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1b/research-slice-option-sets/${encodeURIComponent(intakeSnapshotId)}/human-selection`,
      payload: {
        selected_option_id: selectedOption.research_slice_option_id,
        selection_rationale: 'wrong target must not bind',
        actor: { actor_type: 'human', actor_id: 'reviewer_coordinator_e2e' },
        workflow_run_id: runId,
      },
    });
    assert.equal(wrongTarget.statusCode, 409);
    const n5Human = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1b/research-slice-option-sets/${encodeURIComponent(n4Like.authority_ref!.ref_id)}/human-selection`,
      payload: {
        selected_option_id: selectedOption.research_slice_option_id,
        selection_rationale: 'Coordinator e2e: strongest bounded fit.',
        actor: { actor_type: 'human', actor_id: 'reviewer_coordinator_e2e' },
        workflow_run_id: runId,
      },
    });
    assertStatus(n5Human, 201);

    // 5b) frontier guard regression: N5 is now admitted, so the projection's next_node_id advances
    // to N6 (derived from N5's invoke_next edge). A late/duplicate N5 human selection that reuses the
    // SAME run id AND the CORRECT N4 target is therefore rejected (409 "is not awaiting") instead of
    // landing a stale attempt. This pins the strict next_node_id check: a prior short-circuit let an
    // already-admitted node keep accepting late writes once the frontier had moved on.
    const lateN5 = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1b/research-slice-option-sets/${encodeURIComponent(n4Like.authority_ref!.ref_id)}/human-selection`,
      payload: {
        selected_option_id: selectedOption.research_slice_option_id,
        selection_rationale: 'late resubmit after the frontier advanced past N5',
        actor: { actor_type: 'human', actor_id: 'reviewer_coordinator_e2e' },
        workflow_run_id: runId,
      },
    });
    assert.equal(lateN5.statusCode, 409);
    const lateN5Body = lateN5.json() as { error: { code: string; message: string } };
    assert.equal(lateN5Body.error.code, 'VERSION_CONFLICT');
    assert.match(lateN5Body.error.message, /is not awaiting/);

    // 6) advance with the N6 draft → N6 + mechanical N7 run, halt at N8
    const stateAfterN5 = (await advance({})).run_state; // surfaces fresh projection (halts at N6 input)
    const n6Input = await v1bHarnessN6Request(app, fabricateResult(stateAfterN5, N5_ID), suffix);
    const afterN7 = await advance({
      node_inputs: {
        [N6_ID]: {
          draft_payload: v1bHarnessN6Draft(bundleResult.v1bInputBundle, n6Input) as unknown as Record<string, unknown>,
        },
      },
    });
    dumpUnless(afterN7.steps.length === 2, 'COORD_DEBUG_AFTER_N7', { steps: afterN7.steps, halt: afterN7.halt });
    assert.deepEqual(afterN7.steps.map((step) => step.node_id), [N6_ID, N7_ID]);
    assert.equal(afterN7.halt.reason, 'model_input_required');
    assert.equal(afterN7.halt.node_id, N8_ID);

    // 7) N8 draft from the materialized contract → chain completes through N9/N10/N11
    await advanceQuestionCheckpoint(app, bundleResult.v1bInputBundle.title_card_id);
    const n8Input = await v1bHarnessN8Request(app, fabricateResult(afterN7.run_state, N7_ID), suffix);
    const finalReport = await advance({
      node_inputs: {
        [N8_ID]: { draft_payload: v1bHarnessN8ValueDraft(n8Input) as unknown as Record<string, unknown> },
      },
    });
    dumpUnless(finalReport.steps.length === 4, 'COORD_DEBUG_FINAL', { steps: finalReport.steps, halt: finalReport.halt });
    assert.deepEqual(
      finalReport.steps.map((step) => step.node_id),
      [
        N8_ID,
        'topic-selection.v1b.decide-value-disposition.v1',
        'topic-selection.v1b.create-draft-topic-package.v1',
        'topic-selection.v1b.publish-v1c-input-bundle.v1',
      ],
    );
    assert.equal(finalReport.halt.reason, 'run_complete');
    assert.equal(finalReport.run_state.run_complete, true);

    // 8) idempotent re-advance: nothing executes, completion is stable (crash-resume semantics)
    const again = await advance({});
    assert.equal(again.halt.reason, 'run_complete');
    assert.equal(again.steps.length, 0);

    // 9) run-state route exposes the projection
    const stateResponse = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1b/workflow-runs/${encodeURIComponent(runId)}/state`,
    });
    assertStatus(stateResponse, 200);
    const state = stateResponse.json() as CoordinatorState;
    assert.equal(state.run_complete, true);
  } finally {
    await app.close();
  }
});

// T-123 P3 / DP-3.6: the FULLY coordinator-driven N8 debate loop, end-to-end through the REAL harness.
// A borderline value draft (total_score in [60,72) -> T1) loops back first-pass; the coordinator
// assembles the N7 feedback_from_n8 frozen input AND records the caller-supplied
// n7_n8_debate_admission_review support (the piece the harness readmission requires); N7 readmits;
// the still-borderline re-eval re-enters N8, which admits with an after-debate warning. This proves the
// coordinator can drive the whole loop (not just the harness-level e2e) through the real N7 parser.
test('v1b run coordinator drives the full N8 debate loop: borderline T1 loopback → N7 feedback re-entry (with debate-admission support) → re-eval admits', async () => {
  const app = buildApp({ topicSelectionV1aLlmGateway: new FakeTopicSelectionV1aLlmGateway() });
  try {
    const suffix = uniqueId('v1b-coord-debate-loop');
    const bundleResult = await createV1bInputBundle(app, suffix);
    const n1Input = v1bHarnessN1Request(bundleResult.v1bInputBundle, suffix);
    const runId = n1Input.workflow_run_id;
    const N4_ID = 'topic-selection.v1b.generate-research-slice-options.v1';
    const N5_ID = 'topic-selection.v1b.select-research-slice.v1';
    const N6_ID = 'topic-selection.v1b.generate-topic-question-candidates.v1';
    const N7_ID = 'topic-selection.v1b.materialize-topic-question-contract.v1';
    const N8_ID = 'topic-selection.v1b.assess-topic-value.v1';

    type CoordinatorState = {
      nodes: Array<{ node_id: string; latest: {
        gate_status: string; route_decision: string;
        authority_ref: TopicSelectionFunctionalRef | null; handoff_ref: TopicSelectionFunctionalRef | null;
        trace_snapshot_ref: TopicSelectionFunctionalRef | null; authority_hash: string | null; handoff_hash: string | null;
      } | null }>;
      run_complete: boolean;
    };
    type AdvanceReport = { steps: Array<{ node_id: string; gate_status: string }>; halt: { reason: string; node_id: string | null; message?: string }; run_state: CoordinatorState };
    const advance = async (body: Record<string, unknown>): Promise<AdvanceReport> => {
      const response = await app.inject({ method: 'POST', url: `/topic-selection/v1b/workflow-runs/${encodeURIComponent(runId)}/advance`, payload: body });
      assertStatus(response, 200);
      return response.json() as AdvanceReport;
    };
    const fabricate = (s: CoordinatorState, nodeId: string): WorkflowHarnessHttpResult => {
      const latest = s.nodes.find((node) => node.node_id === nodeId)?.latest;
      assert.ok(latest, `expected latest for ${nodeId}`);
      return {
        gate_status: latest.gate_status, route_decision: latest.route_decision, failure_class: null,
        authority_ref: latest.authority_ref, handoff_ref: latest.handoff_ref, trace_snapshot_ref: latest.trace_snapshot_ref,
        transition_attempt_ref: null, hashes: { authority_hash: latest.authority_hash, handoff_hash: latest.handoff_hash },
      };
    };
    const borderline = (draft: Record<string, unknown>): Record<string, unknown> => ({ ...draft, total_score: 66 });
    const debateAdmissionSupport = {
      debate_level: 'compact_assessment_debate',
      recommended_profile_id: 'topic-selection.v1b.harness.n7_n8_debate_admission_support',
      high_value_signal_codes: [],
      risk_signal_codes: ['N8_VALUE_BORDERLINE_DEBATE_TRIGGER'],
      rationale: 'Borderline total_score warrants a compact value debate.',
    };

    // Drive N1 -> N7 frontier (N2/N5 human, N4/N6 drafts).
    const afterN1 = await advance({ bootstrap_request: n1Input });
    const intakeSnapshotId = afterN1.run_state.nodes.find((n) => n.node_id === n1Input.node_id)!.latest!.authority_ref!.ref_id;
    assertStatus(await app.inject({
      method: 'POST', url: `/topic-selection/v1b/intake-snapshots/${encodeURIComponent(intakeSnapshotId)}/constraint-profile/human`,
      payload: { actor: { actor_type: 'human', actor_id: 'reviewer_coord_debate' }, workflow_run_id: runId, profile: acceptedConstraintProfilePayload() },
    }), 201);
    await advance({});
    const afterN4 = await advance({ node_inputs: { [N4_ID]: { draft_payload: v1bHarnessN4Draft(bundleResult.v1bInputBundle) as unknown as Record<string, unknown> } } });
    const n4Like = fabricate(afterN4.run_state, N4_ID);
    const selectedOption = await selectedV1bHarnessOption(app, n4Like);
    assertStatus(await app.inject({
      method: 'POST', url: `/topic-selection/v1b/research-slice-option-sets/${encodeURIComponent(n4Like.authority_ref!.ref_id)}/human-selection`,
      payload: { selected_option_id: selectedOption.research_slice_option_id, selection_rationale: 'Coordinator debate-loop e2e.', actor: { actor_type: 'human', actor_id: 'reviewer_coord_debate' }, workflow_run_id: runId },
    }), 201);
    const stateAfterN5 = (await advance({})).run_state;
    const n6Input = await v1bHarnessN6Request(app, fabricate(stateAfterN5, N5_ID), suffix);
    const afterN7 = await advance({ node_inputs: { [N6_ID]: { draft_payload: v1bHarnessN6Draft(bundleResult.v1bInputBundle, n6Input) as unknown as Record<string, unknown> } } });
    assert.equal(afterN7.halt.node_id, N8_ID);

    // First N8 eval with a borderline draft -> T1 first-pass loopback.
    await advanceQuestionCheckpoint(app, bundleResult.v1bInputBundle.title_card_id);
    const n8Input = await v1bHarnessN8Request(app, fabricate(afterN7.run_state, N7_ID), suffix);
    const loopbackReport = await advance({ node_inputs: { [N8_ID]: { draft_payload: borderline(v1bHarnessN8ValueDraft(n8Input) as unknown as Record<string, unknown>) } } });
    assert.equal(loopbackReport.halt.reason, 'harness_loopback');
    assert.equal(loopbackReport.run_state.nodes.find((n) => n.node_id === N8_ID)!.latest!.route_decision, 'loopback');

    // Feedback re-entry: coordinator assembles the feedback frozen input + records the debate-admission
    // support; the REAL N7 readmission parser accepts both and admits.
    const reentryReport = await advance({ retry_node_id: N7_ID, node_inputs: { [N7_ID]: { draft_payload: { ...debateAdmissionSupport } } } });
    assert.deepEqual(reentryReport.steps.map((s) => s.node_id), [N7_ID]);
    const n7Reentry = reentryReport.run_state.nodes.find((n) => n.node_id === N7_ID)!.latest!;
    assert.ok(n7Reentry.gate_status === 'admitted' || n7Reentry.gate_status === 'admitted_with_warnings', 'N7 feedback re-entry admits through the real harness');
    assert.equal(n7Reentry.route_decision, 'invoke_next');
    assert.equal(reentryReport.halt.node_id, N8_ID);

    // T-128 W-14: at this exact bounded-debate frontier a provider_llm debate request must hit the
    // DORMANCY gate over HTTP — the route enum admits provider_llm and the debate profiles are
    // provider-eligible by default, so without the runtime entry guard this would fire live provider
    // role turns on skeleton prompts. The coordinator surfaces the guard as a structured
    // `debate_blocked` halt (resumable run, zero steps/writes), so the codex re-eval below proceeds.
    const providerProbe = await advance({
      node_inputs: {
        [N8_ID]: { debate: { kind: 'n8_bounded', execution_mode: 'provider_llm', role_outputs: {} } },
      },
    });
    assert.equal(providerProbe.halt.reason, 'debate_blocked');
    assert.equal(providerProbe.halt.node_id, N8_ID);
    assert.equal(providerProbe.steps.length, 0);
    assert.match(providerProbe.halt.message ?? '', /DORMANT/);
    assert.match(providerProbe.halt.message ?? '', /calibration_gate_release/);
    const providerProbeBlocker = (providerProbe.halt as unknown as { blockers: Array<{ code: string }> }).blockers[0];
    assert.equal(providerProbeBlocker?.code, 'GATE_CONSTRAINT_FAILED');

    // N8 re-eval (still borderline; admission ref now feedback_from_n8) -> after-debate warning admit.
    const n8Reentry = await v1bHarnessN8Request(app, fabricate(reentryReport.run_state, N7_ID), `${suffix}_reeval`);
    const reevalReport = await advance({ node_inputs: { [N8_ID]: { draft_payload: borderline(v1bHarnessN8ValueDraft(n8Reentry) as unknown as Record<string, unknown>) } } });
    const n8Reeval = reevalReport.run_state.nodes.find((n) => n.node_id === N8_ID)!.latest!;
    assert.equal(n8Reeval.gate_status, 'admitted_with_warnings');
    assert.equal(n8Reeval.route_decision, 'invoke_next');
    assert.equal(reevalReport.steps[0]!.node_id, N8_ID);
  } finally {
    await app.close();
  }
});

// T-128 W-15 (O-1/O-2): the operator record routes over HTTP. Pins the W-09 validation chain —
// the route body schema stays permissive `{type:'object'}` (so nothing is stripped before the
// service) and the service-level STRICT Ajv is authoritative — plus the tripwire target guard
// and the audited budget-raise recording.
test('v1b operator routes (W-15): sign-off strict validation + tripwire target guard, budget-raise schema cap over HTTP', async () => {
  const app = buildApp({ topicSelectionV1aLlmGateway: new FakeTopicSelectionV1aLlmGateway() });
  try {
    const suffix = uniqueId('v1b-operator-routes');
    const bundleResult = await createV1bInputBundle(app, suffix);
    const n1Input = v1bHarnessN1Request(bundleResult.v1bInputBundle, suffix);
    const runId = n1Input.workflow_run_id;
    const N6_ID = 'topic-selection.v1b.generate-topic-question-candidates.v1';
    const N8_ID = 'topic-selection.v1b.assess-topic-value.v1';

    // Bootstrap N1 so the run exists (halts at the N2 human node) — no tripwire anywhere on it.
    const bootstrap = await app.inject({
      method: 'POST',
      url: `/topic-selection/v1b/workflow-runs/${encodeURIComponent(runId)}/advance`,
      payload: { bootstrap_request: n1Input },
    });
    assertStatus(bootstrap, 200);
    assert.equal((bootstrap.json() as { halt: { reason: string } }).halt.reason, 'human_node');

    const signOffUrl = `/topic-selection/v1b/workflow-runs/${encodeURIComponent(runId)}/sign-offs`;
    const raiseUrl = `/topic-selection/v1b/workflow-runs/${encodeURIComponent(runId)}/loopback-budget-raises`;
    const signOffPayload = (overrides: Record<string, unknown>): Record<string, unknown> => ({
      schema_version: 'TopicSelectionStakeholderSignOff@v1',
      sign_off_id: `sign_off_${suffix}`,
      sign_off_scope: 'provisional_threshold_run_override',
      gate_warning_code: 'N8_DEBATE_THRESHOLDS_PROVISIONAL',
      signed_by: { actor_type: 'human', actor_id: 'operator_http_e2e' },
      signed_at: '2026-07-04T12:00:00.000Z',
      rationale: 'HTTP e2e: acknowledged provisional thresholds.',
      workflow_run_id: runId,
      node_id: N8_ID,
      node_attempt_id: 'node_attempt_never_ran',
      ...overrides,
    });

    // (a) W-09 chain: an unknown key survives the permissive route schema and the service-level
    // STRICT validator rejects it — proving strictness lives (and fires) at the service layer.
    const unknownKey = await app.inject({ method: 'POST', url: signOffUrl, payload: signOffPayload({ smuggled: true }) });
    assert.equal(unknownKey.statusCode, 400);
    const unknownKeyBody = unknownKey.json() as { error: { code: string; message: string } };
    assert.equal(unknownKeyBody.error.code, 'INVALID_PAYLOAD');
    assert.match(unknownKeyBody.error.message, /TopicSelectionStakeholderSignOff@v1/);

    // (b) a non-gate (node_id, warning_code) pair is rejected before any run-state load.
    const wrongPair = await app.inject({
      method: 'POST',
      url: signOffUrl,
      payload: signOffPayload({ node_id: N6_ID, gate_warning_code: 'N8_DEBATE_THRESHOLDS_PROVISIONAL' }),
    });
    assert.equal(wrongPair.statusCode, 400);
    assert.match((wrongPair.json() as { error: { message: string } }).error.message, /not a provisional product gate/);

    // (c) payload/route run mismatch is a 400, not a cross-run write.
    const crossRun = await app.inject({
      method: 'POST',
      url: signOffUrl,
      payload: signOffPayload({ workflow_run_id: `${runId}_other` }),
    });
    assert.equal(crossRun.statusCode, 400);
    assert.match((crossRun.json() as { error: { message: string } }).error.message, /does not match the route run/);

    // (d) a well-formed sign-off against a run with NO tripwire attempt is a 409 (nothing to sign).
    const noTripwire = await app.inject({ method: 'POST', url: signOffUrl, payload: signOffPayload({}) });
    assert.equal(noTripwire.statusCode, 409);
    const noTripwireBody = noTripwire.json() as { error: { code: string; message: string } };
    assert.equal(noTripwireBody.error.code, 'GATE_CONSTRAINT_FAILED');
    assert.match(noTripwireBody.error.message, /no provisional-tripwire attempt/);

    // (e) budget raise: the strict schema's hard cap (raised_to <= 5) fires through HTTP.
    const raisePayload = (overrides: Record<string, unknown>): Record<string, unknown> => ({
      schema_version: 'TopicSelectionLoopbackBudgetRaise@v1',
      raise_id: `raise_${suffix}`,
      workflow_run_id: runId,
      node_id: N6_ID,
      raised_to: 4,
      rationale: 'HTTP e2e: operator raise.',
      raised_by: { actor_type: 'human', actor_id: 'operator_http_e2e' },
      raised_at: '2026-07-04T12:05:00.000Z',
      ...overrides,
    });
    const overCap = await app.inject({ method: 'POST', url: raiseUrl, payload: raisePayload({ raised_to: 6 }) });
    assert.equal(overCap.statusCode, 400);
    assert.match((overCap.json() as { error: { message: string } }).error.message, /TopicSelectionLoopbackBudgetRaise@v1/);

    // (f) a non-v1b node_id is rejected even though the payload is schema-shaped.
    const wrongNode = await app.inject({ method: 'POST', url: raiseUrl, payload: raisePayload({ node_id: 'not.a.v1b.node' }) });
    assert.equal(wrongNode.statusCode, 400);
    assert.match((wrongNode.json() as { error: { message: string } }).error.message, /is not a v1b node/);

    // (g) a valid raise records (201) and lands as a control-plane artifact on the run.
    const recorded = await app.inject({ method: 'POST', url: raiseUrl, payload: raisePayload({}) });
    assertStatus(recorded, 201);
    const recordedBody = recorded.json() as { artifact_ref_id: string };
    assert.ok(recordedBody.artifact_ref_id.length > 0);

    // (h) S3 read-back: the run's artifact list is readable and contains the recorded raise;
    // an unknown run id yields an empty list (list semantics, not 404).
    const artifactList = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1b/workflow-runs/${encodeURIComponent(runId)}/artifacts`,
    });
    assertStatus(artifactList, 200);
    const listed = (artifactList.json() as { items: Array<{ artifact_ref_id: string; payload: Record<string, unknown> | null }> }).items;
    assert.ok(listed.some((item) => item.artifact_ref_id === recordedBody.artifact_ref_id));
    assert.ok(listed.some((item) => item.payload?.schema_version === 'TopicSelectionLoopbackBudgetRaise@v1'));
    const emptyList = await app.inject({
      method: 'GET',
      url: `/topic-selection/v1b/workflow-runs/${encodeURIComponent(`${runId}_missing`)}/artifacts`,
    });
    assertStatus(emptyList, 200);
    assert.deepEqual((emptyList.json() as { items: unknown[] }).items, []);
  } finally {
    await app.close();
  }
});
