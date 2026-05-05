-- CreateTable
CREATE TABLE "LiteratureContentProcessingBatchJob" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "targetStage" TEXT NOT NULL,
    "workset" JSONB NOT NULL DEFAULT '{}',
    "options" JSONB NOT NULL DEFAULT '{}',
    "dryRunEstimate" JSONB NOT NULL DEFAULT '{}',
    "totals" JSONB NOT NULL DEFAULT '{}',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "startedAt" TIMESTAMPTZ(6),
    "pausedAt" TIMESTAMPTZ(6),
    "canceledAt" TIMESTAMPTZ(6),
    "finishedAt" TIMESTAMPTZ(6),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LiteratureContentProcessingBatchJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiteratureContentProcessingBatchItem" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "literatureId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedStages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nextStageIndex" INTEGER NOT NULL DEFAULT 0,
    "pipelineRunId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "blockerCode" TEXT,
    "retryable" BOOLEAN NOT NULL DEFAULT true,
    "checkpoint" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "startedAt" TIMESTAMPTZ(6),
    "finishedAt" TIMESTAMPTZ(6),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LiteratureContentProcessingBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiteratureContentProcessingBatchJob_status_createdAt_idx" ON "LiteratureContentProcessingBatchJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LiteratureContentProcessingBatchJob_updatedAt_idx" ON "LiteratureContentProcessingBatchJob"("updatedAt");

-- CreateIndex
CREATE INDEX "LiteratureContentProcessingBatchItem_jobId_status_idx" ON "LiteratureContentProcessingBatchItem"("jobId", "status");

-- CreateIndex
CREATE INDEX "LiteratureContentProcessingBatchItem_literatureId_status_idx" ON "LiteratureContentProcessingBatchItem"("literatureId", "status");

-- CreateIndex
CREATE INDEX "LiteratureContentProcessingBatchItem_pipelineRunId_idx" ON "LiteratureContentProcessingBatchItem"("pipelineRunId");

-- CreateIndex
CREATE INDEX "LiteratureContentProcessingBatchItem_updatedAt_idx" ON "LiteratureContentProcessingBatchItem"("updatedAt");

-- AddForeignKey
ALTER TABLE "LiteratureContentProcessingBatchItem" ADD CONSTRAINT "LiteratureContentProcessingBatchItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "LiteratureContentProcessingBatchJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiteratureContentProcessingBatchItem" ADD CONSTRAINT "LiteratureContentProcessingBatchItem_literatureId_fkey" FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
