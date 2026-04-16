import type { Session } from "next-auth";
import type { UserRole } from "@prisma/client";
import { isPanelReadOnlyRole } from "@/lib/roles";
import { isMemoryDataStore } from "@/lib/data/mode";
import { resolveSession } from "@/lib/session";

export type MutationGate =
  | { ok: true; session: Session }
  | { ok: false; message: string };

export async function requireSession(): Promise<Session> {
  const session = await resolveSession();
  if (!session?.user?.organizationId) {
    throw new Error("Sesión inválida");
  }
  return session;
}

export async function gateMutation(): Promise<MutationGate> {
  const session = await resolveSession();
  if (!session?.user?.organizationId) {
    return {
      ok: false,
      message:
        process.env.DEMO_PASSWORD?.trim() &&
        !process.env.DEMO_ORGANIZATION_ID?.trim() &&
        !isMemoryDataStore()
          ? "Modo demo: define DEMO_ORGANIZATION_ID en .env (cuid de Organization en la base)."
          : "Debes iniciar sesión.",
    };
  }
  if (session.user.isRevoked) {
    return {
      ok: false,
      message:
        "Tu acceso al panel fue revocado por un administrador. Usa la página de acceso revocado o cierra sesión.",
    };
  }
  if (session.user.role === "VIEWER") {
    return {
      ok: false,
      message:
        "Tu perfil es visor · potencial consumidor: puedes consultar el panel y los planes; para operar o comprar folios, pide a un administrador que te asigne otro rol o acredite tu cartera.",
    };
  }
  return { ok: true, session };
}

/** Alta de empresas, firmantes y documentos (PDF nuevo). El rol USER no muta estructura. */
export async function gateOrgStructureMutation(): Promise<MutationGate> {
  const g = await gateMutation();
  if (!g.ok) return g;
  if (g.session.user.role === "USER") {
    return { ok: false, message: "Tu cuenta no puede crear empresas, firmantes ni subir documentos nuevos." };
  }
  return g;
}

/** Lectura / sincronización de estado con el proveedor: cualquier rol con org, sin mutar datos locales sensibles vía otras acciones. */
export async function requireOrgSession(): Promise<MutationGate> {
  const session = await resolveSession();
  if (!session?.user?.organizationId) {
    return {
      ok: false,
      message:
        process.env.DEMO_PASSWORD?.trim() &&
        !process.env.DEMO_ORGANIZATION_ID?.trim() &&
        !isMemoryDataStore()
          ? "Modo demo: define DEMO_ORGANIZATION_ID en .env."
          : "Debes iniciar sesión.",
    };
  }
  return { ok: true, session };
}

/** Consulta remota que actualiza `status` en base: permitida para OPERATOR/USER/ADMIN; no para VIEWER. */
export async function gateDocumentStatusSync(): Promise<MutationGate> {
  const g = await requireOrgSession();
  if (!g.ok) return g;
  if (isPanelReadOnlyRole(g.session.user.role)) {
    return {
      ok: false,
      message:
        "Perfil visor · potencial consumidor: la sincronización de estado con el proveedor la realizan roles operativos.",
    };
  }
  return g;
}

export function canSyncRemoteDocumentStatus(role: UserRole): boolean {
  return !isPanelReadOnlyRole(role);
}

/** Alta de empresas, firmantes, documento nuevo y configuración (no aplica a USER). */
export function canMutateOrgStructure(role: UserRole): boolean {
  return role === "OPERATOR" || role === "SANDBOX" || role === "ADMIN" || role === "SUPERADMIN";
}

/** Marcas, asignación y envío a firma (incluye USER con cartera). */
export function canMutateSigningFlow(role: UserRole): boolean {
  return (
    role === "OPERATOR" ||
    role === "SANDBOX" ||
    role === "ADMIN" ||
    role === "SUPERADMIN" ||
    role === "USER"
  );
}

/** @deprecated Preferir canMutateOrgStructure o canMutateSigningFlow según pantalla. */
export function canMutate(role: UserRole): boolean {
  return canMutateOrgStructure(role);
}

export function companyWhereOrg(organizationId: string) {
  return { organizationId };
}
