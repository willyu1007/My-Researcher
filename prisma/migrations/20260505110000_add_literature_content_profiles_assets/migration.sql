-- CreateTable
CREATE TABLE "LiteratureCitationProfile" (
    "id" TEXT NOT NULL,
    "literatureId" TEXT NOT NULL,
    "normalizedDoi" TEXT,
    "normalizedArxivId" TEXT,
    "normalizedTitle" TEXT NOT NULL,
    "normalizedAuthors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "parsedYear" INTEGER,
    "normalizedSourceUrl" TEXT,
    "titleAuthorsYearHash" TEXT,
    "citationComplete" BOOLEAN NOT NULL DEFAULT false,
    "incompleteReasonCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceRefs" JSONB NOT NULL DEFAULT '[]',
    "inputChecksum" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LiteratureCitationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiteratureAbstractProfile" (
    "id" TEXT NOT NULL,
    "literatureId" TEXT NOT NULL,
    "abstractText" TEXT,
    "abstractSource" TEXT,
    "sourceRef" JSONB NOT NULL DEFAULT '{}',
    "checksum" TEXT,
    "language" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reasonCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "generated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LiteratureAbstractProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiteratureContentAsset" (
    "id" TEXT NOT NULL,
    "literatureId" TEXT NOT NULL,
    "assetKind" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "localPath" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "rightsClass" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LiteratureContentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiteratureFulltextDocument" (
    "id" TEXT NOT NULL,
    "literatureId" TEXT NOT NULL,
    "sourceAssetId" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "normalizedTextChecksum" TEXT NOT NULL,
    "parserName" TEXT NOT NULL,
    "parserVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "diagnostics" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LiteratureFulltextDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiteratureFulltextSection" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "pageStart" INTEGER,
    "pageEnd" INTEGER,
    "checksum" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LiteratureFulltextSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiteratureFulltextParagraph" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "paragraphId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "pageNumber" INTEGER,
    "checksum" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LiteratureFulltextParagraph_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiteratureFulltextAnchor" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "anchorId" TEXT NOT NULL,
    "anchorType" TEXT NOT NULL,
    "label" TEXT,
    "text" TEXT,
    "pageNumber" INTEGER,
    "bbox" JSONB,
    "targetRefs" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "checksum" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LiteratureFulltextAnchor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiteratureCitationProfile_literatureId_key" ON "LiteratureCitationProfile"("literatureId");

-- CreateIndex
CREATE INDEX "LiteratureCitationProfile_citationComplete_idx" ON "LiteratureCitationProfile"("citationComplete");

-- CreateIndex
CREATE INDEX "LiteratureCitationProfile_normalizedDoi_idx" ON "LiteratureCitationProfile"("normalizedDoi");

-- CreateIndex
CREATE INDEX "LiteratureCitationProfile_normalizedArxivId_idx" ON "LiteratureCitationProfile"("normalizedArxivId");

-- CreateIndex
CREATE INDEX "LiteratureCitationProfile_titleAuthorsYearHash_idx" ON "LiteratureCitationProfile"("titleAuthorsYearHash");

-- CreateIndex
CREATE UNIQUE INDEX "LiteratureAbstractProfile_literatureId_key" ON "LiteratureAbstractProfile"("literatureId");

-- CreateIndex
CREATE INDEX "LiteratureAbstractProfile_abstractSource_idx" ON "LiteratureAbstractProfile"("abstractSource");

-- CreateIndex
CREATE INDEX "LiteratureAbstractProfile_generated_idx" ON "LiteratureAbstractProfile"("generated");

-- CreateIndex
CREATE UNIQUE INDEX "LiteratureContentAsset_literatureId_localPath_key" ON "LiteratureContentAsset"("literatureId", "localPath");

-- CreateIndex
CREATE INDEX "LiteratureContentAsset_literatureId_assetKind_status_idx" ON "LiteratureContentAsset"("literatureId", "assetKind", "status");

-- CreateIndex
CREATE INDEX "LiteratureContentAsset_checksum_idx" ON "LiteratureContentAsset"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "LiteratureFulltextDocument_sourceAssetId_key" ON "LiteratureFulltextDocument"("sourceAssetId");

-- CreateIndex
CREATE INDEX "LiteratureFulltextDocument_literatureId_status_idx" ON "LiteratureFulltextDocument"("literatureId", "status");

-- CreateIndex
CREATE INDEX "LiteratureFulltextDocument_normalizedTextChecksum_idx" ON "LiteratureFulltextDocument"("normalizedTextChecksum");

-- CreateIndex
CREATE UNIQUE INDEX "LiteratureFulltextSection_documentId_sectionId_key" ON "LiteratureFulltextSection"("documentId", "sectionId");

-- CreateIndex
CREATE INDEX "LiteratureFulltextSection_documentId_orderIndex_idx" ON "LiteratureFulltextSection"("documentId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "LiteratureFulltextParagraph_documentId_paragraphId_key" ON "LiteratureFulltextParagraph"("documentId", "paragraphId");

-- CreateIndex
CREATE INDEX "LiteratureFulltextParagraph_documentId_orderIndex_idx" ON "LiteratureFulltextParagraph"("documentId", "orderIndex");

-- CreateIndex
CREATE INDEX "LiteratureFulltextParagraph_documentId_sectionId_idx" ON "LiteratureFulltextParagraph"("documentId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "LiteratureFulltextAnchor_documentId_anchorId_key" ON "LiteratureFulltextAnchor"("documentId", "anchorId");

-- CreateIndex
CREATE INDEX "LiteratureFulltextAnchor_documentId_anchorType_idx" ON "LiteratureFulltextAnchor"("documentId", "anchorType");

-- AddForeignKey
ALTER TABLE "LiteratureCitationProfile" ADD CONSTRAINT "LiteratureCitationProfile_literatureId_fkey" FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiteratureAbstractProfile" ADD CONSTRAINT "LiteratureAbstractProfile_literatureId_fkey" FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiteratureContentAsset" ADD CONSTRAINT "LiteratureContentAsset_literatureId_fkey" FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiteratureFulltextDocument" ADD CONSTRAINT "LiteratureFulltextDocument_literatureId_fkey" FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiteratureFulltextDocument" ADD CONSTRAINT "LiteratureFulltextDocument_sourceAssetId_fkey" FOREIGN KEY ("sourceAssetId") REFERENCES "LiteratureContentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiteratureFulltextSection" ADD CONSTRAINT "LiteratureFulltextSection_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LiteratureFulltextDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiteratureFulltextParagraph" ADD CONSTRAINT "LiteratureFulltextParagraph_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LiteratureFulltextDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiteratureFulltextAnchor" ADD CONSTRAINT "LiteratureFulltextAnchor_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LiteratureFulltextDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
