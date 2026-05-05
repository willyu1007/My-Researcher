-- Application settings store for literature content-processing provider/profile/storage configuration.

-- CreateTable
CREATE TABLE "ApplicationSetting" (
    "id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "secretValue" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ApplicationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationSetting_namespace_key_key" ON "ApplicationSetting"("namespace", "key");

-- CreateIndex
CREATE INDEX "ApplicationSetting_namespace_idx" ON "ApplicationSetting"("namespace");
