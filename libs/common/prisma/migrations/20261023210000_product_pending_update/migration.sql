-- CreateEnum
CREATE TYPE "ProductPendingUpdateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ProductPendingUpdate" (
    "id" TEXT NOT NULL,
    "status" "ProductPendingUpdateStatus" NOT NULL DEFAULT 'PENDING',
    "name" TEXT,
    "description" TEXT,
    "specs" JSONB,
    "market_category_id" TEXT,
    "images" JSONB,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPendingUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductPendingUpdate_status_idx" ON "ProductPendingUpdate"("status");

-- CreateIndex
CREATE INDEX "ProductPendingUpdate_created_at_idx" ON "ProductPendingUpdate"("created_at");

-- CreateIndex
CREATE INDEX "ProductPendingUpdate_product_id_status_idx" ON "ProductPendingUpdate"("product_id", "status");

-- AddForeignKey
ALTER TABLE "ProductPendingUpdate" ADD CONSTRAINT "ProductPendingUpdate_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
