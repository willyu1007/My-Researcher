export const EXPERIMENT_V2_SHA256_REF_PATTERN: RegExp;

export function sha256Bytes(value: string | NodeJS.ArrayBufferView): string;
export function normalizePostgresIndexDefinitionSchema(definition: unknown): string;
export function sha256File(filePath: string): Promise<string>;
export function writeJsonAtomic(filePath: string, value: unknown): Promise<void>;
export function assertSanitizedJson<T>(value: T, label?: string): T;
export function exactPassingTapOutcome(result: {
  exit_code: number | null;
  stdout: string;
  stderr: string;
}): {
  combinedOutput: string;
  tests: number | null;
  passed: number | null;
  failed: number | null;
  skipped: number | null;
  executedWithoutSkip: boolean;
};
