-- Title-card root storage for T-021 semantic switch.
-- Public semantics move to retrieval-topics + title-cards while legacy topicId stays internal on child tables.

-- CreateEnum
CREATE TYPE "TitleCardStatus" AS ENUM ('draft', 'active', 'promoted', 'parked');

-- CreateTable
CREATE TABLE "TitleCard" (
    "id" TEXT NOT NULL,
    "workingTitle" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "status" "TitleCardStatus" NOT NULL DEFAULT 'draft',
    "basketUpdatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TitleCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TitleCardEvidenceSelection" (
    "titleCardId" TEXT NOT NULL,
    "literatureId" TEXT NOT NULL,
    "selectedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TitleCardEvidenceSelection_pkey" PRIMARY KEY ("titleCardId","literatureId")
);

-- AlterTable
ALTER TABLE "TopicPromotionDecision" ADD COLUMN "updatedAt" TIMESTAMPTZ(6);

-- Backfill legacy promotion decisions for PATCH semantics.
UPDATE "TopicPromotionDecision"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

ALTER TABLE "TopicPromotionDecision"
ALTER COLUMN "updatedAt" SET NOT NULL;

-- Backfill title-card roots by grouping legacy topic-management records on topicId.
WITH "topic_ids" AS (
  SELECT DISTINCT "topicId" FROM "TopicResearchRecord"
  UNION
  SELECT DISTINCT "topicId" FROM "TopicNeedReview"
  UNION
  SELECT DISTINCT "topicId" FROM "TopicQuestion"
  UNION
  SELECT DISTINCT "topicId" FROM "TopicValueAssessment"
  UNION
  SELECT DISTINCT "topicId" FROM "TopicPackage"
  UNION
  SELECT DISTINCT "topicId" FROM "TopicPromotionDecision"
),
"topic_timestamps" AS (
  SELECT
    rows."topicId",
    MIN(rows."createdAt") AS "createdAt",
    MAX(rows."updatedAt") AS "updatedAt"
  FROM (
    SELECT "topicId", "createdAt", "updatedAt" FROM "TopicResearchRecord"
    UNION ALL
    SELECT "topicId", "createdAt", "updatedAt" FROM "TopicNeedReview"
    UNION ALL
    SELECT "topicId", "createdAt", "updatedAt" FROM "TopicQuestion"
    UNION ALL
    SELECT "topicId", "createdAt", "updatedAt" FROM "TopicValueAssessment"
    UNION ALL
    SELECT "topicId", "createdAt", "updatedAt" FROM "TopicPackage"
    UNION ALL
    SELECT "topicId", "createdAt", "updatedAt" FROM "TopicPromotionDecision"
  ) AS rows
  GROUP BY rows."topicId"
),
"latest_package" AS (
  SELECT DISTINCT ON ("topicId")
    "topicId",
    "titleCandidates",
    "contributionSummary"
  FROM "TopicPackage"
  ORDER BY "topicId", "updatedAt" DESC
),
"latest_question" AS (
  SELECT DISTINCT ON ("topicId")
    "topicId",
    "mainQuestion"
  FROM "TopicQuestion"
  ORDER BY "topicId", "updatedAt" DESC
),
"latest_record" AS (
  SELECT DISTINCT ON ("topicId")
    "topicId",
    "summary"
  FROM "TopicResearchRecord"
  ORDER BY "topicId", "updatedAt" DESC
),
"promotion_flags" AS (
  SELECT
    "topicId",
    BOOL_OR("promotedPaperId" IS NOT NULL OR "decision" = 'promote') AS "hasPromotedDecision"
  FROM "TopicPromotionDecision"
  GROUP BY "topicId"
),
"basket_updates" AS (
  SELECT
    items."topicId",
    MAX(items."selectedAt") AS "basketUpdatedAt"
  FROM (
    SELECT
      review."topicId",
      review."updatedAt" AS "selectedAt"
    FROM "TopicNeedReview" AS review,
    LATERAL jsonb_array_elements_text(review."literatureIds") AS lit("literatureId")
    UNION ALL
    SELECT
      pkg."topicId",
      pkg."updatedAt" AS "selectedAt"
    FROM "TopicPackage" AS pkg,
    LATERAL jsonb_array_elements_text(pkg."selectedLiteratureEvidenceIds") AS lit("literatureId")
  ) AS items
  GROUP BY items."topicId"
)
INSERT INTO "TitleCard" (
  "id",
  "workingTitle",
  "brief",
  "status",
  "basketUpdatedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  topic_ids."topicId" AS "id",
  COALESCE(
    NULLIF(latest_package."titleCandidates" ->> 0, ''),
    NULLIF(latest_question."mainQuestion", ''),
    topic_ids."topicId"
  ) AS "workingTitle",
  COALESCE(
    NULLIF(latest_package."contributionSummary", ''),
    NULLIF(latest_record."summary", ''),
    'Migrated from legacy topic-management records.'
  ) AS "brief",
  CASE
    WHEN COALESCE(promotion_flags."hasPromotedDecision", FALSE) THEN 'promoted'::"TitleCardStatus"
    WHEN topic_timestamps."updatedAt" IS NOT NULL THEN 'active'::"TitleCardStatus"
    ELSE 'draft'::"TitleCardStatus"
  END AS "status",
  COALESCE(basket_updates."basketUpdatedAt", topic_timestamps."updatedAt", topic_timestamps."createdAt", NOW()) AS "basketUpdatedAt",
  COALESCE(topic_timestamps."createdAt", NOW()) AS "createdAt",
  COALESCE(topic_timestamps."updatedAt", topic_timestamps."createdAt", NOW()) AS "updatedAt"
FROM "topic_ids" AS topic_ids
LEFT JOIN "topic_timestamps" AS topic_timestamps
  ON topic_timestamps."topicId" = topic_ids."topicId"
LEFT JOIN "latest_package" AS latest_package
  ON latest_package."topicId" = topic_ids."topicId"
LEFT JOIN "latest_question" AS latest_question
  ON latest_question."topicId" = topic_ids."topicId"
LEFT JOIN "latest_record" AS latest_record
  ON latest_record."topicId" = topic_ids."topicId"
LEFT JOIN "promotion_flags" AS promotion_flags
  ON promotion_flags."topicId" = topic_ids."topicId"
LEFT JOIN "basket_updates" AS basket_updates
  ON basket_updates."topicId" = topic_ids."topicId"
ON CONFLICT ("id") DO NOTHING;

-- Backfill persistent evidence baskets from legacy need/package literature selections.
WITH "basket_candidates" AS (
  SELECT
    review."topicId" AS "titleCardId",
    lit."literatureId" AS "literatureId",
    review."updatedAt" AS "selectedAt"
  FROM "TopicNeedReview" AS review,
  LATERAL jsonb_array_elements_text(review."literatureIds") AS lit("literatureId")
  UNION ALL
  SELECT
    pkg."topicId" AS "titleCardId",
    lit."literatureId" AS "literatureId",
    pkg."updatedAt" AS "selectedAt"
  FROM "TopicPackage" AS pkg,
  LATERAL jsonb_array_elements_text(pkg."selectedLiteratureEvidenceIds") AS lit("literatureId")
),
"collapsed_basket" AS (
  SELECT
    "titleCardId",
    "literatureId",
    MAX("selectedAt") AS "selectedAt"
  FROM "basket_candidates"
  GROUP BY "titleCardId", "literatureId"
)
INSERT INTO "TitleCardEvidenceSelection" (
  "titleCardId",
  "literatureId",
  "selectedAt"
)
SELECT
  collapsed."titleCardId",
  collapsed."literatureId",
  collapsed."selectedAt"
FROM "collapsed_basket" AS collapsed
INNER JOIN "TitleCard" AS card
  ON card."id" = collapsed."titleCardId"
INNER JOIN "LiteratureRecord" AS literature
  ON literature."id" = collapsed."literatureId"
ON CONFLICT ("titleCardId", "literatureId") DO NOTHING;

-- CreateIndex
CREATE INDEX "TitleCard_status_updatedAt_idx" ON "TitleCard"("status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "TitleCard_updatedAt_idx" ON "TitleCard"("updatedAt" DESC);

-- CreateIndex
CREATE INDEX "TitleCardEvidenceSelection_literatureId_idx" ON "TitleCardEvidenceSelection"("literatureId");

-- CreateIndex
CREATE INDEX "TitleCardEvidenceSelection_titleCardId_selectedAt_idx" ON "TitleCardEvidenceSelection"("titleCardId", "selectedAt" DESC);

-- AddForeignKey
ALTER TABLE "TitleCardEvidenceSelection"
ADD CONSTRAINT "TitleCardEvidenceSelection_titleCardId_fkey"
FOREIGN KEY ("titleCardId") REFERENCES "TitleCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitleCardEvidenceSelection"
ADD CONSTRAINT "TitleCardEvidenceSelection_literatureId_fkey"
FOREIGN KEY ("literatureId") REFERENCES "LiteratureRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
