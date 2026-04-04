"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  dbFolioGrantCredits,
  dbFolioPackCreate,
  dbFolioPackDelete,
  dbFolioPackUpdate,
  dbSuperAdminUsersSearch,
} from "@/lib/data/repository";
import { requireSuperAdmin } from "@/lib/superadmin";

export type SuperadminFolioGrantState = { ok: boolean; message?: string };

export async function superadminFolioGrant(
  _prev: SuperadminFolioGrantState | null,
  formData: FormData,
): Promise<SuperadminFolioGrantState> {
  const { userId: actorId } = await requireSuperAdmin();
  const userIdRaw = formData.get("userId");
  const userId = typeof userIdRaw === "string" ? userIdRaw.trim() : "";
  const deltaField = formData.get("delta");
  const deltaRaw = typeof deltaField === "string" ? deltaField.trim() : "";
  const delta = Number(deltaRaw);
  if (!userId || !Number.isInteger(delta) || delta < 1 || delta > 1_000_000) {
    return { ok: false, message: "Usuario y cantidad de folios inválidos (entero 1–1 000 000)." };
  }
  const r = await dbFolioGrantCredits({
    userId,
    delta,
    reason: "SUPERADMIN_GRANT",
    createdByUserId: actorId,
  });
  if (!r.ok) return { ok: false, message: r.message };
  revalidatePath("/superadmin/folios");
  revalidatePath("/folios");
  return { ok: true, message: `Acreditados ${delta} folios. Nuevo saldo: ${r.balanceAfter}.` };
}

export async function superadminFolioUsersSearch(q: string) {
  await requireSuperAdmin();
  return dbSuperAdminUsersSearch(q, 40);
}

const packSchema = z.object({
  slug: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  folioAmount: z.coerce.number().int().min(1).max(10_000_000),
  priceMxn: z.string().min(1),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  active: z.boolean(),
});

export type SuperadminFolioPackState = { ok: boolean; message?: string };

export async function superadminFolioPackCreate(
  _prev: SuperadminFolioPackState | null,
  formData: FormData,
): Promise<SuperadminFolioPackState> {
  await requireSuperAdmin();
  const parsed = packSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    folioAmount: formData.get("folioAmount"),
    priceMxn: formData.get("priceMxn"),
    sortOrder: formData.get("sortOrder") ?? 0,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) {
    return { ok: false, message: "Revisa slug, nombre, folios y precio (MXN)." };
  }
  try {
    await dbFolioPackCreate({
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description?.trim() || null,
      folioAmount: parsed.data.folioAmount,
      priceMxn: parsed.data.priceMxn.trim(),
      sortOrder: parsed.data.sortOrder,
      active: parsed.data.active,
    });
  } catch {
    return { ok: false, message: "No se pudo crear (¿slug duplicado?)." };
  }
  revalidatePath("/superadmin/folios");
  revalidatePath("/folios/planes");
  return { ok: true, message: "Paquete creado." };
}

export async function superadminFolioPackToggleActive(id: string, active: boolean): Promise<SuperadminFolioPackState> {
  await requireSuperAdmin();
  await dbFolioPackUpdate(id, { active });
  revalidatePath("/superadmin/folios");
  revalidatePath("/folios/planes");
  return { ok: true, message: active ? "Paquete activado." : "Paquete desactivado." };
}

export async function superadminFolioPackDelete(id: string): Promise<SuperadminFolioPackState> {
  await requireSuperAdmin();
  await dbFolioPackDelete(id);
  revalidatePath("/superadmin/folios");
  revalidatePath("/folios/planes");
  return { ok: true, message: "Paquete eliminado." };
}

