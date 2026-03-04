ALTER TABLE "LiteratureRecord"
ADD COLUMN "keyContentDigest" TEXT;

CREATE TABLE "LiteraturePipelineState" (
    "id" TEXT NOT NULL,
    "literatureId" TEXT NOT NULL,
    "citationComplete" BOOLEAN NOT NULL DEFAULT false,
    "abstractReady" BOOLEAN NOT NULL DEFAULT false,
    "keyContentReady" BOOLEAN NOT NULL DEFAULT false,
    "dedupStatus" TEXT NOT NULL DEFAULT 'unknown',
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "LiteraturePipelineState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LiteraturePipelineState_literatureId_key" ON "LiteraturePipelineState"("literatureId");

CREATE TABLE "LiteraturePipelineRun" (
    "id" TEXT NOT NULL,
    "literatureId" TEXT NOT NULL,
    "triggerSource" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedStages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "startedAt" TIMESTAMPTZ(6),
    "finishedAt" TIMESTAMPTZ(6),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "LiteraturePipelineRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LiteraturePipelineRun_literatureId_createdAt_idx" ON "LiteraturePipelineRun"("literatureId", "createdAt");
CREATE INDEX "LiteraturePipelineRun_status_idx" ON "LiteraturePipelineRun"("status");

CREATE TABLE "LiteraturePipelineStageState" (
    "id" TEXT NOT NULL,
    "literatureId" TEXT NOT NULL,
    "stageCode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastRunId" TEXT,
    "detail" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "LiteraturePipelineStageState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LiteraturePipelineStageState_literatureId_stageCode_key" ON "LiteraturePipelineStageState"("literatureId", "stageCode");
CREATE INDEX "LiteraturePipelineStageState_stageCode_status_idx" ON "LiteraturePipelineStageState"("stageCode", "status");
CREATE INDEX "LiteraturePipelineStageState_lastRunId_idx" ON "LiteraturePipelineStageState"("lastRunId");

CREATE TABLE "LiteraturePipelineRunStep" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stageCode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputRef" JSONB NOT NULL,
    "outputRef" JSONB NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMPTZ(6),
    "finishedAt" TIMESTAMPTZ(6),
    CONSTRAINT "LiteraturePipelineRunStep_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LiteraturePipelineRunStep_runId_idx" ON "LiteraturePipelineRunStep"("runId");
CREATE INDEX "LiteraturePipelineRunStep_stageCode_status_idx" ON "LiteraturePipelineRunStep"("stageCode", "status");

ALTER TABLE "LiteraturePipelineState"
ADD CONSTRAINT "LiteraturePipelineState_literatureId_fkey"
FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiteraturePipelineRun"
ADD CONSTRAINT "LiteraturePipelineRun_literatureId_fkey"
FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiteraturePipelineStageState"
ADD CONSTRAINT "LiteraturePipelineStageState_literatureId_fkey"
FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiteraturePipelineStageState"
ADD CONSTRAINT "LiteraturePipelineStageState_lastRunId_fkey"
FOREIGN KEY ("lastRunId") REFERENCES "LiteraturePipelineRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LiteraturePipelineRunStep"
ADD CONSTRAINT "LiteraturePipelineRunStep_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "LiteraturePipelineRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
