-- Unificar roles legacy OPERATOR / SANDBOX → USER y reducir enum a 4 valores.

UPDATE "User" SET "role" = 'USER' WHERE "role" IN ('OPERATOR', 'SANDBOX');
UPDATE "OrganizationInvite" SET "role" = 'USER' WHERE "role" IN ('OPERATOR', 'SANDBOX');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "OrganizationInvite" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT USING ("role"::text);
ALTER TABLE "OrganizationInvite" ALTER COLUMN "role" TYPE TEXT USING ("role"::text);

DROP TYPE "UserRole";

CREATE TYPE "UserRole" AS ENUM ('VIEWER', 'USER', 'ADMIN', 'SUPERADMIN');

ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::"UserRole");
ALTER TABLE "OrganizationInvite" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::"UserRole");

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER'::"UserRole";
ALTER TABLE "OrganizationInvite" ALTER COLUMN "role" SET DEFAULT 'USER'::"UserRole";
