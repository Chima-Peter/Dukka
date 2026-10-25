/*
  Warnings:

  - You are about to drop the column `reserved_quantity` on the `Inventory` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OrderInventoryStatus" AS ENUM ('PENDING', 'CLOSED', 'SUCCESS');

-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "reserved_quantity";

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderInventory" (
    "id" TEXT NOT NULL,
    "status" "OrderInventoryStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "order_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,

    CONSTRAINT "OrderInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLineItem" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "order_inventory_id" TEXT NOT NULL,
    "market_variant_id" TEXT NOT NULL,

    CONSTRAINT "InventoryLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderInventory_warehouse_id_idx" ON "OrderInventory"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "OrderInventory_order_id_warehouse_id_key" ON "OrderInventory"("order_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "InventoryLineItem_market_variant_id_idx" ON "InventoryLineItem"("market_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLineItem_order_inventory_id_market_variant_id_key" ON "InventoryLineItem"("order_inventory_id", "market_variant_id");

-- AddForeignKey
ALTER TABLE "OrderInventory" ADD CONSTRAINT "OrderInventory_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderInventory" ADD CONSTRAINT "OrderInventory_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLineItem" ADD CONSTRAINT "InventoryLineItem_order_inventory_id_fkey" FOREIGN KEY ("order_inventory_id") REFERENCES "OrderInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLineItem" ADD CONSTRAINT "InventoryLineItem_market_variant_id_fkey" FOREIGN KEY ("market_variant_id") REFERENCES "MarketVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
