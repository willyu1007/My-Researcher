import assert from 'node:assert/strict';
import test from 'node:test';

import { findForbiddenNestedField } from './experiment-v2-route-validation.js';

test('findForbiddenNestedField searches nested objects and arrays without mutating input', () => {
  const input = {
    allowed: [{ nested: true }, { payload_hash: 'caller-authored' }],
  };
  const before = structuredClone(input);
  assert.equal(findForbiddenNestedField(input, new Set(['payload_hash'])), 'payload_hash');
  assert.deepEqual(input, before);
  assert.equal(findForbiddenNestedField(input, new Set(['other'])), null);
  assert.equal(findForbiddenNestedField(null, new Set(['payload_hash'])), null);
});
