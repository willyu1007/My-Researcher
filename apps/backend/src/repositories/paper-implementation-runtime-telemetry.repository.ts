import type {
  PaperImplementationRuntimeTelemetryRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-telemetry-contracts';

/**
 * S4-A append-only runtime telemetry sink. Writes are never updated or
 * deleted; queries are scoped by implementation project and (optionally) run.
 */
export interface PaperImplementationRuntimeTelemetryRepository {
  appendRuntimeTelemetryRecord(
    record: PaperImplementationRuntimeTelemetryRecord,
  ): Promise<PaperImplementationRuntimeTelemetryRecord>;

  listRuntimeTelemetryRecordsByProject(
    implementationProjectId: string,
  ): Promise<PaperImplementationRuntimeTelemetryRecord[]>;

  listRuntimeTelemetryRecordsByRun(
    implementationProjectId: string,
    runId: string,
  ): Promise<PaperImplementationRuntimeTelemetryRecord[]>;
}
