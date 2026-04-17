import { notFound } from "next/navigation";
import { dbFindDocumentDetailInOrg, dbSignatoryFindManyByCompany, dbUserFolioBalance } from "@/lib/data/repository";
import { canMutateSigningFlow } from "@/lib/gate";
import { shouldSkipFolioDebitForUserId } from "@/lib/folio-enforcement";
import { requireOrgContext } from "@/lib/org-scope";
import { resolveSession } from "@/lib/session";
import { EnviarClient } from "./enviar-client";

type Props = { params: Promise<{ id: string }> };

export default async function EnviarDocumentoPage({ params }: Props) {
  const { organizationId, role } = await requireOrgContext();
  const allowWrite = canMutateSigningFlow(role);
  const session = await resolveSession();
  const sessionUserId = session?.user?.id;
  const enforceFolioBalanceCheck =
    sessionUserId != null && !shouldSkipFolioDebitForUserId(sessionUserId);
  const userFolioBalance =
    sessionUserId != null ? await dbUserFolioBalance(sessionUserId) : 0;
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
        userFolioBalance={userFolioBalance}
        enforceFolioBalanceCheck={enforceFolioBalanceCheck}
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
