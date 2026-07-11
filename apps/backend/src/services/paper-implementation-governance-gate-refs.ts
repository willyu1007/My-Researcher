import type {
  HumanConfirmationRecord,
  PaperImplementationHumanConfirmationScope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-human-confirmation-contracts';
import type {
  TraceGateResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  PaperImplementationHumanConfirmationRepository,
} from '../repositories/paper-implementation-human-confirmation.repository.js';
import type {
  PaperImplementationTraceRepository,
} from '../repositories/paper-implementation-trace.repository.js';

/**
 * Shared governance-gate validators (S1-W5).
 *
 * A HumanConfirmationRecord is a single-use authorization bound to explicit
 * targets: gates must verify the record exists, is active, carries the
 * expected scope, has not been consumed yet, and that its target_refs cover
 * the object being authorized. Consumption happens once per record, before
 * the authoritative write (consume-before-write).
 */

function normalizedRefType(refType: string): string {
  return refType.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function refCovered(
  targetRefs: TopicSelectionFunctionalRef[],
  ref: TopicSelectionFunctionalRef,
): boolean {
  const wantedType = normalizedRefType(ref.ref_type);
  return targetRefs.some((candidate) =>
    normalizedRefType(candidate.ref_type) === wantedType && candidate.ref_id === ref.ref_id);
}

function asRefArray(
  refs: TopicSelectionFunctionalRef | TopicSelectionFunctionalRef[],
): TopicSelectionFunctionalRef[] {
  return Array.isArray(refs) ? refs : [refs];
}

/**
 * Validates that `confirmationRecordId` resolves to an active, unconsumed
 * HumanConfirmationRecord of `expectedScope` whose target_refs cover every
 * ref in `targetRefs` (ref_type is compared normalized, ref_id exactly).
 */
export async function requireActiveHumanConfirmation(
  confirmationRepository: PaperImplementationHumanConfirmationRepository,
  implementationProjectId: string,
  confirmationRecordId: string,
  expectedScope: PaperImplementationHumanConfirmationScope,
  gateLabel: string,
  targetRefs: TopicSelectionFunctionalRef | TopicSelectionFunctionalRef[],
): Promise<HumanConfirmationRecord> {
  const record = await confirmationRepository.findHumanConfirmationRecordById(
    implementationProjectId,
    confirmationRecordId,
  );
  if (!record) {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `${gateLabel} confirmation_ref must resolve to an existing HumanConfirmationRecord.`,
      { confirmation_record_id: confirmationRecordId },
    );
  }
  if (record.status !== 'active') {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `${gateLabel} human confirmation must be active.`,
      { confirmation_record_id: record.confirmation_record_id, status: record.status },
    );
  }
  if (record.confirmation_scope !== expectedScope) {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `${gateLabel} human confirmation must carry scope ${expectedScope}.`,
      { confirmation_record_id: record.confirmation_record_id, scope: record.confirmation_scope },
    );
  }
  if (record.consumed_at) {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `${gateLabel} human confirmation has already been consumed and cannot authorize another decision.`,
      {
        confirmation_record_id: record.confirmation_record_id,
        consumed_at: record.consumed_at,
        consumed_by_ref: record.consumed_by_ref ?? null,
      },
    );
  }
  const uncovered = asRefArray(targetRefs).find((ref) => !refCovered(record.target_refs, ref));
  if (uncovered) {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `${gateLabel} human confirmation target_refs must cover the authorized object ${uncovered.ref_type}:${uncovered.ref_id}.`,
      {
        confirmation_record_id: record.confirmation_record_id,
        missing_target_ref: { ref_type: uncovered.ref_type, ref_id: uncovered.ref_id },
        record_target_refs: record.target_refs,
      },
    );
  }
  return record;
}

/**
 * Re-validates the confirmation and atomically marks it consumed by
 * `consumedByRef`. Call this after all other gate validations have passed and
 * immediately BEFORE the authoritative write (consume-before-write): if the
 * write then fails, the confirmation is burnt — an acceptable, human-visible
 * loss (a new record can be issued) — whereas consuming after the write could
 * leave a persisted authoritative object whose operation reports 409 when a
 * concurrent consumer wins the race. A racing second consumer fails here with
 * 409 VERSION_CONFLICT before it can write.
 */
export async function consumeHumanConfirmation(
  confirmationRepository: PaperImplementationHumanConfirmationRepository,
  implementationProjectId: string,
  confirmationRecordId: string,
  expectedScope: PaperImplementationHumanConfirmationScope,
  gateLabel: string,
  targetRefs: TopicSelectionFunctionalRef | TopicSelectionFunctionalRef[],
  consumedByRef: TopicSelectionFunctionalRef,
  consumedAt: string,
): Promise<HumanConfirmationRecord> {
  await requireActiveHumanConfirmation(
    confirmationRepository,
    implementationProjectId,
    confirmationRecordId,
    expectedScope,
    gateLabel,
    targetRefs,
  );
  return confirmationRepository.consumeHumanConfirmationRecord(
    implementationProjectId,
    confirmationRecordId,
    {
      consumed_at: consumedAt,
      consumed_by_ref: consumedByRef,
    },
  );
}

/**
 * Validates that `gateResultId` resolves to a persisted TraceGateResult that
 * passed and targets `expectedTraceManifestId`.
 */
export async function requirePassedTraceGateResult(
  traceRepository: PaperImplementationTraceRepository,
  implementationProjectId: string,
  gateResultId: string,
  expectedTraceManifestId: string | null,
  gateLabel: string,
): Promise<TraceGateResult> {
  const gateResult = await traceRepository.findTraceGateResultById(
    implementationProjectId,
    gateResultId,
  );
  if (!gateResult) {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `${gateLabel} gate result must resolve to a persisted TraceGateResult.`,
      { gate_result_id: gateResultId },
    );
  }
  if (gateResult.gate_status !== 'passed') {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `${gateLabel} requires a passed gate result.`,
      { gate_result_id: gateResult.gate_result_id, gate_status: gateResult.gate_status },
    );
  }
  if (expectedTraceManifestId && gateResult.trace_manifest_id !== expectedTraceManifestId) {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      `${gateLabel} gate result must target the expected trace manifest.`,
      {
        gate_result_id: gateResult.gate_result_id,
        gate_trace_manifest_id: gateResult.trace_manifest_id,
        expected_trace_manifest_id: expectedTraceManifestId,
      },
    );
  }
  return gateResult;
}
