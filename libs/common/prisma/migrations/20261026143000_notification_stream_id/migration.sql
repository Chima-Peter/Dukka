-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER', 'PROMO', 'SYSTEM', 'POINTS', 'MARKET', 'LOGISTICS');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "text" TEXT NOT NULL,
    "has_read" BOOLEAN NOT NULL DEFAULT false,
    "stream_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "read_at" TIMESTAMP(3),
    "customer_id" TEXT,
    "staff_id" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_customer_id_idx" ON "Notification"("customer_id");

-- CreateIndex
CREATE INDEX "Notification_staff_id_idx" ON "Notification"("staff_id");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_has_read_idx" ON "Notification"("has_read");

-- CreateIndex
CREATE INDEX "Notification_created_at_idx" ON "Notification"("created_at");

-- CreateIndex
CREATE INDEX "Notification_customer_id_stream_id_idx" ON "Notification"("customer_id", "stream_id");

-- CreateIndex
CREATE INDEX "Notification_staff_id_stream_id_idx" ON "Notification"("staff_id", "stream_id");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
