import type {
  HumanConfirmationRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-human-confirmation-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  PaperImplementationHumanConfirmationRepository,
} from './paper-implementation-human-confirmation.repository.js';

export class InMemoryPaperImplementationHumanConfirmationRepository
implements PaperImplementationHumanConfirmationRepository {
  private readonly records = new Map<string, HumanConfirmationRecord>();
  private readonly recordIdsByProject = new Map<string, string[]>();

  async createHumanConfirmationRecord(
    record: HumanConfirmationRecord,
  ): Promise<HumanConfirmationRecord> {
    if (this.records.has(record.confirmation_record_id)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `HumanConfirmationRecord ${record.confirmation_record_id} already exists.`,
      );
    }
    const stored = structuredClone(record);
    this.records.set(stored.confirmation_record_id, stored);
    this.pushId(
      this.recordIdsByProject,
      stored.implementation_project_id,
      stored.confirmation_record_id,
    );
    return structuredClone(stored);
  }

  async findHumanConfirmationRecordById(
    implementationProjectId: string,
    confirmationRecordId: string,
  ): Promise<HumanConfirmationRecord | null> {
    const record = this.records.get(confirmationRecordId);
    if (!record || record.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(record);
  }

  async listHumanConfirmationRecords(
    implementationProjectId: string,
  ): Promise<HumanConfirmationRecord[]> {
    const ids = this.recordIdsByProject.get(implementationProjectId) ?? [];
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is HumanConfirmationRecord => Boolean(record))
      .map((record) => structuredClone(record));
  }

  private pushId(index: Map<string, string[]>, key: string, id: string): void {
    const existing = index.get(key);
    if (existing) {
      existing.push(id);
      return;
    }
    index.set(key, [id]);
  }
}
