-- AlterTable
ALTER TABLE "Order" ADD COLUMN "delivered_at" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "review_reminder_sent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "review_reminder_sent_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_status_review_reminder_sent_delivered_at_idx" ON "Order"("status", "review_reminder_sent", "delivered_at");
