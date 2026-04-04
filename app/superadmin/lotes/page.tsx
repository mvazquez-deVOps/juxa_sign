import Link from "next/link";
import { dbDocumentsForBatchPicker, dbOrgUsersList, dbSigningJobsList, dbSuperAdminOrganizationsList } from "@/lib/data/repository";
import { Button } from "@/components/ui/button";
import { SuperadminLotesClient } from "./superadmin-lotes-client";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ org?: string }> };

export default async function SuperadminLotesPage({ searchParams }: Props) {
  const { org: orgId } = await searchParams;
  const orgs = await dbSuperAdminOrganizationsList();

  const validOrgId = orgId && orgs.some((o) => o.id === orgId) ? orgId : null;

  const [documents, jobsRaw, users] = await Promise.all([
    validOrgId ? dbDocumentsForBatchPicker(validOrgId) : Promise.resolve([]),
    validOrgId ? dbSigningJobsList(validOrgId, 40) : Promise.resolve([]),
    validOrgId ? dbOrgUsersList(validOrgId) : Promise.resolve([]),
  ]);

  const jobs = jobsRaw.map((j) => ({
    id: j.id,
    status: j.status,
    createdAt: j.createdAt.toISOString(),
    errorMessage: j.errorMessage,
    result: j.result,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Lotes (cualquier organización)</h2>
          <p className="text-sm text-muted-foreground">
            Ejecuta envíos en lote en nombre de un cliente. Los folios se descuentan de la cartera del usuario que
            elijas.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/superadmin/organizaciones">Organizaciones</Link>
        </Button>
      </div>
      <SuperadminLotesClient
        key={validOrgId ?? "none"}
        organizations={orgs.map((o) => ({ id: o.id, name: o.name, slug: o.slug }))}
        selectedOrgId={validOrgId}
        documents={documents}
        initialJobs={jobs}
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          folioBalance: u.folioBalance,
        }))}
      />
    </div>
  );
}
