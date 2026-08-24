import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import type {
  ExperimentFoundationExternalTrainingJobStatus,
  ExperimentFoundationRef,
  ResultArtifact,
  ResultLogRef,
  ResultMetricValue,
  TrainingTaskSpec,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-contracts';
import { AppError } from '../errors/app-error.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

export type AdapterSubmitResult = {
  externalJobRef: ExperimentFoundationRef;
  externalJobHash: string;
  status: ExperimentFoundationExternalTrainingJobStatus;
  submittedAt: string;
  completedAt: string | null;
  metadata: Record<string, unknown>;
};

export type AdapterStatusResult = {
  status: ExperimentFoundationExternalTrainingJobStatus;
  syncedAt: string;
  completedAt: string | null;
  metadata: Record<string, unknown>;
};

export type AdapterCollectResult = {
  status: ExperimentFoundationExternalTrainingJobStatus;
  metrics: ResultMetricValue[];
  artifacts: ResultArtifact[];
  logs: ResultLogRef[];
  configSnapshotRef: ExperimentFoundationRef;
  configSnapshotHash: string;
  metadata: Record<string, unknown>;
};

export interface TrainingPlatformAdapter {
  readonly adapterKind: 'local_script' | 'aliyun_pai_dlc';
  submit(taskSpec: TrainingTaskSpec): Promise<AdapterSubmitResult>;
  getStatus(externalJobRef: ExperimentFoundationRef): Promise<AdapterStatusResult>;
  reconcile(externalJobRef: ExperimentFoundationRef): Promise<AdapterStatusResult>;
  cancel(externalJobRef: ExperimentFoundationRef, reason: string): Promise<AdapterStatusResult>;
  collectResults(taskSpec: TrainingTaskSpec, externalJobRef: ExperimentFoundationRef): Promise<AdapterCollectResult>;
}

type LocalJobState = {
  status: ExperimentFoundationExternalTrainingJobStatus;
  submittedAt: string;
  completedAt: string | null;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  outputTruncated: boolean;
};

const MAX_LOCAL_OUTPUT_BYTES = 1024 * 1024;

export class LocalScriptAdapter implements TrainingPlatformAdapter {
  readonly adapterKind = 'local_script' as const;
  private readonly jobs = new Map<string, LocalJobState>();
  private readonly children = new Map<string, ChildProcessWithoutNullStreams>();

  async submit(taskSpec: TrainingTaskSpec): Promise<AdapterSubmitResult> {
    const root = resolveExecutionRoot();
    assertLocalExecutionEnabled();
    assertAllowedCommand(taskSpec.command);
    const cwd = resolveTaskWorkingDirectory(root, taskSpec);
    await mkdir(cwd, { recursive: true });
    const submittedAt = nowIso();
    const refId = `local_script_${sha256Text(`${taskSpec.training_task_spec_id}:${submittedAt}`).slice(0, 24)}`;
    const state: LocalJobState = {
      status: 'running',
      submittedAt,
      completedAt: null,
      stdout: '',
      stderr: '',
      exitCode: null,
      timedOut: false,
      outputTruncated: false,
    };
    this.jobs.set(refId, state);
    this.children.set(
      refId,
      spawnLocalCommand(refId, state, taskSpec.command, taskSpec.args, cwd, taskSpec.timeout_seconds, () => {
        this.children.delete(refId);
      }),
    );
    const externalJobRef = { ref_type: 'local_script_process', ref_id: refId };
    return {
      externalJobRef,
      externalJobHash: hashPayload({ externalJobRef, state }),
      status: state.status,
      submittedAt,
      completedAt: null,
      metadata: state,
    };
  }

  async getStatus(externalJobRef: ExperimentFoundationRef): Promise<AdapterStatusResult> {
    const state = this.jobs.get(externalJobRef.ref_id);
    if (!state) {
      return {
        status: 'unknown',
        syncedAt: nowIso(),
        completedAt: null,
        metadata: { reason: 'local job state not found' },
      };
    }
    return {
      status: state.status,
      syncedAt: nowIso(),
      completedAt: state.completedAt,
      metadata: state,
    };
  }

  async reconcile(externalJobRef: ExperimentFoundationRef): Promise<AdapterStatusResult> {
    return this.getStatus(externalJobRef);
  }

  async cancel(externalJobRef: ExperimentFoundationRef, reason: string): Promise<AdapterStatusResult> {
    const state = this.jobs.get(externalJobRef.ref_id);
    if (!state) {
      return {
        status: 'unknown',
        syncedAt: nowIso(),
        completedAt: null,
        metadata: { reason: 'local job state not found' },
      };
    }
    const child = this.children.get(externalJobRef.ref_id);
    const terminal = state.status === 'succeeded' || state.status === 'failed' || state.status === 'cancelled';
    const cancelled: LocalJobState = state;
    if (!terminal) {
      cancelled.status = child ? 'cancelling' : 'cancelled';
      cancelled.completedAt = child ? null : state.completedAt ?? nowIso();
      cancelled.stderr = appendLocalOutput(cancelled.stderr, `cancel requested: ${reason}\n`, cancelled);
    }
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }
    this.jobs.set(externalJobRef.ref_id, cancelled);
    return {
      status: cancelled.status,
      syncedAt: nowIso(),
      completedAt: cancelled.completedAt,
      metadata: cancelled,
    };
  }

  async collectResults(taskSpec: TrainingTaskSpec, externalJobRef: ExperimentFoundationRef): Promise<AdapterCollectResult> {
    const state = this.jobs.get(externalJobRef.ref_id);
    if (!state) {
      throw new AppError(404, 'NOT_FOUND', `Local script job ${externalJobRef.ref_id} not found.`);
    }
    if (state.status === 'running' || state.status === 'queued' || state.status === 'submitted' || state.status === 'cancelling') {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `Local script job ${externalJobRef.ref_id} is not terminal.`);
    }
    return buildCollectedResult(taskSpec, externalJobRef, state.status, {
      stdout: state.stdout,
      stderr: state.stderr,
      exit_code: state.exitCode,
      timed_out: state.timedOut,
      output_truncated: state.outputTruncated,
    });
  }
}

