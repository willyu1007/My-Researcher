import type {
  ScientificEvidenceP5OperationalTimeline,
} from './scientific-evidence-p5-eligibility-service.js';

export function assertScientificEvidenceP5AssumeRoleDispatchWindow(
  timeline: ScientificEvidenceP5OperationalTimeline,
  nowMs: number,
): void {
  assertFiniteNow(nowMs);
  if (
    nowMs < Date.parse(timeline.issuance.not_before)
    || nowMs > Date.parse(timeline.issuance.dispatch_not_after)
  ) throw new Error('T136_P5_ASSUME_ROLE_OUTSIDE_AUTHORIZED_WINDOW');
}

export function assertScientificEvidenceP5PortalConfirmationStartWindow(
  timeline: ScientificEvidenceP5OperationalTimeline,
  nowMs: number,
): void {
  assertFiniteNow(nowMs);
  if (
    nowMs < Date.parse(timeline.issuance.not_before)
    || nowMs > Date.parse(timeline.issuance.portal_confirmation_start_not_after)
  ) throw new Error('T136_P5_PORTAL_CONFIRMATION_START_OUTSIDE_AUTHORIZED_WINDOW');
}

export function assertScientificEvidenceP5QualificationWindow(
  timeline: ScientificEvidenceP5OperationalTimeline,
  nowMs: number,
): void {
  assertHalfOpenWindow(
    nowMs,
    timeline.qualification.not_before,
    timeline.qualification.expires_at,
    'T136_P5_QUALIFICATION_OUTSIDE_AUTHORIZED_WINDOW',
  );
}

export function assertScientificEvidenceP5LiveStartWindow(
  timeline: ScientificEvidenceP5OperationalTimeline,
  nowMs: number,
): void {
  assertFiniteNow(nowMs);
  if (
    nowMs < Date.parse(timeline.live.not_before)
    || nowMs > Date.parse(timeline.live.latest_start_at)
  ) throw new Error('T136_P5_EXECUTION_OUTSIDE_AUTHORIZED_WINDOW');
}

export function assertScientificEvidenceP5CredentialOperationsWindow(
  timeline: ScientificEvidenceP5OperationalTimeline,
  nowMs: number,
): void {
  assertHalfOpenWindow(
    nowMs,
    timeline.live.not_before,
    timeline.live.credential_operations_stop_at,
    'T136_P5_CREDENTIAL_OPERATIONS_OUTSIDE_AUTHORIZED_WINDOW',
  );
}

export function assertScientificEvidenceP5ClosureWindow(
  timeline: ScientificEvidenceP5OperationalTimeline,
  nowMs: number,
): void {
  assertHalfOpenWindow(
    nowMs,
    timeline.closure.not_before,
    timeline.closure.expires_at,
    'T136_P5_CLOSURE_OUTSIDE_AUTHORIZED_WINDOW',
  );
}

function assertHalfOpenWindow(
  nowMs: number,
  notBefore: string,
  expiresAt: string,
  code: string,
): void {
  assertFiniteNow(nowMs);
  if (nowMs < Date.parse(notBefore) || nowMs >= Date.parse(expiresAt)) {
    throw new Error(code);
  }
}

function assertFiniteNow(nowMs: number): void {
  if (!Number.isFinite(nowMs)) throw new Error('T136_P5_OPERATIONAL_NOW_INVALID');
}
