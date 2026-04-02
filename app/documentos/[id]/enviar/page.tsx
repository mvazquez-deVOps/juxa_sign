import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EnviarClient } from "./enviar-client";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export default async function EnviarDocumentoPage({ params }: Props) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      company: true,
      signatories: { include: { signatory: true } },
      placements: true,
    },
  });
  if (!doc) notFound();

  const allSignatories = await prisma.signatory.findMany({
    where: { companyId: doc.companyId },
    orderBy: { name: "asc" },
  });

  const assignedIds = new Set(doc.signatories.map((s) => s.signatoryId));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Enviar a firmar</h1>
          <p className="text-muted-foreground">
            {doc.nameDoc} · {doc.placements.length} marca(s) · {doc.signatories.length} asignado(s)
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/documentos/${doc.id}`}>Visor</Link>
        </Button>
      </div>

      <EnviarClient
        documentId={doc.id}
        placementsCount={doc.placements.length}
        signatories={allSignatories.map((s) => ({
          id: s.id,
          name: s.name,
          digidId: s.digidSignatoryId,
          assigned: assignedIds.has(s.id),
        }))}
      />
    </div>
  );
}
