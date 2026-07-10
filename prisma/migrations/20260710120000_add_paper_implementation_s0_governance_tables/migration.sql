CREATE TABLE "PaperImplementationTraceGateResult" (
  "id" TEXT NOT NULL,
  "implementationProjectId" TEXT NOT NULL,
  "traceManifestId" TEXT NOT NULL,
  "gateStatus" TEXT NOT NULL,
  "traceStatus" TEXT NOT NULL,
  "blockerCodes" JSONB NOT NULL DEFAULT '[]',
  "repairQueueItemRefs" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "PaperImplementationTraceGateResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pitgr_project_idx" ON "PaperImplementationTraceGateResult"("implementationProjectId", "createdAt" DESC);
CREATE INDEX "pitgr_manifest_idx" ON "PaperImplementationTraceGateResult"("traceManifestId");

CREATE TABLE "PaperImplementationHumanConfirmationRecord" (
  "id" TEXT NOT NULL,
  "implementationProjectId" TEXT NOT NULL,
  "confirmationScope" TEXT NOT NULL,
  "targetRefs" JSONB NOT NULL DEFAULT '[]',
  "reviewedSources" JSONB NOT NULL DEFAULT '[]',
  "transitionAttemptRef" JSONB,
  "gateResultRefs" JSONB NOT NULL DEFAULT '[]',
  "rationale" TEXT NOT NULL,
  "confirmedByActorType" TEXT NOT NULL,
  "confirmedByActorId" TEXT,
  "policyVersionId" TEXT,
  "status" TEXT NOT NULL,
  "statusReason" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL,
  "updatedAt" TIMESTAMPTZ(6),
  CONSTRAINT "PaperImplementationHumanConfirmationRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pihcr_project_status_idx" ON "PaperImplementationHumanConfirmationRecord"("implementationProjectId", "status", "createdAt" DESC);
CREATE INDEX "pihcr_scope_idx" ON "PaperImplementationHumanConfirmationRecord"("confirmationScope");
