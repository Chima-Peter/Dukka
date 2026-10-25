-- Rename enum and table Country → ServiceCountry
ALTER TYPE "CountryStatus" RENAME TO "ServiceCountryStatus";

ALTER TABLE "Country" RENAME TO "ServiceCountry";

ALTER INDEX "Country_pkey" RENAME TO "ServiceCountry_pkey";
ALTER INDEX "Country_code_key" RENAME TO "ServiceCountry_code_key";
ALTER INDEX "Country_market_id_idx" RENAME TO "ServiceCountry_market_id_idx";
ALTER INDEX "Country_status_idx" RENAME TO "ServiceCountry_status_idx";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'Country_id_status_idx'
  ) THEN
    ALTER INDEX "Country_id_status_idx" RENAME TO "ServiceCountry_id_status_idx";
  END IF;
END $$;

ALTER TABLE "ServiceCountry" RENAME CONSTRAINT "Country_market_id_fkey" TO "ServiceCountry_market_id_fkey";

ALTER TABLE "Warehouse" DROP CONSTRAINT IF EXISTS "Warehouse_country_id_fkey";
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "ServiceCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ServiceState" DROP CONSTRAINT IF EXISTS "ServiceState_country_id_fkey";
ALTER TABLE "ServiceState" ADD CONSTRAINT "ServiceState_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "ServiceCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ServiceCountry_id_status_idx" ON "ServiceCountry"("id", "status");

-- Rename staff permissions countries:* → service_countries:* (preserve role links)
UPDATE "Permission" SET "name" = 'service_countries:create', "description" = 'Create service countries', "updated_at" = CURRENT_TIMESTAMP
WHERE "name" = 'countries:create';
UPDATE "Permission" SET "name" = 'service_countries:update', "description" = 'Update service countries', "updated_at" = CURRENT_TIMESTAMP
WHERE "name" = 'countries:update';
UPDATE "Permission" SET "name" = 'service_countries:delete', "description" = 'Delete service countries', "updated_at" = CURRENT_TIMESTAMP
WHERE "name" = 'countries:delete';
UPDATE "Permission" SET "name" = 'service_countries:open', "description" = 'Open service countries', "updated_at" = CURRENT_TIMESTAMP
WHERE "name" = 'countries:open';
UPDATE "Permission" SET "name" = 'service_countries:close', "description" = 'Close service countries', "updated_at" = CURRENT_TIMESTAMP
WHERE "name" = 'countries:close';
UPDATE "Permission" SET "name" = 'service_countries:assign_market', "description" = 'Assign service countries to markets', "updated_at" = CURRENT_TIMESTAMP
WHERE "name" = 'countries:assign_market';
UPDATE "Permission" SET "name" = 'service_countries:remove_market', "description" = 'Remove service countries from markets', "updated_at" = CURRENT_TIMESTAMP
WHERE "name" = 'countries:remove_market';
