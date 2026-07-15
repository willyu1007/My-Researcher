-- S4-A: append-only per-provider-call runtime telemetry sink.
-- Purely additive new table; no changes to existing tables, no cross-domain FK.
CREATE TABLE "PaperImplementationRuntimeTelemetryRecord" (
  "id" TEXT NOT NULL,
  "implementationProjectId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "roleSlotId" TEXT,
  "callIndex" INTEGER NOT NULL,
  "executionMode" TEXT NOT NULL,
  "provider" TEXT,
  "modelOption" TEXT,
  "latencyMs" DOUBLE PRECISION,
  "promptTokens" INTEGER,
  "completionTokens" INTEGER,
  "totalTokens" INTEGER,
  "costUsd" DOUBLE PRECISION,
  "outcome" TEXT NOT NULL,
  "retryKind" TEXT,
  "compressionApplied" BOOLEAN NOT NULL,
  "shadowTier" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "PaperImplementationRuntimeTelemetryRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pi_runtime_telemetry_project_created_idx" ON "PaperImplementationRuntimeTelemetryRecord"("implementationProjectId", "createdAt" DESC);
CREATE INDEX "pi_runtime_telemetry_project_run_idx" ON "PaperImplementationRuntimeTelemetryRecord"("implementationProjectId", "runId");
