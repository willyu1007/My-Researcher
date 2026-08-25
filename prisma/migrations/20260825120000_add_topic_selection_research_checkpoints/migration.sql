CREATE TABLE "TopicSelectionResearchCheckpoint" (
    "id" TEXT NOT NULL,
    "checkpointKey" TEXT NOT NULL,
    "currentCheckpointKey" TEXT,
    "workspaceId" TEXT,
    "titleCardId" TEXT NOT NULL,
    "checkpointKind" TEXT NOT NULL,
    "contractVersion" TEXT NOT NULL,
    "provenanceClass" TEXT NOT NULL,
    "policyVersionId" TEXT,
    "targetRefType" TEXT NOT NULL,
    "targetRefId" TEXT NOT NULL,
    "targetVersionId" TEXT,
    "targetSnapshotHash" TEXT NOT NULL,
    "packetHash" TEXT NOT NULL,
    "inputSnapshotId" TEXT NOT NULL,
    "sourceRefs" JSONB NOT NULL DEFAULT '[]',
    "allowedActions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredActionRefs" JSONB NOT NULL DEFAULT '[]',
    "decisionAuthorityRef" JSONB,
    "status" TEXT NOT NULL,
    "supersedesCheckpointId" TEXT,
    "supersededByCheckpointId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "decidedAt" TIMESTAMPTZ(6),
    "supersededAt" TIMESTAMPTZ(6),

    CONSTRAINT "TopicSelectionResearchCheckpoint_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tsrc_kind_chk" CHECK ("checkpointKind" IN ('evidence_landscape', 'gap_selection', 'question_contract', 'promotion')),
    CONSTRAINT "tsrc_version_chk" CHECK ("contractVersion" = 'v1'),
    CONSTRAINT "tsrc_provenance_chk" CHECK ("provenanceClass" IN ('native', 'backfilled')),
    CONSTRAINT "tsrc_status_chk" CHECK ("status" IN ('pending', 'decided', 'superseded')),
    CONSTRAINT "tsrc_hashes_chk" CHECK (
      "targetSnapshotHash" ~ '^[a-f0-9]{64}$' AND "packetHash" ~ '^[a-f0-9]{64}$'
    ),
    CONSTRAINT "tsrc_actions_chk" CHECK (
      cardinality("allowedActions") > 0
      AND "allowedActions" <@ ARRAY['advance', 'loopback', 'reject', 'hold']::TEXT[]
    ),
    CONSTRAINT "tsrc_json_arrays_chk" CHECK (
      jsonb_typeof("sourceRefs") = 'array' AND jsonb_typeof("requiredActionRefs") = 'array'
    ),
    CONSTRAINT "tsrc_current_state_chk" CHECK (
      ("status" = 'superseded' AND "currentCheckpointKey" IS NULL
        AND "supersededByCheckpointId" IS NOT NULL AND "supersededAt" IS NOT NULL)
      OR ("status" IN ('pending', 'decided') AND "currentCheckpointKey" IS NOT NULL
        AND "supersededByCheckpointId" IS NULL AND "supersededAt" IS NULL)
    ),
    CONSTRAINT "tsrc_decision_state_chk" CHECK (
      ("status" = 'pending' AND "decisionAuthorityRef" IS NULL AND "decidedAt" IS NULL)
      OR ("status" = 'decided' AND "decisionAuthorityRef" IS NOT NULL AND "decidedAt" IS NOT NULL)
      OR "status" = 'superseded'
    )
);

