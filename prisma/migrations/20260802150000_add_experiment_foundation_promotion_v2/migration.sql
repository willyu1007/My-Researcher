-- T-134 EF-P06: additive typed promotion/canonicalization authority.
CREATE TABLE "ExperimentFoundationPreparationCandidateV2" (
    "id" TEXT NOT NULL,
    "candidateRevision" INTEGER NOT NULL,
    "assetType" "ExperimentFoundationAssetTypeV2" NOT NULL,
    "assetLogicalId" TEXT NOT NULL,
    "contentSchemaVersion" TEXT NOT NULL,
    "candidateSnapshotJson" JSONB NOT NULL DEFAULT '{}',
    "contentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stateVersion" INTEGER NOT NULL DEFAULT 0,
    "canonicalRevisionId" TEXT,
    "canonicalRevisionHash" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ef_preparation_candidate_exact_pkey" PRIMARY KEY ("id", "candidateRevision"),
    CONSTRAINT "ef_preparation_candidate_status_check" CHECK ("status" IN ('pending', 'promoted', 'rejected')),
    CONSTRAINT "ef_preparation_candidate_revision_check" CHECK ("candidateRevision" > 0),
    CONSTRAINT "ef_preparation_candidate_state_version_check" CHECK ("stateVersion" >= 0),
    CONSTRAINT "ef_preparation_candidate_canonical_pair_check" CHECK (("canonicalRevisionId" IS NULL) = ("canonicalRevisionHash" IS NULL)),
    CONSTRAINT "ef_preparation_candidate_terminal_ref_check" CHECK (
      ("status" = 'promoted' AND "canonicalRevisionId" IS NOT NULL)
      OR ("status" IN ('pending', 'rejected') AND "canonicalRevisionId" IS NULL)
    )
);

CREATE TABLE "ExperimentFoundationPromotionDecisionV2" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "candidateRevision" INTEGER NOT NULL,
    "candidateContentHash" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "canonicalizationOutcome" TEXT,
    "canonicalRevisionId" TEXT,
    "canonicalRevisionHash" TEXT,
    "commandHash" TEXT NOT NULL,
    "decidedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationPromotionDecisionV2_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ef_promotion_decision_value_check" CHECK ("decision" IN ('promote', 'reject')),
    CONSTRAINT "ef_promotion_decision_outcome_check" CHECK ("canonicalizationOutcome" IS NULL OR "canonicalizationOutcome" IN ('created', 'reused')),
    CONSTRAINT "ef_promotion_decision_canonical_pair_check" CHECK (("canonicalRevisionId" IS NULL) = ("canonicalRevisionHash" IS NULL)),
    CONSTRAINT "ef_promotion_decision_terminal_ref_check" CHECK (
      ("decision" = 'promote' AND "canonicalizationOutcome" IS NOT NULL AND "canonicalRevisionId" IS NOT NULL)
      OR ("decision" = 'reject' AND "canonicalizationOutcome" IS NULL AND "canonicalRevisionId" IS NULL)
    )
);

CREATE TABLE "ExperimentFoundationPromotionCommandReceiptV2" (
    "id" TEXT NOT NULL,
    "businessIdempotencyKey" TEXT NOT NULL,
    "commandHash" TEXT NOT NULL,
    "promotionDecisionId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExperimentFoundationPromotionCommandReceiptV2_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExperimentFoundationPromotionOutboxV2" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "promotionDecisionId" TEXT NOT NULL,
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
    "eventPayloadJson" JSONB NOT NULL DEFAULT '{}',
    "payloadHash" TEXT NOT NULL,
    "eventEnvelopeHash" TEXT NOT NULL,
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

    CONSTRAINT "ExperimentFoundationPromotionOutboxV2_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ef_promotion_outbox_fixed_authority_check" CHECK (
      "aggregateType" = 'ExperimentFoundationPreparationCandidateV2'
      AND "transitionKey" = 'terminal-promotion-decision'
      AND "eventType" = 'ExperimentFoundationPreparationCandidatePromotionDecidedV2'
      AND "schemaVersion" = 'v1'
      AND "producerDomain" = 'experiment-foundation'
    ),
    CONSTRAINT "ef_promotion_outbox_relay_status_check" CHECK ("relayStatus" IN ('pending', 'leased', 'published', 'delivered', 'failed')),
    CONSTRAINT "ef_promotion_outbox_relay_attempt_check" CHECK ("relayAttemptCount" >= 0)
);

CREATE UNIQUE INDEX "ef_preparation_candidate_asset_revision_unique" ON "ExperimentFoundationPreparationCandidateV2"("assetType", "assetLogicalId", "candidateRevision");
CREATE INDEX "ef_preparation_candidate_asset_status_idx" ON "ExperimentFoundationPreparationCandidateV2"("assetType", "assetLogicalId", "status");

CREATE UNIQUE INDEX "ef_promotion_decision_candidate_terminal_unique" ON "ExperimentFoundationPromotionDecisionV2"("candidateId", "candidateRevision");
CREATE UNIQUE INDEX "ef_promotion_decision_content_unique" ON "ExperimentFoundationPromotionDecisionV2"("id", "candidateContentHash");
CREATE INDEX "ef_promotion_decision_canonical_revision_idx" ON "ExperimentFoundationPromotionDecisionV2"("canonicalRevisionId");

CREATE UNIQUE INDEX "ef_promotion_command_business_unique" ON "ExperimentFoundationPromotionCommandReceiptV2"("businessIdempotencyKey");
CREATE INDEX "ef_promotion_command_decision_idx" ON "ExperimentFoundationPromotionCommandReceiptV2"("promotionDecisionId");

CREATE UNIQUE INDEX "ef_promotion_outbox_event_unique" ON "ExperimentFoundationPromotionOutboxV2"("eventId");
CREATE UNIQUE INDEX "ef_promotion_outbox_decision_unique" ON "ExperimentFoundationPromotionOutboxV2"("promotionDecisionId");
CREATE UNIQUE INDEX "ef_promotion_outbox_aggregate_transition_unique" ON "ExperimentFoundationPromotionOutboxV2"("aggregateType", "aggregateId", "transitionKey");
CREATE INDEX "ef_promotion_outbox_relay_ready_idx" ON "ExperimentFoundationPromotionOutboxV2"("relayStatus", "relayNextAttemptAt", "occurredAt");
CREATE INDEX "ef_promotion_outbox_lease_expiry_idx" ON "ExperimentFoundationPromotionOutboxV2"("relayLeaseExpiresAt");
CREATE INDEX "ef_promotion_outbox_correlation_idx" ON "ExperimentFoundationPromotionOutboxV2"("correlationId");

ALTER TABLE "ExperimentFoundationPromotionDecisionV2"
ADD CONSTRAINT "ef_promotion_decision_candidate_exact_fkey"
FOREIGN KEY ("candidateId", "candidateRevision")
REFERENCES "ExperimentFoundationPreparationCandidateV2"("id", "candidateRevision")
ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ExperimentFoundationPromotionCommandReceiptV2"
ADD CONSTRAINT "ExperimentFoundationPromotionCommandReceiptV2_promotionDecisionId_fkey"
FOREIGN KEY ("promotionDecisionId")
REFERENCES "ExperimentFoundationPromotionDecisionV2"("id")
ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "ExperimentFoundationPromotionOutboxV2"
ADD CONSTRAINT "ExperimentFoundationPromotionOutboxV2_promotionDecisionId_fkey"
FOREIGN KEY ("promotionDecisionId")
REFERENCES "ExperimentFoundationPromotionDecisionV2"("id")
ON DELETE RESTRICT ON UPDATE RESTRICT;
