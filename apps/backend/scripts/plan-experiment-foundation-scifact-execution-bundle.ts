#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import type {
  ExperimentFoundationAliyunRealProviderProfileV2,
  ExperimentFoundationExecutableTrainingTaskSpecV2,
  ExperimentFoundationExecutionBundleContentV2,
  ExperimentFoundationExecutionBundleRevisionV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import type {
  ExperimentFoundationRunCellV2,
  ExperimentFoundationRunV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashExperimentV2SemanticContent,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import type {
  ExperimentFoundationExecutionBundleDraftBundleV2,
  ExperimentFoundationExecutionBundleFreezeInputV2,
  ExperimentFoundationExecutionBundleFrozenBundleV2,
  ExperimentFoundationExecutionBundlePutDraftInputV2,
  ExperimentFoundationExecutionBundleV2Repository,
} from '../src/repositories/experiment-foundation-execution-bundle-v2.repository.js';
import {
  ExperimentFoundationExecutionBundleV2Service,
} from '../src/services/experiment-foundation-execution-bundle-v2-service.js';
import {
  ExperimentFoundationRealProviderPayloadV2Service,
} from '../src/services/experiment-foundation-real-provider-payload-v2-service.js';
import {
  parseSciFactMirrorManifest,
  type SciFactMirrorManifest,
} from './plan-experiment-foundation-scifact-authority.js';
import {
  sha256Bytes,
} from '../../../.ai/scripts/lib/experiment-v2-evidence.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const AUTHORING_MANIFEST_PATH = path.join(
  REPO_ROOT,
  'workloads/ragperf-canary/manifests/execution-bundle-v2.json',
);
const WORKLOAD_MANIFEST_PATH = path.join(
  REPO_ROOT,
  'workloads/ragperf-canary/manifests/workload-directory-v1.json',
);
const MIRROR_MANIFEST_PATH = path.join(
  REPO_ROOT,
  'workloads/ragperf-canary/manifests/scifact-mirrors-v1.json',
);
const TRANSPORT_SOURCE_PATH = path.join(
  REPO_ROOT,
  'apps/backend/src/services/experiment-foundation-aliyun-real-provider-v2-transport.ts',
);
const PLAN_TIME = '2026-07-27T16:00:00.000Z';
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

export interface SciFactExecutionBundleAuthoringManifest {
  schema: 'RagperfCanaryExecutionBundleAuthoringManifest@v1';
  review_scope: 't132-m7-l1-diagnostic-only';
  bundle_key: string;
  display_name: string;
  code_artifact: {
    artifact_ref: string;
    content_digest: string;
    byte_size: number;
  };
  container_image: ExperimentFoundationExecutionBundleContentV2['container_image'];
  dependency_lock: {
    hash_profile: 'sha256-canonical-json@v1';
    snapshot: {
      schema: 'RagperfCanaryDependencyLock@v1';
      runtime: 'python-3.11';
      dependency_model: 'stdlib-only';
      third_party_packages: [];
      entrypoint_content_digest: string;
    };
    content_hash: string;
  };
  entrypoint: 'python3';
  arguments: ['/mnt/pea-code/entrypoint.py'];
  output_parser: {
    hash_profile: 'sha256-canonical-json@v1';
    snapshot: {
      schema: 'RagperfCanaryOutputParserProfile@v1';
      profile_version: 'ragperf_canary_stats@v1';
      result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1';
      result_object_name: 'result.json';
      diagnostic_only: true;
      transport_source_sha256: string;
    };
    content_hash: string;
  };
  offline_preview_profile: ExperimentFoundationAliyunRealProviderProfileV2;
  offline_preview_cells: Array<{
    ordinal: 1 | 2;
    cell_key: 'retriever-top-k-5' | 'retriever-top-k-10';
    cpu_cores: 1;
    memory_mb: number;
    timeout_seconds: number;
  }>;
  authorization: {
    named_local_bundle_freeze_authorized: false;
    cloud_access_authorized: false;
    create_job_authorized: false;
    capability_enable_authorized: false;
  };
}

interface WorkloadDirectoryManifest {
  schema: 'RagperfCanaryWorkloadDirectoryManifest@v1';
  delivery: {
    artifact_ref: string;
    content_digest: string;
    byte_size: number;
    mount_path: '/mnt/pea-code';
  };
  runtime: {
    entrypoint: 'python3';
    arguments_prefix: ['/mnt/pea-code/entrypoint.py'];
    dependency_model: 'python-3.11-stdlib-only';
  };
  upload_state: 'uploaded_verified';
  authorization: { create_job_authorized: false };
}