CREATE TABLE "TopicSelectionResearchCheckpointDecision" (
    "id" TEXT NOT NULL,
    "decisionKey" TEXT NOT NULL,
    "researchCheckpointId" TEXT NOT NULL,
    "humanConfirmedDecisionId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "titleCardId" TEXT NOT NULL,
    "checkpointKind" TEXT NOT NULL,
    "decisionKind" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "confirmedSnapshotHash" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "reviewPayload" JSONB NOT NULL DEFAULT '{}',
    "requiredActionRefs" JSONB NOT NULL DEFAULT '[]',
    "loopbackTarget" TEXT,
    "loopbackRefs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TopicSelectionResearchCheckpointDecision_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tsrcd_kind_chk" CHECK (
      ("checkpointKind" = 'evidence_landscape' AND "decisionKind" = 'evidence_landscape_confirmation')
      OR ("checkpointKind" = 'question_contract' AND "decisionKind" = 'topic_question_confirmation')
    ),
    CONSTRAINT "tsrcd_decision_chk" CHECK ("decision" IN ('advance', 'loopback', 'reject', 'hold')),
    CONSTRAINT "tsrcd_human_chk" CHECK ("actorType" = 'human' AND length(btrim("actorId")) > 0),
    CONSTRAINT "tsrcd_hash_chk" CHECK ("confirmedSnapshotHash" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "tsrcd_json_chk" CHECK (
      jsonb_typeof("reviewPayload") = 'object'
      AND jsonb_typeof("requiredActionRefs") = 'array'
      AND jsonb_typeof("loopbackRefs") = 'array'
    ),
    CONSTRAINT "tsrcd_loopback_chk" CHECK (
      ("decision" = 'loopback' AND "loopbackTarget" IS NOT NULL)
      OR ("decision" <> 'loopback' AND "loopbackTarget" IS NULL)
    ),
    CONSTRAINT "tsrcd_advance_chk" CHECK (
      "decision" <> 'advance' OR jsonb_array_length("requiredActionRefs") = 0
    )
);

CREATE TABLE "TopicSelectionResearchObjection" (
    "id" TEXT NOT NULL,
    "objectionKey" TEXT NOT NULL,
    "workspaceId" TEXT,
    "titleCardId" TEXT NOT NULL,
    "researchCheckpointId" TEXT NOT NULL,
    "checkpointKind" TEXT NOT NULL,
    "targetRefType" TEXT NOT NULL,
    "targetRefId" TEXT NOT NULL,
    "targetVersionId" TEXT,
    "targetSnapshotHash" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "requiredLoopback" TEXT,
    "sourceRefs" JSONB NOT NULL DEFAULT '[]',
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TopicSelectionResearchObjection_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tsro_kind_chk" CHECK ("checkpointKind" IN ('evidence_landscape', 'gap_selection', 'question_contract', 'promotion')),
    CONSTRAINT "tsro_severity_chk" CHECK ("severity" IN ('info', 'warning', 'blocking', 'critical')),
    CONSTRAINT "tsro_human_chk" CHECK ("actorType" = 'human' AND length(btrim("actorId")) > 0),
    CONSTRAINT "tsro_hash_chk" CHECK ("targetSnapshotHash" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "tsro_refs_chk" CHECK (jsonb_typeof("sourceRefs") = 'array')
);

CREATE TABLE "TopicSelectionResearchObjectionResolution" (
    "id" TEXT NOT NULL,
    "resolutionKey" TEXT NOT NULL,
    "researchObjectionId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "titleCardId" TEXT NOT NULL,
    "resolutionType" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "resolvedSnapshotHash" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "outputRefs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TopicSelectionResearchObjectionResolution_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tsror_type_chk" CHECK ("resolutionType" IN ('resolved_with_revision', 'resolved_with_evidence', 'superseded_by_current_authority')),
    CONSTRAINT "tsror_human_chk" CHECK ("actorType" = 'human' AND length(btrim("actorId")) > 0),
    CONSTRAINT "tsror_hash_chk" CHECK ("resolvedSnapshotHash" ~ '^[a-f0-9]{64}$'),
    CONSTRAINT "tsror_refs_chk" CHECK (
      jsonb_typeof("outputRefs") = 'array' AND jsonb_array_length("outputRefs") > 0
    )
);

CREATE UNIQUE INDEX "tsrc_checkpoint_key_key" ON "TopicSelectionResearchCheckpoint"("checkpointKey");
CREATE UNIQUE INDEX "tsrc_current_key_key" ON "TopicSelectionResearchCheckpoint"("currentCheckpointKey");
CREATE INDEX "tsrc_title_kind_created_idx" ON "TopicSelectionResearchCheckpoint"("titleCardId", "checkpointKind", "createdAt" DESC);
CREATE INDEX "tsrc_target_ref_idx" ON "TopicSelectionResearchCheckpoint"("targetRefType", "targetRefId");
CREATE INDEX "tsrc_status_idx" ON "TopicSelectionResearchCheckpoint"("status");
CREATE INDEX "tsrc_input_snapshot_idx" ON "TopicSelectionResearchCheckpoint"("inputSnapshotId");
CREATE INDEX "tsrc_policy_version_idx" ON "TopicSelectionResearchCheckpoint"("policyVersionId");

CREATE UNIQUE INDEX "tsrcd_decision_key_key" ON "TopicSelectionResearchCheckpointDecision"("decisionKey");
CREATE UNIQUE INDEX "tsrcd_checkpoint_key" ON "TopicSelectionResearchCheckpointDecision"("researchCheckpointId");
CREATE UNIQUE INDEX "tsrcd_human_confirmed_key" ON "TopicSelectionResearchCheckpointDecision"("humanConfirmedDecisionId");
CREATE INDEX "tsrcd_title_created_idx" ON "TopicSelectionResearchCheckpointDecision"("titleCardId", "createdAt" DESC);
CREATE INDEX "tsrcd_kind_decision_idx" ON "TopicSelectionResearchCheckpointDecision"("checkpointKind", "decision");

CREATE UNIQUE INDEX "tsro_objection_key_key" ON "TopicSelectionResearchObjection"("objectionKey");
CREATE INDEX "tsro_checkpoint_created_idx" ON "TopicSelectionResearchObjection"("researchCheckpointId", "createdAt" DESC);
CREATE INDEX "tsro_title_created_idx" ON "TopicSelectionResearchObjection"("titleCardId", "createdAt" DESC);
CREATE INDEX "tsro_target_ref_idx" ON "TopicSelectionResearchObjection"("targetRefType", "targetRefId");
CREATE INDEX "tsro_severity_idx" ON "TopicSelectionResearchObjection"("severity");

CREATE UNIQUE INDEX "tsror_resolution_key_key" ON "TopicSelectionResearchObjectionResolution"("resolutionKey");
CREATE UNIQUE INDEX "tsror_objection_key" ON "TopicSelectionResearchObjectionResolution"("researchObjectionId");
CREATE INDEX "tsror_title_created_idx" ON "TopicSelectionResearchObjectionResolution"("titleCardId", "createdAt" DESC);
CREATE INDEX "tsror_resolution_type_idx" ON "TopicSelectionResearchObjectionResolution"("resolutionType");
