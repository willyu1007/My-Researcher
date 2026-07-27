#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';
import type {
  ExperimentFoundationAssetLifecycleEventV2,
  ExperimentFoundationAssetLifecycleProjectionV2,
  ExperimentFoundationV2DataPolicyDraftContentV1,
  ExperimentFoundationV2DatasetDraftContentV1,
  ExperimentFoundationV2ExactAssetRevisionRef,
  ExperimentFoundationV2LifecycleEventType,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  type ExperimentV2JsonValue,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { AppError } from '../src/errors/app-error.js';
import type {
  ExperimentFoundationV2AssetIdentityRecord,
  ExperimentFoundationV2AssetRevisionRecord,
  ExperimentFoundationV2Repository,
} from '../src/repositories/experiment-foundation-v2.repository.js';
import { PrismaExperimentFoundationV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-v2-repository.js';
import {
  ExperimentFoundationV2Service,
} from '../src/services/experiment-foundation-v2-service.js';
import {
  redactExperimentFoundationD19CliError,
  requireExperimentFoundationD19LocalTargetFingerprint,
  requireLocalExperimentFoundationD19DatabaseUrl,
} from '../src/services/experiment-foundation-d19-fixture-import-cli.js';
import {
  canonicalizeExperimentFoundationEvidenceJson,
  countExperimentFoundationNamedLocalTables,
  type ExperimentFoundationNamedLocalRowDigest,
} from './experiment-foundation-named-local-evidence.js';
import {
  buildSciFactAuthorityPlan,
  parseSciFactAuthorityManifest,
  type SciFactAuthorityManifest,
  type SciFactAuthorityPlan,
  type SciFactRole,
} from './plan-experiment-foundation-scifact-authority.js';
import {
  sha256Bytes,
  writeJsonAtomic,
} from '../../../.ai/scripts/lib/experiment-v2-evidence.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ARTIFACT_ROOT = path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-productization');
const AUTHORITY_MANIFEST_PATH = path.join(
  REPO_ROOT,
  'workloads/ragperf-canary/manifests/scifact-authority-v1.json',
);
const MIRROR_MANIFEST_PATH = path.join(
  REPO_ROOT,
  'workloads/ragperf-canary/manifests/scifact-mirrors-v1.json',
);
export const REQUIRED_SCIFACT_NAMED_LOCAL_AUTHORIZATION =
  'T-132 SciFact named-local authority apply: 26 rows';
const AUTHORIZATION_ENV = 'T132_SCIFACT_NAMED_LOCAL_APPLY_AUTHORIZATION';
const MAX_LIFECYCLE_RETRIES = 3;

const EXPECTED_WRITE_TABLES = [
  'ExperimentFoundationDataPolicyV2',
  'ExperimentFoundationDataPolicyRevisionV2',
  'ExperimentFoundationDataPolicyFreezeCommandReceiptV2',
  'ExperimentFoundationDatasetV2',
  'ExperimentFoundationDatasetRevisionV2',
  'ExperimentFoundationDatasetFreezeCommandReceiptV2',
  'ExperimentFoundationAssetLifecycleEventV2',
  'ExperimentFoundationAssetLifecycleProjectionV2',
] as const;

interface ScriptArgs {
  outputPath: string;
}

interface ApplicationTableDescriptor {
  name: string;
  orderColumns: string[];
}

interface LifecycleStep {
  event_type: ExperimentFoundationV2LifecycleEventType;
  reason_code: string;
  event_id: string;
}

interface ImportAsset {
  role: SciFactRole;
  asset_type: 'DataPolicy' | 'Dataset';
  logical_id: string;
  server_revision_id: string;
  freeze_idempotency_key: string;
  draft_content:
    | ExperimentFoundationV2DataPolicyDraftContentV1
    | ExperimentFoundationV2DatasetDraftContentV1;
  exact_ref: ExperimentFoundationV2ExactAssetRevisionRef;
  lifecycle: LifecycleStep[];
}

export interface SciFactAuthorityImportCounters {
  asset_identities: { created: number; exact_reused: number };
  asset_revisions: { created: number; exact_reused: number };
  lifecycle_events: { created: number; exact_reused: number };
  lifecycle_projections: { created: number; exact_reused: number };
}

export interface SciFactAuthorityImportResult {
  counters: SciFactAuthorityImportCounters;
  exact_refs: SciFactAuthorityPlan['exact_refs'];
  mirror_bindings: SciFactAuthorityPlan['mirror_bindings'];
}

export async function applySciFactAuthority(
  repository: ExperimentFoundationV2Repository,
  authority: SciFactAuthorityManifest,
  plan: SciFactAuthorityPlan,
  options: { now?: () => string } = {},
): Promise<SciFactAuthorityImportResult> {
  const counters = emptyCounters();
  const assets = buildImportAssets(authority, plan);
  for (const asset of assets) {
    const lifecycleIdState = { next: null as string | null };
    const service = new ExperimentFoundationV2Service(repository, {
      now: options.now,
      idGenerator(kind) {
        if (kind === 'revision') return asset.server_revision_id;
        if (kind === 'lifecycle_event' && lifecycleIdState.next) {
          return lifecycleIdState.next;
        }
        throw new Error(`Unexpected SciFact importer id request: ${kind}`);
      },
    });

    const identityState = await inspectAssetPrefix(repository, asset);
    if (identityState === 'missing') {
      try {
        await service.createAssetDraft(createInput(asset));
        counters.asset_identities.created += 1;
      } catch (error) {
        if (!hasReasonCode(error, 'ASSET_IDENTITY_CONFLICT')) throw error;
        await requireExistingAssetPrefix(repository, asset);
        counters.asset_identities.exact_reused += 1;
      }
    } else {
      counters.asset_identities.exact_reused += 1;
    }

    const frozen = await service.freezeAssetDraft({
      asset_type: asset.asset_type,
      logical_id: asset.logical_id,
      expected_state_version: 1,
      business_idempotency_key: asset.freeze_idempotency_key,
    });
    assert.deepEqual(
      frozen.exact_ref,
      asset.exact_ref,
      `SciFact ${asset.asset_type}:${asset.role} exact revision drifted`,
    );
    if (frozen.replayed) counters.asset_revisions.exact_reused += 1;
    else counters.asset_revisions.created += 1;

    const beforeLifecycle = await inspectLifecyclePrefix(repository, asset);
    if (beforeLifecycle.events.length === 0) {
      counters.lifecycle_projections.created += 1;
    } else {
      counters.lifecycle_projections.exact_reused += 1;
    }
    counters.lifecycle_events.exact_reused += beforeLifecycle.events.length;
    for (let index = beforeLifecycle.events.length; index < asset.lifecycle.length; index += 1) {
      const step = asset.lifecycle[index]!;
      lifecycleIdState.next = step.event_id;
      await appendLifecycleStepWithRetry(
        repository,
        service,
        asset,
        step,
        index,
        0,
      );
      lifecycleIdState.next = null;
      counters.lifecycle_events.created += 1;
    }
    await requireCompleteLifecycle(repository, asset);
  }
  return {
    counters,
    exact_refs: structuredClone(plan.exact_refs),
    mirror_bindings: structuredClone(plan.mirror_bindings),
  };
}

function buildImportAssets(
  authority: SciFactAuthorityManifest,
  plan: SciFactAuthorityPlan,
): ImportAsset[] {
  const policyRefs = new Map<SciFactRole, ExperimentFoundationV2ExactAssetRevisionRef>();
  authority.data_policies.forEach((entry, index) => {
    const ref = plan.exact_refs.data_policies[index];
    if (!ref || ref.asset_type !== 'DataPolicy') {
      throw new Error(`Missing planned DataPolicy exact ref for ${entry.role}`);
    }
    policyRefs.set(entry.role, ref);
  });
  const assets: ImportAsset[] = authority.data_policies.map((entry, index) => ({
    role: entry.role,
    asset_type: 'DataPolicy',
    logical_id: entry.logical_id,
    server_revision_id: entry.server_revision_id,
    freeze_idempotency_key: entry.freeze_idempotency_key,
    draft_content: structuredClone(entry.draft_content),
    exact_ref: requireExactRef(plan.exact_refs.data_policies[index], 'DataPolicy', entry.role),
    lifecycle: lifecycleSteps('DataPolicy', entry.role),
  }));
  authority.datasets.forEach((entry, index) => {
    const policyRef = policyRefs.get(entry.data_policy_role);
    if (!policyRef || policyRef.asset_type !== 'DataPolicy') {
      throw new Error(`Missing DataPolicy binding for ${entry.role}`);
    }
    assets.push({
      role: entry.role,
      asset_type: 'Dataset',
      logical_id: entry.logical_id,
      server_revision_id: entry.server_revision_id,
      freeze_idempotency_key: entry.freeze_idempotency_key,
      draft_content: {
        ...structuredClone(entry.draft_content),
        data_policy: { ...policyRef, asset_type: 'DataPolicy' },
      },
      exact_ref: requireExactRef(plan.exact_refs.datasets[index], 'Dataset', entry.role),
      lifecycle: lifecycleSteps('Dataset', entry.role),
    });
  });
  return assets;
}

function lifecycleSteps(
  assetType: 'DataPolicy' | 'Dataset',
  role: SciFactRole,
): LifecycleStep[] {
  const stem = `ef_asset_event_t132_scifact_${assetType.toLowerCase()}_${role}`;
  const common: LifecycleStep[] = [
    {
      event_type: 'registered',
      reason_code: 'T132_SCIFACT_REGISTERED',
      event_id: `${stem}_registered_v1`,
    },
    {
      event_type: 'activated',
      reason_code: 'T132_SCIFACT_ACTIVATED',
      event_id: `${stem}_activated_v1`,
    },
  ];
  return assetType === 'Dataset'
    ? [...common, {
      event_type: 'location_available',
      reason_code: 'T132_SCIFACT_OSS_MIRROR_AVAILABLE',
      event_id: `${stem}_location_available_v1`,
    }]
    : common;
}

async function inspectAssetPrefix(
  repository: ExperimentFoundationV2Repository,
  asset: ImportAsset,
): Promise<'missing' | 'draft' | 'frozen'> {
  return repository.runInTransaction(async (unitOfWork) => {
    const identity = await unitOfWork.findAssetIdentity(asset.asset_type, asset.logical_id);
    if (!identity) return 'missing';
    assertIdentityDraft(identity, asset);
    const revisions = await unitOfWork.listAssetRevisions(asset.asset_type, asset.logical_id);
    if (
      identity.asset.draft_state_version === 1
      && identity.asset.current_revision_id === null
      && revisions.length === 0
    ) {
      return 'draft';
    }
    assertFrozenPrefix(identity, revisions, asset);
    return 'frozen';
  });
}

async function requireExistingAssetPrefix(
  repository: ExperimentFoundationV2Repository,
  asset: ImportAsset,
): Promise<void> {
  if (await inspectAssetPrefix(repository, asset) === 'missing') {
    throw new Error(`SciFact asset disappeared during exact replay: ${asset.logical_id}`);
  }
}

function assertIdentityDraft(
  identity: ExperimentFoundationV2AssetIdentityRecord,
  asset: ImportAsset,
): void {
  if (
    identity.asset_type !== asset.asset_type
    || identity.asset.logical_id !== asset.logical_id
  ) {
    throw new Error(`SciFact asset identity type drifted: ${asset.logical_id}`);
  }
  const actualDraft = identity.asset_type === 'DataPolicy'
    ? identity.asset.data_policy_draft
    : identity.asset.dataset_draft;
  if (canonical(actualDraft) !== canonical(asset.draft_content)) {
    throw new Error(`SciFact asset draft content drifted: ${asset.logical_id}`);
  }
}

function assertFrozenPrefix(
  identity: ExperimentFoundationV2AssetIdentityRecord,
  revisions: ExperimentFoundationV2AssetRevisionRecord[],
  asset: ImportAsset,
): void {
  const [revision] = revisions;
  if (
    identity.asset.draft_state_version !== 2
    || identity.asset.current_revision_id !== asset.exact_ref.revision_id
    || revisions.length !== 1
    || !revision
    || revision.asset_type !== asset.asset_type
    || revision.revision.revision_id !== asset.exact_ref.revision_id
    || revision.revision.revision_sequence !== 1
    || revision.revision.content_hash !== asset.exact_ref.content_hash
  ) {
    throw new Error(`SciFact immutable revision prefix drifted: ${asset.logical_id}`);
  }
  const snapshot = revision.asset_type === 'DataPolicy'
    ? revision.revision.data_policy_revision
    : revision.revision.dataset_revision;
  if (canonical(snapshot) !== canonical(asset.draft_content)) {
    throw new Error(`SciFact immutable revision content drifted: ${asset.logical_id}`);
  }
}

async function inspectLifecyclePrefix(
  repository: ExperimentFoundationV2Repository,
  asset: ImportAsset,
): Promise<{
  events: ExperimentFoundationAssetLifecycleEventV2[];
  projection: ExperimentFoundationAssetLifecycleProjectionV2 | null;
}> {
  return repository.runInTransaction(async (unitOfWork) => {
    const events = await unitOfWork.listLifecycleEvents(asset.exact_ref);
    const projection = await unitOfWork.findLifecycleProjection(asset.exact_ref);
    if (events.length > asset.lifecycle.length) {
      throw new Error(`SciFact lifecycle has unexpected extra events: ${asset.logical_id}`);
    }
    events.forEach((event, index) => {
      const expected = asset.lifecycle[index]!;
      if (
        event.lifecycle_event_id !== expected.event_id
        || event.lifecycle_sequence !== index + 1
        || event.event_type !== expected.event_type
        || event.reason_code !== expected.reason_code
        || event.note !== null
        || canonical(event.asset) !== canonical(asset.exact_ref)
      ) {
        throw new Error(`SciFact lifecycle event drifted: ${asset.logical_id}:${index + 1}`);
      }
    });
    assertProjectionPrefix(asset, events, projection);
    return { events, projection };
  });
}

function assertProjectionPrefix(
  asset: ImportAsset,
  events: ExperimentFoundationAssetLifecycleEventV2[],
  projection: ExperimentFoundationAssetLifecycleProjectionV2 | null,
): void {
  if (events.length === 0) {
    if (projection !== null) {
      throw new Error(`SciFact lifecycle projection exists without an event: ${asset.logical_id}`);
    }
    return;
  }
  const lastEvent = events.at(-1)!;
  const expectedStatus = events.length >= 2 ? 'active' : 'draft';
  const expectedLocation = asset.asset_type === 'Dataset' && events.length === 3;
  if (
    !projection
    || canonical(projection.asset) !== canonical(asset.exact_ref)
    || projection.projection_state_version !== events.length
    || projection.lifecycle_sequence !== events.length
    || projection.lifecycle_status !== expectedStatus
    || projection.location_available !== expectedLocation
    || projection.source_event_id !== lastEvent.lifecycle_event_id
  ) {
    throw new Error(`SciFact lifecycle projection drifted: ${asset.logical_id}`);
  }
}

async function appendLifecycleStepWithRetry(
  repository: ExperimentFoundationV2Repository,
  service: ExperimentFoundationV2Service,
  asset: ImportAsset,
  step: LifecycleStep,
  index: number,
  retryCount: number,
): Promise<void> {
  try {
    await service.appendLifecycleEvent({
      asset: asset.exact_ref,
      expected_projection_state_version: index === 0 ? null : index,
      event_type: step.event_type,
      reason_code: step.reason_code,
    });
  } catch (error) {
    if (
      retryCount >= MAX_LIFECYCLE_RETRIES
      || !hasReasonCode(error, 'ASSET_LIFECYCLE_PROJECTION_CAS_CONFLICT')
    ) {
      throw error;
    }
    const current = await inspectLifecyclePrefix(repository, asset);
    if (current.events.length > index) return;
    return appendLifecycleStepWithRetry(
      repository,
      service,
      asset,
      step,
      index,
      retryCount + 1,
    );
  }
}

async function requireCompleteLifecycle(
  repository: ExperimentFoundationV2Repository,
  asset: ImportAsset,
): Promise<void> {
  const state = await inspectLifecyclePrefix(repository, asset);
  if (state.events.length !== asset.lifecycle.length) {
    throw new Error(`SciFact lifecycle did not converge: ${asset.logical_id}`);
  }
}

function createInput(asset: ImportAsset) {
  return asset.asset_type === 'DataPolicy'
    ? {
      asset_type: 'DataPolicy' as const,
      logical_id: asset.logical_id,
      draft_content: asset.draft_content as ExperimentFoundationV2DataPolicyDraftContentV1,
    }
    : {
      asset_type: 'Dataset' as const,
      logical_id: asset.logical_id,
      draft_content: asset.draft_content as ExperimentFoundationV2DatasetDraftContentV1,
    };
}

function requireExactRef(
  value: ExperimentFoundationV2ExactAssetRevisionRef | undefined,
  assetType: 'DataPolicy' | 'Dataset',
  role: SciFactRole,
): ExperimentFoundationV2ExactAssetRevisionRef {
  if (!value || value.asset_type !== assetType) {
    throw new Error(`Missing planned ${assetType} exact ref for ${role}`);
  }
  return structuredClone(value);
}

function canonical(value: unknown): string {
  return canonicalizeExperimentV2Json(value as ExperimentV2JsonValue);
}

function emptyCounters(): SciFactAuthorityImportCounters {
  return {
    asset_identities: { created: 0, exact_reused: 0 },
    asset_revisions: { created: 0, exact_reused: 0 },
    lifecycle_events: { created: 0, exact_reused: 0 },
    lifecycle_projections: { created: 0, exact_reused: 0 },
  };
}

function hasReasonCode(error: unknown, reasonCode: string): boolean {
  return error instanceof AppError && error.details?.reason_code === reasonCode;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  requireSciFactNamedLocalAuthorization(process.env[AUTHORIZATION_ENV]);
  requireLocalExperimentFoundationD19DatabaseUrl(process.env.DATABASE_URL);
  const [authorityValue, mirrorValue] = await Promise.all([
    readJson(AUTHORITY_MANIFEST_PATH),
    readJson(MIRROR_MANIFEST_PATH),
  ]);
  const authority = parseSciFactAuthorityManifest(authorityValue);
  const plan = await buildSciFactAuthorityPlan(authorityValue, mirrorValue);
  const prisma = new PrismaClient();
  const originalFetch = globalThis.fetch;
  let externalFetchCalls = 0;
  globalThis.fetch = (async () => {
    externalFetchCalls += 1;
    throw new Error('T132_SCIFACT_IMPORT_EXTERNAL_FETCH_DENIED');
  }) as typeof fetch;
  try {
    await prisma.$connect();
    const identityRows = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      return tx.$queryRawUnsafe<Array<{
        database_name: string;
        schema_name: string;
        system_identifier: string;
        database_oid: string;
        schema_oid: string;
      }>>(
        `SELECT current_database() AS database_name,
                current_schema() AS schema_name,
                system_row.system_identifier::text AS system_identifier,
                database_row.oid::text AS database_oid,
                schema_row.oid::text AS schema_oid
         FROM pg_control_system() AS system_row
         JOIN pg_catalog.pg_database AS database_row
           ON database_row.datname = current_database()
         JOIN pg_catalog.pg_namespace AS schema_row
           ON schema_row.nspname = current_schema()`,
      );
    });
    const targetFingerprint = requireExperimentFoundationD19LocalTargetFingerprint(identityRows[0]);
    const applicationTables = await listApplicationTables(prisma);
    const expectedWriteTableSet = new Set<string>(EXPECTED_WRITE_TABLES);
    const protectedTableDescriptors = applicationTables.filter(
      (table) => !expectedWriteTableSet.has(table.name),
    );
    const protectedTables = protectedTableDescriptors.map((table) => table.name);
    const [protectedBefore, expectedBefore] = await Promise.all([
      digestApplicationTableRowVersions(prisma, protectedTableDescriptors),
      countExperimentFoundationNamedLocalTables(prisma, EXPECTED_WRITE_TABLES),
    ]);

    const imported = await applySciFactAuthority(
      new PrismaExperimentFoundationV2Repository(prisma),
      authority,
      plan,
    );

    const [protectedAfter, expectedAfter, scopedCensus] = await Promise.all([
      digestApplicationTableRowVersions(prisma, protectedTableDescriptors),
      countExperimentFoundationNamedLocalTables(prisma, EXPECTED_WRITE_TABLES),
      readScopedCensus(prisma, authority, plan),
    ]);
    assert.deepEqual(protectedAfter, protectedBefore, 'Protected application tables changed');
    assert.equal(externalFetchCalls, 0, 'SciFact authority import attempted external fetch');
    assert.deepEqual(scopedCensus, {
      data_policy_identities: 2,
      data_policy_revisions: 2,
      data_policy_freeze_receipts: 2,
      dataset_identities: 2,
      dataset_revisions: 2,
      dataset_freeze_receipts: 2,
      lifecycle_events: 10,
      lifecycle_projections: 4,
      total_rows: 26,
    });
    const summary = {
      schema: 'RagperfCanarySciFactAuthorityApply@v1',
      status: 'passed',
      target_fingerprint: targetFingerprint,
      authorization: {
        source: 'process-scoped exact string',
        value_stored: false,
        authorized_row_ceiling: 26,
      },
      plan,
      counters: imported.counters,
      scoped_census: scopedCensus,
      expected_tables_before: expectedBefore,
      expected_tables_after: expectedAfter,
      protected_table_count: protectedTables.length,
      protected_tables_unchanged: true,
      external_fetch_calls: externalFetchCalls,
      cloud_operations: 0,
      provider_writes: 0,
      create_job_calls: 0,
      scientific_writes: 0,
    };
    await writeJsonAtomic(args.outputPath, summary);
    process.stdout.write(`${JSON.stringify({
      status: 'passed',
      output: path.relative(REPO_ROOT, args.outputPath),
      scoped_rows: scopedCensus.total_rows,
      counters: imported.counters,
      protected_table_count: protectedTables.length,
    })}\n`);
  } finally {
    globalThis.fetch = originalFetch;
    await prisma.$disconnect();
  }
}

