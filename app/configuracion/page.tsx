import Link from "next/link";
import { dbOrgInvitesList, dbOrgSettingsGet, dbOrgUsersList } from "@/lib/data/repository";
import { requireOrgContext } from "@/lib/org-scope";
import { isOrganizationAdmin } from "@/lib/roles";
import { resolveSession } from "@/lib/session";
import { TeamEquipoClient } from "./equipo/equipo-client";
import { DeleteAccountZone } from "./delete-account-zone";
import { KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const { organizationId, role } = await requireOrgContext();
  const [session, users, invites, settings] = await Promise.all([
    resolveSession(),
    dbOrgUsersList(organizationId),
    dbOrgInvitesList(organizationId),
    dbOrgSettingsGet(organizationId),
  ]);
  const currentUserId = session?.user?.id ?? null;
  const activeMembers = users.filter((u) => !Boolean((u as { isRevoked?: boolean }).isRevoked));

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      
      {/* Encabezado Principal */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">Administra los accesos y usuarios de tu organización.</p>
          {isOrganizationAdmin(role) ? (
            <p className="mt-2 text-sm">
              <Link href="/configuracion/folios" className="text-primary underline-offset-4 hover:underline">
                Gestionar folios del equipo
              </Link>
            </p>
          ) : null}
        </div>
      </div>

      {/* Componente Interactivo de Usuarios (Tabla) */}
      <TeamEquipoClient
        currentUserId={currentUserId}
        users={activeMembers.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          folioBalance: u.folioBalance,
          kycBalance: u.kycBalance,
        }))}
        invites={invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt.toISOString(),
        }))}
        maxUsers={settings?.maxUsers ?? null}
        isAdmin={isOrganizationAdmin(role)}
      />

      {/* Tarjeta de Upselling para API REST */}
      <div className="mt-12 rounded-xl border border-[#2ABDA8]/20 bg-[#2ABDA8]/5 p-6 dark:bg-[#2ABDA8]/10">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2ABDA8]/20 text-[#2ABDA8]">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">
              Integración vía API REST
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Automatiza la creación y envío de documentos conectando tu ERP, CRM o sistema interno directamente con Juxa Sign. Nuestro servicio de API está disponible para planes empresariales.
            </p>
            <div className="mt-4">
              <a
                href="mailto:soporte@juxa.mx?subject=Información sobre API de Juxa Sign"
                className="inline-flex items-center justify-center rounded-md bg-[#2ABDA8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2ABDA8]/90 focus:outline-none focus:ring-2 focus:ring-[#2ABDA8] focus:ring-offset-2 dark:focus:ring-offset-background"
              >
                Contactar a soporte@juxa.mx
              </a>
            </div>
          </div>
        </div>
      </div>

      <DeleteAccountZone />
    </div>
  );
}