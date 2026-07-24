#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  exactPassingTapOutcome,
  sha256Bytes,
  sha256File,
  writeJsonAtomic,
} from './lib/experiment-v2-evidence.mjs';
import {
  describeEnvironmentIsolation,
} from './lib/hermetic-child-env.mjs';
import {
  markDisposableDatabase,
  runCommand,
  safeCommandTail,
  startDisposablePostgres,
  stopDisposablePostgres,
} from './lib/disposable-postgres.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARTIFACT_ROOT = path.join(
  REPO_ROOT,
  '.ai/.tmp/experiment-foundation-productization',
);
const MIGRATIONS_ROOT = path.join(REPO_ROOT, 'prisma/migrations');
export const DEFAULT_POSTGRES_IMAGE =
  'pgvector/pgvector@sha256:a132765ec351c65111b5b675928a3a0515a466a40f97277329db8b8209ad8bc9';
const APPROVED_IMAGE_REPOSITORY = 'pgvector/pgvector';
const EXPECTED_MIGRATION_DIRECTORY_COUNT = 69;
const REQUIRED_CHECK_IDS = Array.from({ length: 8 }, (_, index) => (
  `M5-${String(index + 1).padStart(2, '0')}`
));

const SHARED_TESTS = [
  'src/research-lifecycle/paper-implementation-experiment-lineage-v2-contracts.schema.test.ts',
  'src/research-lifecycle/paper-implementation-closure-preparation-v2-contracts.schema.test.ts',
  'src/research-lifecycle/paper-implementation-evidence-v2-contracts.schema.test.ts',
];
const BACKEND_TARGETED_TESTS = [
  'src/services/experiment-foundation-provider-command-v2-worker.unit.test.ts',
  'src/services/experiment-foundation-real-provider-command-v2-worker.unit.test.ts',
  'src/services/experiment-v2-integration-spine.unit.test.ts',
  'src/services/paper-implementation-agent-actions-v2-service.unit.test.ts',
  'src/services/paper-implementation-experiment-lineage-v2-service.unit.test.ts',
  'src/routes/paper-implementation-experiment-lineage-v2-routes.integration.test.ts',
  'src/routes/paper-implementation-agent-actions-v2-routes.integration.test.ts',
  'src/routes/paper-implementation-experiment-v2-routes.integration.test.ts',
];
const LINEAGE_RELATIONAL_TESTS = [
  'src/repositories/prisma/prisma-paper-implementation-experiment-lineage-v2-relational.integration.test.ts',
];
const CLOSURE_RELATIONAL_TESTS = [
  'src/repositories/prisma/prisma-paper-implementation-evidence-closure-v2-relational.integration.test.ts',
];

const SOURCE_POPULATION = [
  'packages/shared/src/research-lifecycle/paper-implementation-experiment-lineage-v2-contracts.ts',
  'packages/shared/src/research-lifecycle/paper-implementation-closure-preparation-v2-contracts.ts',
  'packages/shared/src/research-lifecycle/paper-implementation-evidence-v2-contracts.ts',
  'apps/backend/src/app.ts',
  'apps/backend/src/controllers/paper-implementation-agent-actions-v2-controller.ts',
  'apps/backend/src/controllers/paper-implementation-experiment-lineage-v2-controller.ts',
  'apps/backend/src/controllers/paper-implementation-experiment-v2-controller.ts',
  'apps/backend/src/repositories/in-memory-paper-implementation-experiment-lineage-v2-repository.ts',
  'apps/backend/src/repositories/paper-implementation-experiment-lineage-v2.repository.ts',
  'apps/backend/src/repositories/prisma/prisma-paper-implementation-experiment-lineage-v2-repository.ts',
  'apps/backend/src/routes/paper-implementation-agent-actions-v2-routes.ts',
  'apps/backend/src/routes/paper-implementation-experiment-lineage-v2-routes.ts',
  'apps/backend/src/routes/paper-implementation-experiment-v2-routes.ts',
  'apps/backend/src/services/paper-implementation-agent-actions-v2-service.ts',
  'apps/backend/src/services/paper-implementation-experiment-lineage-v2-service.ts',
  'apps/backend/src/services/paper-implementation-validation-cycle-closure-v2-service.ts',
];
const ZERO_WRITE_SOURCE_POPULATION = [
  'apps/backend/src/repositories/paper-implementation-experiment-lineage-v2.repository.ts',
  'apps/backend/src/repositories/in-memory-paper-implementation-experiment-lineage-v2-repository.ts',
  'apps/backend/src/repositories/prisma/prisma-paper-implementation-experiment-lineage-v2-repository.ts',
  'apps/backend/src/services/paper-implementation-experiment-lineage-v2-service.ts',
  'apps/backend/src/services/paper-implementation-agent-actions-v2-service.ts',
  'apps/backend/src/controllers/paper-implementation-experiment-lineage-v2-controller.ts',
  'apps/backend/src/controllers/paper-implementation-agent-actions-v2-controller.ts',
  'apps/backend/src/routes/paper-implementation-experiment-lineage-v2-routes.ts',
  'apps/backend/src/routes/paper-implementation-agent-actions-v2-routes.ts',
];
const TYPED_REQUEST_SOURCE_PATHS = {
  lineageRoutes:
    'apps/backend/src/routes/paper-implementation-experiment-lineage-v2-routes.ts',
  agentActionRoutes:
    'apps/backend/src/routes/paper-implementation-agent-actions-v2-routes.ts',
  experimentRoutes:
    'apps/backend/src/routes/paper-implementation-experiment-v2-routes.ts',
  lineageContracts:
    'packages/shared/src/research-lifecycle/paper-implementation-experiment-lineage-v2-contracts.ts',
  closurePreparationContracts:
    'packages/shared/src/research-lifecycle/paper-implementation-closure-preparation-v2-contracts.ts',
  evidenceContracts:
    'packages/shared/src/research-lifecycle/paper-implementation-evidence-v2-contracts.ts',
  experimentRouteTests:
    'apps/backend/src/routes/paper-implementation-experiment-v2-routes.integration.test.ts',
};
const M5_GET_ROUTES = [
  {
    source: 'lineageRoutes',
    path:
      '/paper-implementation/projects/:implementation_project_id/experiment-lineage/validation-cycles',
    paramsSchema: 'projectParamsSchema',
    responseSchema: 'projectValidationCyclesLineageV2ResponseSchema',
    contractSource: 'lineageContracts',
  },
  {
    source: 'lineageRoutes',
    path:
      '/paper-implementation/projects/:implementation_project_id/validation-cycles/:validation_cycle_id/experiment-lineage',
    paramsSchema: 'cycleParamsSchema',
    responseSchema: 'validationCycleExperimentLineageV2ResponseSchema',
    contractSource: 'lineageContracts',
  },
  {
    source: 'lineageRoutes',
    path:
      '/paper-implementation/projects/:implementation_project_id/workorder-branches/:branch_id/revision-history',
    paramsSchema: 'branchParamsSchema',
    responseSchema: 'workOrderBranchRevisionHistoryV2ResponseSchema',
    contractSource: 'lineageContracts',
  },
  {
    source: 'agentActionRoutes',
    path:
      '/paper-implementation/validation-cycles/:validation_cycle_id/closure/v2/preparation',
    paramsSchema: 'preparationParamsSchema',
    responseSchema: 'validationCycleClosurePreparationV2ResponseSchema',
    contractSource: 'closurePreparationContracts',
  },
  {
    source: 'agentActionRoutes',
    path:
      '/paper-implementation/projects/:implementation_project_id/validation-cycles/:validation_cycle_id/available-actions',
    paramsSchema: 'availableActionsParamsSchema',
    responseSchema: 'validationCycleAvailableActionsV2ResponseSchema',
    contractSource: 'closurePreparationContracts',
  },
];
const FORBIDDEN_REQUEST_PROPERTY_PATTERN = /hash|_ref$|revision_id|manifest/iu;
const FORBIDDEN_MODULE_IMPORT_GREP_PATTERN = [
  '(from|import[[:space:]]*\\()[[:space:]]*[\'"][^\'"]*',
  '(embedding|semantic|pgvector)',
  '|^[[:space:]]*import[[:space:]]*[\'"][^\'"]*',
  '(embedding|semantic|pgvector)',
].join('');
const MUTATION_CALL_KINDS = [
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
  '$executeRaw',
];

