-- Topic management v1: topic_id is logical FK (no FK to TopicProfile). See dev-docs/active/automated-topic-management/03-implementation-notes.

-- CreateEnum
CREATE TYPE "TopicResearchRecordType" AS ENUM ('evidence_review', 'need_review', 'question', 'value_assessment', 'topic_package', 'promotion_decision');

-- CreateEnum
CREATE TYPE "TopicResearchRecordStatus" AS ENUM ('draft', 'completed', 'superseded', 'archived');

-- CreateEnum
CREATE TYPE "TopicValueVerdict" AS ENUM ('promote', 'refine', 'park', 'drop');

-- CreateEnum
CREATE TYPE "TopicPromotionDecisionType" AS ENUM ('promote', 'hold', 'reject', 'loopback');

-- CreateEnum
CREATE TYPE "TopicContributionHypothesis" AS ENUM ('method', 'benchmark', 'analysis', 'resource', 'system');

-- CreateTable
CREATE TABLE "TopicResearchRecord" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "recordType" "TopicResearchRecordType" NOT NULL,
    "recordStatus" "TopicResearchRecordStatus" NOT NULL DEFAULT 'draft',
    "versionNo" INTEGER NOT NULL DEFAULT 1,
    "parentRecordId" TEXT,
    "supersededByRecordId" TEXT,
    "sourceRecordIds" JSONB NOT NULL DEFAULT '[]',
    "lineage" JSONB NOT NULL DEFAULT '{}',
    "summary" TEXT NOT NULL,
    "confidence" DECIMAL(4,3) NOT NULL DEFAULT 0.500,
    "blockingIssues" JSONB NOT NULL DEFAULT '[]',
    "missingInformation" JSONB NOT NULL DEFAULT '[]',
    "nextActions" JSONB NOT NULL DEFAULT '[]',
    "evidenceRefs" JSONB NOT NULL DEFAULT '[]',
    "payload" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL DEFAULT 'hybrid',
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "TopicResearchRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicQuestion" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "researchRecordId" TEXT NOT NULL,
    "mainQuestion" TEXT NOT NULL,
    "subQuestions" JSONB NOT NULL DEFAULT '[]',
    "researchSlice" TEXT NOT NULL,
    "contributionHypothesis" "TopicContributionHypothesis" NOT NULL,
    "sourceNeedReviewIds" JSONB NOT NULL DEFAULT '[]',
    "sourceEvidenceReviewIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TopicQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicNeedReview" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "researchRecordId" TEXT NOT NULL,
    "needStatement" TEXT NOT NULL,
    "whoNeedsIt" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "boundary" TEXT,
    "unmetNeedCategory" TEXT NOT NULL,
    "falsificationVerdict" TEXT NOT NULL,
    "significanceScore" INTEGER NOT NULL,
    "measurabilityScore" INTEGER NOT NULL,
    "feasibilitySignal" TEXT NOT NULL,
    "validatedNeed" BOOLEAN NOT NULL,
    "evidenceReviewRefs" JSONB NOT NULL DEFAULT '[]',
    "literatureIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TopicNeedReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicValueAssessment" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "researchRecordId" TEXT NOT NULL,
    "strongestClaimIfSuccess" TEXT NOT NULL,
    "fallbackClaimIfSuccess" TEXT,
    "hardGates" JSONB NOT NULL,
    "scoredDimensions" JSONB NOT NULL,
    "riskPenalty" JSONB NOT NULL,
    "reviewerObjections" JSONB NOT NULL DEFAULT '[]',
    "ceilingCase" TEXT NOT NULL,
    "baseCase" TEXT NOT NULL,
    "floorCase" TEXT NOT NULL,
    "verdict" "TopicValueVerdict" NOT NULL,
    "totalScore" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TopicValueAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicPackage" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "valueAssessmentId" TEXT NOT NULL,
    "researchRecordId" TEXT NOT NULL,
    "titleCandidates" JSONB NOT NULL DEFAULT '[]',
    "researchBackground" TEXT NOT NULL,
    "contributionSummary" TEXT NOT NULL,
    "candidateMethods" JSONB NOT NULL DEFAULT '[]',
    "evaluationPlan" TEXT NOT NULL,
    "keyRisks" JSONB NOT NULL DEFAULT '[]',
    "selectedLiteratureEvidenceIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TopicPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicPromotionDecision" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "valueAssessmentId" TEXT NOT NULL,
    "packageId" TEXT,
    "decision" "TopicPromotionDecisionType" NOT NULL,
    "reasonSummary" TEXT NOT NULL,
    "targetPaperTitle" TEXT,
    "promotedPaperId" TEXT,
    "loopbackTarget" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TopicPromotionDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TopicQuestion_researchRecordId_key" ON "TopicQuestion"("researchRecordId");

