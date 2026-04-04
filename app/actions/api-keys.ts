"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbApiKeyCreate, dbApiKeyDelete, dbApiKeysList, dbUserFindInOrg } from "@/lib/data/repository";
import { hashApiKey } from "@/lib/api-key-verify";
import { requireOrgContext } from "@/lib/org-scope";
import { canAssignFolioWalletToApiKey, isOrganizationAdmin } from "@/lib/roles";

async function requireAdminOrg() {
  const ctx = await requireOrgContext();
  if (!isOrganizationAdmin(ctx.role)) {
    return { error: "Solo administradores pueden gestionar API keys." as const };
  }
  return { organizationId: ctx.organizationId };
}

const nameSchema = z.object({
  name: z.string().min(1).max(80),
  /** Ids de sesión demo u otros pueden no ser cuid; la pertenencia a la org se valida después. */
  ownerUserId: z.string().min(1).max(128),
});

export type ApiKeyCreateState = { ok: boolean; message?: string; plainKey?: string; prefix?: string };

export async function createApiKey(_prev: ApiKeyCreateState | null, formData: FormData): Promise<ApiKeyCreateState> {
  const admin = await requireAdminOrg();
  if ("error" in admin) return { ok: false, message: admin.error };

  const parsed = nameSchema.safeParse({
    name: formData.get("name"),
    ownerUserId: formData.get("ownerUserId"),
  });
  if (!parsed.success) return { ok: false, message: "Datos inválidos." };

  const walletUser = await dbUserFindInOrg(parsed.data.ownerUserId, admin.organizationId);
  if (!walletUser || !canAssignFolioWalletToApiKey(walletUser.role)) {
    return { ok: false, message: "Usuario de cartera no válido para esta organización." };
  }

  const secret = `juxa_${randomBytes(32).toString("base64url")}`;
  const keyPrefix = secret.slice(0, 12);
  const keyHash = hashApiKey(secret);

  await dbApiKeyCreate({
    organizationId: admin.organizationId,
    ownerUserId: parsed.data.ownerUserId,
    name: parsed.data.name.trim(),
    keyPrefix,
    keyHash,
  });

  revalidatePath("/configuracion/api-keys");
  return {
    ok: true,
    plainKey: secret,
    prefix: keyPrefix,
    message: "Copia la clave ahora; no se volverá a mostrar.",
  };
}

export type ApiKeyRevokeState = { ok: boolean; message?: string };

export async function revokeApiKey(_prev: ApiKeyRevokeState | null, formData: FormData): Promise<ApiKeyRevokeState> {
  const admin = await requireAdminOrg();
  if ("error" in admin) return { ok: false, message: admin.error };

  const rawId = formData.get("keyId");
  const id = typeof rawId === "string" ? rawId : "";
  if (!id) return { ok: false, message: "Clave inválida." };

  const ok = await dbApiKeyDelete(id, admin.organizationId);
  if (!ok) return { ok: false, message: "No se pudo revocar." };
  revalidatePath("/configuracion/api-keys");
  return { ok: true, message: "Clave revocada." };
}
