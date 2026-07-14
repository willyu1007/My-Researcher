const SAFE_INHERITED_ENVIRONMENT_KEYS = [
  'CI',
  'HOME',
  'LANG',
  'LC_ALL',
  'PATH',
  'PNPM_HOME',
  'TEMP',
  'TERM',
  'TMP',
  'TMPDIR',
];

const SENSITIVE_ENVIRONMENT_KEY =
  /(?:DATABASE_URL|REPOSITORY|PROVIDER|CLOUD|CREDENTIAL|SECRET|TOKEN|PASSWORD|API_KEY|ACCESS_KEY|PRIVATE_KEY)/i;

export function buildSafeChildEnv(overrides = {}, hostEnvironment = process.env) {
  const childEnvironment = {};
  for (const key of SAFE_INHERITED_ENVIRONMENT_KEYS) {
    if (typeof hostEnvironment[key] === 'string' && hostEnvironment[key] !== '') {
      childEnvironment[key] = hostEnvironment[key];
    }
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined && value !== null) childEnvironment[key] = String(value);
  }
  return childEnvironment;
}

export function describeEnvironmentIsolation(hostEnvironment = process.env) {
  const hostSensitiveKeys = Object.keys(hostEnvironment)
    .filter((key) => SENSITIVE_ENVIRONMENT_KEY.test(key))
    .sort();
  const preDatabaseChildEnvironment = buildSafeChildEnv({}, hostEnvironment);
  const exposedSensitiveKeys = Object.keys(preDatabaseChildEnvironment)
    .filter((key) => SENSITIVE_ENVIRONMENT_KEY.test(key))
    .sort();
  return {
    policy: 'explicit_allowlist@v1',
    inherited_key_allowlist: [...SAFE_INHERITED_ENVIRONMENT_KEYS],
    host_sensitive_key_count: hostSensitiveKeys.length,
    stripped_sensitive_key_count: hostSensitiveKeys.length - exposedSensitiveKeys.length,
    exposed_sensitive_keys: exposedSensitiveKeys,
    existing_database_url_present_but_ignored:
      typeof hostEnvironment.DATABASE_URL === 'string' && hostEnvironment.DATABASE_URL !== '',
  };
}
