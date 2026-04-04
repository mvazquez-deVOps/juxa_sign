"use server";

import { z } from "zod";
import { dbRegisterSelfServiceOrganization, dbUserFindByEmailGlobal } from "@/lib/data/repository";

function normalizeOrgSlugInput(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const registerSchema = z
  .object({
    organizationName: z.string().min(2, "Nombre de organización muy corto").max(120),
    organizationSlug: z
      .string()
      .transform(normalizeOrgSlugInput)
      .pipe(
        z
          .string()
          .min(2, "Identificador muy corto (2–48 caracteres, letras, números y guiones)")
          .max(48, "Identificador muy largo"),
      ),
    email: z.string().email("Correo inválido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirm: z.string().min(8),
  })
  .refine((d) => d.password === d.confirm, { message: "Las contraseñas no coinciden", path: ["confirm"] });

export type RegisterOrganizationState = { ok: boolean; message?: string };

export async function registerOrganization(
  _prev: RegisterOrganizationState | null,
  formData: FormData,
): Promise<RegisterOrganizationState> {
  const parsed = registerSchema.safeParse({
    organizationName: formData.get("organizationName"),
    organizationSlug: formData.get("organizationSlug"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Datos inválidos";
    return { ok: false, message: msg };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await dbUserFindByEmailGlobal(email);
  if (existing) {
    return { ok: false, message: "Ese correo ya está registrado. Inicia sesión." };
  }

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const r = await dbRegisterSelfServiceOrganization({
    name: parsed.data.organizationName.trim(),
    slug: parsed.data.organizationSlug.trim().toLowerCase(),
    email,
    passwordHash,
  });
  if (!r.ok) {
    return { ok: false, message: r.message };
  }
  return { ok: true, message: "Cuenta creada. Entrando…" };
}
