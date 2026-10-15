/*
  Warnings:

  - Added the required column `changed_by` to the `role_permissions_audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `new_role` to the `role_permissions_audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `previous_role` to the `role_permissions_audit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "role_permissions_audit" ADD COLUMN     "changed_by" TEXT NOT NULL,
ADD COLUMN     "new_role" TEXT NOT NULL,
ADD COLUMN     "previous_role" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "role_permissions_audit_changed_by_idx" ON "role_permissions_audit"("changed_by");
