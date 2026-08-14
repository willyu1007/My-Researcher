import assert from 'node:assert/strict';
import test from 'node:test';

import {
  scientificEvidenceP5LiveSourceGateV1,
  type ScientificEvidenceP5LiveSourceAttemptV1,
} from './scientific-evidence-p5-live-source-gate-service.js';

test('P5 live source gate completes only with one scientific source per terminal collection', () => {
  assert.equal(scientificEvidenceP5LiveSourceGateV1({
    attempts: [terminalAttempt(1), terminalAttempt(1)],
    expected_attempt_count: 2,
    pending_command_count: 0,
  }), 'complete');
});

test('P5 live source gate waits while collection or commands can still progress', () => {
  assert.equal(scientificEvidenceP5LiveSourceGateV1({
    attempts: [terminalAttempt(0), terminalAttempt(0)],
    expected_attempt_count: 2,
    pending_command_count: 1,
  }), 'continue');
  assert.equal(scientificEvidenceP5LiveSourceGateV1({
    attempts: [terminalAttempt(1), { ...terminalAttempt(1), lifecycleState: 'running' }],
    expected_attempt_count: 2,
    pending_command_count: 0,
  }), 'continue');
});

test('P5 live source gate fails fast after diagnostic-only terminal collections', () => {
  assert.throws(() => scientificEvidenceP5LiveSourceGateV1({
    attempts: [terminalAttempt(0), terminalAttempt(0)],
    expected_attempt_count: 2,
    pending_command_count: 0,
  }), /T136_P5_SCIENTIFIC_SOURCE_MISSING/);
});

test('P5 live source gate rejects duplicate scientific sources', () => {
  assert.throws(() => scientificEvidenceP5LiveSourceGateV1({
    attempts: [terminalAttempt(1), terminalAttempt(2)],
    expected_attempt_count: 2,
    pending_command_count: 0,
  }), /T136_P5_SCIENTIFIC_SOURCE_CARDINALITY_INVALID/);
});

function terminalAttempt(sourceCount: number): ScientificEvidenceP5LiveSourceAttemptV1 {
  return {
    lifecycleState: 'succeeded',
    terminalReasonCode: 'real_provider_succeeded',
    collectionAttempt: {
      collectionState: 'collected',
      provisionalOutputs: [
        { outputClass: 'diagnostic_only' },
        ...Array.from({ length: sourceCount }, () => ({ outputClass: 'scientific_source' })),
      ],
    },
  };
}