export interface SciFactExecutionBundlePlan {
  schema: 'RagperfCanaryExecutionBundlePlan@v1';
  status: 'passed';
  database_access: 'none';
  cloud_access: 'none';
  provider_operations: 0;
  planned_write_scope: {
    identities: 1;
    drafts: 1;
    revisions: 1;
    lifecycle_events: 1;
    lifecycle_projections: 1;
    readiness_records: 1;
    total_rows: 6;
  };
  frozen_bundle: ExperimentFoundationExecutionBundleFrozenBundleV2;
  offline_same_payload_preview: Array<{
    ordinal: number;
    cell_key: string;
    payload_hash: string;
    payload_byte_size: number;
    manifest_schema_version: 'v2';
    same_payload_replay_exact: true;
    network_requests: 0;
    provider_writes: 0;
    create_job_calls: 0;
    scientific_writes: 0;
  }>;
  authorization: SciFactExecutionBundleAuthoringManifest['authorization'];
}

export async function buildSciFactExecutionBundlePlan(
  authoringValue: unknown,
  workloadValue: unknown,
  mirrorsValue: unknown,
): Promise<SciFactExecutionBundlePlan> {
  const authoring = parseSciFactExecutionBundleAuthoringManifest(authoringValue);
  const workload = parseWorkloadManifest(workloadValue);
  const mirrors = parseSciFactMirrorManifest(mirrorsValue);
  await assertAuthoringEvidence(authoring, workload, mirrors);
  const content = buildBundleContent(authoring, mirrors);
  const repository = new InMemoryExecutionBundleV2Repository();
  const service = new ExperimentFoundationExecutionBundleV2Service({
    repository,
    now: () => PLAN_TIME,
  });
  await service.putDraft({
    bundle_key: authoring.bundle_key,
    display_name: authoring.display_name,
    expected_draft_version: null,
    draft_content: content,
  });
  const frozen = await service.freezeActiveRevision({
    bundle_key: authoring.bundle_key,
    expected_draft_version: 1,
  });
  assert.equal(frozen.revision.schema_version, 'v2');
  assert.deepEqual(
    await service.resolveActiveReadyExact({
      execution_bundle_revision_id: frozen.revision.execution_bundle_revision_id,
      content_hash: frozen.revision.content_hash,
    }),
    frozen,
  );
  const previews = buildOfflineSamePayloadPreviews(authoring, frozen.revision);
  return {
    schema: 'RagperfCanaryExecutionBundlePlan@v1',
    status: 'passed',
    database_access: 'none',
    cloud_access: 'none',
    provider_operations: 0,
    planned_write_scope: {
      identities: 1,
      drafts: 1,
      revisions: 1,
      lifecycle_events: 1,
      lifecycle_projections: 1,
      readiness_records: 1,
      total_rows: 6,
    },
    frozen_bundle: frozen,
    offline_same_payload_preview: previews,
    authorization: structuredClone(authoring.authorization),
  };
}

export function parseSciFactExecutionBundleAuthoringManifest(
  value: unknown,
): SciFactExecutionBundleAuthoringManifest {
  const record = requireRecord(value, 'ExecutionBundle authoring manifest');
  if (
    record.schema !== 'RagperfCanaryExecutionBundleAuthoringManifest@v1'
    || record.review_scope !== 't132-m7-l1-diagnostic-only'
  ) {
    throw new Error('SciFact ExecutionBundle authoring manifest scope is invalid');
  }
  requireNonEmptyString(record.bundle_key, 'bundle_key');
  requireNonEmptyString(record.display_name, 'display_name');
  const authorization = requireRecord(record.authorization, 'authorization');
  if (
    authorization.named_local_bundle_freeze_authorized !== false
    || authorization.cloud_access_authorized !== false
    || authorization.create_job_authorized !== false
    || authorization.capability_enable_authorized !== false
  ) {
    throw new Error('SciFact ExecutionBundle authoring manifest must remain default-off');
  }
  const cells = record.offline_preview_cells;
  if (
    !Array.isArray(cells)
    || cells.length !== 2
    || cells[0]?.ordinal !== 1
    || cells[0]?.cell_key !== 'retriever-top-k-5'
    || cells[1]?.ordinal !== 2
    || cells[1]?.cell_key !== 'retriever-top-k-10'
  ) {
    throw new Error('SciFact ExecutionBundle preview cells are invalid');
  }
  return value as SciFactExecutionBundleAuthoringManifest;
}

