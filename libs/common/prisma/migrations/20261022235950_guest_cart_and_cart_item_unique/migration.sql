-- AlterTable
ALTER TABLE "Cart" ALTER COLUMN "total" SET DEFAULT 0,
ALTER COLUMN "customer_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CartItems_cart_id_market_variant_id_key" ON "CartItems"("cart_id", "market_variant_id");

-- CreateIndex
CREATE INDEX "CartItems_cart_id_idx" ON "CartItems"("cart_id");

-- CreateIndex
CREATE INDEX "CartItems_market_variant_id_idx" ON "CartItems"("market_variant_id");
