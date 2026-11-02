-- AlterTable
ALTER TABLE "ShippingAddress" DROP CONSTRAINT "ShippingAddress_customer_id_fkey";
ALTER TABLE "ShippingAddress" ALTER COLUMN "customer_id" DROP NOT NULL;
ALTER TABLE "ShippingAddress" ADD CONSTRAINT "ShippingAddress_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ShippingAddress_email_idx" ON "ShippingAddress"("email");

-- AlterTable
ALTER TABLE "BillingAddress" DROP CONSTRAINT "BillingAddress_customer_id_fkey";
ALTER TABLE "BillingAddress" ALTER COLUMN "customer_id" DROP NOT NULL;
ALTER TABLE "BillingAddress" ADD CONSTRAINT "BillingAddress_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "BillingAddress_email_idx" ON "BillingAddress"("email");
