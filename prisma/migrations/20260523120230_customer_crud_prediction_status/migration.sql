-- CreateEnum
CREATE TYPE "PredictionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "predictionError" TEXT,
ADD COLUMN     "predictionStatus" "PredictionStatus" NOT NULL DEFAULT 'PENDING';
