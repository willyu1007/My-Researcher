import {
  PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RECORD_SCHEMA_VERSION,
  type PaperImplementationRuntimeTelemetryRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-telemetry-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  PaperImplementationRuntimeTelemetryRepository,
} from './paper-implementation-runtime-telemetry.repository.js';

export class InMemoryPaperImplementationRuntimeTelemetryRepository
implements PaperImplementationRuntimeTelemetryRepository {
  // Append-only insertion-ordered log.
  private readonly records: PaperImplementationRuntimeTelemetryRecord[] = [];
  private readonly recordIds = new Set<string>();

  async appendRuntimeTelemetryRecord(
    record: PaperImplementationRuntimeTelemetryRecord,
  ): Promise<PaperImplementationRuntimeTelemetryRecord> {
    if (record.schema_version !== PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RECORD_SCHEMA_VERSION) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        `Unexpected runtime telemetry schema version ${record.schema_version}.`,
      );
    }
    if (this.recordIds.has(record.record_id)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `RuntimeTelemetryRecord ${record.record_id} already exists.`,
      );
    }
    const stored = structuredClone(record);
    this.records.push(stored);
    this.recordIds.add(stored.record_id);
    return structuredClone(stored);
  }

  async listRuntimeTelemetryRecordsByProject(
    implementationProjectId: string,
  ): Promise<PaperImplementationRuntimeTelemetryRecord[]> {
    return this.records
      .filter((record) => record.implementation_project_id === implementationProjectId)
      .map((record) => structuredClone(record));
  }

  async listRuntimeTelemetryRecordsByRun(
    implementationProjectId: string,
    runId: string,
  ): Promise<PaperImplementationRuntimeTelemetryRecord[]> {
    return this.records
      .filter((record) =>
        record.implementation_project_id === implementationProjectId
        && record.run_id === runId)
      .map((record) => structuredClone(record));
  }
}
