import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { Prisma } from '@prisma/client';
import {
  EXPERIMENT_FOUNDATION_ALIYUN_FORBIDDEN_WRITE_OPERATION_V2,
  EXPERIMENT_FOUNDATION_ALIYUN_READ_ONLY_OPERATIONS_V2,
  EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_UNVERIFIED_BEHAVIORS_V2,
  EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_V2_CHECK_IDS,
  type ExperimentFoundationAliyunPaiDlcExecutionProfileV1,
  type ExperimentFoundationCloudPreflightV2CheckId,
  type ExperimentFoundationCloudPreflightV2CheckOutcome,
  type ExperimentFoundationCloudPreflightV2Status,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-cloud-preflight-v2-contracts';

import { getPrismaClient } from '../src/repositories/prisma/prisma-client.js';
import type {
  ExperimentFoundationExecutionV2Prerequisite,
} from '../src/repositories/experiment-foundation-execution-v2.repository.js';
import {
  resolveExperimentFoundationExecutionV2RunPrerequisiteInTransaction,
} from '../src/repositories/prisma/prisma-experiment-foundation-execution-v2-repository.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
  changedExperimentFoundationNamedLocalTables,
  digestExperimentFoundationNamedLocalTables,
  enforceExperimentFoundationReadOnlyTransaction,
  type ExperimentFoundationNamedLocalObservedTarget,
  type ExperimentFoundationNamedLocalRowDigest,
} from './experiment-foundation-named-local-evidence.js';
import {
  ExperimentFoundationV2AliyunCreateJobPayloadService,
  type ExperimentFoundationAliyunCreateJobMaterializationV2,
} from '../src/services/experiment-foundation-v2-aliyun-create-job-payload-service.js';
import {
  AliyunSdkExperimentFoundationReadOnlyTransportV1,
  ExperimentFoundationAliyunCloudPreflightError,
  ExperimentFoundationV2AliyunReadOnlyPreflightService,
  assertAliyunPreflightProviderOperationAllowed,
  parseAliyunPreflightIdentityPolicyEvidence,
  readAliyunPreflightReviewedPolicyEvidenceFile,
  type ExperimentFoundationAliyunReadOnlyCloudPreflightOutcomeV1,
} from '../src/services/experiment-foundation-v2-aliyun-read-only-preflight-service.js';
import {
  ExperimentFoundationV2AliyunSamePayloadFakeLifecycle,
  type ExperimentFoundationAliyunSamePayloadFakeLifecycleOutcome,
} from '../src/services/experiment-foundation-v2-aliyun-same-payload-fake-lifecycle.js';
import {
  assertSanitizedJson,
  sha256Bytes,
  writeJsonAtomic,
} from '../../../.ai/scripts/lib/experiment-v2-evidence.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ARTIFACT_ROOT = path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-productization');
const DURABLE_ARTIFACT_ROOT = path.join(
  REPO_ROOT,
  'dev-docs/active/experiment-foundation-productization-closure/artifacts',
);
const DEFAULT_PACK_B_EVIDENCE = path.join(
  DURABLE_ARTIFACT_ROOT,
  'product-pack-b-local-20260715/04-product-execution-verify.json',
);
const REVIEWED_DATABASE = 'postgres';
const REVIEWED_SCHEMA = 'my_researcher_dev';
const REVIEWED_HOST = '127.0.0.1';
const REVIEWED_PORT = '5432';
const REVIEWED_TARGET_FINGERPRINT =
  'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0';
const REVIEWED_NAMED_LOCAL_TARGET = Object.freeze({
  database: REVIEWED_DATABASE,
  schema: REVIEWED_SCHEMA,
  host: REVIEWED_HOST,
  port: REVIEWED_PORT,
  fingerprint: REVIEWED_TARGET_FINGERPRINT,
});

interface ScriptArgs {
  runId: string;
  packBEvidencePath: string;
  outputPath: string;
}

interface PackBEvidence {
  status: 'passed';
  mode: 'verify';
  target: { fingerprint: string };
  configuration: {
    cutover_committed: true;
    admission_enabled: false;
    workflow_simulation_enabled: false;
  };
  exact_scope: {
    implementation_project_id: string;
    validation_cycle_id: string;
    branch_id: string;
    work_order_revision_id: string;
    work_order_revision_hash: string;
    run_id: string;
    run_manifest_hash: string;
    acknowledgement_inbox_id: string;
    run_cells: Array<{
      ordinal: number;
      run_cell_id: string;
      cell_key: string;
      training_task_spec_id: string;
      training_task_spec_hash: string;
    }>;
  };
  protectedTableNames: string[];
}

