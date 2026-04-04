"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbFolioGrantCredits, dbUserBelongsToOrg } from "@/lib/data/repository";
import { requireAdminContext } from "@/lib/org-scope";
import { resolveSession } from "@/lib/session";

export type OrgFolioGrantState = { ok: boolean; message?: string };

const grantSchema = z.object({
  userId: z.string().min(1),
  delta: z.coerce.number().int().min(1).max(1_000_000),
});

export async function adminOrgGrantFolios(
  _prev: OrgFolioGrantState | null,
  formData: FormData,
): Promise<OrgFolioGrantState> {
  const { organizationId } = await requireAdminContext();
  const session = await resolveSession();
  const actorId = session?.user?.id;
  if (!actorId) return { ok: false, message: "Sesión inválida." };

  const parsed = grantSchema.safeParse({
    userId: formData.get("userId"),
    delta: formData.get("delta"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Usuario y cantidad inválidos (entero 1–1 000 000)." };
  }

  const belongs = await dbUserBelongsToOrg(parsed.data.userId, organizationId);
  if (!belongs) {
    return { ok: false, message: "El usuario no pertenece a esta organización." };
  }

  const r = await dbFolioGrantCredits({
    userId: parsed.data.userId,
    delta: parsed.data.delta,
    reason: "ADMIN_TRANSFER",
    createdByUserId: actorId,
  });
  if (!r.ok) return { ok: false, message: r.message };

  revalidatePath("/configuracion/folios");
  revalidatePath("/folios");
  revalidatePath("/configuracion/equipo");
  return { ok: true, message: `Acreditados ${parsed.data.delta} folios. Nuevo saldo: ${r.balanceAfter}.` };
}
