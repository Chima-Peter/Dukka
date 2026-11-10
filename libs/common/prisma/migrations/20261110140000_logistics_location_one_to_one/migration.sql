-- DropIndex
DROP INDEX "LogisticsLocation_warehouse_id_idx";

-- DropIndex
DROP INDEX "LogisticsLocation_distribution_point_id_idx";

-- DropIndex
DROP INDEX "LogisticsLocation_customer_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsLocation_warehouse_id_key" ON "LogisticsLocation"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsLocation_distribution_point_id_key" ON "LogisticsLocation"("distribution_point_id");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsLocation_customer_id_key" ON "LogisticsLocation"("customer_id");
