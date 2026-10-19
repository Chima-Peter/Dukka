-- CreateTable
CREATE TABLE "StaffMarket" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "staff_id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,

    CONSTRAINT "StaffMarket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffMarket_market_id_idx" ON "StaffMarket"("market_id");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMarket_staff_id_market_id_key" ON "StaffMarket"("staff_id", "market_id");

-- AddForeignKey
ALTER TABLE "StaffMarket" ADD CONSTRAINT "StaffMarket_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMarket" ADD CONSTRAINT "StaffMarket_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: copy role markets onto existing staff so JWT/scoping keep working
INSERT INTO "StaffMarket" ("id", "created_at", "updated_at", "staff_id", "market_id")
SELECT gen_random_uuid()::text, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, s."id", rm."market_id"
FROM "Staff" s
INNER JOIN "RoleMarket" rm ON rm."role_id" = s."role_id"
ON CONFLICT ("staff_id", "market_id") DO NOTHING;
