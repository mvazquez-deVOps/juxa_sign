-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPERADMIN';

-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN     "maxMonthlySends" INTEGER,
ADD COLUMN     "folioPremiumEnabled" BOOLEAN NOT NULL DEFAULT false;
