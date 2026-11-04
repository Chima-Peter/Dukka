-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('GLOBAL', 'MARKET', 'WAREHOUSE', 'DISTRIBUTION_POINT');

-- AlterTable StaffInvitationMarket
ALTER TABLE "StaffInvitationMarket" ADD COLUMN "scope_type" "ScopeType",
ADD COLUMN "warehouse_id" TEXT,
ADD COLUMN "distribution_point_id" TEXT;

UPDATE "StaffInvitationMarket" SET "scope_type" = 'MARKET' WHERE "scope_type" IS NULL;

ALTER TABLE "StaffInvitationMarket" ALTER COLUMN "scope_type" SET NOT NULL;
ALTER TABLE "StaffInvitationMarket" ALTER COLUMN "market_id" DROP NOT NULL;

-- AlterTable StaffMarket
ALTER TABLE "StaffMarket" ADD COLUMN "scope_type" "ScopeType",
ADD COLUMN "warehouse_id" TEXT,
ADD COLUMN "distribution_point_id" TEXT;

UPDATE "StaffMarket" SET "scope_type" = 'MARKET' WHERE "scope_type" IS NULL;

ALTER TABLE "StaffMarket" ALTER COLUMN "scope_type" SET NOT NULL;
ALTER TABLE "StaffMarket" ALTER COLUMN "market_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "StaffInvitationMarket_warehouse_id_idx" ON "StaffInvitationMarket"("warehouse_id");

CREATE INDEX "StaffInvitationMarket_distribution_point_id_idx" ON "StaffInvitationMarket"("distribution_point_id");

CREATE UNIQUE INDEX "StaffInvitationMarket_invitation_id_warehouse_id_key" ON "StaffInvitationMarket"("invitation_id", "warehouse_id");

CREATE UNIQUE INDEX "StaffInvitationMarket_invitation_id_distribution_point_id_key" ON "StaffInvitationMarket"("invitation_id", "distribution_point_id");

CREATE UNIQUE INDEX "StaffInvitationMarket_invitation_id_global_key" ON "StaffInvitationMarket"("invitation_id") WHERE "scope_type" = 'GLOBAL';

CREATE INDEX "StaffMarket_warehouse_id_idx" ON "StaffMarket"("warehouse_id");

CREATE INDEX "StaffMarket_distribution_point_id_idx" ON "StaffMarket"("distribution_point_id");

CREATE UNIQUE INDEX "StaffMarket_staff_id_warehouse_id_key" ON "StaffMarket"("staff_id", "warehouse_id");

CREATE UNIQUE INDEX "StaffMarket_staff_id_distribution_point_id_key" ON "StaffMarket"("staff_id", "distribution_point_id");

CREATE UNIQUE INDEX "StaffMarket_staff_id_global_key" ON "StaffMarket"("staff_id") WHERE "scope_type" = 'GLOBAL';

-- AddForeignKey
ALTER TABLE "StaffInvitationMarket" ADD CONSTRAINT "StaffInvitationMarket_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StaffInvitationMarket" ADD CONSTRAINT "StaffInvitationMarket_distribution_point_id_fkey" FOREIGN KEY ("distribution_point_id") REFERENCES "DistributionPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StaffMarket" ADD CONSTRAINT "StaffMarket_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StaffMarket" ADD CONSTRAINT "StaffMarket_distribution_point_id_fkey" FOREIGN KEY ("distribution_point_id") REFERENCES "DistributionPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraint
ALTER TABLE "StaffInvitationMarket" ADD CONSTRAINT "staff_invitation_market_scope_check" CHECK (
  (
    "scope_type" = 'GLOBAL'::"ScopeType"
    AND "market_id" IS NULL
    AND "warehouse_id" IS NULL
    AND "distribution_point_id" IS NULL
  )
  OR (
    "scope_type" = 'MARKET'::"ScopeType"
    AND "market_id" IS NOT NULL
    AND "warehouse_id" IS NULL
    AND "distribution_point_id" IS NULL
  )
  OR (
    "scope_type" = 'WAREHOUSE'::"ScopeType"
    AND "market_id" IS NOT NULL
    AND "warehouse_id" IS NOT NULL
    AND "distribution_point_id" IS NULL
  )
  OR (
    "scope_type" = 'DISTRIBUTION_POINT'::"ScopeType"
    AND "market_id" IS NOT NULL
    AND "distribution_point_id" IS NOT NULL
    AND "warehouse_id" IS NULL
  )
);

ALTER TABLE "StaffMarket" ADD CONSTRAINT "staff_market_scope_check" CHECK (
  (
    "scope_type" = 'GLOBAL'::"ScopeType"
    AND "market_id" IS NULL
    AND "warehouse_id" IS NULL
    AND "distribution_point_id" IS NULL
  )
  OR (
    "scope_type" = 'MARKET'::"ScopeType"
    AND "market_id" IS NOT NULL
    AND "warehouse_id" IS NULL
    AND "distribution_point_id" IS NULL
  )
  OR (
    "scope_type" = 'WAREHOUSE'::"ScopeType"
    AND "market_id" IS NOT NULL
    AND "warehouse_id" IS NOT NULL
    AND "distribution_point_id" IS NULL
  )
  OR (
    "scope_type" = 'DISTRIBUTION_POINT'::"ScopeType"
    AND "market_id" IS NOT NULL
    AND "distribution_point_id" IS NOT NULL
    AND "warehouse_id" IS NULL
  )
);