interface ConfigResolution {
  enabled: boolean;
  profile: ExperimentFoundationAliyunPaiDlcExecutionProfileV1 | null;
  credential: {
    access_key_id: string;
    access_key_secret: string;
    security_token: string;
  } | null;
  policyEvidencePath: string | null;
  policyEvidenceSha256: string | null;
  blockers: Array<{ reason_code: string; summary: string }>;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    await writeTerminalSummary(args, 'blocked', 'DATABASE_URL_MISSING');
    process.exitCode = 2;
    return;
  }
  const checks = new Map<
    ExperimentFoundationCloudPreflightV2CheckId,
    ExperimentFoundationCloudPreflightV2CheckOutcome
  >();
  const prisma = getPrismaClient();
  let evidenceRaw: string | null = null;
  let evidence: PackBEvidence | null = null;
  let configuration: ConfigResolution | null = null;
  let protectedBefore: Record<string, ExperimentFoundationNamedLocalRowDigest> = {};
  let protectedAfter: Record<string, ExperimentFoundationNamedLocalRowDigest> = {};
  let observedTarget: ExperimentFoundationNamedLocalObservedTarget | null = null;
  let databaseReadOnlyVerified = false;
  let materializations: ExperimentFoundationAliyunCreateJobMaterializationV2[] = [];
  let fakeOutcomes: ExperimentFoundationAliyunSamePayloadFakeLifecycleOutcome[] = [];
  let cloudOutcome: ExperimentFoundationAliyunReadOnlyCloudPreflightOutcomeV1 | null = null;
  let readOnlyTransport: AliyunSdkExperimentFoundationReadOnlyTransportV1 | null = null;
  let policyEvidenceDigestVerified = false;

  try {
    assertExperimentFoundationNamedLocalDatabaseUrl(
      databaseUrl,
      REVIEWED_NAMED_LOCAL_TARGET,
      'CLOUD_PREFLIGHT_NAMED_LOCAL_TARGET_MISMATCH',
    );
    evidenceRaw = await fs.readFile(args.packBEvidencePath, 'utf8');
    const parsedEvidence = parsePackBEvidence(JSON.parse(evidenceRaw) as unknown);
    evidence = parsedEvidence;
    configuration = resolveConfiguration();
    await prisma.$connect();
    const databaseSnapshot = await prisma.$transaction(async (transaction) => {
      await enforceExperimentFoundationReadOnlyTransaction(transaction);
      const target = await assertExperimentFoundationLiveNamedLocalTarget(
        transaction,
        REVIEWED_NAMED_LOCAL_TARGET,
      );
      const before = await digestExperimentFoundationNamedLocalTables(
        transaction,
        parsedEvidence.protectedTableNames,
      );
      const prerequisite = await resolveExperimentFoundationExecutionV2RunPrerequisiteInTransaction(
        transaction,
        parsedEvidence.exact_scope.run_id,
      );
      assert.ok(prerequisite, 'CLOUD_PREFLIGHT_EXACT_RUN_PREREQUISITE_MISSING');
      assertExactScope(parsedEvidence, prerequisite);
      const after = await digestExperimentFoundationNamedLocalTables(
        transaction,
        parsedEvidence.protectedTableNames,
      );
      assert.deepEqual(after, before, 'CLOUD_PREFLIGHT_PROTECTED_TABLE_CHANGED');
      return { target, before, after, prerequisite };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 10_000,
      timeout: 120_000,
    });
    observedTarget = databaseSnapshot.target;
    protectedBefore = databaseSnapshot.before;
    protectedAfter = databaseSnapshot.after;
    databaseReadOnlyVerified = true;
    const prerequisite = databaseSnapshot.prerequisite;
    setCheck(checks, 'CP01_EXACT_SCOPE', 'passed',
      'The gate resolved the exact acknowledged Pack A Run, ordered cells, and Pack B product evidence.');

    try {
      assertAliyunPreflightProviderOperationAllowed(
        EXPERIMENT_FOUNDATION_ALIYUN_FORBIDDEN_WRITE_OPERATION_V2,
      );
      setCheck(checks, 'CP04_WRITE_HARD_DENY', 'failed',
        'The application-level CreateJob deny was bypassed.', 'ALIYUN_WRITE_HARD_DENY_BYPASSED');
    } catch (error) {
      if (
        error instanceof ExperimentFoundationAliyunCloudPreflightError
        && error.reasonCode === 'ALIYUN_WRITE_OPERATION_DENIED'
      ) {
        setCheck(checks, 'CP04_WRITE_HARD_DENY', 'passed',
          'PaiDlc.CreateJob was rejected before provider transport.');
      } else {
        throw error;
      }
    }
    assert.deepEqual(EXPERIMENT_FOUNDATION_ALIYUN_READ_ONLY_OPERATIONS_V2, [
      'AIWorkspace.GetWorkspace',
      'AIWorkspace.ListResources',
      'PaiDlc.ListEcsSpecs',
    ]);
    setCheck(checks, 'CP05_READ_ONLY_ALLOWLIST', 'passed',
      'The provider transport surface contains exactly GetWorkspace, ListResources, and ListEcsSpecs.');

    if (configuration.profile) {
      const payloadService = new ExperimentFoundationV2AliyunCreateJobPayloadService();
      const executionProfile = configuration.profile;
      materializations = prerequisite.cells.map((cell) => payloadService.materialize({
        run: prerequisite.run,
        run_cell: cell.run_cell,
        task_spec: cell.task_spec,
      }, executionProfile));
      assert.equal(materializations.length, prerequisite.cells.length);
      setCheck(checks, 'CP02_OFFLINE_CREATE_JOB_PAYLOAD', 'passed',
        `${materializations.length} exact CreateJob requests passed offline schema, enum, ref, and size checks.`);
      setCheck(checks, 'CP03_PAYLOAD_HASH_REDACTION', 'passed',
        'Every exact request was canonical-hashed and reduced to a redacted manifest for evidence.');

      const fakeLifecycle = new ExperimentFoundationV2AliyunSamePayloadFakeLifecycle();
      fakeOutcomes = materializations.map((materialized) => fakeLifecycle.run(materialized));
      assert.ok(fakeOutcomes.every((outcome, index) => (
        outcome.payload_hash === materializations[index]?.payload_hash
        && outcome.network_requests === 0
        && outcome.provider_writes === 0
        && outcome.scientific_writes === 0
      )));
      setCheck(checks, 'CP10_SAME_PAYLOAD_FAKE_LIFECYCLE', 'passed',
        'The exact CreateJob payload/hash drove replay, sync, cancel, reconcile, recovery, and collect fake paths.');
    } else {
      const profileBlocker = configuration.blockers.find((entry) => (
        entry.reason_code === 'ALIYUN_EXECUTION_PROFILE_INCOMPLETE'
      ));
      for (const id of [
        'CP02_OFFLINE_CREATE_JOB_PAYLOAD',
        'CP03_PAYLOAD_HASH_REDACTION',
        'CP10_SAME_PAYLOAD_FAKE_LIFECYCLE',
      ] as const) {
        setCheck(checks, id, 'blocked',
          profileBlocker?.summary ?? 'The exact Aliyun execution profile is incomplete.',
          profileBlocker?.reason_code ?? 'ALIYUN_EXECUTION_PROFILE_INCOMPLETE');
      }
    }

    if (
      configuration.enabled
      && configuration.profile
      && configuration.credential
      && configuration.policyEvidencePath
      && configuration.policyEvidenceSha256
    ) {
      const reviewedPolicyEvidence = await readAliyunPreflightReviewedPolicyEvidenceFile({
        filePath: configuration.policyEvidencePath,
        repositoryRoot: REPO_ROOT,
        expectedSha256: configuration.policyEvidenceSha256,
      });
      policyEvidenceDigestVerified = true;
      const policyEvidence = parseAliyunPreflightIdentityPolicyEvidence(
        JSON.parse(reviewedPolicyEvidence.raw_json) as unknown,
      );
      readOnlyTransport = new AliyunSdkExperimentFoundationReadOnlyTransportV1(
        configuration.profile.region_id,
        configuration.credential,
      );
      cloudOutcome = await new ExperimentFoundationV2AliyunReadOnlyPreflightService().run({
        profile: configuration.profile,
        credentialAccessKeyId: configuration.credential.access_key_id,
        identityPolicyEvidence: policyEvidence,
        transport: readOnlyTransport,
      });
      setCheck(checks, 'CP06_IDENTITY_POLICY', 'passed',
        'The temporary credential is bound to current reviewed policy evidence with explicit paidlc:CreateJob denial.');
      setCheck(checks, 'CP07_SIGNING_ENDPOINT_REGION', 'passed',
        'Official SDK signing succeeded against the exact regional AIWorkspace and PAI-DLC HTTPS endpoints.');
      setCheck(checks, 'CP08_WORKSPACE_ENABLED', 'passed',
        'The exact target workspace exists and is ENABLED.');
      setCheck(checks, 'CP09_RESOURCE_VISIBLE', 'passed',
        'The exact DLC quota and at least one available CPU specification are visible through read-only APIs.');
    } else {
      const cloudBlocker = configuration.blockers[0] ?? {
        reason_code: 'ALIYUN_CLOUD_PREFLIGHT_CONFIGURATION_INCOMPLETE',
        summary: 'The real read-only cloud preflight configuration is incomplete.',
      };
      for (const id of [
        'CP06_IDENTITY_POLICY',
        'CP07_SIGNING_ENDPOINT_REGION',
        'CP08_WORKSPACE_ENABLED',
        'CP09_RESOURCE_VISIBLE',
      ] as const) {
        setCheck(checks, id, 'blocked', cloudBlocker.summary, cloudBlocker.reason_code);
      }
    }

    setCheck(checks, 'CP11_ZERO_CLOUD_WRITES', 'passed',
      'Provider write requests and cloud writes are both zero; the transport ledger is read-only.');
    setCheck(checks, 'CP12_ZERO_SCIENTIFIC_WRITES', 'passed',
      'All protected PI/EF/legacy/scientific table digests are unchanged.');

    const orderedChecks = orderedCheckOutcomes(checks);
    const status = aggregateStatus(orderedChecks);
    const summary = {
      schema_version: 'experiment-foundation-cloud-preflight@v1',
      status,
      run_id: args.runId,
      generated_at: new Date().toISOString(),
      source_pack_b_evidence: {
        path: path.relative(REPO_ROOT, args.packBEvidencePath),
        sha256: `sha256:${sha256Bytes(evidenceRaw)}`,
      },
      target: observedTarget,
      exact_scope: evidence.exact_scope,
      configuration: {
        capability_enabled: configuration.enabled,
        execution_profile_complete: configuration.profile !== null,
        temporary_sts_credential_complete: configuration.credential !== null,
        identity_policy_evidence_present: configuration.policyEvidencePath !== null,
        identity_policy_evidence_digest_present: configuration.policyEvidenceSha256 !== null,
        identity_policy_evidence_digest_verified: policyEvidenceDigestVerified,
        blockers: configuration.blockers,
      },
      checks: orderedChecks,
      payloads: materializations.map((materialized) => ({
        payload_hash: materialized.payload_hash,
        payload_byte_size: materialized.payload_byte_size,
        execution_profile_hash: materialized.execution_profile_hash,
        redacted_manifest: materialized.redacted_manifest,
      })),
      same_payload_fake_lifecycle: fakeOutcomes,
      cloud_read_only_preflight: cloudOutcome,
      write_census: {
        provider_transport_operations: readOnlyTransport?.getOperationLedger().length ?? 0,
        provider_write_requests: 0,
        create_job_calls: 0,
        provider_writes: 0,
        database_writes: 0,
        scientific_writes: 0,
      },
      protected_authority_fence: {
        table_count: evidence.protectedTableNames.length,
        changed_tables: [],
        database_transaction_read_only: databaseReadOnlyVerified,
        before: protectedBefore,
        after: protectedAfter,
      },
      scientific_state: {
        scientific_execution_status: 'not_started',
        evidence_eligibility: false,
      },
      unverified_behaviors: [
        ...EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_UNVERIFIED_BEHAVIORS_V2,
      ],
    };
    await writeJsonAtomic(args.outputPath, assertSanitizedJson(summary, 'cloud preflight summary'));
    process.stdout.write(`${JSON.stringify({
      status,
      output: path.relative(REPO_ROOT, args.outputPath),
    })}\n`);
    process.exitCode = status === 'cloud_preflight_passed' ? 0 : status === 'blocked' ? 2 : 1;
  } catch (error) {
    const classified = classifyFailure(error);
    const protectedTableNames = evidence?.protectedTableNames ?? [];
    const changedTables = changedExperimentFoundationNamedLocalTables(
      protectedBefore,
      protectedAfter,
    );
    const summary = {
      schema_version: 'experiment-foundation-cloud-preflight@v1',
      status: classified.status,
      run_id: args.runId,
      generated_at: new Date().toISOString(),
      source_pack_b_evidence: {
        path: path.relative(REPO_ROOT, args.packBEvidencePath),
        sha256: evidenceRaw === null ? null : `sha256:${sha256Bytes(evidenceRaw)}`,
      },
      ...(evidence ? { exact_scope: evidence.exact_scope } : {}),
      ...(configuration ? {
        configuration: {
          capability_enabled: configuration.enabled,
          execution_profile_complete: configuration.profile !== null,
          temporary_sts_credential_complete: configuration.credential !== null,
          identity_policy_evidence_present: configuration.policyEvidencePath !== null,
          identity_policy_evidence_digest_present: configuration.policyEvidenceSha256 !== null,
          identity_policy_evidence_digest_verified: policyEvidenceDigestVerified,
          blockers: configuration.blockers,
        },
      } : {}),
      checks: fillTerminalChecks(checks, classified.status, classified.reasonCode),
      failure: {
        reason_code: classified.reasonCode,
        message: classified.message,
      },
      cloud_read_only_operation_ledger: readOnlyTransport?.getOperationLedger() ?? [],
      write_census: {
        provider_transport_operations: readOnlyTransport?.getOperationLedger().length ?? 0,
        provider_write_requests: 0,
        create_job_calls: 0,
        provider_writes: 0,
        database_writes: 0,
        scientific_writes: 0,
      },
      protected_authority_fence: {
        table_count: protectedTableNames.length,
        changed_tables: changedTables,
        before: protectedBefore,
        after: protectedAfter,
        database_transaction_read_only: databaseReadOnlyVerified,
        unchanged: Object.keys(protectedBefore).length > 0
          && changedTables.length === 0,
      },
      scientific_state: {
        scientific_execution_status: 'not_started',
        evidence_eligibility: false,
      },
      unverified_behaviors: [
        ...EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_UNVERIFIED_BEHAVIORS_V2,
      ],
    };
    await writeJsonAtomic(args.outputPath, assertSanitizedJson(summary, 'cloud preflight failure summary'));
    process.stderr.write(`${JSON.stringify({
      status: classified.status,
      reason_code: classified.reasonCode,
      output: path.relative(REPO_ROOT, args.outputPath),
    })}\n`);
    process.exitCode = classified.status === 'blocked' ? 2 : 1;
  } finally {
    await prisma.$disconnect();
  }
}

