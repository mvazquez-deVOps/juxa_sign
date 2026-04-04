-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN "ownerUserId" TEXT;

-- Backfill: earliest ADMIN per organization
UPDATE "ApiKey" AS k
SET "ownerUserId" = sub."userId"
FROM (
  SELECT DISTINCT ON (k2."id") k2."id" AS "keyId", u."id" AS "userId"
  FROM "ApiKey" k2
  INNER JOIN "User" u ON u."organizationId" = k2."organizationId" AND u.role = 'ADMIN'
  ORDER BY k2."id", u."createdAt" ASC
) AS sub
WHERE k."id" = sub."keyId";

-- Fallback: any user in the same org
UPDATE "ApiKey" AS k
SET "ownerUserId" = sub."userId"
FROM (
  SELECT DISTINCT ON (k2."id") k2."id" AS "keyId", u."id" AS "userId"
  FROM "ApiKey" k2
  INNER JOIN "User" u ON u."organizationId" = k2."organizationId"
  ORDER BY k2."id", u."createdAt" ASC
) AS sub
WHERE k."id" = sub."keyId" AND k."ownerUserId" IS NULL;

-- Orphan keys (sin usuarios en la org) no pueden cumplir NOT NULL
DELETE FROM "ApiKey" WHERE "ownerUserId" IS NULL;

ALTER TABLE "ApiKey" ALTER COLUMN "ownerUserId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ApiKey_ownerUserId_idx" ON "ApiKey"("ownerUserId");