function parseWorkloadManifest(value: unknown): WorkloadDirectoryManifest {
  const record = requireRecord(value, 'workload manifest');
  if (
    record.schema !== 'RagperfCanaryWorkloadDirectoryManifest@v1'
    || record.upload_state !== 'uploaded_verified'
  ) {
    throw new Error('SciFact workload manifest is not uploaded_verified');
  }
  const authorization = requireRecord(record.authorization, 'workload authorization');
  if (authorization.create_job_authorized !== false) {
    throw new Error('SciFact workload manifest must not authorize CreateJob');
  }
  return value as WorkloadDirectoryManifest;
}

async function assertAuthoringEvidence(
  authoring: SciFactExecutionBundleAuthoringManifest,
  workload: WorkloadDirectoryManifest,
  mirrors: SciFactMirrorManifest,
): Promise<void> {
  assert.deepEqual(authoring.code_artifact, {
    artifact_ref: workload.delivery.artifact_ref,
    content_digest: workload.delivery.content_digest,
    byte_size: workload.delivery.byte_size,
  });
  assert.equal(workload.delivery.mount_path, '/mnt/pea-code');
  assert.equal(workload.runtime.entrypoint, authoring.entrypoint);
  assert.deepEqual(workload.runtime.arguments_prefix, authoring.arguments);
  assert.equal(workload.runtime.dependency_model, 'python-3.11-stdlib-only');
  assert.equal(
    authoring.dependency_lock.snapshot.entrypoint_content_digest,
    authoring.code_artifact.content_digest,
  );
  assertCanonicalSnapshotHash(
    authoring.dependency_lock.snapshot,
    authoring.dependency_lock.content_hash,
    'dependency lock',
  );
  assertCanonicalSnapshotHash(
    authoring.output_parser.snapshot,
    authoring.output_parser.content_hash,
    'output parser',
  );
  const transportSha = `sha256:${sha256Bytes(await fs.readFile(TRANSPORT_SOURCE_PATH))}`;
  assert.equal(
    authoring.output_parser.snapshot.transport_source_sha256,
    transportSha,
    'Output parser transport source digest drifted',
  );
  assert.equal(
    authoring.offline_preview_profile.image_uri,
    authoring.container_image.image_ref,
  );
  for (const mirror of mirrors.mirrors) {
    if (mirror.dataset_revision_binding === null) {
      throw new Error(`SciFact mirror remains unbound: ${mirror.role}`);
    }
  }
}

function buildBundleContent(
  authoring: SciFactExecutionBundleAuthoringManifest,
  mirrors: SciFactMirrorManifest,
): ExperimentFoundationExecutionBundleContentV2 {
  return {
    execution_bundle_schema_version: 'v2',
    code_artifact: structuredClone(authoring.code_artifact),
    container_image: structuredClone(authoring.container_image),
    dataset_mirrors: [...mirrors.mirrors]
      .sort((left, right) => left.ordinal - right.ordinal)
      .map((mirror) => {
        assert.ok(mirror.dataset_revision_binding);
        return {
          ordinal: mirror.ordinal,
          dataset_revision: {
            ...structuredClone(mirror.dataset_revision_binding),
            asset_type: 'Dataset' as const,
          },
          object_ref: mirror.object_ref,
          content_digest: mirror.content_digest,
          byte_size: mirror.byte_size,
        };
      }),
    entrypoint: authoring.entrypoint,
    arguments: [...authoring.arguments],
    dependency_lock_digest: authoring.dependency_lock.content_hash,
    output_contract: {
      result_envelope_schema:
        authoring.output_parser.snapshot.result_envelope_schema,
      result_object_name: authoring.output_parser.snapshot.result_object_name,
      parser_profile_version: authoring.output_parser.snapshot.profile_version,
      parser_profile_hash: authoring.output_parser.content_hash,
    },
  };
}

