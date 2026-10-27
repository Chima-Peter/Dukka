-- AlterTable
ALTER TABLE "Reviews" ADD COLUMN "customer_name" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Reviews" ALTER COLUMN "customer_name" DROP DEFAULT;

-- DropForeignKey
ALTER TABLE "Reviews" DROP CONSTRAINT "Reviews_customer_id_fkey";

-- AlterTable
ALTER TABLE "Reviews" ALTER COLUMN "customer_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
