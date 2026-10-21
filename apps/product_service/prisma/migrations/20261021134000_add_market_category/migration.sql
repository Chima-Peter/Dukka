-- CreateTable
CREATE TABLE "MarketCategory" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketCategory_market_id_category_id_key" ON "MarketCategory"("market_id", "category_id");

-- AddForeignKey
ALTER TABLE "MarketCategory" ADD CONSTRAINT "MarketCategory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed MarketCategory for every Category × known market (from Warehouse / MarketVariant).
INSERT INTO "MarketCategory" ("id", "market_id", "category_id", "created_at", "updated_at")
SELECT
    gen_random_uuid()::text,
    markets.market_id,
    c.id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Category" c
CROSS JOIN (
    SELECT DISTINCT "market_id" FROM "Warehouse"
    UNION
    SELECT DISTINCT "market_id" FROM "MarketVariant"
) AS markets("market_id");

-- AlterProduct: point at MarketCategory
ALTER TABLE "Product" ADD COLUMN "market_category_id" TEXT;

UPDATE "Product" p
SET "market_category_id" = (
    SELECT mc.id
    FROM "MarketCategory" mc
    WHERE mc.category_id = p.category_id
    ORDER BY
        CASE
            WHEN mc.market_id = (
                SELECT mv.market_id
                FROM "MarketVariant" mv
                INNER JOIN "Variant" v ON v.id = mv.variant_id
                WHERE v.product_id = p.id
                ORDER BY mv.created_at ASC
                LIMIT 1
            ) THEN 0
            ELSE 1
        END,
        mc.created_at ASC
    LIMIT 1
);

-- Fallback for products with no matching market category yet
UPDATE "Product" p
SET "market_category_id" = (
    SELECT mc.id
    FROM "MarketCategory" mc
    WHERE mc.category_id = p.category_id
    ORDER BY mc.created_at ASC
    LIMIT 1
)
WHERE p.market_category_id IS NULL;

ALTER TABLE "Product" ALTER COLUMN "market_category_id" SET NOT NULL;

ALTER TABLE "Product" DROP CONSTRAINT "Product_category_id_fkey";
ALTER TABLE "Product" DROP COLUMN "category_id";

ALTER TABLE "Product" ADD CONSTRAINT "Product_market_category_id_fkey" FOREIGN KEY ("market_category_id") REFERENCES "MarketCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
