"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  dbCompanyCreate,
  dbCompanyFindFirstByDigidInOrg,
  dbOrganizationExists,
} from "@/lib/data/repository";
import { registrarEmpresa } from "@/lib/digid";
import { gateOrgStructureMutation } from "@/lib/gate";

const schema = z.object({
  razonSocial: z.string().min(2),
  rfc: z.string().min(10).max(13),
  email: z.string().email(),
});

export type CompanyActionState = {
  ok: boolean;
  message?: string;
  companyId?: string;
  /** Para actualizar el desplegable al instante si el árbol RSC aún viene cacheado. */
  razonSocial?: string;
};

export async function createCompany(
  _prev: CompanyActionState | null,
  formData: FormData,
): Promise<CompanyActionState> {
  const g = await gateOrgStructureMutation();
  if (!g.ok) return { ok: false, message: g.message };

  const orgId = g.session.user.organizationId?.trim();
  if (!orgId) {
    return {
      ok: false,
      message:
        "Tu sesión no tiene organización asignada. Cierra sesión y vuelve a entrar, o revisa DEMO_ORGANIZATION_ID / datos del usuario en base.",
    };
  }

  if (!(await dbOrganizationExists(orgId))) {
    return {
      ok: false,
      message:
        "La organización de tu sesión no existe en esta base de datos. Con modo demo: copia en .env DEMO_ORGANIZATION_ID el id de una fila real de Organization (tras npx prisma db seed), reinicia npm run dev y vuelve a entrar. Con correo y contraseña: cierra sesión y entra de nuevo para alinear la sesión con la base.",
    };
  }

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
      return { ok: false, message: "Credenciales del proveedor inválidas (300)." };
    }
    if (Number(res.Codigo) === 400) {
      const existingId = res.ExtraInfo?.Id;
      if (existingId) {
        const digidId = parseInt(existingId, 10);
        const existing = await dbCompanyFindFirstByDigidInOrg(digidId, orgId);
        if (existing) {
          revalidatePath("/empresas");
          revalidatePath("/documentos");
          revalidatePath("/documentos/nuevo");
          revalidatePath("/");
          return {
            ok: true,
            message: "Empresa ya registrada en el proveedor; sincronizada localmente.",
            companyId: existing.id,
            razonSocial: parsed.data.razonSocial,
          };
        }
        const c = await dbCompanyCreate({
          digidIdClient: digidId,
          razonSocial: parsed.data.razonSocial,
          rfc: parsed.data.rfc,
          email: parsed.data.email,
          organizationId: orgId,
        });
        revalidatePath("/empresas");
        revalidatePath("/documentos");
        revalidatePath("/documentos/nuevo");
        revalidatePath("/");
        return {
          ok: true,
          message: "Empresa ya existía en el proveedor; guardada localmente.",
          companyId: c.id,
          razonSocial: parsed.data.razonSocial,
        };
      }
      return { ok: false, message: res.ExtraInfo?.Descripcion ?? "Empresa ya registrada." };
    }
    if (Number(res.Codigo) !== 200 || !res.ExtraInfo?.Id) {
      return { ok: false, message: `Respuesta del proveedor: código ${res.Codigo}` };
    }
    const digidId = parseInt(res.ExtraInfo.Id, 10);
    const company = await dbCompanyCreate({
      digidIdClient: digidId,
      razonSocial: parsed.data.razonSocial,
      rfc: parsed.data.rfc,
      email: parsed.data.email,
      organizationId: orgId,
    });
    revalidatePath("/empresas");
    revalidatePath("/documentos");
    revalidatePath("/documentos/nuevo");
    revalidatePath("/");
    return {
      ok: true,
      message: "Empresa registrada correctamente.",
      companyId: company.id,
      razonSocial: parsed.data.razonSocial,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, message: msg };
  }
}
