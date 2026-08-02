-- T-134 EF-P15 Phase 3A: immutable typed exploration specification authoring.
CREATE TABLE "ExperimentFoundationExplorationSpecV2" (
    "id" TEXT NOT NULL,
    "logicalId" TEXT NOT NULL,
    "latestRevision" INTEGER NOT NULL,
    "stateVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ef_exploration_spec_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ef_exploration_spec_revision_positive_check" CHECK ("latestRevision" > 0),
    CONSTRAINT "ef_exploration_spec_state_positive_check" CHECK ("stateVersion" > 0),
    CONSTRAINT "ef_exploration_spec_state_revision_check" CHECK ("stateVersion" = "latestRevision")
);

CREATE TABLE "ExperimentFoundationExplorationSpecRevisionV2" (
    "id" TEXT NOT NULL,
    "specId" TEXT NOT NULL,
    "logicalId" TEXT NOT NULL,
    "specRevision" INTEGER NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "specJson" JSONB NOT NULL DEFAULT '{}',
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ef_exploration_spec_revision_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ef_exploration_spec_revision_positive_check" CHECK ("specRevision" > 0),
    CONSTRAINT "ef_exploration_spec_schema_version_check" CHECK ("schemaVersion" = 'v1')
);

CREATE TABLE "ExperimentFoundationExplorationSpecCommandReceiptV2" (
    "id" TEXT NOT NULL,
    "businessIdempotencyKey" TEXT NOT NULL,
    "commandHash" TEXT NOT NULL,
    "logicalId" TEXT NOT NULL,
    "expectedStateVersion" INTEGER NOT NULL,
    "specContentHash" TEXT NOT NULL,
    "specRevisionId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ef_exploration_spec_receipt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ef_exploration_spec_receipt_state_check" CHECK ("expectedStateVersion" >= 0)
);

CREATE UNIQUE INDEX "ef_exploration_spec_logical_unique"
ON "ExperimentFoundationExplorationSpecV2"("logicalId");

CREATE UNIQUE INDEX "ef_exploration_spec_identity_unique"
ON "ExperimentFoundationExplorationSpecV2"("id", "logicalId");

CREATE UNIQUE INDEX "ef_exploration_spec_revision_exact_unique"
ON "ExperimentFoundationExplorationSpecRevisionV2"("specId", "specRevision");

CREATE UNIQUE INDEX "ef_exploration_spec_content_unique"
ON "ExperimentFoundationExplorationSpecRevisionV2"("specId", "contentHash");

CREATE INDEX "ef_exploration_spec_logical_revision_idx"
ON "ExperimentFoundationExplorationSpecRevisionV2"("logicalId", "specRevision");

CREATE UNIQUE INDEX "ef_exploration_spec_receipt_business_unique"
ON "ExperimentFoundationExplorationSpecCommandReceiptV2"("businessIdempotencyKey");

CREATE INDEX "ef_exploration_spec_receipt_revision_idx"
ON "ExperimentFoundationExplorationSpecCommandReceiptV2"("specRevisionId");

ALTER TABLE "ExperimentFoundationExplorationSpecRevisionV2"
ADD CONSTRAINT "ef_exploration_spec_revision_identity_fkey"
FOREIGN KEY ("specId", "logicalId")
REFERENCES "ExperimentFoundationExplorationSpecV2"("id", "logicalId")
ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ExperimentFoundationExplorationSpecCommandReceiptV2"
ADD CONSTRAINT "ef_exploration_spec_receipt_revision_fkey"
FOREIGN KEY ("specRevisionId")
REFERENCES "ExperimentFoundationExplorationSpecRevisionV2"("id")
ON DELETE RESTRICT ON UPDATE RESTRICT;
