-- CreateEnum
CREATE TYPE "OrderRefundStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "OrderRefund" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "OrderRefundStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "provider_refund_id" TEXT,
    "payment_reference" TEXT,
    "customer_note" TEXT,
    "merchant_note" TEXT,
    "refunded_at" TIMESTAMP(3),
    "order_id" TEXT NOT NULL,
    "order_payment_attempt_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderRefund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderRefund_provider_refund_id_key" ON "OrderRefund"("provider_refund_id");

-- CreateIndex
CREATE INDEX "OrderRefund_order_id_idx" ON "OrderRefund"("order_id");

-- CreateIndex
CREATE INDEX "OrderRefund_order_payment_attempt_id_idx" ON "OrderRefund"("order_payment_attempt_id");

-- CreateIndex
CREATE INDEX "OrderRefund_status_idx" ON "OrderRefund"("status");

-- CreateIndex
CREATE INDEX "OrderRefund_payment_reference_idx" ON "OrderRefund"("payment_reference");

-- CreateIndex
CREATE INDEX "OrderRefund_provider_idx" ON "OrderRefund"("provider");

-- AddForeignKey
ALTER TABLE "OrderRefund" ADD CONSTRAINT "OrderRefund_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRefund" ADD CONSTRAINT "OrderRefund_order_payment_attempt_id_fkey" FOREIGN KEY ("order_payment_attempt_id") REFERENCES "OrderPaymentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
