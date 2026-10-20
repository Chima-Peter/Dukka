-- CreateEnum
CREATE TYPE "WarehouseStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN "status" "WarehouseStatus" NOT NULL DEFAULT 'OPEN';
