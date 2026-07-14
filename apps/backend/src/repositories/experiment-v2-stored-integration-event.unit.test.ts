import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decodeExperimentV2InboxOutcome,
  StoredExperimentV2EventIntegrityError,
} from './experiment-v2-stored-integration-event.js';

test('stored integration inbox decoder accepts the closed outcome/status/reason pairs', () => {
  assert.deepEqual(decodeExperimentV2InboxOutcome({
    status: 'processed',
    outcome: 'processed',
    reasonCode: null,
  }), {
    status: 'processed',
    outcome: 'processed',
    reason_code: null,
  });
  for (const outcome of ['ignored_stale', 'terminal_conflict'] as const) {
    assert.equal(decodeExperimentV2InboxOutcome({
      status: 'processed',
      outcome,
      reasonCode: 'BRANCH_HEAD_SCOPE_CONFLICT',
    }).outcome, outcome);
  }
  assert.equal(decodeExperimentV2InboxOutcome({
    status: 'retryable',
    outcome: 'retryable',
    reasonCode: 'INTEGRATION_PREREQUISITE_NOT_READY',
  }).outcome, 'retryable');
});

test('stored integration inbox decoder rejects closed-set and pair drift', () => {
  const invalidRows = [
    { status: 'processed', outcome: 'unknown', reasonCode: null },
    { status: 'unknown', outcome: 'processed', reasonCode: null },
    { status: 'retryable', outcome: 'processed', reasonCode: null },
    { status: 'processed', outcome: 'processed', reasonCode: 'BRANCH_HEAD_SCOPE_CONFLICT' },
    { status: 'processed', outcome: 'terminal_conflict', reasonCode: null },
    { status: 'processed', outcome: 'terminal_conflict', reasonCode: 'UNKNOWN_REASON' },
  ];
  for (const row of invalidRows) {
    assert.throws(
      () => decodeExperimentV2InboxOutcome(row),
      StoredExperimentV2EventIntegrityError,
    );
  }
});
