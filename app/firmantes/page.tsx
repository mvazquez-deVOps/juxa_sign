import Link from "next/link";
import { dbCompaniesFindManyByRazon, dbSignatoryFindManyByCompany } from "@/lib/data/repository";
import { Button } from "@/components/ui/button";
import { canMutate } from "@/lib/gate";
import { requireOrgContext } from "@/lib/org-scope";
import { FirmantesClient } from "./ui";

type Props = { searchParams: Promise<{ companyId?: string }> };

export default async function FirmantesPage({ searchParams }: Props) {
  const { organizationId, role } = await requireOrgContext();
  const allowWrite = canMutate(role);
  const { companyId } = await searchParams;
  const companies = await dbCompaniesFindManyByRazon(organizationId, "asc");
  const selectedId = companyId && companies.some((c) => c.id === companyId) ? companyId : companies[0]?.id;

  const signatories = selectedId ? await dbSignatoryFindManyByCompany(selectedId) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Firmantes</h1>
        <p className="text-muted-foreground">
          Alta y edición de firmantes por cliente (empresa o persona física). Indica al menos correo o teléfono.
        </p>
      </div>
      {companies.length === 0 ? (
        <div className="mx-auto max-w-md space-y-4 rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            El orden del panel es: <strong className="text-foreground">Clientes</strong> →{" "}
            <strong className="text-foreground">Firmantes</strong> → Documentos. Aquí aún no hay clientes en tu
            organización.
          </p>
          <p className="text-xs text-muted-foreground">
            Si ya diste de alta uno, revisa <Link href="/empresas" className="text-primary underline">Clientes</Link> y
            recarga esta página.
          </p>
          <Button asChild>
            <Link href="/empresas/nueva">Registrar cliente en el proveedor</Link>
          </Button>
        </div>
      ) : (
        <FirmantesClient
          canMutate={allowWrite}
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