function parseArgs(argv: string[]): ScriptArgs {
  let apply = false;
  let output: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--') continue;
    if (argument === '--apply') {
      apply = true;
      continue;
    }
    if (argument === '--output') {
      output = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!apply) throw new Error('--apply is required for the SciFact named-local write');
  if (!output || path.isAbsolute(output)) {
    throw new Error('--output must be a repository-relative path');
  }
  const outputPath = path.resolve(REPO_ROOT, output);
  if (!outputPath.startsWith(`${ARTIFACT_ROOT}${path.sep}`)) {
    throw new Error('Output must remain below .ai/.tmp/experiment-foundation-productization/');
  }
  return { outputPath };
}

export function requireSciFactNamedLocalAuthorization(value: string | undefined): void {
  if (value !== REQUIRED_SCIFACT_NAMED_LOCAL_AUTHORIZATION) {
    throw new Error(
      `${AUTHORIZATION_ENV} must exactly authorize the corrected 26-row scope`,
    );
  }
}

async function listApplicationTables(
  prisma: PrismaClient,
): Promise<ApplicationTableDescriptor[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{
    table_name: string;
    order_columns: string[];
  }>>(
    `SELECT table_row.table_name::text AS table_name,
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM information_schema.columns AS id_column
                WHERE id_column.table_schema = table_row.table_schema
                  AND id_column.table_name = table_row.table_name
                  AND id_column.column_name = 'id'
              )
                THEN ARRAY['id']::text[]
              ELSE ARRAY(
                SELECT key_column.column_name::text
                FROM information_schema.table_constraints AS table_constraint
                JOIN information_schema.key_column_usage AS key_column
                  ON key_column.constraint_schema = table_constraint.constraint_schema
                 AND key_column.constraint_name = table_constraint.constraint_name
                 AND key_column.table_schema = table_constraint.table_schema
                 AND key_column.table_name = table_constraint.table_name
                WHERE table_constraint.table_schema = table_row.table_schema
                  AND table_constraint.table_name = table_row.table_name
                  AND table_constraint.constraint_type = 'PRIMARY KEY'
                ORDER BY key_column.ordinal_position
              )
            END AS order_columns
     FROM information_schema.tables AS table_row
     WHERE table_row.table_schema = current_schema()
       AND table_row.table_type = 'BASE TABLE'
       AND table_row.table_name <> '_prisma_migrations'
     ORDER BY table_row.table_name COLLATE "C" ASC`,
  );
  const tables = rows.map((row) => ({
    name: row.table_name,
    orderColumns: row.order_columns,
  }));
  for (const table of tables) {
    if (table.orderColumns.length === 0) {
      throw new Error(`Application table lacks a stable primary-key order: ${table.name}`);
    }
  }
  for (const expected of EXPECTED_WRITE_TABLES) {
    if (!tables.some((table) => table.name === expected)) {
      throw new Error(`SciFact expected write table is missing: ${expected}`);
    }
  }
  return tables;
}

