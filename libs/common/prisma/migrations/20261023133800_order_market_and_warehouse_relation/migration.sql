-- AlterTable
ALTER TABLE "Order" ADD COLUMN "market_id" TEXT;
ALTER TABLE "Order" ADD COLUMN "warehouse_id" TEXT;

-- Backfill market from shipping_address JSON when present
UPDATE "Order"
SET "market_id" = "shipping_address"->>'market_id'
WHERE "market_id" IS NULL
  AND "shipping_address" ? 'market_id'
  AND COALESCE("shipping_address"->>'market_id', '') <> '';

-- Backfill warehouse from the first order inventory when present
UPDATE "Order" o
SET "warehouse_id" = oi."warehouse_id"
FROM (
    SELECT DISTINCT ON ("order_id") "order_id", "warehouse_id"
    FROM "OrderInventory"
    ORDER BY "order_id", "created_at" ASC
) oi
WHERE o."id" = oi."order_id"
  AND o."warehouse_id" IS NULL;

-- Drop rows that still cannot resolve market or warehouse
DELETE FROM "Order"
WHERE "market_id" IS NULL
   OR "warehouse_id" IS NULL
   OR NOT EXISTS (
        SELECT 1 FROM "Market" WHERE "Market"."id" = "Order"."market_id"
   )
   OR NOT EXISTS (
        SELECT 1 FROM "Warehouse" WHERE "Warehouse"."id" = "Order"."warehouse_id"
   );

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "market_id" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "warehouse_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Order_market_id_idx" ON "Order"("market_id");

-- CreateIndex
CREATE INDEX "Order_warehouse_id_idx" ON "Order"("warehouse_id");

-- CreateIndex
CREATE INDEX "Order_customer_id_idx" ON "Order"("customer_id");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
