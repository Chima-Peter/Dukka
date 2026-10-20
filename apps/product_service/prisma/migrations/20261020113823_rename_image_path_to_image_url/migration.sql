-- Rename ProductImage.image_path -> image_url
ALTER TABLE "ProductImage" RENAME COLUMN "image_path" TO "image_url";

-- Add VariantImage.image_url
ALTER TABLE "VariantImage" ADD COLUMN "image_url" TEXT;
UPDATE "VariantImage" SET "image_url" = '' WHERE "image_url" IS NULL;
ALTER TABLE "VariantImage" ALTER COLUMN "image_url" SET NOT NULL;
