-- DropIndex
DROP INDEX "OrderInventory_order_id_warehouse_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "OrderInventory_order_id_key" ON "OrderInventory"("order_id");
