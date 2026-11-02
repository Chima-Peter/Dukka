-- AlterTable
ALTER TABLE "Order" ADD COLUMN "idempotency_key" TEXT;

-- Backfill existing rows (use order id so uniqueness holds)
UPDATE "Order" SET "idempotency_key" = id WHERE "idempotency_key" IS NULL;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "idempotency_key" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotency_key_key" ON "Order"("idempotency_key");
