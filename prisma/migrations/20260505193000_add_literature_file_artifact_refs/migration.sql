-- Add file-backed artifact references for literature content processing.
ALTER TABLE "LiteratureFulltextDocument"
  ALTER COLUMN "normalizedText" DROP NOT NULL,
  ADD COLUMN "normalizedTextPath" TEXT,
  ADD COLUMN "parserArtifactPath" TEXT,
  ADD COLUMN "parserArtifactMimeType" TEXT;

ALTER TABLE "LiteraturePipelineArtifact"
  ADD COLUMN "payloadPath" TEXT;