async function digestApplicationTableRowVersions(
  prisma: PrismaClient,
  tablesToDigest: readonly ApplicationTableDescriptor[],
): Promise<Record<string, ExperimentFoundationNamedLocalRowDigest>> {
  const tables: Record<string, ExperimentFoundationNamedLocalRowDigest> = {};
  for (const table of tablesToDigest) {
    if (
      !/^[A-Za-z_][A-Za-z0-9_]*$/.test(table.name)
      || table.orderColumns.some((column) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(column))
    ) {
      throw new Error('Unsafe application table identifier');
    }
    const orderBy = table.orderColumns
      .map((column) => `table_row."${column}" ASC`)
      .join(', ');
    const rowSignature = [
      ...table.orderColumns.map((column) => `table_row."${column}"`),
      'table_row.xmin::text',
    ].join(', ');
    const rows = await prisma.$queryRawUnsafe<Array<{ row_json: unknown }>>(
      `SELECT jsonb_build_array(${rowSignature}) AS row_json
       FROM "${table.name}" AS table_row
       ORDER BY ${orderBy}`,
    );
    tables[table.name] = {
      count: rows.length,
      digest: `sha256:${sha256Bytes(
        canonicalizeExperimentFoundationEvidenceJson(
          rows.map((row) => row.row_json),
        ),
      )}`,
    };
  }
  return tables;
}

