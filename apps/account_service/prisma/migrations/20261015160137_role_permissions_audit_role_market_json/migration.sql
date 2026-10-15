/*
  Warnings:

  - Changed the type of `new_role` on the `role_permissions_audit` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `previous_role` on the `role_permissions_audit` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "role_permissions_audit" DROP COLUMN "new_role",
ADD COLUMN     "new_role" JSONB NOT NULL,
DROP COLUMN "previous_role",
ADD COLUMN     "previous_role" JSONB NOT NULL;
