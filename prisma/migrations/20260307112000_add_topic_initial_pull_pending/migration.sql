-- AlterTable
ALTER TABLE "TopicProfile"
ADD COLUMN "initialPullPending" BOOLEAN NOT NULL DEFAULT false;
