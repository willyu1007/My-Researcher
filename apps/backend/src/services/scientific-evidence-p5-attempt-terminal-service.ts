import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import path from 'node:path';

export const SCIENTIFIC_EVIDENCE_P5_ATTEMPT_TERMINAL_SCHEMA_V1 =
  'ScientificEvidenceP5AttemptTerminal@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_ATTEMPT_STAGE_CLAIM_SCHEMA_V1 =
  'ScientificEvidenceP5AttemptStageClaim@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_ATTEMPT_STAGE_COMPLETION_SCHEMA_V1 =
  'ScientificEvidenceP5AttemptStageCompletion@v1' as const;
export const SCIENTIFIC_EVIDENCE_P5_ATTEMPT_EXECUTION_LOCK_SCHEMA_V1 =
  'ScientificEvidenceP5AttemptExecutionLock@v1' as const;

export const SCIENTIFIC_EVIDENCE_P5_ATTEMPT_STAGES_V1 = Object.freeze([
  'credential_integrity',
  'credential_qualification',
  'live',
  'close',
  'result_analysis_recovery',
  'closure_packet_continuation',
  'packet_trace_result_analysis_successor',
  'packet_only_recovery',
  'claim_dossier_final_acceptance',
] as const);

export type ScientificEvidenceP5AttemptStageV1 =
  (typeof SCIENTIFIC_EVIDENCE_P5_ATTEMPT_STAGES_V1)[number];

export interface ScientificEvidenceP5AttemptBindingV1 {
  p5_attempt_id: string;
  package_hash: string;
}

export interface ScientificEvidenceP5AttemptTerminalV1
  extends ScientificEvidenceP5AttemptBindingV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_ATTEMPT_TERMINAL_SCHEMA_V1;
  status: 'terminal';
  failed_stage: ScientificEvidenceP5AttemptStageV1;
  reason_code: string;
  terminal_at: string;
}

export interface ScientificEvidenceP5AttemptStageClaimV1
  extends ScientificEvidenceP5AttemptBindingV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_ATTEMPT_STAGE_CLAIM_SCHEMA_V1;
  status: 'claimed';
  stage: ScientificEvidenceP5AttemptStageV1;
  claimed_at: string;
}

export interface ScientificEvidenceP5AttemptStageCompletionV1
  extends ScientificEvidenceP5AttemptBindingV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_ATTEMPT_STAGE_COMPLETION_SCHEMA_V1;
  status: 'completed';
  stage: ScientificEvidenceP5AttemptStageV1;
  completed_at: string;
}

export interface ScientificEvidenceP5AttemptExecutionLockV1
  extends ScientificEvidenceP5AttemptBindingV1 {
  schema_version: typeof SCIENTIFIC_EVIDENCE_P5_ATTEMPT_EXECUTION_LOCK_SCHEMA_V1;
  status: 'active';
  stage: ScientificEvidenceP5AttemptStageV1;
  acquired_at: string;
}

interface AttemptRecordContext {
  manifest_directory: string;
  binding: ScientificEvidenceP5AttemptBindingV1;
}

interface ClaimedStageInput<T> extends AttemptRecordContext {
  stage: ScientificEvidenceP5AttemptStageV1;
  operation: () => Promise<T>;
  on_terminalized?: (created: boolean) => void;
  now?: () => string;
}

export function resolveScientificEvidenceP5AttemptTerminalPath(
  input: AttemptRecordContext,
): string {
  assertBinding(input.binding);
  return path.join(
    input.manifest_directory,
    `credential-attempt-terminal-${input.binding.p5_attempt_id}.json`,
  );
}

export function resolveScientificEvidenceP5AttemptStageClaimPath(
  input: AttemptRecordContext & { stage: ScientificEvidenceP5AttemptStageV1 },
): string {
  assertBinding(input.binding);
  return path.join(
    input.manifest_directory,
    `credential-attempt-${input.binding.p5_attempt_id}-${input.stage}-claim.json`,
  );
}

