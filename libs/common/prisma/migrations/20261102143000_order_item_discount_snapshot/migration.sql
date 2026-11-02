-- AlterTable
ALTER TABLE "OrderItems" ADD COLUMN "discount_type" "DiscountType",
ADD COLUMN "discount_value" DECIMAL(12,2),
ADD COLUMN "max_discount_amount" DECIMAL(12,2),
ADD COLUMN "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "promotion_market_id" TEXT;
