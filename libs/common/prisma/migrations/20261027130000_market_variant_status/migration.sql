-- CreateEnum
CREATE TYPE "MarketVariantStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- AlterTable
ALTER TABLE "MarketVariant" ADD COLUMN "status" "MarketVariantStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "MarketVariant_status_idx" ON "MarketVariant"("status");
