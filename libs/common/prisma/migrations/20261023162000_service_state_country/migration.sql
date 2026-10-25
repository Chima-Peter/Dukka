-- Create countries for markets that already have service states (1:1 backfill by market code)
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
    SELECT 1 FROM "ServiceState" ss WHERE ss."market_id" = m."id"
)
AND NOT EXISTS (
    SELECT 1 FROM "Country" c WHERE c."code" = m."code"
);

-- AlterTable
ALTER TABLE "ServiceState" ADD COLUMN "country_id" TEXT;

-- Backfill country_id from the market's country (prefer code match, else any country on that market)
UPDATE "ServiceState" ss
SET "country_id" = c."id"
FROM "Country" c
WHERE c."market_id" = ss."market_id"
  AND c."code" = (
      SELECT m."code" FROM "Market" m WHERE m."id" = ss."market_id"
  );

UPDATE "ServiceState" ss
SET "country_id" = c."id"
FROM "Country" c
WHERE ss."country_id" IS NULL
  AND c."market_id" = ss."market_id";

-- Fail loudly if any rows could not be backfilled
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "ServiceState" WHERE "country_id" IS NULL) THEN
        RAISE EXCEPTION 'ServiceState.country_id backfill failed: some rows have no matching Country';
    END IF;
END $$;

-- DropForeignKey
ALTER TABLE "ServiceState" DROP CONSTRAINT "ServiceState_market_id_fkey";

-- DropIndex
DROP INDEX "ServiceState_market_id_idx";

-- DropIndex
DROP INDEX "ServiceState_market_id_state_name_key";

-- AlterTable
ALTER TABLE "ServiceState" DROP COLUMN "market_id";

-- AlterTable
ALTER TABLE "ServiceState" ALTER COLUMN "country_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ServiceState_country_id_idx" ON "ServiceState"("country_id");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceState_country_id_state_name_key" ON "ServiceState"("country_id", "state_name");

-- AddForeignKey
ALTER TABLE "ServiceState" ADD CONSTRAINT "ServiceState_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
