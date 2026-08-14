#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { PrismaClient } from '@prisma/client';
import type {
  ExperimentFoundationV2DraftContent,
} from '../src/services/experiment-foundation-v2-service.js';
import type {
  ExperimentFoundationV2AssetType,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import type {
  PaperImplementationExperimentV2AdmissionRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import type {
  CreateValidationCycleDraftRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashExperimentFoundationExecutionBundleRevisionV2,
  type ExperimentV2JsonValue,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import { PrismaExperimentFoundationExecutionBundleV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-execution-bundle-v2-repository.js';
import { PrismaExperimentFoundationSpineV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-spine-v2-repository.js';
import { PrismaExperimentFoundationV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-v2-repository.js';
import { PrismaPaperImplementationExperimentSpineV2Repository } from '../src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.js';
import { PrismaPaperImplementationMotiveRepository } from '../src/repositories/prisma/prisma-paper-implementation-motive-repository.js';
import { PrismaPaperImplementationRepository } from '../src/repositories/prisma/prisma-paper-implementation-repository.js';
import { PrismaPaperImplementationTraceRepository } from '../src/repositories/prisma/prisma-paper-implementation-trace-repository.js';
import { PrismaPaperImplementationValidationCycleClosureV2Repository } from '../src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.js';
import { PrismaPaperImplementationValidationRepository } from '../src/repositories/prisma/prisma-paper-implementation-validation-repository.js';
import type {
  ExperimentFoundationV2AssetIdentityRecord,
} from '../src/repositories/experiment-foundation-v2.repository.js';
import { ExperimentFoundationExecutionBundleV2Service } from '../src/services/experiment-foundation-execution-bundle-v2-service.js';
import { ExperimentFoundationV2AcknowledgementService } from '../src/services/experiment-foundation-v2-acknowledgement-service.js';
import {
  ExperimentFoundationV2MaterializationService,
  type ExperimentFoundationV2ReadinessResolver,
} from '../src/services/experiment-foundation-v2-materialization-service.js';
import { ExperimentFoundationV2Service } from '../src/services/experiment-foundation-v2-service.js';
import { ExperimentV2IntegrationRelayService } from '../src/services/experiment-v2-integration-relay-service.js';
import { PaperImplementationExperimentV2AdmissionService } from '../src/services/paper-implementation-experiment-v2-admission-service.js';
import { PaperImplementationExperimentV2HeadService } from '../src/services/paper-implementation-experiment-v2-head-service.js';
import { PaperImplementationTraceKernelService } from '../src/services/paper-implementation-trace-kernel-service.js';
import { PaperImplementationValidationCyclePlanningService } from '../src/services/paper-implementation-validation-cycle-planning-service.js';
import {
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_HASH_V1,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_VERSION_V1,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_HASH_V1,
} from '../src/services/experiment-foundation-scientific-source-v1-service.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
  changedExperimentFoundationNamedLocalTables,
  countExperimentFoundationNamedLocalTables,
  digestExperimentFoundationNamedLocalTableRowVersions,
  listExperimentFoundationNamedLocalApplicationTables,
} from './experiment-foundation-named-local-evidence.js';

const AUTHORIZATION_ENV = 'T136_P5_STAGE_ONE_APPLY_AUTHORIZATION';
const AUTHORIZATION_VALUE =
  'authorized-2026-08-15-t136-p5-schema-ready-successor-max44-no-cloud';
const MATERIALIZED_AT = '2026-08-14T23:05:00.000Z';
const PROJECT_ID = 'implementation_project_642a1879-1137-40f5-b340-330b66509975';
const SOURCE_CYCLE_ID = 'validation_cycle_t132_m7_l1_p313_v1';
const HISTORICAL_CYCLE_ID = 'validation_cycle_t136_p5_scifact_v1';
const PREVIOUS_CYCLE_ID = 'validation_cycle_t136_p5_scifact_v2';
const CYCLE_ID = 'validation_cycle_t136_p5_scifact_v3';
const INPUT_SNAPSHOT_ID = 'validation_input_snapshot_t136_p5_scifact_v3';
const TRACE_ID = 'trace_manifest_t136_p5_scifact_v3';
const BUNDLE_KEY = 't136-p5-scifact-scientific-v2';
const BUSINESS_KEY = 't136-p5-scifact-two-cell-v3';
const ATTEMPT_ID = 't136-p5-scifact-attempt-16';
const HISTORICAL_METRIC_REVISION_ID =
  'ef_revision_t136_p5_metric_scifact_micro_recall_ppm_v1';
const METRIC_REVISION_ID = 'ef_revision_t136_p5_metric_scifact_micro_recall_ppm_v2';
const HISTORICAL_PROTOCOL_REVISION_ID =
  'ef_revision_t136_p5_protocol_scifact_micro_recall_v1';
const PROTOCOL_REVISION_ID = 'ef_revision_t136_p5_protocol_scifact_micro_recall_v2';
const HISTORICAL_BUNDLE_REVISION_ID =
  'ef_execution_bundle_revision_e87768c5205729b01ff8ceec8a8d0aaa69a15c3b';
const HISTORICAL_RUN_ID = 'ef_run_v2_t136_p5_scifact_v1_1';
const PREVIOUS_RUN_ID = 'ef_run_v2_t136_p5_scifact_v2_1';
const SUCCESSOR_RUN_ID = 'ef_run_v2_t136_p5_scifact_v3_1';
const RECOVERY_MANIFEST =
  '/Users/yurui/Desktop/My-Researcher-Recovery/T-136/t136-p5-recovery-manifest.json';

const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});

const EXPECTED_WRITE_TABLE_DELTAS = Object.freeze({
  PaperImplementationValidationCycleInputSnapshot: 1,
  PaperImplementationValidationCycle: 1,
  PaperImplementationTraceManifest: 1,
  PaperImplementationExperimentWorkOrderBranchV2: 1,
  PaperImplementationExperimentWorkOrderRevisionV2: 1,
  PaperImplementationExperimentWorkOrderRevisionCellV2: 2,
  PaperImplementationExperimentWorkOrderAdmissionV2: 1,
  PaperImplementationExperimentIntegrationOutboxV2: 2,
  PaperImplementationExperimentIntegrationInboxV2: 1,
  ExperimentFoundationIntegrationInboxV2: 2,
  ExperimentFoundationVersionLockV2: 1,
  ExperimentFoundationVersionLockDependencyV2: 23,
  ExperimentFoundationRunRecipeV2: 1,
  ExperimentFoundationTrainingTaskSpecV2: 2,
  ExperimentFoundationRunV2: 1,
  ExperimentFoundationRunCellV2: 2,
  ExperimentFoundationIntegrationOutboxV2: 1,
});
const EXPECTED_TOTAL_DELTA = 44;

const STRUCTURAL_METRICS = [
  metricRef('d19-metric-answer_accuracy', 'revision_a004dfe1-d90b-4f2f-ae97-a298c01945ec', '2a53188ea9fb8ddd80ffae77c78ce7ef02c20aa469f9c5af73aba591f85e1bbc'),
  metricRef('d19-metric-answer_relevancy', 'revision_5746163a-f33c-4e91-aa77-d4aace4ca377', 'd91332b42b5bba03b7cf275428160db972d486fc90ce44bb2a585249099812f6'),
  metricRef('d19-metric-context_precision', 'revision_72b402d0-b4d0-41fd-b270-c45d6fbf492e', '607fb9e8890eb361329b63c493e506e1e97770e1e3742d14547c2a921ab0c404'),
  metricRef('d19-metric-context_recall', 'revision_9d4f44b3-ec6b-476c-9632-d28ff412de35', 'ee54c271224ece7b1a35c78495e117bac061b2123847dd8fbc618b1e160df06a'),
  metricRef('d19-metric-cpu_memory_disk_process_io', 'revision_fa78b4a8-bfb1-43f4-af31-a9c6501e43e9', 'a998138f7671adfdd478f916ed1c0634d474584c3d9b3ee7ad816e52233f1d00'),
  metricRef('d19-metric-embedding_time_ns', 'revision_21079ebb-a5c0-4647-a5f4-65c500195195', '3116299686614de07a48dfbc27efd482b122506650e2c2017ac5f8d4a25f510f'),
  metricRef('d19-metric-factual_correctness', 'revision_66154ba9-5791-40fe-a674-7329dcf83cbf', '391f8cfa0c27f449d2759c256e487dbd414e9394bb872717cddfd14885fd4fd6'),
  metricRef('d19-metric-faithfulness', 'revision_8ae5c7f4-494a-44dc-ae8a-337610130cfc', 'a5df45944d898542f61ebacc489c50234208c60fefe5221257e4d54e69fd86a1'),
  metricRef('d19-metric-generation_time_ns', 'revision_15396edb-1808-444c-8761-bad195cd37c5', '531e82df7f7894f6f3b8997a115ab030bcc67a4aa8dc300d8b365e965f98a5bd'),
  metricRef('d19-metric-gpu_memory_or_dram_bandwidth', 'revision_a077f209-d0cc-4ca2-adcf-44b7b2375496', '1f309a4d5ed018263455372b70efee7468e23fdeac4b3840cba4b88a83c31c7e'),
  metricRef('d19-metric-gpu_utilization', 'revision_757ae516-357b-4ed4-b19f-f07532816878', '61ba91465a1d70f084062ade6cf85fc90c3213293793a1937eded5272acee419'),
  metricRef('d19-metric-llm_context_recall', 'revision_dcbac841-2594-4cda-9cae-61461b34d658', 'b1b97c061cf8857edcfcc22ba50bf20b482676d88dfae4098391d6e0f4bb0684'),
  metricRef('d19-metric-prompt_time_ns', 'revision_58deb200-dfc3-4415-8cc5-818fbea3703f', '9e85a27aab172fa9b278f8fff4337880ac782ffe7e1ce3e4594393ec2cd573c7'),
  metricRef('d19-metric-qps', 'revision_729eefd5-f8ea-4b2d-b106-d11fd0f02af8', 'c00791c3d84961be6e0b1c24a860d6e0e7775d289599d6111f4436a873130b63'),
  metricRef('d19-metric-rerank_time_ns', 'revision_4fa09677-0081-4d09-8ea9-6d4dae970ff5', 'a17019c8b61c0db65a8e1a9ee658333472fcd95ad13d2a0a9a89bfd6fe0c5bbd'),
  metricRef('d19-metric-retrieval_time_ns', 'revision_adda4c16-9167-4e71-9164-e56543aae1f1', '7853142cbf31a8868c509451e73432744a6065bd8c4611c04c1daa2a2ed6cc86'),
] as const;

interface RecoveryManifest {
  schema: string;
  created_at: string;
  target_fingerprint: string;
  recovery_fingerprint: string;
  schema_dump: RecoveryFile;
  authority_data_dump: RecoveryFile;
}

interface RecoveryFile {
  file: string;
  sha256: string;
  byte_size: number;
}

interface AssetSpec {
  asset_type: ExperimentFoundationV2AssetType;
  logical_id: string;
  revision_id: string;
  freeze_key: string;
  draft_content: ExperimentFoundationV2DraftContent;
  location_available: boolean;
}

interface SuccessorAssetSpec extends AssetSpec {
  previous_revision_id: string;
  previous_draft_content: ExperimentFoundationV2DraftContent;
}

async function main(): Promise<void> {
  requireAuthorization(process.env[AUTHORIZATION_ENV]);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T136_P5_STAGE_ONE_TARGET_MISMATCH',
  );
  const recovery = await requireRecoveryPoint();
  const prisma = new PrismaClient();
  const originalFetch = globalThis.fetch;
  let externalFetchCalls = 0;
  globalThis.fetch = (async () => {
    externalFetchCalls += 1;
    throw new Error('T136_P5_STAGE_ONE_EXTERNAL_FETCH_DENIED');
  }) as typeof fetch;
  try {
    await prisma.$connect();
    const target = await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const initialScopeState = await readInitialScopeState(prisma);
    assert.ok(
      initialScopeState === 'missing' || initialScopeState === 'complete',
      'T136 P5 named-local scope is partial; recover before replay',
    );
    const writeTables = Object.keys(EXPECTED_WRITE_TABLE_DELTAS);
    const applicationTables =
      await listExperimentFoundationNamedLocalApplicationTables(prisma, writeTables);
    const protectedTables = applicationTables.filter(
      (table) => !writeTables.includes(table.name),
    );
    const [beforeProtected, beforeCounts, historicalBefore] = await Promise.all([
      digestExperimentFoundationNamedLocalTableRowVersions(prisma, protectedTables),
      countExperimentFoundationNamedLocalTables(prisma, writeTables),
      readHistoricalSentinels(prisma),
    ]);

    const repositories = buildRepositories(prisma);
    const assets = await materializeScientificAssets(repositories.assetRepository);
    const bundle = await materializeExecutionBundle(
      prisma,
      repositories.bundleRepository,
      assets.corpus,
      assets.evaluation_inputs,
    );
    const lineage = await materializeLineage(prisma, repositories, assets, bundle);

    const [afterProtected, afterCounts, historicalAfter] = await Promise.all([
      digestExperimentFoundationNamedLocalTableRowVersions(prisma, protectedTables),
      countExperimentFoundationNamedLocalTables(prisma, writeTables),
      readHistoricalSentinels(prisma),
    ]);
    assert.deepEqual(
      changedExperimentFoundationNamedLocalTables(beforeProtected, afterProtected),
      [],
      'Protected application tables changed',
    );
    assert.deepEqual(historicalAfter, historicalBefore, 'Historical authority changed');
    assert.equal(externalFetchCalls, 0, 'Stage one attempted an external fetch');
    assertExactDeltas(
      beforeCounts,
      afterCounts,
      initialScopeState === 'missing' ? EXPECTED_WRITE_TABLE_DELTAS : {},
    );

    const replay = await materializeLineage(prisma, repositories, assets, bundle);
    const replayCounts = await countExperimentFoundationNamedLocalTables(prisma, writeTables);
    assert.deepEqual(replayCounts, afterCounts, 'Exact replay created additional rows');
    assert.equal(replay.admission.replayed, true);
    assert.equal(replay.run.id, lineage.run.id);
    assert.equal(await readInitialScopeState(prisma), 'complete');
    assert.equal(await countProhibitedScientificRows(prisma, lineage.run.id), 0);

    console.log(JSON.stringify({
      schema_version: 'ScientificEvidenceP5SuccessorAuthorityApply@v1',
      status: 'passed',
      p5_attempt_id: ATTEMPT_ID,
      target,
      recovery: {
        created_at: recovery.created_at,
        target_fingerprint: recovery.target_fingerprint,
        recovery_fingerprint: recovery.recovery_fingerprint,
        files_verified: 2,
      },
      authorization: {
        named_local_apply: true,
        maximum_new_rows: EXPECTED_TOTAL_DELTA,
        cloud_provider_calls: false,
        capability_enable: false,
        create_job: false,
        scientific_result_write: false,
      },
      authority: {
        assets,
        readiness_attestation: lineage.readiness,
        execution_bundle: bundle,
        implementation_project_id: PROJECT_ID,
        validation_cycle_id: CYCLE_ID,
        trace_manifest_id: TRACE_ID,
        branch_id: lineage.admission.branch.branch_id,
        branch_revision_sequence: lineage.admission.revision.revision_sequence,
        work_order_revision: lineage.admission.revision,
        work_order_cells: lineage.admission.cells,
        run: lineage.run,
        run_cells: lineage.runCells,
        training_task_specs: lineage.taskSpecs,
      },
      apply: {
        initial_scope_state: initialScopeState,
        row_deltas: rowDeltas(beforeCounts, afterCounts),
        new_rows: totalDelta(beforeCounts, afterCounts),
        protected_table_count: protectedTables.length,
        historical_authority_unchanged: true,
        external_fetch_calls: externalFetchCalls,
      },
      replay: {
        admission_replayed: replay.admission.replayed,
        new_rows: 0,
      },
      prohibited_effects: {
        cloud_provider_calls: 0,
        capability_changes: 0,
        create_job_calls: 0,
        provider_payloads: 0,
        execution_attempts: 0,
        experiment_results: 0,
        scientific_validation_reports: 0,
        evidence_candidates: 0,
        run_evidence_units: 0,
      },
    }, null, 2));
  } finally {
    globalThis.fetch = originalFetch;
    await prisma.$disconnect();
  }
}

async function materializeScientificAssets(
  repository: PrismaExperimentFoundationV2Repository,
) {
  const corpusPolicy = await ensureAsset(repository, {
    asset_type: 'DataPolicy',
    logical_id: 't136-p5-policy-scifact-corpus',
    revision_id: 'ef_revision_t136_p5_policy_scifact_corpus_v1',
    freeze_key: 't136-p5-freeze-policy-scifact-corpus-v1',
    location_available: false,
    draft_content: {
      schema_version: 'v1',
      policy_key: 't136-p5-scifact-corpus-odc-by-1.0',
      display_name: 'SciFact corpus abstracts ODC-By policy',
      license_expression: 'ODC-By-1.0',
      access_level: 'open',
      source_terms_uri: 'https://github.com/allenai/scifact/blob/master/LICENSE.md',
      redistribution_allowed: true,
      commercial_use_allowed: true,
      use_constraints: [
        'Preserve attribution required by ODC-By 1.0.',
        'Use only the exact BEIR SciFact corpus bytes bound by the Dataset checksum manifest.',
      ],
    },
  });
  const evaluationPolicy = await ensureAsset(repository, {
    asset_type: 'DataPolicy',
    logical_id: 't136-p5-policy-scifact-evaluation-inputs',
    revision_id: 'ef_revision_t136_p5_policy_scifact_evaluation_inputs_v1',
    freeze_key: 't136-p5-freeze-policy-scifact-evaluation-inputs-v1',
    location_available: false,
    draft_content: {
      schema_version: 'v1',
      policy_key: 't136-p5-scifact-evaluation-inputs-cc-by-4.0',
      display_name: 'SciFact claims and evidence annotations CC BY policy',
      license_expression: 'CC-BY-4.0',
      access_level: 'open',
      source_terms_uri: 'https://github.com/allenai/scifact/blob/master/LICENSE.md',
      redistribution_allowed: true,
      commercial_use_allowed: true,
      use_constraints: [
        'Preserve attribution required by CC BY 4.0.',
        'Treat queries.jsonl and qrels/test.tsv only as benchmark inputs, never imported experimental results.',
      ],
    },
  });
  const corpusPolicyReadiness = await ensurePassedReadiness(
    repository,
    corpusPolicy,
    'ef_readiness_t136_p5_policy_scifact_corpus_v1',
  );
  const evaluationPolicyReadiness = await ensurePassedReadiness(
    repository,
    evaluationPolicy,
    'ef_readiness_t136_p5_policy_scifact_evaluation_inputs_v1',
  );
  const corpus = await ensureAsset(repository, {
    asset_type: 'Dataset',
    logical_id: 't136-p5-dataset-scifact-corpus',
    revision_id: 'ef_revision_t136_p5_dataset_scifact_corpus_v1',
    freeze_key: 't136-p5-freeze-dataset-scifact-corpus-v1',
    location_available: true,
    draft_content: {
      schema_version: 'v1',
      dataset_key: 't136-p5-scifact-corpus',
      display_name: 'BEIR SciFact corpus (exact 5,183 documents)',
      version_label: 'beir-scifact-md5-5f7d1de60b170fc8027bb7898e2efca1',
      dataset_role: 'corpus',
      source_identity: {
        source_name: 'BEIR SciFact',
        source_revision: 'sha256:536e14446a0ba56ed1398ab1055f39fe852686ecad24a6306c80c490fa8e0165',
        source_uri: 'https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip',
      },
      checksum_manifest: {
        manifest_version: 'v1',
        algorithm: 'sha256',
        entries: [{
          path: 'corpus.jsonl',
          byte_size: 8_106_566,
          checksum: 'dec31c8182f3d744c7d2c09423756fd1d17cbef75808db13ba01cc0aab4d1ac6',
        }],
        aggregate_checksum: 'dec31c8182f3d744c7d2c09423756fd1d17cbef75808db13ba01cc0aab4d1ac6',
      },
      split_protocol: {
        protocol_version: 'v1',
        splits: [{ ordinal: 1, split_key: 'corpus', split_role: 'corpus', source_selector: 'corpus.jsonl:*' }],
      },
      data_policy: asTypedRef(corpusPolicy, 'DataPolicy'),
    },
  });
  const evaluationInputs = await ensureAsset(repository, {
    asset_type: 'Dataset',
    logical_id: 't136-p5-dataset-scifact-evaluation-inputs',
    revision_id: 'ef_revision_t136_p5_dataset_scifact_evaluation_inputs_v1',
    freeze_key: 't136-p5-freeze-dataset-scifact-evaluation-inputs-v1',
    location_available: true,
    draft_content: {
      schema_version: 'v1',
      dataset_key: 't136-p5-scifact-evaluation-inputs',
      display_name: 'BEIR SciFact test queries and qrels (exact paired inputs)',
      version_label: 'beir-scifact-md5-5f7d1de60b170fc8027bb7898e2efca1',
      dataset_role: 'query_workload',
      source_identity: {
        source_name: 'BEIR SciFact',
        source_revision: 'sha256:536e14446a0ba56ed1398ab1055f39fe852686ecad24a6306c80c490fa8e0165',
        source_uri: 'https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip',
      },
      checksum_manifest: {
        manifest_version: 'v1',
        algorithm: 'sha256',
        entries: [
          {
            path: 'queries.jsonl',
            byte_size: 56_640,
            checksum: 'f9c63730eafb7e72a9d18dd07a684516956b006096d419b41df0c1eaf8a5c520',
          },
          {
            path: 'test.tsv',
            byte_size: 5_389,
            checksum: '0864bb985e0ca2367ba217977e72004d549054b2b06666ed9d4825ac7c21284c',
          },
        ],
        aggregate_checksum: '81a010818b653592fb880c01cac80913d2cd81a52c56353608915c32021361e6',
      },
      split_protocol: {
        protocol_version: 'v1',
        splits: [{
          ordinal: 1,
          split_key: 'test',
          split_role: 'test',
          source_selector: 'queries.jsonl joined with test.tsv by query-id',
        }],
      },
      data_policy: asTypedRef(evaluationPolicy, 'DataPolicy'),
    },
  });
  const historicalMetricDraft = metricDraft(
    'sha256:75875a4d1b2169d791154a8f2368ef383bca03d771d9a7e3ecda08872c634597',
  );
  const metric = await ensureSuccessorAsset(repository, {
    asset_type: 'MetricDefinition',
    logical_id: 't136-p5-metric-scifact-micro-recall-ppm',
    previous_revision_id: HISTORICAL_METRIC_REVISION_ID,
    previous_draft_content: historicalMetricDraft,
    revision_id: METRIC_REVISION_ID,
    freeze_key: 't136-p5-freeze-metric-scifact-micro-recall-ppm-v2',
    location_available: false,
    draft_content: metricDraft(
      'sha256:7354f4503c3b8b8e0d43d40c47308d59f5dfdd2c5f580258d7da1cc0bc364265',
    ),
  });
  const corpusReadiness = await ensurePassedReadiness(
    repository,
    corpus,
    'ef_readiness_t136_p5_dataset_scifact_corpus_v1',
  );
  const evaluationInputsReadiness = await ensurePassedReadiness(
    repository,
    evaluationInputs,
    'ef_readiness_t136_p5_dataset_scifact_evaluation_inputs_v1',
  );
  const metricReadiness = await ensurePassedReadiness(
    repository,
    metric,
    'ef_readiness_t136_p5_metric_scifact_micro_recall_ppm_v2',
  );
  const benchmark = await ensureAsset(repository, {
    asset_type: 'Benchmark',
    logical_id: 't136-p5-benchmark-scifact-retrieval',
    revision_id: 'ef_revision_t136_p5_benchmark_scifact_retrieval_v1',
    freeze_key: 't136-p5-freeze-benchmark-scifact-retrieval-v1',
    location_available: false,
    draft_content: {
      schema_version: 'v1',
      benchmark_key: 't136-p5-scifact-retrieval',
      display_name: 'SciFact exact two-cell retrieval comparison',
      description: 'Compares top-k 10 against top-k 5 on the exact SciFact test queries and qrels.',
      corpus_dataset: asTypedRef(corpus, 'Dataset'),
      query_workload_dataset: asTypedRef(evaluationInputs, 'Dataset'),
    },
  });
  const benchmarkReadiness = await ensurePassedReadiness(
    repository,
    benchmark,
    'ef_readiness_t136_p5_benchmark_scifact_retrieval_v1',
  );
  const historicalMetric = {
    ...metric,
    revision_id: HISTORICAL_METRIC_REVISION_ID,
    revision_sequence: 1,
    content_hash: 'sha256:f7e29a6cd8a6f6e1649d76343e89d4bf927d0297001ba2aa85b93b169ec506f8',
  };
  const protocol = await ensureSuccessorAsset(repository, {
    asset_type: 'EvaluationProtocol',
    logical_id: 't136-p5-protocol-scifact-micro-recall',
    previous_revision_id: HISTORICAL_PROTOCOL_REVISION_ID,
    previous_draft_content: protocolDraft(
      benchmark,
      asTypedRef(historicalMetric, 'MetricDefinition'),
    ),
    revision_id: PROTOCOL_REVISION_ID,
    freeze_key: 't136-p5-freeze-protocol-scifact-micro-recall-v2',
    location_available: false,
    draft_content: protocolDraft(
      benchmark,
      asTypedRef(metric, 'MetricDefinition'),
    ),
  });
  const readiness = await ensurePassedReadiness(
    repository,
    protocol,
    'ef_readiness_t136_p5_scifact_v2',
  );
  assert.equal(readiness.dependencies.length, 22);
  assert.deepEqual(countByAssetType([
    ...readiness.dependencies.map((row) => row.dependency),
    protocol,
  ]), {
    Benchmark: 1,
    DataPolicy: 2,
    Dataset: 2,
    EvaluationProtocol: 1,
    MetricDefinition: 17,
  });
  return {
    corpus_policy: corpusPolicy,
    evaluation_input_policy: evaluationPolicy,
    corpus,
    evaluation_inputs: evaluationInputs,
    metric,
    benchmark,
    protocol,
    prerequisite_readiness: [
      corpusPolicyReadiness.attestation,
      evaluationPolicyReadiness.attestation,
      corpusReadiness.attestation,
      evaluationInputsReadiness.attestation,
      metricReadiness.attestation,
      benchmarkReadiness.attestation,
    ],
    readiness: readiness.attestation,
    readiness_dependencies: readiness.dependencies.map((row) => row.dependency),
  };
}

async function ensurePassedReadiness(
  repository: PrismaExperimentFoundationV2Repository,
  target: ExperimentFoundationV2ExactAssetRevisionRef,
  readinessId: string,
) {
  const service = new ExperimentFoundationV2Service(repository, {
    now: () => MATERIALIZED_AT,
    idGenerator(kind) {
      if (kind === 'readiness_attestation') return readinessId;
      throw new Error(`Unexpected readiness id request: ${kind}`);
    },
  });
  const readiness = await service.createReadinessAttestation({ target });
  assert.equal(readiness.attestation.readiness_attestation_id, readinessId);
  assert.equal(readiness.attestation.status, 'passed');
  return readiness;
}

async function ensureAsset(
  repository: PrismaExperimentFoundationV2Repository,
  spec: AssetSpec,
): Promise<ExperimentFoundationV2ExactAssetRevisionRef> {
  const idQueue = [spec.revision_id];
  let lifecycleSequence = 0;
  const service = new ExperimentFoundationV2Service(repository, {
    now: () => MATERIALIZED_AT,
    idGenerator(kind) {
      if (kind === 'revision') {
        const id = idQueue.shift();
        if (!id) throw new Error(`Revision id exhausted for ${spec.logical_id}`);
        return id;
      }
      if (kind === 'lifecycle_event') {
        lifecycleSequence += 1;
        return `ef_asset_event_t136_p5_${spec.asset_type.toLowerCase()}_${spec.logical_id}_${lifecycleSequence}`;
      }
      throw new Error(`Unexpected asset id request: ${kind}`);
    },
  });
  const identity = await repository.runInTransaction(
    (unitOfWork) => unitOfWork.findAssetIdentity(spec.asset_type, spec.logical_id),
  );
  if (!identity) {
    await service.createAssetDraft(createAssetInput(spec));
  } else {
    assert.equal(canonical(identityDraft(identity)), canonical(spec.draft_content));
  }
  const frozen = await service.freezeAssetDraft({
    asset_type: spec.asset_type,
    logical_id: spec.logical_id,
    expected_state_version: 1,
    business_idempotency_key: spec.freeze_key,
  });
  assert.equal(frozen.exact_ref.revision_id, spec.revision_id);
  const lifecycle = await repository.runInTransaction(async (unitOfWork) => ({
    events: await unitOfWork.listLifecycleEvents(frozen.exact_ref),
    projection: await unitOfWork.findLifecycleProjection(frozen.exact_ref),
  }));
  const expectedEvents = spec.location_available
    ? ['registered', 'activated', 'location_available'] as const
    : ['registered', 'activated'] as const;
  assert.ok(lifecycle.events.length <= expectedEvents.length);
  for (let index = lifecycle.events.length; index < expectedEvents.length; index += 1) {
    lifecycleSequence = index;
    await service.appendLifecycleEvent({
      asset: frozen.exact_ref,
      expected_projection_state_version: index === 0 ? null : index,
      event_type: expectedEvents[index]!,
      reason_code: `T136_P5_${expectedEvents[index]!.toUpperCase()}`,
    });
  }
  const finalProjection = await repository.runInTransaction(
    (unitOfWork) => unitOfWork.findLifecycleProjection(frozen.exact_ref),
  );
  assert.equal(finalProjection?.lifecycle_status, 'active');
  assert.equal(finalProjection?.location_available, spec.location_available);
  return frozen.exact_ref;
}

async function ensureSuccessorAsset(
  repository: PrismaExperimentFoundationV2Repository,
  spec: SuccessorAssetSpec,
): Promise<ExperimentFoundationV2ExactAssetRevisionRef> {
  let lifecycleSequence = 0;
  const service = new ExperimentFoundationV2Service(repository, {
    now: () => MATERIALIZED_AT,
    idGenerator(kind) {
      if (kind === 'revision') return spec.revision_id;
      if (kind === 'lifecycle_event') {
        lifecycleSequence += 1;
        return `ef_asset_event_t136_p5_successor_${spec.asset_type.toLowerCase()}_${lifecycleSequence}`;
      }
      throw new Error(`Unexpected successor asset id request: ${kind}`);
    },
  });
  let identity = await repository.runInTransaction(
    (unitOfWork) => unitOfWork.findAssetIdentity(spec.asset_type, spec.logical_id),
  );
  assert.ok(identity, `Historical asset identity is missing: ${spec.logical_id}`);
  const currentDraft = identityDraft(identity);
  if (canonical(currentDraft) === canonical(spec.previous_draft_content)) {
    assert.equal(identity.asset.current_revision_id, spec.previous_revision_id);
    identity = await service.updateAssetDraft({
      ...createAssetInput(spec),
      expected_state_version: identity.asset.draft_state_version,
    });
  } else {
    assert.equal(canonical(currentDraft), canonical(spec.draft_content));
  }
  const frozen = await service.freezeAssetDraft({
    asset_type: spec.asset_type,
    logical_id: spec.logical_id,
    expected_state_version: identity.asset.draft_state_version,
    business_idempotency_key: spec.freeze_key,
  });
  assert.equal(frozen.exact_ref.revision_id, spec.revision_id);
  assert.equal(frozen.exact_ref.revision_sequence, 2);
  const lifecycle = await repository.runInTransaction(async (unitOfWork) => ({
    events: await unitOfWork.listLifecycleEvents(frozen.exact_ref),
    projection: await unitOfWork.findLifecycleProjection(frozen.exact_ref),
  }));
  const expectedEvents = ['registered', 'activated'] as const;
  assert.ok(lifecycle.events.length <= expectedEvents.length);
  for (let index = lifecycle.events.length; index < expectedEvents.length; index += 1) {
    lifecycleSequence = index;
    await service.appendLifecycleEvent({
      asset: frozen.exact_ref,
      expected_projection_state_version: index === 0 ? null : index,
      event_type: expectedEvents[index]!,
      reason_code: `T136_P5_SUCCESSOR_${expectedEvents[index]!.toUpperCase()}`,
    });
  }
  const finalProjection = await repository.runInTransaction(
    (unitOfWork) => unitOfWork.findLifecycleProjection(frozen.exact_ref),
  );
  assert.equal(finalProjection?.lifecycle_status, 'active');
  assert.equal(finalProjection?.location_available, false);
  return frozen.exact_ref;
}

function metricDraft(evaluatorVersion: string) {
  return {
    schema_version: 'v1',
    metric_key: 'micro_recall_ppm',
    display_name: 'SciFact positive-judgment micro recall (ppm)',
    direction: 'higher_is_better',
    value_type: 'number',
    unit: 'ppm',
    evaluator_binding: {
      evaluator_key: 't136-p5-scifact-exact-token-retriever',
      evaluator_version: evaluatorVersion,
    },
  } satisfies ExperimentFoundationV2DraftContent;
}

function protocolDraft(
  benchmark: ExperimentFoundationV2ExactAssetRevisionRef,
  metric: ExperimentFoundationV2ExactAssetRevisionRef & { asset_type: 'MetricDefinition' },
) {
  return {
    schema_version: 'v2',
    protocol_key: 't136-p5-scifact-micro-recall-two-cell',
    display_name: 'SciFact top-k 10 versus top-k 5 preregistered comparison',
    benchmark_dependency: asTypedRef(benchmark, 'Benchmark'),
    metric_dependencies: [metric, ...STRUCTURAL_METRICS],
    required_rules: [{
      rule_id: 't136-p5-rule-micro-recall-ppm',
      rule_type: 'metric_contract@v1',
      metric_definition: metric,
      metric_key: 'micro_recall_ppm',
      required_cardinality: 1,
      split_key: 'test',
      value_type: 'number',
      unit: 'ppm',
      finite_required: true,
    }],
    scientific_contract: {
      schema_version: 'ExperimentFoundationScientificProtocol@v1',
      observation_slots: [{
        observation_key: 'scifact_micro_recall_ppm',
        ordinal: 1,
        metric_key: 'micro_recall_ppm',
        split_key: 'test',
        value_type: 'number',
        unit: 'ppm',
        statistic: { kind: 'proportion' },
        uncertainty: { kind: 'none' },
      }],
      artifact_slots: [],
      comparison_rules: [{
        comparison_key: 'top_k_10_minus_top_k_5',
        ordinal: 1,
        left_cell_ordinal: 1,
        right_cell_ordinal: 2,
        observation_key: 'scifact_micro_recall_ppm',
        effect_kind: 'absolute_difference',
        direction: 'higher_is_support',
        support_min: 10_000,
        contradiction_max: -10_000,
        uncertainty_policy: { kind: 'not_required_by_protocol' },
      }],
      primary_comparison_key: 'top_k_10_minus_top_k_5',
      decision_if_positive: 'Qualify the bounded claim that top-k 10 materially improves SciFact micro recall over top-k 5.',
      decision_if_negative: 'Record evidence against the bounded improvement claim and do not promote a positive claim.',
      decision_if_inconclusive: 'Do not promote a directional claim; review the protocol or repeat only under new authorization.',
    },
  } satisfies ExperimentFoundationV2DraftContent;
}

function createAssetInput(spec: AssetSpec) {
  switch (spec.asset_type) {
    case 'DataPolicy': return { asset_type: 'DataPolicy' as const, logical_id: spec.logical_id, draft_content: spec.draft_content as Extract<ExperimentFoundationV2DraftContent, { policy_key: string }> };
    case 'Dataset': return { asset_type: 'Dataset' as const, logical_id: spec.logical_id, draft_content: spec.draft_content as Extract<ExperimentFoundationV2DraftContent, { dataset_key: string }> };
    case 'MetricDefinition': return { asset_type: 'MetricDefinition' as const, logical_id: spec.logical_id, draft_content: spec.draft_content as Extract<ExperimentFoundationV2DraftContent, { metric_key: string }> };
    case 'Benchmark': return { asset_type: 'Benchmark' as const, logical_id: spec.logical_id, draft_content: spec.draft_content as Extract<ExperimentFoundationV2DraftContent, { benchmark_key: string }> };
    case 'EvaluationProtocol': return { asset_type: 'EvaluationProtocol' as const, logical_id: spec.logical_id, draft_content: spec.draft_content as Extract<ExperimentFoundationV2DraftContent, { protocol_key: string }> };
  }
}

async function materializeExecutionBundle(
  prisma: PrismaClient,
  repository: PrismaExperimentFoundationExecutionBundleV2Repository,
  corpus: ExperimentFoundationV2ExactAssetRevisionRef,
  evaluationInputs: ExperimentFoundationV2ExactAssetRevisionRef,
) {
  const content = {
    execution_bundle_schema_version: 'v2' as const,
    code_artifact: {
      artifact_ref: 'oss://pea-m7-canary-6194-202607.oss-cn-shanghai-internal.aliyuncs.com/input/t136-p5/workload/7354f4503c3b8b8e0d43d40c47308d59f5dfdd2c5f580258d7da1cc0bc364265/',
      content_digest: 'sha256:7354f4503c3b8b8e0d43d40c47308d59f5dfdd2c5f580258d7da1cc0bc364265',
      byte_size: 11_063,
    },
    container_image: {
      image_identity_kind: 'provider_managed_asset' as const,
      image_ref: 'dsw-registry-vpc.cn-shanghai.cr.aliyuncs.com/pai/torcheasyrec:1.3.0-pytorch2.12.1-cpu-py311-ubuntu22.04',
      provider_managed_asset: {
        provider: 'aliyun_pai' as const,
        asset_id: 'image-liuxvj7p2qcnflha84',
        region_id: 'cn-shanghai',
        modified_at: '2026-07-02T04:35:35.000Z',
        size_bytes: 3_803_970_629,
        accessibility: 'PUBLIC' as const,
        source_type: 'Import' as const,
        permitted_scope: 'm0_sci_p5_scientific_only' as const,
      },
    },
    dataset_mirrors: [
      {
        ordinal: 1,
        dataset_revision: asTypedRef(corpus, 'Dataset'),
        object_ref: 'oss://pea-m7-canary-6194-202607.oss-cn-shanghai-internal.aliyuncs.com/input/scifact/dec31c8182f3d744c7d2c09423756fd1d17cbef75808db13ba01cc0aab4d1ac6/',
        content_digest: 'sha256:dec31c8182f3d744c7d2c09423756fd1d17cbef75808db13ba01cc0aab4d1ac6',
        byte_size: 8_106_566,
      },
      {
        ordinal: 2,
        dataset_revision: asTypedRef(evaluationInputs, 'Dataset'),
        object_ref: 'oss://pea-m7-canary-6194-202607.oss-cn-shanghai-internal.aliyuncs.com/input/scifact/f9c63730eafb7e72a9d18dd07a684516956b006096d419b41df0c1eaf8a5c520/',
        content_digest: 'sha256:f9c63730eafb7e72a9d18dd07a684516956b006096d419b41df0c1eaf8a5c520',
        byte_size: 56_640,
      },
      {
        ordinal: 3,
        dataset_revision: asTypedRef(evaluationInputs, 'Dataset'),
        object_ref: 'oss://pea-m7-canary-6194-202607.oss-cn-shanghai-internal.aliyuncs.com/input/t136-p5/scifact/0864bb985e0ca2367ba217977e72004d549054b2b06666ed9d4825ac7c21284c/',
        content_digest: 'sha256:0864bb985e0ca2367ba217977e72004d549054b2b06666ed9d4825ac7c21284c',
        byte_size: 5_389,
      },
    ],
    entrypoint: 'python3',
    arguments: ['/mnt/pea-code/entrypoint.py'],
    dependency_lock_digest: 'sha256:64ade8995bb817dc60ff51933ba1cd4b677e47bfc891b10a0895d0da7268f75d',
    output_contract: {
      result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1' as const,
      result_object_name: 'result.json',
      parser_profile_version: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_VERSION_V1,
      parser_profile_hash: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_HASH_V1,
      scientific_result_schema_version: 'ExperimentFoundationScientificResultPayload@v1',
      scientific_result_schema_hash: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_HASH_V1,
    },
  };
  const contentHash = serverHashExperimentFoundationExecutionBundleRevisionV2(content);
  const existing = await repository.findDraftByBundleKey(BUNDLE_KEY);
  if (!existing) {
    const service = new ExperimentFoundationExecutionBundleV2Service({
      repository,
      now: () => MATERIALIZED_AT,
    });
    await service.putDraft({
      bundle_key: BUNDLE_KEY,
      display_name: 'T-136 P5 SciFact corrected scientific execution bundle',
      expected_draft_version: null,
      draft_content: content,
    });
    return service.freezeActiveRevision({ bundle_key: BUNDLE_KEY, expected_draft_version: 1 });
  }
  assert.equal(canonical(existing.draft.draft_content), canonical(content));
  const revisionRow = await prisma.experimentFoundationExecutionBundleRevisionV2.findFirst({
    where: { executionBundleId: existing.identity.execution_bundle_id, contentHash },
  });
  assert.ok(revisionRow);
  const service = new ExperimentFoundationExecutionBundleV2Service({ repository });
  return service.resolveActiveReadyExact({
    execution_bundle_revision_id: revisionRow.id,
    content_hash: contentHash,
  });
}

function buildRepositories(prisma: PrismaClient) {
  const projectRepository = new PrismaPaperImplementationRepository(prisma);
  const motiveRepository = new PrismaPaperImplementationMotiveRepository(prisma);
  const traceRepository = new PrismaPaperImplementationTraceRepository(prisma);
  const validationRepository = new PrismaPaperImplementationValidationRepository(prisma);
  const piRepository = new PrismaPaperImplementationExperimentSpineV2Repository(prisma);
  const efRepository = new PrismaExperimentFoundationSpineV2Repository(prisma);
  const assetRepository = new PrismaExperimentFoundationV2Repository(prisma);
  const bundleRepository = new PrismaExperimentFoundationExecutionBundleV2Repository(prisma);
  const assetService = new ExperimentFoundationV2Service(assetRepository);
  const cycleClosureLookup =
    new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma);
  const ids = deterministicIdFactory('t136_p5_scifact_v3');
  const now = () => MATERIALIZED_AT;
  const traceService = new PaperImplementationTraceKernelService({
    projectRepository,
    traceRepository,
    idFactory: (prefix) => prefix === 'trace_manifest'
      ? TRACE_ID
      : `${prefix}_t136_p5_scifact_v3`,
    now,
  });
  const validationService = new PaperImplementationValidationCyclePlanningService({
    projectRepository,
    motiveRepository,
    traceRepository,
    validationRepository,
    idFactory: (prefix) => prefix === 'validation_input_snapshot'
      ? INPUT_SNAPSHOT_ID
      : `${prefix}_t136_p5_scifact_v3`,
    now,
  });
  const admissionService = new PaperImplementationExperimentV2AdmissionService({
    repository: piRepository,
    scopeReader: {
      async resolveExactScope(implementationProjectId, validationCycleId) {
        const [project, cycle] = await Promise.all([
          projectRepository.findProjectById(implementationProjectId),
          validationRepository.findValidationCycleById(implementationProjectId, validationCycleId),
        ]);
        if (!project || !cycle) return null;
        return {
          implementation_project_id: implementationProjectId,
          validation_cycle_id: validationCycleId,
          implementation_project_lifecycle_status: project.lifecycle_status,
          validation_cycle_lifecycle_status: cycle.lifecycle_status,
        };
      },
    },
    admissionEnabled: () => true,
    cycleClosureLookup,
    serverActorId: 'system',
    idFactory: ids,
    now,
  });
  const bundleService = new ExperimentFoundationExecutionBundleV2Service({
    repository: bundleRepository,
  });
  const readinessResolver: ExperimentFoundationV2ReadinessResolver = {
    async resolvePassedExactReadiness(input) {
      const result = await assetService.revalidateReadiness({
        target: input.target,
        readiness_attestation_id: input.readiness_attestation_id,
        expected_dependencies: input.ordered_dependencies,
      });
      if (
        result.attestation.status !== 'passed'
        || result.attestation.attestation_hash !== input.readiness_attestation_hash
      ) return null;
      return {
        attestation: result.attestation,
        ordered_dependencies: result.dependencies.map((row) => row.dependency),
      };
    },
  };
  const materializationService = new ExperimentFoundationV2MaterializationService({
    repository: efRepository,
    readinessResolver,
    cycleClosureLookup,
    executionBundleResolver: bundleService,
    idFactory: ids,
    now,
  });
  const headService = new PaperImplementationExperimentV2HeadService({
    repository: piRepository,
    cycleClosureLookup,
    idFactory: ids,
    now,
  });
  const acknowledgementService = new ExperimentFoundationV2AcknowledgementService({
    repository: efRepository,
    idFactory: ids,
    now,
  });
  return {
    projectRepository,
    traceRepository,
    validationRepository,
    piRepository,
    efRepository,
    assetRepository,
    bundleRepository,
    traceService,
    validationService,
    admissionService,
    materializationService,
    headService,
    acknowledgementService,
  };
}

async function materializeLineage(
  prisma: PrismaClient,
  repositories: ReturnType<typeof buildRepositories>,
  assets: Awaited<ReturnType<typeof materializeScientificAssets>>,
  bundle: Awaited<ReturnType<typeof materializeExecutionBundle>>,
) {
  const sourceCycle = await repositories.validationRepository.findValidationCycleById(
    PROJECT_ID,
    SOURCE_CYCLE_ID,
  );
  assert.ok(sourceCycle?.trace_manifest_id);
  const sourceTrace = await repositories.traceRepository.findTraceManifestById(
    PROJECT_ID,
    sourceCycle.trace_manifest_id,
  );
  assert.ok(sourceTrace);
  const request = buildCycleRequest(sourceCycle);
  let cycle = await repositories.validationRepository.findValidationCycleById(PROJECT_ID, CYCLE_ID);
  if (!cycle) cycle = await repositories.validationService.createValidationCycleDraft(PROJECT_ID, request);
  assert.equal(canonical(cycle.validation_frame), canonical(request.validation_frame));
  let trace = await repositories.traceRepository.findTraceManifestById(PROJECT_ID, TRACE_ID);
  if (!trace) {
    trace = await repositories.traceService.createTraceManifest(PROJECT_ID, {
      target_ref: {
        ...sourceTrace.target_ref,
        ref_type: 'validation_cycle',
        ref_id: CYCLE_ID,
      },
      lineage: structuredClone(sourceTrace.lineage),
      trace_policy_version_id: sourceTrace.trace_policy_version_id,
      created_by: 'system',
    });
  }
  assert.equal(trace.trace_status, 'complete');
  if (cycle.lifecycle_status === 'proposed') {
    cycle = await repositories.validationService.admitValidationCycle(PROJECT_ID, CYCLE_ID, {
      trace_manifest_id: TRACE_ID,
      confirmation_level: 'human_confirmed',
      confirmed_by: 'human',
      created_by: 'system',
    });
  }
  assert.equal(cycle.lifecycle_status, 'admitted');
  const bundleRef = {
    execution_bundle_id: bundle.revision.execution_bundle_id,
    execution_bundle_revision_id: bundle.revision.execution_bundle_revision_id,
    revision_sequence: bundle.revision.revision_sequence,
    content_hash: bundle.revision.content_hash,
  };
  const workOrderRequest: PaperImplementationExperimentV2AdmissionRequest = {
    branch_key: 'scifact-p5-primary-v3',
    branch_frame: {
      frame_schema_version: 'v1',
      display_name: 'T-136 SciFact P5 schema-ready scientific comparison',
      scientific_intent: 'Measure the preregistered micro-recall difference between top-k 10 and top-k 5 using only fresh provider observations.',
      comparison_role: 'primary',
      parent_branch_key: null,
    },
    work_order_revision: {
      work_order_schema_version: 'v2',
      title: 'T-136 P5 SciFact schema-ready exact two-cell scientific run',
      objective: 'Freeze one post-migration two-cell Run without executing provider jobs; CreateJob remains separately authorized.',
      readiness_attestation_id: assets.readiness.readiness_attestation_id,
      readiness_attestation_hash: assets.readiness.attestation_hash,
      asset_dependencies: [...assets.readiness_dependencies, assets.protocol],
      execution_bundle: bundleRef,
      resource_snapshot: { cpu_cores: 2, memory_mb: 8_192 },
      run_policy: { max_attempts_per_cell: 1, timeout_seconds: 1_800 },
    },
    exact_cells: [10, 5].map((topK) => ({
      cell_key: `retriever-top-k-${topK}`,
      seed: 42,
      repeat_index: 0,
      parameters: [
        { name: 'batch_size', value: 8 },
        { name: 'retrieval_top_k', value: topK },
      ],
      required_result_contract: {
        metrics: [{
          metric_definition: asTypedRef(assets.metric, 'MetricDefinition'),
          required_cardinality: 1,
        }],
        artifacts: [],
      },
    })),
    business_idempotency_key: BUSINESS_KEY,
  };
  const admission = await repositories.admissionService.admit({
    implementation_project_id: PROJECT_ID,
    validation_cycle_id: CYCLE_ID,
    request: workOrderRequest,
    admitted_by: 'system',
  });
  const relay = new ExperimentV2IntegrationRelayService({
    paperImplementationRepository: repositories.piRepository,
    experimentFoundationRepository: repositories.efRepository,
    materializationConsumer: repositories.materializationService,
    headConsumer: repositories.headService,
    acknowledgementConsumer: repositories.acknowledgementService,
    workerId: 't136-p5-scifact-revision-18-authority-relay',
    retryDelayMs: 0,
  });
  const drained = await relay.drainUntilIdle({ max_passes: 10, limit_per_domain: 10 });
  assert.equal(drained.idle, true);
  assert.deepEqual(drained.failures, []);
  const run = await prisma.experimentFoundationRunV2.findUnique({
    where: { externalPiWorkOrderRevisionId: admission.revision.work_order_revision_id },
    include: {
      cells: { orderBy: { ordinal: 'asc' } },
      runRecipe: true,
    },
  });
  assert.ok(run);
  assert.equal(run.cells.length, 2);
  assert.equal(run.runRecipe.executionBundleRevisionId, bundle.revision.execution_bundle_revision_id);
  const taskSpecs = await prisma.experimentFoundationTrainingTaskSpecV2.findMany({
    where: { externalPiWorkOrderRevisionId: admission.revision.work_order_revision_id },
    orderBy: { cellOrdinal: 'asc' },
  });
  assert.equal(taskSpecs.length, 2);
  const branch = await prisma.paperImplementationExperimentWorkOrderBranchV2.findUnique({
    where: { id: admission.branch.branch_id },
  });
  assert.equal(branch?.headRunId, run.id);
  return {
    admission,
    readiness: assets.readiness,
    run: {
      id: run.id,
      run_recipe_id: run.runRecipeId,
      external_pi_branch_id: run.externalPiBranchId,
      external_pi_work_order_revision_id: run.externalPiWorkOrderRevisionId,
      external_pi_work_order_revision_hash: run.externalPiWorkOrderRevisionHash,
      external_pi_branch_revision_sequence: run.externalPiRevisionSequence,
      run_manifest_hash: run.runManifestHash,
      cell_count: run.cells.length,
      frozen_at: run.frozenAt.toISOString(),
    },
    runCells: run.cells.map((cell) => ({
      run_cell_id: cell.id,
      run_id: cell.runId,
      ordinal: cell.ordinal,
      cell_key: cell.cellKey,
      external_pi_cell_id: cell.externalPiWorkOrderCellId,
      external_pi_cell_hash: cell.externalPiWorkOrderCellHash,
      training_task_spec_id: cell.trainingTaskSpecId,
      seed: cell.seed,
      repeat_index: cell.repeatIndex,
    })),
    taskSpecs: taskSpecs.map((task) => {
      const snapshot = task.taskSpecSnapshotJson as {
        execution_bundle: {
          execution_bundle_id: string;
          execution_bundle_revision_id: string;
          revision_sequence: number;
          content_hash: string;
        };
        command_snapshot: { command: string; arguments: string[] };
        io_snapshot: Record<string, unknown>;
        resource_snapshot: { cpu_cores: number; memory_mb: number };
        retry_snapshot: { max_attempts: number; timeout_seconds: number };
      };
      return {
        training_task_spec_id: task.id,
        materialization_key: task.materializationKey,
        run_recipe_id: task.runRecipeId,
        external_pi_work_order_revision_id: task.externalPiWorkOrderRevisionId,
        external_pi_work_order_revision_hash: task.externalPiWorkOrderRevisionHash,
        external_pi_cell_id: task.externalPiWorkOrderCellId,
        external_pi_cell_hash: task.externalPiWorkOrderCellHash,
        execution_bundle: snapshot.execution_bundle,
        command_snapshot: snapshot.command_snapshot,
        io_snapshot: snapshot.io_snapshot,
        resource_snapshot: snapshot.resource_snapshot,
        retry_snapshot: snapshot.retry_snapshot,
        task_spec_hash: task.taskSpecHash,
        created_at: task.createdAt.toISOString(),
      };
    }),
  };
}

function buildCycleRequest(source: NonNullable<Awaited<ReturnType<PrismaPaperImplementationValidationRepository['findValidationCycleById']>>>): CreateValidationCycleDraftRequest {
  return {
    validation_cycle_id: CYCLE_ID,
    target: structuredClone(source.target),
    trigger: structuredClone(source.trigger),
    cycle_type: 'probe_execution',
    validation_frame: {
      ...structuredClone(source.validation_frame),
      validation_question: 'Does top-k 10 produce materially higher SciFact micro recall than top-k 5 under the exact frozen protocol?',
      assumptions_under_test: [
        'The exact corpus, queries and qrels mirrors remain byte-identical to their frozen Dataset revision bindings.',
        'Only retrieval_top_k differs between the two ordered cells.',
      ],
      decision_if_pass: 'Advance only the provider-produced observations into scientific validation and evidence qualification.',
      decision_if_fail: 'Stop the positive claim path and preserve the negative scientific disposition.',
      decision_if_inconclusive: 'Do not promote a directional claim; review or repeat only under a new authorization.',
      why_this_cycle_now: 'P1-P4 gates are complete and named-local scientific persistence now matches the repo DB contract.',
    },
    context: {
      input_snapshot_id: INPUT_SNAPSHOT_ID,
      context_policy_version_id: source.context.context_policy_version_id,
      included_refs: structuredClone(source.context.included_refs),
      excluded_context_notes: [
        'T-132 diagnostic Runs and all offline preview values are excluded from scientific evidence.',
        'Terminal revision-17 Attempts and collections are immutable history and excluded from successor evidence.',
        'Provider submission, capabilities, credentials, experimental results and evidence promotion remain outside stage one.',
      ],
    },
    criteria: {
      pass_conditions: [
        'One exact two-cell WorkOrder v2 materializes one fresh post-migration Run with no provider submission.',
        'The exact scientific protocol, Dataset parts, parser and ExecutionBundle hashes remain locked end to end.',
      ],
      fail_conditions: [
        'Any authority, cell, mirror, parser, protocol or bundle hash drifts.',
        'Any provider, capability, result or evidence row is created during stage one.',
      ],
      inconclusive_conditions: ['Any named-local prerequisite cannot be verified exactly.'],
      stop_conditions: [
        'Stop before any CreateJob or capability enable.',
        'Stop if the recovery point predates or mismatches the target authority.',
      ],
      minimum_artifacts_required: ['Sanitized T-136 P5 stage-one materialization and replay summary.'],
    },
    budget: {
      budget_id: 'validation_budget_t136_p5_scifact_v3',
      max_runtime: 'PT30M',
      max_compute: '2x2CPU-8GiB',
      retry_budget: 0,
      max_human_review_count: 1,
    },
    confirmation_level: 'human_confirmed',
    confirmed_by: 'human',
    policy_version_id: source.policy_version_id,
    created_by: 'system',
  };
}

async function readInitialScopeState(prisma: PrismaClient): Promise<'missing' | 'partial' | 'complete'> {
  const [cycle, run, bundle, metricIdentity, protocolIdentity, metricRevision, protocolRevision,
    previousCycle, previousRun] =
    await Promise.all([
    prisma.paperImplementationValidationCycle.count({ where: { id: CYCLE_ID } }),
    prisma.experimentFoundationRunV2.count({ where: { id: SUCCESSOR_RUN_ID } }),
    prisma.experimentFoundationExecutionBundleIdentityV2.count({ where: { bundleKey: BUNDLE_KEY } }),
    prisma.experimentFoundationMetricDefinitionV2.findUnique({
      where: { id: 't136-p5-metric-scifact-micro-recall-ppm' },
      select: { currentRevisionId: true, draftStateVersion: true },
    }),
    prisma.experimentFoundationEvaluationProtocolV2.findUnique({
      where: { id: 't136-p5-protocol-scifact-micro-recall' },
      select: { currentRevisionId: true, draftStateVersion: true },
    }),
    prisma.experimentFoundationMetricDefinitionRevisionV2.count({
      where: { id: METRIC_REVISION_ID },
    }),
    prisma.experimentFoundationEvaluationProtocolRevisionV2.count({
      where: { id: PROTOCOL_REVISION_ID },
    }),
    prisma.paperImplementationValidationCycle.count({ where: { id: PREVIOUS_CYCLE_ID } }),
    prisma.experimentFoundationRunV2.count({ where: { id: PREVIOUS_RUN_ID } }),
  ]);
  assert.ok(metricIdentity && protocolIdentity, 'Historical scientific assets are missing');
  assert.equal(bundle, 1, 'Scientific execution bundle is missing');
  assert.equal(metricRevision, 1, 'Scientific metric revision is missing');
  assert.equal(protocolRevision, 1, 'Scientific protocol revision is missing');
  assert.equal(metricIdentity.currentRevisionId, METRIC_REVISION_ID);
  assert.equal(protocolIdentity.currentRevisionId, PROTOCOL_REVISION_ID);
  assert.equal(previousCycle, 1, 'Revision-17 validation cycle is missing');
  assert.equal(previousRun, 1, 'Revision-17 Run is missing');
  if (cycle === 0 && run === 0) return 'missing';
  return cycle === 1 && run === 1 ? 'complete' : 'partial';
}

async function readHistoricalSentinels(prisma: PrismaClient) {
  const [sourceCycle, sourceReadiness, sourceBundle, cycle, metric, protocol, bundle, branch,
    revision, run, previousCycle, previousBranch, previousRevision, previousRun] =
    await Promise.all([
    prisma.paperImplementationValidationCycle.findUnique({ where: { id: SOURCE_CYCLE_ID } }),
    prisma.experimentFoundationReadinessAttestationV2.findUnique({
      where: { id: 'readiness_attestation_5a9a84ce-bc90-48fe-9225-0188b076ca30' },
    }),
    prisma.experimentFoundationExecutionBundleRevisionV2.findUnique({
      where: { id: 'ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48' },
    }),
    prisma.paperImplementationValidationCycle.findUnique({ where: { id: HISTORICAL_CYCLE_ID } }),
    prisma.experimentFoundationMetricDefinitionRevisionV2.findUnique({
      where: { id: HISTORICAL_METRIC_REVISION_ID },
    }),
    prisma.experimentFoundationEvaluationProtocolRevisionV2.findUnique({
      where: { id: HISTORICAL_PROTOCOL_REVISION_ID },
    }),
    prisma.experimentFoundationExecutionBundleRevisionV2.findUnique({
      where: { id: HISTORICAL_BUNDLE_REVISION_ID },
    }),
    prisma.paperImplementationExperimentWorkOrderBranchV2.findUnique({
      where: { id: 'pi_experiment_branch_v2_t136_p5_scifact_v1_1' },
    }),
    prisma.paperImplementationExperimentWorkOrderRevisionV2.findUnique({
      where: { id: 'pi_experiment_revision_v2_t136_p5_scifact_v1_1' },
    }),
    prisma.experimentFoundationRunV2.findUnique({
      where: { id: HISTORICAL_RUN_ID },
      include: { cells: { orderBy: { ordinal: 'asc' } }, runRecipe: true },
    }),
    prisma.paperImplementationValidationCycle.findUnique({ where: { id: PREVIOUS_CYCLE_ID } }),
    prisma.paperImplementationExperimentWorkOrderBranchV2.findUnique({
      where: { id: 'pi_experiment_branch_v2_t136_p5_scifact_v2_1' },
    }),
    prisma.paperImplementationExperimentWorkOrderRevisionV2.findUnique({
      where: { id: 'pi_experiment_revision_v2_t136_p5_scifact_v2_1' },
    }),
    prisma.experimentFoundationRunV2.findUnique({
      where: { id: PREVIOUS_RUN_ID },
      include: { cells: { orderBy: { ordinal: 'asc' } }, runRecipe: true },
    }),
  ]);
  return {
    sourceCycle,
    sourceReadiness,
    sourceBundle,
    cycle,
    metric,
    protocol,
    bundle,
    branch,
    revision,
    run,
    previousCycle,
    previousBranch,
    previousRevision,
    previousRun,
  };
}

async function countProhibitedScientificRows(prisma: PrismaClient, runId: string): Promise<number> {
  const counts = await Promise.all([
    prisma.experimentFoundationProviderPayloadV2.count({ where: { runId } }),
    prisma.experimentFoundationExecutionAttemptV2.count({ where: { runId } }),
    prisma.experimentFoundationExperimentResultV2.count({ where: { runId } }),
    prisma.experimentFoundationScientificValidationReportV2.count({ where: { runId } }),
    prisma.experimentFoundationEvidenceCandidateV2.count({ where: { runId } }),
    prisma.paperImplementationRunEvidenceUnitV2.count({ where: { runId } }),
  ]);
  return counts.reduce((sum, count) => sum + count, 0);
}

async function requireRecoveryPoint(): Promise<RecoveryManifest> {
  const value = JSON.parse(await fs.readFile(RECOVERY_MANIFEST, 'utf8')) as RecoveryManifest;
  assert.equal(value.schema, 'ScientificEvidenceP5NamedLocalRecovery@v1');
  assert.equal(value.target_fingerprint, TARGET.fingerprint);
  assert.ok(Date.parse(value.created_at) <= Date.parse(MATERIALIZED_AT));
  assert.match(value.recovery_fingerprint, /^sha256:[a-f0-9]{64}$/);
  const directory = path.dirname(RECOVERY_MANIFEST);
  for (const entry of [value.schema_dump, value.authority_data_dump]) {
    const bytes = await fs.readFile(path.join(directory, entry.file));
    assert.equal(bytes.length, entry.byte_size);
    assert.equal(`sha256:${createHash('sha256').update(bytes).digest('hex')}`, entry.sha256);
  }
  return value;
}

function requireAuthorization(value: string | undefined): void {
  if (value !== AUTHORIZATION_VALUE) {
    throw new Error(`${AUTHORIZATION_ENV} must exactly authorize the reviewed 44-row no-cloud scope`);
  }
}

function identityDraft(identity: ExperimentFoundationV2AssetIdentityRecord) {
  switch (identity.asset_type) {
    case 'DataPolicy': return identity.asset.data_policy_draft;
    case 'Dataset': return identity.asset.dataset_draft;
    case 'MetricDefinition': return identity.asset.metric_definition_draft;
    case 'Benchmark': return identity.asset.benchmark_draft;
    case 'EvaluationProtocol': return identity.asset.evaluation_protocol_draft;
  }
}

function asTypedRef<T extends ExperimentFoundationV2AssetType>(
  ref: ExperimentFoundationV2ExactAssetRevisionRef,
  assetType: T,
): ExperimentFoundationV2ExactAssetRevisionRef & { asset_type: T } {
  assert.equal(ref.asset_type, assetType);
  return { ...ref, asset_type: assetType };
}

function metricRef(logicalId: string, revisionId: string, hash: string) {
  return {
    asset_type: 'MetricDefinition' as const,
    logical_id: logicalId,
    revision_id: revisionId,
    revision_sequence: 1,
    content_hash: `sha256:${hash}`,
  };
}

function deterministicIdFactory(scope: string): (prefix: string) => string {
  const counters = new Map<string, number>();
  return (prefix) => {
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    return `${prefix}_${scope}_${next}`;
  };
}

function canonical(value: unknown): string {
  return canonicalizeExperimentV2Json(value as ExperimentV2JsonValue);
}

function countByAssetType(refs: ExperimentFoundationV2ExactAssetRevisionRef[]) {
  return Object.fromEntries(
    [...refs.reduce((counts, ref) => {
      counts.set(ref.asset_type, (counts.get(ref.asset_type) ?? 0) + 1);
      return counts;
    }, new Map<string, number>()).entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function rowDeltas(before: Record<string, number>, after: Record<string, number>) {
  return Object.fromEntries(Object.keys(after).map((table) => [table, after[table]! - before[table]!]));
}

function totalDelta(before: Record<string, number>, after: Record<string, number>): number {
  return Object.values(rowDeltas(before, after)).reduce((sum, value) => sum + value, 0);
}

function assertExactDeltas(
  before: Record<string, number>,
  after: Record<string, number>,
  expected: Readonly<Record<string, number>>,
): void {
  const actual = rowDeltas(before, after);
  for (const table of Object.keys(EXPECTED_WRITE_TABLE_DELTAS)) {
    assert.equal(actual[table], expected[table] ?? 0, `Unexpected row delta for ${table}`);
  }
  assert.equal(
    totalDelta(before, after),
    Object.values(expected).reduce((sum, value) => sum + value, 0),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({
      status: 'failed',
      reason: stableFailureCode(error, 'T136_P5_STAGE_ONE_FAILED'),
    })}\n`);
    process.exitCode = 1;
  });
}

function stableFailureCode(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  return /^(T136_P5_[A-Z0-9_]+)/.exec(error.message)?.[1] ?? fallback;
}