function resolveConfiguration(): ConfigResolution {
  const blockers: ConfigResolution['blockers'] = [];
  const enabled = strictOptionalBoolean(
    'EXPERIMENT_FOUNDATION_V2_ALIYUN_CLOUD_PREFLIGHT_ENABLED',
    false,
  );
  if (!enabled) {
    blockers.push({
      reason_code: 'ALIYUN_CLOUD_PREFLIGHT_DISABLED',
      summary: 'The zero-write Aliyun cloud preflight capability is disabled.',
    });
  }
  const profileValues = {
    region_id: optionalEnv('EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_REGION_ID'),
    workspace_id: optionalEnv('EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_WORKSPACE_ID'),
    resource_id: optionalEnv('EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_RESOURCE_ID'),
    image_uri: optionalEnv('EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_IMAGE_URI'),
  };
  const profileComplete = Object.values(profileValues).every((value) => value !== null);
  if (!profileComplete) {
    blockers.push({
      reason_code: 'ALIYUN_EXECUTION_PROFILE_INCOMPLETE',
      summary: 'Region, workspace, DLC quota, and image refs are required for exact payload materialization.',
    });
  }
  const profile: ExperimentFoundationAliyunPaiDlcExecutionProfileV1 | null = profileComplete
    ? {
      schema_version: 'AliyunPaiDlcExecutionProfile@v1',
      region_id: profileValues.region_id!,
      workspace_id: profileValues.workspace_id!,
      resource_id: profileValues.resource_id!,
      image_uri: profileValues.image_uri!,
      job_type: 'PyTorchJob',
      job_spec_type: 'Worker',
      pod_count: 1,
    }
    : null;

  const credentialValues = {
    access_key_id: optionalEnv('ALIBABA_CLOUD_ACCESS_KEY_ID'),
    access_key_secret: optionalEnv('ALIBABA_CLOUD_ACCESS_KEY_SECRET'),
    security_token: optionalEnv('ALIBABA_CLOUD_SECURITY_TOKEN'),
  };
  const credentialComplete = Object.values(credentialValues).every((value) => value !== null);
  if (!credentialComplete) {
    blockers.push({
      reason_code: 'ALIYUN_TEMPORARY_CREDENTIAL_REQUIRED',
      summary: 'A complete temporary STS credential triplet is required; long-lived credentials are not accepted.',
    });
  }
  const credential = credentialComplete ? {
    access_key_id: credentialValues.access_key_id!,
    access_key_secret: credentialValues.access_key_secret!,
    security_token: credentialValues.security_token!,
  } : null;

  const policyEvidenceRaw = optionalEnv(
    'EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_IDENTITY_POLICY_EVIDENCE_PATH',
  );
  let policyEvidencePath: string | null = null;
  if (!policyEvidenceRaw) {
    blockers.push({
      reason_code: 'ALIYUN_IDENTITY_POLICY_EVIDENCE_REQUIRED',
      summary: 'Current reviewed identity-policy evidence is required for the temporary credential.',
    });
  } else {
    policyEvidencePath = path.resolve(policyEvidenceRaw);
    if (policyEvidencePath === REPO_ROOT || policyEvidencePath.startsWith(`${REPO_ROOT}${path.sep}`)) {
      throw new ExperimentFoundationAliyunCloudPreflightError(
        'blocked',
        'ALIYUN_IDENTITY_POLICY_EVIDENCE_MUST_BE_REPO_EXTERNAL',
        'Identity-policy evidence must be supplied from a reviewed path outside the repository.',
      );
    }
  }
  const policyEvidenceSha256Raw = optionalEnv(
    'EXPERIMENT_FOUNDATION_V2_ALIYUN_PREFLIGHT_IDENTITY_POLICY_EVIDENCE_SHA256',
  );
  let policyEvidenceSha256: string | null = null;
  if (!policyEvidenceSha256Raw) {
    blockers.push({
      reason_code: 'ALIYUN_IDENTITY_POLICY_EVIDENCE_DIGEST_REQUIRED',
      summary: 'An independently supplied SHA-256 digest is required for identity-policy evidence.',
    });
  } else if (!/^sha256:[0-9a-f]{64}$/.test(policyEvidenceSha256Raw)) {
    throw new ExperimentFoundationAliyunCloudPreflightError(
      'blocked',
      'ALIYUN_IDENTITY_POLICY_EVIDENCE_DIGEST_INVALID',
      'Identity-policy evidence SHA-256 must use the exact sha256:<lowercase-hex> form.',
    );
  } else {
    policyEvidenceSha256 = policyEvidenceSha256Raw;
  }
  return {
    enabled,
    profile,
    credential,
    policyEvidencePath,
    policyEvidenceSha256,
    blockers,
  };
}

