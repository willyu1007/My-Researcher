#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';
import {
  EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST,
} from '../../packages/shared/src/research-lifecycle/experiment-foundation-d19-source-policy.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACT_ROOT = path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-productization');
const MIGRATION_NAME = '20260713180000_add_experiment_foundation_d19_v2_spine';
const MIGRATION_PATH = path.join(REPO_ROOT, `prisma/migrations/${MIGRATION_NAME}/migration.sql`);
const EXPECTED_MIGRATION_SHA256 =
  'ab7e86a3a717f80981052865d151f71938d6652e1d6ad93c9972df72c934ca46';
const SOURCE_POLICY_PATH = path.join(
  REPO_ROOT,
  'dev-docs/active/experiment-foundation-productization-closure/artifacts/source-policy/00-d19-source-policy-attestation.json',
);
export const PACK_A_LOCAL_DATABASE = 'postgres';
export const PACK_A_LOCAL_SCHEMA = 'my_researcher_dev';
export const PACK_A_LOCAL_HOST = '127.0.0.1';
export const PACK_A_LOCAL_PORT = '5432';
export const PACK_A_LOCAL_TARGET_FINGERPRINT =
  'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0';

export const PACK_A_PI_V2_TABLES = [
  'PaperImplementationExperimentWorkOrderBranchV2',
  'PaperImplementationExperimentWorkOrderRevisionV2',
  'PaperImplementationExperimentWorkOrderRevisionCellV2',
  'PaperImplementationExperimentWorkOrderAdmissionV2',
  'PaperImplementationExperimentIntegrationInboxV2',
  'PaperImplementationExperimentIntegrationOutboxV2',
];

export const PACK_A_EF_V2_TABLES = [
  'ExperimentFoundationDatasetV2',
  'ExperimentFoundationDatasetRevisionV2',
  'ExperimentFoundationDatasetFreezeCommandReceiptV2',
  'ExperimentFoundationDataPolicyV2',
  'ExperimentFoundationDataPolicyRevisionV2',
  'ExperimentFoundationDataPolicyFreezeCommandReceiptV2',
  'ExperimentFoundationMetricDefinitionV2',
  'ExperimentFoundationMetricDefinitionRevisionV2',
  'ExperimentFoundationMetricDefinitionFreezeCommandReceiptV2',
  'ExperimentFoundationBenchmarkV2',
  'ExperimentFoundationBenchmarkRevisionV2',
  'ExperimentFoundationBenchmarkFreezeCommandReceiptV2',
  'ExperimentFoundationEvaluationProtocolV2',
  'ExperimentFoundationEvaluationProtocolRevisionV2',
  'ExperimentFoundationEvaluationProtocolFreezeCommandReceiptV2',
  'ExperimentFoundationEvaluationProtocolMetricDependencyV2',
  'ExperimentFoundationAssetLifecycleEventV2',
  'ExperimentFoundationAssetLifecycleProjectionV2',
  'ExperimentFoundationReadinessAttestationV2',
  'ExperimentFoundationReadinessDependencyV2',
  'ExperimentFoundationVersionLockV2',
  'ExperimentFoundationVersionLockDependencyV2',
  'ExperimentFoundationRunRecipeV2',
  'ExperimentFoundationTrainingTaskSpecV2',
  'ExperimentFoundationRunV2',
  'ExperimentFoundationRunCellV2',
  'ExperimentFoundationIntegrationInboxV2',
  'ExperimentFoundationIntegrationOutboxV2',
];

export const PACK_A_V2_TABLES = [...PACK_A_PI_V2_TABLES, ...PACK_A_EF_V2_TABLES];

const LEGACY_DIGEST_TABLES = [
  'PaperImplementationResearchWorkOrder',
  'PaperImplementationWorkOrderHarnessRun',
  'ExperimentFoundationRecord',
  'ExperimentFoundationReadinessReport',
  'ExperimentFoundationExternalTrainingJob',
];

const METRIC_DEFINITIONS = [
  metric('embedding_time_ns', 'lower_is_better', 'duration_ns', 'ns', 'ragperf_text_pipeline_stats'),
  metric('generation_time_ns', 'lower_is_better', 'duration_ns', 'ns', 'ragperf_text_pipeline_stats'),
  metric('prompt_time_ns', 'lower_is_better', 'duration_ns', 'ns', 'ragperf_text_pipeline_stats'),
  metric('qps', 'higher_is_better', 'number', 'queries_per_second', 'ragperf_derived_qps'),
  metric('rerank_time_ns', 'lower_is_better', 'duration_ns', 'ns', 'ragperf_text_pipeline_stats'),
  metric('retrieval_time_ns', 'lower_is_better', 'duration_ns', 'ns', 'ragperf_text_pipeline_stats'),
  metric('total_pipeline_time_ns', 'lower_is_better', 'duration_ns', 'ns', 'ragperf_derived_total_time'),
  metric('factual_correctness', 'higher_is_better', 'number', 'score', 'ragas_vllm'),
  metric('answer_accuracy', 'higher_is_better', 'number', 'score', 'ragas_vllm'),
  metric('llm_context_recall', 'higher_is_better', 'number', 'score', 'ragas_vllm'),
  metric('faithfulness', 'higher_is_better', 'number', 'score', 'ragas'),
  metric('context_recall', 'higher_is_better', 'number', 'score', 'ragas'),
  metric('context_precision', 'higher_is_better', 'number', 'score', 'ragas'),
  metric('answer_relevancy', 'higher_is_better', 'number', 'score', 'ragas'),
  metric('gpu_utilization', 'informational', 'percentage', 'percent', 'msys_gpu_meter'),
  metric(
    'gpu_memory_or_dram_bandwidth',
    'informational',
    'number',
    'bytes_per_second',
    'msys_gpu_meter',
  ),
  metric(
    'cpu_memory_disk_process_io',
    'informational',
    'number',
    'bytes_per_second',
    'msys_resource_meters',
  ),
];

const ACTIVE_METRIC_KEYS = [
  'embedding_time_ns',
  'generation_time_ns',
  'prompt_time_ns',
  'qps',
  'rerank_time_ns',
  'retrieval_time_ns',
  'total_pipeline_time_ns',
];

const ASSET_FAMILIES = {
  DataPolicy: {
    identity_table: 'ExperimentFoundationDataPolicyV2',
    revision_table: 'ExperimentFoundationDataPolicyRevisionV2',
    freeze_receipt_table: 'ExperimentFoundationDataPolicyFreezeCommandReceiptV2',
    owner_field: 'dataPolicyId',
    identity_key_field: 'dataPolicyKey',
    snapshot_key_field: 'policy_key',
    snapshot_field: 'dataPolicySnapshotJson',
    draft_field: 'dataPolicyDraftJson',
  },
  MetricDefinition: {
    identity_table: 'ExperimentFoundationMetricDefinitionV2',
    revision_table: 'ExperimentFoundationMetricDefinitionRevisionV2',
    freeze_receipt_table: 'ExperimentFoundationMetricDefinitionFreezeCommandReceiptV2',
    owner_field: 'metricDefinitionId',
    identity_key_field: 'metricDefinitionKey',
    snapshot_key_field: 'metric_key',
    snapshot_field: 'metricDefinitionSnapshotJson',
    draft_field: 'metricDefinitionDraftJson',
  },
  Dataset: {
    identity_table: 'ExperimentFoundationDatasetV2',
    revision_table: 'ExperimentFoundationDatasetRevisionV2',
    freeze_receipt_table: 'ExperimentFoundationDatasetFreezeCommandReceiptV2',
    owner_field: 'datasetId',
    identity_key_field: 'datasetKey',
    snapshot_key_field: 'dataset_key',
    snapshot_field: 'datasetSnapshotJson',
    draft_field: 'datasetDraftJson',
  },
  Benchmark: {
    identity_table: 'ExperimentFoundationBenchmarkV2',
    revision_table: 'ExperimentFoundationBenchmarkRevisionV2',
    freeze_receipt_table: 'ExperimentFoundationBenchmarkFreezeCommandReceiptV2',
    owner_field: 'benchmarkId',
    identity_key_field: 'benchmarkKey',
    snapshot_key_field: 'benchmark_key',
    snapshot_field: 'benchmarkSnapshotJson',
    draft_field: 'benchmarkDraftJson',
  },
  EvaluationProtocol: {
    identity_table: 'ExperimentFoundationEvaluationProtocolV2',
    revision_table: 'ExperimentFoundationEvaluationProtocolRevisionV2',
    freeze_receipt_table: 'ExperimentFoundationEvaluationProtocolFreezeCommandReceiptV2',
    owner_field: 'evaluationProtocolId',
    identity_key_field: 'evaluationProtocolKey',
    snapshot_key_field: 'protocol_key',
    snapshot_field: 'evaluationProtocolSnapshotJson',
    draft_field: 'evaluationProtocolDraftJson',
  },
};

