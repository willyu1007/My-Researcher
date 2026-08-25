import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assessPaperImplementationDebateComplexityShadow,
  PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_SHADOW_SCHEMA_VERSION,
} from './paper-implementation-debate-complexity-shadow.js';
import type {
  PaperImplementationDebateComplexityShadowInputs,
} from './paper-implementation-debate-complexity-shadow.js';

function inputs(
  overrides: Partial<PaperImplementationDebateComplexityShadowInputs> = {},
): PaperImplementationDebateComplexityShadowInputs {
  const base: PaperImplementationDebateComplexityShadowInputs = {
    reviewed_statement_count: 0,
    retrieval_packet_ref_count: 0,
    prior_blocker_density: 0,
    target_kind: 'trace_integrity',
  };
  return { ...base, ...overrides };
}

test('low-stakes minimal inputs recommend light', () => {
  const result = assessPaperImplementationDebateComplexityShadow(inputs());
  assert.equal(result.recommended_tier, 'light');
  assert.deepEqual(result.rationale_codes, ['BASELINE_LIGHT']);
  assert.equal(result.schema_version, PAPER_IMPLEMENTATION_DEBATE_COMPLEXITY_SHADOW_SCHEMA_VERSION);
});

test('moderate statement count recommends standard', () => {
  const result = assessPaperImplementationDebateComplexityShadow(
    inputs({ reviewed_statement_count: 5 }),
  );
  assert.equal(result.recommended_tier, 'standard');
  assert.ok(result.rationale_codes.includes('STATEMENT_COUNT_STANDARD'));
});

test('high statement count recommends full', () => {
  const result = assessPaperImplementationDebateComplexityShadow(
    inputs({ reviewed_statement_count: 12 }),
  );
  assert.equal(result.recommended_tier, 'full');
  assert.ok(result.rationale_codes.includes('STATEMENT_COUNT_FULL'));
});

test('high prior blocker density escalates to full', () => {
  const result = assessPaperImplementationDebateComplexityShadow(
    inputs({ prior_blocker_density: 0.6 }),
  );
  assert.equal(result.recommended_tier, 'full');
  assert.ok(result.rationale_codes.includes('PRIOR_BLOCKER_DENSITY_FULL'));
});

test('high-stakes target applies a standard floor even with light signals', () => {
  const result = assessPaperImplementationDebateComplexityShadow(
    inputs({ target_kind: 'dossier_readiness' }),
  );
  assert.equal(result.recommended_tier, 'standard');
  assert.ok(result.rationale_codes.includes('HIGH_STAKES_TARGET_STANDARD_FLOOR'));
});

test('assessment is deterministic — same inputs yield same tier and hash', () => {
  const first = assessPaperImplementationDebateComplexityShadow(
    inputs({ reviewed_statement_count: 6, retrieval_packet_ref_count: 4, target_kind: 'motive_evolution' }),
  );
  const second = assessPaperImplementationDebateComplexityShadow(
    inputs({ reviewed_statement_count: 6, retrieval_packet_ref_count: 4, target_kind: 'motive_evolution' }),
  );
  assert.equal(first.recommended_tier, second.recommended_tier);
  assert.equal(first.inputs_hash, second.inputs_hash);
  assert.deepEqual(first.rationale_codes, second.rationale_codes);
});

test('normalization: negative / non-finite inputs collapse to the baseline', () => {
  const negative = assessPaperImplementationDebateComplexityShadow(
    inputs({ reviewed_statement_count: -5, retrieval_packet_ref_count: Number.NaN, prior_blocker_density: -1 }),
  );
  const zero = assessPaperImplementationDebateComplexityShadow(inputs());
  assert.equal(negative.recommended_tier, 'light');
  assert.equal(negative.inputs_hash, zero.inputs_hash);
});

test('different inputs produce different hashes', () => {
  const a = assessPaperImplementationDebateComplexityShadow(inputs({ reviewed_statement_count: 1 }));
  const b = assessPaperImplementationDebateComplexityShadow(inputs({ reviewed_statement_count: 2 }));
  assert.notEqual(a.inputs_hash, b.inputs_hash);
});
