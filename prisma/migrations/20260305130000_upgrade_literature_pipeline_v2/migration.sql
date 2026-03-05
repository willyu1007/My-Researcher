CREATE TABLE "LiteraturePipelineArtifact" (
    "id" TEXT NOT NULL,
    "literatureId" TEXT NOT NULL,
    "stageCode" TEXT NOT NULL,
    "artifactType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "checksum" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "LiteraturePipelineArtifact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LiteraturePipelineArtifact_literatureId_stageCode_artifactType_key"
  ON "LiteraturePipelineArtifact"("literatureId", "stageCode", "artifactType");
CREATE INDEX "LiteraturePipelineArtifact_literatureId_stageCode_idx"
  ON "LiteraturePipelineArtifact"("literatureId", "stageCode");
CREATE INDEX "LiteraturePipelineArtifact_stageCode_artifactType_idx"
  ON "LiteraturePipelineArtifact"("stageCode", "artifactType");

CREATE INDEX "LiteraturePipelineRun_literatureId_status_idx"
  ON "LiteraturePipelineRun"("literatureId", "status");

ALTER TABLE "LiteraturePipelineArtifact"
ADD CONSTRAINT "LiteraturePipelineArtifact_literatureId_fkey"
FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
