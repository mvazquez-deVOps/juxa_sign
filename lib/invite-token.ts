import { createHash, randomBytes } from "node:crypto";

export function hashInviteToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

/** Token opaco para URL (sin guardar en claro en BD). */
export function generateRawInviteToken(): string {
  return randomBytes(24).toString("base64url");
}
