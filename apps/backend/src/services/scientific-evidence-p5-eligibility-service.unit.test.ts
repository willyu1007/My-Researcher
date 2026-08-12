import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ExperimentFoundationRunCellV2,
  ExperimentFoundationV2EvaluationProtocolRevisionContentV2,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import type {
  ExperimentFoundationExecutableTrainingTaskSpecV2,
  ExperimentFoundationExecutionBundleRevisionV2,
  ExperimentFoundationExecutionBundleExactRevisionRefV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import type {
  PaperImplementationExperimentV2ExactCellInput,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import {
  serverHashExperimentFoundationExecutionBundleRevisionV2,
  serverHashExperimentFoundationV2AssetRevision,
  serverHashExperimentFoundationV2RunManifest,
  serverHashExperimentFoundationV2TrainingTaskSpec,
  serverHashPaperImplementationExperimentV2Cell,
  serverHashPaperImplementationExperimentV2WorkOrderRevision,
  serverHashScientificEvidenceP5ControlPlaneSessionPolicyV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import {
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_VERSION_V1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-source-v1-contracts';

import {
  buildScientificEvidenceP5AuthoritySnapshotV1,
  buildScientificEvidenceP5ExecutionPackageV3,
  buildScientificEvidenceP5OperationalTimelineV3,
  preflightScientificEvidenceP5PackageV3,
  SCIENTIFIC_EVIDENCE_P5_AUTHORITY_SNAPSHOT_SCHEMA_V1,
  SCIENTIFIC_EVIDENCE_P5_CONTROL_PLANE_CREDENTIAL_SCHEMA_V2,
  SCIENTIFIC_EVIDENCE_P5_EXECUTION_PACKAGE_SCHEMA_V3,
  type ScientificEvidenceP5AuthoritySnapshotContentV1,
  type ScientificEvidenceP5ControlPlaneSessionPolicyV1,
  type ScientificEvidenceP5ExecutionPackageContentV3,
  type ScientificEvidenceP5ExecutionPackageV3,
} from './scientific-evidence-p5-eligibility-service.js';
import {
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_HASH_V1,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_VERSION_V1,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_HASH_V1,
} from './experiment-foundation-scientific-source-v1-service.js';

const hash = (character: string) => `sha256:${character.repeat(64)}`;

function asset(
  assetType: ExperimentFoundationV2ExactAssetRevisionRef['asset_type'],
  logicalId: string,
  revisionId: string,
  contentHash: string,
): ExperimentFoundationV2ExactAssetRevisionRef {
  return {
    asset_type: assetType,
    logical_id: logicalId,
    revision_id: revisionId,
    revision_sequence: 1,
    content_hash: contentHash,
  };
}

function packageContent(): ScientificEvidenceP5ExecutionPackageContentV3 {
  const dataset = asset('Dataset', 'dataset-1', 'dataset-r1', hash('1'));
  const benchmark = {
    ...asset('Benchmark', 'benchmark-1', 'benchmark-r1', hash('2')),
    asset_type: 'Benchmark' as const,
  };
  const metric = {
    ...asset('MetricDefinition', 'metric-quality', 'metric-quality-r1', hash('3')),
    asset_type: 'MetricDefinition' as const,
  };
  const protocolContent: ExperimentFoundationV2EvaluationProtocolRevisionContentV2 = {
    schema_version: 'v2',
    protocol_key: 'p5-scifact-recall',
    display_name: 'P5 SciFact micro-recall protocol',
    benchmark_dependency: benchmark,
    metric_dependencies: [metric],
    required_rules: [{
      rule_id: 'metric-micro-recall-ppm-required',
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
        observation_key: 'micro_recall_ppm',
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
        comparison_key: 'primary-micro-recall-ppm',
        ordinal: 1,
        left_cell_ordinal: 1,
        right_cell_ordinal: 2,
        observation_key: 'micro_recall_ppm',
        effect_kind: 'absolute_difference',
        direction: 'higher_is_support',
        support_min: 1,
        contradiction_max: -1,
        uncertainty_policy: { kind: 'not_required_by_protocol' },
      }],
      primary_comparison_key: 'primary-micro-recall-ppm',
      decision_if_positive: 'retain_proposal',
      decision_if_negative: 'revise_proposal',
      decision_if_inconclusive: 'collect_more_evidence',
    },
  };
  const protocol = {
    ...asset(
      'EvaluationProtocol',
      'evaluation-protocol-1',
      'evaluation-protocol-r1',
      serverHashExperimentFoundationV2AssetRevision({
        asset_type: 'EvaluationProtocol',
        content: protocolContent,
      }),
    ),
    asset_type: 'EvaluationProtocol' as const,
  };
  const executionBundleContent: ExperimentFoundationExecutionBundleRevisionV2['revision_content'] = {
    execution_bundle_schema_version: 'v2',
    code_artifact: {
      artifact_ref: `oss://p5-bucket/input/workload/${'4'.repeat(64)}/`,
      content_digest: hash('4'),
      byte_size: 4_096,
    },
    container_image: {
      image_identity_kind: 'provider_managed_asset',
      image_ref:
        'dsw-registry-vpc.cn-shanghai.cr.aliyuncs.com/pai/torcheasyrec:1.3.0-pytorch2.12.1-cpu-py311-ubuntu22.04',
      provider_managed_asset: {
        provider: 'aliyun_pai',
        asset_id: 'image-p5-scientific',
        region_id: 'cn-shanghai',
        modified_at: '2026-07-02T04:35:35.000Z',
        size_bytes: 3_803_970_629,
        accessibility: 'PUBLIC',
        source_type: 'Import',
        permitted_scope: 'm0_sci_p5_scientific_only',
      },
    },
    dataset_mirrors: [{
      ordinal: 1,
      dataset_revision: { ...dataset, asset_type: 'Dataset' },
      object_ref: `oss://p5-bucket/input/scifact/${'1'.repeat(64)}/`,
      content_digest: hash('1'),
      byte_size: 8_106_566,
    }],
    entrypoint: 'python3',
    arguments: ['/mnt/code/entrypoint.py'],
    dependency_lock_digest: hash('d'),
    output_contract: {
      result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1',
      result_object_name: 'result.json',
      parser_profile_version: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_VERSION_V1,
      parser_profile_hash: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_HASH_V1,
      scientific_result_schema_version:
        EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_VERSION_V1,
      scientific_result_schema_hash: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_HASH_V1,
    },
  };
  const executionBundleRevision: ExperimentFoundationExecutionBundleRevisionV2 = {
    execution_bundle_revision_id: 'bundle-r1',
    execution_bundle_id: 'bundle-1',
    revision_sequence: 1,
    schema_version: 'v2',
    hash_profile: 'ef-execution-bundle-semantic-json@v1',
    content_hash: serverHashExperimentFoundationExecutionBundleRevisionV2(
      executionBundleContent,
    ),
    revision_content: executionBundleContent,
    created_at: '2026-08-10T00:45:00.000Z',
  };
  const executionBundle: ExperimentFoundationExecutionBundleExactRevisionRefV2 = {
    execution_bundle_id: executionBundleRevision.execution_bundle_id,
    execution_bundle_revision_id: executionBundleRevision.execution_bundle_revision_id,
    revision_sequence: executionBundleRevision.revision_sequence,
    content_hash: executionBundleRevision.content_hash,
  };
  const workOrderSnapshot = {
    work_order_schema_version: 'v2' as const,
    title: 'P5 exact two-cell acceptance',
    objective: 'Exercise the real scientific evidence closure chain.',
    readiness_attestation_id: 'readiness-1',
    readiness_attestation_hash: hash('5'),
    asset_dependencies: [dataset, benchmark, metric, protocol],
    execution_bundle: executionBundle,
    resource_snapshot: { cpu_cores: 2, memory_mb: 4_096 },
    run_policy: { max_attempts_per_cell: 1, timeout_seconds: 1_800 },
  };
  const workOrderRevision = {
    id: 'work-order-r1',
    content_hash: serverHashPaperImplementationExperimentV2WorkOrderRevision(workOrderSnapshot),
    snapshot: workOrderSnapshot,
  };
  const cellInputs: [
    PaperImplementationExperimentV2ExactCellInput,
    PaperImplementationExperimentV2ExactCellInput,
  ] = [
    exactCell('retriever-top-k-10', 10, metric),
    exactCell('retriever-top-k-5', 5, metric),
  ];
  const cells = cellInputs.map((cellInput, index) => {
    const ordinal = (index + 1) as 1 | 2;
    const workOrderCellId = `work-order-cell-${ordinal}`;
    const cellHash = serverHashPaperImplementationExperimentV2Cell(cellInput);
    const task = taskSpec({
      ordinal,
      cellInput,
      workOrderCellId,
      cellHash,
      workOrderRevisionId: workOrderRevision.id,
      workOrderRevisionHash: workOrderRevision.content_hash,
      executionBundle,
    });
    const runCell: ExperimentFoundationRunCellV2 & { ordinal: 1 | 2 } = {
      run_cell_id: `run-cell-${ordinal}`,
      run_id: 'run-p5-1',
      ordinal,
      cell_key: cellInput.cell_key,
      external_pi_cell_id: workOrderCellId,
      external_pi_cell_hash: cellHash,
      training_task_spec_id: task.training_task_spec_id,
      training_task_spec_hash: task.task_spec_hash,
      seed: cellInput.seed,
      repeat_index: cellInput.repeat_index,
    };
    return { run_cell: runCell, work_order_cell_input: cellInput, training_task_spec: task };
  }) as ScientificEvidenceP5ExecutionPackageContentV3['ordered_cells'];
  const runManifestHash = serverHashExperimentFoundationV2RunManifest(
    cells.map((cell) => cell.run_cell),
  );
  const sessionPolicy: ScientificEvidenceP5ControlPlaneSessionPolicyV1 = {
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
        Resource: 'acs:paiworkspace:cn-shanghai:123:workspace/workspace-1',
      },
      {
        Sid: 'T136P5ControllerPassRuntimeRoleExact',
        Effect: 'Allow',
        Action: ['ram:PassRole'],
        Resource: 'acs:ram::123:role/p5-runtime',
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
        Resource: 'acs:oss:*:*:p5-results/attempt-1/*',
      },
      {
        Sid: 'T136P5ControllerCallerIdentity',
        Effect: 'Allow',
        Action: ['sts:GetCallerIdentity'],
        Resource: '*',
      },
    ],
  };

  return {
    schema_version: SCIENTIFIC_EVIDENCE_P5_EXECUTION_PACKAGE_SCHEMA_V3,
    p5_attempt_id: 't136-p5-scifact-attempt-2',
    authority: {
      implementation_project_id: 'implementation-project-1',
      validation_cycle_id: 'validation-cycle-1',
      branch_id: 'branch-1',
      branch_revision_sequence: 1,
      work_order_revision: workOrderRevision,
      run: {
        run_id: 'run-p5-1',
        external_pi_work_order_revision_id: workOrderRevision.id,
        external_pi_work_order_revision_hash: workOrderRevision.content_hash,
        external_pi_branch_revision_sequence: 1,
        run_manifest_hash: runManifestHash,
        cell_count: 2,
        frozen_at: '2026-08-10T01:00:00.000Z',
      },
    },
    evaluation_protocol: { revision: protocol, revision_content: protocolContent },
    execution_bundle_revision: executionBundleRevision,
    scientific_input_policy: {
      provenance: 'real_provider',
      source: 'ef_parsed_and_sealed_typed_observations',
      manual_result_import: 'forbidden',
      unfetched_artifact_byte_dependency: 'forbidden',
    },
    declared_differing_factor: { parameter_name: 'retrieval_top_k' },
    ordered_cells: cells,
    provider: {
      provider_kind: 'aliyun_pai_dlc',
      adapter_identity: 'aliyun_pai_dlc_official_sdk@v1',
      collection_reader_identity: 'aliyun_oss_exact_result_reader@v1',
      profile: {
        schema_version: 'AliyunPaiDlcRealProviderProfile@v1',
        region_id: 'cn-shanghai',
        workspace_id: 'workspace-1',
        resource_binding: {
          mode: 'public_resource',
          ecs_spec: 'ecs.c6.large',
          cpu_cores: 2,
          memory_mb: 4_096,
        },
        image_uri: executionBundleContent.container_image.image_ref,
        job_type: 'PyTorchJob',
        job_spec_type: 'Worker',
        pod_count: 1,
        workload_binding: {
          schema_version: 'AliyunPaiDlcWorkloadBinding@v1',
          runtime_role_arn: 'acs:ram::123:role/p5-runtime',
          code_mount_path: '/mnt/code',
          input_mount_root: '/mnt/input',
          output_mount_path: '/mnt/output',
          output_uri_prefix: 'oss://p5-results/attempt-1/',
        },
      },
    },
    authorized_operations: [
      {
        ordinal: 1,
        owner: 'ExperimentFoundation',
        operation: 'CreateJob',
        run_cell_id: 'run-cell-1',
      },
      {
        ordinal: 2,
        owner: 'ExperimentFoundation',
        operation: 'CreateJob',
        run_cell_id: 'run-cell-2',
      },
    ],
    cost_ceiling: {
      currency: 'CNY',
      per_operation_amount_minor: 2_500,
      total_amount_minor: 5_000,
    },
    operational_timeline: buildScientificEvidenceP5OperationalTimelineV3(
      '2026-08-10T02:00:00.000Z',
    ),
    credential_policy: {
      schema_version: SCIENTIFIC_EVIDENCE_P5_CONTROL_PLANE_CREDENTIAL_SCHEMA_V2,
      credential_ref: 'env://ALIBABA_CLOUD_TEMPORARY_CREDENTIAL',
      secret_material_included: false,
      source_principal: {
        identity_type: 'ram_user',
        arn: 'acs:ram::123:user/user_0002',
      },
      controller_role: {
        arn: 'acs:ram::123:role/pea-m7-canary-controller',
        max_session_duration_seconds: 3_600,
        trust_policy_hash: hash('b'),
        attached_policy: {
          name: 'pea-m7-canary-controller',
          type: 'Custom',
          version: 'v4',
          document_hash: hash('c'),
        },
      },
      role_session_name: 't136-p5-scifact-20260810-r4',
      session_policy: sessionPolicy,
      session_policy_hash: serverHashScientificEvidenceP5ControlPlaneSessionPolicyV1(
        sessionPolicy,
      ),
      issued_duration_seconds: 3_600,
      minimum_remaining_at_live_start_seconds: 2_400,
      credential_operations_stop_before_earliest_expiration_seconds: 360,
      automatic_expiration_not_after: '2026-08-10T03:15:00.000Z',
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
      target_fingerprint: hash('9'),
      recovery_fingerprint: hash('a'),
      recovery_point_created_at: '2026-08-10T00:30:00.000Z',
    },
  };
}

function exactCell(
  cellKey: string,
  topK: number,
  metric: ExperimentFoundationV2ExactAssetRevisionRef & { asset_type: 'MetricDefinition' },
): PaperImplementationExperimentV2ExactCellInput {
  return {
    cell_key: cellKey,
    seed: 42,
    repeat_index: 0,
    parameters: [
      { name: 'batch_size', value: 8 },
      { name: 'retrieval_top_k', value: topK },
    ],
    required_result_contract: {
      metrics: [{ metric_definition: metric, required_cardinality: 1 }],
      artifacts: [],
    },
  };
}

function taskSpec(input: {
  ordinal: 1 | 2;
  cellInput: PaperImplementationExperimentV2ExactCellInput;
  workOrderCellId: string;
  cellHash: string;
  workOrderRevisionId: string;
  workOrderRevisionHash: string;
  executionBundle: ExperimentFoundationExecutionBundleExactRevisionRefV2;
}): ExperimentFoundationExecutableTrainingTaskSpecV2 {
  const materializationKey = `p5-materialization:cell:${input.ordinal}`;
  const trainingTaskSpecId = `task-spec-${input.ordinal}`;
  const commandSnapshot = {
    command: 'python3',
    arguments: ['/mnt/code/entrypoint.py', `--cell-key=${input.cellInput.cell_key}`],
  };
  const ioSnapshot = {
    input_keys: ['version_lock', 'admitted_cell', 'dataset_mirror:1'],
    output_keys: ['real_provider_result_envelope'] as ['real_provider_result_envelope'],
    input_mirror_ordinals: [1],
    result_object_name: 'result.json',
    result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1' as const,
    parser_profile_version: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_VERSION_V1,
    parser_profile_hash: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_PARSER_HASH_V1,
    scientific_result_schema_version:
      EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_VERSION_V1,
    scientific_result_schema_hash: EXPERIMENT_FOUNDATION_SCIENTIFIC_RESULT_SCHEMA_HASH_V1,
  };
  const resourceSnapshot = { cpu_cores: 2, memory_mb: 4_096 };
  const retrySnapshot = { max_attempts: 1, timeout_seconds: 1_800 };
  const admittedCell = {
    ordinal: input.ordinal,
    work_order_cell_id: input.workOrderCellId,
    cell_key: input.cellInput.cell_key,
    cell_hash: input.cellHash,
    seed: input.cellInput.seed,
    repeat_index: input.cellInput.repeat_index,
    parameters: input.cellInput.parameters,
    required_result_contract: input.cellInput.required_result_contract,
  };
  const taskSpecHash = serverHashExperimentFoundationV2TrainingTaskSpec({
    task_spec_schema_version: 'v2',
    materialization_key: materializationKey,
    run_recipe_id: 'run-recipe-1',
    external_pi_work_order_revision_id: input.workOrderRevisionId,
    external_pi_work_order_revision_hash: input.workOrderRevisionHash,
    external_pi_cell_id: input.workOrderCellId,
    external_pi_cell_hash: input.cellHash,
    admitted_cell: admittedCell,
    execution_bundle: input.executionBundle,
    command_snapshot: commandSnapshot,
    io_snapshot: ioSnapshot,
    resource_snapshot: resourceSnapshot,
    retry_snapshot: retrySnapshot,
  });
  return {
    training_task_spec_id: trainingTaskSpecId,
    materialization_key: materializationKey,
    run_recipe_id: 'run-recipe-1',
    external_pi_work_order_revision_id: input.workOrderRevisionId,
    external_pi_work_order_revision_hash: input.workOrderRevisionHash,
    external_pi_cell_id: input.workOrderCellId,
    external_pi_cell_hash: input.cellHash,
    execution_bundle: input.executionBundle,
    command_snapshot: commandSnapshot,
    io_snapshot: ioSnapshot,
    resource_snapshot: resourceSnapshot,
    retry_snapshot: retrySnapshot,
    task_spec_hash: taskSpecHash,
    created_at: '2026-08-10T01:00:00.000Z',
  };
}

function authorityContent(
  executionPackage: ScientificEvidenceP5ExecutionPackageV3,
): ScientificEvidenceP5AuthoritySnapshotContentV1 {
  const [left, right] = executionPackage.ordered_cells;
  return {
    schema_version: SCIENTIFIC_EVIDENCE_P5_AUTHORITY_SNAPSHOT_SCHEMA_V1,
    source: 'named_local_postgres_authority',
    p5_attempt_id: executionPackage.p5_attempt_id,
    target_fingerprint: executionPackage.named_local.target_fingerprint,
    implementation_project_id: executionPackage.authority.implementation_project_id,
    validation_cycle_id: executionPackage.authority.validation_cycle_id,
    branch_id: executionPackage.authority.branch_id,
    branch_revision_sequence: executionPackage.authority.branch_revision_sequence,
    work_order_revision: {
      id: executionPackage.authority.work_order_revision.id,
      content_hash: executionPackage.authority.work_order_revision.content_hash,
    },
    run: {
      id: executionPackage.authority.run.run_id,
      content_hash: executionPackage.authority.run.run_manifest_hash,
    },
    run_is_frozen: true,
    ordered_cells: [
      authorityCell(1, left),
      authorityCell(2, right),
    ],
    existing_create_job_count: 0,
    existing_scientific_result_count: 0,
  };
}

function authorityCell<TOrdinal extends 1 | 2>(
  ordinal: TOrdinal,
  cell: ScientificEvidenceP5ExecutionPackageV3['ordered_cells'][number],
) {
  return {
    ordinal,
    run_cell_id: cell.run_cell.run_cell_id,
    work_order_cell: {
      id: cell.run_cell.external_pi_cell_id,
      content_hash: cell.run_cell.external_pi_cell_hash,
    },
    training_task_spec: {
      id: cell.training_task_spec.training_task_spec_id,
      content_hash: cell.training_task_spec.task_spec_hash,
    },
  };
}

function eligibleFixture() {
  const executionPackage = buildScientificEvidenceP5ExecutionPackageV3(packageContent());
  const authoritySnapshot = buildScientificEvidenceP5AuthoritySnapshotV1(
    authorityContent(executionPackage),
  );
  return { executionPackage, authoritySnapshot };
}

test('P5-ELIG-S deterministically admits one exact fresh two-cell package', () => {
  const input = eligibleFixture();
  const first = preflightScientificEvidenceP5PackageV3({
    execution_package: input.executionPackage,
    authority_snapshot: input.authoritySnapshot,
  });
  const second = preflightScientificEvidenceP5PackageV3({
    execution_package: structuredClone(input.executionPackage),
    authority_snapshot: structuredClone(input.authoritySnapshot),
  });
  assert.equal(first.status, 'eligible');
  assert.deepEqual(first.reason_codes, []);
  assert.deepEqual(second, first);
  assert.match(first.eligibility_record_hash, /^sha256:[0-9a-f]{64}$/);
});

test('revision-8 timeline freezes portal confirmation, dispatch and handoff margins', () => {
  const content = packageContent();
  const timeline = buildScientificEvidenceP5OperationalTimelineV3(
    '2026-08-10T02:00:00.000Z',
  );
  content.operational_timeline = timeline;
  content.credential_policy.minimum_remaining_at_live_start_seconds = 2_400;
  content.credential_policy.automatic_expiration_not_after = new Date(
    Date.parse(timeline.issuance.dispatch_not_after) + 3_600_000,
  ).toISOString();
  const executionPackage = buildScientificEvidenceP5ExecutionPackageV3(content);
  const authoritySnapshot = buildScientificEvidenceP5AuthoritySnapshotV1(
    authorityContent(executionPackage),
  );
  const result = preflightScientificEvidenceP5PackageV3({
    execution_package: executionPackage,
    authority_snapshot: authoritySnapshot,
  });
  assert.deepEqual(timeline.issuance, {
    not_before: '2026-08-10T02:00:00.000Z',
    portal_confirmation_start_not_after: '2026-08-10T02:13:00.000Z',
    dispatch_not_after: '2026-08-10T02:15:00.000Z',
    minimum_portal_confirmation_margin_seconds: 120,
  });
  assert.equal(timeline.qualification.expires_at, '2026-08-10T02:20:00.000Z');
  assert.deepEqual(result.reason_codes, []);
  assert.equal(result.status, 'eligible');
});

test('revision-13 attempt derives the exact r13 controller session convention', () => {
  const content = packageContent();
  const timeline = buildScientificEvidenceP5OperationalTimelineV3(
    '2026-08-10T02:00:00.000Z',
  );
  content.p5_attempt_id = 't136-p5-scifact-attempt-11';
  content.operational_timeline = timeline;
  content.credential_policy.role_session_name = 't136-p5-scifact-20260810-r13';
  content.credential_policy.minimum_remaining_at_live_start_seconds = 2_400;
  content.credential_policy.automatic_expiration_not_after = new Date(
    Date.parse(timeline.issuance.dispatch_not_after) + 3_600_000,
  ).toISOString();
  const executionPackage = buildScientificEvidenceP5ExecutionPackageV3(content);
  const authoritySnapshot = buildScientificEvidenceP5AuthoritySnapshotV1(
    authorityContent(executionPackage),
  );
  const result = preflightScientificEvidenceP5PackageV3({
    execution_package: executionPackage,
    authority_snapshot: authoritySnapshot,
  });
  assert.deepEqual(result.reason_codes, []);
  assert.equal(result.status, 'eligible');
});

test('every exact workload change produces a different package hash', () => {
  const first = buildScientificEvidenceP5ExecutionPackageV3(packageContent());
  const changed = packageContent();
  changed.provider.profile.workspace_id = 'workspace-2';
  const second = buildScientificEvidenceP5ExecutionPackageV3(changed);
  assert.notEqual(second.package_hash, first.package_hash);
});

test('post-build package drift and authority snapshot drift are both ineligible', () => {
  const input = eligibleFixture();
  input.executionPackage.provider.profile.region_id = 'cn-beijing';
  input.authoritySnapshot.run.content_hash = hash('d');
  const result = preflightScientificEvidenceP5PackageV3({
    execution_package: input.executionPackage,
    authority_snapshot: input.authoritySnapshot,
  });
  assert.equal(result.status, 'ineligible');
  assert.deepEqual(result.reason_codes.slice(0, 2), [
    'P5_ELIG_PACKAGE_HASH_MISMATCH',
    'P5_ELIG_AUTHORITY_BINDING_INVALID',
  ]);
});

test('eligibility rejects a second factor and authoritative cell-hash drift', () => {
  const input = eligibleFixture();
  input.executionPackage.ordered_cells[1].work_order_cell_input.parameters[0] = {
    name: 'batch_size', value: 16,
  };
  input.executionPackage = buildScientificEvidenceP5ExecutionPackageV3(input.executionPackage);
  const result = preflightScientificEvidenceP5PackageV3({
    execution_package: input.executionPackage,
    authority_snapshot: input.authoritySnapshot,
  });
  assert.ok(result.reason_codes.includes('P5_ELIG_CELL_BINDING_INVALID'));
  assert.ok(result.reason_codes.includes('P5_ELIG_EXPERIMENTAL_FACTOR_INVALID'));
});

test('eligibility rejects parser drift between cells', () => {
  const input = eligibleFixture();
  input.executionPackage.ordered_cells[1]
    .training_task_spec.io_snapshot.parser_profile_hash = hash('e');
  input.executionPackage = buildScientificEvidenceP5ExecutionPackageV3(input.executionPackage);
  const result = preflightScientificEvidenceP5PackageV3({
    execution_package: input.executionPackage,
    authority_snapshot: input.authoritySnapshot,
  });
  assert.ok(result.reason_codes.includes('P5_ELIG_COMPARABILITY_DRIFT'));
});

test('eligibility rejects a diagnostic scope or scientific bundle content drift', () => {
  const input = eligibleFixture();
  const revisionContent = input.executionPackage.execution_bundle_revision.revision_content;
  assert.equal(revisionContent.execution_bundle_schema_version, 'v2');
  revisionContent.container_image.provider_managed_asset.permitted_scope =
    'm7_l1_diagnostic_only';
  input.executionPackage = buildScientificEvidenceP5ExecutionPackageV3(input.executionPackage);
  const result = preflightScientificEvidenceP5PackageV3({
    execution_package: input.executionPackage,
    authority_snapshot: input.authoritySnapshot,
  });
  assert.ok(result.reason_codes.includes('P5_ELIG_EXECUTION_BUNDLE_INVALID'));
});

test('eligibility admits a post-Run recovery point captured before execution issuance', () => {
  const input = eligibleFixture();
  input.executionPackage.named_local.recovery_point_created_at = '2026-08-10T01:30:00.000Z';
  input.executionPackage = buildScientificEvidenceP5ExecutionPackageV3(input.executionPackage);
  const result = preflightScientificEvidenceP5PackageV3({
    execution_package: input.executionPackage,
    authority_snapshot: input.authoritySnapshot,
  });
  assert.deepEqual(result.reason_codes, []);
  assert.equal(result.status, 'eligible');
});

test('eligibility rejects protocol drift, short credential TTL and a post-issuance recovery point', () => {
  const input = eligibleFixture();
  const primaryRule = input.executionPackage.evaluation_protocol
    .revision_content.scientific_contract?.comparison_rules?.[0];
  assert.ok(primaryRule);
  primaryRule.support_min = 0.2;
  input.executionPackage.credential_policy.minimum_remaining_at_live_start_seconds = 3_299;
  input.executionPackage.named_local.recovery_point_created_at = '2026-08-10T02:00:00.001Z';
  input.executionPackage = buildScientificEvidenceP5ExecutionPackageV3(input.executionPackage);
  const result = preflightScientificEvidenceP5PackageV3({
    execution_package: input.executionPackage,
    authority_snapshot: input.authoritySnapshot,
  });
  assert.ok(result.reason_codes.includes('P5_ELIG_SCIENTIFIC_PROTOCOL_INVALID'));
  assert.ok(result.reason_codes.includes('P5_ELIG_CREDENTIAL_POLICY_INVALID'));
  assert.ok(result.reason_codes.includes('P5_ELIG_NAMED_LOCAL_RECOVERY_INVALID'));
});

test('eligibility rejects a controller/runtime role conflation and session-policy expansion', () => {
  const input = eligibleFixture();
  input.executionPackage.credential_policy.controller_role.arn =
    input.executionPackage.provider.profile.workload_binding.runtime_role_arn;
  input.executionPackage.credential_policy.session_policy.Statement[0]?.Action.push(
    'paidlc:DeleteJob',
  );
  input.executionPackage.credential_policy.session_policy_hash =
    serverHashScientificEvidenceP5ControlPlaneSessionPolicyV1(
      input.executionPackage.credential_policy.session_policy,
    );
  input.executionPackage = buildScientificEvidenceP5ExecutionPackageV3(input.executionPackage);
  const result = preflightScientificEvidenceP5PackageV3({
    execution_package: input.executionPackage,
    authority_snapshot: input.authoritySnapshot,
  });
  assert.ok(result.reason_codes.includes('P5_ELIG_CREDENTIAL_POLICY_INVALID'));
});

test('eligibility rejects a handoff budget below the frozen safety margin', () => {
  const input = eligibleFixture();
  input.executionPackage.operational_timeline.issuance.dispatch_not_after =
    '2026-08-10T02:01:00.000Z';
  input.executionPackage = buildScientificEvidenceP5ExecutionPackageV3(input.executionPackage);
  const result = preflightScientificEvidenceP5PackageV3({
    execution_package: input.executionPackage,
    authority_snapshot: input.authoritySnapshot,
  });
  assert.ok(result.reason_codes.includes('P5_ELIG_OPERATIONAL_TIMELINE_INVALID'));
});

test('eligibility rejects revision-8 portal confirmation margin drift', () => {
  const content = packageContent();
  const timeline = buildScientificEvidenceP5OperationalTimelineV3(
    '2026-08-10T02:00:00.000Z',
  );
  content.operational_timeline = timeline;
  content.credential_policy.minimum_remaining_at_live_start_seconds = 2_400;
  content.credential_policy.automatic_expiration_not_after = new Date(
    Date.parse(timeline.issuance.dispatch_not_after) + 3_600_000,
  ).toISOString();
  const executionPackage = buildScientificEvidenceP5ExecutionPackageV3(content);
  assert.equal(
    executionPackage.operational_timeline.schema_version,
    'ScientificEvidenceP5OperationalTimeline@v3',
  );
  if (
    executionPackage.operational_timeline.schema_version
      !== 'ScientificEvidenceP5OperationalTimeline@v3'
  ) assert.fail('Expected revision-8 operational timeline.');
  executionPackage.operational_timeline.issuance.portal_confirmation_start_not_after =
    '2026-08-10T02:14:00.000Z';
  const authoritySnapshot = buildScientificEvidenceP5AuthoritySnapshotV1(
    authorityContent(executionPackage),
  );
  const result = preflightScientificEvidenceP5PackageV3({
    execution_package: executionPackage,
    authority_snapshot: authoritySnapshot,
  });
  assert.ok(result.reason_codes.includes('P5_ELIG_PACKAGE_HASH_MISMATCH'));
  assert.ok(result.reason_codes.includes('P5_ELIG_OPERATIONAL_TIMELINE_INVALID'));
});

test('eligibility rejects fixed-start drift and an eroded credential cleanup margin', () => {
  const input = eligibleFixture();
  input.executionPackage.operational_timeline.live.latest_start_at =
    '2026-08-10T02:05:01.000Z';
  input.executionPackage.operational_timeline.live.credential_operations_stop_at =
    '2026-08-10T02:54:01.000Z';
  input.executionPackage = buildScientificEvidenceP5ExecutionPackageV3(input.executionPackage);
  const result = preflightScientificEvidenceP5PackageV3({
    execution_package: input.executionPackage,
    authority_snapshot: input.authoritySnapshot,
  });
  assert.ok(result.reason_codes.includes('P5_ELIG_OPERATIONAL_TIMELINE_INVALID'));
});

test('eligibility rejects operation, cost and capability expansion', () => {
  const input = eligibleFixture();
  input.executionPackage.authorized_operations[1].run_cell_id = 'unbound-cell';
  input.executionPackage.cost_ceiling.total_amount_minor = 5_001;
  input.executionPackage.operational_timeline.live.capability_keys.push(
    'UNDECLARED_CAPABILITY',
  );
  input.executionPackage = buildScientificEvidenceP5ExecutionPackageV3(input.executionPackage);
  const result = preflightScientificEvidenceP5PackageV3({
    execution_package: input.executionPackage,
    authority_snapshot: input.authoritySnapshot,
  });
  assert.ok(result.reason_codes.includes('P5_ELIG_OPERATION_BOUND_INVALID'));
  assert.ok(result.reason_codes.includes('P5_ELIG_COST_BOUND_INVALID'));
  assert.ok(result.reason_codes.includes('P5_ELIG_OPERATIONAL_TIMELINE_INVALID'));
});

test('eligibility rejects secret material and scientific outcome targets', () => {
  const input = eligibleFixture();
  const forbidden = input.executionPackage as ScientificEvidenceP5ExecutionPackageV3 & {
    secret_value?: string;
    expected_disposition?: string;
  };
  forbidden.secret_value = 'must-never-enter-a-package';
  forbidden.expected_disposition = 'supports_registered_expectation';
  const rebuilt = buildScientificEvidenceP5ExecutionPackageV3(forbidden);
  const result = preflightScientificEvidenceP5PackageV3({
    execution_package: rebuilt,
    authority_snapshot: buildScientificEvidenceP5AuthoritySnapshotV1(authorityContent(rebuilt)),
  });
  assert.ok(result.reason_codes.includes('P5_ELIG_FORBIDDEN_FIELD_PRESENT'));
});

test('eligibility rejects a reused run even when its identities still match', () => {
  const input = eligibleFixture();
  input.authoritySnapshot = buildScientificEvidenceP5AuthoritySnapshotV1({
    ...authorityContent(input.executionPackage),
    existing_create_job_count: 2,
    existing_scientific_result_count: 2,
  });
  const result = preflightScientificEvidenceP5PackageV3({
    execution_package: input.executionPackage,
    authority_snapshot: input.authoritySnapshot,
  });
  assert.deepEqual(result.reason_codes, ['P5_ELIG_RUN_NOT_FRESH_AND_FROZEN']);
});
