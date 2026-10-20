-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "Currency"("code");

-- Seed supported currencies
INSERT INTO "Currency" ("id", "code", "name", "is_active", "created_at", "updated_at")
VALUES
    ('019a0000-0000-7000-8000-000000000001', 'NGN', 'Nigerian Naira', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019a0000-0000-7000-8000-000000000002', 'GHS', 'Ghanaian Cedi', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "Market" ADD COLUMN "currency_id" TEXT;

-- Backfill known markets (1:1 with currency)
UPDATE "Market" AS m
SET "currency_id" = c."id"
FROM "Currency" AS c
WHERE m."code" = 'NG' AND c."code" = 'NGN';

UPDATE "Market" AS m
SET "currency_id" = c."id"
FROM "Currency" AS c
WHERE m."code" = 'GH' AND c."code" = 'GHS';

-- Remove markets that cannot be mapped 1:1 to a supported currency
DELETE FROM "Market" WHERE "currency_id" IS NULL;

ALTER TABLE "Market" ALTER COLUMN "currency_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Market_currency_id_key" ON "Market"("currency_id");

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
