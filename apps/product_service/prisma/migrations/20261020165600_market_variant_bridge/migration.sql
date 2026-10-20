-- DropInventory (old variant-based stock)
DROP TABLE IF EXISTS "Inventory";

-- DropMarketPrice
DROP TABLE IF EXISTS "MarketPrice";

-- DropMarketProduct
DROP TABLE IF EXISTS "MarketProduct";

-- CreateTable
CREATE TABLE "MarketVariant" (
    "id" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "available_quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "market_variant_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketVariant_market_id_variant_id_key" ON "MarketVariant"("market_id", "variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_market_variant_id_warehouse_id_key" ON "Inventory"("market_variant_id", "warehouse_id");

-- AddForeignKey
ALTER TABLE "MarketVariant" ADD CONSTRAINT "MarketVariant_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_market_variant_id_fkey" FOREIGN KEY ("market_variant_id") REFERENCES "MarketVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
