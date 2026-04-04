-- AlterEnum
ALTER TYPE "FolioLedgerReason" ADD VALUE 'TRIAL_GRANT';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