const DEPENDENCY_ASSET_ORDER = {
  Dataset: 0,
  DataPolicy: 1,
  Benchmark: 2,
  EvaluationProtocol: 3,
  MetricDefinition: 4,
};

const TERMINAL_HARNESS_STATUSES = new Set(['completed', 'failed', 'cancelled']);
const TERMINAL_MONITOR_STATUSES = new Set([
  'succeeded', 'failed', 'cancelled', 'inconclusive', 'negative',
]);
const TERMINAL_EXTERNAL_JOB_STATUSES = new Set(['succeeded', 'failed', 'cancelled']);

function parseArgs(argv) {
  let runId = null;
  let output = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--run-id') {
      runId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (argv[index] === '--output') {
      output = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!runId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(runId)) {
    throw new Error('--run-id is required and must contain 1..64 safe filename characters');
  }
  const defaultOutput = path.join(ARTIFACT_ROOT, runId, 'local-landing-gate.json');
  const outputPath = path.resolve(REPO_ROOT, output ?? defaultOutput);
  if (!isPathInside(ARTIFACT_ROOT, outputPath)) {
    throw new Error('Output must remain below .ai/.tmp/experiment-foundation-productization/');
  }
  return { runId, outputPath };
}

function isPathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function sanitizeLocalDatabaseTarget(databaseUrl) {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL must use postgres: or postgresql:');
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!isLoopbackHostname(hostname)) {
    throw new Error('PACK_A_LOCAL_GATE_NON_LOOPBACK_DATABASE_REFUSED');
  }
  const port = parsed.port || '5432';
  if (hostname !== PACK_A_LOCAL_HOST || port !== PACK_A_LOCAL_PORT) {
    throw new Error(
      `PACK_A_LOCAL_GATE_ENDPOINT_MISMATCH: expected ${PACK_A_LOCAL_HOST}:${PACK_A_LOCAL_PORT}`,
    );
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!databaseName) throw new Error('DATABASE_URL must include a database name');
  const requestedSchema = parsed.searchParams.get('schema');
  if (databaseName !== PACK_A_LOCAL_DATABASE || requestedSchema !== PACK_A_LOCAL_SCHEMA) {
    throw new Error(
      `PACK_A_LOCAL_GATE_TARGET_MISMATCH: expected ${PACK_A_LOCAL_DATABASE}`
      + `?schema=${PACK_A_LOCAL_SCHEMA}`,
    );
  }
  return {
    protocol: parsed.protocol.replace(':', ''),
    host: hostname,
    port,
    database: databaseName,
    requested_schema: requestedSchema,
    loopback_enforced: true,
    username_stored: false,
    password_stored: false,
    database_url_stored: false,
  };
}

export function fingerprintPackALocalTarget(identity) {
  const fields = [
    'pack-a-local-target-fingerprint@v1',
    PACK_A_LOCAL_HOST,
    PACK_A_LOCAL_PORT,
    PACK_A_LOCAL_DATABASE,
    PACK_A_LOCAL_SCHEMA,
    String(identity.system_identifier),
    String(identity.database_oid),
    String(identity.schema_oid),
  ];
  return `sha256:${crypto.createHash('sha256').update(`${fields.join('\n')}\n`).digest('hex')}`;
}

export function isLoopbackHostname(hostname) {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (normalized === 'localhost' || normalized.endsWith('.localhost') || normalized === '::1') {
    return true;
  }
  return net.isIP(normalized) === 4 && normalized.startsWith('127.');
}

export function canonicalJson(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return JSON.stringify(value);
    case 'number':
      if (!Number.isFinite(value)) throw new TypeError('Non-finite JSON number');
      return JSON.stringify(Object.is(value, -0) ? 0 : value);
    case 'object':
      return `{${Object.keys(value).sort().map((key) => {
        if (value[key] === undefined) throw new TypeError(`Undefined JSON value at ${key}`);
        return `${JSON.stringify(key)}:${canonicalJson(value[key])}`;
      }).join(',')}}`;
    default:
      throw new TypeError(`Unsupported JSON value: ${typeof value}`);
  }
}

export function digestCanonicalJson(value) {
  return `sha256:${crypto.createHash('sha256').update(canonicalJson(value)).digest('hex')}`;
}

function semanticHash(recordKind, schemaVersion, hashProfile, content) {
  return digestCanonicalJson({
    hash_profile: hashProfile,
    record_kind: recordKind,
    schema_version: schemaVersion,
    content,
  });
}

export function digestLegacyIdOrderedRows(rowsByTable) {
  const tables = Object.fromEntries(LEGACY_DIGEST_TABLES.map((tableName) => {
    const rows = rowsByTable[tableName] ?? [];
    return [tableName, { count: rows.length, digest: digestCanonicalJson(rows) }];
  }));
  return {
    algorithm: 'legacy-id-ordered-row-json-sha256@v1',
    ordering: 'fixed table allowlist; each table ordered by text id COLLATE C ascending; row objects canonicalized with lexicographically sorted keys; array order preserved',
    tables,
    aggregate_count: Object.values(tables).reduce((sum, row) => sum + row.count, 0),
    aggregate_digest: digestCanonicalJson(tables),
  };
}

export function classifyLegacyHarnessRuns(harnessRuns, monitors, evidenceUnits) {
  const rows = harnessRuns.map((run) => {
    if (TERMINAL_HARNESS_STATUSES.has(run.run_status)) {
      return {
        harness_run_id: run.id,
        recorded_status: run.run_status,
        classification: 'resolved_terminal_harness_row',
        cutover_blocking: false,
      };
    }
    const matchingMonitors = monitors
      .filter((monitor) => monitorMatchesHarness(monitor, run))
      .filter((monitor) => (
        monitor.trust_status === 'trusted' && TERMINAL_MONITOR_STATUSES.has(monitor.run_status)
      ))
      .sort((left, right) => String(right.received_at).localeCompare(String(left.received_at)));
    const trustedTerminalMonitor = matchingMonitors.find((monitor) => (
      evidenceUnits.some((evidence) => evidenceMatchesMonitor(evidence, monitor, run))
    ));
    if (trustedTerminalMonitor) {
      return {
        harness_run_id: run.id,
        recorded_status: run.run_status,
        classification: 'resolved_by_trusted_terminal_monitor_evidence',
        terminal_monitor_id: trustedTerminalMonitor.id,
        terminal_monitor_status: trustedTerminalMonitor.run_status,
        cutover_blocking: false,
      };
    }
    return {
      harness_run_id: run.id,
      recorded_status: run.run_status,
      classification: 'unresolved_active_harness_run',
      reason_code: matchingMonitors.length > 0
        ? 'TRUSTED_TERMINAL_MONITOR_EVIDENCE_MISSING'
        : 'TRUSTED_TERMINAL_MONITOR_MISSING',
      cutover_blocking: true,
    };
  });
  return summarizeBlockerRows(rows);
}

function monitorMatchesHarness(monitor, run) {
  return monitor.work_order_id === run.work_order_id
    && monitor.external_job_ref_type === run.external_job_ref_type
    && monitor.external_job_ref_id === run.external_job_ref_id
    && (monitor.external_job_version_id ?? null) === (run.external_job_version_id ?? null)
    && monitor.external_job_hash === run.external_job_hash;
}

