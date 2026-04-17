import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { dbFindDocumentDetailInOrg, dbSignatoryFindManyByCompany } from "@/lib/data/repository";
import { canMutateSigningFlow } from "@/lib/gate";
import { requireOrgContext } from "@/lib/org-scope";
import { DocumentDetailClient } from "./document-detail-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({ params }: Props) {
  noStore();
  const { organizationId, role } = await requireOrgContext();
  const allowWrite = canMutateSigningFlow(role);
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
          {allowWrite ? (
            <Button asChild variant="default">
              <Link href={`/documentos/${doc.id}/enviar`}>Enviar a firmar</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <DocumentDetailClient
        canMutate={allowWrite}
        documentId={doc.id}
        companyId={doc.companyId}
        companyRazonSocial={doc.company.razonSocial}
        fileUrl={proxyUrl}
        signatories={signatories.map((s) => ({ id: s.id, name: s.name, digidId: s.digidSignatoryId }))}
        placements={doc.placements.map((p) => ({
          id: p.id,
          signatoryId: p.signatoryId,
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
