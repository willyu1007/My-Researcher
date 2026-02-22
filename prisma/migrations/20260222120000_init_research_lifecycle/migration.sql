-- CreateTable
CREATE TABLE "PaperProject" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "researchDirection" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paperActiveSpFull" TEXT,
    "paperActiveSpPartial" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaperProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageNode" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "parentVersionId" TEXT,
    "parentNodeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "runId" TEXT NOT NULL,
    "laneId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "payloadRef" TEXT NOT NULL,
    "nodeStatus" TEXT NOT NULL,
    "valueJudgement" JSONB,

    CONSTRAINT "StageNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "spineType" TEXT,
    "nodeRefs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "claimSetHash" TEXT NOT NULL,
    "problemScopeHash" TEXT NOT NULL,
    "datasetProtocolHash" TEXT NOT NULL,
    "evaluationProtocolHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StageNode_paperId_idx" ON "StageNode"("paperId");

-- CreateIndex
CREATE INDEX "StageNode_paperId_nodeStatus_idx" ON "StageNode"("paperId", "nodeStatus");

-- CreateIndex
CREATE INDEX "Snapshot_paperId_idx" ON "Snapshot"("paperId");

-- CreateIndex
CREATE INDEX "Snapshot_paperId_snapshotType_idx" ON "Snapshot"("paperId", "snapshotType");

-- AddForeignKey
ALTER TABLE "StageNode" ADD CONSTRAINT "StageNode_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "PaperProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "PaperProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

