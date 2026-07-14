import { EXPERIMENT_V2_INT32_MAX } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';

type Int32ErrorFactory = (message: string) => Error;

/**
 * Validates a positive PostgreSQL Int value at a service/repository read fence.
 * The caller owns the public error vocabulary through the supplied factory.
 */
export function assertExperimentV2PositiveInt32(
  value: unknown,
  label: string,
  errorFactory: Int32ErrorFactory,
): asserts value is number {
  if (
    !Number.isInteger(value)
    || (value as number) < 1
    || (value as number) > EXPERIMENT_V2_INT32_MAX
  ) {
    throw errorFactory(`${label} must be a positive PostgreSQL Int32 integer.`);
  }
}

/**
 * Advances a persisted PostgreSQL Int counter without constructing a value
 * that the database cannot store.
 */
export function incrementExperimentV2Int32Counter(
  current: number,
  label: string,
  errorFactory: Int32ErrorFactory,
): number {
  if (
    !Number.isInteger(current)
    || current < 0
    || current >= EXPERIMENT_V2_INT32_MAX
  ) {
    throw errorFactory(`${label} cannot advance within the PostgreSQL Int32 range.`);
  }
  return current + 1;
}

/**
 * Derives the next positive durable sequence from persisted values. Invalid,
 * non-positive, or exhausted history fails closed before a write is drafted.
 */
export function nextExperimentV2Int32Sequence(
  persisted: readonly number[],
  label: string,
  errorFactory: Int32ErrorFactory,
): number {
  let latest = 0;
  for (const value of persisted) {
    assertExperimentV2PositiveInt32(value, `${label} persisted value`, errorFactory);
    latest = Math.max(latest, value);
  }
  return incrementExperimentV2Int32Counter(latest, label, errorFactory);
}