export type AliyunPaiDlcClient = {
  submit(taskSpec: TrainingTaskSpec): Promise<AdapterSubmitResult>;
  getStatus(externalJobRef: ExperimentFoundationRef): Promise<AdapterStatusResult>;
  reconcile?(externalJobRef: ExperimentFoundationRef): Promise<AdapterStatusResult>;
  cancel(externalJobRef: ExperimentFoundationRef, reason: string): Promise<AdapterStatusResult>;
  collectResults(taskSpec: TrainingTaskSpec, externalJobRef: ExperimentFoundationRef): Promise<AdapterCollectResult>;
};

export class AliyunPaiDlcAdapter implements TrainingPlatformAdapter {
  readonly adapterKind = 'aliyun_pai_dlc' as const;

  constructor(private readonly client: AliyunPaiDlcClient = new FakeAliyunPaiDlcClient()) {}

  submit(taskSpec: TrainingTaskSpec): Promise<AdapterSubmitResult> {
    return this.client.submit(taskSpec);
  }

  getStatus(externalJobRef: ExperimentFoundationRef): Promise<AdapterStatusResult> {
    return this.client.getStatus(externalJobRef);
  }

  reconcile(externalJobRef: ExperimentFoundationRef): Promise<AdapterStatusResult> {
    return this.client.reconcile?.(externalJobRef) ?? this.client.getStatus(externalJobRef);
  }

  cancel(externalJobRef: ExperimentFoundationRef, reason: string): Promise<AdapterStatusResult> {
    return this.client.cancel(externalJobRef, reason);
  }

  collectResults(taskSpec: TrainingTaskSpec, externalJobRef: ExperimentFoundationRef): Promise<AdapterCollectResult> {
    return this.client.collectResults(taskSpec, externalJobRef);
  }
}

class FakeAliyunPaiDlcClient implements AliyunPaiDlcClient {
  private readonly jobs = new Map<string, ExperimentFoundationExternalTrainingJobStatus>();

