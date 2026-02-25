-- CreateTable
CREATE TABLE "LiteratureRecord" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstractText" TEXT,
    "authors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "year" INTEGER,
    "doiNormalized" TEXT,
    "arxivId" TEXT,
    "normalizedTitle" TEXT NOT NULL,
    "titleAuthorsYearHash" TEXT,
    "rightsClass" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LiteratureRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiteratureSource" (
    "id" TEXT NOT NULL,
    "literatureId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "sourceItemId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LiteratureSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicLiteratureScope" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "literatureId" TEXT NOT NULL,
    "scopeStatus" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TopicLiteratureScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperLiteratureLink" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "topicId" TEXT,
    "literatureId" TEXT NOT NULL,
    "citationStatus" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaperLiteratureLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiteratureRecord_doiNormalized_key" ON "LiteratureRecord"("doiNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "LiteratureRecord_arxivId_key" ON "LiteratureRecord"("arxivId");

-- CreateIndex
CREATE UNIQUE INDEX "LiteratureRecord_titleAuthorsYearHash_key" ON "LiteratureRecord"("titleAuthorsYearHash");

-- CreateIndex
CREATE INDEX "LiteratureRecord_normalizedTitle_idx" ON "LiteratureRecord"("normalizedTitle");

-- CreateIndex
CREATE UNIQUE INDEX "LiteratureSource_provider_sourceItemId_key" ON "LiteratureSource"("provider", "sourceItemId");

-- CreateIndex
CREATE INDEX "LiteratureSource_literatureId_idx" ON "LiteratureSource"("literatureId");

-- CreateIndex
CREATE UNIQUE INDEX "TopicLiteratureScope_topicId_literatureId_key" ON "TopicLiteratureScope"("topicId", "literatureId");

-- CreateIndex
CREATE INDEX "TopicLiteratureScope_topicId_idx" ON "TopicLiteratureScope"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "PaperLiteratureLink_paperId_literatureId_key" ON "PaperLiteratureLink"("paperId", "literatureId");

-- CreateIndex
CREATE INDEX "PaperLiteratureLink_paperId_idx" ON "PaperLiteratureLink"("paperId");

-- CreateIndex
CREATE INDEX "PaperLiteratureLink_literatureId_idx" ON "PaperLiteratureLink"("literatureId");

-- AddForeignKey
ALTER TABLE "LiteratureSource" ADD CONSTRAINT "LiteratureSource_literatureId_fkey" FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicLiteratureScope" ADD CONSTRAINT "TopicLiteratureScope_literatureId_fkey" FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperLiteratureLink" ADD CONSTRAINT "PaperLiteratureLink_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "PaperProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperLiteratureLink" ADD CONSTRAINT "PaperLiteratureLink_literatureId_fkey" FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
