// SlotParameterManifest@v1 guards (T-124 S2-D, D5):
// 1. committed snapshot freshness (runtime export == docs/context snapshot);
// 2. four-way completeness: runtime-slots routes ↔ manifest entries ↔
//    runtime-stress must-check case keys ↔ provider canary env flags,
//    including the negative direction (a removed manifest entry goes red);
// 3. slot binding facts pinned to the slot service source (context policy id,
//    token budget) without touching the services;
// 4. materialization class census (claim/dossier/result-analysis only);
// 5. P-07 L1 negatives: per-request bare model parameters (temperature,
//    max_tokens, raw provider params, unknown keys) are rejected by every
//    strict runtime run request schema.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { Ajv } from 'ajv';
import {
  runPaperImplementationCrossBoardSynthesisRuntimeRequestSchema,
  runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema,
  runPaperImplementationExperimentPlanningRuntimeRequestSchema,
  runPaperImplementationFeasibilityPlanningRuntimeRequestSchema,
  runPaperImplementationMotiveDecompositionRuntimeRequestSchema,
  runPaperImplementationMotiveEvolutionRuntimeRequestSchema,
  runPaperImplementationP1RuntimeReviewRequestSchema,
  runPaperImplementationResultAnalysisRuntimeRequestSchema,
  runPaperImplementationRoutePlanningRuntimeRequestSchema,
  runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema,
  runPaperImplementationValidationCyclePlanningRuntimeRequestSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';

import {
  exportPaperImplementationSlotParameterManifest,
  PAPER_IMPLEMENTATION_NON_SLOT_CANARY_ENV_FLAGS,
  PAPER_IMPLEMENTATION_SLOT_MANIFEST_BINDINGS,
  PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_EXPORT_SCRIPT,
  PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_SNAPSHOT_PATH,
  verifyPaperImplementationSlotParameterManifestCompleteness,
  type PaperImplementationSlotParameterManifest,
} from './paper-implementation-slot-parameter-manifest.js';

const REPO_ROOT_URL = new URL('../../../../', import.meta.url);
const ROUTES_FILE_PATH = fileURLToPath(
  new URL('../routes/paper-implementation-routes.ts', import.meta.url),
);
const STRESS_SCRIPT_PATH = fileURLToPath(
  new URL('.ai/scripts/paper-implementation-runtime-stress.mjs', REPO_ROOT_URL),
);
const SNAPSHOT_PATH = fileURLToPath(
  new URL(PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_SNAPSHOT_PATH, REPO_ROOT_URL),
);

function parseRouteSlotSegments(): string[] {
  const source = readFileSync(ROUTES_FILE_PATH, 'utf8');
  const segments = new Set<string>();
  for (const match of source.matchAll(/runtime-slots\/([a-z0-9-]+)\/run/g)) {
    segments.add(match[1]);
  }
  return [...segments];
}

function parseStressRequiredCaseKeys(): string[] {
  const source = readFileSync(STRESS_SCRIPT_PATH, 'utf8');
  const keys = new Set<string>();
  for (const match of source.matchAll(/^\s*key: '([a-z0-9_]+)',$/gm)) {
    keys.add(match[1]);
  }
  return [...keys];
}

function parseCanaryEnvFlags(filePath: string): string[] {
  const source = readFileSync(filePath, 'utf8');
  const flags = new Set<string>();
  for (const match of source.matchAll(/T114_[A-Z0-9_]+_CANARY_LIVE/g)) {
    flags.add(match[0]);
  }
  return [...flags];
}

function parseStressCanaryEnvFlags(): string[] {
  return parseCanaryEnvFlags(STRESS_SCRIPT_PATH);
}

function completenessInput(manifest: PaperImplementationSlotParameterManifest): {
  manifest: PaperImplementationSlotParameterManifest;
  route_slot_segments: string[];
  stress_required_case_keys: string[];
  canary_env_flags: string[];
} {
  return {
    manifest,
    route_slot_segments: parseRouteSlotSegments(),
    stress_required_case_keys: parseStressRequiredCaseKeys(),
    canary_env_flags: parseStressCanaryEnvFlags(),
  };
}

void test('runtime export matches the committed SlotParameterManifest snapshot (freshness)', () => {
  const manifest = exportPaperImplementationSlotParameterManifest();
  const snapshotRaw = readFileSync(SNAPSHOT_PATH, 'utf8');
  const snapshot: unknown = JSON.parse(snapshotRaw);
  assert.deepStrictEqual(
    snapshot,
    JSON.parse(JSON.stringify(manifest)),
    `Committed snapshot ${PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_SNAPSHOT_PATH} is stale. Regenerate with: node ${PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_EXPORT_SCRIPT}`,
  );
  assert.strictEqual(
    snapshotRaw,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'Snapshot serialization must be the deterministic 2-space export format.',
  );
});

void test('four-way completeness: routes ↔ manifest ↔ runtime-stress must-check ↔ canary flags', () => {
  const manifest = exportPaperImplementationSlotParameterManifest();
  const input = completenessInput(manifest);

  assert.ok(input.route_slot_segments.length > 0, 'route parsing must find runtime-slot routes');
  assert.ok(input.stress_required_case_keys.length > 0, 'stress case parsing must find keys');
  assert.ok(input.canary_env_flags.length > 0, 'canary flag parsing must find flags');

  const issues = verifyPaperImplementationSlotParameterManifestCompleteness(input);
  assert.deepStrictEqual(issues, [], `four-way completeness issues: ${JSON.stringify(issues)}`);

  assert.strictEqual(manifest.slot_count, manifest.slots.length);
  assert.strictEqual(manifest.slots.length, input.route_slot_segments.length);
  const slotCanaryFlags = input.canary_env_flags.filter(
    (flag) => !PAPER_IMPLEMENTATION_NON_SLOT_CANARY_ENV_FLAGS.includes(
      flag as (typeof PAPER_IMPLEMENTATION_NON_SLOT_CANARY_ENV_FLAGS)[number],
    ),
  );
  assert.strictEqual(manifest.slots.length, slotCanaryFlags.length);

  // The live-canary execution site (runtime routes integration test) must carry
  // exactly the same flag set as the runtime-stress gate declaration.
  const integrationTestFlags = parseCanaryEnvFlags(
    fileURLToPath(
      new URL('../routes/paper-implementation-runtime-routes.integration.test.ts', import.meta.url),
    ),
  );
  assert.deepStrictEqual(
    [...integrationTestFlags].sort(),
    [...input.canary_env_flags].sort(),
    'canary env flag drift between runtime-stress script and runtime routes integration test',
  );
});

void test('four-way completeness negative: removing one manifest entry goes red on all axes', () => {
  const manifest = exportPaperImplementationSlotParameterManifest();
  const mutated: PaperImplementationSlotParameterManifest = {
    ...manifest,
    slots: manifest.slots.slice(1),
    slot_count: manifest.slot_count - 1,
  };
  const removed = manifest.slots[0];
  const issues = verifyPaperImplementationSlotParameterManifestCompleteness(
    completenessInput(mutated),
  );
  assert.ok(
    issues.some(
      (issue) =>
        issue.code === 'ROUTE_MISSING_MANIFEST_ENTRY'
        && issue.detail.includes(removed.runtime_route_segment),
    ),
    `expected ROUTE_MISSING_MANIFEST_ENTRY for ${removed.runtime_route_segment}, got ${JSON.stringify(issues)}`,
  );
  assert.ok(
    issues.some(
      (issue) =>
        issue.code === 'CANARY_FLAG_MISSING_MANIFEST_ENTRY'
        && issue.detail.includes(removed.canary_env_flag),
    ),
    `expected CANARY_FLAG_MISSING_MANIFEST_ENTRY for ${removed.canary_env_flag}, got ${JSON.stringify(issues)}`,
  );
});

void test('four-way completeness negative: unknown stress key or canary flag goes red', () => {
  const manifest = exportPaperImplementationSlotParameterManifest();
  const mutated: PaperImplementationSlotParameterManifest = structuredClone(manifest);
  mutated.slots[0].runtime_stress_required_case_keys = ['nonexistent_stress_case_key'];
  mutated.slots[1].canary_env_flag = 'T114_NONEXISTENT_PROVIDER_CANARY_LIVE';

  const issues = verifyPaperImplementationSlotParameterManifestCompleteness(
    completenessInput(mutated),
  );
  assert.ok(issues.some((issue) => issue.code === 'STRESS_CASE_KEY_UNKNOWN'));
  assert.ok(issues.some((issue) => issue.code === 'MANIFEST_ENTRY_CANARY_FLAG_UNKNOWN'));
  assert.ok(issues.some((issue) => issue.code === 'CANARY_FLAG_MISSING_MANIFEST_ENTRY'));
});

void test('slot bindings pin context policy id and token budget to the slot service source', () => {
  for (const binding of PAPER_IMPLEMENTATION_SLOT_MANIFEST_BINDINGS) {
    const servicePath = fileURLToPath(new URL(binding.service_module, REPO_ROOT_URL));
    // Numeric-separator underscores (24_000) are normalized so the manifest's
    // plain numbers can be matched against the service source verbatim.
    const source = readFileSync(servicePath, 'utf8').replace(/(\d)_(?=\d)/g, '$1');

    assert.ok(
      source.includes(`'${binding.context_policy_profile_id}'`),
      `${binding.slot_id}: context policy id ${binding.context_policy_profile_id} not found in ${binding.service_module}`,
    );

    const budgetChecks: Array<[string, number]> = [
      ['estimated_input_token_target', binding.token_budget.estimated_input_token_target],
      ['estimated_output_token_budget', binding.token_budget.estimated_output_token_budget],
      ['context_window_tokens', binding.token_budget.context_window_tokens],
      ['token_estimate_safety_margin', binding.token_budget.token_estimate_safety_margin],
    ];
    for (const [field, value] of budgetChecks) {
      assert.ok(
        source.includes(`${field}: ${value}`),
        `${binding.slot_id}: token budget ${field}=${value} not found in ${binding.service_module}`,
      );
    }
  }
});

void test('materialization classes: exactly claim/dossier/result-analysis are domain-gate materializable', () => {
  const manifest = exportPaperImplementationSlotParameterManifest();
  const materializable = manifest.slots
    .filter((slot) => slot.materialization_class === 'domain_gate_materializable')
    .map((slot) => slot.slot_id)
    .sort();
  assert.deepStrictEqual(materializable, [
    'claim_boundary_review.boundary_debate',
    'dossier_readiness_prep.readiness_audit',
    'result_analysis.interpretation_scenarios',
  ]);
  const handoffOnly = manifest.slots.filter(
    (slot) => slot.materialization_class === 'handoff_only',
  );
  assert.deepStrictEqual(handoffOnly, [], 'handoff_only is reserved and unused in v1');
  for (const slot of manifest.slots) {
    if (!materializable.includes(slot.slot_id)) {
      assert.strictEqual(
        slot.materialization_class,
        'proposal_only',
        `${slot.slot_id} must be proposal_only`,
      );
    }
  }
});

void test('D2/D4 mounts stay explicit null placeholders until those decisions land', () => {
  const manifest = exportPaperImplementationSlotParameterManifest();
  for (const slot of manifest.slots) {
    assert.strictEqual(slot.debate_policy, null);
    assert.strictEqual(slot.candidate_selection_policy, null);
    assert.strictEqual(slot.memory_families, null);
  }
});

// ---------------------------------------------------------------------------
// P-07 L1 negatives: bare per-request model parameters rejected at schema layer.
// ---------------------------------------------------------------------------

interface RuntimeRunRequestSchemaShape {
  additionalProperties?: boolean;
  properties?: Record<string, unknown>;
}

const RUNTIME_RUN_REQUEST_SCHEMAS: Array<[string, RuntimeRunRequestSchemaShape]> = [
  ['trace-integrity', runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema],
  ['p1-review (claim-boundary/dossier-readiness)', runPaperImplementationP1RuntimeReviewRequestSchema],
  ['result-analysis', runPaperImplementationResultAnalysisRuntimeRequestSchema],
  ['experiment-planning (design/critique)', runPaperImplementationExperimentPlanningRuntimeRequestSchema],
  ['route-planning (architecture/skeptic)', runPaperImplementationRoutePlanningRuntimeRequestSchema],
  ['validation-cycle-planning', runPaperImplementationValidationCyclePlanningRuntimeRequestSchema],
  ['feasibility-planning', runPaperImplementationFeasibilityPlanningRuntimeRequestSchema],
  ['cross-board-synthesis', runPaperImplementationCrossBoardSynthesisRuntimeRequestSchema],
  ['evidence-board-curation', runPaperImplementationEvidenceBoardCurationRuntimeRequestSchema],
  ['motive-decomposition', runPaperImplementationMotiveDecompositionRuntimeRequestSchema],
  ['motive-evolution', runPaperImplementationMotiveEvolutionRuntimeRequestSchema],
];

const BARE_MODEL_PARAMETER_PAYLOADS: Array<[string, Record<string, unknown>]> = [
  ['temperature', { temperature: 0.7 }],
  ['max_tokens', { max_tokens: 4096 }],
  ['top_p', { top_p: 0.9 }],
  ['provider_params', { provider_params: { reasoning_effort: 'high' } }],
  ['model_params', { model_params: { temperature: 0.2 } }],
  ['provider_overrides', { provider_overrides: { enable_thinking: true } }],
];

void test('P-07: runtime run request schemas are strict and reject bare model parameters', () => {
  const ajv = new Ajv({ allErrors: true, strict: false, removeAdditional: false });

  for (const [name, schema] of RUNTIME_RUN_REQUEST_SCHEMAS) {
    assert.strictEqual(
      schema.additionalProperties,
      false,
      `${name}: runtime run request schema must be strict (additionalProperties: false)`,
    );
    const declaredKeys = Object.keys(schema.properties ?? {});
    for (const [key] of BARE_MODEL_PARAMETER_PAYLOADS) {
      assert.ok(
        !declaredKeys.includes(key),
        `${name}: schema must not declare bare model parameter key ${key}`,
      );
    }

    const validate = ajv.compile(schema);
    for (const [key, payload] of BARE_MODEL_PARAMETER_PAYLOADS) {
      const valid = validate(payload);
      assert.strictEqual(valid, false, `${name}: payload with ${key} must fail validation`);
      const rejectedAsUnknownKey = (validate.errors ?? []).some(
        (error) =>
          error.keyword === 'additionalProperties'
          && (error.params as { additionalProperty?: string }).additionalProperty === key,
      );
      assert.ok(
        rejectedAsUnknownKey,
        `${name}: ${key} must be rejected as an unknown key at the schema layer (errors: ${JSON.stringify(validate.errors)})`,
      );
    }
  }
});

void test('P-07: bare parameters nested next to a valid execution field are still rejected', () => {
  const ajv = new Ajv({ allErrors: true, strict: false, removeAdditional: false });
  const validate = ajv.compile(runPaperImplementationTraceIntegrityDebateRuntimeRequestSchema);
  const valid = validate({
    run_mode: 'test',
    execution_mode: 'provider_llm',
    temperature: 0.3,
  });
  assert.strictEqual(valid, false);
  assert.ok(
    (validate.errors ?? []).some(
      (error) =>
        error.keyword === 'additionalProperties'
        && (error.params as { additionalProperty?: string }).additionalProperty === 'temperature',
    ),
  );
});
