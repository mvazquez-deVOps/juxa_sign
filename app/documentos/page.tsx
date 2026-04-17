import Link from "next/link";
import { Plus } from "lucide-react";
import { dbDocumentsFindManyWithCompany } from "@/lib/data/repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentosDataTable } from "@/components/tables/documentos-data-table";
import { canMutate, canMutateSigningFlow, canSyncRemoteDocumentStatus } from "@/lib/gate";
import { requireOrgContext } from "@/lib/org-scope";

export default async function DocumentosPage() {
  const { organizationId, role } = await requireOrgContext();
  const allowWrite = canMutate(role);
  const showEnviarLink = canMutateSigningFlow(role);
  const canSyncRemote = canSyncRemoteDocumentStatus(role);
  const docs = await dbDocumentsFindManyWithCompany(organizationId, "createdAt", "desc");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground">PDFs creados en el proveedor y seguimiento local.</p>
        </div>
        {allowWrite ? (
          <Button asChild>
            <Link href="/documentos/nuevo">
              <Plus className="h-4 w-4" />
              Subir documento
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de documentos</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-muted-foreground">
                No hay documentos aún. Para subir un PDF necesitas al menos un cliente registrado. <br />
                Los firmantes los das de alta después para asignar marcas y enviar a firma.
              </p>
            </div>
          ) : (
            <DocumentosDataTable
              showEnviarLink={showEnviarLink}
              canSyncRemote={canSyncRemote}
              data={docs.map((d) => ({
                id: d.id,
                nameDoc: d.nameDoc,
                companyName: d.company.razonSocial,
                digidDocumentId: d.digidDocumentId,
                status: d.status,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
