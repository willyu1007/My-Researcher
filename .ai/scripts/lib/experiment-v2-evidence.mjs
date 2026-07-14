import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const EXPERIMENT_V2_SHA256_REF_PATTERN = /^sha256:[0-9a-f]{64}$/;

export function sha256Bytes(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function normalizePostgresIndexDefinitionSchema(definition) {
  return String(definition).replace(
    / ON (?:(?:"(?:[^"]|"")*")|(?:[A-Za-z_][A-Za-z0-9_$]*))\./,
    ' ON <schema>.',
  );
}

export async function sha256File(filePath) {
  return sha256Bytes(await fs.readFile(filePath));
}

export async function writeJsonAtomic(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`;
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    });
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}

export function assertSanitizedJson(value, label = 'evidence') {
  const serialized = JSON.stringify(value);
  const forbidden = [
    /postgres(?:ql)?:\/\//i,
    /(?:password|passwd|secret|api[_-]?key|access[_-]?key|private[_-]?key)\s*["'=:\s]+[^,}\s]+/i,
  ];
  if (forbidden.some((pattern) => pattern.test(serialized))) {
    throw new Error(`${label} contains a database URL or credential-shaped value`);
  }
  return value;
}

function tapCount(output, label) {
  const match = output.match(new RegExp(`^# ${label} (\\d+)\\s*$`, 'm'));
  return match ? Number.parseInt(match[1], 10) : null;
}

export function exactPassingTapOutcome(result) {
  const combinedOutput = `${result.stdout}\n${result.stderr}`;
  const tests = tapCount(combinedOutput, 'tests');
  const passed = tapCount(combinedOutput, 'pass');
  const failed = tapCount(combinedOutput, 'fail');
  const skipped = tapCount(combinedOutput, 'skipped');
  return {
    combinedOutput,
    tests,
    passed,
    failed,
    skipped,
    executedWithoutSkip: result.exit_code === 0
      && tests !== null
      && tests > 0
      && passed === tests
      && failed === 0
      && skipped === 0,
  };
}
