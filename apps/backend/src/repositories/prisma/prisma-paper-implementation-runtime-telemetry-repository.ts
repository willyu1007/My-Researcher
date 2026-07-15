import type {
  PaperImplementationRuntimeTelemetryRecord as RuntimeTelemetryRow,
  PrismaClient,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import {
  PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RECORD_SCHEMA_VERSION,
  type PaperImplementationAgentExecutionMode,
  type PaperImplementationDebateComplexityTier,
  type PaperImplementationRuntimeTelemetryOutcome,
  type PaperImplementationRuntimeTelemetryRecord,
  type PaperImplementationRuntimeTelemetryRetryKind,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-telemetry-contracts';

import { AppError } from '../../errors/app-error.js';
import type {
  PaperImplementationRuntimeTelemetryRepository,
} from '../paper-implementation-runtime-telemetry.repository.js';

function toRecord(row: RuntimeTelemetryRow): PaperImplementationRuntimeTelemetryRecord {
  return {
    schema_version: PAPER_IMPLEMENTATION_RUNTIME_TELEMETRY_RECORD_SCHEMA_VERSION,
    record_id: row.id,
    created_at: row.createdAt.toISOString(),
    implementation_project_id: row.implementationProjectId,
    run_id: row.runId,
    slot_id: row.slotId,
    role_slot_id: row.roleSlotId,
    call_index: row.callIndex,
    execution_mode: row.executionMode as PaperImplementationAgentExecutionMode,
    provider: row.provider,
    model_option: row.modelOption,
    latency_ms: row.latencyMs,
    prompt_tokens: row.promptTokens,
    completion_tokens: row.completionTokens,
    total_tokens: row.totalTokens,
    cost_usd: row.costUsd,
    outcome: row.outcome as PaperImplementationRuntimeTelemetryOutcome,
    retry_kind: row.retryKind as PaperImplementationRuntimeTelemetryRetryKind | null,
    compression_applied: row.compressionApplied,
    shadow_tier: row.shadowTier as PaperImplementationDebateComplexityTier | null,
  };
}

export class PrismaPaperImplementationRuntimeTelemetryRepository
implements PaperImplementationRuntimeTelemetryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async appendRuntimeTelemetryRecord(
    record: PaperImplementationRuntimeTelemetryRecord,
  ): Promise<PaperImplementationRuntimeTelemetryRecord> {
    try {
      const row = await this.prisma.paperImplementationRuntimeTelemetryRecord.create({
        data: {
          id: record.record_id,
          implementationProjectId: record.implementation_project_id,
          runId: record.run_id,
          slotId: record.slot_id,
          roleSlotId: record.role_slot_id,
          callIndex: record.call_index,
          executionMode: record.execution_mode,
          provider: record.provider,
          modelOption: record.model_option,
          latencyMs: record.latency_ms,
          promptTokens: record.prompt_tokens,
          completionTokens: record.completion_tokens,
          totalTokens: record.total_tokens,
          costUsd: record.cost_usd,
          outcome: record.outcome,
          retryKind: record.retry_kind,
          compressionApplied: record.compression_applied,
          shadowTier: record.shadow_tier,
          createdAt: new Date(record.created_at),
        },
      });
      return toRecord(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `RuntimeTelemetryRecord ${record.record_id} already exists.`,
        );
      }
      throw error;
    }
  }

  async listRuntimeTelemetryRecordsByProject(
    implementationProjectId: string,
  ): Promise<PaperImplementationRuntimeTelemetryRecord[]> {
    const rows = await this.prisma.paperImplementationRuntimeTelemetryRecord.findMany({
      where: { implementationProjectId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toRecord);
  }

  async listRuntimeTelemetryRecordsByRun(
    implementationProjectId: string,
    runId: string,
  ): Promise<PaperImplementationRuntimeTelemetryRecord[]> {
    const rows = await this.prisma.paperImplementationRuntimeTelemetryRecord.findMany({
      where: { implementationProjectId, runId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toRecord);
  }
}
