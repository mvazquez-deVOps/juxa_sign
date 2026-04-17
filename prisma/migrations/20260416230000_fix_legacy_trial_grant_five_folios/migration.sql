-- Política actual: regalo de alta = 1 folio (antes 5). Corrige carteras y libro mayor existentes.
-- Asume filas TRIAL_GRANT con delta = 5; no afecta altas nuevas (delta = 1).

CREATE TEMP TABLE "_trial_grant_legacy_five" ON COMMIT DROP AS
SELECT "id", "userId", "createdAt"
FROM "FolioLedgerEntry"
WHERE "reason" = 'TRIAL_GRANT' AND "delta" = 5;

UPDATE "User" u
SET "folioBalance" = GREATEST(
  0,
  u."folioBalance" - 4 * COALESCE(c."n", 0)
)
FROM (
  SELECT "userId", COUNT(*)::int AS "n"
  FROM "_trial_grant_legacy_five"
  GROUP BY "userId"
) c
WHERE u."id" = c."userId";

UPDATE "FolioLedgerEntry" e
SET
  "delta" = 1,
  "balanceAfter" = e."balanceAfter" - 4
WHERE e."id" IN (SELECT "id" FROM "_trial_grant_legacy_five");

UPDATE "FolioLedgerEntry" e
SET "balanceAfter" = e."balanceAfter" - 4 * (
  SELECT COUNT(*)::int
  FROM "_trial_grant_legacy_five" t
  WHERE t."userId" = e."userId" AND t."createdAt" < e."createdAt"
);
