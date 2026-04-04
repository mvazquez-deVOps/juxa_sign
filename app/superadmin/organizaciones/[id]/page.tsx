import Link from "next/link";
import { notFound } from "next/navigation";
import { dbSuperAdminOrganizationById } from "@/lib/data/repository";
import { SuperadminOrgSettingsForm } from "./superadmin-org-settings-form";

function formatDate(d: Date) {
  return d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

type PageProps = { params: Promise<{ id: string }> };

export default async function SuperadminOrganizacionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const org = await dbSuperAdminOrganizationById(id);
  if (!org) notFound();

  const s = org.settings;
  const defaults = {
    displayName: s?.displayName ?? "",
    maxUsers: s?.maxUsers != null ? String(s.maxUsers) : "",
    maxMonthlySends: s?.maxMonthlySends != null ? String(s.maxMonthlySends) : "",
    folioPremiumEnabled: s?.folioPremiumEnabled ?? false,
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <Link href="/superadmin/organizaciones" className="text-primary hover:underline">
            Organizaciones
          </Link>
          <span className="mx-1">/</span>
          <span className="text-foreground">{org.name}</span>
        </p>
        <h2 className="text-xl font-semibold">{org.name}</h2>
        <p className="text-sm text-muted-foreground">
          Slug <code className="rounded bg-muted px-1 text-xs">{org.slug}</code> · ID{" "}
          <code className="rounded bg-muted px-1 text-xs">{org.id}</code>
        </p>
        <p className="text-sm text-muted-foreground">
          {org._count.users} usuario(s), {org._count.companies} empresa(s). Creada {formatDate(org.createdAt)}.
        </p>
      </div>

      <SuperadminOrgSettingsForm organizationId={org.id} defaults={defaults} />
    </div>
  );
}