function evidenceMatchesMonitor(evidence, monitor, run) {
  return evidence.monitor_intake_id === monitor.id
    && evidence.work_order_id === run.work_order_id
    && evidence.trusted_status === 'trusted'
    && evidence.run_status === monitor.run_status
    && evidence.external_job_ref_type === run.external_job_ref_type
    && evidence.external_job_ref_id === run.external_job_ref_id
    && (evidence.external_job_version_id ?? null) === (run.external_job_version_id ?? null)
    && evidence.external_job_hash === run.external_job_hash;
}

export function classifyLegacyExternalTrainingJobs(jobs) {
  const rows = jobs.map((job) => {
    const capabilityProvenance = hasCapabilityTestProvenance(job);
    if (TERMINAL_EXTERNAL_JOB_STATUSES.has(job.job_status)) {
      return {
        external_job_id: job.id,
        recorded_status: job.job_status,
        capability_test_provenance: capabilityProvenance,
        classification: 'resolved_terminal_external_job',
        cutover_blocking: false,
      };
    }
    if (capabilityProvenance) {
      return {
        external_job_id: job.id,
        recorded_status: job.job_status,
        capability_test_provenance: true,
        classification: 'unclassified_inflight_capability_test_until_cancelled',
        reason_code: 'LEGACY_CAPABILITY_TEST_JOB_STILL_INFLIGHT',
        cutover_blocking: true,
      };
    }
    return {
      external_job_id: job.id,
      recorded_status: job.job_status,
      capability_test_provenance: false,
      classification: 'unresolved_inflight_legacy_job',
      reason_code: 'LEGACY_EXTERNAL_JOB_STILL_INFLIGHT',
      cutover_blocking: true,
    };
  });
  return summarizeBlockerRows(rows);
}

function hasCapabilityTestProvenance(job) {
  return [
    job.idempotency_key,
    job.training_task_spec_id,
    job.materialization_result_id,
    job.adapter_version,
    job.platform_id,
  ].some((value) => typeof value === 'string' && /(?:^|[_:.-])capability(?:[_:.-]|$)/i.test(value));
}

function summarizeBlockerRows(rows) {
  const blockers = rows.filter((row) => row.cutover_blocking);
  return {
    rows,
    total_count: rows.length,
    blocker_count: blockers.length,
    blocker_ids: blockers.map((row) => row.harness_run_id ?? row.external_job_id),
  };
}

export function evaluateCutoverConfig(env = process.env) {
  const admission = booleanConfig(env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED);
  const committed = booleanConfig(env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED);
  const paperImplementationRepository = repositoryStrategy([
    env.PAPER_IMPLEMENTATION_REPOSITORY,
    env.TITLE_CARD_REPOSITORY,
    env.RESEARCH_LIFECYCLE_REPOSITORY,
  ]);
  const experimentFoundationRepository = repositoryStrategy([
    env.EXPERIMENT_FOUNDATION_REPOSITORY,
    env.RESEARCH_LIFECYCLE_REPOSITORY,
    env.TITLE_CARD_REPOSITORY,
  ]);
  let phase;
  if (admission.effective && !committed.effective) phase = 'invalid_admission_without_cutover';
  else if (admission.effective && committed.effective) phase = 'v2_intake_legacy_mutations_closed';
  else if (!admission.effective && committed.effective) phase = 'drain_only_legacy_mutations_closed';
  else phase = 'pre_cutover';
  const repositoriesValid = [paperImplementationRepository, experimentFoundationRepository]
    .every((strategy) => strategy === 'memory' || strategy === 'prisma');
  const invalid = !admission.valid
    || !committed.valid
    || !repositoriesValid
    || phase.startsWith('invalid_');
  return {
    admission: {
      key: 'PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED',
      configured: admission.configured,
      effective: admission.effective,
      valid: admission.valid,
      default: false,
    },
    cutover: {
      key: 'PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED',
      configured: committed.configured,
      effective: committed.effective,
      valid: committed.valid,
      default: false,
    },
    repositories: {
      paper_implementation: paperImplementationRepository,
      experiment_foundation: experimentFoundationRepository,
      durable_v2_prisma_ready:
        paperImplementationRepository === 'prisma' && experimentFoundationRepository === 'prisma',
      valid: repositoriesValid,
    },
    phase,
    valid: !invalid,
    cutover_ready: !invalid
      && committed.effective
      && paperImplementationRepository === 'prisma'
      && experimentFoundationRepository === 'prisma',
  };
}

function booleanConfig(raw) {
  if (raw === undefined || raw.trim() === '') {
    return { configured: raw !== undefined, effective: false, valid: true };
  }
  const value = raw.trim().toLowerCase();
  if (value === 'true') return { configured: true, effective: true, valid: true };
  if (value === 'false') return { configured: true, effective: false, valid: true };
  return { configured: true, effective: false, valid: false };
}

function repositoryStrategy(values) {
  const raw = values.find((candidate) => candidate !== undefined);
  if (raw === undefined) return 'memory';
  const normalized = raw.trim().toLowerCase();
  return ['memory', 'prisma'].includes(normalized) ? normalized : `invalid:${normalized}`;
}

export function compareV2TablePopulation(actualTableNames) {
  const expected = [...PACK_A_V2_TABLES].sort();
  const actual = [...actualTableNames].sort();
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return {
    expected_count: expected.length,
    actual_count: actual.length,
    missing: expected.filter((name) => !actualSet.has(name)),
    extra: actual.filter((name) => !expectedSet.has(name)),
    exact: expected.length === actual.length
      && expected.every((name, index) => name === actual[index]),
  };
}