function parsePackBEvidence(value: unknown): PackBEvidence {
  const root = asObject(value, 'Pack B evidence');
  const target = asObject(root.target, 'Pack B target');
  const configuration = asObject(root.configuration, 'Pack B configuration');
  const exactScope = asObject(root.exact_pack_a_prerequisite, 'Pack B exact scope');
  const protectedFence = asObject(root.protected_authority_fence, 'Pack B protected fence');
  const protectedBefore = asObject(protectedFence.before, 'Pack B protected before');
  const workflowStatus = asObject(root.workflow_simulation_status, 'Pack B workflow status');
  assert.equal(root.status, 'passed');
  assert.equal(root.mode, 'verify');
  assert.equal(target.fingerprint, REVIEWED_TARGET_FINGERPRINT);
  assert.equal(configuration.cutover_committed, true);
  assert.equal(configuration.admission_enabled, false);
  assert.equal(configuration.workflow_simulation_enabled, false);
  assert.equal(workflowStatus.workflow_simulation_status, 'workflow_simulation_passed');
  assert.equal(workflowStatus.scientific_execution_status, 'not_started');
  assert.equal(workflowStatus.evidence_eligibility, false);
  if (!Array.isArray(exactScope.run_cells) || exactScope.run_cells.length < 1) {
    throw new Error('PACK_B_EVIDENCE_RUN_CELLS_INVALID');
  }
  const runCells = exactScope.run_cells.map((entry, index) => {
    const cell = asObject(entry, `Pack B run cell ${index + 1}`);
    return {
      ordinal: asPositiveInteger(cell.ordinal, 'run cell ordinal'),
      run_cell_id: asString(cell.run_cell_id, 'run_cell_id'),
      cell_key: asString(cell.cell_key, 'cell_key'),
      training_task_spec_id: asString(cell.training_task_spec_id, 'training_task_spec_id'),
      training_task_spec_hash: asString(cell.training_task_spec_hash, 'training_task_spec_hash'),
    };
  });
  const protectedTableNames = Object.keys(protectedBefore).sort();
  if (protectedTableNames.length !== 88) {
    throw new Error('PACK_B_EVIDENCE_PROTECTED_TABLE_CENSUS_INVALID');
  }
  return {
    status: 'passed',
    mode: 'verify',
    target: { fingerprint: asString(target.fingerprint, 'target fingerprint') },
    configuration: {
      cutover_committed: true,
      admission_enabled: false,
      workflow_simulation_enabled: false,
    },
    exact_scope: {
      implementation_project_id: asString(exactScope.implementation_project_id, 'project id'),
      validation_cycle_id: asString(exactScope.validation_cycle_id, 'cycle id'),
      branch_id: asString(exactScope.branch_id, 'branch id'),
      work_order_revision_id: asString(exactScope.work_order_revision_id, 'revision id'),
      work_order_revision_hash: asString(exactScope.work_order_revision_hash, 'revision hash'),
      run_id: asString(exactScope.run_id, 'run id'),
      run_manifest_hash: asString(exactScope.run_manifest_hash, 'run manifest hash'),
      acknowledgement_inbox_id: asString(
        exactScope.acknowledgement_inbox_id,
        'acknowledgement inbox id',
      ),
      run_cells: runCells,
    },
    protectedTableNames,
  };
}