function buildOfflineSamePayloadPreviews(
  authoring: SciFactExecutionBundleAuthoringManifest,
  revision: ExperimentFoundationExecutionBundleRevisionV2,
): SciFactExecutionBundlePlan['offline_same_payload_preview'] {
  const payloadService = new ExperimentFoundationRealProviderPayloadV2Service();
  const runManifestHash = previewHash('OfflinePreviewRunManifest', {
    bundle_revision_id: revision.execution_bundle_revision_id,
    bundle_revision_hash: revision.content_hash,
    cells: authoring.offline_preview_cells,
  });
  const run: ExperimentFoundationRunV2 = {
    run_id: 't132-m7-l1-bundle-offline-preview-run',
    external_pi_work_order_revision_id:
      't132-m7-l1-bundle-offline-preview-work-order-revision',
    external_pi_work_order_revision_hash:
      previewHash('OfflinePreviewWorkOrderRevision', authoring.offline_preview_cells),
    external_pi_branch_revision_sequence: 1,
    run_manifest_hash: runManifestHash,
    cell_count: 2,
    frozen_at: PLAN_TIME,
  };
  return authoring.offline_preview_cells.map((cell) => {
    const taskSpec = buildPreviewTaskSpec(authoring, revision, run, cell);
    const runCell: ExperimentFoundationRunCellV2 = {
      run_cell_id: `t132-m7-l1-bundle-offline-preview-cell-${cell.ordinal}`,
      run_id: run.run_id,
      ordinal: cell.ordinal,
      cell_key: cell.cell_key,
      external_pi_cell_id: `t132-m7-l1-preview-pi-cell-${cell.ordinal}`,
      external_pi_cell_hash: previewHash('OfflinePreviewPiCell', cell),
      training_task_spec_id: taskSpec.training_task_spec_id,
      training_task_spec_hash: taskSpec.task_spec_hash,
      seed: cell.ordinal,
      repeat_index: 1,
    };
    const prerequisite = {
      run,
      run_cell: runCell,
      task_spec: taskSpec,
      execution_bundle_revision: revision,
      provider_idempotency_key:
        `t132-m7-l1-offline-preview:${cell.cell_key}:v1`,
    };
    const first = payloadService.materialize(
      prerequisite,
      authoring.offline_preview_profile,
    );
    const replay = payloadService.materialize(
      structuredClone(prerequisite),
      structuredClone(authoring.offline_preview_profile),
    );
    payloadService.verify(first);
    payloadService.verify(replay);
    assert.deepEqual(replay.record, first.record);
    assert.equal(replay.canonical_payload_bytes, first.canonical_payload_bytes);
    assert.equal(first.record.redacted_manifest.manifest_schema_version, 'v2');
    return {
      ordinal: cell.ordinal,
      cell_key: cell.cell_key,
      payload_hash: first.record.payload_hash,
      payload_byte_size: first.record.payload_byte_size,
      manifest_schema_version: 'v2',
      same_payload_replay_exact: true,
      network_requests: 0,
      provider_writes: 0,
      create_job_calls: 0,
      scientific_writes: 0,
    };
  });
}

function buildPreviewTaskSpec(
  authoring: SciFactExecutionBundleAuthoringManifest,
  revision: ExperimentFoundationExecutionBundleRevisionV2,
  run: ExperimentFoundationRunV2,
  cell: SciFactExecutionBundleAuthoringManifest['offline_preview_cells'][number],
): ExperimentFoundationExecutableTrainingTaskSpecV2 {
  const taskSpecId = `t132-m7-l1-bundle-offline-preview-task-${cell.ordinal}`;
  const taskSpecContent = {
    task_spec_id: taskSpecId,
    cell,
    bundle_revision_id: revision.execution_bundle_revision_id,
    bundle_revision_hash: revision.content_hash,
    run_manifest_hash: run.run_manifest_hash,
  };
  return {
    training_task_spec_id: taskSpecId,
    materialization_key:
      `t132-m7-l1-bundle-offline-preview-materialization-${cell.ordinal}`,
    run_recipe_id: 't132-m7-l1-bundle-offline-preview-recipe',
    external_pi_work_order_revision_id:
      run.external_pi_work_order_revision_id,
    external_pi_work_order_revision_hash:
      run.external_pi_work_order_revision_hash,
    external_pi_cell_id: `t132-m7-l1-preview-pi-cell-${cell.ordinal}`,
    external_pi_cell_hash: previewHash('OfflinePreviewPiCell', cell),
    execution_bundle: {
      execution_bundle_id: revision.execution_bundle_id,
      execution_bundle_revision_id: revision.execution_bundle_revision_id,
      revision_sequence: revision.revision_sequence,
      content_hash: revision.content_hash,
    },
    command_snapshot: {
      command: authoring.entrypoint,
      arguments: [...authoring.arguments, `--cell-key=${cell.cell_key}`],
    },
    io_snapshot: {
      input_keys: ['dataset-mirror-1', 'dataset-mirror-2'],
      output_keys: [
        'real_provider_result_envelope',
        'real_provider_diagnostic_log',
      ],
      input_mirror_ordinals: [1, 2],
      result_object_name: authoring.output_parser.snapshot.result_object_name,
      result_envelope_schema:
        authoring.output_parser.snapshot.result_envelope_schema,
      parser_profile_version: authoring.output_parser.snapshot.profile_version,
      parser_profile_hash: authoring.output_parser.content_hash,
    },
    resource_snapshot: {
      cpu_cores: cell.cpu_cores,
      memory_mb: cell.memory_mb,
    },
    retry_snapshot: {
      max_attempts: 1,
      timeout_seconds: cell.timeout_seconds,
    },
    task_spec_hash: previewHash('OfflinePreviewTaskSpec', taskSpecContent),
    created_at: PLAN_TIME,
  };
}

