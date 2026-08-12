import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildScientificEvidenceP5OperationalTimelineV3,
} from './scientific-evidence-p5-eligibility-service.js';
import {
  assertScientificEvidenceP5AssumeRoleDispatchWindow,
  assertScientificEvidenceP5ClosureWindow,
  assertScientificEvidenceP5CredentialOperationsWindow,
  assertScientificEvidenceP5LiveStartWindow,
  assertScientificEvidenceP5PortalConfirmationStartWindow,
  assertScientificEvidenceP5QualificationWindow,
} from './scientific-evidence-p5-operational-timeline-service.js';

const timeline = buildScientificEvidenceP5OperationalTimelineV3(
  '2026-08-11T02:00:00.000Z',
);
const at = (iso: string): number => Date.parse(iso);

test('the canonical timeline reserves portal confirmation and dispatch margins', () => {
  assert.doesNotThrow(() => assertScientificEvidenceP5PortalConfirmationStartWindow(
    timeline,
    at('2026-08-11T02:13:00.000Z'),
  ));
  assert.throws(() => assertScientificEvidenceP5PortalConfirmationStartWindow(
    timeline,
    at('2026-08-11T02:13:00.001Z'),
  ), /T136_P5_PORTAL_CONFIRMATION_START_OUTSIDE_AUTHORIZED_WINDOW/);
  assert.doesNotThrow(() => assertScientificEvidenceP5AssumeRoleDispatchWindow(
    timeline,
    at('2026-08-11T02:15:00.000Z'),
  ));
  assert.throws(() => assertScientificEvidenceP5AssumeRoleDispatchWindow(
    timeline,
    at('2026-08-11T02:15:00.001Z'),
  ), /T136_P5_ASSUME_ROLE_OUTSIDE_AUTHORIZED_WINDOW/);
});

test('qualification and live-start share one strict cutoff', () => {
  assert.doesNotThrow(() => assertScientificEvidenceP5QualificationWindow(
    timeline,
    at('2026-08-11T02:19:59.999Z'),
  ));
  assert.throws(() => assertScientificEvidenceP5QualificationWindow(
    timeline,
    at('2026-08-11T02:20:00.000Z'),
  ), /T136_P5_QUALIFICATION_OUTSIDE_AUTHORIZED_WINDOW/);
  assert.doesNotThrow(() => assertScientificEvidenceP5LiveStartWindow(
    timeline,
    at('2026-08-11T02:20:00.000Z'),
  ));
  assert.throws(() => assertScientificEvidenceP5LiveStartWindow(
    timeline,
    at('2026-08-11T02:20:00.001Z'),
  ), /T136_P5_EXECUTION_OUTSIDE_AUTHORIZED_WINDOW/);
});

test('credential operations stop before expiration while credential-free closure remains open', () => {
  assert.throws(() => assertScientificEvidenceP5CredentialOperationsWindow(
    timeline,
    at('2026-08-11T02:54:00.000Z'),
  ), /T136_P5_CREDENTIAL_OPERATIONS_OUTSIDE_AUTHORIZED_WINDOW/);
  assert.doesNotThrow(() => assertScientificEvidenceP5ClosureWindow(
    timeline,
    at('2026-08-11T03:15:00.000Z'),
  ));
  assert.throws(() => assertScientificEvidenceP5ClosureWindow(
    timeline,
    at('2026-08-11T03:30:00.000Z'),
  ), /T136_P5_CLOSURE_OUTSIDE_AUTHORIZED_WINDOW/);
});
