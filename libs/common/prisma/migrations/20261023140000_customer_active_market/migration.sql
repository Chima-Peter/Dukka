-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "active_market_id" TEXT;

-- CreateIndex
CREATE INDEX "Customer_active_market_id_idx" ON "Customer"("active_market_id");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_active_market_id_fkey" FOREIGN KEY ("active_market_id") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;
