-- T-122 scoped candidate-staging migration.
-- Applies only the LiteratureDiscoveryBatch and LiteratureDiscoveryCandidate schema.
-- Intentionally excludes unrelated live-DB drift detected in TopicResearchRecord.

-- CreateTable
CREATE TABLE "LiteratureDiscoveryBatch" (
    "id" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "directionScope" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceProviders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "queryLedger" JSONB NOT NULL DEFAULT '{}',
    "summaryStats" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL,
    "errorSummary" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "completedAt" TIMESTAMPTZ(6),

    CONSTRAINT "LiteratureDiscoveryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiteratureDiscoveryCandidate" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "abstractText" TEXT,
    "authors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "year" INTEGER,
    "venue" TEXT,
    "doiNormalized" TEXT,
    "arxivId" TEXT,
    "openalexId" TEXT,
    "semanticScholarId" TEXT,
    "dblpUrl" TEXT,
    "sourceUrl" TEXT,
    "sourceProvider" TEXT NOT NULL,
    "sourcePayload" JSONB NOT NULL DEFAULT '{}',
    "dedupKey" TEXT,
    "duplicateReason" TEXT,
    "duplicateConfidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
    "directionScores" JSONB NOT NULL DEFAULT '{}',
    "roleScores" JSONB NOT NULL DEFAULT '{}',
    "relevanceScore" DOUBLE PRECISION,
    "implementationScore" DOUBLE PRECISION,
    "theoryScore" DOUBLE PRECISION,
    "decisionReason" TEXT,
    "decisionAt" TIMESTAMPTZ(6),
    "matchedCandidateId" TEXT,
    "matchedLiteratureId" TEXT,
    "promotedLiteratureId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LiteratureDiscoveryCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiteratureDiscoveryBatch_batchCode_idx" ON "LiteratureDiscoveryBatch"("batchCode");

-- CreateIndex
CREATE INDEX "LiteratureDiscoveryBatch_status_createdAt_idx" ON "LiteratureDiscoveryBatch"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LiteratureDiscoveryBatch_updatedAt_idx" ON "LiteratureDiscoveryBatch"("updatedAt");

-- CreateIndex
CREATE INDEX "LiteratureDiscoveryCandidate_batchId_status_idx" ON "LiteratureDiscoveryCandidate"("batchId", "status");

-- CreateIndex
CREATE INDEX "LiteratureDiscoveryCandidate_status_createdAt_idx" ON "LiteratureDiscoveryCandidate"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LiteratureDiscoveryCandidate_dedupKey_idx" ON "LiteratureDiscoveryCandidate"("dedupKey");

-- CreateIndex
CREATE INDEX "LiteratureDiscoveryCandidate_doiNormalized_idx" ON "LiteratureDiscoveryCandidate"("doiNormalized");

-- CreateIndex
CREATE INDEX "LiteratureDiscoveryCandidate_arxivId_idx" ON "LiteratureDiscoveryCandidate"("arxivId");

-- CreateIndex
CREATE INDEX "LiteratureDiscoveryCandidate_openalexId_idx" ON "LiteratureDiscoveryCandidate"("openalexId");

-- CreateIndex
CREATE INDEX "LiteratureDiscoveryCandidate_semanticScholarId_idx" ON "LiteratureDiscoveryCandidate"("semanticScholarId");

-- CreateIndex
CREATE INDEX "LiteratureDiscoveryCandidate_normalizedTitle_year_idx" ON "LiteratureDiscoveryCandidate"("normalizedTitle", "year");

-- CreateIndex
CREATE INDEX "LiteratureDiscoveryCandidate_matchedCandidateId_idx" ON "LiteratureDiscoveryCandidate"("matchedCandidateId");

-- CreateIndex
CREATE INDEX "LiteratureDiscoveryCandidate_matchedLiteratureId_idx" ON "LiteratureDiscoveryCandidate"("matchedLiteratureId");

-- CreateIndex
CREATE INDEX "LiteratureDiscoveryCandidate_promotedLiteratureId_idx" ON "LiteratureDiscoveryCandidate"("promotedLiteratureId");

-- AddForeignKey
ALTER TABLE "LiteratureDiscoveryCandidate" ADD CONSTRAINT "LiteratureDiscoveryCandidate_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "LiteratureDiscoveryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiteratureDiscoveryCandidate" ADD CONSTRAINT "LiteratureDiscoveryCandidate_matchedCandidateId_fkey" FOREIGN KEY ("matchedCandidateId") REFERENCES "LiteratureDiscoveryCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiteratureDiscoveryCandidate" ADD CONSTRAINT "LiteratureDiscoveryCandidate_matchedLiteratureId_fkey" FOREIGN KEY ("matchedLiteratureId") REFERENCES "LiteratureRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiteratureDiscoveryCandidate" ADD CONSTRAINT "LiteratureDiscoveryCandidate_promotedLiteratureId_fkey" FOREIGN KEY ("promotedLiteratureId") REFERENCES "LiteratureRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