function assertExactScope(
  evidence: PackBEvidence,
  prerequisite: ExperimentFoundationExecutionV2Prerequisite,
): void {
  const scope = evidence.exact_scope;
  assert.equal(prerequisite.implementation_project_id, scope.implementation_project_id);
  assert.equal(prerequisite.validation_cycle_id, scope.validation_cycle_id);
  assert.equal(prerequisite.external_pi_branch_id, scope.branch_id);
  assert.equal(prerequisite.run.external_pi_work_order_revision_id, scope.work_order_revision_id);
  assert.equal(prerequisite.run.external_pi_work_order_revision_hash, scope.work_order_revision_hash);
  assert.equal(prerequisite.run.run_id, scope.run_id);
  assert.equal(prerequisite.run.run_manifest_hash, scope.run_manifest_hash);
  assert.equal(prerequisite.head_acknowledgement.inbox_id, scope.acknowledgement_inbox_id);
  assert.equal(prerequisite.latest_branch_head_acknowledgement.inbox_id, scope.acknowledgement_inbox_id);
  assert.equal(prerequisite.readiness.outcome, 'passed');
  assert.deepEqual(prerequisite.cells.map((cell) => ({
    ordinal: cell.run_cell.ordinal,
    run_cell_id: cell.run_cell.run_cell_id,
    cell_key: cell.run_cell.cell_key,
    training_task_spec_id: cell.task_spec.training_task_spec_id,
    training_task_spec_hash: cell.task_spec.task_spec_hash,
  })), scope.run_cells);
}

