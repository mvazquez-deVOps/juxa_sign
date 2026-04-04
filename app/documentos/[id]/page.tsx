import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { dbFindDocumentDetailInOrg, dbSignatoryFindManyByCompany } from "@/lib/data/repository";
import { canMutateSigningFlow, canSyncRemoteDocumentStatus } from "@/lib/gate";
import { requireOrgContext } from "@/lib/org-scope";
import { DocumentDetailClient } from "./document-detail-client";
import { DocumentPageHeaderActions } from "./document-page-header-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({ params }: Props) {
  noStore();
  const { organizationId, role } = await requireOrgContext();
  const allowWrite = canMutateSigningFlow(role);
  const canSyncRemote = canSyncRemoteDocumentStatus(role);
  const { id } = await params;
  const doc = await dbFindDocumentDetailInOrg(id, organizationId);
  if (!doc) notFound();

  const signatories = await dbSignatoryFindManyByCompany(doc.companyId);

  const proxyUrl = doc.urlDocumento
    ? `/api/proxy-pdf?url=${encodeURIComponent(doc.urlDocumento)}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{doc.nameDoc}</h1>
          <p className="text-muted-foreground">
            {doc.company.razonSocial} · Id. documento {doc.digidDocumentId}
            {doc.status ? ` · ${doc.status}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/documentos">Volver</Link>
          </Button>
          <DocumentPageHeaderActions documentId={doc.id} canSync={canSyncRemote} />
          {allowWrite ? (
            <Button asChild variant="default">
              <Link href={`/documentos/${doc.id}/enviar`}>Enviar a firmar</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Constancias</CardTitle>
          <CardDescription>
            PDF guardado en el servidor cuando el proveedor devuelve archivo.
            {allowWrite ? (
              <>
                {" "}
                También puedes generar una desde{" "}
                <Link href={`/documentos/${doc.id}/enviar`} className="text-primary underline">
                  Enviar a firmar
                </Link>
                .
              </>
            ) : (
              <>
                {" "}
                En perfil visor · potencial consumidor no se gestionan envíos aquí; revisa estados en Envíos y planes en
                Folios.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {doc.certificates.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-muted-foreground">
              Aún no hay constancias para este documento. Tras firmar, usa el botón de constancia en la
              pantalla de envío; si el proveedor devuelve PDF, aparecerá aquí con enlace de descarga seguro.
            </p>
          ) : (
            doc.certificates.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <span className="text-muted-foreground">
                  {c.fileName ?? c.id} · {c.createdAt.toLocaleString()}
                </span>
                {c.filePath ? (
                  <Button variant="secondary" size="sm" asChild>
                    <a href={`/api/certificates/${c.id}`}>Descargar PDF</a>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Sin PDF almacenado</span>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <DocumentDetailClient
        canMutate={allowWrite}
        canSyncRemote={canSyncRemote}
        documentId={doc.id}
        companyId={doc.companyId}
        companyRazonSocial={doc.company.razonSocial}
        fileUrl={proxyUrl}
        signatories={signatories.map((s) => ({ id: s.id, name: s.name, digidId: s.digidSignatoryId }))}
        placements={doc.placements.map((p) => ({
          id: p.id,
          page: p.page,
          x: p.x,
          y: p.y,
          widthPx: p.widthPx,
          heightPx: p.heightPx,
          signatoryName: p.signatory.name,
        }))}
      />
    </div>
  );
}
