import assert from 'node:assert/strict';
import test from 'node:test';
import { OverviewStatusResolver } from './overview-status-resolver.js';

test('OverviewStatusResolver resolves status with fixed priority', () => {
  const resolver = new OverviewStatusResolver();

  assert.equal(
    resolver.resolve({
      topicScopeStatus: 'excluded',
      citationComplete: true,
      abstractReady: true,
      keyContentReady: true,
    }),
    'excluded',
  );

  assert.equal(
    resolver.resolve({
      topicScopeStatus: null,
      citationComplete: true,
      abstractReady: true,
      keyContentReady: true,
    }),
    'automation_ready',
  );

  assert.equal(
    resolver.resolve({
      topicScopeStatus: 'in_scope',
      citationComplete: true,
      abstractReady: true,
      keyContentReady: false,
    }),
    'citable',
  );

  assert.equal(
    resolver.resolve({
      topicScopeStatus: null,
      citationComplete: false,
      abstractReady: false,
      keyContentReady: false,
    }),
    'not_citable',
  );
});
