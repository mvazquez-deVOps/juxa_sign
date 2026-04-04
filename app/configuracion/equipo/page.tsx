import Link from "next/link";
import { dbOrgInvitesList, dbOrgSettingsGet, dbOrgUsersList } from "@/lib/data/repository";
import { requireOrgContext } from "@/lib/org-scope";
import { isOrganizationAdmin } from "@/lib/roles";
import { TeamEquipoClient } from "./equipo-client";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const { organizationId, role } = await requireOrgContext();
  const [users, invites, settings] = await Promise.all([
    dbOrgUsersList(organizationId),
    dbOrgInvitesList(organizationId),
    dbOrgSettingsGet(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipo</h1>
          <p className="text-muted-foreground">Usuarios del panel e invitaciones por correo.</p>
          {isOrganizationAdmin(role) ? (
            <p className="mt-2 text-sm">
              <Link href="/configuracion/folios" className="text-primary underline-offset-4 hover:underline">
                Gestionar folios del equipo
              </Link>
            </p>
          ) : null}
        </div>
        <Link href="/configuracion" className="text-sm text-primary underline-offset-4 hover:underline">
          ← Configuración
        </Link>
      </div>
      <TeamEquipoClient
        users={users.map((u) => ({ id: u.id, email: u.email, role: u.role, folioBalance: u.folioBalance }))}
        invites={invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt.toISOString(),
        }))}
        maxUsers={settings?.maxUsers ?? null}
        isAdmin={isOrganizationAdmin(role)}
      />
    </div>
  );
}
