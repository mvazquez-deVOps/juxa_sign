"use server";

import { revalidatePath } from "next/cache";
import {
  dbSuperAdminOrganizationById,
  dbSuperAdminOrgSettingsSave,
} from "@/lib/data/repository";
import { requireSuperAdmin } from "@/lib/superadmin";

export type SuperadminOrgSettingsState = { ok: boolean; message?: string };

export async function superadminUpdateOrgSettings(
  organizationId: string,
  _prev: SuperadminOrgSettingsState | null,
  formData: FormData,
): Promise<SuperadminOrgSettingsState> {
  await requireSuperAdmin();
  const org = await dbSuperAdminOrganizationById(organizationId);
  if (!org) {
    return { ok: false, message: "Organización no encontrada." };
  }

  const displayNameEntry = formData.get("displayName");
  const maxUsersEntry = formData.get("maxUsers");
  const maxMonthlySendsEntry = formData.get("maxMonthlySends");
  const displayNameStr = typeof displayNameEntry === "string" ? displayNameEntry : "";
  const maxUsersStr = typeof maxUsersEntry === "string" ? maxUsersEntry : "";
  const maxMonthlySendsStr = typeof maxMonthlySendsEntry === "string" ? maxMonthlySendsEntry : "";
  const folioPremiumEnabled = formData.get("folioPremiumEnabled") === "on";

  const displayName = displayNameStr.trim() === "" ? null : displayNameStr.trim();

  let maxUsers: number | null = null;
  if (maxUsersStr.trim() !== "") {
    const n = Number(maxUsersStr);
    if (!Number.isInteger(n) || n < 1 || n > 10_000) {
      return { ok: false, message: "Límite de usuarios: entero entre 1 y 10000, o vacío para sin límite." };
    }
    maxUsers = n;
  }

  let maxMonthlySends: number | null = null;
  if (maxMonthlySendsStr.trim() !== "") {
    const n = Number(maxMonthlySendsStr);
    if (!Number.isInteger(n) || n < 0 || n > 1_000_000) {
      return { ok: false, message: "Envíos al mes: entero ≥ 0, o vacío para sin cuota definida." };
    }
    maxMonthlySends = n;
  }

  await dbSuperAdminOrgSettingsSave(organizationId, {
    displayName,
    maxUsers,
    maxMonthlySends,
    folioPremiumEnabled,
  });

  revalidatePath("/superadmin");
  revalidatePath(`/superadmin/organizaciones/${organizationId}`);
  return { ok: true, message: "Cambios guardados." };
}
