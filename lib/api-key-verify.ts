import { createHash } from "node:crypto";
import { dbApiKeyFindByHash, dbApiKeyTouchUsed, type ApiKeyAuthContext } from "@/lib/data/repository";

export function hashApiKey(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

function extractApiKeyToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return req.headers.get("x-api-key")?.trim() ?? null;
}

/**
 * Resuelve organización y usuario de cartera desde `Authorization: Bearer juxa_...` o `X-Api-Key`.
 */
export async function resolveApiKeyContext(req: Request): Promise<ApiKeyAuthContext | null> {
  const token = extractApiKeyToken(req);
  if (!token || !token.startsWith("juxa_")) return null;

  const keyHash = hashApiKey(token);
  const row = await dbApiKeyFindByHash(keyHash);
  if (!row) return null;
  void dbApiKeyTouchUsed(keyHash);
  return row;
}

/** Solo la organización; usa `resolveApiKeyContext` si necesitas el dueño de cartera. */
export async function resolveOrganizationIdFromApiKey(req: Request): Promise<string | null> {
  const ctx = await resolveApiKeyContext(req);
  return ctx?.organizationId ?? null;
}
