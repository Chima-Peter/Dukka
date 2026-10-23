-- AlterTable
ALTER TABLE "ShippingAddress" ADD COLUMN "country" TEXT;
ALTER TABLE "ShippingAddress" ADD COLUMN "market_id" TEXT;
ALTER TABLE "ShippingAddress" ADD COLUMN "state" TEXT;

-- Backfill from ServiceState matching state_province to state_name
UPDATE "ShippingAddress" AS sa
SET
    "state" = ss.id,
    "market_id" = ss.market_id,
    "country" = CASE m.code
        WHEN 'NG' THEN 'Nigeria'
        WHEN 'GH' THEN 'Ghana'
        ELSE m.name
    END
FROM "ServiceState" AS ss
INNER JOIN "Market" AS m ON m.id = ss.market_id
WHERE sa."state_province" = ss.state_name;

-- Remove rows that could not be mapped
DELETE FROM "ShippingAddress" WHERE "state" IS NULL OR "market_id" IS NULL OR "country" IS NULL;

-- AlterTable
ALTER TABLE "ShippingAddress" ALTER COLUMN "country" SET NOT NULL;
ALTER TABLE "ShippingAddress" ALTER COLUMN "market_id" SET NOT NULL;
ALTER TABLE "ShippingAddress" ALTER COLUMN "state" SET NOT NULL;

-- AlterTable
ALTER TABLE "ShippingAddress" DROP COLUMN "state_province";

-- CreateIndex
CREATE INDEX "ShippingAddress_customer_id_idx" ON "ShippingAddress"("customer_id");

-- CreateIndex
CREATE INDEX "ShippingAddress_market_id_idx" ON "ShippingAddress"("market_id");

-- CreateIndex
CREATE INDEX "ShippingAddress_state_idx" ON "ShippingAddress"("state");

-- AddForeignKey
ALTER TABLE "ShippingAddress" ADD CONSTRAINT "ShippingAddress_state_fkey" FOREIGN KEY ("state") REFERENCES "ServiceState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingAddress" ADD CONSTRAINT "ShippingAddress_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
