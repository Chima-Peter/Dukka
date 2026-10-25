-- CreateEnum
CREATE TYPE "CountryStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CountryStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "market_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE INDEX "Country_market_id_idx" ON "Country"("market_id");

-- CreateIndex
CREATE INDEX "Country_status_idx" ON "Country"("status");

-- AddForeignKey
ALTER TABLE "Country" ADD CONSTRAINT "Country_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
