#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

import {
  T137_RESEARCH_INTENT,
  T137_SEMANTIC_PROFILE_ID,
} from '../../apps/backend/scripts/t137-scientific-dossier-canary-profile.ts';
import {
  buildApp,
  resolveTitleCardManagementStoreConfig,
} from '../../apps/backend/src/app.ts';
import { PrismaTopicSelectionControlPlaneRepository } from '../../apps/backend/src/repositories/prisma/prisma-topic-selection-control-plane-repository.ts';
import { PrismaTopicSelectionPromptPacketCacheStore } from '../../apps/backend/src/repositories/prisma/prisma-topic-selection-prompt-packet-cache-store.ts';
import { PrismaTopicSelectionNeedValidationRepository } from '../../apps/backend/src/repositories/prisma/prisma-topic-selection-need-validation-repository.ts';
import { PrismaTopicSelectionV1bIntakeRepository } from '../../apps/backend/src/repositories/prisma/prisma-topic-selection-v1b-intake-repository.ts';
import {
  sha256Text,
  stableStringify,
} from '../../apps/backend/src/services/literature-content-processing-utils.ts';
import { TopicSelectionEvidenceMapMaterializationService } from '../../apps/backend/src/services/topic-selection-evidence-map-materialization-service.ts';
import {
  TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID,
  TopicSelectionModelProfileRegistryService,
} from '../../apps/backend/src/services/topic-selection-model-profile-registry-service.ts';
import { TopicSelectionAgentOrchestratorService } from '../../apps/backend/src/services/topic-selection-agent-orchestrator-service.ts';
import { TopicSelectionControlPlaneService } from '../../apps/backend/src/services/topic-selection-control-plane-service.ts';
import { TopicSelectionPromptPacketCacheService } from '../../apps/backend/src/services/topic-selection-prompt-packet-cache-service.ts';
import { TopicSelectionV1bN4ResearchSliceRuntimeService } from '../../apps/backend/src/services/topic-selection-v1b-n4-research-slice-runtime-service.ts';
import { TopicSelectionV1bEarlySemanticSupportRuntimeService } from '../../apps/backend/src/services/topic-selection-v1b-early-semantic-support-runtime-service.ts';
import { TopicSelectionV1bN6DraftRuntimeService } from '../../apps/backend/src/services/topic-selection-v1b-n6-draft-runtime-service.ts';
import { TopicSelectionV1bN6LoopbackTriageRuntimeService } from '../../apps/backend/src/services/topic-selection-v1b-n6-loopback-triage-runtime-service.ts';
import { TopicSelectionV1bN7SupportRuntimeService } from '../../apps/backend/src/services/topic-selection-v1b-n7-support-runtime-service.ts';
import { TopicSelectionV1bN8ValueAssessmentRuntimeService } from '../../apps/backend/src/services/topic-selection-v1b-n8-value-assessment-runtime-service.ts';
import {
  TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_DRAFT_SCHEMA_VERSION,
} from '../../packages/shared/src/research-lifecycle/topic-selection-evidence-map-contracts.ts';
import {
  TOPIC_SELECTION_HUMAN_CONFIRMATION_INPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
} from '../../packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts';
import {
  TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_SCHEMA_VERSION,
  TOPIC_SELECTION_SEARCH_RUN_RECORD_BUNDLE_SCHEMA_VERSION,
} from '../../packages/shared/src/research-lifecycle/topic-selection-search-resource-contracts.ts';
import {
  TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
  TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
} from '../../packages/shared/src/research-lifecycle/topic-selection-v1a-workflow-harness-contracts.ts';
import {
  TOPIC_SELECTION_VALUE_DIMENSIONS,
  TOPIC_SELECTION_VALUE_GATE_KEYS,
} from '../../packages/shared/src/research-lifecycle/topic-selection-v1b-value-assessment-contracts.ts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
} from '../../packages/shared/src/research-lifecycle/topic-selection-v1b-workflow-harness-contracts.ts';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const RUN_ID = process.env.TOPIC_SELECTION_V1B_HARNESS_RUN_ID
  ?? process.env.TOPIC_SELECTION_REAL_RUN_ID
  ?? uniqueId('v1b-harness-e2e');
const EXISTING_V1B_INPUT_BUNDLE_ID = process.env.TOPIC_SELECTION_V1B_HARNESS_INPUT_BUNDLE_ID?.trim()
  || process.env.TOPIC_SELECTION_REAL_V1B_INPUT_BUNDLE_ID?.trim()
  || null;
const REPEAT_COUNT = positiveInt(process.env.TOPIC_SELECTION_V1B_HARNESS_REPEAT, 1);
const SEMANTIC_MODE = semanticMode(process.env.TOPIC_SELECTION_V1B_HARNESS_SEMANTIC_MODE);
const SCENARIO = scenarioMode(process.env.TOPIC_SELECTION_V1B_HARNESS_SCENARIO);
const EXTERNAL_CODEX_VARIANCE_COUNT = positiveInt(
  process.env.TOPIC_SELECTION_V1B_HARNESS_CODEX_VARIANCE_COUNT,
  3,
);
const EXTERNAL_CODEX_TIMEOUT_MS = positiveInt(
  process.env.TOPIC_SELECTION_V1B_HARNESS_CODEX_TIMEOUT_MS,
  240_000,
);
const BUNDLED_CODEX_BIN = '/Applications/Codex.app/Contents/Resources/codex';
const EXTERNAL_CODEX_BIN = process.env.TOPIC_SELECTION_V1B_HARNESS_CODEX_BIN?.trim()
  || process.env.CODEX_CLI_PATH?.trim()
  || (existsSync(BUNDLED_CODEX_BIN) ? BUNDLED_CODEX_BIN : 'codex');
const EXTERNAL_CODEX_MODEL = process.env.TOPIC_SELECTION_V1B_HARNESS_CODEX_MODEL?.trim() || null;
const EXTERNAL_CODEX_REASONING_EFFORT = process.env.TOPIC_SELECTION_V1B_HARNESS_CODEX_REASONING_EFFORT?.trim()
  || 'high';
const ARTIFACT_DIR = path.join(REPO_ROOT, '.ai/.tmp/topic-selection-v1b-harness-e2e', RUN_ID);

const REMOVED_LEGACY_WRITE_ROUTES = [
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
];
const N7_RUNTIME_SUPPORT_SLOT_IDS = new Set([
  'n7_candidate_grouping',
  'n7_failed_trial_synthesis',
  'n7_n8_debate_admission_review',
]);
const EARLY_RUNTIME_SUPPORT_SLOT_IDS = new Set([
  'n2_constraint_profile_semantic_support',
  'n3_readiness_classification',
  'n5_slice_selection_review',
]);
const N4_RUNTIME_DRAFT_SLOT_ID = 'n4_research_slice_option_draft';
const N6_RUNTIME_DRAFT_SLOT_ID = 'n6_question_candidate_draft';
const N6_LOOPBACK_TRIAGE_SLOT_ID = 'n6_loopback_triage';
const N8_RUNTIME_DRAFT_SLOT_ID = 'n8_value_assessment_draft';

function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function positiveInt(raw, fallback) {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function semanticMode(raw) {
  const value = String(raw ?? 'fixture').trim();
  if (value === 'fixture' || value === T137_SEMANTIC_PROFILE_ID) {
    return value;
  }
  throw new Error(
    `Unsupported TOPIC_SELECTION_V1B_HARNESS_SEMANTIC_MODE: ${value}. `
    + 'v1b harness provider mode is retired; use pnpm topic-selection:v1b-provider-canary.',
  );
}

function isT137SemanticMode() {
  return SEMANTIC_MODE === T137_SEMANTIC_PROFILE_ID;
}

function scenarioMode(raw) {
  const value = String(raw ?? 'positive').trim();
  if (
    value === 'positive'
    || value === 'early_semantic_runtime_smoke'
    || value === 'n4_runtime_smoke'
    || value === 'n6_runtime_smoke'
    || value === 'n7_runtime_smoke'
    || value === 'n8_runtime_smoke'
    || value === 'n6_loopback_runtime_smoke'
    || value === 'external_codex_n6_variance'
    || value === 'external_codex_n4_variance'
    || value === 'external_codex_n8_variance'
  ) {
    return value;
  }
  throw new Error(`Unsupported TOPIC_SELECTION_V1B_HARNESS_SCENARIO: ${value}`);
}

function ref(refType, refId, titleCardId, versionId = null) {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: versionId,
    title_card_id: titleCardId,
  };
}

