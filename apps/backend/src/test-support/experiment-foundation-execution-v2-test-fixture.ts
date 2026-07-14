import type {
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';

import type {
  ExperimentFoundationExecutionV2Prerequisite,
} from '../repositories/experiment-foundation-execution-v2.repository.js';
import type {
  ExperimentFoundationExecutionV2ReadinessRevalidator,
} from '../services/experiment-foundation-execution-v2-service.js';

export const PACK_B_TEST_TIMESTAMP = '2026-07-13T12:00:00.000Z';

export function packBTestHash(character: string): string {
  return `sha256:${character.repeat(64)}`;
}

export function buildPackBExecutionPrerequisite(options: {
  cellCount?: number;
  retryCeiling?: number;
} = {}): ExperimentFoundationExecutionV2Prerequisite {
  const cellCount = options.cellCount ?? 2;
  const retryCeiling = options.retryCeiling ?? 2;
  const run = {
    run_id: 'ef_run_v2_pack_b_001',
    external_pi_work_order_revision_id: 'pi_revision_v2_pack_b_001',
    external_pi_work_order_revision_hash: packBTestHash('1'),
    external_pi_branch_revision_sequence: 7,
    run_manifest_hash: packBTestHash('2'),
    cell_count: cellCount,
    frozen_at: PACK_B_TEST_TIMESTAMP,
  } as const;
  const target: ExperimentFoundationV2ExactAssetRevisionRef = {
    asset_type: 'EvaluationProtocol',
    logical_id: 'ragperf-protocol-v2',
    revision_id: 'ef_protocol_revision_v2_pack_b_001',
    revision_sequence: 2,
    content_hash: packBTestHash('3'),
  };
  const dependency: ExperimentFoundationV2ExactAssetRevisionRef = {
    asset_type: 'Benchmark',
    logical_id: 'ragperf-benchmark',
    revision_id: 'ef_benchmark_revision_v2_pack_b_001',
    revision_sequence: 1,
    content_hash: packBTestHash('4'),
  };
  const acknowledgement = {
    inbox_id: 'ef_inbox_v2_pack_b_head_001',
    event_id: 'pi_outbox_v2_branch_head_advanced_001',
    event_payload_hash: packBTestHash('5'),
    implementation_project_id: 'pi_project_pack_b_001',
    validation_cycle_id: 'pi_cycle_pack_b_001',
    branch_id: 'pi_branch_v2_pack_b_001',
    work_order_revision_id: run.external_pi_work_order_revision_id,
    work_order_revision_hash: run.external_pi_work_order_revision_hash,
    revision_sequence: run.external_pi_branch_revision_sequence,
    run_id: run.run_id,
    run_manifest_hash: run.run_manifest_hash,
    processed_at: PACK_B_TEST_TIMESTAMP,
  };

  return {
    run: { ...run },
    run_recipe_id: 'ef_run_recipe_v2_pack_b_001',
    implementation_project_id: acknowledgement.implementation_project_id,
    validation_cycle_id: acknowledgement.validation_cycle_id,
    external_pi_branch_id: acknowledgement.branch_id,
    readiness: {
      readiness_attestation_id: 'ef_readiness_v2_pack_b_001',
      readiness_attestation_hash: packBTestHash('6'),
      target,
      ordered_dependencies: [{
        readiness_attestation_id: 'ef_readiness_v2_pack_b_001',
        ordinal: 1,
        dependency,
      }],
      evaluator_profile_version: 'experiment-foundation-readiness-v2@1',
      evaluator_profile_hash: packBTestHash('7'),
      dependency_manifest_hash: packBTestHash('8'),
      outcome: 'passed',
    },
    head_acknowledgement: { ...acknowledgement },
    latest_branch_head_acknowledgement: { ...acknowledgement },
    cells: Array.from({ length: cellCount }, (_, index) => {
      const ordinal = index + 1;
      const suffix = String(ordinal).padStart(3, '0');
      const taskSpecId = `ef_task_spec_v2_pack_b_${suffix}`;
      const taskSpecHash = packBTestHash(index % 2 === 0 ? 'a' : 'b');
      const externalCellId = `pi_cell_v2_pack_b_${suffix}`;
      const externalCellHash = packBTestHash(index % 2 === 0 ? 'c' : 'd');
      const cellKey = `ragperf-cell-${suffix}`;
      return {
        run_cell: {
          run_cell_id: `ef_run_cell_v2_pack_b_${suffix}`,
          run_id: run.run_id,
          ordinal,
          cell_key: cellKey,
          external_pi_cell_id: externalCellId,
          external_pi_cell_hash: externalCellHash,
          training_task_spec_id: taskSpecId,
          training_task_spec_hash: taskSpecHash,
          seed: ordinal * 11,
          repeat_index: 0,
        },
        task_spec: {
          training_task_spec_id: taskSpecId,
          materialization_key: `pack-b-task-spec:${suffix}`,
          run_recipe_id: 'ef_run_recipe_v2_pack_b_001',
          external_pi_work_order_revision_id: run.external_pi_work_order_revision_id,
          external_pi_work_order_revision_hash: run.external_pi_work_order_revision_hash,
          external_pi_cell_id: externalCellId,
          external_pi_cell_hash: externalCellHash,
          command_snapshot: {
            command: 'experiment-foundation-v2:materialize-cell',
            arguments: [cellKey],
          },
          io_snapshot: {
            input_keys: ['version_lock', 'admitted_cell'],
            output_keys: ['simulation_lifecycle_trace'],
          },
          resource_snapshot: { cpu_cores: 1, memory_mb: 512 },
          retry_snapshot: { max_attempts: retryCeiling },
          task_spec_hash: taskSpecHash,
          created_at: PACK_B_TEST_TIMESTAMP,
        },
        retry_ceiling: retryCeiling,
      };
    }),
  };
}

export function passingPackBReadinessRevalidator(
  prerequisite: ExperimentFoundationExecutionV2Prerequisite,
  onCall?: () => void,
): ExperimentFoundationExecutionV2ReadinessRevalidator {
  return {
    async revalidateReadiness() {
      onCall?.();
      return {
        attestation: {
          status: 'passed',
          attestation_hash: prerequisite.readiness.readiness_attestation_hash,
          evaluator_profile_version: prerequisite.readiness.evaluator_profile_version,
          evaluator_profile_hash: prerequisite.readiness.evaluator_profile_hash,
          dependency_manifest_hash: prerequisite.readiness.dependency_manifest_hash,
        },
      };
    },
  };
}

export function deterministicPackBIdGenerator(prefix = 'pack_b_test') {
  let sequence = 0;
  return (kind: 'payload' | 'attempt' | 'event' | 'command') => {
    sequence += 1;
    return `${prefix}_${kind}_${String(sequence).padStart(4, '0')}`;
  };
}

export function deterministicPackBWorkerIdGenerator(prefix = 'pack_b_worker_test') {
  let sequence = 0;
  return (kind: 'event' | 'command' | 'collection' | 'output') => {
    sequence += 1;
    return `${prefix}_${kind}_${String(sequence).padStart(4, '0')}`;
  };
}

export function mutablePackBClock(initial = PACK_B_TEST_TIMESTAMP) {
  let value = initial;
  return {
    now: () => value,
    advance(milliseconds: number) {
      value = new Date(Date.parse(value) + milliseconds).toISOString();
      return value;
    },
  };
}