-- CreateIndex
CREATE INDEX "TopicQuestion_topicId_updatedAt_idx" ON "TopicQuestion"("topicId", "updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "TopicNeedReview_researchRecordId_key" ON "TopicNeedReview"("researchRecordId");

-- CreateIndex
CREATE INDEX "TopicNeedReview_topicId_updatedAt_idx" ON "TopicNeedReview"("topicId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "TopicNeedReview_topicId_validatedNeed_idx" ON "TopicNeedReview"("topicId", "validatedNeed");

-- CreateIndex
CREATE UNIQUE INDEX "TopicValueAssessment_researchRecordId_key" ON "TopicValueAssessment"("researchRecordId");

-- CreateIndex
CREATE INDEX "TopicValueAssessment_topicId_updatedAt_idx" ON "TopicValueAssessment"("topicId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "TopicValueAssessment_questionId_updatedAt_idx" ON "TopicValueAssessment"("questionId", "updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "TopicPackage_researchRecordId_key" ON "TopicPackage"("researchRecordId");

-- CreateIndex
CREATE INDEX "TopicPackage_topicId_updatedAt_idx" ON "TopicPackage"("topicId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "TopicPromotionDecision_topicId_createdAt_idx" ON "TopicPromotionDecision"("topicId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "TopicResearchRecord" ADD CONSTRAINT "TopicResearchRecord_parentRecordId_fkey" FOREIGN KEY ("parentRecordId") REFERENCES "TopicResearchRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicResearchRecord" ADD CONSTRAINT "TopicResearchRecord_supersededByRecordId_fkey" FOREIGN KEY ("supersededByRecordId") REFERENCES "TopicResearchRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicQuestion" ADD CONSTRAINT "TopicQuestion_researchRecordId_fkey" FOREIGN KEY ("researchRecordId") REFERENCES "TopicResearchRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicNeedReview" ADD CONSTRAINT "TopicNeedReview_researchRecordId_fkey" FOREIGN KEY ("researchRecordId") REFERENCES "TopicResearchRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicValueAssessment" ADD CONSTRAINT "TopicValueAssessment_researchRecordId_fkey" FOREIGN KEY ("researchRecordId") REFERENCES "TopicResearchRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicValueAssessment" ADD CONSTRAINT "TopicValueAssessment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "TopicQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicPackage" ADD CONSTRAINT "TopicPackage_researchRecordId_fkey" FOREIGN KEY ("researchRecordId") REFERENCES "TopicResearchRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicPackage" ADD CONSTRAINT "TopicPackage_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "TopicQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicPackage" ADD CONSTRAINT "TopicPackage_valueAssessmentId_fkey" FOREIGN KEY ("valueAssessmentId") REFERENCES "TopicValueAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicPromotionDecision" ADD CONSTRAINT "TopicPromotionDecision_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "TopicQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicPromotionDecision" ADD CONSTRAINT "TopicPromotionDecision_valueAssessmentId_fkey" FOREIGN KEY ("valueAssessmentId") REFERENCES "TopicValueAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicPromotionDecision" ADD CONSTRAINT "TopicPromotionDecision_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TopicPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
