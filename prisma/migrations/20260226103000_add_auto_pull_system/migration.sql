-- CreateTable
CREATE TABLE "TopicProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "includeKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludeKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "venueFilters" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultLookbackDays" INTEGER NOT NULL DEFAULT 30,
    "defaultMinYear" INTEGER,
    "defaultMaxYear" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TopicProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoPullRule" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "topicId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "querySpec" JSONB NOT NULL,
    "timeSpec" JSONB NOT NULL,
    "qualitySpec" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AutoPullRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoPullRuleSource" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "config" JSONB NOT NULL,

    CONSTRAINT "AutoPullRuleSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoPullRuleSchedule" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "daysOfWeek" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hour" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AutoPullRuleSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoPullRun" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMPTZ(6),
    "finishedAt" TIMESTAMPTZ(6),
    "summary" JSONB NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AutoPullRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoPullRunSourceAttempt" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fetchedCount" INTEGER NOT NULL,
    "importedCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMPTZ(6),
    "finishedAt" TIMESTAMPTZ(6),
    "meta" JSONB NOT NULL,

    CONSTRAINT "AutoPullRunSourceAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoPullCursor" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "cursorValue" TEXT NOT NULL,
    "cursorAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AutoPullCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoPullAlert" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "runId" TEXT,
    "source" TEXT,
    "level" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "ackAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AutoPullAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoPullSuggestion" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "literatureId" TEXT NOT NULL,
    "topicId" TEXT,
    "suggestedScope" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AutoPullSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutoPullRule_scope_status_idx" ON "AutoPullRule"("scope", "status");

-- CreateIndex
CREATE INDEX "AutoPullRule_topicId_idx" ON "AutoPullRule"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoPullRuleSource_ruleId_source_key" ON "AutoPullRuleSource"("ruleId", "source");

-- CreateIndex
CREATE INDEX "AutoPullRuleSource_ruleId_idx" ON "AutoPullRuleSource"("ruleId");

-- CreateIndex
CREATE INDEX "AutoPullRuleSchedule_ruleId_idx" ON "AutoPullRuleSchedule"("ruleId");

-- CreateIndex
CREATE INDEX "AutoPullRun_ruleId_status_idx" ON "AutoPullRun"("ruleId", "status");

-- CreateIndex
CREATE INDEX "AutoPullRun_createdAt_idx" ON "AutoPullRun"("createdAt");

-- CreateIndex
CREATE INDEX "AutoPullRunSourceAttempt_runId_source_idx" ON "AutoPullRunSourceAttempt"("runId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "AutoPullCursor_ruleId_source_key" ON "AutoPullCursor"("ruleId", "source");

-- CreateIndex
CREATE INDEX "AutoPullAlert_ruleId_createdAt_idx" ON "AutoPullAlert"("ruleId", "createdAt");

-- CreateIndex
CREATE INDEX "AutoPullAlert_level_ackAt_idx" ON "AutoPullAlert"("level", "ackAt");

-- CreateIndex
CREATE INDEX "AutoPullSuggestion_runId_idx" ON "AutoPullSuggestion"("runId");

-- CreateIndex
CREATE INDEX "AutoPullSuggestion_topicId_suggestedScope_idx" ON "AutoPullSuggestion"("topicId", "suggestedScope");

-- AddForeignKey
ALTER TABLE "AutoPullRule" ADD CONSTRAINT "AutoPullRule_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "TopicProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPullRuleSource" ADD CONSTRAINT "AutoPullRuleSource_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutoPullRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPullRuleSchedule" ADD CONSTRAINT "AutoPullRuleSchedule_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutoPullRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPullRun" ADD CONSTRAINT "AutoPullRun_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutoPullRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPullRunSourceAttempt" ADD CONSTRAINT "AutoPullRunSourceAttempt_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutoPullRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPullCursor" ADD CONSTRAINT "AutoPullCursor_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutoPullRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPullAlert" ADD CONSTRAINT "AutoPullAlert_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutoPullRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPullAlert" ADD CONSTRAINT "AutoPullAlert_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutoPullRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPullSuggestion" ADD CONSTRAINT "AutoPullSuggestion_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutoPullRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPullSuggestion" ADD CONSTRAINT "AutoPullSuggestion_literatureId_fkey" FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPullSuggestion" ADD CONSTRAINT "AutoPullSuggestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "TopicProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
