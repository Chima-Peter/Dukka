-- AlterTable
ALTER TABLE "Product" ADD COLUMN "category_id" TEXT;

-- Backfill Product.category_id from MarketCategory
UPDATE "Product" AS p
SET "category_id" = mc."category_id"
FROM "MarketCategory" AS mc
WHERE p."market_category_id" = mc."id";

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "category_id" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_market_category_id_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "market_category_id";

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ProductPendingUpdate" ADD COLUMN "category_id" TEXT;

-- Backfill ProductPendingUpdate.category_id from MarketCategory where possible
UPDATE "ProductPendingUpdate" AS ppu
SET "category_id" = mc."category_id"
FROM "MarketCategory" AS mc
WHERE ppu."market_category_id" = mc."id";

-- AlterTable
ALTER TABLE "ProductPendingUpdate" DROP COLUMN "market_category_id";
