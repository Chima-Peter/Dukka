-- CreateEnum
CREATE TYPE "OrderRefundAuditAction" AS ENUM (
  'REFUND_CREATED',
  'REFUND_PROVIDER_SUBMITTED',
  'REFUND_RETRY_WITH_CUSTOMER_DETAILS',
  'REFUND_NEEDS_ATTENTION',
  'REFUND_PROCESSED',
  'REFUND_FAILED'
);

-- CreateEnum
CREATE TYPE "OrderRefundAuditActorType" AS ENUM (
  'STAFF',
  'CUSTOMER',
  'SYSTEM',
  'PROVIDER'
);

-- CreateTable
CREATE TABLE "order_refund_audit" (
  "id" TEXT NOT NULL,
  "action" "OrderRefundAuditAction" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "order_id" TEXT NOT NULL,
  "order_refund_id" TEXT NOT NULL,
  "actor_type" "OrderRefundAuditActorType" NOT NULL,
  "performed_by_id" TEXT,
  "performed_by_name" TEXT NOT NULL,
  "new_status" "OrderRefundStatus",
  "provider_refund_id" TEXT,
  "amount" DECIMAL(12,2),
  "currency" TEXT,
  "detail" JSONB,

  CONSTRAINT "order_refund_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_refund_audit_order_refund_id_idx" ON "order_refund_audit"("order_refund_id");

-- CreateIndex
CREATE INDEX "order_refund_audit_order_id_idx" ON "order_refund_audit"("order_id");

-- CreateIndex
CREATE INDEX "order_refund_audit_created_at_idx" ON "order_refund_audit"("created_at");

-- AddForeignKey
ALTER TABLE "order_refund_audit" ADD CONSTRAINT "order_refund_audit_order_refund_id_fkey" FOREIGN KEY ("order_refund_id") REFERENCES "OrderRefund"("id") ON DELETE CASCADE ON UPDATE CASCADE;
