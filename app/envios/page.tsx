import Link from "next/link";
import { dbDocumentsFindManyWithCompany } from "@/lib/data/repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  canMutateOrgStructure,
  canMutateSigningFlow,
  canSyncRemoteDocumentStatus,
} from "@/lib/gate";
import { requireOrgContext } from "@/lib/org-scope";
import { EnviosSyncAllButton } from "./envios-sync-all";
import { EnviosClient } from "./envios-client";

export default async function EnviosPage() {
  const { organizationId, role } = await requireOrgContext();
  const allowStructureWrite = canMutateOrgStructure(role);
  const canSync = canSyncRemoteDocumentStatus(role);
  const showEnviarLink = canMutateSigningFlow(role);
  const docs = await dbDocumentsFindManyWithCompany(organizationId, "updatedAt", "desc");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Envíos</h1>
          <p className="text-muted-foreground">
            Seguimiento de documentos enviados a firmar. El estado se actualiza por notificaciones o al sincronizar
            manualmente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EnviosSyncAllButton disabled={docs.length === 0} canSync={canSync} />
          <Button variant="outline" asChild>
            <Link href="/documentos">Todos los documentos</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>En trámite</CardTitle>
          <CardDescription>
            Consulta URLs de firma y reenvíos desde la vista “Enviar a firmar” de cada documento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-muted-foreground">No hay documentos registrados.</p>
              {allowStructureWrite ? (
                <Button asChild>
                  <Link href="/documentos/nuevo">Subir documento</Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <EnviosClient
              canSync={canSync}
              showEnviarLink={showEnviarLink}
              data={docs.map((d) => ({
                id: d.id,
                nameDoc: d.nameDoc,
                companyName: d.company.razonSocial,
                digidDocumentId: d.digidDocumentId,
                status: d.status,
                lastStatusSyncAt: d.lastStatusSyncAt?.toISOString() ?? null,
                updatedAt: d.updatedAt.toISOString(),
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
