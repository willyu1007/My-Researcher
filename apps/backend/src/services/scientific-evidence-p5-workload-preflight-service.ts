import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';

import type {
  ExperimentFoundationProviderResultEnvelopeV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashExperimentV2SemanticContent,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import type {
  ExperimentFoundationCollectSucceededOutcomeV1,
  ExperimentFoundationRealProviderCollectSuccessV2,
} from './experiment-foundation-aliyun-real-provider-v2-transport.js';
import type {
  ScientificEvidenceP5ExecutionPackageV3,
} from './scientific-evidence-p5-eligibility-service.js';
import {
  ExperimentFoundationScientificSourcePreparationServiceV1,
} from './experiment-foundation-scientific-source-v1-service.js';

export interface ScientificEvidenceP5WorkloadPreflightResultV1 {
  status: 'sealed';
  sealed_cell_count: number;
  source_output_hashes: string[];
}

/**
 * Executes the exact local workload output builder, then runs the production scientific sealer.
 * Package creation must call this before an authorization artifact can become eligible.
 */
export async function assertScientificEvidenceP5WorkloadSealabilityV1(input: {
  execution_package: ScientificEvidenceP5ExecutionPackageV3;
  entrypoint_path: string;
}): Promise<ScientificEvidenceP5WorkloadPreflightResultV1> {
  await assertEntrypointIdentity(input);
  const executionPackage = input.execution_package;
  const preparer = new ExperimentFoundationScientificSourcePreparationServiceV1({
    protocolResolver: async (runId) => (
      runId === executionPackage.authority.run.run_id
        ? {
          evaluation_protocol: structuredClone(executionPackage.evaluation_protocol.revision),
          protocol_snapshot: structuredClone(
            executionPackage.evaluation_protocol.revision_content,
          ),
        }
        : null
    ),
  });
  const sourceOutputHashes: string[] = [];

  for (const cell of executionPackage.ordered_cells) {
    const outputs = await renderWorkloadOutputs(
      input.entrypoint_path,
      cell.run_cell.cell_key,
    );
    const envelope: ExperimentFoundationProviderResultEnvelopeV1 = {
      result_envelope_schema: cell.training_task_spec.io_snapshot.result_envelope_schema,
      execution_bundle_revision_id:
        cell.training_task_spec.execution_bundle.execution_bundle_revision_id,
      execution_bundle_revision_hash: cell.training_task_spec.execution_bundle.content_hash,
      run_id: cell.run_cell.run_id,
      run_manifest_hash: executionPackage.authority.run.run_manifest_hash,
      run_cell_id: cell.run_cell.run_cell_id,
      cell_key: cell.run_cell.cell_key,
      training_task_spec_id: cell.training_task_spec.training_task_spec_id,
      training_task_spec_hash: cell.training_task_spec.task_spec_hash,
      parser_profile_version: cell.training_task_spec.io_snapshot.parser_profile_version,
      parser_profile_hash: cell.training_task_spec.io_snapshot.parser_profile_hash,
      outputs,
    };
    const prepared = await preparer.prepare({
      collect_success: collectSuccess(envelope, cell.run_cell.ordinal),
      collection_attempt_id: `p5-preflight-collection-${cell.run_cell.ordinal}`,
      execution_attempt_id: `p5-preflight-execution-${cell.run_cell.ordinal}`,
      run_manifest_hash: executionPackage.authority.run.run_manifest_hash,
      run_cell: cell.run_cell,
      task_spec: cell.training_task_spec,
    });
    if (prepared.status !== 'sealed') {
      throw new Error(
        `T136_P5_WORKLOAD_SCIENTIFIC_SOURCE_PREFLIGHT_${prepared.reason.toUpperCase()}`,
      );
    }
    sourceOutputHashes.push(prepared.source_output_hash);
  }

  return {
    status: 'sealed',
    sealed_cell_count: sourceOutputHashes.length,
    source_output_hashes: sourceOutputHashes,
  };
}

async function assertEntrypointIdentity(input: {
  execution_package: ScientificEvidenceP5ExecutionPackageV3;
  entrypoint_path: string;
}): Promise<void> {
  let bytes: Buffer;
  try {
    bytes = await fs.readFile(input.entrypoint_path);
  } catch (error) {
    throw new Error('T136_P5_WORKLOAD_ENTRYPOINT_READ_FAILED', { cause: error });
  }
  const expected = input.execution_package.execution_bundle_revision
    .revision_content.code_artifact;
  const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  if (digest !== expected.content_digest || bytes.byteLength !== expected.byte_size) {
    throw new Error('T136_P5_WORKLOAD_ENTRYPOINT_IDENTITY_MISMATCH');
  }
}

function renderWorkloadOutputs(
  entrypointPath: string,
  cellKey: string,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    execFile(
      'python3',
      [entrypointPath, '--cell-key', cellKey, '--scientific-preflight'],
      { encoding: 'utf8', maxBuffer: 1_048_576, timeout: 30_000 },
      (error, stdout, stderr) => {
        if (error || stderr.trim().length > 0) {
          reject(new Error('T136_P5_WORKLOAD_SCIENTIFIC_PREFLIGHT_EXECUTION_FAILED', {
            cause: error ?? new Error('Scientific preflight wrote to stderr.'),
          }));
          return;
        }
        try {
          const parsed: unknown = JSON.parse(stdout.trim());
          if (!isRecord(parsed)) {
            throw new Error('Scientific preflight output must be an object.');
          }
          resolve(parsed);
        } catch (parseError) {
          reject(new Error('T136_P5_WORKLOAD_SCIENTIFIC_PREFLIGHT_OUTPUT_INVALID', {
            cause: parseError,
          }));
        }
      },
    );
  });
}

function collectSuccess(
  envelope: ExperimentFoundationProviderResultEnvelopeV1,
  ordinal: number,
): ExperimentFoundationRealProviderCollectSuccessV2 {
  const canonical = canonicalizeExperimentV2Json(envelope);
  const outcome: ExperimentFoundationCollectSucceededOutcomeV1 = {
    outcome_schema_version: 'AliyunPaiDlcNormalizedOutcome@v1',
    adapter_identity: 'aliyun_pai_dlc_official_sdk@v1',
    operation: 'collect',
    provider_idempotency_key: `p5-preflight-provider-${ordinal}`,
    payload_hash: hash('1'),
    external_job_ref: {
      ref_type: 'aliyun_pai_dlc_job',
      job_id: `p5-preflight-job-${ordinal}`,
      region_id_hash: hash('2'),
    },
    provider_status: 'Succeeded',
    normalized_state: 'succeeded',
    result_manifest_hash: hash('3'),
    response_hash: hash('4'),
  };
  return {
    outcome,
    validated_result: {
      handoff_schema_version: 'ExperimentFoundationValidatedProviderResultEnvelope@v1',
      canonical_envelope_json: canonical,
      envelope_content_hash: serverHashExperimentV2SemanticContent({
        record_kind: 'AliyunPaiDlcCollectedResultEnvelope',
        schema_version: 'v1',
        hash_profile: 'ef-real-provider-control-json@v1',
        content: envelope,
      }),
      envelope_byte_size: Buffer.byteLength(canonical, 'utf8'),
    },
  };
}

function hash(character: string): string {
  return `sha256:${character.repeat(64)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
