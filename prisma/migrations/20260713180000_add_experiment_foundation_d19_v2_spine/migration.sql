-- T-132 Pack A / D-19 minimal v2 spine.
-- Expand-only: this migration creates independent PI/EF v2 families and does
-- not alter, annotate, backfill, or relate any legacy authority table.

-- CreateEnum
CREATE TYPE "ExperimentFoundationAssetTypeV2" AS ENUM ('Dataset', 'DataPolicy', 'MetricDefinition', 'Benchmark', 'EvaluationProtocol');

-- CreateTable
CREATE TABLE "PaperImplementationExperimentWorkOrderBranchV2" (
    "id" TEXT NOT NULL,
    "implementationProjectId" TEXT NOT NULL,
    "validationCycleId" TEXT NOT NULL,
    "branchKey" TEXT NOT NULL,
    "branchFrameSchemaVersion" TEXT NOT NULL,
    "branchFrameJson" JSONB NOT NULL DEFAULT '{}',
    "branchFrameHash" TEXT NOT NULL,
    "stateVersion" INTEGER NOT NULL DEFAULT 0,
    "currentRevisionId" TEXT,
    "currentRevisionSequence" INTEGER,
    "headVersion" INTEGER NOT NULL DEFAULT 0,
    "headRevisionId" TEXT,
    "headRevisionSequence" INTEGER,
    "headRunId" TEXT,
    "headRunManifestHash" TEXT,
    "headEventId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaperImplementationExperimentWorkOrderBranchV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperImplementationExperimentWorkOrderRevisionV2" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "revisionSequence" INTEGER NOT NULL,
    "parentRevisionId" TEXT,
    "workOrderSnapshotSchemaVersion" TEXT NOT NULL,
    "workOrderSnapshotJson" JSONB NOT NULL DEFAULT '{}',
    "contentHash" TEXT NOT NULL,
    "cellPlanHash" TEXT NOT NULL,
    "approvedPlanHash" TEXT NOT NULL,
    "createdByActorType" TEXT NOT NULL,
    "createdByActorId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaperImplementationExperimentWorkOrderRevisionV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperImplementationExperimentWorkOrderRevisionCellV2" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "cellKey" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "repeatIndex" INTEGER NOT NULL,
    "parametersSchemaVersion" TEXT NOT NULL,
    "parametersJson" JSONB NOT NULL DEFAULT '{}',
    "requiredResultSchemaVersion" TEXT NOT NULL,
    "requiredResultContractJson" JSONB NOT NULL DEFAULT '{}',
    "cellHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaperImplementationExperimentWorkOrderRevisionCellV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperImplementationExperimentWorkOrderAdmissionV2" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "approvedPlanHash" TEXT NOT NULL,
    "businessIdempotencyKey" TEXT NOT NULL,
    "admittedByActorType" TEXT NOT NULL,
    "admittedByActorId" TEXT,
    "admittedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaperImplementationExperimentWorkOrderAdmissionV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperImplementationExperimentIntegrationInboxV2" (
    "id" TEXT NOT NULL,
    "consumerName" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "producerDomain" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT NOT NULL,
    "businessIdempotencyKey" TEXT NOT NULL,
    "implementationProjectId" TEXT NOT NULL,
    "validationCycleId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "workOrderRevisionId" TEXT NOT NULL,
    "revisionSequence" INTEGER NOT NULL,
    "workOrderRevisionHash" TEXT NOT NULL,
    "cellPlanHash" TEXT NOT NULL,
    "approvedPlanHash" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "runManifestHash" TEXT NOT NULL,
    "eventPayloadJson" JSONB NOT NULL DEFAULT '{}',
    "payloadHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "reasonCode" TEXT,
    "receivedAt" TIMESTAMPTZ(6) NOT NULL,
    "processedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaperImplementationExperimentIntegrationInboxV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperImplementationExperimentIntegrationOutboxV2" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "transitionKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "producerDomain" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT NOT NULL,
    "businessIdempotencyKey" TEXT NOT NULL,
    "implementationProjectId" TEXT NOT NULL,
    "validationCycleId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "workOrderRevisionId" TEXT NOT NULL,
    "revisionSequence" INTEGER NOT NULL,
    "workOrderRevisionHash" TEXT NOT NULL,
    "cellPlanHash" TEXT NOT NULL,
    "approvedPlanHash" TEXT NOT NULL,
    "runId" TEXT,
    "runManifestHash" TEXT,
    "eventPayloadJson" JSONB NOT NULL DEFAULT '{}',
    "payloadHash" TEXT NOT NULL,
    "relayStatus" TEXT NOT NULL DEFAULT 'pending',
    "relayAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "relayLeaseOwner" TEXT,
    "relayLeaseExpiresAt" TIMESTAMPTZ(6),
    "relayNextAttemptAt" TIMESTAMPTZ(6),
    "publishedAt" TIMESTAMPTZ(6),
    "deliveredAt" TIMESTAMPTZ(6),
    "lastRelayErrorCode" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaperImplementationExperimentIntegrationOutboxV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationDatasetV2" (
    "id" TEXT NOT NULL,
    "datasetKey" TEXT NOT NULL,
    "draftStateVersion" INTEGER NOT NULL DEFAULT 0,
    "draftSchemaVersion" TEXT NOT NULL,
    "datasetDraftJson" JSONB NOT NULL DEFAULT '{}',
    "draftHash" TEXT NOT NULL,
    "currentRevisionId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationDatasetV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationDatasetRevisionV2" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "revisionSequence" INTEGER NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "hashProfile" TEXT NOT NULL,
    "datasetSnapshotJson" JSONB NOT NULL DEFAULT '{}',
    "contentHash" TEXT NOT NULL,
    "dataPolicyRevisionId" TEXT NOT NULL,
    "dataPolicyRevisionHash" TEXT NOT NULL,
    "frozenByActorType" TEXT NOT NULL,
    "frozenByActorId" TEXT,
    "frozenAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationDatasetRevisionV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationDataPolicyV2" (
    "id" TEXT NOT NULL,
    "dataPolicyKey" TEXT NOT NULL,
    "draftStateVersion" INTEGER NOT NULL DEFAULT 0,
    "draftSchemaVersion" TEXT NOT NULL,
    "dataPolicyDraftJson" JSONB NOT NULL DEFAULT '{}',
    "draftHash" TEXT NOT NULL,
    "currentRevisionId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationDataPolicyV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationDataPolicyRevisionV2" (
    "id" TEXT NOT NULL,
    "dataPolicyId" TEXT NOT NULL,
    "revisionSequence" INTEGER NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "hashProfile" TEXT NOT NULL,
    "dataPolicySnapshotJson" JSONB NOT NULL DEFAULT '{}',
    "contentHash" TEXT NOT NULL,
    "frozenByActorType" TEXT NOT NULL,
    "frozenByActorId" TEXT,
    "frozenAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationDataPolicyRevisionV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationMetricDefinitionV2" (
    "id" TEXT NOT NULL,
    "metricDefinitionKey" TEXT NOT NULL,
    "draftStateVersion" INTEGER NOT NULL DEFAULT 0,
    "draftSchemaVersion" TEXT NOT NULL,
    "metricDefinitionDraftJson" JSONB NOT NULL DEFAULT '{}',
    "draftHash" TEXT NOT NULL,
    "currentRevisionId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationMetricDefinitionV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationMetricDefinitionRevisionV2" (
    "id" TEXT NOT NULL,
    "metricDefinitionId" TEXT NOT NULL,
    "revisionSequence" INTEGER NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "hashProfile" TEXT NOT NULL,
    "metricDefinitionSnapshotJson" JSONB NOT NULL DEFAULT '{}',
    "contentHash" TEXT NOT NULL,
    "frozenByActorType" TEXT NOT NULL,
    "frozenByActorId" TEXT,
    "frozenAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationMetricDefinitionRevisionV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationBenchmarkV2" (
    "id" TEXT NOT NULL,
    "benchmarkKey" TEXT NOT NULL,
    "draftStateVersion" INTEGER NOT NULL DEFAULT 0,
    "draftSchemaVersion" TEXT NOT NULL,
    "benchmarkDraftJson" JSONB NOT NULL DEFAULT '{}',
    "draftHash" TEXT NOT NULL,
    "currentRevisionId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationBenchmarkV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationBenchmarkRevisionV2" (
    "id" TEXT NOT NULL,
    "benchmarkId" TEXT NOT NULL,
    "revisionSequence" INTEGER NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "hashProfile" TEXT NOT NULL,
    "benchmarkSnapshotJson" JSONB NOT NULL DEFAULT '{}',
    "contentHash" TEXT NOT NULL,
    "corpusDatasetRevisionId" TEXT NOT NULL,
    "corpusDatasetRevisionHash" TEXT NOT NULL,
    "queryDatasetRevisionId" TEXT NOT NULL,
    "queryDatasetRevisionHash" TEXT NOT NULL,
    "datasetDependencyManifestHash" TEXT NOT NULL,
    "frozenByActorType" TEXT NOT NULL,
    "frozenByActorId" TEXT,
    "frozenAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationBenchmarkRevisionV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationEvaluationProtocolV2" (
    "id" TEXT NOT NULL,
    "evaluationProtocolKey" TEXT NOT NULL,
    "draftStateVersion" INTEGER NOT NULL DEFAULT 0,
    "draftSchemaVersion" TEXT NOT NULL,
    "evaluationProtocolDraftJson" JSONB NOT NULL DEFAULT '{}',
    "draftHash" TEXT NOT NULL,
    "currentRevisionId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationEvaluationProtocolV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationEvaluationProtocolRevisionV2" (
    "id" TEXT NOT NULL,
    "evaluationProtocolId" TEXT NOT NULL,
    "revisionSequence" INTEGER NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "hashProfile" TEXT NOT NULL,
    "evaluationProtocolSnapshotJson" JSONB NOT NULL DEFAULT '{}',
    "contentHash" TEXT NOT NULL,
    "benchmarkRevisionId" TEXT NOT NULL,
    "benchmarkRevisionHash" TEXT NOT NULL,
    "metricDependencyCount" INTEGER NOT NULL,
    "metricDependencyManifestHash" TEXT NOT NULL,
    "frozenByActorType" TEXT NOT NULL,
    "frozenByActorId" TEXT,
    "frozenAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationEvaluationProtocolRevisionV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationDatasetFreezeCommandReceiptV2" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "businessIdempotencyKey" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentFoundationDatasetFreezeCommandReceiptV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationDataPolicyFreezeCommandReceiptV2" (
    "id" TEXT NOT NULL,
    "dataPolicyId" TEXT NOT NULL,
    "businessIdempotencyKey" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentFoundationDataPolicyFreezeCommandReceiptV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationMetricDefinitionFreezeCommandReceiptV2" (
    "id" TEXT NOT NULL,
    "metricDefinitionId" TEXT NOT NULL,
    "businessIdempotencyKey" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentFoundationMetricDefinitionFreezeCommandReceiptV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationBenchmarkFreezeCommandReceiptV2" (
    "id" TEXT NOT NULL,
    "benchmarkId" TEXT NOT NULL,
    "businessIdempotencyKey" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentFoundationBenchmarkFreezeCommandReceiptV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationEvaluationProtocolFreezeCommandReceiptV2" (
    "id" TEXT NOT NULL,
    "evaluationProtocolId" TEXT NOT NULL,
    "businessIdempotencyKey" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentFoundationEvaluationProtocolFreezeCommandReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationEvaluationProtocolMetricDependencyV2" (
    "id" TEXT NOT NULL,
    "evaluationProtocolRevisionId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "metricDefinitionId" TEXT NOT NULL,
    "metricDefinitionRevisionId" TEXT NOT NULL,
    "metricDefinitionRevisionSequence" INTEGER NOT NULL,
    "metricDefinitionRevisionHash" TEXT NOT NULL,

    CONSTRAINT "ExperimentFoundationEvaluationProtocolMetricDependencyV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationAssetLifecycleEventV2" (
    "id" TEXT NOT NULL,
    "assetType" "ExperimentFoundationAssetTypeV2" NOT NULL,
    "assetId" TEXT NOT NULL,
    "assetRevisionId" TEXT NOT NULL,
    "assetRevisionSequence" INTEGER NOT NULL,
    "assetRevisionHash" TEXT NOT NULL,
    "eventSequence" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventSchemaVersion" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "note" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationAssetLifecycleEventV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationAssetLifecycleProjectionV2" (
    "id" TEXT NOT NULL,
    "assetType" "ExperimentFoundationAssetTypeV2" NOT NULL,
    "assetId" TEXT NOT NULL,
    "currentRevisionId" TEXT NOT NULL,
    "currentRevisionSequence" INTEGER NOT NULL,
    "currentRevisionHash" TEXT NOT NULL,
    "lifecycleSequence" INTEGER NOT NULL,
    "lifecycleStatus" TEXT NOT NULL,
    "locationAvailable" BOOLEAN NOT NULL,
    "stateVersion" INTEGER NOT NULL DEFAULT 0,
    "lastEventId" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationAssetLifecycleProjectionV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationReadinessAttestationV2" (
    "id" TEXT NOT NULL,
    "targetAssetType" "ExperimentFoundationAssetTypeV2" NOT NULL,
    "targetAssetId" TEXT NOT NULL,
    "targetRevisionId" TEXT NOT NULL,
    "targetRevisionSequence" INTEGER NOT NULL,
    "targetRevisionHash" TEXT NOT NULL,
    "evaluatorProfileVersion" TEXT NOT NULL,
    "evaluatorProfileHash" TEXT NOT NULL,
    "dependencyManifestHash" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "qualificationSnapshotJson" JSONB NOT NULL DEFAULT '{}',
    "blockerSnapshotJson" JSONB NOT NULL DEFAULT '[]',
    "attestationHash" TEXT NOT NULL,
    "attestedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationReadinessAttestationV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationReadinessDependencyV2" (
    "id" TEXT NOT NULL,
    "attestationId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "dependencyRole" TEXT NOT NULL,
    "dependencyAssetType" "ExperimentFoundationAssetTypeV2" NOT NULL,
    "dependencyAssetId" TEXT NOT NULL,
    "dependencyRevisionId" TEXT NOT NULL,
    "dependencyRevisionSequence" INTEGER NOT NULL,
    "dependencyRevisionHash" TEXT NOT NULL,

    CONSTRAINT "ExperimentFoundationReadinessDependencyV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationVersionLockV2" (
    "id" TEXT NOT NULL,
    "materializationKey" TEXT NOT NULL,
    "readinessAttestationId" TEXT NOT NULL,
    "readinessAttestationHash" TEXT NOT NULL,
    "externalPiWorkOrderRevisionId" TEXT NOT NULL,
    "externalPiWorkOrderRevisionHash" TEXT NOT NULL,
    "externalPiApprovedPlanHash" TEXT NOT NULL,
    "lockSchemaVersion" TEXT NOT NULL,
    "resolvedLockJson" JSONB NOT NULL DEFAULT '{}',
    "dependencyManifestHash" TEXT NOT NULL,
    "dependencyCount" INTEGER NOT NULL,
    "lockHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationVersionLockV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationVersionLockDependencyV2" (
    "id" TEXT NOT NULL,
    "versionLockId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "dependencyRole" TEXT NOT NULL,
    "dependencyAssetType" "ExperimentFoundationAssetTypeV2" NOT NULL,
    "dependencyAssetId" TEXT NOT NULL,
    "dependencyRevisionId" TEXT NOT NULL,
    "dependencyRevisionSequence" INTEGER NOT NULL,
    "dependencyRevisionHash" TEXT NOT NULL,

    CONSTRAINT "ExperimentFoundationVersionLockDependencyV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationRunRecipeV2" (
    "id" TEXT NOT NULL,
    "materializationKey" TEXT NOT NULL,
    "versionLockId" TEXT NOT NULL,
    "readinessAttestationId" TEXT NOT NULL,
    "externalPiWorkOrderRevisionId" TEXT NOT NULL,
    "externalPiWorkOrderRevisionHash" TEXT NOT NULL,
    "recipeSchemaVersion" TEXT NOT NULL,
    "recipeSnapshotJson" JSONB NOT NULL DEFAULT '{}',
    "recipeHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationRunRecipeV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationTrainingTaskSpecV2" (
    "id" TEXT NOT NULL,
    "runRecipeId" TEXT NOT NULL,
    "materializationKey" TEXT NOT NULL,
    "externalPiWorkOrderRevisionId" TEXT NOT NULL,
    "externalPiWorkOrderRevisionHash" TEXT NOT NULL,
    "externalPiWorkOrderCellId" TEXT NOT NULL,
    "externalPiWorkOrderCellKey" TEXT NOT NULL,
    "externalPiWorkOrderCellHash" TEXT NOT NULL,
    "cellOrdinal" INTEGER NOT NULL,
    "taskSpecSchemaVersion" TEXT NOT NULL,
    "taskSpecSnapshotJson" JSONB NOT NULL DEFAULT '{}',
    "taskSpecHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationTrainingTaskSpecV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationRunV2" (
    "id" TEXT NOT NULL,
    "runRecipeId" TEXT NOT NULL,
    "externalPiBranchId" TEXT NOT NULL,
    "externalPiWorkOrderRevisionId" TEXT NOT NULL,
    "externalPiWorkOrderRevisionHash" TEXT NOT NULL,
    "externalPiRevisionSequence" INTEGER NOT NULL,
    "runManifestHash" TEXT NOT NULL,
    "frozenAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationRunV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationRunCellV2" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "trainingTaskSpecId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "cellKey" TEXT NOT NULL,
    "externalPiWorkOrderCellId" TEXT NOT NULL,
    "externalPiWorkOrderCellHash" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "repeatIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationRunCellV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationIntegrationInboxV2" (
    "id" TEXT NOT NULL,
    "consumerName" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "producerDomain" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT NOT NULL,
    "businessIdempotencyKey" TEXT NOT NULL,
    "implementationProjectId" TEXT NOT NULL,
    "validationCycleId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "workOrderRevisionId" TEXT NOT NULL,
    "revisionSequence" INTEGER NOT NULL,
    "workOrderRevisionHash" TEXT NOT NULL,
    "cellPlanHash" TEXT NOT NULL,
    "approvedPlanHash" TEXT NOT NULL,
    "runId" TEXT,
    "runManifestHash" TEXT,
    "eventPayloadJson" JSONB NOT NULL DEFAULT '{}',
    "payloadHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "reasonCode" TEXT,
    "receivedAt" TIMESTAMPTZ(6) NOT NULL,
    "processedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationIntegrationInboxV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentFoundationIntegrationOutboxV2" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "transitionKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "producerDomain" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT NOT NULL,
    "businessIdempotencyKey" TEXT NOT NULL,
    "implementationProjectId" TEXT NOT NULL,
    "validationCycleId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "workOrderRevisionId" TEXT NOT NULL,
    "revisionSequence" INTEGER NOT NULL,
    "workOrderRevisionHash" TEXT NOT NULL,
    "cellPlanHash" TEXT NOT NULL,
    "approvedPlanHash" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "runManifestHash" TEXT NOT NULL,
    "eventPayloadJson" JSONB NOT NULL DEFAULT '{}',
    "payloadHash" TEXT NOT NULL,
    "relayStatus" TEXT NOT NULL DEFAULT 'pending',
    "relayAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "relayLeaseOwner" TEXT,
    "relayLeaseExpiresAt" TIMESTAMPTZ(6),
    "relayNextAttemptAt" TIMESTAMPTZ(6),
    "publishedAt" TIMESTAMPTZ(6),
    "deliveredAt" TIMESTAMPTZ(6),
    "lastRelayErrorCode" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationIntegrationOutboxV2_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pi_ewo_branch_current_revision_unique" ON "PaperImplementationExperimentWorkOrderBranchV2"("currentRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ewo_branch_head_revision_unique" ON "PaperImplementationExperimentWorkOrderBranchV2"("headRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ewo_branch_current_exact_unique" ON "PaperImplementationExperimentWorkOrderBranchV2"("id", "currentRevisionId", "currentRevisionSequence");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ewo_branch_head_exact_unique" ON "PaperImplementationExperimentWorkOrderBranchV2"("id", "headRevisionId", "headRevisionSequence");

-- CreateIndex
CREATE INDEX "pi_ewo_branch_project_cycle_idx" ON "PaperImplementationExperimentWorkOrderBranchV2"("implementationProjectId", "validationCycleId");

-- CreateIndex
CREATE INDEX "pi_ewo_branch_current_sequence_idx" ON "PaperImplementationExperimentWorkOrderBranchV2"("currentRevisionSequence");

-- CreateIndex
CREATE INDEX "pi_ewo_branch_head_sequence_idx" ON "PaperImplementationExperimentWorkOrderBranchV2"("headRevisionSequence");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ewo_branch_cycle_key_unique" ON "PaperImplementationExperimentWorkOrderBranchV2"("validationCycleId", "branchKey");

-- CreateIndex
CREATE INDEX "pi_ewo_revision_parent_owner_idx" ON "PaperImplementationExperimentWorkOrderRevisionV2"("branchId", "parentRevisionId");

-- CreateIndex
CREATE INDEX "pi_ewo_revision_approved_plan_idx" ON "PaperImplementationExperimentWorkOrderRevisionV2"("approvedPlanHash");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ewo_revision_branch_sequence_unique" ON "PaperImplementationExperimentWorkOrderRevisionV2"("branchId", "revisionSequence");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ewo_revision_branch_content_unique" ON "PaperImplementationExperimentWorkOrderRevisionV2"("branchId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ewo_revision_owner_unique" ON "PaperImplementationExperimentWorkOrderRevisionV2"("branchId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ewo_revision_exact_sequence_unique" ON "PaperImplementationExperimentWorkOrderRevisionV2"("branchId", "id", "revisionSequence");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ewo_revision_exact_plan_unique" ON "PaperImplementationExperimentWorkOrderRevisionV2"("branchId", "id", "approvedPlanHash");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ewo_cell_revision_ordinal_unique" ON "PaperImplementationExperimentWorkOrderRevisionCellV2"("revisionId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ewo_cell_revision_key_unique" ON "PaperImplementationExperimentWorkOrderRevisionCellV2"("revisionId", "cellKey");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ewo_cell_revision_hash_unique" ON "PaperImplementationExperimentWorkOrderRevisionCellV2"("revisionId", "cellHash");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ewo_admission_revision_unique" ON "PaperImplementationExperimentWorkOrderAdmissionV2"("revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ewo_admission_revision_exact_unique" ON "PaperImplementationExperimentWorkOrderAdmissionV2"("branchId", "revisionId", "approvedPlanHash");

-- CreateIndex
CREATE INDEX "pi_ewo_admission_approved_plan_idx" ON "PaperImplementationExperimentWorkOrderAdmissionV2"("approvedPlanHash");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ewo_admission_branch_business_unique" ON "PaperImplementationExperimentWorkOrderAdmissionV2"("branchId", "businessIdempotencyKey");

-- CreateIndex
CREATE INDEX "pi_ei_inbox_type_processed_idx" ON "PaperImplementationExperimentIntegrationInboxV2"("eventType", "processedAt" DESC);

-- CreateIndex
CREATE INDEX "pi_ei_inbox_branch_sequence_idx" ON "PaperImplementationExperimentIntegrationInboxV2"("branchId", "revisionSequence");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ei_inbox_consumer_event_unique" ON "PaperImplementationExperimentIntegrationInboxV2"("consumerName", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ei_inbox_consumer_business_unique" ON "PaperImplementationExperimentIntegrationInboxV2"("consumerName", "implementationProjectId", "validationCycleId", "branchId", "businessIdempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ei_outbox_event_unique" ON "PaperImplementationExperimentIntegrationOutboxV2"("eventId");

-- CreateIndex
CREATE INDEX "pi_ei_outbox_relay_ready_idx" ON "PaperImplementationExperimentIntegrationOutboxV2"("relayStatus", "relayNextAttemptAt", "occurredAt");

-- CreateIndex
CREATE INDEX "pi_ei_outbox_lease_expiry_idx" ON "PaperImplementationExperimentIntegrationOutboxV2"("relayLeaseExpiresAt");

-- CreateIndex
CREATE INDEX "pi_ei_outbox_correlation_idx" ON "PaperImplementationExperimentIntegrationOutboxV2"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "pi_ei_outbox_aggregate_transition_unique" ON "PaperImplementationExperimentIntegrationOutboxV2"("aggregateType", "aggregateId", "transitionKey");

-- CreateIndex
CREATE UNIQUE INDEX "ef_dataset_v2_key_unique" ON "ExperimentFoundationDatasetV2"("datasetKey");

-- CreateIndex
CREATE UNIQUE INDEX "ef_dataset_v2_current_revision_unique" ON "ExperimentFoundationDatasetV2"("currentRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_dataset_v2_current_owner_unique" ON "ExperimentFoundationDatasetV2"("id", "currentRevisionId");

-- CreateIndex
CREATE INDEX "ef_dataset_v2_draft_hash_idx" ON "ExperimentFoundationDatasetV2"("draftHash");

-- CreateIndex
CREATE INDEX "ef_dataset_revision_policy_idx" ON "ExperimentFoundationDatasetRevisionV2"("dataPolicyRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_dataset_revision_sequence_unique" ON "ExperimentFoundationDatasetRevisionV2"("datasetId", "revisionSequence");

-- CreateIndex
CREATE UNIQUE INDEX "ef_dataset_revision_content_unique" ON "ExperimentFoundationDatasetRevisionV2"("datasetId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_dataset_revision_owner_unique" ON "ExperimentFoundationDatasetRevisionV2"("datasetId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ef_dataset_revision_exact_unique" ON "ExperimentFoundationDatasetRevisionV2"("datasetId", "id", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_dataset_revision_id_hash_unique" ON "ExperimentFoundationDatasetRevisionV2"("id", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_dataset_freeze_command_business_unique" ON "ExperimentFoundationDatasetFreezeCommandReceiptV2"("datasetId", "businessIdempotencyKey");

-- CreateIndex
CREATE INDEX "ef_dataset_freeze_command_revision_idx" ON "ExperimentFoundationDatasetFreezeCommandReceiptV2"("revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_data_policy_v2_key_unique" ON "ExperimentFoundationDataPolicyV2"("dataPolicyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ef_data_policy_v2_current_revision_unique" ON "ExperimentFoundationDataPolicyV2"("currentRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_data_policy_v2_current_owner_unique" ON "ExperimentFoundationDataPolicyV2"("id", "currentRevisionId");

-- CreateIndex
CREATE INDEX "ef_data_policy_v2_draft_hash_idx" ON "ExperimentFoundationDataPolicyV2"("draftHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_data_policy_revision_sequence_unique" ON "ExperimentFoundationDataPolicyRevisionV2"("dataPolicyId", "revisionSequence");

-- CreateIndex
CREATE UNIQUE INDEX "ef_data_policy_revision_content_unique" ON "ExperimentFoundationDataPolicyRevisionV2"("dataPolicyId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_data_policy_revision_owner_unique" ON "ExperimentFoundationDataPolicyRevisionV2"("dataPolicyId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ef_data_policy_revision_exact_unique" ON "ExperimentFoundationDataPolicyRevisionV2"("dataPolicyId", "id", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_data_policy_revision_id_hash_unique" ON "ExperimentFoundationDataPolicyRevisionV2"("id", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_data_policy_freeze_command_business_unique" ON "ExperimentFoundationDataPolicyFreezeCommandReceiptV2"("dataPolicyId", "businessIdempotencyKey");

-- CreateIndex
CREATE INDEX "ef_data_policy_freeze_command_revision_idx" ON "ExperimentFoundationDataPolicyFreezeCommandReceiptV2"("revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_metric_definition_v2_key_unique" ON "ExperimentFoundationMetricDefinitionV2"("metricDefinitionKey");

-- CreateIndex
CREATE UNIQUE INDEX "ef_metric_definition_v2_current_revision_unique" ON "ExperimentFoundationMetricDefinitionV2"("currentRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_metric_definition_v2_current_owner_unique" ON "ExperimentFoundationMetricDefinitionV2"("id", "currentRevisionId");

-- CreateIndex
CREATE INDEX "ef_metric_definition_v2_draft_hash_idx" ON "ExperimentFoundationMetricDefinitionV2"("draftHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_metric_definition_revision_sequence_unique" ON "ExperimentFoundationMetricDefinitionRevisionV2"("metricDefinitionId", "revisionSequence");

-- CreateIndex
CREATE UNIQUE INDEX "ef_metric_definition_revision_content_unique" ON "ExperimentFoundationMetricDefinitionRevisionV2"("metricDefinitionId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_metric_definition_revision_owner_unique" ON "ExperimentFoundationMetricDefinitionRevisionV2"("metricDefinitionId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ef_metric_definition_revision_exact_unique" ON "ExperimentFoundationMetricDefinitionRevisionV2"("metricDefinitionId", "id", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_metric_definition_revision_full_exact_unique" ON "ExperimentFoundationMetricDefinitionRevisionV2"("metricDefinitionId", "id", "revisionSequence", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_metric_definition_freeze_command_business_unique" ON "ExperimentFoundationMetricDefinitionFreezeCommandReceiptV2"("metricDefinitionId", "businessIdempotencyKey");

-- CreateIndex
CREATE INDEX "ef_metric_definition_freeze_command_revision_idx" ON "ExperimentFoundationMetricDefinitionFreezeCommandReceiptV2"("revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_benchmark_v2_key_unique" ON "ExperimentFoundationBenchmarkV2"("benchmarkKey");

-- CreateIndex
CREATE UNIQUE INDEX "ef_benchmark_v2_current_revision_unique" ON "ExperimentFoundationBenchmarkV2"("currentRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_benchmark_v2_current_owner_unique" ON "ExperimentFoundationBenchmarkV2"("id", "currentRevisionId");

-- CreateIndex
CREATE INDEX "ef_benchmark_v2_draft_hash_idx" ON "ExperimentFoundationBenchmarkV2"("draftHash");

-- CreateIndex
CREATE INDEX "ef_benchmark_revision_corpus_idx" ON "ExperimentFoundationBenchmarkRevisionV2"("corpusDatasetRevisionId");

-- CreateIndex
CREATE INDEX "ef_benchmark_revision_query_idx" ON "ExperimentFoundationBenchmarkRevisionV2"("queryDatasetRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_benchmark_revision_sequence_unique" ON "ExperimentFoundationBenchmarkRevisionV2"("benchmarkId", "revisionSequence");

-- CreateIndex
CREATE UNIQUE INDEX "ef_benchmark_revision_content_unique" ON "ExperimentFoundationBenchmarkRevisionV2"("benchmarkId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_benchmark_revision_owner_unique" ON "ExperimentFoundationBenchmarkRevisionV2"("benchmarkId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ef_benchmark_revision_exact_unique" ON "ExperimentFoundationBenchmarkRevisionV2"("benchmarkId", "id", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_benchmark_revision_id_hash_unique" ON "ExperimentFoundationBenchmarkRevisionV2"("id", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_benchmark_freeze_command_business_unique" ON "ExperimentFoundationBenchmarkFreezeCommandReceiptV2"("benchmarkId", "businessIdempotencyKey");

-- CreateIndex
CREATE INDEX "ef_benchmark_freeze_command_revision_idx" ON "ExperimentFoundationBenchmarkFreezeCommandReceiptV2"("revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_evaluation_protocol_v2_key_unique" ON "ExperimentFoundationEvaluationProtocolV2"("evaluationProtocolKey");

-- CreateIndex
CREATE UNIQUE INDEX "ef_evaluation_protocol_v2_current_revision_unique" ON "ExperimentFoundationEvaluationProtocolV2"("currentRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_evaluation_protocol_v2_current_owner_unique" ON "ExperimentFoundationEvaluationProtocolV2"("id", "currentRevisionId");

-- CreateIndex
CREATE INDEX "ef_evaluation_protocol_v2_draft_hash_idx" ON "ExperimentFoundationEvaluationProtocolV2"("draftHash");

-- CreateIndex
CREATE INDEX "ef_evaluation_protocol_revision_benchmark_idx" ON "ExperimentFoundationEvaluationProtocolRevisionV2"("benchmarkRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_evaluation_protocol_revision_sequence_unique" ON "ExperimentFoundationEvaluationProtocolRevisionV2"("evaluationProtocolId", "revisionSequence");

-- CreateIndex
CREATE UNIQUE INDEX "ef_evaluation_protocol_revision_content_unique" ON "ExperimentFoundationEvaluationProtocolRevisionV2"("evaluationProtocolId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_evaluation_protocol_revision_owner_unique" ON "ExperimentFoundationEvaluationProtocolRevisionV2"("evaluationProtocolId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ef_evaluation_protocol_revision_exact_unique" ON "ExperimentFoundationEvaluationProtocolRevisionV2"("evaluationProtocolId", "id", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_evaluation_protocol_freeze_command_business_unique" ON "ExperimentFoundationEvaluationProtocolFreezeCommandReceiptV2"("evaluationProtocolId", "businessIdempotencyKey");

-- CreateIndex
CREATE INDEX "ef_evaluation_protocol_freeze_command_revision_idx" ON "ExperimentFoundationEvaluationProtocolFreezeCommandReceiptV2"("revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_evaluation_protocol_metric_ordinal_unique" ON "ExperimentFoundationEvaluationProtocolMetricDependencyV2"("evaluationProtocolRevisionId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "ef_evaluation_protocol_metric_revision_unique" ON "ExperimentFoundationEvaluationProtocolMetricDependencyV2"("evaluationProtocolRevisionId", "metricDefinitionRevisionId");

-- CreateIndex
CREATE INDEX "ef_evaluation_protocol_metric_ref_idx" ON "ExperimentFoundationEvaluationProtocolMetricDependencyV2"("metricDefinitionId", "metricDefinitionRevisionId");

-- CreateIndex
CREATE INDEX "ef_asset_lifecycle_event_revision_idx" ON "ExperimentFoundationAssetLifecycleEventV2"("assetType", "assetRevisionId");

-- CreateIndex
CREATE INDEX "ef_asset_lifecycle_event_type_idx" ON "ExperimentFoundationAssetLifecycleEventV2"("eventType", "occurredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ef_asset_lifecycle_event_exact_sequence_unique" ON "ExperimentFoundationAssetLifecycleEventV2"("assetType", "assetId", "assetRevisionId", "assetRevisionSequence", "assetRevisionHash", "eventSequence");

-- CreateIndex
CREATE UNIQUE INDEX "ef_asset_lifecycle_projection_event_unique" ON "ExperimentFoundationAssetLifecycleProjectionV2"("lastEventId");

-- CreateIndex
CREATE INDEX "ef_asset_lifecycle_projection_state_idx" ON "ExperimentFoundationAssetLifecycleProjectionV2"("assetType", "lifecycleStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ef_asset_lifecycle_projection_exact_unique" ON "ExperimentFoundationAssetLifecycleProjectionV2"("assetType", "assetId", "currentRevisionId", "currentRevisionSequence", "currentRevisionHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_readiness_attestation_hash_unique" ON "ExperimentFoundationReadinessAttestationV2"("attestationHash");

-- CreateIndex
CREATE INDEX "ef_readiness_attestation_target_idx" ON "ExperimentFoundationReadinessAttestationV2"("targetAssetType", "targetAssetId", "targetRevisionId");

-- CreateIndex
CREATE INDEX "ef_readiness_attestation_outcome_idx" ON "ExperimentFoundationReadinessAttestationV2"("outcome", "attestedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ef_readiness_attestation_exact_unique" ON "ExperimentFoundationReadinessAttestationV2"("targetAssetType", "targetAssetId", "targetRevisionId", "targetRevisionSequence", "targetRevisionHash", "evaluatorProfileHash", "dependencyManifestHash");

-- CreateIndex
CREATE INDEX "ef_readiness_dependency_ref_idx" ON "ExperimentFoundationReadinessDependencyV2"("dependencyAssetType", "dependencyAssetId", "dependencyRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_readiness_dependency_ordinal_unique" ON "ExperimentFoundationReadinessDependencyV2"("attestationId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "ef_readiness_dependency_exact_ref_unique" ON "ExperimentFoundationReadinessDependencyV2"("attestationId", "dependencyAssetType", "dependencyRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_version_lock_materialization_unique" ON "ExperimentFoundationVersionLockV2"("materializationKey");

-- CreateIndex
CREATE UNIQUE INDEX "ef_version_lock_pi_revision_unique" ON "ExperimentFoundationVersionLockV2"("externalPiWorkOrderRevisionId");

-- CreateIndex
CREATE INDEX "ef_version_lock_readiness_idx" ON "ExperimentFoundationVersionLockV2"("readinessAttestationId");

-- CreateIndex
CREATE INDEX "ef_version_lock_hash_idx" ON "ExperimentFoundationVersionLockV2"("lockHash");

-- CreateIndex
CREATE INDEX "ef_version_lock_dependency_ref_idx" ON "ExperimentFoundationVersionLockDependencyV2"("dependencyAssetType", "dependencyAssetId", "dependencyRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_version_lock_dependency_ordinal_unique" ON "ExperimentFoundationVersionLockDependencyV2"("versionLockId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "ef_version_lock_dependency_exact_ref_unique" ON "ExperimentFoundationVersionLockDependencyV2"("versionLockId", "dependencyAssetType", "dependencyRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_run_recipe_materialization_unique" ON "ExperimentFoundationRunRecipeV2"("materializationKey");

-- CreateIndex
CREATE UNIQUE INDEX "ef_run_recipe_version_lock_unique" ON "ExperimentFoundationRunRecipeV2"("versionLockId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_run_recipe_pi_revision_unique" ON "ExperimentFoundationRunRecipeV2"("externalPiWorkOrderRevisionId");

-- CreateIndex
CREATE INDEX "ef_run_recipe_readiness_idx" ON "ExperimentFoundationRunRecipeV2"("readinessAttestationId");

-- CreateIndex
CREATE INDEX "ef_run_recipe_hash_idx" ON "ExperimentFoundationRunRecipeV2"("recipeHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_task_spec_materialization_unique" ON "ExperimentFoundationTrainingTaskSpecV2"("materializationKey");

-- CreateIndex
CREATE INDEX "ef_task_spec_hash_idx" ON "ExperimentFoundationTrainingTaskSpecV2"("taskSpecHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_task_spec_pi_cell_unique" ON "ExperimentFoundationTrainingTaskSpecV2"("externalPiWorkOrderRevisionId", "externalPiWorkOrderCellId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_task_spec_pi_ordinal_unique" ON "ExperimentFoundationTrainingTaskSpecV2"("externalPiWorkOrderRevisionId", "cellOrdinal");

-- CreateIndex
CREATE UNIQUE INDEX "ef_task_spec_recipe_cell_key_unique" ON "ExperimentFoundationTrainingTaskSpecV2"("runRecipeId", "externalPiWorkOrderCellKey");

-- CreateIndex
CREATE UNIQUE INDEX "ef_run_recipe_unique" ON "ExperimentFoundationRunV2"("runRecipeId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_run_pi_revision_unique" ON "ExperimentFoundationRunV2"("externalPiWorkOrderRevisionId");

-- CreateIndex
CREATE INDEX "ef_run_pi_branch_sequence_idx" ON "ExperimentFoundationRunV2"("externalPiBranchId", "externalPiRevisionSequence");

-- CreateIndex
CREATE INDEX "ef_run_manifest_hash_idx" ON "ExperimentFoundationRunV2"("runManifestHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_run_cell_task_spec_unique" ON "ExperimentFoundationRunCellV2"("trainingTaskSpecId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_run_cell_pi_cell_unique" ON "ExperimentFoundationRunCellV2"("externalPiWorkOrderCellId");

-- CreateIndex
CREATE INDEX "ef_run_cell_pi_hash_idx" ON "ExperimentFoundationRunCellV2"("externalPiWorkOrderCellHash");

-- CreateIndex
CREATE UNIQUE INDEX "ef_run_cell_run_ordinal_unique" ON "ExperimentFoundationRunCellV2"("runId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "ef_run_cell_run_key_unique" ON "ExperimentFoundationRunCellV2"("runId", "cellKey");

-- CreateIndex
CREATE INDEX "ef_integration_inbox_type_processed_idx" ON "ExperimentFoundationIntegrationInboxV2"("eventType", "processedAt" DESC);

-- CreateIndex
CREATE INDEX "ef_integration_inbox_branch_sequence_idx" ON "ExperimentFoundationIntegrationInboxV2"("branchId", "revisionSequence");

-- CreateIndex
CREATE UNIQUE INDEX "ef_integration_inbox_consumer_event_unique" ON "ExperimentFoundationIntegrationInboxV2"("consumerName", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_integration_inbox_consumer_business_unique" ON "ExperimentFoundationIntegrationInboxV2"("consumerName", "implementationProjectId", "validationCycleId", "branchId", "businessIdempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ef_integration_outbox_event_unique" ON "ExperimentFoundationIntegrationOutboxV2"("eventId");

-- CreateIndex
CREATE INDEX "ef_integration_outbox_relay_ready_idx" ON "ExperimentFoundationIntegrationOutboxV2"("relayStatus", "relayNextAttemptAt", "occurredAt");

-- CreateIndex
CREATE INDEX "ef_integration_outbox_lease_expiry_idx" ON "ExperimentFoundationIntegrationOutboxV2"("relayLeaseExpiresAt");

-- CreateIndex
CREATE INDEX "ef_integration_outbox_correlation_idx" ON "ExperimentFoundationIntegrationOutboxV2"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "ef_integration_outbox_aggregate_transition_unique" ON "ExperimentFoundationIntegrationOutboxV2"("aggregateType", "aggregateId", "transitionKey");

-- AddForeignKey
ALTER TABLE "PaperImplementationExperimentWorkOrderBranchV2" ADD CONSTRAINT "pi_ewo_branch_current_exact_fkey" FOREIGN KEY ("id", "currentRevisionId", "currentRevisionSequence") REFERENCES "PaperImplementationExperimentWorkOrderRevisionV2"("branchId", "id", "revisionSequence") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperImplementationExperimentWorkOrderBranchV2" ADD CONSTRAINT "pi_ewo_branch_head_exact_fkey" FOREIGN KEY ("id", "headRevisionId", "headRevisionSequence") REFERENCES "PaperImplementationExperimentWorkOrderRevisionV2"("branchId", "id", "revisionSequence") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperImplementationExperimentWorkOrderRevisionV2" ADD CONSTRAINT "PaperImplementationExperimentWorkOrderRevisionV2_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "PaperImplementationExperimentWorkOrderBranchV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperImplementationExperimentWorkOrderRevisionV2" ADD CONSTRAINT "pi_ewo_revision_parent_owner_fkey" FOREIGN KEY ("branchId", "parentRevisionId") REFERENCES "PaperImplementationExperimentWorkOrderRevisionV2"("branchId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperImplementationExperimentWorkOrderRevisionCellV2" ADD CONSTRAINT "PaperImplementationExperimentWorkOrderRevisionCellV2_revis_fkey" FOREIGN KEY ("revisionId") REFERENCES "PaperImplementationExperimentWorkOrderRevisionV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperImplementationExperimentWorkOrderAdmissionV2" ADD CONSTRAINT "PaperImplementationExperimentWorkOrderAdmissionV2_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "PaperImplementationExperimentWorkOrderBranchV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperImplementationExperimentWorkOrderAdmissionV2" ADD CONSTRAINT "pi_ewo_admission_revision_exact_fkey" FOREIGN KEY ("branchId", "revisionId", "approvedPlanHash") REFERENCES "PaperImplementationExperimentWorkOrderRevisionV2"("branchId", "id", "approvedPlanHash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationDatasetV2" ADD CONSTRAINT "ExperimentFoundationDatasetV2_id_currentRevisionId_fkey" FOREIGN KEY ("id", "currentRevisionId") REFERENCES "ExperimentFoundationDatasetRevisionV2"("datasetId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationDatasetRevisionV2" ADD CONSTRAINT "ExperimentFoundationDatasetRevisionV2_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "ExperimentFoundationDatasetV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationDatasetRevisionV2" ADD CONSTRAINT "ExperimentFoundationDatasetRevisionV2_dataPolicyRevisionId_fkey" FOREIGN KEY ("dataPolicyRevisionId", "dataPolicyRevisionHash") REFERENCES "ExperimentFoundationDataPolicyRevisionV2"("id", "contentHash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationDatasetFreezeCommandReceiptV2" ADD CONSTRAINT "ExperimentFoundationDatasetFreezeCommandReceiptV2_datasetI_fkey" FOREIGN KEY ("datasetId", "revisionId", "contentHash") REFERENCES "ExperimentFoundationDatasetRevisionV2"("datasetId", "id", "contentHash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationDataPolicyV2" ADD CONSTRAINT "ExperimentFoundationDataPolicyV2_id_currentRevisionId_fkey" FOREIGN KEY ("id", "currentRevisionId") REFERENCES "ExperimentFoundationDataPolicyRevisionV2"("dataPolicyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationDataPolicyRevisionV2" ADD CONSTRAINT "ExperimentFoundationDataPolicyRevisionV2_dataPolicyId_fkey" FOREIGN KEY ("dataPolicyId") REFERENCES "ExperimentFoundationDataPolicyV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationDataPolicyFreezeCommandReceiptV2" ADD CONSTRAINT "ExperimentFoundationDataPolicyFreezeCommandReceiptV2_dataP_fkey" FOREIGN KEY ("dataPolicyId", "revisionId", "contentHash") REFERENCES "ExperimentFoundationDataPolicyRevisionV2"("dataPolicyId", "id", "contentHash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationMetricDefinitionV2" ADD CONSTRAINT "ExperimentFoundationMetricDefinitionV2_id_currentRevisionI_fkey" FOREIGN KEY ("id", "currentRevisionId") REFERENCES "ExperimentFoundationMetricDefinitionRevisionV2"("metricDefinitionId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationMetricDefinitionRevisionV2" ADD CONSTRAINT "ExperimentFoundationMetricDefinitionRevisionV2_metricDefin_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "ExperimentFoundationMetricDefinitionV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationMetricDefinitionFreezeCommandReceiptV2" ADD CONSTRAINT "ExperimentFoundationMetricDefinitionFreezeCommandReceiptV2_fkey" FOREIGN KEY ("metricDefinitionId", "revisionId", "contentHash") REFERENCES "ExperimentFoundationMetricDefinitionRevisionV2"("metricDefinitionId", "id", "contentHash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationBenchmarkV2" ADD CONSTRAINT "ExperimentFoundationBenchmarkV2_id_currentRevisionId_fkey" FOREIGN KEY ("id", "currentRevisionId") REFERENCES "ExperimentFoundationBenchmarkRevisionV2"("benchmarkId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationBenchmarkRevisionV2" ADD CONSTRAINT "ExperimentFoundationBenchmarkRevisionV2_benchmarkId_fkey" FOREIGN KEY ("benchmarkId") REFERENCES "ExperimentFoundationBenchmarkV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationBenchmarkRevisionV2" ADD CONSTRAINT "ExperimentFoundationBenchmarkRevisionV2_corpusDatasetRevis_fkey" FOREIGN KEY ("corpusDatasetRevisionId", "corpusDatasetRevisionHash") REFERENCES "ExperimentFoundationDatasetRevisionV2"("id", "contentHash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationBenchmarkRevisionV2" ADD CONSTRAINT "ExperimentFoundationBenchmarkRevisionV2_queryDatasetRevisi_fkey" FOREIGN KEY ("queryDatasetRevisionId", "queryDatasetRevisionHash") REFERENCES "ExperimentFoundationDatasetRevisionV2"("id", "contentHash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationBenchmarkFreezeCommandReceiptV2" ADD CONSTRAINT "ExperimentFoundationBenchmarkFreezeCommandReceiptV2_benchm_fkey" FOREIGN KEY ("benchmarkId", "revisionId", "contentHash") REFERENCES "ExperimentFoundationBenchmarkRevisionV2"("benchmarkId", "id", "contentHash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationEvaluationProtocolV2" ADD CONSTRAINT "ExperimentFoundationEvaluationProtocolV2_id_currentRevisio_fkey" FOREIGN KEY ("id", "currentRevisionId") REFERENCES "ExperimentFoundationEvaluationProtocolRevisionV2"("evaluationProtocolId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationEvaluationProtocolRevisionV2" ADD CONSTRAINT "ExperimentFoundationEvaluationProtocolRevisionV2_evaluatio_fkey" FOREIGN KEY ("evaluationProtocolId") REFERENCES "ExperimentFoundationEvaluationProtocolV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationEvaluationProtocolRevisionV2" ADD CONSTRAINT "ExperimentFoundationEvaluationProtocolRevisionV2_benchmark_fkey" FOREIGN KEY ("benchmarkRevisionId", "benchmarkRevisionHash") REFERENCES "ExperimentFoundationBenchmarkRevisionV2"("id", "contentHash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationEvaluationProtocolFreezeCommandReceiptV2" ADD CONSTRAINT "ExperimentFoundationEvaluationProtocolFreezeCommandReceipt_fkey" FOREIGN KEY ("evaluationProtocolId", "revisionId", "contentHash") REFERENCES "ExperimentFoundationEvaluationProtocolRevisionV2"("evaluationProtocolId", "id", "contentHash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationEvaluationProtocolMetricDependencyV2" ADD CONSTRAINT "ExperimentFoundationEvaluationProtocolMetricDependencyV2_e_fkey" FOREIGN KEY ("evaluationProtocolRevisionId") REFERENCES "ExperimentFoundationEvaluationProtocolRevisionV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationEvaluationProtocolMetricDependencyV2" ADD CONSTRAINT "ExperimentFoundationEvaluationProtocolMetricDependencyV2_m_fkey" FOREIGN KEY ("metricDefinitionId", "metricDefinitionRevisionId", "metricDefinitionRevisionSequence", "metricDefinitionRevisionHash") REFERENCES "ExperimentFoundationMetricDefinitionRevisionV2"("metricDefinitionId", "id", "revisionSequence", "contentHash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationAssetLifecycleProjectionV2" ADD CONSTRAINT "ExperimentFoundationAssetLifecycleProjectionV2_lastEventId_fkey" FOREIGN KEY ("lastEventId") REFERENCES "ExperimentFoundationAssetLifecycleEventV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationReadinessDependencyV2" ADD CONSTRAINT "ExperimentFoundationReadinessDependencyV2_attestationId_fkey" FOREIGN KEY ("attestationId") REFERENCES "ExperimentFoundationReadinessAttestationV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationVersionLockV2" ADD CONSTRAINT "ExperimentFoundationVersionLockV2_readinessAttestationId_fkey" FOREIGN KEY ("readinessAttestationId") REFERENCES "ExperimentFoundationReadinessAttestationV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationVersionLockDependencyV2" ADD CONSTRAINT "ExperimentFoundationVersionLockDependencyV2_versionLockId_fkey" FOREIGN KEY ("versionLockId") REFERENCES "ExperimentFoundationVersionLockV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationRunRecipeV2" ADD CONSTRAINT "ExperimentFoundationRunRecipeV2_versionLockId_fkey" FOREIGN KEY ("versionLockId") REFERENCES "ExperimentFoundationVersionLockV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationRunRecipeV2" ADD CONSTRAINT "ExperimentFoundationRunRecipeV2_readinessAttestationId_fkey" FOREIGN KEY ("readinessAttestationId") REFERENCES "ExperimentFoundationReadinessAttestationV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationTrainingTaskSpecV2" ADD CONSTRAINT "ExperimentFoundationTrainingTaskSpecV2_runRecipeId_fkey" FOREIGN KEY ("runRecipeId") REFERENCES "ExperimentFoundationRunRecipeV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationRunV2" ADD CONSTRAINT "ExperimentFoundationRunV2_runRecipeId_fkey" FOREIGN KEY ("runRecipeId") REFERENCES "ExperimentFoundationRunRecipeV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationRunCellV2" ADD CONSTRAINT "ExperimentFoundationRunCellV2_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ExperimentFoundationRunV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentFoundationRunCellV2" ADD CONSTRAINT "ExperimentFoundationRunCellV2_trainingTaskSpecId_fkey" FOREIGN KEY ("trainingTaskSpecId") REFERENCES "ExperimentFoundationTrainingTaskSpecV2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Relational invariant checks that Prisma 5 does not express in the datamodel.
ALTER TABLE "PaperImplementationExperimentWorkOrderBranchV2"
  ADD CONSTRAINT "pi_ewo_branch_state_version_check" CHECK ("stateVersion" >= 0 AND "headVersion" >= 0),
  ADD CONSTRAINT "pi_ewo_branch_current_pair_check" CHECK (("currentRevisionId" IS NULL) = ("currentRevisionSequence" IS NULL)),
  ADD CONSTRAINT "pi_ewo_branch_head_tuple_check" CHECK (
    (("headRevisionId" IS NULL) AND ("headRevisionSequence" IS NULL) AND ("headRunId" IS NULL) AND ("headRunManifestHash" IS NULL) AND ("headEventId" IS NULL))
    OR
    (("headRevisionId" IS NOT NULL) AND ("headRevisionSequence" IS NOT NULL) AND ("headRunId" IS NOT NULL) AND ("headRunManifestHash" IS NOT NULL) AND ("headEventId" IS NOT NULL))
  ),
  ADD CONSTRAINT "pi_ewo_branch_head_not_ahead_check" CHECK ("headRevisionSequence" IS NULL OR ("currentRevisionSequence" IS NOT NULL AND "headRevisionSequence" <= "currentRevisionSequence"));

ALTER TABLE "PaperImplementationExperimentWorkOrderRevisionV2"
  ADD CONSTRAINT "pi_ewo_revision_sequence_check" CHECK ("revisionSequence" > 0);
ALTER TABLE "PaperImplementationExperimentWorkOrderRevisionCellV2"
  ADD CONSTRAINT "pi_ewo_cell_order_check" CHECK ("ordinal" > 0 AND "repeatIndex" >= 0);
ALTER TABLE "PaperImplementationExperimentIntegrationInboxV2"
  ADD CONSTRAINT "pi_ei_inbox_sequence_check" CHECK ("revisionSequence" > 0);
ALTER TABLE "PaperImplementationExperimentIntegrationOutboxV2"
  ADD CONSTRAINT "pi_ei_outbox_sequence_attempt_check" CHECK ("revisionSequence" > 0 AND "relayAttemptCount" >= 0),
  ADD CONSTRAINT "pi_ei_outbox_run_pair_check" CHECK (("runId" IS NULL) = ("runManifestHash" IS NULL)),
  ADD CONSTRAINT "pi_ei_outbox_lease_pair_check" CHECK (("relayLeaseOwner" IS NULL) = ("relayLeaseExpiresAt" IS NULL));

ALTER TABLE "ExperimentFoundationDatasetV2"
  ADD CONSTRAINT "ef_dataset_draft_version_check" CHECK ("draftStateVersion" >= 0);
ALTER TABLE "ExperimentFoundationDataPolicyV2"
  ADD CONSTRAINT "ef_data_policy_draft_version_check" CHECK ("draftStateVersion" >= 0);
ALTER TABLE "ExperimentFoundationMetricDefinitionV2"
  ADD CONSTRAINT "ef_metric_definition_draft_version_check" CHECK ("draftStateVersion" >= 0);
ALTER TABLE "ExperimentFoundationBenchmarkV2"
  ADD CONSTRAINT "ef_benchmark_draft_version_check" CHECK ("draftStateVersion" >= 0);
ALTER TABLE "ExperimentFoundationEvaluationProtocolV2"
  ADD CONSTRAINT "ef_protocol_draft_version_check" CHECK ("draftStateVersion" >= 0);

ALTER TABLE "ExperimentFoundationDatasetRevisionV2"
  ADD CONSTRAINT "ef_dataset_revision_sequence_check" CHECK ("revisionSequence" > 0);
ALTER TABLE "ExperimentFoundationDataPolicyRevisionV2"
  ADD CONSTRAINT "ef_data_policy_revision_sequence_check" CHECK ("revisionSequence" > 0);
ALTER TABLE "ExperimentFoundationMetricDefinitionRevisionV2"
  ADD CONSTRAINT "ef_metric_revision_sequence_check" CHECK ("revisionSequence" > 0);
ALTER TABLE "ExperimentFoundationBenchmarkRevisionV2"
  ADD CONSTRAINT "ef_benchmark_revision_sequence_check" CHECK ("revisionSequence" > 0),
  ADD CONSTRAINT "ef_benchmark_dataset_roles_distinct_check" CHECK ("corpusDatasetRevisionId" <> "queryDatasetRevisionId");
ALTER TABLE "ExperimentFoundationEvaluationProtocolRevisionV2"
  ADD CONSTRAINT "ef_protocol_revision_sequence_check" CHECK ("revisionSequence" > 0),
  ADD CONSTRAINT "ef_protocol_metric_count_check" CHECK ("metricDependencyCount" > 0);
ALTER TABLE "ExperimentFoundationEvaluationProtocolMetricDependencyV2"
  ADD CONSTRAINT "ef_protocol_metric_dependency_order_check" CHECK (
    "ordinal" > 0 AND "metricDefinitionRevisionSequence" > 0
  );

ALTER TABLE "ExperimentFoundationAssetLifecycleEventV2"
  ADD CONSTRAINT "ef_asset_lifecycle_event_sequence_check" CHECK ("assetRevisionSequence" > 0 AND "eventSequence" > 0);
ALTER TABLE "ExperimentFoundationAssetLifecycleProjectionV2"
  ADD CONSTRAINT "ef_asset_lifecycle_projection_sequence_check" CHECK ("currentRevisionSequence" > 0 AND "lifecycleSequence" > 0 AND "stateVersion" > 0);
ALTER TABLE "ExperimentFoundationReadinessAttestationV2"
  ADD CONSTRAINT "ef_readiness_target_sequence_check" CHECK ("targetRevisionSequence" > 0);
ALTER TABLE "ExperimentFoundationReadinessDependencyV2"
  ADD CONSTRAINT "ef_readiness_dependency_sequence_check" CHECK ("ordinal" > 0 AND "dependencyRevisionSequence" > 0);
ALTER TABLE "ExperimentFoundationVersionLockV2"
  ADD CONSTRAINT "ef_version_lock_dependency_count_check" CHECK ("dependencyCount" > 0);
ALTER TABLE "ExperimentFoundationVersionLockDependencyV2"
  ADD CONSTRAINT "ef_version_lock_dependency_sequence_check" CHECK ("ordinal" > 0 AND "dependencyRevisionSequence" > 0);
ALTER TABLE "ExperimentFoundationTrainingTaskSpecV2"
  ADD CONSTRAINT "ef_task_spec_cell_ordinal_check" CHECK ("cellOrdinal" > 0);
ALTER TABLE "ExperimentFoundationRunV2"
  ADD CONSTRAINT "ef_run_revision_sequence_check" CHECK ("externalPiRevisionSequence" > 0);
ALTER TABLE "ExperimentFoundationRunCellV2"
  ADD CONSTRAINT "ef_run_cell_order_check" CHECK ("ordinal" > 0 AND "repeatIndex" >= 0);
ALTER TABLE "ExperimentFoundationIntegrationInboxV2"
  ADD CONSTRAINT "ef_integration_inbox_sequence_check" CHECK ("revisionSequence" > 0),
  ADD CONSTRAINT "ef_integration_inbox_run_pair_check" CHECK (("runId" IS NULL) = ("runManifestHash" IS NULL));
ALTER TABLE "ExperimentFoundationIntegrationOutboxV2"
  ADD CONSTRAINT "ef_integration_outbox_sequence_attempt_check" CHECK ("revisionSequence" > 0 AND "relayAttemptCount" >= 0),
  ADD CONSTRAINT "ef_integration_outbox_lease_pair_check" CHECK (("relayLeaseOwner" IS NULL) = ("relayLeaseExpiresAt" IS NULL));

-- The typed EvaluationProtocol snapshot is the immutable semantic authority.
-- Deferred parity checks allow the parent revision and ordered relational rows
-- to be inserted in one transaction while rejecting incomplete, substituted,
-- or reordered dependency manifests at commit.
CREATE FUNCTION "ef_assert_protocol_metric_dependency_parity"("_protocol_revision_id" TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $function$
DECLARE
  expected_manifest JSONB;
  expected_count INTEGER;
  actual_manifest JSONB;
  actual_count BIGINT;
  minimum_ordinal INTEGER;
  maximum_ordinal INTEGER;
BEGIN
  SELECT
    "evaluationProtocolSnapshotJson" -> 'metric_dependencies',
    "metricDependencyCount"
  INTO expected_manifest, expected_count
  FROM "ExperimentFoundationEvaluationProtocolRevisionV2"
  WHERE "id" = "_protocol_revision_id";

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF expected_manifest IS NULL OR jsonb_typeof(expected_manifest) <> 'array' THEN
    RAISE EXCEPTION 'EvaluationProtocol metric_dependencies must be an array'
      USING ERRCODE = '23514', CONSTRAINT = 'ef_protocol_metric_snapshot_parity';
  END IF;

  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'asset_type', 'MetricDefinition',
          'logical_id', "metricDefinitionId",
          'revision_id', "metricDefinitionRevisionId",
          'revision_sequence', "metricDefinitionRevisionSequence",
          'content_hash', "metricDefinitionRevisionHash"
        )
        ORDER BY "ordinal"
      ),
      '[]'::jsonb
    ),
    count(*),
    min("ordinal"),
    max("ordinal")
  INTO actual_manifest, actual_count, minimum_ordinal, maximum_ordinal
  FROM "ExperimentFoundationEvaluationProtocolMetricDependencyV2"
  WHERE "evaluationProtocolRevisionId" = "_protocol_revision_id";

  IF jsonb_array_length(expected_manifest) <> expected_count
    OR actual_count <> expected_count
    OR minimum_ordinal IS DISTINCT FROM 1
    OR maximum_ordinal IS DISTINCT FROM expected_count
    OR actual_manifest <> expected_manifest
  THEN
    RAISE EXCEPTION 'EvaluationProtocol metric dependency rows do not match the typed snapshot'
      USING ERRCODE = '23514', CONSTRAINT = 'ef_protocol_metric_snapshot_parity';
  END IF;
END;
$function$;

CREATE FUNCTION "ef_check_protocol_metric_parent_row"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM "ef_assert_protocol_metric_dependency_parity"(NEW."id");
  RETURN NEW;
END;
$function$;

CREATE FUNCTION "ef_check_protocol_metric_child_row"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM "ef_assert_protocol_metric_dependency_parity"(OLD."evaluationProtocolRevisionId");
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD."evaluationProtocolRevisionId" <> NEW."evaluationProtocolRevisionId"
  THEN
    PERFORM "ef_assert_protocol_metric_dependency_parity"(OLD."evaluationProtocolRevisionId");
  END IF;

  PERFORM "ef_assert_protocol_metric_dependency_parity"(NEW."evaluationProtocolRevisionId");
  RETURN NEW;
END;
$function$;

CREATE CONSTRAINT TRIGGER "ef_protocol_metric_parent_parity_trigger"
AFTER INSERT OR UPDATE ON "ExperimentFoundationEvaluationProtocolRevisionV2"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "ef_check_protocol_metric_parent_row"();

CREATE CONSTRAINT TRIGGER "ef_protocol_metric_child_parity_trigger"
AFTER INSERT OR UPDATE OR DELETE ON "ExperimentFoundationEvaluationProtocolMetricDependencyV2"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "ef_check_protocol_metric_child_row"();
