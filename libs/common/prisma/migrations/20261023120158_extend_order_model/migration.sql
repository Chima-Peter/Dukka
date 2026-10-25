/*
  Warnings:

  - A unique constraint covering the columns `[order_number]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `billing_address` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `coupon_discount` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discount_amount` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_number` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `points_discount` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipping_address` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipping_fee` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_amount` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderPaymentAttemptStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customer_id_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "billing_address" JSONB NOT NULL,
ADD COLUMN     "coupon_discount" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL,
ADD COLUMN     "discount_amount" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "guest_email" TEXT,
ADD COLUMN     "guest_name" TEXT,
ADD COLUMN     "guest_phone_number" TEXT,
ADD COLUMN     "order_number" TEXT NOT NULL,
ADD COLUMN     "points_discount" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "shipping_address" JSONB NOT NULL,
ADD COLUMN     "shipping_fee" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "subtotal" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "total_amount" DECIMAL(12,2) NOT NULL,
ALTER COLUMN "customer_id" DROP NOT NULL,
ALTER COLUMN "customer_id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "OrderItems" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_image" TEXT NOT NULL,
    "product_specs" JSONB NOT NULL,
    "order_id" TEXT NOT NULL,
    "market_variant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketPaymentMethod" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "market_id" TEXT NOT NULL,
    "payment_method_id" TEXT NOT NULL,

    CONSTRAINT "MarketPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderPaymentAttempt" (
    "id" TEXT NOT NULL,
    "payment_intent_id" TEXT,
    "payment_intent_url" TEXT,
    "status" "OrderPaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "order_id" TEXT NOT NULL,
    "payment_method_id" TEXT NOT NULL,

    CONSTRAINT "OrderPaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_name_key" ON "PaymentMethod"("name");

-- CreateIndex
CREATE INDEX "MarketPaymentMethod_market_id_idx" ON "MarketPaymentMethod"("market_id");

-- CreateIndex
CREATE INDEX "MarketPaymentMethod_payment_method_id_idx" ON "MarketPaymentMethod"("payment_method_id");

-- CreateIndex
CREATE UNIQUE INDEX "MarketPaymentMethod_market_id_payment_method_id_key" ON "MarketPaymentMethod"("market_id", "payment_method_id");

-- CreateIndex
CREATE INDEX "OrderPaymentAttempt_order_id_idx" ON "OrderPaymentAttempt"("order_id");

-- CreateIndex
CREATE INDEX "OrderPaymentAttempt_payment_method_id_idx" ON "OrderPaymentAttempt"("payment_method_id");

-- CreateIndex
CREATE UNIQUE INDEX "OrderPaymentAttempt_order_id_payment_method_id_key" ON "OrderPaymentAttempt"("order_id", "payment_method_id");

-- CreateIndex
CREATE UNIQUE INDEX "Order_order_number_key" ON "Order"("order_number");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_market_variant_id_fkey" FOREIGN KEY ("market_variant_id") REFERENCES "MarketVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketPaymentMethod" ADD CONSTRAINT "MarketPaymentMethod_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketPaymentMethod" ADD CONSTRAINT "MarketPaymentMethod_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPaymentAttempt" ADD CONSTRAINT "OrderPaymentAttempt_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPaymentAttempt" ADD CONSTRAINT "OrderPaymentAttempt_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