  async submit(taskSpec: TrainingTaskSpec): Promise<AdapterSubmitResult> {
    const submittedAt = nowIso();
    const refId = `aliyun_pai_dlc_${sha256Text(`${taskSpec.training_task_spec_id}:${submittedAt}`).slice(0, 24)}`;
    this.jobs.set(refId, 'running');
    const externalJobRef = { ref_type: 'aliyun_pai_dlc_job', ref_id: refId };
    return {
      externalJobRef,
      externalJobHash: hashPayload({ externalJobRef, task_spec_id: taskSpec.training_task_spec_id }),
      status: 'running',
      submittedAt,
      completedAt: null,
      metadata: { mocked: true },
    };
  }

  async getStatus(externalJobRef: ExperimentFoundationRef): Promise<AdapterStatusResult> {
    return {
      status: this.jobs.get(externalJobRef.ref_id) ?? 'unknown',
      syncedAt: nowIso(),
      completedAt: null,
      metadata: { mocked: true },
    };
  }

  async reconcile(externalJobRef: ExperimentFoundationRef): Promise<AdapterStatusResult> {
    return this.getStatus(externalJobRef);
  }

  async cancel(externalJobRef: ExperimentFoundationRef, reason: string): Promise<AdapterStatusResult> {
    this.jobs.set(externalJobRef.ref_id, 'cancelled');
    return {
      status: 'cancelled',
      syncedAt: nowIso(),
      completedAt: nowIso(),
      metadata: { mocked: true, reason },
    };
  }

  async collectResults(taskSpec: TrainingTaskSpec, externalJobRef: ExperimentFoundationRef): Promise<AdapterCollectResult> {
    this.jobs.set(externalJobRef.ref_id, 'succeeded');
    return buildCollectedResult(taskSpec, externalJobRef, 'succeeded', { mocked: true });
  }
}

function resolveExecutionRoot(): string {
  return path.resolve(
    process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ROOT
      ?? path.join(process.cwd(), 'artifacts/experiment-foundation-local-execution'),
  );
}

function assertLocalExecutionEnabled(): void {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  const enabled = (process.env.EXPERIMENT_FOUNDATION_LOCAL_EXECUTION_ENABLED ?? '').trim().toLowerCase();
  if (enabled !== 'true' && enabled !== '1' && enabled !== 'yes') {
    throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'LocalScript execution is not enabled.');
  }
}

function assertAllowedCommand(command: string): void {
  const configured = process.env.EXPERIMENT_FOUNDATION_LOCAL_SCRIPT_ALLOWED_COMMANDS;
  const allowlist = configured
    ? configured.split(',').map((item) => item.trim()).filter(Boolean)
    : process.env.NODE_ENV === 'test'
      ? [process.execPath, 'node']
      : [];
  const commandBase = path.basename(command);
  if (!allowlist.includes(command) && !allowlist.includes(commandBase)) {
    throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `LocalScript command ${command} is not allowed.`);
  }
}

function resolveTaskWorkingDirectory(root: string, taskSpec: TrainingTaskSpec): string {
  const requested = typeof taskSpec.output_contract.working_directory === 'string'
    ? taskSpec.output_contract.working_directory
    : root;
  const resolved = path.isAbsolute(requested)
    ? path.resolve(requested)
    : path.resolve(root, requested);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'LocalScript working directory must stay inside execution root.');
  }
  return resolved;
}

function spawnLocalCommand(
  refId: string,
  state: LocalJobState,
  command: string,
  args: string[],
  cwd: string,
  timeoutSeconds: number,
  onFinished: () => void,
): ChildProcessWithoutNullStreams {
  const child = spawn(command, args, { cwd, shell: false, env: sanitizedLocalProcessEnv() });
  let finished = false;
  const finishOnce = () => {
    if (finished) {
      return;
    }
    finished = true;
    onFinished();
  };
  const timer = timeoutSeconds > 0
    ? setTimeout(() => {
        state.timedOut = true;
        state.stderr = appendLocalOutput(state.stderr, `timeout after ${timeoutSeconds}s\n`, state);
        child.kill('SIGTERM');
      }, timeoutSeconds * 1000)
    : null;
  child.stdout.on('data', (chunk: Buffer) => {
    state.stdout = appendLocalOutput(state.stdout, chunk.toString('utf8'), state);
  });
  child.stderr.on('data', (chunk: Buffer) => {
    state.stderr = appendLocalOutput(state.stderr, chunk.toString('utf8'), state);
  });
  child.on('error', (error) => {
    if (timer) {
      clearTimeout(timer);
    }
    state.status = 'failed';
    state.completedAt = nowIso();
    state.stderr = appendLocalOutput(state.stderr, `spawn error for ${refId}: ${error.message}\n`, state);
    finishOnce();
  });
  child.on('close', (code) => {
    if (timer) {
      clearTimeout(timer);
    }
    state.exitCode = code;
    state.completedAt = nowIso();
    if (state.status === 'cancelling') {
      state.status = 'cancelled';
    } else if (state.timedOut) {
      state.status = 'failed';
    } else {
      state.status = code === 0 ? 'succeeded' : 'failed';
    }
    finishOnce();
  });
  return child;
}

