/*
  Warnings:

  - You are about to drop the column `changed_by` on the `role_permissions_audit` table. All the data in the column will be lost.
  - You are about to drop the column `new_role` on the `role_permissions_audit` table. All the data in the column will be lost.
  - You are about to drop the column `previous_role` on the `role_permissions_audit` table. All the data in the column will be lost.
  - Added the required column `staff_id` to the `role_permissions_audit` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "role_permissions_audit_changed_by_idx";

-- AlterTable
ALTER TABLE "role_permissions_audit" DROP COLUMN "changed_by",
DROP COLUMN "new_role",
DROP COLUMN "previous_role",
ADD COLUMN     "staff_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "role_permissions_audit_staff_id_idx" ON "role_permissions_audit"("staff_id");

-- AddForeignKey
ALTER TABLE "role_permissions_audit" ADD CONSTRAINT "role_permissions_audit_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
