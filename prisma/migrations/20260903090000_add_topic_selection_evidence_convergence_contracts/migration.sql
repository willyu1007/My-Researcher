-- AlterTable
ALTER TABLE "TopicSelectionEvidenceMap" ADD COLUMN     "lineageRevision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "materialEvidenceDeltaRef" JSONB,
ADD COLUMN     "predecessorEvidenceMapId" TEXT,
ADD COLUMN     "predecessorEvidenceMapRef" JSONB,
ADD COLUMN     "successorEvidenceMapId" TEXT,
ADD COLUMN     "successorEvidenceMapRef" JSONB;

-- AlterTable
ALTER TABLE "TopicSelectionLiteratureResourcePoolSnapshot" ADD COLUMN     "corpusManifestMembers" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "retrievalStackIdentity" JSONB;

-- AlterTable
ALTER TABLE "TopicSelectionSearchPlanRecheckRequest" ADD COLUMN     "corpusManifestHash" TEXT,
ADD COLUMN     "corpusManifestRef" JSONB,
ADD COLUMN     "executionPolicy" JSONB,
ADD COLUMN     "expectedDecisionEffect" TEXT,
ADD COLUMN     "issueRef" JSONB,
ADD COLUMN     "originatingArenaSessionRef" JSONB,
ADD COLUMN     "requestKey" TEXT,
ADD COLUMN     "retrievalIntent" JSONB,
ADD COLUMN     "strategyKey" TEXT,
ADD COLUMN     "supportingArtifactRefs" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE UNIQUE INDEX "tsem_successor_id_key" ON "TopicSelectionEvidenceMap"("successorEvidenceMapId");

-- CreateIndex
CREATE INDEX "tsem_title_successor_idx" ON "TopicSelectionEvidenceMap"("titleCardId", "successorEvidenceMapId");

-- CreateIndex
CREATE UNIQUE INDEX "tsem_predecessor_id_key" ON "TopicSelectionEvidenceMap"("predecessorEvidenceMapId");

-- CreateIndex
CREATE UNIQUE INDEX "tsprr_request_key_key" ON "TopicSelectionSearchPlanRecheckRequest"("requestKey");

-- CreateIndex
CREATE INDEX "tsprr_strategy_key_idx" ON "TopicSelectionSearchPlanRecheckRequest"("strategyKey");

-- CreateIndex
CREATE INDEX "tsprr_manifest_hash_idx" ON "TopicSelectionSearchPlanRecheckRequest"("corpusManifestHash");
