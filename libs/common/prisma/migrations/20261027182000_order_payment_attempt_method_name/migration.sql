-- DropForeignKey
ALTER TABLE "OrderPaymentAttempt" DROP CONSTRAINT "OrderPaymentAttempt_payment_method_id_fkey";

-- DropIndex
DROP INDEX "OrderPaymentAttempt_payment_method_id_idx";

-- DropIndex
DROP INDEX "OrderPaymentAttempt_order_id_payment_method_id_key";

-- AlterTable
ALTER TABLE "OrderPaymentAttempt" ADD COLUMN "payment_method_name" TEXT;
ALTER TABLE "OrderPaymentAttempt" ADD COLUMN "market_payment_method_id" TEXT;

-- Backfill name from legacy PaymentMethod FK when present
UPDATE "OrderPaymentAttempt" AS opa
SET "payment_method_name" = pm.name
FROM "PaymentMethod" AS pm
WHERE opa."payment_method_id" = pm.id;

UPDATE "OrderPaymentAttempt"
SET "payment_method_name" = 'UNKNOWN'
WHERE "payment_method_name" IS NULL;

-- AlterTable
ALTER TABLE "OrderPaymentAttempt" ALTER COLUMN "payment_method_name" SET NOT NULL;

-- AlterTable
ALTER TABLE "OrderPaymentAttempt" DROP COLUMN "payment_method_id";

-- DropIndex
DROP INDEX "OrderPaymentAttempt_order_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "OrderPaymentAttempt_order_id_key" ON "OrderPaymentAttempt"("order_id");

-- CreateIndex
CREATE INDEX "OrderPaymentAttempt_market_payment_method_id_idx" ON "OrderPaymentAttempt"("market_payment_method_id");

-- CreateIndex
CREATE INDEX "OrderPaymentAttempt_payment_method_name_idx" ON "OrderPaymentAttempt"("payment_method_name");

-- CreateIndex
CREATE INDEX "OrderPaymentAttempt_status_idx" ON "OrderPaymentAttempt"("status");

-- AddForeignKey
ALTER TABLE "OrderPaymentAttempt" ADD CONSTRAINT "OrderPaymentAttempt_market_payment_method_id_fkey" FOREIGN KEY ("market_payment_method_id") REFERENCES "MarketPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
