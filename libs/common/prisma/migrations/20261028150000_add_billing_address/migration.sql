-- CreateTable
CREATE TABLE "BillingAddress" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "whatsapp_number" TEXT,
    "country" TEXT NOT NULL,
    "street_address" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "customer_id" TEXT NOT NULL,

    CONSTRAINT "BillingAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingAddress_email_key" ON "BillingAddress"("email");

-- CreateIndex
CREATE INDEX "BillingAddress_customer_id_idx" ON "BillingAddress"("customer_id");

-- CreateIndex
CREATE INDEX "BillingAddress_market_id_idx" ON "BillingAddress"("market_id");

-- CreateIndex
CREATE INDEX "BillingAddress_state_idx" ON "BillingAddress"("state");

-- AddForeignKey
ALTER TABLE "BillingAddress" ADD CONSTRAINT "BillingAddress_state_fkey" FOREIGN KEY ("state") REFERENCES "ServiceState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingAddress" ADD CONSTRAINT "BillingAddress_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingAddress" ADD CONSTRAINT "BillingAddress_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