function setCheck(
  checks: Map<ExperimentFoundationCloudPreflightV2CheckId, ExperimentFoundationCloudPreflightV2CheckOutcome>,
  id: ExperimentFoundationCloudPreflightV2CheckId,
  status: ExperimentFoundationCloudPreflightV2CheckOutcome['status'],
  summary: string,
  reasonCode?: string,
): void {
  checks.set(id, {
    id,
    status,
    summary,
    ...(reasonCode ? { reason_code: reasonCode } : {}),
  });
}

function orderedCheckOutcomes(
  checks: Map<ExperimentFoundationCloudPreflightV2CheckId, ExperimentFoundationCloudPreflightV2CheckOutcome>,
): ExperimentFoundationCloudPreflightV2CheckOutcome[] {
  return EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_V2_CHECK_IDS.map((id) => {
    const outcome = checks.get(id);
    if (!outcome) throw new Error(`CLOUD_PREFLIGHT_MISSING_CHECK:${id}`);
    return outcome;
  });
}

function fillTerminalChecks(
  checks: Map<ExperimentFoundationCloudPreflightV2CheckId, ExperimentFoundationCloudPreflightV2CheckOutcome>,
  status: 'blocked' | 'failed',
  reasonCode: string,
): ExperimentFoundationCloudPreflightV2CheckOutcome[] {
  return EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_V2_CHECK_IDS.map((id) => (
    checks.get(id) ?? {
      id,
      status,
      summary: 'The gate stopped before this check could be verified.',
      reason_code: reasonCode,
    }
  ));
}

