-- CreateEnum
CREATE TYPE "A11yImpact" AS ENUM ('CRITICAL', 'SERIOUS', 'MODERATE', 'MINOR');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "a11yEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "A11yAudit" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "componentTitle" TEXT NOT NULL,
    "storyName" TEXT NOT NULL,
    "storyTitle" TEXT NOT NULL,
    "viewport" TEXT NOT NULL,
    "violationCount" INTEGER NOT NULL DEFAULT 0,
    "nodeCount" INTEGER NOT NULL DEFAULT 0,
    "worstImpact" "A11yImpact",
    "fingerprint" TEXT NOT NULL,
    "lastChangedAt" TIMESTAMP(3) NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "A11yAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "A11yViolation" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "impact" "A11yImpact" NOT NULL,
    "description" TEXT NOT NULL,
    "helpUrl" TEXT NOT NULL,
    "nodeCount" INTEGER NOT NULL,
    "targets" JSONB,

    CONSTRAINT "A11yViolation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "A11yAudit_storyId_idx" ON "A11yAudit"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "A11yAudit_buildId_storyId_key" ON "A11yAudit"("buildId", "storyId");

-- CreateIndex
CREATE INDEX "A11yViolation_auditId_idx" ON "A11yViolation"("auditId");

-- CreateIndex
CREATE INDEX "A11yViolation_ruleId_idx" ON "A11yViolation"("ruleId");

-- AddForeignKey
ALTER TABLE "A11yAudit" ADD CONSTRAINT "A11yAudit_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "A11yViolation" ADD CONSTRAINT "A11yViolation_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "A11yAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
