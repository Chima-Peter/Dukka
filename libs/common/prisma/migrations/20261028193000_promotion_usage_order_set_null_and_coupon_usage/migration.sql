-- AlterTable PromotionUsage: optional order_id with SetNull (same as CouponUsage)
ALTER TABLE "PromotionUsage" DROP CONSTRAINT "PromotionUsage_order_id_fkey";

ALTER TABLE "PromotionUsage" ALTER COLUMN "order_id" DROP NOT NULL;

ALTER TABLE "PromotionUsage" ADD CONSTRAINT "PromotionUsage_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PromotionUsage_order_id_idx" ON "PromotionUsage"("order_id");

CREATE INDEX "PromotionUsage_customer_id_idx" ON "PromotionUsage"("customer_id");

-- Replace stub Coupon with full model + CouponUsage
DROP TABLE IF EXISTS "Coupon";

CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

CREATE TYPE "CouponType" AS ENUM ('FIXED', 'PERCENTAGE');

CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "max_discount_amount" DECIMAL(12,2) NOT NULL,
    "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

CREATE TABLE "CouponUsage" (
    "id" TEXT NOT NULL,
    "guest_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "order_id" TEXT,

    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CouponUsage_coupon_id_customer_id_key" ON "CouponUsage"("coupon_id", "customer_id");

CREATE INDEX "CouponUsage_coupon_id_idx" ON "CouponUsage"("coupon_id");

CREATE INDEX "CouponUsage_customer_id_idx" ON "CouponUsage"("customer_id");

CREATE INDEX "CouponUsage_order_id_idx" ON "CouponUsage"("order_id");

ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
