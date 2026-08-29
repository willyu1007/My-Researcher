ALTER TABLE "TopicSelectionArtifactRef"
ADD COLUMN "stableKey" TEXT;

CREATE UNIQUE INDEX "tsar_stable_key_key"
ON "TopicSelectionArtifactRef"("stableKey");