function assertCanonicalSnapshotHash(
  snapshot: unknown,
  expected: string,
  label: string,
): void {
  if (
    !HASH_PATTERN.test(expected)
    || `sha256:${sha256Bytes(canonicalizeExperimentV2Json(snapshot))}` !== expected
  ) {
    throw new Error(`SciFact ExecutionBundle ${label} hash drifted`);
  }
}

function previewHash(recordKind: string, content: unknown): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: recordKind,
    schema_version: 'v1',
    hash_profile: 'ef-real-provider-control-json@v1',
    content,
  });
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

class InMemoryExecutionBundleV2Repository
implements ExperimentFoundationExecutionBundleV2Repository {
  private draft: ExperimentFoundationExecutionBundleDraftBundleV2 | null = null;
  private frozen: ExperimentFoundationExecutionBundleFrozenBundleV2 | null = null;

  async findDraftByBundleKey(
    bundleKey: string,
  ): Promise<ExperimentFoundationExecutionBundleDraftBundleV2 | null> {
    return this.draft?.identity.bundle_key === bundleKey
      ? structuredClone(this.draft)
      : null;
  }

  async putDraft(
    input: ExperimentFoundationExecutionBundlePutDraftInputV2,
  ): Promise<ExperimentFoundationExecutionBundleDraftBundleV2> {
    this.draft = {
      identity: structuredClone(input.identity),
      draft: structuredClone(input.draft),
      replayed: false,
    };
    return structuredClone(this.draft);
  }

  async freezeActiveRevision(
    input: ExperimentFoundationExecutionBundleFreezeInputV2,
  ): Promise<ExperimentFoundationExecutionBundleFrozenBundleV2> {
    assert.ok(this.draft);
    this.frozen = {
      identity: {
        ...structuredClone(this.draft.identity),
        state_version: this.draft.identity.state_version + 1,
      },
      draft: structuredClone(this.draft.draft),
      revision: structuredClone(input.revision),
      lifecycle_event: structuredClone(input.lifecycle_event),
      lifecycle_projection: structuredClone(input.lifecycle_projection),
      readiness: structuredClone(input.readiness),
      replayed: false,
    };
    return structuredClone(this.frozen);
  }

  async findActiveReadyExact(
    revisionId: string,
    contentHash: string,
  ): Promise<ExperimentFoundationExecutionBundleFrozenBundleV2 | null> {
    return (
      this.frozen?.revision.execution_bundle_revision_id === revisionId
      && this.frozen.revision.content_hash === contentHash
    ) ? structuredClone(this.frozen) : null;
  }
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown;
}

async function main(): Promise<void> {
  const [authoring, workload, mirrors] = await Promise.all([
    readJson(AUTHORING_MANIFEST_PATH),
    readJson(WORKLOAD_MANIFEST_PATH),
    readJson(MIRROR_MANIFEST_PATH),
  ]);
  process.stdout.write(`${JSON.stringify(
    await buildSciFactExecutionBundlePlan(authoring, workload, mirrors),
    null,
    2,
  )}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({
      status: 'failed',
      message: error instanceof Error ? error.message : String(error),
    })}\n`);
    process.exitCode = 1;
  });
}
