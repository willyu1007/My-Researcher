import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildApp } from '../app.js';

const OPENAPI_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../docs/context/api/openapi.yaml',
);

// The v2 control-plane families whose served routes must be documented in
// docs/context/api/openapi.yaml. The legacy v1 lanes are excluded explicitly:
// /experiment-foundation/records* and /experiment-foundation/readiness* are the
// deprecated v1 record/readiness lane, and /paper-implementation/projects/*
// non-v2 runtime routes are the pre-v2 product lane documented elsewhere.
const COVERED_PREFIXES = ['/experiment-foundation/v2/'] as const;
const COVERED_V2_MARKERS = [
  '/closure/v2',
  '/experiment-work-orders/v2',
  '/experiment-lineage',
  '/revision-history',
  '/available-actions',
] as const;

function isCoveredServedRoute(routePath: string): boolean {
  if (COVERED_PREFIXES.some((prefix) => routePath.startsWith(prefix))) return true;
  return routePath.startsWith('/paper-implementation/')
    && COVERED_V2_MARKERS.some((marker) => routePath.includes(marker));
}

function collectServedRoutes(
  register: (listener: (route: { method: string | string[]; url: string }) => void) => void,
): Set<string> {
  const census = new Set<string>();
  register((route) => {
    const routePath = route.url.replace(/:([A-Za-z0-9_]+)/gu, '{$1}');
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    for (const method of methods) {
      if (method === 'HEAD' || method === 'OPTIONS') continue;
      if (isCoveredServedRoute(routePath)) census.add(`${method} ${routePath}`);
    }
  });
  return census;
}

function documentedOperations(openapiSource: string): Set<string> {
  const documented = new Set<string>();
  const lines = openapiSource.split('\n');
  let inPaths = false;
  let currentPath: string | null = null;
  for (const line of lines) {
    if (/^paths:/u.test(line)) {
      inPaths = true;
      continue;
    }
    if (inPaths && /^[a-z]/iu.test(line)) {
      inPaths = false;
    }
    if (!inPaths) continue;
    const pathMatch = line.match(/^ {2}(\/[^\s:]*):\s*$/u);
    if (pathMatch) {
      currentPath = pathMatch[1]!;
      continue;
    }
    const methodMatch = line.match(/^ {4}(get|post|put|patch|delete):\s*$/u);
    if (methodMatch && currentPath) {
      documented.add(`${methodMatch[1]!.toUpperCase()} ${currentPath}`);
    }
  }
  return documented;
}

test('every served EF/PI v2 control-plane route is documented in openapi.yaml', async () => {
  const app = buildApp({
    paperImplementationExperimentV2AdmissionEnabled: () => false,
    paperImplementationValidationCycleClosureV2Enabled: () => false,
    paperImplementationExperimentV2CutoverCommitted: () => false,
    experimentFoundationV2WorkflowSimulationEnabled: () => false,
    experimentFoundationV2ScientificValidationEnabled: () => false,
    experimentFoundationV2RealProviderIntakeEnabled: () => false,
    experimentFoundationV2RealProviderControlDrainEnabled: () => false,
    backgroundWorkEnabled: false,
  });
  // Route registration is deferred until ready(), so an onRoute hook attached
  // here observes every late-registered v2 route.
  const served = collectServedRoutes((listener) => {
    app.addHook('onRoute', listener);
  });
  try {
    await app.ready();
    const documented = documentedOperations(readFileSync(OPENAPI_PATH, 'utf8'));

    assert.ok(served.size >= 13, `v2 route census unexpectedly small: ${served.size}`);
    const undocumented = [...served].filter((operation) => !documented.has(operation)).sort();
    assert.deepEqual(
      undocumented,
      [],
      `Served v2 routes missing from docs/context/api/openapi.yaml: ${undocumented.join('; ')}`,
    );
  } finally {
    await app.close();
  }
});
