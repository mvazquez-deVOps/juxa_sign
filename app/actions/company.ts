"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarEmpresa } from "@/lib/digid";

const schema = z.object({
  razonSocial: z.string().min(2),
  rfc: z.string().min(10).max(13),
  email: z.string().email(),
});

export type CompanyActionState = {
  ok: boolean;
  message?: string;
  companyId?: string;
};

export async function createCompany(
  _prev: CompanyActionState | null,
  formData: FormData,
): Promise<CompanyActionState> {
  const parsed = schema.safeParse({
    razonSocial: formData.get("razonSocial"),
    rfc: formData.get("rfc"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.flatten().fieldErrors.razonSocial?.[0] ?? "Datos inválidos" };
  }
  try {
    const res = await registrarEmpresa({
      RazonSocial: parsed.data.razonSocial,
      RFC: parsed.data.rfc,
      Email: parsed.data.email,
    });
    if (Number(res.Codigo) === 300) {
      return { ok: false, message: "Credenciales DIGID inválidas (300)." };
    }
    if (Number(res.Codigo) === 400) {
      const existingId = res.ExtraInfo?.Id;
      if (existingId) {
        const digidId = parseInt(existingId, 10);
        const existing = await prisma.company.findUnique({ where: { digidIdClient: digidId } });
        if (existing) {
          return { ok: true, message: "Empresa ya registrada en DIGID; sincronizada localmente.", companyId: existing.id };
        }
        const c = await prisma.company.create({
          data: {
            digidIdClient: digidId,
            razonSocial: parsed.data.razonSocial,
            rfc: parsed.data.rfc,
            email: parsed.data.email,
          },
        });
        revalidatePath("/empresas");
        return { ok: true, message: "Empresa ya existía en DIGID; guardada localmente.", companyId: c.id };
      }
      return { ok: false, message: res.ExtraInfo?.Descripcion ?? "Empresa ya registrada." };
    }
    if (Number(res.Codigo) !== 200 || !res.ExtraInfo?.Id) {
      return { ok: false, message: `Respuesta DIGID: código ${res.Codigo}` };
    }
    const digidId = parseInt(res.ExtraInfo.Id, 10);
    const company = await prisma.company.create({
      data: {
        digidIdClient: digidId,
        razonSocial: parsed.data.razonSocial,
        rfc: parsed.data.rfc,
        email: parsed.data.email,
      },
    });
    revalidatePath("/empresas");
    return { ok: true, message: "Empresa registrada correctamente.", companyId: company.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, message: msg };
  }
}
