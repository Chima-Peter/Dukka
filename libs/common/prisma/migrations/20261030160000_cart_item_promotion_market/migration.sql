-- AlterTable
ALTER TABLE "CartItems" ADD COLUMN "promotion_market_id" TEXT;

-- AddForeignKey
ALTER TABLE "CartItems" ADD CONSTRAINT "CartItems_promotion_market_id_fkey" FOREIGN KEY ("promotion_market_id") REFERENCES "PromotionMarket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "CartItems_promotion_market_id_idx" ON "CartItems"("promotion_market_id");
