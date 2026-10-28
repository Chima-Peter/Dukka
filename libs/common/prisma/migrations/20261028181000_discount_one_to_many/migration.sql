-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN "discount_id" TEXT;

-- Backfill from existing 1:1 Discount.promotion_id links
UPDATE "Promotion" AS p
SET "discount_id" = d."id"
FROM "Discount" AS d
WHERE d."promotion_id" = p."id";

-- DropForeignKey
ALTER TABLE "Discount" DROP CONSTRAINT "Discount_promotion_id_fkey";

-- DropIndex
DROP INDEX "Discount_promotion_id_key";

-- DropIndex
DROP INDEX "Discount_promotion_id_idx";

-- AlterTable
ALTER TABLE "Discount" DROP COLUMN "promotion_id";

-- Delete orphan promotions that never had a discount (required FK)
DELETE FROM "Promotion" WHERE "discount_id" IS NULL;

-- AlterTable
ALTER TABLE "Promotion" ALTER COLUMN "discount_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Promotion_discount_id_idx" ON "Promotion"("discount_id");

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "Discount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