export function resolveScientificEvidenceP5AttemptStageCompletionPath(
  input: AttemptRecordContext & { stage: ScientificEvidenceP5AttemptStageV1 },
): string {
  assertBinding(input.binding);
  return path.join(
    input.manifest_directory,
    `credential-attempt-${input.binding.p5_attempt_id}-${input.stage}-completion.json`,
  );
}

export function resolveScientificEvidenceP5AttemptExecutionLockPath(
  input: AttemptRecordContext,
): string {
  assertBinding(input.binding);
  return path.join(
    input.manifest_directory,
    `credential-attempt-${input.binding.p5_attempt_id}-execution.lock`,
  );
}

export async function readScientificEvidenceP5AttemptTerminalV1(input: {
  terminal_path: string;
  binding: ScientificEvidenceP5AttemptBindingV1;
}): Promise<ScientificEvidenceP5AttemptTerminalV1 | null> {
  return readBoundRecord({
    file_path: input.terminal_path,
    binding: input.binding,
    is_record: isTerminalRecord,
    invalid_code: 'T136_P5_ATTEMPT_TERMINAL_RECORD_INVALID',
  });
}

export async function assertScientificEvidenceP5AttemptActiveV1(input: {
  terminal_path: string;
  binding: ScientificEvidenceP5AttemptBindingV1;
}): Promise<void> {
  const terminal = await readScientificEvidenceP5AttemptTerminalV1(input);
  if (terminal) {
    throw new Error(
      `T136_P5_ATTEMPT_TERMINAL_${terminal.failed_stage.toUpperCase()}_${terminal.reason_code}`,
    );
  }
}

export async function claimScientificEvidenceP5AttemptStageV1(input: {
  claim_path: string;
  binding: ScientificEvidenceP5AttemptBindingV1;
  stage: ScientificEvidenceP5AttemptStageV1;
  claimed_at?: string;
}): Promise<ScientificEvidenceP5AttemptStageClaimV1> {
  assertBinding(input.binding);
  const claimedAt = input.claimed_at ?? new Date().toISOString();
  assertUtcTimestamp(claimedAt, 'T136_P5_ATTEMPT_STAGE_CLAIM_TIME_INVALID');
  const claim: ScientificEvidenceP5AttemptStageClaimV1 = {
    schema_version: SCIENTIFIC_EVIDENCE_P5_ATTEMPT_STAGE_CLAIM_SCHEMA_V1,
    status: 'claimed',
    p5_attempt_id: input.binding.p5_attempt_id,
    package_hash: input.binding.package_hash,
    stage: input.stage,
    claimed_at: claimedAt,
  };
  const created = await publishExclusiveJson(input.claim_path, claim);
  if (!created) {
    const existing = await readBoundRecord({
      file_path: input.claim_path,
      binding: input.binding,
      is_record: isStageClaimRecord,
      invalid_code: 'T136_P5_ATTEMPT_STAGE_CLAIM_INVALID',
    });
    if (!existing || existing.stage !== input.stage) {
      throw new Error('T136_P5_ATTEMPT_STAGE_CLAIM_INVALID');
    }
    throw new Error(`T136_P5_ATTEMPT_STAGE_ALREADY_CLAIMED_${input.stage.toUpperCase()}`);
  }
  return claim;
}

