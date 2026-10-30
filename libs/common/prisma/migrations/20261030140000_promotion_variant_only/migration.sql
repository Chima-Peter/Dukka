-- Drop category and product promotion targets; promotions only apply to variants.
DROP TABLE IF EXISTS "PromotionMarketCategory";
DROP TABLE IF EXISTS "PromotionMarketProduct";

-- Remove scope column and enum.
ALTER TABLE "PromotionMarket" DROP COLUMN IF EXISTS "scope";
DROP TYPE IF EXISTS "PromotionMarketScope";
