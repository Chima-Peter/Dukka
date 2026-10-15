-- DropForeignKey
ALTER TABLE "StaffMarketAssignment" DROP CONSTRAINT IF EXISTS "StaffMarketAssignment_staff_id_fkey";
ALTER TABLE "StaffMarketAssignment" DROP CONSTRAINT IF EXISTS "StaffMarketAssignment_market_id_fkey";
ALTER TABLE "role_permissions_audit" DROP CONSTRAINT IF EXISTS "role_permissions_audit_role_id_fkey";
ALTER TABLE "role_permissions_audit" DROP CONSTRAINT IF EXISTS "role_permissions_audit_staff_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "StaffMarketAssignment";
DROP TABLE IF EXISTS "role_permissions_audit";

-- DropEnum
DROP TYPE IF EXISTS "RolePermissionAuditAction";

-- CreateEnum
CREATE TYPE "StaffAuditAction" AS ENUM (
  'STAFF_CREATED',
  'STAFF_DELETED',
  'ROLE_ASSIGNED',
  'ROLE_CHANGED',
  'MARKET_ASSIGNED',
  'MARKET_REMOVED',
  'PERMISSION_ASSIGNED',
  'PERMISSION_REMOVED'
);

-- CreateTable
CREATE TABLE "RoleMarket" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "role_id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,

    CONSTRAINT "RoleMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_audit" (
    "id" TEXT NOT NULL,
    "action" "StaffAuditAction" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staff_id" TEXT,
    "staff_name" TEXT,
    "performed_by_staff_id" TEXT NOT NULL,
    "performed_by_staff_name" TEXT NOT NULL,
    "role_id" TEXT,
    "role_name" TEXT,
    "previous_role_id" TEXT,
    "previous_role_name" TEXT,
    "market_id" TEXT,
    "market_name" TEXT,
    "permission_id" TEXT,
    "permission_name" TEXT,

    CONSTRAINT "staff_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoleMarket_market_id_idx" ON "RoleMarket"("market_id");

-- CreateIndex
CREATE UNIQUE INDEX "RoleMarket_role_id_market_id_key" ON "RoleMarket"("role_id", "market_id");

-- CreateIndex
CREATE INDEX "staff_audit_staff_id_idx" ON "staff_audit"("staff_id");

-- CreateIndex
CREATE INDEX "staff_audit_performed_by_staff_id_idx" ON "staff_audit"("performed_by_staff_id");

-- CreateIndex
CREATE INDEX "staff_audit_role_id_idx" ON "staff_audit"("role_id");

-- CreateIndex
CREATE INDEX "staff_audit_created_at_idx" ON "staff_audit"("created_at");

-- AddForeignKey
ALTER TABLE "RoleMarket" ADD CONSTRAINT "RoleMarket_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleMarket" ADD CONSTRAINT "RoleMarket_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
