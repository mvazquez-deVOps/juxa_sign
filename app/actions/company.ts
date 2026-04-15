"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  dbCompanyCreate,
  dbCompanyFindFirstByDigidInOrg,
} from "@/lib/data/repository";
import { registrarEmpresa } from "@/lib/digid";
import { gateOrgStructureMutation } from "@/lib/gate";

function formText(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

const schema = z.object({
  razonSocial: z.string().min(2, "Razón social o nombre: mínimo 2 caracteres."),
  rfc: z
    .string()
    .min(10, "RFC: debe tener entre 10 y 13 caracteres (persona moral o física).")
    .max(13, "RFC: máximo 13 caracteres; quita espacios si lo pegaste del portapapeles."),
  email: z.string().email("Correo: usa un formato válido (ej. contacto@empresa.com)."),
});

function firstValidationMessage(fieldErrors: z.inferFlattenedErrors<typeof schema>["fieldErrors"]): string {
  for (const key of ["razonSocial", "rfc", "email"] as const) {
    const msg = fieldErrors[key]?.[0];
    if (msg) return msg;
  }
  return "Revisa razón social, RFC y correo.";
}

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

  const parsed = schema.safeParse({
    razonSocial: formText(formData, "razonSocial"),
    rfc: formText(formData, "rfc").toUpperCase(),
    email: formText(formData, "email").toLowerCase(),
  });
  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { ok: false, message: firstValidationMessage(fieldErrors) };
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
      const r = res as {
        Codigo?: number;
        ExtraInfo?: { Descripcion?: string; Id?: string };
        message?: string;
      };
      const detail =
        r.ExtraInfo?.Descripcion ??
        (typeof r.message === "string" ? r.message : undefined) ??
        (r.Codigo != null ? `código ${r.Codigo}` : undefined);
      return {
        ok: false,
        message: detail
          ? `Proveedor: ${detail}`
          : "Respuesta del proveedor no reconocida (sin código ni mensaje). Revisa DIGID_LEGACY_BASE y credenciales.",
      };
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
