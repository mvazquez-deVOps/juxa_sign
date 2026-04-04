-- CreateEnum
CREATE TYPE "FolioLedgerReason" AS ENUM ('SUPERADMIN_GRANT', 'PURCHASE', 'SEND_STANDARD', 'SEND_PREMIUM', 'ADMIN_TRANSFER', 'ADJUSTMENT');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'USER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "folioBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FolioPack" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "folioAmount" INTEGER NOT NULL,
    "priceMxn" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FolioPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolioLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" "FolioLedgerReason" NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,

    CONSTRAINT "FolioLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FolioPack_slug_key" ON "FolioPack"("slug");

-- CreateIndex
CREATE INDEX "FolioLedgerEntry_userId_createdAt_idx" ON "FolioLedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FolioLedgerEntry_organizationId_createdAt_idx" ON "FolioLedgerEntry"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "FolioLedgerEntry" ADD CONSTRAINT "FolioLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolioLedgerEntry" ADD CONSTRAINT "FolioLedgerEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolioLedgerEntry" ADD CONSTRAINT "FolioLedgerEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
