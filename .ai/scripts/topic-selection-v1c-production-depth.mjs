#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { acquireSuiteLock } from '../../apps/backend/scripts/lib/suite-lock.mjs';
import { PrismaClient } from '@prisma/client';

import { PrismaTopicSelectionPromptPacketCacheStore } from '../../apps/backend/src/repositories/prisma/prisma-topic-selection-prompt-packet-cache-store.ts';
import {
  TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID,
  TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID,
  TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID,
  TopicSelectionModelProfileRegistryService,
} from '../../apps/backend/src/services/topic-selection-model-profile-registry-service.ts';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const STARTED_AT = new Date();
const RUN_ID = optionalString(process.env.TOPIC_SELECTION_V1C_PRODUCTION_DEPTH_RUN_ID)
  ?? `t112-v1c-production-depth-${Date.now()}`;
const ARTIFACT_DIR = path.join(REPO_ROOT, '.ai/.tmp/topic-selection-v1c-production-depth', RUN_ID);
const RUNTIME_STRESS_ITERATIONS = positiveInt(
  process.env.TOPIC_SELECTION_V1C_PRODUCTION_DEPTH_RUNTIME_ITERATIONS,
  2,
);
const CONCURRENT_STRESS_RUNS = positiveInt(
  process.env.TOPIC_SELECTION_V1C_PRODUCTION_DEPTH_CONCURRENT_STRESS_RUNS,
  2,
);
const FIRST_WRITER_RACE_WRITERS = positiveInt(
  process.env.TOPIC_SELECTION_V1C_PRODUCTION_DEPTH_RACE_WRITERS,
  8,
);
const INCLUDE_PROVIDER_CANARY = boolEnv(
  process.env.TOPIC_SELECTION_V1C_PRODUCTION_DEPTH_INCLUDE_PROVIDER_CANARY,
  true,
);
const RETENTION_OBSERVATION_DAYS = positiveInt(
  process.env.TOPIC_SELECTION_V1C_PRODUCTION_DEPTH_RETENTION_OBSERVATION_DAYS,
  7,
);
const CHILD_TIMEOUT_MS = positiveInt(
  process.env.TOPIC_SELECTION_V1C_PRODUCTION_DEPTH_CHILD_TIMEOUT_MS,
  1800000,
);

const V1C_SLOT_IDS = [
  'n2_bounded_micro_debate.promotion_supporter_draft',
  'n2_bounded_micro_debate.reviewer_critic_review',
  'n2_bounded_micro_debate.promotion_supporter_repair',
  'n2_bounded_micro_debate.synthesizer_final',
  'n4_delegated_promotion_decision_candidate',
  'downstream_feedback_normalization',
];

const V1C_PROVIDER_PROFILES = [
  {
    slot_family: 'n2_bounded_micro_debate',
    profile_id: TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID,
  },
  {
    slot_family: 'n4_delegated_promotion_decision',
    profile_id: TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID,
  },
  {
    slot_family: 'n6_feedback_normalization',
    profile_id: TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID,
  },
];

function optionalString(value) {
  const normalized = value?.trim();
  return normalized || null;
}

function positiveInt(raw, fallback) {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function boolEnv(raw, fallback) {
  if (raw == null || String(raw).trim() === '') return fallback;
  const normalized = String(raw).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new Error(`Invalid boolean env value: ${raw}`);
}

function commandText(command, args) {
  return [command, ...args].join(' ');
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function ref(refType, refId) {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: 'v1',
    title_card_id: 'title_card_v1c_production_depth',
  };
}

function sanitizedEnv(env) {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => (
      key.startsWith('TOPIC_SELECTION_')
      || key === 'TITLE_CARD_REPOSITORY'
      || key === 'RESEARCH_LIFECYCLE_REPOSITORY'
      || key === 'BACKEND_TEST_PRESERVE_REAL_ENV'
      || key === 'TS_NODE_PROJECT'
      || key.startsWith('T112_')
    )),
  );
}

function groupBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = row[key] ?? 'null';
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

async function readJsonIfPresent(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return null;
    throw error;
  }
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
    assert.equal(fields.includes(forbiddenField), false, `Prompt packet index must not persist ${forbiddenField}.`);
  }
}

async function promptPacketIndexSnapshot(prisma, since = null) {
  const rows = await prisma.topicSelectionPromptPacketCacheIndex.findMany({
    where: since ? { createdAt: { gte: since } } : undefined,
    select: {
      promptPacketHash: true,
      invocationSlotId: true,
      qualityDecision: true,
      freshnessStatus: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  return {
    total_count: rows.length,
    by_invocation_slot_id: groupBy(rows, 'invocationSlotId'),
    by_quality_decision: groupBy(rows, 'qualityDecision'),
    by_freshness_status: groupBy(rows, 'freshnessStatus'),
    oldest_created_at: rows[0]?.createdAt?.toISOString() ?? null,
    newest_created_at: rows.at(-1)?.createdAt?.toISOString() ?? null,
    sample_prompt_packet_hashes: rows.slice(0, 10).map((row) => row.promptPacketHash),
  };
}

async function retentionObservation(prisma, beforeCleanup) {
  const cutoff = new Date(STARTED_AT.getTime() - RETENTION_OBSERVATION_DAYS * 24 * 60 * 60 * 1000);
  const olderThanCutoff = await prisma.topicSelectionPromptPacketCacheIndex.count({
    where: { createdAt: { lt: cutoff } },
  });
  const createdSinceStart = await promptPacketIndexSnapshot(prisma, STARTED_AT);
  return {
    destructive_cleanup_performed: false,
    retention_observation_days: RETENTION_OBSERVATION_DAYS,
    older_than_retention_observation_count: olderThanCutoff,
    temporary_first_writer_race_row_deleted: beforeCleanup.row_count_after_cleanup === 0,
    created_since_production_depth_start: createdSinceStart,
  };
}

function promptPacketStoreEntry(writerIndex) {
  const writerLabel = String(writerIndex).padStart(2, '0');
  const promptPacketHash = hash(`v1c-production-depth:first-writer:${RUN_ID}`);
  return {
    prompt_packet_hash: promptPacketHash,
    prompt_template_id: 'topic-selection-v1c-production-depth-first-writer',
    prompt_template_version: '1',
    prompt_variant_key: 'prompt-index-first-writer-race',
    invocation_slot_id: 'prompt_index_first_writer_race',
    context_policy_profile_id: 'topic-selection.v1c.production-depth.first-writer.context-runtime@v1',
    context_policy_profile_version: 'v1',
    context_policy_profile_hash: hash('topic-selection.v1c.production-depth.first-writer.context-runtime@v1'),
    output_contract: 'TopicSelectionV1cProductionDepthFirstWriterRace@v1',
    redaction_policy: 'topic-selection-redacted-ref-backed-v1',
    context_packet_hashes_hash: hash(`context-packet-hashes:${RUN_ID}`),
    compression_report_hash: null,
    compressed_context_hash: null,
    dynamic_material_refs_hash: hash(`dynamic-material:${RUN_ID}`),
    model_option_id: `${TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID}.openai-balanced`,
    normalized_params_hash: hash('normalized-provider-params'),
    runtime_modifiers_hash: hash('provider-required-live:false'),
    redacted_prompt_artifact_ref: ref('artifact_ref', `redacted_prompt_writer_${writerLabel}_${RUN_ID}`),
    redacted_prompt_artifact_hash: hash(`redacted-prompt-writer-${writerLabel}`),
    prompt_quality_report_ref: ref('artifact_ref', `prompt_quality_writer_${writerLabel}_${RUN_ID}`),
    prompt_quality_report_hash: hash(`prompt-quality-writer-${writerLabel}`),
    quality_decision: 'pass',
    freshness_status: 'fresh',
    provenance_ref: ref('artifact_ref', `prompt_index_first_writer_race_${RUN_ID}`),
    blocker_codes: [],
    warning_codes: ['PRODUCTION_DEPTH_FIRST_WRITER_RACE'],
  };
}

async function runPromptIndexFirstWriterRace(prisma) {
  const promptPacketHash = hash(`v1c-production-depth:first-writer:${RUN_ID}`);
  await prisma.topicSelectionPromptPacketCacheIndex.deleteMany({
    where: { promptPacketHash },
  });

  const store = new PrismaTopicSelectionPromptPacketCacheStore(prisma, {
    allowMissingTableFallback: false,
    now: () => STARTED_AT,
  });
  let rowsBeforeCleanup = [];
  let returnedPromptArtifactRefs = new Set();
  let insertedCount = 0;
  let cleanupDeletedCount = 0;
  let rowCountAfterCleanup = 0;

  try {
    const results = await Promise.all(
      Array.from({ length: FIRST_WRITER_RACE_WRITERS }, (_, index) => (
        store.putIfAbsent(promptPacketStoreEntry(index + 1))
      )),
    );
    rowsBeforeCleanup = await prisma.topicSelectionPromptPacketCacheIndex.findMany({
      where: { promptPacketHash },
      select: {
        promptPacketHash: true,
        redactedPromptArtifactRef: true,
        promptQualityReportRef: true,
        qualityDecision: true,
        freshnessStatus: true,
      },
    });
    returnedPromptArtifactRefs = new Set(
      results.map((result) => result.entry.redacted_prompt_artifact_ref.ref_id),
    );
    insertedCount = results.filter((result) => result.inserted).length;
    assert.equal(insertedCount, 1, 'Exactly one first-writer race participant may insert.');
    assert.equal(rowsBeforeCleanup.length, 1, 'Prompt packet index first-writer race must leave one row.');
    assert.equal(returnedPromptArtifactRefs.size, 1, 'All race participants must observe the winning prompt artifact ref.');
    assert.equal(rowsBeforeCleanup[0]?.qualityDecision, 'pass');
    assert.equal(rowsBeforeCleanup[0]?.freshnessStatus, 'fresh');
  } finally {
    const cleanup = await prisma.topicSelectionPromptPacketCacheIndex.deleteMany({
      where: { promptPacketHash },
    });
    cleanupDeletedCount = cleanup.count;
    rowCountAfterCleanup = await prisma.topicSelectionPromptPacketCacheIndex.count({
      where: { promptPacketHash },
    });
  }

  assert.equal(cleanupDeletedCount, 1, 'First-writer race cleanup should delete the temporary row.');
  assert.equal(rowCountAfterCleanup, 0, 'First-writer race cleanup must leave zero rows.');

  return {
    writer_count: FIRST_WRITER_RACE_WRITERS,
    inserted_count: insertedCount,
    returned_prompt_artifact_ref_count: returnedPromptArtifactRefs.size,
    winning_prompt_artifact_ref: [...returnedPromptArtifactRefs][0] ?? null,
    row_count_before_cleanup: rowsBeforeCleanup.length,
    cleanup_deleted_count: cleanupDeletedCount,
    row_count_after_cleanup: rowCountAfterCleanup,
  };
}

function assertProviderProfileDriftGuards() {
  const registry = new TopicSelectionModelProfileRegistryService();
  const validation = registry.validateRegistry();
  assert.equal(validation.valid, true, 'Model profile registry must be valid for production-depth.');
  const resolved = [];

  for (const profile of V1C_PROVIDER_PROFILES) {
    for (const provider of ['openai', 'dashscope']) {
      const suffix = provider === 'openai' ? 'openai-balanced' : 'dashscope-thinking-budget';
      const modelOptionId = `${profile.profile_id}.${suffix}`;
      const modelProfile = registry.resolveProfile({
        profile_id: profile.profile_id,
        execution_mode: 'provider_llm',
        run_mode: 'acceptance',
        model_option_id: modelOptionId,
      });
      assert.equal(modelProfile.selected_model_option?.provider_id, provider);
      assert.equal(modelProfile.profile.provider_fallback_policy.automatic_fallback, false);
      assert.equal(modelProfile.profile.failure_handling_policy.technical_retry.require_same_profile, true);
      assert.equal(modelProfile.profile.failure_handling_policy.technical_retry.require_same_model_option, true);
      assert.equal(modelProfile.profile.failure_handling_policy.technical_retry.require_same_prompt_packet_hash, true);
      assert.equal(modelProfile.profile.failure_handling_policy.technical_retry.require_same_context_packet_hashes, true);
      assert.match(modelProfile.profile_hash, /^[a-f0-9]{64}$/);
      assert.match(modelProfile.normalized_params_hash ?? '', /^[a-f0-9]{64}$/);
      resolved.push({
        slot_family: profile.slot_family,
        profile_id: profile.profile_id,
        provider_id: provider,
        model_option_id: modelOptionId,
        model_id: modelProfile.selected_model_option?.model_id ?? null,
        profile_hash: modelProfile.profile_hash,
        normalized_params_hash: modelProfile.normalized_params_hash,
      });
    }
  }

  let crossProfileOptionBlocked = false;
  try {
    registry.resolveProfile({
      profile_id: TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID,
      execution_mode: 'provider_llm',
      run_mode: 'acceptance',
      model_option_id: `${TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID}.openai-balanced`,
    });
  } catch (error) {
    crossProfileOptionBlocked = error instanceof Error
      && error.message.includes('model_option_id is not defined by model profile');
  }
  assert.equal(crossProfileOptionBlocked, true, 'Cross-profile provider option drift must block.');

  return {
    validation_issue_count: validation.issue_count,
    resolved_provider_profile_count: resolved.length,
    cross_profile_option_drift_blocked: crossProfileOptionBlocked,
    resolved,
  };
}

async function runCommand(step) {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  const stdoutPath = path.join(ARTIFACT_DIR, `${step.id}.stdout.log`);
  const stderrPath = path.join(ARTIFACT_DIR, `${step.id}.stderr.log`);
  const stdoutChunks = [];
  const stderrChunks = [];
  const startedAt = new Date();
  const env = {
    ...process.env,
    ...(step.env ?? {}),
  };
  const timeoutMs = step.timeoutMs ?? CHILD_TIMEOUT_MS;

  // Multi-file `node --test` steps spawn a ts-node fleet comparable to the
  // full backend suite's — take the machine-wide suite lock so they never
  // overlap another session's fleet. Acquired before the step timer starts,
  // so lock wait does not consume the step budget. Residual (pre-existing):
  // a step timeout kills only the coordinator, so orphaned workers may
  // briefly outlive the released lock on that rare path.
  const spawnsTestFleet =
    step.args.filter((arg) => typeof arg === 'string' && arg.endsWith('.test.ts')).length >= 2;
  const releaseSuiteLock = spawnsTestFleet ? await acquireSuiteLock() : () => {};

  let exit;
  try {
    exit = await new Promise((resolve, reject) => {
      const child = spawn(step.command, step.args, {
        cwd: REPO_ROOT,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let timedOut = false;
      let forceKillTimeout = null;
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        forceKillTimeout = setTimeout(() => child.kill('SIGKILL'), 5000);
      }, timeoutMs);
      child.stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
      child.stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));
      child.on('error', (error) => {
        clearTimeout(timeout);
        if (forceKillTimeout) clearTimeout(forceKillTimeout);
        reject(error);
      });
      child.on('close', (code, signal) => {
        clearTimeout(timeout);
        if (forceKillTimeout) clearTimeout(forceKillTimeout);
        resolve({ code, signal, timed_out: timedOut });
      });
    });
  } finally {
    releaseSuiteLock();
  }

  const stdout = Buffer.concat(stdoutChunks).toString('utf8');
  const stderr = Buffer.concat(stderrChunks).toString('utf8');
  await fs.writeFile(stdoutPath, stdout);
  await fs.writeFile(stderrPath, stderr);
  const finishedAt = new Date();
  const parsedSummary = step.summaryPath
    ? await readJsonIfPresent(path.resolve(REPO_ROOT, step.summaryPath))
    : null;
  const result = {
    id: step.id,
    layer: step.layer,
    status: exit.code === 0 && !exit.timed_out ? 'passed' : 'failed',
    command: commandText(step.command, step.args),
    env: sanitizedEnv(step.env ?? {}),
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: finishedAt.getTime() - startedAt.getTime(),
    logs: {
      stdout_path: path.relative(REPO_ROOT, stdoutPath),
      stderr_path: path.relative(REPO_ROOT, stderrPath),
    },
    exit,
    parsed_summary: parsedSummary,
  };
  if (exit.timed_out) {
    throw Object.assign(new Error(`Step ${step.id} timed out after ${timeoutMs}ms.`), { step_result: result });
  }
  if (exit.code !== 0) {
    throw Object.assign(
      new Error(`Step ${step.id} failed with code ${exit.code} signal ${exit.signal ?? 'none'}.`),
      { step_result: result },
    );
  }
  if (step.layer === 'runtime_stress') {
    assertRuntimeStressSummary(parsedSummary, step.expectedIterations);
  }
  return result;
}

function assertRuntimeStressSummary(summary, expectedIterations) {
  assert.equal(summary?.status, 'passed', 'v1c runtime stress child must pass.');
  assert.equal(summary.runtime_smoke_assertions?.n2_iterations, expectedIterations);
  assert.equal(summary.runtime_smoke_assertions?.n4_iterations, expectedIterations);
  assert.equal(summary.runtime_smoke_assertions?.n6_iterations, expectedIterations);
  assert.equal(summary.prompt_packet_index?.created_during_stress?.by_quality_decision?.block ?? 0, 0);
  for (const slotId of V1C_SLOT_IDS) {
    assert.ok(
      (summary.prompt_packet_index?.created_during_stress?.by_invocation_slot_id?.[slotId] ?? 0) >= expectedIterations,
      `runtime stress child missing slot ${slotId}`,
    );
  }
}

function syntaxStep(id, scriptPath) {
  return {
    id,
    layer: 'preflight',
    command: process.execPath,
    args: ['--check', scriptPath],
    timeoutMs: 120000,
  };
}

function runtimeStressStep(suffix, id, options = {}) {
  const childRunId = `${RUN_ID}-${suffix}`;
  return {
    id,
    layer: 'runtime_stress',
    command: 'pnpm',
    args: ['topic-selection:v1c-runtime-stress'],
    env: {
      TOPIC_SELECTION_V1C_RUNTIME_STRESS_RUN_ID: childRunId,
      TOPIC_SELECTION_V1C_RUNTIME_STRESS_ITERATIONS: String(RUNTIME_STRESS_ITERATIONS),
      TOPIC_SELECTION_V1C_RUNTIME_STRESS_INCLUDE_HARNESS_ACCEPTANCE: options.includeHarnessAcceptance ? '1' : '0',
      TOPIC_SELECTION_V1C_RUNTIME_STRESS_INCLUDE_PROVIDER_CANARY: '0',
    },
    timeoutMs: CHILD_TIMEOUT_MS,
    summaryPath: `.ai/.tmp/topic-selection-v1c-runtime-stress/${childRunId}/90-summary.json`,
    expectedIterations: RUNTIME_STRESS_ITERATIONS,
  };
}

function focusedUnitStep() {
  return {
    id: '30-runtime-compression-admission-units',
    layer: 'runtime_compression_admission_units',
    command: 'pnpm',
    args: [
      '--filter',
      '@paper-engineering-assistant/backend',
      'exec',
      'node',
      '--test',
      '--loader',
      'ts-node/esm',
      'src/repositories/prisma/prisma-topic-selection-prompt-packet-cache-store.unit.test.ts',
      'src/services/topic-selection-context-policy-profile-registry-service.unit.test.ts',
      'src/services/topic-selection-model-profile-registry-service.unit.test.ts',
      'src/services/topic-selection-compression-runtime-service.unit.test.ts',
      'src/services/topic-selection-v1c-n2-bounded-debate-runtime-service.unit.test.ts',
      'src/services/topic-selection-v1c-n4-delegated-promotion-decision-runtime-service.unit.test.ts',
      'src/services/topic-selection-v1c-n6-feedback-normalization-runtime-service.unit.test.ts',
    ],
    env: {
      TS_NODE_PROJECT: 'tsconfig.json',
    },
    timeoutMs: CHILD_TIMEOUT_MS,
  };
}

function providerCanaryStep() {
  return {
    id: '40-provider-slot-canary-local',
    layer: 'provider_required_live_local',
    command: 'pnpm',
    args: ['topic-selection:v1c-provider-canary'],
    env: {
      BACKEND_TEST_PRESERVE_REAL_ENV: '1',
      T112_PROVIDER_CANARY_LIVE: '0',
      T112_V1C_N2_PROVIDER_CANARY_LIVE: '0',
      T112_V1C_N4_PROVIDER_CANARY_LIVE: '0',
      T112_V1C_N6_PROVIDER_CANARY_LIVE: '0',
      T112_V1B_N4_PROVIDER_CANARY_LIVE: '0',
      T112_V1B_N6_PROVIDER_CANARY_LIVE: '0',
      T112_V1B_N8_PROVIDER_CANARY_LIVE: '0',
      TS_NODE_PROJECT: 'tsconfig.json',
    },
    timeoutMs: CHILD_TIMEOUT_MS,
  };
}

function assertProductionDepthPromptIndex(snapshot, expectedIterations) {
  assert.equal(snapshot.by_quality_decision.block ?? 0, 0, 'Production-depth prompt index must not create blockers.');
  for (const slotId of V1C_SLOT_IDS) {
    assert.ok(
      (snapshot.by_invocation_slot_id[slotId] ?? 0) >= expectedIterations,
      `Expected at least ${expectedIterations} prompt packet row(s) for ${slotId}, got ${
        snapshot.by_invocation_slot_id[slotId] ?? 0
      }.`,
    );
  }
}

async function main() {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  const prisma = new PrismaClient();
  const results = [];
  const summaryPath = path.join(ARTIFACT_DIR, '90-summary.json');
  const startedAt = new Date();
  const config = {
    run_id: RUN_ID,
    runtime_stress_iterations: RUNTIME_STRESS_ITERATIONS,
    concurrent_stress_runs: CONCURRENT_STRESS_RUNS,
    first_writer_race_writers: FIRST_WRITER_RACE_WRITERS,
    include_provider_canary: INCLUDE_PROVIDER_CANARY,
    retention_observation_days: RETENTION_OBSERVATION_DAYS,
    child_timeout_ms: CHILD_TIMEOUT_MS,
    live_provider_canaries_are_explicit_only: true,
  };

  try {
    assertPromptPacketIndexModelMetadataOnly(prisma);
    const before = await promptPacketIndexSnapshot(prisma);
    results.push(await runCommand(syntaxStep('00-script-syntax-production-depth', '.ai/scripts/topic-selection-v1c-production-depth.mjs')));
    results.push(await runCommand(syntaxStep('00-script-syntax-runtime-stress', '.ai/scripts/topic-selection-v1c-runtime-stress.mjs')));
    results.push(await runCommand(syntaxStep('00-script-syntax-n2-runtime-smoke', '.ai/scripts/topic-selection-v1c-n2-runtime-smoke.mjs')));
    results.push(await runCommand(syntaxStep('00-script-syntax-n4-runtime-smoke', '.ai/scripts/topic-selection-v1c-n4-runtime-smoke.mjs')));
    results.push(await runCommand(syntaxStep('00-script-syntax-n6-runtime-smoke', '.ai/scripts/topic-selection-v1c-n6-runtime-smoke.mjs')));

    const providerProfileDrift = assertProviderProfileDriftGuards();
    const firstWriterRace = await runPromptIndexFirstWriterRace(prisma);

    results.push(await runCommand(runtimeStressStep('runtime-stress-serial', '10-runtime-stress-serial', {
      includeHarnessAcceptance: true,
    })));

    const concurrentSteps = Array.from({ length: CONCURRENT_STRESS_RUNS }, (_, index) => runtimeStressStep(
      `runtime-stress-concurrent-${String(index + 1).padStart(2, '0')}`,
      `20-runtime-stress-concurrent-${String(index + 1).padStart(2, '0')}`,
      { includeHarnessAcceptance: false },
    ));
    results.push(...await Promise.all(concurrentSteps.map((step) => runCommand(step))));

    results.push(await runCommand(focusedUnitStep()));
    if (INCLUDE_PROVIDER_CANARY) {
      results.push(await runCommand(providerCanaryStep()));
    }

    const after = await promptPacketIndexSnapshot(prisma);
    const createdDuringProductionDepth = await promptPacketIndexSnapshot(prisma, STARTED_AT);
    const expectedStressIterations = RUNTIME_STRESS_ITERATIONS * (1 + CONCURRENT_STRESS_RUNS);
    assertProductionDepthPromptIndex(createdDuringProductionDepth, expectedStressIterations);
    const retention = await retentionObservation(prisma, firstWriterRace);
    assert.equal(retention.temporary_first_writer_race_row_deleted, true);

    const summary = {
      schema_version: 'topic-selection-v1c-production-depth-summary-v0',
      status: 'passed',
      scenario_id: 'topic-selection.v1c.production-depth.prisma.v1',
      config,
      artifact_dir: path.relative(REPO_ROOT, ARTIFACT_DIR),
      started_at: startedAt.toISOString(),
      completed_at: new Date().toISOString(),
      layers: results.map((result) => ({
        id: result.id,
        layer: result.layer,
        status: result.status,
        duration_ms: result.duration_ms,
        logs: result.logs,
        parsed_status: result.parsed_summary?.status ?? null,
        parsed_scenario: result.parsed_summary?.scenario_id ?? null,
      })),
      first_writer_race: firstWriterRace,
      provider_profile_drift: providerProfileDrift,
      prompt_packet_index: {
        before,
        after,
        created_during_production_depth: createdDuringProductionDepth,
        expected_stress_iterations: expectedStressIterations,
        retention,
      },
    };
    assert.equal(summary.layers.every((layer) => layer.status === 'passed'), true);
    await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({
      status: summary.status,
      run_id: RUN_ID,
      summary_path: summaryPath,
      layer_count: summary.layers.length,
      expected_stress_iterations: expectedStressIterations,
      prompt_index_created_count: createdDuringProductionDepth.total_count,
      prompt_index_slots: createdDuringProductionDepth.by_invocation_slot_id,
      first_writer_race: firstWriterRace,
      provider_profile_drift_checked: providerProfileDrift.resolved_provider_profile_count,
    }, null, 2));
  } catch (error) {
    const stepResult = error && typeof error === 'object' && 'step_result' in error
      ? error.step_result
      : null;
    if (stepResult) {
      results.push(stepResult);
    }
    const failure = {
      schema_version: 'topic-selection-v1c-production-depth-summary-v0',
      status: 'failed',
      scenario_id: 'topic-selection.v1c.production-depth.prisma.v1',
      config,
      artifact_dir: path.relative(REPO_ROOT, ARTIFACT_DIR),
      started_at: startedAt.toISOString(),
      failed_at: new Date().toISOString(),
      completed_layers: results.map((result) => ({
        id: result.id,
        layer: result.layer,
        status: result.status,
        duration_ms: result.duration_ms,
        logs: result.logs,
      })),
      error: error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            step_result: error.step_result ?? null,
          }
        : { message: String(error) },
    };
    await fs.writeFile(summaryPath, `${JSON.stringify(failure, null, 2)}\n`, 'utf8');
    console.error(JSON.stringify(failure, null, 2));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

await main();
