/*
  Warnings:

  - You are about to drop the `WarehouseOrders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WarehouseStaff` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentMovementType" AS ENUM ('DISPATCH', 'RECEIVED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LogisticsPartnerType" AS ENUM ('EXTERNAL', 'INTERNAL');

-- CreateEnum
CREATE TYPE "LogisticsLocationType" AS ENUM ('WAREHOUSE', 'CUSTOMER', 'DISTRIBUTION_POINT');

-- DropForeignKey
ALTER TABLE "WarehouseOrders" DROP CONSTRAINT "WarehouseOrders_order_id_fkey";

-- DropForeignKey
ALTER TABLE "WarehouseOrders" DROP CONSTRAINT "WarehouseOrders_warehouse_id_fkey";

-- DropForeignKey
ALTER TABLE "WarehouseStaff" DROP CONSTRAINT "WarehouseStaff_staff_id_fkey";

-- DropForeignKey
ALTER TABLE "WarehouseStaff" DROP CONSTRAINT "WarehouseStaff_warehouse_id_fkey";

-- DropIndex
DROP INDEX "Warehouse_manager_id_idx";

-- DropTable
DROP TABLE "WarehouseOrders";

-- DropTable
DROP TABLE "WarehouseStaff";

-- CreateTable
CREATE TABLE "DistributionPoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "market_id" TEXT NOT NULL,
    "state_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributionPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "tracking_number" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "estimated_delivery_date" TIMESTAMP(3),
    "actual_delivery_date" TIMESTAMP(3),
    "origin_location_id" TEXT NOT NULL,
    "destination_location_id" TEXT NOT NULL,
    "current_location_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentLeg" (
    "id" TEXT NOT NULL,
    "origin_location_id" TEXT NOT NULL,
    "destination_location_id" TEXT NOT NULL,
    "logistics_partner_id" TEXT NOT NULL,
    "expected_departure_date" TIMESTAMP(3) NOT NULL,
    "actual_departure_date" TIMESTAMP(3),
    "expected_arrival_date" TIMESTAMP(3) NOT NULL,
    "actual_arrival_date" TIMESTAMP(3),
    "shipment_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentMovement" (
    "id" TEXT NOT NULL,
    "movement_type" "ShipmentMovementType" NOT NULL,
    "performed_by" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "from_location_id" TEXT NOT NULL,
    "to_location_id" TEXT NOT NULL,
    "shipment_leg_id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsPartner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partner_type" "LogisticsPartnerType" NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsLocation" (
    "id" TEXT NOT NULL,
    "type" "LogisticsLocationType" NOT NULL,
    "warehouse_id" TEXT,
    "distribution_point_id" TEXT,
    "customer_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "zip" TEXT,
    "state" TEXT,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DistributionPoint_market_id_idx" ON "DistributionPoint"("market_id");

-- CreateIndex
CREATE INDEX "DistributionPoint_state_id_idx" ON "DistributionPoint"("state_id");

-- CreateIndex
CREATE INDEX "DistributionPoint_is_active_idx" ON "DistributionPoint"("is_active");

-- CreateIndex
CREATE INDEX "DistributionPoint_name_idx" ON "DistributionPoint"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_tracking_number_key" ON "Shipment"("tracking_number");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_order_id_key" ON "Shipment"("order_id");

-- CreateIndex
CREATE INDEX "Shipment_tracking_number_idx" ON "Shipment"("tracking_number");

-- CreateIndex
CREATE INDEX "Shipment_order_id_idx" ON "Shipment"("order_id");

-- CreateIndex
CREATE INDEX "ShipmentLeg_origin_location_id_idx" ON "ShipmentLeg"("origin_location_id");

-- CreateIndex
CREATE INDEX "ShipmentLeg_destination_location_id_idx" ON "ShipmentLeg"("destination_location_id");

-- CreateIndex
CREATE INDEX "ShipmentLeg_shipment_id_idx" ON "ShipmentLeg"("shipment_id");

-- CreateIndex
CREATE INDEX "ShipmentLeg_logistics_partner_id_idx" ON "ShipmentLeg"("logistics_partner_id");

-- CreateIndex
CREATE INDEX "ShipmentMovement_shipment_leg_id_idx" ON "ShipmentMovement"("shipment_leg_id");

-- CreateIndex
CREATE INDEX "ShipmentMovement_from_location_id_idx" ON "ShipmentMovement"("from_location_id");

-- CreateIndex
CREATE INDEX "ShipmentMovement_to_location_id_idx" ON "ShipmentMovement"("to_location_id");

-- CreateIndex
CREATE INDEX "ShipmentMovement_shipment_id_idx" ON "ShipmentMovement"("shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsPartner_code_key" ON "LogisticsPartner"("code");

-- CreateIndex
CREATE INDEX "LogisticsPartner_partner_type_idx" ON "LogisticsPartner"("partner_type");

-- CreateIndex
CREATE INDEX "LogisticsPartner_code_idx" ON "LogisticsPartner"("code");

-- CreateIndex
CREATE INDEX "LogisticsPartner_is_active_idx" ON "LogisticsPartner"("is_active");

-- CreateIndex
CREATE INDEX "LogisticsLocation_warehouse_id_idx" ON "LogisticsLocation"("warehouse_id");

-- CreateIndex
CREATE INDEX "LogisticsLocation_distribution_point_id_idx" ON "LogisticsLocation"("distribution_point_id");

-- CreateIndex
CREATE INDEX "LogisticsLocation_customer_id_idx" ON "LogisticsLocation"("customer_id");

-- CreateIndex
CREATE INDEX "LogisticsLocation_email_idx" ON "LogisticsLocation"("email");

-- CreateIndex
CREATE INDEX "LogisticsLocation_type_idx" ON "LogisticsLocation"("type");

-- AddForeignKey
ALTER TABLE "DistributionPoint" ADD CONSTRAINT "DistributionPoint_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributionPoint" ADD CONSTRAINT "DistributionPoint_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "ServiceState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_origin_location_id_fkey" FOREIGN KEY ("origin_location_id") REFERENCES "LogisticsLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_destination_location_id_fkey" FOREIGN KEY ("destination_location_id") REFERENCES "LogisticsLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_current_location_id_fkey" FOREIGN KEY ("current_location_id") REFERENCES "LogisticsLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentLeg" ADD CONSTRAINT "ShipmentLeg_origin_location_id_fkey" FOREIGN KEY ("origin_location_id") REFERENCES "LogisticsLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentLeg" ADD CONSTRAINT "ShipmentLeg_destination_location_id_fkey" FOREIGN KEY ("destination_location_id") REFERENCES "LogisticsLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentLeg" ADD CONSTRAINT "ShipmentLeg_logistics_partner_id_fkey" FOREIGN KEY ("logistics_partner_id") REFERENCES "LogisticsPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentLeg" ADD CONSTRAINT "ShipmentLeg_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentMovement" ADD CONSTRAINT "ShipmentMovement_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "LogisticsLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentMovement" ADD CONSTRAINT "ShipmentMovement_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "LogisticsLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentMovement" ADD CONSTRAINT "ShipmentMovement_shipment_leg_id_fkey" FOREIGN KEY ("shipment_leg_id") REFERENCES "ShipmentLeg"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentMovement" ADD CONSTRAINT "ShipmentMovement_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsLocation" ADD CONSTRAINT "LogisticsLocation_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsLocation" ADD CONSTRAINT "LogisticsLocation_distribution_point_id_fkey" FOREIGN KEY ("distribution_point_id") REFERENCES "DistributionPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsLocation" ADD CONSTRAINT "LogisticsLocation_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
