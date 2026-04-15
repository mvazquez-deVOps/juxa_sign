import { notFound } from "next/navigation";
import Link from "next/link";
import { dbFindDocumentDetailInOrg, dbSignatoryFindManyByCompany } from "@/lib/data/repository";
import { canMutateSigningFlow } from "@/lib/gate";
import { requireOrgContext } from "@/lib/org-scope";
import { EnviarClient } from "./enviar-client";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export default async function EnviarDocumentoPage({ params }: Props) {
  const { organizationId, role } = await requireOrgContext();
  const allowWrite = canMutateSigningFlow(role);
  const { id } = await params;
  const doc = await dbFindDocumentDetailInOrg(id, organizationId);
  if (!doc) notFound();

  const allSignatories = await dbSignatoryFindManyByCompany(doc.companyId);

  const assignedIds = new Set(doc.signatories.map((s) => s.signatoryId));
  const kycBySignatoryId = new Map(doc.signatories.map((ds) => [ds.signatoryId, ds.kyc]));

  const placementRows = doc.placements.map((p) => ({
    id: p.id,
    signatoryId: p.signatoryId,
    signatoryName: p.signatory.name,
    page: p.page,
    sortOrder: p.sortOrder,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Enviar a firmar</h1>
          <p className="text-muted-foreground">
            {doc.nameDoc} · {doc.placements.length} marca(s) · {doc.signatories.length} asignado(s)
            {doc.status ? ` · ${doc.status}` : ""}
          </p>
        </div>
      </div>

      <EnviarClient
        canMutate={allowWrite}
        documentId={doc.id}
        documentName={doc.nameDoc}
        documentCompanyId={doc.company.id}
        documentCompanyName={doc.company.razonSocial}
        placementRows={placementRows}
        signatories={allSignatories.map((s) => ({
          id: s.id,
          name: s.name,
          digidId: s.digidSignatoryId,
          assigned: assignedIds.has(s.id),
          kyc: kycBySignatoryId.get(s.id) ?? false,
          email: s.email,
          phone: s.phone,
        }))}
      />
    </div>
  );
}