export function parseArgs(argv) {
  let runId = null;
  let postgresImage = DEFAULT_POSTGRES_IMAGE;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--run-id') {
      runId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (argument === '--postgres-image') {
      postgresImage = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!runId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(runId)) {
    throw new Error('--run-id must contain 1..64 safe filename characters');
  }
  const image = postgresImage.match(/^([^@]+)@sha256:([0-9a-f]{64})$/);
  if (
    !image
    || image[1] !== APPROVED_IMAGE_REPOSITORY
    || postgresImage !== DEFAULT_POSTGRES_IMAGE
  ) {
    throw new Error('postgres-image must equal the reviewed digest-pinned pgvector image');
  }
  return { runId, postgresImage };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function extractBalancedObject(source, variableName) {
  const declaration = new RegExp(
    `(?:export\\s+)?const\\s+${escapeRegExp(variableName)}\\s*=\\s*`,
    'u',
  ).exec(source);
  if (!declaration) return null;
  const start = source.indexOf('{', declaration.index + declaration[0].length);
  if (start < 0) return null;
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote !== null) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === '\'' || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return null;
}

function extractSchemaPropertyNames(schemaSource) {
  if (typeof schemaSource !== 'string') return [];
  const propertiesIndex = schemaSource.search(/\bproperties\s*:\s*\{/u);
  if (propertiesIndex < 0) return [];
  const propertiesStart = schemaSource.indexOf('{', propertiesIndex);
  let depth = 0;
  let end = -1;
  for (let index = propertiesStart; index < schemaSource.length; index += 1) {
    if (schemaSource[index] === '{') depth += 1;
    if (schemaSource[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
  }
  if (end < 0) return [];
  const propertiesSource = schemaSource.slice(propertiesStart, end);
  return [...propertiesSource.matchAll(
    /(?:^|[,{]\s*)(?:['"]([^'"]+)['"]|([A-Za-z_][A-Za-z0-9_]*))\s*:/gmu,
  )].map((match) => match[1] ?? match[2]);
}

function extractRequiredNames(schemaSource) {
  if (typeof schemaSource !== 'string') return [];
  const required = schemaSource.match(/\brequired\s*:\s*\[([\s\S]*?)\]/u);
  if (!required) return [];
  return [...required[1].matchAll(/['"]([^'"]+)['"]/gu)].map((match) => match[1]);
}

function routeSegments(source, method) {
  return String(source)
    .split(new RegExp(`fastify\\.${method}\\b`, 'u'))
    .slice(1);
}

function routePath(segment) {
  return segment.match(/['"](\/paper-implementation\/[^'"]+)['"]/u)?.[1] ?? null;
}

export function inspectM5TypedRequests(sources) {
  for (const key of Object.keys(TYPED_REQUEST_SOURCE_PATHS)) {
    if (typeof sources?.[key] !== 'string') {
      throw new Error(`M5 typed-request inspection source is missing: ${key}`);
    }
  }
  const getSegments = [
    ...routeSegments(sources.lineageRoutes, 'get'),
    ...routeSegments(sources.agentActionRoutes, 'get'),
  ];
  const discoveredPaths = getSegments.map(routePath).filter(Boolean);
  const requestPropertyNames = [];
  let paramsOnlyRouteCount = 0;
  let bodySchemaRouteCount = 0;
  let querystringSchemaRouteCount = 0;
  let responseContractLinkCount = 0;
  let paramsSchemaDefinitionCount = 0;

  for (const definition of M5_GET_ROUTES) {
    const segment = routeSegments(sources[definition.source], 'get')
      .find((candidate) => routePath(candidate) === definition.path);
    if (!segment) continue;
    const requestSchema = segment.match(
      /\bschema\s*:\s*\{([\s\S]*?)\bresponse\s*:/u,
    )?.[1] ?? '';
    const hasParams = new RegExp(
      `\\bparams\\s*:\\s*${escapeRegExp(definition.paramsSchema)}\\b`,
      'u',
    ).test(requestSchema);
    const hasBody = /\bbody\s*:/u.test(requestSchema);
    const hasQuerystring = /\bquerystring\s*:/u.test(requestSchema);
    if (hasBody) bodySchemaRouteCount += 1;
    if (hasQuerystring) querystringSchemaRouteCount += 1;
    if (hasParams && !hasBody && !hasQuerystring) paramsOnlyRouteCount += 1;

    const paramsSchema = extractBalancedObject(
      sources[definition.source],
      definition.paramsSchema,
    );
    if (paramsSchema) {
      paramsSchemaDefinitionCount += 1;
      requestPropertyNames.push(...extractSchemaPropertyNames(paramsSchema));
    }

    const responseLinked = new RegExp(
      `\\b200\\s*:\\s*${escapeRegExp(definition.responseSchema)}\\b`,
      'u',
    ).test(segment);
    const contractExported = new RegExp(
      `export\\s+const\\s+${escapeRegExp(definition.responseSchema)}\\s*=`,
      'u',
    ).test(sources[definition.contractSource]);
    if (responseLinked && contractExported) responseContractLinkCount += 1;
  }

  const uniqueRequestPropertyNames = [...new Set(requestPropertyNames)].sort();
  const forbiddenRequestPropertyNames = uniqueRequestPropertyNames
    .filter((name) => FORBIDDEN_REQUEST_PROPERTY_PATTERN.test(name));
  const closurePost = routeSegments(sources.experimentRoutes, 'post')
    .find((segment) => (
      routePath(segment)
      === '/paper-implementation/validation-cycles/:validation_cycle_id/closure/v2'
    ));
  const closureBodySchemaLinked = typeof closurePost === 'string'
    && /\bbody\s*:\s*closeValidationCycleV2RequestSchema\b/u.test(closurePost);
  const closureRequestSchema = extractBalancedObject(
    sources.evidenceContracts,
    'closeValidationCycleV2RequestSchema',
  );
  const closureBodyPropertyNames = extractSchemaPropertyNames(closureRequestSchema);
  const closureBodyRequiredNames = extractRequiredNames(closureRequestSchema);
  const closurePostOptionalValidationCycleId =
    closureBodyPropertyNames.includes('validation_cycle_id')
    && !closureBodyRequiredNames.includes('validation_cycle_id');
  const closurePostMismatchGuardPresent = typeof closurePost === 'string'
    && /request\.body\.validation_cycle_id\s*!==\s*undefined/u.test(closurePost)
    && /request\.params\.validation_cycle_id\s*!==\s*request\.body\.validation_cycle_id/u
      .test(closurePost)
    && /new\s+AppError\(\s*400\s*,/u.test(closurePost);
  const closurePostMismatch400TestCovered =
    /const\s+mismatch\s*=\s*await\s+app\.inject/u.test(sources.experimentRouteTests)
    && /validation-cycles\/cycle-other\/closure\/v2/u.test(sources.experimentRouteTests)
    && /payload\s*:\s*closureRequestFixture\(\)/u.test(sources.experimentRouteTests)
    && /assert\.equal\(mismatch\.statusCode,\s*400/u.test(sources.experimentRouteTests)
    && /mismatch\.json\(\)\.error\.details\.reason_code[\s\S]*V2_TYPED_SNAPSHOT_INVALID/u
      .test(sources.experimentRouteTests);
  const expectedPathsExact = M5_GET_ROUTES.every(
    (definition) => discoveredPaths.includes(definition.path),
  );

  const evidence = {
    expected_get_route_count: M5_GET_ROUTES.length,
    discovered_get_route_count: discoveredPaths.length,
    expected_get_paths_present: expectedPathsExact,
    params_only_route_count: paramsOnlyRouteCount,
    params_schema_definition_count: paramsSchemaDefinitionCount,
    body_schema_route_count: bodySchemaRouteCount,
    querystring_schema_route_count: querystringSchemaRouteCount,
    m5_get_request_schema_property_names: uniqueRequestPropertyNames,
    forbidden_m5_get_request_property_names: forbiddenRequestPropertyNames,
    forbidden_m5_get_request_property_count: forbiddenRequestPropertyNames.length,
    response_contract_link_count: responseContractLinkCount,
    closure_post_body_schema_linked: closureBodySchemaLinked,
    closure_post_validation_cycle_id_present:
      closureBodyPropertyNames.includes('validation_cycle_id'),
    closure_post_validation_cycle_id_required:
      closureBodyRequiredNames.includes('validation_cycle_id'),
    closure_post_optional_validation_cycle_id: closurePostOptionalValidationCycleId,
    closure_post_mismatch_guard_present: closurePostMismatchGuardPresent,
    closure_post_mismatch_400_test_covered: closurePostMismatch400TestCovered,
  };
  return {
    ...evidence,
    exact: evidence.discovered_get_route_count === M5_GET_ROUTES.length
      && evidence.expected_get_paths_present
      && evidence.params_only_route_count === M5_GET_ROUTES.length
      && evidence.params_schema_definition_count === M5_GET_ROUTES.length
      && evidence.body_schema_route_count === 0
      && evidence.querystring_schema_route_count === 0
      && evidence.forbidden_m5_get_request_property_count === 0
      && evidence.response_contract_link_count === M5_GET_ROUTES.length
      && evidence.closure_post_body_schema_linked
      && evidence.closure_post_optional_validation_cycle_id
      && evidence.closure_post_mismatch_guard_present
      && evidence.closure_post_mismatch_400_test_covered,
  };
}

export function inspectMutationCalls(sourceEntries) {
  if (
    sourceEntries === null
    || typeof sourceEntries !== 'object'
    || Array.isArray(sourceEntries)
  ) {
    throw new Error('M5 mutation inspection requires repository-relative source entries');
  }
  const callKindCounts = Object.fromEntries(MUTATION_CALL_KINDS.map((kind) => [kind, 0]));
  const mutatingFiles = new Set();
  for (const [relativePath, source] of Object.entries(sourceEntries)) {
    if (
      path.isAbsolute(relativePath)
      || relativePath.split('/').includes('..')
      || typeof source !== 'string'
    ) {
      throw new Error('M5 mutation inspection received an unsafe source entry');
    }
    const pattern =
      /\.(createMany|create|updateMany|update|upsert|deleteMany|delete)\s*\(|\.\$executeRaw\s*(?:\(|`)/gu;
    for (const match of stripCommentsAndQuotedStrings(source).matchAll(pattern)) {
      const kind = match[1] ?? '$executeRaw';
      callKindCounts[kind] += 1;
      mutatingFiles.add(relativePath);
    }
  }
  const mutationCallCount = Object.values(callKindCounts)
    .reduce((total, count) => total + count, 0);
  return {
    scanned_file_count: Object.keys(sourceEntries).length,
    mutation_pattern_count: MUTATION_CALL_KINDS.length,
    mutation_call_counts: callKindCounts,
    mutation_call_count: mutationCallCount,
    mutating_files: [...mutatingFiles].sort(),
    exact: mutationCallCount === 0,
  };
}

function stripCommentsAndQuotedStrings(source) {
  let state = 'code';
  let escaped = false;
  let output = '';
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (state === 'code') {
      if (character === '/' && next === '/') {
        output += '  ';
        index += 1;
        state = 'line_comment';
      } else if (character === '/' && next === '*') {
        output += '  ';
        index += 1;
        state = 'block_comment';
      } else if (character === '\'' || character === '"') {
        output += ' ';
        state = character === '\'' ? 'single_quote' : 'double_quote';
        escaped = false;
      } else if (character === '`') {
        output += '`';
        state = 'template';
        escaped = false;
      } else {
        output += character;
      }
      continue;
    }
    if (state === 'line_comment') {
      output += character === '\n' ? '\n' : ' ';
      if (character === '\n') state = 'code';
      continue;
    }
    if (state === 'block_comment') {
      if (character === '*' && next === '/') {
        output += '  ';
        index += 1;
        state = 'code';
      } else {
        output += character === '\n' ? '\n' : ' ';
      }
      continue;
    }
    if (state === 'template') {
      if (!escaped && character === '`') {
        output += '`';
        state = 'code';
      } else {
        output += character === '\n' ? '\n' : ' ';
        escaped = !escaped && character === '\\';
        if (character !== '\\') escaped = false;
      }
      continue;
    }
    output += character === '\n' ? '\n' : ' ';
    if (escaped) {
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (
      (state === 'single_quote' && character === '\'')
      || (state === 'double_quote' && character === '"')
    ) {
      state = 'code';
    }
  }
  return output;
}

export function inspectForbiddenModuleImportScan(gitGrepOutput) {
  const lines = String(gitGrepOutput)
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const matchedFiles = new Set();
  for (const line of lines) {
    const match = line.match(/^(.+?):\d+:/u);
    if (!match || path.isAbsolute(match[1]) || match[1].split('/').includes('..')) {
      throw new Error('M5 forbidden-module grep returned an unsafe result');
    }
    matchedFiles.add(match[1]);
  }
  return {
    grep_pattern: FORBIDDEN_MODULE_IMPORT_GREP_PATTERN,
    match_count: lines.length,
    matched_file_count: matchedFiles.size,
    matched_files: [...matchedFiles].sort(),
    transcript_sha256: sha256Bytes(String(gitGrepOutput)),
    exact: lines.length === 0,
  };
}

export function inspectMigrationDirectoryCensus(directoryNames) {
  if (!Array.isArray(directoryNames) || directoryNames.some((name) => (
    typeof name !== 'string' || name.includes('/') || name.includes('\\')
  ))) {
    throw new Error('M5 migration census requires plain directory names');
  }
  const invalidDirectoryNames = directoryNames
    .filter((name) => !/^\d{14}_[A-Za-z0-9_]+$/u.test(name));
  return {
    expected_directory_count: EXPECTED_MIGRATION_DIRECTORY_COUNT,
    directory_count: directoryNames.length,
    invalid_directory_name_count: invalidDirectoryNames.length,
    names_sha256: sha256Bytes(JSON.stringify([...directoryNames].sort())),
    exact: directoryNames.length === EXPECTED_MIGRATION_DIRECTORY_COUNT
      && invalidDirectoryNames.length === 0,
  };
}

export function inspectDesktopChangeScan(statusOutput, diffOutput) {
  const statusEntries = String(statusOutput)
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const diffFiles = String(diffOutput)
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return {
    status_entry_count: statusEntries.length,
    diff_file_count: diffFiles.length,
    status_sha256: sha256Bytes(String(statusOutput)),
    diff_sha256: sha256Bytes(String(diffOutput)),
    exact: statusEntries.length === 0 && diffFiles.length === 0,
  };
}

async function run(argv, options = {}) {
  return runCommand(argv, {
    ...options,
    cwd: options.cwd ?? REPO_ROOT,
    destroyOutputOnTimeout: true,
    timeoutMessage: (timeoutMs) => `Process timed out after ${timeoutMs}ms.`,
  });
}

function safeTail(value) {
  return safeCommandTail(value, 6_000);
}

export function durableCommandEvidence(result, status) {
  const transcript = `${result.stdout}\n${result.stderr}`;
  return {
    status,
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    transcript_sha256: sha256Bytes(transcript),
  };
}

export function normalizeSummaryPaths(value, repoRoot = REPO_ROOT) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeSummaryPaths(entry, repoRoot));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      normalizeSummaryPaths(entry, repoRoot),
    ]));
  }
  if (typeof value !== 'string') return value;
  const normalizedRepoRoot = repoRoot.replaceAll('\\', '/').replace(/\/+$/u, '');
  return value
    .replaceAll('\\', '/')
    .replaceAll(`${normalizedRepoRoot}/`, '')
    .replaceAll(normalizedRepoRoot, '.')
    .replace(
      /(?<![A-Za-z0-9:])\/(?:[^/\s"',}\]]+\/)*[^/\s"',}\]]+/gu,
      '[machine-path]',
    );
}

export function assertDurableSummaryRedaction(summary) {
  const serialized = JSON.stringify(summary);
  if (
    /"(?:stdout|stderr|combinedOutput|combined_output|output_tail|raw_output)"\s*:/u
      .test(serialized)
  ) {
    throw new Error('Durable M5 summary contains raw command output');
  }
  if (
    serialized.includes('/Volumes/')
    || /(?<![A-Za-z0-9:])\/(?:[^/\s"',}\]]+\/)+[^/\s"',}\]]+/u.test(serialized)
  ) {
    throw new Error('Durable M5 summary contains an absolute machine path');
  }
  if (
    /postgres(?:ql)?:\/\//iu.test(serialized)
    || /"(?:password|secret|token|api_key|access_key|private_key)"\s*:/iu
      .test(serialized)
  ) {
    throw new Error('Durable M5 summary contains a database URL or credential field');
  }
  return {
    raw_command_output_absent: true,
    absolute_machine_paths_absent: true,
    database_urls_absent: true,
    credential_fields_absent: true,
  };
}

async function runCheckedCommand(label, argv, artifactDir, options = {}) {
  const result = await run(argv, options);
  const status = result.exit_code === 0 ? 'passed' : 'failed';
  const evidence = durableCommandEvidence(result, status);
  await writeJsonAtomic(path.join(artifactDir, `${label}.json`), {
    ...evidence,
    output_tail: safeTail(`${result.stdout}\n${result.stderr}`),
  });
  if (result.exit_code !== 0) throw new Error(`${label} failed`);
  return evidence;
}

async function runInspectionCommand(
  label,
  argv,
  artifactDir,
  acceptedExitCodes,
  options = {},
) {
  const result = await run(argv, options);
  const status = acceptedExitCodes.includes(result.exit_code) ? 'passed' : 'failed';
  const evidence = durableCommandEvidence(result, status);
  await writeJsonAtomic(path.join(artifactDir, `${label}.json`), {
    ...evidence,
    output_tail: safeTail(`${result.stdout}\n${result.stderr}`),
  });
  if (status !== 'passed') throw new Error(`${label} failed`);
  return { result, evidence };
}

async function runTapTests(label, cwd, testFiles, artifactDir, options = {}) {
  const result = await run(
    ['node', '--test', '--loader', 'ts-node/esm', ...testFiles],
    { ...options, cwd },
  );
  const tap = exactPassingTapOutcome(result);
  const status = tap.executedWithoutSkip ? 'passed' : 'failed';
  const evidence = {
    ...durableCommandEvidence(result, status),
    test_files: testFiles,
    tap: {
      tests: tap.tests,
      passed: tap.passed,
      failed: tap.failed,
      skipped: tap.skipped,
    },
  };
  await writeJsonAtomic(path.join(artifactDir, `${label}.json`), {
    ...evidence,
    output_tail: safeTail(tap.combinedOutput),
  });
  if (!tap.executedWithoutSkip) throw new Error(`${label} failed or skipped`);
  return evidence;
}

async function sourcePopulationDigest() {
  const files = [];
  for (const relativePath of SOURCE_POPULATION) {
    files.push({
      path: relativePath,
      sha256: await sha256File(path.join(REPO_ROOT, relativePath)),
    });
  }
  const digest = sha256Bytes(JSON.stringify(files));
  return {
    profile: 'experiment-foundation-m5-agent-source-population@v1',
    file_count: files.length,
    digest,
    digest_format_valid: /^[0-9a-f]{64}$/u.test(digest),
    files,
  };
}

function passingTapAssertion(root, testEvidence, requiredFiles) {
  const fields = [
    `${root}.status === "passed"`,
    `${root}.exit_code === 0`,
    `${root}.tap.tests > 0`,
    `${root}.tap.passed === ${root}.tap.tests`,
    `${root}.tap.failed === 0`,
    `${root}.tap.skipped === 0`,
    ...requiredFiles.map((file) => `${root}.test_files includes "${file}"`),
  ];
  const passed = testEvidence?.status === 'passed'
    && testEvidence?.exit_code === 0
    && Number.isInteger(testEvidence?.tap?.tests)
    && testEvidence.tap.tests > 0
    && testEvidence.tap.passed === testEvidence.tap.tests
    && testEvidence.tap.failed === 0
    && testEvidence.tap.skipped === 0
    && requiredFiles.every((file) => testEvidence.test_files?.includes(file));
  return { passed, fields };
}

function exactFieldAssertions(entries) {
  return {
    passed: entries.every((entry) => entry.actual === entry.expected),
    fields: entries.map((entry) => (
      `${entry.field} === ${JSON.stringify(entry.expected)}`
    )),
  };
}

function commandAssertion(root, evidence) {
  return exactFieldAssertions([
    { field: `${root}.status`, actual: evidence?.status, expected: 'passed' },
    { field: `${root}.exit_code`, actual: evidence?.exit_code, expected: 0 },
  ]);
}

function combineAssertions(...assertions) {
  return {
    passed: assertions.every((assertion) => assertion.passed),
    fields: assertions.flatMap((assertion) => assertion.fields),
  };
}

function exact(entries) {
  return exactFieldAssertions(entries.map(([field, actual, expected]) => ({
    field,
    actual,
    expected,
  })));
}

function blockedRelationalPredicate(root, evidence) {
  if (
    evidence?.status !== 'blocked'
    || evidence?.reason_code !== 'DISPOSABLE_POSTGRES_UNAVAILABLE'
  ) {
    return null;
  }
  return {
    passed: false,
    status: 'blocked',
    fields: [
      `${root}.status === "blocked"`,
      `${root}.reason_code === "DISPOSABLE_POSTGRES_UNAVAILABLE"`,
    ],
  };
}

function evaluateM5Check(id, summary) {
  switch (id) {
    case 'M5-01':
      return exact([
        ['typed_request_census.expected_get_route_count',
          summary.typed_request_census?.expected_get_route_count, 5],
        ['typed_request_census.discovered_get_route_count',
          summary.typed_request_census?.discovered_get_route_count, 5],
        ['typed_request_census.expected_get_paths_present',
          summary.typed_request_census?.expected_get_paths_present, true],
        ['typed_request_census.params_only_route_count',
          summary.typed_request_census?.params_only_route_count, 5],
        ['typed_request_census.params_schema_definition_count',
          summary.typed_request_census?.params_schema_definition_count, 5],
        ['typed_request_census.body_schema_route_count',
          summary.typed_request_census?.body_schema_route_count, 0],
        ['typed_request_census.querystring_schema_route_count',
          summary.typed_request_census?.querystring_schema_route_count, 0],
        ['typed_request_census.forbidden_m5_get_request_property_count',
          summary.typed_request_census?.forbidden_m5_get_request_property_count, 0],
        ['typed_request_census.response_contract_link_count',
          summary.typed_request_census?.response_contract_link_count, 5],
        ['typed_request_census.closure_post_body_schema_linked',
          summary.typed_request_census?.closure_post_body_schema_linked, true],
        ['typed_request_census.closure_post_validation_cycle_id_required',
          summary.typed_request_census?.closure_post_validation_cycle_id_required, false],
        ['typed_request_census.closure_post_optional_validation_cycle_id',
          summary.typed_request_census?.closure_post_optional_validation_cycle_id, true],
        ['typed_request_census.closure_post_mismatch_guard_present',
          summary.typed_request_census?.closure_post_mismatch_guard_present, true],
        ['typed_request_census.closure_post_mismatch_400_test_covered',
          summary.typed_request_census?.closure_post_mismatch_400_test_covered, true],
        ['typed_request_census.exact', summary.typed_request_census?.exact, true],
      ]);
    case 'M5-02': {
      const blocked = blockedRelationalPredicate(
        'tests.lineage_relational',
        summary.tests?.lineage_relational,
      );
      if (blocked) return blocked;
      return combineAssertions(
        exact([
          ['disposable_postgres.started',
            summary.disposable_postgres?.started, true],
          ['disposable_postgres.existing_database_url_used',
            summary.disposable_postgres?.existing_database_url_used, false],
          ['disposable_postgres.container_database_count',
            summary.disposable_postgres?.container_database_count, 2],
          ['disposable_postgres.databases.d19.database_name_nonce_bound',
            summary.disposable_postgres?.databases?.d19?.database_name_nonce_bound, true],
          ['disposable_postgres.databases.d19.marker.marker_written',
            summary.disposable_postgres?.databases?.d19?.marker?.marker_written, true],
          ['disposable_postgres.databases.d19.identity_environment_complete',
            summary.disposable_postgres?.databases?.d19?.identity_environment_complete, true],
          ['disposable_postgres.cleaned_up',
            summary.disposable_postgres?.cleaned_up, true],
        ]),
        commandAssertion(
          'tests.d19_migration_deploy',
          summary.tests?.d19_migration_deploy,
        ),
        passingTapAssertion(
          'tests.lineage_relational',
          summary.tests?.lineage_relational,
          LINEAGE_RELATIONAL_TESTS,
        ),
      );
    }
    case 'M5-03': {
      const blocked = blockedRelationalPredicate(
        'tests.closure_relational',
        summary.tests?.closure_relational,
      );
      if (blocked) return blocked;
      return combineAssertions(
        exact([
          ['disposable_postgres.container_database_count',
            summary.disposable_postgres?.container_database_count, 2],
          ['disposable_postgres.databases.packc_pi.database_name_nonce_bound',
            summary.disposable_postgres?.databases?.packc_pi?.database_name_nonce_bound,
            true],
          ['disposable_postgres.databases.packc_pi.marker.marker_written',
            summary.disposable_postgres?.databases?.packc_pi?.marker?.marker_written, true],
          ['disposable_postgres.databases.packc_pi.identity_environment_complete',
            summary.disposable_postgres?.databases?.packc_pi
              ?.identity_environment_complete, true],
          ['disposable_postgres.cleaned_up',
            summary.disposable_postgres?.cleaned_up, true],
        ]),
        commandAssertion(
          'tests.packc_pi_database_create',
          summary.tests?.packc_pi_database_create,
        ),
        commandAssertion(
          'tests.packc_pi_migration_deploy',
          summary.tests?.packc_pi_migration_deploy,
        ),
        passingTapAssertion(
          'tests.closure_relational',
          summary.tests?.closure_relational,
          CLOSURE_RELATIONAL_TESTS,
        ),
      );
    }
    case 'M5-04':
      return exact([
        ['zero_write_read_census.scanned_file_count',
          summary.zero_write_read_census?.scanned_file_count,
          ZERO_WRITE_SOURCE_POPULATION.length],
        ['zero_write_read_census.mutation_pattern_count',
          summary.zero_write_read_census?.mutation_pattern_count,
          MUTATION_CALL_KINDS.length],
        ['zero_write_read_census.mutation_call_count',
          summary.zero_write_read_census?.mutation_call_count, 0],
        ['zero_write_read_census.mutating_files.length',
          summary.zero_write_read_census?.mutating_files?.length, 0],
        ['zero_write_read_census.exact',
          summary.zero_write_read_census?.exact, true],
      ]);
    case 'M5-05':
      return passingTapAssertion(
        'tests.backend_targeted',
        summary.tests?.backend_targeted,
        BACKEND_TARGETED_TESTS,
      );
    case 'M5-06':
      return passingTapAssertion(
        'tests.shared_contracts',
        summary.tests?.shared_contracts,
        SHARED_TESTS,
      );
    case 'M5-07':
      return combineAssertions(
        commandAssertion(
          'tests.shared_typecheck',
          summary.tests?.shared_typecheck,
        ),
        commandAssertion(
          'tests.backend_typecheck',
          summary.tests?.backend_typecheck,
        ),
      );
    case 'M5-08':
      return combineAssertions(
        exact([
          ['d24_negative_space.forbidden_module_imports.match_count',
            summary.d24_negative_space?.forbidden_module_imports?.match_count, 0],
          ['d24_negative_space.forbidden_module_imports.matched_file_count',
            summary.d24_negative_space?.forbidden_module_imports?.matched_file_count, 0],
          ['d24_negative_space.forbidden_module_imports.exact',
            summary.d24_negative_space?.forbidden_module_imports?.exact, true],
          ['d24_negative_space.migrations.expected_directory_count',
            summary.d24_negative_space?.migrations?.expected_directory_count, 69],
          ['d24_negative_space.migrations.directory_count',
            summary.d24_negative_space?.migrations?.directory_count, 69],
          ['d24_negative_space.migrations.invalid_directory_name_count',
            summary.d24_negative_space?.migrations?.invalid_directory_name_count, 0],
          ['d24_negative_space.migrations.exact',
            summary.d24_negative_space?.migrations?.exact, true],
          ['d24_negative_space.desktop.status_entry_count',
            summary.d24_negative_space?.desktop?.status_entry_count, 0],
          ['d24_negative_space.desktop.diff_file_count',
            summary.d24_negative_space?.desktop?.diff_file_count, 0],
          ['d24_negative_space.desktop.exact',
            summary.d24_negative_space?.desktop?.exact, true],
          ['source_population.profile',
            summary.source_population?.profile,
            'experiment-foundation-m5-agent-source-population@v1'],
          ['source_population.file_count',
            summary.source_population?.file_count, SOURCE_POPULATION.length],
          ['source_population.digest_format_valid',
            summary.source_population?.digest_format_valid, true],
          ['redaction.summary_self_check_passed',
            summary.redaction?.summary_self_check_passed, true],
        ]),
        exact([
          ['tests.forbidden_module_import_scan.status',
            summary.tests?.forbidden_module_import_scan?.status, 'passed'],
          ['tests.forbidden_module_import_scan.exit_code',
            summary.tests?.forbidden_module_import_scan?.exit_code, 1],
        ]),
        commandAssertion(
          'tests.desktop_status_scan',
          summary.tests?.desktop_status_scan,
        ),
        commandAssertion(
          'tests.desktop_diff_scan',
          summary.tests?.desktop_diff_scan,
        ),
      );
    default:
      throw new Error(`No M5 predicate exists for ${id}`);
  }
}

export function evaluateM5Checks(summary) {
  return Object.fromEntries(REQUIRED_CHECK_IDS.map((id) => {
    const predicate = evaluateM5Check(id, summary);
    return [id, {
      status: predicate.status ?? (predicate.passed ? 'passed' : 'failed'),
      evidence: predicate.fields,
    }];
  }));
}

export function deriveM5GateStatus(checks) {
  const statuses = REQUIRED_CHECK_IDS.map((id) => checks?.[id]?.status);
  if (statuses.some((status) => status === undefined || status === 'failed')) {
    return 'failed';
  }
  if (statuses.some((status) => status === 'blocked')) return 'blocked';
  return statuses.every((status) => status === 'passed') ? 'passed' : 'failed';
}

async function main() {
  const { runId, postgresImage } = parseArgs(process.argv.slice(2));
  const artifactDir = path.join(ARTIFACT_ROOT, runId);
  const summaryPath = path.join(artifactDir, 'summary.json');
  await fs.mkdir(artifactDir, { recursive: true });

  const summary = {
    run_id: runId,
    status: 'running',
    phase: 'M5-A4-agent-first-machine-gate',
    started_at: new Date().toISOString(),
    finished_at: null,
    source_population: null,
    environment_isolation: describeEnvironmentIsolation(),
    typed_request_census: null,
    zero_write_read_census: null,
    d24_negative_space: {
      forbidden_module_imports: null,
      migrations: null,
      desktop: null,
    },
    tests: {},
    disposable_postgres: {
      image: postgresImage,
      existing_database_url_used: false,
      started: false,
      container_database_count: 0,
      databases: {
        d19: {
          database_name: null,
          database_name_nonce_bound: false,
          marker: null,
          identity_environment_complete: false,
        },
        packc_pi: {
          database_name: null,
          database_name_nonce_bound: false,
          marker: null,
          identity_environment_complete: false,
        },
      },
      cleaned_up: false,
    },
    checks: Object.fromEntries(REQUIRED_CHECK_IDS.map((id) => [id, {
      status: 'not_run',
      evidence: [],
    }])),
    redaction: {
      database_url_persisted: false,
      database_password_persisted: false,
      raw_command_output_persisted: false,
      absolute_machine_path_persisted: false,
      summary_self_check_passed: false,
    },
    blockers: [],
  };

  let disposable = null;
  let runtimeFailed = false;
  try {
    const sourceContents = Object.fromEntries(await Promise.all(
      [...new Set([
        ...SOURCE_POPULATION,
        TYPED_REQUEST_SOURCE_PATHS.experimentRouteTests,
      ])].map(async (relativePath) => [
        relativePath,
        await fs.readFile(path.join(REPO_ROOT, relativePath), 'utf8'),
      ]),
    ));
    summary.source_population = await sourcePopulationDigest();
    summary.typed_request_census = inspectM5TypedRequests(
      Object.fromEntries(Object.entries(TYPED_REQUEST_SOURCE_PATHS).map(
        ([key, relativePath]) => [key, sourceContents[relativePath]],
      )),
    );
    summary.zero_write_read_census = inspectMutationCalls(
      Object.fromEntries(ZERO_WRITE_SOURCE_POPULATION.map((relativePath) => [
        relativePath,
        sourceContents[relativePath],
      ])),
    );

    const migrationEntries = await fs.readdir(MIGRATIONS_ROOT, { withFileTypes: true });
    summary.d24_negative_space.migrations = inspectMigrationDirectoryCensus(
      migrationEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
    );
    const forbiddenImportScan = await runInspectionCommand(
      'forbidden-module-import-scan',
      [
        'git', 'grep', '-n', '-I', '-E', '-i',
        FORBIDDEN_MODULE_IMPORT_GREP_PATTERN,
        '--',
        ...SOURCE_POPULATION,
      ],
      artifactDir,
      [0, 1],
      { timeoutMs: 30_000 },
    );
    summary.tests.forbidden_module_import_scan = forbiddenImportScan.evidence;
    summary.d24_negative_space.forbidden_module_imports =
      inspectForbiddenModuleImportScan(forbiddenImportScan.result.stdout);

    const desktopStatusScan = await runInspectionCommand(
      'desktop-status-scan',
      [
        'git', 'status', '--porcelain=v1', '--untracked-files=all',
        '--', 'apps/desktop',
      ],
      artifactDir,
      [0],
      { timeoutMs: 30_000 },
    );
    summary.tests.desktop_status_scan = desktopStatusScan.evidence;
    const desktopDiffScan = await runInspectionCommand(
      'desktop-diff-scan',
      ['git', 'diff', '--name-only', 'HEAD', '--', 'apps/desktop'],
      artifactDir,
      [0],
      { timeoutMs: 30_000 },
    );
    summary.tests.desktop_diff_scan = desktopDiffScan.evidence;
    summary.d24_negative_space.desktop = inspectDesktopChangeScan(
      desktopStatusScan.result.stdout,
      desktopDiffScan.result.stdout,
    );

    summary.tests.shared_typecheck = await runCheckedCommand(
      'shared-typecheck',
      ['pnpm', '--filter', '@paper-engineering-assistant/shared', 'typecheck'],
      artifactDir,
      { timeoutMs: 240_000 },
    );
    summary.tests.backend_typecheck = await runCheckedCommand(
      'backend-typecheck',
      ['pnpm', '--filter', '@paper-engineering-assistant/backend', 'typecheck'],
      artifactDir,
      { timeoutMs: 300_000 },
    );
    summary.tests.shared_contracts = await runTapTests(
      'shared-contract-tests',
      path.join(REPO_ROOT, 'packages/shared'),
      SHARED_TESTS,
      artifactDir,
      { timeoutMs: 240_000 },
    );
    summary.tests.backend_targeted = await runTapTests(
      'backend-targeted-tests',
      path.join(REPO_ROOT, 'apps/backend'),
      BACKEND_TARGETED_TESTS,
      artifactDir,
      {
        env: {
          PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED: '',
          PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED: '',
          EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED: '',
          EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED: '',
          EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED: '',
          EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED: '',
        },
        timeoutMs: 480_000,
      },
    );

    disposable = await startDisposablePostgres({
      runId,
      postgresImage,
      runCommand: run,
      safeTail,
      databasePrefixes: ['d19', 'packc_pi'],
      containerNamePrefix: 'pea-m5-agent',
      portResolutionErrorMessage: 'Cannot resolve disposable M5 PostgreSQL port',
      portWaitErrorMessage: 'Disposable M5 PostgreSQL port did not become reachable',
      postgresWaitErrorMessage: 'Disposable M5 PostgreSQL did not become ready',
      startupFailureMessage: 'Disposable M5 PostgreSQL startup failed',
      pgIsReadyArguments: (databaseName) => [
        'pg_isready', '-U', 'postgres', '-d', databaseName,
      ],
    });
    const d19DatabaseName = disposable.databaseNames.d19;
    const d19DatabaseUrl = disposable.databaseUrls.d19;
    const packcPiDatabaseName = disposable.databaseNames.packc_pi;
    const packcPiDatabaseUrl = disposable.databaseUrls.packc_pi;
    summary.disposable_postgres.started = true;
    summary.disposable_postgres.container_database_count = 2;
    summary.disposable_postgres.databases.d19.database_name = d19DatabaseName;
    summary.disposable_postgres.databases.d19.database_name_nonce_bound =
      d19DatabaseName === `d19_${disposable.nonce.slice(0, 12)}`;
    summary.disposable_postgres.databases.packc_pi.database_name = packcPiDatabaseName;
    summary.disposable_postgres.databases.packc_pi.database_name_nonce_bound =
      packcPiDatabaseName === `packc_pi_${disposable.nonce.slice(0, 12)}`;

    summary.tests.packc_pi_database_create = await runCheckedCommand(
      'packc-pi-database-create',
      [
        'docker', 'exec', disposable.containerName,
        'createdb', '-U', 'postgres', packcPiDatabaseName,
      ],
      artifactDir,
      { timeoutMs: 30_000 },
    );
    summary.disposable_postgres.databases.d19.marker = await markDisposableDatabase({
      runCommand: run,
      safeTail,
      containerName: disposable.containerName,
      databaseName: d19DatabaseName,
      marker: `experiment-foundation-d19-disposable:${disposable.nonce}`,
      failureMessage: 'Cannot mark disposable M5 D-19 database',
    });
    summary.disposable_postgres.databases.packc_pi.marker =
      await markDisposableDatabase({
        runCommand: run,
        safeTail,
        containerName: disposable.containerName,
        databaseName: packcPiDatabaseName,
        marker: `experiment-foundation-packc-pi-disposable:${disposable.nonce}`,
        failureMessage: 'Cannot mark disposable M5 Pack C-PI database',
      });

    summary.tests.d19_migration_deploy = await runCheckedCommand(
      'd19-migration-deploy',
      ['pnpm', 'exec', 'prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
      artifactDir,
      { env: { DATABASE_URL: d19DatabaseUrl }, timeoutMs: 300_000 },
    );
    summary.disposable_postgres.databases.d19.identity_environment_complete = true;
    summary.tests.lineage_relational = await runTapTests(
      'lineage-relational-tests',
      path.join(REPO_ROOT, 'apps/backend'),
      LINEAGE_RELATIONAL_TESTS,
      artifactDir,
      {
        env: {
          DATABASE_URL: d19DatabaseUrl,
          EXPERIMENT_V2_TEST_DATABASE_URL: d19DatabaseUrl,
          EXPERIMENT_V2_TEST_DATABASE_NAME: d19DatabaseName,
          EXPERIMENT_V2_TEST_DISPOSABLE_NONCE: disposable.nonce,
          PAPER_IMPLEMENTATION_EXPERIMENT_LINEAGE_V2_RELATIONAL_PRISMA: '1',
        },
        timeoutMs: 420_000,
      },
    );

    summary.tests.packc_pi_migration_deploy = await runCheckedCommand(
      'packc-pi-migration-deploy',
      ['pnpm', 'exec', 'prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
      artifactDir,
      { env: { DATABASE_URL: packcPiDatabaseUrl }, timeoutMs: 300_000 },
    );
    summary.disposable_postgres.databases.packc_pi.identity_environment_complete = true;
    summary.tests.closure_relational = await runTapTests(
      'closure-relational-tests',
      path.join(REPO_ROOT, 'apps/backend'),
      CLOSURE_RELATIONAL_TESTS,
      artifactDir,
      {
        env: {
          DATABASE_URL: packcPiDatabaseUrl,
          EXPERIMENT_V2_TEST_DATABASE_URL: packcPiDatabaseUrl,
          EXPERIMENT_V2_TEST_DATABASE_NAME: packcPiDatabaseName,
          EXPERIMENT_V2_TEST_DISPOSABLE_NONCE: disposable.nonce,
          PAPER_IMPLEMENTATION_PACKC_PI_DATABASE_URL: packcPiDatabaseUrl,
          PAPER_IMPLEMENTATION_PACKC_PI_DISPOSABLE_NONCE: disposable.nonce,
          PAPER_IMPLEMENTATION_EVIDENCE_CLOSURE_V2_RELATIONAL_PRISMA: '1',
        },
        timeoutMs: 720_000,
      },
    );
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'DISPOSABLE_POSTGRES_UNAVAILABLE') {
      const blockedEvidence = {
        status: 'blocked',
        reason_code: 'DISPOSABLE_POSTGRES_UNAVAILABLE',
      };
      summary.tests.lineage_relational ??= { ...blockedEvidence };
      summary.tests.closure_relational ??= { ...blockedEvidence };
      summary.blockers.push({
        reason_code: 'DISPOSABLE_POSTGRES_UNAVAILABLE',
        message: error.message,
      });
    } else {
      runtimeFailed = true;
      summary.blockers.push({
        reason_code: 'M5_GATE_FAILED',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  } finally {
    if (disposable) {
      const cleanup = await stopDisposablePostgres(disposable.containerName, {
        runCommand: run,
      });
      summary.disposable_postgres.cleaned_up = cleanup.exit_code === 0;
      if (cleanup.exit_code !== 0) {
        runtimeFailed = true;
        summary.blockers.push({
          reason_code: 'DISPOSABLE_POSTGRES_CLEANUP_FAILED',
          message: safeTail(cleanup.stderr),
        });
      }
    }
    summary.finished_at = new Date().toISOString();
    try {
      assertDurableSummaryRedaction(normalizeSummaryPaths(summary));
      summary.redaction.summary_self_check_passed = true;
    } catch {
      runtimeFailed = true;
      summary.redaction.summary_self_check_passed = false;
      summary.blockers.push({
        reason_code: 'M5_DURABLE_SUMMARY_REDACTION_FAILED',
        message: 'The durable M5 summary failed its final redaction self-check.',
      });
    }
    summary.checks = evaluateM5Checks(summary);
    const predicateStatus = deriveM5GateStatus(summary.checks);
    summary.status = runtimeFailed ? 'failed' : predicateStatus;
    const failedChecks = Object.entries(summary.checks)
      .filter(([, check]) => check.status === 'failed')
      .map(([id]) => id);
    const blockedChecks = Object.entries(summary.checks)
      .filter(([, check]) => check.status === 'blocked')
      .map(([id]) => id);
    if (
      failedChecks.length > 0
      && !summary.blockers.some((blocker) => blocker.reason_code === 'M5_PREDICATE_FAILED')
    ) {
      summary.blockers.push({
        reason_code: 'M5_PREDICATE_FAILED',
        message: `Executable M5 predicates failed: ${failedChecks.join(', ')}.`,
      });
    } else if (
      blockedChecks.length > 0
      && !summary.blockers.some(
        (blocker) => blocker.reason_code === 'DISPOSABLE_POSTGRES_UNAVAILABLE',
      )
    ) {
      summary.blockers.push({
        reason_code: 'M5_PREDICATE_BLOCKED',
        message: `Executable M5 predicates were blocked: ${blockedChecks.join(', ')}.`,
      });
    }
    const durableSummary = normalizeSummaryPaths(summary);
    assertDurableSummaryRedaction(durableSummary);
    await writeJsonAtomic(summaryPath, durableSummary);
  }

  console.log(JSON.stringify({
    status: summary.status,
    run_id: runId,
    summary_path: path.relative(REPO_ROOT, summaryPath),
  }));
  process.exitCode = summary.status === 'passed' ? 0 : summary.status === 'blocked' ? 2 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