export async function recordScientificEvidenceP5AttemptStageCompletionV1(input: {
  completion_path: string;
  claim_path: string;
  binding: ScientificEvidenceP5AttemptBindingV1;
  stage: ScientificEvidenceP5AttemptStageV1;
  completed_at?: string;
}): Promise<ScientificEvidenceP5AttemptStageCompletionV1> {
  const claim = await readBoundRecord({
    file_path: input.claim_path,
    binding: input.binding,
    is_record: isStageClaimRecord,
    invalid_code: 'T136_P5_ATTEMPT_STAGE_CLAIM_INVALID',
  });
  if (!claim || claim.stage !== input.stage) {
    throw new Error('T136_P5_ATTEMPT_STAGE_CLAIM_MISSING');
  }
  const completedAt = input.completed_at ?? new Date().toISOString();
  assertUtcTimestamp(completedAt, 'T136_P5_ATTEMPT_STAGE_COMPLETION_TIME_INVALID');
  if (Date.parse(completedAt) < Date.parse(claim.claimed_at)) {
    throw new Error(`T136_P5_ATTEMPT_STAGE_COMPLETION_PRECEDES_CLAIM_${input.stage.toUpperCase()}`);
  }
  const completion: ScientificEvidenceP5AttemptStageCompletionV1 = {
    schema_version: SCIENTIFIC_EVIDENCE_P5_ATTEMPT_STAGE_COMPLETION_SCHEMA_V1,
    status: 'completed',
    p5_attempt_id: input.binding.p5_attempt_id,
    package_hash: input.binding.package_hash,
    stage: input.stage,
    completed_at: completedAt,
  };
  if (!await publishExclusiveJson(input.completion_path, completion)) {
    throw new Error(`T136_P5_ATTEMPT_STAGE_ALREADY_COMPLETED_${input.stage.toUpperCase()}`);
  }
  return completion;
}

export async function assertScientificEvidenceP5AttemptStageCompletedV1(input: {
  completion_path: string;
  claim_path: string;
  binding: ScientificEvidenceP5AttemptBindingV1;
  stage: ScientificEvidenceP5AttemptStageV1;
}): Promise<void> {
  const claim = await readBoundRecord({
    file_path: input.claim_path,
    binding: input.binding,
    is_record: isStageClaimRecord,
    invalid_code: 'T136_P5_ATTEMPT_STAGE_CLAIM_INVALID',
  });
  if (!claim || claim.stage !== input.stage) {
    throw new Error(`T136_P5_ATTEMPT_STAGE_NOT_CLAIMED_${input.stage.toUpperCase()}`);
  }
  const completion = await readBoundRecord({
    file_path: input.completion_path,
    binding: input.binding,
    is_record: isStageCompletionRecord,
    invalid_code: 'T136_P5_ATTEMPT_STAGE_COMPLETION_INVALID',
  });
  if (!completion || completion.stage !== input.stage) {
    throw new Error(`T136_P5_ATTEMPT_STAGE_NOT_COMPLETED_${input.stage.toUpperCase()}`);
  }
  if (Date.parse(completion.completed_at) < Date.parse(claim.claimed_at)) {
    throw new Error(`T136_P5_ATTEMPT_STAGE_COMPLETION_PRECEDES_CLAIM_${input.stage.toUpperCase()}`);
  }
}

