-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "reminder_sent",
DROP COLUMN "reminder_sent_at",
ADD COLUMN "low_stock_reminder_sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "low_stock_reminder_sent_at" TIMESTAMP(3),
ADD COLUMN "finished_reminder_sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "finished_reminder_sent_at" TIMESTAMP(3);
