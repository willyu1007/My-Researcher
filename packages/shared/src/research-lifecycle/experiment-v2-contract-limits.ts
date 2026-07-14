// PostgreSQL `Int` is a signed 32-bit integer. Shared/HTTP contracts that can
// reach an `Int` column reject wider JSON integers before repository work.
export const EXPERIMENT_V2_INT32_MIN = -2_147_483_648;
export const EXPERIMENT_V2_INT32_MAX = 2_147_483_647;
export const EXPERIMENT_V2_JSON_SAFE_INTEGER_MAX = Number.MAX_SAFE_INTEGER;
export const EXPERIMENT_V2_HASH_PATTERN = '^sha256:[0-9a-f]{64}$' as const;
