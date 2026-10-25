-- AlterEnum
ALTER TYPE "TokenType" ADD VALUE 'REFRESH';

-- AlterTable
ALTER TABLE "Token" ADD COLUMN "blacklisted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StaffToken" ADD COLUMN "blacklisted" BOOLEAN NOT NULL DEFAULT false;
