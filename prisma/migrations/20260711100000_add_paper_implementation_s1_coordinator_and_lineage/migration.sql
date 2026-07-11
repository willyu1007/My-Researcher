-- S1-W1: acceptance-bridge lineage columns on six authority models
ALTER TABLE "PaperImplementationCoreMotiveVersion"
  ADD COLUMN "sourceProposalArtifactRef" JSONB,
  ADD COLUMN "sourceProposalArtifactHash" TEXT;
ALTER TABLE "PaperImplementationValidationCycle"
  ADD COLUMN "sourceProposalArtifactRef" JSONB,
  ADD COLUMN "sourceProposalArtifactHash" TEXT;
ALTER TABLE "PaperImplementationTechnicalRouteCandidate"
  ADD COLUMN "sourceProposalArtifactRef" JSONB,
  ADD COLUMN "sourceProposalArtifactHash" TEXT;
ALTER TABLE "PaperImplementationFeasibilityProbe"
  ADD COLUMN "sourceProposalArtifactRef" JSONB,
  ADD COLUMN "sourceProposalArtifactHash" TEXT;
ALTER TABLE "PaperImplementationExperimentPlanLight"
  ADD COLUMN "sourceProposalArtifactRef" JSONB,
  ADD COLUMN "sourceProposalArtifactHash" TEXT;
ALTER TABLE "PaperImplementationResearchWorkOrder"
  ADD COLUMN "sourceProposalArtifactRef" JSONB,
  ADD COLUMN "sourceProposalArtifactHash" TEXT;

-- S1-W5: human confirmation single-use consumption columns
ALTER TABLE "PaperImplementationHumanConfirmationRecord"
  ADD COLUMN "consumedAt" TIMESTAMPTZ(6),
  ADD COLUMN "consumedByRef" JSONB;

-- S1-W4: decision work queue coordinator linkage columns
ALTER TABLE "PaperImplementationDecisionWorkQueueItem"
  ADD COLUMN "sourceCoordinatorRunRef" JSONB,
  ADD COLUMN "sourceStepIndex" INTEGER;

-- S1-W3: coordinator run state machine tables
CREATE TABLE "PaperImplementationCoordinatorRun" (
  "id" TEXT NOT NULL,
  "implementationProjectId" TEXT NOT NULL,
  "laneId" TEXT NOT NULL,
  "runStatus" TEXT NOT NULL,
  "runMode" TEXT NOT NULL,
  "executionMode" TEXT NOT NULL,
  "modelProfileId" TEXT,
  "modelOptionId" TEXT,
  "budgetMaxSteps" INTEGER NOT NULL,
  "budgetMaxProviderCalls" INTEGER NOT NULL,
  "consumedSteps" INTEGER NOT NULL,
  "consumedProviderCalls" INTEGER NOT NULL,
  "leaseHolderId" TEXT,
  "leaseHeartbeatAt" TIMESTAMPTZ(6),
  "leaseExpiresAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  "runPayload" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "PaperImplementationCoordinatorRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pi_coord_run_project_created_idx" ON "PaperImplementationCoordinatorRun"("implementationProjectId", "createdAt" DESC);
CREATE INDEX "pi_coord_run_project_status_idx" ON "PaperImplementationCoordinatorRun"("implementationProjectId", "runStatus");
CREATE INDEX "pi_coord_run_lane_status_idx" ON "PaperImplementationCoordinatorRun"("laneId", "runStatus");
CREATE INDEX "pi_coord_run_lease_expires_idx" ON "PaperImplementationCoordinatorRun"("leaseExpiresAt");

CREATE TABLE "PaperImplementationCoordinatorStep" (
  "id" TEXT NOT NULL,
  "coordinatorRunId" TEXT NOT NULL,
  "implementationProjectId" TEXT NOT NULL,
  "stepIndex" INTEGER NOT NULL,
  "slotId" TEXT NOT NULL,
  "nodeAttemptId" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "providerCallCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL,
  "stepPayload" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "PaperImplementationCoordinatorStep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pi_coord_step_run_attempt_unique" ON "PaperImplementationCoordinatorStep"("coordinatorRunId", "nodeAttemptId");
CREATE INDEX "pi_coord_step_run_index_idx" ON "PaperImplementationCoordinatorStep"("coordinatorRunId", "stepIndex");
CREATE INDEX "pi_coord_step_project_created_idx" ON "PaperImplementationCoordinatorStep"("implementationProjectId", "createdAt" DESC);
CREATE INDEX "pi_coord_step_slot_outcome_idx" ON "PaperImplementationCoordinatorStep"("slotId", "outcome");
