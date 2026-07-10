import type {
  HumanConfirmationRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-human-confirmation-contracts';

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
}
