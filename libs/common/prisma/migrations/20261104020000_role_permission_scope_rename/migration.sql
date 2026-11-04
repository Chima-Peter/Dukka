-- AlterEnum StaffAuditAction
ALTER TYPE "StaffAuditAction" RENAME VALUE 'MARKET_ASSIGNED' TO 'SCOPE_ASSIGNED';
ALTER TYPE "StaffAuditAction" RENAME VALUE 'MARKET_REMOVED' TO 'SCOPE_REMOVED';

-- AlterTable Permission
ALTER TABLE "Permission" ADD COLUMN "scope_type" "ScopeType";

UPDATE "Permission" SET "scope_type" = 'MARKET' WHERE "scope_type" IS NULL;

ALTER TABLE "Permission" ALTER COLUMN "scope_type" SET NOT NULL;

CREATE INDEX "Permission_scope_type_idx" ON "Permission"("scope_type");

-- AlterTable Role
ALTER TABLE "Role" ADD COLUMN "scope_type" "ScopeType";

UPDATE "Role" SET "scope_type" = 'MARKET' WHERE "scope_type" IS NULL;

ALTER TABLE "Role" ALTER COLUMN "scope_type" SET NOT NULL;

CREATE INDEX "Role_scope_type_idx" ON "Role"("scope_type");

-- DropTable RoleMarket
DROP TABLE IF EXISTS "RoleMarket";

-- RenameTable StaffMarket -> StaffScope
ALTER TABLE "StaffMarket" RENAME TO "StaffScope";

ALTER TABLE "StaffScope" RENAME CONSTRAINT "StaffMarket_pkey" TO "StaffScope_pkey";
ALTER TABLE "StaffScope" RENAME CONSTRAINT "StaffMarket_staff_id_fkey" TO "StaffScope_staff_id_fkey";
ALTER TABLE "StaffScope" RENAME CONSTRAINT "StaffMarket_market_id_fkey" TO "StaffScope_market_id_fkey";
ALTER TABLE "StaffScope" RENAME CONSTRAINT "StaffMarket_warehouse_id_fkey" TO "StaffScope_warehouse_id_fkey";
ALTER TABLE "StaffScope" RENAME CONSTRAINT "StaffMarket_distribution_point_id_fkey" TO "StaffScope_distribution_point_id_fkey";
ALTER TABLE "StaffScope" RENAME CONSTRAINT "staff_market_scope_check" TO "staff_scope_scope_check";

ALTER INDEX "StaffMarket_market_id_idx" RENAME TO "StaffScope_market_id_idx";
ALTER INDEX "StaffMarket_warehouse_id_idx" RENAME TO "StaffScope_warehouse_id_idx";
ALTER INDEX "StaffMarket_distribution_point_id_idx" RENAME TO "StaffScope_distribution_point_id_idx";
ALTER INDEX "StaffMarket_staff_id_market_id_key" RENAME TO "StaffScope_staff_id_market_id_key";
ALTER INDEX "StaffMarket_staff_id_warehouse_id_key" RENAME TO "StaffScope_staff_id_warehouse_id_key";
ALTER INDEX "StaffMarket_staff_id_distribution_point_id_key" RENAME TO "StaffScope_staff_id_distribution_point_id_key";
ALTER INDEX "StaffMarket_staff_id_global_key" RENAME TO "StaffScope_staff_id_global_key";

CREATE INDEX "StaffScope_scope_type_idx" ON "StaffScope"("scope_type");

-- RenameTable StaffInvitationMarket -> StaffInvitationScope
ALTER TABLE "StaffInvitationMarket" RENAME TO "StaffInvitationScope";

ALTER TABLE "StaffInvitationScope" RENAME CONSTRAINT "StaffInvitationMarket_pkey" TO "StaffInvitationScope_pkey";
ALTER TABLE "StaffInvitationScope" RENAME CONSTRAINT "StaffInvitationMarket_invitation_id_fkey" TO "StaffInvitationScope_invitation_id_fkey";
ALTER TABLE "StaffInvitationScope" RENAME CONSTRAINT "StaffInvitationMarket_market_id_fkey" TO "StaffInvitationScope_market_id_fkey";
ALTER TABLE "StaffInvitationScope" RENAME CONSTRAINT "StaffInvitationMarket_warehouse_id_fkey" TO "StaffInvitationScope_warehouse_id_fkey";
ALTER TABLE "StaffInvitationScope" RENAME CONSTRAINT "StaffInvitationMarket_distribution_point_id_fkey" TO "StaffInvitationScope_distribution_point_id_fkey";
ALTER TABLE "StaffInvitationScope" RENAME CONSTRAINT "staff_invitation_market_scope_check" TO "staff_invitation_scope_scope_check";

ALTER INDEX "StaffInvitationMarket_market_id_idx" RENAME TO "StaffInvitationScope_market_id_idx";
ALTER INDEX "StaffInvitationMarket_warehouse_id_idx" RENAME TO "StaffInvitationScope_warehouse_id_idx";
ALTER INDEX "StaffInvitationMarket_distribution_point_id_idx" RENAME TO "StaffInvitationScope_distribution_point_id_idx";
ALTER INDEX "StaffInvitationMarket_invitation_id_market_id_key" RENAME TO "StaffInvitationScope_invitation_id_market_id_key";
ALTER INDEX "StaffInvitationMarket_invitation_id_warehouse_id_key" RENAME TO "StaffInvitationScope_invitation_id_warehouse_id_key";
ALTER INDEX "StaffInvitationMarket_invitation_id_distribution_point_id_key" RENAME TO "StaffInvitationScope_invitation_id_distribution_point_id_key";
ALTER INDEX "StaffInvitationMarket_invitation_id_global_key" RENAME TO "StaffInvitationScope_invitation_id_global_key";

CREATE INDEX "StaffInvitationScope_scope_type_idx" ON "StaffInvitationScope"("scope_type");
