import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { FirmantesClient } from "./ui";

type Props = { searchParams: Promise<{ companyId?: string }> };

export default async function FirmantesPage({ searchParams }: Props) {
  const { companyId } = await searchParams;
  const companies = await prisma.company.findMany({ orderBy: { razonSocial: "asc" } });
  const selectedId = companyId && companies.some((c) => c.id === companyId) ? companyId : companies[0]?.id;

  const signatories = selectedId
    ? await prisma.signatory.findMany({
        where: { companyId: selectedId },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Firmantes</h1>
        <p className="text-muted-foreground">
          Sincroniza con DIGID <code className="text-xs">save_signatory</code>. Requiere correo o teléfono.
        </p>
      </div>
      {companies.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          Primero registra una empresa.{" "}
          <Link href="/empresas/nueva" className="text-primary underline">
            Nueva empresa
          </Link>
        </div>
      ) : (
        <FirmantesClient
          companies={companies.map((c) => ({ id: c.id, razonSocial: c.razonSocial }))}
          selectedCompanyId={selectedId ?? companies[0]!.id}
          signatories={signatories.map((s) => ({
            id: s.id,
            digidSignatoryId: s.digidSignatoryId,
            name: s.name,
            email: s.email,
            phone: s.phone,
            rfc: s.rfc,
            isRepLegal: s.isRepLegal,
            autoSign: s.autoSign,
          }))}
        />
      )}
    </div>
  );
}
