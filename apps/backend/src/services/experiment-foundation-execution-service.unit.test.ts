import assert from 'node:assert/strict';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { afterEach } from 'node:test';
import type {
  DataPolicy,
  DatasetMirror,
  ExperimentFoundationExternalLockRef,
  ExperimentFoundationRecordKind,
  ExperimentFoundationRef,
  MetricDefinition,
  RunRecipe,
  SubmitExternalTrainingJobRequest,
  TrainingTaskMaterializationResult,
  TrainingTaskSpec,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-contracts';
import { buildApp } from '../app.js';
import { AppError } from '../errors/app-error.js';
import { InMemoryExperimentFoundationExecutionRepository } from '../repositories/in-memory-experiment-foundation-execution-repository.js';
import { InMemoryExperimentFoundationRepository } from '../repositories/in-memory-experiment-foundation-repository.js';
import { ExperimentFoundationExecutionService } from './experiment-foundation-execution-service.js';
import { ExperimentFoundationService } from './experiment-foundation-service.js';

const timestamp = '2026-05-18T00:00:00.000Z';
const temporaryExecutionRoots = new Set<string>();

class CountingExperimentFoundationExecutionRepository extends InMemoryExperimentFoundationExecutionRepository {
  findByIdCalls = 0;

  override async findExternalTrainingJobById(externalJobId: string) {
    this.findByIdCalls += 1;
    return super.findExternalTrainingJobById(externalJobId);
  }
}

afterEach(async () => {
  await Promise.all(
    [...temporaryExecutionRoots].map((root) => rm(root, { recursive: true, force: true })),
  );
  temporaryExecutionRoots.clear();
});

function sourceRef(refType: string, refId: string): ExperimentFoundationRef {
  return { ref_type: refType, ref_id: refId };
}

function asPayload(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function externalLockRef(refKind: ExperimentFoundationExternalLockRef['ref_kind']): ExperimentFoundationExternalLockRef {
  return {
    ref_kind: refKind,
    ref: sourceRef(refKind, `${refKind}_001`),
    ref_hash: `sha256:${refKind}`,
  };
}

function runRecipePayload(profileKind: RunRecipe['execution_profile']['profile_kind'] = 'standard_training'): RunRecipe {
  const readinessSnapshot = {
    readiness_report_id: 'readiness_report_001',
    readiness_report_hash: 'sha256:readiness-report',
    status: 'passed' as const,
    checked_at: timestamp,
    source_refs: [sourceRef('system_check', 'readiness')],
    blockers: [],
  };
  const fineTuningRefs = [
    externalLockRef('base_model'),
    externalLockRef('fine_tuning_dataset'),
    externalLockRef('fine_tuning_strategy'),
    externalLockRef('prompt_template'),
    externalLockRef('context_policy'),
  ];
  return {
    run_recipe_id: 'run_recipe_001',
    recipe_draft_id: 'recipe_draft_001',
    version_lock: {
      version_lock_id: 'version_lock_001',
      dataset_version_lock: {
        dataset_asset_id: 'dataset_asset_001',
        dataset_version_id: 'dataset_version_001',
        checksum_manifest_hash: 'sha256:checksum-manifest',
        split_protocol_hash: 'sha256:split-protocol',
        data_policy_id: 'data_policy_001',
        data_policy_hash: 'sha256:data-policy',
        locked_at: timestamp,
        source_refs: [sourceRef('dataset_version', 'dataset_version_001')],
      },
      evaluation_protocol_lock: {
        evaluation_protocol_id: 'evaluation_protocol_001',
        benchmark_asset_id: 'benchmark_asset_001',
        protocol_version: 'v1',
        protocol_hash: 'sha256:evaluation-protocol',
        metric_definition_refs: [sourceRef('metric_definition', 'metric_adapter_success')],
        locked_at: timestamp,
        source_refs: [sourceRef('evaluation_protocol', 'evaluation_protocol_001')],
      },
      baseline_implementation_locks: [{
        baseline_asset_id: 'baseline_asset_001',
        baseline_implementation_version_id: 'baseline_impl_001',
        version_label: 'v1',
        implementation_hash: 'sha256:baseline-implementation',
        code_ref: sourceRef('code', 'baseline_repo'),
        commit_hash: 'abc123',
        runtime_ref: sourceRef('runtime', 'node'),
        runtime_hash: 'sha256:runtime',
        entrypoint: 'baseline.js',
        locked_at: timestamp,
        source_refs: [],
      }],
      method_component_locks: [{
        method_recipe_component_id: 'method_component_001',
        component_kind: 'training_strategy',
        version_label: 'v1',
        component_hash: 'sha256:method-component',
        locked_at: timestamp,
        source_refs: [],
      }],
      external_lock_refs: profileKind === 'llm_fine_tuning' ? fineTuningRefs : [],
      readiness_snapshot: readinessSnapshot,
      version_lock_hash: 'sha256:version-lock',
      locked_at: timestamp,
      source_refs: [],
    },
    version_lock_hash: 'sha256:version-lock',
    resolved_params: { epochs: 1 },
    execution_profile: profileKind === 'llm_fine_tuning'
      ? {
          profile_kind: 'llm_fine_tuning',
          capability_requirements: ['fine_tuning'],
          resource_classes: ['cpu'],
          supports_distributed: false,
          long_running: false,
          fine_tuning_external_lock_refs: fineTuningRefs,
        }
      : {
          profile_kind: profileKind,
          capability_requirements: ['local_execution'],
          resource_classes: ['cpu'],
          supports_distributed: false,
          long_running: false,
        },
    config_snapshot: { epochs: 1 },
    config_snapshot_hash: 'sha256:config-snapshot',
    readiness_snapshot: readinessSnapshot,
    run_recipe_hash: 'sha256:run-recipe',
    locked_at: timestamp,
    source_refs: [sourceRef('recipe_draft', 'recipe_draft_001')],
    traceability_refs: [sourceRef('version_lock', 'version_lock_001')],
  };
}

function trainingTaskSpecPayload(
  overrides: Partial<TrainingTaskSpec> = {},
): TrainingTaskSpec {
  const profileKind = overrides.profile_kind ?? 'standard_training';
  const selectedPlatform = overrides.selected_platform ?? {
    platform_id: 'local_script_default',
    platform_kind: 'local_script',
    adapter_kind: 'local_script',
    adapter_version: 'test-local-v1',
    capability_refs: [sourceRef('capability', 'local_script')],
  } as const;
  return {
    training_task_spec_id: 'training_task_spec_001',
    materialization_request_id: 'materialization_request_001',
    run_recipe_id: 'run_recipe_001',
    run_recipe_hash: 'sha256:run-recipe',
    version_lock_hash: 'sha256:version-lock',
    profile_kind: profileKind,
    selected_platform: selectedPlatform,
    runtime_ref: sourceRef('runtime', 'node'),
    runtime_hash: 'sha256:runtime',
    command: process.execPath,
    args: ['-e', 'console.log("experiment-foundation-ok")'],
    env_refs: [],
    input_refs: [],
    output_contract: { working_directory: path.join(tmpdir(), 'experiment-foundation-test-output') },
    resource_request: { cpu: 1 },
    timeout_seconds: 10,
    retry_policy: { max_retries: 0 },
    auth_ref_names: [],
    config_snapshot_hash: 'sha256:config-snapshot',
    created_at: timestamp,
    source_refs: [sourceRef('materialize_training_task_spec_request', 'materialization_request_001')],
    traceability_refs: [sourceRef('run_recipe', 'run_recipe_001')],
    ...overrides,
  };
}

function materializationResultPayload(): TrainingTaskMaterializationResult {
  return {
    materialization_result_id: 'materialization_result_001',
    materialization_request_id: 'materialization_request_001',
    status: 'materialized',
    training_task_spec_ref: sourceRef('training_task_spec', 'training_task_spec_001'),
    training_task_spec_hash: 'sha256:training-task-spec',
    adapter_metadata_ref: {
      adapter_metadata_ref_id: 'adapter_metadata_ref_materialization',
      adapter_kind: 'local_script',
      adapter_version: 'test-local-v1',
      metadata_storage_ref: sourceRef('local_metadata_artifact', 'materialization_metadata'),
      metadata_hash: 'sha256:adapter-metadata',
      schema_version: 'experiment-foundation-adapter-metadata-v1',
      created_at: timestamp,
      source_refs: [],
    },
    adapter_metadata_hash: 'sha256:adapter-metadata',
    materialization_hash: 'sha256:materialization',
    idempotency_key: 'materialization-key-001',
    blockers: [],
    warnings: [],
    traceability_refs: [sourceRef('training_task_spec', 'training_task_spec_001')],
    event_refs: [],
    created_at: timestamp,
  };
}

function dataPolicyPayload(overrides: Partial<DataPolicy> = {}): DataPolicy {
  return {
    data_policy_id: 'data_policy_001',
    license: 'CC BY-SA 4.0',
    access_level: 'open',
    privacy_level: 'public',
    allowed_use_cases: ['benchmarking'],
    mirror_policy: 'allowed',
    approval_refs: [],
    policy_hash: 'sha256:data-policy',
    retention_notes: null,
    created_at: timestamp,
    ...overrides,
  };
}

function datasetMirrorPayload(overrides: Partial<DatasetMirror> = {}): DatasetMirror {
  return {
    dataset_mirror_id: 'dataset_mirror_001',
    dataset_version_id: 'dataset_version_001',
    mirror_role: 'execution_mirror',
    provider: 'aliyun_oss',
    mirror_ref: sourceRef('aliyun_oss_object', 'oss_dataset_001'),
    mirror_status: 'ready',
    source_checksum_manifest_hash: 'sha256:checksum-manifest',
    freshness_status: 'fresh',
    approval_ref: null,
    run_scope_ref: null,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

function metricDefinitionPayload(overrides: Partial<MetricDefinition> = {}): MetricDefinition {
  return {
    metric_definition_id: 'metric_adapter_success',
    metric_key: 'adapter_success',
    name: 'Adapter success',
    description: 'Binary adapter smoke success metric.',
    direction: 'higher_is_better',
    unit: 'binary',
    value_type: 'number',
    evaluator_ref: sourceRef('evaluator', 'adapter_smoke'),
    parser_ref: null,
    validity_constraints: ['value must be 0 or 1'],
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

function submitRequest(overrides: Partial<SubmitExternalTrainingJobRequest> = {}): SubmitExternalTrainingJobRequest {
  return {
    training_task_spec_ref: sourceRef('training_task_spec', 'training_task_spec_001'),
    training_task_spec_hash: 'sha256:training-task-spec',
    materialization_result_ref: sourceRef('training_task_materialization_result', 'materialization_result_001'),
    materialization_result_hash: 'sha256:materialization',
    idempotency_key: 'submit-key-001',
    requested_by_ref: sourceRef('user', 'user_001'),
    source_refs: [sourceRef('test_case', 'submit')],
    ...overrides,
  };
}

async function createServices() {
  const registryService = new ExperimentFoundationService(new InMemoryExperimentFoundationRepository());
  const executionRepository = new CountingExperimentFoundationExecutionRepository();
  const executionService = new ExperimentFoundationExecutionService(executionRepository, registryService);
  return { registryService, executionService, executionRepository };
}

async function seedExecutableTask(
  registryService: ExperimentFoundationService,
  options: {
    adapterKind?: 'local_script' | 'aliyun_pai_dlc';
    mirror?: DatasetMirror;
    dataPolicy?: DataPolicy;
    markReady?: boolean;
    command?: string;
    args?: string[];
    taskSpecOverrides?: Partial<TrainingTaskSpec>;
  } = {},
) {
  const adapterKind = options.adapterKind ?? 'local_script';
  const outputRoot = await mkdtemp(path.join(tmpdir(), 'experiment-foundation-execution-'));
  temporaryExecutionRoots.add(outputRoot);
  if (adapterKind === 'local_script') {
    process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT = outputRoot;
  }
  const selectedPlatform = {
    platform_id: adapterKind === 'local_script' ? 'local_script_default' : 'aliyun_pai_dlc_default',
    platform_kind: adapterKind,
    adapter_kind: adapterKind,
    adapter_version: adapterKind === 'local_script' ? 'test-local-v1' : 'mock-aliyun-v1',
    capability_refs: [sourceRef('capability', adapterKind)],
  };
  const taskSpec = trainingTaskSpecPayload({
    selected_platform: selectedPlatform,
    command: options.command ?? process.execPath,
    args: options.args ?? ['-e', 'console.log("experiment-foundation-ok")'],
    output_contract: { working_directory: outputRoot },
    input_refs: adapterKind === 'aliyun_pai_dlc'
      ? [sourceRef('dataset_mirror', 'dataset_mirror_001')]
      : [],
    ...options.taskSpecOverrides,
  });
  const materialization = {
    ...materializationResultPayload(),
    adapter_metadata_ref: {
      ...materializationResultPayload().adapter_metadata_ref!,
      adapter_kind: adapterKind,
      adapter_version: selectedPlatform.adapter_version,
    },
  };
  await registryService.createRecord({ record_kind: 'run_recipe', payload: asPayload(runRecipePayload(taskSpec.profile_kind)) });
  await registryService.createRecord({ record_kind: 'metric_definition', payload: asPayload(metricDefinitionPayload()) });
  await registryService.createRecord({ record_kind: 'training_task_spec', payload: asPayload(taskSpec) });
  await registryService.createRecord({ record_kind: 'training_task_materialization_result', payload: asPayload(materialization) });
  await registryService.createRecord({ record_kind: 'data_policy', payload: asPayload(options.dataPolicy ?? dataPolicyPayload()) });
  if (adapterKind === 'aliyun_pai_dlc') {
    await registryService.createRecord({
      record_kind: 'dataset_mirror',
      payload: asPayload(options.mirror ?? datasetMirrorPayload()),
    });
  }
  if (options.markReady !== false) {
    await registryService.checkReadiness({
      target_ref: sourceRef('training_task_spec', 'training_task_spec_001'),
      source_refs: [sourceRef('system_check', 'readiness')],
    });
  }
  return { outputRoot, taskSpec };
}

async function seedRecordRoute(
  app: ReturnType<typeof buildApp>,
  recordKind: ExperimentFoundationRecordKind,
  payload: unknown,
) {
  const response = await app.inject({
    method: 'POST',
    url: '/experiment-foundation/records',
    payload: { record_kind: recordKind, payload },
  });
  assert.equal(response.statusCode, 201, response.body);
}

test('LocalScript collect fails closed without result, validation, evidence, or diagnostic writes', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRoot = process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT;
  process.env.NODE_ENV = 'test';
  try {
    const { registryService, executionService, executionRepository } = await createServices();
    await seedExecutableTask(registryService);

    const submitted = await executionService.submitJob(submitRequest());
    assert.equal(submitted.external_job.job_status, 'running');
    assert.equal(submitted.external_job.stage_event_refs.length, 1);

    const synced = await syncUntilTerminal(executionService, submitted.external_job.external_job_id);
    assert.equal(synced.external_job.job_status, 'succeeded');
    assert.ok(synced.external_job.stage_event_refs.length >= 2);

    const recordsBefore = await registryService.listRecords({ limit: 100 });
    const jobBefore = await executionService.getJob(submitted.external_job.external_job_id);
    const findByIdCallsBefore = executionRepository.findByIdCalls;
    await assert.rejects(
      () => executionService.collectJob(submitted.external_job.external_job_id, {
        source_refs: [sourceRef('test_case', 'collect')],
      }),
      (error) => error instanceof AppError
        && error.statusCode === 409
        && error.errorCode === 'GATE_CONSTRAINT_FAILED'
        && error.details?.reason_code === 'LEGACY_SCIENTIFIC_WRITER_CLOSED',
    );
    assert.equal(executionRepository.findByIdCalls, findByIdCallsBefore);
    const recordsAfter = await registryService.listRecords({ limit: 100 });
    const jobAfter = await executionService.getJob(submitted.external_job.external_job_id);
    assert.equal(recordsAfter.records.length, recordsBefore.records.length);
    assert.deepEqual(jobAfter.external_job, jobBefore.external_job);
    assert.deepEqual(jobAfter.external_job.result_refs, []);
    assert.deepEqual(jobAfter.external_job.partial_result_refs, []);
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    restoreOptionalEnv('EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT', previousRoot);
  }
});

test('LocalScript submit requires readiness and command allowlist', async () => {
  const previousRoot = process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT;
  const { registryService, executionService } = await createServices();
  await seedExecutableTask(registryService, { markReady: false });
  await assert.rejects(
    () => executionService.submitJob(submitRequest()),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );

  const previousNodeEnv = process.env.NODE_ENV;
  const previousEnabled = process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ENABLED;
  const previousAllowed = process.env.EXPERIMENT_FOUNDATION_LOCAL_SCRIPT_ALLOWED_COMMANDS;
  process.env.NODE_ENV = 'production';
  process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ENABLED = 'true';
  process.env.EXPERIMENT_FOUNDATION_LOCAL_SCRIPT_ALLOWED_COMMANDS = process.execPath;
  try {
    const second = await createServices();
    await seedExecutableTask(second.registryService, {
      command: 'bash',
    });
    await assert.rejects(
      () => second.executionService.submitJob(submitRequest()),
      (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
    );
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    if (previousEnabled === undefined) {
      delete process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ENABLED;
    } else {
      process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ENABLED = previousEnabled;
    }
    if (previousAllowed === undefined) {
      delete process.env.EXPERIMENT_FOUNDATION_LOCAL_SCRIPT_ALLOWED_COMMANDS;
    } else {
      process.env.EXPERIMENT_FOUNDATION_LOCAL_SCRIPT_ALLOWED_COMMANDS = previousAllowed;
    }
    restoreOptionalEnv('EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT', previousRoot);
  }
});

test('LocalScript robustness blocks disabled execution and execution-root escapes', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRoot = process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT;
  const previousEnabled = process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ENABLED;
  const previousAllowed = process.env.EXPERIMENT_FOUNDATION_LOCAL_SCRIPT_ALLOWED_COMMANDS;
  let outsideRoot: string | null = null;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ENABLED;
    process.env.EXPERIMENT_FOUNDATION_LOCAL_SCRIPT_ALLOWED_COMMANDS = process.execPath;
    const disabled = await createServices();
    await seedExecutableTask(disabled.registryService);
    await assert.rejects(
      () => disabled.executionService.submitJob(submitRequest()),
      (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
    );

    process.env.NODE_ENV = 'test';
    outsideRoot = await mkdtemp(path.join(tmpdir(), 'experiment-foundation-root-escape-'));
    const rootEscape = await createServices();
    await seedExecutableTask(rootEscape.registryService, {
      taskSpecOverrides: {
        output_contract: { working_directory: outsideRoot },
      },
    });
    await assert.rejects(
      () => rootEscape.executionService.submitJob(submitRequest()),
      (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
    );
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    restoreOptionalEnv('EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT', previousRoot);
    restoreOptionalEnv('EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ENABLED', previousEnabled);
    restoreOptionalEnv('EXPERIMENT_FOUNDATION_LOCAL_SCRIPT_ALLOWED_COMMANDS', previousAllowed);
    if (outsideRoot) {
      await rm(outsideRoot, { recursive: true, force: true });
    }
  }
});

test('LocalScript robustness keeps shell metacharacter args literal with shell=false', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRoot = process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT;
  const markerRoot = await mkdtemp(path.join(tmpdir(), 'experiment-foundation-shell-false-'));
  const injectedMarker = path.join(markerRoot, 'shell-injected-marker');
  process.env.NODE_ENV = 'test';
  try {
    const { registryService, executionService } = await createServices();
    await seedExecutableTask(registryService, {
      args: [
        '-e',
        'console.log("shell-false-ok")',
        `$(touch ${injectedMarker})`,
      ],
    });
    const submitted = await executionService.submitJob(submitRequest());
    const synced = await syncUntilTerminal(executionService, submitted.external_job.external_job_id);
    assert.equal(synced.external_job.job_status, 'succeeded');
    await assert.rejects(
      () => access(injectedMarker),
      /ENOENT/,
      'shell metacharacter argument must not create a marker file',
    );
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    restoreOptionalEnv('EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT', previousRoot);
    await rm(markerRoot, { recursive: true, force: true });
  }
});

test('LocalScript timeout remains observable while collect stays closed before and after terminal sync', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRoot = process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT;
  process.env.NODE_ENV = 'test';
  try {
    const { registryService, executionService } = await createServices();
    await seedExecutableTask(registryService, {
      args: ['-e', 'setTimeout(() => {}, 5000)'],
      taskSpecOverrides: { timeout_seconds: 1 },
    });
    const submitted = await executionService.submitJob(submitRequest());
    assert.equal(submitted.external_job.job_status, 'running');
    await assert.rejects(
      () => executionService.collectJob(submitted.external_job.external_job_id, {
        source_refs: [sourceRef('test_case', 'collect_before_terminal')],
      }),
      (error) => error instanceof AppError
        && error.details?.reason_code === 'LEGACY_SCIENTIFIC_WRITER_CLOSED',
    );

    const timedOut = await syncUntilTerminal(executionService, submitted.external_job.external_job_id, 'failed');
    assert.equal(timedOut.external_job.job_status, 'failed');
    const recordsBefore = await registryService.listRecords({ limit: 100 });
    for (const sourceId of ['timeout_collect', 'timeout_collect_repeated']) {
      await assert.rejects(
        () => executionService.collectJob(submitted.external_job.external_job_id, {
          source_refs: [sourceRef('test_case', sourceId)],
        }),
        (error) => error instanceof AppError
          && error.details?.reason_code === 'LEGACY_SCIENTIFIC_WRITER_CLOSED',
      );
    }
    const recordsAfter = await registryService.listRecords({ limit: 100 });
    const unchangedJob = await executionService.getJob(submitted.external_job.external_job_id);
    assert.equal(recordsAfter.records.length, recordsBefore.records.length);
    assert.deepEqual(unchangedJob.external_job.result_refs, []);
    assert.deepEqual(unchangedJob.external_job.partial_result_refs, []);
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    restoreOptionalEnv('EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT', previousRoot);
  }
});

test('submit idempotency returns the existing job and conflicts on different materialization', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRoot = process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT;
  process.env.NODE_ENV = 'test';
  try {
    const { registryService, executionService, executionRepository } = await createServices();
    await seedExecutableTask(registryService);
    const submitted = await executionService.submitJob(submitRequest());
    const repeated = await executionService.submitJob(submitRequest());
    assert.equal(repeated.external_job.external_job_id, submitted.external_job.external_job_id);

    await assert.rejects(
      () => executionService.submitJob(submitRequest({ materialization_result_hash: 'sha256:other-materialization' })),
      (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
    );
    await assert.rejects(
      () => executionRepository.createExternalTrainingJob(submitted.external_job),
      (error) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
    );
    await assert.rejects(
      () => executionRepository.updateExternalTrainingJob({
        ...submitted.external_job,
        external_job_id: 'external_training_job_missing',
      }),
      (error) => error instanceof AppError && error.errorCode === 'NOT_FOUND',
    );
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    restoreOptionalEnv('EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT', previousRoot);
  }
});

test('Aliyun mock submit consumes ready fresh mirrors and rejects stale mirrors', async () => {
  const { registryService, executionService } = await createServices();
  await seedExecutableTask(registryService, { adapterKind: 'aliyun_pai_dlc' });
  const submitted = await executionService.submitJob(submitRequest());
  assert.equal(submitted.external_job.adapter_kind, 'aliyun_pai_dlc');
  assert.equal(submitted.external_job.job_status, 'running');

  const second = await createServices();
  await seedExecutableTask(second.registryService, {
    adapterKind: 'aliyun_pai_dlc',
    mirror: datasetMirrorPayload({ freshness_status: 'stale' }),
  });
  await assert.rejects(
    () => second.executionService.submitJob(submitRequest()),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );

  const third = await createServices();
  await seedExecutableTask(third.registryService, {
    adapterKind: 'aliyun_pai_dlc',
    mirror: datasetMirrorPayload({ dataset_version_id: 'dataset_version_other' }),
  });
  await assert.rejects(
    () => third.executionService.submitJob(submitRequest()),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
});

test('Aliyun mock blocks restricted mirrors without approval', async () => {
  const { registryService, executionService } = await createServices();
  await seedExecutableTask(registryService, {
    adapterKind: 'aliyun_pai_dlc',
    dataPolicy: dataPolicyPayload({
      access_level: 'restricted',
      mirror_policy: 'approval_required',
      approval_refs: [],
    }),
  });
  await assert.rejects(
    () => executionService.submitJob(submitRequest()),
    (error) => error instanceof AppError && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
});

test('cancel records cancellation and stage event refs', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRoot = process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT;
  process.env.NODE_ENV = 'test';
  try {
    const { registryService, executionService } = await createServices();
    await seedExecutableTask(registryService, {
      args: ['-e', 'setTimeout(() => {}, 5000)'],
    });
    const submitted = await executionService.submitJob(submitRequest());
    assert.equal(submitted.external_job.job_status, 'running');
    const cancelled = await executionService.cancelJob(submitted.external_job.external_job_id, {
      requested_by_ref: sourceRef('user', 'user_001'),
      reason: 'stop smoke job',
      idempotency_key: 'cancel-key-001',
      source_refs: [sourceRef('test_case', 'cancel')],
    });
    assert.ok(cancelled.external_job.stage_event_refs.length > submitted.external_job.stage_event_refs.length);
    assert.ok(cancelled.external_job.adapter_metadata_refs.length > submitted.external_job.adapter_metadata_refs.length);
    assert.ok(cancelled.external_job.job_status === 'cancelling' || cancelled.external_job.job_status === 'cancelled');
    const repeated = await executionService.cancelJob(submitted.external_job.external_job_id, {
      requested_by_ref: sourceRef('user', 'user_001'),
      reason: 'stop smoke job',
      idempotency_key: 'cancel-key-001',
      source_refs: [sourceRef('test_case', 'cancel')],
    });
    assert.equal(repeated.external_job.stage_event_refs.length, cancelled.external_job.stage_event_refs.length);
    const synced = await syncUntilTerminal(executionService, submitted.external_job.external_job_id, 'cancelled');
    assert.equal(synced.external_job.job_status, 'cancelled');
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    restoreOptionalEnv('EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT', previousRoot);
  }
});

test('execution routes cover submit, read, list, sync, cancel, collect and schema errors', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRoot = process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT;
  process.env.NODE_ENV = 'test';
  const app = buildApp();
  await app.ready();
  try {
    const { taskSpec } = await seedExecutableTaskForRoutes(app);
    const readiness = await app.inject({
      method: 'POST',
      url: '/experiment-foundation/readiness/check',
      payload: {
        target_ref: sourceRef('training_task_spec', taskSpec.training_task_spec_id),
        source_refs: [sourceRef('system_check', 'readiness')],
      },
    });
    assert.equal(readiness.statusCode, 201, readiness.body);

    const invalid = await app.inject({
      method: 'POST',
      url: '/experiment-foundation/execution/jobs/submit',
      payload: {
        training_task_spec_ref: sourceRef('training_task_spec', taskSpec.training_task_spec_id),
      },
    });
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.json().error.code, 'INVALID_PAYLOAD');

    const submit = await app.inject({
      method: 'POST',
      url: '/experiment-foundation/execution/jobs/submit',
      payload: submitRequest(),
    });
    assert.equal(submit.statusCode, 201, submit.body);
    const externalJobId = submit.json().external_job.external_job_id;

    const read = await app.inject({
      method: 'GET',
      url: `/experiment-foundation/execution/jobs/${externalJobId}`,
    });
    assert.equal(read.statusCode, 200, read.body);

    const list = await app.inject({
      method: 'GET',
      url: '/experiment-foundation/execution/jobs?status=running',
    });
    assert.equal(list.statusCode, 200, list.body);
    assert.equal(list.json().jobs.length, 1);

    const sync = await syncRouteUntilTerminal(app, externalJobId);
    assert.equal(sync.statusCode, 200, sync.body);

    const cancel = await app.inject({
      method: 'POST',
      url: `/experiment-foundation/execution/jobs/${externalJobId}/cancel`,
      payload: {
        requested_by_ref: sourceRef('user', 'user_001'),
        reason: 'route smoke cancel',
        idempotency_key: 'route-cancel-key',
        source_refs: [sourceRef('test_case', 'route_cancel')],
      },
    });
    assert.equal(cancel.statusCode, 200, cancel.body);

    const collect = await app.inject({
      method: 'POST',
      url: `/experiment-foundation/execution/jobs/${externalJobId}/collect`,
      payload: { source_refs: [sourceRef('test_case', 'route_collect')] },
    });
    assert.equal(collect.statusCode, 409, collect.body);
    assert.equal(collect.json().error.code, 'GATE_CONSTRAINT_FAILED');
    assert.equal(
      collect.json().error.details.reason_code,
      'LEGACY_SCIENTIFIC_WRITER_CLOSED',
    );
  } finally {
    await app.close();
    process.env.NODE_ENV = previousNodeEnv;
    restoreOptionalEnv('EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT', previousRoot);
  }
});

async function seedExecutableTaskForRoutes(app: ReturnType<typeof buildApp>) {
  const outputRoot = await mkdtemp(path.join(tmpdir(), 'experiment-foundation-route-'));
  temporaryExecutionRoots.add(outputRoot);
  process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT = outputRoot;
  const taskSpec = trainingTaskSpecPayload({
    output_contract: { working_directory: outputRoot },
  });
  await seedRecordRoute(app, 'run_recipe', runRecipePayload(taskSpec.profile_kind));
  await seedRecordRoute(app, 'metric_definition', metricDefinitionPayload());
  await seedRecordRoute(app, 'training_task_spec', taskSpec);
  await seedRecordRoute(app, 'training_task_materialization_result', materializationResultPayload());
  await seedRecordRoute(app, 'data_policy', dataPolicyPayload());
  return { taskSpec };
}

function restoreOptionalEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

async function syncUntilTerminal(
  executionService: ExperimentFoundationExecutionService,
  externalJobId: string,
  expectedStatus: 'succeeded' | 'failed' | 'cancelled' = 'succeeded',
) {
  let latest;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    latest = await executionService.syncJob(externalJobId, {
      source_refs: [sourceRef('test_case', 'sync')],
    });
    if (latest.external_job.job_status === expectedStatus) {
      return latest;
    }
    await sleep(25);
  }
  assert.fail(`External job ${externalJobId} did not reach ${expectedStatus}; latest=${latest?.external_job.job_status}`);
}

async function syncRouteUntilTerminal(app: ReturnType<typeof buildApp>, externalJobId: string) {
  let latest;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    latest = await app.inject({
      method: 'POST',
      url: `/experiment-foundation/execution/jobs/${externalJobId}/sync`,
      payload: { source_refs: [sourceRef('test_case', 'route_sync')] },
    });
    if (latest.statusCode === 200 && latest.json().external_job.job_status === 'succeeded') {
      return latest;
    }
    await sleep(25);
  }
  return latest!;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