export async function runScientificEvidenceP5ClaimedStageV1<T>(
  input: ClaimedStageInput<T>,
): Promise<T> {
  const terminalPath = resolveScientificEvidenceP5AttemptTerminalPath(input);
  await assertScientificEvidenceP5AttemptActiveV1({
    terminal_path: terminalPath,
    binding: input.binding,
  });
  const executionLockPath = resolveScientificEvidenceP5AttemptExecutionLockPath(input);
  await acquireScientificEvidenceP5AttemptExecutionLockV1({
    lock_path: executionLockPath,
    binding: input.binding,
    stage: input.stage,
    acquired_at: input.now?.(),
  });
  let claimed = false;
  try {
    await claimScientificEvidenceP5AttemptStageV1({
      claim_path: resolveScientificEvidenceP5AttemptStageClaimPath(input),
      binding: input.binding,
      stage: input.stage,
      claimed_at: input.now?.(),
    });
    claimed = true;
    await assertScientificEvidenceP5AttemptActiveV1({
      terminal_path: terminalPath,
      binding: input.binding,
    });
    await assertPreviousStageCompleted(input);
    const result = await input.operation();
    await recordScientificEvidenceP5AttemptStageCompletionV1({
      completion_path: resolveScientificEvidenceP5AttemptStageCompletionPath(input),
      claim_path: resolveScientificEvidenceP5AttemptStageClaimPath(input),
      binding: input.binding,
      stage: input.stage,
      completed_at: input.now?.(),
    });
    return result;
  } catch (error) {
    if (!claimed) throw error;
    const outcome = await recordScientificEvidenceP5AttemptTerminalV1({
      terminal_path: terminalPath,
      binding: input.binding,
      failed_stage: input.stage,
      reason_code: scientificEvidenceP5TerminalReasonCode(
        error,
        `T136_P5_${input.stage.toUpperCase()}_FAILED`,
      ),
      terminal_at: input.now?.(),
    });
    input.on_terminalized?.(outcome.created);
    throw error;
  } finally {
    try {
      await releaseScientificEvidenceP5AttemptExecutionLockV1(executionLockPath);
    } catch {
      const releaseError = new Error('T136_P5_ATTEMPT_EXECUTION_LOCK_RELEASE_FAILED');
      if (claimed) {
        const outcome = await recordScientificEvidenceP5AttemptTerminalV1({
          terminal_path: terminalPath,
          binding: input.binding,
          failed_stage: input.stage,
          reason_code: releaseError.message,
          terminal_at: input.now?.(),
        });
        input.on_terminalized?.(outcome.created);
      }
      throw releaseError;
    }
  }
}

async function acquireScientificEvidenceP5AttemptExecutionLockV1(input: {
  lock_path: string;
  binding: ScientificEvidenceP5AttemptBindingV1;
  stage: ScientificEvidenceP5AttemptStageV1;
  acquired_at?: string;
}): Promise<void> {
  const acquiredAt = input.acquired_at ?? new Date().toISOString();
  assertUtcTimestamp(acquiredAt, 'T136_P5_ATTEMPT_EXECUTION_LOCK_TIME_INVALID');
  const lock: ScientificEvidenceP5AttemptExecutionLockV1 = {
    schema_version: SCIENTIFIC_EVIDENCE_P5_ATTEMPT_EXECUTION_LOCK_SCHEMA_V1,
    status: 'active',
    p5_attempt_id: input.binding.p5_attempt_id,
    package_hash: input.binding.package_hash,
    stage: input.stage,
    acquired_at: acquiredAt,
  };
  if (await publishExclusiveJson(input.lock_path, lock)) return;
  const existing = await readBoundRecord({
    file_path: input.lock_path,
    binding: input.binding,
    is_record: isExecutionLockRecord,
    invalid_code: 'T136_P5_ATTEMPT_EXECUTION_LOCK_INVALID',
  });
  if (!existing) throw new Error('T136_P5_ATTEMPT_EXECUTION_LOCK_INVALID');
  throw new Error(`T136_P5_ATTEMPT_EXECUTION_BUSY_${existing.stage.toUpperCase()}`);
}

async function releaseScientificEvidenceP5AttemptExecutionLockV1(lockPath: string): Promise<void> {
  await fs.unlink(lockPath);
  let directory: FileHandle | null = null;
  try {
    directory = await fs.open(path.dirname(lockPath), 'r');
    await directory.sync();
  } catch {
    // The lock is already logically released. A crash before its directory
    // entry is durable can only resurrect the lock and fail closed.
  } finally {
    await directory?.close().catch(() => undefined);
  }
}

