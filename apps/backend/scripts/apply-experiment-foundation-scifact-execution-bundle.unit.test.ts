import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REQUIRED_SCIFACT_EXECUTION_BUNDLE_FREEZE_AUTHORIZATION,
  requireSciFactExecutionBundleFreezeAuthorization,
} from './apply-experiment-foundation-scifact-execution-bundle.js';

test('SciFact ExecutionBundle apply requires the exact six-row authorization', () => {
  assert.doesNotThrow(() => {
    requireSciFactExecutionBundleFreezeAuthorization(
      REQUIRED_SCIFACT_EXECUTION_BUNDLE_FREEZE_AUTHORIZATION,
    );
  });
  assert.throws(
    () => requireSciFactExecutionBundleFreezeAuthorization(undefined),
    /must exactly authorize the reviewed 6-row scope/,
  );
  assert.throws(
    () => requireSciFactExecutionBundleFreezeAuthorization(
      'T-132 SciFact ExecutionBundle v2 named-local freeze: 7 rows',
    ),
    /must exactly authorize the reviewed 6-row scope/,
  );
});
