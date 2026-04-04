"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  dbCompanyFindFirstInOrg,
  dbSignatoryDelete,
  dbSignatoryFindFirstInOrg,
  dbSignatoryUpsert,
} from "@/lib/data/repository";
import { guardarFirmante } from "@/lib/digid";
import { gateOrgStructureMutation } from "@/lib/gate";

const createSchema = z.object({
  companyId: z.string().cuid(),
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  rfc: z.string().optional().or(z.literal("")),
  isRepLegal: z.string().nullish(),
  autoSign: z.string().nullish(),
});

export type SignatoryActionState = { ok: boolean; message?: string };

export async function saveSignatory(
  _prev: SignatoryActionState | null,
  formData: FormData,
): Promise<SignatoryActionState> {
  const g = await gateOrgStructureMutation();
  if (!g.ok) return { ok: false, message: g.message };
  const orgId = g.session.user.organizationId;

  const parsed = createSchema.safeParse({
    companyId: formData.get("companyId"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    rfc: formData.get("rfc"),
    isRepLegal: formData.get("isRepLegal"),
    autoSign: formData.get("autoSign"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Revisa los campos del formulario." };
  }
  const email = parsed.data.email?.trim() || undefined;
  const phone = parsed.data.phone?.trim() || undefined;
  if (!email && !phone) {
    return { ok: false, message: "Debes indicar correo o teléfono." };
  }
  const company = await dbCompanyFindFirstInOrg(parsed.data.companyId, orgId);
  if (!company) return { ok: false, message: "Empresa no encontrada." };

  const signatoryId = formData.get("signatoryId")?.toString();
  const payload = {
    IdClient: company.digidIdClient,
    Name: parsed.data.name,
    Email: email,
    Phone: phone,
    Rfc: parsed.data.rfc?.trim() || undefined,
    IsRepLegal: parsed.data.isRepLegal === "on",
    AutoSign: parsed.data.autoSign === "on",
    ...(signatoryId ? { Id: parseInt(signatoryId, 10) } : {}),
  };

  try {
    const res = await guardarFirmante(payload);
    if (!res.Success || !res.Data?.id) {
      return { ok: false, message: res.Message ?? "El proveedor rechazó la petición." };
    }
    const digidSignatoryId = res.Data.id;
    await dbSignatoryUpsert(company.id, digidSignatoryId, {
      name: parsed.data.name,
      email: email ?? null,
      phone: phone ?? null,
      rfc: parsed.data.rfc?.trim() || null,
      isRepLegal: parsed.data.isRepLegal === "on",
      autoSign: parsed.data.autoSign === "on",
    });
    revalidatePath("/firmantes");
    return { ok: true, message: "Firmante guardado." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, message: msg };
  }
}

export async function deleteSignatoryLocal(id: string) {
  const g = await gateOrgStructureMutation();
  if (!g.ok) return;
  const orgId = g.session.user.organizationId;
  const sig = await dbSignatoryFindFirstInOrg(id, orgId);
  if (!sig) return;
  await dbSignatoryDelete(sig.id);
  revalidatePath("/firmantes");
}
