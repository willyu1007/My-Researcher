#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import type {
  ExperimentFoundationV2DataPolicyDraftContentV1,
  ExperimentFoundationV2DatasetDraftContentV1,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';

import { InMemoryExperimentFoundationV2Repository } from '../src/repositories/in-memory-experiment-foundation-v2-repository.js';
import {
  ExperimentFoundationV2Service,
} from '../src/services/experiment-foundation-v2-service.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const AUTHORITY_MANIFEST_PATH = path.join(
  REPO_ROOT,
  'workloads/ragperf-canary/manifests/scifact-authority-v1.json',
);
const MIRROR_MANIFEST_PATH = path.join(
  REPO_ROOT,
  'workloads/ragperf-canary/manifests/scifact-mirrors-v1.json',
);
const PLAN_TIME = '2026-07-27T00:00:00.000Z';

export type SciFactRole = 'corpus' | 'query_workload';

export interface SciFactAuthorityManifest {
  schema: 'RagperfCanarySciFactAuthorityManifest@v1';
  review_scope: 't132-m7-l1-diagnostic-only';
  source_evidence: {
    dataset: string;
    archive_url: string;
    archive_md5: string;
    archive_sha256: string;
    upstream_revision: string;
    upstream_license_uri: string;
  };
  data_policies: Array<{
    role: SciFactRole;
    logical_id: string;
    server_revision_id: string;
    freeze_idempotency_key: string;
    draft_content: ExperimentFoundationV2DataPolicyDraftContentV1;
  }>;
  datasets: Array<{
    role: SciFactRole;
    logical_id: string;
    server_revision_id: string;
    freeze_idempotency_key: string;
    data_policy_role: SciFactRole;
    mirror_ordinal: number;
    draft_content: Omit<ExperimentFoundationV2DatasetDraftContentV1, 'data_policy'>;
  }>;
  authorization: {
    named_local_apply_authorized: false;
    execution_bundle_freeze_authorized: false;
    create_job_authorized: false;
  };
}

export interface SciFactMirrorManifest {
  schema: 'RagperfCanaryDatasetMirrorManifest@v1';
  source: {
    archive_url: string;
    archive_md5: string;
    archive_sha256: string;
  };
  mirrors: Array<{
    ordinal: number;
    role: SciFactRole;
    filename: string;
    record_count: number;
    content_digest: string;
    byte_size: number;
    object_ref: string;
    dataset_revision_binding: ExperimentFoundationV2ExactAssetRevisionRef | null;
    upload_state: 'uploaded_verified';
  }>;
  authorization: {
    create_job_authorized: false;
  };
}

export interface SciFactAuthorityPlan {
  schema: 'RagperfCanarySciFactAuthorityPlan@v1';
  status: 'passed';
  database_access: 'none';
  cloud_access: 'none';
  source_evidence: SciFactAuthorityManifest['source_evidence'];
  planned_write_scope: {
    data_policy_identities: 2;
    data_policy_revisions: 2;
    dataset_identities: 2;
    dataset_revisions: 2;
    freeze_command_receipts: 4;
    lifecycle_events_after_apply: 10;
    lifecycle_projections_after_apply: 4;
    readiness_attestations: 0;
    execution_bundle_revisions: 0;
  };
  exact_refs: {
    data_policies: ExperimentFoundationV2ExactAssetRevisionRef[];
    datasets: ExperimentFoundationV2ExactAssetRevisionRef[];
  };
  mirror_bindings: Array<{
    ordinal: number;
    role: SciFactRole;
    object_ref: string;
    content_digest: string;
    byte_size: number;
    dataset_revision: ExperimentFoundationV2ExactAssetRevisionRef;
  }>;
  authorization: SciFactAuthorityManifest['authorization'];
}