function uniqueRefs(refs) {
  const seen = new Set();
  const result = [];
  for (const item of refs) {
    const key = [item.ref_type, item.ref_id, item.title_card_id ?? '', item.version_id ?? ''].join(':');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function v1bBundleRef(bundle) {
  return ref('v1a_to_v1b_input_bundle', bundle.v1b_input_bundle_id, bundle.title_card_id, bundle.bundle_version);
}

function v1aBundleSourceRefs(bundle) {
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

function frozenInputHash(payload) {
  return sha256Text(stableStringify({
    input_contract: payload.input_contract,
    payload: payload.payload,
    snapshot_kind: payload.snapshot_kind,
    source_refs: payload.source_refs,
  }));
}

function assertStatus(response, expected) {
  if (response.statusCode !== expected) {
    assert.fail(`Expected HTTP ${expected}, received ${response.statusCode}: ${response.body}`);
  }
}

function groupBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = row[key] ?? 'null';
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

async function promptPacketIndexSnapshot(prisma, since = null) {
  const rows = await prisma.topicSelectionPromptPacketCacheIndex.findMany({
    where: since ? { createdAt: { gte: since } } : undefined,
    select: {
      promptPacketHash: true,
      invocationSlotId: true,
      promptTemplateId: true,
      promptTemplateVersion: true,
      promptVariantKey: true,
      contextPolicyProfileId: true,
      outputContract: true,
      modelOptionId: true,
      qualityDecision: true,
      freshnessStatus: true,
      provenanceRef: true,
      redactedPromptArtifactRef: true,
      promptQualityReportRef: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  const earlyRows = rows.filter((row) => EARLY_RUNTIME_SUPPORT_SLOT_IDS.has(row.invocationSlotId));
  const n7Rows = rows.filter((row) => N7_RUNTIME_SUPPORT_SLOT_IDS.has(row.invocationSlotId));
  const n4Rows = rows.filter((row) => row.invocationSlotId === N4_RUNTIME_DRAFT_SLOT_ID);
  const n6Rows = rows.filter((row) => row.invocationSlotId === N6_RUNTIME_DRAFT_SLOT_ID);
  const n6LoopbackTriageRows = rows.filter((row) => row.invocationSlotId === N6_LOOPBACK_TRIAGE_SLOT_ID);
  const n8Rows = rows.filter((row) => row.invocationSlotId === N8_RUNTIME_DRAFT_SLOT_ID);
  return {
    total_count: rows.length,
    early_count: earlyRows.length,
    n4_count: n4Rows.length,
    n6_count: n6Rows.length,
    n6_loopback_triage_count: n6LoopbackTriageRows.length,
    n7_count: n7Rows.length,
    n8_count: n8Rows.length,
    by_invocation_slot_id: groupBy(rows, 'invocationSlotId'),
    by_quality_decision: groupBy(rows, 'qualityDecision'),
    by_freshness_status: groupBy(rows, 'freshnessStatus'),
    early_rows: earlyRows.map((row) => ({
      prompt_packet_hash: row.promptPacketHash,
      invocation_slot_id: row.invocationSlotId,
      prompt_template_id: row.promptTemplateId,
      prompt_template_version: row.promptTemplateVersion,
      prompt_variant_key: row.promptVariantKey,
      context_policy_profile_id: row.contextPolicyProfileId,
      output_contract: row.outputContract,
      model_option_id: row.modelOptionId,
      quality_decision: row.qualityDecision,
      freshness_status: row.freshnessStatus,
      has_provenance_ref: Boolean(row.provenanceRef),
      has_redacted_prompt_artifact_ref: Boolean(row.redactedPromptArtifactRef),
      has_prompt_quality_report_ref: Boolean(row.promptQualityReportRef),
      created_at: row.createdAt.toISOString(),
    })),
    n4_rows: n4Rows.map((row) => ({
      prompt_packet_hash: row.promptPacketHash,
      invocation_slot_id: row.invocationSlotId,
      prompt_template_id: row.promptTemplateId,
      prompt_template_version: row.promptTemplateVersion,
      prompt_variant_key: row.promptVariantKey,
      context_policy_profile_id: row.contextPolicyProfileId,
      output_contract: row.outputContract,
      model_option_id: row.modelOptionId,
      quality_decision: row.qualityDecision,
      freshness_status: row.freshnessStatus,
      has_provenance_ref: Boolean(row.provenanceRef),
      has_redacted_prompt_artifact_ref: Boolean(row.redactedPromptArtifactRef),
      has_prompt_quality_report_ref: Boolean(row.promptQualityReportRef),
      created_at: row.createdAt.toISOString(),
    })),
    n6_rows: n6Rows.map((row) => ({
      prompt_packet_hash: row.promptPacketHash,
      invocation_slot_id: row.invocationSlotId,
      prompt_template_id: row.promptTemplateId,
      prompt_template_version: row.promptTemplateVersion,
      prompt_variant_key: row.promptVariantKey,
      context_policy_profile_id: row.contextPolicyProfileId,
      output_contract: row.outputContract,
      model_option_id: row.modelOptionId,
      quality_decision: row.qualityDecision,
      freshness_status: row.freshnessStatus,
      has_provenance_ref: Boolean(row.provenanceRef),
      has_redacted_prompt_artifact_ref: Boolean(row.redactedPromptArtifactRef),
      has_prompt_quality_report_ref: Boolean(row.promptQualityReportRef),
      created_at: row.createdAt.toISOString(),
    })),
    n6_loopback_triage_rows: n6LoopbackTriageRows.map((row) => ({
      prompt_packet_hash: row.promptPacketHash,
      invocation_slot_id: row.invocationSlotId,
      prompt_template_id: row.promptTemplateId,
      prompt_template_version: row.promptTemplateVersion,
      prompt_variant_key: row.promptVariantKey,
      context_policy_profile_id: row.contextPolicyProfileId,
      output_contract: row.outputContract,
      model_option_id: row.modelOptionId,
      quality_decision: row.qualityDecision,
      freshness_status: row.freshnessStatus,
      has_provenance_ref: Boolean(row.provenanceRef),
      has_redacted_prompt_artifact_ref: Boolean(row.redactedPromptArtifactRef),
      has_prompt_quality_report_ref: Boolean(row.promptQualityReportRef),
      created_at: row.createdAt.toISOString(),
    })),
    n8_rows: n8Rows.map((row) => ({
      prompt_packet_hash: row.promptPacketHash,
      invocation_slot_id: row.invocationSlotId,
      prompt_template_id: row.promptTemplateId,
      prompt_template_version: row.promptTemplateVersion,
      prompt_variant_key: row.promptVariantKey,
      context_policy_profile_id: row.contextPolicyProfileId,
      output_contract: row.outputContract,
      model_option_id: row.modelOptionId,
      quality_decision: row.qualityDecision,
      freshness_status: row.freshnessStatus,
      has_provenance_ref: Boolean(row.provenanceRef),
      has_redacted_prompt_artifact_ref: Boolean(row.redactedPromptArtifactRef),
      has_prompt_quality_report_ref: Boolean(row.promptQualityReportRef),
      created_at: row.createdAt.toISOString(),
    })),
    n7_rows: n7Rows.map((row) => ({
      prompt_packet_hash: row.promptPacketHash,
      invocation_slot_id: row.invocationSlotId,
      prompt_template_id: row.promptTemplateId,
      prompt_template_version: row.promptTemplateVersion,
      prompt_variant_key: row.promptVariantKey,
      context_policy_profile_id: row.contextPolicyProfileId,
      output_contract: row.outputContract,
      model_option_id: row.modelOptionId,
      quality_decision: row.qualityDecision,
      freshness_status: row.freshnessStatus,
      has_provenance_ref: Boolean(row.provenanceRef),
      has_redacted_prompt_artifact_ref: Boolean(row.redactedPromptArtifactRef),
      has_prompt_quality_report_ref: Boolean(row.promptQualityReportRef),
      created_at: row.createdAt.toISOString(),
    })),
  };
}

function assertPromptPacketIndexModelMetadataOnly(prisma) {
  const fields = prisma._runtimeDataModel?.models?.TopicSelectionPromptPacketCacheIndex?.fields
    ?.map((field) => field.name);
  assert.ok(Array.isArray(fields), 'Expected Prisma runtime model metadata for TopicSelectionPromptPacketCacheIndex.');
  assert.ok(fields.includes('promptPacketHash'), 'Prompt packet index model metadata is incomplete.');
  for (const forbiddenField of [
    'messages',
    'promptPayload',
    'providerResponse',
    'providerResponsePayload',
    'providerTelemetry',
    'providerTelemetryPayload',
    'rawProviderLogs',
    'authorityPayload',
    'secret',
  ]) {
    assert.equal(
      fields.includes(forbiddenField),
      false,
      `Prompt packet index must not persist ${forbiddenField}.`,
    );
  }
}

async function invokeV1bHarnessNode(app, input) {
  const response = await app.inject({
    method: 'POST',
    url: `/topic-selection/v1b/workflow-harness/nodes/${encodeURIComponent(input.node_id)}/invocations`,
    payload: input,
  });
  assertStatus(response, 201);
  assert.equal(response.headers.deprecation, undefined);
  return response.json();
}

async function getWorkflowHarnessArtifact(app, artifactRef) {
  const response = await app.inject({
    method: 'GET',
    url: `/topic-selection/v1b/workflow-harness/artifacts/${encodeURIComponent(artifactRef.ref_id)}`,
  });
  assertStatus(response, 200);
  return response.json();
}

async function getWorkflowHarnessHandoff(app, artifactRef) {
  assert.ok(artifactRef, 'Expected workflow harness handoff artifact ref.');
  const artifact = await getWorkflowHarnessArtifact(app, artifactRef);
  return artifact.payload;
}

async function getWorkflowHarnessTraceSnapshotPayload(traceSnapshotRef) {
  assert.ok(traceSnapshotRef, 'Expected workflow harness trace snapshot ref.');
  const prisma = new PrismaClient();
  try {
    const snapshot = await prisma.topicSelectionTraceSnapshot.findUnique({
      where: { id: traceSnapshotRef.ref_id },
    });
    assert.ok(snapshot, `Trace snapshot not found: ${traceSnapshotRef.ref_id}`);
    return snapshot.payload;
  } finally {
    await prisma.$disconnect();
  }
}

async function recordWorkflowHarnessArtifact(app, input, payload, artifactKind = 'structured_output') {
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
  return response.json();
}

async function recordWorkflowHarnessSemanticArtifact(app, input, slot, payload, options = {}) {
  const support = await recordWorkflowHarnessArtifact(app, input, payload);
  const normalized = await recordWorkflowHarnessArtifact(app, input, payload);
  const provenance = await recordWorkflowHarnessArtifact(app, input, {
    adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
    source: 'v1b_harness_e2e_runner',
    run_id: RUN_ID,
    semantic_mode: options.executionMode ?? 'codex_assisted',
    provider_id: options.providerId ?? null,
    model_id: options.modelId ?? null,
    registry_model_id: options.registryModelId ?? null,
    model_option_id: options.modelOptionId ?? null,
    profile_id: options.profileId ?? slot.profile_id,
    telemetry: null,
    normalization_repairs: options.normalizationRepairs ?? [],
    external_codex_session: options.externalCodexSession ?? null,
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
    execution_mode: options.executionMode ?? 'codex_assisted',
    profile_id: options.profileId ?? slot.profile_id,
    model_option_id: options.modelOptionId ?? null,
    input_hash: input.frozen_input.frozen_input_hash,
    support_artifact_ref: ref('artifact_ref', support.artifact_ref_id, input.title_card_id ?? support.title_card_id),
    support_artifact_hash: support.checksum,
    normalized_output_ref: ref('artifact_ref', normalized.artifact_ref_id, input.title_card_id ?? normalized.title_card_id),
    normalized_output_hash: normalized.checksum,
    prompt_packet_hash: options.promptPacketHash ?? 'c'.repeat(64),
    structured_output_hash: normalized.checksum,
    adapter_policy_version: 'topic-selection-v1b-node-policy-v1',
    slot_spec_hash: 'e'.repeat(64),
    provenance_ref: ref('artifact_ref', provenance.artifact_ref_id, input.title_card_id ?? provenance.title_card_id),
    runtime_provenance_class: options.runtimeProvenanceClass ?? 'fixture_replay',
    context_policy_profile_id: options.contextPolicyProfileId ?? null,
    context_policy_profile_version: options.contextPolicyProfileVersion ?? null,
    context_policy_profile_hash: options.contextPolicyProfileHash ?? null,
    prompt_variant_key: options.promptVariantKey ?? null,
    runtime_invocation_context_hash: options.runtimeInvocationContextHash ?? null,
    redaction_policy: options.redactionPolicy ?? null,
    source_hashes: options.sourceHashes ?? {},
    runtime_audit_ref: options.runtimeAuditRef ?? null,
    runtime_audit_hash: options.runtimeAuditHash ?? null,
    compression_report_ref: options.compressionReportRef ?? null,
    compression_report_hash: options.compressionReportHash ?? null,
    compressed_context_hash: options.compressedContextHash ?? null,
  };
}

function v1bHarnessN1Request(bundle, suffix) {
  const payload = {
    v1b_input_bundle_id: bundle.v1b_input_bundle_id,
    v1a_bundle_ref: v1bBundleRef(bundle),
    v1a_bundle_hash: sha256Text(stableStringify(bundle)),
    source_refs_hash: sha256Text(stableStringify(v1aBundleSourceRefs(bundle))),
  };
  const frozenInput = {
    input_contract: 'V1aToV1bInputBundleFrozenRef@v1',
    snapshot_kind: 'v1a_valid_need_bundle',
    source_refs: [ref('v1a_valid_need_bundle', bundle.v1b_input_bundle_id, bundle.title_card_id, bundle.bundle_version)],
    payload,
  };
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    title_card_id: bundle.title_card_id,
    workflow_run_id: `workflow_run_v1b_harness_e2e_${suffix}`,
    node_attempt_id: `node_attempt_v1b_harness_e2e_n1_${suffix}`,
    node_id: 'topic-selection.v1b.create-intake-snapshot.v1',
    policy_version: 'topic-selection-v1b-node-policy-v1',
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
    created_by: 'system',
  };
}

function acceptedConstraintProfilePayload() {
  if (isT137SemanticMode()) {
    return {
      target_community: 'information retrieval and RAG evaluation researchers',
      target_venue_class: 'systems',
      intended_contribution_style: 'bounded_empirical_finding',
      method_constraints: [
        'SciFact exact-token retrieval only',
        'compare retrieval_top_k=10 with retrieval_top_k=5',
        'use server-owned micro_recall_ppm',
        'hold every non-top-k input fixed',
      ],
      resource_constraints: ['reuse the admitted SciFact execution bundle', 'one two-cell run'],
      available_assets: ['four-source literature lane', 'SciFact corpus and qrels', 'exact-token evaluator'],
      feasibility_budget: { experiment_cells: 2 },
      non_goals: T137_RESEARCH_INTENT.prohibited_claims.map((claim) => `Do not claim ${claim}`),
      claim_ceiling: T137_RESEARCH_INTENT.claim_ceiling,
      human_constraint_notes: null,
      constraint_payload: {
        semantic_profile_id: T137_SEMANTIC_PROFILE_ID,
        research_intent: T137_RESEARCH_INTENT,
      },
    };
  }
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
    constraint_payload: { source: 'codex_assisted_harness_e2e' },
  };
}

function v1bHarnessN2Request(bundle, n1Result, suffix, acceptedPayload) {
  assert.ok(n1Result.authority_ref, 'N2 requires N1 authority_ref.');
  assert.ok(n1Result.hashes.authority_hash, 'N2 requires N1 authority_hash.');
  const acceptedHash = sha256Text(stableStringify(acceptedPayload));
  const payload = {
    accepted_constraint_profile_payload: acceptedPayload,
    accepted_constraint_profile_payload_hash: acceptedHash,
    authority_input_provider: 'codex_delegated',
    delegation_artifact_hash: acceptedHash,
    intake_snapshot_hash: n1Result.hashes.authority_hash,
    intake_snapshot_ref: n1Result.authority_ref,
    previous_profile_hash: null,
    previous_profile_ref: null,
    v1a_bundle_hash: sha256Text(stableStringify(bundle)),
    v1a_bundle_ref: v1bBundleRef(bundle),
  };
  const frozenInput = {
    input_contract: 'N1ToN2Handoff@v1',
    snapshot_kind: 'v1b_intake_snapshot',
    source_refs: [n1Result.authority_ref],
    payload,
  };
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    title_card_id: bundle.title_card_id,
    workflow_run_id: `workflow_run_v1b_harness_e2e_${suffix}`,
    node_attempt_id: `node_attempt_v1b_harness_e2e_n2_${suffix}`,
    node_id: 'topic-selection.v1b.record-research-constraint-profile.v1',
    policy_version: 'topic-selection-v1b-node-policy-v1',
    run_mode: 'acceptance',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.constraint_profile_support,
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
    created_by: 'system',
  };
}

function v1bHarnessN3Request(n1Result, n2Result, suffix) {
  assert.ok(n1Result.authority_ref && n1Result.hashes.authority_hash);
  assert.ok(n2Result.authority_ref && n2Result.hashes.authority_hash);
  const payload = {
    intake_snapshot_ref: n1Result.authority_ref,
    intake_snapshot_hash: n1Result.hashes.authority_hash,
    constraint_profile_ref: n2Result.authority_ref,
    constraint_profile_hash: n2Result.hashes.authority_hash,
    n2_handoff_hash: n2Result.hashes.handoff_hash ?? 'f'.repeat(64),
  };
  const frozenInput = {
    input_contract: 'N2ToN3Handoff@v1',
    snapshot_kind: 'research_constraint_profile',
    source_refs: [n2Result.authority_ref],
    payload,
  };
  return harnessRequest(
    n1Result.authority_ref.title_card_id,
    suffix,
    'n3',
    'topic-selection.v1b.assess-intake-readiness.v1',
    frozenInput,
  );
}

function v1bHarnessN3ReadinessClassificationSupport(input) {
  return {
    schema_version: 'IntakeReadinessClassificationSupport@v1',
    readiness_recommendation: 'ready',
    blocker_codes: [],
    warning_codes: [],
    loopback_target_code: null,
    cited_refs: input.frozen_input.source_refs,
    rationale: isT137SemanticMode()
      ? 'The frozen literature-backed intent has one executable SciFact comparison, one metric owner, and an explicit claim ceiling.'
      : 'Frozen N1/N2 lineage is sufficient for deterministic readiness assessment in the harness smoke.',
    no_authority_write_confirmed: true,
  };
}

function v1bHarnessN4Request(n1Result, n2Result, n3Result, suffix) {
  assert.ok(n1Result.authority_ref && n1Result.hashes.authority_hash);
  assert.ok(n2Result.authority_ref && n2Result.hashes.authority_hash && n2Result.hashes.handoff_hash);
  assert.ok(n3Result.authority_ref && n3Result.hashes.authority_hash && n3Result.hashes.handoff_hash);
  const payload = {
    intake_snapshot_ref: n1Result.authority_ref,
    intake_snapshot_hash: n1Result.hashes.authority_hash,
    constraint_profile_ref: n2Result.authority_ref,
    constraint_profile_hash: n2Result.hashes.authority_hash,
    intake_readiness_ref: n3Result.authority_ref,
    intake_readiness_hash: n3Result.hashes.authority_hash,
    n2_handoff_hash: n2Result.hashes.handoff_hash,
    n3_handoff_hash: n3Result.hashes.handoff_hash,
  };
  const frozenInput = {
    input_contract: 'N3ToN4Handoff@v1',
    snapshot_kind: 'v1b_intake_readiness_assessment',
    source_refs: [n3Result.authority_ref, n2Result.authority_ref, n1Result.authority_ref],
    payload,
  };
  return harnessRequest(
    n1Result.authority_ref.title_card_id,
    suffix,
    'n4',
    'topic-selection.v1b.generate-research-slice-options.v1',
    frozenInput,
  );
}

function harnessRequest(titleCardId, suffix, nodeAttemptSuffix, nodeId, frozenInput) {
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    title_card_id: titleCardId,
    workflow_run_id: `workflow_run_v1b_harness_e2e_${suffix}`,
    node_attempt_id: `node_attempt_v1b_harness_e2e_${nodeAttemptSuffix}_${suffix}`,
    node_id: nodeId,
    policy_version: 'topic-selection-v1b-node-policy-v1',
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
    created_by: 'system',
  };
}

function v1bHarnessN4Draft(bundle) {
  const evidenceRef = bundle.evidence_role_bundle.support_unit_refs[0] ?? bundle.evidence_map_ref;
  if (isT137SemanticMode()) {
    return {
      recommended_option_key: 'scifact_retrieval_depth_slice',
      comparison_axes: ['positive-judgment micro recall', 'retrieval depth'],
      comparison_summary: 'Compare top-k 10 with top-k 5 while every non-top-k SciFact input remains fixed.',
      missing_option_types: [],
      unresolved_disagreements: [],
      human_review_triggers: [],
      options: [{
        option_key: 'scifact_retrieval_depth_slice',
        source_validated_need_refs: [bundle.validated_need_ref],
        slice_statement: T137_RESEARCH_INTENT.goal,
        problem_space: 'Retrieval-depth sensitivity in a fixed SciFact exact-token evaluation.',
        target_setting: 'SciFact positive-judgment retrieval evaluation.',
        target_community: 'information retrieval and RAG evaluation researchers',
        included_boundaries: [...T137_RESEARCH_INTENT.fixed_inputs, 'top-k 10 versus top-k 5'],
        excluded_boundaries: T137_RESEARCH_INTENT.prohibited_claims.map((claim) => `Do not claim ${claim}`),
        contribution_type_candidate: 'bounded_empirical_finding',
        support_evidence_refs: bundle.evidence_role_bundle.support_unit_refs,
        challenge_evidence_refs: bundle.evidence_role_bundle.challenge_unit_refs,
        baseline_evidence_refs: bundle.evidence_role_bundle.baseline_unit_refs,
        context_evidence_refs: bundle.evidence_role_bundle.context_unit_refs,
        resource_assumptions: ['The admitted SciFact execution bundle remains active and exact-ready.'],
        data_assumptions: ['Corpus, queries, qrels, parser, and evaluator remain fixed across both cells.'],
        evaluation_path: T137_RESEARCH_INTENT.question,
        baseline_assumptions: [T137_RESEARCH_INTENT.baseline],
        hard_blockers: [],
        dependency_risks: ['A changed SciFact asset revision requires a fresh readiness check.'],
        slice_budget: { experiment_cells: 2 },
        expected_claim: T137_RESEARCH_INTENT.claim_ceiling,
        fallback_claim: 'The fixed comparison is inconclusive at the +/-10,000 ppm boundary.',
        observable_success_criteria: [
          'Both cells publish server-owned micro_recall_ppm.',
          'The difference is classified with the fixed +/-10,000 ppm rule.',
        ],
        main_risks: ['The bounded SciFact result may not generalize to other corpora or retrievers.'],
        baseline_risk: 'low',
        execution_risk: 'low',
        scope_risk: 'low',
        claim_ceiling_alignment: {
          status: 'aligned',
          rationale: 'The claim is limited to the fixed SciFact exact-token comparison.',
          confidence: 0.92,
        },
        confidence: 0.9,
        requires_human_review: false,
        human_review_triggers: [],
        details_payload: { semantic_profile_id: T137_SEMANTIC_PROFILE_ID },
      }],
    };
  }
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

function hashV1bHarnessOption(option) {
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

async function selectedV1bHarnessOption(app, n4Result) {
  const options = await listV1bHarnessOptions(app, n4Result);
  const selected = options.find((option) => option.status === 'recommended') ?? options[0];
  assert.ok(selected, 'N5 requires at least one N4 option.');
  return selected;
}

async function listV1bHarnessOptions(app, n4Result) {
  assert.ok(n4Result.authority_ref, 'N5 requires admitted N4 authority.');
  const response = await app.inject({
    method: 'GET',
    url: `/topic-selection/v1b/research-slice-option-sets/${encodeURIComponent(n4Result.authority_ref.ref_id)}/options`,
  });
  assertStatus(response, 200);
  return response.json().items;
}

async function listV1bHarnessCandidates(app, n6Result) {
  assert.ok(n6Result.authority_ref, 'N7 quality checks require admitted N6 authority.');
  const response = await app.inject({
    method: 'GET',
    url: `/topic-selection/v1b/topic-question-candidate-sets/${encodeURIComponent(n6Result.authority_ref.ref_id)}/candidates`,
  });
  assertStatus(response, 200);
  return response.json().items;
}

async function listV1bHarnessValueAssessments(app, titleCardId) {
  const response = await app.inject({
    method: 'GET',
    url: `/topic-selection/v1b/title-cards/${encodeURIComponent(titleCardId)}/topic-value-assessments`,
  });
  assertStatus(response, 200);
  return response.json().items;
}

function assertNonEmptyText(value, label) {
  assert.equal(typeof value, 'string', `${label} must be a string.`);
  assert.ok(value.trim().length > 0, `${label} must be non-empty.`);
}

function assertV1bOutputQuality({ selectedOption, candidates, valueAssessments }) {
  assertNonEmptyText(selectedOption.slice_statement, 'Selected ResearchSlice slice_statement');
  assertNonEmptyText(selectedOption.expected_claim, 'Selected ResearchSlice expected_claim');
  assert.ok(selectedOption.support_evidence_refs.length > 0, 'Selected ResearchSlice must cite support evidence.');
  assert.ok(selectedOption.excluded_boundaries.length > 0, 'Selected ResearchSlice must preserve excluded boundaries.');
  assert.ok(selectedOption.hard_blockers.length === 0, 'Selected ResearchSlice must not carry hard blockers.');

  assert.ok(candidates.length > 0, 'N6 must persist at least one TopicQuestionCandidate.');
  const admitted = candidates.find((candidate) => ['admitted', 'recommended'].includes(candidate.status)) ?? candidates[0];
  assertNonEmptyText(admitted.main_question, 'Admitted TopicQuestionCandidate main_question');
  assert.ok(admitted.main_question.trim().endsWith('?'), 'Admitted TopicQuestionCandidate main_question must be phrased as a question.');
  assert.ok(
    ['answerable', 'answerable_with_risk'].includes(admitted.answerability_verdict),
    `Admitted TopicQuestionCandidate answerability_verdict is ${admitted.answerability_verdict}.`,
  );
  assert.ok(
    admitted.traceability_check_payload.support_evidence_refs.length > 0,
    'Admitted TopicQuestionCandidate must retain support evidence refs.',
  );
  assert.ok(
    admitted.falsification_conditions_payload.length > 0,
    'Admitted TopicQuestionCandidate must include falsification conditions.',
  );

  assert.ok(valueAssessments.length > 0, 'N8 must persist at least one TopicValueAssessment.');
  const assessment = valueAssessments[0];
  assert.ok(
    ['ready', 'ready_with_accepted_risk'].includes(assessment.readiness_status),
    `TopicValueAssessment readiness_status is ${assessment.readiness_status}.`,
  );
  assert.ok(assessment.total_score >= 70, `TopicValueAssessment total_score is ${assessment.total_score}.`);
  assert.equal(assessment.hard_gates.length, TOPIC_SELECTION_VALUE_GATE_KEYS.length);
  assert.equal(assessment.dimension_scores.length, TOPIC_SELECTION_VALUE_DIMENSIONS.length);
  assert.ok(
    assessment.hard_gates.every((gate) => gate.verdict === 'pass' || gate.verdict === 'pass_with_risk'),
    'TopicValueAssessment hard gates must pass or pass_with_risk.',
  );
}

function acceptedV1bHarnessSliceSelectionPayload(option) {
  return {
    decision: 'select',
    selected_option_ref: ref('research_slice_option', option.research_slice_option_id, option.title_card_id),
    selected_option_hash: hashV1bHarnessOption(option),
    selection_rationale: isT137SemanticMode()
      ? 'Select the only slice that preserves the exact SciFact comparison and bounded claim ceiling.'
      : 'Select the traceable workflow slice with the strongest bounded fit.',
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

function v1bHarnessN5Request(n4Result, acceptedPayload, suffix, options = {}) {
  assert.ok(n4Result.authority_ref && n4Result.hashes.authority_hash && n4Result.hashes.handoff_hash);
  const acceptedHash = sha256Text(stableStringify(acceptedPayload));
  const authorityInputProvider = options.authorityInputProvider ?? 'fixture';
  assert.ok(
    ['fixture', 'codex_delegated', 'human_delegated'].includes(authorityInputProvider),
    `Unsupported N5 authority_input_provider: ${authorityInputProvider}`,
  );
  const payload = {
    research_slice_option_set_ref: n4Result.authority_ref,
    research_slice_option_set_hash: n4Result.hashes.authority_hash,
    n4_handoff_hash: n4Result.hashes.handoff_hash,
    authority_input_provider: authorityInputProvider,
    accepted_selection_payload: acceptedPayload,
    accepted_selection_payload_hash: acceptedHash,
    delegation_artifact_hash: authorityInputProvider === 'codex_delegated' ? acceptedHash : null,
  };
  const frozenInput = {
    input_contract: 'N4ToN5Handoff@v1',
    snapshot_kind: 'research_slice_option_set',
    source_refs: [n4Result.authority_ref],
    payload,
  };
  return harnessRequest(
    n4Result.authority_ref.title_card_id,
    suffix,
    'n5',
    'topic-selection.v1b.select-research-slice.v1',
    frozenInput,
  );
}

async function v1bHarnessRequestFromHandoff(
  app,
  result,
  suffix,
  expectedHandoffKind,
  nodeId,
  nodeAttemptSuffix,
  inputContract,
  snapshotKind,
  payloadPatch,
  extraSourceRefs = [],
) {
  assert.ok(result.authority_ref && result.handoff_ref && result.hashes.handoff_hash);
  const handoff = await getWorkflowHarnessHandoff(app, result.handoff_ref);
  assert.equal(handoff.envelope.handoff_kind, expectedHandoffKind);
  const payload = {
    ...handoff.payload,
    ...payloadPatch,
  };
  const frozenInput = {
    input_contract: inputContract,
    snapshot_kind: snapshotKind,
    source_refs: uniqueRefs([result.authority_ref, result.handoff_ref, ...extraSourceRefs, ...handoff.required_refs]),
    payload,
  };
  return harnessRequest(result.authority_ref.title_card_id, suffix, nodeAttemptSuffix, nodeId, frozenInput);
}

async function v1bHarnessN6Request(app, n5Result, suffix) {
  assert.ok(n5Result.authority_ref && n5Result.handoff_ref && n5Result.hashes.handoff_hash);
  const handoff = await getWorkflowHarnessHandoff(app, n5Result.handoff_ref);
  assert.equal(handoff.envelope.handoff_kind, 'N5ToN6Handoff');
  const payload = {
    ...handoff.payload,
    n5_handoff_hash: n5Result.hashes.handoff_hash,
  };
  const selectionSnapshotRef = ref(
    'research_slice_selection_decision',
    n5Result.authority_ref.ref_id,
    n5Result.authority_ref.title_card_id,
    n5Result.authority_ref.version_id ?? null,
  );
  const frozenInput = {
    input_contract: 'N5ToN6Handoff@v1',
    snapshot_kind: 'research_slice_selection_decision',
    source_refs: [selectionSnapshotRef, n5Result.handoff_ref, ...handoff.required_refs],
    payload,
  };
  return harnessRequest(
    n5Result.authority_ref.title_card_id,
    suffix,
    'n6',
    'topic-selection.v1b.generate-topic-question-candidates.v1',
    frozenInput,
  );
}

function v1bHarnessN6Draft(bundle, input) {
  const payload = input.frozen_input.payload;
  const evidenceRef = bundle.evidence_role_bundle.support_unit_refs[0] ?? bundle.evidence_map_ref;
  if (isT137SemanticMode()) {
    const roleBundle = bundle.evidence_role_bundle;
    const mappedEvidenceRefs = [
      ...roleBundle.support_unit_refs,
      ...roleBundle.challenge_unit_refs,
      ...roleBundle.baseline_unit_refs,
      ...roleBundle.context_unit_refs,
    ];
    return {
      question_frame: {
        target_setting: 'SciFact positive-judgment exact-token retrieval evaluation.',
        target_community: 'information retrieval and RAG evaluation researchers',
        object_scope: 'retrieval depth from top-k 5 to top-k 10',
        task_scope: 'two-cell controlled comparison',
        intervention_or_approach: T137_RESEARCH_INTENT.intervention,
        comparison_baseline: T137_RESEARCH_INTENT.baseline,
        observable_outcome: T137_RESEARCH_INTENT.metric_key,
        assumption_refs: [],
        evidence_refs: mappedEvidenceRefs,
        frame_payload: { semantic_profile_id: T137_SEMANTIC_PROFILE_ID },
      },
      recommended_candidate_keys: ['scifact_top_k_10_vs_5'],
      generation_notes: ['Every scientific input except retrieval_top_k remains fixed.'],
      human_review_triggers: [],
      candidates: [{
        candidate_key: 'scifact_top_k_10_vs_5',
        main_question: T137_RESEARCH_INTENT.question,
        sub_questions: ['Does the observed difference cross either fixed +/-10,000 ppm decision boundary?'],
        question_type: 'benchmark',
        contribution_hypothesis: 'benchmark',
        source_validated_need_refs: [bundle.validated_need_ref],
        answerability_plan: {
          datasets_or_resources: ['admitted SciFact corpus, queries, and positive qrels'],
          metrics: [T137_RESEARCH_INTENT.metric_key],
          baselines: [T137_RESEARCH_INTENT.baseline],
          ablations_or_comparisons: [T137_RESEARCH_INTENT.intervention],
          evaluation_setting: 'same exact-token retriever, evaluator, seed, and runtime for both cells',
          dependency_risks: ['A changed asset revision invalidates exact readiness.'],
          open_dependencies: [],
          known_gaps: [],
          required_evidence_refs: mappedEvidenceRefs,
        },
        answerability_verdict: 'answerable',
        expected_claim: T137_RESEARCH_INTENT.claim_ceiling,
        fallback_claim: 'The fixed comparison is inconclusive at the +/-10,000 ppm boundary.',
        max_claim_strength: T137_RESEARCH_INTENT.claim_ceiling,
        observable_success_criteria: [
          'Compute micro_recall_ppm(top-k 10) - micro_recall_ppm(top-k 5).',
          'Classify support, contradiction, or inconclusive with the fixed thresholds.',
        ],
        boundary_check: {
          preserved_boundary_refs: [],
          excluded_boundary_refs: [],
          boundary_violations: [],
          prohibited_claims: [...T137_RESEARCH_INTENT.prohibited_claims],
          allowed_refinements: ['narrow the claim after observing the fixed metric difference'],
        },
        traceability_check: {
          support_evidence_refs: roleBundle.support_unit_refs,
          challenge_evidence_refs: roleBundle.challenge_unit_refs,
          baseline_evidence_refs: roleBundle.baseline_unit_refs,
          context_evidence_refs: roleBundle.context_unit_refs,
          mapped_evidence_refs: mappedEvidenceRefs,
          unmapped_assumptions: [],
        },
        falsification_conditions: [{
          condition_type: 'contradicted_by_evidence',
          severity: 'hard',
          statement: 'The bounded support claim is falsified when top-k 10 minus top-k 5 is at most -10,000 ppm.',
          trigger_evidence_refs: mappedEvidenceRefs,
          trigger_source_refs: [payload.research_slice_ref],
          related_contract_fields: ['expected_claim'],
          expected_action: 'lower_claim_strength',
          check_timing: 'on_new_evidence',
          confidence: 'high',
        }],
        risk_notes: ['Do not generalize beyond the fixed SciFact exact-token setup.'],
        blockers: [],
        objections: [],
        human_review_triggers: [],
        confidence: 0.9,
      }],
    };
  }
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

function v1bHarnessN6NegativeDraft(bundle, input) {
  const draft = v1bHarnessN6Draft(bundle, input);
  return {
    ...draft,
    recommended_candidate_keys: ['deterministic_negative_unanswerable'],
    generation_notes: ['Deterministic negative fixture: the draft is structurally valid but intentionally not answerable.'],
    candidates: [{
      ...draft.candidates[0],
      candidate_key: 'deterministic_negative_unanswerable',
      main_question: 'How can AI improve research?',
      sub_questions: ['Which unspecified AI system and research setting should be evaluated?'],
      answerability_verdict: 'not_answerable',
      expected_claim: 'This intentionally broad candidate should not be admitted as a bounded v1b TopicQuestion.',
      fallback_claim: 'The harness should loop back rather than materialize an unanswerable candidate.',
      max_claim_strength: 'No admissible claim; this is a negative loopback canary.',
      observable_success_criteria: ['N6 blocks the deterministic negative candidate and emits a loopback result.'],
      risk_notes: ['Deterministic negative fixture intentionally violates the N6 answerability quality bar.'],
      blockers: [],
      objections: ['The question is too broad to evaluate with the frozen ResearchSlice evidence.'],
      confidence: 0.42,
    }],
  };
}

function v1bHarnessN6TwoCandidateDraft(bundle, input) {
  const draft = v1bHarnessN6Draft(bundle, input);
  const second = {
    ...draft.candidates[0],
    candidate_key: 'deterministic_negative_second_trial_candidate',
    main_question: 'How can a second candidate preserve evidence-to-need traceability after a failed value trial?',
    expected_claim: 'A second candidate can preserve traceability after a failed value trial.',
    fallback_claim: 'The second trial still exposes whether N7 can schedule another candidate.',
    observable_success_criteria: ['N7 selects the second candidate after frozen N8 feedback.'],
  };
  return {
    ...draft,
    recommended_candidate_keys: ['harness_candidate', 'deterministic_negative_second_trial_candidate'],
    generation_notes: ['Two-candidate fixture used to test deterministic N8 negative trial exhaustion.'],
    candidates: [draft.candidates[0], second],
  };
}

async function v1bHarnessN7Request(app, n6Result, suffix) {
  return v1bHarnessRequestFromHandoff(
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

async function v1bHarnessN8Request(app, n7Result, suffix) {
  const projectionRef = await n7ToN8ProjectionRef(n7Result);
  return v1bHarnessRequestFromHandoff(
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

async function n7ToN8ProjectionRef(n7Result) {
  const trace = await getWorkflowHarnessTraceSnapshotPayload(n7Result.trace_snapshot_ref);
  const projectionRef = trace.runtime_context_projection_ref;
  assert.equal(projectionRef?.ref_type, 'artifact_ref');
  return projectionRef;
}

function n6InputWithRuntimeProjection(input, projectionRef) {
  const frozenInput = {
    ...input.frozen_input,
    source_refs: uniqueRefs([...input.frozen_input.source_refs, projectionRef]),
  };
  return {
    ...input,
    frozen_input: {
      ...frozenInput,
      frozen_input_hash: frozenInputHash(frozenInput),
    },
  };
}

function v1bHarnessN8ValueDraft(input) {
  const payload = input.frozen_input.payload;
  const evidenceRef = payload.topic_question_contract_ref;
  if (isT137SemanticMode()) {
    return {
      readiness_status: 'ready',
      strongest_claim_if_success: T137_RESEARCH_INTENT.claim_ceiling,
      fallback_claim_if_success: 'The fixed comparison is inconclusive at the +/-10,000 ppm boundary.',
      hard_gates: TOPIC_SELECTION_VALUE_GATE_KEYS.map((gateKey) => ({
        gate_key: gateKey,
        verdict: 'pass',
        severity: 'info',
        overridable_with_risk: false,
        rationale: `${gateKey} passes because the question has one dataset, comparison, metric, and claim ceiling.`,
        refs: [evidenceRef],
      })),
      dimension_scores: TOPIC_SELECTION_VALUE_DIMENSIONS.map((dimensionKey) => ({
        dimension_key: dimensionKey,
        score: dimensionKey === 'originality' ? 74 : 86,
        rationale: `${dimensionKey} is adequate for the bounded SciFact canary.`,
        evidence_refs: [evidenceRef],
        uncertainty: 'low',
      })),
      risk_penalty: { residual_risk: 'bounded generalization' },
      reviewer_objections: ['One corpus and one exact-token retriever cannot support a general RAG claim.'],
      ceiling_case: T137_RESEARCH_INTENT.claim_ceiling,
      base_case: 'The result reports the fixed SciFact metric difference without broader extrapolation.',
      floor_case: 'The result is inconclusive but still validates the scientific evidence path.',
      recommended_disposition: 'advance_to_package',
      total_score: 84,
      value_summary: 'The question is executable, falsifiable, and narrow enough for a two-cell scientific canary.',
      confidence: 0.9,
      accepted_risk_refs: [],
      blocker_refs: [],
      risk_notes: ['Generalization remains outside the claim ceiling.'],
      reasoning_memo: {
        recommendation: 'advance_to_package',
        value_thesis: 'A fixed retrieval-depth comparison produces a reviewer-auditable bounded finding.',
        significance: 'It tests whether a commonly tuned retrieval parameter changes positive-judgment recall.',
        originality: 'The value is the controlled evidence and trace, not a broad algorithmic novelty claim.',
        claim_leverage: T137_RESEARCH_INTENT.claim_ceiling,
        reviewer_risks: ['Corpus and retriever scope are intentionally narrow.'],
        effort_to_value: 'Two cells reuse admitted scientific assets and one server-owned metric.',
        strategic_fit: 'It directly connects literature-backed topic intent to executable scientific evidence.',
        negative_memory_check: 'No recorded blocker prevents the fixed comparison.',
        evidence_backed_rationale: 'The selected question retains support, baseline, challenge, and measurement context.',
        top_objections: ['The finding must not be presented as a general RAG quality or cost result.'],
        uncertainty: 'Low execution uncertainty; bounded external-validity uncertainty.',
        disposition_bridge: 'Advance with the exact comparison and claim ceiling unchanged.',
        requires_critic_review: false,
        critic_triggers: [],
        cited_refs: [evidenceRef],
      },
    };
  }
  return {
    readiness_status: 'ready',
    strongest_claim_if_success: 'A harness-native topic-selection flow preserves replayable authority boundaries.',
    fallback_claim_if_success: 'Harness-level acceptance exposes route-only smoke gaps.',
    hard_gates: TOPIC_SELECTION_VALUE_GATE_KEYS.map((gateKey) => ({
      gate_key: gateKey,
      verdict: 'pass',
      severity: 'info',
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

function v1bHarnessN8BlockingGateDraft(input) {
  const draft = v1bHarnessN8ValueDraft(input);
  return {
    ...draft,
    hard_gates: draft.hard_gates.map((gate, index) => index === 0
      ? {
        ...gate,
        verdict: 'fail',
        severity: 'blocking',
        rationale: 'Deterministic negative fixture: this gate intentionally blocks package advancement.',
      }
      : gate),
    risk_notes: [
      ...draft.risk_notes,
      'Deterministic negative fixture intentionally combines advance_to_package with a blocking hard gate.',
    ],
    reasoning_memo: {
      ...draft.reasoning_memo,
      reviewer_risks: [
        ...draft.reasoning_memo.reviewer_risks,
        'A blocking value gate should prevent authority persistence.',
      ],
      top_objections: [
        ...draft.reasoning_memo.top_objections,
        'The draft intentionally violates the deterministic advance gate.',
      ],
    },
  };
}

function v1bHarnessN8NonAdvanceDraft(input) {
  const draft = v1bHarnessN8ValueDraft(input);
  return {
    ...draft,
    readiness_status: 'needs_refinement',
    hard_gates: draft.hard_gates.map((gate) => ({
      ...gate,
      verdict: gate.gate_key === 'answerability_sanity' ? 'pass_with_risk' : gate.verdict,
      severity: gate.gate_key === 'answerability_sanity' ? 'warning' : gate.severity,
      rationale: gate.gate_key === 'answerability_sanity'
        ? 'Deterministic negative fixture: answerability is not yet strong enough for package drafting.'
        : gate.rationale,
    })),
    dimension_scores: draft.dimension_scores.map((score) => ({
      ...score,
      score: Math.min(score.score, score.dimension_key === 'reviewer_risk' ? 58 : 55),
      rationale: `Deterministic negative fixture keeps ${score.dimension_key} below package-readiness strength.`,
      uncertainty: 'high',
    })),
    recommended_disposition: 'refine_question',
    total_score: 55,
    value_summary: 'The deterministic negative value draft is valid but should route back for question refinement.',
    risk_notes: [
      ...draft.risk_notes,
      'Deterministic negative fixture intentionally recommends refinement before package drafting.',
    ],
    reasoning_memo: {
      ...draft.reasoning_memo,
      recommendation: 'refine_question',
      value_thesis: 'The topic has possible value, but the active question needs refinement before package drafting.',
      effort_to_value: 'The current effort-to-value fit is weak until the question boundary is narrowed.',
      strategic_fit: 'Refining the question better fits reviewer-aligned evidence workflows than package advancement.',
      disposition_bridge: 'Route feedback to N7/N6 rather than package the current contract.',
      requires_critic_review: true,
      critic_triggers: ['deterministic_negative_non_advance'],
    },
  };
}

async function recordModelLikeSemanticDraft(app, input, slot, fixturePayloadFactory) {
  const payload = fixturePayloadFactory();
  return {
    invocationInput: input,
    semanticArtifact: await recordWorkflowHarnessSemanticArtifact(app, input, slot, payload),
    summary: {
      node_id: input.node_id,
      slot_id: slot.slot_id,
      execution_mode: 'codex_assisted',
      provider_id: null,
      model_id: null,
      model_option_id: null,
      output_hash: sha256Text(stableStringify(payload)),
    },
  };
}

function withoutGlobalRuntimeAdmission(input) {
  return {
    ...input,
    run_mode: null,
    profile_id: null,
    execution_spec: null,
  };
}

async function recordCodexAssistedSemanticDraft(app, input, slot, payload) {
  return {
    invocationInput: input,
    semanticArtifact: await recordWorkflowHarnessSemanticArtifact(app, input, slot, payload, {
      executionMode: 'codex_assisted',
      profileId: slot.profile_id,
    }),
    summary: {
      node_id: input.node_id,
      slot_id: slot.slot_id,
      execution_mode: 'codex_assisted',
      provider_id: null,
      model_id: null,
      model_option_id: null,
      output_hash: sha256Text(stableStringify(payload)),
    },
  };
}

async function recordExternalCodexSemanticDraft(app, input, slot, payload, externalCodexSession) {
  return {
    invocationInput: input,
    semanticArtifact: await recordWorkflowHarnessSemanticArtifact(app, input, slot, payload, {
      executionMode: 'codex_assisted',
      profileId: slot.profile_id,
      promptPacketHash: externalCodexSession.prompt_hash,
      externalCodexSession,
    }),
    summary: {
      node_id: input.node_id,
      slot_id: slot.slot_id,
      execution_mode: 'codex_assisted',
      provider_id: null,
      model_id: null,
      model_option_id: null,
      output_hash: sha256Text(stableStringify(payload)),
      external_codex_session: externalCodexSession,
    },
  };
}

function stripMarkdownJsonFence(text) {
  const trimmed = String(text ?? '').trim();
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function parseJsonObjectFromCodexOutput(text) {
  const stripped = stripMarkdownJsonFence(text);
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1));
    }
    throw new Error('External Codex output did not contain a parseable JSON object.');
  }
}

async function runExternalCodexJsonSession(prompt, sampleDir) {
  await fs.mkdir(sampleDir, { recursive: true });
  const promptPath = path.join(sampleDir, 'prompt.md');
  const lastMessagePath = path.join(sampleDir, 'last-message.json');
  const stdoutPath = path.join(sampleDir, 'stdout.log');
  const stderrPath = path.join(sampleDir, 'stderr.log');
  await fs.writeFile(promptPath, prompt, 'utf8');
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const args = [
    '--ask-for-approval',
    'never',
    'exec',
    '-c',
    `model_reasoning_effort=${EXTERNAL_CODEX_REASONING_EFFORT}`,
    '--sandbox',
    'read-only',
    '--color',
    'never',
    '--output-last-message',
    lastMessagePath,
    '-C',
    REPO_ROOT,
    '-',
  ];
  if (EXTERNAL_CODEX_MODEL) {
    args.splice(5, 0, '-m', EXTERNAL_CODEX_MODEL);
  }
  const child = spawn(EXTERNAL_CODEX_BIN, args, {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      NO_COLOR: '1',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const stdoutChunks = [];
  const stderrChunks = [];
  child.stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
  child.stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));
  child.stdin.end(prompt);

  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
  }, EXTERNAL_CODEX_TIMEOUT_MS);
  const exit = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timeout);
  const stdout = Buffer.concat(stdoutChunks).toString('utf8');
  const stderr = Buffer.concat(stderrChunks).toString('utf8');
  await fs.writeFile(stdoutPath, stdout, 'utf8');
  await fs.writeFile(stderrPath, stderr, 'utf8');
  if (timedOut) {
    throw new Error(`External Codex CLI timed out after ${EXTERNAL_CODEX_TIMEOUT_MS}ms.`);
  }
  if (exit.code !== 0) {
    throw new Error(`External Codex CLI exited with code ${exit.code ?? 'null'} signal ${exit.signal ?? 'null'}.`);
  }
  const lastMessage = await fs.readFile(lastMessagePath, 'utf8');
  if (lastMessage.trim().length === 0) {
    throw new Error([
      'External Codex CLI produced no last agent message.',
      `stdout tail: ${stdout.slice(-500)}`,
      `stderr tail: ${stderr.slice(-500)}`,
    ].join('\n'));
  }
  const completedAt = new Date().toISOString();
  return {
    raw_output: lastMessage,
    metadata: {
      cli_bin: EXTERNAL_CODEX_BIN,
      model: EXTERNAL_CODEX_MODEL,
      reasoning_effort: EXTERNAL_CODEX_REASONING_EFFORT,
      argv: args,
      prompt_path: path.relative(REPO_ROOT, promptPath),
      last_message_path: path.relative(REPO_ROOT, lastMessagePath),
      stdout_path: path.relative(REPO_ROOT, stdoutPath),
      stderr_path: path.relative(REPO_ROOT, stderrPath),
      prompt_hash: sha256Text(prompt),
      output_hash: sha256Text(lastMessage),
      started_at: startedAt,
      completed_at: completedAt,
      elapsed_ms: Date.now() - startedMs,
      timeout_ms: EXTERNAL_CODEX_TIMEOUT_MS,
    },
  };
}

function n4DraftSlot() {
  return {
    slot_id: 'n4_research_slice_option_draft',
    allowed_effect: 'model_draft_for_gate',
    output_contract: 'ResearchSliceOptionSetDraft@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
  };
}

function n2ConstraintProfileSupportSlot() {
  return {
    slot_id: 'n2_constraint_profile_semantic_support',
    allowed_effect: 'delegated_payload_candidate',
    output_contract: 'ResearchConstraintProfileDraftSupport@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.constraint_profile_support,
  };
}

function n3ReadinessClassificationSlot() {
  return {
    slot_id: 'n3_readiness_classification',
    allowed_effect: 'support_only',
    output_contract: 'IntakeReadinessClassificationSupport@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.intake_readiness_support,
  };
}

function n5SliceSelectionSupportSlot() {
  return {
    slot_id: 'n5_slice_selection_review',
    allowed_effect: 'delegated_payload_candidate',
    output_contract: 'ResearchSliceSelectionReviewSupport@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.slice_selection_support,
  };
}

function n6DraftSlot() {
  return {
    slot_id: 'n6_question_candidate_draft',
    allowed_effect: 'model_draft_for_gate',
    output_contract: 'TopicQuestionCandidateSetDraft@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
  };
}

function n6LoopbackTriageSlot() {
  return {
    slot_id: 'n6_loopback_triage',
    allowed_effect: 'support_only',
    output_contract: 'N6LoopbackTriageSupport@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n6_loopback_triage_support,
  };
}

function n7CandidateGroupingSlot() {
  return {
    slot_id: 'n7_candidate_grouping',
    allowed_effect: 'support_only',
    output_contract: 'CandidateGroupingSupport@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_candidate_grouping_support,
  };
}

function n7DebateAdmissionSlot() {
  return {
    slot_id: 'n7_n8_debate_admission_review',
    allowed_effect: 'support_only',
    output_contract: 'N8DebateAdmissionReviewSupport@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_n8_debate_admission_support,
  };
}

function n7FailedTrialSynthesisSlot() {
  return {
    slot_id: 'n7_failed_trial_synthesis',
    allowed_effect: 'support_only',
    output_contract: 'N8FailedTrialSynthesisSupport@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_failed_trial_synthesis_support,
  };
}

function n8DraftSlot() {
  return {
    slot_id: 'n8_value_assessment_draft',
    allowed_effect: 'model_draft_for_gate',
    output_contract: 'TopicValueAssessmentDraft@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
  };
}

function n6LoopbackTriagePayload(input, loopbackTargetCode) {
  const payload = input.frozen_input.payload;
  const base = {
    loopback_target_code: loopbackTargetCode,
    failure_scope: 'candidate_level',
    dominant_reason_codes: ['answerability_weak'],
    affected_refs: [payload.research_slice_ref],
    regeneration_hints: [
      'Regenerate a bounded candidate that names the local workflow, evidence source, and reviewer-facing outcome.',
    ],
    debate_escalation: null,
    upstream_rollback: null,
    rationale: 'Deterministic negative N6 draft was structurally valid but intentionally not answerable.',
  };
  if (loopbackTargetCode === 'n6_debate_escalation') {
    return {
      ...base,
      failure_scope: 'candidate_level',
      debate_escalation: {
        debate_level: 'mixed_cost_control',
        recommended_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
        sticky: true,
        rationale: 'The next N6 retry should use debate to narrow the broad deterministic candidate.',
      },
      rationale: 'Deterministic negative N6 draft should escalate debate before retrying candidate generation.',
    };
  }
  if (loopbackTargetCode === 'n6_loopback_to_n5_select_different_slice') {
    return {
      ...base,
      failure_scope: 'slice_level',
      affected_refs: [payload.research_slice_ref, payload.selected_slice_option_ref],
      upstream_rollback: {
        target_node_id: 'topic-selection.v1b.select-research-slice.v1',
        repair_action: 'select_different_slice',
        rationale: 'The selected slice is too broad for the deterministic candidate to become answerable.',
      },
      rationale: 'Deterministic negative N6 draft should roll back to N5 for a different ResearchSlice.',
    };
  }
  return base;
}

async function recordN6LoopbackTriageArtifact(app, input, triagePayload) {
  return recordWorkflowHarnessSemanticArtifact(
    app,
    input,
    n6LoopbackTriageSlot(),
    triagePayload,
    {
      executionMode: 'codex_assisted',
      profileId: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n6_loopback_triage_support,
    },
  );
}

async function generateN6RuntimeLoopbackTriageArtifact(
  app,
  runtime,
  input,
  failedDraftArtifact,
  failedDraftHash,
  payload,
  options = {},
) {
  const runMode = options.runMode ?? input.run_mode ?? 'acceptance';
  const generated = await runtime.generateSupportArtifact({
    request: {
      ...input,
      run_mode: runMode,
    },
    failed_draft_artifact: failedDraftArtifact,
    failed_draft_hash: failedDraftHash,
    execution_mode: 'codex_assisted',
    run_mode: runMode,
    codex_response: {
      output: payload,
      operator_label: options.operatorLabel ?? 'v1b-harness-e2e-n6-loopback-triage-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    assert.fail(`N6 loopback triage runtime generation blocked: ${JSON.stringify(generated.invocation_result)}`);
  }
  const semanticArtifact = generated.semantic_artifact;
  assert.equal(semanticArtifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(semanticArtifact.execution_mode, 'codex_assisted');
  assert.equal(semanticArtifact.allowed_effect, 'support_only');
  assert.equal(semanticArtifact.slot_id, N6_LOOPBACK_TRIAGE_SLOT_ID);
  assert.equal(semanticArtifact.prompt_variant_key, N6_LOOPBACK_TRIAGE_SLOT_ID);
  assert.equal(semanticArtifact.context_policy_profile_id, 'topic-selection.v1b.n6.loopback-triage.context-runtime@v1');
  assert.equal(semanticArtifact.source_hashes.failed_draft_hash, failedDraftHash);

  const auditArtifact = await getWorkflowHarnessArtifact(app, semanticArtifact.runtime_audit_ref);
  assert.equal(auditArtifact.checksum, semanticArtifact.runtime_audit_hash);
  const provenance = auditArtifact.payload?.provenance;
  assert.equal(provenance?.source_kind, 'codex_response');
  assert.equal(provenance?.non_provider, true);
  assert.equal(provenance?.execution_mode, 'codex_assisted');
  assert.equal(provenance?.model_option_id, null);
  assert.equal(provenance?.prompt_packet_hash, semanticArtifact.prompt_packet_hash);
  assert.equal(provenance?.structured_output_hash, semanticArtifact.structured_output_hash);
  assert.equal(provenance?.cache_status, 'not_applicable');
  assert.equal(provenance?.response_reuse_ref, null);
  assert.equal(provenance?.telemetry, null);

  return {
    semanticArtifact,
    structuredOutput: generated.structured_output,
    summary: {
      node_id: input.node_id,
      slot_id: N6_LOOPBACK_TRIAGE_SLOT_ID,
      execution_mode: 'codex_assisted',
      runtime_provenance_class: semanticArtifact.runtime_provenance_class,
      context_policy_profile_id: semanticArtifact.context_policy_profile_id,
      prompt_packet_hash: semanticArtifact.prompt_packet_hash,
      prompt_variant_key: semanticArtifact.prompt_variant_key,
      runtime_invocation_context_hash: semanticArtifact.runtime_invocation_context_hash,
      runtime_audit_hash: semanticArtifact.runtime_audit_hash,
      context_packet_hash: generated.context_packet_hash,
      output_hash: semanticArtifact.structured_output_hash,
      failed_draft_hash: semanticArtifact.source_hashes.failed_draft_hash,
      audit_source_kind: provenance?.source_kind ?? null,
      audit_cache_status: provenance?.cache_status ?? null,
      provider_telemetry_present: Boolean(provenance?.telemetry),
    },
  };
}

function n7CandidateGroupingPayload(input) {
  const payload = input.frozen_input.payload;
  return {
    selected_candidate_ref: payload.admissible_candidate_refs[1] ?? payload.admissible_candidate_refs[0],
    selected_candidate_hash: payload.admissible_candidate_hashes[1] ?? payload.admissible_candidate_hashes[0],
    priority_order: payload.admissible_candidate_refs.length > 1
      ? [payload.admissible_candidate_refs[1], payload.admissible_candidate_refs[0]]
      : [payload.admissible_candidate_refs[0]],
    duplicate_or_overlap_groups: [],
    candidate_relationships: {
      ordered_by: 'runtime_smoke_codex_support',
    },
    grouping_summary: 'Runtime-verified Codex support prioritizes the higher-value non-overlapping candidate.',
  };
}

function n7DebateAdmissionPayload(overrides = {}) {
  return {
    debate_level: 'provider_diverse_deep_debate',
    recommended_profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
    high_value_signal_codes: ['bounded_replay_claim'],
    risk_signal_codes: ['deterministic_negative_gate_rejected'],
    rationale: 'Deterministic N8 gate rejection requires readmission before reassessment.',
    ...overrides,
  };
}

function n7FailedTrialSynthesisPayload(n6Result, candidates) {
  return {
    exhausted_candidate_refs: candidates.map((candidate) =>
      ref('topic_question_candidate', candidate.topic_question_candidate_id, candidate.title_card_id)),
    failure_reason_codes: ['deterministic_negative_value_not_supported'],
    synthesis_summary: 'Deterministic N8 non-advance assessments exhausted candidate trials.',
    n6_regeneration_hints: ['Regenerate a narrower question with stronger evidence linkage.'],
    affected_refs: [n6Result.authority_ref],
  };
}

function assertPrismaBackedHarness(label) {
  const storeConfig = resolveTitleCardManagementStoreConfig();
  assert.equal(
    storeConfig.titleCardStrategy,
    'prisma',
    `${label} requires TITLE_CARD_REPOSITORY=prisma so runtime support artifacts share the HTTP harness store.`,
  );
}

function createN4RuntimeResearchSliceRuntime(prisma) {
  assertPrismaBackedHarness('v1b N4 runtime research-slice draft');
  const controlPlane = new TopicSelectionControlPlaneService(
    new PrismaTopicSelectionControlPlaneRepository(prisma),
  );
  const modelProfileRegistry = new TopicSelectionModelProfileRegistryService();
  const promptPacketCache = new TopicSelectionPromptPacketCacheService({
    store: new PrismaTopicSelectionPromptPacketCacheStore(prisma, {
      allowMissingTableFallback: true,
    }),
  });
  const agentOrchestrator = new TopicSelectionAgentOrchestratorService({
    controlPlane,
    modelProfileRegistry,
    promptPacketCache,
  });
  return new TopicSelectionV1bN4ResearchSliceRuntimeService(controlPlane, {
    agentOrchestrator,
    modelProfileRegistry,
  });
}

function createEarlySemanticSupportRuntime(prisma) {
  assertPrismaBackedHarness('v1b N2/N3/N5 runtime semantic support');
  const controlPlane = new TopicSelectionControlPlaneService(
    new PrismaTopicSelectionControlPlaneRepository(prisma),
  );
  const modelProfileRegistry = new TopicSelectionModelProfileRegistryService();
  const promptPacketCache = new TopicSelectionPromptPacketCacheService({
    store: new PrismaTopicSelectionPromptPacketCacheStore(prisma, {
      allowMissingTableFallback: true,
    }),
  });
  const agentOrchestrator = new TopicSelectionAgentOrchestratorService({
    controlPlane,
    modelProfileRegistry,
    promptPacketCache,
  });
  return new TopicSelectionV1bEarlySemanticSupportRuntimeService(controlPlane, {
    agentOrchestrator,
    modelProfileRegistry,
  });
}

function createN7RuntimeSupportRuntime(prisma) {
  assertPrismaBackedHarness('v1b N7 runtime support');
  const controlPlane = new TopicSelectionControlPlaneService(
    new PrismaTopicSelectionControlPlaneRepository(prisma),
  );
  const modelProfileRegistry = new TopicSelectionModelProfileRegistryService();
  const promptPacketCache = new TopicSelectionPromptPacketCacheService({
    store: new PrismaTopicSelectionPromptPacketCacheStore(prisma, {
      allowMissingTableFallback: true,
    }),
  });
  const agentOrchestrator = new TopicSelectionAgentOrchestratorService({
    controlPlane,
    modelProfileRegistry,
    promptPacketCache,
  });
  return new TopicSelectionV1bN7SupportRuntimeService(controlPlane, {
    agentOrchestrator,
    modelProfileRegistry,
  });
}

function createN6RuntimeDraftRuntime(prisma) {
  assertPrismaBackedHarness('v1b N6 runtime draft');
  const controlPlane = new TopicSelectionControlPlaneService(
    new PrismaTopicSelectionControlPlaneRepository(prisma),
  );
  const modelProfileRegistry = new TopicSelectionModelProfileRegistryService();
  const promptPacketCache = new TopicSelectionPromptPacketCacheService({
    store: new PrismaTopicSelectionPromptPacketCacheStore(prisma, {
      allowMissingTableFallback: true,
    }),
  });
  const agentOrchestrator = new TopicSelectionAgentOrchestratorService({
    controlPlane,
    modelProfileRegistry,
    promptPacketCache,
  });
  return new TopicSelectionV1bN6DraftRuntimeService(controlPlane, {
    agentOrchestrator,
    modelProfileRegistry,
  });
}

function createN6RuntimeLoopbackTriageRuntime(prisma) {
  assertPrismaBackedHarness('v1b N6 runtime loopback triage');
  const controlPlane = new TopicSelectionControlPlaneService(
    new PrismaTopicSelectionControlPlaneRepository(prisma),
  );
  const modelProfileRegistry = new TopicSelectionModelProfileRegistryService();
  const promptPacketCache = new TopicSelectionPromptPacketCacheService({
    store: new PrismaTopicSelectionPromptPacketCacheStore(prisma, {
      allowMissingTableFallback: true,
    }),
  });
  const agentOrchestrator = new TopicSelectionAgentOrchestratorService({
    controlPlane,
    modelProfileRegistry,
    promptPacketCache,
  });
  return new TopicSelectionV1bN6LoopbackTriageRuntimeService(controlPlane, {
    agentOrchestrator,
    modelProfileRegistry,
  });
}

function createN8RuntimeValueAssessmentRuntime(prisma) {
  assertPrismaBackedHarness('v1b N8 runtime value assessment');
  const controlPlane = new TopicSelectionControlPlaneService(
    new PrismaTopicSelectionControlPlaneRepository(prisma),
  );
  const modelProfileRegistry = new TopicSelectionModelProfileRegistryService();
  const promptPacketCache = new TopicSelectionPromptPacketCacheService({
    store: new PrismaTopicSelectionPromptPacketCacheStore(prisma, {
      allowMissingTableFallback: true,
    }),
  });
  const agentOrchestrator = new TopicSelectionAgentOrchestratorService({
    controlPlane,
    modelProfileRegistry,
    promptPacketCache,
  });
  return new TopicSelectionV1bN8ValueAssessmentRuntimeService(controlPlane, {
    agentOrchestrator,
    modelProfileRegistry,
  });
}

async function buildN4PlanningInputFromAuthorities(prisma, n1Result, n2Result, n3Result) {
  assert.ok(n1Result.authority_ref, 'N4 runtime planning input requires N1 authority_ref.');
  assert.ok(n2Result.authority_ref, 'N4 runtime planning input requires N2 authority_ref.');
  assert.ok(n3Result.authority_ref, 'N4 runtime planning input requires N3 authority_ref.');
  const repository = new PrismaTopicSelectionV1bIntakeRepository(prisma);
  const [snapshot, profile, readiness] = await Promise.all([
    repository.findIntakeSnapshotById(n1Result.authority_ref.ref_id),
    repository.findResearchConstraintProfileById(n2Result.authority_ref.ref_id),
    repository.findReadinessAssessmentById(n3Result.authority_ref.ref_id),
  ]);
  assert.ok(snapshot, `N4 runtime planning input could not load N1 snapshot ${n1Result.authority_ref.ref_id}.`);
  assert.ok(profile, `N4 runtime planning input could not load N2 profile ${n2Result.authority_ref.ref_id}.`);
  assert.ok(readiness, `N4 runtime planning input could not load N3 readiness ${n3Result.authority_ref.ref_id}.`);
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

async function assertRuntimeVerifiedN4DraftArtifact(app, semanticArtifact) {
  assert.equal(semanticArtifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(semanticArtifact.execution_mode, 'codex_assisted');
  assert.equal(semanticArtifact.allowed_effect, 'model_draft_for_gate');
  assert.equal(semanticArtifact.model_option_id, null);
  assert.equal(semanticArtifact.prompt_variant_key, 'n4_research_slice_option_draft.initial_from_n3');
  assert.equal(
    semanticArtifact.context_policy_profile_id,
    'topic-selection.v1b.n4.research-slice-options.context-runtime@v1',
  );
  assert.match(semanticArtifact.prompt_packet_hash, /^[a-f0-9]{64}$/);
  assert.match(semanticArtifact.runtime_invocation_context_hash, /^[a-f0-9]{64}$/);
  assert.ok(semanticArtifact.runtime_audit_ref, 'runtime N4 draft requires audit ref.');
  assert.match(semanticArtifact.runtime_audit_hash, /^[a-f0-9]{64}$/);
  assert.ok(semanticArtifact.source_hashes?.n3_handoff_hash, 'runtime N4 draft requires N3 handoff hash.');
  assert.ok(semanticArtifact.source_hashes?.planning_input_hash, 'runtime N4 draft requires planning input hash.');
  assert.ok(semanticArtifact.source_hashes?.evidence_refs_hash, 'runtime N4 draft requires evidence refs hash.');

  const auditArtifact = await getWorkflowHarnessArtifact(app, semanticArtifact.runtime_audit_ref);
  assert.equal(auditArtifact.checksum, semanticArtifact.runtime_audit_hash);
  const provenance = auditArtifact.payload?.provenance;
  assert.equal(provenance?.source_kind, 'codex_response');
  assert.equal(provenance?.non_provider, true);
  assert.equal(provenance?.execution_mode, 'codex_assisted');
  assert.equal(provenance?.model_option_id, null);
  assert.equal(provenance?.prompt_packet_hash, semanticArtifact.prompt_packet_hash);
  assert.equal(provenance?.cache_status, 'not_applicable');
  assert.equal(provenance?.response_reuse_ref, null);
  assert.equal(provenance?.telemetry, null);
  return auditArtifact.payload;
}

async function generateN4RuntimeDraftArtifact(app, runtime, input, planningInput, payload, options = {}) {
  const runMode = options.runMode ?? input.run_mode ?? 'acceptance';
  const generated = await runtime.generateDraftArtifact({
    request: {
      ...input,
      run_mode: runMode,
    },
    planning_input: planningInput,
    execution_mode: 'codex_assisted',
    run_mode: runMode,
    codex_response: {
      output: payload,
      operator_label: options.operatorLabel ?? 'v1b-harness-e2e-n4-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    assert.fail(`N4 runtime research-slice draft generation blocked: ${JSON.stringify(generated.invocation_result)}`);
  }
  const auditSnapshot = await assertRuntimeVerifiedN4DraftArtifact(app, generated.semantic_artifact);
  return {
    semanticArtifact: generated.semantic_artifact,
    structuredOutput: generated.structured_output,
    summary: {
      node_id: input.node_id,
      slot_id: 'n4_research_slice_option_draft',
      execution_mode: 'codex_assisted',
      runtime_provenance_class: generated.semantic_artifact.runtime_provenance_class,
      context_policy_profile_id: generated.semantic_artifact.context_policy_profile_id,
      prompt_packet_hash: generated.semantic_artifact.prompt_packet_hash,
      prompt_variant_key: generated.semantic_artifact.prompt_variant_key,
      runtime_invocation_context_hash: generated.semantic_artifact.runtime_invocation_context_hash,
      runtime_audit_hash: generated.semantic_artifact.runtime_audit_hash,
      context_packet_hash: generated.context_packet_hash,
      output_hash: generated.semantic_artifact.structured_output_hash,
      audit_source_kind: auditSnapshot.provenance?.source_kind ?? null,
      audit_cache_status: auditSnapshot.provenance?.cache_status ?? null,
      provider_telemetry_present: Boolean(auditSnapshot.provenance?.telemetry),
    },
  };
}

async function assertRuntimeVerifiedN6DraftArtifact(
  app,
  semanticArtifact,
  expectedPromptVariantKey = 'n6_question_candidate_draft.initial_from_n5',
) {
  assert.equal(semanticArtifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(semanticArtifact.execution_mode, 'codex_assisted');
  assert.equal(semanticArtifact.allowed_effect, 'model_draft_for_gate');
  assert.equal(semanticArtifact.model_option_id, null);
  assert.equal(semanticArtifact.prompt_variant_key, expectedPromptVariantKey);
  assert.equal(
    semanticArtifact.context_policy_profile_id,
    'topic-selection.v1b.n6.question-candidate-draft.context-runtime@v1',
  );
  assert.match(semanticArtifact.prompt_packet_hash, /^[a-f0-9]{64}$/);
  assert.match(semanticArtifact.runtime_invocation_context_hash, /^[a-f0-9]{64}$/);
  assert.ok(semanticArtifact.runtime_audit_ref, 'runtime draft requires audit ref.');
  assert.match(semanticArtifact.runtime_audit_hash, /^[a-f0-9]{64}$/);
  assert.ok(semanticArtifact.source_hashes?.n5_handoff_hash, 'runtime draft requires N5 handoff hash.');
  assert.ok(semanticArtifact.source_hashes?.selected_slice_option_hash, 'runtime draft requires option hash.');

  const auditArtifact = await getWorkflowHarnessArtifact(app, semanticArtifact.runtime_audit_ref);
  assert.equal(auditArtifact.checksum, semanticArtifact.runtime_audit_hash);
  const provenance = auditArtifact.payload?.provenance;
  assert.equal(provenance?.source_kind, 'codex_response');
  assert.equal(provenance?.non_provider, true);
  assert.equal(provenance?.execution_mode, 'codex_assisted');
  assert.equal(provenance?.model_option_id, null);
  assert.equal(provenance?.prompt_packet_hash, semanticArtifact.prompt_packet_hash);
  assert.equal(provenance?.cache_status, 'not_applicable');
  assert.equal(provenance?.response_reuse_ref, null);
  assert.equal(provenance?.telemetry, null);
  return auditArtifact.payload;
}

async function generateN6RuntimeDraftArtifact(app, runtime, input, payload, options = {}) {
  const runMode = options.runMode ?? input.run_mode ?? 'acceptance';
  const generationMode = options.generationMode ?? 'initial_from_n5';
  const generated = await runtime.generateDraftArtifact({
    request: {
      ...input,
      run_mode: runMode,
    },
    generation_mode: generationMode,
    execution_mode: 'codex_assisted',
    run_mode: runMode,
    codex_response: {
      output: payload,
      operator_label: options.operatorLabel ?? 'v1b-harness-e2e-n6-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    assert.fail(`N6 runtime draft generation blocked: ${JSON.stringify(generated.invocation_result)}`);
  }
  const auditSnapshot = await assertRuntimeVerifiedN6DraftArtifact(
    app,
    generated.semantic_artifact,
    `n6_question_candidate_draft.${generationMode}`,
  );
  return {
    semanticArtifact: generated.semantic_artifact,
    structuredOutput: generated.structured_output,
    summary: {
      node_id: input.node_id,
      slot_id: 'n6_question_candidate_draft',
      execution_mode: 'codex_assisted',
      runtime_provenance_class: generated.semantic_artifact.runtime_provenance_class,
      context_policy_profile_id: generated.semantic_artifact.context_policy_profile_id,
      prompt_packet_hash: generated.semantic_artifact.prompt_packet_hash,
      prompt_variant_key: generated.semantic_artifact.prompt_variant_key,
      runtime_invocation_context_hash: generated.semantic_artifact.runtime_invocation_context_hash,
      runtime_audit_hash: generated.semantic_artifact.runtime_audit_hash,
      context_packet_hash: generated.context_packet_hash,
      output_hash: generated.semantic_artifact.structured_output_hash,
      audit_source_kind: auditSnapshot.provenance?.source_kind ?? null,
      audit_cache_status: auditSnapshot.provenance?.cache_status ?? null,
      provider_telemetry_present: Boolean(auditSnapshot.provenance?.telemetry),
    },
  };
}

async function assertRuntimeVerifiedN8DraftArtifact(app, semanticArtifact) {
  assert.equal(semanticArtifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(semanticArtifact.execution_mode, 'codex_assisted');
  assert.equal(semanticArtifact.allowed_effect, 'model_draft_for_gate');
  assert.equal(semanticArtifact.model_option_id, null);
  assert.equal(semanticArtifact.prompt_variant_key, 'n8_value_assessment_draft.initial_from_n7');
  assert.equal(
    semanticArtifact.context_policy_profile_id,
    'topic-selection.v1b.n8.topic-value-assessment.context-runtime@v1',
  );
  assert.match(semanticArtifact.prompt_packet_hash, /^[a-f0-9]{64}$/);
  assert.match(semanticArtifact.runtime_invocation_context_hash, /^[a-f0-9]{64}$/);
  assert.ok(semanticArtifact.runtime_audit_ref, 'runtime value draft requires audit ref.');
  assert.match(semanticArtifact.runtime_audit_hash, /^[a-f0-9]{64}$/);
  assert.ok(semanticArtifact.source_hashes?.n7_handoff_hash, 'runtime draft requires N7 handoff hash.');
  assert.ok(
    semanticArtifact.source_hashes?.n7_to_n8_projection_hash,
    'runtime draft requires N7-to-N8 projection hash.',
  );
  assert.ok(semanticArtifact.source_hashes?.topic_question_contract_hash, 'runtime draft requires contract hash.');

  const auditArtifact = await getWorkflowHarnessArtifact(app, semanticArtifact.runtime_audit_ref);
  assert.equal(auditArtifact.checksum, semanticArtifact.runtime_audit_hash);
  const provenance = auditArtifact.payload?.provenance;
  assert.equal(provenance?.source_kind, 'codex_response');
  assert.equal(provenance?.non_provider, true);
  assert.equal(provenance?.execution_mode, 'codex_assisted');
  assert.equal(provenance?.model_option_id, null);
  assert.equal(provenance?.prompt_packet_hash, semanticArtifact.prompt_packet_hash);
  assert.equal(provenance?.cache_status, 'not_applicable');
  assert.equal(provenance?.response_reuse_ref, null);
  assert.equal(provenance?.telemetry, null);
  return auditArtifact.payload;
}

async function generateN8RuntimeValueDraftArtifact(app, runtime, input, payload, options = {}) {
  const runMode = options.runMode ?? input.run_mode ?? 'acceptance';
  const generated = await runtime.generateDraftArtifact({
    request: {
      ...input,
      run_mode: runMode,
    },
    execution_mode: 'codex_assisted',
    run_mode: runMode,
    codex_response: {
      output: payload,
      operator_label: options.operatorLabel ?? 'v1b-harness-e2e-n8-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    assert.fail(`N8 runtime value draft generation blocked: ${JSON.stringify(generated.invocation_result)}`);
  }
  const auditSnapshot = await assertRuntimeVerifiedN8DraftArtifact(app, generated.semantic_artifact);
  return {
    semanticArtifact: generated.semantic_artifact,
    structuredOutput: generated.structured_output,
    summary: {
      node_id: input.node_id,
      slot_id: 'n8_value_assessment_draft',
      execution_mode: 'codex_assisted',
      runtime_provenance_class: generated.semantic_artifact.runtime_provenance_class,
      context_policy_profile_id: generated.semantic_artifact.context_policy_profile_id,
      prompt_packet_hash: generated.semantic_artifact.prompt_packet_hash,
      prompt_variant_key: generated.semantic_artifact.prompt_variant_key,
      runtime_invocation_context_hash: generated.semantic_artifact.runtime_invocation_context_hash,
      runtime_audit_hash: generated.semantic_artifact.runtime_audit_hash,
      context_packet_hash: generated.context_packet_hash,
      output_hash: generated.semantic_artifact.structured_output_hash,
      audit_source_kind: auditSnapshot.provenance?.source_kind ?? null,
      audit_cache_status: auditSnapshot.provenance?.cache_status ?? null,
      provider_telemetry_present: Boolean(auditSnapshot.provenance?.telemetry),
    },
  };
}

async function assertRuntimeVerifiedEarlySemanticSupportArtifact(app, semanticArtifact, slot) {
  assert.equal(semanticArtifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(semanticArtifact.execution_mode, 'codex_assisted');
  assert.equal(semanticArtifact.allowed_effect, slot.allowed_effect);
  assert.equal(semanticArtifact.output_contract, slot.output_contract);
  assert.equal(semanticArtifact.model_option_id, null);
  assert.match(semanticArtifact.prompt_packet_hash, /^[a-f0-9]{64}$/);
  assert.match(semanticArtifact.runtime_invocation_context_hash, /^[a-f0-9]{64}$/);
  assert.ok(semanticArtifact.runtime_audit_ref, 'runtime early semantic support requires audit ref.');
  assert.match(semanticArtifact.runtime_audit_hash, /^[a-f0-9]{64}$/);
  assert.ok(semanticArtifact.source_hashes?.frozen_input_hash, 'runtime early semantic support requires source hashes.');

  const auditArtifact = await getWorkflowHarnessArtifact(app, semanticArtifact.runtime_audit_ref);
  assert.equal(auditArtifact.checksum, semanticArtifact.runtime_audit_hash);
  const provenance = auditArtifact.payload?.provenance;
  assert.equal(provenance?.source_kind, 'codex_response');
  assert.equal(provenance?.non_provider, true);
  assert.equal(provenance?.execution_mode, 'codex_assisted');
  assert.equal(provenance?.model_option_id, null);
  assert.equal(provenance?.prompt_packet_hash, semanticArtifact.prompt_packet_hash);
  assert.equal(provenance?.cache_status, 'not_applicable');
  assert.equal(provenance?.response_reuse_ref, null);
  assert.equal(provenance?.telemetry, null);
  return auditArtifact.payload;
}

async function generateEarlySemanticSupportArtifact(app, runtime, input, slot, payload, options = {}) {
  const runMode = options.runMode ?? input.run_mode ?? 'acceptance';
  const generated = await runtime.generateSupportArtifact({
    request: {
      ...input,
      run_mode: runMode,
    },
    slot_id: slot.slot_id,
    execution_mode: 'codex_assisted',
    run_mode: runMode,
    codex_response: {
      output: payload,
      operator_label: options.operatorLabel ?? 'v1b-harness-e2e-early-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    assert.fail(`Early semantic runtime support generation blocked: ${JSON.stringify(generated.invocation_result)}`);
  }
  const auditSnapshot = await assertRuntimeVerifiedEarlySemanticSupportArtifact(
    app,
    generated.semantic_artifact,
    slot,
  );
  return {
    semanticArtifact: generated.semantic_artifact,
    structuredOutput: generated.structured_output,
    summary: {
      node_id: input.node_id,
      slot_id: slot.slot_id,
      execution_mode: 'codex_assisted',
      runtime_provenance_class: generated.semantic_artifact.runtime_provenance_class,
      context_policy_profile_id: generated.semantic_artifact.context_policy_profile_id,
      prompt_packet_hash: generated.semantic_artifact.prompt_packet_hash,
      prompt_variant_key: generated.semantic_artifact.prompt_variant_key,
      runtime_invocation_context_hash: generated.semantic_artifact.runtime_invocation_context_hash,
      runtime_audit_hash: generated.semantic_artifact.runtime_audit_hash,
      context_packet_hash: generated.context_packet_hash,
      output_hash: generated.semantic_artifact.structured_output_hash,
      audit_source_kind: auditSnapshot.provenance?.source_kind ?? null,
      audit_cache_status: auditSnapshot.provenance?.cache_status ?? null,
      provider_telemetry_present: Boolean(auditSnapshot.provenance?.telemetry),
    },
  };
}

async function generateEarlySemanticSupportArtifactWithFreshRuntime(app, input, slot, payload, options = {}) {
  const prisma = new PrismaClient();
  try {
    const runtime = createEarlySemanticSupportRuntime(prisma);
    return await generateEarlySemanticSupportArtifact(app, runtime, input, slot, payload, options);
  } finally {
    await prisma.$disconnect();
  }
}

async function assertRuntimeVerifiedN7SupportArtifact(app, semanticArtifact) {
  assert.equal(semanticArtifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(semanticArtifact.execution_mode, 'codex_assisted');
  assert.equal(semanticArtifact.allowed_effect, 'support_only');
  assert.equal(semanticArtifact.model_option_id, null);
  assert.match(semanticArtifact.prompt_packet_hash, /^[a-f0-9]{64}$/);
  assert.match(semanticArtifact.runtime_invocation_context_hash, /^[a-f0-9]{64}$/);
  assert.ok(semanticArtifact.runtime_audit_ref, 'runtime support requires audit ref.');
  assert.match(semanticArtifact.runtime_audit_hash, /^[a-f0-9]{64}$/);
  assert.ok(semanticArtifact.source_hashes?.frozen_input_hash, 'runtime support requires source hashes.');

  const auditArtifact = await getWorkflowHarnessArtifact(app, semanticArtifact.runtime_audit_ref);
  assert.equal(auditArtifact.checksum, semanticArtifact.runtime_audit_hash);
  const provenance = auditArtifact.payload?.provenance;
  assert.equal(provenance?.source_kind, 'codex_response');
  assert.equal(provenance?.non_provider, true);
  assert.equal(provenance?.execution_mode, 'codex_assisted');
  assert.equal(provenance?.model_option_id, null);
  assert.equal(provenance?.prompt_packet_hash, semanticArtifact.prompt_packet_hash);
  assert.equal(provenance?.cache_status, 'not_applicable');
  assert.equal(provenance?.response_reuse_ref, null);
  assert.equal(provenance?.telemetry, null);
  return auditArtifact.payload;
}

async function generateN7RuntimeSupportArtifact(app, runtime, input, slot, payload, options = {}) {
  const runMode = options.runMode ?? input.run_mode ?? 'acceptance';
  const generated = await runtime.generateSupportArtifact({
    request: {
      ...input,
      run_mode: runMode,
    },
    slot_id: slot.slot_id,
    execution_mode: 'codex_assisted',
    run_mode: runMode,
    codex_response: {
      output: payload,
      operator_label: options.operatorLabel ?? 'v1b-harness-e2e-runtime',
    },
    created_by: 'system',
  });
  assert.equal(generated.status, 'succeeded');
  if (generated.status !== 'succeeded') {
    assert.fail(`N7 runtime support generation blocked: ${JSON.stringify(generated.invocation_result)}`);
  }
  const auditSnapshot = await assertRuntimeVerifiedN7SupportArtifact(app, generated.semantic_artifact);
  return {
    semanticArtifact: generated.semantic_artifact,
    structuredOutput: generated.structured_output,
    summary: {
      node_id: input.node_id,
      slot_id: slot.slot_id,
      execution_mode: 'codex_assisted',
      runtime_provenance_class: generated.semantic_artifact.runtime_provenance_class,
      context_policy_profile_id: generated.semantic_artifact.context_policy_profile_id,
      prompt_packet_hash: generated.semantic_artifact.prompt_packet_hash,
      runtime_invocation_context_hash: generated.semantic_artifact.runtime_invocation_context_hash,
      runtime_audit_hash: generated.semantic_artifact.runtime_audit_hash,
      context_packet_hash: generated.context_packet_hash,
      output_hash: generated.semantic_artifact.structured_output_hash,
      audit_source_kind: auditSnapshot.provenance?.source_kind ?? null,
      audit_cache_status: auditSnapshot.provenance?.cache_status ?? null,
      provider_telemetry_present: Boolean(auditSnapshot.provenance?.telemetry),
    },
  };
}

async function recordN8FeedbackArtifact(app, input, feedback) {
  const artifact = await recordWorkflowHarnessArtifact(app, input, feedback);
  return {
    artifact_ref: ref('artifact_ref', artifact.artifact_ref_id, input.title_card_id ?? artifact.title_card_id),
    artifact_hash: sha256Text(stableStringify(artifact)),
    payload_hash: sha256Text(stableStringify(feedback)),
  };
}

async function v1bHarnessN7FeedbackRequest(
  app,
  initialInput,
  n7Result,
  feedbackClass,
  n8GateResultHash,
  suffix,
  valueResult = null,
) {
  assert.ok(n7Result.authority_ref && n7Result.handoff_ref, 'N7 feedback requires admitted N7 authority and handoff.');
  assert.ok(n7Result.hashes.authority_hash && n7Result.hashes.handoff_hash, 'N7 feedback requires N7 hashes.');
  assert.ok(n8GateResultHash, 'N7 feedback requires an N8 gate result hash.');
  const n7Handoff = await getWorkflowHarnessHandoff(app, n7Result.handoff_ref);
  const n7Payload = n7Handoff.payload;
  const initialPayload = initialInput.frozen_input.payload;
  const feedback = {
    feedback_class: feedbackClass,
    failure_reason_code: feedbackClass === 'gate_rejected'
      ? 'deterministic_negative_gate_rejected'
      : 'deterministic_negative_value_not_supported',
    feedback_summary: feedbackClass === 'gate_rejected'
      ? 'Deterministic N8 gate rejection blocked the active candidate before value authority was persisted.'
      : 'Deterministic N8 value assessment persisted a non-advance disposition for the active candidate.',
    affected_refs: [n7Payload.active_candidate_ref],
    previous_n7_handoff_ref: n7Result.handoff_ref,
    previous_n7_handoff_hash: n7Result.hashes.handoff_hash,
    previous_trial_ledger_ref: n7Payload.trial_ledger_ref,
    previous_trial_ledger_hash: n7Payload.trial_ledger_hash,
    failed_topic_question_contract_ref: n7Result.authority_ref,
    failed_topic_question_contract_hash: n7Result.hashes.authority_hash,
    failed_candidate_ref: n7Payload.active_candidate_ref,
    failed_candidate_hash: n7Payload.active_candidate_hash,
    topic_question_candidate_set_ref: n7Payload.topic_question_candidate_set_ref,
    topic_question_candidate_set_hash: n7Payload.topic_question_candidate_set_hash,
    n8_gate_result_hash: n8GateResultHash,
    value_assessment_ref: valueResult?.authority_ref ?? null,
    value_assessment_hash: valueResult?.hashes?.authority_hash ?? null,
  };
  const feedbackArtifact = await recordN8FeedbackArtifact(app, initialInput, feedback);
  const payload = {
    ...initialPayload,
    input_mode: 'feedback_from_n8',
    n8_feedback_ref: feedbackArtifact.artifact_ref,
    n8_feedback_hash: feedbackArtifact.artifact_hash,
    n8_feedback_payload_hash: feedbackArtifact.payload_hash,
  };
  const frozenInput = {
    input_contract: 'N8ToN7Feedback@v1',
    snapshot_kind: 'topic_question_candidate_set',
    source_refs: uniqueRefs([
      ...initialInput.frozen_input.source_refs,
      feedbackArtifact.artifact_ref,
      n7Result.handoff_ref,
    ]),
    payload,
  };
  return harnessRequest(
    initialInput.title_card_id,
    suffix,
    'n7_feedback',
    'topic-selection.v1b.materialize-topic-question-contract.v1',
    frozenInput,
  );
}

async function v1bHarnessN9Request(app, n8Result, suffix) {
  return v1bHarnessRequestFromHandoff(
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

async function v1bHarnessN10Request(app, n9Result, suffix) {
  return v1bHarnessRequestFromHandoff(
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

async function v1bHarnessN11Request(app, n10Result, suffix) {
  return v1bHarnessRequestFromHandoff(
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

async function loadExistingV1bInputBundle(bundleId) {
  const prisma = new PrismaClient();
  try {
    const repository = new PrismaTopicSelectionNeedValidationRepository(prisma);
    const bundle = await repository.findV1aToV1bInputBundleById(bundleId);
    assert.ok(bundle, `Existing v1b input bundle not found: ${bundleId}`);
    return bundle;
  } finally {
    await prisma.$disconnect();
  }
}

function existingV1bInputBundleResult(bundle) {
  return {
    titleCardId: bundle.title_card_id,
    validatedNeedId: bundle.validated_need_id,
    v1bInputBundle: bundle,
    v1bInputBundleId: bundle.v1b_input_bundle_id,
  };
}

async function runV1bHarnessHttpN1ToN11(app, suffix, existingBundle = null) {
  const bundleResult = existingBundle
    ? existingV1bInputBundleResult(existingBundle)
    : await createV1bInputBundle(app, suffix);
  const bundle = bundleResult.v1bInputBundle;
  const acceptedProfile = acceptedConstraintProfilePayload();
  const semanticSummaries = [];

  const n1Input = v1bHarnessN1Request(bundle, suffix);
  const n1 = await invokeV1bHarnessNode(app, n1Input);

  const n2Input = v1bHarnessN2Request(bundle, n1, suffix, acceptedProfile);
  const n2Semantic = await generateEarlySemanticSupportArtifactWithFreshRuntime(
    app,
    n2Input,
    n2ConstraintProfileSupportSlot(),
    acceptedProfile,
  );
  semanticSummaries.push(n2Semantic.summary);
  const n2 = await invokeV1bHarnessNode(app, {
    ...n2Input,
    semantic_artifacts: [n2Semantic.semanticArtifact],
  });

  const n3Input = v1bHarnessN3Request(n1, n2, suffix);
  const n3Semantic = await generateEarlySemanticSupportArtifactWithFreshRuntime(
    app,
    n3Input,
    n3ReadinessClassificationSlot(),
    v1bHarnessN3ReadinessClassificationSupport(n3Input),
  );
  semanticSummaries.push(n3Semantic.summary);
  const n3 = await invokeV1bHarnessNode(app, {
    ...n3Input,
    semantic_artifacts: [n3Semantic.semanticArtifact],
  });
  const n4Input = v1bHarnessN4Request(n1, n2, n3, suffix);
  const n4Slot = {
    slot_id: 'n4_research_slice_option_draft',
    allowed_effect: 'model_draft_for_gate',
    output_contract: 'ResearchSliceOptionSetDraft@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.research_slice_options_single_agent,
  };
  const n4Semantic = await recordModelLikeSemanticDraft(app, n4Input, n4Slot, () => v1bHarnessN4Draft(bundle));
  semanticSummaries.push(n4Semantic.summary);
  const n4 = await invokeV1bHarnessNode(app, {
    ...n4Semantic.invocationInput,
    semantic_artifacts: [n4Semantic.semanticArtifact],
  });
  assert.ok(n4.authority_ref, JSON.stringify(n4));

  const selectedOption = await selectedV1bHarnessOption(app, n4);
  const n5Payload = acceptedV1bHarnessSliceSelectionPayload(selectedOption);
  const n5Input = v1bHarnessN5Request(n4, n5Payload, suffix, {
    authorityInputProvider: 'codex_delegated',
  });
  const n5Semantic = await generateEarlySemanticSupportArtifactWithFreshRuntime(
    app,
    n5Input,
    n5SliceSelectionSupportSlot(),
    n5Payload,
  );
  semanticSummaries.push(n5Semantic.summary);
  const n5 = await invokeV1bHarnessNode(app, {
    ...n5Input,
    semantic_artifacts: [n5Semantic.semanticArtifact],
  });

  const n6Input = await v1bHarnessN6Request(app, n5, suffix);
  const n6Slot = {
    slot_id: 'n6_question_candidate_draft',
    allowed_effect: 'model_draft_for_gate',
    output_contract: 'TopicQuestionCandidateSetDraft@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_question_candidates_single_agent,
  };
  const n6Semantic = await recordModelLikeSemanticDraft(
    app,
    n6Input,
    n6Slot,
    () => v1bHarnessN6Draft(bundle, n6Input),
  );
  semanticSummaries.push(n6Semantic.summary);
  const n6 = await invokeV1bHarnessNode(app, {
    ...n6Semantic.invocationInput,
    semantic_artifacts: [n6Semantic.semanticArtifact],
  });
  assert.ok(n6.handoff_ref, JSON.stringify(n6));
  const candidates = await listV1bHarnessCandidates(app, n6);

  const n7 = await invokeV1bHarnessNode(app, await v1bHarnessN7Request(app, n6, suffix));
  const n8Input = await v1bHarnessN8Request(app, n7, suffix);
  const n8Slot = {
    slot_id: 'n8_value_assessment_draft',
    allowed_effect: 'model_draft_for_gate',
    output_contract: 'TopicValueAssessmentDraft@v1',
    profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.topic_value_assessment_single_agent,
  };
  const n8Semantic = await recordModelLikeSemanticDraft(app, n8Input, n8Slot, () => v1bHarnessN8ValueDraft(n8Input));
  semanticSummaries.push(n8Semantic.summary);
  const n8 = await invokeV1bHarnessNode(app, {
    ...n8Semantic.invocationInput,
    semantic_artifacts: [n8Semantic.semanticArtifact],
  });
  assert.ok(n8.authority_ref, JSON.stringify(n8));
  const valueAssessments = await listV1bHarnessValueAssessments(app, bundle.title_card_id);
  assertV1bOutputQuality({ selectedOption, candidates, valueAssessments });
  const n9 = await invokeV1bHarnessNode(app, await v1bHarnessN9Request(app, n8, suffix));
  const n10 = await invokeV1bHarnessNode(app, await v1bHarnessN10Request(app, n9, suffix));
  const n11 = await invokeV1bHarnessNode(app, await v1bHarnessN11Request(app, n10, suffix));

  return {
    bundle,
    selectedOption,
    candidates,
    valueAssessments,
    semanticSummaries,
    nodes: { n1, n2, n3, n4, n5, n6, n7, n8, n9, n10, n11 },
  };
}

async function runV1bHarnessHttpSetupToN5(app, suffix, existingBundle = null) {
  const bundleResult = existingBundle
    ? existingV1bInputBundleResult(existingBundle)
    : await createV1bInputBundle(app, suffix);
  const bundle = bundleResult.v1bInputBundle;
  const acceptedProfile = acceptedConstraintProfilePayload();
  const semanticSummaries = [];

  const n1Input = v1bHarnessN1Request(bundle, suffix);
  const n1 = await invokeV1bHarnessNode(app, n1Input);

  const n2Input = v1bHarnessN2Request(bundle, n1, suffix, acceptedProfile);
  const n2Semantic = await generateEarlySemanticSupportArtifactWithFreshRuntime(
    app,
    n2Input,
    n2ConstraintProfileSupportSlot(),
    acceptedProfile,
  );
  semanticSummaries.push(n2Semantic.summary);
  const n2 = await invokeV1bHarnessNode(app, {
    ...n2Input,
    semantic_artifacts: [n2Semantic.semanticArtifact],
  });

  const n3Input = v1bHarnessN3Request(n1, n2, suffix);
  const n3Semantic = await generateEarlySemanticSupportArtifactWithFreshRuntime(
    app,
    n3Input,
    n3ReadinessClassificationSlot(),
    v1bHarnessN3ReadinessClassificationSupport(n3Input),
  );
  semanticSummaries.push(n3Semantic.summary);
  const n3 = await invokeV1bHarnessNode(app, {
    ...n3Input,
    semantic_artifacts: [n3Semantic.semanticArtifact],
  });
  const n4Input = v1bHarnessN4Request(n1, n2, n3, suffix);
  const n4Semantic = await recordCodexAssistedSemanticDraft(
    app,
    n4Input,
    n4DraftSlot(),
    v1bHarnessN4Draft(bundle),
  );
  semanticSummaries.push(n4Semantic.summary);
  const n4 = await invokeV1bHarnessNode(app, {
    ...n4Semantic.invocationInput,
    semantic_artifacts: [n4Semantic.semanticArtifact],
  });
  assert.ok(n4.authority_ref, JSON.stringify(n4));

  const selectedOption = await selectedV1bHarnessOption(app, n4);
  const n5Payload = acceptedV1bHarnessSliceSelectionPayload(selectedOption);
  const n5Input = v1bHarnessN5Request(n4, n5Payload, suffix, {
    authorityInputProvider: 'codex_delegated',
  });
  const n5Semantic = await generateEarlySemanticSupportArtifactWithFreshRuntime(
    app,
    n5Input,
    n5SliceSelectionSupportSlot(),
    n5Payload,
  );
  semanticSummaries.push(n5Semantic.summary);
  const n5 = await invokeV1bHarnessNode(app, {
    ...n5Input,
    semantic_artifacts: [n5Semantic.semanticArtifact],
  });

  return {
    bundle,
    selectedOption,
    semanticSummaries,
    nodes: { n1, n2, n3, n4, n5 },
  };
}

async function runV1bHarnessHttpSetupToN3(app, suffix, existingBundle = null) {
  const bundleResult = existingBundle
    ? existingV1bInputBundleResult(existingBundle)
    : await createV1bInputBundle(app, suffix);
  const bundle = bundleResult.v1bInputBundle;
  const acceptedProfile = acceptedConstraintProfilePayload();
  const semanticSummaries = [];

  const n1Input = v1bHarnessN1Request(bundle, suffix);
  const n1 = await invokeV1bHarnessNode(app, n1Input);

  const n2Input = v1bHarnessN2Request(bundle, n1, suffix, acceptedProfile);
  const n2Semantic = await generateEarlySemanticSupportArtifactWithFreshRuntime(
    app,
    n2Input,
    n2ConstraintProfileSupportSlot(),
    acceptedProfile,
  );
  semanticSummaries.push(n2Semantic.summary);
  const n2 = await invokeV1bHarnessNode(app, {
    ...n2Input,
    semantic_artifacts: [n2Semantic.semanticArtifact],
  });

  const n3Input = v1bHarnessN3Request(n1, n2, suffix);
  const n3Semantic = await generateEarlySemanticSupportArtifactWithFreshRuntime(
    app,
    n3Input,
    n3ReadinessClassificationSlot(),
    v1bHarnessN3ReadinessClassificationSupport(n3Input),
  );
  semanticSummaries.push(n3Semantic.summary);
  const n3 = await invokeV1bHarnessNode(app, {
    ...n3Input,
    semantic_artifacts: [n3Semantic.semanticArtifact],
  });

  return {
    bundle,
    acceptedProfile,
    semanticSummaries,
    nodes: { n1, n2, n3 },
  };
}

async function runReadyN6Fixture(app, setup, suffix, draftFactory = v1bHarnessN6Draft) {
  const n6Input = await v1bHarnessN6Request(app, setup.nodes.n5, suffix);
  const n6Payload = draftFactory(setup.bundle, n6Input);
  const n6Semantic = await recordCodexAssistedSemanticDraft(app, n6Input, n6DraftSlot(), n6Payload);
  const n6 = await invokeV1bHarnessNode(app, {
    ...n6Semantic.invocationInput,
    semantic_artifacts: [n6Semantic.semanticArtifact],
  });
  assert.ok(n6.handoff_ref, JSON.stringify(n6));
  const candidates = await listV1bHarnessCandidates(app, n6);
  return {
    candidates,
    n6,
    n6Input,
    semanticSummaries: [n6Semantic.summary],
  };
}

async function assertN4RuntimePromptIndex(prisma, startedAt, expectedPromptPacketHashes = []) {
  assertPromptPacketIndexModelMetadataOnly(prisma);
  const snapshot = await promptPacketIndexSnapshot(prisma, startedAt);
  const expectedHashes = [...new Set(expectedPromptPacketHashes)];
  assert.ok(
    snapshot.n4_rows.some((row) =>
      row.invocation_slot_id === N4_RUNTIME_DRAFT_SLOT_ID
      && row.prompt_variant_key === 'n4_research_slice_option_draft.initial_from_n3'
    ),
    'Expected Prisma prompt packet index row for n4_research_slice_option_draft.initial_from_n3.',
  );
  if (expectedHashes.length > 0) {
    assert.equal(
      snapshot.n4_rows.length,
      expectedHashes.length,
      'Expected exactly one N4 prompt packet index row for each generated N4 runtime prompt hash.',
    );
    for (const promptPacketHash of expectedHashes) {
      assert.ok(
        snapshot.n4_rows.some((row) => row.prompt_packet_hash === promptPacketHash),
        `Expected N4 prompt packet index row for ${promptPacketHash}.`,
      );
    }
  }
  for (const row of snapshot.n4_rows) {
    assert.match(row.prompt_packet_hash, /^[a-f0-9]{64}$/);
    assert.equal(row.model_option_id, null);
    assert.equal(
      row.context_policy_profile_id,
      'topic-selection.v1b.n4.research-slice-options.context-runtime@v1',
    );
    assert.equal(row.output_contract, 'ResearchSliceOptionSetDraft@v1');
    assert.ok(row.has_provenance_ref, 'Prompt index row must store provenance ref metadata.');
    assert.ok(row.has_redacted_prompt_artifact_ref, 'Prompt index row must store redacted prompt ref metadata.');
    assert.ok(row.has_prompt_quality_report_ref, 'Prompt index row must store prompt quality report ref metadata.');
    assert.equal(Object.hasOwn(row, 'messages'), false);
    assert.equal(Object.hasOwn(row, 'provider_response'), false);
  }
  return snapshot;
}

async function assertEarlySemanticRuntimePromptIndex(prisma, startedAt, expectedPromptPacketHashes = []) {
  assertPromptPacketIndexModelMetadataOnly(prisma);
  const snapshot = await promptPacketIndexSnapshot(prisma, startedAt);
  const expectedHashes = [...new Set(expectedPromptPacketHashes)];
  const expectedBySlot = new Map([
    ['n2_constraint_profile_semantic_support', {
      context_policy_profile_id: 'topic-selection.v1b.n2.constraint-profile-support.context-runtime@v1',
      output_contract: 'ResearchConstraintProfileDraftSupport@v1',
    }],
    ['n3_readiness_classification', {
      context_policy_profile_id: 'topic-selection.v1b.n3.intake-readiness-support.context-runtime@v1',
      output_contract: 'IntakeReadinessClassificationSupport@v1',
    }],
    ['n5_slice_selection_review', {
      context_policy_profile_id: 'topic-selection.v1b.n5.slice-selection-support.context-runtime@v1',
      output_contract: 'ResearchSliceSelectionReviewSupport@v1',
    }],
  ]);
  for (const slotId of EARLY_RUNTIME_SUPPORT_SLOT_IDS) {
    assert.ok(
      snapshot.early_rows.some((row) => row.invocation_slot_id === slotId),
      `Expected Prisma prompt packet index row for ${slotId}.`,
    );
  }
  if (expectedHashes.length > 0) {
    assert.equal(
      snapshot.early_rows.length,
      expectedHashes.length,
      'Expected exactly one early semantic prompt packet index row for each generated prompt hash.',
    );
    for (const promptPacketHash of expectedHashes) {
      assert.ok(
        snapshot.early_rows.some((row) => row.prompt_packet_hash === promptPacketHash),
        `Expected early semantic prompt packet index row for ${promptPacketHash}.`,
      );
    }
  }
  for (const row of snapshot.early_rows) {
    const expected = expectedBySlot.get(row.invocation_slot_id);
    assert.ok(expected, `Unexpected early semantic invocation slot ${row.invocation_slot_id}.`);
    assert.match(row.prompt_packet_hash, /^[a-f0-9]{64}$/);
    assert.equal(row.prompt_variant_key, row.invocation_slot_id);
    assert.equal(row.model_option_id, null);
    assert.equal(row.context_policy_profile_id, expected.context_policy_profile_id);
    assert.equal(row.output_contract, expected.output_contract);
    assert.ok(row.has_provenance_ref, 'Prompt index row must store provenance ref metadata.');
    assert.ok(row.has_redacted_prompt_artifact_ref, 'Prompt index row must store redacted prompt ref metadata.');
    assert.ok(row.has_prompt_quality_report_ref, 'Prompt index row must store prompt quality report ref metadata.');
    assert.equal(Object.hasOwn(row, 'messages'), false);
    assert.equal(Object.hasOwn(row, 'provider_response'), false);
  }
  return snapshot;
}

async function assertN7RuntimePromptIndex(prisma, startedAt) {
  const snapshot = await promptPacketIndexSnapshot(prisma, startedAt);
  for (const slotId of N7_RUNTIME_SUPPORT_SLOT_IDS) {
    assert.ok(
      snapshot.n7_rows.some((row) => row.invocation_slot_id === slotId),
      `Expected Prisma prompt packet index row for ${slotId}.`,
    );
  }
  for (const row of snapshot.n7_rows) {
    assert.match(row.prompt_packet_hash, /^[a-f0-9]{64}$/);
    assert.equal(row.model_option_id, null);
    assert.ok(row.has_provenance_ref, 'Prompt index row must store provenance ref metadata.');
    assert.ok(row.has_redacted_prompt_artifact_ref, 'Prompt index row must store redacted prompt ref metadata.');
    assert.ok(row.has_prompt_quality_report_ref, 'Prompt index row must store prompt quality report ref metadata.');
    assert.equal(Object.hasOwn(row, 'messages'), false);
    assert.equal(Object.hasOwn(row, 'provider_response'), false);
  }
  return snapshot;
}

async function assertN6RuntimePromptIndex(prisma, startedAt, expectedPromptPacketHashes = []) {
  assertPromptPacketIndexModelMetadataOnly(prisma);
  const snapshot = await promptPacketIndexSnapshot(prisma, startedAt);
  const expectedHashes = [...new Set(expectedPromptPacketHashes)];
  assert.ok(
    snapshot.n6_rows.some((row) =>
      row.invocation_slot_id === N6_RUNTIME_DRAFT_SLOT_ID
      && row.prompt_variant_key === 'n6_question_candidate_draft.initial_from_n5'
    ),
    'Expected Prisma prompt packet index row for n6_question_candidate_draft.initial_from_n5.',
  );
  if (expectedHashes.length > 0) {
    assert.equal(
      snapshot.n6_rows.length,
      expectedHashes.length,
      'Expected exactly one N6 prompt packet index row for each generated N6 runtime prompt hash.',
    );
    for (const promptPacketHash of expectedHashes) {
      assert.ok(
        snapshot.n6_rows.some((row) => row.prompt_packet_hash === promptPacketHash),
        `Expected N6 prompt packet index row for ${promptPacketHash}.`,
      );
    }
  }
  for (const row of snapshot.n6_rows) {
    assert.match(row.prompt_packet_hash, /^[a-f0-9]{64}$/);
    assert.equal(row.model_option_id, null);
    assert.equal(row.context_policy_profile_id, 'topic-selection.v1b.n6.question-candidate-draft.context-runtime@v1');
    assert.equal(row.output_contract, 'TopicQuestionCandidateSetDraft@v1');
    assert.ok(row.has_provenance_ref, 'Prompt index row must store provenance ref metadata.');
    assert.ok(row.has_redacted_prompt_artifact_ref, 'Prompt index row must store redacted prompt ref metadata.');
    assert.ok(row.has_prompt_quality_report_ref, 'Prompt index row must store prompt quality report ref metadata.');
    assert.equal(Object.hasOwn(row, 'messages'), false);
    assert.equal(Object.hasOwn(row, 'provider_response'), false);
  }
  return snapshot;
}

async function assertN6LoopbackRuntimePromptIndex(
  prisma,
  startedAt,
  expectedDraftPromptPacketHashes = [],
  expectedTriagePromptPacketHashes = [],
) {
  assertPromptPacketIndexModelMetadataOnly(prisma);
  const snapshot = await promptPacketIndexSnapshot(prisma, startedAt);
  const expectedDraftHashes = [...new Set(expectedDraftPromptPacketHashes)];
  const expectedTriageHashes = [...new Set(expectedTriagePromptPacketHashes)];
  const draftVariants = new Set(snapshot.n6_rows.map((row) => row.prompt_variant_key));
  assert.ok(
    draftVariants.has('n6_question_candidate_draft.regeneration_after_n7_loopback'),
    'Expected N6 prompt packet index row for regeneration_after_n7_loopback.',
  );
  assert.ok(
    draftVariants.has('n6_question_candidate_draft.regeneration_after_n6_gate_failure'),
    'Expected N6 prompt packet index row for regeneration_after_n6_gate_failure.',
  );
  assert.ok(
    snapshot.n6_loopback_triage_rows.some((row) => row.prompt_variant_key === N6_LOOPBACK_TRIAGE_SLOT_ID),
    'Expected N6 loopback triage prompt packet index row.',
  );
  for (const promptPacketHash of expectedDraftHashes) {
    assert.ok(
      snapshot.n6_rows.some((row) => row.prompt_packet_hash === promptPacketHash),
      `Expected N6 draft prompt packet index row for ${promptPacketHash}.`,
    );
  }
  for (const promptPacketHash of expectedTriageHashes) {
    assert.ok(
      snapshot.n6_loopback_triage_rows.some((row) => row.prompt_packet_hash === promptPacketHash),
      `Expected N6 triage prompt packet index row for ${promptPacketHash}.`,
    );
  }
  for (const row of [...snapshot.n6_rows, ...snapshot.n6_loopback_triage_rows]) {
    assert.match(row.prompt_packet_hash, /^[a-f0-9]{64}$/);
    assert.equal(row.model_option_id, null);
    assert.ok(row.has_provenance_ref, 'Prompt index row must store provenance ref metadata.');
    assert.ok(row.has_redacted_prompt_artifact_ref, 'Prompt index row must store redacted prompt ref metadata.');
    assert.ok(row.has_prompt_quality_report_ref, 'Prompt index row must store prompt quality report ref metadata.');
    assert.equal(Object.hasOwn(row, 'messages'), false);
    assert.equal(Object.hasOwn(row, 'provider_response'), false);
  }
  return snapshot;
}

async function assertN8RuntimePromptIndex(prisma, startedAt, expectedPromptPacketHashes = []) {
  assertPromptPacketIndexModelMetadataOnly(prisma);
  const snapshot = await promptPacketIndexSnapshot(prisma, startedAt);
  const expectedHashes = [...new Set(expectedPromptPacketHashes)];
  assert.ok(
    snapshot.n8_rows.some((row) =>
      row.invocation_slot_id === N8_RUNTIME_DRAFT_SLOT_ID
      && row.prompt_variant_key === 'n8_value_assessment_draft.initial_from_n7'
    ),
    'Expected Prisma prompt packet index row for n8_value_assessment_draft.initial_from_n7.',
  );
  if (expectedHashes.length > 0) {
    assert.equal(
      snapshot.n8_rows.length,
      expectedHashes.length,
      'Expected exactly one N8 prompt packet index row for each generated N8 runtime prompt hash.',
    );
    for (const promptPacketHash of expectedHashes) {
      assert.ok(
        snapshot.n8_rows.some((row) => row.prompt_packet_hash === promptPacketHash),
        `Expected N8 prompt packet index row for ${promptPacketHash}.`,
      );
    }
  }
  for (const row of snapshot.n8_rows) {
    assert.match(row.prompt_packet_hash, /^[a-f0-9]{64}$/);
    assert.equal(row.model_option_id, null);
    assert.equal(row.context_policy_profile_id, 'topic-selection.v1b.n8.topic-value-assessment.context-runtime@v1');
    assert.equal(row.output_contract, 'TopicValueAssessmentDraft@v1');
    assert.ok(row.has_provenance_ref, 'Prompt index row must store provenance ref metadata.');
    assert.ok(row.has_redacted_prompt_artifact_ref, 'Prompt index row must store redacted prompt ref metadata.');
    assert.ok(row.has_prompt_quality_report_ref, 'Prompt index row must store prompt quality report ref metadata.');
    assert.equal(Object.hasOwn(row, 'messages'), false);
    assert.equal(Object.hasOwn(row, 'provider_response'), false);
  }
  return snapshot;
}

async function assertLoopbackProjection(app, result) {
  const projection = await runtimeContextProjection(
    app,
    result,
    'v1b_n7_to_n6_failed_trial_loopback_context',
    'n7_loopback_to_n6',
  );
  return projection.payload;
}

async function runtimeContextProjection(app, result, expectedProjectionKind, expectedLoopbackTargetCode) {
  const trace = await getWorkflowHarnessTraceSnapshotPayload(result.trace_snapshot_ref);
  const projectionRef = trace.runtime_context_projection_ref;
  assert.equal(projectionRef?.ref_type, 'artifact_ref');
  const projectionArtifact = await getWorkflowHarnessArtifact(app, projectionRef);
  assert.equal(projectionArtifact.artifact_kind, 'diagnostic');
  assert.equal(projectionArtifact.payload?.projection_kind, expectedProjectionKind);
  assert.equal(projectionArtifact.payload?.non_authority, true);
  assert.equal(projectionArtifact.payload?.loopback_target_code, expectedLoopbackTargetCode);
  return {
    ref: projectionRef,
    artifact: projectionArtifact,
    payload: projectionArtifact.payload,
  };
}

async function runEarlySemanticRuntimeSmoke(app, suffix, existingBundle = null) {
  const startedAt = new Date();
  const prisma = new PrismaClient();
  const earlyRuntime = createEarlySemanticSupportRuntime(prisma);
  try {
    const promptIndexBefore = await promptPacketIndexSnapshot(prisma);
    const bundleResult = existingBundle
      ? existingV1bInputBundleResult(existingBundle)
      : await createV1bInputBundle(app, suffix);
    const bundle = bundleResult.v1bInputBundle;
    const acceptedProfile = acceptedConstraintProfilePayload();
    const semanticSummaries = [];

    const n1Input = v1bHarnessN1Request(bundle, suffix);
    const n1 = await invokeV1bHarnessNode(app, n1Input);

    const n2Input = {
      ...v1bHarnessN2Request(bundle, n1, `${suffix}_n2_runtime`, acceptedProfile),
      run_mode: 'product',
    };
    const n2Support = await generateEarlySemanticSupportArtifact(
      app,
      earlyRuntime,
      n2Input,
      n2ConstraintProfileSupportSlot(),
      acceptedProfile,
      { runMode: 'product', operatorLabel: 'v1b-early-runtime-smoke-n2' },
    );
    semanticSummaries.push(n2Support.summary);
    const n2 = await invokeV1bHarnessNode(app, {
      ...n2Input,
      semantic_artifacts: [n2Support.semanticArtifact],
    });
    assert.equal(n2.gate_status, 'admitted');
    const n2Replay = await invokeV1bHarnessNode(app, {
      ...n2Input,
      semantic_artifacts: [n2Support.semanticArtifact],
    });
    assert.equal(n2Replay.replay_provenance?.replayed, true);
    assert.equal(n2Replay.authority_ref?.ref_id, n2.authority_ref?.ref_id);

    const n2DriftInput = {
      ...v1bHarnessN2Request(bundle, n1, `${suffix}_n2_source_drift`, acceptedProfile),
      run_mode: 'product',
    };
    const n2DriftSupport = await generateEarlySemanticSupportArtifact(
      app,
      earlyRuntime,
      n2DriftInput,
      n2ConstraintProfileSupportSlot(),
      acceptedProfile,
      { runMode: 'product', operatorLabel: 'v1b-early-runtime-smoke-n2-source-drift' },
    );
    semanticSummaries.push(n2DriftSupport.summary);
    const n2SourceDrift = await invokeV1bHarnessNode(app, {
      ...n2DriftInput,
      semantic_artifacts: [{
        ...n2DriftSupport.semanticArtifact,
        source_hashes: {
          ...n2DriftSupport.semanticArtifact.source_hashes,
          v1a_bundle_hash: 'f'.repeat(64),
        },
      }],
    });
    assert.equal(n2SourceDrift.gate_status, 'blocked');
    assert.equal(n2SourceDrift.error_code, 'V1B_EARLY_SUPPORT_ARTIFACT_SOURCE_HASH_DRIFT');
    assert.equal(n2SourceDrift.authority_ref, null);
    assert.equal(n2SourceDrift.handoff_ref, null);

    const n3Input = {
      ...v1bHarnessN3Request(n1, n2, `${suffix}_n3_runtime`),
      run_mode: 'product',
    };
    const n3Support = await generateEarlySemanticSupportArtifact(
      app,
      earlyRuntime,
      n3Input,
      n3ReadinessClassificationSlot(),
      v1bHarnessN3ReadinessClassificationSupport(n3Input),
      { runMode: 'product', operatorLabel: 'v1b-early-runtime-smoke-n3' },
    );
    semanticSummaries.push(n3Support.summary);

    const fakeReadinessRef = ref(
      'v1b_intake_readiness_assessment',
      n3Support.semanticArtifact.normalized_output_ref.ref_id,
      n1.authority_ref.title_card_id,
    );
    const n4BypassInput = v1bHarnessN4Request(
      n1,
      n2,
      {
        authority_ref: fakeReadinessRef,
        hashes: {
          authority_hash: n3Support.semanticArtifact.normalized_output_hash,
          handoff_hash: 'b'.repeat(64),
        },
      },
      `${suffix}_n4_no_n3_bypass`,
    );
    const n4BypassSemantic = await recordCodexAssistedSemanticDraft(
      app,
      n4BypassInput,
      n4DraftSlot(),
      v1bHarnessN4Draft(bundle),
    );
    const n4Bypass = await invokeV1bHarnessNode(app, {
      ...n4BypassSemantic.invocationInput,
      semantic_artifacts: [n4BypassSemantic.semanticArtifact],
    });
    assert.equal(n4Bypass.gate_status, 'blocked');
    assert.equal(n4Bypass.error_code, 'N4_FROZEN_AUTHORITY_NOT_FOUND');
    assert.equal(n4Bypass.authority_ref, null);
    assert.equal(n4Bypass.handoff_ref, null);

    const n3 = await invokeV1bHarnessNode(app, {
      ...n3Input,
      semantic_artifacts: [n3Support.semanticArtifact],
    });
    assert.ok(n3.authority_ref, JSON.stringify(n3));

    const n4Input = v1bHarnessN4Request(n1, n2, n3, `${suffix}_n4_bridge`);
    const n4Semantic = await recordCodexAssistedSemanticDraft(
      app,
      n4Input,
      n4DraftSlot(),
      v1bHarnessN4Draft(bundle),
    );
    const n4 = await invokeV1bHarnessNode(app, {
      ...n4Semantic.invocationInput,
      semantic_artifacts: [n4Semantic.semanticArtifact],
    });
    assert.ok(n4.authority_ref, JSON.stringify(n4));

    const selectedOption = await selectedV1bHarnessOption(app, n4);
    const n5Payload = acceptedV1bHarnessSliceSelectionPayload(selectedOption);
    const n5Input = {
      ...v1bHarnessN5Request(n4, n5Payload, `${suffix}_n5_runtime`, {
        authorityInputProvider: 'codex_delegated',
      }),
      run_mode: 'product',
    };
    const n5Support = await generateEarlySemanticSupportArtifact(
      app,
      earlyRuntime,
      n5Input,
      n5SliceSelectionSupportSlot(),
      n5Payload,
      { runMode: 'product', operatorLabel: 'v1b-early-runtime-smoke-n5' },
    );
    semanticSummaries.push(n5Support.summary);
    const n5 = await invokeV1bHarnessNode(app, {
      ...n5Input,
      semantic_artifacts: [n5Support.semanticArtifact],
    });
    assert.equal(n5.gate_status, 'admitted');
    const n5Replay = await invokeV1bHarnessNode(app, {
      ...n5Input,
      semantic_artifacts: [n5Support.semanticArtifact],
    });
    assert.equal(n5Replay.replay_provenance?.replayed, true);
    assert.equal(n5Replay.authority_ref?.ref_id, n5.authority_ref?.ref_id);

    const expectedPromptPacketHashes = [
      n2Support.summary.prompt_packet_hash,
      n2DriftSupport.summary.prompt_packet_hash,
      n3Support.summary.prompt_packet_hash,
      n5Support.summary.prompt_packet_hash,
    ];
    const expectedPromptPacketHashCount = new Set(expectedPromptPacketHashes).size;
    const promptIndexAfter = await promptPacketIndexSnapshot(prisma);
    assert.equal(
      promptIndexAfter.early_count - promptIndexBefore.early_count,
      expectedPromptPacketHashCount,
      'Expected early semantic prompt packet index delta to match generated runtime prompt hashes.',
    );
    const promptIndexCreated = await assertEarlySemanticRuntimePromptIndex(
      prisma,
      startedAt,
      expectedPromptPacketHashes,
    );

    return {
      bundle,
      selectedOption,
      semanticSummaries,
      prompt_index_before: promptIndexBefore,
      prompt_index_after: promptIndexAfter,
      prompt_index_created: promptIndexCreated,
      cases: [
        {
          case_id: 'n2_runtime_replay_and_source_drift',
          semantic_artifacts: [n2Support.summary, n2DriftSupport.summary],
          nodes: {
            n2: summarizeNode(n2),
            n2_replay: summarizeNode(n2Replay),
            n2_source_drift: summarizeNode(n2SourceDrift),
          },
        },
        {
          case_id: 'n3_support_no_n3_authority_bypass',
          semantic_artifacts: [n3Support.summary],
          nodes: {
            n4_no_n3_bypass: summarizeNode(n4Bypass),
            n3: summarizeNode(n3),
          },
        },
        {
          case_id: 'n5_runtime_delegated_selection_replay',
          semantic_artifacts: [n5Support.summary],
          nodes: {
            n4: summarizeNode(n4),
            n5: summarizeNode(n5),
            n5_replay: summarizeNode(n5Replay),
          },
        },
      ],
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function runN4RuntimeSmoke(app, suffix, existingBundle = null) {
  const startedAt = new Date();
  const prisma = new PrismaClient();
  const n4ResearchSliceRuntime = createN4RuntimeResearchSliceRuntime(prisma);
  try {
    const promptIndexBefore = await promptPacketIndexSnapshot(prisma);
    const setup = await runV1bHarnessHttpSetupToN3(app, `${suffix}_setup`, existingBundle);

    const n4Input = {
      ...v1bHarnessN4Request(setup.nodes.n1, setup.nodes.n2, setup.nodes.n3, `${suffix}_n4_runtime`),
      run_mode: 'product',
    };
    const planningInput = await buildN4PlanningInputFromAuthorities(
      prisma,
      setup.nodes.n1,
      setup.nodes.n2,
      setup.nodes.n3,
    );
    const draft = v1bHarnessN4Draft(setup.bundle);
    const runtimeDraft = await generateN4RuntimeDraftArtifact(
      app,
      n4ResearchSliceRuntime,
      n4Input,
      planningInput,
      draft,
      { runMode: 'product', operatorLabel: 'v1b-n4-runtime-smoke-initial' },
    );
    const n4 = await invokeV1bHarnessNode(app, {
      ...n4Input,
      semantic_artifacts: [runtimeDraft.semanticArtifact],
    });
    assert.ok(['admitted', 'admitted_with_warnings'].includes(n4.gate_status));
    assert.equal(n4.route_decision, 'invoke_next');
    assert.equal(n4.authority_ref?.ref_type, 'research_slice_option_set');
    assert.equal(n4.handoff_ref?.ref_type, 'artifact_ref');

    const artifactRefsBeforeReplay = await prisma.topicSelectionArtifactRef.count({
      where: { workflowRunId: n4Input.workflow_run_id },
    });
    const replay = await invokeV1bHarnessNode(app, {
      ...n4Input,
      semantic_artifacts: [runtimeDraft.semanticArtifact],
    });
    const artifactRefsAfterReplay = await prisma.topicSelectionArtifactRef.count({
      where: { workflowRunId: n4Input.workflow_run_id },
    });
    assert.equal(replay.replay_provenance?.replayed, true);
    assert.equal(replay.authority_ref?.ref_id, n4.authority_ref?.ref_id);
    assert.equal(replay.handoff_ref?.ref_id, n4.handoff_ref?.ref_id);
    assert.equal(artifactRefsAfterReplay, artifactRefsBeforeReplay);

    const driftInput = {
      ...v1bHarnessN4Request(setup.nodes.n1, setup.nodes.n2, setup.nodes.n3, `${suffix}_n4_source_drift`),
      run_mode: 'product',
    };
    const driftDraftPayload = v1bHarnessN4Draft(setup.bundle);
    const driftDraft = await generateN4RuntimeDraftArtifact(
      app,
      n4ResearchSliceRuntime,
      driftInput,
      planningInput,
      driftDraftPayload,
      { runMode: 'product', operatorLabel: 'v1b-n4-runtime-smoke-source-drift' },
    );
    const drift = await invokeV1bHarnessNode(app, {
      ...driftInput,
      semantic_artifacts: [{
        ...driftDraft.semanticArtifact,
        source_hashes: {
          ...driftDraft.semanticArtifact.source_hashes,
          n3_handoff_hash: '9'.repeat(64),
        },
      }],
    });
    assert.equal(drift.gate_status, 'blocked');
    assert.equal(drift.error_code, 'N4_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT');
    assert.equal(drift.authority_ref, null);
    assert.equal(drift.handoff_ref, null);

    const expectedPromptPacketHashes = [
      runtimeDraft.summary.prompt_packet_hash,
      driftDraft.summary.prompt_packet_hash,
    ];
    const expectedPromptPacketHashCount = new Set(expectedPromptPacketHashes).size;
    const promptIndexAfter = await promptPacketIndexSnapshot(prisma);
    assert.equal(
      promptIndexAfter.n4_count - promptIndexBefore.n4_count,
      expectedPromptPacketHashCount,
      'Expected N4 prompt packet index delta to match generated N4 runtime prompt hashes.',
    );
    const promptIndexCreated = await assertN4RuntimePromptIndex(
      prisma,
      startedAt,
      expectedPromptPacketHashes,
    );
    return {
      bundle: setup.bundle,
      selectedOption: await selectedV1bHarnessOption(app, n4),
      setupSemanticSummaries: setup.semanticSummaries,
      setupNodes: setup.nodes,
      prompt_index_before: promptIndexBefore,
      prompt_index_after: promptIndexAfter,
      prompt_index_created: promptIndexCreated,
      cases: [
        {
          case_id: 'n4_runtime_initial_to_n5_handoff',
          semantic_artifacts: [runtimeDraft.summary],
          nodes: {
            n4: summarizeNode(n4),
            replay: summarizeNode(replay),
          },
        },
        {
          case_id: 'n4_runtime_source_drift_blocks',
          semantic_artifacts: [driftDraft.summary],
          nodes: {
            n4_drift: summarizeNode(drift),
          },
        },
      ],
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function runN7RuntimeForwardVariant(app, setup, n7SupportRuntime, suffix) {
  const ready = await runReadyN6Fixture(
    app,
    setup,
    `${suffix}_n6_two_candidates`,
    v1bHarnessN6TwoCandidateDraft,
  );
  const n7Input = {
    ...(await v1bHarnessN7Request(app, ready.n6, `${suffix}_n7_grouped`)),
    run_mode: 'product',
  };
  const groupingSupport = await generateN7RuntimeSupportArtifact(
    app,
    n7SupportRuntime,
    n7Input,
    n7CandidateGroupingSlot(),
    n7CandidateGroupingPayload(n7Input),
    { runMode: 'product', operatorLabel: 'v1b-n7-runtime-smoke-grouping' },
  );
  const n7 = await invokeV1bHarnessNode(app, {
    ...n7Input,
    semantic_artifacts: [groupingSupport.semanticArtifact],
  });
  assert.equal(n7.route_decision, 'invoke_next');
  assert.ok(['admitted', 'admitted_with_warnings'].includes(n7.gate_status));
  assert.ok(n7.warnings.some((warning) => warning.code === 'candidate_grouping_preserved'));

  const n8Input = await v1bHarnessN8Request(app, n7, `${suffix}_n8_downstream`);
  const n8Semantic = await recordCodexAssistedSemanticDraft(
    app,
    n8Input,
    n8DraftSlot(),
    v1bHarnessN8ValueDraft(n8Input),
  );
  const n8 = await invokeV1bHarnessNode(app, {
    ...n8Semantic.invocationInput,
    semantic_artifacts: [n8Semantic.semanticArtifact],
  });
  assert.ok(['admitted', 'admitted_with_warnings'].includes(n8.gate_status));
  assert.equal(n8.route_decision, 'invoke_next');

  return {
    case_id: 'n7_runtime_grouping_to_n8',
    semantic_artifacts: [...ready.semanticSummaries, groupingSupport.summary, n8Semantic.summary],
    nodes: {
      n6: summarizeNode(ready.n6),
      n7: summarizeNode(n7),
      n8: summarizeNode(n8),
    },
  };
}

async function runN7RuntimeReadmissionVariant(app, setup, n7SupportRuntime, suffix) {
  const ready = await runReadyN6Fixture(app, setup, `${suffix}_n6_ready`);
  const n7InitialInput = await v1bHarnessN7Request(app, ready.n6, `${suffix}_n7_initial`);
  const n7Initial = await invokeV1bHarnessNode(app, n7InitialInput);
  assert.equal(n7Initial.route_decision, 'invoke_next');

  const n8RejectedInput = await v1bHarnessN8Request(app, n7Initial, `${suffix}_n8_blocking_gate`);
  const n8Semantic = await recordCodexAssistedSemanticDraft(
    app,
    n8RejectedInput,
    n8DraftSlot(),
    v1bHarnessN8BlockingGateDraft(n8RejectedInput),
  );
  const n8Rejected = await invokeV1bHarnessNode(app, {
    ...n8Semantic.invocationInput,
    semantic_artifacts: [n8Semantic.semanticArtifact],
  });
  assert.equal(n8Rejected.gate_status, 'blocked');
  assert.equal(n8Rejected.error_code, 'N8_ADVANCE_WITH_BLOCKING_GATE');

  const feedbackInput = {
    ...(await v1bHarnessN7FeedbackRequest(
      app,
      n7InitialInput,
      n7Initial,
      'gate_rejected',
      n8Rejected.hashes.gate_result_hash,
      `${suffix}_n7_feedback`,
    )),
    run_mode: 'product',
  };
  const debateSupport = await generateN7RuntimeSupportArtifact(
    app,
    n7SupportRuntime,
    feedbackInput,
    n7DebateAdmissionSlot(),
    n7DebateAdmissionPayload(),
    { runMode: 'product', operatorLabel: 'v1b-n7-runtime-smoke-debate-admission' },
  );
  const readmitted = await invokeV1bHarnessNode(app, {
    ...feedbackInput,
    semantic_artifacts: [debateSupport.semanticArtifact],
  });
  assert.equal(readmitted.gate_status, 'admitted_with_warnings');
  assert.equal(readmitted.route_decision, 'invoke_next');
  assert.equal(readmitted.authority_ref?.ref_id, n7Initial.authority_ref?.ref_id);

  return {
    case_id: 'n8_gate_rejection_runtime_readmission',
    semantic_artifacts: [...ready.semanticSummaries, n8Semantic.summary, debateSupport.summary],
    nodes: {
      n6: summarizeNode(ready.n6),
      n7_initial: summarizeNode(n7Initial),
      n8_blocking_gate: summarizeNode(n8Rejected),
      n7_readmitted: summarizeNode(readmitted),
    },
  };
}

// T-123 P3 / DP-3.6: the N8 debate trigger->loopback->feedback-readmit->after-debate loop, end-to-end
// through the real harness. Scope note: this exercises the harness's DETERMINISTIC machinery (T1 trigger
// detection, first-pass loopback, the N7 feedback_from_n8 readmission + n7_n8_debate_admission_review
// support, and the after-debate warning) on the single-agent value draft. The 4-role bounded-debate
// runDebate runtime is NOT driven here — it is covered by its own unit test
// (topic-selection-v1b-n8-bounded-debate-runtime-service.unit.test.ts) and is intentionally caller-side.
// The feedback frozen input is built by v1bHarnessN7FeedbackRequest in the SHAPE the coordinator's
// feedback_from_n8 recipe assembles and is validated here against the real N7 feedback parser, but it is
// NOT byte-asserted against the coordinator's buildNextRequest output (the coordinator recipe has its own
// unit coverage). Flow: borderline draft (total_score in [60,72) -> T1) loops back to N7; N7 readmits in
// feedback mode; the still-borderline re-eval re-enters N8, which admits with an after-debate WARNING.
async function runN8DebateTriggerLoopVariant(app, setup, n7SupportRuntime, suffix) {
  const ready = await runReadyN6Fixture(app, setup, `${suffix}_n6_ready`);
  const n7InitialInput = await v1bHarnessN7Request(app, ready.n6, `${suffix}_n7_initial`);
  const n7Initial = await invokeV1bHarnessNode(app, n7InitialInput);
  assert.equal(n7Initial.route_decision, 'invoke_next');

  // First N8 eval with a BORDERLINE value draft. total_score 66 is gate-valid (advance_to_package
  // floor is 60) yet trips T1; the first-pass admission (initial_from_n6) arms the loopback.
  const n8FirstInput = await v1bHarnessN8Request(app, n7Initial, `${suffix}_n8_first`);
  const n8FirstSemantic = await recordCodexAssistedSemanticDraft(
    app,
    n8FirstInput,
    n8DraftSlot(),
    { ...v1bHarnessN8ValueDraft(n8FirstInput), total_score: 66 },
  );
  const n8Loopback = await invokeV1bHarnessNode(app, {
    ...n8FirstSemantic.invocationInput,
    semantic_artifacts: [n8FirstSemantic.semanticArtifact],
  });
  assert.equal(n8Loopback.route_decision, 'loopback');
  assert.ok(
    (n8Loopback.blockers ?? []).some((issue) => issue.code === 'N8_VALUE_BORDERLINE_DEBATE_TRIGGER'),
    'first-pass borderline value draft must trip the T1 debate-trigger loopback',
  );

  // N7 feedback re-entry (feedback_from_n8) + the n7_n8_debate_admission_review support -> readmit.
  const feedbackInput = {
    ...(await v1bHarnessN7FeedbackRequest(
      app,
      n7InitialInput,
      n7Initial,
      'gate_rejected',
      n8Loopback.hashes.gate_result_hash,
      `${suffix}_n7_feedback`,
    )),
    run_mode: 'product',
  };
  const debateSupport = await generateN7RuntimeSupportArtifact(
    app,
    n7SupportRuntime,
    feedbackInput,
    n7DebateAdmissionSlot(),
    n7DebateAdmissionPayload(),
    { runMode: 'product', operatorLabel: 'v1b-n8-debate-loop-admission' },
  );
  const readmitted = await invokeV1bHarnessNode(app, {
    ...feedbackInput,
    semantic_artifacts: [debateSupport.semanticArtifact],
  });
  assert.equal(readmitted.gate_status, 'admitted_with_warnings');
  assert.equal(readmitted.route_decision, 'invoke_next');

  // N8 RE-EVAL: the readmitted handoff carries the feedback_from_n8 debate admission, so the SAME
  // borderline trigger downgrades to an after-debate warning and N8 admits — the loop is closed.
  const n8ReevalInput = await v1bHarnessN8Request(app, readmitted, `${suffix}_n8_reeval`);
  const n8ReevalSemantic = await recordCodexAssistedSemanticDraft(
    app,
    n8ReevalInput,
    n8DraftSlot(),
    { ...v1bHarnessN8ValueDraft(n8ReevalInput), total_score: 66 },
  );
  const n8Reeval = await invokeV1bHarnessNode(app, {
    ...n8ReevalSemantic.invocationInput,
    semantic_artifacts: [n8ReevalSemantic.semanticArtifact],
  });
  assert.equal(n8Reeval.gate_status, 'admitted_with_warnings');
  assert.equal(n8Reeval.route_decision, 'invoke_next');
  assert.ok(
    (n8Reeval.warnings ?? []).some((issue) => issue.code === 'N8_VALUE_BORDERLINE_AFTER_DEBATE'),
    'N8 re-eval after debate must carry the after-debate borderline warning (not a re-loop)',
  );

  return {
    case_id: 'n8_debate_trigger_loop',
    semantic_artifacts: [...ready.semanticSummaries, debateSupport.summary],
    nodes: {
      n6: summarizeNode(ready.n6),
      n7_initial: summarizeNode(n7Initial),
      n8_first_loopback: summarizeNode(n8Loopback),
      n7_readmitted: summarizeNode(readmitted),
      n8_reeval: summarizeNode(n8Reeval),
    },
  };
}

async function runN7RuntimeExhaustionVariant(app, setup, n7SupportRuntime, suffix) {
  const ready = await runReadyN6Fixture(
    app,
    setup,
    `${suffix}_n6_two_candidates`,
    v1bHarnessN6TwoCandidateDraft,
  );
  const n7InitialInput = await v1bHarnessN7Request(app, ready.n6, `${suffix}_n7_first_trial`);
  const firstTrial = await invokeV1bHarnessNode(app, n7InitialInput);
  assert.equal(firstTrial.route_decision, 'invoke_next');

  const firstN8Input = await v1bHarnessN8Request(app, firstTrial, `${suffix}_n8_first_non_advance`);
  const firstN8Semantic = await recordCodexAssistedSemanticDraft(
    app,
    firstN8Input,
    n8DraftSlot(),
    v1bHarnessN8NonAdvanceDraft(firstN8Input),
  );
  const firstN8 = await invokeV1bHarnessNode(app, {
    ...firstN8Semantic.invocationInput,
    semantic_artifacts: [firstN8Semantic.semanticArtifact],
  });
  assert.equal(firstN8.route_decision, 'invoke_next');
  assert.ok(firstN8.authority_ref);

  const secondTrialInput = await v1bHarnessN7FeedbackRequest(
    app,
    n7InitialInput,
    firstTrial,
    'semantic_candidate_failure',
    firstN8.hashes.gate_result_hash,
    `${suffix}_n7_second_trial`,
    firstN8,
  );
  const secondTrial = await invokeV1bHarnessNode(app, secondTrialInput);
  assert.equal(secondTrial.route_decision, 'invoke_next');
  assert.notEqual(secondTrial.authority_ref?.ref_id, firstTrial.authority_ref?.ref_id);

  const secondN8Input = await v1bHarnessN8Request(app, secondTrial, `${suffix}_n8_second_non_advance`);
  const secondN8Semantic = await recordCodexAssistedSemanticDraft(
    app,
    secondN8Input,
    n8DraftSlot(),
    v1bHarnessN8NonAdvanceDraft(secondN8Input),
  );
  const secondN8 = await invokeV1bHarnessNode(app, {
    ...secondN8Semantic.invocationInput,
    semantic_artifacts: [secondN8Semantic.semanticArtifact],
  });
  assert.equal(secondN8.route_decision, 'invoke_next');
  assert.ok(secondN8.authority_ref);

  const exhaustedInput = {
    ...(await v1bHarnessN7FeedbackRequest(
      app,
      n7InitialInput,
      secondTrial,
      'semantic_candidate_failure',
      secondN8.hashes.gate_result_hash,
      `${suffix}_n7_exhausted`,
      secondN8,
    )),
    run_mode: 'product',
  };
  const refreshedCandidates = await listV1bHarnessCandidates(app, ready.n6);
  const synthesisSupport = await generateN7RuntimeSupportArtifact(
    app,
    n7SupportRuntime,
    exhaustedInput,
    n7FailedTrialSynthesisSlot(),
    n7FailedTrialSynthesisPayload(ready.n6, refreshedCandidates),
    { runMode: 'product', operatorLabel: 'v1b-n7-runtime-smoke-failed-trial' },
  );
  const exhausted = await invokeV1bHarnessNode(app, {
    ...exhaustedInput,
    semantic_artifacts: [synthesisSupport.semanticArtifact],
  });
  assert.equal(exhausted.gate_status, 'blocked');
  assert.equal(exhausted.route_decision, 'loopback');
  assert.equal(exhausted.error_code, 'N7_CANDIDATE_TRIALS_EXHAUSTED');
  const loopbackProjection = await assertLoopbackProjection(app, exhausted);

  return {
    case_id: 'n7_runtime_failed_trial_to_n6_loopback',
    candidate_count: ready.candidates.length,
    loopback_projection_kind: loopbackProjection.projection_kind,
    semantic_artifacts: [
      ...ready.semanticSummaries,
      firstN8Semantic.summary,
      secondN8Semantic.summary,
      synthesisSupport.summary,
    ],
    nodes: {
      n6: summarizeNode(ready.n6),
      n7_first_trial: summarizeNode(firstTrial),
      n8_first_non_advance: summarizeNode(firstN8),
      n7_second_trial: summarizeNode(secondTrial),
      n8_second_non_advance: summarizeNode(secondN8),
      n7_exhausted: summarizeNode(exhausted),
    },
  };
}

async function runN7RuntimeSmoke(app, suffix, existingBundle = null) {
  const startedAt = new Date();
  const prisma = new PrismaClient();
  const n7SupportRuntime = createN7RuntimeSupportRuntime(prisma);
  try {
    const promptIndexBefore = await promptPacketIndexSnapshot(prisma);
    const setup = await runV1bHarnessHttpSetupToN5(app, `${suffix}_setup`, existingBundle);
    const cases = [
      await runN7RuntimeForwardVariant(app, setup, n7SupportRuntime, `${suffix}_forward`),
      await runN7RuntimeReadmissionVariant(app, setup, n7SupportRuntime, `${suffix}_readmission`),
      await runN8DebateTriggerLoopVariant(app, setup, n7SupportRuntime, `${suffix}_debate_loop`),
      await runN7RuntimeExhaustionVariant(app, setup, n7SupportRuntime, `${suffix}_exhaustion`),
    ];
    const promptIndexAfter = await promptPacketIndexSnapshot(prisma);
    const promptIndexCreated = await assertN7RuntimePromptIndex(prisma, startedAt);
    return {
      bundle: setup.bundle,
      selectedOption: setup.selectedOption,
      setupSemanticSummaries: setup.semanticSummaries,
      setupNodes: setup.nodes,
      prompt_index_before: promptIndexBefore,
      prompt_index_after: promptIndexAfter,
      prompt_index_created: promptIndexCreated,
      cases,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function runN6RuntimeSmoke(app, suffix, existingBundle = null) {
  const startedAt = new Date();
  const prisma = new PrismaClient();
  const n6DraftRuntime = createN6RuntimeDraftRuntime(prisma);
  try {
    const promptIndexBefore = await promptPacketIndexSnapshot(prisma);
    const setup = await runV1bHarnessHttpSetupToN5(app, `${suffix}_setup`, existingBundle);

    const n6Input = {
      ...(await v1bHarnessN6Request(app, setup.nodes.n5, `${suffix}_n6_runtime`)),
      run_mode: 'product',
    };
    const draft = v1bHarnessN6Draft(setup.bundle, n6Input);
    const runtimeDraft = await generateN6RuntimeDraftArtifact(
      app,
      n6DraftRuntime,
      n6Input,
      draft,
      { runMode: 'product', operatorLabel: 'v1b-n6-runtime-smoke-initial' },
    );
    const n6 = await invokeV1bHarnessNode(app, {
      ...n6Input,
      semantic_artifacts: [runtimeDraft.semanticArtifact],
    });
    assert.equal(n6.gate_status, 'admitted');
    assert.equal(n6.route_decision, 'invoke_next');
    assert.equal(n6.authority_ref?.ref_type, 'topic_question_candidate_set');
    assert.equal(n6.handoff_ref?.ref_type, 'artifact_ref');

    const artifactRefsBeforeReplay = await prisma.topicSelectionArtifactRef.count({
      where: { workflowRunId: n6Input.workflow_run_id },
    });
    const replay = await invokeV1bHarnessNode(app, {
      ...n6Input,
      semantic_artifacts: [runtimeDraft.semanticArtifact],
    });
    const artifactRefsAfterReplay = await prisma.topicSelectionArtifactRef.count({
      where: { workflowRunId: n6Input.workflow_run_id },
    });
    assert.equal(replay.replay_provenance?.replayed, true);
    assert.equal(replay.authority_ref?.ref_id, n6.authority_ref?.ref_id);
    assert.equal(replay.handoff_ref?.ref_id, n6.handoff_ref?.ref_id);
    assert.equal(artifactRefsAfterReplay, artifactRefsBeforeReplay);

    const driftInput = {
      ...(await v1bHarnessN6Request(app, setup.nodes.n5, `${suffix}_n6_source_drift`)),
      run_mode: 'product',
    };
    const driftDraftPayload = v1bHarnessN6Draft(setup.bundle, driftInput);
    const driftDraft = await generateN6RuntimeDraftArtifact(
      app,
      n6DraftRuntime,
      driftInput,
      driftDraftPayload,
      { runMode: 'product', operatorLabel: 'v1b-n6-runtime-smoke-source-drift' },
    );
    const drift = await invokeV1bHarnessNode(app, {
      ...driftInput,
      semantic_artifacts: [{
        ...driftDraft.semanticArtifact,
        source_hashes: {
          ...driftDraft.semanticArtifact.source_hashes,
          n5_handoff_hash: '9'.repeat(64),
        },
      }],
    });
    assert.equal(drift.gate_status, 'blocked');
    assert.equal(drift.error_code, 'N6_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT');
    assert.equal(drift.authority_ref, null);
    assert.equal(drift.handoff_ref, null);

    const expectedPromptPacketHashes = [
      runtimeDraft.summary.prompt_packet_hash,
      driftDraft.summary.prompt_packet_hash,
    ];
    const expectedPromptPacketHashCount = new Set(expectedPromptPacketHashes).size;
    const promptIndexAfter = await promptPacketIndexSnapshot(prisma);
    assert.equal(
      promptIndexAfter.n6_count - promptIndexBefore.n6_count,
      expectedPromptPacketHashCount,
      'Expected N6 prompt packet index delta to match generated N6 runtime prompt hashes.',
    );
    const promptIndexCreated = await assertN6RuntimePromptIndex(
      prisma,
      startedAt,
      expectedPromptPacketHashes,
    );
    return {
      bundle: setup.bundle,
      selectedOption: setup.selectedOption,
      setupSemanticSummaries: setup.semanticSummaries,
      setupNodes: setup.nodes,
      prompt_index_before: promptIndexBefore,
      prompt_index_after: promptIndexAfter,
      prompt_index_created: promptIndexCreated,
      cases: [
        {
          case_id: 'n6_runtime_initial_to_n7_handoff',
          semantic_artifacts: [runtimeDraft.summary],
          nodes: {
            n6: summarizeNode(n6),
            replay: summarizeNode(replay),
          },
        },
        {
          case_id: 'n6_runtime_source_drift_blocks',
          semantic_artifacts: [driftDraft.summary],
          nodes: {
            n6_drift: summarizeNode(drift),
          },
        },
      ],
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function runN6LoopbackRuntimeSmoke(app, suffix, existingBundle = null) {
  const startedAt = new Date();
  const prisma = new PrismaClient();
  const n6DraftRuntime = createN6RuntimeDraftRuntime(prisma);
  const n6LoopbackTriageRuntime = createN6RuntimeLoopbackTriageRuntime(prisma);
  const n7SupportRuntime = createN7RuntimeSupportRuntime(prisma);
  try {
    const promptIndexBefore = await promptPacketIndexSnapshot(prisma);
    const setup = await runV1bHarnessHttpSetupToN5(app, `${suffix}_setup`, existingBundle);

    const ready = await runReadyN6Fixture(
      app,
      setup,
      `${suffix}_n6_two_candidates`,
      v1bHarnessN6TwoCandidateDraft,
    );
    const n7InitialInput = await v1bHarnessN7Request(app, ready.n6, `${suffix}_n7_first_trial`);
    const firstTrial = await invokeV1bHarnessNode(app, n7InitialInput);
    assert.equal(firstTrial.route_decision, 'invoke_next');

    const firstN8Input = await v1bHarnessN8Request(app, firstTrial, `${suffix}_n8_first_non_advance`);
    const firstN8Semantic = await recordCodexAssistedSemanticDraft(
      app,
      firstN8Input,
      n8DraftSlot(),
      v1bHarnessN8NonAdvanceDraft(firstN8Input),
    );
    const firstN8 = await invokeV1bHarnessNode(app, {
      ...firstN8Semantic.invocationInput,
      semantic_artifacts: [firstN8Semantic.semanticArtifact],
    });
    assert.equal(firstN8.route_decision, 'invoke_next');

    const secondTrialInput = await v1bHarnessN7FeedbackRequest(
      app,
      n7InitialInput,
      firstTrial,
      'semantic_candidate_failure',
      firstN8.hashes.gate_result_hash,
      `${suffix}_n7_second_trial`,
      firstN8,
    );
    const secondTrial = await invokeV1bHarnessNode(app, secondTrialInput);
    assert.equal(secondTrial.route_decision, 'invoke_next');

    const secondN8Input = await v1bHarnessN8Request(app, secondTrial, `${suffix}_n8_second_non_advance`);
    const secondN8Semantic = await recordCodexAssistedSemanticDraft(
      app,
      secondN8Input,
      n8DraftSlot(),
      v1bHarnessN8NonAdvanceDraft(secondN8Input),
    );
    const secondN8 = await invokeV1bHarnessNode(app, {
      ...secondN8Semantic.invocationInput,
      semantic_artifacts: [secondN8Semantic.semanticArtifact],
    });
    assert.equal(secondN8.route_decision, 'invoke_next');

    const exhaustedInput = {
      ...(await v1bHarnessN7FeedbackRequest(
        app,
        n7InitialInput,
        secondTrial,
        'semantic_candidate_failure',
        secondN8.hashes.gate_result_hash,
        `${suffix}_n7_exhausted`,
        secondN8,
      )),
      run_mode: 'product',
    };
    const refreshedCandidates = await listV1bHarnessCandidates(app, ready.n6);
    const synthesisSupport = await generateN7RuntimeSupportArtifact(
      app,
      n7SupportRuntime,
      exhaustedInput,
      n7FailedTrialSynthesisSlot(),
      n7FailedTrialSynthesisPayload(ready.n6, refreshedCandidates),
      { runMode: 'product', operatorLabel: 'v1b-n6-loopback-runtime-smoke-n7-failed-trial' },
    );
    const exhausted = await invokeV1bHarnessNode(app, {
      ...exhaustedInput,
      semantic_artifacts: [synthesisSupport.semanticArtifact],
    });
    assert.equal(exhausted.gate_status, 'blocked');
    assert.equal(exhausted.route_decision, 'loopback');
    assert.equal(exhausted.error_code, 'N7_CANDIDATE_TRIALS_EXHAUSTED');
    const n7LoopbackProjection = await runtimeContextProjection(
      app,
      exhausted,
      'v1b_n7_to_n6_failed_trial_loopback_context',
      'n7_loopback_to_n6',
    );

    const regenAfterN7InputBase = {
      ...(await v1bHarnessN6Request(app, setup.nodes.n5, `${suffix}_n6_regen_after_n7`)),
      run_mode: 'product',
    };
    const regenAfterN7Input = n6InputWithRuntimeProjection(regenAfterN7InputBase, n7LoopbackProjection.ref);
    const regenAfterN7Payload = v1bHarnessN6Draft(setup.bundle, regenAfterN7Input);
    regenAfterN7Payload.recommended_candidate_keys = ['runtime_regenerated_after_n7_candidate'];
    regenAfterN7Payload.generation_notes = [
      'Runtime regeneration consumed N7 failed-trial projection context.',
    ];
    regenAfterN7Payload.candidates[0] = {
      ...regenAfterN7Payload.candidates[0],
      candidate_key: 'runtime_regenerated_after_n7_candidate',
      main_question: 'How can runtime-regenerated N6 candidates recover after N7 failed-trial exhaustion?',
      expected_claim: 'Runtime-regenerated candidates can recover the v1b path after N7 trial exhaustion.',
    };
    const regenAfterN7Draft = await generateN6RuntimeDraftArtifact(
      app,
      n6DraftRuntime,
      regenAfterN7Input,
      regenAfterN7Payload,
      {
        runMode: 'product',
        generationMode: 'regeneration_after_n7_loopback',
        operatorLabel: 'v1b-n6-loopback-runtime-smoke-regeneration-after-n7',
      },
    );
    assert.equal(
      regenAfterN7Draft.semanticArtifact.source_hashes.n7_loopback_projection_hash,
      n7LoopbackProjection.artifact.checksum,
    );
    const regeneratedAfterN7 = await invokeV1bHarnessNode(app, {
      ...regenAfterN7Input,
      semantic_artifacts: [regenAfterN7Draft.semanticArtifact],
    });
    assert.equal(regeneratedAfterN7.gate_status, 'admitted');
    assert.equal(regeneratedAfterN7.route_decision, 'invoke_next');
    assert.equal(regeneratedAfterN7.authority_ref?.ref_type, 'topic_question_candidate_set');

    const failedInput = {
      ...(await v1bHarnessN6Request(app, setup.nodes.n5, `${suffix}_n6_gate_failure_first`)),
      run_mode: 'product',
    };
    const failedPayload = v1bHarnessN6Draft(setup.bundle, failedInput);
    failedPayload.candidates[0] = {
      ...failedPayload.candidates[0],
      answerability_verdict: 'not_answerable',
      main_question: 'How can AI improve research?',
    };
    const failedDraft = await generateN6RuntimeDraftArtifact(
      app,
      n6DraftRuntime,
      failedInput,
      failedPayload,
      { runMode: 'product', operatorLabel: 'v1b-n6-loopback-runtime-smoke-failed-draft' },
    );
    const triagePayload = {
      ...n6LoopbackTriagePayload(failedInput, 'n6_regenerate_candidates'),
      dominant_reason_codes: ['not_answerable'],
      rationale: 'Runtime triage keeps the failed N6 draft in candidate-level regeneration.',
    };
    const triageSupport = await generateN6RuntimeLoopbackTriageArtifact(
      app,
      n6LoopbackTriageRuntime,
      failedInput,
      failedDraft.semanticArtifact,
      failedDraft.summary.output_hash,
      triagePayload,
      { runMode: 'product', operatorLabel: 'v1b-n6-loopback-runtime-smoke-triage' },
    );
    const failed = await invokeV1bHarnessNode(app, {
      ...failedInput,
      semantic_artifacts: [failedDraft.semanticArtifact, triageSupport.semanticArtifact],
    });
    assert.equal(failed.gate_status, 'blocked');
    assert.equal(failed.route_decision, 'loopback');
    assert.equal(failed.error_code, 'N6_NO_ADMISSIBLE_TOPIC_QUESTION_CANDIDATE');
    const gateFailureProjection = await runtimeContextProjection(
      app,
      failed,
      'v1b_n6_gate_failure_retry_context',
      'n6_regenerate_candidates',
    );
    assert.equal(
      gateFailureProjection.payload.triage_artifact_hash,
      triageSupport.semanticArtifact.support_artifact_hash,
    );

    const retryInputBase = {
      ...(await v1bHarnessN6Request(app, setup.nodes.n5, `${suffix}_n6_gate_failure_retry`)),
      run_mode: 'product',
    };
    const retryInput = n6InputWithRuntimeProjection(retryInputBase, gateFailureProjection.ref);
    const retryPayload = v1bHarnessN6Draft(setup.bundle, retryInput);
    retryPayload.recommended_candidate_keys = ['runtime_regenerated_after_n6_gate_failure'];
    retryPayload.generation_notes = [
      'Runtime regeneration consumed N6 gate-failure retry context.',
    ];
    retryPayload.candidates[0] = {
      ...retryPayload.candidates[0],
      candidate_key: 'runtime_regenerated_after_n6_gate_failure',
      main_question: 'How can runtime-regenerated N6 candidates recover after an N6 deterministic gate failure?',
      expected_claim: 'Runtime-regenerated candidates can recover the v1b path after an N6 gate failure.',
    };
    const retryDraft = await generateN6RuntimeDraftArtifact(
      app,
      n6DraftRuntime,
      retryInput,
      retryPayload,
      {
        runMode: 'product',
        generationMode: 'regeneration_after_n6_gate_failure',
        operatorLabel: 'v1b-n6-loopback-runtime-smoke-regeneration-after-n6-gate',
      },
    );
    assert.equal(
      retryDraft.semanticArtifact.source_hashes.n6_gate_failure_projection_hash,
      gateFailureProjection.artifact.checksum,
    );
    const regeneratedAfterGateFailure = await invokeV1bHarnessNode(app, {
      ...retryInput,
      semantic_artifacts: [retryDraft.semanticArtifact],
    });
    assert.equal(regeneratedAfterGateFailure.gate_status, 'admitted');
    assert.equal(regeneratedAfterGateFailure.route_decision, 'invoke_next');
    assert.equal(regeneratedAfterGateFailure.authority_ref?.ref_type, 'topic_question_candidate_set');

    const expectedDraftHashes = [
      regenAfterN7Draft.summary.prompt_packet_hash,
      failedDraft.summary.prompt_packet_hash,
      retryDraft.summary.prompt_packet_hash,
    ];
    const expectedTriageHashes = [triageSupport.summary.prompt_packet_hash];
    const promptIndexAfter = await promptPacketIndexSnapshot(prisma);
    const promptIndexCreated = await assertN6LoopbackRuntimePromptIndex(
      prisma,
      startedAt,
      expectedDraftHashes,
      expectedTriageHashes,
    );

    return {
      bundle: setup.bundle,
      selectedOption: setup.selectedOption,
      setupSemanticSummaries: setup.semanticSummaries,
      setupNodes: setup.nodes,
      prompt_index_before: promptIndexBefore,
      prompt_index_after: promptIndexAfter,
      prompt_index_created: promptIndexCreated,
      cases: [
        {
          case_id: 'n6_runtime_regeneration_after_n7_loopback',
          loopback_projection_kind: n7LoopbackProjection.payload.projection_kind,
          semantic_artifacts: [
            ...ready.semanticSummaries,
            firstN8Semantic.summary,
            secondN8Semantic.summary,
            synthesisSupport.summary,
            regenAfterN7Draft.summary,
          ],
          nodes: {
            n6_initial: summarizeNode(ready.n6),
            n7_exhausted: summarizeNode(exhausted),
            n6_regenerated: summarizeNode(regeneratedAfterN7),
          },
        },
        {
          case_id: 'n6_runtime_loopback_triage_and_gate_failure_retry',
          gate_failure_projection_kind: gateFailureProjection.payload.projection_kind,
          semantic_artifacts: [
            failedDraft.summary,
            triageSupport.summary,
            retryDraft.summary,
          ],
          nodes: {
            n6_failed: summarizeNode(failed),
            n6_regenerated: summarizeNode(regeneratedAfterGateFailure),
          },
        },
      ],
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function runN8RuntimeSmoke(app, suffix, existingBundle = null) {
  const startedAt = new Date();
  const prisma = new PrismaClient();
  const n8ValueRuntime = createN8RuntimeValueAssessmentRuntime(prisma);
  try {
    const promptIndexBefore = await promptPacketIndexSnapshot(prisma);
    const setup = await runV1bHarnessHttpSetupToN5(app, `${suffix}_setup`, existingBundle);
    const ready = await runReadyN6Fixture(app, setup, `${suffix}_n6_ready`);
    const n7Input = await v1bHarnessN7Request(app, ready.n6, `${suffix}_n7_ready`);
    const n7 = await invokeV1bHarnessNode(app, n7Input);
    assert.equal(n7.route_decision, 'invoke_next');

    const n8Input = {
      ...(await v1bHarnessN8Request(app, n7, `${suffix}_n8_runtime`)),
      run_mode: 'product',
    };
    const draft = v1bHarnessN8ValueDraft(n8Input);
    const runtimeDraft = await generateN8RuntimeValueDraftArtifact(
      app,
      n8ValueRuntime,
      n8Input,
      draft,
      { runMode: 'product', operatorLabel: 'v1b-n8-runtime-smoke-initial' },
    );
    const n8 = await invokeV1bHarnessNode(app, {
      ...n8Input,
      semantic_artifacts: [runtimeDraft.semanticArtifact],
    });
    assert.ok(['admitted', 'admitted_with_warnings'].includes(n8.gate_status));
    assert.equal(n8.route_decision, 'invoke_next');
    assert.equal(n8.authority_ref?.ref_type, 'topic_value_assessment');
    assert.equal(n8.handoff_ref?.ref_type, 'artifact_ref');

    const artifactRefsBeforeReplay = await prisma.topicSelectionArtifactRef.count({
      where: { workflowRunId: n8Input.workflow_run_id },
    });
    const replay = await invokeV1bHarnessNode(app, {
      ...n8Input,
      semantic_artifacts: [runtimeDraft.semanticArtifact],
    });
    const artifactRefsAfterReplay = await prisma.topicSelectionArtifactRef.count({
      where: { workflowRunId: n8Input.workflow_run_id },
    });
    assert.equal(replay.replay_provenance?.replayed, true);
    assert.equal(replay.authority_ref?.ref_id, n8.authority_ref?.ref_id);
    assert.equal(replay.handoff_ref?.ref_id, n8.handoff_ref?.ref_id);
    assert.equal(artifactRefsAfterReplay, artifactRefsBeforeReplay);

    const driftInput = {
      ...(await v1bHarnessN8Request(app, n7, `${suffix}_n8_source_drift`)),
      run_mode: 'product',
    };
    const driftDraftPayload = v1bHarnessN8ValueDraft(driftInput);
    const driftDraft = await generateN8RuntimeValueDraftArtifact(
      app,
      n8ValueRuntime,
      driftInput,
      driftDraftPayload,
      { runMode: 'product', operatorLabel: 'v1b-n8-runtime-smoke-source-drift' },
    );
    const drift = await invokeV1bHarnessNode(app, {
      ...driftInput,
      semantic_artifacts: [{
        ...driftDraft.semanticArtifact,
        source_hashes: {
          ...driftDraft.semanticArtifact.source_hashes,
          n7_to_n8_projection_hash: '9'.repeat(64),
        },
      }],
    });
    assert.equal(drift.gate_status, 'blocked');
    assert.equal(drift.error_code, 'N8_DRAFT_ARTIFACT_SOURCE_HASH_DRIFT');
    assert.equal(drift.authority_ref, null);
    assert.equal(drift.handoff_ref, null);

    const expectedPromptPacketHashes = [
      runtimeDraft.summary.prompt_packet_hash,
      driftDraft.summary.prompt_packet_hash,
    ];
    const expectedPromptPacketHashCount = new Set(expectedPromptPacketHashes).size;
    const promptIndexAfter = await promptPacketIndexSnapshot(prisma);
    assert.equal(
      promptIndexAfter.n8_count - promptIndexBefore.n8_count,
      expectedPromptPacketHashCount,
      'Expected N8 prompt packet index delta to match generated N8 runtime prompt hashes.',
    );
    const promptIndexCreated = await assertN8RuntimePromptIndex(
      prisma,
      startedAt,
      expectedPromptPacketHashes,
    );
    return {
      bundle: setup.bundle,
      selectedOption: setup.selectedOption,
      setupSemanticSummaries: [...setup.semanticSummaries, ...ready.semanticSummaries],
      setupNodes: { ...setup.nodes, n6: ready.n6, n7 },
      prompt_index_before: promptIndexBefore,
      prompt_index_after: promptIndexAfter,
      prompt_index_created: promptIndexCreated,
      cases: [
        {
          case_id: 'n8_runtime_initial_to_n9_handoff',
          semantic_artifacts: [runtimeDraft.summary],
          nodes: {
            n8: summarizeNode(n8),
            replay: summarizeNode(replay),
          },
        },
        {
          case_id: 'n8_runtime_projection_source_drift_blocks',
          semantic_artifacts: [driftDraft.summary],
          nodes: {
            n8_drift: summarizeNode(drift),
          },
        },
      ],
    };
  } finally {
    await prisma.$disconnect();
  }
}

function externalCodexN4Prompt(bundle, sampleIndex) {
  const reviewAngles = [
    'method feasibility and deterministic replay evidence',
    'evidence traceability and reviewer-facing inspection',
    'claim ceiling, scoped contribution, and low-risk package setup',
  ];
  const reviewAngle = reviewAngles[(sampleIndex - 1) % reviewAngles.length];
  const template = v1bHarnessN4Draft(bundle);
  template.comparison_summary = `The recommended slice stays bounded while emphasizing ${reviewAngle}.`;
  template.options[0] = {
    ...template.options[0],
    details_payload: {
      ...template.options[0].details_payload,
      external_codex_n4_variance_sample: sampleIndex,
      review_angle: reviewAngle,
    },
  };

  return [
    'You are an external Codex CLI session producing one frozen semantic artifact for Topic Selection v1b N4.',
    'Do not inspect files, do not run shell commands, and do not explain your answer.',
    'Return ONLY one valid JSON object. Do not wrap it in Markdown fences.',
    '',
    'Contract rules:',
    '- Preserve all JSON keys, enum values, numeric values, booleans, array lengths, option_key values, risk levels, and functional ref objects exactly as provided in the template.',
    '- Do not add or remove options, refs, blockers, human review triggers, comparison axes, or details_payload fields.',
    '- excluded_boundaries must remain byte-for-byte identical to the template because they preserve ResearchConstraintProfile non-goals.',
    '- recommended_option_key must remain traceable_workflow_slice and must match the returned option_key.',
    '- hard_blockers must remain [], requires_human_review must remain false, and confidence must stay 0.82.',
    '- baseline_risk must remain medium, execution_risk must remain medium, and scope_risk must remain low.',
    '- Copy every ref as a whole JSON object exactly as it appears in the template. Do not invent refs.',
    '',
    `Natural-language variation target for this sample: ${reviewAngle}.`,
    'You may vary only natural-language wording in comparison_summary, slice_statement, problem_space, included_boundaries, resource_assumptions, data_assumptions, evaluation_path, baseline_assumptions, dependency_risks, expected_claim, fallback_claim, observable_success_criteria, main_risks, and claim_ceiling_alignment.rationale.',
    'The varied wording must remain bounded to local WorkflowHarness topic-selection traceability and must not claim production deployment, promotion readiness, or full paper implementation.',
    '',
    'Template to return as JSON:',
    JSON.stringify(template, null, 2),
  ].join('\n');
}

async function runExternalCodexN4Variance(app, suffix, existingBundle = null) {
  assert.equal(
    SEMANTIC_MODE,
    'fixture',
    'external_codex_n4_variance currently uses fixture setup plus external Codex N4 artifacts.',
  );
  const setup = await runV1bHarnessHttpSetupToN3(app, `${suffix}_setup`, existingBundle);
  const samples = [];

  for (let index = 0; index < EXTERNAL_CODEX_VARIANCE_COUNT; index += 1) {
    const sampleIndex = index + 1;
    const sampleSuffix = `${suffix}_external_codex_n4_${sampleIndex}`;
    const n4Input = v1bHarnessN4Request(setup.nodes.n1, setup.nodes.n2, setup.nodes.n3, sampleSuffix);
    const prompt = externalCodexN4Prompt(setup.bundle, sampleIndex);
    const sampleDir = path.join(ARTIFACT_DIR, 'external-codex-n4-variance', `sample-${sampleIndex}`);
    const codexSession = await runExternalCodexJsonSession(prompt, sampleDir);
    const payload = parseJsonObjectFromCodexOutput(codexSession.raw_output);
    const outputHash = sha256Text(stableStringify(payload));
    const n4Semantic = await recordExternalCodexSemanticDraft(
      app,
      n4Input,
      n4DraftSlot(),
      payload,
      {
        ...codexSession.metadata,
        sample_index: sampleIndex,
        parsed_payload_hash: outputHash,
      },
    );
    const n4 = await invokeV1bHarnessNode(app, {
      ...n4Semantic.invocationInput,
      semantic_artifacts: [n4Semantic.semanticArtifact],
    });
    const options = n4.authority_ref ? await listV1bHarnessOptions(app, n4) : [];
    const selectedOption = options.find((option) => option.status === 'recommended') ?? options[0] ?? null;

    samples.push({
      sample_index: sampleIndex,
      parsed_payload_hash: outputHash,
      recommended_option_key: payload.recommended_option_key,
      option_keys: Array.isArray(payload.options)
        ? payload.options.map((option) => option?.option_key).filter(Boolean)
        : [],
      slice_statements: Array.isArray(payload.options)
        ? payload.options.map((option) => option?.slice_statement).filter(Boolean)
        : [],
      expected_claims: Array.isArray(payload.options)
        ? payload.options.map((option) => option?.expected_claim).filter(Boolean)
        : [],
      persisted_option_count: options.length,
      selected_option_id: selectedOption?.research_slice_option_id ?? null,
      semantic_artifacts: [n4Semantic.summary],
      nodes: {
        n4: summarizeNode(n4),
      },
    });
  }

  const failedSamples = samples.filter((sample) =>
    !['admitted', 'admitted_with_warnings'].includes(sample.nodes.n4.gate_status)
      || sample.nodes.n4.route_decision !== 'invoke_next'
  );
  assert.deepEqual(
    failedSamples.map((sample) => ({ sample_index: sample.sample_index, n4: sample.nodes.n4 })),
    [],
    'External Codex N4 variance samples must all pass deterministic N4 admission and route to N5.',
  );

  return {
    bundle: setup.bundle,
    variance_count: EXTERNAL_CODEX_VARIANCE_COUNT,
    unique_payload_hash_count: new Set(samples.map((sample) => sample.parsed_payload_hash)).size,
    unique_slice_statement_count: new Set(samples.flatMap((sample) => sample.slice_statements)).size,
    unique_expected_claim_count: new Set(samples.flatMap((sample) => sample.expected_claims)).size,
    setupSemanticSummaries: setup.semanticSummaries,
    setupNodes: setup.nodes,
    samples,
  };
}

function externalCodexN6Prompt(bundle, selectedOption, n6Input, sampleIndex) {
  const payload = n6Input.frozen_input.payload;
  const evidenceRefs = uniqueRefs([
    ...selectedOption.support_evidence_refs,
    ...selectedOption.challenge_evidence_refs,
    ...selectedOption.baseline_evidence_refs,
    ...selectedOption.context_evidence_refs,
  ]);
  const evidenceRef = evidenceRefs[0]
    ?? bundle.evidence_role_bundle.support_unit_refs[0]
    ?? bundle.evidence_map_ref;
  const candidateKey = `external_codex_candidate_${sampleIndex}`;
  const template = {
    question_frame: {
      target_setting: selectedOption.target_setting,
      target_community: selectedOption.target_community,
      object_scope: 'v1b harness-native topic selection candidate generation',
      task_scope: 'candidate generation, deterministic gates, and replay drift checks',
      intervention_or_approach: 'WorkflowHarness-native candidate-set gate with frozen semantic artifacts',
      comparison_baseline: 'route-only smoke tests without harness-level product acceptance',
      observable_outcome: 'stable candidate-set refs and replay hashes',
      assumption_refs: [],
      evidence_refs: [evidenceRef],
      frame_payload: {
        external_codex_n6_variance_sample: sampleIndex,
        source: 'codex_cli_exec',
      },
    },
    recommended_candidate_keys: [candidateKey],
    generation_notes: [
      `External Codex CLI variance sample ${sampleIndex}; keep the candidate bounded to the selected ResearchSlice.`,
    ],
    human_review_triggers: [],
    candidates: [{
      candidate_key: candidateKey,
      main_question: 'How can a WorkflowHarness-native topic selection gate preserve evidence-to-need traceability for reviewer inspection?',
      sub_questions: [
        'Which frozen N5 lineage hashes must remain stable before N7 admission?',
      ],
      question_type: 'system',
      contribution_hypothesis: 'system',
      source_validated_need_refs: [bundle.validated_need_ref],
      answerability_plan: {
        datasets_or_resources: ['v1b harness trace fixtures'],
        metrics: ['hash drift detection rate'],
        baselines: ['route-only smoke coverage'],
        ablations_or_comparisons: ['without frozen semantic artifact admission'],
        evaluation_setting: 'local deterministic harness acceptance tests',
        dependency_risks: ['external Codex session wording can vary across runs'],
        open_dependencies: [],
        known_gaps: [],
        required_evidence_refs: [evidenceRef],
      },
      answerability_verdict: 'answerable',
      expected_claim: 'A WorkflowHarness-native topic selection gate can preserve evidence-to-need traceability for reviewer inspection.',
      fallback_claim: 'The gate exposes topic-selection trace gaps for reviewer inspection.',
      max_claim_strength: 'Bounded workflow claim about trace preservation under local reviewer inspection.',
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
      confidence: 0.82,
    }],
  };

  return [
    'You are an external Codex CLI session producing one frozen semantic artifact for Topic Selection v1b N6.',
    'Do not inspect files, do not run shell commands, and do not explain your answer.',
    'Return ONLY one valid JSON object. Do not wrap it in Markdown fences.',
    'Preserve all JSON keys, enum values, arrays, and functional ref objects exactly as provided in the template.',
    'You may vary only natural-language wording inside main_question, sub_questions, generation_notes, expected_claim, fallback_claim, max_claim_strength, observable_success_criteria, dependency_risks, and statement.',
    'The output must remain answerable, blocker-free, boundary-violation-free, and confidence must stay >= 0.75.',
    '',
    'Allowed functional refs are already embedded in the template. Do not invent refs.',
    '',
    'Template to return as JSON:',
    JSON.stringify(template, null, 2),
  ].join('\n');
}

async function runExternalCodexN6Variance(app, suffix, existingBundle = null) {
  assert.equal(SEMANTIC_MODE, 'fixture', 'external_codex_n6_variance currently uses fixture setup plus external Codex N6 artifacts.');
  const setup = await runV1bHarnessHttpSetupToN5(app, `${suffix}_setup`, existingBundle);
  const samples = [];

  for (let index = 0; index < EXTERNAL_CODEX_VARIANCE_COUNT; index += 1) {
    const sampleIndex = index + 1;
    const sampleSuffix = `${suffix}_external_codex_${sampleIndex}`;
    const n6Input = await v1bHarnessN6Request(app, setup.nodes.n5, sampleSuffix);
    const prompt = externalCodexN6Prompt(setup.bundle, setup.selectedOption, n6Input, sampleIndex);
    const sampleDir = path.join(ARTIFACT_DIR, 'external-codex-n6-variance', `sample-${sampleIndex}`);
    const codexSession = await runExternalCodexJsonSession(prompt, sampleDir);
    const payload = parseJsonObjectFromCodexOutput(codexSession.raw_output);
    const outputHash = sha256Text(stableStringify(payload));
    const n6Semantic = await recordExternalCodexSemanticDraft(
      app,
      n6Input,
      n6DraftSlot(),
      payload,
      {
        ...codexSession.metadata,
        sample_index: sampleIndex,
        parsed_payload_hash: outputHash,
      },
    );
    const n6 = await invokeV1bHarnessNode(app, {
      ...n6Semantic.invocationInput,
      semantic_artifacts: [n6Semantic.semanticArtifact],
    });
    const candidates = n6.handoff_ref ? await listV1bHarnessCandidates(app, n6) : [];
    samples.push({
      sample_index: sampleIndex,
      parsed_payload_hash: outputHash,
      candidate_keys: Array.isArray(payload.candidates)
        ? payload.candidates.map((candidate) => candidate?.candidate_key).filter(Boolean)
        : [],
      main_questions: Array.isArray(payload.candidates)
        ? payload.candidates.map((candidate) => candidate?.main_question).filter(Boolean)
        : [],
      persisted_candidate_count: candidates.length,
      semantic_artifacts: [n6Semantic.summary],
      nodes: {
        n6: summarizeNode(n6),
      },
    });
  }

  const failedSamples = samples.filter((sample) =>
    !['admitted', 'admitted_with_warnings'].includes(sample.nodes.n6.gate_status)
  );
  assert.deepEqual(
    failedSamples.map((sample) => ({ sample_index: sample.sample_index, n6: sample.nodes.n6 })),
    [],
    'External Codex N6 variance samples must all pass deterministic N6 admission.',
  );

  return {
    bundle: setup.bundle,
    selectedOption: setup.selectedOption,
    variance_count: EXTERNAL_CODEX_VARIANCE_COUNT,
    unique_payload_hash_count: new Set(samples.map((sample) => sample.parsed_payload_hash)).size,
    unique_main_question_count: new Set(samples.flatMap((sample) => sample.main_questions)).size,
    setupSemanticSummaries: setup.semanticSummaries,
    setupNodes: setup.nodes,
    samples,
  };
}

function externalCodexN8Prompt(n8Input, sampleIndex) {
  const reviewAngles = [
    'traceability, replay hashes, and reviewer inspection value',
    'bounded claim strength, package-drafting readiness, and residual risk handling',
    'effort-to-value tradeoff, deterministic gates, and downstream package usefulness',
  ];
  const reviewAngle = reviewAngles[(sampleIndex - 1) % reviewAngles.length];
  const template = v1bHarnessN8ValueDraft(n8Input);
  return [
    'You are an external Codex CLI session producing one frozen semantic artifact for Topic Selection v1b N8.',
    'Do not inspect files, do not run shell commands, and do not explain your answer.',
    'Return ONLY one valid JSON object. Do not wrap it in Markdown fences.',
    '',
    'Contract rules:',
    '- Preserve all JSON keys, enum values, numeric scores, booleans, arrays, array lengths, and functional ref objects exactly as provided in the template.',
    `- hard_gates must stay in this exact order: ${TOPIC_SELECTION_VALUE_GATE_KEYS.join(', ')}.`,
    `- dimension_scores must stay in this exact order: ${TOPIC_SELECTION_VALUE_DIMENSIONS.join(', ')}.`,
    '- Do not add or remove hard gates, dimensions, refs, blockers, accepted risks, or memo fields.',
    '- Use the exact reasoning_memo key effort_to_value. Do not output effort_to_value_fit.',
    '- The output must remain ready, advance_to_package, blocker-free, and total_score must stay 83.',
    '- Copy every ref as a whole JSON object exactly as it appears in the template. Do not invent refs.',
    '',
    `Natural-language variation target for this sample: ${reviewAngle}.`,
    'You may vary only natural-language wording in hard_gates[*].rationale, dimension_scores[*].rationale, reviewer_objections, ceiling_case, base_case, floor_case, value_summary, risk_notes, reasoning_memo.value_thesis, reasoning_memo.significance, reasoning_memo.originality, reasoning_memo.claim_leverage, reasoning_memo.reviewer_risks, reasoning_memo.effort_to_value, reasoning_memo.strategic_fit, reasoning_memo.negative_memory_check, reasoning_memo.evidence_backed_rationale, reasoning_memo.top_objections, reasoning_memo.uncertainty, and reasoning_memo.disposition_bridge.',
    'Do not vary reasoning_memo.recommendation, reasoning_memo.requires_critic_review, reasoning_memo.critic_triggers, or reasoning_memo.cited_refs.',
    'The varied wording must remain consistent with the template scores, ready status, advance disposition, and cited refs.',
    '',
    'Template to return as JSON:',
    JSON.stringify(template, null, 2),
  ].join('\n');
}

async function runExternalCodexN8Variance(app, suffix, existingBundle = null) {
  assert.equal(
    SEMANTIC_MODE,
    'fixture',
    'external_codex_n8_variance currently uses fixture setup plus external Codex N8 artifacts.',
  );
  const setup = await runV1bHarnessHttpSetupToN5(app, `${suffix}_setup`, existingBundle);
  const samples = [];

  for (let index = 0; index < EXTERNAL_CODEX_VARIANCE_COUNT; index += 1) {
    const sampleIndex = index + 1;
    const sampleSuffix = `${suffix}_external_codex_n8_${sampleIndex}`;
    const ready = await runReadyN6Fixture(app, setup, `${sampleSuffix}_n6`);
    const n7Input = await v1bHarnessN7Request(app, ready.n6, `${sampleSuffix}_n7`);
    const n7 = await invokeV1bHarnessNode(app, n7Input);
    assert.equal(n7.route_decision, 'invoke_next');

    const n8Input = await v1bHarnessN8Request(app, n7, `${sampleSuffix}_n8`);
    const prompt = externalCodexN8Prompt(n8Input, sampleIndex);
    const sampleDir = path.join(ARTIFACT_DIR, 'external-codex-n8-variance', `sample-${sampleIndex}`);
    const codexSession = await runExternalCodexJsonSession(prompt, sampleDir);
    const payload = parseJsonObjectFromCodexOutput(codexSession.raw_output);
    const outputHash = sha256Text(stableStringify(payload));
    const n8Semantic = await recordExternalCodexSemanticDraft(
      app,
      n8Input,
      n8DraftSlot(),
      payload,
      {
        ...codexSession.metadata,
        sample_index: sampleIndex,
        parsed_payload_hash: outputHash,
      },
    );
    const n8 = await invokeV1bHarnessNode(app, {
      ...n8Semantic.invocationInput,
      semantic_artifacts: [n8Semantic.semanticArtifact],
    });
    const valueAssessments = n8.authority_ref
      ? await listV1bHarnessValueAssessments(app, setup.bundle.title_card_id)
      : [];
    const persistedAssessment = n8.authority_ref
      ? valueAssessments.find((assessment) => assessment.topic_value_assessment_id === n8.authority_ref.ref_id)
      : null;
    if (n8.authority_ref) {
      assert.ok(persistedAssessment, 'External Codex N8 admission must persist the value assessment authority row.');
    }

    samples.push({
      sample_index: sampleIndex,
      parsed_payload_hash: outputHash,
      readiness_status: payload.readiness_status,
      recommended_disposition: payload.recommended_disposition,
      total_score: payload.total_score,
      value_summary: payload.value_summary,
      reasoning_memo_recommendation: payload.reasoning_memo?.recommendation,
      reasoning_memo_value_thesis: payload.reasoning_memo?.value_thesis,
      persisted_value_assessment_count: valueAssessments.length,
      persisted_value_assessment_id: persistedAssessment?.topic_value_assessment_id ?? null,
      semantic_artifacts: [n8Semantic.summary],
      nodes: {
        n6: summarizeNode(ready.n6),
        n7: summarizeNode(n7),
        n8: summarizeNode(n8),
      },
    });
  }

  const failedSamples = samples.filter((sample) =>
    !['admitted', 'admitted_with_warnings'].includes(sample.nodes.n8.gate_status)
      || sample.nodes.n8.route_decision !== 'invoke_next'
  );
  assert.deepEqual(
    failedSamples.map((sample) => ({ sample_index: sample.sample_index, n8: sample.nodes.n8 })),
    [],
    'External Codex N8 variance samples must all pass deterministic N8 admission and route to N9.',
  );

  return {
    bundle: setup.bundle,
    selectedOption: setup.selectedOption,
    variance_count: EXTERNAL_CODEX_VARIANCE_COUNT,
    unique_payload_hash_count: new Set(samples.map((sample) => sample.parsed_payload_hash)).size,
    unique_value_summary_count: new Set(samples.map((sample) => sample.value_summary).filter(Boolean)).size,
    unique_value_thesis_count: new Set(samples.map((sample) => sample.reasoning_memo_value_thesis).filter(Boolean)).size,
    setupSemanticSummaries: setup.semanticSummaries,
    setupNodes: setup.nodes,
    samples,
  };
}

function manualLocator(input) {
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

async function createLiterature(app, suffix) {
  const safeSuffix = suffix.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const importRes = await app.inject({
    method: 'POST',
    url: '/literature/collections/import',
    payload: {
      items: [{
        provider: 'manual',
        external_id: `topic-selection-v1b-harness-${safeSuffix}`,
        title: `Topic Selection v1b Harness Evidence ${suffix}`,
        abstract: 'Evidence workflows miss reviewer-facing traceability from claims to decisions.',
        authors: ['Harness Runner'],
        year: 2026,
        doi: `10.1000/topic-selection-v1b-harness-${safeSuffix}`,
        source_url: `https://example.com/topic-selection-v1b-harness/${safeSuffix}`,
      }],
    },
  });
  assertStatus(importRes, 200);
  const body = importRes.json();
  const literatureId = body.results[0]?.literature_id;
  assert.ok(literatureId);
  return literatureId;
}

async function createTitleCard(app, suffix) {
  const titleCardRes = await app.inject({
    method: 'POST',
    url: '/title-cards',
    payload: {
      working_title: `Topic Selection v1b Harness Title ${suffix}`,
      brief: 'Validate v1b topic package drafting through harness HTTP routes.',
    },
  });
  assertStatus(titleCardRes, 201);
  return titleCardRes.json().title_card_id;
}

async function invokeV1aHarnessNode(app, nodeId, scenarioInput, expectedRoute) {
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
  const body = response.json();
  const routeDebug = JSON.stringify({
    route_signal: body.route_signal,
    error_code: body.scenario_result?.adapter_result?.error_code ?? body.scenario_result?.node_result?.error_code ?? null,
    error_message: body.scenario_result?.adapter_result?.error_message ?? body.scenario_result?.node_result?.error_message ?? null,
    blocker_codes: body.scenario_result?.adapter_result?.blocker_codes ?? body.scenario_result?.node_result?.blocker_codes ?? [],
  });
  assert.equal(body.route_decision, expectedRoute.route_decision, `${nodeId} route_decision ${routeDebug}`);
  assert.equal(body.route_signal, expectedRoute.route_signal, `${nodeId} route_signal ${routeDebug}`);
  assert.equal(body.route_target_node_id, expectedRoute.route_target_node_id, `${nodeId} route_target_node_id ${routeDebug}`);
  assert.equal(body.scenario_result.scenario_status, 'passed', `${nodeId} scenario_status ${routeDebug}`);
  return body;
}

class FixtureTopicSelectionV1aLlmGateway {
  async createStructuredOutput(request) {
    if (request.schemaName !== TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION) {
      throw new Error(`Unexpected v1a structured output schema ${request.schemaName}.`);
    }
    const userPayload = JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}');
    const sourceRefs = [
      userPayload.candidate?.need_candidate_ref,
      userPayload.readiness?.readiness_assessment_ref,
      userPayload.support_packet?.validation_support_packet_ref,
    ].filter(Boolean);
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
      rationale: 'Fixture v1a adjudication gateway validates the native runner candidate while preserving support-packet risks.',
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
      recommendation_payload: { fixture_gateway: true },
      policy_version: userPayload.node?.policy_version,
      output_schema_version: userPayload.node?.output_schema_version,
    };
    return {
      parsed,
      raw: { schemaName: request.schemaName, parsed },
      telemetry: {
        provider_id: 'fixture',
        model_id: 'fixture-v1a-need-adjudication',
        profile_id: request.schemaName,
        prompt_template_id: request.schemaName,
        prompt_template_version: '1',
        elapsed_ms: 1,
        request_count: 1,
        retry_count: 0,
        timeout_count: 0,
        rate_limit_count: 0,
        input_tokens: 0,
        output_tokens: 0,
        embedding_input_tokens: null,
        total_tokens: 0,
        cost_usd: null,
        provider_side_cache_hit: null,
        provider_side_cache_read_tokens: null,
        provider_side_cache_write_tokens: null,
      },
    };
  }
}

function roleCoverageRef(searchRunHandoff, role) {
  const row = searchRunHandoff.coverage_role_expectations?.find((entry) => entry.expected_evidence_role === role);
  assert.ok(row, `missing ${role} coverage row in v1a search-run handoff`);
  return row.coverage_row_intent_ref;
}

function v1aSearchRunInputRefsHash(searchRunHandoff) {
  return new TopicSelectionEvidenceMapMaterializationService().inputRefsHashForSearchRunHandoff(searchRunHandoff);
}

function buildV1aEvidenceMapDraft({ titleCardId, searchRunHandoff, literatureRef, sourceRef }) {
  const roles = ['support', 'challenge', 'baseline', 'context'];
  return {
    schema_version: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_DRAFT_SCHEMA_VERSION,
    title_card_ref: ref('title_card', titleCardId, titleCardId),
    search_run_ref: searchRunHandoff.search_run_ref,
    search_plan_ref: searchRunHandoff.search_plan_ref,
    literature_resource_pool_snapshot_ref: searchRunHandoff.literature_resource_pool_snapshot_ref,
    literature_snapshot_hash: searchRunHandoff.literature_snapshot_hash,
    producer_kind: 'fixture',
    profile_id: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
    input_refs_hash: v1aSearchRunInputRefsHash(searchRunHandoff),
    draft_units: roles.map((role) => ({
      client_unit_key: role,
      coverage_row_intent_ref: roleCoverageRef(searchRunHandoff, role),
      evidence_role: role,
      literature_ref: literatureRef,
      source_refs: [sourceRef],
      locator: manualLocator({ titleCardId, literatureRef, sourceRef, key: `native-v1a-${role}` }),
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
    draft_conflicts: [{
      conflict_type: 'claim_conflict',
      severity: 'moderate',
      support_unit_keys: ['support'],
      challenge_unit_keys: ['challenge'],
      baseline_unit_keys: ['baseline'],
      context_unit_keys: ['context'],
      issue_codes: ['risk_carry_forward_required'],
    }],
    warning_codes: [],
    policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
    output_schema_version: 'v1',
  };
}

function refsByV1aEvidenceRole(evidenceMapRecords, role, titleCardId) {
  return evidenceMapRecords.evidence_units
    .filter((unit) => unit.evidence_role === role)
    .map((unit) => ref('evidence_unit', unit.evidence_unit_id, titleCardId, unit.evidence_map_version ?? null));
}

function buildV1aRankedBatch({ titleCardId, nodeAttemptId, evidenceMapRecords, strengthRef }) {
  const conflictRefs = evidenceMapRecords.conflict_sets.map((record) =>
    ref('evidence_conflict', record.evidence_conflict_set_id, titleCardId, record.evidence_map_version)
  );
  return {
    schema_version: 'v1',
    draft_batch: {
      batch_id: `draft_batch_${nodeAttemptId}`,
      node_attempt_id: nodeAttemptId,
      terminal_result: 'finalize',
      ranking_rationale: 'Native v1a runner fixture has complete role evidence for v1b intake.',
      max_persisted_candidates: 5,
    },
    drafts: [{
      draft_id: `draft_${nodeAttemptId}`,
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
        support_unit_refs: refsByV1aEvidenceRole(evidenceMapRecords, 'support', titleCardId),
        challenge_unit_refs: refsByV1aEvidenceRole(evidenceMapRecords, 'challenge', titleCardId),
        baseline_unit_refs: refsByV1aEvidenceRole(evidenceMapRecords, 'baseline', titleCardId),
        context_unit_refs: refsByV1aEvidenceRole(evidenceMapRecords, 'context', titleCardId),
      },
      conflict_refs: conflictRefs,
      strength_assessment_refs: [strengthRef],
      accepted_risk_refs: [],
      gap_codes: ['traceability_gap'],
      speculative: false,
      confidence: 0.82,
    }],
    rejected_framings: [],
    unresolved_points: [],
  };
}

function buildV1aExplorationPayload() {
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

function buildV1aArbiterPayload({ evidenceMapRecords, titleCardId, strengthRef }) {
  return {
    node_policy_ref: ref('node_policy', 'generate_need_candidate_v1', titleCardId),
    output_schema_ref: ref('schema', 'ranked_candidate_draft_batch_v1', titleCardId),
    authority_boundary: {
      authority_object: 'NeedCandidate',
      forbidden: ['NeedCandidateSet', 'ValidatedNeed', 'TopicQuestionContract'],
    },
    max_persisted_candidates: 5,
    deterministic_gate_checklist: ['schema_validation', 'admission_gates'],
    role_level_summaries: [{ role: 'single_agent', summary: 'native-v1a-v1b-ready' }],
    candidate_pool_digest: { candidate_count: 0 },
    evidence_ref_table: [
      ...evidenceMapRecords.evidence_units.map((unit) => ({
        evidence_ref: ref('evidence_unit', unit.evidence_unit_id, titleCardId, unit.evidence_map_version ?? null),
        role: unit.evidence_role,
      })),
      ...evidenceMapRecords.conflict_sets.map((record) => ({
        evidence_ref: ref('evidence_conflict', record.evidence_conflict_set_id, titleCardId, record.evidence_map_version),
        role: 'conflict',
      })),
      { evidence_ref: strengthRef, role: 'strength_assessment' },
    ],
    rejected_framing_table: [],
    unresolved_points: [],
    batch_ranking_rules: ['rank grounded drafts first'],
    persistence_rules: ['persist only admitted candidates'],
    failure_rules: ['block malformed drafts'],
  };
}

async function createV1bInputBundle(app, suffix) {
  const literatureId = await createLiterature(app, suffix);
  const titleCardId = await createTitleCard(app, suffix);
  const basketRes = await app.inject({
    method: 'PATCH',
    url: `/title-cards/${encodeURIComponent(titleCardId)}/evidence-basket`,
    payload: { add_literature_ids: [literatureId] },
  });
  assertStatus(basketRes, 200);
  const n1 = await invokeV1aHarnessNode(
    app,
    'topic-selection.v1a.create-topic-seed.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-script-fixture.v1',
      scenario_case_id: 'n1',
      title_card_id: titleCardId,
      workflow_run_id: `workflow_run_v1a_for_v1b_n1_${suffix}`,
      node_attempt_id: `node_attempt_v1a_for_v1b_n1_${suffix}`,
      intent_summary: 'Native v1a runner creates the v1b harness script bundle.',
      scope_notes: 'v1b harness e2e fixture.',
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
  const n2 = await invokeV1aHarnessNode(
    app,
    'topic-selection.v1a.snapshot-literature-resource-pool.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-script-fixture.v1',
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
  const n3 = await invokeV1aHarnessNode(
    app,
    'topic-selection.v1a.create-search-plan.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-script-fixture.v1',
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
        must_check_constraints: ['Keep v1a native runner as the automatic v1b script fixture producer.'],
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
  const coverageRowRefs = n3.scenario_result.node_result.coverage_row_intent_refs;
  const n4 = await invokeV1aHarnessNode(
    app,
    'topic-selection.v1a.record-search-run.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-script-fixture.v1',
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
  const n5 = await invokeV1aHarnessNode(
    app,
    'topic-selection.v1a.build-evidence-map.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-script-fixture.v1',
      scenario_case_id: 'n5',
      title_card_id: titleCardId,
      workflow_run_id: `workflow_run_v1a_for_v1b_n5_${suffix}`,
      node_attempt_id: `node_attempt_v1a_for_v1b_n5_${suffix}`,
      search_run_handoff: n4.scenario_result.node_result.downstream_handoff,
      extraction_draft: buildV1aEvidenceMapDraft({
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
  const n6 = await invokeV1aHarnessNode(
    app,
    'topic-selection.v1a.generate-need-candidate.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-script-fixture.v1',
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
      exploration_payload: buildV1aExplorationPayload(),
      arbiter_payload: buildV1aArbiterPayload({
        evidenceMapRecords: n5.scenario_result.node_result.evidence_map_records,
        titleCardId,
        strengthRef: n6StrengthRef,
      }),
      mocked_output: {
        fixture_id: `ranked_batch_${suffix}`,
        output: buildV1aRankedBatch({
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
        admitted_draft_count: 1,
        persisted_candidate_count: 1,
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
  const candidateRef = ref('need_candidate', candidate.need_candidate_id, titleCardId, candidate.candidate_version);
  const n7 = await invokeV1aHarnessNode(
    app,
    'topic-selection.v1a.validate-need-adjudication.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-script-fixture.v1',
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
  const n8 = await invokeV1aHarnessNode(
    app,
    'topic-selection.v1a.human-confirm-need.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-script-fixture.v1',
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
  const n9 = await invokeV1aHarnessNode(
    app,
    'topic-selection.v1a.publish-v1b-input-bundle.v1',
    {
      scenario_id: 'topic-selection.v1a.native-v1b-script-fixture.v1',
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
  const v1bBundle = n9TraceRes.json().payload?.v1b_input_bundle;
  assert.ok(v1bBundle, 'N9 trace payload must carry the published v1b bundle for v1b harness intake.');
  return {
    titleCardId,
    validatedNeedId: n8.scenario_result.node_result.validated_need_ref.ref_id,
    v1bInputBundle: v1bBundle,
    v1bInputBundleId: v1bBundle.v1b_input_bundle_id,
  };
}

async function assertLegacyRoutesRemoved(app) {
  for (const route of REMOVED_LEGACY_WRITE_ROUTES) {
    const response = await app.inject({
      method: 'POST',
      url: route,
      payload: {},
    });
    assert.equal(response.statusCode, 404, `${route} should not be registered`);
    assert.equal(response.headers.deprecation, undefined);
  }
}

function summarizeNode(result) {
  return {
    gate_status: result.gate_status,
    route_decision: result.route_decision,
    failure_class: result.failure_class,
    error_code: result.error_code,
    authority_ref: result.authority_ref,
    handoff_ref: result.handoff_ref,
    transition_attempt_ref: result.transition_attempt_ref,
    hashes: result.hashes,
  };
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main() {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  const app = buildApp({
    topicSelectionV1aLlmGateway: new FixtureTopicSelectionV1aLlmGateway(),
  });
  const startedAt = new Date().toISOString();
  const runs = [];
  try {
    await app.ready();
    await assertLegacyRoutesRemoved(app);
    const existingBundle = EXISTING_V1B_INPUT_BUNDLE_ID
      ? await loadExistingV1bInputBundle(EXISTING_V1B_INPUT_BUNDLE_ID)
      : null;

    for (let index = 0; index < REPEAT_COUNT; index += 1) {
      const suffix = REPEAT_COUNT === 1 ? RUN_ID : `${RUN_ID}-${index + 1}`;
      if (SCENARIO === 'positive') {
        const result = await runV1bHarnessHttpN1ToN11(app, suffix, existingBundle);
        assert.equal(result.nodes.n11.route_decision, 'stop_v1b_complete');
        runs.push({
          run_index: index + 1,
          scenario: SCENARIO,
          v1b_input_bundle_source: existingBundle ? 'existing' : 'created_in_run',
          title_card_id: result.bundle.title_card_id,
          v1b_input_bundle_id: result.bundle.v1b_input_bundle_id,
          selected_option_id: result.selectedOption.research_slice_option_id,
          candidate_count: result.candidates.length,
          value_assessment_count: result.valueAssessments.length,
          semantic_artifacts: result.semanticSummaries,
          nodes: Object.fromEntries(
            Object.entries(result.nodes).map(([node, nodeResult]) => [node, summarizeNode(nodeResult)]),
          ),
        });
        continue;
      }

      if (SCENARIO === 'external_codex_n6_variance') {
        const result = await runExternalCodexN6Variance(app, suffix, existingBundle);
        runs.push({
          run_index: index + 1,
          scenario: SCENARIO,
          v1b_input_bundle_source: existingBundle ? 'existing' : 'created_in_run',
          title_card_id: result.bundle.title_card_id,
          v1b_input_bundle_id: result.bundle.v1b_input_bundle_id,
          selected_option_id: result.selectedOption.research_slice_option_id,
          variance_count: result.variance_count,
          unique_payload_hash_count: result.unique_payload_hash_count,
          unique_main_question_count: result.unique_main_question_count,
          setup_semantic_artifacts: result.setupSemanticSummaries,
          setup_nodes: Object.fromEntries(
            Object.entries(result.setupNodes).map(([node, nodeResult]) => [node, summarizeNode(nodeResult)]),
          ),
          samples: result.samples,
        });
        continue;
      }

      if (SCENARIO === 'early_semantic_runtime_smoke') {
        const result = await runEarlySemanticRuntimeSmoke(app, suffix, existingBundle);
        runs.push({
          run_index: index + 1,
          scenario: SCENARIO,
          v1b_input_bundle_source: existingBundle ? 'existing' : 'created_in_run',
          title_card_id: result.bundle.title_card_id,
          v1b_input_bundle_id: result.bundle.v1b_input_bundle_id,
          selected_option_id: result.selectedOption.research_slice_option_id,
          semantic_artifacts: result.semanticSummaries,
          prompt_index_before: result.prompt_index_before,
          prompt_index_after: result.prompt_index_after,
          prompt_index_created: result.prompt_index_created,
          cases: result.cases,
        });
        continue;
      }

      if (SCENARIO === 'n4_runtime_smoke') {
        const result = await runN4RuntimeSmoke(app, suffix, existingBundle);
        runs.push({
          run_index: index + 1,
          scenario: SCENARIO,
          v1b_input_bundle_source: existingBundle ? 'existing' : 'created_in_run',
          title_card_id: result.bundle.title_card_id,
          v1b_input_bundle_id: result.bundle.v1b_input_bundle_id,
          selected_option_id: result.selectedOption.research_slice_option_id,
          setup_semantic_artifacts: result.setupSemanticSummaries,
          setup_nodes: Object.fromEntries(
            Object.entries(result.setupNodes).map(([node, nodeResult]) => [node, summarizeNode(nodeResult)]),
          ),
          prompt_index_before: result.prompt_index_before,
          prompt_index_after: result.prompt_index_after,
          prompt_index_created: result.prompt_index_created,
          cases: result.cases,
        });
        continue;
      }

      if (SCENARIO === 'n7_runtime_smoke') {
        const result = await runN7RuntimeSmoke(app, suffix, existingBundle);
        runs.push({
          run_index: index + 1,
          scenario: SCENARIO,
          v1b_input_bundle_source: existingBundle ? 'existing' : 'created_in_run',
          title_card_id: result.bundle.title_card_id,
          v1b_input_bundle_id: result.bundle.v1b_input_bundle_id,
          selected_option_id: result.selectedOption.research_slice_option_id,
          setup_semantic_artifacts: result.setupSemanticSummaries,
          setup_nodes: Object.fromEntries(
            Object.entries(result.setupNodes).map(([node, nodeResult]) => [node, summarizeNode(nodeResult)]),
          ),
          prompt_index_before: result.prompt_index_before,
          prompt_index_after: result.prompt_index_after,
          prompt_index_created: result.prompt_index_created,
          cases: result.cases,
        });
        continue;
      }

      if (SCENARIO === 'n6_runtime_smoke') {
        const result = await runN6RuntimeSmoke(app, suffix, existingBundle);
        runs.push({
          run_index: index + 1,
          scenario: SCENARIO,
          v1b_input_bundle_source: existingBundle ? 'existing' : 'created_in_run',
          title_card_id: result.bundle.title_card_id,
          v1b_input_bundle_id: result.bundle.v1b_input_bundle_id,
          selected_option_id: result.selectedOption.research_slice_option_id,
          setup_semantic_artifacts: result.setupSemanticSummaries,
          setup_nodes: Object.fromEntries(
            Object.entries(result.setupNodes).map(([node, nodeResult]) => [node, summarizeNode(nodeResult)]),
          ),
          prompt_index_before: result.prompt_index_before,
          prompt_index_after: result.prompt_index_after,
          prompt_index_created: result.prompt_index_created,
          cases: result.cases,
        });
        continue;
      }

      if (SCENARIO === 'n6_loopback_runtime_smoke') {
        const result = await runN6LoopbackRuntimeSmoke(app, suffix, existingBundle);
        runs.push({
          run_index: index + 1,
          scenario: SCENARIO,
          v1b_input_bundle_source: existingBundle ? 'existing' : 'created_in_run',
          title_card_id: result.bundle.title_card_id,
          v1b_input_bundle_id: result.bundle.v1b_input_bundle_id,
          selected_option_id: result.selectedOption.research_slice_option_id,
          setup_semantic_artifacts: result.setupSemanticSummaries,
          setup_nodes: Object.fromEntries(
            Object.entries(result.setupNodes).map(([node, nodeResult]) => [node, summarizeNode(nodeResult)]),
          ),
          prompt_index_before: result.prompt_index_before,
          prompt_index_after: result.prompt_index_after,
          prompt_index_created: result.prompt_index_created,
          cases: result.cases,
        });
        continue;
      }

      if (SCENARIO === 'n8_runtime_smoke') {
        const result = await runN8RuntimeSmoke(app, suffix, existingBundle);
        runs.push({
          run_index: index + 1,
          scenario: SCENARIO,
          v1b_input_bundle_source: existingBundle ? 'existing' : 'created_in_run',
          title_card_id: result.bundle.title_card_id,
          v1b_input_bundle_id: result.bundle.v1b_input_bundle_id,
          selected_option_id: result.selectedOption.research_slice_option_id,
          setup_semantic_artifacts: result.setupSemanticSummaries,
          setup_nodes: Object.fromEntries(
            Object.entries(result.setupNodes).map(([node, nodeResult]) => [node, summarizeNode(nodeResult)]),
          ),
          prompt_index_before: result.prompt_index_before,
          prompt_index_after: result.prompt_index_after,
          prompt_index_created: result.prompt_index_created,
          cases: result.cases,
        });
        continue;
      }

      if (SCENARIO === 'external_codex_n4_variance') {
        const result = await runExternalCodexN4Variance(app, suffix, existingBundle);
        runs.push({
          run_index: index + 1,
          scenario: SCENARIO,
          v1b_input_bundle_source: existingBundle ? 'existing' : 'created_in_run',
          title_card_id: result.bundle.title_card_id,
          v1b_input_bundle_id: result.bundle.v1b_input_bundle_id,
          variance_count: result.variance_count,
          unique_payload_hash_count: result.unique_payload_hash_count,
          unique_slice_statement_count: result.unique_slice_statement_count,
          unique_expected_claim_count: result.unique_expected_claim_count,
          setup_semantic_artifacts: result.setupSemanticSummaries,
          setup_nodes: Object.fromEntries(
            Object.entries(result.setupNodes).map(([node, nodeResult]) => [node, summarizeNode(nodeResult)]),
          ),
          samples: result.samples,
        });
        continue;
      }

      if (SCENARIO === 'external_codex_n8_variance') {
        const result = await runExternalCodexN8Variance(app, suffix, existingBundle);
        runs.push({
          run_index: index + 1,
          scenario: SCENARIO,
          v1b_input_bundle_source: existingBundle ? 'existing' : 'created_in_run',
          title_card_id: result.bundle.title_card_id,
          v1b_input_bundle_id: result.bundle.v1b_input_bundle_id,
          selected_option_id: result.selectedOption.research_slice_option_id,
          variance_count: result.variance_count,
          unique_payload_hash_count: result.unique_payload_hash_count,
          unique_value_summary_count: result.unique_value_summary_count,
          unique_value_thesis_count: result.unique_value_thesis_count,
          setup_semantic_artifacts: result.setupSemanticSummaries,
          setup_nodes: Object.fromEntries(
            Object.entries(result.setupNodes).map(([node, nodeResult]) => [node, summarizeNode(nodeResult)]),
          ),
          samples: result.samples,
        });
        continue;
      }

      assert.fail(`Unhandled TOPIC_SELECTION_V1B_HARNESS_SCENARIO: ${SCENARIO}`);
    }

    const summary = {
      status: 'passed',
      run_id: RUN_ID,
      scenario: SCENARIO,
      semantic_mode: SEMANTIC_MODE,
      provider_id: null,
      input_bundle_id: EXISTING_V1B_INPUT_BUNDLE_ID,
      repeat_count: REPEAT_COUNT,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      artifact_dir: path.relative(REPO_ROOT, ARTIFACT_DIR),
      legacy_write_routes_registered: false,
      runs,
    };
    await writeJson(path.join(ARTIFACT_DIR, 'result.json'), summary);
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    const failure = {
      status: 'failed',
      run_id: RUN_ID,
      scenario: SCENARIO,
      semantic_mode: SEMANTIC_MODE,
      provider_id: null,
      started_at: startedAt,
      failed_at: new Date().toISOString(),
      artifact_dir: path.relative(REPO_ROOT, ARTIFACT_DIR),
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: String(error) },
      runs,
    };
    await writeJson(path.join(ARTIFACT_DIR, 'failure.json'), failure);
    throw error;
  } finally {
    await app.close();
  }
}

await main();
