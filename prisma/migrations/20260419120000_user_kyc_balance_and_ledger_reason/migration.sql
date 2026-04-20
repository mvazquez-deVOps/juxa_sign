-- Créditos KYC por usuario + razón de ledger para validaciones KYC.

ALTER TABLE "User" ADD COLUMN "kycBalance" INTEGER NOT NULL DEFAULT 0;

ALTER TYPE "FolioLedgerReason" ADD VALUE 'KYC_VALIDATION';
