-- Keep persisted Arena states aligned with the existing execution-claim and blocked-result lifecycle.
ALTER TABLE "TopicSelectionResearchArenaSession"
  DROP CONSTRAINT "tsras_status_chk",
  DROP CONSTRAINT "tsras_current_chk",
  DROP CONSTRAINT "tsras_synthesis_chk",
  ADD CONSTRAINT "tsras_status_chk" CHECK (
    "status" IN ('open', 'executing', 'blocked', 'synthesized', 'superseded')
  ),
  ADD CONSTRAINT "tsras_current_chk" CHECK (
    ("status" = 'superseded' AND "currentArenaKey" IS NULL
      AND "supersededByArenaSessionId" IS NOT NULL AND "supersededAt" IS NOT NULL)
    OR ("status" IN ('open', 'executing', 'blocked', 'synthesized') AND "currentArenaKey" IS NOT NULL
      AND "supersededByArenaSessionId" IS NULL AND "supersededAt" IS NULL)
  ),
  ADD CONSTRAINT "tsras_synthesis_chk" CHECK (
    ("status" IN ('open', 'executing') AND "terminationReason" IS NULL
      AND "loopTranscriptRef" IS NULL AND "loopTranscriptHash" IS NULL AND "synthesizedAt" IS NULL)
    OR ("status" = 'blocked' AND "terminationReason" IS NOT NULL AND "synthesizedAt" IS NULL
      AND (("loopTranscriptRef" IS NULL AND "loopTranscriptHash" IS NULL)
        OR ("loopTranscriptRef" IS NOT NULL AND "loopTranscriptHash" IS NOT NULL)))
    OR ("status" = 'synthesized' AND "terminationReason" IS NOT NULL
      AND "loopTranscriptRef" IS NOT NULL AND "loopTranscriptHash" IS NOT NULL AND "synthesizedAt" IS NOT NULL)
    OR "status" = 'superseded'
  );
