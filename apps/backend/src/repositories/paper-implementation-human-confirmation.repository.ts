import type {
  HumanConfirmationRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-human-confirmation-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

export interface HumanConfirmationConsumption {
  consumed_at: string;
  consumed_by_ref: TopicSelectionFunctionalRef;
}

export interface PaperImplementationHumanConfirmationRepository {
  createHumanConfirmationRecord(
    record: HumanConfirmationRecord,
  ): Promise<HumanConfirmationRecord>;

  findHumanConfirmationRecordById(
    implementationProjectId: string,
    confirmationRecordId: string,
  ): Promise<HumanConfirmationRecord | null>;

  listHumanConfirmationRecords(
    implementationProjectId: string,
  ): Promise<HumanConfirmationRecord[]>;

  /**
   * Marks an active, not-yet-consumed record as consumed by the authorized
   * write identified by `consumed_by_ref`. Atomic single-use semantics: if the
   * record is missing, not active, or already consumed, the call fails with
   * 409 VERSION_CONFLICT (the second of two racing consumers must lose).
   */
  consumeHumanConfirmationRecord(
    implementationProjectId: string,
    confirmationRecordId: string,
    consumption: HumanConfirmationConsumption,
  ): Promise<HumanConfirmationRecord>;
}
