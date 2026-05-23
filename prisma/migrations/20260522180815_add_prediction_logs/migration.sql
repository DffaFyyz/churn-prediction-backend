-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "lastPredictedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "prediction_logs" (
    "id" TEXT NOT NULL,
    "customerID" VARCHAR(100) NOT NULL,
    "churnProbability" DOUBLE PRECISION NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "topFactors" JSONB,
    "modelVersion" VARCHAR(100),
    "threshold" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prediction_logs_customerID_idx" ON "prediction_logs"("customerID");

-- CreateIndex
CREATE INDEX "prediction_logs_createdAt_idx" ON "prediction_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "prediction_logs" ADD CONSTRAINT "prediction_logs_customerID_fkey" FOREIGN KEY ("customerID") REFERENCES "customers"("customerID") ON DELETE CASCADE ON UPDATE CASCADE;
