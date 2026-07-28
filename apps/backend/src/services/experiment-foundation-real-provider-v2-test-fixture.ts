import type {
  ExperimentFoundationAliyunRealProviderProfileV2,
  ExperimentFoundationExecutableTrainingTaskSpecV2,
  ExperimentFoundationExecutionBundleContent,
  ExperimentFoundationExecutionBundleRevisionV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';

import type {
  ExperimentFoundationRealProviderExecutionV2Prerequisite,
} from '../repositories/experiment-foundation-execution-v2.repository.js';

export const REAL_PROVIDER_TEST_NOW = '2026-07-23T00:00:00.000Z';
export const realProviderTestHash = (character: string) => `sha256:${character.repeat(64)}`;

export function createRealProviderV2TestFixture(options: {
  container_image_identity?: 'content_digest' | 'provider_managed_asset';
} = {}): {
  prerequisite: ExperimentFoundationRealProviderExecutionV2Prerequisite;
  bundle: ExperimentFoundationExecutionBundleRevisionV2;
  profile: ExperimentFoundationAliyunRealProviderProfileV2;
} {
  const hash = realProviderTestHash;
  const imageRef =
    'dsw-registry-vpc.cn-shanghai.cr.aliyuncs.com/pai/ragperf-official:py311-cpu';
  const revisionContent: ExperimentFoundationExecutionBundleContent =
    options.container_image_identity === 'provider_managed_asset'
      ? {
        execution_bundle_schema_version: 'v2',
        code_artifact: {
          artifact_ref: `oss://pea-m7-canary-test.oss-cn-shanghai-internal.aliyuncs.com/input/workload/${'2'.repeat(64)}/`,
          content_digest: hash('2'),
          byte_size: 1024,
        },
        container_image: {
          image_identity_kind: 'provider_managed_asset',
          image_ref: imageRef,
          provider_managed_asset: {
            provider: 'aliyun_pai',
            asset_id: 'image-test-provider-managed-v2',
            region_id: 'cn-shanghai',
            modified_at: '2026-07-02T04:35:35.000Z',
            size_bytes: 3_803_970_629,
            accessibility: 'PUBLIC',
            source_type: 'Import',
            permitted_scope: 'm7_l1_diagnostic_only',
          },
        },
        dataset_mirrors: [{
          ordinal: 1,
          dataset_revision: {
            asset_type: 'Dataset',
            logical_id: 'dataset-1',
            revision_id: 'dataset-revision-1',
            revision_sequence: 1,
            content_hash: hash('4'),
          },
          object_ref: `oss://pea-m7-canary-test.oss-cn-shanghai-internal.aliyuncs.com/input/scifact/${'5'.repeat(64)}/`,
          content_digest: hash('5'),
          byte_size: 2048,
        }],
        entrypoint: 'python3',
        arguments: ['/mnt/pea-code/entrypoint.py'],
        dependency_lock_digest: hash('6'),
        output_contract: {
          result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1',
          result_object_name: 'result.json',
          parser_profile_version: 'ragperf-parser-v1',
          parser_profile_hash: hash('7'),
        },
      }
      : {
        execution_bundle_schema_version: 'v1',
        code_artifact: {
          artifact_ref: `oss://pea-m7-canary-test.oss-cn-shanghai-internal.aliyuncs.com/input/workload/${'2'.repeat(64)}/`,
          content_digest: hash('2'),
          byte_size: 1024,
        },
        container_image: {
          image_ref: imageRef,
          image_digest: hash('3'),
        },
        dataset_mirrors: [{
          ordinal: 1,
          dataset_revision: {
            asset_type: 'Dataset',
            logical_id: 'dataset-1',
            revision_id: 'dataset-revision-1',
            revision_sequence: 1,
            content_hash: hash('4'),
          },
          object_ref: `oss://pea-m7-canary-test.oss-cn-shanghai-internal.aliyuncs.com/input/scifact/${'5'.repeat(64)}/`,
          content_digest: hash('5'),
          byte_size: 2048,
        }],
        entrypoint: 'python3',
        arguments: ['/mnt/pea-code/entrypoint.py'],
        dependency_lock_digest: hash('6'),
        output_contract: {
          result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1',
          result_object_name: 'result.json',
          parser_profile_version: 'ragperf-parser-v1',
          parser_profile_hash: hash('7'),
        },
      };
  const bundle: ExperimentFoundationExecutionBundleRevisionV2 = {
    execution_bundle_revision_id: 'execution-bundle-revision-1',
    execution_bundle_id: 'execution-bundle-1',
    revision_sequence: 1,
    schema_version: revisionContent.execution_bundle_schema_version,
    hash_profile: 'ef-execution-bundle-semantic-json@v1',
    content_hash: hash('1'),
    revision_content: revisionContent,
    created_at: REAL_PROVIDER_TEST_NOW,
  };
  const run = {
    run_id: 'run-real-1',
    external_pi_work_order_revision_id: 'work-order-revision-2',
    external_pi_work_order_revision_hash: hash('8'),
    external_pi_branch_revision_sequence: 2,
    run_manifest_hash: hash('9'),
    cell_count: 2,
    frozen_at: REAL_PROVIDER_TEST_NOW,
  };
  const tasks = ['a', 'b'].map((suffix, index): ExperimentFoundationExecutableTrainingTaskSpecV2 => ({
    training_task_spec_id: `task-${suffix}`,
    materialization_key: `task-materialization-${suffix}`,
    run_recipe_id: 'run-recipe-real-1',
    external_pi_work_order_revision_id: run.external_pi_work_order_revision_id,
    external_pi_work_order_revision_hash: run.external_pi_work_order_revision_hash,
    external_pi_cell_id: `pi-cell-${suffix}`,
    external_pi_cell_hash: hash(index === 0 ? 'a' : 'b'),
    execution_bundle: {
      execution_bundle_id: bundle.execution_bundle_id,
      execution_bundle_revision_id: bundle.execution_bundle_revision_id,
      revision_sequence: bundle.revision_sequence,
      content_hash: bundle.content_hash,
    },
    command_snapshot: {
      command: 'python3',
      arguments: ['/mnt/pea-code/entrypoint.py', `--cell-key=cell-${suffix}`],
    },
    io_snapshot: {
      input_keys: ['dataset-mirror-1'],
      output_keys: ['real_provider_result_envelope'],
      input_mirror_ordinals: [1],
      result_object_name: 'result.json',
      result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1',
      parser_profile_version: 'ragperf-parser-v1',
      parser_profile_hash: hash('7'),
    },
    resource_snapshot: { cpu_cores: 1, memory_mb: 1024 },
    retry_snapshot: { max_attempts: 1, timeout_seconds: 600 },
    task_spec_hash: hash(index === 0 ? 'c' : 'd'),
    created_at: REAL_PROVIDER_TEST_NOW,
  }));
  const acknowledgement = {
    inbox_id: 'head-ack-1',
    event_id: 'head-event-1',
    event_payload_hash: hash('e'),
    implementation_project_id: 'project-1',
    validation_cycle_id: 'cycle-1',
    branch_id: 'branch-1',
    work_order_revision_id: run.external_pi_work_order_revision_id,
    work_order_revision_hash: run.external_pi_work_order_revision_hash,
    revision_sequence: run.external_pi_branch_revision_sequence,
    run_id: run.run_id,
    run_manifest_hash: run.run_manifest_hash,
    processed_at: REAL_PROVIDER_TEST_NOW,
  };
  const prerequisite: ExperimentFoundationRealProviderExecutionV2Prerequisite = {
    run,
    run_recipe_id: 'run-recipe-real-1',
    implementation_project_id: 'project-1',
    validation_cycle_id: 'cycle-1',
    external_pi_branch_id: 'branch-1',
    readiness: {
      readiness_attestation_id: 'readiness-1',
      readiness_attestation_hash: hash('f'),
      target: {
        asset_type: 'EvaluationProtocol',
        logical_id: 'protocol-1',
        revision_id: 'protocol-revision-1',
        revision_sequence: 1,
        content_hash: hash('0'),
      },
      ordered_dependencies: [{
        readiness_attestation_id: 'readiness-1',
        ordinal: 1,
        dependency: {
          asset_type: 'Dataset',
          logical_id: 'dataset-1',
          revision_id: 'dataset-revision-1',
          revision_sequence: 1,
          content_hash: hash('4'),
        },
      }],
      evaluator_profile_version: 'readiness-v1',
      evaluator_profile_hash: hash('a'),
      dependency_manifest_hash: hash('b'),
      outcome: 'passed',
    },
    head_acknowledgement: acknowledgement,
    latest_branch_head_acknowledgement: acknowledgement,
    cells: tasks.map((task, index) => ({
      run_cell: {
        run_cell_id: `run-cell-${index + 1}`,
        run_id: run.run_id,
        ordinal: index + 1,
        cell_key: `cell-${index === 0 ? 'a' : 'b'}`,
        external_pi_cell_id: task.external_pi_cell_id,
        external_pi_cell_hash: task.external_pi_cell_hash,
        training_task_spec_id: task.training_task_spec_id,
        training_task_spec_hash: task.task_spec_hash,
        seed: index + 1,
        repeat_index: 1,
      },
      task_spec: task,
      retry_ceiling: 1,
    })),
  };
  return {
    prerequisite,
    bundle,
    profile: {
      schema_version: 'AliyunPaiDlcRealProviderProfile@v1',
      region_id: 'cn-shanghai',
      workspace_id: 'workspace-secret-ref',
      resource_binding: {
        mode: 'public_resource',
        ecs_spec: 'ecs.test.large',
        cpu_cores: 1,
        memory_mb: 1024,
      },
      image_uri: imageRef,
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
          'oss://pea-m7-canary-test.oss-cn-shanghai-internal.aliyuncs.com/output/',
      },
    },
  };
}