async function readScopedCensus(
  prisma: PrismaClient,
  authority: SciFactAuthorityManifest,
  plan: SciFactAuthorityPlan,
) {
  const policyIds = authority.data_policies.map((entry) => entry.logical_id);
  const datasetIds = authority.datasets.map((entry) => entry.logical_id);
  const revisionIds = [
    ...plan.exact_refs.data_policies,
    ...plan.exact_refs.datasets,
  ].map((ref) => ref.revision_id);
  const assetIds = [...policyIds, ...datasetIds];
  const [
    dataPolicyIdentities,
    dataPolicyRevisions,
    dataPolicyReceipts,
    datasetIdentities,
    datasetRevisions,
    datasetReceipts,
    lifecycleEvents,
    lifecycleProjections,
  ] = await Promise.all([
    prisma.experimentFoundationDataPolicyV2.count({ where: { id: { in: policyIds } } }),
    prisma.experimentFoundationDataPolicyRevisionV2.count({
      where: { id: { in: revisionIds } },
    }),
    prisma.experimentFoundationDataPolicyFreezeCommandReceiptV2.count({
      where: { dataPolicyId: { in: policyIds } },
    }),
    prisma.experimentFoundationDatasetV2.count({ where: { id: { in: datasetIds } } }),
    prisma.experimentFoundationDatasetRevisionV2.count({
      where: { id: { in: revisionIds } },
    }),
    prisma.experimentFoundationDatasetFreezeCommandReceiptV2.count({
      where: { datasetId: { in: datasetIds } },
    }),
    prisma.experimentFoundationAssetLifecycleEventV2.count({
      where: { assetId: { in: assetIds } },
    }),
    prisma.experimentFoundationAssetLifecycleProjectionV2.count({
      where: { assetId: { in: assetIds } },
    }),
  ]);
  return {
    data_policy_identities: dataPolicyIdentities,
    data_policy_revisions: dataPolicyRevisions,
    data_policy_freeze_receipts: dataPolicyReceipts,
    dataset_identities: datasetIdentities,
    dataset_revisions: datasetRevisions,
    dataset_freeze_receipts: datasetReceipts,
    lifecycle_events: lifecycleEvents,
    lifecycle_projections: lifecycleProjections,
    total_rows: dataPolicyIdentities
      + dataPolicyRevisions
      + dataPolicyReceipts
      + datasetIdentities
      + datasetRevisions
      + datasetReceipts
      + lifecycleEvents
      + lifecycleProjections,
  };
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({
      status: 'failed',
      message: redactExperimentFoundationD19CliError(error),
    })}\n`);
    process.exitCode = 1;
  });
}