async function collectDatabaseEvidence(tx, tablePopulation) {
  const identity = await tx.$queryRawUnsafe(
    `SELECT current_database() AS database_name,
            current_schema() AS schema_name,
            current_setting('transaction_read_only') AS transaction_read_only,
            system_row.system_identifier::text AS system_identifier,
            database_row.oid::text AS database_oid,
            schema_row.oid::text AS schema_oid
     FROM pg_control_system() AS system_row
     JOIN pg_catalog.pg_database AS database_row
       ON database_row.datname = current_database()
     JOIN pg_catalog.pg_namespace AS schema_row
       ON schema_row.nspname = current_schema()`,
  );
  const migrationTable = await tx.$queryRawUnsafe(
    `SELECT EXISTS (
       SELECT 1 FROM pg_catalog.pg_tables
       WHERE schemaname = current_schema() AND tablename = '_prisma_migrations'
     ) AS present`,
  );
  const migrationRows = migrationTable[0]?.present
    ? await tx.$queryRawUnsafe(
      `SELECT migration_name, checksum, started_at, finished_at, rolled_back_at, applied_steps_count
       FROM "_prisma_migrations"
       WHERE migration_name = $1
       ORDER BY started_at DESC`,
      MIGRATION_NAME,
    )
    : [];
  const foreignKeys = await tx.$queryRawUnsafe(
    `SELECT constraint_row.conname AS constraint_name,
            source_table.relname AS source_table,
            target_table.relname AS target_table
     FROM pg_catalog.pg_constraint AS constraint_row
     JOIN pg_catalog.pg_class AS source_table ON source_table.oid = constraint_row.conrelid
     JOIN pg_catalog.pg_class AS target_table ON target_table.oid = constraint_row.confrelid
     JOIN pg_catalog.pg_namespace AS source_namespace ON source_namespace.oid = source_table.relnamespace
     JOIN pg_catalog.pg_namespace AS target_namespace ON target_namespace.oid = target_table.relnamespace
     WHERE constraint_row.contype = 'f'
       AND source_namespace.nspname = current_schema()
       AND target_namespace.nspname = current_schema()
     ORDER BY source_table.relname, constraint_row.conname`,
  );

  const rowsByTable = {};
  for (const tableName of LEGACY_DIGEST_TABLES) {
    rowsByTable[tableName] = (await tx.$queryRawUnsafe(
      `SELECT to_jsonb(table_row) AS row_json
       FROM ${quoteIdentifier(tableName)} AS table_row
       ORDER BY table_row."id" COLLATE "C" ASC`,
    )).map((row) => row.row_json);
  }

  const v2Counts = {};
  for (const tableName of PACK_A_V2_TABLES) {
    if (!tablePopulation.actual_names.includes(tableName)) continue;
    const countRows = await tx.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(tableName)}`,
    );
    v2Counts[tableName] = countRows[0]?.count ?? 0;
  }

  const harnessRuns = await tx.$queryRawUnsafe(
    `SELECT id,
            "workOrderId" AS work_order_id,
            "runStatus" AS run_status,
            "externalJobRefType" AS external_job_ref_type,
            "externalJobRefId" AS external_job_ref_id,
            "externalJobVersionId" AS external_job_version_id,
            "externalJobHash" AS external_job_hash
     FROM "PaperImplementationWorkOrderHarnessRun"
     ORDER BY id COLLATE "C" ASC`,
  );
  const monitors = await tx.$queryRawUnsafe(
    `SELECT id,
            "workOrderId" AS work_order_id,
            "externalJobRefType" AS external_job_ref_type,
            "externalJobRefId" AS external_job_ref_id,
            "externalJobVersionId" AS external_job_version_id,
            "externalJobHash" AS external_job_hash,
            "runStatus" AS run_status,
            "trustStatus" AS trust_status,
            "receivedAt" AS received_at
     FROM "PaperImplementationRunMonitorIntake"
     ORDER BY "receivedAt" DESC, id COLLATE "C" ASC`,
  );
  const evidenceUnits = await tx.$queryRawUnsafe(
    `SELECT id,
            "monitorIntakeId" AS monitor_intake_id,
            "workOrderId" AS work_order_id,
            "externalJobRefType" AS external_job_ref_type,
            "externalJobRefId" AS external_job_ref_id,
            "externalJobVersionId" AS external_job_version_id,
            "externalJobHash" AS external_job_hash,
            "runStatus" AS run_status,
            "trustedStatus" AS trusted_status
     FROM "PaperImplementationRunEvidenceUnit"
     ORDER BY id COLLATE "C" ASC`,
  );
  const externalJobs = await tx.$queryRawUnsafe(
    `SELECT id,
            "jobStatus" AS job_status,
            "idempotencyKey" AS idempotency_key,
            "trainingTaskSpecId" AS training_task_spec_id,
            "materializationResultId" AS materialization_result_id,
            "adapterVersion" AS adapter_version,
            "platformId" AS platform_id
     FROM "ExperimentFoundationExternalTrainingJob"
     ORDER BY id COLLATE "C" ASC`,
  );

  const fixtureRows = tablePopulation.exact
    ? await readFixtureRows(tx)
    : null;

  return {
    identity: identity[0] ?? null,
    migration_rows: migrationRows,
    foreign_keys: foreignKeys,
    legacy_digest: digestLegacyIdOrderedRows(rowsByTable),
    v2_counts: v2Counts,
    legacy_blockers: {
      harness_runs: classifyLegacyHarnessRuns(harnessRuns, monitors, evidenceUnits),
      external_training_jobs: classifyLegacyExternalTrainingJobs(externalJobs),
    },
    fixture_rows: fixtureRows,
  };
}

async function readFixtureRows(tx) {
  const rows = {};
  for (const family of Object.values(ASSET_FAMILIES)) {
    rows[family.identity_table] = await readJsonRows(tx, family.identity_table, 'id');
    rows[family.revision_table] = await readJsonRows(tx, family.revision_table, 'id');
  }
  for (const tableName of [
    'ExperimentFoundationEvaluationProtocolMetricDependencyV2',
    'ExperimentFoundationAssetLifecycleEventV2',
    'ExperimentFoundationAssetLifecycleProjectionV2',
    'ExperimentFoundationReadinessAttestationV2',
    'ExperimentFoundationReadinessDependencyV2',
    'ExperimentFoundationDatasetFreezeCommandReceiptV2',
    'ExperimentFoundationDataPolicyFreezeCommandReceiptV2',
    'ExperimentFoundationMetricDefinitionFreezeCommandReceiptV2',
    'ExperimentFoundationBenchmarkFreezeCommandReceiptV2',
    'ExperimentFoundationEvaluationProtocolFreezeCommandReceiptV2',
  ]) {
    rows[tableName] = await readJsonRows(tx, tableName, 'id');
  }
  return rows;
}

async function readJsonRows(tx, tableName, orderColumn) {
  return (await tx.$queryRawUnsafe(
    `SELECT to_jsonb(table_row) AS row_json
     FROM ${quoteIdentifier(tableName)} AS table_row
     ORDER BY table_row.${quoteIdentifier(orderColumn)} COLLATE "C" ASC`,
  )).map((row) => row.row_json);
}

function quoteIdentifier(value) {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) throw new Error('Unsafe SQL identifier');
  return `"${value}"`;
}

function verifyD19SourceBackedFixture(rows, sourcePolicyAttestation) {
  const issues = [];
  const identityCount = Object.values(ASSET_FAMILIES).reduce(
    (sum, family) => sum + (rows[family.identity_table]?.length ?? 0),
    0,
  );
  if (identityCount === 0) {
    return {
      status: 'not_present',
      source_policy_attestation_digest: digestCanonicalJson(sourcePolicyAttestation),
      asset_census: { Dataset: 0, DataPolicy: 0, MetricDefinition: 0, Benchmark: 0, EvaluationProtocol: 0 },
      readiness: { attestation_count: 0, dependency_count: 0 },
      issues: [],
    };
  }

  const sourceDigest = digestCanonicalJson(sourcePolicyAttestation);
  if (sourceDigest !== EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST) {
    issues.push('reviewed source-policy attestation digest mismatch');
  }
  const entries = Object.fromEntries(
    (sourcePolicyAttestation.dataset_policies ?? []).map((entry) => [entry.fixture_slot, entry]),
  );
  const expectedPolicies = new Map([
    ['d19-data-policy-wikipedia', { schema_version: 'v1', ...entries.wikipedia_corpus?.policy }],
    ['d19-data-policy-natural-questions', {
      schema_version: 'v1',
      ...entries.natural_questions_query_workload?.policy,
    }],
  ]);
  const exactRefs = new Map();
  validateFamily(rows, 'DataPolicy', expectedPolicies, exactRefs, issues);

  const expectedMetrics = new Map(METRIC_DEFINITIONS.map((definition) => [
    `d19-metric-${definition.metric_key}`,
    {
      schema_version: 'v1',
      metric_key: definition.metric_key,
      display_name: definition.metric_key.replaceAll('_', ' '),
      direction: definition.direction,
      value_type: definition.value_type,
      unit: definition.unit,
      evaluator_binding: {
        evaluator_key: definition.evaluator_key,
        evaluator_version: 'v1',
      },
    },
  ]));
  validateFamily(rows, 'MetricDefinition', expectedMetrics, exactRefs, issues);

  const wikipediaPolicy = exactRefs.get('DataPolicy:d19-data-policy-wikipedia');
  const nqPolicy = exactRefs.get('DataPolicy:d19-data-policy-natural-questions');
  const expectedDatasets = new Map();
  if (wikipediaPolicy && entries.wikipedia_corpus) {
    expectedDatasets.set('d19-dataset-wikipedia-corpus', datasetSnapshot(
      entries.wikipedia_corpus,
      'RAGPerf Wikipedia raw corpus source bundle',
      wikipediaPolicy,
    ));
  }
  if (nqPolicy && entries.natural_questions_query_workload) {
    expectedDatasets.set('d19-dataset-natural-questions', datasetSnapshot(
      entries.natural_questions_query_workload,
      'RAGPerf Natural Questions workload',
      nqPolicy,
    ));
  }
  validateFamily(rows, 'Dataset', expectedDatasets, exactRefs, issues);

  const wikipedia = exactRefs.get('Dataset:d19-dataset-wikipedia-corpus');
  const naturalQuestions = exactRefs.get('Dataset:d19-dataset-natural-questions');
  const expectedBenchmarks = new Map();
  if (wikipedia && naturalQuestions) {
    expectedBenchmarks.set('d19-benchmark-ragperf', {
      schema_version: 'v1',
      benchmark_key: 'ragperf-rag-systems-benchmark',
      display_name: 'RAGPerf RAG Systems Benchmark',
      description: 'D-19 typed control-plane source bindings; no extraction or provider execution.',
      corpus_dataset: wikipedia,
      query_workload_dataset: naturalQuestions,
    });
  }
  validateFamily(rows, 'Benchmark', expectedBenchmarks, exactRefs, issues);

  const benchmark = exactRefs.get('Benchmark:d19-benchmark-ragperf');
  const metricRefs = METRIC_DEFINITIONS.map((definition) => (
    exactRefs.get(`MetricDefinition:d19-metric-${definition.metric_key}`)
  )).filter(Boolean);
  const expectedProtocols = new Map();
  if (benchmark && metricRefs.length === METRIC_DEFINITIONS.length) {
    expectedProtocols.set('d19-evaluation-protocol-ragperf-v2', {
      schema_version: 'v2',
      protocol_key: 'ragperf-adapter-tier-v2',
      display_name: 'RAGPerf adapter-tier EvaluationProtocol v2',
      benchmark_dependency: benchmark,
      metric_dependencies: metricRefs,
      required_rules: protocolRules(metricRefs),
    });
  }
  validateFamily(rows, 'EvaluationProtocol', expectedProtocols, exactRefs, issues);

  validateRelationalMirrors(rows, exactRefs, issues);
  const lifecycle = validateLifecyclePopulation(rows, exactRefs, issues);
  const readiness = validateReadinessPopulation(rows, exactRefs, issues);

  const census = Object.fromEntries(Object.entries(ASSET_FAMILIES).map(([assetType, family]) => [
    assetType,
    rows[family.identity_table]?.length ?? 0,
  ]));
  return {
    status: issues.length === 0 ? 'passed' : 'failed',
    source_policy_attestation_digest: sourceDigest,
    asset_census: census,
    exact_revision_refs: [...exactRefs.values()].sort(compareExactRefs),
    lifecycle,
    readiness,
    freeze_command_receipts: {
      Dataset: rows.ExperimentFoundationDatasetFreezeCommandReceiptV2.length,
      DataPolicy: rows.ExperimentFoundationDataPolicyFreezeCommandReceiptV2.length,
      MetricDefinition: rows.ExperimentFoundationMetricDefinitionFreezeCommandReceiptV2.length,
      Benchmark: rows.ExperimentFoundationBenchmarkFreezeCommandReceiptV2.length,
      EvaluationProtocol: rows.ExperimentFoundationEvaluationProtocolFreezeCommandReceiptV2.length,
    },
    issues,
  };
}

export function validateFamily(rows, assetType, expectedSnapshots, exactRefs, issues) {
  const family = ASSET_FAMILIES[assetType];
  const identities = rows[family.identity_table] ?? [];
  const revisions = rows[family.revision_table] ?? [];
  const receipts = rows[family.freeze_receipt_table] ?? [];
  const expectedIds = [...expectedSnapshots.keys()].sort();
  const actualIds = identities.map((row) => row.id).sort();
  if (canonicalJson(actualIds) !== canonicalJson(expectedIds)) {
    issues.push(`${assetType} identity population mismatch`);
  }
  if (revisions.length !== expectedIds.length) {
    issues.push(`${assetType} revision count mismatch`);
  }
  if (receipts.length !== expectedIds.length) {
    issues.push(`${assetType} freeze receipt count mismatch`);
  }
  for (const logicalId of expectedIds) {
    const identity = identities.find((row) => row.id === logicalId);
    const familyRevisions = revisions.filter((row) => row[family.owner_field] === logicalId);
    if (!identity || familyRevisions.length !== 1) {
      issues.push(`${assetType}:${logicalId} must have exactly one identity/current revision`);
      continue;
    }
    const revision = familyRevisions[0];
    const expectedSnapshot = expectedSnapshots.get(logicalId);
    if (
      identity.currentRevisionId !== revision.id
      || identity.draftStateVersion !== 2
      || identity[family.draft_field]?.schema_version !== expectedSnapshot.schema_version
      || identity[family.identity_key_field] !== expectedSnapshot[family.snapshot_key_field]
      || revision.revisionSequence !== 1
    ) {
      issues.push(`${assetType}:${logicalId} current revision identity/sequence mismatch`);
    }
    if (canonicalJson(revision[family.snapshot_field]) !== canonicalJson(expectedSnapshot)) {
      issues.push(`${assetType}:${logicalId} typed snapshot mismatch`);
    }
    if (canonicalJson(identity[family.draft_field]) !== canonicalJson(expectedSnapshot)) {
      issues.push(`${assetType}:${logicalId} current draft mismatch`);
    }
    const expectedHash = semanticHash(
      `ExperimentFoundation${assetType}RevisionV2`,
      expectedSnapshot.schema_version,
      'ef-asset-semantic-json@v1',
      expectedSnapshot,
    );
    if (
      revision.schemaVersion !== expectedSnapshot.schema_version
      || revision.hashProfile !== 'ef-asset-semantic-json@v1'
      || revision.contentHash !== expectedHash
    ) {
      issues.push(`${assetType}:${logicalId} server canonical revision hash mismatch`);
    }
    const exactReceipts = receipts.filter((row) => row[family.owner_field] === logicalId);
    const receipt = exactReceipts[0];
    if (
      exactReceipts.length !== 1
      || receipt.businessIdempotencyKey !== `d19-freeze:${assetType}:${logicalId}`
      || receipt.revisionId !== revision.id
      || receipt.contentHash !== expectedHash
    ) {
      issues.push(`${assetType}:${logicalId} freeze receipt exact binding mismatch`);
    }
    exactRefs.set(`${assetType}:${logicalId}`, {
      asset_type: assetType,
      logical_id: logicalId,
      revision_id: revision.id,
      revision_sequence: revision.revisionSequence,
      content_hash: revision.contentHash,
    });
  }
}

function expectedLifecycleEvents(ref) {
  const events = [
    {
      event_type: 'registered',
      reason_code: 'D19_FIXTURE_REGISTERED',
      lifecycle_status: 'draft',
      location_available: false,
    },
    {
      event_type: 'activated',
      reason_code: 'D19_FIXTURE_ACTIVATED',
      lifecycle_status: 'active',
      location_available: false,
    },
  ];
  if (ref.asset_type === 'Dataset') {
    events.push({
      event_type: 'location_available',
      reason_code: 'D19_ATTESTED_SOURCE_LOCATION_AVAILABLE',
      lifecycle_status: 'active',
      location_available: true,
    });
  }
  return events;
}

export function validateLifecyclePopulation(rows, exactRefs, issues) {
  const events = rows.ExperimentFoundationAssetLifecycleEventV2 ?? [];
  const projections = rows.ExperimentFoundationAssetLifecycleProjectionV2 ?? [];
  const expectedEventCount = [...exactRefs.values()].reduce(
    (total, ref) => total + expectedLifecycleEvents(ref).length,
    0,
  );
  if (events.length !== expectedEventCount) {
    issues.push(`lifecycle event population must be exactly ${expectedEventCount}`);
  }
  if (projections.length !== exactRefs.size) {
    issues.push(`lifecycle projection population must be exactly ${exactRefs.size}`);
  }

  for (const ref of exactRefs.values()) {
    const expected = expectedLifecycleEvents(ref);
    const exactEvents = events
      .filter((event) => (
        event.assetType === ref.asset_type
        && event.assetId === ref.logical_id
        && event.assetRevisionId === ref.revision_id
        && event.assetRevisionSequence === ref.revision_sequence
        && event.assetRevisionHash === ref.content_hash
      ))
      .sort((left, right) => left.eventSequence - right.eventSequence);
    if (exactEvents.length !== expected.length) {
      issues.push(`${ref.asset_type}:${ref.logical_id} lifecycle event count mismatch`);
      continue;
    }
    for (const [index, expectedEvent] of expected.entries()) {
      const event = exactEvents[index];
      if (
        event.eventSequence !== index + 1
        || event.eventType !== expectedEvent.event_type
        || event.eventSchemaVersion !== 'v1'
        || event.reasonCode !== expectedEvent.reason_code
        || event.note !== null
        || event.actorType !== 'server'
        || event.actorId !== null
      ) {
        issues.push(`${ref.asset_type}:${ref.logical_id} lifecycle event ${index + 1} drift`);
      }
    }
    const exactProjections = projections.filter((projection) => projectionMatchesRef(projection, ref));
    const projection = exactProjections[0];
    const lastEvent = exactEvents.at(-1);
    const lastExpected = expected.at(-1);
    if (
      exactProjections.length !== 1
      || projection.lifecycleSequence !== expected.length
      || projection.stateVersion !== expected.length
      || projection.lifecycleStatus !== lastExpected.lifecycle_status
      || projection.locationAvailable !== lastExpected.location_available
      || projection.lastEventId !== lastEvent.id
    ) {
      issues.push(`${ref.asset_type}:${ref.logical_id} lifecycle projection/source-event drift`);
    }
  }
  return {
    event_count: events.length,
    projection_count: projections.length,
  };
}

function datasetSnapshot(entry, displayName, policyRef) {
  return {
    schema_version: 'v1',
    dataset_key: entry.dataset.dataset_key,
    display_name: displayName,
    version_label: entry.dataset.version_label,
    dataset_role: entry.dataset.dataset_role,
    source_identity: {
      source_name: entry.dataset.source_name,
      source_revision: entry.dataset.source_revision,
      source_uri: entry.dataset.source_uri,
    },
    checksum_manifest: entry.dataset.checksum_manifest,
    split_protocol: entry.dataset.split_protocol,
    data_policy: policyRef,
  };
}

function protocolRules(metricRefs) {
  const byKey = new Map(METRIC_DEFINITIONS.map((definition, index) => [
    definition.metric_key,
    { definition, ref: metricRefs[index] },
  ]));
  return [
    {
      rule_id: 'artifact_contract@v1:text_pipeline_stats',
      rule_type: 'artifact_contract@v1',
      artifact_kind: 'text_pipeline_stats',
      file_name: 'text_pipeline_stats.txt',
      required_cardinality: 1,
      content_hash_required: true,
      parser_binding: 'ragperf_text_pipeline_stats@v1',
    },
    ...ACTIVE_METRIC_KEYS.map((metricKey) => {
      const { definition, ref } = byKey.get(metricKey);
      return {
        rule_id: `metric_contract@v1:${metricKey}`,
        rule_type: 'metric_contract@v1',
        metric_definition: ref,
        metric_key: metricKey,
        required_cardinality: 1,
        split_key: 'query',
        value_type: definition.value_type,
        unit: definition.unit,
        finite_required: true,
      };
    }),
  ];
}

function validateRelationalMirrors(rows, exactRefs, issues) {
  const datasetRows = rows.ExperimentFoundationDatasetRevisionV2 ?? [];
  for (const row of datasetRows) {
    const ref = row.datasetSnapshotJson?.data_policy;
    if (row.dataPolicyRevisionId !== ref?.revision_id || row.dataPolicyRevisionHash !== ref?.content_hash) {
      issues.push(`Dataset:${row.datasetId} relational DataPolicy mirror mismatch`);
    }
  }
  const benchmarkRows = rows.ExperimentFoundationBenchmarkRevisionV2 ?? [];
  for (const row of benchmarkRows) {
    const snapshot = row.benchmarkSnapshotJson;
    const dependencies = [snapshot?.corpus_dataset, snapshot?.query_workload_dataset];
    const manifestHash = semanticHash(
      'BenchmarkDatasetDependencyManifest',
      'v1',
      'ef-readiness-dependency-manifest-json@v1',
      dependencies,
    );
    if (
      row.corpusDatasetRevisionId !== dependencies[0]?.revision_id
      || row.corpusDatasetRevisionHash !== dependencies[0]?.content_hash
      || row.queryDatasetRevisionId !== dependencies[1]?.revision_id
      || row.queryDatasetRevisionHash !== dependencies[1]?.content_hash
      || row.datasetDependencyManifestHash !== manifestHash
    ) {
      issues.push(`Benchmark:${row.benchmarkId} relational Dataset mirror mismatch`);
    }
  }
  const protocolRows = rows.ExperimentFoundationEvaluationProtocolRevisionV2 ?? [];
  const dependencyRows = rows.ExperimentFoundationEvaluationProtocolMetricDependencyV2 ?? [];
  for (const row of protocolRows) {
    const snapshot = row.evaluationProtocolSnapshotJson;
    const metrics = snapshot?.metric_dependencies ?? [];
    const relational = dependencyRows
      .filter((dependency) => dependency.evaluationProtocolRevisionId === row.id)
      .sort((left, right) => left.ordinal - right.ordinal);
    const exactRelational = relational.map((dependency) => ({
      asset_type: 'MetricDefinition',
      logical_id: dependency.metricDefinitionId,
      revision_id: dependency.metricDefinitionRevisionId,
      revision_sequence: dependency.metricDefinitionRevisionSequence,
      content_hash: dependency.metricDefinitionRevisionHash,
    }));
    const manifestHash = semanticHash(
      'EvaluationProtocolMetricDependencyManifest',
      'v1',
      'ef-readiness-dependency-manifest-json@v1',
      metrics,
    );
    if (
      row.benchmarkRevisionId !== snapshot?.benchmark_dependency?.revision_id
      || row.benchmarkRevisionHash !== snapshot?.benchmark_dependency?.content_hash
      || row.metricDependencyCount !== metrics.length
      || row.metricDependencyManifestHash !== manifestHash
      || canonicalJson(exactRelational) !== canonicalJson(metrics)
    ) {
      issues.push(`EvaluationProtocol:${row.evaluationProtocolId} relational dependency mirror mismatch`);
    }
  }
  if (exactRefs.size === 23 && dependencyRows.length !== 17) {
    issues.push('EvaluationProtocol relational metric dependency count mismatch');
  }
}

function validateReadinessPopulation(rows, exactRefs, issues) {
  const projections = rows.ExperimentFoundationAssetLifecycleProjectionV2 ?? [];
  const attestations = rows.ExperimentFoundationReadinessAttestationV2 ?? [];
  const dependencyRows = rows.ExperimentFoundationReadinessDependencyV2 ?? [];
  if (projections.length !== 23) issues.push('lifecycle projection population must be exactly 23');
  if (attestations.length !== 23) issues.push('readiness attestation population must be exactly 23');
  if (dependencyRows.length !== 28) issues.push('readiness dependency population must be exactly 28');

  const revisionsByKey = buildRevisionGraph(rows, exactRefs);
  const evaluatorProfileHash = semanticHash(
    'ExperimentFoundationReadinessEvaluatorProfileV2',
    'v1',
    'ef-readiness-dependency-manifest-json@v1',
    {
      profile_version: 'ef-readiness-evaluator@v1',
      supported_rule_types: ['artifact_contract@v1', 'metric_contract@v1'],
    },
  );
  let protocol = null;
  for (const ref of exactRefs.values()) {
    const projection = projections.find((candidate) => projectionMatchesRef(candidate, ref));
    if (
      !projection
      || projection.lifecycleStatus !== 'active'
      || (ref.asset_type === 'Dataset' && projection.locationAvailable !== true)
    ) {
      issues.push(`${ref.asset_type}:${ref.logical_id} lifecycle projection is not readiness-active`);
      continue;
    }
    const expectedDependencies = completeDependencies(ref, revisionsByKey);
    const dependencyManifestHash = semanticHash(
      'ExperimentFoundationReadinessDependencyManifestV2',
      'v1',
      'ef-readiness-dependency-manifest-json@v1',
      expectedDependencies,
    );
    const exactAttestations = attestations.filter((candidate) => attestationMatchesRef(candidate, ref));
    if (exactAttestations.length !== 1) {
      issues.push(`${ref.asset_type}:${ref.logical_id} must have exactly one exact readiness attestation`);
      continue;
    }
    const attestation = exactAttestations[0];
    const storedDependencies = dependencyRows
      .filter((candidate) => candidate.attestationId === attestation.id)
      .sort((left, right) => left.ordinal - right.ordinal);
    if (storedDependencies.some((dependency, index) => (
      dependency.ordinal !== index + 1
      || dependency.dependencyRole !== dependency.dependencyAssetType
    ))) {
      issues.push(`${ref.asset_type}:${ref.logical_id} readiness dependency ordinal/role drift`);
    }
    const storedDependencyRefs = storedDependencies.map(readinessDependencyRef);
    const qualification = {
      target_lifecycle_sequence: projection.lifecycleSequence,
      dependency_count: expectedDependencies.length,
      all_dependencies_active: true,
      all_required_rules_supported: true,
    };
    const attestationHash = semanticHash(
      'ExperimentFoundationReadinessAttestationV2',
      'v1',
      'ef-readiness-dependency-manifest-json@v1',
      {
        target: ref,
        status: 'passed',
        evaluator_profile_version: 'ef-readiness-evaluator@v1',
        evaluator_profile_hash: evaluatorProfileHash,
        dependency_manifest_hash: dependencyManifestHash,
        qualification_snapshot: qualification,
        blockers: [],
      },
    );
    if (
      attestation.outcome !== 'passed'
      || attestation.evaluatorProfileVersion !== 'ef-readiness-evaluator@v1'
      || attestation.evaluatorProfileHash !== evaluatorProfileHash
      || attestation.dependencyManifestHash !== dependencyManifestHash
      || attestation.attestationHash !== attestationHash
      || canonicalJson(attestation.qualificationSnapshotJson) !== canonicalJson(qualification)
      || canonicalJson(attestation.blockerSnapshotJson) !== '[]'
      || canonicalJson(storedDependencyRefs) !== canonicalJson(expectedDependencies)
    ) {
      issues.push(`${ref.asset_type}:${ref.logical_id} exact readiness/hash/dependency drift`);
    }
    if (ref.asset_type === 'EvaluationProtocol') {
      protocol = {
        readiness_attestation_id: attestation.id,
        readiness_attestation_hash: attestation.attestationHash,
        dependency_manifest_hash: attestation.dependencyManifestHash,
        ordered_transitive_dependency_count: expectedDependencies.length,
      };
    }
  }
  return {
    attestation_count: attestations.length,
    dependency_count: dependencyRows.length,
    evaluator_profile_hash: evaluatorProfileHash,
    evaluation_protocol: protocol,
  };
}

function buildRevisionGraph(rows, exactRefs) {
  const graph = new Map();
  for (const [assetType, family] of Object.entries(ASSET_FAMILIES)) {
    for (const row of rows[family.revision_table] ?? []) {
      const ref = exactRefs.get(`${assetType}:${row[family.owner_field]}`);
      if (!ref) continue;
      const snapshot = row[family.snapshot_field];
      let direct = [];
      if (assetType === 'Dataset') direct = [snapshot.data_policy];
      else if (assetType === 'Benchmark') direct = [snapshot.corpus_dataset, snapshot.query_workload_dataset];
      else if (assetType === 'EvaluationProtocol') {
        direct = [snapshot.benchmark_dependency, ...snapshot.metric_dependencies];
      }
      graph.set(exactRefKey(ref), { ref, direct });
    }
  }
  return graph;
}

function completeDependencies(targetRef, graph) {
  const resolved = new Map();
  const visit = (ref) => {
    const record = graph.get(exactRefKey(ref));
    if (!record) return;
    for (const dependency of record.direct) {
      const key = exactRefKey(dependency);
      if (resolved.has(key)) continue;
      resolved.set(key, dependency);
      visit(dependency);
    }
  };
  visit(targetRef);
  return [...resolved.values()].sort(compareExactRefs);
}

function compareExactRefs(left, right) {
  return DEPENDENCY_ASSET_ORDER[left.asset_type] - DEPENDENCY_ASSET_ORDER[right.asset_type]
    || left.logical_id.localeCompare(right.logical_id)
    || left.revision_sequence - right.revision_sequence
    || left.revision_id.localeCompare(right.revision_id)
    || left.content_hash.localeCompare(right.content_hash);
}

function exactRefKey(ref) {
  return [
    ref.asset_type,
    ref.logical_id,
    ref.revision_id,
    ref.revision_sequence,
    ref.content_hash,
  ].join('\0');
}

function projectionMatchesRef(row, ref) {
  return row.assetType === ref.asset_type
    && row.assetId === ref.logical_id
    && row.currentRevisionId === ref.revision_id
    && row.currentRevisionSequence === ref.revision_sequence
    && row.currentRevisionHash === ref.content_hash;
}

function attestationMatchesRef(row, ref) {
  return row.targetAssetType === ref.asset_type
    && row.targetAssetId === ref.logical_id
    && row.targetRevisionId === ref.revision_id
    && row.targetRevisionSequence === ref.revision_sequence
    && row.targetRevisionHash === ref.content_hash;
}

function readinessDependencyRef(row) {
  return {
    asset_type: row.dependencyAssetType,
    logical_id: row.dependencyAssetId,
    revision_id: row.dependencyRevisionId,
    revision_sequence: row.dependencyRevisionSequence,
    content_hash: row.dependencyRevisionHash,
  };
}

function metric(metricKey, direction, valueType, unit, evaluatorKey) {
  return {
    metric_key: metricKey,
    direction,
    value_type: valueType,
    unit,
    evaluator_key: evaluatorKey,
  };
}

function migrationEvidence(rows, sourceDigest) {
  const row = rows[0] ?? null;
  return {
    migration_name: MIGRATION_NAME,
    source_sha256: sourceDigest,
    expected_sha256: EXPECTED_MIGRATION_SHA256,
    source_digest_matches: sourceDigest === EXPECTED_MIGRATION_SHA256,
    history_row_count: rows.length,
    applied: Boolean(
      rows.length === 1
      && row.finished_at
      && !row.rolled_back_at
      && row.applied_steps_count === 1
      && row.checksum === sourceDigest
    ),
    checksum_matches_source: row?.checksum === sourceDigest,
    finished_at: isoOrNull(row?.finished_at),
    rolled_back_at: isoOrNull(row?.rolled_back_at),
  };
}

export function foreignKeyEvidence(rows) {
  const pi = new Set(PACK_A_PI_V2_TABLES);
  const ef = new Set(PACK_A_EF_V2_TABLES);
  const crossDomain = rows.filter((row) => (
    (pi.has(row.source_table) && row.target_table.startsWith('ExperimentFoundation'))
    || (ef.has(row.source_table) && row.target_table.startsWith('PaperImplementation'))
    || (pi.has(row.target_table) && row.source_table.startsWith('ExperimentFoundation'))
    || (ef.has(row.target_table) && row.source_table.startsWith('PaperImplementation'))
  ));
  return {
    inspected_fk_count: rows.filter((row) => (
      PACK_A_V2_TABLES.includes(row.source_table) || PACK_A_V2_TABLES.includes(row.target_table)
    )).length,
    cross_domain_fk_count: crossDomain.length,
    cross_domain_fks: crossDomain,
  };
}

function isoOrNull(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function safeMessage(error) {
  return (error instanceof Error ? error.message : String(error))
    .replaceAll(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted-database-url]')
    .replaceAll(/password=[^\s]+/gi, 'password=[redacted]')
    .slice(0, 2_000);
}

export function deriveStatus(summary) {
  const failed = [];
  const blocked = [];
  if (!summary.database_target.loopback_enforced) {
    failed.push('PACK_A_LOCAL_GATE_NON_LOOPBACK_DATABASE');
  }
  if (!summary.database_target.database_name_matches_url) {
    failed.push('PACK_A_LOCAL_GATE_DATABASE_IDENTITY_MISMATCH');
  }
  if (summary.database_target.effective_schema !== summary.database_target.requested_schema) {
    failed.push('PACK_A_LOCAL_GATE_SCHEMA_IDENTITY_MISMATCH');
  }
  if (!summary.database_target.transaction_read_only_verified) {
    failed.push('PACK_A_LOCAL_GATE_READ_ONLY_NOT_VERIFIED');
  }
  if (!summary.database_target.target_fingerprint_matches) {
    failed.push('PACK_A_LOCAL_GATE_TARGET_FINGERPRINT_MISMATCH');
  }
  if (!summary.migration.source_digest_matches) failed.push('MIGRATION_SOURCE_DIGEST_DRIFT');
  if (summary.migration.applied && !summary.schema.pack_a_v2_tables.exact) {
    failed.push('PACK_A_V2_TABLE_POPULATION_DRIFT');
  }
  if (summary.schema.cross_domain_foreign_keys.cross_domain_fk_count !== 0) {
    failed.push('PACK_A_CROSS_DOMAIN_FOREIGN_KEY');
  }
  if (summary.fixture.status === 'failed') failed.push('D19_SOURCE_BACKED_FIXTURE_DRIFT');
  if (!summary.cutover_config.valid) failed.push('PACK_A_CUTOVER_CONFIG_INVALID');
  if (!summary.migration.applied) blocked.push('PACK_A_MIGRATION_NOT_APPLIED');
  if (!summary.schema.pack_a_v2_tables.exact) blocked.push('PACK_A_V2_TABLES_NOT_READY');
  if (summary.fixture.status === 'not_present') blocked.push('D19_SOURCE_BACKED_FIXTURE_NOT_PRESENT');
  if (summary.legacy_blockers.total_blocker_count > 0) blocked.push('LEGACY_ACTIVE_WORK_REMAINS');
  if (!summary.cutover_config.cutover_ready) blocked.push('PACK_A_CUTOVER_NOT_COMMITTED');
  return {
    status: failed.length > 0 ? 'failed' : blocked.length > 0 ? 'blocked' : 'passed',
    failures: [...new Set(failed)],
    blockers: [...new Set(blocked)],
  };
}

async function main() {
  const { runId, outputPath } = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();
  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;
  let prisma = null;
  let target = null;
  globalThis.fetch = async () => {
    fetchCallCount += 1;
    throw new Error('PACK_A_LOCAL_GATE_EXTERNAL_REQUEST_BLOCKED');
  };

  let summary;
  try {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) throw new Error('DATABASE_URL is required');
    target = sanitizeLocalDatabaseTarget(databaseUrl);
    const migrationSourceDigest = crypto
      .createHash('sha256')
      .update(await fs.readFile(MIGRATION_PATH))
      .digest('hex');
    const sourcePolicyAttestation = JSON.parse(await fs.readFile(SOURCE_POLICY_PATH, 'utf8'));
    const cutoverConfig = evaluateCutoverConfig(process.env);
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    const actualV2TableRows = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      return await tx.$queryRawUnsafe(
        `SELECT tablename AS table_name
         FROM pg_catalog.pg_tables
         WHERE schemaname = current_schema() AND tablename LIKE '%V2'
         ORDER BY tablename ASC`,
      );
    });
    const tablePopulation = compareV2TablePopulation(
      actualV2TableRows.map((row) => row.table_name),
    );
    const evidence = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      return await collectDatabaseEvidence(tx, {
        ...tablePopulation,
        actual_names: actualV2TableRows.map((row) => row.table_name),
      });
    }, { timeout: 60_000, maxWait: 10_000 });
    const migration = migrationEvidence(evidence.migration_rows, migrationSourceDigest);
    const foreignKeys = foreignKeyEvidence(evidence.foreign_keys);
    const observedTargetFingerprint = evidence.identity
      ? fingerprintPackALocalTarget(evidence.identity)
      : null;
    const fixture = evidence.fixture_rows
      ? verifyD19SourceBackedFixture(evidence.fixture_rows, sourcePolicyAttestation)
      : {
        status: 'not_present',
        source_policy_attestation_digest: digestCanonicalJson(sourcePolicyAttestation),
        asset_census: null,
        readiness: null,
        issues: ['Pack A v2 table population is incomplete; fixture was not queried.'],
      };
    const totalLegacyBlockers =
      evidence.legacy_blockers.harness_runs.blocker_count
      + evidence.legacy_blockers.external_training_jobs.blocker_count;
    summary = {
      run_id: runId,
      status: 'running',
      started_at: startedAt,
      finished_at: null,
      mode: 'read_only_local_existing_database',
      database_target: {
        ...target,
        effective_schema: evidence.identity?.schema_name ?? null,
        database_name_matches_url: evidence.identity?.database_name === target.database,
        transaction_read_only_verified: evidence.identity?.transaction_read_only === 'on',
        expected_target_fingerprint: PACK_A_LOCAL_TARGET_FINGERPRINT,
        observed_target_fingerprint: observedTargetFingerprint,
        target_fingerprint_matches:
          observedTargetFingerprint === PACK_A_LOCAL_TARGET_FINGERPRINT,
      },
      migration,
      schema: {
        pack_a_v2_tables: tablePopulation,
        v2_row_census: evidence.v2_counts,
        cross_domain_foreign_keys: foreignKeys,
      },
      legacy: evidence.legacy_digest,
      legacy_blockers: {
        ...evidence.legacy_blockers,
        total_blocker_count: totalLegacyBlockers,
      },
      fixture,
      cutover_config: cutoverConfig,
      prohibited_effects: {
        database_mutations: 0,
        provider_calls: 0,
        external_fetch_attempts: fetchCallCount,
        scientific_execution: 0,
      },
      redaction: {
        database_url_stored: false,
        database_username_stored: false,
        database_password_stored: false,
        legacy_row_payloads_stored: false,
      },
      failures: [],
      blockers: [],
    };
    const status = deriveStatus(summary);
    summary.status = status.status;
    summary.failures = status.failures;
    summary.blockers = status.blockers;
  } catch (error) {
    summary = {
      run_id: runId,
      status: 'failed',
      started_at: startedAt,
      finished_at: null,
      mode: 'read_only_local_existing_database',
      database_target: target ?? {
        loopback_enforced: true,
        database_url_stored: false,
        username_stored: false,
        password_stored: false,
      },
      failures: [{ reason_code: 'PACK_A_LOCAL_GATE_EXECUTION_FAILED', message: safeMessage(error) }],
      blockers: [],
      prohibited_effects: {
        database_mutations: 0,
        provider_calls: 0,
        external_fetch_attempts: fetchCallCount,
        scientific_execution: 0,
      },
      redaction: {
        database_url_stored: false,
        database_username_stored: false,
        database_password_stored: false,
        legacy_row_payloads_stored: false,
      },
    };
  } finally {
    globalThis.fetch = originalFetch;
    if (prisma) await prisma.$disconnect();
  }

  summary.finished_at = new Date().toISOString();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({
    run_id: runId,
    status: summary.status,
    summary_path: path.relative(REPO_ROOT, outputPath),
  })}\n`);
  process.exitCode = summary.status === 'passed' ? 0 : summary.status === 'blocked' ? 2 : 1;
}

function isDirectRun(metaUrl = import.meta.url, argvEntry = process.argv[1]) {
  if (!argvEntry) return false;
  return path.resolve(fileURLToPath(metaUrl)) === path.resolve(argvEntry);
}

if (isDirectRun()) {
  main().catch((error) => {
    process.stderr.write(`${safeMessage(error)}\n`);
    process.exitCode = 1;
  });
}
