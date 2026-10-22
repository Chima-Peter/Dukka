-- CreateTable
CREATE TABLE "ServiceState" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "state_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseServiceState" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "service_state_id" TEXT NOT NULL,

    CONSTRAINT "WarehouseServiceState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceState_market_id_idx" ON "ServiceState"("market_id");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceState_market_id_state_name_key" ON "ServiceState"("market_id", "state_name");

-- CreateIndex
CREATE INDEX "WarehouseServiceState_service_state_id_idx" ON "WarehouseServiceState"("service_state_id");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseServiceState_warehouse_id_service_state_id_key" ON "WarehouseServiceState"("warehouse_id", "service_state_id");

-- AddForeignKey
ALTER TABLE "ServiceState" ADD CONSTRAINT "ServiceState_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseServiceState" ADD CONSTRAINT "WarehouseServiceState_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseServiceState" ADD CONSTRAINT "WarehouseServiceState_service_state_id_fkey" FOREIGN KEY ("service_state_id") REFERENCES "ServiceState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