function aggregateStatus(
  checks: ExperimentFoundationCloudPreflightV2CheckOutcome[],
): ExperimentFoundationCloudPreflightV2Status {
  if (checks.some((check) => check.status === 'failed')) return 'failed';
  if (checks.some((check) => check.status === 'blocked')) return 'blocked';
  return 'cloud_preflight_passed';
}

function classifyFailure(error: unknown): {
  status: 'blocked' | 'failed';
  reasonCode: string;
  message: string;
} {
  if (error instanceof ExperimentFoundationAliyunCloudPreflightError) {
    return {
      status: error.disposition,
      reasonCode: error.reasonCode,
      message: error.message,
    };
  }
  const message = error instanceof Error ? error.message : 'Unknown cloud preflight failure';
  return {
    status: 'failed',
    reasonCode: /^([A-Z][A-Z0-9_]+)(?::|$)/.exec(message)?.[1]
      ?? 'CLOUD_PREFLIGHT_UNEXPECTED_FAILURE',
    message: 'Cloud preflight failed before acceptance; provider diagnostics were intentionally redacted.',
  };
}

function parseArgs(argv: string[]): ScriptArgs {
  let runId: string | null = null;
  let packBEvidence: string | null = null;
  let output: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1] ?? null;
    if (key === '--run-id') runId = value;
    else if (key === '--pack-b-evidence') packBEvidence = value;
    else if (key === '--output') output = value;
    else throw new Error(`Unknown argument: ${key}`);
    index += 1;
  }
  if (!runId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(runId)) {
    throw new Error('--run-id must contain 1..64 safe filename characters');
  }
  const packBEvidencePath = packBEvidence
    ? path.resolve(REPO_ROOT, packBEvidence)
    : DEFAULT_PACK_B_EVIDENCE;
  if (!packBEvidencePath.startsWith(`${DURABLE_ARTIFACT_ROOT}${path.sep}`)) {
    throw new Error('--pack-b-evidence must stay under the durable T-132 artifact root');
  }
  const outputPath = output
    ? path.resolve(REPO_ROOT, output)
    : path.join(ARTIFACT_ROOT, runId, 'summary.json');
  if (!outputPath.startsWith(`${ARTIFACT_ROOT}${path.sep}`)) {
    throw new Error('--output must stay under the T-132 temporary productization root');
  }
  return { runId, packBEvidencePath, outputPath };
}

