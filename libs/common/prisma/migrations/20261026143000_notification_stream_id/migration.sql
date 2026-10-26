-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "stream_id" TEXT;

-- CreateIndex
CREATE INDEX "Notification_customer_id_stream_id_idx" ON "Notification"("customer_id", "stream_id");

-- CreateIndex
CREATE INDEX "Notification_staff_id_stream_id_idx" ON "Notification"("staff_id", "stream_id");
