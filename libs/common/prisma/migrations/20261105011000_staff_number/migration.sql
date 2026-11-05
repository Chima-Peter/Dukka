-- AlterTable
ALTER TABLE "Staff" ADD COLUMN "staff_number" TEXT;

-- Backfill existing staff with deterministic numbers
UPDATE "Staff"
SET "staff_number" = 'STF-' || UPPER(SUBSTRING(REPLACE("id", '-', '') FROM 1 FOR 8))
WHERE "staff_number" IS NULL;

ALTER TABLE "Staff" ALTER COLUMN "staff_number" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Staff_staff_number_key" ON "Staff"("staff_number");
