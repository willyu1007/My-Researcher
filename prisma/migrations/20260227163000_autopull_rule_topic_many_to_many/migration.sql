-- AlterTable
ALTER TABLE "TopicProfile"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AutoPullRuleTopic" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AutoPullRuleTopic_pkey" PRIMARY KEY ("id")
);

-- Backfill existing one-to-many rule-topic bindings into the join table
INSERT INTO "AutoPullRuleTopic" ("id", "ruleId", "topicId", "createdAt")
SELECT
  'rule-topic:' || "id" || ':' || "topicId",
  "id",
  "topicId",
  NOW()
FROM "AutoPullRule"
WHERE "topicId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AutoPullRuleTopic_ruleId_topicId_key" ON "AutoPullRuleTopic"("ruleId", "topicId");

-- CreateIndex
CREATE INDEX "AutoPullRuleTopic_topicId_idx" ON "AutoPullRuleTopic"("topicId");

-- CreateIndex
CREATE INDEX "AutoPullRuleTopic_ruleId_idx" ON "AutoPullRuleTopic"("ruleId");

-- AddForeignKey
ALTER TABLE "AutoPullRuleTopic" ADD CONSTRAINT "AutoPullRuleTopic_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutoPullRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoPullRuleTopic" ADD CONSTRAINT "AutoPullRuleTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "TopicProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropLegacyRelation
ALTER TABLE "AutoPullRule" DROP CONSTRAINT "AutoPullRule_topicId_fkey";
DROP INDEX "AutoPullRule_topicId_idx";
ALTER TABLE "AutoPullRule" DROP COLUMN "topicId";
