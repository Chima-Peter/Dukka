-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "PromotionMarketStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PromotionMarketScope" AS ENUM ('ALL', 'PRODUCT', 'CATEGORY', 'VARIANT');

-- DropTable
DROP TABLE "Promos";

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "max_discount_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "promotion_id" TEXT NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionMarket" (
    "id" TEXT NOT NULL,
    "status" "PromotionMarketStatus" NOT NULL DEFAULT 'ACTIVE',
    "max_total_uses" INTEGER NOT NULL DEFAULT 0,
    "max_uses_per_customer" INTEGER NOT NULL DEFAULT 0,
    "scope" "PromotionMarketScope" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,

    CONSTRAINT "PromotionMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionMarketCategory" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "promotion_market_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "PromotionMarketCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionMarketProduct" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "promotion_market_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,

    CONSTRAINT "PromotionMarketProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionMarketVariant" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "promotion_market_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,

    CONSTRAINT "PromotionMarketVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionUsage" (
    "id" TEXT NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL,
    "redeemed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "promotion_market_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT,

    CONSTRAINT "PromotionUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Discount_promotion_id_key" ON "Discount"("promotion_id");

-- CreateIndex
CREATE INDEX "Discount_promotion_id_idx" ON "Discount"("promotion_id");

-- CreateIndex
CREATE INDEX "PromotionMarket_promotion_id_idx" ON "PromotionMarket"("promotion_id");

-- CreateIndex
CREATE INDEX "PromotionMarket_market_id_idx" ON "PromotionMarket"("market_id");

-- CreateIndex
CREATE INDEX "PromotionMarket_start_date_end_date_idx" ON "PromotionMarket"("start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionMarket_promotion_id_market_id_key" ON "PromotionMarket"("promotion_id", "market_id");

-- CreateIndex
CREATE INDEX "PromotionMarketCategory_promotion_market_id_idx" ON "PromotionMarketCategory"("promotion_market_id");

-- CreateIndex
CREATE INDEX "PromotionMarketCategory_category_id_idx" ON "PromotionMarketCategory"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionMarketCategory_promotion_market_id_category_id_key" ON "PromotionMarketCategory"("promotion_market_id", "category_id");

-- CreateIndex
CREATE INDEX "PromotionMarketProduct_promotion_market_id_idx" ON "PromotionMarketProduct"("promotion_market_id");

-- CreateIndex
CREATE INDEX "PromotionMarketProduct_product_id_idx" ON "PromotionMarketProduct"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionMarketProduct_promotion_market_id_product_id_key" ON "PromotionMarketProduct"("promotion_market_id", "product_id");

-- CreateIndex
CREATE INDEX "PromotionMarketVariant_promotion_market_id_idx" ON "PromotionMarketVariant"("promotion_market_id");

-- CreateIndex
CREATE INDEX "PromotionMarketVariant_variant_id_idx" ON "PromotionMarketVariant"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionMarketVariant_promotion_market_id_variant_id_key" ON "PromotionMarketVariant"("promotion_market_id", "variant_id");

-- CreateIndex
CREATE INDEX "PromotionUsage_promotion_market_id_idx" ON "PromotionUsage"("promotion_market_id");

-- CreateIndex
CREATE INDEX "Market_id_status_idx" ON "Market"("id", "status");

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionMarket" ADD CONSTRAINT "PromotionMarket_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionMarket" ADD CONSTRAINT "PromotionMarket_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionMarketCategory" ADD CONSTRAINT "PromotionMarketCategory_promotion_market_id_fkey" FOREIGN KEY ("promotion_market_id") REFERENCES "PromotionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionMarketCategory" ADD CONSTRAINT "PromotionMarketCategory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "MarketCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionMarketProduct" ADD CONSTRAINT "PromotionMarketProduct_promotion_market_id_fkey" FOREIGN KEY ("promotion_market_id") REFERENCES "PromotionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionMarketProduct" ADD CONSTRAINT "PromotionMarketProduct_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionMarketVariant" ADD CONSTRAINT "PromotionMarketVariant_promotion_market_id_fkey" FOREIGN KEY ("promotion_market_id") REFERENCES "PromotionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionMarketVariant" ADD CONSTRAINT "PromotionMarketVariant_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "MarketVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionUsage" ADD CONSTRAINT "PromotionUsage_promotion_market_id_fkey" FOREIGN KEY ("promotion_market_id") REFERENCES "PromotionMarket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionUsage" ADD CONSTRAINT "PromotionUsage_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionUsage" ADD CONSTRAINT "PromotionUsage_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
