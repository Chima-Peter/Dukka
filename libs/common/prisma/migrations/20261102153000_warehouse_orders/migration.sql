-- CreateTable
CREATE TABLE "WarehouseOrders" (
    "id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "order_number" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "customer_name" TEXT,
    "market_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "order_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,

    CONSTRAINT "WarehouseOrders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseOrders_order_id_key" ON "WarehouseOrders"("order_id");

-- CreateIndex
CREATE INDEX "WarehouseOrders_warehouse_id_created_at_id_idx" ON "WarehouseOrders"("warehouse_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "WarehouseOrders_warehouse_id_status_created_at_idx" ON "WarehouseOrders"("warehouse_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "WarehouseOrders_market_id_idx" ON "WarehouseOrders"("market_id");

-- AddForeignKey
ALTER TABLE "WarehouseOrders" ADD CONSTRAINT "WarehouseOrders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseOrders" ADD CONSTRAINT "WarehouseOrders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
