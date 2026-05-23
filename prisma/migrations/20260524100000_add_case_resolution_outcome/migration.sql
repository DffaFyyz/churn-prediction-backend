-- CreateEnum
CREATE TYPE "CaseResolutionOutcome" AS ENUM ('RETAINED', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'CUSTOMER_UNREACHABLE', 'CHURN_CONFIRMED', 'OTHER');

-- AlterTable
ALTER TABLE "intervention_cases" ADD COLUMN "resolutionOutcome" "CaseResolutionOutcome",
ADD COLUMN "finalOutreachLogId" TEXT,
ADD COLUMN "finalOfferId" TEXT;
