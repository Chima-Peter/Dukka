-- Move ISO codes from ServiceCountry onto Market, point Warehouse/ServiceState
-- at Market, then drop ServiceCountry (schema change from country→market refactor).

-- AlterTable Market: add iso2/iso3
ALTER TABLE "Market" ADD COLUMN "iso2" CHAR(2);
ALTER TABLE "Market" ADD COLUMN "iso3" CHAR(3);

-- Backfill from linked ServiceCountry when present
UPDATE "Market" m
SET
    "iso2" = sc."iso2",
    "iso3" = sc."iso3"
FROM "ServiceCountry" sc
WHERE sc."market_id" = m."id"
  AND m."iso2" IS NULL;

-- Fallback for markets without a ServiceCountry row
UPDATE "Market"
SET
    "iso2" = CASE TRIM("code")
        WHEN 'NG' THEN 'NG'
        WHEN 'GH' THEN 'GH'
        ELSE LEFT(RPAD(TRIM("code"), 2, 'X'), 2)
    END,
    "iso3" = CASE TRIM("code")
        WHEN 'NG' THEN 'NGA'
        WHEN 'GH' THEN 'GHA'
        ELSE RPAD(TRIM("code"), 3, 'X')
    END
WHERE "iso2" IS NULL OR "iso3" IS NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Market" WHERE "iso2" IS NULL OR "iso3" IS NULL) THEN
        RAISE EXCEPTION 'Market iso2/iso3 backfill failed: some rows are still null';
    END IF;
END $$;

ALTER TABLE "Market" ALTER COLUMN "iso2" SET NOT NULL;
ALTER TABLE "Market" ALTER COLUMN "iso3" SET NOT NULL;

CREATE UNIQUE INDEX "Market_iso2_key" ON "Market"("iso2");
CREATE UNIQUE INDEX "Market_iso3_key" ON "Market"("iso3");

-- AlterTable Warehouse: country_id → market_id
ALTER TABLE "Warehouse" ADD COLUMN "market_id" TEXT;

UPDATE "Warehouse" w
SET "market_id" = sc."market_id"
FROM "ServiceCountry" sc
WHERE sc."id" = w."country_id";

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Warehouse" WHERE "market_id" IS NULL) THEN
        RAISE EXCEPTION 'Warehouse.market_id backfill failed: some rows have no matching ServiceCountry.market_id';
    END IF;
END $$;

ALTER TABLE "Warehouse" DROP CONSTRAINT "Warehouse_country_id_fkey";
DROP INDEX "Warehouse_country_id_idx";
ALTER TABLE "Warehouse" DROP COLUMN "country_id";

ALTER TABLE "Warehouse" ALTER COLUMN "market_id" SET NOT NULL;
CREATE INDEX "Warehouse_market_id_idx" ON "Warehouse"("market_id");
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable ServiceState: country_id → market_id
ALTER TABLE "ServiceState" ADD COLUMN "market_id" TEXT;

UPDATE "ServiceState" ss
SET "market_id" = sc."market_id"
FROM "ServiceCountry" sc
WHERE sc."id" = ss."country_id";

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "ServiceState" WHERE "market_id" IS NULL) THEN
        RAISE EXCEPTION 'ServiceState.market_id backfill failed: some rows have no matching ServiceCountry.market_id';
    END IF;
END $$;

ALTER TABLE "ServiceState" DROP CONSTRAINT "ServiceState_country_id_fkey";
DROP INDEX "ServiceState_country_id_idx";
DROP INDEX "ServiceState_country_id_state_name_key";
ALTER TABLE "ServiceState" DROP COLUMN "country_id";

ALTER TABLE "ServiceState" ALTER COLUMN "market_id" SET NOT NULL;
CREATE INDEX "ServiceState_market_id_idx" ON "ServiceState"("market_id");
CREATE UNIQUE INDEX "ServiceState_market_id_state_name_key" ON "ServiceState"("market_id", "state_name");
ALTER TABLE "ServiceState" ADD CONSTRAINT "ServiceState_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropTable ServiceCountry
DROP TABLE "ServiceCountry";

-- DropEnum
DROP TYPE "ServiceCountryStatus";