export async function buildSciFactAuthorityPlan(
  authorityValue: unknown,
  mirrorValue: unknown,
): Promise<SciFactAuthorityPlan> {
  const authority = parseSciFactAuthorityManifest(authorityValue);
  const mirrors = parseSciFactMirrorManifest(mirrorValue);
  assertSourceEvidenceMatches(authority, mirrors);

  const revisionIds = [
    ...authority.data_policies.map((entry) => entry.server_revision_id),
    ...authority.datasets.map((entry) => entry.server_revision_id),
  ];
  const repository = new InMemoryExperimentFoundationV2Repository();
  const service = new ExperimentFoundationV2Service(repository, {
    now: () => PLAN_TIME,
    idGenerator(kind) {
      if (kind !== 'revision') {
        throw new Error(`Unexpected planner id request: ${kind}`);
      }
      const revisionId = revisionIds.shift();
      if (!revisionId) throw new Error('SciFact planner exhausted server revision ids');
      return revisionId;
    },
  });

  const policyRefs = new Map<SciFactRole, ExperimentFoundationV2ExactAssetRevisionRef>();
  for (const policy of authority.data_policies) {
    await service.createAssetDraft({
      asset_type: 'DataPolicy',
      logical_id: policy.logical_id,
      draft_content: policy.draft_content,
    });
    const frozen = await service.freezeAssetDraft({
      asset_type: 'DataPolicy',
      logical_id: policy.logical_id,
      expected_state_version: 1,
      business_idempotency_key: policy.freeze_idempotency_key,
    });
    policyRefs.set(policy.role, frozen.exact_ref);
  }

  const datasetRefs = new Map<SciFactRole, ExperimentFoundationV2ExactAssetRevisionRef>();
  for (const dataset of authority.datasets) {
    const dataPolicy = policyRefs.get(dataset.data_policy_role);
    if (!dataPolicy || dataPolicy.asset_type !== 'DataPolicy') {
      throw new Error(`Missing exact DataPolicy plan for ${dataset.data_policy_role}`);
    }
    const mirror = requireMirror(mirrors, dataset.role, dataset.mirror_ordinal);
    assertDatasetMatchesMirror(dataset, mirror);
    await service.createAssetDraft({
      asset_type: 'Dataset',
      logical_id: dataset.logical_id,
      draft_content: {
        ...dataset.draft_content,
        data_policy: {
          ...dataPolicy,
          asset_type: 'DataPolicy',
        },
      },
    });
    const frozen = await service.freezeAssetDraft({
      asset_type: 'Dataset',
      logical_id: dataset.logical_id,
      expected_state_version: 1,
      business_idempotency_key: dataset.freeze_idempotency_key,
    });
    assertMirrorBindingMatches(mirror, frozen.exact_ref);
    datasetRefs.set(dataset.role, frozen.exact_ref);
  }

  if (revisionIds.length !== 0) {
    throw new Error('SciFact planner did not consume every server revision id');
  }

  return {
    schema: 'RagperfCanarySciFactAuthorityPlan@v1',
    status: 'passed',
    database_access: 'none',
    cloud_access: 'none',
    source_evidence: structuredClone(authority.source_evidence),
    planned_write_scope: {
      data_policy_identities: 2,
      data_policy_revisions: 2,
      dataset_identities: 2,
      dataset_revisions: 2,
      freeze_command_receipts: 4,
      lifecycle_events_after_apply: 10,
      lifecycle_projections_after_apply: 4,
      readiness_attestations: 0,
      execution_bundle_revisions: 0,
    },
    exact_refs: {
      data_policies: authority.data_policies.map((entry) => requireRoleRef(policyRefs, entry.role)),
      datasets: authority.datasets.map((entry) => requireRoleRef(datasetRefs, entry.role)),
    },
    mirror_bindings: authority.datasets.map((entry) => {
      const mirror = requireMirror(mirrors, entry.role, entry.mirror_ordinal);
      return {
        ordinal: mirror.ordinal,
        role: mirror.role,
        object_ref: mirror.object_ref,
        content_digest: mirror.content_digest,
        byte_size: mirror.byte_size,
        dataset_revision: requireRoleRef(datasetRefs, entry.role),
      };
    }),
    authorization: structuredClone(authority.authorization),
  };
}

export function parseSciFactAuthorityManifest(value: unknown): SciFactAuthorityManifest {
  const record = requireRecord(value, 'authority manifest');
  if (
    record.schema !== 'RagperfCanarySciFactAuthorityManifest@v1'
    || record.review_scope !== 't132-m7-l1-diagnostic-only'
  ) {
    throw new Error('SciFact authority manifest schema or review scope is invalid');
  }
  const sourceEvidence = requireRecord(record.source_evidence, 'source_evidence');
  [
    'archive_url',
    'archive_md5',
    'archive_sha256',
    'upstream_revision',
    'upstream_license_uri',
  ].forEach((key) => requireNonEmptyString(sourceEvidence[key], `source_evidence.${key}`));

  if (!Array.isArray(record.data_policies) || record.data_policies.length !== 2) {
    throw new Error('SciFact authority manifest requires exactly two DataPolicies');
  }
  if (!Array.isArray(record.datasets) || record.datasets.length !== 2) {
    throw new Error('SciFact authority manifest requires exactly two Datasets');
  }
  assertUniqueRoles(record.data_policies, 'data_policies');
  assertUniqueRoles(record.datasets, 'datasets');
  const authorization = requireRecord(record.authorization, 'authorization');
  if (
    authorization.named_local_apply_authorized !== false
    || authorization.execution_bundle_freeze_authorized !== false
    || authorization.create_job_authorized !== false
  ) {
    throw new Error('SciFact authority plan must remain default-off');
  }
  return value as SciFactAuthorityManifest;
}

