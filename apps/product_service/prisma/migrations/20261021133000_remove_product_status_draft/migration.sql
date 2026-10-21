-- Migrate DRAFT products to PENDING_REVIEW, then drop DRAFT from ProductStatus.
CREATE TYPE "ProductStatus_new" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'ARCHIVED');

ALTER TABLE "Product" ALTER COLUMN "status" DROP DEFAULT;

UPDATE "Product"
SET "status" = 'PENDING_REVIEW'
WHERE "status" = 'DRAFT';

ALTER TABLE "Product"
  ALTER COLUMN "status" TYPE "ProductStatus_new"
  USING ("status"::text::"ProductStatus_new");

ALTER TYPE "ProductStatus" RENAME TO "ProductStatus_old";
ALTER TYPE "ProductStatus_new" RENAME TO "ProductStatus";

DROP TYPE "ProductStatus_old";

ALTER TABLE "Product" ALTER COLUMN "status" SET DEFAULT 'PENDING_REVIEW';
