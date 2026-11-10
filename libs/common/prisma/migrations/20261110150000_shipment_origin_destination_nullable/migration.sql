-- AlterTable
ALTER TABLE "Shipment" ALTER COLUMN "origin_location_id" DROP NOT NULL;
ALTER TABLE "Shipment" ALTER COLUMN "destination_location_id" DROP NOT NULL;