export function parseSciFactMirrorManifest(value: unknown): SciFactMirrorManifest {
  const record = requireRecord(value, 'mirror manifest');
  if (record.schema !== 'RagperfCanaryDatasetMirrorManifest@v1') {
    throw new Error('SciFact mirror manifest schema is invalid');
  }
  if (!Array.isArray(record.mirrors) || record.mirrors.length !== 2) {
    throw new Error('SciFact mirror manifest requires exactly two mirrors');
  }
  assertUniqueRoles(record.mirrors, 'mirrors');
  for (const rawMirror of record.mirrors) {
    const mirror = requireRecord(rawMirror, 'mirror');
    if (mirror.upload_state !== 'uploaded_verified') {
      throw new Error('SciFact mirrors must be uploaded_verified');
    }
    if (mirror.dataset_revision_binding !== null) {
      const binding = requireRecord(
        mirror.dataset_revision_binding,
        'mirror dataset_revision_binding',
      );
      if (
        binding.asset_type !== 'Dataset'
        || typeof binding.logical_id !== 'string'
        || binding.logical_id.length === 0
        || typeof binding.revision_id !== 'string'
        || binding.revision_id.length === 0
        || binding.revision_sequence !== 1
        || typeof binding.content_hash !== 'string'
        || !/^sha256:[a-f0-9]{64}$/.test(binding.content_hash)
      ) {
        throw new Error('SciFact mirror Dataset revision binding is invalid');
      }
    }
  }
  const authorization = requireRecord(record.authorization, 'mirror authorization');
  if (authorization.create_job_authorized !== false) {
    throw new Error('SciFact mirror manifest must not authorize CreateJob');
  }
  return value as SciFactMirrorManifest;
}

function assertSourceEvidenceMatches(
  authority: SciFactAuthorityManifest,
  mirrors: SciFactMirrorManifest,
): void {
  for (const key of ['archive_url', 'archive_md5', 'archive_sha256'] as const) {
    if (authority.source_evidence[key] !== mirrors.source[key]) {
      throw new Error(`SciFact source evidence drifted at ${key}`);
    }
  }
}

function assertDatasetMatchesMirror(
  dataset: SciFactAuthorityManifest['datasets'][number],
  mirror: SciFactMirrorManifest['mirrors'][number],
): void {
  const entries = dataset.draft_content.checksum_manifest.entries;
  const [entry] = entries;
  if (
    entries.length !== 1
    || !entry
    || entry.path !== mirror.filename
    || entry.byte_size !== mirror.byte_size
    || `sha256:${entry.checksum}` !== mirror.content_digest
    || dataset.draft_content.checksum_manifest.aggregate_checksum !== entry.checksum
  ) {
    throw new Error(`SciFact Dataset checksum manifest drifted from mirror ${mirror.role}`);
  }
  const expectedRecordCount = mirror.role === 'corpus' ? 5183 : 300;
  if (mirror.record_count !== expectedRecordCount) {
    throw new Error(`SciFact mirror record count drifted for ${mirror.role}`);
  }
}

function assertMirrorBindingMatches(
  mirror: SciFactMirrorManifest['mirrors'][number],
  exactRef: ExperimentFoundationV2ExactAssetRevisionRef,
): void {
  const binding = mirror.dataset_revision_binding;
  if (binding === null) return;
  if (
    binding.asset_type !== exactRef.asset_type
    || binding.logical_id !== exactRef.logical_id
    || binding.revision_id !== exactRef.revision_id
    || binding.revision_sequence !== exactRef.revision_sequence
    || binding.content_hash !== exactRef.content_hash
  ) {
    throw new Error(`SciFact mirror Dataset revision binding drifted for ${mirror.role}`);
  }
}

function requireMirror(
  manifest: SciFactMirrorManifest,
  role: SciFactRole,
  ordinal: number,
): SciFactMirrorManifest['mirrors'][number] {
  const mirror = manifest.mirrors.find((entry) => entry.role === role && entry.ordinal === ordinal);
  if (!mirror) throw new Error(`Missing exact SciFact mirror ${ordinal}:${role}`);
  return mirror;
}

function requireRoleRef(
  refs: Map<SciFactRole, ExperimentFoundationV2ExactAssetRevisionRef>,
  role: SciFactRole,
): ExperimentFoundationV2ExactAssetRevisionRef {
  const ref = refs.get(role);
  if (!ref) throw new Error(`Missing planned exact ref for ${role}`);
  return structuredClone(ref);
}

function assertUniqueRoles(values: unknown[], label: string): void {
  const roles = values.map((value) => {
    const record = requireRecord(value, label);
    if (record.role !== 'corpus' && record.role !== 'query_workload') {
      throw new Error(`${label} contains an invalid role`);
    }
    return record.role;
  });
  if (new Set(roles).size !== 2) {
    throw new Error(`${label} must contain corpus and query_workload exactly once`);
  }
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

async function main(): Promise<void> {
  const [authority, mirrors] = await Promise.all([
    fs.readFile(AUTHORITY_MANIFEST_PATH, 'utf8').then((value) => JSON.parse(value) as unknown),
    fs.readFile(MIRROR_MANIFEST_PATH, 'utf8').then((value) => JSON.parse(value) as unknown),
  ]);
  process.stdout.write(`${JSON.stringify(
    await buildSciFactAuthorityPlan(authority, mirrors),
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
