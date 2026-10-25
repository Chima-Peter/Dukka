-- CreateEnum
CREATE TYPE "VariantStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN "status" "VariantStatus";

-- Existing listed variants are treated as approved
UPDATE "Variant" SET "status" = 'ACTIVE'::"VariantStatus"
WHERE EXISTS (
  SELECT 1 FROM "MarketVariant" mv WHERE mv."variant_id" = "Variant"."id"
);

UPDATE "Variant" SET "status" = 'PENDING_REVIEW'::"VariantStatus"
WHERE "status" IS NULL;

ALTER TABLE "Variant" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Variant" ALTER COLUMN "status" SET DEFAULT 'PENDING_REVIEW'::"VariantStatus";
