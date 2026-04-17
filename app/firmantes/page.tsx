import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { dbCompaniesFindManyByRazon, dbSignatoryFindManyByCompany } from "@/lib/data/repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      {companies.length === 0 ? (
        <>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Firmantes de la organización</h1>
              <p className="text-muted-foreground">
                Alta y edición de firmantes por cliente (empresa o persona física). Indica al menos correo o teléfono.
              </p>
            </div>
            {allowWrite ? (
              <Button asChild>
                <Link href="/empresas/nueva">
                  <Plus className="h-4 w-4" />
                  Agregar cliente
                </Link>
              </Button>
            ) : null}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Listado de firmantes</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-muted-foreground">
                Registra un cliente y aquí podrás dar de alta a las personas que firman tus documentos.
              </p>
              </div>
            </CardContent>
          </Card>
        </>
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
