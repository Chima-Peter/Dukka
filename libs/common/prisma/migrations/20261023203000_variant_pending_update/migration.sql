-- CreateEnum
CREATE TYPE "VariantPendingUpdateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "VariantPendingUpdate" (
    "id" TEXT NOT NULL,
    "status" "VariantPendingUpdateStatus" NOT NULL DEFAULT 'PENDING',
    "variant_code" TEXT,
    "color" TEXT,
    "size" TEXT,
    "variant_info" JSONB,
    "image_url" TEXT,
    "variant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariantPendingUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VariantPendingUpdate_status_idx" ON "VariantPendingUpdate"("status");

-- CreateIndex
CREATE INDEX "VariantPendingUpdate_created_at_idx" ON "VariantPendingUpdate"("created_at");

-- CreateIndex
CREATE INDEX "VariantPendingUpdate_variant_id_status_idx" ON "VariantPendingUpdate"("variant_id", "status");

-- AddForeignKey
ALTER TABLE "VariantPendingUpdate" ADD CONSTRAINT "VariantPendingUpdate_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
