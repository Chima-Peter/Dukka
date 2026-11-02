-- CreateTable
CREATE TABLE "WarehouseStaff" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,

    CONSTRAINT "WarehouseStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Warehouse_manager_id_idx" ON "Warehouse"("manager_id");

-- CreateIndex
CREATE INDEX "WarehouseStaff_staff_id_idx" ON "WarehouseStaff"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseStaff_warehouse_id_staff_id_key" ON "WarehouseStaff"("warehouse_id", "staff_id");

-- AddForeignKey
ALTER TABLE "WarehouseStaff" ADD CONSTRAINT "WarehouseStaff_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStaff" ADD CONSTRAINT "WarehouseStaff_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