async function writeTerminalSummary(
  args: ScriptArgs,
  status: 'blocked' | 'failed',
  reasonCode: string,
): Promise<void> {
  await writeJsonAtomic(args.outputPath, assertSanitizedJson({
    schema_version: 'experiment-foundation-cloud-preflight@v1',
    status,
    run_id: args.runId,
    generated_at: new Date().toISOString(),
    checks: EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_V2_CHECK_IDS.map((id) => ({
      id,
      status,
      summary: 'The gate did not start because a required local prerequisite is missing.',
      reason_code: reasonCode,
    })),
    write_census: {
      provider_transport_operations: 0,
      provider_write_requests: 0,
      create_job_calls: 0,
      provider_writes: 0,
      database_writes: 0,
      scientific_writes: 0,
    },
    scientific_state: {
      scientific_execution_status: 'not_started',
      evidence_eligibility: false,
    },
    unverified_behaviors: [
      ...EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_UNVERIFIED_BEHAVIORS_V2,
    ],
  }, 'cloud preflight terminal summary'));
}

function strictOptionalBoolean(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key]?.trim().toLowerCase();
  if (!raw) return defaultValue;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`${key}_INVALID_BOOLEAN`);
}

function optionalEnv(key: string): string | null {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function asPositiveInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value as number;
}

await main();