function appendLocalOutput(current: string, chunk: string, state: LocalJobState): string {
  const currentBytes = Buffer.byteLength(current);
  if (currentBytes >= MAX_LOCAL_OUTPUT_BYTES) {
    state.outputTruncated = true;
    return current;
  }
  const chunkBuffer = Buffer.from(chunk);
  const remainingBytes = MAX_LOCAL_OUTPUT_BYTES - currentBytes;
  if (chunkBuffer.byteLength <= remainingBytes) {
    return `${current}${chunk}`;
  }
  state.outputTruncated = true;
  return `${current}${chunkBuffer.subarray(0, remainingBytes).toString('utf8')}`;
}

function sanitizedLocalProcessEnv(): NodeJS.ProcessEnv {
  const allowed = ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'USER', 'LOGNAME', 'NODE_ENV'];
  return Object.fromEntries(
    allowed.flatMap((key) => {
      const value = process.env[key];
      return value === undefined ? [] : [[key, value]];
    }),
  );
}

function buildCollectedResult(
  taskSpec: TrainingTaskSpec,
  externalJobRef: ExperimentFoundationRef,
  status: ExperimentFoundationExternalTrainingJobStatus,
  metadata: Record<string, unknown>,
): AdapterCollectResult {
  const baseRef = `${taskSpec.training_task_spec_id}_${externalJobRef.ref_id}`;
  const metric: ResultMetricValue = {
    metric_key: status === 'succeeded' ? 'adapter_success' : 'adapter_failure',
    metric_definition_ref: { ref_type: 'metric_definition', ref_id: 'adapter_success' },
    value: status === 'succeeded' ? 1 : 0,
    value_type: 'number',
    unit: 'binary',
    split_name: 'execution',
    aggregation: { method: 'single_run' },
    source_artifact_ref: { ref_type: 'result_artifact', ref_id: `${baseRef}_metric_bundle` },
    source_artifact_hash: hashPayload({ baseRef, kind: 'metric_bundle', metadata }),
  };
  const metricsArtifact = artifact('metric_bundle', `${baseRef}_metric_bundle`, metadata);
  const configArtifact = artifact('config_snapshot', `${baseRef}_config_snapshot`, taskSpec.config_snapshot_hash);
  const log = {
    log_ref: { ref_type: 'result_log', ref_id: `${baseRef}_stdout` },
    log_hash: hashPayload({ baseRef, kind: 'stdout', metadata }),
    log_kind: 'stdout' as const,
    byte_size: stableStringify(metadata).length,
    source_refs: [externalJobRef],
  };
  return {
    status,
    metrics: [metric],
    artifacts: [metricsArtifact, configArtifact],
    logs: [log],
    configSnapshotRef: configArtifact.artifact_ref,
    configSnapshotHash: taskSpec.config_snapshot_hash,
    metadata,
  };
}

function artifact(kind: ResultArtifact['artifact_kind'], id: string, payload: unknown): ResultArtifact {
  return {
    result_artifact_id: id,
    artifact_kind: kind,
    artifact_ref: { ref_type: 'result_artifact', ref_id: id },
    artifact_hash: hashPayload(payload),
    checksum_hash: hashPayload({ checksum: payload }),
    byte_size: stableStringify(payload).length,
    retention_policy_ref: { ref_type: 'retention_policy', ref_id: 'experiment_foundation_default' },
    created_at: nowIso(),
    source_refs: [],
  };
}

export function hashPayload(payload: unknown): string {
  return `sha256:${sha256Text(stableStringify(payload))}`;
}

function nowIso(): string {
  return new Date().toISOString();
}
