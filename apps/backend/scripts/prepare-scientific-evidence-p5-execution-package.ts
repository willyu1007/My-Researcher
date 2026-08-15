#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';
import type {
  ExperimentFoundationExecutableTrainingTaskSpecV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import type {
  ExperimentFoundationRunCellV2,
  ExperimentFoundationRunV2,
  ExperimentFoundationV2EvaluationProtocolRevisionContentV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import type {
  PaperImplementationExperimentV2ExactCellInput,
  PaperImplementationExperimentWorkOrderRevisionCellV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import {
  serverHashScientificEvidenceP5ControlPlaneSessionPolicyV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { PrismaExperimentFoundationExecutionBundleV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-execution-bundle-v2-repository.js';
import { PrismaPaperImplementationExperimentSpineV2Repository } from '../src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.js';
import { ExperimentFoundationExecutionBundleV2Service } from '../src/services/experiment-foundation-execution-bundle-v2-service.js';
import {
  SCIENTIFIC_EVIDENCE_P5_AUTHORITY_SNAPSHOT_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_CONTROL_PLANE_CREDENTIAL_SCHEMA_V2,
  SCIENTIFIC_EVIDENCE_P5_EXECUTION_PACKAGE_SCHEMA_V3,
  SCIENTIFIC_EVIDENCE_P5_OPERATIONAL_TIMELINE_SCHEMA_V3,
  buildScientificEvidenceP5AuthoritySnapshotV1,
  buildScientificEvidenceP5ExecutionPackageV3,
  buildScientificEvidenceP5OperationalTimelineV3,
  preflightScientificEvidenceP5PackageV3,
  type ScientificEvidenceP5AuthoritySnapshotContentV1,
  type ScientificEvidenceP5CellV1,
  type ScientificEvidenceP5ControlPlaneSessionPolicyV1,
  type ScientificEvidenceP5ExecutionPackageContentV3,
} from '../src/services/scientific-evidence-p5-eligibility-service.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
} from './experiment-foundation-named-local-evidence.js';
import {
  SCIENTIFIC_EVIDENCE_P5_PREPARED_AUTHORIZATION_SCHEMA_V3,
  type ScientificEvidenceP5PreparedAuthorizationV3,
} from '../src/services/scientific-evidence-p5-authorization-service.js';
import {
  assertScientificEvidenceP5WorkloadSealabilityV1,
} from '../src/services/scientific-evidence-p5-workload-preflight-service.js';

const PROJECT_ID = 'implementation_project_642a1879-1137-40f5-b340-330b66509975';
const CYCLE_ID = 'validation_cycle_t136_p5_scifact_v4';
const BRANCH_ID = 'pi_experiment_branch_v2_t136_p5_scifact_v4_1';
const REVISION_ID = 'pi_experiment_revision_v2_t136_p5_scifact_v4_1';
const RUN_ID = 'ef_run_v2_t136_p5_scifact_v4_1';
const PROTOCOL_REVISION_ID = 'ef_revision_t136_p5_protocol_scifact_micro_recall_v2';
const BUNDLE_REVISION_ID = 'ef_execution_bundle_revision_1e2a87f2867ca8a89743464eaad8654454702468';
const BUNDLE_REVISION_HASH = 'sha256:bdf9c260c23c1f8eb079f84a0d8dfe879fe5cba670c6e1a961ad2ddba3198db3';
const P5_ATTEMPT_ID = 't136-p5-scifact-attempt-17';
const SOURCE_PRINCIPAL_ARN = 'acs:ram::1183869713036194:user/user_0002';
const CONTROLLER_ROLE_ARN = 'acs:ram::1183869713036194:role/pea-m7-canary-controller';
const CONTROLLER_TRUST_POLICY_HASH =
  'sha256:46c14313b4a48378129637fa28153ff640abc81b7d317d784e8c2c6ef25ad257';
const CONTROLLER_POLICY_DOCUMENT_HASH =
  'sha256:f83feab999e5185f927db04f5e383611c19e3dba7f4dcdc4fc10775e03a80e6c';
const RECOVERY_MANIFEST =
  '/Users/yurui/Desktop/My-Researcher-Recovery/T-136/t136-p5-recovery-manifest.json';
const PREPARED_AUTHORIZATION_V19_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../workloads/scifact-recall-p5/manifests/prepared-authorization-v19.json',
);
const WORKLOAD_PROFILE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../workloads/scifact-recall-p5/manifests/workload-profile-v1.json',
);
const WORKLOAD_ENTRYPOINT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../workloads/scifact-recall-p5/entrypoint.py',
);
const PREPARED_AUTHORIZATION_V19_REF = 'manifests/prepared-authorization-v19.json';
const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});
const SESSION_POLICY: ScientificEvidenceP5ControlPlaneSessionPolicyV1 = {
  Version: '1',
  Statement: [
    {
      Sid: 'T136P5ControllerPaiDlcExact',
      Effect: 'Allow',
      Action: ['paidlc:CreateJob', 'paidlc:GetJob', 'paidlc:ListJobs', 'paidlc:StopJob'],
      Resource: '*',
    },
    {
      Sid: 'T136P5ControllerWorkspaceExact',
      Effect: 'Allow',
      Action: ['paiworkspace:GetWorkspace'],
      Resource: 'acs:paiworkspace:cn-shanghai:1183869713036194:workspace/1450165',
    },
    {
      Sid: 'T136P5ControllerPassRuntimeRoleExact',
      Effect: 'Allow',
      Action: ['ram:PassRole'],
      Resource: 'acs:ram::1183869713036194:role/pea-m7-canary-runtime',
    },
    {
      Sid: 'T136P5ControllerImageRead',
      Effect: 'Allow',
      Action: ['paiimage:GetImage'],
      Resource: '*',
    },
    {
      Sid: 'T136P5ControllerResultReadExact',
      Effect: 'Allow',
      Action: ['oss:GetObject'],
      Resource:
        'acs:oss:*:*:pea-m7-canary-6194-202607/output/ef_run_v2_t136_p5_scifact_v4_1/*',
    },
    {
      Sid: 'T136P5ControllerCallerIdentity',
      Effect: 'Allow',
      Action: ['sts:GetCallerIdentity'],
      Resource: '*',
    },
  ],
};

