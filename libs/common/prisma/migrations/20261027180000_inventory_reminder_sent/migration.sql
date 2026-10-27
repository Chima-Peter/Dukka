-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN "reminder_sent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN "reminder_sent_at" TIMESTAMP(3);
