-- Ensure every warehouse market has a matching country for backfill
INSERT INTO "Country" ("id", "code", "name", "status", "market_id", "created_at", "updated_at")
SELECT gen_random_uuid()::text,
       m."code",
       m."name",
       'APPROVED'::"CountryStatus",
       m."id",
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "Market" m
WHERE EXISTS (
    SELECT 1 FROM "Warehouse" w WHERE w."market_id" = m."id"
)
AND NOT EXISTS (
    SELECT 1 FROM "Country" c WHERE c."code" = m."code"
);

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN "country_id" TEXT;

-- Backfill country_id (prefer country whose code matches the market code)
UPDATE "Warehouse" w
SET "country_id" = c."id"
FROM "Country" c
WHERE c."market_id" = w."market_id"
  AND c."code" = (
      SELECT m."code" FROM "Market" m WHERE m."id" = w."market_id"
  );

UPDATE "Warehouse" w
SET "country_id" = c."id"
FROM "Country" c
WHERE w."country_id" IS NULL
  AND c."market_id" = w."market_id";

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Warehouse" WHERE "country_id" IS NULL) THEN
        RAISE EXCEPTION 'Warehouse.country_id backfill failed: some rows have no matching Country';
    END IF;
END $$;

-- DropForeignKey
ALTER TABLE "Warehouse" DROP CONSTRAINT "Warehouse_market_id_fkey";

-- AlterTable
ALTER TABLE "Warehouse" DROP COLUMN "market_id";

-- AlterTable
ALTER TABLE "Warehouse" ALTER COLUMN "country_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Warehouse_country_id_idx" ON "Warehouse"("country_id");

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