interface StoredTaskSnapshot {
  schema_version: 'v2';
  execution_bundle: ExperimentFoundationExecutableTrainingTaskSpecV2['execution_bundle'];
  command_snapshot: ExperimentFoundationExecutableTrainingTaskSpecV2['command_snapshot'];
  io_snapshot: ExperimentFoundationExecutableTrainingTaskSpecV2['io_snapshot'];
  resource_snapshot: ExperimentFoundationExecutableTrainingTaskSpecV2['resource_snapshot'];
  retry_snapshot: ExperimentFoundationExecutableTrainingTaskSpecV2['retry_snapshot'];
}

interface WorkloadProfileAuthorizationProjection {
  named_local_materialization_complete: boolean;
  current_revision: number;
  prepared_package_hash: string | null;
  prepared_package_eligible: boolean;
  prepared_authorization_ref: string | null;
  authorization_acceptance_ref: string | null;
  authorization_status: string;
  create_job_authorized: boolean;
  capability_enable_authorized: boolean;
  historical_revision_3: unknown;
}

interface WorkloadProfile {
  schema: string;
  authorization: WorkloadProfileAuthorizationProjection;
  [key: string]: unknown;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const operationalTimeline = buildScientificEvidenceP5OperationalTimelineV3(
    await resolveSystemAssignedStart(options.writeManifest),
  );
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T136_P5_PACKAGE_TARGET_MISMATCH',
  );
  const recovery = JSON.parse(await fs.readFile(RECOVERY_MANIFEST, 'utf8')) as {
    created_at: string;
    target_fingerprint: string;
    recovery_fingerprint: string;
  };
  assert.equal(recovery.target_fingerprint, TARGET.fingerprint);

  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const executionBundle = await new ExperimentFoundationExecutionBundleV2Service({
      repository: new PrismaExperimentFoundationExecutionBundleV2Repository(prisma),
    }).resolveActiveReadyExact({
      execution_bundle_revision_id: BUNDLE_REVISION_ID,
      content_hash: BUNDLE_REVISION_HASH,
    });
    const admission = await new PrismaPaperImplementationExperimentSpineV2Repository(prisma)
      .findRevisionBundle(BRANCH_ID, REVISION_ID);
    assert.ok(admission);
    assert.equal(admission.branch.implementation_project_id, PROJECT_ID);
    assert.equal(admission.branch.validation_cycle_id, CYCLE_ID);
    assert.equal(admission.cells.length, 2);
    assert.equal(admission.revision.work_order_revision.work_order_schema_version, 'v2');

    const [runRow, taskRows, protocolRow, existingCreateJobCount, scientificResultCount] =
      await Promise.all([
        prisma.experimentFoundationRunV2.findUnique({
          where: { id: RUN_ID },
          include: { cells: { orderBy: { ordinal: 'asc' } } },
        }),
        prisma.experimentFoundationTrainingTaskSpecV2.findMany({
          where: { externalPiWorkOrderRevisionId: REVISION_ID },
          orderBy: { cellOrdinal: 'asc' },
        }),
        prisma.experimentFoundationEvaluationProtocolRevisionV2.findUnique({
          where: { id: PROTOCOL_REVISION_ID },
        }),
        prisma.experimentFoundationProviderPayloadV2.count({ where: { runId: RUN_ID } }),
        prisma.experimentFoundationExperimentResultV2.count({ where: { runId: RUN_ID } }),
      ]);
    assert.ok(runRow && protocolRow);
    assert.equal(runRow.cells.length, 2);
    assert.equal(taskRows.length, 2);
    assert.equal(existingCreateJobCount, 0);
    assert.equal(scientificResultCount, 0);

    const taskSpecs = taskRows.map(mapTaskSpec);
    const tasksById = new Map(taskSpecs.map((task) => [task.training_task_spec_id, task]));
    const runCells = runRow.cells.map((cell): ExperimentFoundationRunCellV2 => {
      const task = tasksById.get(cell.trainingTaskSpecId);
      assert.ok(task);
      return {
        run_cell_id: cell.id,
        run_id: cell.runId,
        ordinal: cell.ordinal,
        cell_key: cell.cellKey,
        external_pi_cell_id: cell.externalPiWorkOrderCellId,
        external_pi_cell_hash: cell.externalPiWorkOrderCellHash,
        training_task_spec_id: cell.trainingTaskSpecId,
        training_task_spec_hash: task.task_spec_hash,
        seed: cell.seed,
        repeat_index: cell.repeatIndex,
      };
    });
    const run: ExperimentFoundationRunV2 = {
      run_id: runRow.id,
      external_pi_work_order_revision_id: runRow.externalPiWorkOrderRevisionId,
      external_pi_work_order_revision_hash: runRow.externalPiWorkOrderRevisionHash,
      external_pi_branch_revision_sequence: runRow.externalPiRevisionSequence,
      run_manifest_hash: runRow.runManifestHash,
      cell_count: runRow.cells.length,
      frozen_at: runRow.frozenAt.toISOString(),
    };
    const orderedCells = admission.cells.map((cell, index): ScientificEvidenceP5CellV1 => {
      const runCell = runCells[index];
      const task = taskSpecs[index];
      assert.ok(runCell && task);
      return {
        run_cell: { ...runCell, ordinal: (index + 1) as 1 | 2 },
        work_order_cell_input: exactCellInput(cell),
        training_task_spec: task,
      };
    });
    assert.equal(orderedCells.length, 2);
    const exactOrderedCells = orderedCells as [ScientificEvidenceP5CellV1, ScientificEvidenceP5CellV1];
    const protocolRevision = {
      asset_type: 'EvaluationProtocol' as const,
      logical_id: protocolRow.evaluationProtocolId,
      revision_id: protocolRow.id,
      revision_sequence: protocolRow.revisionSequence,
      content_hash: protocolRow.contentHash,
    };
    const protocolContent = (
      protocolRow.evaluationProtocolSnapshotJson as unknown
    ) as ExperimentFoundationV2EvaluationProtocolRevisionContentV2;
    const executionPackage = buildScientificEvidenceP5ExecutionPackageV3({
      schema_version: SCIENTIFIC_EVIDENCE_P5_EXECUTION_PACKAGE_SCHEMA_V3,
      p5_attempt_id: P5_ATTEMPT_ID,
      authority: {
        implementation_project_id: PROJECT_ID,
        validation_cycle_id: CYCLE_ID,
        branch_id: BRANCH_ID,
        branch_revision_sequence: admission.revision.revision_sequence,
        work_order_revision: {
          id: admission.revision.work_order_revision_id,
          content_hash: admission.revision.content_hash,
          snapshot: admission.revision.work_order_revision,
        },
        run,
      },
      evaluation_protocol: {
        revision: protocolRevision,
        revision_content: protocolContent,
      },
      execution_bundle_revision: executionBundle.revision,
      scientific_input_policy: {
        provenance: 'real_provider',
        source: 'ef_parsed_and_sealed_typed_observations',
        manual_result_import: 'forbidden',
        unfetched_artifact_byte_dependency: 'forbidden',
      },
      declared_differing_factor: { parameter_name: 'retrieval_top_k' },
      ordered_cells: exactOrderedCells,
      provider: {
        provider_kind: 'aliyun_pai_dlc',
        adapter_identity: 'aliyun_pai_dlc_official_sdk@v1',
        collection_reader_identity: 'aliyun_oss_exact_result_reader@v1',
        profile: {
          schema_version: 'AliyunPaiDlcRealProviderProfile@v1',
          region_id: 'cn-shanghai',
          workspace_id: '1450165',
          resource_binding: {
            mode: 'public_resource',
            ecs_spec: 'ecs.g6.large',
            cpu_cores: 2,
            memory_mb: 8_192,
          },
          image_uri: executionBundle.revision.revision_content.container_image.image_ref,
          job_type: 'PyTorchJob',
          job_spec_type: 'Worker',
          pod_count: 1,
          workload_binding: {
            schema_version: 'AliyunPaiDlcWorkloadBinding@v1',
            runtime_role_arn: 'acs:ram::1183869713036194:role/pea-m7-canary-runtime',
            code_mount_path: '/mnt/pea-code',
            input_mount_root: '/mnt/pea-input',
            output_mount_path: '/mnt/pea-output',
            output_uri_prefix:
              'oss://pea-m7-canary-6194-202607.oss-cn-shanghai-internal.aliyuncs.com/output/',
          },
        },
      },
      authorized_operations: [
        {
          ordinal: 1,
          owner: 'ExperimentFoundation',
          operation: 'CreateJob',
          run_cell_id: exactOrderedCells[0].run_cell.run_cell_id,
        },
        {
          ordinal: 2,
          owner: 'ExperimentFoundation',
          operation: 'CreateJob',
          run_cell_id: exactOrderedCells[1].run_cell.run_cell_id,
        },
      ],
      cost_ceiling: {
        currency: 'CNY',
        per_operation_amount_minor: 2_500,
        total_amount_minor: 5_000,
      },
      operational_timeline: operationalTimeline,
      credential_policy: {
        schema_version: SCIENTIFIC_EVIDENCE_P5_CONTROL_PLANE_CREDENTIAL_SCHEMA_V2,
        credential_ref: 'env://ALIBABA_CLOUD_TEMPORARY_CREDENTIAL',
        secret_material_included: false,
        source_principal: {
          identity_type: 'ram_user',
          arn: SOURCE_PRINCIPAL_ARN,
        },
        controller_role: {
          arn: CONTROLLER_ROLE_ARN,
          max_session_duration_seconds: 3_600,
          trust_policy_hash: CONTROLLER_TRUST_POLICY_HASH,
          attached_policy: {
            name: 'pea-m7-canary-controller',
            type: 'Custom',
            version: 'v4',
            document_hash: CONTROLLER_POLICY_DOCUMENT_HASH,
          },
        },
        role_session_name:
          `t136-p5-scifact-${operationalTimeline.issuance.not_before
            .slice(0, 10).replaceAll('-', '')}-r19`,
        session_policy: SESSION_POLICY,
        session_policy_hash: serverHashScientificEvidenceP5ControlPlaneSessionPolicyV1(
          SESSION_POLICY,
        ),
        issued_duration_seconds: 3_600,
        minimum_remaining_at_live_start_seconds: 2_400,
        credential_operations_stop_before_earliest_expiration_seconds: 360,
        automatic_expiration_not_after: new Date(
          Date.parse(operationalTimeline.issuance.dispatch_not_after) + 3_600_000,
        ).toISOString(),
        qualification: {
          required: true,
          allowed_operations: [
            'Sts.AssumeRole',
            'Sts.GetCallerIdentity',
            'AIWorkspace.GetWorkspace',
            'PaiImage.GetImage',
          ],
          create_job_forbidden: true,
          product_capabilities_must_remain_disabled: true,
          grants_paid_execution_authority: false,
        },
        remove_process_material: true,
        delete_local_credential_config: true,
        manual_revocation_required: false,
        verify_local_cleanup: true,
        verify_expiration_after_window: true,
        ram_role_or_policy_mutation_forbidden: true,
      },
      named_local: {
        target_fingerprint: TARGET.fingerprint,
        recovery_fingerprint: recovery.recovery_fingerprint,
        recovery_point_created_at: recovery.created_at,
      },
    } satisfies ScientificEvidenceP5ExecutionPackageContentV3);
    await assertScientificEvidenceP5WorkloadSealabilityV1({
      execution_package: executionPackage,
      entrypoint_path: WORKLOAD_ENTRYPOINT_PATH,
    });
    const authoritySnapshot = buildScientificEvidenceP5AuthoritySnapshotV1({
      schema_version: SCIENTIFIC_EVIDENCE_P5_AUTHORITY_SNAPSHOT_SCHEMA_V1,
      source: 'named_local_postgres_authority',
      p5_attempt_id: P5_ATTEMPT_ID,
      target_fingerprint: TARGET.fingerprint,
      implementation_project_id: PROJECT_ID,
      validation_cycle_id: CYCLE_ID,
      branch_id: BRANCH_ID,
      branch_revision_sequence: admission.revision.revision_sequence,
      work_order_revision: {
        id: admission.revision.work_order_revision_id,
        content_hash: admission.revision.content_hash,
      },
      run: { id: run.run_id, content_hash: run.run_manifest_hash },
      run_is_frozen: true,
      ordered_cells: exactOrderedCells.map((cell) => ({
        ordinal: cell.run_cell.ordinal,
        run_cell_id: cell.run_cell.run_cell_id,
        work_order_cell: {
          id: cell.run_cell.external_pi_cell_id,
          content_hash: cell.run_cell.external_pi_cell_hash,
        },
        training_task_spec: {
          id: cell.training_task_spec.training_task_spec_id,
          content_hash: cell.training_task_spec.task_spec_hash,
        },
      })) as ScientificEvidenceP5AuthoritySnapshotContentV1['ordered_cells'],
      existing_create_job_count: existingCreateJobCount,
      existing_scientific_result_count: scientificResultCount,
    });
    const eligibility = preflightScientificEvidenceP5PackageV3({
      execution_package: executionPackage,
      authority_snapshot: authoritySnapshot,
    });
    assert.equal(
      eligibility.status,
      'eligible',
      `P5 eligibility failed: ${eligibility.reason_codes.join(', ')}`,
    );
    assert.deepEqual(eligibility.reason_codes, []);
    const prepared = {
      schema_version: SCIENTIFIC_EVIDENCE_P5_PREPARED_AUTHORIZATION_SCHEMA_V3,
      status: 'eligible',
      execution_package: executionPackage,
      authority_snapshot: authoritySnapshot,
      eligibility,
      effect_census: {
        database_writes: 0,
        cloud_calls: 0,
        create_job_calls: 0,
        capability_changes: 0,
        credentials_read: 0,
      },
    } satisfies ScientificEvidenceP5PreparedAuthorizationV3;
    const serialized = `${JSON.stringify(prepared, null, 2)}\n`;
    if (options.writeManifest) {
      await writeNewExactManifest(PREPARED_AUTHORIZATION_V19_PATH, serialized);
      await projectPreparedPackageToWorkloadProfile(executionPackage.package_hash);
    }
    process.stdout.write(serialized);
  } finally {
    await prisma.$disconnect();
  }
}

