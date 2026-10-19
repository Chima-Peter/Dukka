-- CreateEnum
CREATE TYPE "StaffInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "StaffInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone_number" TEXT,
    "token" TEXT NOT NULL,
    "status" "StaffInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "role_id" TEXT NOT NULL,
    "invited_by_staff_id" TEXT NOT NULL,
    "staff_id" TEXT,

    CONSTRAINT "StaffInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffInvitationMarket" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,

    CONSTRAINT "StaffInvitationMarket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvitation_token_key" ON "StaffInvitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvitation_staff_id_key" ON "StaffInvitation"("staff_id");

-- CreateIndex
CREATE INDEX "StaffInvitation_email_idx" ON "StaffInvitation"("email");

-- CreateIndex
CREATE INDEX "StaffInvitation_status_idx" ON "StaffInvitation"("status");

-- CreateIndex
CREATE INDEX "StaffInvitation_expires_at_idx" ON "StaffInvitation"("expires_at");

-- CreateIndex
CREATE INDEX "StaffInvitation_invited_by_staff_id_idx" ON "StaffInvitation"("invited_by_staff_id");

-- CreateIndex
CREATE INDEX "StaffInvitation_role_id_idx" ON "StaffInvitation"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvitation_email_pending_key" ON "StaffInvitation"("email") WHERE "status" = 'PENDING';

-- CreateIndex
CREATE INDEX "StaffInvitationMarket_market_id_idx" ON "StaffInvitationMarket"("market_id");

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvitationMarket_invitation_id_market_id_key" ON "StaffInvitationMarket"("invitation_id", "market_id");

-- AddForeignKey
ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_invited_by_staff_id_fkey" FOREIGN KEY ("invited_by_staff_id") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvitationMarket" ADD CONSTRAINT "StaffInvitationMarket_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "StaffInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvitationMarket" ADD CONSTRAINT "StaffInvitationMarket_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
