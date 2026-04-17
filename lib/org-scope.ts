import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { dbOrganizationExists } from "@/lib/data/repository";
import { isMemoryDataStore } from "@/lib/data/mode";
import { isOrganizationAdmin } from "@/lib/roles";
import { resolveSession } from "@/lib/session";

const LOGIN_SESION_INVALIDA = "/login?reason=sesion-invalida";

/** Panel: sesión NextAuth o sesión demo (`resolveSession`) con organización. */
export async function requireOrgContext(): Promise<{ organizationId: string; role: UserRole }> {
  const session = await resolveSession();
  const organizationId = session?.user?.organizationId;
  const role = session?.user?.role;
  if (!organizationId || role == null) {
    redirect("/login");
  }
  if (isMemoryDataStore()) {
    try {
      const exists = await dbOrganizationExists(organizationId);
      if (!exists) {
        const jwt = await auth();
        if (jwt?.user?.organizationId) {
          redirect(`/api/auth/signout?callbackUrl=${encodeURIComponent(LOGIN_SESION_INVALIDA)}`);
        }
        redirect(LOGIN_SESION_INVALIDA);
      }
    } catch {
      /* Si la base no responde, no invalidar la sesión aquí. */
    }
  }
  return { organizationId, role };
}

/** Solo administradores de la organización (panel SaaS avanzado). Incluye SUPERADMIN en su org “home”. */
export async function requireAdminContext(): Promise<{
  organizationId: string;
  role: Extract<UserRole, "ADMIN" | "SUPERADMIN">;
}> {
  const ctx = await requireOrgContext();
  if (!isOrganizationAdmin(ctx.role)) {
    redirect("/");
  }
  return {
    organizationId: ctx.organizationId,
    role: ctx.role as Extract<UserRole, "ADMIN" | "SUPERADMIN">,
  };
}

/** Lectura de /hoja-de-ruta-devs: solo administradores de org o superadmin (misma regla que el resto de /admin). */
export async function requireDevRoadmapViewerContext(): Promise<{ organizationId: string; role: UserRole }> {
  const ctx = await requireOrgContext();
  if (ctx.role !== "ADMIN" && ctx.role !== "SUPERADMIN") {
    redirect("/");
  }
  return ctx;
}