async function assertPreviousStageCompleted(input: AttemptRecordContext & {
  stage: ScientificEvidenceP5AttemptStageV1;
}): Promise<void> {
  const previousStage: Record<
    ScientificEvidenceP5AttemptStageV1,
    ScientificEvidenceP5AttemptStageV1 | null
  > = {
    credential_integrity: null,
    credential_qualification: 'credential_integrity',
    live: 'credential_qualification',
    close: 'live',
    result_analysis_recovery: null,
    closure_packet_continuation: null,
    packet_trace_result_analysis_successor: null,
    packet_only_recovery: null,
    claim_dossier_final_acceptance: null,
  };
  const prerequisite = previousStage[input.stage];
  if (!prerequisite) return;
  await assertScientificEvidenceP5AttemptStageCompletedV1({
    completion_path: resolveScientificEvidenceP5AttemptStageCompletionPath({
      ...input,
      stage: prerequisite,
    }),
    claim_path: resolveScientificEvidenceP5AttemptStageClaimPath({
      ...input,
      stage: prerequisite,
    }),
    binding: input.binding,
    stage: prerequisite,
  });
}

export async function recordScientificEvidenceP5AttemptTerminalV1(input: {
  terminal_path: string;
  binding: ScientificEvidenceP5AttemptBindingV1;
  failed_stage: ScientificEvidenceP5AttemptStageV1;
  reason_code: string;
  terminal_at?: string;
}): Promise<{
  terminal: ScientificEvidenceP5AttemptTerminalV1;
  created: boolean;
}> {
  assertBinding(input.binding);
  assertReasonCode(input.reason_code);
  const terminalAt = input.terminal_at ?? new Date().toISOString();
  assertUtcTimestamp(terminalAt, 'T136_P5_ATTEMPT_TERMINAL_TIME_INVALID');
  const terminal: ScientificEvidenceP5AttemptTerminalV1 = {
    schema_version: SCIENTIFIC_EVIDENCE_P5_ATTEMPT_TERMINAL_SCHEMA_V1,
    status: 'terminal',
    p5_attempt_id: input.binding.p5_attempt_id,
    package_hash: input.binding.package_hash,
    failed_stage: input.failed_stage,
    reason_code: input.reason_code,
    terminal_at: terminalAt,
  };
  if (await publishExclusiveJson(input.terminal_path, terminal)) {
    return { terminal, created: true };
  }
  const existing = await readScientificEvidenceP5AttemptTerminalV1({
    terminal_path: input.terminal_path,
    binding: input.binding,
  });
  if (!existing) throw new Error('T136_P5_ATTEMPT_TERMINAL_RACE_INVALID');
  return { terminal: existing, created: false };
}

export function scientificEvidenceP5TerminalReasonCode(
  error: unknown,
  fallback: string,
): string {
  assertReasonCode(fallback);
  if (!(error instanceof Error)) return fallback;
  const match = /^(T136_P5_[A-Z0-9_]+)/.exec(error.message);
  return match?.[1] ?? fallback;
}

