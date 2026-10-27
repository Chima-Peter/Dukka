-- AlterTable
ALTER TABLE "OrderPaymentAttempt" ADD COLUMN "expires_at" TIMESTAMP(3);

-- Backfill from linked OrderInventory when present, otherwise created_at
UPDATE "OrderPaymentAttempt" AS pa
SET "expires_at" = COALESCE(oi."expires_at", pa."created_at")
FROM "OrderInventory" AS oi
WHERE oi."order_id" = pa."order_id";

UPDATE "OrderPaymentAttempt"
SET "expires_at" = "created_at"
WHERE "expires_at" IS NULL;

ALTER TABLE "OrderPaymentAttempt" ALTER COLUMN "expires_at" SET NOT NULL;

-- CreateIndex
CREATE INDEX "OrderPaymentAttempt_expires_at_idx" ON "OrderPaymentAttempt"("expires_at");
