import Link from "next/link";
import { Plus } from "lucide-react";
import { dbCompaniesFindManyForList } from "@/lib/data/repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmpresasDataTable } from "@/components/tables/empresas-data-table";
import { canMutate } from "@/lib/gate";
import { requireOrgContext } from "@/lib/org-scope";

export default async function EmpresasPage() {
  const { organizationId, role } = await requireOrgContext();
  const allowWrite = canMutate(role);
  const companies = await dbCompaniesFindManyForList(organizationId, "desc");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Empresas y personas físicas registradas en Juxa Sign.
          </p>
        </div>
        {allowWrite ? (
          <Button asChild>
            <Link href="/empresas/nueva">
              <Plus className="h-4 w-4" />
              Nuevo cliente
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directorio</CardTitle>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <p className="text-muted-foreground">Aún no hay clientes registrados. Registra uno ahora para empezar a usar Juxa Sign.</p>
            </div>
          ) : (
            <EmpresasDataTable
              data={companies.map((c) => ({
                id: c.id,
                razonSocial: c.razonSocial,
                rfc: c.rfc,
                email: c.email,
                digidIdClient: c.digidIdClient,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
