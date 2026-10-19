-- CreateTable
CREATE TABLE "StaffToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "staffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffToken_token_key" ON "StaffToken"("token");

-- CreateIndex
CREATE INDEX "StaffToken_staffId_type_idx" ON "StaffToken"("staffId", "type");

-- AddForeignKey
ALTER TABLE "StaffToken" ADD CONSTRAINT "StaffToken_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