function parseOptions(args: string[]): { writeManifest: boolean } {
  const normalized = args[0] === '--' ? args.slice(1) : args;
  const writeManifest = normalized.includes('--write-manifest');
  if (normalized.length !== (writeManifest ? 1 : 0)) {
    throw new Error(
      'Usage: prepare-scientific-evidence-p5-execution-package '
        + '[--write-manifest]',
    );
  }
  return { writeManifest };
}

async function resolveSystemAssignedStart(writeManifest: boolean): Promise<string> {
  try {
    const existing = JSON.parse(
      await fs.readFile(PREPARED_AUTHORIZATION_V19_PATH, 'utf8'),
    ) as ScientificEvidenceP5PreparedAuthorizationV3;
    assert.equal(
      existing.execution_package.operational_timeline.schema_version,
      SCIENTIFIC_EVIDENCE_P5_OPERATIONAL_TIMELINE_SCHEMA_V3,
    );
    return existing.execution_package.operational_timeline.issuance.not_before;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    if (!writeManifest) {
      throw new Error('T136_P5_REVISION_19_REQUIRES_FIRST_WRITE_MANIFEST');
    }
    return new Date().toISOString();
  }
}

async function writeNewExactManifest(manifestPath: string, serialized: string): Promise<void> {
  try {
    const existing = await fs.readFile(manifestPath, 'utf8');
    assert.equal(existing, serialized, 'Existing revision-19 manifest differs from generated output.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    await fs.writeFile(manifestPath, serialized, { encoding: 'utf8', flag: 'wx' });
  }
}

async function projectPreparedPackageToWorkloadProfile(packageHash: string): Promise<void> {
  const currentSerialized = await fs.readFile(WORKLOAD_PROFILE_PATH, 'utf8');
  const profile = JSON.parse(currentSerialized) as WorkloadProfile;
  assert.equal(profile.schema, 'ScifactRecallP5WorkloadProfile@v1');

  const authorization = profile.authorization;
  assert.equal(authorization.named_local_materialization_complete, true);
  assert.equal(authorization.current_revision, 19);

  if (authorization.authorization_acceptance_ref !== null) {
    assert.equal(authorization.prepared_package_hash, packageHash);
    assert.equal(authorization.prepared_package_eligible, true);
    assert.equal(authorization.prepared_authorization_ref, PREPARED_AUTHORIZATION_V19_REF);
    return;
  }

  assert.equal(authorization.create_job_authorized, false);
  assert.equal(authorization.capability_enable_authorized, false);
  assert.ok(
    authorization.prepared_package_hash === null
      || authorization.prepared_package_hash === packageHash,
    'Workload profile already projects a different revision-19 package.',
  );
  assert.ok(
    authorization.prepared_authorization_ref === null
      || authorization.prepared_authorization_ref === PREPARED_AUTHORIZATION_V19_REF,
    'Workload profile already projects a different revision-19 manifest.',
  );

  const nextProfile: WorkloadProfile = {
    ...profile,
    authorization: {
      ...authorization,
      prepared_package_hash: packageHash,
      prepared_package_eligible: true,
      prepared_authorization_ref: PREPARED_AUTHORIZATION_V19_REF,
      authorization_status: 'prepared_awaiting_exact_authorization',
      create_job_authorized: false,
      capability_enable_authorized: false,
    },
  };
  const nextSerialized = `${JSON.stringify(nextProfile, null, 2)}\n`;
  if (nextSerialized === currentSerialized) return;

  const temporaryPath = `${WORKLOAD_PROFILE_PATH}.tmp-${process.pid}`;
  try {
    await fs.writeFile(temporaryPath, nextSerialized, { encoding: 'utf8', flag: 'wx' });
    await fs.rename(temporaryPath, WORKLOAD_PROFILE_PATH);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
}

function exactCellInput(
  cell: PaperImplementationExperimentWorkOrderRevisionCellV2,
): PaperImplementationExperimentV2ExactCellInput {
  return {
    cell_key: cell.cell_key,
    seed: cell.seed,
    repeat_index: cell.repeat_index,
    parameters: structuredClone(cell.parameters),
    required_result_contract: structuredClone(cell.required_result_contract),
  };
}

function mapTaskSpec(row: {
  id: string;
  materializationKey: string;
  runRecipeId: string;
  externalPiWorkOrderRevisionId: string;
  externalPiWorkOrderRevisionHash: string;
  externalPiWorkOrderCellId: string;
  externalPiWorkOrderCellHash: string;
  taskSpecSnapshotJson: unknown;
  taskSpecHash: string;
  createdAt: Date;
}): ExperimentFoundationExecutableTrainingTaskSpecV2 {
  const snapshot = row.taskSpecSnapshotJson as StoredTaskSnapshot;
  assert.equal(snapshot.schema_version, 'v2');
  return {
    training_task_spec_id: row.id,
    materialization_key: row.materializationKey,
    run_recipe_id: row.runRecipeId,
    external_pi_work_order_revision_id: row.externalPiWorkOrderRevisionId,
    external_pi_work_order_revision_hash: row.externalPiWorkOrderRevisionHash,
    external_pi_cell_id: row.externalPiWorkOrderCellId,
    external_pi_cell_hash: row.externalPiWorkOrderCellHash,
    execution_bundle: snapshot.execution_bundle,
    command_snapshot: snapshot.command_snapshot,
    io_snapshot: snapshot.io_snapshot,
    resource_snapshot: snapshot.resource_snapshot,
    retry_snapshot: snapshot.retry_snapshot,
    task_spec_hash: row.taskSpecHash,
    created_at: row.createdAt.toISOString(),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({
      status: 'failed',
      reason: stableFailureCode(error, 'T136_P5_PREPARE_PACKAGE_FAILED'),
    })}\n`);
    process.exitCode = 1;
  });
}

function stableFailureCode(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  return /^(T136_P5_[A-Z0-9_]+)/.exec(error.message)?.[1] ?? fallback;
}