async function publishExclusiveJson(filePath: string, value: unknown): Promise<boolean> {
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  let handle: FileHandle | null = null;
  try {
    handle = await fs.open(temporaryPath, 'wx', 0o600);
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    try {
      await fs.link(temporaryPath, filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
      throw error;
    }
    const directory = await fs.open(path.dirname(filePath), 'r');
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
    return true;
  } finally {
    if (handle) await handle.close().catch(() => undefined);
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}

async function readBoundRecord<T extends ScientificEvidenceP5AttemptBindingV1>(input: {
  file_path: string;
  binding: ScientificEvidenceP5AttemptBindingV1;
  is_record: (value: unknown) => value is T;
  invalid_code: string;
}): Promise<T | null> {
  assertBinding(input.binding);
  let serialized: string;
  try {
    serialized = await fs.readFile(input.file_path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new Error(input.invalid_code);
  }
  if (!input.is_record(parsed)) throw new Error(input.invalid_code);
  if (
    parsed.p5_attempt_id !== input.binding.p5_attempt_id
    || parsed.package_hash !== input.binding.package_hash
  ) throw new Error('T136_P5_ATTEMPT_RECORD_BINDING_INVALID');
  return parsed;
}

function assertBinding(binding: ScientificEvidenceP5AttemptBindingV1): void {
  if (
    !/^[a-z0-9][a-z0-9._-]{0,127}$/.test(binding.p5_attempt_id)
    || !/^sha256:[a-f0-9]{64}$/.test(binding.package_hash)
  ) throw new Error('T136_P5_ATTEMPT_RECORD_BINDING_INVALID');
}

function assertReasonCode(value: string): void {
  if (!/^T136_P5_[A-Z0-9_]+$/.test(value)) {
    throw new Error('T136_P5_ATTEMPT_TERMINAL_REASON_INVALID');
  }
}

function assertUtcTimestamp(value: string, code: string): void {
  if (!isUtcTimestamp(value)) throw new Error(code);
}

function isTerminalRecord(value: unknown): value is ScientificEvidenceP5AttemptTerminalV1 {
  return hasRecordHeader(value, [
    'schema_version', 'status', 'p5_attempt_id', 'package_hash',
    'failed_stage', 'reason_code', 'terminal_at',
  ])
    && value.schema_version === SCIENTIFIC_EVIDENCE_P5_ATTEMPT_TERMINAL_SCHEMA_V1
    && value.status === 'terminal'
    && isAttemptStage(value.failed_stage)
    && typeof value.reason_code === 'string'
    && /^T136_P5_[A-Z0-9_]+$/.test(value.reason_code)
    && typeof value.terminal_at === 'string'
    && isUtcTimestamp(value.terminal_at);
}

function isStageClaimRecord(value: unknown): value is ScientificEvidenceP5AttemptStageClaimV1 {
  return hasRecordHeader(value, [
    'schema_version', 'status', 'p5_attempt_id', 'package_hash', 'stage', 'claimed_at',
  ])
    && value.schema_version === SCIENTIFIC_EVIDENCE_P5_ATTEMPT_STAGE_CLAIM_SCHEMA_V1
    && value.status === 'claimed'
    && isAttemptStage(value.stage)
    && typeof value.claimed_at === 'string'
    && isUtcTimestamp(value.claimed_at);
}

function isStageCompletionRecord(
  value: unknown,
): value is ScientificEvidenceP5AttemptStageCompletionV1 {
  return hasRecordHeader(value, [
    'schema_version', 'status', 'p5_attempt_id', 'package_hash', 'stage', 'completed_at',
  ])
    && value.schema_version === SCIENTIFIC_EVIDENCE_P5_ATTEMPT_STAGE_COMPLETION_SCHEMA_V1
    && value.status === 'completed'
    && isAttemptStage(value.stage)
    && typeof value.completed_at === 'string'
    && isUtcTimestamp(value.completed_at);
}

function isExecutionLockRecord(
  value: unknown,
): value is ScientificEvidenceP5AttemptExecutionLockV1 {
  return hasRecordHeader(value, [
    'schema_version', 'status', 'p5_attempt_id', 'package_hash', 'stage', 'acquired_at',
  ])
    && value.schema_version === SCIENTIFIC_EVIDENCE_P5_ATTEMPT_EXECUTION_LOCK_SCHEMA_V1
    && value.status === 'active'
    && isAttemptStage(value.stage)
    && typeof value.acquired_at === 'string'
    && isUtcTimestamp(value.acquired_at);
}

function hasRecordHeader(
  value: unknown,
  expectedKeys: string[],
): value is Record<string, unknown> & ScientificEvidenceP5AttemptBindingV1 {
  return hasExactKeys(value, expectedKeys)
    && typeof value.p5_attempt_id === 'string'
    && /^[a-z0-9][a-z0-9._-]{0,127}$/.test(value.p5_attempt_id)
    && typeof value.package_hash === 'string'
    && /^sha256:[a-f0-9]{64}$/.test(value.package_hash);
}

function isAttemptStage(value: unknown): value is ScientificEvidenceP5AttemptStageV1 {
  return SCIENTIFIC_EVIDENCE_P5_ATTEMPT_STAGES_V1.includes(
    value as ScientificEvidenceP5AttemptStageV1,
  );
}

function isUtcTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function hasExactKeys(value: unknown, expected: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
}
