import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DocumentDetailClient } from "./document-detail-client";
import { DocumentPageHeaderActions } from "./document-page-header-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { params: Promise<{ id: string }> };

export default async function DocumentDetailPage({ params }: Props) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      company: true,
      placements: { include: { signatory: true }, orderBy: { createdAt: "asc" } },
      certificates: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!doc) notFound();

  const signatories = await prisma.signatory.findMany({
    where: { companyId: doc.companyId },
    orderBy: { name: "asc" },
  });

  const proxyUrl = doc.urlDocumento
    ? `/api/proxy-pdf?url=${encodeURIComponent(doc.urlDocumento)}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{doc.nameDoc}</h1>
          <p className="text-muted-foreground">
            {doc.company.razonSocial} · Id DIGID {doc.digidDocumentId}
            {doc.status ? ` · ${doc.status}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/documentos">Volver</Link>
          </Button>
          <DocumentPageHeaderActions documentId={doc.id} />
          <Button asChild>
            <Link href={`/documentos/${doc.id}/enviar`}>Enviar a firmar</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Constancias (certify_doc)</CardTitle>
          <CardDescription>
            PDF guardado en el servidor cuando DIGID devuelve archivo. También puedes generar una desde{" "}
            <Link href={`/documentos/${doc.id}/enviar`} className="text-primary underline">
              Enviar a firmar
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {doc.certificates.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-muted-foreground">
              Aún no hay constancias para este documento. Tras firmar, usa el botón de constancia en la
              pantalla de envío; si DIGID devuelve PDF, aparecerá aquí con enlace de descarga seguro.
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
        documentId={doc.id}
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
