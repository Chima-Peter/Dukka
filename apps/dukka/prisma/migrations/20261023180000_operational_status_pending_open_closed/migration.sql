-- CountryStatus: PENDING_REVIEW/APPROVED/REJECTED -> PENDING/OPEN/CLOSED
ALTER TYPE "CountryStatus" RENAME TO "CountryStatus_old";
CREATE TYPE "CountryStatus" AS ENUM ('PENDING', 'OPEN', 'CLOSED');
ALTER TABLE "Country" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Country" ALTER COLUMN "status" TYPE "CountryStatus" USING (
  CASE "status"::text
    WHEN 'PENDING_REVIEW' THEN 'PENDING'::"CountryStatus"
    WHEN 'APPROVED' THEN 'OPEN'::"CountryStatus"
    WHEN 'REJECTED' THEN 'CLOSED'::"CountryStatus"
    ELSE 'PENDING'::"CountryStatus"
  END
);
ALTER TABLE "Country" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"CountryStatus";
DROP TYPE "CountryStatus_old";

-- WarehouseStatus: add PENDING, default PENDING
ALTER TYPE "WarehouseStatus" RENAME TO "WarehouseStatus_old";
CREATE TYPE "WarehouseStatus" AS ENUM ('PENDING', 'OPEN', 'CLOSED');
ALTER TABLE "Warehouse" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Warehouse" ALTER COLUMN "status" TYPE "WarehouseStatus" USING (
  CASE "status"::text
    WHEN 'OPEN' THEN 'OPEN'::"WarehouseStatus"
    WHEN 'CLOSED' THEN 'CLOSED'::"WarehouseStatus"
    ELSE 'PENDING'::"WarehouseStatus"
  END
);
ALTER TABLE "Warehouse" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"WarehouseStatus";
DROP TYPE "WarehouseStatus_old";
CREATE INDEX IF NOT EXISTS "Warehouse_status_idx" ON "Warehouse"("status");

-- Market: replace is_active with status
CREATE TYPE "MarketStatus" AS ENUM ('PENDING', 'OPEN', 'CLOSED');
ALTER TABLE "Market" ADD COLUMN "status" "MarketStatus";
UPDATE "Market" SET "status" = CASE
  WHEN "is_active" = true THEN 'OPEN'::"MarketStatus"
  ELSE 'CLOSED'::"MarketStatus"
END;
ALTER TABLE "Market" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Market" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"MarketStatus";
ALTER TABLE "Market" DROP COLUMN "is_active";
CREATE INDEX "Market_status_idx" ON "Market"("status");

-- ServiceState: add status (existing rows stay usable as OPEN)
CREATE TYPE "ServiceStateStatus" AS ENUM ('PENDING', 'OPEN', 'CLOSED');
ALTER TABLE "ServiceState" ADD COLUMN "status" "ServiceStateStatus" NOT NULL DEFAULT 'PENDING';
UPDATE "ServiceState" SET "status" = 'OPEN'::"ServiceStateStatus";
CREATE INDEX "ServiceState_status_idx" ON "ServiceState"("status");
