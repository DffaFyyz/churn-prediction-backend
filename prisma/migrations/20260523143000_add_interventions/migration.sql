-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "OutreachChannel" AS ENUM ('PHONE', 'EMAIL', 'WHATSAPP', 'SMS', 'IN_APP', 'OTHER');

-- CreateEnum
CREATE TYPE "OutreachOutcome" AS ENUM ('CONTACTED', 'NO_RESPONSE', 'INTERESTED', 'NOT_INTERESTED', 'COMPLAINED', 'ESCALATED', 'FOLLOW_UP_NEEDED');

-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('DISCOUNT', 'CONTRACT_UPGRADE', 'FREE_SUPPORT', 'SERVICE_BUNDLE', 'DEVICE_PROTECTION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "intervention_cases" (
    "id" TEXT NOT NULL,
    "customerID" VARCHAR(100) NOT NULL,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "CasePriority" NOT NULL DEFAULT 'MEDIUM',
    "title" VARCHAR(200),
    "reason" TEXT,
    "churnProbabilitySnapshot" DOUBLE PRECISION NOT NULL,
    "riskLevelSnapshot" "RiskLevel",
    "riskFactorsSnapshot" JSONB,
    "recommendedActions" JSONB,
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intervention_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_logs" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "customerID" VARCHAR(100) NOT NULL,
    "agentId" TEXT,
    "channel" "OutreachChannel" NOT NULL,
    "outcome" "OutreachOutcome" NOT NULL,
    "notes" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outreach_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_offers" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "customerID" VARCHAR(100) NOT NULL,
    "offeredById" TEXT,
    "offerType" "OfferType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "discountPercent" DOUBLE PRECISION,
    "discountAmount" DOUBLE PRECISION,
    "durationMonths" INTEGER,
    "status" "OfferStatus" NOT NULL DEFAULT 'OFFERED',
    "offeredAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "intervention_cases_customerID_idx" ON "intervention_cases"("customerID");

-- CreateIndex
CREATE INDEX "intervention_cases_assignedToId_idx" ON "intervention_cases"("assignedToId");

-- CreateIndex
CREATE INDEX "intervention_cases_createdById_idx" ON "intervention_cases"("createdById");

-- CreateIndex
CREATE INDEX "intervention_cases_status_idx" ON "intervention_cases"("status");

-- CreateIndex
CREATE INDEX "intervention_cases_priority_idx" ON "intervention_cases"("priority");

-- CreateIndex
CREATE INDEX "outreach_logs_caseId_idx" ON "outreach_logs"("caseId");

-- CreateIndex
CREATE INDEX "outreach_logs_customerID_idx" ON "outreach_logs"("customerID");

-- CreateIndex
CREATE INDEX "outreach_logs_agentId_idx" ON "outreach_logs"("agentId");

-- CreateIndex
CREATE INDEX "retention_offers_caseId_idx" ON "retention_offers"("caseId");

-- CreateIndex
CREATE INDEX "retention_offers_customerID_idx" ON "retention_offers"("customerID");

-- CreateIndex
CREATE INDEX "retention_offers_offeredById_idx" ON "retention_offers"("offeredById");

-- AddForeignKey
ALTER TABLE "intervention_cases" ADD CONSTRAINT "intervention_cases_customerID_fkey" FOREIGN KEY ("customerID") REFERENCES "customers"("customerID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_cases" ADD CONSTRAINT "intervention_cases_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_cases" ADD CONSTRAINT "intervention_cases_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_logs" ADD CONSTRAINT "outreach_logs_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "intervention_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_logs" ADD CONSTRAINT "outreach_logs_customerID_fkey" FOREIGN KEY ("customerID") REFERENCES "customers"("customerID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_logs" ADD CONSTRAINT "outreach_logs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_offers" ADD CONSTRAINT "retention_offers_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "intervention_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_offers" ADD CONSTRAINT "retention_offers_customerID_fkey" FOREIGN KEY ("customerID") REFERENCES "customers"("customerID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_offers" ADD CONSTRAINT "retention_offers_offeredById_fkey" FOREIGN KEY ("offeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
